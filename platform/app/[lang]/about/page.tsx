import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LANGS, L, UI, tr, isLang, type Lang } from '@/lib/i18n';
import { TOOLS } from '@/data/tools';
import { Reveal } from '@/components/Reveal';

export function generateStaticParams() { return LANGS.map((lang) => ({ lang })); }

const INTRO = L(
  'BOPASI — некоммерческая платформа-агрегатор открытых ИИ-инструментов для репродуктивной медицины и смежных областей. Мы не обучаем закрытых моделей и не храним ваши данные: каждый инструмент — это ссылка на оригинальный open-source проект с GitHub, подробная инструкция на трёх языках и, где возможно, запуск прямо в браузере. Идея — как у Higgsfield, но для медицины и репродуктивной биологии: одно окно, где собраны все доступные ИИ-продукты.',
  'BOPASI — репродуктивті медицина мен сабақтас салаларға арналған ашық ЖИ-құралдардың коммерциялық емес жинақтаушы платформасы. Біз жабық модельдерді оқытпаймыз және деректеріңізді сақтамаймыз: әр құрал — GitHub-тағы түпнұсқа open-source жобаға сілтеме, үш тілдегі толық нұсқаулық және мүмкін болса, тікелей браузерде іске қосу. Идея Higgsfield сияқты, бірақ медицина мен репродуктивті биология үшін: барлық қолжетімді ЖИ-өнімдер бір терезеде.',
  'BOPASI is a non-commercial aggregator of open AI tools for reproductive medicine and adjacent fields. We train no closed models and store none of your data: each tool is a link to the original open-source GitHub project, a detailed guide in three languages and, where possible, in-browser execution. The idea is like Higgsfield, but for medicine and reproductive biology: one window gathering every available AI product.');

const PILLARS = [
  { t: L('Только открытый код', 'Тек ашық код', 'Open source only'), d: L('Каждый инструмент ведёт к публичному репозиторию с указанием авторов и лицензии.', 'Әр құрал авторлар мен лицензия көрсетілген ашық репозиторийге апарады.', 'Every tool links to a public repository crediting authors and license.') },
  { t: L('Приватность', 'Құпиялылық', 'Privacy'), d: L('Браузерные инструменты обрабатывают фото и видео на вашем компьютере — ничего не загружается на сервер.', 'Браузерлік құралдар фото мен бейнені компьютеріңізде өңдейді — серверге ештеңе жүктелмейді.', 'Browser tools process images and video on your computer — nothing is uploaded.') },
  { t: L('Три языка', 'Үш тіл', 'Three languages'), d: L('Все описания и инструкции — на русском, казахском и английском.', 'Барлық сипаттамалар мен нұсқаулықтар — орыс, қазақ және ағылшын тілдерінде.', 'All descriptions and guides are in Russian, Kazakh and English.') },
  { t: L('Для практики и исследований', 'Тәжірибе мен зерттеуге', 'For practice and research'), d: L('Инструменты помогают в работе, но не заменяют врача и лабораторную валидацию.', 'Құралдар жұмысқа көмектеседі, бірақ дәрігер мен зертханалық валидацияны алмастырмайды.', 'Tools assist work but do not replace a clinician or lab validation.') },
];

export default async function About({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  if (!isLang(raw)) notFound();
  const lang = raw as Lang;
  return (
    <>
      <section className="relative overflow-hidden bg-grid pt-28 pb-14">
        <div className="pointer-events-none absolute inset-0 bg-aurora opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-white" />
        <div className="container-page relative">
          <Reveal><h1 className="font-display text-3xl font-semibold sm:text-5xl"><span className="text-gradient">{tr(UI.about, lang)}</span></h1></Reveal>
          <Reveal delay={80}><p className="mt-6 max-w-3xl text-base leading-relaxed text-navy/75">{tr(INTRO, lang)}</p></Reveal>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="grid gap-5 sm:grid-cols-2">
          {PILLARS.map((p, i) => (
            <Reveal key={i} delay={i * 60}>
              <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
                <h3 className="font-display text-lg font-semibold text-navy">{tr(p.t, lang)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/70">{tr(p.d, lang)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page py-10">
        <div className="rounded-3xl bg-navy p-8 text-ice">
          <h2 className="font-display text-xl font-semibold text-white">{tr(L('Как мы относимся к данным и ответственности', 'Деректер мен жауапкершілікке көзқарасымыз', 'Data and responsibility'), lang)}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ice/75">{tr(UI.disclaimer, lang)}</p>
          <p className="mt-4 text-sm text-ice/60">
            {`${tr(L('Платформа содержит', 'Платформада', 'The platform hosts'), lang)} ${TOOLS.length}+ ${tr(UI.toolsCount, lang)}. ${tr(L('Автор и контакт', 'Автор және байланыс', 'Author and contact'), lang)}: Alikhan Magauiya · `}
            <a className="text-cyan hover:underline" href="mailto:orda.ezhenid@gmail.com">orda.ezhenid@gmail.com</a>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="https://github.com/Toqtamys/magauiya" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20">GitHub ↗</a>
            <Link href={`/${lang}/andrology`} className="rounded-full bg-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-deep">{tr(UI.ctaAll, lang)}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
