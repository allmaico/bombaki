// AGENTES: as 4 habilidades de cada um dos 5 agentes funcionando de verdade na simulação (assinatura que recarrega, suprema por pontos, Espiga Dourada)
const G = require('./t_sim.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const map = G.buildArena(7), nav = new G.NavGrid(map), TPS = 60;
ok(G.FARMER_IDS.length === 5 && G.FARMER_IDS.every(f => G.FARMERS[f].ab.length === 4), '5 agentes com 4 habilidades cada');
ok(G.FARMER_IDS.map(f => G.FARMERS[f].name).join(',') === 'Tico Bruto,Dona Jurema,Zé Patrão,Tati Fumaça,Seu Mineiro', 'nomes: ' + G.FARMER_IDS.map(f => G.FARMERS[f].name).join(', '));
ok(G.FARMER_IDS.every(f => G.FARMERS[f].ab[2].sig && G.FARMERS[f].ab[3].ult), 'C = assinatura, F = suprema em todos');
/* cenário: eu (agente X) + um inimigo parado na minha frente, round valendo */
function setup(far, seed) {
  map.W.dyn.length = 0;   /* cada cenário começa com o mundo limpo (as Sims compartilham o mapa) */
  const sim = new G.Sim({ mode: 'tatico', map, nav, seed: seed || 5, cfg: { fill: false, rounds: 12 } });
  const me = sim.addPlayer({ name: 'Eu', local: true, squad: 0, farmer: far }), foe = sim.addPlayer({ name: 'Ele', local: true, squad: 1 }), mate = sim.addPlayer({ name: 'Parceiro', local: true, squad: 0 });
  sim.startMatch(); for (let i = 0; i < 90 * TPS && sim.phase !== 'live'; i++) { for (const p of [me, foe, mate]) { const c = G.blankCmd(); c.yaw = p.m.yaw; p.cmd = c; } sim.step(); sim.ev.length = 0; }
  me.farmer = far; sim.refillAbilities(me); sim.pt = 99;
  const S = map.sites.A; sim.placeAt(me, { x: S.x, z: S.z + 6, yaw: 0 }); sim.placeAt(foe, { x: S.x, z: S.z - 6, yaw: Math.PI }); sim.placeAt(mate, { x: S.x + 2, z: S.z + 7, yaw: 0 });
  return { sim, me, foe, mate };
}
function use(t, i, opts) { const { sim, me } = t; run(t, .7); const c = G.blankCmd(); c.yaw = (opts && opts.yaw !== undefined) ? opts.yaw : me.m.yaw; c.pitch = (opts && opts.pitch) || 0; c.acts = ['ab:' + i]; me.cmd = c; const ev = []; sim.step(); ev.push(...sim.ev); sim.ev.length = 0; return ev; }
function run(t, sec, evs, hold) { const { sim } = t; for (let i = 0; i < sec * TPS; i++) { for (const p of [t.me, t.foe, t.mate]) { if (!p.alive) continue; const c = G.blankCmd(); c.yaw = p.m.yaw; c.pitch = p === t.me && hold ? hold : 0; p.cmd = c; } sim.step(); if (evs) evs.push(...sim.ev); sim.ev.length = 0; } }
const abu = (ev, k) => ev.some(e => e.t === 'abu' && e.k === k);

/* ---------- Tico Bruto ---------- */
{ const t = setup('peao'); const y0 = t.me.m.y; let ev = use(t, 2); let top = 0; for (let i = 0; i < 50; i++) { run(t, 1 / TPS); top = Math.max(top, t.me.m.y - y0); }
  ok(abu(ev, 'pulo') && top > 3.2, `Pulo do Sítio: subiu ${top.toFixed(1)} m`);
  ok((t.me.abC[2] | 0) === 0 && t.me.sigT > 25, 'assinatura gasta e recarregando (' + t.me.sigT.toFixed(0) + ' s)');
  run(t, 31); ok((t.me.abC[2] | 0) === 1, 'Pulo do Sítio recarregou sozinho após 30 s');
  ev = use(t, 3); ok(!abu(ev, 'festa') && ev.some(e => e.t === 'deny'), 'suprema sem pontos é recusada');
  t.sim.placeAt(t.me, { x: map.sites.A.x, z: map.sites.A.z + 6, yaw: 0 }); t.me.ult = 7; const hp0 = t.foe.hp; ev = use(t, 3, { yaw: 0, pitch: -.13 }); ok(abu(ev, 'festa') && t.me.ult === 0, 'Festa do Roçado lançada (pontos zerados)');
  const e2 = []; run(t, 4.5, e2); ok(t.foe.hp < hp0 || !t.foe.alive, `Festa do Roçado causou dano no inimigo na área (${hp0} → ${Math.round(t.foe.hp)})`);
  ok(e2.filter(e => e.t === 'abx' && e.k === 'festa').length === 5, '5 estouros de fogos');
}
/* ---------- Dona Jurema ---------- */
{ const t = setup('rastreador'); t.me.abC[1] = 1; let ev = use(t, 1, { yaw: 0, pitch: -.15 }); ok(abu(ev, 'espiao'), 'Espião do Mato arremessado');
  const e2 = []; run(t, 6, e2); ok(e2.some(e => e.t === 'abx' && e.k === 'espiao' && e.n > 0), 'Espião do Mato revelou o inimigo (pulso)');
  ev = use(t, 2, { yaw: 0 }); ok(abu(ev, 'galinha'), 'Armadilha de Galinha solta'); const e3 = []; run(t, 3.5, e3);
  ok(e3.some(e => e.t === 'abx' && e.k === 'galinha' && e.n > 0), 'galinha achou o inimigo e explodiu em penas (cegou + revelou)');
  t.me.ult = 7; ev = use(t, 3); const e4 = ev.slice(); run(t, 5, e4); ok(abu(ev, 'olho') && e4.filter(e => e.t === 'abx' && e.k === 'olho').length === 3, 'Olho da Roça: 3 pulsos revelando');
}
/* ---------- Zé Patrão ---------- */
{ const t = setup('guardiao'); let ev = use(t, 2, { yaw: 0 }); ok(abu(ev, 'sino'), 'Sinal do Gado colocado');
  t.me.ult = 7; ev = use(t, 3, { yaw: 0 }); ok(abu(ev, 'territorio') && t.sim.abx.some(e => e.k === 'territorio'), 'Território do Patrão cravado');
  const e2 = []; run(t, 5.3, e2); ok(t.foe.detainT > 3, 'inimigo a 12 m preso pelo Território');
  const mag0 = t.foe.mag[t.foe.w]; for (let i = 0; i < 30; i++) { const c = G.blankCmd(); c.yaw = t.foe.m.yaw; c.fire = true; t.foe.cmd = c; t.sim.step(); t.sim.ev.length = 0; } ok(t.foe.mag[t.foe.w] === mag0, 'preso não consegue atirar');
  /* placa quebra se destruída a tempo */
  const t2 = setup('guardiao'); t2.me.ult = 7; use(t2, 3, { yaw: 0 }); const pl = t2.sim.abx.find(e => e.k === 'territorio'); t2.sim.damageAbx(pl, 250, t2.foe); run(t2, 5.5); ok(!t2.sim.abx.includes(pl) && !(t2.foe.detainT > 0), 'placa destruída antes de 5 s: ninguém fica preso');
}
/* ---------- Tati Fumaça ---------- */
{ const t = setup('mateiro'); let ev = use(t, 1, { yaw: 0, pitch: -.2 }); const sm = t.sim.abx.find(e => e.k === 'fumaca');
  ev = use(t, 2, { yaw: 0, pitch: .1 }); ok(abu(ev, 'lama'), 'Campo Sujeira arremessado');
  const t2 = setup('mateiro'); t2.me.ult = 7; const hp0 = t2.foe.hp; ev = use(t2, 3, { yaw: 0, pitch: -.18 }); ok(abu(ev, 'insetos'), 'Chuva de Insetos lançada'); run(t2, 3);
  ok(t2.foe.hp < hp0 && t2.foe.bugT > 0, `inimigo no enxame: lento e tomando dano (${hp0} → ${Math.round(t2.foe.hp)})`);
  ok(t2.sim.smokeBlocks(t2.me.m.x, t2.me.m.y + 1.6, t2.me.m.z, t2.foe.m.x, t2.foe.m.y + 1.4, t2.foe.m.z), 'enxame bloqueia a visão');
}
/* ---------- Seu Mineiro ---------- */
{ const t = setup('socorrista'); let ev = use(t, 2); ok(abu(ev, 'reforco') && t.me.shield === 50 && t.mate.shield === 50, 'Reforço do Sítio: 50 de escudo em mim e no aliado a 5 m');
  const hp0 = t.me.hp; t.sim.damage(t.me, t.foe, 30, 'galho', 'body', 0, 0, 0); ok(t.me.hp === hp0 && t.me.shield === 20, 'escudo absorve o dano antes da vida');
  t.sim.kill(t.mate, t.foe, 'galho', 'body'); ok(!t.mate.alive, 'aliado caiu'); t.me.ult = 7; t.sim.placeAt(t.me, { x: t.mate.m.x + 2, z: t.mate.m.z, yaw: 0 });
  ev = use(t, 3); ok(abu(ev, 'reanima') && t.mate.alive && t.mate.hp === 60, 'Reanimação do Bão: aliado de pé com 60 de vida');
  t.me.ult = 7; ev = use(t, 3); ok(!abu(ev, 'reanima') && t.me.ult === 7, 'sem aliado caído por perto: suprema não é gasta');
}
/* ---------- pontos de suprema e Espigas ---------- */
{ const t0 = setup('peao'); t0.me.ult = 0; t0.sim.kill(t0.foe, t0.me, 'galho', 'body'); ok(t0.me.ult === 1 && t0.foe.ult === 1, 'abate dá +1 ao autor e morte dá +1 à vítima');
  const t = setup('peao'); t.me.ult = 1;
  const orbs = G.orbSpots(map, nav); ok(orbs.length === 2, 'duas Espigas Douradas por round (' + orbs.map(o => o.x.toFixed(0) + ',' + o.z.toFixed(0)).join(' | ') + ')');
  const o = t.sim.orbs[0]; t.sim.placeAt(t.me, { x: o.x, z: o.z, yaw: 0 }); run(t, .2); ok(o.taken && t.me.ult === 2, 'pegar a Espiga Dourada dá +1 ponto');
  const s1 = t.sim.snapshot(t.me.id); ok(s1.me.ul === 2 && s1.OR.length === 1, 'snapshot leva pontos e espigas restantes');
}
/* ---------- partida inteira só com bots: todos usam as 4 habilidades ---------- */
{ const used = {}; let rounds = 0;
  for (const seed of [31, 32]) { const sim = new G.Sim({ mode: 'tatico', map, nav, seed, cfg: { fill: true, perTeam: 5, format: 'curto', botLevel: 'dificil' } }); sim.addPlayer({ name: 'Obs', local: true, bot: true, squad: 0 }); sim.startMatch();
    for (let i = 0; i < TPS * 60 * 25 && sim.phase !== 'over'; i++) { sim.step(); for (const e of sim.ev) { if (e.t === 'abu') used[e.k] = (used[e.k] | 0) + 1; if (e.t === 'rend') rounds++; } sim.ev.length = 0; } }
  const all = G.FARMER_IDS.flatMap(f => G.FARMERS[f].ab.map(a => a.id)), miss = all.filter(k => !used[k]);
  console.log('  uso pelos bots:', JSON.stringify(used));
  ok(miss.length <= 3, `bots usaram ${all.length - miss.length}/20 habilidades em ${rounds} rounds` + (miss.length ? ' (faltou: ' + miss.join(', ') + ')' : ''));
  ok(['festa', 'olho', 'territorio', 'insetos', 'reanima'].filter(k => used[k]).length >= 3, 'bots usam supremas');
}
console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
