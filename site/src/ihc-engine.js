// ─── Гистология и ИГХ: цветовая деконволюция и поиск ядер ──────────────────
// Деконволюция красителей по Ruifrok & Johnston (2001): оптическая плотность
// каждого пикселя раскладывается на вклад гематоксилина, эозина или DAB.
// Ядра ищутся по каналу гематоксилина (для ИГХ — гематоксилин + DAB): порог Оцу,
// локальные максимумы сглаженного канала как центры, разметка областей
// ближайшим центром внутри маски. Ki-67: ядро положительное, если средняя
// ядро скорее коричневое (DAB), чем синее (гематоксилин).
const IHC = (() => {
  const VEC = {
    he: { a: [0.650, 0.704, 0.286], b: [0.072, 0.990, 0.105] },   // гематоксилин, эозин
    dab: { a: [0.650, 0.704, 0.286], b: [0.268, 0.570, 0.776] },  // гематоксилин, DAB
  };
  const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };

  function matrix(kind) {
    const a = norm(VEC[kind].a), b = norm(VEC[kind].b);
    let c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    c = norm(c.map(Math.abs));
    const M = [a, b, c];
    // обратная матрица 3×3
    const [m0, m1, m2] = M;
    const det = m0[0] * (m1[1] * m2[2] - m1[2] * m2[1]) - m0[1] * (m1[0] * m2[2] - m1[2] * m2[0]) + m0[2] * (m1[0] * m2[1] - m1[1] * m2[0]);
    const inv = [
      [(m1[1] * m2[2] - m1[2] * m2[1]) / det, (m0[2] * m2[1] - m0[1] * m2[2]) / det, (m0[1] * m1[2] - m0[2] * m1[1]) / det],
      [(m1[2] * m2[0] - m1[0] * m2[2]) / det, (m0[0] * m2[2] - m0[2] * m2[0]) / det, (m0[2] * m1[0] - m0[0] * m1[2]) / det],
      [(m1[0] * m2[1] - m1[1] * m2[0]) / det, (m0[1] * m2[0] - m0[0] * m2[1]) / det, (m0[0] * m1[1] - m0[1] * m1[0]) / det],
    ];
    return inv;
  }

  // концентрации двух красителей на пиксель
  function deconvolve(img, kind) {
    const { width: w, height: h, data } = img, n = w * h, inv = matrix(kind);
    const A = new Float32Array(n), B = new Float32Array(n), T = new Float32Array(n);
    const lut = new Float32Array(256); for (let i = 0; i < 256; i++) lut[i] = -Math.log10((i + 1) / 256);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const r = lut[data[p]], g = lut[data[p + 1]], b = lut[data[p + 2]];
      T[i] = r + g + b;
      A[i] = Math.max(0, r * inv[0][0] + g * inv[1][0] + b * inv[2][0]);
      B[i] = Math.max(0, r * inv[0][1] + g * inv[1][1] + b * inv[2][1]);
    }
    return { w, h, A, B, T };
  }

  function blur(a, w, h, r) {
    // два прохода скользящего среднего по строкам и столбцам ≈ гауссово сглаживание
    let src = a;
    for (let pass = 0; pass < 2; pass++) {
      const t = new Float32Array(a.length), o = new Float32Array(a.length);
      for (let y = 0; y < h; y++) { let s = 0, c = 0; const row = y * w;
        for (let x = -r; x < w + r; x++) { const xa = x + r, xr = x - r - 1;
          if (xa >= 0 && xa < w) { s += src[row + xa]; c++; } if (xr >= 0 && xr < w) { s -= src[row + xr]; c--; }
          if (x >= 0 && x < w) t[row + x] = s / c; } }
      for (let x = 0; x < w; x++) { let s = 0, c = 0;
        for (let y = -r; y < h + r; y++) { const ya = y + r, yr = y - r - 1;
          if (ya >= 0 && ya < h) { s += t[ya * w + x]; c++; } if (yr >= 0 && yr < h) { s -= t[yr * w + x]; c--; }
          if (y >= 0 && y < h) o[y * w + x] = s / c; } }
      src = o;
    }
    return src;
  }

  function otsu(vals) {
    let mx = 0; for (const v of vals) if (v > mx) mx = v;
    if (mx <= 0) return 0;
    const bins = 256, hist = new Float64Array(bins);
    for (const v of vals) hist[Math.min(bins - 1, Math.floor((v / mx) * (bins - 1)))]++;
    const total = vals.length; let sum = 0; for (let i = 0; i < bins; i++) sum += i * hist[i];
    let wB = 0, sB = 0, best = 0, th = 0;
    for (let i = 0; i < bins; i++) { wB += hist[i]; if (!wB) continue; const wF = total - wB; if (!wF) break;
      sB += i * hist[i]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; th = i; } }
    return ((th + 0.5) / (bins - 1)) * mx;
  }

  // связные компоненты маски (для оценки размера ядра)
  function components(mask, w, h) {
    const lab = new Int32Array(w * h), sizes = []; let id = 0; const st = [];
    for (let i = 0; i < w * h; i++) {
      if (!mask[i] || lab[i]) continue; id++; let s = 0; st.push(i); lab[i] = id;
      while (st.length) { const p = st.pop(); s++; const x = p % w, y = (p / w) | 0;
        if (x > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = id; st.push(p - 1); }
        if (x < w - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = id; st.push(p + 1); }
        if (y > 0 && mask[p - w] && !lab[p - w]) { lab[p - w] = id; st.push(p - w); }
        if (y < h - 1 && mask[p + w] && !lab[p + w]) { lab[p + w] = id; st.push(p + w); } }
      sizes.push(s);
    }
    return { lab, sizes };
  }

  // поиск ядер. opt: { kind:'he'|'dab', radius (px, 0 = авто), sens (0.5–1.5), dabThr (0 = авто) }
  function detect(img, opt = {}) {
    const kind = opt.kind || 'he';
    const D = deconvolve(img, kind), { w, h } = D, n = w * h;
    const N = new Float32Array(n);
    for (let i = 0; i < n; i++) N[i] = kind === 'dab' ? D.T[i] : D.A[i];   // для ИГХ ядро ищем по суммарной плотности
    const N1 = blur(N, w, h, 1);
    const sample = []; for (let i = 0; i < n; i += 3) sample.push(N1[i]);
    const thr = otsu(sample) / (opt.sens || 1);
    const mask = new Uint8Array(n); for (let i = 0; i < n; i++) mask[i] = N1[i] > thr ? 1 : 0;
    // радиус ядра: медиана площадей одиночных компонент
    let r = opt.radius || 0;
    if (!r) {
      const { sizes } = components(mask, w, h);
      const ok = sizes.filter((s) => s >= 12).sort((a, b) => a - b);
      const med = ok.length ? ok[Math.floor(ok.length * 0.4)] : 80;
      r = Math.max(3, Math.min(40, Math.sqrt(med / Math.PI)));
    }
    // центры: локальные максимумы сглаженного канала внутри маски
    const Nr = blur(N, w, h, Math.max(1, Math.round(r * 0.45)));
    const R = Math.max(2, Math.round(r * 0.8)), seeds = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x; if (!mask[i]) continue; const v = Nr[i]; if (v <= thr) continue;
      let top = true;
      for (let dy = -R; dy <= R && top; dy += 1) { const yy = y + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -R; dx <= R; dx += 1) { if (dx * dx + dy * dy > R * R) continue; const xx = x + dx; if (xx < 0 || xx >= w) continue;
          const u = Nr[yy * w + xx]; if (u > v || (u === v && (dy < 0 || (dy === 0 && dx < 0)))) { top = false; break; } } }
      if (top) seeds.push({ x, y });
    }
    // разметка: каждый пиксель маски — ближайшему центру в пределах 1.6 r
    const own = new Int32Array(n).fill(-1), lim = (1.6 * r) ** 2;
    const cell = Math.max(4, Math.round(r * 2)), gw = Math.ceil(w / cell), gh = Math.ceil(h / cell), grid = Array.from({ length: gw * gh }, () => []);
    seeds.forEach((s, k) => grid[Math.floor(s.y / cell) * gw + Math.floor(s.x / cell)].push(k));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!mask[i]) continue;
      const gx = Math.floor(x / cell), gy = Math.floor(y / cell); let best = -1, bd = lim;
      for (let yy = gy - 1; yy <= gy + 1; yy++) for (let xx = gx - 1; xx <= gx + 1; xx++) {
        if (yy < 0 || yy >= gh || xx < 0 || xx >= gw) continue;
        for (const k of grid[yy * gw + xx]) { const d = (seeds[k].x - x) ** 2 + (seeds[k].y - y) ** 2; if (d < bd) { bd = d; best = k; } } }
      own[i] = best;
    }
    const acc = seeds.map(() => ({ a: 0, sx: 0, sy: 0, H: 0, B: 0, T: 0, br: 0 }));
    const px = img.data;
    for (let i = 0; i < n; i++) { const k = own[i]; if (k < 0) continue; const c = acc[k]; c.a++; c.sx += i % w; c.sy += (i / w) | 0; c.H += D.A[i]; c.B += D.B[i]; c.T += D.T[i]; c.br += (px[i * 4] - px[i * 4 + 2]) / 255; }
    const minA = Math.PI * r * r * 0.18;
    let nuclei = acc.map((c, k) => c.a >= minA ? { x: c.sx / c.a, y: c.sy / c.a, area: c.a, h: c.H / c.a, dab: c.B / c.a, brown: c.br / c.a, k } : null).filter(Boolean);
    // ядро положительное, если оно скорее коричневое (DAB), чем синее (гематоксилин):
    // средняя разность каналов R − B по пикселям ядра выше порога (по умолчанию 0)
    const dabThr = opt.dabThr ?? 0;
    if (kind === 'dab') nuclei.forEach((q) => { q.pos = q.brown > dabThr; });
    return { w, h, r, thr, dabThr, nuclei, own, kind };
  }

  function summary(res, umPerPx = 0) {
    const N = res.nuclei, n = N.length;
    const areas = N.map((q) => q.area).sort((a, b) => a - b);
    const med = n ? areas[Math.floor(n / 2)] : 0, mean = n ? areas.reduce((s, a) => s + a, 0) / n : 0;
    const sd = n > 1 ? Math.sqrt(areas.reduce((s, a) => s + (a - mean) ** 2, 0) / (n - 1)) : 0;
    const k2 = umPerPx * umPerPx;
    const out = { n, medianArea: med, meanArea: mean, sdArea: sd, cv: mean ? sd / mean : 0,
      large: n ? N.filter((q) => q.area > 2 * med).length : 0 };
    if (umPerPx > 0) { out.areaUm = mean * k2; out.sdUm = sd * k2; out.density = n / ((res.w * res.h * k2) / 1e6); }
    if (res.kind === 'dab') { out.pos = N.filter((q) => q.pos).length; out.index = n ? out.pos / n : 0; }
    return out;
  }

  // ── синтетический препарат с известным числом ядер (для примера и проверки)
  function synth(opt = {}) {
    const W = opt.w || 760, H = opt.h || 520, kind = opt.kind || 'he', rnd = mulberry(opt.seed || 7);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = kind === 'he' ? '#f1c7da' : '#eef0f3'; g.fillRect(0, 0, W, H);
    // строма / цитоплазма
    for (let i = 0; i < 260; i++) {
      g.fillStyle = kind === 'he' ? `rgba(${215 + rnd() * 25},${120 + rnd() * 40},${165 + rnd() * 30},${0.25 + rnd() * 0.3})` : `rgba(${200 + rnd() * 30},${205 + rnd() * 30},${220 + rnd() * 25},${0.35})`;
      g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 10 + rnd() * 40, 6 + rnd() * 18, rnd() * 3.14, 0, 7); g.fill();
    }
    const truth = []; const target = opt.count || 120, R = opt.r || 9, posRate = opt.pos ?? 0.3;
    let tries = 0;
    while (truth.length < target && tries++ < 20000) {
      const x = R * 2 + rnd() * (W - R * 4), y = R * 2 + rnd() * (H - R * 4), rr = R * (0.75 + rnd() * 0.55);
      if (truth.some((t) => (t.x - x) ** 2 + (t.y - y) ** 2 < ((t.r + rr) * (opt.touch ? 0.85 : 1.15)) ** 2)) continue;
      truth.push({ x, y, r: rr, pos: kind === 'dab' && rnd() < posRate });
    }
    for (const t of truth) {
      const a = rnd() * 3.14, e = 0.7 + rnd() * 0.3;
      g.fillStyle = kind === 'he' ? `rgb(${70 + rnd() * 30},${40 + rnd() * 25},${120 + rnd() * 30})` : t.pos ? `rgb(${120 + rnd() * 30},${70 + rnd() * 20},${35 + rnd() * 15})` : `rgb(${95 + rnd() * 25},${105 + rnd() * 25},${160 + rnd() * 25})`;
      g.beginPath(); g.ellipse(t.x, t.y, t.r, t.r * e, a, 0, 7); g.fill();
      for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(30,10,50,0.25)'; g.beginPath(); g.arc(t.x + (rnd() - 0.5) * t.r, t.y + (rnd() - 0.5) * t.r * e, 1 + rnd() * 1.6, 0, 7); g.fill(); }
    }
    const id = g.getImageData(0, 0, W, H), d = id.data, nz = opt.noise ?? 6;
    for (let i = 0; i < d.length; i += 4) { const v = (rnd() - 0.5) * nz * 2; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
    g.putImageData(id, 0, 0);
    return { canvas: c, truth };
  }
  function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  return { deconvolve, detect, summary, synth, otsu };
})();
