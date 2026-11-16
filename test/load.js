// Carrega módulos puros (sem DOM/GL) no Node para testes
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '../src/js');
function load(files, exportsList) {
  const src = files.map(n => fs.readFileSync(path.join(SRC, n), 'utf8')).join('\n');
  const fn = new Function('window', 'document', 'localStorage', 'performance', src + '\nreturn {' + exportsList.join(',') + '};');
  return fn({}, undefined, undefined, { now: () => Date.now() });
}
module.exports = { load, SRC };
