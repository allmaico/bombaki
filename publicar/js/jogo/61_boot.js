/* =====================================================================
   61_boot.js — fluxos (offline / host / cliente / público), cena do menu,
   desenho por quadro, loop principal e inicialização.
   ===================================================================== */
'use strict';
const QS = new URLSearchParams(location.search);
const tabToken = () => { try { let t = sessionStorage.getItem('bk.tok'); if (!t) { t = uid(); sessionStorage.setItem('bk.tok', t); } return t; } catch (e) { return uid(); } };
const transportKind = () => (QS.get('net') === 'local' ? 'local' : 'peer');

/* posição da câmera/personagem na cena do menu (fazenda ao entardecer) */
/* cena 3D do menu: herói em 3/4 na frente do celeiro e do silo (az = direção herói→câmera; ch = altura da câmera sobre o chão) */
const MENU = { px: 90, pz: -34, az: .2, dist: 5.4, face: .6, ch: 1.2, pitch: .02, fov: 40, yo: .045 };

const Game = {
  /* ---------- offline ---------- */
  startOffline(o) {
    cleanup(); G.kind = 'offline'; G.mode = o.mode; o = Object.assign({}, o, { map: resolveTatMap(o.map || QS.get('map') || store.get('tatMap', 'vila')) }); G.lastOffline = o; useMap(mapFor(o.mode, o.map));
    const sim = new Sim({ mode: o.mode, map: G.map, nav: G.nav, cfg: { rounds: 12, format: o.format || store.get('tatFormat', 'comp'), botLevel: o.botLevel || 'normal', fill: true, perTeam: 5, total: o.total || 30, ff: false, select: true, squad: o.mode === 'caos' ? (o.squad | 0) : 0 } });
    const me = sim.addPlayer({ name: profile.name, skin: wireSkin(), farmer: profile.farmer, cos: Cos.wire(), loadout: profile.primary, local: true, fc: Social.fc() });
    G.sim = sim; G.me = me; G.myId = me.id; sim.startMatch();
    /* testes automáticos (?test=1, partida offline): seleção e carregamento passam direto (o agente do perfil é travado) */
    if (QS.get('test') && QS.get('flow') !== '1' && sim.phase === 'select') { for (const p of sim.players) p.pickAt = p.bot ? 0 : 0; for (let i = 0; i < 60 * 40 && /** @type {string} */ (sim.phase) !== 'prep'; i++) sim.step(); }
    G.rinfo = new Map(sim.players.map(p => [p.id, { id: p.id, name: p.name, skin: p.skin, cos: p.cos, bot: p.bot, bsq: p.bsq | 0, fc: p.fc || '' }])); G.ents = new Map();
    beginPlay();
  },
  /* ---------- anfitrião ---------- */
  async hostRoom(o) {
    cleanup(); const kind = transportKind(); let net = null, code = '';
    for (let i = 0; i < 6; i++) {
      code = o.code || makeCode();
      net = new NetHost({ code, kind, cfg: { mode: o.mode, rounds: o.rounds || 12, format: o.format || 'comp', map: o.map || store.get('tatMap', 'vila'), fill: o.fill !== false, botLevel: o.botLevel || 'normal', pub: !!o.pub, perTeam: 5, total: o.total || 30, squad: o.squad | 0, partyN: o.partyN | 0, name: profile.name }, cb: hostCallbacks() });
      try { await net.open(); break; } catch (e) { net = null; if (String(e) === 'taken' && !o.code) continue; throw e; }
    }
    if (!net) throw 'taken';
    G.net = net; G.kind = 'host'; G.code = code; G.transport = kind; G.mode = o.mode;
    const mem = net.addLocal({ name: profile.name, skin: wireSkin(), farmer: profile.farmer, cos: Cos.wire(), party: Party.wireId(), fc: Social.fc(), loadout: profile.primary, token: tabToken() }); G.myId = mem.id;
    G.scene = 'lobby'; UI.lobbyOpen(code, true, mem.id); UI.lobbyUpdate(net.lobbyMsg()); UI.lobbyChat({ n: '', t: 'Sala criada! Compartilhe o código ' + code + ' ou o link.' });
    return code;
  },
  /* ---------- cliente ---------- */
  async joinRoom(code, o) {
    cleanup(); const kind = transportKind(), nc = new NetClient(clientCallbacks());
    const w = await nc.connect(kind, code, { name: profile.name, skin: wireSkin(), farmer: profile.farmer, cos: Cos.wire(), party: Party.wireId(), fc: Social.fc(), loadout: profile.primary, token: tabToken() }, o && o.timeout);
    G.nc = nc; G.kind = 'client'; G.code = code; G.transport = kind; G.myId = nc.id; G.mode = w.cfg.mode;
    G.scene = 'lobby'; UI.lobbyOpen(code, false, nc.id); const M = MODES[w.cfg.mode];
    UI.lobbyUpdate({ cfg: w.cfg, members: w.members, cd: -1, min: M.min, max: M.max, phase: w.phase }); for (const m of w.chat || []) UI.lobbyChat({ n: m.n, t: m.t });
    if (w.start) clientStart(w.start);
    return w;
  },
  /* ---------- partida pública: procura sala aberta ou cria uma ---------- */
  async publicMatch(o) {
    const m = UI.open(`<h2>Procurando partida…</h2><p id="pmSt">Conectando ao roçado público (${MODES[o.mode].name})…</p><div class="row" style="justify-content:center;margin-top:10px"><button class="btn r" id="pmCancel">Cancelar</button></div>`);
    let cancel = false; const st = t => { const e = m.querySelector('#pmSt'); if (e) e.textContent = t; }; m.querySelector('#pmCancel').onclick = () => { cancel = true; UI.close(); };
    const letter = o.mode === 'tatico' ? 'T' : (o.squad | 0) > 1 ? 'S' : 'C';
    try {
      for (let i = 1; i <= 6 && !cancel; i++) {
        const code = 'P' + letter + i; st(`Procurando sala ${i}/6…`);
        try { await Game.joinRoom(code, { timeout: 4500 }); if (!cancel) { UI.close(); return; } else { Game.leave(); return; } } catch (e) { const s = String(e && e.message || e); if (s !== 'notfound' && s !== 'timeout') continue; }
        if (cancel) return; st(`Criando sala pública ${i}…`);
        try { await Game.hostRoom({ mode: o.mode, pub: true, code, fill: true, rounds: 12, botLevel: o.botLevel, total: o.total || 30, map: o.map, format: o.format, squad: o.squad | 0, partyN: o.partyN | 0 }); UI.close(); UI.toast('Sala pública criada! Aguardando jogadores (bots completam).'); return; }
        catch (e) { if (String(e) === 'taken') { try { await Game.joinRoom(code, { timeout: 4500 }); UI.close(); return; } catch (e2) { } } }
      }
      if (!cancel) { UI.close(); UI.toast('Não foi possível achar nem criar uma sala agora. Confira sua internet e tente de novo.', 5000); }
    } catch (e) { UI.close(); UI.toast(UI.errText(e), 5000); }
  },
  /* ---------- sair ---------- */
  leave() {
    if (G.net) { try { G.net.close(); } catch (e) { } } if (G.nc) { try { G.nc.close(); } catch (e) { } }
    cleanup(); toMenu();
  },
  /* ---------- voltar ao chiqueiro ---------- */
  toLobbyHost() {
    if (G.kind !== 'host' || !G.net) return; G.net.backToLobby(); stopMatch(); G.scene = 'lobby'; UI.lobbyOpen(G.code, true, G.myId); UI.lobbyUpdate(G.net.lobbyMsg()); G.net.dirty = true;
  },
  /* ---------- revanche: mesma sala, mesmo mapa, mesmas equipes ---------- */
  rematch() {
    if (G.kind === 'offline') { Game.startOffline(G.lastOffline); return; }
    if (G.kind !== 'host' || !G.net) return;
    G.rematchSq = new Map((G.sim ? G.sim.players : []).filter(p => !p.bot).map(p => [p.id, p.squad | 0])); if (G.net.cfg.mapId) G.net.cfg.map = G.net.cfg.mapId;
    G.net.backToLobby(); stopMatch(); G.net.startNow();
  },
  /* ---------- tela de fim ---------- */
  showEndScreen() {
    if (G.endShown || G.scene !== 'play') return; G.endShown = true; try { document.exitPointerLock(); } catch (e) { }
    const ros = getRoster().sort((a, b) => b.score - a.score), me = ros.find(r => r.isMe) || /** @type {any} */ ({ k: 0, d: 0, a: 0, score: 0 }), tat = isTat(); let win = false, sub = '';
    let draw = false; if (tat) { const sq = G.sim ? G.sim.get(G.myId).squad : (myTeam() === T_ATK ? G.swap : G.swap ^ 1); win = G.winner === sq; draw = G.winner === -1; sub = `${draw ? 'EMPATE · ' : ''}Placar final: ${SQ_NAME[sq]} ${G.score[sq]} x ${G.score[sq ^ 1]} ${SQ_NAME[sq ^ 1]}`; }
    else { const mySq = myBsq(); win = G.winner === G.myId || (!!G.winSq && mySq === G.winSq); sub = win ? (G.winSq ? 'Seu esquadrão foi o último de pé no galinheiro! 🏆' : 'Você foi o último de pé no galinheiro!') : (G.winner ? ownerName(G.winner) + (G.winSq ? ' e o esquadrão dele venceram.' : ' foi o último de pé.') : ''); }
    const hs = G.sim ? G.sim.get(G.myId).hs | 0 : 0, xp = 20 + me.k * 10 + Math.round(me.score / 12) + (win ? 60 : 0), L0 = levelInfo().level;
    profile.xp += xp; profile.matches++; if (win) profile.wins++; else if (!draw) profile.losses++; profile.kills += me.k; profile.deaths += me.d; profile.heads += hs;
    const ms = G.mstat || {}, sp = G.sim && G.sim.get(G.myId), place = sp ? sp.place | 0 : ((G.sb.get(G.myId) || {}).place | 0);
    const got = Account.recordMatch({ mode: G.mode, win, draw, k: me.k, d: me.d, a: me.a | 0, hs: sp ? sp.hs | 0 : ms.hs | 0, shots: sp ? sp.shots | 0 : ms.shots | 0, hits: sp ? sp.hits | 0 : ms.hits | 0, time: Math.round(G.time - (G.matchT0 || G.time)), score: me.score, place, survive: ms.survive | 0, roundsWon: tat ? G.score[G.sim ? G.sim.get(G.myId).squad : 0] | 0 : 0, plants: ms.plants | 0, defuses: ms.defuses | 0, knife: ms.knife | 0, sling: ms.sling | 0, aces: ms.aces | 0, xp, sc: tat ? `${G.score[0] | 0}x${G.score[1] | 0}` : '', map: G.map && G.map.name });
    const milho = 30 + me.k * 6 + (win ? 60 : 0) + (tat ? (G.score[G.sim ? G.sim.get(G.myId).squad : 0] | 0) * 4 : 0); Cos.earn(milho); setTimeout(() => UI.toast('🌽 +' + milho + ' de Milho para a Loja de Cosméticos!', 3500), 300);
    Social.rememberMatch(); saveProfile(); const L1 = levelInfo().level; UI.refreshProfile(); got.forEach((A, i) => setTimeout(() => UI.toast('🏅 Conquista: ' + A.name + ' — ' + A.desc, 4000), 600 + i * 900));
    const buttons = [];
    if (G.kind === 'offline') {
      buttons.push({ t: tat ? 'Revanche' : 'Jogar de novo', cls: 'y', fn: () => Game.rematch() });
      if (tat) { const other = TAT_MAPS.find(t => t.id !== G.map.id); if (other) buttons.push({ t: 'Jogar em ' + other.name, cls: 'g', fn: () => Game.startOffline(Object.assign({}, G.lastOffline, { map: other.id })) }); }
      buttons.push({ t: 'Menu principal', fn: () => Game.leave() });
    }
    else if (G.kind === 'host') { if (tat) buttons.push({ t: 'Revanche (mesmas equipes)', cls: 'y', fn: () => Game.rematch() }); buttons.push({ t: 'Voltar ao Chiqueiro', cls: tat ? 'g' : 'y', fn: () => Game.toLobbyHost() }); buttons.push({ t: 'Sair', cls: 'r', fn: () => Game.leave() }); }
    else { buttons.push({ t: 'Aguardando o anfitrião…', cls: 'y', fn: () => UI.toast('O anfitrião vai levar todos de volta ao Chiqueiro.') }); buttons.push({ t: 'Sair', cls: 'r', fn: () => Game.leave() }); }
    let T = null;
    if (tat) {
      const mySq = G.sim ? G.sim.get(G.myId).squad : (myTeam() === T_ATK ? G.swap : G.swap ^ 1), all = getRoster(), bySq = q => all.filter(p => p.squad === q).sort((a, b) => b.score - a.score);
      const mvp = all.slice().sort((a, b) => (b.mvps - a.mvps) || (b.score - a.score) || (b.k - a.k))[0];
      T = { mySq, score: [G.score[0] | 0, G.score[1] | 0], hist: (G.rhist || []).slice(), teams: [bySq(0), bySq(1)], mvp, map: G.map.name, draw };
    }
    UI.showEnd({ tat: T, win, title: draw ? 'EMPATE NO ROÇADO!' : win ? (tat ? 'DONO DO ROÇADO!' : 'SOBROU SÓ VOCÊ!') : pick(FUNNY.lose).toUpperCase(), sub, rows: ros.slice(0, 12), xp, levelUp: L1 > L0 ? L1 : 0, lvFrom: L0, buttons });
  }
};

