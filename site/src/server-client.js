// ─── Клиент сервера BOPASI: подключение, загрузка, очередь, отчёт ───────────
const SRV_UI = {
  drop: L('Перетащите файл для анализа', 'Талдауға файлды сүйреңіз', 'Drop a file to analyse'),
  run: L('Запустить анализ', 'Талдауды бастау', 'Run analysis'),
  uploading: L('Загрузка на сервер', 'Серверге жүктеу', 'Uploading to the server'),
  queued: L('В очереди', 'Кезекте', 'Queued'),
  running: L('Анализ', 'Талдау', 'Analysing'),
  done: L('Готово', 'Дайын', 'Done'),
  error: L('Ошибка', 'Қате', 'Error'),
  needServer: L('Подключите сервер BOPASI, чтобы запустить этот инструмент. Инструкция по установке — в README сервера в репозитории проекта.',
    'Бұл құралды іске қосу үшін BOPASI серверін қосыңыз. Орнату нұсқаулығы — жоба репозиторийіндегі сервер README-інде.',
    'Connect a BOPASI server to run this tool. Installation steps are in the server README in the project repository.'),
  notOnServer: L('На этом сервере модель не установлена', 'Бұл серверде модель орнатылмаған', 'The model is not installed on this server'),
  accepts: L('Форматы', 'Форматтар', 'Formats'),
  report: L('Скачать отчёт', 'Есепті жүктеу', 'Download report'),
  result: L('Результат', 'Нәтиже', 'Result'),
  example: L('Формат результата (пример структуры, значения условные)', 'Нәтиже форматы (құрылым мысалы, мәндер шартты)', 'Result format (a structure example, the values are placeholders)'),
};

