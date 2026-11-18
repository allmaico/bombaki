"use strict";
const PI = Math.PI, TAU = PI * 2, DEG = PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sat = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (a, b, x) => {
  const t = sat((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDiff = (a, b) => {
  let d = (b - a) % TAU;
  if (d > PI) d -= TAU;
  else if (d < -PI) d += TAU;
  return d;
};
const lerpAng = (a, b, t) => a + angDiff(a, b) * t;
const dist2 = (ax, az, bx, bz) => {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
};
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const rndi = (a, b) => a + (Math.random() * (b - a + 1) | 0);
const pick = (a) => a[Math.random() * a.length | 0];
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1e3) / 1e3;
function mulberry32(a) {
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
class RNG {
  r;
  constructor(seed) {
    this.r = mulberry32(seed >>> 0);
  }
  f() {
    return this.r();
  }
  range(a, b) {
    return a + (b - a) * this.r();
  }
  int(a, b) {
    return a + Math.floor(this.r() * (b - a + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.r() * arr.length)];
  }
  chance(p) {
    return this.r() < p;
  }
  sign() {
    return this.r() < 0.5 ? -1 : 1;
  }
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function hash21(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash21(xi, yi), b = hash21(xi + 1, yi), c = hash21(xi, yi + 1), d = hash21(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < o; i++) {
    s += a * vnoise(x * f, y * f);
    n += a;
    f *= 2;
    a *= 0.5;
  }
  return s / n;
}
function tnoise(x, y, p) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (n) => (n % p + p) % p;
  const a = hash21(m(xi), m(yi)), b = hash21(m(xi + 1), m(yi)), c = hash21(m(xi), m(yi + 1)), d = hash21(m(xi + 1), m(yi + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function tfbm(x, y, p, o = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < o; i++) {
    s += a * tnoise(x * f, y * f, p * f);
    n += a;
    f *= 2;
    a *= 0.5;
  }
  return s / n;
}
function hex3(h) {
  return [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
}
function mix3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function css(h) {
  return "#" + (h >>> 0).toString(16).padStart(6, "0");
}
class Emitter {
  _h;
  constructor() {
    this._h = {};
  }
  on(e, f) {
    (this._h[e] = this._h[e] || []).push(f);
    return this;
  }
  off(e, f) {
    const a = this._h[e];
    if (a) {
      const i = a.indexOf(f);
      if (i >= 0) a.splice(i, 1);
    }
  }
  emit(e, ...a) {
    const l = this._h[e];
    if (l) for (const f of l.slice()) {
      try {
        f(...a);
      } catch (err) {
        console.error("[evt " + e + "]", err);
      }
    }
  }
}
const nowS = () => (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1e3;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const makeCode = (n = 5) => {
  let s = "";
  for (let i = 0; i < n; i++) s += CODE_CHARS[Math.random() * CODE_CHARS.length | 0];
  return s;
};
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
