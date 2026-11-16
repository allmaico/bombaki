/* =====================================================================
   22_terrain.js — terreno (altura+splat), lagos/riacho, campos, vegetação
   ===================================================================== */
'use strict';
const WATER_Y = -0.15;
function distSeg(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz; let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(px - (ax + dx * t), pz - (az + dz * t)); }
function distPoly(px, pz, pts) { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) { const q = distSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (q < d) d = q; } return d; }
function rectDist(x, z, r) { const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1); return Math.hypot(dx, dz); }

MapKit.prototype.setBase = function (fn) { this.baseFn = fn; };
MapKit.prototype.road = function (pts, w) { this.roads.push({ pts, w: w || 4 }); };
MapKit.prototype.creek = function (pts, w, bottom) { (this.creeks || (this.creeks = [])).push({ pts, w: w || 2.4, bottom: bottom === undefined ? -.5 : bottom }); };
MapKit.prototype.pad = function (cx, cz, w, d, o) {
  o = o || {}; const hw = w / 2, hd = d / 2; let h = o.h;
  if (h === undefined) { const f = this.baseFn; h = (f(cx, cz) + f(cx - hw, cz - hd) + f(cx + hw, cz - hd) + f(cx - hw, cz + hd) + f(cx + hw, cz + hd)) / 5; h = Math.max(h, WATER_Y + (o.dry === undefined ? .35 : o.dry)); h = Math.round(h * 20) / 20; }
  this.pads.push({ x0: cx - hw, x1: cx + hw, z0: cz - hd, z1: cz + hd, y: h, m: o.margin === undefined ? 6 : o.margin }); return h;
};
MapKit.prototype.field = function (x0, z0, x1, z1, kind, o) { this.fields.push(Object.assign({ x0, z0, x1, z1, kind }, o || {})); if (kind === 'corn') this.W.addZone({ k: 'corn', x0, z0, x1, z1 }); };
MapKit.prototype.commitTerrain = function (res) {
  const base = this.baseFn, lakes = this.lakes, creeks = this.creeks || [], pads = this.pads;
  const fn = (x, z) => {
    let h = base(x, z);
    for (const L of lakes) { const dx = (x - L.cx) / L.rx, dz = (z - L.cz) / L.rz; let q = dx * dx + dz * dz; q *= 1 + .35 * (fbm(x * .07 + 11, z * .07 - 5, 3) - .5); if (q < 1.3) { const t = 1 - smooth(.15, 1.2, q); if (L.bottom < h) h += (L.bottom - h) * t; } if (L.isl) for (const I of L.isl) { const di = Math.hypot(x - I[0], z - I[1]); if (di < I[2]) h = Math.max(h, -.2 + 1.25 * (1 - smooth(I[2] * .45, I[2], di))); } }
    for (const C of creeks) { const d = distPoly(x, z, C.pts) + (fbm(x * .18, z * .18, 2) - .5) * .8; if (d < C.w * 1.7) { const t = 1 - smooth(C.w * .3, C.w * 1.7, d); if (C.bottom < h) h += (C.bottom - h) * t; } }
    for (const p of pads) { const d = rectDist(x, z, p); if (d < p.m) { const t = 1 - smooth(0, p.m, d); h += (p.y - h) * t; } }
    return h;
  };
  this.hfn = fn; this.W.setTerrain(fn, res || 1); this.W.waterY = WATER_Y;
};
/* mapa de pesos: [grama, terra, areia, cascalho] */
MapKit.prototype.splatFn = function () {
  const roads = this.roads, pads = this.pads, W = this.W, yards = this.yards || [];
  /* caixas envolventes das estradas: evita calcular distância a todas em cada vértice */
  for (const R of roads) { if (R.bb) continue; let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of R.pts) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } const m = R.w + 2; R.bb = [a - m, b - m, c + m, d + m]; }
  return (x, z, h, ny) => {
    let g = 1, d = 0, s = 0, r = 0;
    const nn = fbm(x * .35, z * .35, 2) - .5, n2 = fbm(x * .045 + 7, z * .045 - 3, 3);
    for (const R of roads) { const bb = R.bb; if (x < bb[0] || z < bb[1] || x > bb[2] || z > bb[3]) continue; const dd = distPoly(x, z, R.pts) + nn * 1.8; if (dd < R.w) { const t = 1 - smooth(R.w * .35, R.w, dd); d = Math.max(d, t); r = Math.max(r, t * .22 * fbm(x * .5, z * .5, 2)); } }
    for (const p of pads) { const dd = rectDist(x, z, p) + nn * 2.0; if (dd < 4) d = Math.max(d, (1 - smooth(0, 4, dd)) * .55 * smooth(.38, .62, n2)); }
    for (const y of yards) { const dd = rectDist(x, z, y) + nn * 1.8; if (dd < (y.m || 3)) d = Math.max(d, (1 - smooth(0, y.m || 3, dd)) * (y.k === undefined ? .9 : y.k)); }
    if (n2 > .66) d = Math.max(d, smooth(.66, .8, n2) * .55);
    const wd = W.waterY - h; if (wd > -.5) { const t = smooth(-.5, .1, wd); s = Math.max(s, t * .95); if (wd > .25) { d = 0; s = 1; } }
    if (h > W.waterY + .1 && h < W.waterY + .7 && wd < 0) s = Math.max(s, .0);
    const sum = d + s + r; if (sum > 1) { d /= sum; s /= sum; r /= sum; } g = Math.max(0, 1 - d - s - r);
    return [g, d, s, r];
  };
};
/* malhas do terreno: interno 1 m (com margem) + externo grosso */
MapKit.prototype.terrainMeshes = function (splat) {
  const b = this.b, hf = this.hfn, out = [], M = 28, CH = 32, W = this.W;
  /* dentro do mapa usa a grade de alturas já calculada (rápido); fora dela, a função completa */
  const fn = (x, z) => (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) ? W.heightAt(x, z) : hf(x, z);
  const build = (xa, za, xb, zb, step, drop) => {
    const nx = Math.round((xb - xa) / step), nz = Math.round((zb - za) / step), mb = new MB((nx + 1) * (nz + 1) + 8); mb.mat(TX.white, 0, 0, 0, 0);
    mb._grow((nx + 1) * (nz + 1), nx * nz * 6);
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = xa + i * step, z = za + j * step, h = fn(x, z), e = step; const hx = fn(x + e, z) - fn(x - e, z), hz = fn(x, z + e) - fn(x, z - e), l = Math.hypot(hx, 2 * e, hz);
      const ny = 2 * e / l, w = splat(x, z, h, ny), q = v => Math.max(0, Math.min(255, Math.round(v * 255)));
      mb.cw = ((q(w[3]) << 24) | (q(w[2]) << 16) | (q(w[1]) << 8) | q(w[0])) >>> 0; mb._v(x, h - (drop || 0), z, -hx / l, ny, -hz / l, 0, 0);
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, bb = a + 1, c = a + nx + 1, d = c + 1; mb._t(a, c, bb); mb._t(bb, c, d); }
    return mb;
  };
  const X0 = b.x0 - M, X1 = b.x1 + M, Z0 = b.z0 - M, Z1 = b.z1 + M;
  for (let z = Z0; z < Z1; z += CH) for (let x = X0; x < X1; x += CH) out.push({ mb: build(x, z, Math.min(x + CH, X1), Math.min(z + CH, Z1), 1, 0), lodMb: build(x, z, Math.min(x + CH, X1), Math.min(z + CH, Z1), 4, .12) });
  /* externo: anel 4 m, levemente abaixado */
  const O = 560, S = 128;
  for (let z = -O; z < O; z += S) for (let x = -O - 40; x < O + 40; x += S) {
    if (x >= X0 - 1 && x + S <= X1 + 1 && z >= Z0 - 1 && z + S <= Z1 + 1) continue;
    out.push({ mb: build(x, z, x + S, z + S, 8, .6) });
  }
  return out;
};
/* água: grade 2 m onde há lâmina d'água (alpha = profundidade) */
MapKit.prototype.waterMeshes = function () {
  const b = this.b, W = this.W, hf = this.hfn, wy = W.waterY, out = []; const step = 1.5, CH = 48;
  const fn = (x, z) => (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) ? W.heightAt(x, z) : hf(x, z);
  for (let z0 = b.z0 - 20; z0 < b.z1 + 20; z0 += CH) for (let x0 = b.x0 - 20; x0 < b.x1 + 20; x0 += CH) {
    const n = Math.round(CH / step), mb = new MB(512); mb.mat(TX.white, 0, 0, 0, 0); let any = false;
    const dep = (x, z) => wy - fn(x, z);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const xa = x0 + i * step, za = z0 + j * step, xb = xa + step, zb = za + step, d00 = dep(xa, za), d10 = dep(xb, za), d01 = dep(xa, zb), d11 = dep(xb, zb);
      if (d00 < -.22 && d10 < -.22 && d01 < -.22 && d11 < -.22) continue; any = true;
      mb._grow(4, 6); const a = mb.n; const q = d => Math.max(0, Math.min(1, d / 1.0)), al = d => ((((q(d) * 255) | 0) << 24) | 0xffffff) >>> 0;
      mb.cw = al(d00); mb._v(xa, wy, za, 0, 1, 0, 0, 0); mb.cw = al(d10); mb._v(xb, wy, za, 0, 1, 0, 0, 0); mb.cw = al(d01); mb._v(xa, wy, zb, 0, 1, 0, 0, 0); mb.cw = al(d11); mb._v(xb, wy, zb, 0, 1, 0, 0, 0);
      mb._t(a, a + 2, a + 1); mb._t(a + 1, a + 2, a + 3);
    }
    if (any) out.push({ mb });
  }
  return out;
};
/* campos (solo arado) */
MapKit.prototype.fieldMeshes = function () {
  const mb = new MB(4096), fn = this.hfn; mb.mat(TX.soil, 0, 0, 0, 0).col(0xffffff);
  for (const F of this.fields) {
    if (F.kind === 'pasture') continue; const step = 3, nx = Math.max(1, Math.round((F.x1 - F.x0) / step)), nz = Math.max(1, Math.round((F.z1 - F.z0) / step)), sx = (F.x1 - F.x0) / nx, sz = (F.z1 - F.z0) / nz;
    mb._grow((nx + 1) * (nz + 1), nx * nz * 6); const a0 = mb.n; mb.cw = F.col === undefined ? 0xffffffff : (0xff000000 | F.col) >>> 0;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = F.x0 + i * sx, z = F.z0 + j * sz; mb._v(x, fn(x, z) + .05, z, 0, 1, 0, x * .5, z * .5); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = a0 + j * (nx + 1) + i; mb._t(a, a + nx + 1, a + 1); mb._t(a + 1, a + nx + 1, a + nx + 2); }
  }
  /* fileiras da plantação pintadas no solo: do alto (paraquedas) a lavoura aparece verde/dourada em vez de terra lisa */
  const ROWC = { corn: [0x7cc23a, 0x9ad048], cassava: [0x4fa83a, 0x66b848], wheat: [0xf0c040, 0xe2a830], sunflower: [0x5f9a34, 0x78b040], horta: [0x58b840, 0xe8503a, 0x7cc23a, 0xf0a030, 0x3f9a3a, 0xb05ac8] };
  for (const F of this.fields) {
    const C = ROWC[F.kind]; if (!C) continue; const along = (F.x1 - F.x0) >= (F.z1 - F.z0), gap = F.kind === 'horta' ? 1.6 : 1.05, wid = F.kind === 'horta' ? 1.0 : .62;
    const L0 = along ? F.x0 : F.z0, L1 = along ? F.x1 : F.z1, A0 = along ? F.z0 : F.x0, A1 = along ? F.z1 : F.x1; let r = 0;
    for (let a = A0 + gap / 2; a < A1 - .2; a += gap, r++) {
      mb.mat(TX.bush, 0, 0, 0, 0); mb.cw = (0xff000000 | C[r % C.length]) >>> 0; const seg = 3;
      for (let l = L0 + .3; l < L1 - .3; l += seg) { const l2 = Math.min(L1 - .3, l + seg), P = (u, v) => along ? [u, fn(u, v) + .13, v] : [v, fn(v, u) + .13, u];
        const p0 = P(l, a - wid / 2), p1 = P(l2, a - wid / 2), p2 = P(l2, a + wid / 2), p3 = P(l, a + wid / 2); if (along) mb.quad(p3, p2, p1, p0, 0, 0, 1, 1); else mb.quad(p0, p1, p2, p3, 0, 0, 1, 1); }
    }
  }
  mb.mat(TX.soil, 0, 0, 0, 0); return mb;
};
/* ---- vegetação ---- */
MapKit.prototype.nearRoad = function (x, z, m) { for (const R of this.roads) { const bb = R.bb; if (bb && (x < bb[0] - m || z < bb[1] - m || x > bb[2] + m || z > bb[3] + m)) continue; if (distPoly(x, z, R.pts) < R.w * .5 + m) return true; } return false; };
MapKit.prototype.inPad = function (x, z, m) { for (const p of this.pads) if (rectDist(x, z, p) < m) return true; return false; };
MapKit.prototype.inField = function (x, z, m, kinds) { for (const F of this.fields) { if (kinds && kinds.indexOf(F.kind) < 0) continue; if (x > F.x0 - m && x < F.x1 + m && z > F.z0 - m && z < F.z1 + m) return true; } return false; };
MapKit.prototype.hitsBox = function (x, z, r) { const W = this.W; W.query(x, z, r + 1); for (const o of W.qb) if (x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r) return true; for (const c of W.qc) if (Math.hypot(x - c.x, z - c.z) < c.r + r) return true; return false; };
MapKit.prototype.dry = function (x, z, m) { return this.hfn(x, z) > this.W.waterY + (m === undefined ? .45 : m); };
MapKit.prototype.scatterGrass = function (splat, dens) {
  const R = this.R, b = this.b, W = this.W, area = (b.x1 - b.x0) * (b.z1 - b.z0), n = (area * dens) | 0;
  for (let i = 0; i < n; i++) {
    const x = R.range(b.x0 + 1, b.x1 - 1), z = R.range(b.z0 + 1, b.z1 - 1), h = W.heightAt(x, z); if (h < W.waterY + .3) continue;
    const w = splat(x, z, h, 1); if (R.f() > w[0] * w[0]) continue; if (this.inField(x, z, 0.5, ['corn', 'soil', 'cassava'])) continue;
    if (this.hitsBox(x, z, .3)) continue; const t = R.f() < .22 ? 'tuftL' : 'tuft', g = R.range(.75, 1.2);
    this.inst(t, x, h - .03, z, R.f() * TAU, R.range(.8, 1.35), [g * R.range(.85, 1.05), g, g * R.range(.7, .95)]);
  }
};
MapKit.prototype.scatterFlowers = function (splat, clusters) {
  const R = this.R, b = this.b, W = this.W;
  for (let c = 0; c < clusters; c++) {
    const cx = R.range(b.x0 + 4, b.x1 - 4), cz = R.range(b.z0 + 4, b.z1 - 4), k = (R.f() * 4) | 0, nn = R.int(5, 14);
    for (let i = 0; i < nn; i++) {
      const a = R.f() * TAU, r = R.range(0, 2.8), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, h = W.heightAt(x, z); if (h < W.waterY + .4 || this.nearRoad(x, z, 1) || this.hitsBox(x, z, .3) || this.inField(x, z, 0)) continue;
      this.inst('flower' + k, x, h - .02, z, R.f() * TAU, R.range(.8, 1.4), [1, 1, 1]);
    }
  }
};
/* campo de milho / mandioca / girassol em linhas */
MapKit.prototype.plantField = function (x0, z0, x1, z1, kind, sx, sz) {
  const R = this.R, W = this.W; sx = sx || .62; sz = sz || .7;
  for (let z = z0 + .3; z < z1; z += sz) for (let x = x0 + .3; x < x1; x += sx) {
    const px = x + R.range(-.18, .18), pz = z + R.range(-.18, .18), h = W.heightAt(px, pz); if (h < W.waterY + .25) continue;
    const g = R.range(.85, 1.12); this.inst(kind, px, h - .02, pz, R.f() * TAU, R.range(.85, 1.2), [g, g * R.range(.95, 1.05), g * R.range(.8, 1.0)]);
  }
};
/* árvores: preenchimento por ruído, com espaçamento mínimo */
MapKit.prototype.forest = function (opts) {
  const R = this.R, b = this.b, W = this.W, spacing = opts.spacing || 6, cell = spacing, grid = new Map(), out = []; const dens = opts.density;
  const ok = (x, z) => { const gx = Math.floor(x / cell), gz = Math.floor(z / cell); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = grid.get((gx + i) + ',' + (gz + j)); if (a) for (const q of a) if (Math.hypot(q[0] - x, q[1] - z) < spacing * (opts.tight || .82)) return false; } return true; };
  const tries = opts.tries || 6000;
  for (let i = 0; i < tries; i++) {
    const ex = opts.ex0 === undefined ? b.x0 - opts.margin : opts.ex0, x = R.range(b.x0 - (opts.over || 0), b.x1 + (opts.over || 0)), z = R.range(b.z0 - (opts.over || 0), b.z1 + (opts.over || 0)); void ex;
    const p = dens(x, z); if (p <= 0 || R.f() > p) continue; if (!this.dry(x, z, .6) || this.nearRoad(x, z, 3.2) || this.inPad(x, z, 1.5) || this.inField(x, z, 1.5) || this.hitsBox(x, z, 1.2)) continue; if (!ok(x, z)) continue;
    const gx = Math.floor(x / cell), gz = Math.floor(z / cell), key = gx + ',' + gz; (grid.get(key) || grid.set(key, []).get(key)).push([x, z]);
    const kn = opts.kinds ? opts.kinds(x, z, R) : 'oak'; const s = (R.f() < .12 ? R.range(1.35, 1.6) : R.range(.72, 1.3)) * (opts.scale || 1);
    if (x < b.x0 + 1 || x > b.x1 - 1 || z < b.z0 + 1 || z > b.z1 - 1) { this.inst(kn, x, this.hfn(x, z) - .1, z, R.f() * TAU, s * 1.2, [R.range(.8, 1.1), R.range(.85, 1.1), R.range(.8, 1)]); continue; }
    this.tree(kn, x, z, s); out.push([x, z]);
  }
  return out;
};
