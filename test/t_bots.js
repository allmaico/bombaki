const G = require('./t_sim.js');
const map = G.buildFazenda(1); const nav = new G.NavGrid(map);
const reasons = {}; let totalRounds = 0, plants = 0, defuses = 0, booms = 0, kills = 0, hs = 0, shots = 0, hitsE = 0, nadeThrown = 0, nadeKills = 0, pickups = 0, drops = 0;
const durations = [];
for (let seed = 1; seed <= 8; seed++) {
  const sim = new G.Sim({ mode: 'tatico', map, nav, seed, cfg: { botLevel: ["facil","normal","dificil","insano"][(seed - 1) % 4], perTeam: 5, rounds: 5 } });
  sim.startMatch(); let rs = 0, t0 = 0;
  for (let i = 0; i < 60 * 1500 && sim.phase !== 'over'; i++) {
    sim.step();
    for (const e of sim.ev) {
      if (e.t === 'rend') { reasons[e.why] = (reasons[e.why] || 0) + 1; totalRounds++; durations.push(sim.t - t0); }
      if (e.t === 'round') t0 = sim.t;
      if (e.t === 'bomb') { if (e.k === 'plant') plants++; if (e.k === 'defuse') defuses++; if (e.k === 'boom') booms++; if (e.k === 'pick') pickups++; if (e.k === 'drop') drops++; }
      if (e.t === 'kill') { kills++; if (e.hs) hs++; if (e.w === 'batata') nadeKills++; }
      if (e.t === 'shot') shots++; if (e.t === 'hit') hitsE++; if (e.t === 'nade') nadeThrown++;
    }
    sim.ev.length = 0;
  }
  console.log('seed', seed, G.Sim ? sim.cfg.botLevel : '', 'placar', sim.score, 'fase', sim.phase, 'rodadas', sim.round, 't=', sim.t.toFixed(0));
}
console.log('motivos', reasons, 'rodadas', totalRounds, 'plantas', plants, 'desarmes', defuses, 'explosões', booms, 'pick', pickups, 'drop', drops);
console.log('kills', kills, 'hs', hs, 'tiros', shots, 'danos', hitsE, 'batatas', nadeThrown, 'kills batata', nadeKills, 'duração média rodada', (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0), 's');
