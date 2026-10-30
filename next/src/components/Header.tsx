"use client";
// Шапка как у сайта космической компании: прозрачная, прячется при прокрутке вниз и возвращается при прокрутке вверх
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { CHAPTERS, t } from "@/lib/catalog";
import { LOCALES, LOCALE_LABEL, useUi } from "@/lib/store";
import { useLocale } from "./Providers";
import { Wordmark } from "./Wordmark";
import { cn } from "@/lib/cn";

export function Header() {
  const tr = useTranslations();
  const locale = useLocale();
  const setLocale = useUi((s) => s.setLocale);
  const path = usePathname();
  const home = path === "/" ? "" : "/";
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    let y0 = scrollY;
    const on = () => { const y = scrollY; setHidden(y > 120 && y > y0); setSolid(y > 40); y0 = y; };
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  const link = "relative font-mono text-[12px] font-semibold uppercase tracking-x text-white/90 transition-colors hover:text-white after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-white after:transition-transform hover:after:scale-x-100";
  return (
    <header className={cn("sticky top-0 z-40 transition-[transform,background-color] duration-500", hidden && !open && "-translate-y-full", solid || open ? "bg-black/85 backdrop-blur-md" : "bg-transparent")}>
      <div className="mx-auto flex h-20 max-w-[1400px] items-center gap-10 px-5 md:px-12">
        <Link href="/" aria-label="BOPASI" className="flex-none"><Wordmark /></Link>
        <nav className="hidden flex-1 flex-wrap gap-x-7 gap-y-2 xl:flex" aria-label={tr("allTools")}>
          {CHAPTERS.map((c) => <Link key={c.id} href={`${home}#${c.id}`} className={link}>{t(c.name, locale)}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center" role="group" aria-label="Language">
            {LOCALES.map((l) => (
              <button key={l} onClick={() => setLocale(l)} aria-pressed={l === locale}
                className={cn("px-2.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-x transition-colors", l === locale ? "text-white" : "text-white/45 hover:text-white")}>
                {LOCALE_LABEL[l]}
              </button>
            ))}
          </div>
          <button className="grid size-10 place-items-center text-white xl:hidden" onClick={() => setOpen((v) => !v)}
            aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? tr("close") : tr("menu")}>
            {open ? <X className="size-6" strokeWidth={1.5} /> : <Menu className="size-6" strokeWidth={1.5} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav id="mobile-nav" className="overflow-hidden xl:hidden"
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}>
            <ul className="mx-auto max-w-[1400px] px-5 pb-6 md:px-12">
              {CHAPTERS.map((c, i) => (
                <motion.li key={c.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                  <Link href={`${home}#${c.id}`} onClick={() => setOpen(false)}
                    className="flex items-center justify-between border-b border-white/15 py-4 font-display text-xl font-bold uppercase tracking-wide">
                    {t(c.name, locale)}<span className="font-mono text-xs text-white/50">{String(i + 1).padStart(2, "0")}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
