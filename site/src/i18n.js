// ─── Языки и интерфейсные строки ────────────────────────────────────────────
const LANGS = ['ru', 'kk', 'en'];
const LANG_LABEL = { ru: 'Рус', kk: 'Қаз', en: 'Eng' };
const L = (ru, kk, en) => ({ ru, kk, en });

const UI = {
  tagline: L('Открытые ИИ-инструменты репродуктивной медицины', 'Репродуктивті медицинаның ашық ЖИ-құралдары', 'Open AI tools for reproductive medicine'),
  introTitle: L('Вся репродуктивная ИИ-медицина — в одном окне', 'Барлық репродуктивті ЖИ-медицина — бір терезеде', 'All of reproductive AI — in one window'),
  introLead: L(
    'Спермограмма по видео, фрагментация ДНК, перевод снимков RC ⇄ фазовый контраст, грейдинг бластоцист, калькуляторы ВРТ и 3D-конструктор препаратов. Всё работает прямо в браузере — ваши снимки и видео не покидают компьютер.',
    'Бейне бойынша спермограмма, ДНҚ фрагментациясы, RC ⇄ фазалық контраст суреттерін аудару, бластоциста грейдингі, ҚРТ калькуляторлары және дәрілердің 3D-конструкторы. Барлығы тікелей браузерде жұмыс істейді — суреттер мен бейнелер компьютеріңізден шықпайды.',
    'Video semen analysis, DNA fragmentation, RC ⇄ phase-contrast conversion, blastocyst grading, ART calculators and a 3D drug constructor. Everything runs right in your browser — your images and videos never leave your computer.'),
  scroll: L('Листайте', 'Айналдырыңыз', 'Scroll'),
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

// Главы спирали (как месяцы в «The Year of Greta») и порядок инструментов
const CHAPTERS = [
  { id: 'andrology', name: L('Андрология', 'Андрология', 'Andrology'), tools: ['bopasi', 'bluetol', 'tmsc'] },
  { id: 'embryology', name: L('Эмбриология', 'Эмбриология', 'Embryology'), tools: ['rc-phase', 'gardner'] },
  { id: 'reproduction', name: L('Репродуктология', 'Репродуктология', 'Reproductive medicine'), tools: ['due-date', 'hcg-doubling', 'fertile-window'] },
  { id: 'drug', name: L('Дизайн препаратов', 'Дәрі дизайны', 'Drug design'), tools: ['constructor'] },
];

// Короткие имена для карточек (полные — в панели инструмента)
const SHORT = {
  'bopasi': 'BOPASI',
  'bluetol': L('Блютол · DFI', 'Блютол · DFI', 'Bluetol · DFI'),
  'tmsc': 'TMSC',
  'rc-phase': 'RC ⇄ PC',
  'gardner': L('Грейд Гарднера', 'Гарднер грейді', 'Gardner grade'),
  'due-date': L('Срок родов', 'Босану мерзімі', 'Due date'),
  'hcg-doubling': L('Удвоение ХГЧ', 'ХГЧ екі еселенуі', 'hCG doubling'),
  'fertile-window': L('Фертильное окно', 'Фертильді терезе', 'Fertile window'),
  'constructor': L('Конструктор препаратов', 'Дәрі конструкторы', 'Drug constructor'),
};

// Глиф карточки
const GLYPH = {
  'bopasi': 'sperm', 'bluetol': 'nucleus', 'tmsc': 'sperm', 'rc-phase': 'oocyte', 'gardner': 'embryo',
  'due-date': 'calendar', 'hcg-doubling': 'curve', 'fertile-window': 'calendar', 'constructor': 'molecule',
};

let LANG = 'ru';
const tr = (t) => (t == null ? '' : typeof t === 'string' ? t : t[LANG] || t.ru);
