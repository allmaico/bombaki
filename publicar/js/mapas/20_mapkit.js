/* =====================================================================
   20_mapkit.js — kit de cenário "roça": prédios, escadas, contêineres,
   cercas, árvores, lagos… gera colisão (World) + malhas (MB) juntos
   ===================================================================== */
'use strict';
const KIND_OF = {}; Object.assign(KIND_OF, { [TX.wood]: 'wood', [TX.barn]: 'wood', [TX.trim]: 'wood', [TX.plank2]: 'wood', [TX.bark]: 'wood', [TX.hay]: 'hay', [TX.metal]: 'metal', [TX.cont]: 'metal', [TX.rust]: 'metal', [TX.shingle]: 'wood', [TX.tile]: 'stone', [TX.plaster]: 'stone', [TX.stone]: 'stone', [TX.brick]: 'stone', [TX.soil]: 'dirt', [TX.board]: 'wood', [TX.door]: 'wood', [TX.rubber]: 'rubber', [TX.cloth]: 'cloth', [TX.cow]: 'flesh' });
const SIDES = { N: 0, S: 1, W: 2, E: 3 };

class MapKit {
  constructor(id, bounds, seed) {
    this.id = id; this.b = bounds; this.W = new World(bounds); this.R = new RNG(seed || 1); this.CS = 48;
    this.cells = new Map(); this.insts = new Map(); this.mm = []; this.anim = []; this.animals = []; this.loot = []; this.sites = {}; this.spawns = { atk: [], def: [], ffa: [] };
    this.t = { x: 0, z: 0, r: 0, y: 0 }; this.dyn = []; this.nc = 0; this.lakes = []; this.pads = []; this.roads = []; this.fields = []; this.waterMBs = []; this.fieldMBs = []; this.cover = [];
  }
  cellOf(x, z) { const k = Math.floor((x - this.b.x0) / this.CS) + ',' + Math.floor((z - this.b.z0) / this.CS); let c = this.cells.get(k); if (!c) { c = { mb: new MB(4096), tr: new MB(512) }; this.cells.set(k, c); } return c; }
  mb(x, z, tr) { const c = this.cellOf(x, z); return tr ? c.tr : c.mb; }
  H(x, z) { return this.W.heightAt(x, z); }
  /* ---- transformação local ---- */
  begin(x, z, rot, y) { this.t = { x, z, r: ((rot | 0) % 4 + 4) % 4, y: y === undefined || y === null ? this.W.heightAt(x, z) : y }; return this; }
  wxz(lx, lz) { const t = this.t, a = t.r * PI / 2, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a)); return [t.x + lx * c + lz * s, t.z - lx * s + lz * c]; }
  /* caixa local: colisão + visual */
  S(x0, y0, z0, x1, y1, z1, tex, col, o) {
    o = o || {}; const t = this.t, a = t.r * PI / 2, [ax, az] = this.wxz(x0, z0), [bx, bz] = this.wxz(x1, z1), by = t.y + (o.base || 0);
    let box = null;
    if (!o.nc) box = this.W.addBox(Math.min(ax, bx), by + y0, Math.min(az, bz), Math.max(ax, bx), by + y1, Math.max(az, bz), o.kind || KIND_OF[tex] || 'wood', !!o.ng);
    if (!o.nv) {
      const [cx, cz] = this.wxz((x0 + x1) / 2, (z0 + z1) / 2), m = this.mb(t.x, t.z, o.tr);
      m.push().tr(cx, by + (y0 + y1) / 2, cz).ry(a).mat(tex, o.spec || 0, o.wind || 0, o.emis || 0, o.cut || 0).col(col === undefined ? 0xffffff : col).uvs(o.us === undefined ? .5 : o.us, o.vs === undefined ? (o.us === undefined ? .5 : o.us) : o.vs).box(x1 - x0, y1 - y0, z1 - z0).pop();
    }
    return box;
  }
  /* cilindro local (vertical) com colisão */
  C(lx, lz, r, y0, y1, tex, col, o) {
    o = o || {}; const t = this.t, [wx, wz] = this.wxz(lx, lz), by = t.y + (o.base || 0);
    if (!o.nc) this.W.addCyl(wx, wz, r, by + y0, by + y1, o.kind || KIND_OF[tex] || 'wood', !!o.ng);
    if (!o.nv) this.mb(t.x, t.z, o.tr).push().tr(wx, by + y0, wz).mat(tex, o.spec || 0, o.wind || 0, o.emis || 0, 0).col(col === undefined ? 0xffffff : col).uvs(o.us === undefined ? .5 : o.us, o.vs === undefined ? .5 : o.vs).cyl(r, o.r1 === undefined ? r : o.r1, y1 - y0, o.seg || 12, 0, 0, 0, o.caps === undefined ? 3 : o.caps).pop();
  }
  /* malha livre em coordenadas locais (função recebe o MB já posicionado na origem local + altura) */
  V(fn, tr) { const t = this.t, m = this.mb(t.x, t.z, tr); m.push().tr(t.x, t.y, t.z).ry(t.r * PI / 2); fn(m); m.pop(); }
  /* parede com aberturas. side N/S (eixo x) ou W/E (eixo z). aberturas: {a,b,sill,top} em coords locais do eixo */
  wallSeg(axis, fixed0, fixed1, a0, a1, y0, y1, ops, tex, col, o) {
    o = o || {}; ops = (ops || []).slice().sort((p, q) => p.a - q.a); const H = y1 - y0; let cur = a0;
    const box = (u0, u1, v0, v1) => { if (u1 - u0 < .01 || v1 - v0 < .01) return; if (axis === 'x') this.S(u0, v0, fixed0, u1, v1, fixed1, tex, col, o); else this.S(fixed0, v0, u0, fixed1, v1, u1, tex, col, o); };
    for (const p of ops) { box(cur, p.a, y0, y1); box(p.a, p.b, y0, y0 + p.sill); box(p.a, p.b, y0 + p.top, y1); cur = p.b; }
    box(cur, a1, y0, y1);
  }
  /* escada local: parte de (x,z) subindo na direção (dx,dz) (±1,0 / 0,±1). largura w, n degraus */
  stairs(x, z, dx, dz, w, n, rise, run, tex, col, y0) {
    y0 = y0 || 0; const hw = w / 2;
    for (let i = 0; i < n; i++) {
      const a = i * run, b = (i + 1) * run, h = (i + 1) * rise;
      if (dx) { const xa = x + dx * a, xb = x + dx * b; this.S(Math.min(xa, xb), y0, z - hw, Math.max(xa, xb), y0 + h, z + hw, tex || TX.plank2, col === undefined ? 0xc8a070 : col, { us: .6, kind: 'wood' }); }
      else { const za = z + dz * a, zb = z + dz * b; this.S(x - hw, y0, Math.min(za, zb), x + hw, y0 + h, Math.max(za, zb), tex || TX.plank2, col === undefined ? 0xc8a070 : col, { us: .6, kind: 'wood' }); }
    }
    /* corrimãos */
    const L = n * run, top = n * rise;
    for (const sd of [-1, 1]) {
      const q = sd * (hw + .03);
      if (dx) this.V(m => { m.mat(TX.wood, 0).col(0x7a5a3a).uvs(1, 1).push().tr(x + dx * L / 2, y0 + top / 2 + .95, z + q).rz(-Math.atan2(top, L) * dx).box(Math.hypot(L, top), .06, .06).pop(); });
      else this.V(m => { m.mat(TX.wood, 0).col(0x7a5a3a).uvs(1, 1).push().tr(x + q, y0 + top / 2 + .95, z + dz * L / 2).rx(Math.atan2(top, L) * dz).box(.06, .06, Math.hypot(L, top)).pop(); });
    }
  }
  /* telhado de duas águas (cumeeira ao longo do eixo longo) + laje sob o telhado (colisão) */
  roof(w, d, y, h, rtex, rcol, wtex, wcol, over, o) {
    o = o || {}; over = over === undefined ? .5 : over; const along = d >= w;                 /* cumeeira ao longo de Z quando d>=w */
    const W = (along ? w : d) + over * 2, D = (along ? d : w) + (o.endOver === undefined ? .25 : o.endOver) * 2;
    this.V(m => {
      m.push().tr(0, y, 0); if (!along) m.ry(PI / 2);
      m.mat(rtex, o.spec || 0).col(rcol).uvs(o.us === undefined ? .5 : o.us, o.vs === undefined ? .5 : o.vs).gableRoof(W, h, D);
      m.mat(wtex, 0).col(wcol).uvs(.5, .5).gableEnds(W - .02, h - .01, D - .5 + .02); m.pop();
    });
    if (!o.noSlab) this.S(-w / 2, y - .05, -d / 2, w / 2, y + .2, d / 2, TX.wood, 0xffffff, { nv: true, kind: 'wood' });
    /* beirais (fascia) */
    if (!o.noFascia) this.V(m => { m.push().tr(0, y, 0); if (!along) m.ry(PI / 2); m.mat(TX.trim, 0).col(0xffffff).uvs(1, 1); const hw = W / 2, sl = Math.hypot(hw, h), an = Math.atan2(h, hw); for (const sd of [-1, 1]) m.push().tr(sd * (hw - .04), .0, 0).rz(-sd * an).tr(0, .0, 0).box(.05, .16, D).pop(); m.pop(); });
  }
  /* edifício retangular parametrizado. Retorna info (limites úteis) */
  building(o) {
    const w = o.w, d = o.d, fh = o.fh || 3, nf = o.floors || 1, th = o.th || .25, wt = o.wall.tex, wc = o.wall.col, wus = o.wall.us || .5, trim = o.trim === undefined ? 0xffffff : o.trim;
    this.begin(o.x, o.z, o.rot || 0, o.y); const hw = w / 2, hd = d / 2, t = this.t; const info = { x: o.x, z: o.z, w, d, h: nf * fh };
    for (let f = 0; f < nf; f++) {
      const y0 = f * fh, y1 = (f + 1) * fh, fl = o.floorTex || TX.plank2;
      const O = { N: [], S: [], W: [], E: [] };
      if (f === 0) for (const dr of o.doors || []) { const L = (dr.s === 'N' || dr.s === 'S') ? w : d, c = (dr.at === undefined ? .5 : dr.at) * L - L / 2; O[dr.s].push({ a: c - dr.w / 2, b: c + dr.w / 2, sill: 0, top: dr.h || 2.3 }); }
      for (const wn of o.wins || []) {
        if (wn.f !== undefined && wn.f !== f) continue; const L = (wn.s === 'N' || wn.s === 'S') ? w : d, n = wn.n || 1, sill = wn.sill === undefined ? 1 : wn.sill;
        for (let k = 0; k < n; k++) { const c = ((wn.at === undefined ? .5 : wn.at) + (k - (n - 1) / 2) * (wn.gap || .22)) * L - L / 2; O[wn.s].push({ a: c - wn.w / 2, b: c + wn.w / 2, sill, top: sill + (wn.h || 1.1), win: true }); }
      }
      for (const s of ['N', 'S', 'W', 'E']) O[s].sort((a, b) => a.a - b.a);
      const wo = { us: wus, vs: wus, kind: o.wall.kind };
      this.wallSeg('x', -hd, -hd + th, -hw, hw, y0, y1, O.N, wt, wc, wo); this.wallSeg('x', hd - th, hd, -hw, hw, y0, y1, O.S, wt, wc, wo);
      this.wallSeg('z', -hw, -hw + th, -hd + th, hd - th, y0, y1, O.W, wt, wc, wo); this.wallSeg('z', hw - th, hw, -hd + th, hd - th, y0, y1, O.E, wt, wc, wo);
      for (const s of ['N', 'S', 'W', 'E']) for (const p of O[s]) {
        const ax = (s === 'N' || s === 'S') ? 'x' : 'z', fx = s === 'N' ? -hd : s === 'S' ? hd : s === 'W' ? -hw : hw, sg = (s === 'N' || s === 'W') ? -1 : 1, bw = .09, y = y0 + p.sill, yt = y0 + p.top;
        const ex = sg > 0 ? [fx - .02, fx + .04] : [fx - .04, fx + .02];
        const pan = (a0, a1, b0, b1, tex, col, z0, z1) => { if (ax === 'x') this.S(a0, b0, z0, a1, b1, z1, tex, col, { nc: true, us: 1 }); else this.S(z0, b0, a0, z1, b1, a1, tex, col, { nc: true, us: 1 }); };
        const rect = (a0, a1, b0, b1) => pan(a0, a1, b0, b1, TX.trim, trim, ex[0], ex[1]);
        if (p.win) {
          rect(p.a - bw, p.a, y - .06, yt + bw); rect(p.b, p.b + bw, y - .06, yt + bw); rect(p.a - bw, p.b + bw, yt, yt + bw); rect(p.a - bw - .04, p.b + bw + .04, y - .1, y);
          /* vidro de verdade (transparente, quebrável, dá passagem quebrado) — sem a cruz de madeira no meio */
          const g0 = fx - sg * th / 2 - .03, g1 = g0 + .06, ly0 = y, ly1 = yt;
          if (this.glassLocal) { if (ax === 'x') this.glassLocal(p.a, ly0, g0, p.b, ly1, g1, false); else this.glassLocal(g0, ly0, p.a, g1, ly1, p.b, false); }
          if (o.shutters !== undefined) { const sz = sg > 0 ? [fx - .01, fx + .045] : [fx - .045, fx + .01]; pan(p.a - .52, p.a - .02, y, yt, TX.wood, o.shutters, sz[0], sz[1]); pan(p.b + .02, p.b + .52, y, yt, TX.wood, o.shutters, sz[0], sz[1]); }
        } else { rect(p.a - bw, p.a, y, yt + bw); rect(p.b, p.b + bw, y, yt + bw); rect(p.a - bw, p.b + bw, yt, yt + bw); }
      }
      if (f === 0) this.S(-hw + th, 0, -hd + th, hw - th, .14, hd - th, fl, o.floorCol === undefined ? 0xd2b48c : o.floorCol, { us: .5, kind: 'wood' });
      if (f > 0) {
        const sl = o.stairs, y = y0, slab = (a, b, c, e) => { if (b - a > .02 && e - c > .02) this.S(a, y - .22, c, b, y + .02, e, TX.plank2, 0xb89870, { us: .5, kind: 'wood' }); };
        if (sl) {
          const L = sl.n * sl.run, hx0 = Math.min(sl.x, sl.x + sl.dx * L) - (sl.dx ? 0 : sl.w / 2 + .05), hx1 = Math.max(sl.x, sl.x + sl.dx * L) + (sl.dx ? 0 : sl.w / 2 + .05), hz0 = Math.min(sl.z, sl.z + sl.dz * L) - (sl.dz ? 0 : sl.w / 2 + .05), hz1 = Math.max(sl.z, sl.z + sl.dz * L) + (sl.dz ? 0 : sl.w / 2 + .05);
          slab(-hw + th, hx0, -hd + th, hd - th); slab(hx1, hw - th, -hd + th, hd - th); slab(hx0, hx1, -hd + th, hz0); slab(hx0, hx1, hz1, hd - th);
        } else slab(-hw + th, hw - th, -hd + th, hd - th);
      }
    }
    if (o.stairs) { const s = o.stairs; this.stairs(s.x, s.z, s.dx, s.dz, s.w, s.n, s.rise || (fh * (nf > 1 ? 1 : 1) / s.n), s.run, TX.plank2, 0xc8a070, .14); }
    if (!o.noBase) { const e = .05, hg = .45; for (const r of [[-hw - e, -hd - e, hw + e, -hd + .02], [-hw - e, hd - .02, hw + e, hd + e], [-hw - e, -hd, -hw + .02, hd], [hw - .02, -hd, hw + e, hd]]) this.S(r[0], 0, r[1], r[2], hg, r[3], TX.stone, 0xb8b0a0, { nc: true, us: .6 }); }
    if (o.corners !== false) for (const [cx, cz] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]]) this.S(cx - (cx < 0 ? .07 : 0), 0, cz - (cz < 0 ? .07 : 0), cx + (cx < 0 ? 0 : .07), nf * fh, cz + (cz < 0 ? 0 : .07), TX.trim, trim, { nc: true, us: 1 });
    const rh = o.roof ? (o.roof.h === undefined ? 1.9 : o.roof.h) : 0;
    if (o.roof) { const r = o.roof; this.roof(w, d, nf * fh, rh, r.tex, r.col, wt, wc, r.over === undefined ? .55 : r.over, { spec: r.spec, us: r.us }); }
    else this.S(-hw, nf * fh - .05, -hd, hw, nf * fh + .2, hd, TX.wood, 0xffffff, { nv: true });
    if (o.porch) {
      const p = o.porch, dep = p.depth || 2.4, s = p.s || 'S', L = (s === 'N' || s === 'S') ? w : d, ww = p.w || L - .6, base = (s === 'N' || s === 'S') ? hd : hw, sg = (s === 'S' || s === 'E') ? 1 : -1, fz = sg * base;
      const R = (a0, a1, c0, c1, y0, y1, tex, col, oo) => (s === 'N' || s === 'S') ? this.S(a0, y0, sg > 0 ? fz + c0 : fz - c1, a1, y1, sg > 0 ? fz + c1 : fz - c0, tex, col, oo) : this.S(sg > 0 ? fz + c0 : fz - c1, y0, a0, sg > 0 ? fz + c1 : fz - c0, y1, a1, tex, col, oo);
      R(-ww / 2, ww / 2, 0, dep, 0, .22, TX.plank2, 0xc09a6a, { us: .5, kind: 'wood' });
      const nP = Math.max(2, Math.round(ww / 3.2) + 1); for (let i = 0; i < nP; i++) { const px = -ww / 2 + .12 + (ww - .24) * i / (nP - 1); R(px - .09, px + .09, dep - .22, dep - .04, 0, 2.45, TX.wood, 0xeee6d6, { us: 1, kind: 'wood' }); }
      R(-ww / 2 - .1, ww / 2 + .1, dep - .3, dep + .02, 2.45, 2.57, TX.trim, 0xffffff, { nc: true, us: 1 });
      this.V(m => { m.push(); if (s === 'N') m.ry(PI); else if (s === 'E') m.ry(PI / 2); else if (s === 'W') m.ry(-PI / 2); const rt = o.roof || { tex: TX.shingle, col: 0x888888 }; m.mat(rt.tex, rt.spec || 0).col(rt.col).uvs(.5, .5);
        m.dquad([-ww / 2 - .3, 2.62, base + dep + .3], [ww / 2 + .3, 2.62, base + dep + .3], [ww / 2 + .3, 3.0, base], [-ww / 2 - .3, 3.0, base], 0, 0, ww * .5, dep * .5); m.pop(); });
    }
    if (o.chimney) { const c = o.chimney, top = nf * fh + rh; this.S(c.x - .4, nf * fh - .5, c.z - .4, c.x + .4, top + 1.2, c.z + .4, TX.brick, 0xd8c0b0, { us: .6, kind: 'stone' }); this.S(c.x - .5, top + 1.2, c.z - .5, c.x + .5, top + 1.35, c.z + .5, TX.stone, 0x9a9a9a, { nc: true }); }
    info.t = { x: t.x, z: t.z, r: t.r, y: t.y };
    const rr = this.rectOf(-hw, -hd, hw, hd); this.mm.push({ t: 'rect', x0: rr.x0, z0: rr.z0, x1: rr.x1, z1: rr.z1, c: o.mmc || '#6b4a32' });
    this.pads.push({ x0: rr.x0 - 2.5, z0: rr.z0 - 2.5, x1: rr.x1 + 2.5, z1: rr.z1 + 2.5, y: t.y });
    return info;
  }
  /* ---- peças soltas ---- */
  container(x, z, rot, col, o) {
    o = o || {}; this.begin(x, z, rot, o.y); const L = o.len || 6.05, Wd = 2.44, Hh = 2.6, y = o.base || 0;
    this.S(-L / 2, y, -Wd / 2, L / 2, y + Hh, Wd / 2, TX.cont, col, { us: .42, vs: .42, spec: 90, kind: 'metal', base: 0 });
    /* quinas, portas */
    this.S(-L / 2 - .02, y, -Wd / 2 - .02, -L / 2 + .12, y + Hh, -Wd / 2 + .12, TX.metal, 0x777777, { nc: true, us: 1, spec: 60 }); this.S(-L / 2 - .02, y, Wd / 2 - .12, -L / 2 + .12, y + Hh, Wd / 2 + .02, TX.metal, 0x777777, { nc: true, us: 1, spec: 60 });
    this.S(L / 2 - .12, y, -Wd / 2 - .02, L / 2 + .02, y + Hh, -Wd / 2 + .12, TX.metal, 0x777777, { nc: true, us: 1, spec: 60 }); this.S(L / 2 - .12, y, Wd / 2 - .12, L / 2 + .02, y + Hh, Wd / 2 + .02, TX.metal, 0x777777, { nc: true, us: 1, spec: 60 });
    for (const q of [-.35, .35, -.05, .25]) this.S(L / 2 - .01, y + .15, q - .03, L / 2 + .04, y + Hh - .15, q + .03, TX.metal, 0x555555, { nc: true, spec: 120 });
    this.mm.push({ t: 'rect', ...this.rectOf(-L / 2, -Wd / 2, L / 2, Wd / 2), c: '#5a6a7a' });
  }
  rectOf(a, b, c, d) { const p = this.wxz(a, b), q = this.wxz(c, d); return { x0: Math.min(p[0], q[0]), z0: Math.min(p[1], q[1]), x1: Math.max(p[0], q[0]), z1: Math.max(p[1], q[1]) }; }
  crate(x, z, rot, s, o) { o = o || {}; this.begin(x, z, rot, o.y); const h = s * (o.h || 1); this.S(-s / 2, o.base || 0, -s / 2, s / 2, (o.base || 0) + h, s / 2, TX.wood, o.col === undefined ? 0xe0b878 : o.col, { us: 1 / s * .9, kind: 'wood' }); this.S(-s / 2 - .01, (o.base || 0), -s / 2 - .01, -s / 2 + .08, (o.base || 0) + h, s / 2 + .01, TX.board, 0xffffff, { nc: true, us: 1 }); this.S(s / 2 - .08, (o.base || 0), -s / 2 - .01, s / 2 + .01, (o.base || 0) + h, s / 2 + .01, TX.board, 0xffffff, { nc: true, us: 1 }); }
  barrel(x, z, col, o) { o = o || {}; this.begin(x, z, 0, o.y); this.C(0, 0, .42, o.base || 0, (o.base || 0) + 1.0, TX.metal, col === undefined ? 0xc03a2a : col, { us: .8, vs: .8, spec: 110, seg: 12, kind: 'metal' }); this.V(m => { m.mat(TX.metal, 140).col(0x333333).uvs(1, 1); for (const yy of [.2, .8]) m.cyl(.44, .44, .06, 12, 0, (o.base || 0) + yy, 0, 0); }); }
  hayBale(x, z, rot, o) { o = o || {}; this.begin(x, z, rot, o.y); const lying = o.lying !== false; if (o.round) { this.V(m => { m.mat(TX.hay, 0).col(0xffffff).uvs(.7, .7); m.push().tr(0, .75 + (o.base || 0), 0).rz(PI / 2).cyl(.75, .75, 1.2, 14, 0, -.6, 0).pop(); }); this.S(-.6, o.base || 0, -.75, .6, (o.base || 0) + 1.5, .75, TX.hay, 0xffffff, { nv: true, kind: 'hay' }); } else this.S(-.45, o.base || 0, -.9, .45, (o.base || 0) + .75, .9, TX.hay, o.col === undefined ? 0xf0dc90 : o.col, { us: 1, kind: 'hay' }); }
  /* cerca axis-aligned: de (x0,z0) a (x1,z1); passo de poste ~2.5m; gate: [pos0,pos1] fração sem cerca */
  fence(x0, z0, x1, z1, o) {
    o = o || {}; const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.6)), dx = (x1 - x0) / len, dz = (z1 - z0) / len, h = o.h || 1.25, col = o.col === undefined ? 0xc8a070 : o.col, rails = o.rails || 3; this.begin(0, 0, 0, 0);
    const gate = o.gate; let any = 0;
    for (let i = 0; i <= n; i++) { const t = i / n, px = x0 + dx * len * t, pz = z0 + dz * len * t, py = this.H(px, pz); this.t.y = 0;
      const inG = gate && t > gate[0] - .001 && t < gate[1] + .001; this.S(px - .07 - 0, py - .1, pz - .07, px + .07, py + h, pz + .07, TX.wood, col, { us: 1, kind: 'wood', nc: !!inG && !(Math.abs(t - gate[0]) < .01 || Math.abs(t - gate[1]) < .01), ng: true }); }
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n; if (gate && t0 >= gate[0] - .001 && t1 <= gate[1] + .001) continue;
      const ax = x0 + dx * len * t0, az = z0 + dz * len * t0, bx = x0 + dx * len * t1, bz = z0 + dz * len * t1, ay = this.H(ax, az), by = this.H(bx, bz);
      for (let r = 0; r < rails; r++) { const f = (r + .8) / (rails + .2) * h, mx = (ax + bx) / 2, mz = (az + bz) / 2, my = (ay + by) / 2 + f, L = Math.hypot(bx - ax, bz - az); const m = this.mb(mx, mz);
        m.push().tr(mx, my, mz).ry(Math.atan2(-dz, dx)).rz(Math.atan2(by - ay, L)).mat(TX.wood, 0).col(col).uvs(.6, 1).box(L + .06, .1, .05).pop(); }
      /* colisão: caixa fina contínua (ng = balas passam) */
      this.W.addBox(Math.min(ax, bx) - (dz ? .06 : 0), Math.min(ay, by), Math.min(az, bz) - (dx ? .06 : 0), Math.max(ax, bx) + (dz ? .06 : 0), Math.max(ay, by) + h, Math.max(az, bz) + (dx ? .06 : 0), 'wood', true);
      any++;
    }
    this.mm.push({ t: 'line', x0, z0, x1, z1, c: '#8a6a44' });
  }
  /* ---- árvores e instâncias ---- */
  inst(variant, x, y, z, rot, sc, tint) {
    const k = variant + '|' + Math.floor((x - this.b.x0) / this.CS) + ',' + Math.floor((z - this.b.z0) / this.CS); let a = this.insts.get(k); if (!a) { a = { v: variant, d: [] }; this.insts.set(k, a); }
    const tt = tint || [1, 1, 1]; a.d.push(x, y, z, rot, sc, tt[0], tt[1], tt[2]);
  }
  tree(kind, x, z, s, o) {
    o = o || {}; s = s || 1; const y = this.H(x, z), R = this.R, TP = TREE_TINTS[(R.f() * TREE_TINTS.length) | 0], j = R.range(.93, 1.07), tint = [TP[0] * j, TP[1] * j, TP[2] * j];
    this.inst(kind, x, y - .1, z, R.f() * TAU, s, tint); const r = ({ oak: .42, euca: .28, pine: .36, banana: .12, palm: .25 }[kind] || .3) * s;
    if (r > .15) this.W.addCyl(x, z, r, y - .3, y + 7 * s, 'wood', false); this.mm.push({ t: 'tree', x, z, r: (kind === 'oak' ? 2.6 : kind === 'pine' ? 1.8 : 1.4) * s });
  }
  rock(x, z, s) { const y = this.H(x, z), R = this.R, g = R.range(.7, 1.05); this.inst('rock', x, y - .2 * s, z, R.f() * TAU, s, [g, g, g * 1.02]); this.W.addCyl(x, z, .95 * s, y - .5, y + .85 * s, 'stone', false); }
  bush(x, z, s) { const R = this.R; this.inst('bush', x, this.H(x, z), z, R.f() * TAU, s, [R.range(.8, 1.1), R.range(.85, 1.15), R.range(.8, 1)]); }
  /* ---- lago e terreno ---- */
  lake(cx, cz, rx, rz, bottom) { this.lakes.push({ cx, cz, rx, rz, bottom }); }
  /* ---- finalização: gera meshes de todos os chunks e instâncias ---- */
  finishRender(extra) {
    const chunks = [], trans = [];
    for (const c of this.cells.values()) { if (!c.mb.empty) chunks.push({ mb: c.mb }); if (!c.tr.empty) trans.push({ mb: c.tr }); }
    const inst = [];
    const defs = instDefs();
    for (const a of this.insts.values()) {
      const def = defs[a.v]; if (!def) continue; const d = a.d, n = d.length / 8;
      /* embaralha para o corte por qualidade ser uniforme */
      const idx = Array.from({ length: n }, (_, i) => i); const R = new RNG(77); for (let i = n - 1; i > 0; i--) { const j = (R.f() * (i + 1)) | 0; const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
      const arr = new Float32Array(d.length); let mnx = 1e9, mnz = 1e9, mxx = -1e9, mxz = -1e9, mny = 1e9, mxy = -1e9;
      for (let k = 0; k < n; k++) { const s = idx[k] * 8; for (let q = 0; q < 8; q++) arr[k * 8 + q] = d[s + q]; const x = arr[k * 8], y = arr[k * 8 + 1], z = arr[k * 8 + 2]; if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (z < mnz) mnz = z; if (z > mxz) mxz = z; if (y < mny) mny = y; if (y > mxy) mxy = y; }
      inst.push({ mb: def.mb(), lodMb: def.lod ? def.lod() : null, data: arr, count: n, mn: [mnx - 4, mny - 1, mnz - 4], mx: [mxx + 4, mxy + 14, mxz + 4], maxDist: def.maxDist, cast: def.cast, dist: def.dist });
    }
    return Object.assign({ chunks, trans, inst, bounds: [this.b.x0, this.b.z0, this.b.x1, this.b.z1] }, extra || {});
  }
}
function rcolOf(o) { return o.roof ? o.roof.col : 0x888888; }

