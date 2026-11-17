/* =====================================================================
   51_audio.js — áudio 100% sintetizado (WebAudio): tiros, recargas, passos,
   explosões, bip da bomba, ambiente de roça e trilha de violão (Karplus-Strong)
   ===================================================================== */
'use strict';
const MUSIC = {
  tranquilo: { name: 'Roçado Tranquilo', bpm: 104, tr: 0, swing: .18, vol: 1, prog: [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]], scale: [60, 62, 64, 67, 69, 72, 74, 76], bass: [0, 8], chords: [4, 12], mel: .55, melEvery: 2, kick: [], hat: 2 },
  celeiro: { name: 'Perigo no Celeiro', bpm: 132, tr: -3, swing: .05, vol: .9, prog: [[48, 51, 55], [44, 48, 51], [46, 50, 53], [43, 47, 50]], scale: [60, 62, 63, 65, 67, 68, 70, 72], bass: [0, 3, 8, 11], chords: [4, 12], mel: .5, melEvery: 2, kick: [0, 4, 8, 12], hat: 2 },
  correria: { name: 'Correria da Mandioca', bpm: 150, tr: -1, swing: 0, vol: .85, prog: [[45, 48, 52], [45, 48, 52], [41, 45, 48], [43, 47, 50]], scale: [57, 59, 60, 62, 64, 65, 67, 69], bass: [0, 2, 4, 6, 8, 10, 12, 14], chords: [0, 8], mel: .6, melEvery: 1, kick: [0, 4, 8, 12], hat: 1 },
  ultimos: { name: 'Últimos Sobreviventes', bpm: 92, tr: -5, swing: 0, vol: .9, prog: [[45, 48, 52], [44, 48, 51], [45, 48, 52], [40, 44, 47]], scale: [57, 60, 62, 63, 64, 67, 69], bass: [0, 6, 8, 14], chords: [12], mel: .35, melEvery: 2, kick: [0, 8], hat: 4 },
  vitoria: { name: 'Vitória no Roçado', bpm: 124, tr: 2, swing: .12, vol: 1.1, prog: [[48, 52, 55], [53, 57, 60], [55, 59, 62], [60, 64, 67]], scale: [60, 64, 67, 72, 74, 76, 79], bass: [0, 4, 8, 12], chords: [2, 6, 10, 14], mel: .8, melEvery: 1, kick: [0, 8], hat: 2 }
};
class Sfx {
  constructor() { this.ctx = null; this.L = { x: 0, y: 0, z: 0, yaw: 0 }; this.nowN = 0; this.budget = 0; this.musicOn = false; this.ambOn = false; this.pl = new Map(); this.ring = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C(); } catch (e) { return; }
    const c = this.ctx; this.master = c.createGain(); this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 22000;
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 5; this.comp.attack.value = 0.003; this.comp.release.value = 0.2;
    this.master.connect(this.lp); this.lp.connect(this.comp); this.comp.connect(c.destination);
    this.sfxB = c.createGain(); this.musB = c.createGain(); this.ambB = c.createGain(); this.revIn = c.createGain();
    for (const b of [this.sfxB, this.musB, this.ambB]) b.connect(this.master);
    const sr = c.sampleRate, nb = (len, f) => { const b = c.createBuffer(1, len * sr | 0, sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = f(i, d); return b; };
    this.white = nb(2.5, () => Math.random() * 2 - 1);
    let p0 = 0; this.pink = nb(3, () => { p0 = p0 * 0.97 + (Math.random() * 2 - 1) * 0.1; return p0 * 3; });
    const ir = nb(1.8, (i, d) => (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6)); this.conv = c.createConvolver(); this.conv.buffer = ir; this.revIn.connect(this.conv); const rg = c.createGain(); rg.gain.value = 0.35; this.conv.connect(rg); rg.connect(this.sfxB);
    this.apply(); this.ksCache = new Map();
  }
  apply() { if (!this.ctx) return; const s = settings; this.master.gain.value = (s.master === undefined ? .8 : s.master); this.sfxB.gain.value = s.sfx === undefined ? 1 : s.sfx; this.musB.gain.value = (s.music === undefined ? .35 : s.music) * 0.5; this.ambB.gain.value = (s.amb === undefined ? .6 : s.amb) * 0.5; }
  listen(x, y, z, yaw) { const L = this.L; L.x = x; L.y = y; L.z = z; L.yaw = yaw; }
  /* destino posicional: devolve um nó de ganho para ligar a fonte */
  dest(pos, vol, rev) {
    const c = this.ctx, g = c.createGain(); let d = 0;
    if (pos) {
      const L = this.L, dx = pos.x - L.x, dy = (pos.y || 0) - L.y, dz = pos.z - L.z; d = Math.hypot(dx, dy, dz);
      vol *= 1 / (1 + (d * d) / 260); if (vol < 0.004) return null;
      const pan = c.createStereoPanner(), rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw); pan.pan.value = clamp((dx * rx + dz * rz) / (d || 1), -1, 1) * 0.85;
      g.gain.value = vol;
      if (d > 38) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = clamp(9000 - d * 55, 900, 9000); g.connect(f); f.connect(pan); } else g.connect(pan);
      pan.connect(this.sfxB);
    } else { g.gain.value = vol; g.connect(this.sfxB); }
    if (rev) { const r = c.createGain(); r.gain.value = rev * (d > 25 ? 1.4 : 1); g.connect(r); r.connect(this.revIn); }
    g.dist = d; return g;
  }
  _env(g, t, a, d, peak) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  noise(out, t, dur, type, f0, f1, q, peak, a, buf) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = buf || this.white; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q || 0.7;
    const g = c.createGain(); this._env(g, t, a || 0.002, dur, peak); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 1.5); s.stop(t + dur + (a || 0.002) + 0.05);
  }
  tone(out, t, type, f0, f1, dur, peak, a) {
    const c = this.ctx, o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); this._env(g, t, a || 0.002, dur, peak); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  /* ---------- tiros ---------- */
  shot(wid, pos, own) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime, v = own ? 1 : 0.9;
    if (!own && pos) { const d = Math.hypot(pos.x - this.L.x, pos.z - this.L.z); if (d > 160) return; if (d > 45 && (this.budget++ & 1)) return; }
    const o = this.dest(own ? null : pos, v, wid === 'vassoura' ? 0.7 : 0.4); if (!o) return;
    if (wid === 'galho') { this.noise(o, t, 0.16, 'bandpass', 2400, 700, 0.9, 1.0, 0.001); this.tone(o, t, 'sine', 190, 55, 0.12, 0.9); this.noise(o, t + 0.005, 0.05, 'highpass', 4500, 0, 0.5, 0.5); this.tone(o, t + 0.01, 'triangle', 780, 300, 0.04, 0.25); }
    else if (wid === 'colher') { this.noise(o, t, 0.09, 'bandpass', 3200, 1200, 1.1, 0.85, 0.001); this.tone(o, t, 'square', 260, 100, 0.05, 0.28); this.tone(o, t, 'sine', 150, 60, 0.07, 0.5); }
    else if (wid === 'vassoura') { this.noise(o, t, 0.5, 'bandpass', 1500, 250, 0.7, 1.15, 0.001); this.tone(o, t, 'sine', 110, 36, 0.35, 1.2); this.noise(o, t, 0.08, 'highpass', 3500, 0, 0.5, 0.7); this.tone(o, t + 0.02, 'sawtooth', 1200, 200, 0.12, 0.18); }
    else if (wid === 'porteira') { this.noise(o, t, 0.42, 'lowpass', 1800, 300, 0.8, 1.25, 0.001); this.tone(o, t, 'sine', 120, 40, 0.3, 1.3); this.noise(o, t, 0.06, 'highpass', 3000, 0, 0.5, 0.6); }
    else if (wid === 'estilingue') { this.tone(o, t, 'triangle', 520, 150, 0.11, 0.7); this.noise(o, t, 0.07, 'bandpass', 3000, 1500, 1.5, 0.55); this.tone(o, t + 0.09, 'sine', 90, 60, 0.07, 0.4); }
  }
  dry() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.6); this.tone(o, t, 'square', 1800, 900, 0.025, 0.3); this.noise(o, t, 0.03, 'highpass', 5000, 0, 0.5, 0.25); }
  reloadStep(wid, k, pos) { /* k: 0 retirar, 1 inserir, 2 armar */
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos || null, 0.55); if (!o) return;
    if (k === 0) { this.noise(o, t, 0.06, 'bandpass', 1400, 700, 2, 0.6); this.tone(o, t, 'square', 420, 200, 0.03, 0.2); }
    else if (k === 1) { this.noise(o, t, 0.09, 'lowpass', 900, 300, 1, 0.8); this.tone(o, t, 'sine', 180, 90, 0.08, 0.6); this.tone(o, t + 0.04, 'square', 900, 500, 0.02, 0.18); }
    else { this.noise(o, t, 0.05, 'bandpass', 2600, 1200, 3, 0.7); this.tone(o, t + 0.07, 'square', 700, 350, 0.03, 0.25); this.noise(o, t + 0.1, 0.05, 'bandpass', 3000, 1800, 3, 0.5); }
  }
  equip(pos) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos || null, 0.35); if (!o) return; this.noise(o, t, 0.12, 'bandpass', 700, 1500, 1.2, 0.5, 0.03); this.tone(o, t + 0.06, 'sine', 240, 150, 0.06, 0.3); }
  knife(hit, pos) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos || null, 0.7); if (!o) return; this.noise(o, t, 0.14, 'bandpass', 2500, 5200, 0.9, 0.55, 0.04); if (hit) { this.tone(o, t + 0.06, 'sine', 160, 60, 0.1, 0.8); this.noise(o, t + 0.06, 0.07, 'lowpass', 1200, 400, 1, 0.8); } }
  throwS(pos) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos || null, 0.5); if (!o) return; this.noise(o, t, 0.2, 'bandpass', 600, 2200, 0.9, 0.4, 0.06); }
  bounce(pos) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos, 0.5); if (!o) return; this.tone(o, t, 'sine', 140, 70, 0.07, 0.7); this.noise(o, t, 0.05, 'lowpass', 1500, 500, 1, 0.5); }
  /* ---------- movimento ---------- */
  step(surf, pos, vol) {
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos || null, (vol || 1) * 0.45); if (!o) return;
    if (surf === 'water') { this.noise(o, t, 0.28, 'bandpass', 900, 2400, 0.8, 0.8, 0.02); return; }
    if (surf === 'wood') { this.tone(o, t, 'sine', 130 + Math.random() * 30, 80, 0.08, 0.7); this.noise(o, t, 0.05, 'bandpass', 1300, 600, 2, 0.5); return; }
    if (surf === 'metal') { this.tone(o, t, 'square', 330 + Math.random() * 50, 200, 0.06, 0.18); this.noise(o, t, 0.06, 'bandpass', 2200, 1200, 3, 0.5); return; }
    this.noise(o, t, 0.1, 'lowpass', 900 + Math.random() * 400, 350, 0.9, 0.9, 0.006); this.noise(o, t, 0.04, 'highpass', 3500, 0, 0.6, 0.18);
  }
  jump() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.3); this.noise(o, t, 0.1, 'bandpass', 600, 1200, 1, 0.5, 0.02); }
  land(v, pos) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos || null, Math.min(1, v / 14) * 0.9); if (!o) return; this.tone(o, t, 'sine', 110, 45, 0.15, 0.9); this.noise(o, t, 0.13, 'lowpass', 1000, 300, 1, 0.9); }
  whiz() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.45); this.noise(o, t, 0.16, 'bandpass', 3800, 900, 3, 0.7, 0.03); }
  /* ---------- feedback ---------- */
  hit(head) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.55); this.tone(o, t, 'sine', head ? 1900 : 1250, head ? 1500 : 900, 0.07, 0.7); if (head) this.tone(o, t + 0.03, 'sine', 2600, 2200, 0.08, 0.5); }
  kill() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.5); this.tone(o, t, 'sine', 980, 980, 0.12, 0.6); this.tone(o, t + 0.09, 'sine', 1470, 1470, 0.22, 0.6); this.tone(o, t, 'sine', 90, 50, 0.2, 0.9); }
  hurt(pos) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.6); this.noise(o, t, 0.15, 'lowpass', 700, 250, 1, 0.9); this.tone(o, t, 'sine', 100, 50, 0.15, 0.7); }
  /* sons cartoon de eliminação: apito subindo (arremessado), "plof" (cara no chão), passarinhos (tonto), "toim" do chapéu */
  funny(kind, pos) {
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos || null, .45); if (!o) return;
    if (kind === 'launch') { this.tone(o, t, 'sine', 500, 1500, .32, .45); this.tone(o, t + .34, 'sine', 1500, 380, .38, .4); }
    else if (kind === 'plop') { this.tone(o, t, 'sine', 160, 55, .22, .9); this.tone(o, t + .02, 'triangle', 420, 180, .1, .25); }
    else if (kind === 'dizzy') { for (let k = 0; k < 4; k++) { this.tone(o, t + .55 + k * .14, 'sine', 2400 + (k % 2) * 500, 2900 + (k % 2) * 400, .08, .22); } this.tone(o, t, 'triangle', 300, 900, .5, .25); }
    else if (kind === 'hat') { this.tone(o, t, 'triangle', 700, 1300, .14, .35); this.tone(o, t + .1, 'triangle', 1300, 900, .16, .25); }
    else { this.tone(o, t, 'triangle', 700, 220, .35, .3); }
  }
  headshot() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.5); this.tone(o, t, 'square', 660, 660, 0.08, 0.25); this.tone(o, t + 0.08, 'square', 880, 880, 0.08, 0.25); this.tone(o, t + 0.16, 'triangle', 1320, 1760, 0.22, 0.4); this.noise(o, t, 0.12, 'highpass', 6000, 0, 0.4, 0.3); }
  water(p) { if (!this.ctx) return; const n = performance.now(); if (n - (this._wT || 0) < 900) return; this._wT = n; const t = this.ctx.currentTime, o = this.dest(p ? { x: p.x, y: 1, z: p.z } : null, 0.35); if (!o) return; this.noise(o, t, 1.1, 'bandpass', 900, 600, 0.6, 0.5); }
  ui(k) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.4); this.tone(o, t, 'triangle', k === 1 ? 880 : 620, k === 1 ? 1320 : 500, 0.08, 0.6); }
  beep(pos, urgent) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos, urgent ? 1.1 : 0.9, 0.2); if (!o) return; this.tone(o, t, 'sine', urgent ? 2300 : 1750, urgent ? 2300 : 1750, 0.1, 0.7); this.tone(o, t, 'square', urgent ? 1150 : 875, 0, 0.06, 0.12); }
  plantTick(pos) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos, 0.5); if (!o) return; this.tone(o, t, 'square', 700, 700, 0.03, 0.2); this.noise(o, t, 0.04, 'bandpass', 2500, 1500, 2, 0.3); }
  planted(pos) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.7); for (let i = 0; i < 3; i++) this.tone(o, t + i * 0.12, 'sine', 600 + i * 220, 600 + i * 220, 0.16, 0.5); }
  defused() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.7); for (let i = 0; i < 4; i++) this.tone(o, t + i * 0.09, 'triangle', 520 * Math.pow(1.26, i), 520 * Math.pow(1.26, i), 0.2, 0.5); }
  alarm() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.6); for (let i = 0; i < 2; i++) this.tone(o, t + i * 0.22, 'sawtooth', 520, 380, 0.2, 0.25); }
  /* barreiras da compra: ligando (zumbido elétrico subindo) / liberando (descarga descendo) */
  barrier(on) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, .5); if (!o) return; if (on) { this.tone(o, t, 'sawtooth', 90, 180, .45, .25); this.tone(o, t + .05, 'square', 440, 880, .25, .12); } else { this.tone(o, t, 'sawtooth', 220, 60, .5, .3); this.noise(o, t, .35, 'highpass', 3000, 0, .5, .2); this.tone(o, t + .1, 'triangle', 880, 1320, .2, .25); } }
  /* estalo de chicote (Pulo do Sítio) e zumbido do enxame (Chuva de Insetos) */
  whip(pos) { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(pos || null, .55); if (!o) return; this.noise(o, t, .05, 'highpass', 4000, 0, 1, .6); this.tone(o, t, 'square', 1800, 300, .06, .3); this.tone(o, t + .04, 'triangle', 300, 900, .25, .25); }
  buzz() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, .25); if (!o) return; this.tone(o, t, 'sawtooth', 210 + Math.random() * 40, 190, .35, .12); this.tone(o, t, 'sawtooth', 320, 300 + Math.random() * 30, .3, .06); }
  roundStart() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.dest(null, 0.7); this.tone(o, t, 'triangle', 440, 440, 0.15, 0.5); this.tone(o, t + 0.14, 'triangle', 660, 660, 0.3, 0.5); }
  /* ---------- explosões ---------- */
  explosion(pos, big, own) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime, d = pos ? Math.hypot(pos.x - this.L.x, pos.y - this.L.y, pos.z - this.L.z) : 0;
    const o = this.dest(pos, big ? 2.4 : 1.3, big ? 1.1 : 0.7); if (!o) return; const k = big ? 2.2 : 1;
    const delay = Math.min(0.9, d / 340), T = t + (big ? delay * 0.5 : delay * 0.3);
    this.noise(o, T, 1.1 * k, 'lowpass', 2600, 160, 0.8, 1.6, 0.004);
    this.noise(o, T, 0.35 * k, 'bandpass', 800, 300, 0.6, 1.2, 0.002);
    this.tone(o, T, 'sine', 70, 20, 1.2 * k, 1.8, 0.004);
    this.tone(o, T + 0.01, 'sine', 140, 40, 0.5 * k, 1.1);
    for (let i = 0; i < (big ? 14 : 6); i++) this.noise(o, T + 0.15 + Math.random() * 0.9 * k, 0.05 + Math.random() * 0.08, 'bandpass', 1800 + Math.random() * 3000, 900, 2, 0.35, 0.001);
    if (big) { this.noise(o, T + 0.5, 1.8, 'lowpass', 700, 120, 0.7, 0.9, 0.2); }
    if (d < (big ? 40 : 14)) this.ringing(big ? 1 : 0.5 * (1 - d / 14));
  }
  ringing(k) {
    if (!this.ctx || k <= 0.05) return; const c = this.ctx, t = c.currentTime;
    this.lp.frequency.cancelScheduledValues(t); this.lp.frequency.setValueAtTime(380, t + 0.02); this.lp.frequency.exponentialRampToValueAtTime(22000, t + 1.2 + 3.2 * k);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 3150; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * k, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 + 3 * k); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 5);
  }
  /* ---------- ambiente e música ---------- */
  startAmbient() {
    if (!this.ctx || this.ambOn) return; this.ambOn = true; const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.pink; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.5; const g = c.createGain(); g.gain.value = 0.28;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.09; const lg = c.createGain(); lg.gain.value = 0.16; lfo.connect(lg); lg.connect(g.gain); lfo.start(); s.connect(f); f.connect(g); g.connect(this.ambB); s.start();
    /* vento varia: rajadas e pausas naturais */
    const gust = () => { if (!this.ambOn) { try { s.stop(); lfo.stop(); } catch (e) { } return; } const t = c.currentTime, r = Math.random(), v = r < .25 ? 0.02 : r < .75 ? 0.22 + Math.random() * .12 : 0.45 + Math.random() * .2, d = 2 + Math.random() * 5; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(v, t + d * .6); f.frequency.linearRampToValueAtTime(300 + v * 600, t + d * .6); setTimeout(gust, d * 1000 + Math.random() * 4000); }; setTimeout(gust, 3000);
    const cricket = () => { if (!this.ambOn) return; if (Math.random() < .6) { const t = c.currentTime; for (let i = 0; i < 6; i++) { const o = c.createOscillator(), gg = c.createGain(); o.type = 'square'; o.frequency.value = 4200 + Math.random() * 300; gg.gain.value = 0; o.connect(gg); gg.connect(this.ambB); const tt = t + i * .09; gg.gain.setValueAtTime(0, tt); gg.gain.linearRampToValueAtTime(.012, tt + .01); gg.gain.linearRampToValueAtTime(0, tt + .05); o.start(tt); o.stop(tt + .06); } } setTimeout(cricket, 2500 + Math.random() * 5000); }; setTimeout(cricket, 4000);
    const bird = () => { if (!this.ambOn) return; const t = c.currentTime, o = this.dest(null, 0.14 + Math.random() * 0.1); const base = 2200 + Math.random() * 1800, n = 2 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) { const dest = o; const osc = c.createOscillator(); osc.type = 'sine'; const gg = c.createGain(); gg.gain.value = 0; osc.connect(gg); gg.connect(this.ambB); const tt = t + i * 0.11; osc.frequency.setValueAtTime(base, tt); osc.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * .4), tt + 0.07); gg.gain.setValueAtTime(0, tt); gg.gain.linearRampToValueAtTime(0.06, tt + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.09); osc.start(tt); osc.stop(tt + 0.12); } setTimeout(bird, 1800 + Math.random() * 6500); };
    setTimeout(bird, 1500);
    const rooster = () => { if (!this.ambOn) return; const t = c.currentTime, osc = c.createOscillator(); osc.type = 'sawtooth'; const gg = c.createGain(), fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 1100; fl.Q.value = 3; osc.connect(fl); fl.connect(gg); gg.connect(this.ambB); osc.frequency.setValueAtTime(520, t); osc.frequency.linearRampToValueAtTime(1100, t + 0.18); osc.frequency.setValueAtTime(900, t + 0.2); osc.frequency.linearRampToValueAtTime(700, t + 0.5); osc.frequency.linearRampToValueAtTime(1000, t + 0.6); osc.frequency.linearRampToValueAtTime(420, t + 1.1); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.05, t + 0.05); gg.gain.setValueAtTime(0.05, t + 1.0); gg.gain.linearRampToValueAtTime(0, t + 1.15); osc.start(t); osc.stop(t + 1.2); setTimeout(rooster, 22000 + Math.random() * 30000); };
    setTimeout(rooster, 9000);
    const moo = () => { if (!this.ambOn) return; const t = c.currentTime, osc = c.createOscillator(); osc.type = 'sawtooth'; const gg = c.createGain(), fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 520; osc.connect(fl); fl.connect(gg); gg.connect(this.ambB); osc.frequency.setValueAtTime(110, t); osc.frequency.linearRampToValueAtTime(86, t + 1.5); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.05, t + 0.3); gg.gain.linearRampToValueAtTime(0, t + 1.6); osc.start(t); osc.stop(t + 1.7); setTimeout(moo, 25000 + Math.random() * 40000); };
    setTimeout(moo, 14000);
  }
  stopAmbient() { this.ambOn = false; }
  pluck(freq, t, vol, bus) {
    const c = this.ctx, sr = c.sampleRate; let b = this.ksCache.get(freq);
    if (!b) {
      const N = Math.max(2, Math.round(sr / freq)), len = (1.4 * sr) | 0, buf = new Float32Array(N); for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
      b = c.createBuffer(1, len, sr); const d = b.getChannelData(0); let idx = 0; for (let i = 0; i < len; i++) { d[i] = buf[idx]; const n = (idx + 1) % N; buf[idx] = 0.4985 * (buf[idx] + buf[n]); idx = n; }
      this.ksCache.set(freq, b);
    }
    const s = c.createBufferSource(); s.buffer = b; const g = c.createGain(); g.gain.value = vol; s.connect(g); g.connect(bus || this.musB); s.start(t);
  }
  /* 5 trilhas procedurais com transição suave: tranquilo (menu), celeiro (combate), correria (zona), ultimos (final do BR), vitoria */
  setTrack(id) {
    if (!MUSIC[id] || this.track === id) return; this.track = id; if (!this.ctx || !this.musicOn) return;
    const g = this.musFade, t = this.ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.001, t + 0.7);
    setTimeout(() => { this.mt = MUSIC[this.track]; this.mstep = 0; if (this.ctx) { const t2 = this.ctx.currentTime; g.gain.cancelScheduledValues(t2); g.gain.setValueAtTime(0.001, t2); g.gain.linearRampToValueAtTime(1, t2 + 1.2); } }, 720);
  }
  startMusic(id) {
    if (id) this.track = id; if (!this.ctx || this.musicOn) { if (id) this.setTrack(id); return; } this.musicOn = true; const c = this.ctx;
    if (!this.musFade) { this.musFade = c.createGain(); this.musFade.connect(this.musB); } this.musFade.gain.value = 1;
    this.mt = MUSIC[this.track || 'tranquilo']; this.mstep = 0; let next = c.currentTime + 0.2, last = 4;
    const mf = m => 440 * Math.pow(2, (m - 69) / 12), bus = this.musFade;
    this.musTimer = setInterval(() => {
      if (!this.musicOn || !this.ctx) return;
      while (next < c.currentTime + 0.25) {
        const M = this.mt, sp = 60 / M.bpm / 4, step = this.mstep, bar = ((step / 16) | 0) % M.prog.length, st = step % 16, ch = M.prog[bar].map(n => n + M.tr), sw = (st % 2 ? sp * M.swing : 0), T = next + sw;
        if (M.bass.includes(st)) this.pluck(mf(ch[0] - 12), T, 0.5 * M.vol, bus); if (st === 6 || st === 14) this.pluck(mf(ch[2] - 12), T, 0.34 * M.vol, bus);
        if (M.chords.includes(st)) ch.forEach((n, i) => this.pluck(mf(n + 12), T + i * 0.018, 0.18 * M.vol, bus));
        if (st % M.melEvery === 0 && Math.random() < M.mel) { last = clamp(last + (Math.random() * 5 - 2) | 0, 0, M.scale.length - 1); this.pluck(mf(M.scale[last] + M.tr), T, (0.15 + Math.random() * 0.06) * M.vol, bus); }
        if (M.kick.includes(st)) { this.tone(bus, T, 'sine', 120, 40, 0.16, 0.55 * M.vol); }
        if (st % M.hat === 0) { this.noise(bus, T, 0.04, 'highpass', 6500, 0, 0.5, (st % 8 === 0 ? 0.1 : 0.05) * M.vol); }
        next += sp; this.mstep++;
      }
    }, 40);
  }
  stopMusic() { this.musicOn = false; clearInterval(this.musTimer); }
}
const sfx = new Sfx();
