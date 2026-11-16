// v3: loja, HUD 5x5, placar TAB, mapa M, notificação de headshot; BR: vaca, paraquedas, mochila, natação
const { chromium } = require('playwright'); const path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
(async () => {
  const W = 1280, H = 720, only = process.argv[2] || 'all';
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const logs = [];
  const open = async (q) => {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    page.on('console', m => { if (m.type() === 'error' && !/TUNNEL|Failed to load resource/.test(m.text())) logs.push('err: ' + m.text().slice(0, 300)); }); page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
    await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:${process.env.RS || 0.5}}))}catch(e){}`);
    await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + q); await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 240000 }); await page.waitForTimeout(800); return page;
  };
  const shot = async (page, n) => { await page.waitForTimeout(500); await page.screenshot({ path: SC + 'v3_' + n + '.png', timeout: 150000 }); };
  if (only === 'all' || only === 'tat') {
    const page = await open('?test=1&auto=tatico');
    await page.evaluate('window.__dtMax = 0.05');
    await shot(page, 't1_prep');
    await page.keyboard.press('KeyB'); await shot(page, 't2_shop');
    await page.click('#shop [data-b="colete"]'); await page.evaluate('__ff(2)'); await page.waitForTimeout(300);
    logs.push('compra colete: money=' + await page.evaluate('G.me.money') + ' vest=' + await page.evaluate('G.me.vest'));
    await page.evaluate('G.me.money = 5000'); await page.click('#shop [data-b="galho"]'); await page.evaluate('__ff(2)'); logs.push('compra roçadeira: own=' + await page.evaluate('Object.keys(G.me.own).join()') + ' $' + await page.evaluate('G.me.money'));
    await page.keyboard.press('KeyB');
    await page.evaluate('__ff(60*21)'); await page.evaluate(`(()=>{ const s=G.sim,o=s.stepOne; s.stepOne=function(p,dt,f){ if(p!==G.me) return; return o.call(this,p,dt,f); }; })()`);
    await shot(page, 't3_live');
    await page.evaluate(`(()=>{ const s=G.sim, foe=s.players.find(p=>p.team!==G.me.team); s.damage(foe, G.me, 300, 'galho', 'head', foe.m.x, foe.m.y+1.7, foe.m.z); })()`); await page.evaluate('__ff(1)');
    await page.waitForTimeout(200); await shot(page, 't4_headshot');
    await page.keyboard.down('Tab'); await shot(page, 't5_tab'); await page.keyboard.up('Tab');
    await page.keyboard.press('KeyM'); await shot(page, 't6_map'); await page.keyboard.press('KeyM');
    logs.push('tat ok: phase=' + await page.evaluate('G.phase') + ' round=' + await page.evaluate('G.round'));
    await page.close();
  }
  if (only === 'all' || only === 'br') {
    const page = await open('?test=1&auto=caos');
    await page.evaluate('window.__dtMax = 0.05');
    await page.evaluate('__ff(60*6)'); await shot(page, 'b1_cow');
    await page.keyboard.down('Space'); await page.evaluate('__ff(3)'); await page.keyboard.up('Space'); await page.evaluate('__ff(80)');
    logs.push('salto: chute=' + await page.evaluate('!!G.me.chute') + ' cow=' + await page.evaluate('!!G.me.onCow'));
    await shot(page, 'b2_chute');
    await page.evaluate('__ff(60*25)'); logs.push('pouso: chute=' + await page.evaluate('!!G.me.chute') + ' y=' + await page.evaluate('G.me.m.y.toFixed(1)') + ' alive=' + await page.evaluate('G.me.alive'));
    await page.evaluate(`(()=>{ const s=G.sim,m=G.me; s.invAdd(m,'mel',1); s.invAdd(m,'pano_br',1); s.invAdd(m,'caixa_br',1); m.hp=40; s.giveWeapon(m,'porteira',2); })()`);
    await shot(page, 'b3_landed');
    await page.keyboard.press('KeyI'); await shot(page, 'b4_bag');
    await page.click('#bag [data-i="mel"]'); await page.click('#bag [data-u="mel"]'); await page.evaluate('__ff(60*5.5)'); logs.push('cura mel: hp=' + await page.evaluate('Math.round(G.me.hp)'));
    await page.evaluate(`(()=>{ const s=G.sim,m=G.me,W=G.map.W; let sp=null; for (let x=-240;x<240&&!sp;x+=2) for (let z=-240;z<240;z+=2) if (W.waterDepth(x,z)>2.8){sp={x,z};break;} m.m.x=sp.x+3; m.m.z=sp.z+3; m.m.y=W.waterY-1.3; m.m.vy=0; G.prev.x=m.m.x; G.prev.y=m.m.y; G.prev.z=m.m.z; })()`);
    await page.evaluate('__ff(30)'); logs.push('nadando=' + await page.evaluate('G.me.m.swim')); await shot(page, 'b5_swim');
    await page.close();
  }
  console.log(logs.join('\n')); await browser.close();
})().catch(e => { console.error('ERRO', e); process.exit(2); });
