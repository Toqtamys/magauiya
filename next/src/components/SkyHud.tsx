"use client";
// Счётчик инструментов: живёт на всём сайте, в углу экрана — тонкая рамка, как приборная подпись
import { useTranslations } from "next-intl";
import { TOOLS } from "@/lib/catalog";

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "tools1" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "tools2" : "tools");

export function SkyHud() {
  const tr = useTranslations();
  const n = TOOLS.length;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-30 hidden items-center gap-3 border border-white/25 bg-black/60 px-4 py-2.5 backdrop-blur-sm md:bottom-6 md:right-6 md:flex" aria-hidden="true">
      <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70" /><span className="relative inline-flex size-2 rounded-full bg-white" /></span>
      <span className="font-mono text-[11px] font-semibold uppercase tracking-x text-white"><b className="text-sm">{n}</b> {tr(plural(n))} · {tr("stickerTop")}</span>
    </div>
  );
}
