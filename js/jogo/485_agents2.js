/* =====================================================================
   485_agents2.js — v7.10: habilidades novas dos 5 agentes novos (anfitrião)
   Laço (Zeca) · Rodeio Final (Zeca, suprema) · Queimada (Brasa, suprema) ·
   Muda de Mandacaru (Lua). Arrancada de Touro recarrega com abate.
   ===================================================================== */
'use strict';
Object.assign(AB_KIND, { laco: 17, rodeio: 18, queimada: 19, mandacaru: 20 });
for (const k of ['laco', 'rodeio', 'queimada', 'mandacaru']) AB_BY_CODE[AB_KIND[k]] = k;
Object.assign(Sim.prototype, /** @type {ThisType<Sim> & Record<string, any>} */ ({
  /** habilidades novas: devolve false se não deu para usar (não gasta a carga) */
  useAb2(p, id, front, fx, fz) {
    const m = p.m;
    if (id === 'laco') {   /* joga o laço até 18 m e é puxado até lá */
      const a = this.aimPoint(p, 18), dx = a.x - m.x, dz = a.z - m.z, d = Math.hypot(dx, dz);
      if (d < 2.5) { this.deny(p, 'Mire mais longe para o laço.'); return false; }
      const V = 24; p.dashT = Math.min(.8, d / V); p.dashV = V; p.dashX = dx / d; p.dashZ = dz / d;
      const dy = a.y - m.y; m.vy = dy > .4 ? Math.min(13, Math.sqrt(2 * 22 * dy) + 2.5) : 3.2; m.gnd = false;
      this.nextSounds.push({ x: m.x, z: m.z, p: p.id, r: 30 }); this.emit({ t: 'ab', k: 'laco', p: p.id, x: r2(m.x), y: r2(m.y + 1.4), z: r2(m.z), x2: r2(a.x), y2: r2(a.y), z2: r2(a.z) }); return true;
    }
    if (id === 'rodeio') { p.rodeoT = 8; this.emit({ t: 'ab', k: 'rodeio', p: p.id, x: r2(m.x), y: r2(m.y), z: r2(m.z) }); return true; }
    if (id === 'queimada') {   /* muro de fumaça: 7 nuvens em linha na direção da mira, até 28 m (atravessa paredes, como um muro de verdade) */
      const o = { x: m.x, z: m.z }; let n = 0;
      for (let i = 0; i < 7; i++) { const t = 3 + i * 3.6, x = o.x + fx * t, z = o.z + fz * t;         const e = this.addAbx(p, 'fumaca', x, this.floorY(x, z, m.y + 1.5), z, { t: 13, r: 2.7, wall: 1 }); e.team = p.team; n++; }
      if (!n) { this.deny(p, 'Sem espaço para a queimada.'); return false; } return true;
    }
    if (id === 'mandacaru') {   /* parede de mandacaru (3,4 m): bloqueia passagem e tiro, espeta quem encosta */
      const f = front(2.4), alongZ = Math.abs(fx) > Math.abs(fz), hw = 1.7, ht = .3, y0 = f.y;
      const box = alongZ ? [f.x - ht, y0, f.z - hw, f.x + ht, y0 + 1.9, f.z + hw] : [f.x - hw, y0, f.z - ht, f.x + hw, y0 + 1.9, f.z + ht];
      const e = this.addAbx(p, 'mandacaru', f.x, y0, f.z, { t: 16, hp: 220, ax: alongZ ? 1 : 0 }); e.bx = box; e.box = this.W.addDyn(box, 'wood'); e.box.ab = e; return true;
    }
    return false;
  },
  /** passo das coisas novas (chamado no passo das habilidades) */
  stepAb2(dt) {
    for (const p of this.players) if (p.rodeoT > 0) { p.rodeoT -= dt; if (!p.alive) p.rodeoT = 0; }
    for (const e of this.abx) {
      if (e.k !== 'mandacaru' || !e.bx) continue; const b = e.bx, owner = this.byId.get(e.owner);
      for (const q of this.players) {
        if (!q.alive || q.team === e.team) continue; const x = q.m.x, z = q.m.z, y = q.m.y;
        if (x < b[0] - .55 || x > b[3] + .55 || z < b[2] - .55 || z > b[5] + .55 || y > b[4] || y + 1.6 < b[1]) continue;
        q.slowT = Math.max(q.slowT || 0, .35); q.cactT = (q.cactT || 0) - dt;
        if (q.cactT <= 0) { q.cactT = .5; this.damage(q, owner || null, 6, 'mandacaru', 'body', x, y + 1, z, { raw: true }); }
      }
    }
  }
}));
/* abate: Arrancada de Touro (Zeca) recarrega na hora e o Rodeio Final renova o tempo */
(function () {
  const dmg0 = Sim.prototype.damage;
  Sim.prototype.damage = function (v, a, amt, wid, zone, x, y, z, opt) {
    const was = v && v.alive, r = dmg0.call(this, v, a, amt, wid, zone, x, y, z, opt);
    if (was && v && !v.alive && a && a !== v && this.mode === 'tatico') {
      if (a.rodeoT > 0) a.rodeoT = 8;
      const F = FARMERS[a.farmer], sg = F && F.ab[2]; if (sg && sg.id === 'investida' && a.abC && (a.abC[2] | 0) < sg.max) { a.abC[2] = sg.max; a.sigT = 0; this.emit({ t: 'sig', p: a.id, i: 2 }); }
    }
    return r;
  };
})();
