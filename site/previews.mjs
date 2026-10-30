// Снимки превью для карточек: открывает собранный сайт (bopasi/, Next.js) через локальный
// сервер, каждую страницу инструмента /t/<id>/ и сохраняет кадр рабочей области в
// site/previews/<id>.png. Затем: python3 — конвертация в JPG 640×400 (см. README).
// Запуск: cd next && npm run build && cd ../site && node previews.mjs
import http from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, '..');
const pwPath = process.env.PLAYWRIGHT || 'playwright';
const { chromium } = (await import(pwPath)).default || (await import(pwPath));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.txt': 'text/plain', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.json': 'application/json', '.gz': 'application/gzip', '.pdb': 'text/plain', '.gb': 'text/plain' };
const srv = http.createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]); let f = path.join(repo, p.replace(/^\/magauiya\//, ''));
  try { if ((await stat(f)).isDirectory()) f = path.join(f, 'index.html'); } catch {}
  try { const d = await readFile(f); res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); } catch { res.writeHead(404); res.end(); }
}).listen(0);
const U = `http://localhost:${srv.address().port}/magauiya/bopasi/`;
const out = path.join(here, 'previews'); await mkdir(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const catalog = JSON.parse(await readFile(path.join(repo, 'next', 'src', 'data', 'catalog.json'), 'utf8'));
const ids = (process.argv[2] ? process.argv[2].split(',') : catalog.chapters.flatMap((c) => c.tools));
for (const id of ids) {
  await pg.goto(U + 't/' + id + '/'); await pg.waitForTimeout({ bopasi: 4000, bluetol: 4000, niivue: 9000, molstar: 14000, seqviz: 5000 }[id] || 3000);
  const el = pg.locator('[data-tool-panel]'); await el.scrollIntoViewIfNeeded();
  await pg.evaluate(() => scrollBy(0, -20));
  const box = await el.boundingBox(); if (!box) continue;
  const w = Math.min(box.width, 900), h = Math.min(Math.round(w * 10 / 16), box.height, 800 - Math.max(0, box.y));
  await pg.screenshot({ path: path.join(out, id + '.png'), clip: { x: box.x, y: Math.max(0, box.y), width: w, height: h }, animations: 'disabled', timeout: 60000 });
  console.log('preview', id);
}
await b.close(); srv.close();
