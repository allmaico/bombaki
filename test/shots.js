// uso: node test/shots.js <html> <prefix> <w> <h> "<js1>" "<js2>" ...  → prefix_1.png, prefix_2.png ...
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [html, prefix, w, h, ...cmds] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: +w || 960, height: +h || 540 }, deviceScaleFactor: 1 });
  const logs = []; page.on('console', m => { if (!/GL Driver Message/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.goto('file://' + path.resolve(html));
  try { await page.waitForFunction('window.ready || window.err', null, { timeout: 120000 }); } catch (e) { logs.push('TIMEOUT waiting ready'); }
  const err = await page.evaluate('window.err'); if (err) logs.push('ERR: ' + err);
  for (let i = 0; i < cmds.length; i++) {
    try { const r = await page.evaluate(cmds[i]); if (r !== undefined) logs.push(i + 1 + ' RESULT: ' + JSON.stringify(r)); } catch (e) { logs.push('CMD ' + (i + 1) + ' ERR: ' + e.message); }
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${prefix}_${i + 1}.png` });
  }
  console.log(logs.slice(0, 40).join('\n'));
  await browser.close();
})();
