/* =====================================================================
   21_props.js — predefinições: casas, celeiro, silo, moinho, caixa d'água,
   trator, caminhonete, poço, espantalho, ponte, letras de bomba…
   ===================================================================== */
'use strict';
const PAL = {
  houses: [
    { wall: { tex: TX.plaster, col: 0xf6eedc, us: .45 }, roof: { tex: TX.tile, col: 0xe8946a, h: 2.6, us: .45 }, shutters: 0x3a7ab8, trim: 0xffffff, mmc: '#c9b79c' },
    { wall: { tex: TX.wood, col: 0xf0cf6c, us: .5 }, roof: { tex: TX.shingle, col: 0x5f86c8, h: 2.3, us: .4 }, shutters: 0x3f8a4a, trim: 0xffffff, mmc: '#c9a84c' },
    { wall: { tex: TX.wood, col: 0x9ccbe8, us: .5 }, roof: { tex: TX.tile, col: 0xd0705a, h: 2.6, us: .45 }, shutters: 0xffffff, trim: 0xffffff, mmc: '#7aa6c4' },
    { wall: { tex: TX.brick, col: 0xf0d4c0, us: .45 }, roof: { tex: TX.shingle, col: 0xa84a3a, h: 2.5, us: .4 }, shutters: 0x7a3a2a, trim: 0xf2eee0, mmc: '#b2644a' },
    { wall: { tex: TX.plaster, col: 0xeed2d8, us: .45 }, roof: { tex: TX.tile, col: 0xcf7a52, h: 2.6, us: .45 }, shutters: 0x2f6f5f, trim: 0xffffff, mmc: '#c79aa6' }
  ]
};
const PAL_SEDE = { wall: { tex: TX.wood, col: 0xf6deaa, us: .5 }, roof: { tex: TX.shingle, col: 0xd8603a, h: 3.6, us: .4 }, shutters: 0x2f6fb0, trim: 0xffffff, mmc: '#d8a860' };
const CONT_COLS = [0x2f6fd0, 0xd04a2a, 0x2f9a58, 0xe0a020, 0xb8bcc4, 0x7a3fb0, 0x20a0b8, 0xc8c0a0];

