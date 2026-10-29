'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SECTIONS } from '@/data/sections';
import { LANGS, LANG_LABEL, UI, tr, type Lang } from '@/lib/i18n';
import { useLang } from './lang';

/** меняет первый сегмент пути (язык), сохраняя остальное */
function swapLang(path: string, lang: Lang) {
  const parts = path.split('/').filter(Boolean);
  // basePath уже отрезан Next при usePathname
  if (parts.length === 0) return `/${lang}`;
  if ((LANGS as readonly string[]).includes(parts[0])) parts[0] = lang;
  else parts.unshift(lang);
  return '/' + parts.join('/');
}

export function Nav() {
  const lang = useLang();
  const path = usePathname() || `/${lang}`;
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setOpen(false), [path]);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all ${solid ? 'glass border-b border-line shadow-sm' : ''}`}>
      <nav className="container-page flex h-16 items-center gap-4">
        <Link href={`/${lang}`} className="group flex items-center gap-2.5 shrink-0" aria-label="BOPASI">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-deep to-blue text-white font-display font-bold shadow-lift">B</span>
          <span className="font-display text-lg font-semibold tracking-tight">BOPASI</span>
        </Link>

        <div className="mx-auto hidden items-center gap-0.5 lg:flex">
          {SECTIONS.map((s) => {
            const href = `/${lang}/${s.id}`;
            const active = path.startsWith(href);
            return (
              <Link key={s.id} href={href}
                className={`rounded-full px-3 py-2 text-[13px] font-medium transition-colors ${active ? 'bg-blue/10 text-blue' : 'text-navy/70 hover:bg-mist hover:text-navy'}`}>
                {tr(s.title, lang)}
              </Link>
            );
          })}
          <Link href={`/${lang}/about`} className={`rounded-full px-3 py-2 text-[13px] font-medium transition-colors ${path.endsWith('/about') ? 'bg-blue/10 text-blue' : 'text-navy/70 hover:bg-mist hover:text-navy'}`}>
            {tr(UI.about, lang)}
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-full border border-line bg-white/70 p-0.5 lg:ml-0">
          {LANGS.map((l) => (
            <Link key={l} href={swapLang(path, l)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${l === lang ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'}`}>
              {LANG_LABEL[l]}
            </Link>
          ))}
        </div>

        <button onClick={() => setOpen((v) => !v)} className="ml-1 grid h-10 w-10 place-items-center rounded-xl border border-line lg:hidden" aria-label="menu" aria-expanded={open}>
          <span className="relative block h-3.5 w-5">
            <span className={`absolute inset-x-0 top-0 h-0.5 rounded bg-navy transition ${open ? 'top-1.5 rotate-45' : ''}`} />
            <span className={`absolute inset-x-0 top-1.5 h-0.5 rounded bg-navy transition ${open ? 'opacity-0' : ''}`} />
            <span className={`absolute inset-x-0 bottom-0 h-0.5 rounded bg-navy transition ${open ? 'bottom-1.5 -rotate-45' : ''}`} />
          </span>
        </button>
      </nav>

      {open && (
        <div className="glass border-t border-line lg:hidden">
          <div className="container-page grid gap-1 py-3">
            {SECTIONS.map((s) => (
              <Link key={s.id} href={`/${lang}/${s.id}`} className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy/80 hover:bg-mist">{tr(s.title, lang)}</Link>
            ))}
            <Link href={`/${lang}/about`} className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy/80 hover:bg-mist">{tr(UI.about, lang)}</Link>
          </div>
        </div>
      )}
    </header>
  );
}
