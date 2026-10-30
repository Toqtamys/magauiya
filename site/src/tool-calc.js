// ─── Калькуляторы репродуктологии ───────────────────────────────────────────
const fmtDate = (d) => d.toLocaleDateString(LANG === 'en' ? 'en-GB' : LANG === 'kk' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const isoDay = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const num = (v, nd = 1) => (LANG === 'en' ? v.toFixed(nd) : v.toFixed(nd).replace('.', ','));

function calcShell(root, fields, compute) {
  const form = h('div', { class: 'calc-form' });
  const result = h('div', { class: 'calc-result', 'aria-live': 'polite' });
  const els = {};
  for (const f of fields) {
    let ctl;
    if (f.type === 'seg') {
      ctl = h('div', { class: 'seg' }, ...f.options.map(([v, lab]) => h('button', { 'data-v': v, onclick: () => { els[f.id].value = v; paintSeg(); update(); } }, tr(lab))));
      ctl.value = f.value; els[f.id] = ctl;
    } else if (f.type === 'select') {
      ctl = h('select', { id: 'c-' + f.id, onchange: () => { f.after?.(els); update(); } }, ...f.options.map(([v, lab]) => h('option', { value: v, selected: String(v) === String(f.value) }, tr(lab))));
      els[f.id] = ctl;
    } else if (f.type === 'check') {
      ctl = h('input', { id: 'c-' + f.id, type: 'checkbox', checked: !!f.value, onchange: update });
      els[f.id] = ctl;
      const lab = h('label', { class: 'field check' + (f.wide ? ' wide' : ''), for: 'c-' + f.id }, ctl, h('span', {}, tr(f.label)));
      if (f.show) lab.dataset.show = '1';
      f.el = lab; form.append(lab); continue;
    } else if (f.type === 'range') {
      ctl = h('input', { id: 'c-' + f.id, type: 'range', min: f.min, max: f.max, step: f.step || 1, value: f.value, oninput: update });
      els[f.id] = ctl;
    } else {
      ctl = h('input', { id: 'c-' + f.id, type: f.type || 'number', value: f.value, step: f.step || 'any', min: f.min, max: f.max, inputmode: f.type === 'date' ? null : 'decimal', oninput: update });
      els[f.id] = ctl;
    }
    const wrapEl = h('label', { class: 'field' + (f.wide ? ' wide' : ''), for: 'c-' + f.id }, f.label ? h('span', {}, tr(f.label)) : null, ctl);
    if (f.show) wrapEl.dataset.show = '1';
    f.el = wrapEl; form.append(wrapEl);
  }
  function paintSeg() { for (const f of fields) if (f.type === 'seg') els[f.id].querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === els[f.id].value)); }
  function vals() { const o = {}; for (const f of fields) o[f.id] = f.type === 'check' ? els[f.id].checked : f.type === 'seg' || f.type === 'select' || f.type === 'date' ? els[f.id].value : parseFloat(String(els[f.id].value).replace(',', '.')); return o; }
  function update() {
    const v = vals();
    for (const f of fields) if (f.show) f.el.hidden = !f.show(v);
    result.replaceChildren(...[compute(v)].flat().filter(Boolean));
  }
  root.append(h('div', { class: 'calc' }, form, result));
  paintSeg(); update();
  return { destroy() {} };
}
const big = (label, value, sub) => h('div', { class: 'big' }, h('span', { class: 'k' }, label), h('strong', {}, value), sub ? h('span', { class: 's' }, sub) : null);
const line = (k, v, tone) => h('div', { class: 'line' + (tone ? ' ' + tone : '') }, h('span', {}, k), h('b', {}, v));

