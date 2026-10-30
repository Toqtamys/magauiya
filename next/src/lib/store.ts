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
