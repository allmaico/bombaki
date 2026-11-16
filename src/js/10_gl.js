/* =====================================================================
   10_gl.js — motor WebGL2: matrizes, MeshBuilder (pilha de transformações),
   buffers, VAOs, instancing, texturas em array
   ===================================================================== */
'use strict';
/* camadas da textura-array de props (ver 11_tex.js) */
const TX = {}; ['white','wood','barn','trim','plank2','bark','hay','metal','cont','shingle','tile','plaster','stone','rust','rubber','leaf','corn','tuft','cloth','glass','sign','cow','soil','noise','brick','cass','flower','bush','board','door','grass','dirt','sand','rockT','gravel','mud','face'].forEach((n, i) => { TX[n] = i; TX.count = i + 1; });

/* ---------------- mat4 (coluna-maior) ---------------- */
const M4 = {
  ident(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  mul(o, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (let i = 0; i < 4; i++) {
      const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      o[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30; o[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32; o[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    }
    return o;
  },
  persp(o, fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2); o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
  },
  ortho(o, l, r, b, t, n, f) {
    o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o;
  },
  look(o, ex, ey, ez, tx, ty, tz, ux, uy, uz) {
    let fx = tx - ex, fy = ty - ey, fz = tz - ez; let l = Math.hypot(fx, fy, fz) || 1; fx /= l; fy /= l; fz /= l;
    let sx = fy * uz - fz * uy, sy = fz * ux - fx * uz, sz = fx * uy - fy * ux; l = Math.hypot(sx, sy, sz) || 1; sx /= l; sy /= l; sz /= l;
    const vx = sy * fz - sz * fy, vy = sz * fx - sx * fz, vz = sx * fy - sy * fx;
    o[0] = sx; o[1] = vx; o[2] = -fx; o[3] = 0; o[4] = sy; o[5] = vy; o[6] = -fy; o[7] = 0; o[8] = sz; o[9] = vz; o[10] = -fz; o[11] = 0;
    o[12] = -(sx * ex + sy * ey + sz * ez); o[13] = -(vx * ex + vy * ey + vz * ez); o[14] = fx * ex + fy * ey + fz * ez; o[15] = 1; return o;
  },
  inv(o, m) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7], a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!d) return o; d = 1 / d;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d;
    return o;
  }
};
/* frustum (planos extraídos de VP) */
function frustumPlanes(vp, out) {
  const m = vp; out = out || new Float32Array(24);
  const set = (i, a, b, c, d) => { const l = Math.hypot(a, b, c) || 1; out[i * 4] = a / l; out[i * 4 + 1] = b / l; out[i * 4 + 2] = c / l; out[i * 4 + 3] = d / l; };
  set(0, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]); set(1, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
  set(2, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]); set(3, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
  set(4, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]); set(5, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);
  return out;
}
function aabbVisible(pl, mn, mx) {
  for (let i = 0; i < 6; i++) {
    const a = pl[i * 4], b = pl[i * 4 + 1], c = pl[i * 4 + 2], d = pl[i * 4 + 3];
    if (a * (a > 0 ? mx[0] : mn[0]) + b * (b > 0 ? mx[1] : mn[1]) + c * (c > 0 ? mx[2] : mn[2]) + d < 0) return false;
  }
  return true;
}

