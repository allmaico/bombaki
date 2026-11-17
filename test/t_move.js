const { load } = require('./load');
const B = load(['00_util.js','01_data.js','02_world.js','03_move.js'], ['World','PH','newMoveState','stepPlayer','DT','clamp']);
const { World, PH, newMoveState, stepPlayer, DT } = B;
function mk() {
  const W = new World({ x0: -50, x1: 50, z0: -50, z1: 50 });
  W.setTerrain((x, z) => 0, 1);
  return W;
}
function run(p, c, m, W, secs) { const n = Math.round(secs / DT); for (let i = 0; i < n; i++) stepPlayer(p, c, m, W, DT); }
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'OK   ' : 'FAIL ') + name + (info ? ' — ' + info : '')); if (!cond) fails++; };

// 1. caminhar em terreno plano
{ const W = mk().finalize(); const p = newMoveState(0, 0, 0); p.gnd = true;
  run(p, { mvf: 1, mvr: 0, yaw: 0, pitch: 0, jump: false, crouch: false, sprint: false }, {}, W, 1.0);
  ok('andar ~4.4m/s', Math.abs(-p.z - 4.4) < 0.7 && Math.abs(p.hspd - PH.WALK) < 0.2, 'z=' + p.z.toFixed(2) + ' v=' + p.hspd.toFixed(2));
  run(p, { mvf: 1, mvr: 0, yaw: 0, pitch: 0, jump: false, crouch: false, sprint: true }, {}, W, 1.0);
  ok('correr ~7m/s', Math.abs(p.hspd - PH.RUN) < 0.2, 'v=' + p.hspd.toFixed(2)); }
// 2. parede bloqueia
{ const W = mk(); W.addBox(-5, 0, -10, 5, 3, -9, 'wood'); W.finalize(); const p = newMoveState(0, 0, 0); p.gnd = true;
  run(p, { mvf: 1, mvr: 0, yaw: 0, pitch: 0, jump: false, crouch: false, sprint: true }, {}, W, 3);
  ok('parede bloqueia', p.z > -9 + PH.R - 0.02 && p.z < -8.5, 'z=' + p.z.toFixed(3)); }
// 3. escada (degraus de 0.22)
{ const W = mk(); for (let k = 1; k <= 8; k++) W.addBox(-1, 0, -4 - k * 0.7, 1, k * 0.22, -4 - (k - 1) * 0.7, 'wood'); W.addBox(-1, 0, -4 - 8 * 0.7 - 3, 1, 8 * 0.22, -4 - 8 * 0.7, 'wood'); W.finalize();
  const p = newMoveState(0, 0, 0); p.gnd = true;
  run(p, { mvf: 1, mvr: 0, yaw: 0, pitch: 0, jump: false, crouch: false, sprint: false }, {}, W, 2.6);
  ok('sobe escada', p.y > 1.7 && p.gnd, 'y=' + p.y.toFixed(2) + ' z=' + p.z.toFixed(2));
  run(p, { mvf: 1, mvr: 0, yaw: Math.PI, pitch: 0, jump: false, crouch: false, sprint: false }, {}, W, 4);
  ok('desce escada', p.y < 0.05, 'y=' + p.y.toFixed(2) + ' z=' + p.z.toFixed(2)); }
// 4. pulo
{ const W = mk().finalize(); const p = newMoveState(0, 0, 0); p.gnd = true; let maxY = 0;
  const c = { mvf: 0, mvr: 0, yaw: 0, pitch: 0, jump: true, crouch: false, sprint: false };
  for (let i = 0; i < 90; i++) { stepPlayer(p, c, {}, W, DT); if (p.y > maxY) maxY = p.y; if (i === 30) c.jump = true; }
  ok('altura do pulo ~1.1m', maxY > 1.0 && maxY < 1.3, 'max=' + maxY.toFixed(2));
  const q = newMoveState(0, 0, 0); q.gnd = true; let m2 = 0; const c2 = { mvf: 0, mvr: 0, yaw: 0, pitch: 0, jump: true, crouch: false, sprint: false };
  for (let i = 0; i < 90; i++) { if (i > 5) c2.jump = false; stepPlayer(q, c2, {}, W, DT); if (q.y > m2) m2 = q.y; }
  ok('pulo variável (toque curto)', m2 < maxY * 0.75, 'max=' + m2.toFixed(2)); }
