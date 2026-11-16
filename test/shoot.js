// tiro, rastro de bala, impacto, abate, recarga — screenshots em sequência
const { chromium } = require('playwright'); const path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
(async () => {
  const W = +process.argv[2] || 1280, H = +process.argv[3] || 720;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const logs = []; page.on('console', m => { if (m.type() === 'error' && !/TUNNEL|Failed to load resource/.test(m.text())) logs.push('err: ' + m.text().slice(0, 300)); }); page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'${process.env.QUAL || 'baixo'}', renderScale:${process.env.RS || 0.55}}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=tatico');
  await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 180000 });
  await page.evaluate('__ff(60*21)');
  const st = () => page.evaluate(`JSON.stringify({mag:G.me.mag&&G.me.mag[G.me.w],w:G.me.w,rel:+(G.me.relT||0).toFixed(2),k:G.me.k,hp:G.me.hp})`);
  // inimigo parado 14 m à frente (bots congelados)
  await page.evaluate(`(()=>{ const s=G.sim,o=s.stepOne; s.stepOne=function(p,dt,f){ if(p!==G.me) return; return o.call(this,p,dt,f); }; const m=G.me; const S=G.map.spawns.def[0]; m.m.x=60; m.m.z=0; m.m.y=G.map.W.heightAt(60,0)+.05; m.m.yaw=0; G.view.yaw=0; G.view.pitch=0; G.prev.x=m.m.x; G.prev.y=m.m.y; G.prev.z=m.m.z;
    const foe=s.players.find(p=>p!==m&&p.team!==m.team); foe.m.x=60; foe.m.z=-11; foe.m.y=G.map.W.heightAt(60,-11)+.05; foe.m.vx=foe.m.vz=0; window.__foe=foe; })()`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: SC + 'sh_0.png', timeout: 150000 });
  await page.evaluate('window.__dtMax = 0.05');
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) { await page.screenshot({ path: SC + 'sh_' + i + '.png', timeout: 150000 }); }
  logs.push('fogo: ' + await st());
  await page.mouse.up();
  await page.keyboard.press('KeyR');
  for (let i = 6; i <= 11; i++) { await page.screenshot({ path: SC + 'sh_' + i + '.png', timeout: 150000 }); }
  logs.push('recarga: ' + await st() + ' foe hp ' + await page.evaluate('__foe.hp+" alive "+__foe.alive'));
  console.log(logs.join('\n')); await browser.close();
})();
