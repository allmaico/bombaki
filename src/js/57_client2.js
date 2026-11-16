/* =====================================================================
   57_client2.js — recursos do cliente: teclas remapeáveis, controle (USB/
   Bluetooth), touchscreen, loja (5x5), mochila (BR), mapa grande (M),
   notificações (CAPRICHOU NO CHAPÉU!), vaca voadora e paraquedas (visual).
   ===================================================================== */
'use strict';
/* ---------------- teclas ---------------- */
const BIND_DEFAULT = {
  fwd: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', sprint: 'ShiftLeft', crouch: 'ControlLeft', reload: 'KeyR', use: 'KeyE', nade: 'KeyG',
  drop: 'KeyQ', heal: 'KeyH', shop: 'KeyB', bag: 'KeyI', map: 'KeyM', zoom: 'KeyV', score: 'Tab', chat: 'Enter', talk: 'KeyT',
  s1: 'Digit1', s2: 'Digit2', s3: 'Digit3', s4: 'Digit4', s5: 'Digit5'
};
const BIND_LABEL = { fwd: 'Andar para frente', back: 'Andar para trás', left: 'Esquerda', right: 'Direita', jump: 'Pular / saltar da vaca', sprint: 'Correr', crouch: 'Agachar / deslizar / mergulhar', reload: 'Recarregar', use: 'Interagir (plantar, desarmar, pegar)', nade: 'Ovo de Galinha (granada)', drop: 'Soltar a mandioca', heal: 'Usar cura', shop: 'Loja (5x5)', bag: 'Mochila (Battle Royale)', map: 'Mapa grande', zoom: 'Zoom da luneta', score: 'Placar', chat: 'Chat de texto', talk: 'Falar (voz da equipe)', s1: 'Arma primária', s2: 'Estilingue', s3: 'Facão', s4: 'Ovo', s5: 'Mandioca' };
if (!settings.binds) settings.binds = {};
const bindOf = a => settings.binds[a] || BIND_DEFAULT[a];
const ALT_CODES = { sprint: ['ShiftRight'], crouch: ['ControlRight', 'KeyC'] };
function actOf(code) { for (const a in BIND_DEFAULT) if (bindOf(a) === code) return a; for (const a in ALT_CODES) if (!settings.binds[a] && ALT_CODES[a].includes(code)) return a; return ''; }
const kd = a => { const K = Input.keys; if (K.has(bindOf(a))) return true; if (!settings.binds[a] && ALT_CODES[a]) for (const c of ALT_CODES[a]) if (K.has(c)) return true; return false; };
const keyName = c => (c || '').replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'Shift').replace('ShiftRight', 'Shift dir.').replace('ControlLeft', 'Ctrl').replace('ControlRight', 'Ctrl dir.').replace('Space', 'Espaço').replace('Enter', 'Enter').replace('Arrow', '↑');

/* entrada virtual (touch/controle) somada ao teclado */
const sqCol = team => SQ_COL[sqOfTeam(team, G.swap | 0)];
const sqName = team => SQ_NAME[sqOfTeam(team, G.swap | 0)];

/* ---------------- notificações grandes ---------------- */
const HAT_SVG = `<svg viewBox="0 0 120 70" style="width:12em;height:7em;display:block;margin:0 auto -.4em"><ellipse cx="60" cy="54" rx="56" ry="11" fill="#e8c46a" stroke="#5a3a10" stroke-width="4"/><path d="M28 52C30 22 40 10 60 10s30 12 32 42z" fill="#f2d27a" stroke="#5a3a10" stroke-width="4"/><path d="M30 44h60" stroke="#c0392b" stroke-width="7"/><circle cx="74" cy="26" r="7" fill="#2a1a0a" stroke="#fff" stroke-width="2"/><path d="M80 18l14-12M84 26l18-4M76 34l12 10" stroke="#ffd23a" stroke-width="3" stroke-linecap="round"/></svg>`;
const Notif = {
  show(title, sub, opt) {
    opt = opt || {}; let el = $('notif'); if (!el) { el = document.createElement('div'); el.id = 'notif'; $('hud').appendChild(el); }
    el.innerHTML = (opt.hat ? HAT_SVG : '') + `<b style="color:${opt.col || '#ffe27a'}">${esc(title)}</b>` + (sub ? `<small>${esc(sub)}</small>` : '');
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(this._t); this._t = setTimeout(() => el.classList.remove('show'), (opt.dur || 1.6) * 1000);
  }
};

