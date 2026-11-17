/* =====================================================================
   590_farmers.js — FAZENDEIROS (lado do cliente)
   • modelos 3D das habilidades (mesmo modelo no mundo, na loja e no HUD)
   • acessórios de cada fazendeiro no personagem
   • entidades no mundo: cerca, sino, arapuca (só a equipe vê), fumaça,
     lamaçal, mutirão, gavião voando, rojão, clarão
   • HUD: barra de habilidades (Z / X), tela branca de cegueira,
     marcadores de inimigos revelados
   • tela "Escolha seu fazendeiro" (1ª rodada, tecla F)
   ===================================================================== */
'use strict';
const AB_COL = { investida: '#ff7a3a', rojao: '#ff4a3a', gaviao: '#4ab8ff', sino: '#ffc61a', cerca: '#c8a070', arapuca: '#8a6a44', fumaca: '#c8d0d8', lama: '#8a5a34', garrafada: '#ff5a6a', mutirao: '#5ad08a' };
/* ---------- modelos ---------- */
Object.assign(GEAR, {
  ab_investida(m) { /* chifres de boi com faixa vermelha */
    bx(m, TX.cloth, 0xd8352a, 0, .34, .1, .12, 0, 0, 0); m.mat(TX.white, 60).col(0xf4ead8).uvs(1, 1);
    for (const s of [-1, 1]) { m.push().tr(s * .17, .02, 0).rz(s * -1.1); m.cyl(.045, .02, .22, 8, 0, 0, 0, 3); m.pop(); m.push().tr(s * .33, .17, 0).rz(s * -.3); m.cyl(.02, .005, .1, 6, 0, 0, 0, 3); m.pop(); }
  },
  ab_rojao(m) { m.mat(TX.cloth, 20).col(0xd8352a).uvs(1, 1).cyl(.045, .045, .26, 12, 0, -.13, 0, 3); m.mat(TX.white, 0).col(0xffe27a).cyl(.047, .047, .04, 12, 0, -.02, 0, 0).cyl(.047, .047, .04, 12, 0, .07, 0, 0); m.mat(TX.white, 0).col(0x3a2a1a).cyl(.006, .006, .09, 4, 0, .13, 0, 0); m.mat(TX.white, 0, 0, 100).col(0xffd040).sph(.016, .016, .016, 6, 4, 0, .23, 0); },
  ab_gaviao(m) { /* gavião de asas abertas */
    m.mat(TX.cloth, 0).col(0x7a4a2a).uvs(1, 1).sph(.07, .06, .16, 8, 6, 0, 0, 0); m.mat(TX.white, 0).col(0xf4ead8).sph(.055, .05, .055, 8, 6, 0, .03, -.14);
    m.mat(TX.white, 0).col(0xf0b020).box(.02, .02, .05, 0, .02, -.2); m.mat(TX.cloth, 0).col(0x5a3418); for (const s of [-1, 1]) { m.push().tr(s * .2, .02, 0).rz(s * .15); m.box(.32, .02, .12); m.box(.14, .018, .1, s * .2, -.01, .02); m.pop(); } m.box(.1, .015, .1, 0, 0, .17);
  },
  ab_sino(m) { bx(m, TX.wood, 0x7a5232, 10, .05, .5, .05, 0, -.02, 0); bx(m, TX.wood, 0x7a5232, 10, .2, .04, .04, .07, .22, 0); m.mat(TX.metal, 160).col(0xe8b830).uvs(1, 1).cyl(.08, .045, .12, 12, .15, .06, 0, 3); m.mat(TX.metal, 120).col(0x6a4a1a).sph(.02, .02, .02, 6, 4, .15, .055, 0); },
  ab_cerca(m) { for (const x of [-.22, .22]) bx(m, TX.wood, 0x7a5232, 10, .05, .42, .05, x, 0, 0); for (const y of [-.08, .1]) bx(m, TX.wood, 0xc8a070, 10, .52, .06, .025, 0, y, 0); m.mat(TX.metal, 140).col(0xb8bcc4).uvs(1, 1); for (const y of [.02, .18]) { m.box(.5, .008, .008, 0, y, -.02); for (let i = 0; i < 6; i++) m.box(.012, .03, .012, -.2 + i * .08, y, -.02); } },
  ab_arapuca(m) { m.mat(TX.wood, 10).col(0xa07a4a).uvs(1, 1); for (let i = 0; i < 6; i++) { const y = -.08 + i * .035, w = .3 - i * .035; m.box(w, .025, .025, 0, y, -w / 2 + .012); m.box(w, .025, .025, 0, y, w / 2 - .012); m.box(.025, .025, w, -w / 2 + .012, y + .017, 0); m.box(.025, .025, w, w / 2 - .012, y + .017, 0); } bx(m, TX.wood, 0x6a4a2a, 10, .02, .26, .02, .1, -.02, 0); },
  ab_fumaca(m) { m.mat(TX.metal, 120).col(0x6a7078).uvs(1, 1).cyl(.06, .06, .18, 12, 0, -.09, 0, 3); m.mat(TX.white, 0).col(0xf0a020).cyl(.061, .061, .05, 12, 0, -.02, 0, 0); m.mat(TX.metal, 140).col(0x3a3d44).cyl(.025, .025, .04, 8, 0, .09, 0, 3); m.mat(TX.white, 0).col(0xd8d8d8).sph(.06, .04, .06, 8, 4, .04, .16, 0).sph(.05, .035, .05, 8, 4, -.03, .2, .02); },
  ab_lama(m) { m.mat(TX.mud, 0).col(0x8a5a34).uvs(1, 1).sph(.09, .08, .09, 10, 7, 0, 0, 0); m.mat(TX.mud, 0).col(0x6a4024).sph(.04, .03, .04, 6, 4, .06, .05, .03).sph(.03, .025, .03, 6, 4, -.05, .06, -.02); },
  ab_garrafada(m) { m.mat(TX.glass, 140, 0, 0).col(0x9ad8a0).uvs(1, 1).cyl(.045, .045, .14, 12, 0, -.09, 0, 3).cyl(.045, .016, .05, 12, 0, .05, 0, 0).cyl(.016, .016, .04, 8, 0, .1, 0, 3); m.mat(TX.cloth, 0).col(0xc8913e).cyl(.018, .018, .02, 8, 0, .14, 0, 3); m.mat(TX.white, 0).col(0xffffff).cyl(.046, .046, .06, 12, 0, -.06, 0, 0); m.mat(TX.white, 0).col(0xd8322a).box(.03, .012, .003, 0, -.03, -.047).box(.012, .03, .003, 0, -.03, -.047); },
  ab_mutirao(m) { bx(m, TX.wood, 0x7a5232, 10, .025, .5, .025, -.1, 0, 0); m.mat(TX.cloth, 0).col(0xffffff).uvs(1, 1).box(.24, .16, .01, .03, .15, 0); m.mat(TX.white, 0).col(0x3ac24a).box(.1, .03, .012, .03, .15, 0).box(.03, .1, .012, .03, .15, 0); m.mat(TX.cloth, 0).col(0x3ac24a).cyl(.12, .12, .02, 14, -.1, -.25, 0, 3); }
});
for (const F of Object.values(FARMERS)) for (const ab of F.ab) ITEMS['ab_' + ab.id] = { cat: 'Habilidades', name: ab.name, col: AB_COL[ab.id] || F.col, view: { ry: -.5, rx: .3 } };

