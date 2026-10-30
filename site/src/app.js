// ─── Приложение: страница, путешествие сквозь клетку, панели инструментов ───
const VCH = CHAPTERS;   // все разделы, включая открытые проекты (библиотеки встроены в файл)
const ORDER = VCH.flatMap((c) => c.tools);
const toolById = (id) => TOOLS_DATA.find((t) => t.id === id);
const chapterOf = (id) => VCH.find((c) => c.tools.includes(id));
const isServer = (id) => !!toolById(id)?.server;
const MOLMODA_URL = 'https://molmoda.org/';
const MOUNT = {
  bopasi: (r) => mountEmbed(r, 'bopasi'), bluetol: (r) => mountEmbed(r, 'bluetol'), scd: mountScd, who6: mountWho, chamber: mountChamber,
  'lab-counter': mountCounter, tmsc: mountTmsc, 'rc-phase': mountRcpc, morphometry: mountMorphometry, cleavage: mountCleavage,
  kinetics: mountKinetics, gardner: mountGardner, poseidon: mountPoseidon, 'due-date': mountDueDate, 'hcg-doubling': mountHcg,
  'fertile-window': mountFertile, constructor: mountConstructor, 'he-nuclei': (r) => mountHisto(r, 'he'), ki67: (r) => mountHisto(r, 'dab'),
  molmoda: mountMolmoda, niivue: mountNiivue, molstar: mountMolstar, seqviz: mountSeqviz,
};
const kindOf = (id) => (isServer(id) ? SERVER_KIND : KIND[id] || L('расчёт', 'есептеу', 'calculator'));
const SERVER_SCENE = { constructor: 8, molmoda: 8, bela: 3, embryovision: 2, emlife: 3, 'scd-dl': 1, pycasa: 0, hovernet: 4, 'protein-design': 8, pocketdock: 8 };

