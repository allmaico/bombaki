// Vila Girassol: vistas do mapa (spawns, ruas, praça, bombsites, vista alta) — uso: node test/vila_shots.js <pasta>
const { chromium } = require('playwright'); const path = require('path'); const S = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const logs = [];
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) logs.push('err: ' + m.text().slice(0, 200)); });
  await p.addInitScript(`localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'medio', renderScale:.8}))`);
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=tatico&map=vila');
  await p.waitForFunction('window.G && G.scene === "play" && G.phase === "prep"', null, { timeout: 240000 });
  logs.push('mapa: ' + await p.evaluate('G.map.name + " · " + Math.round(G.map.buildMs) + " ms"'));
  await p.evaluate(() => { Input.force = true; G.sim.endRound = () => { }; for (const q of G.sim.players) { q.hp = 1e6; if (q !== G.me) { q.ai = null; } } if (G.sim.barrier) G.sim.barrier = null; });
  const hideHud = process.env.HUD !== '1';
  if (hideHud) await p.addStyleTag({ content: '#hud{visibility:hidden!important}' });
  const views = (process.env.VIEWS ? JSON.parse(process.env.VIEWS) : [['spawn_ataque', 0, 66, 0, -.04, 0], ['rua_baixo', -40, 48, 1.57, -.04, 0], ['estrada_A', -57, 40, 0, -.04, 0], ['viela', 0, 42, 0, -.04, 0], ['praca', 0, 12, 0, -.06, 0], ['site_A', -47, -7, .61, -.06, 0], ['site_B', 47, -7, -.61, -.06, 0], ['corredor', 0, -50, 3.14, -.04, 0], ['alto', 0, 80, 0, -.5, 45]]);
  for (const [n, x, z, yaw, pitch, up] of views) {
    await p.evaluate(([x, z, yaw, pitch, up]) => { const m = G.me.m; m.x = x; m.z = z; m.y = G.map.W.heightAt(x, z) + .05 + up; m.vy = 0; G.view.yaw = yaw; G.view.pitch = pitch; G.me.m.gnd = true; }, [x, z, yaw, pitch, up]);
    await p.waitForTimeout(900); if (up) await p.evaluate(([x, z, up]) => { const m = G.me.m; m.x = x; m.z = z; m.y = G.map.W.heightAt(x, z) + up; m.vy = 0; }, [x, z, up]);
    await p.screenshot({ path: `${S}/vila_${n}.png`, timeout: 120000 });
  }
  console.log(logs.join('\n')); await b.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
