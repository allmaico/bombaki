const G = require('./t_sim.js');
const map = G.buildFazenda(1); const nav = new G.NavGrid(map);
const sim = new G.Sim({ mode: 'tatico', map, nav, seed: 3, cfg: { botLevel: 'normal', perTeam: 5, rounds: 5 } });
sim.startMatch();
for (let i = 0; i < 60 * 140 && sim.phase !== 'over'; i++) {
  sim.step();
  if (i % 300 === 0 || sim.ev.some(e => e.t === 'bomb' || e.t === 'rend' || e.t === 'kill')) {
    const c = sim.players.find(p => p.hasBomb), b = sim.bomb;
    const ev = sim.ev.filter(e => e.t === 'bomb' || e.t === 'rend' || e.t === 'kill').map(e => e.t + (e.k ? ':' + e.k : '') + (e.v ? ':' + e.v : '')).join(',');
    console.log('t=' + sim.t.toFixed(1), sim.phase, 'bomb', b.st, c ? `carrier ${c.name} @(${c.m.x.toFixed(0)},${c.m.z.toFixed(0)}) role=${c.ai.role} site=${c.ai.site} hold=${c.ai.hold ? c.ai.hold.x.toFixed(0) + ',' + c.ai.hold.z.toFixed(0) : '-'} pathLen=${c.ai.path ? c.ai.path.length : 0} noPath=${c.ai.noPath} stuck=${c.ai.stuckT.toFixed(1)} useK=${c.useK} hp=${c.hp | 0}` : '-', 'alive A/D', sim.players.filter(p => p.alive && p.team === 1).length, sim.players.filter(p => p.alive && p.team === 2).length, ev);
  }
  sim.ev.length = 0;
}
