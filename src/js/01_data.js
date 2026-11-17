/* =====================================================================
   01_data.js — constantes, armas, personagens, itens, modos, textos
   ===================================================================== */
'use strict';
const VERSION = '5.2.0';
const DISCORD_URL = 'https://discord.gg/';           // troque pelo convite do seu servidor
const ONLINE_DEMO = false;                            // true = contador "Jogadores Online" ILUSTRATIVO (igual à arte). false = mostra só os humanos da sala atual (sem servidor central não existe contagem global real)
const DT = 1 / 60;                                  // passo fixo da simulação
const T_NONE = 0, T_ATK = 1, T_DEF = 2;
const TEAM_NAME = ['', 'ATACANTES', 'DEFENSORES'];
const SQ_NAME = ['AZUL', 'VERMELHO'], SQ_COL = ['#3d8bff', '#ee4b3f'];  // esquadrões fixos; o papel (ataque/defesa) troca no intervalo
const sqOfTeam = (team, swap) => (team === T_ATK ? swap : swap ^ 1);
const TEAM_COL = ['#ffd24a', '#3d8bff', '#ee4b3f'];  // atacantes = azul, defensores = vermelho (HUD de referência)
const PEER_PREFIX = 'bombaki-gdr-';

/* ---------------- armas ---------------- */
const WEAPONS = {
  galho: {
    id: 'galho', slot: 1, name: 'Roçadeira', short: 'Roçadeira', price: 2700, cat: 'Fuzil', type: 'auto', ammo: 'milho',
    dmg: 27, cd: 0.092, mag: 30, res: 90, reload: 2.35, equip: 0.55,
    spread: 0.30, moveSpread: 1.5, airSpread: 3.2, adsMul: 0.5, crouchMul: 0.65, bloomPer: 0.12, bloomMax: 1.5, bloomRec: 2.4,
    rcP: 0.60, rcG: 0.035, rcMax: 14, rcY: 0.20, rcDecay: 6.5,
    head: 2.3, leg: 0.75, range0: 38, range1: 100, minMul: 0.55,
    speed: 0.97, adsSpeed: 0.78, adsFov: 0.82, trace: [1, .93, .55], traceW: .05, tr: 'galho'
  },
  estilingue: {
    id: 'estilingue', slot: 2, name: 'Estilingue', short: 'Estilingue', price: 0, cat: 'Leve', type: 'semi', ammo: 'pedra',
    dmg: 36, cd: 0.34, mag: 7, res: 14, reload: 1.5, equip: 0.4,
    spread: 0.14, moveSpread: 1.0, airSpread: 2.4, adsMul: 0.5, crouchMul: 0.7, bloomPer: 0.5, bloomMax: 1.6, bloomRec: 3.2,
    rcP: 1.15, rcG: 0.0, rcMax: 1, rcY: 0.25, rcDecay: 9,
    head: 2.6, leg: 0.75, range0: 40, range1: 110, minMul: 0.6,
    speed: 1.0, adsSpeed: 0.85, adsFov: 0.88, trace: [.85, .82, .75], traceW: .035, tr: 'estilingue'
  },
  vassoura: {
    id: 'vassoura', slot: 1, name: 'Espingarda do Coronel', short: 'Coronel', price: 4200, cat: 'Precisão', type: 'bolt', ammo: 'espinho',
    dmg: 104, cd: 1.25, mag: 5, res: 15, reload: 3.2, equip: 0.8,
    spread: 0.05, moveSpread: 4.5, airSpread: 7, adsMul: 0.0, crouchMul: 0.7, bloomPer: 0, bloomMax: 0, bloomRec: 4,
    rcP: 3.2, rcG: 0, rcMax: 1, rcY: 0.5, rcDecay: 5,
    head: 3.0, leg: 0.8, range0: 90, range1: 220, minMul: 0.8,
    speed: 0.9, adsSpeed: 0.55, adsFov: 0.38, adsFov2: 0.17, scope: true, trace: [1, .85, .35], traceW: .08, tr: 'vassoura'
  },
  colher: {
    id: 'colher', slot: 1, name: 'Chuva de Milho', short: 'Chuva de Milho', price: 1500, cat: 'Metralhadora', type: 'auto', ammo: 'cimento',
    dmg: 17, cd: 0.067, mag: 35, res: 105, reload: 2.05, equip: 0.45,
    spread: 0.50, moveSpread: 1.1, airSpread: 2.8, adsMul: 0.6, crouchMul: 0.7, bloomPer: 0.10, bloomMax: 2.0, bloomRec: 2.6,
    rcP: 0.50, rcG: 0.05, rcMax: 16, rcY: 0.34, rcDecay: 6,
    head: 2.0, leg: 0.8, range0: 18, range1: 60, minMul: 0.4,
    speed: 1.03, adsSpeed: 0.85, adsFov: 0.86, trace: [1, .6, .25], traceW: .045, tr: 'colher'
  },
  faca: {
    id: 'faca', slot: 3, name: 'Facão do Mato', short: 'Facão', type: 'melee', ammo: null,
    dmg: 34, cd: 0.5, stab: 78, stabCd: 1.0, stabWind: 0.3, range: 2.0, back: 2.0, mag: 0, res: 0, reload: 0, equip: 0.35,
    speed: 1.08, adsSpeed: 1.0, adsFov: 1, head: 1, leg: 1
  },
  batata: {
    id: 'batata', slot: 4, name: 'Ovo de Galinha', short: 'Ovo', price: 300, cat: 'Equipamento', type: 'nade', ammo: null,
    dmg: 140, radius: 8.5, fuse: 1.9, cd: 1.0, throwV: 17.5, mag: 0, res: 0, reload: 0, equip: 0.4,
    speed: 1.0, adsSpeed: 1.0, adsFov: 1, head: 1, leg: 1
  },
  mandioca: {
    id: 'mandioca', slot: 5, name: 'Mandioca Explosiva', short: 'Mandioca', type: 'bomb', ammo: null,
    mag: 0, res: 0, reload: 0, equip: 0.6, speed: 0.98, adsSpeed: 1.0, adsFov: 1, head: 1, leg: 1
  },
  porteira: {
    id: 'porteira', slot: 1, name: 'Arregaça-Porteira', short: 'Porteira', price: 1800, cat: 'Escopeta', type: 'semi', ammo: 'cartucho', pellets: 8,
    dmg: 15, cd: 0.82, mag: 6, res: 24, reload: 2.6, equip: 0.6,
    spread: 3.4, moveSpread: 1.25, airSpread: 1.6, adsMul: 0.8, crouchMul: 0.85, bloomPer: 0, bloomMax: 0, bloomRec: 4,
    rcP: 3.0, rcG: 0, rcMax: 1, rcY: 0.6, rcDecay: 6,
    head: 1.6, leg: 0.8, range0: 7, range1: 26, minMul: 0.22,
    speed: 0.95, adsSpeed: 0.8, adsFov: 0.9, trace: [1, .8, .5], traceW: .03, tr: 'porteira'
  }
};
/* ids na ordem do protocolo de rede (índice enviado nos snapshots) */
const WSLOTS = ['galho', 'estilingue', 'vassoura', 'colher', 'faca', 'batata', 'mandioca', 'porteira'];
const PRIMARIES = ['galho', 'porteira', 'colher', 'vassoura'];
/* barra de atalhos: 1 primária · 2 estilingue · 3 facão · 4 ovo · 5 mandioca */
const HOTBAR = [{ k: 1, ids: PRIMARIES, name: 'Primária' }, { k: 2, ids: ['estilingue'] }, { k: 3, ids: ['faca'] }, { k: 4, ids: ['batata'] }, { k: 5, ids: ['mandioca'] }];
const AMMO_TYPES = { milho: { name: 'Grãos de milho', cap: 150, pack: 30 }, pedra: { name: 'Pedras', cap: 42, pack: 7 }, espinho: { name: 'Chumbinho', cap: 25, pack: 5 }, cimento: { name: 'Pipoca', cap: 140, pack: 35 }, cartucho: { name: 'Cartuchos', cap: 36, pack: 6 } };
const TIERS = [
  { id: 0, name: 'Comum', col: '#d9d9d9', dm: 1.0, mg: 1.0, rl: 1.0 },
  { id: 1, name: 'Reforçado', col: '#5fd65f', dm: 1.08, mg: 1.15, rl: .95 },
  { id: 2, name: 'Épico', col: '#b36dff', dm: 1.16, mg: 1.3, rl: .9 },
  { id: 3, name: 'Lendário', col: '#ffa826', dm: 1.28, mg: 1.5, rl: .82 }
];
const TIER_NAMES = {
  galho: ['Roçadeira', 'Roçadeira de Ipê', 'Roçadeira de Aroeira', 'Roçadeira do Zé'],
  estilingue: ['Estilingue de Madeira', 'Estilingue de Couro', 'Estilingue Turbinado', 'Estilingue Dourado'],
  vassoura: ['Espingarda do Coronel', 'Espingarda Polida', 'Espingarda Cromada', 'Espingarda Lendária'],
  colher: ['Chuva de Milho', 'Chuva de Milho+', 'Tempestade de Milho', 'Granizo Dourado'],
  faca: ['Facão do Mato', 'Facão Afiado', 'Facão de Peixeira', 'Facão do Capataz'],
  porteira: ['Arregaça-Porteira', 'Porteira Reforçada', 'Porteira de Ferro', 'Porteira do Coronel']
};
const VESTS = [null, { name: 'Colete de Palha', arm: 40, red: .25 }, { name: 'Colete de Pneu', arm: 70, red: .4 }, { name: 'Colete de Lataria', arm: 100, red: .55 }];
const HELMETS = [null, { name: 'Chapéu de Palha', red: .2 }, { name: 'Balde de Zinco', red: .35 }, { name: 'Panela de Pressão', red: .5 }];
const PACKS = [
  { name: 'Sem mochila', kits: 2, nades: 2, cap: 1 }, { name: 'Mochila de Pano', kits: 4, nades: 4, cap: 1.3 },
  { name: 'Mochila de Estopa', kits: 6, nades: 6, cap: 1.6 }, { name: 'Mochilão do Peão', kits: 8, nades: 8, cap: 2 }
];
const SPECIALS = {
  garapa: { name: 'Garapa Gelada', desc: 'Velocidade +25% por 12s' },
  ovo: { name: 'Ovo de Ouro', desc: '+40 de colete' },
  pinga: { name: 'Pé de Moleque', desc: 'Regenera 3 HP/s por 8s' }
};