/* ---------------- loja (Roçado Tático) ---------------- */
const Shop = {
  open: false,
  canOpen() { return G.scene === 'play' && isTat() && G.me && G.me.alive && G.phase === 'prep'; },
  toggle(force) {
    const on = force === undefined ? !this.open : force; if (on && !this.canOpen()) { if (isTat()) hud_toast('A loja só abre na fase de compra (início da rodada).'); return; }
    this.open = on; let el = $('shop'); if (!el) { el = document.createElement('div'); el.id = 'shop'; el.className = 'panel'; $('hud').appendChild(el); el.onclick = e => this.click(e); }
    el.classList.toggle('hidden', !on); Input.menu = on || Bag.open || BigMap.open; if (on) { try { document.exitPointerLock(); } catch (e) { } this.render(true); } else if (G.scene === 'play' && !Input.menu) lockPointer();
  },
  owned(me, id) { if (WEAPONS[id] && SHOP.find(s => s.id === id && s.kind === 'w')) return me.own[id] !== undefined; if (id === 'colete') return me.vest > 0; if (id === 'batata') return me.nades; if (id === 'pano') return me.pano; if (id === 'caixa') return me.caixa; return 0; },
  render(full) {
    const el = $('shop'), me = G.me; if (!el || !me) return; const money = me.money | 0;
    const key = money + '|' + Math.ceil(G.pt) + '|' + Object.keys(me.own).join() + me.vest + me.nades + (me.pano | 0) + (me.caixa | 0);
    if (!full && key === this.key) return; this.key = key;
    const cats = [...new Set(SHOP.map(s => s.cat))];
    el.innerHTML = `<div class="sh-h"><b class="fnt">🛒 Loja do Roçado</b><span class="money">$ ${money.toLocaleString('pt-BR')}</span><span class="tm">Compra fecha em ${Math.max(0, Math.ceil(G.pt))}s</span><button class="btn s" data-x="1">Fechar (B)</button></div>` +
      cats.map(c => `<div class="sh-cat"><h4>${c}</h4><div class="sh-row">${SHOP.filter(s => s.cat === c).map(s => {
        const price = shopPrice(s.id), have = this.owned(me, s.id), eq = me.w === s.id, can = money >= price;
        return `<div class="sh-it${have ? ' own' : ''}${eq ? ' eq' : ''}"><canvas width="132" height="80" data-ic="${s.id}"></canvas><b>${esc(shopName(s.id))}</b><span class="pr">${price ? '$ ' + price : 'Grátis'}</span><small>${esc(s.desc)}</small>
          <div class="row"><button class="btn s ${can ? 'y' : ''}" data-b="${s.id}" ${!can && price ? 'disabled' : ''}>${have && s.kind === 'w' ? 'Munição' : 'Comprar'}</button>${have && s.id !== 'estilingue' ? `<button class="btn s r" data-s="${s.id}">Vender</button>` : ''}${have && s.kind === 'w' ? `<span class="eqt">${eq ? 'Equipada' : 'Sua'}</span>` : ''}</div></div>`;
      }).join('')}</div></div>`).join('') + `<p class="sh-f">Recompensas: abate +$${ECON.kill} · vitória +$${ECON.win} · derrota +$${ECON.loss} · plantar/desarmar +$${ECON.plant}. Vender devolve ${Math.round(ECON.sellBack * 100)}% (100% se comprado nesta rodada).</p>`;
    el.querySelectorAll('canvas[data-ic]').forEach(c => { const id = c.dataset.ic; if (WEAPONS[id]) drawWeaponIcon(c, id); else drawItemIcon(c, id); });
  },
  click(e) { const b = e.target.closest('button'); if (!b) return; if (b.dataset.x) return this.toggle(false); if (b.dataset.b) { Input.acts.push('buy:' + b.dataset.b); sfx.ui(1); } if (b.dataset.s) { Input.acts.push('sell:' + b.dataset.s); sfx.ui(0); } setTimeout(() => this.render(true), 120); }
};
function drawItemIcon(cv, id) {
  const c = cv.getContext('2d'), w = cv.width, h = cv.height; c.clearRect(0, 0, w, h); c.font = `${h * .62}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(id === 'colete' ? '🦺' : id === 'pano' ? '🧻' : id === 'caixa' ? '🧰' : HEALS[id] ? HEALS[id].icon : '📦', w / 2, h / 2 + 2);
}

/* ---------------- mochila (Battle Royale) ---------------- */
const Bag = {
  open: false,
  toggle(force) {
    const on = force === undefined ? !this.open : force; if (on && (G.scene !== 'play' || isTat() || !G.me || !G.me.alive)) return;
    this.open = on; let el = $('bag'); if (!el) { el = document.createElement('div'); el.id = 'bag'; el.className = 'panel'; $('hud').appendChild(el); el.onclick = e => this.click(e); }
    el.classList.toggle('hidden', !on); Input.menu = on || Shop.open || BigMap.open; if (on) { try { document.exitPointerLock(); } catch (e) { } this.sel = this.sel || (G.me && G.me.sel) || ''; this.render(true); } else if (G.scene === 'play' && !Input.menu) lockPointer();
  },
  render(full) {
    const el = $('bag'), me = G.me; if (!el || !me) return; const inv = me.inv || {}, cnt = Object.values(inv).reduce((a, b) => a + b, 0), cap = 8 + 4 * (me.pack | 0);
    const key = JSON.stringify(inv) + me.sel + this.sel + Object.keys(me.own).join() + JSON.stringify(me.ammo) + (me.heal ? 1 : 0); if (!full && key === this.key) return; this.key = key;
    const sel = this.sel && inv[this.sel] ? this.sel : '';
    el.innerHTML = `<div class="sh-h"><b class="fnt">🎒 Mochila</b><span class="cap">${cnt} / ${cap} itens · ${PACKS[me.pack | 0].name}</span><button class="btn s" data-x="1">Fechar (I)</button></div>
      <h4>Cura — escolha e confirme</h4><div class="bag-g">${HEAL_IDS.map(id => { const n = inv[id] | 0, H = HEALS[id]; return `<div class="bag-it${n ? '' : ' none'}${sel === id ? ' sel' : ''}${me.sel === id ? ' hk' : ''}" data-i="${id}"><span class="ic">${H.icon}</span><b>${H.name}</b><small>+${H.amt} HP · ${String(H.time).replace('.', ',')} s</small><span class="n">x${n}</span></div>`; }).join('')}</div>
      <div class="bag-act">${sel ? `<b>${HEALS[sel].name}</b> <button class="btn s g" data-u="${sel}">Usar agora</button><button class="btn s" data-h="${sel}">Atalho H</button><button class="btn s r" data-d="${sel}">Descartar</button>` : '<span style="opacity:.7">Toque num item para selecionar. A cura nunca é usada sozinha.</span>'}</div>
      <h4>Armas</h4><div class="bag-w">${Object.keys(me.own).filter(i => i !== 'mandioca').map(id => `<div class="bag-wi${me.w === id ? ' sel' : ''}"><canvas width="132" height="80" data-ic="${id}"></canvas><b>${esc(WEAPONS[id].name)}</b>${WEAPONS[id].ammo ? `<small>${me.mag[id] | 0} / ${me.ammo[WEAPONS[id].ammo] | 0}</small>` : ''}<div class="row"><button class="btn s" data-e="${id}">Equipar</button>${id !== 'faca' ? `<button class="btn s r" data-dw="${id}">Largar</button>` : ''}</div></div>`).join('')}</div>
      <h4>Munição</h4><div class="bag-am">${Object.keys(AMMO_TYPES).map(t => `<span>${AMMO_TYPES[t].name}: <b>${me.ammo[t] | 0}</b></span>`).join('')}<span>Ovos: <b>${me.nades | 0}</b></span><span>Colete: <b>${Math.round(me.armor)}</b></span></div>`;
    el.querySelectorAll('canvas[data-ic]').forEach(c => drawWeaponIcon(c, c.dataset.ic));
  },
  click(e) {
    const it = e.target.closest('[data-i]'); if (it && !e.target.closest('button')) { this.sel = it.dataset.i; Input.acts.push('sel:' + this.sel); sfx.ui(0); return this.render(true); }
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.x) return this.toggle(false);
    if (d.u) { Input.acts.push('use:' + d.u); sfx.ui(1); this.toggle(false); return; }
    if (d.h) { Input.acts.push('sel:' + d.h); hud_toast('Atalho H: ' + HEALS[d.h].name); }
    if (d.d) Input.acts.push('drop:' + d.d); if (d.e) Input.acts.push('w:' + d.e); if (d.dw) Input.acts.push('drop:' + d.dw);
    sfx.ui(0); setTimeout(() => this.render(true), 150);
  }
};

/* ---------------- mapa grande (M) ---------------- */
const BigMap = {
  open: false,
  toggle(force) {
    const on = force === undefined ? !this.open : force; if (on && G.scene !== 'play') return; this.open = on;
    let el = $('bigmap'); if (!el) { el = document.createElement('div'); el.id = 'bigmap'; el.innerHTML = '<canvas></canvas><div class="bm-l"></div>'; $('hud').appendChild(el); }
    el.classList.toggle('hidden', !on);
  },
  draw(V, now) {
    if (!this.open) return; const el = $('bigmap'), cv = el.querySelector('canvas'), hud = G.hud, img = hud.mmStatic, B = hud.mmB; if (!img) return;
    const sz = Math.min(innerWidth, innerHeight) * .86 | 0; if (cv.width !== sz) { cv.width = cv.height = sz; cv.style.width = cv.style.height = sz + 'px'; }
    const c = cv.getContext('2d'), sx = sz / (B.x1 - B.x0), sz2 = sz / (B.z1 - B.z0), X = x => (x - B.x0) * sx, Z = z => (z - B.z0) * sz2;
    c.drawImage(img, 0, 0, sz, sz); c.lineWidth = 2;
    if (V.zone) { const z = V.zone; c.strokeStyle = '#7fd0ff'; c.lineWidth = 3; c.beginPath(); c.arc(X(z[0]), Z(z[1]), z[2] * sx, 0, 6.3); c.stroke(); c.fillStyle = '#6a4a2a55'; c.beginPath(); c.rect(0, 0, sz, sz); c.arc(X(z[0]), Z(z[1]), z[2] * sx, 0, 6.3, true); c.fill('evenodd'); c.setLineDash([8, 6]); c.strokeStyle = '#fff'; c.beginPath(); c.arc(X(z[3]), Z(z[4]), z[5] * sx, 0, 6.3); c.stroke(); c.setLineDash([]); }
    if (G.cowS) { const w = G.cowS; c.strokeStyle = '#ffffffaa'; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(X(w[8]), Z(w[9])); c.lineTo(X(w[6]), Z(w[7])); c.stroke(); c.setLineDash([]); c.font = `${sz / 26}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🐄', X(w[0]), Z(w[1])); }
    if (V.mode === 'tatico') for (const id in hud.mmSites) { const s = hud.mmSites[id]; c.strokeStyle = '#ffc61a'; c.strokeRect(X(s.x0), Z(s.z0), (s.x1 - s.x0) * sx, (s.z1 - s.z0) * sz2); c.fillStyle = '#fff'; c.font = `900 ${sz / 30}px Lilita One, Impact`; c.textAlign = 'center'; c.fillText(id, X(s.x), Z(s.z) + 8); }
    if (V.mode === 'tatico' && G.map.tacB) { const T = G.map.tacB; c.strokeStyle = '#ffffff66'; c.setLineDash([10, 8]); c.strokeRect(X(T.x0), Z(T.z0), (T.x1 - T.x0) * sx, (T.z1 - T.z0) * sz2); c.setLineDash([]); }
    const b = V.bomb; if (b && (b.st === 'planted' || b.st === 'dropped') && V.mode === 'tatico') { c.fillStyle = b.st === 'planted' ? '#ff3a2a' : '#ffc61a'; c.beginPath(); c.arc(X(b.x), Z(b.z), 6, 0, 6.3); c.fill(); }
    for (const p of V.roster) {
      if (!p.alive || p.isMe) continue; const ally = V.mode === 'tatico' && p.team === V.myTeam; let vis = ally; if (!ally) { const t = hud.lastShot.get(p.id); if (t && now * 1000 - t < 3000) vis = true; }
      if (!vis) continue; c.fillStyle = ally ? '#5da0ff' : '#ff4a3a'; c.beginPath(); c.arc(X(p.x), Z(p.z), 5, 0, 6.3); c.fill(); c.strokeStyle = '#000'; c.stroke();
    }
    c.save(); c.translate(X(V.px), Z(V.pz)); c.rotate(-V.yaw); c.fillStyle = '#ffe27a'; c.strokeStyle = '#000'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 8); c.lineTo(0, 4); c.lineTo(-8, 8); c.closePath(); c.fill(); c.stroke(); c.restore();
    el.querySelector('.bm-l').textContent = V.mode === 'tatico' ? `Rodada ${V.round}/${V.maxRounds} · AZUL ${G.score[0] | 0} x ${G.score[1] | 0} VERMELHO` : `Vivos: ${V.aliveN} · Fase da zona ${(V.zone ? V.zone[7] : 0) + 1} · Inimigos aparecem por ~3 s ao atirar`;
  }
};

