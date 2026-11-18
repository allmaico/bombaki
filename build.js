/* =====================================================================
   build.js — gera o jogo a partir de src/
   • módulos src/js/NN_nome.(js|ts) em ordem numérica; .ts é convertido pelo
     esbuild (tira os tipos); .js é validado pelo esbuild (pega erro de sintaxe)
   • node build.js                → dist/index.html (arquivo único)
   • node build.js --split [dir]  → dir/index.html + css/ + js/<área>/*.js
   • node build.js --upto 40 / --entry x.js / --tpl t.html / --out f.html (usados pelos testes)
   ===================================================================== */
const fs = require('fs'), path = require('path');
let esbuild = null; try { esbuild = require('esbuild'); } catch (e) { console.warn('⚠ esbuild não instalado (rode: npm install) — .ts não serão convertidos'); }
const args = process.argv.slice(2), opt = {}; for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2), v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; opt[k] = v; }
const dir = path.join(__dirname, 'src/js');
const files = fs.readdirSync(dir).filter(f => /^\d+_.*\.(js|ts)$/.test(f) && !f.endsWith('.d.ts')).sort();
const only = opt.upto ? files.filter(f => parseInt(f) <= parseInt(opt.upto)) : files;
/* código JS final de um módulo */
function moduleJs(f) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  if (!esbuild) { if (f.endsWith('.ts')) throw new Error('precisa do esbuild para ' + f); return src; }
  try {
    if (f.endsWith('.ts')) return esbuild.transformSync(src, { loader: 'ts', target: 'es2022', format: undefined, sourcefile: f, keepNames: false, legalComments: 'inline' }).code;
    esbuild.transformSync(src, { loader: 'js', target: 'es2022', sourcefile: f });   /* só valida */
    return src;
  } catch (e) { console.error('✗ erro em ' + f + ':\n' + (e.errors || []).map(x => `  ${x.location ? x.location.line + ':' + x.location.column : ''} ${x.text}`).join('\n')); process.exit(1); }
}
const outName = f => f.replace(/\.ts$/, '.js');
const tplPath = opt.tpl ? path.resolve(opt.tpl) : path.join(__dirname, 'src/index.template.html');
const tpl = fs.existsSync(tplPath) ? fs.readFileSync(tplPath, 'utf8') : '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#000}canvas{width:100%;height:100%;display:block}</style></head><body><canvas id="cv"></canvas><script>/*JS*/</script></body></html>';
const cssPath = path.join(__dirname, 'src/style.css'), css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
/* bibliotecas embutidas (Three.js) — empacotadas pelo esbuild como script global */
function vendorJs() {
  const entry = path.join(__dirname, 'src/vendor/three-entry.js'); if (!fs.existsSync(entry) || !esbuild || opt.upto) return '';
  const r = esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none' });
  return '/* Three.js (MIT) — https://threejs.org */\n' + r.outputFiles[0].text;
}
const vendor = vendorJs();
const mods = (vendor ? [{ f: '000_three.js', js: vendor }] : []).concat(only.map(f => ({ f, js: moduleJs(f) })));

if (opt.split) {
  /* ---------- versão separada ---------- */
  const outDir = path.resolve(typeof opt.split === 'string' ? opt.split : 'publicar');
  const area = f => { if (f === '000_three.js') return 'vendor'; const n = parseInt(f); return n < 10 ? 'nucleo' : n < 20 ? 'graficos' : n < 30 ? 'mapas' : n < 40 ? 'modelos' : n < 50 ? 'simulacao' : n === 50 || n === 51 ? 'rede-audio' : n < 60 || n >= 500 ? 'interface' : 'jogo'; };
  fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(path.join(outDir, 'css'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'css/bombaki.css'), css);
  const tags = mods.map(({ f, js }) => { const rel = 'js/' + area(f) + '/' + outName(f); fs.mkdirSync(path.join(outDir, path.dirname(rel)), { recursive: true }); fs.writeFileSync(path.join(outDir, rel), js); return `<script src="${rel}"></script>`; });
  fs.writeFileSync(path.join(outDir, 'index.html'), tpl.replace('<style>/*CSS*/</style>', '<link rel="stylesheet" href="css/bombaki.css">').replace('<script>/*JS*/</script>', tags.join('\n')));
  console.log('build separado ok →', path.relative(process.cwd(), outDir) + '/', mods.length + ' arquivos JS (' + mods.filter(m => m.f.endsWith('.ts')).length + ' de TypeScript) + 1 CSS');
} else {
  /* ---------- arquivo único ---------- */
  let js = mods.map(({ f, js }) => `/* ---- ${outName(f)} ---- */\n` + js).join('\n');
  if (opt.entry) js += '\n/* ---- entry ---- */\n' + fs.readFileSync(path.resolve(opt.entry), 'utf8');
  const out = tpl.replace('/*CSS*/', () => css).replace('/*JS*/', () => js.replace(/<\/script/gi, '<\\/script'));
  const outPath = path.resolve(opt.out || 'dist/index.html'); fs.mkdirSync(path.dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, out);
  console.log('build ok →', path.relative(process.cwd(), outPath), (out.length / 1024).toFixed(0) + ' KB', mods.length + ' módulos (' + mods.filter(m => m.f.endsWith('.ts')).length + ' em TypeScript)');
}
