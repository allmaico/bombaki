// Gera dist/index.html (arquivo único) a partir de src/
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2); const opt = {}; for (let i = 0; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];
const dir = path.join(__dirname, 'src/js');
const files = fs.readdirSync(dir).filter(f => /^\d+_.*\.js$/.test(f)).sort();
const only = opt.upto ? files.filter(f => parseInt(f) <= parseInt(opt.upto)) : files;
let js = only.map(f => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
if (opt.entry) js += '\n/* ---- entry ---- */\n' + fs.readFileSync(path.resolve(opt.entry), 'utf8');
const tplPath = opt.tpl ? path.resolve(opt.tpl) : path.join(__dirname, 'src/index.template.html');
const tpl = fs.existsSync(tplPath) ? fs.readFileSync(tplPath, 'utf8') : '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#000}canvas{width:100%;height:100%;display:block}</style></head><body><canvas id="cv"></canvas><script>/*JS*/</script></body></html>';
const cssPath = path.join(__dirname, 'src/style.css'); const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
const out = tpl.replace('/*CSS*/', () => css).replace('/*JS*/', () => js.replace(/<\/script/gi, '<\\/script'));
const outPath = path.resolve(opt.out || 'dist/index.html'); fs.mkdirSync(path.dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, out);
console.log('build ok →', path.relative(process.cwd(), outPath), (out.length / 1024).toFixed(0) + ' KB', only.length + ' módulos');
