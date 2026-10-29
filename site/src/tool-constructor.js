// ─── Инструмент: 3D-конструктор препаратов ──────────────────────────────────
// Органы → мишени (реальные структуры RCSB PDB, проверенные коды) → молекулы.
const SMI = {
  testosterone: 'C[C@]12CC[C@H]3[C@@H](CCC4=CC(=O)CC[C@@]34C)[C@@H]1CC[C@@H]2O',
  enzalutamide: 'CNC(=O)c1ccc(N2C(=S)N(c3ccc(C#N)c(C(F)(F)F)c3)C(=O)C2(C)C)cc1F',
  bicalutamide: 'CC(O)(CS(=O)(=O)c1ccc(F)cc1)C(=O)Nc1ccc(C#N)c(C(F)(F)F)c1',
  finasteride: 'CC(C)(C)NC(=O)[C@H]1CC[C@H]2[C@@H]3CC[C@H]4NC(=O)C=C[C@]4(C)[C@H]3CC[C@]12C',
  dutasteride: 'C[C@]12CC[C@H]3[C@@H](CC[C@H]4NC(=O)C=C[C@]34C)[C@@H]1CC[C@@H]2C(=O)Nc1cc(C(F)(F)F)ccc1C(F)(F)F',
  abiraterone: 'C[C@]12CC[C@H](O)CC1=CC[C@@H]1[C@@H]2CC[C@]2(C)C(c3cccnc3)=CC[C@@H]12',
  sildenafil: 'CCCc1nn(C)c2c(=O)[nH]c(-c3cc(S(=O)(=O)N4CCN(C)CC4)ccc3OCC)nc12',
  tadalafil: 'CN1CC(=O)N2[C@H](Cc3c([nH]c4ccccc34)[C@H]2c2ccc3c(c2)OCO3)C1=O',
  androstenedione: 'C[C@]12CC[C@H]3[C@@H](CCC4=CC(=O)CC[C@@]34C)[C@@H]1CCC2=O',
  letrozole: 'N#Cc1ccc(C(c2ccc(C#N)cc2)n2cncn2)cc1',
  anastrozole: 'CC(C)(C#N)c1cc(Cn2cncn2)cc(C(C)(C)C#N)c1',
  ohtam: 'CC/C(=C(\\c1ccc(O)cc1)c1ccc(OCCN(C)C)cc1)c1ccccc1',
  estradiol: 'C[C@]12CC[C@H]3[C@@H](CCc4cc(O)ccc34)[C@@H]1CC[C@@H]2O',
  clomiphene: 'CCN(CC)CCOc1ccc(C(=C(Cl)c2ccccc2)c2ccccc2)cc1',
  tamoxifen: 'CC/C(=C(\\c1ccccc1)c1ccc(OCCN(C)C)cc1)c1ccccc1',
  progesterone: 'CC(=O)[C@H]1CC[C@H]2[C@@H]3CCC4=CC(=O)CC[C@]4(C)[C@H]3CC[C@]12C',
  mifepristone: 'CC#C[C@]1(O)CC[C@H]2[C@@H]3CCC4=CC(=O)CCC4=C3[C@@H](c3ccc(N(C)C)cc3)C[C@@]21C',
  rofecoxib: 'CS(=O)(=O)c1ccc(C2=C(c3ccccc3)C(=O)OC2)cc1',
  celecoxib: 'Cc1ccc(-c2cc(C(F)(F)F)nn2-c2ccc(S(N)(=O)=O)cc2)cc1',
  ibuprofen: 'CC(C)Cc1ccc(C(C)C(=O)O)cc1',
  elagolix: 'COc1cccc(-c2c(C)n(Cc3c(F)cccc3C(F)(F)F)c(=O)n(C[C@H](NCCCC(=O)O)c3ccccc3)c2=O)c1F',
  olaparib: 'O=C(c1cc(Cc2n[nH]c(=O)c3ccccc23)ccc1F)N1CCN(C(=O)C2CC2)CC1',
  niraparib: 'NC(=O)c1cccc2cn(-c3ccc([C@@H]4CCCNC4)cc3)nc12',
  empagliflozin: 'OC[C@H]1O[C@@H](c2ccc(Cl)c(Cc3ccc(O[C@H]4CCOC4)cc3)c2)[C@H](O)[C@@H](O)[C@@H]1O',
  dapagliflozin: 'CCOc1ccc(Cc2cc([C@@H]3O[C@H](CO)[C@@H](O)[C@H](O)[C@H]3O)ccc2Cl)cc1',
  acetazolamide: 'CC(=O)Nc1nnc(S(N)(=O)=O)s1',
  atorvastatin: 'CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CC[C@@H](O)C[C@@H](O)CC(=O)O',
  rosuvastatin: 'CC(C)c1nc(N(C)S(C)(=O)=O)nc(-c2ccc(F)cc2)c1/C=C/[C@@H](O)C[C@@H](O)CC(=O)O',
  erlotinib: 'COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC',
  gefitinib: 'COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1',
  lapatinib: 'CS(=O)(=O)CCNCc1ccc(-c2ccc3ncnc(Nc4ccc(OCc5cccc(F)c5)c(Cl)c4)c3c2)o1',
};
const D = (name, key) => ({ name, smiles: SMI[key] });

