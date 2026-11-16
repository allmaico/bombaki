/* =====================================================================
   25_arena.js — "VILA DO ROÇADO": mapa COMPETITIVO exclusivo do 5x5.
   Independente do mapa do Battle Royale (outra arquitetura, outras
   dimensões, outra ambientação). Planta inspirada em mapas de CS/Valorant:

            N (defesa)                         x →
     ┌───────────── Fundo A ── BASE CT ── Fundo B ─────────────┐
     │  [A] Celeiro Vermelho     │ Corredor  │   [B] Armazém dos Silos │
     │   ▲ Curto A ◄ Casa do     │  do CT    │  Galinheiro ► Curto B ▲ │
     │   │          Caseiro ◄── PÁTIO (meio) ──► (casa)              │ │
     │ Longo A        (porteira)  │ Rampa  │        (túnel) Longo B │ │
     │   ◄────────── Riacho (flanco, passa sob a ponte) ──────────►  │
     │   ◄── Estrada Sul A ── ACAMPAMENTO (ataque) ── Estrada Sul B ─►│
     └─────────────────────────── S ──────────────────────────────┘
   • Bombsite A no extremo oeste, Bombsite B no extremo leste (~110 m entre eles).
   • Cada site tem rota longa, rota curta pelo meio e acesso pelo fundo (rotação da defesa).
   • Riacho rebaixado liga os dois longos (flanco) e cruza a rampa do meio num vau.
   O "negativo" (paredes/prédios) é gerado automaticamente a partir das áreas
   caminháveis, então não existe brecha entre corredores.
   ===================================================================== */
