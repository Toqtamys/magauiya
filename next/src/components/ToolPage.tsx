"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { ORDER, SHORT, KIND, chapterOf, t, toolById, type L } from "@/lib/catalog";
import { useLocale } from "./Providers";
import { ToolMount } from "./ToolMount";
import { buttonVariants } from "./ui/button";

export function ToolPage({ id }: { id: string }) {
  const tr = useTranslations();
  const locale = useLocale();
  const tool = toolById(id)!;
  const ch = chapterOf(id)!;
  const i = ORDER.indexOf(id), prev = ORDER[i - 1], next = ORDER[i + 1];
  const list = (title: string, items: L[] | undefined, ordered = false) => !items?.length ? null : (
    <section>
      <h3 className="mb-4 font-[family-name:var(--font-display)] text-xl font-extrabold uppercase">{title}</h3>
      {ordered ? (
        <ol className="space-y-3">{items.map((x, k) => (
          <li key={k} className="flex gap-3"><span className="grid size-7 flex-none place-items-center bg-red text-sm font-bold text-white">{k + 1}</span><span>{t(x, locale)}</span></li>
        ))}</ol>
      ) : (
        <ul className="space-y-2.5">{items.map((x, k) => (
          <li key={k} className="flex gap-3"><span className="diamond mt-2 inline-block size-2.5 flex-none bg-red" /><span>{t(x, locale)}</span></li>
        ))}</ul>
      )}
    </section>
  );
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-8 md:px-6">
      <Link href={`/#${ch.id}`} className={buttonVariants({ variant: "dark", size: "sm" })}><ArrowLeft className="size-4" />{tr("back")}</Link>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="mt-8 text-[13px] font-bold uppercase tracking-[0.14em] text-red">{t(ch.name, locale)} · {t(KIND[id], locale)}</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(32px,4.4vw,60px)] font-extrabold uppercase leading-[1.02]">{t(tool.name, locale)}</h1>
        <p className="mt-4 max-w-[780px] text-lg">{t(tool.tagline, locale)}</p>
        <p className="mt-5 inline-flex items-center gap-2 border-l-4 border-red bg-tone px-4 py-2.5 text-sm"><ShieldCheck className="size-4 text-red" />{tr("localNote")}</p>
      </motion.div>
      <div className="mt-8">
        <ToolMount id={id} locale={locale} labels={{ loading: tr("toolLoading"), failed: tr("toolFailed") }} />
      </div>
      <div className="mt-16 grid gap-10 md:grid-cols-2">
        {list(tr("howToUse"), tool.steps, true)}
        {list(tr("input"), tool.input)}
        {list(tr("output"), tool.output)}
        {list(tr("limits"), tool.limits)}
        <section className="bg-tone p-7 shadow-[inset_4px_0_0_var(--color-red)] md:col-span-2">
          <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl font-extrabold uppercase">{tr("whatItDoes")}</h3>
          <p>{t(tool.full, locale)}</p>
          {tool.features?.length ? <ul className="mt-4 space-y-2">{tool.features.map((x, k) => <li key={k} className="flex gap-3"><span className="diamond mt-2 inline-block size-2.5 flex-none bg-red" />{t(x, locale)}</li>)}</ul> : null}
          {tool.authors && <p className="mt-4 text-sm text-soft">{tr("credits")}: {tool.authors}</p>}
        </section>
      </div>
      <nav className="mt-12 flex justify-between gap-4">
        {prev ? <Link href={`/t/${prev}/`} className="chamfer flex items-center gap-2 bg-tone px-5 py-3.5 font-semibold hover:bg-tone2"><ArrowLeft className="size-4 text-red" />{t(SHORT[prev], locale)}</Link> : <span />}
        {next ? <Link href={`/t/${next}/`} className="chamfer flex items-center gap-2 bg-tone px-5 py-3.5 font-semibold hover:bg-tone2">{t(SHORT[next], locale)}<ArrowRight className="size-4 text-red" /></Link> : <span />}
      </nav>
      <p className="mt-8 max-w-[820px] text-sm text-soft">{tr("disclaimer")}</p>
    </main>
  );
}
