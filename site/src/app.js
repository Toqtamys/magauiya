// ─── Приложение: страница с прокруткой, анимация эмбриона, панели инструментов ─
const ORDER = CHAPTERS.flatMap((c) => c.tools);
const toolById = (id) => TOOLS_DATA.find((t) => t.id === id);
const chapterOf = (id) => CHAPTERS.find((c) => c.tools.includes(id));
const pad2 = (n) => String(n).padStart(2, '0');
const MOUNT = {
  bopasi: (r) => mountEmbed(r, 'bopasi'), bluetol: (r) => mountEmbed(r, 'bluetol'), scd: mountScd, who6: mountWho, chamber: mountChamber,
  'lab-counter': mountCounter, tmsc: mountTmsc, 'rc-phase': mountRcpc, morphometry: mountMorphometry, cleavage: mountCleavage,
  kinetics: mountKinetics, gardner: mountGardner, poseidon: mountPoseidon, 'due-date': mountDueDate, 'hcg-doubling': mountHcg,
  'fertile-window': mountFertile, constructor: mountConstructor,
};
const KIND = {
  bopasi: L('Видео', 'Бейне', 'Video'), scd: L('Снимки', 'Суреттер', 'Images'), bluetol: L('Снимки', 'Суреттер', 'Images'),
  'rc-phase': L('Снимки', 'Суреттер', 'Images'), morphometry: L('Снимки', 'Суреттер', 'Images'), 'lab-counter': L('Подсчёт', 'Санау', 'Counting'),
  constructor: L('3D · молекулы', '3D · молекулалар', '3D · molecules'),
};
const kindOf = (id) => KIND[id] || L('Калькулятор', 'Калькулятор', 'Calculator');
const WIDE = new Set(['bopasi', 'scd', 'constructor']);

