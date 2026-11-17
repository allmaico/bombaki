/* =====================================================================
   44_items.js — economia e loja (Roçado Tático), cura (tática limitada e
   mochila do Battle Royale), vaca voadora + paraquedas, fôlego/natação.
   Tudo roda no HOST (autoritativo): o cliente só envia pedidos ("buy:…").
   ===================================================================== */
'use strict';
Object.assign(Sim.prototype, {
  /* ---------------- dinheiro ---------------- */
  addMoney(p, v) { if (this.mode !== 'tatico') return; p.money = clamp((p.money | 0) + v, 0, ECON.max); },
  canBuyNow(p) { return this.mode === 'tatico' && this.phase === 'prep' && p.alive; },
  /* compra validada no servidor (preço, fase, limites, dinheiro) */
  buy(p, id) {
    if (!this.canBuyNow(p)) return this.deny(p, 'A loja só abre na fase de compra.');
    const e = SHOP.find(s => s.id === id); if (!e) return; const price = shopPrice(id);
    p.boughtR = p.boughtR || {};
    if (e.kind === 'w') {
      if (p.own[id] !== undefined) {
        /* já tem: compra só munição cheia */
        const w = WEAPONS[id]; if (!w.ammo) return; const full = (p.mag[id] | 0) >= wMagCap(p, id) && (p.ammo[w.ammo] | 0) >= w.res; if (full) return this.deny(p, 'Você já tem essa arma carregada.');
        if (price > 0 && p.money < 200) return this.deny(p, 'Dinheiro insuficiente.');
        this.addMoney(p, price > 0 ? -200 : 0); p.mag[id] = wMagCap(p, id); p.ammo[w.ammo] = w.res; this.emit({ t: 'buy', p: p.id, id, $: p.money }); return;
      }
      if (p.money < price) return this.deny(p, 'Dinheiro insuficiente.');
      if (PRIMARIES.includes(id)) { for (const o of PRIMARIES) if (p.own[o] !== undefined) this.sell(p, o, true); }
      this.addMoney(p, -price); this.giveWeapon(p, id, 0); p.boughtR[id] = (p.boughtR[id] | 0) + 1; switchWeapon(p, id, this.hooks);
    } else {
      const have = id === 'colete' ? (p.vest > 0 && p.armor >= 50 ? 1 : 0) : id === 'batata' ? p.nades : id === 'pano' ? (p.pano | 0) : (p.caixa | 0);
      if (have >= e.max) return this.deny(p, 'Limite desse item atingido.');
      if (e.team) { const tb = this.teamBuys[p.team] || (this.teamBuys[p.team] = {}); if (tb[id]) return this.deny(p, 'Sua equipe já tem uma ' + e.name + '.'); }
      if (id === 'pano' && p.panoR === this.round) return this.deny(p, 'O pano só pode ser usado uma vez por rodada.');
      if (p.money < price) return this.deny(p, 'Dinheiro insuficiente.');
      this.addMoney(p, -price); p.boughtR[id] = (p.boughtR[id] | 0) + 1;
      if (id === 'colete') { p.vest = 1; p.armor = 50; }
      else if (id === 'batata') p.nades++;
      else if (id === 'pano') p.pano = 1;
      else if (id === 'caixa') { p.caixa = 1; this.teamBuys[p.team][id] = p.id; }
    }
    this.emit({ t: 'buy', p: p.id, id, $: p.money });
  },
  /* vende durante a compra devolvendo parte do valor */
  sell(p, id, silent) {
    if (!this.canBuyNow(p)) return; const e = SHOP.find(s => s.id === id); if (!e) return; const back = Math.round(shopPrice(id) * ((p.boughtR && p.boughtR[id]) ? 1 : ECON.sellBack));
    if (e.kind === 'w') { if (p.own[id] === undefined || id === 'estilingue') return; delete p.own[id]; delete p.mag[id]; if (p.w === id) switchWeapon(p, 'estilingue', this.hooks); }
    else if (id === 'colete') { if (!p.vest) return; p.vest = 0; p.armor = 0; }
    else if (id === 'batata') { if (p.nades <= 0) return; p.nades--; }
    else if (id === 'pano') { if (!p.pano) return; p.pano = 0; }
    else if (id === 'caixa') { if (!p.caixa) return; p.caixa = 0; if (this.teamBuys[p.team]) delete this.teamBuys[p.team].caixa; }
    if (p.boughtR && p.boughtR[id]) p.boughtR[id]--;
    this.addMoney(p, back); if (!silent) this.emit({ t: 'buy', p: p.id, id, sell: 1, $: p.money });
  },
  deny(p, why) { this.emit({ t: 'deny', p: p.id, why }); },
  /* bots compram conforme o dinheiro (economia simples estilo CS) */
  botBuy(p) {
    const has = PRIMARIES.some(i => p.own[i] !== undefined), r = this.rng;
    if (!has) {
      if (p.money >= 4200 + 650 && r.chance(.18)) this.buy(p, 'vassoura');
      else if (p.money >= 2700 + 650) this.buy(p, 'galho');
      else if (p.money >= 1800 + 300 && r.chance(.45)) this.buy(p, 'porteira');
      else if (p.money >= 1500 + 300) this.buy(p, 'colher');
    }
    if (p.money >= 650 && !p.vest) this.buy(p, 'colete');
    if (p.money >= 300 && p.nades < 1) this.buy(p, 'batata');
    if (p.money >= 1200 && !p.pano) this.buy(p, 'pano');
    /* cargas extras das habilidades do fazendeiro (sobra de dinheiro) */
    const F = this.mode === 'tatico' && FARMERS[p.farmer];
    if (F) for (let i = 0; i < 2; i++) { const ab = F.ab[i]; if (ab.price && (p.abC[i] | 0) < ab.max && p.money >= ab.price + 900 && r.chance(.75)) this.buyAbility(p, i); }
    const w = PRIMARIES.find(i => p.own[i] !== undefined); if (w) switchWeapon(p, w, this.hooks);
  },

  /* ---------------- cura (sempre manual, interrompida por dano) ---------------- */
  startHeal(p, id) {
    if (!p.alive || p.heal || this.phase !== 'live' || p.onCow || p.chute) return;
    if (this.mode === 'tatico') {
      const H = HEAL_TAT[id]; if (!H) return;
      if (id === 'pano' && (!p.pano || p.panoR === this.round)) return this.deny(p, p.panoR === this.round ? 'Pano já usado nesta rodada.' : 'Compre o Pano de Prato na loja.');
      if (id === 'caixa' && !p.caixa) return this.deny(p, 'Você não tem a Caixinha do Seu Zé.');
      /* caixinha: cura o aliado mais ferido por perto (ou você) */
      let tgt = p; if (id === 'caixa') { let lo = p.hp; for (const q of this.players) if (q !== p && q.alive && q.team === p.team && q.hp < lo && Math.hypot(q.m.x - p.m.x, q.m.z - p.m.z) < 2.6) { lo = q.hp; tgt = q; } }
      if (tgt.hp >= SIMC.HP) return this.deny(p, 'Vida já está cheia.');
      p.heal = { k: id, t: 0, max: H.time, amt: H.amt, tgt: tgt.id };
    } else {
      const H = HEALS[id]; if (!H || !(p.inv && p.inv[id] > 0)) return; if (p.hp >= SIMC.HP) return this.deny(p, 'Vida já está cheia.');
      p.heal = { k: id, t: 0, max: H.time, amt: H.amt, tgt: p.id };
    }
    p.ads = false; this.emit({ t: 'heal', p: p.id, k: p.heal.k, s: 1, d: p.heal.max });
  },
  stepHeal(p, dt) {
    const h = p.heal; if (!h) return;
    const tgt = this.byId.get(h.tgt);
    if (!tgt || !tgt.alive || (tgt !== p && Math.hypot(tgt.m.x - p.m.x, tgt.m.z - p.m.z) > 3.2)) { this.cancelHeal(p, 'longe'); return; }
    h.t += dt; if (h.t < h.max) return;
    tgt.hp = Math.min(SIMC.HP, tgt.hp + h.amt);
    if (this.mode === 'tatico') { if (h.k === 'pano') { p.pano = 0; p.panoR = this.round; } else if (h.k === 'caixa') p.caixa = 0; }
    else { p.inv[h.k]--; if (p.inv[h.k] <= 0) delete p.inv[h.k]; }
    p.heal = null; this.emit({ t: 'heal', p: p.id, k: h.k, s: 2, v: tgt.id, hp: Math.round(tgt.hp) });
  },
  cancelHeal(p, why) { if (!p.heal) return; const k = p.heal.k; p.heal = null; this.emit({ t: 'heal', p: p.id, k, s: 0, why: why || '' }); },

  /* ---------------- mochila (Battle Royale) ---------------- */
  invCap(p) { return 8 + 4 * (p.pack | 0); },
  invCount(p) { let n = 0; for (const k in p.inv || {}) n += p.inv[k]; return n; },
  invAdd(p, id, n) {
    const H = HEALS[id]; if (!H) return false; p.inv = p.inv || {};
    const lim = Math.ceil(H.max * PACKS[p.pack | 0].cap); if ((p.inv[id] | 0) >= lim || this.invCount(p) >= this.invCap(p)) return false;
    p.inv[id] = (p.inv[id] | 0) + n; if (!p.sel || !p.inv[p.sel]) p.sel = id; return true;
  },
  invDrop(p, id) {
    if (!p.inv || !(p.inv[id] > 0) || p.heal) return; p.inv[id]--; if (!p.inv[id]) delete p.inv[id];
    const f = aimVec(p.m.yaw, 0, { x: 0, y: 0, z: 0 }), x = p.m.x + f.x * 1.1, z = p.m.z + f.z * 1.1; const l = this.lootAt('heal', x, this.floorY(x, z, p.m.y + .5), z); l.w = id; this.loot.push(l); this.lootVer++;
  },

  /* ---------------- vaca voadora ---------------- */
  initCow() {
    const B = this.map.bounds, r = this.rng, a = r.f() * TAU, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2, L = Math.hypot(B.x1 - B.x0, B.z1 - B.z0) / 2 - 10;
    const off = r.range(-.35, .35) * Math.min(B.x1 - B.x0, B.z1 - B.z0) / 2, px = -Math.sin(a) * off, pz = Math.cos(a) * off;
    this.cow = { x0: cx - Math.cos(a) * L + px, z0: cz - Math.sin(a) * L + pz, x1: cx + Math.cos(a) * L + px, z1: cz + Math.sin(a) * L + pz, f: 0, h: BR.cowH, st: 'wait', warn: 0 };
    const c = this.cow; const cl = (v, a, b) => Math.max(a + 6, Math.min(b - 6, v)); c.x0 = cl(c.x0, B.x0, B.x1); c.x1 = cl(c.x1, B.x0, B.x1); c.z0 = cl(c.z0, B.z0, B.z1); c.z1 = cl(c.z1, B.z0, B.z1); c.len = Math.hypot(c.x1 - c.x0, c.z1 - c.z0); c.yaw = Math.atan2(-(c.x1 - c.x0), -(c.z1 - c.z0)); c.x = c.x0; c.z = c.z0;
    let i = 0;
    for (const p of this.players) {
      p.onCow = true; p.chute = null; p.seat = i++; p.m.vx = p.m.vy = p.m.vz = 0; p.m.gnd = false; this.seatOnCow(p);
      if (p.bot) p.cowJump = r.range(.12, .82);
    }
  },
  seatOnCow(p) {
    const c = this.cow, k = p.seat | 0, row = (k % 10) - 4.5, col = Math.floor(k / 10) - 2, fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    p.m.x = c.x + fx * row * .9 + rx * col * 1.1; p.m.z = c.z + fz * row * .9 + rz * col * 1.1; p.m.y = c.h + 2.2;
  },
  stepCow(dt) {
    const c = this.cow; if (!c || c.st === 'done') return;
    if (this.phase === 'live') {
      if (c.st === 'wait') { c.st = 'fly'; this.emit({ t: 'cow', k: 'go' }); }
      c.f = Math.min(1, c.f + BR.cowSpeed * dt / c.len); c.x = lerp(c.x0, c.x1, c.f); c.z = lerp(c.z0, c.z1, c.f);
      const left = (1 - c.f) * c.len / BR.cowSpeed;
      if (left < 10 && c.warn < 1) { c.warn = 1; this.emit({ t: 'cow', k: 'warn', s: 10 }); }
      if (c.f >= 1) {
        /* fim da trajetória: quem ficou na vaca (AFK) é eliminado */
        for (const p of this.players) if (p.onCow) { p.onCow = false; this.damage(p, null, 999, 'vaca', 'body', p.m.x, p.m.y, p.m.z, { raw: true }); }
        c.st = 'done'; this.emit({ t: 'cow', k: 'end' });
      }
    }
  },
  /* jogador montado: segue a vaca; Espaço = saltar */
  stepRider(p, c, dt) {
    const cow = this.cow; if (!cow) { p.onCow = false; return; }
    this.seatOnCow(p); p.m.yaw = c.yaw; p.m.pitch = c.pitch;
    const jump = c.jump && !p.cowJumpHeld; p.cowJumpHeld = !!c.jump;
    const botGo = p.bot && cow.f >= (p.cowJump || .5);
    if (this.phase === 'live' && cow.st === 'fly' && (jump || botGo)) {
      p.onCow = false; p.chute = { t: 0, open: false }; const fx = -Math.sin(cow.yaw), fz = -Math.cos(cow.yaw);
      p.m.vx = fx * BR.cowSpeed * .6; p.m.vz = fz * BR.cowSpeed * .6; p.m.vy = 2; p.m.y -= 1.2;
      if (p.bot && p.ai) { const B = this.map.bounds; p.ai.landX = clamp(p.m.x + this.rng.range(-40, 40), B.x0 + 10, B.x1 - 10); p.ai.landZ = clamp(p.m.z + this.rng.range(-40, 40), B.z0 + 10, B.z1 - 10); }
      this.emit({ t: 'jumpcow', p: p.id });
    }
  }
});

