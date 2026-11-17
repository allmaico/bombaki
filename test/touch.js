// celular (toque, horizontal): botões aparecem, joystick move o personagem, botão de pulo, qualidade baixa automática
const { chromium } = require('playwright'); const path = require('path');
const SC = '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' });
  const page = await ctx.newPage(); const logs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; logs.push((c ? '  ✓ ' : '  ✗ FALHOU: ') + m); };
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
  await page.addInitScript(`try{localStorage.setItem('bombaki2.guestOk','true')}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?auto=tatico'); await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 240000 });
  ok(await page.evaluate('IS_TOUCH && Touch.on'), 'toque detectado');
  ok(await page.evaluate('settings.quality') === 'celular', 'gráfico Celular (nítido, com resolução automática) no celular (' + await page.evaluate('settings.quality') + ')');
  ok(await page.evaluate('document.querySelectorAll("#touch .tb").length') >= 12, 'botões de toque na tela');
  await page.evaluate('__live()'); await page.waitForTimeout(500);
  const cdp = await ctx.newCDPSession(page); const p0 = await page.evaluate('({x:G.me.m.x,z:G.me.m.z})');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 300, id: 1 }] });
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120, y: 300 - i * 10, id: 1 }] }); }
  await page.evaluate('__ff(90)');
  const p1 = await page.evaluate('({x:G.me.m.x,z:G.me.m.z})'); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  ok(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 2, 'joystick virtual move o personagem (' + Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(1) + ' m)');
  const y0 = await page.evaluate('G.me.m.yaw'); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 600, y: 200, id: 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 680, y: 200, id: 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.evaluate('__ff(5)'); await page.waitForTimeout(300);
  ok(Math.abs(await page.evaluate('G.view.yaw') - y0) > .05, 'arrastar à direita gira a câmera');
  await page.screenshot({ path: SC + 'touch.png' });
  console.log(logs.join('\n')); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
