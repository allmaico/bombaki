/* =====================================================================
   30_models.js — personagens blocky, armas (mundo + viewmodel), props vivos
   Convenção local de arma: origem na mão direita, +X direita, +Y cima, −Z frente
   ===================================================================== */
'use strict';
const zcyl = (m, r0, r1, len, z0, x, y, seg) => { m.push().tr(x || 0, y || 0, z0).rx(-PI / 2).cyl(r0, r1, len, seg || 8).pop(); };
const bx = (m, tex, col, spec, w, h, d, x, y, z, us) => { m.mat(tex, spec || 0).col(col).uvs(us || 1, us || 1).box(w, h, d, x || 0, y || 0, z || 0); };
/* mandioca-bomba (a bomba): tubérculo + folhas + LED + display */
function drawCassava(m, st) {
  if (typeof CassGLB !== 'undefined' && CassGLB.draw(m, st)) return;   /* modelo 3D (quando carregado) */
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
/* ---------- APARÊNCIA DOS AGENTES (5x5): visual próprio de cada um, como nas artes ---------- */
/* v7.10: cores dos 5 agentes novos (boneco de código só aparece muito longe ou sem modelo 3D) */
const AGENT_LOOKS = {
  peao: { id: 'zeca', skin: 0xe2a882, hair: 0x3a2414, hairStyle: 'tousled', brows: 0x2a1a10, shirt: 0xeadfc8, shirt2: 0xd8ccb0, vest: 0x7a4a22, pants: 0x3a5a9a, pants2: 0x2e4a80, boots: 0x7a4a22, sole: 0x2a1a0a, glove: 0x5a3a20, belt: 0x5a3414, buckle: 0xe8c040, hat: 'bucket', beard: 'none', bulk: 1.0, grin: 1 },
  rastreador: { id: 'bia', skin: 0xc68a62, hair: 0x2a1a10, hairStyle: 'braid', brows: 0x1a1210, shirt: 0x5a6a34, shirt2: 0x4a5a2a, pants: 0x3a2a1e, pants2: 0x2e2218, boots: 0x4a2c18, sole: 0x2a1a0a, glove: 0x6a4a2a, belt: 0x5a3a20, buckle: 0xc88a3a, hat: 'none', beard: 'none', bulk: .92, female: 1, pouches: 0x4a5a2a },
  guardiao: { id: 'zefa', skin: 0xe0a07a, hair: 0xb8b4ac, hairStyle: 'buns', brows: 0x8a8680, glasses: 0x6a4a2a, shirt: 0xf0a828, shirt2: 0xd86a1a, plaid: 0xd84a1a, overalls: true, pants: 0x3a5a9a, pants2: 0x2e4a80, boots: 0x3a7a3a, sole: 0x1a3a1a, glove: 0x5a3a20, belt: 0x5a3414, buckle: 0xb8b8b0, hat: 'none', beard: 'none', bulk: 1.12, female: 1 },
  mateiro: { id: 'brasa', skin: 0xd09070, hair: 0x9a9690, hairStyle: 'short', brows: 0x6a6660, shirt: 0x4a4a50, shirt2: 0x3a3a40, vest: 0x4a2c18, pants: 0x2a2a2e, pants2: 0x1e1e22, boots: 0x2a1a10, sole: 0x0a0a0a, glove: 0x1e1a18, belt: 0x3a2414, buckle: 0xb87a3a, hat: 'straw', beard: 'full', bulk: 1.3 },
  socorrista: { id: 'lua', skin: 0xb87a52, hair: 0x1a1210, hairStyle: 'buns', brows: 0x1a1210, shirt: 0xe8dcc0, shirt2: 0xe0d0b0, vest: 0x4a8a3a, pants: 0x5a3a22, pants2: 0x4a2e1a, boots: 0x7a4a22, sole: 0x3a2414, glove: 0xb87a52, belt: 0x6a4a2a, buckle: 0xe8c040, hat: 'none', beard: 'none', bulk: .9, female: 1, pouches: 0x8a6a3a }
};
const agentLook = f => (f && AGENT_LOOKS[f]) || null;
/* personagens (SKINS) = os 5 agentes: copia o visual de código de cada um (para quando o modelo 3D não estiver disponível) */
for (const S of SKINS) if (S.agentSkin && AGENT_LOOKS[S.agentSkin]) for (const k in AGENT_LOOKS[S.agentSkin]) if (!(k in S) || k === 'skin') S[k] = AGENT_LOOKS[S.agentSkin][k];
/* ---------- personagem ---------- */
/** corpo humanoide com proporções reais para todos os personagens (35_toon.js); false volta ao boneco antigo */
const HUMANO = true;
/* peças do tronco dos agentes: xadrez, colete aberto, barriga de fora (top), cinto com fivela, bolsinhas, galinha no ombro, frasco de fumaça */
function drawAgentTorso(m, S, wB, torsoH, thick) {
  const fz = -thick / 2 - .006, bz = thick / 2 + .006;
  if (S.crop) m.mat(TX.white, 0).col(S.skin).uvs(1, 1).box(wB + .006, torsoH * .3, thick + .006, 0, .09 + torsoH * .15, 0);
  if (S.plaid) { m.mat(TX.cloth, 0).col(S.plaid).uvs(1, 1); for (const y of [.3, .52, .74]) m.box(wB + .012, .035, thick + .012, 0, torsoH * y, 0); for (const x of [-.36, -.12, .12, .36]) { m.box(.035, torsoH * .78, .01, x * wB, torsoH * .55, fz); m.box(.035, torsoH * .78, .01, x * wB, torsoH * .55, bz); } }
  if (S.vest) { m.mat(TX.cloth, 0).col(S.vest).uvs(1, 1); for (const sx of [-1, 1]) { m.box(wB * .3, torsoH * .82, .025, sx * wB * .34, torsoH * .54, fz - .01); m.box(.03, torsoH * .82, thick + .03, sx * (wB / 2 + .012), torsoH * .54, 0); } m.box(wB + .02, torsoH * .82, .025, 0, torsoH * .54, bz + .01);
    if (S.pouches) { m.mat(TX.cloth, 0).col(S.pouches); m.box(.1, .09, .05, -wB * .33, torsoH * .62, fz - .04).box(.1, .09, .05, wB * .33, torsoH * .4, fz - .04); } }
  if (S.belt) { m.mat(TX.cloth, 0).col(S.belt).uvs(1, 1).box(wB + .03, .07, thick + .03, 0, .1, 0); m.mat(TX.metal, 160).col(S.buckle || 0xd8a838).box(.1, .08, .02, 0, .1, fz - .02); if (S.pouches && !S.vest) { m.mat(TX.cloth, 0).col(S.pouches); m.box(.1, .11, .07, -wB * .4, .06, fz - .02).box(.09, .1, .07, wB * .42, .06, -.02); } }
  if (S.bottle) { m.push().tr(wB / 2 + .06, .02, -.06); m.mat(TX.glass, 140, 0, 0).col(0xb05aff, 210).uvs(1, 1).cyl(.045, .045, .14, 8, 0, -.07, 0, 3); m.mat(TX.white, 0, 0, 200).col(0xd8a0ff).cyl(.02, .02, .03, 6, 0, .07, 0, 3); m.pop(); }
  if (S.pet === 'chicken' && !S._posing) { m.push().tr(-(wB / 2 + .08), torsoH - .07, .02).sc(.9); drawChicken(m, { x: 0, y: 0, z: 0, yaw: Math.PI, ph: 0, col: 0xc87a3a }); m.pop(); }
}
/* POSES de retrato (seleção / carregamento), como nas artes: braços e objeto de cada agente */
function poseArm(m, sh, el, hd, S, bulk) { if (HUMANO) return humanArm(m, sh, hd, S, bulk, sh[0] >= 0 ? 1 : -1, true); limbTo(m, sh, el, .17 * bulk, .17 * bulk, TX.cloth, S.shirt); limbTo(m, el, hd, .15 * bulk, .15 * bulk, TX.cloth, S.glove ? S.skin : S.shirt); m.push().tr(hd[0], hd[1], hd[2]); m.mat(TX.white, 0).col(S.glove || S.skin).uvs(1, 1).box(.13, .13, .13); m.pop(); }
function drawAgentPose(m, pose, S, rs, ls, shY, wB, bulk, torsoH) {
  const R = wB / 2, hipL = [-(R + .02), .2, -.04], elL = [-(R + .24), .42, .02];
  if (pose === 'guardiao') {   /* Zé Patrão: braços cruzados */
    poseArm(m, rs, [R + .14, shY - .36, -.16], [-.14, shY - .3, -.3], S, bulk); poseArm(m, ls, [-(R + .14), shY - .34, -.18], [.15, shY - .26, -.32], S, bulk);
  } else if (pose === 'peao') {   /* Tico Bruto: arma no ombro, outra mão na cintura */
    const hd = [R + .02, shY + .14, -.18]; poseArm(m, rs, [R + .2, shY - .2, -.12], hd, S, bulk);
    m.push().tr(R + .04, shY + .1, -.2).rx(1.45).rz(-.18).sc(1.3); drawWeapon(m, 'porteira', {}); m.pop();
    poseArm(m, ls, elL, hipL, S, bulk);
  } else if (pose === 'rastreador') {   /* Dona Jurema: braço erguido com a galinha na mão */
    const hd = [R + .16, shY + .5, -.1]; poseArm(m, rs, [R + .24, shY + .12, -.06], hd, S, bulk);
    m.push().tr(hd[0], hd[1] + .07, hd[2]).sc(.95); drawChicken(m, { x: 0, y: 0, z: 0, yaw: Math.PI * .8, ph: 0, col: 0xc87a3a }); m.pop();
    poseArm(m, ls, elL, hipL, S, bulk);
  } else if (pose === 'mateiro') {   /* Tati Fumaça: frasco de fumaça erguido perto do rosto */
    const hd = [R - .02, shY + .3, -.26]; poseArm(m, rs, [R + .18, shY - .18, -.12], hd, S, bulk);
    m.push().tr(hd[0], hd[1] + .12, hd[2]); m.mat(TX.glass, 140, 0, 0).col(0xb05aff, 210).uvs(1, 1).cyl(.06, .06, .2, 10, 0, -.1, 0, 3); m.mat(TX.metal, 100).col(0x3a2a4a).cyl(.035, .035, .05, 8, 0, .1, 0, 3); m.mat(TX.white, 0, 0, 200).col(0xd8a0ff); for (let k = 0; k < 4; k++) m.sph(.06 + k * .015, .05 + k * .012, .06 + k * .015, 7, 5, Math.sin(k * 1.7) * .05, .2 + k * .09, Math.cos(k * 1.3) * .03); m.pop();
    poseArm(m, ls, elL, hipL, S, bulk);
  } else if (pose === 'socorrista') {   /* Seu Mineiro: frasco verde brilhante na mão, à frente */
    const hd = [R - .04, shY - .14, -.38]; poseArm(m, rs, [R + .1, shY - .32, -.14], hd, S, bulk);
    m.push().tr(hd[0], hd[1] + .12, hd[2]); m.mat(TX.glass, 140, 0, 0).col(0x7aff5a, 200).uvs(1, 1).cyl(.055, .055, .18, 10, 0, -.09, 0, 3); m.mat(TX.white, 0, 0, 255).col(0xb0ff8a).cyl(.035, .035, .12, 8, 0, -.07, 0, 3); m.mat(TX.metal, 120).col(0x8a8a80).cyl(.06, .06, .03, 10, 0, .09, 0, 3); m.pop();
    poseArm(m, ls, [-(R + .1), shY - .3, .02], [-(R + .06), .12, -.02], S, bulk);
  }
}
/* chapéu sobre a cabeça (cabeça = cubo .4 centrado na origem; topo em y = .2) */
function drawHat(m, hat) {
  if (!hat || hat === 'none') return;
  if (hat === 'straw') { m.mat(TX.hay, 0).col(0xf0d070).uvs(1.5, 1.5).cyl(.5, .5, .035, 14, 0, .2, 0, 3).cyl(.23, .21, .17, 12, 0, .21, 0, 3); m.mat(TX.cloth, 0).col(0xc03a2a).uvs(1, 1).cyl(.235, .235, .04, 12, 0, .22, 0, 0); }
  else if (hat === 'cap') { m.mat(TX.cloth, 0).col(0xe8731c).uvs(1, 1).box(.43, .12, .43, 0, .2, 0).box(.3, .03, .2, 0, .15, -.3); }
  else if (hat === 'bucket') { m.mat(TX.cloth, 0).col(0xd8cf8a).uvs(1, 1).cyl(.3, .24, .17, 12, 0, .17, 0, 3).cyl(.36, .36, .03, 12, 0, .17, 0, 3); }
  else if (hat === 'bandana') { m.mat(TX.cloth, 0).col(0xd8322a).uvs(1, 1).box(.43, .13, .43, 0, .15, 0); m.mat(TX.white, 0).col(0xf4eee0).box(.05, .05, .01, -.1, .17, -.217).box(.05, .05, .01, .08, .12, -.217).box(.05, .05, .01, .14, .19, -.217); m.mat(TX.cloth, 0).col(0xb82a22).box(.1, .1, .08, 0, .15, .25).box(.06, .16, .04, -.04, .06, .3).box(.06, .14, .04, .05, .07, .31); }
  else if (hat === 'cowboy') { m.mat(TX.cloth, 0).col(0x8a5a2a).uvs(1, 1).cyl(.56, .56, .03, 16, 0, .2, 0, 3); m.push().tr(0, .2, 0); for (const sd of [-1, 1]) { m.push().tr(sd * .47, .0, 0).rz(sd * .5); m.box(.16, .03, .7, 0, .04, 0); m.pop(); } m.pop(); m.cyl(.24, .2, .24, 12, 0, .21, 0, 3); m.mat(TX.cloth, 0).col(0x3a2414).cyl(.245, .245, .05, 12, 0, .23, 0, 0); m.mat(TX.cloth, 0).col(0x6a4420).box(.06, .05, .3, 0, .44, 0); }
  else if (hat === 'pan') { m.mat(TX.metal, 90).col(0x9aa0a8).uvs(1, 1).cyl(.27, .25, .17, 14, 0, .16, 0, 3); m.mat(TX.metal, 60).col(0x5a6068).cyl(.29, .29, .025, 14, 0, .16, 0, 0); m.mat(TX.rubber, 0).col(0x2a2a2a).box(.4, .045, .07, .44, .26, 0); }
  else if (hat === 'sunflower') { m.mat(TX.leaf, 0, 0, 0, 1).col(0x5aa83a).uvs(1, 1).box(.04, .22, .04, 0, .3, 0); m.push().tr(0, .43, -.03).rx(-.5); m.mat(TX.white, 0).col(0xffc61a); for (let k = 0; k < 10; k++) { m.push().ry(k * TAU / 10); m.box(.07, .02, .14, 0, 0, -.15); m.pop(); } m.mat(TX.soil, 0).col(0x5a3418).cyl(.1, .1, .04, 10, 0, -.01, 0, 3); m.pop(); }
  else if (hat === 'strawBig') { m.mat(TX.hay, 0).col(0xe8c860).uvs(1.5, 1.5).cyl(.62, .62, .04, 16, 0, .2, 0, 3).cyl(.25, .23, .2, 12, 0, .21, 0, 3); m.mat(TX.cloth, 0).col(0x3a2414).uvs(1, 1).cyl(.255, .255, .05, 12, 0, .23, 0, 0); m.mat(TX.hay, 0).col(0xd8b048).box(.2, .03, .12, .2, .43, 0); }
  else if (hat === 'jurema') { m.mat(TX.cloth, 0).col(0x4a6a2a).uvs(1, 1).cyl(.54, .54, .035, 16, 0, .2, 0, 3).cyl(.24, .22, .17, 12, 0, .21, 0, 3); m.mat(TX.cloth, 0).col(0xd8a838).cyl(.245, .245, .04, 12, 0, .23, 0, 0); m.push().tr(-.24, .3, -.1).ry(.6).rx(-.4); m.mat(TX.white, 0).col(0xffc61a); for (let k = 0; k < 10; k++) { m.push().rz(k * TAU / 10); m.box(.035, .1, .015, 0, .07, 0); m.pop(); } m.mat(TX.soil, 0).col(0x5a3418).cyl(.05, .05, .025, 10, 0, 0, 0, 3).pop(); }
  else if (hat === 'crown') { m.mat(TX.white, 0, 0, 140).col(0xffc62a).uvs(1, 1).cyl(.25, .25, .12, 12, 0, .22, 0, 3); m.mat(TX.white, 0).col(0xffe066); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; m.push().tr(Math.cos(a) * .22, .4, Math.sin(a) * .22).ry(-a); m.box(.07, .14, .07); m.pop(); } m.mat(TX.white, 0).col(0xd8322a).box(.06, .06, .02, 0, .28, -.255); m.mat(TX.leaf, 0, 0, 0, 1).col(0x7ad04a); m.dquad([-.06, .3, -.24], [.06, .3, -.24], [.02, .46, -.26], [-.03, .44, -.26]); }
}
function drawHead(m, S, special, hat) {
  /* cabeça centrada em (0,0,0), cubo .4 */
  m.mat(TX.white, 0).col(S.skin).uvs(1, 1).box(.4, .4, .4);
  m.mat(TX.face, 0, 0, 0, 1).col(0xffffff).quad([.19, -.19, -.2005], [-.19, -.19, -.2005], [-.19, .19, -.2005], [.19, .19, -.2005], 0, 1, 1, 0);
  const hairCol = S.hair, hs = S.hairStyle;
  if (hs === 'short' || hs === 'spiky') { m.mat(TX.cloth, 0).col(hairCol).uvs(1, 1).box(.42, .12, .42, 0, .17, .0).box(.42, .2, .1, 0, .1, .16); if (hs === 'spiky') for (let i = 0; i < 5; i++) m.box(.07, .13 + (i % 2) * .05, .07, -.15 + i * .075, .28, -.02 + (i % 3 - 1) * .05); }
  else if (hs === 'comb') { m.mat(TX.cloth, 0).col(0xd9342b).uvs(1, 1).box(.08, .12, .22, 0, .26, -.02).box(.08, .09, .08, 0, .22, .1).box(.06, .1, .06, 0, -.16, -.22); }
  else if (hs === 'leaf') { m.mat(TX.cloth, 0).col(hairCol).uvs(1, 1).box(.42, .1, .42, 0, .18, 0); m.mat(TX.leaf, 0, 0, 0, 1).col(0xa0e080); m.dquad([-.05, .23, 0], [.04, .23, -.0], [.1, .42, .0], [-.04, .38, 0]); }
  if (hs === 'tousled') { m.mat(TX.cloth, 0).col(hairCol).uvs(1, 1).box(.42, .1, .42, 0, .17, 0).box(.42, .18, .1, 0, .1, .16); for (let i = 0; i < 4; i++) m.box(.1, .06, .12, -.14 + i * .095, .23, -.12 + (i % 2) * .05); m.box(.12, .08, .06, -.1, .12, -.2); }
  else if (hs === 'braid') { m.mat(TX.cloth, 0).col(hairCol).uvs(1, 1).box(.42, .1, .42, 0, .17, 0).box(.42, .34, .1, 0, .02, .17).box(.06, .3, .4, -.2, .03, .02).box(.06, .3, .4, .2, .03, .02); for (let i = 0; i < 7; i++) m.box(.12 - i * .005, .11, .12 - i * .005, .17 + i * .012, -.18 - i * .1, -.14 - i * .025 + (i % 2) * .02); m.mat(TX.cloth, 0).col(0xd8a838).box(.09, .035, .09, .25, -.87, -.3); }
  else if (hs === 'buns') { m.mat(TX.cloth, 0).col(hairCol).uvs(1, 1).box(.42, .1, .42, 0, .17, 0).box(.42, .24, .1, 0, .07, .16).box(.05, .22, .36, -.2, .06, .02).box(.05, .22, .36, .2, .06, .02).box(.3, .06, .05, .04, .15, -.2); m.sph(.11, .1, .11, 8, 6, -.15, .27, .04).sph(.11, .1, .11, 8, 6, .15, .27, .04); m.mat(TX.cloth, 0).col(0x7a3fb0).box(.08, .03, .08, -.15, .2, .04).box(.08, .03, .08, .15, .2, .04); }
  if (S.brows) { m.mat(TX.cloth, 0).col(S.brows).uvs(1, 1).box(.11, S.beard === 'full' ? .045 : .03, .02, -.09, .1, -.205).box(.11, S.beard === 'full' ? .045 : .03, .02, .09, .1, -.205); }
  if (S.female) { m.mat(TX.white, 0).col(0x1a1010).box(.05, .012, .01, -.13, .055, -.206).box(.05, .012, .01, .13, .055, -.206); m.mat(TX.white, 0).col(0xc85a5a).box(.07, .02, .01, 0, -.1, -.205); }
  if (S.grin) { m.mat(TX.white, 0).col(0xfff4e8).box(.1, .025, .01, .02, -.09, -.206); }
  if (S.glasses) { m.mat(TX.metal, 60).col(S.glasses).uvs(1, 1); for (const sx of [-1, 1]) { m.box(.13, .015, .01, sx * .09, .1, -.215).box(.13, .015, .01, sx * .09, .0, -.215).box(.015, .1, .01, sx * .155, .05, -.215).box(.015, .1, .01, sx * .025, .05, -.215); m.box(.015, .015, .2, sx * .2, .07, -.1); } m.box(.03, .015, .01, 0, .06, -.215); m.mat(TX.glass, 160, 0, 0).col(0xd8f0ff, 90).box(.11, .085, .005, -.09, .05, -.214).box(.11, .085, .005, .09, .05, -.214); }
  if (S.goggles) { m.mat(TX.cloth, 0).col(0x2a2a2a).uvs(1, 1).box(.43, .05, .43, 0, .18, 0); m.mat(TX.metal, 120).col(0x5a6a72); for (const sx of [-1, 1]) m.push().tr(sx * .09, .2, -.21).rx(-.5).cyl(.07, .07, .05, 10, 0, 0, 0, 3).pop(); m.mat(TX.glass, 160, 0, 0).col(0x5ad0ff, 200); for (const sx of [-1, 1]) m.push().tr(sx * .09, .2, -.24).rx(-.5).cyl(.055, .055, .01, 10, 0, 0, 0, 3).pop(); }
  if (S.beard === 'mustache') m.mat(TX.cloth, 0).col(S.hair).uvs(1, 1).box(.2, .04, .03, 0, -.07, -.215);
  if (S.beard === 'full') m.mat(TX.cloth, 0).col(S.hair).uvs(1, 1).box(.4, .09, .04, 0, -.13, -.19).box(.3, .05, .03, 0, -.07, -.21).box(.04, .2, .3, -.2, -.08, -.02).box(.04, .2, .3, .2, -.08, -.02);
  if (special === 'chicken') { m.mat(TX.white, 0).col(0xf2a62a).uvs(1, 1).box(.13, .07, .12, 0, -.05, -.26).mat(TX.cloth, 0).col(0xd9342b).box(.05, .08, .04, 0, -.13, -.22); }
  if (special === 'pig') { m.mat(TX.white, 0).col(0xe88aa0).uvs(1, 1).box(.17, .12, .08, 0, -.07, -.24).mat(TX.white, 0).col(0x8a3a50).box(.025, .04, .01, -.04, -.07, -.285).box(.025, .04, .01, .04, -.07, -.285).mat(TX.white, 0).col(0xf09ab0).box(.1, .1, .04, -.18, .22, 0).box(.1, .1, .04, .18, .22, 0); }
  drawHat(m, hat === undefined ? (S.hood ? '' : S.hat) : hat);
  if (S.hood && !(hat && hat !== 'none')) { m.mat(TX.cloth, 0).col(S.shirt).uvs(1, 1).box(.46, .06, .46, 0, .2, .0).box(.46, .4, .08, 0, 0, .23).box(.06, .4, .4, -.23, 0, .02).box(.06, .4, .4, .23, 0, .02); m.mat(TX.cloth, 0).col(S.shirt2).box(.46, .02, .03, 0, .16, -.2); }
}
/* c: {x,y,z,yaw,pitch,skin,team,wid,cr,spd,wph,air,slide,fire,rel,dead,bomb,hit,kneel,plant}  */
function drawChar(m, c, opt) {
  opt = opt || {}; const AL = agentLook(c.farmer), S = AL || SKINS[(c.skin | 0) % SKINS.length], bulk = S.bulk || 1, dead = c.dead || 0, dv = dead ? (c.dv | 0) : 0; let cr = c.cr || 0;
  const E = !dead && c.emote && typeof emoteAnim === 'function' ? emoteAnim(c.emote.id, c.emote.t) : null;
  const wa = WANCH[c.wid] || WANCH.galho, hasW = !!c.wid && !dead && !E; const spd = Math.min(1, (c.spd || 0) / 7), sw = Math.sin(c.wph || 0) * (c.air ? .4 : 1) * spd, sw2 = Math.cos(c.wph || 0) * spd;
  m.push().tr(c.x, c.y, c.z).ry(c.yaw);
  if (E) { m.tr(0, E.by, 0).ry(E.ry).rz(E.rz); cr = Math.max(cr, E.cr); }
  /* mortes cartoon: 0 cai de costas · 1 cara no chão · 2 rodopia e senta tonto · 3 arremessado (explosão/escopeta) · 4 ajoelha e tomba de lado */
  let legX = 0, torsoX = 0, headX = 0, armUp = 0;
  if (dead) {
    if (dv === 1) { const f = deathBounce(Math.min(1, dead * 1.6)); m.tr(0, .16 * f, 0).rx(-f * 1.5); armUp = f; }
    else if (dv === 2) { const sp = Math.min(dead, .9), s = clamp((dead - .55) / .3, 0, 1), f = easeOut(s); m.ry(sp * 14 - sp * sp * 7.8).tr(0, -.5 * f, 0); legX = 1.45 * f; torsoX = .25 * f + Math.sin(dead * 3) * .06 * f; headX = Math.sin(dead * 4) * .15 * f; }
    else if (dv === 3) { const a = Math.min(dead, .62) / .62; m.tr(0, .16 * a, 0).rx(easeOut(a) * (TAU + 1.5)); legX = Math.sin(a * PI) * .8; armUp = Math.sin(a * PI); }
    else if (dv === 4) { const k = clamp(dead / .45, 0, 1), f = easeOut(clamp((dead - .55) / .45, 0, 1)); cr = Math.max(cr, k); m.tr(0, .1 * f, 0).rz(f * 1.45); torsoX = -.3 * k * (1 - f); headX = -.4 * k * (1 - f); }
    else { const f = deathBounce(Math.min(1, dead * 1.4)); m.tr(0, .16 * f, 0).rx(f * 1.5); }
  }
  const flinch = (c.hit || 0) * (c.hitHead ? 1.4 : 1);
  const slide = c.slide ? 1 : 0;
  if (slide) { m.tr(0, .5, .1).rx(1.0).tr(0, -.5, 0); }
  const hipY = (HUMANO ? .95 - .36 * cr : .72 - .27 * cr), legH = hipY, wB = (HUMANO ? .46 * (S.female ? .86 : 1) : .56) * bulk, torsoH = HUMANO ? .6 : .66, thick = (HUMANO ? .25 : .3) * bulk;
  /* pernas */
  const legAng = [sw * .75, -sw * .75], bend = cr * .9;
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1; let ang = legAng[i] * (1 - cr * .6) + (slide ? 1.2 * (i ? 1 : .8) - 1.0 : 0) + (c.air && !slide && !c.chute ? (i ? .5 : -.4) : 0), spread = 0;
    if (c.chute === 'open') ang = -.18 + Math.sin((c.chT || 0) * 1.7 + i * 1.9) * .16;                 /* pernas soltas, balançando */
    else if (c.chute === 'fall') { ang = .35 + Math.sin((c.chT || 0) * 6 + i * 2) * .05; spread = sd * .28; }
    ang += legX; if (E) { ang += E.legs[i]; spread += sd * E.sp[i]; } m.push().tr(sd * (HUMANO ? .095 : .14) * bulk, hipY, 0).rz(spread).rx(ang); if (HUMANO) { drawLegToon(m, S, bulk, legH, sd, c.lod); m.pop(); continue; } m.mat(TX.cloth, 0).col(S.pants).uvs(1, 1).box(.26 * bulk, legH * .9, .3 * bulk, 0, -legH * .45, 0);
    m.mat(TX.cloth, 0).col(S.pants2).box(.275 * bulk, .05, .315 * bulk, 0, -legH * .88 + .02, 0); m.mat(TX.cloth, 0).col(S.boots).uvs(1, 1).box(.27 * bulk, .12, .36 * bulk, 0, -legH + .06, -.03); m.mat(TX.rubber, 0).col(S.sole).box(.275 * bulk, .035, .37 * bulk, 0, -legH + .018, -.03); m.pop();
  }
  /* torso (inclina ao agachar) */
  m.push().tr(0, hipY, 0).rx(-cr * .35 + (c.rel ? -.05 : 0) + torsoX + flinch * .32 + (E ? E.lean : 0)).rz(flinch * .12 * (c.hitSide || 0) + (E ? E.tz : 0));
  if (HUMANO) drawTorsoToon(m, S, wB, torsoH, thick, c.lod);
  else { m.mat(TX.cloth, 0).col(S.shirt).uvs(1, 1).box(wB, torsoH, thick, 0, torsoH / 2, 0);
  m.mat(TX.cloth, 0).col(S.shirt2).box(wB + .01, .07, thick + .01, 0, .08, 0); }                                    /* barra/cinto */
  if (AL && !HUMANO) { S._posing = c.pose === 'rastreador'; drawAgentTorso(m, S, wB, torsoH, thick); S._posing = false; }
  if (S.overalls) { m.mat(TX.cloth, 0).col(S.pants).box(wB * .7, torsoH * .55, thick + .015, 0, .21, 0).box(.08, torsoH * .6, thick + .015, -.2, .36, 0).box(.08, torsoH * .6, thick + .015, .2, .36, 0); m.mat(TX.metal, 100).col(0xe8c040).box(.05, .05, .01, -.2, .5, -.165).box(.05, .05, .01, .2, .5, -.165); }
  if (S.hood && !S.toon) { m.mat(TX.cloth, 0).col(S.shirt2).box(wB * .6, .08, .02, 0, .22, -.165).box(.03, .2, .02, -.06, .5, -.165).box(.03, .2, .02, .06, .5, -.165); }
  if (c.armor) { m.mat(TX.cloth, 0).col(0xc9a865).box(wB + .05, torsoH * .78, thick + .05, 0, torsoH * .5, 0); m.mat(TX.metal, 50).col(c.armor === 3 ? 0x3a4a2a : c.armor === 2 ? 0x5d6e3a : 0x7a6a3a).box(wB * .38, torsoH * .3, .02, -wB * .22, torsoH * .58, -thick / 2 - .03).box(wB * .38, torsoH * .3, .02, wB * .22, torsoH * .58, -thick / 2 - .03); m.mat(TX.white, 0).col(0xd8352a).box(wB + .06, .05, thick + .06, 0, torsoH * .3, 0); }
  /* mochila / bomba nas costas */
  if (c.bomb) { m.push().tr(0, .36, thick / 2 + .12); drawCassava(m, { led: Math.sin((opt.time || 0) * 8) > 0 ? 1 : 0, scale: 1 }); m.pop(); } else if (c.chute) {                                     /* mochila do paraquedas com tirantes no peito */
    m.mat(TX.cloth, 0).col(0xc8913e).uvs(1, 1).box(wB * .86, torsoH * .8, .24, 0, torsoH * .5, thick / 2 + .12); m.mat(TX.cloth, 0).col(0xa8742c).box(wB * .7, torsoH * .3, .08, 0, torsoH * .32, thick / 2 + .27); m.mat(TX.metal, 120).col(0xe8c040).box(.06, .06, .02, -.12, torsoH * .32, thick / 2 + .31).box(.06, .06, .02, .12, torsoH * .32, thick / 2 + .31);
    m.mat(TX.cloth, 0).col(0x5a3a20); for (const sx of [-1, 1]) m.box(.07, torsoH * .95, .02, sx * .14, torsoH * .5, -thick / 2 - .012); m.box(wB + .02, .07, thick + .03, 0, torsoH * .42, 0); m.box(wB * .7, .06, .02, 0, torsoH * .7, -thick / 2 - .014);
  } else if (S.pack === 'canister') { m.mat(TX.cloth, 0).col(0x4a5a22).uvs(1, 1).box(wB * .72, torsoH * .7, .18, 0, torsoH * .5, thick / 2 + .09); m.mat(TX.glass, 140, 0, 0).col(0x7aff5a, 200).cyl(.07, .07, torsoH * .62, 10, -wB * .2, torsoH * .2, thick / 2 + .22, 3); m.mat(TX.white, 0, 0, 255).col(0x9aff6a).cyl(.045, .045, torsoH * .5, 8, -wB * .2, torsoH * .25, thick / 2 + .22, 3); m.mat(TX.metal, 120).col(0x8a8a80).cyl(.08, .08, .04, 10, -wB * .2, torsoH * .82, thick / 2 + .22, 3); }
  else if (S.id !== 'galinha' && !S.female && !S.toon && !HUMANO) { m.mat(TX.cloth, 0).col(S.shirt2).uvs(1, 1).box(wB * .7, torsoH * .62, .14, 0, torsoH * .5, thick / 2 + .07); }
  /* faixa de equipe */
  if (c.team) m.mat(TX.cloth, 0, 0, 40).col(c.team === 1 ? 0x2f7bff : 0xee3f35).uvs(1, 1).box(.22, .1, .23, -(wB / 2 + .11), torsoH - .15, 0).box(wB + .03, .05, thick + .03, 0, torsoH - .04, 0);
  if (c.farmer && !AL && typeof drawFarmerGear === 'function') drawFarmerGear(m, c.farmer, wB, torsoH, thick);
  /* cabeça */
  const pit = clamp(c.pitch || 0, -1.2, 1.2); m.push().tr(0, torsoH + (HUMANO ? .1 : .22), -.02).rx(-pit * (dead ? 0 : .8) * .6 + (dead ? -.3 : 0) + headX + flinch * (c.hitHead ? .5 : .15) + (E ? E.head[0] : 0)); if (E) m.ry(E.head[1]); { const hat = c.hatOff || (E && E.hatHand) ? '' : AL ? (S.hat === 'none' ? '' : S.hat) : hatOf(c.skin); if (HUMANO) { m.tr(0, .135, 0).sc(.7); drawHeadToon(m, S, hat, E, c.lod); } else drawHead(m, S, S.special, hat); if (E && E.nose) m.mat(TX.white, 120, 0, 110).col(0xff2a2a).sph(.065, .06, .06, 10, 8, 0, -.02, -.24); if (!AL && !c.hatOff && hatIdx(c.skin) === 0 && c.farmer && typeof drawFarmerHat === 'function') drawFarmerHat(m, c.farmer, S); } if (dv === 2 && dead > .6 && dead < 6) drawDizzy(m, opt.time || 0); m.pop();
  /* braços */
  const shY = torsoH - (HUMANO ? .07 : .1), so = HUMANO ? .045 : .1, rs = [wB / 2 + so, shY, 0], ls = [-(wB / 2 + so), shY, 0];
  const aim = hasW && c.wid !== 'faca' && c.wid !== 'batata'; const aimP = pit - (c.rel ? .5 : 0);
  if (E) { const hh = E.hatHand ? (AL ? (S.hat === 'none' ? 'straw' : S.hat) : (hatOf(c.skin) || 'straw')) : ''; drawArmEm(m, rs, 1, E.arms[0], S, bulk, hh); drawArmEm(m, ls, -1, E.arms[1], S, bulk, ''); }
  else if (c.pose && AL) drawAgentPose(m, c.pose, S, rs, ls, shY, wB, bulk, torsoH);
  else if (c.chute) {
    /* paraquedas aberto: mãos para cima segurando as linhas (mesmo ponto usado pelas cordas em CHUTE.hand); queda livre: braços abertos */
    const hand = sd => c.chute === 'open' ? [sd * .3, 2.02 - hipY, -.02] : [sd * .78, shY + .12, -.14];
    for (const sd of [-1, 1]) { const hp = hand(sd); limbTo(m, sd > 0 ? rs : ls, hp, .17 * bulk, .17 * bulk, TX.cloth, S.shirt); m.push().tr(hp[0], hp[1], hp[2]); m.mat(TX.white, 0).col(S.glove || S.skin).uvs(1, 1).box(.13, .13, .13); m.pop(); }
  } else if (hasW) {
    /* arma na altura do peito, apontando para (yaw, pitch) — transformada em local do torso */
    const p = aimP * .9, kick = (c.fire || 0) * .06, cx = .16, cy = shY - .2 + (c.wid === 'faca' ? -.12 : 0), cz = (HUMANO ? -.26 : -.32) + kick;
    const wr = [cx, cy, cz];
    const gr = rotPitch(wa.grip, p, wr), fr = rotPitch(wa.fore, p, wr);
    const slideF = c.fire ? 0 : 0;
    m.push().tr(wr[0], wr[1], wr[2]).rx(p).tr(0, 0, 0); if (c.wid === 'faca') { m.rx(-.3 - (c.fire || 0) * 1.0); } drawWeapon(m, c.wid, { sk: c.wsk, mag: c.rel ? Math.sin(c.rel * PI) : 0, bolt: 0, pull: c.fire ? 1 - (c.fire) : 0, fuse: 1 }); m.pop();
    if (HUMANO) { armToon(m, rs, gr, S, bulk); handToon(m, gr, S); } else { limbTo(m, rs, gr, .17 * bulk, .17 * bulk, TX.cloth, S.shirt); m.push().tr(gr[0], gr[1], gr[2]); m.mat(TX.white, 0).col(S.glove || S.skin).uvs(1, 1).box(.12, .12, .12); m.pop(); }
    if (aim) { if (HUMANO) { armToon(m, ls, fr, S, bulk); handToon(m, fr, S); } else { limbTo(m, ls, fr, .17 * bulk, .17 * bulk, TX.cloth, S.shirt); m.push().tr(fr[0], fr[1], fr[2]); m.mat(TX.white, 0).col(S.glove || S.skin).uvs(1, 1).box(.12, .12, .12); m.pop(); } }
    else drawArmFree(m, ls, -1, sw2 * .5, S, bulk);
  } else { drawArmFree(m, rs, 1, -sw * .8 - armUp * 2.6, S, bulk); drawArmFree(m, ls, -1, sw * .8 - armUp * 2.6, S, bulk); }
  m.pop(); m.pop();
}
/* queda com quique (cartoon) */
function deathBounce(t) { if (t < .7) { const k = t / .7; return k * k; } const k = (t - .7) / .3; return 1 - Math.sin(k * PI) * .12; }
/* estrelinhas girando sobre a cabeça (morte tonta) */
function drawDizzy(m, t) { m.mat(TX.white, 0, 0, 160).col(0xffe24a).uvs(1, 1); for (let k = 0; k < 4; k++) { const a = t * 4 + k * TAU / 4; m.push().tr(Math.cos(a) * .32, .4 + Math.sin(t * 6 + k) * .03, Math.sin(a) * .32).ry(t * 5).rz(.785); m.box(.08, .08, .03); m.pop(); } }
function rotPitch(a, p, o) { const cs = Math.cos(p), sn = Math.sin(p); return [o[0] + a[0], o[1] + a[1] * cs - a[2] * sn, o[2] + a[1] * sn + a[2] * cs]; }
function drawArmFree(m, sh, sd, ang, S, bulk) { if (S.toon || HUMANO) return drawArmFreeToon(m, sh, sd, ang, S, bulk); m.push().tr(sh[0], sh[1], sh[2]).rx(ang); m.mat(TX.cloth, 0).col(S.shirt).uvs(1, 1).box(.18 * bulk, .38, .2 * bulk, 0, -.19, 0); m.mat(TX.white, 0).col(S.glove ? S.skin : S.skin).box(.16 * bulk, .3, .18 * bulk, 0, -.45, 0); if (S.glove) m.mat(TX.cloth, 0).col(S.glove).box(.17 * bulk, .12, .19 * bulk, 0, -.62, 0); m.pop(); }
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
/* baú do Todos contra Todos: madeira com faixas de ferro e fechadura dourada (aberto = tampa para trás, vazio) */
function drawChest(m, it, t) {
  const open = it.k === 'chestO', ry = ((it.id | 0) * 1.7) % 6.283;
  m.push().tr(it.x, it.y, it.z).ry(ry);
  m.mat(TX.wood, 0).col(0x9a5a28).uvs(.6, .6).box(.95, .5, .6, 0, .25, 0);                              /* caixa */
  m.mat(TX.metal, 90).col(0x4a4a50).uvs(1, 1).box(.97, .07, .62, 0, .08, 0).box(.97, .07, .62, 0, .44, 0); /* faixas */
  m.box(.07, .52, .62, -.36, .26, 0).box(.07, .52, .62, .36, .26, 0);
  m.push().tr(0, .5, -.3).rx(open ? -1.9 : 0);                                                            /* tampa (dobradiça atrás) */
  m.mat(TX.wood, 0).col(0xb06a30).uvs(.6, .6).box(.95, .16, .6, 0, .08, .3);
  m.mat(TX.metal, 90).col(0x4a4a50).box(.07, .18, .62, -.36, .08, .3).box(.07, .18, .62, .36, .08, .3);
  if (!open) m.mat(TX.metal, 160, 0, 80).col(0xffc83a).box(.14, .16, .05, 0, .02, .62);                  /* fechadura dourada */
  m.pop();
  if (!open) { const g = .5 + Math.sin(t * 3 + it.x) * .5; m.mat(TX.white, 0, 0, 120).col(0xffd84a, 70 + g * 60).box(.02, .5 + g * .2, .02, -.25, .85, .1).box(.02, .4 + g * .25, .02, .2, .8, -.1); }   /* brilho: dá para achar de longe */
  m.pop();
}
function drawLootItem(m, it, t) {
  if (it.k === 'chest' || it.k === 'chestO') return drawChest(m, it, t);
  if (it.k === 'w' && typeof LootGLB !== 'undefined' && LootGLB.draw(it, t)) return;   /* arma no chão com o modelo 3D */
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
