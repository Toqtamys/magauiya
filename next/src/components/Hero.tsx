"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Microscope } from "lucide-react";
import { buttonVariants } from "./ui/button";
import { CHAPTERS, TOOLS } from "@/lib/catalog";

const CellScene = dynamic(() => import("./CellScene"), { ssr: false, loading: () => <div className="size-full" /> });

const rise = { hidden: { opacity: 0, y: 28 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.8, ease: [0.2, 0.7, 0.2, 1] as const } }) };

export function Hero() {
  const tr = useTranslations();
  const words = tr("title").split(" ");
  return (
    <header id="top" className="mx-auto grid min-h-[calc(100svh-64px)] max-w-[1320px] items-center gap-10 px-4 pb-16 pt-6 md:px-6 lg:grid-cols-[1fr_1.05fr]">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(42px,5.2vw,84px)] font-extrabold uppercase leading-[0.95] tracking-tight">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
              <motion.span className="inline-block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ delay: 0.1 + i * 0.09, duration: 1, ease: [0.2, 0.8, 0.15, 1] }}>
                {w}&nbsp;
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.div className="mt-7 h-1.5 w-28 origin-left bg-red" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.5, duration: 1.2 }} />
        <motion.p className="mt-7 max-w-[34ch] text-lg leading-relaxed md:text-xl" variants={rise} initial="hidden" animate="show" custom={3}>{tr("lead")}</motion.p>
        <motion.div className="mt-9 flex flex-wrap gap-3" variants={rise} initial="hidden" animate="show" custom={4}>
          <Link href="/t/bopasi/" className={buttonVariants()}><Microscope className="size-4" />{tr("cta")}</Link>
          <a href="#andrology" className={buttonVariants({ variant: "outline" })}>{tr("allTools")}<ArrowRight className="size-4" /></a>
        </motion.div>
        <motion.dl className="mt-12 flex flex-wrap gap-10" variants={rise} initial="hidden" animate="show" custom={5}>
          {[[TOOLS.length, tr("factBrowser")], [CHAPTERS.length, tr("factSections")], [0, tr("factUploads")]].map(([n, l]) => (
            <div key={String(l)}>
              <dt className="font-[family-name:var(--font-display)] text-5xl font-extrabold tabular-nums text-red">{n}</dt>
              <dd className="mt-1.5 text-xs uppercase tracking-[0.12em] text-soft">{l}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
      <motion.div className="relative order-first aspect-square w-full max-h-[calc(100svh-120px)] lg:order-none"
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}>
        <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(225,6,27,.35)]" />
        <span className="absolute -left-px -top-px size-7 border-l-[3px] border-t-[3px] border-red" />
        <span className="absolute -bottom-px -right-px size-7 border-b-[3px] border-r-[3px] border-red" />
        <CellScene />
      </motion.div>
    </header>
  );
}
