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
  ab1: 'KeyZ', ab2: 'KeyX', ab3: 'KeyC', ult: 'KeyF', emote: 'KeyY',
  s1: 'Digit1', s2: 'Digit2', s3: 'Digit3', s4: 'Digit4', s5: 'Digit5'
};
const BIND_LABEL = { emote: 'Emotes (roda: Y e depois 1/2/3)', ab1: 'Habilidade 1 (5x5)', ab2: 'Habilidade 2 (5x5)', ab3: 'Assinatura (5x5)', ult: 'Suprema (5x5)', fwd: 'Andar para frente', back: 'Andar para trás', left: 'Esquerda', right: 'Direita', jump: 'Pular / saltar da vaca', sprint: 'Correr', crouch: 'Agachar / deslizar / mergulhar', reload: 'Recarregar', use: 'Interagir (plantar, desarmar, pegar)', nade: 'Ovo de Galinha (granada)', drop: 'Largar a arma / a mandioca', heal: 'Usar cura', shop: 'Loja (5x5)', bag: 'Mochila (Battle Royale)', map: 'Mapa grande', zoom: 'Zoom da luneta', score: 'Placar', chat: 'Chat de texto', talk: 'Falar (voz da equipe)', s1: 'Arma primária', s2: 'Estilingue', s3: 'Facão', s4: 'Ovo', s5: 'Mandioca' };
if (!settings.binds) settings.binds = {};
const bindOf = a => settings.binds[a] || BIND_DEFAULT[a];
const ALT_CODES = { sprint: ['ShiftRight'], crouch: ['ControlRight'] };
function actOf(code) { for (const a in BIND_DEFAULT) if (bindOf(a) === code) return a; for (const a in ALT_CODES) if (!settings.binds[a] && ALT_CODES[a].includes(code)) return a; return ''; }
const kd = a => { const K = Input.keys; if (K.has(bindOf(a))) return true; if (!settings.binds[a] && ALT_CODES[a]) for (const c of ALT_CODES[a]) if (K.has(c)) return true; return false; };
const TOUCH_KEYNAME = { Space: '⤒', KeyE: 'E', KeyB: '🎒', KeyI: '🎒', KeyM: '🗺', KeyH: '➕', KeyG: '🥚', KeyR: '⟳', Tab: '☰', KeyQ: 'E', ShiftLeft: '🏃', ControlLeft: '⤓' };
const keyName = c => (IS_TOUCH && TOUCH_KEYNAME[c]) ? TOUCH_KEYNAME[c] : (c || '').replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'Shift').replace('ShiftRight', 'Shift dir.').replace('ControlLeft', 'Ctrl').replace('ControlRight', 'Ctrl dir.').replace('Space', 'Espaço').replace('Enter', 'Enter').replace('Arrow', '↑');

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

