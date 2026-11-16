/* =====================================================================
   58_account.js — contas (apelido + senha), código de recuperação,
   sessões, proteção contra tentativas, perfil/estatísticas por modo,
   histórico, conquistas, ranking geral/semanal, jogadores online reais
   (salas públicas), bloqueio/denúncia.
   O jogo roda no GitHub Pages (sem servidor): as contas ficam no
   navegador, com senha guardada só como hash PBKDF2-SHA-256 (310 mil
   iterações + sal aleatório) via WebCrypto. Nunca em texto puro.
   ===================================================================== */
'use strict';
const ACH = [
  { id: 'primeiro', name: 'Primeiro Sangue', desc: 'Faça seu primeiro abate.', test: s => s.kills >= 1 },
  { id: 'chapeu', name: 'Chapéu Furado', desc: 'Acerte 10 tiros na cabeça (abates).', test: s => s.heads >= 10 },
  { id: 'rei', name: 'Rei da Mandioca', desc: 'Plante a mandioca 10 vezes.', test: s => (s.plants | 0) >= 10 },
  { id: 'defensor', name: 'Defensor do Roçado', desc: 'Desarme a mandioca 5 vezes.', test: s => (s.defuses | 0) >= 5 },
  { id: 'pedepano', name: 'Pé de Pano', desc: 'Elimine 5 inimigos com o Facão do Mato.', test: s => (s.knife | 0) >= 5 },
  { id: 'sobrevivente', name: 'Sobrevivente', desc: 'Vença um Battle Royale.', test: s => (s.brWins | 0) >= 1 },
  { id: 'estilingue', name: 'Mestre do Estilingue', desc: 'Elimine 25 inimigos com o Estilingue.', test: s => (s.sling | 0) >= 25 },
  { id: 'dono', name: 'Dono do Roçado', desc: 'Elimine a equipe inteira numa rodada (ou vença o BR com 5+ abates).', test: s => (s.aces | 0) >= 1 },
  { id: 'veterano', name: 'Peão Veterano', desc: 'Jogue 25 partidas.', test: s => s.matches >= 25 }
];
const TITLES = [[1, 'Peão Novato'], [5, 'Capataz'], [10, 'Fazendeiro'], [20, 'Coronel do Roçado'], [35, 'Lenda da Roça']];