/* ---------- acessórios dos fazendeiros (no quadro do tronco / da cabeça) ---------- */
function drawFarmerGear(m, f, wB, torsoH, thick) {
  if (f === 'peao') { m.mat(TX.cloth, 0).col(0xff7a3a).uvs(1, 1).box(.2, .06, .26, -(wB / 2 + .1), torsoH - .02, 0).box(.2, .06, .26, wB / 2 + .1, torsoH - .02, 0); m.mat(TX.metal, 80).col(0x8a5a2a).box(wB + .04, .06, thick + .04, 0, .14, 0); }
  else if (f === 'rastreador') { m.mat(TX.metal, 90).col(0x2a2d33).uvs(1, 1).cyl(.035, .035, .1, 8, -.05, torsoH * .62, -thick / 2 - .04, 3).cyl(.035, .035, .1, 8, .05, torsoH * .62, -thick / 2 - .04, 3); m.mat(TX.cloth, 0).col(0x3a9a5a).box(wB * .8, .08, thick + .04, 0, torsoH - .06, 0); }
  else if (f === 'guardiao') { m.mat(TX.metal, 160).col(0xffc61a).uvs(1, 1).cyl(.06, .06, .02, 5, -.12, torsoH * .66, -thick / 2 - .01, 1); m.mat(TX.cloth, 0).col(0x6a4a2a).box(.06, torsoH, thick + .03, wB * .25, torsoH * .5, 0); }
  else if (f === 'mateiro') { m.mat(TX.leaf, 0, 0, 0, 1).col(0x5ad08a).uvs(1, 1); for (let i = 0; i < 5; i++) { m.push().tr(-.2 + i * .1, torsoH * .7, thick / 2 + .03).rx(.4); m.dquad([-.06, 0, 0], [.06, 0, 0], [.04, -.25, .04], [-.04, -.25, .04]); m.pop(); } m.mat(TX.cloth, 0).col(0x3a7a3a).box(wB + .02, .08, thick + .02, 0, torsoH - .05, 0); }
  else if (f === 'socorrista') { m.mat(TX.white, 0).col(0xffffff).uvs(1, 1).box(.2, .1, .23, -(wB / 2 + .1), torsoH - .25, 0); m.mat(TX.white, 0).col(0xd8322a).box(.04, .08, .01, -(wB / 2 + .1), torsoH - .25, -.12).box(.08, .03, .01, -(wB / 2 + .1), torsoH - .25, -.12); m.mat(TX.cloth, 0).col(0xd8322a).box(wB * .6, .14, .1, 0, .2, -thick / 2 - .05); }
}
function drawFarmerHat(m, f, S) {
  if (S.hat || S.hood) return;
  if (f === 'peao') { m.mat(TX.cloth, 0).col(0xff7a3a).uvs(1, 1).box(.43, .07, .43, 0, .1, 0); m.box(.05, .12, .05, .18, .05, .2); }
  else if (f === 'rastreador') { m.mat(TX.cloth, 0).col(0x6a7a3a).uvs(1, 1).cyl(.33, .33, .03, 12, 0, .2, 0, 3).cyl(.23, .22, .12, 12, 0, .21, 0, 3); }
  else if (f === 'guardiao') { m.mat(TX.cloth, 0).col(0x7a4a22).uvs(1, 1).cyl(.42, .42, .03, 14, 0, .2, 0, 3).cyl(.22, .2, .18, 12, 0, .21, 0, 3); m.mat(TX.metal, 160).col(0xffc61a).box(.08, .08, .01, 0, .29, -.21); }
  else if (f === 'mateiro') { m.mat(TX.cloth, 0).col(0x3a7a3a).uvs(1, 1).box(.44, .14, .44, 0, .18, .02); m.mat(TX.leaf, 0, 0, 0, 1).col(0x7ad08a); m.dquad([-.1, .25, 0], [.06, .25, 0], [.12, .45, .05], [-.04, .42, 0]); }
  else if (f === 'socorrista') { m.mat(TX.cloth, 0).col(0xffffff).uvs(1, 1).box(.43, .11, .43, 0, .18, 0); m.mat(TX.white, 0).col(0xd8322a).box(.04, .09, .01, 0, .18, -.22).box(.09, .04, .01, 0, .18, -.22); }
}

