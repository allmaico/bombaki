/* =====================================================================
   597_social.js — AMIGOS e ESQUADRÃO (party) sem servidor
   Cada jogador abre uma "caixa postal" P2P com o seu CÓDIGO DE AMIGO
   (ex.: #K7Q2MX). Por ela chegam: pedidos de amizade, aceite, remoção,
   consulta de status (online / no esquadrão / jogando), convites para o
   esquadrão e a conexão dos membros com o líder. O líder escolhe o modo e
   aperta JOGAR: cria a sala, todos entram juntos e caem no MESMO TIME
   (5x5) ou no MESMO ESQUADRÃO (Battle Royale em esquadrão).
   ===================================================================== */
'use strict';
const FC_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PARTY_MAX = 4;
const nowMs = () => Date.now();
function myBsq() { if (G.sim) { const p = G.sim.get(G.myId); return p ? p.bsq | 0 : 0; } const r = G.rinfo && G.rinfo.get(G.myId); return r ? r.bsq | 0 : 0; }

const Social = {
  hub: null, kind: 'peer', st: new Map(), up: false, tries: 0,
  fc() { if (!profile.fc || !/^[A-Z2-9]{6}$/.test(profile.fc)) { let s = ''; for (let i = 0; i < 6; i++) s += FC_ABC[(Math.random() * FC_ABC.length) | 0]; profile.fc = s; saveProfile(); } return profile.fc; },
  me() { return { fc: this.fc(), name: profile.name, skin: wireSkin(), lv: levelInfo().level, far: profile.farmer || '' }; },
  init() {
    profile.friends = (profile.friends || []).filter(f => f && f.name); profile.freqIn = profile.freqIn || []; profile.freqOut = profile.freqOut || []; profile.blockFc = profile.blockFc || []; profile.blocked = profile.blocked || []; profile.recent = profile.recent || [];
    this.kind = transportKind(); this.fc(); Menu6.refreshSocial(); setTimeout(() => this.open(), QS.get('test') === '1' ? 50 : 1500);
    const add = (QS.get('amigo') || '').toUpperCase().replace(/[^A-Z2-9]/g, ''); if (add.length === 6 && add !== this.fc()) setTimeout(() => { Menu6.open('amigos'); const i = $('frCode'); if (i) i.value = add; }, 1800);
  },
  async open() {
    if (this.hub) return;
    try { this.hub = await Hubs.host(this.kind, 'U' + this.fc()); this.up = true; this.hub.onconn = c => { c.onmsg = m => this.onMsg(c, m); }; Menu6.refreshSocial && Menu6.refreshSocial(); }
    catch (e) { this.up = false; if (++this.tries < 30) setTimeout(() => this.open(), 15000); }
  },
  blockedFc(fc) { return profile.blockFc.some(b => b.fc === fc); },
  isFriend(fc) { return profile.friends.some(f => f.fc === fc); },
  friend(fc) { return profile.friends.find(f => f.fc === fc); },
  status() { return G.scene === 'play' ? 'play' : Party.inParty() ? 'party' : 'menu'; },
  /* ---------- conexões de saída (reusa o peer da caixa postal) ---------- */
  async conn(fc, timeout) {
    const id = 'U' + fc; timeout = timeout || 5000;
    if (this.kind === 'peer' && this.hub && this.hub.peer) {
      const peer = this.hub.peer;
      return new Promise((res, rej) => {
        let done = false; const raw = peer.connect(PEER_PREFIX + id, { reliable: true, serialization: 'json' });
        const to = setTimeout(() => { if (!done) { done = true; try { raw.close(); } catch (e) { } rej('offline'); } }, timeout);
        raw.on('open', () => { if (done) return; done = true; clearTimeout(to); const c = new Conn(raw.peer, o => raw.send(o), () => { try { raw.close(); } catch (e) { } }); raw.on('data', d => c.deliver(d)); raw.on('close', () => c.remoteClosed()); raw.on('error', () => c.remoteClosed()); res(c); });
        raw.on('error', () => { if (!done) { done = true; clearTimeout(to); rej('offline'); } });
      });
    }
    try { return await Hubs.connect(this.kind, id, timeout); } catch (e) { throw 'offline'; }
  },
  /* envia uma mensagem e espera a resposta {k:'r'} (fecha em seguida) */
  async ask(fc, msg, timeout) {
    const c = await this.conn(fc, timeout); msg.from = this.me();
    return new Promise(res => { const to = setTimeout(() => { c.close(); res(null); }, timeout || 4500); c.onmsg = m => { if (m && m.k === 'r') { clearTimeout(to); res(m); setTimeout(() => c.close(), 50); } }; c.send(msg); });
  },
  /* ---------- caixa postal: mensagens recebidas ---------- */
  onMsg(c, m) {
    if (!m || typeof m !== 'object') return; const F = m.from || c.peerInfo || {}; const fc = String(F.fc || '').toUpperCase().slice(0, 6);
    if (m.k && m.k[0] === 'p' && c.partyMember) { Party.fromMember(c, m); return; }
    if (!/^[A-Z2-9]{6}$/.test(fc)) return; const who = { fc, name: String(F.name || 'Peão').slice(0, 16), skin: F.skin | 0, lv: F.lv | 0, far: FARMERS[F.far] ? F.far : '' };
    const reply = o => c.send(Object.assign({ k: 'r' }, o));
    if (this.blockedFc(fc)) { reply({ ok: 0, why: 'bloqueado' }); return; }
    const fr = this.friend(fc); if (fr) { fr.name = who.name; fr.skin = who.skin; fr.lv = who.lv; }
    switch (m.k) {
      case 'st': reply({ ok: 1, st: this.status(), ps: Party.size(), lead: Party.isLeader() ? 1 : 0, open: Party.isLeader() && Party.size() < PARTY_MAX ? 1 : 0, me: this.me() }); break;
      case 'freq':
        if (this.isFriend(fc)) { reply({ ok: 1, friend: 1, me: this.me() }); break; }
        if (profile.freqOut.includes(fc)) { this.addFriend(who); profile.freqOut = profile.freqOut.filter(x => x !== fc); saveProfile(); reply({ ok: 1, friend: 1, me: this.me() }); this.notify('🤝 Agora você e ' + who.name + ' são amigos!'); break; }
        if (!profile.freqIn.some(r => r.fc === fc)) { profile.freqIn.push(Object.assign({ t: nowMs() }, who)); saveProfile(); }
        reply({ ok: 1 }); this.notify('📨 ' + who.name + ' quer ser seu amigo!', 'amigos'); sfx.jingle && sfx.jingle(); break;
      case 'facc': if (profile.freqOut.includes(fc) || !this.isFriend(fc)) { this.addFriend(who); profile.freqOut = profile.freqOut.filter(x => x !== fc); saveProfile(); this.notify('🤝 ' + who.name + ' aceitou seu pedido de amizade!'); } reply({ ok: 1 }); break;
      case 'frem': profile.friends = profile.friends.filter(f => f.fc !== fc); saveProfile(); reply({ ok: 1 }); Menu6.refreshSocial(); break;
      case 'pinv': reply({ ok: 1 }); Party.invited(who, m); break;
      case 'pjoin': Party.memberJoin(c, who, m); break;
      case 'preq': reply({ ok: 1 }); Party.joinRequest(who); break;
      default: reply({ ok: 0 });
    }
    Menu6.refreshSocial();
  },
  addFriend(w) { if (this.isFriend(w.fc) || w.fc === this.fc()) return; profile.friends.push({ fc: w.fc, name: w.name, skin: w.skin | 0, lv: w.lv | 0, t: nowMs() }); profile.freqIn = profile.freqIn.filter(r => r.fc !== w.fc); saveProfile(); },
  notify(t, tab) { UI.toast(t, 4500); if (tab) Menu6.badge && Menu6.badge(); },
  /* ---------- ações do jogador ---------- */
  async request(fc) {
    fc = String(fc || '').toUpperCase().replace(/[^A-Z2-9]/g, ''); if (fc.length !== 6) return 'Código inválido (6 letras/números).'; if (fc === this.fc()) return 'Esse é o seu próprio código 😄';
    if (this.isFriend(fc)) return 'Vocês já são amigos.'; if (this.blockedFc(fc)) return 'Desbloqueie esse jogador primeiro.';
    const inc = profile.freqIn.find(r => r.fc === fc); if (inc) { await this.accept(fc); return ''; }
    let r = null; try { r = await this.ask(fc, { k: 'freq' }); } catch (e) { return 'Jogador offline. O pedido só chega com ele online (peça para abrir o jogo).'; }
    if (!r || !r.ok) return 'Não foi possível enviar o pedido.';
    if (r.friend && r.me) { this.addFriend(r.me); return 'ok-friend'; }
    if (!profile.freqOut.includes(fc)) profile.freqOut.push(fc); saveProfile(); return 'ok';
  },
  async accept(fc) { const w = profile.freqIn.find(r => r.fc === fc); if (!w) return; this.addFriend(w); try { await this.ask(fc, { k: 'facc' }); } catch (e) { } Menu6.refreshSocial(); },
  decline(fc) { profile.freqIn = profile.freqIn.filter(r => r.fc !== fc); saveProfile(); },
  async remove(fc) { profile.friends = profile.friends.filter(f => f.fc !== fc); saveProfile(); try { await this.ask(fc, { k: 'frem' }, 3000); } catch (e) { } },
  block(w) { if (!this.blockedFc(w.fc)) profile.blockFc.push({ fc: w.fc, name: w.name }); if (!profile.blocked.includes(w.name)) profile.blocked.push(w.name); profile.friends = profile.friends.filter(f => f.fc !== w.fc); profile.freqIn = profile.freqIn.filter(r => r.fc !== w.fc); saveProfile(); if (Party.has(w.fc)) Party.kick(w.fc); },
  unblock(fc) { const b = profile.blockFc.find(x => x.fc === fc); profile.blockFc = profile.blockFc.filter(x => x.fc !== fc); if (b) profile.blocked = profile.blocked.filter(n => n !== b.name); saveProfile(); },
  /* status de todos os amigos (em paralelo, 5 por vez) */
  async refreshAll() {
    if (this.busy) return; this.busy = true; const L = profile.friends.filter(f => f.fc).slice(0, 40);
    const one = async f => { let r = null; try { r = await this.ask(f.fc, { k: 'st' }, 3500); } catch (e) { } this.st.set(f.fc, r && r.ok ? { on: 1, st: r.st, ps: r.ps | 0, lead: r.lead, open: r.open, t: nowMs() } : { on: 0, t: nowMs() }); if (r && r.me) { f.name = r.me.name; f.skin = r.me.skin; f.lv = r.me.lv; } Menu6.refreshSocial(); };
    for (let i = 0; i < L.length; i += 5) await Promise.all(L.slice(i, i + 5).map(one));
    this.busy = false; saveProfile();
  },
  /* jogadores da última partida (para adicionar) */
  rememberMatch() {
    if (!G.rinfo) return; const R = profile.recent;
    for (const r of G.rinfo.values()) { if (r.bot || !r.fc || r.fc === this.fc()) continue; const i = R.findIndex(x => x.fc === r.fc); if (i >= 0) R.splice(i, 1); R.unshift({ fc: r.fc, name: r.name, skin: r.skin | 0, t: nowMs() }); }
    profile.recent = R.slice(0, 16); saveProfile();
  }
};

