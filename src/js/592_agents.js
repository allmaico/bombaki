/* =====================================================================
   592_agents.js — AGENTES (cliente): modelos das habilidades novas, efeitos
   no mundo, Espigas Douradas, HUD com 4 espaços (Z · X · C assinatura ·
   F suprema com pontos), anúncio de suprema, tela de "preso", reviver.
   ===================================================================== */
'use strict';
Object.assign(AB_COL, { pulo: '#ff9a3a', festa: '#ff3a6a', espiao: '#8ad04a', galinha: '#f4eee0', olho: '#4ac24a', territorio: '#ffb81a', nuvem: '#c8a0e8', insetos: '#6a4a8a', reforco: '#e8c860', reanima: '#ffe27a' });
const AB_KEYS = ['ab1', 'ab2', 'ab3', 'ult'];
/* ---------- modelos (mesmo modelo no mundo, no HUD e na seleção) ---------- */
Object.assign(GEAR, {
  ab_pulo(m) { /* chicote enrolado com cabo */ bx(m, TX.wood, 0x6a4422, 10, .05, .2, .05, 0, -.12, 0); m.mat(TX.cloth, 0).col(0x8a5a2a).uvs(1, 1); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; m.push().tr(Math.cos(a) * .12, .02 + k * .006, Math.sin(a) * .12).ry(-a); m.box(.03, .025, .07); m.pop(); } m.mat(TX.white, 0, 0, 120).col(0xffd84a).box(.05, .03, .05, 0, -.23, 0); },
  ab_festa(m) { /* feixe de rojões com fita */ for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, x = Math.cos(a) * .05, z = Math.sin(a) * .05; m.mat(TX.cloth, 20).col([0xd8352a, 0xffc61a, 0x3a8ad8, 0x5ad08a, 0xff7ad0][k]).uvs(1, 1).cyl(.028, .028, .24, 8, x, -.12, z, 3); m.mat(TX.white, 0).col(0x3a2a1a).cyl(.004, .004, .06, 4, x, .12, z, 0); } m.mat(TX.cloth, 0).col(0xffe27a).cyl(.085, .085, .04, 12, 0, -.02, 0, 0); },
  ab_espiao(m) { /* dardo de capim com pena */ m.mat(TX.wood, 10).col(0x8a6a3a).uvs(1, 1).cyl(.012, .012, .34, 6, 0, -.17, 0, 3); m.mat(TX.metal, 140).col(0x9aa0a8).cyl(.02, .002, .07, 6, 0, -.24, 0, 3); m.mat(TX.leaf, 0, 0, 0, 1).col(0x8ad04a); for (let k = 0; k < 3; k++) { m.push().ry(k * 2.1); m.dquad([0, .1, 0], [.07, .14, 0], [.06, .2, 0], [0, .17, 0]); m.pop(); } m.mat(TX.white, 0, 0, 200).col(0xc8ff5a).sph(.025, .025, .025, 6, 4, 0, .02, 0); },
  ab_galinha(m) { m.push().sc(1.25).tr(0, -.2, 0); drawChicken(m, { x: 0, y: 0, z: 0, yaw: 0, ph: 0, col: 0xf6f1e6 }); m.pop(); },
  ab_olho(m) { /* amuleto com olho */ m.mat(TX.metal, 140).col(0xd8a838).uvs(1, 1).cyl(.14, .14, .03, 18, 0, 0, 0, 3); m.mat(TX.white, 0).col(0xf4f0e0).sph(.1, .06, .02, 12, 6, 0, 0, -.02); m.mat(TX.white, 0, 0, 160).col(0x4ac24a).sph(.045, .045, .02, 10, 6, 0, 0, -.035); m.mat(TX.white, 0).col(0x111111).sph(.02, .02, .01, 8, 4, 0, 0, -.045); },
  ab_territorio(m) { /* placa "PROPRIEDADE PARTICULAR" */ bx(m, TX.wood, 0x6a4422, 10, .06, .62, .06, 0, -.05, 0); m.mat(TX.plank2, 0).col(0xe8d8a8).uvs(.5, .5).box(.42, .22, .03, 0, .2, -.04); m.mat(TX.white, 0).col(0xd8322a).box(.36, .04, .005, 0, .25, -.057).box(.3, .03, .005, 0, .17, -.057); m.mat(TX.metal, 160).col(0xffc61a).box(.06, .06, .01, 0, .33, -.045); },
  ab_nuvem(m) { /* lata roxa com nuvem */ m.mat(TX.metal, 120).col(0x8a5ab0).uvs(1, 1).cyl(.055, .055, .2, 12, 0, -.1, 0, 3); m.mat(TX.white, 0).col(0xf0e0ff).cyl(.056, .056, .05, 12, 0, -.02, 0, 0); m.mat(TX.white, 0).col(0xe8dcf4); for (const [x, y, s] of [[-.05, .12, .06], [.03, .14, .07], [.08, .11, .05]]) m.sph(s, s * .8, s, 8, 5, x, y, 0); },
  ab_insetos(m) { /* pote com insetos */ m.mat(TX.glass, 140).col(0xb8d8c8, 170).uvs(1, 1).cyl(.08, .08, .18, 12, 0, -.09, 0, 3); m.mat(TX.metal, 100).col(0x8a6a3a).cyl(.085, .085, .04, 12, 0, .09, 0, 3); m.mat(TX.white, 0).col(0x2a1a2a); for (let k = 0; k < 9; k++) m.box(.02, .012, .03, Math.cos(k * 2.3) * .05, -.06 + k * .015, Math.sin(k * 2.3) * .05); },
  ab_reforco(m) { /* colete de palha */ m.mat(TX.hay, 0).col(0xe8c860).uvs(1.5, 1.5).box(.32, .34, .1, 0, 0, 0); m.mat(TX.cloth, 0).col(0x8a5a2a).box(.33, .04, .11, 0, -.06, 0).box(.33, .04, .11, 0, .08, 0); m.mat(TX.white, 0, 0, 160).col(0x3ac8c0).box(.06, .06, .02, -.08, .02, -.06); },
  ab_reanima(m) { /* vela com chama */ m.mat(TX.white, 0).col(0xf4ead0).uvs(1, 1).cyl(.04, .04, .24, 10, 0, -.14, 0, 3); m.mat(TX.metal, 120).col(0xc89a38).cyl(.08, .07, .03, 12, 0, -.16, 0, 3); m.mat(TX.white, 0, 0, 255).col(0xffd84a).sph(.03, .06, .03, 8, 6, 0, .14, 0); }
});
for (const F of Object.values(FARMERS)) for (const ab of F.ab) { const it = ITEMS['ab_' + ab.id]; if (it) it.col = AB_COL[ab.id] || F.col; }
/* ---------- desenho e partículas no mundo ---------- */
(function () {
  const draw0 = AbFx.draw.bind(AbFx), step0 = AbFx.step.bind(AbFx), ev0 = AbFx.event.bind(AbFx);
  AbFx.draw = function (m, t) {
    draw0(m, t); const myTeam = G.me ? G.me.team : 0, cam = G.cam, R = G.R;
    for (const e of this.list()) {
      if (Math.hypot(e.x - cam.x, e.z - cam.z) > 140) continue;
      if (e.k === 'festa') { /* círculo de aviso pulsando + rojões caindo */
        const pul = .5 + .5 * Math.sin(t * 12); for (let i = 0; i < 32; i++) { const a = i / 32 * TAU, b2 = (i + 1) / 32 * TAU; R.pushBeam(e.x + Math.cos(a) * e.r, e.y + .1, e.z + Math.sin(a) * e.r, .12, e.x + Math.cos(b2) * e.r, e.y + .1, e.z + Math.sin(b2) * e.r, .6 + pul * .4, 1, .25, .3); }
        for (let k = 0; k < 3; k++) { const ph = (t * 1.7 + k / 3) % 1, a = k * 2.1 + Math.floor(t * 1.7 + k / 3) * 1.3, x = e.x + Math.cos(a) * e.r * .5, z = e.z + Math.sin(a) * e.r * .5, y = e.y + 30 * (1 - ph); R.pushBeam(x, y, z, .12, x, y + 3, z, .9, 1, .8, .3); }
      } else if (e.k === 'espiao') { m.push().tr(e.x, e.y + .25, e.z).rx(.35); drawGear(m, 'ab_espiao'); m.pop(); }
      else if (e.k === 'galinha') { const ph = t * 22; drawChicken(m, { x: e.x, y: e.y, z: e.z, yaw: (e.ax || 0) / 100 + Math.PI, ph, col: 0xf6f1e6 }); }
      else if (e.k === 'territorio') {
        m.push().tr(e.x, e.y + .45, e.z).sc(1.7); drawGear(m, 'ab_territorio'); m.pop();
        const armed = e.t <= 5.3, col = armed ? [1, .25, .2] : [1, .8, .2], pul = .5 + .5 * Math.sin(t * (armed ? 6 : 14));
        for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, b2 = (i + 1) / 48 * TAU; R.pushBeam(e.x + Math.cos(a) * e.r, e.y + .15, e.z + Math.sin(a) * e.r, .14, e.x + Math.cos(b2) * e.r, e.y + .15, e.z + Math.sin(b2) * e.r, .35 + pul * .4, col[0], col[1], col[2]); }
      }
    }
    /* Espigas Douradas */
    const orbs = G.sim ? (G.sim.orbs || []).filter(o => !o.taken) : (G.orbs || []).map(a => ({ id: a[0], x: a[1], y: a[2], z: a[3] }));
    for (const o of orbs) { if (Math.hypot(o.x - cam.x, o.z - cam.z) > 120) continue; const y = o.y + .9 + Math.sin(t * 2 + o.id) * .12;
      m.push().tr(o.x, y, o.z).ry(t * 1.6).rz(.3).sc(1.6); m.mat(TX.white, 0, 0, 220).col(0xffd23a).uvs(1, 1).cyl(.09, .06, .36, 10, 0, -.18, 0, 3); m.mat(TX.leaf, 0, 0, 0, 1).col(0x8ad04a); for (let k = 0; k < 3; k++) { m.push().ry(k * 2.1).rx(-.3); m.dquad([0, -.18, 0], [.06, -.1, 0], [.04, .1, .02], [0, .05, 0]); m.pop(); } m.pop();
      R.pushBeam(o.x, o.y + .05, o.z, .5, o.x, o.y + 2.6, o.z, .22 + .08 * Math.sin(t * 4), 1, .82, .2); }
  };
  AbFx.step = function (dt, t) {
    step0(dt, t); if (!G.fx) return; const fx = G.fx, q = QQ().parts * (settings.particles === undefined ? 1 : settings.particles);
    for (const e of this.list()) {
      if (e.k === 'insetos') { /* enxame escuro e denso (também tapa a visão) */
        this.smokeAcc[e.id] = (this.smokeAcc[e.id] || 0) + dt * 40 * Math.max(.6, q); const fade = clamp(e.t / 1.2, 0, 1), grow = clamp((12 - e.t) / 1, .3, 1);
        while (this.smokeAcc[e.id] > 1) { this.smokeAcc[e.id]--; const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * e.r * .85 * grow, h = Math.random() * 4.2 * grow;
          fx.P({ x: e.x + Math.cos(a) * rr, y: e.y + .3 + h, z: e.z + Math.sin(a) * rr, vx: rnd(-.6, .6), vy: rnd(-.1, .2), vz: rnd(-.6, .6), life: rnd(1.6, 2.4), s0: 1.7 * grow, s1: 2.8 * grow, r: .2, g: .16, b: .24, a0: .7 * fade, add: false, ty: 0, drag: .5 });
          if (Math.random() < .5) fx.P({ x: e.x + Math.cos(a) * rr, y: e.y + .5 + h, z: e.z + Math.sin(a) * rr, vx: rnd(-3, 3), vy: rnd(-1, 1), vz: rnd(-3, 3), life: rnd(.4, .8), s0: .06, s1: .05, r: .05, g: .04, b: .05, a0: .95, add: false, ty: 5, drag: .1 }); }
        if (G.me && Math.hypot(G.cam.x - e.x, G.cam.z - e.z) < e.r && Math.random() < dt * 3 && sfx.ctx) sfx.funny && sfx.buzz && sfx.buzz();
      } else if (e.k === 'galinha' && Math.random() < dt * 12) fx.P({ x: e.x, y: e.y + .3, z: e.z, vx: rnd(-.5, .5), vy: rnd(.3, 1), vz: rnd(-.5, .5), life: .8, s0: .1, s1: .07, r: 1, g: .97, b: .92, a0: .9, add: false, ty: 4, drag: 2, grav: -1 });
    }
  };
  AbFx.event = function (e) {
    ev0(e); const fx = G.fx, me = G.me, myId = G.myId, ally = id => { const en = G.ents.get(id); return !!(me && en && en.team === me.team); }, pos = { x: e.x, y: e.y, z: e.z };
    if (e.t === 'ab' && e.k === 'pulo') { if (fx) fx.dust(e.x, e.y, e.z, 10, 1.4); sfx.whip && sfx.whip(e.p === myId ? null : pos); }
    else if (e.t === 'abx') {
      if (e.k === 'festa' && fx) { fx.explosion(e.x, e.y + .4, e.z, 3, false); for (let i = 0; i < 26; i++) { const c = [[1, .3, .4], [1, .85, .2], [.3, .6, 1], [.4, 1, .5]][i % 4]; fx.P({ x: e.x, y: e.y + 1.4, z: e.z, vx: rnd(-7, 7), vy: rnd(3, 10), vz: rnd(-7, 7), life: rnd(.6, 1.2), s0: .12, s1: .04, r: c[0], g: c[1], b: c[2], a0: 1, add: true, ty: 2, drag: .6, grav: -9 }); } sfx.explosion && sfx.explosion(pos, false, false); }
      else if (e.k === 'espiao') { if (fx) for (let i = 0; i < 3; i++) fx.P({ x: e.x, y: e.y + .2, z: e.z, vx: 0, vy: 0, vz: 0, life: .9 + i * .15, s0: .5, s1: 14 * (1 - i * .2), r: .6, g: 1, b: .3, a0: .5, add: true, ty: 3, drag: 0, rot: 0 }); sfx.beep && sfx.beep(pos, 1.2); if (me && ally(e.p || '') && e.n) hud_toast(`🌾 Espião do Mato: ${e.n} inimigo(s) à vista`); }
      else if (e.k === 'galinha') { if (fx) fx.poof(e.x, e.y, e.z, true); sfx.funny && sfx.funny('dizzy', pos); }
      else if (e.k === 'olho') { if (me && ally(e.p)) { if (!this.olhoT || G.time - this.olhoT > 3) { this.olhoT = G.time; G.hud && G.hud.banner('OLHO DA ROÇA', `${e.n | 0} inimigo(s) revelado(s) no mapa inteiro`, '#7ee06a'); } sfx.beep && sfx.beep(null, 2); } }
      else if (e.k === 'territorio') { if (fx) fx.explosion(e.x, e.y + .5, e.z, 2, false); sfx.barrier && sfx.barrier(true); if (e.v && e.v.includes(myId)) hud_toast('🚫 PRESO NO TERRITÓRIO DO PATRÃO! (5 s sem atirar, lento)'); }
      else if (e.k === 'reforco') { if (fx) for (let i = 0; i < 14; i++) fx.P({ x: e.x + rnd(-.4, .4), y: e.y + rnd(.2, 1.8), z: e.z + rnd(-.4, .4), vx: rnd(-.5, .5), vy: rnd(.5, 1.5), vz: rnd(-.5, .5), life: .9, s0: .14, s1: .04, r: 1, g: .86, b: .35, a0: 1, add: true, ty: 2, drag: 1 }); if (e.v === myId) hud_toast('🛡️ Reforço do Sítio: +50 de escudo'); }
    } else if (e.t === 'rev') {
      if (fx) { fx.P({ x: e.x, y: e.y + 1, z: e.z, vx: 0, vy: 0, vz: 0, life: 1, s0: 1, s1: 4, r: 1, g: .9, b: .5, a0: .9, add: true, ty: 1, drag: 0 }); for (let i = 0; i < 24; i++) fx.P({ x: e.x + rnd(-.5, .5), y: e.y + rnd(0, .5), z: e.z + rnd(-.5, .5), vx: 0, vy: rnd(2, 5), vz: 0, life: rnd(.8, 1.4), s0: .15, s1: .05, r: 1, g: .9, b: .5, a0: 1, add: true, ty: 2, drag: .5 }); }
      const en = G.ents.get(e.p); if (en) { en.deadT = 0; en.dv = 0; }
      if (e.p === myId) { G.spec = false; G.specId = ''; G.syncView = true; if (G.vm) G.vm.hideWeapon = false; G.hud && G.hud.banner('SIMPATIA DA LUA!', 'Seu Mineiro te levantou — volte pro jogo!', '#ffe27a'); }
      sfx.roundStart && sfx.roundStart();
    } else if (e.t === 'orb') { if (fx) for (let i = 0; i < 18; i++) fx.P({ x: e.x, y: e.y + .9, z: e.z, vx: rnd(-3, 3), vy: rnd(1, 4), vz: rnd(-3, 3), life: rnd(.5, 1), s0: .12, s1: .03, r: 1, g: .85, b: .2, a0: 1, add: true, ty: 2, drag: 1, grav: -4 }); if (e.p === myId) { hud_toast('🌽 Espiga Dourada: +1 ponto de suprema'); sfx.ui && sfx.ui(1); } }
    else if (e.t === 'ultok') { if (e.p === myId) { const F = me && FARMERS[me.farmer]; hud_toast(`⭐ SUPREMA PRONTA: ${F ? F.ab[3].name : ''} (${keyName(bindOf('ult'))})`); sfx.headshot && sfx.headshot(); AbilityHud.pulse(3); } }
    else if (e.t === 'sig') { if (e.p === myId) AbilityHud.pulse(2); }
    else if (e.t === 'abu') {
      const F = G.ents.get(e.p) && FARMERS[(G.sim ? (G.sim.get(e.p) || {}).farmer : (G.sb.get(e.p) || {}).farmer) || ''], ab = F && F.ab.find(a => a.id === e.k);
      if (ab && ab.ult && G.hud) { const al = ally(e.p); G.hud.banner(ab.name.toUpperCase() + '!', (al ? 'Suprema do seu time' : 'SUPREMA INIMIGA — cuidado!') + ' · ' + ownerName(e.p), al ? '#7ee06a' : '#ff7a6a'); }
    }
  };
})();
/* ---------- HUD: 4 espaços (Z · X · C · F) ---------- */
/** @type {any} */ (AbilityHud).pulses = [0, 0, 0, 0];
AbilityHud.render = function () {
  let el = $('abhud'); const me = G.me, tat = isTat() && me && me.alive && me.farmer && G.scene === 'play';
  if (!el) { el = document.createElement('div'); el.id = 'abhud'; $('hud').appendChild(el); }
  el.style.display = tat ? '' : 'none';
  let pr = $('detain'); if (!pr) { pr = document.createElement('div'); pr.id = 'detain'; pr.innerHTML = '<b>PRESO NO TERRITÓRIO DO PATRÃO</b><small>sem atirar · lento</small>'; $('hud').appendChild(pr); }
  pr.style.display = tat && me.detainT > 0 ? '' : 'none';
  let bl = $('blind'); if (!bl) { bl = document.createElement('div'); bl.id = 'blind'; $('hud').appendChild(bl); }
  const b = G.blindT || 0; bl.style.opacity = String(b > 0 ? Math.min(1, b / Math.max(.5, (G.blindMax || 1) * .55)).toFixed(3) : 0);
  if (!tat) return;
  const F = FARMERS[me.farmer], ult = me.ult | 0, cost = F.ab[3].cost, sg = Math.ceil(me.sigT || 0);
  const key = me.farmer + (me.abC || []).join() + (me.abCd > 0 ? 1 : 0) + G.phase + AB_KEYS.map(k => bindOf(k)).join() + ult + ':' + sg + ':' + (me.shield | 0);
  if (key !== this.key) {
    this.key = key;
    el.innerHTML = `<div class="ab-far" style="--fc:${F.col}"><b>${esc(F.name)}</b><small>${esc(F.role)}${me.shield > 0 ? ` · 🛡️ ${me.shield | 0}` : ''}</small></div>` + F.ab.map((ab, i) => {
      if (ab.ult) { const ready = ult >= cost; return `<div class="ab-slot ult${ready ? ' rdy' : ' off'}" data-i="3" style="--ac:${AB_COL[ab.id] || F.col}" title="${esc(ab.name + ' — ' + ab.desc)}">${Icons.img('ab_' + ab.id, 'sm', 'abi')}<kbd>${esc(keyName(bindOf('ult')))}</kbd><span class="ab-c">${'◆'.repeat(Math.min(ult, cost))}${'◇'.repeat(Math.max(0, cost - ult))}</span></div>`; }
      const c = (me.abC || [])[i] | 0, rec = ab.sig && c < ab.max && sg > 0 && G.phase === 'live';
      return `<div class="ab-slot${c ? '' : ' off'}${c && me.abCd > 0 ? ' cd' : ''}${ab.sig ? ' sig' : ''}" data-i="${i}" style="--ac:${AB_COL[ab.id] || F.col}" title="${esc(ab.name + ' — ' + ab.desc)}">${Icons.img('ab_' + ab.id, 'sm', 'abi')}<kbd>${esc(keyName(bindOf(AB_KEYS[i])))}</kbd>${rec ? `<i class="ab-sw" style="--p:${(Math.min(1, (me.sigT || 0) / (ab.cd || 30)) * 100).toFixed(1)}%"></i><i class="ab-rc">${sg}</i>` : ''}<span class="ab-c">${'●'.repeat(c)}${'○'.repeat(Math.max(0, ab.max - c))}</span></div>`; }).join('');
    Icons.fill(el);
  }
  const PULSES = /** @type {any} */ (AbilityHud).pulses;
  for (let i = 0; i < 4; i++) if (PULSES[i] > 0) { PULSES[i] = Math.max(0, PULSES[i] - .05); const s = el.querySelector(`.ab-slot[data-i="${i}"]`); if (s) { s.style.transform = PULSES[i] ? `scale(${1 + PULSES[i] * .18})` : ''; s.classList.toggle('sel', PULSES[i] > 0); } }
  const sw = el.querySelector('.ab-sw'); if (sw) { const sab = F.ab.find(a => a.sig); if (sab) sw.style.setProperty('--p', (Math.min(1, (me.sigT || 0) / (sab.cd || 30)) * 100).toFixed(1) + '%'); }
};
