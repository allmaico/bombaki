/* =====================================================================
   33_cosmetics.js — COSMÉTICOS (sem vantagem nenhuma no jogo)
   • Skins de arma: acabamentos aplicados por cima do modelo 3D de cada
     arma (cores, brilho metálico, partes que brilham no escuro) + um
     chaveiro pendurado + modelos personalizados (ex.: facão-bengala).
   • Chapéus de Natal (Gorro do Noel, Chifres de Rena).
   • Emotes: animações do personagem (Forró, Saudação, Galinha, Rena).
   • Moeda: Milho (🌽) — ganho jogando; gasto na Loja de Cosméticos.
   ===================================================================== */
'use strict';
const RARITY = { comum: { name: 'Comum', col: '#a8b0bc' }, rara: { name: 'Rara', col: '#3aa0ff' }, epica: { name: 'Épica', col: '#b45aff' }, lendaria: { name: 'Lendária', col: '#ffb81a' } };
/* armas que aceitam skin (todas as do jogador, inclusive o facão) */
const SKIN_WEAPONS = ['galho', 'porteira', 'vassoura', 'colher', 'estilingue', 'faca'];
const WSKINS = {
  padrao: { name: 'Padrão', rar: 'comum', price: 0, desc: 'O acabamento original de fábrica (de fundo de quintal).' },
  natal: { name: 'Bengala de Natal', rar: 'lendaria', price: 1800, ev: 1, desc: 'Listras de bengala doce, laço dourado e bolinha de Natal pendurada.' },
  neve: { name: 'Floco de Neve', rar: 'epica', price: 1200, ev: 1, desc: 'Gelo cristalino que brilha de leve, com pingentes de gelo.' },
  ouro: { name: 'Ouro do Coronel', rar: 'lendaria', price: 2500, desc: 'Banhada a ouro com rubi incrustado. Pura ostentação de fazendeiro.' },
  neon: { name: 'Neon do Forró', rar: 'epica', price: 1400, desc: 'Preta fosca com faixas que acendem no escuro, igual baile de sábado.' },
  brasa: { name: 'Brasa do Fogão', rar: 'epica', price: 1300, desc: 'Carvão rachado com brasa viva por dentro. Cheira a café coado.' },
  camo: { name: 'Camuflado Milharal', rar: 'rara', price: 700, desc: 'Manchas de milharal para se esconder entre as espigas.' },
  algodao: { name: 'Algodão-Doce', rar: 'rara', price: 800, desc: 'Rosa e azul bebê, direto da quermesse.' }
};
const WSKIN_IDS = Object.keys(WSKINS);
/* nomes das versões personalizadas (lendárias) */
const WSKIN_NAMES = {
  natal: { galho: 'Roçadeira Pisca-Pisca', porteira: 'Porteira Natalina', vassoura: 'Coronel Noel', colher: 'Chuva de Neve', estilingue: 'Estilingue do Noel', faca: 'Bengala Quebra-Nozes' },
  ouro: { galho: 'Roçadeira de Ouro', porteira: 'Porteira Imperial', vassoura: 'Espingarda do Barão', colher: 'Colheita de Ouro', estilingue: 'Estilingue Real', faca: 'Peixeira do Coronel' },
  neve: { faca: 'Lâmina de Gelo' }
};
const skinItemName = (w, s) => (WSKIN_NAMES[s] && WSKIN_NAMES[s][w]) || (WSKINS[s].name + ' · ' + ((WEAPONS[w] && WEAPONS[w].short) || itemNameW(w)));
const itemNameW = w => (WEAPONS[w] && WEAPONS[w].name) || w;

/* ---------------- emotes ---------------- */
const EMOTES = {
  forro: { name: 'Forró Arretado', dur: 6, rar: 'comum', price: 0, desc: 'Dois pra lá, dois pra cá. O baile começou!', ico: '🪗' },
  chapeu: { name: 'Saudação do Peão', dur: 2.6, rar: 'comum', price: 0, desc: 'Tira o chapéu e faz uma reverência caprichada.', ico: '🤠' },
  galinha: { name: 'Dança da Galinha', dur: 5, rar: 'comum', price: 0, desc: 'Bate as asas, cisca e bica o chão. Có-có-có!', ico: '🐔' },
  rena: { name: 'Pulo da Rena', dur: 5, rar: 'epica', price: 900, ev: 1, desc: 'Chifres de mão, nariz vermelho aceso e pulinhos de Natal.', ico: '🦌' }
};
/* hats de loja (os outros desbloqueiam por nível) */
const SHOP_HATS = { santa: { price: 0, rar: 'rara', ev: 1, desc: 'Presente de boas-vindas do evento de Natal!' }, rena: { price: 600, rar: 'epica', ev: 1, desc: 'Chifres de rena de pelúcia com sininho.' }, estrela: { price: 1500, rar: 'lendaria', ev: 1, desc: 'Estrela de ponta de árvore que brilha de verdade.' } };

