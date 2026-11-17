// uso: node test/play.js <cenario> [w h]   — cenários: menu | play | caos
const { chromium } = require('playwright'); const path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
(async () => {
  const sc = process.argv[2] || 'menu', W = +process.argv[3] || 1600, H = +process.argv[4] || 900;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const logs = []; page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning' || /ERRO|erro/.test(m.text())) logs.push(t + ': ' + m.text().slice(0, 300)); }); page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  const Q = process.env.QUAL || 'baixo'; await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'${Q}', renderScale:${process.env.RS||0.7}}))}catch(e){}`);
  const q = sc === 'menu' ? '' : sc === 'play' ? '?test=1&auto=tatico' : '?test=1&auto=caos';
  const t0 = Date.now();
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + q);
  try { await page.waitForFunction('window.G && G.scene && G.scene !== "boot"', null, { timeout: 180000 }); } catch (e) { logs.push('TIMEOUT boot'); }
  logs.push('boot ms ' + (Date.now() - t0));
  logs.push('fps ' + await page.evaluate('G.fps')); await page.waitForTimeout(2500);
  if (sc === 'menu') { await page.screenshot({ path: SC + 'menu.png', timeout: 150000 }); }
  else {
    await page.waitForTimeout(3000);
    await page.screenshot({ path: SC + sc + '_a.png', timeout: 150000 });
    // anda para frente e atira um pouco
    await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
    await page.waitForTimeout(6000);
    await page.screenshot({ path: SC + sc + '_b.png', timeout: 150000 });
    const st = await page.evaluate('({scene:G.scene, phase:G.phase, pt:G.pt, hp:G.me&&G.me.hp, alive:G.me&&G.me.alive, x:G.me&&G.me.m.x, z:G.me&&G.me.m.z, fps:G.fps, ents:G.ents.size})');
    logs.push('STATE ' + JSON.stringify(st));
  }
  console.log(logs.slice(0, 40).join('\n'));
  await browser.close();
})();
