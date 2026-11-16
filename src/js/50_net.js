/* =====================================================================
   50_net.js — multiplayer sem servidor: PeerJS (WebRTC, ideal p/ GitHub
   Pages), BroadcastChannel (várias abas na mesma máquina) e "mem" (testes).
   O criador da sala é o HOST autoritativo (roda a Sim). Clientes enviam
   comandos e recebem snapshots; predição + reconciliação em 60_game.js.
   ===================================================================== */
'use strict';
const PEERJS_URLS = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] };
let _peerLoad = null;
function loadPeerJS() {
  if (typeof Peer !== 'undefined') return Promise.resolve();
  if (_peerLoad) return _peerLoad;
  _peerLoad = new Promise((res, rej) => {
    let i = 0; const next = () => {
      if (i >= PEERJS_URLS.length) { _peerLoad = null; return rej(new Error('Não foi possível carregar o PeerJS (sem internet?)')); }
      const s = document.createElement('script'); s.src = PEERJS_URLS[i++]; s.onload = () => (typeof Peer !== 'undefined' ? res() : next()); s.onerror = next; document.head.appendChild(s);
    }; next();
  });
  return _peerLoad;
}

/* ---------- conexão genérica ---------- */
class Conn {
  constructor(id, sendFn, closeFn) { this.id = id; this.sendFn = sendFn; this.closeFn = closeFn; this.onmsg = null; this.onclose = null; this.open = true; this.last = nowS(); this.member = null; this.bytes = 0; }
  send(o) { if (this.open) { try { this.sendFn(o); } catch (e) { } } }
  close() { if (!this.open) return; this.open = false; try { this.closeFn && this.closeFn(); } catch (e) { } this.onclose && this.onclose(); }
  deliver(o) { this.last = nowS(); this.onmsg && this.onmsg(o); }
  remoteClosed() { if (!this.open) return; this.open = false; this.onclose && this.onclose(); }
}
const MEMHUBS = new Map(); let MEM_LAG = 0;
const setMemLag = ms => { MEM_LAG = ms; };