const ORGANS = [
  { id: 'pituitary', pos: [0, 2.15, 0.3], name: L('Гипофиз', 'Гипофиз', 'Pituitary'), targets: [
    { gene: 'GNRHR', pdb: '7BR3', lig: 'F5O', name: L('Рецептор ГнРГ', 'ГнРГ рецепторы', 'GnRH receptor'), about: L('Управляет выбросом ФСГ и ЛГ; антагонисты (элаголикс) применяют при эндометриозе и в протоколах ЭКО.', 'ФСГ мен ЛГ бөлінуін басқарады; антагонистер (элаголикс) эндометриозда және ЭКҰ хаттамаларында қолданылады.', 'Controls FSH and LH release; antagonists (elagolix) treat endometriosis and feature in IVF protocols.'), native: D('Elagolix', 'elagolix'), drugs: [] }] },
  { id: 'lungs', pos: [0.42, 0.95, 0.42], name: L('Лёгкие', 'Өкпе', 'Lungs'), targets: [
    { gene: 'EGFR', pdb: '1M17', lig: 'AQ4', name: L('EGFR (тирозинкиназа)', 'EGFR (тирозинкиназа)', 'EGFR (tyrosine kinase)'), about: L('Рецепторная тирозинкиназа; ингибиторы применяют при немелкоклеточном раке лёгкого.', 'Рецепторлық тирозинкиназа; ингибиторлар ұсақ жасушалы емес өкпе обырында қолданылады.', 'Receptor tyrosine kinase; inhibitors treat non-small-cell lung cancer.'), native: D('Erlotinib', 'erlotinib'), drugs: [D('Gefitinib', 'gefitinib'), D('Lapatinib', 'lapatinib')] }] },
  { id: 'breast', pos: [-0.5, 0.62, 0.55], name: L('Молочная железа', 'Сүт безі', 'Breast'), targets: [
    { gene: 'PARP1', pdb: '7KK4', lig: null, name: L('PARP1', 'PARP1', 'PARP1'), about: L('Фермент репарации ДНК; ингибиторы PARP применяют при BRCA-ассоциированном раке груди и яичников.', 'ДНҚ репарациясының ферменті; PARP ингибиторлары BRCA-мен байланысты сүт безі мен аналық без обырында қолданылады.', 'DNA-repair enzyme; PARP inhibitors treat BRCA-associated breast and ovarian cancer.'), native: D('Olaparib', 'olaparib'), drugs: [D('Niraparib', 'niraparib')] }] },
  { id: 'liver', pos: [0.42, -0.15, 0.45], name: L('Печень', 'Бауыр', 'Liver'), targets: [
    { gene: 'HMGCR', pdb: '1HWK', lig: '117', name: L('ГМГ-КоА-редуктаза', 'ГМГ-КоА-редуктаза', 'HMG-CoA reductase'), about: L('Ключевой фермент синтеза холестерина; мишень статинов.', 'Холестерин синтезінің негізгі ферменті; статиндер нысанасы.', 'Key cholesterol-synthesis enzyme; the statin target.'), native: D('Atorvastatin', 'atorvastatin'), drugs: [D('Rosuvastatin', 'rosuvastatin')] }] },
  { id: 'kidney', pos: [-0.42, -0.35, -0.2], name: L('Почки', 'Бүйрек', 'Kidneys'), targets: [
    { gene: 'SLC5A2', pdb: '7VSI', lig: '7R3', name: L('SGLT2', 'SGLT2', 'SGLT2'), about: L('Почечный переносчик глюкозы; глифлозины снижают сахар крови при диабете 2 типа.', 'Бүйректік глюкоза тасымалдағышы; глифлозиндер 2-типті диабетте қандағы қантты төмендетеді.', 'Renal glucose transporter; gliflozins lower blood glucose in type-2 diabetes.'), native: D('Empagliflozin', 'empagliflozin'), drugs: [D('Dapagliflozin', 'dapagliflozin')] },
    { gene: 'CA2', pdb: '3HS4', lig: 'AZM', name: L('Карбоангидраза II', 'Карбоангидраза II', 'Carbonic anhydrase II'), about: L('Модельный фермент структурного дизайна ингибиторов; ацетазоламид — диуретик и средство от глаукомы.', 'Ингибиторлардың құрылымдық дизайнының модельдік ферменті; ацетазоламид — диуретик және глаукомаға қарсы дәрі.', 'A model enzyme for structure-based inhibitor design; acetazolamide is a diuretic and glaucoma drug.'), native: D('Acetazolamide', 'acetazolamide'), drugs: [] }] },
  { id: 'ovary', pos: [-0.36, -1.32, 0.38], name: L('Яичники', 'Аналық бездер', 'Ovaries'), targets: [
    { gene: 'CYP19A1', pdb: '3EQM', lig: 'ASD', name: L('Ароматаза', 'Ароматаза', 'Aromatase'), about: L('Превращает андрогены в эстрогены; ингибиторы применяют для стимуляции овуляции и при раке груди.', 'Андрогендерді эстрогендерге айналдырады; ингибиторлар овуляцияны ынталандыру және сүт безі обыры кезінде қолданылады.', 'Converts androgens to oestrogens; inhibitors are used for ovulation induction and breast cancer.'), native: D('Androstenedione', 'androstenedione'), drugs: [D('Letrozole', 'letrozole'), D('Anastrozole', 'anastrozole')] },
    { gene: 'ESR1', pdb: '3ERT', lig: 'OHT', name: L('Рецептор эстрогена α', 'Эстроген рецепторы α', 'Oestrogen receptor α'), about: L('Ядерный рецептор эстрадиола; мишень тамоксифена и кломифена.', 'Эстрадиолдың ядролық рецепторы; тамоксифен мен кломифен нысанасы.', 'Nuclear oestradiol receptor; target of tamoxifen and clomiphene.'), native: D('4-Hydroxytamoxifen', 'ohtam'), drugs: [D('Estradiol', 'estradiol'), D('Clomiphene', 'clomiphene'), D('Tamoxifen', 'tamoxifen')] }] },
  { id: 'uterus', pos: [0, -1.25, 0.45], name: L('Матка', 'Жатыр', 'Uterus'), targets: [
    { gene: 'PGR', pdb: '1A28', lig: 'STR', name: L('Рецептор прогестерона', 'Прогестерон рецепторы', 'Progesterone receptor'), about: L('Ядерный рецептор прогестерона; поддерживает эндометрий и беременность. Мифепристон — антагонист.', 'Прогестеронның ядролық рецепторы; эндометрий мен жүктілікті қолдайды. Мифепристон — антагонист.', 'Nuclear progesterone receptor; maintains the endometrium and pregnancy. Mifepristone is an antagonist.'), native: D('Progesterone', 'progesterone'), drugs: [D('Mifepristone', 'mifepristone')] },
    { gene: 'PTGS2', pdb: '5KIR', lig: 'RCX', name: L('ЦОГ-2', 'ЦОГ-2', 'COX-2'), about: L('Синтезирует простагландины; ингибиторы облегчают дисменорею и воспаление.', 'Простагландиндерді синтездейді; ингибиторлар дисменорея мен қабынуды жеңілдетеді.', 'Makes prostaglandins; inhibitors relieve dysmenorrhoea and inflammation.'), native: D('Rofecoxib', 'rofecoxib'), drugs: [D('Celecoxib', 'celecoxib'), D('Ibuprofen', 'ibuprofen')] }] },
  { id: 'prostate', pos: [0, -1.62, 0.3], name: L('Простата', 'Простата', 'Prostate'), targets: [
    { gene: 'SRD5A2', pdb: '7BW1', lig: 'FIT', name: L('5α-редуктаза 2', '5α-редуктаза 2', '5α-reductase 2'), about: L('Превращает тестостерон в дигидротестостерон; ингибиторы применяют при ДГПЖ.', 'Тестостеронды дигидротестостеронға айналдырады; ингибиторлар ҚПГ кезінде қолданылады.', 'Converts testosterone to DHT; inhibitors treat benign prostatic hyperplasia.'), native: D('Finasteride', 'finasteride'), drugs: [D('Dutasteride', 'dutasteride')] },
    { gene: 'CYP17A1', pdb: '3RUK', lig: 'AER', name: L('CYP17A1', 'CYP17A1', 'CYP17A1'), about: L('Ключевой фермент синтеза андрогенов; абиратерон применяют при раке простаты.', 'Андроген синтезінің негізгі ферменті; абиратерон простата обырында қолданылады.', 'Key androgen-synthesis enzyme; abiraterone treats prostate cancer.'), native: D('Abiraterone', 'abiraterone'), drugs: [] }] },
  { id: 'cavernous', pos: [0.22, -1.82, 0.42], name: L('Кавернозная ткань', 'Кавернозды тін', 'Cavernous tissue'), targets: [
    { gene: 'PDE5A', pdb: '1UDT', lig: 'VIA', name: L('Фосфодиэстераза 5', 'Фосфодиэстераза 5', 'Phosphodiesterase 5'), about: L('Разрушает цГМФ; ингибиторы применяют при эректильной дисфункции и лёгочной гипертензии.', 'цГМФ-ты ыдыратады; ингибиторлар эректилді дисфункция мен өкпе гипертензиясында қолданылады.', 'Breaks down cGMP; inhibitors treat erectile dysfunction and pulmonary hypertension.'), native: D('Sildenafil', 'sildenafil'), drugs: [D('Tadalafil', 'tadalafil')] }] },
  { id: 'testis', pos: [-0.24, -1.92, 0.36], name: L('Яички', 'Аталық бездер', 'Testes'), targets: [
    { gene: 'AR', pdb: '2AM9', lig: 'TES', name: L('Андрогеновый рецептор', 'Андроген рецепторы', 'Androgen receptor'), about: L('Ядерный рецептор тестостерона; мишень антиандрогенов при раке простаты.', 'Тестостеронның ядролық рецепторы; простата обырында антиандрогендер нысанасы.', 'Nuclear testosterone receptor; antiandrogen target in prostate cancer.'), native: D('Testosterone', 'testosterone'), drugs: [D('Enzalutamide', 'enzalutamide'), D('Bicalutamide', 'bicalutamide')] }] },
];