/* ---------------- controle (Gamepad API: USB e Bluetooth) ---------------- */
const Pad = {
  idx: -1, prev: [], fireHold: false,
  init() {
    addEventListener('gamepadconnected', e => { this.idx = e.gamepad.index; Input.device = 'pad'; UI.toast('🎮 Controle conectado: ' + (e.gamepad.id || '').slice(0, 40)); });
    addEventListener('gamepaddisconnected', () => { this.idx = -1; Input.device = IS_TOUCH ? 'touch' : 'kbm'; Input.v.mvf = Input.v.mvr = 0; UI.toast('Controle desconectado'); });
  },
  poll(dt) {
    if (this.idx < 0 || !navigator.getGamepads) return; const gp = navigator.getGamepads()[this.idx]; if (!gp) return;
    const ax = i => { const v = gp.axes[i] || 0; return Math.abs(v) < .16 ? 0 : (v - Math.sign(v) * .16) / .84; }, bt = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5)), edge = i => bt(i) && !this.prev[i];
    let any = false; for (let i = 0; i < gp.buttons.length; i++) if (bt(i)) any = true; if (any || Math.abs(ax(0)) + Math.abs(ax(1)) + Math.abs(ax(2)) + Math.abs(ax(3)) > 0) Input.device = 'pad';
    if (Input.device !== 'pad') { this.prev = gp.buttons.map((b, i) => bt(i)); return; }
    const v = Input.v; v.mvr = ax(0); v.mvf = -ax(1); const s = (settings.padSens || 1) * 900 * dt; Input.dx += Math.sign(ax(2)) * ax(2) * ax(2) * s * 2.2; Input.dy += Math.sign(ax(3)) * ax(3) * ax(3) * s * 1.6;
    v.fire = bt(7); v.ads = bt(6); v.jump = bt(0); v.crouch = bt(1); v.use = bt(5) || bt(3) && false; v.sprint = bt(10) || (v.sprint && v.mvf > .5);
    if (edge(2)) Input.acts.push('r'); if (edge(3)) Input.acts.push('s1'); if (edge(4)) Input.acts.push('g'); if (edge(12)) Input.acts.push('h'); if (edge(15)) Input.acts.push('s2'); if (edge(14)) Input.acts.push('s3');
    if (edge(13)) { if (isTat()) Shop.toggle(); else Bag.toggle(); } if (edge(11)) Input.acts.push(G.me && G.me.hasBomb ? 'q' : 'lw');
    Input.tabPad = bt(8); if (edge(9)) { if (G.scene === 'play') showPause(!G.paused && $('pause').classList.contains('hidden')); }
    if (G.spec && edge(15)) cycleSpec(1);
    this.prev = gp.buttons.map((b, i) => bt(i));
  }
};

