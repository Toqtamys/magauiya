'use client';
import { useEffect, useState } from 'react';
import { asset } from '@/lib/i18n';

let rdkitPromise: Promise<any> | null = null;

declare global { interface Window { initRDKitModule?: (opts?: any) => Promise<any>; RDKit?: any } }

export function loadRdkit(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject('no window');
  if (window.RDKit) return Promise.resolve(window.RDKit);
  if (rdkitPromise) return rdkitPromise;
  rdkitPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = asset('/rdkit/RDKit_minimal.js');
    s.onload = () => {
      window.initRDKitModule!({ locateFile: () => asset('/rdkit/RDKit_minimal.wasm') })
        .then((rk: any) => { window.RDKit = rk; resolve(rk); })
        .catch(reject);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return rdkitPromise;
}

export function useRdkit() {
  const [rdkit, setRdkit] = useState<any>(null);
  useEffect(() => { let on = true; loadRdkit().then((r) => on && setRdkit(r)).catch(() => {}); return () => { on = false; }; }, []);
  return rdkit;
}

export interface Props {
  valid: boolean; formula: string; mw: number; logp: number; tpsa: number;
  hbd: number; hba: number; rotb: number; rings: number; heavy: number; qed: number; esol: number;
  lipinski: number; veber: boolean; svg: string;
}

export function analyze(rdkit: any, smiles: string): Props | null {
  let mol: any;
  try { mol = rdkit.get_mol(smiles); } catch { return null; }
  if (!mol || !mol.is_valid()) { mol?.delete?.(); return null; }
  try {
    const d = JSON.parse(mol.get_descriptors());
    const mw = d.amw ?? d.exactmw ?? 0;
    const logp = d.CrippenClogP ?? 0;
    const tpsa = d.tpsa ?? 0;
    const hbd = d.NumHBD ?? d.lipinskiHBD ?? 0;
    const hba = d.NumHBA ?? d.lipinskiHBA ?? 0;
    const rotb = d.NumRotatableBonds ?? 0;
    const rings = d.NumRings ?? 0;
    const heavy = d.NumHeavyAtoms ?? 0;
    const aromRings = d.NumAromaticRings ?? 0;
    // приближённая растворимость ESOL (Delaney): logS. ap ~ доля ароматических колец.
    const ap = rings ? aromRings / rings : 0;
    const esol = 0.16 - 0.63 * logp - 0.0062 * mw + 0.066 * rotb - 0.74 * ap;
    let lip = 0; if (mw > 500) lip++; if (logp > 5) lip++; if (hbd > 5) lip++; if (hba > 10) lip++;
    const veber = rotb <= 10 && tpsa <= 140;
    const svg = mol.get_svg(260, 200);
    let formula = '';
    try { formula = (mol.get_inchi() || '').split('/')[1] || ''; } catch { formula = ''; }
    mol.delete();
    return { valid: true, formula, mw: +mw.toFixed(1), logp: +logp.toFixed(2), tpsa: +tpsa.toFixed(0), hbd, hba, rotb, rings, heavy, qed: 0, esol: +esol.toFixed(2), lipinski: lip, veber, svg };
  } catch { mol?.delete?.(); return null; }
}

/** сходство Танимото по отпечаткам Моргана */
export function tanimoto(rdkit: any, a: string, b: string): number | null {
  try {
    const ma = rdkit.get_mol(a), mb = rdkit.get_mol(b);
    if (!ma?.is_valid() || !mb?.is_valid()) { ma?.delete?.(); mb?.delete?.(); return null; }
    const sa = ma.get_morgan_fp(JSON.stringify({ radius: 2, nBits: 2048 }));
    const sb = mb.get_morgan_fp(JSON.stringify({ radius: 2, nBits: 2048 }));
    ma.delete(); mb.delete();
    let inter = 0, ua = 0, ub = 0;
    for (let i = 0; i < sa.length; i++) {
      const x = sa[i] === '1', y = sb[i] === '1';
      if (x && y) inter++; if (x) ua++; if (y) ub++;
    }
    const uni = ua + ub - inter;
    return uni ? +(inter / uni).toFixed(2) : 0;
  } catch { return null; }
}
