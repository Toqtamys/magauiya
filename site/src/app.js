// ─── Приложение: страница, путешествие сквозь клетку, панели инструментов ───
const ORDER = CHAPTERS.flatMap((c) => c.tools);
const toolById = (id) => TOOLS_DATA.find((t) => t.id === id);
const chapterOf = (id) => CHAPTERS.find((c) => c.tools.includes(id));
const isServer = (id) => !!toolById(id)?.server;
const MOLMODA_URL = 'https://molmoda.org/';
const MOUNT = {
  bopasi: (r) => mountEmbed(r, 'bopasi'), bluetol: (r) => mountEmbed(r, 'bluetol'), scd: mountScd, who6: mountWho, chamber: mountChamber,
  'lab-counter': mountCounter, tmsc: mountTmsc, 'rc-phase': mountRcpc, morphometry: mountMorphometry, cleavage: mountCleavage,
  kinetics: mountKinetics, gardner: mountGardner, poseidon: mountPoseidon, 'due-date': mountDueDate, 'hcg-doubling': mountHcg,
  'fertile-window': mountFertile, constructor: mountConstructor, 'he-nuclei': (r) => mountHisto(r, 'he'), ki67: (r) => mountHisto(r, 'dab'),
  molmoda: mountMolmoda,
};
const kindOf = (id) => (isServer(id) ? SERVER_KIND : KIND[id] || L('расчёт', 'есептеу', 'calculator'));
const MQ = matchMedia('(max-width: 979px)');

// нормы для списка: [группа, [[название, значение], …]]
const NORMS = [
  [L('Спермограмма · ВОЗ 2021, нижние пределы', 'Спермограмма · ДДҰ 2021, төменгі шектер', 'Semen analysis · WHO 2021, lower limits'), [
    [L('Объём', 'Көлем', 'Volume'), '1,4 мл'], [L('Концентрация', 'Концентрация', 'Concentration'), '16 млн/мл'],
    [L('Общее количество', 'Жалпы саны', 'Total number'), '39 млн'], [L('Общая подвижность', 'Жалпы қозғалғыштық', 'Total motility'), '42%'],
    [L('Прогрессивная подвижность', 'Прогрессивті қозғалғыштық', 'Progressive motility'), '30%'], [L('Жизнеспособность', 'Тіршілікке қабілеттілік', 'Vitality'), '54%'],
    [L('Нормальные формы', 'Қалыпты пішіндер', 'Normal forms'), '4%'], ['pH', '≥ 7,2'],
    [L('Лейкоциты, верхний предел', 'Лейкоциттер, жоғарғы шек', 'Leukocytes, upper limit'), '1,0 млн/мл']]],
  [L('Камеры для подсчёта', 'Санауға арналған камералар', 'Counting chambers'), [
    [L('Большой квадрат Нейбауэра', 'Нейбауэрдің үлкен шаршысы', 'Neubauer large square'), '0,004 мкл'], [L('Квадрат Маклера', 'Маклер шаршысы', 'Makler square'), '0,0001 мкл'],
    [L('Согласие двух повторов', 'Екі қайталаудың сәйкестігі', 'Agreement of two replicates'), '|N₁−N₂| ≤ 1,96√(N₁+N₂)']]],
  [L('Эмбрион 2–3 дня · Стамбульский консенсус', '2–3 күндік эмбрион · Стамбул консенсусы', 'Day 2–3 embryo · Istanbul consensus'), [
    [L('Грейд 1, фрагментация', '1-грейд, фрагментация', 'Grade 1, fragmentation'), '< 10%'], [L('Грейд 2', '2-грейд', 'Grade 2'), '10–25%'],
    [L('Грейд 3', '3-грейд', 'Grade 3'), L('> 25% или многоядерность', '> 25% немесе көпядролық', '> 25% or multinucleation')],
    [L('4 клетки', '4 жасуша', '4 cells'), L('44 ± 1 ч', '44 ± 1 сағ', '44 ± 1 h')], [L('8 клеток', '8 жасуша', '8 cells'), L('68 ± 1 ч', '68 ± 1 сағ', '68 ± 1 h')]]],
  [L('Морфокинетика · Meseguer 2011', 'Морфокинетика · Meseguer 2011', 'Morphokinetics · Meseguer 2011'), [
    ['t5', L('48,8–56,6 ч', '48,8–56,6 сағ', '48.8–56.6 h')], ['s2 = t4 − t3', L('≤ 0,76 ч', '≤ 0,76 сағ', '≤ 0.76 h')], ['cc2 = t3 − t2', L('≤ 11,9 ч', '≤ 11,9 сағ', '≤ 11.9 h')]]],
  ['POSEIDON', [
    [L('Возраст', 'Жас', 'Age'), L('35 лет', '35 жас', '35 years')], [L('АМГ', 'АМГ', 'AMH'), L('1,2 нг/мл', '1,2 нг/мл', '1.2 ng/mL')],
    [L('Антральные фолликулы', 'Антральды фолликулдар', 'Antral follicle count'), '5'], [L('Субоптимальный ответ', 'Субоптималды жауап', 'Suboptimal response'), L('4–9 ооцитов', '4–9 ооцит', '4–9 oocytes')]]],
];

