export const LANGS = ['ru', 'kk', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export type T = { ru: string; kk: string; en: string };

/** Короткий конструктор трёхъязычной строки: L(ru, kk, en) */
export const L = (ru: string, kk: string, en: string): T => ({ ru, kk, en });

export const isLang = (s: string): s is Lang => (LANGS as readonly string[]).includes(s);
export const tr = (t: T | string | undefined, lang: Lang) =>
  t == null ? '' : typeof t === 'string' ? t : t[lang] || t.ru;

export const LANG_LABEL: Record<Lang, string> = { ru: 'Рус', kk: 'Қаз', en: 'Eng' };
export const LANG_HTML: Record<Lang, string> = { ru: 'ru', kk: 'kk', en: 'en' };

export const BASE = process.env.NEXT_PUBLIC_BASE ?? '';
export const asset = (p: string) => `${BASE}${p.startsWith('/') ? p : '/' + p}`;

/** Интерфейсные строки */
export const UI = {
  brandTag: L('Открытые ИИ-инструменты для репродуктивной медицины', 'Репродуктивті медицинаға арналған ашық ЖИ-құралдар', 'Open AI tools for reproductive medicine'),
  heroTitle: L('Вся открытая ИИ-медицина репродукции — в одном окне', 'Репродукцияның барлық ашық ЖИ-медицинасы — бір терезеде', 'All open reproductive AI — in one window'),
  heroLead: L(
    'BOPASI собирает open-source модели с GitHub — от спермограммы и фрагментации ДНК до грейдинга эмбрионов, патоморфологии и дизайна препаратов. Выберите инструмент, загрузите снимок или видео и получите результат прямо в браузере или точную инструкцию для локального запуска.',
    'BOPASI GitHub-тағы open-source модельдерді жинайды — спермограмма мен ДНҚ фрагментациясынан бастап эмбрион грейдингіне, патоморфологияға және дәрі дизайнына дейін. Құралды таңдаңыз, сурет не бейне жүктеңіз де, нәтижені тікелей браузерде немесе жергілікті іске қосудың нақты нұсқаулығын алыңыз.',
    'BOPASI gathers open-source models from GitHub — from semen analysis and DNA fragmentation to embryo grading, pathology and drug design. Pick a tool, drop an image or video and get a result right in the browser, or an exact guide to run it locally.'),
  ctaStart: L('Открыть BOPASI', 'BOPASI ашу', 'Open BOPASI'),
  ctaAll: L('Все инструменты', 'Барлық құралдар', 'All tools'),
  scroll: L('Листайте', 'Төмен айналдырыңыз', 'Scroll'),
  sectionsTitle: L('Разделы платформы', 'Платформа бөлімдері', 'Platform sections'),
  toolsCount: L('инструментов', 'құрал', 'tools'),
  inBrowser: L('Работает в браузере', 'Браузерде жұмыс істейді', 'Runs in browser'),
  howTitle: L('Как это работает', 'Бұл қалай жұмыс істейді', 'How it works'),
  featured: L('Главный инструмент раздела', 'Бөлімнің басты құралы', 'Section flagship'),
  open: L('Открыть', 'Ашу', 'Open'),
  openSource: 'Open Source',
  about: L('О проекте', 'Жоба туралы', 'About'),
  disclaimer: L(
    'Платформа использует только открытые инструменты. Результаты носят исследовательский характер и не являются медицинским заключением. Дизайн препаратов и белков — исключительно образовательный и исследовательский инструмент.',
    'Платформа тек ашық құралдарды пайдаланады. Нәтижелер зерттеу сипатында және медициналық қорытынды болып табылмайды. Дәрілер мен ақуыздар дизайны — тек білім беру және зерттеу құралы.',
    'The platform uses open tools only. Results are for research and are not a medical conclusion. Drug and protein design is strictly an educational and research tool.'),
  // tool page
  whatItDoes: L('Что умеет', 'Не істей алады', 'What it does'),
  howToUse: L('Как пользоваться', 'Қалай пайдалану керек', 'How to use'),
  filesNeeded: L('Какие файлы нужны', 'Қандай файлдар керек', 'Files you need'),
  stepByStep: L('Пошагово', 'Қадам бойынша', 'Step by step'),
  localOnly: L('Если инструмент работает только локально', 'Құрал тек жергілікті жұмыс істесе', 'If the tool runs locally only'),
  limits: L('Ограничения и типичные ошибки', 'Шектеулер мен жиі қателер', 'Limitations and common mistakes'),
  output: L('Что вы получите на выходе', 'Шығуда не аласыз', 'What you get'),
  inputReq: L('Требования к входным данным', 'Кіріс деректерге талаптар', 'Input requirements'),
  upload: L('Загрузка файлов', 'Файлдарды жүктеу', 'Upload files'),
  dropHere: L('Перетащите файлы сюда или нажмите, чтобы выбрать', 'Файлдарды осында сүйреңіз немесе таңдау үшін басыңыз', 'Drop files here or click to choose'),
  filesStayLocal: L('Файлы не покидают ваш компьютер — проверка идёт в браузере.', 'Файлдар компьютеріңізден шықпайды — тексеру браузерде жүреді.', 'Files never leave your computer — checks run in the browser.'),
  repo: L('Репозиторий', 'Репозиторий', 'Repository'),
  authors: L('Авторы', 'Авторлар', 'Authors'),
  license: L('Лицензия', 'Лицензия', 'License'),
  runsWhere: L('Где работает', 'Қайда жұмыс істейді', 'Where it runs'),
  install: L('Установка и запуск', 'Орнату және іске қосу', 'Install and run'),
  requirements: L('Нужно', 'Қажет', 'Needs'),
  analyze: L('Анализировать', 'Талдау', 'Analyze'),
  create: L('Создать', 'Жасау', 'Create'),
  dock: L('Dock', 'Dock', 'Dock'),
  check: L('Проверить файлы', 'Файлдарды тексеру', 'Check files'),
  calc: L('Рассчитать', 'Есептеу', 'Calculate'),
  copy: L('Копировать', 'Көшіру', 'Copy'),
  copied: L('Скопировано', 'Көшірілді', 'Copied'),
  back: L('Назад', 'Артқа', 'Back'),
  related: L('Ещё в разделе', 'Бөлімде тағы', 'More in this section'),
  fullscreen: L('Открыть на весь экран', 'Толық экранда ашу', 'Open full screen'),
  readyToRun: L('Файлы подходят. Команда для локального запуска:', 'Файлдар сәйкес. Жергілікті іске қосу командасы:', 'Files look good. Command to run locally:'),
  fixFiles: L('Исправьте отмеченные файлы перед запуском.', 'Іске қоспас бұрын белгіленген файлдарды түзетіңіз.', 'Fix the flagged files before running.'),
  constructor: L('Конструктор препаратов', 'Дәрі конструкторы', 'Drug constructor'),
  openConstructor: L('Открыть 3D-конструктор', '3D-конструкторды ашу', 'Open 3D constructor'),
  search: L('Поиск инструмента…', 'Құралды іздеу…', 'Search tools…'),
  allModes: L('Все', 'Барлығы', 'All'),
};

export const MODE_LABEL: Record<string, T> = {
  browser: L('В браузере', 'Браузерде', 'In browser'),
  web: L('Веб-сервис', 'Веб-қызмет', 'Web service'),
  local: L('Локально · Python', 'Жергілікті · Python', 'Local · Python'),
  desktop: L('Десктоп-программа', 'Десктоп бағдарлама', 'Desktop app'),
  hpc: L('Кластер / GPU', 'Кластер / GPU', 'Cluster / GPU'),
  docker: L('Локально · Docker', 'Жергілікті · Docker', 'Local · Docker'),
  paper: L('Статья + код', 'Мақала + код', 'Paper + code'),
};