// Срок родов
function mountDueDate(root) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return calcShell(root, [
    { id: 'm', type: 'seg', value: 'lmp', options: [['lmp', L('По ПДМ', 'СЕК бойынша', 'By LMP')], ['et', L('По переносу эмбриона', 'Эмбрион тасымалдау бойынша', 'By embryo transfer')]], wide: true },
    { id: 'lmp', type: 'date', value: isoDay(addDays(today, -56)), label: L('Первый день последней менструации', 'Соңғы етеккірдің бірінші күні', 'First day of last period'), show: (v) => v.m === 'lmp' },
    { id: 'cyc', value: 28, min: 20, max: 45, step: 1, label: L('Длина цикла, дней', 'Цикл ұзақтығы, күн', 'Cycle length, days'), show: (v) => v.m === 'lmp' },
    { id: 'et', type: 'date', value: isoDay(addDays(today, -30)), label: L('Дата переноса', 'Тасымалдау күні', 'Transfer date'), show: (v) => v.m === 'et' },
    { id: 'day', type: 'select', value: 5, options: [[3, L('3 сутки (дробление)', '3 тәулік (бөліну)', 'Day 3 (cleavage)')], [5, L('5 сутки (бластоциста)', '5 тәулік (бластоциста)', 'Day 5 (blastocyst)')], [6, L('6 сутки (бластоциста)', '6 тәулік (бластоциста)', 'Day 6 (blastocyst)')]], label: L('Возраст эмбриона', 'Эмбрион жасы', 'Embryo age'), show: (v) => v.m === 'et' },
  ], (v) => {
    let conception;
    if (v.m === 'lmp') { const d = new Date(v.lmp + 'T00:00:00'); if (isNaN(d) || !v.cyc) return null; conception = addDays(d, 14 + (v.cyc - 28)); }
    else { const d = new Date(v.et + 'T00:00:00'); if (isNaN(d)) return null; conception = addDays(d, -parseInt(v.day)); }
    const start = addDays(conception, -14), edd = addDays(conception, 266);
    const ga = Math.floor((today - start) / 86400000);
    const gaTxt = ga >= 0 ? `${Math.floor(ga / 7)} ${tr(L('нед', 'апта', 'wk'))} ${ga % 7} ${tr(L('дн', 'күн', 'd'))}` : '—';
    return [
      h('div', { class: 'bigs' }, big(tr(L('Предполагаемая дата родов', 'Болжамды босану күні', 'Estimated due date')), fmtDate(edd)), big(tr(L('Срок сегодня', 'Бүгінгі мерзім', 'Gestational age today')), gaTxt)),
      line(tr(L('Зачатие / овуляция', 'Ұрықтану / овуляция', 'Conception / ovulation')), fmtDate(conception)),
      line(tr(L('Тест на β-ХГЧ (≈ 9 дней после)', 'β-ХГЧ тесті (≈ 9 күннен кейін)', 'β-hCG test (≈ 9 days after)')), fmtDate(addDays(conception, 9))),
      line(tr(L('Скрининг I триместра (11+0 – 13+6 нед)', 'I триместр скринингі (11+0 – 13+6 апта)', '1st-trimester screening (11+0 – 13+6 wk)')), `${fmtDate(addDays(start, 77))} – ${fmtDate(addDays(start, 97))}`),
      line(tr(L('Конец I триместра (13+6 нед)', 'I триместр соңы (13+6 апта)', 'End of 1st trimester (13+6 wk)')), fmtDate(addDays(start, 97))),
    ];
  });
}

