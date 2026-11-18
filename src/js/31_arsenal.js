/* =====================================================================
   31_arsenal.js — ARSENAL CENTRALIZADO (identidade visual única)
   Um único modelo 3D por item é usado em TODOS os lugares:
     • arma na mão (primeira pessoa)   • arma no personagem (terceira pessoa)
     • item no chão (loot)             • ícone da barra / mochila / loja
   Os ícones e as imagens da loja são renderizados a partir desse mesmo modelo
   (Renderer.renderIcon), então a arma comprada, a do inventário e a segurada
   têm sempre o mesmo formato e as mesmas cores.
   Convenção local de arma: origem na mão direita, +X direita, +Y cima, −Z frente.
   ===================================================================== */
'use strict';
/* paleta cartoon compartilhada */
const GM = { blk: 0x2a2d33, gun: 0x3b3f48, steel: 0x9ca4ae, chrome: 0xdfe5ec, brass: 0xe2b24a, woodL: 0xd0914c, woodM: 0xae6630, woodD: 0x6e3818, rub: 0x27272c, red: 0xd8352a, orange: 0xef7a26, corn: 0xf7c93a, husk: 0x6fae3a };
/* pontos de ancoragem (mão direita = grip, mão esquerda = fore, boca, carregador, mira) */
const WANCH = {
  galho: { grip: [0, -.09, .07], fore: [0, -.055, -.31], muzzle: [0, .012, -.8], eject: [.04, .03, -.04], mag: [0, -.14, -.1], ads: [.1, -.155, -.42], adsFov: .9, len: .95 },
  estilingue: { grip: [0, -.1, .0], fore: [0, .03, .02], muzzle: [0, .1, -.06], eject: [0, 0, 0], mag: [0, 0, 0], ads: [.12, -.17, -.5], adsFov: .85, len: .3 },
  vassoura: { grip: [0, -.1, .12], fore: [0, -.06, -.42], muzzle: [0, .03, -1.12], eject: [.04, .03, .02], mag: [0, -.1, -.0], ads: [0, -.118, -.2], adsFov: .35, len: 1.7 },
  porteira: { grip: [0, -.1, .1], fore: [0, -.06, -.29], muzzle: [0, .022, -.72], eject: [0, .03, .0], mag: [0, 0, 0], ads: [.1, -.16, -.42], adsFov: .9, len: .9, hinge: [0, -.035, -.085] },
  colher: { grip: [0, -.09, .085], fore: [0, -.1, -.2], muzzle: [0, .008, -.42], eject: [.03, .04, -.0], mag: [0, -.12, -.075], ads: [.1, -.15, -.38], adsFov: .85, len: .75 },
  faca: { grip: [0, 0, .03], fore: [0, 0, 0], muzzle: [0, 0, -.3], eject: [0, 0, 0], mag: [0, 0, 0], ads: [0, 0, 0], adsFov: 1, len: .55 },
  batata: { grip: [0, 0, 0], fore: [0, 0, 0], muzzle: [0, 0, -.05], eject: [0, 0, 0], mag: [0, 0, 0], ads: [0, 0, 0], adsFov: 1, len: .15 },
  mandioca: { grip: [.06, -.04, .0], fore: [-.07, -.04, -.0], muzzle: [0, 0, 0], eject: [0, 0, 0], mag: [0, 0, 0], ads: [0, 0, 0], adsFov: 1, len: .4 }
};
/* prisma: polígono convexo no plano (z,y) extrudado em x ∈ [x0−hw, x0+hw] */
function prism(m, pts, hw, x0) {
  x0 = x0 || 0; const n = pts.length, P = (i, s) => [x0 + s * hw, pts[i][1], pts[i][0]];
  for (let i = 1; i < n - 1; i++) { m.quad(P(0, 1), P(i, 1), P(i + 1, 1), P(i + 1, 1)); m.quad(P(0, -1), P(i + 1, -1), P(i, -1), P(i, -1)); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; m.quad(P(i, 1), P(i, -1), P(j, -1), P(j, 1)); }
}
/* anel (pino de granada etc.) no plano XY */
function ring(m, r, t, n, ox, oy, oz) { for (let i = 0; i < n; i++) { const a = i / n * TAU; m.push().tr(ox + Math.cos(a) * r, oy + Math.sin(a) * r, oz).rz(a).box(t, r * TAU / n * 1.15, t).pop(); } }
/* tubo entre dois pontos (elásticos, varetas) */
function rod(m, a, b, w, tex, col, spec) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || .001; m.push().tr((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2).ry(Math.atan2(-dx, -dz)).rx(Math.asin(dy / L)); bx(m, tex, col, spec || 0, w, w, L, 0, 0, 0); m.pop(); }

