import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "BOPASI — лаборатория репродукции",
  description:
    "BOPASI: 18 бесплатных инструментов для андрологии, эмбриологии, репродуктологии и гистологии, которые работают в браузере. Снимки и видео не покидают ваш компьютер.",
  icons: { icon: `${BASE}/icon.svg` },
};
export const viewport: Viewport = { themeColor: "#e1061b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- один layout на весь сайт */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geologica:wght@500;600;700;800&family=Onest:wght@400;500;600;700&display=swap" />
        <link rel="stylesheet" href={`${BASE}/legacy/bopasi-tools.css`} />
        <script dangerouslySetInnerHTML={{ __html: `window.BOPASI_BASE=${JSON.stringify(BASE + "/")};` }} />
      </head>
      <body className="bg-grid min-h-screen">
        <div className="scanline" aria-hidden="true" />
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
