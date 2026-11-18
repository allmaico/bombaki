/* =====================================================================
   27_arena3.js — "FAZENDA DO MILHARAL": terceiro mapa COMPETITIVO do 5x5
   Norte–sul: DEFESA ao norte (acesso livre ao A e ao B na compra),
   ATAQUE ao sul (preso no spawn pelas barreiras até o round começar).

                       [ SPAWN DEFENSORES ]
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
            [A] Celeiro    Árvore      [B] Armazém
                 ▲ ◄── A Curto ─ CONTROLE ─ B Curto ──► ▲
                 ║            DO MID                    ║
              A MAIN           MID                   B MAIN
                 ╚════════[ SPAWN ATACANTES ]═══════════╝
                 (barreira)   (barreira)    (barreira)
   • 3 saídas do ataque (A Main, Mid, B Main) = 3 barreiras de compra.
   • Meio: Controle do Mid (praça) liga A Curto e B Curto; a Árvore (meio alto)
     é a rotação da defesa entre A e B.
   • Milharais nas bordas, caixas-d'água, moinhos, celeiro vermelho, tratores.
   ===================================================================== */
'use strict';
const ARENA3 = Object.assign({}, ARENA, {
  Y: 1.0, H: 5.2, L: { x0: -66, x1: 66, z0: -72, z1: 72 },
  walk: [
    [-14, 50, 14, 70],                                   /* spawn dos atacantes */
    [-16, 40, 16, 50],                                   /* pátio do ataque */
    [-52, 40, -16, 49], [16, 40, 52, 49],                /* A Main / B Main (saída leste–oeste) */
    [-56, -4, -42, 49], [42, -4, 56, 49],                /* A Main / B Main (subida ao site) */
    [-4, 8, 4, 40],                                      /* Mid (corredor) */
    [-17, -5, 17, 8],                                    /* Controle do Mid (praça) */
    [-42, -3, -17, 3], [17, -3, 42, 3],                  /* A Curto / B Curto */
    [-62, -32, -38, -4], [38, -32, 62, -4],              /* bombsites A / B */
    [-11, -26, 11, -5],                                  /* Árvore (meio alto) */
    [-38, -23, -11, -17], [11, -23, 38, -17],            /* ligação Árvore ↔ A / B (rotação) */
    [-14, -70, 14, -54],                                 /* spawn da defesa */
    [-4, -54, 4, -26],                                   /* corredor central da defesa */
    [-52, -62, -14, -54], [14, -62, 52, -54],            /* defesa → A / B (norte) */
    [-52, -54, -42, -32], [42, -54, 52, -32]             /* descida até os sites */
  ],
  houses: [],
  sites: { A: { x0: -60, z0: -30, x1: -40, z1: -8 }, B: { x0: 40, z0: -30, x1: 60, z1: -8 } },
  callouts: [
    { name: 'Spawn Ataque', x: 0, z: 60 }, { name: 'Spawn Defesa', x: 0, z: -62 }, { name: 'A Main', x: -49, z: 26 }, { name: 'B Main', x: 49, z: 26 },
    { name: 'Mid', x: 0, z: 24 }, { name: 'Controle do Mid', x: 0, z: 2 }, { name: 'A Curto', x: -30, z: 0 }, { name: 'B Curto', x: 30, z: 0 },
    { name: 'Árvore', x: 0, z: -16 }, { name: 'Rotação A', x: -24, z: -20 }, { name: 'Rotação B', x: 24, z: -20 }, { name: 'Fundo A', x: -47, z: -44 }, { name: 'Fundo B', x: 47, z: -44 },
    { name: 'Celeiro (A)', x: -50, z: -19 }, { name: 'Armazém (B)', x: 50, z: -19 }, { name: 'Curva A', x: -34, z: 45 }, { name: 'Curva B', x: 34, z: 45 }
  ]
});
/* estilo dos blocos: celeiro vermelho no oeste, galpões cinza no leste, sede ao norte, barracões no sul */
function arena3Style(cx, cz) {
  if (cz < -50) return 'sede';
  if (cz > 46) return 'galpao';
  if (cx < -20) return cz < 10 ? 'barn' : 'casa';
  if (cx > 20) return cz < 10 ? 'galpao' : 'casa';
  return Math.abs(cz) < 14 ? 'casa' : 'pedra';
}
function buildArena3(seed) {
  seed = seed || 13; const A = ARENA3, Y = A.Y, B = { x0: -120, x1: 120, z0: -100, z1: 100 }, k = new MapKit('arena3', B, seed), R = k.R;
  k.setBase((x, z) => { const ex = Math.max(0, Math.abs(x) - 68), ez = Math.max(0, Math.abs(z) - 74), e = Math.hypot(ex, ez); return Y + (e > 0 ? e * .18 + (fbm(x * .03 + 3, z * .03, 3) - .3) * Math.min(e, 12) * .5 : 0); });
  /* milharais nas bordas (fora da área de jogo) */
  for (const s of [-1, 1]) { k.field(s > 0 ? 72 : -112, -64, s > 0 ? 112 : -72, -6, 'corn'); k.field(s > 0 ? 72 : -112, 6, s > 0 ? 112 : -72, 64, 'corn'); }
  /* caminhos de terra */
  k.road([[0, 66], [0, 44]], 5); k.road([[-14, 44], [-49, 44], [-49, -4]], 4); k.road([[14, 44], [49, 44], [49, -4]], 4); k.road([[0, 40], [0, 2]], 3.4);
  k.road([[-17, 0], [-40, 0]], 3); k.road([[17, 0], [40, 0]], 3); k.road([[0, -62], [0, -28]], 3); k.road([[-14, -58], [-47, -58], [-47, -32]], 3); k.road([[14, -58], [47, -58], [47, -32]], 3);
  k.road([[-11, -20], [-38, -20]], 2.6); k.road([[11, -20], [38, -20]], 2.6);
  k.yards = [{ x0: -14, z0: 50, x1: 14, z1: 70, m: 3, k: .7 }, { x0: -14, z0: -70, x1: 14, z1: -54, m: 3, k: .6 }, { x0: -17, z0: -5, x1: 17, z1: 8, m: 3, k: .55 }, { x0: -62, z0: -32, x1: -38, z1: -4, m: 3, k: .5 }, { x0: 38, z0: -32, x1: 62, z1: -4, m: 3, k: .5 }];
  k.commitTerrain(1); const W = k.W;
  /* ---- volumes sólidos (o "negativo" das áreas de jogo) ---- */
  for (const r of A.solids()) arenaBlock(k, r, A, arena3Style);
  /* ---- spawn dos atacantes: tendas, fogueira, portal, caminhão ---- */
  gateArch(k, 0, 50.5, 0, 9); campfire(k, -8, 64); tent(k, 9, 66, 3, 0xc8742a); tent(k, -9, 58, 3, 0x4a8a58); k.crate(12.4, 52, 0, 1.1); k.crate(-12.4, 52, .2, 1.1); k.crate(12.4, 53.2, .1, 1.0); pickup(k, 6, 58, 1, 0x3a6aa8);
  /* ---- A Main / B Main: curvas com cobertura, trator e caixas ---- */
  k.crate(-30, 41.6, 0, 1.2); k.crate(-30, 42.8, .2, 1.0, { base: 1.2 }); k.hayBale(-38, 47.4, 1, {}); k.crate(-44, 30, .1, 1.2); k.crate(-54.4, 18, 0, 1.2); k.crate(-54.4, 19.2, .3, 1.0); tractor(k, -51, 8, 1, 0xc03a22); k.hayBale(-44.5, 0, 0, { round: true });
  k.crate(30, 47.4, 0, 1.2); k.crate(30, 46.2, .2, 1.0, { base: 1.2 }); k.hayBale(38, 41.6, 1, {}); k.crate(44, 30, .1, 1.2); k.crate(54.4, 18, 0, 1.2); k.crate(54.4, 19.2, .3, 1.0); pickup(k, 51, 8, 1, 0xc84a2a); k.hayBale(44.5, 0, 0, { round: true });
  scarecrow(k, -47, 36, 1); scarecrow(k, 47, 36, 1);
  /* ---- Mid: corredor com caixas que quebram a visão ---- */
  k.crate(2.6, 30, 0, 1.0); k.crate(-2.6, 20, .2, 1.0); k.barrel(2.6, 12, 0xe0a020);
  /* ---- Controle do Mid: trator vermelho, caixas, poço ---- */
  tractor(k, 9, 4, 0, 0xd8322a); k.crate(-9, -2, .2, 1.2); k.crate(-10.2, -2, 0, 1.0, { base: 1.2 }); well(k, -12, 5); k.hayBale(13, -3, 1, {}); k.barrel(-15.5, 6.5, 0x3a8a4a);
  /* ---- A Curto / B Curto ---- */
  k.crate(-26, 1.6, 0, 1.1); k.crate(-36, -1.6, .2, 1.1); k.crate(26, -1.6, 0, 1.1); k.crate(36, 1.6, .2, 1.1);
  /* ---- Árvore (meio alto): grande árvore no centro + rotação da defesa ---- */
  k.tree('oak', 0, -15, 1.6); k.hayBale(-6, -24, 0, {}); k.crate(6.5, -8, .2, 1.1); k.crate(-24, -18, 0, 1.1); k.crate(24, -22, .2, 1.1);
  /* ---- bombsite A: Celeiro (palheiro elevado, feno, caixas) ---- */
  hayLoft(k, -57, -27, Y, 1);
  for (const [x, z, r] of [[-50, -20, 0], [-48.6, -20, 0], [-44, -14, 1], [-55, -12, 1]]) k.hayBale(x, z, r, {}); k.crate(-44, -26, .2, 1.2); k.crate(-44, -26, 0, 1.0, { base: 1.2 }); k.crate(-58.5, -6, 0, 1.2); k.barrel(-40, -30, 0xc03a2a); k.barrel(-41.2, -30, 0xe0a020);
  /* ---- bombsite B: Armazém (contêiner elevado, caixas, silo ao fundo) ---- */
  k.container(57, -24, 0, CONT_COLS[1]); containerStairs(k, 57, -24, 0, 'W', 0); k.mm.push({ t: 'rect', x0: 54, z0: -25.2, x1: 60, z1: -22.8, c: '#3a6a9a' });
  for (const [x, z, r] of [[50, -18, 0], [48.8, -18.2, .2], [44, -12, .1], [55, -10, 0]]) k.crate(x, z, r, 1.2); k.crate(49.4, -18, 0, 1.0, { base: 1.2 }); k.hayBale(42, -27, 1, {}); k.barrel(60, -6, 0x2f6fd0);
  /* ---- spawn da defesa: bandeiras azuis, caixas ---- */
  for (const s of [-1, 1]) { k.begin(s * 12.5, -68, 0, Y); k.S(-.12, 0, -.12, .12, 5, .12, TX.wood, 0x6a4428, { us: 1, kind: 'wood' }); k.V(m => { m.mat(TX.cloth, 0, 30).col(0x2f6fd0).uvs(1, 1).box(1.6, 1.0, .04, .8, 4.4, 0); }); }
  k.crate(-10, -56, 0, 1.1); k.crate(10, -56, .2, 1.1); k.barrel(-30, -60.5, 0x2f6fd0); k.barrel(30, -60.5, 0xc03a2a); k.hayBale(-47, -40, 1, {}); k.crate(47, -42, 0, 1.2);
  /* ---- marcos de fundo: caixas-d'água, moinhos, silos, celeiro (fora da área) ---- */
  waterTower(k, -78, 22); waterTower(k, 80, -66); windmill(k, 82, 30, 11); windmill(k, -84, -62, 10); silo(k, 74, -14, 2.6, 11); silo(k, -76, -10, 2.4, 10);
  tractor(k, -82, 44, 1, 0xc03a22); pickup(k, -30, 84, 0, 0x4a7ab0);
  /* ---- marcadores dos sites ---- */
  const SA = A.sites.A, SB = A.sites.B;
  k.sites.A = { id: 'A', name: 'Celeiro', ...SA, x: (SA.x0 + SA.x1) / 2, z: (SA.z0 + SA.z1) / 2, r: 11 };
  k.sites.B = { id: 'B', name: 'Armazém', ...SB, x: (SB.x0 + SB.x1) / 2, z: (SB.z0 + SB.z1) / 2, r: 11 };
  for (const S of [k.sites.A, k.sites.B]) { siteMarker(k, S.x0, S.z0, S.x1, S.z1); siteLetter(k, S.id, S.x, S.z, 7.5, S.id === 'A' ? 0xffe27a : 0x9ad0ff); k.mm.push({ t: 'site', id: S.id, x: S.x, z: S.z }); }
  for (const [x, z, id, rot] of [[-41.6, 1.5, 'A', 1], [-55.5, -2.5, 'A', 0], [-41.6, -21.5, 'A', 1], [41.6, 1.5, 'B', 1], [55.5, -2.5, 'B', 0], [41.6, -21.5, 'B', 1]]) arenaSign(k, x, z, id, rot, Y);
  /* ---- spawns ---- */
  for (let i = 0; i < 10; i++) k.spawns.atk.push({ x: -8 + (i % 5) * 4, z: 58 + Math.floor(i / 5) * 4, yaw: 0 });
  for (let i = 0; i < 10; i++) k.spawns.def.push({ x: -8 + (i % 5) * 4, z: -66 + Math.floor(i / 5) * 4, yaw: PI });
  /* ---- vegetação: milho nos campos, mata fora, arbustos dentro ---- */
  W.finalize(); const splat = k.splatFn();
  for (const s of [-1, 1]) { k.plantField(s > 0 ? 72 : -112, -64, s > 0 ? 112 : -72, -6, 'corn'); k.plantField(s > 0 ? 72 : -112, 6, s > 0 ? 112 : -72, 64, 'corn'); }
  k.forest({ spacing: 5.4, tries: 7000, over: 6, tight: .9, density: (x, z) => { const e = Math.max(Math.abs(x) - 70, Math.abs(z) - 76); if (Math.abs(x) > 70 && Math.abs(x) < 114 && Math.abs(z) < 66) return 0; return e > 0 ? Math.min(1, .55 + e * .05) : 0; }, kinds: (x, z, r) => { const q = r.f(); return q < .3 ? 'pine' : q < .55 ? 'euca' : 'oak'; } });
  for (let i = 0; i < 240; i++) { const x = R.range(-65, 65), z = R.range(-71, 71); if (!A.inWalk(x, z) || k.hitsBox(x, z, 1.2) || k.nearRoad(x, z, 2.2) || !k.dry(x, z, .5)) continue; if (R.chance(.5)) k.bush(x, z, R.range(.5, .8)); }
  k.scatterGrass(splat, .14); k.scatterFlowers(splat, 160);
  for (const c of A.callouts) k.mm.push({ t: 'label', x: c.x, z: c.z, name: c.name, small: true });
  const map = finishMap(k, splat, 'arena3', 'Fazenda do Milharal', 'dia');
  map.viewB = { x0: -78, x1: 78, z0: -80, z1: 80 }; map.callouts = A.callouts;
  map.inPlay = (x, z) => A.inWalk(x, z); map.maxStand = 3.4;
  map.tacB = { x0: -65, x1: 65, z0: -71, z1: 71 }; map.navCs = 1.0; map.falls = []; map.regions = [];
  map.stage = { A: [{ x: -49, z: 22 }, { x: -6, z: 4 }], B: [{ x: 49, z: 22 }, { x: 6, z: 4 }] };
  map.playB = { x0: -66, x1: 66, z0: -72, z1: 72 };
  map.decorSpots = { ch: [[0, 60, 5], [-30, 0, 4], [48, -40, 4]], pg: [[-12, 66, 3]] };
  return map;
}
TAT_MAPS.push({ id: 'arena3', name: 'Fazenda do Milharal', desc: 'Norte–sul · milharais nas bordas · 3 saídas do ataque · defesa livre até A e B', build: () => buildArena3(13) });