/* ---------------- touchscreen ---------------- */
const TOUCH_BTNS = [
  { id: 'fire', t: '🔥', x: 89, y: 60, s: 1.35 }, { id: 'fire2', t: '🔥', x: 9, y: 42, s: .9 }, { id: 'ads', t: '🎯', x: 80, y: 46 }, { id: 'jump', t: '⤒', x: 94, y: 82 }, { id: 'crouch', t: '⤓', x: 85, y: 86 },
  { id: 'sprint', t: '🏃', x: 9, y: 26 }, { id: 'reload', t: '⟳', x: 76, y: 84 }, { id: 'use', t: 'E', x: 71, y: 64 }, { id: 'swap', t: '⇄', x: 94, y: 38 }, { id: 'nade', t: '🥚', x: 86, y: 30 },
  { id: 'bag', t: '🎒', x: 70, y: 24 }, { id: 'heal', t: '➕', x: 62, y: 24 }, { id: 'map', t: '🗺', x: 30, y: 24 }, { id: 'score', t: '☰', x: 38, y: 24 }
];
const Touch = {
  on: false, edit: false, stick: null, look: null,
  init() {
    if (!IS_TOUCH) return; this.on = true; document.body.classList.add('touch'); const L = settings.touchLayout || {};
    const el = document.createElement('div'); el.id = 'touch'; el.innerHTML = `<div class="tz-l"></div><div class="tz-r"></div><div class="joy"><i></i></div>` + TOUCH_BTNS.map(b => { const p = L[b.id] || b; return `<div class="tb" data-b="${b.id}" style="left:${p.x}%;top:${p.y}%;--s:${(p.s || b.s || 1) * (settings.touchSize || 1)}">${b.t}</div>`; }).join('') + `<div class="tb ed hidden" data-b="done" style="left:50%;top:45%">✔ Salvar layout</div>`;
    $('hud').appendChild(el); this.el = el; el.style.opacity = settings.touchAlpha === undefined ? .8 : settings.touchAlpha;
    el.addEventListener('touchstart', e => this.ts(e), { passive: false }); el.addEventListener('touchmove', e => this.tm(e), { passive: false }); el.addEventListener('touchend', e => this.te(e), { passive: false }); el.addEventListener('touchcancel', e => this.te(e), { passive: false });
    Input.force = true;
  },
  apply() { if (!this.el) return; this.el.style.opacity = settings.touchAlpha === undefined ? .8 : settings.touchAlpha; const L = settings.touchLayout || {}; this.el.querySelectorAll('.tb[data-b]').forEach(b => { const d = TOUCH_BTNS.find(x => x.id === b.dataset.b); if (!d) return; const p = L[d.id] || d; b.style.setProperty('--s', (p.s || d.s || 1) * (settings.touchSize || 1)); b.style.left = p.x + '%'; b.style.top = p.y + '%'; }); },
  setEdit(on) { this.edit = on; if (!this.el) return; this.el.classList.toggle('editing', on); this.el.querySelector('[data-b=done]').classList.toggle('hidden', !on); if (on) UI.toast('Arraste os botões para reposicionar e toque em Salvar.'); },
  ts(e) {
    e.preventDefault(); const W = innerWidth, H = innerHeight;
    for (const t of e.changedTouches) {
      const tb = t.target.closest && t.target.closest('.tb');
      if (tb) { const b = tb.dataset.b; if (b === 'done') { this.setEdit(false); saveSettings(); continue; } if (this.edit) { this.drag = { id: t.identifier, el: tb, b }; continue; } tb.classList.add('dn'); this.press(b, true, t.identifier, tb); continue; }
      if (t.clientX < W * .42 && !this.stick) { this.stick = { id: t.identifier, x: t.clientX, y: t.clientY }; const j = this.el.querySelector('.joy'); j.style.left = t.clientX + 'px'; j.style.top = t.clientY + 'px'; j.classList.add('on'); }
      else if (!this.look) this.look = { id: t.identifier, x: t.clientX, y: t.clientY };
    }
  },
  tm(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.drag && t.identifier === this.drag.id) { const x = t.clientX / innerWidth * 100, y = t.clientY / innerHeight * 100; this.drag.el.style.left = x + '%'; this.drag.el.style.top = y + '%'; const L = settings.touchLayout || (settings.touchLayout = {}); const d = TOUCH_BTNS.find(q => q.id === this.drag.b); L[this.drag.b] = { x, y, s: (L[this.drag.b] && L[this.drag.b].s) || d.s || 1 }; continue; }
      if (this.stick && t.identifier === this.stick.id) { const R = 60, dx = clamp(t.clientX - this.stick.x, -R, R), dy = clamp(t.clientY - this.stick.y, -R, R); Input.v.mvr = dx / R; Input.v.mvf = -dy / R; Input.v.sprint = Input.v.mvf > .92 || Input.v.sprintLock; const k = this.el.querySelector('.joy i'); k.style.transform = `translate(${dx}px,${dy}px)`; }
      else if (this.look && t.identifier === this.look.id) { const s = 1.6 * (settings.touchSens || 1); Input.dx += (t.clientX - this.look.x) * s; Input.dy += (t.clientY - this.look.y) * s; this.look.x = t.clientX; this.look.y = t.clientY; }
      else if (this.held && this.held[t.identifier] && this.held[t.identifier].b.startsWith('fire')) { const h = this.held[t.identifier], s = 1.3 * (settings.touchSens || 1); Input.dx += (t.clientX - h.x) * s; Input.dy += (t.clientY - h.y) * s; h.x = t.clientX; h.y = t.clientY; }
    }
  },
  te(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.drag && t.identifier === this.drag.id) { this.drag = null; continue; }
      if (this.stick && t.identifier === this.stick.id) { this.stick = null; Input.v.mvf = Input.v.mvr = 0; Input.v.sprint = !!Input.v.sprintLock; this.el.querySelector('.joy').classList.remove('on'); this.el.querySelector('.joy i').style.transform = ''; }
      if (this.look && t.identifier === this.look.id) this.look = null;
      if (this.held && this.held[t.identifier]) { const h = this.held[t.identifier]; h.el.classList.remove('dn'); this.press(h.b, false); delete this.held[t.identifier]; }
    }
  },
  press(b, down, tid, el) {
    if (down && tid !== undefined) { (this.held || (this.held = {}))[tid] = { b, el, x: 0, y: 0 }; const t = [...event.changedTouches].find(q => q.identifier === tid); if (t) { this.held[tid].x = t.clientX; this.held[tid].y = t.clientY; } }
    const v = Input.v;
    switch (b) {
      case 'fire': case 'fire2': v.fire = down; break; case 'ads': if (down) v.ads = !v.ads; break; case 'jump': v.jump = down; break; case 'crouch': v.crouch = down; break;
      case 'sprint': if (down) { v.sprintLock = !v.sprintLock; v.sprint = v.sprintLock; } break; case 'use': v.use = down; break;
      case 'reload': if (down) Input.acts.push('r'); break; case 'swap': if (down) Input.acts.push('w+'); break; case 'nade': if (down) Input.acts.push('g'); break;
      case 'bag': if (down) { if (isTat()) Shop.toggle(); else Bag.toggle(); } break; case 'heal': if (down) Input.acts.push(G.me && G.me.hasBomb ? 'q' : 'h'); break;
      case 'map': if (down) BigMap.toggle(); break; case 'score': Input.tab = down; break;
    }
  }
};

