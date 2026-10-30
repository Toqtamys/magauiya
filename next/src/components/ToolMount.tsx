"use client";
// Встраивает проверенные инструменты BOPASI (чистый JS) в React-страницу.
// Скрипт с инструментами грузится один раз, затем window.BOPASI.mount(id, элемент, язык).
import { useEffect, useRef, useState } from "react";
import { BASE } from "@/lib/catalog";
import { useDropped, type Locale } from "@/lib/store";

type Mounted = { destroy?: () => void } | null;
declare global { interface Window { BOPASI?: { mount: (id: string, el: HTMLElement, lang: string) => Mounted; feed: (el: HTMLElement, files: File[]) => void } } }

let loading: Promise<void> | null = null;
function loadTools(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.BOPASI) return Promise.resolve();
  return (loading ||= new Promise<void>((resolve, reject) => {
    window.addEventListener("bopasi-ready", () => resolve(), { once: true });
    const s = document.createElement("script");
    s.type = "module";
    s.src = `${BASE}/legacy/bopasi-tools.js`;
    s.onerror = () => { loading = null; reject(new Error("tools script failed to load")); };
    document.head.append(s);
  }));
}

export function ToolMount({ id, locale, labels }: { id: string; locale: Locale; labels: { loading: string; failed: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted: Mounted = null, alive = true;
    const el = ref.current;
    loadTools()
      .then(() => {
        if (!alive || !el || !window.BOPASI) return;
        mounted = window.BOPASI.mount(id, el, locale);
        setState("ready");
        // файл, брошенный на главной, сразу уходит в инструмент
        const files = useDropped.getState().take(id);
        if (files.length) window.BOPASI.feed(el, files);
      })
      .catch((e) => { if (alive) { setError(String(e?.message || e)); setState("error"); } });
    return () => { alive = false; try { mounted?.destroy?.(); } catch {} el?.replaceChildren(); };
  }, [id, locale]);
  return (
    <div className="tool-root">
      {state === "loading" && <p className="animate-pulse py-10 text-sm uppercase tracking-[0.14em] text-red">{labels.loading}</p>}
      {state === "error" && <p className="bg-tone p-4 text-sm text-red-dark">{labels.failed}: {error}</p>}
      <div ref={ref} />
    </div>
  );
}
