"use client";
// Страница «Как считается DFI»: формулы SCD-теста, живая схема гало и устройство нейросети
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale } from "./Providers";
import { buttonVariants } from "./ui/button";

type Loc = "ru" | "kk" | "en";
type L = Record<Loc, string>;
const T = (ru: string, kk: string, en: string): L => ({ ru, kk, en });

const COL = { large: "#3fb984", medium: "#38bdd6", small: "#f0a030", none: "#e2566f", degraded: "#a33a58", excluded: "#8a94ad" } as const;
type Cls = keyof typeof COL;
const NAME: Record<Cls, L> = {
  large: T("Большое гало", "Үлкен гало", "Large halo"),
  medium: T("Среднее гало", "Орташа гало", "Medium halo"),
  small: T("Малое гало", "Кіші гало", "Small halo"),
  none: T("Без гало", "Галосыз", "No halo"),
  degraded: T("Дегенеративное", "Дегенеративті", "Degraded"),
  excluded: T("Исключено", "Шығарылған", "Excluded"),
};
const S = {
  back: T("SCD-тест", "SCD-тест", "SCD test"),
  kicker: T("SCD / Halo · индекс фрагментации ДНК", "SCD / Halo · ДНҚ фрагментация индексі", "SCD / Halo · DNA fragmentation index"),
  h1: T("Как считается DFI", "DFI қалай есептеледі", "How DFI is calculated"),
  lead: T("После кислотной денатурации и лизиса целая ДНК расплетается в широкое гало вокруг ядра, а фрагментированная — нет. BOPASI считает такие клетки двумя способами: измеряет гало по критериям Fernández или доверяет нейросети, обученной на 2000 размеченных снимках.",
    "Қышқылдық денатурация мен лизистен кейін бүтін ДНҚ ядро айналасында кең гало түзеді, ал фрагменттелген ДНҚ — түзбейді. BOPASI мұндай жасушаларды екі тәсілмен санайды: галоны Fernández критерийлері бойынша өлшейді немесе 2000 белгіленген суретте оқытылған нейрожеліге сүйенеді.",
    "After acid denaturation and lysis, intact DNA unwinds into a wide halo around the nucleus, while fragmented DNA does not. BOPASI counts these cells in two ways: it measures the halo by the Fernández criteria, or it relies on a neural net trained on 2,000 annotated images."),
  formulaK: T("Формула", "Формула", "Formula"),
  frag: T("фрагментированные", "фрагменттелгендер", "fragmented"),
  counted: T("все учтённые клетки", "барлық есепке алынған жасушалар", "all counted cells"),
  formulaNote: T("Одна формула для обоих методов. Клетки у края кадра и слипшиеся не учитываются.", "Екі әдіске бір формула. Кадр шетіндегі және жабысқан жасушалар есепке алынбайды.", "One formula for both methods. Cells at the edge of the frame and clumped cells are not counted."),
  m1k: T("Метод 01 · классический", "01 әдіс · классикалық", "Method 01 · classic"),
  m1h: T("Измерение гало по Fernández", "Fernández бойынша гало өлшемі", "Halo measurement by Fernández"),
  demoK: T("Живая схема", "Тірі сызба", "Live diagram"),
  demoHalo: T("Ширина гало", "Гало ені", "Halo width"),
  demoPale: T("Ядро бледное или неровное", "Ядро бозғылт немесе тегіс емес", "Pale or irregular nucleus"),
  ratio: T("гало / малый диаметр", "гало / кіші диаметр", "halo / minor diameter"),
  dna: T("ДНК", "ДНҚ", "DNA"),
  intact: T("целая", "бүтін", "intact"),
  broken: T("фрагментирована", "фрагменттелген", "fragmented"),
  steps: [
    [T("Ядро", "Ядро", "Nucleus"), T("Находим тёмное ядро и его малый диаметр — ширину поперёк.", "Қараңғы ядро мен оның кіші диаметрін — көлденең енін табамыз.", "Find the dark nucleus and its minor diameter — the width across.")],
    [T("48 лучей", "48 сәуле", "48 rays"), T("От ядра во все стороны идут 48 лучей; на каждом меряем ширину гало по серединам перепадов окраски — расфокус не сдвигает край.", "Ядродан жан-жаққа 48 сәуле тартылады; әрқайсысында гало ені бояу секірісінің ортасы бойынша өлшенеді — фокустан тыс сурет шетін жылжытпайды.", "48 rays leave the nucleus in every direction; on each, the halo width is measured at the mid-points of the stain steps, so defocus does not shift the edge.")],
    [T("Медиана", "Медиана", "Median"), T("Берём медиану замеров; лучи, упёршиеся в соседнюю клетку, отбрасываем.", "Өлшемдердің медианасын аламыз; көрші жасушаға тірелген сәулелер алынып тасталады.", "Take the median; rays that run into a neighbouring cell are discarded.")],
    [T("Класс", "Класс", "Class"), T("Делим ширину гало на малый диаметр ядра и сравниваем с порогами 1/3 и 1.", "Гало енін ядроның кіші диаметріне бөліп, 1/3 және 1 табалдырықтарымен салыстырамыз.", "Divide the halo width by the nucleus’s minor diameter and compare with the 1/3 and 1 cut-offs.")],
  ] as [L, L][],
  rule: T("Правило", "Ереже", "Rule"),
  rules: {
    large: T("≥ 1", "≥ 1", "≥ 1"), medium: T("от 1/3 до 1", "1/3-тен 1-ге дейін", "1/3 to 1"), small: T("≤ 1/3, гало есть", "≤ 1/3, гало бар", "≤ 1/3, halo present"),
    none: T("гало нет, ядро окрашено нормально", "гало жоқ, ядро қалыпты боялған", "no halo, nucleus normally stained"),
    degraded: T("гало нет, ядро бледное (< 62% типичного) или неровное", "гало жоқ, ядро бозғылт (< 62%) немесе тегіс емес", "no halo, nucleus pale (< 62% of typical) or irregular"),
  } as Record<Exclude<Cls, "excluded">, L>,
  classicF: T("DFI = (малое + без гало + дегенеративные) / все учтённые × 100%", "DFI = (кіші + галосыз + дегенеративті) / барлық есепке алынған × 100%", "DFI = (small + no halo + degraded) / all counted × 100%"),
  m2k: T("Метод 02 · нейросеть", "02 әдіс · нейрожелі", "Method 02 · neural net"),
  m2h: T("YOLOv8s-seg прямо в браузере", "Браузердегі YOLOv8s-seg", "YOLOv8s-seg right in the browser"),
  pipe: [
    [T("Снимок", "Сурет", "Image"), T("вписываем в квадрат 1024 × 1024", "1024 × 1024 шаршыға сыйғызамыз", "fitted into 1024 × 1024")],
    [T("Нейросеть", "Нейрожелі", "Neural net"), T("11,8 млн параметров, ONNX Runtime Web", "11,8 млн параметр, ONNX Runtime Web", "11.8 M parameters, ONNX Runtime Web")],
    [T("Маска + 2 оценки", "Маска + 2 баға", "Mask + 2 scores"), T("«фрагментирована» и «нет», от 0 до 1", "«фрагменттелген» және «жоқ», 0-ден 1-ге", "“fragmented” and “not”, 0 to 1")],
    [T("Класс", "Класс", "Class"), T("побеждает большая оценка, если она ≥ порога 0,10", "үлкен баға жеңеді, егер ол ≥ 0,10", "the higher score wins if it is ≥ 0.10")],
  ] as [L, L][],
  nnText: T("Здесь нет формулы с размерами: нейросеть повторяет глазомер экспертов, которые разметили 2000 снимков SCD при большом увеличении. Повторные находки одной клетки вдоль хвоста склеиваются, а порог уверенности можно менять ползунком.",
    "Мұнда өлшемдері бар формула жоқ: нейрожелі 2000 SCD суретін белгілеген сарапшылардың көзін қайталайды. Құйрық бойындағы бір жасушаның қайталанған табылымдары біріктіріледі, сенімділік табалдырығын жүгірткімен өзгертуге болады.",
    "There is no size formula here: the net reproduces the eye of the experts who annotated 2,000 high-magnification SCD images. Repeated finds of one cell along its tail are merged, and the confidence threshold can be changed with a slider."),
  metricsK: T("Качество модели", "Модель сапасы", "Model quality"),
  metrics: [
    ["0,91", T("mAP50 масок · проверка авторов", "маскалар mAP50 · авторлар тексерісі", "mask mAP50 · authors’ validation")],
    ["0,86", T("точность", "дәлдік", "precision")],
    ["0,82", T("полнота", "толықтық", "recall")],
    ["24 / 24", T("находок совпали в браузере и в оригинале на 18 снимках", "табылым браузер мен түпнұсқада 18 суретте сәйкес келді", "detections matched between the browser and the original on 18 images")],
  ] as [string, L][],
  limitK: T("Ограничение", "Шектеу", "Limitation"),
  limit: T("Клетки с крупным гало у края кадра нейросеть иногда пропускает — тогда DFI выходит завышенным. Проверьте поле и добавьте пропущенные клетки вручную. Подклассы гало по Fernández есть только в классическом режиме.",
    "Кадр шетіндегі үлкен гало жасушаларын нейрожелі кейде өткізіп алады — сонда DFI жоғары шығады. Өрісті тексеріп, өткізілген жасушаларды қолмен қосыңыз. Fernández бойынша гало ішкі кластары тек классикалық режимде.",
    "The net sometimes misses large-halo cells at the edge of the frame, which inflates the DFI. Check the field and add missed cells by hand. Fernández halo subclasses exist only in classic mode."),
  scaleK: T("Интерпретация", "Түсіндіру", "Interpretation"),
  scaleH: T("Что значит результат", "Нәтиже нені білдіреді", "What the result means"),
  zones: [T("низкий", "төмен", "low"), T("пограничный", "шекаралық", "borderline"), T("высокий", "жоғары", "high")],
  scaleNote: T("Ориентиры 15% и 30% широко используются, но точные пороги зависят от набора реактивов и лаборатории. Для надёжного DFI нужно учесть не меньше 300–500 клеток — обычно это несколько полей зрения. Результат исследовательский и не заменяет заключение врача.",
    "15% және 30% бағдарлары кеңінен қолданылады, бірақ нақты табалдырықтар реактивтер жинағына және зертханаға байланысты. Сенімді DFI үшін кемінде 300–500 жасуша керек — әдетте бірнеше өріс. Нәтиже зерттеу сипатында және дәрігер қорытындысын алмастырмайды.",
    "The 15% and 30% guides are widely used, but exact cut-offs depend on the kit and the lab. A reliable DFI needs at least 300–500 cells — usually several fields. The result is for research and does not replace a clinician’s conclusion."),
  srcK: T("Источники", "Дереккөздер", "Sources"),
  open: T("Открыть SCD-тест", "SCD-тестті ашу", "Open the SCD test"),
};

