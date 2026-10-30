"use client";
// Тёмная полоса сверху с бегущим объявлением, как на витрине магазина
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function TopBar() {
  const tr = useTranslations();
  const items = [tr("announce"), tr("announce2"), tr("announce3")];
  const row = (k: string) => (
    <div key={k} className="marquee flex flex-none gap-16 pr-16">
      {items.map((x) => <span key={x} className="whitespace-nowrap">{x} <span className="text-sun">✦</span></span>)}
    </div>
  );
  return (
    <div className="relative flex h-11 items-center bg-ink font-mono text-sm tracking-wide text-white md:text-base">
      <ChevronLeft className="absolute left-3 z-10 size-4 opacity-70" aria-hidden="true" />
      <div className="mx-10 flex overflow-hidden" aria-label={items.join(" · ")}>{row("a")}{row("b")}</div>
      <ChevronRight className="absolute right-3 z-10 size-4 opacity-70" aria-hidden="true" />
    </div>
  );
}
