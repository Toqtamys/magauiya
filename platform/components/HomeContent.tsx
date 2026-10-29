import Link from 'next/link';
import { type Lang, UI, tr } from '@/lib/i18n';
import { SECTIONS } from '@/data/sections';
import { TOOLS, toolsInSection, featuredOf } from '@/data/tools';
import { HeroCanvas } from '@/components/HeroCanvas';
import { Reveal } from '@/components/Reveal';
import { Glyph } from '@/components/Glyph';
import { HowItWorks } from '@/components/HowItWorks';

export function HomeContent({ lang }: { lang: Lang }) {
  const browserTools = TOOLS.filter((t) => t.mode === 'browser').length;

  return (
    <>
      {/* HERO */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-grid pt-16">
        <div className="pointer-events-none absolute inset-0 bg-aurora opacity-90" />
        <HeroCanvas />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-white" />
        <div className="container-page relative">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue/20 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-deep shadow-sm">
              <span className="h-2 w-2 animate-drift rounded-full bg-blue" />
              {tr(UI.brandTag, lang)}
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 max-w-4xl font-display text-4xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
              <span className="text-gradient">{tr(UI.heroTitle, lang)}</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-navy/70 sm:text-lg">{tr(UI.heroLead, lang)}</p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={`/${lang}/tool/bopasi`} className="group inline-flex items-center gap-2 rounded-full bg-blue px-6 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-deep">
                {tr(UI.ctaStart, lang)}
                <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <Link href={`/${lang}/andrology`} className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-6 py-3.5 text-sm font-semibold text-navy transition hover:border-blue/40 hover:text-blue">
                {tr(UI.ctaAll, lang)}
              </Link>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-line/70 pt-6">
              {[[TOOLS.length + '+', tr(UI.toolsCount, lang)], [browserTools + '', tr(UI.inBrowser, lang)], [SECTIONS.length + '', tr(UI.sectionsTitle, lang)]].map(([n, l], i) => (
                <div key={i}>
                  <dt className="font-display text-3xl font-semibold text-navy sm:text-4xl">{n}</dt>
                  <dd className="mt-1 text-xs text-navy/55">{l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* SECTIONS */}
      <section className="container-page py-20">
        <Reveal><h2 className="font-display text-2xl font-semibold sm:text-3xl">{tr(UI.sectionsTitle, lang)}</h2></Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s, i) => {
            const feat = featuredOf(s.id);
            const count = toolsInSection(s.id).length;
            return (
              <Reveal key={s.id} delay={i * 60}>
                <Link href={`/${lang}/${s.id}`} className="card-hover group flex h-full flex-col rounded-3xl border border-line bg-white p-7 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-deep to-blue text-white shadow-lift">
                      <Glyph name={s.glyph} className="h-7 w-7" />
                    </span>
                    <span className="font-mono text-xs text-navy/40">{s.short}</span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-navy">{tr(s.title, lang)}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-navy/65">{tr(s.lead, lang)}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
                    <span className="text-navy/55">{count} {tr(UI.toolsCount, lang)}</span>
                    {feat && <span className="font-medium text-blue">{feat.name.split('·')[0].trim()}</span>}
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <HowItWorks lang={lang} />
    </>
  );
}
