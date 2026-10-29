import { isLang, type Lang } from '@/lib/i18n';
import { HomeContent } from '@/components/HomeContent';

export function generateStaticParams() {
  return [{ lang: 'ru' }, { lang: 'kk' }, { lang: 'en' }];
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  return <HomeContent lang={(isLang(raw) ? raw : 'ru') as Lang} />;
}
