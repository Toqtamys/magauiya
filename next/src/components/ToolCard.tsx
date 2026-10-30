"use client";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BASE, KIND, ORDER, SHORT, t, toolById } from "@/lib/catalog";
import { useLocale } from "./Providers";
import { cn } from "@/lib/cn";
import { focusStar } from "@/lib/sky";

export function ToolCard({ id, wide, index }: { id: string; wide?: boolean; index: number }) {
  const locale = useLocale();
  const tr = useTranslations();
  const tool = toolById(id)!;
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 220, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-7, 7]), { stiffness: 220, damping: 18 });
  const preview = tool.preview ?? `${BASE}/previews/${id}.jpg`;
  return (
    <motion.div className={cn("group [perspective:1100px]", wide && "md:col-span-2")}
      initial={{ opacity: 0, y: 50, rotate: index % 2 ? 2 : -2 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 90, damping: 16, delay: (index % 3) * 0.07 }}>
      <motion.div style={{ rotateX: rx, rotateY: ry }}
        onPointerMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - b.left) / b.width); my.set((e.clientY - b.top) / b.height); }}
        onPointerEnter={() => focusStar(ORDER.indexOf(id))}
        onPointerLeave={() => { mx.set(0.5); my.set(0.5); focusStar(-1); }}
        className="glass h-full rounded-[32px] border border-sun/25 p-3 transition-[box-shadow,border-color] duration-300 group-hover:border-neon group-hover:shadow-[0_0_0_1px_#ff2bd6,0_0_40px_rgba(255,43,214,.45)]">
        <Link href={`/t/${id}/`} className="flex h-full flex-col rounded-[24px] focus-visible:outline-3 focus-visible:outline-sun">
          <div className={cn("relative overflow-hidden rounded-[24px] bg-white", wide ? "aspect-[16/8]" : "aspect-[16/10]")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" loading="lazy" className="size-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute right-3 top-3 grid size-12 place-items-center rounded-full bg-sun text-ink shadow-[0_0_18px_rgba(46,242,255,.8)] transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110">
              <ArrowUpRight className="size-6" />
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-5">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-sun">{tool.github ? "GitHub · " : ""}{tr("tagBrowser")} · {t(KIND[id], locale)}</p>
            <h3 className="font-display text-3xl font-bold uppercase leading-none transition-colors group-hover:text-sun">{t(SHORT[id], locale)}</h3>
            <p className="flex-1 text-white/85">{t(tool.tagline, locale)}</p>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