/* ======================= ARMAS ======================= */
const WMODEL = {
  /* ROÇADEIRA — fuzil automático: corpo laranja de roçadeira, faixa de aviso, madeira, carregador curvo com visor de milho */
  galho(m, st) {
    const mag = st.mag || 0, bolt = st.bolt || 0;
    bx(m, TX.metal, GM.orange, 55, .072, .1, .34, 0, 0, -.03);                                   /* receptor */
    bx(m, TX.metal, GM.gun, 80, .066, .028, .3, 0, .062, -.03);                                  /* tampa */
    for (let i = 0; i < 5; i++) bx(m, TX.metal, GM.blk, 60, .07, .006, .012, 0, .078, -.14 + i * .045);
    for (let i = 0; i < 6; i++) bx(m, TX.white, i % 2 ? 0x26262a : 0xffd23a, 10, .075, .024, .02, 0, -.024, -.15 + i * .02);   /* faixa de aviso */
    m.push().tr(-.038, .006, .07).rz(PI / 2); m.mat(TX.metal, 90).col(0xffd23a).uvs(1, 1).cyl(.021, .021, .012, 12, 0, 0, 0, 3); m.mat(TX.metal, 60).col(GM.blk).cyl(.008, .008, .016, 8, 0, 0, 0, 3); m.pop();  /* tampa do tanque */
    bx(m, TX.metal, GM.blk, 60, .074, .012, .06, 0, -.044, .06);                                 /* gatilho / ação */
    bx(m, TX.wood, GM.woodM, 15, .082, .086, .27, 0, -.004, -.335, 1.4);                         /* guarda-mão */
    bx(m, TX.wood, GM.woodL, 10, .084, .02, .25, 0, .032, -.335, 1.4);
    for (const z of [-.205, -.465]) bx(m, TX.metal, GM.gun, 90, .088, .094, .018, 0, -.004, z);
    zcyl(m.mat(TX.metal, 100).col(GM.gun).uvs(1, 1), .013, .013, .3, -.18, 0, .064, 8);            /* tubo de gás */
    zcyl(m.mat(TX.metal, 110).col(GM.blk).uvs(1, 1), .017, .017, .26, -.46, 0, .012, 10);          /* cano */
    zcyl(m.mat(TX.metal, 120).col(GM.gun).uvs(1, 1), .028, .025, .08, -.71, 0, .012, 10);          /* freio de boca */
    for (const s of [-1, 1]) bx(m, TX.metal, GM.blk, 40, .006, .016, .05, s * .026, .012, -.75);
    bx(m, TX.metal, GM.gun, 80, .012, .05, .02, 0, .05, -.63); bx(m, TX.metal, GM.gun, 80, .044, .01, .022, 0, .083, -.63);
    for (const s of [-1, 1]) bx(m, TX.metal, GM.gun, 80, .006, .036, .022, s * .019, .066, -.63);
    m.mat(TX.white, 0, 0, 90).col(0xff5a2a).box(.008, .008, .006, 0, .077, -.618);                 /* ponto luminoso da massa */
    bx(m, TX.metal, GM.gun, 80, .044, .03, .03, 0, .09, .06); bx(m, TX.metal, GM.blk, 30, .012, .012, .032, 0, .104, .06);
    m.push().tr(0, -.1, .078).rx(-.3); bx(m, TX.rubber, GM.rub, 10, .046, .13, .06, 0, 0, 0); for (let i = 0; i < 3; i++) bx(m, TX.rubber, 0x44444c, 0, .05, .01, .063, 0, -.035 + i * .033, -.002); m.pop();
    bx(m, TX.metal, GM.gun, 60, .012, .008, .1, 0, -.09, .005); bx(m, TX.metal, GM.gun, 60, .012, .04, .008, 0, -.072, -.045); bx(m, TX.metal, GM.brass, 120, .008, .03, .008, 0, -.068, .008);
    m.push().tr(0, -.022, .14); bx(m, TX.wood, GM.woodM, 15, .056, .1, .08, 0, 0, .03, 1.3);
    m.push().tr(0, -.025, .16).rx(.12); bx(m, TX.wood, GM.woodM, 15, .056, .118, .2, 0, 0, 0, 1.3); bx(m, TX.wood, GM.woodL, 10, .058, .024, .19, 0, .05, -.005, 1.3); bx(m, TX.rubber, GM.rub, 0, .062, .13, .026, 0, 0, .11); m.pop(); m.pop();
    m.push().tr(.03, .0, .2).rz(PI / 2); m.mat(TX.metal, 100).col(GM.steel).uvs(1, 1).cyl(.008, .008, .012, 8, 0, 0, 0, 3); m.pop();   /* argola da bandoleira */
    if (!st.noMag) { m.push().tr(0, -.05 - mag * .3, -.09 + mag * .06).rx(mag * .35); drawMag(m, 'galho'); m.pop(); }
    bx(m, TX.metal, GM.steel, 130, .03, .016, .04, .046, .028, .02 + bolt * .07);                /* alavanca de armar */
  },
  /* CHUVA DE MILHO — metralhadora: corpo verde-palha, carregador em forma de espiga, mira de ponto vermelho, coronha de arame */
  colher(m, st) {
    const mag = st.mag || 0, bolt = st.bolt || 0;
    bx(m, TX.metal, 0x4f9a3a, 45, .066, .09, .26, 0, 0, -.02);
    bx(m, TX.metal, GM.blk, 70, .05, .016, .24, 0, .053, -.02); for (let i = 0; i < 6; i++) bx(m, TX.metal, GM.gun, 60, .056, .008, .01, 0, .064, -.12 + i * .04);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) bx(m, TX.white, 0xf7c93a, 30, .004, .014, .014, s * .034, .014 - j * .024, -.1 + i * .028 + j * .014);
    bx(m, TX.metal, 0x3a7a2e, 40, .068, .02, .26, 0, -.035, -.02);
    /* mira de ponto vermelho */
    bx(m, TX.metal, GM.blk, 80, .036, .008, .05, 0, .065, .02);
    bx(m, TX.metal, GM.gun, 90, .034, .03, .006, 0, .083, -.002); bx(m, TX.metal, GM.gun, 90, .034, .006, .04, 0, .098, .016); for (const s of [-1, 1]) bx(m, TX.metal, GM.gun, 90, .005, .03, .04, s * .0145, .083, .016);
    m.mat(TX.white, 120, 0, 20).col(0x6ab8ff).box(.024, .022, .002, 0, .083, -.006); m.mat(TX.white, 0, 0, 127).col(0xff2a2a).box(.005, .005, .003, 0, .083, -.004);
    /* camisa perfurada + cano */
    zcyl(m.mat(TX.metal, 90).col(GM.gun).uvs(1, 1), .028, .028, .15, -.15, 0, .008, 12);
    for (let i = 0; i < 4; i++) zcyl(m.mat(TX.metal, 40).col(0x16181c).uvs(1, 1), .0286, .0286, .012, -.17 - i * .033, 0, .008, 12);
    zcyl(m.mat(TX.metal, 110).col(GM.blk).uvs(1, 1), .013, .013, .07, -.3, 0, .008, 8);
    zcyl(m.mat(TX.metal, 90).col(GM.corn).uvs(1, 1), .021, .016, .05, -.37, 0, .008, 10);       /* quebra-chamas de espiga */
    m.push().tr(0, -.072, -.2).rx(.1); bx(m, TX.rubber, GM.rub, 10, .034, .085, .04, 0, -.02, 0); m.pop();
    m.push().tr(0, -.09, .085).rx(-.25); bx(m, TX.wood, GM.woodL, 15, .044, .12, .055, 0, 0, 0, 1.3); bx(m, TX.wood, GM.woodD, 10, .047, .02, .058, 0, -.062, 0); m.pop();
    bx(m, TX.metal, GM.gun, 60, .012, .008, .09, 0, -.084, .03); bx(m, TX.metal, GM.brass, 120, .008, .028, .008, 0, -.06, .03);
    for (const s of [-1, 1]) zcyl(m.mat(TX.metal, 110).col(GM.steel).uvs(1, 1), .006, .006, .17, .29, s * .022, .0, 6);   /* coronha de arame */
    bx(m, TX.metal, 0x4f9a3a, 45, .06, .085, .022, 0, -.012, .29); bx(m, TX.rubber, 0x6a6e76, 0, .062, .087, .008, 0, -.012, .304); bx(m, TX.metal, GM.steel, 100, .05, .008, .008, 0, .03, .285);
    if (!st.noMag) { m.push().tr(0, -.044 - mag * .28, -.075 + mag * .06); drawMag(m, 'colher'); m.pop(); }
    bx(m, TX.metal, GM.steel, 130, .02, .016, .04, -.042, .03, .06 + bolt * .05);
  },
  /* ARREGAÇA-PORTEIRA — escopeta de cano duplo que abre na dobradiça; coronha de tábuas de porteira */
  porteira(m, st) {
    const brk = st.brk || 0, out = st.shellOut || 0, A = WANCH.porteira;
    bx(m, TX.metal, 0xc4cad2, 140, .068, .08, .115, 0, .0, -.025);                             /* báscula prateada */
    for (const y of [-.024, .024]) bx(m, TX.metal, GM.brass, 150, .07, .006, .09, 0, y, -.025);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) m.mat(TX.metal, 150).col(GM.brass).uvs(1, 1).sph(.006, .006, .006, 6, 4, s * .035, 0, -.06 + i * .03);
    m.push().tr(0, .045, .035).ry(-brk * .5); bx(m, TX.metal, GM.steel, 130, .018, .012, .05, 0, 0, -.01); m.pop();   /* chave de abertura */
    bx(m, TX.metal, GM.gun, 60, .012, .008, .1, 0, -.078, .01); bx(m, TX.metal, GM.brass, 130, .008, .03, .008, 0, -.058, -.012); bx(m, TX.metal, GM.brass, 130, .008, .03, .008, 0, -.058, .016);
    m.push().tr(0, -.1, .085).rx(-.38); bx(m, TX.wood, GM.woodD, 15, .046, .1, .052, 0, 0, 0, 1.3); m.pop();
    /* coronha "porteira": madeira + duas tábuas + travessa em diagonal + parafusos */
    m.push().tr(0, -.04, .05).rx(.17);
    bx(m, TX.wood, GM.woodM, 15, .056, .1, .34, 0, 0, .17, 1.2);
    for (const y of [.032, -.03]) bx(m, TX.plank2, 0xe8b878, 0, .062, .024, .31, 0, y, .17, 1);
    m.push().tr(0, 0, .17).rx(.3); bx(m, TX.plank2, 0xdca86a, 0, .064, .016, .3, 0, 0, 0, 1); m.pop();
    for (const [y, z] of [[.032, .05], [.032, .29], [-.03, .05], [-.03, .29], [0, .17]]) for (const s of [-1, 1]) m.mat(TX.metal, 140).col(GM.brass).uvs(1, 1).sph(.006, .006, .006, 6, 4, s * .033, y, z);
    bx(m, TX.rubber, 0x6a2a1a, 0, .062, .11, .026, 0, 0, .345); m.pop();
    /* canos (giram na dobradiça) */
    const h = A.hinge; m.push().tr(h[0], h[1], h[2]).rx(-brk * .62).tr(-h[0], -h[1], -h[2]);
    for (const s of [-1, 1]) {
      zcyl(m.mat(TX.metal, 125).col(0x30343b).uvs(1, 1), .022, .021, .6, -.085, s * .0225, .022, 12);
      zcyl(m.mat(TX.metal, 150).col(GM.chrome).uvs(1, 1), .0235, .0235, .016, -.67, s * .0225, .022, 12);
      zcyl(m.mat(TX.white, 0).col(0x08080a).uvs(1, 1), .014, .014, .004, -.684, s * .0225, .022, 8);
      zcyl(m.mat(TX.metal, 150).col(GM.brass).uvs(1, 1), .023, .023, .01, -.082, s * .0225, .022, 12);   /* culatras */
    }
    bx(m, TX.metal, GM.gun, 100, .012, .008, .58, 0, .047, -.38); m.mat(TX.metal, 150).col(GM.brass).uvs(1, 1).sph(.007, .007, .007, 6, 4, 0, .055, -.66);
    bx(m, TX.metal, 0x22252a, 60, .02, .02, .55, 0, .0, -.37);
    bx(m, TX.metal, 0xc4cad2, 140, .064, .046, .05, 0, -.004, -.105);
    bx(m, TX.wood, GM.woodM, 15, .064, .036, .21, 0, -.025, -.29, 1.3); bx(m, TX.wood, GM.woodD, 10, .066, .012, .13, 0, -.03, -.29);
    if (brk > .05) for (const s of [-1, 1]) {
      if (st.nl !== undefined && (s < 0 ? 0 : 1) >= st.nl) continue;
      m.push().tr(s * .0225, .022, -.088 + out * .16); zcyl(m.mat(TX.cloth, 20).col(0xd8352a).uvs(1, 1), .019, .019, .06, .0, 0, 0, 10); zcyl(m.mat(TX.metal, 150).col(GM.brass).uvs(1, 1), .021, .021, .014, .012, 0, 0, 10); m.pop();
    }
    m.pop();
  },
  /* ESPINGARDA DO CORONEL — precisão: cano longo, luneta grande, nogueira com detalhes dourados, bipé recolhido */
  vassoura(m, st) {
    const bolt = st.bolt || 0, wal = 0x7c3e1a;
    bx(m, TX.wood, wal, 20, .058, .07, .6, 0, -.032, -.14, 1.2); bx(m, TX.wood, wal, 20, .05, .05, .14, 0, -.03, -.5, 1.2);
    bx(m, TX.wood, 0x5e2c12, 10, .06, .014, .3, 0, -.06, -.3);                                   /* ranhuras do guarda-mão */
    m.push().tr(0, -.05, .2).rx(.1); bx(m, TX.wood, wal, 20, .056, .13, .26, 0, -.012, .1, 1.2); bx(m, TX.wood, 0x93491f, 15, .06, .032, .16, 0, .066, .08, 1.2); bx(m, TX.rubber, 0x8a2a22, 0, .062, .14, .026, 0, -.012, .236); bx(m, TX.metal, GM.brass, 140, .063, .012, .012, 0, .045, .0); m.pop();
    m.push().tr(0, -.1, .12).rx(-.35); bx(m, TX.wood, 0x6a3216, 15, .044, .11, .052, 0, 0, 0, 1.3); m.pop();
    for (const z of [-.36, -.08]) bx(m, TX.metal, GM.brass, 150, .062, .076, .012, 0, -.032, z);
    for (const s of [-1, 1]) { m.push().tr(s * .031, -.06, .25).rz(PI / 2); m.mat(TX.metal, 150).col(GM.brass).uvs(1, 1).cyl(.015, .015, .004, 12, 0, -.002, 0, 3); m.mat(TX.metal, 100).col(0xb03020).cyl(.009, .009, .006, 10, 0, -.003, 0, 3); m.pop(); }  /* medalha do coronel */
    zcyl(m.mat(TX.metal, 130).col(0xaab2bc).uvs(1, 1), .03, .03, .25, .11, 0, .03, 14);
    bx(m, TX.metal, GM.blk, 60, .004, .03, .07, .031, .03, .0);                                    /* janela de ejeção */
    m.push().tr(0, .03, .06 + bolt * .09); bx(m, TX.metal, GM.chrome, 140, .06, .012, .012, .03, 0, 0); m.mat(TX.metal, 140).col(GM.chrome).uvs(1, 1).sph(.015, .015, .015, 8, 6, .062, -.004, 0); m.pop();
    zcyl(m.mat(TX.metal, 120).col(GM.blk).uvs(1, 1), .019, .015, .9, -.14, 0, .03, 10);
    zcyl(m.mat(TX.metal, 120).col(GM.gun).uvs(1, 1), .027, .027, .075, -1.0, 0, .03, 12); for (const s of [-1, 1]) bx(m, TX.metal, 0x111214, 20, .006, .02, .04, s * .025, .03, -1.04);
    /* luneta */
    for (const z of [-.1, .07]) { bx(m, TX.metal, GM.blk, 80, .026, .05, .026, 0, .075, z); zcyl(m.mat(TX.metal, 90).col(GM.blk).uvs(1, 1), .031, .031, .02, z + .01, 0, .12, 12); }
    zcyl(m.mat(TX.metal, 95).col(0x262a30).uvs(1, 1), .026, .026, .34, .13, 0, .12, 14);
    zcyl(m.mat(TX.metal, 95).col(0x262a30).uvs(1, 1), .038, .027, .08, .21, 0, .12, 14);
    zcyl(m.mat(TX.metal, 95).col(0x262a30).uvs(1, 1), .027, .047, .09, -.21, 0, .12, 14); zcyl(m.mat(TX.metal, 95).col(0x262a30).uvs(1, 1), .047, .047, .04, -.3, 0, .12, 14);
    zcyl(m.mat(TX.metal, 150).col(GM.brass).uvs(1, 1), .048, .048, .008, -.335, 0, .12, 14); zcyl(m.mat(TX.metal, 150).col(GM.brass).uvs(1, 1), .039, .039, .008, .2, 0, .12, 14);
    zcyl(m.mat(TX.white, 140, 0, 30).col(0x4aa0ff).uvs(1, 1), .041, .041, .004, -.338, 0, .12, 14); zcyl(m.mat(TX.white, 160, 0, 0).col(0x10182a).uvs(1, 1), .033, .033, .004, .212, 0, .12, 14);
    m.mat(TX.white, 0, 0, 100).col(0xd8f0ff).box(.012, .012, .002, -.012, .135, -.341);
    m.push().tr(0, .145, -.03); m.mat(TX.metal, 100).col(0x2e3238).uvs(1, 1).cyl(.016, .016, .03, 12, 0, 0, 0, 3); m.mat(TX.metal, 150).col(GM.brass).cyl(.017, .017, .006, 12, 0, .03, 0, 3); m.pop();
    m.push().tr(.025, .12, -.03).rz(-PI / 2); m.mat(TX.metal, 100).col(0x2e3238).uvs(1, 1).cyl(.016, .016, .028, 12, 0, 0, 0, 3); m.mat(TX.metal, 150).col(GM.brass).cyl(.017, .017, .006, 12, 0, .028, 0, 3); m.pop();
    /* bipé recolhido */
    bx(m, TX.metal, GM.gun, 80, .05, .016, .03, 0, -.062, -.47); for (const s of [-1, 1]) { zcyl(m.mat(TX.metal, 90).col(GM.gun).uvs(1, 1), .006, .006, .2, -.48, s * .02, -.07, 6); bx(m, TX.rubber, GM.rub, 0, .016, .014, .02, s * .02, -.07, -.69); }
  },
  /* ESTILINGUE — forquilha de madeira com ponteiras de latão, cabo encapado em couro, elásticos grossos e bolsa */
  estilingue(m, st) {
    const pull = st.pull || 0, wd = 0xa8642e;
    bx(m, TX.wood, wd, 10, .04, .17, .04, 0, -.1, 0, 2);
    for (let i = 0; i < 5; i++) bx(m, TX.cloth, i % 2 ? 0x6a3a1a : 0x8e4e24, 0, .047, .024, .047, 0, -.16 + i * .024, 0);
    m.mat(TX.wood, 10).col(0x8a4e22).uvs(1, 1).sph(.026, .022, .026, 8, 6, 0, -.19, 0);
    m.mat(TX.wood, 10).col(wd).uvs(1, 1).sph(.03, .026, .03, 8, 6, 0, -.018, 0);
    for (const sd of [-1, 1]) { m.push().tr(0, -.015, 0).rz(-sd * .48); bx(m, TX.wood, wd, 10, .034, .155, .034, 0, .07, 0, 2); m.mat(TX.metal, 140).col(GM.brass).uvs(1, 1).cyl(.021, .019, .026, 10, 0, .135, 0, 3); m.pop(); }
    const px = 0, py = .09, pz = .02 + pull * .13;
    for (const sd of [-1, 1]) { const tx = sd * .07, ty = .125; rod(m, [tx, ty, 0], [px + sd * .022, py, pz], .016, TX.rubber, 0xe5482a); rod(m, [tx, ty + .006, 0], [px + sd * .022, py + .006, pz], .006, TX.rubber, 0xff8a5a); }
    bx(m, TX.cloth, 0x6a4424, 0, .064, .008, .05, px, py, pz); for (const sd of [-1, 1]) bx(m, TX.cloth, 0xf0d8a0, 0, .004, .01, .044, sd * .026, py + .002, pz);
    if (!st.empty) m.mat(TX.stone, 0).col(0xb0a898).uvs(1, 1).sph(.022, .022, .022, 8, 6, px, py + .02, pz);
  },
  /* FACÃO DO MATO — lâmina larga de facão com ponta curvada, fio brilhante, dorso escuro, cabo robusto com rebites */
  faca(m) {
    const blade = [[-.065, .026], [-.43, .034], [-.5, .016], [-.525, -.008], [-.49, -.046], [-.32, -.06], [-.13, -.048], [-.065, -.034]];
    m.mat(TX.white, 150).col(0x8e9aa8).uvs(1, 1); prism(m, blade, .0045);
    const edge = [[-.07, -.024], [-.13, -.038], [-.32, -.05], [-.48, -.037], [-.512, -.008], [-.49, -.0], [-.32, -.035], [-.13, -.026]];
    m.mat(TX.white, 190).col(0xeef3f8).uvs(1, 1); prism(m, edge, .0052);
    bx(m, TX.white, 0x5a626c, 80, .0105, .008, .37, 0, .03, -.25);
    bx(m, TX.white, 0x4a525c, 60, .0102, .004, .3, 0, .006, -.25);                               /* sulco */
    m.mat(TX.white, 0).col(0x7a1a14).uvs(1, 1).box(.0102, .012, .03, 0, -.006, -.1);             /* marca do ferreiro */
    bx(m, TX.metal, GM.brass, 150, .03, .074, .014, 0, -.004, -.065);                            /* guarda */
    m.push(); bx(m, TX.wood, 0x6b3418, 15, .034, .046, .14, 0, -.004, .01, 1.3);
    for (let i = 0; i < 3; i++) bx(m, TX.wood, 0x4e240e, 0, .036, .006, .01, 0, -.026, -.03 + i * .03);
    for (const z of [-.025, .045]) { m.push().tr(0, -.004, z).rz(PI / 2); m.mat(TX.metal, 150).col(GM.brass).uvs(1, 1).cyl(.008, .008, .038, 10, 0, -.019, 0, 3); m.pop(); }
    bx(m, TX.metal, GM.brass, 150, .036, .05, .014, 0, -.004, .085); m.pop();
    m.push().tr(0, -.004, .1); ring(m, .012, .005, 8, 0, -.006, 0); m.pop();
  },
  /* OVO DE GALINHA — ovo com tampa de granada, alavanca e pino */
  batata(m, st) {
    m.mat(TX.white, 60).col(0xfbf2dc).uvs(1, 1).sph(.05, .066, .05, 14, 10, 0, 0, 0);
    for (const [x, y, z] of [[.03, .02, .036], [-.035, -.02, .03], [.04, -.03, -.02], [-.02, .035, -.04], [.0, -.05, .03]]) m.mat(TX.white, 0).col(0xc8a070).sph(.008, .007, .008, 5, 3, x, y, z);
    m.mat(TX.metal, 110).col(0x5e7a34).uvs(1, 1).cyl(.026, .02, .022, 12, 0, .054, 0, 3);
    m.mat(TX.metal, 130).col(GM.steel).cyl(.012, .012, .012, 8, 0, .076, 0, 3);
    m.push().tr(.024, .066, 0).rz(-.32); bx(m, TX.metal, GM.steel, 120, .008, .085, .022, 0, -.035, 0); m.pop();
    if (!st.fuse) { m.mat(TX.metal, 150).col(GM.brass); ring(m, .016, .004, 10, -.03, .082, 0); }
    else { bx(m, TX.wood, 0xe8d8a8, 0, .006, .03, .006, 0, .095, 0); m.mat(TX.white, 0, 0, 110).col(0xff9020).sph(.012, .012, .012, 6, 4, 0, .114, 0); }
  },
  mandioca(m, st) { drawCassava(m, st); }
};
function drawWeapon(m, id, st) { const f = WMODEL[id]; if (!f) return; m.push(); f(m, st || {}); m.pop(); }
/* carregador solto (mão / queda) — mesma geometria usada dentro da arma */
function drawMag(m, id) {
  if (id === 'galho') {
    m.push().tr(0, .02, 0);
    for (let i = 0; i < 5; i++) { bx(m, TX.metal, i % 2 ? GM.gun : 0x34383f, 70, .044, .05, .074, 0, -.025, 0); if (i > 0 && i < 4) bx(m, TX.white, GM.corn, 40, .046, .03, .014, 0, -.025, -.03); m.tr(0, -.045, 0).rx(.1); }
    bx(m, TX.metal, GM.blk, 60, .048, .016, .078, 0, .0, 0); m.pop();
  } else if (id === 'shell') { drawShell(m);
  } else if (id === 'colher') {
    m.push(); bx(m, TX.metal, GM.blk, 60, .038, .022, .038, 0, -.006, 0);
    m.mat(TX.white, 30).col(GM.corn).uvs(1, 1).sph(.03, .08, .03, 12, 8, 0, -.085, 0);
    for (let r = 0; r < 6; r++) { const y = -.03 - r * .02, q = (y + .085) / .08, rad = .03 * Math.sqrt(Math.max(0, 1 - q * q)) + .002; for (let a = 0; a < 8; a++) { m.push().tr(0, y, 0).ry(a / 8 * TAU + (r & 1) * .39).tr(0, 0, -rad); m.mat(TX.white, 40).col(r & 1 ? 0xffd84a : 0xf2b82a).box(.013, .012, .008); m.pop(); } }
    m.mat(TX.leaf, 0, 0, 0, 1).col(0x8ac85a).uvs(1, 1); for (let k = 0; k < 3; k++) { m.push().ry(k * 2.09).tr(0, -.02, -.026).rx(.12); m.dquad([-.022, 0, 0], [.022, 0, 0], [.012, -.09, -.008], [-.012, -.09, -.008]); m.pop(); }
    m.pop();
  }
}
/* espinho (munição da espingarda) na mão */
function drawRound(m) { m.push().rx(-PI / 2); m.mat(TX.metal, 120).col(0xc8a850).uvs(1, 1).cyl(.011, .011, .05, 8, 0, -.025, 0, 3); m.mat(TX.metal, 90).col(0x9a9a9a).cyl(.011, .002, .03, 8, 0, .025, 0, 2); m.pop(); }
/* cartucho da porteira na mão */
function drawShell(m) { m.push().rx(-PI / 2); m.mat(TX.cloth, 20).col(0xd8352a).uvs(1, 1).cyl(.019, .019, .06, 10, 0, -.03, 0, 3); m.mat(TX.metal, 150).col(GM.brass).cyl(.021, .021, .014, 10, 0, -.034, 0, 3); m.pop(); }

