// ─── Лабораторные инструменты: счётчик, камера, ВОЗ-6, эмбрион, морфокинетика, POSEIDON ─

// ── Лабораторный счётчик (морфология ВОЗ-6 с TZI/SDI, жизнеспособность, HOS)
const UI_CNT = {
  modes: { morph: L('Морфология (ВОЗ-6)', 'Морфология (ДДҰ-6)', 'Morphology (WHO-6)'), vital: L('Жизнеспособность (эозин–нигрозин)', 'Тіршілікке қабілеттілік (эозин–нигрозин)', 'Vitality (eosin–nigrosin)'), hos: L('HOS-тест', 'HOS-тест', 'HOS test') },
  normal: L('Нормальный', 'Қалыпты', 'Normal'),
  head: L('Головка', 'Басы', 'Head'), mid: L('Шейка / средний отдел', 'Мойын / ортаңғы бөлім', 'Neck / midpiece'), tail: L('Хвост', 'Құйрық', 'Tail'), erc: L('Избыток цитоплазмы', 'Артық цитоплазма', 'Excess residual cytoplasm'),
  saveAbn: L('Записать аномальный', 'Аномальды жазу', 'Record abnormal'),
  live: L('Живой (неокрашенный)', 'Тірі (боялмаған)', 'Live (unstained)'), dead: L('Мёртвый (окрашенный)', 'Өлі (боялған)', 'Dead (stained)'),
  swollen: L('Набухший хвост', 'Ісінген құйрық', 'Swollen tail'), notSwollen: L('Без набухания', 'Ісінусіз', 'Not swollen'),
  undo: L('Отменить', 'Болдырмау', 'Undo'), reset: L('Сбросить', 'Тазарту', 'Reset'),
  target: L('Цель', 'Мақсат', 'Target'), counted: L('Подсчитано', 'Саналды', 'Counted'),
  done: L('Цель достигнута', 'Мақсатқа жетті', 'Target reached'),
  keys: L('Клавиши', 'Пернелер', 'Keys'),
  pickDefect: L('Отметьте хотя бы один дефект', 'Кем дегенде бір ақауды белгілеңіз', 'Mark at least one defect'),
};
function mountCounter(root) {
  const st = { mode: 'morph', target: 200, log: [], sel: new Set() };
  const box = h('div', { class: 'cnt' }); root.append(box);
  const onKey = (e) => {
    if (/input|select|textarea/i.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (st.mode === 'morph') {
      if (k === '1' || k === 'n') add({ n: 1 });
      else if (['2', '3', '4', '5'].includes(k)) toggle(['h', 'm', 't', 'c'][+k - 2]);
      else if (k === 'enter') commitAbn();
    } else { if (k === '1') add({ a: 1 }); else if (k === '2') add({ b: 1 }); }
    if (k === 'backspace' || k === 'z') { st.log.pop(); render(); }
    else return;
    e.preventDefault();
  };
  document.addEventListener('keydown', onKey);
  function toggle(d) { st.sel.has(d) ? st.sel.delete(d) : st.sel.add(d); render(); }
  function commitAbn() { if (!st.sel.size) { flash(tr(UI_CNT.pickDefect)); return; } add({ ab: 1, d: [...st.sel] }); st.sel.clear(); }
  function add(rec) { st.log.push(rec); ping(); render(); }
  let msg = null;
  function flash(t) { msg = t; render(); setTimeout(() => { msg = null; render(); }, 1400); }
  function ping() { box.classList.remove('ping'); void box.offsetWidth; box.classList.add('ping'); }
  function stats() {
    const n = st.log.length;
    if (st.mode === 'morph') {
      const norm = st.log.filter((r) => r.n).length, abn = n - norm, d = { h: 0, m: 0, t: 0, c: 0 };
      let defects = 0; for (const r of st.log) if (r.d) for (const x of r.d) { d[x]++; defects++; }
      return { n, norm, abn, d, defects, pNorm: n ? (norm / n) * 100 : 0, tzi: abn ? defects / abn : null, sdi: n ? defects / n : null };
    }
    const a = st.log.filter((r) => r.a).length; return { n, a, b: n - a, pA: n ? (a / n) * 100 : 0 };
  }
  function ring(n, target) {
    const p = Math.min(1, n / target), R = 54, C = 2 * Math.PI * R;
    const svg = `<svg viewBox="0 0 128 128" aria-hidden="true"><circle cx="64" cy="64" r="${R}" class="rt"/><circle cx="64" cy="64" r="${R}" class="rp" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - p)}"/></svg>`;
    return h('div', { class: 'cnt-ring' + (n >= target ? ' full' : ''), html: svg }, h('div', { class: 'cnt-num' }, h('strong', {}, String(n)), h('span', {}, `/ ${target}`)));
  }
  function render() {
    const s = stats();
    const modeSeg = h('div', { class: 'seg seg-wrap' }, ...Object.entries(UI_CNT.modes).map(([k, lab]) => h('button', { class: st.mode === k ? 'on' : '', onclick: () => { if (k !== st.mode) { st.mode = k; st.log = []; st.sel.clear(); render(); } } }, tr(lab))));
    const targetSel = h('select', { 'aria-label': tr(UI_CNT.target), onchange: (e) => { st.target = +e.target.value; render(); } }, ...[100, 200, 400].map((v) => h('option', { value: v, selected: v === st.target }, `${tr(UI_CNT.target)}: ${v}`)));
    const kbd = (k) => h('kbd', {}, k);
    let pad, out;
    if (st.mode === 'morph') {
      const tg = (key, lab, d) => h('button', { class: 'cnt-def' + (st.sel.has(d) ? ' on' : ''), onclick: () => toggle(d) }, kbd(key), tr(lab), h('b', {}, String(s.d[d])));
      pad = h('div', { class: 'cnt-pad' },
        h('button', { class: 'cnt-big good', onclick: () => add({ n: 1 }) }, kbd('1'), h('span', {}, tr(UI_CNT.normal)), h('b', {}, String(s.norm))),
        h('div', { class: 'cnt-defs' }, tg('2', UI_CNT.head, 'h'), tg('3', UI_CNT.mid, 'm'), tg('4', UI_CNT.tail, 't'), tg('5', UI_CNT.erc, 'c')),
        h('button', { class: 'cnt-big bad' + (st.sel.size ? '' : ' dim'), onclick: commitAbn }, kbd('Enter'), h('span', {}, tr(UI_CNT.saveAbn)), h('b', {}, String(s.abn))));
      out = [
        big(tr(L('Нормальные формы', 'Қалыпты пішіндер', 'Normal forms')), `${num(s.pNorm)}%`, `${tr(L('нижний референс ВОЗ-6', 'ДДҰ-6 төменгі референсі', 'WHO-6 lower reference'))} 4%`),
        line('TZI', s.tzi == null ? '—' : num(s.tzi, 2)), line('SDI', s.sdi == null ? '—' : num(s.sdi, 2)),
        line(tr(L('Оценка', 'Бағалау', 'Assessment')), s.n ? (s.pNorm >= 4 ? tr(L('не ниже референса', 'референстен төмен емес', 'at or above reference')) : tr(L('ниже референса (тератозооспермия)', 'референстен төмен (тератозооспермия)', 'below reference (teratozoospermia)'))) : '—', s.n ? (s.pNorm >= 4 ? 'good' : 'warn') : ''),
        h('p', { class: 'hint' }, tr(L('TZI — среднее число дефектов на аномальный сперматозоид (1–4), SDI — на все подсчитанные. Каждый аномальный может иметь до 4 дефектов: головка, шейка/средний отдел, хвост, избыток цитоплазмы.', 'TZI — бір аномальды сперматозоидқа шаққандағы ақаулардың орташа саны (1–4), SDI — барлық саналғандарға. Әр аномальдыда 4 ақауға дейін болуы мүмкін: бас, мойын/ортаңғы бөлім, құйрық, артық цитоплазма.', 'TZI is the mean number of defects per abnormal sperm (1–4); SDI is per all sperm counted. Each abnormal sperm can have up to 4 defects: head, neck/midpiece, tail, excess residual cytoplasm.'))),
      ];
    } else {
      const [la, lb] = st.mode === 'vital' ? [UI_CNT.live, UI_CNT.dead] : [UI_CNT.swollen, UI_CNT.notSwollen];
      pad = h('div', { class: 'cnt-pad two' },
        h('button', { class: 'cnt-big good', onclick: () => add({ a: 1 }) }, kbd('1'), h('span', {}, tr(la)), h('b', {}, String(s.a))),
        h('button', { class: 'cnt-big bad', onclick: () => add({ b: 1 }) }, kbd('2'), h('span', {}, tr(lb)), h('b', {}, String(s.b))));
      out = st.mode === 'vital'
        ? [big(tr(L('Живые', 'Тірілер', 'Live')), `${num(s.pA)}%`, `${tr(L('нижний референс ВОЗ-6', 'ДДҰ-6 төменгі референсі', 'WHO-6 lower reference'))} 54%`),
            line(tr(L('Оценка', 'Бағалау', 'Assessment')), s.n ? (s.pA >= 54 ? tr(L('не ниже референса', 'референстен төмен емес', 'at or above reference')) : tr(L('ниже референса', 'референстен төмен', 'below reference'))) : '—', s.n ? (s.pA >= 54 ? 'good' : 'warn') : '')]
        : [big(tr(L('Набухшие (реагирующие)', 'Ісінгендер (әсер ететін)', 'Swollen (reacting)')), `${num(s.pA)}%`),
            h('p', { class: 'hint' }, tr(L('HOS-тест оценивает целостность мембраны; используйте референс вашей лаборатории.', 'HOS-тест мембрананың тұтастығын бағалайды; зертханаңыздың референсін пайдаланыңыз.', 'The HOS test assesses membrane integrity; use your lab’s reference.')))];
    }
    box.replaceChildren(
      h('div', { class: 'cnt-top' }, modeSeg, targetSel),
      h('div', { class: 'cnt-grid' },
        h('div', { class: 'cnt-left' }, ring(s.n, st.target), s.n >= st.target ? h('p', { class: 'cnt-done' }, tr(UI_CNT.done)) : null, msg ? h('p', { class: 'warn-box' }, msg) : null,
          h('div', { class: 'row' }, h('button', { class: 'btn-ghost', onclick: () => { st.log.pop(); render(); } }, `↶ ${tr(UI_CNT.undo)}`), h('button', { class: 'btn-link', onclick: () => { st.log = []; st.sel.clear(); render(); } }, tr(UI_CNT.reset)))),
        h('div', { class: 'cnt-mid' }, pad, h('p', { class: 'hint' }, `${tr(UI_CNT.keys)}: ${st.mode === 'morph' ? '1 — ' + tr(UI_CNT.normal).toLowerCase() + '; 2–5 — ' + tr(L('дефекты', 'ақаулар', 'defects')) + '; Enter — ' + tr(UI_CNT.saveAbn).toLowerCase() : '1 / 2'}; Backspace — ${tr(UI_CNT.undo).toLowerCase()}`)),
        h('div', { class: 'cnt-out calc-result' }, ...out)));
  }
  render();
  return { destroy() { document.removeEventListener('keydown', onKey); } };
}

// ── Концентрация по камере (Нейбауэр / Маклер) + проверка повторов по ВОЗ
const CHAMBERS = {
  neubauer: { name: L('Нейбауэр (улучшенная), центральная сетка', 'Нейбауэр (жетілдірілген), орталық тор', 'Improved Neubauer, central grid'), unit: L('больших квадратов (из 25)', 'үлкен шаршы (25-тен)', 'large squares (of 25)'), vol: 0.004, dil: 20, n: 25 },
  makler: { name: L('Маклер', 'Маклер', 'Makler'), unit: L('квадратов (из 100)', 'шаршы (100-ден)', 'squares (of 100)'), vol: 0.0001, dil: 1, n: 10 },
  custom: { name: L('Свой объём', 'Өз көлеміңіз', 'Custom volume'), unit: L('нл подсчитанного объёма', 'саналған көлем, нл', 'nL counted'), vol: 0.001, dil: 1, n: 100 },
};
function mountChamber(root) {
  return calcShell(root, [
    { id: 'ch', type: 'select', value: 'neubauer', wide: true, label: L('Камера', 'Камера', 'Chamber'), options: Object.entries(CHAMBERS).map(([k, c]) => [k, c.name]),
      after: (els) => { const c = CHAMBERS[els.ch.value]; els.dil.value = c.dil; els.a1.value = c.n; els.a2.value = c.n; } },
    { id: 'dil', value: 20, label: L('Разведение (1 + 19 = 20)', 'Сұйылту (1 + 19 = 20)', 'Dilution (1 + 19 = 20)') },
    { id: 'n1', value: 212, label: L('Повтор 1: подсчитано сперматозоидов', '1-қайталау: саналған сперматозоидтар', 'Replicate 1: sperm counted') },
    { id: 'a1', value: 10, label: L('Повтор 1: объём (в единицах камеры)', '1-қайталау: көлем (камера бірлігінде)', 'Replicate 1: area (chamber units)') },
    { id: 'n2', value: 196, label: L('Повтор 2: подсчитано (0 — нет)', '2-қайталау: саналды (0 — жоқ)', 'Replicate 2: counted (0 — none)') },
    { id: 'a2', value: 10, label: L('Повтор 2: объём (в единицах камеры)', '2-қайталау: көлем (камера бірлігінде)', 'Replicate 2: area (chamber units)') },
    { id: 'vol', value: 3, step: 0.1, label: L('Объём эякулята, мл (необязательно)', 'Эякулят көлемі, мл (міндетті емес)', 'Ejaculate volume, mL (optional)') },
  ], (v) => {
    const ch = CHAMBERS[v.ch], D = v.dil > 0 ? v.dil : 1;
    const V1 = v.a1 * ch.vol, V2 = v.a2 * ch.vol;                // мкл
    if (!(v.n1 >= 0 && V1 > 0)) return null;
    const c1 = (v.n1 * D) / V1 / 1000, has2 = v.n2 > 0 && V2 > 0, c2 = has2 ? (v.n2 * D) / V2 / 1000 : null;
    const N = v.n1 + (has2 ? v.n2 : 0), V = V1 + (has2 ? V2 : 0), C = (N * D) / V / 1000;
    const lo = (Math.max(0, N - 1.96 * Math.sqrt(N)) * D) / V / 1000, hi = ((N + 1.96 * Math.sqrt(N)) * D) / V / 1000;
    const out = [h('div', { class: 'bigs' },
      big(tr(L('Концентрация', 'Концентрация', 'Concentration')), `${num(C)} ${tr(L('млн/мл', 'млн/мл', 'M/mL'))}`, `95% CI ${num(lo)}–${num(hi)}`),
      v.vol > 0 ? big(tr(L('Общее количество', 'Жалпы саны', 'Total count')), `${num(C * v.vol)} ${tr(L('млн', 'млн', 'M'))}`) : big(tr(L('Ошибка подсчёта', 'Санау қатесі', 'Sampling error')), N ? `±${num(196 / Math.sqrt(N), 0)}%` : '—', `${N} ${tr(L('сперматозоидов', 'сперматозоид', 'sperm'))}`))];
    out.push(line(tr(L('Повтор 1', '1-қайталау', 'Replicate 1')), `${num(c1)} ${tr(L('млн/мл', 'млн/мл', 'M/mL'))}`));
    if (has2) {
      out.push(line(tr(L('Повтор 2', '2-қайталау', 'Replicate 2')), `${num(c2)} ${tr(L('млн/мл', 'млн/мл', 'M/mL'))}`));
      const r1 = v.n1 / V1, r2 = v.n2 / V2, z = Math.abs(r1 - r2) / Math.sqrt(v.n1 / (V1 * V1) + v.n2 / (V2 * V2));
      const ok = z <= 1.96, sameV = Math.abs(V1 - V2) < 1e-12;
      out.push(line(tr(L('Согласие повторов', 'Қайталаулардың келісімі', 'Replicate agreement')),
        (ok ? tr(L('приемлемо', 'қолайлы', 'acceptable')) : tr(L('расхождение — подсчитайте заново', 'алшақтық — қайта санаңыз', 'too different — recount'))) + (sameV ? ` · |${v.n1}−${v.n2}| = ${Math.abs(v.n1 - v.n2)} ${ok ? '≤' : '>'} ${Math.round(1.96 * Math.sqrt(v.n1 + v.n2))}` : ''), ok ? 'good' : 'warn'));
    }
    if (v.n1 < 200 || (has2 && v.n2 < 200)) out.push(h('p', { class: 'hint' }, tr(L('ВОЗ рекомендует подсчитывать не менее 200 сперматозоидов в каждом повторе — ошибка подсчёта тогда около ±5%.', 'ДДҰ әр қайталауда кемінде 200 сперматозоид санауды ұсынады — сонда санау қатесі шамамен ±5%.', 'WHO recommends counting at least 200 sperm per replicate — the sampling error is then about ±5%.'))));
    out.push(h('p', { class: 'hint' }, `${tr(L('Объём единицы камеры', 'Камера бірлігінің көлемі', 'Chamber unit volume'))}: ${ch.vol * 1000} ${tr(L('нл', 'нл', 'nL'))} (${tr(ch.unit)}). ${tr(L('Расхождение повторов проверяется по критерию Пуассона, как в руководстве ВОЗ: |N₁ − N₂| ≤ 1,96·√(N₁ + N₂).', 'Қайталаулар алшақтығы ДДҰ нұсқаулығындағыдай Пуассон критерийі бойынша тексеріледі: |N₁ − N₂| ≤ 1,96·√(N₁ + N₂).', 'Replicate difference is checked with the Poisson criterion used in the WHO manual: |N₁ − N₂| ≤ 1.96·√(N₁ + N₂).'))}`));
    return out;
  });
}

// ── Спермограмма: заключение по ВОЗ-6 (2021)
const WHO6 = { vol: 1.4, total: 39, conc: 16, tmot: 42, pr: 30, vit: 54, morph: 4, ph: 7.2, leu: 1.0 };
function mountWho(root) {
  return calcShell(root, [
    { id: 'vol', value: 2.8, step: 0.1, label: L('Объём, мл', 'Көлем, мл', 'Volume, mL') },
    { id: 'conc', value: 24, label: L('Концентрация, млн/мл', 'Концентрация, млн/мл', 'Concentration, M/mL') },
    { id: 'pr', value: 26, label: L('Прогрессивная подвижность PR, %', 'Прогрессивті қозғалғыштық PR, %', 'Progressive motility PR, %') },
    { id: 'np', value: 12, label: L('Непрогрессивная NP, %', 'Прогрессивті емес NP, %', 'Non-progressive NP, %') },
    { id: 'morph', value: 3, label: L('Нормальные формы, %', 'Қалыпты пішіндер, %', 'Normal forms, %') },
    { id: 'vit', value: 68, label: L('Живые (жизнеспособность), %', 'Тірілер (тіршілікке қабілеттілік), %', 'Live (vitality), %') },
    { id: 'ph', value: 7.6, step: 0.1, label: L('pH', 'pH', 'pH') },
    { id: 'leu', value: 0.4, step: 0.1, label: L('Пероксидаза-положительные лейкоциты, млн/мл', 'Пероксидаза-оң лейкоциттер, млн/мл', 'Peroxidase-positive leukocytes, M/mL') },
  ], (v) => {
    if (!(v.vol >= 0 && v.conc >= 0)) return null;
    const total = v.vol * v.conc, tmot = (v.pr || 0) + (v.np || 0), im = Math.max(0, 100 - tmot);
    const row = (k, val, unit, ref, ok, refTxt) => line(`${tr(k)} · ${refTxt ?? '≥ ' + num(ref, ref < 10 ? 1 : 0) + (unit ? ' ' + unit : '')}`, `${val}${unit ? ' ' + unit : ''}`, ok ? 'good' : 'warn');
    const has = (x) => x != null && !Number.isNaN(x);
    const rows = [
      row(L('Объём', 'Көлем', 'Volume'), num(v.vol), tr(L('мл', 'мл', 'mL')), WHO6.vol, v.vol >= WHO6.vol),
      row(L('Общее количество', 'Жалпы саны', 'Total number'), num(total), tr(L('млн', 'млн', 'M')), WHO6.total, total >= WHO6.total),
      row(L('Концентрация', 'Концентрация', 'Concentration'), num(v.conc), tr(L('млн/мл', 'млн/мл', 'M/mL')), WHO6.conc, v.conc >= WHO6.conc),
      row(L('Общая подвижность (PR+NP)', 'Жалпы қозғалғыштық (PR+NP)', 'Total motility (PR+NP)'), num(tmot, 0), '%', WHO6.tmot, tmot >= WHO6.tmot),
      row(L('Прогрессивная подвижность', 'Прогрессивті қозғалғыштық', 'Progressive motility'), num(v.pr || 0, 0), '%', WHO6.pr, (v.pr || 0) >= WHO6.pr),
      has(v.morph) ? row(L('Нормальные формы', 'Қалыпты пішіндер', 'Normal forms'), num(v.morph, 0), '%', WHO6.morph, v.morph >= WHO6.morph) : null,
      has(v.vit) ? row(L('Жизнеспособность', 'Тіршілікке қабілеттілік', 'Vitality'), num(v.vit, 0), '%', WHO6.vit, v.vit >= WHO6.vit) : null,
      has(v.ph) ? row(L('pH', 'pH', 'pH'), num(v.ph, 1), '', WHO6.ph, v.ph >= WHO6.ph) : null,
      has(v.leu) ? row(L('Лейкоциты', 'Лейкоциттер', 'Leukocytes'), num(v.leu, 1), tr(L('млн/мл', 'млн/мл', 'M/mL')), WHO6.leu, v.leu <= WHO6.leu, `≤ 1,0 ${tr(L('млн/мл', 'млн/мл', 'M/mL'))}`) : null,
    ];
    // описательные термины ВОЗ
    const T = [];
    if (v.vol === 0) T.push(L('аспермия', 'аспермия', 'aspermia'));
    else if (v.conc === 0) T.push(L('азооспермия (подтвердите исследованием осадка)', 'азооспермия (тұнбаны зерттеумен растаңыз)', 'azoospermia (confirm by examining the pellet)'));
    else {
      if (v.vol < WHO6.vol) T.push(L('гипоспермия', 'гипоспермия', 'hypospermia'));
      const O = total < WHO6.total, A = (v.pr || 0) < WHO6.pr, Te = has(v.morph) && v.morph < WHO6.morph;
      const pre = [O && L('олиго', 'олиго', 'oligo'), A && L('астено', 'астено', 'astheno'), Te && L('терато', 'терато', 'terato')].filter(Boolean);
      if (pre.length) T.push({ ru: pre.map((p) => p.ru).join('') + 'зооспермия', kk: pre.map((p) => p.kk).join('') + 'зооспермия', en: pre.map((p) => p.en).join('') + 'zoospermia' });
      else T.push(L('нормозооспермия', 'нормозооспермия', 'normozoospermia'));
      if (has(v.vit) && v.vit < WHO6.vit) T.push(L('некрозооспермия (низкая доля живых)', 'некрозооспермия (тірілер үлесі төмен)', 'necrozoospermia (low proportion of live sperm)'));
      if (has(v.leu) && v.leu > WHO6.leu) T.push(L('лейкоцитоспермия', 'лейкоцитоспермия', 'leukocytospermia'));
    }
    return [
      h('div', { class: 'bigs' }, big(tr(L('Описательное заключение', 'Сипаттамалық қорытынды', 'Descriptive conclusion')), T.map((t) => tr(t)).join(', ')), big(tr(L('Неподвижные (IM)', 'Қозғалмайтындар (IM)', 'Immotile (IM)')), `${num(im, 0)}%`, `${tr(L('Общее количество', 'Жалпы саны', 'Total number'))}: ${num(total)} ${tr(L('млн', 'млн', 'M'))}`)),
      h('h4', { class: 'sub' }, tr(L('Сравнение с нижними референсными пределами ВОЗ (2021, 5-й процентиль)', 'ДДҰ төменгі референстік шектерімен салыстыру (2021, 5-процентиль)', 'Compared with WHO lower reference limits (2021, 5th centile)'))),
      ...rows.filter(Boolean),
      h('p', { class: 'hint' }, tr(L('Термины олиго-, астено-, тератозооспермия описывают значения ниже 5-го процентиля фертильных мужчин (ВОЗ, 2021). Это не диагноз бесплодия: значения выше предела не гарантируют фертильность, ниже — не исключают её.', 'Олиго-, астено-, тератозооспермия терминдері фертильді ерлердің 5-процентилінен төмен мәндерді сипаттайды (ДДҰ, 2021). Бұл бедеулік диагнозы емес: шектен жоғары мәндер фертильділікке кепілдік бермейді, төмендері оны жоққа шығармайды.', 'The terms oligo-, astheno- and teratozoospermia describe values below the 5th centile of fertile men (WHO, 2021). They are not a diagnosis of infertility: values above the limit do not guarantee fertility, and values below do not exclude it.'))),
    ];
  });
}

// ── Грейд эмбриона дня 2–3 (Стамбульский консенсус, 2011)
function mountCleavage(root) {
  return calcShell(root, [
    { id: 'day', type: 'seg', value: '3', wide: true, options: [['2', L('День 2 (44 ± 1 ч)', '2-күн (44 ± 1 сағ)', 'Day 2 (44 ± 1 h)')], ['3', L('День 3 (68 ± 1 ч)', '3-күн (68 ± 1 сағ)', 'Day 3 (68 ± 1 h)')]] },
    { id: 'cells', value: 8, min: 1, max: 16, step: 1, label: L('Число бластомеров', 'Бластомерлер саны', 'Number of blastomeres') },
    { id: 'frag', type: 'range', min: 0, max: 60, value: 8, label: L('Фрагментация, % объёма', 'Фрагментация, көлемнің %', 'Fragmentation, % of volume'), wide: true },
    { id: 'size', type: 'select', value: 'all', label: L('Размер бластомеров', 'Бластомерлер өлшемі', 'Blastomere size'), options: [['all', L('соответствует стадии', 'сатыға сәйкес', 'stage-specific')], ['most', L('соответствует у большинства', 'көпшілігінде сәйкес', 'stage-specific in most cells')], ['no', L('не соответствует стадии', 'сатыға сәйкес емес', 'not stage-specific')]] },
    { id: 'mn', type: 'check', value: false, label: L('Многоядерность', 'Көпядролылық', 'Multinucleation') },
  ], (v) => {
    const fr = Math.round(v.frag), exp = v.day === '2' ? 4 : 8;
    const g = v.mn || fr > 25 || v.size === 'no' ? 3 : fr >= 10 || v.size === 'most' ? 2 : 1;
    const name = { 1: L('хорошее качество', 'жақсы сапа', 'good quality'), 2: L('удовлетворительное', 'қанағаттанарлық', 'fair quality'), 3: L('плохое качество', 'нашар сапа', 'poor quality') }[g];
    const pace = v.cells === exp ? L('соответствует ожидаемому', 'күтілгенге сәйкес', 'on schedule') : v.cells < exp ? L('медленнее ожидаемого', 'күтілгеннен баяу', 'slower than expected') : L('быстрее ожидаемого', 'күтілгеннен жылдам', 'faster than expected');
    const why = [];
    if (v.mn) why.push(L('многоядерность', 'көпядролылық', 'multinucleation'));
    if (fr > 25) why.push(L('фрагментация > 25%', 'фрагментация > 25%', 'fragmentation > 25%')); else if (fr >= 10) why.push(L('фрагментация 10–25%', 'фрагментация 10–25%', 'fragmentation 10–25%'));
    if (v.size !== 'all') why.push(v.size === 'no' ? L('размер не соответствует стадии', 'өлшемі сатыға сәйкес емес', 'size not stage-specific') : L('размер соответствует у большинства', 'өлшемі көпшілігінде сәйкес', 'size stage-specific in most cells'));
    return [
      h('div', { class: 'bigs' }, big(tr(L('Грейд', 'Грейд', 'Grade')), `${g} · ${tr(name)}`), big(tr(L('Число клеток', 'Жасушалар саны', 'Cell number')), `${v.cells} / ${exp}`, tr(pace))),
      line(tr(L('Основания', 'Негіздер', 'Reasons')), why.length ? why.map((x) => tr(x)).join(', ') : tr(L('фрагментация < 10%, размер по стадии, без многоядерности', 'фрагментация < 10%, өлшемі сатыға сай, көпядролылықсыз', 'fragmentation < 10%, stage-specific size, no multinucleation')), g === 1 ? 'good' : 'warn'),
      h('p', { class: 'hint' }, tr(L('Стамбульский консенсус (ALPHA/ESHRE, 2011): грейд 1 — фрагментация < 10%, размер по стадии, без многоядерности; 2 — 10–25%, размер по стадии у большинства, без многоядерности; 3 — > 25%, размер не по стадии или многоядерность. Ожидаемо 4 клетки на 2-й день и 8 — на 3-й. «По стадии» означает равные бластомеры на стадиях 2, 4 и 8 клеток; на стадиях 3 и 5–7 клеток неравенство нормально.', 'Стамбул консенсусы (ALPHA/ESHRE, 2011): 1-грейд — фрагментация < 10%, өлшемі сатыға сай, көпядролылықсыз; 2 — 10–25%, көпшілігінің өлшемі сатыға сай, көпядролылықсыз; 3 — > 25%, өлшемі сатыға сай емес немесе көпядролылық. 2-күні 4 жасуша, 3-күні 8 жасуша күтіледі. «Сатыға сай» — 2, 4 және 8 жасушалы сатыларда бластомерлер тең; 3 және 5–7 жасушалы сатыларда теңсіздік қалыпты.', 'Istanbul consensus (ALPHA/ESHRE, 2011): grade 1 — fragmentation < 10%, stage-specific size, no multinucleation; 2 — 10–25%, stage-specific size in most cells, no multinucleation; 3 — > 25%, size not stage-specific, or multinucleation. 4 cells are expected on day 2 and 8 on day 3. “Stage-specific” means equal blastomeres at the 2-, 4- and 8-cell stages; at 3- and 5–7-cell stages unequal sizes are normal.'))),
    ];
  });
}

// ── Морфокинетика time-lapse (Meseguer et al., 2011)
function mountKinetics(root) {
  return calcShell(root, [
    { id: 't2', value: 26.5, step: 0.1, label: L('t2 — 2 клетки, ч', 't2 — 2 жасуша, сағ', 't2 — 2 cells, h') },
    { id: 't3', value: 37.2, step: 0.1, label: L('t3 — 3 клетки, ч', 't3 — 3 жасуша, сағ', 't3 — 3 cells, h') },
    { id: 't4', value: 37.8, step: 0.1, label: L('t4 — 4 клетки, ч', 't4 — 4 жасуша, сағ', 't4 — 4 cells, h') },
    { id: 't5', value: 50.1, step: 0.1, label: L('t5 — 5 клеток, ч', 't5 — 5 жасуша, сағ', 't5 — 5 cells, h') },
    { id: 't8', value: 55.3, step: 0.1, label: L('t8 — 8 клеток, ч (необязательно)', 't8 — 8 жасуша, сағ (міндетті емес)', 't8 — 8 cells, h (optional)') },
    { id: 'uneven', type: 'check', value: false, label: L('Неравные бластомеры на стадии 2 клеток', '2 жасушалы сатыда тең емес бластомерлер', 'Uneven blastomeres at the 2-cell stage') },
    { id: 'mn4', type: 'check', value: false, label: L('Многоядерность на стадии 4 клеток', '4 жасушалы сатыда көпядролылық', 'Multinucleation at the 4-cell stage') },
  ], (v) => {
    const ok = (x) => x > 0 && Number.isFinite(x);
    if (![v.t2, v.t3, v.t4, v.t5].every(ok)) return null;
    const order = v.t2 < v.t3 && v.t3 <= v.t4 && v.t4 <= v.t5 && (!ok(v.t8) || v.t5 <= v.t8);
    const cc2 = v.t3 - v.t2, s2 = v.t4 - v.t3, cc3 = v.t5 - v.t3, s3 = ok(v.t8) ? v.t8 - v.t5 : null;
    const chk = [
      ['t5', v.t5, v.t5 >= 48.8 && v.t5 <= 56.6, '48,8–56,6'],
      ['s2 = t4 − t3', s2, s2 <= 0.76, '≤ 0,76'],
      ['cc2 = t3 − t2', cc2, cc2 <= 11.9, '≤ 11,9'],
    ];
    const n = chk.filter((c) => c[2]).length;
    const flags = [];
    if (v.uneven) flags.push(L('неравные бластомеры на стадии 2 клеток', '2 жасушалы сатыда тең емес бластомерлер', 'uneven blastomeres at the 2-cell stage'));
    if (v.mn4) flags.push(L('многоядерность на стадии 4 клеток', '4 жасушалы сатыда көпядролылық', 'multinucleation at the 4-cell stage'));
    if (cc2 < 5) flags.push(L('прямое дробление: cc2 < 5 ч (деление 1 → 3)', 'тікелей бөліну: cc2 < 5 сағ (1 → 3 бөліну)', 'direct cleavage: cc2 < 5 h (1 → 3 division)'));
    return [
      !order ? h('p', { class: 'warn-box' }, tr(L('Проверьте порядок: должно быть t2 < t3 ≤ t4 ≤ t5 ≤ t8.', 'Ретін тексеріңіз: t2 < t3 ≤ t4 ≤ t5 ≤ t8 болуы керек.', 'Check the order: it must be t2 < t3 ≤ t4 ≤ t5 ≤ t8.'))) : null,
      h('div', { class: 'bigs' }, big(tr(L('В оптимальном диапазоне', 'Оңтайлы ауқымда', 'In the optimal range')), `${n} / 3`, 'Meseguer et al., 2011'), big(tr(L('Настораживающие признаки', 'Алаңдататын белгілер', 'Warning signs')), flags.length ? String(flags.length) : tr(L('нет', 'жоқ', 'none')))),
      ...chk.map(([k, val, good, ref]) => line(`${k} · ${ref} ${tr(L('ч', 'сағ', 'h'))}`, `${num(val, 2)} ${tr(L('ч', 'сағ', 'h'))}`, good ? 'good' : 'warn')),
      line('cc3 = t5 − t3', `${num(cc3, 2)} ${tr(L('ч', 'сағ', 'h'))}`), s3 != null ? line('s3 = t8 − t5', `${num(s3, 2)} ${tr(L('ч', 'сағ', 'h'))}`) : null,
      ...flags.map((f) => line(tr(L('Признак', 'Белгі', 'Sign')), tr(f), 'warn')),
      h('p', { class: 'hint' }, tr(L('Время — от инсеминации/ИКСИ. Диапазоны t5 48,8–56,6 ч, s2 ≤ 0,76 ч и cc2 ≤ 11,9 ч — наиболее прогностичные параметры имплантации по Meseguer et al. (Hum Reprod, 2011); неравные бластомеры, многоядерность на стадии 4 клеток и прямое дробление в той же работе были связаны с очень низкой имплантацией. Диапазоны получены в одной клинике — проверяйте на своих данных.', 'Уақыт — инсеминациядан/ИКСИ-ден бастап. t5 48,8–56,6 сағ, s2 ≤ 0,76 сағ және cc2 ≤ 11,9 сағ ауқымдары — Meseguer et al. (Hum Reprod, 2011) бойынша имплантацияның ең болжамды параметрлері; тең емес бластомерлер, 4 жасушалы сатыдағы көпядролылық және тікелей бөліну сол жұмыста өте төмен имплантациямен байланысты болды. Ауқымдар бір клиникада алынған — өз деректеріңізде тексеріңіз.', 'Times are from insemination/ICSI. The ranges t5 48.8–56.6 h, s2 ≤ 0.76 h and cc2 ≤ 11.9 h were the most predictive implantation parameters in Meseguer et al. (Hum Reprod, 2011); uneven blastomeres, multinucleation at 4 cells and direct cleavage were linked to very low implantation in the same work. The ranges come from one clinic — validate on your own data.'))),
    ];
  });
}

// ── POSEIDON: стратификация «низкого прогноза»
function mountPoseidon(root) {
  return calcShell(root, [
    { id: 'age', value: 37, step: 1, label: L('Возраст, лет', 'Жасы, жыл', 'Age, years') },
    { id: 'u', type: 'seg', value: 'ng', wide: true, options: [['ng', L('АМГ, нг/мл', 'АМГ, нг/мл', 'AMH, ng/mL')], ['pmol', L('АМГ, пмоль/л', 'АМГ, пмоль/л', 'AMH, pmol/L')]] },
    { id: 'amh', value: 1.6, step: 0.01, label: L('АМГ', 'АМГ', 'AMH') },
    { id: 'afc', value: 7, step: 1, label: L('КАФ (антральные фолликулы 2–9 мм, оба яичника)', 'АФС (антральды фолликулдар 2–9 мм, екі аналық без)', 'AFC (antral follicles 2–9 mm, both ovaries)') },
    { id: 'prev', type: 'seg', value: 'yes', wide: true, label: L('Была ли стимуляция?', 'Ынталандыру болды ма?', 'Previous stimulation?'), options: [['no', L('Нет', 'Жоқ', 'No')], ['yes', L('Да', 'Иә', 'Yes')]] },
    { id: 'oo', value: 5, step: 1, label: L('Получено ооцитов в прошлом цикле', 'Өткен циклде алынған ооциттер', 'Oocytes retrieved last cycle'), show: (v) => v.prev === 'yes' },
  ], (v) => {
    if (!(v.age > 0)) return null;
    const amh = v.u === 'pmol' ? v.amh / 7.14 : v.amh;
    const hasA = Number.isFinite(amh), hasF = Number.isFinite(v.afc);
    if (!hasA && !hasF) return null;
    const lowA = hasA && amh < 1.2, lowF = hasF && v.afc < 5, low = lowA || lowF, old = v.age >= 35;
    let grp, desc;
    if (low) { grp = old ? '4' : '3'; desc = L('сниженный овариальный резерв — ожидаемо низкий ответ на стимуляцию', 'аналық без резерві төмен — ынталандыруға күтілетін төмен жауап', 'reduced ovarian reserve — expected poor response to stimulation'); }
    else if (v.prev === 'yes' && Number.isFinite(v.oo) && v.oo <= 9) {
      grp = (old ? '2' : '1') + (v.oo < 4 ? 'a' : 'b');
      desc = v.oo < 4 ? L('достаточный резерв, но неожиданно бедный ответ (< 4 ооцитов)', 'резерв жеткілікті, бірақ күтпеген нашар жауап (< 4 ооцит)', 'adequate reserve but unexpectedly poor response (< 4 oocytes)') : L('достаточный резерв, но субоптимальный ответ (4–9 ооцитов)', 'резерв жеткілікті, бірақ оңтайлы емес жауап (4–9 ооцит)', 'adequate reserve but suboptimal response (4–9 oocytes)');
    } else { grp = null; desc = v.prev === 'yes' ? L('резерв достаточный, ответ > 9 ооцитов — не относится к группам POSEIDON', 'резерв жеткілікті, жауап > 9 ооцит — POSEIDON топтарына жатпайды', 'adequate reserve and > 9 oocytes — not a POSEIDON group') : L('резерв достаточный — группы 1 и 2 определяются только после стимуляции', 'резерв жеткілікті — 1 және 2-топтар тек ынталандырудан кейін анықталады', 'adequate reserve — groups 1 and 2 can only be assigned after a stimulation'); }
    const discord = hasA && hasF && lowA !== lowF;
    return [
      h('div', { class: 'bigs' }, big('POSEIDON', grp ? `${tr(L('Группа', 'Топ', 'Group'))} ${grp}` : '—', tr(desc)), big(tr(L('АМГ', 'АМГ', 'AMH')), hasA ? `${num(amh, 2)} ${tr(L('нг/мл', 'нг/мл', 'ng/mL'))}` : '—', hasA ? `${num(amh * 7.14, 1)} ${tr(L('пмоль/л', 'пмоль/л', 'pmol/L'))}` : '')),
      line(tr(L('Возраст', 'Жасы', 'Age')) + ' · 35', `${v.age} · ${old ? '≥ 35' : '< 35'}`),
      hasA ? line(tr(L('АМГ', 'АМГ', 'AMH')) + ' · 1,2 ' + tr(L('нг/мл', 'нг/мл', 'ng/mL')), lowA ? '< 1,2' : '≥ 1,2', lowA ? 'warn' : 'good') : null,
      hasF ? line(tr(L('КАФ', 'АФС', 'AFC')) + ' · 5', lowF ? '< 5' : '≥ 5', lowF ? 'warn' : 'good') : null,
      discord ? h('p', { class: 'warn-box' }, tr(L('АМГ и КАФ расходятся: один маркер ниже порога, другой нет. Здесь резерв считается сниженным, если ниже порога хотя бы один.', 'АМГ мен АФС сәйкес келмейді: бір маркер табалдырықтан төмен, екіншісі емес. Мұнда резерв кемінде біреуі табалдырықтан төмен болса төмен деп есептеледі.', 'AMH and AFC disagree: one is below its cut-off, the other is not. Here reserve is treated as reduced if either is below its cut-off.'))) : null,
      h('p', { class: 'hint' }, tr(L('POSEIDON (2016): группы 1–2 — возраст < 35 / ≥ 35, АМГ ≥ 1,2 нг/мл и КАФ ≥ 5, но в прошлом цикле ≤ 9 ооцитов (a: < 4, b: 4–9); группы 3–4 — возраст < 35 / ≥ 35, АМГ < 1,2 нг/мл или КАФ < 5. 1 нг/мл = 7,14 пмоль/л.', 'POSEIDON (2016): 1–2-топтар — жасы < 35 / ≥ 35, АМГ ≥ 1,2 нг/мл және АФС ≥ 5, бірақ өткен циклде ≤ 9 ооцит (a: < 4, b: 4–9); 3–4-топтар — жасы < 35 / ≥ 35, АМГ < 1,2 нг/мл немесе АФС < 5. 1 нг/мл = 7,14 пмоль/л.', 'POSEIDON (2016): groups 1–2 — age < 35 / ≥ 35, AMH ≥ 1.2 ng/mL and AFC ≥ 5 but ≤ 9 oocytes last cycle (a: < 4, b: 4–9); groups 3–4 — age < 35 / ≥ 35, AMH < 1.2 ng/mL or AFC < 5. 1 ng/mL = 7.14 pmol/L.'))),
    ];
  });
}
