// ─── Инструмент: SCD / Halo-тест — индекс фрагментации ДНК ───────────────────
// Три метода подсчёта: классический (гало по яркости), нейросеть ×100 (сегментация), нейросеть ×20 (центр + гало).
// Снимки группируются по образцам; каждый образец можно посчитать любым или всеми методами сразу.
const SCD_COL = { large: '#0e8a5f', medium: '#17a2b8', small: '#e58a00', none: '#d1435b', degraded: '#7a1630', excluded: '#8a94ad', ok: '#0e8a5f', frag: '#d1435b' };
const SCD_NAME = {
  large: L('Большое гало', 'Үлкен гало', 'Large halo'),
  medium: L('Среднее гало', 'Орташа гало', 'Medium halo'),
  small: L('Малое гало', 'Кіші гало', 'Small halo'),
  none: L('Без гало', 'Галосыз', 'No halo'),
  degraded: L('Дегенеративное', 'Дегенеративті', 'Degraded'),
  excluded: L('Исключено', 'Шығарылған', 'Excluded'),
  ok: L('Не фрагментирована', 'Фрагменттелмеген', 'Not fragmented'),
  frag: L('Фрагментирована', 'Фрагменттелген', 'Fragmented'),
};
const SCD_METHODS = ['classic', 'ai100', 'ai20'];
const SCD_M = {
  classic: {
    name: L('Классический', 'Классикалық', 'Classic'),
    mag: '×40',
    req: L('Снимки с объективом ×40 (допустимо ×20–×100): светлое поле, ядра не слипаются, гало целиком в кадре. Ширину гало измеряет программа и делит клетки на 5 классов Fernández.',
      '×40 объективпен түсірілген суреттер (×20–×100 болады): ашық өріс, ядролар жабыспаған, гало кадрда толық. Гало енін бағдарлама өлшеп, жасушаларды Fernández бойынша 5 класқа бөледі.',
      'Images taken with a ×40 objective (×20–×100 is acceptable): bright field, nuclei not clumped, halos fully in frame. The program measures halo width and sorts cells into the 5 Fernández classes.'),
    kinds: ['large', 'medium', 'small', 'none', 'degraded'],
  },
  ai100: {
    name: L('Нейросеть ×100', 'Нейрожелі ×100', 'Neural net ×100'),
    mag: '×100',
    req: L('Только снимки с иммерсионным объективом ×100: одна-три клетки в кадре, гало целиком в кадре. Нейросеть выделяет каждую клетку и делит их на фрагментированные и нефрагментированные.',
      'Тек ×100 иммерсиялық объективпен түсірілген суреттер: кадрда бір-үш жасуша, гало кадрда толық. Нейрожелі әр жасушаны бөліп, фрагменттелген және фрагменттелмеген деп жіктейді.',
      'Only images taken with a ×100 oil-immersion objective: one to three cells per frame, halos fully in frame. The net outlines each cell and labels it fragmented or not fragmented.'),
    kinds: ['ok', 'frag'],
  },
  ai20: {
    name: L('Нейросеть ×20', 'Нейрожелі ×20', 'Neural net ×20'),
    mag: '×20',
    req: L('Снимки с объективом ×20: целое поле с десятками клеток, окраска Райт-Гимза или Diff-Quik; можно снимать через окуляр. Нейросеть находит головки, измеряет гало относительно малой оси ядра и относит клетку к классу Fernández.',
      '×20 объективпен түсірілген суреттер: ондаған жасушасы бар толық өріс, Райт-Гимза немесе Diff-Quik бояуы; окуляр арқылы түсіруге болады. Нейрожелі басшықтарды тауып, галоны ядроның кіші осіне қатысты өлшейді және жасушаны Fernández класына жатқызады.',
      'Images taken with a ×20 objective: a whole field with dozens of cells, Wright-Giemsa or Diff-Quik stain; shooting through the eyepiece is fine. The net finds the heads, measures the halo relative to the nucleus minor axis and assigns a Fernández class.'),
    kinds: ['large', 'medium', 'small', 'none'],
  },
};
const UI_SCD = {
  drop: L('Перетащите снимки SCD-препарата — можно несколько полей', 'SCD препаратының суреттерін сүйреңіз — бірнеше өріс болады', 'Drop SCD slide images — several fields at once'),
  empty: L('Загрузите снимки SCD-теста — одно или несколько полей образца', 'SCD-тест суреттерін жүктеңіз — үлгінің бір немесе бірнеше өрісі', 'Load SCD test images — one or more fields of a sample'),
  emptyReq: L('×20 · ×40 · ×100 — у каждого метода свои требования', '×20 · ×40 · ×100 — әр әдістің өз талаптары бар', '×20 · ×40 · ×100 — each method has its own requirements'),
  edit: L('Клик по ядру — сменить класс', 'Ядроны басу — класты ауыстыру', 'Click a nucleus to change its class'),
  add: L('Добавить пропущенное', 'Өткізілгенді қосу', 'Add a missed one'),
  addAs: L('как', 'ретінде', 'as'),
  coreSens: L('Порог ядра', 'Ядро табалдырығы', 'Nucleus threshold'),
  haloSens: L('Порог гало', 'Гало табалдырығы', 'Halo threshold'),
  redetect: L('Пересчитать поле', 'Өрісті қайта есептеу', 'Re-detect field'),
  total: L('Всего по образцу', 'Үлгі бойынша барлығы', 'Sample total'),
  fields: L('полей', 'өріс', 'fields'),
  counted: L('учтено ядер', 'есепке алынған ядро', 'nuclei counted'),
  low: L('мало ядер: для надёжного DFI нужно ≥ 300–500', 'ядро аз: сенімді DFI үшін ≥ 300–500 керек', 'too few nuclei: ≥ 300–500 are needed for a reliable DFI'),
  interp: [
    [15, L('низкий уровень фрагментации', 'фрагментация деңгейі төмен', 'low fragmentation')],
    [30, L('пограничный уровень', 'шекаралық деңгей', 'borderline')],
    [101, L('высокий уровень фрагментации', 'фрагментация деңгейі жоғары', 'high fragmentation')],
  ],
  interpNote: L('Ориентиры < 15% / 15–30% / ≥ 30% широко используются, но пороги зависят от набора и лаборатории.', '< 15% / 15–30% / ≥ 30% бағдарлары кеңінен қолданылады, бірақ табалдырықтар жинаққа және зертханаға байланысты.', 'Cut-offs of < 15% / 15–30% / ≥ 30% are widely used, but they depend on the kit and the lab.'),
  formula: L('DFI = фрагментированные (малое гало + без гало + дегенеративные) ÷ все учтённые ядра × 100%', 'DFI = фрагменттелгендер (кіші гало + галосыз + дегенеративті) ÷ барлық есепке алынған ядро × 100%', 'DFI = fragmented (small halo + no halo + degraded) ÷ all counted nuclei × 100%'),
  copy: L('Копировать отчёт', 'Есепті көшіру', 'Copy report'),
  copied: L('Скопировано', 'Көшірілді', 'Copied'),
  csv: L('Скачать CSV', 'CSV жүктеу', 'Download CSV'),
  busy: L('Анализ…', 'Талдау…', 'Analysing…'),
  method: L('Метод', 'Әдіс', 'Method'),
  req: L('Требования к снимкам', 'Суреттерге талаптар', 'Image requirements'),
  load: L('Загрузка нейросети', 'Нейрожелі жүктелуде', 'Loading the neural net'),
  run: L('Нейросеть считает…', 'Нейрожелі санауда…', 'The neural net is counting…'),
  found: L('найдено клеток', 'табылған жасуша', 'cells found'),
  conf: L('Порог уверенности нейросети', 'Нейрожелі сенімділік табалдырығы', 'Neural-net confidence threshold'),
  none100: L('Клеток не найдено. Эта нейросеть работает только со снимками ×100 (одна-три клетки в кадре). Для полей с малым увеличением выберите «Нейросеть ×20» или классический метод.', 'Жасуша табылмады. Бұл нейрожелі тек ×100 суреттермен жұмыс істейді (кадрда бір-үш жасуша). Аз үлкейтілген өрістер үшін «Нейрожелі ×20» немесе классикалық әдісті таңдаңыз.', 'No cells found. This net only works with ×100 images (one to three cells per frame). For low-magnification fields choose “Neural net ×20” or the classic method.'),
  none20: L('Клеток не найдено. Эта нейросеть рассчитана на целое поле ×20 с десятками клеток. Для снимков ×100 выберите «Нейросеть ×100».', 'Жасуша табылмады. Бұл нейрожелі ондаған жасушасы бар толық ×20 өріске арналған. ×100 суреттер үшін «Нейрожелі ×100» таңдаңыз.', 'No cells found. This net expects a whole ×20 field with dozens of cells. For ×100 images choose “Neural net ×100”.'),
  edge100: L('Клетки с крупным гало у края кадра нейросеть иногда пропускает — проверьте поле и добавьте их вручную.', 'Кадр шетіндегі үлкен гало жасушаларын нейрожелі кейде өткізіп алады — өрісті тексеріп, қолмен қосыңыз.', 'The net sometimes misses large-halo cells at the edge of the frame — check the field and add them by hand.'),
  offline: L('В этом файле нейросетей нет. Откройте сайт BOPASI или полную версию BOPASI-full.html.', 'Бұл файлда нейрожелілер жоқ. BOPASI сайтын немесе толық BOPASI-full.html нұсқасын ашыңыз.', 'This file has no neural nets. Open the BOPASI website or the full BOPASI-full.html.'),
  fail: L('Нейросеть не запустилась', 'Нейрожелі іске қосылмады', 'The neural net failed to start'),
  samples: L('Образцы', 'Үлгілер', 'Samples'),
  sample: L('Образец', 'Үлгі', 'Sample'),
  newSample: L('Новый образец', 'Жаңа үлгі', 'New sample'),
  removeField: L('Убрать снимок', 'Суретті алып тастау', 'Remove image'),
  compare: L('Сравнение методов', 'Әдістерді салыстыру', 'Method comparison'),
  runAll: L('Посчитать всеми методами', 'Барлық әдіспен есептеу', 'Count with every method'),
  notRun: L('не считали', 'есептелмеді', 'not run'),
  cells: L('клеток', 'жасуша', 'cells'),
  bySample: L('DFI по образцам', 'Үлгілер бойынша DFI', 'DFI by sample'),
};
const SCD_MAX = 1400, SCD_FULL = 4096;

