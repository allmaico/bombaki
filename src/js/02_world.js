/* =====================================================================
   02_world.js — mundo de colisão: caixas, cilindros, terreno, raycast
   (código puro, sem DOM/WebGL: roda no navegador e no Node)
   ===================================================================== */
'use strict';
class World {
  constructor(b) {
    this.x0 = b.x0; this.x1 = b.x1; this.z0 = b.z0; this.z1 = b.z1;
    this.boxes = []; this.cyls = []; this.zones = [];
    this.cs = 8; this.stamp = 1;
    this.waterY = -0.2; this.hf = null; this.hfRes = 1; this.hw = 0; this.hh = 0; this.tfn = null; this.tmax = 0; this.tmin = 0;
    this.qb = []; this.qc = []; this.grid = null; this.gw = 0; this.gh = 0; this.dyn = [];
    this.name = '';
  }
  addBox(x0, y0, z0, x1, y1, z1, kind, ng) {
    if (x1 < x0) { const t = x0; x0 = x1; x1 = t; }
    if (y1 < y0) { const t = y0; y0 = y1; y1 = t; }
    if (z1 < z0) { const t = z0; z0 = z1; z1 = t; }
    const b = { x0, y0, z0, x1, y1, z1, kind: kind || 'wood', ng: !!ng, s: 0, id: this.boxes.length, cyl: false };
    this.boxes.push(b); return b;
  }
  /* caixas dinâmicas (cerca do Guardião): entram em colisão, tiro e linha de visão sem refazer a grade */
  addDyn(b, kind) { const o = { x0: Math.min(b[0], b[3]), y0: Math.min(b[1], b[4]), z0: Math.min(b[2], b[5]), x1: Math.max(b[0], b[3]), y1: Math.max(b[1], b[4]), z1: Math.max(b[2], b[5]), kind: kind || 'wood', ng: false, s: 0, cyl: false, dyn: true }; this.dyn.push(o); return o; }
  removeDyn(o) { const i = this.dyn.indexOf(o); if (i >= 0) this.dyn.splice(i, 1); }
  addCyl(x, z, r, y0, y1, kind, ng) {
    const c = { x, z, r, y0, y1, kind: kind || 'wood', ng: !!ng, s: 0, id: this.cyls.length, cyl: true };
    this.cyls.push(c); return c;
  }
  addZone(z) { this.zones.push(z); return z; }

