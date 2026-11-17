/* =====================================================================
   41_rules.js — regras: partida, rodadas, bomba (mandioca), loot, zona
   ===================================================================== */
'use strict';
const ZONE_STAGES = [
  { wait: 80, shrink: 45, f: 0.62, dps: 1.5 }, { wait: 45, shrink: 35, f: 0.4, dps: 3 },
  { wait: 35, shrink: 30, f: 0.22, dps: 5.5 }, { wait: 25, shrink: 25, f: 0.1, dps: 9 }, { wait: 18, shrink: 20, f: 0.035, dps: 14 }
];
const LOOT_W = [['w', 28], ['a', 24], ['heal', 20], ['vest', 7], ['helm', 6], ['pack', 4], ['sp', 4], ['nade', 7]];
const LOOT_WEAPONS = [['galho', 24], ['estilingue', 22], ['colher', 20], ['porteira', 16], ['vassoura', 9], ['faca', 9]];

function wpick(rng, list) { let s = 0; for (const e of list) s += e[1]; let r = rng.f() * s; for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; } return list[0][0]; }

Object.assign(Sim.prototype, {
  /* ---------- partida ---------- */
  startMatch() {
    const hum = this.players.filter(p => !p.bot);
    /* equilibra esquadrões entre humanos */
    const cnt = [0, 0];
    /* revanche: quem já tinha equipe continua nela; os demais equilibram */
    for (const p of hum) if (p.fixSq === 0 || p.fixSq === 1) { p.squad = p.fixSq; cnt[p.fixSq]++; }
    for (const p of hum) { if (p.fixSq === 0 || p.fixSq === 1) continue; const s = cnt[0] < cnt[1] ? 0 : cnt[1] < cnt[0] ? 1 : (this.rng.chance(.5) ? 0 : 1); p.squad = s; cnt[s]++; }
    this.fillBots(); this.initFarmers();
    this.weather = this.mode === 'tatico' ? this.rng.pick([0, 0, 0, 0, 1, 2]) : this.rng.pick([0, 0, 0, 0, 0, 1, 1, 2]);   /* tempo bom na maioria das partidas; neblina e tempestade não entram no BR (visibilidade da queda) */
    this.score = [0, 0]; this.round = 0; this.over = false; this.winner = null; this.matchDone = false; this.matchT = 0; this.draw = false;
    if (this.mode === 'tatico') { const F = TAT_FORMATS[this.cfg.format] || TAT_FORMATS.comp; this.cfg.format = F === TAT_FORMATS.curto ? 'curto' : 'comp'; this.cfg.rounds = F.rounds; this.cfg.ot = F.ot; }
    this.lossStreak = [0, 0]; this.mvp = {};
    for (const p of this.players) { p.mvps = 0; p.k = p.d = p.a = p.hs = p.dmg = p.plants = p.defuses = p.score = 0; p.place = 0; p.money = ECON.start; p.survived = false; p.shots = 0; p.hits = 0; }
    if (this.mode === 'tatico' && this.cfg.select) this.beginSelect(); else { if (this.mode === 'tatico') this.barrier = computeBarrier(this.map, this.nav); this.startRound(); }
  },
  fillBots() {
    if (!this.cfg.fill) return;
    const used = new Set(this.players.map(p => p.name)), names = BOT_NAMES.filter(n => !used.has(n));
    for (let i = names.length - 1; i > 0; i--) { const j = this.rng.int(0, i); const t = names[i]; names[i] = names[j]; names[j] = t; }
    const add = sq => this.addPlayer({ name: names.pop() || ('Peão' + this.nextId), skin: this.rng.int(0, SKINS.length - 1), bot: true, squad: sq });
    if (this.mode === 'tatico') {
      const per = clamp(this.cfg.perTeam | 0, 3, this.M.max / 2);
      for (const sq of [0, 1]) { let n = this.players.filter(p => p.squad === sq).length; while (n < per) { add(sq); n++; } }
    } else {
      const total = clamp(this.cfg.total || 12, this.players.length, this.M.max);
      while (this.players.length < total) add(0);
    }
  },
  startRound() {
    this.round++; this.nades.length = 0; this.loot.length = 0; this.lootVer = (this.lootVer | 0) + 1;
    const R = this.cfg.rounds | 0, prevSwap = this.swap | 0;
    this.swap = this.mode !== 'tatico' ? 0 : this.round <= R ? (this.round > R / 2 ? 1 : 0) : (((this.round - R - 1) % (this.cfg.ot || 6)) >= (this.cfg.ot || 6) / 2 ? 1 : 0);
    const sideChange = this.mode === 'tatico' && this.round > 1 && this.swap !== prevSwap;
    this.firstOfHalf = this.round === 1 || sideChange;
    const idx = [0, 0, 0];
    if (sideChange) { for (const p of this.players) p.money = ECON.start; this.lossStreak = [0, 0]; }   /* troca de lados: economia zera (estilo CS) */
    this.bomb = { st: 'none', x: 0, y: 0, z: 0, carrier: 0, timer: 0, site: '', lockT: 0, dchk: 0, defBy: 0, planter: 0, beep: 0 };
    this.clockOn = true; this.endInfo = null;
    let i = 0;
    for (const p of this.players) {
      const keep = this.mode === 'tatico' && p.survived && !sideChange && p.alive;
      p.team = this.teamOf(p); p.alive = true; p.hp = SIMC.HP; p.dmgBy = {}; p.useT = 0; p.useK = ''; p.useLock = false; p.lastDmgT = -99; p.healT = 0; p.heal = null; p.shotsRun = 0; p.multi = 0; p.roundK = 0; p.roundDmg = 0; p.roundObj = 0; p.breath = 10; p.boughtR = {};
      this.loadout(p, keep); p.survived = false;
      const s = this.spawnPoint(p, this.mode === 'tatico' ? idx[p.team]++ : i++);
      this.placeAt(p, s);
      if (p.ai) p.ai.reset(this, p);
    }
    if (this.mode === 'tatico') {
      const atk = this.players.filter(p => p.team === T_ATK);
      if (atk.length) { const c = this.rng.pick(atk); c.hasBomb = true; this.bomb.st = 'carried'; this.bomb.carrier = c.id; }
      this.zone = null; this.teamBuys = { 1: {}, 2: {} }; this.clearAbilities(); for (const p of this.players) this.refillAbilities(p);
    } else this.initCaos();
    this.setPhase('prep'); this.pt = this.mode === 'tatico' ? (this.round === 1 ? (this.cfg.buy1 || FLOW_T.buy1) : (this.cfg.buy || FLOW_T.buy)) : this.M.prep;   /* compra inicial 70 s; demais 15 s */
    if (this.mode === 'tatico') this.emit({ t: 'flow', s: 'buy', pt: this.pt, first: this.round === 1 ? 1 : 0 });
    if (this.mode === 'tatico') for (const p of this.players) if (p.bot) this.botBuy(p);   /* bots compram já com a loja aberta */
    this.emit({ t: 'round', n: this.round, sw: this.swap, half: sideChange ? 1 : 0, ot: this.round > (this.cfg.rounds | 0) ? 1 : 0 });
  },
  stepPhase(dt) {
    switch (this.phase) {
      case 'select': this.stepSelect(dt); break;
      case 'loading': this.stepLoading(dt); break;
      case 'prep': this.pt -= dt; this.liveT = 0; if (this.pt <= 0) { this.setPhase('live'); this.pt = this.mode === 'tatico' ? this.M.roundTime : 0; this.emit({ t: 'live' }); } break;
      case 'live': this.liveT = (this.liveT || 0) + dt; if (this.mode === 'tatico') { if (this.clockOn) this.pt = Math.max(0, this.pt - dt); } else this.pt += dt; break;
      case 'post': this.pt -= dt; if (this.pt <= 0) { if (this.matchDone) { this.setPhase('over'); this.over = true; this.emit({ t: 'over', w: this.winner }); } else this.startRound(); } break;
    }
  },
  stepRules(dt) {
    if (this.phase !== 'live') return;
    if (this.mode === 'tatico') this.rulesTatico(dt); else this.rulesCaos(dt);
  },

  /* ---------- tático: rodadas + bomba ---------- */
  rulesTatico(dt) {
    const b = this.bomb;
    if (b.lockT > 0) b.lockT -= dt;
    if (b.defBy) { const d = this.byId.get(b.defBy); if (!d || !d.alive || d.useK !== 'defuse') b.defBy = 0; }
    if (b.st === 'planted') { b.timer -= dt; if (b.timer <= 0) { this.explodeBomb(); return; } }
    let atk = 0, def = 0;
    for (const p of this.players) if (p.alive) { if (p.team === T_ATK) atk++; else def++; }
    if (atk === 0 && def === 0) this.endRound(b.st === 'planted' ? T_ATK : T_DEF, 'elim');
    else if (def === 0) this.endRound(T_ATK, 'elim');
    else if (atk === 0 && b.st !== 'planted') this.endRound(T_DEF, 'elim');
    else if (b.st !== 'planted' && this.pt <= 0) this.endRound(T_DEF, 'time');
  },
  endRound(winTeam, reason) {
    if (this.phase !== 'live') return;
    const ws = winTeam === T_ATK ? this.swap : this.swap ^ 1;
    this.score[ws]++;
    /* economia: vitória (objetivo vale mais), derrota com bônus progressivo, atacantes que plantaram e perderam ganham bônus */
    const ls = ws ^ 1, obj = reason === 'boom' || reason === 'defuse';
    const lossPay = Math.min(ECON.lossMax, ECON.loss + ECON.lossStep * Math.min(4, this.lossStreak[ls]));
    this.lossStreak[ls] = Math.min(4, this.lossStreak[ls] + 1); this.lossStreak[ws] = Math.max(0, this.lossStreak[ws] - 1);
    for (const p of this.players) {
      if (p.team === winTeam) p.score += p.alive ? 200 : 100;
      this.addMoney(p, p.team === winTeam ? (obj ? ECON.winObj : ECON.win) : lossPay + (p.team === T_ATK && this.bomb.st !== 'none' && this.bomb.planted ? ECON.plantTeam : 0));
      p.survived = p.alive;
    }
    /* MVP da rodada: mais abates; desempate por dano e objetivo */
    let mvp = null, mv = -1; for (const p of this.players) if (p.team === winTeam) { const v = (p.roundK | 0) * 100 + (p.roundDmg | 0) * .2 + (p.roundObj | 0) * 120; if (v > mv) { mv = v; mvp = p; } }
    if (mvp) { this.mvp[mvp.id] = (this.mvp[mvp.id] | 0) + 1; mvp.mvps = (mvp.mvps | 0) + 1; }
    this.setPhase('post'); this.pt = this.M.endDelay;
    /* formato competitivo: vence quem chegar a metade+1; troca na metade; empate → blocos de prorrogação (metade de cada lado, quem fizer metade+1 do bloco) */
    const R = this.cfg.rounds | 0, OT = this.cfg.ot || 6, need = R / 2 + 1, s0 = this.score[0], s1 = this.score[1];
    let halftime = false;
    if (this.round <= R) {
      if (s0 >= need || s1 >= need) { this.matchDone = true; this.winner = s0 > s1 ? 0 : 1; this.pt = this.M.endDelay + 2; }
      else if (this.round === R / 2 || this.round === R) { halftime = true; this.pt = this.M.endDelay + 4; }
    } else {
      const k = this.round - R, blk = Math.ceil(k / OT), base = R / 2 + (blk - 1) * OT / 2, goal = base + OT / 2 + 1;
      if (s0 >= goal || s1 >= goal) { this.matchDone = true; this.winner = s0 > s1 ? 0 : 1; this.pt = this.M.endDelay + 2; }
      else if (k % OT === 0 && blk >= 4) { this.matchDone = true; this.winner = -1; this.draw = true; this.pt = this.M.endDelay + 2; }
      else if (k % OT === OT / 2 || k % OT === 0) { halftime = true; this.pt = this.M.endDelay + 4; }
    }
    this.halftime = halftime;
    this.endInfo = { round: this.round, winTeam, winSquad: ws, reason };
    this.emit({ t: 'rend', n: this.round, wt: winTeam, ws, why: reason, sc: this.score.slice(), md: this.matchDone ? 1 : 0, wn: this.winner, half: halftime ? 1 : 0, ot: this.round >= R && !this.matchDone ? 1 : 0, mvp: mvp ? mvp.id : '', lp: lossPay });
  },
  inSite(p) {
    const m = p.m;
    for (const k in this.map.sites) { const S = this.map.sites[k]; if (m.x >= S.x0 && m.x <= S.x1 && m.z >= S.z0 && m.z <= S.z1) return S; }
    return null;
  },
  distBomb(p) { const b = this.bomb; return Math.hypot(p.m.x - b.x, p.m.z - b.z) + Math.abs((p.m.y + 0.5) - b.y) * 0.5; },
  cancelUse(p) {
    if (p.useK === 'defuse') { const half = this.M.defuseTime * 0.5; this.bomb.dchk = p.useT >= half ? half : 0; if (this.bomb.defBy === p.id) this.bomb.defBy = 0; }
    if (p.useK) this.emit({ t: 'bomb', k: 'cancel', p: p.id });
    p.useK = ''; p.useT = 0;
  },
  handleUse(p, c, dt) {
    const edge = c.use && !p.useHeld; p.useHeld = c.use;
    if (!c.use) p.useLock = false;
    if (this.phase !== 'live') { if (p.useK) { p.useK = ''; p.useT = 0; } return; }
    if (this.mode === 'caos') { if (edge) this.tryPickup(p); if (((this.tick + p.id.length) & 7) === 0) this.autoPickup(p); return; }
    const b = this.bomb, M = this.M;
    if (p.useK === 'plant') {
      if (!c.use || !p.hasBomb || !p.m.gnd || !this.inSite(p) || b.st !== 'carried') this.cancelUse(p);
      else { p.useT += dt; if (p.useT >= p.useMax) this.plantBomb(p); }
      return;
    }
    if (p.useK === 'defuse') {
      if (!c.use || b.st !== 'planted' || this.distBomb(p) > SIMC.USE_R + 0.4 || (b.defBy && b.defBy !== p.id)) this.cancelUse(p);
      else { p.useT += dt; if (p.useT >= p.useMax) this.defuseBomb(p); }
      return;
    }
    if (!c.use || p.useLock) return;
    if (p.team === T_ATK) {
      if (b.st === 'dropped' && edge && b.lockT <= 0 && this.distBomb(p) <= SIMC.PICK_R) { this.pickBomb(p); p.useLock = true; return; }
      if (p.hasBomb && b.st === 'carried' && p.m.gnd && p.m.mant <= 0) {
        const S = this.inSite(p);
        if (S) { p.useK = 'plant'; p.useT = 0.0001; p.useMax = M.plantTime; p.ads = false; this.nextSounds.push({ x: p.m.x, z: p.m.z, p: p.id, r: 26 }); this.emit({ t: 'bomb', k: 'plantStart', p: p.id, site: S.id }); }
      }
    } else if (p.team === T_DEF) {
      if (b.st === 'planted' && !b.defBy && this.distBomb(p) <= SIMC.USE_R && p.m.gnd) {
        p.useK = 'defuse'; p.useT = b.dchk + 0.0001; p.useMax = M.defuseTime; b.defBy = p.id; p.ads = false; this.emit({ t: 'bomb', k: 'defStart', p: p.id });
      }
    }
  },
  pickBomb(p) {
    const b = this.bomb; b.st = 'carried'; b.carrier = p.id; p.hasBomb = true;
    this.emit({ t: 'bomb', k: 'pick', p: p.id });
  },
  dropBomb(p, onDeath) {
    const b = this.bomb; if (!p.hasBomb) return;
    p.hasBomb = false; b.st = 'dropped'; b.carrier = 0; b.lockT = onDeath ? 0.3 : 0.9;
    const f = aimVec(p.m.yaw, 0, { x: 0, y: 0, z: 0 }); let d = onDeath ? 0 : 0.95, x = p.m.x + f.x * d, z = p.m.z + f.z * d;
    if (d && this.W.solidAt(x, p.m.y + 0.5, z)) { x = p.m.x; z = p.m.z; }
    b.x = x; b.z = z; b.y = Math.max(this.floorY(x, z, p.m.y + 0.3), p.m.y - 0.3);
    if (p.w === 'mandioca') { const g = ownedSlots(p).find(i => isGun(i)) || 'faca'; switchWeapon(p, g, null); }
    if (p.useK === 'plant') this.cancelUse(p);
    this.emit({ t: 'bomb', k: 'drop', p: p.id, x: r2(b.x), y: r2(b.y), z: r2(b.z), d: onDeath ? 1 : 0 });
  },
  plantBomb(p) {
    const b = this.bomb, S = this.inSite(p), f = aimVec(p.m.yaw, 0, { x: 0, y: 0, z: 0 });
    let x = p.m.x + f.x * 0.55, z = p.m.z + f.z * 0.55; if (this.W.solidAt(x, p.m.y + 0.4, z)) { x = p.m.x; z = p.m.z; }
    b.st = 'planted'; b.planted = true; p.roundObj = (p.roundObj | 0) + 1; b.x = x; b.z = z; b.y = Math.max(this.floorY(x, z, p.m.y + 0.3), p.m.y - 0.2); b.timer = this.M.bombTime; b.site = S ? S.id : '?'; b.planter = p.id; b.carrier = 0; b.dchk = 0; b.defBy = 0;
    p.hasBomb = false; p.plants++; p.score += 250; p.useK = ''; p.useT = 0; this.addMoney(p, ECON.plant);
    if (p.w === 'mandioca') { const g = ownedSlots(p).find(i => isGun(i)) || 'faca'; switchWeapon(p, g, null); }
    this.clockOn = false;
    this.emit({ t: 'bomb', k: 'plant', p: p.id, site: b.site, x: r2(b.x), y: r2(b.y), z: r2(b.z) });
  },
  defuseBomb(p) {
    const b = this.bomb; b.st = 'defused'; p.roundObj = (p.roundObj | 0) + 1; p.defuses++; p.score += 250; p.useK = ''; p.useT = 0; b.defBy = 0; this.addMoney(p, ECON.defuse);
    this.emit({ t: 'bomb', k: 'defuse', p: p.id });
    this.endRound(T_DEF, 'defuse');
  },
  explodeBomb() {
    const b = this.bomb; b.st = 'exploded'; b.timer = 0;
    this.explode(b.x, b.y + 0.5, b.z, 30, 480, this.byId.get(b.planter) || null, 'mandioca', 2, true);
    this.emit({ t: 'bomb', k: 'boom', x: r2(b.x), y: r2(b.y), z: r2(b.z) });
    this.endRound(T_ATK, 'boom');
  },

  /* ---------- caos no galinheiro ---------- */
  initCaos() {
    const B = this.map.bounds, R0 = Math.hypot((B.x1 - B.x0) / 2, (B.z1 - B.z0) / 2) * 1.0;
    this.zone = { cx: (B.x0 + B.x1) / 2, cz: (B.z0 + B.z1) / 2, r: R0, tcx: 0, tcz: 0, tr: R0, t: 0, stage: -1, dps: 0, state: 'wait', fromR: R0, fromX: 0, fromZ: 0, acc: 0 };
    this.zone.tcx = this.zone.cx; this.zone.tcz = this.zone.cz; this.zone.R0 = R0;
    this.nextZoneStage();
    this.spawnLoot(); this.deadOrder = 0; this.initCow();
  },
  nextZoneStage() {
    const z = this.zone; z.stage++;
    if (z.stage >= ZONE_STAGES.length) { z.state = 'final'; z.dps = 12; return; }
    const S = ZONE_STAGES[z.stage]; z.tr = z.R0 * S.f; const room = Math.max(0, z.r - z.tr) * 0.8, a = this.rng.f() * TAU, d = Math.sqrt(this.rng.f()) * room, B = this.map.bounds;
    z.tcx = clamp(z.cx + Math.cos(a) * d, B.x0 + 20, B.x1 - 20); z.tcz = clamp(z.cz + Math.sin(a) * d, B.z0 + 20, B.z1 - 20);
    z.state = 'wait'; z.t = 0; z.dps = S.dps; this.emit({ t: 'zone', st: z.stage, k: 'wait' });
  },
  rulesCaos(dt) {
    const z = this.zone;
    this.stepCow(dt);
    if (z && z.state !== 'final') {
      z.t += dt; const S = ZONE_STAGES[z.stage];
      if (z.state === 'wait' && z.t >= S.wait) { z.state = 'shrink'; z.t = 0; z.fromR = z.r; z.fromX = z.cx; z.fromZ = z.cz; this.emit({ t: 'zone', st: z.stage, k: 'shrink' }); }
      else if (z.state === 'shrink') {
        const f = sat(z.t / S.shrink); z.r = lerp(z.fromR, z.tr, f); z.cx = lerp(z.fromX, z.tcx, f); z.cz = lerp(z.fromZ, z.tcz, f);
        if (f >= 1) this.nextZoneStage();
      }
    }
    if (z) {
      z.acc += dt;
      if (z.acc >= 0.5) {
        z.acc = 0;
        for (const p of this.players) if (p.alive && Math.hypot(p.m.x - z.cx, p.m.z - z.cz) > z.r) this.damage(p, null, z.dps * 0.5, 'zona', 'body', p.m.x, p.m.y + 1, p.m.z, { raw: true });
      }
    }
    /* loot que reaparece raramente */
    if (((this.tick) % 600) === 0 && this.loot.length < 160) { const l = this.makeLoot(); if (l) { this.loot.push(l); this.lootVer++; } }
    const al = this.players.filter(p => p.alive);
    if (al.length <= 1 || this.pt > 1200) {
      let w = al[0] || null;
      if (!w) { w = this.players.slice().sort((a, b) => b.dieT - a.dieT)[0] || null; }
      if (w) { w.place = 1; w.score += 500; }
      this.setPhase('post'); this.pt = this.M.endDelay; this.matchDone = true; this.winner = w ? w.id : '';
      this.emit({ t: 'rend', n: 1, wn: this.winner, why: 'last', md: 1 });
    }
  },
  makeLoot(pos) {
    const W = this.W, B = this.map.bounds, r = this.rng;
    let x, z, ok = false;
    const hot = this.map.regions ? this.map.regions.concat([{ x: 58, z: -46 }, { x: 58, z: 46 }, { x: 104, z: 0 }, { x: -28, z: -18 }, { x: 24, z: 10 }, { x: -112, z: 0 }, { x: -44, z: 62 }]) : null;
    for (let k = 0; k < 40; k++) {
      if (hot && r.chance(.6)) { const h = r.pick(hot), a = r.f() * TAU, d = Math.sqrt(r.f()) * 26; x = clamp(h.x + Math.cos(a) * d, B.x0 + 6, B.x1 - 6); z = clamp(h.z + Math.sin(a) * d, B.z0 + 6, B.z1 - 6); }
      else { x = r.range(B.x0 + 6, B.x1 - 6); z = r.range(B.z0 + 6, B.z1 - 6); }
      if (W.waterDepth(x, z) > 0.05 || W.solidAt(x, W.heightAt(x, z) + 0.4, z)) continue;
      ok = true; break;
    }
    if (!ok) return null;
    return this.lootAt(wpick(r, LOOT_W), x, W.heightAt(x, z), z);
  },
  lootAt(kind, x, y, z) {
    const r = this.rng, tq = r.f(), tier = tq < .55 ? 0 : tq < .83 ? 1 : tq < .96 ? 2 : 3;
    const l = { id: (this.lootId = (this.lootId | 0) + 1), k: kind, w: '', tier: 0, n: 1, x, y, z };
    if (kind === 'w') { l.w = wpick(r, LOOT_WEAPONS); l.tier = tier; }
    else if (kind === 'a') { l.w = this.rng.pick(Object.keys(AMMO_TYPES)); l.n = AMMO_TYPES[l.w].pack; }
    else if (kind === 'heal') { l.w = wpick(r, HEAL_IDS.map(k => [k, HEALS[k].w])); l.n = 1; }
    else if (kind === 'vest' || kind === 'helm' || kind === 'pack') l.tier = Math.max(1, tier);
    else if (kind === 'sp') l.w = r.pick(Object.keys(SPECIALS));
    else if (kind === 'nade') l.n = r.chance(.3) ? 3 : 2;
    return l;
  },
  spawnLoot() {
    this.loot.length = 0; this.lootVer = (this.lootVer | 0) + 1;
    const B = this.map.bounds, total = Math.round(90 * (B.x1 - B.x0) * (B.z1 - B.z0) / (264 * 200) * .55);
    for (let i = 0; i < total; i++) { const l = this.makeLoot(); if (l) this.loot.push(l); }
  },
  dropLootOf(v) {
    const r = this.rng, a0 = r.f() * TAU; let n = 0;
    const put = (kind, extra) => { const a = a0 + n * 1.3, d = 0.8 + (n % 3) * 0.35; n++; const x = v.m.x + Math.cos(a) * d, z = v.m.z + Math.sin(a) * d; const l = this.lootAt(kind, x, this.floorY(x, z, v.m.y + 0.5), z); Object.assign(l, extra); this.loot.push(l); };
    for (const id in v.own) if (id !== 'faca' && id !== 'mandioca') put('w', { w: id, tier: v.own[id] });
    for (const t in v.ammo) if (v.ammo[t] > 4) put('a', { w: t, n: Math.min(v.ammo[t], AMMO_TYPES[t].pack * 2) });
    if (v.inv) for (const k in v.inv) for (let i = 0; i < v.inv[k]; i++) put('heal', { w: k, n: 1 });
    if (v.nades > 0) put('nade', { n: v.nades });
    if (v.vest > 0) put('vest', { tier: v.vest }); if (v.helm > 0) put('helm', { tier: v.helm });
    this.lootVer++;
  },
  dropWeapon(p) {
    if (this.mode !== 'caos' || !p.own[p.w] === undefined || p.w === 'faca' || p.w === 'batata' || p.w === 'mandioca' || p.own[p.w] === undefined) return;
    const id = p.w, f = aimVec(p.m.yaw, 0, { x: 0, y: 0, z: 0 }), x = p.m.x + f.x * 1.1, z = p.m.z + f.z * 1.1;
    const l = this.lootAt('w', x, this.floorY(x, z, p.m.y + 0.5), z); l.w = id; l.tier = p.own[id]; this.loot.push(l); this.lootVer++;
    delete p.own[id]; delete p.mag[id]; switchWeapon(p, ownedSlots(p).find(i => isGun(i)) || 'faca', null);
  },
  nearestLoot(p, r) {
    let best = null, bd = r * r;
    for (const l of this.loot) { const d = dist2(l.x, l.z, p.m.x, p.m.z); if (d < bd && Math.abs(l.y - p.m.y) < 2.2) { bd = d; best = l; } }
    return best;
  },
  tryPickup(p) { const l = this.nearestLoot(p, SIMC.PICK_R); if (l) this.pickLoot(p, l); },
  autoPickup(p) {
    for (const l of this.loot) {
      if ((l.k === 'a' || l.k === 'heal' || l.k === 'nade') && dist2(l.x, l.z, p.m.x, p.m.z) < 1.5 && Math.abs(l.y - p.m.y) < 2) { if (this.pickLoot(p, l)) break; }
    }
  },
  pickLoot(p, l) {
    if (l.cd && l.cd.id === p.id && this.t < l.cd.t) return false;          /* item que o próprio jogador acabou de largar: evita o laço pega/larga */
    const pk = PACKS[p.pack]; let ok = false;
    if (l.k === 'w') {
      const cur = p.own[l.w];
      if (cur === undefined) {
        if (PRIMARIES.includes(l.w)) { const owned = PRIMARIES.filter(i => p.own[i] !== undefined); if (owned.length >= 2) { const out = PRIMARIES.includes(p.w) ? p.w : owned[0]; const dl = this.lootAt('w', p.m.x, this.floorY(p.m.x, p.m.z, p.m.y + .5), p.m.z); dl.w = out; dl.tier = p.own[out]; dl.cd = { id: p.id, t: this.t + 5 }; this.loot.push(dl); delete p.own[out]; delete p.mag[out]; } }
        this.giveWeapon(p, l.w, l.tier, true); ok = true; if (p.w === 'faca' || !isGun(p.w) || p.own[p.w] === undefined) switchWeapon(p, l.w, this.hooks);
      }
      else if (l.tier > cur) { const was = p.mag[l.w] | 0; p.own[l.w] = l.tier; p.mag[l.w] = Math.min(wMagCap(p, l.w), Math.max(was, 0) + 2); ok = true; this.giveWeapon(p, l.w, l.tier, true); }
      else if (WEAPONS[l.w].ammo) { const t = WEAPONS[l.w].ammo, cap = Math.round(AMMO_TYPES[t].cap * pk.cap); if ((p.ammo[t] | 0) < cap) { p.ammo[t] = Math.min(cap, (p.ammo[t] | 0) + AMMO_TYPES[t].pack); ok = true; } }
    } else if (l.k === 'a') { const cap = Math.round(AMMO_TYPES[l.w].cap * pk.cap); if ((p.ammo[l.w] | 0) < cap) { p.ammo[l.w] = Math.min(cap, (p.ammo[l.w] | 0) + l.n); ok = true; } }
    else if (l.k === 'heal') { ok = this.invAdd(p, l.w, 1); }
    else if (l.k === 'nade') { if (p.nades < pk.nades) { p.nades = Math.min(pk.nades, p.nades + l.n); ok = true; } }
    else if (l.k === 'vest') { if (l.tier > p.vest || (l.tier === p.vest && p.armor < VESTS[l.tier].arm)) { p.vest = Math.max(p.vest, l.tier); p.armor = VESTS[p.vest].arm; ok = true; } }
    else if (l.k === 'helm') { if (l.tier > p.helm) { p.helm = l.tier; ok = true; } }
    else if (l.k === 'pack') { if (l.tier > p.pack) { p.pack = l.tier; ok = true; } }
    else if (l.k === 'sp') {
      if (l.w === 'garapa') p.buff.spd = 12; else if (l.w === 'pinga') p.buff.regen = 8; else if (l.w === 'ovo') { p.armor = Math.min(100, Math.max(p.armor, 40) + 40); p.vest = Math.max(1, p.vest); }
      ok = true;
    }
    if (ok) { const i = this.loot.indexOf(l); if (i >= 0) this.loot.splice(i, 1); this.lootVer++; this.emit({ t: 'pick', p: p.id, k: l.k, w: l.w, tier: l.tier }); }
    return ok;
  }
});
