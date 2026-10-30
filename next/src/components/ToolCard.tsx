"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BASE, KIND, ORDER, SHORT, t, toolById } from "@/lib/catalog";
import { useLocale } from "./Providers";
import { focusStar } from "@/lib/sky";

// Плитка инструмента: снимок в ч/б, при наведении — цвет; подпись и стрелка без украшений
export function ToolCard({ id, index }: { id: string; wide?: boolean; index: number }) {
  const locale = useLocale();
  const tr = useTranslations();
  const tool = toolById(id)!;
  const preview = tool.preview ?? `${BASE}/previews/${id}.jpg`;
  return (
    <motion.div className="bg-black" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, delay: (index % 3) * 0.08 }}
      onPointerEnter={() => focusStar(ORDER.indexOf(id))} onPointerLeave={() => focusStar(-1)}>
      <Link href={`/t/${id}/`} className="group flex h-full flex-col p-5 focus-visible:outline-2 focus-visible:outline-white md:p-7">
        <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" loading="lazy" className="size-full object-cover object-top opacity-80 grayscale transition-[filter,opacity,transform] duration-700 group-hover:scale-[1.03] group-hover:opacity-100 group-hover:grayscale-0" />
        </div>
        <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-x text-white/50">{tr("tagBrowser")} · {t(KIND[id], locale)}</p>
        <h3 className="mt-2 font-display text-2xl font-bold uppercase leading-tight tracking-wide">{t(SHORT[id], locale)}</h3>
        <p className="mt-3 flex-1 text-[15px] leading-relaxed text-white/65">{t(tool.tagline, locale)}</p>
        <span className="mt-6 inline-flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-x text-white">
          {tr("open")}<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-2" />
        </span>
      </Link>
    </motion.div>
  );
}
