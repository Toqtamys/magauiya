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
const Loading = () => <p className="animate-pulse py-10 font-mono text-sm uppercase tracking-wider text-blue">…</p>;
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
    <section className="rounded-[32px] bg-blue-mid p-7">
      <h3 className="mb-5 font-display text-3xl font-bold uppercase">{title}</h3>
      {ordered ? (
        <ol className="space-y-3">{items.map((x, k) => (
          <li key={k} className="flex gap-3"><span className="grid size-8 flex-none place-items-center rounded-full bg-sun font-mono text-sm font-bold text-ink">{k + 1}</span><span className="pt-1">{t(x, locale)}</span></li>
        ))}</ol>
      ) : (
        <ul className="space-y-2.5">{items.map((x, k) => (
          <li key={k} className="flex gap-3"><span className="mt-2.5 size-2.5 flex-none rounded-full bg-sun" /><span>{t(x, locale)}</span></li>
        ))}</ul>
      )}
    </section>
  );
  return (
    <main className="mx-auto max-w-[1300px] px-4 pb-24 pt-8 md:px-8">
      <Link href={`/#${ch.id}`} className={buttonVariants({ variant: "dark", size: "sm" })}><ArrowLeft className="size-4" />{tr("back")}</Link>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 110, damping: 16 }}>
        <p className="mt-8 font-mono text-sm font-semibold uppercase tracking-wider text-sun">{t(ch.name, locale)} · {t(KIND[id], locale)}</p>
        <h1 className="mt-3 font-display text-[clamp(44px,6vw,96px)] font-bold uppercase leading-[0.9]">{t(tool.name, locale)}</h1>
        <p className="mt-5 max-w-[780px] text-xl text-white/90">{t(tool.tagline, locale)}</p>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-deep px-5 py-2.5 text-sm"><ShieldCheck className="size-4 text-sun" />{tr("localNote")}</p>
      </motion.div>
      <motion.div data-tool-panel className="mt-8 rounded-[36px] bg-white p-4 text-ink shadow-[0_24px_60px_-30px_rgba(10,18,64,.8)] md:p-8"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: "spring", stiffness: 100, damping: 18 }}>
        {REACT_TOOLS[id] ? (() => { const C = REACT_TOOLS[id]; return <C />; })()
          : <ToolMount id={id} locale={locale} labels={{ loading: tr("toolLoading"), failed: tr("toolFailed") }} />}
      </motion.div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {list(tr("howToUse"), tool.steps, true)}
        {list(tr("input"), tool.input)}
        {list(tr("output"), tool.output)}
        {list(tr("limits"), tool.limits)}
        <section className="rounded-[32px] bg-white p-7 text-ink md:col-span-2">
          <h3 className="mb-3 font-display text-3xl font-bold uppercase text-blue">{tr("whatItDoes")}</h3>
          <p className="text-lg">{t(tool.full, locale)}</p>
          {tool.features?.length ? <ul className="mt-4 space-y-2">{tool.features.map((x, k) => <li key={k} className="flex gap-3"><span className="mt-2.5 size-2.5 flex-none rounded-full bg-blue" />{t(x, locale)}</li>)}</ul> : null}
          {tool.authors && <p className="mt-5 font-mono text-sm text-ink/70">{tr("credits")}: {tool.authors}{tool.license ? ` · ${tool.license}` : ""}</p>}
        </section>
      </div>
      <nav className="mt-12 flex justify-between gap-4">
        {prev ? <Link href={`/t/${prev}/`} className={buttonVariants({ variant: "outline", size: "sm" })}><ArrowLeft className="size-4" />{t(SHORT[prev], locale)}</Link> : <span />}
        {next ? <Link href={`/t/${next}/`} className={buttonVariants({ variant: "primary", size: "sm" })}>{t(SHORT[next], locale)}<ArrowRight className="size-4" /></Link> : <span />}
      </nav>
      <p className="mt-8 max-w-[820px] text-sm text-white/75">{tr("disclaimer")}</p>
    </main>
  );
}
