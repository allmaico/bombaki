// Drop de armas (v7.9.1): no 5x5 as armas de fogo caem ao morrer (menos estilingue/faca), qualquer um pega (aliado ou
// inimigo) e a arma mantém a skin de quem era; G larga a arma; arma pega do chão não se vende. Todos contra Todos também larga.
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
  await p.evaluate('__live()'); await p.waitForTimeout(800);
  const r = await p.evaluate(async () => {
    const s = G.sim, out = {}, bots = s.players.filter(q => q !== G.me); for (const q of s.players) q.ai = null;
    const A = bots[0], B = bots.find(q => q.team !== A.team) || bots[1], C = bots.find(q => q !== A && q !== B && q.team === A.team) || bots[2];
    A.cos = 'galho=ouro'; s.giveWeapon(A, 'galho', 0); A.mag.galho = 17; s.giveWeapon(A, 'tijolinho', 0); A.w = 'galho';
    s.placeAt(A, { x: 3.5, z: 40, yaw: 0 }); s.placeAt(B, { x: 6.5, z: 40, yaw: 0 }); s.placeAt(C, { x: 9.5, z: 40, yaw: 0 });
    s.kill(A, B, 'galho', 'body');
    const dropped = s.loot.filter(l => l.k === 'w'); out.drop = dropped.map(l => l.w + ':' + (l.sk || '-') + ':' + l.mag);
    /* inimigo B pega a Roçadeira de ouro */
    const g = dropped.find(l => l.w === 'galho'); B.m.x = g.x; B.m.z = g.z; B.m.y = g.y; B.useHeld = false; const c = blankCmd(); c.use = true; c.yaw = B.m.yaw; s.handleUse(B, c, .016);
    out.bGot = B.own.galho !== undefined; out.bSkin = s.wskEff(B, 'galho'); out.bMag = B.mag.galho; out.bW = B.w;
    const sp = s.snapPlayer(B); out.snapSkin = WSKIN_IDS[sp[15]];
    /* B larga com G (ação 'x'): cai com a skin ouro */
    s.dropWeapon(B); const l2 = s.loot.find(l => l.k === 'w' && l.w === 'galho'); out.reDrop = l2 ? l2.sk : 'nada';
    /* aliado C pega */
    C.m.x = l2.x; C.m.z = l2.z; C.m.y = l2.y; C.useHeld = false; l2.cd = null; s.handleUse(C, c, .016); out.cGot = C.own.galho !== undefined && s.wskEff(C, 'galho') === 'ouro';
    /* estilingue e faca não caem */
    C.w = 'estilingue'; out.slingDrop = !!s.dropWeapon(C); C.w = 'faca'; out.knifeDrop = !!s.dropWeapon(C);
    /* não vende arma pega do chão (fase de compra) */
    s.phase = 'prep'; const m0 = C.money; s.sell(C, 'galho'); out.sold = C.own.galho === undefined || C.money !== m0;
    return out;
  });
  ok(r.drop.some(x => x.startsWith('galho:ouro:17')) && r.drop.some(x => x.startsWith('tijolinho')), 'ao morrer, armas de fogo caem com skin e pente: ' + r.drop.join(', '));
  ok(!r.drop.some(x => /estilingue|faca/.test(x)), 'estilingue e faca não caem');
  ok(r.bGot && r.bSkin === 'ouro' && r.bMag === 17 && r.bW === 'galho', `inimigo pega a arma com a skin de quem era (${r.bSkin}, pente ${r.bMag})`);
  ok(r.snapSkin === 'ouro', 'a skin vai pela rede (outros jogadores veem a Roçadeira de Ouro): ' + r.snapSkin);
  ok(r.reDrop === 'ouro', 'G larga a arma e ela continua com a skin: ' + r.reDrop);
  ok(r.cGot, 'aliado também pode pegar (com a skin)');
  ok(!r.slingDrop && !r.knifeDrop, 'estilingue e faca não podem ser largados');
  ok(!r.sold, 'arma pega do chão não pode ser vendida');
  /* Todos contra Todos continua largando */
  ok(await p.evaluate(() => { const s = G.sim; s.mode = 'caos'; const q = s.players.find(x => x !== G.me && x.alive); s.giveWeapon(q, 'cabrita', 1); q.w = 'cabrita'; const l = s.dropWeapon(q); s.mode = 'tatico'; return !!l && l.w === 'cabrita' && l.tier === 1; }), 'Todos contra Todos: larga a arma (mantém o nível)');
  ok(errs.length === 0, 'sem erros no console' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  ✗ FALHOU: exceção', e.message); process.exit(1); });
