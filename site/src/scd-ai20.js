// ─── Нейросеть для SCD-теста ×20: CenterNet + ResNet-18 (центр ядра, малая ось, гало) ──
// Обучена на 130 полях SCD (объектив ×20, окраска Райт-Гимза, 3072×2048; CC BY 4.0), код BSD-3.
// Для каждого сперматозоида модель возвращает центр, малую ось головки и толщину гало;
// отношение гало / малая ось (Rhr) классифицируется по критериям Fernández.
// Запуск в браузере через ONNX Runtime Web, модель лежит рядом с сайтом (models/).
const SCD_AI20 = (() => {
  const IN = 512, PAD = 64, ST = IN - 2 * PAD, DOWN = 4, THR = 0.3, REF = 3072;
  let session = null, loading = null;
  function load(onProgress) {
    if (session) return Promise.resolve(session);
    return (loading ||= (async () => {
      const ort = await BOPASI_NN.setup(window);
      const buf = await BOPASI_NN.bytes('scd-centernet-r18.onnx', onProgress);
      session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      return session;
    })().catch((e) => { loading = null; throw e; }));
  }

  // классы Fernández по относительной толщине гало (гало / малая ось ядра)
  const classOf = (r) => (r >= 1 ? 'large' : r > 1 / 3 ? 'medium' : r > 0.05 ? 'small' : 'none');

  // canvas — исходный снимок; field — круг поля зрения (для снимков через окуляр) в координатах canvas.
  // Масштаб подбирается так, чтобы поле соответствовало кадру 3072 px, как при обучении.
  async function detect(canvas, opt = {}) {
    const ses = await load(opt.onProgress);
    const ort = window.ort;
    const fld = opt.field;
    // область анализа: поле зрения (окуляр) или весь кадр
    let ox = 0, oy = 0, ow = canvas.width, oh = canvas.height, k;
    if (fld) {
      ox = Math.max(0, Math.floor(fld.cx - fld.r)); oy = Math.max(0, Math.floor(fld.cy - fld.r));
      ow = Math.min(canvas.width, Math.ceil(fld.cx + fld.r)) - ox; oh = Math.min(canvas.height, Math.ceil(fld.cy + fld.r)) - oy;
      k = (REF * 0.9) / (2 * fld.r);
    } else k = REF / Math.max(ow, oh);
    k *= opt.scale || 1;
    const W = Math.round(ow * k), H = Math.round(oh * k);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high';
    g.drawImage(canvas, ox, oy, ow, oh, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    // серый — те же веса, что в исходном коде модели
    const gray = new Float32Array(W * H);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = Math.round(0.114 * d[p] + 0.587 * d[p + 1] + 0.2989 * d[p + 2]);
    const inField = fld ? (x, y) => Math.hypot(x / k + ox - fld.cx, y / k + oy - fld.cy) < fld.r * 0.98 : () => true;
    // сетка плиток 512 с перекрытием 64 и зеркальными полями
    const ch = Math.max(1, Math.ceil((W - 2 * PAD) / ST)), cv = Math.max(1, Math.ceil((H - 2 * PAD) / ST));
    let rw = ST * ch + 2 * PAD, rh = ST * cv + 2 * PAD;
    if ((rw - W) % 2) rw++; if ((rh - H) % 2) rh++;
    const pl = (rw - W) >> 1, pt = (rh - H) >> 1;
    const refl = (v, n) => { for (;;) { if (v < 0) v = -v - 1; else if (v >= n) v = 2 * n - v - 1; else return v; } };
    const tile = new Float32Array(IN * IN), dets = [];
    const t0 = performance.now(); let done = 0;
    for (let tx = 0; tx < ch; tx++) for (let ty = 0; ty < cv; ty++) {
      const x0 = tx * ST - pl, y0 = ty * ST - pt;
      // плитка целиком вне поля зрения — пропускаем
      if (fld) {
        const fx = (fld.cx - ox) * k, fy = (fld.cy - oy) * k, ix0 = x0 + PAD, iy0 = y0 + PAD;
        const dx = Math.max(ix0 - fx, 0, fx - (ix0 + ST)), dy = Math.max(iy0 - fy, 0, fy - (iy0 + ST));
        if (Math.hypot(dx, dy) > fld.r * k) { done++; continue; }
      }
      let s = 0, s2 = 0;
      for (let y = 0; y < IN; y++) { const yy = refl(y0 + y, H) * W; for (let x = 0; x < IN; x++) { const v = gray[yy + refl(x0 + x, W)]; tile[y * IN + x] = v; s += v; } }
      const m = s / tile.length; for (let i = 0; i < tile.length; i++) { const q = tile[i] - m; s2 += q * q; }
      const sd = Math.sqrt(s2 / tile.length) || 1; for (let i = 0; i < tile.length; i++) tile[i] = (tile[i] - m) / sd;
      const res = await ses.run({ [ses.inputNames[0]]: new ort.Tensor('float32', tile, [1, 1, IN, IN]) });
      const o = res[ses.outputNames[0]].data, K = res[ses.outputNames[0]].dims[2];
      const at = (r, i) => o[r * K + i];
      // строки выхода: 0 уверенность, 2 y, 3 x, 4–5 вектор большой оси, 6 малая ось, 7 поперечник с гало, 8–9 смещение
      for (let i = 0; i < K; i++) {
        const sc = at(0, i); if (sc <= THR) continue;
        const gx = at(3, i), gy = at(2, i);
        const lx = gx * DOWN + at(8, i), ly = gy * DOWN + at(9, i);
        // каждая клетка учитывается в той плитке, где её центр во внутренней зоне (без дублей на перекрытии)
        const lo = (t) => (t === 0 ? -1e9 : PAD), hi = (t, n) => (t === n - 1 ? 1e9 : IN - PAD);
        if (lx < lo(tx) || lx >= hi(tx, ch) || ly < lo(ty) || ly >= hi(ty, cv)) continue;
        const px = x0 + lx, py = y0 + ly;
        if (px < 0 || py < 0 || px >= W || py >= H || !inField(px, py)) continue;
        const minl = at(6, i) * DOWN, halo = at(7, i) * DOWN;
        if (minl <= 0) continue;
        dets.push({ px, py, sc, minl, halo, rhr: (halo - minl) / (2 * minl), maj: Math.hypot(at(4, i), at(5, i)) * DOWN, ang: Math.atan2(at(5, i), at(4, i)) });
      }
      done++; opt.onTile?.(done / (ch * cv));
    }
    // страховка от дублей: близкие центры (меньше малой оси) — оставляем более уверенный
    dets.sort((a, b) => b.sc - a.sc);
    const keep = [];
    for (const dd of dets) if (!keep.some((q) => Math.hypot(q.px - dd.px, q.py - dd.py) < Math.max(4, Math.min(q.minl, dd.minl) * 0.8))) keep.push(dd);
    const cells = keep.map((q) => {
      // выходы модели — полуоси (малая и большая), поэтому диаметры = ×2
      const minor = (2 * q.minl) / k, x = q.px / k + ox, y = q.py / k + oy;
      return { id: 'n20_' + Math.round(x) + '_' + Math.round(y), x, y, major: Math.max(minor, (2 * q.maj) / k), minor, angle: q.ang,
        halo: Math.max(0, q.rhr) * minor, rhr: q.rhr, conf: q.sc, cls: classOf(q.rhr), weak: false, overlap: false, area: Math.PI * minor * minor * 0.375 };
    });
    return { cells, ms: performance.now() - t0, tiles: ch * cv, k };
  }
  return { load, detect, classOf, ready: () => !!session };
})();

if (typeof window !== 'undefined') window.BOPASI_SCD_AI20 = SCD_AI20;
