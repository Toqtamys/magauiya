// ─── Языки и интерфейсные строки ────────────────────────────────────────────
const LANGS = ['ru', 'kk', 'en'];
const LANG_LABEL = { ru: 'Рус', kk: 'Қаз', en: 'Eng' };
const L = (ru, kk, en) => ({ ru, kk, en });

const UI = {
  tagline: L('Открытые ИИ-инструменты репродуктивной медицины', 'Репродуктивті медицинаның ашық ЖИ-құралдары', 'Open AI tools for reproductive medicine'),
  introTitle: L('Лаборатория репродукции в браузере', 'Браузердегі репродукция зертханасы', 'A reproduction lab in your browser'),
  introLead: L(
    'Спермограмма по видео, индекс фрагментации ДНК, морфология и подсчёт, измерение и грейдинг эмбрионов, калькуляторы ВРТ и 3D-конструктор препаратов. Всё работает прямо на странице — снимки и видео не покидают ваш компьютер.',
    'Бейне бойынша спермограмма, ДНҚ фрагментациясының индексі, морфология және санау, эмбриондарды өлшеу және грейдинг, ҚРТ калькуляторлары және дәрілердің 3D-конструкторы. Барлығы тікелей бетте жұмыс істейді — суреттер мен бейнелер компьютеріңізден шықпайды.',
    'Video semen analysis, DNA fragmentation index, morphology and counting, embryo measurement and grading, ART calculators and a 3D drug constructor. Everything runs right on the page — your images and videos never leave your computer.'),
  scroll: L('Листайте', 'Айналдырыңыз', 'Scroll'),
  explore: L('Смотреть инструменты', 'Құралдарды қарау', 'Explore the tools'),
  statTools: L('инструментов', 'құрал', 'tools'),
  statLangs: L('языка', 'тіл', 'languages'),
  statUploads: L('загрузок на сервер', 'серверге жүктеу', 'server uploads'),
  chapter: L('Глава', 'Тарау', 'Chapter'),
  start: L('Начать', 'Бастау', 'Start'),
  open: L('Открыть инструмент', 'Құралды ашу', 'Open tool'),
  back: L('Назад', 'Артқа', 'Back'),
  all: L('Все инструменты', 'Барлық құралдар', 'All tools'),
  about: L('О проекте', 'Жоба туралы', 'About'),
  soundOn: L('Включить звук', 'Дыбысты қосу', 'Sound on'),
  soundOff: L('Выключить звук', 'Дыбысты өшіру', 'Sound off'),
  inBrowser: L('Работает в браузере', 'Браузерде жұмыс істейді', 'Runs in your browser'),
  localNote: L('Файлы обрабатываются на вашем компьютере и никуда не отправляются.', 'Файлдар компьютеріңізде өңделеді және ешқайда жіберілмейді.', 'Files are processed on your computer and are never uploaded.'),
  whatItDoes: L('Что умеет', 'Не істей алады', 'What it does'),
  howToUse: L('Как пользоваться', 'Қалай пайдалану керек', 'How to use'),
  input: L('Что нужно на входе', 'Кірісте не керек', 'What you need'),
  output: L('Что вы получите', 'Не аласыз', 'What you get'),
  limits: L('Ограничения и типичные ошибки', 'Шектеулер мен жиі қателер', 'Limitations and common mistakes'),
  credits: L('Основа', 'Негізі', 'Built on'),
  fullscreen: L('На весь экран', 'Толық экран', 'Full screen'),
  exitFullscreen: L('Свернуть', 'Кішірейту', 'Exit full screen'),
  tool: L('Инструмент', 'Құрал', 'Tool'),
  tools: L('инструментов', 'құрал', 'tools'),
  disclaimer: L(
    'Результаты носят исследовательский характер и не являются медицинским заключением. Решения принимает врач. Конструктор препаратов — исключительно образовательный инструмент.',
    'Нәтижелер зерттеу сипатында және медициналық қорытынды болып табылмайды. Шешімді дәрігер қабылдайды. Дәрі конструкторы — тек білім беру құралы.',
    'Results are for research and are not a medical conclusion. Decisions are made by a clinician. The drug constructor is strictly an educational tool.'),
  aboutText: L(
    'BOPASI — платформа, где собраны ИИ-инструменты для репродуктивной медицины, которые работают прямо на сайте. Здесь только то, что действительно запускается в браузере: никаких установок, серверов и загрузки данных. Каждый инструмент сопровождается подробной инструкцией на русском, казахском и английском.',
    'BOPASI — сайтта тікелей жұмыс істейтін репродуктивті медицинаға арналған ЖИ-құралдар жиналған платформа. Мұнда тек браузерде шынымен іске қосылатын құралдар бар: орнату, сервер және деректерді жүктеу жоқ. Әр құралдың орыс, қазақ және ағылшын тілдеріндегі толық нұсқаулығы бар.',
    'BOPASI is a platform of AI tools for reproductive medicine that run right on the site. Only what genuinely runs in the browser is here: no installs, no servers, no data uploads. Every tool comes with a detailed guide in Russian, Kazakh and English.'),
  contact: L('Автор и обратная связь', 'Автор және кері байланыс', 'Author and feedback'),
  noWebgl: L('Ваш браузер не поддерживает 3D — показан список инструментов.', 'Браузеріңіз 3D-ні қолдамайды — құралдар тізімі көрсетілген.', 'Your browser does not support 3D — showing the tool list.'),
  copy: L('Копировать', 'Көшіру', 'Copy'),
  copied: L('Скопировано', 'Көшірілді', 'Copied'),
  example: L('пример', 'мысал', 'example'),
};

