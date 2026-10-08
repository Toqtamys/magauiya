#!/usr/bin/env python3
"""
SpermCASA — анализ подвижности и концентрации сперматозоидов по видео
нативного препарата в счётной камере (по умолчанию — камера Маклера).

Классификация подвижности:
  ВОЗ-6 (2021): a — быстрые прогрессивные (>=25 мкм/с),
                b — медленные прогрессивные (5..<25 мкм/с),
                c — непрогрессивные (<5 мкм/с, но есть движение),
                d — неподвижные.
  ВОЗ-5 (2010): PR = a+b, NP = c, IM = d.

ВНИМАНИЕ: исследовательский инструмент, не сертифицированное медицинское
изделие. Результаты требуют валидации ручным подсчётом.

Использование:
  python spermcasa.py видео1.mp4 [видео2.mp4 ...] -o результаты/ [--volume 3.2]
"""
import argparse, json, math, os, pickle, subprocess, sys, time
from collections import defaultdict, namedtuple
import cv2
import numpy as np
from scipy.optimize import linear_sum_assignment
from scipy.spatial import cKDTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from headclf import features, extract_patch

HERE = os.path.dirname(os.path.abspath(__file__))

# ----------------------------------------------------------------- параметры
DEFAULTS = dict(
    chamber_depth_um=10.0,     # Маклер = 10 мкм; Leja = 20 мкм
    grid_pitch_um=100.0,       # шаг сетки Маклера = 0,1 мм
    um_per_px=None,            # если None — калибровка по сетке
    dilution=1.0,
    det_threshold=25.0,        # порог контраста детектора
    det_area_min=40, det_area_max=700,
    still_shift_px=1.5,        # кадр «неподвижен» для подсчёта концентрации
    max_shift_px=6.0,          # при большем сдвиге столика трекинг прерывается
    link_gate_um=7.5,          # макс. смещение головки за кадр (~225 мкм/с при 30 к/с)
    max_gap=2,                 # допуск пропуска кадров в треке
    min_track_s=0.5,           # мин. длина трека для классификации
    ps_window_s=1.0,           # окно для скорости продвижения (ВОЗ-6)
    rapid_um_s=25.0, slow_um_s=5.0,
    immotile_vcl_um_s=None,    # None — порог по шуму (авто)
    immotile_range_um=1.2,     # «качание» головки меньше этого — неподвижный
    count_every=3,             # каждый N-й неподвижный кадр идёт в подсчёт
)

WHO5 = dict(conc=15.0, total=39.0, motile=40.0, pr=32.0, volume=1.5)
WHO6 = dict(conc=16.0, total=39.0, motile=42.0, pr=30.0, volume=1.4)


# ----------------------------------------------------------------- детекция
_SE21 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))
_SE_EXCL = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35))


def grid_mask(gray):
    """Маска тёмных линий сетки (длинные горизонтальные/вертикальные структуры)."""
    small = cv2.resize(gray, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
    blur = cv2.GaussianBlur(small, (0, 0), 1)
    bg = cv2.medianBlur(small, 31)
    dark = ((bg.astype(np.int16) - blur) > 35).astype(np.uint8) * 255
    h = cv2.morphologyEx(dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (75, 1)))
    v = cv2.morphologyEx(dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 75)))
    m = cv2.bitwise_or(h, v)
    return cv2.resize(m, (gray.shape[1], gray.shape[0]), interpolation=cv2.INTER_NEAREST)


def contrast_map(gray):
    bh = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, _SE21).astype(np.float32)
    th = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, _SE21).astype(np.float32)
    return cv2.GaussianBlur(bh + 0.7 * th, (0, 0), 1.5)


