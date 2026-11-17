/* =====================================================================
   60_game.js — controlador de partida: entrada, loop fixo 60 Hz, câmera,
   integração Sim (offline/host) e Predictor (cliente), eventos → FX/áudio/HUD,
   desenho do mundo dinâmico.  Fluxos de menu/rede ficam em 61_boot.js.
   ===================================================================== */
'use strict';
const G = {
  R: null, fx: null, vm: null, hud: null, map: null, nav: null,
  scene: 'boot',                    /* boot | menu | lobby | play */
  kind: 'offline', mode: 'tatico', sim: null, net: null, nc: null, code: '', transport: 'peer',
  me: null, myId: '', pred: null, buf: null, ents: new Map(), rinfo: new Map(), sb: new Map(),
  view: { yaw: 0, pitch: 0 }, recoil: { p: 0, y: 0 }, cam: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, fov: 70 },
  phase: 'lobby', pt: 0, round: 0, maxRounds: 3, swap: 0, score: [0, 0], bomb: { st: 'none', x: 0, y: 0, z: 0, timer: 0, carrier: 0, site: '', defBy: 0 }, zone: null, aliveCount: 0,
  loot: [], lootVer: -1, nades: [], nadeT: 0, time: 0, alpha: 0, paused: false, locked: false, wasLocked: false, spec: false, specId: '', deadT: 0, specKind: 0,
  prev: { x: 0, y: 0, z: 0 }, evBuf: [], cmdOut: [], snapN: 0, zoom: 1, fovMul: 1, scoped: false, bobPh: 0, landDip: 0, roll: 0, syncView: false, winner: undefined, endText: '', fps: 60, fpsAcc: 0, fpsN: 0,
  decor: { chickens: [], pigs: [] }, stats0: null, tagsCv: null, reconnecting: false, matchOver: false, lastLand: 0, beepT: 0, tickT: 0, spotT: 0, funny: ''
};
const Input = { keys: new Set(), btn: [false, false, false], dx: 0, dy: 0, acts: [], typing: false, force: false, wheelT: 0, tab: false, menu: false, tabPad: false,
  v: { mvf: 0, mvr: 0, jump: false, crouch: false, sprint: false, fire: false, ads: false, use: false }, device: IS_TOUCH ? 'touch' : 'kbm' };
const _o = { x: 0, y: 0, r: 0 };

/* ---------- utilidades ---------- */
function camBasis(yaw, pitch) { const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch); return { f: [-sy * cp, sp, -cy * cp], r: [cy, 0, -sy], u: [sy * sp, cp, cy * sp] }; }
function vmToWorld(cam, v) { const b = camBasis(cam.yaw, cam.pitch); return { x: cam.x + b.r[0] * v.x + b.u[0] * v.y - b.f[0] * v.z, y: cam.y + b.u[1] * v.y - b.f[1] * v.z, z: cam.z + b.r[2] * v.x + b.u[2] * v.y - b.f[2] * v.z }; }
function project(VP, x, y, z, W, H) { const w = VP[3] * x + VP[7] * y + VP[11] * z + VP[15]; if (w < .2) return null; const cx = (VP[0] * x + VP[4] * y + VP[8] * z + VP[12]) / w, cy = (VP[1] * x + VP[5] * y + VP[9] * z + VP[13]) / w; return [(cx * .5 + .5) * W, (1 - (cy * .5 + .5)) * H, w]; }
const isTat = () => G.mode === 'tatico';
function newEnt(id) { return { id, x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, lx: null, lz: null, yaw: 0, pitch: 0, cr: 0, spd: 0, wph: 0, fire: 0, relP: 0, alive: true, deadT: 0, team: 0, wid: 'galho', skin: 0, name: '', hp: 100, armor: 0, vestT: 0, air: false, slide: false, bomb: false, stepAcc: 0, uk: 0, up: 0, spotted: 0, tickT: 0 }; }
function entOf(id) { return G.ents.get(id) || null; }
function ownerName(id) { const r = G.rinfo.get(id); return r ? r.name : id; }
function myTeam() { return G.me ? G.me.team : 0; }
function myPos() { return G.cam; }
const vestTier = a => a > 70 ? 3 : a > 40 ? 2 : a > 0 ? 1 : 0;

