// uso: node test/shot.js <html> <out.png> "<js a executar após ready>" [w] [h]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [html, out, js, w, h] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: +w || 1280, height: +h || 720 }, deviceScaleFactor: 1 });
  const logs = []; page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  await page.goto('file://' + path.resolve(html));
  try { await page.waitForFunction('window.ready || window.err', null, { timeout: 120000 }); } catch (e) { logs.push('TIMEOUT waiting ready'); }
  const err = await page.evaluate('window.err'); if (err) logs.push('ERR: ' + err);
  if (js) { const r = await page.evaluate(js); if (r !== undefined) logs.push('RESULT: ' + JSON.stringify(r)); }
  await page.waitForTimeout(300);
  await page.screenshot({ path: out });
  console.log(logs.slice(0, 40).join('\n'));
  await browser.close();
})();
