// ─── Загрузка нейросетей: ONNX Runtime Web + файлы моделей ─────────────────────
// На сайте всё берётся из соседних папок ort/ и models/.
// В полной офлайн-версии (BOPASI-full.html) рантайм и модели встроены в сам файл:
// <script type="application/x-gzip-base64" data-nn="имя"> — сжатые gzip и закодированные base64.
const BOPASI_NN = (() => {
  const base = () => (window.BOPASI_BASE || './');
  const el = (name) => document.querySelector(`script[data-nn="${name}"]`);
  const embedded = () => !!el('ort.wasm.min.js');
  const cache = new Map();
  // встроенный файл → байты (base64 → gzip → исходник)
  function unpack(name) {
    if (!cache.has(name)) cache.set(name, (async () => {
      const node = el(name); if (!node) throw new Error('нет встроенного файла ' + name);
      const gz = await (await fetch('data:application/octet-stream;base64,' + node.textContent.trim())).blob();
      return new Uint8Array(await new Response(gz.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    })());
    return cache.get(name);
  }
  const text = async (name) => new TextDecoder().decode(await unpack(name));
  let mjsUrl = null;
  // рантайм в окне win (сайт, офлайн-файл или iframe приложения)
  async function setup(win = window) {
    if (embedded()) {
      if (!win.ort) { const s = win.document.createElement('script'); s.textContent = await text('ort.wasm.min.js'); win.document.head.append(s); }
      mjsUrl ||= URL.createObjectURL(new Blob([await text('ort-wasm-simd-threaded.mjs')], { type: 'text/javascript' }));
      win.ort.env.wasm.wasmPaths = { mjs: mjsUrl };
      win.ort.env.wasm.wasmBinary = new win.Uint8Array(await unpack('ort-wasm-simd-threaded.wasm'));   // копия в «мир» окна (для iframe)
      win.ort.env.wasm.numThreads = 1;
      return win.ort;
    }
    if (location.protocol === 'file:') throw new Error('offline');
    if (!win.ort) await new Promise((res, rej) => { const s = win.document.createElement('script'); s.src = new URL(base() + 'ort/ort.wasm.min.js', location.href).href; s.onload = res; s.onerror = () => rej(new Error('ort')); win.document.head.append(s); });
    win.ort.env.wasm.wasmPaths = new URL(base() + 'ort/', location.href).href;
    win.ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
    return win.ort;
  }
  // байты модели с прогрессом загрузки
  async function bytes(name, onProgress) {
    if (embedded()) { const b = await unpack(name); onProgress?.(1); return b; }
    const r = await fetch(base() + 'models/' + name);
    if (!r.ok) throw new Error('model ' + r.status);
    const total = +r.headers.get('content-length') || 0, reader = r.body.getReader(), parts = []; let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; onProgress?.(total ? got / total : 0); }
    const buf = new Uint8Array(got); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
    return buf;
  }
  return { setup, bytes, embedded };
})();
if (typeof window !== 'undefined') window.BOPASI_NN = BOPASI_NN;
