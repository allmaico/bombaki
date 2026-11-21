/* =====================================================================
   593_agents2.js — v7.10 (cliente): ícones e efeitos das habilidades novas
   Laço · Rodeio Final · Queimada · Muda de Mandacaru
   ===================================================================== */
'use strict';
Object.assign(AB_COL, { laco: '#d8a050', rodeio: '#ff5a2a', queimada: '#ff8a3a', mandacaru: '#4aa84a', lama: '#ff7a3a', fumaca: '#5a5a60', nuvem: '#ff9a4a' });
Object.assign(GEAR, {
  ab_laco(m) { /* laço de corda enrolado */
    m.mat(TX.cloth, 0).col(0xc8964a).uvs(1, 1); for (let k = 0; k < 20; k++) { const a = k / 20 * TAU, b2 = (k + 1) / 20 * TAU, r = .17; for (const dz of [-.02, 0, .02]) { m.push().tr(Math.cos(a) * r, Math.sin(a) * r, dz).rz(a + PI / 2); m.box(.055, .022, .022); m.pop(); } void b2; }
    m.push().tr(.12, -.2, 0).rz(.5); m.box(.022, .16, .022); m.pop(); m.mat(TX.cloth, 0).col(0x8a5a2a).box(.05, .05, .05, .16, -.27, 0);
  },
  ab_rodeio(m) { /* fivela de rodeio dourada com chifres */
    m.mat(TX.metal, 170, 0, 40).col(0xf0c040).uvs(1, 1).cyl(.16, .16, .04, 18, 0, 0, 0, 3); m.mat(TX.metal, 120).col(0x8a5a1a).cyl(.12, .12, .045, 16, 0, 0, 0, 3);
    m.mat(TX.white, 60).col(0xf4ead8); for (const s of [-1, 1]) { m.push().tr(s * .08, .05, -.03).rz(s * -1); m.cyl(.03, .01, .14, 8, 0, 0, 0, 3); m.pop(); }
    m.mat(TX.cloth, 0).col(0xd8352a).sph(.04, .04, .02, 8, 6, 0, -.01, -.03);
  },
  ab_queimada(m) { /* tocha de palha com fogo */
    bx(m, TX.wood, 0x6a4422, 10, .04, .36, .04, 0, -.12, 0); m.mat(TX.hay, 0).col(0xe8c860).uvs(1, 1).cyl(.06, .045, .12, 10, 0, .06, 0, 3);
    m.mat(TX.white, 0, 0, 160).col(0xff8a20).sph(.07, .1, .07, 8, 6, 0, .2, 0); m.mat(TX.white, 0, 0, 200).col(0xffe060).sph(.04, .06, .04, 8, 6, 0, .19, 0);
    m.mat(TX.white, 0).col(0x8a8a90).sph(.06, .04, .06, 8, 5, .05, .32, 0).sph(.05, .035, .05, 8, 5, -.04, .36, 0);
  },
  ab_mandacaru(m) { /* mandacaru com braços */ CactusFx.cactus(m, 0, -.2, 0, .55, 0); }
});
for (const id of ['laco', 'rodeio', 'queimada', 'mandacaru']) for (const F of Object.values(FARMERS)) for (const ab of F.ab) if (ab.id === id) ITEMS['ab_' + id] = { cat: 'Habilidades', name: ab.name, col: AB_COL[id] || F.col, view: { ry: -.5, rx: .3 } };
for (const F of Object.values(FARMERS)) for (const ab of F.ab) { const it = ITEMS['ab_' + ab.id]; if (it) { it.name = ab.name; it.col = AB_COL[ab.id] || F.col; } }
/* mandacaru (código): tronco com gomos, braços e espinhos */
const CactusFx = {
  cactus(m, x, y, z, s, seed) {
    m.push().tr(x, y, z).sc(s); const g = 0x3a8a3a, g2 = 0x2a6a2a;
    m.mat(TX.leaf, 0).col(g).uvs(1, 1).cyl(.16, .14, 1.0, 9, 0, 0, 0, 3); m.mat(TX.leaf, 0).col(g2).sph(.14, .1, .14, 9, 6, 0, 1.0, 0);
    const arms = [[-1, .42 + (seed % 3) * .06], [1, .55 - (seed % 2) * .08]];
    for (const [sd, h] of arms) { m.mat(TX.leaf, 0).col(g).push().tr(sd * .14, h, 0).rz(sd * -1.57); m.cyl(.085, .08, .22, 8, 0, 0, 0, 3); m.pop(); m.push().tr(sd * .34, h, 0); m.cyl(.08, .07, .34, 8, 0, 0, 0, 3); m.mat(TX.leaf, 0).col(g2).sph(.07, .05, .07, 7, 5, 0, .34, 0); m.pop(); }
    m.mat(TX.white, 0).col(0xf0ead0); for (let i = 0; i < 14; i++) { const a = i * 2.39 + seed, yy = .1 + (i % 7) * .13; m.box(.012, .012, .07, Math.cos(a) * .16, yy, Math.sin(a) * .16); }
    if (seed % 2) m.mat(TX.white, 0, 0, 60).col(0xff5aa0).sph(.04, .03, .04, 6, 4, 0, 1.08, 0);
    m.pop();
  }
};
(function () {
  const draw0 = AbFx.draw.bind(AbFx), ev0 = AbFx.event.bind(AbFx), step0 = AbFx.step.bind(AbFx), ropes = [];
  AbFx.draw = function (m, t) {
    draw0(m, t); const cam = G.cam;
    for (const e of this.list()) {
      if (e.k !== 'mandacaru' || Math.hypot(e.x - cam.x, e.z - cam.z) > 140) continue;
      const grow = clamp((16 - e.t) / .4, .15, 1); m.push().tr(e.x, e.y, e.z).ry(e.ax ? PI / 2 : 0);
      for (let i = 0; i < 5; i++) CactusFx.cactus(m, -1.4 + i * .7, 0, (i % 2) * .12 - .06, (1.25 + (i % 3) * .18) * grow, i + (e.id | 0));
      m.mat(TX.mud, 0).col(0x7a5a3a).uvs(1, 1).box(3.4, .12, .5, 0, .04, 0); m.pop();
    }
    for (const r of ropes) { const k = Math.min(1, r.t / .18), x = r.x + (r.x2 - r.x) * k, y = r.y + (r.y2 - r.y) * k, z = r.z + (r.z2 - r.z) * k; G.R.pushBeam(r.x, r.y, r.z, .035, x, y, z, .95, .78, .58, .32); }
  };
  AbFx.step = function (dt, t) {
    step0(dt, t); for (const r of ropes) { r.t += dt; const en = G.ents.get(r.p); if (en) { r.x = en.x; r.y = en.y + 1.3; r.z = en.z; } } for (let i = ropes.length - 1; i >= 0; i--) if (ropes[i].t > .8) ropes.splice(i, 1);
    if (!G.fx) return; for (const en of G.ents.values()) if (en.alive && en.rodeo && Math.random() < dt * 14) G.fx.P({ x: en.x + rnd(-.4, .4), y: en.y + .1, z: en.z + rnd(-.4, .4), vx: rnd(-.4, .4), vy: rnd(.5, 1.5), vz: rnd(-.4, .4), life: .5, s0: .18, s1: .05, r: 1, g: .5, b: .15, a0: .9, add: true, ty: 1, drag: 1 });
  };
  AbFx.event = function (e) {
    ev0(e); const fx = G.fx, me = G.me, myId = G.myId, pos = { x: e.x, y: e.y, z: e.z };
    if (e.t === 'ab' && e.k === 'laco') { ropes.push({ p: e.p, t: 0, x: e.x, y: e.y, z: e.z, x2: e.x2, y2: e.y2 + .3, z2: e.z2 }); sfx.whip && sfx.whip(e.p === myId ? null : pos); }
    else if (e.t === 'ab' && e.k === 'rodeio') { if (fx) fx.dust(e.x, e.y, e.z, 16, 2); sfx.whip && sfx.whip(e.p === myId ? null : pos); if (e.p === myId) hud_toast('🤠 Rodeio Final! 8 s — cada abate renova'); }
    else if (e.t === 'ab' && e.k === 'mandacaru' && fx) fx.dust(e.x, e.y, e.z, 14, 2.2);
    else if (e.t === 'abx' && e.k === 'quebrou' && e.kind === 'mandacaru' && fx) for (let i = 0; i < 14; i++) fx.chunk(e.x, e.y + .6, e.z, rnd(-2, 2), rnd(1, 3), rnd(-2, 2), .07, 0x3a8a3a, 1, TX.leaf);
    void me;
  };
})();
