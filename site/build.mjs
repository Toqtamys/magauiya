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
  // VISEM — то же приложение CASA с нейросетью вместо классического детектора
  visem: (await readFile(path.join(repo, 'web', 'Magauiya.html'), 'utf8')).replace('<head>', '<head><script>window.CASA_MODE = \'nn\';</script>').replace(/<h1>Magauiya<span class="ver">[^<]*<\/span><\/h1>/, '<h1>VISEM<span class="ver">YOLOv5n · VISEM-Tracking</span></h1>'),
  bluetol: await readFile(path.join(repo, 'bluetol', 'bluetol.html'), 'utf8'),
};
// превью карточек: site/previews/<id>.jpg (снимаются скриптом site/previews.mjs)
const previews = {};
const pdir = path.join(here, 'previews');
if (existsSync(pdir)) for (const f of readdirSync(pdir)) if (f.endsWith('.jpg')) previews[f.slice(0, -4)] = 'data:image/jpeg;base64,' + (await readFile(path.join(pdir, f))).toString('base64');
// открытые проекты в офлайн-файле: Mol* (готовая сборка) + NiiVue/SeqViz/React (esbuild из next/node_modules)
const nxm = path.join(repo, 'next', 'node_modules');
const { build: esb } = await import('esbuild');
const sciLib = (await esb({ entryPoints: [path.join(here, 'sci', 'entry.js')], bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'none', nodePaths: [nxm], write: false, logLevel: 'error' })).outputFiles[0].text;
const molJs = await readFile(path.join(nxm, 'molstar', 'build', 'viewer', 'molstar.js'), 'utf8');
const molCss = await readFile(path.join(nxm, 'molstar', 'build', 'viewer', 'molstar.css'), 'utf8');
// <!-- и <script внутри строк ломают разбор <script> в HTML — экранируем первый символ (\x21, \x73 работают и в строках, и в регулярках)
const inlineSafe = (code) => code.replace(/<(!--|script)/gi, (m, w) => '<\\x' + w.charCodeAt(0).toString(16) + w.slice(1));
const sciSamples = {
  pdb: await readFile(path.join(here, 'samples', '4WP4.pdb'), 'utf8'),
  gb: await readFile(path.join(here, 'samples', 'pBAD30.gb'), 'utf8'),
  nii: (await readFile(path.join(here, 'samples', 'ovary-synthetic.nii.gz'))).toString('base64'),
};
const js = [
  await src('i18n.js'),
  await src('core.js'),
  `const TOOLS_DATA = ${safeJSON(tools)};`,
  `const APPS = ${safeJSON({ bopasi: apps.bopasi, bluetol: apps.bluetol })};`,   // VISEM — только на сайте
  `const PREVIEWS = ${safeJSON(previews)};`,
  await src('rcpc-engine.js'),
  await src('scd-engine.js'),
  await src('tool-calc.js'),
  await src('tool-rcpc.js'),
  await src('nn-load.js'), await src('scd-ai.js'), await src('scd-ai20.js'),
  await src('tool-scd.js'),
  await src('tool-lab.js'),
  await src('tool-morph.js'),
  await src('tool-constructor.js'),
  await src('ihc-engine.js'),
  await src('tool-histo.js'),
  await src('server-client.js'),
  await src('tool-sci.js'),
  `const SCI_SAMPLES = ${safeJSON(sciSamples)};`,
  await src('stage.js'),
  await src('sky.js'),
  await src('app.js'),
].join('\n\n');
if (/<\/script/i.test(js)) throw new Error('</script внутри JS');