/* ======================= ESQUADRÃO (party) ======================= */
const Party = {
  /* líder: members = [{fc,name,skin,lv,far,ready,conn}] ; membro: link = conexão com o líder, state = último 'pst' */
  members: [], link: null, state: null, id: '', mode: null, pendingInv: null,
  inParty() { return this.size() > 1; },
  isLeader() { return !this.link; },
  size() { return this.link ? (this.state ? this.state.m.length : 1) : 1 + this.members.length; },
  has(fc) { return this.members.some(x => x.fc === fc); },
  wireId() { if (!this.inParty()) return ''; return this.link ? (this.state && this.state.id) || '' : this.id; },
  list() {   /* lista para a interface: [{fc,name,skin,lv,ready,lead,me}] */
    if (this.link && this.state) return this.state.m.map(x => Object.assign({}, x, { me: x.fc === Social.fc() }));
    return /** @type {any[]} */ ([Object.assign(Social.me(), { lead: 1, ready: 1, me: true })]).concat(this.members.map(x => ({ fc: x.fc, name: x.name, skin: x.skin, lv: x.lv, far: x.far, ready: x.ready, lead: 0 })));
  },
  cfg() { const md = store.get('lastMode', 'tatico'); return { mode: md, map: store.get('tatMap', 'vila'), squad: md === 'caos' ? store.get('brSquad', 4) : 0 }; },
  /* ---------- líder ---------- */
  push() { if (this.link) return; if (!this.id && this.members.length) this.id = Social.fc() + Math.random().toString(36).slice(2, 6); if (!this.members.length) this.id = ''; const st = { k: 'pst', id: this.id, m: this.list().map(x => ({ fc: x.fc, name: x.name, skin: x.skin, lv: x.lv, far: x.far || '', ready: x.ready ? 1 : 0, lead: x.lead ? 1 : 0 })), cfg: this.cfg() }; for (const x of this.members) x.conn && x.conn.send(st); Menu6.refreshSocial(); },
  memberJoin(c, who, m) {
    const rep = o => c.send(Object.assign({ k: 'r' }, o));
    if (this.link) { rep({ ok: 0, why: 'Ele já está no esquadrão de outra pessoa.' }); return; }
    if (this.has(who.fc)) { const old = this.members.find(x => x.fc === who.fc); old.conn = c; }
    else { if (this.size() >= PARTY_MAX) { rep({ ok: 0, why: 'Esquadrão cheio.' }); return; } if (!m.inv && !Social.isFriend(who.fc)) { rep({ ok: 0, why: 'Só amigos podem entrar.' }); return; } this.members.push(Object.assign({ ready: 0, conn: c }, who)); UI.toast('🎉 ' + who.name + ' entrou no esquadrão!'); sfx.ui(1); }
    c.partyMember = who.fc; c.onclose = () => { const x = this.members.find(y => y.conn === c); if (x) { this.members = this.members.filter(y => y !== x); UI.toast(x.name + ' saiu do esquadrão.'); this.push(); } };
    rep({ ok: 1 }); this.push();
  },
  fromMember(c, m) {
    const x = this.members.find(y => y.conn === c); if (!x) return;
    if (m.k === 'prdy') { x.ready = m.v ? 1 : 0; this.push(); }
    else if (m.k === 'pleave') { this.members = this.members.filter(y => y !== x); UI.toast(x.name + ' saiu do esquadrão.'); c.onclose = null; c.close(); this.push(); }
  },
  async invite(fc) {
    if (this.link) { UI.toast('Só o líder do esquadrão pode convidar.'); return false; } if (this.size() >= PARTY_MAX) { UI.toast('Esquadrão cheio (máx. 4).'); return false; }
    let r = null; try { r = await Social.ask(fc, { k: 'pinv', cfg: this.cfg(), n: this.size() }); } catch (e) { }
    if (!r || !r.ok) { UI.toast('Não deu para convidar: amigo offline.'); return false; }
    UI.toast('Convite enviado! ✉️'); return true;
  },
  kick(fc) { const x = this.members.find(y => y.fc === fc); if (!x) return; try { x.conn.send({ k: 'pkick' }); } catch (e) { } this.members = this.members.filter(y => y !== x); setTimeout(() => { try { x.conn.close(); } catch (e) { } }, 200); this.push(); },
  joinRequest(who) {   /* alguém pediu para entrar no meu esquadrão */
    if (this.link || this.size() >= PARTY_MAX) return;
    this.popup(who, `<b>${esc(who.name)}</b> quer entrar no seu esquadrão`, () => this.invite(who.fc));
  },
  /* ---------- membro ---------- */
  invited(who, m) {
    if (this.inParty() && !this.isLeader()) return;
    const md = m.cfg && MODES[m.cfg.mode] ? MODES[m.cfg.mode].name + (m.cfg.mode === 'caos' && m.cfg.squad > 1 ? ' · ESQUADRÃO' : '') : '';
    this.popup(who, `<b>${esc(who.name)}</b> te chamou para o esquadrão${md ? ` <small>${esc(md)}</small>` : ''}`, () => this.join(who.fc, true)); sfx.jingle && sfx.jingle();
  },
  popup(who, html, onYes) {
    let el = $('invPop'); if (el) el.remove(); el = document.createElement('div'); el.id = 'invPop';
    el.innerHTML = `<canvas width="48" height="48"></canvas><div class="ip-tx">${html}<i class="ip-bar"></i></div><button class="btn y s" data-y>Aceitar</button><button class="btn s" data-n>Recusar</button>`;
    document.body.appendChild(el); drawFace(el.querySelector('canvas'), who.skin | 0);
    const close = () => { clearTimeout(t); el.classList.add('out'); setTimeout(() => el.remove(), 300); }, t = setTimeout(close, 20000);
    el.querySelector('[data-y]').onclick = () => { close(); onYes(); }; el.querySelector('[data-n]').onclick = close;
  },
  async join(leaderFc, inv) {
    if (this.inParty()) this.leave(true);
    let c = null; try { c = await Social.conn(leaderFc, 6000); } catch (e) { UI.toast('O líder ficou offline.'); return false; }
    const ok = await new Promise(res => { const to = setTimeout(() => res({ ok: 0, why: 'sem resposta' }), 6000); c.onmsg = m => { if (m && m.k === 'r') { clearTimeout(to); res(m); } }; c.send({ k: 'pjoin', inv: inv ? 1 : 0, from: Social.me() }); });
    if (!ok.ok) { UI.toast('Não entrou no esquadrão: ' + (ok.why || 'recusado')); c.close(); return false; }
    this.link = c; this.leaderFc = leaderFc; this.members = []; this.id = '';
    c.onmsg = m => this.fromLeader(m); c.onclose = () => { if (this.link === c) { this.link = null; this.state = null; UI.toast('Você saiu do esquadrão (o líder desconectou).'); Menu6.refreshSocial(); } };
    UI.toast('Você entrou no esquadrão! 🎉'); sfx.ui(1); Menu6.refreshSocial(); return true;
  },
  fromLeader(m) {
    if (!m) return;
    if (m.k === 'pst') { this.state = m; if (m.cfg) { store.set('lastMode', m.cfg.mode); if (m.cfg.map) store.set('tatMap', m.cfg.map); if (m.cfg.mode === 'caos') store.set('brSquad', m.cfg.squad | 0); } Menu6.refreshSocial(); Menu6.refresh(); }
    else if (m.k === 'pkick') { const c = this.link; this.link = null; this.state = null; if (c) { c.onclose = null; c.close(); } UI.toast('O líder te removeu do esquadrão.'); Menu6.refreshSocial(); }
    else if (m.k === 'pgo') this.go(m);
  },
  ready(v) { if (this.link) this.link.send({ k: 'prdy', v: v ? 1 : 0 }); },
  leave(quiet) {
    if (this.link) { const c = this.link; this.link = null; this.state = null; c.onclose = null; try { c.send({ k: 'pleave' }); } catch (e) { } setTimeout(() => c.close(), 200); }
    else { for (const x of this.members) { try { x.conn.send({ k: 'pkick' }); x.conn.onclose = null; } catch (e) { } setTimeout(() => { try { x.conn.close(); } catch (e) { } }, 200); } this.members = []; this.id = ''; }
    if (!quiet) UI.toast('Você saiu do esquadrão.'); Menu6.refreshSocial();
  },
  /* ---------- começar a partida juntos ---------- */
  async start(o) {
    if (this.link) { UI.toast('Só o líder começa a partida. Marque "Pronto"!'); return; }
    const n = this.size(); UI.toast(`Criando a sala do esquadrão (${n} jogadores)…`, 3000);
    try {
      const q = Object.assign({ fill: true, rounds: 12 }, o, { partyN: n, squad: o.mode === 'caos' ? (o.squad | 0) : 0 });
      const code = o.pub ? await this.pubCode(q) : await Game.hostRoom(q);
      if (!code) return; for (const x of this.members) x.conn && x.conn.send({ k: 'pgo', code, mode: o.mode });
    } catch (e) { UI.toast(UI.errText(e), 5000); }
  },
  async pubCode(q) { await Game.publicMatch(q); return G.code || ''; },
  async go(m) {
    UI.close(); Menu6.close(); UI.toast('O líder começou! Entrando na sala ' + m.code + '…', 3000);
    for (let i = 0; i < 4; i++) { try { await Game.joinRoom(m.code, { timeout: 6000 }); return; } catch (e) { await new Promise(r => setTimeout(r, 1200)); } }
    UI.toast('Não foi possível entrar na sala do esquadrão.', 5000);
  }
};

