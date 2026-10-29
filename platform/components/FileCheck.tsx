'use client';
import { useState } from 'react';
import { L, UI, tr, type Lang } from '@/lib/i18n';
import type { FileCheck as FC } from '@/data/types';
import { UploadZone } from './UploadZone';

interface Row { name: string; ok: boolean; msgs: string[] }

export function FileCheck({ lang, check, runCmd }: { lang: Lang; check: FC; runCmd?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<string[]>([]);

  async function handle(files: File[]) {
    const out: Row[] = [];
    for (const f of files) {
      const msgs: string[] = []; let ok = true;
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (check.ext && !check.ext.includes(ext)) { ok = false; msgs.push(tr(L(`формат .${ext} не поддержан`, `.${ext} пішімі қолданылмайды`, `.${ext} not supported`), lang)); }
      if (check.maxMB && f.size > check.maxMB * 1048576) { ok = false; msgs.push(tr(L(`> ${check.maxMB} МБ`, `> ${check.maxMB} МБ`, `> ${check.maxMB} MB`), lang)); }
      if ((check.minW || check.minH) && /^(png|jpg|jpeg|bmp|webp|gif)$/.test(ext)) {
        const dim = await imgSize(f).catch(() => null);
        if (dim) {
          if (check.minW && dim.w < check.minW) { ok = false; msgs.push(tr(L(`ширина ${dim.w} < ${check.minW} пикс.`, `ені ${dim.w} < ${check.minW} пикс.`, `width ${dim.w} < ${check.minW} px`), lang)); }
          if (check.minH && dim.h < check.minH) { ok = false; msgs.push(tr(L(`высота ${dim.h} < ${check.minH} пикс.`, `биіктігі ${dim.h} < ${check.minH} пикс.`, `height ${dim.h} < ${check.minH} px`), lang)); }
        }
      }
      if (ok) msgs.push(tr(L('подходит', 'сәйкес', 'ok'), lang));
      out.push({ name: f.name, ok, msgs });
    }
    setRows(out); setNames(files.map((f) => f.name));
  }

  const allOk = rows.length > 0 && rows.every((r) => r.ok);
  const cmd = runCmd ? runCmd.replace('{files}', names.join(' ')).replace('{dir}', './data').replace('{file}', names[0] || 'input') : null;

  return (
    <div>
      <UploadZone lang={lang} accept={check.ext.map((e) => '.' + e).join(',')} onFiles={handle} compact
        hint={check.ext.map((e) => '.' + e).join(' · ')} />
      {rows.length > 0 && (
        <div className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <div key={i} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${r.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${r.ok ? 'bg-emerald-500' : 'bg-amber-500'}`}>{r.ok ? '✓' : '!'}</span>
              <div><span className="font-medium text-navy">{r.name}</span><span className="text-navy/55"> — {r.msgs.join(', ')}</span></div>
            </div>
          ))}
          <div className={`rounded-xl px-4 py-3 text-sm font-medium ${allOk ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            {allOk ? tr(UI.readyToRun, lang) : tr(UI.fixFiles, lang)}
          </div>
          {allOk && cmd && (
            <pre className="overflow-x-auto rounded-xl bg-navy px-4 py-3 text-xs text-ice"><code>{cmd}</code></pre>
          )}
        </div>
      )}
    </div>
  );
}

function imgSize(f: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(img.src); };
    img.onerror = reject; img.src = URL.createObjectURL(f);
  });
}
