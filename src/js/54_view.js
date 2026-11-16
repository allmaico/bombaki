/* =====================================================================
   54_view.js — lado cliente: buffer de snapshots com interpolação (jogadores
   remotos), predição do jogador local + reconciliação, utilitários de câmera.
   ===================================================================== */
'use strict';
const INTERP = 0.11;
/* snapshot compacto do host → objetos */
function parseSnap(s, now) {
  const P = [], byId = new Map();
  for (const a of s.P) {
    const fl = a[8] | 0, o = { id: a[0], x: a[1], y: a[2], z: a[3], yaw: a[4], pitch: a[5], hp: a[6], armor: a[7], fl, ws: a[9], cr: a[10] / 100, rel: a[11], team: a[12], uk: a[13], up: a[14], alive: !!(fl & 1), slide: !!(fl & 2), air: !!(fl & 4), ads: !!(fl & 8), bomb: !!(fl & 16), thr: !!(fl & 32), wind: !!(fl & 64), use: !!(fl & 128), mant: !!(fl & 256), conn: !(fl & 512) };
    P.push(o); byId.set(o.id, o);
  }
  return { t: s.t, rt: now, P, byId, raw: s };
}

/* buffer + interpolação por tempo do host */
class SnapBuf {
  constructor() { this.snaps = []; this.off = null; this.ent = new Map(); this.lastT = 0; }
  clear() { this.snaps.length = 0; this.off = null; this.ent.clear(); }
  push(s, now) {
    const ps = parseSnap(s, now);
    const o = now - ps.t; if (this.off === null || Math.abs(o - this.off) > 0.6) this.off = o; else this.off = this.off + (o - this.off) * 0.06;
    if (this.snaps.length && ps.t <= this.snaps[this.snaps.length - 1].t) return ps;
    this.snaps.push(ps); if (this.snaps.length > 40) this.snaps.shift(); return ps;
  }
  latest() { return this.snaps.length ? this.snaps[this.snaps.length - 1] : null; }
  /* amostra o estado de todos os jogadores no tempo de renderização; preenche this.ent (Map id → entrada de render) */
  sample(now, dt) {
    const S = this.snaps, n = S.length; if (!n || this.off === null) return this.ent;
    const rt = now - this.off - INTERP; let i = n - 1; while (i > 0 && S[i - 1].t > rt) i--;
    /* S[i-1] ≤ rt < S[i]; se rt > último, extrapola um pouco */
    const b = S[Math.min(i, n - 1)], a = S[Math.max(0, i - 1)]; let f = b.t > a.t ? (rt - a.t) / (b.t - a.t) : 1; f = clamp(f, 0, 1.35);
    for (const q of b.P) {
      const p = a.byId.get(q.id) || q; let e = this.ent.get(q.id);
      if (!e) { e = { id: q.id, x: q.x, y: q.y, z: q.z, yaw: q.yaw, pitch: q.pitch, spd: 0, wph: 0, fire: 0, dead: 0, lastX: q.x, lastZ: q.z, aliveT: 0, lastAlive: q.alive }; this.ent.set(q.id, e); }
      const tele = Math.hypot(q.x - p.x, q.z - p.z) > 8;
      const ff = tele ? 1 : f; e.x = p.x + (q.x - p.x) * ff; e.y = p.y + (q.y - p.y) * ff; e.z = p.z + (q.z - p.z) * ff; e.yaw = lerpAng(p.yaw, q.yaw, Math.min(1, ff)); e.pitch = lerp(p.pitch, q.pitch, Math.min(1, ff)); e.cr = lerp(p.cr, q.cr, Math.min(1, ff));
      const d = Math.hypot(e.x - e.lastX, e.z - e.lastZ); if (dt > 0) { const sp = d / dt; e.spd = damp(e.spd, sp > 30 ? 0 : sp, 12, dt); } e.wph += d * 1.9; e.lastX = e.x; e.lastZ = e.z;
      e.alive = q.alive; e.hp = q.hp; e.armor = q.armor; e.team = q.team; e.ws = q.ws; e.slide = q.slide; e.air = q.air; e.ads = q.ads; e.bomb = q.bomb; e.rel = q.rel; e.thr = q.thr; e.wind = q.wind; e.use = q.use; e.uk = q.uk; e.up = q.up; e.mant = q.mant; e.conn = q.conn; e.fl = q.fl;
      if (!e.alive) e.deadT = (e.deadT || 0) + dt; else e.deadT = 0;
      if (e.fire > 0) e.fire = Math.max(0, e.fire - dt * 8);
    }
    return this.ent;
  }
}

