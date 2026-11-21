/* =====================================================================
   52_fx.js — efeitos: partículas, rastros de bala (tracers), impactos por
   material, explosões fortes (bola de fogo, fumaça, onda de choque, detritos,
   marca no chão), tremor de câmera e flash de tela.
   ===================================================================== */
'use strict';
function matOf(k) {
  k = String(k || 'dirt');
  if (/water/.test(k)) return 'water'; if (/flesh|player/.test(k)) return 'flesh';
  if (/metal|rust|cont|tin|steel|iron|car|tractor/.test(k)) return 'metal'; if (/stone|brick|rock|plaster|concrete|wall/.test(k)) return 'stone';
  if (/wood|plank|bark|barn|door|fence|crate|trunk|tree|log|house|roof|shingle/.test(k)) return 'wood'; if (/hay|corn|leaf|bush|grass|field/.test(k)) return 'hay';
  return 'dirt';
}
class FX {
  constructor(R) { this.R = R; this.W = null; this.p = []; this.deb = []; this.tr = []; this.spots = []; this.shk = 0; this.flash = 0; this.cam = { x: 0, y: 0, z: 0 }; this.shkT = 0; this.rumble = 0; this.hats = []; }
  q() { return (settings.particles === undefined ? 1 : settings.particles) * QQ().parts; }
  P(o) { if (this.p.length > 2600) this.p.shift(); o.max = o.life; o.rot = o.rot || Math.random() * TAU; o.seed = Math.random() * 10; this.p.push(o); return o; }
  clear() { this.p.length = 0; this.deb.length = 0; this.tr.length = 0; this.spots.length = 0; this.hats.length = 0; this.shk = 0; this.flash = 0; }
  /* ---------- disparo ---------- */
  muzzle(x, y, z, dx, dy, dz, wid, own) {
    const q = this.q(), big = wBase(wid) === 'vassoura' ? 1.5 : wid === 'estilingue' ? 0.4 : 1;
    if (own) { x += dx * .35; y += dy * .35; z += dz * .35; }
    if (wid !== 'estilingue' && !own) this.P({ x, y, z, vx: dx * 1.5, vy: dy * 1.5, vz: dz * 1.5, life: 0.055, s0: 0.22 * big, s1: 0.3 * big, r: 1, g: .8, b: .45, a0: 1, add: true, ty: 1, drag: 0 });
    for (let i = 0; i < 3 * q; i++) this.P({ x, y, z, vx: dx * rnd(6, 14) + rnd(-2, 2), vy: dy * rnd(6, 14) + rnd(-1, 2), vz: dz * rnd(6, 14) + rnd(-2, 2), life: rnd(.06, .16), s0: 0.03, s1: 0.02, r: 1, g: .75, b: .3, a0: 1, add: true, ty: 2, drag: 1, grav: -6 });
    this.P({ x, y, z, vx: dx * 1.2 + rnd(-.2, .2), vy: dy * 1.2 + .5, vz: dz * 1.2 + rnd(-.2, .2), life: rnd(.4, .8), s0: 0.08, s1: 0.4 * big, r: .55, g: .55, b: .55, a0: .22, add: false, ty: 0, drag: 2.4, grav: .4 });
  }
  /* cápsula de latão ejetada (gira, quica e tilinta) */
  shell(x, y, z, rx, rz, big) { const sp = rnd(2, 3.2); this.chunk(x, y, z, rx * sp + rnd(-.4, .4), rnd(2, 3.4), rz * sp + rnd(-.4, .4), big ? .028 : .018, big ? 0xd8322a : 0xd8a838, rnd(1.4, 2.2), 'brass'); }
  /* fumaça saindo do cano depois do tiro */
  barrelSmoke(x, y, z, n) { const q = this.q(); for (let i = 0; i < (n || 3) * q; i++) this.P({ x, y, z, vx: rnd(-.15, .15), vy: rnd(.3, .8), vz: rnd(-.15, .15), life: rnd(.8, 1.5), s0: .04, s1: rnd(.25, .4), r: .8, g: .8, b: .82, a0: .18, add: false, ty: 0, drag: 1.2, grav: .2 }); }
  /* pedra do estilingue voando de verdade (com rastro de poeira) */
  stone(x0, y0, z0, x1, y1, z1) { (this.stones || (this.stones = [])).push({ x0, y0, z0, dx: x1 - x0, dy: y1 - y0, dz: z1 - z0, d: Math.hypot(x1 - x0, y1 - y0, z1 - z0), t: 0 }); if (this.stones.length > 20) this.stones.shift(); }
  /* rastro de bala viajando do cano até o alvo */
  tracer(x0, y0, z0, x1, y1, z1, wid, own) {
    const w = WEAPONS[wid]; if (!w || !w.trace) return; const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, d = Math.hypot(dx, dy, dz); if (d < 2.5) return;
    if (this.tr.length > 60) this.tr.shift();
    this.tr.push({ x0, y0, z0, dx: dx / d, dy: dy / d, dz: dz / d, d, t: own ? 0.5 : 0, spd: wid === 'estilingue' ? 150 : wBase(wid) === 'vassoura' ? 420 : 300, len: Math.min(d * 0.9, wBase(wid) === 'vassoura' ? 26 : 12), col: w.trace, w: w.traceW * (own ? 1 : 1.25) });
    /* zumbido de bala passando perto da câmera */
    if (!own && window.sfx && sfx.ctx) {
      const c = this.cam; const px = c.x - x0, py = c.y - y0, pz = c.z - z0, t = px * dx / d + py * dy / d + pz * dz / d;
      if (t > 3 && t < d) { const ex = px - dx / d * t, ey = py - dy / d * t, ez = pz - dz / d * t; if (Math.hypot(ex, ey, ez) < 2.6) sfx.whiz(); }
    }
  }
  /* ---------- impactos ---------- */
  impact(x, y, z, nx, ny, nz, kind, wid) {
    const q = this.q(), m = matOf(kind), R = this.R, big = wBase(wid) === 'vassoura' ? 1.6 : wid === 'estilingue' ? .7 : 1;
    if (m !== 'flesh' && typeof sfx !== 'undefined' && sfx.ctx) sfx.impact(m, { x, y, z }, big);   /* som do material atingido */
    const ux = nx, uy = ny, uz = nz;
    if (m === 'flesh') { for (let i = 0; i < 6 * q; i++) this.P({ x, y, z, vx: ux * rnd(1, 4) + rnd(-1.5, 1.5), vy: uy * rnd(1, 4) + rnd(0, 2.5), vz: uz * rnd(1, 4) + rnd(-1.5, 1.5), life: rnd(.3, .6), s0: .05, s1: .09, r: .7, g: .1, b: .08, a0: .9, add: false, ty: 5, drag: 1, grav: -12 }); for (let i = 0; i < 3 * q; i++) this.P({ x, y, z, vx: rnd(-1.5, 1.5), vy: rnd(.5, 2.5), vz: rnd(-1.5, 1.5), life: rnd(.5, 1.0), s0: .05, s1: .07, r: .95, g: .95, b: .9, a0: .9, add: false, ty: 5, drag: 3, grav: -2 }); return; }
    if (m === 'water') { this.P({ x, y: y + .02, z, vx: 0, vy: 0, vz: 0, life: .55, s0: .15, s1: 1.2 * big, r: .9, g: .95, b: 1, a0: .7, add: true, ty: 3, drag: 0, rot: 0 }); for (let i = 0; i < 9 * q; i++) this.P({ x, y, z, vx: rnd(-1.4, 1.4), vy: rnd(2.5, 6), vz: rnd(-1.4, 1.4), life: rnd(.4, .8), s0: .05, s1: .04, r: .9, g: .95, b: 1, a0: .8, add: false, ty: 5, drag: .3, grav: -16 }); this.P({ x, y, z, vx: 0, vy: 1.4, vz: 0, life: .5, s0: .2, s1: .7, r: .95, g: .97, b: 1, a0: .4, add: false, ty: 0, drag: 2 }); return; }
    const col = { dirt: [.5, .38, .26], wood: [.7, .55, .36], stone: [.6, .6, .58], hay: [.75, .65, .35], metal: [.5, .5, .5] }[m] || [.5, .4, .3];
    for (let i = 0; i < 4 * q; i++) this.P({ x, y, z, vx: ux * rnd(.5, 2.4) + rnd(-.8, .8), vy: uy * rnd(.5, 2.4) + rnd(0, 1.2), vz: uz * rnd(.5, 2.4) + rnd(-.8, .8), life: rnd(.5, 1.0), s0: .06 * big, s1: .32 * big, r: col[0], g: col[1], b: col[2], a0: .5, add: false, ty: 4, drag: 2.5, grav: .3 });
    if (m === 'metal' || m === 'stone') for (let i = 0; i < 6 * q; i++) this.P({ x, y, z, vx: ux * rnd(2, 8) + rnd(-2.5, 2.5), vy: uy * rnd(2, 8) + rnd(0, 3), vz: uz * rnd(2, 8) + rnd(-2.5, 2.5), life: rnd(.18, .4), s0: .025, s1: .015, r: 1, g: .8, b: .4, a0: 1, add: true, ty: 2, drag: .6, grav: -14 });
    if (m === 'wood' || m === 'dirt' || m === 'stone') for (let i = 0; i < (m === 'wood' ? 4 : 3) * q; i++) this.chunk(x, y, z, ux * rnd(1, 4) + rnd(-1.5, 1.5), uy * rnd(1, 4) + rnd(0, 3), uz * rnd(1, 4) + rnd(-1.5, 1.5), m === 'wood' ? rnd(.03, .07) : rnd(.03, .06), m === 'wood' ? 0xc89a62 : m === 'stone' ? 0x9a9a95 : 0x6a4a2c, 0.6, m === 'wood' ? 'wood' : 'dirt');
    R.addDecal(x + nx * .004, y + ny * .004, z + nz * .004, nx, ny, nz, (m === 'metal' ? .045 : .06) * big, m === 'metal' ? 0x111111 : m === 'wood' ? 0x2a1a0c : 0x1a120a, .75, true);
  }
  chunk(x, y, z, vx, vy, vz, s, col, life, tex) { if (this.deb.length > 420) this.deb.shift(); this.deb.push({ x, y, z, vx, vy, vz, s, col, life, max: life, a: Math.random() * 6, b: Math.random() * 6, va: rnd(-12, 12), vb: rnd(-12, 12), tex: tex || 'dirt', bn: 0 }); }
  /* ---------- explosões ---------- */
  explosion(x, y, z, R, big) {
    const q = this.q(), k = big ? 2.5 : 1, c = this.cam, d = Math.hypot(c.x - x, c.y - y, c.z - z);
    /* núcleo de luz */
    this.P({ x, y: y + .4, z, vx: 0, vy: 0, vz: 0, life: .22, s0: R * .3 * (big ? 1.4 : 1), s1: R * .62 * (big ? 1.6 : 1), r: 1, g: .92, b: .65, a0: 1, add: true, ty: 1, drag: 0 });
    if (big) this.P({ x, y: y + .4, z, vx: 0, vy: 0, vz: 0, life: .6, s0: R * .2, s1: R * .9, r: 1, g: .7, b: .3, a0: .8, add: true, ty: 1, drag: 0 });
    /* bola de fogo */
    for (let i = 0; i < (big ? 34 : 14) * q; i++) {
      const a = Math.random() * TAU, e = Math.random() * 1.3 - .1, sp = rnd(2, big ? 15 : 8) * (big ? 1 : 1);
      this.P({ x, y: y + .3, z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp * 1.2 + 2, vz: Math.sin(a) * Math.cos(e) * sp, life: rnd(.45, 1.05) * (big ? 1.5 : 1), s0: rnd(.7, 1.3) * k, s1: rnd(3, 5.2) * k, r: 1, g: rnd(.55, .85), b: rnd(.2, .4), a0: .95, add: true, ty: 1, drag: 2.2, grav: .5, cf: [.85, .2, .05] });
    }
    /* fumaça escura */
    for (let i = 0; i < (big ? 44 : 18) * q; i++) {
      const a = Math.random() * TAU, sp = rnd(1, big ? 9 : 5);
      this.P({ x: x + rnd(-1, 1) * k, y: y + rnd(.2, 1.5), z: z + rnd(-1, 1) * k, vx: Math.cos(a) * sp, vy: rnd(1.5, big ? 9 : 5), vz: Math.sin(a) * sp, life: rnd(2.2, big ? 8.5 : 4.5), s0: rnd(.8, 1.6) * k, s1: rnd(4, 7.5) * k, r: .13, g: .12, b: .115, a0: rnd(.5, .75), add: false, ty: 0, drag: 1.1, grav: .55, cf: [.38, .36, .34] });
    }
    /* coluna de fumaça (bomba) */
    if (big) for (let i = 0; i < 26 * q; i++) this.P({ x: x + rnd(-2, 2), y: y + rnd(0, 6), z: z + rnd(-2, 2), vx: rnd(-1, 1), vy: rnd(6, 15), vz: rnd(-1, 1), life: rnd(5, 11), s0: rnd(2, 3.5), s1: rnd(7, 13), r: .1, g: .095, b: .09, a0: .6, add: false, ty: 0, drag: .5, grav: .15, cf: [.3, .29, .28] });
    /* anel de poeira + onda de choque */
    for (let i = 0; i < 36 * q * (big ? 1.4 : 1); i++) { const a = i / (36 * q * (big ? 1.4 : 1)) * TAU + Math.random() * .2, sp = rnd(9, 16) * k * .7; this.P({ x, y: y + .15, z, vx: Math.cos(a) * sp, vy: rnd(.2, 1.2), vz: Math.sin(a) * sp, life: rnd(1.1, 2.4), s0: rnd(.8, 1.4) * k, s1: rnd(3, 5.5) * k, r: .6, g: .5, b: .36, a0: .5, add: false, ty: 4, drag: 2.3 }); }
    for (let i = 0; i < 3; i++) this.P({ x, y: y + .3, z, vx: 0, vy: 0, vz: 0, life: .5 + i * .12, s0: .5, s1: R * (big ? 1.9 : 1.15) * (1 - i * .18), r: 1, g: .95, b: .85, a0: .6 - i * .15, add: true, ty: 3, drag: 0, rot: 0 });
    /* faíscas e brasas */
    for (let i = 0; i < (big ? 70 : 26) * q; i++) { const a = Math.random() * TAU, e = rnd(.2, 1.4), sp = rnd(10, big ? 40 : 24); this.P({ x, y: y + .4, z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp, vz: Math.sin(a) * Math.cos(e) * sp, life: rnd(.6, 1.8), s0: rnd(.05, .14), s1: .02, r: 1, g: rnd(.5, .85), b: .2, a0: 1, add: true, ty: 2, drag: .5, grav: -18 }); }
    /* detritos 3D */
    for (let i = 0; i < (big ? 44 : 16) * q; i++) { const a = Math.random() * TAU, sp = rnd(5, big ? 24 : 14), cols = [0x6a4a2c, 0x7a5a38, 0x3a2a1a, 0x8a8a80, 0xc8b070, 0xe8e0c0]; this.chunk(x, y + .3, z, Math.cos(a) * sp, rnd(6, big ? 22 : 13), Math.sin(a) * sp, rnd(.08, big ? .4 : .26), cols[(Math.random() * cols.length) | 0], rnd(2.5, 4.5), Math.random() < .4 ? 'wood' : 'dirt'); }
    /* marca de queimado */
    this.R.addDecal(x, y + .01, z, 0, 1, 0, (big ? 7.5 : 2.4) * rnd(.9, 1.1), 0x120f0c, .9, true); this.R.addDecal(x, y + .014, z, 0, 1, 0, (big ? 4.2 : 1.3), 0x050403, .9, true);
    if (big) { this.spots.push({ x, y, z, t: 9, acc: 0, r: 5.5 }); for (let i = 0; i < 4; i++) { const a = Math.random() * TAU, r = rnd(3, 9); this.R.addDecal(x + Math.cos(a) * r, y + .01, z + Math.sin(a) * r, 0, 1, 0, rnd(.8, 2), 0x15110d, .8, true); } }
    else this.spots.push({ x, y, z, t: 2.2, acc: 0, r: 1.5 });
    /* tremor e flash por distância */
    const reach = R * (big ? 4.5 : 3.2), f = clamp(1 - d / reach, 0, 1);
    if (f > 0) { this.shake((big ? 3.2 : 1.5) * f); this.flash = Math.max(this.flash, clamp((big ? 1.15 : .55) * (1 - d / (R * (big ? 2.4 : 1.6))), 0, 1)); }
  }
  /* Ovo de Galinha: cascas brancas voando, gema espirrando, penas caindo devagar */
  eggBurst(x, y, z) {
    const q = this.q();
    for (let i = 0; i < 18 * q; i++) { const a = Math.random() * TAU, sp = rnd(4, 11); this.chunk(x, y + .4, z, Math.cos(a) * sp, rnd(4, 10), Math.sin(a) * sp, rnd(.05, .12), Math.random() < .8 ? 0xfbf2dc : 0xe8d8b8, rnd(1.6, 2.8), 'wood'); }
    for (let i = 0; i < 22 * q; i++) { const a = Math.random() * TAU, sp = rnd(2, 7); this.P({ x, y: y + .5, z, vx: Math.cos(a) * sp, vy: rnd(2, 7), vz: Math.sin(a) * sp, life: rnd(.5, 1.0), s0: rnd(.12, .22), s1: rnd(.06, .1), r: 1, g: rnd(.72, .86), b: .12, a0: .95, add: false, ty: 5, drag: .8, grav: -14 }); }
    for (let i = 0; i < 16 * q; i++) { const a = Math.random() * TAU, sp = rnd(1, 4); this.P({ x: x + rnd(-.5, .5), y: y + rnd(.8, 2.2), z: z + rnd(-.5, .5), vx: Math.cos(a) * sp, vy: rnd(1, 3.5), vz: Math.sin(a) * sp, life: rnd(2.2, 3.8), s0: rnd(.1, .16), s1: rnd(.08, .12), r: Math.random() < .5 ? 1 : .86, g: Math.random() < .5 ? .98 : .66, b: Math.random() < .5 ? .94 : .4, a0: .95, add: false, ty: 4, drag: 2.4, grav: -1.1 }); }
    this.P({ x, y: y + .5, z, vx: 0, vy: 0, vz: 0, life: .18, s0: 1, s1: 3.2, r: 1, g: .95, b: .6, a0: .9, add: true, ty: 1, drag: 0 });
  }
  /* tiro na cabeça: o chapéu voa girando, cai devagar e fica no chão um tempo */
  hatPop(x, y, z, hat, dx, dz) {
    if (!hat) return; if (this.hats.length > 12) this.hats.shift();
    this.hats.push({ x, y, z, vx: dx * rnd(2.5, 4) + rnd(-.8, .8), vy: rnd(5, 7), vz: dz * rnd(2.5, 4) + rnd(-.8, .8), a: 0, b: 0, va: rnd(-14, 14), vb: rnd(8, 14), hat, life: 9, gnd: false });
    const q = this.q(); for (let i = 0; i < 8 * q; i++) this.P({ x, y, z, vx: rnd(-2, 2), vy: rnd(1, 3.5), vz: rnd(-2, 2), life: rnd(.4, .8), s0: .08, s1: .03, r: 1, g: .9, b: .4, a0: 1, add: true, ty: 2, drag: 1.2, grav: -6 });
  }
  /* "puf" cartoon quando alguém é eliminado */
  poof(x, y, z, feathers) {
    const q = this.q();
    for (let i = 0; i < 10 * q; i++) { const a = Math.random() * TAU, sp = rnd(1, 2.6); this.P({ x: x + Math.cos(a) * .3, y: y + rnd(.2, 1.4), z: z + Math.sin(a) * .3, vx: Math.cos(a) * sp, vy: rnd(.3, 1.4), vz: Math.sin(a) * sp, life: rnd(.6, 1.1), s0: .3, s1: rnd(.8, 1.2), r: .95, g: .93, b: .88, a0: .55, add: false, ty: 0, drag: 2.5, grav: .2 }); }
    if (feathers) for (let i = 0; i < 14 * q; i++) { const a = Math.random() * TAU, sp = rnd(1, 3); this.P({ x, y: y + rnd(.6, 1.6), z, vx: Math.cos(a) * sp, vy: rnd(1, 3), vz: Math.sin(a) * sp, life: rnd(2, 3.4), s0: rnd(.1, .15), s1: .09, r: 1, g: .97, b: .92, a0: .95, add: false, ty: 4, drag: 2.4, grav: -1 }); }
  }
  shake(a) { this.shk = Math.min(5, this.shk + a); }
  /* fogo/fumaça residual + poeira de passos etc. */
  dust(x, y, z, n, s) { const q = this.q(); for (let i = 0; i < n * q; i++) this.P({ x: x + rnd(-.2, .2), y: y + .05, z: z + rnd(-.2, .2), vx: rnd(-1, 1) * s, vy: rnd(.2, 1) * s, vz: rnd(-1, 1) * s, life: rnd(.4, .9), s0: .1, s1: .35 * s, r: .55, g: .46, b: .34, a0: .35, add: false, ty: 4, drag: 2.2 }); }
  splash(x, y, z, k) { this.impact(x, y, z, 0, 1, 0, 'water', 'galho'); if (k > 1) for (let i = 0; i < 6; i++) this.P({ x, y, z, vx: rnd(-2, 2), vy: rnd(2, 5), vz: rnd(-2, 2), life: .6, s0: .06, s1: .04, r: .9, g: .95, b: 1, a0: .8, add: false, ty: 5, drag: .3, grav: -14 }); }
  /* ---------- atualização + desenho ---------- */
  update(dt, cam) {
    const R = this.R, W = this.W; this.cam = cam;
    /* partículas */
    for (let i = this.p.length - 1; i >= 0; i--) {
      const p = this.p[i]; p.life -= dt; if (p.life <= 0) { this.p[i] = this.p[this.p.length - 1]; this.p.pop(); continue; }
      const dr = Math.exp(-(p.drag || 0) * dt); p.vx *= dr; p.vy *= dr; p.vz *= dr; p.vy += (p.grav || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += (p.rv || (p.ty === 0 ? .3 : 0)) * dt;
      if (W && p.ty === 5 || (W && p.add && p.ty === 2)) { const h = W.heightAt(p.x, p.z); if (p.y < h) { p.y = h; p.vy = 0; p.vx *= .5; p.vz *= .5; p.life -= dt * 4; } }
      const k = 1 - p.life / p.max, s = lerp(p.s0, p.s1, Math.pow(k, .6));
      let a = p.a0 * (p.ty === 3 ? 1 - k : (k < .08 ? k / .08 : 1) * (1 - k * k)); if (p.ty === 2) a = p.a0 * (1 - k);
      let r = p.r, g = p.g, b = p.b; if (p.cf) { const f = Math.min(1, k * 1.6); r = lerp(r, p.cf[0], f); g = lerp(g, p.cf[1], f); b = lerp(b, p.cf[2], f); }
      R.pushPart(p.add, p.x, p.y, p.z, s, r, g, b, a, p.rot, p.ty === 5 ? 2 : p.ty, p.seed);
    }
    /* focos de fogo / fumaça */
    for (let i = this.spots.length - 1; i >= 0; i--) {
      const s = this.spots[i]; s.t -= dt; if (s.t <= 0) { this.spots.splice(i, 1); continue; } s.acc += dt;
      while (s.acc > .09) { s.acc -= .09; const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * s.r, f = clamp(s.t / 3, 0, 1);
        const px = s.x + Math.cos(a) * rr, pz = s.z + Math.sin(a) * rr, py = (W ? W.heightAt(px, pz) : s.y) + .1;
        if (Math.random() < f * .8) this.P({ x: px, y: py, z: pz, vx: rnd(-.3, .3), vy: rnd(1, 2.4), vz: rnd(-.3, .3), life: rnd(.5, 1), s0: rnd(.25, .5), s1: .1, r: 1, g: rnd(.45, .7), b: .15, a0: .8, add: true, ty: 1, drag: .6 });
        this.P({ x: px, y: py + .3, z: pz, vx: rnd(-.4, .4), vy: rnd(1.2, 2.8), vz: rnd(-.4, .4), life: rnd(2, 4), s0: .4, s1: rnd(1.6, 2.8), r: .16, g: .15, b: .14, a0: .3 * Math.max(.3, f), add: false, ty: 0, drag: .5, grav: .3 }); }
    }
    /* detritos 3D */
    const m = R.dyn;
    for (let i = this.deb.length - 1; i >= 0; i--) {
      const d = this.deb[i]; d.life -= dt; if (d.life <= 0) { this.deb[i] = this.deb[this.deb.length - 1]; this.deb.pop(); continue; }
      d.vy -= 22 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.a += d.va * dt; d.b += d.vb * dt;
      if (W) { const h = W.heightAt(d.x, d.z) + d.s * .5; if (d.y < h) { d.y = h; if (d.vy < -1.5 && d.bn < 3) { d.vy *= -.35; d.vx *= .6; d.vz *= .6; d.va *= .6; d.vb *= .6; d.bn++; } else { d.vy = 0; d.vx *= .8; d.vz *= .8; d.va *= .8; d.vb *= .8; } } }
      const sc = d.life < .4 ? d.life / .4 : 1; if (sc <= 0.02) continue;
      m.push().tr(d.x, d.y, d.z).ry(d.a).rx(d.b); m.mat(d.tex === 'wood' ? TX.plank2 : d.tex === 'glass' ? TX.white : d.tex === 'brass' ? TX.metal : TX.soil, d.tex === 'glass' ? 230 : d.tex === 'brass' ? 200 : 0).col(d.col).uvs(.3, .3).box(d.s * 2 * sc, d.s * 1.2 * sc, d.s * 1.6 * sc, 0, 0, 0); m.pop();
    }
    /* chapéus voando */
    for (let i = this.hats.length - 1; i >= 0; i--) {
      const h = this.hats[i]; h.life -= dt; if (h.life <= 0) { this.hats.splice(i, 1); continue; }
      if (!h.gnd) { h.vy -= 13 * dt; const dr = Math.exp(-.9 * dt); h.vx *= dr; h.vz *= dr; if (h.vy < 0) h.vy *= Math.exp(-2.2 * dt); h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt; h.a += h.va * dt; h.b += h.vb * dt;
        const gy = W ? W.heightAt(h.x, h.z) : h.y - 1; if (h.y < gy + .02) { h.y = gy + .02; h.gnd = true; h.b = 0; h.a = h.a % TAU; } }
      const sc = h.life < .6 ? h.life / .6 : 1; if (sc < .02) continue;
      m.push().tr(h.x, h.y, h.z).ry(h.a).rx(h.gnd ? 0 : Math.sin(h.b) * .9).sc(sc).tr(0, -.2, 0); drawHat(m, h.hat); m.pop();
    }
    /* pedras do estilingue em voo */
    if (this.stones) for (let i = this.stones.length - 1; i >= 0; i--) { const st = this.stones[i]; st.t += dt * 85; const k = st.t / Math.max(1, st.d); if (k >= 1) { this.stones.splice(i, 1); continue; }
      const x = st.x0 + st.dx * k, y = st.y0 + st.dy * k + Math.sin(k * Math.PI) * Math.min(1.2, st.d * .015), z = st.z0 + st.dz * k;
      m.push().tr(x, y, z).ry(st.t).rx(st.t * 1.3); m.mat(TX.stone, 0).col(0xb0a898).uvs(1, 1).sph(.045, .04, .045, 7, 5, 0, 0, 0); m.pop();
      if (Math.random() < .6) this.P({ x, y, z, vx: 0, vy: .1, vz: 0, life: .35, s0: .05, s1: .14, r: .75, g: .7, b: .62, a0: .25, add: false, ty: 4, drag: 3 }); }
    /* tracers */
    for (let i = this.tr.length - 1; i >= 0; i--) {
      const t = this.tr[i]; t.t += dt * t.spd; if (t.t - t.len > t.d) { this.tr.splice(i, 1); continue; }
      const head = Math.min(t.t, t.d), tail = Math.max(0, t.t - t.len); if (head <= tail) continue; const f = 1 - clamp((t.t - t.d) / t.len, 0, 1);
      const x0 = t.x0 + t.dx * tail, y0 = t.y0 + t.dy * tail, z0 = t.z0 + t.dz * tail, x1 = t.x0 + t.dx * head, y1 = t.y0 + t.dy * head, z1 = t.z0 + t.dz * head;
      R.pushBeam(x0, y0, z0, t.w, x1, y1, z1, .95 * f, t.col[0], t.col[1], t.col[2]);
      const t2 = Math.max(0, tail - t.len * 1.6); R.pushBeam(t.x0 + t.dx * t2, t.y0 + t.dy * t2, t.z0 + t.dz * t2, t.w * .5, x0, y0, z0, .22 * f, t.col[0], t.col[1], t.col[2]);
    }
    /* tremor */
    this.shkT += dt; this.shk = Math.max(0, this.shk - dt * (this.shk > 1.2 ? 2.6 : 3.4)); this.flash = Math.max(0, this.flash - dt * .85);
  }
  shakeOffset(out) { const s = this.shk * (settings.cameraShake === undefined ? 1 : settings.cameraShake), t = this.shkT * 38; out.x = (Math.sin(t * 1.3) + Math.sin(t * 2.7 + 1)) * .5 * s * .028; out.y = (Math.sin(t * 1.7 + 2) + Math.sin(t * 3.1)) * .5 * s * .028; out.r = Math.sin(t * .9) * s * .02; return out; }
}
