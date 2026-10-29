'use client';
import { createContext, useContext } from 'react';
import type { Lang } from '@/lib/i18n';

export const LangCtx = createContext<Lang>('ru');
export const useLang = () => useContext(LangCtx);

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>;
}