// Удвоение ХГЧ
function mountHcg(root) {
  return calcShell(root, [
    { id: 'a', value: 120, label: L('β-ХГЧ, первое значение (мЕд/мл)', 'β-ХГЧ, бірінші мән (мБ/мл)', 'β-hCG, first value (mIU/mL)') },
    { id: 'b', value: 265, label: L('β-ХГЧ, второе значение (мЕд/мл)', 'β-ХГЧ, екінші мән (мБ/мл)', 'β-hCG, second value (mIU/mL)') },
    { id: 't', value: 48, label: L('Интервал между заборами, ч', 'Алу аралығы, сағ', 'Interval between draws, h') },
  ], (v) => {
    if (!(v.a > 0 && v.b > 0 && v.t > 0)) return null;
    const ratio = v.b / v.a, rise48 = (Math.pow(ratio, 48 / v.t) - 1) * 100;
    const dt = ratio > 1 ? (Math.LN2 * v.t) / Math.log(ratio) : null;
    const minRise = v.a < 1500 ? 49 : v.a < 3000 ? 40 : 33;
    const ok = rise48 >= minRise;
    return [
      h('div', { class: 'bigs' },
        big(tr(L('Время удвоения', 'Екі еселену уақыты', 'Doubling time')), dt ? `${num(dt)} ${tr(L('ч', 'сағ', 'h'))}` : '—'),
        big(tr(L('Прирост за 48 ч', '48 сағаттағы өсім', 'Rise over 48 h')), `${num(rise48, 0)}%`, `${tr(L('минимум ожидаемый', 'күтілетін минимум', 'minimum expected'))} ${minRise}%`)),
      line(tr(L('Оценка прироста', 'Өсімді бағалау', 'Rise assessment')), ok ? tr(L('в пределах ожидаемого', 'күтілгендей', 'within expected range')) : tr(L('ниже ожидаемого — обсудите с врачом', 'күтілгеннен төмен — дәрігермен талқылаңыз', 'below expected — discuss with a clinician')), ok ? 'good' : 'warn'),
      h('p', { class: 'hint' }, tr(L('Минимальный ожидаемый прирост за 48 ч для маточной беременности: 49% при исходном уровне < 1500, 40% при 1500–3000, 33% при > 3000 мЕд/мл (Barnhart et al., 2016). Медленный прирост — не диагноз.', 'Жатырішілік жүктілік үшін 48 сағаттағы ең аз күтілетін өсім: бастапқы деңгей < 1500 болса 49%, 1500–3000 болса 40%, > 3000 мБ/мл болса 33% (Barnhart et al., 2016). Баяу өсім — диагноз емес.', 'Minimum expected 48-h rise for an intrauterine pregnancy: 49% for a starting level < 1500, 40% for 1500–3000, 33% for > 3000 mIU/mL (Barnhart et al., 2016). A slow rise is not a diagnosis.'))),
    ];
  });
}

// TMSC + сравнение с ВОЗ-6 (нижние референсы, 5-й процентиль)
function mountTmsc(root) {
  return calcShell(root, [
    { id: 'vol', value: 3.0, step: 0.1, label: L('Объём, мл', 'Көлем, мл', 'Volume, mL') },
    { id: 'conc', value: 40, label: L('Концентрация, млн/мл', 'Концентрация, млн/мл', 'Concentration, M/mL') },
    { id: 'pr', value: 35, label: L('Прогрессивная подвижность PR, %', 'Прогрессивті қозғалғыштық PR, %', 'Progressive motility PR, %') },
    { id: 'np', value: 10, label: L('Непрогрессивная NP, %', 'Прогрессивті емес NP, %', 'Non-progressive NP, %') },
  ], (v) => {
    if (!(v.vol > 0 && v.conc >= 0)) return null;
    const pr = v.pr || 0, np = v.np || 0, total = v.vol * v.conc, tmsc = total * (pr + np) / 100, tpmsc = total * pr / 100;
    const guide = tmsc >= 9 ? L('TMSC ≥ 9 млн: внутриматочная инсеминация обоснована', 'TMSC ≥ 9 млн: жатырішілік инсеминация негізделген', 'TMSC ≥ 9 M: intrauterine insemination is reasonable')
      : tmsc >= 1 ? L('TMSC 1–9 млн: ВМИ с меньшими шансами или ЭКО', 'TMSC 1–9 млн: мүмкіндігі азырақ ЖІҰ немесе ЭКҰ', 'TMSC 1–9 M: IUI with lower odds, or IVF')
      : L('TMSC < 1 млн: как правило, ИКСИ', 'TMSC < 1 млн: әдетте ИКСИ', 'TMSC < 1 M: usually ICSI');
    const who = [
      [L('Объём', 'Көлем', 'Volume'), v.vol, 1.4, L('мл', 'мл', 'mL')],
      [L('Концентрация', 'Концентрация', 'Concentration'), v.conc, 16, L('млн/мл', 'млн/мл', 'M/mL')],
      [L('Общее количество', 'Жалпы саны', 'Total count'), total, 39, L('млн', 'млн', 'M')],
      [L('Общая подвижность (PR+NP)', 'Жалпы қозғалғыштық (PR+NP)', 'Total motility (PR+NP)'), pr + np, 42, '%'],
      [L('Прогрессивная подвижность', 'Прогрессивті қозғалғыштық', 'Progressive motility'), pr, 30, '%'],
    ];
    return [
      h('div', { class: 'bigs' }, big('TMSC', `${num(tmsc)} ${tr(L('млн', 'млн', 'M'))}`, `PR: ${num(tpmsc)} ${tr(L('млн', 'млн', 'M'))}`), big(tr(L('Ориентир', 'Бағдар', 'Guide')), tr(guide))),
      h('h4', { class: 'sub' }, tr(L('Сравнение с нижними референсами ВОЗ-6 (2021)', 'ДДҰ-6 төменгі референстерімен салыстыру (2021)', 'Against WHO-6 lower reference limits (2021)'))),
      ...who.map(([k, val, ref, u]) => line(`${tr(k)} · ≥ ${ref} ${tr(u)}`, `${num(val, val < 10 ? 1 : 0)} ${tr(u)}`, val >= ref ? 'good' : 'warn')),
      h('p', { class: 'hint' }, tr(L('Пороги ВМИ/ЭКО/ИКСИ различаются между клиниками; решение принимает врач. Значения можно перенести из отчёта BOPASI.', 'ЖІҰ/ЭКҰ/ИКСИ табалдырықтары клиникаларда әртүрлі; шешімді дәрігер қабылдайды. Мәндерді BOPASI есебінен көшіруге болады.', 'IUI/IVF/ICSI cut-offs vary by clinic; the clinician decides. Values can be copied from the BOPASI report.'))),
    ];
  });
}