const App = {
  panelTool: null, mounted: null, anchors: [],

  start() {
    const saved = store.get('lang'), qs = new URLSearchParams(location.search).get('lang');
    LANG = LANGS.includes(qs) ? qs : LANGS.includes(saved) ? saved : 'ru';
    this.canvas = h('canvas', { id: 'stage', role: 'img', 'aria-label': 'BOPASI: от сперматозоидов до белка' });
    this.render();
    Stage.init(this.canvas);
    this.bind();
    addEventListener('hashchange', () => this.route());
    this.route(true);
    requestAnimationFrame(() => document.body.classList.add('ready'));
  },

  // ── вся страница строится из данных: смена языка — перерисовка
  render() {
    document.documentElement.lang = LANG;
    document.title = 'BOPASI — ' + tr(UI.title);
    $('#langs').replaceChildren(...LANGS.map((l) => h('button', { class: l === LANG ? 'on' : '', 'aria-pressed': l === LANG, onclick: () => this.setLang(l) }, LANG_LABEL[l])));
    $('#navLinks').replaceChildren(...[['tools', UI.nav.tools], ['norms', UI.nav.norms], ['server', UI.nav.server], ['about', UI.nav.about]].map(([id, t]) => h('a', { href: '#' + id }, tr(t))));
    const y = scrollY;
    $('#page').replaceChildren(
      h('div', { class: 'split' },
        h('div', { class: 'read' }, this.hero(), this.intro(), this.figure(), this.menu()), h('div', { class: 'slot' })),
      this.showcase(),
      h('div', { class: 'split' }, h('div', { class: 'read' }, this.norms()), h('div', { class: 'slot' })),
      this.steps(),
      h('div', { class: 'split' }, h('div', { class: 'read' }, this.server(), this.about()), h('div', { class: 'slot' })),
      this.footer());
    scrollTo(0, y);
    this.anchors = [
      ['top', 0], ['intro', 0.35],
      ...CHAPTERS.map((c) => ['m-' + c.id, c.scene]),
      ['norms', 8], ['about', 8],
    ];
    this.prepareReveal();
    this.drawFigure(3);
    this.drawSteps();
    $('.slot').append(this.canvas);
    this.onScroll();
    Stage.redraw();
  },

  hero() {
    // полоса — исчерченность хромосомы (G-бэнды): ширины тёмных и светлых полос
    const bands = [10, 6, 22, 8, 14, 5, 30, 10, 8, 18, 6, 12, 26, 7, 9, 16, 5, 20, 12, 8, 28, 6, 14, 10, 7, 24, 9, 15, 6, 18];
    return h('header', { class: 'hero', id: 'top' },
      h('div', { class: 'bands', 'aria-hidden': 'true' }, ...bands.map((w, i) => h('i', { class: i % 2 ? 'l' : 'd', style: `flex-grow:${w}` }))),
      h('div', { class: 'hero-body' },
        h('h1', {}, tr(UI.title)),
        h('p', { class: 'lead' }, tr(UI.lead)),
        h('a', { class: 'btn-big', href: '#bopasi', onclick: (e) => this.from(e) }, tr(UI.cta)),
        h('p', { class: 'hero-links' }, ...['tools', 'norms', 'server'].map((id) => h('a', { href: '#' + id }, tr(UI.nav[id]))))));
  },
  intro() {
    return h('section', { class: 'intro', id: 'intro' },
      h('h2', { class: 'reveal' }, tr(UI.introH)),
      ...UI.intro.map((p, i) => h('p', { class: 'reveal' + (i === 0 ? ' first' : ''), style: `--d:${60 + i * 70}ms` }, tr(p))));
  },
  figure() {
    const c = h('canvas', { class: 'fig-canvas', width: 900, height: 560, role: 'img', 'aria-label': tr(UI.figH) });
    this.fig = { c, seed: 3, out: h('p', { class: 'fig-num' }) };
    return h('figure', { class: 'fig reveal', 'data-ui': '' },
      h('div', { class: 'fig-head' }, h('h3', {}, tr(UI.figH)), this.fig.out),
      h('button', { class: 'fig-btn', 'aria-label': tr(UI.figCap), onclick: () => this.drawFigure(++this.fig.seed) }, c),
      h('figcaption', {}, tr(UI.figCap)));
  },
  drawFigure(seed) {
    if (!this.fig) return;
    const { canvas } = IHC.synth({ kind: 'dab', seed: seed * 7 + 1, w: 900, h: 560, count: 150, pos: 0.15 + ((seed * 37) % 50) / 100, touch: true });
    const res = IHC.detect(canvas.getContext('2d').getImageData(0, 0, 900, 560), { kind: 'dab' });
    const g = this.fig.c.getContext('2d'); g.drawImage(canvas, 0, 0);
    g.lineWidth = 2.5;
    for (const q of res.nuclei) { g.strokeStyle = q.pos ? '#9a4a12' : '#1f4fff'; g.beginPath(); g.arc(q.x, q.y, Math.sqrt(q.area / Math.PI) + 2, 0, 6.283); g.stroke(); }
    const s = IHC.summary(res);
    this.fig.out.textContent = `Ki-67 ${num(s.index * 100)}% · ${s.pos} / ${s.n}`;
  },
  menu() {
    return h('section', { class: 'menu', id: 'tools' },
      h('div', { class: 'sheet' },
        h('h2', {}, tr(UI.toolsH)),
        h('p', { class: 'sheet-note' }, tr(UI.toolsNote)),
        ...CHAPTERS.map((c) => h('div', { class: 'group', id: 'm-' + c.id },
          h('h3', {}, tr(c.name)),
          h('ul', {}, ...c.tools.map((id) => h('li', { class: 'reveal' },
            h('a', { href: '#' + id, class: 'item' + (isServer(id) ? ' srv' : ''), onclick: (e) => this.from(e) },
              h('span', { class: 'name' }, tr(SHORT[id])), h('span', { class: 'dots', 'aria-hidden': 'true' }), h('span', { class: 'val' }, tr(kindOf(id)))),
            h('p', { class: 'desc' }, tr(toolById(id).tagline)))))))));
  },
  showcase() {
    const right = h('div', { class: 'show-r' });
    const sec = h('section', { class: 'show', id: 'live' },
      h('div', { class: 'show-l' }, h('p', { class: 'show-hint' }, tr(UI.showHint)), h('div', { class: 'show-form' }), h('h2', { class: 'show-h l' }, tr(UI.showA))),
      h('div', { class: 'show-rw' }, right, h('p', { class: 'show-h r', 'aria-hidden': 'true' }, tr(UI.showB))));
    const tmp = h('div');
    mountWho(tmp);
    const form = tmp.querySelector('.calc-form'), result = tmp.querySelector('.calc-result');
    sec.querySelector('.show-form').replaceWith(form);
    result.setAttribute('data-ui', '');
    right.append(result);
    return sec;
  },
  norms() {
    return h('section', { class: 'norms', id: 'norms' },
      h('h2', { class: 'reveal' }, tr(UI.normsH)),
      ...NORMS.map(([grp, rows]) => h('div', { class: 'ngroup' },
        h('p', { class: 'nhead' }, tr(grp)),
        h('ul', {}, ...rows.map(([k, v]) => h('li', { class: 'reveal' }, h('i', { 'aria-hidden': 'true' }), h('span', { class: 'k' }, tr(k)), h('span', { class: 'v' }, tr(v))))))));
  },
  steps() {
    const range = h('input', { type: 'range', min: 0, max: 3, step: 1, value: 0, 'aria-label': tr(UI.stepsLabel) });
    const names = h('ol', { class: 'step-names' }, ...UI.steps.map(([, n], i) => h('li', { 'data-i': i }, h('button', { onclick: () => { range.value = i; this.setStep(i); } }, tr(n)))));
    range.addEventListener('input', () => this.setStep(+range.value));
    this.stepEls = { range, names, clause: h('h2', { class: 'step-clause' }), frag: h('div', { class: 'step-frag', 'data-ui': '' }) };
    return h('section', { class: 'steps', id: 'how' },
      h('div', { class: 'steps-l' }, this.stepEls.clause),
      h('div', { class: 'steps-r' }, this.stepEls.frag),
      h('div', { class: 'steps-ctl' }, range, names));
  },
  drawSteps() {
    if (!this.scd) {
      const { img } = SCD.synth({ seed: 11 });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
      const res = SCD.detect(SCD.prepare(c.getContext('2d').getImageData(0, 0, c.width, c.height)), {});
      this.scd = { c, res, sum: SCD.summary(res.cells) };
    }
    this.setStep(+this.stepEls.range.value || 0);
  },
  setStep(i) {
    const { clause, frag, names } = this.stepEls, { c, res, sum } = this.scd;
    clause.textContent = tr(UI.steps[i][0]);
    names.querySelectorAll('li').forEach((li) => li.classList.toggle('on', +li.dataset.i === i));
    const cv = h('canvas', { width: c.width, height: c.height, class: 'step-canvas', role: 'img', 'aria-label': tr(UI.steps[i][1]) });
    const g = cv.getContext('2d'); g.drawImage(c, 0, 0);
    if (i >= 1) {
      for (const k of res.cells) {
        g.strokeStyle = i === 1 ? '#ffffff' : SCD_COL[k.cls]; g.lineWidth = 3;
        g.save(); g.translate(k.x, k.y); g.rotate(k.angle); g.beginPath(); g.ellipse(0, 0, k.major / 2 + 3, k.minor / 2 + 3, 0, 0, 6.283); g.stroke(); g.restore();
        if (i >= 2 && k.halo > 0) { g.setLineDash([5, 5]); g.globalAlpha = 0.6; g.beginPath(); g.arc(k.x, k.y, k.major / 2 + k.halo, 0, 6.283); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
      }
    }
    const kids = [cv];
    if (i === 3) {
      kids.push(h('div', { class: 'step-report' },
        h('p', { class: 'sr-big' }, `DFI ${num(sum.dfi)}%`),
        h('p', {}, `${sum.frag} / ${sum.counted}`),
        ...['large', 'medium', 'small', 'none', 'degraded'].map((k) => h('p', { class: 'sr-row' }, h('i', { style: `background:${SCD_COL[k]}` }), `${tr(SCD_NAME[k])}: ${sum.n[k]}`))));
    }
    frag.replaceChildren(...kids);
  },
  server() {
    const list = h('ul', { class: 'srv-list' });
    const paint = (tools) => list.replaceChildren(...TOOLS_DATA.filter((t) => t.server).map((t) => {
      const info = tools && tools[t.id];
      const st = !tools ? tr(UI.unchecked) : info?.available ? tr(UI.available) : tr(UI.notInstalled);
      return h('li', { class: info?.available ? 'ok' : '' }, h('span', { class: 'k' }, tr(SHORT[t.id])), h('span', { class: 'v' }, st));
    }));
    paint(Server.tools);
    return h('section', { class: 'server', id: 'server' },
      h('h2', { class: 'reveal' }, tr(UI.serverH)),
      h('p', { class: 'reveal' }, tr(UI.serverText)),
      h('div', { class: 'srv-frag reveal', 'data-ui': '' }, serverBox(paint), list));
  },
  about() {
    return h('section', { class: 'about', id: 'about' },
      h('h2', { class: 'reveal' }, tr(UI.aboutH)),
      ...UI.about.map((p) => h('p', { class: 'reveal' }, tr(p))),
      h('p', { class: 'sign reveal' }, tr(UI.sign)),
      h('p', { class: 'role reveal' }, `${tr(UI.role)} · `, h('a', { href: 'mailto:orda.ezhenid@gmail.com' }, 'orda.ezhenid@gmail.com')));
  },
  footer() {
    return h('footer', { class: 'foot' },
      h('span', {}, tr(UI.footWhat)),
      h('span', { class: 'foot-links' }, ...['tools', 'norms', 'server', 'about'].map((id) => h('a', { href: '#' + id }, tr(UI.nav[id])))),
      h('span', { class: 'foot-r' }, tr(UI.footDisc)));
  },

  // ── появление: заголовок, потом текст, потом картинка; только ниже первого экрана
  prepareReveal() {
    if (!('IntersectionObserver' in window) || REDUCED) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.reveal').forEach((el) => { if (el.getBoundingClientRect().top > innerHeight * 0.95) { el.classList.add('pre'); io.observe(el); } });
  },

  setLang(l) { LANG = l; store.set('lang', l); this.render(); if (this.panelTool) this.openTool(this.panelTool, true); },
  from(e) { this.origin = { x: e.clientX, y: e.clientY }; },

  bind() {
    addEventListener('scroll', () => this.onScroll(), { passive: true });
    addEventListener('resize', () => this.onScroll());
    MQ.addEventListener?.('change', () => this.onScroll());
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.panelTool) { e.preventDefault(); this.close(); } });
    $('#pBack').addEventListener('click', () => this.close());
    $('#logo').addEventListener('click', (e) => { e.preventDefault(); this.close(); scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); });
  },

  // ── прокрутка → положение в путешествии (непрерывно между якорями)
  onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#progress').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    if (this.panelTool) return;
    if (MQ.matches) { const first = $('.slot'); if (this.canvas.parentElement !== first) first.append(this.canvas); Stage.setAuto(true); return; }
    let slot = null;
    for (const el of document.querySelectorAll('.slot')) { const b = el.parentElement.getBoundingClientRect(); if (b.top < innerHeight * 0.6 && b.bottom > innerHeight * 0.4) slot = el; }
    if (slot && this.canvas.parentElement !== slot) slot.append(this.canvas);
    Stage.setAuto(false);
    const mid = innerHeight * 0.5;
    const pts = this.anchors.map(([id, p]) => { const el = document.getElementById(id); return el ? [el.getBoundingClientRect().top - mid, p] : null; }).filter(Boolean);
    let p = pts[0][1];
    for (let i = 0; i < pts.length; i++) {
      const [d, v] = pts[i];
      if (d <= 0) { p = v; const nx = pts[i + 1]; if (nx && nx[0] > 0) p = v + (nx[1] - v) * (-d / (nx[0] - d)); }
    }
    Stage.set(p);
  },

  // ── маршрут: #<инструмент> открывает панель; иначе — якоря страницы
  route(first) {
    const id = decodeURIComponent(location.hash.slice(1));
    if (toolById(id)) return this.openTool(id, true);
    if (this.panelTool) this.hidePanel();
    if (first && id && document.getElementById(id)) setTimeout(() => document.getElementById(id).scrollIntoView(), 50);
  },
  close() {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    this.hidePanel();
  },
  hidePanel() {
    const p = $('#panel');
    document.body.classList.remove('panel-open'); p.setAttribute('aria-hidden', 'true');
    if (this.mounted) { try { this.mounted.destroy(); } catch {} this.mounted = null; }
    const id = this.panelTool; this.panelTool = null;
    Stage.pause(false);
    setTimeout(() => { if (!this.panelTool) $('#toolMount').replaceChildren(); }, 700);
    if (id) { const a = document.querySelector(`.item[href="#${CSS.escape(id)}"]`); if (a) a.focus({ preventScroll: true }); }
    this.onScroll();
  },
  openTool(id, fromRoute) {
    const t = toolById(id); if (!t) return;
    if (!fromRoute && location.hash !== '#' + id) { location.hash = id; return; }
    if (this.mounted) { try { this.mounted.destroy(); } catch {} this.mounted = null; }
    const o = this.origin || { x: innerWidth / 2, y: innerHeight / 2 }; this.origin = null;
    const p = $('#panel'); p.style.setProperty('--cx', `${o.x}px`); p.style.setProperty('--cy', `${o.y}px`);
    this.panelTool = id;
    const i = ORDER.indexOf(id), ch = chapterOf(id);
    document.body.classList.add('panel-open'); p.setAttribute('aria-hidden', 'false');
    setTimeout(() => { if (this.panelTool) Stage.pause(true); }, 800);
    $('#pBack').replaceChildren(h('span', { 'aria-hidden': 'true' }, '← '), tr(UI.back));
    $('#pEyebrow').textContent = `${tr(ch.name)} · ${tr(kindOf(id))}`;
    $('#pTitle').textContent = tr(t.name);
    $('#pLead').textContent = tr(t.tagline);
    $('#pNote').textContent = tr(t.server ? UI.serverNote : UI.localNote);
    $('#pNote').classList.toggle('srv', !!t.server);
    const sec = (title, items, cls, ordered) => items?.length ? h('section', { class: 'info ' + (cls || '') }, h('h3', {}, tr(title)), h(ordered ? 'ol' : 'ul', {}, ...items.map((x) => h('li', {}, tr(x))))) : null;
    $('#pInfo').replaceChildren(
      sec(UI.howToUse, t.steps, 'steps', true), sec(UI.input, t.input), sec(UI.output, t.output), sec(UI.limits, t.limits, 'limits'),
      h('section', { class: 'info wide' }, h('h3', {}, tr(UI.whatItDoes)), h('p', {}, tr(t.full)), t.features?.length ? h('ul', { class: 'feat' }, ...t.features.map((x) => h('li', {}, tr(x)))) : null,
        t.authors ? h('p', { class: 'credits' }, `${tr(UI.credits)}: ${t.authors}`) : null));
    $('#pDisc').textContent = tr(UI.disclaimer);
    const prevId = ORDER[i - 1], nextId = ORDER[i + 1];
    $('#pNav').replaceChildren(
      prevId ? h('a', { href: '#' + prevId, class: 'pn prev' }, h('span', {}, '←'), h('b', {}, tr(SHORT[prevId]))) : h('span'),
      nextId ? h('a', { href: '#' + nextId, class: 'pn next' }, h('span', {}, '→'), h('b', {}, tr(SHORT[nextId]))) : h('span'));
    const mount = $('#toolMount'); mount.replaceChildren();
    try { this.mounted = (t.server ? mountServerTool(mount, id) : MOUNT[id](mount)) || null; } catch (err) { mount.append(h('p', { class: 'warn-box' }, String(err && err.message || err))); }
    p.scrollTop = 0; p.focus({ preventScroll: true });
  },
};

