/* SpermCASA core — общий код для браузера (воркер/страница) и Node (проверка).
   Все координаты детекций — в пикселях исходного кадра. */
(function (root) {
'use strict';
const C = {};

C.DEFAULTS = {
  chamberDepthUm: 10, gridPitchUm: 100, umPerPx: null, dilution: 1, volumeMl: null,
  detThreshold: 14, areaMin: 10, areaMax: 175,      // для полуразмерного кадра
  stillShiftPx: 1.5, maxShiftPx: 6,
  linkGateUm: 7.5, maxGap: 2, minTrackS: 0.5, psWindowS: 1.0,
  rapid: 25, slow: 5, immotileRangeUm: 1.2,
  patchEvery: 6, headProb: 0.5,
};

// ---------------------------------------------------------------- обработка кадра (нужен cv)
let K = null;
function kernels(cv) {
  if (K) return K;
  K = {
    se11: cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(11, 11)),
    excl: cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(17, 17)),
    h: cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(37, 1)),
    v: cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 37)),
  };
  return K;
}

/* rgba: Uint8ClampedArray/Uint8Array W*H*4. Возвращает всё, что нужно для анализа кадра. */
C.processFrame = function (cv, rgba, W, H, opt) {
  opt = Object.assign({}, C.DEFAULTS, opt || {});
  const k = kernels(cv);
  const src = cv.matFromArray(H, W, cv.CV_8UC4, rgba);
  const W2 = W >> 1, H2 = H >> 1, W4 = W >> 2, H4 = H >> 2;
  const rgb2 = new cv.Mat(), g2 = new cv.Mat(), g4 = new cv.Mat();
  cv.resize(src, rgb2, new cv.Size(W2, H2), 0, 0, cv.INTER_AREA);
  src.delete();
  cv.cvtColor(rgb2, g2, cv.COLOR_RGBA2GRAY);
  cv.resize(g2, g4, new cv.Size(W4, H4), 0, 0, cv.INTER_AREA);
  // --- маска сетки (четверть)
  const blur = new cv.Mat(), bg = new cv.Mat(), dark = new cv.Mat(), mh = new cv.Mat(), mv = new cv.Mat();
  cv.GaussianBlur(g4, blur, new cv.Size(0, 0), 0.6);
  cv.medianBlur(g4, bg, 15);
  cv.subtract(bg, blur, dark);
  cv.threshold(dark, dark, 35, 255, cv.THRESH_BINARY);
  cv.morphologyEx(dark, mh, cv.MORPH_OPEN, k.h);
  cv.morphologyEx(dark, mv, cv.MORPH_OPEN, k.v);
  const gm4 = new cv.Mat(); cv.bitwise_or(mh, mv, gm4);
  [blur, bg, dark, mh, mv].forEach(m => m.delete());
  let pitch = null;
  if (opt.wantPitch) pitch = gridPitch(gm4.data, W4, H4);
  const gm2 = new cv.Mat(), excl = new cv.Mat();
  cv.resize(gm4, gm2, new cv.Size(W2, H2), 0, 0, cv.INTER_NEAREST);
  cv.dilate(gm2, excl, k.excl);
  gm4.delete(); gm2.delete();
  const ex = excl.data, m = 6;
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++)
    if (y < m || y >= H2 - m || x < m || x >= W2 - m) ex[y * W2 + x] = 255;
  let free = 0; for (let i = 0; i < ex.length; i++) if (!ex[i]) free++;
  // --- карта контраста (половина)
  const bh = new cv.Mat(), th = new cv.Mat(), s = new cv.Mat();
  cv.morphologyEx(g2, bh, cv.MORPH_BLACKHAT, k.se11);
  cv.morphologyEx(g2, th, cv.MORPH_TOPHAT, k.se11);
  cv.addWeighted(bh, 1.0, th, 0.7, 0, s, cv.CV_32F);
  cv.GaussianBlur(s, s, new cv.Size(0, 0), 0.75);
  bh.delete(); th.delete();
  const sd = s.data32F;
  for (let i = 0; i < sd.length; i++) if (ex[i]) sd[i] = 0;
  const bin = new cv.Mat(); cv.threshold(s, bin, opt.detThreshold, 255, cv.THRESH_BINARY);
  const bin8 = new cv.Mat(); bin.convertTo(bin8, cv.CV_8U); bin.delete();
  const lab = new cv.Mat(), st = new cv.Mat(), cen = new cv.Mat();
  const n = cv.connectedComponentsWithStats(bin8, lab, st, cen, 8, cv.CV_32S);
  const L = lab.data32S, S = st.data32S;
  const dets = [];
  for (let i = 1; i < n; i++) {
    const x0 = S[i * 5], y0 = S[i * 5 + 1], w = S[i * 5 + 2], h = S[i * 5 + 3], a = S[i * 5 + 4];
    if (a < opt.areaMin || a > opt.areaMax) continue;
    let sw = 0, sx = 0, sy = 0, smax = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const j = y * W2 + x; if (L[j] !== i) continue;
      const v = sd[j]; sw += v; sx += v * x; sy += v * y; if (v > smax) smax = v;
    }
    dets.push([(sx / sw) * 2 + 0.5, (sy / sw) * 2 + 0.5, a, smax]);
  }
  [lab, st, cen, bin8, s, excl].forEach(m => m.delete());
  // --- патчи 24x24 RGB (полуразмер) для классификатора
  let patches = null;
  if (opt.wantPatches && dets.length) {
    const R = rgb2.data; patches = new Uint8Array(dets.length * 24 * 24 * 3);
    dets.forEach((d, q) => {
      const cx = Math.round((d[0] - 0.5) / 2), cy = Math.round((d[1] - 0.5) / 2);
      let o = q * 1728;
      for (let yy = cy - 12; yy < cy + 12; yy++) for (let xx = cx - 12; xx < cx + 12; xx++) {
        const X = Math.min(W2 - 1, Math.max(0, xx)), Y = Math.min(H2 - 1, Math.max(0, yy));
        const p = (Y * W2 + X) * 4; patches[o++] = R[p]; patches[o++] = R[p + 1]; patches[o++] = R[p + 2];
      }
    });
  }
  const small = new Float32Array(g4.data);   // для фазовой корреляции
  rgb2.delete(); g2.delete(); g4.delete();
  return { small, W4, H4, dets, free: free * 4, pitch: pitch ? pitch * 4 : null, patches };
};

