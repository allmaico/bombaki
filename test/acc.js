// contas: cadastro com hash, login, bloqueio por tentativas, recuperação por código, sessão, conquistas
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } }); const logs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; logs.push((c ? '  ✓ ' : '  ✗ FALHOU: ') + m); };
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
  await page.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'muito_baixo', renderScale:0.3}))}catch(e){}`);
  await page.goto('file://' + path.resolve(__dirname, '../dist/index.html')); await page.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 240000 });
  await page.waitForTimeout(1500); logs.push('modal: ' + await page.evaluate('document.querySelector("#modal-root .modal h2") && document.querySelector("#modal-root .modal h2").textContent')); ok(await page.evaluate('!!document.querySelector(".modal-bg") && document.querySelector("#modal-root .modal h2").textContent.includes("Entrar")'), 'tela de login aparece no primeiro acesso');
  const code = await page.evaluate(`Account.register('Maicao', 'segredo123')`); ok(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(code), 'código de recuperação gerado: ' + code);
  const rec = await page.evaluate(`JSON.stringify(Account.db()['maicao'])`); ok(!rec.includes('segredo123') && /"hash":"[0-9a-f]{64}"/.test(rec) && rec.includes('"iter":310000'), 'senha salva só como hash PBKDF2 (sem texto puro)');
  ok(!rec.includes(code), 'código de recuperação também só em hash');
  ok(await page.evaluate('profile.name') === 'Maicao', 'perfil usa o apelido da conta');
  await page.evaluate('Account.logout()');
  ok(await page.evaluate(`Account.login('maicao','errada').then(() => false, e => e.message.includes('incorretos'))`), 'senha errada recusada');
  await page.evaluate(`Account.login('maicao','x').catch(()=>0)`); await page.evaluate(`Account.login('maicao','y').catch(()=>0)`);
  ok(await page.evaluate(`Account.login('maicao','segredo123').then(() => false, e => e.message.includes('Muitas tentativas'))`), 'bloqueio após 3 tentativas erradas');
  await page.evaluate(`(()=>{ const a=store.get('lock',{}); a.maicao.until=0; store.set('lock',a); })()`);
  ok(await page.evaluate(`Account.recover('Maicao', ${JSON.stringify(code)}, 'novasenha9').then(() => true, e => e.message)`) === true, 'recuperação com o código troca a senha');
  await page.evaluate('Account.logout()'); ok(await page.evaluate(`Account.login('Maicao','novasenha9').then(() => true, e => e.message)`) === true, 'login com a nova senha');
  ok(await page.evaluate('Account.resume()'), 'sessão persiste (lembrar por 30 dias)');
  const got = await page.evaluate(`profile.kills += 6; Account.recordMatch({ mode: 'caos', win: true, k: 6, d: 0, a: 1, hs: 3, shots: 40, hits: 22, time: 600, score: 900, place: 1, survive: 600, xp: 200, aces: 1, knife: 1, sling: 0 }).map(a => a.name)`);
  ok(got.includes('Primeiro Sangue') && got.includes('Sobrevivente') && got.includes('Dono do Roçado'), 'conquistas: ' + got.join(', '));
  ok(await page.evaluate('profile.history.length') === 1 && await page.evaluate('profile.st.br.wins') === 1, 'histórico e estatísticas do BR salvos');
  await page.evaluate('AccUI.profile()'); await page.waitForTimeout(400); ok(await page.evaluate('!!document.querySelector("#pfB .card")'), 'perfil completo abre');
  console.log(logs.join('\n')); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
