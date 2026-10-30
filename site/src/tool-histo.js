// ─── Инструменты: ядра на срезе H&E и индекс Ki-67 ──────────────────────────
const UI_HI = {
  dropHe: L('Перетащите снимок среза H&E', 'H&E кесіндісінің суретін сүйреңіз', 'Drop an H&E section image'),
  dropKi: L('Перетащите снимок ИГХ Ki-67 (DAB + гематоксилин)', 'Ki-67 ИГХ суретін сүйреңіз (DAB + гематоксилин)', 'Drop a Ki-67 IHC image (DAB + haematoxylin)'),
  sample: L('Открыть пример', 'Мысалды ашу', 'Load sample'),
  sampleNote: L('Пример: синтетический срез с известным числом ядер', 'Мысал: ядро саны белгілі синтетикалық кесінді', 'Sample: a synthetic section with a known nucleus count'),
  sens: L('Чувствительность', 'Сезімталдық', 'Sensitivity'),
  size: L('Радиус ядра, пикс (0 — авто)', 'Ядро радиусы, пикс (0 — авто)', 'Nucleus radius, px (0 = auto)'),
  dab: L('Порог DAB', 'DAB табалдырығы', 'DAB threshold'),
  scale: L('Масштаб, мкм/пикс (0 — не задан)', 'Масштаб, мкм/пикс (0 — берілмеген)', 'Scale, µm/px (0 = not set)'),
  redetect: L('Пересчитать', 'Қайта есептеу', 'Re-detect'),
  editHe: L('Клик по ядру — исключить или вернуть', 'Ядроны басу — шығару немесе қайтару', 'Click a nucleus to exclude or restore it'),
  editKi: L('Клик по ядру — сменить: положительное → отрицательное → исключено', 'Ядроны басу: оң → теріс → шығарылған', 'Click a nucleus to cycle: positive → negative → excluded'),
  nuclei: L('Ядер найдено', 'Табылған ядро', 'Nuclei found'),
  density: L('Плотность', 'Тығыздық', 'Density'),
  perMm: L('ядер/мм²', 'ядро/мм²', 'nuclei/mm²'),
  area: L('Площадь ядра', 'Ядро ауданы', 'Nucleus area'),
  cv: L('Вариабельность площади (CV)', 'Аудан вариабельділігі (CV)', 'Area variability (CV)'),
  large: L('Ядра > 2× медианы', 'Медианадан > 2× ядро', 'Nuclei > 2× median'),
  pos: L('Положительные', 'Оң', 'Positive'),
  neg: L('Отрицательные', 'Теріс', 'Negative'),
  index: L('Индекс Ki-67', 'Ki-67 индексі', 'Ki-67 index'),
  low: L('мало ядер: для индекса Ki-67 обычно считают ≥ 500–1000 опухолевых клеток', 'ядро аз: Ki-67 индексі үшін әдетте ≥ 500–1000 ісік жасушасы саналады', 'too few nuclei: a Ki-67 index is usually based on ≥ 500–1,000 tumour cells'),
  kiNote: L('Пороговые значения Ki-67 зависят от типа опухоли и рекомендаций; инструмент их не применяет. Считайте только опухолевые клетки — строму и лимфоциты исключите кликом.', 'Ki-67 табалдырықтары ісік түріне және ұсыныстарға байланысты; құрал оларды қолданбайды. Тек ісік жасушаларын санаңыз — строма мен лимфоциттерді басып шығарыңыз.', 'Ki-67 cut-offs depend on the tumour type and guideline; the tool does not apply any. Count tumour cells only — exclude stroma and lymphocytes by clicking.'),
  pxOnly: L('задайте масштаб, чтобы получить мкм² и плотность', 'мкм² мен тығыздықты алу үшін масштабты беріңіз', 'set the scale to get µm² and density'),
  copy: L('Копировать отчёт', 'Есепті көшіру', 'Copy report'),
  copied: L('Скопировано', 'Көшірілді', 'Copied'),
  csv: L('Скачать CSV', 'CSV жүктеу', 'Download CSV'),
  busy: L('Анализ…', 'Талдау…', 'Analysing…'),
};
const HI_MAX = 1600;
const HI_COL = { pos: '#b4610b', neg: '#1f4fff', he: '#0e8a5f', off: '#8a94ad' };

