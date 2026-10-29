#!/usr/bin/env node
// Пакетный анализ: node cli.js фото1.jpg фото2.jpg ... > результат.csv
const fs = require('fs'), path = require('path'), jpeg = require('jpeg-js'), TB = require('./src/core.js');
const files = process.argv.slice(2);
if (!files.length) { console.error('Использование: node cli.js <снимки.jpg ...>'); process.exit(1); }
let A = 0, B = 0, E = 0;
console.log('снимок;норма;фрагментированные;оценено;исключено;индекс_%');
for (const f of files) {
  const img = jpeg.decode(fs.readFileSync(f), { useTArray: true });
  const { cells } = TB.analyze(img);
  const n = { healthy: 0, fragmented: 0, excluded: 0 };
  cells.forEach(c => n[c.auto]++);
  const t = n.healthy + n.fragmented;
  A += n.healthy; B += n.fragmented; E += n.excluded;
  console.log([path.basename(f), n.healthy, n.fragmented, t, n.excluded, t ? (100 * n.fragmented / t).toFixed(1) : ''].join(';'));
}
console.log(['ИТОГО', A, B, A + B, E, A + B ? (100 * B / (A + B)).toFixed(1) : ''].join(';'));
