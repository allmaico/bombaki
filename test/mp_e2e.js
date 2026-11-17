// multiplayer ponta-a-ponta com 2 páginas (BroadcastChannel via http): sala → lobby → partida → predição → tiro → queda → reconexão automática
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
const html = fs.readFileSync(path.resolve(__dirname, '../dist/index.html'));
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port; const URL = `http://127.0.0.1:${port}/?net=local&test=1`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:0.35}))}catch(e){}`);
  const A = await ctx.newPage(), B = await ctx.newPage(); const logs = []; let fails = 0;
  const ok = (c, m) => { if (!c) fails++; logs.push((c ? '  ✓ ' : '  ✗ FALHOU: ') + m); };
  for (const [n, p] of [['A', A], ['B', B]]) { p.on('console', m => { if (m.type() === 'error' && !/TUNNEL|Failed to load resource/.test(m.text())) logs.push(`[${n}] err: ` + m.text().slice(0, 200)); }); p.on('pageerror', e => logs.push(`[${n}] PAGEERROR: ` + e.message)); }
  await Promise.all([A.goto(URL), B.goto(URL)]);
  await Promise.all([A, B].map(p => p.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 180000 })));
  // B fica com outro nome
  await B.evaluate(`profile.name='Visitante'; saveProfile && saveProfile();`);
  const code = await A.evaluate(`Game.hostRoom({ mode: 'tatico', fill: true, rounds: 3, botLevel: 'normal' })`); logs.push('sala ' + code);
  ok(/^[A-Z0-9]{4,8}$/.test(code), 'código da sala gerado: ' + code);
  const w = await B.evaluate(`Game.joinRoom(${JSON.stringify(code)}).then(w => ({ id: w.id, n: w.members.length, mode: w.cfg.mode }))`);
  ok(w.n === 2, 'B entrou na sala; membros vistos por B = ' + w.n);
  await A.waitForTimeout(600);
  ok(await A.evaluate('G.net.members.size') === 2, 'host vê 2 membros');
  ok(await B.evaluate('G.scene') === 'lobby' && await B.evaluate('G.kind') === 'client', 'B no lobby como cliente');
  await A.evaluate('G.net.startNow()');
  await Promise.all([A, B].map(p => p.waitForFunction('G.scene === "play"', null, { timeout: 60000 })));
  ok(true, 'ambos em partida');
  // FLUXO: seleção de agentes sincronizada (os dois humanos travam pela rede; ?test=1 trava o agente do perfil)
  await B.waitForFunction('G.phase === "select" && !!document.querySelector("#agsel:not(.hidden) .as-card")', null, { timeout: 30000 }).catch(() => { });
  ok(await B.evaluate('G.phase') === 'select' && await B.evaluate('!!document.querySelector("#agsel:not(.hidden)")'), 'cliente vê a tela SELECIONE SEU AGENTE');
  await A.waitForFunction(`(()=>{ const id = ${JSON.stringify(await B.evaluate('G.myId'))}; const p = G.sim.get(id); return p && !!p.farmer; })()`, null, { timeout: 30000 }).catch(() => { });
  const farB = await A.evaluate(`G.sim.get(${JSON.stringify(await B.evaluate('G.myId'))}).farmer`); ok(!!farB, 'host recebeu o agente travado pelo cliente: ' + farB);
  await A.evaluate("(()=>{ for (let i = 0; i < 70 * 60 && G.sim.phase === 'select'; i++) fixedStep(); })()");
  ok(await A.evaluate('G.sim.phase') === 'loading', 'seleção encerrada → MAP_LOADING');
  await A.waitForFunction('G.sim.phase === "prep"', null, { timeout: 40000 }).catch(() => { });
  const rdy = await A.evaluate(`G.sim.get(${JSON.stringify(await B.evaluate('G.myId'))}).ready`); ok(rdy === true, 'cliente avisou que carregou (pronto)');
  ok(await A.evaluate('G.sim.flowState()') === 'INITIAL_BUY_PHASE', 'host em INITIAL_BUY_PHASE');
  await B.waitForTimeout(1200);
  ok(await B.evaluate('G.phase') === 'prep' && await B.evaluate('G.map.W.dyn.filter(o => o.barrier).length') > 0, 'cliente com barreiras ativas (colisão local para a predição)');
  const rost = await B.evaluate('G.rinfo.size'); ok(rost === 10, 'roster de 10 jogadores no cliente: ' + rost);
  // compra pela rede durante a fase de compra
  await B.waitForTimeout(1200); await B.keyboard.press('KeyB'); await B.waitForTimeout(500); await B.click('#shop .sc-card[data-i="colete"]'); await B.click('#shBuy'); await B.waitForTimeout(1500); await A.evaluate('__ff(10)');
  const idB0 = await B.evaluate('G.myId');
  const buy = await A.evaluate(`(()=>{ const p=G.sim.get(${JSON.stringify(idB0)}); return { vest: p.vest, money: p.money }; })()`);
  ok(buy.vest === 1 && buy.money === 150, 'cliente comprou colete pela loja (host validou: $' + buy.money + ')');
  await B.waitForTimeout(800); ok(await B.evaluate('G.me.money') === 150, 'dinheiro do cliente sincronizado');
  await B.keyboard.press('KeyB');
  // espera sair do prep — acelera o host
  await A.evaluate('__live()'); await B.waitForTimeout(1500);
  const phB = await B.evaluate('G.phase'); ok(phB === 'live', 'cliente recebeu fase live (' + phB + ')');
  ok(await B.evaluate('G.map.W.dyn.filter(o => o.barrier).length') === 0, 'cliente: barreiras liberadas junto com o host');
  ok(await B.evaluate('G.ents.size') >= 9, 'cliente interpola ' + await B.evaluate('G.ents.size') + ' entidades');
  // movimento: B segura W por ~3s (sim do cliente roda em tempo real)
  const p0 = await B.evaluate('({x:G.me.m.x,z:G.me.m.z})');
  await B.keyboard.down('KeyW'); await B.waitForTimeout(3500); await B.keyboard.up('KeyW');
  await B.waitForTimeout(800);
  const pB = await B.evaluate('({x:G.me.m.x,z:G.me.m.z})'), idB = await B.evaluate('G.myId');
  const pH = await A.evaluate(`(()=>{ const p=G.sim.get(${JSON.stringify(idB)}); return {x:p.m.x,z:p.m.z,mag:p.mag[p.w]}; })()`);
  const moved = Math.hypot(pB.x - p0.x, pB.z - p0.z), err = Math.hypot(pB.x - pH.x, pB.z - pH.z);
  ok(moved > 3, 'cliente andou ' + moved.toFixed(1) + ' m (predição local)');
  ok(err < 4, 'posição prevista ≈ autoritativa do host (erro ' + err.toFixed(2) + ' m)');
  // tiro
  const mag0 = pH.mag; await B.mouse.down(); await B.waitForTimeout(1200); await B.mouse.up(); await B.waitForTimeout(500);
  const mag1 = await A.evaluate(`(()=>{ const p=G.sim.get(${JSON.stringify(idB)}); return p.mag[p.w]; })()`);
  ok(mag1 < mag0, 'tiros do cliente registrados no host: carregador ' + mag0 + ' → ' + mag1);
  await B.screenshot({ path: SC + 'mp_B.png' }); await A.screenshot({ path: SC + 'mp_A.png' });
  // queda e reconexão automática
  await B.evaluate('G.nc.conn.close()'); await A.waitForTimeout(900);
  const botNow = await A.evaluate(`(()=>{ const p=G.sim.get(${JSON.stringify(idB)}); return { bot: p.bot, conn: p.connected }; })()`);
  ok(botNow.bot === true, 'host: bot assumiu o jogador desconectado');
  await B.waitForFunction('!G.reconnecting && G.nc && !G.nc.closed && G.scene === "play"', null, { timeout: 30000 }).catch(() => { });
  await A.waitForTimeout(800);
  const back = await A.evaluate(`(()=>{ const p=G.sim.get(${JSON.stringify(idB)}); return { bot: p.bot, conn: p.connected }; })()`);
  ok(await B.evaluate('G.scene') === 'play' && await B.evaluate('G.kind') === 'client', 'cliente reconectou e voltou à partida');
  ok(back.bot === false, 'host: jogador reassumiu o personagem (bot=false)');
  // fim de partida → todos voltam ao lobby
  await A.evaluate('G.net.backToLobby(); stopMatch && 0;').catch(() => { });
  console.log(logs.join('\n')); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(2); });
