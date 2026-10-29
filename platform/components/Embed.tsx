'use client';
import { useState } from 'react';
import { UI, tr, asset, type Lang } from '@/lib/i18n';

/** Встраивает автономное приложение (Magauiya / Блютол) в iframe с полноэкранным режимом. */
export function Embed({ lang, src, title }: { lang: Lang; src: string; title: string }) {
  const [full, setFull] = useState(false);
  const url = asset(src);
  return (
    <div className={full ? 'fixed inset-0 z-[60] bg-white p-3 sm:p-4' : 'rounded-3xl border border-line bg-white p-2 shadow-card'}>
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="text-xs font-semibold text-navy/60">{title}</span>
        <div className="flex gap-2">
          <a href={url} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1 text-xs font-medium text-navy/70 hover:bg-mist">↗</a>
          <button onClick={() => setFull((v) => !v)} className="rounded-full bg-blue px-3 py-1 text-xs font-semibold text-white hover:bg-deep">
            {full ? '✕' : tr(UI.fullscreen, lang)}
          </button>
        </div>
      </div>
      <iframe src={url} title={title} className={`w-full rounded-2xl border border-line bg-white ${full ? 'h-[calc(100%-2.5rem)]' : 'h-[72vh]'}`}
        allow="clipboard-write" />
    </div>
  );
}