const Account = {
  db() { return store.get('accounts', {}); },
  saveDb(d) { store.set('accounts', d); },
  cur: null, // apelido logado
  hex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); },
  rand(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return this.hex(a.buffer); },
  async hash(secret, salt, iter) {
    if (!(crypto && crypto.subtle)) throw new Error('Este navegador não oferece criptografia segura (use HTTPS / navegador atual).');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: iter }, key, 256);
    return this.hex(bits);
  },
  validNick(n) { return /^[A-Za-zÀ-ÿ0-9_.-]{3,14}$/.test(n); },
  key(n) { return n.trim().toLowerCase(); },
  /* proteção contra tentativas automatizadas: bloqueio progressivo por apelido */
  lockLeft(n) { const L = store.get('lock', {})[this.key(n)]; if (!L) return 0; return Math.max(0, L.until - Date.now()); },
  fail(n) { const all = store.get('lock', {}), k = this.key(n), L = all[k] || { n: 0, until: 0 }; L.n++; if (L.n >= 3) L.until = Date.now() + Math.min(15 * 60, 15 * Math.pow(2, L.n - 3)) * 1000; all[k] = L; store.set('lock', all); },
  clearFail(n) { const all = store.get('lock', {}); delete all[this.key(n)]; store.set('lock', all); },
  async register(nick, pass) {
    nick = nick.trim(); if (!this.validNick(nick)) throw new Error('Apelido: 3 a 14 letras, números, _ . -');
    if (pass.length < 6) throw new Error('A senha precisa de pelo menos 6 caracteres.');
    const db = this.db(), k = this.key(nick); if (db[k]) throw new Error('Esse apelido já existe neste aparelho.');
    const salt = this.rand(16), iter = 310000, code = [0, 0, 0, 0].map(() => this.rand(2).toUpperCase()).join('-'), rsalt = this.rand(16);
    db[k] = { id: uid(), nick, salt, iter, hash: await this.hash(pass, salt, iter), rsalt, rhash: await this.hash(code, rsalt, 100000), created: new Date().toISOString(), profile: Object.assign({}, profile, { name: nick, xp: 0, matches: 0, wins: 0, losses: 0, kills: 0, deaths: 0, heads: 0, friends: [], history: [], ach: {}, st: {} }) };
    this.saveDb(db); await this.loginOk(k); return code;
  },
  async login(nick, pass) {
    const left = this.lockLeft(nick); if (left > 0) throw new Error(`Muitas tentativas. Tente de novo em ${Math.ceil(left / 1000)} s.`);
    const db = this.db(), a = db[this.key(nick)]; const h = a ? await this.hash(pass, a.salt, a.iter) : await this.hash(pass, 'x', 1000);
    if (!a || h !== a.hash) { this.fail(nick); throw new Error('Apelido ou senha incorretos.'); }
    this.clearFail(nick); await this.loginOk(this.key(nick));
  },
  async recover(nick, code, pass) {
    const left = this.lockLeft(nick); if (left > 0) throw new Error(`Muitas tentativas. Tente de novo em ${Math.ceil(left / 1000)} s.`);
    const db = this.db(), a = db[this.key(nick)]; if (!a || await this.hash(code.trim().toUpperCase(), a.rsalt, 100000) !== a.rhash) { this.fail(nick); throw new Error('Código de recuperação inválido.'); }
    if (pass.length < 6) throw new Error('A senha precisa de pelo menos 6 caracteres.');
    a.salt = this.rand(16); a.hash = await this.hash(pass, a.salt, a.iter); this.saveDb(db); this.clearFail(nick); await this.loginOk(this.key(nick));
  },
  async loginOk(k) {
    const db = this.db(), a = db[k]; this.cur = k; const tok = this.rand(16); a.session = { tok, exp: Date.now() + 30 * 864e5 }; this.saveDb(db);
    store.set('session', { k, tok }); Object.assign(profile, a.profile, { name: a.nick }); store.set('profile', profile); UI.refreshProfile && UI.refreshProfile();
  },
  resume() { const s = store.get('session', null); if (!s) return false; const a = this.db()[s.k]; if (!a || !a.session || a.session.tok !== s.tok || a.session.exp < Date.now()) return false; this.cur = s.k; Object.assign(profile, a.profile, { name: a.nick }); return true; },
  logout() { const db = this.db(); if (this.cur && db[this.cur]) { delete db[this.cur].session; this.saveDb(db); } this.cur = null; store.set('session', null); },
  /* persiste o perfil na conta logada */
  sync() { if (!this.cur) return; const db = this.db(), a = db[this.cur]; if (!a) return; a.profile = Object.assign({}, profile); a.nick = profile.name = a.nick; this.saveDb(db); },
  /* registra uma partida: estatísticas por modo, histórico, conquistas */
  recordMatch(r) {
    const st = profile.st || (profile.st = {}), t = r.mode === 'tatico' ? 'tat' : 'br', s = st[t] || (st[t] = { matches: 0, wins: 0, kills: 0, deaths: 0, assists: 0, heads: 0, shots: 0, hits: 0, time: 0, best: 0, rounds: 0, bestPlace: 0, survive: 0 });
    s.matches++; if (r.win) s.wins++; s.kills += r.k; s.deaths += r.d; s.assists += r.a; s.heads += r.hs; s.shots += r.shots; s.hits += r.hits; s.time += r.time; s.best = Math.max(s.best, r.score); s.rounds += r.roundsWon | 0;
    if (t === 'br') { s.bestPlace = s.bestPlace ? Math.min(s.bestPlace, r.place || 99) : (r.place || 0); s.survive = Math.max(s.survive, r.survive | 0); }
    const g = profile; g.assists = (g.assists | 0) + r.a; g.shots = (g.shots | 0) + r.shots; g.hits = (g.hits | 0) + r.hits; g.time = (g.time | 0) + r.time;
    g.plants = (g.plants | 0) + (r.plants | 0); g.defuses = (g.defuses | 0) + (r.defuses | 0); g.knife = (g.knife | 0) + (r.knife | 0); g.sling = (g.sling | 0) + (r.sling | 0); g.aces = (g.aces | 0) + (r.aces | 0); if (t === 'br' && r.win) g.brWins = (g.brWins | 0) + 1;
    (g.history || (g.history = [])).unshift({ d: Date.now(), mode: r.mode, win: r.win, draw: !!r.draw, k: r.k, d2: r.d, a: r.a, score: r.score, place: r.place || 0, sc: r.sc || '' }); g.history.length = Math.min(g.history.length, 40);
    const wk = weekKey(); g.week = g.week && g.week.k === wk ? g.week : { k: wk, xp: 0 }; g.week.xp += r.xp;
    const got = []; g.ach = g.ach || {}; for (const A of ACH) if (!g.ach[A.id] && A.test(g)) { g.ach[A.id] = Date.now(); got.push(A); }
    return got;
  }
};
function weekKey() { const d = new Date(); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + '-' + Math.ceil(((t - y0) / 864e5 + 1) / 7); }
function titleOf(level) { let t = TITLES[0][1]; for (const [l, n] of TITLES) if (level >= l) t = n; return t; }

