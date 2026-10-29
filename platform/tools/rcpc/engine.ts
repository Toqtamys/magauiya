/* Физическая модель перевода между рельефным (RC/Хоффман) и фазовым контрастом.
 *
 * Идея. Рельефный контраст ≈ направленная производная оптической толщины L
 * вдоль направления тени θ:   RC ≈ 0.5 + k · ∂L/∂θ.
 * Фазовый контраст ≈ сама оптическая толщина L с характерным светлым ореолом
 * (светлая кайма по границам фаз), который в первом приближении есть
 * высокочастотная добавка:     PC ≈ L − halo·blur(L).
 *
 * Поэтому:
 *   RC → PC : интегрируем RC вдоль θ (устойчивый «протекающий» интегратор),
 *             получаем L, затем добавляем ореол.
 *   PC → RC : снимаем ореол (деконволюция нерезкой маской), получаем L,
 *             берём направленную производную вдоль θ.
 *
 * Всё приближённо и предназначено для визуализации и подготовки данных,
 * а не для измерений. Для фотореалистичного перевода конкретного микроскопа
 * дообучите CycleGAN (ссылка в карточке инструмента).
 */

export type Dir = 'rc2pc' | 'pc2rc';

export interface Params {
  dir: Dir;
  angleDeg: number;   // направление тени, градусы
  strength: number;   // 0..2 — сила эффекта
  halo: number;       // 0..1.5 — ореол фазового контраста
  haloRadius: number; // px — размер ореола
  leak: number;       // 0.80..0.995 — «утечка» интегратора (больше = длиннее интегрирование)
  invert: boolean;    // инверсия знака рельефа / позитивный-негативный ФК
}

export interface Field { w: number; h: number; d: Float32Array }

export function luma(img: ImageData): Field {
  const { width: w, height: h, data } = img;
  const d = new Float32Array(w * h);
  for (let i = 0, p = 0; i < d.length; i++, p += 4) d[i] = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
  return { w, h, d };
}

function stats(d: Float32Array) {
  let m = 0; for (let i = 0; i < d.length; i++) m += d[i]; m /= d.length;
  let v = 0; for (let i = 0; i < d.length; i++) { const x = d[i] - m; v += x * x; }
  return { m, sd: Math.sqrt(v / d.length) || 1 };
}

/** Горизонтальный и вертикальный градиент (Собель, нормированный). */
function gradients(f: Field) {
  const { w, h, d } = f;
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
  const at = (x: number, y: number) => d[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    gx[i] = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 8;
    gy[i] = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 8;
  }
  return { gx, gy };
}

/** Оценка направления тени: ищем θ, максимизирующий |асимметрию| направленной производной. */
export function estimateAngle(f: Field): number {
  const small = downscale(f, 220);
  const { gx, gy } = gradients(small);
  let best = 0, bestScore = -1;
  for (let a = 0; a < 180; a += 5) {
    const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
    let m = 0; const n = gx.length;
    for (let i = 0; i < n; i++) m += gx[i] * c + gy[i] * s;
    m /= n;
    let m2 = 0, m3 = 0;
    for (let i = 0; i < n; i++) { const x = gx[i] * c + gy[i] * s - m; m2 += x * x; m3 += x * x * x; }
    m2 /= n; m3 /= n;
    const skew = Math.abs(m3) / Math.pow(m2 + 1e-6, 1.5);
    if (skew > bestScore) { bestScore = skew; best = a; }
  }
  // знак: тень обычно светлая с одной стороны → ориентируем по среднему градиенту
  const c = Math.cos((best * Math.PI) / 180), s = Math.sin((best * Math.PI) / 180);
  let m = 0; for (let i = 0; i < gx.length; i++) m += gx[i] * c + gy[i] * s;
  return m < 0 ? (best + 180) % 360 : best;
}

function downscale(f: Field, maxSide: number): Field {
  const scale = Math.min(1, maxSide / Math.max(f.w, f.h));
  if (scale >= 1) return f;
  const w = Math.max(1, Math.round(f.w * scale)), h = Math.max(1, Math.round(f.h * scale));
  const d = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.floor(x / scale), sy = Math.floor(y / scale);
    d[y * w + x] = f.d[Math.min(f.h - 1, sy) * f.w + Math.min(f.w - 1, sx)];
  }
  return { w, h, d };
}