/* ---------- limpeza / transições ---------- */
function stopMatch() {
  G.lastTk = 0; G.pkExp = 0; G.pkLost = 0; G.sim = null; G.pred = null; G.buf = null; G.ents = new Map(); G.me = null; G.spec = false; G.evBuf = []; G.cmdOut = []; G.loot = []; G.nades = []; G.zone = null; G.phase = 'lobby'; G.paused = false; G.matchOver = false; G.endShown = false;
  G.bomb = { st: 'none', x: 0, y: 0, z: 0, timer: 0, carrier: 0, site: '', defBy: 0 }; Input.keys.clear(); Input.btn[0] = Input.btn[1] = Input.btn[2] = false; Input.acts.length = 0; Input.typing = false;
  $('endscr').classList.add('hidden'); $('pause').classList.add('hidden'); $('click2play').classList.add('hidden'); try { document.exitPointerLock(); } catch (e) { }
  sfx.stopAmbient(); if (G.fx) G.fx.clear(); if (G.R) G.R.clearDecals();
  try { Shop.toggle(false); Bag.toggle(false); BigMap.toggle(false); Voice.stop(); } catch (e) { } Input.menu = false; G.cowS = null;
}
function cleanup() { FlowUI.reset(); stopMatch(); G.net = null; G.nc = null; G.code = ''; G.kind = 'offline'; G.reconnecting = false; G.sb = new Map(); G.rinfo = new Map(); UI.lobbyCode = ''; }
function toMenu() {
  useMap('fazenda'); G.scene = 'menu'; G.mode = 'tatico'; UI.screen('menu'); UI.refreshProfile(); if (G.hud) G.hud.reset(); $('endscr').innerHTML = ''; sfx.setRoom('aberto'); if (settings.music > 0 && sfx.ctx) sfx.playlist(MENU_PLAYLIST);
  if (G.R) G.R.setEnv('tarde');
}
function beginPlay() {
  G.winSq = 0; G.mstat = {}; G.rhist = []; G.farmPickShown = false; G.blindT = 0; G.abx = []; AbFx.birds = []; G.matchT0 = G.time; G.scene = 'play'; G.paused = false; G.spec = false; G.matchOver = false; G.endShown = false; G.winner = undefined; G.endText = ''; G.recoil = { p: 0, y: 0 }; G.view.pitch = 0; G.fovMul = 1; G.zoom = 1; G.syncView = true; G.stepAcc = 0; G.lastGnd = true;
  G.vm = new ViewModel(); G.vm.onCue = (name, k) => { if (name === 'rl' && G.me) { sfx.reloadStep(wBase(G.me.w), k, null); const w = wBase(G.me.w); if (k === 2 && (w === 'porteira' || w === 'vassoura') && G.fx) { const b = camBasis(G.cam.yaw, G.cam.pitch), p = vmToWorld(G.cam, { x: .16, y: -.16, z: -.38 }); for (let i = 0; i < (w === 'porteira' ? 2 : 1); i++) G.fx.shell(p.x, p.y, p.z, b.r[0], b.r[2], w === 'porteira'); } } };
  G.fx.clear(); G.R.clearDecals(); G.weather = -1; G.R.setEnv(G.map.env || 'dia'); G.hud.reset(); G.hud.setMap(G.map, G.mode); UI.screen('hud'); G.hud.cache = {}; G.hud.cache.plk = '';
  Input.keys.clear(); Input.acts.length = 0; Input.btn[0] = Input.btn[1] = Input.btn[2] = false;
  if (G.me) { G.view.yaw = G.me.m.yaw; G.prev.x = G.me.m.x; G.prev.y = G.me.m.y; G.prev.z = G.me.m.z; G.cam.x = G.me.m.x; G.cam.y = G.me.m.y + 1.6; G.cam.z = G.me.m.z; }
  if (Input.force) $('click2play').classList.add('hidden'); else { $('click2play').classList.remove('hidden'); lockPointer(); }
  AutoRes.reset(); if (IS_TOUCH && settings.autoFull !== false && !QS.get('test')) Full.enter(true);
  sfx.init(); sfx.stopMusic(); sfx.setIntensity(0); if (settings.amb > 0) sfx.startAmbient(); if (settings.music > 0) sfx.startMusic('tranquilo');
  if (G.kind !== 'offline' && G.mode === 'tatico') setTimeout(() => Voice.start(), 1500);
}

