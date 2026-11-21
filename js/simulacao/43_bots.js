/* ordem de preferência das armas dos bots (inclui as armas novas) */
const BOT_PREF = {
  longe: ['vassoura', 'vara', 'porteira', 'galho', 'enxadao', 'moedor', 'colher', 'cabrita', 'trezoitao', 'tijolinho', 'estilingue'],
  medio: ['porteira', 'galho', 'enxadao', 'vassoura', 'vara', 'moedor', 'colher', 'cabrita', 'trezoitao', 'tijolinho', 'estilingue'],
  perto: ['cabrita', 'colher', 'moedor', 'porteira', 'galho', 'enxadao', 'trezoitao', 'tijolinho', 'estilingue', 'vara', 'vassoura'],
  geral: ['porteira', 'galho', 'enxadao', 'moedor', 'colher', 'cabrita', 'vassoura', 'vara', 'trezoitao', 'tijolinho', 'estilingue']
};
/* =====================================================================
   43_bots.js — IA dos bots: percepção (visão + audição + memória), mira
   suave com erro decrescente, rajadas, estratégia por objetivo (plantar,
   defender, desarmar, buscar loot), granadas, desvio e destravamento.
   ===================================================================== */
'use strict';
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };

class BotBrain {
  constructor(p, level) { this.lvName = level; this.lv = BOT_LEVELS[level] || BOT_LEVELS.normal; this.viewR = { facil: 52, normal: 72, dificil: 92, insano: 110 }[level] || 72; this.jit = 0.85 + Math.random() * 0.3; this.reset(null, p); }
  reset(sim, p) {
    Object.assign(this, {
      path: null, pi: 0, pathAge: 99, gx: -9999, gz: -9999, noPath: false, tgt: null, seenT: -99, firstSeenT: -99, last: null, errYaw: 0, errPit: 0, errT: 0, burstLeft: 0, pauseT: 0,
      strafeDir: Math.random() < .5 ? 1 : -1, strafeT: 0, stuckT: 0, lx: p.m.x, lz: p.m.z, lchk: 0, unstick: 0, unstickDir: 1, hold: null, holdFor: '', role: '', site: '', heard: null, nadeCd: 5 + Math.random() * 10,
      nadeUntil: 0, nadeAim: null, aimYaw: p.m.yaw, aimPitch: 0, aimErr: 1, lookT: 0, lookDir: 1, retreatT: 0, planned: false, siteNade: false, adsT: 0, wander: null, settleT: 0, percT: Math.random() * 0.15, lootT: 0, reactDone: false, standT: 0, pickTimer: 0, lastMag: 0
    });
  }
  /* ------------------------------------------------------------- */
  think(sim, p, dt) {
    const c = p.cmd, m = p.m, lv = this.lv, now = sim.t;
    c.seq++; c.mvf = c.mvr = 0; c.jump = c.crouch = c.sprint = c.fire = c.ads = c.use = false; c.acts = null; c.lag = 0;
    if (!sim.nav) return;
    if (sim.phase !== 'live') { this.planRound(sim, p); if (sim.mode === 'tatico' && sim.phase === 'prep' && p.alive) { this.prepMove(sim, p, c, dt); this.finish(c); return; } c.yaw = this.aimYaw; c.pitch = this.aimPitch; return; }
    if (p.onCow) { c.yaw = m.yaw; c.pitch = 0; return; }
    if (p.chute) { const tx = (this.landX === undefined ? m.x : this.landX) - m.x, tz = (this.landZ === undefined ? m.z : this.landZ) - m.z; c.yaw = Math.atan2(-tx, -tz); c.pitch = -.4; c.mvf = Math.hypot(tx, tz) > 4 ? 1 : 0; this.aimYaw = c.yaw; return; }
    this.percT -= dt; this.pathAge += dt;
    if (this.percT <= 0) { this.percT = 0.11 + Math.random() * 0.04; this.perceive(sim, p); }
    let engaged = this.tgt && this.tgt.alive && now - this.seenT < 0.5;
    if (engaged && sim.mode === 'caos') {
      /* BR: sem arma de fogo prioriza o loot; fora da zona prioriza fugir */
      const dE = Math.hypot(this.tgt.m.x - m.x, this.tgt.m.z - m.z), hasGun = PRIMARIES.concat(['estilingue']).some(i => p.own[i] !== undefined && ((p.mag[i] | 0) > 0 || (p.ammo[WEAPONS[i].ammo] | 0) > 0));
      const z = sim.zone, out = z && Math.hypot(m.x - z.cx, m.z - z.cz) > z.r - 3;
      if ((!hasGun && dE > 9) || (out && dE > 6)) engaged = false;
    }
    const searching = !engaged && sim.mode !== 'caos' && this.tgt && this.tgt.alive && now - this.seenT < (sim.mode === 'tatico' ? 3.5 : 6) && this.last && this.role !== 'carry' && this.role !== 'plant';
    if (!(this.tgt && this.tgt.alive)) { this.tgt = null; }
    if (this.nadeUntil > now) { this.doNade(sim, p, c, dt); this.finish(c); return; }
    if (engaged) this.combat(sim, p, c, dt);
    else {
      this.burstLeft = 0; this.reactDone = false;
      this.quickMaintain(sim, p, c);
      if (searching) this.search(sim, p, c, dt);
      else if (!(sim.mode === 'tatico' && this.tatPick(sim, p, c, dt))) this.objective(sim, p, c, dt);
    }
    /* granada */
    if (p.nades > 0 && now > this.nadeCd && sim.mode === 'tatico' || (sim.mode === 'caos' && p.nades > 0 && now > this.nadeCd)) this.maybeNade(sim, p, c);
    this.avoidNades(sim, p, c);
    this.finish(c);
  }
  finish(c) { c.yaw = this.aimYaw; c.pitch = clamp(this.aimPitch, -1.4, 1.4); }
  planRound(sim, p) {
    if (this.planned) { this.idleLook(p); return; }
    this.planned = true; const R = sim.rng;
    if (sim.mode === 'tatico') {
      if (!sim.plan || sim.plan.round !== sim.round) sim.plan = { round: sim.round, atk: R.chance(.5) ? 'A' : 'B', go: false, stage: null };
      if (p.team === T_ATK) { this.site = R.chance(.8) ? sim.plan.atk : (sim.plan.atk === 'A' ? 'B' : 'A'); this.role = p.hasBomb ? 'carry' : 'push'; if (p.hasBomb) this.site = sim.plan.atk; }
      else {
        const defs = sim.players.filter(q => q.team === T_DEF), i = defs.indexOf(p);
        if (defs.length >= 4 && i === defs.length - 1 && sim.map.roam !== false) { this.role = 'roam'; this.site = R.chance(.5) ? 'A' : 'B'; }
        else { this.role = 'hold'; this.site = (i % 2 === 0) ? 'A' : 'B'; }
      }
    } else this.role = 'loot';
    this.hold = null; this.path = null; this.aimYaw = p.m.yaw;
  }
  /* fase de compra (5x5): defesa ocupa o bombsite combinado; ataque encosta na barreira da rota planejada */
  prepMove(sim, p, c, dt) {
    const m = p.m; this.pathAge += dt;
    if (!this.prepGoal || this.prepRound !== sim.round) {
      this.prepRound = sim.round; this.prepGoal = null; const S = this.siteOf(sim, this.site || 'A'), bar = sim.barrier;
      if (p.team === T_DEF) {
        /* a posição da compra é a mesma do round (ninguém troca de lugar quando a barreira cai) */
        let roam = this.role === 'roam', C = roam ? this.midAnchor(sim) : S, h = this.safeSpot(sim, C, roam ? 2 : 4, 14);
        if (roam && (!h || h.seen)) { roam = false; this.role = 'hold'; C = S; h = this.safeSpot(sim, S, 4, 14); }   /* meio exposto: vira defensor do site */
        h = h || { x: C.x, z: C.z };
        this.setThreat(sim, h);
        this.hold = h; this.holdFor = roam ? 'roam' : 'def'; this.prepGoal = { x: h.x, z: h.z, lx: h.x - Math.sin(this.threatYaw) * 10, lz: h.z - Math.cos(this.threatYaw) * 10 };
      }
      else if (bar && bar.gates.length) {
        let g = bar.gates[0], bd = 1e9; for (const q of bar.gates) { const d = Math.hypot(q.x - S.x, q.z - S.z) - Math.min(q.n, 8) * 1.5; if (d < bd) { bd = d; g = q; } }
        const back = 2.5 + Math.random() * 3, side = (Math.random() - .5) * Math.min(6, g.n * .6);
        this.prepGoal = { x: g.x - g.nx * back - g.nz * side, z: g.z - g.nz * back + g.nx * side, lx: g.x + g.nx * 20, lz: g.z + g.nz * 20 };
        const k = sim.nav.idx(this.prepGoal.x, this.prepGoal.z); if (k < 0 || !sim.nav.ok[k]) { this.prepGoal.x = m.x; this.prepGoal.z = m.z; }
      }
      this.prepWait = .4 + Math.random() * 3;   /* cada um sai num tempo (compra primeiro) */
    }
    const G0 = this.prepGoal; if (!G0) { this.idleLook(p); return; }
    if ((this.prepWait -= dt) > 0) { this.idleLook(p); return; }
    if (Math.hypot(G0.x - m.x, G0.z - m.z) > 1.6) this.goto(sim, p, c, G0.x, G0.z, p.team === T_DEF, dt);
    else {
      /* defesa já posicionada: arma Cerca Elétrica e Sinal do Gado na entrada do site antes do round (como no Valorant) */
      const want = p.team === T_DEF && sim.mode === 'tatico' && this.has ? ['arapuca', 'sino'].map(id => this.has(p, id)).find(i => i >= 0) : -1;
      if (want !== undefined && want >= 0 && sim.t > (this.prepSetT || 0)) {
        const S = this.siteOf(sim, this.site || 'A'), e = this.entryDir(sim, S), yaw = Math.atan2(-e.x, -e.z); this.lookToward(m, yaw, 0, dt, 10);
        if (Math.abs(angDiff(this.aimYaw, yaw)) < .1) { (c.acts || (c.acts = [])).push('ab:' + want); this.prepSetT = sim.t + .9; }
      } else this.lookToward(m, Math.atan2(-(G0.lx - m.x), -(G0.lz - m.z)), 0, dt, 3);
    }
  }
  /* posição de defesa que NÃO tem visão para as saídas do spawn do ataque (ninguém morre de graça quando a barreira cai) */
  safeSpot(sim, C, rmin, rmax) {
    const nav = sim.nav, R = sim.rng, bar = sim.barrier, W = sim.W; let best = null, bs = -1e9;
    const eyes = []; if (bar) for (const g of bar.gates) { if (g.n < 2) continue; const gy = (nav.y[nav.idx(g.x, g.z)] || 1) + 1.5; for (const back of [3, -7]) for (const lat of [-2.5, 0, 2.5]) { const x = g.x - g.nx * back - g.nz * lat, z = g.z - g.nz * back + g.nx * lat, k = nav.idx(x, z); if (k >= 0 && nav.ok[k]) eyes.push({ x, z, y: nav.y[k] + 1.5 }); } }
    for (let t = 0; t < 26; t++) {
      const pt = nav.randomPoint(R, C.x, C.z, rmin, rmax); if (!pt) continue; const py = nav.y[nav.idx(pt.x, pt.z)] + 1.5;
      let seen = 0; for (const e of eyes) if (Math.hypot(e.x - pt.x, e.z - pt.z) < 90 && W.los(e.x, e.y, e.z, pt.x, py, pt.z)) seen++;
      const losC = W.los(pt.x, py, pt.z, C.x, W.heightAt(C.x, C.z) + 1, C.z) ? 1 : 0, sc = -seen * 10 + losC * 3 - Math.hypot(pt.x - C.x, pt.z - C.z) * .05;
      if (sc > bs) { bs = sc; best = pt; best.seen = seen; } if (!seen && losC && t > 6) break;
    }
    return best;
  }
  /* de onde o ataque vai aparecer para quem segura `h`: primeiro trecho visível do caminho até o spawn do ataque */
  setThreat(sim, h) {
    const A = sim.map.spawns.atk, sx = A.reduce((s, q) => s + q.x, 0) / A.length, sz = A.reduce((s, q) => s + q.z, 0) / A.length, nav = sim.nav, path = nav.findPath(h.x, h.z, sx, sz), hy = (nav.y[nav.idx(h.x, h.z)] || 1) + 1.5;
    let tx = sx, tz = sz;
    if (path && path.length > 1) { let lx = path[1].x, lz = path[1].z; for (let i = 1; i < path.length; i++) { const q = path[i], qy = (nav.y[nav.idx(q.x, q.z)] || 1) + 1.2; if (!sim.W.los(h.x, hy, h.z, q.x, qy, q.z)) break; lx = q.x; lz = q.z; if (Math.hypot(q.x - h.x, q.z - h.z) > 25) break; } tx = lx; tz = lz; }
    this.threatYaw = Math.atan2(-(tx - h.x), -(tz - h.z)); this.threatFor = h;
  }
  /* ponto do meio entre os dois bombsites, puxado um pouco para o lado da defesa */
  midAnchor(sim) { const A = sim.map.sites.A, B = sim.map.sites.B, D = sim.map.spawns.def[0]; const x = (A.x + B.x) / 2, z = (A.z + B.z) / 2; const k = sim.nav.idx(x * .8 + D.x * .2, z * .8 + D.z * .2); return k >= 0 && sim.nav.ok[k] ? { x: sim.nav.cx(k), z: sim.nav.cz(k) } : { x, z }; }
  idleLook(p) { /* parado na preparação: olha levemente em volta */ this.aimYaw = p.m.yaw; this.aimPitch = 0; }

