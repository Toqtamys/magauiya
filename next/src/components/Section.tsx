"use client";
import { motion } from "framer-motion";
import { t, type Chapter } from "@/lib/catalog";
import { useLocale } from "./Providers";
import { ToolCard } from "./ToolCard";

export function Section({ chapter, index }: { chapter: Chapter; index: number }) {
  const locale = useLocale();
  return (
    <section id={chapter.id} className="mx-auto max-w-[1400px] px-4 pt-28 md:px-8">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
        <div className="flex items-start gap-4">
          <motion.span className="mt-2 grid size-12 flex-none place-items-center rounded-full bg-sun font-mono text-lg font-bold text-ink shadow-[0_0_22px_rgba(46,242,255,.7)]"
            initial={{ scale: 0, rotate: -90 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
            {String(index + 1).padStart(2, "0")}
          </motion.span>
          <motion.h2 className="neon font-display text-[clamp(48px,6.4vw,104px)] font-bold uppercase leading-[0.88]"
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 110, damping: 15 }}>
            {t(chapter.name, locale)}
          </motion.h2>
        </div>
        <p className="max-w-[40ch] text-lg text-white/85">{t(chapter.lead, locale)}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {chapter.tools.map((id, i) => <ToolCard key={id} id={id} index={i} wide={i === 0 && chapter.tools.length > 1} />)}
      </div>
    </section>
  );
}
