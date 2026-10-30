"use client";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export function About() {
  const tr = useTranslations();
  return (
    <section id="about" className="mx-auto mt-40 max-w-[1400px] px-5 md:px-12">
      <div className="grid gap-12 border-t border-white/20 pt-14 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-x text-white/50">BOPASI</p>
          <h2 className="mt-3 font-display text-[clamp(40px,5vw,72px)] font-bold uppercase leading-[0.95]">{tr("aboutH")}</h2>
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-white/80">
          {[0, 1, 2].map((i) => (
            <motion.p key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.7 }}>
              {tr(`about${i}`)}
            </motion.p>
          ))}
          <div className="border-t border-white/15 pt-8">
            <p className="font-mono text-xs font-semibold uppercase tracking-x text-white/50">{tr("authors")}</p>
            <p className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-white">{tr("sign")}</p>
            <p className="mt-3 font-mono text-sm text-white/60">{tr("role")} · <a className="underline decoration-white/40 underline-offset-4 hover:decoration-white" href="mailto:orda.ezhenid@gmail.com">orda.ezhenid@gmail.com</a></p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const tr = useTranslations();
  return (
    <footer className="mx-auto mt-32 max-w-[1400px] px-5 pb-10 md:px-12">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/10 pt-8 text-center font-mono text-[11px] font-semibold uppercase tracking-x text-white/50">
        <span>BOPASI © 2026</span><span>{tr("sign")}</span><span>{tr("footDisc").replace(/^2026 · /, "")}</span>
      </div>
    </footer>
  );
}