  /* ---------------- percepção ---------------- */
  perceive(sim, p) {
    const m = p.m, W = sim.W, now = sim.t, ex = m.x, ey = m.y + eyeH(m), ez = m.z;
    let best = null, bd = 1e9;
    for (const q of sim.players) {
      if (!q.alive || !sim.isEnemy(p, q)) continue;
      const dx = q.m.x - ex, dz = q.m.z - ez, d = Math.hypot(dx, dz); if (d > this.viewR) continue;
      const ang = Math.abs(angDiff(this.aimYaw, Math.atan2(-dx, -dz)));
      const tracking = this.tgt === q && now - this.seenT < 1.6;
      const near = d < 7;
      if (!(ang < 1.32 || near || tracking)) {
        /* audição: inimigo correndo perto */
        if (q.m.hspd > 5.5 && d < 16 && !q.m.sliding) { this.heard = { x: q.m.x, z: q.m.z, t: now }; }
        continue;
      }
      /* detecção gradual: quanto mais longe/agachado, mais difícil */
      if (!tracking && d > 22) { const hide = (q.m.cr > .5 ? 0.6 : 1) * (q.m.hspd < 1 ? 0.8 : 1); if (Math.random() > clamp(Math.pow(58 / d, 1.2) * hide, 0.05, 1)) continue; }
      if (W.los(ex, ey, ez, q.m.x, q.m.y + 1.3, q.m.z) || W.los(ex, ey, ez, q.m.x, q.m.y + 0.55, q.m.z)) { if (d < bd) { bd = d; best = q; } }
    }
    if (best) {
      if (this.tgt !== best || now - this.seenT > 1.5) { this.firstSeenT = now; this.errScaleT = now; this.reactDone = false; this.burstLeft = 0; this.aimHead = Math.random() < ({ facil: .02, normal: .09, dificil: .2, insano: .36 }[this.lvName] || .1); if (this.holdFor === 'post' || this.role === 'plant') { /* continua */ } }
      this.tgt = best; this.seenT = now; this.last = { x: best.m.x, y: best.m.y, z: best.m.z, vx: best.m.vx, vz: best.m.vz };
    }
    /* sons de tiro / bomba */
    for (const s of sim.sounds) {
      if (s.p === p.id) continue; const o = sim.byId.get(s.p); if (o && !sim.isEnemy(p, o)) continue;
      const d = Math.hypot(s.x - m.x, s.z - m.z); if (d < s.r) { this.heard = { x: s.x, z: s.z, t: now }; }
    }
    if (!this.tgt && this.heard && now - this.heard.t < 0.6 && this.role !== 'carry' && this.role !== 'plant') {
      /* vira na direção do som */
      this.heardLook = Math.atan2(-(this.heard.x - m.x), -(this.heard.z - m.z));
    }
  }

