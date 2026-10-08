// ------------------------------------------------------------------ воркеры
const DETECT_SRC = CORE_SRC + `
let cvs = null, ctx = null;
self.onmessage = (e) => {
  const m = e.data;
  try {
    if (m.type === 'frame') {
      if (!cvs || cvs.width !== m.W || cvs.height !== m.H) { cvs = new OffscreenCanvas(m.W, m.H); ctx = cvs.getContext('2d', { willReadFrequently: true }); }
      ctx.drawImage(m.img, 0, 0, m.W, m.H); if (m.img.close) m.img.close();
      const d = ctx.getImageData(0, 0, m.W, m.H).data;
      const R = SpermCore.processFrameJS(d, m.W, m.H, m.opt);
      const S = SpermCore.spectrum(R.small, R.W4, R.H4);
      const tr = [S.re.buffer, S.im.buffer]; if (R.patches) tr.push(R.patches.buffer);
      self.postMessage({ dets: R.dets, free: R.free, pitch: R.pitch, patches: R.patches, re: S.re, im: S.im, W4: R.W4, H4: R.H4 }, tr);
    } else if (m.type === 'corr') {
      self.postMessage({ shift: SpermCore.phaseFromSpectra(m.A, m.B, m.W4, m.H4) });
    }
  } catch (err) { if (m.img && m.img.close) try { m.img.close(); } catch (_) {} self.postMessage({ error: String(err && err.message || err) }); }
};`;
const ANALYSIS_SRC = CORE_SRC + `
let A = null;
self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'init') { A = new SpermCore.Analyzer(m.fps, m.W, m.H, m.opt); }
  else if (m.type === 'add') { A.add(m.fr, m.R, m.shift); }
  else if (m.type === 'finish') {
    try {
      const r = A.finish(m.model);
      const cum = new Float32Array(r._frames.length * 2); r._frames.forEach((f, i) => { cum[2 * i] = f.cum[0]; cum[2 * i + 1] = f.cum[1]; });
      const tracks = new Map(); for (const [id] of r._kin) { const t = r._tracks.get(id); tracks.set(id, { f: t.f, x: t.x, y: t.y }); }
      const overlay = r._overlay; delete r._overlay; delete r._frames; delete r._tracks; delete r._kin;
      self.postMessage({ res: r, overlay, cum, tracks });
    } catch (err) { self.postMessage({ error: String(err && err.message || err) }); }
    A = null;
  }
};`;
const blobURL = src => URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
let DETECT_URL = null, ANALYSIS_URL = null;

class Pool {
  constructor(n) { DETECT_URL = DETECT_URL || blobURL(DETECT_SRC); this.ws = []; this.q = [];
    for (let i = 0; i < n; i++) { const w = new Worker(DETECT_URL); w.onmessage = e => this.done(w, e.data); w.onerror = e => this.done(w, { error: e.message || 'ошибка воркера' }); this.ws.push(w); } }
  run(task, transfer) { return new Promise((res, rej) => { this.q.push({ task, transfer, res, rej }); this.pump(); }); }
  pump() { for (const w of this.ws) if (!w.job && this.q.length) { const j = this.q.shift(); w.job = j; w.postMessage(j.task, j.transfer || []); } }
  done(w, data) { const j = w.job; w.job = null; if (j) (data.error ? j.rej(new Error(data.error)) : j.res(data)); this.pump(); }
  close() { this.ws.forEach(w => w.terminate()); }
}

