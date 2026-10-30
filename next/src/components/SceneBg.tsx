"use client";
// Живой фон раздела: сцена из «путешествия сквозь клетку», крупно и смещённо, как кадр миссии
import { useEffect, useRef } from "react";
import { Stage } from "@/lib/stage.gen.js";

export default function SceneBg({ scene }: { scene: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const k = Math.round(scene) % Stage.count;
    const small = () => c.clientWidth < 700;
    const paint = (t: number) => Stage.paint(c, k, t, { cx: small() ? 0.5 : 0.7, cy: 0.45, u: small() ? 0.62 : 0.8, dpr: 1 });
    let raf = 0, on = false, last = 0;
    const t0 = performance.now();
    const loop = (now: number) => { if (!on) return; if (now - last > 40) { paint(3 + (now - t0) / 1000); last = now; } raf = requestAnimationFrame(loop); };
    paint(3);
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting && !reduced; cancelAnimationFrame(raf); if (on) raf = requestAnimationFrame(loop); });
    io.observe(c);
    const onResize = () => paint(3 + (performance.now() - t0) / 1000);
    addEventListener("resize", onResize);
    return () => { on = false; cancelAnimationFrame(raf); io.disconnect(); removeEventListener("resize", onResize); };
  }, [scene]);
  return <canvas ref={ref} className="kenburns absolute inset-0 size-full opacity-60" aria-hidden="true" />;
}