  /* ---------------- combate ---------------- */
  combat(sim, p, c, dt) {
    const m = p.m, q = this.tgt, lv = this.lv, now = sim.t, W = sim.W;
    const dx = q.m.x - m.x, dz = q.m.z - m.z, dy = (q.m.y + 1.28) - (m.y + eyeH(m)), d = Math.hypot(dx, dz);
    this.pickWeapon(sim, p, c, d);
    const w = WEAPONS[p.w];
    /* erro de mira: grande ao ver, assenta com o tempo */
    this.errT -= dt;
    if (this.errT <= 0) {
      this.errT = 0.16; const sc = (0.55 + 1.2 * Math.exp(-(now - this.firstSeenT) / 0.9)) * (0.55 + Math.min(1.4, d / 55)) * (q.m.hspd > 3 ? 1.25 : 1) * this.jit
        * (sim.mode === 'tatico' ? (m.hspd > 3 ? 1.3 : m.cr > .5 ? .85 : 1) * (1 + Math.min(1.2, (p.bloom || 0) * 6)) * (w.type === 'bolt' ? .8 : w.pellets ? 1.1 : 1) : 1);   /* próprio movimento, recuo acumulado e tipo de arma */
      this.errYaw = gauss() * lv.err * DEG * sc * 0.6; this.errPit = gauss() * lv.err * DEG * sc * 0.45;
    }
    /* mira ligeiramente à frente do movimento + cabeça para níveis altos */
    const lead = (d / 90) * 0.5, head = this.aimHead ? 0.4 : 0;
    const tx = q.m.x + q.m.vx * lead, tz = q.m.z + q.m.vz * lead, ty = q.m.y + 1.18 + head;
    this.aimAt(m, tx, ty, tz, dt, this.lv.aim * (now - this.firstSeenT < 0.25 ? 1.6 : 1));
    /* disparo */
    const react = lv.react * this.jit;
    if (!this.reactDone && now - this.firstSeenT >= react) this.reactDone = true;
    const cone = Math.atan2(0.42, Math.max(d, 2)) * 1.25 + 0.006;
    const aimed = this.aimErr < cone;
    const ammoOk = w.type === 'melee' || (p.mag[w.id] | 0) > 0;
    if (this.reactDone && aimed && ammoOk && p.equipT <= 0 && w.type !== 'nade' && w.type !== 'bomb') {
      if (w.type === 'melee') { if (d < w.range - 0.2) c.fire = !p.fireHeld; }
      else if (w.type === 'bolt') {
        c.ads = true; this.adsT += dt; if (this.adsT > 0.3 && p.ads) c.fire = !p.fireHeld && p.cdT <= 0;
      } else if (w.type === 'semi') { c.fire = !p.fireHeld && p.cdT <= 0.01; if (d > 25 && lv.aim > 5) c.ads = true; }
      else {
        if (this.pauseT > 0) this.pauseT -= dt;
        else {
          if (this.burstLeft <= 0) { this.burstLeft = Math.max(2, Math.round((d < 11 ? rnd(8, 16) : d < 28 ? rnd(4, 9) : rnd(2, 5)) * lv.burst)); this.lastMag = p.mag[w.id] | 0; }
          c.fire = true; const mg = p.mag[w.id] | 0; if (mg < this.lastMag) { this.burstLeft -= this.lastMag - mg; this.lastMag = mg; }
          if (this.burstLeft <= 0) { this.pauseT = rnd(0.15, 0.4) / lv.burst * (d > 28 ? 1.8 : 1); }
          if (d > 30 && lv.aim > 5) c.ads = true;
        }
      }
    }
    if (w.type !== 'bolt') this.adsT = 0;
    /* movimento em combate */
    this.strafeT -= dt; if (this.strafeT <= 0) { this.strafeT = rnd(0.45, 1.3); this.strafeDir = Math.random() < .5 ? -1 : 1; this.standT = Math.random() < (d > 14 ? 0.5 : 0.18) ? rnd(.25, .6) : 0; }
    const rl = p.relT > 0, lowhp = p.hp < 32 && sim.mode === 'caos';
    let fwd = 0, side = 0;
    if (this.retreatT > 0 || rl || lowhp) { fwd = -1; side = this.strafeDir * 0.6; this.retreatT -= dt; }
    else if (w.type === 'bolt') { fwd = 0; side = 0; c.crouch = d > 25; }
    else if (w.type === 'melee') { fwd = 1; side = this.strafeDir * 0.5; c.sprint = d > 4; }
    else if (this.standT > 0) { this.standT -= dt; c.crouch = d > 20 && lv.aim > 4; }
    else if (d > 34) { fwd = 0.7; side = 0; }
    else if (d > 12) { side = this.strafeDir; fwd = d > 22 ? 0.3 : 0; }
    else { side = this.strafeDir; fwd = d < 6 ? -0.4 : 0.15; if (lv.aim > 7 && Math.random() < 0.004) c.jump = true; }
    if (p.hp < 28 && sim.mode === 'tatico' && Math.random() < 0.01) this.retreatT = 0.9;
    if (this.role === 'carry' && this.hold && d > 12 && this.retreatT <= 0 && !lowhp) { this.goto(sim, p, c, this.hold.x, this.hold.z, false, dt, true); c.crouch = false; }
    else this.steer(sim, p, c, fwd, side);
    /* recarrega atrás de cobertura virtual */
    if ((p.mag[w.id] | 0) <= 0 && isGun(p.w) && p.relT <= 0) { const alt = BOT_PREF.geral.find(i => i !== p.w && p.own[i] !== undefined && (p.mag[i] | 0) > 0); if (alt && d < 20) this.act(c, 'w:' + alt); else { this.retreatT = 1.2; this.act(c, 'r'); } }
    /* bomba: não planta/desarma sob fogo (soltar botão) */
    c.use = false;
  }
  /** 5x5: arma no chão perto e melhor que a que tem (do mesmo tipo) → vai lá e pega com E (igual jogador) */
  tatPick(sim, p, c, dt) {
    const m = p.m, now = sim.t; if (this.role === 'plant' || (p.hasBomb && sim.inSite && sim.inSite(p)) || (sim.bomb && ((sim.bomb.st === 'planted' && p.team === T_DEF) || (sim.bomb.st === 'dropped' && p.team === T_ATK)))) return false;
    const val = id => (WEAPONS[id] && WEAPONS[id].price) || 0, best = grp => Math.max(0, ...grp.filter(i => p.own[i] !== undefined).map(val));
    let l = this.tLoot; if (l && (!sim.loot.includes(l) || now > this.tLootT)) l = this.tLoot = null;
    if (!l && now >= (this.tLootCd || 0)) {
      this.tLootCd = now + .6; let bs = 0;
      for (const q of sim.loot) { if (q.k !== 'w' || !WEAPONS[q.w] || Math.abs(q.y - m.y) > 2) continue; if (q.cd && q.cd.id === p.id && now < q.cd.t) continue;
        const d = Math.hypot(q.x - m.x, q.z - m.z); if (d > 16) continue; const grp = PRIMARIES.includes(q.w) ? PRIMARIES : SECONDARIES.includes(q.w) ? SECONDARIES : null; if (!grp) continue;
        const gain = val(q.w) - best(grp) - (grp === SECONDARIES ? 150 : 250); if (gain <= 0) continue; const sc = gain - d * 40; if (!l || sc > bs) { bs = sc; l = q; } }
      if (l) { this.tLoot = l; this.tLootT = now + 6; }
    }
    if (!l) return false;
    const d = Math.hypot(l.x - m.x, l.z - m.z);
    if (d < 1.3) { c.use = (sim.tick & 7) < 2; this.lookToward(m, Math.atan2(-(l.x - m.x), -(l.z - m.z)), 0.4, dt, 6); return true; }
    this.goto(sim, p, c, l.x, l.z, true, dt); return true;
  }
  act(c, a) { (c.acts || (c.acts = [])).push(a); }
  pickWeapon(sim, p, c, d) {
    if (p.equipT > 0 || p.relT > 0 || this.nadeUntil > sim.t) return;
    const has = id => p.own[id] !== undefined && ((p.mag[id] | 0) > 0 || (p.ammo[WEAPONS[id].ammo] | 0) > 0);
    let want = p.w;
    if (sim.mode === 'caos') {
      const pref = d > 55 ? BOT_PREF.longe : d > 16 ? BOT_PREF.medio : BOT_PREF.perto;
      want = pref.find(has) || (p.own.faca !== undefined ? 'faca' : p.w);
    } else if (!isGun(p.w) || (p.mag[p.w] | 0) <= 0 && !has(p.w)) {
      want = BOT_PREF.geral.find(has) || 'faca';
    }
    if (want !== p.w && WEAPONS[want]) this.act(c, 'w:' + want);
  }
  quickMaintain(sim, p, c) {
    if (isGun(p.w) && p.relT <= 0 && (p.mag[p.w] | 0) < wMagCap(p, p.w) * 0.5 && (p.ammo[WEAPONS[p.w].ammo] | 0) > 0 && sim.t - this.seenT > 1.2) this.act(c, 'r');
    if (p.w === 'batata' && p.nades <= 0) { const g = BOT_PREF.geral.find(i => p.own[i] !== undefined); if (g) this.act(c, 'w:' + g); }
    if (!p.heal && p.hp < 65 && sim.t - p.lastDmgT > 2.2) { if (sim.mode === 'caos') { const best = p.inv && HEAL_IDS.filter(k => p.inv[k] > 0).sort((a, b) => HEALS[b].amt - HEALS[a].amt)[0]; if (best) this.act(c, 'use:' + best); } else if ((p.pano && p.panoR !== sim.round) || p.caixa) this.act(c, 'h'); }
    if (!isGun(p.w) && p.w !== 'batata' && p.w !== 'mandioca') { const g = BOT_PREF.geral.find(i => p.own[i] !== undefined && sim.mode === 'caos' || (sim.mode === 'tatico' && p.own[i] !== undefined)); if (g && p.equipT <= 0) this.act(c, 'w:' + g); }
  }
  aimAt(m, tx, ty, tz, dt, rate) {
    const ex = m.x, ey = m.y + eyeH(m), ez = m.z, dx = tx - ex, dy = ty - ey, dz = tz - ez, hd = Math.hypot(dx, dz);
    const wy = Math.atan2(-dx, -dz) + this.errYaw, wp = Math.atan2(dy, hd) + this.errPit;
    const k = 1 - Math.exp(-rate * dt), ay = angDiff(this.aimYaw, wy), ap = wp - this.aimPitch, mx = 15 * dt;
    this.aimYaw += clamp(ay * k, -mx, mx); this.aimPitch += clamp(ap * k, -mx, mx);
    this.aimErr = Math.hypot(angDiff(this.aimYaw, Math.atan2(-dx, -dz)) * Math.cos(this.aimPitch), this.aimPitch - Math.atan2(dy, hd));
  }
  lookToward(m, yaw, pitch, dt, rate) { const k = 1 - Math.exp(-(rate || 6) * dt), mx = 9 * dt; this.aimYaw += clamp(angDiff(this.aimYaw, yaw) * k, -mx, mx); this.aimPitch += clamp((pitch || 0) - this.aimPitch, -mx, mx) * k * 1.5; }