let html = await src('template.html');
html = html.split('{{CSS}}').join(await src('style.css'));
// шрифты постера (fontsource, OFL) — внутрь файла, чтобы работали без интернета
const fontCss = [];
for (const [pkg, ws] of [['ibm-plex-sans', [400, 700]], ['ibm-plex-mono', [500, 700]]]) for (const w of ws) {
  const dir = path.join(nxm, '@fontsource', pkg);
  let css = await readFile(path.join(dir, w + '.css'), 'utf8');
  css = css.split('@font-face').filter((b) => /(cyrillic|latin)/.test(b) && !/(vietnamese|greek|hebrew|math|symbols)/.test(b.slice(0, 200))).map((b) => '@font-face' + b).join('');
  const urls = [...new Set(css.match(/\.\/files\/[^)]+\.woff2/g) || [])];
  for (const u of urls) css = css.split(u).join('data:font/woff2;base64,' + (await readFile(path.join(dir, u))).toString('base64'));
  fontCss.push(css.replace(/,\s*url\(\.\/files\/[^)]+\.woff\)\s*format\('woff'\)/g, ''));
}
html = html.split('{{FONTS}}').join(fontCss.join('\n'));
html = html.split('{{JS}}').join(js);   // split/join: без подстановок $& в String.replace
html = html.split('<script type="module">').join(`<style>${molCss}</style>\n<script>${inlineSafe(molJs)}</script>\n<script>${inlineSafe(sciLib)}</script>\n<script type="module">`);
if (/<\/script/i.test(molJs + sciLib)) throw new Error('</script внутри библиотек');

await writeFile(path.join(repo, 'BOPASI.html'), html);   // офлайн-версия одним файлом

// ── полная офлайн-версия: + VISEM, рантайм нейросетей и модели внутри файла (BOPASI-full.html, не в git)
{
  const { gzipSync } = await import('node:zlib');
  const ortSrc = path.join(repo, 'next', 'node_modules', 'onnxruntime-web', 'dist');
  const blobs = [
    ['ort.wasm.min.js', path.join(ortSrc, 'ort.wasm.min.js')],
    ['ort-wasm-simd-threaded.mjs', path.join(ortSrc, 'ort-wasm-simd-threaded.mjs')],
    ['ort-wasm-simd-threaded.wasm', path.join(ortSrc, 'ort-wasm-simd-threaded.wasm')],
    ...['scd-yolov8s-seg.onnx', 'scd-centernet-r18.onnx', 'visem-yolov5n.onnx'].map((m) => [m, path.join(here, 'models', m)]),
  ];
  const data = [];
  for (const [name, file] of blobs) data.push(`<script type="application/x-gzip-base64" data-nn="${name}">${gzipSync(await readFile(file), { level: 9 }).toString('base64')}</script>`);
  const appsLine = `const APPS = ${safeJSON({ bopasi: apps.bopasi, bluetol: apps.bluetol })};`;
  if (!html.includes(appsLine)) throw new Error('APPS не найден');
  let full = html.split(appsLine).join(`const APPS = ${safeJSON({ bopasi: apps.bopasi, bluetol: apps.bluetol, visem: apps.visem })};`);
  full = full.replace('<head>', '<head><script>window.BOPASI_FULL = true;</script>');
  const endBody = full.lastIndexOf('</body>');
  full = full.slice(0, endBody) + data.join('\n') + '\n' + full.slice(endBody);
  await writeFile(path.join(repo, 'BOPASI-full.html'), full);
  console.log(`OK: BOPASI-full.html ${(full.length / 1048576).toFixed(1)} MB`);
}