/* ---------------- MeshBuilder ---------------- */
const BOXF = [
  [1, 0, 0, [1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], [-1, 0, 0, [-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]],
  [0, 1, 0, [-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], [0, -1, 0, [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]],
  [0, 0, 1, [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [0, 0, -1, [1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]
];
class MB {
  constructor(cap = 2048) {
    this.cap = cap; this.n = 0; this.ni = 0;
    this.buf = new ArrayBuffer(cap * 40); this.f = new Float32Array(this.buf); this.u = new Uint32Array(this.buf); this.ix = new Uint32Array(cap * 3);
    this.M = new Float32Array(16 * 32); this.o = 0; M4.ident(this.M.subarray(0, 16));
    this.cw = 0xffffffff; this.mw = 0; this.us = 1; this.vs = 1; this.mn = [1e9, 1e9, 1e9]; this.mx = [-1e9, -1e9, -1e9];
  }
  reset() { this.n = 0; this.ni = 0; this.o = 0; M4.ident(this.M.subarray(0, 16)); this.cw = 0xffffffff; this.mw = 0; this.us = this.vs = 1; this.mn = [1e9, 1e9, 1e9]; this.mx = [-1e9, -1e9, -1e9]; return this; }
  _grow(nv, ni) {
    if (this.n + nv > this.cap) {
      let c = this.cap; while (this.n + nv > c) c *= 2;
      const nb = new ArrayBuffer(c * 40), nf = new Float32Array(nb); nf.set(this.f.subarray(0, this.n * 10)); this.buf = nb; this.f = nf; this.u = new Uint32Array(nb);
      const nx = new Uint32Array(c * 3); nx.set(this.ix.subarray(0, this.ni)); this.ix = nx; this.cap = c;
    }
    if (this.ni + ni > this.ix.length) { const nx = new Uint32Array(Math.max(this.ix.length * 2, this.ni + ni)); nx.set(this.ix.subarray(0, this.ni)); this.ix = nx; }
  }
  /* estado */
  col(h, a) { const r = (h >> 16) & 255, g = (h >> 8) & 255, b = h & 255; this.cw = (((a === undefined ? 255 : a) << 24) | (b << 16) | (g << 8) | r) >>> 0; return this; }
  colf(r, g, b) { this.cw = ((255 << 24) | ((b * 255 | 0) << 16) | ((g * 255 | 0) << 8) | (r * 255 | 0)) >>> 0; return this; }
  mat(layer, spec = 0, wind = 0, emis = 0, cut = 0) { this.mw = ((layer & 255) | ((spec & 255) << 8) | ((wind & 255) << 16) | (((emis & 127) | (cut ? 128 : 0)) << 24)) >>> 0; return this; }
  uvs(a, b) { this.us = a; this.vs = b === undefined ? a : b; return this; }
  /* pilha */
  push() { const M = this.M, o = this.o; for (let i = 0; i < 16; i++) M[o + 16 + i] = M[o + i]; this.o += 16; return this; }
  pop() { this.o -= 16; return this; }
  id() { M4.ident(this.M.subarray(this.o, this.o + 16)); return this; }
  tr(x, y, z) { const M = this.M, o = this.o; M[o + 12] += M[o] * x + M[o + 4] * y + M[o + 8] * z; M[o + 13] += M[o + 1] * x + M[o + 5] * y + M[o + 9] * z; M[o + 14] += M[o + 2] * x + M[o + 6] * y + M[o + 10] * z; return this; }
  sc(x, y, z) { if (y === undefined) { y = z = x; } const M = this.M, o = this.o; for (let r = 0; r < 4; r++) { M[o + r] *= x; M[o + 4 + r] *= y; M[o + 8 + r] *= z; } return this; }
  ry(a) { const c = Math.cos(a), s = Math.sin(a), M = this.M, o = this.o; for (let r = 0; r < 4; r++) { const m0 = M[o + r], m2 = M[o + 8 + r]; M[o + r] = m0 * c - m2 * s; M[o + 8 + r] = m0 * s + m2 * c; } return this; }
  rx(a) { const c = Math.cos(a), s = Math.sin(a), M = this.M, o = this.o; for (let r = 0; r < 4; r++) { const m1 = M[o + 4 + r], m2 = M[o + 8 + r]; M[o + 4 + r] = m1 * c + m2 * s; M[o + 8 + r] = -m1 * s + m2 * c; } return this; }
  rz(a) { const c = Math.cos(a), s = Math.sin(a), M = this.M, o = this.o; for (let r = 0; r < 4; r++) { const m0 = M[o + r], m1 = M[o + 4 + r]; M[o + r] = m0 * c + m1 * s; M[o + 4 + r] = -m0 * s + m1 * c; } return this; }
  /* aplica uma matriz arbitrária (16 floats) */
  mulm(m) { const t = new Float32Array(16); M4.mul(t, this.M.subarray(this.o, this.o + 16), m); this.M.set(t, this.o); return this; }
  pos(out) { out = out || [0, 0, 0]; const M = this.M, o = this.o; out[0] = M[o + 12]; out[1] = M[o + 13]; out[2] = M[o + 14]; return out; }
  xf(x, y, z, out) { const M = this.M, o = this.o; out[0] = M[o] * x + M[o + 4] * y + M[o + 8] * z + M[o + 12]; out[1] = M[o + 1] * x + M[o + 5] * y + M[o + 9] * z + M[o + 13]; out[2] = M[o + 2] * x + M[o + 6] * y + M[o + 10] * z + M[o + 14]; return out; }
  /* vértice */
  _v(px, py, pz, nx, ny, nz, u, v) {
    const M = this.M, o = this.o, i = this.n++ * 10, f = this.f;
    const x = M[o] * px + M[o + 4] * py + M[o + 8] * pz + M[o + 12], y = M[o + 1] * px + M[o + 5] * py + M[o + 9] * pz + M[o + 13], z = M[o + 2] * px + M[o + 6] * py + M[o + 10] * pz + M[o + 14];
    let X = M[o] * nx + M[o + 4] * ny + M[o + 8] * nz, Y = M[o + 1] * nx + M[o + 5] * ny + M[o + 9] * nz, Z = M[o + 2] * nx + M[o + 6] * ny + M[o + 10] * nz;
    const l = Math.hypot(X, Y, Z) || 1; f[i] = x; f[i + 1] = y; f[i + 2] = z; f[i + 3] = X / l; f[i + 4] = Y / l; f[i + 5] = Z / l; f[i + 6] = u; f[i + 7] = v; this.u[i + 8] = this.cw; this.u[i + 9] = this.mw;
    const mn = this.mn, mx = this.mx; if (x < mn[0]) mn[0] = x; if (y < mn[1]) mn[1] = y; if (z < mn[2]) mn[2] = z; if (x > mx[0]) mx[0] = x; if (y > mx[1]) mx[1] = y; if (z > mx[2]) mx[2] = z;
  }
  _q(a, b, c, d) { const i = this.ni, x = this.ix; x[i] = a; x[i + 1] = b; x[i + 2] = c; x[i + 3] = a; x[i + 4] = c; x[i + 5] = d; this.ni += 6; }
  _t(a, b, c) { const i = this.ni, x = this.ix; x[i] = a; x[i + 1] = b; x[i + 2] = c; this.ni += 3; }
  /* caixa centrada em (ox,oy,oz) */
  box(w, h, d, ox = 0, oy = 0, oz = 0) {
    this._grow(24, 36); const hw = w / 2, hh = h / 2, hd = d / 2, us = this.us, vs = this.vs;
    for (let fI = 0; fI < 6; fI++) {
      const F = BOXF[fI], b = this.n;
      for (let k = 0; k < 4; k++) {
        const c = F[3 + k], px = ox + c[0] * hw, py = oy + c[1] * hh, pz = oz + c[2] * hd; let u, v;
        if (fI === 0) { u = -pz; v = py; } else if (fI === 1) { u = pz; v = py; } else if (fI === 2) { u = px; v = -pz; } else if (fI === 3) { u = px; v = pz; } else if (fI === 4) { u = px; v = py; } else { u = -px; v = py; }
        this._v(px, py, pz, F[0], F[1], F[2], u * us, v * vs);
      }
      this._q(b, b + 1, b + 2, b + 3);
    }
    return this;
  }
  /* caixa por cantos (x0,y0,z0)-(x1,y1,z1) */
  boxA(x0, y0, z0, x1, y1, z1) { return this.box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); }
  /* cilindro/cone vertical: base em (ox,oy,oz), altura h, raios r0 (base) e r1 (topo). caps: 1=base 2=topo */
  cyl(r0, r1, h, seg = 12, ox = 0, oy = 0, oz = 0, caps = 3) {
    this._grow((seg + 1) * 2 + (seg + 2) * 2, seg * 12); const us = this.us, vs = this.vs, sl = h > 0 ? (r0 - r1) / h : 0, b = this.n, ar = (r0 + r1) / 2;
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * TAU, c = Math.cos(a), s = Math.sin(a), u = i / seg * TAU * ar * us;
      this._v(ox + c * r0, oy, oz + s * r0, c, sl, s, u, oy * vs); this._v(ox + c * r1, oy + h, oz + s * r1, c, sl, s, u, (oy + h) * vs);
    }
    for (let i = 0; i < seg; i++) { const k = b + i * 2; this._t(k + 2, k, k + 1); this._t(k + 2, k + 1, k + 3); }
    if ((caps & 2) && r1 > 0.001) {
      const c0 = this.n; this._v(ox, oy + h, oz, 0, 1, 0, ox * us, oz * vs);
      for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; this._v(ox + Math.cos(a) * r1, oy + h, oz + Math.sin(a) * r1, 0, 1, 0, (ox + Math.cos(a) * r1) * us, (oz + Math.sin(a) * r1) * vs); }
      for (let i = 0; i < seg; i++) this._t(c0, c0 + 2 + i, c0 + 1 + i);
    }
    if ((caps & 1) && r0 > 0.001) {
      const c0 = this.n; this._v(ox, oy, oz, 0, -1, 0, ox * us, oz * vs);
      for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; this._v(ox + Math.cos(a) * r0, oy, oz + Math.sin(a) * r0, 0, -1, 0, (ox + Math.cos(a) * r0) * us, (oz + Math.sin(a) * r0) * vs); }
      for (let i = 0; i < seg; i++) this._t(c0, c0 + 1 + i, c0 + 2 + i);
    }
    return this;
  }
  /* esfera/elipsoide centrada */
  sph(rx, ry, rz, sl = 10, st = 7, ox = 0, oy = 0, oz = 0) {
    if (ry === undefined) { ry = rz = rx; }
    this._grow((sl + 1) * (st + 1), sl * st * 6); const b = this.n, us = this.us, vs = this.vs;
    for (let j = 0; j <= st; j++) {
      const th = j / st * PI, ct = Math.cos(th), stt = Math.sin(th);
      for (let i = 0; i <= sl; i++) {
        const ph = i / sl * TAU, nx = stt * Math.cos(ph), nz = stt * Math.sin(ph);
        this._v(ox + nx * rx, oy + ct * ry, oz + nz * rz, nx / rx, ct / ry, nz / rz, i / sl * 3 * us, j / st * 2 * vs);
      }
    }
    for (let j = 0; j < st; j++) for (let i = 0; i < sl; i++) {
      const A = b + j * (sl + 1) + i, B = A + 1, D = A + sl + 1, C = D + 1; this._t(C, D, A); this._t(C, A, B);
    }
    return this;
  }
  /* quadrilátero com vértices CCW (visto de fora); normal automática; uv por cantos */
  quad(a, b, c, d, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
    this._grow(4, 6);
    let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; const i = this.n;
    this._v(a[0], a[1], a[2], nx, ny, nz, u0, v0); this._v(b[0], b[1], b[2], nx, ny, nz, u1, v0); this._v(c[0], c[1], c[2], nx, ny, nz, u1, v1); this._v(d[0], d[1], d[2], nx, ny, nz, u0, v1);
    this._q(i, i + 1, i + 2, i + 3); return this;
  }
  /* quad de dupla face (folhagem) */
  dquad(a, b, c, d, u0 = 0, v0 = 0, u1 = 1, v1 = 1) { this.quad(a, b, c, d, u0, v0, u1, v1); return this.quad(d, c, b, a, u0, v1, u1, v0); }
  tri(a, b, c, uv) {
    this._grow(3, 3); let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; const i = this.n; uv = uv || [0, 0, 1, 0, .5, 1];
    this._v(a[0], a[1], a[2], nx, ny, nz, uv[0], uv[1]); this._v(b[0], b[1], b[2], nx, ny, nz, uv[2], uv[3]); this._v(c[0], c[1], c[2], nx, ny, nz, uv[4], uv[5]); this._t(i, i + 1, i + 2); return this;
  }
  /* prisma de telhado: largura w (X), altura h (Y), comprimento d (Z); base em oy, cumeeira em x=ox */
  gableRoof(w, h, d, ox = 0, oy = 0, oz = 0) {
    const hw = w / 2, hd = d / 2, us = this.us, vs = this.vs, sl = Math.hypot(hw, h);
    const L0 = [ox - hw, oy, oz - hd], L1 = [ox - hw, oy, oz + hd], R0 = [ox + hw, oy, oz - hd], R1 = [ox + hw, oy, oz + hd], T0 = [ox, oy + h, oz - hd], T1 = [ox, oy + h, oz + hd];
    this.quad(L1, L0, T0, T1, 0, 0, d * us, sl * vs); this.quad(R0, R1, T1, T0, 0, 0, d * us, sl * vs); this.quad(L0, R0, R1, L1);
    return this;
  }
  gableEnds(w, h, d, ox = 0, oy = 0, oz = 0) {
    const hw = w / 2, hd = d / 2, us = this.us, vs = this.vs;
    const L0 = [ox - hw, oy, oz - hd], L1 = [ox - hw, oy, oz + hd], R0 = [ox + hw, oy, oz - hd], R1 = [ox + hw, oy, oz + hd], T0 = [ox, oy + h, oz - hd], T1 = [ox, oy + h, oz + hd];
    this.tri(L1, R1, T1, [0, 0, w * us, 0, hw * us, h * vs]); this.tri(R0, L0, T0, [0, 0, w * us, 0, hw * us, h * vs]);
    return this;
  }
  gable(w, h, d, ox = 0, oy = 0, oz = 0) { return this.gableRoof(w, h, d, ox, oy, oz).gableEnds(w, h, d, ox, oy, oz); }
  /* quad com peso de vento por vértice (base wb, topo wt): a,b = base; c,d = topo */
  quadW(a, b, c, d, wb, wt, u0 = 0, v0 = 0, u1 = 1, v1 = 1, two = true) {
    const m = this.mw, mk = w => ((m & 0xff00ffff) | ((w & 255) << 16)) >>> 0;
    this._grow(8, 12);
    let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const P = [a, b, c, d], W = [wb, wb, wt, wt], UV = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
    for (let k = 0; k < 4; k++) { this.mw = mk(W[k]); this._v(P[k][0], P[k][1], P[k][2], nx, ny, nz, UV[k][0], UV[k][1]); }
    const i = this.n - 4; this._q(i, i + 1, i + 2, i + 3);
    if (two) { for (let k = 0; k < 4; k++) { this.mw = mk(W[k]); this._v(P[k][0], P[k][1], P[k][2], -nx, -ny, -nz, UV[k][0], UV[k][1]); } const j = this.n - 4; this._q(j + 3, j + 2, j + 1, j); }
    this.mw = m; return this;
  }
  /* GPU */
  build(gl) { return uploadMesh(gl, this, false); }
  get empty() { return this.ni === 0; }
}

/* ---------------- GL: buffers, VAOs ---------------- */
let gl = null;
function setupAttribs(gl) {
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 40, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 40, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 40, 24);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, 40, 32);
  gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.UNSIGNED_BYTE, false, 40, 36);
}
function uploadMesh(gl, mb, dynamic) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  const ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  if (dynamic) { gl.bufferData(gl.ARRAY_BUFFER, mb.cap * 40, gl.DYNAMIC_DRAW); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mb.ix.length * 4, gl.DYNAMIC_DRAW); }
  else { gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(mb.buf, 0, mb.n * 40), gl.STATIC_DRAW); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mb.ix.subarray(0, mb.ni), gl.STATIC_DRAW); }
  setupAttribs(gl);
  return { vao, vbo, ibo, n: mb.ni, cap: mb.cap, icap: mb.ix.length, mn: mb.mn.slice(), mx: mb.mx.slice(), dynamic };
}
/* atualiza malha dinâmica a partir do MB (cresce se necessário) */
function updateDyn(gl, mesh, mb) {
  gl.bindVertexArray(mesh.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
  if (mb.cap > mesh.cap) { gl.bufferData(gl.ARRAY_BUFFER, mb.cap * 40, gl.DYNAMIC_DRAW); mesh.cap = mb.cap; }
  if (mb.n) gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(mb.buf, 0, mb.n * 40));
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
  if (mb.ix.length > mesh.icap) { gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mb.ix.length * 4, gl.DYNAMIC_DRAW); mesh.icap = mb.ix.length; }
  if (mb.ni) gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, mb.ix.subarray(0, mb.ni));
  mesh.n = mb.ni; mesh.mn = mb.mn.slice(); mesh.mx = mb.mx.slice();
}
/* instanciamento: geometria-base + buffer por instância (8 floats: x,y,z,rotY, escala,r,g,b) */
function makeInstanced(gl, mb, data, count) {
  const m = uploadMesh(gl, mb, false); gl.bindVertexArray(m.vao);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(5, 1);
  gl.enableVertexAttribArray(6); gl.vertexAttribPointer(6, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(6, 1);
  m.ibuf = ib; m.count = count; return m;
}
/* LOD: outra geometria usando o MESMO buffer de instâncias */
function makeInstancedLod(gl, mb, ib) {
  const m = uploadMesh(gl, mb, false); gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, ib);
  gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(5, 1);
  gl.enableVertexAttribArray(6); gl.vertexAttribPointer(6, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(6, 1);
  return m;
}
function freeMesh(gl, m) { if (!m) return; gl.deleteVertexArray(m.vao); gl.deleteBuffer(m.vbo); gl.deleteBuffer(m.ibo); if (m.ibuf) gl.deleteBuffer(m.ibuf); }

/* programas */
function compileProg(gl, name, vs, fs, defs) {
  const pre = '#version 300 es\n' + (defs || '');
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, pre + src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('[shader ' + name + ']', gl.getShaderInfoLog(s), '\n' + (pre + src).split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n')); throw new Error('shader ' + name); } return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 1, 'aNor'); gl.bindAttribLocation(p, 2, 'aUv'); gl.bindAttribLocation(p, 3, 'aCol'); gl.bindAttribLocation(p, 4, 'aMat');
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('[link ' + name + ']', gl.getProgramInfoLog(p)); throw new Error('link ' + name); }
  const prog = { p, name, u: {}, gl };
  prog.loc = n => (n in prog.u ? prog.u[n] : (prog.u[n] = gl.getUniformLocation(p, n)));
  prog.set = function (o) {
    for (const k in o) {
      const l = this.loc(k); if (l === null) continue; const v = o[k];
      if (typeof v === 'number') gl.uniform1f(l, v);
      else if (v.length === 16) gl.uniformMatrix4fv(l, false, v);
      else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v);
      else gl.uniform4fv(l, v);
    }
  };
  return prog;
}
