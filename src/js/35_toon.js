/* =====================================================================
   35_toon.js — ESTILO CARTOON dos 7 personagens (fiel à arte oficial)
   Cabeça grande e arredondada, rosto expressivo (olhos grandes com íris
   e brilho, sobrancelhas marcadas, sorriso de canto, bochechas), cabelo em
   mechas, camisa de botão com gola e manga dobrada, calça cargo, tênis /
   botas com cadarço, macacões de galinha e de porco com capuz de bicho.
   Usado quando a skin tem toon:1 (os agentes do 5x5 têm visual próprio).
   ===================================================================== */
'use strict';
const TOON_HEAD = { rx: .215, ry: .235, rz: .205 };
/* z da superfície frontal da cabeça (elipsoide) no ponto (x,y) */
const tz = (x, y) => { const H = TOON_HEAD, k = 1 - (x / H.rx) ** 2 - (y / H.ry) ** 2; return -H.rz * Math.sqrt(Math.max(.02, k)) - .004; };
const HAIR_TUFTS = [
  /* x, y, z, rx, rz, w, h, d — franja varrida + topo bagunçado + nuca */
  [-.12, .17, -.14, -.5, .6, .13, .1, .16], [-.02, .19, -.16, -.6, .2, .14, .1, .16], [.09, .18, -.15, -.5, -.4, .13, .1, .16], [.16, .12, -.12, -.3, -.8, .09, .12, .13],
  [-.17, .11, -.11, -.3, .9, .08, .12, .12], [0, .24, -.04, .2, .1, .3, .08, .26], [-.1, .25, .06, .5, .4, .14, .08, .14], [.1, .25, .05, .5, -.4, .14, .08, .14],
  [-.16, .06, .1, 0, .2, .07, .22, .2], [.16, .06, .1, 0, -.2, .07, .22, .2],
  [-.05, .29, -.02, .3, .6, .08, .09, .1], [.06, .3, .01, .2, -.5, .07, .08, .1]
];
const FACE_BOX = { x0: -.172, x1: .172, y0: -.158, y1: .14 };
function drawToonFace(m, S, lod) {
  const B = FACE_BOX, N = lod ? 4 : 8, idx = Math.max(0, SKINS.indexOf(S)); m.mat(TX['tf' + idx] || TX.face, 30, 0, 0, 1).col(0xffffff).uvs(1, 1);
  const X = i => B.x1 - (B.x1 - B.x0) * i / N, Y = j => B.y1 - (B.y1 - B.y0) * j / N, P = (x, y) => [x, y, tz(x, y) - .003];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const xa = X(i), xb = X(i + 1), yt = Y(j), yb = Y(j + 1);
    m.quad(P(xa, yb), P(xb, yb), P(xb, yt), P(xa, yt), i / N, (j + 1) / N, (i + 1) / N, j / N); }
}
/* pinta o rosto de um personagem (256x256, fundo transparente) — olhos grandes com brilho, sobrancelhas, sorriso, bochechas */
function toonFaceTex(i) {
  const S = SKINS[i] || SKINS[0], c = cvs(), x = c.getContext('2d'), hx = h => '#' + (h >>> 0).toString(16).padStart(6, '0').slice(-6);
  const mix = (a, b, t) => { const A = [(a >> 16) & 255, (a >> 8) & 255, a & 255], B = [(b >> 16) & 255, (b >> 8) & 255, b & 255]; return '#' + A.map((v, k) => Math.round(v + (B[k] - v) * t).toString(16).padStart(2, '0')).join(''); };
  x.clearRect(0, 0, 256, 256); x.lineCap = 'round'; x.lineJoin = 'round';
  const eyeC = S.eye || 0x5a3418, skin = S.skin, line = '#24140c';
  /* bochechas */
  x.fillStyle = mix(skin, 0xff6a6a, .38); for (const cx of [44, 212]) { x.beginPath(); x.ellipse(cx, 178, 23, 13, 0, 0, TAU); x.fill(); }
  const eye = (cx, flip, wink) => {
    if (wink) { x.strokeStyle = line; x.lineWidth = 8; x.beginPath(); x.moveTo(cx - 30, 128); x.quadraticCurveTo(cx, 108, cx + 30, 128); x.stroke(); x.lineWidth = 5; x.beginPath(); x.moveTo(cx + flip * 30, 128); x.lineTo(cx + flip * 40, 136); x.stroke(); return; }
    x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx, 130, 36, 42, 0, 0, TAU); x.fill();
    const g = x.createLinearGradient(0, 100, 0, 162); g.addColorStop(0, mix(eyeC, 0x000000, .45)); g.addColorStop(.55, hx(eyeC)); g.addColorStop(1, mix(eyeC, 0xffffff, .45));
    x.fillStyle = g; x.beginPath(); x.ellipse(cx - flip * 3, 134, 29, 35, 0, 0, TAU); x.fill();
    x.strokeStyle = mix(eyeC, 0x000000, .6); x.lineWidth = 3; x.stroke();
    x.fillStyle = '#100a08'; x.beginPath(); x.ellipse(cx - flip * 3, 134, 14, 18, 0, 0, TAU); x.fill();
    x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx - flip * 3 - 10, 120, 9, 10, 0, 0, TAU); x.fill(); x.beginPath(); x.arc(cx - flip * 3 + 11, 150, 4.5, 0, TAU); x.fill();
    /* pálpebra superior grossa + cílio */
    x.strokeStyle = line; x.lineWidth = 9; x.beginPath(); x.ellipse(cx, 130, 37, 43, 0, PI * 1.06, PI * 1.94); x.stroke();
    x.lineWidth = 6; x.beginPath(); x.moveTo(cx + flip * 34, 110); x.lineTo(cx + flip * 46, 101); x.stroke();
    x.lineWidth = 2.5; x.strokeStyle = mix(skin, 0x000000, .35); x.beginPath(); x.ellipse(cx, 132, 32, 38, 0, PI * .25, PI * .75); x.stroke();
  };
  eye(66, -1, false); eye(190, 1, !!S.wink);
  /* sobrancelhas grossas e decididas */
  x.strokeStyle = mix(S.brows || S.hair || 0x3a2010, 0x000000, .35); x.lineWidth = 16;
  x.beginPath(); x.moveTo(32, 70); x.quadraticCurveTo(62, 60, 100, 80); x.stroke(); x.beginPath(); x.moveTo(224, 70); x.quadraticCurveTo(194, 60, 156, 80); x.stroke();
  /* nariz */
  x.strokeStyle = mix(skin, 0x000000, .28); x.lineWidth = 4; x.beginPath(); x.moveTo(120, 178); x.quadraticCurveTo(128, 184, 136, 178); x.stroke();
  /* sorriso de canto */
  x.strokeStyle = '#6a2416'; x.lineWidth = 7; x.beginPath(); x.moveTo(98, 212); x.quadraticCurveTo(130, 230, 166, 206); x.stroke(); x.lineWidth = 5; x.beginPath(); x.moveTo(166, 206); x.lineTo(172, 199); x.stroke();
  x.fillStyle = mix(skin, 0xff6a6a, .25); x.beginPath(); x.ellipse(132, 222, 12, 4, 0, 0, TAU); x.fill();
  return c;
}
function drawHeadToon(m, S, hat, E, lod, onlyHair) {
  const H = TOON_HEAD;
  if (!onlyHair) {   /* (onlyHair: só cabelo, barba, capuz e chapéu — usado sobre o corpo 3D do Meshy) */
  /* rosto */
  m.mat(TX.white, 30).col(S.skin).uvs(1, 1).sph(H.rx, H.ry, H.rz, lod ? 8 : 14, lod ? 6 : 10, 0, 0, 0);
  m.sph(.045, .06, .04, 6, 5, -H.rx + .005, -.01, .01).sph(.045, .06, .04, 6, 5, H.rx - .005, -.01, .01);          /* orelhas */
  if (!lod) m.sph(.024, .02, .022, 8, 6, 0, -.055, tz(0, -.055) + .012);   /* narizinho */
  /* rosto pintado (textura própria de cada personagem) aplicado numa malha curva */
  drawToonFace(m, S, lod);
  }
  /* barba cheia (Tonhão) */
  if (S.beard === 'full') {
    m.mat(TX.cloth, 0).col(S.hair).uvs(1, 1);
    m.sph(.2, .13, .16, 10, 7, 0, -.15, -.06); for (const sx of [-1, 1]) m.box(.05, .2, .14, sx * .19, -.05, -.02);
    m.push().tr(0, -.08, tz(0, -.08) - .008).box(.17, .03, .03).pop(); m.mat(TX.white, 0).col(0x6a2a1a).box(.07, .012, .012, .01, -.115, tz(0, -.115) - .02);
  }
  /* cabelo em mechas (não aparece com capuz) */
  if (!S.hood && !S.onesie) {
    m.mat(TX.cloth, 20).col(S.hair).uvs(1, 1).sph(.232, .225, .2, lod ? 8 : 12, lod ? 6 : 8, 0, .06, .05);   /* calota de cabelo (nuca e topo) */
    if (!lod) for (let k = 0; k < 5; k++) m.push().tr(-.14 + k * .07, -.08 + (k % 2) * .03, .19).rx(.3).sph(.05, .065, .035, 7, 5, 0, 0, 0).pop();   /* pontinhas na nuca */
    for (let i = 0; i < HAIR_TUFTS.length; i++) { if (lod && i % 2) continue; const t = HAIR_TUFTS[i]; if (hat && (hat === 'capBack' ? t[1] > .1 : (t[1] > .15 && t[2] > -.1))) continue; m.mat(TX.cloth, 20).col(i % 3 === 0 ? (S.hair2 || S.hair) : S.hair).uvs(1, 1); m.push().tr(t[0], t[1], t[2]).rx(t[3]).rz(t[4]).sph(t[5] * .62, t[6] * .7, t[7] * .62, lod ? 6 : 8, 5, 0, 0, 0).pop(); }
    if (S.leaves) { m.mat(TX.leaf, 0, 0, 0, 1).col(0x5ab83a); m.dquad([-.02, .3, 0], [.03, .3, 0], [.12, .4, -.02], [.02, .38, -.02]); m.dquad([-.02, .3, 0], [-.04, .3, 0], [-.14, .37, .02], [-.06, .39, .02]); }
  }
  /* capuz (moletom e macacões de bicho) */
  if (S.hood || S.onesie) {
    const c = S.onesie ? S.shirt : S.shirt, rim = S.hoodRim || c; m.mat(TX.cloth, 0).col(c).uvs(1, 1);
    m.sph(.275, .29, .255, lod ? 8 : 14, lod ? 6 : 10, 0, .03, .075);                                               /* calota */
    m.mat(TX.cloth, 0).col(rim); for (let k = 0; k <= 18; k++) { const a = -PI * .62 + k / 18 * PI * 1.24, x = Math.sin(a) * .225, y = Math.cos(a) * .25 - .02; m.sph(.052, .046, .055, 8, 5, x * 1.08, y * 1.04 + .01, tz(clamp(x, -.2, .2), clamp(y, -.22, .22)) + .035); }
    if (S.hood && !S.onesie && !lod) { /* mecha de cabelo saindo na testa */ m.mat(TX.cloth, 20).col(S.hair).push().tr(-.04, .17, -.16).rx(-.5).rz(.5).sph(.09, .04, .07, 8, 5, 0, 0, 0).pop().push().tr(.06, .16, -.17).rx(-.5).rz(-.3).sph(.07, .035, .06, 8, 5, 0, 0, 0).pop(); }
    if (S.onesie === 'chicken') {
      m.mat(TX.white, 60).col(0xf8b818); m.push().tr(0, .25, -.16).rx(-.3).sph(.07, .045, .09, 8, 6, 0, 0, -.03).pop(); m.mat(TX.white, 0).col(0xe08a10).sph(.06, .022, .08, 8, 4, 0, .22, -.2);
      m.mat(TX.white, 0).col(0x111111); for (const sx of [-1, 1]) m.sph(.024, .028, .012, 6, 4, sx * .09, .3, -.15); m.mat(TX.white, 0, 0, 80).col(0xffffff).sph(.007, .007, .005, 4, 3, .1, .31, -.16).sph(.007, .007, .005, 4, 3, -.08, .31, -.16);
      m.mat(TX.cloth, 0).col(0xe02222); m.sph(.055, .07, .05, 7, 5, 0, .37, .0).sph(.05, .065, .045, 7, 5, 0, .35, .09).sph(.045, .055, .04, 7, 5, 0, .34, -.08);
    } else if (S.onesie === 'pig') {
      m.mat(TX.cloth, 0).col(S.shirt); for (const sx of [-1, 1]) { m.push().tr(sx * .19, .3, .02).rz(-sx * .5).box(.12, .14, .05).pop(); } m.mat(TX.cloth, 0).col(0xe87aa0); for (const sx of [-1, 1]) m.push().tr(sx * .19, .3, .0).rz(-sx * .5).box(.07, .09, .02).pop();
      m.mat(TX.white, 40).col(0xf4a0bc).push().tr(0, .24, -.19).rx(PI / 2).cyl(.07, .07, .06, 12, 0, 0, 0, 3).pop(); m.mat(TX.white, 0).col(0x9a3a5a).box(.02, .03, .01, -.025, .24, -.226).box(.02, .03, .01, .025, .24, -.226);
      m.mat(TX.white, 0).col(0x111111); for (const sx of [-1, 1]) m.sph(.02, .024, .012, 6, 4, sx * .08, .3, -.16);
    }
  }
  /* chapéu */
  if (hat) { m.push().tr(0, -.035, 0).sc(1.07); drawHat(m, hat); m.pop(); }
}
/* tronco cartoon: gola, botões, bolso com etiqueta, faixas; moletom com bolso canguru e listras; macacão */
function capTo(m, a, b, r0, r1, col, tex, seg) {   /* cápsula de A até B (raio r0 em A, r1 em B) */
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || .001; seg = seg || 10;
  m.mat(tex === undefined ? TX.cloth : tex, 10).col(col).uvs(1, 1);
  m.push().tr(a[0], a[1], a[2]).ry(Math.atan2(-dx, -dz)).rx(Math.asin(clamp(dy / L, -1, 1))).rx(-PI / 2).cyl(r0, r1, L, seg, 0, 0, 0, 0).pop();
  m.sph(r0, r0, r0, seg, 6, a[0], a[1], a[2]); m.sph(r1, r1, r1, seg, 6, b[0], b[1], b[2]);
}
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/* =====================================================================
   CORPO HUMANOIDE (v7.4) — proporções reais para TODOS os personagens (5x5 e
   Todos contra Todos): pelve, abdômen, peitoral, ombros/deltoides, trapézio,
   pescoço; braço com cotovelo e perna com joelho resolvidos por IK de 2 ossos;
   mão com palma, quatro dedos e polegar; bota com cano, bico e sola.
   Cabeça, rosto, cabelo, chapéus e cores continuam os de cada personagem.
   ===================================================================== */