// ------------------------------------------------------------------ чтение видео
function loadMP4(file) {
  return new Promise(async (resolve, reject) => {
    if (!window.MP4Box) return reject(new Error('нет MP4Box'));
    const mp4 = MP4Box.createFile(); let info = null; const samples = [];
    mp4.onError = e => reject(new Error(t('errMp4') + ': ' + e));
    mp4.onReady = i => { info = i; const tr = i.videoTracks[0]; if (!tr) return; mp4.setExtractionOptions(tr.id, null, { nbSamples: 1e9 }); mp4.start(); };
    mp4.onSamples = (id, u, s) => { for (const x of s) samples.push(x); };
    try { const buf = await file.arrayBuffer(); buf.fileStart = 0; mp4.appendBuffer(buf); mp4.flush(); }
    catch (e) { return reject(e); }
    try {
    if (!info || !info.videoTracks.length) return reject(new Error(t('errNoTrack')));
    const tr = info.videoTracks[0];
    let description;
    const trak = mp4.getTrackById(tr.id);
    for (const ent of trak.mdia.minf.stbl.stsd.entries) {
      const box = ent.avcC || ent.hvcC || ent.vpcC || ent.av1C;
      if (box) { const DS = MP4Box.DataStream || window.DataStream; const ds = new DS(undefined, 0, DS.BIG_ENDIAN); box.write(ds); description = new Uint8Array(ds.buffer, 8); break; }
    }
    const fps = samples.length / (tr.duration / tr.timescale) || 30;
    resolve({ samples, fps, W: tr.video ? tr.video.width : tr.track_width, H: tr.video ? tr.video.height : tr.track_height,
      config: { codec: tr.codec, codedWidth: tr.video ? tr.video.width : tr.track_width, codedHeight: tr.video ? tr.video.height : tr.track_height, description } });
    } catch (e) { reject(e); }
  });
}

/* Отдаёт кадры по порядку: onFrame(img, idx) -> Promise (ждём, если конвейер занят). */
async function decodeWebCodecs(meta, onFrame) {
  let idx = 0, err = null, chain = Promise.resolve();
  const dec = new VideoDecoder({
    output: f => { const i = idx++; chain = chain.then(() => onFrame(f, i)).catch(e => { err = e; try { f.close(); } catch (_) {} }); },
    error: e => { err = e; } });
  dec.configure(meta.config);
  for (const s of meta.samples) {
    if (err) throw err;
    dec.decode(new EncodedVideoChunk({ type: s.is_sync ? 'key' : 'delta', timestamp: 1e6 * s.cts / s.timescale, duration: 1e6 * s.duration / s.timescale, data: s.data }));
    while (dec.decodeQueueSize > 6) await new Promise(r => setTimeout(r, 4));
    await chain;   // мягкое ограничение: не уходим далеко вперёд обработки
  }
  await dec.flush(); await chain; dec.close();
  if (err) throw err;
  return idx;
}

async function decodeBySeeking(file, fps, onFrame, onTotal) {
  const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = URL.createObjectURL(file);
  await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error(t('errOpen'))); });
  const n = Math.floor(v.duration * fps); onTotal(n, v.videoWidth, v.videoHeight);
  for (let i = 0; i < n; i++) {
    v.currentTime = (i + 0.5) / fps; await new Promise(r => v.onseeked = r);
    const bmp = await createImageBitmap(v); await onFrame(bmp, i);
  }
  URL.revokeObjectURL(v.src); return n;
}