const Hubs = {
  /* abre uma sala; resolve {onconn, close} ou rejeita 'taken' */
  async host(kind, code) {
    if (kind === 'mem') {
      if (MEMHUBS.has(code)) throw 'taken';
      const hub = { onconn: null, close() { MEMHUBS.delete(code); }, conns: [] }; MEMHUBS.set(code, hub); return hub;
    }
    if (kind === 'local') {
      const ch = new BroadcastChannel('bk-' + code), hub = { onconn: null, conns: new Map(), close() { try { ch.postMessage({ k: 'hostbye' }); } catch (e) { } ch.close(); } };
      const taken = await new Promise(res => { const h = ev => { if (ev.data && ev.data.k === 'taken') { ch.removeEventListener('message', h); res(true); } }; ch.addEventListener('message', h); ch.postMessage({ k: 'probe' }); setTimeout(() => { ch.removeEventListener('message', h); res(false); }, 260); });
      if (taken) { ch.close(); throw 'taken'; }
      ch.onmessage = ev => {
        const d = ev.data || {};
        if (d.k === 'probe') ch.postMessage({ k: 'taken' });
        else if (d.k === 'hello') { let c = hub.conns.get(d.from); if (c) c.remoteClosed(); c = new Conn(d.from, o => ch.postMessage({ to: d.from, d: o }), null); hub.conns.set(d.from, c); ch.postMessage({ k: 'ack', to: d.from }); hub.onconn && hub.onconn(c); }
        else if (d.from && d.d) { const c = hub.conns.get(d.from); if (c) c.deliver(d.d); }
        else if (d.k === 'bye') { const c = hub.conns.get(d.from); if (c) { hub.conns.delete(d.from); c.remoteClosed(); } }
      };
      return hub;
    }
    await loadPeerJS();
    return new Promise((res, rej) => {
      const peer = new Peer(PEER_PREFIX + code, { debug: 0, config: ICE }); let opened = false;
      const hub = { onconn: null, close() { try { peer.destroy(); } catch (e) { } }, peer };
      peer.on('open', () => { opened = true; res(hub); });
      peer.on('error', e => { if (!opened) rej(e.type === 'unavailable-id' ? 'taken' : (e.type || 'erro')); });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
      peer.on('connection', raw => {
        raw.on('open', () => {
          const c = new Conn(raw.peer, o => { const dc = raw.dataChannel; if (o.k === 's' && dc && dc.bufferedAmount > 160000) return; raw.send(o); }, () => raw.close());
          raw.on('data', d => c.deliver(d)); raw.on('close', () => c.remoteClosed()); raw.on('error', () => c.remoteClosed());
          hub.onconn && hub.onconn(c);
        });
      });
      setTimeout(() => { if (!opened) { try { peer.destroy(); } catch (e) { } rej('timeout'); } }, 9000);
    });
  },
  /* conecta a uma sala; resolve Conn */
  async connect(kind, code, timeout) {
    timeout = timeout || 7000;
    if (kind === 'mem') {
      const hub = MEMHUBS.get(code); if (!hub) throw 'notfound';
      const lag = f => (MEM_LAG ? setTimeout(f, MEM_LAG / 2 + Math.random() * MEM_LAG * 0.1) : queueMicrotask(f));
      let a, b; // a = lado host, b = lado cliente
      a = new Conn('m' + uid(), o => lag(() => b.deliver(JSON.parse(JSON.stringify(o)))), () => lag(() => b.remoteClosed()));
      b = new Conn('h', o => lag(() => a.deliver(JSON.parse(JSON.stringify(o)))), () => lag(() => a.remoteClosed()));
      lag(() => hub.onconn && hub.onconn(a)); return b;
    }
    if (kind === 'local') {
      const ch = new BroadcastChannel('bk-' + code), cid = 'l' + uid();
      const ok = await new Promise(res => { const h = ev => { if (ev.data && ev.data.k === 'ack' && ev.data.to === cid) { ch.removeEventListener('message', h); res(true); } }; ch.addEventListener('message', h); ch.postMessage({ k: 'hello', from: cid }); setTimeout(() => { ch.removeEventListener('message', h); res(false); }, 900); });
      if (!ok) { ch.close(); throw 'notfound'; }
      const c = new Conn('h', o => ch.postMessage({ from: cid, d: o }), () => { try { ch.postMessage({ k: 'bye', from: cid }); } catch (e) { } ch.close(); });
      ch.onmessage = ev => { const d = ev.data || {}; if (d.to === cid && d.d) c.deliver(d.d); else if (d.k === 'hostbye') c.remoteClosed(); };
      return c;
    }
    await loadPeerJS();
    return new Promise((res, rej) => {
      const peer = new Peer(undefined, { debug: 0, config: ICE }); let done = false;
      const fail = e => { if (done) return; done = true; try { peer.destroy(); } catch (x) { } rej(e); };
      peer.on('error', e => fail(e.type === 'peer-unavailable' ? 'notfound' : (e.type || 'erro')));
      peer.on('open', () => {
        const raw = peer.connect(PEER_PREFIX + code, { reliable: true, serialization: 'json' });
        raw.on('open', () => {
          if (done) return; done = true;
          const c = new Conn(raw.peer, o => raw.send(o), () => { try { raw.close(); peer.destroy(); } catch (e) { } });
          raw.on('data', d => c.deliver(d)); raw.on('close', () => c.remoteClosed()); raw.on('error', () => c.remoteClosed()); res(c);
        });
      });
      setTimeout(() => fail('timeout'), timeout);
    });
  }
};

