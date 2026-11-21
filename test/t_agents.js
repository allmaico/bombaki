// AGENTES: as 4 habilidades de cada um dos 5 agentes funcionando de verdade na simulação (assinatura que recarrega, suprema por pontos, Espiga Dourada)
const G = require('./t_sim.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const map = G.buildVila(21), nav = new G.NavGrid(map), TPS = 60;
ok(G.FARMER_IDS.length === 5 && G.FARMER_IDS.every(f => G.FARMERS[f].ab.length === 4), '5 agentes com 4 habilidades cada');
ok(G.FARMER_IDS.map(f => G.FARMERS[f].name).join(',') === 'Zeca Rojão,Bia Gavião,Dona Zefa,Seu Brasa,Lua Raizeira', 'nomes: ' + G.FARMER_IDS.map(f => G.FARMERS[f].name).join(', '));
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

/* ---------- Zeca Rojão (Duelista) ---------- */
{ const t = setup('peao'); const y0 = t.me.m.y; let ev = use(t, 1); let top = 0; for (let i = 0; i < 50; i++) { run(t, 1 / TPS); top = Math.max(top, t.me.m.y - y0); }
  ok(abu(ev, 'pulo') && top > 3.2, `Pulo de Rodeio: subiu ${top.toFixed(1)} m`);
  run(t, 1.5); const x0 = t.me.m.x, z0 = t.me.m.z; ev = use(t, 0, { yaw: Math.PI / 2, pitch: -.05 }); run(t, .9);
  const dl = Math.hypot(t.me.m.x - x0, t.me.m.z - z0); ok(abu(ev, 'laco') && dl > 4, `Laço: puxado ${dl.toFixed(1)} m`);
  const t2 = setup('peao'); ev = use(t2, 2, { yaw: 0 }); ok(abu(ev, 'investida') && (t2.me.abC[2] | 0) === 0 && t2.me.sigT > 20, 'Arrancada de Touro gasta e recarregando (' + t2.me.sigT.toFixed(0) + ' s)');
  t2.sim.damage(t2.foe, t2.me, 500, 'galho', 'head', 0, 0, 0, { raw: true }); ok(!t2.foe.alive && (t2.me.abC[2] | 0) === 1, 'abate recarrega a Arrancada na hora');
  ev = use(t2, 3); ok(!abu(ev, 'rodeio') && ev.some(e => e.t === 'deny'), 'suprema sem pontos é recusada');
  const t3 = setup('peao'); t3.me.ult = 7; ev = use(t3, 3); ok(abu(ev, 'rodeio') && t3.me.rodeoT > 7 && t3.me.ult === 0, 'Rodeio Final ativo (' + t3.me.rodeoT.toFixed(1) + ' s)');
  const w = G.WEAPONS.galho, t2r = t3; t2r.me.w = 'galho'; t2r.me.m.hspd = 4.4; t2r.me.m.gnd = true; t2r.me.bloom = 0; const sOn = G.calcSpread(t2r.me, w); t2r.me.rodeoT = 0; const sOff = G.calcSpread(t2r.me, w);
  ok(sOn < sOff * .6, `Rodeio: tiro andando ${sOn.toFixed(2)}° (sem: ${sOff.toFixed(2)}°)`);
}
/* ---------- Bia Gavião (Iniciadora) ---------- */
{ const t = setup('rastreador'); t.me.abC[1] = 1; let ev = use(t, 1, { yaw: 0, pitch: -.15 }); ok(abu(ev, 'espiao'), 'Pena Marcadora arremessada');
  const e2 = []; run(t, 6, e2); ok(e2.some(e => e.t === 'abx' && e.k === 'espiao' && e.n > 0), 'Pena Marcadora revelou o inimigo (pulso)');
  ev = use(t, 2, { yaw: 0 }); ok(abu(ev, 'gaviao') && ev.some(e => e.t === 'ab' && e.k === 'gaviao' && e.n > 0), 'Gavião revelou o inimigo à frente');
  ev = use(t, 0, { yaw: 0, pitch: .1 }); ok(abu(ev, 'rojao'), 'Rojão de São João arremessado');
  t.me.ult = 7; ev = use(t, 3); const e4 = ev.slice(); run(t, 5, e4); ok(abu(ev, 'olho') && e4.filter(e => e.t === 'abx' && e.k === 'olho').length === 3, 'Revoada: 3 pulsos revelando');
}
/* ---------- Dona Zefa (Sentinela) ---------- */
{ const t = setup('guardiao'); let ev = use(t, 1, { yaw: 0 }); ok(abu(ev, 'sino'), 'Sino da Porteira colocado');
  ev = use(t, 2, { yaw: 0 }); ok(abu(ev, 'cerca') && t.sim.abx.some(e => e.k === 'cerca'), 'Cerca de Madeira levantada');
  const t1 = setup('guardiao'); t1.me.ult = 7; ev = use(t1, 3, { yaw: 0 }); ok(abu(ev, 'territorio') && t1.sim.abx.some(e => e.k === 'territorio'), 'Porteira Trancada cravada');
  const e2 = []; run(t1, 5.3, e2); ok(t1.foe.detainT > 3, 'inimigo a 12 m preso pela Porteira');
  const mag0 = t1.foe.mag[t1.foe.w]; for (let i = 0; i < 30; i++) { const c = G.blankCmd(); c.yaw = t1.foe.m.yaw; c.fire = true; t1.foe.cmd = c; t1.sim.step(); t1.sim.ev.length = 0; } ok(t1.foe.mag[t1.foe.w] === mag0, 'preso não consegue atirar');
  const t2 = setup('guardiao'); t2.me.ult = 7; use(t2, 3, { yaw: 0 }); const pl = t2.sim.abx.find(e => e.k === 'territorio'); t2.sim.damageAbx(pl, 250, t2.foe); run(t2, 5.5); ok(!t2.sim.abx.includes(pl) && !(t2.foe.detainT > 0), 'placa destruída antes de 5 s: ninguém fica preso');
}
/* ---------- Seu Brasa (Controlador) ---------- */
{ const t = setup('mateiro'); let ev = use(t, 0, { yaw: 0, pitch: .1 }); ok(abu(ev, 'lama'), 'Cinza Quente arremessada');
  ev = use(t, 2, { yaw: 0, pitch: -.2 }); run(t, 2.5); ok(abu(ev, 'fumaca') && t.sim.abx.some(e => e.k === 'fumaca'), 'Carvão em Brasa: fumaça no chão');
  ok((t.me.abC[2] | 0) === 1, 'Carvão em Brasa tem 2 cargas (sobrou 1)');
  const t2 = setup('mateiro'); t2.me.ult = 7; ev = use(t2, 3, { yaw: 0 }); const wall = t2.sim.abx.filter(e => e.k === 'fumaca' && e.wall);
  ok(abu(ev, 'queimada') && wall.length >= 3, `Queimada: muro de ${wall.length} nuvens`); run(t2, 1.5);
  ok(t2.sim.smokeBlocks(t2.me.m.x - 3, t2.me.m.y + 1.6, t2.me.m.z - 2, t2.me.m.x + 3, t2.me.m.y + 1.6, t2.me.m.z - 6), 'Queimada bloqueia a visão de um lado para o outro');
}
/* ---------- Lua Raizeira (Suporte) ---------- */
{ const t = setup('socorrista'); let ev = use(t, 1, { yaw: 0 }); const cac = t.sim.abx.find(e => e.k === 'mandacaru');
  ok(abu(ev, 'mandacaru') && cac && cac.box, 'Muda de Mandacaru plantada (parede sólida)');
  t.sim.placeAt(t.foe, { x: cac.x, z: cac.z - .7, yaw: 0 }); const hp0 = t.foe.hp; run(t, 1.2); ok(t.foe.hp < hp0 && t.foe.slowT > 0, `encostar no mandacaru espeta (${hp0} → ${Math.round(t.foe.hp)}) e deixa lento`);
  const t2 = setup('socorrista'); t2.sim.placeAt(t2.mate, { x: t2.me.m.x, z: t2.me.m.z - 10, yaw: 0 }); t2.mate.hp = 40; ev = use(t2, 2, { yaw: 0 }); run(t2, 3.4);
  ok(abu(ev, 'garrafada') && t2.mate.hp >= 85, `Benzedura curou o aliado a 10 m (40 → ${Math.round(t2.mate.hp)})`);
  t.sim.kill(t.mate, t.foe, 'galho', 'body'); ok(!t.mate.alive, 'aliado caiu'); t.me.ult = 7; t.sim.placeAt(t.me, { x: t.mate.m.x + 2, z: t.mate.m.z, yaw: 0 });
  ev = use(t, 3); ok(abu(ev, 'reanima') && t.mate.alive && t.mate.hp === 60, 'Simpatia: aliado de pé com 60 de vida');
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
  ok(['rodeio', 'olho', 'territorio', 'queimada', 'reanima'].filter(k => used[k]).length >= 3, 'bots usam supremas');
}
console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
