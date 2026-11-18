// Lê um módulo de src/js aceitando .js ou .ts (TypeScript é convertido pelo esbuild)
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '../src/js');
let esbuild = null; try { esbuild = require(path.join(__dirname, '../node_modules/esbuild')); } catch (e) { try { esbuild = require('esbuild'); } catch (e2) { } }
function readModule(name) {
  const base = name.replace(/\.(js|ts)$/, ''), js = path.join(SRC, base + '.js'), ts = path.join(SRC, base + '.ts');
  if (fs.existsSync(js)) return fs.readFileSync(js, 'utf8');
  if (!fs.existsSync(ts)) throw new Error('módulo não encontrado: ' + name);
  if (!esbuild) throw new Error('rode "npm install" (esbuild) para carregar ' + base + '.ts');
  return esbuild.transformSync(fs.readFileSync(ts, 'utf8'), { loader: 'ts', target: 'es2022', sourcefile: base + '.ts' }).code;
}
module.exports = { readModule, SRC };