function gridPitch(mask, W, H) {
  const res = [];
  for (const axis of [0, 1]) {
    const N = axis === 0 ? W : H, prof = new Float64Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) prof[axis === 0 ? x : y] += 1;
    let mean = 0; for (const v of prof) mean += v; mean /= N;
    let v0 = 0; for (let i = 0; i < N; i++) { prof[i] -= mean; v0 += prof[i] * prof[i]; }
    if (v0 < 1e-6) continue;
    const ac = new Float64Array(Math.min(N, 230));
    for (let l = 0; l < ac.length; l++) { let s = 0; for (let i = 0; i + l < N; i++) s += prof[i] * prof[i + l]; ac[l] = s / v0; }
    let kb = 25; for (let l = 25; l < ac.length; l++) if (ac[l] > ac[kb]) kb = l;
    if (ac[kb] > 0.3 && kb > 25 && kb < ac.length - 1) {
      const y0 = ac[kb - 1], y1 = ac[kb], y2 = ac[kb + 1];
      res.push(kb + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 + 1e-9));
    }
  }
  return res.length ? res.reduce((a, b) => a + b) / res.length : null;
}

/* Фазовая корреляция: сдвиг содержимого cur относительно prev, в пикселях четвертного кадра. */
C.phaseShift = function (cv, prev, cur, W, H) {
  const a = cv.matFromArray(H, W, cv.CV_32F, prev), b = cv.matFromArray(H, W, cv.CV_32F, cur);
  const A = new cv.Mat(), B = new cv.Mat();
  cv.dft(a, A, cv.DFT_COMPLEX_OUTPUT); cv.dft(b, B, cv.DFT_COMPLEX_OUTPUT);
  const ad = A.data32F, bd = B.data32F;
  for (let i = 0; i < ad.length; i += 2) {
    // prev * conj(cur)? cv.phaseCorrelate: C = B * conj(A) -> пик в сдвиге cur относительно prev
    const re = bd[i] * ad[i] + bd[i + 1] * ad[i + 1];
    const im = bd[i + 1] * ad[i] - bd[i] * ad[i + 1];
    const mg = Math.hypot(re, im) + 1e-9;
    ad[i] = re / mg; ad[i + 1] = im / mg;
  }
  const R = new cv.Mat(); cv.dft(A, R, cv.DFT_INVERSE | cv.DFT_REAL_OUTPUT | cv.DFT_SCALE);
  const r = R.data32F;
  let bi = 0; for (let i = 1; i < r.length; i++) if (r[i] > r[bi]) bi = i;
  const py = Math.floor(bi / W), px = bi % W;
  let sw = 0, sx = 0, sy = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const yy = (py + dy + H) % H, xx = (px + dx + W) % W, v = r[yy * W + xx];
    sw += v; sx += v * (px + dx); sy += v * (py + dy);
  }
  let x = sx / sw, y = sy / sw;
  if (x > W / 2) x -= W; if (y > H / 2) y -= H;
  [a, b, A, B, R].forEach(m => m.delete());
  return [x, y];
};