/* ===================== ENTRADA ===================== */
function initInput() {
  const cv = $('cv'), K = Input.keys;
  const typing = e => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'); };
  addEventListener('keydown', e => {
    if (e.code === 'Escape' && UI.modal) { UI.close(); return; }
    if (typing(e)) return;
    if (G.scene !== 'play') return;
    if (Rebind.wait) return;
    Input.device = 'kbm';
    const act = actOf(e.code);
    /* menus da partida funcionam mesmo sem o mouse travado */
    if (!e.repeat && (act === 'shop' || act === 'bag' || act === 'map' || (act === 'farmer' && FarmerPick.open) || (e.code === 'Escape' && (Shop.open || Bag.open || BigMap.open || FarmerPick.open)))) {
      e.preventDefault(); if (e.code === 'Escape' || act === 'farmer') { Shop.toggle(false); Bag.toggle(false); BigMap.toggle(false); FarmerPick.toggle(false); return; }
      if (act === 'shop') Shop.toggle(); else if (act === 'bag') Bag.toggle(); else BigMap.toggle(); return;
    }
    if (!G.locked && !Input.force) { return; }
    if (['Space', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code) || act === 'score' || act === 'jump') e.preventDefault();
    if (e.repeat) return; K.add(e.code);
    const me = G.me; if (!me) return;
    switch (act) {
      case 's1': case 's2': case 's3': case 's4': case 's5': Input.acts.push(act); break;
      case 'reload': Input.acts.push('r'); break;
      case 'nade': Input.acts.push('g'); break;
      case 'drop': Input.acts.push(me.hasBomb && isTat() ? 'q' : 'lw'); break;
      case 'heal': Input.acts.push(me.heal ? 'hc' : 'h'); break;
      case 'zoom': G.zoom = G.zoom === 1 ? 2 : 1; sfx.ui(0); break;
      case 'ab1': Input.acts.push('ab:0'); break; case 'ab2': Input.acts.push('ab:1'); break; case 'ab3': Input.acts.push('ab:2'); break; case 'ult': Input.acts.push('ab:3'); break;
      case 'score': Input.tab = true; break;
      case 'chat': openChat(); break;
      case 'talk': Voice.ptt(true); break;
    }
    if (e.code === 'ArrowLeft') cycleSpec(-1); else if (e.code === 'ArrowRight') cycleSpec(1);
  });
  addEventListener('keyup', e => { K.delete(e.code); const a = actOf(e.code); if (a === 'score') Input.tab = false; if (a === 'talk') Voice.ptt(false); });
  addEventListener('blur', () => { K.clear(); Input.btn[0] = Input.btn[1] = Input.btn[2] = false; Input.tab = false; });
  addEventListener('mousemove', e => { if (G.locked || Input.force) { Input.dx += e.movementX || 0; Input.dy += e.movementY || 0; } });
  addEventListener('mousedown', e => {
    if (G.scene !== 'play' || (!G.locked && !Input.force)) return; Input.btn[e.button] = true; e.preventDefault();
    if (G.spec && e.button === 0) cycleSpec(1);
  });
  addEventListener('mouseup', e => { Input.btn[e.button] = false; });
  addEventListener('contextmenu', e => { if (G.scene === 'play') e.preventDefault(); });
  addEventListener('wheel', e => { if (G.scene !== 'play' || !G.locked) return; const t = performance.now(); if (t - Input.wheelT < 90) return; Input.wheelT = t; Input.acts.push(e.deltaY > 0 ? 'w+' : 'w-'); }, { passive: true });
  document.addEventListener('pointerlockchange', () => {
    G.locked = document.pointerLockElement === cv;
    if (G.locked) { G.wasLocked = true; $('click2play').classList.add('hidden'); $('pause').classList.add('hidden'); G.paused = false; }
    else if (G.scene === 'play') { Input.keys.clear(); Input.btn[0] = Input.btn[1] = Input.btn[2] = false; if (G.wasLocked && !G.matchOver && !Input.typing && !Input.menu) showPause(true); }
  });
  document.addEventListener('pointerlockerror', () => { if (G.scene === 'play') $('click2play').classList.remove('hidden'); });
  $('click2play').onclick = () => { lockPointer(); };
  $('pResume').onclick = () => { showPause(false); lockPointer(); };
  $('pSet').onclick = () => UI.settingsModal(true);
  $('pLeave').onclick = () => { showPause(false); Game.leave(); };
  const ci = $('chatin').querySelector('input'); ci.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { const t = ci.value.trim(); ci.value = ''; closeChat(); if (t) sendChat(t); } else if (e.key === 'Escape') { ci.value = ''; closeChat(); } };
}
function hud_toast(t) { UI.toast(t, 2200); }
function lockPointer() { if (Input.force) { $('click2play').classList.add('hidden'); return; } try { const p = $('cv').requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
function showPause(on) {
  if (G.scene !== 'play') return; G.paused = on && G.kind === 'offline'; $('pause').classList.toggle('hidden', !on);
  if (on) $('pause').querySelector('p').textContent = G.kind === 'offline' ? 'Partida em pausa.' : 'O jogo continua em segundo plano (outros jogadores seguem jogando).';
}
function openChat() { if (G.kind === 'offline' || Input.typing) return; Input.typing = true; $('chatin').classList.remove('hidden'); const i = $('chatin').querySelector('input'); document.exitPointerLock && document.exitPointerLock(); setTimeout(() => i.focus(), 20); }
function closeChat() { Input.typing = false; $('chatin').classList.add('hidden'); setTimeout(() => { if (G.scene === 'play') lockPointer(); }, 30); }
function sendChat(t) { if (G.kind === 'host') G.net.say(profile.name, t, 0, G.net.hostMember); else if (G.nc) G.nc.send({ k: 'chat', text: t }); }

/* aplica movimento do mouse na mira (por quadro) */
function applyLook(dt) {
  const ok = G.scene === 'play' && !G.paused && !Input.typing && !Input.menu && (G.locked || Input.force);
  if (!ok || !G.me || !G.me.alive) { if (G.spec && ok) { G.view.yaw -= Input.dx * .0022; } Input.dx = Input.dy = 0; return; }
  const w = WEAPONS[G.me.w] || WEAPONS.faca, aimK = G.vm ? G.vm.adsK : 0;
  let s = (settings.sens || 1) * 0.0021 * lerp(1, (settings.adsSens || .85) * G.fovMul, aimK);
  G.view.yaw -= Input.dx * s; G.view.pitch -= (settings.invertY ? -1 : 1) * Input.dy * s; Input.dx = Input.dy = 0;
  G.view.pitch = clamp(G.view.pitch, -1.5, 1.5); if (G.view.yaw > PI) G.view.yaw -= TAU; else if (G.view.yaw < -PI) G.view.yaw += TAU;
  /* recuo se recupera */
  const k = 1 - Math.exp(-(w.rcDecay || 6) * dt); G.recoil.p -= G.recoil.p * k; G.recoil.y -= G.recoil.y * k * .8;
}
function buildCmd() {
  const c = blankCmd(), me = G.me, live = G.scene === 'play' && !G.paused && !Input.typing && me && me.alive, ok = live && !Input.menu && (G.locked || Input.force), v = Input.v;
  if (ok) {
    c.mvf = clamp((kd('fwd') ? 1 : 0) - (kd('back') ? 1 : 0) + v.mvf, -1, 1); c.mvr = clamp((kd('right') ? 1 : 0) - (kd('left') ? 1 : 0) + v.mvr, -1, 1);
    c.jump = kd('jump') || v.jump; c.crouch = kd('crouch') || v.crouch; c.sprint = kd('sprint') || v.sprint;
    c.fire = Input.btn[0] || v.fire; c.ads = Input.btn[2] || v.ads; c.use = kd('use') || v.use;
  }
  /* compras/ações de menu passam mesmo com o mouse livre (seleção/carregamento: escolha de agente e "pronto") */
  const flowPh = G.scene === 'play' && (G.phase === 'select' || G.phase === 'loading');
  if ((live || flowPh) && Input.acts.length) c.acts = Input.acts.splice(0); else if (!live) Input.acts.length = 0;
  c.yaw = G.view.yaw + G.recoil.y; c.pitch = clamp(G.view.pitch + G.recoil.p, -1.52, 1.52);
  if (G.kind === 'client' && G.nc) c.lag = Math.min(.3, G.nc.rtt / 2000 + INTERP);
  return c;
}

/* ===================== FEEDBACK LOCAL DE TIRO ===================== */
function localShot(w) {
  const me = G.me, vm = G.vm, fx = G.fx; if (!me) return;
  const ads = vm.adsK > .5; vm.fire(w.id, ads); if (G.mstat) G.mstat.shots = (G.mstat.shots | 0) + 1;
  const run = me.shotsRun | 0, kick = w.rcP * (1 + (w.rcG || 0) * Math.min(run, 24)) * (ads ? .72 : 1);
  G.recoil.p = Math.min(w.rcMax * DEG, G.recoil.p + kick * DEG); G.recoil.y += rnd(-1, 1) * (w.rcY || .2) * DEG * (1 + Math.min(run, 12) * .06);
  sfx.shot(w.id, null, true); fx.shake(w.id === 'vassoura' ? 1.5 : w.id === 'estilingue' ? .15 : .28);
  const wp = vmToWorld(G.cam, vm.muz), b = camBasis(G.cam.yaw, G.cam.pitch); fx.muzzle(wp.x, wp.y, wp.z, b.f[0], b.f[1], b.f[2], w.id, true);
}
const clientHooks = {
  shoot(p, w) { localShot(w); }, melee(p, w, kind) { G.vm.meleeStart(kind); sfx.knife(false, null); }, meleeStart(p, w, kind) { G.vm.meleeStart('stab'); },
  startThrow() { sfx.throwS(null); }, throwNow() { }, onReload() { }, onSwitch() { sfx.equip(null); }, act() { }
};

/* ===================== PASSOS FIXOS ===================== */
function capturePrev() {
  if (G.sim) { for (const p of G.sim.players) { let e = G.ents.get(p.id); if (!e) { e = newEnt(p.id); G.ents.set(p.id, e); e.px = p.m.x; e.py = p.m.y; e.pz = p.m.z; } e.px = p.m.x; e.py = p.m.y; e.pz = p.m.z; } }
  const m = G.me && G.me.m; if (m) { G.prev.x = m.x; G.prev.y = m.y; G.prev.z = m.z; }
}
function fixedStep() {
  if (G.scene !== 'play') return;
  const cmd = buildCmd(), me = G.me;
  if (G.kind === 'client') {
    if (!G.pred || !G.pred.ready) return;
    const frozen = G.phase === 'lobby' || G.phase === 'over' || G.phase === 'select' || G.phase === 'loading' || (G.phase === 'prep' && !isTat());
    G.pred.step(cmd, clientHooks, frozen); G.cmdOut.push(cmdToWire(cmd)); if (G.cmdOut.length > 30) G.cmdOut.splice(0, G.cmdOut.length - 30);
    afterLocalStep(me);
    return;
  }
  const sim = G.sim; if (!sim || !me) return;
  capturePrev(); me.cmd = cmd; sim.step();
  const evs = sim.ev; sim.ev = [];
  syncFromSim();
  for (const e of evs) { onEvent(e); if (G.kind === 'host') G.evBuf.push(e); }
  afterLocalStep(me);
  if (G.kind === 'host') { G.snapN++; if (G.snapN % 3 === 0) hostSnap(); }
}
function afterLocalStep(me) {
  const m = me.m; if (!m) return;
  if (m.landV > 2.5) { G.vm.land(m.landV); G.landDip = Math.min(.2, m.landV * .014); sfx.land(m.landV, null); G.fx.dust(m.x, m.y, m.z, 4, Math.min(1.6, m.landV / 8)); G.fx.shake(Math.min(.8, m.landV / 20)); }
  /* passos */
  const dx = m.x - G.prev.x, dz = m.z - G.prev.z, d = Math.hypot(dx, dz);
  if (m.gnd && d > .001 && me.alive) { G.stepAcc = (G.stepAcc || 0) + d; const stride = m.sprinting ? 2.5 : m.cr > .5 ? 3.2 : 2.1; if (G.stepAcc > stride) { G.stepAcc = 0; sfx.step(G.map.W.surfaceAt(m.x, m.z), null, m.cr > .5 ? .35 : m.sprinting ? 1 : .7); } }
  if (G.lastGnd && !m.gnd && m.vy > 3) sfx.jump(); G.lastGnd = m.gnd;
}
/* sincroniza o estado "visível" a partir da Sim (offline/host) */
function syncFromSim() {
  const s = G.sim; G.abx = s.abx || []; if ((s.weather | 0) !== G.weather) setWeather(s.weather | 0); G.phase = s.phase; G.pt = s.pt; G.round = s.round; G.maxRounds = s.cfg.rounds; G.score = s.score; G.swap = s.swap; G.bomb = s.bomb; G.nades = s.nades; G.loot = s.loot; G.abx = s.abSnap ? s.abSnap() : [];
  G.zone = s.zone ? [s.zone.cx, s.zone.cz, s.zone.r, s.zone.tcx, s.zone.tcz, s.zone.tr, s.zone.t, s.zone.stage, s.zone.dps, s.zone.state === 'shrink' ? 1 : s.zone.state === 'final' ? 2 : 0] : null;
  G.aliveCount = s.alive().length;
  const c = s.cow; G.cowS = c && c.st !== 'done' ? [c.x, c.z, c.h, c.yaw, c.st === 'fly' ? 1 : 0, c.f, c.x1, c.z1, c.x0, c.z0] : null;
}
function hostSnap() {
  const net = G.net, sim = G.sim; if (!net || !sim || net.phase === 'lobby') { G.evBuf.length = 0; return; }
  for (const m of net.members.values()) { const p = sim.get(m.id); if (p) { p.ping = m.ping | 0; p.connected = m.connected; } }
  const keep = sim.ev; sim.ev = G.evBuf; const withSb = (G.snapN % 20 === 0) || G.evBuf.some(e => e.t === 'round' || e.t === 'rend' || e.t === 'over' || e.t === 'kill');
  net.sendSnapshots(sim, withSb); sim.ev = keep; G.evBuf = [];
}
function flushNet() {
  if (G.kind === 'client' && G.nc && G.cmdOut.length) { G.nc.send({ k: 'c', c: G.cmdOut }); G.cmdOut = []; }
}

/* ---------- snapshot (cliente) ---------- */
function onSnap(s) {
  if (!G.buf) return; const now = nowS(); G.buf.push(s, now);
  /* perda de pacotes: snapshots saem a cada 3 ticks; buracos na sequência = pacotes perdidos/atrasados */
  if (G.lastTk && s.tk > G.lastTk) { const exp = Math.max(1, Math.round((s.tk - G.lastTk) / 3)); G.pkExp = (G.pkExp || 0) * .985 + exp; G.pkLost = (G.pkLost || 0) * .985 + (exp - 1); }
  if (!G.lastTk || s.tk > G.lastTk) G.lastTk = s.tk;
  if (s.wx !== undefined && s.wx !== G.weather) setWeather(s.wx);
  G.phase = s.ph; G.pt = s.pt; G.sel = s.SEL || G.sel; G.round = s.rd; G.maxRounds = s.mr; G.score = s.sc; G.swap = s.sw; G.cowS = s.C || null;
  G.bomb = { st: s.B[0], x: s.B[1], y: s.B[2], z: s.B[3], timer: s.B[4], carrier: s.B[5], site: s.B[6], defBy: s.B[7] }; G.zone = s.Z || null; G.aliveCount = s.AL !== undefined ? s.AL : s.P.filter(a => a[8] & 1).length;
  if (s.L) { G.loot = s.L.map(r => ({ id: r[0], k: r[1], w: r[2], tier: r[3], n: r[4], x: r[5], y: r[6], z: r[7] })); G.lootVer = s.LV; if (G.nc) G.nc.send({ k: 'lv', v: s.LV }); }
  G.nades = s.G.map(a => ({ id: a[0], x: a[1], y: a[2], z: a[3], vx: a[4], vy: a[5], vz: a[6], rest: a[7], sq: a[0] * 1.7, k: NADE_NAMES[a[8] | 0] })); G.nadeT = now; G.abx = s.AX || []; G.orbs = s.OR || [];
  if (s.SB) for (const r of s.SB) G.sb.set(r[0], { k: r[1], d: r[2], a: r[3], score: r[4], ping: r[5], team: r[6], bot: r[7], place: r[8], money: r[9] | 0, hs: r[10] | 0, acc: r[11] | 0, farmer: FARMER_IDS[r[12]] || '', mvps: r[13] | 0 });
  if (s.e && s.e.length) for (const e of s.e) onEvent(e);
  if (s.me && G.pred) {
    G.pred.reconcile(s.me, s.ph === 'lobby' || s.ph === 'over' || s.ph === 'select' || s.ph === 'loading' || (s.ph === 'prep' && G.mode !== 'tatico'));
    if (G.syncView && s.me.alive) { G.view.yaw = G.pred.p.m.yaw; G.view.pitch = 0; G.recoil.p = G.recoil.y = 0; G.syncView = false; G.prev.x = G.pred.p.m.x; G.prev.y = G.pred.p.m.y; G.prev.z = G.pred.p.m.z; }
  }
  if (s.W !== undefined) G.winner = s.W;
}

/* clima: céu/neblina + chuva (partículas leves) + relâmpagos na tempestade */
function setWeather(w) { G.weather = w; if (G.R && G.scene === 'play') G.R.setEnv(weatherEnv(G.map.env || 'dia', w)); }
function weatherFx(dt) {
  const W = WEATHER[G.weather | 0]; if (!W || !W.rain || !G.fx) return; const cam = G.cam, q = QQ().parts * (settings.particles === undefined ? 1 : settings.particles);
  G.rainAcc = (G.rainAcc || 0) + dt * 260 * W.rain * q;
  while (G.rainAcc > 1) { G.rainAcc--; const x = cam.x + rnd(-16, 16), z = cam.z + rnd(-16, 16); G.fx.P({ x, y: cam.y + rnd(4, 9), z, vx: -1.2, vy: -22, vz: -.6, life: .5, s0: .025, s1: .025, r: .75, g: .82, b: .95, a0: .45, add: false, ty: 5, drag: 0, grav: 0 }); }
  if (W.storm) { G.boltT = (G.boltT || 6) - dt; if (G.boltT <= 0) { G.boltT = rnd(7, 16); G.hud.flash(.35); setTimeout(() => sfx.explosion && sfx.explosion({ x: cam.x + rnd(-200, 200), y: 60, z: cam.z + rnd(-200, 200) }, true, true), rnd(400, 1600)); } }
}

/* ===================== EVENTOS → FX / ÁUDIO / HUD ===================== */
function muzzleOf(e) {
  const b = camBasis(e.yaw, e.pitch), ey = e.y + (1.62 - .55 * e.cr);
  return { x: e.x + b.f[0] * .7 + b.r[0] * .22, y: ey - .12 + b.f[1] * .7, z: e.z + b.f[2] * .7 + b.r[2] * .22, f: b.f };
}
function onEvent(e) {
  if (e.t === 'radio') { if (G.me && e.tm === G.me.team && G.hud) G.hud.chatAdd(e.n, '📻 ' + e.m, false, true); return; }
  if (e.t === 'flash' || e.t === 'ab' || e.t === 'abx' || e.t === 'abu' || e.t === 'far' || e.t === 'rev' || e.t === 'orb' || e.t === 'ultok' || e.t === 'sig') { try { AbFx.event(e); } catch (er) { console.error(er); } if (e.t !== 'abu') return; }
  const fx = G.fx, hud = G.hud, me = G.myId, cam = G.cam, W = G.map.W;
  switch (e.t) {
    case 'shot': {
      const own = e.p === me, sh = entOf(e.p), w = WEAPONS[e.w]; if (!w) break;
      if (own && G.kind !== 'client') localShot(w);
      const from = own && G.me && G.me.alive ? vmToWorld(cam, G.vm.muz) : sh ? muzzleOf(sh) : { x: e.e[0], y: e.e[1], z: e.e[2], f: [0, 0, -1] };
      let dx = e.e[0] - from.x, dy = e.e[1] - from.y, dz = e.e[2] - from.z; const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
      fx.tracer(from.x, from.y, from.z, e.e[0], e.e[1], e.e[2], e.w, own);
      if (!own) {
        if (sh) sh.fire = 1; fx.muzzle(from.x, from.y, from.z, dx, dy, dz, e.w, false); sfx.shot(e.w, { x: from.x, y: from.y, z: from.z }, false); hud.shotSeen(e.p);
        /* estalo de bala passando perto */
        const px = cam.x - from.x, py = cam.y - from.y, pz = cam.z - from.z, t = clamp(px * dx + py * dy + pz * dz, 0, dl), qx = px - dx * t, qy = py - dy * t, qz = pz - dz * t;
        if (e.v !== me && t > 3 && Math.hypot(qx, qy, qz) < 2.4) sfx.whiz();
      }
      if (e.k === 2) fx.impact(e.e[0], e.e[1], e.e[2], e.n[0], e.n[1], e.n[2], e.mat, e.w);
      else if (e.k === 1) fx.impact(e.e[0], e.e[1], e.e[2], -dx, -dy * .3 + .3, -dz, 'flesh', e.w);
      break;
    }
    case 'mhit': { const own = e.p === me; if (own && G.kind !== 'client' && e.k === 'slash') G.vm.meleeStart('slash'); sfx.knife(!!e.v, own ? null : { x: e.x, y: e.y, z: e.z }); if (e.v) fx.impact(e.x, e.y, e.z, 0, 1, 0, 'flesh', 'faca'); else if (own) { /* tiro no vazio */ } break; }
    case 'mst': if (e.p === me && G.kind !== 'client') G.vm.meleeStart('stab'); else if (e.p !== me) { const s = entOf(e.p); sfx.knife(false, s ? { x: s.x, y: s.y + 1, z: s.z } : null); } break;
    case 'thr': { const s = entOf(e.p); sfx.throwS(e.p === me ? null : s ? { x: s.x, y: s.y + 1.2, z: s.z } : null); break; }
    case 'rel': if (e.p !== me) { const s = entOf(e.p); if (s) { const pos = { x: s.x, y: s.y + 1, z: s.z }, d = e.d * 1000; sfx.reloadStep(e.w, 0, pos); setTimeout(() => sfx.reloadStep(e.w, 1, pos), d * .5); setTimeout(() => sfx.reloadStep(e.w, 2, pos), d * .85); } } break;
    case 'sw': if (e.p !== me) { const s = entOf(e.p); if (s) sfx.equip({ x: s.x, y: s.y + 1, z: s.z }); } break;
    case 'hit': {
      if (e.a === me || e.v === me) G.combatT = G.time;
      { const ve = entOf(e.v); if (ve) { ve.hitT = G.time; ve.hitHead = e.z === 'head'; ve.hitSide = Math.random() < .5 ? -1 : 1; } }
      if (e.a === me && e.v !== me) { if (G.mstat) G.mstat.hits = (G.mstat.hits | 0) + 1; hud.hitMarker(e.z === 'head', false); if (settings.hitSound !== false) sfx.hit(e.z === 'head'); addDmgNum(e.v, e.d, e.z === 'head'); }
      if (e.v === me) {
        const a = e.a && entOf(e.a); let ang = 0; if (a) { const dx = a.x - cam.x, dz = a.z - cam.z, b = camBasis(cam.yaw, 0); ang = Math.atan2(dx * b.r[0] + dz * b.r[2], dx * b.f[0] + dz * b.f[2]); } else ang = (Math.random() - .5) * 2;
        hud.damageFrom(ang, e.d); sfx.hurt(null); fx.shake(Math.min(1.2, .2 + e.d / 60));
      }
      break;
    }
    case 'kill': {
      const v = G.rinfo.get(e.v) || { name: '?' }, a = e.a ? G.rinfo.get(e.a) : null, ve = entOf(e.v), ae = e.a ? entOf(e.a) : null;
      const kc = t => isTat() && t ? sqCol(t) : '#fff';
      if (ve) deathStyle(ve, ae, e);
      hud.killfeed({ me: e.a === me, self: !e.a, an: a ? a.name : '', vn: v.name, ac: kc(ae ? ae.team : 0), vc: kc(ve ? ve.team : 0), verb: KILL_VERB[e.w] || KILL_VERB.outro, hs: e.hs });
      if (e.a === me && e.v !== me) {
        const ms = G.mstat || (G.mstat = {}); if (e.w === 'faca') ms.knife = (ms.knife | 0) + 1; if (e.w === 'estilingue') ms.sling = (ms.sling | 0) + 1; if (e.ace) ms.aces = (ms.aces | 0) + 1; if (e.hs) ms.hs = (ms.hs | 0) + 1;
        sfx.kill(); hud.hitMarker(e.hs, true);
        /* notificações oficiais */
        if (e.ace) Notif.show('DONO DO ROÇADO!', isTat() ? 'Limpou a equipe inteira!' : 'Último de pé!', { col: '#ffd23a', dur: 2 });
        else if (e.m >= 3) Notif.show('TRÊS NO ROÇADO!', e.m > 3 ? `${e.m} abates seguidos!` : '', { col: '#ff9a4a' });
        else if (e.m === 2) Notif.show('DUPLA MANDIOCADA!', '', { col: '#ffb84a' });
        else if (e.hs) { Notif.show('CAPRICHOU NO CHAPÉU!', '+50 pontos de headshot', { hat: true, col: '#ffe27a', dur: 1.6 }); sfx.headshot && sfx.headshot(); }
        else if (e.w === 'faca') Notif.show('FACÃO SEM DÓ!', '', { col: '#ff7a6a' });
        else if (e.solo) Notif.show('SOBROU SÓ VOCÊ!', 'Segura o roçado sozinho!', { col: '#9ad0ff' });
        else Notif.show('BOA, CABOCLO!', '', { col: '#9cff7a', dur: 1.1 });
      }
      if (e.v === me) { if (G.mstat) G.mstat.survive = Math.round(G.time - (G.matchT0 || G.time)); G.spec = true; G.deadT = 0; G.specId = ''; G.deathBy = e.a; hud.feed(pick(FUNNY.death), '#ff9a8a'); if (G.vm) G.vm.hideWeapon = true; Input.btn[0] = Input.btn[2] = false; }
      break;
    }
    case 'bnc': sfx.bounce({ x: e.x, y: e.y, z: e.z }); break;
    case 'boom': {
      const d = Math.hypot(cam.x - e.x, cam.y - e.y, cam.z - e.z), big = e.big;
      fx.explosion(e.x, e.y, e.z, e.r > 20 ? 9 : e.r * .5, big); if (!big) fx.eggBurst(e.x, e.y, e.z); sfx.explosion({ x: e.x, y: e.y, z: e.z }, big, false);
      const gy = W.heightAt(e.x, e.z); G.R.addDecal(e.x, gy + .03, e.z, 0, 1, 0, big ? 7 : 2.6, 0x120e0a, .85, true); if (big) G.R.addDecal(e.x, gy + .035, e.z, 0, 1, 0, 3.5, 0x2a1408, .8, true);
      fx.shake(big ? Math.max(0, 5 * (1 - d / 110)) : Math.max(0, 3 * (1 - d / 45)));
      if (d < (big ? 60 : 16)) hud.flash(big ? Math.max(.25, 1 - d / 60) : .35 * (1 - d / 16));
      break;
    }
    case 'bomb': onBombEvent(e); break;
    case 'round': {
      G.endText = ''; G.matchOver = false; G.R.clearDecals(); fx.clear(); G.recoil.p = G.recoil.y = 0; G.spec = false; G.specId = ''; G.syncView = true; G.beepT = 0; G.funny = pick(FUNNY.prep);
      if (G.kind !== 'client' && G.me) { G.view.yaw = G.me.m.yaw; G.view.pitch = 0; G.syncView = false; G.prev.x = G.me.m.x; G.prev.y = G.me.m.y; G.prev.z = G.me.m.z; for (const en of G.ents.values()) { const p = G.sim.get(en.id); if (p) { en.px = p.m.x; en.py = p.m.y; en.pz = p.m.z; } } }
      if (G.vm) G.vm.hideWeapon = false;
      Shop.toggle(false); Bag.toggle(false); if (isTat()) { const mySq = G.me ? sqOfTeam(G.me.team, e.sw) : 0, role = G.me && G.me.team === T_ATK ? 'ATAQUE' : 'DEFESA'; hud.banner(e.half ? 'TROCA DE LADOS!' : e.n === 1 ? 'PREPARE-SE · FASE DE COMPRA' : e.ot ? `PRORROGAÇÃO — RODADA ${e.n}` : `PRÓXIMO ROUND · RODADA ${e.n}`, `BARREIRAS ATIVADAS · ${SQ_NAME[mySq]} · ${role}${role === 'DEFESA' ? ' (circule livre até o A e o B)' : ' (aguarde no spawn)'} · ${keyName(bindOf('shop'))} loja · ${e.n === 1 ? '70' : '15'} s`, e.half ? '#9ad0ff' : '#ffe27a'); } else hud.banner('TODOS CONTRA TODOS', 'Suba na vaca voadora — salte com ESPAÇO', '#ffe27a'); sfx.roundStart(); break;
    }
    case 'live': Shop.toggle(false); if (isTat()) hud.banner('ROUND INICIADO!', 'BARREIRAS LIBERADAS — ' + (myTeam() === T_ATK ? 'levem a mandioca ao A ou ao B.' : 'segurem o A e o B!'), '#9cff7a'); sfx.roundStart(); break;
    case 'flow': if (e.s === 'select') hud.banner('SELECIONE SEU AGENTE', '60 segundos — cada agente uma vez por equipe', '#ffe27a'); else if (e.s === 'loading') hud.banner('MAPA CARREGANDO', 'Preparando os dois times…', '#9ad0ff'); break;
    case 'rend': {
      if (isTat()) {
        (G.rhist || (G.rhist = [])).push({ n: e.n, wt: e.wt, ws: e.ws, why: e.why, mvp: e.mvp || '' });
        const win = e.wt === myTeam(), why = { elim: 'Eliminação total', time: 'Tempo esgotado', defuse: 'Mandioca desarmada', boom: 'Mandioca explodiu' }[e.why] || '';
        const t = SQ_NAME[e.ws] + (e.wt === T_ATK ? ' (ataque)' : ' (defesa)'); G.endText = `${t} venceu a rodada — ${why}`;
        if (e.half && !e.ot && !e.md) hud.banner('INTERVALO', `Placar parcial: AZUL ${e.sc[0]} x ${e.sc[1]} VERMELHO — os lados vão trocar`, '#9ad0ff');
        else if (e.ot && !e.md) hud.banner(e.sc[0] === e.sc[1] ? 'EMPATE — PRORROGAÇÃO!' : 'PRORROGAÇÃO', `AZUL ${e.sc[0]} x ${e.sc[1]} VERMELHO`, '#ffd23a');
        else hud.banner(win ? 'ROUND VENCIDO!' : 'ROUND PERDIDO', `${pick(win ? FUNNY.win : FUNNY.lose)} · ${t} venceu: ${why}${e.mvp ? ' · MVP da rodada: ' + ownerName(e.mvp) : ''}`, win ? '#9cff7a' : '#ff8f80');
        if (e.mvp && (e.half || e.ot) && !e.md) hud.feed('MVP da rodada: ' + ownerName(e.mvp), '#ffd84a');
      } else { const win = e.wn === me; G.endText = win ? 'Você venceu!' : 'Fim de jogo'; hud.banner(win ? 'GALINHA GANHOU, JANTAR GARANTIDO!' : 'FIM DE JOGO', win ? 'Último de pé no galinheiro!' : (ownerName(e.wn) + ' venceu'), win ? '#ffe27a' : '#ff8f80'); }
      if (e.md) G.matchOver = true; break;
    }
    case 'afk': {
      const nm = ownerName(e.p);
      if (e.p === me) { if (e.k === 'warn') Notif.show('VOCÊ ESTÁ PARADO', `Mexa-se em ${e.s} s ou um bot vai assumir o seu peão`, { col: '#ffb04a', dur: 4 }); else if (e.k === 'bot') Notif.show('UM BOT ASSUMIU', 'Mexa o mouse ou ande para voltar a controlar', { col: '#ff8a5a', dur: 4 }); else hud.feed('Você voltou ao controle', '#9cff7a'); }
      else if (e.k === 'bot') hud.chatAdd('', nm + ' ficou parado — um bot assumiu temporariamente', true); else if (e.k === 'back') hud.chatAdd('', nm + ' voltou ao controle', true);
      break;
    }
    case 'over': G.matchOver = true; G.winner = e.w; setTimeout(() => Game.showEndScreen(), 1400); break;
    case 'zone': hud.feed(e.k === 'shrink' ? '⚠ A ZONA ESTÁ FECHANDO!' : 'Nova zona marcada no mapa', e.k === 'shrink' ? '#ff9a6a' : '#9ad0ff'); sfx.alarm(); break;
    case 'left': { const r = G.rinfo.get(e.id); if (r) hud.chatAdd('', r.name + ' saiu da partida', true); G.ents.delete(e.id); break; }
    case 'heal': if (e.p === me) { if (e.s === 2) { sfx.ui(1); hud.feed(`+ Vida restaurada (${e.hp})`, '#9cff7a'); } else if (e.s === 0 && e.why === 'dano') hud.feed('Cura interrompida pelo dano!', '#ff8f80'); else if (e.s === 1) sfx.ui(0); } break;
    case 'buy': if (e.p === me) { sfx.ui(e.sell ? 0 : 1); if (Shop.open) { if (!e.sell && e.id) Shop.flash(e.id); setTimeout(() => Shop.render(true), 30); } } break;
    case 'deny': if (e.p === me) { hud.feed(e.why, '#ffb08a'); sfx.ui(0); if (Shop.open && $('shWhy')) $('shWhy').textContent = e.why; } break;
    case 'cow': if (e.k === 'go') hud.banner('A VACA DECOLOU!', 'Aperte ESPAÇO para saltar quando quiser', '#ffe27a'); else if (e.k === 'warn') { if (G.me && G.me.onCow) Notif.show('SALTE AGORA!', 'A vaca vai sair do mapa em 10 s — quem ficar é eliminado', { col: '#ff8a5a', dur: 2.5 }); } break;
    case 'jumpcow': if (e.p === me) { sfx.jump(); hud.feed('Paraquedas abre sozinho · WASD direciona · Ctrl desce mais rápido', '#9ad0ff'); } break;
    case 'land': if (e.p === me) { G.vm && (G.vm.hideWeapon = false); sfx.land(6, null); } break;
    case 'pick': if (e.p === me) { sfx.ui(1); } break;
  }
}
function onBombEvent(e) {
  const hud = G.hud, me = G.myId, who = ownerName(e.p), mt = myTeam(); let pos = e.x !== undefined ? { x: e.x, y: e.y, z: e.z } : G.bomb.x ? { x: G.bomb.x, y: G.bomb.y, z: G.bomb.z } : null;
  switch (e.k) {
    case 'plantStart': if (e.p !== me && mt === T_DEF) hud.feed(`⚠ ${who} está plantando a mandioca no ponto ${e.site}!`, '#ff8f80'); break;
    case 'plant': if (e.p === me && G.mstat) G.mstat.plants = (G.mstat.plants | 0) + 1; sfx.planted(pos); hud.banner(FUNNY.plant, FUNNY.plantSub, '#ff7a5a'); G.beepT = 0; break;
    case 'defStart': if (e.p !== me && mt === T_ATK) hud.feed(`⚠ ${who} está desarmando a mandioca!`, '#8fbfff'); break;
    case 'defuse': if (e.p === me && G.mstat) G.mstat.defuses = (G.mstat.defuses | 0) + 1; sfx.defused(); hud.banner(FUNNY.defused, who + ' salvou o roçado!', '#8fd0ff'); break;
    case 'pick': hud.feed(`${who} pegou a mandioca`, '#ffe27a'); break;
    case 'drop': hud.feed(e.d ? 'A mandioca caiu no chão!' : `${who} soltou a mandioca`, '#ffe27a'); break;
    case 'boom': hud.banner(FUNNY.boom, '', '#ff9a4a'); break;
  }
}

/* ===================== SPECTATE ===================== */
function specCandidates() {
  const out = [], tat = isTat(), mt = myTeam();
  for (const e of G.ents.values()) { if (e.id === G.myId || !e.alive) continue; out.push(e); }
  if (tat && out.some(e => e.team === mt)) return out.filter(e => e.team === mt).sort((a, b) => (a.id < b.id ? -1 : 1));
  out.sort((a, b) => ((b.team === mt && tat) - (a.team === mt && tat)) || (a.id < b.id ? -1 : 1)); return out;
}
function cycleSpec(dir) {
  if (!G.spec) return; const c = specCandidates(); if (!c.length) { G.specId = ''; return; }
  let i = c.findIndex(e => e.id === G.specId); i = (i + dir + c.length) % c.length; if (i < 0) i = 0; G.specId = c[i].id; sfx.ui(0);
}

/* ===================== ENTIDADES (render) ===================== */
function refreshEnts(alpha, dt) {
  const tat = isTat();
  if (G.sim) {
    for (const p of G.sim.players) {
      let e = G.ents.get(p.id); if (!e) { e = newEnt(p.id); e.px = p.m.x; e.py = p.m.y; e.pz = p.m.z; G.ents.set(p.id, e); }
      const m = p.m; if (Math.hypot(m.x - e.px, m.z - e.pz) > 6) { e.px = m.x; e.py = m.y; e.pz = m.z; e.lx = null; }
      e.x = lerp(e.px, m.x, alpha); e.y = lerp(e.py, m.y, alpha); e.z = lerp(e.pz, m.z, alpha);
      e.yaw = m.yaw; e.pitch = m.pitch; e.cr = m.cr; e.air = !m.gnd; e.slide = m.slideT > 0; e.alive = p.alive; e.team = p.team; e.wid = p.w; e.hp = p.hp; e.armor = p.armor; e.vestT = p.vest; e.bomb = p.hasBomb; e.name = p.name; e.skin = p.skin;
      e.relP = p.relT > 0 ? 1 - p.relT / Math.max(.01, p.relMax) : 0; e.uk = p.useK === 'plant' ? 1 : p.useK === 'defuse' ? 2 : 0; e.up = p.useT > 0 ? p.useT / Math.max(.01, p.useMax) : 0;
      if (e.lx === null) { e.lx = e.x; e.lz = e.z; }
      const d = Math.hypot(e.x - e.lx, e.z - e.lz); if (dt > 0) e.spd = damp(e.spd, Math.min(12, d / dt), 12, dt); e.wph += d * 1.9; e.lx = e.x; e.lz = e.z;
      e.deadT = p.alive ? 0 : (e.deadT || 0) + dt; if (e.fire > 0) e.fire = Math.max(0, e.fire - dt * 8);
      e.swim = !!m.swim; e.onCow = !!p.onCow; e.chute = !!p.chute; e.chOpen = !!(p.chute && p.chute.open); e.heal = !!p.heal; e.farmer = p.farmer || ''; e.rev = p.revT > 0;
    }
    for (const id of [...G.ents.keys()]) if (!G.sim.byId.has(id)) G.ents.delete(id);
  } else if (G.buf) {
    G.buf.sample(nowS(), dt);
    for (const e of G.ents.values()) {
      const r = G.rinfo.get(e.id); if (r) { e.name = r.name; e.skin = r.skin; } e.wid = WSLOTS[e.ws] || 'galho'; e.swim = !!(e.fl & 1024); e.chute = !!(e.fl & 2048); e.chOpen = (e.fl & 6144) === 6144; e.onCow = !!(e.fl & 8192); e.rev = !!(e.fl & 32768); e.farmer = (G.sb.get(e.id) || {}).farmer || ''; e.heal = !!(e.fl & 16384); e.relP = e.rel >= 0 ? e.rel / 100 : 0; e.vestT = vestTier(e.armor); e.cr = e.cr || 0; e.deadT = e.alive ? 0 : (e.deadT || 0);
    }
    /* cliente: o próprio jogador usa o estado predito (suavizado) */
    const me = G.pred && G.pred.p, self = G.ents.get(G.myId);
    if (self && me && me.alive && !me.onCow) { const third = !!me.chute; if (third) { self.x = me.m.x; self.y = me.m.y; self.z = me.m.z; } else { self.x = G.cam.x; self.y = me.m.y; self.z = G.cam.z; } self.yaw = G.view.yaw; self.pitch = G.view.pitch; }
  }
}
function drawEnts(m, t, skipId) {
  const cam = G.cam, tat = isTat();
  for (const e of G.ents.values()) {
    if (e.id === skipId) continue; const dx = e.x - cam.x, dz = e.z - cam.z; if (dx * dx + dz * dz > 170 * 170) continue;
    if (e.deadT > 25) continue;
    const cc = { x: e.x, y: e.y, z: e.z, yaw: e.yaw, pitch: e.pitch, skin: e.skin, team: tat && e.team ? sqOfTeam(e.team, G.swap | 0) + 1 : 0, wid: e.alive && !e.swim && !e.onCow && !e.chute && !e.heal ? e.wid : '', cr: e.cr, spd: e.alive ? e.spd : 0, wph: e.wph, air: e.air, slide: e.slide, fire: e.fire, rel: e.relP, dead: e.alive ? 0 : Math.max(.001, e.deadT), bomb: e.bomb && e.alive, armor: e.alive ? e.vestT : 0, farmer: tat ? e.farmer : '' };
    if (e.alive && e.hatOff && G.time - (e.hatT || 0) > 2) e.hatOff = false;
    cc.hatOff = !!e.hatOff; cc.dv = e.dv | 0; const ht = e.hitT ? G.time - e.hitT : 9; if (e.alive && ht < .2) { cc.hit = 1 - ht / .2; cc.hitHead = e.hitHead; cc.hitSide = e.hitSide; }
    if (!e.alive && e.dv === 3 && e.dvD) { const a = Math.min(cc.dead, .62) / .62, d = e.dvD * easeOut(a); cc.x += Math.sin(e.dvA) * d; cc.z += Math.cos(e.dvA) * d; cc.y += Math.sin(a * PI) * 1.3; }
    /* aterrissagem: agachamento curto ao tocar o chão depois do paraquedas */
    if (e.chute) { e.wasChute = true; e.wasOpen = e.chOpen; } else if (e.wasChute) { e.wasChute = false; e.landAt = t; e.landX = e.x; e.landY = e.y; e.landZ = e.z; e.landYaw = e.yaw; e.landOpen = e.wasOpen; }
    if (e.landAt && t - e.landAt < .5) cc.cr = Math.max(cc.cr || 0, Math.sin((t - e.landAt) / .5 * PI) * .9);
    if (e.chute && e.alive) drawChuteRig(m, e, t, cc); else { drawChar(m, cc, { time: t }); if (e.landOpen && e.landAt && t - e.landAt < .8) drawChuteCollapse(m, e, t); }
  }
}
function drawWorldDyn(m, t, dt, skipId) {
  const cam = G.cam, map = G.map;
  drawEnts(m, t, skipId); drawBarrier(m, t);
  /* vaca voadora */
  if (G.cowS) { const c = G.cowS; drawFlyingCow(m, c[0], c[2] - 6.4, c[1], c[3], t); }
  fallFx(dt); weatherFx(dt);
  /* batatas */
  const na = G.sim ? 0 : clamp(nowS() - G.nadeT, 0, .25);
  for (const n of G.nades) { const x = n.x + (n.rest ? 0 : n.vx * na), y = n.y + (n.rest ? 0 : n.vy * na), z = n.z + (n.rest ? 0 : n.vz * na);
    if (n.k && n.k !== 'batata') { m.push().tr(x, y - .04, z).ry((n.sq || 0) + (n.rest ? 0 : t * 9)).rx(n.rest ? 1.4 : t * 7).sc(1.3); drawGear(m, 'ab_' + n.k); m.pop(); }   /* rojão / lata de fumaça / bola de lama */
    else drawPotato(m, { x, y: y - .06, z, rot: (n.sq || 0) + (n.rest ? 0 : t * 9), rot2: n.rest ? .3 : t * 7 }); }
  if (isTat()) AbFx.draw(m, t);
  /* mandioca no chão / plantada */
  const b = G.bomb;
  if (b.st === 'dropped' || b.st === 'planted') drawBombWorld(m, { x: b.x, y: b.y, z: b.z, yaw: .7, armed: b.st === 'planted', urg: b.timer < 10 }, t);
  /* loot */
  if (G.mode === 'caos') for (const it of G.loot) { const dx = it.x - cam.x, dz = it.z - cam.z; if (dx * dx + dz * dz < 55 * 55) drawLootItem(m, it, t); }
  /* animais e moinho */
  for (const a of map.animals) { const dx = a.x - cam.x, dz = a.z - cam.z; if (dx * dx + dz * dz < 150 * 150) drawCow(m, a, t); }
  for (const a of map.anim) if (a.t === 'windmill') drawWindmillBlades(m, a, t);
  for (const c of G.decor.chickens) { const dx = c.x - cam.x, dz = c.z - cam.z; if (dx * dx + dz * dz < 90 * 90) drawChicken(m, c); }
  for (const p of G.decor.pigs) { const dx = p.x - cam.x, dz = p.z - cam.z; if (dx * dx + dz * dz < 90 * 90) drawPig(m, p, t); }
}
/* bichos de cenário: passeiam sem colidir (só visual) */
function initDecor() {
  const W = G.map.W, R = new RNG(77), ch = [], pg = [];
  const DS = G.map.decorSpots, spots = DS ? DS.ch : [[100, -22, 5], [96, -27, 4], [64, -50, 6], [80, -56, 6], [30, -24, 5], [104, 6, 7], [-124, 30, 6], [-40, 58, 8], [20, 14, 7], [8, 4, 6], [-60, 52, 8], [-112, -2, 6], [60, 70, 8], [90, 18, 5]];
  for (const [x, z, r] of spots) for (let i = 0; i < 2; i++) { const a = R.f() * TAU, d = R.f() * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (W.solidAt(px, W.heightAt(px, pz) + .3, pz) || W.waterDepth(px, pz) > 0) continue; ch.push({ x: px, z: pz, y: W.heightAt(px, pz), yaw: R.f() * TAU, ph: R.f() * 6, col: R.chance(.3) ? 0xe8c890 : R.chance(.2) ? 0x6a4a2a : 0xf4eee0, tx: px, tz: pz, cx: x, cz: z, r, wait: R.f() * 3 }); }
  for (const [x, z, r] of (DS ? DS.pg : [[100, -26, 4], [88, 6, 5], [-100, 52, 6], [6, -24, 4], [-60, 58, 5], [124, 17, 3], [124, 17, 3], [123, 16, 3]])) { const px = x + R.range(-r, r), pz = z + R.range(-r, r); if (W.solidAt(px, W.heightAt(px, pz) + .3, pz) || W.waterDepth(px, pz) > 0) continue; pg.push({ x: px, z: pz, y: W.heightAt(px, pz), yaw: R.f() * TAU, ph: R.f() * 6, tx: px, tz: pz, cx: x, cz: z, r, wait: R.f() * 4, walk: false, eat: false }); }
  G.decor.chickens = ch; G.decor.pigs = pg;
}
function updateDecor(dt) {
  const W = G.map.W, cam = G.cam;
  for (const list of [G.decor.chickens, G.decor.pigs]) for (const c of list) {
    const dx = c.x - cam.x, dz = c.z - cam.z; if (dx * dx + dz * dz > 100 * 100) continue; const isPig = list === G.decor.pigs, sp = isPig ? .7 : 1.1;
    c.wait -= dt; const d = Math.hypot(c.tx - c.x, c.tz - c.z);
    if (d > .15 && c.wait <= 0) { const a = Math.atan2(-(c.tx - c.x), -(c.tz - c.z)); c.yaw += angDiff(c.yaw, a) * Math.min(1, dt * 6); const nx = c.x + (c.tx - c.x) / d * sp * dt, nz = c.z + (c.tz - c.z) / d * sp * dt; if (!W.solidAt(nx, W.heightAt(nx, nz) + .3, nz) && W.waterDepth(nx, nz) < .02) { c.x = nx; c.z = nz; } else c.wait = 1; c.ph += dt * (isPig ? 7 : 12); c.walk = true; }
    else { c.walk = false; if (c.wait <= 0) { const a = Math.random() * TAU, r = Math.random() * c.r; c.tx = c.cx + Math.cos(a) * r; c.tz = c.cz + Math.sin(a) * r; c.wait = 1 + Math.random() * 4; c.eat = Math.random() < .4; } }
    c.y = W.heightAt(c.x, c.z);
  }
}

/* ===================== CÂMERA ===================== */
/* terceira pessoa na vaca voadora e no paraquedas */
function airCamera(dt) {
  const me = G.me, cam = G.cam; let tx, ty, tz;
  if (me.onCow && G.kind === 'client') { const e = G.ents.get(G.myId); tx = e ? e.x : me.m.x; ty = e ? e.y : me.m.y; tz = e ? e.z : me.m.z; }
  else { const a = G.alpha, p = G.prev, m = me.m; tx = lerp(p.x, m.x, a); ty = lerp(p.y, m.y, a); tz = lerp(p.z, m.z, a); if (Math.hypot(m.x - p.x, m.z - p.z) > 4) { tx = m.x; ty = m.y; tz = m.z; } }
  const yaw = G.view.yaw, pit = clamp(G.view.pitch, -1.25, .7), b = camBasis(yaw, pit), open = me.chute && me.chute.open, d = me.onCow ? 15 : open ? 10.5 : 7.5, up = open ? 3.1 : 2.4;
  cam.x = tx - b.f[0] * d; cam.y = ty + up - b.f[1] * d; cam.z = tz - b.f[2] * d; cam.yaw = yaw; cam.pitch = pit; cam.roll = 0;
  cam.fov = vfovFrom(settings.fov || 90, G.R.w / G.R.h); G.scoped = false; G.fovMul = 1;
}
function fpCamera(alpha, dt) {
  const me = G.me, m = me.m, cam = G.cam, vm = G.vm; let x, y, z, px = G.prev;
  if (me.onCow || me.chute) { airCamera(dt); return; }
  if (G.kind === 'client') { const pr = G.pred; x = lerp(px.x, m.x, alpha) + pr.corr[0]; y = lerp(px.y, m.y, alpha) + pr.corr[1]; z = lerp(px.z, m.z, alpha) + pr.corr[2]; }
  else { x = lerp(px.x, m.x, alpha); y = lerp(px.y, m.y, alpha); z = lerp(px.z, m.z, alpha); }
  if (Math.hypot(m.x - px.x, m.z - px.z) > 4) { x = m.x; y = m.y; z = m.z; }
  const w = WEAPONS[me.w] || WEAPONS.faca, sp = m.hspd || 0, onG = m.gnd;
  G.bobPh += (onG ? sp : 0) * dt * 1.05; const bamp = (settings.bobbing === undefined ? 1 : settings.bobbing) * (onG ? sat(sp / 7) : 0) * (m.cr > .5 ? .5 : 1) * (1 - vm.adsK * .8);
  G.landDip = Math.max(0, G.landDip - dt * .9); const yaw = G.view.yaw + G.recoil.y, pitch = clamp(G.view.pitch + G.recoil.p, -1.52, 1.52), b = camBasis(yaw, pitch);
  y += eyeH(m) + Math.sin(G.bobPh * 2) * .022 * bamp - G.landDip * .6; const lat = Math.sin(G.bobPh) * .012 * bamp; x += b.r[0] * lat; z += b.r[2] * lat;
  const vr = (m.vx || 0) * b.r[0] + (m.vz || 0) * b.r[2]; G.roll = damp(G.roll, clamp(-vr * .0042, -.04, .04) - (m.slideT > 0 ? .06 : 0), 8, dt);
  fx_shake(_o); cam.x = x; cam.y = y; cam.z = z; cam.yaw = yaw + _o.x; cam.pitch = clamp(pitch + _o.y, -1.54, 1.54); cam.roll = G.roll + _o.r;
  /* FOV */
  let tgt = 1; if (isGun(me.w) && me.alive) { const f = w.scope ? (G.zoom === 2 ? w.adsFov2 : w.adsFov) : (w.adsFov || 1); tgt = lerp(1, f, vm.adsK); }
  tgt *= 1 + (m.sprinting ? .04 : 0); G.fovMul = damp(G.fovMul, tgt, 16, dt);
  const asp = G.R.w / G.R.h; cam.fov = vfovFrom(clamp(settings.fov || 90, 60, 120) * G.fovMul, asp);
  G.scoped = !!w.scope && vm.adsK > .9 && me.alive;
}
function fx_shake(o) { G.fx.shakeOffset(o); }
function specCamera(dt) {
  const cam = G.cam, W = G.map.W; G.deadT += dt;
  let tgt = G.specId && entOf(G.specId); if (tgt && !tgt.alive) { G.specId = ''; tgt = null; }
  if (!tgt && G.deadT > 1.8) { const c = specCandidates(); if (c.length) { G.specId = c[0].id; tgt = c[0]; } }
  const own = G.ents.get(G.myId), e = tgt || own || { x: cam.x, y: cam.y - 1.5, z: cam.z, yaw: G.view.yaw, pitch: 0 };
  const focus = { x: e.x, y: e.y + (tgt ? 1.45 : .5), z: e.z }; const yaw = tgt ? e.yaw : G.view.yaw, dist = tgt ? 3.6 : 2.8;
  /* procura um ângulo com visão livre (evita a câmera entrar no personagem ou atravessar árvores/paredes) */
  let best = null;
  for (const [pit, yo] of [[tgt ? .24 : .5 + .15 * Math.sin(G.time * .8), 0], [.55, 0], [.55, .9], [.55, -.9], [.95, 0], [1.25, 0]]) {
    const b = camBasis(yaw + yo, -pit), dx = -b.f[0], dy = -b.f[1], dz = -b.f[2]; const h = W.raycast(focus.x, focus.y, focus.z, dx, dy, dz, dist, true); const t = h ? h.t - .35 : dist;
    if (!best || t > best.t + .3) best = { t, dx, dy, dz }; if (t >= dist * .8) break;
  }
  let t = Math.max(1.3, best.t); const tx = focus.x + best.dx * t, ty = focus.y + best.dy * t, tz = focus.z + best.dz * t;
  const far = Math.hypot(cam.x - tx, cam.y - ty, cam.z - tz) > 6; const k = far ? 1 : Math.min(1, dt * 8);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k;
  /* nunca deixa a câmera ficar a menos de 1,2 m do alvo */
  { const ex = cam.x - focus.x, ey = cam.y - focus.y, ez = cam.z - focus.z, d = Math.hypot(ex, ey, ez); if (d < 1.2) { if (d < .01) { cam.y = focus.y + 1.2; } else { cam.x = focus.x + ex / d * 1.2; cam.y = focus.y + ey / d * 1.2; cam.z = focus.z + ez / d * 1.2; } } }
  const gy = W.heightAt(cam.x, cam.z) + .3; if (cam.y < gy) cam.y = gy;
  const lx = focus.x - cam.x, ly = focus.y - cam.y, lz = focus.z - cam.z; cam.yaw = Math.atan2(-lx, -lz); cam.pitch = Math.atan2(ly, Math.hypot(lx, lz)); cam.roll = 0; cam.fov = vfovFrom(settings.fov || 90, G.R.w / G.R.h); G.scoped = false; G.fovMul = 1;
}

/* ===================== ESTADO DE VISÃO DO HUD ===================== */
function getRoster() {
  const out = [];
  if (G.sim) {
    for (const p of G.sim.players) { const e = G.ents.get(p.id); out.push({ id: p.id, name: p.name, skin: p.skin, team: p.team, alive: p.alive, k: p.k, d: p.d, a: p.a, score: p.score, ping: p.ping | 0, bot: p.bot, isMe: p.id === G.myId, hp: p.hp, x: p.m.x, z: p.m.z, yaw: p.m.yaw, hasBomb: p.hasBomb, spotted: !!(e && e.spotted > 0), money: p.money | 0, hs: p.hs | 0, acc: p.shots ? Math.round(100 * (p.hits | 0) / p.shots) : 0, mvps: p.mvps | 0, squad: p.squad | 0, farmer: p.farmer || '' }); }
  } else {
    for (const r of G.rinfo.values()) { const e = G.ents.get(r.id), sb = G.sb.get(r.id) || {}; out.push({ id: r.id, name: r.name, skin: r.skin, team: e ? e.team : sb.team || 0, alive: e ? e.alive : false, k: sb.k | 0, d: sb.d | 0, a: sb.a | 0, score: sb.score | 0, ping: sb.ping | 0, bot: r.bot || !!sb.bot, isMe: r.id === G.myId, hp: e ? e.hp : 0, x: e ? e.x : 0, z: e ? e.z : 0, yaw: e ? e.yaw : 0, hasBomb: e ? e.bomb : false, spotted: !!(e && e.spotted > 0), money: sb.money | 0, hs: sb.hs | 0, acc: sb.acc | 0, mvps: sb.mvps | 0, squad: sqOfTeam(e ? e.team : sb.team || 0, G.swap | 0), farmer: sb.farmer || '' }); }
  }
  return out;
}
function nearestLootFor(me) { let best = null, bd = SIMC.PICK_R * SIMC.PICK_R; for (const l of G.loot) { const d = dist2(l.x, l.z, me.m.x, me.m.z); if (d < bd && Math.abs(l.y - me.m.y) < 2.2) { bd = d; best = l; } } return best; }
function inSiteClient(x, z) { for (const k in G.map.sites) { const S = G.map.sites[k]; if (x >= S.x0 && x <= S.x1 && z >= S.z0 && z <= S.z1) return S; } return null; }
function lootLabel(l) { if (l.k === 'w') return `${TIER_NAMES[l.w] ? TIER_NAMES[l.w][l.tier] : WEAPONS[l.w].name}`; if (l.k === 'a') return `Munição: ${AMMO_TYPES[l.w].name} (+${l.n})`; if (l.k === 'heal') return `${HEALS[l.w] ? HEALS[l.w].icon + ' ' + HEALS[l.w].name : 'Cura'}`; if (l.k === 'vest') return VESTS[l.tier].name; if (l.k === 'helm') return HELMETS[l.tier].name; if (l.k === 'pack') return PACKS[l.tier].name; if (l.k === 'sp') return SPECIALS[l.w].name; if (l.k === 'nade') return `Batatas explosivas (+${l.n})`; return 'Item'; }
function promptFor(me) {
  if (!me || !me.alive) return null;
  if (me.heal) { const H = HEAL_TAT[me.heal.k] || HEALS[me.heal.k]; return { text: `Usando ${H ? H.name : 'cura'}… (${keyName(bindOf('heal'))} cancela, dano interrompe)`, prog: G.kind === 'client' ? me.heal.t : me.heal.t / Math.max(.01, me.heal.max) }; }
  if (me.m && me.m.swim) return { text: `Nadando — arma guardada · ${keyName(bindOf('crouch'))} mergulha`, prog: -1 };
  if (G.phase !== 'live') return null; const b = G.bomb, tat = isTat();
  if (tat) {
    if (me.useK === 'plant') return { text: 'Plantando a mandioca…', prog: me.useT / Math.max(.01, me.useMax) };
    if (me.useK === 'defuse') return { text: 'Desarmando a mandioca…', prog: me.useT / Math.max(.01, me.useMax) };
    if (me.team === T_ATK) {
      if (me.hasBomb && b.st === 'carried' && me.m.gnd && inSiteClient(me.m.x, me.m.z)) return { text: 'Segure E para plantar a mandioca', prog: -1 };
      if (b.st === 'dropped' && Math.hypot(me.m.x - b.x, me.m.z - b.z) < 2.2) return { text: 'Pressione E para pegar a mandioca', prog: -1 };
    } else if (me.team === T_DEF && b.st === 'planted' && Math.hypot(me.m.x - b.x, me.m.z - b.z) < 2.3 && !b.defBy) return { text: 'Segure E para desarmar a mandioca', prog: -1 };
    return null;
  }
  const l = nearestLootFor(me); if (l) return { text: `E — pegar: ${lootLabel(l)}`, prog: -1 }; return null;
}
function buildV() {
  const me = G.me, tat = isTat(), cam = G.cam, b = G.bomb, ros = getRoster();
  const sc0 = G.score[G.swap] | 0, sc1 = G.score[G.swap ^ 1] | 0; let zoneText = '', zoneColor = '';
  if (tat && G.phase === 'live' && b.st === 'planted') { zoneText = `💣 A mandioca explode em ${Math.max(0, Math.ceil(b.timer))}s`; zoneColor = '#8a1a10cc'; }
  else if (!tat && G.zone && G.phase === 'live') { const z = G.zone, S = ZONE_STAGES[Math.min(z[7], ZONE_STAGES.length - 1)], st = z[9]; const out = me && Math.hypot(me.m.x - z[0], me.m.z - z[1]) > z[2]; zoneText = out ? '⚠ VOLTE PARA A ZONA! Você está levando dano' : st === 2 ? 'Zona final!' : st === 1 ? `⚠ Zona fechando… ${fmtTime(Math.max(0, S.shrink - z[6]))}` : `Zona fecha em ${fmtTime(Math.max(0, S.wait - z[6]))}`; zoneColor = out ? '#8a1a10cc' : '#0a3a6aaa'; }
  const sp = G.spec && G.specId ? entOf(G.specId) : null;
  const lt = G.kind === 'client' && G.nc ? G.nc.rtt : 0;
  let net = ''; if (settings.showFps) net += `${G.fps | 0} FPS`; if (settings.showPing && G.kind !== 'offline') net += `${net ? ' · ' : ''}${G.kind === 'host' ? 'Anfitrião (0 ms)' : Math.round(lt) + ' ms · perda ' + (G.pkExp ? (100 * G.pkLost / G.pkExp).toFixed(1) : '0.0') + '%'}`;
  return { mode: G.mode, modeName: MODES[G.mode].name, phase: G.phase, pt: G.pt, round: G.round, maxRounds: G.maxRounds, scoreAtk: sc0, scoreDef: sc1, score0: G.score[0] | 0, score1: G.score[1] | 0, swap: G.swap | 0, mySq: me && me.team ? sqOfTeam(me.team, G.swap | 0) : 0, myTeam: me ? me.team : 0, me, roster: ros, aliveN: G.aliveCount, bomb: b, zone: !tat ? G.zone : null, yaw: cam.yaw, px: cam.x, pz: cam.z, prompt: promptFor(me), zoneText, zoneColor, spec: G.spec ? (sp ? sp.name : 'sua câmera') : '', netText: net, funny: G.funny, endText: G.endText };
}
function updateSpotted(dt) {
  const me = G.me; if (!me || !me.alive) return; const W = G.map.W, cam = G.cam, b = camBasis(cam.yaw, 0);
  for (const e of G.ents.values()) { if (e.spotted > 0) e.spotted -= dt; if (e.rev && G.me && e.team !== G.me.team) e.spotted = Math.max(e.spotted || 0, .4); }
  G.spotT -= dt; if (G.spotT > 0) return; G.spotT = .12;
  for (const e of G.ents.values()) {
    if (e.id === G.myId || !e.alive || (isTat() && e.team === me.team)) continue; const dx = e.x - cam.x, dz = e.z - cam.z, d = Math.hypot(dx, dz); if (d > 70) continue;
    const fw = (dx * b.f[0] + dz * b.f[2]) / (d || 1); if (d > 9 && fw < .35) continue;
    if (W.los(cam.x, cam.y, cam.z, e.x, e.y + 1.3, e.z)) e.spotted = .45;
  }
}
/* ===================== MORTES CARTOON ===================== */
/* escolhe a animação de eliminação pela arma/situação; chapéu voa no tiro na cabeça */
function deathStyle(ve, ae, e) {
  const w = e.w, hash = (String(e.v).split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0) | 0, 7) + Math.floor(G.time * 10)) >>> 0;
  let dv = [0, 1, 4][hash % 3];
  if (w === 'batata' || w === 'mandioca' || w === 'porteira') dv = 3; else if (e.hs) dv = 2; else if (w === 'faca') dv = 4; else if (w === 'queda') dv = 1; else if (w === 'zona') dv = 4;
  ve.dv = dv; ve.dvD = 0; const pos = { x: ve.x, y: ve.y + 1, z: ve.z };
  let ax = ae ? ve.x - ae.x : -Math.sin(ve.yaw), az = ae ? ve.z - ae.z : -Math.cos(ve.yaw);
  if (w === 'batata' || w === 'mandioca') { const ex = (e.ex !== undefined ? e.ex : ve.x - ax), ez = (e.ez !== undefined ? e.ez : ve.z - az); ax = ve.x - ex; az = ve.z - ez; }
  const L = Math.hypot(ax, az) || 1; ax /= L; az /= L; ve.dvA = Math.atan2(ax, az);
  if (dv === 3) { const W = G.map && G.map.W, h = W && W.raycast ? W.raycast(ve.x, ve.y + .9, ve.z, ax, 0, az, 3, true) : null; ve.dvD = Math.max(0, Math.min(w === 'porteira' ? 1.6 : 2.6, h ? h.t - .5 : 2.6)); }
  if (e.hs) { const AL = isTat() && agentLook(ve.farmer), hat = AL ? (AL.hat === 'none' ? '' : AL.hat) : hatOf(ve.skin); if (hat && !ve.hatOff) { G.fx.hatPop(ve.x, ve.y + 1.75, ve.z, hat, ax, az); ve.hatOff = true; ve.hatT = G.time; sfx.funny('hat', pos); } }
  G.fx.poof(ve.x, ve.y, ve.z, SKINS[(ve.skin | 0) % SKINS.length].special === 'chicken');
  if (settings.funnyDeaths !== false) sfx.funny(dv === 3 ? 'launch' : dv === 1 ? 'plop' : dv === 2 ? 'dizzy' : 'fall', pos);
}
/* ===================== NÚMEROS DE DANO ===================== */
function addDmgNum(vid, d, head) {
  if (settings.dmgNums === false || !(d > 0)) return; const ve = entOf(vid); if (!ve) return; const L = G.dmgNums || (G.dmgNums = []);
  const last = L.find(n => n.id === vid && G.time - n.t0 < .35); if (last) { last.v += d; last.head = last.head || head; last.t0 = G.time; last.pop = 1; return; }
  if (L.length > 24) L.shift(); L.push({ id: vid, v: d, head, t0: G.time, x: ve.x, y: ve.y + 1.9, z: ve.z, ox: rnd(-.25, .25), pop: 1 });
}
function drawDmgNums(c, VP, W, H) {
  const L = G.dmgNums; if (!L || !L.length) return; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  for (let i = L.length - 1; i >= 0; i--) {
    const n = L[i], age = G.time - n.t0; if (age > .9) { L.splice(i, 1); continue; }
    const ve = entOf(n.id); if (ve && ve.alive) { n.x = ve.x; n.z = ve.z; n.y = ve.y + 1.9; }
    const p = project(VP, n.x + n.ox, n.y + age * .9, n.z, W, H); if (!p) continue;
    const pop = age < .12 ? 1 + (1 - age / .12) * .45 : 1, dist = clamp(1.6 - p[2] / 60, .65, 1.25), sz = Math.round((n.head ? 27 : 22) * pop * dist);
    c.globalAlpha = age > .6 ? 1 - (age - .6) / .3 : 1; c.font = `900 ${sz}px Nunito, sans-serif`; c.lineWidth = Math.max(3, sz * .2); c.strokeStyle = '#000c';
    const txt = String(Math.round(n.v)) + (n.head ? '!' : ''); c.strokeText(txt, p[0], p[1]); c.fillStyle = n.head ? '#ffd23a' : '#ffffff'; c.fillText(txt, p[0], p[1]);
  }
  c.globalAlpha = 1;
}
/* nomes dos aliados sobre a cabeça */
function drawTags() {
  const cv = G.tagsCv; if (!cv) return; const W = innerWidth, H = innerHeight; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const c = cv.getContext('2d'); c.clearRect(0, 0, W, H); if (!G.me || G.scene !== 'play') return;
  const VP = G.R.VP; drawDmgNums(c, VP, W, H); if (!isTat()) return; drawRevealed(c, VP, W, H); c.font = '800 13px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.lineWidth = 3; c.strokeStyle = '#000b';
  for (const e of G.ents.values()) {
    if (e.id === G.myId || !e.alive || e.team !== G.me.team) continue; const d = Math.hypot(e.x - G.cam.x, e.z - G.cam.z); if (d > 55) continue;
    const p = project(VP, e.x, e.y + 2.15, e.z, W, H); if (!p) continue;
    const a = clamp(1.3 - d / 55, .35, 1), nm = e.name || '?'; c.globalAlpha = a; c.fillStyle = sqOfTeam(G.me.team, G.swap | 0) === 0 ? '#9cc4ff' : '#ffa89c'; c.strokeText(nm, p[0], p[1]); c.fillText(nm, p[0], p[1]);
    c.fillStyle = '#0008'; c.fillRect(p[0] - 17, p[1] + 2, 34, 4); c.fillStyle = e.hp > 40 ? '#6fe05a' : '#ff6a5a'; c.fillRect(p[0] - 17, p[1] + 2, 34 * clamp(e.hp / 100, 0, 1), 4);
    if (e.bomb) { c.fillStyle = '#ffc61a'; c.fillText('💣', p[0] + 26, p[1]); }
  }
  c.globalAlpha = 1;
}