/* Casa de fazenda. v: variante de paleta. nf: andares. */
function farmhouse(k, x, z, rot, v, o) {
  o = o || {}; const P = o.pal || PAL.houses[v % PAL.houses.length], nf = o.floors || 1, w = o.w || 10, d = o.d || 8, fh = 3, Pd = o.porch === undefined ? 2.6 : o.porch;
  const doors = [{ s: 'S', at: o.doorAt === undefined ? .5 : o.doorAt, w: 1.3, h: 2.3 }].concat(o.back === false ? [] : [{ s: 'N', at: .5, w: 1.2, h: 2.3 }]);
  const wins = [{ s: 'S', at: .5, n: 2, gap: .52, w: 1.2, h: 1.2, sill: 1.0, f: 0 }, { s: 'N', at: .5, n: 2, gap: .55, w: 1.1, h: 1.1, sill: 1.1, f: 0 }, { s: 'W', at: .5, n: Math.max(1, Math.round(d / 4.5)), gap: .35, w: 1.1, h: 1.1, sill: 1.0 }, { s: 'E', at: .5, n: Math.max(1, Math.round(d / 4.5)), gap: .35, w: 1.1, h: 1.1, sill: 1.0 }];
  if (nf > 1) wins.push({ s: 'S', at: .5, n: 3, gap: .3, w: 1.1, h: 1.2, sill: 1.0, f: 1 }, { s: 'N', at: .5, n: 2, gap: .5, w: 1.1, h: 1.2, sill: 1.0, f: 1 });
  const stairs = nf > 1 ? { x: -w / 2 + 1.4, z: -d / 2 + 1.0, dx: 0, dz: 1, w: 1.1, n: 14, run: .3, rise: fh / 14 } : null;
  if (stairs) { stairs.dx = 0; stairs.dz = 1; }
  const info = k.building({ x, z, rot, w, d, fh, floors: nf, wall: P.wall, roof: P.roof, trim: P.trim, shutters: P.shutters, doors, wins, porch: Pd ? { s: 'S', depth: Pd } : null, chimney: o.chimney === false ? null : { x: w / 2 - 1.6, z: -d / 4 }, stairs, mmc: P.mmc });
  /* mobília simples */
  k.begin(x, z, rot);
  if (o.furnish !== false) {
    k.S(w / 2 - 2.6, .14, d / 2 - 1.6, w / 2 - .5, .95, d / 2 - .5, TX.wood, 0xb88a58, { us: 1, kind: 'wood' });          /* balcão/mesa */
    k.S(-w / 2 + .5, .14, -d / 2 + 1.0 + (stairs ? 4.6 : 0), -w / 2 + 1.9, .6, -d / 2 + 2.2 + (stairs ? 4.6 : 0), TX.cloth, 0xc84a3a, { us: 1, kind: 'cloth' });  /* sofá */
    if (nf > 1) k.S(w / 2 - 2.5, fh + .02, -d / 2 + .5, w / 2 - .5, fh + .62, -d / 2 + 2.2, TX.cloth, 0xe8d8a8, { us: 1, kind: 'cloth' });  /* cama */
  }
  k.begin(x, z, rot); return info;
}
/* Celeiro grande */
function barn(k, x, z, rot, o) {
  o = o || {}; const w = o.w || 24, d = o.d || 14, fh = 3.6;
  const info = k.building({ x, z, rot, w, d, fh, floors: 2, th: .3, wall: { tex: TX.barn, col: o.wallCol || 0xffffff, us: .5 }, roof: { tex: TX.metal, col: o.roofCol || 0x9a4a40, h: 4.4, us: .4, spec: 90, over: .8 }, trim: o.trimCol || 0xffffff,
    doors: [{ s: 'S', at: .5, w: 5.2, h: 4.0 }, { s: 'N', at: .5, w: 5.2, h: 4.0 }, { s: 'E', at: .5, w: 1.6, h: 2.4 }],
    wins: [{ s: 'S', at: .5, n: 1, w: 2.2, h: 1.6, sill: .6, f: 1 }, { s: 'W', at: .5, n: 3, gap: .3, w: 1.0, h: 1.2, sill: 1.2, f: 0 }, { s: 'E', at: .22, n: 1, w: 1.0, h: 1.2, sill: 1.2, f: 1 }, { s: 'W', at: .5, n: 2, gap: .35, w: 1.0, h: 1.2, sill: 1.0, f: 1 }, { s: 'N', at: .15, n: 1, w: 1.0, h: 1.2, sill: 1.2, f: 0 }],
    stairs: { x: -w / 2 + 1.0, z: d / 2 - 2.2, dx: 0, dz: -1, w: 1.3, n: 16, run: .32, rise: fh / 16 }, chimney: null, mmc: '#b24a3a', porch: null, noBase: false });
  /* portas de correr abertas (trilho em cima), folhas vermelhas com moldura e "X" brancos; cantos e beirais brancos */
  k.begin(x, z, rot); const hd = d / 2, hw = w / 2;
  k.V(m => {
    for (const sd of [1, -1]) {
      const zz = sd * (hd + .12); m.mat(TX.metal, 80).col(0x3a3d44).uvs(1, 1).box(10.8, .12, .1, 0, 4.25, zz);
      for (const e of [-1, 1]) {
        const cx = e * 3.95; m.push().tr(cx, 2.05, zz);
        m.mat(TX.barn, 0).col(0xffffff).uvs(.5, .5).box(2.6, 4.0, .08);
        m.mat(TX.trim, 0).col(0xffffff).uvs(1, 1).box(2.6, .14, .1, 0, 1.93, 0).box(2.6, .14, .1, 0, -1.93, 0).box(.14, 4.0, .1, -1.23, 0, 0).box(.14, 4.0, .1, 1.23, 0, 0).box(2.5, .12, .1, 0, 0, 0);
        for (const sg of [-1, 1]) { m.push().tr(0, sg * .98, 0).rz(Math.atan2(1.9, 2.4) * sg).box(2.9, .12, .1).pop(); m.push().tr(0, sg * .98, 0).rz(-Math.atan2(1.9, 2.4) * sg).box(2.9, .12, .1).pop(); }
        m.pop();
      }
      m.mat(TX.trim, 0).col(0xffffff).uvs(1, 1).box(5.5, .2, .12, 0, 4.1, sd * (hd + .05)).box(.2, 4.1, .12, -2.7, 2.05, sd * (hd + .05)).box(.2, 4.1, .12, 2.7, 2.05, sd * (hd + .05));
    }
    m.mat(TX.trim, 0).col(0xffffff).uvs(1, 1);
    for (const a of [-1, 1]) for (const b of [-1, 1]) m.box(.26, fh * 2, .26, a * (hw + .02), fh, b * (hd + .02));
    for (const b of [-1, 1]) m.box(w + .3, .22, .2, 0, fh * 2 - .05, b * (hd + .08));
  });
  /* feno dentro */
  for (let i = 0; i < 4; i++) k.hayBale(x + (rot % 2 ? 0 : -w / 2 + 3 + i * 1.2), z + (rot % 2 ? -w / 2 + 3 + i * 1.2 : -d / 2 + 2), 0, {});
  return info;
}
/* Galpão aberto com telhado de zinco */
function shed(k, x, z, rot, w, d, o) {
  o = o || {}; k.begin(x, z, rot); const h = 3.6, hw = w / 2, hd = d / 2;
  for (const [px, pz] of [[-hw + .2, -hd + .2], [hw - .2, -hd + .2], [-hw + .2, hd - .2], [hw - .2, hd - .2], [0, -hd + .2], [0, hd - .2]]) k.S(px - .13, 0, pz - .13, px + .13, h, pz + .13, TX.wood, 0xb89060, { us: 1, kind: 'wood' });
  k.S(-hw, 0, -hd, hw, .1, hd, TX.dirt ? TX.dirt : TX.soil, 0x9a8a70, { nc: true, nv: true });
  k.S(-hw, 0, -hd, hw, 1.2, -hd + .12, TX.metal, 0x9aa0a8, { us: .5, spec: 90, kind: 'metal' });      /* parede de fundo baixa */
  k.S(-hw, 0, -hd, -hw + .12, 1.2, hd, TX.metal, 0x9aa0a8, { us: .5, spec: 90, kind: 'metal' });
  k.roof(w, d, h, 1.5, TX.metal, o.roofCol || 0xc0563c, TX.metal, 0x8a9098, .6, { spec: 110, us: .5, noFascia: false });
  k.mm.push({ t: 'rect', ...k.rectOf(-hw, -hd, hw, hd), c: '#8a8f95' });
}
/* Silo */
function silo(k, x, z, r, h) {
  r = r || 3; h = h || 12; k.begin(x, z, 0);
  k.C(0, 0, r, 0, h, TX.metal, 0xdfe3e6, { us: .5, vs: .5, spec: 120, seg: 18, kind: 'metal', caps: 1 });
  k.V(m => { m.mat(TX.metal, 130).col(0xc8ccd0).uvs(.5, .5).sph(r, r * .62, r, 18, 6, 0, h, 0); m.mat(TX.metal, 140).col(0x777e86).uvs(1, 1); for (let y = 1.6; y < h; y += 2.6) m.cyl(r + .04, r + .04, .12, 18, 0, y, 0, 0); m.cyl(.35, .35, 1.2, 8, 0, h + r * .55, 0, 3); m.push().tr(r + .02, 0, 0).mat(TX.wood, 0).col(0x806040).uvs(1, 1).box(.08, h, .5, 0, h / 2, 0).pop(); });
  k.mm.push({ t: 'circ', x, z, r, c: '#9aa0a8' });
}
/* Moinho de vento: torre + rotor animado (em k.anim) */
function windmill(k, x, z, h) {
  h = h || 11; k.begin(x, z, 0); k.C(0, 0, 1.9, 0, h, TX.stone, 0xe6dccb, { us: .55, vs: .55, seg: 10, r1: 1.0, kind: 'stone' });
  k.V(m => { m.mat(TX.tile, 0).col(0xd0705a).uvs(.5, .5).cyl(1.4, .1, 2.2, 10, 0, h, 0, 1); m.mat(TX.trim, 0).col(0xffffff).uvs(1, 1).box(.5, .9, .08, 0, 1.2, 1.88).box(.5, .9, .08, 0, 1.2, -1.88); });
  k.anim.push({ t: 'windmill', x, y: k.t.y + h - .2, z, r: 5.5 }); k.mm.push({ t: 'circ', x, z, r: 1.9, c: '#cfc6b6' });
}
/* Caixa d'água com placa BOMBAKI */
function waterTower(k, x, z) {
  k.begin(x, z, 0); const lg = 3.0, hT = 10;
  for (const [a, b] of [[-lg, -lg], [lg, -lg], [-lg, lg], [lg, lg]]) k.C(a * .8, b * .8, .3, 0, hT, TX.wood, 0x8a6a48, { us: 1, vs: .5, seg: 8, kind: 'wood', r1: .22 });
  k.V(m => {
    m.mat(TX.wood, 0).col(0x7a5a3a).uvs(1, 1);
    const br = (x0, y0, z0, x1, y1, z1) => { const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dy, dz), yaw = Math.atan2(dx, dz), pit = -Math.asin(dy / L); m.push().tr((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2).ry(yaw).rx(pit).box(.12, .12, L).pop(); };
    const q = lg * .8; for (const y0 of [0, 4.5]) { br(-q, y0 + .3, -q, q, y0 + 4.2, -q); br(q, y0 + .3, -q, -q, y0 + 4.2, -q); br(-q, y0 + .3, q, q, y0 + 4.2, q); br(q, y0 + .3, q, -q, y0 + 4.2, q); br(-q, y0 + .3, -q, -q, y0 + 4.2, q); br(-q, y0 + .3, q, -q, y0 + 4.2, -q); br(q, y0 + .3, -q, q, y0 + 4.2, q); br(q, y0 + .3, q, q, y0 + 4.2, -q); }
    m.mat(TX.plank2, 0).col(0x9a7a58).uvs(.6, .6).box(q * 2 + 1, .3, q * 2 + 1, 0, hT + .1, 0);
    m.mat(TX.wood, 0).col(0xa07850).uvs(.6, .5).cyl(3.3, 3.3, 3.8, 20, 0, hT + .25, 0, 1);
    for (const y of [hT + 1.0, hT + 2.6]) { m.mat(TX.metal, 130).col(0x5a5a60).uvs(1, 1).cyl(3.38, 3.38, .14, 20, 0, y, 0, 0); }
    m.mat(TX.shingle, 0).col(0x7a7a84).uvs(.5, .5).cyl(3.6, .15, 1.8, 20, 0, hT + 4.0, 0, 1);
    m.mat(TX.sign, 0).col(0xffffff).uvs(1, 1); for (const a of [0, PI / 2, PI, PI * 1.5]) { m.push().ry(a).tr(0, hT + 2.1, 3.3 + .05); m.quad([-2.0, -1.0, 0], [2.0, -1.0, 0], [2.0, 1.0, 0], [-2.0, 1.0, 0], 0, 1, 1, 0); m.pop(); }
    m.mat(TX.wood, 0).col(0x6a4a2a).uvs(1, 1).box(.5, 9, .1, 2.0, hT / 2, -2.3 - 0);
  });
  k.mm.push({ t: 'circ', x, z, r: 3.4, c: '#8a6a48' });
}
/* trator */
/* arco de para-lama (no plano XY local, espessura em z) */
function fenderArc(m, cx, cy, cz, r, w, col, t) { m.mat(TX.white, 120).col(col).uvs(1, 1); const n = 7; for (let i = 0; i < n; i++) { const a = PI * (i + .5) / n, L = r * PI / n + .02; m.push().tr(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz).rz(a - PI / 2).box(L, t || .09, w).pop(); } }
function tractor(k, x, z, rot, col) {
  col = col === undefined ? 0xc03a22 : col; k.begin(x, z, rot);
  k.S(-1.9, .45, -.65, .45, 1.55, .65, TX.white, col, { us: 1, spec: 140, kind: 'metal' }); k.S(-1.85, 1.55, -.55, .4, 1.62, .55, TX.white, shadeHex(col, 1.15), { nc: true, spec: 140 });                        /* capô */
  k.S(.45, .45, -.85, 1.95, 1.0, .85, TX.white, col, { us: 1, spec: 140, kind: 'metal' });                         /* base cabine */
  for (const [a0, b0] of [[-.8, -.68], [.68, .8]]) for (const xx of [.55, 1.78]) k.S(xx, 1.0, a0, xx + .12, 2.66, b0, TX.white, 0x2a2d33, { nc: true, spec: 60 });
  k.S(.58, 1.15, -.77, 1.87, 2.62, .77, TX.glass, 0xffffff, { nc: true, tr: true });
  k.S(.45, 2.65, -.95, 2.05, 2.8, .95, TX.white, col, { nc: true, spec: 140 }); k.S(-1.6, 1.0, -.3, -1.2, 1.3, .3, TX.white, 0xfff4c0, { nc: true, emis: 30 });
  k.S(-1.95, .35, -.5, -1.8, 1.2, .5, TX.metal, 0x333338, { nc: true, spec: 60 });                                   /* grade */
  for (const [wx, r, wz] of [[1.2, 1.05, -1.0], [1.2, 1.05, 1.0], [-1.25, .62, -.9], [-1.25, .62, .9]]) k.V(m => { m.push().tr(wx, r, wz).rx(PI / 2).mat(TX.rubber, 0).col(0xffffff).uvs(.7, .7).cyl(r, r, .55, 14, 0, -.27, 0, 3).mat(TX.metal, 90).col(0xe8c040).uvs(1, 1).cyl(r * .55, r * .55, .58, 12, 0, -.29, 0, 3).pop(); });
  k.S(-1.0, 1.55, -.07, -.86, 2.55, .07, TX.metal, 0x333338, { nc: true }); k.W.addBox(...k.rectBox(-1.9, 0, -1.0, 2.05, 1.1, 1.0), 'metal', false);
  /* acabamento cartoon: para-lamas traseiros, escapamento com chapéu, banco, volante, faróis redondos, cravos dos pneus, contrapesos */
  k.V(m => {
    for (const s of [-1, 1]) { fenderArc(m, 1.2, 1.05, s * 1.0, 1.18, .62, col); m.mat(TX.rubber, 0).col(0x2a2a2e).uvs(1, 1); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; m.push().tr(1.2 + Math.cos(a) * 1.05, 1.05 + Math.sin(a) * 1.05, s * 1.0).rz(a).box(.09, .12, .5).pop(); } }
    m.mat(TX.metal, 120).col(0x2f3238).cyl(.07, .07, 1.5, 8, -.7, 1.55, -.3, 2); m.mat(TX.metal, 120).col(0x2f3238).cyl(.11, .08, .14, 8, -.7, 3.02, -.3, 3);
    m.mat(TX.cloth, 20).col(0x2a2a2e).uvs(1, 1).box(.5, .12, .55, 1.25, 1.12, 0).box(.12, .45, .55, 1.5, 1.35, 0);
    m.push().tr(.8, 1.6, 0).rz(.9); m.mat(TX.rubber, 0).col(0x2a2a2e).cyl(.2, .2, .04, 12, 0, 0, 0, 3); m.pop();
    for (const s of [-1, 1]) { m.push().tr(-1.92, 1.15, s * .38).rz(PI / 2); m.mat(TX.metal, 160).col(0xdfe5ec).cyl(.15, .15, .06, 12, 0, 0, 0, 3); m.mat(TX.white, 0, 0, 30).col(0xfff4c0).cyl(.11, .11, .07, 10, 0, -.005, 0, 3); m.pop(); }
    for (let i = 0; i < 4; i++) m.mat(TX.metal, 60).col(0x3a3d44).box(.22, .5, 1.1 - i * .05, -2.05 - i * .0, .55, 0);
    m.mat(TX.white, 120).col(0xffffff).box(.02, .12, 1.32, -.9, 1.25, 0);
  });
  k.mm.push({ t: 'rect', ...k.rectOf(-1.9, -1.0, 2.05, 1.0), c: '#a04030' });
}
MapKit.prototype.rectBox = function (x0, y0, z0, x1, y1, z1) { const p = this.wxz(x0, z0), q = this.wxz(x1, z1), by = this.t.y; return [Math.min(p[0], q[0]), by + y0, Math.min(p[1], q[1]), Math.max(p[0], q[0]), by + y1, Math.max(p[1], q[1])]; };
/* caminhonete velha */
/* caminhonete cartoon: lataria pintada (sem textura de contêiner), capô mais baixo que a cabine, para-lamas, faróis e caçamba */
function pickup(k, x, z, rot, col) {
  col = col === undefined ? 0x3a78b0 : col; k.begin(x, z, rot); const dk = shadeHex(col, .72), lt = shadeHex(col, 1.12), PO = { us: 1, spec: 140, nc: true };
  k.W.addBox(...k.rectBox(-2.65, .3, -1.0, 2.75, 1.6, 1.0), 'metal', false); k.W.addBox(...k.rectBox(-.1, 1.6, -.92, 1.65, 2.35, .92), 'metal', false);
  /* chassi escuro e saias */
  k.S(-2.5, .38, -.88, 2.6, .62, .88, TX.white, 0x2b2d33, { nc: true, spec: 40 });
  /* caçamba (traseira, -x): piso, laterais e tampa */
  k.S(-2.6, .62, -1.0, -.1, 1.05, 1.0, TX.white, col, PO); k.S(-2.55, 1.05, -.98, -.15, 1.12, .98, TX.wood, 0x8a5a34, { nc: true, us: 1 });
  for (const sd of [-1, 1]) { k.S(-2.6, 1.05, sd > 0 ? .86 : -1.0, -.1, 1.55, sd > 0 ? 1.0 : -.86, TX.white, col, PO); k.S(-2.62, 1.5, sd > 0 ? .84 : -1.02, -.08, 1.6, sd > 0 ? 1.02 : -.84, TX.white, lt, PO); }
  k.S(-2.66, 1.05, -.86, -2.5, 1.55, .86, TX.white, col, PO); k.S(-2.69, 1.3, -.4, -2.65, 1.42, .4, TX.white, 0xf0f0f0, { nc: true, spec: 160 });
  /* cabine com janelas, teto arredondado e retrovisores */
  k.S(-.1, .62, -.95, 1.6, 1.6, .95, TX.white, col, PO);
  k.S(.0, 1.6, -.9, 1.45, 2.25, .9, TX.white, col, PO); k.S(.05, 2.25, -.85, 1.4, 2.36, .85, TX.white, lt, PO);
  k.S(1.43, 1.68, -.8, 1.47, 2.18, .8, TX.glass, 0xffffff, { nc: true, tr: true }); k.S(-.03, 1.7, -.75, .01, 2.15, .75, TX.glass, 0xffffff, { nc: true, tr: true });
  for (const sd of [-1, 1]) { k.S(.25, 1.7, sd > 0 ? .9 : -.92, 1.3, 2.15, sd > 0 ? .92 : -.9, TX.glass, 0xffffff, { nc: true, tr: true }); k.S(1.25, 1.75, sd * 1.04 - .04, 1.35, 1.95, sd * 1.04 + .04, TX.white, dk, { nc: true }); k.S(.3, 1.3, sd > 0 ? .95 : -.97, .55, 1.36, sd > 0 ? .97 : -.95, TX.metal, 0xdfe5ec, { nc: true, spec: 180 }); }
  /* capô, grade cromada, faróis, para-choques */
  k.S(1.6, .62, -.92, 2.6, 1.32, .92, TX.white, col, PO); k.S(1.62, 1.32, -.85, 2.5, 1.4, .85, TX.white, lt, PO);
  k.S(2.6, .7, -.7, 2.7, 1.22, .7, TX.metal, 0xc8ccd4, { nc: true, spec: 180 }); for (let i = 0; i < 4; i++) k.S(2.69, .78 + i * .12, -.62, 2.72, .82 + i * .12, .62, TX.white, 0x2a2d33, { nc: true });
  for (const sd of [-1, 1]) { k.S(2.62, 1.0, sd * .72 - .14, 2.74, 1.22, sd * .72 + .14, TX.white, 0xfff4c0, { nc: true, emis: 40 }); k.S(-2.7, 1.2, sd * .8 - .1, -2.64, 1.4, sd * .8 + .1, TX.white, 0xe02a20, { nc: true, emis: 30 }); }
  k.S(2.65, .45, -1.0, 2.85, .68, 1.0, TX.metal, 0xdfe5ec, { nc: true, spec: 200 }); k.S(-2.82, .45, -1.0, -2.6, .68, 1.0, TX.metal, 0xdfe5ec, { nc: true, spec: 200 });
  /* para-lamas arredondados + rodas com calota */
  for (const [wx, wz] of [[1.75, -1], [1.75, 1], [-1.6, -1], [-1.6, 1]]) {
    k.V(m => fenderArc(m, wx, .46, wz * .97, .58, .2, col, .1));
    k.V(m => { m.push().tr(wx, .46, wz * .93).rx(PI / 2); m.mat(TX.rubber, 0).col(0x34343a).uvs(.7, .7).cyl(.46, .46, .32, 16, 0, -.16, 0, 3); m.mat(TX.metal, 160).col(0xe8eaee).uvs(1, 1).cyl(.26, .26, .34, 12, 0, -.17, 0, 3); m.mat(TX.white, 0).col(col).cyl(.1, .1, .36, 8, 0, -.18, 0, 3); m.pop(); });
  }
  k.V(m => {
    for (const sd of [-1, 1]) { m.push().tr(2.72, 1.11, sd * .72).rz(-PI / 2); m.mat(TX.metal, 180).col(0xdfe5ec).uvs(1, 1).cyl(.15, .15, .05, 12, 0, 0, 0, 3); m.mat(TX.white, 0, 0, 40).col(0xfff4c0).cyl(.115, .115, .06, 10, 0, .005, 0, 3); m.pop(); }
    m.push().tr(.72, 2.3, 0).rx(PI / 2); m.mat(TX.white, 140).col(lt).uvs(1, 1).cyl(.1, .1, 1.8, 8, 0, -.9, 0, 3); m.pop();          /* teto arredondado */
    m.mat(TX.white, 0).col(0xffffff).box(2.2, .06, .02, -1.35, 1.28, 1.005).box(2.2, .06, .02, -1.35, 1.28, -1.005);                  /* faixa lateral */
  });
  k.mm.push({ t: 'rect', ...k.rectOf(-2.7, -1, 2.8, 1), c: '#' + (col >>> 0).toString(16).padStart(6, '0') });
}
/* chiqueiro: cercado com lama, cocho e abrigo de telhado inclinado */
function pigpen(k, x, z, w, d) {
  const hw = w / 2, hd = d / 2; k.fence(x - hw, z - hd, x + hw, z - hd, { col: 0xb08050 }); k.fence(x + hw, z - hd, x + hw, z + hd, { col: 0xb08050 }); k.fence(x + hw, z + hd, x - hw, z + hd, { col: 0xb08050, gate: [.4, .6] }); k.fence(x - hw, z + hd, x - hw, z - hd, { col: 0xb08050 });
  k.begin(x, z, 0); k.S(-hw + .3, -.05, -hd + .3, hw - .3, .04, hd - .3, TX.mud, 0x8a6040, { nc: true, us: .3 });
  k.S(-1.2, 0, hd - 1.2, 1.2, .45, hd - .7, TX.wood, 0x8a5a34, { us: 1, kind: 'wood' }); k.S(-1.05, .3, hd - 1.1, 1.05, .43, hd - .8, TX.white, 0x4a8ac8, { nc: true, spec: 120 });
  for (const [a, b, h] of [[-hw + .5, -hd + .5, 2.2], [-hw + 3.5, -hd + .5, 2.2], [-hw + .5, -hd + 3, 1.6], [-hw + 3.5, -hd + 3, 1.6]]) k.S(a - .1, 0, b - .1, a + .1, h, b + .1, TX.wood, 0x6a4a2e, { us: 1, kind: 'wood' });
  k.V(m => { m.push().tr(-hw + 2, 1.95, -hd + 1.75).rx(-.2); m.mat(TX.metal, 40).col(0xa83a2a).uvs(.5, .5).box(4.2, .08, 3.4); m.pop(); });
  k.mm.push({ t: 'rect', x0: x - hw, z0: z - hd, x1: x + hw, z1: z + hd, c: '#7a5a3a' });
}
function shadeHex(c, f) { const r = Math.min(255, ((c >> 16) & 255) * f) | 0, g = Math.min(255, ((c >> 8) & 255) * f) | 0, b = Math.min(255, (c & 255) * f) | 0; return (r << 16) | (g << 8) | b; }
function well(k, x, z) { k.begin(x, z, 0); k.C(0, 0, 1.15, 0, 1.0, TX.stone, 0xd0c8b8, { us: .7, vs: .7, seg: 12, kind: 'stone' }); k.V(m => { m.mat(TX.wood, 0).col(0x7a5a3a).uvs(1, 1).box(.14, 2.4, .14, -1.0, 1.2, 0).box(.14, 2.4, .14, 1.0, 1.2, 0).box(2.3, .14, .14, 0, 2.4, 0); m.mat(TX.tile, 0).col(0xd0705a).uvs(.5, .5).gable(2.9, .9, 1.9, 0, 2.45, 0); m.mat(TX.wood, 0).col(0x6a4a2a).uvs(1, 1).cyl(.45, .4, .5, 8, 0, .1, 0, 3); m.mat(0, 0).col(0x103a5a).quad([-.9, .95, -.9], [.9, .95, -.9], [.9, .95, .9], [-.9, .95, .9]); }); k.mm.push({ t: 'circ', x, z, r: 1.2, c: '#9a9a90' }); }
/* espantalho */
function scarecrow(k, x, z, rot) { k.begin(x, z, rot); k.C(0, 0, .12, 0, 2.3, TX.wood, 0x8a6a48, { us: 1, seg: 6, kind: 'wood' }); k.V(m => { m.mat(TX.wood, 0).col(0x8a6a48).uvs(1, 1).box(1.9, .1, .1, 0, 1.75, 0); m.mat(TX.cloth, 0).col(0x4a78c8).uvs(1, 1).box(.6, .8, .26, 0, 1.4, 0); m.mat(TX.hay, 0).col(0xf0dc90).uvs(1, 1).box(.42, .42, .42, 0, 2.15, 0).box(.2, .2, .2, -.95, 1.75, 0).box(.2, .2, .2, .95, 1.75, 0); m.mat(TX.hay, 0).col(0xe0c070).uvs(1, 1).cyl(.45, .45, .06, 10, 0, 2.38, 0, 3).cyl(.25, .22, .3, 10, 0, 2.42, 0, 3); }); }
/* ponte de madeira sobre riacho: eixo along 'x' ou 'z' (rot 0 → comprimento em z) */
function bridge(k, x, z, rot, len, wid) {
  len = len || 7; wid = wid || 3; k.begin(x, z, rot, 0); const y = 0.18, hl = len / 2, hw = wid / 2, base = Math.max(k.H(x, z) - 0, 0.0);
  const e1 = k.wxz(0, -hl - 1), e2 = k.wxz(0, hl + 1), by = Math.max(k.W.waterY + .55, y, Math.min(k.H(e1[0], e1[1]), k.H(e2[0], e2[1])) - .05);
  k.t.y = 0; k.S(-hw, by - .2, -hl, hw, by, hl, TX.plank2, 0xb89060, { us: .6, kind: 'wood' });
  for (const sd of [-1, 1]) { k.S(sd * hw - .06, by, -hl, sd * hw + .06, by + 1.0, hl, TX.wood, 0x8a6a48, { us: 1, ng: true, kind: 'wood' }); for (let i = 0; i <= 4; i++) k.S(sd * hw - .1, by - .6, -hl + i * len / 4 - .1, sd * hw + .1, by + 1.1, -hl + i * len / 4 + .1, TX.wood, 0x6a4a2a, { nc: true, us: 1 }); }
  /* rampas nas pontas para subir suavemente */
  for (const sd of [-1, 1]) { const n = 3; for (let i = 0; i < n; i++) k.S(-hw, 0, sd * (hl + i * .5), hw, by * (n - i) / (n + 0), sd * (hl + (i + 1) * .5), TX.plank2, 0xb89060, { us: .6, kind: 'wood' }); }
  k.mm.push({ t: 'rect', ...k.rectOf(-hw, -hl, hw, hl), c: '#8a6a44' });
}
/* letras de bomba pintadas no chão (A ou B), blocos finos */
function siteLetter(k, ch, cx, cz, s, col) {
  k.begin(cx, cz, 0, k.H(cx, cz)); const bx = (x0, z0, x1, z1) => k.S(x0 * s, .03, z0 * s, x1 * s, .075, z1 * s, TX.white, col, { nc: true, us: .3, emis: 8 });
  const t = .14;
  if (ch === 'A') { bx(-.5, -.5, -.5 + t, .5); bx(.5 - t, -.5, .5, .5); bx(-.5, -.5, .5, -.5 + t); bx(-.5, -.05, .5, -.05 + t); }
  else { bx(-.5, -.5, -.5 + t, .5); bx(-.5, -.5, .4, -.5 + t); bx(-.5, -.07, .4, -.07 + t); bx(-.5, .5 - t, .4, .5); bx(.4 - t, -.5, .4, -.07); bx(.4 - t, -.07 + t, .4, .5); }
}
/* marcadores da zona de bomba: 4 estacas listradas + fita */
function siteMarker(k, x0, z0, x1, z1) {
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { const y = k.H(px, pz); k.begin(px, pz, 0, y); k.S(-.07, 0, -.07, .07, 1.6, .07, TX.wood, 0xf0c030, { nc: false, us: 1, ng: true }); k.S(-.075, .9, -.075, .075, 1.2, .075, TX.white, 0xcc2020, { nc: true }); k.S(-.075, 1.4, -.075, .075, 1.6, .075, TX.white, 0xcc2020, { nc: true }); }
  const tape = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), my = (k.H(ax, az) + k.H(bx, bz)) / 2 + 1.35; k.mb((ax + bx) / 2, (az + bz) / 2).push().tr((ax + bx) / 2, my, (az + bz) / 2).ry(Math.atan2(-(bz - az), bx - ax)).mat(TX.white, 0, 40).col(0xf0c030).uvs(1, 1).box(L, .08, .02).pop(); };
  tape(x0, z0, x1, z0); tape(x1, z0, x1, z1); tape(x1, z1, x0, z1); tape(x0, z1, x0, z0);
}
/* muro de pedra baixo (cobertura) */
function stoneWall(k, x0, z0, x1, z1, h) { h = h || 1.0; const x = Math.min(x0, x1), z = Math.min(z0, z1), X = Math.max(x0, x1), Z = Math.max(z0, z1), t = .5; k.begin(0, 0, 0, 0); const y = Math.max(k.H(x, z), k.H(X, Z)); k.S(x, y - .4, z, X, y + h, Z, TX.stone, 0xc8c0b0, { us: .6, kind: 'stone' }); k.S(x - .04, y + h, z - .04, X + .04, y + h + .1, Z + .04, TX.stone, 0xb0a898, { nc: true, us: .6 }); void t; }
/* abrigo pequeno (casinha / banheiro externo) */
function outhouse(k, x, z, rot) { k.building({ x, z, rot, w: 1.8, d: 1.8, fh: 2.4, floors: 1, th: .12, wall: { tex: TX.wood, col: 0xd8b878, us: .8 }, roof: { tex: TX.metal, col: 0x888e96, h: .5, over: .15, us: .6 }, doors: [{ s: 'S', at: .5, w: .8, h: 2.0 }], wins: [], porch: null, noBase: true, corners: false, mmc: '#8a6a44' }); }
/* galinheiro: casinha + cercado */
function coop(k, x, z, rot) {
  k.building({ x, z, rot, w: 5, d: 3.4, fh: 2.3, floors: 1, th: .15, wall: { tex: TX.wood, col: 0xe8c890, us: .8 }, roof: { tex: TX.shingle, col: 0x884a3a, h: 1.0, over: .4, us: .5 }, doors: [{ s: 'S', at: .25, w: .9, h: 1.9 }], wins: [{ s: 'N', at: .5, n: 1, w: .9, h: .7, sill: 1.1 }], porch: null, mmc: '#a07040', noBase: true });
  k.begin(x, z, rot); k.S(-2, 0, 1.7, 0, .8, 3.1, TX.wood, 0xc09060, { nc: true, nv: true }); k.mm.push({ t: 'rect', ...k.rectOf(-2.5, -1.7, 2.5, 1.7), c: '#a07040' });
}
/* fogueira decorativa */
function campfire(k, x, z) { k.begin(x, z, 0); k.V(m => { m.mat(TX.stone, 0).col(0xa8a098).uvs(1, 1); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; m.push().tr(Math.cos(a) * .7, .1, Math.sin(a) * .7).box(.28, .22, .28).pop(); } m.mat(TX.bark, 0).col(0x5a3a22).uvs(1, 1); for (let i = 0; i < 5; i++) m.push().tr(0, .22, 0).ry(i * 1.2).rx(.6).cyl(.07, .06, 1.1, 5, 0, -.1, 0, 3).pop(); m.mat(TX.white, 0, 0, 90).col(0xff8a20).uvs(1, 1).sph(.22, .3, .22, 6, 4, 0, .45, 0); }); k.mm.push({ t: 'circ', x, z, r: .7, c: '#e08030' }); k.W.addCyl(x, z, .55, k.t.y, k.t.y + .4, 'stone', true); k.loot.push({ x, y: k.t.y, z, fire: true }); }
/* tenda */
function tent(k, x, z, rot, col) { k.begin(x, z, rot); k.V(m => { m.mat(TX.cloth, 0).col(col === undefined ? 0x4a8a58 : col).uvs(.5, .5).gable(3.4, 1.9, 3.8, 0, 0, 0); m.mat(TX.cloth, 0).col(0x222222).uvs(1, 1).quad([-.5, 0, 1.9 + .02], [.5, 0, 1.9 + .02], [.4, 1.3, 1.9 + .02], [-.4, 1.3, 1.9 + .02]); }); k.S(-1.6, 0, -1.9, 1.6, 1.0, 1.9, TX.cloth, 0xffffff, { nv: true, kind: 'cloth' }); k.mm.push({ t: 'rect', ...k.rectOf(-1.7, -1.9, 1.7, 1.9), c: '#4a8a58' }); }
/* vaca (decoração viva — corpo é desenhado dinamicamente, colisão estática) */
function cow(k, x, z, rot) { const y = k.H(x, z); k.W.addCyl(x, z, .85, y, y + 1.5, 'flesh', false); k.animals.push({ t: 'cow', x, y, z, rot: rot || 0, ph: k.R.f() * 6 }); }
/* poste de luz / cerca da entrada (portão) com placa */
function gateArch(k, x, z, rot, wid) { k.begin(x, z, rot); const hw = (wid || 6) / 2; for (const s of [-1, 1]) k.S(s * hw - .2, 0, -.2, s * hw + .2, 3.4, .2, TX.wood, 0x7a5232, { us: 1, kind: 'wood' }); k.S(-hw - .3, 3.3, -.18, hw + .3, 3.75, .18, TX.wood, 0x6a4424, { nc: true, us: 1 }); k.V(m => { m.mat(TX.sign, 0).col(0xffffff).uvs(1, 1).quad([-1.9, 2.55, .2], [1.9, 2.55, .2], [1.9, 3.3, .2], [-1.9, 3.3, .2], 0, 1, 1, 0); m.quad([1.9, 2.55, -.2], [-1.9, 2.55, -.2], [-1.9, 3.3, -.2], [1.9, 3.3, -.2], 0, 1, 1, 0); }); k.W.addBox(...k.rectBox(-hw - .3, 3.0, -.18, hw + .3, 3.8, .18), 'wood', true); }

