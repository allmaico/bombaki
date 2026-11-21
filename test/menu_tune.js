// testa várias composições da cena do menu (UI escondida) e gera folha de contato
const { chromium } = require('playwright'); const path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
const cands = JSON.parse(process.argv[2]); // [{hx,hz,cx,cz,tx,tz,face,cy,fov}]
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const logs = []; page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'${process.env.QUAL || 'medio'}', renderScale:1}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html'));
  await page.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 180000 });
  await page.addStyleTag({ content: '#menu{display:none!important}' });
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    await page.evaluate(c => { Object.assign(MENU, c); G.menuAnimals = null; }, c);
    await page.waitForTimeout(900);
    await page.screenshot({ path: SC + 'mt' + i + '.png', timeout: 120000 });
  }
  console.log(logs.join('\n') || 'ok'); await browser.close();
})();
