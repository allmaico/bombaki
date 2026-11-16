/* =====================================================================
   56_ui.js — menus: principal, Jogar, Criar Partida, Entrar com Código,
   Chiqueiro (lobby), Configurações, Perfil, Estatísticas, Amigos, fim de jogo
   O controlador (60_game.js) preenche UI.on = { offline, host, join, ... }.
   ===================================================================== */
'use strict';
const UI = {
  on: {}, modal: null, lobbyData: null, lobbyMe: '', lobbyIsHost: false, lobbyCode: '', cur: 'loading',
  /* ---------- telas ---------- */
  screen(name) {
    this.cur = name;
    for (const id of ['menu', 'lobby', 'hud', 'pause', 'endscr', 'click2play']) { const e = $(id); if (e) e.classList.toggle('hidden', id !== name); }
  },
  toast(msg, ms) { const t = $('toast'), d = document.createElement('div'); d.textContent = msg; t.appendChild(d); setTimeout(() => d.remove(), ms || 3200); while (t.children.length > 4) t.firstChild.remove(); },
  copy(text, okMsg) { const done = () => this.toast(okMsg || 'Copiado!'); try { navigator.clipboard.writeText(text).then(done, () => { this._copyFB(text); done(); }); } catch (e) { this._copyFB(text); done(); } },
  _copyFB(text) { const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;left:-999px'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { } t.remove(); },
  link(code) { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('sala', code); return u.toString(); },

  /* ---------- modais ---------- */
  open(html, cls, onClose) {
    this.close(); const root = $('modal-root'), bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${cls || ''}"><button class="x" data-x>✕</button>${html}</div>`; root.appendChild(bg); root.style.pointerEvents = 'auto';
    bg.addEventListener('mousedown', e => { if (e.target === bg) this.close(); }); bg.querySelector('[data-x]').onclick = () => this.close();
    this.modal = { bg, onClose }; return bg.querySelector('.modal');
  },
  close() { if (!this.modal) return; const m = this.modal; this.modal = null; m.bg.remove(); $('modal-root').style.pointerEvents = 'none'; m.onClose && m.onClose(); },

  /* ---------- menu principal ---------- */
  initMenu() {
    $('bDiscord').href = DISCORD_URL; $('verN').textContent = VERSION; $('netMode').textContent = 'Multiplayer P2P';
    $('onlineN').parentElement.parentElement.title = 'Humanos online agora nas salas públicas (bots nunca contam)';
    this.refreshOnline = () => { const d = Presence.data, n = (d ? d.humans : 0) + (G.net || G.nc ? 0 : 1); $('onlineN').textContent = n; $('onlineN2').textContent = n + (d ? ` · aguardando ${d.waiting} · em partida ${d.playing} · bots ${d.bots}` : ''); };
    this.refreshOnline(); setTimeout(() => Presence.start(), 2500);
    $('bPlay').onclick = () => { sfx.ui(1); this.playModal(); };
    $('bCreate').onclick = () => { sfx.ui(1); this.createModal(); };
    $('bJoin').onclick = () => { sfx.ui(1); this.joinModal(); };
    $('bSet').onclick = $('bSet2').onclick = () => { sfx.ui(0); this.settingsModal(); };
    $('bStats').onclick = () => { sfx.ui(0); AccUI.profile(); };
    $('bFriends').onclick = () => { sfx.ui(0); this.friendsModal(); };
    $('pAv').onclick = $('pName').onclick = () => { sfx.ui(0); this.profileModal(); };
    $('bExit').onclick = () => { this.toast('Pode fechar esta aba quando quiser. Até a próxima colheita! 🌽'); try { window.close(); } catch (e) { } };
    this.refreshProfile();
  },
  refreshProfile() {
    const L = levelInfo(); $('pName').textContent = profile.name; $('pLv').textContent = L.level; $('pXpI').style.width = (L.xp / L.need * 100).toFixed(1) + '%'; $('pXpT').textContent = `${L.xp} / ${L.need} XP`;
    $('pGames').textContent = profile.matches; $('pWins').textContent = profile.wins; $('pLoss').textContent = profile.losses; drawFace($('pAvC'), profile.skin);
  },

  /* ---------- JOGAR ---------- */
  playModal() {
    let mode = store.get('lastMode', 'tatico'), lvl = settings.botLevel || 'normal';
    const m = this.open(`<h2>Jogar</h2>
      <div class="cards" id="mdCards">${Object.values(MODES).map(M => `<button class="card${M.id === mode ? ' sel' : ''}" data-m="${M.id}"><b>${M.name}</b><em>${M.sub} · ${M.min}–${M.max} jogadores</em><small>${M.desc}</small></button>`).join('')}</div>
      <div class="field" id="mdTotF"><label>Participantes no Battle Royale (com bots)</label><div class="seg" id="mdTot">${[16, 30, 50].map(n => `<button data-n="${n}" class="${n === (store.get('brTotal', 30)) ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="field"><label>Dificuldade dos bots (treino)</label><div class="seg" id="mdLvl">${Object.entries(BOT_LEVELS).map(([k, v]) => `<button data-l="${k}" class="${k === lvl ? 'on' : ''}">${v.name}</button>`).join('')}</div></div>
      <div class="row" style="margin-top:14px"><button class="btn y grow" id="mdBots">🤖 Treino com Bots<br><small style="font-weight:700">offline · instantâneo</small></button><button class="btn g grow" id="mdPub">🌐 Partida Pública<br><small style="font-weight:700">online · busca uma sala aberta</small></button></div>
      <p style="font-size:13px;opacity:.75;margin-top:12px">Partida Pública procura uma sala aberta do modo escolhido; se não houver, você cria uma e quem entrar depois joga com você (bots completam os times).</p>`);
    let total = store.get('brTotal', 30); const upd = () => { m.querySelector('#mdTotF').style.display = mode === 'caos' ? '' : 'none'; }; upd();
    m.querySelector('#mdTot').onclick = e => { const b = e.target.closest('button'); if (!b) return; total = +b.dataset.n; store.set('brTotal', total); m.querySelectorAll('#mdTot button').forEach(c => c.classList.toggle('on', c === b)); };
    m.querySelector('#mdCards').onclick = e => { const b = e.target.closest('.card'); if (!b) return; mode = b.dataset.m; store.set('lastMode', mode); m.querySelectorAll('.card').forEach(c => c.classList.toggle('sel', c === b)); upd(); };
    m.querySelector('#mdLvl').onclick = e => { const b = e.target.closest('button'); if (!b) return; lvl = b.dataset.l; settings.botLevel = lvl; saveSettings(); m.querySelectorAll('#mdLvl button').forEach(c => c.classList.toggle('on', c === b)); };
    m.querySelector('#mdBots').onclick = () => { this.close(); this.on.offline && this.on.offline({ mode, botLevel: lvl, total }); };
    m.querySelector('#mdPub').onclick = () => { this.close(); this.on.pub && this.on.pub({ mode, botLevel: lvl, total }); };
  },
  /* ---------- CRIAR PARTIDA ---------- */
  createModal() {
    let mode = store.get('lastMode', 'tatico'), rounds = 12, total = store.get('brTotal', 30), fill = true, pub = false, lvl = settings.botLevel || 'normal';
    const m = this.open(`<h2>Criar Partida</h2>
      <div class="cards" id="crCards">${Object.values(MODES).map(M => `<button class="card${M.id === mode ? ' sel' : ''}" data-m="${M.id}"><b>${M.name}</b><em>${M.sub}</em><small>Mín. ${M.min} · máx. ${M.max} jogadores</small></button>`).join('')}</div>
      <div class="field" id="crRoundsF"><label>Formato</label><div class="seg" id="crRounds">${[[12, '12 rodadas (oficial)'], [6, 'Amistoso curto (6)']].map(([n, t]) => `<button data-n="${n}" class="${n === rounds ? 'on' : ''}">${t}</button>`).join('')}</div></div>
      <div class="field" id="crTotF"><label>Participantes (com bots)</label><div class="seg" id="crTot">${[16, 30, 50].map(n => `<button data-n="${n}" class="${n === total ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="field"><label>Dificuldade dos bots</label><div class="seg" id="crLvl">${Object.entries(BOT_LEVELS).map(([k, v]) => `<button data-l="${k}" class="${k === lvl ? 'on' : ''}">${v.name}</button>`).join('')}</div></div>
      <label class="chk"><input type="checkbox" id="crFill" checked> Completar vagas com bots ao iniciar</label>
      <label class="chk"><input type="checkbox" id="crPub"> Sala pública (aparece para “Partida Pública”)</label>
      <div class="err" id="crErr"></div>
      <div class="row" style="margin-top:8px"><button class="btn y grow" id="crGo">Criar sala</button></div>`);
    const upd = () => { m.querySelector('#crRoundsF').style.display = mode === 'tatico' ? '' : 'none'; m.querySelector('#crTotF').style.display = mode === 'caos' ? '' : 'none'; };
    m.querySelector('#crTot').onclick = e => { const b = e.target.closest('button'); if (!b) return; total = +b.dataset.n; m.querySelectorAll('#crTot button').forEach(c => c.classList.toggle('on', c === b)); };
    m.querySelector('#crCards').onclick = e => { const b = e.target.closest('.card'); if (!b) return; mode = b.dataset.m; m.querySelectorAll('.card').forEach(c => c.classList.toggle('sel', c === b)); upd(); };
    m.querySelector('#crRounds').onclick = e => { const b = e.target.closest('button'); if (!b) return; rounds = +b.dataset.n; m.querySelectorAll('#crRounds button').forEach(c => c.classList.toggle('on', c === b)); };
    m.querySelector('#crLvl').onclick = e => { const b = e.target.closest('button'); if (!b) return; lvl = b.dataset.l; m.querySelectorAll('#crLvl button').forEach(c => c.classList.toggle('on', c === b)); };
    m.querySelector('#crFill').onchange = e => fill = e.target.checked; m.querySelector('#crPub').onchange = e => pub = e.target.checked; upd();
    m.querySelector('#crGo').onclick = async () => { const b = m.querySelector('#crGo'); b.disabled = true; m.querySelector('#crErr').textContent = ''; try { await this.on.host({ mode, rounds, fill, pub, botLevel: lvl, total }); this.close(); } catch (e) { b.disabled = false; m.querySelector('#crErr').textContent = this.errText(e); } };
  },
  /* ---------- ENTRAR COM CÓDIGO ---------- */
  joinModal(prefill) {
    const m = this.open(`<h2>Entrar com Código</h2><p>Digite o código da sala que seu amigo criou:</p>
      <input class="code" type="text" id="jnCode" maxlength="8" placeholder="ABCDE" autocomplete="off" spellcheck="false">
      <div class="err" id="jnErr"></div><div class="row" style="margin-top:8px"><button class="btn y grow" id="jnGo">Entrar</button></div>`);
    const inp = m.querySelector('#jnCode'); inp.value = prefill || ''; setTimeout(() => inp.focus(), 50);
    inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
    const go = async () => { const code = inp.value.trim().toUpperCase(); if (code.length < 3) { m.querySelector('#jnErr').textContent = 'Digite o código completo.'; return; } const b = m.querySelector('#jnGo'); b.disabled = true; m.querySelector('#jnErr').textContent = 'Conectando…'; try { await this.on.join(code); this.close(); } catch (e) { b.disabled = false; m.querySelector('#jnErr').textContent = this.errText(e); } };
    m.querySelector('#jnGo').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); e.stopPropagation(); };
    if (prefill && prefill.length >= 3) setTimeout(go, 150);
  },
  errText(e) { const s = String(e && e.message || e); if (s === 'notfound') return 'Sala não encontrada. Confira o código (ou se o anfitrião ainda está com a aba aberta).'; if (s === 'timeout') return 'Tempo esgotado. Verifique sua internet e tente de novo.'; if (s === 'taken') return 'Esse código já está em uso. Tente de novo.'; if (s === 'fechou') return 'A conexão foi encerrada.'; return s; },

  /* ---------- PERFIL / SKINS ---------- */
  profileModal() {
    const m = this.open(`<h2>Seu Peão</h2><div class="field"><label>Apelido</label><input type="text" id="pfName" maxlength="14" value="${esc(profile.name)}"></div>
      <h3>Personagem</h3><div class="skins" id="pfSkins">${SKINS.map((s, i) => `<button class="skin${i === profile.skin ? ' sel' : ''}" data-i="${i}"><canvas width="64" height="64"></canvas>${esc(s.name)}</button>`).join('')}</div>
      <h3>Paraquedas (cosmético, sem vantagem)</h3><div class="seg" id="pfPri">${PARACHUTES.map(c => `<button data-w="${c.id}" class="${(profile.chute || 'lencol') === c.id ? 'on' : ''}">${c.name}</button>`).join('')}</div>
      <div class="row" style="margin-top:16px"><button class="btn" id="pfAcc">${Account.cur ? 'Conta: ' + esc(profile.name) : 'Entrar / criar conta'}</button><button class="btn y grow" id="pfOk">Salvar</button></div>`, '', () => { });
    m.querySelector('#pfAcc').onclick = () => { this.close(); AccUI.open(); };
    m.querySelectorAll('.skin canvas').forEach((c, i) => drawFace(c, i));
    m.querySelector('#pfSkins').onclick = e => { const b = e.target.closest('.skin'); if (!b) return; profile.skin = +b.dataset.i; m.querySelectorAll('.skin').forEach(c => c.classList.toggle('sel', c === b)); sfx.ui(0); };
    m.querySelector('#pfPri').onclick = e => { const b = e.target.closest('button'); if (!b) return; profile.chute = b.dataset.w; m.querySelectorAll('#pfPri button').forEach(c => c.classList.toggle('on', c === b)); };
    m.querySelector('#pfName').onkeydown = e => e.stopPropagation();
    m.querySelector('#pfOk').onclick = () => { if (!Account.cur) profile.name = (m.querySelector('#pfName').value.trim() || 'Peão').slice(0, 14); saveProfile(); this.refreshProfile(); this.close(); this.on.profile && this.on.profile(); };
  },
  /* ---------- ESTATÍSTICAS ---------- */
  statsModal() {
    const L = levelInfo(), kd = profile.deaths ? (profile.kills / profile.deaths).toFixed(2) : profile.kills.toFixed(2), wr = profile.matches ? Math.round(profile.wins / profile.matches * 100) : 0;
    const cell = (a, b) => `<div class="card"><b>${a}</b><small>${b}</small></div>`;
    this.open(`<h2>Estatísticas de ${esc(profile.name)}</h2><div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${cell('Lv. ' + L.level, L.xp + ' / ' + L.need + ' XP')}${cell(profile.matches, 'Partidas')}${cell(profile.wins, 'Vitórias (' + wr + '%)')}${cell(profile.losses, 'Derrotas')}${cell(profile.kills, 'Abates')}${cell(profile.deaths, 'Mortes')}${cell(kd, 'K/D')}${cell(profile.heads, 'Tiros na cabeça')}</div>
      <p style="margin-top:14px;font-size:13px;opacity:.7">As estatísticas ficam salvas neste navegador (sem servidor central).</p>`);
  },
  /* ---------- AMIGOS ---------- */
  friendsModal() {
    profile.friends = profile.friends || []; profile.blocked = profile.blocked || [];
    const where = n => { const d = Presence.data; if (!d) return null; for (const r of d.rooms) if (r.names.some(x => x.toLowerCase() === n.toLowerCase())) return r; return null; };
    const render = () => {
      const m = this.modal.bg.querySelector('.modal'), list = m.querySelector('#frList');
      list.innerHTML = (profile.friends.length ? profile.friends.map((f, i) => { const r = where(f.name); return `<div class="friend"><canvas width="48" height="48" data-s="${f.skin | 0}"></canvas><b>${esc(f.name)}</b><small style="color:${r ? '#7bff6a' : '#bda98a'}">${r ? '● online · sala ' + r.code : '○ offline'}</small>${r ? `<button class="btn s g" data-a="join" data-c="${r.code}">Entrar na sala</button>` : ''}<button class="btn s" data-a="inv" data-i="${i}">Convidar</button><button class="btn s r" data-a="del" data-i="${i}">Remover</button></div>`; }).join('') : '<p>Nenhum amigo ainda.</p>')
        + (profile.blocked.length ? `<h3>Bloqueados</h3>${profile.blocked.map((b, i) => `<div class="friend"><b>${esc(b)}</b><button class="btn s" data-a="unb" data-i="${i}">Desbloquear</button></div>`).join('')}` : '');
      list.querySelectorAll('canvas').forEach(c => drawFace(c, +c.dataset.s));
    };
    const m = this.open(`<h2>Amigos</h2><div class="row"><input type="text" id="frName" maxlength="14" placeholder="Apelido do jogador" class="grow"><button class="btn y" id="frAdd">Adicionar</button><button class="btn" id="frBlock">Bloquear</button><button class="btn r" id="frRep">Denunciar</button></div><div id="frList" style="margin-top:10px"></div>
      <p style="font-size:13px;opacity:.7">Status online vem das salas públicas abertas agora. Convidar copia o link da sua sala. Bloquear esconde o chat e silencia a voz do jogador. Denúncias vão para o anfitrião da sala atual.</p>`);
    render(); Presence.scan().then(() => { if (this.modal) render(); });
    const nameIn = () => (m.querySelector('#frName').value.trim() || '').slice(0, 14);
    m.querySelector('#frName').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') m.querySelector('#frAdd').click(); };
    m.querySelector('#frAdd').onclick = () => { const n = nameIn(); if (!n || profile.friends.some(f => f.name.toLowerCase() === n.toLowerCase())) return; profile.friends.push({ name: n, skin: (Math.random() * SKINS.length) | 0 }); saveProfile(); m.querySelector('#frName').value = ''; render(); };
    m.querySelector('#frBlock').onclick = () => { const n = nameIn(); if (!n) return; if (!profile.blocked.includes(n)) profile.blocked.push(n); saveProfile(); render(); this.toast(n + ' bloqueado.'); };
    m.querySelector('#frRep').onclick = () => { const n = nameIn(); if (!n) return; (profile.reports || (profile.reports = [])).push({ name: n, t: Date.now() }); saveProfile(); if (G.nc) G.nc.send({ k: 'report', name: n, why: 'denúncia pelo menu' }); else if (G.net) G.net.sys('Denúncia registrada contra ' + n); this.toast('Denúncia registrada. Obrigado!'); };
    m.querySelector('#frList').onclick = e => { const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.i; const a = b.dataset.a;
      if (a === 'del') { profile.friends.splice(i, 1); saveProfile(); render(); } else if (a === 'unb') { profile.blocked.splice(i, 1); saveProfile(); render(); }
      else if (a === 'join') { this.close(); this.on.join && this.on.join(b.dataset.c); }
      else if (this.lobbyCode) this.copy(this.link(this.lobbyCode), 'Link da sala copiado — envie para ' + profile.friends[i].name); else this.toast('Crie uma partida primeiro e depois convide seus amigos.'); };
  },

  /* ---------- CONFIGURAÇÕES ---------- */
  settingsModal(inGame) {
    const seg = (k, label, opts) => `<div class="field"><label>${label}</label><div class="seg" data-k="${k}">${opts.map(([v, t]) => `<button data-v="${v}" class="${String(settings[k]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
    const rng = (k, label, min, max, step, fmt) => `<div class="field"><label>${label}</label><div class="slider"><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${settings[k]}"><b>${(fmt || (v => v))(settings[k])}</b></div></div>`;
    const chk = (k, label) => `<label class="chk"><input type="checkbox" data-k="${k}" ${settings[k] ? 'checked' : ''}> ${label}</label>`;
    const pct = v => Math.round(v * 100) + '%', fx2 = v => (+v).toFixed(2);
    const tabs = {
      gfx: seg('quality', 'Qualidade gráfica', [['muito_baixo', 'Muito baixo'], ['baixo', 'Baixo'], ['medio', 'Médio'], ['alto', 'Alto']]) + chk('perfMode', 'Modo desempenho (força o mínimo, ideal para PC fraco)') + seg('fpsCap', 'Limite de FPS', [[30, '30'], [60, '60'], [120, '120'], [0, 'Livre']]) + seg('shadowQ', 'Qualidade das sombras', [['auto', 'Auto'], [0, 'Desligadas'], [1024, 'Média'], [2048, 'Alta']]) + seg('outline', 'Contornos cartoon', [['auto', 'Auto (Alto)'], ['on', 'Ligados'], ['off', 'Desligados']]) + seg('ao', 'Oclusão ambiente', [['auto', 'Auto (Alto)'], ['on', 'Ligada'], ['off', 'Desligada']]) + chk('toon', 'Iluminação cartoon (luz em faixas, sombra fria)') + rng('renderScale', 'Escala de renderização', .5, 1.5, .05, pct) + rng('viewDist', 'Distância de visão', .5, 1.5, .05, pct) + rng('grass', 'Densidade do mato', 0, 1.5, .05, pct) + rng('particles', 'Qualidade dos efeitos', 0, 1.5, .1, pct) + rng('fov', 'Campo de visão (FOV)', 70, 110, 1, v => v + '°') + chk('showFps', 'Mostrar FPS') + chk('perfHud', 'Medidor de desempenho detalhado (GPU por passe, chamadas, memória)') + chk('showPing', 'Mostrar ping e perda de pacotes'),
      ctl: rng('sens', 'Sensibilidade do mouse', .2, 3, .05, fx2) + rng('adsSens', 'Sensibilidade ao mirar', .3, 1.5, .05, fx2) + rng('padSens', 'Sensibilidade do controle (USB/Bluetooth)', .3, 2.5, .05, fx2) + chk('invertY', 'Inverter eixo Y') + rng('bobbing', 'Balanço da arma/câmera', 0, 1.5, .1, pct) + rng('cameraShake', 'Tremor de câmera', 0, 1.5, .1, pct) +
        `<h3>Teclas (clique para trocar)</h3>${Rebind.table()}<p style="font-size:13px;opacity:.75">Controle: LS move · RS mira · RT atira · LT mira · A pula · B agacha · X recarrega · Y primária · RB interage · LB ovo · ↑ cura · ↓ loja/mochila · ← → armas · Start pausa · Select placar.</p>`,
      touch: rng('touchSize', 'Tamanho dos botões', .6, 1.6, .05, pct) + rng('touchAlpha', 'Transparência', .2, 1, .05, pct) + rng('touchSens', 'Sensibilidade da câmera (toque)', .3, 3, .05, fx2) + `<div class="row" style="margin-top:8px"><button class="btn s" id="tcEdit">Editar posição dos botões</button><button class="btn s" id="tcReset">Posições padrão</button></div><p style="font-size:13px;opacity:.75">${IS_TOUCH ? 'Tela de toque detectada.' : 'Sem tela de toque neste aparelho — estas opções valem no celular.'} Jogue com o celular na horizontal.</p>`,
      aud: rng('master', 'Volume geral', 0, 1, .05, pct) + rng('sfx', 'Efeitos', 0, 1, .05, pct) + rng('music', 'Música', 0, 1, .05, pct) + rng('amb', 'Ambiente (grilos, vento)', 0, 1, .05, pct) + chk('hitSound', 'Som de acerto') + seg('voice', 'Voz da equipe (só no Roçado Tático online)', [['off', 'Desligada'], ['ptt', 'Apertar para falar'], ['open', 'Microfone aberto']]) + `<p style="font-size:13px;opacity:.75">A voz vai só para os aliados (WebRTC). Silencie alguém no placar (Tab) pelo nome em Amigos → Bloquear.</p>`,
      play: seg('botLevel', 'Dificuldade dos bots', Object.entries(BOT_LEVELS).map(([k, v]) => [k, v.name])) + chk('showHints', 'Mostrar dicas de teclas') + `<div class="field"><label>Cor da mira</label><div class="row">${['#ffffff', '#7bff6a', '#ffe27a', '#6ad0ff', '#ff6a5a'].map(c => `<button class="btn s" data-col="${c}" style="background:${c};width:44px;height:34px;${settings.crosshair === c ? 'outline:3px solid #fff' : ''}"></button>`).join('')}</div></div>` + rng('crossSize', 'Tamanho da mira', .6, 2, .1, pct)
    };
    let cur = 'gfx';
    const m = this.open(`<h2>Configurações</h2><div class="tabs">${[['gfx', 'Gráficos'], ['ctl', 'Controles'], ['touch', 'Toque'], ['aud', 'Áudio'], ['play', 'Jogabilidade']].map(([k, t]) => `<button data-t="${k}" class="${k === cur ? 'on' : ''}">${t}</button>`).join('')}</div><div id="stBody">${tabs[cur]}</div>
      <div class="row" style="margin-top:14px"><button class="btn s" id="stReset">Restaurar padrão</button><span class="grow"></span><button class="btn y" id="stOk">Pronto</button></div>`, 'wide', () => { saveSettings(); this.on.settings && this.on.settings(); if (inGame) this.on.resumeFromSettings && this.on.resumeFromSettings(); });
    const body = m.querySelector('#stBody');
    const bind = () => {
      body.querySelectorAll('input[type=range]').forEach(i => i.oninput = () => { settings[i.dataset.k] = +i.value; const b = i.parentElement.querySelector('b'); const f = { renderScale: pct, viewDist: pct, grass: pct, particles: pct, fov: v => v + '°', sens: fx2, adsSens: fx2, padSens: fx2, touchSize: pct, touchAlpha: pct, touchSens: fx2, bobbing: pct, cameraShake: pct, master: pct, sfx: pct, music: pct, amb: pct, crossSize: pct }[i.dataset.k] || (v => v); b.textContent = f(+i.value); this.on.settings && this.on.settings(i.dataset.k); });
      body.querySelectorAll('input[type=checkbox]').forEach(i => i.onchange = () => { settings[i.dataset.k] = i.checked; this.on.settings && this.on.settings(i.dataset.k); });
      body.querySelectorAll('.seg').forEach(s => s.onclick = e => { const b = e.target.closest('button'); if (!b) return; settings[s.dataset.k] = /^\d+$/.test(b.dataset.v) ? +b.dataset.v : b.dataset.v; s.querySelectorAll('button').forEach(c => c.classList.toggle('on', c === b)); this.on.settings && this.on.settings(s.dataset.k); });
      body.querySelectorAll('[data-rb]').forEach(b => b.onclick = () => Rebind.start(b.dataset.rb, b));
      const rr = body.querySelector('[data-rbreset]'); if (rr) rr.onclick = () => { settings.binds = {}; saveSettings(); body.innerHTML = tabs[cur]; bind(); };
      const te = body.querySelector('#tcEdit'); if (te) te.onclick = () => { this.close(); Touch.setEdit(true); };
      const tr = body.querySelector('#tcReset'); if (tr) tr.onclick = () => { settings.touchLayout = {}; saveSettings(); Touch.apply(); this.toast('Posições restauradas.'); };
      body.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { settings.crosshair = b.dataset.col; body.querySelectorAll('[data-col]').forEach(c => c.style.outline = c === b ? '3px solid #fff' : ''); this.on.settings && this.on.settings('crosshair'); });
    };
    bind();
    m.querySelector('.tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; cur = b.dataset.t; m.querySelectorAll('.tabs button').forEach(c => c.classList.toggle('on', c === b)); body.innerHTML = tabs[cur]; bind(); };
    m.querySelector('#stOk').onclick = () => this.close();
    m.querySelector('#stReset').onclick = () => { Object.assign(settings, DEFAULT_SETTINGS); saveSettings(); this.on.settings && this.on.settings('quality'); this.close(); this.toast('Configurações restauradas.'); };
  },

  /* ---------- LOBBY (Chiqueiro) ---------- */
  lobbyOpen(code, isHost, myId) {
    this.lobbyCode = code; this.lobbyIsHost = isHost; this.lobbyMe = myId; this.lobbyData = null; this.screen('lobby');
    const M = this.on.lobbyCfgModes || MODES;
    $('lobby').innerHTML = `<div class="box">
      <div style="display:flex;flex-direction:column;gap:10px;min-height:0">
        <div class="row"><h1 class="fnt">🐖 Chiqueiro</h1><span class="grow"></span><span id="lbMode" class="kbd" style="font-size:15px;padding:6px 12px"></span></div>
        <div class="row"><div class="codebox grow" id="lbCode">${esc(code)}</div><div style="display:grid;gap:6px"><button class="btn s" id="lbCopyC">Copiar código</button><button class="btn s" id="lbCopyL">Copiar link</button></div></div>
        <div class="cd" id="lbCd"></div>
        <div class="pl" id="lbMembers"></div>
        <div class="row"><button class="btn y grow" id="lbStart">▶ Iniciar partida</button><button class="btn r" id="lbLeave">Sair</button></div>
      </div>
      <div class="chat">
        <div id="lbCfg"></div>
        <h3>Chat da sala</h3><div class="log" id="lbLog"></div>
        <input type="text" id="lbIn" maxlength="120" placeholder="Digite e pressione Enter…" style="margin-top:8px">
      </div></div>`;
    $('lbCopyC').onclick = () => this.copy(code, 'Código copiado!'); $('lbCopyL').onclick = () => this.copy(this.link(code), 'Link copiado! Envie para seus amigos.');
    $('lbLeave').onclick = () => this.on.leave && this.on.leave(); $('lbStart').onclick = () => this.on.start && this.on.start(); $('lbStart').style.display = isHost ? '' : 'none';
    const inp = $('lbIn'); inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && inp.value.trim()) { this.on.chat && this.on.chat(inp.value.trim()); inp.value = ''; } };
  },
  lobbyChat(msg) { const log = $('lbLog'); if (!log) return; const d = document.createElement('div'); if (!msg.n) { d.className = 'sys'; d.textContent = msg.t; } else d.innerHTML = `<b>${esc(msg.n)}:</b> ${esc(msg.t)}`; log.appendChild(d); log.scrollTop = 1e6; while (log.children.length > 60) log.firstChild.remove(); },
  lobbyUpdate(l) {
    this.humans = l.members ? l.members.filter(m => m.connected !== false).length : 1;
    this.lobbyData = l; if (this.cur !== 'lobby') return; const M = MODES[l.cfg.mode], isHost = this.lobbyIsHost;
    $('lbMode').textContent = `${M.name} · ${l.cfg.pub ? 'Pública' : 'Privada'}`;
    $('lbMembers').innerHTML = l.members.map(m => `<div class="mem"><canvas width="64" height="64" data-s="${m.skin}"></canvas><span>${esc(m.name)}${m.id === this.lobbyMe ? ' <small style="opacity:.6">(você)</small>' : ''}</span>${m.host ? '<span class="tag">ANFITRIÃO</span>' : ''}${m.connected ? '' : '<span class="tag" style="background:#ff6a5a">OFF</span>'}${!m.host && m.ping ? `<span class="png">${m.ping} ms</span>` : ''}</div>`).join('') + (l.members.length < l.min ? `<div class="mem" style="opacity:.55;justify-content:center">Aguardando jogadores… (${l.members.length}/${l.min} para iniciar a contagem)</div>` : '');
    $('lbMembers').querySelectorAll('canvas').forEach(c => drawFace(c, +c.dataset.s));
    const cd = l.cd; $('lbCd').textContent = cd >= 0 ? `Partida começa em ${fmtTime(cd)}` : `${l.members.length}/${l.max} jogadores · mínimo ${l.min} para contagem automática`;
    const humans = l.members.length;
    if (isHost) { $('lbStart').disabled = false; $('lbStart').textContent = l.cfg.fill ? '▶ Iniciar agora (bots completam)' : '▶ Iniciar agora'; }
    /* configurações */
    const cfg = l.cfg;
    const ro = !isHost;
    $('lbCfg').innerHTML = `<h3>Sala</h3>
      <div class="field"><label>Modo</label><div class="seg" id="lbModeSeg">${Object.values(MODES).map(m => `<button data-v="${m.id}" class="${cfg.mode === m.id ? 'on' : ''}" ${ro ? 'disabled' : ''}>${m.name}</button>`).join('')}</div></div>
      ${cfg.mode === 'tatico' ? `<div class="field"><label>Formato</label><div class="seg" id="lbRoundsSeg">${[[12, '12 rodadas'], [6, 'Amistoso (6)']].map(([n, t]) => `<button data-v="${n}" class="${cfg.rounds === n ? 'on' : ''}" ${ro ? 'disabled' : ''}>${t}</button>`).join('')}</div></div>` : `<div class="field"><label>Participantes</label><div class="seg" id="lbTotSeg">${[16, 30, 50].map(n => `<button data-v="${n}" class="${(cfg.total || 30) === n ? 'on' : ''}" ${ro ? 'disabled' : ''}>${n}</button>`).join('')}</div></div>`}
      <label class="chk"><input type="checkbox" id="lbFill" ${cfg.fill ? 'checked' : ''} ${ro ? 'disabled' : ''}> Completar com bots</label>
      <div class="field"><label>Jogadores</label><div class="lbstat">👤 Humanos: <b>${humans}</b> · 🤖 Bots: <b>${cfg.fill ? Math.max(0, (cfg.mode === 'tatico' ? 10 : (cfg.total || 30)) - humans) : 0}</b>${cfg.mode === 'tatico' ? ` · Equipes: <b style="color:#7fb2ff">AZUL</b> x <b style="color:#ff8f80">VERMELHO</b> (sorteadas e equilibradas)` : ''}<br>Conexão: <b style="color:#7bff6a">${l.members.every(m => m.connected !== false) ? 'todos conectados' : 'alguém caiu'}</b></div></div>`;
    if (isHost) {
      const sg = $('lbModeSeg'); if (sg) sg.onclick = e => { const b = e.target.closest('button'); if (b) this.on.cfg && this.on.cfg({ mode: b.dataset.v }); };
      const rg = $('lbRoundsSeg'); if (rg) rg.onclick = e => { const b = e.target.closest('button'); if (b) this.on.cfg && this.on.cfg({ rounds: +b.dataset.v }); };
      const tg = $('lbTotSeg'); if (tg) tg.onclick = e => { const b = e.target.closest('button'); if (b) this.on.cfg && this.on.cfg({ total: +b.dataset.v }); };
      $('lbFill').onchange = e => this.on.cfg && this.on.cfg({ fill: e.target.checked });
    }
  },

  /* ---------- FIM DE PARTIDA ---------- */
  showEnd(r) {
    const e = $('endscr'); this.screen('endscr'); e.classList.remove('hidden');
    const rows = r.rows.map(p => `<tr style="${p.isMe ? 'background:#ffc61a22;' : ''}"><td>${esc(p.name)}</td><td>${p.k}</td><td>${p.d}</td><td>${p.score}</td></tr>`).join('');
    e.innerHTML = `<div class="modal"><h1 style="color:${r.win ? '#ffe27a' : '#ff8f80'}">${esc(r.title)}</h1><p>${esc(r.sub || '')}</p>
      <table class="keys" style="margin:10px 0"><tr><td style="color:#f3c13a">Jogador</td><td>Abates</td><td>Mortes</td><td>Pontos</td></tr>${rows}</table>
      <p>+${r.xp} XP ${r.levelUp ? '· <b style="color:#7ee06a">SUBIU PARA O NÍVEL ' + r.levelUp + '!</b>' : ''}</p>
      <div class="row" style="justify-content:center;margin-top:14px">${r.buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${esc(b.t)}</button>`).join('')}</div></div>`;
    e.querySelectorAll('[data-i]').forEach(b => b.onclick = () => r.buttons[+b.dataset.i].fn());
  }
};