/* ---------- peças da vila e do campo (v5) ---------- */
/* banco de praça */
function bench(k, x, z, rot) { k.begin(x, z, rot); k.S(-.9, .42, -.22, .9, .5, .22, TX.wood, 0xc88a4a, { us: 1, kind: 'wood' }); k.S(-.9, .5, .18, .9, .95, .24, TX.wood, 0xc88a4a, { nc: true, us: 1 }); for (const sx of [-.75, .75]) k.S(sx - .05, 0, -.2, sx + .05, .42, .2, TX.metal, 0x3a3d44, { nc: true, spec: 60 }); }
/* poste de luz */
function lampPost(k, x, z) { k.begin(x, z, 0); k.C(0, 0, .07, 0, 3.4, TX.metal, 0x2f3238, { kind: 'metal', seg: 6 }); k.V(m => { m.mat(TX.white, 0, 0, 60).col(0xfff0b0).sph(.22, .26, .22, 8, 6, 0, 3.55, 0); m.mat(TX.metal, 80).col(0x2f3238).cyl(.28, .05, .2, 8, 0, 3.75, 0, 1); }); }
/* canteiro de flores */
function flowerBed(k, x, z, w, d) { k.begin(x, z, 0); k.S(-w / 2, 0, -d / 2, w / 2, .35, d / 2, TX.wood, 0x8a5a34, { us: 1, kind: 'wood' }); k.S(-w / 2 + .1, .35, -d / 2 + .1, w / 2 - .1, .4, d / 2 - .1, TX.soil, 0x6a4a2a, { nc: true });
  const R = k.R; k.V(m => { for (let i = 0; i < w * d * 3; i++) { const fx = R.range(-w / 2 + .25, w / 2 - .25), fz = R.range(-d / 2 + .25, d / 2 - .25); m.mat(TX.bush, 0).col(0x4fa83a).sph(.16, .18, .16, 6, 4, fx, .5, fz); m.mat(TX.white, 0).col(R.pick([0xff5a6a, 0xffd23a, 0xff8a2a, 0xffffff, 0xb05ae8])).sph(.08, .07, .08, 5, 3, fx, .68, fz); } }); }
