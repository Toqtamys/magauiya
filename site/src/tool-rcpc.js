// ─── Инструмент: RC ⇄ фазовый контраст ──────────────────────────────────────
const UI_RC = {
  sample: L('Открыть пример', 'Мысалды ашу', 'Load sample'),
  upload: L('Загрузить снимки', 'Суреттерді жүктеу', 'Upload images'),
  drop: L('Перетащите снимки сюда — можно несколько', 'Суреттерді осында сүйреңіз — бірнешеуін де', 'Drop images here — several at once is fine'),
  angle: L('Угол тени', 'Көлеңке бұрышы', 'Shadow angle'),
  found: L('найдено', 'табылды', 'detected'),
  strength: L('Сила', 'Күш', 'Strength'),
  length: L('Длина интегрирования', 'Интегралдау ұзындығы', 'Integration length'),
  halo: L('Ореол', 'Ореол', 'Halo'),
  haloSize: L('Размер ореола', 'Ореол өлшемі', 'Halo size'),
  invert: L('Инвертировать рельеф', 'Рельефті инверттеу', 'Invert relief'),
  dl: L('Скачать PNG', 'PNG жүктеу', 'Download PNG'),
  dlAll: L('Скачать все', 'Барлығын жүктеу', 'Download all'),
  sampleNote: L('Пример: синтетический снимок ооцита в рельефном контрасте', 'Мысал: рельефтік контрасттағы ооциттің синтетикалық суреті', 'Sample: a synthetic relief-contrast oocyte image'),
};
const RC_MAX = 2048;

function makeSampleRC() {
  const W = 880, H = 660, c = document.createElement('canvas'); c.width = W; c.height = H;
  // оптическая толщина: ооцит, зона, полярное тельце, гранулы
  const Lp = new Float32Array(W * H);
  const cx = 430, cy = 330, R = 220, Z = 262;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gran = Array.from({ length: 260 }, () => { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (R - 20); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3 + rnd() * 6]; });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
    let v = 0;
    if (r < R) v += Math.sqrt(1 - (r / R) ** 2) * 1.0;
    if (r > R + 18 && r < Z) v += 0.35 * Math.sin(Math.PI * (r - R - 18) / (Z - R - 18));
    const pb = Math.hypot(x - (cx + 205), y - (cy - 150)); if (pb < 34) v += 0.45 * Math.sqrt(1 - (pb / 34) ** 2);
    Lp[y * W + x] = v;
  }
  for (const [gx, gy, gr] of gran) for (let y = Math.max(0, gy - gr | 0); y < Math.min(H, gy + gr + 1); y++) for (let x = Math.max(0, gx - gr | 0); x < Math.min(W, gx + gr + 1); x++) {
    const d = Math.hypot(x - gx, y - gy); if (d < gr) Lp[y * W + x] += 0.06 * (1 - d / gr);
  }
  // RC = направленная производная вдоль 135° + шум
  const a = (135 * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const img = c.getContext('2d').createImageData(W, H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const gx = (Lp[y * W + x + 1] - Lp[y * W + x - 1]) / 2, gy = (Lp[(y + 1) * W + x] - Lp[(y - 1) * W + x]) / 2;
    let v = 0.55 + (gx * ca + gy * sa) * 9 + (rnd() - 0.5) * 0.03;
    v = Math.max(0, Math.min(1, v)) * 255; const p = (y * W + x) * 4;
    img.data[p] = v * 0.97; img.data[p + 1] = v * 0.98; img.data[p + 2] = v; img.data[p + 3] = 255;
  }
  c.getContext('2d').putImageData(img, 0, 0);
  return c;
}

function fileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, RC_MAX / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); resolve(c);
    };
    img.onerror = reject; img.src = URL.createObjectURL(file);
  });
}