/* predição do jogador local (cliente de rede) */
const NOOP_HOOKS = { shoot() { }, melee() { }, meleeStart() { }, startThrow() { }, throwNow() { }, onReload() { }, onSwitch() { }, act() { } };
class Predictor {
  constructor(id, info, W) {
    this.W = W; this.p = newSimPlayer(Object.assign({ id, local: true }, info)); this.p.alive = false; this.pend = []; this.seq = 0; this.corr = [0, 0, 0]; this.frozen = false; this.phase = 'lobby'; this.prev = { x: 0, y: 0, z: 0 }; this.ready = false;
  }
  /* um passo fixo local (60 Hz) */
  step(cmd, hooks, frozen) {
    const p = this.p; this.prev.x = p.m.x; this.prev.y = p.m.y; this.prev.z = p.m.z;
    cmd.seq = ++this.seq; this.pend.push(cmd); if (this.pend.length > 180) this.pend.shift();
    this._apply(cmd, hooks || NOOP_HOOKS, frozen === undefined ? this.frozen : frozen);
  }
  _apply(cmd, hooks, frozen) {
    const p = this.p; if (!p.alive) return;
    if (p.onCow) return;                                   /* montado: posição vem do host */
    if (p.chute) { stepChute(p, cmd, this.W, DT, null); return; }
    p.ads = !!cmd.ads && isGun(p.w) && !p.heal;
    stepPlayer(p.m, cmd, moveMods(p, frozen), this.W, DT);
    const canFire = !frozen && p.useT <= 0 && p.m.mant <= 0 && !p.m.swim && !p.heal;
    weaponTick(p, cmd, DT, hooks, canFire);
    if (p.autoRel > 0) { p.autoRel -= DT; if (p.autoRel <= 0) startReload(p, hooks); }
    if (p.autoThrow && p.w === 'batata' && p.equipT <= 0 && p.throwT <= 0) { p.autoThrow = false; if (p.nades > 0) { p.cdT = 0; p.throwT = 0.32; } }
  }
  /* estado autoritativo do host para este jogador (snap.me) + replay dos comandos ainda não confirmados */
  reconcile(me, frozen) {
    const p = this.p, m = p.m, ox = m.x, oy = m.y, oz = m.z;
    const wasAlive = p.alive;
    Object.assign(m, me.m);
    p.alive = me.alive; p.hp = me.hp; p.armor = me.armor; p.vest = me.vest; p.helm = me.helm; p.pack = me.pack; p.w = me.w; p.own = me.own; p.mag = me.mag; p.ammo = me.ammo; p.nades = me.nades; p.kits = me.kits; p.hasBomb = !!me.bomb;
    p.equipT = me.eq; p.cdT = me.cd; p.relT = me.rel; p.relMax = me.relMax; p.bloom = me.bl; p.throwT = me.tn ? Math.max(p.throwT, 0.1) : 0; p.useT = me.useT; p.useK = me.useK; p.useMax = me.useMax; p.team = me.team; p.buff = { spd: me.buff ? 5 : 0, regen: 0 }; p.healT = me.heal ? 1 : 0;
    p.k = me.k; p.d = me.d; p.score = me.sc; p.windT = 0;
    p.money = me.$ | 0; p.heal = me.heal ? { k: me.heal[0], t: me.heal[1], max: 1 } : null; p.inv = me.inv || {}; p.sel = me.sel || ''; p.pano = me.pano; p.panoUsed = me.panoR; p.caixa = me.caixa; p.breath = me.br; p.onCow = !!me.cow;
    if (me.ch) { if (!p.chute) p.chute = { t: me.ch[0], open: !!me.ch[1] }; else { p.chute.open = !!me.ch[1]; } } else p.chute = null;
    if (wasAlive && !p.alive) { this.pend.length = 0; }
    while (this.pend.length && this.pend[0].seq <= me.seq) this.pend.shift();
    if (p.alive) for (const c of this.pend) this._apply(c, NOOP_HOOKS, frozen === undefined ? this.frozen : frozen);
    /* correção suave: erro visual decai */
    const ex = ox - m.x, ey = oy - m.y, ez = oz - m.z, err = Math.hypot(ex, ez);
    if (err > 3 || !wasAlive || Math.abs(ey) > 2) { this.corr[0] = this.corr[1] = this.corr[2] = 0; }
    else if (err > 0.01) { this.corr[0] += ex; this.corr[1] += ey; this.corr[2] += ez; }
    this.prev.x = m.x; this.prev.y = m.y; this.prev.z = m.z; this.ready = true;
  }
  decay(dt) { const k = Math.exp(-dt * 9); this.corr[0] *= k; this.corr[1] *= k; this.corr[2] *= k; }
}

/* direção de mira (igual ao host) */
function lookDir(yaw, pitch, o) { const cp = Math.cos(pitch); o[0] = -Math.sin(yaw) * cp; o[1] = Math.sin(pitch); o[2] = -Math.cos(yaw) * cp; return o; }
/* converte FOV horizontal (graus) em vertical (graus) para a proporção da tela */
function vfovFrom(hdeg, asp) { return 2 * Math.atan(Math.tan(hdeg * DEG / 2) / Math.max(.5, asp)) / DEG; }