// ── встроенные приложения BOPASI (Magauiya) и Блютол
function mountEmbed(root, key) {
  const frame = h('iframe', { class: 'embed-frame', title: key === 'bopasi' ? 'BOPASI · Magauiya CASA' : 'Bluetol · DFI', allow: 'clipboard-write; fullscreen' });
  frame.srcdoc = APPS[key];
  return embedShell(root, frame);
}
function mountMolmoda(root) {
  root.append(h('div', { class: 'launch' },
    h('p', {}, tr(L('MolModa работает в отдельной вкладке на официальном сайте разработчиков. Белок, лиганды и докинг считаются на вашем компьютере.',
      'MolModa әзірлеушілердің ресми сайтында бөлек қойындыда жұмыс істейді. Ақуыз, лигандтар және докинг компьютеріңізде есептеледі.',
      'MolModa runs in a separate tab on the developers’ official site. The protein, ligands and docking are computed on your computer.'))),
    h('a', { class: 'btn-big', href: MOLMODA_URL, target: '_blank', rel: 'noopener' }, tr(L('Открыть MolModa', 'MolModa-ны ашу', 'Open MolModa')))));
  return { destroy() {} };
}
function embedShell(root, frame) {
  const fsBtn = h('button', { class: 'btn-ghost sm', onclick: () => {
    const on = !wrapEl.classList.contains('fs'); wrapEl.classList.toggle('fs', on);
    fsBtn.textContent = tr(on ? UI.exitFullscreen : UI.fullscreen); document.body.classList.toggle('embed-fs', on);
  } }, tr(UI.fullscreen));
  const wrapEl = h('div', { class: 'embed' }, h('div', { class: 'embed-bar' }, h('span', {}, frame.title), fsBtn), frame);
  root.append(wrapEl);
  return { destroy() { document.body.classList.remove('embed-fs'); frame.srcdoc = ''; frame.src = 'about:blank'; } };
}

App.start();