/* ---------- entidades no mundo ---------- */
const AbFx = {
  birds: [], smokeAcc: {}, rings: [],
  /* lista normalizada (host: objetos da Sim · cliente: arrays do snapshot) */
  list() { return (G.abx || []).map(a => Array.isArray(a) ? { id: a[0], k: AB_BY_CODE[a[1]], x: a[2], y: a[3], z: a[4], t: a[5], team: a[6], r: a[7], ax: a[8], hp: a[9] } : a); },
  draw(m, t) {
    const myTeam = G.me ? G.me.team : 0, cam = G.cam;
    for (const e of this.list()) {
      if (Math.hypot(e.x - cam.x, e.z - cam.z) > 140) continue;
      if (e.k === 'sino') { m.push().tr(e.x, e.y + .25, e.z).sc(1.6).rz(Math.sin(t * 9) * (this.ring(e.id, t) ? .25 : 0)); drawGear(m, 'ab_sino'); m.pop(); }
      else if (e.k === 'arapuca') { if (e.team !== myTeam && !(G.spec && 0)) continue; m.push().tr(e.x, e.y + .1, e.z).sc(1.5); drawGear(m, 'ab_arapuca'); m.pop(); }
      else if (e.k === 'cerca') this.fence(m, e, t);
      else if (e.k === 'lama') { m.push().tr(e.x, e.y + .03, e.z); m.mat(TX.mud, 0).col(0x7a4a24).uvs(.4, .4).cyl(e.r, e.r * .96, .05, 20, 0, 0, 0, 1); m.mat(TX.mud, 0).col(0x5a361a); for (let i = 0; i < 7; i++) { const a = i * 2.4 + e.id, rr = e.r * (.3 + (i % 3) * .2), b = (Math.sin(t * 3 + i) + 1) * .5; m.sph(.12 * b + .03, .06 * b + .01, .12 * b + .03, 6, 3, Math.cos(a) * rr, .04, Math.sin(a) * rr); } m.pop(); }
      else if (e.k === 'mutirao') { m.push().tr(e.x, e.y + .04, e.z); m.mat(TX.white, 0, 0, 60).col(e.team === myTeam ? 0x5ad08a : 0xff8a6a); for (let i = 0; i < 28; i++) { const a = i / 28 * TAU + t * .4; m.push().tr(Math.cos(a) * e.r, 0, Math.sin(a) * e.r).ry(-a).box(.1, .04, e.r * TAU / 28 * .7).pop(); } m.pop(); m.push().tr(e.x, e.y, e.z).sc(2.4); drawGear(m, 'ab_mutirao'); m.pop(); }
    }
    for (const b of this.birds) { const k = b.t, x = b.x - Math.sin(b.yaw) * k * 22, z = b.z - Math.cos(b.yaw) * k * 22, y = b.y + Math.sin(k * 3) * 1.5 + k * 4; m.push().tr(x, y, z).ry(b.yaw).rz(Math.sin(t * 16) * .35).sc(5); drawGear(m, 'ab_gaviao'); m.pop(); }
  },
  ring(id, t) { const r = this.rings.find(q => q.id === id); return r && t - r.t < 1.2; },
  fence(m, e, t) {
    m.push().tr(e.x, e.y, e.z).ry(e.ax ? PI / 2 : 0); const hw = 2.25, fresh = clamp((18 - e.t) / .35, 0, 1), sy = .2 + .8 * fresh;
    m.push().sc(1, sy, 1);
    m.mat(TX.wood, 10).col(0x7a5232).uvs(1, 1); for (const x of [-hw, -hw / 3, hw / 3, hw]) m.box(.16, 2.2, .16, x, 1.1, 0);
    m.mat(TX.plank2, 0).col(e.hp < 120 ? 0x9a7a52 : 0xc8a070).uvs(.6, .6); for (const y of [.35, 1.0]) m.box(hw * 2, .22, .07, 0, y, .05);
    m.mat(TX.metal, 140).col(0xb8bcc4).uvs(1, 1); for (const y of [1.45, 1.8, 2.1]) { m.box(hw * 2, .025, .025, 0, y, -.04); for (let i = 0; i < 12; i++) m.box(.035, .07, .035, -hw + .2 + i * .36, y, -.04); }
    m.pop(); m.pop();
  },
  /* fumaça (partículas densas), bolhas, cura subindo, voo do gavião */
  step(dt, t) {
    for (const b of this.birds) b.t += dt; this.birds = this.birds.filter(b => b.t < 1.8);
    if (!G.fx) return; const q = QQ().parts * (settings.particles === undefined ? 1 : settings.particles);
    for (const e of this.list()) {
      if (e.k === 'fumaca') {
        const life = 13, age = life - e.t, grow = clamp(age / 1.2, .25, 1), fade = clamp(e.t / 1.4, 0, 1), rate = 34 * Math.max(.6, q);
        this.smokeAcc[e.id] = (this.smokeAcc[e.id] || 0) + dt * rate;
        while (this.smokeAcc[e.id] > 1) { this.smokeAcc[e.id]--; const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * e.r * .78 * grow, h = Math.random() * 3.2 * grow;
          G.fx.P({ x: e.x + Math.cos(a) * rr, y: e.y + .4 + h, z: e.z + Math.sin(a) * rr, vx: rnd(-.25, .25), vy: rnd(.02, .18), vz: rnd(-.25, .25), life: rnd(1.8, 2.6), s0: 1.6 * grow, s1: 2.9 * grow, r: .86, g: .88, b: .9, a0: .62 * fade, add: false, ty: 0, drag: .4 }); }
      } else if (e.k === 'mutirao' && Math.random() < dt * 10) { const a = Math.random() * TAU, rr = Math.random() * e.r; G.fx.P({ x: e.x + Math.cos(a) * rr, y: e.y + .2, z: e.z + Math.sin(a) * rr, vx: 0, vy: 1.2, vz: 0, life: 1, s0: .14, s1: .05, r: .4, g: 1, b: .5, a0: .9, add: true, ty: 2, drag: 0 }); }
    }
  },
  /* eventos da Sim */
  event(e) {
    const me = G.me, fx = G.fx, myId = G.myId;
    if (e.t === 'flash') {
      if (fx) { fx.P({ x: e.x, y: e.y + .3, z: e.z, vx: 0, vy: 0, vz: 0, life: .35, s0: 1, s1: 6, r: 1, g: .95, b: .8, a0: 1, add: true, ty: 1, drag: 0 }); for (let i = 0; i < 16; i++) fx.P({ x: e.x, y: e.y + .3, z: e.z, vx: rnd(-6, 6), vy: rnd(1, 7), vz: rnd(-6, 6), life: rnd(.4, .8), s0: .06, s1: .02, r: 1, g: rnd(.3, .9), b: .2, a0: 1, add: true, ty: 1, drag: .5, grav: 6 }); }
      if (sfx.explosion) sfx.explosion({ x: e.x, y: e.y, z: e.z }, false, false);
      const b = e.b && e.b[myId]; if (b) { G.blindT = Math.max(G.blindT || 0, b); G.blindMax = Math.max(b, G.blindT); }
    } else if (e.t === 'ab') {
      if (e.k === 'gaviao') { this.birds.push({ x: e.x, y: e.y, z: e.z, yaw: e.yaw, t: 0 }); sfx.ui && sfx.ui(1); if (me && e.p && G.ents.get(e.p) && G.ents.get(e.p).team === me.team) hud_toast(`🦅 Gavião: ${e.n | 0} inimigo(s) revelado(s)`); }
      else if (e.k === 'cerca' && fx) for (let i = 0; i < 10; i++) fx.chunk(e.x, e.y + .3, e.z, rnd(-2, 2), rnd(1, 3), rnd(-2, 2), .08, 0x8a6a44, 1, TX.wood);
      else if (e.k === 'fumaca') { if (sfx.bounce) sfx.bounce({ x: e.x, y: e.y, z: e.z }); }
    } else if (e.t === 'abx') {
      if (e.k === 'sino') { this.rings.push({ id: e.id, t: G.time }); if (this.rings.length > 20) this.rings.shift(); if (sfx.beep) sfx.beep({ x: e.x, y: e.y, z: e.z }, 1.6); }
      else if (e.k === 'arapuca') { if (fx) for (let i = 0; i < 8; i++) fx.chunk(e.x, e.y + .2, e.z, rnd(-1.5, 1.5), rnd(1, 3), rnd(-1.5, 1.5), .05, 0xa07a4a, .8, TX.wood); if (e.v === myId) hud_toast('Você caiu numa arapuca! Lento e revelado por 3 s.'); }
      else if (e.k === 'quebrou' && fx) for (let i = 0; i < 14; i++) fx.chunk(e.x, e.y + 1, e.z, rnd(-3, 3), rnd(1, 4), rnd(-3, 3), .1, 0x8a6a44, 1.2, TX.wood);
    } else if (e.t === 'abu') {
      if (e.p === myId) { AbilityHud.pulse(e.i); }
      if (e.k === 'investida' && fx) { const p = G.ents.get(e.p); if (p) for (let i = 0; i < 12; i++) fx.P({ x: p.x + rnd(-.4, .4), y: p.y + .1, z: p.z + rnd(-.4, .4), vx: rnd(-1, 1), vy: rnd(.3, 1.2), vz: rnd(-1, 1), life: rnd(.5, .9), s0: .3, s1: .9, r: .7, g: .58, b: .42, a0: .5, add: false, ty: 0, drag: .6 }); }
    } else if (e.t === 'far') {
      if (G.sim) { /* host: já está na Sim */ } else { const r = G.sb.get(e.p); if (r) r.farmer = e.f; }
      if (e.p === myId) { profile.farmer = e.f; saveProfile(); }
      FarmerPick.render();
    }
  }
};