/* ---------- nomes dos aliados no Battle Royale em esquadrão ---------- */
function drawSquadTags(c, VP, W, H) {
  const sq = myBsq(); if (!sq || !G.me) return; c.font = '900 13px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.lineWidth = 3; c.strokeStyle = '#000c';
  for (const e of G.ents.values()) {
    if (e.id === G.myId || !e.alive || (e.bsq | 0) !== sq) continue; const d = Math.hypot(e.x - G.cam.x, e.z - G.cam.z); const p = project(VP, e.x, e.y + 2.1, e.z, W, H); if (!p) continue;
    const x = clamp(p[0], 30, W - 30), y = clamp(p[1], 40, H - 20); c.globalAlpha = 1; c.fillStyle = '#7cf06a'; const nm = (e.name || '?') + (d > 25 ? ` · ${Math.round(d)}m` : ''); c.strokeText(nm, x, y); c.fillText(nm, x, y);
    c.fillStyle = '#0008'; c.fillRect(x - 18, y + 2, 36, 4); c.fillStyle = e.hp > 40 ? '#6fe05a' : '#ff6a5a'; c.fillRect(x - 18, y + 2, 36 * clamp((e.hp || 0) / 100, 0, 1), 4);
    c.fillStyle = '#7cf06a'; c.beginPath(); c.moveTo(x - 5, y + 9); c.lineTo(x + 5, y + 9); c.lineTo(x, y + 15); c.fill();
  }
}
/* painel do esquadrão na partida (BR) */
const SquadHud = {
  t: 0,
  tick(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = .25; const sq = G.scene === 'play' && !isTat() ? myBsq() : 0; let el = $('sqhud');
    if (!sq) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'sqhud'; $('hud').appendChild(el); }
    const mates = [...G.ents.values()].filter(e => (e.bsq | 0) === sq).sort((a, b) => (a.id === G.myId ? -1 : b.id === G.myId ? 1 : 0));
    el.innerHTML = '<h4>ESQUADRÃO</h4>' + mates.map(e => `<div class="${e.alive ? '' : 'dead'}${e.id === G.myId ? ' me' : ''}"><b>${esc(e.name || '?')}</b><i><u style="width:${e.alive ? clamp((e.hp || 0), 0, 100) : 0}%"></u></i></div>`).join('');
  }
};