/* ---------------- loja (Roçado Tático) — cartões com imagens dos modelos 3D ---------------- */
const SHOP_CATS = ['Habilidades', 'Estilingues', 'Pistolas', 'Metralhadoras', 'Fuzis', 'Precisão', 'Equipamentos', 'Cura'];
const CART_SVG = '<svg viewBox="0 0 24 24" width="1.25em" height="1.25em"><path d="M3 4h2.2l2.3 11h10.4l2-8H7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="9.5" cy="19" r="1.7" fill="currentColor"/><circle cx="16.5" cy="19" r="1.7" fill="currentColor"/></svg>';
/* barras de atributos e ficha técnica a partir dos dados reais (sem alterar o balanceamento) */
function itemStats(id) {
  const W = WEAPONS[id], c01 = v => clamp(v, 0, 1);
  if (W && W.ammo) return { bars: [['Dano', c01(W.dmg * (W.pellets || 1) / 120)], ['Cadência', c01(1 / W.cd / 15)], ['Alcance', c01(W.range1 / 220)], ['Precisão', c01(1 - W.spread / 3.6)], ['Mobilidade', c01((W.speed - .85) / .2)]],
    facts: [['Dano', W.pellets ? `${W.pellets} × ${W.dmg}` : `${W.dmg}`], ['Cadência', `${Math.round(60 / W.cd)} /min`], ['Carregador', `${W.mag}`], ['Reserva', `${W.res}`], ['Distância efetiva', `${W.range1} m`], ['Cabeça', `×${String(W.head).replace('.', ',')}`], ['Recarga', `${String(W.reload).replace('.', ',')} s`], ['Abate', `+$${KILL_MONEY[id] || ECON.kill}`]] };
  if (id === 'batata') return { bars: [['Dano', c01(W.dmg / 150)], ['Raio', c01(W.radius / 10)]], facts: [['Dano máx.', W.dmg], ['Raio', `${String(W.radius).replace('.', ',')} m`], ['Pavio', `${String(W.fuse).replace('.', ',')} s`], ['Limite', '2']] };
  if (id === 'colete') return { bars: [['Proteção', .5], ['Absorção', .4]], facts: [['Pontos', '50'], ['Absorve', '40%'], ['Cura', 'Não'], ['Limite', '1']] };
  if (id === 'pano' || id === 'caixa') { const H = HEAL_TAT[id]; return { bars: [['Cura', H.amt / 100], ['Rapidez', c01(1 - H.time / 8)]], facts: [['Vida', `+${H.amt}`], ['Tempo', `${String(H.time).replace('.', ',')} s`], ['Uso', id === 'pano' ? '1 por rodada' : 'Você ou aliado'], ['Limite', id === 'caixa' ? '1 por equipe' : '1']] }; }
  if (/^hab[01]$/.test(id)) { const ab = habAb(id); return ab ? { bars: [], facts: [['Grátis por rodada', String(ab.free)], ['Máximo', String(ab.max)], ['Carga extra', ab.price ? '$ ' + ab.price : '—'], ['Tecla', keyName(bindOf(id === 'hab0' ? 'ab1' : 'ab2'))]] } : { bars: [], facts: [] }; }
  return { bars: [], facts: [] };
}
const Shop = {
  open: false, cat: 'Todos', sel: '', key: '', fx: {},
  canOpen() { return G.scene === 'play' && isTat() && G.me && G.me.alive && G.phase === 'prep'; },
  toggle(force) {
    const on = force === undefined ? !this.open : force; if (on && !this.canOpen()) { if (isTat()) hud_toast('A loja só abre na fase de compra (início da rodada).'); return; }
    if (on === this.open && !on) return;
    this.open = on; let el = $('shop'); if (!el) { el = document.createElement('div'); el.id = 'shop'; $('hud').appendChild(el); el.onclick = e => this.click(e); el.ondblclick = e => { const c = e.target.closest('[data-i]'); if (c) this.buy(c.dataset.i); }; }
    if (!on && !el.classList.contains('hidden') && el.offsetWidth) { const gh = /** @type {HTMLElement} */ (el.cloneNode(true)); gh.removeAttribute('id'); gh.id = 'shopGhost'; gh.className = el.className + ' sh-out'; $('hud').appendChild(gh); setTimeout(() => gh.remove(), 180); }
    el.classList.toggle('hidden', !on); Input.menu = on || Bag.open || BigMap.open;
    if (on) { try { document.exitPointerLock(); } catch (e) { } $('pause') && $('pause').classList.add('hidden'); this.build(); } else if (G.scene === 'play' && !Input.menu) lockPointer();
  },
  entry(id) { return habEntry(id) || SHOP.find(s => s.id === id); },
  count(me, id) { if (/^hab[01]$/.test(id)) return me.abC ? me.abC[+id[3]] | 0 : 0; if (id === 'colete') return me.vest > 0 ? 1 : 0; if (id === 'batata') return me.nades | 0; if (id === 'pano') return me.pano ? 1 : 0; if (id === 'caixa') return me.caixa ? 1 : 0; return 0; },
  owned(me, id) { const e = this.entry(id); if (e && e.kind === 'w') return me.own[id] !== undefined; return this.count(me, id) > 0; },
  state(me, id) {
    const e = this.entry(id), price = shopPrice(id), money = me.money | 0, own = this.owned(me, id), eq = me.w === id;
    if (e.kind === 'w') { if (eq) return { k: 'eq', t: 'NA MÃO', btn: id === 'estilingue' ? 'Recarregar pedras' : 'Comprar munição', ok: true }; if (own) return { k: 'own', t: 'COMPRADO', btn: 'Comprar munição', ok: true }; }
    else if (e.kind === 'h' && !e.price) return { k: 'own', t: 'GRÁTIS', btn: 'Carga grátis a cada rodada', ok: false };
    else if (this.count(me, id) >= (e.max || 1)) return { k: 'max', t: e.kind === 'h' ? 'CHEIO' : 'LIMITE', btn: 'Limite atingido', ok: false };
    if (price > money) return { k: 'poor', t: 'SEM DINHEIRO', btn: `Faltam $ ${(price - money).toLocaleString('pt-BR')}`, ok: false };
    return { k: 'ok', t: '', btn: price ? 'Comprar' : 'Pegar', ok: true };
  },
  list() { const all = SHOP.concat(['hab0', 'hab1'].map(habEntry).filter(Boolean)); return SHOP_CATS.map(c => [c, all.filter(s => s.cat === c)]).filter(x => x[1].length); },
  card(s, all) { const it = ITEMS[s.id] || {}, price = shopPrice(s.id);
    return `<div class="sc-card" data-i="${s.id}" style="--ac:${it.col || '#ffd24a'}"><div class="sc-img">${Icons.img(s.icon || s.id, 'md')}</div><div class="sc-bd"><b class="sc-nm">${esc(shopName(s.id))}</b><span class="sc-tag">${all ? `<em>${esc(s.cat)}</em> · ` : ''}${esc(it.tag || s.cat)}</span></div><div class="sc-pr">${price ? '$ ' + price.toLocaleString('pt-BR') : 'GRÁTIS'}</div><span class="sc-badge"></span><i class="sc-flash"></i></div>`; },
  /** descrição curta (1ª frase, até ~70 letras) para os cartões de habilidade */
  short(t) { t = String(t || ''); const f = t.split(/(?<=[.!?])\s/)[0]; return f.length > 72 ? f.slice(0, 70).replace(/\s+\S*$/, '') + '…' : f; },
  /* loja v7.9 (estilo tático): todas as armas numa grade compacta (sem categorias), detalhe à direita e, embaixo,
     as 4 habilidades do agente (estilo do TAB) + equipamentos */
  build() {
    const el = $('shop'), me = G.me; if (!el || !me) return; this.key = '';
    const ORDER = ['estilingue', 'tijolinho', 'trezoitao', 'cabrita', 'colher', 'moedor', 'enxadao', 'galho', 'porteira', 'vara', 'vassoura'];
    const guns = ORDER.map(id => SHOP.find(s => s.id === id)).filter(Boolean), eqs = SHOP.filter(s => s.kind === 'e');
    if (!this.sel || !this.entry(this.sel)) this.sel = (guns.find(s => s.id !== 'estilingue' && me.own[s.id] === undefined) || guns[0]).id;
    const F = FARMERS[me.farmer], keys = ['ab1', 'ab2', 'ab3', 'ult'];
    const gunCard = s => { const it = ITEMS[s.id] || {}, W = WEAPONS[s.id], pr = shopPrice(s.id);
      return `<div class="sc-card s3-w" data-i="${s.id}" style="--ac:${it.col || '#ffd24a'}"><span class="sc-badge"></span><div class="s3-img">${Icons.img(s.id, 'md')}</div>
        <div class="s3-nm"><b>${esc(W.short || W.name)}</b><em>${pr ? '$' + pr.toLocaleString('pt-BR') : 'GRÁTIS'}</em></div><small>${esc(W.cat === 'Leve' ? 'Pistola' : W.cat)}</small></div>`; };
    const abCard = (ab, i) => { const buy = i < 2, c = (me.abC || [])[i] | 0, col = (typeof AB_COL !== 'undefined' && AB_COL[ab.id]) || (F && F.col) || '#ffd24a';
      const kb = keyName(bindOf((typeof AB_KEYS !== 'undefined' && AB_KEYS[i]) || keys[i])), tag = ab.ult ? 'SUPREMA' : i === 2 ? 'ASSINATURA' : ab.price ? '$' + ab.price : 'GRÁTIS';
      return `<div class="${buy ? 'sc-card ' : ''}s3-ab${ab.ult ? ' ult' : ''}" ${buy ? `data-i="hab${i}"` : ''} style="--ac:${col}">${buy ? '<span class="sc-badge"></span>' : ''}
        <div class="s3-abi">${Icons.img('ab_' + ab.id, 'sm', 'abi')}<kbd>${esc(kb)}</kbd></div>
        <div class="s3-abt"><b>${esc(ab.name)}</b><p>${esc(this.short(ab.desc))}</p></div>
        <div class="s3-abm"><em>${tag}</em>${buy ? `<span class="s3-dots">${'●'.repeat(c)}${'○'.repeat(Math.max(0, (ab.max | 0) - c))}</span>` : ''}</div></div>`; };
    const eqCard = s => { const it = ITEMS[s.id] || {}, pr = shopPrice(s.id);
      return `<div class="sc-card s3-e" data-i="${s.id}" style="--ac:${it.col || '#ffd24a'}"><span class="sc-badge"></span>${Icons.img(s.id, 'sm')}<div><b>${esc(s.name)}</b><em>$${pr}</em></div></div>`; };
    el.className = 'shop3';
    el.innerHTML = `<div class="sh-top"><div class="sh-ttl">${CART_SVG}<b class="fnt">Loja do Roçado</b><span class="sh-sub">Clique para ver · clique 2× para comprar</span></div>
      <div class="sh-money"><small>Seu dinheiro</small><b id="shMoney">$ 0</b></div><div class="sh-tm"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="bg"/><circle cx="18" cy="18" r="15" class="fg" id="shRing"/></svg><b id="shTime">0</b></div>
      <button class="sh-x" data-x="1">Fechar <kbd>${esc(keyName(bindOf('shop')))}</kbd></button></div>
      <div class="s3-main"><section class="s3-guns">${guns.map(gunCard).join('')}</section><aside class="sh-det" id="shDet"></aside></div>
      <div class="s3-bot">${F ? `<div class="s3-abs" style="--fc:${F.col}"><h4><span>${esc(F.name)}</span> · habilidades</h4><div class="s3-abrow">${F.ab.map(abCard).join('')}</div></div>` : ''}
        <div class="s3-eqs"><h4>Equipamento</h4><div class="s3-eqrow">${eqs.map(eqCard).join('')}</div></div></div>`;
    Icons.fill(el); this.detail(); this.render(true);
  },
  detail() {
    const d = $('shDet'), me = G.me; if (!d || !me) return; const s = this.entry(this.sel); if (!s) return; const it = ITEMS[s.id] || {}, st = itemStats(s.id), price = shopPrice(s.id);
    d.style.setProperty('--ac', it.col || '#ffd24a');
    d.innerHTML = `<div class="sd-view"><img id="shSpin" src="${Icons.src(s.icon || s.id, 'lg')}" alt=""><span class="sd-cat">${esc(s.cat)}</span><span class="sd-rot">⟳ 360°</span></div>
      <div class="sd-hd"><b class="fnt">${esc(shopName(s.id))}</b><span class="sd-pr">${price ? '$ ' + price.toLocaleString('pt-BR') : 'GRÁTIS'}</span></div><span class="sd-tag">${esc(it.tag || '')}</span>
      <p class="sd-desc">${esc(s.desc)}</p>
      <div class="sd-bars">${st.bars.map(([n, v]) => `<div><span>${n}</span><i><u style="width:${Math.round(v * 100)}%"></u></i></div>`).join('')}</div>
      <div class="sd-facts">${st.facts.map(([n, v]) => `<div><small>${n}</small><b>${esc(String(v))}</b></div>`).join('')}</div>
      <div class="sd-act"><button class="sd-buy" id="shBuy" data-b="${s.id}"><span>Comprar</span></button><button class="sd-sell" id="shSell" data-s="${s.id}">Vender</button></div><div class="sd-why" id="shWhy"></div>`;
    this.spinI = 0; this.spinId = s.icon || s.id; this.key = '';
  },
  render(full) {
    const el = $('shop'), me = G.me; if (!el || !me || !this.open) return; if (full && !el.querySelector('.s3-main')) return this.build();
    const money = me.money | 0, sec = Math.max(0, G.pt || 0);
    const key = money + '|' + Math.ceil(sec) + '|' + Object.keys(me.own).join() + me.w + me.vest + me.nades + (me.pano | 0) + (me.caixa | 0) + this.sel + (me.abC ? me.abC.join() : '');
    /* giro 3D do item selecionado: gera um quadro por vez e anima */
    const sp = Icons.spinStep(this.spinId || this.sel, 20), im = $('shSpin'); this.spinT = (this.spinT || 0) + 1;
    if (im && sp.f.length >= sp.n && this.spinT % 4 === 0) { this.spinI = (this.spinI + 1) % sp.n; im.src = sp.f[this.spinI]; }
    if (this.spinT % 15 === 1 && el.querySelector('img[data-icon]:not([src]), img[data-icon][src=""]')) Icons.fill(el);   /* ícones 3D que ainda estavam carregando */
    if (!full && key === this.key) return; this.key = key;
    $('shMoney').textContent = '$ ' + money.toLocaleString('pt-BR'); $('shTime').textContent = String(Math.ceil(sec));
    const tot = G.buyTot || ECON.buyTime, ring = $('shRing'); if (ring) { ring.style.strokeDashoffset = (94.2 * (1 - clamp(sec / tot, 0, 1))).toFixed(1); ring.classList.toggle('low', sec < 5); }
    el.querySelectorAll('.sc-card').forEach(c => { const id = c.dataset.i, S = this.state(me, id); c.className = c.className.replace(/\s?(st-\w+|sel)\b/g, '') + ' st-' + S.k + (id === this.sel ? ' sel' : ''); const bd = c.querySelector('.sc-badge'); if (bd) bd.textContent = S.t; });
    const S = this.state(me, this.sel), b = $('shBuy'), sl = $('shSell'), e = this.entry(this.sel);
    if (b) { b.querySelector('span').textContent = S.btn; b.disabled = !S.ok; b.classList.toggle('poor', S.k === 'poor'); }
    if (sl) sl.style.display = this.owned(me, this.sel) && this.sel !== 'estilingue' ? '' : 'none';
    const why = $('shWhy'); if (why) why.textContent = S.k === 'own' || S.k === 'eq' ? (e.kind === 'w' ? `Você tem: ${me.mag[this.sel] | 0} no pente · ${me.ammo[WEAPONS[this.sel].ammo] | 0} de reserva` : '') : S.k === 'poor' ? 'Ganhe dinheiro com abates e vitórias de rodada.' : '';
  },
  buy(id) { const S = G.me && this.state(G.me, id); if (!S || !S.ok) { sfx.ui(0); const c = document.querySelector(`.sc-card[data-i="${id}"]`); if (c) { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); } return; } Input.acts.push('buy:' + id); this.flash(id); },
  flash(id) { const c = document.querySelector(`.sc-card[data-i="${id}"]`), b = $('shBuy'); for (const x of [c, b]) if (x) { x.classList.remove('pop'); void x.offsetWidth; x.classList.add('pop'); } },
  click(e) {
    const t = e.target; if (t.closest('[data-x]')) return this.toggle(false);
    const cb = t.closest('[data-c]'); if (cb) { this.cat = cb.dataset.c; sfx.ui(0); return this.build(); }
    const bb = t.closest('[data-b]'); if (bb) { this.buy(bb.dataset.b); setTimeout(() => this.render(true), 120); return; }
    const sb = t.closest('[data-s]'); if (sb) { Input.acts.push('sell:' + sb.dataset.s); sfx.ui(0); setTimeout(() => this.render(true), 120); return; }
    const c = t.closest('[data-i]'); if (c) { if (this.sel !== c.dataset.i) { this.sel = c.dataset.i; sfx.ui(0); this.detail(); this.render(true); } }
  }
};
function drawItemIcon(cv, id) { drawIcon3D(cv, id); }