/* ---------------- economia e loja (Roçado Tático) — valores ajustáveis ---------------- */
/* economia competitiva: vitória 3250 (3500 por objetivo), derrota com bônus progressivo 1400→3400 (sequência cai 1 a cada vitória),
   abate conforme a arma, plantio/desarme +300 para quem fez, +600 para cada atacante quando plantam e perdem */
/* anti-AFK do 5x5 (segundos parado durante a rodada valendo) */
const AFK = { warn: 45, bot: 75 };
const ECON = { start: 800, max: 9000, kill: 200, win: 3250, winObj: 3500, loss: 1400, lossStep: 500, lossMax: 3400, plant: 300, defuse: 300, plantTeam: 600, sellBack: 0.5, buyTime: 15, buyTimeHalf: 15 };
const KILL_MONEY = { festa: 300, insetos: 300, faca: 750, estilingue: 300, colher: 450, porteira: 600, galho: 300, vassoura: 100, batata: 300, mandioca: 300 };
/* formatos do 5x5: regulamentar (total de rodadas, troca na metade) e bloco de prorrogação */
const TAT_FORMATS = { comp: { name: 'Competitivo', rounds: 24, ot: 6, desc: 'Vence quem fizer 13. Troca de lados após 12. Empate 12x12: prorrogação (3+3, quem fizer 4).' }, curto: { name: 'Rápido', rounds: 8, ot: 2, desc: 'Vence quem fizer 5. Troca após 4. Empate 4x4: prorrogação (1+1).' } };
const SHOP = [
  { id: 'estilingue', kind: 'w', cat: 'Estilingues', desc: 'Grátis. 7 pedras + 14 de reserva, tiro a tiro.' },
  { id: 'colher', kind: 'w', cat: 'Metralhadoras', desc: 'Cospe milho rápido. Boa a curta/média distância.' },
  { id: 'porteira', kind: 'w', cat: 'Escopetas', desc: '8 chumbos por tiro. Devastadora de perto.' },
  { id: 'galho', kind: 'w', cat: 'Fuzis', desc: 'Roçadeira automática, equilibrada em qualquer distância.' },
  { id: 'vassoura', kind: 'w', cat: 'Precisão', desc: 'Luneta (V para 2º zoom). Um tiro na cabeça derruba.' },
  { id: 'colete', kind: 'e', cat: 'Equipamentos', name: 'Colete de Ração', price: 650, max: 1, desc: 'Absorve 40% do dano no corpo (50 pontos). Não cura.' },
  { id: 'batata', kind: 'e', cat: 'Equipamentos', name: 'Ovo de Galinha', price: 300, max: 2, desc: 'Granada: explode 1,9 s após lançar (G).' },
  { id: 'pano', kind: 'e', cat: 'Cura', name: 'Pano de Prato do Vovô', price: 200, max: 1, desc: '+25 HP em 2,5 s (tecla H). 1 uso por rodada.' },
  { id: 'caixa', kind: 'e', cat: 'Cura', name: 'Caixinha do Seu Zé', price: 800, max: 1, team: 1, desc: 'Até +50 HP em 5 s em você ou num aliado ao lado. Só uma por equipe.' }
];
/* ---------------- FAZENDEIROS (5x5) ----------------
   Cada um tem 2 habilidades. free = cargas grátis por rodada; max = limite (o resto se compra na loja por price).
   Nenhuma habilidade mata sozinha: todas abrem espaço, dão informação, atrasam ou curam. */
