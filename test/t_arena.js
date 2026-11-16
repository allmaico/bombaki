// Mapa 5x5 "Vila do Roçado": estrutura, rotas, tempos de deslocamento, equilíbrio, bombsites A e B, posições elevadas, colisão
const G = require('./t_sim.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const RUN = G.PH.RUN, t0 = Date.now(), map = G.buildArena(7); console.log('mapa 5x5 gerado em', Date.now() - t0, 'ms; caixas', map.W.boxes.length);
const nav = new G.NavGrid(map), A = map.sites.A, B = map.sites.B, W = map.W;
const len = p => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z); return L; };
const path = (a, b) => nav.findPath(a.x, a.z, b.x, b.z);
const via = (a, w, b) => { const p1 = path(a, w), p2 = path(w, b); return p1 && p2 ? len(p1) + len(p2) : Infinity; };
const sec = d => (d / RUN).toFixed(1) + ' s';
/* ---------- estrutura ---------- */
ok(A && B && A.id === 'A' && B.id === 'B', 'bombsites A e B existem');
ok(A.x < -45 && B.x > 45, `A no extremo oeste (x=${A.x}) e B no extremo leste (x=${B.x})`);
const dAB = Math.hypot(A.x - B.x, A.z - B.z); ok(dAB > 100, 'distância entre A e B: ' + dAB.toFixed(0) + ' m');
ok((A.x1 - A.x0) * (A.z1 - A.z0) >= 300 && (B.x1 - B.x0) * (B.z1 - B.z0) >= 300, 'área de plantio ampla nos dois sites (≥ 300 m²)');
const cen = arr => ({ x: arr.reduce((s, p) => s + p.x, 0) / arr.length, z: arr.reduce((s, p) => s + p.z, 0) / arr.length });
const T = cen(map.spawns.atk), C = cen(map.spawns.def), MID = { x: 0, z: 8 };
ok(map.spawns.atk.length >= 5 && map.spawns.def.length >= 5, 'spawns de ataque e defesa (≥5 cada)');
ok(T.z > 40 && C.z < -40, 'spawn do ataque ao sul e da defesa ao norte');
for (const s of map.spawns.atk.concat(map.spawns.def)) if (!nav.walkable(s.x, s.z)) { ok(false, 'spawn caminhável ' + s.x + ',' + s.z); break; }
/* ---------- tempos de deslocamento (correndo a 7 m/s) ---------- */
const tA = len(path(T, A)), tB = len(path(T, B)), cA = len(path(C, A)), cB = len(path(C, B)), tM = len(path(T, MID)), cM = len(path(C, MID));
console.log(`  ataque → A ${tA.toFixed(0)} m (${sec(tA)}) · ataque → B ${tB.toFixed(0)} m (${sec(tB)}) · ataque → meio ${sec(tM)}`);
console.log(`  defesa → A ${cA.toFixed(0)} m (${sec(cA)}) · defesa → B ${cB.toFixed(0)} m (${sec(cB)}) · defesa → meio ${sec(cM)}`);
ok(Math.abs(tA - tB) / Math.max(tA, tB) < .12, 'ataque chega a A e B em tempos equivalentes (dif. < 12%)');
ok(Math.abs(cA - cB) / Math.max(cA, cB) < .12, 'defesa chega a A e B em tempos equivalentes (dif. < 12%)');
ok(cA / RUN + 3 < tA / RUN && cB / RUN + 3 < tB / RUN, 'defesa chega aos sites antes do ataque (tempo para se posicionar)');
ok(tA / RUN > 12 && tA / RUN < 26 && tB / RUN > 12 && tB / RUN < 26, 'ataque leva entre 12 e 26 s até cada site');
ok(Math.abs(tM - cM) / RUN < 4, 'meio disputado: os dois lados chegam com diferença < 4 s');
/* ---------- rotas distintas ---------- */
const LA = { x: -71, z: 10 }, SA = { x: -27, z: -6.5 }, LB = { x: 71, z: 10 }, SB = { x: 27, z: -6.5 }, CR = { x: 0, z: 30.5 };
const aLong = via(T, LA, A), aShort = via(T, SA, A), bLong = via(T, LB, B), bShort = via(T, SB, B);
console.log(`  A: longo ${sec(aLong)} · curto (Casa do Caseiro) ${sec(aShort)} | B: longo (túnel) ${sec(bLong)} · curto (Galinheiro) ${sec(bShort)}`);
ok(isFinite(aLong) && isFinite(aShort) && isFinite(bLong) && isFinite(bShort), 'rota longa e rota curta existem para A e para B');
ok(Math.abs(aLong - bLong) / Math.max(aLong, bLong) < .1 && Math.abs(aShort - bShort) / Math.max(aShort, bShort) < .1, 'rotas equivalentes nos dois lados');
const flank = via({ x: -71, z: 30 }, CR, { x: 71, z: 30 }); ok(isFinite(flank) && flank < 165, 'flanco pelo riacho liga os dois longos: ' + flank.toFixed(0) + ' m');
ok(nav.walkable(0, 30.5) && nav.walkable(-30, 30.5) && nav.walkable(30, 30.5), 'riacho caminhável e cruzando a rampa (vau)');
const rotA = via(C, { x: -32, z: -60 }, A), rotB = via(C, { x: 32, z: -60 }, B); ok(isFinite(rotA) && isFinite(rotB), 'defesa tem rota pelos fundos para A e B (' + sec(rotA) + ' / ' + sec(rotB) + ')');
/* ---------- posições elevadas ---------- */
/* sobe a escada com física real: começa no pé da escada e anda para frente */
const climb = (x, z, yaw) => {
  const sim = new G.Sim({ mode: 'tatico', map, nav, seed: 1, cfg: { fill: false } }), p = sim.addPlayer({ name: 'C', local: true, squad: 0 }); sim.startMatch(); for (let i = 0; i < 60 * 21; i++) sim.step(); sim.placeAt(p, { x, z, yaw }); for (let i = 0; i < 10; i++) sim.step();
  const y0 = p.m.y; let seq = 0, top = 0; for (let i = 0; i < 150; i++) { const c = G.blankCmd(); c.seq = ++seq; c.yaw = yaw; c.mvf = i > 5 && i < 80 ? 1 : 0; p.cmd = c; sim.step(); top = Math.max(top, p.m.y - y0); } return top;
};
const elev = [['palheiro do A', -66.6, -46, Math.PI / 2], ['contêiner do B', 66.4, -45.8, -Math.PI / 2], ['mirante oeste do meio', -15, 7, 0], ['mirante leste do meio', 15, 7, 0]];
for (const [n, x, z, yaw] of elev) { const e = climb(x, z, yaw); ok(e > 1.7, `posição elevada alcançável pela escada: ${n} (+${e.toFixed(1)} m)`); }
/* ---------- colisão: nada atravessa os blocos ---------- */
let leak = 0, tested = 0; for (const r of G.ARENA.solids()) { const w = r[2] - r[0], d = r[3] - r[1]; if (w < 2 || d < 2) continue; const x = (r[0] + r[2]) / 2, z = (r[1] + r[3]) / 2; tested++; if (nav.walkable(x, z) && nav.y[nav.idx(x, z)] < W.heightAt(x, z) + 4) leak++; }
ok(leak === 0, `blocos sólidos fechados (${tested} testados, ${leak} vazamentos)`);
let outside = 0; for (let x = -110; x <= 110; x += 4) for (let z = -96; z <= 96; z += 4) { if (Math.abs(x) < 80 && Math.abs(z) < 68) continue; if (nav.walkable(x, z) && path(T, { x, z })) { outside++; break; } }
ok(outside === 0, 'ninguém sai da área jogável');
/* ---------- plantar e desarmar no A e no B ---------- */
for (const id of ['A', 'B']) {
  const S = map.sites[id], sim = new G.Sim({ mode: 'tatico', map, nav, seed: 3, cfg: { fill: false, rounds: 12 } });
  const at = sim.addPlayer({ name: 'Atk', local: true, squad: 0 }), df = sim.addPlayer({ name: 'Def', local: true, squad: 1 }); sim.startMatch();
  const carrier = at.team === G.T_ATK ? at : df, defender = carrier === at ? df : at; let seq = 0; const cmd = (p, use) => { const c = G.blankCmd(); c.seq = ++seq; c.yaw = p.m.yaw; c.use = use; p.cmd = c; };
  for (let i = 0; i < 60 * 21; i++) { cmd(carrier, false); cmd(defender, false); sim.step(); sim.ev.length = 0; }
  if (!carrier.hasBomb) { sim.bomb.st = 'carried'; sim.bomb.carrier = carrier.id; carrier.hasBomb = true; }
  sim.placeAt(carrier, { x: S.x, z: S.z, yaw: 0 }); sim.placeAt(defender, { x: S.x + 3, z: S.z + 3, yaw: 0 }); for (let i = 0; i < 20; i++) { cmd(carrier, false); cmd(defender, false); sim.step(); }
  let planted = null; for (let i = 0; i < 60 * 4.5 && !planted; i++) { cmd(carrier, true); cmd(defender, false); sim.step(); for (const e of sim.ev) if (e.t === 'bomb' && e.k === 'plant') planted = e; sim.ev.length = 0; }
  ok(planted && planted.site === id, `mandioca plantada no bombsite ${id} (${S.name})`);
  sim.placeAt(defender, { x: sim.bomb.x + .6, z: sim.bomb.z, yaw: 0 }); for (let i = 0; i < 5; i++) { cmd(carrier, false); cmd(defender, false); sim.step(); }
  let defused = false; for (let i = 0; i < 60 * 7 && !defused; i++) { cmd(carrier, false); cmd(defender, true); sim.step(); for (const e of sim.ev) if (e.t === 'bomb' && e.k === 'defuse') defused = true; sim.ev.length = 0; }
  ok(defused, `mandioca desarmada no bombsite ${id}`);
  const out = { x: id === 'A' ? -45 : 45, z: -40 }; sim.placeAt(carrier, { x: out.x, z: out.z, yaw: 0 }); ok(!sim.inSite(carrier), `fora da área marcada do ${id} não planta`);
}
/* ---------- bots jogam no mapa novo: plantam nos dois sites ---------- */
const sites = { A: 0, B: 0 }; let rounds = 0, kills = 0;
for (let seed = 1; seed <= 6; seed++) {
  const sim = new G.Sim({ mode: 'tatico', map, nav, seed, cfg: { botLevel: 'normal', perTeam: 5, rounds: 4 } }); sim.startMatch();
  for (let i = 0; i < 60 * 900 && sim.phase !== 'over'; i++) { sim.step(); for (const e of sim.ev) { if (e.t === 'bomb' && e.k === 'plant') sites[e.site]++; if (e.t === 'rend') rounds++; if (e.t === 'kill') kills++; } sim.ev.length = 0; }
}
console.log('  bots: rodadas', rounds, '· plantios A', sites.A, '· plantios B', sites.B, '· abates', kills);
ok(rounds >= 20, 'rodadas completas com bots no mapa 5x5');
ok(sites.A > 0 && sites.B > 0, 'bots plantaram nos dois bombsites');
ok(kills > rounds * 3, 'combate acontece (abates por rodada: ' + (kills / Math.max(1, rounds)).toFixed(1) + ')');
console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
