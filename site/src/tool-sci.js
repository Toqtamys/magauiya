// ─── Открытые проекты в офлайн-файле: NiiVue, Mol*, SeqViz ──────────────────
// библиотеки встроены в BOPASI.html отдельными скриптами: window.SCILIB (NiiVue, SeqViz) и window.molstar (Mol*)
const b64bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const sciErr = (box, e) => { box.textContent = `${tr(UI.rtFailed)}: ${String(e && e.message || e)}`; box.hidden = false; };
const sciBtn = (label, onclick, on) => h('button', { class: 'btn-ghost sm' + (on ? ' on' : ''), type: 'button', onclick }, label);
const sciGroup = (btns, pick) => { btns.forEach((b) => b.addEventListener('click', () => { btns.forEach((x) => x.classList.toggle('on', x === b)); pick?.(b); })); return btns; };
const sciFile = (accept, onfile) => h('input', { type: 'file', hidden: true, accept, onchange: (e) => { const f = e.target.files[0]; if (f) onfile(f); e.target.value = ''; } });
const sciDrop = (root, onfile) => {
  root.addEventListener('dragover', (e) => e.preventDefault());
  root.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onfile(f); });
};

// NiiVue — объёмные снимки (NIfTI, NRRD, MGZ…)
function mountNiivue(root) {
  const L_ = window.SCILIB; const err = h('p', { class: 'warn-box', hidden: true });
  const cv = h('canvas', { class: 'sci-canvas' });
  const name = h('p', { class: 'hint' });
  let nv = null;
  const view = sciGroup([sciBtn(tr(UI.rtAll), () => nv?.setSliceType(L_.SLICE_TYPE.MULTIPLANAR), true), sciBtn(tr(UI.rtSlices), () => nv?.setSliceType(L_.SLICE_TYPE.AXIAL)), sciBtn(tr(UI.rtVolume), () => nv?.setSliceType(L_.SLICE_TYPE.RENDER))]);
  const drag = sciGroup([sciBtn(tr(UI.rtMeasure), () => nv?.setDragMode(L_.DRAG_MODE.measurement), true), sciBtn(tr(UI.rtContrast), () => nv?.setDragMode(L_.DRAG_MODE.contrast))]);
  const clear = () => { while (nv.volumes.length) nv.removeVolume(nv.volumes[0]); };
  const open = async (f) => { if (!nv) return; err.hidden = true; try { clear(); await nv.loadFromFile(f); name.textContent = `${f.name} · ${tr(UI.rtDrop)}`; } catch (e) { sciErr(err, e); } };
  const sample = () => open(new File([b64bytes(SCI_SAMPLES.nii)], 'ovary-synthetic.nii.gz'));
  const fileIn = sciFile('.nii,.gz,.nrrd,.nhdr,.mgh,.mgz,.mha,.mhd,.head,.mif', open);
  root.append(h('div', { class: 'sci' },
    h('div', { class: 'row sci-bar' }, ...view, h('span', { class: 'sci-sep' }), ...drag, h('span', { class: 'sci-sep' }),
      sciBtn(tr(UI.rtShot), () => nv?.saveScene('bopasi-niivue.png')), sciBtn(tr(UI.rtOpen), () => fileIn.click()), sciBtn(tr(UI.rtSample), sample), fileIn),
    h('div', { class: 'sci-stage dark' }, cv), name, err));
  sciDrop(root, open);
  if (!L_) { sciErr(err, 'NiiVue'); return { destroy() {} }; }
  if (!cv.getContext('webgl2')) { err.textContent = tr(UI.rtNoWebgl); err.hidden = false; return { destroy() {} }; }
  (async () => {
    try {
      nv = new L_.Niivue({ backColor: [0.04, 0.07, 0.25, 1], crosshairColor: [1, 0.77, 0.2, 1], show3Dcrosshair: true, dragAndDropEnabled: false, isColorbar: false });
      await nv.attachToCanvas(cv);
      nv.setSliceType(L_.SLICE_TYPE.MULTIPLANAR); nv.setDragMode(L_.DRAG_MODE.measurement);
      await sample();
    } catch (e) { sciErr(err, e); }
  })();
  return { destroy() { try { nv?.cleanup?.(); } catch {} nv = null; try { cv.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext(); } catch {} } };
}

