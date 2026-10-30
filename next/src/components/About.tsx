"use client";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Wordmark } from "./Wordmark";

export function About() {
  const tr = useTranslations();
  return (
    <section id="about" className="mx-auto mt-32 max-w-[1400px] px-4 md:px-8">
      <div className="grid gap-10 rounded-[48px] bg-white p-8 text-ink md:p-14 lg:grid-cols-[1fr_1.4fr]">
        <h2 className="font-display text-[clamp(44px,5vw,80px)] font-bold uppercase leading-[0.9] text-blue">{tr("aboutH")}</h2>
        <div className="space-y-4 text-lg">
          {[0, 1, 2].map((i) => (
            <motion.p key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.7 }}>
              {tr(`about${i}`)}
            </motion.p>
          ))}
          <p className="pt-4 font-display text-3xl font-bold uppercase text-blue">{tr("sign")}</p>
          <p className="flex flex-wrap items-center gap-2 font-mono text-sm">{tr("role")} · <Mail className="size-4 text-blue" /><a className="text-blue underline" href="mailto:orda.ezhenid@gmail.com">orda.ezhenid@gmail.com</a></p>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const tr = useTranslations();
  return (
    <footer className="mx-auto mt-24 max-w-[1400px] px-4 pb-10 md:px-8">
      <div className="overflow-hidden"><motion.div initial={{ y: "100%" }} whileInView={{ y: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 80, damping: 15 }}>
        <Wordmark size="text-[clamp(80px,19vw,300px)]" />
      </motion.div></div>
      <div className="mt-6 flex flex-wrap justify-between gap-4 font-mono text-sm uppercase text-white/75">
        <span>{tr("footWhat")}</span><span>{tr("footDisc")}</span>
      </div>
    </footer>
  );
}
