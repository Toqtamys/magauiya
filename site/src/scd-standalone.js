// ─── Отдельный файл BOPASI-SCD.html: только SCD-тест (индекс фрагментации ДНК) ──
(() => {
  const t = TOOLS_DATA.find((x) => x.id === 'scd');
  const qs = new URLSearchParams(location.search).get('lang');
  LANG = LANGS.includes(qs) ? qs : LANGS.includes(store.get('lang')) ? store.get('lang') : 'ru';
  let mounted = null;
  const sec = (title, items, ordered) => (items?.length ? h('section', { class: 'sa-info' }, h('h3', {}, tr(title)), h(ordered ? 'ol' : 'ul', {}, ...items.map((x) => h('li', {}, tr(x))))) : null);
  function render() {
    document.documentElement.lang = LANG;
    mounted?.destroy?.();
    const mount = h('div', { class: 'tool-root sa-tool' });
    document.getElementById('app').replaceChildren(
      h('header', { class: 'sa-head' },
        h('span', { class: 'sa-brand' }, 'BOPASI'),
        h('nav', { class: 'sa-lang' }, ...LANGS.map((l) => h('button', { type: 'button', class: l === LANG ? 'on' : '', onclick: () => { LANG = l; store.set('lang', l); render(); } }, LANG_LABEL[l])))),
      h('main', { class: 'sa-main' },
        h('p', { class: 'sa-kicker' }, 'SCD / Halo · DFI'),
        h('h1', {}, tr(t.name)),
        h('p', { class: 'sa-lead' }, tr(t.tagline)),
        h('p', { class: 'sa-note' }, tr(UI.localNote)),
        mount,
        h('div', { class: 'sa-grid' }, sec(UI.howToUse, t.steps, true), sec(UI.input, t.input), sec(UI.limits, t.limits)),
        h('footer', { class: 'sa-foot' },
          h('p', {}, `${tr(UI.credits)}: ${t.authors}`),
          h('p', {}, tr(UI.disclaimer)),
          h('p', {}, '© BOPASI · Әлихан Мағауия, Аян Ізбаев'))));
    document.title = `${tr(t.name)} · BOPASI`;
    mounted = mountScd(mount);
  }
  render();
})();
