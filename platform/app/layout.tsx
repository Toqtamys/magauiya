import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BOPASI Platform — открытые ИИ-инструменты репродуктивной медицины',
  description:
    'BOPASI — платформа open-source ИИ-инструментов для андрологии, эмбриологии, гистологии, репродуктологии, онкологии и дизайна препаратов. Анализ спермограммы, фрагментации ДНК, грейдинг эмбрионов и 3D-конструктор лекарств прямо в браузере.',
  metadataBase: new URL('https://toqtamys.github.io'),
  icons: { icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%231f4fff"/><text x="16" y="22" font-size="16" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="700">B</text></svg>' },
  openGraph: { title: 'BOPASI Platform', description: 'Открытые ИИ-инструменты репродуктивной медицины', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=Unbounded:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ ['--font-sans' as string]: '"Golos Text"', ['--font-display' as string]: 'Unbounded' }}>
        {children}
      </body>
    </html>
  );
}
