import { notFound } from 'next/navigation';
import { LANGS, isLang, type Lang } from '@/lib/i18n';
import { SECTIONS, sectionById } from '@/data/sections';
import { toolsInSection } from '@/data/tools';
import { SectionView } from '@/components/SectionView';

export function generateStaticParams() {
  return LANGS.flatMap((lang) => SECTIONS.map((s) => ({ lang, section: s.id })));
}

export default async function SectionPage({ params }: { params: Promise<{ lang: string; section: string }> }) {
  const { lang, section } = await params;
  if (!isLang(lang)) notFound();
  const sec = sectionById(section);
  if (!sec) notFound();
  return <SectionView section={sec} tools={toolsInSection(section)} lang={lang as Lang} />;
}
