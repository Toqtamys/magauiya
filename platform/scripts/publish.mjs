/* Копирует статический экспорт (out/) в ../bopasi для GitHub Pages:
 * toqtamys.github.io/magauiya/bopasi/  */
import { cp, rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const out = new URL('../out/', import.meta.url);
const dest = new URL('../../bopasi/', import.meta.url);

if (!existsSync(out)) { console.error('Нет папки out/. Сначала: npm run build'); process.exit(1); }
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(out, dest, { recursive: true });
// .nojekyll, чтобы Pages не прятал _next
await writeFile(new URL('.nojekyll', dest), '');
console.log('Опубликовано в /bopasi');
