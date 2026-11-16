// Mapa 5x5 "Moinho das Três Porteiras": estrutura, rotas, tempos, equilíbrio, sites, posições elevadas, colisão, bots
const G = require('./t_sim.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const RUN = G.PH.RUN, t0 = Date.now(), map = G.buildArena2(11); console.log('mapa 5x5 (2) gerado em', Date.now() - t0, 'ms; caixas', map.W.boxes.length);
const nav = new G.NavGrid(map), A = map.sites.A, B = map.sites.B, W = map.W;
const len = p => { if (!p) return Infinity; let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z); return L; };
const path = (a, b) => nav.findPath(a.x, a.z, b.x, b.z);
const via = (a, w, b) => len(path(a, w)) + len(path(w, b));
const sec = d => (d / RUN).toFixed(1) + ' s';
/* ---------- estrutura ---------- */
ok(map.id === 'arena2' && map.name === 'Moinho das Três Porteiras', 'mapa próprio, independente da Vila do Roçado e do Battle Royale');
ok(G.TAT_MAPS.length >= 2 && G.TAT_MAPS.every(t => typeof t.build === 'function'), 'registro de mapas competitivos (' + G.TAT_MAPS.map(t => t.name).join(', ') + ')');
ok(A && B && A.id === 'A' && B.id === 'B', 'bombsites A e B existem');
const dAB = Math.hypot(A.x - B.x, A.z - B.z); ok(dAB > 90, 'A e B em extremidades opostas: ' + dAB.toFixed(0) + ' m');
ok((A.x1 - A.x0) * (A.z1 - A.z0) >= 300 && (B.x1 - B.x0) * (B.z1 - B.z0) >= 300, 'área de plantio ampla nos dois sites (≥ 300 m²)');
const cen = arr => ({ x: arr.reduce((s, p) => s + p.x, 0) / arr.length, z: arr.reduce((s, p) => s + p.z, 0) / arr.length });
const T = cen(map.spawns.atk), C = cen(map.spawns.def), MID = { x: -1, z: 4 };
ok(map.spawns.atk.length >= 5 && map.spawns.def.length >= 5, 'spawns de ataque e defesa (≥5 cada)');
ok(T.x > 55 && C.x < -60, 'ataque a leste e defesa a oeste');
for (const s of map.spawns.atk.concat(map.spawns.def)) if (!nav.walkable(s.x, s.z)) { ok(false, 'spawn caminhável ' + s.x + ',' + s.z); break; }
/* ---------- tempos ---------- */
const tA = len(path(T, A)), tB = len(path(T, B)), cA = len(path(C, A)), cB = len(path(C, B)), tM = len(path(T, MID)), cM = len(path(C, MID));
console.log(`  ataque → A ${sec(tA)} · ataque → B ${sec(tB)} · ataque → meio ${sec(tM)}`);
console.log(`  defesa → A ${sec(cA)} · defesa → B ${sec(cB)} · defesa → meio ${sec(cM)}`);
ok(Math.abs(tA - tB) / Math.max(tA, tB) < .12, 'ataque chega a A e B em tempos equivalentes (dif. < 12%)');
ok(Math.abs(cA - cB) / Math.max(cA, cB) < .12, 'defesa chega a A e B em tempos equivalentes (dif. < 12%)');
ok(cA / RUN + 3 < tA / RUN && cB / RUN + 3 < tB / RUN, 'defesa chega aos sites antes do ataque (tempo para se posicionar)');
ok(tA / RUN > 12 && tA / RUN < 26 && tB / RUN > 12 && tB / RUN < 26, 'ataque leva entre 12 e 26 s até cada site');
ok(Math.abs(tM - cM) / RUN < 4, 'meio disputado: os dois lados chegam com diferença < 4 s');
const rot = len(path(A, B)); ok(rot / RUN > 12, 'defender A e B ao mesmo tempo é inviável (rotação A↔B ' + sec(rot) + ')');
/* ---------- três rotas principais + alternativas ---------- */
const R3 = { A: [['longo (Estrada do Moinho/Porteira)', { x: -14, z: -54 }], ['meio (Rua do Meio → Beco → Janela)', { x: -29, z: -28 }], ['alternativa (Tulha)', { x: 0, z: -41 }]],
  B: [['longo (Beira do Rio/Vau)', { x: 24, z: 54 }], ['meio (Rua do Meio → Curral)', { x: -29, z: 28 }], ['alternativa (Casa do Rio)', { x: 0, z: 41 }]] };
