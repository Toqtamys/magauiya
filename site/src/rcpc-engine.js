// ─── Движок RC ⇄ фазовый контраст (физическая модель) ──────────────────────
const RCPC = (() => {
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




function luma(img) {
  const { width: w, height: h, data } = img;
  const d = new Float32Array(w * h);
  for (let i = 0, p = 0; i < d.length; i++, p += 4) d[i] = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
  return { w, h, d };
}

function stats(d) {
  let m = 0; for (let i = 0; i < d.length; i++) m += d[i]; m /= d.length;
  let v = 0; for (let i = 0; i < d.length; i++) { const x = d[i] - m; v += x * x; }
  return { m, sd: Math.sqrt(v / d.length) || 1 };
}

/** Горизонтальный и вертикальный градиент (Собель, нормированный). */
function gradients(f) {
  const { w, h, d } = f;
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
  const at = (x, y) => d[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    gx[i] = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 8;
    gy[i] = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 8;
  }
  return { gx, gy };
}

/** Оценка направления тени.
 *  1) Ось: RC ≈ производная вдоль θ, поэтому энергия градиентов максимальна вдоль θ —
 *     главная ось тензора структуры даёт θ с точностью до 180°.
 *  2) Знак: интегрируем вдоль обоих вариантов; верный даёт яркие «купола» на ровном
 *     фоне (длинный верхний хвост распределения), неверный — тёмные «впадины». */
function estimateAngle(f) {
  const small = downscale(f, 256);
  const { w, h } = small;
  const { gx, gy } = gradients(small);
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < gx.length; i++) { sxx += gx[i] * gx[i]; syy += gy[i] * gy[i]; sxy += gx[i] * gy[i]; }
  const axis = 0.5 * Math.atan2(2 * sxy, sxx - syy) * 180 / Math.PI;
  const bg = median(small.d);
  const centered = new Float32Array(small.d.length);
  for (let i = 0; i < centered.length; i++) centered[i] = small.d[i] - bg;
  const domeScore = (deg) => {
    const L = directionalIntegrate(centered, w, h, deg, 0.99);
    const md = median(L);
    return (quantile(L, 0.98) - md) - (md - quantile(L, 0.02));
  };
  const a1 = (axis + 360) % 360, a2 = (axis + 180) % 360;
  return domeScore(a1) >= domeScore(a2) ? a1 : a2;
}

function downscale(f, maxSide) {
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
function blur(f, radius) {
  let cur = f.d;
  const r = Math.max(1, Math.round(radius));
  for (let pass = 0; pass < 3; pass++) { cur = boxH(cur, f.w, f.h, r); cur = boxV(cur, f.w, f.h, r); }
  return { w: f.w, h: f.h, d: cur };
}
function boxH(d, w, h, r) {
  const o = new Float32Array(d.length), n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0; const row = y * w;
    for (let x = -r; x <= r; x++) s += d[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { o[row + x] = s / n; const add = Math.min(w - 1, x + r + 1), sub = Math.max(0, x - r); s += d[row + add] - d[row + sub]; }
  }
  return o;
}
function boxV(d, w, h, r) {
  const o = new Float32Array(d.length), n = 2 * r + 1;
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += d[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { o[y * w + x] = s / n; const add = Math.min(h - 1, y + r + 1), sub = Math.max(0, y - r); s += d[add * w + x] - d[sub * w + x]; }
  }
  return o;
}

/** Направленный интегратор вдоль угла θ: L(n) = I(n)·ds + leak^ds · L(n − θ).
 *  Шаг ровно в 1 пиксель по доминирующей оси; предыдущая точка берётся линейной
 *  интерполяцией только из уже вычисленного столбца/строки — без потери энергии
 *  на диагоналях. */
function directionalIntegrate(src, w, h, angleDeg, leak) {
  const a = (angleDeg * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const out = new Float32Array(w * h);
  if (Math.abs(dx) >= Math.abs(dy)) {
    const sx = dx >= 0 ? 1 : -1, slope = dy / Math.abs(dx), ds = Math.hypot(1, slope), k = Math.pow(leak, ds);
    for (let c = 0; c < w; c++) {
      const x = sx > 0 ? c : w - 1 - c, px = x - sx;
      for (let y = 0; y < h; y++) {
        let prev = 0;
        if (px >= 0 && px < w) {
          const py = y - slope, y0 = Math.floor(py), t = py - y0;
          if (y0 >= 0 && y0 < h - 1) prev = out[y0 * w + px] * (1 - t) + out[(y0 + 1) * w + px] * t;
          else if (y0 === h - 1 && t < 1e-6) prev = out[y0 * w + px];
        }
        out[y * w + x] = src[y * w + x] * ds + k * prev;
      }
    }
  } else {
    const sy = dy >= 0 ? 1 : -1, slope = dx / Math.abs(dy), ds = Math.hypot(1, slope), k = Math.pow(leak, ds);
    for (let r = 0; r < h; r++) {
      const y = sy > 0 ? r : h - 1 - r, py = y - sy;
      for (let x = 0; x < w; x++) {
        let prev = 0;
        if (py >= 0 && py < h) {
          const pxf = x - slope, x0 = Math.floor(pxf), t = pxf - x0;
          if (x0 >= 0 && x0 < w - 1) prev = out[py * w + x0] * (1 - t) + out[py * w + x0 + 1] * t;
          else if (x0 === w - 1 && t < 1e-6) prev = out[py * w + x0];
        }
        out[y * w + x] = src[y * w + x] * ds + k * prev;
      }
    }
  }
  return out;
}

function median(d) {
  const step = Math.max(1, Math.floor(d.length / 20000)), s = [];
  for (let i = 0; i < d.length; i += step) s.push(d[i]);
  s.sort((x, y) => x - y); return s[s.length >> 1];
}
function quantile(d, q) {
  const step = Math.max(1, Math.floor(d.length / 20000)), s = [];
  for (let i = 0; i < d.length; i += step) s.push(d[i]);
  s.sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
}

/** Направленная производная ∂/∂θ. */
function directionalDerivative(f, angleDeg) {
  const { gx, gy } = gradients(f);
  const a = (angleDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const o = new Float32Array(gx.length);
  for (let i = 0; i < o.length; i++) o[i] = gx[i] * c + gy[i] * s;
  return o;
}

function normalize(d, lo = 0.02, hi = 0.98) {
  const sorted = Float32Array.from(d).sort();
  const a = sorted[Math.floor(lo * (sorted.length - 1))], b = sorted[Math.floor(hi * (sorted.length - 1))];
  const r = b - a || 1, o = new Float32Array(d.length);
  for (let i = 0; i < d.length; i++) o[i] = Math.min(1, Math.max(0, (d[i] - a) / r));
  return o;
}

function process(f, p) {
  const sign = p.invert ? -1 : 1;
  if (p.dir === 'rc2pc') {
    // RC → оптическая толщина (интегрирование) → фазовый контраст с ореолом
    const centered = new Float32Array(f.d.length);
    const bg = median(f.d);
    for (let i = 0; i < centered.length; i++) centered[i] = sign * (f.d[i] - bg);
    // длина интегрирования задаётся долей размера снимка → результат не зависит от разрешения
    const leak = p.leak ?? Math.exp(-1 / Math.max(1, (p.length ?? 0.75) * Math.max(f.w, f.h)));
    let L = directionalIntegrate(centered, f.w, f.h, p.angleDeg, leak);
    // убрать низкочастотный дрейф
    const lf = blur({ w: f.w, h: f.h, d: L }, Math.max(f.w, f.h) / 3).d;
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

function toImageData(f) {
  const img = new ImageData(f.w, f.h);
  for (let i = 0, p = 0; i < f.d.length; i++, p += 4) {
    const v = Math.round(Math.min(1, Math.max(0, f.d[i])) * 255);
    img.data[p] = img.data[p + 1] = img.data[p + 2] = v; img.data[p + 3] = 255;
  }
  return img;
}

  return { luma, estimateAngle, process, toImageData };
})();
