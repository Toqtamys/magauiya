"use client";
import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import ru from "../../messages/ru.json";
import kk from "../../messages/kk.json";
import en from "../../messages/en.json";
import { useUi, type Locale } from "@/lib/store";

const MESSAGES: Record<Locale, Record<string, string>> = { ru, kk, en };

export function Providers({ children }: { children: ReactNode }) {
  const stored = useUi((s) => s.locale);
  // до гидрации — русский, как в статическом HTML; затем язык из памяти браузера
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const locale: Locale = ready ? stored : "ru";
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Almaty">
      {children}
    </NextIntlClientProvider>
  );
}

export function useLocale(): Locale {
  const stored = useUi((s) => s.locale);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? stored : "ru";
}