/* AGENTES do 5x5 (ids internos mantidos). Habilidades: [0] Z e [1] X compradas · [2] C assinatura (grátis, recarrega) · [3] F suprema (pontos) */
const FARMERS = {
  peao: { name: 'Tico Bruto', role: 'Espetáculo', col: '#e8432a', desc: 'Chegou na fazenda pra fazer barulho. Imprevisível, sempre atrás da próxima brincadeira — ou confronto.',
    ab: [{ id: 'investida', name: 'Investida do Touro', free: 1, max: 1, price: 0, desc: 'Arrancada de ~6 m na direção em que você anda (atravessa o bombsite antes que mirem).' },
      { id: 'rojao', name: 'Granada de Milho', free: 1, max: 2, price: 200, desc: 'Espiga explosiva: estoura num clarão de pipoca 0,9 s depois e cega quem olhar (até 2 s). Cuidado com os aliados.' },
      { id: 'pulo', name: 'Pulo do Sítio', sig: 1, free: 1, max: 1, price: 0, cd: 30, desc: 'Estalo de chicote e um salto de ~4 m: alcança caixas, palheiros e ângulos altos. Recarrega em 30 s.' },
      { id: 'festa', name: 'Festa do Roçado', ult: 1, cost: 7, desc: 'Fogos de São João: marque uma área de 6 m (até 40 m). Depois de 1 s de aviso, 5 estouros de 35 de dano em 3 s. Dá para fugir!' }] },
  rastreador: { name: 'Dona Jurema', role: 'Caçadora', col: '#4ac24a', desc: 'Nada escapa aos olhos de Dona Jurema. Ela rastreia, revela e prepara o terreno para o time.',
    ab: [{ id: 'gaviao', name: 'Marca do Matuto', free: 1, max: 1, price: 0, desc: 'Solta o gavião: revela por 3,5 s os inimigos num cone de 38 m à sua frente (atravessa paredes).' },
      { id: 'espiao', name: 'Espião do Mato', free: 0, max: 2, price: 200, desc: 'Dardo de capim arremessado: onde cair, dá 2 pulsos que revelam inimigos à vista a 14 m. Pode ser destruído.' },
      { id: 'galinha', name: 'Armadilha de Galinha', sig: 1, free: 1, max: 1, price: 0, cd: 35, desc: 'Solta uma galinha que corre em frente por até 20 m. Se achar um inimigo, explode em penas: cega 1,2 s e revela por 3 s.' },
      { id: 'olho', name: 'Olho da Roça', ult: 1, cost: 7, desc: 'Todos os inimigos aparecem para o seu time em 3 pulsos (agora, em 2 s e em 4 s), onde estiverem.' }] },
  guardiao: { name: 'Zé Patrão', role: 'Parede', col: '#ffb81a', desc: 'Autoridade na fazenda, Zé Patrão protege o que é seu. Com ele, nada passa despercebido.',
    ab: [{ id: 'arapuca', name: 'Cerca Elétrica', free: 1, max: 2, price: 150, desc: 'Fio eletrificado escondido no chão: quem pisar toma choque, fica lento (−70%) e revelado por 3 s.' },
      { id: 'cerca', name: 'Portão Blindado', free: 1, max: 1, price: 0, desc: 'Portão de 4,5 m com chapas de aço: bloqueia passagem e tiros por 18 s (300 de vida).' },
      { id: 'sino', name: 'Sinal do Gado', sig: 1, free: 1, max: 1, price: 0, cd: 40, desc: 'Sino no chão por 30 s: toca e revela quem passar a 6 m. Pode ser destruído. Recarrega em 40 s.' },
      { id: 'territorio', name: 'Território do Patrão', ult: 1, cost: 7, desc: 'Crava a placa "PROPRIEDADE PARTICULAR": depois de 5 s, inimigos a 16 m ficam presos (lentos e sem atirar) por 5 s. Quebre a placa antes (200 de vida)!' }] },
  mateiro: { name: 'Tati Fumaça', role: 'Neblina', col: '#b04ad8', desc: 'Onde tem fumaça, tem Tati. Ela controla o campo, bloqueia a visão e muda o jogo.',
    ab: [{ id: 'fumaca', name: 'Fumaça da Roça', free: 1, max: 2, price: 150, desc: 'Lata arremessada: nuvem de 4,6 m por 13 s que bloqueia a visão.' },
      { id: 'nuvem', name: 'Nuvem Tática', free: 1, max: 2, price: 200, desc: 'Mire num ponto até 45 m e solte: uma nuvem de 4 m cai lá na hora e dura 10 s.' },
      { id: 'lama', name: 'Campo Sujeira', sig: 1, free: 1, max: 1, price: 0, cd: 35, desc: 'Bola de lama: poça de 3,6 m por 7 s que deixa inimigos 45% mais lentos. Recarrega em 35 s.' },
      { id: 'insetos', name: 'Chuva de Insetos', ult: 1, cost: 7, desc: 'Enxame numa área de 9 m (até 40 m) por 12 s: bloqueia a visão; inimigos dentro ficam lentos e tomam 4 de dano por segundo.' }] },
  socorrista: { name: 'Seu Mineiro', role: 'Suporte', col: '#3ac8c0', desc: 'Calmo, esperto e sempre com um plano. Seu Mineiro mantém o time de pé.',
    ab: [{ id: 'garrafada', name: 'Pão de Queijo', free: 1, max: 1, price: 0, desc: 'Cura 50 em 3 s: o aliado na mira (até 3 m) ou você. Dano interrompe.' },
      { id: 'mutirao', name: 'Cura de Fazenda', free: 0, max: 1, price: 250, desc: 'Área de 4,2 m por 6 s: aliados dentro recuperam 8 de vida por segundo.' },
      { id: 'reforco', name: 'Reforço do Sítio', sig: 1, free: 1, max: 1, price: 0, cd: 40, desc: 'Colete de palha: 50 de escudo extra para você e os aliados a 5 m (some no fim do round). Recarrega em 40 s.' },
      { id: 'reanima', name: 'Reanimação do Bão', ult: 1, cost: 7, desc: 'Mire num aliado caído a até 6 m: ele levanta na hora com 60 de vida.' }] }
};
const FARMER_IDS = Object.keys(FARMERS);
/* habilidades do meu fazendeiro como itens da loja (hab0 / hab1) */
const habAb = id => { const me = typeof G !== 'undefined' && G.me, F = me && FARMERS[me.farmer]; return F ? F.ab[+id[3]] : null; };
const habEntry = id => { if (!/^hab[01]$/.test(id)) return null; const ab = habAb(id); return ab ? { id, kind: 'h', cat: 'Habilidades', name: ab.name, price: ab.price, max: ab.max, icon: 'ab_' + ab.id, desc: ab.desc + (ab.price ? '' : ' (só a carga grátis da rodada)') } : null; };
const shopPrice = id => { const h = habEntry(id); if (h) return h.price; const e = SHOP.find(s => s.id === id); return e ? (e.kind === 'w' ? WEAPONS[id].price | 0 : e.price) : 0; };
const shopName = id => { const h = habEntry(id); if (h) return h.name; const e = SHOP.find(s => s.id === id); return e ? (e.kind === 'w' ? WEAPONS[id].name : e.name) : id; };
/* cura do Roçado Tático (limitada) */
const HEAL_TAT = { pano: { name: 'Pano de Prato do Vovô', amt: 25, time: 2.5 }, caixa: { name: 'Caixinha do Seu Zé', amt: 50, time: 5 } };
/* cura do Battle Royale (mochila; uso manual com confirmação) */
const HEALS = {
  pano_br: { name: 'Pano de Prato', amt: 25, time: 2, max: 6, w: 30, icon: '🧻' },
  leite: { name: 'Leite da Mimosa', amt: 15, time: 2, max: 6, w: 26, icon: '🥛' },
  spray: { name: 'Spray Mata-Bicheira', amt: 30, time: 1.5, max: 4, w: 18, icon: '🧴' },
  mel: { name: 'Mel do Apiário', amt: 40, time: 5, max: 3, w: 12, icon: '🍯' },
  marmita: { name: 'Marmita da Vó', amt: 50, time: 4, max: 3, w: 9, icon: '🍱' },
  caixa_br: { name: 'Caixa do Seu Zé', amt: 100, time: 7, max: 1, w: 2.5, icon: '🧰' }
};
const HEAL_IDS = Object.keys(HEALS);
const PARACHUTES = [{ id: 'lencol', name: 'Lençol', col: 0xf2efe6, col2: 0x8ab4e8 }, { id: 'panoprato', name: 'Pano de Prato', col: 0xe85a4a, col2: 0xfaf4ea }, { id: 'toalha', name: 'Toalha', col: 0x38b0c8, col2: 0xf4d24a }, { id: 'guardachuva', name: 'Guarda-chuva', col: 0x3a3a46, col2: 0xd84a8a, umbrella: true }];
const BR = { cowH: 95, cowSpeed: 24, cowWait: 5, chuteFall: 5.2, chuteSpeed: 10, freeFallT: 0.9, maxPlayers: 50 };