const UI_DC = {
  pick: L('Выберите орган', 'Мүшені таңдаңыз', 'Choose an organ'),
  pickHint: L('Кликните светящуюся точку на модели или кнопку ниже. Модель можно вращать мышью или пальцем.', 'Модельдегі жарық нүктені немесе төмендегі батырманы басыңыз. Модельді тінтуірмен немесе саусақпен айналдыруға болады.', 'Click a glowing node on the model or a button below. Drag to rotate the model.'),
  ownTarget: L('Своя мишень', 'Өз нысанаңыз', 'Own target'),
  pdbCode: L('Код PDB, напр. 4HJO', 'PDB коды, мыс. 4HJO', 'PDB code, e.g. 4HJO'),
  load: L('Загрузить', 'Жүктеу', 'Load'),
  pdbFile: L('или файл .pdb', 'немесе .pdb файлы', 'or a .pdb file'),
  tabDrug: L('Готовый препарат', 'Дайын препарат', 'Approved drug'),
  tabOwn: L('Своя молекула', 'Өз молекулаңыз', 'Your molecule'),
  tabGen: L('Аналоги', 'Аналогтар', 'Analogues'),
  native: L('нативный лиганд', 'нативті лиганд', 'native ligand'),
  smilesPh: L('SMILES, например CC(=O)Oc1ccccc1C(=O)O', 'SMILES, мысалы CC(=O)Oc1ccccc1C(=O)O', 'SMILES, e.g. CC(=O)Oc1ccccc1C(=O)O'),
  apply: L('Применить', 'Қолдану', 'Apply'),
  molFile: L('или файл SDF/MOL', 'немесе SDF/MOL файлы', 'or an SDF/MOL file'),
  gen: L('Сгенерировать аналоги', 'Аналогтар жасау', 'Generate analogues'),
  genHint: L('Замена заместителей: H → F, Cl, OMe, CH₃, OH; CH₃ → CH₂F, этил; F → Cl. Аналоги ранжированы по сходству с нативным лигандом.', 'Орынбасушыларды ауыстыру: H → F, Cl, OMe, CH₃, OH; CH₃ → CH₂F, этил; F → Cl. Аналогтар нативті лигандпен ұқсастығы бойынша сараланған.', 'Substituent swaps: H → F, Cl, OMe, CH₃, OH; CH₃ → CH₂F, ethyl; F → Cl. Analogues are ranked by similarity to the native ligand.'),
  noAnalogues: L('Для этой молекулы замены не нашлись — попробуйте другую.', 'Бұл молекула үшін алмастыру табылмады — басқасын көріңіз.', 'No substitutions found for this molecule — try another one.'),
  bad: L('Молекула не распознана — проверьте SMILES или файл.', 'Молекула танылмады — SMILES немесе файлды тексеріңіз.', 'Molecule not recognised — check the SMILES or the file.'),
  loadingPdb: L('Загрузка структуры из RCSB PDB…', 'RCSB PDB-дан құрылым жүктелуде…', 'Loading the structure from RCSB PDB…'),
  pdbFail: L('Не удалось загрузить структуру. Проверьте код PDB и подключение к интернету.', 'Құрылымды жүктеу мүмкін болмады. PDB кодын және интернетті тексеріңіз.', 'Could not load the structure. Check the PDB code and your internet connection.'),
  rdkitLoading: L('Загрузка RDKit…', 'RDKit жүктелуде…', 'Loading RDKit…'),
  export: L('Экспорт для докинга', 'Докингке экспорт', 'Export for docking'),
  exportHint: L('Скачаются receptor.pdb и ligand.smi — откройте их в программе докинга (например, MolModa).', 'receptor.pdb және ligand.smi жүктеледі — оларды докинг бағдарламасында ашыңыз (мысалы, MolModa).', 'receptor.pdb and ligand.smi will download — open them in a docking program (e.g. MolModa).'),
  pass: L('проходит', 'өтеді', 'pass'), viol: L('наруш.', 'бұзу', 'viol.'),
  sim: L('Сходство с нативным', 'Нативтімен ұқсастық', 'Similarity to native'),
  rings: L('Кольца', 'Сақиналар', 'Rings'),
};

