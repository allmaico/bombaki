/* =====================================================================
   55_hud.js — HUD (DOM + canvas 2D): minimapa, placar, hotbar, munição,
   killfeed, lista de jogadores, mira, hitmarker, banners, scoreboard, etc.
   Recebe um "estado de visão" V do controlador (60_game.js) a cada quadro.
   ===================================================================== */
'use strict';
const $ = id => document.getElementById(id);
const hex6 = n => '#' + (n >>> 0).toString(16).padStart(6, '0');
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return String((s / 60) | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- rosto pixelado dos personagens (avatar) ---------- */
function drawFace(cv, skinIdx, px) {
  const S = typeof skinIdx === 'object' && skinIdx ? skinIdx : SKINS[(skinIdx | 0) % SKINS.length], N = 16, c = cv.getContext('2d'); px = px || (cv.width / N); c.imageSmoothingEnabled = false; c.clearRect(0, 0, cv.width, cv.height);
  const R = (x, y, w, h, col) => { c.fillStyle = typeof col === 'number' ? hex6(col) : col; c.fillRect(x * px, y * px, w * px, h * px); };
  if (S.special === 'chicken') {
    R(0, 0, 16, 16, '#9bd0ff'); R(3, 4, 10, 10, 0xf8f4ea); R(5, 1, 6, 3, 0xd9342b); R(6, 0, 2, 2, 0xd9342b); R(4, 7, 2, 2, 0x111); R(10, 7, 2, 2, 0x111); R(6, 9, 4, 3, 0xf2a62a); R(6, 12, 3, 2, 0xd9342b); return;
  }
  R(0, 0, 16, 16, S.hood ? 0x3a5aa8 : 0x9bd0ff);
  if (S.hood) { R(1, 1, 14, 15, S.shirt); R(0, 4, 2, 12, S.shirt2); R(14, 4, 2, 12, S.shirt2); }
  R(3, 3, 10, 11, S.skin);
  if (S.special === 'pig') { R(5, 8, 6, 4, 0xe88aa0); R(6, 9, 1, 2, 0x7a3a50); R(9, 9, 1, 2, 0x7a3a50); R(3, 1, 3, 4, 0xe88aa0); R(10, 1, 3, 4, 0xe88aa0); }
  /* cabelo */
  const hc = S.hair;
  if (S.hairStyle === 'spiky') { R(3, 2, 10, 3, hc); R(3, 1, 2, 2, hc); R(7, 0, 2, 3, hc); R(11, 1, 2, 2, hc); R(3, 5, 2, 2, hc); R(11, 5, 2, 2, hc); }
  else if (S.hairStyle === 'short') { R(3, 2, 10, 3, hc); R(3, 5, 2, 2, hc); R(11, 5, 2, 2, hc); }
  else if (S.hairStyle === 'comb') { R(5, 0, 6, 3, hc); R(7, 3, 2, 1, hc); }
  else if (S.hairStyle === 'leaf') { R(3, 2, 10, 3, hc); R(6, 0, 4, 2, 0x4a9a3a); R(5, 1, 2, 1, 0x6cc24e); R(9, 1, 2, 1, 0x6cc24e); }
  if (S.hat === 'jurema') { R(1, 3, 14, 2, 0x4a6a2a); R(4, 1, 8, 3, 0x5a7a34); R(4, 3, 8, 1, 0xd8a838); R(11, 1, 3, 2, 0xffc61a); }
  if (S.hat === 'straw' || S.hat === 'strawBig') { R(1, 3, 14, 2, 0xe0c068); R(4, 1, 8, 3, 0xe8cc78); R(4, 3, 8, 1, 0xb23a2a); }
  else if (S.hat === 'cap') { R(3, 1, 10, 3, 0xd9342b); R(3, 4, 12, 1, 0xa82820); }
  else if (S.hat === 'bucket') { R(2, 3, 12, 2, 0x9a9aa0); R(4, 1, 8, 3, 0xb8b8c0); }
  /* olhos */
  if (!S.special || S.special === 'pig') { R(4, 7, 2, 2, 0xffffff); R(10, 7, 2, 2, 0xffffff); R(5, 7, 1, 2, 0x1a1a22); R(10, 7, 1, 2, 0x1a1a22); }
  /* barba / boca */
  if (S.beard === 'full') { R(3, 10, 10, 4, S.hair); R(6, 10, 4, 1, S.skin); R(6, 11, 4, 1, 0x5a2a20); }
  else if (S.beard === 'mustache') { R(5, 10, 6, 1, S.hair); R(6, 12, 4, 1, 0x7a3a2a); }
  else if (S.special !== 'pig') R(6, 11, 4, 1, 0x8a3a2a);
  R(3, 14, 10, 2, S.shirt);
}

/* ---------- ícones 2D das armas (hotbar) ---------- */
function drawWeaponIcon(cv, id, col) {
  if (typeof drawIcon3D === 'function' && drawIcon3D(cv, id)) return;
  const c = cv.getContext('2d'), W = cv.width, H = cv.height; c.clearRect(0, 0, W, H); c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const k = W / 132; c.scale(k, k);
  const bark = '#8a5a30', dark = '#3a2210', st = (w, s) => { c.lineWidth = w || 3; c.strokeStyle = s || '#1c0f06'; };
  const poly = (pts, f) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fillStyle = f; c.fill(); st(3); c.stroke(); };
  c.translate(0, (H / k - 92) / 2);
  if (id === 'galho') {
    poly([6, 40, 34, 36, 62, 34, 100, 36, 126, 38, 126, 46, 100, 46, 62, 52, 36, 66, 20, 60], bark);
    poly([62, 52, 76, 52, 80, 78, 66, 80], '#6a4220'); poly([34, 36, 54, 32, 56, 44, 34, 46], '#a8743c');
    c.fillStyle = '#4da23a'; c.beginPath(); c.ellipse(46, 30, 9, 4, -.5, 0, 6.3); c.fill(); st(2); c.stroke();
    c.fillStyle = dark; c.fillRect(104, 41, 22, 4); c.fillStyle = '#ffd24a'; c.fillRect(70, 36, 8, 3);
  } else if (id === 'estilingue') {
    st(8, '#1c0f06'); c.beginPath(); c.moveTo(66, 86); c.lineTo(66, 54); c.lineTo(42, 18); c.moveTo(66, 54); c.lineTo(90, 18); c.stroke();
    st(5, '#8a5a30'); c.beginPath(); c.moveTo(66, 86); c.lineTo(66, 54); c.lineTo(42, 18); c.moveTo(66, 54); c.lineTo(90, 18); c.stroke();
    st(3, '#d9342b'); c.beginPath(); c.moveTo(42, 18); c.quadraticCurveTo(66, 44, 90, 18); c.stroke(); c.fillStyle = '#9a9aa0'; c.beginPath(); c.arc(66, 34, 5, 0, 6.3); c.fill(); st(2); c.stroke();
  } else if (id === 'vassoura') {
    poly([4, 44, 18, 36, 36, 38, 36, 52, 18, 54], '#e0c068'); c.strokeStyle = '#a8883a'; c.lineWidth = 1.5; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(6 + i * 5, 42 + i * .5); c.lineTo(14 + i * 4, 48); c.stroke(); }
    poly([36, 42, 126, 42, 126, 48, 36, 48], '#7a5a34'); poly([56, 30, 92, 30, 92, 40, 56, 40], '#2a2a30'); poly([60, 48, 74, 48, 72, 70, 62, 70], '#6a4220'); c.fillStyle = '#7ad0ff'; c.fillRect(90, 32, 3, 6);
  } else if (id === 'colher') {
    poly([34, 38, 96, 38, 100, 50, 34, 54], '#7a7a84'); poly([96, 34, 126, 30, 128, 52, 100, 54], '#d8d8de'); c.fillStyle = '#9a9aa4'; c.beginPath(); c.ellipse(116, 42, 8, 11, 0, 0, 6.3); c.fill(); st(2); c.stroke();
    poly([52, 54, 68, 54, 66, 82, 52, 82], '#3a3a42'); poly([10, 42, 36, 38, 36, 54, 14, 58], '#8a5a30'); poly([36, 50, 52, 50, 48, 68, 40, 68], '#5a3a20');
  } else if (id === 'faca') {
    poly([60, 40, 128, 34, 120, 50, 60, 52], '#d8dce4'); poly([14, 38, 60, 38, 60, 54, 14, 54], '#8a5a30'); poly([56, 34, 64, 34, 64, 58, 56, 58], '#c8a850'); c.fillStyle = '#fff8'; c.fillRect(70, 38, 44, 2);
  } else if (id === 'batata') {
    c.fillStyle = '#faf3e2'; c.beginPath(); c.ellipse(64, 50, 24, 31, 0, 0, 6.3); c.fill(); st(4); c.stroke(); c.fillStyle = '#e8d8b8'; c.beginPath(); c.arc(56, 40, 4, 0, 6.3); c.arc(72, 60, 3, 0, 6.3); c.fill();
    st(3, '#3a2a18'); c.beginPath(); c.moveTo(64, 19); c.quadraticCurveTo(72, 8, 82, 12); c.stroke(); c.fillStyle = '#ffb320'; c.beginPath(); c.arc(84, 11, 5, 0, 6.3); c.fill();
  } else if (id === 'porteira') {
    poly([6, 46, 40, 40, 52, 40, 52, 56, 36, 64, 14, 62], '#c89a60'); c.strokeStyle = '#8a6a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(12, 50); c.lineTo(44, 46); c.moveTo(14, 57); c.lineTo(40, 53); c.stroke();
    poly([50, 38, 128, 34, 128, 41, 50, 45], '#3a3a40'); poly([50, 44, 128, 41, 128, 47, 50, 50], '#4a4a52'); poly([54, 48, 86, 46, 86, 54, 54, 56], '#8a5a30'); c.fillStyle = '#d8b04a'; c.fillRect(46, 38, 6, 12);
  } else if (id === 'mandioca') {
    poly([10, 56, 40, 40, 104, 36, 124, 46, 106, 60, 42, 66], '#9a6a3a'); c.fillStyle = '#f0e6d0'; c.beginPath(); c.ellipse(12, 58, 6, 8, .4, 0, 6.3); c.fill(); st(2); c.stroke();
    poly([62, 28, 82, 28, 82, 38, 62, 38], '#2a2a30'); c.fillStyle = '#ff3a2a'; c.beginPath(); c.arc(72, 33, 3, 0, 6.3); c.fill(); st(3, '#3a2a18'); c.beginPath(); c.moveTo(82, 32); c.quadraticCurveTo(96, 20, 104, 24); c.stroke();
  }
  c.restore();
}