/* ---------- callbacks do anfitrião ---------- */
function hostCallbacks() {
  return {
    lobby: l => { if (G.scene === 'lobby') UI.lobbyUpdate(l); },
    chat: m => { if (m.n && (profile.blocked || []).includes(m.n)) return; if (deadChatBlocked(m)) return; if (G.scene === 'lobby') UI.lobbyChat(m); else if (G.scene === 'play') G.hud.chatAdd(m.n, m.t, !m.n, 0); },
    start: () => hostStartMatch(),
    cmd: (mem, cmd) => { const p = G.sim && G.sim.get(mem.id); if (p && !p.bot && p.q.length < 14) p.q.push(cmd); },
    join: mem => { UI.toast(mem.name + ' entrou na sala'); },
    rejoin: mem => { const p = G.sim && G.sim.get(mem.id); if (p) { p.bot = false; p.ai = null; p.q.length = 0; p.connected = true; if (G.hud) G.hud.chatAdd('', mem.name + ' voltou à partida', true); } },
    leave: (mem, inGame) => { const p = G.sim && G.sim.get(mem.id); if (p && G.scene === 'play') { p.connected = false; p.bot = true; p.ai = new BotBrain(p, G.sim.cfg.botLevel); G.hud.chatAdd('', mem.name + ' desconectou — um bot assumiu', true); } },
    loadout: mem => { const p = G.sim && G.sim.get(mem.id); if (p) G.sim.setLoadout(p, mem.loadout); },
    expire: mem => { }
  };
}
function hostStartMatch() {
  const net = G.net, cfg = net.cfg; if (!net) return; cleanupSimOnly();
  G.mode = cfg.mode; cfg.mapId = resolveTatMap(cfg.map); useMap(mapFor(cfg.mode, cfg.mapId)); const sim = new Sim({ mode: cfg.mode, map: G.map, nav: G.nav, cfg: { select: true, rounds: cfg.rounds, format: cfg.format || 'comp', botLevel: cfg.botLevel, fill: cfg.fill, afk: QS.get('afk') !== '0', perTeam: 5, total: cfg.total || 30, ff: false, squad: cfg.mode === 'caos' ? (cfg.squad | 0) : 0 } });
  const fix = G.rematchSq; G.rematchSq = null;
  for (const m of net.members.values()) { const p = sim.addPlayer({ id: m.id, name: m.name, skin: m.skin, cos: m.cos, party: m.party, fc: m.fc, farmer: m.farmer, loadout: m.loadout, token: m.token, local: !!m.host }); if (fix && fix.has(m.id)) p.fixSq = fix.get(m.id); }
  sim.startMatch(); G.sim = sim; G.me = sim.get(G.myId); G.ents = new Map();
  G.rinfo = new Map(sim.players.map(p => [p.id, { id: p.id, name: p.name, skin: p.skin, cos: p.cos, bot: p.bot, bsq: p.bsq | 0, fc: p.fc || '' }]));
  net.announceStart(sim.players.map(p => ({ id: p.id, name: p.name, skin: p.skin, cos: p.cos, bot: p.bot, bsq: p.bsq | 0, fc: p.fc || '' })), {});
  beginPlay();
}
function cleanupSimOnly() { G.sim = null; G.ents = new Map(); }

