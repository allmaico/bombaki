// partida pública (salas PT1..): A cria, B encontra; contagem rápida de 20 s com 2 humanos
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../dist/index.html'));
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const URL = `http://127.0.0.1:${srv.address().port}/?net=local&test=1`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 480, height: 270 } }); await ctx.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:0.3}))}catch(e){}`);
  const A = await ctx.newPage(), B = await ctx.newPage(); const logs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; logs.push((c ? '  ✓ ' : '  ✗ FALHOU: ') + m); };
  for (const [n, p] of [['A', A], ['B', B]]) { p.on('console', m => { if (m.type() === 'error' && !/TUNNEL|Failed to load resource/.test(m.text())) logs.push(`[${n}] err: ` + m.text().slice(0, 200)); }); p.on('pageerror', e => logs.push(`[${n}] PAGEERROR: ` + e.message)); }
  await Promise.all([A.goto(URL), B.goto(URL)]); await Promise.all([A, B].map(p => p.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 180000 })));
  const t0 = Date.now(); await A.evaluate(`Game.publicMatch({ mode: 'tatico', botLevel: 'normal' })`); await A.waitForFunction('G.scene === "lobby"', null, { timeout: 40000 });
  ok(await A.evaluate('G.kind') === 'host' && await A.evaluate('G.code') === 'PT1', 'A criou a sala pública PT1 em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  const t1 = Date.now(); await B.evaluate(`Game.publicMatch({ mode: 'tatico', botLevel: 'normal' })`); await B.waitForFunction('G.scene === "lobby"', null, { timeout: 40000 });
  ok(await B.evaluate('G.kind') === 'client' && await B.evaluate('G.code') === 'PT1', 'B encontrou a sala PT1 em ' + ((Date.now() - t1) / 1000).toFixed(1) + ' s');
  await A.waitForTimeout(1500);
  const cd = await A.evaluate('G.net.countdown'); ok(cd > 0 && cd <= 20, 'contagem rápida iniciou com 2 humanos (cd=' + cd.toFixed(1) + ')');
  ok(await A.evaluate('G.net.members.size') === 2, 'host com 2 membros');
  // modo caos usa PC1..
  const C = await ctx.newPage(); await C.goto(URL); await C.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 180000 });
  await C.evaluate(`Game.publicMatch({ mode: 'caos', botLevel: 'normal' })`); await C.waitForFunction('G.scene === "lobby"', null, { timeout: 40000 });
  logs.push('  caos: code=' + await C.evaluate('G.code') + ' mode=' + await C.evaluate('G.mode') + ' kind=' + await C.evaluate('G.kind') + ' scene=' + await C.evaluate('G.scene'));
  ok(await C.evaluate('G.code') === 'PC1' && await C.evaluate('G.net.cfg.mode') === 'caos', 'modo Caos cria PC1');
  console.log(logs.join('\n')); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(2); });