  /* ---------------- procurar inimigo perdido ---------------- */
  search(sim, p, c, dt) {
    const m = p.m, L = this.last; if (!L) return;
    const d = Math.hypot(L.x - m.x, L.z - m.z);
    if (d > 4) { this.goto(sim, p, c, L.x, L.z, false, dt); }
    else { this.lookT -= dt; if (this.lookT <= 0) { this.lookT = rnd(.5, 1.1); this.lookDir = -this.lookDir; } this.lookToward(m, this.aimYaw + this.lookDir * 0.9, 0, dt, 4); }
    if (isGun(p.w) && sim.t - this.seenT > 1.5) c.crouch = false;
  }

  /* ---------------- objetivos ---------------- */
  objective(sim, p, c, dt) {
    if (sim.mode === 'tatico') this.objTatico(sim, p, c, dt); else this.objCaos(sim, p, c, dt);
  }
  siteOf(sim, id) { return sim.map.sites[id] || sim.map.sites.A; }
  holdSpot(sim, S, rmin, rmax, needLos) {
    const nav = sim.nav, R = sim.rng;
    for (let t = 0; t < 14; t++) {
      const pt = nav.randomPoint(R, S.x, S.z, rmin, rmax); if (!pt) continue;
      if (!needLos || sim.W.los(pt.x, nav.y[nav.idx(pt.x, pt.z)] + 1.5, pt.z, S.x, sim.W.heightAt(S.x, S.z) + 1, S.z)) return pt;
    }
    return nav.randomPoint(R, S.x, S.z, 2, rmax);
  }
  objTatico(sim, p, c, dt) {
    const m = p.m, b = sim.bomb, now = sim.t;
    if (!this.role) this.planRound(sim, p);
    if (p.team === T_ATK) {
      if (b.st === 'planted') {
        if (this.holdFor !== 'post') { this.holdFor = 'post'; this.hold = this.postSpot(sim, b); }
        this.holdPos(sim, p, c, dt, b);
      } else if (p.hasBomb && !this.goSignal(sim, p)) {
        const st = this.stagePoint(sim);
        if (Math.hypot(m.x - st.x, m.z - st.z) > 4) this.goto(sim, p, c, st.x - 3, st.z, true, dt); else this.watch(sim, p, c, dt, { x: st.x + 40, z: st.z });
      } else if (p.hasBomb) {
        const S = this.siteOf(sim, this.site);
        if (!this.hold || this.holdFor !== 'plant') { this.holdFor = 'plant'; this.hold = nav_pick(sim, S); }
        const inSite = sim.inSite(p);
        if (inSite && Math.hypot(m.x - this.hold.x, m.z - this.hold.z) < 3.2 || (inSite && this.settleT > 0)) {
          this.settleT += dt;
          this.lookToward(m, this.aimYaw + Math.sin(now * 1.3) * 0.3, 0, dt, 3);
          if (this.settleT > 0.5) { c.use = true; this.role = 'plant'; }
        } else { this.settleT = 0; this.role = 'carry'; this.goto(sim, p, c, this.hold.x, this.hold.z, true, dt); }
      } else if (b.st === 'dropped' && this.isNearestAtk(sim, p)) {
        const d = Math.hypot(b.x - m.x, b.z - m.z);
        if (d < 1.5) { c.use = (sim.tick & 7) < 2; this.lookToward(m, this.aimYaw, 0.4, dt); } else this.goto(sim, p, c, b.x, b.z, true, dt);
      } else if (!this.goSignal(sim, p) && this.role !== 'plant') {
        const st = this.stagePoint(sim);
        if (Math.hypot(m.x - st.x, m.z - st.z) > 5) this.goto(sim, p, c, st.x, st.z, true, dt); else this.watch(sim, p, c, dt, { x: st.x + 40, z: st.z });
      } else {
        const S = this.siteOf(sim, this.site);
        if (!this.hold || this.holdFor !== 'push') { this.holdFor = 'push'; this.hold = this.holdSpot(sim, S, 3, 15, true) || { x: S.x, z: S.z }; this.arrived = false; }
        const d = Math.hypot(m.x - this.hold.x, m.z - this.hold.z), ds = Math.hypot(m.x - S.x, m.z - S.z);
        if (!this.siteNade && p.nades > 0 && ds > 8 && ds < 16 && !this.tgt && p.cdT <= 0 && p.equipT <= 0 && Math.random() < lvGren(this)) { this.siteNade = true; this.planNade(sim, p, S.x + rnd(-3, 3), S.z + rnd(-3, 3), sim.W.heightAt(S.x, S.z)); }
        if (d > 2) this.goto(sim, p, c, this.hold.x, this.hold.z, !this.tgt, dt); else this.watch(sim, p, c, dt, S);
      }
      if (this.role === 'plant' && !p.hasBomb) this.role = 'push';
    } else {
      if (b.st === 'planted') {
        const d = Math.hypot(m.x - b.x, m.z - b.z);
        if (d > 1.5) { this.goto(sim, p, c, b.x, b.z, true, dt); }
        else { c.use = true; this.lookToward(m, Math.atan2(-(b.x - m.x), -(b.z - m.z)), 0.5, dt, 8); }
      } else {
        const S = this.siteOf(sim, this.site);
        if (this.role === 'roam') {
          /* rodador segura o meio (entre os sites) em vez de vagar sozinho pelo mapa */
          if (!this.hold || this.holdFor !== 'roam') { this.holdFor = 'roam'; const C = this.midAnchor(sim); this.hold = this.safeSpot(sim, C, 2, 14) || C; this.setThreat(sim, this.hold); }
          if (Math.hypot(m.x - this.hold.x, m.z - this.hold.z) > 2) this.goto(sim, p, c, this.hold.x, this.hold.z, false, dt); else this.watch(sim, p, c, dt, null);
        } else {
          if (!this.hold || this.holdFor !== 'def') { this.holdFor = 'def'; this.hold = this.safeSpot(sim, S, 4, 14) || { x: S.x, z: S.z }; this.setThreat(sim, this.hold); }
          const d = Math.hypot(m.x - this.hold.x, m.z - this.hold.z);
          if (d > 2) this.goto(sim, p, c, this.hold.x, this.hold.z, true, dt); else this.watch(sim, p, c, dt, null);
        }
      }
    }
  }
  stagePoint(sim) {
    const pl = sim.plan; if (pl.stage) return pl.stage;
    const A = sim.map.sites.A, B = sim.map.sites.B, nav = sim.nav, SL = sim.map.stage && sim.map.stage[pl.atk];
    if (SL) { const q = SL[Math.floor(sim.rng.f() * SL.length)], k2 = nav.nearest(q.x, q.z, 20); pl.stage = k2 >= 0 ? { x: nav.cx(k2), z: nav.cz(k2) } : { x: q.x, z: q.z }; return pl.stage; }
    const k = nav.nearest((A.x + B.x) / 2 - 62, (A.z + B.z) / 2, 30);
    pl.stage = k >= 0 ? { x: nav.cx(k), z: nav.cz(k) } : { x: -4, z: 0 }; return pl.stage;
  }
  goSignal(sim, p) {
    const pl = sim.plan; if (pl.go) return true;
    const st = this.stagePoint(sim); let near = 0, tot = 0;
    for (const q of sim.players) if (q.alive && q.team === T_ATK) { tot++; if (Math.hypot(q.m.x - st.x, q.m.z - st.z) < 24) near++; }
    if (near >= Math.ceil(tot * 0.75) || sim.liveT > 42 || sim.bomb.st === 'dropped') pl.go = true;
    return pl.go;
  }
  postSpot(sim, b) {
    const nav = sim.nav;
    for (let t = 0; t < 16; t++) {
      const pt = nav.randomPoint(sim.rng, b.x, b.z, 5, 13); if (!pt) continue;
      if (sim.W.los(pt.x, nav.y[nav.idx(pt.x, pt.z)] + 1.5, pt.z, b.x, b.y + 0.6, b.z)) return pt;
    }
    return nav.randomPoint(sim.rng, b.x, b.z, 3, 10) || { x: b.x, z: b.z };
  }
  holdPos(sim, p, c, dt, b) {
    const m = p.m, h = this.hold; if (!h) return;
    if (Math.hypot(m.x - h.x, m.z - h.z) > 2.2) this.goto(sim, p, c, h.x, h.z, !this.tgt, dt);
    else { this.watch(sim, p, c, dt, { x: b.x, z: b.z }); c.crouch = !this.tgt && (sim.tick % 300) < 200 && this.lv.aim > 4; }
  }
  watch(sim, p, c, dt, S) {
    const m = p.m, now = sim.t; this.lookT -= dt;
    if (this.heardLook !== undefined && sim.t - (this.heard ? this.heard.t : -9) < 1.4) { this.lookToward(m, this.heardLook, 0, dt, 5); return; }
    if (this.lookT <= 0) { this.lookT = rnd(1.0, 2.4); this.lookYaw = !S && this.threatYaw !== undefined && this.threatFor === this.hold ? this.threatYaw + rnd(-.3, .3) : S ? Math.atan2(-(S.x - m.x), -(S.z - m.z)) + rnd(-1.0, 1.0) : this.aimYaw + rnd(-1.2, 1.2); }
    this.lookToward(m, this.lookYaw === undefined ? this.aimYaw : this.lookYaw, 0, dt, 3.5);
  }
  isNearestAtk(sim, p) {
    const b = sim.bomb; let bd = 1e9, bp = null;
    for (const q of sim.players) { if (!q.alive || q.team !== T_ATK) continue; const d = Math.hypot(q.m.x - b.x, q.m.z - b.z); if (q.bot ? true : false) { /* humanos também competem */ } if (d < bd) { bd = d; bp = q; } }
    if (bp === p) return true;
    /* se o mais próximo é humano, bots não disputam — a menos que esteja longe */
    return bp && !bp.bot ? false : bp === p;
  }