/* ---------- HUD: habilidades, cegueira, revelados ---------- */
const AbilityHud = {
  key: '', pulses: [0, 0],
  pulse(i) { this.pulses[i] = 1; },
  render() {
    let el = $('abhud'); const me = G.me, tat = isTat() && me && me.alive && me.farmer && G.scene === 'play';
    if (!el) { el = document.createElement('div'); el.id = 'abhud'; $('hud').appendChild(el); }
    el.style.display = tat ? '' : 'none'; if (!tat) return;
    const F = FARMERS[me.farmer], key = me.farmer + (me.abC || []).join() + (me.abCd > 0 ? 1 : 0) + G.phase + keyName(bindOf('ab1')) + keyName(bindOf('ab2'));
    if (key !== this.key) {
      this.key = key;
      el.innerHTML = `<div class="ab-far" style="--fc:${F.col}"><b>${esc(F.name)}</b><small>${esc(F.role)}</small></div>` + F.ab.map((ab, i) => { const c = (me.abC || [])[i] | 0; return `<div class="ab-slot${c ? '' : ' off'}" data-i="${i}" style="--ac:${AB_COL[ab.id]}" title="${esc(ab.name + ' — ' + ab.desc)}">${Icons.img('ab_' + ab.id, 'sm', 'abi')}<kbd>${esc(keyName(bindOf(AB_KEYS[i] || 'ab1')))}</kbd><span class="ab-c">${'●'.repeat(c)}${'○'.repeat(Math.max(0, ab.max - c))}</span></div>`; }).join('');
      Icons.fill(el);
    }
    for (let i = 0; i < 2; i++) if (this.pulses[i] > 0) { this.pulses[i] -= .05; const s = el.querySelector(`.ab-slot[data-i="${i}"]`); if (s) s.style.transform = `scale(${1 + this.pulses[i] * .18})`; }
    /* cegueira do rojão */
    let bl = $('blind'); if (!bl) { bl = document.createElement('div'); bl.id = 'blind'; $('hud').appendChild(bl); }
    const b = G.blindT || 0; bl.style.opacity = b > 0 ? Math.min(1, b / Math.max(.5, (G.blindMax || 1) * .55)).toFixed(3) : 0;
  },
  tick(dt) { if (G.blindT > 0) G.blindT = Math.max(0, G.blindT - dt); this.render(); }
};
/* marcadores de inimigos revelados (gavião, sino, arapuca) — desenhados no canvas de etiquetas */
function drawRevealed(c, VP, W, H) {
  if (!G.me) return; const t = G.time;
  for (const e of G.ents.values()) {
    if (!e.alive || !e.rev || e.team === G.me.team) continue; const p = project(VP, e.x, e.y + 1.2, e.z, W, H); if (!p) continue;
    const s = 11 + Math.sin(t * 8) * 2; c.save(); c.translate(p[0], p[1]); c.rotate(PI / 4); c.globalAlpha = .9; c.fillStyle = '#ff3a2acc'; c.strokeStyle = '#fff'; c.lineWidth = 2; c.fillRect(-s / 2, -s / 2, s, s); c.strokeRect(-s / 2, -s / 2, s, s); c.restore();
  }
  c.globalAlpha = 1;
}

