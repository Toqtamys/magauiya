import { Hero } from "@/components/Hero";
import { Ticker } from "@/components/Ticker";
import { Section } from "@/components/Section";
import { About, Footer } from "@/components/About";
import { CHAPTERS } from "@/lib/catalog";

export default function Home() {
  return (
    <main>
      <Hero />
      <Ticker />
      {CHAPTERS.map((c, i) => <Section key={c.id} chapter={c} index={i} />)}
      <About />
      <Footer />
    </main>
  );
}
