/* =====================================================================
   53_viewmodel.js — arma em primeira pessoa (espaço da câmera, −Z à frente)
   Balanço/bob, mira (ADS), recuo por mola, corrida, deslize, pulo/queda,
   troca de arma, recargas por tipo (carregador, ferrolho, estilingue),
   facadas, arremesso, plantar/desarmar, braços/mãos e clarão do disparo.
   P = jogador (formato do Sim): {w, ads, equipT, relT, relMax, cdT, throwT,
   windT, useT, useMax, useK, mag{}, own{}, m:{hspd,gnd,cr,sliding,sprinting,vy,stepD}}
   ===================================================================== */
'use strict';
const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
const rotX = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
const rotZ = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
const S01 = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const sgm = (u, a, b) => S01((u - a) / (b - a));
const L3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const A3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const shade = (c, k) => ((((c >> 16) & 255) * k | 0) << 16) | ((((c >> 8) & 255) * k | 0) << 8) | (((c & 255) * k) | 0);
/* posição de quadril (câmera) de cada arma */
const VM_HIP = { galho: [.23, -.235, -.5], estilingue: [.2, -.14, -.6], vassoura: [.23, -.245, -.56], colher: [.22, -.215, -.47], porteira: [.23, -.24, -.5], faca: [.2, -.2, -.46], batata: [.17, -.17, -.46], mandioca: [.06, -.2, -.55] };
/* pistolas (Trezoitão, Tijolinho): mais perto e no centro, empunhadura com as duas mãos */
const VM_PIST = { hip: [.12, -.075, -.43], ads: [0, -.03, -.37] };
const VM_MAGOUT = { galho: [0, -.3, .06], colher: [0, -.28, .06] };

