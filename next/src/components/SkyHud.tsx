"use client";
// Счётчик инструментов: живёт на всём сайте, в углу экрана, как прибор в кабине
import { useTranslations } from "next-intl";
import { TOOLS } from "@/lib/catalog";

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "tools1" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "tools2" : "tools");

export function SkyHud() {
  const tr = useTranslations();
  const n = TOOLS.length;
  return (
    <div className="hud pointer-events-none fixed bottom-4 left-4 z-30 flex items-center gap-3 rounded-full border border-sun/40 bg-blue-deep/75 p-1.5 md:py-2 md:pl-2 md:pr-5 backdrop-blur-md md:bottom-6 md:left-6" aria-hidden="true">
      <span className="hud-orb grid size-11 place-items-center rounded-full bg-sun font-display text-xl font-bold text-ink">{n}</span>
      <span className="hidden font-mono text-xs font-semibold uppercase leading-tight tracking-wider text-white md:inline md:text-sm">
        {tr(plural(n))}<br /><span className="text-sun">{tr("stickerTop")}</span>
      </span>
    </div>
  );
}