/* ====================================================================== */
/* rosto 3D do personagem (mesma skin), gerado uma vez por skin — usado no TAB e na tela de resultados */
function faceUrl(sk) { const k = 'face|' + sk; if (Icons.url.has(k)) return Icons.url.get(k); let u = ''; try { const S = SKINS[sk % SKINS.length], c = G.R.renderIcon(m => drawHead(m, S, S.special), { w: 64, h: 64, ry: PI - .3, rx: .1, ss: 2, pad: 1.05 }); u = c ? c.toDataURL('image/png') : ''; } catch (e) { } Icons.url.set(k, u); return u; }
class HUD {
  constructor() {
    this.root = $('hud'); this.cache = {}; this.kfItems = []; this.map = null; this.mmStatic = null; this.mmc = $('mmc'); this.mmx = this.mmc.getContext('2d'); this.mmT = 0; this.hitT = 0; this.dmgA = 0; this.flashA = 0;
    this.slotEls = []; this.lastShot = new Map(); this.crossGap = 6; this.tabOn = false; this.msgT = 0; this.promptKey = '';
    this.buildCross(); this.buildHit(); this.buildHotbar(); this.dirEl = document.createElement('div'); this.dirEl.id = 'dmgdir'; this.dirEl.style.cssText = 'position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none'; this.root.appendChild(this.dirEl);
    this.dirs = [];
  }
  /* ---------- construção ---------- */
  buildCross() { const c = $('cross'); c.innerHTML = '<i></i><i></i><i></i><i></i><i class="dot"></i>'; this.crossEls = [...c.children]; }
  buildHit() { const h = $('hitm'); h.innerHTML = '<i></i><i></i><i></i><i></i>'; [...h.children].forEach((e, i) => { const a = 45 + i * 90; e.style.transform = `translate(-50%,-50%) rotate(${a}deg) translateX(1.7em)`; }); }
  buildHotbar() {
    const hb = $('hotbar'); hb.innerHTML = ''; this.slotEls = [];
    for (let i = 0; i < HOTBAR.length; i++) {
      const id = HOTBAR[i].ids[0], d = document.createElement('div'); d.className = 'slot'; d.innerHTML = `<span class="kn">${i + 1}</span><canvas width="132" height="92"></canvas><span class="am"></span><span class="nm">${esc(i === 0 ? 'Primária' : WEAPONS[id].short)}</span>`;
      drawWeaponIcon(d.querySelector('canvas'), id); hb.appendChild(d); this.slotEls.push({ el: d, id, slot: HOTBAR[i], am: d.querySelector('.am'), nm: d.querySelector('.nm'), cv: d.querySelector('canvas'), cls: '', icon: id });
    }
  }
  setMap(map, mode) {
    this.map = map; this.mode = mode; const B = map.bounds, S = 4; this.mmS = S;
    const w = Math.ceil((B.x1 - B.x0) * S), h = Math.ceil((B.z1 - B.z0) * S), cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
    const X = x => (x - B.x0) * S, Z = z => (z - B.z0) * S;
    c.fillStyle = '#58783a'; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .62); g.addColorStop(0, '#0000'); g.addColorStop(1, '#1e3a1688'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (const F of map.fields) { c.fillStyle = F.kind === 'corn' ? '#b5a845' : F.kind === 'cassava' ? '#7c9c48' : '#8f9a52'; c.fillRect(X(F.x0), Z(F.z0), (F.x1 - F.x0) * S, (F.z1 - F.z0) * S); c.strokeStyle = '#0002'; c.lineWidth = 1; for (let x = F.x0; x < F.x1; x += 3) { c.beginPath(); c.moveTo(X(x), Z(F.z0)); c.lineTo(X(x), Z(F.z1)); c.stroke(); } }
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const C of map.creeks) { c.strokeStyle = '#3d78a8'; c.lineWidth = C.w * S * 1.1; c.beginPath(); C.pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Z(p[1])) : c.moveTo(X(p[0]), Z(p[1]))); c.stroke(); }
    for (const L of map.lakes) { c.fillStyle = '#3d78a8'; c.beginPath(); c.ellipse(X(L.cx), Z(L.cz), L.rx * S, L.rz * S, 0, 0, 6.3); c.fill(); c.strokeStyle = '#6aa8d0'; c.lineWidth = 2; c.stroke(); }
    for (const R of map.roads) { c.strokeStyle = '#a58a5c'; c.lineWidth = R.w * S; c.beginPath(); R.pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Z(p[1])) : c.moveTo(X(p[0]), Z(p[1]))); c.stroke(); c.strokeStyle = '#c4aa7a'; c.lineWidth = R.w * S * .72; c.stroke(); }
    for (const m of map.mm) {
      if (m.t === 'rect') { c.fillStyle = m.c || '#6b4a32'; c.fillRect(X(m.x0), Z(m.z0), (m.x1 - m.x0) * S, (m.z1 - m.z0) * S); c.strokeStyle = '#0006'; c.lineWidth = 1.5; c.strokeRect(X(m.x0), Z(m.z0), (m.x1 - m.x0) * S, (m.z1 - m.z0) * S); }
      else if (m.t === 'circ') { c.fillStyle = m.c || '#999'; c.beginPath(); c.arc(X(m.x), Z(m.z), m.r * S, 0, 6.3); c.fill(); c.strokeStyle = '#0006'; c.lineWidth = 1.5; c.stroke(); }
      else if (m.t === 'line') { c.strokeStyle = m.c || '#8a6a44'; c.lineWidth = 2; c.beginPath(); c.moveTo(X(m.x0), Z(m.z0)); c.lineTo(X(m.x1), Z(m.z1)); c.stroke(); }
      else if (m.t === 'label') { c.font = `900 ${Math.round((m.small ? 5 : 11) * Math.max(1, S))}px Nunito, sans-serif`; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#000a'; c.fillStyle = '#fff4d6'; c.strokeText(m.name, X(m.x), Z(m.z) - 8); c.fillText(m.name, X(m.x), Z(m.z) - 8); }
      else if (m.t === 'tree') { c.fillStyle = '#2d5a24cc'; c.beginPath(); c.arc(X(m.x), Z(m.z), Math.max(2.4, m.r * S * .55), 0, 6.3); c.fill(); }
    }
    this.mmStatic = cv; this.mmSites = map.sites; this.mmB = B;
  }
  /* ---------- pequenas utilidades ---------- */
  set(id, key, v, fn) { if (this.cache[key] === v) return; this.cache[key] = v; fn ? fn(v) : ($(id).textContent = v); }
  html(id, key, v) { if (this.cache[key] === v) return; this.cache[key] = v; $(id).innerHTML = v; }
  show(id, on) { const e = $(id), k = 'vis' + id; if (this.cache[k] === on) return; this.cache[k] = on; e.classList.toggle('hidden', !on); }
  banner(h, p, col) { const b = $('banner'); b.querySelector('h1').textContent = h; b.querySelector('h1').style.color = col || ''; b.querySelector('p').textContent = p || ''; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
  feed(text, col) { const f = $('feed'), d = document.createElement('div'); d.textContent = text; if (col) d.style.color = col; f.appendChild(d); setTimeout(() => d.remove(), 2200); while (f.children.length > 3) f.firstChild.remove(); }
  killfeed(k) {
    const f = $('kf'), d = document.createElement('div'); d.className = 'kfe' + (k.me ? ' me' : '');
    const nm = (n, c) => `<span style="color:${c || '#fff'}">${esc(n)}</span>`;
    d.innerHTML = k.self ? `${nm(k.vn, k.vc)} <i>${esc(k.verb)}</i>` : `${nm(k.an, k.ac)} <i>${esc(k.verb)}</i> ${nm(k.vn, k.vc)}${k.hs ? ' <span title="Caprichou no chapéu!" style="color:#ffd23a">🎩</span>' : ''}`;
    f.appendChild(d); setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = 0; setTimeout(() => d.remove(), 420); }, 6000); while (f.children.length > 6) f.firstChild.remove();
  }
  hitMarker(head, kill) { const h = $('hitm'); h.className = 'on' + (kill ? ' kill' : '') + (head ? ' head' : ''); clearTimeout(this._hmT); this._hmT = setTimeout(() => { h.className = ''; }, kill ? 260 : 130); const s = kill ? 1.6 : 1; h.style.transform = `scale(${s})`; }
  damageFrom(ang, amt) { this.dmgA = Math.min(1, this.dmgA + .25 + amt / 120); const d = document.createElement('div'); d.style.cssText = `position:absolute;left:0;top:0;width:0;height:0;transform:rotate(${ang}rad)`; d.innerHTML = '<div style="position:absolute;left:-9em;top:-17em;width:18em;height:3.2em;border-radius:50% 50% 0 0/100% 100% 0 0;background:radial-gradient(ellipse at 50% 100%,#ff2a1ad0,#ff2a1a00 70%);transition:opacity .9s"></div>'; this.dirEl.appendChild(d); this.dirs.push({ el: d, t: 0 }); }
  flash(a) { this.flashA = Math.max(this.flashA, a); }
  chatAdd(name, text, sys, team) { const c = $('chatbox'), d = document.createElement('div'); d.className = 'm' + (sys ? ' s' : ''); d.innerHTML = sys ? esc(text) : `<b style="color:${team === 1 ? '#7fb2ff' : team === 2 ? '#ff8f80' : '#ffe27a'}">${esc(name)}:</b> ${esc(text)}`; c.appendChild(d); setTimeout(() => d.remove(), 8200); while (c.children.length > 7) c.firstChild.remove(); }
  shotSeen(id) { this.lastShot.set(id, performance.now()); }
  reset() { $('kf').innerHTML = ''; $('feed').innerHTML = ''; this.dirEl.innerHTML = ''; this.dirs.length = 0; this.cache = {}; this.dmgA = 0; this.flashA = 0; this.lastShot.clear(); $('chatbox').innerHTML = ''; }

  /* ---------- mira ---------- */
  setCross(gapPx, mode) {
    const c = settings.crossSize || 1, len = 9 * c, th = 2, e = this.crossEls, col = settings.crosshair || '#fff';
    $('cross').style.setProperty('--cc', col); const g = Math.round(gapPx);
    const pos = [[-th / 2, -(g + len), th, len], [-th / 2, g, th, len], [-(g + len), -th / 2, len, th], [g, -th / 2, len, th]];
    for (let i = 0; i < 4; i++) { const s = e[i].style, p = pos[i]; s.left = p[0] + 'px'; s.top = p[1] + 'px'; s.width = p[2] + 'px'; s.height = p[3] + 'px'; s.display = mode === 'cross' ? '' : 'none'; }
    const d = e[4].style; d.left = '-1.5px'; d.top = '-1.5px'; d.width = '3px'; d.height = '3px'; d.borderRadius = '50%'; d.display = mode === 'none' ? 'none' : '';
  }

  /* ---------- minimapa ---------- */
  drawMini(V, now) {
    const c = this.mmx, S = this.mmS, B = this.mmB, w = this.mmc.width, h = this.mmc.height; if (!this.mmStatic) return;
    const RNG = 62, k = (w / 2) / (RNG * S) * 1.0, px = V.px, pz = V.pz;
    c.clearRect(0, 0, w, h); c.save(); c.fillStyle = '#2a3a1c'; c.fillRect(0, 0, w, h);
    c.translate(w / 2, h / 2); c.rotate(V.yaw); c.scale(k, k); c.translate(-(px - B.x0) * S, -(pz - B.z0) * S);
    c.drawImage(this.mmStatic, 0, 0);
    const X = x => (x - B.x0) * S, Z = z => (z - B.z0) * S, u = 1 / k;
    /* zona (caos) */
    if (V.zone) { c.strokeStyle = '#7fd0ffcc'; c.lineWidth = 3 * u; c.beginPath(); c.arc(X(V.zone[0]), Z(V.zone[1]), V.zone[2] * S, 0, 6.3); c.stroke(); c.fillStyle = '#2a80ff22'; c.beginPath(); c.rect(-5e3, -5e3, 1e4, 1e4); c.arc(X(V.zone[0]), Z(V.zone[1]), V.zone[2] * S, 0, 6.3, true); c.fill('evenodd'); if (V.zone[5] !== V.zone[2]) { c.strokeStyle = '#ffffffaa'; c.setLineDash([6 * u, 5 * u]); c.lineWidth = 2 * u; c.beginPath(); c.arc(X(V.zone[3]), Z(V.zone[4]), V.zone[5] * S, 0, 6.3); c.stroke(); c.setLineDash([]); } }
    /* pontos A/B */
    if (V.mode === 'tatico') for (const id in this.mmSites) {
      const s = this.mmSites[id]; c.fillStyle = '#ffc61a33'; c.strokeStyle = '#ffc61a'; c.lineWidth = 2 * u; c.fillRect(X(s.x0), Z(s.z0), (s.x1 - s.x0) * S, (s.z1 - s.z0) * S); c.strokeRect(X(s.x0), Z(s.z0), (s.x1 - s.x0) * S, (s.z1 - s.z0) * S);
      c.save(); c.translate(X(s.x), Z(s.z)); c.rotate(-V.yaw); c.fillStyle = '#fff'; c.strokeStyle = '#3a2a08'; c.lineWidth = 4 * u; c.font = `900 ${34 * u}px Lilita One, Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(id, 0, 0); c.fillText(id, 0, 0); c.restore();
    }
    /* bomba */
    const b = V.bomb;
    if (b && (b.st === 'dropped' || b.st === 'planted')) { const pulse = b.st === 'planted' ? (Math.sin(now * 9) > 0 ? 1 : .35) : 1; c.save(); c.translate(X(b.x), Z(b.z)); c.rotate(-V.yaw); c.fillStyle = b.st === 'planted' ? `rgba(255,60,40,${pulse})` : '#ffc61a'; c.strokeStyle = '#000'; c.lineWidth = 2.5 * u; c.beginPath(); c.arc(0, 0, 9 * u, 0, 6.3); c.fill(); c.stroke(); if (b.st === 'planted') { c.strokeStyle = `rgba(255,70,50,${.8 * (1 - (now * 1.6 % 1))})`; c.lineWidth = 3 * u; c.beginPath(); c.arc(0, 0, (9 + (now * 1.6 % 1) * 40) * u, 0, 6.3); c.stroke(); } c.restore(); }
    /* jogadores */
    for (const p of V.roster) {
      if (!p.alive || p.isMe) continue; const ally = V.mode === 'tatico' && p.team === V.myTeam; let vis = ally;
      if (!ally) { const t = this.lastShot.get(p.id); if (t && now * 1000 - t < 1600) vis = true; if (p.spotted) vis = true; }
      if (!vis) continue;
      c.save(); c.translate(X(p.x), Z(p.z)); const col = ally ? '#5da0ff' : '#ff4a3a'; c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 2.4 * u;
      c.rotate(-p.yaw); /* aponta na direção de visão do jogador (mundo norte-acima já rotacionado) */
      c.beginPath(); c.moveTo(0, -8 * u); c.lineTo(6 * u, 6 * u); c.lineTo(0, 3 * u); c.lineTo(-6 * u, 6 * u); c.closePath(); c.fill(); c.stroke(); c.restore();
      if (p.hasBomb && ally) { c.save(); c.translate(X(p.x), Z(p.z)); c.rotate(-V.yaw); c.fillStyle = '#ffc61a'; c.beginPath(); c.arc(0, -12 * u, 4 * u, 0, 6.3); c.fill(); c.restore(); }
    }
    c.restore();
    /* cone de visão + marcador do jogador */
    c.save(); c.translate(w / 2, h / 2); const g = c.createRadialGradient(0, 0, 4, 0, 0, 110); g.addColorStop(0, '#ffffff55'); g.addColorStop(1, '#ffffff00'); c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 110, -Math.PI / 2 - .6, -Math.PI / 2 + .6); c.closePath(); c.fill();
    c.fillStyle = '#ffe27a'; c.strokeStyle = '#000'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -13); c.lineTo(9, 9); c.lineTo(0, 4); c.lineTo(-9, 9); c.closePath(); c.fill(); c.stroke(); c.restore();
    /* letra N */
    c.save(); c.translate(w / 2, h / 2); c.rotate(V.yaw); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 4; c.font = '900 26px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText('N', 0, -h / 2 + 20); c.fillText('N', 0, -h / 2 + 20); c.restore();
  }

  /* ---------- atualização por quadro ---------- */
  update(V, dt, now) {
    const me = V.me, tat = V.mode === 'tatico';
    /* placar e relógio */
    this.show('score', tat); this.show('obj', true); this.show('zonebar', !!V.zoneText);
    if (tat) {
      this.set('scAn', 'sca', V.score0); this.set('scDn', 'scd', V.score1); const role = sq => ((V.swap | 0) === sq ? 'ATAQUE' : 'DEFESA');
      this.set('scAl', 'scal', 'AZUL · ' + role(0)); this.set('scDl', 'scdl', role(1) + ' · VERMELHO');
      $('scA').classList.toggle('me', V.mySq === 0); $('scD').classList.toggle('me', V.mySq === 1);
      const ck = V.phase === 'prep' ? fmtTime(V.pt) : V.bomb && V.bomb.st === 'planted' ? '00:' + String(Math.max(0, Math.ceil(V.bomb.timer))).padStart(2, '0') : fmtTime(V.pt);
      this.set('clock', 'ck', ck); $('clock').classList.toggle('low', (V.phase === 'live' && V.bomb.st !== 'planted' && V.pt < 20) || (V.bomb && V.bomb.st === 'planted'));
      /* jogadores vivos de cada equipe (pinos cheios = vivos) */
      const pins = q => { const l = V.roster.filter(p => p.team && sqOfTeam(p.team, V.swap | 0) === q); const n = l.filter(p => p.alive).length; return { n, h: l.map(p => `<i class="${p.alive ? 'on' : ''}${p.isMe ? ' me' : ''}"></i>`).join('') + `<b>${n}</b>` }; };
      const pa = pins(0), pd = pins(1); this.html('alA', 'ala', pa.h); this.html('alD', 'ald', pd.h.replace(/^(.*)(<b>\d+<\/b>)$/, '$2$1'));
      this.set('rdTxt', 'rd', V.round > V.maxRounds ? `Prorrogação · R${V.round}` : `Rodada ${V.round}/${V.maxRounds}${V.round > V.maxRounds / 2 ? ' · 2º tempo' : ''}`);
    }
    /* objetivo */
    this.html('objT', 'obj', this.objective(V));
    /* zona / bomba */
    if (V.zoneText) this.set('zonebar', 'zt', V.zoneText, v => { const e = $('zonebar'); e.textContent = v; e.style.background = V.zoneColor || '#0a3a6aaa'; });
    /* lista de jogadores */
    const rows = [...V.roster].sort((a, b) => (b.team === V.myTeam) - (a.team === V.myTeam) || b.score - a.score);
    const rk = rows.map(p => p.id + ':' + p.name + ':' + (p.alive ? 1 : 0) + ':' + p.k + ':' + p.team + (p.hasBomb && p.team === V.myTeam ? 'b' : '')).join('|') + V.mode + V.swap;
    if (this.cache.plk !== rk) {
      this.cache.plk = rk; $('plT').textContent = `Jogadores (${rows.length})`;
      $('plRows').innerHTML = (tat ? rows : rows.filter(p => p.alive).sort((a, b) => b.k - a.k).slice(0, 10)).map(p => `<div class="pr${p.alive ? '' : ' dead'}"><span class="tb" style="background:${tat && p.team ? SQ_COL[sqOfTeam(p.team, V.swap | 0)] : '#ffc61a'}"></span><span class="nm"${p.isMe ? ' style="color:#ffe27a"' : ''}>${esc(p.name)}${p.hasBomb && p.team === V.myTeam ? ' 🥔' : ''}${p.bot ? ' <small style="opacity:.55">bot</small>' : ''}</span><span class="k">${p.k}</span></div>`).join('');
      if (!tat) $('plT').textContent = `Vivos: ${V.aliveN} / ${rows.length}`;
    }
    /* vitais */
    if (me) {
      const hp = Math.max(0, Math.round(me.hp)), ar = Math.round(me.armor);
      this.set('hpb', 'hp', hp, v => { const e = $('hpb'); e.querySelector('i').style.width = v + '%'; e.querySelector('span').textContent = v; e.classList.toggle('low', v <= 30); });
      this.set('arb', 'ar', ar, v => { const e = $('arb'); const mx = me.vest ? VESTS[me.vest].arm : 100; e.querySelector('i').style.width = Math.min(100, v / mx * 100) + '%'; e.querySelector('span').textContent = v; });
      this.set('avc', 'avs', me.skin + ':' + V.mySq + ':' + (tat ? me.farmer : ''), v => { drawFace($('avc'), (tat && agentLook(me.farmer)) || me.skin); $('vitals').querySelector('.av').style.borderColor = tat ? SQ_COL[V.mySq] : '#ffc61a'; });
      /* dinheiro (5x5), cura selecionada (BR), fôlego */
      this.show('money', tat); if (tat) this.html('money', 'money', `$ ${(me.money | 0).toLocaleString('pt-BR')}` + (V.phase === 'prep' && me.alive ? `<small>${esc(keyName(bindOf('shop')))} — Loja (${Math.max(0, Math.ceil(V.pt))}s)</small>` : ''));
      const hs = !tat && me.sel && me.inv && me.inv[me.sel] ? `${Icons.img(me.sel, 'sm', 'hic')} ${HEALS[me.sel].name} x${me.inv[me.sel]} <span class="kbd">${esc(keyName(bindOf('heal')))}</span>` : tat && me.alive && ((me.pano && !me.panoUsed) || me.caixa) ? `${me.pano && !me.panoUsed ? '🧻 Pano' : '🧰 Caixinha'} <span class="kbd">${esc(keyName(bindOf('heal')))}</span>` : '';
      this.show('healsel', !!hs && me.alive); if (hs) this.html('healsel', 'healsel', hs);
      const br = me.breath === undefined ? 10 : me.breath; this.show('breath', me.alive && br < 9.9); if (br < 9.9) $('breath').querySelector('i').style.width = (br * 10).toFixed(0) + '%';
      this.updateHotbar(me);
    }
    /* dicas */
    this.show('hints', !!settings.showHints && !!me && me.alive);
    if (settings.showHints) this.html('hints', 'hints', this.hintsHTML(V));
    /* prompt */
    const pr = V.prompt;
    if (pr) { const k = pr.text + (pr.prog >= 0 ? '1' : '0'); if (this.promptKey !== k) { this.promptKey = k; $('prompt').innerHTML = esc(pr.text) + (pr.prog >= 0 ? '<div class="pb"><i></i></div>' : ''); } if (pr.prog >= 0) { const i = $('prompt').querySelector('.pb i'); if (i) i.style.width = (pr.prog * 100).toFixed(1) + '%'; } this.show('prompt', true); } else { this.show('prompt', false); this.promptKey = ''; }
    /* fase de preparação */
    if (V.phase === 'prep' && V.mode === 'tatico') { this.show('prep', true); this.html('prep', 'prep', `Fase de compra!<b>${Math.max(0, Math.ceil(V.pt))}</b>${V.funny ? '<small style="display:block;font-size:.55em;opacity:.8">' + esc(V.funny) + '</small>' : ''}`); }
    else if (V.phase === 'prep') { this.show('prep', true); this.html('prep', 'prep', `A vaca vai decolar!<b>${Math.max(0, Math.ceil(V.pt))}</b><small style="display:block;font-size:.55em;opacity:.8">Escolha a hora de saltar com ${esc(keyName(bindOf('jump')))}</small>`); }
    else this.show('prep', false);
    /* espectador */
    if (V.spec) { this.show('spec', true); this.html('spec', 'spec', `Observando: <span style="color:#ffe27a">${esc(V.spec)}</span><small>Clique / ← → para trocar de jogador</small>`); } else this.show('spec', false);
    /* rede */
    this.html('netinfo', 'net', V.netText || '');
    /* efeitos de dano */
    this.dmgA = Math.max(0, this.dmgA - dt * .9); const low = me && me.alive && me.hp < 30 ? (.25 + .15 * Math.sin(now * 5)) : 0; $('dmgv').style.opacity = Math.min(1, this.dmgA + low).toFixed(3);
    this.flashA = Math.max(0, this.flashA - dt * 1.4); $('flash').style.opacity = this.flashA.toFixed(3);
    for (let i = this.dirs.length - 1; i >= 0; i--) { const d = this.dirs[i]; d.t += dt; const op = Math.max(0, 1 - d.t / 1.2); d.el.firstChild.style.opacity = op; if (d.t > 1.25) { d.el.remove(); this.dirs.splice(i, 1); } }
    /* minimapa (30 Hz) */
    this.mmT += dt; if (this.mmT > 1 / 30) { this.mmT = 0; this.drawMini(V, now); }
  }
  objective(V) {
    const t = x => `<span class="tag">${x}</span>`, me = V.me, b = V.bomb;
    if (V.mode === 'caos') { if (me && me.onCow) return `Você está na <b>vaca voadora</b>! Aperte <b>${esc(keyName(bindOf('jump')))}</b> para saltar.`; if (me && me.chute) return 'Paraquedas aberto: <b>WASD</b> direciona, <b>Ctrl</b> desce mais rápido.'; return V.phase === 'prep' ? 'Embarque na vaca voadora… ela decola já já!' : `Seja o <b>último sobrevivente</b>.<br>Restam <b>${V.aliveN}</b> de ${V.roster.length}. Fique dentro da zona!`; }
    if (V.phase === 'post') return V.endText || 'Fim da rodada.';
    if (V.myTeam === T_ATK) {
      if (b.st === 'planted') return `A mandioca está plantada no ponto ${t(b.site)}!<br>Proteja-a até explodir.`;
      if (me && me.hasBomb) return `Você está com a <b>mandioca</b>! Vá ao ponto ${t('A')} ou ${t('B')} e <b>segure E</b>.`;
      if (b.st === 'dropped') return `A mandioca está no chão! <b>Pegue com E</b> e plante em ${t('A')} ou ${t('B')}.`;
      return `Plante a mandioca no ponto ${t('A')} ou ${t('B')} e proteja-a.`;
    }
    if (b.st === 'planted') return `<b>Desarme a mandioca</b> no ponto ${t(b.site)}! Fique perto e <b>segure E</b>.`;
    return `Defenda os pontos ${t('A')} e ${t('B')}. Impeça o plantio da mandioca!`;
  }
  hintsHTML(V) {
    const k = (a, b) => `<div><span class="kbd">${a}</span>${b}</div>`, me = V.me, B = x => esc(keyName(bindOf(x)));
    if (Input.device === 'touch') return '';
    if (Input.device === 'pad') return k('LS', 'Mover') + k('RS', 'Mirar') + k('RT', 'Atirar') + k('LT', 'Mirar') + k('A', 'Pular') + k('B', 'Agachar') + k('X', 'Recarregar') + k('RB', 'Interagir') + k('↑', 'Cura') + k('↓', V.mode === 'tatico' ? 'Loja' : 'Mochila');
    let h = k(`${B('fwd')} ${B('left')} ${B('back')} ${B('right')}`, 'Mover') + k(B('sprint'), 'Correr') + k(B('crouch'), 'Agachar') + k(B('jump'), 'Pular') + k(B('reload'), 'Recarregar') + k(B('use'), V.mode === 'caos' ? 'Pegar item' : 'Interagir') + k(B('nade'), 'Ovo') + k(B('heal'), 'Cura') + k(B('map'), 'Mapa');
    h += V.mode === 'tatico' ? k(B('shop'), 'Loja') : k(B('bag'), 'Mochila');
    if (me && me.hasBomb) h += k(B('drop'), 'Soltar a mandioca'); return h;
  }
  updateHotbar(me) {
    for (let i = 0; i < this.slotEls.length; i++) {
      const s = this.slotEls[i];
      /* slot 1 mostra a primária atual (ou a primeira que possui) */
      if (i === 0) { const ids = s.slot.ids, cur = ids.includes(me.w) ? me.w : ids.find(q => me.own[q] !== undefined) || ids[0]; if (s.icon !== cur) { s.icon = cur; s.id = cur; drawWeaponIcon(s.cv, cur); s.nm.textContent = me.own[cur] !== undefined ? WEAPONS[cur].short : 'Primária'; s.cls = ''; } }
      const id = s.id; let own, am = '';
      if (id === 'batata') { own = me.nades > 0; am = me.nades > 0 ? me.nades : ''; } else if (id === 'mandioca') { own = me.hasBomb; } else { own = me.own[id] !== undefined; if (own && WEAPONS[id].ammo) am = (me.mag[id] | 0) + '/' + (me.ammo[WEAPONS[id].ammo] | 0); }
      const cls = (own ? '' : ' off') + (me.w === id ? ' on' : ''), tier = own && me.own[id] ? TIERS[me.own[id]] : null, key = cls + am + (tier ? tier.id : '');
      if (s.cls === key) continue; s.cls = key; s.el.className = 'slot' + cls; s.el.style.display = id === 'mandioca' && !own ? 'none' : ''; s.am.textContent = am; s.el.style.borderColor = me.w === id ? '' : tier ? tier.col + '99' : ''; s.el.style.opacity = own ? 1 : .32;
    }
    const w = WEAPONS[me.w]; if (!w) return;
    this.set('amName', 'amn', (me.own[w.id] > 0 ? TIER_NAMES[w.id] ? TIER_NAMES[w.id][me.own[w.id]] : w.name : w.name), v => { const e = $('amName'); e.textContent = v; e.style.color = me.own[w.id] > 0 ? TIERS[me.own[w.id]].col : ''; });
    let mag = '', res = ''; if (w.ammo) { mag = me.mag[w.id] | 0; res = '/ ' + (me.ammo[w.ammo] | 0); } else if (w.id === 'batata') { mag = me.nades; res = ''; } else if (w.id === 'mandioca') { mag = '💣'; } else mag = '∞';
    this.set('amMag', 'amg', mag); this.set('amRes', 'amr', res); $('amMag').style.color = w.ammo && (me.mag[w.id] | 0) <= Math.ceil(wMagCap(me, w.id) * .25) ? '#ff7a6a' : '';
  }
  /* ---------- scoreboard (TAB) ---------- */
  tab(on, V) {
    const el = $('tabboard'); el.classList.toggle('hidden', !on); this.tabOn = on; if (!on) return; el.classList.add('tab2');
    const tat = V.mode === 'tatico', mine = p => tat && p.team === V.myTeam;
    /* rosto 3D do personagem (mesma skin), gerado uma vez por skin */
    const face = faceUrl;
    const IC = { k: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>', d: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C7 2 3 6 3 11c0 3 1.5 5 3.5 6.2V21h3v-2h1v2h3v-2h1v2h3v-3.8C19.5 16 21 14 21 11c0-5-4-9-9-9zm-3.5 11a2 2 0 110-4 2 2 0 010 4zm7 0a2 2 0 110-4 2 2 0 010 4z"/></svg>', a: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 12l5-5 4 3 3-2 3 3-4 4-2-2-3 3zM14 15l3-3 5 5-2 2z"/></svg>', m: '<b>$</b>', p: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 18h3v3H3zM8 14h3v7H8zM13 10h3v11h-3zM18 5h3v16h-3z"/></svg>', hs: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 15c0-4 4-8 8-8s8 4 8 8H4zm-2 1h20v2H2z"/></svg>' };
    /* 5x5: placar enxuto — somente Jogador, Abates, Mortes, Assist., Dinheiro e Ping */
    const cols = tat ? [['k', 'Abates'], ['d', 'Mortes'], ['a', 'Assist.'], ['m', 'Dinheiro'], ['p', 'Ping']] : [['k', 'Abates'], ['d', 'Mortes'], ['a', 'Assist.'], ['hs', 'HS'], ['p', 'Ping']];
    const cell = (p, c) => c === 'k' ? p.k : c === 'd' ? p.d : c === 'a' ? p.a : c === 'hs' ? (p.hs | 0) : c === 'm' ? (mine(p) ? `<span class="tb-money">$${(p.money | 0).toLocaleString('pt-BR')}</span>` : '—') : (p.bot ? 'bot' : (p.ping | 0) + ' <small>ms</small>');
    const row = (p, cls) => `<tr class="${cls}${p.alive ? '' : ' dead'}${p.isMe ? ' me' : ''}"><td class="tb-plc"><div class="tb-pl"><span class="tb-av">${face(p.skin | 0) ? `<img src="${face(p.skin | 0)}" alt="">` : ''}</span><span class="tb-nm">${esc(p.name)}${p.bot ? ' <small class="bot">BOT</small>' : ''}${p.hasBomb && (mine(p) || !p.alive) ? ' <span class="bombic" title="Carrega a mandioca">🥔</span>' : ''}${tat ? '' : `<em>${p.alive ? 'vivo' : 'eliminado'} · ${p.acc | 0}% precisão</em>`}</span></div></td>${cols.map(([c]) => `<td>${cell(p, c)}</td>`).join('')}</tr>`;
    const head = `<tr><th class="tb-pl">Jogador</th>${cols.map(([c, l]) => `<th><i class="tb-i">${IC[c]}</i>${l}</th>`).join('')}</tr>`;
    if (tat) {
      const sq = q => V.roster.filter(p => p.team && sqOfTeam(p.team, V.swap | 0) === q).sort((a, b) => b.score - a.score), role = q => ((V.swap | 0) === q ? 'ATAQUE' : 'DEFESA'), alive = l => l.filter(p => p.alive).length;
      const A = sq(0), B = sq(1), ot = V.round > V.maxRounds;
      el.innerHTML = `<div class="tb-head"><div class="tb-team blue"><span class="tb-shield">★</span><div><b>AZUL</b><small>${role(0)} · vivos ${alive(A)}/${A.length}</small></div></div>
        <div class="tb-mid"><div class="tb-rd">${ot ? 'Prorrogação · ' : ''}Rodada <b>${V.round}/${V.maxRounds}</b></div><div class="tb-sc"><span class="b">${V.score0}</span><i>-</i><span class="r">${V.score1}</span></div></div>
        <div class="tb-team red"><div><b>VERMELHO</b><small>${role(1)} · vivos ${alive(B)}/${B.length}</small></div><span class="tb-shield">☠</span></div></div>
        <table class="tb-t">${head}${A.map(p => row(p, 'blue')).join('')}${B.map(p => row(p, 'red')).join('')}</table>`;
    } else {
      const L = [...V.roster].sort((a, b) => (b.alive - a.alive) || b.score - a.score);
      el.innerHTML = `<div class="tb-head"><div class="tb-mid solo"><div class="tb-rd">${esc(V.modeName)}</div><div class="tb-sc"><span class="y">${V.aliveN}</span><i>/</i><span class="y">${V.roster.length}</span></div><div class="tb-rd small">participantes vivos</div></div></div>
        <table class="tb-t">${head}${L.map(p => row(p, p.isMe ? 'blue' : 'gold')).join('')}</table>`;
    }
  }


}