// 5. mantle em caixa 1.2m
{ const W = mk(); W.addBox(-2, 0, -12, 2, 1.2, -5, 'wood'); W.finalize(); const p = newMoveState(0, 0, 0); p.gnd = true;
  const c = { mvf: 1, mvr: 0, yaw: 0, pitch: 0, jump: false, crouch: false, sprint: false };
  run(p, c, {}, W, 1.2); c.jump = true; run(p, c, {}, W, 1.5);
  ok('mantle sobe em caixa de 1.2m', p.y > 1.15 && p.z < -5, 'y=' + p.y.toFixed(2) + ' z=' + p.z.toFixed(2)); }
// 6. vault em cerca fina de 1.25m
{ const W = mk(); W.addBox(-10, 0, -6.06, 10, 1.25, -5.94, 'wood', true); W.finalize(); const p = newMoveState(0, 0, 0); p.gnd = true;
  const c = { mvf: 1, mvr: 0, yaw: 0, pitch: 0, jump: false, crouch: false, sprint: false };
  run(p, c, {}, W, 1.0); c.jump = true; run(p, c, {}, W, 1.6);
  ok('vault sobre cerca', p.z < -6.4 && p.y < 0.1, 'y=' + p.y.toFixed(2) + ' z=' + p.z.toFixed(2)); }
// 7. deslize
{ const W = mk().finalize(); const p = newMoveState(0, 0, 0); p.gnd = true;
  const c = { mvf: 1, mvr: 0, yaw: 0, pitch: 0, jump: false, crouch: false, sprint: true };
  run(p, c, {}, W, 1.0); c.crouch = true; let maxV = 0; for (let i = 0; i < 40; i++) { stepPlayer(p, c, {}, W, DT); maxV = Math.max(maxV, p.hspd); }
  ok('deslize acelera e baixa', maxV > 8.5 && p.cr > 0.9, 'v=' + maxV.toFixed(2) + ' cr=' + p.cr.toFixed(2)); }
// 8. terreno inclinado + cilindro
{ const W = mk(); W.setTerrain((x, z) => Math.max(0, -z * 0.2), 1); W.addCyl(3, -5, 0.5, 0, 6, 'wood'); W.finalize();
  const p = newMoveState(0, 0, 0); p.gnd = true; run(p, { mvf: 1, mvr: 0, yaw: 0, pitch: 0, jump: false, crouch: false, sprint: false }, {}, W, 3);
  ok('sobe ladeira', Math.abs(p.y - W.heightAt(p.x, p.z)) < 0.05 && p.y > 1, 'y=' + p.y.toFixed(2));
  const q = newMoveState(3, 0, 0); q.gnd = true; run(q, { mvf: 1, mvr: 0, yaw: 0, pitch: 0, jump: false, crouch: false, sprint: true }, {}, W, 3);
  ok('cilindro bloqueia', Math.hypot(q.x - 3, q.z + 5) >= 0.88, 'd=' + Math.hypot(q.x - 3, q.z + 5).toFixed(2)); }
// 9. raycast
{ const W = mk(); W.addBox(-1, 0, -10, 1, 3, -9, 'metal'); W.addCyl(5, -5, 1, 0, 4, 'wood'); W.finalize();
  const r = W.raycast(0, 1.6, 0, 0, 0, -1, 100, true); ok('raycast caixa', r && Math.abs(r.t - 9) < 0.01 && r.kind === 'metal' && r.nz === 1, JSON.stringify(r && { t: r.t, k: r.kind }));
  const r2 = W.raycast(0, 1.6, -5, 1, 0, 0, 100, true); ok('raycast cilindro', r2 && Math.abs(r2.t - 4) < 0.01, JSON.stringify(r2 && { t: r2.t }));
  const r3 = W.raycast(10, 1.6, 0, 0, -0.1, -1, 100, true); ok('raycast terreno', r3 && r3.terrain === true, JSON.stringify(r3 && { t: r3.t, y: r3.y })); }
console.log(fails ? ('\n' + fails + ' FALHAS') : '\nTODOS OK');
process.exit(fails ? 1 : 0);
