/* =====================================================================
   11_tex.js — texturas procedurais (pixel + canvas) → Texture2DArray sRGB
   ===================================================================== */
'use strict';
const TEXN = 256;
let NB = null;
function nbInit() { if (NB) return; NB = new Float32Array(TEXN * TEXN); for (let j = 0; j < TEXN; j++) for (let i = 0; i < TEXN; i++) NB[j * TEXN + i] = tfbm(i / TEXN * 8, j / TEXN * 8, 8, 5); }
/* ruído periódico (sx,sy inteiros ⇒ ladrilhável) */
function nz(u, v, sx = 1, sy = sx) {
  const x = u * sx * TEXN, y = v * sy * TEXN, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) << 8, y1 = ((yi + 1) & 255) << 8;
  const a = NB[y0 + x0], b = NB[y0 + x1], c = NB[y1 + x0], d = NB[y1 + x1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const gr = (i, j) => hash21(i, j);
const MIXC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const MUL = (c, k) => [c[0] * k, c[1] * k, c[2] * k, 255];
/* celular periódico (n células) — devolve [d1, d2, id] */
function cell(u, v, n) {
  const x = u * n, y = v * n, xi = Math.floor(x), yi = Math.floor(y); let d1 = 9, d2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, wx = ((cx % n) + n) % n, wy = ((cy % n) + n) % n;
    const px = cx + .15 + .7 * hash21(wx * 3 + 1, wy * 7 + 5), py = cy + .15 + .7 * hash21(wx * 5 + 9, wy * 11 + 2);
    const d = Math.hypot(x - px, y - py); if (d < d1) { d2 = d1; d1 = d; id = hash21(wx + 31, wy + 77); } else if (d < d2) d2 = d;
  }
  return [d1, d2, id];
}
/* tábuas verticais */
function boards(u, v, N, cA, cB, gap, nails) {
  const pu = u * N, pi = Math.floor(pu), fu = pu - pi, h = hash21(pi * 7 + 3, 11), h2 = hash21(pi * 13 + 5, 17);
  const g = nz(fu * .22 + h * .7, v + h2, 1, 5), g2 = nz(fu * .8 + h, v, 2, 11);
  let c = MIXC(cA, cB, clamp(g * 1.2 + g2 * .3 - .15, 0, 1));
  const br = .82 + .3 * h; c = [c[0] * br, c[1] * br, c[2] * br];
  const e = smooth(0, .05, fu) * smooth(0, .05, 1 - fu); c = MIXC(gap, c, e);
  if (nails) { const dv = [0.05, 0.55]; for (const y of dv) { const d = Math.hypot((fu - .5) * N / 3, (v - y - h * .02) * 1); if (d < .02) c = MIXC([30, 24, 20], c, smooth(.006, .02, d)); } }
  return c;
}
const TEXGEN = {
  white(u, v, i, j) { const g = .955 + .045 * gr(i, j); return [255 * g, 255 * g, 255 * g, 255]; },
  wood(u, v, i, j) { const c = boards(u, v, 4, [118, 80, 48], [176, 128, 80], [32, 20, 12], true), w = .78 + .4 * nz(u, v, 2); const k = (.94 + .06 * gr(i, j)) * w; return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  barn(u, v, i, j) {
    const c = boards(u, v, 6, [168, 36, 30], [190, 52, 40], [52, 12, 10], true), n = nz(u, v, 2, 3), ch = smooth(.62, .8, n * .6 + nz(u, v, 4) * .5);
    const wood = boards(u, v, 6, [110, 94, 80], [150, 130, 108], [40, 30, 24], false), k = (.93 + .07 * gr(i, j)) * (.85 + .3 * nz(u, v, 1, 2));
    const o = MIXC(c, wood, ch); return [o[0] * k, o[1] * k, o[2] * k, 255];
  },
  trim(u, v, i, j) { const c = boards(u, v, 2, [226, 220, 206], [244, 240, 228], [160, 150, 136], false), k = .94 + .06 * gr(i, j) - .12 * smooth(.6, .85, nz(u, v, 2, 2)); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  plank2(u, v, i, j) { const pv = v * 5, pi = Math.floor(pv), fv = pv - pi, h = hash21(pi + 4, 9), g = nz(u + h, fv * .12 + h, 3, 1); let c = MIXC([178, 134, 88], [214, 172, 120], g); c = MIXC([60, 42, 28], c, smooth(0, .06, fv) * smooth(0, .06, 1 - fv)); const k = (.85 + .25 * h) * (.95 + .05 * gr(i, j)); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  bark(u, v, i, j) { const n = nz(u * 3 % 1, v, 1, 3), r = nz(u, v, 6, 2), cr = smooth(.38, .5, n) * (.7 + .3 * r); let c = MIXC([42, 28, 18], [112, 80, 52], cr); c = MIXC(c, [136, 106, 74], smooth(.7, .9, nz(u, v, 3, 1)) * .4); const k = .92 + .08 * gr(i, j); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  hay(u, v, i, j) { const s = nz(u, v, 1, 6) * .6 + nz(u + .3, v, 3, 14) * .5, k = .9 + .1 * gr(i >> 1, j); const c = MIXC([170, 128, 52], [236, 204, 108], clamp(s * 1.3 - .1, 0, 1)); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  metal(u, v, i, j) { const s = Math.sin(u * 16 * TAU), c0 = .72 + .28 * s * .9, st = nz(u, v, 3, 1), rust = smooth(.55, .8, nz(u, v, 2, 1) * .7 + (1 - v) * .0) * .55 * smooth(.45, .75, nz(u + .4, v, 1, 3)), k = c0 * (.93 + .07 * gr(i, j)) * (.9 + .15 * st);
    let c = [172 * k, 180 * k, 188 * k]; c = MIXC(c, [120 * k, 70 * k, 40 * k], rust); return [c[0], c[1], c[2], 255]; },
  cont(u, v, i, j) { const s = Math.sin(u * 12 * TAU), c0 = .78 + .22 * s, rim = smooth(0, .035, v) * smooth(0, .035, 1 - v), dn = nz(u, v, 3, 2), rust = smooth(.6, .85, nz(u + .2, v, 2, 2)) * smooth(.45, 1, 1 - v) * .5;
    let k = c0 * (.88 + .12 * dn) * (.7 + .3 * rim) * (.95 + .05 * gr(i, j)); let c = [230 * k, 230 * k, 230 * k]; c = MIXC(c, [150 * k, 85 * k, 50 * k], rust); if (Math.abs(u - .5) < .003 || Math.abs(u) < .004) c = MUL(c, .5); return [c[0], c[1], c[2], 255]; },
  shingle(u, v, i, j) {
    const rv = v * 9, ri = Math.floor(rv), fv = rv - ri, off = (ri & 1) * .5 / 7, pu = (u + off) * 7, pi = Math.floor(pu), fu = pu - pi, h = hash21(pi + ri * 17, ri * 5 + 3);
    let c = MIXC([66, 56, 56], [112, 88, 74], h); const sh = smooth(0, .25, fv) * (.7 + .3 * fv); const edge = smooth(0, .04, fu) * smooth(0, .04, 1 - fu) * smooth(0, .08, fv);
    c = MIXC([22, 18, 18], c, edge); const k = sh * (.92 + .08 * gr(i, j)) * (.85 + .3 * nz(u, v, 2)); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  tile(u, v, i, j) {
    const rv = v * 6, ri = Math.floor(rv), fv = rv - ri, off = (ri & 1) * .5 / 6, pu = (u + off) * 6, pi = Math.floor(pu), fu = pu - pi, h = hash21(pi + ri * 9, ri + 41);
    const rib = .72 + .28 * Math.sin(fu * PI), c0 = MIXC([170, 70, 44], [208, 100, 60], h), over = smooth(0, .2, fv) * (.75 + .25 * fv); const edge = smooth(0, .05, fu) * smooth(0, .05, 1 - fu);
    const k = rib * over * (.9 + .1 * gr(i, j)) * (.85 + .25 * nz(u, v, 2)); let c = MIXC([60, 24, 16], c0, edge); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  plaster(u, v, i, j) { const n = nz(u, v, 2), n2 = nz(u, v, 4), k = .9 + .1 * gr(i, j) + (n - .5) * .16 + (n2 - .5) * .08; const grime = smooth(.4, 1, 1 - v) * .0; return [236 * k, 226 * k, 206 * k, 255]; },
  stone(u, v, i, j) { const [d1, d2, id] = cell(u, v, 6), e = smooth(0, .09, d2 - d1), tone = .62 + .3 * id + .1 * (nz(u, v, 3) - .5); let c = MIXC([96, 92, 84], [150, 144, 132], id); c = MIXC([44, 40, 36], c, e); const k = (tone + .15) * (.9 + .1 * gr(i, j)) * (.82 + .3 * (1 - d1)); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  brick(u, v, i, j) { const rv = v * 12, ri = Math.floor(rv), fv = rv - ri, off = (ri & 1) * .5 / 6, pu = (u + off) * 6, pi = Math.floor(pu), fu = pu - pi, h = hash21(pi + ri * 9, ri * 3 + 7); const m = smooth(0, .09, fv) * smooth(0, .045, fu) * smooth(0, .045, 1 - fu) * smooth(0, .07, 1 - fv);
    let c = MIXC([196, 190, 176], MIXC([150, 62, 44], [186, 88, 58], h), m); const k = (.88 + .12 * gr(i, j)) * (.85 + .3 * nz(u, v, 3)); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  rust(u, v, i, j) { const n = nz(u, v, 2), n2 = nz(u + .3, v, 5); let c = MIXC([86, 50, 34], [176, 98, 48], n); c = MIXC(c, [60, 40, 32], smooth(.55, .8, n2) * .6); const k = .88 + .12 * gr(i, j); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  rubber(u, v, i, j) { const t = .8 + .2 * Math.sin(v * 20 * TAU * 1) * Math.sin(u * 4 * TAU), k = (.85 + .15 * gr(i, j)) * t; return [42 * k, 42 * k, 45 * k, 255]; },
  leaf(u, v, i, j) { const n = nz(u, v, 4, 4), n2 = nz(u + .5, v, 8, 8), t = clamp(n * .7 + n2 * .6 - .2, 0, 1); let c = MIXC([26, 78, 34], [78, 150, 52], t); c = MIXC(c, [140, 190, 70], smooth(.72, .92, t) * .7); const k = .88 + .12 * gr(i, j); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  cloth(u, v, i, j) { const w = .93 + .07 * (Math.sin(u * 48 * PI) * Math.sin(v * 48 * PI)), k = w * (.92 + .08 * gr(i, j)) * (.9 + .15 * nz(u, v, 3)); return [236 * k, 236 * k, 236 * k, 255]; },
  cow(u, v, i, j) { const n = nz(u, v, 1, 1) * .7 + nz(u, v, 2) * .3, sp = smooth(.46, .52, n); const k = .94 + .06 * gr(i, j); const c = MIXC([244, 240, 232], [30, 28, 28], sp); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  soil(u, v, i, j) { const row = Math.sin(v * 12 * TAU) * .5 + .5, n = nz(u, v, 3), k = (.7 + .45 * row) * (.82 + .3 * n) * (.9 + .1 * gr(i, j)); return [98 * k, 62 * k, 38 * k, 255]; },
  noise(u, v, i, j) { const n = nz(u, v, 1); const g = 255 * (.25 + .75 * n); return [g, g, g, 255]; },
  board(u, v, i, j) { const c = boards(u, v, 3, [70, 52, 38], [104, 78, 54], [20, 14, 10], true), k = .85 + .15 * gr(i, j); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  door(u, v, i, j) { let c = boards(u, v, 3, [104, 62, 34], [140, 88, 50], [40, 22, 12], false); const br = (Math.abs(v - .18) < .045 || Math.abs(v - .8) < .045) ? .78 : 1; c = MUL(c, br); const d = Math.hypot(u - .82, v - .5); if (d < .035) c = [218, 188, 80, 255]; const hg = (Math.abs(v - .18) < .015 || Math.abs(v - .8) < .015) && u < .22; if (hg) c = [30, 30, 32, 255]; c[3] = 255; return c; },
  grass(u, v, i, j) {
    const n = nz(u, v, 2), n2 = nz(u + .27, v + .11, 4), n3 = nz(u, v, 1), t = clamp(n * .55 + n2 * .5 + n3 * .3 - .25, 0, 1);
    let c = MIXC([58, 112, 36], [124, 176, 62], t); const bl = hash21(i, j >> 2), bl2 = hash21(i + 77, j >> 1); c = MIXC(c, [150, 196, 78], smooth(.78, .98, bl) * .5); c = MIXC(c, [38, 86, 28], smooth(.8, .98, bl2) * .45);
    const k = .92 + .08 * gr(i, j); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  dirt(u, v, i, j) { const n = nz(u, v, 2), n2 = nz(u + .5, v, 6); let c = MIXC([116, 80, 50], [170, 124, 80], n); c = MIXC(c, [96, 66, 42], smooth(.6, .82, n2) * .55); const peb = smooth(.93, .99, gr(i >> 1, j >> 1)); c = MIXC(c, [190, 170, 140], peb * .6); const k = .9 + .1 * gr(i, j); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  sand(u, v, i, j) { const r = Math.sin((u * 6 + nz(u, v, 2) * 1.5) * TAU) * .5 + .5, n = nz(u, v, 3); const c = MIXC([196, 172, 118], [228, 208, 156], clamp(n * .8 + r * .12, 0, 1)); const k = .93 + .07 * gr(i, j); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  rockT(u, v, i, j) { const [d1, d2] = cell(u, v, 5), e = smooth(0, .06, d2 - d1), n = nz(u, v, 3), n2 = nz(u, v, 6); let c = MIXC([92, 90, 84], [158, 152, 140], n * .8 + n2 * .3); c = MIXC([36, 34, 32], c, .35 + .65 * e); const k = .9 + .1 * gr(i, j); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  gravel(u, v, i, j) { const [d1, , id] = cell(u, v, 22), s = smooth(.0, .22, d1), n = nz(u, v, 2); let c = MIXC([104, 98, 90], [188, 176, 156], id); c = MIXC([44, 40, 36], c, .45 + .55 * (1 - s) ); const k = (.82 + .3 * n) * (.9 + .1 * gr(i, j)); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  mud(u, v, i, j) { const n = nz(u, v, 2), n2 = nz(u + .1, v, 5); let c = MIXC([52, 36, 24], [96, 68, 44], n); c = MIXC(c, [124, 100, 76], smooth(.7, .9, n2) * .4); const k = .9 + .1 * gr(i, j); return [c[0] * k, c[1] * k, c[2] * k, 255]; },
  cass(u, v, i, j) {
    const ring = smooth(.55, .8, Math.abs(Math.sin(v * 22 * PI + nz(u, v, 2) * 3))), fib = nz(u, v, 2, 8); let c = MIXC([108, 74, 44], [158, 112, 70], fib); c = MIXC(c, [74, 50, 30], ring * .5 * nz(u, v, 3)); const k = .88 + .12 * gr(i, j); return [c[0] * k, c[1] * k, c[2] * k, 255]; }
};
/* texturas desenhadas no canvas (recortes e especiais) */
function cvs() { const c = document.createElement('canvas'); c.width = c.height = TEXN; return c; }
function cvData(c) {
  const d = c.getContext('2d').getImageData(0, 0, TEXN, TEXN).data; let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  if (n) { r = r / n | 0; g = g / n | 0; b = b / n | 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] < 8) { d[i] = r; d[i + 1] = g; d[i + 2] = b; } }
  return d;
}
const CANVASGEN = {
  tuft() {
    const c = cvs(), x = c.getContext('2d'), R = new RNG(11);
    for (let k = 0; k < 26; k++) {
      const bx = 128 + R.range(-62, 62), h = R.range(120, 250), bend = R.range(-60, 60) * (h / 250), w = R.range(7, 15), tip = [bx + bend, 256 - h];
      const g = x.createLinearGradient(0, 256, 0, 256 - h); g.addColorStop(0, `rgb(${40 + R.f() * 20},${86 + R.f() * 24},${28})`); g.addColorStop(1, `rgb(${130 + R.f() * 50},${180 + R.f() * 30},${62})`);
      x.fillStyle = g; x.beginPath(); x.moveTo(bx - w / 2, 256); x.quadraticCurveTo(bx + bend * .2 - w * .3, 256 - h * .55, tip[0], tip[1]); x.quadraticCurveTo(bx + bend * .2 + w * .3, 256 - h * .55, bx + w / 2, 256); x.fill();
    }
    return cvData(c);
  },
  corn() {
    const c = cvs(), x = c.getContext('2d'), R = new RNG(5);
    x.fillStyle = '#9ab048'; x.fillRect(122, 20, 12, 236); x.fillStyle = '#b5c75a'; x.fillRect(126, 20, 4, 236);
    for (let k = 0; k < 9; k++) {
      const y = 245 - k * 22, side = k % 2 ? 1 : -1, len = 110 - k * 4 + R.range(-10, 10), up = 24 + k * 4;
      const g = x.createLinearGradient(128, y, 128 + side * len, y - up); g.addColorStop(0, '#5f8f2c'); g.addColorStop(1, '#8cb843');
      x.fillStyle = g; x.beginPath(); x.moveTo(128, y); x.bezierCurveTo(128 + side * len * .4, y - up - 22, 128 + side * len * .9, y - up * .4, 128 + side * len, y + 16 + k); x.bezierCurveTo(128 + side * len * .8, y - up * .1 + 6, 128 + side * len * .4, y - up + 5, 128, y + 6); x.fill();
      x.strokeStyle = '#c6dc7a'; x.lineWidth = 2; x.beginPath(); x.moveTo(128, y); x.bezierCurveTo(128 + side * len * .4, y - up - 18, 128 + side * len * .9, y - up * .4, 128 + side * len, y + 14 + k); x.stroke();
    }
    x.fillStyle = '#d6c05a'; x.beginPath(); x.ellipse(150, 128, 11, 34, .2, 0, TAU); x.fill(); x.fillStyle = '#8aa83c'; x.beginPath(); x.ellipse(146, 138, 10, 34, .15, 0, TAU); x.fill();
    x.fillStyle = '#b79440'; for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(150, 96); x.lineTo(138 + k * 5, 70 - R.f() * 14); x.lineTo(152 + k * 3, 96); x.fill(); }
    x.fillStyle = '#e8c840'; x.fillRect(122, 8, 12, 14); for (let k = 0; k < 14; k++) { x.fillStyle = '#c8b040'; x.fillRect(110 + R.f() * 36, 2 + R.f() * 18, 3, 12); }
    return cvData(c);
  },
  flower() {
    const c = cvs(), x = c.getContext('2d'), cols = ['#e8433a', '#f6d338', '#fafafa', '#a05ad8'];
    for (let k = 0; k < 4; k++) {
      const cx = 32 + k * 64; x.strokeStyle = '#3f7a2a'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, 256); x.quadraticCurveTo(cx - 6, 190, cx, 120); x.stroke();
      x.fillStyle = '#4c8f33'; x.beginPath(); x.ellipse(cx + 12, 206, 14, 6, -.5, 0, TAU); x.fill(); x.beginPath(); x.ellipse(cx - 12, 170, 14, 6, .5, 0, TAU); x.fill();
      x.fillStyle = cols[k]; for (let p = 0; p < 7; p++) { const a = p / 7 * TAU; x.beginPath(); x.ellipse(cx + Math.cos(a) * 15, 106 + Math.sin(a) * 15, 13, 7, a, 0, TAU); x.fill(); }
      x.fillStyle = k === 1 ? '#c8641e' : '#f2c21c'; x.beginPath(); x.arc(cx, 106, 9, 0, TAU); x.fill();
    }
    return cvData(c);
  },
  bush() {
    const c = cvs(), x = c.getContext('2d'), R = new RNG(9);
    for (let k = 0; k < 220; k++) { const px = R.f() * 256, py = R.f() * 256, s = R.range(10, 22), t = R.f(); x.fillStyle = `rgb(${34 + t * 50},${88 + t * 80},${30 + t * 30})`; x.beginPath(); x.ellipse(px, py, s, s * .55, R.f() * PI, 0, TAU); x.fill(); }
    return cvData(c);
  },
  glass() {
    const c = cvs(), x = c.getContext('2d'); x.fillStyle = 'rgba(150,200,226,.42)'; x.fillRect(0, 0, 256, 256);
    const g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.25)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 10; x.beginPath(); x.moveTo(40, 220); x.lineTo(130, 40); x.stroke(); x.lineWidth = 5; x.beginPath(); x.moveTo(70, 240); x.lineTo(140, 100); x.stroke();
    return cvData(c);
  },
  sign() {
    const c = cvs(), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#7b4a27'); g.addColorStop(1, '#5a3418'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 3; for (let k = 1; k < 5; k++) { x.beginPath(); x.moveTo(0, k * 51); x.lineTo(256, k * 51); x.stroke(); }
    x.strokeStyle = '#f0c23a'; x.lineWidth = 7; x.strokeRect(8, 8, 240, 240);
    x.save(); x.scale(.5, 1); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '900 100px "Lilita One",Impact,"Arial Black",sans-serif'; x.lineJoin = 'round'; x.lineWidth = 16; x.strokeStyle = '#2a1608'; x.strokeText('BOMBAKI', 256, 100); const gg = x.createLinearGradient(0, 40, 0, 150); gg.addColorStop(0, '#ffe45a'); gg.addColorStop(1, '#ffa81f'); x.fillStyle = gg; x.fillText('BOMBAKI', 256, 100);
    x.font = '800 40px "Lilita One",Impact,sans-serif'; x.lineWidth = 8; x.strokeStyle = '#2a1608'; x.strokeText('GUERRA NO ROÇADO', 256, 192); x.fillStyle = '#f6efe0'; x.fillText('GUERRA NO ROÇADO', 256, 192); x.restore();
    return cvData(c);
  },
  face() {
    const c = cvs(), x = c.getContext('2d'); x.lineCap = 'round';
    const eye = cx => { x.fillStyle = '#fff'; x.beginPath(); x.roundRect ? x.roundRect(cx - 24, 82, 48, 56, 14) : x.rect(cx - 24, 82, 48, 56); x.fill(); x.fillStyle = '#2b1a10'; x.beginPath(); x.arc(cx + 2, 114, 15, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + 8, 108, 5, 0, TAU); x.fill(); };
    eye(78); eye(178); x.strokeStyle = '#3a2412'; x.lineWidth = 9; x.beginPath(); x.moveTo(50, 70); x.lineTo(104, 66); x.stroke(); x.beginPath(); x.moveTo(152, 66); x.lineTo(206, 70); x.stroke();
    x.strokeStyle = '#7a2a1a'; x.lineWidth = 9; x.beginPath(); x.arc(128, 150, 36, .22 * PI, .78 * PI); x.stroke();
    x.fillStyle = 'rgba(255,120,110,.35)'; x.beginPath(); x.ellipse(52, 150, 20, 11, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(204, 150, 20, 11, 0, 0, TAU); x.fill();
    return cvData(c);
  }
};
/* 'layer' → gerador. Ordem = TX */
const TEX_ORDER = ['white', 'wood', 'barn', 'trim', 'plank2', 'bark', 'hay', 'metal', 'cont', 'shingle', 'tile', 'plaster', 'stone', 'rust', 'rubber', 'leaf', 'corn', 'tuft', 'cloth', 'glass', 'sign', 'cow', 'soil', 'noise', 'brick', 'cass', 'flower', 'bush', 'board', 'door', 'grass', 'dirt', 'sand', 'rockT', 'gravel', 'mud', 'face'];
function genLayer(name) {
  if (CANVASGEN[name]) return CANVASGEN[name]();
  const f = TEXGEN[name], d = new Uint8ClampedArray(TEXN * TEXN * 4);
  for (let j = 0; j < TEXN; j++) for (let i = 0; i < TEXN; i++) {
    const c = f(i / TEXN, j / TEXN, i, j), o = (j * TEXN + i) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = c[3] === undefined ? 255 : c[3];
  }
  return d;
}
/* cria a Texture2DArray de forma assíncrona (cede o thread entre camadas) */
async function buildTexArray(gl, onProgress) {
  nbInit();
  const n = TEX_ORDER.length, levels = Math.floor(Math.log2(TEXN)) + 1, tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels, gl.SRGB8_ALPHA8, TEXN, TEXN, n);
  for (let k = 0; k < n; k++) {
    const d = genLayer(TEX_ORDER[k]); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, k, TEXN, TEXN, 1, gl.RGBA, gl.UNSIGNED_BYTE, d);
    if (onProgress) onProgress((k + 1) / n);
    if (k % 3 === 2) await new Promise(r => setTimeout(r, 0));
  }
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
  const an = gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D_ARRAY, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  return tex;
}
/* nuvens (R8 ladrilhável 512²) */
function buildCloudTex(gl) {
  const S = 256, d = new Uint8Array(S * S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) d[j * S + i] = 255 * tfbm(i / S * 4, j / S * 4, 4, 6);
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, S, S, 0, gl.RED, gl.UNSIGNED_BYTE, d); gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return t;
}