/* ======================= EQUIPAMENTOS E CONSUMÍVEIS ======================= */
const GEAR = {
  /* Colete de Ração: saco de ração costurado com placas de proteção, alças, fivelas e etiqueta */
  colete(m) {
    const bur = 0xc9a865, plate = 0x5d6e3a;
    for (const s of [-1, 1]) { bx(m, TX.cloth, bur, 0, .17, .42, .06, s * .095, 0, -.02); bx(m, TX.cloth, bur, 0, .08, .1, .06, s * .14, .25, -.02); }
    bx(m, TX.cloth, 0xb89656, 0, .36, .44, .05, 0, 0, .06);
    for (const s of [-1, 1]) { bx(m, TX.metal, plate, 50, .13, .17, .02, s * .095, .07, -.055); bx(m, TX.metal, plate, 50, .13, .13, .02, s * .095, -.11, -.055);
      for (const [x, y] of [[-.05, .14], [.05, .14], [-.05, .0], [.05, .0], [-.05, -.06], [.05, -.06], [-.05, -.16], [.05, -.16]]) m.mat(TX.metal, 140).col(0xc8ccd0).uvs(1, 1).sph(.008, .008, .006, 6, 4, s * .095 + x, y, -.066); }
    bx(m, TX.white, 0xd8352a, 0, .37, .04, .065, 0, -.005, -.018); bx(m, TX.white, 0xf8f0d8, 0, .1, .05, .006, -.09, .2, -.055);
    m.mat(TX.white, 0).col(0xd8352a).box(.06, .012, .004, -.09, .205, -.059).box(.04, .008, .004, -.09, .19, -.059);
    for (const s of [-1, 1]) { bx(m, TX.cloth, 0x5a4024, 0, .05, .02, .1, s * .19, .1, .02); bx(m, TX.cloth, 0x5a4024, 0, .05, .02, .1, s * .19, -.1, .02); bx(m, TX.metal, GM.steel, 130, .055, .03, .014, s * .19, .1, -.035); bx(m, TX.metal, GM.steel, 130, .055, .03, .014, s * .19, -.1, -.035); }
    m.mat(TX.white, 0).col(0x5a4024); for (let i = 0; i < 9; i++) for (const s of [-1, 1]) m.box(.004, .014, .004, s * .175, -.19 + i * .045, -.054);
    for (let i = 0; i < 7; i++) m.box(.016, .004, .004, -.15 + i * .05, -.216, -.054);
  },
  /* Pano de Prato do Vovô: rolo xadrez vermelho e branco com ponta solta e etiqueta bordada */
  pano(m) {
    m.push().rz(PI / 2); for (let i = 0; i < 6; i++) m.mat(TX.cloth, 0).col(i % 2 ? 0xf8f2e6 : 0xd8392e).uvs(1, 1).cyl(.052, .052, .034, 14, 0, -.102 + i * .034, 0, i === 0 ? 1 : i === 5 ? 2 : 0); m.pop();
    m.mat(TX.cloth, 0).col(0xf8f2e6).uvs(1, 1).push().rz(PI / 2).cyl(.018, .018, .206, 10, 0, -.103, 0, 3).pop();
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) m.mat(TX.cloth, 0).col((i + j) % 2 ? 0xf8f2e6 : 0xd8392e).box(.034, .003, .034, -.085 + i * .034, -.05, .07 + j * .034);
    m.mat(TX.cloth, 0).col(0x3a7ad0).box(.04, .004, .02, .06, -.047, .13); m.mat(TX.cloth, 0).col(0xf0c040).box(.016, .005, .008, .06, -.046, .13);
  },
  /* Caixinha do Seu Zé: kit de primeiros socorros vermelho, cruz branca, alça, travas e rolo de atadura */
  caixa(m) {
    const red = 0xd8322a; bx(m, TX.metal, red, 70, .3, .17, .14, 0, 0, 0); bx(m, TX.metal, 0xb02820, 60, .304, .03, .144, 0, .07, 0);
    bx(m, TX.white, 0xfafafa, 30, .03, .1, .006, 0, -.005, -.072); bx(m, TX.white, 0xfafafa, 30, .1, .03, .006, 0, -.005, -.072);
    bx(m, TX.white, 0xfafafa, 30, .03, .006, .09, 0, .086, 0); bx(m, TX.white, 0xfafafa, 30, .09, .006, .03, 0, .086, 0);
    for (const s of [-1, 1]) { bx(m, TX.metal, GM.chrome, 150, .03, .04, .012, s * .11, .055, -.074); bx(m, TX.metal, GM.gun, 80, .018, .05, .018, s * .06, .11, 0); }
    bx(m, TX.metal, GM.gun, 80, .14, .016, .018, 0, .135, 0);
    m.push().tr(.17, -.03, 0).rz(PI / 2); m.mat(TX.cloth, 0).col(0xf4efe6).uvs(1, 1).cyl(.035, .035, .05, 12, 0, -.025, 0, 3); m.mat(TX.cloth, 0).col(0xe8e0d0).cyl(.012, .012, .052, 8, 0, -.026, 0, 3); m.pop();
  },
  caixa_br(m) { m.push().sc(1.15); GEAR.caixa(m); m.pop(); bx(m, TX.metal, GM.brass, 150, .35, .012, .165, 0, -.1, 0); bx(m, TX.metal, GM.brass, 150, .35, .012, .165, 0, .1, 0); },
  pano_br(m) { GEAR.pano(m); },
  /* Leite da Mimosa: garrafa de vidro com tampa azul e rótulo malhado */
  leite(m) { m.mat(TX.white, 90).col(0xfbfbf4).uvs(1, 1).cyl(.045, .045, .16, 14, 0, -.1, 0, 3).cyl(.045, .022, .05, 14, 0, .06, 0, 0).cyl(.022, .022, .03, 12, 0, .11, 0, 3);
    m.mat(TX.metal, 90).col(0x2f7bdc).cyl(.025, .025, .018, 12, 0, .138, 0, 3); m.mat(TX.cloth, 0).col(0xffffff).cyl(.047, .047, .08, 14, 0, -.07, 0, 0);
    for (const [a, y] of [[.3, -.04], [1.6, -.02], [2.7, -.05], [4.2, -.03], [5.3, -.045]]) m.push().ry(a).tr(0, y, -.0475).box(.026, .02, .002).pop(); },
  /* Spray Mata-Bicheira: lata verde com faixa e válvula vermelha */
  spray(m) { m.mat(TX.metal, 110).col(0x2fa860).uvs(1, 1).cyl(.035, .035, .17, 14, 0, -.09, 0, 3); m.mat(TX.metal, 120).col(GM.chrome).cyl(.035, .02, .025, 14, 0, .08, 0, 3);
    m.mat(TX.white, 30).col(0xf4f0e0).cyl(.0355, .0355, .06, 14, 0, -.05, 0, 0); m.mat(TX.white, 0).col(0xd8352a).cyl(.012, .012, .03, 10, 0, .105, 0, 3); bx(m, TX.white, 0xd8352a, 0, .012, .012, .024, 0, .124, -.012); },
  /* Mel do Apiário: pote âmbar com tampa de pano xadrez e colher de pau */
  mel(m) { m.mat(TX.white, 140, 0, 12).col(0xf0a018).uvs(1, 1).cyl(.05, .05, .1, 14, 0, -.06, 0, 3); m.mat(TX.cloth, 0).col(0xd8392e).cyl(.058, .062, .02, 8, 0, .04, 0, 3); m.mat(TX.cloth, 0).col(0xf8f2e6).cyl(.052, .052, .008, 14, 0, .03, 0, 0);
    m.mat(TX.white, 0).col(0xffffff).cyl(.0505, .0505, .03, 14, 0, -.03, 0, 0); m.mat(TX.white, 0).col(0xf0a018).box(.03, .012, .002, 0, -.015, -.051);
    m.push().tr(.03, .06, 0).rz(-.4); bx(m, TX.wood, GM.woodL, 10, .01, .12, .01, 0, .03, 0); m.mat(TX.wood, 10).col(GM.woodL).sph(.016, .022, .016, 8, 6, 0, -.04, 0); m.pop(); },
  /* Marmita da Vó: três andares de alumínio com trava */
  marmita(m) { for (let i = 0; i < 3; i++) m.mat(TX.metal, 140).col(i === 1 ? 0xc8ccd2 : 0xb4bac2).uvs(1, 1).cyl(.06, .06, .05, 16, 0, -.08 + i * .052, 0, 3); m.mat(TX.metal, 140).col(0xd8dde4).cyl(.062, .055, .014, 16, 0, .076, 0, 3);
    for (const s of [-1, 1]) bx(m, TX.metal, GM.gun, 80, .012, .17, .016, s * .064, .0, 0); bx(m, TX.metal, GM.gun, 80, .14, .012, .016, 0, .1, 0); m.mat(TX.cloth, 0).col(0xd8392e).box(.05, .03, .004, 0, -.054, -.061); }
};
/* munição (caixotes de madeira com o conteúdo à mostra) e mochila — usados nos ícones da mochila */
function ammoBox(m, fill) { bx(m, TX.wood, 0xc8904c, 10, .3, .16, .2, 0, -.04, 0); bx(m, TX.wood, 0x8a5a2a, 10, .31, .03, .21, 0, .04, 0); bx(m, TX.wood, 0x8a5a2a, 10, .31, .03, .21, 0, -.11, 0); fill(m); }
Object.assign(GEAR, {
  ammo_milho(m) { ammoBox(m, m => { m.mat(TX.white, 40).col(0xffd030).uvs(1, 1); for (let i = 0; i < 18; i++) m.sph(.026, .02, .026, 6, 4, -.11 + (i % 6) * .044, .06 + (i % 2) * .01, -.06 + Math.floor(i / 6) * .06); }); },
  ammo_pedra(m) { ammoBox(m, m => { m.mat(TX.stone, 0).col(0xb0a898).uvs(1, 1); for (let i = 0; i < 10; i++) m.sph(.034, .03, .034, 6, 4, -.1 + (i % 5) * .05, .07, -.04 + Math.floor(i / 5) * .08); }); },
  ammo_espinho(m) { ammoBox(m, m => { for (let i = 0; i < 8; i++) { m.push().tr(-.1 + (i % 4) * .065, .1, -.04 + Math.floor(i / 4) * .08); drawRound(m); m.pop(); } }); },
  ammo_cimento(m) { ammoBox(m, m => { m.mat(TX.white, 0).col(0xfff6dc).uvs(1, 1); for (let i = 0; i < 16; i++) m.sph(.03, .026, .03, 6, 4, -.11 + (i % 6) * .044, .07 + (i % 3) * .008, -.06 + Math.floor(i / 6) * .06); }); },
  ammo_cartucho(m) { for (let i = 0; i < 5; i++) { m.push().tr(-.09 + i * .045, 0, (i % 2) * .03).rx(PI / 2); drawShell(m); m.pop(); } },
  mochila(m) { bx(m, TX.cloth, 0xc8913e, 0, .3, .36, .18, 0, 0, 0); bx(m, TX.cloth, 0xa8742c, 0, .26, .16, .08, 0, -.06, -.12); bx(m, TX.cloth, 0xb88032, 0, .3, .08, .2, 0, .19, 0);
    bx(m, TX.metal, 0xe8c040, 120, .05, .05, .02, -.07, -.04, -.165); bx(m, TX.metal, 0xe8c040, 120, .05, .05, .02, .07, -.04, -.165); for (const s of [-1, 1]) bx(m, TX.cloth, 0x5a3a20, 0, .04, .34, .02, s * .09, 0, .1); }
});
function drawGear(m, id, st) { const f = GEAR[id]; if (f) { m.push(); f(m, st || {}); m.pop(); } }