/** Быстрое приближённое гауссово размытие (3 прохода box). */
export function blur(f: Field, radius: number): Field {
  let cur = f.d;
  const r = Math.max(1, Math.round(radius));
  for (let pass = 0; pass < 3; pass++) { cur = boxH(cur, f.w, f.h, r); cur = boxV(cur, f.w, f.h, r); }
  return { w: f.w, h: f.h, d: cur };
}
function boxH(d: Float32Array, w: number, h: number, r: number) {
  const o = new Float32Array(d.length), n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0; const row = y * w;
    for (let x = -r; x <= r; x++) s += d[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { o[row + x] = s / n; const add = Math.min(w - 1, x + r + 1), sub = Math.max(0, x - r); s += d[row + add] - d[row + sub]; }
  }
  return o;
}
function boxV(d: Float32Array, w: number, h: number, r: number) {
  const o = new Float32Array(d.length), n = 2 * r + 1;
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += d[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { o[y * w + x] = s / n; const add = Math.min(h - 1, y + r + 1), sub = Math.max(0, y - r); s += d[add * w + x] - d[sub * w + x]; }
  }
  return o;
}

/** Направленный «протекающий» интегратор: out = in + leak·out(−θ, bilinear). Устойчивый, без дрейфа. */
function directionalIntegrate(src: Float32Array, w: number, h: number, angleDeg: number, leak: number): Float32Array {
  const a = (angleDeg * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const out = new Float32Array(w * h);
  const sample = (buf: Float32Array, x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return 0;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * w + x0;
    return buf[i] * (1 - fx) * (1 - fy) + buf[i + 1] * fx * (1 - fy) + buf[i + w] * (1 - fx) * fy + buf[i + w + 1] * fx * fy;
  };
  // порядок обхода вдоль направления, чтобы предыдущий сэмпл уже был вычислен
  const xForward = dx >= 0, yForward = dy >= 0;
  for (let yy = 0; yy < h; yy++) {
    const y = yForward ? yy : h - 1 - yy;
    for (let xx = 0; xx < w; xx++) {
      const x = xForward ? xx : w - 1 - xx;
      const prev = sample(out, x - dx, y - dy);
      out[y * w + x] = src[y * w + x] + leak * prev;
    }
  }
  return out;
}

/** Направленная производная ∂/∂θ. */
function directionalDerivative(f: Field, angleDeg: number): Float32Array {
  const { gx, gy } = gradients(f);
  const a = (angleDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const o = new Float32Array(gx.length);
  for (let i = 0; i < o.length; i++) o[i] = gx[i] * c + gy[i] * s;
  return o;
}

function normalize(d: Float32Array, lo = 0.02, hi = 0.98): Float32Array {
  const sorted = Float32Array.from(d).sort();
  const a = sorted[Math.floor(lo * (sorted.length - 1))], b = sorted[Math.floor(hi * (sorted.length - 1))];
  const r = b - a || 1, o = new Float32Array(d.length);
  for (let i = 0; i < d.length; i++) o[i] = Math.min(1, Math.max(0, (d[i] - a) / r));
  return o;
}

export function process(f: Field, p: Params): Field {
  const sign = p.invert ? -1 : 1;
  if (p.dir === 'rc2pc') {
    // RC → оптическая толщина (интегрирование) → фазовый контраст с ореолом
    const centered = new Float32Array(f.d.length);
    const { m } = stats(f.d);
    for (let i = 0; i < centered.length; i++) centered[i] = sign * (f.d[i] - m);
    let L = directionalIntegrate(centered, f.w, f.h, p.angleDeg, p.leak);
    // убрать низкочастотный дрейф
    const lf = blur({ w: f.w, h: f.h, d: L }, Math.max(f.w, f.h) / 6).d;
    for (let i = 0; i < L.length; i++) L[i] -= lf[i];
    const Ln = normalize(L);
    const halo = blur({ w: f.w, h: f.h, d: Ln }, p.haloRadius).d;
    const out = new Float32Array(L.length);
    for (let i = 0; i < out.length; i++) {
      const detail = Ln[i] - halo[i];
      out[i] = 0.5 + p.strength * (Ln[i] - 0.5) + p.halo * detail;
    }
    return { w: f.w, h: f.h, d: normalize(out, 0.01, 0.99) };
  }
  // PC → RC: снять ореол → направленная производная
  const haloField = blur(f, p.haloRadius).d;
  const L = new Float32Array(f.d.length);
  for (let i = 0; i < L.length; i++) L[i] = f.d[i] - p.halo * (f.d[i] - haloField[i]);
  const deriv = directionalDerivative({ w: f.w, h: f.h, d: L }, p.angleDeg);
  const { sd } = stats(deriv);
  const out = new Float32Array(deriv.length);
  for (let i = 0; i < out.length; i++) out[i] = 0.5 + sign * p.strength * (deriv[i] / (3 * sd));
  return { w: f.w, h: f.h, d: out.map((v) => Math.min(1, Math.max(0, v))) };
}

export function toImageData(f: Field): ImageData {
  const img = new ImageData(f.w, f.h);
  for (let i = 0, p = 0; i < f.d.length; i++, p += 4) {
    const v = Math.round(Math.min(1, Math.max(0, f.d[i])) * 255);
    img.data[p] = img.data[p + 1] = img.data[p + 2] = v; img.data[p + 3] = 255;
  }
  return img;
}
