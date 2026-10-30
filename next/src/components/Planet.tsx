"use client";
// «Планета» первого экрана: яйцеклетка, как Земля с орбиты
import { useEffect, useRef } from "react";
import { createPlanet } from "@/lib/sky.gen.js";

export default function Planet() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const p = createPlanet(ref.current, { reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches });
    const io = new IntersectionObserver(([e]) => p.pause(!e.isIntersecting));
    io.observe(ref.current);
    return () => { io.disconnect(); p.destroy(); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 size-full" aria-hidden="true" />;
}
