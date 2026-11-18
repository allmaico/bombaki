/* =====================================================================
   595_animals.js — ANIMAIS DA FAZENDA (modelos e comportamento novos)
   Vaca: malhada, chifres, focinho rosa, úbere, sino; pasta (cabeça baixa,
   mastiga), abana o rabo, mexe as orelhas, muge; assusta com tiro (levanta
   a cabeça, muge forte, sapateia).
   Galinha: penas, crista, barbela, asas; cisca (bica o chão), cacareja;
   assustada corre batendo as asas e dá pulinhos.
   Porco: focinho, orelhas caídas, rabo enrolado, manchas de lama; fuça o
   chão, ronca; assustado foge trotando.
   Medo: tiros (de onde saiu e onde bateu), explosões e gente correndo perto.
   ===================================================================== */
'use strict';
const Animals = {
  scares: [],
  scare(x, z, r, k) { this.scares.push({ x, z, r, k: k || 1, t: .25 }); if (this.scares.length > 24) this.scares.shift(); },
  fearAt(x, z) { let best = null, bd = 0; for (const s of this.scares) { const d = Math.hypot(x - s.x, z - s.z); if (d < s.r && (s.r - d) * s.k > bd) { bd = (s.r - d) * s.k; best = s; } } return best; },
  tick(dt) { for (let i = this.scares.length - 1; i >= 0; i--) if ((this.scares[i].t -= dt) <= 0) this.scares.splice(i, 1);
    /* gente correndo perto também assusta */
    if (G.ents) for (const e of G.ents.values()) if (e.alive && (e.spd || 0) > 4.5) this.scare(e.x, e.z, 3.5, .6); }
};
/* ---------------- VACA ---------------- */
window.drawCow = function (m, a, t) {
  const ph = a.ph || 0, scared = a.fearT > 0 ? Math.min(1, a.fearT) : 0, graze = (1 - scared) * Math.max(0, Math.sin(t * .22 + ph)), chew = Math.sin(t * 7 + ph) * .02 * graze;
  const yaw = a.rot + (a.turn || 0) + Math.sin(t * .1 + ph) * .05;
  m.push().tr(a.x, a.y + (a.hop || 0), a.z).ry(yaw);
  const W = 0xfaf6ee, B = 0x24201c;
  /* corpo arredondado com manchas */
  m.mat(TX.white, 0).col(W).uvs(1, 1).box(.82, .78, 1.62, 0, 1.02, 0).box(.74, .66, 1.72, 0, 1.0, 0);
  m.mat(TX.white, 0).col(B); for (const [x, y, z, s] of [[.42, 1.12, -.3, .34], [-.42, .98, .35, .4], [.42, .9, .5, .26], [-.42, 1.18, -.45, .28], [0, 1.42, .15, .36]]) m.box(Math.abs(x) > .1 ? .02 : s * 1.1, Math.abs(x) > .1 ? s : .02, s * 1.2, x, y, z);
  /* úbere */
  m.mat(TX.white, 0).col(0xf2a6b0).box(.3, .16, .34, 0, .58, .45); for (const [x, z] of [[-.08, .38], [.08, .38], [-.08, .52], [.08, .52]]) m.box(.04, .08, .04, x, .46, z);
  /* pernas (andam no lugar quando assustada) */
  for (const [x, z, k] of [[-.26, -.6, 0], [.26, -.6, 1], [-.26, .6, 1], [.26, .6, 0]]) { const sw = scared * Math.sin(t * 14 + k * PI) * .25; m.push().tr(x, .66, z).rx(sw); m.mat(TX.white, 0).col(W).box(.18, .58, .18, 0, -.3, 0); m.mat(TX.white, 0).col(0x3a2a1e).box(.2, .1, .2, 0, -.6, 0); m.pop(); }
  /* rabo abanando */
  m.push().tr(0, 1.32, .86).rx(.3 + Math.sin(t * 2.6 + ph) * .1).rz(Math.sin(t * 3.4 + ph) * .5); m.mat(TX.white, 0).col(W).box(.05, .55, .05, 0, -.27, 0); m.mat(TX.white, 0).col(B).box(.1, .14, .1, 0, -.56, 0); m.pop();
  /* cabeça: pasta (abaixa) e mastiga; assustada levanta e olha */
  m.push().tr(0, 1.25, -.88).rx(-.15 + graze * .95 - scared * .35).ry(scared * Math.sin(t * 5) * .3);
  m.mat(TX.white, 0).col(W).box(.46, .44, .52, 0, 0, -.12);
  m.mat(TX.white, 0).col(B).box(.47, .2, .2, 0, .1, -.05);
  m.mat(TX.white, 0).col(0xf2a6b0).box(.36, .2, .14, 0, -.13 + chew, -.42); m.mat(TX.white, 0).col(0x6a2a30).box(.05, .05, .02, -.08, -.1 + chew, -.495).box(.05, .05, .02, .08, -.1 + chew, -.495);
  m.mat(TX.white, 0).col(0x111111).box(.06, .07, .02, -.15, .08, -.385).box(.06, .07, .02, .15, .08, -.385); m.mat(TX.white, 0).col(0xffffff).box(.02, .02, .01, -.14, .1, -.396).box(.02, .02, .01, .16, .1, -.396);
  m.mat(TX.white, 60).col(0xf4ead0); for (const s of [-1, 1]) { m.push().tr(s * .2, .25, 0).rz(-s * .5); m.box(.06, .16, .06, 0, .06, 0); m.pop(); }
  for (const s of [-1, 1]) { m.push().tr(s * .28, .1, .04).rz(s * (.5 + Math.sin(t * 1.7 + ph + s) * .25)); m.mat(TX.white, 0).col(W).box(.2, .07, .12, s * .1, 0, 0); m.pop(); }
  /* sino no pescoço */
  m.mat(TX.cloth, 0).col(0xd8322a).box(.5, .06, .1, 0, -.22, .08); m.mat(TX.metal, 180).col(GM.brass).cyl(.06, .045, .1, 8, 0, -.36, -.14, 3);
  m.pop(); m.pop();
};
/* ---------------- GALINHA ---------------- */
window.drawChicken = function (m, c) {
  const ph = c.ph || 0, run = c.run || 0, peck = c.peck || 0, flap = c.flap || 0, hop = c.hop || 0;
  m.push().tr(c.x, c.y + hop, c.z).ry(c.yaw);
  const col = c.col || 0xf4eee0, dk = shade(col, .82);
  /* corpo redondo + cauda */
  m.mat(TX.white, 0).col(col).uvs(1, 1).sph(.13, .12, .17, 8, 6, 0, .27, .02); m.mat(TX.white, 0).col(dk); m.push().tr(0, .34, .17).rx(-.6); m.box(.1, .14, .05); m.box(.06, .17, .04, 0, .02, .02); m.pop();
  /* asas (batem quando corre/assusta) */
  for (const s of [-1, 1]) { m.push().tr(s * .12, .3, .02).rz(s * (.15 + flap * (.6 + .5 * Math.sin(ph * 6)))); m.mat(TX.white, 0).col(dk).box(.04, .1, .18, s * .02, -.02, 0); m.pop(); }
  /* pernas */
  m.mat(TX.white, 0).col(0xf2a62a); for (const s of [-1, 1]) { const sw = Math.sin(ph * (run ? 2 : 1) + (s > 0 ? PI : 0)) * (run ? .6 : .25); m.push().tr(s * .05, .16, 0).rx(sw); m.box(.025, .16, .025, 0, -.08, 0); m.box(.06, .015, .07, 0, -.16, -.02); m.pop(); }
  /* cabeça: bica o chão */
  m.push().tr(0, .38, -.12).rx(peck * 1.25);
  m.mat(TX.white, 0).col(col).sph(.07, .08, .07, 7, 5, 0, .05, -.03);
  m.mat(TX.white, 0).col(0xf2a62a).box(.035, .03, .07, 0, .04, -.12);
  m.mat(TX.cloth, 0).col(0xd9342b).box(.025, .06, .08, 0, .13, -.03).box(.025, .05, .03, 0, -.01, -.1);
  m.mat(TX.white, 0).col(0x111111).box(.012, .02, .02, -.055, .07, -.07).box(.012, .02, .02, .055, .07, -.07);
  m.pop(); m.pop();
};
/* ---------------- PORCO ---------------- */
window.drawPig = function (m, a, t) {
  const ph = a.ph || 0, walk = a.walk ? 1 : 0, run = a.run || 0, root = a.eat ? (.5 + .5 * Math.sin(t * 5 + ph)) : 0, bob = Math.sin(t * (run ? 12 : 6) + ph) * (walk ? .03 : .006);
  m.push().tr(a.x, a.y + bob, a.z).ry(a.yaw || 0);
  const P = 0xf6a8b8, D = 0xe88ea2;
  m.mat(TX.white, 0).col(P).uvs(1, 1).sph(.32, .29, .5, 10, 7, 0, .5, 0);
  m.mat(TX.mud, 0).col(0x7a4a24); for (const [x, y, z, s] of [[.22, .42, .2, .14], [-.2, .55, -.1, .12], [.1, .3, -.3, .1]]) m.sph(s, s * .6, s, 6, 4, x, y, z);
  for (const [x, z, k] of [[-.17, -.3, 0], [.17, -.3, 1], [-.17, .3, 1], [.17, .3, 0]]) { const sw = Math.sin(t * (run ? 14 : 8) + ph + k * PI) * (walk ? .45 : 0); m.push().tr(x, .3, z).rx(sw); m.mat(TX.white, 0).col(D).box(.12, .26, .12, 0, -.13, 0); m.mat(TX.white, 0).col(0x5a3a2a).box(.13, .05, .13, 0, -.26, 0); m.pop(); }
  /* rabo enrolado */
  m.mat(TX.white, 0).col(D); m.push().tr(0, .62, .5).rx(Math.sin(t * 6 + ph) * .3); for (let i = 0; i < 5; i++) { const a2 = i * 1.4; m.box(.03, .03, .03, Math.cos(a2) * .04, Math.sin(a2) * .04, .02 + i * .012); } m.pop();
  /* cabeça (fuça o chão) */
  m.push().tr(0, .58, -.48).rx(Math.sin(t * 1.3 + ph) * .1 + root * .55);
  m.mat(TX.white, 0).col(P).sph(.22, .2, .2, 8, 6, 0, 0, -.02);
  m.mat(TX.white, 0).col(D).cyl(.1, .1, .1, 10, 0, -.04, -.21, 3); m.push().tr(0, -.04, -.27).rx(PI / 2); m.mat(TX.white, 0).col(0x7a3a50).cyl(.02, .02, .02, 6, -.035, 0, 0, 3).cyl(.02, .02, .02, 6, .035, 0, 0, 3); m.pop();
  for (const s of [-1, 1]) { m.push().tr(s * .14, .16, -.02).rz(s * .6).rx(-.5 + Math.sin(t * 2 + ph + s) * .15); m.mat(TX.white, 0).col(D).box(.12, .16, .03, 0, .06, 0); m.pop(); }
  m.mat(TX.white, 0).col(0x111111).box(.04, .05, .02, -.09, .07, -.19).box(.04, .05, .02, .09, .07, -.19);
  m.pop(); m.pop();
};
/* ---------------- comportamento (cenário, sem colisão) ---------------- */
function updateDecor(dt) {
  const W = G.map.W, cam = G.cam; Animals.tick(dt);
  for (const list of [G.decor.chickens, G.decor.pigs]) for (const c of list) {
    const dx = c.x - cam.x, dz = c.z - cam.z; if (dx * dx + dz * dz > 110 * 110) continue; const isPig = list === G.decor.pigs;
    const f = Animals.fearAt(c.x, c.z); if (f) { c.fear = isPig ? 2.5 : 3; const a = Math.atan2(c.x - f.x, c.z - f.z), r = isPig ? 7 : 6; c.tx = c.x + Math.sin(a) * r; c.tz = c.z + Math.cos(a) * r; c.wait = 0; if (!c.saidT || G.time - c.saidT > 2) { c.saidT = G.time; if (Math.hypot(dx, dz) < 30) { if (isPig) sfx.oink({ x: c.x, y: c.y + .4, z: c.z }, true); else sfx.cluck({ x: c.x, y: c.y + .4, z: c.z }, true); } } }
    c.fear = Math.max(0, (c.fear || 0) - dt); const afraid = c.fear > 0, sp = isPig ? (afraid ? 3.4 : .7) : (afraid ? 4.2 : 1.1);
    c.wait -= dt; const d = Math.hypot(c.tx - c.x, c.tz - c.z);
    if (d > .15 && c.wait <= 0) {
      const a = Math.atan2(-(c.tx - c.x), -(c.tz - c.z)); c.yaw += angDiff(c.yaw, a) * Math.min(1, dt * (afraid ? 12 : 6));
      const nx = c.x + (c.tx - c.x) / d * sp * dt, nz = c.z + (c.tz - c.z) / d * sp * dt;
      if (!W.solidAt(nx, W.heightAt(nx, nz) + .3, nz) && W.waterDepth(nx, nz) < .02 && Math.hypot(nx - c.cx, nz - c.cz) < c.r * 2.2) { c.x = nx; c.z = nz; c.walk = true; } else { c.tx = c.x; c.tz = c.z; }
      c.ph = (c.ph || 0) + dt * (afraid ? 22 : 9); c.eat = false;
    } else { c.walk = false; if (c.wait <= 0) { const a = Math.random() * TAU, r = Math.random() * c.r; c.tx = c.cx + Math.cos(a) * r; c.tz = c.cz + Math.sin(a) * r; c.wait = 1 + Math.random() * 4; c.eat = Math.random() < .5; } }
    if (!isPig) { c.run = afraid ? 1 : 0; c.flap = damp(c.flap || 0, afraid ? 1 : 0, 8, dt); c.hop = afraid ? Math.abs(Math.sin(G.time * 9 + c.cx)) * .12 : 0; c.peck = !c.walk && c.eat ? Math.max(0, Math.sin(G.time * 9 + c.cx * 3)) : damp(c.peck || 0, 0, 10, dt); if (!afraid && Math.random() < dt * .03 && Math.hypot(dx, dz) < 25) sfx.cluck({ x: c.x, y: c.y + .3, z: c.z }, false); }
    else { c.run = afraid ? 1 : 0; if (!afraid && Math.random() < dt * .02 && Math.hypot(dx, dz) < 25) sfx.oink({ x: c.x, y: c.y + .5, z: c.z }, false); }
    c.y = W.heightAt(c.x, c.z);
  }
  /* vacas: assustam, viram, mugem */
  const cows = G.map.animals || []; for (const a of cows) { const dx = a.x - cam.x, dz = a.z - cam.z; if (dx * dx + dz * dz > 120 * 120) continue; const f = Animals.fearAt(a.x, a.z);
    if (f && !(a.fearT > 0)) { a.fearT = 2.5; if (Math.hypot(dx, dz) < 45) sfx.moo({ x: a.x, y: a.y + 1.3, z: a.z }, true); a.turnTo = angDiff(a.rot, Math.atan2(-(f.x - a.x), -(f.z - a.z))); }
    a.fearT = Math.max(0, (a.fearT || 0) - dt); a.turn = damp(a.turn || 0, a.fearT > 0 ? a.turnTo || 0 : 0, 3, dt);
    if (a.fearT <= 0 && Math.random() < dt * .012 && Math.hypot(dx, dz) < 40) sfx.moo({ x: a.x, y: a.y + 1.3, z: a.z }, false); }
};
/* sons dos bichos (sintetizados, posicionais) */
Object.assign(Sfx.prototype, /** @type {ThisType<Sfx> & Record<string, any>} */ ({
  moo(pos, loud) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos, loud ? .7 : .4); if (!o) return; const d = loud ? .9 : 1.3; this.tone(o, t, 'sawtooth', 160, 120, d, .22); this.tone(o, t, 'triangle', 240, 175, d, .18); this.tone(o, t + d * .6, 'sine', 130, 95, d * .5, .12); },
  cluck(pos, loud) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos, loud ? .55 : .3); if (!o) return; const n = loud ? 5 : 2 + (Math.random() * 2 | 0); for (let k = 0; k < n; k++) { const f = (loud ? 900 : 700) + Math.random() * 250; this.tone(o, t + k * (loud ? .07 : .12), 'square', f, f * .7, .05, .12); } },
  oink(pos, loud) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos, loud ? .55 : .35); if (!o) return; for (let k = 0; k < (loud ? 3 : 1); k++) { this.tone(o, t + k * .16, 'sawtooth', 300, 180, .12, .2); this.noise(o, t + k * .16, .1, 'bandpass', 600, 0, 4, .15); } }
}));
