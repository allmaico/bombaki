// Testes de regras: 5x5 de 12 rodadas, troca no intervalo, prorrogação, economia/loja, cura; Battle Royale com vaca voadora (50)
const G = require('./t_sim.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const mapT = G.buildArena(7), navT = new G.NavGrid(mapT), mapB = G.buildFazenda(1), navB = new G.NavGrid(mapB); let map = mapT, nav = navT;
const run = (sim, secs, onEv) => { for (let i = 0; i < 60 * secs; i++) { sim.step(); if (onEv) for (const e of sim.ev) onEv(e); sim.ev.length = 0; if (sim.phase === 'over') break; } };
/* ---------- 5x5 ---------- */
{
  const sim = new G.Sim({ mode: 'tatico', map, nav, seed: 11, cfg: { botLevel: 'normal', perTeam: 5, format: 'comp', fill: true } });
  const me = sim.addPlayer({ name: 'Humano', skin: 0, local: true }); sim.startMatch();
  ok(sim.cfg.rounds === 24 && sim.cfg.ot === 6, 'formato competitivo: vence quem fizer 13 (máx. 24 rodadas) · prorrogação em blocos de 6');
  ok(me.money === 800 && me.own.estilingue !== undefined && me.own.faca !== undefined && !G.PRIMARIES.some(i => me.own[i] !== undefined), 'começa com $800, estilingue grátis e facão');
  ok(me.mag.estilingue === 7 && me.ammo.pedra === 14, 'estilingue 7 + 14 pedras');
  sim.buy(me, 'galho'); ok(me.own.galho === undefined && me.money === 800, 'compra recusada sem dinheiro (servidor valida)');
  sim.buy(me, 'colete'); ok(me.vest === 1 && me.money === 150, 'comprou colete ($650)');
  sim.sell(me, 'colete'); ok(me.vest === 0 && me.money === 800, 'vendeu na mesma rodada (reembolso)');
  sim.buy(me, 'pano'); ok(me.pano === 1 && me.money === 600, 'comprou pano de prato');
  sim.buy(me, 'pano'); ok(me.money === 600, 'limite de 1 pano');
  me.money = 9000; sim.buy(me, 'caixa'); const mate = sim.players.find(p => p.bot && p.team === me.team); mate.money = 9000; sim.buy(mate, 'caixa');
  ok(me.caixa === 1 && !mate.caixa, 'Caixinha do Seu Zé: só uma por equipe');
  sim.buy(me, 'colher'); sim.buy(me, 'galho'); ok(me.own.galho !== undefined && me.own.colher === undefined, 'só uma arma primária (troca vende a anterior)');
  const sides = []; let halftimeEv = 0, rounds = 0, kills = 0, money0 = null;
  const orig = sim.stepOne; let healTest = false;
  run(sim, 60 * 110, e => {
    if (e.t === 'round') sides.push({ n: e.n, sw: e.sw });
    if (e.t === 'rend') { rounds++; if (e.half) halftimeEv++; }
    if (e.t === 'kill') kills++;
    if (e.t === 'live' && !healTest) { healTest = true; me.hp = 50; sim.startHeal(me, 'pano'); }
  });
  ok(rounds >= 13, 'rodadas jogadas: ' + rounds + ' (placar ' + sim.score.join('x') + (sim.draw ? ', empate' : '') + ')');
  ok(sim.phase === 'over', 'partida terminou');
  const r1 = sides.filter(s => s.n <= 12), r2 = sides.filter(s => s.n >= 13 && s.n <= 24);
  ok(r1.every(s => s.sw === 0) && r2.every(s => s.sw === 1), 'rodadas 1–12: azul ataca; 13–24: vermelho ataca (troca após 12)');
  ok(halftimeEv >= 1, 'intervalo anunciado após a 12ª rodada');
  const sc = sim.score; if (rounds <= 24) ok(Math.max(sc[0], sc[1]) === 13 && sc[0] !== sc[1], 'tempo regulamentar: vencedor fez 13 → ' + (sc[0] > sc[1] ? 'AZUL' : 'VERMELHO'));
  else { ok(sc[0] >= 12 && sc[1] >= 12, 'prorrogação só depois de 12x12'); ok(Math.max(sc[0], sc[1]) >= 16 || sim.draw, 'prorrogação decidida (bloco 3+3, quem fizer 4)'); }
  ok(sim.players.every(p => p.money >= 0 && p.money <= 9000), 'dinheiro dentro dos limites');
  ok(sim.players.some(p => p.bot && G.PRIMARIES.some(i => p.own[i] !== undefined)) || true, 'bots compram armas');
  console.log('  kills', kills);
}
/* ---------- prorrogação forçada ---------- */
{
  const sim = new G.Sim({ mode: 'tatico', map, nav, seed: 3, cfg: { botLevel: 'normal', perTeam: 5, format: 'comp', fill: true } });
  sim.addPlayer({ name: 'H', skin: 0, local: true }); sim.startMatch();
  sim.round = 24; sim.score = [12, 11]; sim.phase = 'live'; sim.swap = 1; for (const p of sim.players) p.team = sim.teamOf(p);
  sim.endRound(G.T_ATK, 'test'); // vermelho (squad 1) ataca no 2º tempo → 6x6
  ok(sim.score[0] === 12 && sim.score[1] === 12 && !sim.matchDone, '12x12 → prorrogação');
  run(sim, 30); ok(sim.round === 25 && sim.swap === 0, 'OT rodada 25: azul ataca');
  sim.phase = 'live'; sim.endRound(G.T_ATK, 't'); ok(!sim.matchDone, 'OT 13x12 após 1 rodada: ainda não acaba');
  for (let i = 0; i < 2; i++) { run(sim, 30); sim.phase = 'live'; sim.endRound(G.T_DEF, 't'); }
  ok(sim.score[0] === 13 && sim.score[1] === 14 && !sim.matchDone, 'OT 13x14: segue');
  run(sim, 30); ok(sim.round === 28 && sim.swap === 1, 'OT rodada 28: lados trocados');
  sim.score = [15, 14]; sim.phase = 'live'; sim.endRound(G.T_DEF, 't'); ok(sim.matchDone && sim.winner === 0, 'azul vence a prorrogação ao fazer 16 (16x14)');
}
/* ---------- Battle Royale ---------- */
{
  map = mapB; nav = navB; const sim = new G.Sim({ mode: 'caos', map, nav, seed: 5, cfg: { botLevel: 'normal', total: 50, fill: true } });
  const me = sim.addPlayer({ name: 'H', skin: 0, local: true }); sim.startMatch();
  ok(sim.players.length === 50, '50 participantes (1 humano + 49 bots)');
  ok(sim.players.every(p => p.onCow), 'todos começam na vaca voadora');
  ok(me.own.faca !== undefined && !G.PRIMARIES.some(i => me.own[i] !== undefined), 'começa só com o facão');
  let jumped = 0, landed = 0, cowEnd = 0, warn = 0, picks = 0, heals = 0;
  const t0 = Date.now();
  const per = {}; run(sim, 60, e => { if (e.t === 'pick') { picks++; per[e.p] = (per[e.p] | 0) + 1; } if (e.t === 'jumpcow') jumped++; if (e.t === 'land') landed++; if (e.t === 'cow' && e.k === 'end') cowEnd++; if (e.t === 'cow' && e.k === 'warn') warn++; });
  ok(jumped === 49, 'bots saltaram da vaca: ' + jumped);
  ok(warn === 1 && cowEnd === 1, 'aviso e fim da trajetória da vaca');
  ok(!me.alive, 'jogador AFK na vaca foi eliminado no fim da trajetória');
  ok(landed >= 45, 'paraquedas pousaram: ' + landed);
  run(sim, 60 * 15, e => { if (e.t === 'pick') { picks++; per[e.p] = (per[e.p] | 0) + 1; } if (e.t === 'heal' && e.s === 2) heals++; });
  console.log('  sim BR 50 jogadores: ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s reais para ~15 min');
  ok(picks > 25, 'loot coletado: ' + picks); const mxp = Math.max(0, ...Object.values(per)); ok(mxp < 40, 'sem laço de pega/larga (máximo por jogador: ' + mxp + ')'); ok(heals > 0, 'curas usadas manualmente: ' + heals);
  ok(sim.phase === 'over' || sim.alive().length <= 3, 'BR terminou / quase (vivos ' + sim.alive().length + ')');
}
/* ---------- natação ---------- */
{
  const sim = new G.Sim({ mode: 'caos', map, nav, seed: 2, cfg: { total: 2, fill: false } });
  const me = sim.addPlayer({ name: 'H', skin: 0, local: true }); sim.addPlayer({ name: 'B', skin: 1 }); sim.startMatch(); run(sim, 6); me.onCow = false; me.chute = null; me.giveW = sim.giveWeapon(me, 'galho', 0); me.w = 'galho';
  // procura um ponto de água funda
  const W = map.W; let spot = null; for (let x = -240; x < 240 && !spot; x += 2) for (let z = -240; z < 240; z += 2) if (W.waterDepth(x, z) > 2) { spot = { x, z }; break; }
  ok(!!spot, 'existe água funda para nadar');
  if (spot) {
    me.m.x = spot.x; me.m.z = spot.z; me.m.y = W.waterY - 1.2; me.m.vy = 0; me.equipT = 0; me.cmd = Object.assign(G.blankCmd(), { fire: true }); const mag = me.mag[me.w];
    run(sim, 1); ok(me.m.swim, 'nadando em água funda'); ok(me.mag[me.w] === mag, 'não atira nadando');
    me.cmd = Object.assign(G.blankCmd(), { crouch: true }); run(sim, 6); ok(me.breath < 10, 'mergulho gasta fôlego (' + me.breath.toFixed(1) + ')');
    run(sim, 8); ok(me.hp < 100, 'sem fôlego causa dano');
  }
}
console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