// схема клетки: ядро, гало и 48 лучей; ширина гало — в долях малого диаметра
function HaloDiagram({ ratio, pale }: { ratio: number; pale: boolean }) {
  const minor = 104, major = 150, halo = ratio * minor, cx = 260, cy = 260;
  const cls: Cls = ratio >= 1 ? "large" : ratio > 1 / 3 ? "medium" : ratio > 0.05 ? "small" : pale ? "degraded" : "none";
  const rays = Array.from({ length: 48 }, (_, k) => (k / 48) * Math.PI * 2);
  const R = (a: number) => { const ex = major / 2, ey = minor / 2; return (ex * ey) / Math.hypot(ey * Math.cos(a), ex * Math.sin(a)); };
  return { cls, svg: (
    <svg viewBox="0 0 520 520" className="size-full" role="img" aria-label={`${NAME[cls].en}: ratio ${ratio.toFixed(2)}`}>
      <defs>
        <radialGradient id="hg" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#c58bd8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c58bd8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {halo > 1 && <ellipse cx={cx} cy={cy} rx={major / 2 + halo} ry={minor / 2 + halo} fill="url(#hg)" />}
      {rays.map((a, k) => {
        const r0 = R(a);
        return <line key={k} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * (r0 + halo)} y2={cy + Math.sin(a) * (r0 + halo)} stroke={COL[cls]} strokeOpacity={0.55} strokeWidth={1.2} />;
      })}
      <ellipse cx={cx} cy={cy} rx={major / 2} ry={minor / 2} fill={pale && halo <= 1 ? "#8a6f98" : "#4a1f63"} stroke={COL[cls]} strokeWidth={3} strokeDasharray={pale && halo <= 1 ? "6 5" : undefined} />
      <line x1={cx} y1={cy - minor / 2} x2={cx} y2={cy + minor / 2} stroke="#fff" strokeWidth={2} />
      <line x1={cx + major / 2} y1={cy} x2={cx + major / 2 + halo} y2={cy} stroke="#fff" strokeWidth={2} strokeDasharray="4 4" />
    </svg>
  ) };
}