const App = {
  panelTool: null, mounted: null, stageLocked: false,

  start() {
    const saved = store.get('lang'), qs = new URLSearchParams(location.search).get('lang');
    LANG = LANGS.includes(qs) ? qs : LANGS.includes(saved) ? saved : 'ru';
    Embryo.init($('#bg'), (s) => this.showStage(s));
    this.render();
    this.bind();
    addEventListener('hashchange', () => this.route());
    this.route(true);
    requestAnimationFrame(() => document.body.classList.add('ready'));
  },

  // ── вся страница строится из данных: смена языка — просто перерисовка
  render() {
    document.documentElement.lang = LANG;
    document.title = 'BOPASI — ' + tr(UI.tagline);
    $('#langs').replaceChildren(...LANGS.map((l) => h('button', { class: l === LANG ? 'on' : '', 'aria-pressed': l === LANG, onclick: () => this.setLang(l) }, LANG_LABEL[l])));
    $('#navLinks').replaceChildren(...CHAPTERS.map((c) => h('a', { href: '#' + c.id, 'data-c': c.id }, tr(c.name))), h('a', { href: '#about', 'data-c': 'about' }, tr(UI.about)));
    const words = tr(UI.introTitle).split(' ');
    const hero = h('section', { class: 'hero', id: 'top', 'data-stage': 'oocyte' },
      h('p', { class: 'eyebrow' }, h('i'), tr(UI.tagline)),
      h('h1', { class: 'split' }, ...words.flatMap((w, i) => [i ? ' ' : '', h('span', { class: 'w', style: `--i:${i}` }, h('span', {}, w))]).filter(Boolean)),
      h('p', { class: 'lead' }, tr(UI.introLead)),
      h('div', { class: 'hero-cta' },
        h('a', { class: 'btn-big', href: '#andrology' }, tr(UI.explore), h('span', { 'aria-hidden': 'true' }, ' ↓')),
        h('a', { class: 'btn-line', href: '#bopasi' }, tr(UI.open) + ': BOPASI')),
      h('dl', { class: 'stats' },
        ...[[ORDER.length, UI.statTools], [3, UI.statLangs], [0, UI.statUploads]].map(([n, lab]) => h('div', {}, h('dt', { 'data-count': n }, String(n)), h('dd', {}, tr(lab))))));
    let k = 0;
    const chapters = CHAPTERS.map((c, ci) => h('section', { class: 'chapter', id: c.id, 'data-chapter': c.id },
      h('header', { class: 'ch-head reveal' },
        h('span', { class: 'ch-num' }, `${tr(UI.chapter)} ${pad2(ci + 1)}`),
        h('h2', {}, tr(c.name)),
        h('p', {}, tr(c.lead))),
      h('div', { class: 'cards' }, ...c.tools.map((id) => this.card(id, ++k)))));
    const about = h('section', { class: 'about reveal', id: 'about', 'data-stage': 'hatch' },
      h('h2', {}, tr(UI.about)),
      h('p', { class: 'lead' }, tr(UI.aboutText)),
      h('p', { class: 'disc' }, tr(UI.disclaimer)),
      h('p', { class: 'contact' }, `${tr(UI.contact)}: Alikhan Magauiya · `, h('span', { class: 'sel' }, 'orda.ezhenid@gmail.com')));
    const y = scrollY;
    $('#page').replaceChildren(hero, ...chapters, about);
    scrollTo(0, y);
    this.prepareReveal();
    this.countUp();
    this.onScroll();
  },
  card(id, n) {
    const t = toolById(id);
    const el = h('a', { class: 'card reveal' + (WIDE.has(id) ? ' wide' : '') + (id === 'bopasi' ? ' feature' : ''), href: '#' + id, 'data-id': id },
      h('div', { class: 'card-top' }, h('span', { class: 'num' }, pad2(n)), h('span', { class: 'kind' }, tr(kindOf(id))), h('img', { class: 'glyph', src: glyphSVG(GLYPH[id], 30), alt: '' })),
      h('h3', {}, tr(SHORT[id])),
      h('p', {}, tr(t.tagline)),
      h('span', { class: 'go' }, tr(UI.open), h('span', { 'aria-hidden': 'true' }, ' →')),
      h('i', { class: 'glare', 'aria-hidden': 'true' }));
    el.addEventListener('pointermove', (e) => {
      if (REDUCED || e.pointerType !== 'mouse') return;
      const b = el.getBoundingClientRect(), px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
      el.style.setProperty('--rx', `${(0.5 - py) * 7}deg`); el.style.setProperty('--ry', `${(px - 0.5) * 9}deg`);
      el.style.setProperty('--gx', `${px * 100}%`); el.style.setProperty('--gy', `${py * 100}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    el.addEventListener('click', (e) => { this.origin = { x: e.clientX, y: e.clientY }; });
    return el;
  },

  // ── появление при прокрутке: элементы ниже экрана получают .pre и проявляются
  prepareReveal() {
    if (!('IntersectionObserver' in window) || REDUCED) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((el, i) => {
      if (el.getBoundingClientRect().top > innerHeight * 0.92) { el.classList.add('pre'); el.style.setProperty('--d', `${(i % 3) * 70}ms`); io.observe(el); }
    });
  },
  countUp() {
    document.querySelectorAll('[data-count]').forEach((el) => {
      const to = +el.dataset.count; if (REDUCED || !to) return;
      const t0 = performance.now();
      const tick = (now) => { const k = Math.min(1, (now - t0) / 1200); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  },

  setLang(l) { LANG = l; store.set('lang', l); this.render(); if (this.panelTool) this.openTool(this.panelTool, true); },

  bind() {
    addEventListener('scroll', () => this.onScroll(), { passive: true });
    addEventListener('resize', () => this.onScroll());
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.panelTool) { e.preventDefault(); this.close(); } });
    $('#pBack').addEventListener('click', () => this.close());
    $('#logo').addEventListener('click', (e) => { e.preventDefault(); this.close(); scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); });
  },

  // ── прокрутка → стадия эмбриона, активная глава, полоса прогресса
  onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#progress').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    document.body.classList.toggle('scrolled', scrollY > 30);
    if (this.panelTool) return;
    const mid = innerHeight * 0.55;
    let active = null, prog = 0;
    for (const c of CHAPTERS) {
      const el = document.getElementById(c.id); if (!el) continue;
      const b = el.getBoundingClientRect();
      if (b.top <= mid && b.bottom > mid) { active = c.id; prog = Math.min(1, Math.max(0, (mid - b.top) / Math.max(1, b.height))); }
    }
    const aboutEl = document.getElementById('about');
    const inAbout = aboutEl && aboutEl.getBoundingClientRect().top < mid;
    let stage = 'oocyte';
    if (inAbout) stage = 'hatch';
    else if (active === 'andrology') stage = prog < 0.62 ? 'fert' : 'zygote';
    else if (active === 'embryology') stage = prog < 0.34 ? 'c2' : prog < 0.67 ? 'c4' : 'c8';
    else if (active === 'reproduction') stage = prog < 0.45 ? 'morula' : 'blast';
    else if (active === 'drug') stage = 'hatch';
    Embryo.setStage(stage);
    document.querySelectorAll('#navLinks a').forEach((a) => a.classList.toggle('on', a.dataset.c === (inAbout ? 'about' : active)));
  },
  showStage(s) {
    const tag = $('#stageTag'); if (!tag) return;
    const lab = s === 'oocyte' ? L('Ооцит · метафаза II', 'Ооцит · II метафаза', 'Oocyte · metaphase II') : STAGE_LABEL[s];
    tag.classList.remove('show'); void tag.offsetWidth;
    tag.replaceChildren(h('i'), tr(lab)); tag.classList.add('show');
    const g = Embryo.geom; tag.style.left = `${g.x}px`; tag.style.top = `${g.y + g.R + 22}px`;
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
    Embryo.pause(false);
    setTimeout(() => { if (!this.panelTool) $('#toolMount').replaceChildren(); }, 700);
    if (id) { const card = document.querySelector(`.card[data-id="${id}"]`); if (card) card.focus({ preventScroll: true }); }
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
    setTimeout(() => { if (this.panelTool) Embryo.pause(true); }, 800);
    $('#pBack').replaceChildren(h('span', { 'aria-hidden': 'true' }, '← '), tr(UI.back));
    $('#pEyebrow').replaceChildren(h('span', { class: 'num' }, pad2(i + 1)), h('span', {}, tr(ch.name)), h('span', { class: 'dot' }), h('span', {}, tr(kindOf(id))));
    $('#pTitle').textContent = tr(t.name);
    $('#pLead').textContent = tr(t.tagline);
    $('#pNote').textContent = tr(UI.localNote);
    const sec = (title, items, cls, ordered) => items?.length ? h('section', { class: 'info ' + (cls || '') }, h('h3', {}, tr(title)), h(ordered ? 'ol' : 'ul', {}, ...items.map((x) => h('li', {}, tr(x))))) : null;
    $('#pInfo').replaceChildren(
      sec(UI.howToUse, t.steps, 'steps', true), sec(UI.input, t.input), sec(UI.output, t.output), sec(UI.limits, t.limits, 'limits'),
      h('section', { class: 'info wide' }, h('h3', {}, tr(UI.whatItDoes)), h('p', {}, tr(t.full)), t.features?.length ? h('ul', { class: 'feat' }, ...t.features.map((x) => h('li', {}, tr(x)))) : null,
        t.authors ? h('p', { class: 'credits' }, `${tr(UI.credits)}: ${t.authors}`) : null));
    $('#pDisc').textContent = tr(UI.disclaimer);
    const prevId = ORDER[i - 1], nextId = ORDER[i + 1];
    $('#pNav').replaceChildren(
      prevId ? h('a', { href: '#' + prevId, class: 'pn prev' }, h('span', {}, '← ' + pad2(i)), h('b', {}, tr(SHORT[prevId]))) : h('span'),
      nextId ? h('a', { href: '#' + nextId, class: 'pn next' }, h('span', {}, pad2(i + 2) + ' →'), h('b', {}, tr(SHORT[nextId]))) : h('span'));
    const mount = $('#toolMount'); mount.replaceChildren();
    try { this.mounted = MOUNT[id](mount) || null; } catch (err) { mount.append(h('p', { class: 'warn-box' }, String(err && err.message || err))); }
    p.scrollTop = 0; p.focus({ preventScroll: true });
  },
};

// ── встроенные приложения BOPASI (Magauiya) и Блютол
function mountEmbed(root, key) {
  const frame = h('iframe', { class: 'embed-frame', title: key === 'bopasi' ? 'BOPASI · Magauiya CASA' : 'Bluetol · DFI', allow: 'clipboard-write; fullscreen' });
  frame.srcdoc = APPS[key];
  const fsBtn = h('button', { class: 'btn-ghost sm', onclick: () => {
    const on = !wrapEl.classList.contains('fs'); wrapEl.classList.toggle('fs', on);
    fsBtn.textContent = tr(on ? UI.exitFullscreen : UI.fullscreen); document.body.classList.toggle('embed-fs', on);
  } }, tr(UI.fullscreen));
  const wrapEl = h('div', { class: 'embed' }, h('div', { class: 'embed-bar' }, h('span', {}, frame.title), fsBtn), frame);
  root.append(wrapEl);
  return { destroy() { document.body.classList.remove('embed-fs'); frame.srcdoc = ''; } };
}

App.start();