// Главы страницы и порядок инструментов; stage — стадия развития эмбриона в анимации
const CHAPTERS = [
  { id: 'andrology', stage: 'fert', name: L('Андрология', 'Андрология', 'Andrology'),
    lead: L('Спермограмма по видео, фрагментация ДНК, подсчёт и морфология — всё, что нужно лаборатории андрологии.', 'Бейне бойынша спермограмма, ДНҚ фрагментациясы, санау және морфология — андрология зертханасына қажеттінің бәрі.', 'Video semen analysis, DNA fragmentation, counting and morphology — everything an andrology lab needs.'),
    tools: ['bopasi', 'scd', 'bluetol', 'who6', 'chamber', 'lab-counter', 'tmsc'] },
  { id: 'embryology', stage: 'cleave', name: L('Эмбриология', 'Эмбриология', 'Embryology'),
    lead: L('Снимки ооцитов и эмбрионов: перевод контраста, измерения, грейдинг и морфокинетика.', 'Ооциттер мен эмбриондар суреттері: контрастты аудару, өлшеулер, грейдинг және морфокинетика.', 'Oocyte and embryo images: contrast conversion, measurements, grading and morphokinetics.'),
    tools: ['rc-phase', 'morphometry', 'cleavage', 'kinetics', 'gardner'] },
  { id: 'reproduction', stage: 'blast', name: L('Репродуктология', 'Репродуктология', 'Reproductive medicine'),
    lead: L('Овариальный резерв, сроки, ХГЧ и фертильное окно — калькуляторы для практики ВРТ.', 'Аналық без резерві, мерзімдер, ХГЧ және фертильді терезе — ҚРТ тәжірибесіне арналған калькуляторлар.', 'Ovarian reserve, dates, hCG and the fertile window — calculators for ART practice.'),
    tools: ['poseidon', 'due-date', 'hcg-doubling', 'fertile-window'] },
  { id: 'drug', stage: 'hatch', name: L('Дизайн препаратов', 'Дәрі дизайны', 'Drug design'),
    lead: L('Учебный 3D-конструктор: орган, мишень с реальной структурой и свойства молекулы.', 'Оқу 3D-конструкторы: мүше, нақты құрылымы бар нысана және молекула қасиеттері.', 'A learning 3D constructor: organ, a target with a real structure and molecule properties.'),
    tools: ['constructor'] },
];

// Короткие имена для карточек
const SHORT = {
  'bopasi': 'BOPASI',
  'scd': L('SCD / Halo · DFI', 'SCD / Halo · DFI', 'SCD / Halo · DFI'),
  'bluetol': L('Блютол · DFI', 'Блютол · DFI', 'Bluetol · DFI'),
  'who6': L('Заключение ВОЗ-6', 'ДДҰ-6 қорытындысы', 'WHO-6 report'),
  'chamber': L('Камера · концентрация', 'Камера · концентрация', 'Chamber count'),
  'lab-counter': L('Лабораторный счётчик', 'Зертханалық санауыш', 'Lab counter'),
  'tmsc': 'TMSC',
  'rc-phase': 'RC ⇄ PC',
  'morphometry': L('Морфометрия', 'Морфометрия', 'Morphometry'),
  'cleavage': L('Грейд 2–3 дня', '2–3 күн грейді', 'Day 2–3 grade'),
  'kinetics': L('Морфокинетика', 'Морфокинетика', 'Morphokinetics'),
  'gardner': L('Грейд Гарднера', 'Гарднер грейді', 'Gardner grade'),
  'poseidon': 'POSEIDON',
  'due-date': L('Срок родов', 'Босану мерзімі', 'Due date'),
  'hcg-doubling': L('Удвоение ХГЧ', 'ХГЧ екі еселенуі', 'hCG doubling'),
  'fertile-window': L('Фертильное окно', 'Фертильді терезе', 'Fertile window'),
  'constructor': L('Конструктор препаратов', 'Дәрі конструкторы', 'Drug constructor'),
};

const GLYPH = {
  'bopasi': 'sperm', 'scd': 'halo', 'bluetol': 'nucleus', 'who6': 'report', 'chamber': 'grid', 'lab-counter': 'tally', 'tmsc': 'sperm',
  'rc-phase': 'oocyte', 'morphometry': 'ruler', 'cleavage': 'embryo', 'kinetics': 'clock', 'gardner': 'blast',
  'poseidon': 'ovary', 'due-date': 'calendar', 'hcg-doubling': 'curve', 'fertile-window': 'calendar', 'constructor': 'molecule',
};

// Подписи стадий эмбриона в анимации
const STAGE_LABEL = {
  zygote: L('Зигота · 2 пронуклеуса', 'Зигота · 2 пронуклеус', 'Zygote · 2 pronuclei'),
  fert: L('Оплодотворение', 'Ұрықтану', 'Fertilization'),
  c2: L('2 клетки · день 1', '2 жасуша · 1-күн', '2 cells · day 1'),
  c4: L('4 клетки · день 2', '4 жасуша · 2-күн', '4 cells · day 2'),
  c8: L('8 клеток · день 3', '8 жасуша · 3-күн', '8 cells · day 3'),
  morula: L('Морула · день 4', 'Морула · 4-күн', 'Morula · day 4'),
  blast: L('Бластоциста · день 5', 'Бластоциста · 5-күн', 'Blastocyst · day 5'),
  hatch: L('Хетчинг · день 6', 'Хетчинг · 6-күн', 'Hatching · day 6'),
};

let LANG = 'ru';
const tr = (t) => (t == null ? '' : typeof t === 'string' ? t : t[LANG] || t.ru);