def detect(gray, P):
    gm = grid_mask(gray)
    excl = cv2.dilate(gm, _SE_EXCL)
    # края кадра тоже исключаем (обрезанные объекты)
    excl[:12, :] = 255; excl[-12:, :] = 255; excl[:, :12] = 255; excl[:, -12:] = 255
    s = contrast_map(gray)
    s[excl > 0] = 0
    b = (s > P['det_threshold']).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(b, connectivity=8)
    dets = []
    for i in range(1, n):
        x0, y0, w, h, a = st[i]
        if a < P['det_area_min'] or a > P['det_area_max']:
            continue
        sub = lab[y0:y0 + h, x0:x0 + w] == i
        ys, xs = np.nonzero(sub)
        wt = s[y0 + ys, x0 + xs]
        cx = (xs * wt).sum() / wt.sum() + x0
        cy = (ys * wt).sum() / wt.sum() + y0
        # оси эллипса по вторым моментам
        mx, my = xs.mean(), ys.mean()
        cxx = ((xs - mx) ** 2).mean() + 1 / 12; cyy = ((ys - my) ** 2).mean() + 1 / 12
        cxy = ((xs - mx) * (ys - my)).mean()
        tr = cxx + cyy; dd = math.sqrt(max(0.0, (cxx - cyy) ** 2 / 4 + cxy ** 2))
        l1, l2 = tr / 2 + dd, max(1e-6, tr / 2 - dd)
        maj, mnr = 4 * math.sqrt(l1), 4 * math.sqrt(l2)
        fill = a / (math.pi / 4 * maj * mnr)
        dets.append((cx, cy, a, float(wt.max()), maj, mnr, fill, float(wt.mean())))
    return np.array(dets, dtype=np.float64).reshape(-1, 8), gm, excl


def grid_pitch_px(gm):
    """Шаг сетки по автокорреляции профилей маски линий."""
    res = []
    for prof in (gm.mean(axis=0), gm.mean(axis=1)):
        p = prof - prof.mean()
        if p.std() < 1:
            continue
        ac = np.correlate(p, p, 'full')[len(p) - 1:]
        ac /= ac[0]
        # первый значимый максимум после 100 px
        lo = 100
        k = lo + int(np.argmax(ac[lo:min(len(ac), 900)]))
        if ac[k] > 0.3:
            # субпиксельная поправка
            if 0 < k < len(ac) - 1:
                y0, y1, y2 = ac[k - 1], ac[k], ac[k + 1]
                d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 + 1e-9)
                k = k + d
            res.append(k)
    return float(np.mean(res)) if res else None


# ----------------------------------------------------------------- трекинг
class Track:
    __slots__ = ('id', 'f', 'x', 'y', 's', 'a', 'miss', 'closed')

    def __init__(self, tid, fr, x, y):
        self.id = tid; self.f = [fr]; self.x = [x]; self.y = [y]; self.s = []; self.a = []
        self.miss = 0; self.closed = False

    def predict(self, fr):
        if len(self.f) >= 2:
            dt = self.f[-1] - self.f[-2]
            vx = (self.x[-1] - self.x[-2]) / dt; vy = (self.y[-1] - self.y[-2]) / dt
            k = fr - self.f[-1]
            return self.x[-1] + 0.6 * vx * k, self.y[-1] + 0.6 * vy * k
        return self.x[-1], self.y[-1]


def link(active, dets_w, fr, gate_px, next_id, max_gap):
    """dets_w: Nx2 в мировых координатах. Возвращает id трека для каждой детекции."""
    ids = -np.ones(len(dets_w), int)
    if active and len(dets_w):
        pred = np.array([t.predict(fr) for t in active])
        tree = cKDTree(dets_w)
        pairs = tree.query_ball_point(pred, r=gate_px)
        rows, cols, cost = [], [], []
        for ti, js in enumerate(pairs):
            for j in js:
                rows.append(ti); cols.append(j)
                cost.append(np.hypot(*(pred[ti] - dets_w[j])))
        if rows:
            big = 1e6
            C = np.full((len(active), len(dets_w)), big)
            C[rows, cols] = cost
            r, c = linear_sum_assignment(C)
            for ti, j in zip(r, c):
                if C[ti, j] < big:
                    t = active[ti]
                    t.f.append(fr); t.x.append(dets_w[j, 0]); t.y.append(dets_w[j, 1])
                    t.miss = 0; ids[j] = t.id
    new_active = []
    for t in active:
        if t.f[-1] != fr:
            t.miss += 1
        if t.miss > max_gap:
            t.closed = True
        else:
            new_active.append(t)
    newtracks = []
    for j in np.where(ids < 0)[0]:
        t = Track(next_id, fr, dets_w[j, 0], dets_w[j, 1]); ids[j] = next_id; next_id += 1
        new_active.append(t); newtracks.append(t)
    return new_active, newtracks, ids, next_id


