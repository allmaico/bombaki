/* =====================================================================
   596_menu.js — MENU INICIAL v6 (Beta · Natal na Roça)
   Abas: Jogar · Perfil · Armário · Loja · Conquistas. Prévia 3D ao vivo
   do personagem (o peão segura a arma com a skin escolhida e faz os
   emotes), presente diário de Milho, contagem do evento de Natal,
   barra de emotes, dicas na tela de carregamento.
   ===================================================================== */
'use strict';
const LOAD_TIPS = [
  'Dica: janela quebrada é atalho — corra e aperte <b>Espaço</b> para pular por ela.',
  'Dica: no 5x5, a <b>mochila (B)</b> mostra suas habilidades e curas.',
  'Dica: use até <b>3 emotes</b> com a tecla <b>Y</b> durante a partida.',
  'Dica: tiro na cabeça derruba o chapéu do adversário. Literalmente.',
  'Dica: o <b>Milho 🌽</b> que você ganha jogando compra skins na Loja.',
  'Dica: as galinhas fogem de tiro… e entregam a sua posição.',
  'Evento: abra o <b>presente de Natal</b> todo dia no menu!'
];
/* ícones 3D dos cosméticos (renderizados aos poucos, com cache) */
const CosIco = {
  cache: new Map(), q: [], busy: false,
  src(key) { if (this.cache.has(key)) return this.cache.get(key); if (!this.q.includes(key)) this.q.push(key); return ''; },
  img(key, cls) { const u = this.src(key); return `<img class="${cls || 'cico'}" data-ck="${key}" ${u ? `src="${u}"` : ''} alt="" draggable="false">`; },
  render(key) {
    const [k, a, b] = key.split(':'); let draw = null, o = {};
    if (k === 'w') { draw = m => drawWeapon(m, a, { sk: b, fuse: 0 }); o = Icons.opts(a, b === 'big' ? 'lg' : 'md'); if (key.endsWith(':L')) o = Icons.opts(a, 'lg'); }
    else if (k === 'h') { draw = m => drawHat(m, a); o = { w: 220, h: 180, rx: .45, ry: .5, ss: 1.6, pad: 1.2 }; }
    else if (k === 'c' || k === 'e') {
      const sk = k === 'c' ? +a : wireSkin(), emote = k === 'e' ? { id: a, t: a === 'chapeu' ? 1.2 : a === 'rena' ? .32 : .55 } : null;
      draw = m => drawChar(m, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, skin: sk, wid: k === 'c' ? 'galho' : '', cr: 0, spd: 0, wph: 0, team: 0, emote, wsk: Cos.skinOf('galho') }, { time: 1 });
      o = { w: 220, h: 280, rx: .06, ry: PI - .45, ss: 1.6, pad: 1.08 };
    }
    if (!draw) return ''; try { const c = G.R.renderIcon(draw, o); return c ? c.toDataURL('image/png') : ''; } catch (e) { console.warn('cosico', key, e); return ''; }
  },
  pump() {
    if (!this.q.length || !G.R || !G.R.ready) return; const t0 = performance.now();
    while (this.q.length && performance.now() - t0 < 14) { const key = this.q.shift(); const u = this.render(key); this.cache.set(key, u); document.querySelectorAll(`img[data-ck="${key}"]`).forEach(im => { im.src = u; im.classList.add('in'); }); }
  }
};
const CORN_SVG = '<svg class="corn" viewBox="0 0 24 24"><path d="M12 2c3 0 5 3.6 5 8.5S15 21 12 22c-3-1-5-6.6-5-11.5S9 2 12 2z" fill="#ffd23a" stroke="#a86a00" stroke-width="1.4"/><path d="M9.5 6h5M9 9h6M9 12h6M9.4 15h5.2M10 18h4M12 3v18" stroke="#c88a10" stroke-width="1"/><path d="M7 11c-3 2-3 7 2 11 0-4-1-7-2-11zm10 0c3 2 3 7-2 11 0-4 1-7 2-11z" fill="#6fae3a"/></svg>';
const XMAS = () => { const n = new Date(), y = n.getMonth() === 11 && n.getDate() > 25 ? n.getFullYear() + 1 : n.getFullYear(); return Math.ceil((+new Date(y, 11, 25) - +n) / 864e5); };

