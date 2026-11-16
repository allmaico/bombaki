const { chromium } = require('playwright'); const path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const logs = []; page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:0.4}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=tatico'); await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 240000 });
  await page.evaluate('__ff(60*21); G.paused = true; document.getAnimations && 0;');
  await page.evaluate(`Notif.show('CAPRICHOU NO CHAPÉU!', '+50 pontos de headshot', { hat: true, dur: 30 }); document.querySelector('#notif').getAnimations().forEach(a => { a.pause(); a.currentTime = 500; });`);
  await page.screenshot({ path: SC + 'notif.png' });
  await page.evaluate(`G.paused = false; G.sim.giveWeapon(G.me, 'porteira', 0); Input.acts.push('w:porteira')`); await page.evaluate('__ff(40)'); await page.waitForTimeout(800);
  await page.screenshot({ path: SC + 'vm_porteira.png' });
  await page.evaluate(`Input.acts.push('w:estilingue')`); await page.evaluate('__ff(40)'); await page.waitForTimeout(800); await page.screenshot({ path: SC + 'vm_estilingue.png' });
  await page.mouse.down({ button: 'right' }); await page.evaluate('__ff(30)'); await page.waitForTimeout(800); await page.screenshot({ path: SC + 'vm_estilingue_ads.png' }); await page.mouse.up({ button: 'right' });
  await page.evaluate(`Input.acts.push('w:galho')`); await page.evaluate('__ff(40)'); await page.mouse.down({ button: 'right' }); await page.evaluate('__ff(30)'); await page.waitForTimeout(800); await page.screenshot({ path: SC + 'vm_galho_ads.png' }); await page.mouse.up({ button: 'right' });
  console.log(logs.join('\n') || 'ok'); await browser.close();
})();
