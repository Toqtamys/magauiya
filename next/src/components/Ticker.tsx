"use client";
import { ORDER, SHORT, t } from "@/lib/catalog";
import { useLocale } from "./Providers";

export function Ticker() {
  const locale = useLocale();
  const row = (k: string) => (
    <div key={k} className="ticker-row flex flex-none gap-12 pr-12">
      {ORDER.map((id) => (
        <span key={id} className="inline-flex items-center gap-12 whitespace-nowrap font-[family-name:var(--font-display)] text-[15px] font-bold uppercase tracking-[0.14em]">
          {t(SHORT[id], locale)}<span className="diamond inline-block size-2 bg-white" />
        </span>
      ))}
    </div>
  );
  return <div className="-skew-y-[1.2deg] flex overflow-hidden bg-red py-3.5 text-white" aria-hidden="true">{row("a")}{row("b")}</div>;
}