function mountScd(root) {
  const saved = store.get('scdMethod');
  const st = { samples: [{ name: '', fields: [] }], cur: 0, sel: 0, addMode: false, addCls: 'none', coreSens: 1, haloSens: 1,
    method: SCD_METHODS.includes(saved) ? saved : saved === 'ai' ? 'ai100' : 'classic', msg: '', conf: 0.1, busy: false };
  let alive = true;
  const S = () => st.samples[st.cur];
  const F = () => S().fields[st.sel];
  const sName = (s, i) => s.name || `${tr(UI_SCD.sample)} ${i + 1}`;
  const res = (f, m = st.method) => f.res[m] || { cells: [] };
  const kinds = (m = st.method) => SCD_M[m].kinds;
  const order = (m = st.method) => (m === 'ai100' ? SCD.AI_CLASSES : SCD.CLASSES);

  const msgEl = h('p', { class: 'hint scd-ai-note', 'aria-live': 'polite' });
  const reqEl = h('div', { class: 'scd-req' });
  const segBtns = SCD_METHODS.map((m) => h('button', { type: 'button', onclick: () => setMethod(m) }, tr(SCD_M[m].name)));
  const seg = h('div', { class: 'seg seg-3', role: 'group', 'aria-label': tr(UI_SCD.method) }, ...segBtns);
  const canvas = h('canvas', { class: 'scd-canvas', tabindex: 0 });
  const note = h('p', { class: 'rc-note' });
  const thumbs = h('div', { class: 'rc-thumbs' });
  const legend = h('div', { class: 'scd-legend' });
  const result = h('div', { class: 'scd-result', 'aria-live': 'polite' });
  const compare = h('div', { class: 'scd-compare' });
  const sampleBar = h('div', { class: 'scd-samples', role: 'tablist', 'aria-label': tr(UI_SCD.samples) });
  const fileIn = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: (e) => { addFiles([...e.target.files]); e.target.value = ''; } });
  const addBtn = h('button', { class: 'btn-ghost', onclick: () => { st.addMode = !st.addMode; sync(); } });
  const addSel = h('select', { 'aria-label': tr(UI_SCD.addAs), onchange: (e) => { st.addCls = e.target.value; } });
  const sl = (key, label) => {
    const out = h('output');
    const inp = h('input', { type: 'range', min: 0.6, max: 1.5, step: 0.05, value: st[key], oninput: (e) => { st[key] = +e.target.value; out.textContent = st[key].toFixed(2); } });
    out.textContent = st[key].toFixed(2);
    return h('label', { class: 'ctl' }, h('div', { class: 'ctl-row' }, h('span', {}, tr(label)), out), inp);
  };
  const classicCtl = h('div', { class: 'scd-ctl' }, sl('coreSens', UI_SCD.coreSens), sl('haloSens', UI_SCD.haloSens));
  const confOut = h('output', {}, st.conf.toFixed(2));
  const aiCtl = h('label', { class: 'ctl' }, h('div', { class: 'ctl-row' }, h('span', {}, tr(UI_SCD.conf)), confOut),
    h('input', { type: 'range', min: 0.05, max: 0.6, step: 0.05, value: st.conf, oninput: (e) => { st.conf = +e.target.value; confOut.textContent = st.conf.toFixed(2); },
      onchange: () => redetect() }));
  const emptyBox = h('button', { type: 'button', class: 'scd-empty', onclick: () => fileIn.click() }, h('strong', {}, tr(UI_SCD.empty)), h('span', {}, tr(UI_SCD.emptyReq)), h('span', {}, 'JPG · PNG'));
  const drop = h('div', { class: 'drop', tabindex: 0, onclick: () => fileIn.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') fileIn.click(); } },
    h('strong', {}, tr(UI_SCD.drop)), h('span', {}, 'JPG · PNG · WebP'));
  ['dragover', 'dragenter'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  root.addEventListener('drop', (e) => addFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))));
  const runAllBtn = h('button', { class: 'btn-ghost', onclick: () => runAll() }, tr(UI_SCD.runAll));

  root.append(h('div', { class: 'scd' },
    h('div', { class: 'scd-main' }, sampleBar, h('div', { class: 'scd-stage' }, canvas, emptyBox), note, thumbs, legend),
    h('div', { class: 'scd-side' },
      h('div', { class: 'ctl' }, h('div', { class: 'ctl-row' }, h('span', {}, tr(UI_SCD.method))), seg), reqEl, msgEl, result,
      h('div', { class: 'row' }, addBtn, addSel),
      h('p', { class: 'hint' }, tr(UI_SCD.edit)),
      classicCtl, aiCtl,
      h('button', { class: 'btn-ghost', onclick: () => redetect() }, tr(UI_SCD.redetect)),
      compare,
      drop, fileIn)));

  // ── расчёт одного поля выбранным методом
  async function analyse(f, m, force) {
    if (f.res[m] && !force) return;
    if (m === 'classic') { f.res.classic = SCD.detect(SCD.prepare(f.img), { coreSens: st.coreSens, haloSens: st.haloSens }); return; }
    const net = m === 'ai100' ? SCD_AI : SCD_AI20;
    try {
      if (!net.ready()) { st.msg = tr(UI_SCD.load) + '…'; paintMsg(); }
      const prog = (p) => { st.msg = `${tr(UI_SCD.load)} · ${Math.round(p * 100)}%`; paintMsg(); };
      if (m === 'ai100') {
        const out = await SCD_AI.detect(f.canvas, { conf: st.conf, onProgress: prog });
        const cells = SCD_AI.toCells(out.cells);
        const areas = cells.map((c) => c.area).sort((x, y) => x - y);
        f.res.ai100 = { cells, M: areas.length ? areas[areas.length >> 1] * 0.25 : 0, ms: out.ms };
      } else {
        // для ×20 — снимок в полном разрешении; координаты возвращаем в масштаб показа
        if (f.fld === undefined) f.fld = SCD.prepare(f.img).field || null;
        const q = f.full.width / f.canvas.width;
        const field = f.fld ? { cx: f.fld.cx * q, cy: f.fld.cy * q, r: f.fld.r * q } : null;
        const out = await SCD_AI20.detect(f.full, { field, onProgress: prog, onTile: (p) => { st.msg = `${tr(UI_SCD.run)} ${Math.round(p * 100)}%`; paintMsg(); } });
        const cells = out.cells.map((c) => ({ ...c, x: c.x / q, y: c.y / q, major: c.major / q, minor: c.minor / q, halo: c.halo / q, area: c.area / (q * q) }));
        const areas = cells.map((c) => c.area).sort((x, y) => x - y);
        f.res.ai20 = { cells, M: areas.length ? areas[areas.length >> 1] : 0, ms: out.ms };
      }
      st.msg = '';
    } catch (e) {
      st.msg = String(e && e.message) === 'offline' ? tr(UI_SCD.offline) : `${tr(UI_SCD.fail)}: ${e && e.message || e}`;
      f.res[m] = { cells: [], failed: true };
    }
  }
  async function ensure(m, fields) {
    for (const f of fields) { if (!alive) return; if (!f.res[m]) { if (m !== 'classic') { st.msg = tr(UI_SCD.run); paintMsg(); } await analyse(f, m); await new Promise((r) => setTimeout(r)); } }
  }
  async function busy(fn) { st.busy = true; sync(); try { await fn(); } finally { st.busy = false; if (alive) { draw(); sync(); } } }
  function setMethod(m) {
    st.method = m; store.set('scdMethod', m); st.msg = ''; sync();
    busy(() => ensure(m, S().fields));
  }
  function redetect() {
    const f = F(); if (!f) return;
    busy(() => analyse(f, st.method, true));
  }
  function runAll() {
    busy(async () => { for (const m of SCD_METHODS) for (const s of st.samples) await ensure(m, s.fields); });
  }
  async function addFiles(files) {
    if (!files.length) return;
    result.textContent = tr(UI_SCD.busy);
    const fresh = [];
    for (const file of files) {
      try {
        const full = await fileToCanvasMax(file, SCD_FULL);
        const canvasSrc = document.createElement('canvas'), s = Math.min(1, SCD_MAX / Math.max(full.width, full.height));
        canvasSrc.width = Math.round(full.width * s); canvasSrc.height = Math.round(full.height * s);
        canvasSrc.getContext('2d').drawImage(full, 0, 0, canvasSrc.width, canvasSrc.height);
        const img = canvasSrc.getContext('2d').getImageData(0, 0, canvasSrc.width, canvasSrc.height);
        const t = document.createElement('canvas'), ts = 96 / Math.max(canvasSrc.width, canvasSrc.height);
        t.width = canvasSrc.width * ts; t.height = canvasSrc.height * ts; t.getContext('2d').drawImage(canvasSrc, 0, 0, t.width, t.height);
        const f = { name: file.name, canvas: canvasSrc, full, img, thumb: t.toDataURL(), res: {} };
        S().fields.push(f); fresh.push(f);
      } catch {}
    }
    st.sel = Math.max(0, S().fields.length - fresh.length);
    busy(() => ensure(st.method, fresh));
  }
  function addSample() { st.samples.push({ name: '', fields: [] }); st.cur = st.samples.length - 1; st.sel = 0; draw(); sync(); }
  function removeField(i) {
    S().fields.splice(i, 1); st.sel = Math.min(st.sel, Math.max(0, S().fields.length - 1));
    if (!S().fields.length && st.samples.length > 1) { st.samples.splice(st.cur, 1); st.cur = Math.max(0, st.cur - 1); }
    draw(); sync();
  }

  function draw() {
    const f = F(); if (!f) return;
    canvas.width = f.canvas.width; canvas.height = f.canvas.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(f.canvas, 0, 0);
    const lw = Math.max(1.5, f.canvas.width / 700), cells = res(f).cells;
    for (const c of cells) if (c.mask) {   // маска нейросети — полупрозрачная заливка
      ctx.fillStyle = SCD_COL[c.cls]; ctx.globalAlpha = 0.22; const q = Math.max(1, f.canvas.width / 1024 * 4);
      for (let i = 0; i < c.mask.length; i += 2) ctx.fillRect(c.mask[i] - q / 2, c.mask[i + 1] - q / 2, q, q);
      ctx.globalAlpha = 1;
    }
    for (const c of cells) {
      const col = SCD_COL[c.cls];
      ctx.save(); ctx.translate(c.x, c.y);
      if (c.halo > 0 && c.cls !== 'excluded') { ctx.setLineDash([4, 4]); ctx.strokeStyle = col; ctx.globalAlpha = 0.55; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.arc(0, 0, c.minor / 2 + c.halo, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
      ctx.rotate(c.angle); ctx.strokeStyle = col; ctx.lineWidth = lw * 1.4;
      if (c.cls === 'excluded') ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.ellipse(0, 0, Math.max(3, c.major / 2 + 2), Math.max(3, c.minor / 2 + 2), 0, 0, 6.283); ctx.stroke();
      ctx.restore();
    }
  }
  function paintMsg() {
    const f = F(), r = f && f.res[st.method];
    let t = st.msg;
    if (!t && r && st.method !== 'classic' && !r.failed) {
      t = `${tr(SCD_M[st.method].name)}: ${tr(UI_SCD.found)} ${r.cells.length}` + (r.ms ? ` · ${(r.ms / 1000).toFixed(1)} s` : '') + '.';
      if (!r.cells.length) t += ' ' + tr(st.method === 'ai100' ? UI_SCD.none100 : UI_SCD.none20);
      else if (st.method === 'ai100') t += ' ' + tr(UI_SCD.edge100);
    }
    msgEl.textContent = t || '';
  }
  const sumOf = (fields, m) => SCD.summary(fields.flatMap((x) => res(x, m).cells));
  const done = (fields, m) => fields.length && fields.every((x) => x.res[m]);
  function sync() {
    const f = F(), s = S();
    canvas.hidden = !f; emptyBox.hidden = !!f;
    addBtn.textContent = (st.addMode ? '− ' : '+ ') + tr(UI_SCD.add); addBtn.classList.toggle('on', st.addMode);
    segBtns.forEach((b, i) => { b.classList.toggle('on', SCD_METHODS[i] === st.method); b.disabled = st.busy; });
    runAllBtn.disabled = st.busy;
    reqEl.replaceChildren(h('span', { class: 'k' }, `${tr(UI_SCD.req)} · ${SCD_M[st.method].mag}`), h('p', {}, tr(SCD_M[st.method].req)));
    classicCtl.hidden = st.method !== 'classic'; aiCtl.hidden = st.method !== 'ai100';
    if (!kinds().includes(st.addCls)) st.addCls = st.method === 'ai100' ? 'frag' : 'none';
    addSel.replaceChildren(...kinds().map((k) => h('option', { value: k, selected: k === st.addCls }, tr(SCD_NAME[k]))));
    paintMsg();
    canvas.style.cursor = st.addMode ? 'crosshair' : 'pointer';
    note.textContent = f ? `${f.name} · ${f.full.width}×${f.full.height}` : '';
    // вкладки образцов
    sampleBar.replaceChildren(...st.samples.map((x, i) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(i === st.cur), class: 'tab' + (i === st.cur ? ' on' : ''),
      onclick: () => { st.cur = i; st.sel = 0; draw(); sync(); if (!st.busy) busy(() => ensure(st.method, S().fields)); } }, `${sName(x, i)} · ${x.fields.length}`)),
      h('button', { type: 'button', class: 'tab add', onclick: addSample }, '+ ' + tr(UI_SCD.newSample)));
    thumbs.replaceChildren(...s.fields.map((x, i) => h('span', { class: 'thumb-w' },
      h('button', { class: 'thumb' + (i === st.sel ? ' on' : ''), title: x.name, onclick: () => { st.sel = i; draw(); sync(); } }, h('img', { src: x.thumb, alt: x.name })),
      h('button', { class: 'thumb-x', title: tr(UI_SCD.removeField), 'aria-label': tr(UI_SCD.removeField), onclick: () => removeField(i) }, '×'))));
    const tot = sumOf(s.fields, st.method);
    const cur = f ? SCD.summary(res(f).cells) : null;
    legend.replaceChildren(...[...kinds(), 'excluded'].map((k) => h('span', { class: 'lg' }, h('i', { style: `border-color:${SCD_COL[k]}` + (k === 'excluded' ? ';border-style:dashed' : '') }), `${tr(SCD_NAME[k])}: ${cur ? cur.n[k] : 0}`)));
    const verdict = UI_SCD.interp.find(([lim]) => tot.dfi < lim)[1];
    result.replaceChildren(
      h('div', { class: 'big' }, h('span', { class: 'k' }, `DFI · ${sName(s, st.cur)} · ${tr(SCD_M[st.method].name)}`), h('strong', {}, st.busy && !tot.counted ? '…' : `${num(tot.dfi)}%`), h('span', { class: 's' }, `${tot.frag} / ${tot.counted} · ${s.fields.length} ${tr(UI_SCD.fields)}`)),
      h('div', { class: 'scd-bars' }, ...kinds().map((k) => {
        const pct = tot.counted ? (tot.n[k] / tot.counted) * 100 : 0;
        return h('div', { class: 'bar' }, h('span', {}, tr(SCD_NAME[k])), h('div', { class: 'track' }, h('i', { style: `width:${pct}%;background:${SCD_COL[k]}` })), h('b', {}, `${tot.n[k]} · ${num(pct, 0)}%`));
      })),
      line(tr(L('Оценка', 'Бағалау', 'Assessment')), tr(verdict), tot.dfi < 15 ? 'good' : 'warn'),
      tot.counted < 300 ? h('p', { class: 'hint' }, `${tot.counted} ${tr(UI_SCD.counted)} — ${tr(UI_SCD.low)}`) : null,
      h('p', { class: 'hint' }, tr(UI_SCD.formula)),
      h('p', { class: 'hint' }, tr(UI_SCD.interpNote)),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: (e) => copyReport(e.target) }, tr(UI_SCD.copy)),
        h('button', { class: 'btn-ghost', onclick: () => saveCsv() }, tr(UI_SCD.csv))));
    // сравнение методов по текущему образцу и сводка по всем образцам
    const cell = (fields, m) => (done(fields, m) ? (() => { const t = sumOf(fields, m); return `${num(t.dfi)}% · ${t.counted}`; })() : '—');
    const multi = st.samples.filter((x) => x.fields.length).length > 1;
    compare.replaceChildren(...[
      h('span', { class: 'k' }, `${tr(UI_SCD.compare)} · ${sName(s, st.cur)}`),
      h('table', { class: 'scd-table' },
        h('thead', {}, h('tr', {}, h('th', {}, tr(UI_SCD.method)), h('th', {}, tr(L('Увел.', 'Үлкейту', 'Mag.'))), h('th', {}, `DFI · ${tr(UI_SCD.cells)}`))),
        h('tbody', {}, ...SCD_METHODS.map((m) => h('tr', { class: m === st.method ? 'on' : '' }, h('td', {}, tr(SCD_M[m].name)), h('td', {}, SCD_M[m].mag), h('td', {}, cell(s.fields, m)))))),
      multi ? h('span', { class: 'k' }, tr(UI_SCD.bySample)) : null,
      multi ? h('table', { class: 'scd-table' },
        h('thead', {}, h('tr', {}, h('th', {}, tr(UI_SCD.sample)), ...SCD_METHODS.map((m) => h('th', {}, SCD_M[m].mag)))),
        h('tbody', {}, ...st.samples.map((x, i) => (x.fields.length ? h('tr', { class: i === st.cur ? 'on' : '' }, h('td', {}, sName(x, i)), ...SCD_METHODS.map((m) => h('td', {}, done(x.fields, m) ? `${num(sumOf(x.fields, m).dfi)}%` : '—'))) : null)))) : null,
      s.fields.length ? runAllBtn : null].filter(Boolean));
  }
  function report() {
    const out = [];
    st.samples.forEach((s, i) => {
      if (!s.fields.length) return;
      out.push(`${sName(s, i)} — ${s.fields.length} ${tr(UI_SCD.fields)}`);
      for (const m of SCD_METHODS) {
        if (!done(s.fields, m)) continue;
        const t = sumOf(s.fields, m);
        out.push(`  ${tr(SCD_M[m].name)} (${SCD_M[m].mag}): DFI ${num(t.dfi)}% (${t.frag} / ${t.counted}); ` + kinds(m).map((k) => `${tr(SCD_NAME[k])} ${t.n[k]}`).join(', '));
      }
    });
    out.push(tr(UI_SCD.formula));
    return out.join('\n');
  }
  async function copyReport(btn) {
    const txt = report();
    try { await navigator.clipboard.writeText(txt); btn.textContent = tr(UI_SCD.copied); setTimeout(() => (btn.textContent = tr(UI_SCD.copy)), 1600); }
    catch { download('scd-report.txt', txt); }
  }
  function saveCsv() {
    const ks = ['large', 'medium', 'small', 'none', 'degraded', 'ok', 'frag', 'excluded'];
    const head = ['sample', 'method', 'magnification', 'field', ...ks, 'counted', 'fragmented', 'DFI_%'];
    const row = (sn, m, name, t) => [sn, m, SCD_M[m].mag, name, ...ks.map((k) => t.n[k]), t.counted, t.frag, t.dfi.toFixed(1)];
    const rows = [];
    st.samples.forEach((s, i) => {
      for (const m of SCD_METHODS) {
        if (!done(s.fields, m)) continue;
        for (const f of s.fields) rows.push(row(sName(s, i), m, f.name, SCD.summary(res(f, m).cells)));
        rows.push(row(sName(s, i), m, 'TOTAL', sumOf(s.fields, m)));
      }
    });
    const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
    download('scd-dfi.csv', [head, ...rows].map((r) => r.map(q).join(',')).join('\n'), 'text/csv');
  }
  canvas.addEventListener('click', (e) => {
    const f = F(); if (!f || !f.res[st.method]) return;
    const r = f.res[st.method];
    const b = canvas.getBoundingClientRect(), x = (e.clientX - b.left) * (canvas.width / b.width), y = (e.clientY - b.top) * (canvas.height / b.height);
    let hit = null, hd = 1e9;
    for (const c of r.cells) { const d = Math.hypot(c.x - x, c.y - y); if (d < Math.max(10, c.major / 2 + 6) && d < hd) { hd = d; hit = c; } }
    if (st.addMode && !hit) {
      const m = r.M ? Math.sqrt(r.M / Math.PI) * 2 : 10;
      r.cells.push({ x, y, major: m * 1.4, minor: m, angle: 0, halo: 0, cls: st.addCls, manual: true });
    } else if (hit) {
      const ord = order().filter((k) => k === 'excluded' || kinds().includes(k)), i = ord.indexOf(hit.cls);
      hit.cls = ord[(i + 1) % ord.length];
    } else return;
    draw(); sync();
  });

  sync();
  return { destroy() { alive = false; } };
}

function fileToCanvasMax(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); resolve(c);
    };
    img.onerror = reject; img.src = URL.createObjectURL(file);
  });
}