/* no 5x5, mensagens de quem está morto não chegam a quem está vivo durante a rodada */
function deadChatBlocked(m) { if (G.scene !== 'play' || !isTat() || G.phase !== 'live' || !G.me || !G.me.alive || !m.id) return false; const e = G.ents.get(m.id); return !!(e && !e.alive); }

/* ---------- callbacks do cliente ---------- */
function clientCallbacks() {
  return {
    snap: onSnap,
    lobby: l => { if (G.scene === 'lobby') UI.lobbyUpdate(l); },
    start: m => clientStart(m),
    end: () => { if (G.scene === 'play') { stopMatch(); useMap('fazenda'); G.scene = 'lobby'; UI.lobbyOpen(G.code, false, G.myId); } },
    chat: m => { if (m.n && (profile.blocked || []).includes(m.n)) return; if (deadChatBlocked(m)) return; if (G.scene === 'lobby') UI.lobbyChat(m); else if (G.scene === 'play') G.hud.chatAdd(m.n, m.t, !m.n, 0); },
    kick: m => { UI.toast(m.why || 'Você foi removido da sala.', 4500); Game.leave(); },
    close: () => connectionLost()
  };
}
function clientStart(msg) {
  stopMatch(); G.mode = msg.mode; useMap(mapFor(msg.mode, msg.cfg && (msg.cfg.mapId || msg.cfg.map))); G.sim = null; G.rinfo = new Map(msg.roster.map(r => [r.id, r])); G.buf = new SnapBuf(); G.ents = G.buf.ent; G.sb = new Map();
  G.pred = new Predictor(G.myId, { name: profile.name, skin: wireSkin(), farmer: profile.farmer, cos: Cos.wire(), loadout: profile.primary }, G.map.W); G.me = G.pred.p; G.maxRounds = (msg.cfg && msg.cfg.rounds) || 12; G.loot = []; G.lootVer = -1; G.cmdOut = [];
  beginPlay();
}
async function connectionLost() {
  if (G.reconnecting || G.scene === 'menu' || !G.code) return; G.reconnecting = true; UI.toast('Conexão perdida. Tentando reconectar…', 5000); const code = G.code, kind = G.transport;
  for (let i = 0; i < 4; i++) {
    await new Promise(r => setTimeout(r, 1200 + i * 800)); if (!G.reconnecting) return;
    try {
      const nc = new NetClient(clientCallbacks()); const w = await nc.connect(kind, code, { name: profile.name, skin: wireSkin(), farmer: profile.farmer, cos: Cos.wire(), party: Party.wireId(), fc: Social.fc(), loadout: profile.primary, token: tabToken() }, 5000);
      G.nc = nc; G.myId = nc.id; G.reconnecting = false; UI.toast('Reconectado!'); if (w.start) clientStart(w.start); else { G.scene = 'lobby'; UI.lobbyOpen(code, false, nc.id); } return;
    } catch (e) { }
  }
  G.reconnecting = false; UI.toast('Não foi possível reconectar.', 5000); Game.leave();
}

