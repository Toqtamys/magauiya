'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { L, UI, tr, type Lang } from '@/lib/i18n';
import { ORGANS, organById, type Target } from './targets';
import { MolViewer } from './MolViewer';
import { useRdkit, analyze, tanimoto, type Props } from './rdkit';
import { generateAnalogues } from './generate';

const Anatomy3D = dynamic(() => import('./Anatomy3D'), { ssr: false, loading: () => <div className="grid h-full place-items-center rounded-2xl bg-mist text-sm text-navy/50">3D…</div> });

type Tab = 'drug' | 'own' | 'gen';

export function Constructor({ lang }: { lang: Lang }) {
  const rdkit = useRdkit();
  const [organId, setOrganId] = useState<string | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [tab, setTab] = useState<Tab>('drug');
  const [smiles, setSmiles] = useState('');
  const [input, setInput] = useState('');
  const [analogues, setAnalogues] = useState<string[]>([]);
  const organ = organId ? organById(organId) : null;

  useEffect(() => { if (organ && organ.targets[0]) { setTarget(organ.targets[0]); } }, [organId]);
  useEffect(() => { if (target) { setSmiles(target.native.smiles); setTab('drug'); setAnalogues([]); } }, [target]);

  const props = useMemo<Props | null>(() => (rdkit && smiles ? analyze(rdkit, smiles) : null), [rdkit, smiles]);
  const sim = useMemo(() => (rdkit && smiles && target ? tanimoto(rdkit, smiles, target.native.smiles) : null), [rdkit, smiles, target]);

  function applyOwn() { const s = input.trim(); if (s) setSmiles(s); }
  function doGenerate() {
    if (!rdkit) return;
    const list = generateAnalogues(rdkit, smiles, 10);
    setAnalogues(list);
  }
  function dock() {
    if (!target) return;
    download(`${target.pdb}_receptor.txt`, `# Загрузите структуру ${target.pdb} с https://files.rcsb.org/download/${target.pdb}.pdb\n# Мишень: ${target.gene}\n`);
    download('ligand.smi', smiles + ' ligand\n');
    window.open('https://molmoda.org', '_blank');
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-4 shadow-card sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* 3D тело */}
        <div className="flex flex-col">
          <div className="h-[360px] overflow-hidden rounded-2xl sm:h-[440px]">
            <Anatomy3D lang={lang} selected={organId} onSelect={setOrganId} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ORGANS.map((o) => (
              <button key={o.id} onClick={() => setOrganId(o.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${organId === o.id ? 'bg-navy text-white' : 'bg-mist text-navy/65 hover:bg-ice'}`}>
                {tr(o.name, lang)}
              </button>
            ))}
          </div>
        </div>

        {/* правая панель */}
        <div>
          {!organ ? (
            <div className="grid h-full min-h-[300px] place-items-center rounded-2xl border border-dashed border-line bg-mist/40 p-8 text-center">
              <div>
                <p className="font-display text-lg font-semibold text-navy">{tr(L('Выберите орган', 'Мүшені таңдаңыз', 'Choose an organ'), lang)}</p>
                <p className="mt-2 text-sm text-navy/60">{tr(L('Кликните по светящейся точке на 3D-модели или по кнопке ниже.', '3D-модельдегі жарық нүктені немесе төмендегі батырманы басыңыз.', 'Click a glowing node on the 3D model or a button below.'), lang)}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {organ.targets.map((t) => (
                  <button key={t.id} onClick={() => setTarget(t)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${target?.id === t.id ? 'border-blue bg-blue/10 text-blue' : 'border-line text-navy/70 hover:bg-mist'}`}>
                    {tr(t.name, lang)}
                  </button>
                ))}
              </div>

              {target && (
                <>
                  <p className="mt-3 text-sm leading-relaxed text-navy/70">{tr(target.about, lang)}</p>
                  <div className="mt-4"><MolViewer pdb={target.pdb} ligand={target.ligand} lang={lang} /></div>

                  {/* вкладки выбора молекулы */}
                  <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-full bg-mist p-1 text-xs font-semibold">
                    {([['drug', L('Готовый препарат', 'Дайын препарат', 'Approved drug')], ['own', L('Своя молекула', 'Өз молекулаң', 'Your molecule')], ['gen', L('Аналоги', 'Аналогтар', 'Analogues')]] as const).map(([k, lab]) => (
                      <button key={k} onClick={() => setTab(k)} className={`rounded-full py-2 transition ${tab === k ? 'bg-white text-blue shadow' : 'text-navy/60'}`}>{tr(lab, lang)}</button>
                    ))}
                  </div>

                  <div className="mt-3">
                    {tab === 'drug' && (
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setSmiles(target.native.smiles)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${smiles === target.native.smiles ? 'bg-blue text-white' : 'bg-mist text-navy/70'}`}>
                          {target.native.name} · {tr(L('нативный', 'нативті', 'native'), lang)}
                        </button>
                        {target.drugs.map((d) => (
                          <button key={d.name} onClick={() => setSmiles(d.smiles)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${smiles === d.smiles ? 'bg-blue text-white' : 'bg-mist text-navy/70'}`}>{d.name}</button>
                        ))}
                      </div>
                    )}
                    {tab === 'own' && (
                      <div className="flex gap-2">
                        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="SMILES, напр. CC(=O)Oc1ccccc1C(=O)O"
                          className="flex-1 rounded-xl border border-line bg-mist/40 px-3 py-2 font-mono text-xs outline-none focus:border-blue" />
                        <button onClick={applyOwn} className="rounded-xl bg-blue px-4 py-2 text-xs font-semibold text-white hover:bg-deep">OK</button>
                      </div>
                    )}
                    {tab === 'gen' && (
                      <div>
                        <button onClick={doGenerate} disabled={!rdkit} className="rounded-full bg-blue px-4 py-2 text-xs font-semibold text-white hover:bg-deep disabled:opacity-50">
                          {tr(L('Сгенерировать аналоги', 'Аналогтар жасау', 'Generate analogues'), lang)}
                        </button>
                        {analogues.length > 0 && (
                          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                            {analogues.map((a) => {
                              const p = rdkit ? analyze(rdkit, a) : null; const t = rdkit ? tanimoto(rdkit, a, target.native.smiles) : null;
                              return (
                                <button key={a} onClick={() => setSmiles(a)} className={`rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${smiles === a ? 'border-blue bg-blue/10' : 'border-line hover:bg-mist'}`}>
                                  <div className="truncate font-mono text-navy/70">{a}</div>
                                  <div className="mt-0.5 text-navy/50">MW {p?.mw ?? '—'} · logP {p?.logp ?? '—'} · Tc {t ?? '—'}</div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <PropertyPanel props={props} sim={sim} lang={lang} smiles={smiles} />

                  <button onClick={dock} className="mt-4 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-deep">
                    {tr(L('Экспорт для докинга → MolModa', 'Докингке экспорт → MolModa', 'Export for docking → MolModa'), lang)}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PropertyPanel({ props, sim, lang, smiles }: { props: Props | null; sim: number | null; lang: Lang; smiles: string }) {
  if (!smiles) return null;
  if (!props) return <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{tr(L('Молекула не распознана — проверьте SMILES.', 'Молекула танылмады — SMILES тексеріңіз.', 'Molecule not recognised — check the SMILES.'), lang)}</p>;
  const rows: [string, string | number, boolean?][] = [
    ['MW', props.mw, props.mw <= 500],
    ['logP', props.logp, props.logp <= 5],
    ['TPSA', props.tpsa, props.tpsa <= 140],
    ['HBD', props.hbd, props.hbd <= 5],
    ['HBA', props.hba, props.hba <= 10],
    ['Rot. bonds', props.rotb, props.rotb <= 10],
    [tr(L('Кольца', 'Сақиналар', 'Rings'), lang), props.rings],
    ['ESOL logS', props.esol],
  ];
  return (
    <div className="mt-4 grid gap-4 rounded-2xl border border-line bg-mist/40 p-4 sm:grid-cols-[180px_1fr]">
      <div className="rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: props.svg }} />
      <div>
        {props.formula && <div className="mb-2 font-mono text-sm font-semibold text-navy">{props.formula}</div>}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
          {rows.map(([k, v, ok]) => (
            <div key={k} className="flex flex-col">
              <span className="text-navy/50">{k}</span>
              <span className={`font-semibold ${ok === undefined ? 'text-navy' : ok ? 'text-emerald-600' : 'text-amber-600'}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${props.lipinski <= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>Lipinski: {props.lipinski === 0 ? tr(L('проходит', 'өтеді', 'pass'), lang) : `${props.lipinski} ${tr(L('наруш.', 'бұзу', 'viol.'), lang)}`}</span>
          <span className={`rounded-full px-2 py-0.5 font-semibold ${props.veber ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>Veber: {props.veber ? '✓' : '✗'}</span>
          {sim != null && <span className="rounded-full bg-blue/10 px-2 py-0.5 font-semibold text-blue">{tr(L('Сходство с нативным', 'Нативтімен ұқсастық', 'Similarity to native'), lang)}: {sim}</span>}
        </div>
      </div>
    </div>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