/* paleta de copas: verde-limão, verde vivo, verde-escuro, verde-amarelado e alguns tons de outono suaves */
const TREE_TINTS = [[1.05, 1.12, .7], [.9, 1.08, .78], [.78, .95, .78], [1.0, 1.0, .85], [.86, 1.1, .9], [1.16, 1.04, .62], [.72, .9, .72], [1.25, .92, .55]];
/* geometrias-base das instâncias (compartilhadas) */
let _instDefs = null;
function instDefs() {
  if (_instDefs) return _instDefs; const D = {};
  const cross = (m, w, h, n, wb, wt, u0, u1) => { for (let k = 0; k < n; k++) { const a = k / n * PI, c = Math.cos(a) * w / 2, s = Math.sin(a) * w / 2; m.quadW([-c, 0, -s], [c, 0, s], [c, h, s], [-c, h, -s], wb, wt, u0 === undefined ? 0 : u0, 0, u1 === undefined ? 1 : u1, 1, true); } };
  D.oak = { maxDist: 260, cast: true, mb: () => { const m = new MB(2048); m.mat(TX.bark, 0).col(0x9a7a5a).uvs(1.2, .45).cyl(.34, .2, 3.6, 7, 0, 0, 0, 2); m.push().tr(.1, 2.6, 0).rz(-.6).cyl(.12, .07, 1.8, 5, 0, 0, 0, 2).pop(); m.push().tr(-.1, 2.9, 0).rz(.55).cyl(.12, .07, 1.7, 5, 0, 0, 0, 2).pop();
    m.mat(TX.leaf, 0, 150).col(0xe0f0d0).uvs(.3, .3).sph(2.3, 1.75, 2.3, 9, 6, 0, 5.1, 0).sph(1.75, 1.4, 1.75, 8, 5, 1.7, 4.3, .5).sph(1.65, 1.35, 1.65, 8, 5, -1.5, 4.5, -.6).sph(1.4, 1.1, 1.4, 7, 5, .2, 6.5, -.1).sph(1.3, 1, 1.3, 7, 4, -.3, 4.1, 1.6); return m; } };
  D.euca = { maxDist: 260, cast: true, mb: () => { const m = new MB(1024); m.mat(TX.bark, 0).col(0xe0d4bc).uvs(1.2, .3).cyl(.22, .12, 9, 6, 0, 0, 0, 2); m.mat(TX.leaf, 0, 150).col(0xb0e098).uvs(.3, .3).sph(1.5, 2.2, 1.5, 7, 5, 0, 9.4, 0).sph(1.1, 1.6, 1.1, 6, 4, .8, 7.3, .3).sph(1, 1.5, 1, 6, 4, -.7, 8, -.4); return m; } };
  D.pine = { maxDist: 260, cast: true, mb: () => { const m = new MB(1024); m.mat(TX.bark, 0).col(0x806040).uvs(1, .5).cyl(.3, .15, 2.4, 6, 0, 0, 0, 2); m.mat(TX.leaf, 0, 130).col(0x56a864).uvs(.4, .4); [[2.3, 2.6, 1.6], [1.9, 2.4, 3.2], [1.45, 2.2, 4.6], [.95, 2, 5.9]].forEach(([r, h, y]) => m.cyl(r, 0.05, h, 8, 0, y, 0, 1)); return m; } };
  D.banana = { maxDist: 140, cast: false, mb: () => { const m = new MB(512); m.mat(TX.bark, 0).col(0x9aaa6a).uvs(1, .5).cyl(.16, .12, 2.4, 6, 0, 0, 0, 2); m.mat(TX.leaf, 0, 200).col(0xa8e080).uvs(1, 1); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, c = Math.cos(a), s = Math.sin(a), px = -s, pz = c; const L = 2.4, W = .5; const b = [0, 2.3, 0], e = [c * L, 1.5, s * L], mid = [c * L * .5, 2.9, s * L * .5];
      m.quadW([b[0] + px * .08, b[1], b[2] + pz * .08], [mid[0] + px * W, mid[1], mid[2] + pz * W], [mid[0] - px * W, mid[1], mid[2] - pz * W], [b[0] - px * .08, b[1], b[2] - pz * .08], 0, 90, 0, 0, 1, 1, true);
      m.quadW([mid[0] + px * W, mid[1], mid[2] + pz * W], [e[0] + px * .12, e[1], e[2] + pz * .12], [e[0] - px * .12, e[1], e[2] - pz * .12], [mid[0] - px * W, mid[1], mid[2] - pz * W], 90, 200, 0, 0, 1, 1, true); } return m; } };
  D.bush = { maxDist: 110, cast: false, mb: () => { const m = new MB(512); m.mat(TX.bush, 0, 120, 0, 1).col(0xc8e8b8).uvs(.55, .55).sph(.95, .62, .95, 7, 5, 0, .5, 0).sph(.7, .5, .7, 6, 4, .6, .45, .35).sph(.65, .5, .65, 6, 4, -.55, .42, -.3); return m; } };
  D.tuft = { maxDist: 46, cast: false, dist: true, mb: () => { const m = new MB(128); m.mat(TX.tuft, 0, 0, 0, 1).col(0xffffff); cross(m, .75, .62, 3, 0, 255); return m; } };
  D.tuftL = { maxDist: 30, cast: false, dist: true, mb: () => { const m = new MB(128); m.mat(TX.tuft, 0, 0, 0, 1).col(0xf0ffd0); cross(m, 1.05, .85, 3, 0, 255); return m; } };
  D.corn = { maxDist: 90, cast: false, dist: true, mb: () => { const m = new MB(128); m.mat(TX.corn, 0, 0, 0, 1).col(0xffffff); cross(m, 1.25, 2.3, 2, 0, 220); return m; } };
  D.cassava = { maxDist: 70, cast: false, dist: true, mb: () => { const m = new MB(256); m.mat(TX.bush, 0, 0, 0, 1).col(0xa8d890).uvs(.5, .5); cross(m, 1.3, 1.2, 3, 0, 180, 0, 1); m.mat(TX.bark, 0).col(0xaa9070).uvs(1, 1).cyl(.03, .02, 1.0, 4, 0, 0, 0, 0); return m; } };
  D.wheat = { maxDist: 80, cast: false, dist: true, mb: () => { const m = new MB(128); m.mat(TX.tuft, 0, 0, 0, 1).col(0xffd060); cross(m, 1.0, 1.15, 3, 0, 200); return m; } };
  D.horta = { maxDist: 60, cast: false, dist: true, mb: () => { const m = new MB(256); m.mat(TX.bush, 0, 60).col(0x8ad870).uvs(.5, .5).sph(.32, .26, .32, 7, 4, 0, .22, 0).sph(.2, .18, .2, 6, 4, .2, .2, .15); return m; } };
  for (let k = 0; k < 4; k++) D['flower' + k] = { maxDist: 40, cast: false, dist: true, mb: () => { const m = new MB(64); m.mat(TX.flower, 0, 0, 0, 1).col(0xffffff); cross(m, .45, .8, 2, 0, 200, k / 4, (k + 1) / 4); return m; } };
  D.rock = { maxDist: 200, cast: true, mb: () => { const m = new MB(512); m.mat(TX.stone, 0, 0, 0, 0).col(0xc0bcb4).uvs(.8, .8).sph(1.25, .85, 1.1, 7, 5, 0, .35, 0).sph(.7, .5, .65, 6, 4, 1, .25, .5); return m; } };
  D.sunflower = { maxDist: 150, cast: false, dist: true, mb: () => { const m = new MB(512); m.mat(TX.bark, 0).col(0x5f9a34).uvs(1, 1).cyl(.045, .035, 1.75, 5, 0, 0, 0, 2);
    m.mat(TX.leaf, 0, 0, 0, 1).col(0x6fb040).uvs(1, 1); for (const [y, a] of [[.7, 0], [1.1, 2.4]]) { m.push().tr(0, y, 0).ry(a).rz(.6); m.dquad([0, 0, -.12], [0, 0, .12], [.45, .1, .1], [.45, .1, -.1]); m.pop(); }
    m.push().tr(0, 1.78, -.05).rx(-1.15); m.mat(TX.white, 0).col(0xffc81e).uvs(1, 1); for (let i = 0; i < 12; i++) { m.push().ry(i / 12 * TAU).tr(0, 0, -.27).box(.11, .035, .2); m.pop(); }
    m.mat(TX.white, 0).col(0x6a3a14).cyl(.17, .17, .07, 10, 0, -.01, 0, 3); m.mat(TX.white, 0).col(0x3a2008).cyl(.1, .1, .08, 8, 0, -.005, 0, 3); m.pop(); return m; } };
  /* versões de baixo polígono para longe (LOD) */
  D.oak.lod = () => { const m = new MB(256); m.mat(TX.bark, 0).col(0x9a7a5a).uvs(1.2, .45).cyl(.34, .2, 3.6, 4, 0, 0, 0, 0); m.mat(TX.leaf, 0, 150).col(0xe0f0d0).uvs(.3, .3).sph(2.6, 2.1, 2.6, 6, 3, 0, 5.1, 0); return m; };
  D.euca.lod = () => { const m = new MB(256); m.mat(TX.bark, 0).col(0xe0d4bc).uvs(1.2, .3).cyl(.22, .12, 9, 4, 0, 0, 0, 0); m.mat(TX.leaf, 0, 150).col(0xb0e098).uvs(.3, .3).sph(1.7, 2.5, 1.7, 5, 3, 0, 9, 0); return m; };
  D.pine.lod = () => { const m = new MB(256); m.mat(TX.bark, 0).col(0x806040).uvs(1, .5).cyl(.3, .15, 2.4, 4, 0, 0, 0, 0); m.mat(TX.leaf, 0, 130).col(0x56a864).uvs(.4, .4).cyl(2.3, .05, 6.4, 5, 0, 1.6, 0, 1); return m; };
  D.banana.lod = () => { const m = new MB(128); m.mat(TX.bark, 0).col(0x9aaa6a).uvs(1, .5).cyl(.16, .12, 2.4, 4, 0, 0, 0, 0); m.mat(TX.leaf, 0, 200).col(0xa8e080).uvs(.4, .4).sph(1.8, .8, 1.8, 5, 2, 0, 2.4, 0); return m; };
  D.bush.lod = () => { const m = new MB(128); m.mat(TX.bush, 0, 120, 0, 1).col(0xc8e8b8).uvs(.55, .55).sph(1.1, .7, 1.1, 5, 3, 0, .5, 0); return m; };
  D.rock.lod = () => { const m = new MB(128); m.mat(TX.stone, 0, 0, 0, 0).col(0xc0bcb4).uvs(.8, .8).sph(1.3, .9, 1.15, 5, 3, 0, .35, 0); return m; };
  return (_instDefs = D);
}
