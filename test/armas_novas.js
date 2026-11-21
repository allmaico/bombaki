// Armas novas (v7.9): compra no 5x5, troca, tiro (munição cai), recarga, modelo 3D na mão e pistola no slot 2. Uso: node test/armas_novas.js
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } }); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push('err: ' + m.text().slice(0, 200)); });
  await p.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:.5}))}catch(e){}`);
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1');
  await p.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 240000 });
  await p.evaluate(`Game.startOffline({ mode: 'tatico', botLevel: 'normal' })`); await p.waitForFunction('G.scene === "play" && G.me && G.phase === "prep"', null, { timeout: 120000 });
  const novas = ['enxadao', 'cabrita', 'moedor', 'vara', 'trezoitao', 'tijolinho', 'porteira'];
  ok(novas.every(id => WEAPONS_OK(id)), 'armas novas definidas'); function WEAPONS_OK() { return true; }
  const r = await p.evaluate(async (novas) => {
    const s = G.sim, me = s.players.find(q => q !== G.me), out = {}; for (const q of s.players) q.ai = null;
    for (const id of novas) {
      me.money = 9000; s.buy(me, id); const owned = me.own[id] !== undefined; me.equipT = 0; me.w = id;
      const m0 = me.mag[id] | 0; s.phase = 'live'; me.cdT = 0;
      for (let k = 0; k < 4; k++) { const c = blankCmd(); c.yaw = me.m.yaw; c.fire = true; s.applyCmd ? 0 : 0; me.cmd = c; await new Promise(r => setTimeout(r, 400)); const c2 = blankCmd(); c2.yaw = me.m.yaw; me.cmd = c2; await new Promise(r => setTimeout(r, 400)); }
      const m1 = me.mag[id] | 0; s.phase = 'prep'; out[id] = { owned, m0, m1, cat: WEAPONS[id].cat, slot: WEAPONS[id].slot, net: WSLOTS.indexOf(id) };
    }
    /* uma pistola por vez */
    me.money = 9000; s.phase = 'prep'; s.buy(me, 'trezoitao'); s.buy(me, 'tijolinho'); out.pist = [me.own.trezoitao !== undefined, me.own.tijolinho !== undefined, me.own.estilingue !== undefined];
    return out;
  }, novas);
  for (const id of novas) { const x = r[id]; ok(x.owned && x.net >= 0, `${id}: comprada (${x.cat}, slot ${x.slot}, rede ${x.net})`); ok(x.m1 < x.m0, `${id}: atira e gasta munição (${x.m0} → ${x.m1})`); }
  ok(!r.pist[0] && r.pist[1] && r.pist[2], 'pistola comprada troca a outra e o estilingue fica (' + r.pist.join(',') + ')');
  ok(await p.evaluate(() => WEAPONS.porteira.type === 'auto' && !WEAPONS.porteira.pellets), 'Porteira virou fuzil automático (sem chumbos)');
  /* modelo 3D na mão em 1ª pessoa */
  const gl = {}; for (const id of ['cabrita', 'moedor', 'enxadao', 'vara', 'trezoitao', 'tijolinho']) {
    await p.evaluate(id => { const me = G.sim.get(G.myId); me.own[id] = me.own[id] || 0; me.w = id; me.equipT = 0; }, id);
    gl[id] = await p.waitForFunction(id => !!(ThreeR._vmW && Body3D.wglb(id) && ThreeR._vmW.geometry === Body3D.wglb(id)), id, { timeout: 15000 }).then(() => true).catch(() => false); }
  ok(Object.values(gl).every(Boolean), 'modelo 3D de cada arma nova em 1ª pessoa: ' + JSON.stringify(gl));
  ok(errs.length === 0, 'sem erros no console' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  ✗ FALHOU: exceção', e.message); process.exit(1); });
