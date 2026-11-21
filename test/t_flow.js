// Fluxo competitivo 5x5: SELEÇÃO → CARREGAMENTO → COMPRA 45 s → ROUND → RESULTADO → COMPRA 30 s → ... (lógica real, sem interface)
const G = require('./t_sim.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const map = G.buildVila(+(process.env.MSEED || 21)), nav = new G.NavGrid(map); console.log('mapa:', map.name);
const TPS = 60, secs = n => n / TPS;
const mk = (seed, extra) => new G.Sim({ mode: 'tatico', map, nav, seed, cfg: Object.assign({ select: true, format: 'curto', fill: true, perTeam: 5, botLevel: 'normal' }, extra || {}) });
/* roda até a condição (ou limite de ticks); devolve ticks */
function run(sim, cond, max, onEv) { let n = 0; while (!cond() && n < max) { sim.step(); n++; if (onEv) for (const e of sim.ev) onEv(e, n); sim.ev.length = 0; } return n; }
const barOn = W => W.dyn.some(o => o.barrier);
const bar = G.computeBarrier(map, nav);
ok(bar && bar.cells.length > 0 && bar.gates.length > 0, `barreiras calculadas: ${bar.cells.length} blocos em ${bar.gates.length} saídas do spawn de ataque`);

/* ---------- 1/3/4: 10 bots — todos escolhem antes dos 60 s e a seleção termina na hora ---------- */
{
  const sim = mk(21); sim.addPlayer({ name: 'Obs', local: true, bot: true, squad: 0 }); sim.startMatch();
  ok(sim.phase === 'select' && sim.flowState() === 'AGENT_SELECTION', 'partida começa em AGENT_SELECTION');
  ok(sim.players.length === 10 && sim.players.every(p => !p.farmer), '10 participantes, ninguém com agente no início');
  const n = run(sim, () => sim.phase !== 'select', 81 * TPS);
  ok(secs(n) < 15, `bots escolhem e a seleção encerra sozinha em ${secs(n).toFixed(1)} s (antes dos 80 s)`);
  for (const sq of [0, 1]) { const f = sim.players.filter(p => p.squad === sq).map(p => p.farmer); ok(new Set(f).size === 5 && f.every(Boolean), `equipe ${sq}: 5 agentes diferentes (${f.join(', ')})`); }
  ok(sim.phase === 'loading' && sim.flowState() === 'MAP_LOADING', 'depois da seleção vem MAP_LOADING');
}
/* ---------- 2/5/6: jogador real que não escolhe + cliente remoto que demora a carregar ---------- */
{
  const sim = mk(22); const me = sim.addPlayer({ name: 'Eu', local: true, squad: 0 }); const rem = sim.addPlayer({ name: 'Remoto', squad: 1 }); rem.q = rem.q || [];
  sim.startMatch(); ok(sim.players.filter(p => !p.bot).length === 2 && sim.players.length === 10, 'partida mista: 2 humanos + 8 bots');
  /* o remoto escolhe pela rede (fila de comandos) */
  const cmd = G.blankCmd(); cmd.acts = ['far:mateiro']; cmd.seq = 1; rem.q.push(cmd);
  /* um bot do mesmo time já pode ter pego o mateiro: ele cede a vaga */
  run(sim, () => false, 20 * TPS);
  ok(rem.farmer === 'mateiro', 'jogador remoto escolhe Mateiro pela rede (bot cede se já tinha)');
  ok(sim.phase === 'select' && !me.farmer, 'seleção continua aberta enquanto um humano não escolheu');
  const n = run(sim, () => sim.phase !== 'select', 81 * TPS);
  ok(sim.phase === 'loading' && !!me.farmer, `tempo esgotado: humano recebe agente automático (${me.farmer}) e a partida segue`);
  ok(Math.abs(20 + secs(n) - 80) < .2, `seleção durou ${(20 + secs(n)).toFixed(2)} s (80 s)`);
  const sq = sim.players.filter(p => p.squad === 1).map(p => p.farmer); ok(new Set(sq).size === 5, 'sem agente repetido depois da escolha automática');
  /* carregamento: o remoto ainda não está pronto → espera */
  run(sim, () => false, 6 * TPS); ok(sim.phase === 'loading', 'mapa demorando: partida espera o cliente remoto (6 s depois ainda carregando)');
  const c2 = G.blankCmd(); c2.acts = ['rdy']; c2.seq = 2; rem.q.push(c2);
  run(sim, () => sim.phase !== 'loading', 2 * TPS); ok(sim.phase === 'prep' && sim.flowState() === 'INITIAL_BUY_PHASE', 'cliente avisa que carregou → INITIAL_BUY_PHASE');
  /* limite: cliente que nunca carrega não trava a partida */
  const s2 = mk(23); const r2 = s2.addPlayer({ name: 'Lento', squad: 1 }); s2.startMatch(); run(s2, () => s2.phase === 'loading', 81 * TPS);
  const nl = run(s2, () => s2.phase !== 'loading', 40 * TPS); ok(s2.phase === 'prep' && Math.abs(secs(nl) - G.FLOW_T.loadMax) < .2, `cliente que nunca carrega: partida segue após ${secs(nl).toFixed(1)} s (limite ${G.FLOW_T.loadMax} s)`);
}
/* ---------- 7..15: ciclo completo só com bots ---------- */
{
  const sim = mk(24); sim.addPlayer({ name: 'Obs', local: true, bot: true, squad: 0 }); sim.startMatch();
  run(sim, () => sim.phase === 'prep', 90 * TPS);
  ok(sim.round === 1 && barOn(sim.W), 'compra inicial: barreiras ATIVAS com colisão real');
  /* 8: barreira segura o ataque e não segura a defesa */
  const atk = sim.players.filter(p => p.team === G.T_ATK), def = sim.players.filter(p => p.team === G.T_DEF);
  const pos0 = def.map(p => [p.m.x, p.m.z]); let atkOut = 0; const inReg = p => { const k = nav.idx(p.m.x, p.m.z); return k < 0 || bar.dist[k] < 0 || bar.dist[k] <= bar.D + 1; };
  const dist0 = p => { const k = nav.idx(p.m.x, p.m.z); return k; };
  /* um atacante tenta correr direto para cada saída */
  const runner = atk[0]; runner.bot = false; runner.ai = null;
  let escaped = false;
  for (const g of bar.gates) {
    const s = map.spawns.atk[0]; runner.m.x = s.x; runner.m.z = s.z; runner.m.y = map.W.heightAt(s.x, s.z) + .1;
    for (let t = 0; t < 7 * TPS; t++) {
      const c = G.blankCmd(); c.mvf = 1; c.sprint = true; c.jump = (t % 40) < 2; c.yaw = Math.atan2(-(g.x + g.nx * 30 - runner.m.x), -(g.z + g.nz * 30 - runner.m.z)); runner.cmd = c; runner.local = true; sim.step(); sim.ev.length = 0;
      const k = nav.idx(runner.m.x, runner.m.z); if (k >= 0 && bar && (() => { const q = new Set(bar.cells.map(c => c.k)); return false; })()) { }
      /* passou da porta = ficou do lado de fora, além da barreira (normal da saída) */
      const out = (runner.m.x - g.x) * g.nx + (runner.m.z - g.z) * g.nz; if (out > 1.5 && Math.hypot(runner.m.x - g.x, runner.m.z - g.z) < 12) escaped = true;
    }
  }
  /* varredura: 24 direções a partir de vários pontos do spawn */
  let sweepOut = 0; const sp = map.spawns.atk, starts = [sp[0], sp[4] || sp[0], sp[5] || sp[0], sp[9] || sp[0]];
  for (const s of starts) for (let a = 0; a < 24; a++) {
    sim.pt = Math.max(sim.pt, 50); runner.m.x = s.x; runner.m.z = s.z; runner.m.y = map.W.heightAt(s.x, s.z) + .1; runner.m.vx = runner.m.vz = 0; const yaw = a / 24 * Math.PI * 2;
    for (let t = 0; t < 6 * TPS; t++) { const c = G.blankCmd(); c.mvf = 1; c.sprint = true; c.jump = (t % 35) < 2; c.mvr = Math.sin(t / 50) * .6; c.yaw = yaw; runner.cmd = c; sim.step(); sim.ev.length = 0; }
    const k = nav.idx(runner.m.x, runner.m.z); if (k >= 0 && bar.dist[k] > bar.D + 1) sweepOut++;
  }
  ok(sweepOut === 0, `varredura em 24 direções × ${starts.length} pontos do spawn: ninguém escapa (${sweepOut} fugas)`);
  runner.local = false; runner.bot = true; runner.ai = new G.BotBrain(runner, 'normal'); runner.ai.reset(sim, runner);
  ok(!escaped, 'atacante correndo e pulando em todas as ' + bar.gates.length + ' saídas não atravessa a barreira');
  ok(sim.phase === 'prep', 'ainda na compra durante o teste das barreiras');
  /* defensores andam livres até os dois bombsites (caminho existe com as barreiras ligadas) */
  const dp = def[0], reach = id => { const S = map.sites[id]; const path = nav.findPath(dp.m.x, dp.m.z, S.x, S.z); return !!path; };
  ok(reach('A') && reach('B'), 'defesa tem caminho livre para o A e o B durante a compra');
  /* defesa realmente se move na compra; ninguém leva dano */
  const hp0 = sim.players.map(p => p.hp);
  let liveAt = -1, buyLen = -1, buyStart = 0, dmgPrep = 0, barOffSame = null;
  run(sim, () => sim.phase === 'live', 80 * TPS, (e, n) => { if (sim.phase === 'prep') for (const p of atk) if (!inReg(p)) atkOut++; if (e.t === 'hit') dmgPrep++; if (e.t === 'live') { liveAt = n; barOffSame = barOn(sim.W); } });
  const moved = def.filter((p, i) => Math.hypot(p.m.x - pos0[i][0], p.m.z - pos0[i][1]) > 4).length;
  ok(moved >= 3, `defensores se posicionam durante a compra (${moved}/5 andaram)`);
  ok(dmgPrep === 0 && sim.players.every((p, i) => p.hp === hp0[i]), 'nenhum dano durante a compra');
  ok(barOffSame === false, 'barreiras somem no mesmo tick do início do round (para os dois times)');
  ok(atkOut === 0, 'bots atacantes ficaram dentro do spawn durante toda a compra (checado a cada tick)');
  /* duração exata da compra inicial */
  const s3 = mk(25); s3.addPlayer({ name: 'Obs', local: true, bot: true, squad: 0 }); s3.startMatch(); run(s3, () => s3.phase === 'prep', 90 * TPS);
  const nb = run(s3, () => s3.phase === 'live', 90 * TPS); ok(Math.abs(secs(nb) - 45) < .05, `compra inicial durou ${secs(nb).toFixed(2)} s (45 s)`);
  ok(s3.flowState() === 'ROUND_ACTIVE' && !barOn(s3.W), 'ROUND_ACTIVE sem barreiras');
  /* 10/11/12: combate, fim do round, créditos */
  const money0 = s3.players.map(p => p.money); let kills = 0, rend = null;
  run(s3, () => s3.phase === 'post', 130 * TPS, e => { if (e.t === 'kill') kills++; if (e.t === 'rend') rend = e; });
  ok(kills > 0, `combate aconteceu no round 1 (${kills} abates)`);
  ok(s3.phase === 'post' && s3.flowState() === 'ROUND_RESULT' && rend, 'round terminou → ROUND_RESULT (' + (rend && rend.why || '?') + ')');
  run(s3, () => s3.phase === 'prep', 20 * TPS);
  ok(s3.round === 2 && s3.flowState() === 'ROUND_BUY_PHASE', 'próximo round abre ROUND_BUY_PHASE');
  ok(s3.players.some((p, i) => p.money !== money0[i]), 'créditos atualizados após o round');
  ok(barOn(s3.W), 'barreiras reativadas na compra do round 2');
  const n2 = run(s3, () => s3.phase === 'live', 60 * TPS); ok(Math.abs(secs(n2) - 30) < .05, `compra do round 2 durou ${secs(n2).toFixed(2)} s (30 s)`);
  /* 15: ciclo até o fim */
  let buys = 0, bad = 0, lastPh = s3.phase;
  run(s3, () => s3.matchDone && s3.phase === 'over', 60 * 60 * 40, e => { if (e.t === 'flow' && e.s === 'buy') { buys++; if (Math.abs(e.pt - (e.first ? 45 : 30)) > .01) bad++; } });
  ok(s3.phase === 'over' && s3.flowState() === 'MATCH_FINISHED', `partida chegou a MATCH_FINISHED (placar ${s3.score.join('x')}, ${s3.round} rounds)`);
  ok(buys >= 2 && bad === 0, `compras seguintes: 30 s (45 s no início da 2ª metade) — ${buys} compras`);
  ok(!barOn(s3.W), 'sem barreiras no fim da partida');
  ok((s3.flowErr | 0) === 0, 'nenhuma transição de estado inválida');
  /* transição inválida é recusada */
  const s4 = mk(26); s4.addPlayer({ name: 'Obs', local: true, bot: true, squad: 0 }); s4.startMatch(); ok(s4.setPhase('live') === false && s4.phase === 'select', 'transição inválida (seleção → round) é recusada');
}
console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
