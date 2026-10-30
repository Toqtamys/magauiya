// Сборка BOPASI в один HTML-файл: node build.mjs
// → ../bopasi/index.html (сайт) + ../bopasi/vendor, ../bopasi/rdkit (локальные копии библиотек)
// → ../BOPASI.html (тот же файл для скачивания; без локальных копий берёт библиотеки с CDN)
import { readFile, writeFile, rm, mkdir, cp } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const src = (f) => readFile(path.join(here, 'src', f), 'utf8');
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const safeJSON = (v) => JSON.stringify(v).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');

// на сайт попадают только инструменты из разделов CHAPTERS (серверные модели и внешние сервисы убраны)
const { default: vmMod } = await import('node:vm');
const ctx0 = vmMod.createContext({});
vmMod.runInContext((await src('i18n.js')) + '\n;globalThis.__ids = CHAPTERS.flatMap((c) => c.tools);', ctx0);
const SITE_IDS = new Set(ctx0.__ids);
const tools = JSON.parse(await src('tools.json')).filter((t) => !t.server && SITE_IDS.has(t.id));
const apps = {
  bopasi: await readFile(path.join(repo, 'web', 'Magauiya.html'), 'utf8'),
  bluetol: await readFile(path.join(repo, 'bluetol', 'bluetol.html'), 'utf8'),
};
// превью карточек: site/previews/<id>.jpg (снимаются скриптом site/previews.mjs)
const previews = {};
const pdir = path.join(here, 'previews');
if (existsSync(pdir)) for (const f of readdirSync(pdir)) if (f.endsWith('.jpg')) previews[f.slice(0, -4)] = 'data:image/jpeg;base64,' + (await readFile(path.join(pdir, f))).toString('base64');
const js = [
  await src('i18n.js'),
  await src('core.js'),
  `const TOOLS_DATA = ${safeJSON(tools)};`,
  `const APPS = ${safeJSON(apps)};`,
  `const PREVIEWS = ${safeJSON(previews)};`,
  await src('rcpc-engine.js'),
  await src('scd-engine.js'),
  await src('tool-calc.js'),
  await src('tool-rcpc.js'),
  await src('tool-scd.js'),
  await src('tool-lab.js'),
  await src('tool-morph.js'),
  await src('tool-constructor.js'),
  await src('ihc-engine.js'),
  await src('tool-histo.js'),
  await src('server-client.js'),
  await src('stage.js'),
  await src('app.js'),
].join('\n\n');
if (/<\/script/i.test(js)) throw new Error('</script внутри JS');

let html = await src('template.html');
html = html.split('{{CSS}}').join(await src('style.css'));
html = html.split('{{JS}}').join(js);   // split/join: без подстановок $& в String.replace

await writeFile(path.join(repo, 'BOPASI.html'), html);   // офлайн-версия одним файлом

// ── материалы для сайта на Next.js (next/): инструменты, стили, данные, библиотеки
const nx = path.join(repo, 'next');
const pub = path.join(nx, 'public');
await mkdir(path.join(pub, 'legacy'), { recursive: true });
const legacyJs = [
  await src('i18n.js'), await src('core.js'),
  `const TOOLS_DATA = ${safeJSON(tools)};`, `const APPS = ${safeJSON(apps)};`, 'const PREVIEWS = {};',
  await src('rcpc-engine.js'), await src('scd-engine.js'), await src('tool-calc.js'), await src('tool-rcpc.js'),
  await src('tool-scd.js'), await src('tool-lab.js'), await src('tool-morph.js'), await src('tool-constructor.js'),
  await src('ihc-engine.js'), await src('tool-histo.js'), await src('bridge.js'),
].join('\n\n');
await writeFile(path.join(pub, 'legacy', 'bopasi-tools.js'), legacyJs);
// стили инструментов: токены футуризма + блок «общие элементы инструментов» … до «адаптива»
const css = await src('style.css');
const toolCss = css.slice(css.indexOf('/* ── общие элементы инструментов */'), css.indexOf('/* ── адаптив */'));
await writeFile(path.join(pub, 'legacy', 'bopasi-tools.css'), await src('tool-theme.css') + '\n' + toolCss);
await rm(path.join(pub, 'previews'), { recursive: true, force: true });
await mkdir(path.join(pub, 'previews'), { recursive: true });
if (existsSync(pdir)) for (const f of readdirSync(pdir)) if (f.endsWith('.jpg')) await cp(path.join(pdir, f), path.join(pub, 'previews', f));
// данные каталога и тексты интерфейса для React (из i18n.js, без DOM)
const { default: vm } = await import('node:vm');
const ctx = vm.createContext({});
vm.runInContext((await src('i18n.js')) + '\n;globalThis.__x = { CHAPTERS, SHORT, KIND, UI };', ctx);
const { CHAPTERS, SHORT, KIND, UI } = ctx.__x;
await mkdir(path.join(nx, 'src', 'data'), { recursive: true });
const pickL = (o) => o && typeof o === 'object' && 'ru' in o ? o : null;
await writeFile(path.join(nx, 'src', 'data', 'catalog.json'), JSON.stringify({
  chapters: CHAPTERS.map((c) => ({ id: c.id, name: c.name, lead: c.lead, tools: c.tools })),
  short: SHORT, kind: KIND,
  tools: tools.map(({ id, name, tagline, full, features, input, steps, limits, output, authors }) => ({ id, name, tagline, full, features, input, steps, limits, output, authors })),
}, null, 1));
// сообщения next-intl: плоские строки интерфейса на трёх языках
const msgs = { ru: {}, kk: {}, en: {} };
for (const [k, v] of Object.entries(UI)) { const l = pickL(v); if (l) for (const lg of ['ru', 'kk', 'en']) msgs[lg][k] = l[lg]; }
for (const [k, v] of Object.entries(UI.nav || {})) for (const lg of ['ru', 'kk', 'en']) msgs[lg]['nav_' + k] = v[lg];
UI.about.forEach((p, i) => { for (const lg of ['ru', 'kk', 'en']) msgs[lg]['about' + i] = p[lg]; });
await mkdir(path.join(nx, 'messages'), { recursive: true });
for (const lg of ['ru', 'kk', 'en']) await writeFile(path.join(nx, 'messages', lg + '.json'), JSON.stringify(msgs[lg], null, 1));

// локальные копии библиотек (из node_modules при наличии, иначе из vendor/ рядом со сборкой)
const nm = path.join(here, 'node_modules');
const pick = async (rel, dest) => {
  const from = [path.join(nm, rel), path.join(here, 'vendor', path.basename(dest))].find(existsSync);
  if (!from) throw new Error('нет ' + rel + ' — запустите npm install в site/');
  await cp(from, dest);
};
await mkdir(path.join(pub, 'vendor'), { recursive: true });
await mkdir(path.join(pub, 'rdkit'), { recursive: true });
await pick('three/build/three.module.min.js', path.join(pub, 'vendor', 'three.module.js'));
await pick('3dmol/build/3Dmol-min.js', path.join(pub, 'vendor', '3Dmol-min.js'));
await pick('@rdkit/rdkit/dist/RDKit_minimal.js', path.join(pub, 'rdkit', 'RDKit_minimal.js'));
await pick('@rdkit/rdkit/dist/RDKit_minimal.wasm', path.join(pub, 'rdkit', 'RDKit_minimal.wasm'));
console.log(`OK: BOPASI.html ${(html.length / 1024).toFixed(0)} KB и материалы для next/, инструментов: ${tools.length}`);
