// cenário avançado no navegador: prep → live → plantar (E) → largar bomba (Q) → pegar → plantar → defuse ... com screenshots do HUD
const { chromium } = require('playwright'); const path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
(async () => {
  const W = +process.argv[2] || 1280, H = +process.argv[3] || 720;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const logs = []; page.on('console', m => { const t = m.type(); if (t === 'error' && !/TUNNEL|Failed to load resource/.test(m.text())) logs.push(t + ': ' + m.text().slice(0, 300)); }); page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:${process.env.RS || 0.6}}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=tatico');
  await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 180000 });
  const snap = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: SC + name + '.png', timeout: 150000 }); };
  const st = (extra) => page.evaluate(`(()=>{const s=G.sim,m=G.me; return JSON.stringify(Object.assign({ph:s.phase,pt:+s.pt.toFixed(1),team:m.team,alive:m.alive,hasBomb:m.hasBomb,bomb:s.bomb.st,bt:+s.bomb.timer.toFixed(1),x:+m.m.x.toFixed(1),z:+m.m.z.toFixed(1),useK:m.useK,useT:+m.useT.toFixed(2),score:s.score,round:s.round}, ${extra || '{}'}))})()`);
  logs.push('0 ' + await st());
  await page.evaluate('__ff(60*21)'); logs.push('1 live? ' + await st());
  await page.evaluate(`(()=>{ const s=G.sim, o=s.stepOne; s.stepOne=function(p,dt,f){ if(p!==G.me) return; return o.call(this,p,dt,f); }; })()`); // bots congelados (teste determinístico)
  // dá a bomba ao humano e o leva ao site A
  await page.evaluate(`(()=>{ const s=G.sim,m=G.me; if(m.team!==1){ m.team=1; } for(const q of s.players){ if(q.hasBomb){ q.hasBomb=false; } } s.pickBomb(m); const S=G.map.sites.A; m.m.x=S.x; m.m.z=S.z; m.m.y=G.map.W.heightAt(S.x,S.z)+.05; m.m.vx=m.m.vz=0; m.m.vy=0; m.m.yaw=0; })()`);
  await page.evaluate('__ff(30)'); logs.push('2 no site com bomba ' + await st());
  await snap('b_prompt_plant');
  await page.keyboard.down('KeyE'); await page.evaluate('__ff(100)'); logs.push('3 plantando ' + await st()); await snap('b_planting');
  await page.evaluate('__ff(130)'); await page.keyboard.up('KeyE'); logs.push('4 após plantar ' + await st()); await snap('b_planted');
  // volta a bomba ao chão como "dropped" e testa pick-up
  await page.evaluate('__ff(30)');
  // defuse: vira defensor e desarma
  await page.evaluate(`(()=>{ const s=G.sim,m=G.me; m.team=2; const b=s.bomb; m.m.x=b.x+.8; m.m.z=b.z; m.m.y=b.y; m.m.vx=m.m.vz=0; m.m.yaw=Math.atan2(-(b.x-m.m.x),-(b.z-m.m.z)); G.view.yaw=m.m.yaw; })()`);
  await page.evaluate('__ff(20)'); logs.push('5 perto da bomba (DEF) ' + await st()); await snap('b_defuse_prompt');
  await page.keyboard.down('KeyE'); await page.evaluate('__ff(180)'); logs.push('6 desarmando ' + await st()); await snap('b_defusing');
  await page.evaluate('__ff(200)'); await page.keyboard.up('KeyE'); logs.push('7 pós-defuse ' + await st()); await snap('b_postround');
  await page.evaluate('__ff(60*6)'); logs.push('8 próxima rodada ' + await st()); await snap('b_round2');
  // explosão: força planted com timer curto
  await page.evaluate('__ff(60*9)'); 
  await page.evaluate(`(()=>{ const s=G.sim,m=G.me; m.team=1; for(const q of s.players){ q.hasBomb=false; } s.pickBomb(m); const S=G.map.sites.B; m.m.x=S.x; m.m.z=S.z; m.m.y=G.map.W.heightAt(S.x,S.z)+.05; m.m.vx=m.m.vz=0; m.m.yaw=Math.PI; G.view.yaw=Math.PI; })()`);
  await page.evaluate('__ff(20)'); await page.keyboard.down('KeyE'); await page.evaluate('__ff(260)'); await page.keyboard.up('KeyE'); logs.push('9 plantou B ' + await st());
  await page.evaluate(`(()=>{ const s=G.sim,m=G.me; m.m.x+=14; m.m.z+=3; })()`);
  await page.evaluate('__ff(60*33)'); logs.push('10 timer ' + await st()); await snap('b_boom_pre');
  await page.evaluate('__ff(60*7)'); logs.push('11 pós-explosão ' + await st()); await snap('b_boom');
  console.log(logs.join('\n')); await browser.close();
})();