/* ===================== DESENHO POR QUADRO ===================== */
let _fps = 60;
function renderPlay(dt) {
  const R = G.R, me = G.me, hud = G.hud; applyLook(dt); refreshEnts(G.alpha, dt);
  const alive = me.alive && !G.spec; R.beginFrame(); R.time = G.time;
  if (alive) fpCamera(G.alpha, dt); else specCamera(dt);
  if (window.__cam) { const o = window.__cam, c = G.cam; c.x = o.x; c.y = o.y; c.z = o.z; c.yaw = o.yaw; c.pitch = o.pitch; c.roll = 0; }   /* gancho de teste: câmera livre */
  const emoCam = alive && EmoteWheel.active(me);
  if (emoCam) EmoteWheel.camera(me, G.time);
  const third = alive && (me.onCow || me.chute || !!window.__cam || emoCam), noVm = third || (me.m && me.m.swim) || !!me.heal;
  if (alive && !third) { G.vm.update(dt, me, G.cam.yaw, G.cam.pitch); if (!noVm) { G.vm.healK = 0; G.vm.draw(R.vmMB, me, me.skin, G.time); } else if (me.heal && !(me.m && me.m.swim)) G.vm.drawHeal(R.vmMB, me, me.skin, G.time, dt); }
  Pad.poll(dt); if (Shop.open) { if (!Shop.canOpen()) Shop.toggle(false); else Shop.render(); } if (Bag.open) Bag.render();
  updateDecor(dt); updateSpotted(dt); G.decor.tick = 0;
  drawWorldDyn(R.dyn, G.time, dt, alive && !third ? G.myId : null);
  ambientSounds(dt, me);
  G.fx.update(dt, G.cam); sfx.listen(G.cam.x, G.cam.y, G.cam.z, G.cam.yaw);
  R.render(G.cam, { vm: alive && !G.scoped && (!noVm || (!!me.heal && !third && !(me.m && me.m.swim))), vmFov: 55 });
  /* HUD */
  const V = buildV(); hud.flashA = Math.max(hud.flashA, G.fx.flash * .9); G.fx.flash = 0; hud.update(V, dt, G.time);
  if (isTat()) { AbFx.step(dt, G.time); AbilityHud.tick(dt); if (FarmerPick.open) FarmerPick.render(); if (FarmerPick.can() && !G.farmPickShown && !G.spec && QS.get('test') !== '1') { G.farmPickShown = true; FarmerPick.toggle(true); } } else if (G.abhudOff !== 1) { const ah = $('abhud'); if (ah) ah.style.display = 'none'; }
  let mode = 'cross', gap = 6; const w = WEAPONS[me.w];
  if (!me.alive || G.spec || G.scoped) mode = 'none'; else if (!isGun(me.w)) mode = 'dot'; else { const sp = calcSpread(me, w) + (G.recoil.p / DEG) * .25; gap = Math.tan(sp * DEG) / Math.tan(G.cam.fov * DEG / 2) * (innerHeight / 2) + 4; }
  const key = mode + Math.round(gap) + settings.crosshair + settings.crossSize; if (G.crossKey !== key) { G.crossKey = key; hud.setCross(gap, mode); }
  const sc = $('scope'); if (!sc.firstChild) sc.innerHTML = '<div class="lens"><i class="ret"></i><b class="zl"></b></div>';
  if (G.scoped !== G._scW || (G.scoped && G.zoom !== G._zmW)) { const ln = /** @type {HTMLElement} */ (sc.firstChild); ln.classList.remove('in', 'zp'); void ln.offsetWidth; if (G.scoped) { ln.classList.add(G.scoped !== G._scW ? 'in' : 'zp'); ln.lastChild.textContent = (G.zoom === 2 ? 'ZOOM 2 · ' : 'ZOOM 1 · ') + 'V troca'; if (G.scoped !== G._scW) sfx.ui(0); } G._scW = G.scoped; G._zmW = G.zoom; }
  sc.style.display = G.scoped ? 'block' : 'none'; sc.style.opacity = G.scoped ? '1' : '0';
  BigMap.draw(V, G.time);
  /* trilha conforme a situação */
  G.musT = (G.musT || 0) - dt; if (G.musT <= 0 && settings.music > 0) { G.musT = 1; let tr = 'tranquilo';
    if (G.matchOver) tr = 'vitoria'; else if (isTat()) { tr = G.phase === 'live' || G.phase === 'post' ? 'celeiro' : 'tranquilo';
      /* intensidade do baião: 0 calmo · 1 combate por perto · 2 mandioca plantada ou clutch */
      const hot = G.time - (G.combatT || -99) < 8 || G.time - (G.nearShotT || -99) < 6, mine = G.me ? G.me.team : 0, allies = (G.ents ? [...G.ents.values()] : []).filter(e => e.alive && e.team === mine).length;
      sfx.setIntensity(G.bomb && G.bomb.st === 'planted' ? 2 : G.phase === 'live' && allies === 1 && G.me && G.me.alive ? 2 : hot ? 1 : 0); }
    else if (G.phase === 'live') tr = (G.aliveCount | 0) <= 5 ? 'ultimos' : G.zone && G.zone[9] === 1 ? 'correria' : G.time - (G.combatT || -99) < 10 ? 'celeiro' : 'tranquilo';
    sfx.setTrack(tr); }
  /* acústica da sala (aberto, casa, celeiro, galpão, porão) — o jogo informa, o áudio não faz física */
  G.roomT = (G.roomT || 0) - dt; if (G.roomT <= 0 && sfx.ctx && G.map) { G.roomT = .5; sfx.setRoom(audioRoom(G.map.W, G.cam)); }
  G.tabT = (G.tabT || 0) - dt; if (Input.tab || Input.tabPad) { if (G.tabT <= 0) { hud.tab(true, V); G.tabT = .3; } } else if (hud.tabOn) hud.tab(false, V);
  FlowUI.update(dt); AutoRes.tick(dt); drawTags(); SquadHud.tick(dt);
}
function ambientSounds(dt, me) {
  const b = G.bomb, cam = G.cam;
  if (b.st === 'planted' && G.phase === 'live') { G.beepT -= dt; if (G.beepT <= 0) { const f = 1 - clamp(b.timer / 40, 0, 1); G.beepT = lerp(1.0, .12, f * f); sfx.beep({ x: b.x, y: b.y + .3, z: b.z }, b.timer < 10); } }
  G.tickT -= dt; const tick = G.tickT <= 0; if (tick) G.tickT = .26;
  for (const e of G.ents.values()) {
    if (!e.alive || e.id === G.myId) { continue; }
    if (tick && e.uk) sfx.plantTick({ x: e.x, y: e.y + 1, z: e.z });
    const dx = e.x - cam.x, dz = e.z - cam.z, d2 = dx * dx + dz * dz; if (d2 > 38 * 38 || e.spd < 2.4 || e.air) continue;
    e.stepAcc += e.spd * dt; const stride = e.spd > 6 ? 2.4 : 2; if (e.stepAcc > stride) { e.stepAcc = 0; sfx.step(G.map.W.surfaceAt(e.x, e.z), { x: e.x, y: e.y, z: e.z }, (e.cr > .5 ? .25 : e.spd > 6 ? 1 : .6)); }
  }
  if (me && me.useK && tick) sfx.plantTick(null);
}
/* bichos do menu: porquinho e galinhas na estrada de terra, à esquerda do herói (como na arte de referência) */
function menuDecor(t, ccx, ccz) {
  const M = MENU, W = G.map.W, yaw = M.az + M.yo, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  if (!G.menuAnimals) {
    const at = (f, r) => { const x = ccx + fx * f + rx * r, z = ccz + fz * f + rz * r; return { x, z, y: W.heightAt(x, z) }; };
    G.menuAnimals = { pig: Object.assign(at(7.2, -3.4), { yaw: yaw + Math.PI - .55, ph: 0, walk: false, eat: true }), chk: [Object.assign(at(4.9, -2.1), { yaw: yaw + Math.PI + .6, ph: 1, col: 0xf4eee0 }), Object.assign(at(6.3, -1.4), { yaw: yaw + Math.PI - .4, ph: 3, col: 0xe8c890 })] };
  }
  const a = G.menuAnimals; a.pig.eat = Math.sin(t * .5) > -.2; drawPig(G.R.dyn, a.pig, t); for (const c of a.chk) { c.ph = t * 2 + c.x; drawChicken(G.R.dyn, c); }
}
function renderMenu(dt) {
  if (G.maps.fazenda && G.map !== G.maps.fazenda.map) useMap('fazenda');   /* menu e chiqueiro mostram a fazenda */
  const R = G.R, t = G.time, cam = G.cam, M = MENU, W = G.map.W; R.beginFrame(); R.time = t; R.setEnv('tarde'); CosIco.pump();
  const sh = G.menuShift = damp(G.menuShift || 0, Menu6.hubOn ? 1 : 0, 5, dt);
  const gy = W.heightAt(M.px, M.pz), ccx = M.px + Math.sin(M.az) * M.dist, ccz = M.pz + Math.cos(M.az) * M.dist;
  cam.x = ccx + Math.sin(t * .17) * .22 + Math.sin(M.az) * sh * 1.4; cam.y = W.heightAt(ccx, ccz) + M.ch + Math.sin(t * .23) * .04; cam.z = ccz + Math.cos(t * .13) * .1 + Math.cos(M.az) * sh * 1.4; cam.yaw = M.az + M.yo + Math.sin(t * .15) * .035 - sh * .44; cam.pitch = M.pitch; cam.roll = 0; cam.fov = M.fov * (innerWidth / innerHeight < 1.4 ? 1.2 : 1);
  G.mode = 'tatico'; G.nades = []; G.loot = []; G.bomb = { st: 'none', x: 0, y: 0, z: 0, timer: 0, carrier: 0, site: '', defBy: 0 }; updateDecor(dt);
  menuDecor(t, ccx, ccz); const co = Menu6.charOpts(), useAgent = false;   /* mesmo personagem no menu para todos os modos */
  drawChar(R.dyn, { x: M.px, y: gy, z: M.pz, yaw: M.az + Math.PI + M.face + Math.sin(t * .6) * .03 + Menu6.spin + sh * .25, pitch: .05 + Math.sin(t * 1.1) * .01, skin: wireSkin(), wid: co.wid, wsk: co.wsk, emote: co.emote, cr: 0, spd: 0, wph: 0, team: 0, farmer: useAgent ? profile.farmer : '', pose: useAgent && !co.emote ? profile.farmer : '', key: 'menu' }, { time: t });   /* o seu agente posando, como na arte */
  menuParty(t, gy);
  drawWorldDyn(R.dyn, t, dt, null); G.fx.update(dt, cam); sfx.listen(cam.x, cam.y, cam.z, cam.yaw); R.render(cam, { vm: false }); menuPartyLabels();
  if (G.tagsCv) { const c = G.tagsCv.getContext('2d'); c.clearRect(0, 0, G.tagsCv.width, G.tagsCv.height); }
}
function renderFrame(dt) {
  G.R.resize();
  if (G.scene === 'play' && G.me) renderPlay(dt); else if (G.scene === 'menu' || G.scene === 'lobby') renderMenu(dt);
}

