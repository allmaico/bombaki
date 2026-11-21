/* =====================================================================
   591_flowui.js — interface do fluxo 5x5 (cliente): SELEÇÃO DE AGENTES,
   CARREGAMENTO DO MAPA, barreiras (cerca energética) com animação e som,
   avisos de fase. O estado vem SEMPRE do anfitrião (snapshot / sim local).
   ===================================================================== */
'use strict';
/* participantes da seleção (anfitrião: direto da simulação; cliente: do snapshot) */
function flowRoster() {
  if (G.sim) return G.sim.players.map(p => ({ id: p.id, name: p.name, sq: p.squad | 0, far: p.farmer || '', rdy: !!p.ready, bot: !!p.bot, skin: p.skin | 0, me: p.id === G.myId }));
  return (G.sel || []).map(a => { const r = G.rinfo.get(a[0]) || {}; return { id: a[0], sq: a[1] | 0, far: a[2] >= 0 ? FARMER_IDS[a[2]] : '', rdy: !!a[3], bot: !!a[4], name: r.name || '…', skin: r.skin | 0, me: a[0] === G.myId }; });
}
const FlowUI = {
  sel: '', key: '', shown: '', rdySent: false, autoSent: false, barK: 0, barWant: false, lastPh: '',
  el(id, cls) { let e = $(id); if (!e) { e = document.createElement('div'); e.id = id; e.className = cls; e.classList.add('hidden'); $('hud').appendChild(e); e.onclick = ev => this.click(ev); } return e; },
  reset() { this.sel = ''; this.key = ''; this.rdySent = false; this.autoSent = false; this.barK = 0; this.barWant = false; this.lastPh = ''; for (const id of ['agsel', 'agload']) { const e = $(id); if (e) e.classList.add('hidden'); } },
  /* chamado a cada quadro */
  update(dt) {
    const ph = G.scene === 'play' && isTat() ? G.phase : '', sel = ph === 'select', load = ph === 'loading';
    const a = this.el('agsel', 'agsel'), b = this.el('agload', 'agload');
    a.classList.toggle('hidden', !sel); b.classList.toggle('hidden', !load);
    if (ph !== this.lastPh) this.onPhase(ph, this.lastPh);
    if (sel || load) { Input.menu = true; const cp = $('click2play'); if (cp) cp.classList.add('hidden'); if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { } } }
    if (sel) {
      this.renderSel();
      /* testes automáticos (?test=1): trava o agente do perfil na hora */
      if (QS.get('test') && !this.autoSent) { this.autoSent = true; Input.acts.push('far:' + (FARMERS[profile.farmer] ? profile.farmer : 'peao')); }
    }
    if (load) { this.renderLoad(); if (!this.rdySent && G.kind === 'client' && G.map && G.R) { this.rdySent = true; Input.acts.push('rdy'); } }
    /* barreiras: colisão no mundo local (predição do cliente) + animação */
    const want = ph === 'prep'; const bar = isTat() && G.map && G.nav ? computeBarrier(G.map, G.nav) : null;
    if (bar && !G.sim) setBarrier(G.map.W, bar, want);
    if (want !== this.barWant) { this.barWant = want; if (bar && G.scene === 'play') sfx.barrier && sfx.barrier(want); }
    this.barK = clamp(this.barK + (want ? dt * 2.2 : -dt * 1.6), 0, 1);
  },
  onPhase(ph, prev) {
    this.lastPh = ph; const hud = G.hud;
    if (ph === 'select') { this.sel = ''; this.key = ''; this.rdySent = false; sfx.ui && sfx.ui(1); }
    else if (ph === 'loading') { this.key = ''; sfx.ui && sfx.ui(1); }
    if (prev === 'loading' && ph === 'prep') { Input.menu = Shop.open || Bag.open || BigMap.open; if (!G.locked && !Input.force) $('click2play').classList.remove('hidden'); try { lockPointer(); } catch (e) { } }
  },
  /* ---------------- SELEÇÃO ---------------- */
  renderSel() {
    const R = flowRoster(), me = R.find(r => r.me); if (!me) return; const mySq = me.sq, sw = G.sim ? G.sim.swap | 0 : G.swap | 0;
    const allies = R.filter(r => r.sq === mySq), foes = R.filter(r => r.sq !== mySq), t = Math.max(0, Math.ceil(G.pt || 0));
    if (!this.sel) this.sel = me.far || (FARMERS[profile.farmer] ? profile.farmer : FARMER_IDS[0]);
    const key = JSON.stringify([R.map(r => [r.id, r.far, r.name]), this.sel, FarmerPick.readyMask()]), el = $('agsel');   /* retratos 3D ficam prontos aos poucos: redesenha quando chega um novo */
    if (key === this.key) { const tm = el.querySelector('.as-tm b'); if (tm) tm.textContent = String(t); el.classList.toggle('urg', t <= 10); return; } this.key = key;
    const side = (mySq ^ sw) === 0 ? 'ATAQUE' : 'DEFESA', takenH = f => allies.some(r => !r.me && r.far === f && !r.bot), byBot = f => allies.find(r => !r.me && r.far === f && r.bot);
    const slot = (r, foe) => `<div class="as-slot${r.far ? ' lk' : ''}${r.me ? ' me' : ''}" style="--fc:${r.far && !foe ? FARMERS[r.far].col : '#555'}">
        <div class="as-pic">${r.far && !foe ? `${FarmerPick.img(r.far)}` : `<span>${foe && r.far ? '✔' : '?'}</span>`}</div>
        <div class="as-nm"><b>${esc(r.name)}${r.bot ? ' <small>BOT</small>' : ''}${r.me ? ' <small>(você)</small>' : ''}</b><span>${r.far ? (foe ? 'AGENTE TRAVADO' : esc(FARMERS[r.far].name)) : 'escolhendo…'}</span></div></div>`;
    const F = FARMERS[this.sel], locked = !!me.far;
    el.innerHTML = `<div class="as-top"><div class="as-ttl"><b class="fnt">SELECIONE SEU AGENTE</b><small>${esc(G.map && G.map.name || '')} · seu time começa na <b>${side}</b> · cada agente uma vez por equipe</small></div><div class="as-tm"><b>${t}</b><small>segundos</small></div></div>
      <div class="as-main">
        <div class="as-col"><h4>SEU TIME</h4>${allies.map(r => slot(r, false)).join('')}</div>
        <div class="as-mid">
          <div class="as-hero" style="--fc:${F.col}"><div class="as-big">${FarmerPick.img(this.sel)}</div>
            <div class="as-info"><b class="fnt">${esc(F.name.toUpperCase())}</b><em>${esc(F.role)}</em><p>${esc(F.desc)}</p>
              ${F.ab.map((ab, i) => `<div class="as-ab">${Icons.img('ab_' + ab.id, 'sm', 'fpi')}<div><b>${esc(keyName(bindOf(AB_KEYS[i])))} · ${esc(ab.name)}</b>${ab.ult ? ' <em class="as-ult">SUPREMA · ' + ab.cost + ' pts</em>' : ab.sig ? ' <em class="as-sig">ASSINATURA</em>' : ''}<small>${esc(ab.desc)}</small></div></div>`).join('')}</div></div>
          <div class="as-cards">${FARMER_IDS.map(f => { const X = FARMERS[f], h = takenH(f), bb = byBot(f); return `<button class="as-card${f === this.sel ? ' sel' : ''}${me.far === f ? ' mine' : ''}${h ? ' taken' : ''}" data-f="${f}" ${h || locked ? 'disabled' : ''} style="--fc:${X.col}" title="${esc(X.name)}${bb ? ' — com ' + esc(bb.name) + ' (bot troca com você)' : ''}">${FarmerPick.img(f)}<span>${esc(X.name)}</span>${h ? '<i>EM USO</i>' : bb ? '<i class="bt">BOT</i>' : ''}</button>`; }).join('')}</div>
          <button class="as-lock" data-lock="1" ${locked || takenH(this.sel) ? 'disabled' : ''}>${locked ? '✔ AGENTE TRAVADO — aguardando os outros' : '🔒 TRAVAR ' + esc(F.name.toUpperCase())}</button>
        </div>
        <div class="as-col foe"><h4>ADVERSÁRIOS</h4>${foes.map(r => slot(r, true)).join('')}</div>
      </div>
      <div class="as-foot">Quando os 10 travarem, a partida começa na hora. Se o tempo acabar, quem não escolheu recebe um agente livre.</div>`;
    Icons.fill(el);
  },
  click(ev) {
    const c = ev.target.closest('[data-f]'); if (c && !c.disabled) { this.sel = c.dataset.f; sfx.ui(0); this.key = ''; return; }
    if (ev.target.closest('[data-lock]')) { const b = ev.target.closest('[data-lock]'); if (b.disabled) return; Input.acts.push('far:' + this.sel); profile.farmer = this.sel; saveProfile(); sfx.ui(1); b.disabled = true; }
  },
  /* ---------------- CARREGAMENTO ---------------- */
  renderLoad() {
    const R = flowRoster(), me = R.find(r => r.me); if (!me) return; const mySq = me.sq;
    const n = R.filter(r => r.rdy).length, key = JSON.stringify([R.map(r => [r.far, r.rdy]), FarmerPick.readyMask()]), el = $('agload');
    if (key === this.key) return; this.key = key;
    const team = (L, cls) => `<div class="al-team ${cls}">${L.map(r => `<div class="al-p${r.rdy ? ' ok' : ''}" style="--fc:${r.far ? FARMERS[r.far].col : '#555'}"><div class="al-pic">${r.far ? `${FarmerPick.img(r.far)}` : ''}</div><b>${esc(r.name)}</b><span>${r.far ? esc(FARMERS[r.far].name) : ''}</span><i>${r.rdy ? '✔ PRONTO' : 'carregando…'}</i></div>`).join('')}</div>`;
    el.innerHTML = `<div class="al-map"><canvas width="520" height="420"></canvas><div class="al-mn"><small>MAPA</small><b class="fnt">${esc(G.map && G.map.name || 'Mapa')}</b><span>MAPA CARREGANDO…</span></div></div>
      ${team(R.filter(r => r.sq === mySq), 'ally')}<div class="al-vs fnt">VS</div>${team(R.filter(r => r.sq !== mySq), 'foe')}
      <div class="al-bar"><i style="width:${(n / Math.max(1, R.length) * 100).toFixed(0)}%"></i><span>${n}/${R.length} prontos</span></div>`;
    this.drawMap(el.querySelector('canvas'));
  },
  /* ilustração do mapa: o minimapa estático + bombsites, spawns e barreiras */
  drawMap(cv) {
    const hud = G.hud, img = hud && hud.mmStatic, B = hud && hud.mmB, map = G.map; const c = cv.getContext('2d'); c.fillStyle = '#2a1f14'; c.fillRect(0, 0, cv.width, cv.height); if (!img || !B || !map) return;
    const VB = map.tacB || map.viewB || B, MS = hud.mmS || 4, s = Math.min(cv.width / (VB.x1 - VB.x0), cv.height / (VB.z1 - VB.z0)), ox = (cv.width - (VB.x1 - VB.x0) * s) / 2, oz = (cv.height - (VB.z1 - VB.z0) * s) / 2, X = x => ox + (x - VB.x0) * s, Z = z => oz + (z - VB.z0) * s;
    c.drawImage(img, (VB.x0 - B.x0) * MS, (VB.z0 - B.z0) * MS, (VB.x1 - VB.x0) * MS, (VB.z1 - VB.z0) * MS, ox, oz, (VB.x1 - VB.x0) * s, (VB.z1 - VB.z0) * s);
    for (const id in map.sites) { const S = map.sites[id]; c.fillStyle = '#ffc61a33'; c.strokeStyle = '#ffc61a'; c.lineWidth = 2; c.fillRect(X(S.x0), Z(S.z0), (S.x1 - S.x0) * s, (S.z1 - S.z0) * s); c.strokeRect(X(S.x0), Z(S.z0), (S.x1 - S.x0) * s, (S.z1 - S.z0) * s); c.fillStyle = '#fff'; c.font = '900 30px Lilita One, Impact'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(id, X(S.x), Z(S.z)); }
    const bar = computeBarrier(map, G.nav); if (bar) { c.fillStyle = '#ff4a3a'; for (const q of bar.cells) c.fillRect(X(q.x) - 2, Z(q.z) - 2, 4, 4); }
    const sp = (L, col, t) => { if (!L || !L.length) return; let x = 0, z = 0; for (const p of L) { x += p.x; z += p.z; } x /= L.length; z /= L.length; c.fillStyle = col; c.beginPath(); c.arc(X(x), Z(z), 11, 0, 6.3); c.fill(); c.fillStyle = '#fff'; c.font = '900 12px Nunito'; c.fillText(t, X(x), Z(z) + 22); };
    sp(map.spawns.atk, '#ee3f35', 'ATAQUE'); sp(map.spawns.def, '#2f7bff', 'DEFESA');
  }
};
/* ---------------- barreira (cerca energética) no mundo 3D ----------------
   cerca de madeira (palanques + travessas) com fios elétricos e uma cortina de luz translúcida */
