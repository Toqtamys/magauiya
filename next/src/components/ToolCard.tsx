"use client";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BASE, KIND, SHORT, t, toolById } from "@/lib/catalog";
import { useLocale } from "./Providers";
import { cn } from "@/lib/cn";

// превью: снимок настоящего интерфейса инструмента; для 3D и MolModa — схема белка
const NO_PREVIEW = new Set(["constructor", "molmoda"]);

export function ToolCard({ id, wide, index }: { id: string; wide?: boolean; index: number }) {
  const locale = useLocale();
  const tr = useTranslations();
  const tool = toolById(id)!;
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [5, -5]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-6, 6]), { stiffness: 200, damping: 20 });
  return (
    <motion.div
      className={cn("group [perspective:1000px]", wide && "md:col-span-2")}
      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: (index % 3) * 0.08, ease: [0.2, 0.7, 0.2, 1] }}>
      <motion.div style={{ rotateX: rx, rotateY: ry }}
        onPointerMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - b.left) / b.width); my.set((e.clientY - b.top) / b.height); }}
        onPointerLeave={() => { mx.set(0.5); my.set(0.5); }}
        className="chamfer-lg relative h-full bg-white shadow-[inset_0_0_0_1px_rgba(13,11,14,.14)] transition-shadow duration-300 group-hover:shadow-[inset_0_0_0_2px_var(--color-red)]">
        <Link href={`/t/${id}/`} className="flex h-full flex-col focus-visible:outline-3 focus-visible:outline-red">
          <span className="absolute right-0 top-0 z-10 size-8 bg-[linear-gradient(225deg,var(--color-red)_50%,transparent_50%)]" aria-hidden="true" />
          <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] bg-red opacity-0 shadow-[0_0_18px_4px_rgba(225,6,27,.35)] group-hover:animate-[sweep_1.1s_cubic-bezier(.4,0,.2,1)] group-hover:opacity-100" aria-hidden="true" />
          <div className={cn("relative overflow-hidden border-b border-ink/10 bg-tone", wide ? "aspect-[16/8]" : "aspect-[16/10]")}>
            {NO_PREVIEW.has(id) ? <MoleculeArt /> : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${BASE}/previews/${id}.jpg`} alt="" loading="lazy" className="size-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
            )}
            <div className="scan-lines pointer-events-none absolute inset-0" />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red">{tr("tagBrowser")} · {t(KIND[id], locale)}</p>
            <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold uppercase">{t(SHORT[id], locale)}</h3>
            <p className="flex-1 text-base text-soft">{t(tool.tagline, locale)}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.12em] group-hover:text-red">
              {tr("open")}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1.5" />
            </span>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

function MoleculeArt() {
  // схема молекулы: кольца и связи, медленно вращается
  const atoms = [[0, 0], [52, -30], [104, 0], [104, 60], [52, 90], [0, 60], [156, -30], [208, 0], [-52, -30], [156, 90]];
  const bonds = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [2, 6], [6, 7], [0, 8], [3, 9]];
  return (
    <svg viewBox="-120 -110 400 300" className="size-full" aria-hidden="true">
      <motion.g style={{ originX: "52px", originY: "30px" }} animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
        {bonds.map(([a, b], i) => <line key={i} x1={atoms[a][0]} y1={atoms[a][1]} x2={atoms[b][0]} y2={atoms[b][1]} stroke="#0d0b0e" strokeWidth="5" />)}
        {atoms.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 4 === 2 ? 16 : 11} fill={i % 4 === 2 ? "#e1061b" : i % 3 === 0 ? "#0d0b0e" : "#fff"} stroke="#0d0b0e" strokeWidth="4" />)}
      </motion.g>
      <circle cx="52" cy="30" r="150" fill="none" stroke="#e1061b" strokeDasharray="4 8" opacity=".5" />
    </svg>
  );
}