# ----------------------------------------------------------------- кинематика
def smooth(a, w=5):
    if len(a) < w:
        return a.copy()
    k = np.ones(w) / w
    pad = w // 2
    ap = np.pad(a, pad, mode='edge')
    return np.convolve(ap, k, mode='valid')


def kinematics(t, fps, um, P):
    f = np.array(t.f); x = np.array(t.x) * um; y = np.array(t.y) * um
    # интерполяция пропусков
    ff = np.arange(f[0], f[-1] + 1)
    x = np.interp(ff, f, x); y = np.interp(ff, f, y)
    n = len(ff); T = (n - 1) / fps
    if n < 3:
        return None
    step = np.hypot(np.diff(x), np.diff(y))
    vcl = step.sum() / T
    xs, ys = smooth(x), smooth(y)
    vap = np.hypot(np.diff(xs), np.diff(ys)).sum() / T
    vsl = math.hypot(x[-1] - x[0], y[-1] - y[0]) / T
    # скорость продвижения (ВОЗ-6): смещение за окно ~1 с по сглаженному пути
    w = max(2, int(round(P['ps_window_s'] * fps)))
    if n > w:
        d = np.hypot(xs[w:] - xs[:-w], ys[w:] - ys[:-w]) / (w / fps)
        ps = float(np.median(d))
    else:
        ps = math.hypot(xs[-1] - xs[0], ys[-1] - ys[0]) / T
    alh = 2 * float(np.mean(np.hypot(x - xs, y - ys)))
    # BCF: пересечения среднего пути
    sgn = np.sign((np.gradient(xs) * (y - ys)) - (np.gradient(ys) * (x - xs)))
    bcf = float(np.sum(np.abs(np.diff(sgn[sgn != 0])) > 0) / 2 / T) if T > 0 else 0
    # разброс положения головки (для отличия неподвижных от «c»)
    rng = float(np.hypot(np.ptp(x - xs), np.ptp(y - ys)))
    return dict(id=t.id, f0=int(f[0]), n=n, dur=T, vcl=vcl, vap=vap, vsl=vsl, ps=ps,
                lin=vsl / vcl if vcl > 0 else 0, str=vsl / vap if vap > 0 else 0,
                wob=vap / vcl if vcl > 0 else 0, alh=alh, bcf=bcf, jit=rng,
                mx=float(np.mean(t.x)), my=float(np.mean(t.y)))


def classify(k, P, vcl_imm):
    if k['ps'] >= P['rapid_um_s']:
        return 'a'
    if k['ps'] >= P['slow_um_s']:
        return 'b'
    if k['vcl'] >= vcl_imm or k['jit'] >= P['immotile_range_um'] * 2:
        return 'c'
    return 'd'


# ----------------------------------------------------------------- основной проход
def phase_shift(prev, cur):
    (dx, dy), r = cv2.phaseCorrelate(prev, cur)
    return dx, dy, r


