'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Tool, Section } from '@/data/types';
import { MODE_LABEL, UI, tr, type Lang } from '@/lib/i18n';
import { ToolCard } from './ToolCard';
import { Glyph } from './Glyph';
import { Reveal } from './Reveal';

const MODES = ['browser', 'web', 'local', 'docker', 'desktop', 'hpc', 'paper'] as const;

export function SectionView({ section, tools, lang }: { section: Section; tools: Tool[]; lang: Lang }) {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<string>('all');
  const present = useMemo(() => MODES.filter((m) => tools.some((t) => t.mode === m)), [tools]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tools.filter((t) => {
      if (mode !== 'all' && t.mode !== mode) return false;
      if (!needle) return true;
      const hay = [t.name, tr(t.tagline, lang), ...t.tags].join(' ').toLowerCase();
      return hay.includes(needle);
    });
  }, [tools, q, mode, lang]);

  return (
    <>
      <section className="relative overflow-hidden bg-grid pt-28 pb-14">
        <div className="pointer-events-none absolute inset-0 bg-aurora opacity-70" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
        <div className="container-page relative">
          <Link href={`/${lang}`} className="text-sm font-medium text-blue hover:underline">← BOPASI</Link>
          <div className="mt-5 flex items-start gap-5">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-deep to-blue text-white shadow-lift">
              <Glyph name={section.glyph} className="h-8 w-8" />
            </span>
            <div>
              <span className="font-mono text-xs text-navy/40">{section.short}</span>
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">{tr(section.title, lang)}</h1>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-navy/70">{tr(section.lead, lang)}</p>
        </div>
      </section>

      <section className="container-page pb-8">
        <div className="sticky top-16 z-20 -mx-2 flex flex-wrap items-center gap-3 rounded-2xl bg-white/80 px-2 py-3 backdrop-blur">
          <div className="relative flex-1 min-w-[220px]">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr(UI.search, lang)}
              className="w-full rounded-full border border-line bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setMode('all')} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${mode === 'all' ? 'bg-navy text-white' : 'bg-mist text-navy/70 hover:bg-ice'}`}>{tr(UI.allModes, lang)}</button>
            {present.map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${mode === m ? 'bg-navy text-white' : 'bg-mist text-navy/70 hover:bg-ice'}`}>{tr(MODE_LABEL[m], lang)}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t, i) => (
            <Reveal key={t.id} delay={Math.min(i, 6) * 50}>
              <ToolCard tool={t} lang={lang} glyph={section.glyph} />
            </Reveal>
          ))}
        </div>
        {list.length === 0 && <p className="py-16 text-center text-navy/50">—</p>}
      </section>
    </>
  );
}