function mountRcpc(root) {
  const st = { items: [], sel: 0, dir: 'rc2pc', angle: 135, found: null, strength: 1, length: 0.75, halo: 0.6, haloRadius: 6, invert: false, split: 50 };
  const out = h('canvas', { class: 'rc-out' });
  const srcImg = h('img', { class: 'rc-src', alt: '' });
  const note = h('p', { class: 'rc-note' });
  const thumbs = h('div', { class: 'rc-thumbs' });
  const busy = h('span', { class: 'rc-busy' });
  const fileIn = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: (e) => addFiles([...e.target.files]) });

  const seg = h('div', { class: 'seg' },
    h('button', { 'data-v': 'rc2pc', onclick: () => set({ dir: 'rc2pc' }) }, 'RC → PC'),
    h('button', { 'data-v': 'pc2rc', onclick: () => set({ dir: 'pc2rc' }) }, 'PC → RC'));

  const sliders = {};
  const slider = (key, label, min, max, step, unit = '') => {
    const val = h('output', {});
    const inp = h('input', { type: 'range', min, max, step, value: st[key], 'aria-label': tr(label), oninput: (e) => set({ [key]: parseFloat(e.target.value) }) });
    const lab = h('span', {}, tr(label));
    sliders[key] = { inp, val, unit, lab, label };
    return h('label', { class: 'ctl' }, h('div', { class: 'ctl-row' }, lab, val), inp);
  };
  const lenRow = slider('length', UI_RC.length, 0.1, 1, 0.05);
  const invBtn = h('button', { class: 'btn-ghost', onclick: () => set({ invert: !st.invert }) }, tr(UI_RC.invert));
  const dlBtn = h('button', { class: 'btn', onclick: () => saveOne(st.sel) }, tr(UI_RC.dl));
  const dlAll = h('button', { class: 'btn-ghost', onclick: saveAll });
  const splitIn = h('input', { type: 'range', min: 0, max: 100, value: 50, class: 'rc-split', 'aria-label': 'before / after', oninput: (e) => { st.split = +e.target.value; paintSplit(); } });

  const stage = h('div', { class: 'rc-stage' }, out, srcImg, h('div', { class: 'rc-bar' }),
    h('span', { class: 'rc-tag l' }), h('span', { class: 'rc-tag r' }));

  const drop = h('div', { class: 'drop', tabindex: 0, onclick: () => fileIn.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') fileIn.click(); } },
    h('strong', {}, tr(UI_RC.drop)), h('span', {}, 'PNG · JPG · BMP · WebP'));
  ['dragover', 'dragenter'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  root.addEventListener('drop', (e) => addFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))));

  root.append(h('div', { class: 'rc' },
    h('div', { class: 'rc-main' }, stage, splitIn, note, thumbs),
    h('div', { class: 'rc-side' },
      seg,
      slider('angle', UI_RC.angle, 0, 359, 1, '°'),
      slider('strength', UI_RC.strength, 0, 2, 0.05),
      lenRow,
      slider('halo', UI_RC.halo, 0, 1.5, 0.05),
      slider('haloRadius', UI_RC.haloSize, 1, 20, 1, ' px'),
      invBtn,
      h('div', { class: 'row' }, dlBtn, dlAll, busy),
      drop,
      h('button', { class: 'btn-link', onclick: loadSample }, tr(UI_RC.sample)),
      fileIn)));

  function set(p) { Object.assign(st, p); syncUI(); schedule(); }
  function syncUI() {
    seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === st.dir));
    for (const [k, s] of Object.entries(sliders)) {
      s.inp.value = st[k];
      let txt = (Number.isInteger(st[k]) ? st[k] : st[k].toFixed(2)) + s.unit;
      if (k === 'angle' && st.found != null) txt += ` · ${tr(UI_RC.found)} ${st.found}°`;
      s.val.textContent = txt;
    }
    lenRow.hidden = st.dir !== 'rc2pc';
    invBtn.classList.toggle('on', st.invert);
    dlAll.hidden = st.items.length < 2; dlAll.textContent = `${tr(UI_RC.dlAll)} (${st.items.length})`;
    dlBtn.disabled = !st.items.length;
    stage.querySelector('.rc-tag.l').textContent = st.dir === 'rc2pc' ? 'RC' : 'Phase contrast';
    stage.querySelector('.rc-tag.r').textContent = st.dir === 'rc2pc' ? 'Phase contrast' : 'RC';
    thumbs.replaceChildren(...(st.items.length > 1 ? st.items.map((it, i) => h('button', { class: 'thumb' + (i === st.sel ? ' on' : ''), title: it.name, onclick: () => select(i) }, h('img', { src: it.thumb, alt: it.name }))) : []));
  }
  let timer = 0;
  function schedule() { clearTimeout(timer); busy.textContent = '…'; timer = setTimeout(run, 60); }
  function params() { return { dir: st.dir, angleDeg: st.angle, strength: st.strength, halo: st.halo, haloRadius: st.haloRadius, length: st.length, invert: st.invert }; }
  function convert(canvas) {
    const f = RCPC.luma(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height));
    return RCPC.toImageData(RCPC.process(f, params()));
  }
  function run() {
    const it = st.items[st.sel]; busy.textContent = '';
    if (!it) return;
    const res = convert(it.canvas);
    out.width = res.width; out.height = res.height; out.getContext('2d').putImageData(res, 0, 0);
    srcImg.src = it.url; paintSplit();
  }
  function paintSplit() {
    out.style.clipPath = `inset(0 ${100 - st.split}% 0 0)`;
    srcImg.style.clipPath = `inset(0 0 0 ${st.split}%)`;
    stage.querySelector('.rc-bar').style.left = st.split + '%';
  }
  function select(i) {
    st.sel = i; const it = st.items[i];
    if (it.found == null) it.found = Math.round(RCPC.estimateAngle(RCPC.luma(it.canvas.getContext('2d').getImageData(0, 0, it.canvas.width, it.canvas.height)))) % 360;
    st.found = it.found; st.angle = it.found;
    note.textContent = it.sample ? tr(UI_RC.sampleNote) : `${it.name} · ${it.canvas.width}×${it.canvas.height}`;
    syncUI(); schedule();
  }
  function addItem(canvas, name, sample = false) {
    const t = document.createElement('canvas'); const s = 96 / Math.max(canvas.width, canvas.height);
    t.width = canvas.width * s; t.height = canvas.height * s; t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height);
    st.items.push({ canvas, name, sample, url: canvas.toDataURL('image/jpeg', 0.92), thumb: t.toDataURL(), found: null });
  }
  async function addFiles(files) {
    if (!files.length) return;
    if (st.items.length === 1 && st.items[0].sample) st.items = [];
    const start = st.items.length;
    for (const f of files) { try { addItem(await fileToCanvas(f), f.name); } catch {} }
    if (st.items.length > start) select(start);
  }
  function loadSample() { st.items = st.items.filter((i) => !i.sample); addItem(makeSampleRC(), 'sample.png', true); select(st.items.length - 1); }
  function nameFor(it) { return it.name.replace(/\.[^.]+$/, '') + (st.dir === 'rc2pc' ? '_PC.png' : '_RC.png'); }
  function saveOne(i) {
    const it = st.items[i]; if (!it) return;
    const res = convert(it.canvas), c = document.createElement('canvas'); c.width = res.width; c.height = res.height;
    c.getContext('2d').putImageData(res, 0, 0); c.toBlob((b) => b && download(nameFor(it), b), 'image/png');
  }
  async function saveAll() { for (let i = 0; i < st.items.length; i++) { saveOne(i); await new Promise((r) => setTimeout(r, 350)); } }

  loadSample();
  return { destroy() { clearTimeout(timer); } };
}
