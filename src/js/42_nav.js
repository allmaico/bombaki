/* =====================================================================
   42_nav.js — malha de navegação (grade de 1 m) + A* para os bots
   ===================================================================== */
'use strict';
class NavGrid {
  constructor(map, cs) {
    this.W = map.W; this.cs = cs || map.navCs || 1.0; const B = map.bounds;
    this.x0 = B.x0 + 1; this.z0 = B.z0 + 1; this.gw = Math.floor((B.x1 - B.x0 - 2) / this.cs); this.gh = Math.floor((B.z1 - B.z0 - 2) / this.cs);
    const N = this.gw * this.gh; this.N = N;
    this.ok = new Uint8Array(N); this.y = new Float32Array(N); this.cost = new Float32Array(N);
    this.g = new Float32Array(N); this.par = new Int32Array(N); this.stamp = new Int32Array(N); this.closed = new Uint8Array(N); this.st = 0;
    this.heap = new Int32Array(N + 8); this.hf = new Float32Array(N + 8); this.hn = 0;
    this.build();
  }
  build() {
    const W = this.W, cs = this.cs, gw = this.gw, gh = this.gh; let cnt = 0;
    const nrm = {};
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const x = this.x0 + (i + .5) * cs, z = this.z0 + (j + .5) * cs, k = j * gw + i;
      const th = W.heightAt(x, z); const y = floorAt(W, x, z, th + PH.STEP + 0.02);
      const wd = W.waterDepth(x, z);
      if (wd > 0.85) continue;
      W.normalAt(x, z, nrm); if (nrm.y < 0.64) continue;
      if (blockedAt(W, x, z, y, 1.7, 0.4)) continue;
      this.ok[k] = 1; this.y[k] = y; cnt++;
      let c = 1; const sf = W.surfaceAt(x, z);
      if (wd > 0.15) c = 2.4; else if (sf === 'mud') c = 1.7; else if (sf === 'corn') c = 1.25;
      this.cost[k] = c;
    }
    /* afasta ligeiramente dos obstáculos (custo maior perto de paredes) */
    const ok = this.ok, cost = this.cost;
    for (let j = 1; j < gh - 1; j++) for (let i = 1; i < gw - 1; i++) {
      const k = j * gw + i; if (!ok[k]) continue;
      if (!ok[k - 1] || !ok[k + 1] || !ok[k - gw] || !ok[k + gw]) cost[k] += 0.6;
    }
    this.count = cnt;
  }
  idx(x, z) { const i = Math.floor((x - this.x0) / this.cs), j = Math.floor((z - this.z0) / this.cs); if (i < 0 || j < 0 || i >= this.gw || j >= this.gh) return -1; return j * this.gw + i; }
  cx(k) { return this.x0 + ((k % this.gw) + .5) * this.cs; }
  cz(k) { return this.z0 + (((k / this.gw) | 0) + .5) * this.cs; }
  walkable(x, z) { const k = this.idx(x, z); return k >= 0 && this.ok[k] === 1; }
  nearest(x, z, maxR) {
    const k0 = this.idx(x, z); if (k0 >= 0 && this.ok[k0]) return k0;
    const ci = Math.floor((x - this.x0) / this.cs), cj = Math.floor((z - this.z0) / this.cs), R = Math.min(maxR || 14, 40);
    for (let r = 1; r <= R; r++) {
      let best = -1, bd = 1e9;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.abs(di) !== r && Math.abs(dj) !== r) continue;
        const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= this.gw || j >= this.gh) continue;
        const k = j * this.gw + i; if (!this.ok[k]) continue; const d = di * di + dj * dj; if (d < bd) { bd = d; best = k; }
      }
      if (best >= 0) return best;
    }
    return -1;
  }
  randomPoint(rng, cx, cz, rmin, rmax) {
    for (let t = 0; t < 40; t++) {
      let x, z;
      if (cx === undefined) { x = this.x0 + rng.f() * this.gw * this.cs; z = this.z0 + rng.f() * this.gh * this.cs; }
      else { const a = rng.f() * TAU, d = rmin + Math.sqrt(rng.f()) * (rmax - rmin); x = cx + Math.cos(a) * d; z = cz + Math.sin(a) * d; }
      if (this.walkable(x, z)) return { x, z };
    }
    return null;
  }
  /* heap binário mínimo */
  _push(k, f) { let i = this.hn++; const h = this.heap, hf = this.hf; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; h[i] = h[p]; hf[i] = hf[p]; i = p; } h[i] = k; hf[i] = f; }
  _pop() {
    const h = this.heap, hf = this.hf, top = h[0]; const n = --this.hn; if (n > 0) {
      const k = h[n], f = hf[n]; let i = 0;
      for (; ;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; h[i] = h[c]; hf[i] = hf[c]; i = c; }
      h[i] = k; hf[i] = f;
    }
    return top;
  }
  /* devolve [{x,z},...] suavizado, ou null */
  findPath(x0, z0, x1, z1, maxExp) {
    const s = this.nearest(x0, z0, 8), e = this.nearest(x1, z1, 14); if (s < 0 || e < 0) return null;
    const gw = this.gw, ok = this.ok, cost = this.cost, y = this.y; const st = ++this.st;
    const ex = e % gw, ez = (e / gw) | 0;
    this.hn = 0; this.g[s] = 0; this.par[s] = -1; this.stamp[s] = st; this.closed[s] = 0;
    this._push(s, 0); let exp = 0, found = false; const lim = maxExp || 45000;
    while (this.hn > 0 && exp++ < lim) {
      const k = this._pop(); if (this.stamp[k] === st && this.closed[k] === 2) continue; this.closed[k] = 2;
      if (k === e) { found = true; break; }
      const ki = k % gw, kj = (k / gw) | 0, gk = this.g[k];
      for (let d = 0; d < 8; d++) {
        const di = NAV_DX[d], dj = NAV_DZ[d], ni = ki + di, nj = kj + dj; if (ni < 0 || nj < 0 || ni >= gw || nj >= this.gh) continue;
        const n = nj * gw + ni; if (!ok[n]) continue;
        if (Math.abs(y[n] - y[k]) > 0.62) continue;
        if (di !== 0 && dj !== 0 && (!ok[kj * gw + ni] || !ok[nj * gw + ki])) continue;
        const ng = gk + (di !== 0 && dj !== 0 ? 1.4142 : 1) * (cost[n] + cost[k]) * 0.5;
        if (this.stamp[n] === st && ng >= this.g[n]) continue;
        this.stamp[n] = st; this.g[n] = ng; this.par[n] = k; this.closed[n] = 1;
        const hx = Math.abs(ni - ex), hz = Math.abs(nj - ez), h = (hx + hz) + (1.4142 - 2) * Math.min(hx, hz);
        this._push(n, ng + h * 1.12);
      }
    }
    if (!found) return null;
    const raw = []; for (let k = e; k >= 0; k = this.par[k]) { raw.push(k); if (raw.length > 4000) break; } raw.reverse();
    /* suavização por linha de visão na grade */
    const out = []; let a = 0; out.push({ x: this.cx(raw[0]), z: this.cz(raw[0]) });
    while (a < raw.length - 1) {
      let b = Math.min(raw.length - 1, a + 40);
      while (b > a + 1 && !this.lineClear(raw[a], raw[b])) b--;
      out.push({ x: this.cx(raw[b]), z: this.cz(raw[b]) }); a = b;
    }
    return out;
  }
  lineClear(ka, kb) {
    const gw = this.gw, ai = ka % gw, aj = (ka / gw) | 0, bi = kb % gw, bj = (kb / gw) | 0;
    const n = Math.max(Math.abs(bi - ai), Math.abs(bj - aj)); if (n <= 1) return true;
    let py = this.y[ka];
    for (let s = 1; s < n; s++) {
      const t = s / n, i = Math.round(ai + (bi - ai) * t), j = Math.round(aj + (bj - aj) * t), k = j * gw + i;
      if (!this.ok[k] || Math.abs(this.y[k] - py) > 0.5 || this.cost[k] > 2) return false;
      /* vizinhos laterais também precisam ser livres (raio do corpo) */
      const di = Math.abs(bi - ai) >= Math.abs(bj - aj) ? 0 : 1, dj = 1 - di;
      const k2 = (j + dj) * gw + (i + di), k3 = (j - dj) * gw + (i - di);
      if (!this.ok[k2] || !this.ok[k3]) return false;
      py = this.y[k];
    }
    return true;
  }
}
const NAV_DX = [1, -1, 0, 0, 1, 1, -1, -1], NAV_DZ = [0, 0, 1, -1, 1, -1, 1, -1];
