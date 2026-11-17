// mede triângulos/draw calls olhando para o horizonte (8 direções), com e sem LOD
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } }); const logs = [];
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/TUNNEL|Failed to load/.test(m.text())) logs.push('err ' + m.text().slice(0, 200)); });
  const Q = process.env.QUAL || 'alto';
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'${Q}', renderScale:0.3}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=' + (process.env.MODE || 'tatico'));
  await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 180000 });
  await page.evaluate('G.paused = true');
  const measure = async () => { let mx = { tris: 0, draws: 0 }, sum = 0; for (let k = 0; k < 8; k++) { await page.evaluate(`G.view.yaw = ${k * Math.PI / 4}; G.view.pitch = 0.02`); await page.waitForTimeout(350); const s = await page.evaluate('({tris: G.R.stats.tris, draws: G.R.stats.draws})'); sum += s.tris; if (s.tris > mx.tris) mx = s; } return { max: mx, avg: Math.round(sum / 8) }; };
  const a = await measure();
  await page.evaluate('G.R.q = Object.assign({}, G.R.q, { lodDist: 1e9, terrLod: 1e9 })');
  const b = await measure();
  console.log(`qualidade ${Q}: COM LOD max ${a.max.tris | 0} tris / ${a.max.draws} draws, média ${a.avg}`);
  console.log(`qualidade ${Q}: SEM LOD max ${b.max.tris | 0} tris / ${b.max.draws} draws, média ${b.avg}`);
  console.log(logs.join('\n')); await browser.close();
})();
