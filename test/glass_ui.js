// vidros no navegador: transparente, quebra com tiro (cacos + som), pulo pela janela
const { chromium } = require('playwright'); const path = require('path'); const S = process.argv[2] || '/tmp';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? '  ✓ ' : '  ✗ FALHOU: ') + m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const logs = [];
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await p.addInitScript(`localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'medio', renderScale:.8}))`);
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=caos'); await p.waitForFunction('window.G && G.scene === "play"', null, { timeout: 240000 });
  const info = await p.evaluate(() => {
    Input.force = true; const s = G.sim; s.phase = 'live'; s.cow = null; for (const q of s.players) { q.onCow = false; q.chute = null; q.equipT = 0; if (q !== G.me) { q.ai = null; q.m.x = 9999; } }
    const nav = G.nav, W = G.map.W; let P = null;
    for (const g of W.glass) { if (g.fake) continue; const n = g.ax === 'x' ? [1, 0] : [0, 1]; for (const sd of [1, -1]) { const ox = g.cx + n[0] * 3.2 * sd, oz = g.cz + n[1] * 3.2 * sd, ix = g.cx - n[0] * 1.8 * sd, iz = g.cz - n[1] * 1.8 * sd, ko = nav.idx(ox, oz), ki = nav.idx(ix, iz); if (ko < 0 || ki < 0 || !nav.ok[ko] || !nav.ok[ki]) continue; if (g.y0 - nav.y[ko] < .4 || g.y0 - nav.y[ko] > 1.4) continue; P = { id: g.id, ox, oz, oy: nav.y[ko] }; break; } if (P) break; }
    const me = G.me; me.m.x = P.ox; me.m.z = P.oz; me.m.y = P.oy + .02; me.m.vx = me.m.vz = 0; const g = W.glass[P.id - 1]; G.view.yaw = Math.atan2(-(g.cx - me.m.x), -(g.cz - me.m.z)); G.view.pitch = Math.atan2(g.cy - (me.m.y + 1.6), 3.2) * .7; me.w = 'estilingue'; me.own.estilingue = 1; me.mag.estilingue = 7;
    for (let i = 0; i < 10; i++) fixedStep(); window.__gid = P.id; return P; });
  ok(!!info, 'janela de casa encontrada');
  await p.waitForTimeout(1200); await p.screenshot({ path: S + '/gl_1_inteira.png' });
  await p.evaluate(() => { Input.btn[0] = true; for (let i = 0; i < 6; i++) fixedStep(); Input.btn[0] = false; for (let i = 0; i < 4; i++) fixedStep(); });
  ok(await p.evaluate('G.map.W.glass[__gid - 1].broken'), 'tiro do jogador quebrou o vidro');
  await p.waitForTimeout(250); await p.screenshot({ path: S + '/gl_2_quebrando.png' }); await p.waitForTimeout(1500); await p.screenshot({ path: S + '/gl_3_quebrada.png' });
  const side0 = await p.evaluate(() => { const g = G.map.W.glass[__gid - 1]; return g.ax === 'x' ? Math.sign(G.me.m.x - g.cx) : Math.sign(G.me.m.z - g.cz); });
  await p.keyboard.down('KeyW'); for (let i = 0; i < 14; i++) { await p.keyboard.down('Space'); await p.evaluate(() => { for (let k = 0; k < 4; k++) fixedStep(); }); await p.keyboard.up('Space'); await p.evaluate(() => { for (let k = 0; k < 4; k++) fixedStep(); }); } await p.keyboard.up('KeyW');
  const side1 = await p.evaluate(() => { const g = G.map.W.glass[__gid - 1]; return g.ax === 'x' ? Math.sign(G.me.m.x - g.cx) : Math.sign(G.me.m.z - g.cz); });
  ok(side0 !== side1, 'jogador pulou pela janela (W + Espaço)');
  await p.waitForTimeout(600); await p.screenshot({ path: S + '/gl_4_dentro.png' });
  console.log(logs.join('\n')); ok(!logs.some(l => /PAGEERROR/.test(l)), 'sem erros de JavaScript'); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
