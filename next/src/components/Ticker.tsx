"use client";
import { ORDER, SHORT, t } from "@/lib/catalog";
import { useLocale } from "./Providers";

// солнечная лента с названиями инструментов
export function Ticker() {
  const locale = useLocale();
  const row = (k: string) => (
    <div key={k} className="marquee flex flex-none gap-10 pr-10">
      {ORDER.map((id) => (
        <span key={id} className="inline-flex items-center gap-10 whitespace-nowrap font-display text-2xl font-bold uppercase md:text-3xl">
          {t(SHORT[id], locale)}<span className="text-blue">●</span>
        </span>
      ))}
    </div>
  );
  return <div className="-rotate-2 scale-105 flex overflow-hidden bg-sun py-4 text-ink" aria-hidden="true">{row("a")}{row("b")}</div>;
}
