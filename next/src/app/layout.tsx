import type { Metadata, Viewport } from "next";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/700.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/700.css";
import "@fontsource/rubik/400.css";
import "@fontsource/rubik/500.css";
import "@fontsource/rubik/700.css";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { TopBar } from "@/components/TopBar";
import { Sky } from "@/components/Sky";
import { SkyHud } from "@/components/SkyHud";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "BOPASI — лаборатория репродукции",
  description:
    "BOPASI: 21 инструмент для андрологии, эмбриологии, репродуктологии, гистологии и науки, которые работают в браузере. Снимки и видео не покидают ваш компьютер.",
  icons: { icon: `${BASE}/icon.svg` },
  authors: [{ name: "Әлихан Мағауия" }, { name: "Аян Ізбаев" }],
};
export const viewport: Viewport = { themeColor: "#05030f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="stylesheet" href={`${BASE}/legacy/bopasi-tools.css`} />
        <script dangerouslySetInnerHTML={{ __html: `window.BOPASI_BASE=${JSON.stringify(BASE + "/")};` }} />
      </head>
      <body className="scan min-h-screen">
        <Providers>
          <Sky />
          <TopBar />
          <Header />
          {children}
          <SkyHud />
        </Providers>
      </body>
    </html>
  );
}