/* ---------------- estado do jogador (perfil) ---------------- */
const Cos = {
  init() {
    if (profile.milho === undefined) profile.milho = 1500;            /* presente de boas-vindas da Beta */
    if (!Array.isArray(profile.owned)) profile.owned = [];
    for (const e of ['em:forro', 'em:chapeu', 'em:galinha', 'hat:santa']) if (!profile.owned.includes(e)) profile.owned.push(e);
    if (!profile.wsk || typeof profile.wsk !== 'object') profile.wsk = {};
    if (!Array.isArray(profile.emotes)) profile.emotes = ['forro', 'chapeu', 'galinha'];
    profile.emotes = profile.emotes.slice(0, 3); while (profile.emotes.length < 3) profile.emotes.push('');
  },
  has(id) { if (!id) return true; if (id.startsWith('ws:') && id.endsWith(':padrao')) return true; return (profile.owned || []).includes(id); },
  price(id) { const [k, a, b] = id.split(':'); if (k === 'ws') return WSKINS[b] ? WSKINS[b].price : 0; if (k === 'em') return EMOTES[a] ? EMOTES[a].price : 0; if (k === 'hat') return SHOP_HATS[a] ? SHOP_HATS[a].price : 0; return 0; },
  buy(id) { if (this.has(id)) return 'own'; const p = this.price(id); if ((profile.milho | 0) < p) return 'poor'; profile.milho -= p; profile.owned.push(id); saveProfile(); return 'ok'; },
  skinOf(w) { const s = profile.wsk[w]; return s && WSKINS[s] && this.has('ws:' + w + ':' + s) ? s : 'padrao'; },
  /* texto curto que viaja pela rede: "galho=natal,faca=ouro" */
  wire() { return SKIN_WEAPONS.map(w => { const s = this.skinOf(w); return s !== 'padrao' ? w + '=' + s : ''; }).filter(Boolean).join(','); },
  earn(n) { profile.milho = (profile.milho | 0) + Math.max(0, n | 0); }
};
/* lê o texto de rede (validado) → { arma: skin } */
function parseCos(s) { const o = {}; String(s || '').slice(0, 200).split(',').forEach(kv => { const [w, k] = kv.split('='); if (SKIN_WEAPONS.includes(w) && WSKINS[k]) o[w] = k; }); return o; }
const cosClean = s => SKIN_WEAPONS.map(w => { const k = parseCos(s)[w]; return k ? w + '=' + k : ''; }).filter(Boolean).join(',');

