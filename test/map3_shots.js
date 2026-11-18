// Fazenda do Milharal: vistas do mapa (spawn do ataque, mid, árvore, bombsites, milharal) + minimapa
const { chromium } = require('playwright'); const path = require('path'); const S = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const logs = [];
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await p.addInitScript(`localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'medio', renderScale:.7}))`);
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=tatico&map=arena3');
  await p.waitForFunction('window.G && G.scene === "play" && G.phase === "prep"', null, { timeout: 240000 });
  logs.push('mapa: ' + await p.evaluate('G.map.name'));
  await p.evaluate(() => { Input.force = true; G.sim.endRound = () => { }; for (const q of G.sim.players) { q.hp = 1e6; if (q !== G.me) { q.ai = null; } } document.getElementById('hud').style.opacity = 0; });
  const views = [['spawn_ataque', 0, 66, 0, -.05, 3], ['mid', 0, 34, 0, -.05, 0], ['controle_mid', 0, 12, 0, -.03, 0], ['site_A', -38, 0, 2.2, -.12, 0], ['site_B', 38, 0, -2.2, -.12, 0], ['alto', 0, 76, 0, -.55, 40]];
  for (const [n, x, z, yaw, pitch, up] of views) {
    await p.evaluate(([x, z, yaw, pitch, up]) => { const m = G.me.m; m.x = x; m.z = z; m.y = G.map.W.heightAt(x, z) + .05 + up; m.vy = 0; G.view.yaw = yaw; G.view.pitch = pitch; G.me.m.gnd = true; if (up) { G.me.m.y += 0; } }, [x, z, yaw, pitch, up]);
    await p.waitForTimeout(900); if (up) await p.evaluate(([x, z, up]) => { const m = G.me.m; m.x = x; m.z = z; m.y = G.map.W.heightAt(x, z) + up; m.vy = 0; }, [x, z, up]);
    await p.screenshot({ path: `${S}/m3_${n}.png` });
  }
  console.log(logs.join('\n')); await b.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