// ---------------------------------------------------------------- чистый JS (без OpenCV)
function hMinMax(src, W, H, r, isMax, out) { // горизонтальный min/max окна [x-r, x+r] (обрезка по краям)
  if (r === 0) { out.set(src); return out; }
  for (let y = 0; y < H; y++) {
    const o = y * W;
    for (let x = 0; x < W; x++) {
      const a = Math.max(0, x - r), b = Math.min(W - 1, x + r);
      let v = src[o + a];
      for (let k = a + 1; k <= b; k++) { const q = src[o + k]; if (isMax ? q > v : q < v) v = q; }
      out[o + x] = v;
    }
  }
  return out;
}
function hMinMaxFast(src, W, H, r, isMax, out) { // ван Херк / Гил-Верман
  if (r === 0) { out.set(src); return out; }
  const w = 2 * r + 1, n = W + 2 * r, L = Math.ceil(n / w) * w, pad = isMax ? -1e9 : 1e9;
  const E = new Float32Array(L), G = new Float32Array(L), Hh = new Float32Array(L);
  for (let y = 0; y < H; y++) {
    const o = y * W;
    E.fill(pad); for (let x = 0; x < W; x++) E[x + r] = src[o + x];
    if (isMax) {
      for (let i = 0; i < L; i++) { const v = E[i]; G[i] = (i % w === 0) ? v : (G[i - 1] > v ? G[i - 1] : v); }
      for (let i = L - 1; i >= 0; i--) { const v = E[i]; Hh[i] = (i % w === w - 1) ? v : (Hh[i + 1] > v ? Hh[i + 1] : v); }
      for (let x = 0; x < W; x++) { const p = Hh[x], q = G[x + w - 1]; out[o + x] = p > q ? p : q; }
    } else {
      for (let i = 0; i < L; i++) { const v = E[i]; G[i] = (i % w === 0) ? v : (G[i - 1] < v ? G[i - 1] : v); }
      for (let i = L - 1; i >= 0; i--) { const v = E[i]; Hh[i] = (i % w === w - 1) ? v : (Hh[i + 1] < v ? Hh[i + 1] : v); }
      for (let x = 0; x < W; x++) { const p = Hh[x], q = G[x + w - 1]; out[o + x] = p < q ? p : q; }
    }
  }
  return out;
}
function vMinMax(src, W, H, r, isMax, out) { // транспонирование -> горизонтальный
  const t = new Float32Array(W * H), u = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) t[x * H + y] = src[y * W + x];
  hMinMaxFast(t, H, W, r, isMax, u);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = u[x * H + y];
  return out;
}
// эллипс cv: полуширина строки dy
function ellRows(k) { const r = (k - 1) / 2, o = []; for (let dy = -r; dy <= r; dy++) o.push([dy, Math.round(r * Math.sqrt(Math.max(0, (r * r - dy * dy) / (r * r))))]); return o; }
function morphEll(src, W, H, k, isMax) {
  const rows = ellRows(k), cache = new Map(), out = new Float32Array(W * H).fill(isMax ? -1e9 : 1e9);
  for (const [, hw] of rows) if (!cache.has(hw)) cache.set(hw, hMinMaxFast(src, W, H, hw, isMax, new Float32Array(W * H)));
  for (const [dy, hw] of rows) {
    const A = cache.get(hw);
    for (let y = 0; y < H; y++) { const yy = y + dy; if (yy < 0 || yy >= H) continue;
      const o = y * W, oo = yy * W;
      if (isMax) { for (let x = 0; x < W; x++) if (A[oo + x] > out[o + x]) out[o + x] = A[oo + x]; }
      else { for (let x = 0; x < W; x++) if (A[oo + x] < out[o + x]) out[o + x] = A[oo + x]; } }
  }
  return out;
}
function gaussKernel(sigma, n) { const k = [], c = (n - 1) / 2; let s = 0; for (let i = 0; i < n; i++) { const v = Math.exp(-((i - c) ** 2) / (2 * sigma * sigma)); k.push(v); s += v; } return k.map(v => v / s); }
function gaussBlur(src, W, H, sigma, n, round) { // reflect101
  const k = gaussKernel(sigma, n), c = (n - 1) / 2, t = new Float32Array(W * H), o = new Float32Array(W * H);
  const rf = (i, N) => i < 0 ? -i : (i >= N ? 2 * N - 2 - i : i);
  const ix = new Int32Array(W * n), iy = new Int32Array(H * n);
  for (let x = 0; x < W; x++) for (let i = 0; i < n; i++) ix[x * n + i] = rf(x + i - c, W);
  for (let y = 0; y < H; y++) for (let i = 0; i < n; i++) iy[y * n + i] = rf(y + i - c, H) * W;
  for (let y = 0; y < H; y++) { const o0 = y * W; for (let x = 0; x < W; x++) { let s = 0; const b = x * n; for (let i = 0; i < n; i++) s += k[i] * src[o0 + ix[b + i]]; t[o0 + x] = s; } }
  for (let y = 0; y < H; y++) { const b = y * n; for (let x = 0; x < W; x++) { let s = 0; for (let i = 0; i < n; i++) s += k[i] * t[iy[b + i] + x]; o[y * W + x] = round ? Math.round(s) : s; } }
  return o;
}
function medianU8(src, W, H, k) { // гистограммная медиана, граница — повтор
  const r = (k - 1) >> 1, out = new Uint8Array(W * H), half = (k * k) >> 1;
  for (let y = 0; y < H; y++) {
    const hist = new Int32Array(256);
    for (let dy = -r; dy <= r; dy++) { const yy = Math.min(H - 1, Math.max(0, y + dy));
      for (let dx = -r; dx <= r; dx++) hist[src[yy * W + Math.min(W - 1, Math.max(0, dx))]]++; }
    for (let x = 0; x < W; x++) {
      if (x > 0) { const xo = Math.min(W - 1, Math.max(0, x - r - 1)), xi = Math.min(W - 1, x + r);
        for (let dy = -r; dy <= r; dy++) { const yy = Math.min(H - 1, Math.max(0, y + dy)); hist[src[yy * W + xo]]--; hist[src[yy * W + xi]]++; } }
      let c = 0, v = 0; for (; v < 256; v++) { c += hist[v]; if (c > half) break; }
      out[y * W + x] = v;
    }
  }
  return out;
}

