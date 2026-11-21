// fluxo 5x5 no navegador: SELEÇÃO (clicar e travar) → CARREGAMENTO → COMPRA 45 s com barreiras → tentar atravessar → ROUND (barreiras somem)
const { chromium } = require('playwright'); const path = require('path'); const S = process.argv[2] || process.env.SC || '/tmp';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? '  ✓ ' : '  ✗ FALHOU: ') + m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const logs = [];
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error') logs.push('err: ' + m.text().slice(0, 200)); });
  await p.addInitScript(`localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'medio', renderScale:.7}))`);
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?auto=tatico');
  await p.waitForFunction('window.G && G.scene === "play" && G.phase === "select"', null, { timeout: 240000 });
  await p.waitForTimeout(800); await p.evaluate(() => { const b = [...document.querySelectorAll('#modal-root button')].find(x => /convidado/i.test(x.textContent)); if (b) b.click(); else if (window.UI && UI.close) UI.close(); });
  await p.waitForTimeout(2000); await p.screenshot({ path: S + '/fl_1_select.png' });
  ok(await p.evaluate('G.sim.flowState()') === 'AGENT_SELECTION' && await p.evaluate('!document.getElementById("agsel").classList.contains("hidden")'), 'tela SELECIONE SEU AGENTE visível');
  ok(await p.evaluate('document.querySelectorAll("#agsel .as-card").length') === 5 && await p.evaluate('document.querySelectorAll("#agsel .as-slot").length') === 10, '5 agentes + 10 vagas (5 aliados, 5 adversários)');
  ok(await p.evaluate('document.getElementById("click2play").classList.contains("hidden")'), 'nada cobrindo a seleção');
  // clica num card e trava
  await p.click('.as-card[data-f="mateiro"]').catch(e => logs.push('click card: ' + e.message));
  await p.waitForTimeout(300); await p.click('.as-lock').catch(e => logs.push('click lock: ' + e.message));
  await p.waitForTimeout(600); await p.screenshot({ path: S + '/fl_2_locked.png' });
  ok(await p.evaluate('G.me.farmer') === 'mateiro', 'clicou e travou o Mateiro'); ok(await p.evaluate('document.querySelector(".as-lock").disabled'), 'botão mostra AGENTE TRAVADO');
  await p.evaluate(() => { for (let i = 0; i < 30 * 60 && G.phase === 'loading'; i++) fixedStep(); }); await p.waitForTimeout(800); await p.evaluate(() => { for (let i = 0; i < 60 * 25; i++) fixedStep(); });
  ok(await p.evaluate('G.sim.flowState()') === 'INITIAL_BUY_PHASE' && await p.evaluate('G.map.W.dyn.filter(o=>o.barrier).length') > 0, 'INITIAL_BUY_PHASE com barreiras ativas');
  // olha para a saída mais próxima
  await p.evaluate(() => { const bar = computeBarrier(G.map, G.nav), m = G.me.m; let g = bar.gates[0], bd = 1e9; for (const q of bar.gates) { const d = Math.hypot(q.x - m.x, q.z - m.z); if (q.n > 3 && d < bd) { bd = d; g = q; } } const tx = g.x - g.nx * 7, tz = g.z - g.nz * 7; m.x = tx; m.z = tz; m.y = G.map.W.heightAt(tx, tz) + .05; G.view.yaw = Math.atan2(-(g.x - tx), -(g.z - tz)); G.view.pitch = -.05; });
  await p.waitForTimeout(1500); await p.screenshot({ path: S + '/fl_4_barrier.png' });
  // tenta atravessar correndo
  await p.evaluate(() => { Input.force = true; }); await p.keyboard.down('KeyW'); await p.waitForTimeout(2500); await p.keyboard.up('KeyW');
  ok(await p.evaluate(() => { const bar = computeBarrier(G.map, G.nav), k = G.nav.idx(G.me.m.x, G.me.m.z); return k < 0 || bar.dist[k] <= bar.D + 1; }), 'segurando W contra a barreira: continua dentro do spawn');
  await p.screenshot({ path: S + '/fl_5_push.png' });
  await p.evaluate(() => { G.sim.pt = 1.2; }); await p.waitForFunction('G.phase === "live"', null, { timeout: 30000 }); await p.waitForTimeout(700);
  ok(await p.evaluate('G.map.W.dyn.filter(o=>o.barrier).length') === 0, 'ROUND iniciado: barreiras liberadas');
  await p.screenshot({ path: S + '/fl_6_live.png' });
  if (logs.length) console.log(logs.join('\n')); ok(!logs.some(l => /PAGEERROR/.test(l)), 'sem erros de JavaScript'); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
