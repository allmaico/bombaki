/* =====================================================================
   45_farmers.js — FAZENDEIROS do 5x5 (lado do servidor da partida)
   Escolha (sem repetir na equipe), cargas por rodada, compra de cargas
   extras, uso das habilidades e entidades no mundo (cerca, sino, arapuca,
   fumaça, lama, mutirão), efeitos (lentidão, cegueira, revelação), dano em
   objetos e dados para o snapshot. Tudo validado no anfitrião.
   ===================================================================== */
'use strict';
const AB_KIND = { investida: 1, rojao: 2, gaviao: 3, sino: 4, cerca: 5, arapuca: 6, fumaca: 7, lama: 8, garrafada: 9, mutirao: 10, festa: 11, espiao: 12, galinha: 13, olho: 14, territorio: 15, insetos: 16 };
const AB_BY_CODE = Object.fromEntries(Object.entries(AB_KIND).map(([k, v]) => [v, k]));
const NADE_KIND = { batata: 0, rojao: 1, fumaca: 2, lama: 3, espiao: 4 };
const NADE_NAMES = Object.keys(NADE_KIND).sort((a, b) => NADE_KIND[a] - NADE_KIND[b]);

Object.assign(Sim.prototype, /** @type {ThisType<Sim> & Record<string, any>} */ ({
  /* ---------- escolha ---------- */
  initFarmers() {
    this.abx = []; this.abId = 1;
    if (this.mode !== 'tatico') return;
    for (const sq of [0, 1]) {
      const team = this.players.filter(p => p.squad === sq), used = new Set();
      for (const p of team) if (!p.bot && FARMERS[p.wantFar] && !used.has(p.wantFar)) { p.farmer = p.wantFar; used.add(p.farmer); }
      for (const p of team) if (!p.farmer || !FARMERS[p.farmer] || (p.bot && used.has(p.farmer) && team.find(q => q !== p && q.farmer === p.farmer))) {
        const free = FARMER_IDS.filter(f => !used.has(f)); p.farmer = free.length ? free[this.rng.int(0, free.length - 1)] : FARMER_IDS[this.rng.int(0, 4)]; used.add(p.farmer);
      }
    }
  },
  farmerTaken(p, id) { return this.players.some(q => q !== p && q.squad === p.squad && q.farmer === id); },
  canPickFarmer() { return this.mode === 'tatico' && this.phase === 'select'; },
  pickFarmer(p, id) {
    if (!FARMERS[id] || this.mode !== 'tatico') return;
    if (!this.canPickFarmer()) return this.deny(p, 'O agente é escolhido na seleção, antes da partida.');
    if (p.farmer && !p.bot) return this.deny(p, 'Seu agente já está travado.');
    const q = this.players.find(o => o !== p && o.squad === p.squad && o.farmer === id);
    if (q && !q.bot) return this.deny(p, FARMERS[id].name + ' já foi escolhido por ' + q.name + '.');
    const old = p.farmer; p.farmer = id; this.refillAbilities(p); this.emit({ t: 'far', p: p.id, f: id });
    if (q && q.bot) { q.farmer = old; if (old) { this.refillAbilities(q); this.emit({ t: 'far', p: q.id, f: q.farmer }); } else this.autoPickFarmer(q); }   /* bot cede a vaga e fica com o antigo do jogador (ou outro livre) */
  },
  refillAbilities(p) { const F = FARMERS[p.farmer]; p.abC = F ? F.ab.map(a => a.ult ? 0 : a.free | 0) : [0, 0, 0, 0]; p.abCd = 0; p.dashT = 0; p.rodeoT = 0; p.slowT = 0; p.blindT = 0; p.revT = 0; p.mudT = 0; p.sigT = 0; p.shield = 0; p.detainT = 0; p.bugT = 0; },
  /* compra de cargas extras (loja) */
  buyAbility(p, i) {
    const F = FARMERS[p.farmer], ab = F && F.ab[i]; if (!ab) return;
    if (!this.canBuyNow(p)) return this.deny(p, 'Fora do tempo de compra.');
    if (!ab.price) return this.deny(p, ab.name + ' só tem a carga grátis da rodada.');
    if ((p.abC[i] | 0) >= ab.max) return this.deny(p, 'Limite de cargas de ' + ab.name + '.');
    if ((p.money | 0) < ab.price) return this.deny(p, 'Dinheiro insuficiente.');
    this.addMoney(p, -ab.price); p.abC[i]++; p.boughtR['hab' + i] = (p.boughtR['hab' + i] | 0) + 1; this.emit({ t: 'buy', p: p.id, id: 'hab' + i, $: p.money });
  },
  /* ---------- uso ---------- */
  useAbility(p, i) {
    if (this.mode !== 'tatico' || !p.alive) return; const F = FARMERS[p.farmer], ab = F && F.ab[i]; if (!ab) return;
    if (this.phase !== 'live' && !(this.phase === 'prep' && !ab.ult)) return this.deny(p, ab.ult ? 'A suprema só durante o round.' : 'Habilidades só na compra ou durante a rodada.');
    if (ab.ult) { if ((p.ult | 0) < ab.cost) return this.deny(p, ab.name + ' carregando: ' + (p.ult | 0) + '/' + ab.cost + ' pontos.'); }
    else if ((p.abC[i] | 0) <= 0) return this.deny(p, ab.sig && p.sigT > 0 ? ab.name + ' recarregando (' + Math.ceil(p.sigT) + ' s).' : 'Sem cargas de ' + ab.name + '.');
    if (p.abCd > 0 || p.useT > 0 || p.heal || p.m.swim || p.relT > 0 && ab.id === 'garrafada') return;
    const m = p.m, fx = -Math.sin(m.yaw), fz = -Math.cos(m.yaw), W = this.W;
    const front = (d) => { let x = m.x + fx * d, z = m.z + fz * d; const h = W.raycast(m.x, m.y + 1, m.z, fx, 0, fz, d, true); if (h) { x = m.x + fx * Math.max(0.3, h.t - 0.5); z = m.z + fz * Math.max(0.3, h.t - 0.5); } return { x, z, y: this.floorY(x, z, m.y + 1) }; };
    let ok = true;
    switch (ab.id) {
      case 'investida': {
        const c = p.cmd || {}; let dx = fx * (c.mvf || 0) + (-fz) * -(c.mvr || 0), dz = fz * (c.mvf || 0) + fx * -(c.mvr || 0);
        /* mvr > 0 = direita; direita do jogador = (-fz, fx)... usa o vetor de movimento quando houver, senão a frente */
        dx = fx * (c.mvf || 0) - fz * (c.mvr || 0); dz = fz * (c.mvf || 0) + fx * (c.mvr || 0);
        const l = Math.hypot(dx, dz); if (l < .1) { dx = fx; dz = fz; } else { dx /= l; dz /= l; }
        p.dashT = .26; p.dashV = 22; p.dashX = dx; p.dashZ = dz; this.nextSounds.push({ x: m.x, z: m.z, p: p.id, r: 30 }); break;
      }
      case 'rojao': case 'fumaca': case 'lama': case 'espiao': this.throwAbility(p, ab.id); break;
      case 'laco': case 'rodeio': case 'queimada': case 'mandacaru': ok = this.useAb2(p, ab.id, front, fx, fz); break;
      /* ---- novas ---- */
      case 'pulo': { if (!m.gnd && m.vy < -2) { ok = false; break; } m.vy = 12.6; m.gnd = false; m.vx *= 1.15; m.vz *= 1.15; this.nextSounds.push({ x: m.x, z: m.z, p: p.id, r: 25 }); this.emit({ t: 'ab', k: 'pulo', p: p.id, x: r2(m.x), y: r2(m.y), z: r2(m.z) }); break; }
      case 'festa': { const a = this.aimPoint(p, 40); const e = this.addAbx(p, 'festa', a.x, a.y, a.z, { t: 4.2, r: 6, n: 0 }); e.next = 1.0; break; }
      case 'nuvem': { const a = this.aimPoint(p, 45); const e = this.addAbx(p, 'fumaca', a.x, a.y, a.z, { t: 10, r: 4 }); e.team = p.team; break; }
      case 'insetos': { const a = this.aimPoint(p, 40); this.addAbx(p, 'insetos', a.x, a.y, a.z, { t: 12, r: 9 }); break; }
      case 'galinha': { const f = front(1.2); const e = this.addAbx(p, 'galinha', f.x, f.y, f.z, { t: 3.2, r: 4 }); e.dx = fx; e.dz = fz; e.ax = Math.round(m.yaw * 100); break; }
      case 'olho': { const e = this.addAbx(p, 'olho', m.x, m.y, m.z, { t: 4.3 }); e.pulse = [2.3, .3]; this.olhoPulse(p); break; }
      case 'territorio': { const f = front(1.6); const e = this.addAbx(p, 'territorio', f.x, f.y, f.z, { t: 10, r: 16, hp: 200 }); e.arm = 5; e.box = this.W.addDyn([f.x - .25, f.y, f.z - .25, f.x + .25, f.y + 2.2, f.z + .25], 'wood'); e.box.ab = e; break; }
      case 'reforco': { let n = 0; for (const q of this.players) if (q.alive && q.team === p.team && Math.hypot(q.m.x - m.x, q.m.z - m.z) < 5) { q.shield = 50; n++; this.emit({ t: 'abx', k: 'reforco', id: 0, v: q.id, x: r2(q.m.x), y: r2(q.m.y), z: r2(q.m.z) }); } break; }
      case 'reanima': {
        let best = null, bd = 6.5;
        for (const q of this.players) { if (q.alive || q === p || q.team !== p.team || q.left) continue; const d = Math.hypot(q.m.x - m.x, q.m.z - m.z); if (d < bd && Math.abs(q.m.y - m.y) < 3) { bd = d; best = q; } }
        if (!best) { this.deny(p, 'Nenhum aliado caído a até 6 m.'); ok = false; break; }
        this.revive(best, p); break;
      }
      case 'gaviao': {
        let n = 0;
        for (const q of this.players) { if (!q.alive || !this.isEnemy(p, q)) continue; const dx = q.m.x - m.x, dz = q.m.z - m.z, d = Math.hypot(dx, dz); if (d > 38) continue; if (Math.abs(angDiff(m.yaw, Math.atan2(-dx, -dz))) > .66) continue; q.revT = Math.max(q.revT || 0, 3.5); n++; }
        this.emit({ t: 'ab', k: 'gaviao', p: p.id, x: r2(m.x), y: r2(m.y + 1.8), z: r2(m.z), yaw: r3(m.yaw), n }); break;
      }
      case 'sino': { const f = front(1.6); this.addAbx(p, 'sino', f.x, f.y, f.z, { t: 30, r: 6, hp: 60 }); break; }
      case 'arapuca': { const f = front(1.8); this.addAbx(p, 'arapuca', f.x, f.y, f.z, { t: 90, r: 1.25 }); break; }
      case 'mutirao': { this.addAbx(p, 'mutirao', m.x, this.floorY(m.x, m.z, m.y + .5), m.z, { t: 6, r: 4.2 }); break; }
      case 'cerca': {
        const f = front(2.6), alongZ = Math.abs(fx) > Math.abs(fz), hw = 2.25, ht = .25, y0 = f.y;
        const box = alongZ ? [f.x - ht, y0, f.z - hw, f.x + ht, y0 + 2.1, f.z + hw] : [f.x - hw, y0, f.z - ht, f.x + hw, y0 + 2.1, f.z + ht];
        const e = this.addAbx(p, 'cerca', f.x, y0, f.z, { t: 18, hp: 300, ax: alongZ ? 1 : 0 });
        e.box = this.W.addDyn(box, 'wood'); e.box.ab = e; break;
      }
      case 'garrafada': {
        let tgt = p, best = .35;
        for (const q of this.players) { if (q === p || !q.alive || q.team !== p.team || q.hp >= SIMC.HP) continue; const dx = q.m.x - m.x, dz = q.m.z - m.z, d = Math.hypot(dx, dz); if (d > (ab.far || 3)) continue; const a = Math.abs(angDiff(m.yaw, Math.atan2(-dx, -dz))); if (a < best) { best = a; tgt = q; } }
        if (tgt.hp >= SIMC.HP) { this.deny(p, 'Ninguém precisa de cura.'); ok = false; break; }
        p.heal = { k: 'garrafa', t: 0, max: 3, amt: 50, tgt: tgt.id, far: ab.far || 3 }; this.emit({ t: 'heal', p: p.id, k: 'garrafa', s: 1, v: tgt.id }); break;
      }
    }
    if (!ok) return;
    if (ab.ult) p.ult = 0; else { p.abC[i]--; if (ab.sig && p.sigT <= 0) p.sigT = ab.cd || 30; }
    p.abCd = .6; p.abUsed = (p.abUsed | 0) + 1;
    this.emit({ t: 'abu', p: p.id, k: ab.id, i, c: p.abC[i] });
  },
  throwAbility(p, k) {
    const o = eyePos(p, this.tmpA), m = p.m, f = aimVec(m.yaw, clamp(m.pitch + 0.12, -1.4, 1.4), this.tmpC), V = k === 'lama' ? 15 : k === 'espiao' ? 22 : 17;
    const n = { id: this.nid++, o: p.id, k, x: o.x + f.x * .5, y: o.y - .15 + f.y * .5, z: o.z + f.z * .5, vx: f.x * V + m.vx * .6, vy: f.y * V + 1.2, vz: f.z * V + m.vz * .6, fuse: k === 'rojao' ? .9 : k === 'fumaca' ? 1.6 : k === 'espiao' ? 1.0 : 1.1, rest: false, bn: 0, sq: this.rng.f() * 6 };
    if (this.W.sphereCollide(n, .2, { nx: 0, ny: 1, nz: 0 })) { n.vx *= .3; n.vz *= .3; }
    this.nades.push(n); this.emit({ t: 'nade', id: n.id, p: p.id, k });
  },
  /* granada de habilidade chegou ao fim do pavio (chamado por stepNades) */
  nadeEffect(n) {
    const owner = this.byId.get(n.o), team = owner ? owner.team : 0;
    if (n.k === 'rojao') {
      const blind = {};
      for (const q of this.players) {
        if (!q.alive) continue; const ex = q.m.x, ey = q.m.y + eyeH(q.m), ez = q.m.z, dx = n.x - ex, dy = n.y - ey, dz = n.z - ez, d = Math.hypot(dx, dy, dz); if (d > 30) continue;
        if (!this.W.los(ex, ey, ez, n.x, n.y + .2, n.z) || this.smokeBlocks(ex, ey, ez, n.x, n.y, n.z)) continue;
        const v = aimVec(q.m.yaw, q.m.pitch, this.tmpC), facing = (v.x * dx + v.y * dy + v.z * dz) / Math.max(d, .01);
        const b = (facing > .55 ? 2.0 : facing > 0 ? 1.1 : .35) * clamp(1.15 - d / 30, .25, 1);
        if (b > .15) { q.blindT = Math.max(q.blindT || 0, b); blind[q.id] = r2(b); }
      }
      this.nextSounds.push({ x: n.x, z: n.z, p: n.o, r: 60 }); this.emit({ t: 'flash', x: r2(n.x), y: r2(n.y), z: r2(n.z), b: blind });
    } else if (n.k === 'fumaca') { const e = this.addAbx(owner, 'fumaca', n.x, n.y, n.z, { t: 13, r: 4.6 }); e.team = team; }
    else if (n.k === 'espiao') { const e = this.addAbx(owner, 'espiao', n.x, n.y, n.z, { t: 4.4, r: 14, hp: 40 }); e.team = team; e.pulse = [4.3, 2.3]; }
    else if (n.k === 'lama') { const y = this.floorY(n.x, n.z, n.y + .5); const e = this.addAbx(owner, 'lama', n.x, y, n.z, { t: 7, r: 3.6 }); e.team = team; }
  },
  addAbx(p, k, x, y, z, o) {
    const e = Object.assign({ id: this.abId++, k, x, y, z, team: p ? p.team : 0, owner: p ? p.id : '', r: 0, hp: 0, ax: 0 }, o);
    /* limite por dono e tipo (evita acumular sinos/arapucas) */
    const same = e.wall ? [] : this.abx.filter(a => a.owner === e.owner && a.k === k && !a.wall); if (same.length >= 2) this.removeAbx(same[0]);
    this.abx.push(e); this.emit({ t: 'ab', k, p: e.owner, x: r2(x), y: r2(y), z: r2(z), id: e.id }); return e;
  },
  removeAbx(e) { const i = this.abx.indexOf(e); if (i >= 0) this.abx.splice(i, 1); if (e.box) { this.W.removeDyn(e.box); e.box = null; } },
  clearAbilities() { for (const e of (this.abx || []).slice()) this.removeAbx(e); this.abx = []; },
  /* dano em objetos (tiros e explosões) */
  damageAbx(e, d, by) {
    if (!e || !e.hp) return; e.hp -= d;
    if (e.hp <= 0) { this.emit({ t: 'abx', k: 'quebrou', id: e.id, x: r2(e.x), y: r2(e.y), z: r2(e.z), kind: e.k }); this.removeAbx(e); }
  },
  /* fumaça bloqueia linha de visão? (segmento x esferas) */
  smokeBlocks(ax, ay, az, bx, by, bz) {
    if (!this.abx || !this.abx.length) return false;
    const dx = bx - ax, dy = by - ay, dz = bz - az, L2 = dx * dx + dy * dy + dz * dz || 1e-6;
    for (const e of this.abx) {
      if ((e.k !== 'fumaca' && e.k !== 'insetos') || e.t < .6) continue; const cy = e.y + 1.6, r = e.r * (e.t > 12.2 ? clamp((13 - e.t) / .8, .2, 1) : e.t < 1.5 ? e.t / 1.5 : 1);
      const t = clamp(((e.x - ax) * dx + (cy - ay) * dy + (e.z - az) * dz) / L2, 0, 1), px = ax + dx * t - e.x, py = ay + dy * t - cy, pz = az + dz * t - e.z;
      if (px * px + py * py * 1.6 + pz * pz < r * r) return true;
    }
    return false;
  },
  /* ---------- passo das habilidades ---------- */
  stepAbilities(dt) {
    if (this.mode !== 'tatico') return;
    for (const p of this.players) {
      if (p.abCd > 0) p.abCd -= dt; if (p.slowT > 0) p.slowT -= dt; if (p.blindT > 0) p.blindT -= dt; if (p.revT > 0) p.revT -= dt; if (p.dashT > 0) p.dashT -= dt; p.mudT = 0; p.bugT = 0;
      if (p.detainT > 0) p.detainT -= dt;
      /* assinatura: recarrega sozinha durante o round */
      const F = FARMERS[p.farmer], sg = F && F.ab[2]; if (sg && sg.sig && p.alive && this.phase === 'live' && (p.abC[2] | 0) < sg.max) { p.sigT = (p.sigT > 0 ? p.sigT : sg.cd) - dt; if (p.sigT <= 0) { p.abC[2] = (p.abC[2] | 0) + 1; p.sigT = (p.abC[2] < sg.max) ? sg.cd : 0; this.emit({ t: 'sig', p: p.id }); } }
    }
    this.stepAb2(dt);
    for (let i = this.abx.length - 1; i >= 0; i--) {
      const e = this.abx[i]; e.t -= dt; if (e.t <= 0) { this.removeAbx(e); continue; }
      if (e.k === 'festa' || e.k === 'espiao' || e.k === 'galinha' || e.k === 'olho' || e.k === 'territorio' || e.k === 'insetos') { if (this.stepAgentAbx(e, dt)) continue; }
      if (e.k === 'sino' || e.k === 'arapuca' || e.k === 'lama' || e.k === 'mutirao') {
        for (const q of this.players) {
          if (!q.alive) continue; const d = Math.hypot(q.m.x - e.x, q.m.z - e.z); if (d > e.r || Math.abs(q.m.y - e.y) > 2.5) continue;
          const enemy = q.team !== e.team;
          if (e.k === 'sino' && enemy) { q.revT = Math.max(q.revT || 0, 2.5); if (!e.rang || this.t - e.rang > 1.2) { e.rang = this.t; this.emit({ t: 'abx', k: 'sino', id: e.id, x: r2(e.x), y: r2(e.y), z: r2(e.z), v: q.id }); } }
          else if (e.k === 'arapuca' && enemy) { q.slowT = 3; q.revT = Math.max(q.revT || 0, 3); this.emit({ t: 'abx', k: 'arapuca', id: e.id, x: r2(e.x), y: r2(e.y), z: r2(e.z), v: q.id }); this.removeAbx(e); break; }
          else if (e.k === 'lama' && enemy) q.mudT = 1;
          else if (e.k === 'mutirao' && !enemy && q.hp < SIMC.HP) q.hp = Math.min(SIMC.HP, q.hp + 8 * dt);
        }
      }
    }
  },
  /* multiplicador de velocidade das habilidades (usado em moveMods) */
  abSpeed(p) { let k = 1; if (p.slowT > 0) k *= .3; if (p.mudT > 0) k *= .55; if (p.detainT > 0) k *= .2; if (p.bugT > 0) k *= .75; return k; },
  abSnap() { return (this.abx || []).map(e => [e.id, AB_KIND[e.k], r2(e.x), r2(e.y), r2(e.z), r2(e.t), e.team, r2(e.r), e.ax | 0, Math.round(e.hp || 0)]); }
}));
