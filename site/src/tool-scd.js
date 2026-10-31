// ─── Инструмент: SCD / Halo-тест — индекс фрагментации ДНК ───────────────────
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
const UI_SCD = {
  drop: L('Перетащите снимки SCD-препарата — можно несколько полей', 'SCD препаратының суреттерін сүйреңіз — бірнеше өріс болады', 'Drop SCD slide images — several fields at once'),
  sample: L('Открыть пример', 'Мысалды ашу', 'Load sample'),
  sampleNote: L('Пример: синтетическое поле SCD с известными классами', 'Мысал: белгілі кластары бар синтетикалық SCD өрісі', 'Sample: a synthetic SCD field with known classes'),
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
  copy: L('Копировать отчёт', 'Есепті көшіру', 'Copy report'),
  copied: L('Скопировано', 'Көшірілді', 'Copied'),
  csv: L('Скачать CSV', 'CSV жүктеу', 'Download CSV'),
  busy: L('Анализ…', 'Талдау…', 'Analysing…'),
  method: L('Метод', 'Әдіс', 'Method'),
  classic: L('Классический', 'Классикалық', 'Classic'),
  ai: L('Нейросеть', 'Нейрожелі', 'Neural net'),
  aiLoad: L('Загрузка нейросети', 'Нейрожелі жүктелуде', 'Loading the neural net'),
  aiRun: L('Нейросеть ищет клетки…', 'Нейрожелі жасушаларды іздеуде…', 'The neural net is finding cells…'),
  aiDone: L('Нейросеть: найдено клеток', 'Нейрожелі: табылған жасушалар', 'Neural net: cells found'),
  aiConf: L('Порог уверенности нейросети', 'Нейрожелі сенімділік табалдырығы', 'Neural-net confidence threshold'),
  aiOffline: L('Нейросеть работает только на сайте BOPASI (в офлайн-файле её нет).', 'Нейрожелі тек BOPASI сайтында жұмыс істейді (офлайн файлда жоқ).', 'The neural net runs only on the BOPASI website (not in the offline file).'),
  aiFail: L('Нейросеть не запустилась', 'Нейрожелі іске қосылмады', 'The neural net failed to start'),
  aiSample: L('Нейросеть обучена на настоящих микроснимках; на синтетическом примере она клеток не находит. Загрузите свой снимок.', 'Нейрожелі нақты микросуреттерде оқытылған; синтетикалық мысалда жасуша таппайды. Өз суретіңізді жүктеңіз.', 'The neural net was trained on real micrographs and finds no cells in the synthetic sample. Load your own image.'),
  aiAbout: L('YOLOv8s-seg, обучена на 2000 снимках SCD при большом увеличении (Ornelas Nande и соавт., 2026, CC BY 4.0). Два класса: фрагментирована / нет; подклассы гало по Fernández — в классическом режиме. Клетки с крупным гало у края кадра нейросеть иногда пропускает: проверьте поле и добавьте их вручную.', 'YOLOv8s-seg, 2000 жоғары үлкейтілген SCD суретінде оқытылған (Ornelas Nande және бірл., 2026, CC BY 4.0). Екі класс: фрагменттелген / жоқ; Fernández бойынша гало ішкі кластары — классикалық режимде. Кадр шетіндегі үлкен гало жасушаларын нейрожелі кейде өткізіп алады: өрісті тексеріп, қолмен қосыңыз.', 'YOLOv8s-seg trained on 2,000 high-magnification SCD images (Ornelas Nande et al., 2026, CC BY 4.0). Two classes: fragmented / not; Fernández halo subclasses are in classic mode. The net sometimes misses large-halo cells at the edge of the frame: check the field and add them by hand.'),
};
const SCD_MAX = 1400;

