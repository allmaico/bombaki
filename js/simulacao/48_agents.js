/* =====================================================================
   48_agents.js — AGENTES (anfitrião): habilidades novas, pontos de suprema,
   Espiga Dourada (orbe de suprema), escudo, prisão do Território, reviver.
   Festa do Roçado · Espião do Mato · Armadilha de Galinha · Olho da Roça ·
   Território do Patrão · Chuva de Insetos · Reforço do Sítio · Reanimação do Bão
   ===================================================================== */
'use strict';
const ULT_MAX = 8;
/* pontos onde nascem as Espigas Douradas: metade do caminho do spawn do ataque até cada bombsite (vale para qualquer mapa) */
function orbSpots(map, nav) {
  if (map._orbs) return map._orbs; const out = [];
  if (map.sites && map.spawns && map.spawns.atk && nav && nav.findPath) {
    const A = map.spawns.atk, sx = A.reduce((s, p) => s + p.x, 0) / A.length, sz = A.reduce((s, p) => s + p.z, 0) / A.length;
    for (const id of ['A', 'B']) { const S = map.sites[id]; if (!S) continue; const path = nav.findPath(sx, sz, S.x, S.z); if (!path || path.length < 4) continue;
      let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
      let acc = 0; for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z); if (acc + d >= L * .55) { const k = nav.idx(path[i].x, path[i].z); out.push({ x: path[i].x, z: path[i].z, y: k >= 0 ? nav.y[k] : map.W.heightAt(path[i].x, path[i].z) }); break; } acc += d; } }
  }
  map._orbs = out; return out;
}
Object.assign(Sim.prototype, /** @type {ThisType<Sim> & Record<string, any>} */ ({
  /* ponto na mira (até maxD): parede → recua um pouco; nada → chão no alcance máximo */
  aimPoint(p, maxD) {
    const o = eyePos(p, this.tmpA), f = aimVec(p.m.yaw, p.m.pitch, this.tmpC), h = this.W.raycast(o.x, o.y, o.z, f.x, f.y, f.z, maxD, true);
    let t = h ? Math.max(.5, h.t - .4) : maxD, x = o.x + f.x * t, z = o.z + f.z * t;
    const k = this.nav && this.nav.idx(x, z), y = k >= 0 && this.nav.ok[k] ? this.nav.y[k] : this.floorY(x, z, o.y + f.y * t + .5);
    return { x, y, z };
  },
  addUlt(p, n) { if (!p || this.mode !== 'tatico') return; const F = FARMERS[p.farmer], c = F && F.ab[3] ? F.ab[3].cost : 7; const old = p.ult | 0; p.ult = Math.min(Math.max(c, 0) || ULT_MAX, old + n); if (p.ult >= c && old < c) this.emit({ t: 'ultok', p: p.id }); },
  olhoPulse(p) { let n = 0; for (const q of this.players) if (q.alive && this.isEnemy(p, q)) { q.revT = Math.max(q.revT || 0, 1.6); n++; } this.emit({ t: 'abx', k: 'olho', id: 0, p: p.id, n }); },
  /* passo das entidades novas; true = foi removida */
  stepAgentAbx(e, dt) {
    const owner = this.byId.get(e.owner), age = (e.age = (e.age || 0) + dt);
    if (e.k === 'festa') {
      e.next -= dt;
      if (e.next <= 0 && e.n < 5) { e.n++; e.next = .6; let hit = 0;
        for (const q of this.players) { if (!q.alive || (owner && !this.isEnemy(owner, q) && q !== owner)) continue; const d = Math.hypot(q.m.x - e.x, q.m.z - e.z); if (d > e.r || Math.abs(q.m.y - e.y) > 4) continue; this.damage(q, owner || null, 35 * (1 - d / e.r * .35), 'festa', 'body', q.m.x, q.m.y + 1, q.m.z, { raw: true }); hit++; }
        const a = Math.random() * TAU, rr = Math.random() * e.r * .8; this.emit({ t: 'abx', k: 'festa', id: e.id, x: r2(e.x + Math.cos(a) * rr), y: r2(e.y), z: r2(e.z + Math.sin(a) * rr), n: hit });
        this.nextSounds.push({ x: e.x, z: e.z, p: e.owner, r: 70 });
      }
      if (e.n >= 5 && e.next <= 0) { this.removeAbx(e); return true; }
    } else if (e.k === 'espiao' || e.k === 'olho') {
      while (e.pulse && e.pulse.length && e.t <= e.pulse[0]) {
        e.pulse.shift();
        if (e.k === 'olho') { if (owner) this.olhoPulse(owner); continue; }
        let n = 0; for (const q of this.players) { if (!q.alive || q.team === e.team) continue; if (Math.hypot(q.m.x - e.x, q.m.z - e.z) > e.r) continue; if (!this.W.los(e.x, e.y + .6, e.z, q.m.x, q.m.y + 1.2, q.m.z) || this.smokeBlocks(e.x, e.y + .6, e.z, q.m.x, q.m.y + 1.2, q.m.z)) continue; q.revT = Math.max(q.revT || 0, 2.2); n++; }
        this.emit({ t: 'abx', k: 'espiao', id: e.id, x: r2(e.x), y: r2(e.y), z: r2(e.z), n });
      }
    } else if (e.k === 'galinha') {
      /* corre em frente; para em parede/buraco; explode perto de inimigo à vista */
      /* persegue o inimigo visível mais próximo (até 12 m), como um cão farejador */
      let tq = null, td = 12; for (const q of this.players) { if (!q.alive || q.team === e.team) continue; const d = Math.hypot(q.m.x - e.x, q.m.z - e.z); if (d < td && this.W.los(e.x, e.y + .4, e.z, q.m.x, q.m.y + 1, q.m.z)) { td = d; tq = q; } }
      if (tq) { const l = td || 1; e.dx = (tq.m.x - e.x) / l; e.dz = (tq.m.z - e.z) / l; e.ax = Math.round(Math.atan2(-e.dx, -e.dz) * 100); }
      const sp = 7.5 * dt, nx = e.x + e.dx * sp, nz = e.z + e.dz * sp, k = this.nav.idx(nx, nz);
      if (k >= 0 && this.nav.ok[k] && Math.abs(this.nav.y[k] - e.y) < .9 && !this.W.raycast(e.x, e.y + .3, e.z, e.dx, 0, e.dz, sp + .3, true)) { e.x = nx; e.z = nz; e.y = this.nav.y[k]; }
      else { const s = Math.random() < .5 ? 1 : -1, ndx = -e.dz * s, ndz = e.dx * s; e.dx = ndx; e.dz = ndz; e.ax = Math.round(Math.atan2(-e.dx, -e.dz) * 100); }
      let boom = e.t <= dt * 1.5;
      for (const q of this.players) if (q.alive && q.team !== e.team && Math.hypot(q.m.x - e.x, q.m.z - e.z) < e.r && this.W.los(e.x, e.y + .4, e.z, q.m.x, q.m.y + 1.2, q.m.z)) { boom = true; break; }
      if (boom) { const hitL = {};
        for (const q of this.players) { if (!q.alive || q.team === e.team) continue; const d = Math.hypot(q.m.x - e.x, q.m.z - e.z); if (d > 5.5 || !this.W.los(e.x, e.y + .4, e.z, q.m.x, q.m.y + 1.2, q.m.z)) continue; q.blindT = Math.max(q.blindT || 0, 1.2); q.revT = Math.max(q.revT || 0, 3); hitL[q.id] = 1.2; }
        this.emit({ t: 'flash', x: r2(e.x), y: r2(e.y + .3), z: r2(e.z), b: hitL, k: 'galinha' }); this.emit({ t: 'abx', k: 'galinha', id: e.id, x: r2(e.x), y: r2(e.y), z: r2(e.z), n: Object.keys(hitL).length });
        this.removeAbx(e); return true; }
    } else if (e.k === 'territorio') {
      if (e.arm > 0) { e.arm -= dt; if (e.arm <= 0) {
        const L = []; for (const q of this.players) { if (!q.alive || q.team === e.team) continue; if (Math.hypot(q.m.x - e.x, q.m.z - e.z) > e.r || Math.abs(q.m.y - e.y) > 5) continue; q.detainT = 5; q.revT = Math.max(q.revT || 0, 5); if (q.useK) this.cancelUse(q); L.push(q.id); }
        this.emit({ t: 'abx', k: 'territorio', id: e.id, x: r2(e.x), y: r2(e.y), z: r2(e.z), n: L.length, v: L }); e.t = Math.min(e.t, 5.2); } }
    } else if (e.k === 'insetos') {
      e.dmgT = (e.dmgT || 0) + dt;
      for (const q of this.players) { if (!q.alive || q.team === e.team) continue; if (Math.hypot(q.m.x - e.x, q.m.z - e.z) > e.r || Math.abs(q.m.y - e.y) > 5) continue; q.bugT = 1; if (e.dmgT >= .5) this.damage(q, owner || null, 2, 'insetos', 'body', q.m.x, q.m.y + 1, q.m.z, { raw: true }); }
      if (e.dmgT >= .5) e.dmgT = 0;
    }
    return false;
  },
  /* Reanimação do Bão */
  revive(q, by) {
    q.alive = true; q.hp = 60; q.dmgBy = {}; q.useT = 0; q.useK = ''; q.heal = null; q.blindT = 0; q.slowT = 0; q.detainT = 0; q.m.vx = q.m.vz = 0; q.m.vy = 0;
    if (!q.own || !Object.keys(q.own).length) { q.own = { estilingue: 1, faca: 1 }; q.mag = Object.assign(q.mag || {}, { estilingue: WEAPONS.estilingue.mag }); }
    if (!q.own[q.w]) q.w = Object.keys(q.own)[0];
    q.revived = (q.revived | 0) + 1; this.emit({ t: 'rev', p: q.id, by: by.id, x: r2(q.m.x), y: r2(q.m.y), z: r2(q.m.z) });
  },
  /* Espigas Douradas: 2 por round, nos caminhos do meio; pegar = +1 ponto de suprema */
  spawnOrbs() { this.orbs = orbSpots(this.map, this.nav).map((o, i) => ({ id: i + 1, x: o.x, y: o.y, z: o.z, taken: false })); },
  stepOrbs() {
    if (!this.orbs || this.phase !== 'live') return;
    for (const o of this.orbs) { if (o.taken) continue; for (const q of this.players) { if (!q.alive || Math.hypot(q.m.x - o.x, q.m.z - o.z) > 1.3 || Math.abs(q.m.y - o.y) > 2) continue; o.taken = true; this.addUlt(q, 1); this.emit({ t: 'orb', p: q.id, id: o.id, x: r2(o.x), y: r2(o.y), z: r2(o.z) }); break; } }
  }
}));
/* ---------- ganchos nas regras existentes ---------- */
(function () {
  const S = Sim.prototype, kill0 = S.kill, emit0 = S.emit, damage0 = S.damage, start0 = S.startRound, step0 = S.step, startM0 = S.startMatch, snapMe0 = S.snapMe, snap0 = S.snapshot;
  S.kill = function (v, a, wid, zone) { const was = v.alive; kill0.call(this, v, a, wid, zone); if (!was || this.mode !== 'tatico') return; if (a && a !== v && this.isEnemy(a, v)) this.addUlt(a, 1); this.addUlt(v, 1); };
  S.emit = function (e) { emit0.call(this, e); if (e.t === 'bomb' && (e.k === 'plant' || e.k === 'defuse') && e.p) this.addUlt(this.byId.get(e.p), 1); };
  /* escudo do Reforço do Sítio absorve antes da vida */
  S.damage = function (v, a, amt, wid, zone, x, y, z, opt) {
    if (v && v.shield > 0 && v.alive && this.phase === 'live' && !(a && a !== v && !this.isEnemy(a, v))) { const s = Math.min(v.shield, amt); v.shield -= s; amt -= s; if (amt <= 0) { if (a && a !== v) this.emit({ t: 'hit', v: v.id, a: a.id, d: Math.round(s), z: zone || 'body', w: wid, x: r2(x), y: r2(y), z2: r2(z), hp: Math.round(v.hp), sh: 1 }); return 0; } }
    return damage0.call(this, v, a, amt, wid, zone, x, y, z, opt);
  };
  S.startMatch = function () { for (const p of this.players) p.ult = 0; return startM0.apply(this, arguments); };
  S.startRound = function () { start0.apply(this, arguments); if (this.mode === 'tatico') this.spawnOrbs(); };
  S.step = function () { step0.call(this); if (this.mode === 'tatico') this.stepOrbs(); };
  S.snapMe = function (p) { const o = snapMe0.call(this, p); o.ul = p.ult | 0; o.sg = r2(Math.max(0, p.sigT || 0)); o.sh = Math.round(p.shield || 0); o.dn = r2(Math.max(0, p.detainT || 0)); return o; };
  S.snapshot = function (forId, withSb, lootVer) { const s = snap0.call(this, forId, withSb, lootVer); if (this.mode === 'tatico' && this.orbs) s.OR = this.orbs.filter(o => !o.taken).map(o => [o.id, r2(o.x), r2(o.y), r2(o.z)]); return s; };
})();