/* ---------- tela de escolha do fazendeiro ---------- */
const FarmerPick = {
  open: false, sel: '',
  can() { return false; },   /* a escolha agora acontece na tela de SELEÇÃO DE AGENTES (591_flowui.js) */
  toggle(force) {
    const on = force === undefined ? !this.open : force; if (on && !this.can()) { if (isTat()) hud_toast('O agente é escolhido na tela de seleção, antes da partida.'); return; }
    this.open = on; let el = $('farmpick'); if (!el) { el = document.createElement('div'); el.id = 'farmpick'; $('hud').appendChild(el); el.onclick = e => this.click(e); }
    el.classList.toggle('hidden', !on); Input.menu = on || Shop.open || Bag.open || BigMap.open;
    if (on) { try { document.exitPointerLock(); } catch (e) { } this.sel = (G.me && G.me.farmer) || profile.farmer || 'peao'; this.render(true); } else if (G.scene === 'play' && !Input.menu) lockPointer();
  },
  portrait(f) {
    const sk = G.me && G.me.skin !== undefined ? G.me.skin | 0 : profile.skin | 0, k = 'farm|' + f + '|' + sk; if (Icons.url.has(k)) return Icons.url.get(k); if (!Icons.ok()) return '';
    let c = null; try { c = G.R.renderIcon(m => drawChar(m, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, skin: sk, wid: f === 'rastreador' ? 'vassoura' : f === 'peao' ? 'porteira' : f === 'guardiao' ? 'galho' : f === 'mateiro' ? 'colher' : 'estilingue', farmer: f, spd: 0 }), { w: 260, h: 300, ry: PI - .45, rx: .08, ss: 1.5, pad: 1.05 }); } catch (e) { }
    const u = c ? c.toDataURL('image/png') : ''; Icons.url.set(k, u); return u;
  },
  takenBy(f) { /* nome do aliado que já escolheu */
    const me = G.me; if (!me) return ''; for (const r of getRoster()) if (!r.isMe && r.team === me.team && r.farmer === f) return r.name; return '';
  },
  render(full) {
    const el = $('farmpick'); if (!el || !this.open) return; const me = G.me; if (!me) return; if (!this.can()) { this.toggle(false); return; }
    const key = FARMER_IDS.map(f => this.takenBy(f)).join() + me.farmer + this.sel; if (!full && key === this.key) { const tm = el.querySelector('.fp-tm'); if (tm) tm.textContent = Math.ceil(G.pt || 0); return; } this.key = key;
    el.className = 'farmpick';
    el.innerHTML = `<div class="fp-top"><div class="fp-ttl"><b class="fnt">ESCOLHA SEU FAZENDEIRO</b><small>Cada fazendeiro tem duas habilidades próprias. Não pode repetir na equipe.</small></div><div class="fp-tm">${Math.ceil(G.pt || 0)}</div></div>
      <div class="fp-cards">${FARMER_IDS.map(f => { const F = FARMERS[f], by = this.takenBy(f), mine = me.farmer === f;
        return `<div class="fp-card${this.sel === f ? ' sel' : ''}${mine ? ' mine' : ''}${by ? ' taken' : ''}" data-f="${f}" style="--fc:${F.col}">
          <div class="fp-img"><img src="${this.portrait(f)}" alt=""></div><div class="fp-name fnt">${esc(F.name.toUpperCase())}</div><div class="fp-role">${esc(F.role)}</div><p>${esc(F.desc)}</p>
          <div class="fp-abs">${F.ab.map((ab, i) => `<div class="fp-ab" title="${esc(ab.desc)}">${Icons.img('ab_' + ab.id, 'sm', 'fpi')}<span>${esc(ab.name)}</span><kbd>${esc(keyName(bindOf(AB_KEYS[i] || 'ab1')))}</kbd></div>`).join('')}</div>
          ${by ? `<div class="fp-by">${esc(by)}${/bot/i.test(by) ? '' : ''}</div>` : ''}${mine ? '<div class="fp-me">SEU</div>' : ''}</div>`; }).join('')}</div>
      <div class="fp-det">${this.detail()}</div>
      <div class="fp-foot"><span>ℹ️ Escolha sabiamente — a estratégia começa agora. Se um bot estiver com o fazendeiro, ele troca com você.</span><button class="fp-ok" data-ok="1">✔ CONFIRMAR ESCOLHA</button></div>`;
    Icons.fill(el);
  },
  detail() { const F = FARMERS[this.sel]; if (!F) return ''; return F.ab.map((ab, i) => `<div><b>${esc(keyName(bindOf(i ? 'ab2' : 'ab1')))} · ${esc(ab.name)}</b> — ${esc(ab.desc)} <em>${ab.free ? ab.free + ' grátis por rodada' : 'só comprando'}${ab.price ? ' · extra $' + ab.price : ''} · máx. ${ab.max}</em></div>`).join(''); },
  click(e) {
    const c = e.target.closest('[data-f]'); if (c) { this.sel = c.dataset.f; sfx.ui(0); this.render(true); return; }
    if (e.target.closest('[data-ok]')) { const by = this.takenBy(this.sel); if (by && G.sb && !/bot/i.test('') && this.isHumanTaken(this.sel)) { hud_toast(FARMERS[this.sel].name + ' já é de ' + by + '.'); return; } Input.acts.push('far:' + this.sel); profile.farmer = this.sel; saveProfile(); sfx.ui(1); setTimeout(() => this.toggle(false), 150); }
  },
  isHumanTaken(f) { const me = G.me; for (const r of getRoster()) if (!r.isMe && r.team === me.team && r.farmer === f && !r.bot) return true; return false; }
};
