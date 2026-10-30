"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
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
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const [open, setOpen] = useState(false);
  const link = "font-mono text-[15px] font-semibold uppercase tracking-wide text-white/90 transition-colors hover:text-sun";
  return (
    <header className="sticky top-0 z-40 border-b border-sun/20 bg-blue-deep/70 backdrop-blur-md">
      <div className="mx-auto grid h-20 max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-4 md:px-8">
        <nav className="hidden gap-7 lg:flex" aria-label={tr("allTools")}>
          {CHAPTERS.slice(0, 3).map((c) => <Link key={c.id} href={`${home}#${c.id}`} className={link}>{t(c.name, locale)}</Link>)}
        </nav>
        <Link href="/" className="col-start-1 justify-self-start lg:col-start-2 lg:justify-self-center" aria-label="BOPASI"><Wordmark /></Link>
        <div className="col-start-3 flex items-center justify-end gap-6">
          <nav className="hidden gap-7 xl:flex" aria-label={tr("allTools")}>
            {CHAPTERS.slice(3).map((c) => <Link key={c.id} href={`${home}#${c.id}`} className={link}>{t(c.name, locale)}</Link>)}
          </nav>
          <div className="flex items-center rounded-full bg-blue-deep/60 p-1" role="group" aria-label="Language">
            {LOCALES.map((l) => (
              <button key={l} onClick={() => setLocale(l)} aria-pressed={l === locale}
                className={cn("rounded-full px-3 py-1.5 font-mono text-sm font-semibold transition-colors", l === locale ? "bg-sun text-ink" : "text-white/80 hover:text-white")}>
                {LOCALE_LABEL[l]}
              </button>
            ))}
          </div>
          <button className="grid size-11 place-items-center rounded-full bg-sun text-ink xl:hidden" onClick={() => setOpen((v) => !v)}
            aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? tr("close") : tr("menu")}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <motion.div className="h-0.5 origin-left bg-gradient-to-r from-sun to-neon shadow-[0_0_12px_#2ef2ff]" style={{ scaleX: progress }} aria-hidden="true" />
      <AnimatePresence>
        {open && (
          <motion.nav id="mobile-nav" className="overflow-hidden bg-blue-deep xl:hidden"
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}>
            <ul className="mx-auto max-w-[1400px] px-4 py-4 md:px-8">
              {CHAPTERS.map((c, i) => (
                <motion.li key={c.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                  <Link href={`${home}#${c.id}`} onClick={() => setOpen(false)}
                    className="flex items-center justify-between border-b border-white/15 py-4 font-display text-2xl font-bold uppercase hover:text-sun">
                    {t(c.name, locale)}<span className="font-mono text-sm text-sun">{String(i + 1).padStart(2, "0")}</span>
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