/* venda/mercearia: casa com toldo listrado, letreiro e caixotes de frutas */
function venda(k, x, z, rot, name, cols) {
  cols = cols || [0xe8503a, 0xfaf4e8]; farmhouse(k, x, z, rot, 0, { w: 10, d: 8, floors: 1, porch: 0, furnish: false, pal: { wall: { tex: TX.plaster, col: 0xfbe6a8, us: .45 }, roof: { tex: TX.tile, col: 0xd8623a, h: 2.0, us: .45 }, shutters: 0x2f7a5a, trim: 0xffffff, mmc: '#e0b860' } });
  k.begin(x, z, rot); for (let i = 0; i < 8; i++) k.V(m => { m.mat(TX.cloth, 0).col(cols[i % 2]).uvs(1, 1).push().tr(-4.4 + i * 1.25 + .62, 2.85, 4.55).rx(-.45).box(1.25, .06, 1.6).pop(); });
  for (const sx of [-4.6, 4.6]) k.S(sx - .07, 0, 5.1, sx + .07, 2.6, 5.24, TX.wood, 0x7a5232, { kind: 'wood' });
  k.S(-2.4, 3.1, 4.02, 2.4, 3.9, 4.12, TX.wood, 0x5a3a20, { nc: true, us: 1 }); k.S(-2.25, 3.2, 4.12, 2.25, 3.8, 4.16, TX.white, 0xfff4d0, { nc: true });
  k.V(m => { m.mat(TX.white, 0).col(0xc0392b); const L = (name || 'VENDA').length, cw = 4.0 / Math.max(5, L); for (let i = 0; i < L; i++) if (name[i] !== ' ') m.box(cw * .62, .34, .02, -2.0 + cw * (i + .5), 3.5, 4.17); });
  for (const [cx, c] of [[-3.2, 0xff4a3a], [-2.1, 0xffc23a], [2.1, 0x7ac83a], [3.2, 0xff8a2a]]) { k.S(cx - .45, 0, 5.4, cx + .45, .55, 6.1, TX.wood, 0xc89a5a, { us: 1, kind: 'wood' }); k.V(m => { m.mat(TX.white, 0).col(c); for (let i = 0; i < 6; i++) m.sph(.13, .13, .13, 6, 4, cx - .28 + (i % 3) * .28, .62, 5.6 + Math.floor(i / 3) * .3); }); }
}
/* oficina: galpão aberto com letreiro, pneus empilhados e bancada */
function oficina(k, x, z, rot) {
  shed(k, x, z, rot, 10, 8, { roofCol: 0x2f6fb0 }); k.begin(x, z, rot);
  k.S(-3.6, 0, -3.4, 0, .95, -2.7, TX.wood, 0x8a5a34, { us: 1, kind: 'wood' }); k.S(-3.5, .95, -3.3, -2.9, 1.25, -2.9, TX.metal, 0xd0392b, { nc: true, spec: 120 });
  for (const [tx, tz] of [[3.2, -2.6], [3.2, -1.4]]) for (let i = 0; i < 4; i++) k.V(m => { m.push().tr(tx, .14 + i * .27, tz); m.mat(TX.rubber, 0).col(0x2a2a30).uvs(1, 1).cyl(.5, .5, .26, 14, 0, 0, 0, 3); m.mat(TX.metal, 120).col(0xc8ccd2).cyl(.24, .24, .27, 10, 0, 0, 0, 3); m.pop(); });
  k.S(-2.6, 3.0, 4.05, 2.6, 3.8, 4.15, TX.wood, 0x2f6fb0, { nc: true }); k.V(m => { m.mat(TX.white, 0).col(0xffd23a); for (let i = 0; i < 7; i++) m.box(.42, .4, .02, -1.95 + i * .65, 3.4, 4.17); });
}
/* estufa de horta: armação branca com vidro */
function estufa(k, x, z, rot, w, d) {
  k.begin(x, z, rot); const hw = w / 2, hd = d / 2, h = 2.4;
  for (const sx of [-hw, hw]) for (let zz = -hd; zz <= hd + .01; zz += d / 4) k.S(sx - .06, 0, zz - .06, sx + .06, h, zz + .06, TX.white, 0xf4f4f0, { kind: 'metal' });
  k.S(-hw, 0, -hd, hw, h, -hd + .05, TX.glass, 0xffffff, { tr: true, kind: 'glass' }); k.S(-hw, 0, -hd, -hw + .05, h, hd, TX.glass, 0xffffff, { tr: true, kind: 'glass' }); k.S(hw - .05, 0, -hd, hw, h, hd, TX.glass, 0xffffff, { tr: true, kind: 'glass' });
  k.S(-hw, 0, hd - .05, -1, h, hd, TX.glass, 0xffffff, { tr: true, kind: 'glass' }); k.S(1, 0, hd - .05, hw, h, hd, TX.glass, 0xffffff, { tr: true, kind: 'glass' });
  k.V(m => { m.push().tr(0, h, 0); m.mat(TX.glass, 60).col(0xe8fff0).gableRoof(w + .2, 1.2, d + .2); m.pop(); }, true);
  for (let i = 0; i < 3; i++) k.S(-hw + .8, 0, -hd + 1 + i * (d - 2) / 2 - .4, hw - .8, .5, -hd + 1 + i * (d - 2) / 2 + .4, TX.wood, 0x8a5a34, { us: 1, kind: 'wood' });
  k.V(m => { const R = k.R; for (let i = 0; i < 3; i++) for (let j = 0; j < w * 1.5; j++) { const px = -hw + 1 + j * (w - 2) / (w * 1.5), pz = -hd + 1 + i * (d - 2) / 2; m.mat(TX.bush, 0).col(0x4fb83a).sph(.2, .25, .2, 6, 4, px, .7, pz); if (R.f() < .5) m.mat(TX.white, 0).col(R.pick([0xe8302a, 0xffb02a])).sph(.08, .08, .08, 5, 3, px + .1, .8, pz); } });
  k.mm.push({ t: 'rect', ...k.rectOf(-hw, -hd, hw, hd), c: '#d8eee0' });
}
/* barquinho de madeira */
function rowboat(k, x, z, rot) { const y = Math.max(k.W.waterY + .05, k.H(x, z)); k.begin(x, z, rot, y); k.V(m => { m.mat(TX.wood, 0).col(0xb8743a).uvs(1, 1).box(1.3, .35, 3.2, 0, .18, 0).box(1.0, .3, .5, 0, .2, 1.75); m.mat(TX.wood, 0).col(0x8a5230).box(1.12, .06, 2.9, 0, .34, 0); m.mat(TX.wood, 0).col(0xe8d0a0).box(1.2, .08, .3, 0, .4, .3); m.mat(TX.white, 0).col(0xffffff).box(1.32, .08, 3.22, 0, .3, 0); }); }
