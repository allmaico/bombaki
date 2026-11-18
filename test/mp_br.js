// multiplayer no Battle Royale: cliente vê a vaca, salta (ESPAÇO), abre paraquedas e pousa; mochila sincroniza
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../dist/index.html'));
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const URL = `http://127.0.0.1:${srv.address().port}/?net=local&test=1`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 480, height: 270 } }); await ctx.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'muito_baixo', renderScale:0.3}))}catch(e){}`);
  const A = await ctx.newPage(), B = await ctx.newPage(); const logs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; logs.push((c ? '  ✓ ' : '  ✗ FALHOU: ') + m); };
  for (const [n, p] of [['A', A], ['B', B]]) { p.on('pageerror', e => logs.push(`[${n}] PAGEERROR: ` + e.message)); p.on('console', m => { if (m.type() === 'error' && !/TUNNEL|Failed to load/.test(m.text())) logs.push(`[${n}] err ` + m.text().slice(0, 200)); }); }
  await Promise.all([A.goto(URL), B.goto(URL)]); await Promise.all([A, B].map(p => p.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 240000 })));
  const code = await A.evaluate(`Game.hostRoom({ mode: 'caos', fill: true, total: 16 })`); await B.evaluate(`Game.joinRoom(${JSON.stringify(code)})`);
  await A.evaluate('G.net.startNow()'); await Promise.all([A, B].map(p => p.waitForFunction('G.scene === "play"', null, { timeout: 60000 })));
  const idB = await B.evaluate('G.myId');
  await A.evaluate('__ff(60*6)'); await B.waitForTimeout(1500);
  ok(await B.evaluate('!!G.cowS && G.cowS[4] === 1'), 'cliente recebe a vaca voando');
  ok(await B.evaluate('G.me.onCow'), 'cliente está montado na vaca');
  await B.keyboard.down('Space'); await B.waitForTimeout(900); await B.keyboard.up('Space'); await A.evaluate('__ff(10)'); await B.waitForTimeout(1200);
  ok(await A.evaluate(`!!G.sim.get(${JSON.stringify(idB)}).chute`), 'host: cliente saltou e abriu o paraquedas');
  ok(await B.evaluate('!!G.me.chute'), 'cliente vê o próprio paraquedas');
  await A.evaluate('__ff(60*25)'); await B.waitForTimeout(1500);
  const st = await A.evaluate(`(()=>{ const p=G.sim.get(${JSON.stringify(idB)}); return { ch: !!p.chute, alive: p.alive, y: +p.m.y.toFixed(1), x: +p.m.x.toFixed(0), z: +p.m.z.toFixed(0), sw: !!p.m.swim }; })()`); ok(!st.ch, 'host: cliente pousou ' + JSON.stringify(st));
  await A.evaluate(`G.sim.invAdd(G.sim.get(${JSON.stringify(idB)}), 'mel', 1)`); await A.evaluate('__ff(6)'); await B.waitForTimeout(1200);
  ok(await B.evaluate('G.me.inv && G.me.inv.mel === 1'), 'mochila do cliente sincroniza (mel x1)');
  console.log(logs.join('\n')); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(2); });
