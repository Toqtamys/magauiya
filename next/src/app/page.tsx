import { Hero } from "@/components/Hero";
import { QuickDrop } from "@/components/QuickDrop";
import { LegacyHashRedirect } from "@/components/LegacyHashRedirect";
import { Section } from "@/components/Section";
import { About, Footer } from "@/components/About";
import { CHAPTERS } from "@/lib/catalog";

export default function Home() {
  return (
    <main>
      <Hero />
      <LegacyHashRedirect />
      <QuickDrop />
      {CHAPTERS.map((c, i) => <Section key={c.id} chapter={c} index={i} />)}
      <About />
      <Footer />
    </main>
  );
}
