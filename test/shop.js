// loja: abrir, selecionar categorias, comprar, estados (comprado / sem dinheiro / limite), sem pausa por cima
const { chromium } = require('playwright'); const path = require('path');
const SC = process.env.SC || '/tmp/claude-0/-home-claude/af606cd0-1bcb-5f4b-9907-dd7d470f58f8/scratchpad/';
(async () => {
  const W = +(process.argv[2] || 1600), H = +(process.argv[3] || 900);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } }); const logs = []; let fail = 0; const ok = (c, m) => { logs.push((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) logs.push('err: ' + m.text().slice(0, 200)); });
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:0.5}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1&auto=tatico'); await page.waitForFunction('window.G && G.scene === "play"', null, { timeout: 240000 });
  await page.evaluate('window.__dtMax = 0.05'); await page.waitForTimeout(500);
  await page.keyboard.press('KeyB'); await page.waitForTimeout(900);
  ok(await page.evaluate('Shop.open && !document.getElementById("shop").classList.contains("hidden")'), 'loja abre com B na fase de compra');
  ok(await page.evaluate('document.getElementById("pause").classList.contains("hidden")'), 'nenhuma pausa por cima da loja');
  const n = await page.evaluate('document.querySelectorAll("#shop .sc-card").length'); ok(n === 9, 'cartões na loja: ' + n);
  const imgs = await page.evaluate('[...document.querySelectorAll("#shop .sc-card img")].filter(i=>i.src.startsWith("data:image/png") && i.naturalWidth>0).length'); ok(imgs === n, 'cartões com imagem do modelo 3D: ' + imgs);
  ok(await page.evaluate('!/[\\u{1F300}-\\u{1FAFF}]/u.test(document.getElementById("shop").innerText)'), 'sem emojis no lugar dos itens');
  await page.screenshot({ path: SC + 'shop_1.png' });
  /* compra do colete */
  await page.click('#shop .sc-card[data-i="colete"]'); await page.waitForTimeout(200); await page.click('#shBuy'); await page.evaluate('__ff(3)'); await page.waitForTimeout(250);
  ok(await page.evaluate('G.me.vest > 0 && G.me.money === 150'), 'comprou colete ($ ' + await page.evaluate('G.me.money') + ')');
  ok(await page.evaluate('document.querySelector(\'.sc-card[data-i="colete"]\').classList.contains("st-max")'), 'colete marcado como LIMITE');
  ok(await page.evaluate('document.querySelector(\'.sc-card[data-i="galho"]\').classList.contains("st-poor")'), 'roçadeira marcada SEM DINHEIRO');
  ok(await page.evaluate('document.getElementById("shBuy").disabled'), 'botão desabilitado para item sem limite');
  await page.evaluate('G.me.money = 6000'); await page.click('#shop .sc-card[data-i="galho"]'); await page.waitForTimeout(150); await page.click('#shBuy'); await page.evaluate('__ff(3)'); await page.waitForTimeout(250);
  ok(await page.evaluate('G.me.own.galho !== undefined'), 'comprou Roçadeira');
  ok(await page.evaluate('/st-(own|eq)/.test(document.querySelector(\'.sc-card[data-i="galho"]\').className)'), 'Roçadeira marcada COMPRADO/NA MÃO');
  await page.click('#shop [data-c="Cura"]'); await page.waitForTimeout(300); ok(await page.evaluate('document.querySelectorAll("#shop .sc-card").length') === 2, 'categoria Cura filtra 2 itens');
  await page.click('#shop .sc-card[data-i="caixa"]'); await page.waitForTimeout(600); for (let i = 0; i < 25; i++) await page.evaluate('Shop.render()');
  await page.waitForTimeout(200); await page.screenshot({ path: SC + 'shop_2.png' });
  ok(await page.evaluate('(Icons.spins.get("caixa")||{f:[]}).f.length') >= 20, 'giro 360° do item selecionado gerado');
  await page.click('#shop [data-c="Todos"]'); await page.click('#shop .sc-card[data-i="porteira"]'); await page.waitForTimeout(300); await page.screenshot({ path: SC + 'shop_3.png' });
  await page.keyboard.press('Escape'); await page.waitForTimeout(200); ok(await page.evaluate('!Shop.open'), 'Esc fecha a loja');
  ok(await page.evaluate('document.getElementById("pause").classList.contains("hidden")'), 'fechar a loja não abre a pausa');
  console.log(logs.join('\n')); console.log(fail ? 'FALHAS: ' + fail : 'TUDO OK'); await browser.close(); process.exit(fail ? 1 : 0);
})();
