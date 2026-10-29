import { L } from '@/lib/i18n';
import type { Section } from './types';

export const SECTIONS: Section[] = [
  {
    id: 'andrology', short: '01', glyph: 'sperm',
    title: L('Андрология', 'Андрология', 'Andrology'),
    lead: L(
      'Компьютерный анализ спермы по видео и фото: концентрация, подвижность, морфология по ВОЗ-6 и фрагментация ДНК (SCD/Halo, толуидиновый синий).',
      'Бейне мен фото бойынша сперманы компьютерлік талдау: концентрация, қозғалғыштық, ДДҰ-6 бойынша морфология және ДНҚ фрагментациясы (SCD/Halo, толуидин көгі).',
      'Computer-assisted semen analysis from video and images: concentration, motility, WHO-6 morphology and DNA fragmentation (SCD/Halo, toluidine blue).'),
  },
  {
    id: 'embryology', short: '02', glyph: 'embryo',
    title: L('Эмбриология', 'Эмбриология', 'Embryology'),
    lead: L(
      'Грейдинг бластоцист, time-lapse модели, предсказание плоидности, сегментация эмбрионов и ооцитов, перевод снимков RC ⇄ фазовый контраст.',
      'Бластоциста грейдингі, time-lapse модельдер, плоидтылықты болжау, эмбрион мен ооцит сегментациясы, RC ⇄ фазалық контраст суреттерін аудару.',
      'Blastocyst grading, time-lapse models, ploidy prediction, embryo and oocyte segmentation, RC ⇄ phase-contrast image conversion.'),
  },
  {
    id: 'histology', short: '03', glyph: 'tissue',
    title: L('Гистология', 'Гистология', 'Histology'),
    lead: L(
      'Детекция и классификация ядер, сегментация тканей и работа с whole-slide изображениями (H&E, ИГХ).',
      'Ядроларды анықтау және жіктеу, тіндерді сегментациялау және whole-slide суреттерімен жұмыс (H&E, ИГХ).',
      'Nucleus detection and classification, tissue segmentation and whole-slide image workflows (H&E, IHC).'),
  },
  {
    id: 'reproduction', short: '04', glyph: 'calendar',
    title: L('Репродуктология', 'Репродуктология', 'Reproductive medicine'),
    lead: L(
      'Калькуляторы для практики ВРТ: срок родов после переноса, удвоение ХГЧ, TMSC, грейдинг по Гарднеру, фертильное окно и внешние предикторы исхода ЭКО.',
      'ҚРТ тәжірибесіне арналған калькуляторлар: тасымалдаудан кейінгі босану мерзімі, ХГЧ екі еселенуі, TMSC, Гарднер бойынша грейдинг, фертильді терезе және ЭКҰ нәтижесінің сыртқы болжағыштары.',
      'Calculators for ART practice: due date after transfer, hCG doubling, TMSC, Gardner grading, fertile window and external IVF outcome predictors.'),
  },
  {
    id: 'oncology', short: '05', glyph: 'cell',
    title: L('Онкология', 'Онкология', 'Oncology'),
    lead: L(
      'Сегментация опухолевых регионов на WSI, инстанс-сегментация раковых клеток, foundation-модели патологии и генеративные описания гистопрепаратов.',
      'WSI-дағы ісік аймақтарын сегментациялау, қатерлі жасушалардың инстанс-сегментациясы, патологияның foundation-модельдері және гистопрепараттардың генеративтік сипаттамалары.',
      'Tumor region segmentation on WSIs, cancer cell instance segmentation, pathology foundation models and generative slide reports.'),
  },
  {
    id: 'drug-design', short: '06', glyph: 'molecule',
    title: L('Дизайн препаратов и белков', 'Дәрілер мен ақуыздар дизайны', 'Drug & protein design'),
    lead: L(
      'Докинг в браузере, поиск карманов, генеративный дизайн молекул и белков — и 3D-конструктор: орган → мишень → молекула → свойства.',
      'Браузердегі докинг, қалталарды іздеу, молекулалар мен ақуыздардың генеративтік дизайны — және 3D-конструктор: мүше → нысана → молекула → қасиеттер.',
      'In-browser docking, pocket finding, generative molecule and protein design — plus a 3D constructor: organ → target → molecule → properties.'),
  },
];

export const sectionById = (id: string) => SECTIONS.find((s) => s.id === id);