/* ---------------- mochila (Battle Royale) ---------------- */
const Bag = {
  open: false,
  toggle(force) {
    const on = force === undefined ? !this.open : force; if (on && (G.scene !== 'play' || !G.me || !G.me.alive)) return;
    this.open = on; let el = $('bag'); if (!el) { el = document.createElement('div'); el.id = 'bag'; el.className = 'panel'; $('hud').appendChild(el); el.onclick = e => this.click(e); }
    el.classList.toggle('hidden', !on); Input.menu = on || Shop.open || BigMap.open; if (on) { try { document.exitPointerLock(); } catch (e) { } this.sel = this.sel || (G.me && G.me.sel) || ''; this.render(true); } else if (G.scene === 'play' && !Input.menu) lockPointer();
  },
  tab: 'todos',
  /* retrato 3D do próprio personagem (mesma skin do jogo, com colete se tiver) */
  portrait(skin, armor, far) {
    const k = 'char|' + skin + '|' + armor + '|' + (far || ''); if (Icons.url.has(k)) return Icons.url.get(k); if (!Icons.ok()) return '';
    let c = null; const g3 = Icon3D.char({ skin, farmer: far || '' }, { w: 300, h: 420, ry: .38 }); if (g3 === null || (g3 === undefined && BODY3D.tex && !Icon3D.on())) return ''; if (g3) { const u3 = g3.toDataURL('image/png'); Icons.url.set(k, u3); return u3; }
    try { c = G.R.renderIcon(m => drawChar(m, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, skin, wid: '', armor, spd: 0, farmer: far || '', pose: far || '' }), { w: 300, h: 420, ry: PI - .38, rx: .06, ss: 1.6, pad: 1.08 }); } catch (e) { }
    const u = c ? c.toDataURL('image/png') : ''; Icons.url.set(k, u); return u;
  },
  /* 5x5: armas com munição, ovo, mandioca, curas do Roçado, habilidades do agente (com cargas) */
  itemsTat(me) {
    const out = [];
    for (const id of Object.keys(me.own)) if (id !== 'mandioca') out.push({ id, t: 'armas', n: 0, sub: WEAPONS[id].ammo ? `${me.mag[id] | 0} / ${me.ammo[WEAPONS[id].ammo] | 0}` : 'Corpo a corpo', name: WEAPONS[id].name });
    if (me.nades > 0) out.push({ id: 'batata', t: 'armas', n: me.nades, name: 'Ovo de Galinha', sub: 'Granada · ' + keyName(bindOf('nade')) });
    if (me.hasBomb) out.push({ id: 'mandioca', t: 'armas', n: 1, name: 'Mandioca Explosiva', sub: 'Plante no A ou no B (' + keyName(bindOf('use')) + ')' });
    if (me.pano && (me.panoUsed !== undefined ? me.panoUsed : me.panoR) !== G.round) out.push({ id: 'pano', t: 'cura', n: 1, name: HEAL_TAT.pano.name, sub: '+' + HEAL_TAT.pano.amt + ' HP', tat: 1 });
    if (me.caixa > 0) out.push({ id: 'caixa', t: 'cura', n: me.caixa, name: HEAL_TAT.caixa.name, sub: '+' + HEAL_TAT.caixa.amt + ' HP', tat: 1 });
    const F = FARMERS[me.farmer]; if (F) F.ab.forEach((ab, i) => out.push({ id: 'ab_' + ab.id, t: 'hab', n: ab.ult ? 0 : (me.abC || [])[i] | 0, i, name: ab.name, sub: ab.ult ? `Suprema · ${me.ult | 0}/${ab.cost} pontos` : ab.sig ? 'Assinatura (recarrega)' : `Cargas ${(me.abC || [])[i] | 0}/${ab.max}`, desc: ab.desc, key: keyName(bindOf(AB_KEYS[i])) }));
    return out;
  },
  items(me) {
    if (isTat()) return this.itemsTat(me);
    const inv = me.inv || {}, out = [];
    for (const id of Object.keys(me.own)) if (id !== 'mandioca') out.push({ id, t: 'armas', n: 0, sub: WEAPONS[id].ammo ? `${me.mag[id] | 0} / ${me.ammo[WEAPONS[id].ammo] | 0}` : '', name: WEAPONS[id].name });
    if (me.nades > 0) out.push({ id: 'batata', t: 'armas', n: me.nades, name: 'Ovo de Galinha', sub: 'Granada' });
    for (const id of HEAL_IDS) if (inv[id] > 0) out.push({ id, t: 'cura', n: inv[id], name: HEALS[id].name, sub: '+' + HEALS[id].amt + ' HP' });
    for (const t of Object.keys(AMMO_TYPES)) if (me.ammo[t] > 0) out.push({ id: 'ammo_' + t, t: 'municao', n: me.ammo[t] | 0, name: AMMO_TYPES[t].name, sub: 'Munição' });
    return out;
  },
  render(full) {
    const el = $('bag'), me = G.me; if (!el || !me) return; const inv = me.inv || {}, cnt = Object.values(inv).reduce((a, b) => a + b, 0), cap = 8 + 4 * (me.pack | 0);
    const key = JSON.stringify(inv) + me.sel + this.sel + this.tab + Object.keys(me.own).join() + JSON.stringify(me.ammo) + JSON.stringify(me.mag) + me.w + me.nades + (me.heal ? 1 : 0) + Math.round(me.armor) + (me.abC || []).join() + (me.ult | 0) + (me.money | 0) + (me.caixa | 0) + (me.pano ? 1 : 0) + (me.hasBomb ? 1 : 0); if (!full && key === this.key) return; this.key = key; const tat = isTat();
    const all = this.items(me), list = all.filter(it => this.tab === 'todos' || it.t === this.tab), sel = /** @type {any} */ (all.find(it => it.id === this.sel) || null);
    const tabs = tat ? [['todos', 'Todos', 'mochila'], ['armas', 'Armas', 'colher'], ['cura', 'Cura', 'caixa'], ['hab', 'Habilidades', FARMERS[me.farmer] ? 'ab_' + FARMERS[me.farmer].ab[3].id : 'mochila']] : [['todos', 'Todos', 'mochila'], ['armas', 'Armas', 'colher'], ['municao', 'Munição', 'ammo_cartucho'], ['cura', 'Cura', 'caixa_br']];
    if (tat && this.tab === 'municao') this.tab = 'todos';
    const pct = Math.min(100, cnt / cap * 100), arm = Math.round(me.armor | 0), skin = me.skin !== undefined ? me.skin | 0 : (profile.skin | 0), por = this.portrait(skin, me.vest | 0, isTat() ? me.farmer : '');
    let det = '<div class="bg-empty">Toque num item para ver detalhes. A cura nunca é usada sozinha.</div>';
    if (sel) {
      let btns = '';
      if (sel.t === 'hab') btns = `<button class="btn g" data-ab="${sel.i}">✔ Usar (${esc(sel.key)})</button>`;
      else if (sel.t === 'cura' && sel.tat) btns = `<button class="btn g" data-ht="1">✔ Usar agora (${esc(keyName(bindOf('heal')))})</button>`;
      else if (sel.t === 'cura') btns = `<button class="btn g" data-u="${sel.id}">✔ Usar agora</button><button class="btn" data-h="${sel.id}">Atalho ${esc(keyName(bindOf('heal')))}</button><button class="btn r" data-d="${sel.id}">Descartar</button>`;
      else if (sel.t === 'armas' && sel.id !== 'batata') btns = `<button class="btn g" data-e="${sel.id}">✔ ${me.w === sel.id ? 'Na mão' : 'Equipar'}</button>${sel.id !== 'faca' && sel.id !== 'estilingue' ? `<button class="btn r" data-dw="${sel.id}">Largar</button>` : ''}`;
      const desc = sel.t === 'hab' ? sel.desc : sel.id === 'mandioca' ? 'Leve até um bombsite e segure ' + keyName(bindOf('use')) + ' por 4 s para plantar. ' + keyName(bindOf('drop')) + ' solta para um aliado.' : sel.tat ? `Recupera ${HEAL_TAT[sel.id].amt} de vida em ${HEAL_TAT[sel.id].time} s (o pano é 1 vez por round). Levar dano interrompe.` : sel.t === 'cura' ? `Recupera ${HEALS[sel.id].amt} de vida em ${HEALS[sel.id].time} s. Levar dano interrompe.` : sel.t === 'municao' ? `${sel.n} na mochila (máx. ${AMMO_TYPES[sel.id.slice(5)].cap}).` : sel.id === 'batata' ? 'Granada de ovo: aperte G para arremessar.' : ((SHOP.find(x => x.id === sel.id) || {}).desc || '');
      det = `<div class="bg-dv">${Icons.img(sel.id, 'md', 'bdi')}</div><div class="bg-dt"><b class="fnt">${esc(sel.name)}</b><em>${esc(sel.sub || '')}</em><p>${esc(desc)}</p></div><div class="bg-db">${btns}</div>`;
    }
    el.className = 'panel bag2';
    el.innerHTML = `<div class="bg-top"><div class="bg-title"><span class="bg-ico">${Icons.img('mochila', 'sm', 'bti')}</span><div><b class="fnt">MOCHILA</b><small>Gerencie seus itens e equipamentos</small></div></div>
      ${tat ? '' : `<div class="bg-capc">${Icons.img('mochila', 'sm', 'bci')}<b>${cnt} / ${cap}</b></div>`}<button class="bg-x" data-x="1" title="Fechar (${esc(keyName(bindOf('bag')))})">✕</button></div>
      <div class="bg-body"><aside class="bg-left"><div class="bg-char">${por ? `<img src="${por}" alt="">` : ''}<div class="bg-floor"></div></div>
        ${tat ? `<div class="bg-cap"><div><small>Agente</small><b>${FARMERS[me.farmer] ? esc(FARMERS[me.farmer].name) : '—'}</b><small>${FARMERS[me.farmer] ? esc(FARMERS[me.farmer].role) : ''}</small></div></div>` : `<div class="bg-cap"><div><small>Capacidade da mochila</small><b>${cnt} / ${cap}</b><i><u style="width:${pct}%"></u></i><small>${esc(PACKS[me.pack | 0].name)}</small></div></div>`}</aside>
        <section class="bg-vest"><h5>COLETE</h5><div class="bg-vs${arm > 0 ? ' on' : ''}">${Icons.img('colete', 'sm', 'bvi')}</div><b>🛡 ${arm > 0 ? '+' + arm : '—'}</b><small>${arm > 0 ? 'Proteção ativa' : 'Sem colete'}</small></section>
        <section class="bg-main"><nav class="bg-tabs">${tabs.map(([k, l, ic]) => `<button class="bg-tab${this.tab === k ? ' on' : ''}" data-t="${k}">${Icons.img(ic, 'sm', 'tbi')}<span>${l}</span></button>`).join('')}</nav>
          <div class="bg-grid">${list.map(it => `<div class="bg-it${this.sel === it.id ? ' sel' : ''}${me.w === it.id ? ' hand' : ''}${me.sel === it.id ? ' hk' : ''}" data-i="${it.id}" data-k="${it.t}" title="${esc(it.name)}">${Icons.img(it.id, 'sm', 'bgi')}${it.n > 1 || (it.t !== 'armas' && it.n > 0) ? `<span class="q">x${it.n}</span>` : ''}${it.sub && it.t === 'armas' ? `<span class="am">${esc(it.sub)}</span>` : ''}</div>`).join('') || '<div class="bg-empty">Nada aqui ainda — procure loot nas construções.</div>'}</div>
          <div class="bg-det">${det}</div></section></div>`;
    Icons.fill(el);
  },
  click(e) {
    const tb = e.target.closest('[data-t]'); if (tb) { this.tab = tb.dataset.t; sfx.ui(0); return this.render(true); }
    const it = e.target.closest('[data-i]'); if (it && !e.target.closest('button')) { this.sel = it.dataset.i; if (it.dataset.k === 'cura') Input.acts.push('sel:' + this.sel); sfx.ui(0); return this.render(true); }
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.x) return this.toggle(false);
    if (d.ab !== undefined) { Input.acts.push('ab:' + d.ab); sfx.ui(1); this.toggle(false); return; }
    if (d.ht) { Input.acts.push('h'); sfx.ui(1); this.toggle(false); return; }
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
    const VB = G.map.viewB || B, c = cv.getContext('2d'), sx = sz / (VB.x1 - VB.x0), sz2 = sz / (VB.z1 - VB.z0), X = x => (x - VB.x0) * sx, Z = z => (z - VB.z0) * sz2, MS = hud.mmS || 4;
    c.drawImage(img, (VB.x0 - B.x0) * MS, (VB.z0 - B.z0) * MS, (VB.x1 - VB.x0) * MS, (VB.z1 - VB.z0) * MS, 0, 0, sz, sz); c.lineWidth = 2;
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
/* layout v2 (celular): nada por cima do minimapa/objetivo; linha de cima pequena; disparo grande à direita */
const TOUCH_BTNS = [
  { id: 'fire', t: '🔥', x: 88, y: 62, s: 1.4 }, { id: 'fire2', t: '🔥', x: 10, y: 52, s: .95 }, { id: 'ads', t: '🎯', x: 77, y: 46 }, { id: 'jump', t: '⤒', x: 94, y: 83 }, { id: 'crouch', t: '⤓', x: 85, y: 89, s: .9 },
  { id: 'sprint', t: '🏃', x: 21, y: 52, s: .8 }, { id: 'reload', t: '⟳', x: 76, y: 86, s: .9 }, { id: 'use', t: 'E', x: 70, y: 63, s: .9 }, { id: 'swap', t: '⇄', x: 95, y: 42, s: .85 }, { id: 'nade', t: '🥚', x: 87, y: 33, s: .85 },
  { id: 'bag', t: '🎒', x: 83.5, y: 6.5, s: .72 }, { id: 'heal', t: '➕', x: 79, y: 6.5, s: .72 }, { id: 'map', t: '🗺', x: 70, y: 6.5, s: .72 }, { id: 'score', t: '☰', x: 74.5, y: 6.5, s: .72 }
];
const TouchCtl = {
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
      case 'bag': if (down) { if (isTat() && G.phase === 'prep') Shop.toggle(); else Bag.toggle(); } break; case 'heal': if (down) Input.acts.push(G.me && G.me.hasBomb ? 'q' : 'h'); break;
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
/* ===== paraquedas + personagem numa única hierarquia =====
   raiz = pés do jogador (posição da simulação) → balanço aplicado em torno do velame (pêndulo) →
   velame (gomos), linhas que saem dos gomos e terminam nas MÃOS do personagem, e o personagem.
   Assim o velame fica sempre centrado acima do corpo e as cordas nunca se soltam. */
const CHUTE = { top: 6.3, R: 3.6, A: .82, N: 9, chord: 2.5, hand: [.3, 2.02, -.02] };
function chuteState(e, t) {
  /* velocidade suavizada (inclinação) e progresso da abertura */
  const dtt = e._ct === undefined ? 0 : Math.min(.1, t - e._ct); e._ct = t;
  if (dtt > 0 && e._cx !== undefined) { const vx = (e.x - e._cx) / dtt, vz = (e.z - e._cz) / dtt, k = Math.min(1, dtt * 4); e._vx = (e._vx || 0) + (vx - (e._vx || 0)) * k; e._vz = (e._vz || 0) + (vz - (e._vz || 0)) * k; }
  e._cx = e.x; e._cz = e.z;
  if (e.chOpen && e._openAt === undefined) e._openAt = t; if (!e.chOpen) e._openAt = undefined;
  const sy = Math.sin(e.yaw), cy = Math.cos(e.yaw), fw = -(e._vx || 0) * sy - (e._vz || 0) * cy, rt = (e._vx || 0) * cy - (e._vz || 0) * sy;
  return { fw, rt, u: e._openAt === undefined ? 0 : clamp((t - e._openAt) / .75, 0, 1) };
}
/* fechamento: depois de pousar, o pano murcha e cai atrás do jogador */
function drawChuteCollapse(m, e, t) {
  const k = clamp((t - e.landAt) / .8, 0, 1); if (k >= 1) return; const st = PARACHUTES[chuteHash(e.id) % PARACHUTES.length], C = CHUTE, N = C.N, f = 1 - k;
  m.push().tr(e.landX, e.landY, e.landZ).ry(e.landYaw).tr(0, 0, 1.2 + k * 2.2).rx(k * 1.2);
  const top = C.top * (f * .9 + .1), R = C.R * (.6 + .4 * f), yc = top - R;
  for (let i = 0; i < N; i++) { const a = (-C.A + (i + .5) * 2 * C.A / N) * (.4 + .6 * f), col = i % 2 ? st.col2 : st.col; m.push().tr(Math.sin(a) * R, Math.max(.15, yc + Math.cos(a) * R), 0).rz(-a); m.mat(TX.cloth, 0).col(col).uvs(.6, .6).box(2 * R * Math.sin(C.A / N) * 1.05, .4 * f + .06, C.chord * (.6 + .4 * f)); m.pop(); }
  m.pop();
}
function chuteLine(m, a, b, col) { limbTo(m, a, b, .035, .035, TX.white, col); }
function drawChuteRig(m, e, t, c) {
  const st = PARACHUTES[chuteHash(e.id) % PARACHUTES.length], S = chuteState(e, t), C = CHUTE, ph = (e.x * .13 + e.z * .07);
  m.push().tr(e.x, e.y, e.z).ry(e.yaw);
  if (!e.chOpen) {                                           /* queda livre: corpo inclinado, braços e pernas abertos */
    m.push().tr(0, 1.0, 0).rx(-1.15 + Math.sin(t * 3 + ph) * .04).rz(clamp(-S.rt * .04, -.35, .35)).tr(0, -1.0, 0);
    drawChar(m, Object.assign({}, c, { x: 0, y: 0, z: 0, yaw: 0, wid: '', spd: 0, chute: 'fall' }), { time: t }); m.pop(); m.pop(); return;
  }
  /* abertura: o pano infla com um pequeno exagero (overshoot) e as linhas esticam */
  const u = S.u, inf = u >= 1 ? 1 : 1 - Math.pow(1 - u, 3) * Math.cos(u * 7.5) * .9, sx = .25 + .75 * clamp(inf, 0, 1.08), sy = .45 + .55 * clamp(inf, 0, 1.05);
  const roll = clamp(-S.rt * .055, -.42, .42) + Math.sin(t * 1.3 + ph) * .05, pitch = clamp(S.fw * .03, -.25, .3) + Math.sin(t * 1.05 + ph * 2) * .035;
  const top = C.top * (.86 + .14 * clamp(u * 1.6, 0, 1));
  m.push().tr(0, top, 0).rz(roll).rx(pitch).tr(0, -top, 0);                 /* pêndulo em torno do velame */
  /* ---- velame: gomos inflados em arco, cores alternadas, costuras e bocas na frente ---- */
  const R = C.R, A = C.A, N = C.N, yc = top - R, cw = 2 * R * Math.sin(A / N) * sx, anchors = [];
  for (let i = 0; i < N; i++) {
    const a = -A + (i + .5) * 2 * A / N, px = Math.sin(a) * R * sx, py = yc + Math.cos(a) * R * sy, breathe = 1 + Math.sin(t * 2.2 + i * .7) * .025;
    const col = st.umbrella ? st.col : (i % 2 ? st.col2 : st.col);
    m.push().tr(px, py, 0).rz(-a);
    m.mat(TX.cloth, 0, 30).col(col).uvs(.6, .6).box(cw * 1.05, .5, C.chord).sph(cw * .52, .36 * breathe, C.chord * .53, 8, 5, 0, .14, 0).sph(cw * .5, .2, C.chord * .5, 8, 4, 0, -.2, 0);
    m.mat(TX.cloth, 0).col(shadeHex(col, .6)).box(cw * .62, .28, .02, 0, -.04, -C.chord / 2 - .005);                   /* boca do gomo */
    m.mat(TX.white, 0).col(shadeHex(col, .55)).box(.035, .56, C.chord + .02, cw / 2, 0, 0);                                /* costura */
    m.pop();
    if (i === 0 || i === 2 || i === N - 3 || i === N - 1) for (const zz of [-C.chord * .4, C.chord * .4]) { const ax = Math.sin(a) * (R * sx - .25), ay = yc + Math.cos(a) * (R * sy - .25); anchors.push([ax, ay, zz, a]); }
  }
  /* emblema do celeiro no topo (gomo central) */
  if (!st.umbrella) { const ey = yc + R * sy + .2; m.mat(TX.cloth, 0).col(shadeHex(st.col, .55)).box(.8, .02, .5, 0, ey, .05).box(.18, .021, .22, 0, ey + .001, .3); m.push().tr(0, ey, -.32).rx(PI / 2); m.box(.9, .02, .02, 0, 0, 0); m.pop(); }
  /* ---- linhas: de cada ponto de ancoragem até a mão do mesmo lado ---- */
  const hL = [-C.hand[0], C.hand[1], C.hand[2]], hR = [C.hand[0], C.hand[1], C.hand[2]], sway = Math.sin(t * 2.4 + ph) * .02;
  const lineCol = 0x3a2c22;
  for (const [ax, ay, az] of anchors) chuteLine(m, [ax, ay, az + sway], ax < 0 ? hL : hR, lineCol);
  /* tirantes: mãos → ombros (fitas do equipamento) */
  for (const s of [-1, 1]) limbTo(m, [s * C.hand[0], C.hand[1], C.hand[2]], [s * .2, 1.32, .02], .05, .02, TX.cloth, 0x5a3a20);
  /* ---- personagem: braços para cima segurando as linhas, pernas balançando ---- */
  drawChar(m, Object.assign({}, c, { x: 0, y: 0, z: 0, yaw: 0, wid: '', spd: 0, chute: 'open', chT: t + ph }), { time: t });
  m.pop(); m.pop();
}
function chuteHash(s) { let h = 7; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
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