// Mol* — структуры белков и молекул
const MOL_FORMAT = { pdb: 'pdb', ent: 'pdb', cif: 'mmcif', mmcif: 'mmcif', bcif: 'bcif', sdf: 'sdf', mol: 'mol', mol2: 'mol2', gro: 'gro', xyz: 'xyz' };
function mountMolstar(root) {
  const err = h('p', { class: 'warn-box', hidden: true });
  const host = h('div', { class: 'sci-stage mol' });
  const label = h('p', { class: 'hint' }, '4WP4 · Hev b 6.02');
  let v = null, alive = true;
  const load = async (data, fmt, lbl) => { if (!v) return; err.hidden = true; try { await v.plugin.clear(); await v.loadStructureFromData(data, fmt, { dataLabel: lbl }); label.textContent = lbl; } catch (e) { sciErr(err, e); } };
  const open = async (f) => {
    const fmt = MOL_FORMAT[(f.name.split('.').pop() || '').toLowerCase()];
    if (!fmt) return sciErr(err, f.name);
    load(fmt === 'bcif' ? Array.from(new Uint8Array(await f.arrayBuffer())) : await f.text(), fmt, f.name);
  };
  const sample = () => load(SCI_SAMPLES.pdb, 'pdb', '4WP4 · Hev b 6.02');
  const fileIn = sciFile('.pdb,.ent,.cif,.mmcif,.bcif,.sdf,.mol,.mol2,.gro,.xyz', open);
  const code = h('input', { type: 'text', maxlength: 4, placeholder: tr(UI.rtPdbCode), 'aria-label': tr(UI.rtPdbCode), class: 'sci-input' });
  const form = h('form', { class: 'row sci-push', onsubmit: async (e) => {
    e.preventDefault(); const id = code.value.trim();
    if (!/^[0-9][a-zA-Z0-9]{3}$/.test(id) || !v) return;
    err.hidden = true; try { await v.plugin.clear(); await v.loadPdb(id.toLowerCase()); label.textContent = id.toUpperCase(); } catch (er) { sciErr(err, er); }
  } }, code, h('button', { class: 'btn', type: 'submit' }, tr(UI.rtLoad)));
  root.append(h('div', { class: 'sci' }, h('div', { class: 'row sci-bar' }, sciBtn(tr(UI.rtOpen), () => fileIn.click()), sciBtn(tr(UI.rtSample), sample), fileIn, form), host, label, err));
  sciDrop(root, open);
  if (!window.molstar) { sciErr(err, 'Mol*'); return { destroy() {} }; }
  window.molstar.Viewer.create(host, {
    layoutIsExpanded: false, layoutShowControls: true, layoutShowRemoteState: false, layoutShowSequence: true, layoutShowLog: false,
    layoutShowLeftPanel: true, viewportShowExpand: true, viewportShowSelectionMode: false, viewportShowAnimation: false,
    collapseLeftPanel: true, allowMajorPerformanceCaveat: true, pdbProvider: 'rcsb', emdbProvider: 'rcsb',
  }).then((x) => { if (!alive) { x.dispose?.(); return; } v = x; sample(); }, (e) => sciErr(err, e));
  return { destroy() { alive = false; try { v?.dispose?.(); } catch {} v = null; } };
}