/* ======================= CATÁLOGO CENTRAL ======================= */
/* cat: categoria da loja · col: cor de destaque do cartão · view: ajuste do ângulo do ícone */
const ITEMS = {
  estilingue: { cat: 'Estilingues', col: '#d8a058', tag: 'Tiro a tiro', view: { ry: .4, rx: .12 } },
  colher: { cat: 'Metralhadoras', col: '#f7c93a', tag: 'Automática' },
  porteira: { cat: 'Escopetas', col: '#e5482a', tag: 'Cano duplo', view: { ry: -PI / 2 - .42, rx: .42 } },
  galho: { cat: 'Fuzis', col: '#ef7a26', tag: 'Automático' },
  vassoura: { cat: 'Precisão', col: '#7ab4ff', tag: 'Luneta 2 níveis' },
  faca: { cat: 'Corpo a corpo', col: '#c8d0d8', tag: 'Corte e estocada', view: { ry: -PI / 2 - .2, rx: .1 } },
  batata: { cat: 'Equipamentos', name: 'Ovo de Galinha', col: '#ffe9a8', tag: 'Granada', view: { ry: -.5, rx: .25 } },
  mandioca: { cat: 'Objetivo', name: 'Mandioca Explosiva', col: '#f0c890', tag: 'Bomba', view: { ry: -.3, rx: .5 } },
  colete: { cat: 'Equipamentos', name: 'Colete de Ração', col: '#c9a865', tag: 'Proteção', view: { ry: PI - .45, rx: .12 } },
  pano: { cat: 'Cura', name: 'Pano de Prato do Vovô', col: '#e5483a', tag: '+25 HP', view: { ry: -.5, rx: .45 } },
  caixa: { cat: 'Cura', name: 'Caixinha do Seu Zé', col: '#ff5a46', tag: '+50 HP', view: { ry: PI - .55, rx: .35 } },
  pano_br: { cat: 'Cura', name: 'Pano de Prato', col: '#e5483a', view: { ry: -.5, rx: .45 } },
  leite: { cat: 'Cura', name: 'Leite da Mimosa', col: '#8ac8ff', view: { ry: .4, rx: .2 } },
  spray: { cat: 'Cura', name: 'Spray Mata-Bicheira', col: '#5ad08a', view: { ry: .5, rx: .2 } },
  mel: { cat: 'Cura', name: 'Mel do Apiário', col: '#ffb43a', view: { ry: .4, rx: .25 } },
  marmita: { cat: 'Cura', name: 'Marmita da Vó', col: '#c8d0da', view: { ry: PI + .4, rx: .25 } },
  caixa_br: { cat: 'Cura', name: 'Caixa do Seu Zé', col: '#ffcf4a', view: { ry: PI - .55, rx: .35 } }
};
for (const t of ['milho', 'pedra', 'espinho', 'cimento', 'cartucho']) ITEMS['ammo_' + t] = { cat: 'Munição', name: AMMO_TYPES[t].name, col: '#d8a058', view: { ry: -.5, rx: .5 } };
ITEMS.mochila = { cat: 'Equipamentos', name: 'Mochila', col: '#c8913e', view: { ry: PI - .5, rx: .2 } };
const itemName = id => (WEAPONS[id] && WEAPONS[id].name) || (ITEMS[id] && ITEMS[id].name) || (HEALS[id] && HEALS[id].name) || id;
function drawItem(m, id, st) { if (WMODEL[id]) drawWeapon(m, id, st); else drawGear(m, id, st); }

