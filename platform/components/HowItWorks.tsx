import { L, UI, tr, type Lang } from '@/lib/i18n';
import { Reveal } from './Reveal';

const STEPS = [
  { n: '01', t: L('Выберите раздел', 'Бөлімді таңдаңыз', 'Choose a section'), d: L('Андрология, эмбриология, гистология, репродуктология, онкология или дизайн препаратов.', 'Андрология, эмбриология, гистология, репродуктология, онкология немесе дәрі дизайны.', 'Andrology, embryology, histology, reproduction, oncology or drug design.') },
  { n: '02', t: L('Откройте инструмент', 'Құралды ашыңыз', 'Open a tool'), d: L('Описание, что умеет, требования к данным и подробная инструкция «Как пользоваться» на трёх языках.', 'Сипаттама, мүмкіндіктер, деректерге талаптар және үш тілдегі «Қалай пайдалану» нұсқаулығы.', 'Description, capabilities, data requirements and a detailed “How to use” guide in three languages.') },
  { n: '03', t: L('Загрузите данные', 'Деректерді жүктеңіз', 'Upload data'), d: L('Перетащите фото или видео. Для браузерных инструментов обработка идёт прямо на вашем компьютере.', 'Фото не бейнені сүйреңіз. Браузерлік құралдар үшін өңдеу компьютеріңізде жүреді.', 'Drop a photo or video. For browser tools, processing runs on your own computer.') },
  { n: '04', t: L('Получите результат', 'Нәтиже алыңыз', 'Get the result'), d: L('Результат на сайте — или готовая команда и ссылка на репозиторий для локального запуска.', 'Нәтиже сайтта — немесе жергілікті іске қосуға дайын команда мен репозиторий сілтемесі.', 'A result on the site — or a ready command and repo link to run it locally.') },
];

export function HowItWorks({ lang }: { lang: Lang }) {
  return (
    <section className="relative overflow-hidden bg-navy py-20 text-ice">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.12]" />
      <div className="container-page relative">
        <Reveal><h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">{tr(UI.howTitle, lang)}</h2></Reveal>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="relative">
                <span className="font-display text-5xl font-semibold text-white/15">{s.n}</span>
                <div className="mt-3 h-px w-12 bg-gradient-to-r from-cyan to-transparent" />
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{tr(s.t, lang)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ice/70">{tr(s.d, lang)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
