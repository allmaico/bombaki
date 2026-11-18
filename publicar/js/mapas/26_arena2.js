/* =====================================================================
   26_arena2.js — "MOINHO DAS TRÊS PORTEIRAS": segundo mapa COMPETITIVO
   exclusivo do 5x5 (independente do Battle Royale e da Vila do Roçado).
   Orientação leste–oeste: ataque a leste, defesa a oeste, A ao norte e
   B ao sul (≈ 100 m entre os sites). Três rotas principais:

        z ↑ (norte)
     ┌── [A] MOINHO ◄═══ Porteira ═══ Estrada do Moinho (Longo A) ══╗
     │    ▲ Janela ◄ Beco ◄┐   Tulha (casa)                         ║ Saída Norte
     │ CT ║                │     │                                  ║
     │BASE╠══ Passagem ══► PÁTIO DO MOINHO ◄══ Rua do Meio ══ BASE DO ATAQUE
     │ CT ║                │     │                                  ║
     │    ▼ Curral ◄───────┘   Casa do Rio (casa)                   ║ Saída Sul
     └── [B] CELEIRO ◄═══ Vau ═══ Beira do Rio (Longo B) ═══════════╝
   • Longos A/B: rotas externas, compridas, com porteira e vau como estreitamentos.
   • Meio: Rua do Meio → Pátio → Beco/Janela (curto A) ou Curral (curto B).
   • Tulha e Casa do Rio: construções com duas portas ligando longo ↔ pátio (rotas alternativas).
   • Defesa gira A ↔ B pela base (corredores) ou pelo pátio (arriscado).
   Reaproveita o gerador de "negativo" do ARENA (paredes = complemento das áreas).
   ===================================================================== */
