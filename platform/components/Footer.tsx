import Link from 'next/link';
import { SECTIONS } from '@/data/sections';
import { UI, tr, type Lang } from '@/lib/i18n';

export function Footer({ lang }: { lang: Lang }) {
  return (
    <footer className="mt-24 border-t border-line bg-navy text-ice">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 font-display font-bold text-white">B</span>
            <span className="font-display text-lg font-semibold text-white">BOPASI Platform</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ice/70">{tr(UI.brandTag, lang)}</p>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold text-white/90">{tr(UI.sectionsTitle, lang)}</h4>
          <ul className="mt-4 space-y-2 text-sm text-ice/70">
            {SECTIONS.map((s) => (
              <li key={s.id}><Link href={`/${lang}/${s.id}`} className="transition hover:text-cyan">{tr(s.title, lang)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold text-white/90">GitHub</h4>
          <ul className="mt-4 space-y-2 text-sm text-ice/70">
            <li><a href="https://github.com/Toqtamys/magauiya" className="transition hover:text-cyan">Toqtamys/magauiya</a></li>
            <li><Link href={`/${lang}/about`} className="transition hover:text-cyan">{tr(UI.about, lang)}</Link></li>
            <li><a href="https://toqtamys.github.io/magauiya/results/" className="transition hover:text-cyan">Magauiya · results</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page py-6">
          <p className="text-xs leading-relaxed text-ice/55">{tr(UI.disclaimer, lang)}</p>
          <p className="mt-3 text-xs text-ice/40">© {new Date().getFullYear()} BOPASI Platform · Alikhan Magauiya · MIT</p>
        </div>
      </div>
    </footer>
  );
}
