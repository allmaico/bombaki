/* =====================================================================
   46_bots_tat.js — camada TÁTICA dos bots no 5x5 (por cima do 43_bots)
   • percepção: fumaça bloqueia visão, rojão cega, inimigos revelados pelo
     gavião/sino/arapuca viram informação para a equipe
   • rádio da equipe ("Dois no Longo B!", "Plantaram no A!", "Recuando!")
   • rotação da defesa quando a equipe vê o ataque concentrado num site
   • um atacante "lurker" segura o outro site / flanco (3 rotas em uso)
   • recuo quando em desvantagem numérica
   • uso das habilidades de cada fazendeiro com mira e momento certos
   • compra de cargas extras na fase de compra
   Nada aqui dá vantagem impossível: os bots só usam o que veem/ouvem ou o
   que a própria equipe viu (como jogadores conversando no rádio).
   ===================================================================== */
'use strict';
/* ---------- informações da equipe (no servidor da partida) ---------- */
Object.assign(Sim.prototype, {
  tatIntel(team) { const I = this.intel || (this.intel = { 1: [], 2: [] }); return I[team] || (I[team] = []); },
  reportEnemy(p, q) {
    const L = this.tatIntel(p.team), now = this.t; const old = L.find(r => r.id === q.id);
    if (old) { old.x = q.m.x; old.z = q.m.z; old.t = now; } else L.push({ id: q.id, x: q.m.x, z: q.m.z, t: now });
    for (let i = L.length - 1; i >= 0; i--) if (now - L[i].t > 6) L.splice(i, 1);
  },
  /* site mais próximo de um ponto (ou '' se longe dos dois) */
  siteNear(x, z, r) { let best = '', bd = r || 26; for (const id of ['A', 'B']) { const S = this.map.sites[id]; if (!S) continue; const d = Math.hypot(S.x - x, S.z - z); if (d < bd) { bd = d; best = id; } } return best; },
  calloutAt(x, z) { const L = this.map.callouts; if (!L || !L.length) return this.siteNear(x, z, 999) ? 'perto do ' + this.siteNear(x, z, 999) : ''; let b = L[0], bd = 1e9; for (const c of L) { const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; b = c; } } return b.name; },
  radio(p, msg, key) {
    const R = this.radioT || (this.radioT = {}), k = p.team + ':' + (key || msg); if (R[k] && this.t - R[k] < 10) return; R[k] = this.t;
    const tk = 'tm' + p.team; if (R[tk] && this.t - R[tk] < 3.5) return; R[tk] = this.t;
    this.emit({ t: 'radio', tm: p.team, n: p.name, m: msg });
  }
});