  /* ---------------- caos ---------------- */
  objCaos(sim, p, c, dt) {
    const m = p.m, z = sim.zone, now = sim.t;
    let gx = null, gz = null, kind = '';
    const outside = z && Math.hypot(m.x - z.cx, m.z - z.cz) > z.r - 6;
    const shrinking = z && (z.state === 'shrink' || z.state === 'final' || (z.state === 'wait' && z.t > ZONE_STAGES[Math.max(0, z.stage)].wait - 12));
    if (z && (outside || (shrinking && Math.hypot(m.x - z.tcx, m.z - z.tcz) > z.tr - 10))) { const tx = z.state === 'shrink' || z.state === 'final' ? z.tcx : z.cx, tz = z.state === 'shrink' || z.state === 'final' ? z.tcz : z.cz; gx = tx + rnd(-4, 4); gz = tz + rnd(-4, 4); kind = 'zone'; }
    else {
      this.lootT -= dt;
      if (!this.lootTarget || !sim.loot.includes(this.lootTarget) || this.lootT <= 0) { this.lootTarget = this.pickLoot(sim, p); this.lootT = 6; }
      const l = this.lootTarget;
      if (l) { gx = l.x; gz = l.z; kind = 'loot'; }
      else { if (!this.wander || Math.hypot(m.x - this.wander.x, m.z - this.wander.z) < 3) this.wander = sim.nav.randomPoint(sim.rng, z ? z.cx : 0, z ? z.cz : 0, 0, z ? Math.max(10, z.r * 0.8) : 80); if (this.wander) { gx = this.wander.x; gz = this.wander.z; } kind = 'wander'; }
    }
    if (gx === null) return;
    const d = Math.hypot(gx - m.x, gz - m.z);
    if (kind === 'loot' && d < 1.6) { c.use = (sim.tick & 7) < 2; if (!sim.loot.includes(this.lootTarget)) this.lootTarget = null; return; }
    this.goto(sim, p, c, gx, gz, true, dt);
  }
  pickLoot(sim, p) {
    let best = null, bs = -1e9; const m = p.m;
    const guns = BOT_PREF.geral.filter(i => p.own[i] !== undefined).length;
    const prim = PRIMARIES.filter(i => p.own[i] !== undefined), worst = prim.length ? Math.min(...prim.map(i => p.own[i] | 0)) : 0;
    for (const l of sim.loot) {
      const d = Math.hypot(l.x - m.x, l.z - m.z); if (d > 90) continue; if (l.cd && l.cd.id === p.id && sim.t < l.cd.t) continue;
      let v = 0; if (l.k === 'chestO') continue;
      if (l.k === 'chest') v = 85;   /* baú vale muito: tem arma melhor e itens */
      else if (l.k === 'w') {
        if (p.own[l.w] !== undefined) v = l.tier > p.own[l.w] ? 40 + l.tier * 10 : 0;                          /* só vale se for melhoria */
        else if (PRIMARIES.includes(l.w) && prim.length >= 2) v = l.tier > worst ? 18 + (l.tier - worst) * 14 : 0;   /* mochila cheia de armas: só troca por uma melhor */
        else v = (guns < 2 ? 70 : 28) + l.tier * 12;
        if (v <= 0) continue;
      }
      else if (l.k === 'a') v = 22 + ((p.ammo[l.w] | 0) < 20 ? 25 : 0);
      else if (l.k === 'heal') v = sim.invCount(p) < 4 ? 38 : 12; else if (l.k === 'vest') v = l.tier > p.vest ? 45 + l.tier * 8 : 0; else if (l.k === 'helm') v = l.tier > p.helm ? 35 : 0;
      else if (l.k === 'pack') v = l.tier > p.pack ? 20 : 0; else if (l.k === 'nade') v = p.nades < 2 ? 25 : 8; else v = 25;
      const s = v - d * 0.6; if (s > bs) { bs = s; best = l; }
    }
    return best;
  }