function rdAnalyze(rk, input) {
  let mol; try { mol = rk.get_mol(input); } catch { return null; }
  if (!mol || !mol.is_valid()) { try { mol?.delete(); } catch {} return null; }
  try {
    const d = JSON.parse(mol.get_descriptors());
    const mw = d.amw ?? d.exactmw ?? 0, logp = d.CrippenClogP ?? 0, tpsa = d.tpsa ?? 0;
    const hbd = d.NumHBD ?? 0, hba = d.NumHBA ?? 0, rotb = d.NumRotatableBonds ?? 0, rings = d.NumRings ?? 0, arom = d.NumAromaticRings ?? 0;
    const esol = 0.16 - 0.63 * logp - 0.0062 * mw + 0.066 * rotb - 0.74 * (rings ? arom / rings : 0);
    let lip = 0; if (mw > 500) lip++; if (logp > 5) lip++; if (hbd > 5) lip++; if (hba > 10) lip++;
    let formula = ''; try { formula = (mol.get_inchi() || '').split('/')[1] || ''; } catch {}
    const smiles = mol.get_smiles(), svg = mol.get_svg(300, 220);
    return { smiles, formula, mw, logp, tpsa, hbd, hba, rotb, rings, esol, lip, veber: rotb <= 10 && tpsa <= 140, svg };
  } catch { return null; } finally { try { mol.delete(); } catch {} }
}
function rdFp(rk, s) { let m; try { m = rk.get_mol(s); if (!m?.is_valid()) return null; return m.get_morgan_fp(JSON.stringify({ radius: 2, nBits: 2048 })); } catch { return null; } finally { try { m?.delete(); } catch {} } }
function tanimoto(a, b) { if (!a || !b) return null; let i = 0, ua = 0, ub = 0; for (let k = 0; k < a.length; k++) { const x = a[k] === '1', y = b[k] === '1'; if (x && y) i++; if (x) ua++; if (y) ub++; } const u = ua + ub - i; return u ? i / u : 0; }
const RXNS = ['[cH:1]>>[c:1]F', '[cH:1]>>[c:1]Cl', '[cH:1]>>[c:1]OC', '[cH:1]>>[c:1]C', '[cH:1]>>[c:1]O', '[CH3:1]>>[C:1]F', '[CH3:1]>>[C:1]C', '[c:1]F>>[c:1]Cl'];
function rdAnalogues(rk, smiles, max = 12) {
  const seen = new Set(); let base;
  try { base = rk.get_mol(smiles); if (!base?.is_valid()) return []; } catch { return []; }
  const canon = base.get_smiles();
  for (const rs of RXNS) {
    let rxn, ml, prods;
    try {
      rxn = rk.get_rxn(rs); ml = new rk.MolList(); ml.append(base); prods = rxn.run_reactants(ml, 6);
      for (let i = 0; i < prods.size(); i++) { const row = prods.get(i); for (let j = 0; j < row.size(); j++) { try { const s = row.at(j).get_smiles(); const cm = rk.get_mol(s); if (cm?.is_valid()) { const cs = cm.get_smiles(); if (cs !== canon) seen.add(cs); } cm?.delete(); } catch {} } }
    } catch {} finally { try { prods?.delete(); } catch {} try { rxn?.delete(); } catch {} try { ml?.delete(); } catch {} }
    if (seen.size >= max * 2) break;
  }
  try { base.delete(); } catch {}
  return [...seen];
}