// ------------------------------------------------------------------ анализ одного видео
async function analyzeItem(item, settings, onProgress) {
  const nWorkers = Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 1));
  const pool = new Pool(nWorkers);
  ANALYSIS_URL = ANALYSIS_URL || blobURL(ANALYSIS_SRC);
  const an = new Worker(ANALYSIS_URL);
  let meta = null, useWC = false;
  try { meta = await loadMP4(item.file); useWC = 'VideoDecoder' in window && (await VideoDecoder.isConfigSupported(meta.config)).supported; }
  catch (e) { meta = null; }
  const fps = meta ? meta.fps : 30;
  let total = meta ? meta.samples.length : 0, nativeW = meta ? meta.W : 0, nativeH = meta ? meta.H : 0;
  let scale = 1, Wp = 0, Hp = 0, W4 = 0, H4 = 0, started = false;
  const userUm = parseFloat(String(settings.umPerPx).replace(',', '.'));
  const specs = new Map(), dets = new Map(), shifts = new Map([[0, [0, 0]]]), corrStarted = new Set();
  let next = 0, submitted = 0, waiters = [], failed = null;
  const opt = { chamberDepthUm: settings.depth, gridPitchUm: settings.pitch, dilution: settings.dilution, umPerPx: null };

  const probe = (img) => { // масштаб по сетке на первом кадре
    const c = new OffscreenCanvas(nativeW, nativeH), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, nativeW, nativeH).data;
    if (userUm > 0) scale = userUm / 0.327;
    else { const R = Core.processFrameJS(d, nativeW, nativeH, { wantPitch: true }); if (R.pitch) scale = NOMINAL_PITCH_PX / R.pitch; }
    if (Math.abs(scale - 1) < 0.08) scale = 1;
    scale = Math.max(0.35, Math.min(2.5, scale));
    Wp = Math.round(nativeW * scale / 4) * 4; Hp = Math.round(nativeH * scale / 4) * 4;
    if (userUm > 0) opt.umPerPx = userUm * nativeW / Wp;
    an.postMessage({ type: 'init', fps, W: Wp, H: Hp, opt });
    started = true;
  };
  const flush = () => {
    while (dets.has(next) && shifts.has(next)) {
      const R = dets.get(next); dets.delete(next);
      const msg = { type: 'add', fr: next, R: R.error ? null : { dets: R.dets, free: R.free, pitch: R.pitch, patches: R.patches }, shift: shifts.get(next) };
      an.postMessage(msg, R.patches ? [R.patches.buffer] : []);
      shifts.delete(next); next++;
    }
    onProgress(next, total);
    const ws = waiters; waiters = []; ws.forEach(r => r());
  };
  const tryCorr = (i) => {
    if (i <= 0 || corrStarted.has(i) || !specs.get(i - 1) || !specs.get(i)) return;
    corrStarted.add(i);
    pool.run({ type: 'corr', A: specs.get(i - 1), B: specs.get(i), W4, H4 })
      .then(r => { shifts.set(i, [r.shift[0] * 4, r.shift[1] * 4]); flush(); })
      .catch(() => { shifts.set(i, [99, 99]); flush(); });
  };
  const onFrame = async (img, fr) => {
    if (failed) { try { img.close(); } catch (_) {} return; }
    if (!started) { nativeW = nativeW || img.displayWidth || img.width; nativeH = nativeH || img.displayHeight || img.height; probe(img); }
    submitted++;
    const o = { wantPatches: fr % 6 === 0, wantPitch: fr < 3 || fr % 60 === 0 };
    pool.run({ type: 'frame', img, fr, W: Wp, H: Hp, opt: o }, [img]).then(R => {
      W4 = R.W4; H4 = R.H4; specs.set(fr, { re: R.re, im: R.im }); delete R.re; delete R.im;
      dets.set(fr, R); tryCorr(fr); tryCorr(fr + 1);
      // спектры старше двух кадров больше не нужны
      for (const k of specs.keys()) if (k < fr - 8 && corrStarted.has(k + 1) && (k === 0 || corrStarted.has(k))) specs.delete(k);
      flush();
    }).catch(e => { dets.set(fr, { error: e.message }); specs.set(fr, null); shifts.set(fr, [99, 99]); if (!corrStarted.has(fr + 1)) { corrStarted.add(fr + 1); shifts.set(fr + 1, [99, 99]); } flush(); });
    while (submitted - next > nWorkers * 3 + 4) await new Promise(r => waiters.push(r));
  };
  try {
    if (meta && useWC) total = await decodeWebCodecs(meta, onFrame);
    else total = await decodeBySeeking(item.file, fps, onFrame, (n, w, h) => { total = n; nativeW = w; nativeH = h; });
    total = submitted;
    while (next < total) await new Promise(r => waiters.push(r));
    const out = await new Promise((res, rej) => { an.onmessage = e => e.data.error ? rej(new Error(e.data.error)) : res(e.data); an.postMessage({ type: 'finish', model: MODEL }); });
    out.res.scale = scale; out.res.nativeW = nativeW; out.res.nativeH = nativeH; out.res.decoder = useWC ? 'WebCodecs' : 'seek';
    if (!meta) out.res.fpsWarning = true;
    return out;
  } finally { pool.close(); an.terminate(); }
}

