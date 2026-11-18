/* =====================================================================
   40_sim.js — simulação autoritativa (roda no host / offline). Sem DOM/GL.
   Jogadores, armas, balas (hitscan com compensação de lag), granadas,
   danos, mortes. Regras de rodada/bomba/loot em 41_rules.js.
   ===================================================================== */
'use strict';
const SHOT_HEARD = { galho: 62, estilingue: 34, vassoura: 105, colher: 50, porteira: 70 };
const SIMC = { HP: 100, NADE_G: 20, USE_R: 2.1, PICK_R: 2.0, HIST: 48, MAXLAG: 0.3, HITR: 0.36, HEADH: 0.32 };

/* ---------- comando de entrada (cliente → host) ---------- */
function blankCmd() { return { seq: 0, mvf: 0, mvr: 0, yaw: 0, pitch: 0, jump: false, crouch: false, sprint: false, fire: false, ads: false, use: false, acts: null, lag: 0 }; }
function cmdToWire(c) {
  const b = (c.jump ? 1 : 0) | (c.crouch ? 2 : 0) | (c.sprint ? 4 : 0) | (c.fire ? 8 : 0) | (c.ads ? 16 : 0) | (c.use ? 32 : 0);
  const a = [c.seq, Math.round(c.mvf * 10), Math.round(c.mvr * 10), Math.round(c.yaw * 10000) / 10000, Math.round(c.pitch * 10000) / 10000, b, Math.round(c.lag * 1000)];
  if (c.acts && c.acts.length) a.push(c.acts);
  return a;
}
function cmdFromWire(a) {
  const b = a[5] | 0;
  return { seq: a[0] | 0, mvf: clamp((a[1] || 0) / 10, -1, 1), mvr: clamp((a[2] || 0) / 10, -1, 1), yaw: +a[3] || 0, pitch: clamp(+a[4] || 0, -1.55, 1.55), jump: !!(b & 1), crouch: !!(b & 2), sprint: !!(b & 4), fire: !!(b & 8), ads: !!(b & 16), use: !!(b & 32), lag: clamp((a[6] || 0) / 1000, 0, SIMC.MAXLAG), acts: Array.isArray(a[7]) ? a[7].slice(0, 6) : null };
}

/* ---------- funções de arma compartilhadas (host + predição do cliente) ---------- */
const wTier = (p, id) => TIERS[(p.own && p.own[id]) | 0] || TIERS[0];
const wMagCap = (p, id) => Math.round(WEAPONS[id].mag * wTier(p, id).mg);
const wDmg = (p, id) => WEAPONS[id].dmg * wTier(p, id).dm;
const wReloadT = (p, id) => WEAPONS[id].reload * wTier(p, id).rl;
const isGun = id => { const t = WEAPONS[id] && WEAPONS[id].type; return t === 'auto' || t === 'semi' || t === 'bolt'; };
function moveMods(p, frozen) {
  const w = WEAPONS[p.w] || WEAPONS.faca;
  let spd = p.ads ? w.speed * (w.adsSpeed || 1) : w.speed;
  if (p.buff && p.buff.spd > 0) spd *= 1.25;
  if (p.heal) spd *= 0.5;
  if (p.slowT > 0) spd *= 0.3; if (p.mudT > 0) spd *= 0.55;   /* arapuca / lamaçal */
  return { spd, frozen: !!frozen || p.useT > 0 || !p.alive, noSprint: !!p.ads || p.throwT > 0 || !!p.heal };
}
function calcSpread(p, w) {
  const m = p.m; let mul = 1;
  mul *= 1 + (w.moveSpread - 1) * sat((m.hspd || 0) / PH.RUN);
  if (!m.gnd) mul *= w.airSpread;
  if (p.ads) mul *= w.adsMul; else if (w.scope) mul *= 40;
  if (m.cr > .5) mul *= w.crouchMul;
  return w.spread * mul + p.bloom;
}
function falloff(w, d) { if (d <= w.range0) return 1; if (d >= w.range1) return w.minMul; return lerp(1, w.minMul, (d - w.range0) / (w.range1 - w.range0)); }
function aimVec(yaw, pitch, o) { const cp = Math.cos(pitch); o.x = -Math.sin(yaw) * cp; o.y = Math.sin(pitch); o.z = -Math.cos(yaw) * cp; return o; }
function eyePos(p, o) { o.x = p.m.x; o.y = p.m.y + eyeH(p.m); o.z = p.m.z; return o; }

/* ---------- máquina de estados da arma ----------
   hooks: { shoot(p,w), melee(p,w,kind), startThrow(p), onReload(p), onSwitch(p) } */
