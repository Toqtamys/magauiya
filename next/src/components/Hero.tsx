"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { buttonVariants } from "./ui/button";
import { TOOLS } from "@/lib/catalog";

const Planet = dynamic(() => import("./Planet"), { ssr: false });

// Первый экран: планета-яйцеклетка внизу, слово ЛАБ и две кнопки, как на странице миссии
export function Hero() {
  const tr = useTranslations();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 900], [0, 220]);
  const fade = useTransform(scrollY, [0, 600], [1, 0]);
  const n = TOOLS.length;
  const word = n % 10 === 1 && n % 100 !== 11 ? "tools1" : "tools";
  return (
    <header id="top" className="relative -mt-20 flex h-[100svh] min-h-[620px] items-end overflow-hidden">
      <motion.div style={{ y }} className="absolute inset-0"><Planet /></motion.div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
      <motion.div style={{ opacity: fade }} className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-[14vh] md:px-12">
        <motion.p className="font-mono text-xs font-semibold uppercase tracking-x text-white/70 md:text-sm"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}>
          BOPASI · {n} {tr(word)} · {tr("stickerTop")}
        </motion.p>
        <motion.h1 className="mt-4 font-display text-[clamp(88px,16vw,240px)] font-bold uppercase leading-[0.82] tracking-[-0.01em]"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}>
          {tr("title")}
        </motion.h1>
        <motion.p className="mt-6 max-w-[52ch] text-base leading-relaxed text-white/80 md:text-lg"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.9 }}>{tr("lead")}</motion.p>
        <motion.div className="mt-9 flex flex-wrap gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.9 }}>
          <Link href="/t/bopasi/" className={buttonVariants()}>{tr("cta")}</Link>
          <a href="#andrology" className={buttonVariants({ variant: "outline" })}>{tr("allTools")}</a>
        </motion.div>
      </motion.div>
      <a href="#drop" className="scroll-cue absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/70" aria-label={tr("scroll")}><ChevronDown className="size-7" /></a>
    </header>
  );
}
