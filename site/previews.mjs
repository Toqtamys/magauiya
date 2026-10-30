// Снимки превью для карточек: открывает собранный сайт, каждый браузерный инструмент
// и сохраняет кадр его рабочей области в site/previews/<id>.jpg (640×400).
// Запуск: node build.mjs && node previews.mjs && node build.mjs
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const pwPath = process.env.PLAYWRIGHT || 'playwright';
const { chromium } = (await import(pwPath)).default || (await import(pwPath));
const out = path.join(here, 'previews'); await mkdir(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const U = 'file://' + path.join(here, '..', 'bopasi', 'index.html');
await pg.goto(U); await pg.waitForTimeout(800);
const ids = (await pg.evaluate(() => [...document.querySelectorAll('.card:not(.srv)')].map((a) => a.getAttribute('href').slice(1)))).filter((id) => id !== 'molmoda' && id !== 'constructor');
const slow = { bopasi: 2500, bluetol: 2500, constructor: 9000, 'rc-phase': 2500, scd: 2500 };
for (const id of ids) {
  await pg.goto(U + '#' + id); await pg.waitForTimeout(slow[id] || 1400);
  if (id === 'constructor') { await pg.locator('#toolMount .chips button').nth(6).click().catch(() => {}); await pg.waitForTimeout(9000); }
  const box = await pg.locator('#toolMount').boundingBox();
  if (!box) continue;
  const w = Math.min(box.width, 900), hgt = Math.round(w * 10 / 16);
  await pg.evaluate((y) => document.querySelector('#panel').scrollTo(0, y), box.y - 80 + 0);
  const b2 = await pg.locator('#toolMount').boundingBox();
  await pg.screenshot({ path: path.join(out, id + '.png'), clip: { x: b2.x, y: Math.max(0, b2.y), width: w, height: Math.min(hgt, b2.height, 800 - Math.max(0, b2.y)) } });
  console.log('preview', id);
}
await b.close();
