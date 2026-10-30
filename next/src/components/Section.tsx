"use client";
import { motion } from "framer-motion";
import { t, type Chapter } from "@/lib/catalog";
import { useLocale } from "./Providers";
import { ToolCard } from "./ToolCard";

export function Section({ chapter, index }: { chapter: Chapter; index: number }) {
  const locale = useLocale();
  return (
    <section id={chapter.id} className="mx-auto max-w-[1320px] scroll-mt-16 px-4 pt-28 md:px-6">
      <div className="relative mb-8 flex flex-wrap items-end gap-x-6 gap-y-2 border-b-2 border-ink pb-4">
        <motion.span className="absolute -bottom-0.5 left-0 h-0.5 bg-red" initial={{ width: 0 }} whileInView={{ width: 96 }} viewport={{ once: true }} transition={{ duration: 0.9 }} />
        <span className="self-start font-[family-name:var(--font-display)] text-sm font-extrabold tracking-widest text-red">{String(index + 1).padStart(2, "0")}</span>
        <motion.h2 className="flex-1 font-[family-name:var(--font-display)] text-[clamp(34px,3.6vw,52px)] font-extrabold uppercase leading-none"
          initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          {t(chapter.name, locale)}
        </motion.h2>
        <p className="max-w-[46ch] text-soft">{t(chapter.lead, locale)}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {chapter.tools.map((id, i) => <ToolCard key={id} id={id} index={i} wide={i === 0 && chapter.tools.length > 1} />)}
      </div>
    </section>
  );
}
