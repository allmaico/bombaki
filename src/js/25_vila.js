/* =====================================================================
   25_vila.js — "VILA GIRASSOL": o mapa COMPETITIVO do 5x5 (refeito do zero)
   Vila do interior: casinhas creme com telha vermelha e janelas verdes,
   muros de reboco, quintais com árvores frondosas, moinho no A, capela
   no B, praça com poço e a grande mangueira no meio.

               N (DEFESA)          x →
     ┌──────── Rua de Cima ── SPAWN DEFESA ── Rua de Cima ────────┐
     │  descida A            Corredor da Igreja           descida B │
     │ [A] MOINHO ◄── Beco A ── PRAÇA (poço) ── Beco B ──► [B] CAPELA │
     │  Estrada A               Viela do Meio            Estrada B │
     └──────── Rua de Baixo ── SPAWN ATAQUE ── Rua de Baixo ──────┘
               S (ATAQUE)
   • 3 saídas do ataque (Estrada A, Viela do Meio, Estrada B) → barreiras de compra.
   • A defesa chega a A e B pelas descidas e gira pelos becos da praça.
   O "negativo" das ruas vira quarteirões: casas viradas para a rua,
   muros de reboco com beiral de telha e quintais com árvores.
   ===================================================================== */
'use strict';
/* ---------- base comum dos mapas táticos (áreas caminháveis → sólidos) ---------- */
const TAT_BASE = {
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
const VILA = Object.assign(Object.create(TAT_BASE), {
  Y: 1.0, L: { x0: -72, x1: 72, z0: -70, z1: 70 },
  walk: [
    [-12, 52, 12, 68],                                   /* spawn do ataque */
    [-62, 44, 62, 52],                                   /* Rua de Baixo */
    [-62, -6, -52, 44], [52, -6, 62, 44],                /* Estrada A / Estrada B */
    [-4, 14, 4, 44],                                     /* Viela do Meio */
    [-20, -14, 20, 14],                                  /* Praça */
    [-44, -6, -20, 0], [20, -6, 44, 0],                  /* Beco A / Beco B */
    [-70, -36, -44, -2], [44, -36, 70, -2],              /* bombsites A / B (abertos para os becos) */
    [-12, -68, 12, -52],                                 /* spawn da defesa */
    [-60, -60, 60, -52],                                 /* Rua de Cima */
    [-60, -52, -50, -36], [50, -52, 60, -36],            /* descidas A / B */
    [-4, -52, 4, -14],                                   /* Corredor da Igreja */
    [-44, -27, -4, -21], [4, -27, 44, -21]               /* Travessas A / B (rotação da defesa) */
  ],
  houses: [],
  sites: { A: { x0: -68, z0: -34, x1: -46, z1: -8 }, B: { x0: 46, z0: -34, x1: 68, z1: -8 } },
  callouts: [
    { name: 'Spawn Ataque', x: 0, z: 61 }, { name: 'Spawn Defesa', x: 0, z: -61 }, { name: 'Rua de Baixo', x: -34, z: 48 }, { name: 'Rua de Baixo ', x: 34, z: 48 },
    { name: 'Estrada A', x: -57, z: 20 }, { name: 'Estrada B', x: 57, z: 20 }, { name: 'Viela do Meio', x: 0, z: 30 }, { name: 'Praça', x: 0, z: 2 },
    { name: 'Beco A', x: -32, z: -3 }, { name: 'Beco B', x: 32, z: -3 }, { name: 'Corredor da Igreja', x: 0, z: -33 },
    { name: 'Moinho (A)', x: -57, z: -21 }, { name: 'Capela (B)', x: 57, z: -21 }, { name: 'Descida A', x: -55, z: -44 }, { name: 'Descida B', x: 55, z: -44 },
    { name: 'Travessa A', x: -24, z: -24 }, { name: 'Travessa B', x: 24, z: -24 }, { name: 'Rua de Cima', x: -34, z: -56 }, { name: 'Rua de Cima ', x: 34, z: -56 }
  ]
});
/* paleta da vila (referência: reboco creme, telha vermelha, janelas verdes) */
const VILA_STY = [
  { wall: 0xf3e7cc, roof: 0xc0472f, trim: 0x8a5a32, shut: 0x2f6e3e, base: 0xa89a88 },
  { wall: 0xf6e3b0, roof: 0xb5402a, trim: 0x7a4e2a, shut: 0x3a7a4a, base: 0xa0907c },
  { wall: 0xfaf3e6, roof: 0xc95536, trim: 0x6a4428, shut: 0x2a6a5a, base: 0xb0a090 },
  { wall: 0xefd9bd, roof: 0xa83a26, trim: 0x8a5a32, shut: 0x356a36, base: 0x9a8a78 }
];
/* letra vertical (placas) no plano XY, face em z = fz */
function letterV(m, ch, s, ox, oy, fz) {
  const t = .14, b = (x0, y0, x1, y1) => m.box((x1 - x0) * s, (y1 - y0) * s, .012, ox + (x0 + x1) / 2 * s, oy + (y0 + y1) / 2 * s, fz);
  if (ch === 'A') { b(-.5, -.5, -.5 + t, .5); b(.5 - t, -.5, .5, .5); b(-.5, .5 - t, .5, .5); b(-.5, -.02, .5, -.02 + t); }
  else { b(-.5, -.5, -.5 + t, .5); b(-.5, .5 - t, .4, .5); b(-.5, -.02, .4, -.02 + t); b(-.5, -.5, .4, -.5 + t); b(.4 - t, -.5, .4, -.02); b(.4 - t, -.02 + t, .4, .5); }
}
/* placa vertical com a letra do site */
function arenaSign(k, x, z, id, rot, Y) {
  k.begin(x, z, rot, Y); k.V(m => { m.mat(TX.wood, 0).col(0x5a3a22).uvs(1, 1).box(.12, 3.2, .12, 0, 1.6, 0); m.mat(TX.white, 0, 0, 30).col(id === 'A' ? 0xf2c14e : 0x1f8a82).box(1.4, 1.4, .1, 0, 3.4, 0); m.mat(TX.white, 0, 0, 60).col(0xffffff); for (const f of [-1, 1]) letterV(m, id, .95, 0, 3.4, f * .056); });
}
/* palheiro / coreto elevado (plataforma de madeira com escada) — ponto alto de defesa */
function hayLoft(k, x, z, Y, stairSide) {
  k.begin(x, z, 0, Y); k.S(-3.5, 2.5, -3.5, 3.5, 2.8, 3.5, TX.plank2, 0xc89a60, { us: .5, kind: 'wood' });
  for (const [a, b] of [[-3.3, -3.3], [3.3, -3.3], [-3.3, 3.3], [3.3, 3.3]]) k.S(a - .18, 0, b - .18, a + .18, 2.5, b + .18, TX.wood, 0x7a5232, { us: 1, kind: 'wood' });
  k.S(-3.5, 2.8, -3.5, -3.3, 3.8, 3.5, TX.wood, 0x8a6040, { us: 1, kind: 'wood' });
  if (stairSide > 0) k.stairs(3.5 + 9 * .32, 1.6, -1, 0, 1.3, 9, 2.8 / 9, .32, TX.plank2, 0xc8a070, 0);
  else k.stairs(-1.6, 3.5 + 9 * .32, 0, -1, 1.3, 9, 2.8 / 9, .32, TX.plank2, 0xc8a070, 0);
  k.hayBale(x - 1.5, z - 2, 0, { y: Y + 2.8 }); k.mm.push({ t: 'rect', x0: x - 3.5, z0: z - 3.5, x1: x + 3.5, z1: z + 3.5, c: '#a07a50' });
}
/* porteira de pedra com vão (estreitamento) atravessando uma rua no eixo z (muro ao longo de x) */
function stoneGateX(k, z, x0, x1, gap, Y, gc) {
  const xc = gc === undefined ? (x0 + x1) / 2 : gc, hg = gap / 2; k.begin(xc, z, 0, Y);
  k.S(x0 - xc, 0, -.3, -hg, 3.2, .3, TX.stone, 0xc8bca8, { us: .5, kind: 'stone' }); k.S(hg, 0, -.3, x1 - xc, 3.2, .3, TX.stone, 0xc8bca8, { us: .5, kind: 'stone' });
  k.S(x0 - xc - .02, 3.2, -.36, -hg, 3.4, .36, TX.tile, 0xb5402a, { nc: true, us: .5 }); k.S(hg, 3.2, -.36, x1 - xc + .02, 3.4, .36, TX.tile, 0xb5402a, { nc: true, us: .5 });
  k.S(-hg - .3, 0, -.4, -hg + .1, 3.8, .4, TX.wood, 0x7a5232, { us: 1, kind: 'wood' }); k.S(hg - .1, 0, -.4, hg + .3, 3.8, .4, TX.wood, 0x7a5232, { us: 1, kind: 'wood' });
  k.S(-hg - .3, 3.6, -.25, hg + .3, 3.9, .25, TX.wood, 0x6a4428, { nc: true, us: 1 });
  k.mm.push({ t: 'rect', x0, z0: z - .4, x1: xc - hg, z1: z + .4, c: '#6a6458' }); k.mm.push({ t: 'rect', x0: xc + hg, z0: z - .4, x1, z1: z + .4, c: '#6a6458' });
}
/* ---------- casinha da vila: reboco, barrado de pedra, janelas com venezianas, porta, telhado, chaminé ---------- */
function vilaHouse(k, x0, z0, x1, z1, hh, S, front, R) {
  const Y = VILA.Y, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  k.begin(cx, cz, 0, Y);
  k.S(-w / 2, hh, -d / 2, w / 2, hh + 14, d / 2, TX.white, 0, { nv: true, ng: true, kind: 'wood' });          /* ninguém sobe no telhado */
  k.S(-w / 2, -2.5, -d / 2, w / 2, hh, d / 2, TX.plaster, S.wall, { us: .4, kind: 'stone' });
  k.S(-w / 2 - .06, 0, -d / 2 - .06, w / 2 + .06, .7, d / 2 + .06, TX.stone, S.base, { nc: true, us: .6 });
  k.S(-w / 2 - .1, hh - .22, -d / 2 - .1, w / 2 + .1, hh, d / 2 + .1, TX.trim, S.trim, { nc: true, us: 1 });
  /* janela com fundo, cortina, vidro quebrável, peitoril e venezianas */
  const win = (px, pz, ax, flower) => {
    const sx = ax === 'x' ? 1.25 : .08, sz = ax === 'x' ? .08 : 1.25;
    k.S(px - sx / 2, 1.55, pz - sz / 2, px + sx / 2, 3.0, pz + sz / 2, TX.white, 0x3a2a1e, { nc: true, us: 1 });
    const cc = [0xf0e2c4, 0xd85a4a, 0xe8d2a0, 0x9ab8d8][(Math.abs(Math.round(px * 3 + pz * 7))) % 4];
    for (const sg of [-1, 1]) { const qx = ax === 'x' ? px + sg * .46 : px, qz = ax === 'x' ? pz : pz + sg * .46, hx = ax === 'x' ? .15 : sx / 2 + .04, hz = ax === 'x' ? sz / 2 + .04 : .15; k.S(qx - hx, 1.57, qz - hz, qx + hx, 2.98, qz + hz, TX.cloth, cc, { nc: true, us: 1 }); }
    if (k.glassLocal) k.glassLocal(px - sx / 2 - (ax === 'x' ? 0 : .03), 1.55, pz - sz / 2 - (ax === 'x' ? .03 : 0), px + sx / 2 + (ax === 'x' ? 0 : .03), 3.0, pz + sz / 2 + (ax === 'x' ? .03 : 0), true);
    k.S(px - sx / 2 - (ax === 'x' ? .14 : .1), 1.42, pz - sz / 2 - (ax === 'x' ? .1 : .14), px + sx / 2 + (ax === 'x' ? .14 : .1), 1.55, pz + sz / 2 + (ax === 'x' ? .1 : .14), TX.trim, 0xf4ead8, { nc: true, us: 1 });
    k.S(px - sx / 2 - (ax === 'x' ? .1 : .05), 3.0, pz - sz / 2 - (ax === 'x' ? .05 : .1), px + sx / 2 + (ax === 'x' ? .1 : .05), 3.12, pz + sz / 2 + (ax === 'x' ? .05 : .1), TX.trim, 0xf4ead8, { nc: true, us: 1 });
    for (const s of [-1, 1]) { const ox = ax === 'x' ? s * .93 : 0, oz = ax === 'x' ? 0 : s * .93; k.S(px + ox - (ax === 'x' ? .3 : .06), 1.55, pz + oz - (ax === 'x' ? .06 : .3), px + ox + (ax === 'x' ? .3 : .06), 3.0, pz + oz + (ax === 'x' ? .06 : .3), TX.wood, S.shut, { nc: true, us: 1 }); }
    if (flower) { const ox = ax === 'z' ? Math.sign(px) * .14 : 0, oz = ax === 'x' ? Math.sign(pz) * .14 : 0, bx = ax === 'x' ? .62 : .14, bz = ax === 'x' ? .14 : .62;
      k.S(px + ox - bx, 1.12, pz + oz - bz, px + ox + bx, 1.42, pz + oz + bz, TX.wood, 0x7a4a26, { nc: true, us: 1 });
      const fc = [0xe8483a, 0xf2c14e, 0xf0f0f0][(Math.abs(Math.round(px + pz))) % 3]; k.V(m => { m.mat(TX.flower, 0, 0, 20).col(fc).sph(bx, .2, bz, 6, 4, px + ox, 1.5, pz + oz); }); }
  };
  /** @type {[string, number, number, number, string][]} */
  const faces = [['x', 0, -d / 2 - .02, w, 'N'], ['x', 0, d / 2 + .02, w, 'S'], ['z', -w / 2 - .02, 0, d, 'W'], ['z', w / 2 + .02, 0, d, 'E']];
  for (const [ax, fx, fz, len, side] of faces) {
    { const ox = ax === 'z' ? Math.sign(fx) : 0, oz = ax === 'x' ? Math.sign(fz) : 0, wx = cx + fx + ox * 1.4, wz = cz + fz + oz * 1.4, L = VILA.L;
      const out = wx < L.x0 || wx > L.x1 || wz < L.z0 || wz > L.z1; if (side !== front && !out && !VILA.inWalk(wx, wz)) continue; }   /* face escondida no quintal: sem janelas */
    const isFront = side === front, slots = [];
    if (isFront && len >= 5) { slots.push({ u: 0, door: true }); for (let u = 2.1; u + .95 < len / 2 - .25; u += 3.0) slots.push({ u }, { u: -u }); }
    else { const n = Math.max(1, Math.floor((len - 1.6) / 3.6)); for (let i = 0; i < n; i++) slots.push({ u: -len / 2 + (len - (n - 1) * 3.6) / 2 + i * 3.6 }); }
    for (const sl of slots) {
      const u = sl.u, px = ax === 'x' ? u : fx, pz = ax === 'x' ? fz : u;
      if (sl.door) {
        /* porta de madeira com moldura e degrau */
        const tx = ax === 'x' ? .62 : .07, tz = ax === 'x' ? .07 : .62;
        k.S(px - tx, .7, pz - tz, px + tx, 2.75, pz + tz, TX.door, 0x6a3e20, { nc: true, us: 1 });
        k.S(px - tx - (ax === 'x' ? .14 : .02), 2.75, pz - tz - (ax === 'x' ? .02 : .14), px + tx + (ax === 'x' ? .14 : .02), 2.92, pz + tz + (ax === 'x' ? .02 : .14), TX.trim, 0xf4ead8, { nc: true, us: 1 });
        const ox = ax === 'z' ? Math.sign(px) * .3 : 0, oz = ax === 'x' ? Math.sign(pz) * .3 : 0, hx = ax === 'x' ? .9 : .32, hz = ax === 'x' ? .32 : .9;
        k.S(px + ox - hx, 0, pz + oz - hz, px + ox + hx, .26, pz + oz + hz, TX.stone, 0xb8ad9a, { nc: true, us: .6 });
        continue;
      }
      win(px, pz, ax, isFront && R.chance(.6));
    }
  }
  /* telhado de duas águas (cumeeira no eixo mais longo) + chaminé */
  const along = d >= w, rh = Math.min(3.0, Math.min(w, d) * .3);
  k.V(m => { m.push().tr(0, hh, 0); if (!along) m.ry(PI / 2); m.mat(TX.tile, 40).col(S.roof).uvs(.4, .4).gableRoof((along ? w : d) + 1.0, rh, (along ? d : w) + .7); m.mat(TX.plaster, 0).col(S.wall).uvs(.4, .4).gableEnds((along ? w : d) - .02, rh - .02, (along ? d : w) - .02); m.pop(); });
  if (R.chance(.55)) { const sg = R.chance(.5) ? -1 : 1, ox = along ? sg * w * .22 : R.range(-.3, .3) * w, oz = along ? R.range(-.3, .3) * d : sg * d * .22;
    k.S(ox - .4, hh + .4, oz - .4, ox + .4, hh + rh + .9, oz + .4, TX.brick, 0xb0583a, { nc: true, us: .5 }); k.S(ox - .5, hh + rh + .9, oz - .5, ox + .5, hh + rh + 1.05, oz + .5, TX.stone, 0x8a8070, { nc: true, us: .5 }); }
  k.mm.push({ t: 'rect', x0, z0, x1, z1, c: '#' + (S.roof >>> 0).toString(16).padStart(6, '0') });
}
/* ---------- muro de reboco com beiral de telha (fecha os quintais) ---------- */
function vilaWall(k, x0, z0, x1, z1, h) {
  const Y = VILA.Y, w = x1 - x0, d = z1 - z0; k.begin((x0 + x1) / 2, (z0 + z1) / 2, 0, Y);
  k.S(-w / 2, h, -d / 2, w / 2, h + 14, d / 2, TX.white, 0, { nv: true, ng: true, kind: 'wood' });
  k.S(-w / 2, -2.5, -d / 2, w / 2, h, d / 2, TX.plaster, 0xeee0c2, { us: .45, kind: 'stone' });
  k.S(-w / 2 - .04, 0, -d / 2 - .04, w / 2 + .04, .55, d / 2 + .04, TX.stone, 0x9a8c78, { nc: true, us: .6 });
  k.S(-w / 2 - .035, h, -d / 2 - .035, w / 2 + .035, h + .22, d / 2 + .035, TX.tile, 0xb5402a, { nc: true, us: .5 });
}
/* cerquinha de madeira só visual (encostada nos muros, não muda a jogabilidade) */
function vilaFence(k, x0, z0, x1, z1, col) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.4)), Y = VILA.Y; col = col || 0xd8b07a;
  k.begin(0, 0, 0, Y);
  for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; k.S(x - .06, 0, z - .06, x + .06, 1.05, z + .06, TX.wood, col, { nc: true, us: 1 }); }
  const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  for (const y of [.42, .82]) k.S(Math.min(x0, x1) - (ax ? 0 : .03), y, Math.min(z0, z1) - (ax ? .03 : 0), Math.max(x0, x1) + (ax ? 0 : .03), y + .09, Math.max(z0, z1) + (ax ? .03 : 0), TX.wood, col, { nc: true, us: .5 });
}
/* ---------- quarteirão: muros + casas viradas para a rua + quintal arborizado ---------- */
function vilaBlock(k, r, R, used) {
  const [x0, z0, x1, z1] = r, w = x1 - x0, d = z1 - z0, A = VILA;
  if (Math.min(w, d) < 5) { vilaWall(k, x0, z0, x1, z1, 2.9); k.mm.push({ t: 'rect', x0, z0, x1, z1, c: '#d8c8a4' }); return; }
  vilaWall(k, x0, z0, x1, z1, 2.7); k.mm.push({ t: 'rect', x0, z0, x1, z1, c: '#5f7d3c' });
  const placed = [], ov = (a, b) => a[0] < b[2] - .1 && a[2] > b[0] + .1 && a[1] < b[3] - .1 && a[3] > b[1] + .1;
  /* lados que dão para a rua: casas de 7–12 m, intercaladas com trechos de muro */
  const edges = [
    { side: 'N', len: w, at: t => [x0 + t, z0], out: [0, -1.5] }, { side: 'S', len: w, at: t => [x0 + t, z1], out: [0, 1.5] },
    { side: 'W', len: d, at: t => [x0, z0 + t], out: [-1.5, 0] }, { side: 'E', len: d, at: t => [x1, z0 + t], out: [1.5, 0] }
  ];
  for (const E of edges) {
    const deep = E.side === 'N' || E.side === 'S' ? d : w; if (deep < 6) continue;
    let t = 0;
    while (t < E.len - 6) {
      let hw = Math.min(R.range(7, 11.5), E.len - t - .5); const rem = E.len - t - hw; if (rem < 3.5 && hw + rem <= 13.5) hw += rem; const [mx, mz] = E.at(t + hw / 2);
      if (hw < 6 || !A.inWalk(mx + E.out[0], mz + E.out[1]) || R.chance(.12)) { t += R.range(3, 6); continue; }
      const hd = Math.min(R.range(7, 9.5), deep - .5), a0 = t < .01 ? -.05 : t, a1 = t + hw >= E.len - .01 ? E.len + .05 : t + hw; let rc;
      if (E.side === 'N') rc = [x0 + a0, z0 - .05, x0 + a1, z0 + hd]; else if (E.side === 'S') rc = [x0 + a0, z1 - hd, x0 + a1, z1 + .05];
      else if (E.side === 'W') rc = [x0 - .05, z0 + a0, x0 + hd, z0 + a1]; else rc = [x1 - hd, z0 + a0, x1 + .05, z0 + a1];
      if (placed.some(p => ov(p, rc))) { t += 2; continue; }
      placed.push(rc); vilaHouse(k, rc[0], rc[1], rc[2], rc[3], R.range(4.6, 6.0), VILA_STY[(R.f() * VILA_STY.length) | 0], E.side, R);
      t += hw + R.range(2.5, 5.5);
    }
  }
  used.push(...placed);
  /* quintal: árvores frondosas aparecendo acima dos muros */
  const n = Math.max(1, Math.floor(w * d / 220));
  for (let i = 0; i < n; i++) { const x = R.range(x0 + 2.5, x1 - 2.5), z = R.range(z0 + 2.5, z1 - 2.5); if (placed.some(p => x > p[0] - 2 && x < p[2] + 2 && z > p[1] - 2 && z < p[3] + 2)) continue; k.tree(R.chance(.8) ? 'oak' : 'euca', x, z, R.range(1.05, 1.45)); }
}
/* ---------- capela (marco do B, fora da área de jogo) ---------- */
function vilaChapel(k, x, z) {
  k.begin(x, z, 0); const S = { wall: 0xfaf3e6, roof: 0xb5402a };
  k.S(-5, -2, -8, 5, 7, 8, TX.plaster, S.wall, { us: .4, kind: 'stone' }); k.S(-5.1, 0, -8.1, 5.1, .8, 8.1, TX.stone, 0xa89a88, { nc: true, us: .6 });
  k.V(m => { m.push().tr(0, 7, 0); m.mat(TX.tile, 40).col(S.roof).uvs(.4, .4).gableRoof(11, 3.6, 17); m.mat(TX.plaster, 0).col(S.wall).uvs(.4, .4).gableEnds(9.98, 3.58, 15.98); m.pop(); });
  k.S(-2.4, -2, -11.6, 2.4, 14, -7.2, TX.plaster, S.wall, { us: .4, kind: 'stone' });
  k.S(-1.1, 10.4, -11.66, 1.1, 12.6, -11.56, TX.white, 0x2a1e14, { nc: true }); k.S(-1.1, 10.4, -7.14, 1.1, 12.6, -7.04, TX.white, 0x2a1e14, { nc: true });
  k.V(m => { m.mat(TX.tile, 40).col(S.roof).uvs(.5, .5).cyl(3.4, 0, 4.2, 4, 0, 14, -9.4, 1); m.mat(TX.metal, 80).col(0xe8c050).box(.14, 1.6, .14, 0, 19.0, -9.4).box(.9, .14, .14, 0, 19.3, -9.4); m.mat(TX.metal, 60).col(0xd0a040).sph(.55, .55, .55, 10, 8, 0, 11.4, -9.4); });
  k.mm.push({ t: 'rect', x0: x - 5, z0: z - 11.6, x1: x + 5, z1: z + 8, c: '#d8c8a8' });
}
function buildVila(seed) {
  seed = seed || 21; const A = VILA, Y = A.Y, B = { x0: -122, x1: 122, z0: -112, z1: 112 }, k = new MapKit('vila', B, seed), R = k.R;
  k.setBase((x, z) => { const ex = Math.max(0, Math.abs(x) - 76), ez = Math.max(0, Math.abs(z) - 74), e = Math.hypot(ex, ez); return Y + (e > 0 ? e * .16 + (fbm(x * .03 + 7, z * .03, 3) - .3) * Math.min(e, 12) * .5 : 0); });
  /* plantações ao redor da vila (fora da área de jogo) */
  k.field(-118, -40, -80, 30, 'wheat'); k.field(80, 10, 118, 70, 'corn'); k.field(-60, 80, -10, 106, 'corn'); k.field(14, -108, 70, -82, 'wheat');
  /* caminhos de terra batida */
  k.road([[0, 66], [0, 48]], 5); k.road([[-57, 48], [57, 48]], 4.4); k.road([[-57, 48], [-57, -6]], 4); k.road([[57, 48], [57, -6]], 4); k.road([[0, 44], [0, 14]], 3.4);
  k.road([[-20, -3], [-44, -3]], 3); k.road([[20, -3], [44, -3]], 3); k.road([[0, -14], [0, -52]], 3); k.road([[-4, -24], [-44, -24]], 2.6); k.road([[4, -24], [44, -24]], 2.6); k.road([[-55, -56], [55, -56]], 4); k.road([[-55, -56], [-55, -36]], 3.6); k.road([[55, -56], [55, -36]], 3.6); k.road([[0, -66], [0, -56]], 4);
  k.yards = [{ x0: -20, z0: -14, x1: 20, z1: 14, m: 3, k: .6 }, { x0: -12, z0: 52, x1: 12, z1: 68, m: 3, k: .7 }, { x0: -12, z0: -68, x1: 12, z1: -52, m: 3, k: .6 },
    { x0: -70, z0: -36, x1: -44, z1: -2, m: 3, k: .5 }, { x0: 44, z0: -36, x1: 70, z1: -2, m: 3, k: .5 }];
  k.commitTerrain(1); const W = k.W;
  /* ---- quarteirões (o "negativo" das ruas) ---- */
  const used = []; for (const r of A.solids()) vilaBlock(k, r, R, used);
  /* ---- spawn do ataque: arco, tendas, fogueira, carroça ---- */
  gateArch(k, 0, 52.5, 0, 9); campfire(k, 0, 66.2); tent(k, 8, 66.2, 0, 0xc8742a); tent(k, -8, 66.2, 0, 0x4a8a58); k.crate(10.4, 54.2, 0, 1.1); k.barrel(-10.6, 54.4, 0xc03a2a); k.hayBale(-10.6, 60, 1, {});
  /* ---- Rua de Baixo: cobertura nas esquinas ---- */
  k.crate(-26, 46.2, 0, 1.2); k.crate(-26, 46.2, .3, 1.0, { base: 1.2 }); k.hayBale(-40, 49.8, 1, {}); k.barrel(-48, 45.4, 0x3a8a4a); k.crate(24, 49.8, .2, 1.2); k.hayBale(38, 46.2, 1, {}); k.barrel(47, 49.6, 0xe0a020); k.barrel(48.2, 49.6, 0xc03a2a);
  /* ---- Estradas A / B: carroças, feno, trator ---- */
  k.crate(-54.4, 30, 0, 1.2); k.crate(-54.4, 31.2, .3, 1.0); k.hayBale(-59.5, 18, 0, { round: true }); tractor(k, -58.2, 14, 1, 0xc03a22); k.barrel(-60.5, -2, 0x2f6fd0);
  k.crate(54.4, 34, 0, 1.2); k.hayBale(59.5, 22, 0, { round: true }); k.crate(54.6, 10, .2, 1.2); k.crate(54.6, 11.2, 0, 1.0); pickup(k, 58.6, 14, 1, 0xc84a2a);
  scarecrow(k, -60.6, 38, 1); scarecrow(k, 60.6, 30, 1);
  /* porteiras de pedra na chegada aos sites (a defesa segura o estreitamento) */
  stoneGateX(k, 6, -62, -52, 3.6, Y, -55.4); stoneGateX(k, 6, 52, 62, 3.6, Y, 55.4);
  /* ---- Viela do Meio ---- */
  k.crate(2.4, 34, 0, 1.0); k.crate(-2.4, 24, .2, 1.0); k.barrel(2.5, 17, 0xe0a020);
  /* ---- Praça: poço, grande mangueira, bancos, canteiros, postes ---- */
  well(k, -9, 5); k.tree('oak', 8, -5, 1.7); flowerBed(k, -12, -9, 3.2, 1.6); flowerBed(k, 12, 9, 3.2, 1.6); bench(k, -16, 3, 1); bench(k, 16, -3, 3); lampPost(k, -18.6, 12.6); lampPost(k, 18.6, -12.6); lampPost(k, -18.6, -12.6); lampPost(k, 18.6, 12.6);
  k.crate(-4, 11, .2, 1.2); k.crate(4.5, -12, 0, 1.1); k.hayBale(13, 3, 1, {}); k.barrel(-14.5, -12.4, 0x3a8a4a);
  /* ---- Becos A / B ---- */
  k.crate(-30, -1.4, 0, 1.1); k.crate(-38, -4.6, .2, 1.1); k.crate(30, -4.6, 0, 1.1); k.crate(38, -1.4, .2, 1.1);
  /* ---- Corredor da Igreja: portão de madeira (estreitamento) ---- */
  k.begin(0, -34, 0, Y); k.S(-4, 0, -.3, -1.6, 3.2, .3, TX.wood, 0x7a5232, { us: .7, kind: 'wood' }); k.S(1.6, 0, -.3, 4, 3.2, .3, TX.wood, 0x7a5232, { us: .7, kind: 'wood' }); k.S(-4, 3.2, -.3, 4, 3.6, .3, TX.wood, 0x6a4428, { us: .7, kind: 'wood' });
  k.crate(2.6, -42, 0, 1.0); k.crate(-1.8, -30, .2, 1.0); k.crate(-20, -22.4, 0, 1.1); k.barrel(-34, -25.6, 0x3a8a4a); k.crate(20, -25.6, .2, 1.1); k.hayBale(34, -22.6, 0, {});
  /* ---- bombsite A: MOINHO (moinho de vento, palheiro elevado, feno) ---- */
  windmill(k, -63, -28, 12); hayLoft(k, -54, -30, Y, 1);
  for (const [x, z, r] of [[-52, -11, 0], [-50.6, -11, 0], [-64, -12, 1]]) k.hayBale(x, z, r, {}); k.crate(-49, -14, .2, 1.2); k.crate(-49, -14, 0, 1.0, { base: 1.2 }); k.crate(-60, -21, 0, 1.2); k.barrel(-67.6, -18, 0xc03a2a); k.barrel(-67.6, -16.8, 0xe0a020);
  /* ---- bombsite B: CAPELA (adro com bancos, carroça, coreto elevado) ---- */
  hayLoft(k, 63, -30, Y, -1); well(k, 55, -26);
  for (const [x, z, r] of [[50, -16, 0], [51.2, -16.2, .2], [62, -14, .1]]) k.crate(x, z, r, 1.2); k.crate(50.6, -16, 0, 1.0, { base: 1.2 }); k.hayBale(57, -10, 1, {}); k.barrel(67.6, -20, 0x2f6fd0); bench(k, 60, -21, 0); bench(k, 52.5, -32, 0);
  /* ---- spawn da defesa: bandeiras azuis, arco ---- */
  gateArch(k, 0, -52.5, 0, 9);
  for (const s of [-1, 1]) { k.begin(s * 10.5, -66, 0, Y); k.S(-.12, 0, -.12, .12, 5, .12, TX.wood, 0x6a4428, { us: 1, kind: 'wood' }); k.V(m => { m.mat(TX.cloth, 0, 30).col(0x1f8a82).uvs(1, 1).box(1.6, 1.0, .04, .8, 4.4, 0); }); }
  k.crate(-9, -54.5, 0, 1.1); k.crate(9, -54.5, .2, 1.1); k.barrel(-30, -58.6, 0x2f6fd0); k.barrel(30, -53.4, 0xc03a2a); k.hayBale(-44, -57, 1, {}); k.crate(44, -58, 0, 1.2);
  /* ---- cerquinhas e postes ao longo das ruas (só visual) ---- */
  for (const [a, b, c, d] of [[-50, 52.15, -30, 52.15], [30, 52.15, 50, 52.15], [-50, 43.85, -24, 43.85], [24, 43.85, 50, 43.85], [-62.15, 10, -62.15, 34], [62.15, 8, 62.15, 30], [-40, -51.85, -16, -51.85], [16, -51.85, 40, -51.85]]) vilaFence(k, a, b, c, d);
  for (const [x, z] of [[-30, 51.4], [30, 44.6], [-61.4, 0], [61.4, 40], [-24, -52.6], [24, -59.4]]) lampPost(k, x, z);
  /* ---- marcos de fundo: moinhos, capela, caixa-d'água, silos (fora da área) ---- */
  vilaChapel(k, 84, -20); windmill(k, -88, 30, 11); windmill(k, 92, 64, 10); waterTower(k, -84, -70); silo(k, 82, -74, 2.6, 11); silo(k, 88, -64, 2.2, 9); tractor(k, -40, 86, 1, 0xc03a22);
  /* ---- marcadores dos sites ---- */
  const SA = A.sites.A, SB = A.sites.B;
  k.sites.A = { id: 'A', name: 'Moinho', ...SA, x: (SA.x0 + SA.x1) / 2, z: (SA.z0 + SA.z1) / 2, r: 11 };
  k.sites.B = { id: 'B', name: 'Capela', ...SB, x: (SB.x0 + SB.x1) / 2, z: (SB.z0 + SB.z1) / 2, r: 11 };
  for (const S of [k.sites.A, k.sites.B]) { siteMarker(k, S.x0, S.z0, S.x1, S.z1); siteLetter(k, S.id, S.x, S.z, 7.5, S.id === 'A' ? 0xf2c14e : 0x7fd6cc); k.mm.push({ t: 'site', id: S.id, x: S.x, z: S.z }); }
  for (const [x, z, id, rot] of [[-61.5, -5, 'A', 0], [-43.4, -1.5, 'A', 1], [-58.5, -36.6, 'A', 0], [61.5, -5, 'B', 0], [43.4, -1.5, 'B', 1], [58.5, -36.6, 'B', 0]]) arenaSign(k, x, z, id, rot, Y);
  /* ---- spawns ---- */
  for (let i = 0; i < 10; i++) k.spawns.atk.push({ x: -8 + (i % 5) * 4, z: 58 + Math.floor(i / 5) * 4, yaw: 0 });
  for (let i = 0; i < 10; i++) k.spawns.def.push({ x: -8 + (i % 5) * 4, z: -64 + Math.floor(i / 5) * 4, yaw: PI });
  /* ---- vegetação ---- */
  W.finalize(); const splat = k.splatFn();
  k.plantField(-118, -40, -80, 30, 'wheat'); k.plantField(80, 10, 118, 70, 'corn'); k.plantField(-60, 80, -10, 106, 'corn'); k.plantField(14, -108, 70, -82, 'wheat');
  const inField = (x, z) => (x > -120 && x < -78 && z > -42 && z < 32) || (x > 78 && x < 120 && z > 8 && z < 72) || (x > -62 && x < -8 && z > 78 && z < 108) || (x > 12 && x < 72 && z > -110 && z < -80);
  k.forest({ spacing: 7.6, tries: 4000, over: 6, tight: .9, density: (x, z) => { if (inField(x, z) || (x > 76 && x < 92 && z > -34 && z < -4)) return 0; const e = Math.max(Math.abs(x) - 78, Math.abs(z) - 76); return e > 0 ? Math.min(1, .5 + e * .05) : 0; }, kinds: (x, z, r) => { const q = r.f(); return q < .62 ? 'oak' : q < .85 ? 'euca' : 'pine'; } });
  for (let i = 0; i < 220; i++) { const x = R.range(-71, 71), z = R.range(-69, 69); if (!A.inWalk(x, z) || k.hitsBox(x, z, 1.4) || k.nearRoad(x, z, 2.4) || !k.dry(x, z, .5)) continue; if (R.chance(.45)) k.bush(x, z, R.range(.45, .7)); }
  k.scatterGrass(splat, .11); k.scatterFlowers(splat, 160);
  for (const c of A.callouts) k.mm.push({ t: 'label', x: c.x, z: c.z, name: c.name.trim(), small: true });
  const map = finishMap(k, splat, 'vila', 'Vila Girassol', 'dia');
  map.viewB = { x0: -84, x1: 84, z0: -82, z1: 82 }; map.callouts = A.callouts.map(c => Object.assign({}, c, { name: c.name.trim() }));
  map.inPlay = (x, z) => A.inWalk(x, z); map.maxStand = 3.4;
  map.tacB = { x0: -71, x1: 71, z0: -69, z1: 69 }; map.navCs = 1.0; map.falls = []; map.regions = [];
  map.stage = { A: [{ x: -57, z: 14 }, { x: -14, z: -3 }], B: [{ x: 57, z: 14 }, { x: 14, z: -3 }] };
  map.playB = { x0: -72, x1: 72, z0: -70, z1: 70 };
  map.decorSpots = { ch: [[0, 60, 5], [-12, 6, 4], [57, -24, 4], [-32, 48, 4]], pg: [[-9, 64, 3]] };
  return map;
}
/* registro de mapas competitivos (seleção no menu) */
const TAT_MAPS = [
  { id: 'vila', name: 'Vila Girassol', desc: 'Vila do interior · A no Moinho, B na Capela · praça com poço no meio · 3 saídas do ataque', build: () => buildVila(21) }
];