/* ---------- telas de conta ---------- */
const AccUI = {
  open(force) {
    const m = UI.open(`<h2>${Account.cur ? 'Sua conta' : 'Entrar no BOMBAKI'}</h2>
      ${Account.cur ? `<p>Logado como <b>${esc(profile.name)}</b>.</p><div class="row"><button class="btn r" id="acOut">Sair da conta</button></div>` : `
      <div class="tabs"><button class="on" data-t="in">Entrar</button><button data-t="new">Criar conta</button><button data-t="rec">Esqueci a senha</button></div>
      <div class="field"><label>Apelido</label><input type="text" id="acNick" maxlength="14" autocomplete="username"></div>
      <div class="field" id="acCodeF" style="display:none"><label>Código de recuperação</label><input type="text" id="acCode" maxlength="19" placeholder="XXXX-XXXX-XXXX-XXXX"></div>
      <div class="field"><label id="acPassL">Senha</label><input type="password" id="acPass" maxlength="64" autocomplete="current-password" style="background:#1a0f08;border:2px solid #6a4a2a;border-radius:10px;color:#fff;padding:10px 12px;font-size:17px;font-weight:800"></div>
      <div class="err" id="acErr"></div>
      <div class="row"><button class="btn y grow" id="acGo">Entrar</button>${force ? '<button class="btn" id="acGuest">Jogar como convidado</button>' : ''}</div>
      <p style="font-size:13px;opacity:.75">Só pedimos apelido e senha — nada de e-mail, nome ou telefone. A senha é guardada apenas como hash seguro (PBKDF2-SHA-256, 310 mil iterações, com sal). Sem servidor central (GitHub Pages), a conta fica salva neste navegador; use a mesma máquina/navegador para manter o progresso.</p>`}`);
    if (Account.cur) { m.querySelector('#acOut').onclick = () => { Account.logout(); UI.close(); UI.toast('Você saiu da conta.'); AccUI.open(true); }; return; }
    let mode = 'in'; const $q = s => m.querySelector(s), err = t => { $q('#acErr').textContent = t || ''; };
    m.querySelectorAll('input').forEach(i => i.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') $q('#acGo').click(); });
    m.querySelector('.tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.t; m.querySelectorAll('.tabs button').forEach(c => c.classList.toggle('on', c === b)); $q('#acCodeF').style.display = mode === 'rec' ? '' : 'none'; $q('#acPassL').textContent = mode === 'in' ? 'Senha' : 'Nova senha'; $q('#acGo').textContent = mode === 'in' ? 'Entrar' : mode === 'new' ? 'Criar conta' : 'Trocar senha'; err(''); };
    if ($q('#acGuest')) $q('#acGuest').onclick = () => { store.set('guestOk', true); UI.close(); };
    $q('#acGo').onclick = async () => {
      const nick = $q('#acNick').value, pass = $q('#acPass').value, b = $q('#acGo'); b.disabled = true; err('');
      try {
        if (mode === 'in') { await Account.login(nick, pass); UI.close(); UI.toast('Bem-vindo de volta, ' + profile.name + '!'); }
        else if (mode === 'rec') { await Account.recover(nick, $q('#acCode').value, pass); UI.close(); UI.toast('Senha trocada! Você está logado.'); }
        else { const code = await Account.register(nick, pass); UI.close(); AccUI.showCode(code); }
      } catch (e) { err(e && e.message || String(e)); b.disabled = false; }
    };
  },
  showCode(code) {
    const m = UI.open(`<h2>Guarde seu código!</h2><p>Este é o seu <b>código de recuperação</b>. Ele é a única forma de trocar a senha se você esquecer (não usamos e-mail). Anote ou tire um print e guarde em lugar seguro:</p>
      <div class="codebox" style="font-size:28px;letter-spacing:.12em">${esc(code)}</div><div class="row" style="margin-top:12px"><button class="btn" id="cdCopy">Copiar</button><span class="grow"></span><button class="btn y" id="cdOk">Já guardei</button></div>`);
    m.querySelector('#cdCopy').onclick = () => UI.copy(code, 'Código copiado.'); m.querySelector('#cdOk').onclick = () => UI.close();
  },
  /* perfil completo: estatísticas por modo, conquistas, histórico, ranking */
  profile() {
    const L = levelInfo(), g = profile, st = g.st || {}, T = st.tat || {}, B = st.br || {}, pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '—', hm = s => `${Math.floor((s | 0) / 3600)}h ${Math.floor(((s | 0) % 3600) / 60)}min`;
    const box = (t, v) => `<div class="card"><b>${v}</b><small>${t}</small></div>`;
    const accs = Object.values(Account.db()), wk = weekKey(), rkAll = accs.map(a => ({ n: a.nick, xp: a.profile.xp | 0 })).sort((a, b) => b.xp - a.xp).slice(0, 10), rkW = accs.map(a => ({ n: a.nick, xp: a.profile.week && a.profile.week.k === wk ? a.profile.week.xp : 0 })).sort((a, b) => b.xp - a.xp).slice(0, 10);
    UI.open(`<h2>${esc(g.name)} · Nv. ${L.level} <small style="font-size:16px;color:#f3c13a">${titleOf(L.level)}</small></h2>
      <div class="tabs" id="pfT"><button class="on" data-t="g">Geral</button><button data-t="t">Roçado Tático</button><button data-t="b">Battle Royale</button><button data-t="a">Conquistas</button><button data-t="h">Histórico</button><button data-t="r">Ranking</button></div><div id="pfB"></div>`, 'wide');
    const tabs = {
      g: `<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">${box('Nível / XP', `${L.level} · ${g.xp}`)}${box('Vitórias', g.wins)}${box('Derrotas', g.losses)}${box('Eliminações', g.kills)}${box('Mortes', g.deaths)}${box('Assistências', g.assists | 0)}${box('Headshots', g.heads)}${box('Precisão', pct(g.hits | 0, g.shots | 0))}${box('Tempo de jogo', hm(g.time))}${box('Partidas', g.matches)}</div>`,
      t: `<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">${box('Partidas', T.matches | 0)}${box('Vitórias', T.wins | 0)}${box('Rodadas vencidas', T.rounds | 0)}${box('Eliminações', T.kills | 0)}${box('Mortes', T.deaths | 0)}${box('Assist.', T.assists | 0)}${box('Headshots', T.heads | 0)}${box('Precisão', pct(T.hits | 0, T.shots | 0))}${box('Melhor pontuação', T.best | 0)}${box('Plantas / desarmes', `${g.plants | 0} / ${g.defuses | 0}`)}</div>`,
      b: `<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">${box('Partidas', B.matches | 0)}${box('Vitórias', B.wins | 0)}${box('Melhor colocação', B.bestPlace ? B.bestPlace + 'º' : '—')}${box('Eliminações', B.kills | 0)}${box('Mortes', B.deaths | 0)}${box('Headshots', B.heads | 0)}${box('Precisão', pct(B.hits | 0, B.shots | 0))}${box('Maior sobrevivência', hm(B.survive))}${box('Melhor pontuação', B.best | 0)}</div>`,
      a: `<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${ACH.map(A => `<div class="card${(g.ach || {})[A.id] ? ' sel' : ''}" style="${(g.ach || {})[A.id] ? '' : 'opacity:.45'}"><b>${(g.ach || {})[A.id] ? '🏅' : '🔒'} ${A.name}</b><small>${A.desc}</small></div>`).join('')}</div>`,
      h: (g.history || []).length ? `<table class="keys">${(g.history || []).map(h => `<tr><td>${new Date(h.d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${h.mode === 'tatico' ? 'Roçado Tático' : 'Battle Royale'}</td><td>${h.draw ? 'Empate' : h.win ? '<b style="color:#7bff6a">Vitória</b>' : 'Derrota'}${h.place ? ' · ' + h.place + 'º' : ''}${h.sc ? ' · ' + h.sc : ''}</td><td>${h.k}/${h.d2}/${h.a}</td><td>${h.score} pts</td></tr>`).join('')}</table>` : '<p>Nenhuma partida ainda.</p>',
      r: `<div class="row" style="align-items:flex-start"><div class="grow"><h3>Ranking geral</h3><table class="keys">${rkAll.map((r, i) => `<tr><td>${i + 1}º</td><td>${esc(r.n)}</td><td>${r.xp} XP</td></tr>`).join('')}</table></div><div class="grow"><h3>Ranking semanal</h3><table class="keys">${rkW.map((r, i) => `<tr><td>${i + 1}º</td><td>${esc(r.n)}</td><td>${r.xp} XP</td></tr>`).join('')}</table></div></div><p style="font-size:13px;opacity:.7">Sem servidor central, o ranking compara as contas deste aparelho.</p>`
    };
    const body = $('pfB') || document.querySelector('#pfB'); body.innerHTML = tabs.g;
    document.querySelector('#pfT').onclick = e => { const b = e.target.closest('button'); if (!b) return; document.querySelectorAll('#pfT button').forEach(c => c.classList.toggle('on', c === b)); document.querySelector('#pfB').innerHTML = tabs[b.dataset.t]; };
  }
};

/* ---------- jogadores online reais (salas públicas) ---------- */
const Presence = {
  data: null, busy: false,
  async scan() {
    if (this.busy || G.scene === 'play' || document.hidden) return; this.busy = true; const kind = transportKind(), tot = { humans: 0, waiting: 0, playing: 0, bots: 0, rooms: [] };
    try {
      if (kind === 'peer' && typeof Peer === 'undefined') await loadPeerJS();
      for (const code of ['PT1', 'PT2', 'PT3', 'PC1', 'PC2', 'PC3']) {
        if (G.code === code && G.net) { const c = G.net.counts(); this.add(tot, code, c); continue; }
        try { const conn = await Hubs.connect(kind, code, 2600); const info = await new Promise(res => { const to = setTimeout(() => res(null), 2200); conn.onmsg = m => { if (m && m.k === 'info') { clearTimeout(to); res(m); } }; conn.send({ k: 'probe' }); }); try { conn.close(); } catch (e) { } if (info) this.add(tot, code, info); } catch (e) { }
      }
      if (G.net && !String(G.code).startsWith('P')) this.add(tot, G.code, G.net.counts());
      this.data = tot; this.t = Date.now();
    } catch (e) { } this.busy = false; UI.refreshOnline && UI.refreshOnline();
  },
  add(tot, code, c) { tot.humans += c.humans | 0; tot.waiting += c.waiting | 0; tot.playing += c.playing | 0; tot.bots += c.bots | 0; tot.rooms.push({ code, names: c.names || [], mode: c.mode }); },
  start() { this.scan(); setInterval(() => this.scan(), 30000); }
};
