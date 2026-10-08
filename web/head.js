const Core = window.SpermCore;
const MODEL = JSON.parse(document.getElementById('model').textContent);
const CORE_SRC = document.getElementById('core').textContent;
const REF5 = { conc: 15, motile: 40, pr: 32, total: 39 }, REF6 = { conc: 16, motile: 42, pr: 30, total: 39 };
const NOMINAL_PITCH_PX = 306;   // шаг сетки, на который настроен детектор (≈0,327 мкм/px)
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