C.processFrameJS = function (rgba, W, H, opt) {
  opt = Object.assign({}, C.DEFAULTS, opt || {});
  const W2 = W >> 1, H2 = H >> 1, W4 = W >> 2, H4 = H >> 2;
  const rgb2 = new Uint8Array(W2 * H2 * 3), g2 = new Float32Array(W2 * H2);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const p = ((2 * y) * W + 2 * x) * 4, q = p + W * 4, o = (y * W2 + x);
    const r = (rgba[p] + rgba[p + 4] + rgba[q] + rgba[q + 4] + 2) >> 2, g = (rgba[p + 1] + rgba[p + 5] + rgba[q + 1] + rgba[q + 5] + 2) >> 2, b = (rgba[p + 2] + rgba[p + 6] + rgba[q + 2] + rgba[q + 6] + 2) >> 2;
    rgb2[o * 3] = r; rgb2[o * 3 + 1] = g; rgb2[o * 3 + 2] = b;
    g2[o] = (r * 4899 + g * 9617 + b * 1868 + 8192) >> 14;
  }
  const g4 = new Uint8Array(W4 * H4);
  for (let y = 0; y < H4; y++) for (let x = 0; x < W4; x++) { const p = 2 * y * W2 + 2 * x; g4[y * W4 + x] = (g2[p] + g2[p + 1] + g2[p + W2] + g2[p + W2 + 1] + 2) >> 2; }
  // маска сетки
  const blur = gaussBlur(g4, W4, H4, 0.6, 5, true), bg = medianU8(g4, W4, H4, 15);
  const dark = new Float32Array(W4 * H4); for (let i = 0; i < dark.length; i++) dark[i] = (bg[i] - blur[i]) > 35 ? 255 : 0;
  const tmp = new Float32Array(W4 * H4), oh = new Float32Array(W4 * H4), ov = new Float32Array(W4 * H4);
  hMinMaxFast(dark, W4, H4, 18, false, tmp); hMinMaxFast(tmp, W4, H4, 18, true, oh);
  vMinMax(dark, W4, H4, 18, false, tmp); vMinMax(tmp, W4, H4, 18, true, ov);
  const gm4 = new Uint8Array(W4 * H4); for (let i = 0; i < gm4.length; i++) gm4[i] = (oh[i] || ov[i]) ? 255 : 0;
  const pitch = opt.wantPitch ? gridPitch(gm4, W4, H4) : null;
  const ex4 = morphEll(Float32Array.from(gm4), W4, H4, 9, true);
  const ex = new Uint8Array(W2 * H2), m = 6; let free = 0;
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    const v = (y < m || y >= H2 - m || x < m || x >= W2 - m || ex4[Math.min(H4 - 1, y >> 1) * W4 + Math.min(W4 - 1, x >> 1)] > 0) ? 1 : 0;
    ex[y * W2 + x] = v; if (!v) free++;
  }
  // карта контраста
  const dil = morphEll(g2, W2, H2, 11, true), ero = morphEll(g2, W2, H2, 11, false);
  const clo = morphEll(dil, W2, H2, 11, false), opn = morphEll(ero, W2, H2, 11, true);
  const s0 = new Float32Array(W2 * H2); for (let i = 0; i < s0.length; i++) s0[i] = (clo[i] - g2[i]) + 0.7 * (g2[i] - opn[i]);
  const s = gaussBlur(s0, W2, H2, 0.75, 7, false);
  for (let i = 0; i < s.length; i++) if (ex[i]) s[i] = 0;
  // компоненты
  const lab = new Int32Array(W2 * H2), T = opt.detThreshold, dets = [], stack = new Int32Array(W2 * H2);
  let nl = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] <= T || lab[i]) continue;
    nl++; let sp = 0; stack[sp++] = i; lab[i] = nl;
    let a = 0, sw = 0, sx = 0, sy = 0, smax = 0;
    while (sp) { const j = stack[--sp], x = j % W2, y = (j / W2) | 0, v = s[j];
      a++; sw += v; sx += v * x; sy += v * y; if (v > smax) smax = v;
      for (let dy = -1; dy <= 1; dy++) { const Y = y + dy; if (Y < 0 || Y >= H2) continue;
        for (let dx = -1; dx <= 1; dx++) { const X = x + dx; if (X < 0 || X >= W2) continue; const q = Y * W2 + X;
          if (!lab[q] && s[q] > T) { lab[q] = nl; stack[sp++] = q; } } } }
    if (a >= opt.areaMin && a <= opt.areaMax) dets.push([(sx / sw) * 2 + 0.5, (sy / sw) * 2 + 0.5, a, smax]);
  }
  let patches = null;
  if (opt.wantPatches && dets.length) {
    patches = new Uint8Array(dets.length * 1728);
    dets.forEach((d, q) => {
      const cx = Math.round((d[0] - 0.5) / 2), cy = Math.round((d[1] - 0.5) / 2); let o = q * 1728;
      for (let yy = cy - 12; yy < cy + 12; yy++) for (let xx = cx - 12; xx < cx + 12; xx++) {
        const X = Math.min(W2 - 1, Math.max(0, xx)), Y = Math.min(H2 - 1, Math.max(0, yy)), p = (Y * W2 + X) * 3;
        patches[o++] = rgb2[p]; patches[o++] = rgb2[p + 1]; patches[o++] = rgb2[p + 2];
      }
    });
  }
  return { small: Float32Array.from(g4), W4, H4, dets, free: free * 4, pitch: pitch ? pitch * 4 : null, patches };
};

// (старый radix-2 БПФ не используется)
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = 2 * Math.PI / len * (inv ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
function fft2(re, im, N, inv) {
  const r = new Float64Array(N), i = new Float64Array(N);
  for (let y = 0; y < N; y++) { for (let x = 0; x < N; x++) { r[x] = re[y * N + x]; i[x] = im[y * N + x]; } fft(r, i, inv); for (let x = 0; x < N; x++) { re[y * N + x] = r[x]; im[y * N + x] = i[x]; } }
  for (let x = 0; x < N; x++) { for (let y = 0; y < N; y++) { r[y] = re[y * N + x]; i[y] = im[y * N + x]; } fft(r, i, inv); for (let y = 0; y < N; y++) { re[y * N + x] = r[y]; im[y * N + x] = i[y]; } }
}
// БПФ смешанного основания (2,3,5,…) для произвольных размеров, как cv.dft
function factor(n) { const f = []; for (const p of [4, 2, 3, 5]) while (n % p === 0) { f.push(p); n /= p; } for (let p = 7; n > 1; p++) while (n % p === 0) { f.push(p); n /= p; } return f; }
const TRIG = new Map();
function trig(N) { let t = TRIG.get(N); if (!t) { t = [new Float64Array(N), new Float64Array(N)]; for (let j = 0; j < N; j++) { t[0][j] = Math.cos(2 * Math.PI * j / N); t[1][j] = Math.sin(2 * Math.PI * j / N); } TRIG.set(N, t); } return t; }
function mrfft(re, im, inv, N, stride0) { // рекурсия Кули–Тьюки, таблица синусов размера N (исходной длины)
  const n = re.length; if (n === 1) return;
  N = N || n; const T = trig(N), ct = T[0], st = T[1], sg = inv ? 1 : -1;
  const p = factor(n)[0], m = n / p, step = N / n;
  const subR = [], subI = [];
  for (let r = 0; r < p; r++) { const a = new Float64Array(m), b = new Float64Array(m); for (let k = 0; k < m; k++) { a[k] = re[k * p + r]; b[k] = im[k * p + r]; } mrfft(a, b, inv, N); subR.push(a); subI.push(b); }
  const wr = new Float64Array(p), wi = new Float64Array(p), pstep = N / p;
  for (let k = 0; k < m; k++) {
    for (let r = 0; r < p; r++) { const j = (r * k * step) % N, c = ct[j], s = sg * st[j];
      wr[r] = subR[r][k] * c - subI[r][k] * s; wi[r] = subR[r][k] * s + subI[r][k] * c; }
    for (let q = 0; q < p; q++) { let sr = 0, si = 0;
      for (let r = 0; r < p; r++) { const j = (r * q * pstep) % N, c = ct[j], s = sg * st[j]; sr += wr[r] * c - wi[r] * s; si += wr[r] * s + wi[r] * c; }
      re[k + q * m] = sr; im[k + q * m] = si; }
  }
}
function fft2d(re, im, W, H, inv) {
  const r = new Float64Array(W), i = new Float64Array(W);
  for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) { r[x] = re[y * W + x]; i[x] = im[y * W + x]; } mrfft(r, i, inv); for (let x = 0; x < W; x++) { re[y * W + x] = r[x]; im[y * W + x] = i[x]; } }
  const r2 = new Float64Array(H), i2 = new Float64Array(H);
  for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) { r2[y] = re[y * W + x]; i2[y] = im[y * W + x]; } mrfft(r2, i2, inv); for (let y = 0; y < H; y++) { re[y * W + x] = r2[y]; im[y * W + x] = i2[y]; } }
}
C.spectrum = function (img, W, H) { // прямое БПФ четвертного кадра (Float32 re/im)
  const N = W * H, re = new Float64Array(N), im = new Float64Array(N);
  for (let q = 0; q < N; q++) re[q] = img[q];
  fft2d(re, im, W, H, false);
  return { re: Float32Array.from(re), im: Float32Array.from(im) };
};
C.phaseFromSpectra = function (A, B, W, H) { // как cv.phaseCorrelate(prev=A, cur=B) без окна
  const N = W * H, ar = new Float64Array(N), ai = new Float64Array(N);
  for (let q = 0; q < N; q++) { const re = B.re[q] * A.re[q] + B.im[q] * A.im[q], im = B.im[q] * A.re[q] - B.re[q] * A.im[q], mg = Math.hypot(re, im) + 1e-9;
    ar[q] = re / mg; ai[q] = im / mg; }
  fft2d(ar, ai, W, H, true);
  let b = 0; for (let q = 1; q < N; q++) if (ar[q] > ar[b]) b = q;
  const py = Math.floor(b / W), px = b % W; let sw = 0, sx = 0, sy = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const v = ar[((py + dy + H) % H) * W + (px + dx + W) % W]; sw += v; sx += v * (px + dx); sy += v * (py + dy); }
  let x = sx / sw, y = sy / sw; if (x > W / 2) x -= W; if (y > H / 2) y -= H;
  return [x, y];
};
C.phaseShiftJS = function (prev, cur, W, H) { return C.phaseFromSpectra(C.spectrum(prev, W, H), C.spectrum(cur, W, H), W, H); };

