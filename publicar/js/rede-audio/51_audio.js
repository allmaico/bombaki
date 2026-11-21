/* =====================================================================
   51_audio.js — BOMBAKI AUDIO ENGINE 2.0
   100% procedural (Web Audio API): nenhum arquivo de áudio.
   Um único arquivo, organizado em 12 seções dentro da classe Sfx:
    1 AudioCore        contexto, desbloqueio, estatísticas
    2 AudioBus         master/limitador, efeitos, música (ducking), ambiente, reverb
    3 AudioDSP         osciladores, ruídos (branco/rosa/marrom), ADSR, filtros, saturação
    4 AudioLayers      transientes, ressonância de materiais, camadas, variação
    5 AudioSpatial     3D (PannerNode/HRTF), distância, obstrução, Doppler
    6 AudioEnvironment salas (aberto, casa, celeiro, galpão, porão) com reverb gerado
    7 AudioWeapons     tiros por perfil, recargas, equipar, faca, arremesso
    8 AudioMovement    passos por material, pulo, aterrissagem, água
    9 AudioCombat      dano, abate, headshot, explosões, mandioca, impactos
   10 AudioAmbient     vento, folhas, grilos, pássaros, galo, vaca, porco, galinha
   11 AudioMusic       instrumentos (violão, baixo, sanfona, glockenspiel, sinos,
                       zabumba, triângulo…) e trilhas compostas com camadas
   12 AudioManager     vozes, prioridades, deduplicação, limpeza, qualidade adaptativa
   A interface pública antiga (sfx.shot, sfx.step, sfx.explosion…) continua igual.
   ===================================================================== */
'use strict';

/* ---------------- dados: salas, materiais e armas ---------------- */
const AUDIO_ROOMS = {
  aberto: { len: .8, decay: 6.5, wet: .07, tone: 7000 },
  casa: { len: .6, decay: 4.5, wet: .2, tone: 5200 },
  celeiro: { len: 1.5, decay: 3, wet: .26, tone: 4200 },
  galpao: { len: 2.5, decay: 2.3, wet: .32, tone: 3600 },
  porao: { len: 3.2, decay: 1.9, wet: .36, tone: 3000 }
};
/* ressonância de materiais: modos (múltiplos da fundamental), faixa da fundamental, decaimento, ruído do contato */
const AUDIO_MAT = {
  wood: { modes: [1, 2.32, 4.1, 6.3], base: [170, 260], decay: .08, ring: .55, nf: 1600, nq: 1.1, gain: .8 },
  metal: { modes: [1, 2.76, 5.4, 8.93, 13.3], base: [380, 720], decay: .6, ring: .7, nf: 4200, nq: 2, gain: .5 },
  stone: { modes: [1, 1.9, 3.3], base: [320, 520], decay: .035, ring: .35, nf: 2600, nq: .8, gain: .85 },
  dirt: { modes: [1, 1.6], base: [80, 130], decay: .04, ring: .25, nf: 700, nq: .6, gain: .9 },
  hay: { modes: [], base: [0, 0], decay: 0, ring: 0, nf: 2400, nq: .5, gain: .7 },
  glass: { modes: [1, 2.32, 3.8, 5.2, 7.1], base: [1900, 2700], decay: .28, ring: .6, nf: 6000, nq: 2.5, gain: .45 },
  water: { modes: [], base: [0, 0], decay: 0, ring: 0, nf: 1100, nq: .7, gain: .8 },
  rubber: { modes: [1, 1.5], base: [110, 160], decay: .025, ring: .2, nf: 500, nq: .7, gain: .7 },
  flesh: { modes: [1], base: [85, 120], decay: .045, ring: .3, nf: 900, nq: .6, gain: .9 }
};
/* perfis das armas: ataque (estalo), corpo (pressão), ruído (explosão do disparo), cauda, mecânica, variação e espaço */
const WEAPON_SND = {
  galho: { click: [5200, .55], body: ['sine', 175, 55, .13, .95], nz: ['bandpass', 2300, 650, .9, .17, 1], tail: [900, 200, .45, .35], mech: [.05, 1300, .3], sat: .35, vary: .05, rev: .45, far: 1 },
  colher: { click: [6500, .6], body: ['triangle', 240, 85, .08, .7], nz: ['bandpass', 3200, 1100, 1.1, .1, .85], tail: [1400, 300, .3, .25], mech: [.04, 2200, .22], sat: .25, vary: .06, rev: .4, far: .8 },
  vassoura: { click: [4200, .7], body: ['sine', 105, 33, .42, 1.25], nz: ['bandpass', 1500, 230, .7, .52, 1.15], tail: [700, 120, 1.25, .55], mech: [.55, 900, .35], sat: .7, vary: .04, rev: .8, far: 1.6, slap: .12 },
  /* v7.9: Porteira virou fuzil pesado (pancada grave, sem chumbos) */
  porteira: { click: [4600, .62], body: ['sine', 150, 46, .17, 1.08], nz: ['bandpass', 1900, 520, .8, .21, 1.1], tail: [850, 180, .58, .42], mech: [.06, 1100, .32], sat: .5, vary: .04, rev: .52, far: 1.25, heavy: 1 },
  /* armas novas: cada uma com o próprio timbre */
  enxadao: { click: [5800, .55], body: ['triangle', 210, 70, .1, .85], nz: ['bandpass', 2800, 800, 1, .14, .95], tail: [1000, 220, .4, .3], mech: [.05, 1500, .28], sat: .3, vary: .05, rev: .42, far: .9, ring: 1 },
  cabrita: { click: [7200, .55], body: ['triangle', 300, 110, .06, .6], nz: ['bandpass', 3800, 1300, 1.2, .08, .8], tail: [1600, 350, .25, .2], mech: [.03, 2600, .2], sat: .2, vary: .08, rev: .35, far: .7, chain: 1 },
  moedor: { click: [5200, .55], body: ['sine', 200, 70, .09, .78], nz: ['lowpass', 2400, 600, .9, .12, .95], tail: [1200, 260, .36, .28], mech: [.04, 1700, .25], sat: .38, vary: .06, rev: .4, far: .85, grind: 1 },
  vara: { click: [4800, .65], body: ['sine', 140, 45, .3, 1.05], nz: ['bandpass', 2000, 300, .8, .38, 1], tail: [800, 150, .9, .45], mech: [.5, 1100, .3], sat: .55, vary: .05, rev: .7, far: 1.4, slap: .1, heavy: 1 },
  trezoitao: { click: [4400, .6], body: ['sine', 160, 50, .2, 1], nz: ['bandpass', 2200, 500, .9, .22, 1.05], tail: [900, 180, .6, .4], mech: [.25, 1800, .35], sat: .55, vary: .04, rev: .55, far: 1.2, heavy: 1, cyl: 1 },
  tijolinho: { click: [6800, .5], body: ['triangle', 330, 120, .07, .7], nz: ['bandpass', 3300, 1200, 1.2, .08, .8], tail: [1400, 300, .25, .22], mech: [.03, 2400, .2], sat: .2, vary: .06, rev: .35, far: .7 },
  estilingue: { click: [3000, .35], body: ['triangle', 520, 150, .11, .65], nz: ['bandpass', 3000, 1500, 1.5, .07, .5], tail: [600, 2200, .2, .25], mech: [0, 0, 0], sat: 0, vary: .08, rev: .25, far: .45, rubber: 1 }
};

/* v7.10: mixagem — volume de cada arma medido (RMS dos primeiros 350 ms) e acertado numa escada:
   pesadas (Vassoura, Vara, Porteira, Trezoitão) > fuzis > metralhadoras e Tijolinho > estilingue */
const WEAPON_MIX = { vassoura: .92, vara: .98, porteira: 1, trezoitao: .82, galho: 1, enxadao: 1.13, moedor: 1, colher: 1.16, cabrita: 1.32, tijolinho: 1.23, estilingue: 1.29 };

