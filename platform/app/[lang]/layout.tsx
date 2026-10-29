import { notFound } from 'next/navigation';
import { LANGS, isLang, type Lang } from '@/lib/i18n';
import { LangProvider } from '@/components/lang';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <LangProvider lang={lang as Lang}>
      <Nav />
      <main className="min-h-screen">{children}</main>
      <Footer lang={lang as Lang} />
    </LangProvider>
  );
}
