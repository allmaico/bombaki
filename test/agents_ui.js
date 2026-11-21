// agentes no navegador: HUD com 4 habilidades, ícones 3D, supremas no mundo (Rodeio, Porteira, Queimada, Mandacaru), Espigas, reviver
const { chromium } = require('playwright'); const path = require('path'); const S = process.argv[2] || process.env.SC || '/tmp';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? '  ✓ ' : '  ✗ FALHOU: ') + m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const logs = [];
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.addInitScript(`localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'medio', renderScale:.7})); localStorage.setItem('bombaki2.profile', JSON.stringify({name:'AllMaico', farmer:'peao', skin:1}))`);
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=tatico');
  await p.waitForFunction('window.G && G.scene === "play" && G.phase === "prep"', null, { timeout: 240000 });
  await p.evaluate(() => { Input.force = true; __live(); G.sim.pt = 99; G.sim.endRound = () => { }; for (const q of G.sim.players) { q.hp = 1e6; if (q !== G.me) { q.ai = null; q.bot = true; } } });
  /* ícones dos 20 */
  const ic = await p.evaluate(() => FARMER_IDS.flatMap(f => FARMERS[f].ab.map(a => { const h = Icons.img('ab_' + a.id, 'sm', 'x'); return /data:image\/png/.test(h) ? 1 : 0; })).reduce((a, c) => a + c, 0));
  ok(ic === 20, 'ícones 3D das 20 habilidades (' + ic + ')');
  const hudN = await p.evaluate(() => { AbilityHud.key = ''; AbilityHud.render(); return document.querySelectorAll('#abhud .ab-slot').length; });
  ok(hudN === 4, 'HUD com 4 espaços (Z · X · C · F): ' + hudN);
  /* Festa do Roçado na frente */
  await p.evaluate(() => { const me = G.me, S = G.map.sites.A; G.sim.placeAt(me, { x: S.x, z: S.z + 9, yaw: 0 }); G.view.yaw = 0; G.view.pitch = -.12; me.farmer = 'peao'; G.sim.refillAbilities(me); me.ult = 7; AbilityHud.key = ''; for (let i = 0; i < 5; i++) fixedStep(); });
  await p.waitForTimeout(600); await p.screenshot({ path: S + '/ag_1_hud.png' });
  ok(await p.evaluate('document.querySelector("#abhud .ab-slot.ult.rdy") !== null'), 'suprema pronta brilha no HUD');
  await p.evaluate(() => { Input.acts.push('ab:3'); for (let i = 0; i < 70; i++) fixedStep(); window.__ro = G.me.rodeoT; window.__ul = G.me.ult; });
  await p.waitForTimeout(500); await p.screenshot({ path: S + '/ag_2_rodeio.png' });
  ok(await p.evaluate('window.__ro > 5 && window.__ul === 0'), 'Rodeio Final ativado pelo jogador (tecla F)');
  /* Zé Patrão: Território */
  await p.evaluate(() => { for (let i = 0; i < 200; i++) fixedStep(); const me = G.me; me.farmer = 'guardiao'; G.sim.refillAbilities(me); me.ult = 7; G.view.pitch = -.05; Input.acts.push('ab:3'); for (let i = 0; i < 40; i++) fixedStep(); G.view.yaw = Math.PI * .85; for (let i = 0; i < 10; i++) fixedStep(); });
  await p.waitForTimeout(500); await p.screenshot({ path: S + '/ag_3_territorio.png' });
  ok(await p.evaluate('G.sim.abx.some(e => e.k === "territorio")'), 'Porteira Trancada cravada');
  /* Seu Brasa: Queimada */
  await p.evaluate(() => { const me = G.me; me.farmer = 'mateiro'; G.sim.refillAbilities(me); me.ult = 7; G.view.yaw = 0; G.view.pitch = -.1; Input.acts.push('ab:3'); for (let i = 0; i < 150; i++) fixedStep(); window.__wall = G.sim.abx.filter(e => e.k === 'fumaca' && e.wall).length; });
  await p.waitForTimeout(800); await p.screenshot({ path: S + '/ag_4_queimada.png' });
  ok(await p.evaluate('window.__wall >= 2'), 'Queimada: muro de fumaça (' + await p.evaluate('window.__wall') + ' nuvens)');
  /* Lua: Muda de Mandacaru */
  await p.evaluate(() => { for (let i = 0; i < 900; i++) fixedStep(); const me = G.me, S = G.map.sites.B || G.map.sites.A; G.sim.placeAt(me, { x: S.x, z: S.z + 6, yaw: 0 }); me.farmer = 'socorrista'; G.sim.refillAbilities(me); G.view.yaw = 0; G.view.pitch = -.15; Input.acts.push('ab:1'); for (let i = 0; i < 40; i++) fixedStep(); });
  await p.waitForTimeout(800); await p.screenshot({ path: S + '/ag_6_mandacaru.png' });
  ok(await p.evaluate('G.sim.abx.some(e => e.k === "mandacaru")'), 'Muda de Mandacaru plantada');
  /* Espiga Dourada visível */
  await p.evaluate(() => { const o = G.sim.orbs.find(q => !q.taken); if (!o) return; const me = G.me; G.sim.placeAt(me, { x: o.x, z: o.z + 5, yaw: 0 }); G.view.yaw = 0; G.view.pitch = -.1; for (let i = 0; i < 5; i++) fixedStep(); });
  await p.waitForTimeout(500); await p.screenshot({ path: S + '/ag_5_espiga.png' });
  console.log(logs.join('\n')); ok(!logs.some(l => /PAGEERROR/.test(l)), 'sem erros de JavaScript');
  console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