/* ---------------- personagens ---------------- */
const SKINS = [
  { id: 'capuz', name: 'Maico Capuz Azul', skin: 0xf2b88c, hair: 0x4a2a16, hairStyle: 'spiky', shirt: 0x2f55d6, shirt2: 0x7a3fd0, pants: 0x1c1c26, pants2: 0x7a3fd0, boots: 0x1a1a1a, sole: 0x8a8a90, hat: 'none', beard: 'none', hood: true },
  { id: 'ze', name: 'Zé da Roça', skin: 0xe6a878, hair: 0x2a1c10, hairStyle: 'short', shirt: 0xc8342e, shirt2: 0xf2e8d0, pants: 0x2f5aa8, pants2: 0x244a8a, boots: 0x5a3a20, sole: 0x2a1c10, hat: 'straw', beard: 'mustache', overalls: true },
  { id: 'tonhao', name: 'Tonhão do Trator', skin: 0xd99a6c, hair: 0x2a1a0a, hairStyle: 'short', shirt: 0xe8731c, shirt2: 0xf4c53a, pants: 0x4a4a52, pants2: 0x3a3a42, boots: 0x2a2a2a, sole: 0x111111, hat: 'cap', beard: 'full', bulk: 1.12 },
  { id: 'chico', name: 'Chico Mandioca', skin: 0xc98a5c, hair: 0x1a1008, hairStyle: 'short', shirt: 0x3aa24a, shirt2: 0xf2d24a, pants: 0xb89a5a, pants2: 0x9a7e44, boots: 0x6a4a2a, sole: 0x2a1a0a, hat: 'bucket', beard: 'none' },
  { id: 'galinha', name: 'Dona Galinha', skin: 0xf6f1e6, hair: 0xd9342b, hairStyle: 'comb', shirt: 0xf8f4ea, shirt2: 0xe8dfc8, pants: 0xf2eee2, pants2: 0xe8dfc8, boots: 0xf2a62a, sole: 0xd9842a, hat: 'none', beard: 'none', special: 'chicken' },
  { id: 'porcao', name: 'Seu Porcão', skin: 0xf4a6b8, hair: 0xe88aa0, hairStyle: 'none', shirt: 0xf09ab0, shirt2: 0xd9708a, pants: 0x6a4a9a, pants2: 0x4a3278, boots: 0x3a2a2a, sole: 0x1a1010, hat: 'none', beard: 'none', special: 'pig', bulk: 1.15 },
  { id: 'joao', name: 'João do Galho', skin: 0xd8a070, hair: 0x5a3a1c, hairStyle: 'leaf', shirt: 0x6a4a2a, shirt2: 0x4a7a2a, pants: 0x4a5a2a, pants2: 0x3a4a1e, boots: 0x3a2a14, sole: 0x1a1208, hat: 'none', beard: 'full' }
];
const BOT_NAMES = ['ZéDaRoça', 'MandiocaBR', 'ChicoGalho', 'TonhãoTrator', 'DonaCotinha', 'ZecaUrubu', 'MariaFarinha', 'NhôChico', 'CaboMilho', 'SôTião', 'BodeAtômico', 'JucaDoJegue',
  'GaloCego', 'VacaLouca', 'PorcoEspinho', 'CapiauZero', 'MatutoPro', 'SeuBatata', 'TiaGalinha', 'RoçaMaster', 'PeãoNinja', 'CuiaDeFogo', 'CarroçaVeloz', 'Pé-de-Feijão', 'GalinhaPintada'];

