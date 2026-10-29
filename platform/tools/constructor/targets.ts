import { L, type T } from '@/lib/i18n';

export interface Drug { name: string; smiles: string; note?: T }
export interface Target {
  id: string; name: T; gene: string; pdb: string; ligand: string; // PDB ligand 3-letter code (для подсветки)
  about: T; native: Drug; drugs: Drug[];
}
export interface Organ {
  id: string; name: T; pos: [number, number, number]; color: string; targets: Target[];
}

/* Органы-хабы на стилизованной 3D-модели тела. Координаты в условных единицах. */
export const ORGANS: Organ[] = [
  {
    id: 'testis', name: L('Яички', 'Аталық бездер', 'Testes'), pos: [-0.25, -1.55, 0.35], color: '#38C6F4',
    targets: [
      {
        id: 'ar', name: L('Андрогеновый рецептор', 'Андроген рецепторы', 'Androgen receptor'), gene: 'AR', pdb: '2AM9', ligand: 'TES',
        about: L('Ядерный рецептор тестостерона; мишень антиандрогенов при раке простаты.', 'Тестостеронның ядролық рецепторы; простата обырында антиандрогендердің нысанасы.', 'Nuclear testosterone receptor; antiandrogen target in prostate cancer.'),
        native: { name: 'Testosterone', smiles: 'C[C@]12CC[C@H]3[C@@H](CCC4=CC(=O)CC[C@@]34C)[C@@H]1CC[C@@H]2O' },
        drugs: [{ name: 'Enzalutamide', smiles: 'CNC(=O)c1ccc(N2C(=S)N(c3ccc(C#N)c(C(F)(F)F)c3)C(=O)C2(C)C)cc1F' }, { name: 'Bicalutamide', smiles: 'CC(O)(CS(=O)(=O)c1ccc(F)cc1)C(=O)Nc1ccc(C#N)c(C(F)(F)F)c1' }],
      },
      {
        id: 'srd5a2', name: L('5α-редуктаза 2', '5α-редуктаза 2', '5α-reductase 2'), gene: 'SRD5A2', pdb: '7BW1', ligand: 'FIT',
        about: L('Превращает тестостерон в дигидротестостерон; мишень при ДГПЖ и андрогенной алопеции.', 'Тестостеронды дигидротестостеронға айналдырады; ҚПГ мен андрогенді алопецияда нысана.', 'Converts testosterone to DHT; target in BPH and androgenic alopecia.'),
        native: { name: 'Finasteride', smiles: 'CC(C)(C)NC(=O)[C@H]1CC[C@H]2[C@@H]3CC[C@H]4NC(=O)C=C[C@]4(C)[C@H]3CC[C@]12C' },
        drugs: [{ name: 'Dutasteride', smiles: 'C[C@]12CC[C@H]3[C@@H](CC[C@H]4NC(=O)C=C[C@]34C)[C@@H]1CC[C@@H]2C(=O)Nc1cc(C(F)(F)F)ccc1C(F)(F)F' }],
      },
    ],
  },
  {
    id: 'penis', name: L('Сосудистая система', 'Тамыр жүйесі', 'Vasculature'), pos: [0.2, -1.75, 0.4], color: '#1F4FFF',
    targets: [
      {
        id: 'pde5', name: L('Фосфодиэстераза 5', 'Фосфодиэстераза 5', 'Phosphodiesterase 5'), gene: 'PDE5A', pdb: '1UDT', ligand: 'VIA',
        about: L('Разрушает цГМФ; ингибиторы (силденафил) применяются при эректильной дисфункции и лёгочной гипертензии.', 'цГМФ-ты ыдыратады; ингибиторлар (силденафил) эректилді дисфункция мен өкпе гипертензиясында қолданылады.', 'Degrades cGMP; inhibitors (sildenafil) treat erectile dysfunction and pulmonary hypertension.'),
        native: { name: 'Sildenafil', smiles: 'CCCc1nn(C)c2c(=O)[nH]c(-c3cc(S(=O)(=O)N4CCN(C)CC4)ccc3OCC)nc12' },
        drugs: [{ name: 'Tadalafil', smiles: 'CN1CC(=O)N2[C@H](Cc3c([nH]c4ccccc34)[C@H]2c2ccc3c(c2)OCO3)C1=O' }],
      },
    ],
  },
  {
    id: 'ovary', name: L('Яичники', 'Аналық бездер', 'Ovaries'), pos: [-0.3, -1.45, 0.35], color: '#38C6F4',
    targets: [
      {
        id: 'aromatase', name: L('Ароматаза (CYP19A1)', 'Ароматаза (CYP19A1)', 'Aromatase (CYP19A1)'), gene: 'CYP19A1', pdb: '3EQM', ligand: 'ASD',
        about: L('Превращает андрогены в эстрогены; ингибиторы — для стимуляции овуляции и при раке груди.', 'Андрогендерді эстрогендерге айналдырады; ингибиторлар — овуляцияны ынталандыру мен сүт безі обырында.', 'Converts androgens to oestrogens; inhibitors for ovulation induction and breast cancer.'),
        native: { name: 'Androstenedione', smiles: 'C[C@]12CC[C@H]3[C@@H](CCC4=CC(=O)CC[C@@]34C)[C@@H]1CCC2=O' },
        drugs: [{ name: 'Letrozole', smiles: 'N#Cc1ccc(C(c2ccc(C#N)cc2)n2cncn2)cc1' }, { name: 'Anastrozole', smiles: 'CC(C)(C#N)c1cc(Cn2cncn2)cc(C(C)(C)C#N)c1' }],
      },
      {
        id: 'esr1', name: L('Рецептор эстрогена α', 'Эстроген рецепторы α', 'Oestrogen receptor α'), gene: 'ESR1', pdb: '3ERT', ligand: 'OHT',
        about: L('Ядерный рецептор эстрадиола; мишень тамоксифена и SERM при раке груди.', 'Эстрадиолдың ядролық рецепторы; сүт безі обырында тамоксифен мен SERM нысанасы.', 'Nuclear oestradiol receptor; target of tamoxifen and SERMs in breast cancer.'),
        native: { name: '4-Hydroxytamoxifen', smiles: 'CC/C(=C(\\c1ccc(O)cc1)c1ccc(OCCN(C)C)cc1)c1ccccc1' },
        drugs: [{ name: 'Estradiol', smiles: 'C[C@]12CC[C@H]3[C@@H](CCc4cc(O)ccc34)[C@@H]1CC[C@@H]2O' }, { name: 'Clomiphene', smiles: 'CCN(CC)CCOc1ccc(C(=C(Cl)c2ccccc2)c2ccccc2)cc1' }],
      },
    ],
  },
  {
    id: 'uterus', name: L('Матка', 'Жатыр', 'Uterus'), pos: [0, -1.35, 0.4], color: '#6A90FF',
    targets: [
      {
        id: 'oxtr', name: L('Рецептор окситоцина', 'Окситоцин рецепторы', 'Oxytocin receptor'), gene: 'OXTR', pdb: '6TPK', ligand: 'RTS',
        about: L('GPCR, запускающий сокращения матки; антагонисты (ретозибан, атозибан) — токолитики.', 'Жатыр жиырылуын іске қосатын GPCR; антагонистер (ретозибан, атозибан) — токолитиктер.', 'A GPCR driving uterine contractions; antagonists (retosiban, atosiban) are tocolytics.'),
        native: { name: 'Retosiban', smiles: 'CC[C@H]1OC(=O)[C@@H](Cc2ccccc2)N(C(=O)[C@@H]2CCCN2C(=O)[C@H]1C)C' },
        drugs: [{ name: 'Mifepristone', smiles: 'CC#C[C@]1(O)CC[C@H]2[C@@H]3CCC4=CC(=O)CCC4=C3[C@@H](c3ccc(N(C)C)cc3)C[C@@]21C' }],
      },
    ],
  },
  {
    id: 'pituitary', name: L('Гипофиз', 'Гипофиз', 'Pituitary'), pos: [0, 2.1, 0.25], color: '#0B2A8A',
    targets: [
      {
        id: 'gnrhr', name: L('Рецептор ГнРГ', 'ГнРГ рецепторы', 'GnRH receptor'), gene: 'GNRHR', pdb: '7BR3', ligand: 'F5O',
        about: L('Управляет выбросом ФСГ и ЛГ; антагонисты (элаголикс) — при эндометриозе и в протоколах ЭКО.', 'ФСГ мен ЛГ бөлінуін басқарады; антагонистер (элаголикс) — эндометриоз бен ЭКҰ хаттамаларында.', 'Controls FSH and LH release; antagonists (elagolix) treat endometriosis and feature in IVF protocols.'),
        native: { name: 'Elagolix', smiles: 'COc1cccc(-c2c(C)n(Cc3c(F)cccc3C(F)(F)F)c(=O)n(C[C@H](NCCCC(=O)O)c3ccccc3)c2=O)c1F' },
        drugs: [{ name: 'Estradiol', smiles: 'C[C@]12CC[C@H]3[C@@H](CCc4cc(O)ccc34)[C@@H]1CC[C@@H]2O' }],
      },
    ],
  },
  {
    id: 'prostate', name: L('Простата', 'Простата', 'Prostate'), pos: [0, -1.65, 0.3], color: '#12296E',
    targets: [
      {
        id: 'cyp17', name: L('CYP17A1', 'CYP17A1', 'CYP17A1'), gene: 'CYP17A1', pdb: '3RUK', ligand: 'AER',
        about: L('Ключевой фермент синтеза андрогенов; ингибитор абиратерон — при раке простаты.', 'Андроген синтезінің негізгі ферменті; абиратерон ингибиторы — простата обырында.', 'Key androgen-synthesis enzyme; abiraterone inhibits it in prostate cancer.'),
        native: { name: 'Abiraterone', smiles: 'C[C@]12CC[C@H](O)CC1=CC[C@@H]1[C@@H]2CC[C@]2(C)C(c3cccnc3)=CC[C@@H]12' },
        drugs: [{ name: 'Enzalutamide', smiles: 'CNC(=O)c1ccc(N2C(=S)N(c3ccc(C#N)c(C(F)(F)F)c3)C(=O)C2(C)C)cc1F' }],
      },
    ],
  },
  {
    id: 'breast', name: L('Молочная железа', 'Сүт безі', 'Breast'), pos: [-0.5, 0.6, 0.55], color: '#1F4FFF',
    targets: [
      {
        id: 'parp1', name: L('PARP1', 'PARP1', 'PARP1'), gene: 'PARP1', pdb: '7KK4', ligand: 'OLA',
        about: L('Фермент репарации ДНК; олапариб применяется при BRCA-ассоциированном раке.', 'ДНҚ репарациясының ферменті; олапариб BRCA-мен байланысты обырда қолданылады.', 'DNA-repair enzyme; olaparib is used in BRCA-associated cancers.'),
        native: { name: 'Olaparib', smiles: 'O=C(c1cc(Cc2n[nH]c(=O)c3ccccc23)ccc1F)N1CCN(C(=O)C2CC2)CC1' },
        drugs: [{ name: 'Tamoxifen', smiles: 'CC/C(=C(\\c1ccccc1)c1ccc(OCCN(C)C)cc1)c1ccccc1' }],
      },
    ],
  },
  {
    id: 'pancreas', name: L('Поджелудочная железа', 'Ұйқы безі', 'Pancreas'), pos: [0.35, -0.5, 0.4], color: '#38C6F4',
    targets: [
      {
        id: 'sglt2', name: L('SGLT2', 'SGLT2', 'SGLT2'), gene: 'SLC5A2', pdb: '7VSI', ligand: '7R3',
        about: L('Почечный переносчик глюкозы; глифлозины — при диабете 2 типа и СПКЯ-ассоциированной инсулинорезистентности.', 'Бүйректік глюкоза тасымалдағышы; глифлозиндер — 2-ші типті диабет пен ПКЯС-мен байланысты инсулинорезистенттілікте.', 'Renal glucose transporter; gliflozins for type-2 diabetes and PCOS-related insulin resistance.'),
        native: { name: 'Empagliflozin', smiles: 'OC[C@H]1O[C@@H](c2ccc(Cl)c(Cc3ccc(O[C@H]4CCOC4)cc3)c2)[C@H](O)[C@@H](O)[C@@H]1O' },
        drugs: [{ name: 'Metformin', smiles: 'CN(C)C(=N)N=C(N)N' }],
      },
    ],
  },
  {
    id: 'thyroid', name: L('Щитовидная железа', 'Қалқанша без', 'Thyroid'), pos: [0, 1.5, 0.45], color: '#6A90FF',
    targets: [
      {
        id: 'cox2', name: L('ЦОГ-2 (воспаление)', 'ЦОГ-2 (қабыну)', 'COX-2 (inflammation)'), gene: 'PTGS2', pdb: '5KIR', ligand: 'RCX',
        about: L('Фермент синтеза простагландинов; НПВП и коксибы подавляют воспаление и боль.', 'Простагландин синтезінің ферменті; ҚҚСП мен коксибтер қабыну мен ауырсынуды басады.', 'Prostaglandin-synthesis enzyme; NSAIDs and coxibs suppress inflammation and pain.'),
        native: { name: 'Rofecoxib', smiles: 'CS(=O)(=O)c1ccc(C2=C(c3ccccc3)C(=O)OC2)cc1' },
        drugs: [{ name: 'Celecoxib', smiles: 'Cc1ccc(-c2cc(C(F)(F)F)nn2-c2ccc(S(N)(=O)=O)cc2)cc1' }, { name: 'Ibuprofen', smiles: 'CC(C)Cc1ccc(C(C)C(=O)O)cc1' }],
      },
    ],
  },
  {
    id: 'brain', name: L('Головной мозг', 'Бас ми', 'Brain'), pos: [0, 2.45, 0.35], color: '#0B2A8A',
    targets: [
      {
        id: 'egfr', name: L('EGFR (онкомишень)', 'EGFR (онконысана)', 'EGFR (onco-target)'), gene: 'EGFR', pdb: '1M17', ligand: 'AQ4',
        about: L('Рецепторная тирозинкиназа; ингибиторы (эрлотиниб, гефитиниб) — при раке лёгкого.', 'Рецепторлық тирозинкиназа; ингибиторлар (эрлотиниб, гефитиниб) — өкпе обырында.', 'Receptor tyrosine kinase; inhibitors (erlotinib, gefitinib) in lung cancer.'),
        native: { name: 'Erlotinib', smiles: 'COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC' },
        drugs: [{ name: 'Gefitinib', smiles: 'COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1' }, { name: 'Lapatinib', smiles: 'CS(=O)(=O)CCNCc1ccc(-c2ccc3ncnc(Nc4ccc(OCc5cccc(F)c5)c(Cl)c4)c3c2)o1' }],
      },
    ],
  },
  {
    id: 'liver', name: L('Печень', 'Бауыр', 'Liver'), pos: [0.4, -0.2, 0.45], color: '#1F4FFF',
    targets: [
      {
        id: 'hmgcr', name: L('HMG-CoA редуктаза', 'HMG-CoA редуктаза', 'HMG-CoA reductase'), gene: 'HMGCR', pdb: '1HWK', ligand: '117',
        about: L('Ключевой фермент синтеза холестерина; мишень статинов.', 'Холестерин синтезінің негізгі ферменті; статиндер нысанасы.', 'Key cholesterol-synthesis enzyme; the statin target.'),
        native: { name: 'Atorvastatin', smiles: 'CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CC[C@@H](O)C[C@@H](O)CC(=O)O' },
        drugs: [{ name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O' }],
      },
    ],
  },
  {
    id: 'heart', name: L('Сердце', 'Жүрек', 'Heart'), pos: [-0.25, 0.35, 0.5], color: '#38C6F4',
    targets: [
      {
        id: 'ace', name: L('Карбоангидраза II', 'Карбоангидраза II', 'Carbonic anhydrase II'), gene: 'CA2', pdb: '1OQ5', ligand: 'BZ1',
        about: L('Модельный фермент для структурного дизайна ингибиторов (диуретики, глаукома).', 'Ингибиторлардың құрылымдық дизайнына арналған модельдік фермент (диуретиктер, глаукома).', 'A model enzyme for structure-based inhibitor design (diuretics, glaucoma).'),
        native: { name: 'Acetazolamide', smiles: 'CC(=O)Nc1nnc(S(N)(=O)=O)s1' },
        drugs: [{ name: 'Caffeine', smiles: 'Cn1c(=O)c2c(ncn2C)n(C)c1=O' }],
      },
    ],
  },
];

export const organById = (id: string) => ORGANS.find((o) => o.id === id);
