import sys
body=open('app_body.html').read()
core=open('core.js').read()
a=core.index("// ---------------------------------------------------------------- обработка кадра (нужен cv)"); b=core.index("function gridPitch(")
core=core[:a]+core[b:]
a=core.index("/* Фазовая корреляция: сдвиг содержимого cur относительно prev, в пикселях четвертного кадра. */"); b=core.index("// ---------------------------------------------------------------- чистый JS (без OpenCV)")
core=core[:a]+core[b:]
model=open('model.json').read()
i18n=open('i18n.js').read()
fmt="const fmt = (v, nd = 1) => (v == null || !isFinite(v)) ? '—' : (LANG === 'en' ? v.toFixed(nd) : v.toFixed(nd).replace('.', ','));\n"
app="(() => {\n'use strict';\n"+open('head.js').read()+i18n+fmt+open('pipeline.js').read()+open('ui.js').read()+"\n})();\n"
offline = '--offline' in sys.argv
mp4tag = '<script>\n'+open('mp4box.all.min.js').read().replace('</script','<\\/script')+'\n</script>' if offline else '<script src="https://cdn.jsdelivr.net/npm/mp4box@0.5.3/dist/mp4box.all.min.js"></script>'
html=body+'\n'+mp4tag+'\n<script id="core">\n'+core+'\n</script>\n<script id="model" type="application/json">'+model+'</script>\n<script>\n'+app+'</script>\n'
if True:
    html='<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head><body>\n'+html+'</body></html>\n'
if offline:
    open('Magauiya.html','w').write(html)
else:
    open('index.html','w').write(html)
pass
print(len(html)//1024,'KB')
