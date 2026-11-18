/* =====================================================================
   28_glass.js — VIDROS DAS JANELAS (todos os mapas)
   • vidro transparente de verdade (dá para ver através)
   • quebra com tiro, facada, explosão ou com o corpo (correndo / pulando)
   • janela quebrada: a bala passa e dá para PULAR POR ELA (vault estilo
     parkour) — mesmo código no anfitrião e na predição do cliente
   • janelas "pintadas" dos prédios maciços do 5x5 também têm vidro
     transparente (interior escuro) e quebram, mas não dão passagem
   • no 5x5 os vidros voltam a cada round
   ===================================================================== */
'use strict';
/* registro: chamado pelo MapKit ao montar janelas (coordenadas locais do objeto atual) */
MapKit.prototype.glassLocal = function (x0, y0, z0, x1, y1, z1, fake, nxL, nzL) {
  const t = this.t, [ax, az] = this.wxz(x0, z0), [bx, bz] = this.wxz(x1, z1), by = t.y;
  const g = { id: (this.glass || (this.glass = [])).length + 1, x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: Math.min(az, bz), z1: Math.max(az, bz), y0: by + y0, y1: by + y1, fake: !!fake, broken: false };
  /* normal do vidro no mundo (eixo mais fino) */
  const thx = g.x1 - g.x0, thz = g.z1 - g.z0; g.ax = thx < thz ? 'x' : 'z'; g.cx = (g.x0 + g.x1) / 2; g.cz = (g.z0 + g.z1) / 2; g.cy = (g.y0 + g.y1) / 2;
  if (!fake) { g.box = this.W.addBox(g.x0, g.y0, g.z0, g.x1, g.y1, g.z1, 'glass', false); g.box.glass = g; g.bk = [g.box.y0, g.box.y1]; }
  this.glass.push(g); return g;
};
/* índice espacial simples (células de 8 m) */
function glassIndex(W, list) {
  W.glass = list || []; W.glassGrid = new Map(); const cs = 8;
  for (const g of W.glass) for (let i = Math.floor(g.x0 / cs); i <= Math.floor(g.x1 / cs); i++) for (let j = Math.floor(g.z0 / cs); j <= Math.floor(g.z1 / cs); j++) { const k = i + ',' + j; let L = W.glassGrid.get(k); if (!L) W.glassGrid.set(k, L = []); L.push(g); }
}
function glassNear(W, x, z) { if (!W.glassGrid) return []; const cs = 8, i = Math.floor(x / cs), j = Math.floor(z / cs), out = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const L = W.glassGrid.get((i + a) + ',' + (j + b)); if (L) for (const g of L) out.push(g); } return out; }
/* estado da colisão (quebrado = some do mundo) */
function glassSetBroken(g, on) { g.broken = on; if (g.box) { if (on) { g.box.y0 = -9999; g.box.y1 = -9998; } else { g.box.y0 = g.bk[0]; g.box.y1 = g.bk[1]; } } }
/* ---------- VAULT (pular pela janela quebrada) — puro: usado pela Sim e pelo Predictor ---------- */
function glassVaultStep(p, cmd, W, dt) {
  const m = p.m, V = m.vault;
  if (V) {
    V.t += dt; const k = Math.min(1, V.t / V.T), e = k * k * (3 - 2 * k);
    m.x = V.x0 + (V.x1 - V.x0) * e; m.z = V.z0 + (V.z1 - V.z0) * e; m.y = V.y0 + (V.y1 - V.y0) * e + Math.sin(k * Math.PI) * V.h;
    m.vx = (V.x1 - V.x0) / V.T * .4; m.vz = (V.z1 - V.z0) / V.T * .4; m.vy = 0; m.gnd = k >= 1;
    if (k >= 1) m.vault = null; return true;
  }
  if (!W.glass || !cmd || !p.alive) return false;
  const want = cmd.jump || (cmd.sprint && cmd.mvf > .6); if (!want || cmd.mvf < .3) return false;
  const fx = -Math.sin(cmd.yaw), fz = -Math.cos(cmd.yaw);
  for (const g of glassNear(W, m.x, m.z)) {
    if (!g.broken || g.fake) continue;
    /* distância até o plano e posição ao longo dele */
    const along = g.ax === 'x' ? m.z : m.x, lo = g.ax === 'x' ? g.z0 : g.x0, hi = g.ax === 'x' ? g.z1 : g.x1, pd = g.ax === 'x' ? m.x - g.cx : m.z - g.cz;
    if (along < lo + .15 || along > hi - .15 || Math.abs(pd) > 1.05) continue;
    const n = pd > 0 ? -1 : 1, facing = g.ax === 'x' ? fx * n : fz * n; if (facing < .55) continue;
    const sill = g.y0 - m.y; if (sill < .2 || sill > 1.65) continue;
    const tx = g.ax === 'x' ? g.cx + n * 1.0 : m.x, tz = g.ax === 'x' ? m.z : g.cz + n * 1.0, ty = floorAt(W, tx, tz, g.y0 + .3);
    if (Math.abs(ty - m.y) > 1.8) continue;
    m.vault = { t: 0, T: .5, x0: m.x, y0: m.y, z0: m.z, x1: tx, y1: ty, z1: tz, h: Math.max(.25, g.y0 - Math.max(m.y, ty) + .25) };
    return true;
  }
  return false;
}
/* linha de visão: vidro é transparente (enxerga através); tiros continuam batendo e quebrando */
(function () { const los0 = World.prototype.los; World.prototype.los = function (ax, ay, az, bx, by, bz) {
  if (!this.glass || !this.glass.length) return los0.call(this, ax, ay, az, bx, by, bz);
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz) || 1e-6, ux = dx / d, uy = dy / d, uz = dz / d; let t0 = 0;
  for (let k = 0; k < 4; k++) { const h = this.raycast(ax + ux * t0, ay + uy * t0, az + uz * t0, ux, uy, uz, d - t0 - .05, true); if (!h) return true; if (h.obj && h.obj.glass) { t0 += h.t + .05; continue; } return false; }
  return los0.call(this, ax + ux * t0, ay + uy * t0, az + uz * t0, bx, by, bz);
}; })();
/* ---------- regras (anfitrião) ---------- */
Object.assign(Sim.prototype, /** @type {ThisType<Sim> & Record<string, any>} */ ({
  breakGlass(g, by, dx, dz) {
    if (!g || g.broken) return; glassSetBroken(g, true); this.glassVer = (this.glassVer | 0) + 1;
    this.emit({ t: 'glass', id: g.id, dx: r2(dx || 0), dz: r2(dz || 0), by: by ? by.id : '' }); if (!g.fake) this.nextSounds.push({ x: g.cx, z: g.cz, p: by ? by.id : '', r: 34 });
  },
  restoreGlass() { if (!this.W.glass) return; let n = 0; for (const g of this.W.glass) if (g.broken) { glassSetBroken(g, false); n++; } if (n) { this.glassVer = (this.glassVer | 0) + 1; this.emit({ t: 'glassR' }); } },
  /* vidro pintado (fake) num ponto atingido da parede */
  fakeGlassAt(x, y, z) { for (const g of glassNear(this.W, x, z)) if (g.fake && !g.broken && x >= g.x0 - .2 && x <= g.x1 + .2 && z >= g.z0 - .2 && z <= g.z1 + .2 && y >= g.y0 - .05 && y <= g.y1 + .05) return g; return null; },
  /* corpo: correndo ou pulando contra o vidro quebra */
  bodyGlass(p, pre) {
    const m = p.m, vx = pre ? pre.vx : m.vx, vz = pre ? pre.vz : m.vz, vy = pre ? pre.vy : m.vy, hs = Math.hypot(vx, vz); if (hs < 4.2 && !((vy > 1.5 || !m.gnd) && hs > 2.5)) return;
    for (const g of glassNear(this.W, m.x, m.z)) { if (g.broken || g.fake) continue; if (m.x + .55 < g.x0 || m.x - .55 > g.x1 || m.z + .55 < g.z0 || m.z - .55 > g.z1 || m.y + 1.7 < g.y0 || m.y + .3 > g.y1) continue; this.breakGlass(g, p, vx / hs, vz / hs); }
  }
}));
(function () {
  const S = Sim.prototype, hs0 = S.hitscan, mel0 = S.meleeHit, exp0 = S.explode, one0 = S.stepOne, start0 = S.startRound, snap0 = S.snapshot;
  /* tiro: o vidro quebra e a bala segue; vidro pintado quebra e a bala para na parede */
  S.hitscan = function (p, ox, oy, oz, dx, dy, dz, maxT, T) {
    for (let k = 0; k < 4; k++) {
      const wh = this.W.raycast(ox, oy, oz, dx, dy, dz, maxT, true);
      if (wh && wh.obj && wh.obj.glass && !wh.obj.glass.broken) { this.breakGlass(wh.obj.glass, p, dx, dz); continue; }
      break;
    }
    const h = hs0.call(this, p, ox, oy, oz, dx, dy, dz, maxT, T);
    if (h && h.k === 'world') { const fg = this.fakeGlassAt(ox + dx * h.t, oy + dy * h.t, oz + dz * h.t); if (fg) { this.breakGlass(fg, p, dx, dz); h.mat = 'glass'; } }
    return h;
  };
  /* facada no vidro */
  S.meleeHit = function (p, w, kind) {
    const o = eyePos(p, this.tmpA), f = aimVec(p.m.yaw, p.m.pitch, this.tmpC), wh = this.W.raycast(o.x, o.y, o.z, f.x, f.y, f.z, 1.9, true);
    if (wh && wh.obj && wh.obj.glass) this.breakGlass(wh.obj.glass, p, f.x, f.z);
    else if (wh) { const fg = this.fakeGlassAt(o.x + f.x * wh.t, o.y + f.y * wh.t, o.z + f.z * wh.t); if (fg) this.breakGlass(fg, p, f.x, f.z); }
    return mel0.call(this, p, w, kind);
  };
  /* explosão quebra os vidros em volta */
  S.explode = function (x, y, z, R, D, owner, wid, size, big) {
    for (const g of glassNear(this.W, x, z)) if (!g.broken && Math.hypot(g.cx - x, g.cy - y, g.cz - z) < R * .9) { const l = Math.hypot(g.cx - x, g.cz - z) || 1; this.breakGlass(g, owner, (g.cx - x) / l, (g.cz - z) / l); }
    return exp0.apply(this, arguments);
  };
  /* vault antes da física; corpo quebra vidro depois */
  S.stepOne = function (p, dt, frozenAll, moveFrozen) {
    if (p.alive && !p.onCow && !p.chute && !(moveFrozen === undefined ? frozenAll : moveFrozen)) {
      const c = p.bot ? p.cmd : p.cmd; if (p.m.vault || (c && glassVaultStep(p, c, this.W, 0) && p.m.vault)) { glassVaultStep(p, c, this.W, dt); pushHist(p, this.t); if (c && c.acts) weaponTick(p, c, dt, this.hooks, false); return; }
    }
    const pre = { vx: p.m.vx, vz: p.m.vz, vy: p.m.vy };
    one0.call(this, p, dt, frozenAll, moveFrozen);
    if (p.alive && !p.onCow && !p.chute) this.bodyGlass(p, pre);
  };
  S.startRound = function () { start0.apply(this, arguments); if (this.mode === 'tatico') this.restoreGlass(); };
  /* clientes recebem a lista de vidros quebrados (para colisão/vault e para quem entra depois) */
  S.snapshot = function (forId, withSb, lootVer) { const s = snap0.call(this, forId, withSb, lootVer); if (this.W.glass && (withSb || this.tick % 30 === 0)) s.GB = this.W.glass.filter(g => g.broken).map(g => g.id); return s; };
})();