'use strict';
const ARENA2 = Object.assign({}, ARENA, {
  Y: 1.0, H: 5.4, L: { x0: -86, x1: 84, z0: -64, z1: 64 },
  walk: [
    [56, -12, 80, 12],                                   /* base do ataque */
    [64, -60, 76, -12], [64, 12, 76, 60],                /* saídas norte / sul */
    [-24, -60, 14, -48], [14, -54, 24, -48], [24, -60, 64, -48],   /* Estrada do Moinho (longo A, estreita no Paiol) */
    [-20, 48, 64, 60],                                   /* Beira do Rio (longo B) */
    [12, -5, 56, 5],                                     /* Rua do Meio */
    [-14, -16, 12, 16],                                  /* Pátio do Moinho */
    [-7, -48, 7, -34], [-3, -34, 3, -16],                /* Tulha (casa) + viela até o pátio */
    [-7, 34, 7, 48], [-3, 16, 3, 34],                    /* Casa do Rio + viela até o pátio */
    [-30, -22, -14, -12], [-34, -34, -24, -12],          /* Beco + Janela (curto A) */
    [-30, 12, -14, 22], [-34, 12, -24, 36],              /* Curral (curto B) */
    [-68, -62, -24, -34], [-68, 36, -20, 62],            /* áreas de A e B */
    [-84, -10, -64, 10],                                 /* base da defesa */
    [-80, -46, -66, -10], [-80, 10, -66, 46],            /* corredores da defesa até A / B */
    [-64, -10, -14, -4]                                  /* Passagem (base da defesa → pátio) */
  ],
  houses: [[-7, -48, 7, -34], [-7, 34, 7, 48]],
  sites: { A: { x0: -62, z0: -56, x1: -42, z1: -40 }, B: { x0: -60, z0: 42, x1: -40, z1: 58 } },
  callouts: [
    { name: 'Base Ataque', x: 67, z: 8.5 }, { name: 'Base Defesa', x: -66, z: 1 }, { name: 'Pátio', x: -1, z: 10 }, { name: 'Rua do Meio', x: 32, z: -1 },
    { name: 'Estrada do Moinho', x: 44, z: -54 }, { name: 'Beira do Rio', x: 48, z: 54 }, { name: 'Porteira', x: -14, z: -54 }, { name: 'Paiol', x: 19, z: -51 }, { name: 'Vau', x: 24, z: 51 },
    { name: 'Tulha', x: 0, z: -41 }, { name: 'Casa do Rio', x: 0, z: 41 }, { name: 'Beco', x: -22, z: -17 }, { name: 'Janela', x: -29, z: -28 },
    { name: 'Curral', x: -27, z: 24 }, { name: 'Passagem', x: -40, z: -7 }, { name: 'Corredor A', x: -73, z: -26 }, { name: 'Corredor B', x: -73, z: 28 },
    { name: 'Saída Norte', x: 70, z: -32 }, { name: 'Saída Sul', x: 70, z: 34 }
  ]
});
/* estilo dos blocos: pedra e reboco no norte (moinho), celeiro vermelho no sul, galpões no ataque, sede na defesa */
function arena2Style(cx, cz) {
  if (cx < -62) return 'sede';
  if (cx > 52) return 'galpao';
  if (cz < -30) return cx < -20 ? 'pedra' : 'casa';
  if (cz > 30) return cx < -16 ? 'barn' : 'casa';
  return Math.abs(cz) < 12 && cx > 10 ? 'galpao' : 'casa';
}
/* placa vertical com a letra do site (rot 0 = de frente para ±z, rot 1 = para ±x) */
function arenaSign(k, x, z, id, rot, Y) {
  k.begin(x, z, rot, Y); k.V(m => { m.mat(TX.wood, 0).col(0x5a3a22).uvs(1, 1).box(.12, 3.2, .12, 0, 1.6, 0); m.mat(TX.white, 0, 0, 30).col(id === 'A' ? 0xffc61a : 0x3d8bff).box(1.4, 1.4, .1, 0, 3.4, 0); m.mat(TX.white, 0, 0, 60).col(0xffffff); for (const f of [-1, 1]) letterV(m, id, .95, 0, 3.4, f * .056); });
}
/* palheiro elevado (plataforma de madeira com escada) — ponto alto de defesa */
function hayLoft(k, x, z, Y, stairSide) {
  k.begin(x, z, 0, Y); k.S(-3.5, 2.5, -3.5, 3.5, 2.8, 3.5, TX.plank2, 0xc89a60, { us: .5, kind: 'wood' });
  for (const [a, b] of [[-3.3, -3.3], [3.3, -3.3], [-3.3, 3.3], [3.3, 3.3]]) k.S(a - .18, 0, b - .18, a + .18, 2.5, b + .18, TX.wood, 0x7a5232, { us: 1, kind: 'wood' });
  k.S(-3.5, 2.8, -3.5, -3.3, 3.8, 3.5, TX.wood, 0x8a6040, { us: 1, kind: 'wood' });
  if (stairSide > 0) k.stairs(3.5 + 9 * .32, 1.6, -1, 0, 1.3, 9, 2.8 / 9, .32, TX.plank2, 0xc8a070, 0);
  else k.stairs(-1.6, 3.5 + 9 * .32, 0, -1, 1.3, 9, 2.8 / 9, .32, TX.plank2, 0xc8a070, 0);
  k.hayBale(x - 1.5, z - 2, 0, { y: Y + 2.8 }); k.mm.push({ t: 'rect', x0: x - 3.5, z0: z - 3.5, x1: x + 3.5, z1: z + 3.5, c: '#a07a50' });
}
/* porteira de pedra com vão central (estreitamento) atravessando um corredor no eixo x (muro ao longo de z) */
function stoneGateZ(k, x, z0, z1, gap, Y, gc) {
  const zc = gc === undefined ? (z0 + z1) / 2 : gc, hg = gap / 2; k.begin(x, zc, 0, Y);
  k.S(-.3, 0, z0 - zc, .3, 3.4, -hg, TX.stone, 0xc8bca8, { us: .5, kind: 'stone' }); k.S(-.3, 0, hg, .3, 3.4, z1 - zc, TX.stone, 0xc8bca8, { us: .5, kind: 'stone' });
  k.S(-.4, 0, -hg - .3, .4, 3.8, -hg + .1, TX.wood, 0x7a5232, { us: 1, kind: 'wood' }); k.S(-.4, 0, hg - .1, .4, 3.8, hg + .3, TX.wood, 0x7a5232, { us: 1, kind: 'wood' });
  k.S(-.25, 3.6, -hg - .3, .25, 3.9, hg + .3, TX.wood, 0x6a4428, { nc: true, us: 1 });
  k.mm.push({ t: 'rect', x0: x - .4, z0, x1: x + .4, z1: zc - hg, c: '#6a6458' }); k.mm.push({ t: 'rect', x0: x - .4, z0: zc + hg, x1: x + .4, z1, c: '#6a6458' });
}
function buildArena2(seed) {
  seed = seed || 11; const A = ARENA2, Y = A.Y, B = { x0: -118, x1: 116, z0: -96, z1: 96 }, k = new MapKit('arena2', B, seed), R = k.R;
  k.setBase((x, z) => {
    const ex = Math.max(0, x > 0 ? x - 86 : -x - 88), ez = Math.max(0, Math.abs(z) - 66), e = Math.hypot(ex, ez);
    return Y + (e > 0 ? e * .22 + (fbm(x * .03 + 7, z * .03, 3) - .3) * Math.min(e, 14) * .6 : 0);
  });
  /* riacho cruza a Beira do Rio (vau = estreitamento do longo B) */
  k.creek([[24, 36], [24, 46], [24, 54], [24, 66]], 2.6, -.5);
  k.road([[56, 0], [12, 0]], 4); k.road([[70, -12], [70, -54], [-24, -54]], 3.6); k.road([[70, 12], [70, 54], [-20, 54]], 3.6);
  k.road([[-64, -7], [-14, -7]], 3); k.road([[-73, -10], [-73, -40]], 3); k.road([[-73, 10], [-73, 40]], 3);
  k.yards = [{ x0: -14, z0: -16, x1: 12, z1: 16, m: 3, k: .55 }, { x0: 56, z0: -12, x1: 80, z1: 12, m: 3, k: .7 }, { x0: -68, z0: -62, x1: -24, z1: -34, m: 3, k: .5 }, { x0: -68, z0: 36, x1: -20, z1: 62, m: 3, k: .5 }, { x0: -84, z0: -10, x1: -64, z1: 10, m: 3, k: .6 }];
  k.commitTerrain(1); const W = k.W;
  /* ---- volumes sólidos ---- */
  for (const r of A.solids()) arenaBlock(k, r, A, arena2Style);
  /* ---- construções atravessáveis: Tulha (norte) e Casa do Rio (sul), portas N e S ---- */
  const door = s => ({ s, at: .5, w: 3.2, h: 2.8 });
  k.building({ x: 0, z: -41, y: Y, w: 14, d: 14, fh: 3.4, floors: 1, th: .3, doors: [door('N'), door('S')], wins: [{ s: 'E', n: 2, w: 1.2, gap: .3, sill: 1.3 }, { s: 'W', n: 2, w: 1.2, gap: .3, sill: 1.3 }], wall: { tex: TX.stone, col: 0xd8ccb4, us: .4 }, roof: { tex: TX.tile, col: 0xb85a3a, h: 2.4 }, shutters: 0x2f6fb0, mmc: '#9a8a70' });
  k.building({ x: 0, z: 41, y: Y, w: 14, d: 14, fh: 3.4, floors: 1, th: .3, doors: [door('N'), door('S')], wins: [{ s: 'E', n: 2, w: 1.2, gap: .3, sill: 1.3 }, { s: 'W', n: 2, w: 1.2, gap: .3, sill: 1.3 }], wall: { tex: TX.plaster, col: 0xf0e2c4, us: .4 }, roof: { tex: TX.tile, col: 0xc8603e, h: 2.4 }, shutters: 0x3a7a4a, mmc: '#b89a78' });
  /* interiores (sacos de milho, caixotes) */
  for (let i = 0; i < 3; i++) k.hayBale(-4.5, -45 + i * 2.4, 1, { y: Y + .14 }); k.crate(4.4, -37, .2, 1.1, { y: Y + .14 }); k.crate(4.4, -44.5, 0, 1.1, { y: Y + .14 }); k.barrel(-4.6, -36.5, 0xe0a020, { y: Y + .14 });
  k.crate(-4.4, 37, 0, 1.1, { y: Y + .14 }); k.crate(-4.4, 38.2, .3, 1.0, { y: Y + .14 }); k.barrel(4.6, 45.5, 0x2f6fd0, { y: Y + .14 }); k.hayBale(4.5, 38, 1, { y: Y + .14 });
  /* ---- Pátio do Moinho: contêiner com escada (mirante), poço, carroça ---- */
  k.container(0, -3.5, 1, CONT_COLS[2]); containerStairs(k, 0, -3.5, 1, 'S', 0); k.mm.push({ t: 'rect', x0: -1.22, z0: -6.5, x1: 1.22, z1: -.5, c: '#4a7a5a' });
  k.crate(0, .6, 0, 1.2); k.crate(0, -7.4, .2, 1.1); well(k, -8, 10); k.crate(8, 11, .2, 1.2); k.crate(9.2, 11.3, 0, 1.0); k.hayBale(-10, -12, 0, {}); k.hayBale(8, -12, 1, {});
  k.barrel(-12.5, 14.5, 0x3a8a4a); k.barrel(10.5, -14.5, 0xc03a2a); pickup(k, 6, 5.5, 1, 0x4a7ab0);
  /* ---- Rua do Meio: trator e caixotes quebram a linha de visão ---- */
  tractor(k, 34, 2.2, 0, 0x4a8a3a); k.crate(24, -3.4, 0, 1.2); k.crate(24, -2.2, .3, 1.0, { base: 1.2 }); k.crate(46, 3.3, .2, 1.2); k.hayBale(16, 3, 0, {});
  /* ---- Estrada do Moinho (longo A): porteira de pedra + coberturas ---- */
  stoneGateZ(k, -14, -60, -48, 5.2, Y, -56.6); k.crate(-9, -49.4, 0, 1.2); k.crate(-9, -50.6, .3, 1.0); k.crate(30, -51.2, 0, 1.3); k.crate(30, -50, .2, 1.2); k.crate(30, -51.2, .1, 1.1, { base: 1.3 }); k.hayBale(30.2, -53.6, 1, {}); k.crate(6, -58.6, .1, 1.2); k.crate(6, -57.4, 0, 1.1, { base: 1.2 }); k.hayBale(9, -49.6, 0, {}); k.hayBale(-2, -58, 0, { round: true });
  k.crate(36, -57.5, .2, 1.2); k.crate(37.2, -57.8, 0, 1.0, { base: 1.2 }); k.barrel(48, -49.3, 0x2f6fd0); scarecrow(k, 56, -58.5, 1); k.crate(70, -40, .3, 1.2); k.hayBale(73, -22, 1, {});
  /* ---- Beira do Rio (longo B): vau com pedras e mourões, coberturas ---- */
  for (let i = 0; i < 6; i++) { const z = 49 + i * 1.9, x = 24 + (i % 2 ? .8 : -.8); k.begin(x, z, 0, W.heightAt(x, z)); k.V(m => { m.mat(TX.stone, 0).col(0xb8b0a0).uvs(.6, .6).cyl(.55, .48, .18, 8, 0, -.05, 0, 3); }); }
  for (const z of [48.4, 59.6]) for (const s of [-1, 1]) { k.begin(24 + s * 3.2, z, 0, Y); k.S(-.14, -1.6, -.14, .14, 1.2, .14, TX.wood, 0x7a5232, { us: 1, kind: 'wood' }); }
  k.rock(19, 50.5, 1.1); k.rock(29.5, 58, 1.0); k.crate(-12, 58.6, 0, 1.2); k.crate(-12, 57.4, .2, 1.0); k.crate(44, 50, .2, 1.2); tractor(k, 56, 57.6, 0, 0xc03a22); k.crate(70, 40, 0, 1.2); k.hayBale(67, 22, 1, { round: true });
  /* ---- Beco / Janela / Curral ---- */
  k.crate(-26, -14, .2, 1.2); k.crate(-31.5, -24, 0, 1.1); k.hayBale(-26, -31, 0, {}); k.barrel(-15.5, -20.5, 0xe0a020);
  k.begin(-22, 17, 0, Y); for (let i = 0; i < 5; i++) k.S(-6 + i * 3 - .1, 0, -.1, -6 + i * 3 + .1, 1.2, .1, TX.wood, 0x7a5232, { us: 1, kind: 'wood', nc: true });
  k.hayBale(-28, 26, 0, {}); k.hayBale(-30.5, 31, 1, { round: true }); k.crate(-16, 20.5, 0, 1.1); k.barrel(-25.5, 13.5, 0x3a8a4a);
  /* ---- Passagem (defesa → pátio) ---- */
  k.crate(-40, -9, 0, 1.2); k.crate(-28, -5, .2, 1.1); k.hayBale(-52, -5.2, 1, {});
  /* ---- bombsite A: Moinho (moinho de vento, palheiro elevado, feno) ---- */
  windmill(k, -33, -57, 11); hayLoft(k, -63.5, -58, Y, 1);
  for (const [x, z, r] of [[-55, -48, 0], [-53.6, -48, 0], [-48, -42, 1], [-58, -43, 1]]) k.hayBale(x, z, r, {}); k.hayBale(-45, -53.5, 0, { round: true });
  k.crate(-50, -36.5, .2, 1.2); k.crate(-50, -36.5, 0, 1.0, { base: 1.2 }); tractor(k, -40, -45, 1, 0xc03a22); k.crate(-28, -45, 0, 1.2); k.barrel(-66.5, -36, 0xc03a2a); k.barrel(-66.5, -37.2, 0xe0a020); scarecrow(k, -36, -36, 0);
  /* ---- bombsite B: Celeiro (contêiner elevado, carroça, sacaria) ---- */
  k.container(-56, 60, 0, CONT_COLS[1]); containerStairs(k, -56, 60, 0, 'E', 0); k.mm.push({ t: 'rect', x0: -59, z0: 58.8, x1: -53, z1: 61.2, c: '#3a6a9a' });
  for (const [x, z, r] of [[-50, 48, 0], [-48.8, 48.2, .2], [-56, 44, .1], [-44, 54, 0]]) k.crate(x, z, r, 1.2); k.crate(-49.4, 48, 0, 1.0, { base: 1.2 });
  pickup(k, -32, 44, 0, 0xc84a2a); k.hayBale(-62, 40, 0, { round: true }); k.hayBale(-64.5, 54, 1, {}); k.barrel(-24, 60.5, 0x2f6fd0); k.barrel(-25.2, 60.5, 0x3a8a4a); silo(k, -64, 59.5, 2.4, 10);
  /* ---- bases ---- */
  gateArch(k, 57, 0, 1, 8); campfire(k, 72, -8); tent(k, 77, 7, 3, 0xc8742a); tent(k, 77, -3, 3, 0x4a8a58); k.crate(58.6, 9.6, 0, 1.1); k.crate(58.6, -9.6, .2, 1.1); waterTower(k, 78.5, -9.5);
  for (const s of [-1, 1]) { k.begin(-82.5, s * 8, 0, Y); k.S(-.12, 0, -.12, .12, 5, .12, TX.wood, 0x6a4428, { us: 1, kind: 'wood' }); k.V(m => { m.mat(TX.cloth, 0, 30).col(0x2f6fd0).uvs(1, 1).box(1.6, 1.0, .04, .8, 4.4, 0); }); }
  k.crate(-66, -8.6, 0, 1.1); k.crate(-66, 8.6, .2, 1.1); k.barrel(-78, -44, 0x2f6fd0); k.barrel(-78, 44, 0xc03a2a); k.hayBale(-77, -20, 1, {}); k.crate(-68.5, 24, 0, 1.2);
  /* ---- marcadores dos sites ---- */
  const SA = A.sites.A, SB = A.sites.B;
  k.sites.A = { id: 'A', name: 'Moinho', ...SA, x: (SA.x0 + SA.x1) / 2, z: (SA.z0 + SA.z1) / 2, r: 11 };
  k.sites.B = { id: 'B', name: 'Celeiro', ...SB, x: (SB.x0 + SB.x1) / 2, z: (SB.z0 + SB.z1) / 2, r: 11 };
  for (const S of [k.sites.A, k.sites.B]) { siteMarker(k, S.x0, S.z0, S.x1, S.z1); siteLetter(k, S.id, S.x, S.z, 7.5, S.id === 'A' ? 0xffe27a : 0x9ad0ff); k.mm.push({ t: 'site', id: S.id, x: S.x, z: S.z }); }
  for (const [x, z, id, rot] of [[-23.4, -47.2, 'A', 1], [-35, -33, 'A', 0], [-65.4, -33, 'A', 0], [-19.4, 47.2, 'B', 1], [-35, 35, 'B', 0], [-65.4, 35, 'B', 0]]) arenaSign(k, x, z, id, rot, Y);
  /* ---- spawns (ataque olha para oeste, defesa para leste) ---- */
  for (let i = 0; i < 10; i++) k.spawns.atk.push({ x: 66 + Math.floor(i / 5) * 4, z: -6 + (i % 5) * 3, yaw: PI / 2 });
  for (let i = 0; i < 10; i++) k.spawns.def.push({ x: -78 + Math.floor(i / 5) * 4, z: -6 + (i % 5) * 3, yaw: -PI / 2 });
  /* ---- vegetação só fora da área jogável ---- */
  W.finalize(); const splat = k.splatFn();
  k.forest({ spacing: 5.2, tries: 9000, over: 6, tight: .9, density: (x, z) => { const e = Math.max(x > 0 ? x - 88 : -x - 90, Math.abs(z) - 68); return e > 0 ? Math.min(1, .55 + e * .05) : 0; }, kinds: (x, z, r) => { const q = r.f(); return q < .35 ? 'pine' : q < .6 ? 'euca' : 'oak'; } });
  for (let i = 0; i < 260; i++) { const x = R.range(-85, 83), z = R.range(-63, 63); if (!A.inWalk(x, z) || k.hitsBox(x, z, 1.2) || k.nearRoad(x, z, 2.2) || !k.dry(x, z, .5)) continue; if (R.chance(.5)) k.bush(x, z, R.range(.5, .8)); }
  k.scatterGrass(splat, .14); k.scatterFlowers(splat, 160);
  for (const c of A.callouts) k.mm.push({ t: 'label', x: c.x, z: c.z, name: c.name, small: true });
  const map = finishMap(k, splat, 'arena2', 'Moinho das Três Porteiras', 'tarde');
  map.viewB = { x0: -90, x1: 88, z0: -89, z1: 89 }; map.callouts = A.callouts;
  map.inPlay = (x, z) => A.inWalk(x, z) || A.houses.some(h => x >= h[0] - .3 && x <= h[2] + .3 && z >= h[1] - .3 && z <= h[3] + .3); map.maxStand = 3.4;
  map.tacB = { x0: -85, x1: 83, z0: -63, z1: 63 }; map.navCs = 1.0; map.roam = false;   /* Passagem exposta ao Pátio: defesa joga nos sites */ map.falls = []; map.regions = [];
  map.stage = { A: [{ x: 8, z: -54 }, { x: -8, z: -12 }], B: [{ x: 8, z: 54 }, { x: -8, z: 12 }] };
  map.playB = { x0: -86, x1: 84, z0: -64, z1: 64 };
  map.decorSpots = { ch: [[-4, 6, 6], [70, 4, 5], [-46, 50, 5], [-50, -48, 5]], pg: [[-28, 28, 3], [-76, 4, 4]] };
  return map;
}
/* registro de mapas competitivos (seleção no menu) */
const TAT_MAPS = [
  { id: 'arena', name: 'Vila do Roçado', desc: 'Norte–sul · celeiro e silos · riacho de flanco', build: () => buildArena(7) },
  { id: 'arena2', name: 'Moinho das Três Porteiras', desc: 'Leste–oeste · moinho e celeiro · vau no longo B', build: () => buildArena2(11) }
];