  /* terreno: função analítica amostrada num heightfield (física = render) */
  setTerrain(fn, res) {
    this.tfn = fn; this.hfRes = res || 1;
    this.hw = Math.ceil((this.x1 - this.x0) / this.hfRes) + 2; this.hh = Math.ceil((this.z1 - this.z0) / this.hfRes) + 2;
    this.hf = new Float32Array(this.hw * this.hh);
    let mx = -1e9, mn = 1e9;
    for (let j = 0; j < this.hh; j++) for (let i = 0; i < this.hw; i++) {
      const h = fn(this.x0 + i * this.hfRes, this.z0 + j * this.hfRes);
      this.hf[j * this.hw + i] = h; if (h > mx) mx = h; if (h < mn) mn = h;
    }
    this.tmax = mx; this.tmin = mn;
  }
  heightAt(x, z) {
    if (!this.hf) return 0;
    let u = (x - this.x0) / this.hfRes, v = (z - this.z0) / this.hfRes;
    if (u < 0) u = 0; else if (u > this.hw - 1.001) u = this.hw - 1.001;
    if (v < 0) v = 0; else if (v > this.hh - 1.001) v = this.hh - 1.001;
    const i = u | 0, j = v | 0, fu = u - i, fv = v - j, w = this.hw, o = j * w + i, h = this.hf;
    const a = h[o], b = h[o + 1], c = h[o + w], d = h[o + w + 1];
    /* triângulos (a,b,c) e (b,d,c): idêntico à malha desenhada */
    return fu + fv <= 1 ? a + (b - a) * fu + (c - a) * fv : d + (c - d) * (1 - fu) + (b - d) * (1 - fv);
  }
  normalAt(x, z, out) {
    const e = 0.6, hx = this.heightAt(x + e, z) - this.heightAt(x - e, z), hz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    const l = Math.hypot(hx, 2 * e, hz); out = out || {}; out.x = -hx / l; out.y = 2 * e / l; out.z = -hz / l; return out;
  }
  waterDepth(x, z) { const d = this.waterY - this.heightAt(x, z); return d > 0 ? d : 0; }
  surfaceAt(x, z) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const q = this.zones[i];
      if (q.fn) { if (q.fn(x, z)) return q.k; }
      else if (q.r !== undefined) { const dx = x - q.x, dz = z - q.z; if (dx * dx + dz * dz < q.r * q.r) return q.k; }
      else if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) return q.k;
    }
    return this.waterDepth(x, z) > 0.05 ? 'water' : 'grass';
  }
  inZone(x, z, k) {
    for (const q of this.zones) {
      if (q.k !== k) continue;
      if (q.fn) { if (q.fn(x, z)) return true; }
      else if (q.r !== undefined) { const dx = x - q.x, dz = z - q.z; if (dx * dx + dz * dz < q.r * q.r) return true; }
      else if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) return true;
    }
    return false;
  }

  /* grade espacial */
  finalize() {
    const cs = this.cs; this.gw = Math.ceil((this.x1 - this.x0) / cs) + 1; this.gh = Math.ceil((this.z1 - this.z0) / cs) + 1;
    this.grid = new Array(this.gw * this.gh);
    for (let i = 0; i < this.grid.length; i++) this.grid[i] = null;
    const add = (o, x0, z0, x1, z1) => {
      const i0 = clamp(Math.floor((x0 - this.x0) / cs), 0, this.gw - 1), i1 = clamp(Math.floor((x1 - this.x0) / cs), 0, this.gw - 1);
      const j0 = clamp(Math.floor((z0 - this.z0) / cs), 0, this.gh - 1), j1 = clamp(Math.floor((z1 - this.z0) / cs), 0, this.gh - 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * this.gw + i; (this.grid[k] || (this.grid[k] = [])).push(o); }
    };
    for (const b of this.boxes) add(b, b.x0, b.z0, b.x1, b.z1);
    for (const c of this.cyls) add(c, c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r);
    return this;
  }
  /* coleta objetos perto de (x,z) num raio r: preenche this.qb / this.qc */
  query(x, z, r) {
    const cs = this.cs, qb = this.qb, qc = this.qc; qb.length = 0; qc.length = 0;
    const i0 = clamp(Math.floor((x - r - this.x0) / cs), 0, this.gw - 1), i1 = clamp(Math.floor((x + r - this.x0) / cs), 0, this.gw - 1);
    const j0 = clamp(Math.floor((z - r - this.z0) / cs), 0, this.gh - 1), j1 = clamp(Math.floor((z + r - this.z0) / cs), 0, this.gh - 1);
    const st = ++this.stamp;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const l = this.grid[j * this.gw + i]; if (!l) continue;
      for (let k = 0; k < l.length; k++) { const o = l[k]; if (o.s === st) continue; o.s = st; (o.cyl ? qc : qb).push(o); }
    }
    for (const o of this.dyn) if (x + r >= o.x0 && x - r <= o.x1 && z + r >= o.z0 && z - r <= o.z1) qb.push(o);
  }

  /* raycast: retorna {t,x,y,z,nx,ny,nz,kind,obj} ou null. solidOnly: objetos 'ng' (cercas) deixam passar */
  raycast(ox, oy, oz, dx, dy, dz, maxT, solidOnly) {
    let best = null, bt = maxT;
    const cs = this.cs, gw = this.gw, gh = this.gh, grid = this.grid;
    let ix = Math.floor((ox - this.x0) / cs), iz = Math.floor((oz - this.z0) / cs);
    const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = dx !== 0 ? cs / Math.abs(dx) : Infinity, tdz = dz !== 0 ? cs / Math.abs(dz) : Infinity;
    let tmx = dx !== 0 ? ((dx > 0 ? (ix + 1) * cs + this.x0 - ox : ox - (ix * cs + this.x0)) / Math.abs(dx)) : Infinity;
    let tmz = dz !== 0 ? ((dz > 0 ? (iz + 1) * cs + this.z0 - oz : oz - (iz * cs + this.z0)) / Math.abs(dz)) : Infinity;
    const idx = dx !== 0 ? 1 / dx : Infinity, idy = dy !== 0 ? 1 / dy : Infinity, idz = dz !== 0 ? 1 / dz : Infinity;
    const st = ++this.stamp; let guard = 0;
    while (guard++ < 1200) {
      if (ix >= 0 && ix < gw && iz >= 0 && iz < gh) {
        const l = grid[iz * gw + ix];
        if (l) for (let k = 0; k < l.length; k++) {
          const o = l[k]; if (o.s === st) continue; o.s = st;
          if (solidOnly && o.ng) continue;
          if (!o.cyl) {
            let tn = -1e9, tf = 1e9, ax = 0, sg = 0;
            let t1 = (o.x0 - ox) * idx, t2 = (o.x1 - ox) * idx;
            if (dx === 0) { if (ox < o.x0 || ox > o.x1) continue; } else { const a = t1 < t2 ? t1 : t2, b = t1 < t2 ? t2 : t1; if (a > tn) { tn = a; ax = 0; sg = t1 < t2 ? -1 : 1; } if (b < tf) tf = b; }
            t1 = (o.y0 - oy) * idy; t2 = (o.y1 - oy) * idy;
            if (dy === 0) { if (oy < o.y0 || oy > o.y1) continue; } else { const a = t1 < t2 ? t1 : t2, b = t1 < t2 ? t2 : t1; if (a > tn) { tn = a; ax = 1; sg = t1 < t2 ? -1 : 1; } if (b < tf) tf = b; }
            t1 = (o.z0 - oz) * idz; t2 = (o.z1 - oz) * idz;
            if (dz === 0) { if (oz < o.z0 || oz > o.z1) continue; } else { const a = t1 < t2 ? t1 : t2, b = t1 < t2 ? t2 : t1; if (a > tn) { tn = a; ax = 2; sg = t1 < t2 ? -1 : 1; } if (b < tf) tf = b; }
            if (tn > tf || tf < 0 || tn < 0 || tn >= bt) continue;
            bt = tn; best = { t: tn, nx: ax === 0 ? sg : 0, ny: ax === 1 ? sg : 0, nz: ax === 2 ? sg : 0, kind: o.kind, obj: o };
          } else {
            const fx = ox - o.x, fz = oz - o.z, a = dx * dx + dz * dz; if (a < 1e-9) continue;
            const b = fx * dx + fz * dz, c = fx * fx + fz * fz - o.r * o.r, disc = b * b - a * c; if (disc < 0) continue;
            const sq = Math.sqrt(disc), t = (-b - sq) / a; if (t < 0 || t >= bt) continue;
            const y = oy + dy * t; if (y < o.y0 || y > o.y1) continue;
            const px = fx + dx * t, pz = fz + dz * t, l2 = Math.hypot(px, pz) || 1;
            bt = t; best = { t, nx: px / l2, ny: 0, nz: pz / l2, kind: o.kind, obj: o };
          }
        }
      } else if ((ix < 0 && sx < 0) || (ix >= gw && sx > 0) || (iz < 0 && sz < 0) || (iz >= gh && sz > 0)) break;
      if (tmx < tmz) { if (tmx > bt) break; ix += sx; tmx += tdx; } else { if (tmz > bt) break; iz += sz; tmz += tdz; }
      if (tmx === Infinity && tmz === Infinity) break;
    }
    /* caixas dinâmicas */
    for (const o of this.dyn) {
      let tn = -1e9, tf = 1e9, ax = 0, sg = 0, miss = false;
      for (let a = 0; a < 3 && !miss; a++) {
        const oo = a === 0 ? ox : a === 1 ? oy : oz, dd = a === 0 ? dx : a === 1 ? dy : dz, lo = a === 0 ? o.x0 : a === 1 ? o.y0 : o.z0, hi = a === 0 ? o.x1 : a === 1 ? o.y1 : o.z1;
        if (dd === 0) { if (oo < lo || oo > hi) miss = true; continue; }
        const t1 = (lo - oo) / dd, t2 = (hi - oo) / dd, aa = Math.min(t1, t2), bb = Math.max(t1, t2); if (aa > tn) { tn = aa; ax = a; sg = t1 < t2 ? -1 : 1; } if (bb < tf) tf = bb;
      }
      if (miss || tn > tf || tf < 0 || tn < 0 || tn >= bt) continue;
      bt = tn; best = { t: tn, nx: ax === 0 ? sg : 0, ny: ax === 1 ? sg : 0, nz: ax === 2 ? sg : 0, kind: o.kind, obj: o };
    }
    /* terreno */
    if (this.hf && !(dy >= 0 && oy > this.tmax)) {
      const th = this.terrainRay(ox, oy, oz, dx, dy, dz, bt);
      if (th >= 0 && th < bt) { bt = th; const n = this.normalAt(ox + dx * th, oz + dz * th, {}); best = { t: th, nx: n.x, ny: n.y, nz: n.z, kind: this.surfaceAt(ox + dx * th, oz + dz * th) === 'water' ? 'water' : 'dirt', obj: null, terrain: true }; }
    }
    if (best) { best.x = ox + dx * best.t; best.y = oy + dy * best.t; best.z = oz + dz * best.t; }
    return best;
  }
  terrainRay(ox, oy, oz, dx, dy, dz, maxT) {
    const step = 0.75; let t = 0, px = ox, py = oy, pz = oz;
    let prev = py - this.heightAt(px, pz);
    if (prev < 0) return -1;
    while (t < maxT) {
      const nt = Math.min(t + step, maxT); px = ox + dx * nt; py = oy + dy * nt; pz = oz + dz * nt;
      if (px < this.x0 - 2 || px > this.x1 + 2 || pz < this.z0 - 2 || pz > this.z1 + 2) return -1;
      const cur = py - this.heightAt(px, pz);
      if (cur < 0) { let a = t, b = nt; for (let k = 0; k < 7; k++) { const m = (a + b) / 2; if (oy + dy * m - this.heightAt(ox + dx * m, oz + dz * m) < 0) b = m; else a = m; } return b; }
      t = nt; if (dy >= 0 && py > this.tmax) return -1;
    }
    return -1;
  }
  /* linha de visão (ignora cercas) */
  los(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz); if (d < 0.01) return true;
    return !this.raycast(ax, ay, az, dx / d, dy / d, dz / d, d - 0.05, true);
  }
  /* colisão esfera x mundo (granadas). out recebe ponto corrigido e normal; retorna true se colidiu */
  sphereCollide(p, r, out) {
    let hit = false;
    this.query(p.x, p.z, r + 0.5);
    for (const b of this.qb) {
      if (p.y + r < b.y0 || p.y - r > b.y1) continue;
      const cx = clamp(p.x, b.x0, b.x1), cy = clamp(p.y, b.y0, b.y1), cz = clamp(p.z, b.z0, b.z1);
      let dx = p.x - cx, dy = p.y - cy, dz = p.z - cz; const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= r * r) continue;
      let nx, ny, nz, pen;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; nz = dz / d; pen = r - d; }
      else { const m = [p.x - b.x0, b.x1 - p.x, p.y - b.y0, b.y1 - p.y, p.z - b.z0, b.z1 - p.z]; let k = 0; for (let i = 1; i < 6; i++) if (m[i] < m[k]) k = i; nx = ny = nz = 0; if (k === 0) nx = -1; else if (k === 1) nx = 1; else if (k === 2) ny = -1; else if (k === 3) ny = 1; else if (k === 4) nz = -1; else nz = 1; pen = m[k] + r; }
      p.x += nx * pen; p.y += ny * pen; p.z += nz * pen; out.nx = nx; out.ny = ny; out.nz = nz; out.kind = b.kind; hit = true;
    }
    for (const c of this.qc) {
      if (p.y + r < c.y0 || p.y - r > c.y1) continue;
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), rr = c.r + r;
      if (d >= rr) continue;
      const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0, pen = rr - d;
      p.x += nx * pen; p.z += nz * pen; out.nx = nx; out.ny = 0; out.nz = nz; out.kind = c.kind; hit = true;
    }
    const gh = this.heightAt(p.x, p.z);
    if (p.y - r < gh) { const n = this.normalAt(p.x, p.z, {}); p.y = gh + r; out.nx = n.x; out.ny = n.y; out.nz = n.z; out.kind = 'dirt'; hit = true; }
    return hit;
  }
  /* uso para checar se um ponto está dentro de alguma caixa sólida */
  solidAt(x, y, z) {
    this.query(x, z, 0.1);
    for (const b of this.qb) if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && z >= b.z0 && z <= b.z1) return b;
    for (const c of this.qc) if (y >= c.y0 && y <= c.y1 && Math.hypot(x - c.x, z - c.z) <= c.r) return c;
    return null;
  }
}
