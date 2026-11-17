// primeira pessoa: cada arma parada, mirando e no meio da recarga
const { chromium } = require('playwright'); const path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }); const logs = [];
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:0.6}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=' + (process.env.MODE || 'tatico')); await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 240000 });
  await page.evaluate(`window.__dtMax=0.05; (()=>{ const s=G.sim,o=s.stepOne; s.stepOne=function(p,dt,f){ if(p!==G.me) return; return o.call(this,p,dt,f); }; const me=G.me; for (const w of ['galho','colher','porteira','vassoura']) { me.own[w]=0; me.mag[w]=WEAPONS[w].mag; me.ammo[WEAPONS[w].ammo]=WEAPONS[w].res; } me.nades=2; })()`);
  const ids = (process.env.W || 'galho,colher,porteira,vassoura,estilingue,faca,batata').split(',');
  for (const w of ids) {
    await page.evaluate(`Input.acts.push('w:${w}')`); await page.evaluate('__ff(70)'); await page.waitForTimeout(400); await page.screenshot({ path: SC + 'vm_' + w + '_hip.png' });
    if (['galho', 'colher', 'porteira', 'vassoura', 'estilingue'].includes(w)) {
      await page.evaluate('Input.btn[2]=true'); await page.evaluate('__ff(40)'); await page.waitForTimeout(400); await page.screenshot({ path: SC + 'vm_' + w + '_ads.png' }); await page.evaluate('Input.btn[2]=false; __ff(30)');
      await page.evaluate(`G.me.mag['${w}']=1; Input.acts.push('r')`); const rl = await page.evaluate(`WEAPONS['${w}'].reload`);
      for (const f of [.3, .55]) { await page.evaluate(`__ff(${Math.round(rl * 60 * (f === .3 ? .3 : .25))})`); await page.waitForTimeout(300); await page.screenshot({ path: SC + 'vm_' + w + '_rl' + f + '.png' }); }
      await page.evaluate('__ff(200)');
    }
  }
  console.log(logs.join('\n') || 'ok'); await browser.close();
})();