/* ===================== LOOP PRINCIPAL ===================== */
let _last = performance.now(), _acc = 0;
function advance(ts) {
  let dt = (ts - _last) / 1000; if (dt <= 0) return 0; _last = ts; dt = Math.min(dt, window.__dtMax || .25); G.time += dt;
  if (G.kind === 'host' && G.net) G.net.tick(dt);
  if (G.scene === 'play' && !G.paused) { _acc += dt; let n = 0; while (_acc >= DT && n < 6) { fixedStep(); _acc -= DT; n++; } if (n >= 6) _acc = 0; flushNet(); }
  G.alpha = _acc / DT; return dt;
}
function frame(ts) {
  requestAnimationFrame(frame); const dt0 = advance(ts); if (dt0 <= 0) return;
  G.rdt = (G.rdt || 0) + dt0; const cap = +settings.fpsCap || 0;
  if (cap && G.rdt < 1 / cap - 0.004) return;           /* limite de FPS: pula o desenho, a simulação continua */
  const dt = Math.min(G.rdt, .25); G.rdt = 0;
  G.fpsAcc += dt; G.fpsN++; if (G.fpsAcc > .5) { G.fps = G.fpsN / G.fpsAcc; G.fpsAcc = 0; G.fpsN = 0; } PerfHud.tick(dt);
  try { renderFrame(dt); } catch (e) { if (!G.errShown) { G.errShown = true; console.error(e); UI.toast('Erro: ' + (e && e.message || e), 6000); } }
}
function startMetronome() {
  try { const w = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),15)'], { type: 'text/javascript' }))); w.onmessage = () => { if (document.hidden && (G.kind === 'host' || G.kind === 'client')) { try { advance(performance.now()); } catch (e) { } } }; } catch (e) { }
}