/* ---------------- modos ---------------- */
const MODES = {
  tatico: { id: 'tatico', name: 'ROÇADO TÁTICO', sub: '5x5', desc: 'Vence quem fizer 13: troca de lados após 12, prorrogação no 12x12. Fazendeiros com habilidades, economia, loja e mandioca explosiva.', map: 'fazenda', min: 6, max: 10, roundTime: 100, prep: 8, plantTime: 4, bombTime: 40, defuseTime: 7, endDelay: 5, minPerTeam: 3 },
  caos: { id: 'caos', name: 'TODOS CONTRA TODOS', sub: 'Battle Royale', desc: 'Até 50 participantes. Salte da vaca voadora, abra o paraquedas, junte loot e cura e seja o último de pé.', map: 'fazenda', min: 2, max: 50, prep: 5, endDelay: 8 }
};
const COUNTDOWN_FULL = 120;       // contagem regressiva (s) quando atinge o mínimo (sem bots)
const COUNTDOWN_FILL = 20;        // contagem curta quando há ≥2 humanos e bots completam as vagas
const BOT_LEVELS = { facil: { name: 'Fácil', react: .62, aim: 3.4, err: 3.2, burst: .6, grenade: .1 }, normal: { name: 'Normal', react: .42, aim: 5.2, err: 1.9, burst: 1, grenade: .3 }, dificil: { name: 'Difícil', react: .28, aim: 7.5, err: 1.0, burst: 1.4, grenade: .55 }, insano: { name: 'Insano', react: .16, aim: 11, err: .5, burst: 2, grenade: .8 } };
const QUALITY = {
  /* post: 0 = direto na tela, 1 = HDR + gradação + FXAA, 2 = + contorno cartoon + oclusão ambiente. shR = raio da sombra (m) */
  muito_baixo: { name: 'Muito baixo', scale: .55, shadow: 0, dist: .45, grass: .1, parts: .3, aa: false, terrLod: 34, lodDist: 30, post: 0 },
  baixo: { name: 'Baixo', scale: .7, shadow: 1024, shR: 38, dist: .6, grass: .25, parts: .5, aa: false, terrLod: 44, lodDist: 38, post: 0 },
  celular: { name: 'Celular (nítido)', scale: 1, shadow: 1024, shR: 40, dist: .62, grass: .3, parts: .55, aa: false, terrLod: 44, lodDist: 40, post: 0 },
  medio: { name: 'Médio', scale: .85, shadow: 2048, shR: 70, dist: .8, grass: .55, parts: .75, aa: true, terrLod: 56, lodDist: 48, post: 1 },
  alto: { name: 'Alto', scale: 1, shadow: 2048, shR: 90, shSpread: 1.35, dist: 1, grass: 1, parts: 1, aa: true, terrLod: 72, lodDist: 60, post: 2, outline: 1, ao: 1 }
};