// Фертильное окно
function mountFertile(root) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return calcShell(root, [
    { id: 'd', type: 'date', value: isoDay(addDays(today, -6)), label: L('Первый день цикла', 'Цикл бірінші күні', 'First day of cycle') },
    { id: 'c', value: 28, min: 20, max: 45, label: L('Длина цикла, дней', 'Цикл ұзақтығы, күн', 'Cycle length, days') },
    { id: 'l', value: 14, min: 10, max: 17, label: L('Лютеиновая фаза, дней', 'Лютеин фазасы, күн', 'Luteal phase, days') },
  ], (v) => {
    const d = new Date(v.d + 'T00:00:00'); if (isNaN(d) || !v.c || !v.l) return null;
    return [0, 1, 2].map((k) => {
      const start = addDays(d, v.c * k), ovu = addDays(start, v.c - v.l);
      return h('div', { class: 'cycle' }, h('span', { class: 'k' }, `${tr(L('Цикл', 'Цикл', 'Cycle'))} ${k + 1}`),
        h('span', {}, `${tr(L('Окно', 'Терезе', 'Window'))}: ${fmtDate(addDays(ovu, -5))} – ${fmtDate(ovu)}`),
        h('b', {}, `${tr(L('Овуляция', 'Овуляция', 'Ovulation'))}: ${fmtDate(ovu)}`));
    }).concat(h('p', { class: 'hint' }, tr(L('Овуляция ≈ начало следующего цикла минус длина лютеиновой фазы; окно — 5 дней до овуляции и день овуляции (Wilcox et al., 1995). При нерегулярном цикле используйте ЛГ-тесты или УЗИ.', 'Овуляция ≈ келесі циклдің басы минус лютеин фазасының ұзақтығы; терезе — овуляцияға дейінгі 5 күн және овуляция күні (Wilcox et al., 1995). Тұрақсыз циклде ЛГ-тесттерін немесе УДЗ пайдаланыңыз.', 'Ovulation ≈ next cycle start minus luteal length; the window is the 5 days before ovulation plus ovulation day (Wilcox et al., 1995). For irregular cycles use LH tests or ultrasound.'))));
  });
}

