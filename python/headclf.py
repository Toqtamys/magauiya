"""Признаки патча 48x48 вокруг объекта и классификатор «головка сперматозоида / мусор»."""
import cv2, numpy as np

R_MAX, N_R, N_T = 18, 12, 32


def _polar(img):
    c = (img.shape[1] / 2, img.shape[0] / 2)
    return cv2.warpPolar(img, (N_R, N_T), c, R_MAX, cv2.WARP_POLAR_LINEAR)  # rows=θ, cols=r


def features(patch):
    """patch: BGR uint8 48x48 (центр — объект). Признаки инвариантны к повороту."""
    p = patch.astype(np.float32)
    g = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY).astype(np.float32)
    bg = np.median(np.concatenate([g[:4].ravel(), g[-4:].ravel(), g[:, :4].ravel(), g[:, -4:].ravel()]))
    gn = (g - bg) / 40.0
    pol = _polar(gn)                                   # 32 x 12
    F = np.abs(np.fft.rfft(pol, axis=0))[:5] / N_T     # гармоники 0..4 по углу для каждого радиуса
    feats = [F.ravel()]
    # абсолютное отклонение (контраст) — радиальный профиль
    feats.append(np.abs(pol).mean(axis=0))
    # цвет: центр и кольцо относительно фона
    yy, xx = np.mgrid[:48, :48]; rr = np.hypot(xx - 24, yy - 24)
    bgc = np.median(p[rr > 20], axis=0)
    for lo, hi in ((0, 4), (4, 8), (8, 13)):
        m = (rr >= lo) & (rr < hi)
        feats.append((p[m].mean(axis=0) - bgc) / 40.0)
        feats.append(p[m].std(axis=0) / 40.0)
    # форма по маске контраста
    se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))
    gg = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
    s = cv2.morphologyEx(gg, cv2.MORPH_BLACKHAT, se).astype(np.float32) + 0.7 * cv2.morphologyEx(gg, cv2.MORPH_TOPHAT, se)
    s = cv2.GaussianBlur(s, (0, 0), 1.0)
    for th in (20, 40, 70):
        b = (s > th).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(b)
        if n > 1:
            # компонента, ближайшая к центру
            k = lab[24, 24] if lab[24, 24] > 0 else 1 + int(np.argmax(st[1:, 4]))
            ys, xs = np.nonzero(lab == k)
            a = len(xs)
            cxx, cyy, cxy = np.var(xs) + 1 / 12, np.var(ys) + 1 / 12, np.mean((xs - xs.mean()) * (ys - ys.mean()))
            tr = cxx + cyy; dd = np.sqrt(max(0, (cxx - cyy) ** 2 / 4 + cxy ** 2))
            maj, mnr = 4 * np.sqrt(tr / 2 + dd), 4 * np.sqrt(max(1e-6, tr / 2 - dd))
            cnts, _ = cv2.findContours((lab == k).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            hull = cv2.convexHull(cnts[0]); ha = max(1.0, cv2.contourArea(hull))
            # «дырка» в центре (кольцо) : доля незаполненного внутри выпуклой оболочки
            feats.append([a / 100, maj / 10, mnr / 10, maj / mnr, a / ha, (n - 1) / 5])
        else:
            feats.append([0, 0, 0, 0, 0, 0])
    feats.append([s.max() / 100, s[rr < 8].mean() / 50])
    return np.concatenate([np.ravel(f) for f in feats]).astype(np.float32)


def augment(patch):
    out = []
    for k in range(4):
        r = np.rot90(patch, k)
        out.append(np.ascontiguousarray(r)); out.append(np.ascontiguousarray(r[:, ::-1]))
    return out


def extract_patch(frame, x, y):
    g = cv2.copyMakeBorder(frame, 32, 32, 32, 32, cv2.BORDER_REFLECT)
    xi, yi = int(round(x)) + 32, int(round(y)) + 32
    return g[yi - 24:yi + 24, xi - 24:xi + 24]
