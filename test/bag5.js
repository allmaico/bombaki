// mochila no 5x5: abre com I (e com 🎒 no celular fora da compra), mostra armas, cura e as 4 habilidades; usar habilidade pela mochila
const { chromium } = require('playwright'); const path = require('path'); const S = process.argv[2] || '/tmp';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? '  ✓ ' : '  ✗ FALHOU: ') + m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const logs = [];
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=tatico'); await p.waitForFunction('window.G && G.scene === "play" && G.phase === "prep"', null, { timeout: 240000 });
  await p.evaluate(() => { Input.force = true; __live(); G.sim.pt = 99; G.me.caixa = 1; G.me.pano = 1; });
  await p.keyboard.press('KeyI'); await p.waitForTimeout(800);
  ok(await p.evaluate('Bag.open && !document.getElementById("bag").classList.contains("hidden")'), 'mochila abre com I no 5x5');
  const kinds = await p.evaluate('[...document.querySelectorAll("#bag .bg-it")].map(e => e.dataset.k)');
  ok(kinds.includes('armas') && kinds.includes('cura') && kinds.filter(k => k === 'hab').length === 4, 'mostra armas, cura e as 4 habilidades (' + kinds.join(',') + ')');
  await p.screenshot({ path: S + '/bag5.png' });
  await p.click('#bag .bg-it[data-k="hab"]'); await p.waitForTimeout(300); const before = await p.evaluate('G.me.abC.join()');
  await p.click('#bag [data-ab]'); await p.evaluate(() => { for (let i = 0; i < 6; i++) fixedStep(); }); ok(await p.evaluate('G.me.abC.join()') !== before, 'usar habilidade pela mochila funciona');
  console.log(logs.join('\n')); ok(!logs.some(l => /PAGEERROR/.test(l)), 'sem erros de JavaScript'); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
