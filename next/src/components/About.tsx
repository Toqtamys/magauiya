"use client";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";

export function About() {
  const tr = useTranslations();
  return (
    <section id="about" className="mx-auto mt-32 grid max-w-[1320px] gap-10 border-t-2 border-ink px-4 pt-12 md:px-6 lg:grid-cols-[1fr_1.4fr]">
      <h2 className="font-[family-name:var(--font-display)] text-[clamp(32px,3.2vw,46px)] font-extrabold uppercase">{tr("aboutH")}</h2>
      <div className="space-y-4 text-lg">
        {[0, 1, 2].map((i) => (
          <motion.p key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.7 }}>
            {tr(`about${i}`)}
          </motion.p>
        ))}
        <p className="pt-4 text-2xl font-semibold">{tr("sign")}</p>
        <p className="flex items-center gap-2 text-sm text-soft">{tr("role")} · <Mail className="size-4 text-red" /><a className="text-red underline" href="mailto:orda.ezhenid@gmail.com">orda.ezhenid@gmail.com</a></p>
      </div>
    </section>
  );
}

export function Footer() {
  const tr = useTranslations();
  return (
    <footer className="mx-auto mt-24 flex max-w-[1320px] flex-wrap justify-between gap-4 border-t border-red/30 px-4 py-8 text-xs uppercase tracking-[0.08em] text-soft md:px-6">
      <span>{tr("footWhat")}</span>
      <span>{tr("footDisc")}</span>
    </footer>
  );
}
