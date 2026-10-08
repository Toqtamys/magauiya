"""HTML-отчёт по результатам SpermCASA (один самодостаточный файл)."""
import datetime, html, math

WHO5 = dict(conc=15.0, motile=40.0, pr=32.0, total=39.0)
WHO6 = dict(conc=16.0, motile=42.0, pr=30.0, total=39.0)
CLS = [('a', 'a — быстрые прогрессивные', '#2f9e44'), ('b', 'b — медленные прогрессивные', '#f2b705'),
       ('c', 'c — непрогрессивные', '#1c7ed6'), ('d', 'd — неподвижные', '#d6336c')]


def f1(x, nd=1):
    return '—' if x is None or (isinstance(x, float) and math.isnan(x)) else f'{x:.{nd}f}'.replace('.', ',')


def flag(v, lim):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return ''
    return ' low' if v < lim else ' ok'


def bar(w6):
    segs = ''.join(f'<span style="width:{max(0, w6[c]):.2f}%;background:{col}" title="{lab}: {f1(w6[c])} %"></span>'
                   for c, lab, col in CLS)
    return f'<div class="bar">{segs}</div>'


def hist_svg(h, w=320, hgt=90):
    if not h or max(h) == 0:
        return ''
    m = max(h); bw = w / len(h)
    rects = []
    for i, v in enumerate(h):
        x0 = i * 2
        col = '#d6336c' if x0 < 5 else ('#f2b705' if x0 < 25 else '#2f9e44')
        bh = (hgt - 16) * v / m
        rects.append(f'<rect x="{i * bw + 1:.1f}" y="{hgt - 14 - bh:.1f}" width="{bw - 2:.1f}" height="{bh:.1f}" fill="{col}" rx="1"/>')
    ticks = ''.join(f'<text x="{(t / 2) * bw:.1f}" y="{hgt - 2}" font-size="9" fill="currentColor" opacity=".6">{t}</text>'
                    for t in (0, 5, 10, 25, 40, 55))
    lines = ''.join(f'<line x1="{(t / 2) * bw:.1f}" x2="{(t / 2) * bw:.1f}" y1="0" y2="{hgt - 14}" stroke="currentColor" stroke-dasharray="2 2" opacity=".35"/>'
                    for t in (5, 25))
    return (f'<svg viewBox="0 0 {w} {hgt}" width="100%" style="max-width:{w}px" role="img" '
            f'aria-label="Распределение скорости продвижения">{rects and "".join(rects)}{lines}{ticks}</svg>')


