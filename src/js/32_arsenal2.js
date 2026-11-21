/* =====================================================================
   32_arsenal2.js — ACABAMENTO NOVO DAS ARMAS (por cima dos modelos base)
   • Roçadeira: carenagem laranja de roçadeira e LÂMINA CIRCULAR que gira
     embaixo do cano (mais rápido quando atira), alça de couro.
   • Arregaça-Porteira: anéis de latão nos canos, coronha vermelha com
     florzinhas pintadas, alça de couro trançada.
   • Espingarda do Coronel: estrela de xerife dourada e franjas de palha
     de vassoura na coronha, anéis de latão na luneta.
   • Chuva de Milho: palha de milho saindo do carregador-espiga e grãos.
   • Estilingue: miçangas coloridas e fita amarrada no cabo.
   Mesmo modelo na mão, no personagem, no chão, na loja e nos ícones.
   ===================================================================== */
'use strict';
(function () {
  const W0 = Object.assign({}, WMODEL), now = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);
  const strap = (m, a, b, sag) => { const mid = [(a[0] + b[0]) / 2 + .045, (a[1] + b[1]) / 2 - (sag || .08), (a[2] + b[2]) / 2]; rod(m, a, mid, .009, TX.cloth, 0x6a3a1a); rod(m, mid, b, .009, TX.cloth, 0x6a3a1a); };
  WMODEL.galho = function (m, st) {
    W0.galho(m, st);
    /* carenagem laranja + lâmina circular girando (gira mais rápido logo depois do tiro) */
    const spin = now() * (st && st.bolt > 0 ? 40 : 9);
    m.mat(TX.metal, 90).col(GM.orange).uvs(1, 1).box(.05, .03, .16, 0, -.045, -.5);
    m.push().tr(0, -.085, -.6).rx(PI / 2).rz(spin);
    m.mat(TX.metal, 200).col(GM.chrome).cyl(.075, .075, .008, 18, 0, 0, 0, 3); m.mat(TX.metal, 160).col(GM.blk).cyl(.018, .018, .014, 8, 0, 0, 0, 3);
    m.mat(TX.metal, 220).col(0xffffff); for (let i = 0; i < 12; i++) { m.push().rz(i * TAU / 12).tr(.078, 0, 0).rz(.6); m.box(.022, .012, .009); m.pop(); }
    m.pop();
    m.mat(TX.metal, 90).col(GM.orange).push().tr(0, -.07, -.57).rx(PI / 2).cyl(.088, .088, .02, 14, 0, -.02, 0, 0).pop();   /* proteção */
    m.mat(TX.cloth, 0).col(GM.orange).box(.055, .02, .06, 0, -.02, .2);
    strap(m, [.03, -.02, .32], [.03, -.03, -.32], .1);
  };
  WMODEL.porteira = function (m, st) {
    W0.porteira(m, st);
    m.mat(TX.metal, 210).col(GM.brass).uvs(1, 1);
    for (const z of [-.36, -.55, -.69]) for (const s of [-1, 1]) m.push().tr(s * .0225, .022, z).rx(PI / 2).cyl(.0175, .0175, .014, 10, 0, 0, 0, 3).pop();
    /* florzinhas pintadas na coronha */
    for (const [z, y, c] of [[.16, -.07, 0xffffff], [.24, -.085, 0xffe24a], [.31, -.07, 0xff8ab0]]) for (const s of [-1, 1]) { m.mat(TX.white, 0).col(c); for (let k = 0; k < 5; k++) { const a = k * TAU / 5; m.box(.004, .012, .012, s * .03, y + Math.sin(a) * .012, z + Math.cos(a) * .012); } m.mat(TX.white, 0).col(0xffb81a).box(.005, .008, .008, s * .03, y, z); }
    strap(m, [.03, -.04, .33], [.03, .0, -.3], .12);
  };
  WMODEL.vassoura = function (m, st) {
    W0.vassoura(m, st);
    /* estrela de xerife do Coronel */
    m.push().tr(.032, -.05, .2).ry(PI / 2); m.mat(TX.metal, 230).col(GM.brass).uvs(1, 1); for (let k = 0; k < 5; k++) { m.push().rz(k * TAU / 5); m.box(.012, .034, .005, 0, .016, 0); m.pop(); } m.cyl(.012, .012, .007, 10, 0, 0, 0, 3); m.pop();
    /* franja de palha de vassoura amarrada na coronha */
    m.mat(TX.hay, 0).col(0xe8c860).uvs(1, 1); for (let i = 0; i < 7; i++) { const x = -.018 + i * .006; m.push().tr(x, -.1, .34).rx(.25 + (i % 3) * .08); m.box(.004, .13, .004, 0, -.06, 0); m.pop(); }
    m.mat(TX.cloth, 0).col(GM.red).box(.05, .02, .03, 0, -.095, .34);
  };
  WMODEL.colher = function (m, st) {
    W0.colher(m, st);
    /* palha saindo do carregador-espiga + grãos soltos */
    m.mat(TX.leaf, 0, 0, 0, 1).col(GM.husk).uvs(1, 1);
    for (let k = 0; k < 3; k++) { m.push().tr(0, -.21, -.07).ry(k * 2.1).rx(-.4); m.dquad([-.02, 0, 0], [.02, 0, 0], [.012, -.1, .02], [-.012, -.1, .02]); m.pop(); }
    m.mat(TX.white, 0).col(GM.corn); for (let k = 0; k < 4; k++) m.box(.012, .012, .012, .03, -.04 + k * .006, -.18 - k * .04);
  };
  WMODEL.estilingue = function (m, st) {
    W0.estilingue(m, st);
    /* miçangas coloridas e fita amarrada no cabo */
    const cols = [0xff4a4a, 0x4ab8ff, 0xffe24a, 0x7ad04a]; for (let i = 0; i < 4; i++) m.mat(TX.white, 120).col(cols[i]).uvs(1, 1).sph(.011, .011, .011, 6, 4, 0, -.205 - i * .022, 0);
    m.mat(TX.cloth, 0).col(0x2f6fd0); m.push().tr(0, -.205, 0).rz(.4); m.box(.006, .09, .02, .02, -.045, 0); m.pop();
  };
})();
