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
  if (typeof drawIcon3D === 'function' && drawIcon3D(cv, id)) return; id = wBase(id);
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
function faceUrl(sk) { const k = 'face|' + sk; if (Icons.url.has(k)) return Icons.url.get(k); let u = ''; const g3 = typeof Icon3D !== 'undefined' ? Icon3D.char({ skin: sk }, { face: true, w: 64, h: 64, ry: .3, ss: 2 }) : undefined; if (g3 === null || (g3 === undefined && BODY3D.tex && !Icon3D.on())) return ''; if (g3) { u = g3.toDataURL('image/png'); Icons.url.set(k, u); return u; } try { const S = SKINS[sk % SKINS.length], c = G.R.renderIcon(m => drawHead(m, S, S.special), { w: 64, h: 64, ry: PI - .3, rx: .1, ss: 2, pad: 1.05 }); u = c ? c.toDataURL('image/png') : ''; } catch (e) { } Icons.url.set(k, u); return u; }
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
    for (const R of map.roads) { c.strokeStyle = '#8a6a3e'; c.lineWidth = R.w * S * 1.15; c.beginPath(); R.pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Z(p[1])) : c.moveTo(X(p[0]), Z(p[1]))); c.stroke(); c.strokeStyle = '#e2c992'; c.lineWidth = R.w * S * .8; c.stroke(); }
    for (const m of map.mm) {
      if (m.t === 'rect') { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(X(m.x0) + 2, Z(m.z0) + 2, (m.x1 - m.x0) * S, (m.z1 - m.z0) * S); c.fillStyle = m.c || '#6b4a32'; c.fillRect(X(m.x0), Z(m.z0), (m.x1 - m.x0) * S, (m.z1 - m.z0) * S); c.strokeStyle = '#f2e3c4aa'; c.lineWidth = 1.6; c.strokeRect(X(m.x0), Z(m.z0), (m.x1 - m.x0) * S, (m.z1 - m.z0) * S); }
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
    f.appendChild(d); setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 420); }, 6000); while (f.children.length > 6) f.firstChild.remove();
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
    const RO = settings.mmRotate ? V.yaw : 0, RNG = 62, k = (w / 2) / (RNG * S) * 1.0, px = V.px, pz = V.pz;
    c.clearRect(0, 0, w, h); c.save(); c.fillStyle = '#3a4a26'; c.fillRect(0, 0, w, h);
    c.translate(w / 2, h / 2); c.rotate(RO); c.scale(k, k); c.translate(-(px - B.x0) * S, -(pz - B.z0) * S);
    c.drawImage(this.mmStatic, 0, 0);
    const X = x => (x - B.x0) * S, Z = z => (z - B.z0) * S, u = 1 / k;
    /* zona (caos) */
    if (V.zone) { c.strokeStyle = '#7fd0ffcc'; c.lineWidth = 3 * u; c.beginPath(); c.arc(X(V.zone[0]), Z(V.zone[1]), V.zone[2] * S, 0, 6.3); c.stroke(); c.fillStyle = '#2a80ff22'; c.beginPath(); c.rect(-5e3, -5e3, 1e4, 1e4); c.arc(X(V.zone[0]), Z(V.zone[1]), V.zone[2] * S, 0, 6.3, true); c.fill('evenodd'); if (V.zone[5] !== V.zone[2]) { c.strokeStyle = '#ffffffaa'; c.setLineDash([6 * u, 5 * u]); c.lineWidth = 2 * u; c.beginPath(); c.arc(X(V.zone[3]), Z(V.zone[4]), V.zone[5] * S, 0, 6.3); c.stroke(); c.setLineDash([]); } }
    /* pontos A/B */
    if (V.mode === 'tatico') for (const id in this.mmSites) {
      const s = this.mmSites[id]; c.fillStyle = '#f2c14e2e'; c.strokeStyle = '#f2c14e'; c.lineWidth = 2 * u; c.fillRect(X(s.x0), Z(s.z0), (s.x1 - s.x0) * S, (s.z1 - s.z0) * S); c.strokeRect(X(s.x0), Z(s.z0), (s.x1 - s.x0) * S, (s.z1 - s.z0) * S);
      c.save(); c.translate(X(s.x), Z(s.z)); c.rotate(-RO); c.fillStyle = '#fff'; c.strokeStyle = '#3a2a08'; c.lineWidth = 4 * u; c.font = `900 ${34 * u}px Lilita One, Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(id, 0, 0); c.fillText(id, 0, 0); c.restore();
    }
    /* bomba */
    const b = V.bomb;
    if (b && (b.st === 'dropped' || b.st === 'planted')) { const pulse = b.st === 'planted' ? (Math.sin(now * 9) > 0 ? 1 : .35) : 1; c.save(); c.translate(X(b.x), Z(b.z)); c.rotate(-RO); c.fillStyle = b.st === 'planted' ? `rgba(255,60,40,${pulse})` : '#ffc61a'; c.strokeStyle = '#000'; c.lineWidth = 2.5 * u; c.beginPath(); c.arc(0, 0, 9 * u, 0, 6.3); c.fill(); c.stroke(); if (b.st === 'planted') { c.strokeStyle = `rgba(255,70,50,${.8 * (1 - (now * 1.6 % 1))})`; c.lineWidth = 3 * u; c.beginPath(); c.arc(0, 0, (9 + (now * 1.6 % 1) * 40) * u, 0, 6.3); c.stroke(); } c.restore(); }
    /* jogadores */
    for (const p of V.roster) {
      if (!p.alive || p.isMe) continue; const ally = V.mode === 'tatico' && p.team === V.myTeam; let vis = ally;
      if (!ally) { const t = this.lastShot.get(p.id); if (t && now * 1000 - t < 1600) vis = true; if (p.spotted) vis = true; }
      if (!vis) continue;
      c.save(); c.translate(X(p.x), Z(p.z)); const col = ally ? '#4fd1c1' : '#e0683f'; c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 2.4 * u;
      c.rotate(-p.yaw); /* aponta na direção de visão do jogador (mundo norte-acima já rotacionado) */
      c.beginPath(); c.moveTo(0, -8 * u); c.lineTo(6 * u, 6 * u); c.lineTo(0, 3 * u); c.lineTo(-6 * u, 6 * u); c.closePath(); c.fill(); c.stroke(); c.restore();
      if (p.hasBomb && ally) { c.save(); c.translate(X(p.x), Z(p.z)); c.rotate(-RO); c.fillStyle = '#ffc61a'; c.beginPath(); c.arc(0, -12 * u, 4 * u, 0, 6.3); c.fill(); c.restore(); }
    }
    c.restore();
    /* cone de visão + marcador do jogador */
    c.save(); c.translate(w / 2, h / 2); c.rotate(RO - V.yaw); const g = c.createRadialGradient(0, 0, 4, 0, 0, 110); g.addColorStop(0, '#ffffff55'); g.addColorStop(1, '#ffffff00'); c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 110, -Math.PI / 2 - .6, -Math.PI / 2 + .6); c.closePath(); c.fill();
    c.fillStyle = '#f2c14e'; c.strokeStyle = '#2b1d12'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -13); c.lineTo(9, 9); c.lineTo(0, 4); c.lineTo(-9, 9); c.closePath(); c.fill(); c.stroke(); c.restore();
    /* letra N */
    c.save(); c.translate(w / 2, h / 2); c.rotate(RO); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 4; c.font = '900 26px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText('N', 0, -h / 2 + 20); c.fillText('N', 0, -h / 2 + 20); c.restore();
  }

  /* ---------- atualização por quadro ---------- */
  update(V, dt, now) {
    const me = V.me, tat = V.mode === 'tatico';
    this.show('score', tat); this.show('brcount', !tat && V.phase !== 'prep'); this.show('zonebar', !!V.zoneText);
    if (tat) this.matchScore(V); else { this.set('brN', 'brn', String(V.aliveN)); this.set('brT', 'brt', '/ ' + V.roster.length); }
    if (V.zoneText) this.set('zonebar', 'zt', V.zoneText, v => { const e = $('zonebar'); e.textContent = v; e.style.background = V.zoneColor || '#0a3a6aaa'; });
    if (me) { this.playerStatus(V, me); this.updateHotbar(me); }
    /* prompt contextual (plantar, desarmar, pegar…) */
    const pr = V.prompt;
    if (pr) { const k = pr.text + (pr.prog >= 0 ? '1' : '0'); if (this.promptKey !== k) { this.promptKey = k; $('prompt').innerHTML = esc(pr.text) + (pr.prog >= 0 ? '<div class="pb"><i></i></div>' : ''); } if (pr.prog >= 0) { const i = $('prompt').querySelector('.pb i'); if (i) i.style.width = (pr.prog * 100).toFixed(1) + '%'; } this.show('prompt', true); } else { this.show('prompt', false); this.promptKey = ''; }
    this.roundTimer(V);
    if (V.spec) { this.show('spec', true); this.html('spec', 'spec', `Observando: <span style="color:#ffe27a">${esc(V.spec)}</span><small>Clique / ← → para trocar de jogador</small>`); } else this.show('spec', false);
    this.html('netinfo', 'net', V.netText || '');
    /* efeitos de dano */
    this.dmgA = Math.max(0, this.dmgA - dt * .9); const low = me && me.alive && me.hp < 30 ? (.25 + .15 * Math.sin(now * 5)) : 0; const dv = Math.min(1, this.dmgA + low).toFixed(2); if (this.cache.dv !== dv) { this.cache.dv = dv; $('dmgv').style.opacity = dv; }
    this.flashA = Math.max(0, this.flashA - dt * 1.4); const fl = this.flashA.toFixed(2); if (this.cache.fl !== fl) { this.cache.fl = fl; $('flash').style.opacity = fl; }
    for (let i = this.dirs.length - 1; i >= 0; i--) { const d = this.dirs[i]; d.t += dt; const op = Math.max(0, 1 - d.t / 1.2); d.el.firstChild.style.opacity = op; if (d.t > 1.25) { d.el.remove(); this.dirs.splice(i, 1); } }
    this.mmT += dt; if (this.mmT > 1 / 30) { this.mmT = 0; this.drawMini(V, now); }
  }
  /* ---------- MatchScoreHUD: MEU TIME | TEMPO | INIMIGO (sem mudar a lógica de equipes) ---------- */
  matchScore(V) {
    const my = V.mySq === 1 ? 1 : 0, en = 1 - my, sc = [V.score0, V.score1], role = sq => ((V.swap | 0) === sq ? 'ATAQUE' : 'DEFESA'), nm = ['AZUL', 'VERMELHO'];
    const bump = (id, key, v) => this.set(id, key, String(v), x => { const e = $(id), first = e.textContent === '' || this.cache['_' + key] === undefined; e.textContent = x; this.cache['_' + key] = 1; if (!first) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } });
    bump('scAn', 'sca', sc[my]); bump('scDn', 'scd', sc[en]);
    this.set('scAl', 'scal', 'ALIADOS · ' + nm[my]); this.set('scDl', 'scdl', nm[en] + ' · INIMIGOS');
    this.set('scAr', 'scar', role(my)); this.set('scDr', 'scdr', role(en));
    const planted = V.bomb && V.bomb.st === 'planted';
    const ck = planted ? '00:' + String(Math.max(0, Math.ceil(V.bomb.timer))).padStart(2, '0') : fmtTime(V.pt);
    this.set('clock', 'ck', ck); this.set('clock', 'ckc', (planted ? 'bomb' : V.phase === 'live' && V.pt < 20 ? 'low' : ''), v => { $('clock').className = 'tm2' + (v ? ' ' + v : ''); });
    const pins = q => { const l = V.roster.filter(p => p.team && sqOfTeam(p.team, V.swap | 0) === q); const n = l.filter(p => p.alive).length; return { n, i: l.map(p => `<i class="${p.alive ? 'on' : ''}${p.isMe ? ' me' : ''}"></i>`).join('') }; };
    const pa = pins(my), pd = pins(en); this.html('alA', 'ala', pa.i + `<b>${pa.n}</b>`); this.html('alD', 'ald', `<b>${pd.n}</b>` + pd.i);
    this.set('rdTxt', 'rd', V.round > V.maxRounds ? `PRORROGAÇÃO · R${V.round}` : `RODADA ${V.round}/${V.maxRounds}`);
  }
  /* ---------- RoundTimerHUD: preparação discreta, últimos segundos em destaque ---------- */
  roundTimer(V) {
    if (V.phase !== 'prep') { this.show('prep', false); this.cache.prep = ''; return; }
    const s = Math.max(0, Math.ceil(V.pt)), hot = s <= 5, tat = V.mode === 'tatico';
    const lab = tat ? 'Fase de compra' : 'A vaca vai decolar', sub = tat ? `${esc(keyName(bindOf('shop')))} abre a loja` : `Salte com ${esc(keyName(bindOf('jump')))}`;
    this.show('prep', true); this.html('prep', 'prep', `<span>${lab}<small>${sub}</small></span><b>${s}</b>`);
    this.set('prep', 'prepH', hot, v => $('prep').classList.toggle('hot', v));
  }
  /* ---------- PlayerStatusHUD: retrato real, vida (coração) e colete (escudo) ---------- */
  playerStatus(V, me) {
    const tat = V.mode === 'tatico', hp = Math.max(0, Math.round(me.hp)), ar = Math.max(0, Math.round(me.armor));
    this.set('hpb', 'hp', hp, v => {
      const e = $('hpb'), prev = this.cache.hpPrev; this.cache.hpPrev = v; const f = Math.max(0, Math.min(100, v));
      /* verde → amarelo → vermelho de forma gradual */
      const hue = f > 60 ? 100 : f > 25 ? 30 + (f - 25) / 35 * 70 : 6 + f / 25 * 24;
      e.style.setProperty('--hpc', `hsl(${hue.toFixed(0)},62%,${f > 25 ? 48 : 52}%)`);
      e.querySelector('.fill').style.width = f + '%'; e.querySelector('.lag').style.width = f + '%'; e.querySelector('span').textContent = String(v);
      e.classList.toggle('low', v > 0 && v <= 30);
      if (prev !== undefined && v < prev) { e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit'); }
    });
    this.set('arb', 'ar', ar + ':' + (me.vest || ''), () => { const e = $('arb'); const mx = me.vest && VESTS[me.vest] ? VESTS[me.vest].arm : 100; e.querySelector('.fill').style.width = Math.min(100, ar / mx * 100) + '%'; e.querySelector('span').textContent = String(ar); e.classList.toggle('zero', ar <= 0); });
    const sh = me.shield | 0; this.set('shTag', 'sht', sh, v => { const e = $('shTag'); e.classList.toggle('hidden', !v); e.textContent = v ? '+' + v + ' escudo' : ''; });
    const look = tat && agentLook(me.farmer), F = tat && FARMERS[me.farmer];
    this.set('avc', 'avs', me.skin + ':' + V.mySq + ':' + (tat ? me.farmer : ''), () => {
      drawFace($('avc'), look || me.skin); $('vitals').querySelector('.av').style.borderColor = tat ? 'var(--ally)' : 'var(--gold)';
      $('avNm').textContent = F ? F.name : (SKINS[me.skin | 0] && SKINS[me.skin | 0].name) || '';
    });
    /* cura / fôlego (dados existentes) */
    const hs = !tat && me.sel && me.inv && me.inv[me.sel] ? `${Icons.img(me.sel, 'sm', 'hic')} ${HEALS[me.sel].name} x${me.inv[me.sel]} <span class="kbd">${esc(keyName(bindOf('heal')))}</span>` : tat && me.alive && ((me.pano && !me.panoUsed) || me.caixa) ? `${me.pano && !me.panoUsed ? '🧻 Pano' : '🧰 Caixinha'} <span class="kbd">${esc(keyName(bindOf('heal')))}</span>` : '';
    this.show('healsel', !!hs && me.alive); if (hs) this.html('healsel', 'healsel', hs);
    const br = me.breath === undefined ? 10 : me.breath; this.show('breath', me.alive && br < 9.9); if (br < 9.9) $('breath').querySelector('i').style.width = (br * 10).toFixed(0) + '%';
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
    let h = k(`${B('fwd')} ${B('left')} ${B('back')} ${B('right')}`, 'Mover') + k(B('sprint'), 'Correr') + k(B('crouch'), 'Agachar') + k(B('jump'), 'Pular') + k(B('reload'), 'Recarregar') + k(B('use'), V.mode === 'caos' ? 'Pegar item' : 'Interagir / pegar arma') + k(B('nade'), 'Ovo') + k(B('heal'), 'Cura') + k(B('map'), 'Mapa');
    h += V.mode === 'tatico' ? k(B('shop'), 'Loja') : k(B('bag'), 'Mochila');
    h += k(B('emote'), 'Emotes'); const dw = me && isGun(me.w) && (V.mode !== 'tatico' || me.w !== 'estilingue');
    if (me && me.hasBomb && (!dw || me.w === 'mandioca')) h += k(B('drop'), 'Soltar a mandioca'); else if (dw) h += k(B('drop'), 'Largar a arma'); return h;
  }
  updateHotbar(me) {
    for (let i = 0; i < this.slotEls.length; i++) {
      const s = this.slotEls[i];
      /* slot 1 mostra a primária atual (ou a primeira que possui) */
      /* slots 1 e 2 mostram a arma atual daquele slot (ou a primeira que possui): primária / pistola-estilingue */
      if (s.slot.ids.length > 1) { const ids = s.slot.ids, cur = ids.includes(me.w) ? me.w : ids.find(q => me.own[q] !== undefined) || (i === 0 ? ids[0] : ids[ids.length - 1]); if (s.icon !== cur) { s.icon = cur; s.id = cur; drawWeaponIcon(s.cv, cur); s.nm.textContent = me.own[cur] !== undefined || i > 0 ? WEAPONS[cur].short : 'Primária'; s.cls = ''; } }
      const id = s.id; let own, am = '';
      if (id === 'batata') { own = me.nades > 0; am = me.nades > 0 ? me.nades : ''; } else if (id === 'mandioca') { own = me.hasBomb; } else { own = me.own[id] !== undefined; if (own && WEAPONS[id].ammo) am = (me.mag[id] | 0) + '/' + (me.ammo[WEAPONS[id].ammo] | 0); }
      const cls = (own ? '' : ' off') + (me.w === id ? ' on' : ''), tier = own && me.own[id] ? TIERS[me.own[id]] : null, key = cls + am + (tier ? tier.id : '');
      if (s.cls === key) continue; s.cls = key; s.el.className = 'slot' + cls; s.el.style.display = id === 'mandioca' && !own ? 'none' : ''; s.am.textContent = am; s.el.style.borderColor = me.w === id ? '' : tier ? tier.col + '99' : ''; s.el.style.opacity = own ? 1 : .32;
    }
    const w = WEAPONS[me.w]; if (!w) return;
    this.set('amW', 'amw', me.w, () => { const e = $('ammo'); e.classList.remove('swap'); void e.offsetWidth; e.classList.add('swap'); });
    this.set('amName', 'amn', (me.own[w.id] > 0 ? TIER_NAMES[w.id] ? TIER_NAMES[w.id][me.own[w.id]] : w.name : w.name), v => { const e = $('amName'); e.textContent = v; e.style.color = me.own[w.id] > 0 ? TIERS[me.own[w.id]].col : ''; });
    let mag = '', res = ''; if (w.ammo) { mag = String(me.mag[w.id] | 0); res = '/ ' + (me.ammo[w.ammo] | 0); } else if (w.id === 'batata') { mag = me.nades; res = ''; } else if (w.id === 'mandioca') { mag = '💣'; } else mag = '∞';
    this.set('amMag', 'amg', mag); this.set('amRes', 'amr', res); $('amMag').style.color = w.ammo && (me.mag[w.id] | 0) <= Math.ceil(wMagCap(me, w.id) * .25) ? '#ff7a6a' : '';
  }
  /* ---------- scoreboard (TAB) ---------- */
  tab(on, V) {
    const el = $('tabboard'); el.classList.toggle('hidden', !on); this.tabOn = on; if (!on) return;
    el.classList.remove('tab2', 'panel'); el.classList.add('tab3');
    const tat = V.mode === 'tatico', mine = p => tat && p.team === V.myTeam;
    /* retrato: agente (5x5) ou personagem (BR) — gerado uma vez e guardado */
    const face = p => { if (tat && p.farmer && typeof agentLook === 'function' && agentLook(p.farmer)) { const k = 'aface|' + p.farmer; if (Icons.url.has(k)) return Icons.url.get(k); let u = ''; try { const cv = document.createElement('canvas'); cv.width = cv.height = 96; drawFace(cv, agentLook(p.farmer)); u = cv.toDataURL('image/png'); } catch (e) { } if (u) Icons.url.set(k, u); return u; } return faceUrl(p.skin | 0); };
    const ICO = {
      star: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z"/></svg>',
      skull: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 1.5c-5.2 0-9 3.7-9 8.7 0 2.9 1.3 5 3.3 6.3v3.2c0 .9.7 1.6 1.6 1.6h.8v-2h1.6v2h3.4v-2h1.6v2h.8c.9 0 1.6-.7 1.6-1.6v-3.2c2-1.3 3.3-3.4 3.3-6.3 0-5-3.8-8.7-9-8.7zM8.2 14.6a2.4 2.4 0 110-4.8 2.4 2.4 0 010 4.8zm7.6 0a2.4 2.4 0 110-4.8 2.4 2.4 0 010 4.8zM12 15.4l1.3 2.1h-2.6z"/></svg>',
      crown: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 7l5 4 5-7 5 7 5-4-2 12H4z"/><path fill="#fff6" d="M4 17h16v2H4z"/></svg>',
      sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/><path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></svg>'
    };
    const cols = tat ? [['k', 'K', 'Abates'], ['d', 'D', 'Mortes'], ['a', 'A', 'Assistências'], ['p', 'Ping', 'Ping']] : [['k', 'K', 'Abates'], ['d', 'D', 'Mortes'], ['a', 'A', 'Assistências'], ['hs', 'HS', 'Chapéus (headshots)'], ['p', 'Ping', 'Ping']];
    const ping = p => { if (p.bot) return '<span class="tb3-png bot">bot</span>'; const v = p.ping | 0; return `<span class="tb3-png${v > 150 ? ' bad' : v > 80 ? ' mid' : ''}">${v}</span>`; };
    const cell = (p, c) => c === 'k' ? p.k : c === 'd' ? p.d : c === 'a' ? p.a : c === 'hs' ? (p.hs | 0) : ping(p);
    const row = p => { const f = face(p); return `<tr class="${p.alive ? '' : 'dead'}${p.isMe ? ' me' : ''}"><td class="tb3-pl">${p.isMe ? `<i class="tb3-crown">${ICO.crown}</i>` : ''}<span class="tb3-av">${f ? `<img src="${f}" alt="">` : ''}</span><span class="tb3-nm">${esc(p.name)}${p.bot ? '<small>BOT</small>' : ''}${p.hasBomb && (mine(p) || !p.alive) ? '<b class="tb3-bomb" title="Carrega a mandioca">🥔</b>' : ''}</span></td>${cols.map(([c]) => `<td class="c-${c}">${cell(p, c)}</td>`).join('')}</tr>`; };
    const head = `<tr><th class="tb3-pl">Jogador</th>${cols.map(([c, l, t]) => `<th class="c-${c}" title="${t}">${l}</th>`).join('')}</tr>`;
    const panel = (cls, icon, title, info, list) => `<section class="tb3-panel ${cls}"><header><i class="tb3-ico">${icon}</i><b>${title}</b><small>${info}</small><span class="tb3-stripes"></span></header><table>${head}${list.map(row).join('')}</table></section>`;
    if (tat) {
      const sq = q => V.roster.filter(p => p.team && sqOfTeam(p.team, V.swap | 0) === q).sort((a, b) => b.score - a.score), role = q => ((V.swap | 0) === q ? 'Ataque' : 'Defesa'), alive = l => l.filter(p => p.alive).length;
      const my = V.mySq === 1 ? 1 : 0, en = 1 - my, NM = ['Azul', 'Vermelho'], A = sq(my), B = sq(en);
      el.innerHTML = panel('ally', ICO.star, 'ALIADOS', `${NM[my]} · ${role(my)} · ${alive(A)}/${A.length} vivos`, A) + panel('enemy', ICO.skull, 'INIMIGOS', `${NM[en]} · ${role(en)} · ${alive(B)}/${B.length} vivos`, B);
    } else {
      const L = [...V.roster].sort((a, b) => (b.alive - a.alive) || b.score - a.score);
      el.innerHTML = panel('solo', ICO.sun, esc(V.modeName.toUpperCase()), `${V.aliveN}/${V.roster.length} vivos`, L);
    }
  }



}
