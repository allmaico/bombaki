// fotos do mapa 5x5 (Vila do Roçado) e do mapa do BR em vários pontos + mapa grande
const { chromium } = require('playwright'); const path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
(async () => {
  const mode = process.argv[2] || 'tatico', MAPID = process.argv[3] || 'vila', W = 960, H = 540;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } }); const logs = [];
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) logs.push('err: ' + m.text().slice(0, 200)); if (/^mapa /.test(m.text())) logs.push(m.text()); });
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:0.6, hud:1}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=' + mode + '&map=' + MAPID); await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 240000 });
  logs.push('mapa ativo: ' + await page.evaluate('G.map.id + " · " + G.map.name'));
  await page.evaluate(`window.__dtMax=0.05; (()=>{ const s=G.sim,o=s.stepOne; s.stepOne=function(p,dt,f){ if(p!==G.me) return; return o.call(this,p,dt,f); }; s.phase='live'; s.pt=999; })()`);
  const views = MAPID === 'arena2' && mode === 'tatico' ? [['siteA', -28, -50, Math.PI / 2, .08], ['siteB', -24, 54, Math.PI / 2, .08], ['patio', 11, 9, Math.PI / 2, .05], ['longA', 60, -54, Math.PI / 2, 0], ['vau', 42, 54, Math.PI / 2, 0], ['tspawn', 76, 0, Math.PI / 2, .02], ['ctspawn', -82, 0, -Math.PI / 2, .02], ['tulha', 0, -36, 0, .05], ['moinho', -50, -45, -0.955, .25], ['curral', -16, 18, 1.2, .05]] : mode === 'tatico' ? [['siteA', -50, -27, 2.3, .15], ['siteB', 50, -27, -2.3, .15], ['mid', 0, 20, 0, .05], ['longA', -71, 40, 0, .0], ['tunnelB', 71, 30, 0, .0], ['tspawn', 0, 62, 0, .02], ['ctspawn', 0, -64, Math.PI, .02], ['creek', -40, 30.5, -1.57, .0]]
    : [['sede', 80, 0, -2.3, .05], ['haras', -70, 140, Math.PI, .05], ['graos', -100, -120, 0, .08], ['mirante', 170, -85, -1.57, .15], ['vila', 160, 150, 3.14, .05]];
  for (const [n, x, z, yaw, pitch] of (process.env.ONLYBIG ? [] : views)) {
    await page.evaluate(`(()=>{ const me=G.me; me.onCow=false; me.chute=null; G.sim.placeAt(me,{x:${x},z:${z},yaw:${yaw}}); G.view.yaw=${yaw}; G.view.pitch=${pitch}; G.syncView=true; __ff(30); })()`);
    await page.waitForTimeout(700); await page.screenshot({ path: SC + 'map_' + MAPID + '_' + n + '.png' });
  }
  await page.keyboard.press('KeyM'); await page.waitForTimeout(500); await page.screenshot({ path: SC + 'map_' + MAPID + '_big.png' });
  console.log(logs.join('\n')); await browser.close();
})();