function mountScd(root) {
  const st = { fields: [], sel: 0, addMode: false, addCls: 'none', coreSens: 1, haloSens: 1, method: store.get('scdMethod') === 'ai' ? 'ai' : 'classic', aiMsg: '', aiConf: 0.1 };
  let alive = true;
  const aiNote = h('p', { class: 'hint scd-ai-note', 'aria-live': 'polite' });
  const segBtns = ['classic', 'ai'].map((m) => h('button', { type: 'button', onclick: () => setMethod(m) }, tr(UI_SCD[m])));
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': tr(UI_SCD.method) }, ...segBtns);
  const canvas = h('canvas', { class: 'scd-canvas', tabindex: 0 });
  const note = h('p', { class: 'rc-note' });
  const thumbs = h('div', { class: 'rc-thumbs' });
  const legend = h('div', { class: 'scd-legend' });
  const result = h('div', { class: 'scd-result', 'aria-live': 'polite' });
  const fileIn = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: (e) => addFiles([...e.target.files]) });
  const addBtn = h('button', { class: 'btn-ghost', onclick: () => { st.addMode = !st.addMode; sync(); } });
  const addSel = h('select', { 'aria-label': tr(UI_SCD.addAs), onchange: (e) => { st.addCls = e.target.value; } });
  const kinds = () => (st.method === 'ai' ? ['ok', 'frag'] : ['large', 'medium', 'small', 'none', 'degraded']);
  const order = () => (st.method === 'ai' ? SCD.AI_CLASSES : SCD.CLASSES);
  const sl = (key, label) => {
    const out = h('output');
    const inp = h('input', { type: 'range', min: 0.6, max: 1.5, step: 0.05, value: st[key], oninput: (e) => { st[key] = +e.target.value; out.textContent = st[key].toFixed(2); } });
    out.textContent = st[key].toFixed(2);
    return h('label', { class: 'ctl' }, h('div', { class: 'ctl-row' }, h('span', {}, tr(label)), out), inp);
  };
  const classicCtl = h('div', { class: 'scd-ctl' }, sl('coreSens', UI_SCD.coreSens), sl('haloSens', UI_SCD.haloSens));
  const confOut = h('output', {}, st.aiConf.toFixed(2));
  const aiCtl = h('label', { class: 'ctl' }, h('div', { class: 'ctl-row' }, h('span', {}, tr(UI_SCD.aiConf)), confOut),
    h('input', { type: 'range', min: 0.05, max: 0.6, step: 0.05, value: st.aiConf, oninput: (e) => { st.aiConf = +e.target.value; confOut.textContent = st.aiConf.toFixed(2); },
      onchange: async () => { const f = st.fields[st.sel]; if (f && st.method === 'ai') { await analyse(f); draw(); sync(); } } }));
  const drop = h('div', { class: 'drop', tabindex: 0, onclick: () => fileIn.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') fileIn.click(); } },
    h('strong', {}, tr(UI_SCD.drop)), h('span', {}, 'JPG · PNG · WebP'));
  ['dragover', 'dragenter'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  root.addEventListener('drop', (e) => addFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))));

  root.append(h('div', { class: 'scd' },
    h('div', { class: 'scd-main' }, h('div', { class: 'scd-stage' }, canvas), note, thumbs, legend),
    h('div', { class: 'scd-side' }, h('div', { class: 'ctl' }, h('div', { class: 'ctl-row' }, h('span', {}, tr(UI_SCD.method))), seg), aiNote, result,
      h('div', { class: 'row' }, addBtn, addSel),
      h('p', { class: 'hint' }, tr(UI_SCD.edit)),
      classicCtl, aiCtl,
      h('button', { class: 'btn-ghost', onclick: async () => { const f = st.fields[st.sel]; if (f) { await analyse(f); draw(); sync(); } } }, tr(UI_SCD.redetect)),
      drop, h('button', { class: 'btn-link', onclick: loadSample }, tr(UI_SCD.sample)), fileIn)));

  async function analyse(f) {
    const classicOf = () => SCD.detect(SCD.prepare(f.img), { coreSens: st.coreSens, haloSens: st.haloSens });
    if (st.method !== 'ai') { f.res = classicOf(); f.ai = null; return; }
    const classic = { cells: [], M: 0 };
    try {
      if (!SCD_AI.ready()) { st.aiMsg = tr(UI_SCD.aiLoad) + '…'; sync(); }
      const out = await SCD_AI.detect(f.canvas, { conf: st.aiConf, onProgress: (p) => { st.aiMsg = `${tr(UI_SCD.aiLoad)} · ${Math.round(p * 100)}%`; aiNote.textContent = st.aiMsg; } });
      const cells = SCD_AI.toCells(out.cells);
      const areas = cells.map((c) => c.area).sort((x, y) => x - y);
      f.res = { ...classic, cells, M: areas.length ? areas[areas.length >> 1] * 0.25 : 0 }; f.ai = { n: cells.length, ms: out.ms };
      st.aiMsg = '';
    } catch (e) {
      f.res = classicOf(); f.ai = null;
      st.aiMsg = String(e && e.message) === 'offline' ? tr(UI_SCD.aiOffline) : `${tr(UI_SCD.aiFail)}: ${e && e.message || e}`;
    }
  }
  async function setMethod(m) {
    st.method = m; store.set('scdMethod', m); sync();
    if (m === 'ai') { st.aiMsg = tr(UI_SCD.aiRun); sync(); }
    for (const f of st.fields) { await analyse(f); if (!alive) return; }
    draw(); sync();
  }
  async function addField(canvasSrc, name, sample) {
    const ctx = canvasSrc.getContext('2d');
    const f = { name, sample, canvas: canvasSrc, img: ctx.getImageData(0, 0, canvasSrc.width, canvasSrc.height), res: { cells: [] } };
    st.fields.push(f); await analyse(f);
    const t = document.createElement('canvas'), s = 96 / Math.max(canvasSrc.width, canvasSrc.height);
    t.width = canvasSrc.width * s; t.height = canvasSrc.height * s; t.getContext('2d').drawImage(canvasSrc, 0, 0, t.width, t.height); f.thumb = t.toDataURL();
    return f;
  }
  async function addFiles(files) {
    if (!files.length) return;
    st.fields = st.fields.filter((f) => !f.sample);
    result.textContent = tr(UI_SCD.busy);
    if (st.method === 'ai') { st.aiMsg = tr(UI_SCD.aiRun); sync(); }
    for (const file of files) { try { const c = await fileToCanvasMax(file, SCD_MAX); await addField(c, file.name, false); } catch {} await new Promise((r) => setTimeout(r)); }
    st.sel = Math.max(0, st.fields.length - files.length); draw(); sync();
  }
  async function loadSample() {
    st.fields = st.fields.filter((f) => !f.sample);
    const { img } = SCD.synth({ seed: 7 });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    c.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
    st.sel = st.fields.length; await addField(c, 'scd-sample.png', true); st.sel = st.fields.length - 1; draw(); sync();
  }
  function draw() {
    const f = st.fields[st.sel]; if (!f) return;
    canvas.width = f.canvas.width; canvas.height = f.canvas.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(f.canvas, 0, 0);
    const lw = Math.max(1.5, f.canvas.width / 700);
    for (const c of f.res.cells) if (c.mask) {   // маска нейросети — полупрозрачная заливка
      ctx.fillStyle = SCD_COL[c.cls]; ctx.globalAlpha = 0.22; const q = Math.max(1, f.canvas.width / 1024 * 4);
      for (let i = 0; i < c.mask.length; i += 2) ctx.fillRect(c.mask[i] - q / 2, c.mask[i + 1] - q / 2, q, q);
      ctx.globalAlpha = 1;
    }
    for (const c of f.res.cells) {
      const col = SCD_COL[c.cls];
      ctx.save(); ctx.translate(c.x, c.y);
      if (c.halo > 0 && c.cls !== 'excluded') { ctx.setLineDash([4, 4]); ctx.strokeStyle = col; ctx.globalAlpha = 0.55; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.arc(0, 0, c.major / 2 + c.halo, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
      ctx.rotate(c.angle); ctx.strokeStyle = col; ctx.lineWidth = lw * 1.4;
      if (c.cls === 'excluded') ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.ellipse(0, 0, Math.max(3, c.major / 2 + 2), Math.max(3, c.minor / 2 + 2), 0, 0, 6.283); ctx.stroke();
      ctx.restore();
    }
  }
  function sync() {
    const f = st.fields[st.sel];
    addBtn.textContent = (st.addMode ? '− ' : '+ ') + tr(UI_SCD.add); addBtn.classList.toggle('on', st.addMode);
    segBtns.forEach((b, i) => b.classList.toggle('on', ['classic', 'ai'][i] === st.method));
    classicCtl.hidden = st.method === 'ai'; aiCtl.hidden = st.method !== 'ai';
    if (!kinds().includes(st.addCls)) st.addCls = st.method === 'ai' ? 'frag' : 'none';
    addSel.replaceChildren(...kinds().map((k) => h('option', { value: k, selected: k === st.addCls }, tr(SCD_NAME[k]))));
    aiNote.textContent = st.method !== 'ai' ? '' : st.aiMsg || (f && f.ai ? `${tr(UI_SCD.aiDone)}: ${f.ai.n} · ${(f.ai.ms / 1000).toFixed(1)} s` + '. ' + (f.sample && !f.ai.n ? tr(UI_SCD.aiSample) + ' ' : '') + tr(UI_SCD.aiAbout) : '');
    canvas.style.cursor = st.addMode ? 'crosshair' : 'pointer';
    note.textContent = f ? (f.sample ? tr(UI_SCD.sampleNote) : `${f.name} · ${f.canvas.width}×${f.canvas.height}`) : '';
    thumbs.replaceChildren(...(st.fields.length > 1 ? st.fields.map((x, i) => h('button', { class: 'thumb' + (i === st.sel ? ' on' : ''), title: x.name, onclick: () => { st.sel = i; draw(); sync(); } }, h('img', { src: x.thumb, alt: x.name }))) : []));
    const tot = SCD.summary(st.fields.flatMap((x) => x.res.cells));
    const cur = f ? SCD.summary(f.res.cells) : null;
    legend.replaceChildren(...order().map((k) => h('span', { class: 'lg' }, h('i', { style: `border-color:${SCD_COL[k]}` + (k === 'excluded' ? ';border-style:dashed' : '') }), `${tr(SCD_NAME[k])}: ${cur ? cur.n[k] : 0}`)));
    const verdict = UI_SCD.interp.find(([lim]) => tot.dfi < lim)[1];
    result.replaceChildren(
      h('div', { class: 'big' }, h('span', { class: 'k' }, `DFI · ${tr(UI_SCD.total)}`), h('strong', {}, `${num(tot.dfi)}%`), h('span', { class: 's' }, `${tot.frag} / ${tot.counted} · ${st.fields.length} ${tr(UI_SCD.fields)}`)),
      h('div', { class: 'scd-bars' }, ...kinds().map((k) => {
        const pct = tot.counted ? (tot.n[k] / tot.counted) * 100 : 0;
        return h('div', { class: 'bar' }, h('span', {}, tr(SCD_NAME[k])), h('div', { class: 'track' }, h('i', { style: `width:${pct}%;background:${SCD_COL[k]}` })), h('b', {}, `${tot.n[k]} · ${num(pct, 0)}%`));
      })),
      line(tr(L('Оценка', 'Бағалау', 'Assessment')), tr(verdict), tot.dfi < 15 ? 'good' : 'warn'),
      tot.counted < 300 ? h('p', { class: 'hint' }, `${tot.counted} ${tr(UI_SCD.counted)} — ${tr(UI_SCD.low)}`) : null,
      h('p', { class: 'hint' }, tr(UI_SCD.interpNote)),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: (e) => copyReport(e.target, tot) }, tr(UI_SCD.copy)),
        h('button', { class: 'btn-ghost', onclick: () => saveCsv() }, tr(UI_SCD.csv))));
  }
  function report(tot) {
    const lines = [`SCD / Halo — DFI ${num(tot.dfi)}%`, `${tr(UI_SCD.counted)}: ${tot.counted}; ${tr(UI_SCD.fields)}: ${st.fields.length}`];
    for (const k of kinds()) lines.push(`${tr(SCD_NAME[k])}: ${tot.n[k]}`);
    lines.push(st.method === 'ai' ? `DFI = ${tr(SCD_NAME.frag)} / ${tr(UI_SCD.counted)} · YOLOv8s-seg` : 'DFI = (' + [tr(SCD_NAME.small), tr(SCD_NAME.none), tr(SCD_NAME.degraded)].join(' + ') + ') / ' + tr(UI_SCD.counted));
    return lines.join('\n');
  }
  async function copyReport(btn, tot) {
    const txt = report(tot);
    try { await navigator.clipboard.writeText(txt); btn.textContent = tr(UI_SCD.copied); setTimeout(() => (btn.textContent = tr(UI_SCD.copy)), 1600); }
    catch { download('scd-report.txt', txt); }
  }
  function saveCsv() {
    const ks = [...kinds(), 'excluded'], head = ['field', ...ks, 'counted', 'DFI_%'];
    const row = (name, s) => [name, ...ks.map((k) => s.n[k]), s.counted, s.dfi.toFixed(1)];
    const rows = st.fields.map((f) => row(f.name, SCD.summary(f.res.cells)));
    rows.push(row('TOTAL', SCD.summary(st.fields.flatMap((x) => x.res.cells))));
    download('scd-dfi.csv', [head, ...rows].map((r) => r.join(',')).join('\n'), 'text/csv');
  }
  canvas.addEventListener('click', (e) => {
    const f = st.fields[st.sel]; if (!f) return;
    const b = canvas.getBoundingClientRect(), x = (e.clientX - b.left) * (canvas.width / b.width), y = (e.clientY - b.top) * (canvas.height / b.height);
    let hit = null, hd = 1e9;
    for (const c of f.res.cells) { const d = Math.hypot(c.x - x, c.y - y); if (d < Math.max(10, c.major / 2 + 6) && d < hd) { hd = d; hit = c; } }
    if (st.addMode && !hit) {
      const m = f.res.M ? Math.sqrt(f.res.M / Math.PI) * 2 : 10;
      f.res.cells.push({ x, y, major: m * 1.4, minor: m, angle: 0, halo: 0, cls: st.addCls, manual: true });
    } else if (hit) {
      const ord = order(), i = ord.indexOf(hit.cls);
      hit.cls = ord[(i + 1) % ord.length];
    } else return;
    draw(); sync();
  });

  loadSample();
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
