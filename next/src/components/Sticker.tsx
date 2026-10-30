"use client";
// Стикер с потёками, как наклейка на банке: число инструментов и «бесплатно»
import { useTranslations } from "next-intl";
import { TOOLS } from "@/lib/catalog";

export function Sticker({ className = "" }: { className?: string }) {
  const tr = useTranslations();
  return (
    <div className={`wobble pointer-events-none select-none ${className}`} aria-label={`${TOOLS.length} ${tr("tools")} · ${tr("stickerTop")}`}>
      <svg viewBox="0 0 260 300" className="size-full drop-shadow-[0_10px_0_rgba(10,18,64,.25)]" aria-hidden="true">
        <g className="drip" fill="#f29a1d">
          <path d="M60 190 q8 70 22 70 q14 0 16-70z" />
          <path d="M118 200 q6 90 20 90 q14 0 14-90z" />
          <path d="M180 185 q6 55 18 55 q12 0 14-55z" />
        </g>
        <path d="M130 12c58 0 110 40 116 98 6 56-30 102-86 112-34 6-58-2-92-14C26 196 8 160 14 112 22 52 72 12 130 12z" fill="#ffc533" />
      </svg>
      <div className="absolute inset-0 grid place-content-center pb-[22%] text-center text-ink">
        <p className="font-display text-[clamp(44px,5vw,72px)] font-bold leading-[0.85]">{TOOLS.length}</p>
        <p className="font-display text-[clamp(14px,1.4vw,21px)] font-bold uppercase leading-none">{tr("tools")}</p>
        <p className="mt-1.5 font-mono text-[clamp(10px,0.9vw,13px)] font-bold uppercase leading-tight">{tr("stickerTop")}<br />{tr("stickerBottom")}</p>
      </div>
    </div>
  );
}
