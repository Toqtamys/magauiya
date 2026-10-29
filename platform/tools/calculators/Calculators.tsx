'use client';
import { useMemo, useState } from 'react';
import { L, UI, tr, type Lang } from '@/lib/i18n';
import type { Interactive } from '@/data/types';

const card = 'rounded-3xl border border-line bg-white p-6 shadow-card';
const field = 'w-full rounded-xl border border-line bg-mist/40 px-3.5 py-2.5 text-sm outline-none focus:border-blue';
const lbl = 'block text-xs font-semibold text-navy/70 mb-1.5';
const res = 'rounded-2xl bg-gradient-to-br from-deep to-blue p-5 text-white';

function fmtDate(d: Date, lang: Lang) {
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export function Calculator({ kind, lang }: { kind: Interactive; lang: Lang }) {
  if (kind === 'duedate') return <DueDate lang={lang} />;
  if (kind === 'hcg') return <Hcg lang={lang} />;
  if (kind === 'tmsc') return <Tmsc lang={lang} />;
  if (kind === 'fertile') return <Fertile lang={lang} />;
  if (kind === 'gardner') return <Gardner lang={lang} />;
  return null;
}

function DueDate({ lang }: { lang: Lang }) {
  const [method, setMethod] = useState<'lmp' | 'transfer'>('lmp');
  const [date, setDate] = useState('');
  const [cycle, setCycle] = useState(28);
  const [emb, setEmb] = useState(5);
  const out = useMemo(() => {
    if (!date) return null;
    const d = new Date(date + 'T00:00:00'); if (isNaN(+d)) return null;
    let conception: Date, edd: Date;
    if (method === 'lmp') { conception = addDays(d, 14 + (cycle - 28)); edd = addDays(d, 280 + (cycle - 28)); }
    else { conception = addDays(d, -emb); edd = addDays(conception, 266); }
    const start = addDays(conception, -14);
    const ga = Math.max(0, Math.floor((Date.now() - +start) / 86400000));
    return { edd, conception, start, hcg: addDays(conception, 9), t1end: addDays(start, 13 * 7), wk: Math.floor(ga / 7), day: ga % 7 };
  }, [method, date, cycle, emb]);
  return (
    <div className={card}>
      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-full bg-mist p-1 text-xs font-semibold">
        <button onClick={() => setMethod('lmp')} className={`rounded-full py-2 ${method === 'lmp' ? 'bg-white text-blue shadow' : 'text-navy/60'}`}>{tr(L('По ПДМ', 'СЕК бойынша', 'By LMP'), lang)}</button>
        <button onClick={() => setMethod('transfer')} className={`rounded-full py-2 ${method === 'transfer' ? 'bg-white text-blue shadow' : 'text-navy/60'}`}>{tr(L('По переносу (ВРТ)', 'Тасымалдау (ҚРТ)', 'By transfer (ART)'), lang)}</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={lbl}>{method === 'lmp' ? tr(L('Первый день последней менструации', 'Соңғы етеккірдің бірінші күні', 'First day of last period'), lang) : tr(L('Дата переноса эмбриона', 'Эмбрион тасымалдау күні', 'Embryo transfer date'), lang)}</label><input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        {method === 'lmp'
          ? <div><label className={lbl}>{tr(L('Длина цикла, дней', 'Цикл ұзақтығы, күн', 'Cycle length, days'), lang)}</label><input type="number" className={field} value={cycle} min={20} max={45} onChange={(e) => setCycle(+e.target.value)} /></div>
          : <div><label className={lbl}>{tr(L('Возраст эмбриона, сут', 'Эмбрион жасы, тәул', 'Embryo age, days'), lang)}</label><select className={field} value={emb} onChange={(e) => setEmb(+e.target.value)}><option value={3}>3 ({tr(L('дробление', 'бөліну', 'cleavage'), lang)})</option><option value={5}>5 ({tr(L('бластоциста', 'бластоциста', 'blastocyst'), lang)})</option><option value={6}>6</option></select></div>}
      </div>
      {out && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className={res}><div className="text-xs text-ice/80">{tr(L('Предполагаемая дата родов', 'Болжамды босану күні', 'Estimated due date'), lang)}</div><div className="mt-1 font-display text-xl font-semibold">{fmtDate(out.edd, lang)}</div></div>
          <div className="rounded-2xl bg-mist p-5"><div className="text-xs text-navy/60">{tr(L('Текущий срок', 'Ағымдағы мерзім', 'Current age'), lang)}</div><div className="mt-1 font-display text-xl font-semibold text-navy">{out.wk} {tr(L('нед', 'апта', 'wk'), lang)} {out.day} {tr(L('дн', 'күн', 'd'), lang)}</div></div>
          <Line a={tr(L('Зачатие / овуляция', 'Ұрықтану / овуляция', 'Conception / ovulation'), lang)} b={fmtDate(out.conception, lang)} />
          <Line a={tr(L('Тест на β-ХГЧ', 'β-ХГЧ тесті', 'β-hCG test'), lang)} b={fmtDate(out.hcg, lang)} />
          <Line a={tr(L('Конец I триместра', 'I триместр соңы', 'End of 1st trimester'), lang)} b={fmtDate(out.t1end, lang)} />
        </div>
      )}
    </div>
  );
}
const Line = ({ a, b }: { a: string; b: string }) => (
  <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm"><span className="text-navy/60">{a}</span><span className="font-semibold text-navy">{b}</span></div>
);