function weaponTick(p, c, dt, hooks, canFire) {
  if (c.acts) for (const a of c.acts) weaponAct(p, a, hooks);
  if (p.cdT > 0) p.cdT -= dt;
  if (p.equipT > 0) p.equipT -= dt;
  if (p.throwT > 0) { p.throwT -= dt; if (p.throwT <= 0) { p.throwT = 0; hooks.throwNow && hooks.throwNow(p); } }
  if (p.windT > 0) { p.windT -= dt; if (p.windT <= 0) { p.windT = 0; hooks.melee && hooks.melee(p, WEAPONS.faca, 'stab'); } }
  const w = WEAPONS[p.w]; if (!w) return;
  p.bloom = Math.max(0, p.bloom - (w.bloomRec || 3) * dt);
  if (p.relT > 0) { p.relT -= dt; if (p.relT <= 0) { p.relT = 0; finishReload(p); } }
  p.ads = !!c.ads && isGun(p.w) && p.relT <= 0 && p.equipT <= 0 && canFire !== false;
  const edge = c.fire && !p.fireHeld; p.fireHeld = c.fire;
  const adsEdge = c.ads && !p.adsHeld; p.adsHeld = c.ads;
  p.shotsRun = (c.fire && p.cdT < 0.2) ? p.shotsRun : 0;
  if (canFire === false || !p.alive) return;
  if (p.equipT > 0 || p.throwT > 0 || p.windT > 0) return;
  switch (w.type) {
    case 'auto': if (c.fire) tryShoot(p, w, hooks); break;
    case 'semi': case 'bolt': if (edge) tryShoot(p, w, hooks); break;
    case 'melee':
      if (p.cdT <= 0) {
        if (edge) { p.cdT = w.cd; hooks.melee && hooks.melee(p, w, 'slash'); }
        else if (adsEdge) { p.cdT = w.stabCd; p.windT = w.stabWind; hooks.meleeStart && hooks.meleeStart(p, w, 'stab'); }
      }
      break;
    case 'nade': if (edge && p.cdT <= 0 && p.nades > 0) { p.cdT = w.cd; p.throwT = 0.32; hooks.startThrow && hooks.startThrow(p); } break;
  }
}
function tryShoot(p, w, hooks) {
  if (p.cdT > 0 || p.relT > 0) return;
  if ((p.mag[w.id] | 0) <= 0) { startReload(p, hooks); return; }
  p.mag[w.id]--; p.cdT += w.cd; if (p.cdT < 0) p.cdT = w.cd;
  p.shotsRun++;
  hooks.shoot && hooks.shoot(p, w);
  p.bloom = Math.min(w.bloomMax || 0, p.bloom + (w.bloomPer || 0));
  if (p.mag[w.id] <= 0 && (p.ammo[w.ammo] | 0) > 0) { /* recarga automática ao esvaziar */ p.autoRel = 0.25; }
}
function startReload(p, hooks) {
  const w = WEAPONS[p.w]; if (!w || !isGun(p.w) || p.relT > 0 || p.equipT > 0) return false;
  if ((p.mag[w.id] | 0) >= wMagCap(p, w.id) || (p.ammo[w.ammo] | 0) <= 0) return false;
  p.relT = p.relMax = wReloadT(p, w.id); p.ads = false;
  hooks && hooks.onReload && hooks.onReload(p, w);
  return true;
}
function finishReload(p) {
  const w = WEAPONS[p.w]; if (!w || !w.ammo) return;
  const need = wMagCap(p, w.id) - (p.mag[w.id] | 0), take = Math.min(need, p.ammo[w.ammo] | 0);
  p.mag[w.id] = (p.mag[w.id] | 0) + take; p.ammo[w.ammo] -= take;
}
function switchWeapon(p, id, hooks) {
  if (!WEAPONS[id] || p.w === id) return false;
  if (id !== 'batata' && id !== 'mandioca' && p.own[id] === undefined) return false;
  if (id === 'batata' && p.nades <= 0) return false;
  if (id === 'mandioca' && !p.hasBomb) return false;
  p.lastW = p.w; p.w = id; p.equipT = WEAPONS[id].equip; p.relT = 0; p.windT = 0; p.throwT = 0; p.ads = false; p.bloom = 0;
  hooks && hooks.onSwitch && hooks.onSwitch(p, id);
  return true;
}
function ownedSlots(p) { const r = []; for (const id of WSLOTS) { if (id === 'batata' ? p.nades > 0 : id === 'mandioca' ? p.hasBomb : p.own[id] !== undefined) r.push(id); } return r; }
function weaponAct(p, a, hooks) {
  if (a === 'r') startReload(p, hooks);
  else if (a[0] === 's' && a.length === 2) {
    const slot = HOTBAR[(+a[1]) - 1]; if (!slot) return; const own = slot.ids.filter(i => i === 'batata' ? p.nades > 0 : (p.own[i] !== undefined && (i !== 'mandioca' || p.hasBomb))); if (!own.length) return;
    const i = own.indexOf(p.w); switchWeapon(p, own[i < 0 ? 0 : (i + 1) % own.length], hooks);
  }
  else if (a.startsWith('w:')) { const id = a.slice(2); if (id === 'batata' ? p.nades > 0 : p.own[id] !== undefined) switchWeapon(p, id, hooks); }
  else if (a === 'w+' || a === 'w-') {
    const l = ownedSlots(p).filter(i => i !== 'mandioca' || p.hasBomb); if (!l.length) return;
    let i = l.indexOf(p.w); i = (i + (a === 'w+' ? 1 : l.length - 1)) % l.length; switchWeapon(p, l[i], hooks);
  } else if (a === 'lw') { if (p.lastW) switchWeapon(p, p.lastW, hooks); }
  else if (a === 'g') { if (p.nades > 0 && p.cdT <= 0 && p.throwT <= 0 && p.alive) { if (p.w !== 'batata') { p.preNade = p.w; switchWeapon(p, 'batata', hooks); p.autoThrow = true; } } }
  else hooks.act && hooks.act(p, a);
}

/* ---------- criação de jogador ---------- */
function newSimPlayer(info) {
  const N = SIMC.HIST;
  return {
    id: info.id, name: info.name || 'Peão', skin: info.skin | 0, cos: typeof cosClean === 'function' ? (info.cos ? cosClean(info.cos) : info.bot ? randomBotCos() : '') : '', bot: !!info.bot, party: String(info.party || '').slice(0, 16), fc: String(info.fc || '').slice(0, 8), bsq: 0, squad: info.squad | 0, team: T_NONE, token: info.token || '',
    alive: false, hp: SIMC.HP, armor: 0, vest: 0, helm: 0, pack: 0, m: newMoveState(0, 0, 0), cmd: blankCmd(), q: [], lastSeq: 0, stale: 0,
    own: {}, mag: {}, ammo: {}, w: 'faca', lastW: null, preNade: null, autoThrow: false, equipT: 0, cdT: 0, relT: 0, relMax: 0, bloom: 0, shotsRun: 0, throwT: 0, windT: 0, autoRel: 0,
    nades: 0, kits: 0, hasBomb: false, buff: { spd: 0, regen: 0 }, healT: 0, healAmt: 0, useK: '', useT: 0, useMax: 0, useLock: false, useHeld: false, fireHeld: false, adsHeld: false, ads: false,
    k: 0, d: 0, a: 0, hs: 0, dmg: 0, plants: 0, defuses: 0, score: 0, loadout: info.loadout || 'galho', dmgBy: {}, dieT: -99, place: 0, spawnT: 0, lastDmgT: -99,
    hist: { t: new Float32Array(N), x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N), cr: new Float32Array(N), i: 0, n: 0 },
    lag: 0, ping: 0, connected: true, left: false, local: !!info.local, ai: null, kills: 0, streak: 0, lastKillT: -99, multi: 0
  };
}
function pushHist(p, t) {
  const h = p.hist, N = SIMC.HIST; h.i = (h.i + 1) % N; h.t[h.i] = t; h.x[h.i] = p.m.x; h.y[h.i] = p.m.y; h.z[h.i] = p.m.z; h.cr[h.i] = p.m.cr; if (h.n < N) h.n++;
}
function rewindPos(p, T, o) {
  const h = p.hist, N = SIMC.HIST;
  if (!h.n || T >= h.t[h.i]) { o.x = p.m.x; o.y = p.m.y; o.z = p.m.z; o.cr = p.m.cr; return o; }
  let k = 0, idx = h.i;
  while (k < h.n && h.t[idx] > T) { k++; idx = (idx - 1 + N) % N; }
  if (k >= h.n) { idx = (h.i - h.n + 1 + N) % N; o.x = h.x[idx]; o.y = h.y[idx]; o.z = h.z[idx]; o.cr = h.cr[idx]; return o; }
  const nx = (idx + 1) % N, t0 = h.t[idx], t1 = h.t[nx], f = t1 > t0 ? sat((T - t0) / (t1 - t0)) : 0;
  o.x = h.x[idx] + (h.x[nx] - h.x[idx]) * f; o.y = h.y[idx] + (h.y[nx] - h.y[idx]) * f; o.z = h.z[idx] + (h.z[nx] - h.z[idx]) * f; o.cr = h.cr[idx] + (h.cr[nx] - h.cr[idx]) * f;
  return o;
}