class ViewModel {
  constructor() {
    this.t = 0; this.adsK = 0; this.sprintK = 0; this.slideK = 0; this.landK = 0; this.bobA = 0; this.jumpK = 0; this.swayX = 0; this.swayY = 0; this.swayVx = 0; this.swayVy = 0;
    this.k = [0, 0, 0, 0, 0, 0]; this.kv = [0, 0, 0, 0, 0, 0]; /* mola do recuo: z, rx, ry, rz, x, y */
    this.w = ''; this.prevW = ''; this.drawW = ''; this.eq = 0; this.lower = 0; this.flash = 0; this.flashSeed = 0; this.swing = null;
    this.relU = 0; this.prevV = 0; this.relEmpty = false; this.relMag0 = 0; this.relCap = 0; this.dropReq = false; this.useK = 0; this.useKind = ''; this.throwAnim = 0; this.prevYaw = null; this.prevPitch = 0;
    this.drops = []; this.muz = [0, 0, -1]; this.hideWeapon = false; this.onCue = null; this.shotT = 9;
  }
  cue(n, k) { if (this.onCue) this.onCue(n, k); }
  /* ---------- eventos vindos do controlador ---------- */
  fire(wid, ads) {
    const a = ads ? 0.5 : 1, kz = { galho: .03, estilingue: .018, vassoura: .1, colher: .02, porteira: .085 }[wid] || .025, kr = { galho: .04, estilingue: .05, vassoura: .15, colher: .028, porteira: .14 }[wid] || .035;
    this.kv[0] += kz * 15 * a; this.kv[1] += kr * 13 * a; this.kv[2] += (Math.random() - .5) * kr * 5 * a; this.kv[3] += (Math.random() - .5) * kr * 7 * a; this.kv[5] += kz * 3 * a; this.kv[4] += (Math.random() - .5) * kz * 3 * a;
    this.flash = wid === 'estilingue' ? 0 : (wid === 'vassoura' ? .09 : .055); this.flashSeed = Math.random() * 100; this.shotT = 0;
  }
  meleeStart(kind) { this.swing = { kind, t: 0 }; }
  land(v) { const k = clamp(v / 14, .2, 1); this.landK = Math.max(this.landK, k); this.kv[5] -= .25 * k; }
  /* ---------- atualização ---------- */
  update(dt, P, camYaw, camPitch) {
    dt = Math.min(dt, .05); this.t += dt; this.shotT += dt;
    const m = P.m, w = P.w, W = WEAPONS[w] || WEAPONS.faca;
    if (this.w !== w) { this.prevW = this.w; this.w = w; this.swing = null; this.dropReq = false; }
    const eqMax = Math.max(.2, W.equip || .4), eq = P.equipT > 0 ? sat(P.equipT / eqMax) : 0; this.eq = eq;
    if (this.prevW && WEAPONS[this.prevW] && this.prevW !== w && eq > .6) { this.drawW = this.prevW; this.lower = 1 - sat((eq - .6) / .4); }
    else { this.drawW = w; this.lower = this.prevW ? eq / .6 : eq; if (this.lower > 1) this.lower = 1; }
    const gun = isGun(w), busy = !!(P.useK === 'plant' || P.useK === 'defuse');
    if (busy) this.useKind = P.useK;
    const adsT = (P.ads && gun && P.relT <= 0 && P.equipT <= 0 && !busy) ? 1 : 0;
    const sprinting = !!m.sprinting && (m.hspd || 0) > 4.6 && m.gnd && !P.ads;
    this.adsK = damp(this.adsK, adsT, adsT ? 14 : 12, dt); this.sprintK = damp(this.sprintK, sprinting ? 1 : 0, 9, dt); this.slideK = damp(this.slideK, m.sliding ? 1 : 0, 12, dt);
    this.useK = damp(this.useK, busy ? 1 : 0, 9, dt);
    this.bobA = damp(this.bobA, m.gnd ? clamp((m.hspd || 0) / PH.RUN, 0, 1.2) * (m.cr > .5 ? .55 : 1) : 0, 8, dt);
    this.jumpK = damp(this.jumpK, m.gnd ? 0 : clamp(-(m.vy || 0) * .03, -.4, .5), 9, dt);
    this.landK = Math.max(0, this.landK - dt * 3.4);
    /* balanço pela rotação da câmera */
    if (this.prevYaw === null) { this.prevYaw = camYaw; this.prevPitch = camPitch; }
    let dy = angDiff(this.prevYaw, camYaw), dp = camPitch - this.prevPitch; this.prevYaw = camYaw; this.prevPitch = camPitch;
    dy = clamp(dy, -.1, .1); dp = clamp(dp, -.1, .1);
    this.swayVx += (-dy * 55 - this.swayX * 160) * dt - this.swayVx * dt * 13; this.swayX += this.swayVx * dt;
    this.swayVy += (dp * 55 - this.swayY * 160) * dt - this.swayVy * dt * 13; this.swayY += this.swayVy * dt;
    this.swayX = clamp(this.swayX, -.05, .05); this.swayY = clamp(this.swayY, -.04, .04);
    for (let i = 0; i < 6; i++) { this.kv[i] += (-this.k[i] * 210 - this.kv[i] * 18) * dt; this.k[i] += this.kv[i] * dt; }
    this.flash = Math.max(0, this.flash - dt);
    /* recarga: progresso e gatilhos de som */
    const prevU = this.relU; this.relU = P.relT > 0 ? 1 - P.relT / Math.max(.01, P.relMax) : 0;
    if (prevU <= 0 && this.relU > 0) { const mg = P.mag ? (P.mag[w] | 0) : 0; this.relEmpty = mg <= 0; this.relMag0 = mg; this.relCap = Math.max(P.own ? wMagCap(P, w) : (W.mag | 0), mg, 1); this.prevV = 0; }
    if (this.relU > 0 && w === this.drawW) this._cues(wBase(w));
    if (this.relU <= 0) this.prevV = 0;
    /* corpo-a-corpo / arremesso */
    if (this.swing) { this.swing.t += dt; if (this.swing.t > (this.swing.kind === 'stab' ? .62 : .34)) this.swing = null; }
    this.throwAnim = P.throwT > 0 ? 1 - P.throwT / .32 : Math.max(0, this.throwAnim - dt * 4);
    /* carregadores caindo */
    for (let i = this.drops.length - 1; i >= 0; i--) { const d = this.drops[i]; d.t += dt; d.v[1] -= 9.8 * dt; d.p[0] += d.v[0] * dt; d.p[1] += d.v[1] * dt; d.p[2] += d.v[2] * dt; d.r[0] += d.s[0] * dt; d.r[1] += d.s[1] * dt; d.r[2] += d.s[2] * dt; if (d.t > 1.4 || d.p[1] < -1.4) this.drops.splice(i, 1); }
  }
  /* progresso da recarga (u) → tempo virtual do roteiro (sem a fase do ferrolho quando o pente não estava vazio) */
  _v(u) { return this.relEmpty ? u : (u < .8 ? u * (.68 / .8) : .86 + (u - .8) / .2 * .14); }
  _cues(w) {
    const v = this._v(this.relU), a = this.prevV, c = x => a < x && v >= x;
    if (w === 'galho' || w === 'colher') { if (c(.26)) { this.cue('rl', 0); this.dropReq = true; } if (c(.58)) this.cue('rl', 1); if (this.relEmpty && c(.77)) this.cue('rl', 2); }
    else if (w === 'vassoura') { if (c(.1)) this.cue('rl', 2); const n = Math.max(1, Math.min(5, this.relCap - this.relMag0)); for (let i = 0; i < n; i++) if (c(.2 + (.62 / n) * (i + .75))) this.cue('rl', 1); if (c(.86)) this.cue('rl', 2); }
    else if (w === 'estilingue') { if (c(.4)) this.cue('rl', 1); if (c(.68)) this.cue('rl', 0); }
    else if (w === 'porteira') { if (c(.18)) this.cue('rl', 2); if (c(.45)) this.cue('rl', 1); if (c(.6)) this.cue('rl', 1); if (c(.85)) this.cue('rl', 2); }
    this.prevV = v;
  }
  /* ponto local da arma → câmera (M = T·Ry·Rx·Rz) e o inverso */
  toCam(pos, rot, v) { let r = rotZ(v, rot[2]); r = rotX(r, rot[0]); r = rotY(r, rot[1]); return [r[0] + pos[0], r[1] + pos[1], r[2] + pos[2]]; }
  fromCam(pos, rot, p) { let r = [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]]; r = rotY(r, -rot[1]); r = rotX(r, -rot[0]); return rotZ(r, -rot[2]); }
  /* ---------- desenho ---------- */
  draw(m, P, skinIdx, time) {
    /* wr = arma de verdade (modelo, munição, skin); w = arma base (animação em 1ª pessoa das armas novas) */
    const wr = this.drawW || P.w, w = wBase(wr), W = WEAPONS[wr], gv = typeof Body3D !== 'undefined' && BODY3D.tex && ThreeR.vmGlb ? Body3D.wglb(wr) : null, A = gv ? Object.assign({}, WANCH[wr] || WANCH[w] || WANCH.galho, gv.userData.anch) : WANCH[wr] || WANCH[w] || WANCH.galho, S = vmLook((isTat() && agentLook(P.farmer)) || SKINS[(skinIdx | 0) % SKINS.length], isTat() ? P.farmer : '', skinIdx),   /* braços com a cor da roupa nova */ mv = P.m, t = this.t;
    if (!W) return;
    const pist = SECONDARIES.includes(wr), isCur = wr === P.w, relU = isCur ? this.relU : 0, ad = isCur ? this.adsK : 0, sp = this.sprintK, bob = this.bobA;
    const pos = (pist ? VM_PIST.hip : VM_HIP[w] || VM_HIP.galho).slice(), rot = [0, 0, 0];
    if (ad > .001) { const a = L3(pos, pist ? VM_PIST.ads : A.ads, ad); pos[0] = a[0]; pos[1] = a[1]; pos[2] = a[2]; }
    /* bob de caminhada/corrida */
    const ph = (mv.stepD || 0) * 1.75, kb = (1 - ad * .82) * (settings.bobbing === undefined ? 1 : settings.bobbing);
    pos[0] += Math.sin(ph) * .013 * bob * kb + Math.sin(t * 1.15) * .0014 * (1 - ad * .7); pos[1] += (Math.abs(Math.cos(ph)) * .017 * bob - .007 * bob) * kb + Math.sin(t * 1.7) * .0021 * (1 - ad * .7); pos[2] += Math.sin(ph * 2) * .004 * bob * kb;
    rot[2] += Math.sin(ph) * .02 * bob * kb; rot[1] += Math.cos(ph) * .014 * bob * kb; rot[0] += Math.sin(ph * 2) * .006 * bob * kb;
    /* balanço do mouse */
    const ks = 1 - ad * .55; pos[0] += this.swayX * ks; pos[1] += this.swayY * ks; rot[1] += this.swayX * 2.4 * ks; rot[0] += this.swayY * 2.4 * ks; rot[2] += this.swayX * 1.4 * ks;
    /* corrida: arma baixa e cruzada */
    if (sp > .001) { pos[0] += -.1 * sp; pos[1] += -.03 * sp; pos[2] += .03 * sp; rot[0] += -.2 * sp; rot[1] += .55 * sp; rot[2] += -.12 * sp; }
    /* deslize / queda / pulo */
    pos[1] += -.07 * this.slideK - .06 * this.landK + this.jumpK * .05; pos[0] += .03 * this.slideK; rot[2] += .26 * this.slideK; rot[0] += .1 * this.landK - this.jumpK * .08;
    /* troca de arma (guarda / saca) */
    if (this.lower > .001) { const e = this.lower * this.lower * (3 - 2 * this.lower); pos[1] -= .46 * e; pos[0] += .07 * e; pos[2] += .03 * e; rot[0] += -1.0 * e; rot[1] += .3 * e; }
    /* recuo */
    pos[2] += this.k[0]; rot[0] += this.k[1]; rot[1] += this.k[2]; rot[2] += this.k[3]; pos[0] += this.k[4]; pos[1] += this.k[5];
    const st = { mag: 0, bolt: 0, pull: 1, empty: false, fuse: 0, noMag: false, led: 0 };
    const c = { pos, rot, st, hL: null, hR: null, held: null, heldRound: false, heldShell: false, showW: true, noL: false, stone: false };
    this.hideWeapon = false;
    const wmag = P.mag ? (P.mag[wr] | 0) : 0;
    const working = this.useK > .02 && w !== 'mandioca';

    /* ===== animações por arma ===== */
    if (pist) this._vPist(c, A, wr, relU);
    else if (w === 'galho' || w === 'colher') { if (relU > 0) this._rMag(c, A, w, relU); else st.bolt = this.shotT < .09 ? Math.sin(this.shotT / .09 * PI) * .8 : 0; }
    else if (w === 'vassoura') this._vVass(c, A, P, W, relU, wmag);
    else if (w === 'estilingue') this._vSling(c, A, P, W, relU, ad);
    else if (w === 'faca') this._vKnife(c, P);
    else if (w === 'batata') this._vNade(c, P);
    else if (w === 'porteira') this._vPort(c, A, P, W, relU);
    else if (w === 'mandioca') this._vBomb(c, P);
    if (working) { const u = this.useK; pos[1] -= .55 * u; rot[0] -= .9 * u; pos[0] += .06 * u; }

    /* luneta: a arma some e o overlay assume */
    if (w === 'vassoura' && ad > .82) this.hideWeapon = true;
    this.muz = this.toCam(pos, rot, A.muzzle);
    /* ----- arma ----- */
    if (!this.hideWeapon && c.showW) {
      m.push().tr(pos[0], pos[1], pos[2]).ry(rot[1]).rx(rot[0]).rz(rot[2]);
      const eMe = G.ents && G.ents.get(G.myId); st.sk = eMe && eMe.wskO >= 0 && eMe.wid === wr ? (WSKIN_IDS[eMe.wskO] === 'padrao' ? '' : WSKIN_IDS[eMe.wskO]) : typeof Cos !== 'undefined' ? Cos.skinOf(wr) : ''; if (gv) ThreeR.vmGlb(gv, pos, rot, st.sk); else drawWeapon(m, w, st);   /* modelo 3D da arma (GLB) ou o de código */
      if (this.flash > 0 && isCur && relU <= 0 && w !== 'estilingue') this._flash(m, A, w);
      if (c.held) { const l = this.fromCam(pos, rot, c.held); m.push().tr(l[0], l[1], l[2]).rx(.47); drawMag(m, w); m.pop(); }
      m.pop();
    }
    if (c.heldShell && c.hL) { m.push().tr(c.hL[0] + .01, c.hL[1] + .03, c.hL[2] - .05).ry(rot[1]).rx(rot[0] + .3); drawShell(m); m.pop(); }
    if (c.heldRound && c.hL) { m.push().tr(c.hL[0] + .004, c.hL[1] + .028, c.hL[2] - .04).ry(rot[1]).rz(1.3); drawRound(m); m.pop(); }
    if (c.stone && c.hL) m.mat(TX.stone, 0).col(0xb0a898).uvs(1, 1).sph(.02, .02, .02, 6, 4, c.hL[0] + .002, c.hL[1] + .03, c.hL[2] - .045);
    /* carregadores caindo */
    for (const d of this.drops) { m.push().tr(d.p[0], d.p[1], d.p[2]).ry(d.r[1]).rx(d.r[0]).rz(d.r[2]); drawMag(m, d.id); m.pop(); }
    if (this.dropReq && pist) { this.dropReq = false; if (wr === 'tijolinho') this.drops.push({ id: 'colher', p: this.toCam(pos, rot, A3(A.grip, [0, -.1, 0])), v: [.05, -.6, .05], r: [rot[0], rot[1], rot[2]], s: [2, 1, 2], t: 0 }); }
    if (this.dropReq && (w === 'galho' || w === 'colher')) { this.dropReq = false; const mo = VM_MAGOUT[w]; this.drops.push({ id: w, p: this.toCam(pos, rot, A3(A.mag, mo)), v: [.3, -.5, .15], r: [rot[0] + .47, rot[1], rot[2]], s: [3 + Math.random() * 3, 1, 2 + Math.random() * 3], t: 0 }); }

    /* ----- braços e mãos ----- */
    const shR = [.4, -.62, .22], shL = [-.4, -.62, .22];
    let hR = c.hR || this.toCam(pos, rot, A.grip), hL = c.hL;
    if (!hL && !c.noL) hL = pist ? this.toCam(pos, rot, A3(A.grip, [-.03, -.025, .012])) : this.toCam(pos, rot, A3(A.fore, [-.012, -.03, 0]));   /* pistola: mão esquerda por baixo da direita */
    if (working) this._work(m, c, S, t, P);
    else if (!window.__noArms) { this._arm(m, shR, hR, S, 1); if (hL) this._arm(m, shL, hL, S, -1, w === 'estilingue'); }
  }
  /**
   * Pistola: recuo com o cano subindo; recarga própria.
   *  Trezoitão (revólver): gira a arma para a esquerda (tambor para fora), bate as cápsulas, pega o carregador rápido no cinto, encaixa e fecha com um tranco.
   *  Tijolinho: inclina a arma, o pente cai, a mão busca outro no cinto, encaixa por baixo do cabo com um tapa.
   */
  _vPist(c, A, wr, relU) {
    const { pos, rot } = c; if (this.shotT < .14) { const k = Math.sin(this.shotT / .14 * PI); rot[0] += .16 * k; pos[2] += .02 * k; pos[1] += .01 * k; }
    if (relU <= 0) return; const v = relU, pouch = [-.18, -.42, -.2];
    const tilt = sgm(v, 0, .12) * (1 - sgm(v, .86, 1)), gp = A3(A.grip, [-.03, -.02, .01]);
    if (wr === 'trezoitao') {
      rot[2] += .95 * tilt; rot[1] += .25 * tilt; pos[0] -= .05 * tilt; pos[1] += .03 * tilt;
      const side = this.toCam(pos, rot, A3(A.grip, [-.05, .07, -.06])); let hand;
      if (v < .12) hand = L3(this.toCam(pos, rot, gp), side, sgm(v, 0, .12));
      else if (v < .26) { hand = side; const k = Math.sin(sgm(v, .14, .24) * PI); rot[0] -= .5 * k; pos[1] += .03 * k; }   /* bate o tambor: cápsulas caem */
      else if (v < .42) hand = L3(side, pouch, sgm(v, .26, .42));
      else if (v < .66) { hand = L3(pouch, side, sgm(v, .48, .66)); c.heldRound = v > .44; }                                  /* carregador rápido */
      else if (v < .8) hand = A3(side, [0, 0, .015 * Math.sin(sgm(v, .66, .8) * PI)]);
      else { hand = L3(side, this.toCam(pos, rot, gp), sgm(v, .8, .92)); const k = Math.sin(sgm(v, .8, .88) * PI); rot[2] -= .35 * k; }   /* fecha com um tranco */
      c.hL = hand;
    } else {
      rot[2] -= .35 * tilt; rot[0] += .15 * tilt; const bot = this.toCam(pos, rot, A3(A.grip, [0, -.13, .02])); let hand;
      if (v < .14) hand = L3(this.toCam(pos, rot, gp), pouch, sgm(v, 0, .14));
      else if (v < .3) hand = pouch;
      else if (v < .55) { hand = L3(pouch, bot, sgm(v, .3, .55)); c.held = A3(A.grip, [0, -.13, .02]); }
      else if (v < .66) { hand = L3(bot, this.toCam(pos, rot, A3(A.grip, [0, -.06, .01])), sgm(v, .55, .66)); const k = Math.sin(sgm(v, .58, .68) * PI); pos[1] += .02 * k; }   /* tapa no pente */
      else hand = L3(bot, this.toCam(pos, rot, gp), sgm(v, .66, .8));
      if (v > .55) c.held = null; c.hL = hand;
      if (v > .1 && this.prevPist < .1) this.dropReq = true;
    }
    this.prevPist = v;
  }
  /* cura em primeira pessoa: o item de cura aparece nas duas mãos com animação própria */
  drawHeal(m, P, skinIdx, time, dt) {
    const S = (isTat() && agentLook(P.farmer)) || SKINS[(skinIdx | 0) % SKINS.length], k = P.heal && P.heal.k; if (!k) { this.healK = 0; return; }
    this.healK = Math.min(1, (this.healK || 0) + (dt || .016) * 5); const e = S01(this.healK), t = time, rise = (1 - e) * .4 - .11;
    const kind = k.replace('_br', ''), pr = sat(P.heal.t || 0);
    let pos = [0, -.28 - rise, -.5], rot = [.25, 0, 0], hl = [-.13, -.3 - rise, -.48], hr = [.13, -.3 - rise, -.48];
    m.push();
    if (kind === 'pano') { /* passa o pano no braço: vai e volta */
      const sw = Math.sin(t * 9) * .07; pos = [sw, -.27 - rise, -.48]; rot = [.4, sw * 2, 0];
      m.tr(pos[0], pos[1], pos[2]).rx(rot[0]).ry(rot[1]).sc(1.15); drawGear(m, 'pano'); m.pop();
      hl = [-.12 + sw, -.29 - rise, -.47]; hr = [.12 + sw, -.29 - rise, -.47];
      m.push().tr(-.2, -.36 - rise + Math.sin(t * 9) * .006, -.44).rz(.7); m.mat(TX.white, 0).col(S.skin).box(.07, .07, .24); m.pop();
    } else if (kind === 'caixa') { /* caixa aberta, tira a atadura e enrola */
      m.tr(0, -.33 - rise, -.52).rx(.55).sc(1.05); drawGear(m, 'caixa'); m.pop();
      const a = t * 6; m.push().tr(.09 + Math.cos(a) * .03, -.2 - rise + Math.sin(a) * .03, -.46).rz(PI / 2); m.mat(TX.cloth, 0).col(0xf4efe6).uvs(1, 1).cyl(.03, .03, .05, 12, 0, -.025, 0, 3); m.pop();
      hl = [-.16, -.33 - rise, -.5]; hr = [.09 + Math.cos(a) * .03, -.24 - rise + Math.sin(a) * .03, -.44];
    } else if (kind === 'leite') { /* garrafa vai até a boca */
      const up = sgm(pr, .05, .3) * (1 - sgm(pr, .9, 1)); m.tr(.02, -.24 - rise + up * .14, -.36 + up * .1).rx(-up * 1.6).sc(.95); drawGear(m, 'leite'); m.pop();
      hr = [.06, -.31 - rise + up * .14, -.36 + up * .1]; hl = [-.12, -.36 - rise, -.5];
    } else if (kind === 'spray') { /* borrifa no braço */
      const pump = Math.max(0, Math.sin(t * 14)); m.tr(.12, -.24 - rise, -.5).rz(.45).rx(-.2).sc(1.0); drawGear(m, 'spray'); m.pop();
      hr = [.15, -.33 - rise - pump * .01, -.5];
      hl = [-.18, -.34 - rise, -.5];
    } else if (kind === 'mel') { /* pote na mão esquerda, colher vai à boca */
      m.tr(-.12, -.3 - rise, -.52).rx(.35).sc(.9); drawGear(m, 'mel'); m.pop();
      hl = [-.1, -.38 - rise, -.45]; const sp = (Math.sin(t * 4) + 1) / 2; hr = [.08 - sp * .06, -.3 - rise + sp * .1, -.46 + sp * .1];
    } else { /* marmita aberta na mão esquerda */
      m.tr(-.06, -.32 - rise, -.56).rx(.45).sc(.9); drawGear(m, k); m.pop();
      hl = [-.12, -.38 - rise, -.48]; const sp = (Math.sin(t * 5) + 1) / 2; hr = [.1, -.3 - rise + sp * .08, -.44 + sp * .08];
    }
    const shR = [.4, -.62, .22], shL = [-.4, -.62, .22];
    this._arm(m, shR, hr, S, 1); if (hl) this._arm(m, shL, hl, S, -1);
  }
  /* braço: manga + punho + mão (orientada ao longo do braço) */
  _arm(m, sh, hd, S, side, handOnly) {
    if (typeof capTo === 'function') {   /* braço e mão arredondados (todos os personagens, inclusive agentes do 5x5) */
      const full = S.sleeve ? S.sleeve === 'full' : true, sh2 = S.shirt2 || S.shirt, glove = S.glove, hc = glove || (S.onesie ? S.shirt : S.skin);
      if (!handOnly) {
        if (full) { capTo(m, sh, lerp3(sh, hd, .9), .05, .046, S.shirt); if (S.style === 'hoodie') capTo(m, lerp3(sh, hd, .5), lerp3(sh, hd, .56), .053, .052, sh2);
          if (S.plaid) for (const k of [.3, .62]) capTo(m, lerp3(sh, hd, k), lerp3(sh, hd, k + .04), .052, .051, S.plaid);
          capTo(m, lerp3(sh, hd, .8), lerp3(sh, hd, .93), .052, .05, S.wrist || (glove ? glove : sh2)); }
        else { capTo(m, sh, lerp3(sh, hd, .3), .056, .054, S.shirt); capTo(m, lerp3(sh, hd, .27), lerp3(sh, hd, .33), .059, .059, sh2); capTo(m, lerp3(sh, hd, .3), lerp3(sh, hd, .95), .042, .04, S.skin, TX.white); }
      }
      const dx = hd[0] - sh[0], dy = hd[1] - sh[1], dz = hd[2] - sh[2], L = Math.hypot(dx, dy, dz) || .001;
      m.push().tr(hd[0], hd[1], hd[2]).ry(Math.atan2(-dx, -dz)).rx(Math.asin(dy / L));
      if (handOnly) m.tr(0, -.026, .022).sc(.68);   /* estilingue: mão menor, pinçando a bolsa por baixo (a pedra fica visível) */
      m.mat(glove ? TX.cloth : TX.white, 30).col(hc).uvs(1, 1).sph(.046, .034, .054, 10, 6, 0, 0, -.008);                        /* palma */
      for (let i = 0; i < 4; i++) m.sph(.012, .013, .02, 6, 4, (i - 1.5) * .022, -.006, -.06);                             /* dedos dobrados */
      m.sph(.016, .015, .03, 6, 4, -side * .044, .012, -.03);                                                                 /* polegar */
      if (glove && !handOnly) m.mat(TX.cloth, 0).col(shade(glove, .8)).sph(.05, .036, .022, 8, 5, 0, 0, .04);                               /* punho da luva */
      m.pop(); return;
    }
    const dx = hd[0] - sh[0], dy = hd[1] - sh[1], dz = hd[2] - sh[2], L = Math.hypot(dx, dy, dz) || .001, yaw = Math.atan2(-dx, -dz), pit = Math.asin(dy / L);
    const sl = S.plaid && S.vest ? S.shirt : S.shirt, cuff = S.glove ? S.glove : (S.shirt2 || sl), hand = S.glove || S.skin, dk = shade(hand, .82);
    if (!handOnly) { m.push().tr((sh[0] + hd[0]) / 2, (sh[1] + hd[1]) / 2, (sh[2] + hd[2]) / 2).ry(yaw).rx(pit); m.mat(TX.cloth, 0).col(sl).uvs(1.5, 1.5).box(.08, .08, L - .02); m.pop(); }   /* estilingue: só a mão segurando a bolsa (sem manga cruzando a tela) */
    m.push().tr(hd[0], hd[1], hd[2]).ry(yaw).rx(pit);
    m.mat(TX.cloth, 0).col(cuff).uvs(1, 1).box(.09, .09, .045, 0, 0, .06);
    m.mat(TX.white, 0).col(hand).uvs(1, 1).box(.088, .062, .1, 0, 0, -.004).box(.082, .03, .05, 0, -.016, -.07).box(.025, .03, .07, -side * .052, .01, -.02);
    m.mat(TX.white, 0).col(dk).box(.082, .005, .004, 0, -.016, -.096).box(.082, .005, .004, 0, -.005, -.096);
    m.pop();
  }
  /* mãos trabalhando (plantar / desarmar) com a mandioca no chão */
  _work(m, c, S, t, P) {
    const u = this.useK, plant = this.useKind === 'plant', prog = P.useMax > 0 ? sat((P.useT || 0) / P.useMax) : 0, press = Math.sin(t * 7.5) * .014, wob = Math.sin(t * 5.3) * .012;
    const cy = -.34 - (plant ? prog * .1 : 0), ox = 0, cz = -.62;
    const k = u * u * (3 - 2 * u), sh = (a, b) => [a[0], a[1] - (1 - k) * .5, a[2]];
    m.push().tr(ox, cy - (1 - k) * .5, cz).sc(1.15); m.push().rz(0); drawCassavaUp(m, Math.sin(t * (plant ? 5 : 11)) > 0 ? 1 : 0); m.pop(); m.pop();
    const hl = sh([-.11, cy + .1 + (plant ? press : 0), cz + .03]), hr = sh([.11 + (plant ? 0 : wob), cy + .1 + (plant ? -press : press * .6), cz + .03]);
    this._arm(m, [.4, -.62, .22], hr, S, 1); this._arm(m, [-.4, -.62, .22], hl, S, -1);
  }
  _flash(m, A, w) {
    if (w === 'porteira' && !this._f2) { this._f2 = true; for (const s of [-1, 1]) this._flash(m, { muzzle: [s * .0225, A.muzzle[1], A.muzzle[2]] }, w); this._f2 = false; return; }
    const mz = A.muzzle, f = this.flash / (w === 'vassoura' ? .09 : .055), s = (w === 'vassoura' ? 1.7 : w === 'colher' ? .8 : 1) * (.8 + .5 * Math.abs(Math.sin(this.flashSeed)));
    m.push().tr(mz[0], mz[1], mz[2] - .015).rz(this.flashSeed);
    m.mat(TX.white, 0, 0, 120).col(0xfff2c0).sph(.028 * s, .028 * s, .05 * s * f, 6, 4, 0, 0, -.025);
    m.mat(TX.white, 0, 0, 120).col(0xffb23a);
    for (let i = 0; i < 6; i++) { m.push().rz(i * 1.047 + (i & 1) * .2).tr(0, .05 * s, -.012); m.box(.012, .1 * s * (.7 + .15 * ((i * 7) % 3)), .006); m.pop(); }
    m.mat(TX.white, 0, 0, 120).col(0xff7a1a).push().rx(-PI / 2).cyl(.03 * s, .004, .17 * s * f, 7, 0, 0, 0, 1).pop();
    m.pop();
  }
  /* ========== recarga com carregador (galho / colher) ========== */
  _rMag(c, A, w, u) {
    const v = this._v(u), emp = this.relEmpty, pos = c.pos, rot = c.rot, st = c.st;
    const a = sgm(v, 0, .12), b = sgm(v, .12, .26), cc = sgm(v, .26, .34), d = sgm(v, .34, .52), e = sgm(v, .52, .62), f = sgm(v, .62, .68);
    const g1 = sgm(v, .68, .74), g2 = sgm(v, .74, .78), g4 = sgm(v, .8, .86), h = sgm(v, .86, 1);
    const tilt = a * (1 - h);
    pos[0] += -.15 * tilt; pos[1] += .19 * tilt; pos[2] += -.08 * tilt; rot[0] += .22 * tilt; rot[1] += .3 * tilt; rot[2] += -.85 * tilt;
    if (w === 'colher') { pos[2] += -.12 * tilt; pos[1] -= .1 * tilt; pos[0] += .06 * tilt; rot[1] -= .45 * tilt; rot[0] -= .2 * tilt; }   /* coronha de arame não invade a câmera */
    const bump = Math.sin(sgm(v, .56, .64) * PI); pos[1] += -.028 * bump * (1 - h); rot[0] += .06 * bump * (1 - h);
    const mo = VM_MAGOUT[w], mpos = k => this.toCam(pos, rot, A3(A.mag, [mo[0] * k, mo[1] * k, mo[2] * k]));
    const pouch = [-.32, -.55, -.12], fore = this.toCam(pos, rot, A3(A.fore, [-.012, -.03, 0]));
    let hand = fore, mag = 0, noMag = false, held = null;
    if (v < .12) hand = L3(fore, mpos(0), a);
    else if (v < .26) { mag = b; hand = mpos(b); }
    else if (v < .34) { noMag = true; hand = L3(mpos(1), pouch, cc); }
    else if (v < .52) { noMag = true; hand = L3(pouch, mpos(1.0), d); held = hand; }
    else if (v < .62) { mag = 1 - e; hand = mpos(mag); }
    else hand = mpos(0);
    if (v >= .62 && v < .68) hand = A3(hand, [0, .018 * Math.sin(f * PI), 0]);
    const bolt = this.toCam(pos, rot, [.0, .085, .05]);
    if (v >= .68) {
      if (emp) {
        if (v < .74) hand = L3(mpos(0), bolt, g1);
        else if (v < .8) { hand = A3(bolt, [0, 0, g2 * .075]); st.bolt = g2; }
        else if (v < .86) { hand = L3(A3(bolt, [0, 0, .075]), bolt, g4); st.bolt = 1 - g4; }
        else hand = L3(bolt, fore, h);
      } else if (v >= .86) hand = L3(mpos(0), fore, h);
      else hand = mpos(0);
    }
    st.mag = mag; st.noMag = noMag; c.hL = hand; c.held = held;
  }
  /* ========== vassoura (ferrolho): abrir, enfiar espinhos, fechar ========== */
  _vVass(c, A, P, W, u, wmag) {
    const pos = c.pos, rot = c.rot, st = c.st;
    if (u <= 0) {
      const f = P.cdT > 0 ? 1 - P.cdT / W.cd : 1;
      if (f < .8 && this.shotT < 1.4 && P.cdT > 0) {
        const k1 = sgm(f, .2, .36), k2 = sgm(f, .52, .7); st.bolt = k1 * (1 - k2); const tw = k1 * (1 - k2); rot[2] += -.08 * tw; pos[1] += .012 * tw;
        c.hR = L3(this.toCam(pos, rot, A.grip), this.toCam(pos, rot, [.056, .03, .06 + st.bolt * .09]), Math.min(1, tw * 2.5));
      }
      return;
    }
    const n = Math.max(1, Math.min(5, this.relCap - this.relMag0)), v = this._v(u);
    const open = sgm(v, .06, .15), close = sgm(v, .8, .9), tilt = sgm(v, 0, .1) * (1 - sgm(v, .9, 1));
    pos[0] += -.05 * tilt; pos[1] += .04 * tilt; rot[0] += .12 * tilt; rot[2] += -.42 * tilt;
    st.bolt = open * (1 - close);
    const grip = this.toCam(pos, rot, A.grip), handle = this.toCam(pos, rot, [.056, .03, .06 + st.bolt * .09]), fore = this.toCam(pos, rot, A3(A.fore, [-.012, -.03, 0]));
    if (v < .22) c.hR = L3(grip, handle, sgm(v, .03, .12) * (1 - sgm(v, .16, .22)));
    else if (v > .76) c.hR = L3(grip, handle, sgm(v, .76, .82) * (1 - sgm(v, .9, .96)));
    else c.hR = grip;
    const port = this.toCam(pos, rot, [.0, .05, -.02]), pouch = [-.3, -.52, -.14];
    let hand = fore;
    if (v < .2) hand = L3(fore, pouch, sgm(v, .1, .2));
    else if (v < .82) {
      const s0 = (.82 - .2) / n, ci = Math.min(n - 1, Math.floor((v - .2) / s0)), f = ((v - .2) - ci * s0) / s0;
      if (f < .45) { hand = L3(pouch, port, sgm(f, 0, .45)); c.heldRound = true; }
      else if (f < .62) hand = A3(port, [0, -.012 * Math.sin((f - .45) / .17 * PI), 0]);
      else hand = L3(port, pouch, sgm(f, .62, 1));
    } else hand = L3(pouch, fore, sgm(v, .82, .95));
    c.hL = hand;
  }
  /* ========== porteira (cano duplo): abre na dobradiça, ejeta, põe 2 cartuchos, fecha ========== */
  _vPort(c, A, P, W, u) {
    const pos = c.pos, rot = c.rot, st = c.st;
    if (u <= 0) { const b = this.shotT < .28 ? Math.sin(this.shotT / .28 * PI) : 0; pos[2] += b * .06; rot[0] += b * .17; pos[1] += b * .012; this.shellDrop = false; return; }
    const v = u, tilt = sgm(v, 0, .12) * (1 - sgm(v, .88, 1));
    pos[0] += -.07 * tilt; pos[1] += .07 * tilt; pos[2] += .04 * tilt; rot[0] += .42 * tilt; rot[1] += .22 * tilt; rot[2] += -.3 * tilt;
    const shut = sgm(v, .76, .84); st.brk = sgm(v, .1, .2) * (1 - shut); rot[0] += .08 * Math.sin(shut * PI);
    st.shellOut = v < .3 ? sgm(v, .16, .28) : 0; st.nl = v < .3 ? 2 : v < .5 ? 0 : v < .64 ? 1 : 2;
    if (v >= .28 && !this.shellDrop) { this.shellDrop = true; const H = A.hinge; for (const s of [-1, 1]) { const lp = A3(rotX(A3([s * .0225, .022, .07], [-H[0], -H[1], -H[2]]), -st.brk * .62), H); this.drops.push({ id: 'shell', p: this.toCam(pos, rot, lp), v: [.4 + s * .25, 1.1, .9], r: [rot[0], rot[1], rot[2]], s: [8 + Math.random() * 4, 2, 5], t: 0 }); } }
    if (v < .3) this.shellDrop = this.shellDrop && v >= .28;
    const H = A.hinge, breech = this.toCam(pos, rot, A3(rotX(A3([0, .02, -.03], [-H[0], -H[1], -H[2]]), -st.brk * .62), H)), fore = this.toCam(pos, rot, A3(A.fore, [-.012, -.03, 0])), pouch = [-.3, -.52, -.12];
    let hand = fore;
    if (v < .3) hand = fore;
    else if (v < .38) hand = L3(fore, pouch, sgm(v, .3, .38));
    else if (v < .47) { hand = L3(pouch, breech, sgm(v, .38, .47)); c.heldShell = true; }
    else if (v < .53) hand = L3(breech, pouch, sgm(v, .47, .53));
    else if (v < .62) { hand = L3(pouch, breech, sgm(v, .53, .62)); c.heldShell = true; }
    else if (v < .72) hand = L3(breech, fore, sgm(v, .62, .72));
    else if (v < .84) hand = A3(fore, [0, .025 * Math.sin(sgm(v, .74, .84) * PI), 0]);
    c.hL = hand;
    if (v < .22) c.hR = L3(this.toCam(pos, rot, A.grip), this.toCam(pos, rot, [0, .05, .05]), Math.sin(sgm(v, .02, .2) * PI) * .6);
  }
  /* ========== estilingue ========== */
  _vSling(c, A, P, W, u, ad) {
    const pos = c.pos, rot = c.rot, st = c.st;
    if (u > 0) {
      const v = u, tilt = sgm(v, 0, .12) * (1 - sgm(v, .9, 1));
      pos[0] += -.04 * tilt; pos[1] += .035 * tilt; rot[0] += .2 * tilt; rot[2] += -.3 * tilt;
      const fore = this.toCam(pos, rot, A3(A.fore, [-.012, 0, 0])), pocketAt = z => this.toCam(pos, rot, [0, .09, z]), pouch = [-.3, -.5, -.12];
      st.empty = v < .5; st.pull = sgm(v, .56, .78) * (1 - sgm(v, .86, .9));
      let hand;
      if (v < .38) { hand = v < .16 ? L3(fore, pouch, sgm(v, 0, .16)) : L3(pouch, A3(pocketAt(.02), [-.02, 0, .02]), sgm(v, .2, .38)); c.stone = v > .17; }
      else if (v < .56) { hand = A3(pocketAt(.02), [-.012, 0, .02]); c.stone = v < .5; }
      else if (v < .84) hand = pocketAt(.02 + st.pull * .13);
      else hand = L3(pocketAt(.02), fore, sgm(v, .86, 1));
      c.hL = hand; return;
    }
    /* sempre pronto: pedra na bolsa, meio puxado; mirando puxa até o fim. Disparo: elástico estala para frente (com balanço),
       a mão abre e solta; depois a mão pega a próxima pedra e volta a puxar */
    const f = P.cdT > 0 ? sat(P.cdT / W.cd) : 0, rest = .32 + .68 * ad, st0 = this.shotT;
    if (st0 < .2) {   /* estalo: elástico passa do ponto e balança */
      const k = st0 / .2; st.pull = -.16 * Math.exp(-st0 * 16) * Math.cos(st0 * 70); st.empty = true;
      c.hL = this.toCam(pos, rot, [-.03 - .05 * k, .05 + .02 * k, .03 + rest * .13 + .04 * k]); rot[0] += .05 * Math.exp(-st0 * 20); return;
    }
    if (f > 0) {   /* pega outra pedra e puxa de novo */
      const g = 1 - f; st.empty = g < .45; const pouch = [-.26, -.46, -.1], back = this.toCam(pos, rot, [-.02, .05, .03 + rest * .13 * sgm(g, .5, 1)]);
      c.hL = g < .45 ? L3(this.toCam(pos, rot, [-.05, .05, .07]), pouch, sgm(g, 0, .3)) : L3(pouch, back, sgm(g, .45, .8)); c.stone = g > .25 && g < .7; st.pull = rest * sgm(g, .55, 1); return;
    }
    st.empty = false; st.pull = rest + Math.sin(this.t * 2.2) * .015 * (1 - ad);   /* tensão viva */
    c.hL = this.toCam(pos, rot, [-.02, .05, .03 + st.pull * .13]);
  }
  /* ========== faca ========== */
  _vKnife(c, P) {
    const pos = c.pos, rot = c.rot, sw = this.swing; rot[0] += .35; rot[1] += -.15; rot[2] += -.55; pos[1] += .0; c.noL = true;
    if (sw) {
      if (sw.kind === 'slash') { const u = sat(sw.t / .3), e = Math.sin(u * PI), q = easeOut(u); rot[1] += .8 - 2.3 * q; rot[2] += -.3 * e; rot[0] += -.15 * e; pos[0] += -.34 * q + .06 * (1 - q); pos[2] += -.08 * e; pos[1] += .04 * e; }
      else { const wind = sgm(sw.t, 0, .3), hit = sgm(sw.t, .3, .38) * (1 - sgm(sw.t, .44, .6)); rot[0] += -.35 * wind - .5 * hit; rot[2] += .25 * wind; pos[2] += .06 * wind - .35 * hit; pos[1] += .08 * wind; pos[0] += .06 * wind - .1 * hit; }
    } else if (P.windT > 0) { const wnd = 1 - P.windT / .32; rot[0] += -.35 * wnd; pos[2] += .06 * wnd; pos[1] += .08 * wnd; pos[0] += .06 * wnd; }
  }
  /* ========== batata (granada) ========== */
  _vNade(c, P) {
    const pos = c.pos, rot = c.rot, st = c.st, ta = this.throwAnim; st.fuse = 1;
    const wind = sgm(ta, 0, .5), thr = sgm(ta, .5, .85);
    pos[0] += .04 * wind - .08 * thr; pos[1] += .09 * wind - .03 * thr; pos[2] += .07 * wind - .3 * thr; rot[0] += -.5 * wind + .85 * thr; rot[1] += .1 * wind;
    c.hL = this.toCam(pos, rot, [-.09, .02, .03]);
    c.hR = this.toCam(pos, rot, [0, -.012, .0]);
    if (P.throwT <= 0 && ta > .8) c.showW = false;
  }
  /* ========== mandioca-bomba (carregada) ========== */
  _vBomb(c, P) {
    const pos = c.pos, rot = c.rot, st = c.st; st.led = Math.sin(this.t * 6) > 0 ? 1 : 0; rot[0] += -.12; rot[1] += .25; pos[0] += .12; pos[1] += .01;
    const u = this.useK, press = Math.sin(this.t * 7) * .012;
    if (u > .01) { const prog = P.useMax > 0 ? sat((P.useT || 0) / P.useMax) : 0; pos[0] += (0 - pos[0]) * u * .6; pos[1] += (-.2 - pos[1]) * u + (this.useKind === 'plant' ? -prog * .06 : 0) + press * u; pos[2] += -.08 * u; rot[0] += (this.useKind === 'defuse' ? -.5 : .9) * u; }
    c.hL = this.toCam(pos, rot, WANCH.mandioca.fore); c.hR = this.toCam(pos, rot, A3(WANCH.mandioca.grip, [0, 0, .02]));
  }
}
