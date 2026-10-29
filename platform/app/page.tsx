import { LangProvider } from '@/components/lang';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { HomeContent } from '@/components/HomeContent';

/** Корень сайта сразу показывает русскую главную (без редиректа) —
 *  так сайт работает на любом статическом хостинге. */
export default function Index() {
  return (
    <LangProvider lang="ru">
      <Nav />
      <main className="min-h-screen"><HomeContent lang="ru" /></main>
      <Footer lang="ru" />
    </LangProvider>
  );
}
