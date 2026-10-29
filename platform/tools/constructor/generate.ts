/** Простая генерация аналогов преобразованиями SMARTS-реакций (RDKit.js). */
const RXNS = [
  '[cH:1]>>[c:1]F',
  '[cH:1]>>[c:1]Cl',
  '[cH:1]>>[c:1]OC',
  '[cH:1]>>[c:1]C',
  '[cH:1]>>[c:1]O',
  '[CH3:1]>>[C:1]F',
  '[CH3:1]>>[C:1]C',
  '[c:1]F>>[c:1]Cl',
];

export function generateAnalogues(rdkit: any, smiles: string, max = 10): string[] {
  const seen = new Set<string>();
  let base: any;
  try { base = rdkit.get_mol(smiles); if (!base?.is_valid()) { base?.delete?.(); return []; } } catch { return []; }
  const canonBase = base.get_smiles();
  for (const rs of RXNS) {
    if (seen.size >= max) break;
    let rxn: any, ML: any, prods: any;
    try {
      rxn = rdkit.get_rxn(rs); ML = new rdkit.MolList(); ML.append(base);
      prods = rxn.run_reactants(ML, 6);
      for (let i = 0; i < prods.size() && seen.size < max; i++) {
        const row = prods.get(i);
        for (let j = 0; j < row.size(); j++) {
          const m = row.at(j);
          try { const s = m.get_smiles(); const cm = rdkit.get_mol(s); if (cm?.is_valid()) { const cs = cm.get_smiles(); if (cs !== canonBase) seen.add(cs); cm.delete(); } } catch {}
        }
      }
    } catch {} finally { try { prods?.delete?.(); } catch {} try { rxn?.delete?.(); } catch {} try { ML?.delete?.(); } catch {} }
  }
  base.delete();
  return [...seen].slice(0, max);
}