/* ===================================================================== */
class Sim {
  constructor(o) {
    this.mode = o.mode || 'tatico'; this.map = o.map; this.W = o.map.W; this.M = MODES[this.mode];
    this.rng = new RNG(o.seed || ((Math.random() * 1e9) | 0));
    this.cfg = Object.assign({ rounds: 3, botLevel: 'normal', fill: true, ff: false, bots: 0, perTeam: 5 }, o.cfg || {});
    this.t = 0; this.tick = 0; this.players = []; this.byId = new Map(); this.nades = []; this.nid = 1;
    this.ev = []; this.phase = 'lobby'; this.pt = 0; this.round = 0; this.score = [0, 0]; this.swap = 0; this.clockOn = true;
    this.bomb = { st: 'none', x: 0, y: 0, z: 0, carrier: 0, timer: 0, site: '', lockT: 0, dchk: 0, defBy: 0, planter: 0, beep: 0 };
    this.loot = []; this.zone = null; this.over = false; this.winner = null; this.endInfo = null; this.nextId = 1; this.deadOrder = 0;
    this.tmpA = { x: 0, y: 0, z: 0 }; this.tmpB = { x: 0, y: 0, z: 0, cr: 0 }; this.tmpC = { x: 0, y: 0, z: 0 };
    this.hooks = this._makeHooks();
    this.matchT = 0; this.nav = o.nav || new NavGrid(o.map); this.sounds = []; this.nextSounds = []; this.pathBudget = 0; this.plan = null; this.lootVer = 0;
  }
  emit(e) { this.ev.push(e); }
  get(id) { return this.byId.get(id) || null; }
  addPlayer(info) {
    const p = newSimPlayer(Object.assign({ id: 'p' + (this.nextId++) }, info));
    p.wantFar = info.farmer || ''; p.farmer = ''; p.abC = [0, 0]; p.abx = 0;
    this.players.push(p); this.byId.set(p.id, p);
    if (p.bot) { p.ai = new BotBrain(p, BOT_LEVELS[this.cfg.botLevel] ? this.cfg.botLevel : 'normal'); p.name = p.name || pick(BOT_NAMES); }
    return p;
  }
  removePlayer(id) {
    const p = this.byId.get(id); if (!p) return;
    if (p.alive && this.phase !== 'lobby') { p.alive = false; p.hp = 0; if (this.bomb.carrier === p.id) this.dropBomb(p, true); }
    p.left = true; p.connected = false;
    this.players = this.players.filter(q => q !== p); this.byId.delete(id);
    this.emit({ t: 'left', id });
  }
  teamOf(p) { return this.mode === 'tatico' ? (((p.squad ^ this.swap) === 0) ? T_ATK : T_DEF) : T_NONE; }
  isEnemy(a, b) { return a !== b && (this.mode !== 'tatico' ? !(a.bsq && a.bsq === b.bsq) : (a.team !== b.team || this.cfg.ff)); }
  alive() { return this.players.filter(p => p.alive); }

  /* ---------- equipamento ---------- */
  giveWeapon(p, id, tier, fill) {
    const w = WEAPONS[id]; tier = tier | 0;
    p.own[id] = tier;
    if (w.ammo) { p.mag[id] = wMagCap(p, id); if (fill !== false) p.ammo[w.ammo] = Math.min(Math.round(AMMO_TYPES[w.ammo].cap * PACKS[p.pack].cap), (p.ammo[w.ammo] | 0) + w.res); }
  }
  loadout(p, keep) {
    p.hasBomb = false; p.buff = { spd: 0, regen: 0 }; p.healT = 0; p.heal = null;
    if (this.mode === 'tatico') {
      if (keep) {
        /* sobreviveu: mantém armas, munição e colete (estilo CS) */
        if (p.own.faca === undefined) p.own.faca = 0; if (p.own.estilingue === undefined) this.giveWeapon(p, 'estilingue', 0);
        delete p.own.mandioca; p.w = PRIMARIES.find(i => p.own[i] !== undefined) || 'estilingue';
      } else {
        p.own = {}; p.mag = {}; p.ammo = {}; p.nades = 0; p.vest = 0; p.armor = 0; p.helm = 0; p.pack = 0; p.pano = 0; p.caixa = 0;
        this.giveWeapon(p, 'estilingue', 0); p.own.faca = 0; p.w = 'estilingue';
      }
    } else {
      p.own = {}; p.mag = {}; p.ammo = {}; p.kits = 0; p.inv = {}; p.sel = '';
      p.vest = 0; p.armor = 0; p.helm = 0; p.pack = 0; p.own.faca = 0; p.nades = 0; p.w = 'faca';
    }
    p.equipT = 0.5; p.cdT = 0; p.relT = 0; p.bloom = 0; p.throwT = 0; p.windT = 0; p.ads = false; p.lastW = null;
  }
  setLoadout(p, id) { /* sem efeito: armas agora são compradas (5x5) ou coletadas (BR) */ }

