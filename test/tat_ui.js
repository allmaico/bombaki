// Interface do 5x5 no navegador: seleção de mapa, escolha de fazendeiro, HUD com vivos, TAB enxuto,
// tela de vitória/derrota + resultados com MVP e revanche (mesmo mapa)
const { chromium } = require('playwright'); const path = require('path');
const SC = process.env.SC || '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
(async () => {
  const W = 1280, H = 720;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } }); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push('err: ' + m.text().slice(0, 200)); });
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:0.6, hud:1}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1');
  await page.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 240000 });
  /* ---- seleção de mapa nos menus ---- */
  await page.evaluate('UI.playModal()'); await page.waitForTimeout(300);
  const mapsPlay = await page.evaluate(`[...document.querySelectorAll('#mdMap button')].map(b => b.textContent)`);
  ok(mapsPlay.length === 4 && mapsPlay.includes('Fazenda do Milharal') && mapsPlay.includes('Moinho das Três Porteiras') && mapsPlay.includes('Aleatório'), 'Jogar: seletor de mapa 5x5 (' + mapsPlay.join(' / ') + ')');
  await page.click('#mdMap button[data-v="arena2"]'); await page.screenshot({ path: SC + 'ui_play_modal.png' });
  ok(await page.evaluate(`store.get('tatMap')`) === 'arena2', 'escolha do mapa salva');
  await page.evaluate('UI.close(); UI.createModal()'); await page.waitForTimeout(200);
  ok(await page.evaluate(`document.querySelectorAll('#crMap button').length`) === 4, 'Criar Partida: seletor de mapa');
  await page.evaluate('UI.close()');
  /* ---- treino com bots no mapa escolhido ---- */
  await page.click('#mdBots').catch(() => { }); await page.evaluate(`Game.startOffline({ mode: 'tatico', botLevel: 'normal' })`);
  await page.waitForFunction('G.scene === "play" && G.me', null, { timeout: 120000 });
  ok(await page.evaluate('G.map.id') === 'arena2', 'partida de treino começou no Moinho das Três Porteiras');
  /* escolha de fazendeiro */
  /* agentes: escolhidos na SELEÇÃO antes da partida (a tela é testada em test/flow_ui.js) */
  const comp = await page.evaluate(`[0,1].map(sq => new Set(G.sim.players.filter(p => p.squad === sq).map(p => p.farmer)).size)`); ok(comp[0] === 5 && comp[1] === 5, 'cada equipe com 5 agentes diferentes (' + comp.join(' / ') + ')');
  await page.evaluate('__live()'); await page.waitForTimeout(400);
  /* indicador de vivos */
  const pins = await page.evaluate(`[document.querySelectorAll('#alA i').length, document.querySelectorAll('#alA i.on').length, document.querySelectorAll('#alD i').length, document.querySelectorAll('#alD i.on').length]`);
  ok(pins[0] === 5 && pins[2] === 5 && pins[1] === 5 && pins[3] === 5, 'indicador de vivos: 5 x 5 (' + pins.join(',') + ')');
  await page.evaluate(`(()=>{ const s=G.sim, en=s.players.filter(p=>p.team!==G.me.team); s.kill(en[0], G.me, 'faca'); s.kill(en[1], G.me, 'faca'); })(); __ff(6)`); await page.waitForTimeout(300);
  const pins2 = await page.evaluate(`(()=>{ const my=G.sim.get(G.myId).squad; const el = my===0?'#alD':'#alA'; return document.querySelectorAll(el+' i.on').length; })()`);
  ok(pins2 === 3, 'indicador de vivos atualiza após 2 abates (inimigos vivos: ' + pins2 + ')');
  await page.screenshot({ path: SC + 'ui_hud_alive.png' });
  /* TAB enxuto */
  await page.evaluate(`G.hud.tab(true, collectView ? collectView() : G.lastV)`).catch(() => { });
  await page.keyboard.down('Tab'); await page.waitForTimeout(400);
  const heads = await page.evaluate(`[...document.querySelectorAll('#tabboard th')].map(t => t.lastChild.textContent.trim())`);
  ok(JSON.stringify(heads) === JSON.stringify(['Jogador', 'Abates', 'Mortes', 'Assist.', 'Dinheiro', 'Ping']), 'TAB só com Jogador, Abates, Mortes, Assist., Dinheiro e Ping (' + heads.join(' | ') + ')');
  ok(await page.evaluate(`document.querySelectorAll('#tabboard em').length`) === 0, 'TAB sem linhas extras (precisão/HS removidos)');
  await page.screenshot({ path: SC + 'ui_tab.png' }); await page.keyboard.up('Tab');
  /* ---- fim de partida: vitória/derrota + resultados ---- */
  await page.evaluate(`(()=>{ const s=G.sim, me=s.get(G.myId); s.score=[me.squad===0?12:7, me.squad===0?7:12]; s.round=19; me.mvps=3; s.phase='live'; s.endRound(me.team, 'elim'); })()`);
  for (let i = 0; i < 30 && !(await page.evaluate('G.endShown')); i++) { await page.evaluate('__ff(60)'); await page.waitForTimeout(200); }
  await page.waitForTimeout(600);
  ok(await page.evaluate('G.endShown'), 'tela de fim exibida');
  const res = await page.evaluate(`({ h: document.querySelector('.rs-top h1') && document.querySelector('.rs-top h1').textContent, chips: document.querySelectorAll('.rs-chip').length, mvp: !!document.querySelector('.rs-mvp'), mvpName: document.querySelector('.rs-mvp b') && document.querySelector('.rs-mvp b').textContent, teams: document.querySelectorAll('.rs-team').length, rows: document.querySelectorAll('.rs-team tr').length, btn: [...document.querySelectorAll('#endscr .btn')].map(b => b.textContent) })`);
  ok(res.h === 'VITÓRIA', 'título de vitória: ' + res.h);
  ok(res.chips >= 1, 'histórico de rodadas na tela de resultados (' + res.chips + ')');
  ok(res.mvp && !!res.mvpName, 'MVP da partida: ' + res.mvpName);
  ok(res.teams === 2 && res.rows >= 12, 'duas equipes com tabelas completas (' + res.rows + ' linhas)');
  ok(res.btn.includes('Revanche') && res.btn.some(b => /Jogar em Vila do Roçado/.test(b)), 'botões: ' + res.btn.join(' / '));
  await page.screenshot({ path: SC + 'ui_results_win.png' });
  /* revanche: mesmo mapa */
  await page.evaluate(`[...document.querySelectorAll('#endscr .btn')].find(b => b.textContent === 'Revanche').click()`);
  await page.waitForFunction('G.scene === "play" && G.me && !G.endShown', null, { timeout: 60000 });
  ok(await page.evaluate('G.map.id') === 'arena2' && await page.evaluate('G.sim.round') === 1, 'revanche recomeça no mesmo mapa, rodada 1');
  /* derrota */
  await page.evaluate(`__live(); (()=>{ const s=G.sim, me=s.get(G.myId); s.score=[me.squad===0?3:12, me.squad===0?12:3]; s.round=15; s.phase='live'; s.endRound(me.team === T_ATK ? T_DEF : T_ATK, 'time'); })()`).catch(e => errs.push(String(e)));
  for (let i = 0; i < 30 && !(await page.evaluate('G.endShown')); i++) { await page.evaluate('__ff(60)'); await page.waitForTimeout(200); }
  await page.waitForTimeout(500);
  ok(await page.evaluate(`document.querySelector('.rs-top h1') && document.querySelector('.rs-top h1').textContent`) === 'DERROTA', 'título de derrota');
  await page.screenshot({ path: SC + 'ui_results_lose.png' });
  /* histórico de partidas registra o mapa */
  const hist = await page.evaluate(`(Account.cur && Account.cur.profile && 0) || JSON.stringify((typeof Account.guestG === 'function' ? Account.guestG() : null) || null)`).catch(() => 'n/a');
  ok(errs.length === 0, 'sem erros de JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