const Menu6 = {
  tab: 'play', hubOn: false, sub: 'skins', wsel: 'galho', slot: 0, shopCat: 'natal', preview: null, emote: null, spin: 0,
  init() {
    $('mNav').onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx.ui(1); this.open(b.dataset.tab); };
    $('pCard').onclick = () => { sfx.ui(1); this.open('perfil'); };
    $('mMilho').onclick = () => { sfx.ui(1); this.open('loja'); };
    $('evShop').onclick = () => { sfx.ui(1); this.shopCat = 'natal'; this.open('loja'); };
    $('evGift').onclick = () => this.gift();
    $('mMode').onclick = () => { sfx.ui(1); UI.playModal(); };
    $('bPlay').onclick = () => { if (Party.inParty() && !Party.isLeader()) { this.myReady = !this.myReady; Party.ready(this.myReady); sfx.ui(1); this.refreshSocial(); return; } sfx.ui(1); UI.playModal(); };
    $('sqCard').onclick = e => this.squadClick(e);
    $('emoBar').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.edit !== undefined) { sfx.ui(1); this.sub = 'emotes'; this.open('armario'); return; } const id = profile.emotes[+b.dataset.i]; if (id) this.playEmote(id); };
    $('hub').onclick = e => this.hubClick(e);
    /* arrastar no fundo gira o personagem */
    let drag = null; const cv = $('cv');
    cv.addEventListener('pointerdown', e => { if (G.scene === 'menu') drag = { x: e.clientX, s: this.spin }; });
    addEventListener('pointermove', e => { if (drag) this.spin = drag.s + (e.clientX - drag.x) * .012; });
    addEventListener('pointerup', () => { drag = null; });
    setInterval(() => { if (G.scene === 'menu') this.tick(); }, 1000);
    this.refresh();
  },
  tick() { const d = XMAS(); $('evDays').textContent = d <= 0 ? 'É NATAL! 🎄' : `Faltam ${d} dia${d > 1 ? 's' : ''} para o Natal`; this.giftState(); },
  today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
  giftState() { const done = store.get('giftDay', '') === this.today(), b = $('evGift'); b.classList.toggle('done', done); $('evGiftT').textContent = done ? 'Volte amanhã' : 'Abrir presente'; },
  gift() {
    if (store.get('giftDay', '') === this.today()) { sfx.ui(0); UI.toast('Você já abriu o presente de hoje. Volte amanhã! 🎄'); return; }
    const amt = 250 + Math.floor(Math.random() * 6) * 50; store.set('giftDay', this.today()); Cos.earn(amt); saveProfile();
    const m = UI.open(`<div class="giftm"><div class="gm-box"><div class="gm-lid"></div><div class="gm-body"></div><div class="gm-rib"></div></div><div class="gm-rays"></div>
      <h2 class="fnt">PRESENTE DE NATAL!</h2><div class="gm-amt">${CORN_SVG}<b>+${amt}</b></div><p>Milho para gastar na Loja de Cosméticos. Volte amanhã para outro presente!</p>
      <div class="row" style="justify-content:center;gap:10px"><button class="btn y" id="gmShop">Ir para a Loja</button><button class="btn" data-x2>Fechar</button></div></div>`, 'giftmodal');
    sfx.jingle && sfx.jingle(); this.confetti(m); m.querySelector('#gmShop').onclick = () => { UI.close(); this.open('loja'); }; m.querySelector('[data-x2]').onclick = () => UI.close();
    this.refresh(true); this.giftState();
  },
  confetti(root) {
    const cv = document.createElement('canvas'); cv.className = 'confetti'; (root || document.body).appendChild(cv); const W = cv.width = cv.offsetWidth * 1.5 || 900, H = cv.height = cv.offsetHeight * 1.5 || 700, c = cv.getContext('2d');
    const cols = ['#ffd23a', '#e2283a', '#2fae5a', '#3aa0ff', '#ffffff', '#ff7ad0'], P = []; for (let i = 0; i < 140; i++) P.push({ x: W / 2, y: H * .38, vx: (Math.random() - .5) * 18, vy: -Math.random() * 16 - 4, r: Math.random() * 6, vr: (Math.random() - .5) * .4, s: 5 + Math.random() * 7, c: cols[i % cols.length] });
    let n = 0; const step = () => { c.clearRect(0, 0, W, H); for (const p of P) { p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); } if (++n < 150 && cv.isConnected) requestAnimationFrame(step); else cv.remove(); }; step();
  },
  refresh(bump) {
    const n = $('mMilhoN'); if (n) { n.textContent = (profile.milho | 0).toLocaleString('pt-BR'); if (bump) { const b = $('mMilho'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } }
    const L = levelInfo(), t = $('pTitle'); if (t) t.textContent = titleOf(L.level);
    const md = store.get('lastMode', 'tatico'), M = MODES[md]; if ($('mModeN')) { $('mModeN').textContent = M.name; const tm = TAT_MAPS.find(x => x.id === store.get('tatMap', 'arena')); $('mModeS').textContent = md === 'tatico' ? `5x5 · ${tm ? tm.name : 'Mapa aleatório'}` : `${M.sub} · Fazenda do Zé`; }
    const eb = $('emoBar'); if (eb) eb.innerHTML = '<span>EMOTES</span>' + profile.emotes.map((id, i) => `<button data-i="${i}" class="${id ? '' : 'empty'}" title="${id ? esc(EMOTES[id].name) : 'Vazio'}"><em>${id ? EMOTES[id].ico : '＋'}</em><b>${i + 1}</b></button>`).join('') + '<button class="emoedit" data-edit>Editar</button>';
    this.giftState(); this.tick();
  },
  playEmote(id) { this.emote = { id, t0: G.time }; sfx.ui(1); document.querySelectorAll('#emoBar button').forEach(b => b.classList.toggle('play', profile.emotes[+b.dataset.i] === id)); },
  /* ----- abas ----- */
  open(tab) {
    if (tab === 'conq') { AccUI.profile(); return; }
    this.tab = tab; document.querySelectorAll('#mNav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    this.hubOn = tab !== 'play'; $('menu').classList.toggle('hubon', this.hubOn); $('hub').classList.toggle('hidden', !this.hubOn);
    if (!this.hubOn) { this.preview = null; return; } this.render();
  },
  close() { this.open('play'); },
  head(t, sub) { return `<div class="hub-h"><div><h2 class="fnt">${t}</h2><p>${sub}</p></div><div class="hub-milho">${CORN_SVG}<b>${(profile.milho | 0).toLocaleString('pt-BR')}</b></div><button class="hub-x" data-close title="Voltar">✕</button></div>`; },
  render() {
    const h = $('hub'); let html = '';
    if (this.tab === 'perfil') html = this.rPerfil(); else if (this.tab === 'armario') html = this.rArm(); else if (this.tab === 'loja') html = this.rLoja(); else if (this.tab === 'amigos') html = this.rFriends();
    h.innerHTML = `<div class="hub-panel">${html}</div><div class="hub-prev"><span>${esc(this.prevLabel())}</span><small>Arraste para girar</small></div>`;
    const inp = h.querySelector('#hpName'); if (inp) inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') this.saveName(); };
    h.querySelectorAll('canvas[data-face]').forEach(c => drawFace(c, +c.dataset.face));
  },
  prevLabel() { const p = this.preview; if (p && p.w) return skinItemName(p.w, p.s || Cos.skinOf(p.w)); return profile.name + ' · ' + titleOf(levelInfo().level); },
  card(o) {
    const R = RARITY[o.rar || 'comum'];
    return `<button class="ccard${o.sel ? ' sel' : ''}${o.lock ? ' lock' : ''}${o.big ? ' big' : ''}" style="--rc:${R.col}" ${o.data}>
      <div class="cc-img">${o.img}</div>${o.badge ? `<i class="cc-badge">${o.badge}</i>` : ''}${o.ev ? '<i class="cc-ev">NATAL</i>' : ''}
      <div class="cc-tx"><small style="color:${R.col}">${R.name}${o.kind ? ' · ' + o.kind : ''}</small><b>${esc(o.name)}</b>${o.price !== undefined ? `<span class="cc-pr">${o.price === 'own' ? '✔ Adquirido' : o.price === 0 ? 'Grátis' : CORN_SVG + (+o.price).toLocaleString('pt-BR')}</span>` : ''}</div></button>`;
  },
  /* ----- PERFIL ----- */
  rPerfil() {
    const L = levelInfo(), g = profile, kd = g.deaths ? (g.kills / g.deaths).toFixed(2) : (g.kills | 0).toFixed(2), wr = g.matches ? Math.round(g.wins / g.matches * 100) : 0;
    const st = (v, t, ic) => `<div class="pf-st"><i>${ic}</i><b>${v}</b><small>${t}</small></div>`;
    const nxt = TITLES.find(([l]) => l > L.level), hat = HATS.find(x => x.id === (g.hat || '')) || HATS[0], ws = SKIN_WEAPONS.filter(w => Cos.skinOf(w) !== 'padrao').length;
    return this.head('PERFIL', 'Sua ficha de peão, estatísticas e o que você está usando.') + `<div class="hub-body pf">
      <div class="pf-top"><div class="pf-av"><canvas data-face="${g.skin | 0}" width="96" height="96"></canvas><span class="lvb">${L.level}</span></div>
        <div class="pf-id"><label>APELIDO</label><div class="pf-nm"><input id="hpName" maxlength="14" value="${esc(g.name)}" ${Account.cur ? 'disabled title="O apelido vem da sua conta"' : ''}><button class="btn s y" data-act="name" ${Account.cur ? 'disabled' : ''}>Salvar</button></div>
          <div class="pf-ttl">🏷️ ${titleOf(L.level)}${nxt ? `<small> · próximo título "${nxt[1]}" no nível ${nxt[0]}</small>` : ''}</div>
          <div class="pf-xp"><div class="xpbar"><i style="width:${(L.xp / L.need * 100).toFixed(1)}%"></i></div><span>Nível ${L.level} · ${L.xp} / ${L.need} XP</span></div></div></div>
      <div class="pf-grid">${st(g.matches | 0, 'Partidas', '🎮')}${st(g.wins | 0, 'Vitórias · ' + wr + '%', '🏆')}${st(g.losses | 0, 'Derrotas', '💀')}${st(g.kills | 0, 'Abates', '🎯')}${st(g.deaths | 0, 'Mortes', '🪦')}${st(kd, 'K/D', '⚖️')}${st(g.heads | 0, 'Na cabeça', '🤠')}${st((profile.owned || []).length, 'Cosméticos', '🎁')}</div>
      <h3 class="hub-sec">EQUIPADO</h3>
      <div class="pf-eq">
        <div class="pf-eqi" data-go="chapeus">${hatOf(wireSkin()) ? CosIco.img('h:' + hatOf(wireSkin())) : `<canvas data-face="${g.skin | 0}" width="64" height="64"></canvas>`}<small>Chapéu</small><b>${esc(hat.name)}</b></div>
        <div class="pf-eqi" data-go="emotes"><div class="pf-emo">${g.emotes.map(e => `<span>${e ? EMOTES[e].ico : '·'}</span>`).join('')}</div><small>Emotes</small><b>${g.emotes.filter(Boolean).length} de 3</b></div>
        <div class="pf-eqi" data-go="skins">${CosIco.img('w:' + (profile.primary || 'galho') + ':' + Cos.skinOf(profile.primary || 'galho'))}<small>Skins de arma</small><b>${ws} de ${SKIN_WEAPONS.length} personalizadas</b></div>
      </div>
      <div class="row" style="margin-top:1.4em;gap:.8em"><button class="btn y" data-act="armario">Abrir Armário</button><button class="btn" data-act="conq">Conquistas e histórico</button><button class="btn" data-act="conta">${Account.cur ? 'Conta: ' + esc(g.name) : 'Entrar / criar conta'}</button></div></div>`;
  },
  saveName() { const i = $('hpName'); if (!i || Account.cur) return; profile.name = (i.value.trim() || 'Peão').slice(0, 14); saveProfile(); UI.refreshProfile(); sfx.ui(1); UI.toast('Apelido salvo!'); },
  /* ----- ARMÁRIO ----- */
  rArm() {
    const subs = [['skins', 'Skins de Arma'], ['emotes', 'Emotes'], ['chapeus', 'Chapéus'], ['personagem', 'Personagem'], ['paraquedas', 'Paraquedas']];
    let body = '';
    if (this.sub === 'skins') {
      const w = this.wsel, cur = Cos.skinOf(w);
      body = `<div class="ws-row">${SKIN_WEAPONS.map(x => `<button class="ws-w${x === w ? ' on' : ''}" data-w="${x}">${CosIco.img('w:' + x + ':' + Cos.skinOf(x))}<span>${esc(WEAPONS[x].short || WEAPONS[x].name)}</span></button>`).join('')}</div>
        <div class="ws-hero" style="--rc:${RARITY[WSKINS[cur].rar].col}">${CosIco.img('w:' + w + ':' + cur + ':L', 'cico big')}<div><small style="color:${RARITY[WSKINS[cur].rar].col}">${RARITY[WSKINS[cur].rar].name}</small><b class="fnt">${esc(skinItemName(w, cur))}</b><p>${esc(WSKINS[cur].desc)}</p></div></div>
        <div class="cgrid">${WSKIN_IDS.map(s => { const id = 'ws:' + w + ':' + s, own = Cos.has(id); return this.card({ data: `data-ws="${s}"`, img: CosIco.img('w:' + w + ':' + s), name: skinItemName(w, s), rar: WSKINS[s].rar, sel: s === cur, lock: !own, ev: WSKINS[s].ev, badge: s === cur ? 'EQUIPADA' : own ? '' : '🔒 LOJA' }); }).join('')}</div>`;
    } else if (this.sub === 'emotes') {
      body = `<p class="hub-hint">Escolha um espaço e clique num emote para equipar. Na partida: tecla <kbd>Y</kbd> e depois <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>.</p>
        <div class="em-slots">${profile.emotes.map((id, i) => `<button class="em-slot${i === this.slot ? ' on' : ''}" data-slot="${i}"><b>${i + 1}</b>${id ? CosIco.img('e:' + id) : '<em>＋</em>'}<span>${id ? esc(EMOTES[id].name) : 'Vazio'}</span>${id ? `<i data-clr="${i}" title="Remover">✕</i>` : ''}</button>`).join('')}</div>
        <div class="cgrid">${Object.entries(EMOTES).map(([id, E]) => { const own = Cos.has('em:' + id), eq = profile.emotes.includes(id); return this.card({ data: `data-em="${id}"`, img: CosIco.img('e:' + id), name: E.name, rar: E.rar, kind: 'Emote', sel: eq, lock: !own, ev: E.ev, badge: eq ? 'NO ESPAÇO ' + (profile.emotes.indexOf(id) + 1) : own ? '' : '🔒 LOJA' }); }).join('')}</div>`;
    } else if (this.sub === 'chapeus') {
      const lv = levelInfo().level, cur = profile.hat || '';
      body = `<p class="hub-hint">Chapéus são só estilo (sem vantagem). No 5x5 o agente usa o próprio visual.</p><div class="cgrid">${HATS.map(H => { const lk = lv < H.lv, sh = H.shop && !hatOwned(H), S = SHOP_HATS[H.id]; return this.card({ data: `data-hat="${H.id}"`, img: H.id ? CosIco.img('h:' + H.id) : `<canvas data-face="${profile.skin | 0}" width="64" height="64"></canvas>`, name: H.name, rar: S ? S.rar : H.lv >= 12 ? 'epica' : H.lv >= 5 ? 'rara' : 'comum', kind: 'Chapéu', sel: H.id === cur, lock: lk || sh, ev: S && S.ev, badge: H.id === cur ? 'EQUIPADO' : lk ? '🔒 NÍVEL ' + H.lv : sh ? '🔒 LOJA' : '' }); }).join('')}</div>`;
    } else if (this.sub === 'personagem') {
      body = `<div class="cgrid tall">${SKINS.map((S, i) => this.card({ data: `data-sk="${i}"`, img: CosIco.img('c:' + i), name: S.name, rar: S.special ? 'epica' : 'comum', kind: 'Personagem', sel: (profile.skin | 0) === i, badge: (profile.skin | 0) === i ? 'EM USO' : '' })).join('')}</div>`;
    } else {
      body = `<p class="hub-hint">Paraquedas do Battle Royale (só visual).</p><div class="pq-grid">${PARACHUTES.map(c => `<button class="pq${(profile.chute || 'lencol') === c.id ? ' on' : ''}" data-pq="${c.id}" style="--a:#${c.col.toString(16).padStart(6, '0')};--b:#${(c.col2 || c.col).toString(16).padStart(6, '0')}"><i></i><b>${esc(c.name)}</b></button>`).join('')}</div>`;
    }
    return this.head('ARMÁRIO', 'Equipe seus cosméticos — a prévia ao lado atualiza ao vivo.') + `<div class="hub-tabs">${subs.map(([k, t]) => `<button data-sub="${k}" class="${k === this.sub ? 'on' : ''}">${t}</button>`).join('')}</div><div class="hub-body">${body}</div>`;
  },
  /* ----- LOJA ----- */
  shopItems(cat) {
    const L = [];
    if (cat === 'natal') { for (const s of ['natal', 'neve']) for (const w of SKIN_WEAPONS) L.push('ws:' + w + ':' + s); L.push('em:rena', 'hat:santa', 'hat:rena', 'hat:estrela'); }
    else if (cat === 'skins') { for (const s of WSKIN_IDS.slice(1)) for (const w of SKIN_WEAPONS) L.push('ws:' + w + ':' + s); }
    else if (cat === 'chapeus') L.push(...Object.keys(SHOP_HATS).map(h => 'hat:' + h));
    else if (cat === 'emotes') L.push(...Object.keys(EMOTES).map(e => 'em:' + e));
    return L;
  },
  itemInfo(id) {
    const [k, a, b] = id.split(':');
    if (k === 'ws') return { name: skinItemName(a, b), rar: WSKINS[b].rar, kind: 'Skin · ' + (WEAPONS[a].short || WEAPONS[a].name), img: 'w:' + a + ':' + b, desc: WSKINS[b].desc, ev: WSKINS[b].ev };
    if (k === 'em') return { name: EMOTES[a].name, rar: EMOTES[a].rar, kind: 'Emote', img: 'e:' + a, desc: EMOTES[a].desc, ev: EMOTES[a].ev };
    const H = HATS.find(x => x.id === a); return { name: H.name, rar: SHOP_HATS[a].rar, kind: 'Chapéu', img: 'h:' + a, desc: SHOP_HATS[a].desc, ev: SHOP_HATS[a].ev };
  },
  rLoja() {
    const cats = [['natal', '🎄 Natal na Roça'], ['skins', 'Skins de Arma'], ['emotes', 'Emotes'], ['chapeus', 'Chapéus']];
    const feat = this.shopCat === 'natal' ? `<div class="sh-feat"><div class="sf-tx"><span class="ev-tag">COLEÇÃO LIMITADA</span><h3 class="fnt">NATAL NA ROÇA</h3><p>Bengalas de doce, gelo cristalino e o emote <b>Pulo da Rena</b>. ${XMAS() > 0 ? 'Faltam ' + XMAS() + ' dias para o Natal!' : 'Feliz Natal!'}</p>
      <button class="btn y" data-buy="ws:faca:natal">${Cos.has('ws:faca:natal') ? '✔ Bengala Quebra-Nozes adquirida' : 'Comprar Bengala Quebra-Nozes · ' + Cos.price('ws:faca:natal').toLocaleString('pt-BR') + ' 🌽'}</button></div>
      <div class="sf-img">${CosIco.img('w:estilingue:natal:L', 'cico f2')}${CosIco.img('w:faca:natal:L', 'cico f1')}</div></div>` : '';
    const items = this.shopItems(this.shopCat).map(id => { const I = this.itemInfo(id), own = Cos.has(id); return this.card({ data: `data-buy="${id}"`, img: CosIco.img(I.img), name: I.name, rar: I.rar, kind: I.kind, ev: I.ev, price: own ? 'own' : Cos.price(id), sel: own }); }).join('');
    return this.head('LOJA DE COSMÉTICOS', 'Só visual: nenhum item dá vantagem. Ganhe Milho 🌽 jogando e abrindo o presente diário.') + `<div class="hub-tabs">${cats.map(([k, t]) => `<button data-cat="${k}" class="${k === this.shopCat ? 'on' : ''}">${t}</button>`).join('')}</div><div class="hub-body">${feat}<div class="cgrid">${items}</div></div>`;
  },
  buyModal(id) {
    const I = this.itemInfo(id), R = RARITY[I.rar], own = Cos.has(id), pr = Cos.price(id), poor = (profile.milho | 0) < pr;
    const m = UI.open(`<div class="buym" style="--rc:${R.col}"><div class="bm-img">${CosIco.img(I.img.startsWith('w:') ? I.img + ':L' : I.img, 'cico big')}</div><div class="bm-tx"><small style="color:${R.col}">${R.name} · ${esc(I.kind)}</small><h2 class="fnt">${esc(I.name)}</h2><p>${esc(I.desc)}</p>
      <div class="bm-pr">${own ? '✔ Você já tem este item' : pr === 0 ? 'Grátis' : CORN_SVG + '<b>' + pr.toLocaleString('pt-BR') + '</b>'}</div>${poor && !own ? `<p class="bm-poor">Faltam ${(pr - (profile.milho | 0)).toLocaleString('pt-BR')} de Milho. Jogue partidas e abra o presente diário!</p>` : ''}
      <div class="row" style="gap:10px;margin-top:12px">${own ? `<button class="btn y" id="bmEq">Equipar</button>` : `<button class="btn y" id="bmBuy" ${poor ? 'disabled' : ''}>Comprar</button>`}<button class="btn" data-x3>Voltar</button></div></div></div>`, 'buymodal');
    CosIco.pump();
    m.querySelector('[data-x3]').onclick = () => UI.close();
    const eq = () => { this.equip(id); UI.close(); this.sub = id.startsWith('ws') ? 'skins' : id.startsWith('em') ? 'emotes' : 'chapeus'; if (id.startsWith('ws')) this.wsel = id.split(':')[1]; this.open('armario'); };
    const b = m.querySelector('#bmBuy'); if (b) b.onclick = () => { const r = Cos.buy(id); if (r === 'ok') { sfx.jingle && sfx.jingle(); this.confetti(m); UI.toast('🎉 ' + I.name + ' é seu!'); this.refresh(true); b.outerHTML = '<button class="btn y" id="bmEq">Equipar agora</button>'; m.querySelector('#bmEq').onclick = eq; this.render(); } else if (r === 'poor') { sfx.ui(0); UI.toast('Milho insuficiente.'); } };
    const e2 = m.querySelector('#bmEq'); if (e2) e2.onclick = eq;
    if (id.startsWith('ws')) { const [, w, s] = id.split(':'); this.preview = { w, s }; } else if (id.startsWith('em')) this.playEmote(id.split(':')[1]);
  },
  equip(id) {
    const [k, a, b] = id.split(':');
    if (k === 'ws') { profile.wsk[a] = b; this.preview = { w: a }; }
    else if (k === 'em') { if (!profile.emotes.includes(a)) { const i = profile.emotes.indexOf(''); profile.emotes[i >= 0 ? i : this.slot] = a; } this.playEmote(a); }
    else if (k === 'hat') profile.hat = a;
    saveProfile(); UI.refreshProfile(); this.refresh();
  },
  /* ----- cliques do painel ----- */
  hubClick(e) {
    const t = e.target, d = (s) => t.closest(s);
    if (this.tab === 'amigos' && this.friendsClick(e)) return;
    if (d('[data-close]')) { sfx.ui(0); this.close(); return; }
    const sub = d('[data-sub]'); if (sub) { this.sub = sub.dataset.sub; sfx.ui(0); this.render(); return; }
    const cat = d('[data-cat]'); if (cat) { this.shopCat = cat.dataset.cat; sfx.ui(0); this.render(); return; }
    const act = d('[data-act]'); if (act) { const a = act.dataset.act; sfx.ui(1); if (a === 'name') this.saveName(); else if (a === 'armario') this.open('armario'); else if (a === 'conq') AccUI.profile(); else if (a === 'conta') AccUI.open(); return; }
    const go = d('[data-go]'); if (go) { this.sub = go.dataset.go; sfx.ui(1); this.open('armario'); return; }
    const ww = d('[data-w]'); if (ww && ww.classList.contains('ws-w')) { this.wsel = ww.dataset.w; this.preview = { w: this.wsel }; sfx.ui(0); this.render(); return; }
    const ws = d('[data-ws]'); if (ws) { const id = 'ws:' + this.wsel + ':' + ws.dataset.ws; if (!Cos.has(id)) { this.buyModal(id); return; } profile.wsk[this.wsel] = ws.dataset.ws; saveProfile(); this.preview = { w: this.wsel }; sfx.ui(1); this.render(); return; }
    const clr = d('[data-clr]'); if (clr) { profile.emotes[+clr.dataset.clr] = ''; saveProfile(); this.refresh(); this.render(); return; }
    const sl = d('[data-slot]'); if (sl) { this.slot = +sl.dataset.slot; sfx.ui(0); const id = profile.emotes[this.slot]; if (id) this.playEmote(id); this.render(); return; }
    const em = d('[data-em]'); if (em) { const id = em.dataset.em; if (!Cos.has('em:' + id)) { this.buyModal('em:' + id); return; } const j = profile.emotes.indexOf(id); if (j >= 0) profile.emotes[j] = ''; profile.emotes[this.slot] = id; this.slot = (this.slot + 1) % 3; saveProfile(); this.playEmote(id); this.refresh(); this.render(); return; }
    const hat = d('[data-hat]'); if (hat) { const H = HATS.find(x => x.id === hat.dataset.hat); if (levelInfo().level < H.lv) { sfx.ui(0); UI.toast('Desbloqueia no nível ' + H.lv + '.'); return; } if (!hatOwned(H)) { this.buyModal('hat:' + H.id); return; } profile.hat = H.id; saveProfile(); UI.refreshProfile(); sfx.ui(1); this.render(); return; }
    const sk = d('[data-sk]'); if (sk) { profile.skin = +sk.dataset.sk; saveProfile(); UI.refreshProfile(); sfx.ui(1); this.render(); return; }
    const pq = d('[data-pq]'); if (pq) { profile.chute = pq.dataset.pq; saveProfile(); sfx.ui(1); this.render(); return; }
    const by = d('[data-buy]'); if (by) { sfx.ui(1); this.buyModal(by.dataset.buy); return; }
  },
  /* personagem do menu (usado pelo renderMenu) */
  charOpts() {
    const p = this.preview, wid = p && p.w ? p.w : (profile.primary === 'vassoura' ? 'vassoura' : profile.primary === 'colher' ? 'colher' : profile.primary === 'porteira' ? 'porteira' : 'galho');
    let emote = null; if (this.emote) { const t = G.time - this.emote.t0; if (t < EMOTES[this.emote.id].dur) emote = { id: this.emote.id, t }; else { this.emote = null; document.querySelectorAll('#emoBar button.play').forEach(b => b.classList.remove('play')); } }
    return { wid, wsk: p && p.s ? p.s : Cos.skinOf(wid), emote };
  }
};
/* som de sininho (compra / presente) */
Sfx.prototype.jingle = function () { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, .5); if (!o) return; [1319, 1568, 1976, 2637, 1976, 2637].forEach((f, i) => { this.tone(o, t + i * .07, 'sine', f, f, .22, .45); this.tone(o, t + i * .07, 'triangle', f * 2, f * 2, .1, .12); }); };
/* luzinhas da tela de carregamento + dicas */
(function () {
  const g = document.querySelector('.ld-bulbs2'); if (g) { const cols = ['#ff3a3a', '#3aff6a', '#ffd23a', '#3ab8ff', '#ff3aa8']; let h = ''; for (let i = 0; i <= 32; i++) { const x = i / 32 * 1600, y = 10 + Math.abs(Math.sin(i / 32 * PI * 4)) * 60 - (i % 8 === 0 ? 0 : 0); h += `<circle cx="${x.toFixed(0)}" cy="${(y + 8).toFixed(0)}" r="7" fill="${cols[i % 5]}" style="color:${cols[i % 5]}"/>`; } g.innerHTML = h; }
  const lg = document.getElementById('ldLogo'), src = document.querySelector('#menu .logo svg'); if (lg && src) { let h = src.outerHTML; const ids = [...h.matchAll(/id="([^"]+)"/g)].map(x => x[1]); for (const id of ids) h = h.split('"' + id + '"').join('"' + id + '_ld"').split('#' + id + ')').join('#' + id + '_ld)').split('"#' + id + '"').join('"#' + id + '_ld"'); lg.innerHTML = h; }
  const tip = document.getElementById('ldTip'); if (tip) { let i = Math.floor(Math.random() * LOAD_TIPS.length); const show = () => { tip.style.opacity = '0'; setTimeout(() => { tip.innerHTML = LOAD_TIPS[i++ % LOAD_TIPS.length]; tip.style.opacity = '1'; }, 300); }; show(); const iv = setInterval(() => { if (!document.getElementById('loading') || document.getElementById('loading').classList.contains('hidden')) clearInterval(iv); else show(); }, 3200); }
})();
/* ---------- cena 3D do menu: decoração de Natal ---------- */
function menuXmas(t, dt, ccx, ccz) {
  const M = MENU, W = G.map.W, m = G.R.dyn, yaw = M.az + M.yo, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const at = (f, r) => { const x = ccx + fx * f + rx * r, z = ccz + fz * f + rz * r; return { x, z, y: W.heightAt(x, z) }; };
  if (!G.xmas || G.xmas.map !== G.map) {
    let s = 9; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647, patches = [];
    for (let i = 0; i < 46; i++) { const f = 1.6 + rn() * 14, r = (rn() - .5) * 18; if (Math.abs(r) < 1.3 && f > 2.5 && f < 5.2) continue; patches.push(Object.assign(at(f, r), { a: rn() * 3, sx: .5 + rn() * 1.6, sz: .4 + rn() * 1.1 })); }
    G.xmas = { map: G.map, tree: at(10.5, -3.1), snowman: at(8.2, 2.9), gifts: [[9.4, -2.2, 0xd81e2a, 0xffd23a], [9.9, -4.1, 0x2a8a4a, 0xf8f4ee], [11.2, -1.9, 0x2f6fd0, 0xffd23a], [9.0, -3.2, 0xffd23a, 0xd81e2a], [7.6, 2.0, 0x9a3ad8, 0xf8f4ee]].map(([f, r, c, c2]) => Object.assign(at(f, r), { c, c2, s: .32 + ((f * 7) % 1) * .2 })), patches };
  }
  const X = G.xmas, T = X.tree;
  /* montinhos de neve no chão */
  m.mat(TX.white, 40).col(0xf2f6ff).uvs(1, 1); for (const p of X.patches) { m.push().tr(p.x, p.y - .02, p.z).ry(p.a); m.sph(p.sx, .06, p.sz, 18, 4, 0, 0, 0); m.pop(); }
  /* árvore de Natal com bolas e pisca-pisca */
  m.push().tr(T.x, T.y, T.z); m.mat(TX.wood, 0).col(0x4a2a14).uvs(1, 1).cyl(.14, .14, .5, 8, 0, .25, 0, 3);
  const L = [[1.25, .45, .9], [1.0, .3, 1.55], [.75, .15, 2.15], [.48, .02, 2.65]];
  for (const [r0, , y] of L) { m.mat(TX.leaf, 0).col(0x1f5a34).cyl(r0, .02, 1.0, 12, 0, y, 0, 3); m.mat(TX.white, 30).col(0xf4f8ff).cyl(r0 * .98, r0 * .82, .08, 12, 0, y - .46, 0, 3); }
  const cols = [0xff2a3a, 0xffd23a, 0x3ab8ff, 0x3aff6a, 0xff3ad8];
  for (let i = 0; i < 46; i++) { const k = i / 46, h = .55 + k * 2.3, rr = (1 - k) * 1.15 + .08, a = i * 2.4; const on = Math.sin(t * 3 + i * 1.7) > -.2; m.mat(TX.white, 200, 0, on ? 127 : 20).col(cols[i % 5]).sph(.055, .055, .055, 6, 4, Math.cos(a) * rr, h, Math.sin(a) * rr); }
  m.push().tr(0, 3.25, 0).ry(t * .8); m.mat(TX.white, 0, 0, 127).col(0xffe46a); for (let k = 0; k < 5; k++) { m.push().rz(k * TAU / 5).box(.09, .32, .07, 0, .14, 0).pop(); } m.sph(.12, .12, .1, 8, 6, 0, 0, 0); m.pop();
  m.pop();
  /* presentes */
  for (const g of X.gifts) { const s = g.s; m.push().tr(g.x, g.y, g.z).ry(g.x * 3); m.mat(TX.white, 60).col(g.c).box(s, s * .8, s, 0, s * .4, 0); m.mat(TX.white, 120, 0, 10).col(g.c2).box(s * 1.01, s * .82, s * .18, 0, s * .4, 0).box(s * .18, s * .82, s * 1.01, 0, s * .4, 0); m.push().tr(0, s * .85, 0); for (const sd of [-1, 1]) m.push().rz(sd * .7).box(s * .1, s * .3, s * .12, sd * s * .1, 0, 0).pop(); m.pop(); m.pop(); }
  /* boneco de neve acenando */
  const S = X.snowman; m.push().tr(S.x, S.y, S.z).ry(yaw + Math.PI * .85); m.mat(TX.white, 30).col(0xf6f8ff).uvs(1, 1).sph(.55, .5, .55, 12, 8, 0, .45, 0).sph(.4, .38, .4, 12, 8, 0, 1.15, 0).sph(.28, .28, .28, 12, 8, 0, 1.68, 0);
  m.mat(TX.white, 0).col(0x1a1a1a).box(.06, .06, .03, -.09, 1.74, -.26).box(.06, .06, .03, .09, 1.74, -.26).box(.06, .06, .03, 0, 1.2, -.38).box(.06, .06, .03, 0, 1.0, -.39);
  m.mat(TX.white, 0).col(0xff8a1a).push().tr(0, 1.67, -.3).rx(-PI / 2).cyl(.05, .0, .26, 8, 0, .13, 0, 1).pop();
  m.mat(TX.cloth, 0).col(0xd81e2a).cyl(.3, .3, .1, 12, 0, 1.43, 0, 3).box(.12, .4, .05, .14, 1.25, -.28);
  m.mat(TX.cloth, 0).col(0xd81e2a).push().tr(0, 1.9, 0).rz(-.25).cyl(.28, .16, .18, 10, 0, 0, 0, 3).push().tr(-.05, .17, 0).rz(.5).cyl(.15, .02, .3, 8, 0, .1, 0, 3).pop(); m.mat(TX.cloth, 0).col(0xf6f2ea).cyl(.3, .3, .07, 10, 0, -.06, 0, 3).sph(.07, .07, .07, 6, 4, -.22, .35, 0); m.pop();
  m.mat(TX.wood, 0).col(0x5a3a1a); m.push().tr(-.38, 1.2, 0).rz(.9).box(.05, .7, .05, 0, .3, 0).pop(); m.push().tr(.38, 1.2, 0).rz(-.6 - Math.max(0, Math.sin(t * 3)) * .6).box(.05, .7, .05, 0, .3, 0).pop();
  m.pop();
  /* neve caindo */
  const fxs = G.fx; if (fxs) { G.flakeAcc = (G.flakeAcc || 0) + dt * 70; while (G.flakeAcc > 1) { G.flakeAcc--; const p = at(1.2 + Math.random() * 12, (Math.random() - .5) * 14); fxs.P({ x: p.x, y: p.y + 4.5 + Math.random() * 2, z: p.z, vx: (Math.random() - .5) * .4, vy: -.7 - Math.random() * .5, vz: (Math.random() - .5) * .4, life: 9, s0: .035, s1: .03, r: 1, g: 1, b: 1, a0: .9, add: true, ty: 2, drag: 0, grav: 0 }); } }
}
/* ---------- roda de emotes na partida (Y → 1/2/3, ou toque) ---------- */
const EmoteWheel = {
  open: false,
  toggle(v) {
    this.open = v === undefined ? !this.open : v; let el = $('emwheel');
    if (!this.open) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'emwheel'; $('hud').appendChild(el); }
    const pos = [[210, 75], [327, 278], [93, 278]];
    el.innerHTML = '<div class="ew-bg"></div>' + profile.emotes.map((id, i) => `<button data-i="${i}" style="left:${pos[i][0]}px;top:${pos[i][1]}px" ${id ? '' : 'disabled'}><b>${i + 1}</b><em>${id ? EMOTES[id].ico : '·'}</em>${id ? esc(EMOTES[id].name) : 'Vazio'}</button>`).join('') + '<div class="ew-c">EMOTES<small>1 · 2 · 3 ou toque</small></div>';
    el.onclick = e => { const b = e.target.closest('button'); if (b) this.pick(+b.dataset.i); else this.toggle(false); };
    clearTimeout(this._t); this._t = setTimeout(() => this.toggle(false), 4000); sfx.ui(0);
  },
  pick(i) { const id = profile.emotes[i]; this.toggle(false); if (!id || !G.me || !G.me.alive) return; Input.acts.push('em:' + id); sfx.ui(1); },
  active(me) {
    const E = G.myEmote; if (!E || !EMOTES[E.id]) return false;
    const ok = G.time - E.t0 < EMOTES[E.id].dur && (me.m.hspd || 0) < 1.2 && !Input.btn[0] && !Input.btn[1];
    if (!ok) { G.myEmote = null; const en = G.ents.get(G.myId); if (en) en.emote = null; } return ok;
  },
  camera(me, t) {
    const c = G.cam, E = G.myEmote, k = Math.min(1, (t - E.t0) / .5), yaw = me.m.yaw + Math.sin((t - E.t0) * .35) * .5, fx = -Math.sin(yaw), fz = -Math.cos(yaw), d = 1.2 + 2.3 * easeOut(k);
    let x = me.m.x + fx * d, z = me.m.z + fz * d; const y = me.m.y + 1.35 + .25 * k;
    const h = G.map.W.raycast(me.m.x, me.m.y + 1.3, me.m.z, fx, 0, fz, d, true); if (h && h.t < d) { x = me.m.x + fx * (h.t - .25); z = me.m.z + fz * (h.t - .25); }
    c.x = x; c.y = y; c.z = z; c.yaw = yaw + Math.PI; c.pitch = -.16; c.roll = 0;
  }
};