const Server = {
  key: 'server',
  get url() { return (store.get(this.key) || '').replace(/\/+$/, ''); },
  set url(v) { store.set(this.key, (v || '').trim().replace(/\/+$/, '')); },
  tools: null,                     // ответ /api/tools последней проверки
  async api(path, opts = {}) {
    const r = await fetch(this.url + path, opts);
    let body = null; try { body = await r.json(); } catch {}
    if (!r.ok) throw new Error((body && body.detail) || `HTTP ${r.status}`);
    return body;
  },
  async check() {
    if (!this.url) { this.tools = null; return null; }
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
    try {
      const [health, tools] = await Promise.all([this.api('/api/health', { signal: ctl.signal }), this.api('/api/tools', { signal: ctl.signal })]);
      this.tools = Object.fromEntries(tools.tools.map((t) => [t.name, t]));
      return { health, tools: this.tools };
    } catch (e) { this.tools = null; throw e; } finally { clearTimeout(tm); }
  },
  async run(tool, files, params, onState) {
    const ids = [];
    for (const f of files) {
      onState({ status: 'uploading', progress: 0, message: f.name });
      const fd = new FormData(); fd.append('file', f);
      ids.push((await this.api('/api/upload', { method: 'POST', body: fd })).file_id);
    }
    const { task_id } = await this.api(`/api/analyze/${encodeURIComponent(tool)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_ids: ids, params }) });
    for (;;) {
      const s = await this.api(`/api/status/${task_id}`); onState(s);
      if (s.status === 'done') return { task_id, ...(await this.api(`/api/result/${task_id}`)) };
      if (s.status === 'error') throw new Error(s.error || 'error');
      await new Promise((r) => setTimeout(r, 1200));
    }
  },
};

// поле адреса сервера + статус (используется на главной и в панелях)
function serverBox(onChange) {
  const inp = h('input', { type: 'url', placeholder: 'https://bopasi.example.org', value: Server.url, 'aria-label': tr(UI.serverUrl), id: 'srv-url-' + Math.random().toString(36).slice(2, 7) });
  const msg = h('p', { class: 'srv-msg', 'aria-live': 'polite' }, Server.url ? tr(UI.unchecked) : tr(UI.notConnected));
  const btn = h('button', { class: 'btn', onclick: async () => {
    Server.url = inp.value; msg.textContent = '…'; msg.className = 'srv-msg';
    try { const r = await Server.check(); if (!r) { msg.textContent = tr(UI.notConnected); onChange?.(null); return; }
      msg.textContent = `${tr(UI.connected)} · ${r.health.gpu?.cuda ? tr(UI.gpu) + ': ' + (r.health.gpu.devices || []).join(', ') : tr(UI.noGpu)}`; msg.classList.add('ok'); onChange?.(r.tools);
    } catch { msg.textContent = tr(UI.unreachable); msg.classList.add('bad'); onChange?.(null); }
  } }, tr(UI.check));
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  return h('div', { class: 'srv-box' }, h('label', { class: 'field', for: inp.id }, h('span', {}, tr(UI.serverUrl)), h('div', { class: 'row' }, inp, btn)), msg);
}

// страница серверного инструмента
function mountServerTool(root, id) {
  const t = TOOLS_DATA.find((x) => x.id === id);
  const st = { files: [], busy: false };
  const fileIn = h('input', { type: 'file', hidden: true, multiple: true, accept: (t.accepts || []).join(','), onchange: (e) => setFiles([...e.target.files]) });
  const drop = h('div', { class: 'drop', tabindex: 0, onclick: () => fileIn.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') fileIn.click(); } },
    h('strong', {}, tr(SRV_UI.drop)), h('span', {}, `${tr(SRV_UI.accepts)}: ${(t.accepts || []).join(' · ')}`));
  ['dragover', 'dragenter'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  root.addEventListener('drop', (e) => setFiles([...e.dataTransfer.files]));
  const state = h('div', { class: 'srv-state', 'aria-live': 'polite' });
  const bar = h('div', { class: 'srv-bar' }, h('i'));
  const out = h('div', { class: 'srv-out' });
  const runBtn = h('button', { class: 'btn', disabled: true, onclick: run }, tr(SRV_UI.run));
  const avail = h('p', { class: 'hint' });
  root.append(h('div', { class: 'srv-tool' },
    h('div', { class: 'srv-left' }, serverBox(() => sync()), avail, drop, fileIn, h('div', { class: 'row' }, runBtn), bar, state),
    h('div', { class: 'srv-right' }, out)));
  showExample();
  if (Server.url && !Server.tools) Server.check().then(sync, sync); else sync();

  function setFiles(fs) { st.files = fs.slice(0, 20); drop.querySelector('strong').textContent = st.files.map((f) => f.name).join(', ') || tr(SRV_UI.drop); sync(); }
  function sync() {
    const info = Server.tools && Server.tools[id];
    avail.textContent = !Server.tools ? tr(SRV_UI.needServer) : !info ? tr(SRV_UI.notOnServer) : info.available ? `${tr(UI.available)} · ${info.gpu ? 'GPU' : 'CPU'}` : `${tr(SRV_UI.notOnServer)}: ${info.reason || ''}`;
    runBtn.disabled = st.busy || !st.files.length || !(info && info.available);
  }
  async function run() {
    st.busy = true; sync(); out.replaceChildren(); bar.classList.add('on');
    try {
      const res = await Server.run(id, st.files, {}, (s) => {
        state.textContent = `${tr(SRV_UI[s.status] || SRV_UI.running)} ${s.message ? '· ' + s.message : ''}`;
        bar.firstChild.style.width = `${Math.round((s.progress || 0) * 100)}%`;
      });
      state.textContent = tr(SRV_UI.done); showResult(res);
    } catch (e) { state.textContent = `${tr(SRV_UI.error)}: ${e.message}`; }
    st.busy = false; bar.classList.remove('on'); sync();
  }
  function table(obj) {
    const rows = Object.entries(obj || {}).filter(([, v]) => typeof v !== 'object');
    return h('table', { class: 'srv-table' }, h('tbody', {}, ...rows.map(([k, v]) => h('tr', {}, h('th', {}, k), h('td', {}, String(v))))));
  }
  function showResult(res) {
    const r = res.result || {};
    const links = ['json', 'csv', 'txt'].map((f) => h('a', { class: 'btn-ghost', href: `${Server.url}/api/report/${res.task_id}?format=${f}`, target: '_blank', rel: 'noopener' }, f.toUpperCase()));
    out.replaceChildren(h('h3', {}, tr(SRV_UI.result)), table(r.summary || r), h('p', { class: 'hint' }, tr(SRV_UI.report)), h('div', { class: 'row' }, ...links));
  }
  function showExample() {
    const ex = { task_id: '…', tool: id, result: { summary: { '…': '…' }, items: ['…'], notes: '…' } };
    out.replaceChildren(h('h3', {}, tr(SRV_UI.example)), h('pre', { class: 'srv-pre' }, JSON.stringify(ex, null, 2)));
  }
  return { destroy() {} };
}