def process_video(path, P, log=print):
    """Стадия 1: компенсация движения столика, детекция, трекинг. Результат кэшируется."""
    t0 = time.time()
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    nfr = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    name = os.path.splitext(os.path.basename(path))[0]
    sc = 0.25
    prev_small = None
    cum = np.zeros(2)
    active, alltracks = [], []
    next_id = 0
    per_frame = []
    pitches = []
    count_rows = []            # (fr, free_area_px)
    still_idx = 0
    fr = -1
    um_guess = P['um_per_px'] or 0.33
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        fr += 1
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        small = cv2.resize(gray, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA).astype(np.float32)
        if prev_small is None:
            dx = dy = 0.0
        else:
            dx, dy, _ = phase_shift(prev_small, small)
            dx /= sc; dy /= sc
        prev_small = small
        mag = math.hypot(dx, dy)
        cum += (dx, dy)
        if mag > P['max_shift_px']:
            for t in active:
                t.closed = True
            active = []
            per_frame.append((fr, False, mag, None, None, cum.copy()))
            continue
        dets, gm, excl = detect(gray, P)
        if fr == 0 or (not P['um_per_px'] and len(pitches) < 3 and mag < P['still_shift_px']):
            pp = grid_pitch_px(gm)
            if pp:
                pitches.append(pp); um_guess = P['grid_pitch_um'] / float(np.median(pitches))
        still = mag < P['still_shift_px']
        if still:
            if still_idx % P['count_every'] == 0:
                count_rows.append((fr, int((excl == 0).sum())))
                if len(pitches) < 40 and still_idx % (P['count_every'] * 4) == 0:
                    pp = grid_pitch_px(gm)
                    if pp:
                        pitches.append(pp)
            still_idx += 1
        dw = dets[:, :2] - cum if len(dets) else np.zeros((0, 2))
        gate = P['link_gate_um'] / um_guess
        active, newt, ids, next_id = link(active, dw, fr, gate, next_id, P['max_gap'])
        alltracks.extend(newt)
        per_frame.append((fr, still, mag, dets.astype(np.float32), ids, cum.copy()))
        if fr % 200 == 0:
            log(f'  {name}: кадр {fr}/{nfr}')
    cap.release()
    tracks = [(t.id, np.array(t.f, np.int32), np.array(t.x, np.float32), np.array(t.y, np.float32)) for t in alltracks]
    return dict(path=path, name=name, fps=fps, W=W, H=H, nframes=fr + 1, per_frame=per_frame,
                tracks=tracks, pitches=pitches, count_rows=count_rows, t_process=time.time() - t0)


TrackView = namedtuple('TrackView', 'id f x y')


def load_model(path=None):
    path = path or os.path.join(HERE, 'head_model.pkl')
    with open(path, 'rb') as fh:
        return pickle.load(fh)


def read_patches(path, requests):
    """requests: {frame: [(key, x, y), ...]} -> {key: patch}"""
    out = {}
    if not requests:
        return out
    cap = cv2.VideoCapture(path)
    last = max(requests)
    fr = -1
    while fr < last:
        ok, frame = cap.read()
        if not ok:
            break
        fr += 1
        for key, x, y in requests.get(fr, ()):
            out[key] = features(extract_patch(frame, x, y))
    cap.release()
    return out


