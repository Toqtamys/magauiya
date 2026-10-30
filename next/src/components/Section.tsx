"use client";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { t, type Chapter } from "@/lib/catalog";
import { useLocale } from "./Providers";
import { ToolCard } from "./ToolCard";
import { buttonVariants } from "./ui/button";

const SceneBg = dynamic(() => import("./SceneBg"), { ssr: false });
const SCENE: Record<string, number> = { andrology: 0, embryology: 2, reproduction: 3, histology: 4, oncology: 5, science: 7 };

// Раздел как страница миссии: кадр на весь экран, подпись снизу слева, ниже — инструменты
export function Section({ chapter, index }: { chapter: Chapter; index: number }) {
  const locale = useLocale();
  const tr = useTranslations();
  const n = chapter.tools.length;
  const word = n === 1 ? "tools1" : n < 5 ? "tools2" : "tools";
  return (
    <section id={chapter.id} className="relative mt-24">
      <div className="relative flex h-[92svh] min-h-[560px] items-end overflow-hidden">
        <SceneBg scene={SCENE[chapter.id] ?? index} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
        <motion.div className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-[10vh] md:px-12"
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}>
          <p className="font-mono text-xs font-semibold uppercase tracking-x text-white/60">{tr("section")} {String(index + 1).padStart(2, "0")} · {n} {tr(word)}</p>
          <h2 className="mt-3 font-display text-[clamp(44px,7.4vw,112px)] font-bold uppercase leading-[0.9]">{t(chapter.name, locale)}</h2>
          <p className="mt-5 max-w-[46ch] text-base text-white/75 md:text-lg">{t(chapter.lead, locale)}</p>
          <a href={`#${chapter.id}-tools`} className={buttonVariants({ className: "mt-8" })}>{tr("explore")}</a>
        </motion.div>
      </div>
      <div id={`${chapter.id}-tools`} className="mx-auto grid max-w-[1400px] scroll-mt-24 gap-px bg-white/10 px-0 md:grid-cols-2 lg:grid-cols-3">
        {chapter.tools.map((id, i) => <ToolCard key={id} id={id} index={i} />)}
      </div>
    </section>
  );
}