'use strict';
const ARENA = {
  Y: 1.0, H: 5.2, L: { x0: -80, x1: 80, z0: -68, z1: 68 },
  /* áreas caminháveis (x0, z0, x1, z1) */
  walk: [
    [-13, 46, 13, 64],                                  /* acampamento dos atacantes */
    [-78, 48, -13, 61], [13, 48, 78, 61],               /* estradas sul A / B */
    [-78, -24, -64, 61], [64, -24, 78, 61],             /* longos A / B */
    [-64, 27, 64, 34],                                  /* riacho (flanco) */
    [-6, 22, 6, 48],                                    /* rampa do meio */
    [-19, -10, 19, 22],                                 /* pátio central */
    [-5, -50, 5, -10],                                  /* corredor do CT */
    [-13, -66, 13, -48],                                /* base da defesa */
    [-50, -66, -13, -54], [13, -66, 50, -54],           /* fundos A / B (rotação da defesa) */
    [-78, -54, -40, -24], [40, -54, 78, -24],           /* bombsites A / B */
    [-35, -13, -19, 0], [-50, -13, -35, 0], [-50, -24, -40, -13],   /* casa do caseiro + curto A */
    [19, -13, 35, 0], [35, -13, 50, 0], [40, -24, 50, -13]          /* galinheiro + curto B */
  ],
  houses: [[-35, -13, -19, 0], [19, -13, 35, 0]],
  sites: { A: { x0: -72, z0: -50, x1: -52, z1: -32 }, B: { x0: 52, z0: -50, x1: 72, z1: -32 } },
  callouts: [
    { name: 'Acampamento', x: 0, z: 62 }, { name: 'Base da Defesa', x: 0, z: -52 }, { name: 'Pátio', x: 0, z: 8 }, { name: 'Rampa', x: 0, z: 40 },
    { name: 'Longo A', x: -71, z: 14 }, { name: 'Longo B', x: 71, z: 14 }, { name: 'Riacho', x: -36, z: 30.5 }, { name: 'Curto A', x: -47, z: -14 }, { name: 'Curto B', x: 47, z: -14 },
    { name: 'Casa do Caseiro', x: -27, z: 2 }, { name: 'Galinheiro', x: 27, z: 2 }, { name: 'Fundo A', x: -40, z: -63 }, { name: 'Fundo B', x: 40, z: -63 }, { name: 'Corredor', x: 0, z: -30 }
  ],
  inWalk(x, z) { for (const r of this.walk) if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) return true; return false; },
  /* retângulos sólidos = complemento das áreas caminháveis (grade de 1 m + junção gulosa) */
  solids() {
    const L = this.L, nx = L.x1 - L.x0, nz = L.z1 - L.z0, g = new Uint8Array(nx * nz), out = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = this.inWalk(L.x0 + i + .5, L.z0 + j + .5) ? 0 : 1;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      if (g[j * nx + i] !== 1) continue; let w = 0; while (i + w < nx && g[j * nx + i + w] === 1) w++;
      let h = 1; for (; j + h < nz; h++) { let ok = true; for (let q = 0; q < w; q++) if (g[(j + h) * nx + i + q] !== 1) { ok = false; break; } if (!ok) break; }
      for (let a = 0; a < h; a++) for (let q = 0; q < w; q++) g[(j + a) * nx + i + q] = 2;
      out.push([L.x0 + i, L.z0 + j, L.x0 + i + w, L.z0 + j + h]);
    }
    return out;
  }
};
/* estilo do bloco sólido conforme a região (identidade visual de cada lado) */
function arenaStyle(cx, cz, w, d) {
  if (cz < -40 && cx < -10) return 'barn';                         /* fundo do A: celeiro vermelho */
  if (cz < -40 && cx > 10) return 'galpao';                        /* fundo do B: armazém metálico */
  if (cz < -40) return 'sede';
  if (cz > 40) return cx < 0 ? 'barn' : 'galpao';
  if (Math.abs(cx) < 40) return 'casa';
  return cx < 0 ? 'pedra' : 'galpao';
}
const ARENA_STY = {
  barn: { wall: TX.barn, col: 0xc23a2a, us: .45, roof: TX.metal, rcol: 0x8a8a8e, trim: 0xf4ead8, base: 0x8a7a6a },
  galpao: { wall: TX.cont, col: 0x6a8aa8, us: .35, roof: TX.metal, rcol: 0xb8bcc0, trim: 0x3a4a5a, base: 0x7a7a7a },
  casa: { wall: TX.plaster, col: 0xf2e6cc, us: .4, roof: TX.tile, rcol: 0xc8603e, trim: 0x8a5a32, base: 0xa89a88, shut: 0x3a7a4a },
  sede: { wall: TX.plaster, col: 0xfaf0dc, us: .4, roof: TX.tile, rcol: 0xb85a3a, trim: 0x5a3a22, base: 0xb0a090, shut: 0x2f6fb0 },
  pedra: { wall: TX.stone, col: 0xc8bca8, us: .35, roof: null, trim: 0x8a8070, base: 0x8a8070 }
};
/* bloco: colisão de altura fixa + fachada (janelas falsas, faixa de base, telhado) */
function arenaBlock(k, r, A, styFn) {
  A = A || ARENA; styFn = styFn || arenaStyle;
  const [x0, z0, x1, z1] = r, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, Y = A.Y, H = A.H;
  const sty = ARENA_STY[styFn(cx, cz, w, d)], thin = Math.min(w, d) < 4.5, S = thin ? ARENA_STY.pedra : sty, hh = thin ? 3.6 : H;
  k.begin(cx, cz, 0, Y);
  /* barreira invisível acima de muros e prédios: ninguém sobe em telhado/muro (tiros e granadas passam) */
  k.S(-w / 2, hh, -d / 2, w / 2, hh + 14, d / 2, TX.white, 0, { nv: true, ng: true, kind: 'wood' });
  k.S(-w / 2, -2.5, -d / 2, w / 2, hh, d / 2, S.wall, S.col, { us: S.us, kind: S.wall === TX.cont ? 'metal' : S.wall === TX.stone || S.wall === TX.plaster ? 'stone' : 'wood' });
  k.S(-w / 2 - .06, 0, -d / 2 - .06, w / 2 + .06, .5, d / 2 + .06, TX.stone, S.base, { nc: true, us: .6 });
  if (thin) { k.S(-w / 2 - .12, hh, -d / 2 - .12, w / 2 + .12, hh + .22, d / 2 + .12, TX.stone, 0x9a9080, { nc: true, us: .6 }); return; }
  k.S(-w / 2 - .1, hh - .25, -d / 2 - .1, w / 2 + .1, hh, d / 2 + .1, TX.trim, S.trim, { nc: true, us: 1 });
  /* janelas falsas nas quatro faces (só visual) */
  const win = (fx, fz, ax, len) => { const n = Math.floor((len - 2) / 4.2); for (let i = 0; i < n; i++) { const u = -len / 2 + (len - (n - 1) * 4.2) / 2 + i * 4.2;
    const px = ax === 'x' ? u : fx, pz = ax === 'x' ? fz : u, sx = ax === 'x' ? 1.3 : .08, sz = ax === 'x' ? .08 : 1.3;
    k.S(px - sx / 2, 1.5, pz - sz / 2, px + sx / 2, 3.0, pz + sz / 2, TX.glass, 0xffffff, { nc: true, us: 1 });
    k.S(px - sx / 2 - (ax === 'x' ? .12 : .02), 1.38, pz - sz / 2 - (ax === 'x' ? .02 : .12), px + sx / 2 + (ax === 'x' ? .12 : .02), 1.5, pz + sz / 2 + (ax === 'x' ? .02 : .12), TX.trim, S.trim, { nc: true, us: 1 });
    if (S.shut) { for (const s of [-1, 1]) { const ox = ax === 'x' ? s * .95 : 0, oz = ax === 'x' ? 0 : s * .95; k.S(px + ox - (ax === 'x' ? .3 : .05), 1.5, pz + oz - (ax === 'x' ? .05 : .3), px + ox + (ax === 'x' ? .3 : .05), 3.0, pz + oz + (ax === 'x' ? .05 : .3), TX.wood, S.shut, { nc: true, us: 1 }); } } } };
  win(0, -d / 2 - .02, 'x', w); win(0, d / 2 + .02, 'x', w); win(-w / 2 - .02, 0, 'z', d); win(w / 2 + .02, 0, 'z', d);
  if (S.roof) { const along = d >= w, rh = Math.min(3.2, Math.min(w, d) * .28); k.V(m => { m.push().tr(0, hh, 0); if (!along) m.ry(PI / 2); m.mat(S.roof, 40).col(S.rcol).uvs(.4, .4).gableRoof((along ? w : d) + 1, rh, (along ? d : w) + .6); m.mat(S.wall, 0).col(S.col).uvs(S.us, S.us).gableEnds((along ? w : d) - .02, rh - .02, (along ? d : w) - .02); m.pop(); }); }
  else { /* muro de pedra com mato aparecendo por cima */ const R = k.R; for (let i = 0; i < Math.max(1, Math.floor(w * d / 60)); i++) k.tree(R.pick(['oak', 'euca', 'oak']), x0 + 2 + R.f() * (w - 4), z0 + 2 + R.f() * (d - 4), R.range(1.0, 1.3)); }
  k.mm.push({ t: 'rect', x0, z0, x1, z1, c: S.wall === TX.barn ? '#8a3a2a' : S.wall === TX.cont ? '#4a5a6a' : S.wall === TX.stone ? '#6a6458' : '#8a7058' });
}
/* letra vertical (placas) no plano XY, face em z = fz */
function letterV(m, ch, s, ox, oy, fz) {
  const t = .14, b = (x0, y0, x1, y1) => m.box((x1 - x0) * s, (y1 - y0) * s, .012, ox + (x0 + x1) / 2 * s, oy + (y0 + y1) / 2 * s, fz);
  if (ch === 'A') { b(-.5, -.5, -.5 + t, .5); b(.5 - t, -.5, .5, .5); b(-.5, .5 - t, .5, .5); b(-.5, -.02, .5, -.02 + t); }
  else { b(-.5, -.5, -.5 + t, .5); b(-.5, .5 - t, .4, .5); b(-.5, -.02, .4, -.02 + t); b(-.5, -.5, .4, -.5 + t); b(.4 - t, -.5, .4, -.02); b(.4 - t, -.02 + t, .4, .5); }
}
function buildArena(seed) {
  seed = seed || 7; const B = { x0: -112, x1: 112, z0: -98, z1: 98 }, k = new MapKit('arena', B, seed), R = k.R, A = ARENA, Y = A.Y;
  k.setBase((x, z) => {
    const ex = Math.max(0, Math.abs(x) - 82), ez = Math.max(0, Math.abs(z) - 70), e = Math.hypot(ex, ez);
    return Y + (e > 0 ? e * .22 + (fbm(x * .03, z * .03, 3) - .3) * Math.min(e, 14) * .6 : 0);
  });
  /* riacho rebaixado e raso (anda-se dentro dele, mais devagar) */
  k.creek([[-66, 30.5], [-30, 30.5], [0, 30.5], [30, 30.5], [66, 30.5]], 2.4, -.5);
  k.road([[0, 64], [0, 22]], 4); k.road([[-13, 54], [-71, 54], [-71, -20]], 3.6); k.road([[13, 54], [71, 54], [71, -20]], 3.6); k.road([[0, -10], [0, -62]], 3.4);
  k.yards = [{ x0: -19, z0: -10, x1: 19, z1: 22, m: 3, k: .55 }, { x0: -13, z0: 46, x1: 13, z1: 64, m: 3, k: .7 }, { x0: -78, z0: -54, x1: -40, z1: -24, m: 3, k: .5 }, { x0: 40, z0: -54, x1: 78, z1: -24, m: 3, k: .45 }];
  k.commitTerrain(1); const W = k.W;
  /* ---- volumes sólidos (paredes, prédios, muros) ---- */
  for (const r of A.solids()) arenaBlock(k, r);
  /* ---- casas atravessáveis (rotas curtas) ---- */
  const houseA = { x: -27, z: -6.5, w: 16, d: 13 }, houseB = { x: 27, z: -6.5, w: 16, d: 13 };
  k.building({ x: houseA.x, z: houseA.z, y: Y, w: houseA.w, d: houseA.d, fh: 3.4, floors: 1, th: .3, doors: [{ s: 'E', at: .5, w: 3.2, h: 2.8 }, { s: 'W', at: .5, w: 3.2, h: 2.8 }], wins: [{ s: 'N', n: 2, w: 1.2, gap: .3, sill: 1.3 }, { s: 'S', n: 2, w: 1.2, gap: .3, sill: 1.3 }], wall: { tex: TX.plaster, col: 0xf2e6cc, us: .4 }, roof: { tex: TX.tile, col: 0xc8603e, h: 2.2 }, shutters: 0x3a7a4a, mmc: '#b89a78' });
  k.building({ x: houseB.x, z: houseB.z, y: Y, w: houseB.w, d: houseB.d, fh: 3.4, floors: 1, th: .3, doors: [{ s: 'W', at: .5, w: 3.2, h: 2.8 }, { s: 'E', at: .5, w: 3.2, h: 2.8 }], wins: [{ s: 'N', n: 2, w: 1.2, gap: .3, sill: 1.3 }, { s: 'S', n: 2, w: 1.2, gap: .3, sill: 1.3 }], wall: { tex: TX.wood, col: 0xe8d4a8, us: .5 }, roof: { tex: TX.metal, col: 0x8a9aa8, h: 2.0 }, shutters: 0xc04a2a, mmc: '#a89070' });
  /* interior: mesa, caixotes, ninhos */
  k.crate(-30, -9, 0, 1.1, { y: Y + .14 }); k.crate(-24, -3, .3, 1.0, { y: Y + .14 }); k.barrel(-31, -3, 0x2f6fd0, { y: Y + .14 });
  for (let i = 0; i < 4; i++) k.hayBale(23 + i * 2.2, -11, 0, { y: Y + .14 }); k.crate(30, -2, 0, 1.1, { y: Y + .14 }); k.barrel(24, -2.5, 0xe0a020, { y: Y + .14 });
  /* ---- vau da rampa: o riacho cruza o meio (pedras de passagem + mourões) ---- */
  for (let i = 0; i < 5; i++) { const z = 27.8 + i * 1.35, x = (i % 2 ? .9 : -.9); k.begin(x, z, 0, W.heightAt(x, z)); k.V(m => { m.mat(TX.stone, 0).col(0xb8b0a0).uvs(.6, .6).cyl(.55, .48, .18, 8, 0, -.05, 0, 3); }); }
  for (const s of [-1, 1]) for (const z of [26.2, 34.8]) { k.begin(s * 6.3, z, 0, Y); k.S(-.14, -1.6, -.14, .14, 1.2, .14, TX.wood, 0x7a5232, { us: 1, kind: 'wood' }); }
  /* ---- bombsite A: Celeiro Vermelho (palheiro elevado, feno, trator) ---- */
  const SA = A.sites.A, SB = A.sites.B;
  k.begin(-73.5, -48.5, 0, Y); k.S(-3.5, 2.5, -4.5, 3.5, 2.8, 4.5, TX.plank2, 0xc89a60, { us: .5, kind: 'wood' });
  for (const [a, b] of [[-3.3, -4.3], [3.3, -4.3], [-3.3, 4.3], [3.3, 4.3]]) k.S(a - .18, 0, b - .18, a + .18, 2.5, b + .18, TX.wood, 0x7a5232, { us: 1, kind: 'wood' });
  k.S(-3.5, 2.8, -4.5, -3.3, 3.8, 4.5, TX.wood, 0x8a6040, { us: 1, kind: 'wood' }); k.S(-3.5, 2.8, -4.5, 3.5, 3.8, -4.3, TX.wood, 0x8a6040, { us: 1, kind: 'wood' });
  k.stairs(3.5 + 9 * .32, 2.5, -1, 0, 1.3, 9, 2.8 / 9, .32, TX.plank2, 0xc8a070, 0);
  for (const [x, z] of [[-74.5, -51.5], [-72.5, -51.5]]) k.hayBale(x, z, 0, { y: Y + 2.8 });
  k.mm.push({ t: 'rect', x0: -77, z0: -53, x1: -70, z1: -44, c: '#a07a50' });
  for (const [x, z, r] of [[-62, -44, 0], [-60.5, -44, 0], [-66, -36, 1], [-58, -38, 0]]) k.hayBale(x, z, r, {}); k.hayBale(-68, -30, 0, { round: true }); k.hayBale(-55, -52, 0, { round: true });
  tractor(k, -56, -28.5, 1, 0xc03a22); k.crate(-61, -35, .2, 1.2); k.crate(-61, -35, 0, 1.0, { base: 1.2 }); k.crate(-48, -44, 0, 1.2); k.crate(-46.8, -44.4, .4, 1.0);
  scarecrow(k, -76, -27, 1); k.barrel(-76.5, -40, 0xc03a2a); k.barrel(-76.5, -38.8, 0xe0a020); k.crate(-68.5, -26.5, .2, 1.1);
  /* ---- bombsite B: Armazém dos Silos (contêiner elevado, paletes, tambores) ---- */
  silo(k, 74.5, -61, 3.2, 12); silo(k, 67, -61.5, 2.6, 10); silo(k, 60, -61.5, 2.2, 9);
  k.container(72, -47, 1, CONT_COLS[1]); containerStairs(k, 72, -47, 1, 'N', 0); k.container(72, -41, 1, CONT_COLS[4]);
  k.mm.push({ t: 'rect', x0: 70.8, z0: -51, x1: 73.2, z1: -38, c: '#3a6a9a' });
  for (const [x, z, r] of [[58, -44, 0], [59.2, -44, .2], [54, -36, .1], [64, -32, 0]]) k.crate(x, z, r, 1.2); k.crate(58.6, -44, 0, 1.0, { base: 1.2 });
  pickup(k, 47, -29, 0, 0x2f6fd0); for (const [x, z, c] of [[66, -52, 0x2f6fd0], [67.1, -52, 0x3a8a4a], [76.5, -30, 0xc03a2a], [76.5, -28.8, 0xe0a020]]) k.barrel(x, z, c);
  k.hayBale(46, -50, 0, {}); k.crate(44, -40, 0, 1.2); k.crate(56, -26.5, .3, 1.1);
  /* ---- pátio central: poço, carroça, caixotes, caixa d'água (mirante dos dois lados) ---- */
  well(k, 0, 6); k.crate(-10, 14, .2, 1.2); k.crate(-11.2, 14.3, 0, 1.0); k.crate(10, 14, .1, 1.2); k.crate(11.2, 13.6, 0, 1.0);
  k.hayBale(-14, -4, 0, {}); k.hayBale(14, -4, 0, {}); k.barrel(-16, 19, 0x3a8a4a); k.barrel(16, 19, 0xc03a2a);
  for (const sx of [-1, 1]) { k.begin(sx * 15, 3, 0, Y); k.S(-1.6, 1.9, -1.6, 1.6, 2.1, 1.6, TX.plank2, 0xc09868, { us: .5, kind: 'wood' }); for (const [a, b] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) k.S(a - .12, 0, b - .12, a + .12, 1.9, b + .12, TX.wood, 0x7a5232, { us: 1, kind: 'wood' }); k.S(-1.6, 2.1, -1.6, 1.6, 2.9, -1.45, TX.wood, 0x8a6040, { us: 1, kind: 'wood' }); k.stairs(0, 1.6 + 6 * .32, 0, -1, 1.1, 6, 1.9 / 6, .32, TX.plank2, 0xc8a070, 0); k.mm.push({ t: 'rect', x0: sx * 15 - 1.6, z0: 1.4, x1: sx * 15 + 1.6, z1: 4.6, c: '#a07a50' }); }
  /* ---- corredor do CT: portão de madeira (estreitamento) ---- */
  k.begin(0, -30, 0, Y); k.S(-5, 0, -.3, -2, 3.2, .3, TX.wood, 0x7a5232, { us: .7, kind: 'wood' }); k.S(2, 0, -.3, 5, 3.2, .3, TX.wood, 0x7a5232, { us: .7, kind: 'wood' });
  k.S(-5, 3.2, -.3, 5, 3.6, .3, TX.wood, 0x6a4428, { us: .7, kind: 'wood' }); k.crate(3.4, -36, 0, 1.1); k.crate(-3.4, -24, .2, 1.1);
  /* ---- longo A: porteira do curral (estreitamento) ---- */
  k.begin(-71, 10, 0, Y); k.S(-7, 0, -.3, -2.6, 3.4, .3, TX.stone, 0xc8bca8, { us: .5, kind: 'stone' }); k.S(2.6, 0, -.3, 7, 3.4, .3, TX.stone, 0xc8bca8, { us: .5, kind: 'stone' });
  k.S(-2.9, 0, -.4, -2.5, 3.8, .4, TX.wood, 0x7a5232, { us: 1, kind: 'wood' }); k.S(2.5, 0, -.4, 2.9, 3.8, .4, TX.wood, 0x7a5232, { us: 1, kind: 'wood' }); k.S(-2.9, 3.6, -.25, 2.9, 3.9, .25, TX.wood, 0x6a4428, { nc: true, us: 1 });
  k.crate(-74, 3, .2, 1.2); k.crate(-67.5, 18, 0, 1.2); k.crate(-67.5, 19.3, .3, 1.0); k.hayBale(-75, 36, 0, { round: true }); k.hayBale(-75, 39, 0, { round: true }); tractor(k, -68, 44, 2, 0x4a8a3a);
  k.hayBale(-73, -16, 1, {}); k.crate(-66, -20, 0, 1.1);
  /* ---- longo B: túnel coberto do milharal (estreitamento) ---- */
  k.begin(71, 10, 0, Y); k.S(-7, 0, -10, -6.6, 3.4, 10, TX.barn, 0xe0b040, { us: .45, kind: 'wood' }); k.S(6.6, 0, -10, 7, 3.4, 10, TX.barn, 0xe0b040, { us: .45, kind: 'wood' });
  k.S(-7, 3.4, -10, 7, 3.7, 10, TX.metal, 0x9aa0a8, { us: .4, kind: 'metal' }); k.V(m => { m.mat(TX.metal, 40).col(0x8a9098).uvs(.4, .4).gableRoof(15, 1.6, 20.5, 0, 3.7, 0); });
  for (const s of [-1, 1]) { k.S(-4.5, 0, s * 10 - .3, -2.2, 3.4, s * 10 + .3, TX.wood, 0x7a5232, { us: .8, kind: 'wood' }); k.S(2.2, 0, s * 10 - .3, 4.5, 3.4, s * 10 + .3, TX.wood, 0x7a5232, { us: .8, kind: 'wood' }); }
  k.mm.push({ t: 'rect', x0: 64, z0: 0, x1: 78, z1: 20, c: '#7a6a3a' });
  k.crate(67.5, 5, 0, 1.1); k.crate(74.5, 15, .2, 1.1); k.barrel(66, -10, 0x2f6fd0); pickup(k, 70, 42, 0, 0xc84a2a); k.crate(74, -18, .3, 1.2); k.crate(67, 26, 0, 1.1);
  /* ---- riacho: pedras de cobertura ---- */
  for (const x of [-48, -22, 22, 48]) k.rock(x, 30.5 + (x > 0 ? 1.2 : -1.2), 1.1);
  /* ---- acampamento (ataque) e base da defesa ---- */
  gateArch(k, 0, 46.5, 0, 9); campfire(k, -8, 58); tent(k, -9, 61.5, 0, 0x4a8a58); tent(k, 9, 61.5, 0, 0xc8742a); k.crate(11.6, 48.6, 0, 1.1); k.barrel(-11.6, 48.6, 0xc03a2a);
  k.hayBale(-20, 55, 0, { round: true }); k.hayBale(20, 55, 0, { round: true }); k.crate(-40, 57, .2, 1.2); k.crate(40, 52, 0, 1.2); k.crate(-58, 50.5, 0, 1.1); k.crate(58, 58.5, .3, 1.1);
  for (const s of [-1, 1]) { k.begin(s * 10, -63.5, 0, Y); k.S(-.12, 0, -.12, .12, 5, .12, TX.wood, 0x6a4428, { us: 1, kind: 'wood' }); k.V(m => { m.mat(TX.cloth, 0, 30).col(0xee3f35).uvs(1, 1).box(.04, 1.0, 1.6, 0, 4.4, .8); }); }
  k.crate(-10, -52, 0, 1.1); k.crate(10, -52, .2, 1.1); k.barrel(-30, -56, 0x2f6fd0); k.barrel(30, -64, 0xc03a2a); k.hayBale(-45, -64, 0, {}); k.crate(45, -57, 0, 1.2);
  /* ---- marcadores dos sites ---- */
  k.sites.A = { id: 'A', name: 'Celeiro Vermelho', ...SA, x: (SA.x0 + SA.x1) / 2, z: (SA.z0 + SA.z1) / 2, r: 11 };
  k.sites.B = { id: 'B', name: 'Armazém dos Silos', ...SB, x: (SB.x0 + SB.x1) / 2, z: (SB.z0 + SB.z1) / 2, r: 11 };
  for (const S of [k.sites.A, k.sites.B]) { siteMarker(k, S.x0, S.z0, S.x1, S.z1); siteLetter(k, S.id, S.x, S.z, 7.5, S.id === 'A' ? 0xffe27a : 0x9ad0ff); k.mm.push({ t: 'site', id: S.id, x: S.x, z: S.z }); }
  /* placas grandes com a letra nas entradas (identificação rápida) */
  for (const [x, z, id] of [[-64.6, -27, 'A'], [-50.6, -20, 'A'], [-40, -59.5, 'A'], [64.6, -27, 'B'], [50.6, -20, 'B'], [40, -59.5, 'B']]) { k.begin(x, z, 0, Y); k.V(m => { m.mat(TX.wood, 0).col(0x5a3a22).uvs(1, 1).box(.12, 3.2, .12, 0, 1.6, 0); m.mat(TX.white, 0, 0, 30).col(id === 'A' ? 0xffc61a : 0x3d8bff).box(1.4, 1.4, .1, 0, 3.4, 0); m.mat(TX.white, 0, 0, 60).col(0xffffff); for (const f of [-1, 1]) letterV(m, id, .95, 0, 3.4, f * .056); }); }
  /* ---- spawns ---- */
  for (let i = 0; i < 10; i++) k.spawns.atk.push({ x: -8 + (i % 5) * 4, z: 52 + Math.floor(i / 5) * 3.5, yaw: 0 });
  for (let i = 0; i < 10; i++) k.spawns.def.push({ x: -8 + (i % 5) * 4, z: -62 + Math.floor(i / 5) * 3.5, yaw: PI });
  /* ---- vegetação só fora da área jogável ---- */
  W.finalize(); const splat = k.splatFn();
  k.forest({ spacing: 5.2, tries: 9000, over: 6, tight: .9, density: (x, z) => { const e = Math.max(Math.abs(x) - 84, Math.abs(z) - 72); return e > 0 ? Math.min(1, .55 + e * .05) : 0; }, kinds: (x, z, r) => { const q = r.f(); return q < .5 ? 'pine' : q < .8 ? 'euca' : 'oak'; } });
  for (let i = 0; i < 260; i++) { const x = R.range(-79, 79), z = R.range(-67, 67); if (!A.inWalk(x, z) || k.hitsBox(x, z, 1.2) || k.nearRoad(x, z, 2.2) || !k.dry(x, z, .5)) continue; if (R.chance(.5)) k.bush(x, z, R.range(.5, .8)); }
  k.scatterGrass(splat, .14); k.scatterFlowers(splat, 160);
  for (const c of A.callouts) k.mm.push({ t: 'label', x: c.x, z: c.z, name: c.name, small: true });
  const map = finishMap(k, splat, 'arena', 'Vila do Roçado', 'dia');
  map.viewB = { x0: -84, x1: 84, z0: -84, z1: 84 }; map.callouts = A.callouts;
  map.inPlay = (x, z) => ARENA.inWalk(x, z) || ARENA.houses.some(h => x >= h[0] - .3 && x <= h[2] + .3 && z >= h[1] - .3 && z <= h[3] + .3); map.maxStand = 3.4;
  map.tacB = { x0: -79, x1: 79, z0: -67, z1: 67 }; map.navCs = 1.0; map.falls = []; map.regions = [];
  map.stage = { A: [{ x: -71, z: 30 }, { x: -12, z: 4 }], B: [{ x: 71, z: 30 }, { x: 12, z: 4 }] };
  map.playB = { x0: -80, x1: 80, z0: -68, z1: 68 };
  map.decorSpots = { ch: [[27, -6, 5], [8, 10, 6], [-60, -38, 5], [-6, 56, 5], [60, 45, 6]], pg: [[-28, -6, 3], [-71, 40, 4]] };
  return map;
}
