// 5x5 competitivo completo só com bots: regras (até 13), habilidades, rádio, rotação, plantio/desarme e equilíbrio ataque x defesa
const G = require('./t_sim.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const MAP = process.env.MAP || 'arena', map = MAP === 'arena3' ? G.buildArena3(13) : MAP === 'arena2' ? G.buildArena2(11) : G.buildArena(7), nav = new G.NavGrid(map); console.log('mapa:', map.name);
const seeds = (process.env.SEEDS || '11,12,13,14,15,16').split(',').map(Number), tot = { atkWins: 0, defWins: 0, rounds: 0, plantsA: 0, plantsB: 0, defuses: 0, booms: 0, kills: 0, ab: {}, radio: 0, rot: 0, matches: 0, ot: 0, lurk: 0, flashed: 0 };
for (const seed of seeds) {
  const t0 = Date.now(), sim = new G.Sim({ mode: 'tatico', map, nav, seed, cfg: { format: 'comp', fill: true, perTeam: 5, botLevel: 'normal' } });
  sim.addPlayer({ name: 'Obs', local: true, bot: true, squad: 0 }); sim.startMatch();
  let n = 0; const farm = new Set();
  for (const p of sim.players) farm.add(p.squad + p.farmer);
  while (!sim.matchDone && n < 60 * 60 * 75) {
    sim.step(); n++;
    for (const e of sim.ev) {
      if (e.t === 'rend') { if (e.wt === G.T_ATK) tot.atkWins++; else if (e.wt === G.T_DEF) tot.defWins++; if (e.wt) tot.rounds++; }
      else if (e.t === 'kill') tot.kills++; else if (e.t === 'bomb' && e.k === 'plant') { if (e.site === 'A') tot.plantsA++; else tot.plantsB++; } else if (e.t === 'bomb' && e.k === 'defuse') tot.defuses++; else if (e.t === 'bomb' && e.k === 'boom') tot.booms++;
      else if (e.t === 'abu') tot.ab[e.k] = (tot.ab[e.k] | 0) + 1; else if (e.t === 'radio') { tot.radio++; if (/Rodando/.test(e.m)) tot.rot++; } else if (e.t === 'flash') tot.flashed += Object.keys(e.b || {}).length;
    }
    sim.ev.length = 0;
  }
  tot.matches++; if (sim.round > 25) tot.ot++;
  console.log(`  seed ${seed}: placar ${sim.score.join('x')} em ${sim.round - 1} rodadas, vencedor ${sim.winner} · ${((Date.now() - t0) / 1000).toFixed(0)} s reais · fazendeiros distintos por equipe: ${farm.size}`);
  ok(sim.matchDone, 'partida terminou (seed ' + seed + ')');
  ok(Math.max(...sim.score) >= 13 || sim.round > 25, 'vencedor chegou a 13 ou houve prorrogação');
  ok(farm.size === 10, 'nenhum fazendeiro repetido dentro da mesma equipe');
}
console.log('  resumo:', JSON.stringify(tot));
const R = tot.rounds, rate = tot.atkWins / Math.max(1, tot.atkWins + tot.defWins);
ok(R > 0 && tot.kills / R > 3, 'combate acontece (' + (tot.kills / R).toFixed(1) + ' abates por rodada)');
ok(tot.plantsA > 0 && tot.plantsB > 0, `plantios nos dois bombsites (A ${tot.plantsA} · B ${tot.plantsB})`);
ok(rate > .35 && rate < .65, 'equilíbrio ataque x defesa: ataque vence ' + (rate * 100).toFixed(0) + '% das rodadas');
const used = Object.keys(tot.ab); ok(used.length >= 8, 'bots usam habilidades de vários fazendeiros (' + used.length + ' tipos: ' + used.join(', ') + ')');
ok(tot.radio > 10, 'rádio da equipe ativo (' + tot.radio + ' mensagens, ' + tot.rot + ' rotações)');
console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
