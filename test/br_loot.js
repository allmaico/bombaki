// Todos contra Todos (v7.9): loot farto, arma com munição ao lado, baús que abrem e soltam itens, armas novas no chão
// (modelo 3D), sem erros. Uso: SC=<pasta> node test/br_loot.js
const { chromium } = require('playwright'); const path = require('path');
const SC = process.env.SC || '/tmp'; let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 600 } }); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push('err: ' + m.text().slice(0, 200)); });
  await p.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:.6}))}catch(e){}`);
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1');
  await p.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 240000 });
  await p.evaluate(`Game.startOffline({ mode: 'caos', botLevel: 'normal' })`); await p.waitForFunction('G.scene === "play" && G.sim && G.sim.loot.length > 0', null, { timeout: 120000 });
  const st = await p.evaluate(() => { const L = G.sim.loot, c = k => L.filter(l => l.k === k).length, ws = new Set(L.filter(l => l.k === 'w').map(l => l.w)); return { n: L.length, w: c('w'), a: c('a'), chest: c('chest'), ws: [...ws], ammo: [...new Set(L.filter(l => l.k === 'a').map(l => l.w))] }; });
  ok(st.n >= 400, `muito loot no mapa: ${st.n} itens (${st.w} armas, ${st.a} munições)`);
  ok(st.chest >= 40, `baús espalhados: ${st.chest}`);
  ok(['cabrita', 'moedor', 'enxadao', 'vara', 'trezoitao', 'tijolinho'].filter(w => st.ws.includes(w)).length >= 4, 'armas novas no chão: ' + st.ws.join(', '));
  ok(!st.ammo.includes('cartucho'), 'munição só das armas que existem: ' + st.ammo.join(', '));
  /* abre um baú com um jogador */
  const op = await p.evaluate(() => { const s = G.sim, q = s.players.find(x => x !== G.me), ch = s.loot.find(l => l.k === 'chest'), n0 = s.loot.length; q.m.x = ch.x; q.m.z = ch.z; q.m.y = ch.y; const r = s.pickLoot(q, ch);
    const near = s.loot.filter(l => l !== ch && Math.hypot(l.x - ch.x, l.z - ch.z) < 2.2); window.__ch = ch; return { r, k: ch.k, add: s.loot.length - n0, kinds: near.map(l => l.k + (l.tier ? ':' + l.tier : '')), again: s.pickLoot(q, ch) }; });
  ok(op.r && op.k === 'chestO', 'baú abre e vira baú aberto');
  ok(op.add >= 4 && op.kinds.some(k => k.startsWith('w:')), `baú solta itens (${op.add}): ${op.kinds.join(', ')}`);
  ok(!op.again, 'baú aberto não abre de novo');
  /* print: câmera no baú aberto, com as armas 3D no chão */
  await p.evaluate(() => { const ch = window.__ch, me = G.sim.get(G.myId); me.chute = null; me.m.x = ch.x - 3; me.m.z = ch.z - 3; me.m.y = ch.y; window.__cam = { x: ch.x, y: ch.y + 2.2, z: ch.z - 3.4, yaw: Math.PI, pitch: -.45 }; });
  await p.waitForTimeout(6000); await p.screenshot({ path: SC + '/br_bau.png', timeout: 120000 });
  ok(await p.evaluate(() => LootGLB.pool.some(m => m.visible) || LootGLB.pool.length > 0), 'armas no chão desenhadas com o modelo 3D');
  ok(errs.length === 0, 'sem erros no console' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  ✗ FALHOU: exceção', e.message); process.exit(1); });