/* ---------- servidor da sala (lado host) ---------- */
class NetHost {
  constructor(o) {
    this.code = o.code; this.kind = o.kind || 'peer'; this.hub = null; this.members = new Map(); this.phase = 'lobby'; this.countdown = -1; this.lobbyT = 0; this.chat = [];
    this.cfg = Object.assign({ mode: 'tatico', rounds: 3, perTeam: 5, total: 12, fill: true, botLevel: 'normal', pub: false, name: 'Sala' }, o.cfg);
    this.cb = o.cb || {}; this.hostMember = null; this.dirty = true; this.sendT = 0; this.evBuf = []; this.lootVers = new Map();
  }
  async open() { this.hub = await Hubs.host(this.kind, this.code); this.hub.onconn = c => this.accept(c); return this; }
  close() { for (const m of this.members.values()) if (m.conn) m.conn.send({ k: 'kick', why: 'sala encerrada' }); if (this.hub) this.hub.close(); }
  addLocal(info) {
    const m = { id: 'h_' + uid(), name: info.name, skin: info.skin | 0, farmer: FARMERS[info.farmer] ? info.farmer : '', loadout: info.loadout || 'galho', host: true, conn: null, ping: 0, token: info.token || uid(), squad: -1, ready: true, last: nowS(), connected: true };
    this.members.set(m.id, m); this.hostMember = m; this.dirty = true; return m;
  }
  accept(conn) { conn.onmsg = m => this.onMsg(conn, m); conn.onclose = () => this.drop(conn); }
  counts() { const h = this.humanCount(), sim = typeof G !== 'undefined' && G.net === this ? G.sim : null; return { humans: h, waiting: this.phase === 'lobby' ? h : 0, playing: this.phase !== 'lobby' ? h : 0, bots: sim ? sim.players.filter(p => p.bot).length : 0, names: [...this.members.values()].filter(m => m.connected).map(m => m.name), mode: this.cfg.mode }; }
  humanCount() { let n = 0; for (const m of this.members.values()) if (m.connected) n++; return n; }
  M() { return MODES[this.cfg.mode]; }
  onMsg(conn, m) {
    if (!m || typeof m !== 'object') return;
    const mem = conn.member;
    if (m.k === 'probe' && !mem) { conn.send(Object.assign({ k: 'info' }, this.counts())); setTimeout(() => { try { conn.close(); } catch (e) { } }, 400); return; }
    if (m.k === 'hello') {
      if (mem) return;
      if ((m.v | 0) !== (VERSION.split('.')[0] | 0)) { conn.send({ k: 'deny', why: 'Versão incompatível. Recarregue a página.' }); return; }
      /* reconexão por token */
      let old = null; for (const x of this.members.values()) if (x.token === m.token && !x.connected && !x.host) old = x;
      if (old) { old.conn = conn; conn.member = old; old.connected = true; old.last = nowS(); conn.send(this.welcome(old, true)); this.dirty = true; this.cb.rejoin && this.cb.rejoin(old); return; }
      if (this.phase !== 'lobby' && !this.cfg.late) { conn.send({ k: 'deny', why: 'Partida em andamento.' }); return; }
      if (this.humanCount() >= this.M().max) { conn.send({ k: 'deny', why: 'Sala cheia.' }); return; }
      const nm = { id: 'u_' + uid(), name: String(m.name || 'Peão').slice(0, 16), skin: (m.skin | 0) % SKINS.length, farmer: FARMERS[m.farmer] ? m.farmer : '', loadout: m.loadout || 'galho', host: false, conn, ping: 0, token: String(m.token || uid()), squad: -1, ready: true, last: nowS(), connected: true };
      this.members.set(nm.id, nm); conn.member = nm; conn.send(this.welcome(nm, false)); this.dirty = true; this.cb.join && this.cb.join(nm);
      this.sys(nm.name + ' entrou na sala');
      return;
    }
    if (!mem) return; mem.last = nowS();
    switch (m.k) {
      case 'c': if (Array.isArray(m.c)) for (const w of m.c) this.cb.cmd && this.cb.cmd(mem, cmdFromWire(w)); break;
      case 'ping': conn.send({ k: 'pong', t: m.t }); if (typeof m.rtt === 'number') mem.ping = Math.round(m.rtt); break;
      case 'chat': { const now = nowS(); mem.chatT = (mem.chatT || []).filter(t => now - t < 6); if (mem.chatT.length >= 4) { if (mem.conn) mem.conn.send({ k: 'chat', n: '', t: 'Calma! Muitas mensagens seguidas (anti-spam).' }); break; } mem.chatT.push(now); this.say(mem.name, String(m.text || '').replace(/[<>]/g, '').slice(0, 140), m.team ? 1 : 0, mem); break; }
      case 'report': this.sys('Denúncia registrada pelo anfitrião contra ' + String(m.name || '').slice(0, 16)); (this.reports || (this.reports = [])).push({ by: mem.name, name: String(m.name || '').slice(0, 16), why: String(m.why || '').slice(0, 80), t: Date.now() }); break;
      case 'lo': break;
      case 'name': mem.name = String(m.name || mem.name).slice(0, 16); mem.skin = (m.skin | 0) % SKINS.length; this.dirty = true; break;
      case 'lv': mem.lootVer = m.v | 0; break;
      case 'leave': this.drop(conn, true); break;
    }
  }
  welcome(mem, rejoin) { return { k: 'welcome', id: mem.id, rejoin: !!rejoin, code: this.code, cfg: this.cfg, phase: this.phase, members: this.memberList(), host: this.hostMember && this.hostMember.id, chat: this.chat.slice(-12), start: this.phase !== 'lobby' ? this.startMsg : null }; }
  memberList() { return [...this.members.values()].map(m => ({ id: m.id, name: m.name, skin: m.skin, host: !!m.host, ping: m.ping | 0, connected: m.connected, loadout: m.loadout })); }
  drop(conn, voluntary) {
    const mem = conn.member; if (!mem) return; conn.member = null;
    if (this.phase === 'lobby' || voluntary) { this.members.delete(mem.id); this.sys(mem.name + ' saiu'); } else { mem.connected = false; mem.conn = null; mem.dropT = nowS(); this.sys(mem.name + ' desconectou (pode voltar)'); }
    this.dirty = true; this.cb.leave && this.cb.leave(mem, this.phase !== 'lobby' && !voluntary);
  }
  sys(text) { this.say('', text, 0, null); }
  say(name, text, team, mem) { const msg = { k: 'chat', n: name, t: text, tm: team ? 1 : 0, id: mem ? mem.id : '' }; this.chat.push(msg); if (this.chat.length > 40) this.chat.shift(); this.broadcast(msg); this.cb.chat && this.cb.chat(msg); }
  broadcast(msg, except) { for (const m of this.members.values()) if (m.conn && m !== except) m.conn.send(msg); }
  lobbyMsg() { return { k: 'lobby', cfg: this.cfg, members: this.memberList(), cd: this.countdown, min: this.M().min, max: this.M().max, phase: this.phase }; }
  setCfg(c) { Object.assign(this.cfg, c); this.dirty = true; }
  /* chamado a cada ~100ms (ou por frame) */
  tick(dt) {
    const now = nowS();
    for (const m of this.members.values()) { if (m.conn && now - m.conn.last > 12 && !m.host) { /* sem sinal */ const c = m.conn; c.close(); } }
    if (this.phase === 'lobby') {
      const n = this.humanCount(), M = this.M();
      if (n >= M.max) this.startNow();
      else if (n >= (this.cfg.fill ? (this.cfg.pub ? 1 : 2) : Math.max(2, M.min))) { if (this.countdown < 0) { this.countdown = this.cfg.fill ? (n === 1 ? 30 : COUNTDOWN_FILL) : COUNTDOWN_FULL; this.dirty = true; } else if (this.cfg.fill && n >= 2 && this.countdown > COUNTDOWN_FILL) { this.countdown = COUNTDOWN_FILL; this.dirty = true; } this.countdown -= dt; if (this.countdown <= 0) this.startNow(); }
      else if (this.countdown >= 0) { this.countdown = -1; this.dirty = true; }
    } else {
      /* expira jogadores que não voltaram */
      for (const m of [...this.members.values()]) if (!m.connected && now - m.dropT > 90) { this.members.delete(m.id); this.cb.expire && this.cb.expire(m); }
    }
    this.lobbyT += dt; if (this.dirty || this.lobbyT > 1) { if (this.phase === 'lobby' || this.dirty) this.broadcast(this.lobbyMsg()); this.lobbyT = 0; this.dirty = false; this.cb.lobby && this.cb.lobby(this.lobbyMsg()); }
  }
  startNow() { if (this.phase !== 'lobby') return false; this.phase = 'playing'; this.countdown = -1; this.cb.start && this.cb.start(); this.dirty = true; return true; }
  announceStart(roster, extra) { this.startMsg = Object.assign({ k: 'start', mode: this.cfg.mode, cfg: this.cfg, roster }, extra || {}); this.broadcast(this.startMsg); }
  backToLobby() { this.phase = 'lobby'; this.countdown = -1; this.startMsg = null; for (const m of [...this.members.values()]) if (!m.connected) this.members.delete(m.id); this.broadcast({ k: 'end' }); this.dirty = true; }
  sendSnapshots(sim, withSb) {
    for (const m of this.members.values()) {
      if (!m.conn || m.host) continue;
      const s = sim.snapshot(m.id, withSb, m.lootVer); s.k = 's'; m.conn.send(s);
    }
  }
}

