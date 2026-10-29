import { notFound } from 'next/navigation';
import { LANGS, isLang, type Lang } from '@/lib/i18n';
import { TOOLS, toolById, toolsInSection } from '@/data/tools';
import { sectionById } from '@/data/sections';
import { ToolView } from '@/components/ToolView';

export function generateStaticParams() {
  return LANGS.flatMap((lang) => TOOLS.map((t) => ({ lang, id: t.id })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const tool = toolById(id);
  const l = (isLang(lang) ? lang : 'ru') as Lang;
  if (!tool) return {};
  const desc = typeof tool.tagline === 'string' ? tool.tagline : tool.tagline[l];
  return { title: `${tool.name} — BOPASI`, description: desc };
}

export default async function ToolPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  const tool = toolById(id);
  if (!tool) notFound();
  const section = sectionById(tool.section)!;
  const related = toolsInSection(tool.section).filter((t) => t.id !== tool.id).slice(0, 3);
  return <ToolView tool={tool} section={section} related={related} lang={lang as Lang} />;
}