const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.8, ease: [0.2, 0.7, 0.2, 1] as const } };
const kick = "font-mono text-xs font-semibold uppercase tracking-x text-white/55";

export function ScdMethod() {
  const loc = useLocale() as Loc;
  const t = (x: L) => x[loc] ?? x.ru;
  const [ratio, setRatio] = useState(0.7);
  const [pale, setPale] = useState(false);
  const d = HaloDiagram({ ratio, pale });
  const intact = d.cls === "large" || d.cls === "medium";
  return (
    <main className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 md:px-12">
      <Link href="/t/scd/" className={buttonVariants({ variant: "dark", size: "sm" })}><ArrowLeft className="size-4" />{t(S.back)}</Link>

      {/* заголовок и формула */}
      <motion.header {...fade} className="mt-12">
        <p className={kick}>{t(S.kicker)}</p>
        <h1 className="mt-4 font-display text-[clamp(48px,8vw,128px)] font-bold uppercase leading-[0.9]">{t(S.h1)}</h1>
        <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-white/75">{t(S.lead)}</p>
      </motion.header>
      <motion.section {...fade} className="mt-16 border-y border-white/15 py-12">
        <p className={kick}>{t(S.formulaK)}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 font-display text-[clamp(28px,4.4vw,64px)] font-bold uppercase leading-none">
          <span>DFI</span><span className="text-white/40">=</span>
          <span className="inline-grid text-center">
            <span className="px-2 pb-3" style={{ color: COL.none }}>{t(S.frag)}</span>
            <span className="border-t-2 border-white px-2 pt-3">{t(S.counted)}</span>
          </span>
          <span className="text-white/40">×</span><span>100%</span>
        </div>
        <p className="mt-8 max-w-[60ch] text-white/60">{t(S.formulaNote)}</p>
      </motion.section>

      {/* метод 1 */}
      <section className="mt-28">
        <motion.div {...fade}><p className={kick}>{t(S.m1k)}</p><h2 className="mt-3 font-display text-[clamp(36px,5.4vw,80px)] font-bold uppercase leading-[0.95]">{t(S.m1h)}</h2></motion.div>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <motion.div {...fade} className="border border-white/15 bg-black p-6 md:p-8">
            <p className={kick}>{t(S.demoK)}</p>
            <div className="mx-auto mt-4 aspect-square w-full max-w-[420px]">{d.svg}</div>
            <label className="mt-4 block">
              <span className="flex justify-between font-mono text-xs font-semibold uppercase tracking-x text-white/70"><span>{t(S.demoHalo)}</span><span>{ratio.toFixed(2)} · {t(S.ratio)}</span></span>
              <input type="range" min={0} max={1.6} step={0.01} value={ratio} onChange={(e) => setRatio(+e.target.value)} className="mt-3 w-full accent-white" />
            </label>
            {/* шкала порогов */}
            <div className="relative mt-3 h-2" aria-hidden="true">
              <div className="absolute inset-0 flex">
                <i className="h-full" style={{ width: `${(0.05 / 1.6) * 100}%`, background: pale ? COL.degraded : COL.none }} />
                <i className="h-full" style={{ width: `${((1 / 3 - 0.05) / 1.6) * 100}%`, background: COL.small }} />
                <i className="h-full" style={{ width: `${((1 - 1 / 3) / 1.6) * 100}%`, background: COL.medium }} />
                <i className="h-full flex-1" style={{ background: COL.large }} />
              </div>
            </div>
            <div className="relative mt-2 h-4 font-mono text-[11px] text-white/50">
              <span className="absolute left-0">0</span>
              <span className="absolute -translate-x-1/2" style={{ left: `${(1 / 3 / 1.6) * 100}%` }}>1/3</span>
              <span className="absolute -translate-x-1/2" style={{ left: `${(1 / 1.6) * 100}%` }}>1</span>
              <span className="absolute right-0">1.6</span>
            </div>
            <label className="mt-5 flex items-center gap-3 font-mono text-xs uppercase tracking-x text-white/70">
              <input type="checkbox" checked={pale} onChange={(e) => setPale(e.target.checked)} className="size-4 accent-white" />{t(S.demoPale)}
            </label>
            <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-5">
              <span className="font-display text-2xl font-bold uppercase" style={{ color: COL[d.cls] }}>{t(NAME[d.cls])}</span>
              <span className="font-mono text-xs font-semibold uppercase tracking-x">{t(S.dna)}: <b style={{ color: intact ? COL.large : COL.none }}>{t(intact ? S.intact : S.broken)}</b></span>
            </div>
          </motion.div>
          <div>
            <ol className="grid gap-8">
              {S.steps.map(([h, p], i) => (
                <motion.li key={i} {...fade} transition={{ ...fade.transition, delay: i * 0.06 }} className="grid grid-cols-[56px_1fr] gap-4 border-t border-white/15 pt-6">
                  <span className="font-mono text-sm font-semibold text-white/45">{String(i + 1).padStart(2, "0")}</span>
                  <div><h3 className="font-display text-2xl font-bold uppercase">{t(h)}</h3><p className="mt-2 text-white/70">{t(p)}</p></div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
        <motion.div {...fade} className="mt-14 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead><tr className={kick}><th className="border-b border-white/20 py-3 pr-4 font-semibold">{loc === "en" ? "Class" : "Класс"}</th><th className="border-b border-white/20 py-3 pr-4 font-semibold">{t(S.rule)}</th><th className="border-b border-white/20 py-3 font-semibold">{t(S.dna)}</th></tr></thead>
            <tbody>
              {(["large", "medium", "small", "none", "degraded"] as const).map((k) => (
                <tr key={k} className="border-b border-white/10">
                  <td className="py-4 pr-4"><span className="inline-flex items-center gap-3 font-display text-lg font-bold uppercase"><i className="size-3 rounded-full" style={{ background: COL[k] }} />{t(NAME[k])}</span></td>
                  <td className="py-4 pr-4 font-mono text-sm text-white/75">{t(S.rules[k])}</td>
                  <td className="py-4 font-mono text-xs font-semibold uppercase tracking-x" style={{ color: k === "large" || k === "medium" ? COL.large : COL.none }}>{t(k === "large" || k === "medium" ? S.intact : S.broken)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-6 font-mono text-sm text-white/80">{t(S.classicF)}</p>
        </motion.div>
      </section>

      {/* метод 2 */}
      <section className="mt-32">
        <motion.div {...fade}><p className={kick}>{t(S.m2k)}</p><h2 className="mt-3 font-display text-[clamp(36px,5.4vw,80px)] font-bold uppercase leading-[0.95]">{t(S.m2h)}</h2></motion.div>
        <div className="mt-12 grid gap-px bg-white/15 md:grid-cols-4">
          {S.pipe.map(([h, p], i) => (
            <motion.div key={i} {...fade} transition={{ ...fade.transition, delay: i * 0.08 }} className="relative bg-black p-6">
              <span className="font-mono text-sm font-semibold text-white/45">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-6 font-display text-2xl font-bold uppercase">{t(h)}</h3>
              <p className="mt-2 text-white/65">{t(p)}</p>
              {i < 3 && <ArrowRight className="absolute right-5 top-6 hidden size-5 text-white/40 md:block" />}
            </motion.div>
          ))}
        </div>
        <motion.p {...fade} className="mt-10 max-w-[70ch] text-lg leading-relaxed text-white/75">{t(S.nnText)}</motion.p>
        <motion.div {...fade} className="mt-12">
          <p className={kick}>{t(S.metricsK)}</p>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {S.metrics.map(([v, l], i) => (
              <div key={i} className="border-l border-white/30 pl-5">
                <p className="font-display text-5xl font-bold">{v}</p>
                <p className="mt-2 font-mono text-xs uppercase leading-relaxed tracking-x text-white/55">{t(l)}</p>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div {...fade} className="mt-12 border-l-2 pl-6" style={{ borderColor: COL.small }}>
          <p className={kick}>{t(S.limitK)}</p>
          <p className="mt-3 max-w-[70ch] text-white/80">{t(S.limit)}</p>
        </motion.div>
      </section>

      {/* шкала DFI */}
      <section className="mt-32">
        <motion.div {...fade}><p className={kick}>{t(S.scaleK)}</p><h2 className="mt-3 font-display text-[clamp(36px,5.4vw,80px)] font-bold uppercase leading-[0.95]">{t(S.scaleH)}</h2></motion.div>
        <motion.div {...fade} className="mt-12">
          <div className="flex h-16 overflow-hidden">
            <div className="flex items-end bg-[#1f6b4d] p-3" style={{ width: "15%" }}><span className="font-mono text-xs font-semibold uppercase tracking-x">{t(S.zones[0])}</span></div>
            <div className="flex items-end bg-[#8a6a1f] p-3" style={{ width: "15%" }}><span className="font-mono text-xs font-semibold uppercase tracking-x">{t(S.zones[1])}</span></div>
            <div className="flex flex-1 items-end bg-[#7a2338] p-3"><span className="font-mono text-xs font-semibold uppercase tracking-x">{t(S.zones[2])}</span></div>
          </div>
          <div className="relative mt-2 h-5 font-mono text-xs text-white/60">
            <span className="absolute left-0">0%</span><span className="absolute" style={{ left: "15%", transform: "translateX(-50%)" }}>15%</span>
            <span className="absolute" style={{ left: "30%", transform: "translateX(-50%)" }}>30%</span><span className="absolute right-0">100%</span>
          </div>
          <p className="mt-8 max-w-[70ch] text-white/70">{t(S.scaleNote)}</p>
        </motion.div>
      </section>

      {/* источники */}
      <motion.section {...fade} className="mt-28 border-t border-white/15 pt-10">
        <p className={kick}>{t(S.srcK)}</p>
        <ul className="mt-6 grid gap-3 text-white/70">
          <li>Fernández J. L. et al. The sperm chromatin dispersion test: a simple method for the determination of sperm DNA fragmentation. J Androl. 2003;24(1):59–66.</li>
          <li>Fernández J. L. et al. Simple determination of human sperm DNA fragmentation with an improved sperm chromatin dispersion test. Fertil Steril. 2005;84(4):833–842.</li>
          <li>Ornelas Nande E. J., Adel Domínguez M. A., Mora Topete A., Magdaleno Márquez L. E., Aranguren I., Valdivia-G A., Sanchez O. D. Sperm chromatin dispersion microscopy image dataset for instance segmentation. Zenodo, 2026. CC BY 4.0.</li>
          <li>Ultralytics YOLOv8 (AGPL-3.0) · ONNX Runtime Web (MIT).</li>
        </ul>
        <Link href="/t/scd/" className={buttonVariants({ className: "mt-12" })}>{t(S.open)}<ArrowRight className="size-4" /></Link>
      </motion.section>
    </main>
  );
}