/* ---------------- textos engraçados ---------------- */
const FUNNY = {
  prep: ['Ajeita o chapéu de palha!', 'Cuidado com as galinhas!', 'Quem trouxe a mandioca?', 'O café já esfriou, bora lutar!', 'Respira fundo: cheiro de esterco e glória.'],
  head: ['CABEÇADA DE MILHO!', 'DESPENTEOU!', 'TIRO NA CUIA!', 'CHAPÉU VOOU!'],
  kill: ['PENEIROU!', 'ARRASTOU NA ROÇA!', 'TÁ NO PUNHO!', 'MANDOU BEM, PEÃO!'],
  multi: ['', '', 'DOBRADINHA!', 'TRIPLE DE GALINHA!', 'QUADRA NO CURRAL!', 'CHACINA NO GALINHEIRO!'],
  plant: 'A MANDIOCA FOI PLANTADA!', plantSub: 'Desarme antes que vire purê!',
  defused: 'MANDIOCA DESARMADA!', boom: 'MANDIOCA EXPLODIU!',
  win: ['Vitória no roçado!', 'Colheita farta!', 'A galinharada venceu!'],
  lose: ['Perdeu pro mato...', 'Virou purê de mandioca.', 'Até as galinhas riram.'],
  death: ['Virou adubo.', 'Foi comer capim pela raiz.', 'Pisou na batata errada.', 'Levou um susto de vaca.']
};
const KILL_VERB = { festa: 'soltou fogos em', insetos: 'enxameou', galho: 'galhou', estilingue: 'estilingou', vassoura: 'vassourou', colher: 'colherou', faca: 'cortou manteiga de', batata: 'batatou', mandioca: 'mandiocou', zona: 'secou', queda: 'derrubou', outro: 'eliminou' };

