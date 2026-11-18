// celular (Pixel 7 deitado, toque): tela cheia ao tocar, barra do jogo (⛶ ⏸ ✖), sair da partida, habilidades tocáveis, layout sem sobreposição
const { chromium, devices } = require('playwright'); const waitFs = async (p, on) => { try { await p.waitForFunction(on ? 'Full.isOn()' : '!Full.isOn()', null, { timeout: 8000, polling: 200 }); } catch (e) { } }; const path = require('path'); const S = process.argv[2] || process.env.SC || '/tmp';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? '  ✓ ' : '  ✗ FALHOU: ') + m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const dev = devices['Pixel 7 landscape'] || { viewport: { width: 863, height: 360 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile' };
  const ctx = await b.newContext(Object.assign({}, dev)); const p = await ctx.newPage(); const logs = [];
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=' + (process.env.MODE || 'tatico'));
  await p.waitForFunction('window.G && G.scene === "play" && (G.phase === "prep" || G.phase === "live")', null, { timeout: 240000 });
  await p.waitForTimeout(1500);
  ok(await p.evaluate('document.body.classList.contains("touch")'), 'modo toque ativo');
  ok(await p.evaluate('settings.quality') === 'celular' && await p.evaluate('settings.autoRes') === true, 'gráfico "Celular (nítido)" com resolução automática');
  const r = await p.evaluate(() => ({ cw: G.R.canvas.width, css: G.R.canvas.clientWidth }));
  ok(r.cw / r.css >= 1.5, `resolução real do canvas: ${r.cw}px para ${r.css}px de tela (${(r.cw / r.css).toFixed(2)}x)`);
  ok(await p.evaluate('!!document.querySelector("#gbar [data-g=full]") && !!document.querySelector("#gbar [data-g=exit]") && !!document.querySelector("#gbar [data-g=menu]")'), 'barra do jogo com ⛶ tela cheia, ⏸ menu e ✖ sair');
  /* sobreposição: botões de toque x minimapa / objetivo */
  const ov = await p.evaluate(() => { const R = e => e.getBoundingClientRect(), inter = (a, b2) => !(a.right < b2.left || a.left > b2.right || a.bottom < b2.top || a.top > b2.bottom); const bad = []; const panels = ['mini', 'obj', 'vitals', 'score', 'ammo', 'hotbar', 'abhud', 'gbar'].map(id => [id, $(id)]).filter(x => x[1] && x[1].offsetParent); for (const t of document.querySelectorAll('#touch .tb:not(.hidden)')) for (const [id, el] of panels) if (el.offsetWidth && inter(R(t), R(el))) bad.push(t.dataset.b + '×' + id); const ab = $('abhud'), hb = $('hotbar'); if (ab && hb && ab.offsetWidth && inter(R(ab), R(hb))) bad.push('habilidades×armas'); const mo = $('money'); if (ab && mo && mo.offsetWidth && ab.offsetWidth && inter(R(ab), R(mo))) bad.push('habilidades×dinheiro'); const am = $('ammo'), vi = $('vitals'); if (am && vi && inter(R(am), R(vi))) bad.push('munição×vida'); return bad; });
  ok(ov.length === 0, 'nada sobreposto: botões × minimapa, objetivo, vida, placar, munição, armas, habilidades e barra ⛶⏸✖' + (ov.length ? ' (' + ov.join(', ') + ')' : ''));
  await p.screenshot({ path: S + '/mob_1.png', timeout: 180000 });
  /* tela cheia no 1º toque */
  await p.touchscreen.tap(560, 200); await waitFs(p, true);
  ok(await p.evaluate('Full.isOn()'), 'tocar na tela de jogo entra em tela cheia (esconde o navegador)');
  await p.tap('#gbar [data-g=full]'); await waitFs(p, false); ok(!(await p.evaluate('Full.isOn()')), 'botão ⛶ sai da tela cheia');
  await p.tap('#gbar [data-g=full]'); await waitFs(p, true); ok(await p.evaluate('Full.isOn()'), 'botão ⛶ volta para tela cheia');
  /* habilidade tocável (5x5) */
  if ((process.env.MODE || 'tatico') === 'tatico') { await p.evaluate(() => { for (let i = 0; i < 30; i++) fixedStep(); AbilityHud.key = ''; AbilityHud.render(); }); const n = await p.evaluate('document.querySelectorAll("#abhud .ab-slot").length');
    let used = false; if (n) { await p.evaluate(() => { const o = G.sim.emit; window.__ab = 0; G.sim.emit = function (e) { if (e.t === 'abu' || e.t === 'deny') window.__ab++; return o.call(this, e); }; }); await p.tap('#abhud .ab-slot[data-i="0"]'); await p.evaluate(() => { for (let i = 0; i < 5; i++) fixedStep(); }); used = await p.evaluate('window.__ab > 0'); }
    ok(n === 4 && used, 'ícones Z/X/C/F tocáveis: tocar no ícone usa a habilidade'); }
  await p.screenshot({ path: S + '/mob_2.png', timeout: 180000 });
  /* sair da partida */
  await p.tap('#gbar [data-g=exit]'); await p.waitForTimeout(400); await p.screenshot({ path: S + '/mob_3.png', timeout: 180000 }); await p.tap('#exYes'); await p.waitForTimeout(1500);
  ok(await p.evaluate('G.scene') === 'menu', 'botão ✖ → "Sair da partida" volta ao menu');
  ok(await p.evaluate('!!document.getElementById("menuFull")'), 'menu inicial com botão ⛶ Tela cheia');
  console.log(logs.join('\n')); ok(!logs.some(l => /PAGEERROR/.test(l)), 'sem erros de JavaScript');
  console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
