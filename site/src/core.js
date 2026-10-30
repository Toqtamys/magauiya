// ─── Утилиты, загрузчики библиотек, звук ────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const store = {
  get(k) { try { return localStorage.getItem('bopasi:' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('bopasi:' + k, v); } catch {} },
};

// ── совместимость со старыми браузерами
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(+r || 0, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); return this;
  };
}
if (!window.CSS) window.CSS = {};
if (!CSS.escape) CSS.escape = (v) => String(v).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c);

// ── ошибки не должны быть немыми: показываем их внизу экрана
const Oops = {
  el: null,
  show(msg) {
    if (!document.body) return;
    if (!this.el) { this.el = document.createElement('div'); this.el.className = 'oops'; this.el.setAttribute('role', 'alert'); document.body.append(this.el); }
    const lang = (typeof LANG !== 'undefined' && LANG) || 'ru';
    const head = { ru: 'Ошибка в браузере. Пришлите этот текст автору:', kk: 'Браузердегі қате. Осы мәтінді авторға жіберіңіз:', en: 'Browser error. Please send this text to the author:' }[lang];
    this.el.textContent = `${head} ${String(msg).slice(0, 300)} · ${navigator.userAgent.slice(0, 120)}`;
    this.el.hidden = false; clearTimeout(this.t); this.t = setTimeout(() => (this.el.hidden = true), 15000);
  },
};
addEventListener('error', (e) => { if (e.message && !/ResizeObserver loop/.test(e.message)) Oops.show(e.message + (e.lineno ? ` (${e.lineno})` : '')); });
addEventListener('unhandledrejection', (e) => { const m = e.reason && (e.reason.message || e.reason); if (m && !/Failed to fetch|NetworkError|Load failed|abort/i.test(m)) Oops.show(m); });

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Библиотеки: сначала локальная копия (на сайте), затем CDN (при открытии файла с диска)
const BASE = (typeof window !== 'undefined' && window.BOPASI_BASE) || './';   // корень сайта для локальных копий
const CDN = {
  three: 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js',
  threeLocal: BASE + 'vendor/three.module.js',
  mol: 'https://cdn.jsdelivr.net/npm/3dmol@2.5.5/build/3Dmol-min.js',
  molLocal: BASE + 'vendor/3Dmol-min.js',
  rdkit: 'https://cdn.jsdelivr.net/npm/@rdkit/rdkit@2026.9.1/dist/',
  rdkitLocal: BASE + 'rdkit/',
};
const onFile = location.protocol === 'file:';

let threePromise;
function loadThree() {
  return threePromise ||= (async () => {
    if (!onFile) { try { return await import(CDN.threeLocal); } catch {} }
    return import(CDN.three);
  })();
}

function loadScript(srcs) {
  return new Promise((resolve, reject) => {
    const next = (i) => {
      if (i >= srcs.length) return reject(new Error('script'));
      const s = document.createElement('script');
      s.src = srcs[i]; s.async = true;
      s.onload = () => resolve(srcs[i]);
      s.onerror = () => { s.remove(); next(i + 1); };
      document.head.append(s);
    };
    next(0);
  });
}

let molPromise;
function load3Dmol() {
  if (window.$3Dmol) return Promise.resolve(window.$3Dmol);
  return molPromise ||= loadScript(onFile ? [CDN.mol] : [CDN.molLocal, CDN.mol]).then(() => window.$3Dmol);
}

let rdkitPromise;
function loadRDKit() {
  if (window.RDKit) return Promise.resolve(window.RDKit);
  return rdkitPromise ||= (async () => {
    const bases = onFile ? [CDN.rdkit] : [CDN.rdkitLocal, CDN.rdkit];
    const used = await loadScript(bases.map((b) => b + 'RDKit_minimal.js'));
    const base = used.replace(/RDKit_minimal\.js$/, '');
    const rk = await window.initRDKitModule({ locateFile: () => base + 'RDKit_minimal.wasm' });
    window.RDKit = rk;
    return rk;
  })();
}

function download(name, data, type = 'text/plain') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ─── Глифы (тонкие линии) для карточек и списков ────────────────────────────
function drawGlyph(ctx, name, x, y, s, color, lw = 2) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 48, s / 48);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw * 48 / s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const C = (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); };
  const P = (d) => ctx.stroke(new Path2D(d));
  switch (name) {
    case 'sperm': C(13, 15, 6); C(13, 15, 2.2); P('M18 18 C28 24 20 30 30 34 C38 37 33 42 40 42'); break;
    case 'nucleus': C(24, 24, 15); C(24, 24, 8); C(24, 24, 3); break;
    case 'oocyte': C(24, 24, 17); C(24, 24, 13); C(33, 13, 3); break;
    case 'embryo': C(24, 24, 16); C(20, 21, 5.3); C(29, 20, 4.6); C(22, 30, 4.3); C(30, 29, 3.8); break;
    case 'calendar': ctx.strokeRect(8, 11, 32, 29); P('M8 19h32M16 7v6M32 7v6'); C(24, 29, 4.5); break;
    case 'curve': P('M7 40 C18 39 24 30 28 22 S36 9 42 8'); P('M7 41h35M7 41V7'); C(28, 22, 2); break;
    case 'halo': ctx.setLineDash([3, 3]); C(24, 24, 17); ctx.setLineDash([]); ctx.save(); ctx.translate(24, 24); ctx.rotate(-0.5); ctx.beginPath(); ctx.ellipse(0, 0, 7, 4.5, 0, 0, 6.283); ctx.fill(); ctx.restore(); break;
    case 'report': ctx.strokeRect(11, 6, 26, 36); P('M16 15h16M16 21h16M16 27h10'); P('M17 35l3 3 6-7'); break;
    case 'grid': ctx.strokeRect(8, 8, 32, 32); P('M8 16h32M8 24h32M8 32h32M16 8v32M24 8v32M32 8v32'); break;
    case 'tally': P('M10 12v24M16 12v24M22 12v24M28 12v24M7 30l26-14'); C(38, 36, 3); break;
    case 'ruler': P('M7 33 33 7l8 8-26 26z'); P('M13 27l3 3M18 22l3 3M23 17l3 3M28 12l3 3'); break;
    case 'clock': C(24, 26, 15); P('M24 26V17M24 26l7 4M19 6h10'); break;
    case 'blast': C(24, 24, 17); C(24, 24, 13); ctx.beginPath(); ctx.arc(24, 24, 13, 2.4, 4.0); ctx.lineTo(18, 24); ctx.closePath(); ctx.fill(); break;
    case 'ovary': C(24, 24, 15); C(19, 20, 4); C(29, 22, 3); C(23, 30, 3.5); C(31, 30, 2); break;
    case 'molecule': C(24, 12, 4); C(12, 30, 4); C(36, 30, 4); C(24, 38, 3); P('M24 16 15 27M24 16l9 11M14 33l8 4M34 33l-8 4'); break;
  }
  ctx.restore();
}
function glyphSVG(name, size = 28) {
  const c = document.createElement('canvas'); c.width = c.height = size * 2;
  drawGlyph(c.getContext('2d'), name, 0, 0, size * 2, '#1f4fff', 2.2);
  return c.toDataURL();
}