// Гарднер
function mountGardner(root) {
  const EXP = {
    1: L('Ранняя бластоциста: полость меньше половины объёма', 'Ерте бластоциста: қуыс көлемнің жартысынан аз', 'Early blastocyst: cavity under half the volume'),
    2: L('Бластоциста: полость больше половины объёма', 'Бластоциста: қуыс көлемнің жартысынан көп', 'Blastocyst: cavity over half the volume'),
    3: L('Полная бластоциста: полость заполняет эмбрион', 'Толық бластоциста: қуыс эмбрионды толтырады', 'Full blastocyst: cavity fills the embryo'),
    4: L('Расширенная: объём увеличен, зона истончена', 'Кеңейген: көлемі ұлғайған, аймақ жұқарған', 'Expanded: volume larger, zona thinned'),
    5: L('Хетчинг: трофэктодерма выходит через зону', 'Хетчинг: трофэктодерма аймақтан шығуда', 'Hatching: trophectoderm herniating through the zona'),
    6: L('Вылупившаяся: полностью вне зоны', 'Шыққан: аймақтан толық шыққан', 'Hatched: fully out of the zona'),
  };
  const ICM = { A: L('много плотно упакованных клеток', 'көп тығыз жасушалар', 'many tightly packed cells'), B: L('несколько рыхло сгруппированных клеток', 'бірнеше бос топталған жасуша', 'several loosely grouped cells'), C: L('очень мало клеток', 'жасушалар өте аз', 'very few cells') };
  const TE = { A: L('много клеток, плотный эпителий', 'көп жасуша, тығыз эпителий', 'many cells, cohesive epithelium'), B: L('немного клеток, рыхлый эпителий', 'аздаған жасуша, бос эпителий', 'few cells, loose epithelium'), C: L('очень мало крупных клеток', 'өте аз ірі жасуша', 'very few large cells') };
  const abc = [['A', 'A'], ['B', 'B'], ['C', 'C']];
  return calcShell(root, [
    { id: 'e', type: 'range', min: 1, max: 6, value: 4, label: L('Степень расширения (1–6)', 'Кеңею дәрежесі (1–6)', 'Expansion stage (1–6)'), wide: true },
    { id: 'icm', type: 'seg', value: 'A', options: abc, label: L('Внутренняя клеточная масса', 'Ішкі жасушалық масса', 'Inner cell mass'), show: (v) => v.e >= 3 },
    { id: 'te', type: 'seg', value: 'A', options: abc, label: L('Трофэктодерма', 'Трофэктодерма', 'Trophectoderm'), show: (v) => v.e >= 3 },
  ], (v) => {
    const e = Math.round(v.e), early = e < 3;
    const score = early ? -1 : ({ A: 2, B: 1, C: 0 }[v.icm] + { A: 2, B: 1, C: 0 }[v.te]);
    const cat = early ? L('ранняя стадия', 'ерте саты', 'early stage') : score === 4 ? L('отличная', 'өте жақсы', 'excellent') : score === 3 ? L('хорошая', 'жақсы', 'good') : score === 2 ? L('удовлетворительная', 'қанағаттанарлық', 'fair') : L('плохая', 'нашар', 'poor');
    const hint = early ? L('Оцените ВКМ и трофэктодерму, когда бластоциста достигнет стадии 3 и выше.', 'Бластоциста 3-сатыға жеткенде ІЖМ мен трофэктодерманы бағалаңыз.', 'Grade ICM and trophectoderm once the blastocyst reaches stage 3 or higher.')
      : score >= 3 ? L('Ориентир: высокий приоритет для переноса или криоконсервации.', 'Бағдар: тасымалдау немесе криоконсервация үшін жоғары басымдық.', 'Guide: high priority for transfer or vitrification.')
      : score === 2 ? L('Ориентир: средний приоритет; учитывайте день развития и морфокинетику.', 'Бағдар: орташа басымдық; даму күні мен морфокинетиканы ескеріңіз.', 'Guide: medium priority; consider development day and morphokinetics.')
      : L('Ориентир: низкий приоритет; решение — с учётом морфокинетики, PGT-A и клинической ситуации.', 'Бағдар: төмен басымдық; шешім морфокинетиканы, PGT-A және клиникалық жағдайды ескере отырып.', 'Guide: low priority; decide with morphokinetics, PGT-A and the clinical context.');
    return [
      h('div', { class: 'bigs' }, big(tr(L('Грейд по Гарднеру', 'Гарднер грейді', 'Gardner grade')), early ? String(e) : `${e}${v.icm}${v.te}`), big(tr(L('Категория', 'Санат', 'Category')), tr(cat))),
      line(tr(L('Расширение', 'Кеңею', 'Expansion')) + ` ${e}`, tr(EXP[e])),
      !early && line(tr(L('ВКМ', 'ІЖМ', 'ICM')) + ` ${v.icm}`, tr(ICM[v.icm])),
      !early && line(tr(L('Трофэктодерма', 'Трофэктодерма', 'Trophectoderm')) + ` ${v.te}`, tr(TE[v.te])),
      h('p', { class: 'hint' }, tr(hint)),
    ];
  });
}
