// ─── Движок SCD / Halo-теста (дисперсия хроматина сперматозоидов) ──────────
// Критерии Fernández et al.: ширина гало относительно малого диаметра ядра.
//   большое гало   — ширина ≥ малого диаметра ядра;
//   среднее гало   — между большим и малым;
//   малое гало     — ширина ≤ 1/3 малого диаметра ядра;
//   без гало;  без гало, дегенеративное — ядро слабо или неравномерно окрашено.
// DFI = (малое + без гало + дегенеративные) / все учтённые × 100%.
const SCD = (() => {
  const CLASSES = ['large', 'medium', 'small', 'none', 'degraded', 'excluded'];
  let FLAT = 0.5;
  const FRAG = new Set(['small', 'none', 'degraded', 'frag']);
  const AI_CLASSES = ['ok', 'frag', 'excluded'];   // режим нейросети: два класса

  // ── подготовка: «окраска» относительно оценённого фона
  function prepare(img) {
    const { width: w, height: h, data } = img, n = w * h;
    const c = new Float32Array(n), lum = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) { lum[i] = 0.3 * data[p] + 0.59 * data[p + 1] + 0.11 * data[p + 2]; c[i] = data[p + 1]; }
    const med = quantile(lum, 0.5);
    const bright = med > 100;                         // светлое поле или флуоресценция
    const src = bright ? c : lum;
    const B = Math.max(16, Math.round(Math.min(w, h) / 14));   // блок крупнее большого гало
    const gw = Math.ceil(w / B), gh = Math.ceil(h / B), grid = new Float32Array(gw * gh);
    const buf = [];
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      buf.length = 0;
      for (let y = gy * B; y < Math.min(h, gy * B + B); y += 2) for (let x = gx * B; x < Math.min(w, gx * B + B); x += 2) buf.push(src[y * w + x]);
      buf.sort((a, b) => a - b);
      grid[gy * gw + gx] = buf[Math.floor((bright ? 0.88 : 0.12) * (buf.length - 1))];
    }
    // сглаживание сетки фона 3×3 (медианно-подобно: среднее без крайних)
    const g2 = new Float32Array(grid.length);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const v = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = gy + dy, xx = gx + dx; if (yy >= 0 && yy < gh && xx >= 0 && xx < gw) v.push(grid[yy * gw + xx]); }
      v.sort((a, b) => a - b); g2[gy * gw + gx] = bright ? v[Math.floor(v.length * 0.6)] : v[Math.floor(v.length * 0.4)];
    }
    const S = new Float32Array(n);
    for (let y = 0; y < h; y++) {
      const fy = Math.min(gh - 1, Math.max(0, (y + 0.5) / B - 0.5)), y0 = Math.floor(fy), y1 = Math.min(gh - 1, y0 + 1), ty = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = Math.min(gw - 1, Math.max(0, (x + 0.5) / B - 0.5)), x0 = Math.floor(fx), x1 = Math.min(gw - 1, x0 + 1), tx = fx - x0;
        const bg = (g2[y0 * gw + x0] * (1 - tx) + g2[y0 * gw + x1] * tx) * (1 - ty) + (g2[y1 * gw + x0] * (1 - tx) + g2[y1 * gw + x1] * tx) * ty;
        const v = src[y * w + x];
        S[y * w + x] = bright ? Math.max(0, (bg - v) / Math.max(bg, 1)) : Math.max(0, (v - bg) / Math.max(255 - bg, 1));
      }
    }
    // подавление шума: два прохода бокс-фильтра 3×3
    const Sm = boxSmooth(boxSmooth(S, w, h), w, h);
    return { w, h, S: Sm, bright };
  }
  function boxSmooth(a, w, h) {
    const o = new Float32Array(a.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; s += a[yy * w + xx]; n++; } }
      o[y * w + x] = s / n;
    }
    return o;
  }

  function quantile(arr, q) {
    const step = Math.max(1, Math.floor(arr.length / 40000)), s = [];
    for (let i = 0; i < arr.length; i += step) s.push(arr[i]);
    s.sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
  }

  // ── трёхклассовый Оцу: фон / гало / ядро
  function otsu3(S) {
    const NB = 256; let mx = quantile(S, 0.999) || 1;
    const hist = new Float64Array(NB);
    for (let i = 0; i < S.length; i++) hist[Math.min(NB - 1, Math.floor((S[i] / mx) * (NB - 1)))]++;
    const P = new Float64Array(NB + 1), M = new Float64Array(NB + 1);
    for (let i = 0; i < NB; i++) { P[i + 1] = P[i] + hist[i]; M[i + 1] = M[i] + hist[i] * i; }
    const tot = P[NB], mT = M[NB] / tot;
    let best = -1, t1 = 1, t2 = 2;
    for (let a = 1; a < NB - 2; a++) for (let b = a + 1; b < NB - 1; b++) {
      const w0 = P[a] / tot, w1 = (P[b] - P[a]) / tot, w2 = (P[NB] - P[b]) / tot;
      if (w0 <= 0 || w1 <= 0 || w2 <= 0) continue;
      const m0 = M[a] / P[a], m1 = (M[b] - M[a]) / (P[b] - P[a]), m2 = (M[NB] - M[b]) / (P[NB] - P[b]);
      const v = w0 * (m0 - mT) ** 2 + w1 * (m1 - mT) ** 2 + w2 * (m2 - mT) ** 2;
      if (v > best) { best = v; t1 = a; t2 = b; }
    }
    return { t1: (t1 / (NB - 1)) * mx, t2: (t2 / (NB - 1)) * mx };
  }

  // ── разметка связных компонент произвольной маски
  function labelMask(m, w, h) {
    const n = w * h, lab = new Int32Array(n), comps = [], stack = new Int32Array(n);
    let id = 0;
    for (let i = 0; i < n; i++) {
      if (!m[i] || lab[i]) continue;
      id++; let sp = 0; stack[sp++] = i; lab[i] = id;
      const px = [];
      while (sp) {
        const j = stack[--sp]; px.push(j);
        const x = j % w, y = (j / w) | 0;
        if (x > 0 && m[j - 1] && !lab[j - 1]) { lab[j - 1] = id; stack[sp++] = j - 1; }
        if (x < w - 1 && m[j + 1] && !lab[j + 1]) { lab[j + 1] = id; stack[sp++] = j + 1; }
        if (y > 0 && m[j - w] && !lab[j - w]) { lab[j - w] = id; stack[sp++] = j - w; }
        if (y < h - 1 && m[j + w] && !lab[j + w]) { lab[j + w] = id; stack[sp++] = j + w; }
      }
      comps.push({ id, px });
    }
    return { lab, comps };
  }
  // ── маска ядер (сильная окраска), морфологическое открытие
  function labelCores(P, t2) {
    const { w, h, S } = P, n = w * h;
    let m = new Uint8Array(n);
    for (let i = 0; i < n; i++) m[i] = S[i] > t2 ? 1 : 0;
    m = dilate(erode(m, w, h), w, h);
    return labelMask(m, w, h);
  }
  function erode(m, w, h) { const o = new Uint8Array(m.length); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; o[i] = m[i] & m[i - 1] & m[i + 1] & m[i - w] & m[i + w]; } return o; }
  function dilate(m, w, h) { const o = new Uint8Array(m.length); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; o[i] = m[i] | m[i - 1] | m[i + 1] | m[i - w] | m[i + w]; } return o; }

  function hullArea(pts) {
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    const hull = lo.slice(0, -1).concat(up.slice(0, -1)); let a = 0;
    for (let i = 0; i < hull.length; i++) { const p = hull[i], q = hull[(i + 1) % hull.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return Math.abs(a) / 2;
  }

  // ── детекция: ядра + ширина гало лучами
  function detect(P, opt = {}) {
    const { w, h, S } = P;
    const base = otsu3(S);
    const t1 = base.t1 * (opt.haloSens ?? 1), t2 = base.t2 * (opt.coreSens ?? 1);
    const { lab, comps } = labelCores(P, t2);
    const areas = comps.map((c) => c.px.length).filter((a) => a >= 12).sort((a, b) => a - b);
    const M = areas.length ? areas[areas.length >> 1] : 50;
    const geom = (c, labArr) => {
      const A = c.px.length;
      let sx = 0, sy = 0, ss = 0, edge = false;
      for (const j of c.px) { const x = j % w, y = (j / w) | 0; sx += x; sy += y; ss += S[j]; if (x < 2 || y < 2 || x > w - 3 || y > h - 3) edge = true; }
      const cx = sx / A, cy = sy / A;
      let xx = 0, yy = 0, xy = 0; const bnd = [];
      for (const j of c.px) {
        const x = j % w, y = (j / w) | 0, dx = x - cx, dy = y - cy; xx += dx * dx; yy += dy * dy; xy += dx * dy;
        if (labArr[j - 1] !== c.id || labArr[j + 1] !== c.id || labArr[j - w] !== c.id || labArr[j + w] !== c.id) bnd.push([x, y]);
      }
      xx /= A; yy /= A; xy /= A;
      const tr = xx + yy, det = xx * yy - xy * xy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      const l1 = tr / 2 + disc, l2 = Math.max(0.01, tr / 2 - disc);
      return { x: cx, y: cy, area: A, major: 4 * Math.sqrt(l1), minor: 4 * Math.sqrt(l2), angle: 0.5 * Math.atan2(2 * xy, xx - yy),
        coreS: ss / A, solidity: A / Math.max(A, hullArea(bnd) + bnd.length * 0.5), edge };
    };
    const cells = [];
    for (const c of comps) {
      const A = c.px.length;
      if (A < Math.max(10, 0.3 * M)) continue;                 // мусор
      cells.push({ id: c.id, ...geom(c, lab), overlap: A > 3.2 * M, weak: false });
    }
    // второй проход: слабо окрашенные изолированные ядра (дегенеративные / без гало),
    // которые не дотягивают до порога «сильного» ядра и не связаны ни с одним гало
    const n = w * h, tw = t1 * 1.5;
    let wm = new Uint8Array(n);
    for (let i = 0; i < n; i++) wm[i] = S[i] > tw ? 1 : 0;
    wm = erode(erode(dilate(dilate(wm, w, h), w, h), w, h), w, h);   // закрытие r=2: склеиваем пятнистое ядро
    const W2 = labelMask(wm, w, h);
    for (const c of W2.comps) {
      const A = c.px.length;
      if (A < 0.35 * M || A > 3 * M) continue;
      let touchesStrong = false;
      for (const j of c.px) if (lab[j]) { touchesStrong = true; break; }
      if (touchesStrong) continue;
      const g = geom(c, W2.lab);
      if (g.coreS < t1 * 2.2) continue;                     // слишком бледно — шум или фон
      if (cells.some((o) => Math.hypot(o.x - g.x, o.y - g.y) < o.major / 2 + (o.minor * 2.2) + 4)) continue;   // обрывок чужого гало
      if (g.major / Math.max(1, g.minor) > 3.2) continue;   // вытянутое — не ядро
      cells.push({ id: -c.id, ...g, overlap: false, weak: true });
    }
    // соседи для границ Вороного
    const others = (cell) => cells.filter((o) => o !== cell && Math.hypot(o.x - cell.x, o.y - cell.y) < cell.major * 8 + 60);
    const K = 48;
    for (const cell of cells) {
      if (cell.edge || cell.overlap || cell.weak) { cell.halo = 0; cell.rays = 0; continue; }
      const near = others(cell), widths = [], cut = [];
      const maxR = cell.major + 3.5 * cell.minor + 12;
      for (let k = 0; k < K; k++) {
        const a = (k / K) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        // профиль окраски вдоль луча: ядро → гало → фон
        const prof = []; let coreEnd = -1, out = false, truncated = false, low = 0;
        for (let r = 0; r < maxR; r += 0.5) {
          const x = cell.x + ca * r, y = cell.y + sa * r, xi = Math.round(x), yi = Math.round(y);
          if (xi < 0 || yi < 0 || xi >= w || yi >= h) { out = true; break; }
          const L = lab[yi * w + xi], v = S[yi * w + xi];
          if (coreEnd < 0 && L !== cell.id && r > 1) coreEnd = prof.length;
          if (coreEnd >= 0) {
            if (L && L !== cell.id) { truncated = true; break; }
            let vor = false; for (const o of near) if (Math.hypot(x - o.x, y - o.y) < r) { vor = true; break; }
            if (vor) { truncated = true; break; }
          }
          prof.push(v);
          if (coreEnd >= 0) { if (v < t1) { if (++low >= 2) break; } else low = 0; }
        }
        if (out || coreEnd < 1) continue;
        // уровни на этом луче: ядро (Pc) и гало (HL); края — по серединам ступеней,
        // поэтому симметричное размытие (расфокус) не смещает их
        const core = prof.slice(0, coreEnd).sort((p, q) => p - q), Pc = core[Math.floor(core.length * 0.6)];
        const tail = prof.slice(coreEnd).filter((v) => v >= t1).sort((p, q) => p - q);
        const HL = tail.length >= 2 ? tail[tail.length >> 1] : 0;
        let wdt = 0;
        // гало — «плато»: большинство отсчётов около одного уровня; размытый край — «рампа»
        const flat = tail.length ? tail.filter((v) => v >= 0.7 * HL && v <= 1.3 * HL).length / tail.length : 0;
        if (HL > 0 && flat >= FLAT) {
          const inT = (Pc + HL) / 2, outT = HL / 2;
          let iIn = -1, iOut = -1;
          for (let i = 0; i < prof.length; i++) { if (iIn < 0 && prof[i] < inT) iIn = i; if (iIn >= 0 && prof[i] < outT) { iOut = i; break; } }
          if (iIn >= 0) { if (iOut < 0) iOut = prof.length - 1; wdt = Math.max(0, (iOut - iIn) * 0.5); }
        }
        (truncated ? cut : widths).push(wdt);
      }
      widths.sort((a, b) => a - b); cut.sort((a, b) => a - b);
      cell.rays = widths.length + cut.length;
      cell.halo = widths.length >= K * 0.25 ? widths[widths.length >> 1] : cut.length ? cut[cut.length >> 1] : 0;
    }
    const coreMed = (() => { const v = cells.filter((c) => !c.edge && !c.overlap && !c.weak).map((c) => c.coreS).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : 1; })();
    for (const c of cells) { c.cls = classify(c, coreMed); c.auto = c.cls; }
    return { cells, t1, t2, base, M };
  }

  function classify(c, coreMed) {
    if (c.edge || c.overlap) return 'excluded';
    const ratio = c.halo / Math.max(1, c.minor - 1);
    c.ratio = ratio;
    if (ratio >= 1) return 'large';
    if (ratio > 1 / 3) return 'medium';
    if (c.halo >= Math.max(1.0, 0.1 * c.minor)) return 'small';
    if (c.coreS < 0.62 * coreMed || c.solidity < 0.8) return 'degraded';
    return 'none';
  }

  function summary(cells) {
    const n = Object.fromEntries([...CLASSES, 'ok', 'frag'].map((k) => [k, 0]));
    for (const c of cells) n[c.cls]++;
    const counted = n.large + n.medium + n.small + n.none + n.degraded + n.ok + n.frag;
    const frag = n.small + n.none + n.degraded + n.frag;
    return { n, counted, frag, dfi: counted ? (frag / counted) * 100 : 0 };
  }

  // ── синтетический снимок SCD (пример и тесты): возвращает ImageData-подобный объект и «истину»
  function synth(opt = {}) {
    const W = opt.w || 1100, H = opt.h || 800, N = opt.n || 55;
    let seed = opt.seed || 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const mix = opt.mix || { large: 0.32, medium: 0.28, small: 0.16, none: 0.14, degraded: 0.10 };
    const RANGES = { large: [1.15, 1.9], medium: [0.45, 0.85], small: [0.16, 0.26], none: [0, 0], degraded: [0, 0] };
    const pick = () => { let r = rnd(), acc = 0; for (const [k, v] of Object.entries(mix)) { acc += v; if (r <= acc) return k; } return 'large'; };
    const cells = [];
    for (let t = 0; t < N * 40 && cells.length < N; t++) {
      const sc = opt.scale || 1, m = (9 + rnd() * 4) * sc, M = m * (1.3 + rnd() * 0.35), cls = pick();
      const [a, b] = RANGES[cls], hw = m * (a + rnd() * (b - a));
      const x = 30 + rnd() * (W - 60), y = 30 + rnd() * (H - 60);
      const R = M / 2 + hw;
      if (x - R < 6 || y - R < 6 || x + R > W - 6 || y + R > H - 6) continue;
      if (cells.some((c) => Math.hypot(c.x - x, c.y - y) < ((c.M / 2 + c.hw) + R * 0.75 + 6) * (opt.dense || 1))) continue;
      cells.push({ x, y, m, M, a: rnd() * Math.PI, cls, hw, seed: rnd() * 100 });
    }
    const data = new Uint8ClampedArray(W * H * 4);
    const bg = opt.bg || [228, 222, 232], CORE = opt.core || [92, 46, 118], HALO = opt.halo || [168, 132, 186], NOISE = opt.noise ?? 8;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 4, ill = 1 - 0.12 * (((x - W * 0.4) / W) ** 2 + ((y - H * 0.6) / H) ** 2) * 2;
      for (let k = 0; k < 3; k++) data[p + k] = bg[k] * ill + (rnd() - 0.5) * NOISE;
      data[p + 3] = 255;
    }
    const paint = (x, y, col, alpha) => { const p = (y * W + x) * 4; for (let k = 0; k < 3; k++) data[p + k] = data[p + k] * (1 - alpha) + col[k] * alpha; };
    for (const c of cells) {
      const ca = Math.cos(c.a), sa = Math.sin(c.a), A = c.M / 2, B = c.m / 2, R = A + c.hw + 4;
      for (let y = Math.floor(c.y - R); y <= c.y + R; y++) for (let x = Math.floor(c.x - R); x <= c.x + R; x++) {
        const dx = x - c.x, dy = y - c.y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        let rho = Math.sqrt((u / A) ** 2 + (v / B) ** 2);
        if (c.cls === 'degraded') rho *= 1 + 0.22 * Math.sin(Math.atan2(v, u) * 5 + c.seed) ;
        const ang = Math.atan2(v, u), rdir = 1 / Math.sqrt((Math.cos(ang) / A) ** 2 + (Math.sin(ang) / B) ** 2);
        const d = (rho - 1) * rdir;
        if (rho <= 1) {
          const holes = c.cls === 'degraded' ? 0.45 + 0.35 * Math.sin(x * 1.3 + c.seed) * Math.sin(y * 1.1) : 0.92;
          paint(x, y, CORE, Math.max(0.15, Math.min(0.95, holes)));
        } else if (c.hw > 0 && d < c.hw * 1.12) {
          const fall = d < c.hw * 0.8 ? 1 : Math.max(0, 1 - (d - c.hw * 0.8) / (c.hw * 0.32));
          paint(x, y, HALO, 0.62 * fall * (0.85 + 0.15 * Math.sin(Math.atan2(dy, dx) * 9 + c.seed)));
        }
      }
    }
    // мусор: мелкие тёмные точки
    for (let k = 0; k < 18; k++) { const x = 10 + rnd() * (W - 20) | 0, y = 10 + rnd() * (H - 20) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) paint(x + dx, y + dy, [70, 50, 80], 0.7); }
    return { img: { width: W, height: H, data }, truth: cells.map((c) => ({ x: c.x, y: c.y, cls: c.cls, ratio: c.hw / c.m })) };
  }

  return { CLASSES, AI_CLASSES, FRAG, prepare, detect, classify, summary, synth, otsu3, setFlat(v) { FLAT = v; } };
})();
