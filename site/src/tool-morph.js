// ─── Инструмент: морфометрия ооцита / эмбриона по снимку ─────────────────────
const UI_MM = {
  drop: L('Перетащите снимок ооцита или эмбриона', 'Ооцит немесе эмбрион суретін сүйреңіз', 'Drop an oocyte or embryo image'),
  sample: L('Открыть пример', 'Мысалды ашу', 'Load sample'),
  sampleNote: L('Пример: синтетический ооцит, масштаб 0,4 мкм/пикс', 'Мысал: синтетикалық ооцит, масштаб 0,4 мкм/пикс', 'Sample: a synthetic oocyte, scale 0.4 µm/px'),
  scale: L('Масштаб, мкм/пикс', 'Масштаб, мкм/пикс', 'Scale, µm/px'),
  calib: L('Калибровать по линии', 'Сызық бойынша калибрлеу', 'Calibrate with a line'),
  calibAsk: L('Проведите линию по объекту известной длины (например, шкале или сетке)', 'Ұзындығы белгілі нысан бойынша сызық жүргізіңіз (мысалы, шкала немесе тор)', 'Draw a line along an object of known length (e.g. a scale bar or grid)'),
  calibLen: L('Длина линии, мкм', 'Сызық ұзындығы, мкм', 'Line length, µm'),
  apply: L('Применить', 'Қолдану', 'Apply'),
  line: L('Линия', 'Сызық', 'Line'), circle: L('Окружность (3 точки)', 'Шеңбер (3 нүкте)', 'Circle (3 points)'),
  hintLine: L('Кликните начало и конец отрезка', 'Кесіндінің басы мен соңын басыңыз', 'Click the start and end of the segment'),
  hintCircle: L('Кликните 3 точки на контуре: ооплазмы, зоны или ПВП', 'Контурдағы 3 нүктені басыңыз: ооплазма, аймақ немесе ПВК', 'Click 3 points on an outline: ooplasm, zona or PVS'),
  length: L('длина', 'ұзындық', 'length'), diameter: L('диаметр', 'диаметр', 'diameter'), area: L('площадь', 'аудан', 'area'),
  thick: L('Разница радиусов двух последних окружностей (толщина зоны / ширина ПВП)', 'Соңғы екі шеңбер радиустарының айырмасы (аймақ қалыңдығы / ПВК ені)', 'Radius difference of the last two circles (zona thickness / PVS width)'),
  none: L('Пока нет измерений', 'Әзірге өлшем жоқ', 'No measurements yet'),
  clear: L('Очистить', 'Тазарту', 'Clear'),
  csv: L('Скачать CSV', 'CSV жүктеу', 'Download CSV'),
};
function makeSampleOocyte() {
  // 0,4 мкм/пикс: ооплазма Ø110 мкм, ПВП 5 мкм, зона 17 мкм → внешний Ø 154 мкм
  const W = 620, H = 480, k = 1 / 0.4, cx = 300, cy = 245;
  const rO = 55 * k, rZi = 60 * k, rZo = 77 * k;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#c9ccd2'; g.fillRect(0, 0, W, H);
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const zona = g.createRadialGradient(cx, cy, rZi, cx, cy, rZo);
  zona.addColorStop(0, '#9aa0aa'); zona.addColorStop(0.5, '#e3e6ea'); zona.addColorStop(1, '#a7adb7');
  g.fillStyle = zona; g.beginPath(); g.arc(cx, cy, rZo, 0, 6.283); g.arc(cx, cy, rZi, 0, 6.283, true); g.fill();
  g.fillStyle = '#d3d6db'; g.beginPath(); g.arc(cx, cy, rZi, 0, 6.283); g.fill();
  const oo = g.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, rO);
  oo.addColorStop(0, '#b9bdc6'); oo.addColorStop(1, '#8e94a0');
  g.fillStyle = oo; g.beginPath(); g.arc(cx, cy, rO, 0, 6.283); g.fill();
  for (let i = 0; i < 900; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (rO - 4); g.fillStyle = `rgba(70,76,88,${0.12 + rnd() * 0.2})`; g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.8 + rnd() * 1.8, 0, 6.283); g.fill(); }
  g.fillStyle = '#9ea4ae'; g.beginPath(); g.arc(cx + rO * 0.72 + 14, cy - rO * 0.62 - 10, 12 * 1.0, 0, 6.283); g.fill();
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) { const n = (rnd() - 0.5) * 10; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  return c;
}
function circumcircle(p1, p2, p3) {
  const ax = p1.x, ay = p1.y, bx = p2.x, by = p2.y, cx = p3.x, cy = p3.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  return { x: ux, y: uy, r: Math.hypot(ax - ux, ay - uy) };
}
function mountMorphometry(root) {
  const st = { img: null, sample: false, umpp: 0.4, tool: 'circle', pts: [], items: [], calib: false, hover: null };
  const canvas = h('canvas', { class: 'mm-canvas', tabindex: 0 });
  const fileIn = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => { const f = e.target.files[0]; if (f) { st.img = await fileToCanvasMax(f, 1600); st.sample = false; st.items = []; st.pts = []; draw(); sync(); } } });
  const scaleIn = h('input', { type: 'number', step: 'any', min: 0, value: st.umpp, 'aria-label': tr(UI_MM.scale), oninput: (e) => { const v = parseFloat(e.target.value); if (v > 0) { st.umpp = v; sync(); draw(); } } });
  const toolSeg = h('div', { class: 'seg' }, ...[['circle', UI_MM.circle], ['line', UI_MM.line]].map(([k, lab]) => h('button', { 'data-v': k, onclick: () => { st.tool = k; st.calib = false; st.pts = []; sync(); draw(); } }, tr(lab))));
  const calibBtn = h('button', { class: 'btn-ghost', onclick: () => { st.calib = true; st.tool = 'line'; st.pts = []; sync(); draw(); } }, tr(UI_MM.calib));
  const hint = h('p', { class: 'hint' });
  const list = h('div', { class: 'mm-list calc-result' });
  const calibBox = h('div', { class: 'mm-calib', hidden: true });
  const drop = h('div', { class: 'drop', tabindex: 0, onclick: () => fileIn.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') fileIn.click(); } }, h('strong', {}, tr(UI_MM.drop)), h('span', {}, 'JPG · PNG · WebP'));
  ['dragover', 'dragenter'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  root.addEventListener('drop', async (e) => { const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/')); if (f) { st.img = await fileToCanvasMax(f, 1600); st.sample = false; st.items = []; st.pts = []; draw(); sync(); } });
  root.append(h('div', { class: 'mm' },
    h('div', { class: 'mm-main' }, h('div', { class: 'mm-stage' }, canvas), hint, calibBox),
    h('div', { class: 'mm-side' }, toolSeg,
      h('label', { class: 'field' }, h('span', {}, tr(UI_MM.scale)), scaleIn), calibBtn, list,
      h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: () => { st.items = []; st.pts = []; draw(); sync(); } }, tr(UI_MM.clear)), h('button', { class: 'btn-ghost', onclick: saveCsv }, tr(UI_MM.csv))),
      drop, h('button', { class: 'btn-link', onclick: loadSample }, tr(UI_MM.sample)), fileIn)));

  const um = (px) => px * st.umpp;
  function loadSample() { st.img = makeSampleOocyte(); st.sample = true; st.umpp = 0.4; scaleIn.value = 0.4; st.items = []; st.pts = []; draw(); sync(); }
  function pos(e) { const b = canvas.getBoundingClientRect(); return { x: (e.clientX - b.left) * (canvas.width / b.width), y: (e.clientY - b.top) * (canvas.height / b.height) }; }
  canvas.addEventListener('click', (e) => {
    if (!st.img) return;
    st.pts.push(pos(e));
    if (st.tool === 'line' && st.pts.length === 2) {
      const [a, b] = st.pts, px = Math.hypot(b.x - a.x, b.y - a.y);
      if (st.calib) { showCalib(a, b, px); }
      else st.items.push({ type: 'line', a, b, px });
      st.pts = [];
    } else if (st.tool === 'circle' && st.pts.length === 3) {
      const c = circumcircle(...st.pts); if (c) st.items.push({ type: 'circle', ...c }); st.pts = [];
    }
    draw(); sync();
  });
  canvas.addEventListener('mousemove', (e) => { st.hover = pos(e); if (st.pts.length) draw(); });
  canvas.addEventListener('keydown', (e) => { if (e.key === 'Escape') { st.pts = []; draw(); } });
  function showCalib(a, b, px) {
    const inp = h('input', { type: 'number', step: 'any', min: 0, placeholder: '100', 'aria-label': tr(UI_MM.calibLen) });
    calibBox.hidden = false;
    calibBox.replaceChildren(h('span', {}, `${tr(UI_MM.calibLen)} (${num(px, 1)} px):`), inp, h('button', { class: 'btn', onclick: () => { const L0 = parseFloat(inp.value); if (L0 > 0) { st.umpp = L0 / px; scaleIn.value = st.umpp.toFixed(4); st.calib = false; st.tool = 'circle'; calibBox.hidden = true; sync(); draw(); } } }, tr(UI_MM.apply)));
    inp.focus();
  }
  function draw() {
    if (!st.img) return;
    canvas.width = st.img.width; canvas.height = st.img.height;
    const g = canvas.getContext('2d'); g.drawImage(st.img, 0, 0);
    const lw = Math.max(1.5, canvas.width / 500), fs = Math.max(12, canvas.width / 40);
    g.font = `600 ${fs}px Onest, system-ui, sans-serif`; g.textBaseline = 'middle';
    const label = (t, x, y) => { const w = g.measureText(t).width + 12; g.fillStyle = 'rgba(7,23,64,.82)'; g.fillRect(x, y - fs * 0.7, w, fs * 1.4); g.fillStyle = '#fff'; g.fillText(t, x + 6, y); };
    st.items.forEach((it, i) => {
      g.strokeStyle = '#1f4fff'; g.lineWidth = lw; g.setLineDash([]);
      if (it.type === 'line') { g.beginPath(); g.moveTo(it.a.x, it.a.y); g.lineTo(it.b.x, it.b.y); g.stroke(); label(`${i + 1}: ${num(um(it.px), 1)} µm`, (it.a.x + it.b.x) / 2 + 6, (it.a.y + it.b.y) / 2); }
      else { g.beginPath(); g.arc(it.x, it.y, it.r, 0, 6.283); g.stroke(); label(`${i + 1}: Ø ${num(um(it.r * 2), 1)} µm`, it.x + it.r * 0.72, it.y - it.r * 0.72); }
    });
    g.fillStyle = '#e58a00'; for (const p of st.pts) { g.beginPath(); g.arc(p.x, p.y, lw * 2.2, 0, 6.283); g.fill(); }
    if (st.pts.length && st.hover) {
      g.strokeStyle = st.calib ? '#e58a00' : 'rgba(31,79,255,.6)'; g.setLineDash([6, 5]); g.lineWidth = lw;
      if (st.tool === 'line') { g.beginPath(); g.moveTo(st.pts[0].x, st.pts[0].y); g.lineTo(st.hover.x, st.hover.y); g.stroke(); }
      else if (st.pts.length === 2) { const c = circumcircle(st.pts[0], st.pts[1], st.hover); if (c) { g.beginPath(); g.arc(c.x, c.y, c.r, 0, 6.283); g.stroke(); } }
      g.setLineDash([]);
    }
  }
  function sync() {
    toolSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === st.tool && !st.calib));
    calibBtn.classList.toggle('on', st.calib);
    hint.textContent = st.calib ? tr(UI_MM.calibAsk) : (st.sample ? tr(UI_MM.sampleNote) + ' · ' : '') + tr(st.tool === 'line' ? UI_MM.hintLine : UI_MM.hintCircle);
    const rows = st.items.map((it, i) => it.type === 'line'
      ? line(`${i + 1} · ${tr(UI_MM.line)}`, `${num(um(it.px), 1)} µm`)
      : line(`${i + 1} · ${tr(UI_MM.diameter)} / ${tr(UI_MM.area)}`, `${num(um(it.r * 2), 1)} µm · ${num(Math.PI * um(it.r) ** 2, 0)} µm²`));
    const circles = st.items.filter((x) => x.type === 'circle');
    if (circles.length >= 2) { const [a, b] = circles.slice(-2); rows.push(line(tr(UI_MM.thick), `${num(Math.abs(um(a.r) - um(b.r)), 1)} µm`, 'good')); }
    list.replaceChildren(...(rows.length ? rows : [h('p', { class: 'hint' }, tr(UI_MM.none))]));
  }
  function saveCsv() {
    const rows = [['#', 'type', 'value_um', 'area_um2']];
    st.items.forEach((it, i) => rows.push(it.type === 'line' ? [i + 1, 'line', um(it.px).toFixed(2), ''] : [i + 1, 'circle_diameter', um(it.r * 2).toFixed(2), (Math.PI * um(it.r) ** 2).toFixed(1)]));
    download('morphometry.csv', rows.map((r) => r.join(',')).join('\n'), 'text/csv');
  }
  loadSample();
  return { destroy() {} };
}