/* ---------------- configurações e perfil ---------------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('bombaki2.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bombaki2.' + k, JSON.stringify(v)); } catch (e) { } }
};
const DEFAULT_SETTINGS = {
  quality: 'alto', renderScale: 1, shadows: 2048, viewDist: 1, grass: 1, particles: 1, aa: true,
  fov: 90, sens: 1.0, adsSens: 0.85, invertY: false, master: 0.8, sfx: 1, music: 0.35, amb: 0.6,
  crosshair: '#ffffff', crossSize: 1, showFps: false, showHints: true, showPing: true, botLevel: 'normal', bobbing: 1, hitSound: true, dmgNums: true, funnyDeaths: true, cameraShake: 1,
  fpsCap: 0, shadowQ: 'auto', perfMode: false, outline: 'auto', ao: 'auto', toon: true, perfHud: false, padSens: 1, touchSize: 1, touchAlpha: .8, touchSens: 1, voice: 'off', binds: {}
};
const IS_TOUCH = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) || /Android|iPhone|iPad|Mobile/i.test((typeof navigator !== 'undefined' && navigator.userAgent) || '');
const settings = Object.assign({}, DEFAULT_SETTINGS, { quality: IS_TOUCH ? 'celular' : 'medio', autoRes: IS_TOUCH }, store.get('settings', {}));
if (!QUALITY[settings.quality]) settings.quality = settings.quality === 'ultra' ? 'alto' : 'medio';
/* qualidade efetiva (modo desempenho força "muito baixo") */
const effQuality = () => (settings.perfMode ? 'muito_baixo' : settings.quality);
const QQ = () => QUALITY[effQuality()] || QUALITY.medio;
const saveSettings = () => store.set('settings', settings);
const profile = Object.assign({ name: 'AllMaico', id: '', skin: 0, farmer: 'peao', xp: 0, matches: 0, wins: 0, losses: 0, kills: 0, deaths: 0, heads: 0, friends: [], primary: 'galho' }, store.get('profile', {}));
if (!profile.id) profile.id = uid();
const saveProfile = () => { store.set('profile', profile); if (typeof Account !== 'undefined') Account.sync(); };
const xpForLevel = l => 100 + (l - 1) * 40;
function levelInfo() { let l = 1, x = profile.xp; while (x >= xpForLevel(l)) { x -= xpForLevel(l); l++; } return { level: l, xp: x, need: xpForLevel(l) }; }
/* chapéus cosméticos (sem vantagem) — desbloqueados por nível. O índice viaja junto com a skin: skin = base + SKINS.length * chapéu */
const HATS = [
  { id: '', name: 'Do personagem', lv: 1 }, { id: 'none', name: 'Sem chapéu', lv: 1 }, { id: 'straw', name: 'Chapéu de Palha', lv: 2 },
  { id: 'cap', name: 'Boné do Trator', lv: 3 }, { id: 'bucket', name: 'Chapéu de Pescador', lv: 4 }, { id: 'bandana', name: 'Bandana Vermelha', lv: 5 },
  { id: 'cowboy', name: 'Chapéu de Vaqueiro', lv: 7 }, { id: 'pan', name: 'Panela da Vó', lv: 9 }, { id: 'sunflower', name: 'Girassol na Cabeça', lv: 12 },
  { id: 'crown', name: 'Coroa de Milho', lv: 15 }
];
const SKIN_MAX = () => SKINS.length * HATS.length;
const hatIdx = sk => Math.min(HATS.length - 1, Math.floor((sk | 0) / SKINS.length));
/* chapéu efetivo de uma skin de rede ('' = nenhum) */
function hatOf(sk) { const S = SKINS[(sk | 0) % SKINS.length], h = HATS[hatIdx(sk)]; const id = h && h.id ? h.id : (S.hood ? 'none' : S.hat); return id === 'none' ? '' : id; }
/* skin enviada para a partida: personagem + chapéu escolhido (se já desbloqueado) */
function wireSkin() { const hi = Math.max(0, HATS.findIndex(h => h.id === (profile.hat || ''))), ok = HATS[hi] && levelInfo().level >= HATS[hi].lv; return ((profile.skin | 0) % SKINS.length) + SKINS.length * (ok ? hi : 0); }
const hatsUnlockedAt = lv => HATS.filter(h => h.lv === lv && h.id);
