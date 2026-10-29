// ─── Приложение: оверлей, таймлайн, панели, маршрутизация ──────────────────
const ORDER = CHAPTERS.flatMap((c) => c.tools);
const toolById = (id) => TOOLS_DATA.find((t) => t.id === id);
const chapterOf = (id) => CHAPTERS.find((c) => c.tools.includes(id));
const pad2 = (n) => String(n).padStart(2, '0');
const MOUNT = { bopasi: (r) => mountEmbed(r, 'bopasi'), bluetol: (r) => mountEmbed(r, 'bluetol'), 'rc-phase': mountRcpc, gardner: mountGardner, 'due-date': mountDueDate, 'hcg-doubling': mountHcg, tmsc: mountTmsc, 'fertile-window': mountFertile, constructor: mountConstructor };

const App = {
  active: -1, panelTool: null, mounted: null, webgl: false,

  async start() {
    const saved = store.get('lang'), qs = new URLSearchParams(location.search).get('lang');
    LANG = LANGS.includes(qs) ? qs : LANGS.includes(saved) ? saved : 'ru';   // русский по умолчанию
    this.renderStatic();
    this.webgl = await Scene.init($('#scene'), {
      count: ORDER.length,
      cardInfo: (i) => { const t = toolById(ORDER[i]); return { num: pad2(i + 1), chapter: tr(chapterOf(t.id).name), name: tr(SHORT[t.id]), tagline: tr(t.tagline), badge: tr(UI.inBrowser), glyph: GLYPH[t.id] }; },
      onActive: (i) => this.setActive(i),
      onOpen: (i) => this.openTool(ORDER[i]),
      onSeek: (i) => Scene.setTarget(i),
    }).catch(() => false);
    if (!this.webgl) { document.body.classList.add('no-webgl'); $('#nowebgl').textContent = tr(UI.noWebgl); this.openOverlay('all', true); }
    this.bindInput();
    addEventListener('hashchange', () => this.route());
    this.route();
    requestAnimationFrame(() => document.body.classList.add('ready'));
  },

  // ── тексты, не зависящие от активной карточки
  renderStatic() {
    document.documentElement.lang = LANG;
    document.title = 'BOPASI — ' + tr(UI.tagline);
    $('#tagline').textContent = tr(UI.tagline);
    $('#introTitle').textContent = tr(UI.introTitle);
    $('#introLead').textContent = tr(UI.introLead);
    $('#scrollHint').textContent = tr(UI.scroll);
    $('#startBtn').textContent = tr(UI.start);
    $('#btnAll .lbl').textContent = tr(UI.all); $('#btnAll').setAttribute('aria-label', tr(UI.all));
    $('#btnAbout').textContent = tr(UI.about);
    $('#langs').replaceChildren(...LANGS.map((l) => h('button', { class: l === LANG ? 'on' : '', 'aria-pressed': l === LANG, onclick: () => this.setLang(l) }, LANG_LABEL[l])));
    $('#sound').setAttribute('aria-label', tr(Sound.on ? UI.soundOff : UI.soundOn));
    $('#sound').title = tr(Sound.on ? UI.soundOff : UI.soundOn);
    this.renderTimeline(); this.renderIndex(); this.renderAbout();
    if (this.active >= 0) this.setActive(this.active, true);
  },

  setLang(l) {
    LANG = l; store.set('lang', l);
    this.renderStatic(); Scene.redraw?.();
    if (this.panelTool) this.openTool(this.panelTool, true);
  },

  renderTimeline() {
    const tl = $('#timeline'); tl.replaceChildren();
    let i = 0;
    for (const c of CHAPTERS) {
      const ticks = c.tools.map((id) => { const k = i++; return h('button', { class: 'tick', 'data-i': k, 'aria-label': `${pad2(k + 1)} ${tr(SHORT[id])}`, title: tr(SHORT[id]), onclick: () => this.goto(k) }); });
      tl.append(h('div', { class: 'chap', 'data-c': c.id }, h('button', { class: 'chap-name', onclick: () => this.goto(ORDER.indexOf(c.tools[0])) }, tr(c.name)), h('div', { class: 'ticks' }, ...ticks)));
    }
  },

  setActive(i, force) {
    if (i === this.active && !force) return;
    const prev = this.active; this.active = i;
    document.body.classList.toggle('intro', i < 0);
    document.querySelectorAll('#timeline .tick').forEach((t) => t.classList.toggle('on', +t.dataset.i === i));
    document.querySelectorAll('#timeline .chap').forEach((c) => c.classList.toggle('on', i >= 0 && chapterOf(ORDER[i]).id === c.dataset.c));
    if (i < 0) return;
    const t = toolById(ORDER[i]), card = $('#card');
    card.classList.remove('show'); void card.offsetWidth;
    $('#cardEyebrow').replaceChildren(h('span', { class: 'num' }, `${pad2(i + 1)} / ${pad2(ORDER.length)}`), h('span', {}, tr(chapterOf(t.id).name)));
    $('#cardTitle').textContent = tr(SHORT[t.id]);
    $('#cardText').textContent = tr(t.tagline);
    $('#cardOpen').replaceChildren(tr(UI.open), h('span', { 'aria-hidden': 'true' }, ' →'));
    $('#cardOpen').onclick = () => this.openTool(t.id);
    $('#cardBadge').textContent = tr(UI.inBrowser);
    card.classList.add('show');
    if (prev !== i && !force) Sound.blip();
  },

  goto(i) { if (this.webgl) Scene.setTarget(i); else this.openTool(ORDER[i]); },

  bindInput() {
    // жест колеса: накапливаем смещение; меньше 0.1 карточки — остаёмся на месте
    let snapTimer = 0, gestureStart = null;
    const snapLater = () => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => { const moved = Scene.progress - gestureStart; gestureStart = null; Scene.snap(Math.abs(moved) < 0.1 ? 0 : Math.sign(moved)); }, 140);
    };
    addEventListener('wheel', (e) => {
      if (!this.webgl || this.isOverlayOpen()) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1;   // строки/страницы → пиксели (Windows)
      const d = Math.max(-1.2, Math.min(1.2, (e.deltaY * unit) / 520));
      if (!d) return;
      if (gestureStart == null) gestureStart = Scene.progress;
      Scene.nudge(d);
      snapLater();
    }, { passive: false });
    let ty = null, tStart = 0;
    addEventListener('touchstart', (e) => { if (this.isOverlayOpen() || e.target.closest('#ui button, #ui a')) return; ty = e.touches[0].clientY; tStart = Scene.progress; }, { passive: true });
    addEventListener('touchmove', (e) => { if (ty == null || !this.webgl) return; Scene.setTarget(tStart + (ty - e.touches[0].clientY) / 260); }, { passive: true });
    addEventListener('touchend', () => { if (ty == null) return; ty = null; const moved = Scene.progress - tStart; Scene.snap(Math.abs(moved) < 0.06 ? 0 : Math.sign(moved)); });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { if (this.isOverlayOpen()) { e.preventDefault(); this.close(); } return; }
      if (this.isOverlayOpen() || /input|textarea|select/i.test(e.target.tagName)) return;
      if (['ArrowDown', 'PageDown', 'ArrowRight', ' '].includes(e.key)) { e.preventDefault(); Scene.setTarget(Math.floor(Scene.progress) + 1); }
      if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); Scene.setTarget(Math.ceil(Scene.progress) - 1); }
      if (e.key === 'Home') Scene.setTarget(-1.6);
      if (e.key === 'End') Scene.setTarget(ORDER.length - 1);
      if (e.key === 'Enter' && this.active >= 0 && e.target === document.body) this.openTool(ORDER[this.active]);
    });
    $('#startBtn').onclick = () => Scene.setTarget(0);
    $('#btnAll').onclick = () => { location.hash = 'all'; };
    $('#btnAbout').onclick = () => { location.hash = 'about'; };
    $('#logo').onclick = (e) => { e.preventDefault(); this.close(); Scene.setTarget(-1.6); };
    $('#sound').onclick = () => {
      if (Sound.on) Sound.stop(); else Sound.start();
      $('#sound').classList.toggle('on', Sound.on); $('#sound').setAttribute('aria-pressed', Sound.on); this.renderStatic();
    };
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.close()));
  },

  // ── маршруты: #<id инструмента>, #all, #about
  route() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (toolById(id)) return this.openTool(id, true);
    if (id === 'all' || id === 'about') return this.openOverlay(id);
    this.hidePanels();
    if (!this.webgl) this.openOverlay('all', true);   // без 3D домашняя страница — список инструментов
  },
  isOverlayOpen() { return document.body.classList.contains('panel-open') || document.body.classList.contains('overlay-open'); },
  close() {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    this.hidePanels();
    if (!this.webgl) this.openOverlay('all', true);
  },
  hidePanels() {
    document.body.classList.remove('panel-open', 'overlay-open');
    $('#panel').setAttribute('aria-hidden', 'true'); $('#overlay-all').hidden = true; $('#overlay-about').hidden = true;
    if (this.mounted) { try { this.mounted.destroy(); } catch {} this.mounted = null; }
    $('#toolMount').replaceChildren();
    this.panelTool = null;
    Scene.pause?.(false);
  },
  openOverlay(which, silent) {
    if (this.mounted) { try { this.mounted.destroy(); } catch {} this.mounted = null; $('#toolMount').replaceChildren(); }
    this.panelTool = null;
    document.body.classList.remove('panel-open'); document.body.classList.add('overlay-open');
    $('#overlay-all').hidden = which !== 'all'; $('#overlay-about').hidden = which !== 'about';
    Scene.pause?.(true);
    if (!silent && location.hash !== '#' + which) location.hash = which;
    $(`#overlay-${which} .ov-inner`)?.focus({ preventScroll: true });
  },

  renderIndex() {
    const list = $('#indexList'); list.replaceChildren();
    $('#indexTitle').textContent = tr(UI.all);
    $('#indexCount').textContent = `${ORDER.length} ${tr(UI.tools)} · ${tr(UI.inBrowser).toLowerCase()}`;
    let i = 0;
    for (const c of CHAPTERS) {
      list.append(h('div', { class: 'ix-chap' }, h('h3', {}, tr(c.name)),
        h('div', { class: 'ix-tools' }, ...c.tools.map((id) => {
          const k = i++, t = toolById(id);
          return h('a', { class: 'ix-tool', href: '#' + id },
            h('span', { class: 'ix-num' }, pad2(k + 1)),
            h('img', { class: 'ix-glyph', src: glyphSVG(GLYPH[id], 28), alt: '' }),
            h('span', { class: 'ix-body' }, h('b', {}, tr(SHORT[id])), h('span', {}, tr(t.tagline))));
        }))));
    }
  },
  renderAbout() {
    $('#aboutTitle').textContent = tr(UI.about);
    $('#aboutBody').replaceChildren(
      h('p', { class: 'lead' }, tr(UI.aboutText)),
      h('div', { class: 'about-grid' },
        ...CHAPTERS.map((c) => h('div', {}, h('h4', {}, tr(c.name)), h('ul', {}, ...c.tools.map((id) => h('li', {}, h('a', { href: '#' + id }, tr(SHORT[id])))))))),
      h('p', { class: 'disc' }, tr(UI.disclaimer)),
      h('p', { class: 'contact' }, h('span', {}, tr(UI.contact) + ': Alikhan Magauiya · '), h('span', { class: 'sel' }, 'orda.ezhenid@gmail.com')));
  },

  // ── панель инструмента
  openTool(id, fromRoute) {
    const t = toolById(id); if (!t) return;
    if (!fromRoute && location.hash !== '#' + id) { location.hash = id; return; }
    if (this.mounted) { try { this.mounted.destroy(); } catch {} this.mounted = null; }
    this.panelTool = id;
    const i = ORDER.indexOf(id), ch = chapterOf(id);
    if (this.webgl && Math.round(Scene.progress) !== i) Scene.setTarget(i);
    document.body.classList.remove('overlay-open'); $('#overlay-all').hidden = true; $('#overlay-about').hidden = true;
    document.body.classList.add('panel-open'); $('#panel').setAttribute('aria-hidden', 'false');
    Scene.pause?.(true);
    $('#pBack').replaceChildren(h('span', { 'aria-hidden': 'true' }, '← '), tr(UI.back));
    $('#pEyebrow').replaceChildren(h('span', { class: 'num' }, pad2(i + 1)), h('span', {}, tr(ch.name)), h('span', { class: 'dot' }), h('span', {}, tr(UI.inBrowser)));
    $('#pTitle').textContent = t.name;
    $('#pLead').textContent = tr(t.tagline);
    $('#pNote').textContent = tr(UI.localNote);
    const sec = (title, items, cls, ordered) => items?.length ? h('section', { class: 'info ' + (cls || '') }, h('h3', {}, tr(title)), h(ordered ? 'ol' : 'ul', {}, ...items.map((x) => h('li', {}, tr(x))))) : null;
    $('#pInfo').replaceChildren(
      sec(UI.howToUse, t.steps, 'steps', true),
      sec(UI.input, t.input),
      sec(UI.output, t.output),
      sec(UI.limits, t.limits, 'limits'),
      h('section', { class: 'info wide' }, h('h3', {}, tr(UI.whatItDoes)), h('p', {}, tr(t.full)), t.features?.length ? h('ul', { class: 'feat' }, ...t.features.map((x) => h('li', {}, tr(x)))) : null,
        t.authors ? h('p', { class: 'credits' }, `${tr(UI.credits)}: ${t.authors}`) : null));
    $('#pDisc').textContent = tr(UI.disclaimer);
    const prevId = ORDER[i - 1], nextId = ORDER[i + 1];
    $('#pNav').replaceChildren(
      prevId ? h('a', { href: '#' + prevId, class: 'pn prev' }, h('span', {}, '← ' + pad2(i)), h('b', {}, tr(SHORT[prevId]))) : h('span'),
      nextId ? h('a', { href: '#' + nextId, class: 'pn next' }, h('span', {}, pad2(i + 2) + ' →'), h('b', {}, tr(SHORT[nextId]))) : h('span'));
    const mount = $('#toolMount'); mount.replaceChildren();
    this.mounted = MOUNT[id](mount) || null;
    const panel = $('#panel'); panel.scrollTop = 0; panel.focus({ preventScroll: true });
  },
};

// ── встроенные приложения BOPASI (Magauiya) и Блютол: целиком внутри страницы
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
