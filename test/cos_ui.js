// MENU v6: carregamento de Natal, Perfil/Armário/Loja, compra com Milho, equipar skin e emote, presente diário, sem Discord, versão Beta
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(`localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'medio', renderScale:.6})); localStorage.setItem('bombaki2.guestOk','true')`);
  await p.goto('file://' + path.resolve(__dirname, process.env.PAGE || '../dist/index.html'));
  ok(await p.evaluate(() => !!document.querySelector('#ldLogo svg') && !!document.querySelector('.ld-track')), 'tela de carregamento de Natal com logo e barra');
  await p.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 300000 }); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => !document.querySelector('#bDiscord') && !/discord/i.test(document.getElementById('menu').innerHTML)), 'sem Discord no menu');
  ok(await p.evaluate(() => /BETA/.test(document.querySelector('.mfoot-l').textContent) && document.querySelector('.mfoot-l').textContent.includes(VERSION)), 'versão BETA no rodapé');
  ok(await p.evaluate(() => profile.milho >= 1500 && Cos.has('em:forro') && Cos.has('hat:santa')), 'Milho inicial + 3 emotes + gorro do Noel');
  await p.click('#mNav [data-tab="perfil"]'); await p.waitForTimeout(400); ok(await p.evaluate(() => !!document.querySelector('#hub .pf-grid')), 'aba Perfil abre');
  await p.click('#mNav [data-tab="loja"]'); await p.waitForTimeout(400); ok(await p.evaluate(() => document.querySelectorAll('#hub .ccard').length >= 12), 'loja lista itens de Natal');
  const m0 = await p.evaluate(() => { profile.milho = 5000; Menu6.refresh(); Menu6.render(); return profile.milho; });
  await p.click('#hub [data-buy="ws:faca:natal"].ccard'); await p.waitForTimeout(300); await p.click('#bmBuy'); await p.waitForTimeout(400);
  ok(await p.evaluate(m0 => Cos.has('ws:faca:natal') && profile.milho === m0 - 1800, m0), 'compra Bengala Quebra-Nozes desconta 1800 de Milho');
  await p.click('#bmEq'); await p.waitForTimeout(400); ok(await p.evaluate(() => Cos.skinOf('faca') === 'natal' && /faca=natal/.test(Cos.wire())), 'skin equipada e enviada na rede');
  await p.evaluate(() => { Menu6.sub = 'emotes'; Menu6.open('armario'); }); await p.waitForTimeout(300); ok(await p.evaluate(() => document.querySelectorAll('#hub .em-slot').length === 3), 'armário: 3 espaços de emote');
  await p.evaluate(() => Menu6.playEmote('galinha')); await p.waitForTimeout(500); ok(await p.evaluate(() => !!Menu6.charOpts().emote), 'emote toca no personagem do menu');
  await p.evaluate(() => { Menu6.close(); store.set('giftDay', ''); }); const g0 = await p.evaluate(() => profile.milho); await p.click('#evGift'); await p.waitForTimeout(500);
  ok(await p.evaluate(g0 => profile.milho > g0 && !!document.querySelector('.giftm'), g0), 'presente diário dá Milho'); await p.evaluate(() => UI.close()); await p.click('#evGift'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('evGift').classList.contains('done')), 'presente só uma vez por dia');
  await p.waitForTimeout(800); ok(await p.evaluate(() => { for (let i = 0; i < 8; i++) CosIco.pump(); return [...CosIco.cache.values()].filter(Boolean).length > 3; }), 'ícones 3D dos cosméticos gerados');
  ok(errs.length === 0, 'sem erros de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await b.close(); process.exit(fails ? 1 : 0);
})();
