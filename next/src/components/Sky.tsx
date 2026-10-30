"use client";
// Небо на весь сайт: неоновые небоскрёбы снизу вверх, звёзды и 21 звезда-инструмент
import { useEffect, useRef } from "react";
import { CHAPTERS, ORDER, SHORT, t } from "@/lib/catalog";
import { setSky, type SkyApi } from "@/lib/sky";
import { useLocale } from "./Providers";
// генерируется из site/src/sky.js при сборке
import { createSky } from "@/lib/sky.gen.js";

export function Sky() {
  const ref = useRef<HTMLCanvasElement>(null);
  const api = useRef<SkyApi | null>(null);
  const locale = useLocale();
  useEffect(() => {
    if (!ref.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    api.current = createSky(ref.current, { groups: CHAPTERS.map((c) => c.tools.length), labels: [], reduced }) as SkyApi;
    setSky(api.current);
    return () => { api.current?.destroy(); setSky(null); api.current = null; };
  }, []);
  useEffect(() => { api.current?.setLabels(ORDER.map((id) => t(SHORT[id], locale))); }, [locale]);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10 size-full" aria-hidden="true" />;
}
