// ─── Нейросеть для SCD-теста: YOLOv8s-seg (сегментация клеток, 2 класса) ──────
// Модель: «Sperm chromatin dispersion microscopy image dataset for instance segmentation»
// (Ornelas Nande, Adel Domínguez, Mora Topete, Magdaleno Márquez, Aranguren, Valdivia-G, Sanchez; Zenodo, 2026, CC BY 4.0).
// Обучена на 2000 снимках, классы: 0 — фрагментирована, 1 — не фрагментирована. Архитектура YOLOv8 (Ultralytics, AGPL-3.0).
// Запуск в браузере через ONNX Runtime Web; файл модели и рантайм лежат рядом с сайтом (models/, ort/).
const SCD_AI = (() => {
  const SIZE = 1024, NC = 2, NM = 32, PROTO = 256;
  let session = null, loading = null;
  const base = () => (window.BOPASI_BASE || './');

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src)); document.head.append(s); });
  }
  // рантайм и модель грузятся один раз, по первому требованию
  function load(onProgress) {
    if (session) return Promise.resolve(session);
    return (loading ||= (async () => {
      if (location.protocol === 'file:') throw new Error('offline');
      if (!window.ort) await loadScript(base() + 'ort/ort.wasm.min.js');
      const ort = window.ort;
      ort.env.wasm.wasmPaths = new URL(base() + 'ort/', location.href).href;
      ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
      const r = await fetch(base() + 'models/scd-yolov8s-seg.onnx');
      if (!r.ok) throw new Error('model ' + r.status);
      const total = +r.headers.get('content-length') || 0, reader = r.body.getReader(), parts = []; let got = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; onProgress?.(total ? got / total : 0); }
      const buf = new Uint8Array(got); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
      session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      return session;
    })().catch((e) => { loading = null; throw e; }));
  }

  // вписываем снимок в квадрат 1024 с серыми полями (как при обучении)
  function letterbox(canvas) {
    const W = canvas.width, H = canvas.height, k = Math.min(SIZE / W, SIZE / H);
    const nw = Math.round(W * k), nh = Math.round(H * k), px = Math.floor((SIZE - nw) / 2), py = Math.floor((SIZE - nh) / 2);
    const c = document.createElement('canvas'); c.width = c.height = SIZE;
    const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = 'rgb(114,114,114)'; g.fillRect(0, 0, SIZE, SIZE);
    g.imageSmoothingQuality = 'high'; g.drawImage(canvas, px, py, nw, nh);
    const d = g.getImageData(0, 0, SIZE, SIZE).data, n = SIZE * SIZE, x = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) { x[i] = d[i * 4] / 255; x[n + i] = d[i * 4 + 1] / 255; x[2 * n + i] = d[i * 4 + 2] / 255; }
    return { x, k, px, py };
  }
  // перекрытие рамок: IoU и доля меньшей рамки внутри большей (одна клетка, найденная дважды вдоль хвоста)
  const overlap = (a, b) => {
    const w = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)), h = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
    const i = w * h, A = (a.x2 - a.x1) * (a.y2 - a.y1), B = (b.x2 - b.x1) * (b.y2 - b.y1);
    return { iou: i / (A + B - i + 1e-9), ios: i / (Math.min(A, B) + 1e-9) };
  };

  // разбор выхода: рамки + классы + коэффициенты масок → клетки с маской, центром и эллипсом
  function decode(out0, out1, lb, W, H, conf, iouThr) {
    const N = out0.dims[2], P = out0.data, pr = out1.data, cand = [];
    for (let j = 0; j < N; j++) {
      let best = 0, cls = 0;
      for (let c = 0; c < NC; c++) { const s = P[(4 + c) * N + j]; if (s > best) { best = s; cls = c; } }
      if (best < conf) continue;
      const cx = P[j], cy = P[N + j], w = P[2 * N + j], h = P[3 * N + j];
      cand.push({ j, cls, score: best, x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 });
    }
    cand.sort((a, b) => b.score - a.score);
    const keep = [];
    for (const c of cand) if (!keep.some((k) => { const o = overlap(k, c); return o.iou > iouThr || o.ios > 0.7; })) { keep.push(c); if (keep.length >= 300) break; }
    const s = PROTO / SIZE, cells = [];
    for (const d of keep) {
      const coef = new Float32Array(NM); for (let m = 0; m < NM; m++) coef[m] = P[(4 + NC + m) * N + d.j];
      const bx1 = Math.max(0, Math.floor(d.x1 * s)), by1 = Math.max(0, Math.floor(d.y1 * s)), bx2 = Math.min(PROTO - 1, Math.ceil(d.x2 * s)), by2 = Math.min(PROTO - 1, Math.ceil(d.y2 * s));
      let A = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0; const pts = [];
      for (let y = by1; y <= by2; y++) for (let x = bx1; x <= bx2; x++) {
        const px = x + 0.5, py = y + 0.5; if (px < d.x1 * s || px > d.x2 * s || py < d.y1 * s || py > d.y2 * s) continue;
        let v = 0; const o = y * PROTO + x; for (let m = 0; m < NM; m++) v += coef[m] * pr[m * PROTO * PROTO + o];
        if (v <= 0) continue;   // сигмоида > 0.5
        // координаты пикселя маски → координаты исходного снимка
        const ix = (px / s - lb.px) / lb.k, iy = (py / s - lb.py) / lb.k;
        A++; sx += ix; sy += iy; sxx += ix * ix; syy += iy * iy; sxy += ix * iy; pts.push(ix, iy);
      }
      const cx = ((d.x1 + d.x2) / 2 - lb.px) / lb.k, cy = ((d.y1 + d.y2) / 2 - lb.py) / lb.k;
      if (cx < 0 || cy < 0 || cx > W || cy > H) continue;
      const cell = { x: cx, y: cy, ai: d.cls === 0 ? 'frag' : 'ok', conf: d.score,
        box: [(d.x1 - lb.px) / lb.k, (d.y1 - lb.py) / lb.k, (d.x2 - lb.px) / lb.k, (d.y2 - lb.py) / lb.k] };
      if (A >= 3) {
        const mx = sx / A, my = sy / A, vxx = sxx / A - mx * mx, vyy = syy / A - my * my, vxy = sxy / A - mx * my;
        const tr2 = (vxx + vyy) / 2, dd = Math.sqrt(Math.max(0, tr2 * tr2 - (vxx * vyy - vxy * vxy)));
        Object.assign(cell, { x: mx, y: my, major: 4 * Math.sqrt(tr2 + dd), minor: 4 * Math.sqrt(Math.max(0, tr2 - dd)), angle: 0.5 * Math.atan2(2 * vxy, vxx - vyy), area: A / (s * s * lb.k * lb.k), mask: pts });
      } else {
        const bw = cell.box[2] - cell.box[0], bh = cell.box[3] - cell.box[1];
        Object.assign(cell, { major: Math.max(bw, bh), minor: Math.min(bw, bh), angle: bw >= bh ? 0 : Math.PI / 2, area: bw * bh * 0.78 });
      }
      cells.push(cell);
    }
    return cells;
  }

  async function detect(canvas, opt = {}) {
    const ses = await load(opt.onProgress);
    const lb = letterbox(canvas);
    const t0 = performance.now();
    const res = await ses.run({ [ses.inputNames[0]]: new window.ort.Tensor('float32', lb.x, [1, 3, SIZE, SIZE]) });
    const [o0, o1] = ses.outputNames.map((n) => res[n]);
    const cells = decode(o0, o1, lb, canvas.width, canvas.height, opt.conf ?? 0.1, opt.iou ?? 0.5);
    return { cells, ms: performance.now() - t0 };
  }

  // клетки нейросети → классы инструмента: «не фрагментирована» / «фрагментирована»
  function toCells(aiCells) {
    return aiCells.map((a) => ({ ...a, id: 'ai' + Math.round(a.x) + '_' + Math.round(a.y), cls: a.ai === 'frag' ? 'frag' : 'ok', halo: 0, weak: false, overlap: false }));
  }

  return { load, detect, toCells, ready: () => !!session };
})();

if (typeof window !== 'undefined') window.BOPASI_SCD_AI = SCD_AI;   // для проверки из консоли
