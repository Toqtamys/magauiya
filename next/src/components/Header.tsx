"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useScroll, useSpring } from "framer-motion";
import { Globe } from "lucide-react";
import { CHAPTERS, t } from "@/lib/catalog";
import { LOCALES, LOCALE_LABEL, useUi } from "@/lib/store";
import { useLocale } from "./Providers";
import { cn } from "@/lib/cn";

export function Header() {
  const tr = useTranslations();
  const locale = useLocale();
  const setLocale = useUi((s) => s.setLocale);
  const path = usePathname();
  const home = path === "/" ? "" : "/";
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <header className="sticky top-0 z-40 border-b border-red/20 bg-white/92 backdrop-blur-sm">
      <motion.div className="absolute inset-x-0 top-0 h-[3px] origin-left bg-red shadow-[0_0_12px_rgba(225,6,27,.7)]" style={{ scaleX: progress }} aria-hidden="true" />
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-8 px-4 md:px-6">
        <Link href="/" className="inline-flex items-center gap-2.5 font-[family-name:var(--font-display)] text-xl font-extrabold tracking-[0.28em]">
          <span className="diamond blink inline-block size-3 bg-red" aria-hidden="true" />
          BOPASI
        </Link>
        <nav className="ml-auto hidden gap-6 lg:flex" aria-label={tr("allTools")}>
          {CHAPTERS.map((c) => (
            <Link key={c.id} href={`${home}#${c.id}`} className="group relative text-[13px] font-semibold uppercase tracking-[0.12em] hover:text-red">
              {t(c.name, locale)}
              <span className="absolute -bottom-1.5 left-0 h-0.5 w-0 bg-red transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 lg:ml-0" role="group" aria-label="Language">
          <Globe className="mr-1 size-4 text-red" aria-hidden="true" />
          {LOCALES.map((l) => (
            <button key={l} onClick={() => setLocale(l)} aria-pressed={l === locale}
              className={cn("px-2.5 py-2 text-sm font-semibold tracking-wider transition-colors", l === locale ? "bg-red text-white" : "text-soft hover:text-ink")}>
              {LOCALE_LABEL[l]}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