function mountHisto(root, kind) {
  const ki = kind === 'dab';
  const st = { canvas: null, img: null, res: null, sample: false, name: '', sens: 1, radius: 0, dabThr: 0, um: ki ? 0 : 0.5 };
  const canvas = h('canvas', { class: 'scd-canvas', tabindex: 0 });
  const note = h('p', { class: 'rc-note' });
  const result = h('div', { class: 'scd-result', 'aria-live': 'polite' });
  const fileIn = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => e.target.files[0] && loadFile(e.target.files[0]) });
  const num_ = (key, label, attrs) => {
    const inp = h('input', { type: 'number', value: st[key], ...attrs, oninput: (e) => { st[key] = +e.target.value || 0; if (key === 'um') sync(); } });
    return h('label', { class: 'field' }, h('span', {}, tr(label)), inp);
  };
  const sl = (key, label, min, max, step) => {
    const out = h('output', {}, String(st[key]));
    const inp = h('input', { type: 'range', min, max, step, value: st[key], oninput: (e) => { st[key] = +e.target.value; out.textContent = st[key].toFixed(2); } });
    return h('label', { class: 'ctl' }, h('div', { class: 'ctl-row' }, h('span', {}, tr(label)), out), inp);
  };
  const drop = h('div', { class: 'drop', tabindex: 0, onclick: () => fileIn.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') fileIn.click(); } },
    h('strong', {}, tr(ki ? UI_HI.dropKi : UI_HI.dropHe)), h('span', {}, 'JPG · PNG · WebP'));
  ['dragover', 'dragenter'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  root.addEventListener('drop', (e) => { const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/')); if (f) loadFile(f); });

  root.append(h('div', { class: 'scd' },
    h('div', { class: 'scd-main' }, h('div', { class: 'scd-stage' }, canvas), note),
    h('div', { class: 'scd-side' }, result,
      h('p', { class: 'hint' }, tr(ki ? UI_HI.editKi : UI_HI.editHe)),
      sl('sens', UI_HI.sens, 0.6, 1.6, 0.05),
      ki ? sl('dabThr', UI_HI.dab, -0.3, 0.3, 0.02) : null,
      num_('radius', UI_HI.size, { min: 0, max: 60, step: 1 }),
      num_('um', UI_HI.scale, { min: 0, step: 0.01 }),
      h('button', { class: 'btn-ghost', onclick: () => { if (st.img) { analyse(); draw(); sync(); } } }, tr(UI_HI.redetect)),
      drop, h('button', { class: 'btn-link', onclick: loadSample }, tr(UI_HI.sample)), fileIn)));

  function analyse() { st.res = IHC.detect(st.img, { kind, sens: st.sens, radius: st.radius, dabThr: st.dabThr }); }
  function setCanvas(c, name, sample) {
    st.canvas = c; st.name = name; st.sample = sample;
    st.img = c.getContext('2d').getImageData(0, 0, c.width, c.height); analyse(); draw(); sync();
  }
  async function loadFile(file) { result.textContent = tr(UI_HI.busy); await new Promise((r) => setTimeout(r, 30)); try { setCanvas(await fileToCanvasMax(file, HI_MAX), file.name, false); } catch { result.textContent = '—'; } }
  function loadSample() { const { canvas: c } = IHC.synth({ kind, seed: ki ? 11 : 3, count: ki ? 180 : 200, pos: 0.24, touch: true }); setCanvas(c, ki ? 'ki67-sample.png' : 'he-sample.png', true); }
  const live = () => st.res.nuclei.filter((q) => !q.off);
  function draw() {
    if (!st.canvas) return;
    canvas.width = st.canvas.width; canvas.height = st.canvas.height;
    const g = canvas.getContext('2d'); g.drawImage(st.canvas, 0, 0);
    const lw = Math.max(1.5, canvas.width / 600), r = st.res.r;
    for (const q of st.res.nuclei) {
      g.strokeStyle = q.off ? HI_COL.off : ki ? (q.pos ? HI_COL.pos : HI_COL.neg) : HI_COL.he;
      g.lineWidth = lw; if (q.off) g.setLineDash([3, 3]);
      g.beginPath(); g.arc(q.x, q.y, Math.max(3, Math.sqrt(q.area / Math.PI) + 1.5), 0, 6.283); g.stroke(); g.setLineDash([]);
    }
    void r;
  }
  function stats() {
    const res = { ...st.res, nuclei: live() };
    return IHC.summary(res, st.um);
  }
  function sync() {
    if (!st.res) return;
    note.textContent = st.sample ? tr(UI_HI.sampleNote) : `${st.name} · ${st.canvas.width}×${st.canvas.height}`;
    const s = stats(), k2 = st.um * st.um;
    const areaTxt = st.um > 0 ? `${num(s.areaUm, 1)} ± ${num(s.sdUm, 1)} мкм²` : `${num(s.meanArea, 0)} ± ${num(s.sdArea, 0)} px²`;
    const rows = ki ? [
      h('div', { class: 'big' }, h('span', { class: 'k' }, tr(UI_HI.index)), h('strong', {}, `${num(s.index * 100)}%`), h('span', { class: 's' }, `${s.pos} / ${s.n}`)),
      h('div', { class: 'scd-bars' },
        bar(tr(UI_HI.pos), s.pos, s.n, HI_COL.pos), bar(tr(UI_HI.neg), s.n - s.pos, s.n, HI_COL.neg)),
      s.n < 500 ? h('p', { class: 'hint' }, `${s.n} — ${tr(UI_HI.low)}`) : null,
      h('p', { class: 'hint' }, tr(UI_HI.kiNote)),
    ] : [
      h('div', { class: 'big' }, h('span', { class: 'k' }, tr(UI_HI.nuclei)), h('strong', {}, String(s.n)), h('span', { class: 's' }, st.um > 0 ? `${num(s.density, 0)} ${tr(UI_HI.perMm)}` : tr(UI_HI.pxOnly))),
      line(tr(UI_HI.area), areaTxt),
      line(tr(UI_HI.cv), `${num(s.cv * 100, 0)}%`),
      line(tr(UI_HI.large), `${s.large} · ${num(s.n ? (s.large / s.n) * 100 : 0, 1)}%`),
    ];
    void k2;
    result.replaceChildren(...rows,
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: (e) => copyReport(e.target, s) }, tr(UI_HI.copy)),
        h('button', { class: 'btn-ghost', onclick: saveCsv }, tr(UI_HI.csv))));
  }
  function bar(label, v, n, col) {
    const pct = n ? (v / n) * 100 : 0;
    return h('div', { class: 'bar' }, h('span', {}, label), h('div', { class: 'track' }, h('i', { style: `width:${pct}%;background:${col}` })), h('b', {}, `${v} · ${num(pct, 0)}%`));
  }
  function report(s) {
    const L1 = ki ? [`Ki-67: ${num(s.index * 100)}% (${s.pos} / ${s.n})`] : [`H&E: ${tr(UI_HI.nuclei)} ${s.n}`];
    if (!ki) { if (st.um > 0) L1.push(`${tr(UI_HI.density)}: ${num(s.density, 0)} ${tr(UI_HI.perMm)}`, `${tr(UI_HI.area)}: ${num(s.areaUm, 1)} ± ${num(s.sdUm, 1)} µm²`); L1.push(`${tr(UI_HI.cv)}: ${num(s.cv * 100, 0)}%`, `${tr(UI_HI.large)}: ${s.large}`); }
    L1.push(`${st.name}`);
    return L1.join('\n');
  }
  async function copyReport(btn, s) {
    try { await navigator.clipboard.writeText(report(s)); btn.textContent = tr(UI_HI.copied); setTimeout(() => (btn.textContent = tr(UI_HI.copy)), 1600); }
    catch { download(ki ? 'ki67-report.txt' : 'he-report.txt', report(s)); }
  }
  function saveCsv() {
    const k = st.um, head = ['x', 'y', 'area_px', 'area_um2', ...(ki ? ['brown', 'positive'] : []), 'excluded'];
    const rows = st.res.nuclei.map((q) => [q.x.toFixed(1), q.y.toFixed(1), q.area, k > 0 ? (q.area * k * k).toFixed(1) : '', ...(ki ? [q.brown.toFixed(3), q.pos ? 1 : 0] : []), q.off ? 1 : 0]);
    download(ki ? 'ki67-nuclei.csv' : 'he-nuclei.csv', [head, ...rows].map((r) => r.join(',')).join('\n'), 'text/csv');
  }
  canvas.addEventListener('click', (e) => {
    if (!st.res) return;
    const b = canvas.getBoundingClientRect(), x = (e.clientX - b.left) * (canvas.width / b.width), y = (e.clientY - b.top) * (canvas.height / b.height);
    let hit = null, hd = 1e9;
    for (const q of st.res.nuclei) { const d = Math.hypot(q.x - x, q.y - y); if (d < Math.max(8, st.res.r * 1.3) && d < hd) { hd = d; hit = q; } }
    if (!hit) return;
    if (!ki) hit.off = !hit.off;
    else if (hit.off) { hit.off = false; hit.pos = true; }
    else if (hit.pos) hit.pos = false;
    else hit.off = true;
    draw(); sync();
  });

  loadSample();
  return { destroy() {} };
}