  /* ---------- hooks de arma (lado host) ---------- */
  _makeHooks() {
    const S = this;
    return {
      shoot(p, w) { S.fireGun(p, w); },
      melee(p, w, kind) { S.meleeHit(p, w, kind); },
      meleeStart(p, w, kind) { S.emit({ t: 'mst', p: p.id, k: kind }); },
      startThrow(p) { S.emit({ t: 'thr', p: p.id }); },
      throwNow(p) { S.throwNade(p); },
      onReload(p, w) { S.emit({ t: 'rel', p: p.id, w: w.id, d: p.relMax }); },
      onSwitch(p, id) { S.emit({ t: 'sw', p: p.id, w: id }); },
      act(p, a) { S.playerAct(p, a); }
    };
  }
  fireGun(p, w) {
    p.shots = (p.shots | 0) + 1; this._hitThisShot = false;
    const n = w.pellets || 1; for (let i = 0; i < n; i++) this.firePellet(p, w, i);
    if (this._hitThisShot) p.hits = (p.hits | 0) + 1;
  }
  firePellet(p, w, pi) {
    const o = eyePos(p, this.tmpA), m = p.m;
    const f = aimVec(m.yaw, m.pitch, this.tmpC), sp = calcSpread(p, w) * DEG;
    /* cone de dispersão uniforme */
    const rho = Math.tan(sp) * Math.sqrt(this.rng.f()), th = this.rng.f() * TAU, ca = Math.cos(th) * rho, sa = Math.sin(th) * rho;
    const sy = Math.sin(m.yaw), cy = Math.cos(m.yaw), sp2 = Math.sin(m.pitch), cp = Math.cos(m.pitch);
    let dx = f.x + cy * ca + sy * sp2 * sa, dy = f.y + cp * sa, dz = f.z - sy * ca + cy * sp2 * sa;
    const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
    const ox = o.x + dx * 0.15, oy = o.y + dy * 0.15, oz = o.z + dz * 0.15;
    if (!pi) this.nextSounds.push({ x: o.x, z: o.z, p: p.id, r: SHOT_HEARD[w.id] || 55 });
    const maxT = Math.max(w.range1 * 1.6, 80);
    const T = this.t - (p.bot || p.local ? 0 : clamp(p.lag, 0, SIMC.MAXLAG));
    const h = this.hitscan(p, ox, oy, oz, dx, dy, dz, maxT, T);
    let ex, ey, ez, kind = 'none', nx = 0, ny = 1, nz = 0, mat = '', vid = '', zone = '';
    if (h) {
      ex = ox + dx * h.t; ey = oy + dy * h.t; ez = oz + dz * h.t; kind = h.k;
      if (h.k === 'world') { nx = h.nx; ny = h.ny; nz = h.nz; mat = h.mat; if (h.ab) this.damageAbx(h.ab, wDmg(p, w.id) * falloff(w, h.t), p); }
      else {
        vid = h.q.id; zone = h.zone; let d = wDmg(p, w.id) * falloff(w, h.t);
        d *= zone === 'head' ? w.head : zone === 'leg' ? w.leg : 1;
        this.damage(h.q, p, d, w.id, zone, ex, ey, ez); this._hitThisShot = true;
      }
    } else { ex = ox + dx * maxT; ey = oy + dy * maxT; ez = oz + dz * maxT; }
    this.emit({ t: 'shot', p: p.id, w: w.id, e: [r2(ex), r2(ey), r2(ez)], k: kind === 'player' ? 1 : kind === 'world' ? 2 : 0, n: [r2(nx), r2(ny), r2(nz)], mat, v: vid, z: zone, pi: pi | 0 });
  }
  hitscan(p, ox, oy, oz, dx, dy, dz, maxT, T) {
    const wh = this.W.raycast(ox, oy, oz, dx, dy, dz, maxT, true);
    let bt = wh ? wh.t : maxT, res = wh ? { k: 'world', t: wh.t, nx: wh.nx, ny: wh.ny, nz: wh.nz, mat: wh.kind, ab: wh.obj && wh.obj.ab } : null;
    const R = SIMC.HITR, tmp = this.tmpB, a = dx * dx + dz * dz;
    for (const q of this.players) {
      if (q === p || !q.alive || !this.isEnemy(p, q)) continue;
      rewindPos(q, T, tmp);
      const h = PH.H + (PH.HC - PH.H) * tmp.cr;
      let t;
      if (a < 1e-9) { /* tiro vertical */
        if (Math.hypot(ox - tmp.x, oz - tmp.z) > R) continue;
        t = dy > 0 ? (tmp.y - oy) / dy : (tmp.y + h - oy) / dy; if (t < 0) continue;
      } else {
        const ex = ox - tmp.x, ez = oz - tmp.z, b = ex * dx + ez * dz, c = ex * ex + ez * ez - R * R, disc = b * b - a * c;
        if (disc < 0) continue;
        const sq = Math.sqrt(disc); t = (-b - sq) / a; if (t < 0) { if (c > 0) continue; t = 0; }
        let hy = oy + dy * t;
        if (hy > tmp.y + h || hy < tmp.y) { /* entra pela tampa? */
          const t2 = dy !== 0 ? ((hy > tmp.y + h ? tmp.y + h : tmp.y) - oy) / dy : -1;
          if (t2 < t || t2 > (-b + sq) / a) continue; t = t2; hy = oy + dy * t;
        }
      }
      if (t >= bt) continue;
      const hy = oy + dy * t, rel = hy - tmp.y;
      const lat = a > 1e-9 ? Math.abs((ox - tmp.x) * dz - (oz - tmp.z) * dx) / Math.sqrt(a) : 0;
      let zone = 'body';
      if (rel > h - SIMC.HEADH && lat < 0.27) zone = 'head'; else if (rel < 0.72) zone = 'leg';
      bt = t; res = /** @type {any} */ ({ k: 'player', q, zone, t });
    }
    return res;
  }
  meleeHit(p, w, kind) {
    if (!p.alive) return;
    const o = eyePos(p, this.tmpA), f = aimVec(p.m.yaw, p.m.pitch, this.tmpC);
    let best = null, bd = w.range + 0.4;
    for (const q of this.players) {
      if (q === p || !q.alive || !this.isEnemy(p, q)) continue;
      /* cápsula do alvo (pés→cabeça) contra o raio da lâmina: acerta de perto, agachado ou mirando na cabeça */
      const top = q.m.y + (q.m.cr > .5 ? 1.25 : 1.75); let hit = 1e9, ht = 0, hy = q.m.y + 1;
      for (let k = 0; k <= 8; k++) {
        const py = q.m.y + 0.15 + (top - q.m.y - 0.15) * k / 8, cx = q.m.x - o.x, cy = py - o.y, cz = q.m.z - o.z;
        const t = Math.max(0, Math.min(w.range, cx * f.x + cy * f.y + cz * f.z)), ex = cx - f.x * t, ey = cy - f.y * t, ez = cz - f.z * t, pd = Math.hypot(ex, ey, ez);
        if (pd < hit) { hit = pd; ht = t; hy = py; }
      }
      if (hit > 0.62) continue;
      if (!this.W.los(o.x, o.y, o.z, q.m.x, hy, q.m.z)) continue;
      if (ht < bd) { bd = ht; best = q; }
    }
    if (!best) { this.emit({ t: 'mhit', p: p.id, k: kind, v: '', x: o.x + f.x * 1.6, y: o.y + f.y * 1.6, z: o.z + f.z * 1.6 }); return; }
    /* facada pelas costas: a vítima olha na mesma direção que o ataque */
    const vf = aimVec(best.m.yaw, 0, { x: 0, y: 0, z: 0 }), back = (vf.x * f.x + vf.z * f.z) > 0.35;
    let d = (kind === 'stab' ? w.stab : w.dmg) * wTier(p, 'faca').dm * (back ? w.back : 1);
    this.emit({ t: 'mhit', p: p.id, k: kind, v: best.id, x: best.m.x, y: best.m.y + 1.1, z: best.m.z, back });
    this.damage(best, p, d, 'faca', back ? 'head' : 'body', best.m.x, best.m.y + 1.1, best.m.z, { raw: true });
  }

