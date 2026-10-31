"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { ORDER, SHORT, KIND, chapterOf, t, toolById, type L } from "@/lib/catalog";
import { useLocale } from "./Providers";
import { ToolMount } from "./ToolMount";
import dynamic from "next/dynamic";

// открытые проекты с GitHub — React-компоненты, только в браузере
const Loading = () => <p className="animate-pulse py-10 font-mono text-sm uppercase tracking-wider text-[#0a1240]">…</p>;
const REACT_TOOLS: Record<string, React.ComponentType> = {
  niivue: dynamic(() => import("./tools/NiivueTool"), { ssr: false, loading: Loading }),
  molstar: dynamic(() => import("./tools/MolstarTool"), { ssr: false, loading: Loading }),
  seqviz: dynamic(() => import("./tools/SeqvizTool"), { ssr: false, loading: Loading }),
};
import { buttonVariants } from "./ui/button";

export function ToolPage({ id }: { id: string }) {
  const tr = useTranslations();
  const locale = useLocale();
  const tool = toolById(id)!;
  const ch = chapterOf(id)!;
  const i = ORDER.indexOf(id), prev = ORDER[i - 1], next = ORDER[i + 1];
  const list = (title: string, items: L[] | undefined, ordered = false) => !items?.length ? null : (
    <section className="border-t border-white/20 pt-6">
      <h3 className="mb-5 font-mono text-xs font-semibold uppercase tracking-x text-white/55">{title}</h3>
      {ordered ? (
        <ol className="space-y-3">{items.map((x, k) => (
          <li key={k} className="flex gap-3"><span className="w-7 flex-none pt-0.5 font-mono text-sm font-semibold text-white/50">{String(k + 1).padStart(2, "0")}</span><span className="text-white/85">{t(x, locale)}</span></li>
        ))}</ol>
      ) : (
        <ul className="space-y-2.5">{items.map((x, k) => (
          <li key={k} className="flex gap-3"><span className="mt-[11px] h-px w-3 flex-none bg-white/60" /><span className="text-white/85">{t(x, locale)}</span></li>
        ))}</ul>
      )}
    </section>
  );
  return (
    <main className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 md:px-12">
      <Link href={`/#${ch.id}`} className={buttonVariants({ variant: "dark", size: "sm" })}><ArrowLeft className="size-4" />{tr("back")}</Link>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 110, damping: 16 }}>
        <p className="mt-10 font-mono text-xs font-semibold uppercase tracking-x text-white/55">{t(ch.name, locale)} · {t(KIND[id], locale)}</p>
        <h1 className="mt-3 font-display text-[clamp(40px,6vw,92px)] font-bold uppercase leading-[0.92]">{t(tool.name, locale)}</h1>
        <p className="mt-5 max-w-[780px] text-lg text-white/75">{t(tool.tagline, locale)}</p>
        <p className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-x text-white/60"><ShieldCheck className="size-4" strokeWidth={1.5} />{tr("localNote")}</p>
        {id === "scd" && <Link href="/scd-method/" className={buttonVariants({ variant: "outline", size: "sm", className: "ml-0 mt-6 flex w-fit md:ml-6 md:inline-flex" })}>{locale === "en" ? "How DFI is calculated" : locale === "kk" ? "DFI қалай есептеледі" : "Как считается DFI"}<ArrowRight className="size-4" /></Link>}
      </motion.div>
      <motion.div data-tool-panel className="mt-10 rounded-[4px] bg-white p-4 text-[#0a1240] md:p-8"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: "spring", stiffness: 100, damping: 18 }}>
        {REACT_TOOLS[id] ? (() => { const C = REACT_TOOLS[id]; return <C />; })()
          : <ToolMount id={id} locale={locale} labels={{ loading: tr("toolLoading"), failed: tr("toolFailed") }} />}
      </motion.div>
      <div className="mt-16 grid gap-x-12 gap-y-12 md:grid-cols-2">
        {list(tr("howToUse"), tool.steps, true)}
        {list(tr("input"), tool.input)}
        {list(tr("output"), tool.output)}
        {list(tr("limits"), tool.limits)}
        <section className="border-t border-white/20 pt-6 md:col-span-2">
          <h3 className="mb-4 font-mono text-xs font-semibold uppercase tracking-x text-white/55">{tr("whatItDoes")}</h3>
          <p className="max-w-[900px] text-lg leading-relaxed text-white/85">{t(tool.full, locale)}</p>
          {tool.features?.length ? <ul className="mt-4 space-y-2">{tool.features.map((x, k) => <li key={k} className="flex gap-3"><span className="mt-[11px] h-px w-3 flex-none bg-white/60" /><span className="text-white/85">{t(x, locale)}</span></li>)}</ul> : null}
          {tool.authors && <p className="mt-6 font-mono text-xs uppercase tracking-x text-white/50">{tr("credits")}: {tool.authors}{tool.license ? ` · ${tool.license}` : ""}</p>}
        </section>
      </div>
      <nav className="mt-16 flex justify-between gap-4 border-t border-white/15 pt-8">
        {prev ? <Link href={`/t/${prev}/`} className={buttonVariants({ variant: "outline", size: "sm" })}><ArrowLeft className="size-4" />{t(SHORT[prev], locale)}</Link> : <span />}
        {next ? <Link href={`/t/${next}/`} className={buttonVariants({ variant: "primary", size: "sm" })}>{t(SHORT[next], locale)}<ArrowRight className="size-4" /></Link> : <span />}
      </nav>
      <p className="mt-8 max-w-[820px] text-sm text-white/50">{tr("disclaimer")}</p>
    </main>
  );
}
