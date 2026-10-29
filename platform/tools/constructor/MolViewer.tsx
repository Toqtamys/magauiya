'use client';
import { useEffect, useRef, useState } from 'react';
import { L, tr, type Lang } from '@/lib/i18n';

/* 3D-просмотр мишени из RCSB PDB через 3Dmol.js. Загружается в браузере пользователя. */
export function MolViewer({ pdb, ligand, lang }: { pdb: string; ligand?: string; lang: Lang }) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'load' | 'ok' | 'err'>('load');

  useEffect(() => {
    let viewer: any; let cancelled = false;
    setStatus('load');
    (async () => {
      try {
        const $3Dmol: any = await import('3dmol/build/3Dmol-min.js').catch(() => import('3dmol'));
        const mol = $3Dmol.default ?? $3Dmol;
        const res = await fetch(`https://files.rcsb.org/download/${pdb}.pdb`);
        if (!res.ok) throw new Error('pdb');
        const data = await res.text();
        if (cancelled || !host.current) return;
        host.current.innerHTML = '';
        viewer = mol.createViewer(host.current, { backgroundColor: '#06123a' });
        viewer.addModel(data, 'pdb');
        viewer.setStyle({}, { cartoon: { colorscheme: { prop: 'b', gradient: 'roygb', min: 0, max: 100 }, opacity: 0.9 } });
        // лиганд: по коду, иначе любые HETATM кроме воды
        const sel = ligand ? { resn: ligand } : { hetflag: true, not: { resn: ['HOH', 'WAT'] } };
        viewer.setStyle(sel, { stick: { radius: 0.22, colorscheme: 'cyanCarbon' }, sphere: { scale: 0.32 } });
        viewer.addSurface(mol.SurfaceType.VDW, { opacity: 0.6, color: '#8fe0fa' }, sel);
        viewer.zoomTo(sel);
        viewer.zoom(0.75);
        viewer.render();
        viewer.spin('y', 0.4);
        setStatus('ok');
      } catch { if (!cancelled) setStatus('err'); }
    })();
    return () => { cancelled = true; try { viewer?.clear?.(); } catch {} };
  }, [pdb, ligand]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-navy" style={{ minHeight: 320 }}>
      <div ref={host} className="h-[340px] w-full" style={{ position: 'relative' }} />
      {status !== 'ok' && (
        <div className="absolute inset-0 grid place-items-center text-sm text-ice/70">
          {status === 'load' ? tr(L('Загрузка структуры из RCSB PDB…', 'RCSB PDB-дан құрылым жүктелуде…', 'Loading structure from RCSB PDB…'), lang)
            : tr(L('Не удалось загрузить структуру. Откройте на сайте RCSB PDB.', 'Құрылымды жүктеу мүмкін болмады. RCSB PDB сайтында ашыңыз.', 'Could not load the structure. Open it on RCSB PDB.'), lang)}
        </div>
      )}
      <a href={`https://www.rcsb.org/structure/${pdb}`} target="_blank" rel="noreferrer" className="absolute right-2 top-2 rounded bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur hover:bg-white/25">PDB {pdb} ↗</a>
    </div>
  );
}
