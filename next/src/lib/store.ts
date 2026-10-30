"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "ru" | "kk" | "en";
export const LOCALES: Locale[] = ["ru", "kk", "en"];
export const LOCALE_LABEL: Record<Locale, string> = { ru: "Рус", kk: "Қаз", en: "Eng" };

type UiState = { locale: Locale; setLocale: (l: Locale) => void };

// язык интерфейса; русский по умолчанию, выбор запоминается в браузере
export const useUi = create<UiState>()(
  persist((set) => ({ locale: "ru", setLocale: (locale) => set({ locale }) }), { name: "bopasi-ui" }),
);

// файлы, брошенные на главной: ждут, пока откроется выбранный инструмент (не сохраняются)
type DropState = { files: File[]; target: string | null; set: (files: File[], target: string | null) => void; take: (id: string) => File[] };
export const useDropped = create<DropState>()((set, get) => ({
  files: [], target: null,
  set: (files, target) => set({ files, target }),
  take: (id) => { const { files, target } = get(); if (target !== id || !files.length) return []; set({ files: [], target: null }); return files; },
}));
