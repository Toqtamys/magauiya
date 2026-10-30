import catalog from "@/data/catalog.json";
import type { Locale } from "./store";

export type L = { ru: string; kk: string; en: string };
export type Tool = {
  id: string; name: L | string; tagline: L; full: L; features: L[]; input: L[]; steps: L[]; limits: L[]; output: L[]; authors?: string;
  github?: string; license?: string; preview?: string;
};
export type Chapter = { id: string; name: L; lead: L; tools: string[] };

export const CHAPTERS = catalog.chapters as Chapter[];
export const TOOLS = catalog.tools as Tool[];
export const SHORT = catalog.short as Record<string, L | string>;
export const KIND = catalog.kind as Record<string, L>;
export const ORDER = CHAPTERS.flatMap((c) => c.tools);

export const t = (v: L | string | undefined, locale: Locale) => (v == null ? "" : typeof v === "string" ? v : v[locale] || v.ru);
export const toolById = (id: string) => TOOLS.find((x) => x.id === id);
export const chapterOf = (id: string) => CHAPTERS.find((c) => c.tools.includes(id));
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
