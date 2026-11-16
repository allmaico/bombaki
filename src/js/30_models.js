/* =====================================================================
   30_models.js — personagens blocky, armas (mundo + viewmodel), props vivos
   Convenção local de arma: origem na mão direita, +X direita, +Y cima, −Z frente
   ===================================================================== */
'use strict';
const zcyl = (m, r0, r1, len, z0, x, y, seg) => { m.push().tr(x || 0, y || 0, z0).rx(-PI / 2).cyl(r0, r1, len, seg || 8).pop(); };
const bx = (m, tex, col, spec, w, h, d, x, y, z, us) => { m.mat(tex, spec || 0).col(col).uvs(us || 1, us || 1).box(w, h, d, x || 0, y || 0, z || 0); };
/* mandioca-bomba (a bomba): tubérculo + folhas + LED + display */
function drawCassava(m, st) {
  const led = st.led === undefined ? 0 : st.led, sc = st.scale || 1; m.push().sc(sc);
  m.mat(TX.cass, 0).col(0xffffff).uvs(2, 2).push().tr(0, .02, 0).rz(PI / 2).cyl(.06, .025, .38, 10, 0, -.19, 0, 3).pop();
  m.mat(TX.cass, 0).col(0xe8d0b0).uvs(2, 2).sph(.062, .062, .062, 9, 6, -.19, .02, 0);
  m.mat(TX.white, 0).col(0xf2ead8).uvs(1, 1).push().tr(.21, .02, 0).rz(PI / 2).cyl(.026, .02, .025, 8, 0, 0, 0, 2).pop();
  bx(m, TX.metal, 0x2a2c30, 90, .1, .035, .07, -.02, .075, 0);                                                        /* caixinha eletrônica */
  m.mat(TX.white, 0, 0, 120).col(led > .5 ? 0xff2020 : 0x501010).uvs(1, 1).sph(.012, .012, .012, 6, 4, -.055, .097, 0);
  m.mat(TX.white, 0, 0, 100).col(0x40ff60).box(.05, .014, .004, .0, .078, .036);
  m.mat(TX.leaf, 0, 0, 0, 1).col(0xa0e070).uvs(1, 1); for (let k = 0; k < 5; k++) { m.push().tr(-.22, .03, 0).ry(k * 1.256).rx(-.7); m.dquad([0, 0, 0], [.03, 0, -.1], [0, 0, -.17], [-.03, 0, -.1]); m.pop(); }
  m.pop();
}
/* dados de esqueleto de braço/perna: caixa orientada de A para B (eixo local −Z) */
function limbTo(m, a, b, w, h, tex, col, spec) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || .001;
  m.push().tr((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2).ry(Math.atan2(-dx, -dz)).rx(Math.asin(dy / L)); m.mat(tex, spec || 0).col(col).uvs(1.5, 1.5).box(w, h, L); m.pop(); return L;
}
/* ---------- personagem ---------- */
function drawHead(m, S, special) {
  /* cabeça centrada em (0,0,0), cubo .4 */
  m.mat(TX.white, 0).col(S.skin).uvs(1, 1).box(.4, .4, .4);
  m.mat(TX.face, 0, 0, 0, 1).col(0xffffff).quad([.19, -.19, -.2005], [-.19, -.19, -.2005], [-.19, .19, -.2005], [.19, .19, -.2005], 0, 1, 1, 0);
  const hairCol = S.hair, hs = S.hairStyle;
  if (hs === 'short' || hs === 'spiky') { m.mat(TX.cloth, 0).col(hairCol).uvs(1, 1).box(.42, .12, .42, 0, .17, .0).box(.42, .2, .1, 0, .1, .16); if (hs === 'spiky') for (let i = 0; i < 5; i++) m.box(.07, .13 + (i % 2) * .05, .07, -.15 + i * .075, .28, -.02 + (i % 3 - 1) * .05); }
  else if (hs === 'comb') { m.mat(TX.cloth, 0).col(0xd9342b).uvs(1, 1).box(.08, .12, .22, 0, .26, -.02).box(.08, .09, .08, 0, .22, .1).box(.06, .1, .06, 0, -.16, -.22); }
  else if (hs === 'leaf') { m.mat(TX.cloth, 0).col(hairCol).uvs(1, 1).box(.42, .1, .42, 0, .18, 0); m.mat(TX.leaf, 0, 0, 0, 1).col(0xa0e080); m.dquad([-.05, .23, 0], [.04, .23, -.0], [.1, .42, .0], [-.04, .38, 0]); }
  if (S.beard === 'mustache') m.mat(TX.cloth, 0).col(S.hair).uvs(1, 1).box(.2, .04, .03, 0, -.07, -.215);
  if (S.beard === 'full') m.mat(TX.cloth, 0).col(S.hair).uvs(1, 1).box(.4, .09, .04, 0, -.13, -.19).box(.3, .05, .03, 0, -.07, -.21).box(.04, .2, .3, -.2, -.08, -.02).box(.04, .2, .3, .2, -.08, -.02);
  if (special === 'chicken') { m.mat(TX.white, 0).col(0xf2a62a).uvs(1, 1).box(.13, .07, .12, 0, -.05, -.26).mat(TX.cloth, 0).col(0xd9342b).box(.05, .08, .04, 0, -.13, -.22); }
  if (special === 'pig') { m.mat(TX.white, 0).col(0xe88aa0).uvs(1, 1).box(.17, .12, .08, 0, -.07, -.24).mat(TX.white, 0).col(0x8a3a50).box(.025, .04, .01, -.04, -.07, -.285).box(.025, .04, .01, .04, -.07, -.285).mat(TX.white, 0).col(0xf09ab0).box(.1, .1, .04, -.18, .22, 0).box(.1, .1, .04, .18, .22, 0); }
  if (S.hat === 'straw') { m.mat(TX.hay, 0).col(0xf0d070).uvs(1.5, 1.5).cyl(.5, .5, .035, 14, 0, .2, 0, 3).cyl(.23, .21, .17, 12, 0, .21, 0, 3); m.mat(TX.cloth, 0).col(0xc03a2a).uvs(1, 1).cyl(.235, .235, .04, 12, 0, .22, 0, 0); }
  else if (S.hat === 'cap') { m.mat(TX.cloth, 0).col(0xe8731c).uvs(1, 1).box(.43, .12, .43, 0, .2, 0).box(.3, .03, .2, 0, .15, -.3); }
  else if (S.hat === 'bucket') { m.mat(TX.cloth, 0).col(0xd8cf8a).uvs(1, 1).cyl(.3, .24, .17, 12, 0, .17, 0, 3).cyl(.36, .36, .03, 12, 0, .17, 0, 3); }
  if (S.hood) { m.mat(TX.cloth, 0).col(S.shirt).uvs(1, 1).box(.46, .06, .46, 0, .2, .0).box(.46, .4, .08, 0, 0, .23).box(.06, .4, .4, -.23, 0, .02).box(.06, .4, .4, .23, 0, .02); m.mat(TX.cloth, 0).col(S.shirt2).box(.46, .02, .03, 0, .16, -.2); }
}
/* c: {x,y,z,yaw,pitch,skin,team,wid,cr,spd,wph,air,slide,fire,rel,dead,bomb,hit,kneel,plant}  */
function drawChar(m, c, opt) {
  opt = opt || {}; const S = SKINS[c.skin % SKINS.length], bulk = S.bulk || 1, cr = c.cr || 0, dead = c.dead || 0;
  const wa = WANCH[c.wid] || WANCH.galho, hasW = !!c.wid && !dead; const spd = Math.min(1, (c.spd || 0) / 7), sw = Math.sin(c.wph || 0) * (c.air ? .4 : 1) * spd, sw2 = Math.cos(c.wph || 0) * spd;
  m.push().tr(c.x, c.y, c.z).ry(c.yaw);
  if (dead) { const f = easeOut(Math.min(1, dead)); m.tr(0, .16 * f, 0).rx(f * 1.5); }
  const slide = c.slide ? 1 : 0;
  if (slide) { m.tr(0, .5, .1).rx(1.0).tr(0, -.5, 0); }
  const hipY = .72 - .27 * cr, legH = hipY, wB = .56 * bulk, torsoH = .66, thick = .3 * bulk;
  /* pernas */
  const legAng = [sw * .75, -sw * .75], bend = cr * .9;
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1; let ang = legAng[i] * (1 - cr * .6) + (slide ? 1.2 * (i ? 1 : .8) - 1.0 : 0) + (c.air && !slide && !c.chute ? (i ? .5 : -.4) : 0), spread = 0;
    if (c.chute === 'open') ang = -.18 + Math.sin((c.chT || 0) * 1.7 + i * 1.9) * .16;                 /* pernas soltas, balançando */
    else if (c.chute === 'fall') { ang = .35 + Math.sin((c.chT || 0) * 6 + i * 2) * .05; spread = sd * .28; }
    m.push().tr(sd * .14 * bulk, hipY, 0).rz(spread).rx(ang); m.mat(TX.cloth, 0).col(S.pants).uvs(1, 1).box(.26 * bulk, legH * .9, .3 * bulk, 0, -legH * .45, 0);
    m.mat(TX.cloth, 0).col(S.pants2).box(.275 * bulk, .05, .315 * bulk, 0, -legH * .88 + .02, 0); m.mat(TX.cloth, 0).col(S.boots).uvs(1, 1).box(.27 * bulk, .12, .36 * bulk, 0, -legH + .06, -.03); m.mat(TX.rubber, 0).col(S.sole).box(.275 * bulk, .035, .37 * bulk, 0, -legH + .018, -.03); m.pop();
  }
  /* torso (inclina ao agachar) */
  m.push().tr(0, hipY, 0).rx(-cr * .35 + (c.rel ? -.05 : 0));
  m.mat(TX.cloth, 0).col(S.shirt).uvs(1, 1).box(wB, torsoH, thick, 0, torsoH / 2, 0);
  m.mat(TX.cloth, 0).col(S.shirt2).box(wB + .01, .07, thick + .01, 0, .08, 0);                                    /* barra/cinto */
  if (S.overalls) { m.mat(TX.cloth, 0).col(S.pants).box(wB * .7, torsoH * .55, thick + .015, 0, .21, 0).box(.08, torsoH * .6, thick + .015, -.2, .36, 0).box(.08, torsoH * .6, thick + .015, .2, .36, 0); m.mat(TX.metal, 100).col(0xe8c040).box(.05, .05, .01, -.2, .5, -.165).box(.05, .05, .01, .2, .5, -.165); }
  if (S.hood) { m.mat(TX.cloth, 0).col(S.shirt2).box(wB * .6, .08, .02, 0, .22, -.165).box(.03, .2, .02, -.06, .5, -.165).box(.03, .2, .02, .06, .5, -.165); }
  if (c.armor) { m.mat(TX.cloth, 0).col(0xc9a865).box(wB + .05, torsoH * .78, thick + .05, 0, torsoH * .5, 0); m.mat(TX.metal, 50).col(c.armor === 3 ? 0x3a4a2a : c.armor === 2 ? 0x5d6e3a : 0x7a6a3a).box(wB * .38, torsoH * .3, .02, -wB * .22, torsoH * .58, -thick / 2 - .03).box(wB * .38, torsoH * .3, .02, wB * .22, torsoH * .58, -thick / 2 - .03); m.mat(TX.white, 0).col(0xd8352a).box(wB + .06, .05, thick + .06, 0, torsoH * .3, 0); }
  /* mochila / bomba nas costas */
  if (c.bomb) { m.push().tr(0, .36, thick / 2 + .12); drawCassava(m, { led: Math.sin((opt.time || 0) * 8) > 0 ? 1 : 0, scale: 1 }); m.pop(); } else if (c.chute) {                                     /* mochila do paraquedas com tirantes no peito */
    m.mat(TX.cloth, 0).col(0xc8913e).uvs(1, 1).box(wB * .86, torsoH * .8, .24, 0, torsoH * .5, thick / 2 + .12); m.mat(TX.cloth, 0).col(0xa8742c).box(wB * .7, torsoH * .3, .08, 0, torsoH * .32, thick / 2 + .27); m.mat(TX.metal, 120).col(0xe8c040).box(.06, .06, .02, -.12, torsoH * .32, thick / 2 + .31).box(.06, .06, .02, .12, torsoH * .32, thick / 2 + .31);
    m.mat(TX.cloth, 0).col(0x5a3a20); for (const sx of [-1, 1]) m.box(.07, torsoH * .95, .02, sx * .14, torsoH * .5, -thick / 2 - .012); m.box(wB + .02, .07, thick + .03, 0, torsoH * .42, 0); m.box(wB * .7, .06, .02, 0, torsoH * .7, -thick / 2 - .014);
  } else if (S.id !== 'galinha') { m.mat(TX.cloth, 0).col(S.shirt2).uvs(1, 1).box(wB * .7, torsoH * .62, .14, 0, torsoH * .5, thick / 2 + .07); }
  /* faixa de equipe */
  if (c.team) m.mat(TX.cloth, 0, 0, 40).col(c.team === 1 ? 0x2f7bff : 0xee3f35).uvs(1, 1).box(.22, .1, .23, -(wB / 2 + .11), torsoH - .15, 0).box(wB + .03, .05, thick + .03, 0, torsoH - .04, 0);
  if (c.farmer && typeof drawFarmerGear === 'function') drawFarmerGear(m, c.farmer, wB, torsoH, thick);
  /* cabeça */
  const pit = clamp(c.pitch || 0, -1.2, 1.2); m.push().tr(0, torsoH + .2 + .02, -.02).rx(-pit * (dead ? 0 : .8) * .6 + (dead ? -.3 : 0)); drawHead(m, S, S.special); if (c.farmer && typeof drawFarmerHat === 'function') drawFarmerHat(m, c.farmer, S); m.pop();
  /* braços */
  const shY = torsoH - .1, rs = [wB / 2 + .1, shY, 0], ls = [-(wB / 2 + .1), shY, 0];
  const aim = hasW && c.wid !== 'faca' && c.wid !== 'batata'; const aimP = pit - (c.rel ? .5 : 0);
  if (c.chute) {
    /* paraquedas aberto: mãos para cima segurando as linhas (mesmo ponto usado pelas cordas em CHUTE.hand); queda livre: braços abertos */
    const hand = sd => c.chute === 'open' ? [sd * .3, 2.02 - hipY, -.02] : [sd * .78, shY + .12, -.14];
    for (const sd of [-1, 1]) { const hp = hand(sd); limbTo(m, sd > 0 ? rs : ls, hp, .17 * bulk, .17 * bulk, TX.cloth, S.shirt); m.push().tr(hp[0], hp[1], hp[2]); m.mat(TX.white, 0).col(S.skin).uvs(1, 1).box(.13, .13, .13); m.pop(); }
  } else if (hasW) {
    /* arma na altura do peito, apontando para (yaw, pitch) — transformada em local do torso */
    const p = aimP * .9, kick = (c.fire || 0) * .06, cx = .16, cy = shY - .2 + (c.wid === 'faca' ? -.12 : 0), cz = -.32 - (c.wid === 'faca' ? 0 : .0) + kick;
    const wr = [cx, cy, cz];
    const gr = rotPitch(wa.grip, p, wr), fr = rotPitch(wa.fore, p, wr);
    const slideF = c.fire ? 0 : 0;
    m.push().tr(wr[0], wr[1], wr[2]).rx(p).tr(0, 0, 0); if (c.wid === 'faca') { m.rx(-.3 - (c.fire || 0) * 1.0); } drawWeapon(m, c.wid, { mag: c.rel ? Math.sin(c.rel * PI) : 0, bolt: 0, pull: c.fire ? 1 - (c.fire) : 0, fuse: 1 }); m.pop();
    limbTo(m, rs, gr, .17 * bulk, .17 * bulk, TX.cloth, S.shirt); m.push().tr(gr[0], gr[1], gr[2]); m.mat(TX.white, 0).col(S.skin).uvs(1, 1).box(.12, .12, .12); m.pop();
    if (aim) { limbTo(m, ls, fr, .17 * bulk, .17 * bulk, TX.cloth, S.shirt); m.push().tr(fr[0], fr[1], fr[2]); m.mat(TX.white, 0).col(S.skin).uvs(1, 1).box(.12, .12, .12); m.pop(); }
    else drawArmFree(m, ls, -1, sw2 * .5, S, bulk);
  } else { drawArmFree(m, rs, 1, -sw * .8, S, bulk); drawArmFree(m, ls, -1, sw * .8, S, bulk); }
  m.pop(); m.pop();
}
function rotPitch(a, p, o) { const cs = Math.cos(p), sn = Math.sin(p); return [o[0] + a[0], o[1] + a[1] * cs - a[2] * sn, o[2] + a[1] * sn + a[2] * cs]; }
function drawArmFree(m, sh, sd, ang, S, bulk) { m.push().tr(sh[0], sh[1], sh[2]).rx(ang); m.mat(TX.cloth, 0).col(S.shirt).uvs(1, 1).box(.18 * bulk, .38, .2 * bulk, 0, -.19, 0); m.mat(TX.white, 0).col(S.skin).box(.16 * bulk, .3, .18 * bulk, 0, -.5, 0); m.pop(); }
/* ---------- animais e props vivos ---------- */
function drawCow(m, a, t) {
  m.push().tr(a.x, a.y, a.z).ry(a.rot + Math.sin(t * .1 + a.ph) * .05);
  m.mat(TX.cow, 0).col(0xffffff).uvs(.6, .6).box(.8, .85, 1.7, 0, 1.0, 0);
  for (const [x, z] of [[-.28, -.6], [.28, -.6], [-.28, .6], [.28, .6]]) m.mat(TX.cow, 0).col(0xf0f0ea).box(.2, .6, .2, x, .3, z);
  m.push().tr(0, 1.25 + Math.sin(t * .6 + a.ph) * .04, -.95).rx(.35 + Math.max(0, Math.sin(t * .25 + a.ph)) * .35); m.mat(TX.cow, 0).col(0xffffff).box(.42, .4, .5, 0, 0, 0); m.mat(TX.white, 0).col(0xe8a8a0).box(.3, .18, .08, 0, -.1, -.27); m.mat(TX.white, 0).col(0xf4f0e0).box(.07, .12, .07, -.2, .25, .0).box(.07, .12, .07, .2, .25, 0); m.mat(TX.white, 0).col(0x20201c).box(.05, .05, .02, -.12, .06, -.26).box(.05, .05, .02, .12, .06, -.26); m.pop();
  m.mat(TX.cow, 0).col(0xe8e8e0).box(.06, .6, .06, 0, 1.0, .88);
  m.pop();
}
function drawChicken(m, c) {
  const bob = Math.abs(Math.sin(c.ph)) * .03; m.push().tr(c.x, c.y + bob, c.z).ry(c.yaw);
  m.mat(TX.white, 0).col(c.col || 0xf4eee0).uvs(1, 1).box(.2, .22, .3, 0, .27, 0).box(.12, .12, .1, 0, .29, .18).box(.08, .06, .12, 0, .26, .24);
  m.mat(TX.white, 0).col(0xf2a62a).box(.04, .03, .05, 0, .38, -.15 + .31).box(.03, .16, .03, -.05, .08, 0).box(.03, .16, .03, .05, .08, 0);
  m.mat(TX.cloth, 0).col(0xd9342b).box(.025, .06, .07, 0, .4, .17); m.pop();
}
function drawWindmillBlades(m, a, t) {
  m.push().tr(a.x, a.y, a.z + 2.0).rz(t * .6); m.mat(TX.wood, 0).col(0x8a6a48).uvs(1, 1); bx(m, TX.wood, 0x6a4a2a, 0, .5, .5, .5, 0, 0, 0);
  for (let k = 0; k < 4; k++) { m.push().rz(k * PI / 2); bx(m, TX.wood, 0x8a6a48, 0, .22, a.r, .1, 0, a.r / 2 + .3, 0); m.mat(TX.cloth, 0).col(0xf2ead8).uvs(1, 1).box(1.3, a.r * .72, .04, .75, a.r * .55 + .4, .05); m.pop(); }
  m.pop();
}
/* ---------- itens no chão ---------- */
function drawBombWorld(m, b, t) {
  m.push().tr(b.x, b.y, b.z).ry(b.yaw || 0); const blink = b.armed ? (Math.sin(t * (b.urg ? 22 : 7)) > 0 ? 1 : 0) : 0;
  m.push().tr(0, .3, 0).sc(1.5); drawCassavaUp(m, blink); m.pop(); m.pop();
}
function drawCassavaUp(m, led) { m.push().tr(0, 0, 0).rz(-PI / 2); drawCassava(m, { led }); m.pop(); }
function drawPotato(m, p) { m.push().tr(p.x, p.y, p.z).ry(p.rot || 0).rx(p.rot2 || 0); drawWeapon(m, 'batata', { fuse: 1 }); m.pop(); }
function drawLootItem(m, it, t) {
  const y = it.y + .5 + Math.sin(t * 2 + it.x) * .06; m.push().tr(it.x, y, it.z).ry(t * 1.2 + it.x);
  const col = TIER_COL[it.tier | 0] || 0xffffff, k = it.k === 'w' ? 'weapon' : it.k === 'a' ? 'ammo' : (it.k === 'kit' || it.k === 'heal') ? 'heal' : it.k === 'helm' ? 'helmet' : it.k === 'nade' ? 'grenade' : it.k;
  if (k === 'weapon') { m.sc(1.5); drawWeapon(m, it.id || it.w, {}); }
  else if (k === 'ammo') { const ac = { milho: 0xe8c43a, pedra: 0x8a8a90, espinho: 0x4aa83a, cimento: 0xd8803a }[it.w] || 0xb08a50; m.mat(TX.cloth, 0).col(0xb08a50).uvs(1, 1).box(.3, .18, .2, 0, 0, 0); m.mat(TX.white, 0, 0, 60).col(ac).box(.32, .04, .22, 0, .03, 0); }
  else if (k === 'heal') { m.sc(1.6); drawGear(m, GEAR[it.w] ? it.w : 'caixa', {}); }
  else if (k === 'vest') { m.sc(1.1); drawGear(m, 'colete', {}); m.mat(TX.white, 0, 0, 60).col(col).box(.38, .03, .07, 0, -.24, -.02); }
  else if (k === 'helmet') { m.mat(TX.metal, 80).col(col).uvs(1, 1).sph(.2, .15, .2, 8, 5, 0, 0, 0); }
  else if (k === 'grenade') { m.sc(1.6); drawWeapon(m, 'batata', {}); }
  else if (k === 'pack') { m.mat(TX.cloth, 0).col(col).uvs(1, 1).box(.3, .36, .2, 0, 0, 0); }
  else if (k === 'sp') {
    if (it.w === 'ovo') { m.mat(TX.metal, 120, 0, 90).col(0xffd24a).uvs(1, 1).sph(.12, .16, .12, 10, 7, 0, 0, 0); }
    else if (it.w === 'garapa') { m.mat(TX.white, 0, 0, 40).col(0xe8c040, 220).uvs(1, 1).cyl(.1, .1, .3, 10, 0, -.15, 0, 3); m.mat(TX.metal, 80).col(0x9a9a9a).cyl(.06, .06, .05, 8, 0, .15, 0, 3); }
    else { m.mat(TX.cloth, 0).col(0x7a4a22).uvs(1, 1).box(.26, .12, .18, 0, 0, 0); m.mat(TX.white, 0).col(0xd8c0a0).box(.1, .02, .1, 0, .07, 0); }
  }
  m.pop();
  m.push().tr(it.x, it.y + .03, it.z).mat(TX.white, 0, 0, 50).col(col, 120); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; m.push().tr(Math.cos(a) * .38, 0, Math.sin(a) * .38).box(.07, .02, .07).pop(); } m.pop();
}
/* porquinho (cenário vivo) */
function drawPig(m, a, t) {
  const bob = Math.sin(t * 6 + a.ph) * (a.walk ? .03 : .006); m.push().tr(a.x, a.y + bob, a.z).ry(a.yaw || 0);
  m.mat(TX.white, 0).col(0xf2a4b4).uvs(1, 1).box(.55, .5, .95, 0, .52, 0);
  for (const [x, z] of [[-.17, -.32], [.17, -.32], [-.17, .32], [.17, .32]]) m.mat(TX.white, 0).col(0xe890a2).box(.12, .26, .12, x, .13, z);
  m.push().tr(0, .58, -.52).rx(Math.sin(t * 1.3 + a.ph) * .12 + (a.eat ? .5 : 0)); m.mat(TX.white, 0).col(0xf4aab9).box(.4, .38, .38, 0, 0, 0); m.mat(TX.white, 0).col(0xe27e92).box(.24, .17, .12, 0, -.05, -.24); m.mat(TX.white, 0).col(0x7a3a50).box(.04, .06, .02, -.05, -.05, -.31).box(.04, .06, .02, .05, -.05, -.31);
  m.mat(TX.white, 0).col(0xe890a2).box(.1, .14, .05, -.15, .24, .02).box(.1, .14, .05, .15, .24, .02); m.mat(TX.white, 0).col(0x20201c).box(.05, .05, .02, -.1, .08, -.2).box(.05, .05, .02, .1, .08, -.2); m.pop();
  m.mat(TX.white, 0).col(0xe27e92).box(.05, .05, .14, 0, .68, .52); m.pop();
}
const TIER_COL = [0xcfcfcf, 0x6fd06a, 0x4aa0ff, 0xc060ff, 0xffb830];