// ---------------------------------------------------------------- признаки патча (чистый JS)
const SE11 = (() => { const o = []; for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++)
  if ((dx * dx) / 30.25 + (dy * dy) / 30.25 <= 1.0001) o.push([dx, dy]); return o; })();
function morph(g, W, H, op) { // op: 0 erode, 1 dilate; граница — повтор
  const o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = op ? -1e9 : 1e9;
    for (const [dx, dy] of SE11) {
      const X = Math.min(W - 1, Math.max(0, x + dx)), Y = Math.min(H - 1, Math.max(0, y + dy));
      const q = g[Y * W + X]; if (op ? q > v : q < v) v = q;
    }
    o[y * W + x] = v;
  }
  return o;
}
function median(arr) { const a = Array.from(arr).sort((p, q) => p - q); return a[a.length >> 1]; }

C.features = function (P, off) { // P: Uint8Array, 24*24*3 RGB начиная с off
  off = off || 0;
  const N = 24, g = new Float32Array(N * N), rgb = [new Float32Array(N * N), new Float32Array(N * N), new Float32Array(N * N)];
  for (let i = 0; i < N * N; i++) {
    const r = P[off + i * 3], gg = P[off + i * 3 + 1], b = P[off + i * 3 + 2];
    rgb[0][i] = r; rgb[1][i] = gg; rgb[2][i] = b;
    g[i] = Math.round(0.299 * r + 0.587 * gg + 0.114 * b);
  }
  const border = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (x < 2 || y < 2 || x >= N - 2 || y >= N - 2) border.push(g[y * N + x]);
  const bg = median(border);
  const gn = g.map(v => (v - bg) / 40);
  const samp = (x, y) => {
    x = Math.min(N - 1.001, Math.max(0, x)); y = Math.min(N - 1.001, Math.max(0, y));
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const i = y0 * N + x0;
    return gn[i] * (1 - fx) * (1 - fy) + gn[i + 1] * fx * (1 - fy) + gn[i + N] * (1 - fx) * fy + gn[i + N + 1] * fx * fy;
  };
  const NR = 12, NT = 32, pol = [];
  for (let t = 0; t < NT; t++) { const row = []; const an = 2 * Math.PI * t / NT;
    for (let r = 0; r < NR; r++) { const rr = (r + 0.5) * 9 / NR; row.push(samp(12 + rr * Math.cos(an), 12 + rr * Math.sin(an))); }
    pol.push(row); }
  const f = [];
  for (let h = 0; h < 5; h++) for (let r = 0; r < NR; r++) {
    let re = 0, im = 0; for (let t = 0; t < NT; t++) { const a = -2 * Math.PI * h * t / NT; re += pol[t][r] * Math.cos(a); im += pol[t][r] * Math.sin(a); }
    f.push(Math.hypot(re, im) / NT);
  }
  for (let r = 0; r < NR; r++) { let s = 0; for (let t = 0; t < NT; t++) s += Math.abs(pol[t][r]); f.push(s / NT); }
  // цвет по кольцам
  const rr = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) rr[y * N + x] = Math.hypot(x - 12, y - 12);
  const bgc = [0, 1, 2].map(c => median(rgb[c].filter((_, i) => rr[i] > 10)));
  for (const [lo, hi] of [[0, 2], [2, 4], [4, 6.5]]) {
    for (let c = 0; c < 3; c++) {
      let s = 0, s2 = 0, n = 0;
      for (let i = 0; i < N * N; i++) if (rr[i] >= lo && rr[i] < hi) { s += rgb[c][i]; s2 += rgb[c][i] * rgb[c][i]; n++; }
      const m = s / n; f.push((m - bgc[c]) / 40); f.push(Math.sqrt(Math.max(0, s2 / n - m * m)) / 40);
    }
  }
  // форма по карте контраста патча
  const er = morph(g, N, N, 0), di = morph(g, N, N, 1);
  const op = morph(er, N, N, 1), cl = morph(di, N, N, 0);
  const s = new Float32Array(N * N); let smax = 0, sc = 0, nc = 0;
  for (let i = 0; i < N * N; i++) { s[i] = (cl[i] - g[i]) + 0.7 * (g[i] - op[i]); if (s[i] > smax) smax = s[i]; if (rr[i] < 4) { sc += s[i]; nc++; } }
  for (const th of [15, 30, 50]) {
    const lab = new Int32Array(N * N); let ncomp = 0, best = 0, bestA = 0; const areas = [0];
    for (let i = 0; i < N * N; i++) if (s[i] > th && !lab[i]) {
      ncomp++; let a = 0; const st = [i]; lab[i] = ncomp;
      while (st.length) { const j = st.pop(); a++; const x = j % N, y = (j / N) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= N || Y >= N) continue; const q = Y * N + X; if (s[q] > th && !lab[q]) { lab[q] = ncomp; st.push(q); } } }
      areas.push(a); if (a > bestA) { bestA = a; best = ncomp; }
    }
    if (!ncomp) { f.push(0, 0, 0, 0, 0, 0); continue; }
    const k = lab[12 * N + 12] || best;
    let n = 0, mx = 0, my = 0; for (let i = 0; i < N * N; i++) if (lab[i] === k) { n++; mx += i % N; my += (i / N) | 0; }
    mx /= n; my /= n; let cxx = 1 / 12, cyy = 1 / 12, cxy = 0;
    for (let i = 0; i < N * N; i++) if (lab[i] === k) { const dx = i % N - mx, dy = ((i / N) | 0) - my; cxx += dx * dx / n; cyy += dy * dy / n; cxy += dx * dy / n; }
    const tr = cxx + cyy, dd = Math.sqrt(Math.max(0, (cxx - cyy) ** 2 / 4 + cxy * cxy));
    const maj = 4 * Math.sqrt(tr / 2 + dd), mnr = 4 * Math.sqrt(Math.max(1e-6, tr / 2 - dd));
    f.push(n / 25, maj / 5, mnr / 5, maj / mnr, n / (Math.PI / 4 * maj * mnr), ncomp / 5);
  }
  f.push(smax / 50, sc / nc / 25);
  return f;
};

