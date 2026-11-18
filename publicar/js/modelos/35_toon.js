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
function drawHeadToon(m, S, hat, E, lod) {
  const H = TOON_HEAD;
  /* rosto */
  m.mat(TX.white, 30).col(S.skin).uvs(1, 1).sph(H.rx, H.ry, H.rz, lod ? 8 : 14, lod ? 6 : 10, 0, 0, 0);
  m.sph(.045, .06, .04, 6, 5, -H.rx + .005, -.01, .01).sph(.045, .06, .04, 6, 5, H.rx - .005, -.01, .01);          /* orelhas */
  if (!lod) m.sph(.024, .02, .022, 8, 6, 0, -.055, tz(0, -.055) + .012);   /* narizinho */
  /* rosto pintado (textura própria de cada personagem) aplicado numa malha curva */
  drawToonFace(m, S, lod);
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
/* tronco arredondado (elíptico) + detalhes da roupa */
function drawTorsoToon(m, S, wB, torsoH, thick, lod) {
  const k = thick / wB, seg = lod ? 8 : 16, R = wB / 2;
  m.push().sc(1, 1, k);
  m.mat(TX.cloth, 10).col(S.shirt).uvs(1, 1).cyl(R * .9, R * 1.02, torsoH * .78, seg, 0, 0, 0, 1);       /* barriga → peito */
  m.sph(R * 1.02, torsoH * .24, R * 1.02, seg, 6, 0, torsoH * .78, 0);                                    /* ombros redondos */
  m.mat(TX.cloth, 0).col(S.belt || S.shirt2).cyl(R * .93, R * .93, .065, seg, 0, .04, 0, 0);                   /* faixa da cintura */
  m.pop();
  m.mat(TX.white, 20).col(S.skin).cyl(.075, .085, .1, 10, 0, torsoH * .92, -.01, 0);                          /* pescoço */
  if (lod) return;
  const fz = -thick / 2 - .004, bz = thick / 2 + .004;
  if (S.style === 'button') {
    m.mat(TX.cloth, 0).col(S.shirt); for (const sx of [-1, 1]) m.push().tr(sx * .065, torsoH - .03, fz - .012).rz(sx * .55).rx(.25).box(.12, .07, .025).pop();   /* gola */
    m.mat(TX.white, 20).col(S.skin).box(.07, .08, .01, 0, torsoH - .05, fz - .002);
    m.mat(TX.white, 90).col(0xf6f2ea); for (let i = 0; i < 4; i++) m.sph(.016, .016, .008, 6, 4, .02, torsoH - .14 - i * .11, fz - .008);
    m.mat(TX.cloth, 0).col(S.shirt2).box(.01, torsoH * .78, .006, -.004, torsoH * .46, fz - .004);
    for (const sx of [-1, 1]) { m.mat(TX.cloth, 0).col(S.shirt).box(.12, .1, .012, sx * wB * .25, torsoH * .62, fz - .01); m.mat(TX.cloth, 0).col(S.shirt2).box(.125, .03, .016, sx * wB * .25, torsoH * .68, fz - .012); }   /* bolsos com aba */
    m.mat(TX.white, 0).col(0xf4f4f4).box(.07, .022, .008, wB * .25, torsoH * .74, fz - .016);
    m.mat(TX.cloth, 0).col(S.shirt); m.box(wB * .8, .04, .012, 0, .14, bz + .004);                             /* barra para fora */
    if (S.strap) { m.mat(TX.cloth, 0).col(S.strap); m.push().tr(0, torsoH * .5, fz - .02).rz(.75).box(.05, torsoH * 1.25, .02).pop(); m.push().tr(0, torsoH * .5, bz + .02).rz(-.75).box(.05, torsoH * 1.25, .02).pop(); m.mat(TX.cloth, 0).col(0x7a4a24).box(.16, .14, .07, -wB * .55, .12, .02); m.mat(TX.metal, 160).col(0xd8b048).box(.03, .03, .01, -wB * .55, .14, -.02); }
    m.mat(TX.metal, 170).col(0xd8b048).box(.07, .05, .012, 0, .045, fz - .03);                                  /* fivela */
  } else if (S.style === 'hoodie') {
    m.push().sc(1, 1, k); m.mat(TX.cloth, 0).col(S.shirt2); m.cyl(R * 1.0, R * 1.0, .045, seg, 0, .2, 0, 0).cyl(R * 1.01, R * 1.01, .025, seg, 0, .28, 0, 0); m.pop();
    m.mat(TX.cloth, 0).col(S.shirt).box(wB * .6, .15, .02, 0, .3, fz - .012); m.mat(TX.cloth, 0).col(S.shirt2).box(wB * .6, .015, .022, 0, .37, fz - .013);   /* bolso canguru */
    m.mat(TX.white, 30).col(0xf4f4f4); for (const sx of [-1, 1]) { m.box(.014, .17, .012, sx * .05, torsoH - .13, fz - .014); m.sph(.014, .02, .014, 6, 4, sx * .05, torsoH - .225, fz - .014); }
    m.mat(TX.white, 0).col(0xe8e8f0).box(.07, .022, .008, wB * .25, torsoH * .72, fz - .012);
  } else if (S.style === 'onesie') {
    m.mat(TX.cloth, 0).col(S.shirt2).box(.01, torsoH * .8, .006, 0, torsoH * .48, fz - .004); m.mat(TX.white, 60).col(0xd8d4cc); for (let i = 0; i < 3; i++) m.sph(.014, .014, .007, 6, 4, 0, torsoH - .2 - i * .14, fz - .008);
    if (S.onesie === 'chicken') {
      m.mat(TX.cloth, 40).col(0xe02222); m.push().tr(0, torsoH - .05, fz - .03); for (const sx of [-1, 1]) m.push().rz(sx * .5).sph(.065, .042, .03, 8, 5, sx * .06, 0, 0).pop(); m.sph(.026, .026, .026, 6, 4, 0, 0, -.01); m.pop();
      m.mat(TX.cloth, 0).col(0xe6e0d4); for (let i = 0; i < 6; i++) m.push().tr(-.1 + i * .04, .24 + (i % 2) * .03, bz + .03).rx(.5).sph(.035, .1, .02, 6, 4, 0, 0, 0).pop();   /* rabo de penas */
      m.mat(TX.cloth, 0).col(0xece8e0); for (let i = 0; i < 6; i++) m.push().tr((i % 2 ? 1 : -1) * wB * .3, .2 + (i >> 1) * .14, fz - .006).rz((i % 2 ? -1 : 1) * .3).sph(.05, .028, .012, 6, 4, 0, 0, 0).pop();   /* penas no peito */
    }
    if (S.onesie === 'pig') { m.mat(TX.cloth, 0).col(0xf08ab0); m.push().tr(0, .18, bz + .05); for (let i = 0; i < 8; i++) { const a = i * .9; m.sph(.018, .018, .018, 6, 4, Math.cos(a) * (.03 + i * .004), Math.sin(a) * (.03 + i * .004), i * .006); } m.pop();
      m.mat(TX.cloth, 0).col(S.shirt).box(wB * .55, .14, .02, 0, .28, fz - .012); m.mat(TX.cloth, 0).col(S.shirt2).box(wB * .55, .014, .022, 0, .35, fz - .013); }
  }
}
/* perna cartoon (chamada dentro do grupo da perna): bolso cargo, barra larga, cadarço, sola, dedos de galinha */
/* perna cartoon completa (no grupo da perna: quadril na origem, pé em -legH) */
function drawLegToon(m, S, bulk, legH, sd, lod) {
  const r = .13 * bulk, seg = lod ? 7 : 12;
  capTo(m, [0, -.02, 0], [0, -legH * .78, 0], r * 1.05, r * .98, S.pants, TX.cloth, seg);
  m.mat(TX.cloth, 0).col(S.pants).cyl(r * 1.18, r * 1.1, .12, seg, 0, -legH * .86, 0, 0);                       /* barra larga e dobrada */
  if (!lod) {
    m.mat(TX.cloth, 0).col(S.pants2).cyl(r * 1.19, r * 1.19, .025, seg, 0, -legH * .78, 0, 0);
    if (S.cargo) { m.mat(TX.cloth, 0).col(S.pants2); m.push().tr(sd * (r + .012), -legH * .45, 0).box(.035, .17, .17).pop(); m.mat(TX.cloth, 0).col(S.pants).box(.04, .04, .18, sd * (r + .016), -legH * .37, 0); m.mat(TX.white, 60).col(0xd8d0c0).sph(.012, .012, .012, 4, 3, sd * (r + .04), -legH * .37, 0); }
    if (S.stripe) m.mat(TX.cloth, 0).col(S.stripe).box(.014, legH * .74, .05, sd * (r + .004), -legH * .42, 0);
  }
  /* calçado */
  const y0 = -legH;
  if (S.shoe === 'chicken') {
    m.mat(TX.white, 60).col(S.boots).cyl(.12 * bulk, .14 * bulk, .2, seg, 0, y0 + .02, 0, 1); m.mat(TX.white, 0).col(0xd84a1a).cyl(.142 * bulk, .142 * bulk, .03, seg, 0, y0 + .16, 0, 0);
    m.mat(TX.white, 60).col(S.boots); for (const a of [-.5, 0, .5]) m.push().tr(0, y0 + .05, -.06).ry(a).sph(.045, .045, .11, 7, 5, 0, 0, -.1).pop(); return;
  }
  m.mat(TX.cloth, 20).col(S.boots).uvs(1, 1).cyl(.12 * bulk, .125 * bulk, .16, seg, 0, y0 + .03, .02, 2);              /* cano */
  m.sph(.13 * bulk, .1, .19 * bulk, seg, 6, 0, y0 + .08, -.07);                                                            /* bico arredondado */
  m.mat(TX.white, 30).col(S.sole).sph(.145 * bulk, .045, .23 * bulk, seg, 4, 0, y0 + .03, -.05);                        /* sola grossa */
  if (lod) return;
  m.mat(TX.white, 0).col(S.lace || 0xf4f0e8); for (let i = 0; i < 3; i++) { const z = -.13 * bulk - i * .02, y = y0 + .1 + i * .035; m.push().tr(0, y, z).rz(.5).box(.1, .014, .016).pop(); m.push().tr(0, y, z).rz(-.5).box(.1, .014, .016).pop(); }
  if (S.shoe === 'sneaker') { m.mat(TX.white, 40).col(S.shoe2 || 0x8a4ae8); m.push().tr(sd * .12 * bulk, y0 + .1, -.05).rz(sd * .2).box(.015, .05, .16).pop(); m.mat(TX.white, 30).col(0xffffff).cyl(.126 * bulk, .126 * bulk, .03, seg, 0, y0 + .17, .02, 0); }
}
/* braço cartoon de A até B: manga (curta ou comprida), punho/faixa e antebraço de pele */
/* braço cartoon de A até B: manga (curta ou comprida), faixa, antebraço */
function armToon(m, a, b, S, bulk) {
  const full = S.sleeve === 'full', r = .095 * bulk, mid = lerp3(a, b, full ? 1 : .5);
  capTo(m, a, mid, r * 1.12, r * 1.02, S.shirt);
  if (!full) { capTo(m, mid, b, r * .78, r * .72, S.skin, TX.white); capTo(m, lerp3(a, b, .44), lerp3(a, b, .52), r * 1.16, r * 1.16, S.shirt2); }
  else { if (S.wrist) capTo(m, lerp3(a, b, .86), b, r * 1.08, r * 1.04, S.wrist); if (S.style === 'hoodie') capTo(m, lerp3(a, b, .55), lerp3(a, b, .62), r * 1.12, r * 1.1, S.shirt2); }
}
function handToon(m, p, S) { m.push().tr(p[0], p[1], p[2]); m.mat(TX.white, 30).col(S.onesie ? S.shirt : S.skin).uvs(1, 1).sph(.078, .074, .085, 9, 6, 0, 0, 0).sph(.03, .04, .03, 6, 4, .05, .03, -.03); m.pop(); }
/* braço solto (andando / parado) */
/* braço solto (andando / parado) */
function drawArmFreeToon(m, sh, sd, ang, S, bulk) {
  m.push().tr(sh[0], sh[1], sh[2]).rx(ang).rz(sd * .1);
  const full = S.sleeve === 'full', r = .095 * bulk;
  if (full) { capTo(m, [0, 0, 0], [0, -.56, 0], r * 1.12, r * 1.02, S.shirt); if (S.style === 'hoodie') m.mat(TX.cloth, 0).col(S.shirt2).cyl(r * 1.13, r * 1.12, .045, 10, 0, -.33, 0, 0); if (S.wrist) m.mat(TX.cloth, 0).col(S.wrist).cyl(r * 1.1, r * 1.08, .08, 10, 0, -.57, 0, 0); }
  else { capTo(m, [0, 0, 0], [0, -.28, 0], r * 1.12, r * 1.06, S.shirt); m.mat(TX.cloth, 0).col(S.shirt2).cyl(r * 1.17, r * 1.17, .045, 10, 0, -.3, 0, 0); capTo(m, [0, -.3, 0], [0, -.56, 0], r * .78, r * .72, S.skin, TX.white); }
  m.mat(TX.white, 30).col(S.onesie ? S.shirt : S.skin).sph(.08, .078, .088, 9, 6, 0, -.64, 0).sph(.03, .04, .03, 6, 4, sd * .055, -.6, -.03);
  m.pop();
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
