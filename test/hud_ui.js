// HUD v7.1 (5x5): minimapa, placar aliado×inimigo, relógio, contagem da compra, vida/colete, retrato,
// inventário (troca + munição), habilidades (estados), TAB, loja (dinheiro só na loja), sem sobreposição
// em 1920x1080, 1600x900, 1366x768 e 1280x720, sem erros no console. Uso: SC=<pasta> node test/hud_ui.js
const { chromium } = require('playwright'); const path = require('path');
const SC = process.env.SC || '/tmp'; let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const RES = [[1920, 1080], [1600, 900], [1366, 768], [1280, 720]];
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push('err: ' + m.text().slice(0, 200)); });
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:0.5, hud:1}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1');
  await page.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 240000 });
  await page.evaluate(`Game.startOffline({ mode: 'tatico', botLevel: 'normal' })`);
  await page.waitForFunction('G.scene === "play" && G.me && G.phase === "prep"', null, { timeout: 120000 }); await page.waitForTimeout(600);
  const vis = id => page.evaluate(i => { const e = document.getElementById(i); return !!e && !!e.offsetWidth && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; }, id);
  /* removidos da HUD permanente */
  for (const id of ['plist', 'obj', 'hints', 'money']) ok(!(await vis(id)), `#${id} fora da HUD permanente`);
  const hudText = await page.evaluate(() => [...document.querySelectorAll('#hud > *:not(#shop):not(#tabboard)')].filter(e => e.offsetWidth).map(e => e.textContent).join(' '));
  ok(!/\$\s?\d/.test(hudText), 'dinheiro não aparece na HUD fora da loja');
  /* A. minimapa */
  ok(await vis('mini'), 'minimapa visível'); const mmPix = await page.evaluate(() => { const c = document.getElementById('mmc'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) n++; return n; }); ok(mmPix > 100, 'minimapa desenhado');
  /* B. placar ligado aos dados reais */
  const sc = await page.evaluate(() => { const my = sqOfTeam(G.me.team, G.swap | 0) === 1 ? 1 : 0, s = [G.score[0] | 0, G.score[1] | 0]; return { a: document.getElementById('scAn').textContent, d: document.getElementById('scDn').textContent, exp: [s[my], s[1 - my]], al: document.getElementById('scAl').textContent, rd: document.getElementById('rdTxt').textContent, round: G.round }; }).catch(e => ({ err: e.message }));
  ok(!sc.err && sc.a === String(sc.exp[0]) && sc.d === String(sc.exp[1]), 'placar aliado × inimigo igual ao da partida (' + JSON.stringify(sc) + ')');
  ok(sc.al && sc.al.startsWith('ALIADOS') && sc.rd.includes(String(sc.round)), 'rótulos do placar e rodada atual');
  /* C. contagem da fase de compra */
  ok(await vis('prep'), 'indicador de compra visível na preparação');
  const pc = await page.evaluate(() => [document.querySelector('#prep b').textContent, Math.ceil(G.pt)]); ok(Math.abs(+pc[0] - pc[1]) <= 1, 'contagem igual ao tempo real (' + pc.join(' vs ') + ')');
  await page.evaluate(() => { G.sim.pt = 4.2; }); await page.waitForTimeout(300); ok(await page.evaluate(() => document.getElementById('prep').classList.contains('hot')), 'últimos segundos em destaque');
  /* D. vida, colete e retrato */
  await page.evaluate('__live()'); await page.waitForFunction(() => !document.getElementById('prep').offsetWidth, null, { timeout: 20000 }).catch(() => { }); ok(!(await vis('prep')), 'durante a rodada só o relógio compacto');
  ok(await page.evaluate(() => /^\d\d:\d\d$/.test(document.getElementById('clock').textContent)), 'relógio compacto mm:ss');
  await page.evaluate(() => { G.sim.get(G.myId).hp = 23; }); await page.waitForFunction(() => document.querySelector('#hpb span').textContent === '23', null, { timeout: 15000 }).catch(() => { }); await page.waitForTimeout(300);
  const hp = await page.evaluate(() => ({ n: document.querySelector('#hpb span').textContent, w: document.querySelector('#hpb .fill').style.width, low: document.getElementById('hpb').classList.contains('low'), c: getComputedStyle(document.getElementById('hpb')).getPropertyValue('--hpc') }));
  ok(hp.n === '23' && hp.w === '23%' && hp.low, 'vida real: número, barra e alerta de vida baixa (' + JSON.stringify(hp) + ')');
  const ar = await page.evaluate(() => [document.querySelector('#arb span').textContent, String(Math.round(G.me.armor))]); ok(ar[0] === ar[1], 'colete real (' + ar.join('/') + ')');
  const face = await page.evaluate(() => { const c = document.getElementById('avc'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 13) if (d[i] > 0) n++; return n; }); ok(face > 200, 'retrato do personagem desenhado');
  ok((await page.evaluate(() => document.getElementById('avNm').textContent)).length > 1, 'nome do agente no retrato');
  /* inventário: troca de arma e munição */
  const sw = await page.evaluate(async () => { const me = G.sim.get(G.myId), r = []; for (const w of ['faca', 'estilingue']) { me.w = w; await new Promise(r2 => setTimeout(r2, 250)); const on = document.querySelector('#hotbar .slot.on'); r.push([w, on ? on.querySelector('.nm').textContent : '', document.getElementById('amMag').textContent, String(me.mag[w] | 0)]); } return r; });
  ok(sw[0][1] === 'Facão' && sw[1][1] && sw[1][2] === sw[1][3], 'slot selecionado e munição seguem a arma na mão (' + JSON.stringify(sw) + ')');
  /* habilidades */
  const ab = await page.evaluate(() => { AbilityHud.key = ''; AbilityHud.render(); return [...document.querySelectorAll('#abhud .ab-slot')].map(e => e.className); });
  ok(ab.length === 4 && ab.some(c => c.includes('ult')), 'habilidades com 4 slots (inclui a suprema): ' + ab.length);
  const st = await page.evaluate(() => { const me = G.sim.get(G.myId); me.abC = me.abC.map(() => 0); me.abCd = 0; AbilityHud.key = ''; AbilityHud.render(); return [...document.querySelectorAll('#abhud .ab-slot:not(.ult)')].every(e => e.classList.contains('off')); });
  ok(st, 'sem cargas → habilidade desativada');
  /* TAB e loja */
  await page.keyboard.down('Tab'); await page.waitForFunction(() => { const e = document.getElementById('tabboard'); return e && e.offsetWidth && document.querySelectorAll('#tabboard .tb3-panel.ally tbody tr, #tabboard .tb3-panel.enemy tbody tr').length >= 12; }, null, { timeout: 15000 }).catch(() => { }); ok(await vis('tabboard') && (await page.evaluate(() => document.querySelectorAll('#tabboard .tb3-panel.ally tr').length + document.querySelectorAll('#tabboard .tb3-panel.enemy tr').length)) >= 12, 'TAB abre o placar temático'); await page.keyboard.up('Tab'); await page.waitForFunction(() => !document.getElementById('tabboard').offsetWidth, null, { timeout: 15000 }).catch(() => { }); ok(!(await vis('tabboard')), 'TAB fecha');
  await page.evaluate(() => { G.phase = 'prep'; G.sim.phase = 'prep'; G.sim.pt = 20; }).catch(() => { });
  await page.evaluate(() => Shop.toggle(true)); await page.waitForTimeout(300);
  const shop = await page.evaluate(() => ({ on: !!document.getElementById('shop') && !document.getElementById('shop').classList.contains('hidden'), m: (document.getElementById('shMoney') || {}).textContent || '' }));
  ok(shop.on && /\$\s?\d/.test(shop.m), 'B: loja abre e mostra o dinheiro (' + shop.m + ')'); await page.evaluate(() => Shop.toggle(false));
  /* resoluções: nada sobreposto, nada cortado, mira livre */
  for (const [W, H] of RES) {
    await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(500);
    const bad = await page.evaluate(() => { const R = e => e.getBoundingClientRect(), inter = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom); const ids = ['mini', 'score', 'vitals', 'loadout', 'ammo', 'kf', 'gbar', 'healsel']; const els = ids.map(i => [i, document.getElementById(i)]).filter(x => x[1] && x[1].offsetWidth); const out = []; for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (inter(R(els[i][1]), R(els[j][1]))) out.push(els[i][0] + '×' + els[j][0]); const cx = innerWidth / 2, cy = innerHeight / 2; for (const [i, e] of els) { const r = R(e); if (cx > r.left - 30 && cx < r.right + 30 && cy > r.top - 30 && cy < r.bottom + 30) out.push(i + ' perto da mira'); if (r.left < 0 || r.top < 0 || r.right > innerWidth + .5 || r.bottom > innerHeight + .5) out.push(i + ' cortado'); } return out; });
    ok(bad.length === 0, `${W}x${H}: sem sobreposição/corte` + (bad.length ? ' (' + bad.join(', ') + ')' : ''));
    await page.screenshot({ path: `${SC}/hud_${W}x${H}.png`, timeout: 120000 });
  }
  ok(errs.length === 0, 'sem erros no console' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close(); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  ✗ FALHOU: exceção', e.message); process.exit(1); });