  /* ---------- dano / morte ---------- */
  damage(v, a, amt, wid, zone, x, y, z, opt) {
    if (!v.alive || this.phase !== 'live') return 0;
    opt = opt || {};
    if (a && a !== v && !this.isEnemy(a, v)) return 0;
    let d = amt;
    if (!opt.raw) {
      if (zone === 'head') { const hm = HELMETS[v.helm]; if (hm) d *= 1 - hm.red; }
      else if (VESTS[v.vest] && v.armor > 0) { const ab = Math.min(v.armor, d * VESTS[v.vest].red); v.armor -= ab; d -= ab; }
    }
    d = Math.max(0, d); if (d <= 0) return 0;
    v.hp -= d; v.lastDmgT = this.t; if (v.heal && wid !== 'zona') this.cancelHeal(v, 'dano');
    if (a && a !== v) { a.dmg += d; a.roundDmg = (a.roundDmg || 0) + d; v.dmgBy[a.id] = (v.dmgBy[a.id] || 0) + d; }
    this.emit({ t: 'hit', v: v.id, a: a ? a.id : '', d: Math.round(d), z: zone || 'body', w: wid, x: r2(x), y: r2(y), z2: r2(z), hp: Math.max(0, Math.round(v.hp)) });
    if (v.hp <= 0) this.kill(v, a, wid, zone);
    return d;
  }
  kill(v, a, wid, zone) {
    if (!v.alive) return;
    if (v.useK) this.cancelUse(v);
    v.alive = false; v.hp = 0; v.d++; v.dieT = this.t; v.useT = 0; v.useK = ''; v.m.vx *= 0.3; v.m.vz *= 0.3; v.ads = false; v.relT = 0; v.throwT = 0; v.windT = 0;
    const self = !a || a === v;
    if (!self) {
      a.k++; a.score += zone === 'head' ? 150 : 100; if (zone === 'head') a.hs++; a.roundK = (a.roundK | 0) + 1;
      if (this.t - a.lastKillT < 4.2) a.multi++; else a.multi = 1; a.lastKillT = this.t; a.streak++;
      if (this.isEnemy(a, v)) this.addMoney(a, KILL_MONEY[wid] || ECON.kill);
    }
    v.streak = 0;
    for (const id in v.dmgBy) { const q = this.byId.get(id); if (q && q !== a && q !== v && v.dmgBy[id] >= 35 && this.isEnemy(q, v)) { q.a++; q.score += 25; } }
    v.dmgBy = {};
    if (v.heal) this.cancelHeal(v, 'morte'); v.onCow = false; v.chute = null;
    if (v.hasBomb || this.bomb.carrier === v.id) this.dropBomb(v, true);
    if (this.mode === 'caos') { if ((this.cfg.squad | 0) > 1) { const S = this.aliveSquads(); v.place = S.size + (S.has(v.bsq) ? 0 : 1); } else v.place = this.alive().length + 1; this.dropLootOf(v); }
    let solo = 0, ace = 0;
    if (!self) {
      if (this.mode === 'tatico') { const mates = this.players.filter(q => q.alive && q.team === a.team).length, foes = this.players.filter(q => q.alive && q.team !== a.team).length; solo = mates === 1 && foes >= 1 ? 1 : 0; ace = a.roundK >= 5 ? 1 : 0; }
      else { const al = this.players.filter(q => q.alive).length; ace = al === 1 ? 1 : 0; }
    }
    this.emit({ t: 'kill', v: v.id, a: self ? '' : a.id, w: wid, hs: zone === 'head', m: self ? 0 : a.multi, solo, ace, x: r2(v.m.x), y: r2(v.m.y), z: r2(v.m.z) });
  }

  /* ---------- granadas ---------- */
  throwNade(p) {
    if (!p.alive || p.nades <= 0) return;
    p.nades--;
    const w = WEAPONS.batata, o = eyePos(p, this.tmpA), m = p.m;
    const f = aimVec(m.yaw, clamp(m.pitch + 0.14, -1.4, 1.4), this.tmpC);
    const n = { id: this.nid++, o: p.id, x: o.x + f.x * 0.5, y: o.y - 0.15 + f.y * 0.5, z: o.z + f.z * 0.5, vx: f.x * w.throwV + m.vx * 0.7, vy: f.y * w.throwV + m.vy * 0.3 + 1.2, vz: f.z * w.throwV + m.vz * 0.7, fuse: w.fuse, rest: false, bn: 0, sq: this.rng.f() * 6 };
    const tmp = { nx: 0, ny: 1, nz: 0 };
    /* não nascer dentro de parede */
    if (this.W.sphereCollide(n, 0.2, tmp)) { n.vx *= 0.3; n.vz *= 0.3; }
    this.nades.push(n); this.emit({ t: 'nade', id: n.id, p: p.id });
    if (p.nades <= 0 && p.w === 'batata') { this.afterThrowSwitch(p); }
    else if (p.preNade) this.afterThrowSwitch(p);
  }
  afterThrowSwitch(p) {
    const back = p.preNade && p.own[p.preNade] !== undefined ? p.preNade : (ownedSlots(p).find(i => isGun(i)) || 'faca');
    p.preNade = null; p.autoThrow = false; switchWeapon(p, back, null); p.equipT = 0.3;
  }
  stepNades(dt) {
    const g = SIMC.NADE_G, W = this.W, tmp = { nx: 0, ny: 1, nz: 0, kind: '' };
    for (let i = this.nades.length - 1; i >= 0; i--) {
      const n = this.nades[i]; n.fuse -= dt;
      if (!n.rest) {
        n.vy -= g * dt;
        const steps = 2, h = dt / steps;
        for (let s = 0; s < steps; s++) {
          n.x += n.vx * h; n.y += n.vy * h; n.z += n.vz * h;
          if (n.x < W.x0 + 0.3 || n.x > W.x1 - 0.3) { n.x = clamp(n.x, W.x0 + 0.3, W.x1 - 0.3); n.vx *= -0.4; }
          if (n.z < W.z0 + 0.3 || n.z > W.z1 - 0.3) { n.z = clamp(n.z, W.z0 + 0.3, W.z1 - 0.3); n.vz *= -0.4; }
          if (W.sphereCollide(n, 0.2, tmp)) {
            const vn = n.vx * tmp.nx + n.vy * tmp.ny + n.vz * tmp.nz;
            if (vn < 0) {
              const e = tmp.kind === 'water' ? 0.1 : 0.42;
              n.vx -= (1 + e) * vn * tmp.nx; n.vy -= (1 + e) * vn * tmp.ny; n.vz -= (1 + e) * vn * tmp.nz;
              const f = 1 - 0.18 * Math.abs(tmp.ny > 0.5 ? 1 : 0.4); n.vx *= f; n.vz *= f;
              if (-vn > 2.5) { n.bn++; this.emit({ t: 'bnc', x: r2(n.x), y: r2(n.y), z: r2(n.z) }); }
            }
            if (tmp.ny > 0.6 && Math.hypot(n.vx, n.vy, n.vz) < 1.4) { n.rest = true; n.vx = n.vy = n.vz = 0; }
          }
        }
        if (W.waterDepth(n.x, n.z) > 0.25 && n.y < W.waterY + 0.1) { n.vx *= 0.9; n.vz *= 0.9; n.vy *= 0.7; if (Math.hypot(n.vx, n.vz) < 1) n.rest = true; }
      }
      if (n.fuse <= 0 && n.k && n.k !== 'batata') { this.nades.splice(i, 1); this.nadeEffect(n); continue; }
      if (n.fuse <= 0) { this.nades.splice(i, 1); this.explode(n.x, n.y + 0.1, n.z, WEAPONS.batata.radius, WEAPONS.batata.dmg, this.byId.get(n.o) || null, 'batata', 1.0, false); }
    }
  }
  /* explosão genérica; big=true → mandioca (bomba) */
  explode(x, y, z, R, D, owner, wid, size, big) {
    this.nextSounds.push({ x, z, p: owner ? owner.id : '', r: big ? 140 : 70 });
    this.emit({ t: 'boom', x: r2(x), y: r2(y), z: r2(z), r: R, big: !!big, w: wid });
    const W = this.W;
    if (this.abx) for (const e of this.abx.slice()) if (e.hp && Math.hypot(e.x - x, e.z - z) < R) this.damageAbx(e, D * 0.7, owner);
    for (const q of this.players) {
      if (!q.alive) continue;
      const cx = q.m.x, cy = q.m.y + 0.9, cz = q.m.z, dx = cx - x, dy = cy - y, dz = cz - z, d = Math.hypot(dx, dy, dz);
      if (d > R) continue;
      let vis = W.los(x, y + 0.15, z, cx, cy + 0.35, cz) || W.los(x, y + 0.15, z, cx, q.m.y + 0.3, cz);
      let mul = vis ? 1 : (big ? 0.38 : 0);
      if (mul <= 0) continue;
      const f = 1 - d / R, dmg = D * Math.pow(f, big ? 1.15 : 1.6) * mul;
      /* impulso */
      const hl = Math.hypot(dx, dz) || 1, kb = (big ? 16 : 9) * f * mul;
      q.m.vx += dx / hl * kb; q.m.vz += dz / hl * kb; q.m.vy = Math.max(q.m.vy, (big ? 7 : 4.5) * f * mul); if (kb > 1.5) q.m.gnd = false;
      if (owner && q === owner && !big) { this.damage(q, owner, dmg * 0.5, wid, 'body', cx, cy, cz, { raw: true }); }
      else if (owner && q !== owner && !this.isEnemy(owner, q)) continue;
      else this.damage(q, owner || null, dmg, wid, 'body', cx, cy, cz, { raw: big });
    }
    /* outras batatas próximas reagem (efeito dominó) */
    for (const n of this.nades) { const d = Math.hypot(n.x - x, n.y - y, n.z - z); if (d < R * 0.7 && d > 0.01) { n.rest = false; n.vx += (n.x - x) / d * 8; n.vz += (n.z - z) / d * 8; n.vy += 5; } }
  }