/* ======================= INTERFACE: esquadrão no menu + aba AMIGOS ======================= */
const ST_TXT = { menu: ['No menu', 'on'], party: ['No esquadrão', 'pt'], play: ['Jogando', 'pl'] };
Object.assign(Menu6, /** @type {ThisType<any> & Record<string, any>} */ ({
  myReady: false, confirmT: {},
  badge() { const n = (profile.freqIn || []).length, b = $('frBadge'); if (b) { b.textContent = n; b.classList.toggle('hidden', !n); } },
  refreshSocial() {
    if (!$('sqCard')) return; this.badge();
    const L = Party.list(), lead = Party.isLeader(), inP = Party.inParty(), me = L.find(x => x.me) || {};
    if (!inP) this.myReady = false;
    const slot = x => x ? `<div class="sq-s${x.lead ? ' lead' : ''}${x.ready || x.lead ? ' rdy' : ''}${x.me ? ' me' : ''}"><canvas data-face="${x.skin | 0}" width="48" height="48"></canvas><div><b>${esc(x.name)}${x.lead ? ' <i title="Líder">👑</i>' : ''}</b><small>Nv. ${x.lv | 0} · ${x.lead ? 'Líder' : x.ready ? '✔ Pronto' : 'Aguardando…'}</small></div>${lead && !x.me && inP ? `<button class="sq-k" data-kick="${x.fc}" title="Remover do esquadrão">✕</button>` : ''}</div>`
      : `<button class="sq-s empty" data-inv ${!lead && inP ? 'disabled' : ''}><em>+</em><div><b>Convidar</b><small>${lead || !inP ? 'Chame um amigo' : 'Só o líder convida'}</small></div></button>`;
    const md = Party.cfg(), mdn = MODES[md.mode] ? MODES[md.mode].name + (md.mode === 'caos' ? (md.squad > 1 ? (md.squad === 2 ? ' · DUPLA' : ' · ESQUADRÃO') : ' · SOLO') : '') : '';
    const slots = []; for (let i = 0; i < PARTY_MAX; i++) slots.push(slot(L[i]));
    $('sqCard').innerHTML = `<div class="sq-h"><span>ESQUADRÃO</span><b>${L.length}/${PARTY_MAX}</b><small>${esc(mdn)}</small></div><div class="sq-slots">${slots.join('')}</div>
      <div class="sq-f">${!inP ? `<button class="evbtn" data-friends>👥 Amigos${(profile.freqIn || []).length ? ` <i class="nb">${profile.freqIn.length}</i>` : ''}</button><span class="sq-hint">Monte seu esquadrão e entrem juntos na partida.</span>`
        : lead ? `<button class="evbtn" data-friends>👥 Convidar amigos</button><button class="evbtn red" data-leave>Desfazer</button>` : `<button class="evbtn${this.myReady ? ' gift' : ''}" data-ready>${this.myReady ? '✔ Pronto' : 'Ficar pronto'}</button><button class="evbtn red" data-leave>Sair</button>`}</div>`;
    $('sqCard').querySelectorAll('canvas[data-face]').forEach(c => drawFace(c, +c.dataset.face));
    /* botão JOGAR do membro vira "PRONTO" */
    const bp = $('bPlay'); if (bp) { const member = inP && !lead; bp.classList.toggle('member', member); bp.classList.toggle('isready', member && this.myReady); bp.querySelector('.bp-in').innerHTML = member ? (this.myReady ? '✔ PRONTO' : 'PRONTO?') + `<small>${esc((L.find(x => x.lead) || {}).name || 'O líder')} começa a partida</small>` : '<svg viewBox="0 0 24 24"><path d="M6 3.5v17l15-8.5z"/></svg>JOGAR' + (inP ? `<small>com o esquadrão (${L.length})</small>` : ''); }
    if (this.hubOn && this.tab === 'amigos') this.renderFriendsKeep();
  },
  squadClick(e) {
    const t = e.target, d = s => t.closest(s);
    if (d('[data-inv]') || d('[data-friends]')) { sfx.ui(1); this.open('amigos'); return; }
    const k = d('[data-kick]'); if (k) { Party.kick(k.dataset.kick); sfx.ui(0); return; }
    if (d('[data-leave]')) { Party.leave(); this.myReady = false; return; }
    if (d('[data-ready]')) { this.myReady = !this.myReady; Party.ready(this.myReady); sfx.ui(1); this.refreshSocial(); }
  },
  renderFriendsKeep() {
    const inp = $('frCode'), val = inp ? inp.value : '', foc = document.activeElement === inp, msg = $('frMsg') ? $('frMsg').innerHTML : '', sc = document.querySelector('#hub .hub-body'), top = sc ? sc.scrollTop : 0;
    const cur = document.querySelector('#hub .hub-body'); if (cur) { const tmp = document.createElement('div'); tmp.innerHTML = this.rFriends(); const nb = tmp.querySelector('.hub-body'); cur.innerHTML = nb ? nb.innerHTML : ''; cur.querySelectorAll('canvas[data-face]').forEach(c => drawFace(c, +c.dataset.face)); } else this.render(); const i2 = $('frCode'); if (i2) { i2.value = val; if (foc) i2.focus(); } if ($('frMsg')) $('frMsg').innerHTML = msg; const sc2 = document.querySelector('#hub .hub-body'); if (sc2) sc2.scrollTop = top;
  },
  rFriends() {
    const S = Social, fc = S.fc(), lead = Party.isLeader(), inP = Party.inParty(), full = Party.size() >= PARTY_MAX;
    const st = f => { const x = S.st.get(f.fc); if (!x) return ['…', 'un']; if (!x.on) return ['Offline', 'off']; const T = ST_TXT[x.st] || ST_TXT.menu; return [T[0] + (x.st === 'party' ? ` (${x.ps}/${PARTY_MAX})` : ''), T[1]]; };
    const conf = (k, t) => this.confirmT[k] && Date.now() - this.confirmT[k] < 3500 ? 'Confirmar?' : t;
    const row = (f, btns) => `<div class="fr-row"><canvas data-face="${f.skin | 0}" width="48" height="48"></canvas><div class="fr-n"><b>${esc(f.name)}</b><small>${btns.st ? `<i class="sd ${btns.st[1]}"></i>${btns.st[0]} · ` : ''}${f.lv ? 'Nv. ' + f.lv + ' · ' : ''}#${f.fc || '—'}</small></div><div class="fr-a">${btns.h}</div></div>`;
    const fr = profile.friends.slice().sort((a, b) => ((S.st.get(b.fc) || {}).on | 0) - ((S.st.get(a.fc) || {}).on | 0));
    const frRows = fr.map(f => { const s = st(f), x = S.st.get(f.fc) || {}, inMine = Party.list().some(y => y.fc === f.fc); let h = '';
      if (!f.fc) h = '<small class="fr-old">amigo antigo (sem código)</small>';
      else { if (x.on && !inMine && (lead || !inP) && !full && x.st !== 'play') h += `<button class="btn s y" data-pinv="${f.fc}">Convidar</button>`; if (x.on && x.lead && x.open && !inP && x.ps > 1) h += `<button class="btn s g" data-pjoin="${f.fc}">Entrar no esquadrão</button>`; if (x.on && x.st === 'menu' && !inMine && !inP && x.ps <= 1) h += `<button class="btn s" data-preq="${f.fc}" title="Pede para ele te convidar">Pedir para entrar</button>`; if (inMine) h += '<small class="fr-in">no seu esquadrão</small>'; }
      h += `<button class="btn s ghost" data-frem="${f.fc}">${conf('rm' + f.fc, 'Remover')}</button><button class="btn s ghost red" data-fblk="${f.fc}">${conf('bk' + f.fc, 'Bloquear')}</button>`;
      return row(f, { st: f.fc ? s : null, h }); }).join('');
    const inRows = profile.freqIn.map(r => row(r, { h: `<button class="btn s g" data-facc="${r.fc}">Aceitar</button><button class="btn s" data-fdec="${r.fc}">Recusar</button><button class="btn s ghost red" data-fblk2="${r.fc}">Bloquear</button>` })).join('');
    const recent = profile.recent.filter(r => !S.isFriend(r.fc) && !S.blockedFc(r.fc)).slice(0, 8).map(r => row(r, { h: profile.freqOut.includes(r.fc) ? '<small class="fr-in">pedido enviado</small>' : `<button class="btn s y" data-fadd="${r.fc}">Adicionar</button>` })).join('');
    const blk = profile.blockFc.map(b => row({ fc: b.fc, name: b.name }, { h: `<button class="btn s" data-funb="${b.fc}">Desbloquear</button>` })).join('');
    return this.head('AMIGOS', 'Adicione pelo código, convide para o esquadrão e entrem juntos na partida.') + `<div class="hub-body fr">
      <div class="fr-top"><div class="fr-code"><small>SEU CÓDIGO DE AMIGO</small><b class="fnt">#${fc}</b><div class="row"><button class="btn s" data-fa="copy">Copiar código</button><button class="btn s" data-fa="link">Copiar link de convite</button></div><i class="fr-net ${S.up ? 'on' : ''}">${S.up ? '● Online — seus amigos podem te encontrar' : '○ Conectando à rede…'}</i></div>
        <div class="fr-add"><small>ADICIONAR AMIGO</small><div class="row"><input id="frCode" maxlength="7" placeholder="Código (ex.: K7Q2MX)" autocomplete="off"><button class="btn y" data-fa="add">Enviar pedido</button></div><p id="frMsg">O pedido chega na hora se o amigo estiver com o jogo aberto.</p></div></div>
      ${inRows ? `<h3 class="hub-sec">PEDIDOS RECEBIDOS (${profile.freqIn.length})</h3>${inRows}` : ''}
      <h3 class="hub-sec">AMIGOS (${profile.friends.length}) <button class="sec-btn" data-fa="refresh">↻ Atualizar</button></h3>${frRows || '<p class="hub-hint">Nenhum amigo ainda. Mande seu código para a galera!</p>'}
      ${profile.freqOut.length ? `<p class="hub-hint">Pedidos enviados aguardando: ${profile.freqOut.map(x => '#' + x).join(', ')}</p>` : ''}
      ${recent ? `<h3 class="hub-sec">JOGARAM COM VOCÊ</h3>${recent}` : ''}
      ${blk ? `<h3 class="hub-sec">BLOQUEADOS</h3>${blk}` : ''}</div>`;
  },
  frMsg(t, ok) { const m = $('frMsg'); if (m) { m.innerHTML = t; m.className = ok ? 'ok' : 'bad'; } },
  friendsClick(e) {
    const t = e.target, d = s => t.closest(s); let b;
    if ((b = d('[data-fa]'))) { const a = b.dataset.fa; sfx.ui(1);
      if (a === 'copy') UI.copy('#' + Social.fc(), 'Código copiado!');
      else if (a === 'link') { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('amigo', Social.fc()); UI.copy(`Bora jogar BOMBAKI comigo! Me adiciona: ${u}`, 'Convite copiado — mande no WhatsApp!'); }
      else if (a === 'refresh') { Social.refreshAll(); UI.toast('Atualizando status dos amigos…'); }
      else if (a === 'add') { const v = ($('frCode').value || '').replace('#', ''); this.frMsg('Enviando…', true); Social.request(v).then(r => { if (r === 'ok') { this.frMsg('✔ Pedido enviado! Assim que aceitar, aparece aqui.', true); $('frCode').value = ''; } else if (r === 'ok-friend' || r === '') { this.frMsg('🤝 Agora vocês são amigos!', true); $('frCode').value = ''; } else this.frMsg(r, false); this.refreshSocial(); Social.refreshAll(); }); }
      return true; }
    if ((b = d('[data-facc]'))) { Social.accept(b.dataset.facc).then(() => Social.refreshAll()); sfx.jingle && sfx.jingle(); this.refreshSocial(); return true; }
    if ((b = d('[data-fdec]'))) { Social.decline(b.dataset.fdec); this.refreshSocial(); return true; }
    if ((b = d('[data-fadd]'))) { Social.request(b.dataset.fadd).then(r => { UI.toast(r === 'ok' ? 'Pedido enviado!' : r === 'ok-friend' ? 'Agora vocês são amigos!' : r); this.refreshSocial(); }); return true; }
    if ((b = d('[data-pinv]'))) { b.disabled = true; Party.invite(b.dataset.pinv).then(() => { b.disabled = false; }); return true; }
    if ((b = d('[data-pjoin]'))) { Party.join(b.dataset.pjoin, false); return true; }
    if ((b = d('[data-preq]'))) { Social.ask(b.dataset.preq, { k: 'preq' }).then(() => UI.toast('Pedido enviado ao líder.'), () => UI.toast('Amigo offline.')); return true; }
    if ((b = d('[data-funb]'))) { Social.unblock(b.dataset.funb); this.refreshSocial(); return true; }
    const two = (attr, key, fn) => { const x = d('[' + attr + ']'); if (!x) return false; const fc = x.getAttribute(attr), k = key + fc; if (this.confirmT[k] && Date.now() - this.confirmT[k] < 3500) { delete this.confirmT[k]; fn(fc); } else { this.confirmT[k] = Date.now(); setTimeout(() => this.refreshSocial(), 3600); } this.refreshSocial(); return true; };
    if (two('data-frem', 'rm', fc => { Social.remove(fc); UI.toast('Amigo removido.'); })) return true;
    if (two('data-fblk', 'bk', fc => { const f = Social.friend(fc) || { fc, name: '?' }; Social.block(f); UI.toast(f.name + ' bloqueado.'); })) return true;
    if ((b = d('[data-fblk2]'))) { const r = profile.freqIn.find(x => x.fc === b.dataset.fblk2); if (r) { Social.block(r); UI.toast(r.name + ' bloqueado.'); } this.refreshSocial(); return true; }
    return false;
  }
}));
/* atualiza status dos amigos enquanto a aba está aberta */
setInterval(() => { if (typeof G !== 'undefined' && G.scene === 'menu' && Menu6.hubOn && Menu6.tab === 'amigos' && Social.up) Social.refreshAll(); }, 15000);
(function () { const o = Menu6.open.bind(Menu6); Menu6.open = function (tab) { o(tab); if (tab === 'amigos') { Social.refreshAll(); } }; })();