Object.assign(BotBrain.prototype, {
  /* chamado a cada quadro do bot no 5x5 (depois da percepção) */
  tatTick(sim, p, c, dt) {
    const m = p.m, now = sim.t;
    this.abT = (this.abT || 0) - dt;
    /* cegueira: perde o alvo, recua e atira só se estiver muito perto */
    if (p.blindT > .25) { if (this.tgt && Math.hypot(this.tgt.m.x - m.x, this.tgt.m.z - m.z) > 4) this.tgt = null; this.retreatT = Math.max(this.retreatT, .4); }
    /* informação da equipe: quem eu vejo vai para o rádio */
    if (this.tgt && this.tgt.alive && now - this.seenT < .3) {
      sim.reportEnemy(p, this.tgt);
      const near = sim.tatIntel(p.team).filter(r => now - r.t < 3 && Math.hypot(r.x - this.tgt.m.x, r.z - this.tgt.m.z) < 12).length;
      const where = sim.calloutAt(this.tgt.m.x, this.tgt.m.z);
      if (where) sim.radio(p, (near >= 3 ? 'Vários' : near === 2 ? 'Dois' : 'Um') + (near >= 3 ? ' inimigos' : near === 2 ? ' inimigos' : ' inimigo') + ' em ' + where + '!', 'vi:' + where);
      /* recuo em desvantagem: mais inimigos perto do alvo do que aliados perto de mim */
      const allies = sim.players.filter(q => q !== p && q.alive && q.team === p.team && Math.hypot(q.m.x - m.x, q.m.z - m.z) < 14).length;
      if (near > allies + 1 && p.hp < 70 && this.role !== 'plant' && sim.bomb.st !== 'planted' && this.retreatT <= 0 && Math.random() < .03) { this.retreatT = 1.6; sim.radio(p, 'Recuando, são muitos!', 'recua'); }
    }
    /* inimigos revelados (gavião, sino, arapuca) viram "som" para virar e checar */
    if (!this.tgt) for (const q of sim.players) if (q.alive && q.revT > 0 && sim.isEnemy(p, q) && Math.hypot(q.m.x - m.x, q.m.z - m.z) < 45) { this.heard = { x: q.m.x, z: q.m.z, t: now }; this.heardLook = Math.atan2(-(q.m.x - m.x), -(q.m.z - m.z)); break; }
    /* defesa: rotação quando a equipe vê o ataque concentrado num site */
    if (p.team === T_DEF && sim.bomb.st !== 'planted' && this.role === 'hold') {
      const I = sim.tatIntel(p.team), cnt = { A: 0, B: 0 };
      for (const r of I) if (now - r.t < 4) { const s = sim.siteNear(r.x, r.z, 34); if (s) cnt[s]++; }
      const hot = cnt.A >= 2 && cnt.A > cnt.B ? 'A' : cnt.B >= 2 && cnt.B > cnt.A ? 'B' : '';
      if (hot && this.site !== hot && !this.rotated) {
        const mates = sim.players.filter(q => q.alive && q.team === T_DEF && q.ai && q.ai.site === this.site && q.ai.role === 'hold');
        if (mates.length > 1 && mates[0] === p) { /* sempre fica pelo menos um no site */ }
        else { this.rotated = true; this.site = hot; this.hold = null; this.holdFor = ''; sim.radio(p, 'Rodando para o ' + hot + '!', 'rot' + hot); }
      }
    }
    if (sim.bomb.st === 'planted' && !this.saidPlant) { this.saidPlant = true; if (p.team === T_DEF) sim.radio(p, 'Plantaram no ' + (sim.bomb.site || sim.siteNear(sim.bomb.x, sim.bomb.z, 999)) + '! Todo mundo pra lá!', 'plant'); }
    /* habilidade com mira pendente: vira para o alvo e só então usa */
    const A = this.abAim;
    if (A) {
      this.lookToward(m, A.yaw, A.pitch, dt, 10);
      if (Math.abs(angDiff(this.aimYaw, A.yaw)) < .08 && Math.abs(this.aimPitch - A.pitch) < .08 || now > A.until) { this.act(c, 'ab:' + A.i); if (A.dash) c.mvf = 1; this.abAim = null; this.abT = 1.5; }
      return true;   /* consome o quadro (não briga com o objetivo) */
    }
    if (this.abT <= 0 && !this.tgt) this.abilityAI(sim, p, c);
    else if (this.abT <= 0 && this.tgt) this.abilityCombat(sim, p, c);
    return false;
  },
  /* prepara o uso: vira para (x,z) com inclinação para a distância e usa */
  useAbAt(sim, p, i, x, z, dash) {
    const m = p.m, dx = x - m.x, dz = z - m.z, d = Math.hypot(dx, dz), F = FARMERS[p.farmer], ab = F && F.ab[i]; if (!ab || (p.abC[i] | 0) <= 0) return false;
    const thrown = ab.id === 'rojao' || ab.id === 'fumaca' || ab.id === 'lama';
    this.abAim = { i, yaw: d > .1 ? Math.atan2(-dx, -dz) : this.aimYaw, pitch: thrown ? clamp(.06 + d * .016, .05, .62) : 0, until: sim.t + .6, dash: !!dash }; this.abT = .2; return true;
  },
  has(p, id) { const F = FARMERS[p.farmer]; if (!F) return -1; const i = F.ab.findIndex(a => a.id === id); return i >= 0 && (p.abC[i] | 0) > 0 ? i : -1; },
  abilityAI(sim, p, c) {
    if (sim.phase !== 'live') return; const m = p.m, b = sim.bomb, S = this.siteOf(sim, this.site), dS = Math.hypot(S.x - m.x, S.z - m.z), atk = p.team === T_ATK, go = atk && this.goSignal(sim, p);
    const lv = this.lv.aim; if (Math.random() > (lv > 6 ? .9 : lv > 4 ? .6 : .35)) { this.abT = 1; return; }
    let i;
    /* Socorrista: cura quem precisa (eu ou o aliado mais ferido a 3 m) */
    if ((i = this.has(p, 'garrafada')) >= 0) {
      const hurt = sim.players.filter(q => q.alive && q.team === p.team && q.hp < 55 && Math.hypot(q.m.x - m.x, q.m.z - m.z) < 3).sort((a, b2) => a.hp - b2.hp)[0];
      if (hurt) { if (hurt === p) { this.abAim = { i, yaw: this.aimYaw, pitch: 0, until: sim.t }; return; } return this.useAbAt(sim, p, i, hurt.m.x, hurt.m.z); }
    }
    if ((i = this.has(p, 'mutirao')) >= 0 && sim.players.filter(q => q.alive && q.team === p.team && q.hp < 70 && Math.hypot(q.m.x - m.x, q.m.z - m.z) < 4).length >= 2) return this.useAbAt(sim, p, i, m.x, m.z);
    if (atk) {
      if (b.st === 'planted') {
        /* pós-plantio: lama na mandioca se ouvir desarme por perto */
        if ((i = this.has(p, 'lama')) >= 0 && sim.players.some(q => q.alive && q.team === T_DEF && q.useT > 0) && Math.hypot(b.x - m.x, b.z - m.z) < 22) return this.useAbAt(sim, p, i, b.x, b.z);
        return;
      }
      if (!go) {
        /* Rastreador: gavião na direção do site na hora de entrar */
        return;
      }
      if (dS > 9 && dS < 26) {
        if ((i = this.has(p, 'gaviao')) >= 0 && !this.usedR('gaviao')) { this.mark('gaviao'); return this.useAbAt(sim, p, i, S.x, S.z); }
        if ((i = this.has(p, 'fumaca')) >= 0 && !this.usedR('fumaca')) { this.mark('fumaca'); const o = this.smokeSpot(sim, S, p); return this.useAbAt(sim, p, i, o.x, o.z); }
        if ((i = this.has(p, 'rojao')) >= 0 && !this.usedR('rojao')) { this.mark('rojao'); return this.useAbAt(sim, p, i, S.x + rnd(-3, 3), S.z + rnd(-3, 3)); }
      }
      if (dS < 13 && dS > 5 && (i = this.has(p, 'investida')) >= 0 && !this.usedR('investida')) { this.mark('investida'); return this.useAbAt(sim, p, i, S.x, S.z, true); }
    } else {
      /* defesa: arma o terreno quando chega na posição */
      const atHold = this.hold && Math.hypot(this.hold.x - m.x, this.hold.z - m.z) < 2.5;
      if (atHold && b.st !== 'planted') {
        const ent = this.entryDir(sim, S);
        if ((i = this.has(p, 'arapuca')) >= 0 && !this.usedR('arapuca')) { this.mark('arapuca'); return this.useAbAt(sim, p, i, m.x + ent.x * 3, m.z + ent.z * 3); }
        if ((i = this.has(p, 'sino')) >= 0 && !this.usedR('sino')) { this.mark('sino'); return this.useAbAt(sim, p, i, m.x + ent.x * 3, m.z + ent.z * 3); }
      }
      /* ouviu inimigo: gavião na direção do som */
      if (this.heard && sim.t - this.heard.t < 1.5 && (i = this.has(p, 'gaviao')) >= 0) return this.useAbAt(sim, p, i, this.heard.x, this.heard.z);
      /* mandioca plantada: fumaça na bomba para cobrir o desarme */
      if (b.st === 'planted' && Math.hypot(b.x - m.x, b.z - m.z) < 18 && (i = this.has(p, 'fumaca')) >= 0 && !this.usedR('fumaca')) { this.mark('fumaca'); return this.useAbAt(sim, p, i, b.x, b.z); }
    }
    this.abT = .5;
  },
  /* em combate: cerca entre mim e o inimigo, lama nos pés dele, rojão se estiver encurralado */
  abilityCombat(sim, p, c) {
    const m = p.m, q = this.tgt, d = Math.hypot(q.m.x - m.x, q.m.z - m.z); let i;
    if (Math.random() > .25) { this.abT = .6; return; }
    if (p.team === T_DEF && d > 10 && d < 30 && (i = this.has(p, 'cerca')) >= 0 && !this.usedR('cerca')) { this.mark('cerca'); return this.useAbAt(sim, p, i, q.m.x, q.m.z); }
    if (d > 7 && d < 22 && (i = this.has(p, 'lama')) >= 0 && !this.usedR('lama')) { this.mark('lama'); return this.useAbAt(sim, p, i, q.m.x, q.m.z); }
    if (p.hp < 45 && d > 6 && d < 20 && (i = this.has(p, 'fumaca')) >= 0 && !this.usedR('fumacaC')) { this.mark('fumacaC'); this.retreatT = 1.4; return this.useAbAt(sim, p, i, (q.m.x + m.x) / 2, (q.m.z + m.z) / 2); }
    this.abT = .8;
  },
  usedR(k) { return this.abRound === this.curRound && this.abDone && this.abDone[k]; },
  mark(k) { if (this.abRound !== this.curRound) { this.abRound = this.curRound; this.abDone = {}; } this.abDone[k] = 1; },
  /* direção de chegada do ataque ao site (do site para o spawn do ataque) */
  entryDir(sim, S) { const T = sim.map.spawns.atk[0] || { x: 0, z: 60 }, dx = T.x - S.x, dz = T.z - S.z, l = Math.hypot(dx, dz) || 1; return { x: dx / l, z: dz / l }; },
  smokeSpot(sim, S, p) { const e = this.entryDir(sim, S); return { x: S.x - e.x * 4 + rnd(-2, 2), z: S.z - e.z * 4 + rnd(-2, 2) }; }
});

