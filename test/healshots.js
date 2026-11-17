// cura em primeira pessoa: cada item de cura aparece nas mãos com animação
const { chromium } = require('playwright'); const path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }); const logs = [];
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:0.6}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=tatico'); await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 240000 });
  await page.evaluate(`window.__dtMax=0.05; (()=>{ const s=G.sim,o=s.stepOne; s.stepOne=function(p,dt,f){ if(p.id!==G.me.id) return; if(p.heal) p.heal.t=Math.min(p.heal.t, p.heal.max*.5); return o.call(this,p,dt,f); }; })()`);
  for (const k of ['pano', 'caixa', 'leite', 'spray', 'mel', 'marmita']) {
    await page.evaluate(`(()=>{ const p=G.sim.players.find(q=>q.id===G.me.id); p.hp=40; p.heal={k:'${k}',t:.5,max:5,amt:1,tgt:p.id}; })()`);
    await page.evaluate('__ff(30)'); await page.waitForTimeout(300); await page.screenshot({ path: SC + 'heal_' + k + '.png' });
  }
  console.log(logs.join('\n') || 'ok'); await browser.close();
})();