def evaluate(C, P, outdir=None, make_video=False, model=None, log=print):
    """Стадия 2: калибровка, фильтр мусора, концентрация, кинематика, классы ВОЗ."""
    t0 = time.time()
    per_frame = C['per_frame']; fps = C['fps']; name = C['name']; path = C['path']
    pf = {p[0]: p for p in per_frame}
    model = model or load_model(P.get('model_path'))

    # --- калибровка
    if P['um_per_px']:
        um = P['um_per_px']; calib = 'задано вручную'
    elif C['pitches']:
        pitch = float(np.median(C['pitches'])); um = P['grid_pitch_um'] / pitch
        calib = f'по сетке камеры: шаг {pitch:.1f} px = {P["grid_pitch_um"]:.0f} мкм'
    else:
        um = 0.33; calib = 'сетка не найдена — принято 0,33 мкм/px (ПРОВЕРЬТЕ)'

    tracks = {tid: TrackView(tid, list(f), list(x), list(y)) for tid, f, x, y in C['tracks']}

    # --- кинематика
    min_n = max(5, int(P['min_track_s'] * fps))
    kin = {}
    for tid, t in tracks.items():
        if len(t.f) >= min_n:
            k = kinematics(t, fps, um, P)
            if k:
                kin[tid] = k
    slow = [k['vcl'] for k in kin.values() if k['ps'] < 2.0]
    noise_vcl = float(np.median(slow)) if len(slow) > 10 else 5.0
    vcl_imm = P['immotile_vcl_um_s'] or max(8.0, 1.8 * noise_vcl)
    for k in kin.values():
        k['cls'] = classify(k, P, vcl_imm)

    # --- запросы патчей: неподвижные/непрогрессивные треки + все «неясные» детекции в кадрах подсчёта
    req = defaultdict(list)
    for tid, k in kin.items():
        if k['cls'] in 'cd':
            t = tracks[tid]
            for q in np.linspace(0, len(t.f) - 1, 3).astype(int):
                fr = t.f[q]; cum = pf[fr][5]
                req[fr].append((('t', tid, fr), t.x[q] + cum[0], t.y[q] + cum[1]))
    count_frames = [fr for fr, _ in C['count_rows']]
    short_motion = {}
    for fr in count_frames:
        dets, ids = pf[fr][3], pf[fr][4]
        for j, tid in enumerate(ids):
            tid = int(tid)
            if tid in kin and kin[tid]['cls'] in 'ab':
                continue
            if tid not in kin:
                t = tracks[tid]
                if len(t.f) >= 4:
                    sp = math.hypot(t.x[-1] - t.x[0], t.y[-1] - t.y[0]) / (t.f[-1] - t.f[0]) * fps * um
                    short_motion[tid] = sp
            req[fr].append((('d', fr, j), float(dets[j, 0]), float(dets[j, 1])))
    feats = read_patches(path, req)
    keys = list(feats)
    prob = {}
    if keys:
        X = np.array([feats[k] for k in keys])
        pr = model.predict_proba(X)[:, 1]
        prob = dict(zip(keys, pr))
    thr = P.get('head_prob', 0.5)
    tprob = defaultdict(list)
    for key, p in prob.items():
        if key[0] == 't':
            tprob[key[1]].append(p)
    for tid, k in kin.items():
        if k['cls'] in 'ab':
            k['p_head'] = 1.0
        else:
            k['p_head'] = float(np.mean(tprob[tid])) if tprob[tid] else 0.5
        k['is_sperm'] = k['p_head'] >= thr

    # --- концентрация: по кадрам подсчёта, только объекты, признанные сперматозоидами
    fields = []   # (fr, n_sperm, n_all, free_px)
    dec = {}
    for fr, free in C['count_rows']:
        dets, ids = pf[fr][3], pf[fr][4]
        n = 0
        dec[fr] = []
        for j, tid in enumerate(ids):
            tid = int(tid)
            if tid in kin:
                ok = kin[tid]['is_sperm']
            elif short_motion.get(tid, 0) > 10:
                ok = True
            else:
                ok = prob.get(('d', fr, j), 0.5) >= thr
            n += ok
            dec[fr].append((float(dets[j, 0]), float(dets[j, 1]), bool(ok)))
        fields.append((fr, n, len(ids), free))
    F = np.array(fields, float).reshape(-1, 4)
    k_conc = P['dilution'] / (um * um * P['chamber_depth_um'] * 1e-12) / 1e6   # (клеток/px²) -> млн/мл
    if len(F):
        conc = F[:, 1].sum() / F[:, 3].sum() * k_conc
        conc_raw = F[:, 2].sum() / F[:, 3].sum() * k_conc
        # независимые «поля»: группы кадров подсчёта, разделённые движением столика
        grp, g = [], 0
        moved = np.array([p[2] for p in per_frame])
        for i, fr in enumerate(F[:, 0].astype(int)):
            if i and moved[int(F[i - 1, 0]):fr + 1].sum() > 150:   # сдвиг > ~1/2 кадра — новое поле
                g += 1
            grp.append(g)
        grp = np.array(grp)
        fc = np.array([F[grp == q, 1].sum() / F[grp == q, 3].sum() * k_conc for q in np.unique(grp)])
        nf = len(fc)
        se = float(np.std(fc, ddof=1) / math.sqrt(nf)) if nf > 1 else float('nan')
        ci = (conc - 1.96 * se, conc + 1.96 * se) if nf > 1 else (float('nan'), float('nan'))
        per_square = F[:, 1].sum() / (F[:, 3].sum() * um * um / P['grid_pitch_um'] ** 2)
        cells_counted = int(F[:, 1].sum())
    else:
        conc = conc_raw = per_square = float('nan'); ci = (float('nan'),) * 2; nf = 0; cells_counted = 0

    # --- подвижность: доли по «клетко-кадрам» среди сперматозоидов
    w = dict.fromkeys('abcd', 0)
    n_debris = 0
    for tid, k in kin.items():
        if k['is_sperm']:
            w[k['cls']] += k['n']
        else:
            n_debris += 1
    tw = sum(w.values())
    frac = {c: (100.0 * w[c] / tw if tw else float('nan')) for c in 'abcd'}
    ntr = {c: sum(1 for k in kin.values() if k['is_sperm'] and k['cls'] == c) for c in 'abcd'}
    who6 = dict(a=frac['a'], b=frac['b'], c=frac['c'], d=frac['d'],
                progressive=frac['a'] + frac['b'], total_motile=frac['a'] + frac['b'] + frac['c'])
    who5 = dict(PR=who6['progressive'], NP=frac['c'], IM=frac['d'], total_motile=who6['total_motile'])

    def mean_of(key, cls):
        v = [k[key] for k in kin.values() if k['is_sperm'] and k['cls'] in cls]
        return float(np.mean(v)) if v else float('nan')
    keys_k = ('vcl', 'vsl', 'vap', 'lin', 'str', 'wob', 'alh', 'bcf')
    kin_motile = {q: mean_of(q, 'abc') for q in keys_k}
    kin_prog = {q: mean_of(q, 'ab') for q in keys_k}
    ps_hist = np.histogram([k['ps'] for k in kin.values() if k['is_sperm']], bins=np.arange(0, 62, 2))[0].tolist()

    res = dict(
        file=os.path.basename(path), name=name, fps=fps, frames=C['nframes'], width=C['W'], height=C['H'],
        duration_s=C['nframes'] / fps, um_per_px=um, calibration=calib,
        frames_tracked=sum(1 for p in per_frame if p[3] is not None),
        frames_counted=len(F), fields=nf, cells_counted=cells_counted,
        concentration_mln_ml=conc, concentration_ci95=ci, concentration_before_debris_filter=conc_raw,
        cells_per_square_100um=per_square,
        tracks_classified=sum(ntr.values()), tracks_by_class=ntr, debris_tracks=n_debris,
        who6=who6, who5=who5, kin_motile=kin_motile, kin_progressive=kin_prog, ps_hist=ps_hist,
        vcl_immotile_threshold=vcl_imm, noise_vcl=noise_vcl,
        params={q: v for q, v in P.items()},
    )
    if P.get('volume_ml'):
        v = P['volume_ml']
        res.update(volume_ml=v, total_count_mln=conc * v,
                   total_motile_mln=conc * v * who6['total_motile'] / 100,
                   total_progressive_mln=conc * v * who6['progressive'] / 100)

    if outdir:
        os.makedirs(outdir, exist_ok=True)
        cols = ['id', 'cls', 'is_sperm', 'p_head', 'f0', 'n', 'dur', 'vcl', 'vsl', 'vap', 'ps', 'lin', 'str', 'wob', 'alh', 'bcf']
        with open(os.path.join(outdir, f'{name}_tracks.csv'), 'w', encoding='utf-8') as fh:
            fh.write(','.join(cols) + '\n')
            for k in kin.values():
                fh.write(','.join(f'{k[c]:.3f}' if isinstance(k[c], float) else str(k[c]) for c in cols) + '\n')
        with open(os.path.join(outdir, f'{name}_result.json'), 'w', encoding='utf-8') as fh:
            json.dump(res, fh, ensure_ascii=False, indent=2, default=float)
        if make_video:
            log(f'  {name}: видео с разметкой…')
            render_video(C, kin, os.path.join(outdir, f'{name}_annotated.mp4'))
    res['runtime_eval_s'] = time.time() - t0
    if P.get('debug'):
        res['_dec'] = dec
    return res