/* paraquedas: física compartilhada (host e predição do cliente) */
function stepChute(p, c, W, dt, sim) {
  const m = p.m, ch = p.chute; ch.t += dt; m.yaw = c.yaw; m.pitch = c.pitch;
  if (!ch.open && ch.t > BR.freeFallT) ch.open = true;
  /* direção pelo WASD relativo à câmera */
  const sn = Math.sin(m.yaw), cs = Math.cos(m.yaw); let wx = -sn * c.mvf + cs * c.mvr, wz = -cs * c.mvf - sn * c.mvr; const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
  const sp = ch.open ? BR.chuteSpeed : 6, k = Math.min(1, dt * (ch.open ? 1.6 : 1));
  m.vx += (wx * sp - m.vx) * k; m.vz += (wz * sp - m.vz) * k;
  const tvy = ch.open ? -BR.chuteFall * (c.crouch ? 1.8 : 1) : -18; m.vy += (tvy - m.vy) * Math.min(1, dt * (ch.open ? 2.5 : 1.2));
  m.x = clamp(m.x + m.vx * dt, W.x0 + 1, W.x1 - 1); m.z = clamp(m.z + m.vz * dt, W.z0 + 1, W.z1 - 1); m.y += m.vy * dt;
  m.hspd = Math.hypot(m.vx, m.vz); m.gnd = false;
  const fl = floorAt(W, m.x, m.z, m.y + 0.5), wy = W.waterDepth(m.x, m.z) > 0 ? W.waterY - 1.3 : -1e9;
  if (m.y <= Math.max(fl, wy)) { m.y = Math.max(fl, wy); m.vy = 0; m.vx *= .3; m.vz *= .3; m.gnd = m.y === fl; p.chute = null; if (sim) sim.emit({ t: 'land', p: p.id }); }
}
