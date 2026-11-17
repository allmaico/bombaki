const G = require('./t_sim.js');
const map = G.buildFazenda(1);
const sim = new G.Sim({ mode: 'tatico', map, nav: { walkable() { return true; } }, seed: 5, cfg: { fill: false } });
const a = sim.addPlayer({ name: 'A', local: true, squad: 0 }), b = sim.addPlayer({ name: 'B', local: true, squad: 1 });
sim.startMatch(); for (let i = 0; i < 60 * 90 && sim.phase !== 'live'; i++) sim.step();
// posiciona em campo aberto
const S = { x: -20, z: 0 };
sim.placeAt(a, { x: S.x, z: S.z, yaw: -Math.PI / 2 }); sim.placeAt(b, { x: S.x + 20, z: S.z, yaw: Math.PI / 2 });
for (let i = 0; i < 30; i++) sim.step();
const res = {};
for (const [name, ty] of [['cabeça', 1.62], ['peito', 1.2], ['perna', 0.5], ['pé', 0.1]]) {
  b.hp = 100; b.armor = 0; b.alive = true; sim.ev.length = 0;
  const ey = a.m.y + 1.62; const dx = b.m.x - a.m.x, dy = (b.m.y + ty) - ey, hd = Math.hypot(dx, 0);
  a.m.yaw = Math.atan2(-dx, 0); a.m.pitch = Math.atan2(dy, hd); a.cmd.yaw = a.m.yaw; a.cmd.pitch = a.m.pitch; a.cdT = 0; a.equipT = 0; a.bloom = 0;
  a.cmd.fire = false; sim.step(); a.cmd.fire = true; sim.step(); a.cmd.fire = false; sim.step();
  const h = sim.ev.find(e => e.t === 'hit'); res[name] = h ? h.z + ':' + h.d : 'miss';
}
console.log('zonas:', res);
