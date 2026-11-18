// AMIGOS + ESQUADRÃO de ponta a ponta (duas abas, rede local): pedido → aceitar → status → convite → entrar → pronto → líder inicia → mesmo esquadrão no BR e mesmo time no 5x5 → remover/bloquear
const { chromium } = require('playwright'); const path = require('path'); const S = process.env.SHOTS || '';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const wait = async (p, fn, arg, ms) => { try { await p.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 200 }); return true; } catch (e) { return false; } };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] }); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const errs = [];
  await ctx.addInitScript(`for (const p of ['a','b']) { localStorage.setItem('bombaki2'+p+'.settings', JSON.stringify({quality:'baixo', renderScale:.5, music:0})); localStorage.setItem('bombaki2'+p+'.guestOk','true'); }
    localStorage.setItem('bombaki2a.profile', JSON.stringify({name:'Líder', skin:1})); localStorage.setItem('bombaki2b.profile', JSON.stringify({name:'Parceiro', skin:2}));`);
  const url = n => 'file://' + path.resolve(__dirname, process.env.PAGE || '../dist/index.html') + '?net=local&prof=' + n;
  const A = await ctx.newPage(), B = await ctx.newPage(); for (const [p, n] of [[A, 'A'], [B, 'B']]) p.on('pageerror', e => errs.push(n + ': ' + e.message));
  await A.goto(url('a')); await B.goto(url('b'));
  for (const p of [A, B]) await p.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 300000 });
  ok(await wait(A, 'Social.up') && await wait(B, 'Social.up'), 'caixas postais online (código de amigo)');
  const fa = await A.evaluate('Social.fc()'), fb = await B.evaluate('Social.fc()'); ok(/^[A-Z2-9]{6}$/.test(fa) && fa !== fb, `códigos de amigo: #${fa} e #${fb}`);
  /* pedido de amizade pela interface */
  await B.evaluate(() => Menu6.open('amigos')); await B.fill('#frCode', fa); await B.click('[data-fa="add"]');
  ok(await wait(A, fb => profile.freqIn.some(r => r.fc === fb), fb), 'A recebeu o pedido de amizade de B');
  ok(await A.evaluate(() => !$('frBadge').classList.contains('hidden')), 'aviso (badge) de pedido na aba AMIGOS');
  await A.evaluate(() => Menu6.open('amigos')); await A.waitForTimeout(300); if (S) await A.screenshot({ path: S + '/pt_pedido.png' });
  await A.click(`[data-facc="${fb}"]`);
  ok(await wait(A, fb => Social.isFriend(fb), fb) && await wait(B, fa => Social.isFriend(fa), fa), 'pedido aceito: amigos dos dois lados');
  await A.evaluate(() => Social.refreshAll()); ok(await wait(A, fb => (Social.st.get(fb) || {}).on === 1, fb), 'status online do amigo visível');
  /* convite para o esquadrão */
  await A.evaluate(() => Menu6.refreshSocial()); await A.waitForTimeout(200); await A.click(`[data-pinv="${fb}"]`);
  ok(await wait(B, '!!document.getElementById("invPop")'), 'B recebeu o convite (popup)'); await B.waitForTimeout(700); if (S) await B.screenshot({ path: S + '/pt_convite.png' });
  await B.click('#invPop [data-y]');
  ok(await wait(A, 'Party.size() === 2') && await wait(B, 'Party.size() === 2 && !Party.isLeader()'), 'B entrou no esquadrão de A (2/4)');
  await B.evaluate(() => Menu6.close()); await A.evaluate(() => Menu6.close());
  await B.click('#bPlay'); ok(await wait(A, fb => Party.members.some(m => m.fc === fb && m.ready), fb), 'B ficou PRONTO (botão JOGAR do membro)');
  await A.waitForTimeout(600); if (S) { await A.screenshot({ path: S + '/pt_menuA.png' }); await B.screenshot({ path: S + '/pt_menuB.png' }); }
  ok(await A.evaluate(() => document.querySelectorAll('#sqCard .sq-s:not(.empty)').length === 2 && (G.p3d || []).length === 1), 'cartão do esquadrão + parceiro em 3D ao lado do herói');
  /* líder começa Battle Royale em esquadrão */
  await A.evaluate(() => UI.on.offline({ mode: 'caos', botLevel: 'facil', total: 16, squad: 4 }));
  ok(await wait(A, 'G.scene === "play"', null, 120000) && await wait(B, 'G.scene === "play"', null, 120000), 'os dois entraram juntos na partida');
  const sq = await A.evaluate(() => { const s = G.sim, me = s.get(G.myId), o = s.players.find(p => !p.bot && p !== me); return { a: me.bsq, b: o && o.bsq, foe: o ? s.isEnemy(me, o) : true, n: s.players.filter(p => p.bsq === me.bsq).length, sqs: new Set(s.players.map(p => p.bsq)).size, squad: s.cfg.squad }; });
  ok(sq.a && sq.a === sq.b && !sq.foe, `mesmo esquadrão no BR (esq. ${sq.a}, sem fogo amigo)`); ok(sq.n === 4 && sq.sqs === 4, `esquadrões de 4 (bots completam): ${sq.sqs} esquadrões`);
  ok(await wait(B, () => myBsq() > 0 && myBsq() === [...G.rinfo.values()].find(r => r.name === 'Líder').bsq), 'cliente sabe quem é do seu esquadrão');
  await B.waitForTimeout(2500); if (S) await B.screenshot({ path: S + '/pt_jogo.png' }); ok(await B.evaluate(() => !!document.getElementById('sqhud')), 'painel ESQUADRÃO na partida');
  /* voltar ao menu: esquadrão continua; 5x5 no mesmo time */
  await A.evaluate(() => Game.leave()); await B.evaluate(() => Game.leave()); await A.waitForTimeout(800);
  ok(await A.evaluate('Party.size() === 2') && await B.evaluate('Party.size() === 2'), 'esquadrão continua junto depois da partida');
  await A.evaluate(() => UI.on.offline({ mode: 'tatico', botLevel: 'facil', map: 'arena' }));
  ok(await wait(A, 'G.scene === "play" && !!G.sim', null, 120000) && await wait(B, 'G.scene === "play"', null, 120000), '5x5 do esquadrão começou');
  const tm = await A.evaluate(() => { const s = G.sim, me = s.get(G.myId), o = s.players.find(p => !p.bot && p !== me); return me.squad === o.squad; }); ok(tm, 'no 5x5 os dois caem no mesmo time');
  await A.evaluate(() => Game.leave()); await B.evaluate(() => Game.leave()); await A.waitForTimeout(800);
  /* remover do esquadrão / sair / remover amigo / bloquear */
  await A.evaluate(fb => Party.kick(fb), fb); ok(await wait(B, 'Party.size() === 1') && await wait(A, 'Party.size() === 1'), 'líder remove membro do esquadrão');
  await A.evaluate(fb => Social.remove(fb), fb); ok(await wait(B, fa => !Social.isFriend(fa), fa), 'remover amigo remove dos dois lados');
  await A.evaluate(fb => Social.block({ fc: fb, name: 'Parceiro' }), fb); const r = await B.evaluate(fa => Social.request(fa), fa);
  ok(await A.evaluate(fb => !profile.freqIn.some(x => x.fc === fb), fb) && r !== 'ok', 'bloqueado não consegue mandar pedido');
  ok(errs.length === 0, 'sem erros de JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); await b.close(); process.exit(fails ? 1 : 0);
})();
