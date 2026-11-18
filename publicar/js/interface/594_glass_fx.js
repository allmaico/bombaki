/* =====================================================================
   594_glass_fx.js — VIDROS (cliente): desenho transparente com reflexo,
   cacos presos na moldura depois de quebrado, estilhaços voando, brilho
   e som; sincroniza o estado (quebrado / inteiro) com o anfitrião.
   ===================================================================== */
'use strict';
const GlassFx = {
  byId(id) { const L = G.map && G.map.W.glass; return L ? L[id - 1] : null; },
  /* eventos do anfitrião */
  event(e) {
    if (e.t === 'glassR') { if (!G.sim && G.map) for (const g of G.map.W.glass || []) if (g.broken) glassSetBroken(g, false); return; }
    const g = this.byId(e.id); if (!g) return; if (!G.sim) glassSetBroken(g, true);
    this.shatter(g, e.dx || 0, e.dz || 0);
  },
  /* lista de quebrados vinda no snapshot (quem entrou depois / perdeu pacote) */
  sync(ids) { if (G.sim || !G.map || !G.map.W.glass) return; const S = new Set(ids); for (const g of G.map.W.glass) { const b = S.has(g.id); if (b !== g.broken) glassSetBroken(g, b); } },
  shatter(g, dx, dz) {
    const fx = G.fx; if (!fx) return; const q = fx.q(), w = g.ax === 'x' ? g.z1 - g.z0 : g.x1 - g.x0, h = g.y1 - g.y0;
    const n = Math.round((24 + w * h * 10) * Math.max(.5, q));
    for (let i = 0; i < n; i++) {
      const u = Math.random() - .5, v = Math.random(), x = g.ax === 'x' ? g.cx : g.cx + u * w, z = g.ax === 'x' ? g.cz + u * w : g.cz, y = g.y0 + v * h;
      const sp = rnd(1.5, 5.5); fx.chunk(x, y, z, dx * sp + rnd(-1.2, 1.2), rnd(-.5, 2.5), dz * sp + rnd(-1.2, 1.2), rnd(.025, .07), Math.random() < .5 ? 0xd8f4ff : 0xa8d8f0, rnd(1.6, 3), 'glass');
    }
    for (let i = 0; i < 18 * q; i++) fx.P({ x: g.cx, y: g.cy, z: g.cz, vx: dx * rnd(1, 4) + rnd(-1.5, 1.5), vy: rnd(-.5, 2), vz: dz * rnd(1, 4) + rnd(-1.5, 1.5), life: rnd(.25, .6), s0: .06, s1: .02, r: .85, g: .95, b: 1, a0: 1, add: true, ty: 2, drag: 1.5, grav: -6 });
    sfx.glass && sfx.glass({ x: g.cx, y: g.cy, z: g.cz });
  },
  /* desenho: vidro inteiro (transparente com reflexo) ou cacos na moldura */
  draw(t) {
    const L = G.map && G.map.W.glass; if (!L || !G.R) return; const m = G.R.transMB, cam = G.cam, R2 = 75 * 75;
    for (const g of L) {
      const dx = g.cx - cam.x, dz = g.cz - cam.z; if (dx * dx + dz * dz > R2) continue;
      const w = g.ax === 'x' ? g.z1 - g.z0 : g.x1 - g.x0, h = g.y1 - g.y0, th = .025;
      m.push().tr(g.cx, g.cy, g.cz); if (g.ax === 'x') m.ry(Math.PI / 2);
      if (!g.broken) {
        m.mat(TX.white, 220).col(g.fake ? 0x8ab8d0 : 0xb8e4f8, g.fake ? 120 : 62).uvs(1, 1).box(w, h, th);
        /* reflexos diagonais */
        m.mat(TX.white, 255, 0, 40).col(0xffffff, 26); m.push().tr(-w * .2, h * .1, -th).rz(.75).box(.05, h * .8, .004).pop(); m.push().tr(w * .02, h * .05, -th).rz(.75).box(.022, h * .6, .004).pop();
      } else {
        /* cacos presos nas bordas (dentes de serra) */
        m.mat(TX.white, 220).col(0xc8ecff, 95).uvs(1, 1); const seed = g.id * 7.3;
        for (let i = 0; i < 7; i++) { const u = -w / 2 + (i + .5) * w / 7, s1 = .08 + .14 * Math.abs(Math.sin(seed + i * 2.1)), s2 = .06 + .12 * Math.abs(Math.cos(seed + i * 1.7));
          m.push().tr(u, h / 2 - s1 / 2, 0).rz(Math.sin(seed + i) * .4).box(w / 7 * .9, s1, th).pop(); m.push().tr(u, -h / 2 + s2 / 2, 0).rz(Math.cos(seed + i) * .4).box(w / 7 * .9, s2, th).pop(); }
        for (const sx of [-1, 1]) { const s = .07 + .1 * Math.abs(Math.sin(seed * sx)); m.push().tr(sx * (w / 2 - s / 2), 0, 0).box(s, h * .6, th).pop(); }
      }
      m.pop();
    }
  }
};