# ----------------------------------------------------------------- видео с разметкой
COL = {'a': (60, 200, 60), 'b': (0, 210, 255), 'c': (255, 140, 0), 'd': (60, 60, 230), 'x': (150, 150, 150)}
LEG = [('a', 'a быстр.прогр.'), ('b', 'b медл.прогр.'), ('c', 'c непрогр.'), ('d', 'd неподв.'), ('x', 'мусор')]


def _put_text(img, txt, org, size=14, color=(255, 255, 255)):
    """Кириллица через PIL, если есть; иначе — латиница OpenCV."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        global _FONT
        if '_FONT' not in globals() or _FONT is None:
            _FONT = None
            for fp in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'C:/Windows/Fonts/arial.ttf',
                       '/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf'):
                if os.path.exists(fp):
                    _FONT = fp; break
        if _FONT is None:
            raise ImportError
        im = Image.fromarray(img[:, :, ::-1]); d = ImageDraw.Draw(im)
        d.text(org, txt, font=ImageFont.truetype(_FONT, size), fill=color[::-1])
        img[:] = np.asarray(im)[:, :, ::-1]
    except ImportError:
        cv2.putText(img, txt.encode('ascii', 'replace').decode(), (org[0], org[1] + size), cv2.FONT_HERSHEY_SIMPLEX,
                    size / 32, color, 1, cv2.LINE_AA)


def render_video(C, kin, out, scale=0.5):
    tracks = {tid: (f, x, y) for tid, f, x, y in C['tracks']}
    fidx = {tid: {int(fr): i for i, fr in enumerate(f)} for tid, (f, x, y) in tracks.items() if tid in kin}
    cap = cv2.VideoCapture(C['path'])
    W = int(C['W'] * scale) // 2 * 2; H = int(C['H'] * scale) // 2 * 2
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}',
           '-r', str(C['fps']), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27',
           '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]
    import shutil
    if shutil.which('ffmpeg'):
        pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        write, close = pr.stdin.write, lambda: (pr.stdin.close(), pr.wait())
    else:   # запасной вариант без ffmpeg
        vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*'mp4v'), C['fps'], (W, H))
        write, close = (lambda b: vw.write(np.frombuffer(b, np.uint8).reshape(H, W, 3))), vw.release
    # шапка-легенда (рисуется один раз)
    bar = np.zeros((26, W, 3), np.uint8)
    x0 = W - 640
    for j, (c, lab) in enumerate(LEG):
        cv2.circle(bar, (x0 + j * 128, 13), 6, COL[c], -1)
        _put_text(bar, lab, (x0 + j * 128 + 10, 4), 13)
    for p in C['per_frame']:
        ok, frame = cap.read()
        if not ok:
            break
        fr, still, mag, dets, ids, cum = p
        img = cv2.resize(frame, (W, H), interpolation=cv2.INTER_AREA)
        if dets is not None:
            for (x, y), tid in zip(dets[:, :2], ids):
                tid = int(tid); k = kin.get(tid)
                if k is None:
                    cv2.circle(img, (int(x * scale), int(y * scale)), 6, (200, 200, 200), 1, cv2.LINE_AA)
                    continue
                c = k['cls'] if k['is_sperm'] else 'x'
                f, tx, ty = tracks[tid]; i = fidx[tid].get(fr, 0)
                lo = max(0, i - 45)
                pts = np.stack([(np.asarray(tx[lo:i + 1]) + cum[0]) * scale, (np.asarray(ty[lo:i + 1]) + cum[1]) * scale], 1).astype(np.int32)
                if len(pts) > 1 and c != 'x':
                    cv2.polylines(img, [pts], False, COL[c], 1, cv2.LINE_AA)
                cv2.circle(img, (int(x * scale), int(y * scale)), 7, COL[c], 2 if c != 'x' else 1, cv2.LINE_AA)
        frame_bar = bar.copy()
        st = 'подсчёт' if still else ('трекинг' if dets is not None else 'столик движется — пропуск')
        _put_text(frame_bar, f'{fr / C["fps"]:5.1f} с   {st}', (8, 4), 14)
        img[:26] = frame_bar
        write(img.tobytes())
    close(); cap.release()


# ----------------------------------------------------------------- CLI
def main():
    ap = argparse.ArgumentParser(description='Анализ спермы по видео в счётной камере (ВОЗ-5 / ВОЗ-6)')
    ap.add_argument('videos', nargs='+', help='файлы видео')
    ap.add_argument('-o', '--out', default='results', help='папка результатов')
    ap.add_argument('--depth', type=float, default=DEFAULTS['chamber_depth_um'], help='глубина камеры, мкм (Маклер — 10)')
    ap.add_argument('--pitch', type=float, default=DEFAULTS['grid_pitch_um'], help='шаг сетки, мкм (Маклер — 100)')
    ap.add_argument('--um-per-px', type=float, default=None, help='масштаб, если в кадре нет сетки')
    ap.add_argument('--dilution', type=float, default=1.0, help='кратность разведения')
    ap.add_argument('--volume', type=float, default=None, help='объём эякулята, мл (для общего количества)')
    ap.add_argument('--threshold', type=float, default=DEFAULTS['det_threshold'], help='порог детектора (25)')
    ap.add_argument('--head-prob', type=float, default=0.5, help='порог «головка/мусор» (0.5)')
    ap.add_argument('--model', default=None, help='свой классификатор .pkl')
    ap.add_argument('--no-video', action='store_true', help='не делать видео с разметкой')
    ap.add_argument('--cache', default=None, help='папка кэша стадии 1 (ускоряет повторный анализ)')
    a = ap.parse_args()
    P = dict(DEFAULTS)
    P.update(chamber_depth_um=a.depth, grid_pitch_um=a.pitch, um_per_px=a.um_per_px, dilution=a.dilution,
             det_threshold=a.threshold, volume_ml=a.volume, head_prob=a.head_prob, model_path=a.model)
    model = load_model(a.model)
    allres = []
    for v in a.videos:
        print('Анализ:', v)
        C = None
        cp = os.path.join(a.cache, os.path.basename(v) + '.pkl') if a.cache else None
        if cp and os.path.exists(cp):
            C = pickle.load(open(cp, 'rb'))
        if C is None:
            C = process_video(v, P)
            if cp:
                os.makedirs(a.cache, exist_ok=True); pickle.dump(C, open(cp, 'wb'))
        r = evaluate(C, P, a.out, make_video=not a.no_video, model=model)
        allres.append(r)
        w6 = r['who6']
        print(f"  концентрация {r['concentration_mln_ml']:.1f} млн/мл; ВОЗ-6 a/b/c/d = "
              f"{w6['a']:.0f}/{w6['b']:.0f}/{w6['c']:.0f}/{w6['d']:.0f} %; ВОЗ-5 PR/NP/IM = "
              f"{r['who5']['PR']:.0f}/{r['who5']['NP']:.0f}/{r['who5']['IM']:.0f} %")
    from report import write_report
    rp = os.path.join(a.out, 'report.html')
    write_report(allres, rp)
    print('Отчёт:', rp)


if __name__ == '__main__':
    main()