// SeqViz — карта ДНК (GenBank, FASTA, SnapGene)
const SEQ_ENZ = ['EcoRI', 'BamHI', 'HindIII', 'PstI', 'XbaI', 'NcoI', 'SalI', 'KpnI'];
function mountSeqviz(root) {
  const L_ = window.SCILIB; const err = h('p', { class: 'warn-box', hidden: true });
  const host = h('div', { class: 'sci-stage seq' });
  const info = h('p', { class: 'hint' });
  const hits = h('span', { class: 'hint' });
  const st = { seq: null, viewer: 'both', enz: ['EcoRI', 'HindIII'], query: '', comp: true };
  let reactRoot = null;
  const render = () => {
    if (!st.seq || !reactRoot) return;
    const search = st.query.length >= 3 ? { query: st.query, mismatch: 0 } : undefined;
    if (!search) hits.textContent = '';
    reactRoot.render(L_.React.createElement(L_.SeqViz, {
      name: st.seq.name, seq: st.seq.seq, annotations: st.seq.annotations, viewer: st.viewer, enzymes: st.enz, showComplement: st.comp, search,
      onSearch: (r) => { hits.textContent = search ? `${r.length} ${tr(UI.rtMatches)}` : ''; }, style: { height: '100%', width: '100%' },
    }));
    info.textContent = `${st.seq.name} · ${st.seq.seq.length} ${tr(UI.rtBp)}`;
  };
  const fromText = (txt, fileName, source) => {
    try {
      const all = L_.parseFile(txt, { fileName, source });
      if (!all?.length || !all[0].seq) throw new Error('no sequence');
      st.seq = all[0]; err.hidden = true; render();
    } catch (e) { sciErr(err, e); }
  };
  const open = async (f) => { if (f.name.toLowerCase().endsWith('.dna')) fromText('', f.name, await f.arrayBuffer()); else fromText(await f.text(), f.name); };
  const fileIn = sciFile('.gb,.gbk,.genbank,.fasta,.fa,.fas,.fna,.seq,.txt,.dna,.xml,.sbol', open);
  const views = sciGroup([['both', UI.rtBoth], ['circular', UI.rtCircular], ['linear', UI.rtLinear]].map(([k, lbl]) => sciBtn(tr(lbl), () => { st.viewer = k; render(); }, k === 'both')));
  const enz = SEQ_ENZ.map((e) => { const b = sciBtn(e, () => { st.enz = st.enz.includes(e) ? st.enz.filter((x) => x !== e) : [...st.enz, e]; b.classList.toggle('on', st.enz.includes(e)); render(); }, st.enz.includes(e)); return b; });
  const q = h('input', { type: 'search', class: 'sci-input', placeholder: tr(UI.rtSearch), 'aria-label': tr(UI.rtSearch),
    oninput: (e) => { e.target.value = e.target.value.replace(/[^acgtnACGTN]/g, ''); st.query = e.target.value.trim(); render(); } });
  const comp = h('label', { class: 'row sci-check' }, h('input', { type: 'checkbox', checked: true, onchange: (e) => { st.comp = e.target.checked; render(); } }), tr(UI.rtComplement));
  const paste = h('textarea', { rows: 4, class: 'sci-area', placeholder: '>my_seq\nATGC...' });
  root.append(h('div', { class: 'sci' },
    h('div', { class: 'row sci-bar' }, ...views, h('span', { class: 'sci-sep' }), sciBtn(tr(UI.rtOpen), () => fileIn.click()), sciBtn(tr(UI.rtSample), () => fromText(SCI_SAMPLES.gb, 'pBAD30.gb')), fileIn, comp),
    h('div', { class: 'row sci-bar' }, h('b', { class: 'hint' }, tr(UI.rtEnzymes) + ':'), ...enz, h('span', { class: 'row sci-push' }, q, hits)),
    host, info,
    h('details', { class: 'sci-paste' }, h('summary', {}, tr(UI.rtPaste)), paste,
      h('button', { class: 'btn', type: 'button', onclick: () => { const p = paste.value; fromText(p.trim().startsWith('>') || p.includes('LOCUS') ? p : `>sequence\n${p}`, 'pasted.fasta'); } }, tr(UI.rtShow))),
    err));
  sciDrop(root, open);
  if (!L_) { sciErr(err, 'SeqViz'); return { destroy() {} }; }
  reactRoot = L_.createRoot(host);
  fromText(SCI_SAMPLES.gb, 'pBAD30.gb');
  return { destroy() { try { reactRoot?.unmount(); } catch {} reactRoot = null; } };
}
