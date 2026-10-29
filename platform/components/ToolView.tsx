import Link from 'next/link';
import type { Tool, Section } from '@/data/types';
import { UI, MODE_LABEL, tr, type Lang } from '@/lib/i18n';
import { Glyph } from './Glyph';
import { Reveal } from './Reveal';
import { Interactive } from './Interactive';
import { ToolCard } from './ToolCard';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 className="font-display text-lg font-semibold text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function OL({ items, lang }: { items: any[]; lang: Lang }) {
  return <ol className="space-y-3">{items.map((t, i) => (
    <li key={i} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue/10 text-xs font-bold text-blue">{i + 1}</span><span className="text-sm leading-relaxed text-navy/75">{tr(t, lang)}</span></li>
  ))}</ol>;
}
function UL({ items, lang, mark = '•' }: { items: any[]; lang: Lang; mark?: string }) {
  return <ul className="space-y-2">{items.map((t, i) => (
    <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-navy/75"><span className="mt-1 text-blue">{mark}</span><span>{tr(t, lang)}</span></li>
  ))}</ul>;
}

export function ToolView({ tool, section, related, lang }: { tool: Tool; section: Section; related: Tool[]; lang: Lang }) {
  const runs = tool.mode === 'browser' || tool.mode === 'web';
  const hasAction = !!tool.interactive || !!tool.check;
  const actionLabel = tool.action === 'analyze' ? UI.analyze : tool.action === 'create' ? UI.create : tool.action === 'dock' ? UI.dock : tool.action === 'calc' ? UI.calc : UI.check;

  return (
    <>
      <section className="relative overflow-hidden bg-grid pt-28 pb-10">
        <div className="pointer-events-none absolute inset-0 bg-aurora opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-white" />
        <div className="container-page relative">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href={`/${lang}`} className="text-blue hover:underline">BOPASI</Link>
            <span className="text-navy/30">/</span>
            <Link href={`/${lang}/${section.id}`} className="text-blue hover:underline">{tr(section.title, lang)}</Link>
          </div>
          <div className="mt-5 flex flex-wrap items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-deep to-blue text-white shadow-lift"><Glyph name={section.glyph} className="h-7 w-7" /></span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold sm:text-3xl">{tool.name}</h1>
                <span className="rounded-md bg-mist px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-navy/60">{UI.openSource}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {runs && <span className="rounded-full bg-blue px-2.5 py-0.5 font-semibold text-white">{tr(UI.inBrowser, lang)}</span>}
                <span className="rounded-full bg-mist px-2.5 py-0.5 font-semibold text-navy/70">{tr(MODE_LABEL[tool.mode], lang)}</span>
                {tool.tags.slice(0, 5).map((t) => <span key={t} className="rounded-full border border-line px-2.5 py-0.5 font-medium text-navy/55">{t}</span>)}
              </div>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-navy/75">{tr(tool.tagline, lang)}</p>
        </div>
      </section>

      {hasAction && (
        <section className="container-page py-6">
          <Reveal>
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-1.5 text-sm font-semibold text-white">{tr(actionLabel, lang)}</span>
              {!runs && <span className="text-xs text-navy/55">{tr(UI.check, lang)} · {tr(MODE_LABEL[tool.mode], lang)}</span>}
            </div>
            <Interactive tool={tool} lang={lang} />
          </Reveal>
        </section>
      )}

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_300px]">
        <div>
          <Block title={tr(UI.whatItDoes, lang) + ' · ' + section.short}>
            <p className="text-sm leading-relaxed text-navy/75">{tr(tool.full, lang)}</p>
            {tool.features.length > 0 && <div className="mt-4"><UL items={tool.features} lang={lang} mark="▸" /></div>}
          </Block>

          {tool.input.length > 0 && <Block title={tr(UI.inputReq, lang)}><UL items={tool.input} lang={lang} /></Block>}

          <Block title={tr(UI.howToUse, lang)}><OL items={tool.steps} lang={lang} /></Block>

          {tool.local && (
            <Block title={tr(UI.localOnly, lang)}>
              <p className="mb-3 text-sm text-navy/70"><span className="font-semibold">{tr(UI.requirements, lang)}:</span> {tool.local.needs.join(' · ')}</p>
              <pre className="overflow-x-auto rounded-2xl bg-navy p-4 text-xs leading-relaxed text-ice"><code>{tool.local.cmds.join('\n')}</code></pre>
              {tool.local.notes && <div className="mt-3"><UL items={tool.local.notes} lang={lang} mark="↳" /></div>}
            </Block>
          )}

          {tool.limits.length > 0 && <Block title={tr(UI.limits, lang)}><UL items={tool.limits} lang={lang} mark="!" /></Block>}
          {tool.output.length > 0 && <Block title={tr(UI.output, lang)}><UL items={tool.output} lang={lang} mark="→" /></Block>}
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-navy/45">{tr(UI.runsWhere, lang)}</dt><dd className="mt-0.5 font-medium text-navy">{tr(MODE_LABEL[tool.mode], lang)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-navy/45">{tr(UI.authors, lang)}</dt><dd className="mt-0.5 text-navy/80">{tool.authors}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-navy/45">{tr(UI.license, lang)}</dt><dd className="mt-0.5 text-navy/80">{tool.license}</dd></div>
            </dl>
            <div className="mt-4 space-y-2">
              {tool.repo && <a href={tool.repo} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-deep">GitHub ↗</a>}
              {tool.links?.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-navy/80 transition hover:border-blue/40 hover:text-blue">{l.label} ↗</a>)}
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="container-page pb-16">
          <h2 className="font-display text-xl font-semibold">{tr(UI.related, lang)}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((t) => <ToolCard key={t.id} tool={t} lang={lang} glyph={section.glyph} />)}
          </div>
        </section>
      )}
    </>
  );
}