def card(r):
    w6, w5, km = r['who6'], r['who5'], r['kin_motile']
    ci = r.get('concentration_ci95') or (float('nan'), float('nan'))
    tot = ''
    if r.get('total_count_mln') is not None:
        tot = (f'<tr><td>Общее количество в эякуляте</td><td>{f1(r["total_count_mln"])} млн</td>'
               f'<td class="ref{flag(r["total_count_mln"], WHO5["total"])}">≥ 39</td><td class="ref{flag(r["total_count_mln"], WHO6["total"])}">≥ 39</td></tr>'
               f'<tr><td>Прогрессивно подвижных всего</td><td>{f1(r["total_progressive_mln"])} млн</td><td></td><td></td></tr>')
    lowfps = r['fps'] < 49
    raw = r.get('concentration_before_debris_filter')
    debris_pct = (1 - r['concentration_mln_ml'] / raw) * 100 if raw else float('nan')
    return f'''
<section class="card">
  <h2>{html.escape(r["file"])}</h2>
  <div class="grid2">
    <div>
      <div class="big">{f1(r["concentration_mln_ml"])} <small>млн/мл</small></div>
      <div class="muted">95% ДИ {f1(ci[0])}–{f1(ci[1])} · {f1(r["cells_per_square_100um"], 1)} клеток на квадрат 0,1×0,1 мм</div>
      {bar(w6)}
      <div class="legend">{"".join(f'<span><i style="background:{col}"></i>{lab}: <b>{f1(w6[c])} %</b></span>' for c, lab, col in CLS)}</div>
    </div>
    <div>
      <div class="muted small">Скорость продвижения (мкм/с), все сперматозоиды</div>
      {hist_svg(r.get("ps_hist"))}
    </div>
  </div>
  <table>
    <thead><tr><th>Показатель</th><th>Результат</th><th>ВОЗ-5 (2010)</th><th>ВОЗ-6 (2021)</th></tr></thead>
    <tbody>
      <tr><td>Концентрация</td><td>{f1(r["concentration_mln_ml"])} млн/мл</td>
          <td class="ref{flag(r["concentration_mln_ml"], WHO5["conc"])}">≥ 15</td><td class="ref{flag(r["concentration_mln_ml"], WHO6["conc"])}">≥ 16</td></tr>
      {tot}
      <tr><td>Прогрессивная подвижность (PR = a+b)</td><td>{f1(w6["progressive"])} %</td>
          <td class="ref{flag(w6["progressive"], WHO5["pr"])}">≥ 32 %</td><td class="ref{flag(w6["progressive"], WHO6["pr"])}">≥ 30 %</td></tr>
      <tr><td>Общая подвижность (PR+NP = a+b+c)</td><td>{f1(w6["total_motile"])} %</td>
          <td class="ref{flag(w6["total_motile"], WHO5["motile"])}">≥ 40 %</td><td class="ref{flag(w6["total_motile"], WHO6["motile"])}">≥ 42 %</td></tr>
      <tr><td>ВОЗ-5: PR / NP / IM</td><td colspan="3">{f1(w5["PR"])} / {f1(w5["NP"])} / {f1(w5["IM"])} %</td></tr>
      <tr><td>ВОЗ-6: a / b / c / d</td><td colspan="3">{f1(w6["a"])} / {f1(w6["b"])} / {f1(w6["c"])} / {f1(w6["d"])} %</td></tr>
    </tbody>
  </table>
  <details><summary>Кинематика и качество анализа</summary>
  <table class="compact">
    <tr><th>Подвижные (a+b+c), средние</th><td>VCL {f1(km["vcl"])} · VSL {f1(km["vsl"])} · VAP {f1(km["vap"])} мкм/с ·
      LIN {f1(km["lin"], 2)} · STR {f1(km["str"], 2)} · WOB {f1(km["wob"], 2)} · ALH {f1(km["alh"])} мкм · BCF {f1(km["bcf"])} Гц</td></tr>
    <tr><th>Калибровка</th><td>{html.escape(r["calibration"])} → {f1(r["um_per_px"], 3)} мкм/px</td></tr>
    <tr><th>Видео</th><td>{r["width"]}×{r["height"]}, {f1(r["fps"], 1)} к/с, {f1(r["duration_s"])} с;
      в анализе {r["frames_tracked"]} кадров, для подсчёта — {r["frames_counted"]} кадров в {r["fields"]} полях зрения</td></tr>
    <tr><th>Треки</th><td>сперматозоидов {r["tracks_classified"]} (a {r["tracks_by_class"]["a"]}, b {r["tracks_by_class"]["b"]},
      c {r["tracks_by_class"]["c"]}, d {r["tracks_by_class"]["d"]}); отброшено как мусор {r["debris_tracks"]}</td></tr>
    <tr><th>Фильтр мусора</th><td>без фильтра было бы {f1(raw)} млн/мл (отсеяно ≈{f1(debris_pct, 0)} % объектов)</td></tr>
    {"<tr><th>Предупреждение</th><td>Частота кадров ниже 50 к/с: VCL, ALH и BCF занижены/неточны; классы a/b/c/d считаются по скорости продвижения за 1 с и затронуты меньше.</td></tr>" if lowfps else ""}
  </table>
  <p class="muted small">Видео с разметкой: <code>{html.escape(r["name"])}_annotated.mp4</code> · треки: <code>{html.escape(r["name"])}_tracks.csv</code></p>
  </details>
</section>'''