const HB = { up: .31, fore: .29, thigh: .47, shin: .44, foot: .07 };
const v3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: a => Math.hypot(a[0], a[1], a[2]) || 1e-6 };
v3.norm = a => v3.mul(a, 1 / v3.len(a));
/** IK de dois ossos: articulação do meio (cotovelo/joelho) puxada na direção do "polo" */
function ik2(a, b, L1, L2, pole) {
  const ab = v3.sub(b, a), d = Math.min(v3.len(ab), L1 + L2 - 1e-4), u = v3.norm(ab), ca = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
  let p = v3.sub(pole, v3.mul(u, v3.dot(pole, u))); if (v3.len(p) < 1e-4) p = [0, -1, 0]; p = v3.norm(p);
  return v3.add(a, v3.add(v3.mul(u, L1 * ca), v3.mul(p, L1 * sa)));
}
/** orienta o eixo +y local de A para B (mesma convenção de capTo) */
function aimY(m, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || .001; m.push().tr(a[0], a[1], a[2]).ry(Math.atan2(-dx, -dz)).rx(Math.asin(clamp(dy / L, -1, 1))).rx(-PI / 2); return L; }
/** mão humana: palma, quatro dedos levemente fechados e polegar (eixo +y = direção do antebraço) */
function humanHand(m, w, dir, S, sd, grip) {
  const col = S.onesie ? S.shirt : (S.glove || S.skin), tip = v3.add(w, v3.mul(dir, .1)); aimY(m, w, tip);
  m.mat(TX.white, 30).col(col).uvs(1, 1).sph(.042, .058, .022, 8, 5, 0, .045, 0);
  const curl = grip ? 1.25 : .45;
  for (let i = 0; i < 4; i++) { const x = (i - 1.5) * .019; m.push().tr(x, .095, 0).rx(-curl * .55).box(.016, .036, .017, 0, .016, 0).tr(0, .034, 0).rx(-curl * .55).box(.015, .03, .016, 0, .014, 0).pop(); }
  m.push().tr(sd * .036, .04, -.012).rz(sd * .7).rx(-.4).box(.017, .045, .018, 0, .02, 0).pop();
  m.pop();
}
/** braço humano de ombro A até mão B (cotovelo por IK): deltoide, bíceps, antebraço, punho e mão */
function humanArm(m, a, b, S, bulk, sd, grip) {
  const k = bulk || 1, full = S.sleeve === 'full' || (!S.toon && !S.crop && S.sleeve !== 'short'), el = ik2(a, b, HB.up, HB.fore, [sd * .55, -1, .45]);
  const fw = v3.norm(v3.sub(b, el)), wr = v3.sub(b, v3.mul(fw, .015));
  m.mat(TX.cloth, 10).col(S.shirt).uvs(1, 1).sph(.064 * k, .062 * k, .062 * k, 10, 6, a[0], a[1] - .01, a[2]);   /* deltoide */
  if (full) { capTo(m, a, el, .064 * k, .054 * k, S.shirt); capTo(m, el, wr, .053 * k, .043 * k, S.shirt); if (S.wrist || S.glove) capTo(m, lerp3(el, wr, .82), wr, .047 * k, .045 * k, S.wrist || S.glove); }
  else { const sl = lerp3(a, el, .55); capTo(m, a, sl, .064 * k, .06 * k, S.shirt); capTo(m, sl, el, .056 * k, .05 * k, S.skin, TX.white); m.mat(TX.cloth, 0).col(S.shirt2 || S.shirt); capTo(m, lerp3(a, el, .5), lerp3(a, el, .56), .065 * k, .063 * k, S.shirt2 || S.shirt); capTo(m, el, wr, .049 * k, .04 * k, S.skin, TX.white); }
  humanHand(m, b, fw, S, sd, grip);
}
/* tronco humanoide (origem no quadril, y para cima, frente = -z) */
function drawTorsoToon(m, S, wB, torsoH, thick, lod) {
  const R = wB / 2, k = thick / wB, seg = lod ? 8 : 14, fz = -thick / 2;
  m.push().sc(1, 1, k);
  m.mat(TX.cloth, 10).col(S.pants).uvs(1, 1).cyl(R * .86, R * .8, .14, seg, 0, -.06, 0, 1).sph(R * .86, .07, R * .86, seg, 5, 0, .02, 0);   /* pelve / quadril */
  const belly = S.crop ? S.skin : S.shirt;
  m.mat(S.crop ? TX.white : TX.cloth, 10).col(belly).cyl(R * .74, R * .84, torsoH * .5, seg, 0, .08, 0, 0);                                   /* abdômen (cintura fina) */
  m.mat(TX.cloth, 10).col(S.shirt).cyl(R * .86, R * 1.0, torsoH * .3, seg, 0, torsoH * .48, 0, 0);                                         /* caixa torácica */
  m.sph(R * 1.02, torsoH * .2, R * .9, seg, 6, 0, torsoH * .76, .01);                                                                          /* peito e ombros */
  m.sph(R * .7, torsoH * .14, R * .62, seg, 5, 0, torsoH * .9, .03);                                                                          /* trapézio */
  m.pop();
  /* peitoral e costas (volume muscular por baixo da roupa) */
  const pec = S.female ? .03 : .018; m.mat(TX.cloth, 10).col(S.shirt);
  for (const sx of [-1, 1]) { if (S.female) m.sph(R * .42, torsoH * .11, pec, 8, 4, sx * R * .4, torsoH * .7, fz * .97); m.sph(R * .4, torsoH * .16, .02, 8, 4, sx * R * .4, torsoH * .62, -fz * .93); }
  m.mat(TX.white, 20).col(S.skin).cyl(.058, .064, .12, 10, 0, torsoH * .93, -.005, 0);                                                         /* pescoço */
  /* cinto com fivela */
  m.push().sc(1, 1, k); m.mat(TX.cloth, 0).col(S.belt || S.pants2 || S.shirt2).cyl(R * .79, R * .79, .055, seg, 0, .07, 0, 0); m.pop();
  m.mat(TX.metal, 170).col(S.buckle || 0xd8b048).box(.065, .045, .012, 0, .095, fz * .82 - .012);
  if (lod) return;
  if (S.style === 'button' || S.plaid) {   /* gola, botões e bolsos de camisa */
    m.mat(TX.cloth, 0).col(S.shirt); for (const sx of [-1, 1]) m.push().tr(sx * .05, torsoH * .97, fz * .55 - .02).rz(sx * .6).rx(.3).box(.09, .05, .02).pop();
    m.mat(TX.white, 90).col(0xf6f2ea); for (let i = 0; i < 4; i++) m.sph(.011, .011, .006, 5, 4, 0, torsoH * (.84 - i * .14), fz * (i ? .98 : .9) - .004);
    if (S.plaid) { m.mat(TX.cloth, 0).col(S.plaid); for (const y of [.4, .62, .8]) { m.push().sc(1, 1, k).cyl(R * (y > .7 ? 1.01 : .9), R * (y > .7 ? 1.01 : .9), .02, seg, 0, torsoH * y, 0, 0).pop(); } }
  } else if (S.style === 'hoodie') {
    m.mat(TX.cloth, 0).col(S.shirt2 || S.shirt).box(wB * .5, .12, .02, 0, torsoH * .3, fz * .86 - .01);
    m.mat(TX.white, 30).col(0xf4f4f4); for (const sx of [-1, 1]) m.box(.01, .14, .01, sx * .04, torsoH * .8, fz * .95 - .006);
  }
  if (S.vest) { m.mat(TX.cloth, 0).col(S.vest); for (const sx of [-1, 1]) m.push().tr(sx * R * .55, torsoH * .55, 0).sc(1, 1, k * 1.04).cyl(R * .48, R * .5, torsoH * .62, 8, 0, -torsoH * .3, 0, 0).pop(); }
}
/* perna humanoide (no grupo da perna: quadril na origem, pé em -legH): coxa, joelho por IK, canela e bota */
function drawLegToon(m, S, bulk, legH, sd, lod) {
  const k = bulk || 1, seg = lod ? 7 : 11, ankle = [0, -legH + HB.foot, -.01], knee = ik2([0, 0, 0], ankle, HB.thigh, HB.shin, [0, 0, -1]);
  capTo(m, [0, -.02, 0], knee, .092 * k, .066 * k, S.pants, TX.cloth, seg);                                                 /* coxa */
  if (!lod) { const q = lerp3([0, -.02, -.03], knee, .45); m.mat(TX.cloth, 10).col(S.pants).sph(.07 * k, .14, .06 * k, 8, 5, q[0], q[1], q[2]); }    /* quadríceps */
  capTo(m, knee, ankle, .062 * k, .046 * k, S.pants, TX.cloth, seg);                                                        /* canela */
  if (!lod) { const cv = lerp3(knee, ankle, .3); m.mat(TX.cloth, 10).col(S.pants).sph(.055 * k, .1, .05 * k, 8, 5, cv[0], cv[1], cv[2] + .025); }   /* panturrilha */
  if (S.stripe && !lod) capTo(m, lerp3([0, 0, 0], knee, .1), lerp3(knee, ankle, .9), .012, .012, S.stripe);
  /* bota */
  const y0 = -legH, ch = S.shoe === 'chicken';
  m.mat(TX.cloth, 20).col(S.boots).uvs(1, 1).cyl(.06 * k, .066 * k, .17, seg, 0, y0 + .02, -.01, 1);                     /* cano */
  m.sph(.068 * k, .055, .13 * k, seg, 5, 0, y0 + .05, -.075);                                                                /* peito do pé e bico */
  if (ch) { m.mat(TX.white, 0).col(0xd84a1a); for (const a of [-.45, 0, .45]) m.push().tr(0, y0 + .03, -.08).ry(a).sph(.025, .02, .08, 6, 4, 0, 0, -.06).pop(); return; }
  m.mat(TX.white, 30).col(S.sole).sph(.074 * k, .024, .15 * k, seg, 4, 0, y0 + .02, -.065);                              /* sola */
  if (!lod) { m.mat(TX.white, 0).col(S.lace || S.sole || 0xf4f0e8); for (let i = 0; i < 3; i++) m.box(.07, .01, .012, 0, y0 + .085 + i * .028, -.12 + i * .02); }
}
/* braço cartoon antigo → braço humano (cotovelo por IK); a mão vem junto */
function armToon(m, a, b, S, bulk) { humanArm(m, a, b, S, bulk, a[0] >= 0 ? 1 : -1, true); }
function handToon(m, p, S) { }
/* braço solto (andando / parado): cotovelo levemente dobrado, mão relaxada */
function drawArmFreeToon(m, sh, sd, ang, S, bulk) {
  m.push().tr(sh[0], sh[1], sh[2]).rx(ang).rz(sd * .1); humanArm(m, [0, 0, 0], [sd * .015, -.53, -.09], S, bulk, sd, false); m.pop();
}
/* chapéus dos personagens (formato da arte) */
(function () {
  const base = drawHat;
  window.drawHat = function (m, hat) {
    if (hat === 'strawZe') {   /* palha amarela com franja desfiada e faixa marrom */
      m.mat(TX.hay, 20).col(0xf8c820).uvs(1.5, 1.5).cyl(.46, .46, .035, 18, 0, .19, 0, 3).cyl(.24, .21, .2, 14, 0, .2, 0, 3);
      m.mat(TX.hay, 0).col(0xf0b818); for (let k = 0; k < 22; k++) { const a = k / 22 * TAU; m.push().tr(Math.cos(a) * .48, .19, Math.sin(a) * .48).ry(-a).box(.06, .02, .035).pop(); }
      m.mat(TX.cloth, 0).col(0x8a3a1a).uvs(1, 1).cyl(.245, .24, .06, 14, 0, .23, 0, 0); return;
    }
    if (hat === 'capBack') {   /* boné laranja virado para trás */
      m.mat(TX.cloth, 20).col(0xf07a18).uvs(1, 1).sph(.235, .14, .235, 12, 6, 0, .17, 0); m.box(.48, .04, .48, 0, .17, 0);
      m.push().tr(0, .18, .27).rx(.2).box(.3, .025, .2).pop(); m.mat(TX.cloth, 0).col(0xd85a10).sph(.025, .02, .025, 6, 4, 0, .31, 0);
      m.mat(TX.white, 0).col(0x3a2414).box(.12, .06, .01, 0, .2, .24); return;
    }
    if (hat === 'safari') {   /* safári bege com faixa e fivela */
      m.mat(TX.cloth, 20).col(0xf0dca8).uvs(1, 1).cyl(.42, .44, .03, 18, 0, .17, 0, 3).cyl(.25, .23, .2, 14, 0, .18, 0, 3).sph(.23, .06, .23, 12, 4, 0, .38, 0);
      m.mat(TX.cloth, 0).col(0x6a3a1a).cyl(.255, .25, .06, 14, 0, .22, 0, 0); m.mat(TX.metal, 180).col(0xd8b048).box(.06, .055, .02, .0, .25, -.255); return;
    }
    if (hat === 'sprout') {   /* chapéu marrom gasto com broto */
      m.mat(TX.cloth, 20).col(0x9a5a24).uvs(1, 1).cyl(.42, .4, .035, 16, 0, .17, 0, 3).cyl(.25, .22, .2, 12, 0, .18, 0, 3);
      m.mat(TX.cloth, 0).col(0xa8a040).cyl(.255, .25, .05, 12, 0, .22, 0, 0); m.mat(TX.cloth, 0).col(0xe8c890).box(.06, .05, .02, .12, .24, -.21);
      m.mat(TX.leaf, 0, 0, 0, 1).col(0x5ab83a); m.box(.015, .1, .015, 0, .42, 0); m.dquad([0, .46, 0], [.02, .46, 0], [.14, .54, 0], [.06, .58, 0]); m.dquad([0, .46, 0], [-.02, .46, 0], [-.13, .53, 0], [-.05, .57, 0]); return;
    }
    base(m, hat);
  };
})();