  /* ---------- ações (E, Q, H, comprar) ---------- */
  playerAct(p, a) {
    if (!p.alive) return;
    if (a === 'q') { if (this.mode === 'tatico' && p.hasBomb && this.bomb.st === 'carried') this.dropBomb(p, false); }
    else if (a === 'h') { if (this.mode === 'tatico') this.startHeal(p, p.pano && p.panoR !== this.round ? 'pano' : 'caixa'); else if (p.sel) this.startHeal(p, p.sel); else this.deny(p, 'Selecione uma cura na mochila (I).'); }
    else if (a.startsWith('buy:')) { const id = a.slice(4); if (id === 'hab0' || id === 'hab1') this.buyAbility(p, +id[3]); else this.buy(p, id); }
    else if (/^ab:[0-3]$/.test(a)) this.useAbility(p, +a[3]);
    else if (a.startsWith('far:')) this.pickFarmer(p, a.slice(4));
    else if (a.startsWith('sell:')) this.sell(p, a.slice(5));
    else if (a.startsWith('use:')) { const id = a.slice(4); if (HEALS[id]) { p.sel = id; this.startHeal(p, id); } }
    else if (a.startsWith('sel:')) { const id = a.slice(4); if (p.inv && p.inv[id] > 0) p.sel = id; }
    else if (a.startsWith('drop:')) { const id = a.slice(5); if (HEALS[id]) this.invDrop(p, id); else if (p.own[id] !== undefined && this.mode === 'caos') { const cw = p.w; p.w = id; this.dropWeapon(p); if (cw !== id && p.own[cw] !== undefined) p.w = cw; } }
    else if (a === 'hc') this.cancelHeal(p, 'cancel');
    else if (a.startsWith('b:')) { this.setLoadout(p, a.slice(2)); }
    else if (a === 'x') { this.dropWeapon(p); }
    else if (a.startsWith('em:')) { const id = a.slice(3); if (EMOTE_IDS.includes(id) && (!p.emT || this.t - p.emT > 1.2)) { p.emT = this.t; this.emit({ t: 'emote', id: p.id, e: id }); } }
  }