function Hcg({ lang }: { lang: Lang }) {
  const [v1, setV1] = useState(''); const [v2, setV2] = useState(''); const [hrs, setHrs] = useState(48);
  const out = useMemo(() => {
    const a = parseFloat(v1), b = parseFloat(v2);
    if (!a || !b || a <= 0 || b <= 0 || !hrs) return null;
    const dt = (Math.log(2) * hrs) / Math.log(b / a);
    const rise = (b / a - 1) * 100;
    const start = a < 1500 ? 49 : a < 3000 ? 40 : 33;
    const exp = (Math.pow(2, hrs / 48) - 1) * 100 * (start / 100) * (48 / 48); // грубый ориентир
    return { dt, rise, okMin: start, ok: rise >= start };
  }, [v1, v2, hrs]);
  return (
    <div className={card}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className={lbl}>β-ХГЧ 1 (мЕд/мл)</label><input type="number" className={field} value={v1} onChange={(e) => setV1(e.target.value)} /></div>
        <div><label className={lbl}>β-ХГЧ 2 (мЕд/мл)</label><input type="number" className={field} value={v2} onChange={(e) => setV2(e.target.value)} /></div>
        <div><label className={lbl}>{tr(L('Интервал, ч', 'Аралық, сағ', 'Interval, h'), lang)}</label><input type="number" className={field} value={hrs} onChange={(e) => setHrs(+e.target.value)} /></div>
      </div>
      {out && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className={res}><div className="text-xs text-ice/80">{tr(L('Время удвоения', 'Екі еселену уақыты', 'Doubling time'), lang)}</div><div className="mt-1 font-display text-xl font-semibold">{out.dt > 0 ? out.dt.toFixed(1) : '—'} {tr(L('ч', 'сағ', 'h'), lang)}</div></div>
          <div className={`rounded-2xl p-5 ${out.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}><div className="text-xs opacity-70">{tr(L('Прирост за интервал', 'Аралықтағы өсім', 'Rise over interval'), lang)}</div><div className="mt-1 font-display text-xl font-semibold">{out.rise.toFixed(0)}% <span className="text-xs font-normal opacity-70">/ ≥ {out.okMin}%</span></div></div>
        </div>
      )}
      <p className="mt-4 text-xs text-navy/50">{tr(L('Медленный прирост не диагноз — оценку делает врач вместе с УЗИ.', 'Баяу өсім диагноз емес — бағалауды дәрігер УДЗ-мен бірге жасайды.', 'A slow rise is not a diagnosis — a clinician interprets it with ultrasound.'), lang)}</p>
    </div>
  );
}

function Tmsc({ lang }: { lang: Lang }) {
  const [vol, setVol] = useState(''); const [conc, setConc] = useState(''); const [pr, setPr] = useState(''); const [np, setNp] = useState('');
  const out = useMemo(() => {
    const V = parseFloat(vol), C = parseFloat(conc), P = parseFloat(pr) || 0, N = parseFloat(np) || 0;
    if (!V || !C) return null;
    const total = V * C; const tmsc = total * (P + N) / 100;
    const guide = tmsc >= 9 ? L('TMSC ≥ 9 млн — ВМИ обоснована', 'TMSC ≥ 9 млн — ЖІҰ негізделген', 'TMSC ≥ 9 M — IUI reasonable')
      : tmsc >= 1 ? L('1–9 млн — ВМИ с меньшими шансами или ЭКО', '1–9 млн — мүмкіндігі азырақ ЖІҰ немесе ЭКҰ', '1–9 M — IUI with lower odds or IVF')
      : L('< 1 млн — обычно ИКСИ', '< 1 млн — әдетте ИКСИ', '< 1 M — usually ICSI');
    return { total, tmsc, guide };
  }, [vol, conc, pr, np]);
  return (
    <div className={card}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label className={lbl}>{tr(L('Объём, мл', 'Көлем, мл', 'Volume, mL'), lang)}</label><input type="number" step="0.1" className={field} value={vol} onChange={(e) => setVol(e.target.value)} /></div>
        <div><label className={lbl}>{tr(L('Концентрация, млн/мл', 'Концентрация, млн/мл', 'Concentration, M/mL'), lang)}</label><input type="number" className={field} value={conc} onChange={(e) => setConc(e.target.value)} /></div>
        <div><label className={lbl}>PR %</label><input type="number" className={field} value={pr} onChange={(e) => setPr(e.target.value)} /></div>
        <div><label className={lbl}>NP %</label><input type="number" className={field} value={np} onChange={(e) => setNp(e.target.value)} /></div>
      </div>
      {out && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className={res}><div className="text-xs text-ice/80">TMSC</div><div className="mt-1 font-display text-xl font-semibold">{out.tmsc.toFixed(1)} {tr(L('млн', 'млн', 'M'), lang)}</div></div>
          <div className="rounded-2xl bg-mist p-5 text-sm font-medium text-navy">{tr(out.guide, lang)}</div>
        </div>
      )}
    </div>
  );
}

function Fertile({ lang }: { lang: Lang }) {
  const [date, setDate] = useState(''); const [cycle, setCycle] = useState(28); const [luteal, setLuteal] = useState(14);
  const out = useMemo(() => {
    if (!date) return null; const d = new Date(date + 'T00:00:00'); if (isNaN(+d)) return null;
    return [0, 1, 2].map((k) => {
      const start = addDays(d, cycle * k); const ovu = addDays(start, cycle - luteal);
      return { start, ovu, from: addDays(ovu, -5), to: ovu };
    });
  }, [date, cycle, luteal]);
  return (
    <div className={card}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className={lbl}>{tr(L('Первый день цикла', 'Цикл бірінші күні', 'First day of cycle'), lang)}</label><input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className={lbl}>{tr(L('Длина цикла', 'Цикл ұзақтығы', 'Cycle length'), lang)}</label><input type="number" className={field} value={cycle} onChange={(e) => setCycle(+e.target.value)} /></div>
        <div><label className={lbl}>{tr(L('Лютеиновая фаза', 'Лютеин фазасы', 'Luteal phase'), lang)}</label><input type="number" className={field} value={luteal} onChange={(e) => setLuteal(+e.target.value)} /></div>
      </div>
      {out && (
        <div className="mt-5 space-y-2">
          {out.map((o, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-3 text-sm">
              <span className="text-navy/60">{tr(L('Цикл', 'Цикл', 'Cycle'), lang)} {i + 1}</span>
              <span className="font-medium text-navy">{tr(L('Окно', 'Терезе', 'Window'), lang)}: {fmtDate(o.from, lang)} – {fmtDate(o.to, lang)}</span>
              <span className="font-semibold text-blue">{tr(L('Овуляция', 'Овуляция', 'Ovulation'), lang)} {fmtDate(o.ovu, lang)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Gardner({ lang }: { lang: Lang }) {
  const [exp, setExp] = useState(4); const [icm, setIcm] = useState('A'); const [te, setTe] = useState('A');
  const expDesc: Record<number, any> = {
    1: L('Ранняя: полость < половины объёма', 'Ерте: қуыс көлемнің < жартысы', 'Early: cavity < half the volume'),
    2: L('Полость > половины объёма', 'Қуыс көлемнің > жартысы', 'Cavity > half the volume'),
    3: L('Полная бластоциста, полость заполняет эмбрион', 'Толық бластоциста, қуыс эмбрионды толтырады', 'Full: cavity fills the embryo'),
    4: L('Расширенная, зона истончена', 'Кеңейген, аймақ жұқарған', 'Expanded, zona thinned'),
    5: L('Начало хетчинга', 'Хетчинг басы', 'Hatching'),
    6: L('Полный хетчинг', 'Толық хетчинг', 'Hatched'),
  };
  const grade = exp <= 2 ? `${exp}` : `${exp}${icm}${te}`;
  const score = exp >= 3 ? (icm === 'A' ? 2 : icm === 'B' ? 1 : 0) + (te === 'A' ? 2 : te === 'B' ? 1 : 0) : -1;
  const cat = exp < 3 ? L('ранняя стадия', 'ерте саты', 'early stage')
    : score >= 4 ? L('отличная', 'өте жақсы', 'excellent') : score === 3 ? L('хорошая', 'жақсы', 'good') : score === 2 ? L('удовлетворительная', 'қанағаттанарлық', 'fair') : L('плохая', 'нашар', 'poor');
  return (
    <div className={card}>
      <div className="space-y-4">
        <div>
          <label className={lbl}>{tr(L('Степень расширения', 'Кеңею дәрежесі', 'Expansion'), lang)}: {exp}</label>
          <input type="range" min={1} max={6} value={exp} onChange={(e) => setExp(+e.target.value)} className="w-full accent-blue" />
          <p className="mt-1 text-xs text-navy/55">{tr(expDesc[exp], lang)}</p>
        </div>
        {exp >= 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={lbl}>{tr(L('ВКМ (внутр. клеточная масса)', 'ІЖМ', 'ICM'), lang)}</label><div className="flex gap-1.5">{['A', 'B', 'C'].map((g) => <button key={g} onClick={() => setIcm(g)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${icm === g ? 'bg-blue text-white' : 'bg-mist text-navy/70'}`}>{g}</button>)}</div></div>
            <div><label className={lbl}>{tr(L('Трофэктодерма', 'Трофэктодерма', 'Trophectoderm'), lang)}</label><div className="flex gap-1.5">{['A', 'B', 'C'].map((g) => <button key={g} onClick={() => setTe(g)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${te === g ? 'bg-blue text-white' : 'bg-mist text-navy/70'}`}>{g}</button>)}</div></div>
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-br from-deep to-blue p-5 text-white">
        <div><div className="text-xs text-ice/80">{tr(L('Грейд по Гарднеру', 'Гарднер грейді', 'Gardner grade'), lang)}</div><div className="font-display text-3xl font-semibold">{grade}</div></div>
        <div className="text-right"><div className="text-xs text-ice/80">{tr(L('Категория', 'Санат', 'Category'), lang)}</div><div className="font-display text-lg font-semibold capitalize">{tr(cat, lang)}</div></div>
      </div>
    </div>
  );
}