const App = {
  panelTool: null, mounted: null, anchors: [],

  start() {
    const saved = store.get('lang'), qs = new URLSearchParams(location.search).get('lang');
    LANG = LANGS.includes(qs) ? qs : LANGS.includes(saved) ? saved : 'ru';
    this.canvas = h('canvas', { id: 'stage', role: 'img', 'aria-label': 'BOPASI' });
    const skyCv = h('canvas', { id: 'sky', 'aria-hidden': 'true' }); document.body.prepend(skyCv);
    try { this.sky = createSky(skyCv, { groups: VCH.map((c) => c.tools.length), labels: ORDER.map((id) => tr(SHORT[id])), reduced: REDUCED }); } catch {}
    this.hud = h('div', { class: 'sky-hud', 'aria-hidden': 'true' }); document.body.append(this.hud);
    this.render();
    Stage.init(this.canvas);
    Stage.setAuto(true);
    this.bind();
    addEventListener('hashchange', () => this.route());
    this.route(true);
    requestAnimationFrame(() => document.body.classList.add('ready'));
  },

  // ── вся страница строится из данных: смена языка — перерисовка
  render() {
    document.documentElement.lang = LANG;
    document.title = 'BOPASI ' + tr(UI.title);
    $('#langs').replaceChildren(...LANGS.map((l) => h('button', { class: l === LANG ? 'on' : '', 'aria-pressed': l === LANG, onclick: () => this.setLang(l) }, LANG_LABEL[l])));
    $('#logo').textContent = 'BOPASI';
    $('#navLinks').replaceChildren(...VCH.map((c) => h('a', { href: '#' + c.id }, tr(c.name))), h('a', { href: '#about' }, tr(UI.nav.about)));
    const y = scrollY;
    this.planet?.destroy(); this.scenes?.forEach((x) => x.stop()); this.scenes = [];
    $('#page').replaceChildren(this.hero(), ...VCH.map((c, i) => this.section(c, i)), this.about(), this.footer());
    this.liven();
    scrollTo(0, y);
    this.paintPreviews();
    this.prepareReveal();
    Stage.redraw();
    this.sky?.setLabels(ORDER.map((id) => tr(SHORT[id])));
    if (this.hud) { const n = TOOLS_DATA.filter((t) => !t.server).length; this.hud.replaceChildren(h('i', { class: 'dot' }), h('b', {}, String(n)), h('span', {}, ` ${tr(this.word(n))} · ${tr(UI.stickerTop)}`)); }
  },

  hero() {
    const n = TOOLS_DATA.filter((t) => !t.server).length;
    this.planetCv = h('canvas', { class: 'planet', 'aria-hidden': 'true' });
    return h('header', { class: 'hero', id: 'top' }, this.planetCv,
      h('div', { class: 'hero-text' },
        h('p', { class: 'kicker' }, `BOPASI · ${n} ${tr(this.word(n))} · ${tr(UI.stickerTop)}`),
        h('h1', {}, tr(UI.title)),
        h('p', { class: 'lead' }, tr(UI.lead)),
        h('div', { class: 'hero-cta' },
          h('a', { class: 'btn-x', href: '#bopasi', onclick: (e) => this.from(e) }, tr(UI.cta)),
          h('a', { class: 'btn-x dim', href: '#andrology' }, tr(UI.allTools)))),
      h('a', { class: 'cue', href: '#andrology', 'aria-label': tr(UI.scroll) }, '⌄'));
  },
  word(n) { return n % 10 === 1 && n % 100 !== 11 ? UI.tools1 : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? UI.tools2 : UI.tools; },
  // живые фоны: планета на первом экране и сцены разделов, только пока видны
  liven() {
    try { this.planet = createPlanet(this.planetCv, { reduced: REDUCED }); } catch {}
    const SC = { andrology: 0, embryology: 2, reproduction: 3, histology: 4, oncology: 5, science: 7 };
    document.querySelectorAll('canvas.scene').forEach((c) => {
      const k = SC[c.dataset.id] ?? 0, t0 = performance.now();
      let on = false, raf = 0, last = 0;
      const paint = (t) => { const sm = c.clientWidth < 700; Stage.paint(c, k, t, { cx: sm ? 0.5 : 0.7, cy: 0.45, u: sm ? 0.62 : 0.8, dpr: 1 }); };
      const loop = (now) => { if (!on) return; if (!App.panelTool && now - last > 40) { paint(3 + (now - t0) / 1000); last = now; } raf = requestAnimationFrame(loop); };
      requestAnimationFrame(() => paint(3));
      const io = new IntersectionObserver(([e]) => { on = e.isIntersecting && !REDUCED && !this.panelTool; cancelAnimationFrame(raf); if (on) raf = requestAnimationFrame(loop); });
      io.observe(c);
      this.scenes.push({ stop() { on = false; cancelAnimationFrame(raf); io.disconnect(); } });
    });
  },
  section(c, i) {
    const n = c.tools.length;
    return h('section', { class: 'tools-sec', id: c.id },
      h('div', { class: 'mission' }, h('canvas', { class: 'scene', 'data-id': c.id, 'aria-hidden': 'true' }), h('i', { class: 'shade' }),
        h('div', { class: 'mission-text reveal' },
          h('p', { class: 'kicker' }, `${tr(UI.section)} ${String(i + 1).padStart(2, '0')} · ${n} ${tr(n === 1 ? UI.tools1 : n < 5 ? UI.tools2 : UI.tools)}`),
          h('h2', {}, tr(c.name)),
          h('p', { class: 'lead' }, tr(c.lead)),
          h('a', { class: 'btn-x', href: '#' + c.id + '-tools', onclick: (e) => { e.preventDefault(); $('#' + c.id + '-tools').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); } }, tr(UI.explore)))),
      h('div', { class: 'cards', id: c.id + '-tools' }, ...c.tools.map((id, i) => this.card(id, i))));
  },
  card(id, i) {
    const t = toolById(id), srv = isServer(id);
    const own = Object.prototype.hasOwnProperty.call(PREVIEWS, id);
    const pic = own
      ? h('img', { src: PREVIEWS[id], alt: '', loading: 'lazy', width: 640, height: 400 })
      : h('canvas', { class: 'snap', 'data-scene': String(SERVER_SCENE[id] ?? 0), 'aria-hidden': 'true' });
    return h('a', { class: 'card reveal' + (i === 0 ? ' wide' : '') + (srv ? ' srv' : ''), href: '#' + id, style: `--d:${(i % 3) * 70}ms`, onclick: (e) => this.from(e),
      onmouseenter: () => this.sky?.focus(ORDER.indexOf(id)), onmouseleave: () => this.sky?.focus(-1) },
      h('div', { class: 'pic' }, pic),
      h('div', { class: 'card-body' },
        h('p', { class: 'tag' + (srv ? ' srv' : '') }, srv ? tr(UI.tagServer) : tr(UI.tagBrowser) + ' · ' + tr(kindOf(id))),
        h('h3', {}, tr(SHORT[id])),
        h('p', { class: 'desc' }, tr(t.tagline)),
        h('span', { class: 'go' }, tr(UI.open), h('span', { 'aria-hidden': 'true' }, ' →'))));
  },
  paintPreviews() {
    requestAnimationFrame(() => document.querySelectorAll('canvas.snap').forEach((c) => { try { Stage.snapshot(c, +c.dataset.scene, 4); } catch {} }));
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
      h('div', { class: 'srv-text' }, h('h2', { class: 'reveal' }, tr(UI.serverH)), h('p', { class: 'reveal' }, tr(UI.serverText))),
      h('div', { class: 'srv-frag reveal' }, serverBox(paint), list));
  },
  about() {
    return h('section', { class: 'about', id: 'about' },
      h('h2', { class: 'reveal' }, tr(UI.aboutH)),
      h('div', { class: 'about-body' },
        ...UI.about.map((p) => h('p', { class: 'reveal' }, tr(p))),
        h('p', { class: 'who reveal' }, tr(UI.authors)),
        h('p', { class: 'sign reveal' }, tr(UI.sign)),
        h('p', { class: 'role reveal' }, `${tr(UI.role)} · `, h('a', { href: 'mailto:orda.ezhenid@gmail.com' }, 'orda.ezhenid@gmail.com'))));
  },
  footer() {
    return h('footer', { class: 'foot' },
      h('span', {}, 'BOPASI © 2026'), h('span', {}, tr(UI.sign)),
      h('span', { class: 'foot-r' }, tr(UI.footDisc).replace(/^2026 · /, '')));
  },

  // ── появление при прокрутке; только для того, что ниже первого экрана
  prepareReveal() {
    if (!('IntersectionObserver' in window) || REDUCED) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.reveal').forEach((el) => { if (el.getBoundingClientRect().top > innerHeight * 0.95) { el.classList.add('pre'); io.observe(el); } });
  },

  setLang(l) { LANG = l; store.set('lang', l); this.render(); if (this.panelTool) this.openTool(this.panelTool, true); },
  from(e) { this.origin = { x: e.clientX, y: e.clientY }; },

  bind() {
    let y0 = scrollY;
    addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight; $('#progress').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      const y = scrollY, bar = $('.bar'); bar.classList.toggle('solid', y > 40); bar.classList.toggle('away', y > 120 && y > y0); y0 = y;   // шапка прячется вниз и возвращается вверх
    }, { passive: true });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.panelTool) { e.preventDefault(); this.close(); } });
    $('#pBack').addEventListener('click', () => this.close());
    $('#logo').addEventListener('click', (e) => { e.preventDefault(); this.close(); scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); });
  },
  onScroll() {},

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
    Stage.pause(false); this.planet?.pause(false);
    setTimeout(() => { if (!this.panelTool) $('#toolMount').replaceChildren(); }, 700);
    if (id) { const a = document.querySelector(`.card[href="#${CSS.escape(id)}"]`); if (a) a.focus({ preventScroll: true }); }
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
    setTimeout(() => { if (this.panelTool) { Stage.pause(true); this.planet?.pause(true); } }, 800);
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
