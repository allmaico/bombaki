// VIDROS: tiro quebra e a bala passa · facada quebra · correndo contra quebra · janela quebrada dá para pular (vault) · 5x5 restaura no round
const G = require('./t_sim.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const TPS = 60;
const map = G.buildFazenda(1), nav = new G.NavGrid(map), W = map.W;
const real = W.glass.filter(g => !g.fake);
ok(real.length > 50, 'janelas de vidro de verdade na fazenda: ' + real.length);
/* acha uma janela com chão livre dos dois lados */
function pick() {
  for (const g of real) { const n = g.ax === 'x' ? [1, 0] : [0, 1]; const out = { x: g.cx + n[0] * 2.4, z: g.cz + n[1] * 2.4 }, ins = { x: g.cx - n[0] * 1.6, z: g.cz - n[1] * 1.6 };
    const ko = nav.idx(out.x, out.z), ki = nav.idx(ins.x, ins.z); if (ko < 0 || ki < 0 || !nav.ok[ko] || !nav.ok[ki]) continue; const yo = nav.y[ko], yi = nav.y[ki]; if (g.y0 - yo < .4 || g.y0 - yo > 1.5 || Math.abs(yo - yi) > .5) continue; return { g, out, ins, n }; }
  return null;
}
const P = pick(); ok(!!P, 'janela de teste encontrada');
const mk = () => { const sim = new G.Sim({ mode: 'caos', map, nav, seed: 3, cfg: { fill: false, total: 2 } }); const me = sim.addPlayer({ name: 'Eu', local: true }); sim.addPlayer({ name: 'Ele', local: true }); sim.startMatch(); sim.phase = 'live'; sim.cow = null; for (const q of sim.players) { q.onCow = false; q.chute = null; q.equipT = 0; } return { sim, me }; };
const put = (sim, me, x, z) => { sim.placeAt(me, { x, z, yaw: 0 }); const k = nav.idx(x, z); if (k >= 0 && nav.ok[k]) { me.m.y = nav.y[k] + .02; me.m.vy = 0; } };
const face = (me, tx, tz) => Math.atan2(-(tx - me.m.x), -(tz - me.m.z));
const step = (sim, me, c, n) => { const ev = []; for (let i = 0; i < n; i++) { const cc = Object.assign(G.blankCmd(), c); me.cmd = cc; for (const q of sim.players) if (q !== me) q.cmd = G.blankCmd(); sim.step(); ev.push(...sim.ev); sim.ev.length = 0; c.acts = null; } return ev; };
if (P) {
  const { g, out, ins } = P;
  /* 1) tiro */
  { const { sim, me } = mk(); put(sim, me, out.x, out.z); const yaw = face(me, g.cx, g.cz); me.w = 'estilingue'; me.own.estilingue = 1; me.mag.estilingue = 7;
    const pitch = Math.atan2(g.cy - (me.m.y + 1.6), Math.hypot(g.cx - me.m.x, g.cz - me.m.z));
    const ev = step(sim, me, { yaw, pitch, fire: true }, 40); const gl = ev.find(e => e.t === 'glass'), shot = ev.find(e => e.t === 'shot');
    ok(gl && g.broken, 'tiro quebra o vidro'); ok(shot && Math.hypot(shot.e[0] - me.m.x, shot.e[2] - me.m.z) > 2.6, `a bala atravessa a janela (parou a ${shot ? Math.hypot(shot.e[0] - me.m.x, shot.e[2] - me.m.z).toFixed(1) : '?'} m)`);
    /* 2) vault */
    const y0 = me.m.y; step(sim, me, { yaw, pitch: 0, mvf: 1 }, 30);
    const before = (me.m.x - g.cx) * P.n[0] + (me.m.z - g.cz) * P.n[1];
    let vaulted = false; for (let i = 0; i < 90; i++) { step(sim, me, { yaw, pitch: 0, mvf: 1, jump: i % 10 < 2 }, 1); if (me.m.vault) vaulted = true; }
    const after = (me.m.x - g.cx) * P.n[0] + (me.m.z - g.cz) * P.n[1];
    ok(vaulted && before > 0 && after < -.3, `pulou pela janela quebrada (lado ${before.toFixed(1)} → ${after.toFixed(1)} m, altura do peitoril ${(g.y0 - y0).toFixed(2)} m)`);
    G.glassVaultStep; }
  /* 3) facada */
  { for (const q of W.glass) if (q.broken) { q.broken = false; if (q.box) { q.box.y0 = q.bk[0]; q.box.y1 = q.bk[1]; } }
    const { sim, me } = mk(); const n = P.n; put(sim, me, g.cx + n[0] * .9, g.cz + n[1] * .9); const yaw = face(me, g.cx, g.cz); me.own.faca = 1; me.w = 'faca'; me.equipT = 0;
    const pitch = Math.atan2(g.cy - (me.m.y + 1.6), .9); const ev = step(sim, me, { yaw, pitch, fire: true }, 50); ok(ev.some(e => e.t === 'glass') && g.broken, 'facada quebra o vidro'); }
  /* 4) corpo correndo */
  { for (const q of W.glass) if (q.broken) { q.broken = false; if (q.box) { q.box.y0 = q.bk[0]; q.box.y1 = q.bk[1]; } }
    const { sim, me } = mk(); const n = P.n; put(sim, me, g.cx + n[0] * 5, g.cz + n[1] * 5); const yaw = face(me, g.cx, g.cz);
    const ev = step(sim, me, { yaw, pitch: 0, mvf: 1, sprint: true, jump: true }, 120); ok(ev.some(e => e.t === 'glass'), 'correndo e pulando contra o vidro: quebra'); }
  /* 5) vidro inteiro bloqueia passagem */
  { for (const q of W.glass) if (q.broken) { q.broken = false; if (q.box) { q.box.y0 = q.bk[0]; q.box.y1 = q.bk[1]; } }
    const { sim, me } = mk(); const n = P.n; put(sim, me, g.cx + n[0] * 1.2, g.cz + n[1] * 1.2); const yaw = face(me, g.cx, g.cz);
    step(sim, me, { yaw, pitch: 0, mvf: .5 }, 90); const side = (me.m.x - g.cx) * n[0] + (me.m.z - g.cz) * n[1]; ok(side > 0 && !g.broken, 'vidro inteiro: andando devagar não atravessa'); }
}
/* 6) 5x5: janela pintada quebra com tiro e volta no round seguinte */
{ const m5 = G.buildArena(7), nav5 = new G.NavGrid(m5); const sim = new G.Sim({ mode: 'tatico', map: m5, nav: nav5, seed: 4, cfg: { fill: false } }); const me = sim.addPlayer({ name: 'Eu', local: true, squad: 0 }); sim.addPlayer({ name: 'Ele', local: true, squad: 1 }); sim.startMatch();
  for (let i = 0; i < 90 * TPS && sim.phase !== 'live'; i++) { sim.step(); sim.ev.length = 0; }
  const fk = m5.W.glass.filter(g => g.fake); let tgt = null, spot = null;
  for (const g of fk) { const n = g.ax === 'x' ? [1, 0] : [0, 1]; for (const s of [1, -1]) { const x = g.cx + n[0] * s * 6, z = g.cz + n[1] * s * 6, k = nav5.idx(x, z); if (k >= 0 && nav5.ok[k] && m5.W.los(x, nav5.y[k] + 1.6, z, g.cx, g.cy, g.cz)) { tgt = g; spot = { x, z }; break; } } if (tgt) break; }
  ok(!!tgt, '5x5: janela pintada visível encontrada');
  if (tgt) { sim.placeAt(me, { x: spot.x, z: spot.z, yaw: 0 }); const yaw = face(me, tgt.cx, tgt.cz), pitch = Math.atan2(tgt.cy - (me.m.y + 1.6), 6); me.w = 'estilingue'; me.mag.estilingue = 7;
    step(sim, me, { yaw, pitch, fire: true }, 40); ok(tgt.broken, '5x5: tiro quebra a janela pintada'); sim.pt = 0; sim.endRound && sim.endRound(G.T_DEF, 'time'); for (let i = 0; i < 10 * TPS && sim.phase !== 'prep'; i++) { sim.step(); sim.ev.length = 0; } ok(!tgt.broken, '5x5: vidros voltam no round seguinte'); }
}
console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
