/* =====================================================================
   23_fazenda.js — mapa "Fazenda do Zé": 500 x 500 m, exclusivo do Todos contra
   Todos / Battle Royale (o 5x5 tem mapa próprio: Vila do Roçado, 25_arena.js).
   ===================================================================== */
'use strict';
function containerStairs(k, x, z, rot, side, y0) {
  /* escada colada na lateral do contêiner (local): side 'E' (+x) / 'W' / 'S' / 'N' */
  k.begin(x, z, rot); const n = 13, run = .3, rise = 2.6 / n + .0;
  if (side === 'E') k.stairs(3.02 + n * run, 0, -1, 0, 1.1, n, rise, run, TX.plank2, 0xc8a070, y0 || 0);
  else if (side === 'W') k.stairs(-3.02 - n * run, 0, 1, 0, 1.1, n, rise, run, TX.plank2, 0xc8a070, y0 || 0);
  else if (side === 'S') k.stairs(-1.2, 1.22 + n * run, 0, -1, 1.1, n, rise, run, TX.plank2, 0xc8a070, y0 || 0);
  else k.stairs(-1.2, -1.22 - n * run, 0, 1, 1.1, n, rise, run, TX.plank2, 0xc8a070, y0 || 0);
}
function pastureFence(k, x0, z0, x1, z1, gateSide) {
  const g = [.42, .58];
  k.fence(x0, z0, x1, z0, { gate: gateSide === 'N' ? g : undefined }); k.fence(x1, z0, x1, z1, { gate: gateSide === 'E' ? g : undefined });
  k.fence(x1, z1, x0, z1, { gate: gateSide === 'S' ? g : undefined }); k.fence(x0, z1, x0, z0, { gate: gateSide === 'W' ? g : undefined });
}
/* chapadas (x, z, raio do topo, altura, direção da rampa em rad) */
const MESAS = [{ x: 205, z: -85, r: 17, h: 14, ramp: Math.PI }, { x: -95, z: -219, r: 15, h: 16, ramp: Math.PI / 2 }, { x: 150, z: 234, r: 12, h: 13, ramp: Math.PI }, { x: 228, z: 128, r: 11, h: 12, ramp: Math.PI }];
function mesaH(x, z, M) {
  const dx = x - M.x, dz = z - M.z; let d = Math.hypot(dx, dz); if (d > M.r + 46) return 0;
  d += (fbm(x * .06 + M.x, z * .06 - M.z, 2) - .5) * 7;
  let t = 1 - smooth(M.r, M.r + 4.5, d);                                   /* paredão quase vertical */
  t = t * (.94 + .06 * (1 - smooth(0, M.r, d)));                            /* topo levemente abaulado */
  const a = Math.atan2(dz, dx), da = Math.abs(((a - M.ramp + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  if (da < .42 && d > M.r - 2) { const rr = clamp(1 - (d - M.r + 2) / 36, 0, 1), side = 1 - smooth(.2, .42, da); t = Math.max(t, rr * side * .97); }
  const skirt = (1 - smooth(M.r + 3, M.r + 16, d)) * .12;                   /* talude de pedras no pé */
  return M.h * Math.max(t, skirt);
}
function buildFazenda(seed) {
  seed = seed || 20240611; const B = { x0: -250, x1: 250, z0: -250, z1: 250 }, k = new MapKit('fazenda', B, seed), R = k.R;
  k.setBase((x, z) => {
    let h = 1.2 + (fbm(x * .011 + 3, z * .011 - 2, 4) - .5) * 2.2 + (fbm(x * .04, z * .04 + 9, 3) - .5) * .8;
    h += smooth(40, 110, x) * 1.1 * (1 - smooth(140, 190, Math.abs(x)));
    /* colinas suaves fora do núcleo */
    const core = Math.max(smooth(132, 175, Math.abs(x)), smooth(100, 145, Math.abs(z)));
    h += core * ((fbm(x * .008 - 7, z * .008 + 4, 3) - .4) * 13) + (fbm(x * .02 + 3, z * .02 - 8, 3) - .5) * 3.2 * core;
    /* platô das cachoeiras (noroeste) */
    const pl = Math.hypot((x + 214) / 1.1, z + 216); h += 15 * (1 - smooth(26, 44, pl));
    /* serra na borda do mapa */
    const ex = Math.max(0, Math.abs(x) - 238), ez = Math.max(0, Math.abs(z) - 238), e = Math.hypot(ex, ez);
    h += 14 * (1 - Math.exp(-e / 15)) + e * .05 + (fbm(x * .03 + 5, z * .03, 3) - .5) * e * .3;
    /* chapadas: platôs com paredão de pedra e uma rampa de acesso (identificáveis do alto) */
    for (const M of MESAS) h += mesaH(x, z, M);
    return h;
  });
  /* ---- planos nivelados (pads) ---- */
  k.pad(-112, 0, 30, 56, { margin: 10 }); k.pad(104, 0, 18, 24); k.pad(100, -27, 18, 14); k.pad(106, 29, 20, 14); k.pad(88, 14, 6, 6);
  k.pad(66, -54, 66, 48, { h: 1.15, margin: 10 }); k.pad(68, 52, 60, 46, { h: 1.0, margin: 10 });
  k.pad(-27, -17, 40, 26); k.pad(24, 10, 20, 18); k.pad(31, -25, 14, 10); k.pad(-44, 62, 14, 12); k.pad(-8, 8, 6, 6, { margin: 3 });
  k.pad(-76, 50, 42, 30, { margin: 5 });
  REGIONS.pads(k);
  /* ---- água ---- */
  k.lake(-6, 36, 24, 14, -1.6); k.lakes[k.lakes.length - 1].isl = [[-10, 37, 6]]; k.lake(-72, -76, 11, 8, -1.1);
  k.creek([[-66, -100], [-52, -80], [-36, -64], [-26, -50], [-10, -38], [4, -26], [8, -12], [4, 2], [-2, 14], [-6, 24]], 2.6, -.55);
  /* ---- estradas de terra ---- */
  k.road([[-104, 0], [-72, 2], [-40, 1], [-10, 3], [20, 3], [50, 0], [80, 0], [98, 0]], 4.5);
  k.road([[-104, -30], [-82, -40], [-50, -45], [-20, -45], [10, -46], [36, -46], [52, -46]], 4);
  k.road([[-104, 30], [-82, 38], [-54, 38], [-36, 52], [-10, 58], [20, 56], [44, 48], [54, 46]], 4);
  k.road([[98, 0], [96, -20], [86, -40], [70, -48]], 4); k.road([[98, 0], [96, 22], [86, 40], [70, 48]], 4);
  k.road([[40, -46], [44, -20], [47, 0], [46, 24], [47, 47]], 3.6); k.road([[100, -27], [92, -22], [90, -6]], 3);
  REGIONS.water(k); REGIONS.roads(k);
  k.yards = [{ x0: 52, z0: -56, x1: 64, z1: -36, m: 6, k: .9 }, { x0: 52, z0: 36, x1: 64, z1: 56, m: 6, k: .9 }, { x0: -122, z0: -12, x1: -102, z1: 12, m: 6, k: .85 }, { x0: 86, z0: -12, x1: 100, z1: 12, m: 5, k: .7 }, { x0: 17, z0: 3, x1: 31, z1: 16, m: 3, k: .6 }, { x0: 101, z0: -10, x1: 112, z1: 10, m: 4, k: .6 }, { x0: 71, z0: -62, x1: 90, z1: -56, m: 4, k: .7 }, { x0: -39, z0: -23, x1: -16, z1: -8, m: 4, k: .6 }];
  k.commitTerrain(1);
  const W = k.W;
  /* ---- campos ---- */
  k.field(22, 24, 46, 43, 'corn'); k.field(22, 51, 46, 86, 'corn'); k.field(-96, 42, -58, 66, 'cassava');
  k.field(-60, -92, -50, -52, 'pasture');
  REGIONS.build(k);
  /* ---- ATK: acampamento ---- */
  const FZ = [[-44, -34], [-26, -4], [4, 26], [34, 44]]; for (const [a, b] of FZ) k.fence(-98, a, -98, b);
  k.fence(-98, -44, -128, -44); k.fence(-98, 44, -128, 44);
  gateArch(k, -98, 0, 1, 8); gateArch(k, -98, -30, 1, 8); gateArch(k, -98, 30, 1, 8);
  pickup(k, -116, -15, 1, 0x3a78b0); tractor(k, -118, 20, 0, 0x4a8a3a); campfire(k, -111, 0); tent(k, -121, -5, 0, 0x4a8a58); tent(k, -121, 5, 0, 0xc8742a); tent(k, -121, 12, 0, 0x4a6ab0);
  for (const [x, z] of [[-106, 11], [-107, -11], [-125, -22], [-124, 30]]) k.hayBale(x, z, 0, { round: true });
  for (const [x, z] of [[-104, -6], [-104, 6], [-118, -26]]) k.barrel(x, z, R.pick([0xc03a2a, 0x2f6fd0, 0x3a8a4a]));
  k.crate(-108, 22, .3, 1.1); k.crate(-108, 23.3, 0, .9); k.crate(-113, -26, 0, 1.2); k.crate(-113, -27.3, .5, 1.0);
  farmhouse(k, -126, 34, 1, 1, { w: 7, d: 6, floors: 1, porch: 0, back: false, furnish: false });
  /* ---- DEF: casa grande ---- */
  farmhouse(k, 106, 0, 3, 0, { w: 16, d: 10, floors: 2, pal: PAL_SEDE });
  coop(k, 100, -26, 0); k.fence(93, -32, 107, -32); k.fence(107, -32, 107, -20); k.fence(107, -20, 93, -20); k.fence(93, -20, 93, -32, { gate: [.3, .5] });
  shed(k, 106, 29, 0, 14, 8); tractor(k, 106, 29, 0, 0xc03a22); k.crate(112, 33, 0, 1); k.hayBale(98, 32, 0, {});
  pigpen(k, 124, 17, 10, 8);   well(k, 90, 14); outhouse(k, 118, -14, 1); stoneWall(k, 88, 20, 94, 20.6, .9); stoneWall(k, 88, -16, 92, -15.4, .9);
  /* ---- Ponto A: celeiro ---- */
  barn(k, 76, -68, 0, { w: 26, d: 14 }); silo(k, 94, -50, 3.2, 12.5); tractor(k, 43, -56, 1, 0xc03a22);
  k.crate(58, -57, 0, 1.2); k.crate(58, -57, .2, 1.0, { base: 1.2 }); k.crate(60, -57.2, 0, .9); k.hayBale(51, -43, 0, { round: true }); k.hayBale(64, -52, 1, {}); k.hayBale(65.5, -52, 1, {}); k.hayBale(55, -39.5, 0, {}); k.hayBale(53.3, -39.5, 0, {});
  k.container(40, -35, 0, CONT_COLS[1]); k.container(40, -35, 0, CONT_COLS[0], { base: 2.6 }); containerStairs(k, 40, -35, 0, 'E', 0);
  k.container(40, -30.3, 0, CONT_COLS[3]);
  k.crate(78, -50, .4, 1.1); k.crate(79.2, -50.5, 1, 1.0); k.barrel(82, -52, 0x2f6fd0); k.barrel(83, -51.2, 0xc03a2a); k.barrel(82.5, -50, 0x3a8a4a);
  k.hayBale(86, -58, 0, { round: true }); k.hayBale(86, -55.5, 0, { round: true });
  stoneWall(k, 68, -37, 76, -36.5, 1.0);
  /* ---- Ponto B: milharal / caixa d'água ---- */
  waterTower(k, 74, 64); shed(k, 84, 46, 0, 14, 8); k.hayBale(84, 46, 0, { round: true }); k.hayBale(87, 48, 1, {}); k.crate(80, 44, .2, 1.1); k.crate(81.2, 44, 0, 1.0); k.crate(80.4, 44.1, 0, .9, { base: 1.1 });
  windmill(k, 94, 28, 11.5); pickup(k, 60, 68, 0, 0xc84a2a);
  k.container(52, 70, 1, CONT_COLS[2]); k.container(52, 76, 1, CONT_COLS[4]); k.container(52, 70, 1, CONT_COLS[5], { base: 2.6 }); containerStairs(k, 52, 70, 1, 'E', 0);
  k.crate(62, 38, 0, 1.2); k.crate(63.3, 38.4, .7, 1.0); k.crate(50.4, 49.6, 0, 1.0); k.hayBale(66, 54.5, 0, {}); k.hayBale(65.5, 41, 1, {}); k.barrel(48.5, 44, 0xe0a020); k.barrel(48.5, 45.2, 0xc03a2a);
  stoneWall(k, 56, 56, 64, 56.5, 1.0);
  /* ---- Centro ---- */
  const depot = [[-34, -20, 0, 0], [-27, -20, 0, 1], [-31, -15, 0, 2], [-24, -15, 0, 3]]; depot.forEach(([x, z, r, c]) => k.container(x, z, r, CONT_COLS[c]));
  k.container(-34, -20, 0, CONT_COLS[4], { base: 2.6 }); k.container(-24, -15, 0, CONT_COLS[1], { base: 2.6 }); containerStairs(k, -24, -15, 0, 'E', 0); containerStairs(k, -34, -20, 0, 'W', 0);
  k.container(-17, -22, 1, CONT_COLS[3]); k.container(-17, -11, 1, CONT_COLS[6]); k.crate(-12, -18, .1, 1.2); k.crate(-12, -16.7, 0, 1.0); k.barrel(-14, -8, 0xc03a2a); k.barrel(-39, -14, 0x2f6fd0); k.barrel(-39.9, -13, 0xe0a020);
  farmhouse(k, 24, 10, 0, 2, { w: 12, d: 9, floors: 2 }); coop(k, 31, -25, 0); k.fence(24, -30, 38, -30); k.fence(38, -30, 38, -19); k.fence(38, -19, 24, -19); k.fence(24, -19, 24, -30, { gate: [.62, .8] });
  well(k, -8, 8); k.tree('oak', -17, 7, 1.5); stoneWall(k, 8, -33, 17, -32.4, 1.0); stoneWall(k, 10, 24, 11, 31, 1.0);
  k.hayBale(36, 2, 0, { round: true }); k.hayBale(36, 5, 1, {}); k.crate(14, 2, .3, 1.0); k.barrel(13, 5, 0x3a8a4a);
  bridge(k, -19.3, -45, 1, 8, 3.4); bridge(k, 4, 1.5, 1, 8, 3.6);
  /* ---- faixa norte: pasto ---- */
  pastureFence(k, -90, -92, -52, -52, 'S'); cow(k, -82, -66, .5); cow(k, -68, -62, 2); cow(k, -62, -84, 4); cow(k, -84, -84, 1); cow(k, -78, -58, 3);
  k.hayBale(-86, -56, 0, { round: true }); stoneWall(k, -70, -50, -62, -49.5, .9); k.crate(-56, -50, 0, 1.1);
  /* ---- faixa sul: mandioca ---- */
  pastureFence(k, -97, 41, -57, 67, 'N'); scarecrow(k, -78, 53, 0); farmhouse(k, -44, 62, 0, 4, { w: 9, d: 7, floors: 1, back: true, furnish: false });
  k.hayBale(-50, 48, 0, { round: true }); k.crate(-36, 44, .3, 1.0); k.barrel(-34, 46, 0xc03a2a);
  /* ---- núcleo da fazenda (sem bombsites: este mapa é só do Battle Royale) ---- */
  for (const r of [{ name: 'Sede da Fazenda', x: 106, z: 12 }, { name: 'Celeiro Grande', x: 76, z: -80 }, { name: "Caixa d'Água", x: 70, z: 76 }, { name: 'Depósito Central', x: -27, z: -28 }, { name: 'Acampamento dos Peões', x: -116, z: -32 }, { name: 'Casa do Meio', x: 24, z: 22 }, { name: 'Pasto Norte', x: -71, z: -96 }, { name: 'Roça de Mandioca', x: -77, z: 72 }]) k.mm.push({ t: 'label', x: r.x, z: r.z, name: r.name });
  /* ---- spawns ---- */
  const sp = (arr, x, z, yaw) => arr.push({ x, z, yaw });
  for (const [x, z] of [[-112, -8], [-112, -4], [-112, 4], [-112, 8], [-108, 0], [-108, -9], [-108, 9], [-116, 0], [-116, -9], [-116, 9]]) sp(k.spawns.atk, x, z, -PI / 2);
  for (const [x, z] of [[92, -8], [92, -4], [92, 4], [92, 8], [88, 0], [88, -9], [88, 9], [95, -12], [95, 12], [96, 0]]) sp(k.spawns.def, x, z, PI / 2);
  /* ---- vegetação ---- */
  W.finalize(); const splat = k.splatFn(); const sm = smooth;
  k.forest({ spacing: 5.6, tries: 34000, over: 30, tight: .9, density: (x, z) => {
      /* anel de mata ao redor do núcleo + manchas de mata no anel externo (as regiões ficam limpas pelos pads) */
      const ring = Math.max(sm(92, 124, Math.abs(x)), sm(70, 94, Math.abs(z))) * (1 - Math.max(sm(136, 150, Math.abs(x)), sm(104, 118, Math.abs(z)))), outer = Math.max(sm(140, 160, Math.abs(x)), sm(108, 128, Math.abs(z)));
      const blob = sm(.48, .62, fbm(x * .012 + 40, z * .012 - 17, 3)), edge = Math.max(sm(222, 246, Math.abs(x)), sm(222, 246, Math.abs(z)));
      const cl = sm(.6, .74, fbm(x * .03 + 40, z * .03 - 17, 3)) * .6 * (1 - outer);
      return Math.min(1, ring * .98 + cl + outer * (blob * .95 + edge * .9)); },
    kinds: (x, z, r) => { const e = Math.max(Math.abs(x) - 100, Math.abs(z) - 74); const q = r.f(); return e > 18 ? (q < .55 ? 'pine' : q < .8 ? 'euca' : 'oak') : (q < .5 ? 'oak' : q < .8 ? 'euca' : 'pine'); } });
  for (const [x, z] of [[95, 8], [112, 12], [112, -14], [20, -6], [-6, 16], [-50, 50], [-36, 68], [-28, -52], [82, -78]]) k.tree('banana', x + R.range(-1, 1), z + R.range(-1, 1), 1);
  for (let i = 0; i < 260; i++) { const x = R.range(B.x0, B.x1), z = R.range(B.z0, B.z1); if (!k.dry(x, z, .6) || k.nearRoad(x, z, 3) || k.inPad(x, z, 2) || k.inField(x, z, 2) || k.hitsBox(x, z, 1.4)) continue; k.rock(x, z, R.range(.7, 1.5)); }
  for (let i = 0; i < 900; i++) { const x = R.range(B.x0, B.x1), z = R.range(B.z0, B.z1); if (!k.dry(x, z, .5) || k.nearRoad(x, z, 2.5) || k.inField(x, z, 1) || k.hitsBox(x, z, 1)) continue; k.bush(x, z, R.range(.7, 1.3)); }
  k.scatterGrass(splat, .2); k.scatterFlowers(splat, 900);
  REGIONS.plant(k);
  k.tree('pine', -10, 37, 1.1); k.tree('oak', -12, 35, .8); rowboat(k, 6, 40, 1);
  k.plantField(22, 24, 46, 43, 'corn'); k.plantField(22, 51, 46, 86, 'corn'); k.plantField(-96, 42, -58, 66, 'cassava', .8, .8);
  const map = finishMap(k, splat, 'fazenda', 'Fazenda do Zé', 'dia');
  map.navCs = 1.5; map.falls = k.falls || []; map.regions = REGIONS.list; return map;
}
/* monta o objeto-mapa final */
function finishMap(k, splat, id, name, env) {
  const t0 = nowS(); k.W.finalize();
  const terr = k.terrainMeshes(splat), water = k.waterMeshes(), fm = k.fieldMeshes(), render = k.finishRender({ terrain: terr, water });
  if (!fm.empty) render.chunks.push({ mb: fm });
  if (k.falls && k.falls.length) { const fmb = REGIONS.fallMesh({ falls: k.falls, W: k.W }); if (!fmb.empty) render.trans.push({ mb: fmb }); }
  return { id, name, env, W: k.W, kit: k, bounds: k.b, spawns: k.spawns, sites: k.sites, anim: k.anim, animals: k.animals, mm: k.mm, roads: k.roads, lakes: k.lakes, creeks: k.creeks || [], fields: k.fields, loot: k.loot, hfn: k.hfn, splat, render, buildMs: (nowS() - t0) * 1000 };
}