// ---------------------------------------------------------------- классификатор (деревья HGB)
C.predictProba = function (model, x) {
  let raw = model.baseline;
  for (const t of model.trees) {
    let i = 0;
    while (!t.leaf[i]) i = (x[t.feat[i]] <= t.thr[i]) ? t.left[i] : t.right[i];
    raw += t.val[i];
  }
  return 1 / (1 + Math.exp(-raw));
};

// ---------------------------------------------------------------- трекинг
C.Tracker = function (gatePx, maxGap) {
  this.gate = gatePx; this.maxGap = maxGap; this.active = []; this.all = []; this.nextId = 0;
};
C.Tracker.prototype.breakAll = function () { this.active = []; };
C.Tracker.prototype.step = function (fr, pts) { // pts: [[xw,yw],...] мировые координаты
  const ids = new Int32Array(pts.length).fill(-1), act = this.active, g2 = this.gate * this.gate;
  if (act.length && pts.length) {
    // сетка-хэш для кандидатов
    const cell = this.gate, map = new Map();
    pts.forEach((p, j) => { const key = Math.floor(p[0] / cell) + ',' + Math.floor(p[1] / cell);
      (map.get(key) || map.set(key, []).get(key)).push(j); });
    const pairs = [];
    act.forEach((t, ti) => {
      const n = t.f.length; let px = t.x[n - 1], py = t.y[n - 1];
      if (n >= 2) { const dt = t.f[n - 1] - t.f[n - 2], k = fr - t.f[n - 1];
        px += 0.6 * (t.x[n - 1] - t.x[n - 2]) / dt * k; py += 0.6 * (t.y[n - 1] - t.y[n - 2]) / dt * k; }
      const cx = Math.floor(px / cell), cy = Math.floor(py / cell);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const l = map.get((cx + a) + ',' + (cy + b)); if (!l) continue;
        for (const j of l) { const d = (pts[j][0] - px) ** 2 + (pts[j][1] - py) ** 2; if (d <= g2) pairs.push([d, ti, j]); }
      }
    });
    pairs.sort((p, q) => p[0] - q[0]);
    const usedT = new Uint8Array(act.length);
    for (const [, ti, j] of pairs) {
      if (usedT[ti] || ids[j] >= 0) continue;
      usedT[ti] = 1; const t = act[ti]; t.f.push(fr); t.x.push(pts[j][0]); t.y.push(pts[j][1]); t.det.push(j); t.miss = 0; ids[j] = t.id;
    }
  }
  const keep = [];
  for (const t of act) { if (t.f[t.f.length - 1] !== fr) t.miss++; if (t.miss <= this.maxGap) keep.push(t); }
  for (let j = 0; j < pts.length; j++) if (ids[j] < 0) {
    const t = { id: this.nextId++, f: [fr], x: [pts[j][0]], y: [pts[j][1]], det: [j], miss: 0 };
    ids[j] = t.id; keep.push(t); this.all.push(t);
  }
  this.active = keep;
  return ids;
};