/* ---------------- visual: vaca voadora e paraquedas ---------------- */
function drawFlyingCow(m, x, y, z, yaw, t) {
  m.push().tr(x, y + Math.sin(t * 1.3) * .6, z).ry(yaw).rz(Math.sin(t * .7) * .04).sc(6);
  drawCow(m, { x: 0, y: 0, z: 0, rot: 0, ph: 0 }, t);
  const fl = Math.sin(t * 6) * .5;
  for (const s of [-1, 1]) { m.push().tr(s * .42, 1.25, -.1).rz(s * (.25 + fl)); m.mat(TX.white, 0).col(0xfaf6ee).uvs(1, 1).box(1.6, .05, .7, s * .8, 0, 0); m.mat(TX.white, 0).col(0xe8e2d4).box(.5, .06, .5, s * 1.45, -.02, .15); m.pop(); }
  m.mat(TX.plank2, 0).col(0xc8a070).uvs(1, 1).box(.9, .04, 1.65, 0, 1.45, 0); m.mat(TX.cloth, 0).col(0xc03a2a).box(.92, .06, .06, 0, 1.49, -.8).box(.92, .06, .06, 0, 1.49, .8);
  m.pop();
}
function drawChute(m, e, t) {
  const st = PARACHUTES[hashStr(e.id) % PARACHUTES.length], y = e.y + 3.4, open = e.chOpen;
  if (!open) return; m.push().tr(e.x, y, e.z).ry(e.yaw).rz(Math.sin(t * 1.7 + e.x) * .08).rx(Math.sin(t * 1.3) * .06);
  if (st.umbrella) { m.mat(TX.cloth, 0).col(st.col).uvs(1, 1).cyl(1.7, .05, .9, 8, 0, 0, 0, 1); m.mat(TX.cloth, 0).col(st.col2).cyl(.08, .08, 2.8, 4, 0, -2.4, 0, 0); m.mat(TX.wood, 0).col(0x6a4a2a).box(.08, .3, .3, 0, -2.5, .12); }
  else {
    m.mat(TX.cloth, 0).col(st.col).uvs(.5, .5).sph(2.3, .7, 1.7, 9, 4, 0, 0, 0); m.mat(TX.cloth, 0).col(st.col2).box(4.4, .05, .25, 0, .1, 0).box(.25, .05, 3.3, 0, .12, 0);
    m.mat(TX.white, 0).col(0xeeeeee); for (const [a, b] of [[-1.9, -1.2], [1.9, -1.2], [-1.9, 1.2], [1.9, 1.2]]) { m.push().tr(a * .5, -1.6, b * .5).rz(-a * .22).rx(b * .25); m.box(.03, 3.0, .03); m.pop(); }
  }
  m.pop();
}
function hashStr(s) { let h = 7; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
/* cachoeiras: névoa e respingos (cliente) */
function fallFx(dt) {
  const falls = G.map.falls; if (!falls || !falls.length) return; G.fallT = (G.fallT || 0) - dt; if (G.fallT > 0) return; G.fallT = .08;
  for (const f of falls) { const d = Math.hypot(G.cam.x - f.x, G.cam.z - f.z); if (d > 90) continue; for (let i = 0; i < 3; i++) G.fx.P({ x: f.x + rnd(-f.w / 2, f.w / 2) * Math.cos(f.yaw), y: G.map.W.waterY + .3, z: f.z - rnd(-f.w / 2, f.w / 2) * Math.sin(f.yaw), vx: rnd(-1, 1), vy: rnd(1, 3), vz: rnd(-1, 1), life: rnd(.8, 1.6), s0: rnd(.6, 1.2), s1: rnd(1.6, 2.8), r: .92, g: .97, b: 1, a0: .3, add: false, ty: 4, drag: 1.5, grav: .4 }); }
  if (Math.hypot(G.cam.x - falls[0].x, G.cam.z - falls[0].z) < 60 && sfx.water) sfx.water(falls[0]);
}

/* ---------------- remapeamento de teclas ---------------- */
const Rebind = {
  wait: '',
  start(a, btn) { this.wait = a; this.btn = btn; btn.textContent = 'Aperte uma tecla…'; btn.classList.add('y'); },
  init() {
    addEventListener('keydown', e => {
      if (!this.wait) return; e.preventDefault(); e.stopPropagation();
      if (e.code !== 'Escape') { for (const a in BIND_DEFAULT) if (a !== this.wait && bindOf(a) === e.code) settings.binds[a] = bindOf(this.wait); settings.binds[this.wait] = e.code; saveSettings(); }
      const b = this.btn; this.wait = ''; if (b) { b.classList.remove('y'); const t = b.closest('table'); if (t) t.querySelectorAll('[data-rb]').forEach(x => x.textContent = keyName(bindOf(x.dataset.rb))); }
    }, true);
  },
  table() { return `<table class="keys">${Object.keys(BIND_DEFAULT).map(a => `<tr><td>${BIND_LABEL[a]}</td><td><button class="btn s" data-rb="${a}">${esc(keyName(bindOf(a)))}</button></td></tr>`).join('')}<tr><td>Mouse</td><td>Mirar · botão esquerdo atira · direito mira (ADS)</td></tr></table><button class="btn s" data-rbreset="1" style="margin-top:8px">Restaurar teclas padrão</button>`; }
};
Rebind.init();

/* ---------------- voz da equipe (somente Roçado Tático, só aliados) ---------------- */
const Voice = {
  peer: null, stream: null, calls: new Map(), audios: new Map(), on: false, talking: false, team: 0,
  supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof RTCPeerConnection !== 'undefined'; },
  idFor(pid) { return PEER_PREFIX + 'voz-' + G.code + '-' + pid; },
  async start() {
    if (this.on || settings.voice === 'off' || !settings.voice || G.transport !== 'peer' || !isTat() || G.kind === 'offline' || !this.supported()) return;
    this.on = true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      this.setTalk(settings.voice === 'open'); await loadPeerJS();
      this.peer = new Peer(this.idFor(G.myId), { debug: 0, config: ICE });
      this.peer.on('call', call => { const pid = call.peer.split('-').pop(); if (!this.isMate(pid)) { try { call.close(); } catch (e) { } return; } call.answer(this.stream); this.bind(pid, call); });
      this.peer.on('open', () => this.sync()); this.peer.on('error', () => { });
      this.timer = setInterval(() => this.sync(), 3000); UI.toast('🎙 Voz da equipe ligada (' + (settings.voice === 'open' ? 'microfone aberto' : 'segure ' + keyName(bindOf('talk')) + ' para falar') + ')');
    } catch (e) { this.on = false; UI.toast('Microfone indisponível: ' + (e && e.message || e)); }
  },
  isMate(pid) { const me = G.me, e = G.ents.get(pid); return !!(me && e && e.team && e.team === me.team && pid !== G.myId && !(G.rinfo.get(pid) || {}).bot); },
  sync() {
    if (!this.peer || !this.peer.open) return; const me = G.me; if (!me) return;
    /* espectador não passa informação: morto não transmite para quem está vivo */
    if (!me.alive && this.talking) this.setTalk(false); else if (me.alive && settings.voice === 'open' && !this.talking) this.setTalk(true);
    if (this.team !== me.team) { for (const c of this.calls.values()) try { c.close(); } catch (e) { } this.calls.clear(); this.team = me.team; }
    for (const [pid, c] of this.calls) if (!this.isMate(pid)) { try { c.close(); } catch (e) { } this.calls.delete(pid); }
    for (const pid of G.ents.keys()) if (this.isMate(pid) && !this.calls.has(pid) && G.myId < pid) { const call = this.peer.call(this.idFor(pid), this.stream); if (call) this.bind(pid, call); }
  },
  bind(pid, call) {
    this.calls.set(pid, call);
    call.on('stream', s => { let a = this.audios.get(pid); if (!a) { a = new Audio(); a.autoplay = true; this.audios.set(pid, a); } a.srcObject = s; a.volume = this.vol(pid); a.muted = this.isMuted(pid); a.play && a.play().catch(() => { }); });
    call.on('close', () => { this.calls.delete(pid); const a = this.audios.get(pid); if (a) { a.srcObject = null; this.audios.delete(pid); } });
  },
  vol(pid) { const v = (settings.voiceVol || {})[pid]; return v === undefined ? 1 : v; },
  isMuted(pid) { return !!(profile.blocked || []).includes((G.rinfo.get(pid) || {}).name); },
  setVol(pid, v) { (settings.voiceVol || (settings.voiceVol = {}))[pid] = v; const a = this.audios.get(pid); if (a) a.volume = v; },
  setTalk(on) { this.talking = on; if (this.stream) for (const t of this.stream.getAudioTracks()) t.enabled = on; },
  ptt(down) { if (!this.on || settings.voice !== 'ptt') return; this.setTalk(down && !!(G.me && G.me.alive)); },
  stop() { clearInterval(this.timer); for (const c of this.calls.values()) try { c.close(); } catch (e) { } this.calls.clear(); for (const a of this.audios.values()) a.srcObject = null; this.audios.clear(); if (this.peer) try { this.peer.destroy(); } catch (e) { } this.peer = null; if (this.stream) for (const t of this.stream.getTracks()) t.stop(); this.stream = null; this.on = false; this.team = 0; }
};
