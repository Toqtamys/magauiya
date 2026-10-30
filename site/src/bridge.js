// ─── Мост для сайта на Next.js: инструменты BOPASI монтируются в React-страницу ─
const BRIDGE_MOUNT = {
  bopasi: (r) => bridgeEmbed(r, 'bopasi'), bluetol: (r) => bridgeEmbed(r, 'bluetol'), scd: mountScd, who6: mountWho, chamber: mountChamber,
  'lab-counter': mountCounter, tmsc: mountTmsc, 'rc-phase': mountRcpc, morphometry: mountMorphometry, cleavage: mountCleavage,
  kinetics: mountKinetics, gardner: mountGardner, poseidon: mountPoseidon, 'due-date': mountDueDate, 'hcg-doubling': mountHcg,
  'fertile-window': mountFertile, constructor: mountConstructor, 'he-nuclei': (r) => mountHisto(r, 'he'), ki67: (r) => mountHisto(r, 'dab'),
  molmoda: bridgeMolmoda,
};
function bridgeEmbed(root, key) {
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
function bridgeMolmoda(root) {
  root.append(h('div', { class: 'launch' },
    h('p', {}, tr(L('MolModa работает в отдельной вкладке на официальном сайте разработчиков. Белок, лиганды и докинг считаются на вашем компьютере.',
      'MolModa әзірлеушілердің ресми сайтында бөлек қойындыда жұмыс істейді. Ақуыз, лигандтар және докинг компьютеріңізде есептеледі.',
      'MolModa runs in a separate tab on the developers’ official site. The protein, ligands and docking are computed on your computer.'))),
    h('a', { class: 'btn-big', href: 'https://molmoda.org/', target: '_blank', rel: 'noopener' }, tr(L('Открыть MolModa', 'MolModa-ны ашу', 'Open MolModa')))));
  return { destroy() {} };
}
// передать файлы, брошенные на главной, в поле загрузки инструмента (в том числе внутри iframe)
function bridgeFeed(el, files, tries = 40) {
  const frame = el.querySelector('iframe');
  const doc = frame ? frame.contentDocument : document;
  const input = frame ? doc && doc.querySelector('input[type=file]') : el.querySelector('input[type=file]');
  if (!input) { if (tries > 0) setTimeout(() => bridgeFeed(el, files, tries - 1), 150); return; }
  const dt = new DataTransfer();
  for (const f of (input.multiple ? files : files.slice(0, 1))) dt.items.add(f);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
window.BOPASI = {
  feed: (el, files) => bridgeFeed(el, [...files]),
  mount(id, el, lang) {
    LANG = lang || 'ru';
    el.replaceChildren();
    const f = BRIDGE_MOUNT[id];
    if (!f) throw new Error('unknown tool ' + id);
    return f(el) || null;
  },
};
window.dispatchEvent(new Event('bopasi-ready'));