// ---------------------------------------------------------------- кинематика
function smooth(a, w) {
  w = w || 5; if (a.length < w) return a.slice(); const p = w >> 1, o = new Array(a.length);
  for (let i = 0; i < a.length; i++) { let s = 0; for (let k = -p; k <= p; k++) s += a[Math.min(a.length - 1, Math.max(0, i + k))]; o[i] = s / w; }
  return o;
}
C.kinematics = function (t, fps, um, opt) {
  const f0 = t.f[0], f1 = t.f[t.f.length - 1], n = f1 - f0 + 1; if (n < 3) return null;
  const x = new Array(n), y = new Array(n); let j = 0;
  for (let i = 0; i < n; i++) { const fr = f0 + i; while (t.f[j + 1] !== undefined && t.f[j + 1] <= fr) j++;
    if (t.f[j] === fr || j === t.f.length - 1) { x[i] = t.x[j] * um; y[i] = t.y[j] * um; }
    else { const a = (fr - t.f[j]) / (t.f[j + 1] - t.f[j]); x[i] = (t.x[j] + a * (t.x[j + 1] - t.x[j])) * um; y[i] = (t.y[j] + a * (t.y[j + 1] - t.y[j])) * um; } }
  const T = (n - 1) / fps;
  let vcl = 0; for (let i = 1; i < n; i++) vcl += Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]); vcl /= T;
  const xs = smooth(x), ys = smooth(y);
  let vap = 0; for (let i = 1; i < n; i++) vap += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]); vap /= T;
  const vsl = Math.hypot(x[n - 1] - x[0], y[n - 1] - y[0]) / T;
  const w = Math.max(2, Math.round(opt.psWindowS * fps)); let ps;
  if (n > w) { const d = []; for (let i = 0; i + w < n; i++) d.push(Math.hypot(xs[i + w] - xs[i], ys[i + w] - ys[i]) / (w / fps)); ps = median(d); }
  else ps = Math.hypot(xs[n - 1] - xs[0], ys[n - 1] - ys[0]) / T;
  let alh = 0, rx = [1e9, -1e9], ry = [1e9, -1e9];
  for (let i = 0; i < n; i++) { const dx = x[i] - xs[i], dy = y[i] - ys[i]; alh += Math.hypot(dx, dy);
    rx = [Math.min(rx[0], dx), Math.max(rx[1], dx)]; ry = [Math.min(ry[0], dy), Math.max(ry[1], dy)]; }
  alh = 2 * alh / n;
  let cross = 0, prev = 0;
  for (let i = 0; i < n; i++) { const gx = xs[Math.min(n - 1, i + 1)] - xs[Math.max(0, i - 1)], gy = ys[Math.min(n - 1, i + 1)] - ys[Math.max(0, i - 1)];
    const sg = Math.sign(gx * (y[i] - ys[i]) - gy * (x[i] - xs[i])); if (sg) { if (prev && sg !== prev) cross++; prev = sg; } }
  return { id: t.id, f0, n, dur: T, vcl, vap, vsl, ps, lin: vcl ? vsl / vcl : 0, str: vap ? vsl / vap : 0, wob: vcl ? vap / vcl : 0,
    alh, bcf: cross / 2 / T, jit: Math.hypot(rx[1] - rx[0], ry[1] - ry[0]) };
};
C.classify = function (k, opt, vclImm) {
  if (k.ps >= opt.rapid) return 'a';
  if (k.ps >= opt.slow) return 'b';
  if (k.vcl >= vclImm || k.jit >= opt.immotileRangeUm * 2) return 'c';
  return 'd';
};

// ---------------------------------------------------------------- последовательный анализатор
/* Использование: const A = new C.Analyzer(fps, W, H, opt); для каждого кадра по порядку A.add(fr, frameResult, shift);
   затем A.finish(model) -> результат. */