/* ======================= ÍCONES A PARTIR DO MODELO 3D ======================= */
Renderer.prototype.renderIcon = function (draw, o) {
  const g = this.gl; if (!this.ready || !this.tex) return null; o = o || {};
  const W = o.w || 320, H = o.h || 180, SS = o.ss || 2, w = Math.round(W * SS), h = Math.round(H * SS);
  let F = this._icoF;
  if (!F || F.w !== w || F.h !== h) {
    if (F) { g.deleteFramebuffer(F.fb); g.deleteRenderbuffer(F.c); g.deleteRenderbuffer(F.d); }
    F = this._icoF = { w, h, fb: g.createFramebuffer(), c: g.createRenderbuffer(), d: g.createRenderbuffer(), px: new Uint8Array(w * h * 4) };
    g.bindRenderbuffer(g.RENDERBUFFER, F.c); g.renderbufferStorage(g.RENDERBUFFER, g.RGBA8, w, h); g.bindRenderbuffer(g.RENDERBUFFER, F.d); g.renderbufferStorage(g.RENDERBUFFER, g.DEPTH_COMPONENT24, w, h);
    g.bindFramebuffer(g.FRAMEBUFFER, F.fb); g.framebufferRenderbuffer(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.RENDERBUFFER, F.c); g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, F.d);
  }
  const mb = this._icoMB || (this._icoMB = new MB(1 << 13)); mb.reset();
  mb.push(); if (o.spin) mb.ry(o.spin); mb.rx(o.rx === undefined ? .2 : o.rx); mb.ry(o.ry === undefined ? -PI / 2 - .32 : o.ry); draw(mb); mb.pop();
  if (!mb.ni) return null;
  const mn = mb.mn, mx = mb.mx, cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2, asp = W / H, fov = 20 * DEG, tv = Math.tan(fov / 2);
  let hx = (mx[0] - mn[0]) / 2, hy = (mx[1] - mn[1]) / 2, dz = (mx[2] - mn[2]) / 2; if (o.sphere) { hx = hy = Math.hypot(hx, hy, dz); dz = hx; }
  const dist = Math.max(hy / tv, hx / (tv * asp)) * (o.pad || 1.12) + dz, eye = [cx, cy + dist * .02, cz + dist];
  const P = this._icoP || (this._icoP = new Float32Array(16)), V = this._icoV || (this._icoV = new Float32Array(16)), VP = this._icoVP || (this._icoVP = new Float32Array(16));
  M4.persp(P, fov, asp, Math.max(.005, dist - dz * 3), dist + dz * 3 + 1); M4.look(V, eye[0], eye[1], eye[2], cx, cy, cz, 0, 1, 0); M4.mul(VP, P, V);
  if (!this._icoMesh) this._icoMesh = uploadMesh(g, mb, true); updateDyn(g, this._icoMesh, mb);
  g.bindFramebuffer(g.FRAMEBUFFER, F.fb); g.viewport(0, 0, w, h); g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
  g.enable(g.DEPTH_TEST); g.depthFunc(g.LEQUAL); g.depthMask(true); g.disable(g.BLEND); g.disable(g.CULL_FACE);
  const svC = this.cam, svS = this.shReady, svE = this.env; this.cam = { x: eye[0], y: eye[1], z: eye[2], yaw: 0, pitch: 0, roll: 0, fov: 20 }; this.shReady = false; this.env = ENVS.dia;
  this._bindTex(); const p = this.prog.vm; this._bindCommon(p, VP, false);
  p.set({ uHdr: 0, uVmFlag: 0, uSunDir: norm3([-.45, .8, .55]), uSunCol: [2.7, 2.55, 2.3], uAmbS: [.78, .84, .98], uAmbG: [.5, .44, .38], uExp: 1.0, uBump: .008, uSat: 1.18 });
  this._draw(this._icoMesh);
  g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, F.px);
  this.cam = svC; this.shReady = svS; this.env = svE; g.bindFramebuffer(g.FRAMEBUFFER, null); g.enable(g.CULL_FACE); g.viewport(0, 0, this.w, this.h);
  const big = document.createElement('canvas'); big.width = w; big.height = h; const bc = big.getContext('2d'), id = bc.createImageData(w, h), row = w * 4;
  for (let y = 0; y < h; y++) id.data.set(F.px.subarray((h - 1 - y) * row, (h - y) * row), y * row);
  bc.putImageData(id, 0, 0);
  const out = document.createElement('canvas'); out.width = W; out.height = H; const oc = out.getContext('2d'); oc.imageSmoothingEnabled = true; oc.imageSmoothingQuality = 'high'; oc.drawImage(big, 0, 0, W, H);
  return out;
};
/* cache de ícones: canvas + dataURL por item/tamanho; giro (turntable) gerado aos poucos */
const Icons = {
  cv: new Map(), url: new Map(), spins: new Map(),
  ok() { return typeof G !== 'undefined' && G.R && G.R.ready; },
  opts(id, kind) { const v = (ITEMS[id] && ITEMS[id].view) || {}; const S = { sm: [160, 90], md: [320, 180], lg: [520, 300] }[kind || 'md']; return { w: S[0], h: S[1], ry: v.ry, rx: v.rx, ss: kind === 'sm' ? 2 : 1.6 }; },
  canvas(id, kind) {
    const sk = typeof Cos !== 'undefined' ? Cos.skinOf(id) : 'padrao', k = id + '|' + (kind || 'md') + '|' + sk; if (this.cv.has(k)) return this.cv.get(k); if (!this.ok()) return null;
    let c = null; try { c = G.R.renderIcon(m => drawItem(m, id, { fuse: 0, sk }), this.opts(id, kind)); } catch (e) { console.warn('icon', id, e); }
    if (c) this.cv.set(k, c); return c;
  },
  src(id, kind) { const k = id + '|' + (kind || 'md') + '|' + (typeof Cos !== 'undefined' ? Cos.skinOf(id) : ''); if (this.url.has(k)) return this.url.get(k); const c = this.canvas(id, kind); if (!c) return ''; const u = c.toDataURL('image/png'); this.url.set(k, u); return u; },
  img(id, kind, cls) { return `<img class="${cls || 'ic3d'}" src="${this.src(id, kind)}" data-icon="${id}" data-k="${kind || 'md'}" alt="${esc(itemName(id))}" draggable="false">`; },
  /* quadros do giro 3D (n vistas) — um por chamada para não travar */
  spinStep(id, n) {
    let s = this.spins.get(id); if (!s) { s = { n: n || 20, f: [] }; this.spins.set(id, s); } if (s.f.length >= s.n || !this.ok()) return s;
    const o = this.opts(id, 'lg'), a = s.f.length / s.n * TAU; o.spin = a; o.sphere = true; o.pad = 1.0; o.ss = 1.25;
    try { const c = G.R.renderIcon(m => drawItem(m, id, {}), o); if (c) s.f.push(c.toDataURL('image/png')); } catch (e) { s.n = s.f.length; } return s;
  },
  fill(root) { if (!root) return; root.querySelectorAll('img[data-icon]').forEach(im => { if (!im.getAttribute('src')) { const u = this.src(im.dataset.icon, im.dataset.k); if (u) im.src = u; } }); }
};
/* ícone desenhado num <canvas> existente (barra de atalhos, mochila) */
function drawIcon3D(cv, id) {
  const ic = Icons.canvas(id, 'sm'); if (!ic) return false; const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
  const k = Math.min(cv.width / ic.width, cv.height / ic.height); c.imageSmoothingQuality = 'high'; c.drawImage(ic, (cv.width - ic.width * k) / 2, (cv.height - ic.height * k) / 2, ic.width * k, ic.height * k); return true;
}
