'use client';
import { useCallback, useId, useRef, useState } from 'react';
import { UI, tr, type Lang } from '@/lib/i18n';

export function UploadZone({ lang, accept, multiple = true, onFiles, hint, compact }: {
  lang: Lang; accept: string; multiple?: boolean; onFiles: (files: File[]) => void; hint?: string; compact?: boolean;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const handle = useCallback((fl: FileList | null) => { if (fl && fl.length) onFiles(Array.from(fl)); }, [onFiles]);

  return (
    <div>
      <label htmlFor={id}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition ${compact ? 'px-5 py-7' : 'px-6 py-12'} ${over ? 'border-blue bg-blue/5' : 'border-line bg-mist/50 hover:border-blue/50 hover:bg-mist'}`}>
        <svg viewBox="0 0 24 24" className="mb-3 h-9 w-9 text-blue" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" /></svg>
        <span className="text-sm font-semibold text-navy">{tr(UI.dropHere, lang)}</span>
        {hint && <span className="mt-1 text-xs text-navy/55">{hint}</span>}
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-navy/60 ring-1 ring-line">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{tr(UI.filesStayLocal, lang)}
        </span>
      </label>
      <input ref={inputRef} id={id} type="file" accept={accept} multiple={multiple} className="hidden"
        onChange={(e) => handle(e.target.files)} />
    </div>
  );
}