C.Analyzer = function (fps, W, H, opt) {
  this.opt = Object.assign({}, C.DEFAULTS, opt || {});
  this.fps = fps; this.W = W; this.H = H;
  this.cum = [0, 0]; this.frames = []; this.pitches = []; this.counting = []; this.patchFrames = new Map();
  this.tracker = null; this.umGuess = this.opt.umPerPx || 0.33;
};
C.Analyzer.prototype.add = function (fr, R, shift) {
  const o = this.opt, mag = Math.hypot(shift[0], shift[1]);
  this.cum[0] += shift[0]; this.cum[1] += shift[1];
  const cum = this.cum.slice();
  if (R && R.pitch) { this.pitches.push(R.pitch); if (!o.umPerPx) this.umGuess = o.gridPitchUm / median(this.pitches); }
  if (!this.tracker) this.tracker = new C.Tracker(o.linkGateUm / this.umGuess, o.maxGap);
  if (!R || mag > o.maxShiftPx) { this.tracker.breakAll(); this.frames.push({ fr, mag, cum, dets: null, ids: null, still: false }); return; }
  this.tracker.gate = o.linkGateUm / this.umGuess;
  const pts = R.dets.map(d => [d[0] - cum[0], d[1] - cum[1]]);
  const ids = this.tracker.step(fr, pts);
  const still = mag < o.stillShiftPx;
  this.frames.push({ fr, mag, cum, dets: R.dets, ids, still });
  if (R.patches) this.patchFrames.set(fr, R.patches);
  if (still && R.patches) this.counting.push({ fr, free: R.free });
};
C.Analyzer.prototype.finish = function (model) {
  const o = this.opt, fps = this.fps, frames = this.frames;
  const byFr = new Map(frames.map(f => [f.fr, f]));
  let um, calib;
  if (o.umPerPx) { um = o.umPerPx; calib = 'задан вручную'; }
  else if (this.pitches.length) { const p = median(this.pitches); um = o.gridPitchUm / p; calib = `по сетке камеры: шаг ${p.toFixed(1)} px = ${o.gridPitchUm} мкм`; }
  else { um = 0.33; calib = 'сетка не найдена, принято 0,33 мкм/px (проверьте)'; }
  const tracks = this.tracker ? this.tracker.all : [];
  const minN = Math.max(5, Math.round(o.minTrackS * fps));
  const kin = new Map();
  for (const t of tracks) if (t.f.length >= minN) { const k = C.kinematics(t, fps, um, o); if (k) kin.set(t.id, k); }
  const slowV = []; for (const k of kin.values()) if (k.ps < 2) slowV.push(k.vcl);
  const noise = slowV.length > 10 ? median(slowV) : 5;
  const vclImm = Math.max(8, 1.8 * noise);
  for (const k of kin.values()) k.cls = C.classify(k, o, vclImm);
  // вероятность «головка» для неподвижных треков и детекций кадров подсчёта
  const tmap = new Map(tracks.map(t => [t.id, t]));
  const probCache = new Map();
  const probOf = (fr, j) => { const key = fr * 100000 + j; if (probCache.has(key)) return probCache.get(key);
    const P = this.patchFrames.get(fr); const p = P ? C.predictProba(model, C.features(P, j * 1728)) : 0.5; probCache.set(key, p); return p; };
  for (const [id, k] of kin) {
    if (k.cls === 'a' || k.cls === 'b') { k.p = 1; k.sperm = true; continue; }
    const t = tmap.get(id), ps = [];
    for (let i = 0; i < t.f.length; i++) if (this.patchFrames.has(t.f[i])) ps.push(probOf(t.f[i], t.det[i]));
    k.p = ps.length ? ps.reduce((a, b) => a + b) / ps.length : 0.5; k.sperm = k.p >= o.headProb;
  }
  const shortSpeed = id => { const t = tmap.get(id); if (!t || t.f.length < 4) return 0;
    return Math.hypot(t.x[t.x.length - 1] - t.x[0], t.y[t.y.length - 1] - t.y[0]) / (t.f[t.f.length - 1] - t.f[0]) * fps * um; };
  // концентрация
  const kc = o.dilution / (um * um * o.chamberDepthUm * 1e-12) / 1e6;
  const fieldRows = [];
  for (const c of this.counting) {
    const F = byFr.get(c.fr); let n = 0;
    F.dets.forEach((d, j) => { const id = F.ids[j], k = kin.get(id); let ok;
      if (k) ok = k.sperm; else if (shortSpeed(id) > 10) ok = true; else ok = probOf(c.fr, j) >= o.headProb;
      if (ok) n++; });
    fieldRows.push([c.fr, n, F.dets.length, c.free]);
  }
  let conc = NaN, concRaw = NaN, ci = [NaN, NaN], nf = 0, perSq = NaN, meanPerFrame = NaN;
  if (fieldRows.length) {
    const sum = (i) => fieldRows.reduce((a, r) => a + r[i], 0);
    conc = sum(1) / sum(3) * kc; concRaw = sum(2) / sum(3) * kc;
    perSq = sum(1) / (sum(3) * um * um / (o.gridPitchUm ** 2)); meanPerFrame = sum(1) / fieldRows.length;
    // поля зрения — между ними столик сдвинули более чем на ~150 px
    const groups = []; let g = [fieldRows[0]], last = fieldRows[0][0];
    const magAt = new Map(frames.map(f => [f.fr, f.mag]));
    for (let i = 1; i < fieldRows.length; i++) {
      let moved = 0; for (let q = last + 1; q <= fieldRows[i][0]; q++) moved += magAt.get(q) || 0;
      if (moved > 150) { groups.push(g); g = []; } g.push(fieldRows[i]); last = fieldRows[i][0];
    }
    groups.push(g); nf = groups.length;
    const fc = groups.map(G => G.reduce((a, r) => a + r[1], 0) / G.reduce((a, r) => a + r[3], 0) * kc);
    if (nf > 1) { const m = fc.reduce((a, b) => a + b) / nf; const sd = Math.sqrt(fc.reduce((a, b) => a + (b - m) ** 2, 0) / (nf - 1));
      const se = sd / Math.sqrt(nf); ci = [conc - 1.96 * se, conc + 1.96 * se]; }
  }
  // подвижность (вес — число кадров трека)
  const w = { a: 0, b: 0, c: 0, d: 0 }, ntr = { a: 0, b: 0, c: 0, d: 0 }; let debris = 0;
  for (const k of kin.values()) { if (k.sperm) { w[k.cls] += k.n; ntr[k.cls]++; } else debris++; }
  const tw = w.a + w.b + w.c + w.d, fr_ = c => tw ? 100 * w[c] / tw : NaN;
  const who6 = { a: fr_('a'), b: fr_('b'), c: fr_('c'), d: fr_('d') };
  who6.progressive = who6.a + who6.b; who6.total = who6.a + who6.b + who6.c;
  const who5 = { PR: who6.progressive, NP: who6.c, IM: who6.d, total: who6.total };
  const meanOf = (key, cls) => { const v = []; for (const k of kin.values()) if (k.sperm && cls.includes(k.cls)) v.push(k[key]);
    return v.length ? v.reduce((a, b) => a + b) / v.length : NaN; };
  const kinMotile = {}; for (const q of ['vcl', 'vsl', 'vap', 'lin', 'str', 'wob', 'alh', 'bcf']) kinMotile[q] = meanOf(q, 'abc');
  const psHist = new Array(30).fill(0); for (const k of kin.values()) if (k.sperm) psHist[Math.min(29, Math.floor(k.ps / 2))]++;
  const res = { fps, frames: frames.length, width: this.W, height: this.H, duration: frames.length / fps, um, calib,
    framesTracked: frames.filter(f => f.dets).length, framesCounted: fieldRows.length, fields: nf, meanPerFrame,
    conc, concRaw, ci, perSq, who6, who5, kinMotile, psHist, tracksByClass: ntr, debris, vclImm,
    sperm: Object.values(ntr).reduce((a, b) => a + b, 0) };
  if (o.volumeMl) { res.volume = o.volumeMl; res.total = conc * o.volumeMl; res.totalProg = res.total * who6.progressive / 100; res.totalMotile = res.total * who6.total / 100; }
  // для наложения на видео: по кадру — [x,y,класс]
  const overlay = new Map();
  for (const F of frames) { if (!F.dets) continue; const arr = [];
    F.dets.forEach((d, j) => { const k = kin.get(F.ids[j]); arr.push([d[0], d[1], k ? (k.sperm ? k.cls : 'x') : '', F.ids[j]]); });
    overlay.set(F.fr, arr); }
  res._overlay = overlay; res._frames = frames; res._tracks = tmap; res._kin = kin;
  return res;
};

if (typeof module !== 'undefined' && module.exports) module.exports = C; else root.SpermCore = C;
})(typeof self !== 'undefined' ? self : this);