// ── материалы для сайта на Next.js (next/): инструменты, стили, данные, библиотеки
const nx = path.join(repo, 'next');
const pub = path.join(nx, 'public');
await mkdir(path.join(pub, 'legacy'), { recursive: true });
const legacyJs = [
  await src('i18n.js'), await src('core.js'),
  `const TOOLS_DATA = ${safeJSON(tools)};`, `const APPS = ${safeJSON(apps)};`, 'const PREVIEWS = {};',
  await src('rcpc-engine.js'), await src('scd-engine.js'), await src('tool-calc.js'), await src('tool-rcpc.js'),
  await src('nn-load.js'), await src('scd-ai.js'), await src('scd-ai20.js'), await src('tool-scd.js'), await src('tool-lab.js'), await src('tool-morph.js'), await src('tool-constructor.js'),
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
// общее небо: тот же файл, что в офлайн-версии, как ES-модуль
await writeFile(path.join(nx, 'src', 'lib', 'stage.gen.js'), '// сгенерировано из site/src/stage.js\nconst L = (ru, kk, en) => ({ ru, kk, en }); const tr = (x) => (x && x.ru) || \'\'; const REDUCED = false; const SCENES = [];\n' + (await src('stage.js')) + '\nexport { Stage };\n');
await writeFile(path.join(nx, 'src', 'lib', 'sky.gen.js'), '// сгенерировано из site/src/sky.js\n' + (await src('sky.js')) + '\nexport { createSky, createPlanet };\n');
const pickL = (o) => o && typeof o === 'object' && 'ru' in o ? o : null;
await writeFile(path.join(nx, 'src', 'data', 'catalog.json'), JSON.stringify({
  chapters: CHAPTERS.map((c) => ({ id: c.id, name: c.name, lead: c.lead, tools: c.tools })),
  short: SHORT, kind: KIND,
  tools: tools.map(({ id, name, tagline, full, features, input, steps, limits, output, authors, github, license }) => ({ id, name, tagline, full, features, input, steps, limits, output, authors, github, license })),
}, null, 1));
// сообщения next-intl: плоские строки интерфейса на трёх языках
const msgs = { ru: {}, kk: {}, en: {} };
for (const [k, v] of Object.entries(UI)) { const l = pickL(v); if (l) for (const lg of ['ru', 'kk', 'en']) msgs[lg][k] = l[lg]; }
for (const [k, v] of Object.entries(UI.nav || {})) for (const lg of ['ru', 'kk', 'en']) msgs[lg]['nav_' + k] = v[lg];
UI.about.forEach((p, i) => { for (const lg of ['ru', 'kk', 'en']) msgs[lg]['about' + i] = p[lg]; });
await mkdir(path.join(nx, 'messages'), { recursive: true });
for (const lg of ['ru', 'kk', 'en']) await writeFile(path.join(nx, 'messages', lg + '.json'), JSON.stringify(msgs[lg], null, 1));

// примеры для открытых проектов и сборка Mol* (из next/node_modules)
await rm(path.join(pub, 'samples'), { recursive: true, force: true });
await cp(path.join(here, 'samples'), path.join(pub, 'samples'), { recursive: true });
const ms = path.join(nx, 'node_modules', 'molstar');
if (existsSync(ms)) {
  await mkdir(path.join(pub, 'molstar'), { recursive: true });
  for (const f of ['build/viewer/molstar.js', 'build/viewer/molstar.css', 'LICENSE']) await cp(path.join(ms, f), path.join(pub, 'molstar', path.basename(f)));
}

// нейросеть SCD и ONNX Runtime Web (только для сайта: в офлайн-файл не входят)
await rm(path.join(pub, 'models'), { recursive: true, force: true });
await cp(path.join(here, 'models'), path.join(pub, 'models'), { recursive: true });
const ortDir = path.join(nx, 'node_modules', 'onnxruntime-web');
if (existsSync(ortDir)) {
  await mkdir(path.join(pub, 'ort'), { recursive: true });
  for (const f of ['dist/ort.wasm.min.js', 'dist/ort-wasm-simd-threaded.mjs', 'dist/ort-wasm-simd-threaded.wasm']) await cp(path.join(ortDir, f), path.join(pub, 'ort', path.basename(f)));
}

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

// ── отдельный файл: только SCD-тест с обеими нейросетями внутри (BOPASI-SCD.html, не в git)
{
  const { gzipSync } = await import('node:zlib');
  const ortSrc = path.join(repo, 'next', 'node_modules', 'onnxruntime-web', 'dist');
  const blobs = [
    ['ort.wasm.min.js', path.join(ortSrc, 'ort.wasm.min.js')],
    ['ort-wasm-simd-threaded.mjs', path.join(ortSrc, 'ort-wasm-simd-threaded.mjs')],
    ['ort-wasm-simd-threaded.wasm', path.join(ortSrc, 'ort-wasm-simd-threaded.wasm')],
    ['scd-yolov8s-seg.onnx', path.join(here, 'models', 'scd-yolov8s-seg.onnx')],
    ['scd-centernet-r18.onnx', path.join(here, 'models', 'scd-centernet-r18.onnx')],
  ];
  const data = [];
  for (const [name, file] of blobs) data.push(`<script type="application/x-gzip-base64" data-nn="${name}">${gzipSync(await readFile(file), { level: 9 }).toString('base64')}</script>`);
  const scdTools = tools.filter((x) => x.id === 'scd');
  const sjs = [
    await src('i18n.js'), await src('core.js'), `const TOOLS_DATA = ${safeJSON(scdTools)};`,
    await src('scd-engine.js'), await src('tool-calc.js'), await src('nn-load.js'), await src('scd-ai.js'), await src('scd-ai20.js'), await src('tool-scd.js'),
    await src('scd-standalone.js'),
  ].join('\n\n');
  if (/<\/script/i.test(sjs)) throw new Error('</script внутри SCD JS');
  const shell = `
:root { --paper: #000; --tone: #111214; --tone2: #1b1d21; --ink: #f2f3f5; --soft: #9aa0ab; --navy: #fff; --navy2: #d7d9de;
  --blue: #fff; --blue-d: #fff; --cyan: #8b93a1; --ice: #111214; --mist: #111214; --line: #2a2d33; --red: #fff;
  --text: var(--ink); --muted: var(--soft); --good: #5fd3a0; --good-bg: #0e2a1f; --warn: #f2a65e; --warn-bg: #2b1a0b; color-scheme: dark; }
html, body { background: #000; }
body { margin: 0; color: #f2f3f5; font-family: 'IBM Plex Sans', system-ui, sans-serif; }
.sa-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #1f2125; position: sticky; top: 0; background: rgba(0,0,0,.92); backdrop-filter: blur(8px); z-index: 5; }
.sa-brand { font: 700 18px/1 'IBM Plex Sans', sans-serif; letter-spacing: .32em; color: #fff; }
.sa-lang { display: flex; gap: 4px; }
.sa-lang button { border: 0; background: none; font: 700 12px/1 'IBM Plex Mono', monospace; letter-spacing: .12em; text-transform: uppercase; padding: 8px 10px; color: #6b717c; cursor: pointer; }
.sa-lang button.on { color: #fff; }
.sa-main { max-width: 1320px; margin: 0 auto; padding: 40px 24px 64px; }
.sa-kicker { font: 600 12px/1 'IBM Plex Mono', monospace; letter-spacing: .18em; text-transform: uppercase; color: #9aa0ab; margin: 0; }
.sa-main h1 { font: 700 clamp(34px, 5vw, 64px)/1 'IBM Plex Sans', sans-serif; letter-spacing: -.02em; margin: 14px 0 12px; color: #fff; text-transform: uppercase; }
.sa-lead { font-size: 18px; line-height: 1.5; color: #c9ccd2; max-width: 70ch; margin: 0 0 8px; }
.sa-note { font: 600 12px/1.4 'IBM Plex Mono', monospace; letter-spacing: .06em; text-transform: uppercase; color: #9aa0ab; margin: 0 0 28px; }
.sa-tool { border: 1px solid #2a2d33; padding: 24px; background: #000; }
.sa-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 28px; margin-top: 40px; }
.sa-info h3 { font: 700 14px/1.2 'IBM Plex Mono', monospace; letter-spacing: .1em; text-transform: uppercase; margin: 0 0 12px; color: #fff; }
.sa-info li { margin-bottom: 8px; line-height: 1.5; color: #c9ccd2; }
.sa-foot { margin-top: 48px; padding-top: 20px; border-top: 1px solid #1f2125; color: #8a909b; font-size: 13px; line-height: 1.5; }
/* инструмент на чёрном */
.tool-root { color: #f2f3f5; }
.tool-root .big, .tool-root .big:first-child { background: #fff; color: #000; }
.tool-root .big .k, .tool-root .big .s { color: #3a3e45; }
.tool-root .big strong { color: #000; }
.tool-root .btn { background: #fff; color: #000; }
.tool-root .btn-ghost { background: transparent; color: #f2f3f5; border: 1px solid #3a3e45; }
.tool-root .btn-ghost.on { background: #fff; color: #000; }
.tool-root .scd-side select { font-size: 14px; padding: 8px 10px; border-radius: 4px; }
.tool-root select, .tool-root input[type=text], .tool-root input[type=number] { background: #111214; color: #f2f3f5; border: 1px solid #2a2d33; }
.tool-root input[type=range] { accent-color: #fff; }
.tool-root .seg { background: #111214; }
.tool-root .seg button { color: #9aa0ab; background: transparent; }
.tool-root .seg button.on { background: #fff; color: #000; }
.tool-root .drop, .tool-root .scd-empty { background: #0b0c0e; border-color: #3a3e45; color: #c9ccd2; }
.tool-root .drop.over { border-color: #fff; }
.tool-root .scd-req { background: #111214; border-left-color: #fff; }
.tool-root .scd-req .k, .tool-root .scd-compare .k { color: #fff; }
.tool-root .scd-req p, .tool-root .hint, .tool-root .rc-note { color: #9aa0ab; }
.tool-root .scd-samples .tab { color: #c9ccd2; border-color: #2a2d33; }
.tool-root .scd-samples .tab.on { color: #000; background: #fff; border-color: #fff; }
.tool-root .thumb-x { background: #000; color: #fff; border-color: #3a3e45; }
.tool-root .thumb { border-color: #2a2d33; background: #111214; }
.tool-root .thumb.on { border-color: #fff; }
.tool-root .track { background: #1b1d21; }
.tool-root .scd-table th { color: #8a909b; }
.tool-root .scd-table tr.on td { color: #fff; }
.tool-root .scd-legend .lg { color: #c9ccd2; }
@media (max-width: 640px) { .sa-main { padding: 24px 16px 48px; } .sa-tool { padding: 12px; } }`;
  const shtml = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SCD / DFI · BOPASI</title>
<style>${fontCss.join('\n')}</style>
<style>${await src('tool-theme.css')}\n${toolCss}\n${shell}</style>
</head><body><div id="app"></div>
<script>${sjs}</script>
${data.join('\n')}
</body></html>`;
  await writeFile(path.join(repo, 'BOPASI-SCD.html'), shtml);
  // лёгкая версия для встраивания на другие сайты (iframe): нейросети грузятся с BOPASI по запросу
  const lite = shtml.replace(data.join('\n'), '').replace('<head>', `<head><script>window.BOPASI_BASE = '../';</script>`);
  await mkdir(path.join(pub, 'embed'), { recursive: true });
  await writeFile(path.join(pub, 'embed', 'scd.html'), lite);
  console.log(`OK: embed/scd.html ${(lite.length / 1048576).toFixed(1)} MB`);
  // копии для скачивания с сайта: …/bopasi/download/
  await mkdir(path.join(pub, 'download'), { recursive: true });
  await cp(path.join(repo, 'BOPASI-SCD.html'), path.join(pub, 'download', 'BOPASI-SCD.html'));
  await cp(path.join(repo, 'BOPASI-full.html'), path.join(pub, 'download', 'BOPASI-full.html'));
  console.log(`OK: BOPASI-SCD.html ${(shtml.length / 1048576).toFixed(1)} MB`);
}
console.log(`OK: BOPASI.html ${(html.length / 1024).toFixed(0)} KB и материалы для next/, инструментов: ${tools.length}`);