  /* ---------------- navegação ---------------- */
  goto(sim, p, c, gx, gz, run, dt, noLook) {
    const nav = sim.nav, m = p.m;
    if (Math.hypot(gx - this.gx, gz - this.gz) > 3 || (!this.path && this.pathAge > 1.2) || this.pathAge > 7) {
      if (sim.pathBudget > 0) {
        sim.pathBudget--; this.path = nav.findPath(m.x, m.z, gx, gz); this.pi = 1; this.gx = gx; this.gz = gz; this.pathAge = 0; this.noPath = !this.path;
      }
    }
    let wx = gx, wz = gz;
    if (this.path && this.path.length) {
      while (this.pi < this.path.length - 1 && Math.hypot(this.path[this.pi].x - m.x, this.path[this.pi].z - m.z) < 1.15) this.pi++;
      const wp = this.path[Math.min(this.pi, this.path.length - 1)]; wx = wp.x; wz = wp.z;
    } else if (this.noPath) { /* sem rota: tenta direto */ }
    const dx = wx - m.x, dz = wz - m.z, d = Math.hypot(dx, dz);
    if (d < 0.35) return;
    const yaw = Math.atan2(-dx, -dz);
    const near = this.tgt && sim.t - this.seenT < 2;
    if (!noLook) this.lookToward(m, yaw, 0, dt, near ? 3 : 7);
    let fx = dx / d, fz = dz / d;
    /* separação entre bots */
    for (const q of sim.players) { if (q === p || !q.alive) continue; const ox = m.x - q.m.x, oz = m.z - q.m.z, od = Math.hypot(ox, oz); if (od < 1.3 && od > 0.01 && Math.abs(q.m.y - m.y) < 1.5) { fx += ox / od * 0.6; fz += oz / od * 0.6; } }
    const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
    const sn = Math.sin(this.aimYaw), cs = Math.cos(this.aimYaw);
    c.mvf = -(fx * sn + fz * cs); c.mvr = fx * cs - fz * sn;
    c.sprint = !!run && !near;
    /* destravar */
    this.lchk += dt;
    if (this.lchk >= 0.6) {
      const mv = Math.hypot(m.x - this.lx, m.z - this.lz); this.lx = m.x; this.lz = m.z; this.lchk = 0;
      if (mv < 0.3) { this.stuckT += 0.6; } else this.stuckT = Math.max(0, this.stuckT - 1);
      if (this.stuckT >= 1.2) { this.unstick = 0.7; this.unstickDir = Math.random() < .5 ? -1 : 1; this.pathAge = 99; this.stuckT = 0.6; if (this.stuckT > 3) { this.hold = null; } }
    }
    if (this.unstick > 0) { this.unstick -= dt; c.mvr = this.unstickDir; c.mvf = 0.4; c.jump = true; c.sprint = false; }
    else if (m.gnd && d < 2.2 && c.mvf < -0.3) { /* nada */ }
  }
  /* mover em relação à mira (combate) com colisão por rota livre */
  steer(sim, p, c, fwd, side) {
    c.mvf = fwd; c.mvr = side;
    /* evita despencar/entrar na água profunda e parede imediata: sonda 1.6 m */
    const m = p.m, sn = Math.sin(this.aimYaw), cs = Math.cos(this.aimYaw);
    const wx = -sn * fwd + cs * side, wz = -cs * fwd - sn * side, wl = Math.hypot(wx, wz);
    if (wl > 0.01) {
      const px = m.x + wx / wl * 1.5, pz = m.z + wz / wl * 1.5;
      if (!sim.nav.walkable(px, pz)) { c.mvf = -fwd * 0.5; c.mvr = -side; }
    }
  }

