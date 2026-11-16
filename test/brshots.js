// Battle Royale: vistas aéreas, regiões no chão e paraquedas (câmera livre via window.__cam)
const { chromium } = require('playwright'); const path = require('path');
const SC = process.env.SC || '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
const TAG = process.env.TAG || 'a';
(async () => {
  const W = +(process.env.W || 960), H = +(process.env.H || 540);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } }); const logs = [];
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) logs.push('err: ' + m.text().slice(0, 200)); });
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'${process.env.QUAL || 'medio'}', renderScale:${process.env.RS || 0.75}, hud:1}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=caos'); await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 280000 });
  await page.evaluate(`window.__dtMax=0.05; G.hudOff=true; document.getElementById('hud').style.visibility='hidden'; G.sim.weather=0;`);
  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  const views = [
    ['aer_centro', 0, 170, 150, 0, -.75], ['aer_ne', 160, 110, 160, .8, -.45], ['aer_sw', -150, 120, 120, -.6, -.5], ['aer_topo', 0, 330, 1, 0, -1.45],
    ['ch_sede', 60, 6, 30, .3, -.05], ['ch_vila', 150, 5, 190, .6, -.05], ['ch_milho', 60, 5, 120, 2.5, -.05], ['ch_mata', -170, 5, 60, 1, -.02], ['ch_rio', -40, 6, -60, -1, -.1], ['ch_graos', -80, 5, -120, 2.8, -.05], ['ch_moinho', 30, 7, -110, -0.818, -0.08], ['ch_hortas', -80, 6, 90, 2.204, -0.18], ['ch_trigal', -13, 4, 145, 3.142, -0.1], ['ch_ilha', 10, 4, 58, 0.761, -0.1], ['ch_venda', 190, 3, 150, -2.678, 0.05], ['ch_carro', 62, 2.5, -122, 2.356, -0.2], ['top_capela', 140, 30, 186, 0, -1.3], ['top_casa', 166, 30, 165, 0, -1.3]
  ];
  for (const [n, x, y, z, yaw, pitch] of views) {
    if (only.length && !only.includes(n)) continue;
    const gy = await page.evaluate(`G.map.W.heightAt(${x},${z})`);
    await page.evaluate(`window.__cam={x:${x},y:${n.startsWith('ch_') ? gy + y : y},z:${z},yaw:${yaw},pitch:${pitch}}; __ff(20)`);
    await page.waitForTimeout(900); await page.screenshot({ path: SC + 'br' + TAG + '_' + n + '.png' });
  }
  if (!only.length || only.includes('chute')) {
    await page.evaluate(`window.__cam=null; (()=>{ const p=G.sim.get(G.me.id); p.onCow=false; p.chute={t:3,open:true}; p.m.x=40; p.m.z=60; p.m.y=G.map.W.heightAt(40,60)+70; p.m.vy=-5; G.view.pitch=-.25; G.view.yaw=0; })(); __ff(40)`);
    await page.waitForTimeout(800); await page.screenshot({ path: SC + 'br' + TAG + '_chute1.png' });
    await page.evaluate(`G.view.yaw=1.6; G.view.pitch=-.05; Input.keys.add('KeyA'); __ff(40)`); await page.waitForTimeout(800); await page.screenshot({ path: SC + 'br' + TAG + '_chute2.png' });
    await page.evaluate(`Input.keys.delete('KeyA'); G.view.yaw=3.1; G.view.pitch=-.6; __ff(20)`); await page.waitForTimeout(800); await page.screenshot({ path: SC + 'br' + TAG + '_chute3.png' });
  }
  console.log(logs.join('\n') || 'ok'); await browser.close();
})();
