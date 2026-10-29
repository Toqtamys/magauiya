// Сборка BOPASI в один HTML-файл: node build.mjs
// → ../bopasi/index.html (сайт) + ../bopasi/vendor, ../bopasi/rdkit (локальные копии библиотек)
// → ../BOPASI.html (тот же файл для скачивания; без локальных копий берёт библиотеки с CDN)
import { readFile, writeFile, rm, mkdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const src = (f) => readFile(path.join(here, 'src', f), 'utf8');
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const safeJSON = (v) => JSON.stringify(v).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');

const tools = JSON.parse(await src('tools.json'));
const apps = {
  bopasi: await readFile(path.join(repo, 'web', 'Magauiya.html'), 'utf8'),
  bluetol: await readFile(path.join(repo, 'bluetol', 'bluetol.html'), 'utf8'),
};
const js = [
  await src('i18n.js'),
  await src('core.js'),
  `const TOOLS_DATA = ${safeJSON(tools)};`,
  `const APPS = ${safeJSON(apps)};`,
  await src('rcpc-engine.js'),
  await src('tool-rcpc.js'),
  await src('tool-calc.js'),
  await src('tool-constructor.js'),
  await src('scene.js'),
  await src('app.js'),
].join('\n\n');
if (/<\/script/i.test(js)) throw new Error('</script внутри JS');

let html = await src('template.html');
html = html.split('{{CSS}}').join(await src('style.css'));
html = html.split('{{JS}}').join(js);   // split/join: без подстановок $& в String.replace

const out = path.join(repo, 'bopasi');
await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, 'vendor'), { recursive: true });
await writeFile(path.join(out, 'index.html'), html);
await writeFile(path.join(repo, 'BOPASI.html'), html);
await writeFile(path.join(out, '.nojekyll'), '');

// локальные копии библиотек (берутся из node_modules при наличии, иначе из vendor/ рядом со сборкой)
const nm = path.join(here, 'node_modules');
const pick = async (rel, dest) => {
  const from = [path.join(nm, rel), path.join(here, 'vendor', path.basename(dest))].find(existsSync);
  if (!from) throw new Error('нет ' + rel + ' — запустите npm install в site/');
  await cp(from, dest);
};
await pick('three/build/three.module.min.js', path.join(out, 'vendor', 'three.module.js'));
await pick('3dmol/build/3Dmol-min.js', path.join(out, 'vendor', '3Dmol-min.js'));
await mkdir(path.join(out, 'rdkit'), { recursive: true });
await pick('@rdkit/rdkit/dist/RDKit_minimal.js', path.join(out, 'rdkit', 'RDKit_minimal.js'));
await pick('@rdkit/rdkit/dist/RDKit_minimal.wasm', path.join(out, 'rdkit', 'RDKit_minimal.wasm'));
console.log(`OK: bopasi/index.html ${(html.length / 1024).toFixed(0)} KB, инструментов: ${tools.length}`);