/* ---------- companheiros de esquadrão em 3D ao lado do seu peão (menu) ---------- */
function menuParty(t, gy) {
  const L = Party.inParty() ? Party.list().filter(x => !x.me) : []; G.p3d = [];
  if (!L.length || Menu6.hubOn) return; const M = MENU, W = G.map.W, yaw = M.az + M.yo, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const spots = [[-1.55, .7], [1.55, .7], [-2.9, 1.5]];
  L.slice(0, 3).forEach((x, i) => { const [r, f] = spots[i], px = M.px + rx * r + fx * f, pz = M.pz + rz * r + fz * f, py = W.heightAt(px, pz);
    drawChar(G.R.dyn, { x: px, y: py, z: pz, yaw: M.az + Math.PI + M.face * .4 - r * .12 + Math.sin(t * .5 + i) * .04, pitch: .03, skin: x.skin | 0, wid: 'galho', cr: 0, spd: 0, wph: 0, team: 0, farmer: FARMERS[x.far] ? x.far : '', pose: FARMERS[x.far] ? x.far : '', key: 'p3d' + i }, { time: t });
    G.p3d.push({ x: px, y: py + 2.3, z: pz, name: x.name, lead: x.lead, ready: x.ready }); });
}
function menuPartyLabels() {
  const el = $('p3d'); if (!el) return; const L = G.p3d || [], VP = G.R.VP, W = innerWidth, H = innerHeight;
  const key = L.map(x => x.name + x.ready + x.lead).join('|'); if (el._k !== key) { el._k = key; el.innerHTML = L.map(x => `<div class="p3n${x.ready || x.lead ? ' rdy' : ''}">${x.lead ? '👑 ' : ''}${esc(x.name)}<small>${x.lead ? 'Líder' : x.ready ? '✔ Pronto' : 'Aguardando'}</small></div>`).join(''); }
  L.forEach((x, i) => { const p = project(VP, x.x, x.y, x.z, W, H), d = el.children[i]; if (!d) return; if (!p) { d.style.display = 'none'; return; } d.style.display = ''; d.style.transform = `translate(${p[0].toFixed(0)}px, ${p[1].toFixed(0)}px) translate(-50%, -100%)`; });
}