/* ===================== INICIALIZAÇÃO ===================== */
const tick = () => new Promise(r => setTimeout(r, 24));
function applySettings(key) {
  saveSettings(); sfx.apply(); if (!G.R) return; if (key === 'quality' || key === 'perfMode' || key === 'shadowQ') G.R.setQuality(); if (key && key.startsWith('touch')) TouchCtl.apply(); if (key === 'voice') { if (settings.voice === 'off') Voice.stop(); else if (G.scene === 'play') Voice.start(); } G.R.resize(); G.crossKey = ''; if (key === 'music') { if (settings.music > 0 && sfx.ctx && G.scene !== 'play') sfx.startMusic(); }
}
/* ===================== MAPAS INDEPENDENTES =====================
   5x5 → "Vila do Roçado" (arena competitiva) · Todos contra Todos → "Fazenda do Zé" (500 x 500) */
G.maps = {};
/* 5x5: mapa escolhido (Vila do Roçado ou Moinho das Três Porteiras); 'rand' sorteia na hora de começar */
function resolveTatMap(id) { if (id === 'rand') return TAT_MAPS[Math.floor(Math.random() * TAT_MAPS.length)].id; return TAT_MAPS.some(m => m.id === id) ? id : 'vila'; }
const mapFor = (mode, id) => (mode === 'tatico' ? resolveTatMap(id || 'vila') : 'fazenda');
function ensureMap(id) {
  if (G.maps[id]) return G.maps[id]; const t0 = performance.now();
  const tm = TAT_MAPS.find(m => m.id === id), map = tm ? tm.build() : buildFazenda(1), e = { map, scene: G.R.buildScene(map.render), nav: new NavGrid(map) };
  G.maps[id] = e; console.log('mapa', id, Math.round(performance.now() - t0) + ' ms'); return e;
}
function useMap(id) {
  const e = ensureMap(id); if (G.map === e.map) return; G.map = e.map; G.nav = e.nav; G.R.setScene(e.scene); G.R.clearDecals(); if (G.fx) G.fx.W = e.map.W; G.menuAnimals = null; initDecor();
}
/** sala acústica onde a câmera está: teto por cima + distância média das paredes em 8 direções */
function audioRoom(W, c) {
  if (!W || !W.los) return 'aberto'; const gy = W.heightAt ? W.heightAt(c.x, c.z) : c.y - 1.6; if (c.y < gy - 1.5) return 'porao';
  if (W.los(c.x, c.y, c.z, c.x, c.y + 14, c.z)) return 'aberto';
  let sum = 0; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, dx = Math.sin(a), dz = Math.cos(a); let r = 30; for (const s of [3, 7, 14, 30]) if (!W.los(c.x, c.y, c.z, c.x + dx * s, c.y, c.z + dz * s)) { r = s; break; } sum += r; }
  const avg = sum / 8; return avg < 6 ? 'casa' : avg < 14 ? 'celeiro' : 'galpao';
}
async function boot() {
  const bar = $('loadBar'), msg = $('loadMsg'), pct = $('loadPct'), prog = (f, m) => { bar.style.width = Math.round(f * 100) + '%'; const L = $('loading'); if (L) { L.style.setProperty('--ldp', String(clamp(f, 0, 1))); if (f >= 1) L.classList.add('ld-done'); } if (pct) pct.textContent = Math.round(f * 100) + '%'; if (m) msg.textContent = m; };
  if (QS.get('test') === '1') Input.force = true;
  prog(.03, 'Pendurando as luzinhas de Natal…');
  /* música de Natal já na tela de carregamento (se o navegador bloquear, um toque libera) */
  sfx.occlude = (x, y, z) => { const W = G.map && G.map.W; return !!(W && G.scene === 'play' && !W.los(G.cam.x, G.cam.y, G.cam.z, x, y, z)); };
  if (QS.get('test') !== '1' && (settings.music === undefined || settings.music > 0)) { try { sfx.init(); sfx.startMusic('natal'); } catch (e) { } const sb = $('ldSnd'); if (sb && sfx.ctx && sfx.ctx.state !== 'running') { sb.classList.remove('hidden'); sb.onclick = () => { sfx.init(); sb.classList.add('hidden'); }; } }
  await tick();
  let R; try { R = new Renderer($('cv'), settings); } catch (e) { msg.textContent = 'Seu navegador não suporta WebGL2 (' + (e && e.message) + '). Tente o Chrome, Edge ou Firefox atualizados.'; return; }
  G.R = R; await R.init(f => { try { prog(.05 + Math.min(1, f || 0) * .3, 'Pintando as texturas…'); } catch (e) { } });
  prog(.4, 'Plantando o milharal…'); await tick(); const fz = buildFazenda(1);
  prog(.7, 'Erguendo o celeiro…'); await tick(); G.maps.fazenda = { map: fz, scene: R.buildScene(fz.render), nav: null };
  prog(.85, 'Treinando os bots…'); await tick(); G.maps.fazenda.nav = new NavGrid(fz);
  G.fx = new FX(R); G.hud = new HUD(); G.vm = new ViewModel(); useMap('fazenda');
  const tg = document.createElement('canvas'); tg.id = 'tags'; tg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'; $('hud').insertBefore(tg, $('hud').firstChild); G.tagsCv = tg;
  initInput(); UI.initMenu(); wireUI(); Social.init(); startMetronome(); Pad.init(); TouchCtl.init();
  /* áudio só depois do primeiro gesto */
  const unlock = () => { sfx.init(); const sb = $('ldSnd'); if (sb) sb.classList.add('hidden'); if (G.scene === 'menu' && settings.music > 0) sfx.playlist(MENU_PLAYLIST); else if (G.scene !== 'play' && settings.music > 0) sfx.startMusic('natal'); removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); }; addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
  prog(1, 'Feliz Natal na roça! 🎄'); await new Promise(r => setTimeout(r, QS.get('test') ? 0 : 450)); G.scene = 'menu'; UI.screen('menu'); R.setEnv('tarde'); if (sfx.ctx && (settings.music === undefined || settings.music > 0)) sfx.playlist(MENU_PLAYLIST);   /* Natal só no carregamento */
  if (!Account.resume() && !store.get('guestOk', false) && QS.get('test') !== '1') setTimeout(() => AccUI.open(true), 900); else UI.refreshProfile();
  requestAnimationFrame(t => { _last = t; frame(t); });
  TAT_MAPS.forEach((tm, i) => setTimeout(() => { try { if (G.scene !== 'play') ensureMap(tm.id); } catch (e) { console.error(e); } }, 1800 + i * 2200));   /* os mapas 5x5 ficam prontos em segundo plano */
  const ld = $('loading'); ld.classList.add('fade'); setTimeout(() => ld.classList.add('hidden'), 700);
  const code = (QS.get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length >= 3) setTimeout(() => UI.joinModal(code), 600);
  const auto = QS.get('auto'); if (auto) setTimeout(() => Game.startOffline({ mode: auto, botLevel: QS.get('lv') || 'normal' }), 400);
  if (QS.get('bench') === '1') { const wb = setInterval(() => { if (G.scene === 'play' && G.me) { clearInterval(wb); setTimeout(() => PerfHud.startBench(), 1500); } }, 500); }
}
function wireUI() {
  UI.on.offline = o => { if (Party.inParty()) { if (Party.isLeader()) Party.start(Object.assign({}, o, { pub: false })); else UI.toast('Só o líder começa a partida do esquadrão.'); return; } Game.startOffline(o); };
  UI.on.pub = o => { if (Party.inParty()) { if (Party.isLeader()) Party.start(Object.assign({}, o, { pub: true })); else UI.toast('Só o líder começa a partida do esquadrão.'); return; } Game.publicMatch(o); };
  UI.on.host = o => Game.hostRoom(o);
  UI.on.join = code => Game.joinRoom(code);
  UI.on.settings = k => applySettings(k);
  UI.on.resumeFromSettings = () => { };
  UI.on.profile = () => { };
  UI.on.start = () => { if (G.kind === 'host' && G.net) { if (!G.net.startNow()) UI.toast('Não foi possível iniciar agora.'); } };
  UI.on.cfg = c => { if (G.kind === 'host' && G.net) { G.net.setCfg(c); if (c.mode) G.mode = c.mode; UI.lobbyUpdate(G.net.lobbyMsg()); } };
  UI.on.loadout = id => { if (G.kind === 'host' && G.net) { G.net.hostMember.loadout = id; } else if (G.nc) G.nc.send({ k: 'lo', v: id }); };
  UI.on.chat = text => sendChat(text);
  UI.on.leave = () => Game.leave();
}
window.__ff = n => { for (let i = 0; i < n; i++) fixedStep(); }; window.__live = () => { for (let i = 0; i < 60 * 200 && G.sim && G.sim.phase !== 'live'; i++) fixedStep(); }; window.MENU = MENU; window.G = G; window.Game = Game; window.UI = UI; window.Input = Input;
boot().catch(e => { console.error(e); const m = document.getElementById('loadMsg'); if (m) m.textContent = 'Erro ao iniciar: ' + (e && e.message || e); });
/* versão na tela de carregamento sempre igual à do jogo */
try { const e = document.getElementById('ldVer'); if (e) e.textContent = 'v' + VERSION; } catch (e) { }
/* fundo do carregamento: camadas se mexem um pouco com o mouse (profundidade) */
try { const L = document.getElementById('loading'); if (L) addEventListener('pointermove', e => { if (L.classList.contains('hidden')) return; L.style.setProperty('--mx', String(((e.clientX / innerWidth) - .5) * 2)); L.style.setProperty('--my', String(((e.clientY / innerHeight) - .5) * 2)); }, { passive: true }); } catch (e) { }
