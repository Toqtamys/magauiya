// Собирает bluetol.html из src/ui.html и src/core.js
const fs = require('fs');
let u = fs.readFileSync(__dirname + '/src/ui.html', 'utf8');
u = u.replace('/*__CORE__*/', () => fs.readFileSync(__dirname + '/src/core.js', 'utf8')).replace('/*__SAMPLES__*/', 'const SAMPLES = [];');
u = '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n' + u + '\n</body>\n</html>\n';
fs.writeFileSync(__dirname + '/bluetol.html', u);
console.log('bluetol.html собран');
