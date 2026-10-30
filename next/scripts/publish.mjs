// Копирует статический экспорт Next.js (out/) в ../bopasi — эту папку отдаёт GitHub Pages.
import { cp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "..", "out"), dest = path.join(here, "..", "..", "bopasi");
await rm(dest, { recursive: true, force: true });
await cp(out, dest, { recursive: true });
await writeFile(path.join(dest, ".nojekyll"), "");
console.log("published to", dest);