/* ---------- ganchos no cérebro existente ---------- */
(function () {
  const think0 = BotBrain.prototype.think, perceive0 = BotBrain.prototype.perceive, plan0 = BotBrain.prototype.planRound, objT0 = BotBrain.prototype.objTatico;
  BotBrain.prototype.think = function (sim, p, dt) {
    if (sim.mode !== 'tatico' || sim.phase !== 'live' || !p.alive) { if (sim.mode === 'tatico' && sim.phase !== 'live') { this.rotated = false; this.saidPlant = false; this.abAim = null; this.lurkGo = false; } return think0.call(this, sim, p, dt); }
    this.curRound = sim.round;
    think0.call(this, sim, p, dt);
    const c = p.cmd;
    if (this.tatTick(sim, p, c, dt)) { c.yaw = this.aimYaw; c.pitch = clamp(this.aimPitch, -1.4, 1.4); }
  };
  /* fumaça e cegueira entram na percepção */
  BotBrain.prototype.perceive = function (sim, p) {
    if (sim.mode === 'tatico' && p.blindT > .25) { const keep = this.tgt; perceive0.call(this, sim, p); if (Math.random() < .85) this.tgt = keep && Math.hypot(keep.m.x - p.m.x, keep.m.z - p.m.z) < 4 ? keep : null; return; }
    const prev = this.tgt, prevT = this.seenT; perceive0.call(this, sim, p);
    if (sim.mode === 'tatico' && this.tgt && this.seenT === sim.t && (this.tgt !== prev || sim.t - prevT > .5)) {
      const q = this.tgt, m = p.m;
      if (sim.smokeBlocks(m.x, m.y + eyeH(m), m.z, q.m.x, q.m.y + 1.2, q.m.z)) { this.tgt = prev; this.seenT = prevT; }
    } else if (sim.mode === 'tatico' && this.tgt && this.seenT === sim.t) {
      const q = this.tgt, m = p.m; if (sim.smokeBlocks(m.x, m.y + eyeH(m), m.z, q.m.x, q.m.y + 1.2, q.m.z)) this.seenT = prevT;
    }
  };
  /* um atacante vira "lurker" (segura o outro site / flanco) — usa as 3 rotas */
  BotBrain.prototype.planRound = function (sim, p) {
    const was = this.planned; plan0.call(this, sim, p);
    if (!was && sim.mode === 'tatico' && p.team === T_ATK && !p.hasBomb) {
      const atk = sim.players.filter(q => q.team === T_ATK && q.alive && !q.hasBomb && q.bot);
      if (atk.length >= 3 && atk[atk.length - 1] === p && sim.rng.chance(.7)) { this.role = 'lurk'; this.site = sim.plan.atk === 'A' ? 'B' : 'A'; }
    }
  };
  BotBrain.prototype.objTatico = function (sim, p, c, dt) {
    if (this.role === 'lurk' && p.team === T_ATK && sim.bomb.st !== 'planted') {
      const m = p.m, S = this.siteOf(sim, this.site);
      if (!this.hold || this.holdFor !== 'lurk') { this.holdFor = 'lurk'; this.hold = this.holdSpot(sim, S, 14, 26, true) || { x: S.x, z: S.z }; }
      /* quando o ataque principal entra, o lurker aperta o outro lado */
      if (sim.plan && sim.plan.go && sim.liveT > 30 && !this.lurkGo) { this.lurkGo = true; this.hold = this.holdSpot(sim, S, 4, 12, true) || this.hold; }
      if (Math.hypot(m.x - this.hold.x, m.z - this.hold.z) > 2) this.goto(sim, p, c, this.hold.x, this.hold.z, false, dt); else this.watch(sim, p, c, dt, S);
      return;
    }
    if (this.role === 'lurk' && sim.bomb.st === 'planted') { this.role = 'push'; this.lurkGo = false; }
    return objT0.call(this, sim, p, c, dt);
  };
})();
