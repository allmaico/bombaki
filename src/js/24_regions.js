/* =====================================================================
   24_regions.js — regiões do anel externo do mapa 500 x 500 (Battle Royale):
   fazenda vizinha, fazenda abandonada, celeiro incendiado, grande milharal,
   pastagem, sítio antigo, rios (fundos, com pontes), cachoeiras, vila rural,
   galpões/depósitos e manchas de mata. Construções com portas abertas e
   interiores simples (sem vidro complexo) para manter o desempenho.
   ===================================================================== */
'use strict';
const PAL_OLD = { wall: { tex: TX.wood, col: 0x8a7a66, us: .5 }, roof: { tex: TX.metal, col: 0x6a5a52, h: 1.6, us: .4 }, shutters: 0x4a3a2a, trim: 0x9a8a78, mmc: '#7a6a58' };
const PAL_BURNT = { wall: { tex: TX.wood, col: 0x3a3029, us: .5 }, roof: { tex: TX.metal, col: 0x2a2421, h: 1.8, us: .4 }, shutters: 0x1a1612, trim: 0x4a4038, mmc: '#3a3029' };
const REGIONS = {
  list: [
    { id: 'vizinha', name: 'Fazenda Vizinha', x: 178, z: -172 }, { id: 'abandonada', name: 'Fazenda Abandonada', x: -20, z: -196 },
    { id: 'incendiado', name: 'Celeiro Incendiado', x: 95, z: -200 }, { id: 'milharal', name: 'Grande Milharal', x: 75, z: 182 },
    { id: 'pasto', name: 'Pastagem', x: -208, z: 40 }, { id: 'sitio', name: 'Sítio Antigo', x: -192, z: 186 },
    { id: 'rio', name: 'Rio das Pedras', x: -168, z: -40 }, { id: 'cachoeira', name: 'Cachoeiras', x: -200, z: -200 },
    { id: 'vila', name: 'Vila do Bom Jesus', x: 172, z: 178 }, { id: 'galpoes', name: 'Galpões e Depósitos', x: 205, z: 40 }
  ],
  /* terreno nivelado das construções (antes de fixar o terreno) */
  pads(k) {
    k.pad(178, -172, 74, 58, { margin: 10 }); k.pad(-20, -196, 52, 40, { margin: 8 }); k.pad(95, -200, 40, 30, { margin: 8 });
    k.pad(-192, 186, 44, 36, { margin: 8 }); k.pad(172, 178, 76, 64, { margin: 10 }); k.pad(205, 40, 62, 74, { margin: 10 });
    k.pad(-208, 40, 22, 18, { margin: 6 }); k.pad(-150, -150, 14, 10, { margin: 4 });
  },
  /* rio fundo (dá para nadar), lagoas e o poço da cachoeira */
  water(k) {
    k.creek([[-186, -196], [-176, -160], [-170, -120], [-178, -70], [-172, -20], [-160, 30], [-150, 80], [-156, 130], [-142, 180], [-130, 252]], 8, -3.3);
    k.lake(-180, -184, 17, 13, -3.6);            /* poço da cachoeira */
    k.lake(-222, 76, 13, 9, -2.6);               /* açude da pastagem */
    k.lake(132, -128, 12, 9, -2.4);              /* lagoa perto da fazenda vizinha */
    k.lake(110, 120, 10, 8, -2.2);
    (k.falls || (k.falls = [])).push({ x: -194, z: -197, yaw: -0.8, w: 9 }, { x: -202, z: -190, yaw: -1.1, w: 5 });
  },
  roads(k) {
    k.road([[98, 0], [140, 10], [175, 30], [205, 40]], 4); k.road([[205, 40], [202, 110], [182, 160], [172, 178]], 4);
    k.road([[86, -40], [120, -90], [150, -140], [178, -172]], 4); k.road([[120, -90], [104, -150], [95, -200]], 3.6); k.road([[95, -200], [40, -206], [-20, -196]], 3.6);
    k.road([[-104, 0], [-140, -4], [-175, 4], [-205, 40]], 4); k.road([[-205, 40], [-212, 110], [-192, 186]], 3.6);
    k.road([[20, 56], [30, 100], [62, 138], [75, 150]], 3.6); k.road([[-36, 52], [-60, 110], [-110, 168], [-192, 186]], 3.6);
    k.road([[-104, -30], [-130, -80], [-150, -150]], 3.4); k.road([[47, 47], [100, 100], [150, 150], [172, 178]], 3.6);
    k.road([[-20, -196], [-60, -150], [-104, -30]], 3.4);
  },
  /* construções e objetos (depois de fixar o terreno) */
  build(k) {
    const R = k.R;
    /* --- Fazenda Vizinha --- */
    farmhouse(k, 170, -186, 0, 2, { w: 13, d: 9, floors: 2 }); barn(k, 196, -160, 1, { w: 22, d: 13 }); silo(k, 212, -186, 3, 11); silo(k, 218, -178, 2.4, 9);
    coop(k, 154, -160, 0); tractor(k, 182, -166, 0, 0x3a8a3a); pickup(k, 160, -170, 1, 0x2f6fd0); well(k, 186, -190);
    pastureFence(k, 140, -205, 165, -190, 'N'); for (let i = 0; i < 3; i++) cow(k, 147 + i * 6, -199 + (i % 2) * 4, i);
    for (const [x, z] of [[176, -160], [178, -158], [204, -192]]) k.hayBale(x, z, 0, { round: true }); k.crate(166, -176, 0, 1.1); k.barrel(168, -176, 0x2f6fd0);
    /* --- Fazenda Abandonada --- */
    farmhouse(k, -24, -204, 0, 0, { w: 11, d: 8, floors: 2, pal: PAL_OLD, furnish: false }); shed(k, -2, -192, 1, 10, 7); scarecrow(k, -40, -186, 1);
    k.fence(-44, -214, -30, -214); k.fence(-10, -214, 4, -214); k.fence(-44, -214, -44, -200); stoneWall(k, -6, -180, 2, -179.4, .7);
    for (let i = 0; i < 6; i++) k.crate(-14 + R.range(-6, 6), -182 + R.range(-3, 3), R.f(), R.range(.8, 1.2)); k.barrel(-8, -205, 0x6a4a2a); tractor(k, -36, -192, 2, 0x7a5a3a);
    /* --- Celeiro Incendiado --- */
    barn(k, 95, -204, 0, { w: 22, d: 12, wallCol: 0x4a3a32, roofCol: 0x221d1a, trimCol: 0x3a302a }); for (let i = 0; i < 8; i++) k.crate(84 + R.range(0, 22), -192 + R.range(-2, 3), R.f(), R.range(.6, 1.1), { col: 0x2e2622 });
    for (const [x, z] of [[80, -196], [111, -194], [104, -190]]) k.barrel(x, z, 0x2a2420); k.hayBale(78, -210, 0, { round: true });
    /* --- Pastagem com torre de vigia --- */
    pastureFence(k, -244, 6, -186, 64, 'E'); for (let i = 0; i < 7; i++) cow(k, -236 + R.range(0, 44), 14 + R.range(0, 44), R.int(0, 3));
    watchTower(k, -208, 40); k.hayBale(-196, 20, 0, { round: true }); k.hayBale(-198, 23, 0, { round: true }); k.barrel(-214, 30, 0x3a8a4a);
    /* --- Sítio Antigo --- */
    farmhouse(k, -196, 194, 0, 3, { w: 9, d: 7, floors: 1, pal: PAL_OLD }); well(k, -182, 180); outhouse(k, -210, 178, 1); coop(k, -178, 196, 3);
    k.fence(-214, 168, -172, 168, { gate: [.45, .6] }); for (const [x, z] of [[-206, 182], [-176, 172], [-200, 172]]) k.tree('banana', x, z, 1); k.hayBale(-186, 200, 0, {});
    /* --- Vila do Bom Jesus (comunidade rural) --- */
    const casas = [[150, 160, 0, 0], [166, 158, 0, 1], [182, 158, 0, 2], [150, 198, 2, 3], [166, 199, 2, 4], [196, 196, 2, 1], [200, 176, 3, 0]];
    for (const [x, z, r, v] of casas) farmhouse(k, x, z, r, v, { w: 9, d: 7, floors: 1, porch: r === 0 ? 2 : 0 });
    chapel(k, 140, 180); well(k, 172, 178); for (const [x, z] of [[164, 174], [180, 174], [164, 184], [180, 184]]) k.crate(x, z, 0, .6, { h: .7 });
    k.barrel(156, 172, 0xe0a020); pickup(k, 188, 186, 0, 0xc84a2a); k.tree('oak', 172, 172, 1.2);
    /* --- Galpões e Depósitos --- */
    shed(k, 192, 20, 0, 16, 10); shed(k, 220, 20, 0, 14, 10); shed(k, 196, 62, 0, 18, 10);
    for (let i = 0; i < 6; i++) k.container(214 + (i % 2) * 6.5, 44 + Math.floor(i / 2) * 3.1, 1, CONT_COLS[i % CONT_COLS.length]);
    k.container(214, 44, 1, CONT_COLS[6], { base: 2.6 }); containerStairs(k, 214, 44, 1, 'N', 0); waterTower(k, 228, 66);
    for (let i = 0; i < 10; i++) k.crate(186 + R.range(0, 22), 36 + R.range(0, 14), R.f(), R.range(.8, 1.3)); for (let i = 0; i < 6; i++) k.barrel(200 + R.range(0, 10), 76 + R.range(0, 3), R.pick([0xc03a2a, 0x2f6fd0, 0x3a8a4a]));
    tractor(k, 182, 50, 1, 0xe0a020); pickup(k, 226, 34, 0, 0x8a8a90);
    /* --- Grande Milharal --- */
    k.field(20, 140, 130, 228, 'corn'); scarecrow(k, 75, 182, 0); shed(k, 140, 150, 1, 10, 7); k.hayBale(138, 160, 0, { round: true });
    /* --- Rio: pontes --- */
    bridge(k, -169, 3, 1, 22, 4); bridge(k, -146, 172, 1, 22, 3.6); bridge(k, -173, -112, 1, 22, 3.4);
    /* --- Cachoeiras: mirante e pedras --- */
    for (let i = 0; i < 18; i++) { const a = R.f() * TAU, d = R.range(14, 22); const x = -180 + Math.cos(a) * d, z = -184 + Math.sin(a) * d; if (k.dry(x, z, .3)) k.rock(x, z, R.range(1, 2)); }
    shed(k, -150, -150, 0, 8, 6);
    for (const r of REGIONS.list) k.mm.push({ t: 'label', x: r.x, z: r.z, name: r.name });
  },
  plant(k) {
    const R = k.R; k.plantField(20, 140, 130, 228, 'corn', .9, 1.0);
    /* --- caixas de loot espalhadas (decorativas) --- */
    for (let i = 0; i < 40; i++) { const x = R.range(-240, 240), z = R.range(-240, 240); if (Math.abs(x) < 132 && Math.abs(z) < 100) continue; if (!k.dry(x, z, .6) || k.nearRoad(x, z, 2) || k.hitsBox(x, z, 1.5) || k.inField(x, z, 1)) continue; if (R.chance(.5)) k.crate(x, z, R.f(), R.range(.9, 1.2)); else k.barrel(x, z, R.pick([0xc03a2a, 0x2f6fd0, 0x3a8a4a, 0x8a6a3a])); }
  },
  /* cachoeira: lâminas d'água semitransparentes descendo do platô */
  fallMesh(map) {
    const mb = new MB(512);
    for (const f of map.falls || []) {
      const W = map.W, top = W.heightAt(f.x - Math.sin(f.yaw) * -6, f.z - Math.cos(f.yaw) * -6) + .2, bot = W.waterY + .05, c = Math.cos(f.yaw), s = Math.sin(f.yaw), hw = f.w / 2;
      const p = (u, y, o) => [f.x + c * u - s * o, y, f.z - s * u - c * o];
      mb.mat(TX.noise, 120, 0, 18, 0).col(0xd8f0ff, 190);
      for (let i = 0; i < 6; i++) { const y0 = bot + (top - bot) * i / 6, y1 = bot + (top - bot) * (i + 1) / 6, o0 = 1.6 * (1 - i / 6), o1 = 1.6 * (1 - (i + 1) / 6); mb.quad(p(-hw, y0, o0), p(hw, y0, o0), p(hw, y1, o1), p(-hw, y1, o1), 0, i * .7, 1, (i + 1) * .7); }
      mb.mat(TX.noise, 0, 0, 30, 0).col(0xffffff, 150); mb.quad(p(-hw - 1, bot + .02, 3), p(hw + 1, bot + .02, 3), p(hw + 1, bot + .02, -1), p(-hw - 1, bot + .02, -1));
    }
    return mb;
  }
};
/* torre de vigia de madeira (com escada) */
function watchTower(k, x, z) {
  k.begin(x, z, 0); const h = 6;
  for (const [a, b] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) k.S(a - .15, 0, b - .15, a + .15, h + 1.2, b + .15, TX.wood, 0x8a6a48, { us: 1, kind: 'wood' });
  k.S(-1.9, h - .15, -1.9, 1.9, h, 1.9, TX.plank2, 0xb89060, { us: .6, kind: 'wood' });
  for (const sd of [-1, 1]) { k.S(-1.9, h, sd * 1.9 - .06, 1.9, h + 1.0, sd * 1.9 + .06, TX.wood, 0x8a6a48, { us: 1, kind: 'wood' }); }
  k.S(-1.9, h, -1.9, -1.84, h + 1.0, -.6, TX.wood, 0x8a6a48, { kind: 'wood' }); k.S(1.84, h, -1.9, 1.9, h + 1.0, 1.9, TX.wood, 0x8a6a48, { kind: 'wood' });
  k.V(m => { m.mat(TX.metal, 80).col(0x8a5a40).uvs(.5, .5).gable(4.4, 1.2, 4.4, 0, h + 2.4, 0); });
  k.stairs(-1.2, 2.0 + 18 * .3, 0, -1, 1.0, 18, h / 18, .3, TX.plank2, 0xc8a070, 0);
  k.mm.push({ t: 'rect', ...k.rectOf(-1.9, -1.9, 1.9, 1.9), c: '#8a6a44' });
}
/* capela da vila */
function chapel(k, x, z) {
  farmhouse(k, x, z, 1, 0, { w: 12, d: 8, floors: 1, porch: 0, chimney: false, furnish: false, pal: { wall: { tex: TX.plaster, col: 0xfaf6ec, us: .45 }, roof: { tex: TX.tile, col: 0xc86a4a, h: 2.4, us: .45 }, shutters: 0x3a6ab8, trim: 0xf0d080, mmc: '#e8e0d0' } });
  k.begin(x + 7.2, z, 0); k.S(-1.3, 0, -1.3, 1.3, 9, 1.3, TX.plaster, 0xfaf6ec, { us: .45, kind: 'stone' }); k.V(m => { m.mat(TX.tile, 0).col(0xc86a4a).uvs(.5, .5).cyl(1.9, .05, 2.4, 4, 0, 9, 0, 1); m.mat(TX.metal, 120).col(0xe8c040).box(.12, 1.2, .12, 0, 12, 0).box(.7, .12, .12, 0, 12.2, 0); });
}