CSS = '''
:root{--bg:#f7f6f3;--fg:#1d1d1f;--card:#fff;--muted:#6b6b70;--line:#e3e1dc;--low:#c92a2a;--lowbg:#fff0f0;--okc:#2b8a3e}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#161618;--fg:#ececee;--card:#1f1f22;--muted:#9a9aa2;--line:#33333a;--low:#ff8787;--lowbg:#3a1f22;--okc:#69db7c}}
:root[data-theme="dark"]{--bg:#161618;--fg:#ececee;--card:#1f1f22;--muted:#9a9aa2;--line:#33333a;--low:#ff8787;--lowbg:#3a1f22;--okc:#69db7c}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1040px;margin:0 auto;padding:28px 16px 60px}h1{font-size:26px;margin:0 0 4px}h2{font-size:16px;margin:0 0 14px;word-break:break-all}
.muted{color:var(--muted)}.small{font-size:12.5px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;margin:18px 0}
.big{font-size:34px;font-weight:650;letter-spacing:-.5px}.big small{font-size:15px;font-weight:500;color:var(--muted)}
.grid2{display:grid;grid-template-columns:1.3fr 1fr;gap:24px;align-items:end;margin-bottom:14px}
@media (max-width:720px){.grid2{grid-template-columns:1fr}}
.bar{display:flex;height:14px;border-radius:7px;overflow:hidden;margin:14px 0 8px;background:var(--line)}.bar span{display:block;height:100%}
.legend{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13px}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
thead th{font-weight:600;color:var(--muted);font-size:12.5px}.compact th{width:190px;color:var(--muted);font-weight:500}
td.ref{white-space:nowrap}td.low{color:var(--low);background:var(--lowbg);font-weight:600}td.ok{color:var(--okc)}
.scroll{overflow-x:auto}.sum td,.sum th{white-space:nowrap}.sum td.num,.sum th:not(:first-child){text-align:right}
details summary{cursor:pointer;color:var(--muted);margin-top:12px}code{font-size:12.5px}
.note{border-left:3px solid var(--line);padding:2px 0 2px 14px}
'''


def write_report(results, path):
    p = results[0]['params'] if results else {}
    rows = []
    for r in results:
        w6, w5 = r['who6'], r['who5']
        c = r['concentration_mln_ml']
        rows.append(f'<tr><td>{html.escape(r["file"])}</td>'
                    f'<td class="num{flag(c, WHO6["conc"])}">{f1(c)}</td>'
                    f'<td class="num">{f1(w6["a"], 0)}</td><td class="num">{f1(w6["b"], 0)}</td>'
                    f'<td class="num">{f1(w6["c"], 0)}</td><td class="num">{f1(w6["d"], 0)}</td>'
                    f'<td class="num{flag(w5["PR"], WHO5["pr"])}">{f1(w5["PR"], 0)}</td>'
                    f'<td class="num">{f1(w5["NP"], 0)}</td><td class="num">{f1(w5["IM"], 0)}</td>'
                    f'<td class="num{flag(w6["total_motile"], WHO6["motile"])}">{f1(w6["total_motile"], 0)}</td></tr>')
    doc = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SpermCASA отчёт</title><style>{CSS}</style></head><body><main>
<h1>Анализ спермы по видео</h1>
<div class="muted">SpermCASA · {datetime.datetime.now():%d.%m.%Y %H:%M} · камера: глубина {f1(p.get("chamber_depth_um", 10), 0)} мкм, сетка {f1(p.get("grid_pitch_um", 100), 0)} мкм ·
разведение {f1(p.get("dilution", 1), 1)}</div>
<section class="card"><h2>Сводка</h2><div class="scroll"><table class="sum">
<thead><tr><th>Образец</th><th>Конц., млн/мл</th><th>a %</th><th>b %</th><th>c %</th><th>d %</th><th>PR %</th><th>NP %</th><th>IM %</th><th>Подвижн. %</th></tr></thead>
<tbody>{"".join(rows)}</tbody></table></div>
<p class="muted small">Красным — ниже нижней референсной границы ВОЗ-6 (концентрация, общая подвижность) или ВОЗ-5 (PR).
a, b — прогрессивные ≥25 и 5–25 мкм/с; c — движение без продвижения (&lt;5 мкм/с); d — неподвижные. ВОЗ-5: PR = a+b, NP = c, IM = d.</p></section>
{"".join(card(r) for r in results)}
<section class="card note small muted">
<b>Как считается.</b> Движение столика компенсируется по сетке камеры (фазовая корреляция); кадры, где столик быстро сдвигают, пропускаются.
Масштаб калибруется по шагу сетки. Концентрация = число сперматозоидов в кадре / (видимая площадь вне линий сетки × глубина камеры) × разведение,
усреднённо по неподвижным кадрам; 95% ДИ — по разбросу между полями зрения. Неподвижные объекты проходят через классификатор «головка / мусор»
(точность на независимых видео ≈84 %). Доли a/b/c/d считаются по времени наблюдения каждого сперматозоида.<br><br>
<b>Ограничения.</b> Исследовательский инструмент, не сертифицированное медицинское изделие. Морфология и жизнеспособность по нативному видео не оцениваются.
Перед клиническим использованием результаты нужно сверить с ручным подсчётом опытного лаборанта.
</section>
</main></body></html>'''
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(doc)