for (const id of ['A', 'B']) { const S = map.sites[id], ts = R3[id].map(([n, w]) => [n, via(T, w, S)]); console.log('  ' + id + ': ' + ts.map(([n, t]) => n + ' ' + sec(t)).join(' · ')); ok(ts.every(([, t]) => isFinite(t) && t / RUN < 30), 'rotas longa, curta e alternativa existem até ' + id); }
for (const i of [0, 1, 2]) { const a = via(T, R3.A[i][1], A), b = via(T, R3.B[i][1], B); ok(Math.abs(a - b) / Math.max(a, b) < .1, 'rota ' + R3.A[i][0].split(' ')[0] + ' equivalente nos dois lados'); }
ok(nav.walkable(24, 52) && nav.walkable(0, -41) && nav.walkable(0, 41), 'vau do riacho e interiores das casas caminháveis');
/* a defesa tem duas rotas por site: corredor da base e passagem pelo pátio */
const rA = via(C, { x: -73, z: -26 }, A), rA2 = via(C, { x: -29, z: -28 }, A); ok(isFinite(rA) && isFinite(rA2) && rA < rA2, 'defesa: corredor direto (' + sec(rA) + ') e rota pelo pátio (' + sec(rA2) + ') até o A');
/* ---------- linhas de visão longas quebradas ---------- */
const eye = (x, z) => W.heightAt(x, z) + 1.6, see = (a, b) => W.los(a.x, eye(a.x, a.z), a.z, b.x, eye(b.x, b.z), b.z);
let open = 0, tot = 0; for (let z = -9; z <= -4.5; z += .5) for (let z2 = -4.5; z2 <= 4.5; z2 += .5) { tot++; if (see({ x: -60, z }, { x: 40, z: z2 })) open++; }
ok(open / tot < .05, 'base da defesa não enxerga a Rua do Meio através do pátio (' + open + '/' + tot + ' linhas livres)');
const longOpen = (x0, x1, zs) => { let o = 0, n = 0; for (const z of zs) for (const z2 of zs) { n++; if (see({ x: x0, z }, { x: x1, z: z2 })) o++; } return o / n; };
const lz = [-59, -57, -55, -53, -51, -49], lo = longOpen(70, -30, lz); ok(lo < .25, 'porteira e caixotes quebram a visão do longo A inteiro (' + (lo * 100).toFixed(0) + '% de linhas livres)');
/* ---------- posições elevadas ---------- */
/* sobe a escada com física real: começa no pé da escada e anda para frente */
const climb = (x, z, yaw) => {
  const sim = new G.Sim({ mode: 'tatico', map, nav, seed: 1, cfg: { fill: false } }), p = sim.addPlayer({ name: 'C', local: true, squad: 0 }); sim.addPlayer({ name: 'D', local: true, squad: 1 }); sim.startMatch(); for (let i = 0; i < 60 * 40 && sim.phase !== 'live'; i++) sim.step(); sim.placeAt(p, { x, z, yaw }); for (let i = 0; i < 10; i++) sim.step();
  const y0 = p.m.y; let seq = 0, top = 0; for (let i = 0; i < 150; i++) { const c = G.blankCmd(); c.seq = ++seq; c.yaw = yaw; c.mvf = i > 5 && i < 80 ? 1 : 0; p.cmd = c; sim.step(); top = Math.max(top, p.m.y - y0); } return top;
};
const elev = [['palheiro do A', -56.4, -56.4, Math.PI / 2], ['contêiner do B', -48.4, 60, Math.PI / 2], ['mirante do pátio', 5.8, -2.3, Math.PI / 2]];
for (const [n, x, z, yaw] of elev) { const e = climb(x, z, yaw); ok(e > 1.7, `posição elevada alcançável pela escada: ${n} (+${e.toFixed(1)} m)`); }
/* ---------- colisão: nada atravessa os blocos ---------- */
let leak = 0, tested = 0; for (const r of G.ARENA2.solids()) { const w = r[2] - r[0], d = r[3] - r[1]; if (w < 2 || d < 2) continue; const x = (r[0] + r[2]) / 2, z = (r[1] + r[3]) / 2; tested++; if (nav.walkable(x, z) && nav.y[nav.idx(x, z)] < W.heightAt(x, z) + 4) leak++; }
ok(leak === 0, `blocos sólidos fechados (${tested} testados, ${leak} vazamentos)`);
let outside = 0; for (let x = -116; x <= 114; x += 4) for (let z = -94; z <= 94; z += 4) { if (x > -86 && x < 84 && Math.abs(z) < 64) continue; if (nav.walkable(x, z) && path(T, { x, z })) { outside++; break; } }
ok(outside === 0, 'ninguém sai da área jogável');
/* ---------- plantar e desarmar no A e no B ---------- */
for (const id of ['A', 'B']) {
  const S = map.sites[id], sim = new G.Sim({ mode: 'tatico', map, nav, seed: 3, cfg: { fill: false, rounds: 12 } });
  const at = sim.addPlayer({ name: 'Atk', local: true, squad: 0 }), df = sim.addPlayer({ name: 'Def', local: true, squad: 1 }); sim.startMatch();
  const carrier = at.team === G.T_ATK ? at : df, defender = carrier === at ? df : at; let seq = 0; const cmd = (p, use) => { const c = G.blankCmd(); c.seq = ++seq; c.yaw = p.m.yaw; c.use = use; p.cmd = c; };
  for (let i = 0; i < 60 * 40 && sim.phase !== 'live'; i++) { cmd(carrier, false); cmd(defender, false); sim.step(); sim.ev.length = 0; }
  if (!carrier.hasBomb) { sim.bomb.st = 'carried'; sim.bomb.carrier = carrier.id; carrier.hasBomb = true; }
  sim.placeAt(carrier, { x: S.x, z: S.z, yaw: 0 }); sim.placeAt(defender, { x: S.x + 3, z: S.z + 3, yaw: 0 }); for (let i = 0; i < 20; i++) { cmd(carrier, false); cmd(defender, false); sim.step(); }
  let planted = null; for (let i = 0; i < 60 * 4.5 && !planted; i++) { cmd(carrier, true); cmd(defender, false); sim.step(); for (const e of sim.ev) if (e.t === 'bomb' && e.k === 'plant') planted = e; sim.ev.length = 0; }
  ok(planted && planted.site === id, `mandioca plantada no bombsite ${id} (${S.name})`);
  sim.placeAt(defender, { x: sim.bomb.x + .6, z: sim.bomb.z, yaw: 0 }); for (let i = 0; i < 5; i++) { cmd(carrier, false); cmd(defender, false); sim.step(); }
  let defused = false; for (let i = 0; i < 60 * 8.5 && !defused; i++) { cmd(carrier, false); cmd(defender, true); sim.step(); for (const e of sim.ev) if (e.t === 'bomb' && e.k === 'defuse') defused = true; sim.ev.length = 0; }
  ok(defused, `mandioca desarmada no bombsite ${id}`);
  const out = { x: S.x, z: id === 'A' ? -28 : 28 }; sim.placeAt(carrier, { x: out.x, z: out.z, yaw: 0 }); ok(!sim.inSite(carrier), `fora da área marcada do ${id} não planta`);
}
/* ---------- bots jogam no mapa novo: plantam nos dois sites ---------- */
const sites = { A: 0, B: 0 }; let rounds = 0, kills = 0;
for (let seed = 1; seed <= 6; seed++) {
  const sim = new G.Sim({ mode: 'tatico', map, nav, seed, cfg: { botLevel: 'normal', perTeam: 5, rounds: 4 } }); sim.startMatch();
  for (let i = 0; i < 60 * 900 && sim.phase !== 'over'; i++) { sim.step(); for (const e of sim.ev) { if (e.t === 'bomb' && e.k === 'plant') sites[e.site]++; if (e.t === 'rend') rounds++; if (e.t === 'kill') kills++; } sim.ev.length = 0; }
}
console.log('  bots: rodadas', rounds, '· plantios A', sites.A, '· plantios B', sites.B, '· abates', kills);
ok(rounds >= 20, 'rodadas completas com bots no Moinho');
ok(sites.A > 0 && sites.B > 0, 'bots plantaram nos dois bombsites');
ok(kills > rounds * 3, 'combate acontece (abates por rodada: ' + (kills / Math.max(1, rounds)).toFixed(1) + ')');
console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