  /* ---------- passo de tempo ---------- */
  step() {
    const dt = DT; this.t += dt; this.tick++; this.sounds = this.nextSounds; this.nextSounds = []; this.pathBudget = 3;
    if (this.phase !== 'lobby') this.matchT += dt;
    this.stepPhase(dt);
    if (this.mode === 'tatico' && this.barrier) setBarrier(this.W, this.barrier, this.phase === 'prep');   /* colisão das barreiras sempre igual à fase */
    /* compra: ninguém atira nem causa dano; no 5x5 todos andam (as barreiras seguram o ataque no spawn) */
    const frozenAll = this.phase === 'prep' || this.phase === 'lobby' || this.phase === 'select' || this.phase === 'loading', moveFrozen = frozenAll && !(this.mode === 'tatico' && this.phase === 'prep');
    for (const p of this.players) this.stepOne(p, dt, frozenAll, moveFrozen);
    this.separate();
    this.stepNades(dt);
    this.stepAbilities(dt);
    this.stepRules(dt);
  }
  /* colisão entre personagens: cilindros de 0,36 m — ninguém atravessa nem fica sobreposto */
  separate() {
    const L = this.players, W = this.W, R2 = 0.72;
    for (let i = 0; i < L.length; i++) {
      const a = L[i]; if (!a.alive) continue;
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j]; if (!b.alive) continue;
        let dx = b.m.x - a.m.x, dz = b.m.z - a.m.z; if (Math.abs(dx) > R2 || Math.abs(dz) > R2 || Math.abs(b.m.y - a.m.y) > 1.6) continue;
        let d = Math.hypot(dx, dz); if (d >= R2) continue; if (d < 1e-4) { dx = 1; dz = 0; d = 1e-4; }
        const push = (R2 - d) / 2, nx = dx / d, nz = dz / d;
        const ax = a.m.x - nx * push, az = a.m.z - nz * push, bx = b.m.x + nx * push, bz = b.m.z + nz * push;
        if (!W.solidAt(ax, a.m.y + .5, az)) { a.m.x = ax; a.m.z = az; }
        if (!W.solidAt(bx, b.m.y + .5, bz)) { b.m.x = bx; b.m.z = bz; }
      }
    }
  }
  /* anti-AFK (5x5): parado 45 s numa rodada valendo → aviso; 75 s → um bot assume até o jogador voltar a mexer */
  afkCheck(p, c, dt) {
    /* girar a câmera só conta durante a rodada valendo (no início da rodada o cliente realinha a visão sozinho) */
    const look = this.phase === 'live' && ((p.afkYaw !== undefined && Math.abs(c.yaw - p.afkYaw) > .03) || (p.afkPitch !== undefined && Math.abs(c.pitch - p.afkPitch) > .03));
    const act = c.mvf || c.mvr || c.fire || c.jump || c.ads || c.use || c.crouch || (c.acts && c.acts.length) || look;
    p.afkYaw = c.yaw; p.afkPitch = c.pitch;
    if (act) { if (p.afk) { p.afk = false; p.afkAi = null; this.emit({ t: 'afk', p: p.id, k: 'back' }); } p.idleT = 0; p.afkWarn = false; return c; }
    if (this.phase === 'live' && p.alive) p.idleT = (p.idleT || 0) + dt;
    if (!p.afkWarn && p.idleT >= AFK.warn) { p.afkWarn = true; this.emit({ t: 'afk', p: p.id, k: 'warn', s: AFK.bot - AFK.warn }); }
    if (!p.afk && p.idleT >= AFK.bot) { p.afk = true; p.afkAi = new BotBrain(p, BOT_LEVELS[this.cfg.botLevel] ? this.cfg.botLevel : 'normal'); p.afkCmd = blankCmd(); p.afkN = (p.afkN | 0) + 1; this.emit({ t: 'afk', p: p.id, k: 'bot' }); }
    if (p.afk && p.alive && p.afkAi) { const raw = p.cmd; p.cmd = p.afkCmd; p.afkAi.think(this, p, dt); p.cmd = raw; return p.afkCmd; }
    return c;
  }
  stepOne(p, dt, frozenAll, moveFrozen) {
    if (moveFrozen === undefined) moveFrozen = frozenAll;
    let c;
    if (p.bot) { if (p.alive && p.ai) { p.ai.think(this, p, dt); } c = p.cmd; }
    else if (p.local) c = p.cmd;
    else {
      /* consome a fila de comandos da rede */
      if (p.q.length > 4) { const keep = p.q.pop(); const acts = []; for (const q of p.q) if (q.acts) acts.push(...q.acts); if (acts.length) keep.acts = (keep.acts || []).concat(acts); p.q.length = 0; p.q.push(keep); }
      if (p.q.length) { c = p.q.shift(); p.cmd = c; p.stale = 0; p.lastSeq = c.seq; p.lag = c.lag; }
      else { c = p.cmd; p.stale++; if (p.stale > 6) { c = Object.assign({}, c, { mvf: 0, mvr: 0, jump: false, fire: false, ads: false, use: false, acts: null }); } else c = Object.assign({}, c, { acts: null }); }
    }
    if (!p.bot && this.mode === 'tatico' && this.cfg.afk && c) c = this.afkCheck(p, c, dt);
    if ((this.phase === 'select' || this.phase === 'loading') && c && c.acts) { for (const a of c.acts) this.flowAct(p, a); return; }
    if (!p.alive) { if (p.buff) { p.buff.spd = 0; } this.settleCorpse(p, dt); pushHist(p, this.t); return; }
    if (p.buff.spd > 0) p.buff.spd -= dt;
    if (p.buff.regen > 0) { p.buff.regen -= dt; p.hp = Math.min(SIMC.HP, p.hp + 3 * dt); }
    if (p.onCow) { this.stepRider(p, c, dt); pushHist(p, this.t); return; }
    if (p.chute) { stepChute(p, c, this.W, dt, this); pushHist(p, this.t); return; }
    p.ads = !!c.ads && isGun(p.w) && !p.heal;
    if (p.dashT > 0 && !moveFrozen) { p.m.vx = p.dashX * 22; p.m.vz = p.dashZ * 22; }   /* Investida do Boi */
    stepPlayer(p.m, c, moveMods(p, moveFrozen), this.W, dt);
    /* guarda de área jogável (servidor): quem sair da área do mapa competitivo ou ficar em pé alto demais (telhados/muros)
       volta para a última posição válida — vale para qualquer caminho, inclusive empurrões de explosão ou falhas de rede */
    if (this.map.inPlay) {
      const m = p.m, hg = m.y - this.W.heightAt(m.x, m.z), bad = !this.map.inPlay(m.x, m.z) || (m.gnd && hg > (this.map.maxStand || 3.4));
      if (!bad) { if (m.gnd) { p.safe = p.safe || {}; p.safe.x = m.x; p.safe.y = m.y; p.safe.z = m.z; } p.badT = 0; }
      else if ((p.badT = (p.badT || 0) + dt) > .25 && p.safe) { m.x = p.safe.x; m.y = p.safe.y; m.z = p.safe.z; m.vx = m.vz = m.vy = 0; p.badT = 0; this.emit({ t: 'oob', p: p.id }); }
    }
    if (this.mode === 'tatico' && this.map.tacB) { const T = this.map.tacB; if (p.m.x < T.x0) p.m.x = T.x0; else if (p.m.x > T.x1) p.m.x = T.x1; if (p.m.z < T.z0) p.m.z = T.z0; else if (p.m.z > T.z1) p.m.z = T.z1; }
    this.stepHeal(p, dt);
    /* fôlego: cabeça debaixo d'água gasta, superfície recupera; sem fôlego = afoga */
    const under = p.m.swim && p.m.y + eyeH(p.m) < this.W.waterY - 0.05; p.breath = under ? Math.max(0, (p.breath === undefined ? 10 : p.breath) - dt) : Math.min(10, (p.breath === undefined ? 10 : p.breath) + dt * 2.5);
    if (p.breath <= 0 && ((this.tick + 7) % 30) === 0) this.damage(p, null, 8, 'agua', 'body', p.m.x, p.m.y, p.m.z, { raw: true });
    if (p.m.landV > 11) { const dmg = (p.m.landV - 11) * 7; if (dmg > 1) this.damage(p, null, dmg, 'queda', 'leg', p.m.x, p.m.y, p.m.z, { raw: true }); }
    /* armas */
    const canFire = !frozenAll && p.useT <= 0 && p.m.mant <= 0 && !p.m.swim && !p.heal && !(p.detainT > 0);
    weaponTick(p, c, dt, this.hooks, canFire);
    if (p.autoRel > 0) { p.autoRel -= dt; if (p.autoRel <= 0) startReload(p, this.hooks); }
    if (p.autoThrow && p.w === 'batata' && p.equipT <= 0 && p.throwT <= 0) { p.autoThrow = false; if (p.nades > 0) { p.cdT = 0; p.throwT = 0.32; this.emit({ t: 'thr', p: p.id }); } }
    this.handleUse(p, c, dt);
    pushHist(p, this.t);
  }
  settleCorpse(p, dt) {
    const m = p.m; if (m.gnd && Math.hypot(m.vx, m.vz) < 0.05) return;
    m.vx *= Math.max(0, 1 - 6 * dt); m.vz *= Math.max(0, 1 - 6 * dt);
    stepPlayer(m, blankCmd(), { frozen: true }, this.W, dt);
  }

  /* ---------- helpers de spawn ---------- */
  spawnPoint(p, idx) {
    const S = this.map.spawns; let list = this.mode === 'tatico' ? (p.team === T_ATK ? S.atk : S.def) : S.ffa;
    let s;
    if (this.mode === 'tatico') s = list[idx % list.length];
    else if (list && list.length) s = list[(idx * 7 + this.rng.int(0, list.length - 1)) % list.length];
    else {
      const B = this.map.bounds;
      for (let k = 0; k < 80; k++) {
        const x = this.rng.range(B.x0 + 10, B.x1 - 10), z = this.rng.range(B.z0 + 10, B.z1 - 10);
        if (this.W.waterDepth(x, z) > 0 || this.W.solidAt(x, this.W.heightAt(x, z) + 0.9, z)) continue;
        s = { x, z, yaw: this.rng.range(0, TAU) }; break;
      }
      if (!s) s = { x: 0, z: 0, yaw: 0 };
    }
    return s;
  }
  placeAt(p, s) {
    const m = p.m = newMoveState(s.x, 0, s.z);
    m.y = this.W.heightAt(s.x, s.z); m.yaw = s.yaw || 0; m.pitch = 0; m.gnd = true;
    p.cmd = blankCmd(); p.cmd.yaw = m.yaw; p.q.length = 0;
    p.hist.n = 0; pushHist(p, this.t);
  }
  floorY(x, z, y0) {
    this.W.query(x, z, 0.3); let f = this.W.heightAt(x, z);
    for (const b of this.W.qb) { if (b.y1 <= y0 + 0.6 && b.y1 > f && x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) f = b.y1; }
    return f;
  }

  /* ---------- snapshot (host → clientes) ---------- */
  snapPlayer(p) {
    const m = p.m, rel = p.relT > 0 ? Math.round(100 * (1 - p.relT / Math.max(0.01, p.relMax))) : -1;
    const fl = (p.alive ? 1 : 0) | (m.slideT > 0 ? 2 : 0) | (m.gnd ? 0 : 4) | (p.ads ? 8 : 0) | (p.hasBomb ? 16 : 0) | (p.throwT > 0 ? 32 : 0) | (p.windT > 0 ? 64 : 0) | (p.useT > 0 ? 128 : 0) | (m.mant > 0 ? 256 : 0) | (p.connected ? 0 : 512) | (m.swim ? 1024 : 0) | (p.chute ? (p.chute.open ? 6144 : 2048) : 0) | (p.onCow ? 8192 : 0) | (p.heal ? 16384 : 0) | (p.revT > 0 ? 32768 : 0);
    return [p.id, r2(m.x), r2(m.y), r2(m.z), r3(m.yaw), r3(m.pitch), Math.max(0, Math.round(p.hp)), Math.round(p.armor), fl, WSLOTS.indexOf(p.w), Math.round(m.cr * 100), rel, p.team, p.useK === 'plant' ? 1 : p.useK === 'defuse' ? 2 : 0, p.useT > 0 ? r2(p.useT / Math.max(.01, p.useMax)) : 0];
  }
  snapMe(p) {
    const m = p.m, mm = {}; for (const k in m) { const v = m[k]; mm[k] = typeof v === 'number' ? (Number.isInteger(v) ? v : r3(v)) : v; }
    const fx = { far: p.farmer || '', abC: p.abC || [0, 0], abCd: r2(p.abCd || 0), bd: r2(Math.max(0, p.blindT || 0)), sl: r2(Math.max(0, p.slowT || 0)), md: p.mudT ? 1 : 0, ds: p.dashT > 0 ? [r2(p.dashT), r3(p.dashX), r3(p.dashZ)] : 0 };
    return Object.assign(fx, { seq: p.lastSeq, m: mm, hp: Math.round(p.hp), armor: Math.round(p.armor), vest: p.vest, helm: p.helm, pack: p.pack, w: p.w, own: p.own, mag: p.mag, ammo: p.ammo, nades: p.nades, kits: p.kits, bomb: p.hasBomb, eq: r2(p.equipT), cd: r2(p.cdT), rel: r2(p.relT), relMax: r2(p.relMax), bl: r2(p.bloom), tn: p.throwT > 0, alive: p.alive, useT: r2(p.useT), useK: p.useK, useMax: p.useMax, team: p.team, buff: p.buff.spd > 0, k: p.k, d: p.d, sc: p.score, $: p.money | 0, heal: p.heal ? [p.heal.k, r2(p.heal.t / p.heal.max)] : 0, inv: p.inv || null, sel: p.sel || '', pano: p.pano | 0, panoR: p.panoR === this.round ? 1 : 0, caixa: p.caixa | 0, br: r2(p.breath === undefined ? 10 : p.breath), cow: p.onCow ? 1 : 0, ch: p.chute ? [r2(p.chute.t), p.chute.open ? 1 : 0] : 0 });
  }
  snapshot(forId, withSb, lootVer) {
    const b = this.bomb, s = {
      t: r3(this.t), tk: this.tick, wx: this.weather | 0, ph: this.phase, pt: r2(this.pt), rd: this.round, mr: this.cfg.rounds, sc: this.score, sw: this.swap, ck: this.clockOn ? 1 : 0,
      P: this.players.map(p => this.snapPlayer(p)),
      G: this.nades.map(n => [n.id, r2(n.x), r2(n.y), r2(n.z), r2(n.vx), r2(n.vy), r2(n.vz), n.rest ? 1 : 0, NADE_KIND[n.k || 'batata'] | 0]),
      B: [b.st, r2(b.x), r2(b.y), r2(b.z), r2(b.timer), b.carrier, b.site, r2(b.defBy ? 1 : 0)],
      e: this.ev
    };
    if (this.zone) { const z = this.zone; s.Z = [r2(z.cx), r2(z.cz), r2(z.r), r2(z.tcx), r2(z.tcz), r2(z.tr), r2(z.t), z.stage, z.dps, z.state === 'shrink' ? 1 : z.state === 'final' ? 2 : 0]; }
    if (this.mode === 'caos') { s.AL = this.alive().length; const c = this.cow; if (c && c.st !== 'done') s.C = [r2(c.x), r2(c.z), c.h, r3(c.yaw), c.st === 'fly' ? 1 : 0, r2(c.f), r2(c.x1), r2(c.z1), r2(c.x0), r2(c.z0)]; }
    s.LV = this.lootVer | 0; if (this.mode === 'caos' && lootVer !== this.lootVer) s.L = this.loot.map(l => [l.id, l.k, l.w || '', l.tier | 0, l.n | 0, r2(l.x), r2(l.y), r2(l.z)]);
    if (this.phase === 'select' || this.phase === 'loading') s.SEL = this.selSnap();
    if (withSb) s.SB = this.players.map(p => [p.id, p.k, p.d, p.a, p.score, p.ping | 0, p.team, p.bot ? 1 : 0, p.place | 0, p.money | 0, p.hs | 0, p.shots ? Math.round(100 * (p.hits | 0) / p.shots) : 0, FARMER_IDS.indexOf(p.farmer), p.mvps | 0]);
    if (this.over) s.W = this.winner; if (this.mode === 'tatico') { s.HT = this.halftime ? 1 : 0; s.AX = this.abSnap(); }
    const me = forId && this.byId.get(forId); if (me) s.me = this.snapMe(me);
    return s;
  }
}