  /* ---------------- granadas ---------------- */
  maybeNade(sim, p, c) {
    const now = sim.t, lv = this.lv; this.nadeCd = now + 0.35;
    if (p.cdT > 0 || p.relT > 0 || p.throwT > 0 || p.equipT > 0) return;
    let tx = null, tz = null, ty = 0;
    if (this.tgt && this.tgt.alive && now - this.seenT < 4 && this.last) { tx = this.last.x + this.last.vx * 0.5; tz = this.last.z + this.last.vz * 0.5; ty = this.last.y; }
    else if (this.heard && now - this.heard.t < 3 && sim.mode === 'tatico' && sim.bomb.st === 'planted' && p.team === T_ATK) { tx = this.heard.x; tz = this.heard.z; ty = sim.W.heightAt(tx, tz); }
    if (tx === null) return;
    const d = Math.hypot(tx - p.m.x, tz - p.m.z);
    if (d < 6.5 || d > 17) { this.nadeCd = now + 1.5; return; }
    this.nadeCd = now + rnd(7, 15);
    if (Math.random() > lv.grenade) return;
    this.planNade(sim, p, tx, tz, ty);
  }
  planNade(sim, p, tx, tz, ty) {
    const m = p.m, now = sim.t, d = Math.hypot(tx - m.x, tz - m.z);
    const v = WEAPONS.batata.throwV, g = SIMC.NADE_G, y0 = m.y + eyeH(m), dy = ty + 0.2 - y0;
    let bestA = 0.6, bestE = 1e9;
    for (let a = 0.08; a < 1.0; a += 0.03) {
      const vx = v * Math.cos(a), vy = v * Math.sin(a) + 1.2, disc = vy * vy + 2 * g * -dy; if (disc < 0) continue;
      const t = (vy + Math.sqrt(disc)) / g, x = vx * t, e = Math.abs(x - d); if (e < bestE) { bestE = e; bestA = a; }
    }
    if (bestE > 2.5) return false;
    const yaw = Math.atan2(-(tx - m.x), -(tz - m.z)), f = aimVec(yaw, bestA, { x: 0, y: 0, z: 0 });
    if (sim.W.raycast(m.x, y0, m.z, f.x, f.y, f.z, Math.min(5, d * 0.5), true)) return false;
    this.nadeAim = { yaw, pitch: bestA - 0.14 }; this.nadeUntil = now + 1.25; this.nadeStage = 0; return true;
  }
  doNade(sim, p, c, dt) {
    const a = this.nadeAim; if (!a) { this.nadeUntil = 0; return; }
    this.aimYaw += clamp(angDiff(this.aimYaw, a.yaw), -9 * dt, 9 * dt); this.aimPitch += clamp(a.pitch - this.aimPitch, -6 * dt, 6 * dt);
    if (this.nadeStage === 0) { this.act(c, 'g'); this.nadeStage = 1; }
    if (this.nadeStage === 1 && p.throwT > 0) this.nadeStage = 2;
  }
  avoidNades(sim, p, c) {
    const m = p.m;
    for (const n of sim.nades) {
      const d = Math.hypot(n.x - m.x, n.z - m.z); if (d < 6.5 && n.fuse < 1.6) {
        const dx = m.x - n.x, dz = m.z - n.z, l = Math.hypot(dx, dz) || 1, sn = Math.sin(this.aimYaw), cs = Math.cos(this.aimYaw), fx = dx / l, fz = dz / l;
        c.mvf = -(fx * sn + fz * cs); c.mvr = fx * cs - fz * sn; c.sprint = true; c.use = false; return;
      }
    }
  }
}
const lvGren = b => Math.min(1, b.lv.grenade + 0.35);
function nav_pick(sim, S) {
  /* ponto de plantio: dentro do retângulo do site, afastado das bordas */
  const nav = sim.nav;
  for (let t = 0; t < 14; t++) { const x = S.x0 + 3 + sim.rng.f() * (S.x1 - S.x0 - 6), z = S.z0 + 3 + sim.rng.f() * (S.z1 - S.z0 - 6); if (nav.walkable(x, z)) return { x, z }; }
  return { x: S.x, z: S.z };
}