/* ---------------- acabamento das skins (troca cor/material ao desenhar) ---------------- */
const _c3 = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const _hex = (r, g, b) => ((clamp(r, 0, 1) * 255 | 0) << 16) | ((clamp(g, 0, 1) * 255 | 0) << 8) | (clamp(b, 0, 1) * 255 | 0);
const _mixh = (a, b, t) => { const A = _c3(a), B = _c3(b); return _hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
const _lum = h => { const c = _c3(h); return c[0] * .3 + c[1] * .55 + c[2] * .15; };
const _hash = i => { const x = Math.sin(i * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };
/* f(cor, índice da peça, camada) → [cor, camada, brilho especular, emissão] (null = manter) */
const SKIN_FN = {
  natal(h, i, L) { const l = _lum(h); if (l < .12) return [0x1f5a2a, TX.white, 60, 0]; return [i % 2 ? 0xd81e2a : 0xf8f4ee, TX.white, 140, 0]; },
  neve(h, i, L) { const l = _lum(h); return [i % 3 === 0 ? 0x2a68b0 : _mixh(0x3a78c0, 0xd8f0ff, clamp(l * 1.1, 0, 1)), TX.white, 240, l > .6 ? 30 : 6]; },
  ouro(h, i, L) { const l = _lum(h); if (l < .1) return [0x3a2208, TX.metal, 120, 0]; return [_mixh(0x8a5a12, 0xffe07a, clamp(l * 1.15 + (i % 3 === 0 ? .15 : 0), 0, 1)), TX.metal, 255, 0]; },
  neon(h, i, L) { const l = _lum(h); if (i % 3 === 0 || l > .78) return [i % 2 ? 0x3af0ff : 0xff3ad8, TX.white, 60, 110]; return [_mixh(0x141020, 0x2a2440, l), TX.metal, 150, 0]; },
  brasa(h, i, L) { const l = _lum(h); if (i % 4 === 0) return [0xff7a1a, TX.white, 0, 115]; return [_mixh(0x1a1616, 0x4a3a34, l), TX.rockT, 30, 0]; },
  camo(h, i, L) { const P = [0x4a5a2a, 0x6a7a3a, 0x8a7a4a, 0x3a3a24, 0x5a6a30]; const l = _lum(h); return [_mixh(P[(_hash(i) * P.length) | 0], 0x000000, l < .15 ? .5 : 0), TX.cloth, 20, 0]; },
  algodao(h, i, L) { const P = [0xffa8d0, 0xa8d8ff, 0xfff4fa, 0xffc8e4]; return [P[i % P.length], TX.white, 90, 0]; }
};
/* desenha fn() com a skin aplicada no MB m */
function withWSkin(m, sk, fn) {
  const F = SKIN_FN[sk]; if (!F) { fn(); return; }
  const oc = MB.prototype.col, om = MB.prototype.mat; let i = 0, lay = 0, sp = 0, wind = 0, em = 0, cut = 0;
  m.mat = function (layer, s = 0, w = 0, e = 0, c = 0) { lay = layer; sp = s; wind = w; em = e; cut = c; return om.call(this, layer, s, w, e, c); };
  m.col = function (h, a) {
    i++; if (cut || lay === TX.leaf || lay === TX.glass) return oc.call(this, h, a);
    const r = F(h, i, lay); if (!r) return oc.call(this, h, a);
    om.call(this, r[1] === null ? lay : r[1], r[2], wind, Math.max(em, r[3]), cut); return oc.call(this, r[0], a);
  };
  try { fn(); } finally { delete m.mat; delete m.col; }
}
/* chaveiro (pingente) — posição por arma, balança com o tempo */
const CHARM_AT = { galho: [.075, -.06, .02], porteira: [.06, -.06, .02], vassoura: [.06, -.06, .06], colher: [.06, -.06, .04], estilingue: [.06, -.2, 0], faca: [.03, -.03, .08] };
const _now = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);
function drawCharm(m, w, sk) {
  const p = CHARM_AT[w]; if (!p) return; const t = _now(), sw = Math.sin(t * 2.3 + p[2] * 9) * .25;
  m.push().tr(p[0], p[1], p[2]).rz(sw); m.mat(TX.metal, 200).col(0xd8d8d8).uvs(1, 1).box(.004, .05, .004, 0, -.025, 0); m.tr(0, -.06, 0);
  if (sk === 'natal') { m.mat(TX.white, 230, 0, 25).col(0xd81e2a).sph(.022, .022, .022, 10, 8, 0, -.012, 0); m.mat(TX.metal, 220).col(GM.brass).cyl(.007, .007, .008, 8, 0, .012, 0, 3); m.mat(TX.white, 0, 0, 60).col(0xfff2b0).box(.03, .003, .003, 0, -.012, -.02); }
  else if (sk === 'neve') { m.mat(TX.white, 255, 0, 60).col(0xdff6ff); for (let k = 0; k < 3; k++) { m.push().rz(k * PI / 3); m.box(.004, .05, .004, 0, -.01, 0); m.pop(); } }
  else if (sk === 'ouro') { m.mat(TX.white, 255, 0, 70).col(0xff1a3a).push().rz(PI / 4).box(.026, .026, .016, 0, -.012, 0).pop(); m.mat(TX.metal, 255).col(0xffd860).box(.034, .006, .02, 0, .004, 0); }
  else if (sk === 'neon') { m.mat(TX.white, 0, 0, 127).col(0x3af0ff).box(.024, .024, .024, 0, -.012, 0); }
  else if (sk === 'brasa') { m.mat(TX.white, 0, 0, 120).col(0xff4a1a).sph(.016, .03, .016, 8, 6, 0, -.02, 0); m.mat(TX.leaf, 0).col(0x3a8a2a).box(.008, .014, .008, 0, .004, 0); }
  else if (sk === 'camo') { m.mat(TX.white, 40).col(GM.corn).sph(.014, .03, .014, 8, 6, 0, -.02, 0); m.mat(TX.leaf, 0, 0, 0, 1).col(GM.husk).dquad([-.012, 0, 0], [.012, 0, 0], [.004, -.05, .004], [-.004, -.05, .004]); }
  else if (sk === 'algodao') { m.mat(TX.white, 30).col(0xffb8dc).sph(.024, .02, .024, 10, 8, 0, -.006, 0); m.mat(TX.wood, 0).col(0xe8d8b8).box(.004, .03, .004, 0, -.035, 0); }
  m.pop();
}
/* extras de cada skin (laço, pingentes de gelo, rubis…) desenhados por cima */
function drawSkinExtras(m, w, sk) {
  if (sk === 'natal') {
    /* laço dourado no meio da arma */
    const z = w === 'faca' ? .05 : w === 'estilingue' ? 0 : .02, y = w === 'estilingue' ? -.12 : .04; m.mat(TX.cloth, 60).col(0xf2c23a).uvs(1, 1);
    m.push().tr(0, y, z); for (const s of [-1, 1]) { m.push().rz(s * .6).box(.012, .05, .03, s * .022, 0, 0); m.pop(); } m.box(.016, .016, .034); m.push().rz(.25).box(.008, .04, .012, -.008, -.03, 0).pop(); m.push().rz(-.25).box(.008, .04, .012, .008, -.03, 0).pop(); m.pop();
  } else if (sk === 'neve' && w !== 'faca' && w !== 'estilingue') {
    m.mat(TX.white, 255, 0, 45).col(0xe8f8ff); for (let k = 0; k < 5; k++) { const z = -.08 - k * .07, L = .03 + _hash(k + 3) * .04; m.push().tr(0, -.07, z).box(.008, L, .008, 0, -L / 2, 0).pop(); }
  } else if (sk === 'ouro') {
    m.mat(TX.white, 255, 0, 50).col(0xff1a3a); m.push().tr(.04, .0, .08).rz(PI / 4).box(.016, .016, .016).pop();
  } else if (sk === 'neon') {
    m.mat(TX.white, 0, 0, 127).col(0xff3ad8); const L = { galho: .9, porteira: .8, vassoura: 1.1, colher: .5, estilingue: .2, faca: .45 }[w] || .5; m.box(.004, .004, L * .7, .035, -.01, w === 'estilingue' ? 0 : -L * .25);
  }
}
/* modelos personalizados (substituem o modelo base) */
const WSKIN_MODEL = {
  'faca:natal'(m) {   /* facão-bengala: cabo trançado, lâmina listrada em gancho */
    m.mat(TX.cloth, 0).col(0x2a5a2a).uvs(1, 1).box(.03, .035, .12, 0, 0, .05); m.mat(TX.metal, 220).col(GM.brass).box(.06, .015, .02, 0, 0, -.015);
    for (let k = 0; k < 9; k++) { m.mat(TX.white, 150).col(k % 2 ? 0xd81e2a : 0xf8f4ee); m.box(.026, .032, .05, 0, 0, -.045 - k * .045); }
    for (let k = 0; k < 6; k++) { const a = k / 5 * PI; m.mat(TX.white, 150).col(k % 2 ? 0xd81e2a : 0xf8f4ee); m.push().tr(0, .055 - Math.cos(a) * .055, -.45 - Math.sin(a) * .055).rx(-a).box(.026, .032, .036).pop(); }
  },
  'faca:ouro'(m) {   /* peixeira do coronel: lâmina longa curva, guarda ornamentada */
    m.mat(TX.wood, 60).col(0x5a1a10).uvs(1, 1).box(.03, .036, .13, 0, 0, .05); for (let k = 0; k < 4; k++) m.mat(TX.metal, 255).col(0xffd860).box(.034, .04, .008, 0, 0, .0 + k * .035);
    m.mat(TX.metal, 255).col(0xffd860).box(.08, .018, .018, 0, 0, -.018); m.mat(TX.white, 255, 0, 60).col(0xff1a3a).box(.016, .016, .016, 0, .016, .1);
    m.mat(TX.metal, 255).col(0xfff0c0); for (let k = 0; k < 7; k++) { const z = -.06 - k * .065, y = Math.sin(k / 6 * 1.2) * .015; m.box(.008, .05 - k * .004, .068, 0, y - .005, z); }
  },
  'faca:neve'(m) {   /* lâmina de gelo translúcida */
    m.mat(TX.cloth, 0).col(0x2a4a7a).uvs(1, 1).box(.03, .034, .12, 0, 0, .05); m.mat(TX.white, 255, 0, 50).col(0xdff6ff).box(.07, .02, .02, 0, 0, -.015);
    m.mat(TX.white, 255, 0, 45).col(0x9fdcff); for (let k = 0; k < 6; k++) { m.push().tr(0, 0, -.07 - k * .07).rz(k * .5).box(.012 + (k % 2) * .006, .055 - k * .006, .075).pop(); }
  },
  'estilingue:natal'(m, st) { withWSkin(m, 'natal', () => WMODEL0.estilingue(m, st)); m.mat(TX.white, 0, 0, 90).col(0xffe27a); for (let k = 0; k < 6; k++) m.sph(.009, .009, .009, 6, 4, (k % 2 ? .03 : -.03), -.05 + k * .03, .0); }
};
let WMODEL0 = null;
/* drawWeapon com skin: st.sk (id da skin) */
(function () {
  WMODEL0 = Object.assign({}, WMODEL);
  const base = drawWeapon;
  window.drawWeapon = function (m, id, st) {
    const sk = st && st.sk; if (!sk || sk === 'padrao' || !WSKINS[sk] || !SKIN_WEAPONS.includes(id)) return base(m, id, st);
    const cm = WSKIN_MODEL[id + ':' + sk]; m.push();
    if (cm) cm(m, st || {}); else withWSkin(m, sk, () => WMODEL[id](m, st || {}));
    drawSkinExtras(m, id, sk); drawCharm(m, id, sk); m.pop();
  };
})();
/* ---------------- chapéus novos ---------------- */
(function () {
  const base = drawHat;
  window.drawHat = function (m, hat) {
    if (hat === 'santa') {   /* gorro do Noel caído para trás com pompom */
      m.mat(TX.cloth, 0).col(0xf6f2ea).uvs(1, 1).cyl(.255, .255, .09, 14, 0, .2, 0, 3);
      m.mat(TX.cloth, 0).col(0xd81e2a); m.cyl(.235, .16, .14, 12, 0, .25, .01, 3); m.push().tr(0, .38, .04).rx(.7); m.cyl(.16, .08, .16, 10, 0, 0, 0, 3); m.push().tr(0, .14, 0).rx(.6); m.cyl(.08, .02, .14, 8, 0, 0, 0, 3); m.mat(TX.cloth, 0).col(0xf6f2ea).sph(.06, .06, .06, 8, 6, 0, .15, 0); m.pop(); m.pop();
      return;
    }
    if (hat === 'rena') {   /* tiara com chifres de rena */
      m.mat(TX.cloth, 0).col(0x7a1a1a).uvs(1, 1).box(.46, .04, .06, 0, .19, 0);
      m.mat(TX.cloth, 0).col(0x8a5a2a); for (const s of [-1, 1]) { m.push().tr(s * .16, .2, 0).rz(-s * .35); m.box(.05, .24, .05, 0, .12, 0); m.push().tr(0, .14, 0).rz(-s * .8).box(.04, .12, .04, 0, .06, 0).pop(); m.push().tr(0, .2, 0).rz(s * .6).box(.04, .1, .04, 0, .05, 0).pop(); m.pop(); }
      m.mat(TX.metal, 230).col(GM.brass).sph(.035, .035, .035, 8, 6, 0, .2, -.04); return;
    }
    if (hat === 'estrela') {   /* estrela de árvore de Natal que brilha */
      m.mat(TX.metal, 180).col(0xc8a030).uvs(1, 1).cyl(.06, .08, .08, 8, 0, .2, 0, 3); m.push().tr(0, .44, 0);
      m.mat(TX.white, 0, 0, 120).col(0xffe46a); for (let k = 0; k < 5; k++) { m.push().rz(k * TAU / 5); m.box(.06, .16, .04, 0, .08, 0); m.pop(); } m.sph(.07, .07, .05, 10, 8, 0, 0, 0); m.pop(); return;
    }
    base(m, hat);
  };
})();

/* ---------------- animação dos emotes ---------------- */
/* devolve: by (sobe), ry/rz (corpo), cr (agacha), lean (tronco), tz, legs[2] (frente), sp[2] (abre), arms[2] = [frente, abre], head [rx, ry], hatHand, nose */
function emoteAnim(id, t) {
  const E = { by: 0, ry: 0, rz: 0, cr: 0, lean: 0, tz: 0, legs: [0, 0], sp: [0, 0], arms: [[0, .1], [0, .1]], head: [0, 0], hatHand: false, nose: false };
  const s = Math.sin, c = Math.cos, ab = Math.abs, mx = Math.max;
  if (id === 'forro') {
    const b = t * PI * 2.2, h = t * PI * 1.1; E.by = ab(s(b)) * .05; E.ry = s(h) * .45; E.rz = s(b) * .05; E.tz = -s(b) * .08;
    E.legs = [s(b) * .45, -s(b) * .45]; E.sp = [.08 + mx(0, s(b)) * .25, .08 + mx(0, -s(b)) * .25];
    E.arms = [[-1.35 + s(b) * .15, .55], [-1.0 - s(b) * .15, .35 + s(h) * .2]]; E.head = [-.05, s(h) * .25];
  } else if (id === 'chapeu') {
    const k = clamp(t / 2.6, 0, 1), up = clamp(t / .45, 0, 1), bow = t < .5 ? 0 : t < 1.0 ? easeOut((t - .5) / .5) : t < 1.9 ? 1 : 1 - easeOut(clamp((t - 1.9) / .5, 0, 1));
    E.hatHand = t > .42 && t < 2.15; E.lean = bow * .7; E.head = [bow * .35, 0];
    const ra = t < .45 ? -2.8 * easeOut(up) : t < 1.9 ? lerp(-2.8, -1.1, easeOut(clamp((t - .45) / .45, 0, 1))) : lerp(-1.1, -2.8, clamp((t - 1.9) / .25, 0, 1)) * (t > 2.15 ? clamp(1 - (t - 2.15) / .45, 0, 1) : 1);
    E.arms = [[ra, .25 + bow * .4], [.6 * bow, -.05]]; E.legs = [-bow * .15, bow * .35]; E.by = -bow * .04; void k;
  } else if (id === 'galinha') {
    const f = t * 14, b = t * 7, st = t * 3.5; E.by = ab(s(b)) * .06; E.cr = .25; E.lean = .3 + s(b) * .12; E.head = [mx(0, s(b)) * .55, s(t * 2) * .3];
    E.arms = [[-.2, 1.0 + s(f) * .5], [-.2, 1.0 + s(f) * .5]]; E.legs = [-mx(0, s(st)) * 1.0, -mx(0, -s(st)) * 1.0]; E.ry = s(t * 1.2) * .5;
  } else if (id === 'rena') {
    const j = ab(s(t * 4.5)); E.by = j * .45; E.legs = [-j * .6, -j * .5]; E.sp = [j * .1, j * .1]; E.ry = t * 1.6; E.nose = true;
    E.arms = [[-2.75, .75], [-2.75, .75]]; E.head = [-.1, s(t * 9) * .12]; E.lean = -.08;
  }
  return E;
}
/* braço livre com abertura (para emotes) */
function drawArmEm(m, sh, sd, a, S, bulk, hat) {
  m.push().tr(sh[0], sh[1], sh[2]).rz(sd * a[1]).rx(a[0]);
  m.mat(TX.cloth, 0).col(S.shirt).uvs(1, 1).box(.18 * bulk, .38, .2 * bulk, 0, -.19, 0); m.mat(TX.white, 0).col(S.skin).box(.16 * bulk, .3, .18 * bulk, 0, -.45, 0); if (S.glove) m.mat(TX.cloth, 0).col(S.glove).box(.17 * bulk, .12, .19 * bulk, 0, -.62, 0);
  if (hat) { m.push().tr(0, -.74, -.06).rx(-PI / 2 + .3).sc(.95).tr(0, -.2, 0); drawHat(m, hat); m.pop(); }
  m.pop();
}
/* estado de emote de uma entidade → {id, t} enquanto ativo */
Cos.init();
/* bots também desfilam skins (sem vantagem) */
function randomBotCos() { const o = []; for (const w of SKIN_WEAPONS) if (Math.random() < .45) o.push(w + '=' + WSKIN_IDS[1 + ((Math.random() * (WSKIN_IDS.length - 1)) | 0)]); return o.join(','); }
function emoteOf(e, now) {
  const E = e.emote; if (!E || !EMOTES[E.id]) return null; const t = now - E.t0;
  if (t > EMOTES[E.id].dur || !e.alive || (e.spd || 0) > 1.2 || e.fire > .1) { if (t > .25) e.emote = null; return null; }
  return { id: E.id, t };
}