function mountConstructor(root) {
  const st = { organ: null, target: null, smiles: '', tab: 'drug', pdbText: '', analogues: [], rk: null, destroyed: false };
  let anat = null, viewer = null;

  const anatBox = h('div', { class: 'dc-anat' });
  const chips = h('div', { class: 'chips' });
  const right = h('div', { class: 'dc-right' });
  const ownPdb = h('input', { type: 'text', maxlength: 4, placeholder: tr(UI_DC.pdbCode), 'aria-label': tr(UI_DC.pdbCode), class: 'mono', onkeydown: (e) => { if (e.key === 'Enter') loadOwnPdb(); } });
  const ownPdbFile = h('input', { type: 'file', accept: '.pdb,.ent,.txt', hidden: true, onchange: async (e) => { const f = e.target.files[0]; if (f) setTarget({ gene: f.name.replace(/\.[^.]+$/, ''), pdb: null, file: await f.text(), lig: null, name: f.name, about: L('Загруженная вами структура.', 'Сіз жүктеген құрылым.', 'A structure you uploaded.'), native: null, drugs: [] }); } });
  root.append(h('div', { class: 'dc' },
    h('div', { class: 'dc-left' }, anatBox, chips,
      h('div', { class: 'dc-own' }, h('span', { class: 'k' }, tr(UI_DC.ownTarget)), h('div', { class: 'row' }, ownPdb, h('button', { class: 'btn-ghost', onclick: loadOwnPdb }, tr(UI_DC.load)), h('button', { class: 'btn-link', onclick: () => ownPdbFile.click() }, tr(UI_DC.pdbFile)), ownPdbFile))),
    right));

  ORGANS.forEach((o) => chips.append(h('button', { 'data-o': o.id, onclick: () => setOrgan(o.id) }, tr(o.name))));
  loadRDKit().then((rk) => { if (st.destroyed) return; st.rk = rk; renderRight(); }).catch(() => {});
  initAnatomy();
  renderRight();

  function loadOwnPdb() { const c = ownPdb.value.trim().toUpperCase(); if (/^[0-9][A-Z0-9]{3}$/.test(c)) setTarget({ gene: c, pdb: c, lig: null, name: 'PDB ' + c, about: L('Своя мишень из RCSB PDB.', 'RCSB PDB-дағы өз нысанаңыз.', 'Your own target from RCSB PDB.'), native: null, drugs: [] }); else ownPdb.focus(); }
  function setOrgan(id) { st.organ = ORGANS.find((o) => o.id === id); chips.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.o === id)); anat?.select(id); setTarget(st.organ.targets[0]); }
  function setTarget(t) { st.target = t; st.smiles = t.native?.smiles || st.smiles || SMI.ibuprofen; st.tab = 'drug'; st.analogues = []; st.pdbText = t.file || ''; renderRight(); loadStructure(); }

  async function loadStructure() {
    const t = st.target, box = right.querySelector('.dc-mol'), msg = right.querySelector('.dc-mol-msg');
    if (!box) return;
    msg.textContent = tr(UI_DC.loadingPdb); msg.hidden = false;
    try {
      const [mol, text] = await Promise.all([load3Dmol(), t.file ? Promise.resolve(t.file) : fetch(`https://files.rcsb.org/download/${t.pdb}.pdb`).then((r) => { if (!r.ok) throw 0; return r.text(); })]);
      if (st.destroyed || st.target !== t) return;
      st.pdbText = text;
      box.querySelector('.dc-mol-host')?.remove();
      const host = h('div', { class: 'dc-mol-host' }); box.prepend(host);
      viewer = mol.createViewer(host, { backgroundColor: '#06123a', antialias: true });
      const model = viewer.addModel(text, 'pdb');
      viewer.setStyle({}, { cartoon: { color: 'spectrum', opacity: 0.88 } });
      let sel = t.lig ? { resn: t.lig } : null;
      if (!sel || !model.selectedAtoms(sel).length) sel = { hetflag: true, not: { resn: ['HOH', 'WAT', 'SO4', 'PO4', 'GOL', 'EDO', 'CL', 'NA', 'ZN', 'MG', 'CA', 'K'] } };
      const has = model.selectedAtoms(sel).length > 0;
      if (has) {
        viewer.setStyle(sel, { stick: { radius: 0.24, colorscheme: 'cyanCarbon' } });
        viewer.addSurface(mol.SurfaceType.VDW, { opacity: 0.55, color: '#8fe0fa' }, { within: { distance: 5, sel } });
        viewer.zoomTo(sel); viewer.zoom(0.7);
      } else viewer.zoomTo();
      viewer.render(); if (!REDUCED) viewer.spin('y', 0.35);
      msg.hidden = true;
    } catch { if (!st.destroyed && st.target === t) { msg.textContent = tr(UI_DC.pdbFail); msg.hidden = false; } }
  }

  function renderRight() {
    const t = st.target;
    if (!t) { right.replaceChildren(h('div', { class: 'dc-empty' }, h('h4', {}, tr(UI_DC.pick)), h('p', {}, tr(UI_DC.pickHint)))); return; }
    const organTargets = st.organ && st.organ.targets.includes(t) ? st.organ.targets : [];
    const tabs = h('div', { class: 'seg seg3' }, ...[['drug', UI_DC.tabDrug], ['own', UI_DC.tabOwn], ['gen', UI_DC.tabGen]].map(([k, lab]) => h('button', { class: st.tab === k ? 'on' : '', onclick: () => { st.tab = k; renderRight(); keepViewer(); } }, tr(lab))));
    const pane = h('div', { class: 'dc-pane' });
    if (st.tab === 'drug') {
      const list = [...(t.native ? [{ ...t.native, native: true }] : []), ...t.drugs];
      pane.append(list.length ? h('div', { class: 'chips' }, ...list.map((d) => h('button', { class: st.smiles === d.smiles ? 'on' : '', onclick: () => { st.smiles = d.smiles; renderRight(); keepViewer(); } }, d.name + (d.native ? ` · ${tr(UI_DC.native)}` : '')))) : h('p', { class: 'hint' }, '—'));
    } else if (st.tab === 'own') {
      const inp = h('input', { type: 'text', class: 'mono', placeholder: tr(UI_DC.smilesPh), 'aria-label': 'SMILES', value: '' });
      const molFile = h('input', { type: 'file', accept: '.sdf,.mol,.mdl', hidden: true, onchange: async (e) => { const f = e.target.files[0]; if (!f) return; let txt = await f.text(); txt = txt.split('$$$$')[0]; st.smiles = txt; renderRight(); keepViewer(); } });
      pane.append(h('div', { class: 'row' }, inp, h('button', { class: 'btn', onclick: () => { if (inp.value.trim()) { st.smiles = inp.value.trim(); renderRight(); keepViewer(); } } }, tr(UI_DC.apply))),
        h('button', { class: 'btn-link', onclick: () => molFile.click() }, tr(UI_DC.molFile)), molFile);
    } else {
      const btn = h('button', { class: 'btn', disabled: !st.rk, onclick: () => { st.analogues = rankAnalogues(); renderRight(); keepViewer(); } }, st.rk ? tr(UI_DC.gen) : tr(UI_DC.rdkitLoading));
      pane.append(btn, h('p', { class: 'hint' }, tr(UI_DC.genHint)));
      if (st.analogues.length) pane.append(h('div', { class: 'dc-analogs' }, ...st.analogues.map((a) => h('button', { class: st.smiles === a.smiles ? 'on' : '', onclick: () => { st.smiles = a.smiles; renderRight(); keepViewer(); } }, h('span', { class: 'mono' }, a.smiles), h('span', { class: 'meta' }, `MW ${num(a.p.mw)} · logP ${num(a.p.logp, 2)} · Tc ${a.sim == null ? '—' : num(a.sim, 2)}`)))));
      else if (st.analogues.done) pane.append(h('p', { class: 'hint' }, tr(UI_DC.noAnalogues)));
    }
    const molBox = right.querySelector('.dc-mol') || h('div', { class: 'dc-mol' }, h('div', { class: 'dc-mol-msg' }), t.pdb ? h('span', { class: 'dc-pdb' }, 'PDB ' + t.pdb) : null);
    if (molBox.querySelector('.dc-pdb')) molBox.querySelector('.dc-pdb').textContent = t.pdb ? 'PDB ' + t.pdb : t.name;
    right.replaceChildren(
      organTargets.length > 1 ? h('div', { class: 'chips' }, ...organTargets.map((x) => h('button', { class: x === t ? 'on' : '', onclick: () => setTarget(x) }, tr(x.name)))) : null,
      h('div', { class: 'dc-target' }, h('span', { class: 'k' }, `${t.gene}${t.pdb ? ' · PDB ' + t.pdb : ''}`), h('h4', {}, tr(t.name)), h('p', {}, tr(t.about))),
      molBox, tabs, pane, props(),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: exportDock }, tr(UI_DC.export)), h('span', { class: 'hint' }, tr(UI_DC.exportHint))));
  }
  function keepViewer() { /* .dc-mol переиспользуется, вьюер не пересоздаётся */ }

  function props() {
    if (!st.rk) return h('p', { class: 'hint' }, tr(UI_DC.rdkitLoading));
    const p = rdAnalyze(st.rk, st.smiles);
    if (!p) return h('p', { class: 'warn-box' }, tr(UI_DC.bad));
    const sim = st.target?.native ? tanimoto(rdFp(st.rk, p.smiles), rdFp(st.rk, st.target.native.smiles)) : null;
    const cell = (k, v, ok) => h('div', { class: 'pv' }, h('span', {}, k), h('b', { class: ok == null ? '' : ok ? 'good' : 'warn' }, v));
    return h('div', { class: 'dc-props' },
      h('div', { class: 'dc-svg', html: p.svg }),
      h('div', {},
        p.formula ? h('div', { class: 'formula' }, p.formula) : null,
        h('div', { class: 'pgrid' },
          cell('MW', num(p.mw), p.mw <= 500), cell('logP', num(p.logp, 2), p.logp <= 5), cell('TPSA', num(p.tpsa, 0) + ' Å²', p.tpsa <= 140),
          cell('HBD', p.hbd, p.hbd <= 5), cell('HBA', p.hba, p.hba <= 10), cell('RotB', p.rotb, p.rotb <= 10),
          cell(tr(UI_DC.rings), p.rings), cell('ESOL logS', num(p.esol, 2))),
        h('div', { class: 'badges' },
          h('span', { class: p.lip <= 1 ? 'good' : 'warn' }, `Lipinski: ${p.lip === 0 ? tr(UI_DC.pass) : p.lip + ' ' + tr(UI_DC.viol)}`),
          h('span', { class: p.veber ? 'good' : 'warn' }, `Veber: ${p.veber ? '✓' : '✗'}`),
          sim != null ? h('span', { class: 'info' }, `${tr(UI_DC.sim)}: ${num(sim, 2)}`) : null)));
  }
  function rankAnalogues() {
    const rk = st.rk, ref = st.target?.native ? rdFp(rk, st.target.native.smiles) : null;
    const list = rdAnalogues(rk, rdAnalyze(rk, st.smiles)?.smiles || st.smiles).map((s) => ({ smiles: s, p: rdAnalyze(rk, s), sim: ref ? tanimoto(rdFp(rk, s), ref) : null })).filter((a) => a.p);
    list.sort((a, b) => (b.sim ?? 0) - (a.sim ?? 0) || a.p.lip - b.p.lip);
    const out = list.slice(0, 10); out.done = true; return out;
  }
  function exportDock() {
    if (st.pdbText) download(`receptor_${st.target.pdb || st.target.gene}.pdb`, st.pdbText, 'chemical/x-pdb');
    const smi = st.rk ? (rdAnalyze(st.rk, st.smiles)?.smiles || st.smiles) : st.smiles;
    setTimeout(() => download('ligand.smi', smi + ' ligand\n'), 300);
  }

  async function initAnatomy() {
    let T; try { T = await loadThree(); } catch { return; }
    if (st.destroyed) return;
    const cv = h('canvas', { class: 'dc-canvas', 'aria-label': tr(UI_DC.pick) }); anatBox.append(cv);
    let r; try { r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch { return; }
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    const sc = new T.Scene(), cam = new T.PerspectiveCamera(36, 1, 0.1, 50); cam.position.set(0, 0.1, 8.2);
    sc.add(new T.AmbientLight(0xffffff, 0.9)); const dl = new T.DirectionalLight(0xffffff, 1.1); dl.position.set(3, 5, 6); sc.add(dl);
    const body = new T.Group(); sc.add(body);
    const skin = new T.MeshStandardMaterial({ color: 0xcfe2ff, transparent: true, opacity: 0.26, roughness: 0.4, depthWrite: false });
    const add = (g, x, y, z, rz = 0) => { const m = new T.Mesh(g, skin); m.position.set(x, y, z); m.rotation.z = rz; body.add(m); };
    add(new T.SphereGeometry(0.5, 32, 32), 0, 2.45, 0); add(new T.CylinderGeometry(0.17, 0.21, 0.4, 24), 0, 1.92, 0);
    add(new T.CapsuleGeometry(0.62, 1.5, 12, 32), 0, 0.72, 0); add(new T.SphereGeometry(0.6, 32, 32), 0, -1.1, 0);
    [-1, 1].forEach((s) => { add(new T.CapsuleGeometry(0.15, 1.5, 8, 16), s * 0.82, 0.68, 0, s * 0.18); add(new T.CapsuleGeometry(0.2, 1.6, 8, 16), s * 0.28, -2.55, 0); });
    const nodes = ORGANS.map((o) => {
      const m = new T.Mesh(new T.SphereGeometry(0.12, 24, 24), new T.MeshStandardMaterial({ color: 0x1f4fff, emissive: 0x38c6f4, emissiveIntensity: 0.6 }));
      const halo = new T.Mesh(new T.SphereGeometry(0.2, 16, 16), new T.MeshBasicMaterial({ color: 0x38c6f4, transparent: true, opacity: 0.18, depthWrite: false }));
      m.position.set(...o.pos); halo.position.copy(m.position); m.userData.id = o.id; body.add(m, halo); return { m, halo, id: o.id };
    });
    const label = h('div', { class: 'dc-label', hidden: true }); anatBox.append(label);
    const rc = new T.Raycaster(), v2 = new T.Vector2();
    let rotY = 0.35, rotX = 0, drag = null, hover = null, selected = null, t0 = performance.now(), rafId = 0;
    const size = () => { const w = anatBox.clientWidth, hh = anatBox.clientHeight; r.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); };
    const ro = new ResizeObserver(size); ro.observe(anatBox); size();
    const hit = (e) => { const b = cv.getBoundingClientRect(); v2.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); rc.setFromCamera(v2, cam); const i = rc.intersectObjects(nodes.map((n) => n.m))[0]; return i ? i.object.userData.id : null; };
    cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, rx: rotX, ry: rotY, moved: 0 }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => {
      if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy)); rotY = drag.ry + dx * 0.01; rotX = Math.max(-0.5, Math.min(0.5, drag.rx + dy * 0.006)); }
      hover = hit(e); cv.style.cursor = hover ? 'pointer' : 'grab';
      const o = ORGANS.find((x) => x.id === hover); label.hidden = !o;
      if (o) { const b = anatBox.getBoundingClientRect(); label.textContent = tr(o.name); label.style.left = (e.clientX - b.left + 12) + 'px'; label.style.top = (e.clientY - b.top - 10) + 'px'; }
    });
    cv.addEventListener('pointerup', (e) => { const moved = drag?.moved || 0; drag = null; if (moved < 6) { const id = hit(e); if (id) setOrgan(id); } });
    cv.addEventListener('pointerleave', () => { label.hidden = true; hover = null; });
    const tick = () => {
      rafId = requestAnimationFrame(tick); if (st.destroyed) return;
      const t = (performance.now() - t0) / 1000;
      if (!drag && !selected && !REDUCED) rotY += 0.004;
      body.rotation.y += (rotY - body.rotation.y) * 0.12; body.rotation.x += (rotX - body.rotation.x) * 0.12;
      nodes.forEach((n) => { const on = n.id === selected || n.id === hover; const s = on ? 1.5 : 1 + Math.sin(t * 2 + n.m.position.y) * 0.08; n.m.scale.setScalar(s); n.halo.scale.setScalar(on ? 1.9 : 1.3 + Math.sin(t * 2) * 0.1); n.m.material.emissiveIntensity = on ? 1.4 : 0.6; });
      r.render(sc, cam);
    };
    tick();
    anat = { select(id) { selected = id; const o = ORGANS.find((x) => x.id === id); if (o) rotY = -Math.atan2(o.pos[0], o.pos[2]) * 0.6; }, destroy() { cancelAnimationFrame(rafId); ro.disconnect(); r.dispose(); } };
  }

  return { destroy() { st.destroyed = true; anat?.destroy(); try { viewer?.clear(); } catch {} } };
}