class Sfx {
  /* ===================== 1. AudioCore ===================== */
  constructor() {
    this.ctx = null; this.L = { x: 0, y: 0, z: 0, yaw: 0, vx: 0, vy: 0, vz: 0 }; this.musicOn = false; this.ambOn = false; this.track = 'natal';
    this.voices = []; this.dedup = new Map(); this.budget = 0; this._occN = 0; this.occlude = null; this.roomId = 'aberto';
    this.q = { voices: 56, hrtf: true, rev: true, level: 'alto' }; this.stats = { played: 0, dropped: 0, stolen: 0, dedup: 0, notes: 0, freed: 0 };
    this._fpsEma = 60; this._slowT = 0; this._lastListen = 0; this.intensity = 1; this.mus = null;
  }
  /** cria o contexto (ou usa um contexto dado — OfflineAudioContext nos testes). Sem áudio disponível, tudo vira silêncio sem erro. */
  init(ctxIn) {
    if (this.ctx) { if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume().catch(() => { }); return; }
    try { const C = window.AudioContext || /** @type {any} */ (window).webkitAudioContext; this.ctx = ctxIn || new C({ latencyHint: 'interactive' }); } catch (e) { this.ctx = null; return; }
    this.offline = !!ctxIn; this._buses(); this._noiseBufs(); this.setRoom('aberto', true); this.apply(); this.ksCache = new Map(); this.curves = new Map();
    if (!this.offline) this._sweepT = setInterval(() => this._prune(this._now()), 250);
  }
  get ready() { return !!this.ctx; }
  /** relógio do áudio (o deslocamento só é usado para montar demonstrações offline nos testes) */
  _now() { return this.ctx.currentTime + (this._tBias || 0); }
  /* ===================== 2. AudioBus ===================== */
  _buses() {
    const c = this.ctx;
    this.master = c.createGain();
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 22000; this.lp.Q.value = .5;   /* zumbido pós-explosão */
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.knee.value = 8; this.comp.ratio.value = 4; this.comp.attack.value = .004; this.comp.release.value = .22;
    this.lim = c.createDynamicsCompressor(); this.lim.threshold.value = -2; this.lim.knee.value = 0; this.lim.ratio.value = 20; this.lim.attack.value = .001; this.lim.release.value = .08;
    this.master.connect(this.lp); this.lp.connect(this.comp); this.comp.connect(this.lim); this.lim.connect(c.destination);
    this.sfxB = c.createGain(); this.musB = c.createGain(); this.ambB = c.createGain();
    this.musDuck = c.createGain(); this.musEq = c.createBiquadFilter(); this.musEq.type = 'peaking'; this.musEq.frequency.value = 2500; this.musEq.Q.value = .7; this.musEq.gain.value = 0;
    this.musDuck.connect(this.musEq); this.musEq.connect(this.musB);
    this.ambDuck = c.createGain(); this.ambDuck.connect(this.ambB);
    for (const b of [this.sfxB, this.musB, this.ambB]) b.connect(this.master);
    /* reverb: dois convolvers para trocar de sala com crossfade */
    this.revIn = c.createGain(); this.revA = c.createConvolver(); this.revB = c.createConvolver(); this.revGA = c.createGain(); this.revGB = c.createGain(); this.revGB.gain.value = 0;
    this.revIn.connect(this.revA); this.revIn.connect(this.revB); this.revA.connect(this.revGA); this.revB.connect(this.revGB); this.revGA.connect(this.master); this.revGB.connect(this.master); this.revCur = 'A';
    this.musRev = c.createGain(); this.musRev.gain.value = .16; this.musRev.connect(this.revIn);
  }
  /** volumes das configurações (master, efeitos, música, ambiente) */
  apply() {
    if (!this.ctx) return; const s = typeof settings !== 'undefined' ? settings : {};
    const v = (k, d) => (s[k] === undefined ? d : +s[k]);
    this.master.gain.value = v('master', .8); this.sfxB.gain.value = v('sfx', 1); this.musB.gain.value = v('music', .35) * 1.15; this.ambB.gain.value = v('amb', .6);
  }
  /* ===================== 3. AudioDSP ===================== */
  _noiseBufs() {
    const c = this.ctx, sr = c.sampleRate, nb = (len, f, ch) => { const b = c.createBuffer(ch || 1, len * sr | 0, sr); for (let k = 0; k < (ch || 1); k++) { const d = b.getChannelData(k); for (let i = 0; i < d.length; i++) d[i] = f(i, d.length); } return b; };
    this.white = nb(2.5, () => Math.random() * 2 - 1);
    let b0 = 0, b1 = 0, b2 = 0; this.pink = nb(3, () => { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; return (b0 + b1 + b2 + w * .1848) * .2; });
    let br = 0; this.brown = nb(3, () => { br = (br + .02 * (Math.random() * 2 - 1)) / 1.02; return br * 3.2; });
  }
  /** envelope ADSR num parâmetro de ganho */
  adsr(param, t, a, d, s, r, dur, peak) {
    param.cancelScheduledValues(t); param.setValueAtTime(.0001, t); param.linearRampToValueAtTime(peak, t + a);
    if (d > 0) param.setTargetAtTime(Math.max(.0001, peak * s), t + a, d / 3);
    const rel = Math.max(t + a + .001, t + dur); param.setValueAtTime(Math.max(.0001, peak * s), rel); param.exponentialRampToValueAtTime(.0001, rel + r);
    return rel + r;
  }
  _env(g, t, a, d, peak) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  _track(out, end) { const v = out && out._v; if (v && end > v.end) v.end = end; }
  _done(src, nodes) { src.onended = () => { for (const n of nodes) { try { n.disconnect(); } catch (e) { } } this.stats.freed++; }; }
  /** ruído filtrado com varredura de frequência (assinatura antiga preservada) */
  noise(out, t, dur, type, f0, f1, q, peak, a, buf) {
    if (!out) return; const c = this.ctx, s = c.createBufferSource(), pf = out._pitch || 1; s.buffer = buf || this.white; s.loop = true; s.playbackRate.value = .8 + Math.random() * .4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(Math.min(20000, f0 * pf), t); if (f1) f.frequency.exponentialRampToValueAtTime(Math.min(20000, Math.max(20, f1 * pf)), t + dur); f.Q.value = q || 1;
    const g = c.createGain(); this._env(g, t, a || .002, dur, peak); s.connect(f); f.connect(g); g.connect(out);
    const end = t + dur + (a || 0) + .05; s.start(t, Math.random() * 1.5); s.stop(end); this._done(s, [s, f, g]); this._track(out, end);
  }
  /** oscilador com glissando e envelope percussivo (assinatura antiga preservada) */
  tone(out, t, type, f0, f1, dur, peak, a) {
    if (!out) return; const c = this.ctx, o = c.createOscillator(), pf = out._pitch || 1; o.type = type; o.frequency.setValueAtTime(f0 * pf, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * pf), t + dur);
    const g = c.createGain(); this._env(g, t, a || .002, dur, peak); o.connect(g); g.connect(out); const end = t + dur + .06; o.start(t); o.stop(end); this._done(o, [o, g]); this._track(out, end);
  }
  /** oscilador com ADSR completo e desafinação opcional */
  oscillator(out, t, o) {
    if (!out) return; const c = this.ctx, n = c.createOscillator(), pf = out._pitch || 1; n.type = o.type || 'sine'; n.frequency.setValueAtTime(o.f * pf, t); if (o.f1) n.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1 * pf), t + (o.glide || o.dur));
    if (o.detune) n.detune.value = o.detune; const g = c.createGain(); n.connect(g);
    let tail = g; if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || .7; g.connect(f); tail = f; }
    tail.connect(out); const end = this.adsr(g.gain, t, o.a || .005, o.d || .1, o.s === undefined ? .6 : o.s, o.r || .1, o.dur, o.peak || .5) + .02;
    n.start(t); n.stop(end); this._done(n, tail === g ? [n, g] : [n, g, tail]); this._track(out, end); return n;
  }
  /** saturação suave (dá corpo a tiros e explosões); curvas guardadas em cache */
  saturator(out, amt) {
    if (!out || !amt) return out; const c = this.ctx, k = Math.round(amt * 10); let cv = this.curves.get(k);
    if (!cv) { cv = new Float32Array(1024); const K = 1 + amt * 18; for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cv[i] = Math.tanh(K * x) / Math.tanh(K); } this.curves.set(k, cv); }
    const ws = c.createWaveShaper(); ws.curve = cv; ws.oversample = '2x'; ws.connect(out); if (out._v) { ws._v = out._v; out._v.nodes.push(ws); } ws._pitch = out._pitch; return ws;
  }
  /* ===================== 4. AudioLayers ===================== */
  vary(x, pct) { return x * (1 + (Math.random() * 2 - 1) * (pct || .05)); }
  /** transiente: o "estalo" inicial de qualquer impacto */
  transient(out, t, f, peak) { this.noise(out, t, .012, 'highpass', f || 3500, 0, .7, peak || .6, .0005); this.tone(out, t, 'square', (f || 3500) * .35, (f || 3500) * .12, .008, (peak || .6) * .35, .0005); }
  /** ressonância modal de um material (soma de senos amortecidos) */
  resonator(out, t, mat, strength) {
    const M = AUDIO_MAT[mat] || AUDIO_MAT.dirt; if (!out || !M.modes.length) return; const f0 = M.base[0] + Math.random() * (M.base[1] - M.base[0]);
    M.modes.forEach((r, i) => { const f = f0 * r * this.vary(1, .015); if (f > 16000) return; this.tone(out, t, 'sine', f, f * .995, M.decay * (1 + M.ring * (M.modes.length - i) / M.modes.length) * 2.2, (.5 / (1 + i * .8)) * strength * M.gain, .001); });
  }
  /** impacto completo de material: transiente + ruído do contato + ressonância */
  materialHit(out, t, mat, strength) {
    const M = AUDIO_MAT[mat] || AUDIO_MAT.dirt, s = strength || 1; if (!out) return;
    if (mat !== 'water' && mat !== 'hay') this.transient(out, t, mat === 'metal' || mat === 'glass' ? 6000 : 3000, .35 * s);
    this.noise(out, t, mat === 'water' ? .3 : mat === 'hay' ? .14 : .07, 'bandpass', M.nf * this.vary(1, .15), M.nf * .5, M.nq, .7 * s * M.gain, mat === 'water' ? .01 : .001, mat === 'dirt' ? this.brown : undefined);
    if (mat === 'water') for (let k = 0; k < 4; k++) this.tone(out, t + .02 + Math.random() * .15, 'sine', 600 + Math.random() * 900, 1400 + Math.random() * 1200, .05, .12 * s);
    this.resonator(out, t, mat, s);
  }
  /** várias camadas descritas como dados (usado pelas armas) */
  layer(out, t, L) { for (const l of L) { if (!l) continue; if (l.k === 'n') this.noise(out, t + (l.dt || 0), l.dur, l.type, l.f0, l.f1, l.q, l.peak, l.a, l.buf); else this.tone(out, t + (l.dt || 0), l.type, l.f0, l.f1, l.dur, l.peak, l.a); } }
  /* ===================== 5. AudioSpatial ===================== */
  /** posição/orientação do ouvinte (chamado pela câmera a cada quadro); também mede o fps para a qualidade adaptativa */
  listen(x, y, z, yaw) {
    const L = this.L, n = typeof performance !== 'undefined' ? performance.now() : 0, dt = this._lastListen ? Math.min(.25, (n - this._lastListen) / 1000) : 0; this._lastListen = n; this._occN = 0;
    if (dt > 0) { L.vx = (x - L.x) / dt; L.vy = (y - L.y) / dt; L.vz = (z - L.z) / dt; this._fpsEma = this._fpsEma * .95 + (1 / dt) * .05; this._adapt(dt); }
    L.x = x; L.y = y; L.z = z; L.yaw = yaw;
    if (!this.ctx) return; const ls = this.ctx.listener, fx = -Math.sin(yaw), fz = -Math.cos(yaw), t = this._now();
    if (ls.positionX) { ls.positionX.setValueAtTime(x, t); ls.positionY.setValueAtTime(y, t); ls.positionZ.setValueAtTime(z, t); ls.forwardX.setValueAtTime(fx, t); ls.forwardY.setValueAtTime(0, t); ls.forwardZ.setValueAtTime(fz, t); ls.upX.setValueAtTime(0, t); ls.upY.setValueAtTime(1, t); ls.upZ.setValueAtTime(0, t); }
    else if (ls.setPosition) { ls.setPosition(x, y, z); ls.setOrientation(fx, 0, fz, 0, 1, 0); }
  }
  /**
   * Saída de um som: volume, distância, direção 3D, obstrução, Doppler, reverb e registro no gerenciador de vozes.
   * pos = null → som "na cabeça" (do próprio jogador). opt: { prio 1..3, key, vel, bus }
   */
  dest(pos, vol, rev, opt) {
    if (!this.ctx) return null; opt = opt || {}; const c = this.ctx, prio = opt.prio || 2; let d = 0, occ = false;
    if (pos) { const L = this.L, dx = pos.x - L.x, dy = (pos.y || 0) - L.y, dz = pos.z - L.z; d = Math.hypot(dx, dy, dz); vol *= 1 / (1 + (d * d) / 260); if (vol < .004) return null;
      if (this.occlude && d > 2 && d < 90 && this._occN < 14) { this._occN++; try { occ = !!this.occlude(pos.x, (pos.y || 0) + .9, pos.z); } catch (e) { occ = false; } } }
    const v = this._alloc(prio, opt.key); if (!v) return null;
    const g = c.createGain(); g.gain.value = occ ? vol * .5 : vol; g._v = v; v.g = g; v.nodes = [g]; let tail = g;
    if (pos) {
      const lpF = Math.min(occ ? 1000 : 22000, d > 38 ? Math.max(900, Math.min(9000, 9000 - d * 55)) : 22000);
      if (lpF < 20000) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lpF; f.Q.value = .5; tail.connect(f); tail = f; v.nodes.push(f); }
      const p = c.createPanner(); p.panningModel = this.q.hrtf && (prio >= 3 || d < 22) ? 'HRTF' : 'equalpower'; p.distanceModel = 'linear'; p.rolloffFactor = 0; p.refDistance = 1; p.maxDistance = 10000;
      const px = d < .4 ? this.L.x + .01 : pos.x, py = d < .4 ? this.L.y : (pos.y || 0), pz = d < .4 ? this.L.z : pos.z;
      if (p.positionX) { p.positionX.value = px; p.positionY.value = py; p.positionZ.value = pz; } else p.setPosition(px, py, pz);
      tail.connect(p); p.connect(opt.bus || this.sfxB); v.nodes.push(p);
      /* Doppler: fonte em movimento muda a altura do som (c = 343 m/s) */
      if (opt.vel) { const ux = unit(pos, this.L, 'x', d), uy = unit(pos, this.L, 'y', d), uz = unit(pos, this.L, 'z', d), vs = opt.vel.x * ux + (opt.vel.y || 0) * uy + opt.vel.z * uz, vl = this.L.vx * ux + this.L.vy * uy + this.L.vz * uz; g._pitch = Math.max(.6, Math.min(1.6, (343 + vl) / (343 + vs))); }
    } else tail.connect(opt.bus || this.sfxB);
    if (rev && this.q.rev) { const R = AUDIO_ROOMS[this.roomId] || AUDIO_ROOMS.aberto, r = c.createGain(); r.gain.value = Math.min(1.6, rev * (R.wet / .1) * (d > 25 ? 1.4 : 1) * (occ ? 1.6 : 1)) * (occ ? vol * .5 : vol); tail.connect(r); r.connect(this.revIn); v.nodes.push(r); }
    g.dist = d; g.occ = occ; return g;
    function unit(P, L, k, D) { return D > 0 ? (L[k] - (P[k] || 0)) / D : 0; }
  }
  /* ===================== 6. AudioEnvironment ===================== */
  /** acústica da sala onde a câmera está (o jogo informa: aberto, casa, celeiro, galpao, porao) */
  setRoom(id, now) {
    if (!this.ctx || !AUDIO_ROOMS[id] || (this.roomId === id && !now)) return; this.roomId = id; const R = AUDIO_ROOMS[id], c = this.ctx, t = this._now();
    const ir = this._ir(R), into = now ? 'A' : this.revCur === 'A' ? 'B' : 'A'; (into === 'A' ? this.revA : this.revB).buffer = ir;
    const gi = into === 'A' ? this.revGA : this.revGB, go = into === 'A' ? this.revGB : this.revGA;
    gi.gain.cancelScheduledValues(t); go.gain.cancelScheduledValues(t);
    if (now) { gi.gain.value = 1; go.gain.value = 0; } else { gi.gain.setValueAtTime(gi.gain.value, t); gi.gain.linearRampToValueAtTime(1, t + .35); go.gain.setValueAtTime(go.gain.value, t); go.gain.linearRampToValueAtTime(0, t + .35); }
    this.revCur = into;
  }
  /** resposta impulsiva estéreo: reflexões iniciais + cauda de ruído que escurece com o tempo */
  _ir(R) {
    this._irC = this._irC || new Map(); if (this._irC.has(R)) return this._irC.get(R);
    const c = this.ctx, sr = c.sampleRate, n = Math.max(1, R.len * sr | 0), b = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0; const a0 = Math.exp(-2 * Math.PI * R.tone / sr);
      for (let i = 0; i < n; i++) { const x = i / n, env = Math.pow(1 - x, R.decay * .6) * Math.exp(-x * R.decay), k = a0 + (1 - a0) * x * .7; lp = lp * k + (Math.random() * 2 - 1) * (1 - k); d[i] = lp * env * 2.4; }
      for (let e = 0; e < 7; e++) { const at = ((.004 + e * .011 * (1 + R.len * .4)) * sr + ch * 37) | 0; if (at < n) d[at] += (Math.random() > .5 ? 1 : -1) * (.5 - e * .05); }
    }
    this._irC.set(R, b); return b;
  }
  /* ===================== 12. AudioManager (antes dos efeitos: todos dependem dele) ===================== */
  _alloc(prio, key) {
    const now = this._now();
    if (key) { const last = this.dedup.get(key); if (last !== undefined && now - last < .035) { this.stats.dedup++; return null; } this.dedup.set(key, now); if (this.dedup.size > 256) this.dedup.clear(); }
    this._prune(now);
    if (this.voices.length >= this.q.voices) {
      let w = null; for (const v of this.voices) if (!w || v.prio < w.prio || (v.prio === w.prio && v.t0 < w.t0)) w = v;
      if (!w || w.prio > prio || (w.prio === prio && prio < 3)) { this.stats.dropped++; return null; }
      this._kill(w, now); this.stats.stolen++;
    }
    const v = { prio, t0: now, end: now + .08, g: null, nodes: [] }; this.voices.push(v); this.stats.played++; return v;
  }
  _prune(now) { if (this.offline) return; for (let i = this.voices.length - 1; i >= 0; i--) { const v = this.voices[i]; if (v.end + .12 < now) { this._free(v); this.voices.splice(i, 1); } } }
  _free(v) { if (v.nodes) for (const n of v.nodes) { try { n.disconnect(); } catch (e) { } } v.nodes = null; }
  _kill(v, now) { const i = this.voices.indexOf(v); if (i >= 0) this.voices.splice(i, 1); if (v.g) { v.g.gain.cancelScheduledValues(now); v.g.gain.setTargetAtTime(0, now, .012); } setTimeout(() => this._free(v), 120); }
  /** qualidade adaptativa: com fps baixo por 2 s, menos vozes, sem HRTF e reverb só nos sons críticos */
  _adapt(dt) {
    if (this._fpsEma < 32) this._slowT += dt; else this._slowT = Math.max(0, this._slowT - dt * .5);
    const low = this._slowT > 2; if (low === (this.q.level === 'baixo')) return;
    this.q = low ? { voices: 30, hrtf: false, rev: true, level: 'baixo' } : { voices: 56, hrtf: true, rev: true, level: 'alto' };
  }
  /** abaixa a música (e o ambiente) por um instante quando há tiros, explosões ou dano — sidechain ducking */
  duck(amt, hold, rel) {
    if (!this.ctx) return; const t = this._now(), g = this.musDuck.gain, a = this.ambDuck.gain, to = Math.max(.25, 1 - (amt || .4));
    if (g.value > to) { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + .025); }
    g.setTargetAtTime(1, t + (hold || .15), (rel || .6) / 3);
    a.cancelScheduledValues(t); a.setValueAtTime(a.value, t); a.linearRampToValueAtTime(Math.max(.4, to + .2), t + .03); a.setTargetAtTime(1, t + (hold || .15), (rel || .8) / 3);
  }
  /** estado do motor (usado nos testes e no painel de desempenho) */
  info() { return { playlist: this.pl ? this.pl.ids.slice() : null, plIndex: this.pl ? this.pl.i : -1, voices: this.voices.length, max: this.q.voices, quality: this.q.level, room: this.roomId, track: this.track, intensity: this.intensity, stats: Object.assign({}, this.stats), state: this.ctx ? this.ctx.state : 'none' }; }
  /* ===================== 7. AudioWeapons ===================== */
  shot(wid, pos, own) {
    if (!this.ctx) return; if (!WEAPON_SND[wid] && typeof wBase === 'function') wid = wBase(wid);   /* arma sem timbre próprio usa o da base */
    const t = this._now(), P = WEAPON_SND[wid] || WEAPON_SND.galho;
    if (!own && pos) { const d = Math.hypot(pos.x - this.L.x, pos.z - this.L.z); if (d > 170) return; if (d > 45 && (this.budget++ & 1)) return; }
    const o0 = this.dest(own ? null : pos, (own ? 1 : .95) * (WEAPON_MIX[wid] || 1), P.rev, { prio: own ? 3 : 2, key: own ? '' : 'sh' + wid + (pos ? (pos.x | 0) + ',' + (pos.z | 0) : '') }); if (!o0) return;
    const o = this.saturator(o0, P.sat), pv = this.vary(1, P.vary), d = o0.dist || 0, far = d > 55;
    if (!far) this.transient(o, t, P.click[0] * pv, P.click[1]);
    const B = P.body; this.tone(o, t, B[0], B[1] * pv, B[2] * pv, B[3] * this.vary(1, .1), B[4] * (far ? 1.2 * P.far : 1));
    const N = P.nz; this.noise(o, t, N[4] * this.vary(1, .12), N[0], N[1] * pv, N[2], N[3], N[5] * (far ? .55 : 1), .001);
    const T = P.tail; this.noise(o, t + .02, T[2] * this.vary(1, .15), 'lowpass', T[0], T[1], .6, T[3], .01, this.brown);
    if (P.rubber) { this.noise(o, t, .2, 'bandpass', 600, 2200, .9, .3, .02); this.tone(o, t + .09, 'sine', 90, 60, .05, .35); }
    if (P.pellets && !far) for (let k = 0; k < P.pellets; k++) this.noise(o, t + .004 + Math.random() * .03, .015, 'bandpass', 2500 + Math.random() * 3000, 0, 3, .18);
    if (P.chain && !far) for (let k = 0; k < 3; k++) this.tone(o, t + .012 + k * .011, 'square', this.vary(3200, .2), 2400, .008, .12);   /* corrente da bicicleta */
    if (P.grind && !far) this.noise(o, t + .02, .07, 'bandpass', this.vary(900, .15), 400, 4, .32, .005, this.brown);   /* manivela do moedor */
    if (P.ring && !far) this.tone(o, t + .01, 'sine', this.vary(2600, .05), 2500, .12, .1);   /* lâmina da enxada vibrando */
    if (P.cyl && own) this.materialHit(o, t + .3, 'metal', .3);   /* tambor do revólver girando */
    if (P.slap && d < 120) this.noise(o, t + P.slap + d / 600, .5, 'lowpass', 1200, 200, .7, .3, .02, this.brown);   /* eco do disparo nas construções */
    if (own && P.mech[0]) { const m = P.mech; this.noise(o, t + m[0], .03, 'bandpass', m[1], m[1] * .7, 3, m[2]); this.tone(o, t + m[0] + .02, 'square', m[1] * .5, m[1] * .3, .015, m[2] * .4); }
    if (own) this.duck(wid === 'vassoura' || P.heavy ? .45 : .25, .12, .5); else if (d < 25) this.duck(.2, .1, .5);
  }
  /** baú abrindo (Todos contra Todos): rangido da tampa + batida de madeira + tilintar de prêmio */
  chest(pos) {
    if (!this.ctx) return; const t = this._now(), o = this.dest(pos || null, .8, .3, { prio: 2 }); if (!o) return;
    this.tone(o, t, 'sawtooth', this.vary(170, .08), 120, .35, .12); this.noise(o, t, .32, 'bandpass', 700, 380, 6, .22, .02);
    this.materialHit(o, t + .32, 'wood', .55);
    [1318, 1568, 1976, 2637].forEach((f, i) => this.tone(o, t + .38 + i * .07, 'triangle', f, f, .22, .16));
  }
  dry() { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .55); if (!o) return; this.tone(o, t, 'square', 1800, 900, .025, .25); this.noise(o, t, .03, 'highpass', 4000, 0, 1, .35); this.materialHit(o, t + .01, 'metal', .15); }
  reloadStep(wid, k, pos) { /* k: 0 retirar, 1 inserir, 2 armar */
    if (!this.ctx) return; const t = this._now(), o = this.dest(pos || null, .55, .15, { prio: pos ? 1 : 2 }); if (!o) return; const sl = wid === 'estilingue';
    if (k === 0) { this.noise(o, t, .07, 'bandpass', this.vary(1400), 700, 2, .55); this.materialHit(o, t + .01, sl ? 'rubber' : 'wood', .35); }
    else if (k === 1) { this.noise(o, t, .1, 'lowpass', 900, 300, 1, .7); this.materialHit(o, t + .03, sl ? 'stone' : 'metal', .45); this.tone(o, t + .05, 'square', this.vary(900), 500, .02, .2); }
    else { this.noise(o, t, .05, 'bandpass', 2600, 1200, 3, .6); this.materialHit(o, t + .06, sl ? 'rubber' : 'metal', .5); this.noise(o, t + .1, .05, 'bandpass', 3000, 1500, 3, .4); }
  }
  equip(pos) { if (!this.ctx) return; const t = this._now(), o = this.dest(pos || null, .35, 0, { prio: 1 }); if (!o) return; this.noise(o, t, .14, 'bandpass', 700, 1700, 1.2, .5, .02, this.pink); this.materialHit(o, t + .1, 'wood', .25); }
  knife(hit, pos) { if (!this.ctx) return; const t = this._now(), o = this.dest(pos || null, .7, .2); if (!o) return; this.noise(o, t, .16, 'bandpass', this.vary(2400), 5200, 1.4, .55, .02); if (hit) { this.materialHit(o, t + .07, 'flesh', .9); this.tone(o, t + .07, 'sine', 140, 60, .1, .7); } }
  throwS(pos) { if (!this.ctx) return; const t = this._now(), o = this.dest(pos || null, .5, .1); if (!o) return; this.noise(o, t, .24, 'bandpass', 500, 2400, .9, .55, .03, this.pink); this.noise(o, t, .06, 'highpass', 3000, 0, .8, .15); }
  bounce(pos) { if (!this.ctx) return; const t = this._now(), o = this.dest(pos, .5, .15, { prio: 1 }); if (!o) return; this.materialHit(o, t, 'dirt', .7); this.tone(o, t, 'sine', 150, 70, .07, .5); }
  /* ===================== 8. AudioMovement ===================== */
  step(surf, pos, vol) {
    if (!this.ctx) return; const own = !pos, t = this._now(), o = this.dest(pos || null, (vol || 1) * .42, .08, { prio: own ? 2 : (vol || 1) > .7 ? 2 : 1 }); if (!o) return;
    const s = surf === 'water' ? 'water' : surf === 'wood' ? 'wood' : surf === 'metal' ? 'metal' : surf === 'stone' ? 'stone' : surf === 'sand' ? 'hay' : 'dirt';
    /* calcanhar + rolagem do pé (dois toques) com variação */
    this.materialHit(o, t, s, this.vary(.75, .2)); if (s === 'dirt') { this.noise(o, t + .005, .09, 'lowpass', this.vary(1100, .25), 380, .8, .45, .006, this.brown); this.noise(o, t + .04, .07, 'highpass', 4200, 0, .5, .12); }
    if (s !== 'water') this.noise(o, t + .06 + Math.random() * .03, .05, 'bandpass', this.vary(900, .3), 500, 1.2, .2, .005);
  }
  jump() { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .3); if (!o) return; this.noise(o, t, .16, 'bandpass', 500, 1300, .9, .45, .02, this.pink); this.noise(o, t, .05, 'lowpass', 600, 200, .8, .3); }
  land(v, pos) {
    if (!this.ctx) return; const k = Math.min(1, v / 14), t = this._now(), o = this.dest(pos || null, .35 + k * .65, .15); if (!o) return;
    this.tone(o, t, 'sine', 95, 40, .16 + k * .12, .8); this.materialHit(o, t, 'dirt', .6 + k * .5); this.noise(o, t + .02, .2, 'bandpass', 700, 1500, .8, .2 + k * .2, .02, this.pink);
  }
  water(p) { if (!this.ctx) return; const n = typeof performance !== 'undefined' ? performance.now() : 0; if (n - (this._wT || 0) < 900) return; this._wT = n; const t = this._now(), o = this.dest(p || null, .7, .2); if (!o) return; this.materialHit(o, t, 'water', 1.1); this.noise(o, t + .05, .5, 'lowpass', 1600, 300, .7, .4, .04, this.pink); }
  whiz() {
    if (!this.ctx) return; const t = this._now(), side = Math.random() < .5 ? -1 : 1, L = this.L, ang = L.yaw + side * Math.PI / 2;
    const o = this.dest({ x: L.x - Math.sin(ang) * 1.6, y: L.y, z: L.z - Math.cos(ang) * 1.6 }, .5, 0, { prio: 3 }); if (!o) return;
    this.noise(o, t, .18, 'bandpass', 4200, 800, 3, .7, .015); this.tone(o, t, 'sine', 1800, 700, .14, .12, .01); this.transient(o, t + .01, 6000, .2);   /* Doppler: o assobio cai de altura ao passar */
  }
  /* ===================== 9. AudioCombat ===================== */
  hit(head) { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .5, 0, { prio: 3 }); if (!o) return; this.tone(o, t, 'sine', head ? 1900 : 1250, head ? 1600 : 950, .06, .5); this.transient(o, t, 5000, .25); if (head) this.materialHit(o, t + .01, 'metal', .35); }
  kill() { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .45, .15, { prio: 3 }); if (!o) return; this.tone(o, t, 'sine', 988, 988, .14, .5); this.tone(o, t + .08, 'sine', 1319, 1319, .22, .45); this.tone(o, t + .08, 'sine', 2637, 2637, .12, .08); }
  hurt(pos) { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .6, 0, { prio: 3 }); if (!o) return; this.materialHit(o, t, 'flesh', 1); this.noise(o, t, .18, 'lowpass', 700, 220, 1, .8, .002, this.brown); this.tone(o, t, 'sine', 110, 55, .18, .6); this.duck(.35, .2, .7); }
  headshot() { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .5, .2, { prio: 3 }); if (!o) return; this.materialHit(o, t, 'metal', .5); [1319, 1760, 2637].forEach((f, i) => this.tone(o, t + .05 + i * .06, 'triangle', f, f, .14, .25)); }
  /** impacto de projétil no cenário (chamado pelos efeitos visuais de impacto) */
  impact(kind, pos, big) { if (!this.ctx || !pos) return; const d = Math.hypot(pos.x - this.L.x, pos.z - this.L.z); if (d > 50) return; const t = this._now(), o = this.dest(pos, .45 * (big || 1), .2, { prio: 1, key: 'im' + (pos.x * 2 | 0) + ',' + (pos.z * 2 | 0) }); if (!o) return; this.materialHit(o, t, kind || 'dirt', .9 * (big || 1)); }
  explosion(pos, big, own) {
    if (!this.ctx) return; const c = this.ctx, t = this._now(), d = pos ? Math.hypot(pos.x - this.L.x, (pos.y || 0) - this.L.y, pos.z - this.L.z) : 0;
    const o0 = this.dest(pos, big ? 2.2 : 1.25, big ? 1.1 : .7, { prio: 3 }); if (!o0) return; const o = this.saturator(o0, .8), k = big ? 2.2 : 1;
    const T = t + Math.min(.9, d / 343) * (big ? .6 : .35);   /* o som chega depois do clarão */
    if (d < 60) this.transient(o, T, 2500, .9);
    this.tone(o, T, 'sine', 62, 22, 1.3 * k, 1.7, .004); this.tone(o, T + .01, 'sine', 140, 42, .45 * k, 1);
    this.noise(o, T, 1.1 * k, 'lowpass', 2800, 150, .8, 1.5, .003, this.pink); this.noise(o, T, .35 * k, 'bandpass', 900, 280, .6, 1.1, .002);
    for (let i = 0; i < (big ? 12 : 5); i++) this.materialHit(o, T + .2 + Math.random() * .9 * k, Math.random() < .5 ? 'dirt' : 'wood', .25);   /* destroços caindo */
    this.noise(o, T + .25, (big ? 2.2 : 1.1), 'lowpass', 500, 90, .7, big ? .9 : .5, .25, this.brown);   /* ronco que se espalha */
    this.duck(big ? .7 : .5, .4, 1.4);
    if (d < (big ? 40 : 14)) this.ringing(big ? 1 : .5 * (1 - d / 14));
  }
  ringing(k) {
    if (!this.ctx || k <= .05) return; const c = this.ctx, t = this._now();
    this.lp.frequency.cancelScheduledValues(t); this.lp.frequency.setValueAtTime(380, t + .02); this.lp.frequency.exponentialRampToValueAtTime(22000, t + 1.2 + 3.2 * k);
    const o = this.dest(null, 1, 0, { prio: 3 }); if (o) this.tone(o, t, 'sine', 3150, 3100, 1.6 + 3 * k, .14 * k, .08);
  }
  beep(pos, urgent) { if (!this.ctx) return; const t = this._now(), o = this.dest(pos, urgent ? 1.1 : .85, .25, { prio: 3, key: 'bp' }); if (!o) return; const f = urgent ? 2300 : 1750; this.oscillator(o, t, { type: 'square', f, dur: .07, a: .002, d: .03, s: .5, r: .04, peak: .22, lp: 5000 }); this.tone(o, t, 'sine', f, f, .12, .5); this.tone(o, t, 'sine', f * 2.01, f * 2, .06, .08); }
  plantTick(pos) { if (!this.ctx) return; const t = this._now(), o = this.dest(pos, .5, .1, { prio: 2, key: 'pt' }); if (!o) return; this.materialHit(o, t, 'dirt', .5); this.tone(o, t, 'square', 700, 700, .03, .15); }
  planted(pos) { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .7, .3, { prio: 3 }); if (!o) return; this.materialHit(o, t, 'dirt', 1); for (let i = 0; i < 3; i++) this.oscillator(o, t + .1 + i * .12, { type: 'triangle', f: 600 + i * 220, dur: .12, d: .1, s: .4, r: .15, peak: .4 }); this.duck(.4, .5, 1); }
  defused() { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .7, .3, { prio: 3 }); if (!o) return; for (let i = 0; i < 4; i++) { const f = 523 * Math.pow(1.26, i); this.tone(o, t + i * .09, 'triangle', f, f, .25, .45); this.tone(o, t + i * .09, 'sine', f * 2, f * 2, .18, .12); } }
  alarm() { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .55, .2, { prio: 3, key: 'al' }); if (!o) return; for (let i = 0; i < 2; i++) this.oscillator(o, t + i * .22, { type: 'sawtooth', f: 560, f1: 380, dur: .18, d: .05, s: .7, r: .05, peak: .25, lp: 2500 }); }
  barrier(on) { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .5, .3, { prio: 2, key: 'br' + (on ? 1 : 0) }); if (!o) return; if (on) { this.oscillator(o, t, { type: 'sawtooth', f: 90, f1: 180, dur: .45, d: .2, s: .5, r: .2, peak: .25, lp: 1800 }); this.tone(o, t + .05, 'square', 440, 880, .25, .1); } else { this.oscillator(o, t, { type: 'sawtooth', f: 260, f1: 70, dur: .4, d: .2, s: .5, r: .2, peak: .25, lp: 1600 }); this.noise(o, t, .4, 'bandpass', 3000, 600, 2, .25); } }
  whip(pos) { if (!this.ctx) return; const t = this._now(), o = this.dest(pos || null, .55, .3); if (!o) return; this.noise(o, t, .14, 'bandpass', 800, 4000, 1.2, .35, .03); this.transient(o, t + .12, 7000, .7); this.tone(o, t + .12, 'square', 1800, 300, .05, .2); }
  buzz() { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .22, 0, { prio: 1, key: 'bz' }); if (!o) return; for (let k = 0; k < 3; k++) this.oscillator(o, t, { type: 'sawtooth', f: this.vary(210 + k * 55, .08), dur: .35, a: .04, d: .1, s: .7, r: .1, peak: .05, lp: 1400, detune: (Math.random() - .5) * 40 }); }
  glass(pos) { if (!this.ctx) return; const t = this._now(), o = this.dest(pos || null, .8, .35, { prio: 2 }); if (!o) return; this.materialHit(o, t, 'glass', 1.2); for (let k = 0; k < 9; k++) this.materialHit(o, t + .03 + Math.random() * .45, 'glass', .2 + Math.random() * .25); }
  funny(kind, pos) {
    if (!this.ctx) return; const t = this._now(), o = this.dest(pos || null, .45, .2); if (!o) return;
    if (kind === 'launch') { this.tone(o, t, 'sine', 500, 1500, .32, .45); this.tone(o, t + .34, 'sine', 1500, 380, .38, .4); }
    else if (kind === 'plop') { this.tone(o, t, 'sine', 160, 55, .22, .9); this.tone(o, t + .02, 'triangle', 420, 180, .1, .25); }
    else if (kind === 'dizzy') { for (let k = 0; k < 4; k++) this.tone(o, t + .55 + k * .14, 'sine', 2400 + (k % 2) * 500, 2900 + (k % 2) * 400, .08, .22); this.tone(o, t, 'triangle', 900, 200, .5, .2); }
    else if (kind === 'hat') { this.tone(o, t, 'triangle', 700, 1300, .14, .35); this.tone(o, t + .1, 'triangle', 1300, 900, .16, .25); }
    else this.tone(o, t, 'triangle', 700, 220, .35, .3);
  }
  roundStart() { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .6, .3, { prio: 3, key: 'rs' }); if (!o) return; [523, 784, 1047].forEach((f, i) => { this.tone(o, t + i * .09, 'triangle', f, f, .35, .35); this.tone(o, t + i * .09, 'sine', f * 2, f * 2, .2, .08); }); this.materialHit(o, t, 'metal', .2); }
  /* interface: discreta e consistente (sinos de madeira e metal) */
  uiHover() { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .14, 0, { prio: 1, key: 'uh' }); if (!o) return; this.tone(o, t, 'sine', 1400, 1150, .04, .3); }
  ui(k) { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .35, .05, { prio: 2, key: 'ui' + k }); if (!o) return; const f = k === 1 ? 880 : 620; this.tone(o, t, 'triangle', f, k === 1 ? 1320 : 520, .09, .45); this.tone(o, t, 'sine', f * 2, f * 2, .05, .08); }
  /** sininhos de Natal (compra na loja, convite de amigo…) */
  jingle() { if (!this.ctx) return; const t = this._now(), o = this.dest(null, .5, .35, { prio: 2, key: 'jg' }); if (!o) return; [1319, 1568, 1976, 2637, 1976, 2637].forEach((f, i) => this._glock(o, t + i * .075, f, .55)); this._sleigh(o, t, .5, true); }
  /* ===================== 10. AudioAmbient ===================== */
  startAmbient() {
    if (!this.ctx || this.ambOn) return; this.ambOn = true; const c = this.ctx; this._ambNodes = [];
    /* vento estéreo: duas fontes de ruído rosa com rajadas independentes */
    for (const side of [-1, 1]) {
      const s = c.createBufferSource(); s.buffer = this.pink; s.loop = true; s.loopStart = Math.random(); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = side < 0 ? 380 : 520; f.Q.value = .6;
      const g = c.createGain(); g.gain.value = .12; const p = c.createStereoPanner(); p.pan.value = side * .6; s.connect(f); f.connect(g); g.connect(p); p.connect(this.ambDuck); s.start(); this._ambNodes.push(s, f, g, p);
      const gust = () => { if (!this.ambOn) return; const t = this._now(), r = Math.random(), v = r < .25 ? .03 : r < .75 ? .16 + Math.random() * .1 : .34 + Math.random() * .16, d = 2.5 + Math.random() * 5;
        g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(v, t + d * .6); f.frequency.setTargetAtTime(300 + v * 900 + side * 60, t, d / 3); setTimeout(gust, d * 1000); };
      setTimeout(gust, 500 + Math.random() * 2000);
    }
    const every = (fn, lo, hi) => { const go = () => { if (!this.ambOn) return; try { fn(); } catch (e) { } setTimeout(go, (lo + Math.random() * (hi - lo)) * 1000); }; setTimeout(go, (lo * .5 + Math.random() * lo) * 1000); };
    const around = (r0, r1) => { const a = Math.random() * Math.PI * 2, r = r0 + Math.random() * (r1 - r0); return { x: this.L.x + Math.cos(a) * r, y: this.L.y + 2 + Math.random() * 4, z: this.L.z + Math.sin(a) * r }; };
    const amb = (pos, vol) => this.dest(pos, vol, .4, { prio: 1, bus: this.ambDuck });
    /* folhas balançando */
    every(() => { const o = amb(around(6, 14), .35); if (o) this.noise(o, this._now(), 1.2 + Math.random(), 'highpass', 3200, 5200, .4, .12, .4, this.pink); }, 3, 7);
    /* grilos: trens de cricrilados com modulação de amplitude */
    every(() => { const o = amb(around(5, 18), .5); if (!o) return; const t = this._now(), f = 4300 + Math.random() * 500, n = 3 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) this.tone(o, t + i * .32 + j * .028, 'sine', f, f * .995, .018, .05); }, 1.5, 4);
    /* pássaros: sílabas com glissando (FM simples) */
    every(() => { const o = amb(around(10, 35), .45); if (!o) return; const t = this._now(), base = 2200 + Math.random() * 1800, n = 2 + (Math.random() * 5 | 0); for (let i = 0; i < n; i++) { const f = base * (.85 + Math.random() * .4); this.tone(o, t + i * (.09 + Math.random() * .05), 'sine', f, f * (Math.random() < .5 ? 1.35 : .7), .07, .14); } }, 2, 6);
    every(() => this.rooster(around(40, 80)), 25, 50);
    every(() => this.moo(around(30, 70), false), 18, 40);
  }
  stopAmbient() { this.ambOn = false; if (this._ambNodes) { for (const n of this._ambNodes) { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) { } } this._ambNodes = null; } }
  /** voz animal por formantes: fonte (dente de serra com vibrato) + filtros que imitam boca/focinho */
  _vocal(o, t, f0, f1, dur, forms, peak, vib) {
    const c = this.ctx, src = c.createOscillator(); src.type = 'sawtooth'; src.frequency.setValueAtTime(f0, t); src.frequency.linearRampToValueAtTime(f1, t + dur);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5 + Math.random() * 2; lg.gain.value = vib || 3; lfo.connect(lg); lg.connect(src.frequency);
    const g = c.createGain(); this.adsr(g.gain, t, .06, dur * .3, .8, dur * .25, dur * .75, peak); const nodes = [src, lfo, lg, g];
    for (const [f, q, gn] of forms) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(f[0], t); if (f[1]) bp.frequency.linearRampToValueAtTime(f[1], t + dur); bp.Q.value = q; const fg = c.createGain(); fg.gain.value = gn; src.connect(bp); bp.connect(fg); fg.connect(g); nodes.push(bp, fg); }
    g.connect(o); const end = t + dur + .1; src.start(t); lfo.start(t); src.stop(end); lfo.stop(end); this._done(src, nodes); this._track(o, end);
  }
  moo(pos, loud) { if (!this.ctx) return; const t = this._now(), o = this.dest(pos, loud ? .75 : .45, .35, { prio: 1, key: 'mo' }); if (!o) return; const d = (loud ? 1.1 : 1.5) * this.vary(1, .15), f = this.vary(loud ? 125 : 105, .1);
    this._vocal(o, t, f * .9, f * .82, d, [[[260, 620], 4, 1.4], [[700, 1050], 6, .5], [[2400], 8, .12]], .55, 2); }
  cluck(pos, loud) { if (!this.ctx) return; const t = this._now(), o = this.dest(pos, loud ? .55 : .32, .2, { prio: 1, key: 'ck' }); if (!o) return; const n = loud ? 5 : 2 + (Math.random() * 2 | 0);
    for (let k = 0; k < n; k++) { const tk = t + k * this.vary(.13, .2), f = this.vary(loud ? 620 : 520, .1); this._vocal(o, tk, f, f * .78, .07, [[[1500], 5, 1], [[2900], 7, .4]], .5, 8); this.transient(o, tk, 2500, .08); } }
  oink(pos, loud) { if (!this.ctx) return; const t = this._now(), o = this.dest(pos, loud ? .55 : .35, .2, { prio: 1, key: 'ok' }); if (!o) return;
    for (let k = 0; k < (loud ? 3 : 1); k++) { const tk = t + k * .2, f = this.vary(200, .12); this._vocal(o, tk, f * 1.15, f * .8, .17, [[[900, 700], 6, 1], [[2200], 6, .35]], .5, 12); this.noise(o, tk, .15, 'bandpass', 700, 400, 2, .2, .01, this.pink); } }
  rooster(pos) { if (!this.ctx) return; const o = this.dest(pos, .55, .5, { prio: 1, key: 'rs0' }); if (!o) return; const t = this._now();
    [[.0, .14, 520, 600], [.17, .14, 620, 700], [.34, .2, 700, 760], [.58, .6, 780, 560]].forEach(([dt, d, a, b]) => this._vocal(o, t + dt, a, b, d, [[[1300], 5, 1], [[2600], 7, .4]], .38, 10)); }
  /* ===================== 11. AudioMusic ===================== */
  /* ---- instrumentos (todos sintetizados) ---- */
  _mf(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  /** violão: Karplus-Strong com amortecimento dependente da altura (cache por nota) + corpo do instrumento no barramento */
  _guitar(bus, t, m, dur, vel) {
    const c = this.ctx, sr = c.sampleRate, key = 'g' + m; let b = this.ksCache.get(key);
    if (!b) { const f = this._mf(m), N = Math.max(2, Math.round(sr / f)), len = (Math.min(2.6, 1.2 + 60 / f) * sr) | 0, buf = new Float32Array(N); let lp = 0; for (let i = 0; i < N; i++) { lp = lp * .55 + (Math.random() * 2 - 1) * .45; buf[i] = lp; }
      b = c.createBuffer(1, len, sr); const d = b.getChannelData(0), damp = .4985 + Math.min(.0012, f / 1e6); let idx = 0; for (let i = 0; i < len; i++) { d[i] = buf[idx]; const n = (idx + 1) % N; buf[idx] = damp * (buf[idx] + buf[n]); idx = n; } this.ksCache.set(key, b); }
    const s = c.createBufferSource(); s.buffer = b; const g = c.createGain(); g.gain.setValueAtTime(vel, t); g.gain.setTargetAtTime(.0001, t + Math.max(.08, dur), .12); s.connect(g); g.connect(bus); s.start(t); s.stop(t + Math.max(.2, dur) + .6); this._done(s, [s, g]);
  }
  _bass(bus, t, m, dur, vel) { const o = { type: 'triangle', f: this._mf(m), dur: Math.max(.08, dur * .9), a: .006, d: .25, s: .55, r: .08, peak: vel * .9, lp: 900 }; this.oscillator(bus, t, o); this.oscillator(bus, t, { type: 'sine', f: this._mf(m), dur: o.dur, a: .004, d: .3, s: .6, r: .08, peak: vel * .7 }); }
  /** sanfona: duas palhetas levemente desafinadas (efeito "musette") + vibrato compartilhado */
  _sanfona(bus, t, m, dur, vel) {
    const f = this._mf(m), d = Math.max(.1, dur * .95);
    for (const [det, ty, pk] of /** @type {[number, OscillatorType, number][]} */ ([[-7, 'sawtooth', .5], [7, 'sawtooth', .5], [0, 'square', .18]])) { const n = this.oscillator(bus, t, { type: ty, f, dur: d, a: .035, d: .2, s: .82, r: .1, peak: vel * pk * .5, lp: 2600, q: .9, detune: det }); const vg = this.mus && this.mus.vib; if (n && vg) { vg.connect(n.detune); const end = n.onended; n.onended = e => { try { vg.disconnect(n.detune); } catch (er) { } if (end) end.call(n, e); }; } }
  }
  _glock(bus, t, f, vel) { [[1, 1.6, .55], [2.756, .5, .2], [5.404, .2, .08]].forEach(([r, dc, a]) => this.tone(bus, t, 'sine', f * r, f * r * .999, dc, vel * a, .001)); this.noise(bus, t, .01, 'highpass', 6000, 0, .7, vel * .08, .0005); }
  _sleigh(bus, t, vel, shake) { const n = shake ? 5 : 2; for (let k = 0; k < n; k++) { const tk = t + k * (shake ? .022 : .015); this.noise(bus, tk, shake ? .12 : .05, 'bandpass', 7200 + Math.random() * 1500, 0, 3, vel * .35, .001); this.tone(bus, tk, 'sine', 5200 + Math.random() * 3200, 0, .06, vel * .07, .001); } }
  _zabumba(bus, t, vel) { this.tone(bus, t, 'sine', 98, 46, .3, vel * .95, .002); this.noise(bus, t, .05, 'lowpass', 500, 150, .8, vel * .4, .001); }
  _bacalhau(bus, t, vel) { this.noise(bus, t, .03, 'highpass', 2500, 0, .8, vel * .35, .0005); this.tone(bus, t, 'sine', 820, 600, .03, vel * .2); }
  _triangle(bus, t, vel, open) { const d = open ? .5 : .07; [[1, .5], [2.43, .25], [3.9, .15], [5.6, .08]].forEach(([r, a]) => this.tone(bus, t, 'sine', 1680 * r, 1680 * r, d, vel * a * .45, .001)); }
  _kick(bus, t, vel) { this.tone(bus, t, 'sine', 125, 42, .28, vel, .002); this.noise(bus, t, .012, 'highpass', 3000, 0, .7, vel * .12, .0005); }
  _snare(bus, t, vel) { this.noise(bus, t, .14, 'bandpass', 2200, 1400, .7, vel * .5, .001); this.tone(bus, t, 'triangle', 200, 160, .07, vel * .35); }
  _brush(bus, t, vel) { this.noise(bus, t, .16, 'bandpass', 3500, 2200, .6, vel * .22, .015, this.pink); }
  _hat(bus, t, vel, open) { this.noise(bus, t, open ? .18 : .035, 'highpass', 7500, 0, .6, vel * .2, .001); }
  _shaker(bus, t, vel) { this.noise(bus, t, .05, 'highpass', 5500, 0, .5, vel * .14, .01); }
  _pad(bus, t, m, dur, vel) { for (const det of [-9, 9]) this.oscillator(bus, t, { type: 'sawtooth', f: this._mf(m), dur, a: Math.min(.6, dur * .3), d: .4, s: .8, r: .6, peak: vel * .1, lp: 1100, detune: det }); }
  _heart(bus, t, vel) { this.tone(bus, t, 'sine', 70, 40, .16, vel * .9, .004); this.tone(bus, t + .19, 'sine', 62, 38, .2, vel * .7, .004); }
  _play(inst, bus, t, m, dur, vel) {
    switch (inst) {
      case 'guitar': return this._guitar(bus, t, m, dur, vel * .9); case 'guitarLead': return this._guitar(bus, t, m, dur, vel * 1.1); case 'bass': return this._bass(bus, t, m, dur, vel);
      case 'sanfona': return this._sanfona(bus, t, m, dur, vel); case 'glock': return this._glock(bus, t, this._mf(m), vel * .9); case 'pad': return this._pad(bus, t, m, dur, vel);
      case 'sleigh': return this._sleigh(bus, t, vel, m > 0); case 'zabumba': return this._zabumba(bus, t, vel); case 'bacalhau': return this._bacalhau(bus, t, vel); case 'triangle': return this._triangle(bus, t, vel, m > 0);
      case 'kick': return this._kick(bus, t, vel); case 'snare': return this._snare(bus, t, vel); case 'brush': return this._brush(bus, t, vel); case 'hat': return this._hat(bus, t, vel, m > 0);
      case 'shaker': return this._shaker(bus, t, vel); case 'heart': return this._heart(bus, t, vel);
    }
  }
  /* ---- teoria: acordes e notação ---- */
  _chord(name) {
    const R = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }; let r = R[name[0]], i = 1; if (name[i] === '#') { r++; i++; } else if (name[i] === 'b') { r--; i++; }
    const q = name.slice(i), iv = q.startsWith('m7') ? [0, 3, 7, 10] : q.startsWith('m') ? [0, 3, 7] : q.startsWith('7') ? [0, 4, 7, 10] : q.startsWith('dim') ? [0, 3, 6] : [0, 4, 7];
    return { root: (r + 12) % 12, iv };
  }
  /** "71.4 74.4 r.8 | ..." → eventos {pos, m, len} em semicolcheias */
  _parse(s) { const ev = []; let pos = 0; if (!s) return ev; for (const tok of s.split(/\s+/)) { if (!tok || tok === '|') continue; const [n, l] = tok.split('.'), len = +l || 4; if (n !== 'r') ev.push({ pos, m: +n, len }); pos += len; } return ev; }
  /* ---- sequenciador ---- */
  /** playlist em loop (menu): cada trilha toca algumas seções e passa para a próxima, sincronizada no compasso */
  playlist(ids) {
    if (!ids || !ids.length) return; const i = Math.max(0, ids.indexOf(this.track)); this.pl = { ids, i, n: 0 }; this.track = ids[i];
    if (!this.ctx) return; if (!this.musicOn) this._start(this.track); else if (this.mus && this.mus.id !== this.track) this.mus.next = this.track;
  }
  startMusic(id) { this.pl = null; this._start(id); }
  _start(id) {
    if (id) this.track = id; if (!this.ctx) return; if (this.musicOn) { if (id) this.setTrack(id); return; }
    this.musicOn = true; this._newSong(this.track, this._now() + .15, true);
    if (!this.offline) this.musTimer = setInterval(() => this._schedule(this._now() + .4), 60);
    this._schedule(this._now() + .4);
  }
  stopMusic() {
    this.musicOn = false; clearInterval(this.musTimer); if (!this.ctx || !this.mus) return; const t = this._now(), f = this.mus.fade; f.gain.cancelScheduledValues(t); f.gain.setValueAtTime(f.gain.value, t); f.gain.linearRampToValueAtTime(0, t + .3);
    const old = this.mus; setTimeout(() => this._dropSong(old), 2600); this.mus = null;
  }
  /** troca de trilha sincronizada com o compasso (crossfade de 1 compasso) */
  setTrack(id) {
    if (!MUSIC[id] || this.track === id) return; this.pl = null; this.track = id; if (!this.ctx || !this.musicOn) return;
    if (!this.mus) { this._newSong(id, this._now() + .1, true); return; }
    this.mus.next = id;   /* entra no próximo compasso */
  }
  /** intensidade musical 0..2 (camadas entram e saem suavemente) */
  setIntensity(i) { i = Math.max(0, Math.min(2, i)); if (i === this.intensity) return; this.intensity = i; if (this.mus) this._levels(this.mus, .8); }
  _newSong(id, t, fadeIn) {
    const c = this.ctx, T = MUSIC[id]; const fade = c.createGain(); fade.gain.value = fadeIn ? 0 : 1; if (fadeIn) { fade.gain.setValueAtTime(0, t); fade.gain.linearRampToValueAtTime(T.gain || 1, t + 1.2); } else fade.gain.value = T.gain || 1;
    fade.connect(this.musDuck); fade.connect(this.musRev);
    const parts = {}; for (const k in T.parts) { const g = c.createGain(); g.gain.value = 0; let out = g; if (T.parts[k].body) { const b = c.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = 180; b.gain.value = 5; b.Q.value = 1.2; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800; g.connect(b); b.connect(lp); lp.connect(fade); } else g.connect(fade); parts[k] = { g, out }; }
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5.3; vg.gain.value = 9; vib.connect(vg); vib.start(t);
    const prev = this.mus; this.mus = { id, T, t0: t, next: null, fade, parts, vib: vg, vibOsc: vib, bar: 0, secI: 0, secBar: 0, loop: 0, nextBar: t, mel: {} };
    this._levels(this.mus, 0); if (prev && prev !== this.mus) { const pf = prev.fade; pf.gain.cancelScheduledValues(t); pf.gain.setValueAtTime(pf.gain.value, t); pf.gain.linearRampToValueAtTime(0, t + 60 / prev.T.bpm * 4); setTimeout(() => this._dropSong(prev), 6000); }
  }
  _dropSong(S) { if (!S) return; try { S.vibOsc.stop(); } catch (e) { } for (const k in S.parts) { try { S.parts[k].g.disconnect(); } catch (e) { } } try { S.fade.disconnect(); } catch (e) { } }
  _levels(S, ramp) { const t = this._now(), I = S.T.fixed !== undefined ? S.T.fixed : this.intensity; for (const k in S.parts) { const P = S.T.parts[k], g = S.parts[k].g.gain, v = (P.lvl || 0) <= I ? (P.vol || 1) : 0; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + (ramp || .02)); } }
  /** agenda compassos inteiros até o horizonte (lookahead) */
  _schedule(until) {
    if (!this.musicOn || !this.mus) return; let guard = 0;
    while (this.mus && this.mus.nextBar < until && guard++ < 8) {
      const S = this.mus; if (S.next) { const id = S.next; S.next = null; this._newSong(id, S.nextBar, false); continue; }
      this._bar(S, S.nextBar); S.nextBar += 60 / S.T.bpm * 4;
    }
  }
  _bar(S, t0) {
    const T = S.T, ord = T.order, sec = T.sec[ord[S.secI]], chords = sec.chords.split(/\s+/), nb = chords.length, b = S.secBar, step = 60 / T.bpm / 4, I = T.fixed !== undefined ? T.fixed : this.intensity;
    const ch = this._chord(chords[b]), last = b === nb - 1, hum = () => (Math.random() - .5) * .012, sw = st => (st % 2 ? step * (T.swing || 0) : 0);
    const at = st => t0 + st * step + sw(st) + hum();
    for (const k in T.parts) {
      const P = T.parts[k], bus = S.parts[k].g; if ((P.lvl || 0) > I + .01 && !P.always) continue; if (sec.mute && sec.mute.includes(k)) continue; if (sec.only && !sec.only.includes(k)) continue;
      const inst = Array.isArray(P.inst) ? P.inst[S.loop % P.inst.length] : P.inst, oct = (P.octOf && P.octOf[inst] !== undefined) ? P.octOf[inst] : (P.oct || 0), vel = (P.vel || .8) * (.9 + Math.random() * .2);
      if (P.kind === 'mel') {
        const src = sec.mel && sec.mel[P.from || k]; if (!src) continue; const key = ord[S.secI] + ':' + (P.from || k); const ev = S.mel[key] || (S.mel[key] = this._parse(src));
        for (const e of ev) { if (e.pos < b * 16 || e.pos >= (b + 1) * 16) continue; let m = e.m + oct; if (P.third) m = this._third(m, T.key || 7); this._play(inst, bus, at(e.pos - b * 16), m, e.len * step, vel); if (P.dbl && I >= P.dbl) this._play(inst, bus, at(e.pos - b * 16), m + 12, e.len * step, vel * .5); this.stats.notes++; }
      } else if (P.kind === 'bass') {
        const r = 36 + ch.root + (ch.root > 4 ? -12 : 0) + 12, fifth = r + 7, pat = P.style === 'baiao' ? [[0, r, 3], [3, r, 5], [8, fifth, 4], [12, r + 12, 4]] : P.style === 'walk' ? [[0, r, 8], [8, fifth, 8]] : P.style === 'pedal' ? [[0, r, 16]] : [[0, r, 4], [4, fifth, 4], [8, r, 4], [12, fifth - 12 + (Math.random() < .3 ? 12 : 0), 4]];
        for (const [st, m, l] of pat) this._play(inst, bus, at(st), m + (P.oct || 0), l * step, vel);
      } else if (P.kind === 'chord') {
        const tones = ch.iv.map(i => 55 + ((ch.root + i - 7 + 24) % 12)).sort((a, z) => a - z).map(m => m + (P.oct || 0));
        if (P.style === 'pad') for (const m of tones.slice(0, 3)) this._play(inst, bus, at(0), m, 16 * step, vel);
        else if (P.style === 'arp') { const seq = [0, 1, 2, 1, 2 % tones.length, 1, 0, 1]; seq.forEach((ix, i) => this._play(inst, bus, at(i * 2), tones[ix % tones.length] + (i === 4 ? 12 : 0), 3 * step, vel * (i % 4 ? .75 : 1))); this._play(inst, bus, at(0), tones[0] - 12, 8 * step, vel * .8); }
        else { const steps = P.style === 'strum4' ? [0, 4, 8, 12] : [2, 6, 10, 14]; for (const st of steps) tones.forEach((m, i) => this._play(inst, bus, at(st) + i * .016, m, 2 * step, vel * (i ? .8 : 1))); }
      } else if (P.kind === 'drum') {
        for (const st of P.steps) this._play(inst, bus, at(st), P.open && P.open.includes(st) ? 1 : (P.shake && P.shake.includes(st) ? 1 : 0), step, vel * (P.acc && P.acc.includes(st) ? 1.2 : P.acc ? .75 : 1));
        if (P.fill && last && I >= 1) for (const st of [12, 13, 14, 15]) this._play(P.fill, bus, at(st), 0, step, vel * (.6 + (st - 12) * .12));
      }
    }
    S.bar++; S.secBar++; if (S.secBar >= nb) { S.secBar = 0; S.secI++; if (S.secI >= ord.length) { S.secI = T.loopFrom || 0; S.loop++; } }
    /* playlist: depois de ~2 minutos (fim de seção), passa para a próxima trilha */
    const PL = this.pl; if (PL && S === this.mus && !S.next && S.secBar === 0 && S.bar * 240 / T.bpm >= (T.plSec || 110)) { PL.i = (PL.i + 1) % PL.ids.length; PL.n++; this.track = PL.ids[PL.i]; S.next = this.track; }
  }
  /** terça diatônica abaixo (harmonia automática da segunda voz) */
  _third(m, key) { const sc = [0, 2, 4, 5, 7, 9, 11].map(x => (x + key) % 12); let pc = ((m % 12) + 12) % 12, i = sc.indexOf(pc); if (i < 0) return m - 3; const j = (i + 5) % 7; let d = pc - sc[j]; if (d <= 0) d += 12; return m - d; }
}

