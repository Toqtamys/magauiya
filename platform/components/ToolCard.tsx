import Link from 'next/link';
import type { Tool } from '@/data/types';
import { MODE_LABEL, UI, tr, type Lang } from '@/lib/i18n';
import { Glyph, type GlyphName } from './Glyph';

const MODE_TONE: Record<string, string> = {
  browser: 'bg-cyan/15 text-deep',
  web: 'bg-cyan/15 text-deep',
  local: 'bg-mist text-navy/70',
  docker: 'bg-mist text-navy/70',
  desktop: 'bg-mist text-navy/70',
  hpc: 'bg-navy/90 text-ice',
  paper: 'bg-mist text-navy/70',
};

export function ToolCard({ tool, lang, glyph }: { tool: Tool; lang: Lang; glyph: GlyphName }) {
  const runs = tool.mode === 'browser' || tool.mode === 'web';
  return (
    <Link href={`/${lang}/tool/${tool.id}`}
      className="card-hover group relative flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-mist to-ice text-deep">
          <Glyph name={glyph} className="h-6 w-6" />
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {runs && <span className="rounded-full bg-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">{tr(UI.inBrowser, lang)}</span>}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${MODE_TONE[tool.mode]}`}>{tr(MODE_LABEL[tool.mode], lang)}</span>
        </div>
      </div>
      <h3 className="font-display text-[15px] font-semibold leading-snug text-navy">{tool.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-navy/65">{tr(tool.tagline, lang)}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-md bg-mist px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-navy/55">{UI.openSource}</span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
          {tr(UI.open, lang)}
          <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </div>
    </Link>
  );
}