/* ---------- cliente ---------- */
class NetClient {
  constructor(cb) { this.cb = cb || {}; this.conn = null; this.rtt = 60; this.id = ''; this.closed = false; this.pingT = 0; }
  async connect(kind, code, hello, timeout) {
    this.conn = await Hubs.connect(kind, code, timeout);
    return new Promise((res, rej) => {
      const to = setTimeout(() => { rej('timeout'); this.conn.close(); }, 8000);
      this.conn.onmsg = m => {
        if (m.k === 'welcome') { clearTimeout(to); this.id = m.id; this.conn.onmsg = x => this.onMsg(x); this.startPing(); res(m); }
        else if (m.k === 'deny') { clearTimeout(to); rej(m.why || 'negado'); this.conn.close(); }
      };
      this.conn.onclose = () => { clearTimeout(to); rej('fechou'); this.onClose(); };
      this.conn.send(Object.assign({ k: 'hello', v: VERSION.split('.')[0] | 0 }, hello));
    });
  }
  onClose() { if (this.closed) return; this.closed = true; this.cb.close && this.cb.close(); }
  startPing() { this.conn.onclose = () => this.onClose(); this.pingI = setInterval(() => { if (this.conn && this.conn.open) this.conn.send({ k: 'ping', t: nowS(), rtt: this.rtt }); }, 1000); }
  onMsg(m) {
    switch (m.k) {
      case 's': this.cb.snap && this.cb.snap(m); break;
      case 'lobby': this.cb.lobby && this.cb.lobby(m); break;
      case 'start': this.cb.start && this.cb.start(m); break;
      case 'end': this.cb.end && this.cb.end(m); break;
      case 'chat': this.cb.chat && this.cb.chat(m); break;
      case 'pong': { const r = (nowS() - m.t) * 1000; this.rtt = this.rtt * 0.7 + r * 0.3; break; }
      case 'kick': this.cb.kick && this.cb.kick(m); break;
    }
  }
  send(m) { if (this.conn) this.conn.send(m); }
  close() { this.closed = true; clearInterval(this.pingI); if (this.conn) { this.conn.send({ k: 'leave' }); this.conn.close(); } }
}
