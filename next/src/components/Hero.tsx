"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowDown } from "lucide-react";
import { buttonVariants } from "./ui/button";
import { Sticker } from "./Sticker";

const CellScene = dynamic(() => import("./CellScene"), { ssr: false, loading: () => <div className="size-full" /> });   // 3D только в браузере

export function Hero() {
  const tr = useTranslations();
  const words = tr("title").split(" ");
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef);   // 3D останавливается, когда сцена за экраном
  const { scrollY } = useScroll();
  const lift = useTransform(scrollY, [0, 600], [0, -80]);
  const spin = useTransform(scrollY, [0, 600], [0, 25]);
  return (
    <header id="top" className="relative mx-auto grid min-h-[calc(100svh-124px)] max-w-[1400px] items-center gap-6 overflow-hidden px-4 pb-20 pt-8 md:px-8 lg:grid-cols-[1.05fr_1fr]">
      <div className="relative z-10">
        <h1 className="font-display text-[clamp(56px,8.4vw,150px)] font-bold uppercase leading-[0.86] tracking-tight">
          {words.map((w, i) => (
            <span key={i} className="block overflow-hidden">
              <motion.span className="inline-block" initial={{ y: "110%", rotate: 6 }} animate={{ y: 0, rotate: 0 }}
                transition={{ delay: 0.1 + i * 0.12, type: "spring", stiffness: 120, damping: 14 }}>
                {w}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p className="mt-8 max-w-[34ch] text-lg leading-relaxed text-white/90 md:text-xl"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.7 }}>{tr("lead")}</motion.p>
        <motion.div className="mt-10 flex flex-wrap gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }}>
          <Link href="/t/bopasi/" className={buttonVariants()}>{tr("cta")}</Link>
          <a href="#andrology" className={buttonVariants({ variant: "outline" })}>{tr("allTools")}<ArrowDown className="size-5" /></a>
        </motion.div>
      </div>
      <motion.div ref={stageRef} style={{ y: lift }} className="relative order-first aspect-square w-full lg:order-none"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}>
        <div className="spin-slow absolute inset-[6%] rounded-full border-2 border-dashed border-white/25" aria-hidden="true" />
        <CellScene active={inView} />
        <motion.div style={{ rotate: spin }} className="absolute -top-2 left-0 w-[42%] max-w-[260px] md:left-[-4%] md:top-[2%]">
          <div className="relative aspect-[26/30]"><Sticker className="absolute inset-0" /></div>
        </motion.div>
      </motion.div>
    </header>
  );
}
