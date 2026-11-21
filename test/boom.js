// explosão da mandioca: planta no site B e fotografa a explosão em quadros consecutivos
const { chromium } = require('playwright'); const path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
(async () => {
  const W = +process.argv[2] || 1280, H = +process.argv[3] || 720, DIST = +(process.argv[4] || 30);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const logs = []; page.on('console', m => { if (m.type() === 'error' && !/TUNNEL|Failed to load resource/.test(m.text())) logs.push('err: ' + m.text().slice(0, 300)); }); page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'${process.env.QUAL || 'baixo'}', renderScale:${process.env.RS || 0.7}}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=tatico');
  await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 180000 });
  await page.evaluate('__live()');
  await page.evaluate(`(()=>{ const s=G.sim,o=s.stepOne; s.stepOne=function(p,dt,f){ if(p!==G.me) return; return o.call(this,p,dt,f); }; const m=G.me; m.team=1; for(const q of s.players) q.hasBomb=false; s.pickBomb(m); const S=G.map.sites.B; m.m.x=S.x; m.m.z=S.z; m.m.y=G.map.W.heightAt(S.x,S.z)+.05; m.m.vx=m.m.vz=0; m.m.yaw=0; G.view.yaw=0; })()`);
  await page.evaluate('__ff(20)'); await page.keyboard.down('KeyE'); await page.evaluate('__ff(230)'); await page.keyboard.up('KeyE');
  const info = await page.evaluate(`(()=>{ const s=G.sim,b=s.bomb,m=G.me; return JSON.stringify({st:b.st,x:b.x,z:b.z,timer:b.timer}); })()`); logs.push(info);
  // congela o relógio real do jogo; o tempo da simulação passa só pelo __ff
  await page.evaluate('G.paused = true; __ff(60*38.4)');
  await page.evaluate('window.__dtMax = ' + (process.env.DTMAX || 0.05));
  const ANG = +(process.env.ANG || -1.57), HGT = +(process.env.HGT || 3.2);
  await page.evaluate(`(()=>{ const s=G.sim,b=s.bomb,m=G.me; const ang=${ANG}; m.m.x=b.x+Math.sin(ang)*${DIST}; m.m.z=b.z+Math.cos(ang)*${DIST}; m.m.y=G.map.W.heightAt(m.m.x,m.m.z)+${HGT}; m.m.vx=m.m.vz=0; m.m.vy=0; const yaw=Math.atan2(-(b.x-m.m.x),-(b.z-m.m.z)); m.m.yaw=yaw; G.view.yaw=yaw; G.view.pitch=-.1; G.prev.x=m.m.x; G.prev.y=m.m.y; G.prev.z=m.m.z; })()`);
  await page.waitForTimeout(500);
  await page.evaluate('__ff(36)');   // ~0.6 s depois: explosão imediatamente antes do fim
  for (let i = 0; i < 12; i++) { logs.push(i + ' ' + await page.evaluate(`JSON.stringify({st:G.sim.bomb.st,t:+G.sim.bomb.timer.toFixed(2),fx:G.fx&&G.fx.count&&G.fx.count()})`)); await page.screenshot({ path: SC + 'boom_' + i + '.png', timeout: 150000 }); if (i === 0) await page.evaluate('__ff(2)'); }
  logs.push(await page.evaluate(`JSON.stringify({st:G.sim.bomb.st,alive:G.me.alive,hp:G.me.hp})`));
  console.log(logs.join('\n')); await browser.close();
})();