function drawBarrier(m, t) {
  const k = FlowUI.barK; if (k <= .01 || !isTat() || !G.map || !G.nav) return; const bar = computeBarrier(G.map, G.nav); if (!bar) return;
  const R = G.R, e = easeOut(k), h = 3.3 * e, cam = G.cam, gw = G.nav.gw, near = (x, z, r) => Math.abs(x - cam.x) < r && Math.abs(z - cam.z) < r;
  for (const c of bar.cells) {
    if (!near(c.x, c.z, 95)) continue; const i = c.k % gw, j = (c.k / gw) | 0, y0 = c.y + (c.low ? 1.1 : 0), hh = c.low ? h * .7 : h;
    if (!c.low && (i + j) % 3 === 0) { m.mat(TX.wood, 0).col(0x7a5230).uvs(1, 1).box(.22, hh + .3, .22, c.x, c.y + (hh + .3) / 2, c.z); m.mat(TX.white, 0, 0, 255).col(0xfff27a).box(.3, .14, .3, c.x, c.y + hh + .36, c.z); }
    /* cortina de energia: faixas verticais aditivas que se sobrepõem */
    const fl = .3 + .1 * Math.sin(t * 6 + c.x * .7 + c.z * .5);
    R.pushBeam(c.x, y0 + .02, c.z, .95, c.x, y0 + hh, c.z, fl * k, .45, 1, .12);
  }
  for (const [a, b] of bar.links) {
    if (!near(a.x, a.z, 75)) continue;
    /* travessas de madeira */
    for (const y of [.75, 2.1]) if (y < h) limbTo(m, [a.x, a.y + y, a.z], [b.x, b.y + y, b.z], .09, .12, TX.wood, 0x8a6038);
    /* fios elétricos (cintilam) */
    for (const y of [.45, 1.15, 1.75, 2.45, 3.05]) { if (y > h) break; const f = .5 + .5 * Math.sin(t * 11 + a.x * 2 + y * 5); R.pushBeam(a.x, a.y + y, a.z, .06, b.x, b.y + y, b.z, (.7 + f * .3) * k, .7, 1, .2); }
    R.pushBeam(a.x, a.y + .04, a.z, .35, b.x, b.y + .04, b.z, .5 * k, 1, .85, .2);   /* faixa brilhante no chão */
  }
}