/* ===================== trilhas (compostas para o Bombaki; "Jingle Bells" é domínio público, 1857) =====================
   notação da melodia: "nota.duração" (nota MIDI, duração em semicolcheias; r = pausa), "|" separa compassos */
const MUSIC = {
  /* NATAL — tela de carregamento e menu: Jingle Bells em arranjo de roça (glockenspiel/sanfona, sinos de trenó, violão e baixo) */
  natal: {
    name: 'Natal na Roça', bpm: 128, swing: .07, gain: 1, fixed: 1, key: 7, loopFrom: 1,
    parts: {
      sinos: { kind: 'drum', inst: 'sleigh', steps: [0, 2, 4, 6, 8, 10, 12, 14], acc: [4, 12], shake: [4, 12], vel: .55 },
      bumbo: { kind: 'drum', inst: 'kick', steps: [0, 8], vel: .5 },
      escova: { kind: 'drum', inst: 'brush', steps: [4, 12], vel: .6, lvl: 1, fill: 'snare' },
      baixo: { kind: 'bass', inst: 'bass', style: 'q', vel: .55 },
      violao: { kind: 'chord', inst: 'guitar', style: 'strum8', vel: .3, body: 1 },
      lead: { kind: 'mel', inst: ['glock', 'sanfona', 'glock'], octOf: { glock: 12, sanfona: 0 }, vel: .7 },
      harm: { kind: 'mel', from: 'h', inst: 'sanfona', vel: .4, third: 1, lvl: 1 }
    },
    order: ['intro', 'verso', 'refrao', 'ponte', 'verso', 'refrao2'],
    sec: {
      intro: { chords: 'G G C D7', mel: { lead: 'r.8 67.2 66.2 64.2 62.2 | 67.16 | 64.4 67.4 72.4 67.4 | 66.8 62.8' }, mute: ['bumbo', 'escova'] },
      verso: { chords: 'G G G C C D D7 G G G G C C D D7 G', mel: { lead: '62.4 71.4 69.4 67.4 | 62.12 62.2 62.2 | 62.4 71.4 69.4 67.4 | 64.16 | 64.4 72.4 71.4 69.4 | 66.16 | 74.4 74.4 72.4 69.4 | 71.16 | 62.4 71.4 69.4 67.4 | 62.16 | 62.4 71.4 69.4 67.4 | 64.12 64.4 | 64.4 72.4 71.4 69.4 | 74.4 74.4 74.4 74.4 | 76.4 74.4 72.4 69.4 | 67.8 74.8' } },
      refrao: { chords: 'G G G G C G A7 D7 G G G G C G D7 G', mel: { lead: '71.4 71.4 71.8 | 71.4 71.4 71.8 | 71.4 74.4 67.6 69.2 | 71.16 | 72.4 72.4 72.6 72.2 | 72.4 71.4 71.4 71.2 71.2 | 71.4 69.4 69.4 71.4 | 69.8 74.8 | 71.4 71.4 71.8 | 71.4 71.4 71.8 | 71.4 74.4 67.6 69.2 | 71.16 | 72.4 72.4 72.6 72.2 | 72.4 71.4 71.4 71.2 71.2 | 74.4 74.4 72.4 69.4 | 67.16' } },
      refrao2: { chords: 'G G G G C G A7 D7 G G G G C G D7 G', mel: { lead: '71.4 71.4 71.8 | 71.4 71.4 71.8 | 71.4 74.4 67.6 69.2 | 71.16 | 72.4 72.4 72.6 72.2 | 72.4 71.4 71.4 71.2 71.2 | 71.4 69.4 69.4 71.4 | 69.8 74.8 | 71.4 71.4 71.8 | 71.4 71.4 71.8 | 71.4 74.4 67.6 69.2 | 71.16 | 72.4 72.4 72.6 72.2 | 72.4 71.4 71.4 71.2 71.2 | 74.4 74.4 72.4 69.4 | 67.16', h: '71.4 71.4 71.8 | 71.4 71.4 71.8 | 71.4 74.4 67.6 69.2 | 71.16 | 72.4 72.4 72.6 72.2 | 72.4 71.4 71.4 71.2 71.2 | 71.4 69.4 69.4 71.4 | 69.8 74.8 | 71.4 71.4 71.8 | 71.4 71.4 71.8 | 71.4 74.4 67.6 69.2 | 71.16 | 72.4 72.4 72.6 72.2 | 72.4 71.4 71.4 71.2 71.2 | 74.4 74.4 72.4 69.4 | 67.16' } },
      ponte: { chords: 'Em Em C C G G D D', mel: { lead: '64.4 67.4 71.4 67.4 | 64.16 | 60.4 64.4 67.4 64.4 | 60.16 | 59.4 62.4 67.4 62.4 | 59.16 | 62.4 66.4 69.4 66.4 | 62.16' }, mute: ['bumbo', 'escova'] }
    }
  },
  /* TRANQUILO — compra / entre rodadas: toada caipira (violão dedilhado + sanfona) */
  tranquilo: {
    name: 'Toada do Roçado', bpm: 86, swing: .14, gain: .95, key: 7, loopFrom: 1,
    parts: {
      dedilhado: { kind: 'chord', inst: 'guitar', style: 'arp', vel: .45, body: 1 },
      baixo: { kind: 'bass', inst: 'bass', style: 'walk', vel: .45 },
      lead: { kind: 'mel', inst: ['sanfona', 'guitarLead'], octOf: { sanfona: 0, guitarLead: 0 }, vel: .55 },
      ganza: { kind: 'drum', inst: 'shaker', steps: [2, 6, 10, 14], vel: .5, lvl: 1 },
      bumbo: { kind: 'drum', inst: 'kick', steps: [0], vel: .3, lvl: 1 }
    },
    order: ['intro', 'A', 'B', 'A', 'B'],
    sec: {
      intro: { chords: 'G Em C D', mel: {} },
      A: { chords: 'G Em C D G Em C D', mel: { lead: '71.4 74.4 76.4 74.4 | 71.6 69.2 67.8 | 72.4 76.4 79.4 76.4 | 74.12 r.4 | 71.4 74.4 79.4 78.2 76.2 | 76.6 74.2 71.8 | 72.4 71.4 69.4 72.4 | 67.12 r.4' } },
      B: { chords: 'C D Bm Em Am D G G', mel: { lead: '76.4 79.4 81.4 79.4 | 78.6 76.2 74.8 | 74.4 78.4 83.4 81.4 | 79.12 r.4 | 76.4 74.2 72.2 71.4 72.4 | 74.6 72.2 69.8 | 71.4 74.4 79.4 74.4 | 67.16' } }
    }
  },
  /* CELEIRO — combate do 5x5: baião tenso (zabumba, triângulo, sanfona); camadas sobem com a intensidade */
  celeiro: {
    name: 'Baião do Celeiro', bpm: 120, swing: .02, gain: .9, key: 9, loopFrom: 0,
    parts: {
      zabumba: { kind: 'drum', inst: 'zabumba', steps: [0, 3, 8], vel: .75, fill: 'bacalhau' },
      bacalhau: { kind: 'drum', inst: 'bacalhau', steps: [6, 10, 14], vel: .6 },
      triangulo: { kind: 'drum', inst: 'triangle', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], open: [2, 6, 10, 14], acc: [2, 6, 10, 14], vel: .5 },
      baixo: { kind: 'bass', inst: 'bass', style: 'baiao', vel: .6 },
      violao: { kind: 'chord', inst: 'guitar', style: 'strum8', vel: .28, lvl: 1, body: 1 },
      lead: { kind: 'mel', inst: 'sanfona', oct: -12, vel: .55, lvl: 1, dbl: 2 },
      pad: { kind: 'chord', inst: 'pad', style: 'pad', vel: .6, lvl: 2 },
      ganza: { kind: 'drum', inst: 'shaker', steps: [1, 3, 5, 7, 9, 11, 13, 15], vel: .5, lvl: 2 }
    },
    order: ['A', 'A', 'B', 'A'],
    sec: {
      A: { chords: 'Am Am G G F F E7 E7', mel: { lead: '76.2 79.2 81.3 79.1 76.2 74.2 72.4 | 74.2 76.2 72.2 69.2 r.8 | 74.2 79.2 83.3 81.1 79.2 77.2 74.4 | 71.2 74.2 79.4 r.8 | 72.2 77.2 81.3 79.1 77.2 76.2 74.4 | 72.2 74.2 76.4 r.8 | 80.2 83.2 86.3 83.1 80.2 76.2 74.4 | 76.4 80.4 83.4 r.4' } },
      B: { chords: 'Dm Dm Am Am F F E7 E7', mel: { lead: '74.16 | 77.8 76.8 | 76.16 | 72.8 71.8 | 72.16 | 69.8 72.8 | 71.16 | 68.4 71.4 74.4 76.4' }, mute: ['violao'] }
    }
  },
  /* CORRERIA — zona fechando (BR): xote acelerado */
  correria: {
    name: 'Correria da Mandioca', bpm: 150, swing: 0, gain: .85, key: 2, loopFrom: 0,
    parts: {
      bumbo: { kind: 'drum', inst: 'kick', steps: [0, 8], vel: .7 }, caixa: { kind: 'drum', inst: 'snare', steps: [4, 12], vel: .55, fill: 'snare' },
      chimbal: { kind: 'drum', inst: 'hat', steps: [0, 2, 4, 6, 8, 10, 12, 14], acc: [2, 6, 10, 14], vel: .5 },
      triangulo: { kind: 'drum', inst: 'triangle', steps: [0, 2, 4, 6, 8, 10, 12, 14], open: [6, 14], vel: .45, lvl: 1 },
      baixo: { kind: 'bass', inst: 'bass', style: 'q', vel: .6 }, violao: { kind: 'chord', inst: 'guitar', style: 'strum8', vel: .3, body: 1 },
      lead: { kind: 'mel', inst: 'sanfona', oct: 12, vel: .5 }
    },
    order: ['A', 'B'],
    sec: {
      A: { chords: 'D D A A G G A A', mel: { lead: '62.2 66.2 69.2 66.2 74.4 73.2 71.2 | 69.4 66.4 64.4 62.4 | 64.2 69.2 73.2 69.2 76.4 74.2 73.2 | 71.4 69.4 67.4 64.4 | 67.2 71.2 74.2 71.2 79.4 78.2 76.2 | 74.4 71.4 69.4 67.4 | 69.2 67.2 66.2 64.2 62.2 61.2 59.2 57.2 | 57.8 r.8' } },
      B: { chords: 'Bm Bm G G D D A A', mel: { lead: '59.4 62.4 66.8 | 64.4 62.4 61.8 | 59.4 62.4 67.8 | 66.4 64.4 62.8 | 62.4 66.4 69.8 | 71.4 69.4 66.8 | 64.4 66.4 67.4 69.4 | 69.16' } }
    }
  },
  /* ÚLTIMOS — final do BR: tensão com batida de coração */
  ultimos: {
    name: 'Últimos Sobreviventes', bpm: 80, swing: 0, gain: .9, key: 2, loopFrom: 0,
    parts: {
      coracao: { kind: 'drum', inst: 'heart', steps: [0, 8], vel: .7 }, pad: { kind: 'chord', inst: 'pad', style: 'pad', vel: .8 },
      baixo: { kind: 'bass', inst: 'bass', style: 'pedal', vel: .5 }, relogio: { kind: 'drum', inst: 'hat', steps: [0, 4, 8, 12], vel: .25, lvl: 1 },
      lead: { kind: 'mel', inst: 'guitarLead', vel: .45, lvl: 1 }
    },
    order: ['A'],
    sec: { A: { chords: 'Dm Dm Bb Bb Gm Gm A A', mel: { lead: '74.8 77.8 | 76.16 | 74.8 70.8 | 69.16 | 67.8 70.8 | 74.12 r.4 | 73.8 76.8 | 73.16' } } }
  },
  /* VITÓRIA — fim de partida: forró de festa */
  vitoria: {
    name: 'Forró da Vitória', bpm: 128, swing: .05, gain: 1, fixed: 2, key: 0, loopFrom: 0,
    parts: {
      zabumba: { kind: 'drum', inst: 'zabumba', steps: [0, 3, 8, 11], vel: .7 }, triangulo: { kind: 'drum', inst: 'triangle', steps: [0, 2, 4, 6, 8, 10, 12, 14], open: [2, 6, 10, 14], vel: .5 },
      baixo: { kind: 'bass', inst: 'bass', style: 'q', vel: .6 }, violao: { kind: 'chord', inst: 'guitar', style: 'strum8', vel: .3, body: 1 },
      lead: { kind: 'mel', inst: 'sanfona', oct: -12, vel: .55 }, brilho: { kind: 'mel', from: 'lead', inst: 'glock', vel: .35 }
    },
    order: ['A'],
    sec: { A: { chords: 'C C F G C Am F G', mel: { lead: '72.2 76.2 79.2 84.4 79.2 84.4 | 84.2 83.2 81.2 79.2 76.8 | 77.2 81.2 84.2 89.4 84.2 89.4 | 86.4 84.4 83.8 | 84.2 79.2 76.2 72.4 76.2 79.4 | 81.4 79.4 76.8 | 77.4 76.4 74.4 72.4 | 74.8 79.8' } } }
  }
};
/* ---- playlist do menu (5 trilhas novas + a toada): Natal fica só na tela de carregamento ---- */
Object.assign(MUSIC, {
  /* FORRÓ DA FEIRA — pé-de-serra animado */
  feira: {
    name: 'Forró da Feira', bpm: 116, swing: .06, gain: .9, fixed: 1, key: 2, loopFrom: 0,
    parts: {
      zabumba: { kind: 'drum', inst: 'zabumba', steps: [0, 3, 8, 11], vel: .65, fill: 'bacalhau' }, bacalhau: { kind: 'drum', inst: 'bacalhau', steps: [6, 14], vel: .5 },
      triangulo: { kind: 'drum', inst: 'triangle', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], open: [2, 6, 10, 14], acc: [2, 6, 10, 14], vel: .42 },
      baixo: { kind: 'bass', inst: 'bass', style: 'baiao', vel: .55 }, violao: { kind: 'chord', inst: 'guitar', style: 'strum8', vel: .26, body: 1 },
      lead: { kind: 'mel', inst: 'sanfona', oct: -12, vel: .55 }
    },
    order: ['A', 'B', 'A', 'B'],
    sec: {
      A: { chords: 'D D G A D D A D', mel: { lead: '74.2 76.2 78.2 81.2 78.4 76.4 | 74.6 73.2 71.8 | 71.2 74.2 79.4 78.2 76.2 74.4 | 76.4 73.4 69.8 | 74.2 78.2 81.2 86.2 85.4 83.4 | 81.6 78.2 74.8 | 76.2 78.2 76.2 73.2 69.4 73.4 | 74.12 r.4' } },
      B: { chords: 'G G D D A A D D', mel: { lead: '79.4 78.2 76.2 74.4 79.4 | 78.8 74.8 | 78.4 76.2 74.2 72.4 74.4 | 74.16 | 76.4 78.2 79.2 81.4 76.4 | 73.8 69.8 | 74.2 76.2 78.2 79.2 81.4 78.4 | 74.16' } }
    }
  },
  /* MODA DE VIOLA — violão dedilhado com duas vozes em terças */
  violada: {
    name: 'Moda de Viola', bpm: 94, swing: .12, gain: .95, fixed: 1, key: 9, loopFrom: 0,
    parts: {
      dedilhado: { kind: 'chord', inst: 'guitar', style: 'arp', vel: .42, body: 1 }, baixo: { kind: 'bass', inst: 'bass', style: 'walk', vel: .42 },
      lead: { kind: 'mel', inst: 'guitarLead', vel: .6 }, segunda: { kind: 'mel', from: 'lead', inst: 'sanfona', third: 1, oct: -12, vel: .3, lvl: 1 },
      ganza: { kind: 'drum', inst: 'shaker', steps: [2, 6, 10, 14], vel: .4, lvl: 1 }
    },
    order: ['A', 'B'],
    sec: {
      A: { chords: 'A D A E A D E A', mel: { lead: '76.4 73.4 69.4 73.4 | 74.6 73.2 71.8 | 73.4 76.4 81.4 76.4 | 80.8 76.8 | 81.4 80.2 78.2 76.4 73.4 | 78.6 76.2 74.8 | 76.4 74.4 71.4 68.4 | 69.16' } },
      B: { chords: 'F#m F#m D D A A E E', mel: { lead: '78.4 81.4 85.4 81.4 | 78.12 r.4 | 74.4 78.4 81.4 78.4 | 74.12 r.4 | 73.4 76.4 81.4 76.4 | 73.12 r.4 | 71.4 74.4 76.4 80.4 | 76.16' } }
    }
  },
  /* QUADRILHA — arrasta-pé de festa junina */
  quadrilha: {
    name: 'Quadrilha do Roçado', bpm: 132, swing: 0, gain: .9, fixed: 1, key: 0, loopFrom: 0,
    parts: {
      bumbo: { kind: 'drum', inst: 'kick', steps: [0, 8], vel: .6 }, caixa: { kind: 'drum', inst: 'snare', steps: [4, 12], vel: .45, fill: 'snare' },
      triangulo: { kind: 'drum', inst: 'triangle', steps: [0, 2, 4, 6, 8, 10, 12, 14], open: [2, 6, 10, 14], vel: .45 },
      baixo: { kind: 'bass', inst: 'bass', style: 'q', vel: .55 }, violao: { kind: 'chord', inst: 'guitar', style: 'strum4', vel: .26, body: 1 },
      lead: { kind: 'mel', inst: 'sanfona', oct: -12, vel: .55 }, brilho: { kind: 'mel', from: 'lead', inst: 'glock', vel: .22, lvl: 1 }
    },
    order: ['A', 'B'],
    sec: {
      A: { chords: 'C C G G G G C C', mel: { lead: '72.2 72.2 76.2 79.2 84.4 79.4 | 76.4 72.4 r.8 | 74.2 74.2 77.2 79.2 83.4 79.4 | 77.4 74.4 r.8 | 71.2 74.2 77.2 79.2 83.4 81.4 | 79.4 77.4 74.8 | 76.2 79.2 84.2 79.2 76.2 74.2 72.4 | 72.8 r.8' } },
      B: { chords: 'F F C C G G C C', mel: { lead: '77.4 81.4 84.8 | 84.4 81.4 77.8 | 76.4 79.4 84.8 | 84.4 79.4 76.8 | 74.4 77.4 79.4 83.4 | 81.4 79.4 77.4 74.4 | 76.4 74.4 72.4 79.4 | 72.16' } }
    }
  },
  /* ENTARDECER — canção de ninar da roça (glockenspiel e violão) */
  entardecer: {
    name: 'Entardecer na Varanda', bpm: 72, swing: .08, gain: 1, fixed: 1, key: 5, loopFrom: 0,
    parts: {
      dedilhado: { kind: 'chord', inst: 'guitar', style: 'arp', vel: .38, body: 1 }, pad: { kind: 'chord', inst: 'pad', style: 'pad', vel: .45 },
      baixo: { kind: 'bass', inst: 'bass', style: 'pedal', vel: .35 }, lead: { kind: 'mel', inst: ['glock', 'guitarLead'], octOf: { glock: 0, guitarLead: 0 }, vel: .55 }
    },
    order: ['A', 'B'],
    sec: {
      A: { chords: 'F Dm Bb C F Dm Bb C', mel: { lead: '72.4 69.4 65.4 69.4 | 74.8 69.8 | 70.4 74.4 77.4 74.4 | 72.12 r.4 | 77.4 76.4 72.4 69.4 | 74.6 72.2 69.8 | 70.4 69.4 67.4 70.4 | 65.16' } },
      B: { chords: 'Bb C Am Dm Gm C F F', mel: { lead: '74.4 77.4 82.8 | 79.8 76.8 | 76.4 72.4 69.8 | 74.12 r.4 | 74.4 70.4 67.8 | 72.4 76.4 79.8 | 77.16 | 72.8 r.8' } }
    }
  },
  /* XAXADO — balanço em tom menor, sanfona e zabumba */
  xaxado: {
    name: 'Xaxado do Cangaço', bpm: 104, swing: .03, gain: .9, fixed: 1, key: 7, loopFrom: 0,
    parts: {
      zabumba: { kind: 'drum', inst: 'zabumba', steps: [0, 3, 6, 8, 11], vel: .6 }, bacalhau: { kind: 'drum', inst: 'bacalhau', steps: [4, 12], vel: .5 },
      triangulo: { kind: 'drum', inst: 'triangle', steps: [0, 2, 4, 6, 8, 10, 12, 14], open: [4, 12], vel: .4 },
      baixo: { kind: 'bass', inst: 'bass', style: 'baiao', vel: .55 }, violao: { kind: 'chord', inst: 'guitar', style: 'strum8', vel: .25, body: 1 },
      lead: { kind: 'mel', inst: 'sanfona', oct: -12, vel: .55 }
    },
    order: ['A', 'B'],
    sec: {
      A: { chords: 'Em Em D D C C B7 B7', mel: { lead: '76.2 79.2 76.2 74.2 71.4 74.4 | 76.8 r.8 | 74.2 78.2 74.2 72.2 69.4 72.4 | 74.8 r.8 | 72.2 76.2 79.2 76.2 72.4 76.4 | 79.8 r.8 | 78.2 75.2 71.2 75.2 78.4 81.4 | 78.8 r.8' } },
      B: { chords: 'Am Am Em Em C D Em Em', mel: { lead: '81.4 79.4 76.8 | 72.4 76.4 81.8 | 79.4 76.4 71.8 | 76.16 | 76.4 79.4 84.8 | 78.4 74.4 81.8 | 79.4 78.4 76.4 71.4 | 76.16' } }
    }
  }
});
const MENU_PLAYLIST = ['tranquilo', 'feira', 'violada', 'quadrilha', 'entardecer', 'xaxado'];
const sfx = new Sfx();
