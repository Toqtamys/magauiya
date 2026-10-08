// ------------------------------------------------------------------ интерфейс
const APP_NAME = 'Magauiya', APP_VER = 'ver. inner peace 1.0 C';
const CONTACT = { name: 'Alikhan Magauiya', email: 'orda.ezhenid@gmail.com' };
const items = []; let running = false, uid = 0;
const filesEl = $('#files'), runBtn = $('#run'), statusEl = $('#status');
const clsList = () => [['a', t('clsA')], ['b', t('clsB')], ['c', t('clsC')], ['d', t('clsD')]];
const volOf = it => { const v = parseFloat(String(it.volume || '').replace(',', '.')); return v > 0 ? v : null; };
const nameOf = it => it.example ? t('exampleName') : it.file.name;

function applyStatic() {
  document.documentElement.lang = LANG === 'kk' ? 'kk' : LANG;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('.langs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
}
document.querySelectorAll('.langs button').forEach(b => b.onclick = () => {
  LANG = b.dataset.lang; try { localStorage.setItem('magauiya-lang', LANG); } catch (_) {}
  applyStatic(); renderFiles(); updateRun(); renderResults();
});
$('#copyMail').onclick = async () => {
  const st = $('#mailStatus');
  try { await navigator.clipboard.writeText(CONTACT.email); st.textContent = t('emailCopied'); }
  catch (_) { const r = document.createRange(); r.selectNodeContents(document.querySelector('footer .mail')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
};

// ---------------- файлы
function addFiles(list) {
  for (const f of list) {
    if (!/^video\//.test(f.type) && !/\.(mp4|mov|m4v)$/i.test(f.name)) continue;
    if (items.some(it => it.file.name === f.name && it.file.size === f.size)) continue;
    items.push({ id: ++uid, file: f, volume: '', state: 'wait', p: 0 });
  }
  renderFiles(); updateRun();
}
function renderFiles() {
  filesEl.innerHTML = '';
  for (const it of items) {
    const el = document.createElement('div'); el.className = 'file'; it.el = el;
    const st = it.state === 'wait' ? t('queued') : it.state === 'run' ? (it.label || t('running')) : it.state === 'done' ? t('done') : t('error');
    el.innerHTML = `<div class="nm" title="${esc(it.file.name)}">${esc(it.file.name)}</div>
      <button class="rm" type="button" aria-label="${esc(t('remove'))} ${esc(it.file.name)}" ${running ? 'disabled' : ''}>×</button>
      <div class="st"><span class="lbl">${esc(st)}</span><div class="prog"><i style="width:${(it.p * 100).toFixed(1)}%"></i></div>
      <label class="vol">${esc(t('vol'))} <input type="number" min="0" step="0.1" id="vol-${it.id}" value="${esc(it.volume)}" aria-label="${esc(t('volAria'))}"></label></div>`;
    el.querySelector('.rm').onclick = () => { if (running) return; items.splice(items.indexOf(it), 1); renderFiles(); updateRun(); renderResults(); };
    el.querySelector('input').onchange = e => { it.volume = e.target.value; if (it.out) renderResults(); };
    filesEl.appendChild(el);
  }
}
function setProgress(it, p, label) {
  it.p = p; it.label = label; if (!it.el) return;
  it.el.querySelector('.prog i').style.width = (p * 100).toFixed(1) + '%';
  if (label) it.el.querySelector('.lbl').textContent = label;
}
function updateRun() {
  const pending = items.filter(i => i.state !== 'done').length;
  runBtn.disabled = running || !pending;
  runBtn.textContent = running ? t('analyzing') : pending ? `${t('analyze')} (${pending})` : t('analyze');
  if (!running) { statusEl.className = 'status'; statusEl.textContent = items.length ? (pending ? t('ready') : t('allDone')) : t('addVideos'); }
}
const drop = $('#drop'), inp = $('#fileInput');
inp.onchange = () => { addFiles(inp.files); inp.value = ''; };
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });

runBtn.onclick = async () => {
  if (running) return;
  if (typeof OffscreenCanvas === 'undefined' || typeof Worker === 'undefined') { statusEl.textContent = t('noBrowser'); statusEl.className = 'status err'; return; }
  running = true; statusEl.className = 'status'; renderFiles(); updateRun();
  const settings = { depth: +$('#depth').value || 10, pitch: +$('#pitch').value || 100, dilution: +$('#dilution').value || 1, umPerPx: $('#umpx').value.trim() };
  for (const it of items.filter(i => i.state !== 'done')) {
    it.state = 'run'; renderFiles();
    const t0 = performance.now();
    statusEl.textContent = `${t('processing')}: ${it.file.name}`;
    try {
      it.out = await analyzeItem(it, settings, (n, tot) => {
        const p = tot ? n / tot : 0, el = (performance.now() - t0) / 1000;
        const eta = p > 0.03 ? Math.max(0, el / p - el) : null;
        setProgress(it, p, t('frameOf', n, tot) + (eta != null ? t('eta', Math.ceil(eta)) : ''));
      });
      it.out.settings = settings; it.state = 'done'; it.p = 1; it.date = new Date();
    } catch (e) { it.state = 'err'; it.error = e.message; statusEl.className = 'status err'; statusEl.textContent = `${it.file.name}: ${e.message}`; console.error(e); }
    renderFiles(); renderResults();
  }
  running = false; updateRun();
};

// ---------------- показатели и процентили
function metrics(it) {
  const r = it.out.res, vol = volOf(it), rows = [];
  rows.push({ key: 'conc', label: t('pConc'), v: r.conc, lim5: REF5.conc, lim6: REF6.conc });
  if (vol) { rows.push({ key: 'total', label: t('pTotal'), v: r.conc * vol, lim5: 39, lim6: 39 }); rows.push({ key: 'volume', label: t('pVol'), v: vol, lim5: 1.5, lim6: 1.4 }); }
  rows.push({ key: 'pr', label: t('pPR'), v: r.who6.progressive, lim5: REF5.pr, lim6: REF6.pr });
  rows.push({ key: 'tm', label: t('pTM'), v: r.who6.total, lim5: REF5.motile, lim6: REF6.motile });
  rows.push({ key: 'np', label: t('pNP'), v: r.who5.NP });
  rows.push({ key: 'im', label: t('pIM'), v: r.who5.IM });
  rows.forEach(m => { m.p = whoPercentile(m.key, m.v); m.text = interpret(m.key, m.p); });
  const low = rows.filter(m => ['conc', 'total', 'volume', 'pr', 'tm'].includes(m.key) && m.p != null && m.p < 5);
  return { rows, low };
}
function gaugeSVG(p) {
  const W = 170, H = 18, x = v => 4 + (W - 8) * v / 100;
  const pos = p == null ? null : x(Math.max(1, Math.min(99, p < 0 ? 1 : p > 100 ? 99 : p)));
  return `<svg class="gauge" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <rect x="${x(0)}" y="6" width="${x(5) - x(0)}" height="6" fill="var(--d)" opacity=".55"/>
    <rect x="${x(5)}" y="6" width="${x(25) - x(5)}" height="6" fill="var(--b)" opacity=".45"/>
    <rect x="${x(25)}" y="6" width="${x(75) - x(25)}" height="6" fill="var(--a)" opacity=".45"/>
    <rect x="${x(75)}" y="6" width="${x(100) - x(75)}" height="6" fill="var(--a)" opacity=".7"/>
    ${pos != null ? `<circle cx="${pos.toFixed(1)}" cy="9" r="5" fill="var(--ink)" stroke="var(--panel)" stroke-width="1.5"/>` : ''}</svg>`;
}
function flagCls(v, lim) { return (v == null || !isFinite(v) || lim == null) ? '' : (v < lim ? ' low' : ''); }
function histSVG(h) {
  const W = 320, H = 96, n = h.length, bw = W / n, m = Math.max(1, ...h);
  let s = `<svg viewBox="0 0 ${W} ${H + 16}" role="img" aria-label="${esc(t('psAria'))}">`;
  for (const v of [5, 25]) s += `<line x1="${v / 2 * bw}" x2="${v / 2 * bw}" y1="0" y2="${H}" stroke="currentColor" stroke-dasharray="2 3" opacity=".45"/>`;
  h.forEach((v, i) => { const x0 = i * 2, col = x0 < 5 ? 'var(--d)' : x0 < 25 ? 'var(--b)' : 'var(--a)', bh = (H - 4) * v / m;
    s += `<rect x="${(i * bw + 1).toFixed(1)}" y="${(H - bh).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="1" fill="${col}"/>`; });
  for (const v of [0, 5, 25, 40, 55]) s += `<text x="${(v / 2 * bw + (v ? -3 : 0)).toFixed(1)}" y="${H + 13}" font-size="10" fill="currentColor" font-family="JetBrains Mono, monospace">${v}</text>`;
  return s + '</svg>';
}

// ---------------- карточка образца (страница и заключение)
function cardHTML(it, forReport) {
  const r = it.out.res, w6 = r.who6, w5 = r.who5, km = r.kinMotile || {}, vol = volOf(it);
  const M = metrics(it);
  const total = vol ? r.conc * vol : null;
  const pill = it.example ? `<span class="pill">${esc(t('example'))}</span>` : (M.low.length ? `<span class="pill warn">${esc(t('belowWho'))}</span>` : `<span class="pill">${esc(t('withinWho'))}</span>`);
  const calib = r.calib && r.calib.startsWith('по сетке') ? t('calibGrid', fmt(parseFloat((r.calib.match(/шаг ([\d.,]+)/) || [])[1]), 1)) : r.calib && r.calib.startsWith('задан') ? t('calibManual') : t('calibNone');
  return `<section class="card">
    <div class="card-top"><h3>${esc(nameOf(it))}</h3>${pill}</div>
    <div class="hero">
      <div>
        <div class="big">${fmt(r.conc)} <small>${esc(t('mlnml'))}</small></div>
        <div class="sub">95% ${esc(t('ci'))} ${fmt(r.ci[0])}–${fmt(r.ci[1])} · ${fmt(r.perSq)} ${esc(t('perSquare'))}${total != null ? ' · ' + esc(t('totalIn', fmt(total), fmt(vol))) : ''}</div>
        <div class="bar">${clsList().map(([c, l]) => `<span style="width:${Math.max(0, w6[c]).toFixed(2)}%;background:var(--${c})" title="${esc(l)}: ${fmt(w6[c])} %"></span>`).join('')}</div>
        <div class="keys">${clsList().map(([c, l]) => `<span><i style="background:var(--${c})"></i>${esc(l)}: <b>${fmt(w6[c])} %</b></span>`).join('')}</div>
      </div>
      <div class="hist"><div class="sub">${esc(t('psTitle'))}</div>${histSVG(r.psHist)}</div>
    </div>
    ${(!forReport && !it.example) ? `<div class="player"><video controls muted playsinline preload="metadata"></video><canvas></canvas></div>
    <div class="ptools"><label><input type="checkbox" checked data-k="marks"> ${esc(t('marks'))}</label><label><input type="checkbox" checked data-k="trails"> ${esc(t('trails'))}</label><label><input type="checkbox" data-k="debris"> ${esc(t('debris'))}</label>
    <span>a <b style="color:var(--a)">●</b> b <b style="color:var(--b)">●</b> c <b style="color:var(--c)">●</b> d <b style="color:var(--d)">●</b></span></div>` : ''}
    <div class="tablewrap"><table>
      <thead><tr><th>${esc(t('param'))}</th><th class="num">${esc(t('result'))}</th><th class="num">${esc(t('who5'))}</th><th class="num">${esc(t('who6'))}</th></tr></thead>
      <tbody>${M.rows.filter(m => m.lim6 != null).map(m => `<tr><td>${esc(m.label)}</td><td class="num">${fmt(m.v)}</td><td class="num${flagCls(m.v, m.lim5)}">≥ ${fmt(m.lim5, m.lim5 % 1 ? 1 : 0)}</td><td class="num${flagCls(m.v, m.lim6)}">≥ ${fmt(m.lim6, m.lim6 % 1 ? 1 : 0)}</td></tr>`).join('')}
        <tr><td>${esc(t('who5row'))}</td><td class="num" colspan="3">${fmt(w5.PR)} / ${fmt(w5.NP)} / ${fmt(w5.IM)}</td></tr>
        <tr><td>${esc(t('who6row'))}</td><td class="num" colspan="3">${fmt(w6.a)} / ${fmt(w6.b)} / ${fmt(w6.c)} / ${fmt(w6.d)}</td></tr>
      </tbody></table></div>
    <div class="pct"><h4>${esc(t('pctTitle'))}</h4><p class="lead">${esc(t('pctLead'))}</p>
      <div class="tablewrap"><table>
        <thead><tr><th>${esc(t('param'))}</th><th class="num">${esc(t('result'))}</th><th class="num">${esc(t('pctCol'))}</th><th></th><th>${esc(t('interp'))}</th></tr></thead>
        <tbody>${M.rows.map(m => `<tr><td>${esc(m.label)}</td><td class="num">${fmt(m.v)}</td><td class="num${m.p != null && m.p < 5 && m.key !== 'np' && m.key !== 'im' ? ' low' : ''}">${pctText(m.p)}</td><td>${gaugeSVG(m.p)}</td><td>${esc(m.text)}</td></tr>`).join('')}</tbody>
      </table></div></div>
    <div class="concl${M.low.length ? ' warn' : ''}"><b>${esc(t('concl'))}</b>${esc(M.low.length ? t('conclLow', M.low.map(m => m.label.replace(/,.*$/, '')).join('; ')) : t('conclOk'))}<small>${esc(t('conclNote'))}</small></div>
    <details${forReport ? ' open' : ''}><summary>${esc(t('kinTitle'))}</summary><div class="tablewrap"><table class="kv"><tbody>
      <tr><th>${esc(t('kinMotile'))}</th><td>VCL ${fmt(km.vcl)} · VSL ${fmt(km.vsl)} · VAP ${fmt(km.vap)} µm/s · LIN ${fmt(km.lin, 2)} · STR ${fmt(km.str, 2)} · WOB ${fmt(km.wob, 2)} · ALH ${fmt(km.alh)} µm · BCF ${fmt(km.bcf)} Hz</td></tr>
      <tr><th>${esc(t('calib'))}</th><td>${esc(calib)} → ${fmt(r.um * (r.scale || 1), 3)} ${esc(t('umSrc'))}</td></tr>
      <tr><th>${esc(t('video'))}</th><td>${esc(t('videoLine', fmt(r.fps, 1), fmt(r.duration), r.framesTracked, r.framesCounted, r.fields))}</td></tr>
      <tr><th>${esc(t('tracks'))}</th><td>${esc(t('tracksLine', r.sperm, r.tracksByClass.a, r.tracksByClass.b, r.tracksByClass.c, r.tracksByClass.d, r.debris))}</td></tr>
      <tr><th>${esc(t('debrisFilter'))}</th><td>${esc(t('debrisLine', fmt(r.concRaw)))}</td></tr>
      ${r.fps < 49 ? `<tr><th>fps</th><td>${esc(t('fpsLow'))}</td></tr>` : ''}
      ${r.fpsWarning ? `<tr><th>fps</th><td>${esc(t('fpsUnknown'))}</td></tr>` : ''}
    </tbody></table></div></details>
  </section>`;
}
function noteHTML() {
  return `<section class="card note"><p><b>${esc(t('method'))}.</b> ${esc(t('methodText'))}</p><p><b>${esc(t('limits'))}.</b> ${esc(t('limitsText'))}</p></section>`;
}
function summaryHTML(list, withActions) {
  const isEx = list.length && list[0].example;
  const rows = list.map(it => { const r = it.out.res, vol = volOf(it); return { name: nameOf(it), conc: r.conc, total: vol ? r.conc * vol : null, w6: r.who6, w5: r.who5 }; });
  return `<section class="card"><div class="sumhead"><h2>${esc(isEx ? t('summaryEx') : t('summary'))}</h2>
    ${withActions && !isEx ? `<div class="actions"><button class="btn ghost" data-act="report">${esc(t('dlReport'))}</button>${IN_VIEWER() ? '' : `<button class="btn ghost" data-act="print">${esc(t('print'))}</button>`}<button class="btn ghost" data-act="copy">${esc(t('copy'))}</button><button class="btn ghost" data-act="json">${esc(t('dlJson'))}</button><button class="btn ghost" data-act="csv">${esc(t('dlCsv'))}</button></div>` : ''}</div>
    <div class="tablewrap"><table><thead><tr><th>${esc(t('sample'))}</th><th class="num">${esc(t('concShort'))}</th><th class="num">${esc(t('totalShort'))}</th><th class="num">a %</th><th class="num">b %</th><th class="num">c %</th><th class="num">d %</th><th class="num">PR %</th><th class="num">NP %</th><th class="num">IM %</th><th class="num">${esc(t('motShort'))}</th></tr></thead>
    <tbody>${rows.map(x => `<tr><td>${esc(x.name)}</td><td class="num${flagCls(x.conc, REF6.conc)}">${fmt(x.conc)}</td><td class="num${x.total != null ? flagCls(x.total, 39) : ''}">${fmt(x.total)}</td>
      <td class="num">${fmt(x.w6.a, 0)}</td><td class="num">${fmt(x.w6.b, 0)}</td><td class="num">${fmt(x.w6.c, 0)}</td><td class="num">${fmt(x.w6.d, 0)}</td>
      <td class="num${flagCls(x.w5.PR, REF6.pr)}">${fmt(x.w5.PR, 0)}</td><td class="num">${fmt(x.w5.NP, 0)}</td><td class="num">${fmt(x.w5.IM, 0)}</td><td class="num${flagCls(x.w6.total, REF6.motile)}">${fmt(x.w6.total, 0)}</td></tr>`).join('')}</tbody></table></div>
    <p class="legend-note">${esc(t('legendNote'))}</p><span class="status" id="actStatus" role="status" aria-live="polite"></span></section>`;
}

// ---------------- экспорт
const IN_VIEWER = () => !!(window.claude && typeof window.claude.use === 'function');
async function download(name, mime, content) {
  if (IN_VIEWER()) {   // опубликованная страница: скачивание через разрешение просмотрщика
    const st = document.querySelector('#actStatus');
    try { const dl = await window.claude.use('downloads'); if (dl) { await dl.save({ filename: name, data: new Blob([content], { type: mime }) }); return; } }
    catch (e) { if (e && e.code === 'declined') return; if (st) st.textContent = (e && e.message) || String(e); return; }
  }
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`; };
function reportHTML(list) {
  const styles = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
  const logo = document.querySelector('.brand svg').outerHTML;
  const s = list[0].out.settings || {};
  const d = new Date();
  return `<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t('reportTitle'))} — ${APP_NAME}</title><style>${styles}
.wrap{max-width:980px} .report-head{display:flex;gap:16px;align-items:center;margin-bottom:8px} .report-head svg{width:90px;height:75px}
.report-head h1{margin:0;font-size:22px} .report-head .ver{font-size:13px;color:var(--accent)} .meta{color:var(--muted);font-size:13px;margin:0 0 14px}
@media print{body{background:#fff} .card{break-inside:avoid;border-color:#ccc} .wrap{padding:0} details summary{display:none}}
</style></head><body><div class="wrap">
<div class="report-head">${logo}<div><h1>${esc(t('reportTitle'))}</h1><div class="ver">${APP_NAME} · ${APP_VER}</div></div></div>
<p class="meta">${esc(t('reportDate'))}: ${d.toLocaleString(LANG === 'en' ? 'en-GB' : LANG === 'kk' ? 'kk-KZ' : 'ru-RU')} · ${esc(t('reportSettings'))}: ${esc(t('settingsLine', s.depth, s.pitch, s.dilution))}</p>
<div class="results">${summaryHTML(list, false)}${list.map(it => cardHTML(it, true)).join('')}${noteHTML()}</div>
<footer class="contact">${esc(t('feedback'))}: <b>${CONTACT.name}</b> <span class="mail">${CONTACT.email}</span></footer>
</div></body></html>`;
}
function exportJSON(list) {
  return JSON.stringify({
    software: APP_NAME, version: APP_VER, created: new Date().toISOString(), contact: CONTACT,
    reference: 'WHO Laboratory Manual 6th ed. (2021); percentiles: Campbell et al., Andrology 2021 (TTP <= 12 months)',
    who_distribution: { percentiles: WHO_PCT, values: WHO_DIST },
    samples: list.map(it => { const r = it.out.res, M = metrics(it);
      return { file: it.file.name, analyzed: it.date ? it.date.toISOString() : null, settings: it.out.settings, volume_ml: volOf(it),
        concentration_mln_ml: r.conc, concentration_ci95: r.ci, concentration_before_debris_filter: r.concRaw, cells_per_square: r.perSq,
        total_count_mln: volOf(it) ? r.conc * volOf(it) : null,
        who6: r.who6, who5: r.who5, kinematics_motile: r.kinMotile, progression_speed_hist_2um: r.psHist,
        percentiles_who2021: Object.fromEntries(M.rows.map(m => [m.key, { value: m.v, percentile: m.p == null ? null : (m.p < 0 ? '<2.5' : m.p > 100 ? '>97.5' : +m.p.toFixed(1)) }])),
        quality: { fps: r.fps, duration_s: r.duration, frames_tracked: r.framesTracked, frames_counted: r.framesCounted, fields: r.fields,
          um_per_px: r.um * (r.scale || 1), sperm_tracks: r.tracksByClass, debris_tracks: r.debris } }; }),
  }, null, 2);
}
function exportCSV(list) {
  const head = ['file', 'volume_ml', 'concentration_mln_ml', 'ci95_low', 'ci95_high', 'total_mln', 'a_pct', 'b_pct', 'c_pct', 'd_pct', 'PR_pct', 'NP_pct', 'IM_pct', 'total_motility_pct',
    'pctl_conc', 'pctl_total', 'pctl_PR', 'pctl_total_motility', 'VCL', 'VSL', 'VAP', 'LIN', 'STR', 'ALH', 'BCF'];
  const n = v => (v == null || !isFinite(v)) ? '' : (+v).toFixed(2);
  const lines = list.map(it => { const r = it.out.res, vol = volOf(it), P = Object.fromEntries(metrics(it).rows.map(m => [m.key, m.p]));
    const pp = p => p == null ? '' : p < 0 ? '<2.5' : p > 100 ? '>97.5' : p.toFixed(1); const k = r.kinMotile;
    return ['"' + it.file.name.replace(/"/g, '""') + '"', n(vol), n(r.conc), n(r.ci[0]), n(r.ci[1]), n(vol ? r.conc * vol : null), n(r.who6.a), n(r.who6.b), n(r.who6.c), n(r.who6.d),
      n(r.who5.PR), n(r.who5.NP), n(r.who5.IM), n(r.who6.total), pp(P.conc), pp(P.total), pp(P.pr), pp(P.tm), n(k.vcl), n(k.vsl), n(k.vap), n(k.lin), n(k.str), n(k.alh), n(k.bcf)].join(','); });
  return '﻿' + [head.join(',')].concat(lines).join('\n');
}
function printReport(list) {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  f.onload = () => { setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (_) {} setTimeout(() => f.remove(), 60000); }, 300); };
  f.srcdoc = reportHTML(list);
}

// ---------------- проигрыватель
function setupPlayer(el, it) {
  const video = el.querySelector('video'), canvas = el.querySelector('canvas'); if (!video) return;
  const g = canvas.getContext('2d');
  if (!it.url) it.url = URL.createObjectURL(it.file);
  video.src = it.url;
  const { overlay, cum, tracks, res } = it.out;
  const show = { marks: true, trails: true, debris: false };
  el.querySelectorAll('.ptools input').forEach(cb => cb.onchange = () => { show[cb.dataset.k] = cb.checked; draw(lastFr); });
  const col = { a: css('--a'), b: css('--b'), c: css('--c'), d: css('--d'), x: css('--x') };
  let lastFr = 0;
  function draw(fr) {
    lastFr = fr;
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(r.width * dpr)) { canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); }
    g.clearRect(0, 0, canvas.width, canvas.height);
    const list = overlay.get(fr); if (!list) return;
    const k = canvas.width / res.width, cx = cum[2 * fr], cy = cum[2 * fr + 1];
    g.lineWidth = Math.max(1, 1.4 * dpr);
    for (const [x, y, c, id] of list) {
      if (!c || (c === 'x' && !show.debris)) continue;
      g.strokeStyle = col[c];
      if (show.trails && c !== 'x') { const tr = tracks.get(id); if (tr) { const i = tr.f.indexOf(fr); if (i > 0) { g.beginPath(); const j0 = Math.max(0, i - 45);
        for (let j = j0; j <= i; j++) { const px = (tr.x[j] + cx) * k, py = (tr.y[j] + cy) * k; j === j0 ? g.moveTo(px, py) : g.lineTo(px, py); } g.globalAlpha = .75; g.stroke(); g.globalAlpha = 1; } } }
      if (show.marks || c === 'x') { g.beginPath(); g.arc(x * k, y * k, 8 * dpr * Math.max(.6, k / dpr * 2), 0, Math.PI * 2); g.stroke(); }
    }
  }
  const frameOf = tm => Math.max(0, Math.min(res.frames - 1, Math.floor(tm * res.fps + 1e-3)));
  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    const cb = (now, m) => { draw(frameOf(m.mediaTime)); video.requestVideoFrameCallback(cb); };
    video.requestVideoFrameCallback(cb);
  } else { const loop = () => { if (!video.isConnected) return; draw(frameOf(video.currentTime)); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  video.addEventListener('seeked', () => draw(frameOf(video.currentTime)));
  window.addEventListener('resize', () => draw(lastFr));
}

// ---------------- результаты
const EXAMPLE = { example: true, volume: '3.2', out: { settings: { depth: 10, pitch: 100, dilution: 1 }, res: {
  conc: 39.8, ci: [37.8, 41.9], perSq: 3.98, concRaw: 51.5, fields: 15, framesCounted: 136, framesTracked: 1004, frames: 1284, fps: 29.97, duration: 42.8,
  um: 0.3268, scale: 1, calib: 'по сетке камеры: шаг 306.0 px', debris: 331, sperm: 1740, tracksByClass: { a: 585, b: 536, c: 222, d: 397 },
  who6: { a: 33.3, b: 32.3, c: 15.2, d: 19.1, progressive: 65.6, total: 80.9 }, who5: { PR: 65.6, NP: 15.2, IM: 19.1, total: 80.9 },
  kinMotile: { vcl: 44.1, vsl: 21.9, vap: 25.3, lin: 0.48, str: 0.82, wob: 0.57, alh: 2.1, bcf: 6.2 },
  psHist: [290, 75, 25, 26, 28, 25, 44, 48, 54, 58, 81, 69, 95, 113, 112, 119, 79, 38, 18, 7, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0] } } };

function renderResults() {
  const box = $('#results');
  const done = items.filter(i => i.state === 'done' && i.out);
  const list = done.length ? done : [EXAMPLE];
  box.innerHTML = summaryHTML(list, true) + list.map(it => cardHTML(it, false)).join('') + noteHTML();
  const cards = box.querySelectorAll('section.card');
  list.forEach((it, i) => { if (!it.example) setupPlayer(cards[i + 1], it); });
  const st = box.querySelector('#actStatus');
  box.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
    const act = b.dataset.act;
    if (act === 'report') download(`Magauiya_report_${stamp()}.html`, 'text/html', reportHTML(done));
    else if (act === 'print') printReport(done);
    else if (act === 'json') download(`Magauiya_data_${stamp()}.json`, 'application/json', exportJSON(done));
    else if (act === 'csv') download(`Magauiya_table_${stamp()}.csv`, 'text/csv', exportCSV(done));
    else if (act === 'copy') {
      const head = [t('sample'), t('concShort'), t('totalShort'), 'a %', 'b %', 'c %', 'd %', 'PR %', 'NP %', 'IM %', t('motShort')];
      const tsv = [head.join('\t')].concat(done.map(it => { const r = it.out.res, v = volOf(it);
        return [it.file.name, r.conc, v ? r.conc * v : null, r.who6.a, r.who6.b, r.who6.c, r.who6.d, r.who5.PR, r.who5.NP, r.who5.IM, r.who6.total].map((x, i) => i ? fmt(x) : x).join('\t'); })).join('\n');
      try { await navigator.clipboard.writeText(tsv); st.textContent = t('copied'); }
      catch (_) { const ta = document.createElement('textarea'); ta.value = tsv; ta.rows = 6; ta.style.width = '100%'; ta.readOnly = true; st.textContent = t('copyManual'); st.after(ta); ta.select(); }
    }
  });
}

applyStatic(); renderFiles(); updateRun(); renderResults();
