/* =====================================================================
   03_move.js — movimento do jogador (compartilhado: servidor + predição)
   Aceleração estilo Source, pulo variável + coyote + buffer, deslize,
   escalada automática (mantle/vault), água, lama, degraus e rampas.
   ===================================================================== */
'use strict';
const PH = {
  R: 0.4, H: 1.8, HC: 1.25, EYE: 1.62, EYEC: 1.12, STEP: 0.56, G: 22, JUMP: 7.2,
  WALK: 4.4, RUN: 7.0, CROUCH: 2.3, SLIDE: 9.2, SLIDE_T: 0.85, SLIDE_CD: 0.9,
  ACC: 11, FRIC: 8.5, AIRACC: 4.2, COYOTE: 0.11, JBUF: 0.13, MAXFALL: -42
};
function newMoveState(x, y, z) {
  return {
    x: x || 0, y: y || 0, z: z || 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, gnd: false, cr: 0, slideT: 0, slideCd: 0,
    mant: 0, mdur: 0.35, mx0: 0, my0: 0, mz0: 0, mx1: 0, my1: 0, mz1: 0, marc: 0, coy: 0, jbuf: 0, jumping: false, cprev: false,
    landV: 0, hspd: 0, wade: 0, stepD: 0, airSpd: 0, sliding: false, lastJump: false
  };
}
const curH = p => PH.H + (PH.HC - PH.H) * p.cr;
const eyeH = p => (PH.EYE + (PH.EYEC - PH.EYE) * p.cr) - (p.slideT > 0 ? 0.12 : 0);

/* algo bloqueia o cilindro do jogador em (x,z) entre y e y+h? */
function blockedAt(W, x, z, y, h, r) {
  r = r || PH.R; W.query(x, z, r + 0.05);
  for (const b of W.qb) {
    if (b.y1 <= y + 0.02 || b.y0 >= y + h - 0.001) continue;
    const cx = clamp(x, b.x0, b.x1), cz = clamp(z, b.z0, b.z1), dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r * r) return true;
  }
  for (const c of W.qc) {
    if (c.y1 <= y + 0.02 || c.y0 >= y + h - 0.001) continue;
    const dx = x - c.x, dz = z - c.z, rr = r + c.r; if (dx * dx + dz * dz < rr * rr) return true;
  }
  return false;
}
/* superfície mais alta sob o jogador com topo <= yLim */
function floorAt(W, x, z, yLim) {
  let f = W.heightAt(x, z); const r = PH.R * 0.85; W.query(x, z, r + 0.05);
  for (const b of W.qb) {
    if (b.y1 > yLim) continue; if (b.y1 <= f) continue;
    const cx = clamp(x, b.x0, b.x1), cz = clamp(z, b.z0, b.z1), dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r * r) f = b.y1;
  }
  for (const c of W.qc) {
    if (c.y1 > yLim || c.y1 <= f) continue;
    const dx = x - c.x, dz = z - c.z, rr = r + c.r; if (dx * dx + dz * dz < rr * rr) f = c.y1;
  }
  return f;
}
function ceilAt(W, x, z, yTop, yMax) {
  let c = 1e9; const r = PH.R * 0.85; W.query(x, z, r + 0.05);
  for (const b of W.qb) {
    if (b.y0 < yTop - 0.02 || b.y0 > yMax) continue;
    const cx = clamp(x, b.x0, b.x1), cz = clamp(z, b.z0, b.z1), dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r * r && b.y0 < c) c = b.y0;
  }
  return c;
}

function tryMantle(p, W, fx, fz) {
  const h = curH(p);
  let best = null, bestTop = -1;
  for (const d of [0.55, 0.85]) {
    const px = p.x + fx * d, pz = p.z + fz * d; W.query(px, pz, 0.45);
    for (const b of W.qb) {
      const rise = b.y1 - p.y; if (rise < PH.STEP + 0.04 || rise > 1.6) continue;
      if (b.y0 > p.y + 0.9) continue;
      const cx = clamp(px, b.x0, b.x1), cz = clamp(pz, b.z0, b.z1); if (Math.hypot(px - cx, pz - cz) > 0.34) continue;
      if (b.y1 > bestTop) { bestTop = b.y1; best = b; }
    }
  }
  if (!best) return false;
  const b = best;
  /* distâncias de entrada/saída do raio frontal na caixa */
  let tn = 0, tf = 1e9;
  if (fx !== 0) { const a = (b.x0 - p.x) / fx, c = (b.x1 - p.x) / fx; tn = Math.max(tn, Math.min(a, c)); tf = Math.min(tf, Math.max(a, c)); }
  else if (p.x < b.x0 || p.x > b.x1) return false;
  if (fz !== 0) { const a = (b.z0 - p.z) / fz, c = (b.z1 - p.z) / fz; tn = Math.max(tn, Math.min(a, c)); tf = Math.min(tf, Math.max(a, c)); }
  else if (p.z < b.z0 || p.z > b.z1) return false;
  if (tf <= tn) return false;
  const thick = tf - tn;
  let tx, ty, tz, arc;
  if (thick < 0.75) { /* vault: pula sobre cercas/muros finos */
    tx = p.x + fx * (tf + PH.R + 0.12); tz = p.z + fz * (tf + PH.R + 0.12);
    ty = floorAt(W, tx, tz, b.y1 + 0.05); arc = 0.35;
    if (blockedAt(W, tx, tz, ty, h)) return false;
    if (blockedAt(W, p.x + fx * (tn + thick * 0.5), p.z + fz * (tn + thick * 0.5), b.y1, h, 0.15)) return false;
  } else {
    tx = p.x + fx * (tn + Math.min(0.55, thick * 0.6)); tz = p.z + fz * (tn + Math.min(0.55, thick * 0.6)); ty = b.y1; arc = 0.12;
    if (blockedAt(W, tx, tz, ty, h)) return false;
  }
  /* cabeça livre durante a subida */
  if (ceilAt(W, p.x, p.z, p.y + h, b.y1 + h) < b.y1 + h - 0.01) return false;
  p.mant = 1e-4; p.mx0 = p.x; p.my0 = p.y; p.mz0 = p.z; p.mx1 = tx; p.my1 = ty; p.mz1 = tz; p.marc = arc;
  p.mdur = 0.26 + 0.17 * (ty - p.y > 0 ? (ty - p.y) : 0.3) + (thick < 0.75 ? 0.08 : 0);
  p.vx = p.vz = p.vy = 0; p.jumping = false;
  return true;
}

/* c: {mvf,mvr,yaw,pitch,jump,crouch,sprint}; m: {spd,frozen,noSprint} */
function stepPlayer(p, c, m, W, dt) {
  p.yaw = c.yaw; p.pitch = c.pitch; p.landV = 0;
  m = m || {};
  /* --- escalada em andamento --- */
  if (p.mant > 0) {
    p.mant += dt / p.mdur;
    const t = Math.min(1, p.mant), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    p.x = p.mx0 + (p.mx1 - p.mx0) * e; p.z = p.mz0 + (p.mz1 - p.mz0) * e;
    p.y = p.my0 + (p.my1 - p.my0) * e + Math.sin(Math.PI * t) * p.marc;
    p.cr = Math.min(1, p.cr + dt * 3);
    if (p.mant >= 1) { p.mant = 0; p.x = p.mx1; p.z = p.mz1; p.y = p.my1; p.gnd = true; p.vy = 0; const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); p.vx = fx * 2; p.vz = fz * 2; }
    p.hspd = 0; return;
  }
  const frozen = !!m.frozen;
  let mvf = frozen ? 0 : c.mvf, mvr = frozen ? 0 : c.mvr;
  const jump = !frozen && c.jump, crouchIn = !frozen && c.crouch;
  const h0 = curH(p);

  /* --- entrada --- */
  const sn = Math.sin(p.yaw), cs = Math.cos(p.yaw);
  let wx = -sn * mvf + cs * mvr, wz = -cs * mvf - sn * mvr;
  const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
  const wmag = Math.min(1, wl);
  const hs = Math.hypot(p.vx, p.vz);

  /* zona de superfície */
  const wade = W.waterDepth(p.x, p.z); p.wade = wade;
  /* natação: rio/lago fundo com o corpo dentro d'água */
  const swim = wade > 1.25 && p.y < W.waterY - 0.8; p.swim = swim;
  let zoneMul = 1;
  if (wade > 0) zoneMul *= 1 - 0.38 * Math.min(1, wade / 0.8);
  else { const sf = W.surfaceAt(p.x, p.z); if (sf === 'mud') zoneMul = 0.82; else if (sf === 'corn') zoneMul = 0.9; }

  /* --- deslize --- */
  if (p.slideCd > 0) p.slideCd -= dt;
  if (crouchIn && !p.cprev && p.gnd && !swim && c.sprint && mvf > 0.3 && hs > 5.6 && p.slideCd <= 0 && p.slideT <= 0 && wade < 0.3) {
    p.slideT = PH.SLIDE_T; const k = Math.max(hs, PH.SLIDE) / (hs || 1); p.vx *= k; p.vz *= k;
  }
  p.cprev = crouchIn;
  if (p.slideT > 0) {
    p.slideT -= dt; if (!p.gnd) p.slideT -= dt;
    if (jump || hs < 3.2) { if (p.slideT > 0) p.slideCd = PH.SLIDE_CD; p.slideT = 0; }
    if (p.slideT <= 0) p.slideCd = Math.max(p.slideCd, PH.SLIDE_CD);
  }
  p.sliding = p.slideT > 0;

  /* --- agachar --- */
  const wantCrouch = (crouchIn && !swim) || p.sliding;
  if (wantCrouch) p.cr = Math.min(1, p.cr + dt * (p.sliding ? 16 : 8));
  else if (p.cr > 0) { const nh = PH.H + (PH.HC - PH.H) * Math.max(0, p.cr - dt * 7); if (!blockedAt(W, p.x, p.z, p.y, nh)) p.cr = Math.max(0, p.cr - dt * 7); }

  /* --- velocidade-alvo --- */
  let base = PH.WALK;
  const crouched = p.cr > 0.55;
  if (crouched) base = PH.CROUCH;
  else if (c.sprint && mvf > 0.1 && !m.noSprint && wade < 0.35 && !frozen) base = PH.RUN;
  if (mvf < -0.1) base *= 0.85;
  if (swim) { base = crouchIn ? 2.6 : 3.1; zoneMul = 1; }
  const wish = base * (m.spd || 1) * zoneMul * wmag;
  p.sprinting = base === PH.RUN && wmag > 0.1 && !swim;

  /* --- aceleração --- */
  if (p.sliding) {
    const sp = Math.hypot(p.vx, p.vz) || 1, k = Math.max(0, sp - dt * (PH.SLIDE * 0.9 / PH.SLIDE_T)) / sp; p.vx *= k; p.vz *= k;
    p.vx += wx * dt * 5; p.vz += wz * dt * 5;
  } else if (p.gnd || swim) {
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > 0.001) { const drop = Math.max(sp, 1.6) * PH.FRIC * dt, ns = Math.max(0, sp - drop) / sp; p.vx *= ns; p.vz *= ns; }
    if (wmag > 0) {
      const cur = p.vx * wx / wmag + p.vz * wz / wmag; const dx = wx / wmag, dz = wz / wmag;
      let add = wish - cur; if (add > 0) { let a = PH.ACC * wish * dt; if (a > add) a = add; p.vx += dx * a; p.vz += dz * a; }
    }
  } else if (wmag > 0) {
    const dx = wx / wmag, dz = wz / wmag, cap = Math.min(wish, PH.RUN * 0.95 * (m.spd || 1));
    const cur = p.vx * dx + p.vz * dz; let add = cap - cur;
    if (add > 0) { let a = PH.AIRACC * cap * dt; if (a > add) a = add; p.vx += dx * a; p.vz += dz * a; }
    const lim = Math.max(PH.RUN * 1.12, p.airSpd), sp = Math.hypot(p.vx, p.vz); if (sp > lim) { p.vx *= lim / sp; p.vz *= lim / sp; }
  }

  /* --- pulo (buffer + coyote + altura variável) --- */
  if (jump && !p.lastJump) p.jbuf = PH.JBUF; else if (p.jbuf > 0) p.jbuf -= dt;
  p.lastJump = jump;
  if (p.gnd) p.coy = PH.COYOTE; else if (p.coy > 0) p.coy -= dt;
  if (swim) { p.coy = 0; p.jbuf = 0; p.jumping = false; }
  if (p.jbuf > 0 && p.coy > 0 && !frozen && !swim) {
    p.vy = PH.JUMP * (wade > 0.4 ? 0.7 : 1); p.gnd = false; p.coy = 0; p.jbuf = 0; p.jumping = true; p.airSpd = Math.hypot(p.vx, p.vz);
    if (p.sliding) { p.slideT = 0; p.slideCd = PH.SLIDE_CD; p.vx *= 1.06; p.vz *= 1.06; }
  }
  if (p.jumping && !jump && p.vy > 3.4) { p.vy = 3.4; p.jumping = false; }
  if (p.vy <= 0) p.jumping = false;

  /* --- mantle: segurar pulo contra uma beirada/cerca --- */
  if (jump && mvf > 0.2 && !frozen && p.slideT <= 0 && (!p.gnd || p.jbuf > 0 || p.vy > 0 || true)) {
    if (!p.gnd || p.jbuf > 0) { if (tryMantle(p, W, -Math.sin(p.yaw), -Math.cos(p.yaw))) return; }
  }

  /* --- gravidade --- */
  if (swim) {
    /* flutua com a cabeça para fora; agachar = mergulho curto; pular = sobe */
    const ty = crouchIn && !frozen ? W.waterY - 3.0 : W.waterY - 1.38 + (jump ? 0.25 : 0) + Math.sin((p.stepD || 0) * 2) * 0.03;
    p.vy = clamp((ty - p.y) * 2.6, -2.4, 2.6); p.gnd = false;
  } else if (!p.gnd) { p.vy -= PH.G * dt; if (p.vy < PH.MAXFALL) p.vy = PH.MAXFALL; }
  const vyBefore = p.vy;

  /* --- movimento horizontal + colisão --- */
  const h = curH(p);
  p.x += p.vx * dt; p.z += p.vz * dt;
  p.x = clamp(p.x, W.x0 + 0.5, W.x1 - 0.5); p.z = clamp(p.z, W.z0 + 0.5, W.z1 - 0.5);
  for (let it = 0; it < 3; it++) {
    let hit = false; W.query(p.x, p.z, PH.R + 0.1);
    const qb = W.qb, qc = W.qc;
    for (let i = 0; i < qb.length; i++) {
      const b = qb[i];
      if (p.y >= b.y1 - 0.001 || p.y + h <= b.y0 + 0.001) continue;
      const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= PH.R * PH.R) continue;
      /* degrau? */
      if (b.y1 - p.y <= PH.STEP && p.vy <= 0.5 && !blockedAt(W, p.x, p.z, b.y1, h)) { p.y = b.y1; p.gnd = true; if (p.vy < 0) p.vy = 0; hit = true; continue; }
      let nx, nz, pen;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = PH.R - d; }
      else { const m4 = [p.x - b.x0, b.x1 - p.x, p.z - b.z0, b.z1 - p.z]; let k = 0; for (let q = 1; q < 4; q++) if (m4[q] < m4[k]) k = q; nx = k === 0 ? -1 : k === 1 ? 1 : 0; nz = k === 2 ? -1 : k === 3 ? 1 : 0; pen = m4[k] + PH.R; }
      p.x += nx * pen; p.z += nz * pen;
      const vn = p.vx * nx + p.vz * nz; if (vn < 0) { p.vx -= nx * vn; p.vz -= nz * vn; }
      hit = true;
    }
    for (let i = 0; i < qc.length; i++) {
      const o = qc[i];
      if (p.y >= o.y1 - 0.001 || p.y + h <= o.y0 + 0.001) continue;
      const dx = p.x - o.x, dz = p.z - o.z, rr = PH.R + o.r, d2 = dx * dx + dz * dz; if (d2 >= rr * rr) continue;
      if (o.y1 - p.y <= PH.STEP && p.vy <= 0.5 && !blockedAt(W, p.x, p.z, o.y1, h)) { p.y = o.y1; p.gnd = true; if (p.vy < 0) p.vy = 0; hit = true; continue; }
      const d = Math.sqrt(d2) || 1e-4, nx = dx / d, nz = dz / d, pen = rr - d; p.x += nx * pen; p.z += nz * pen;
      const vn = p.vx * nx + p.vz * nz; if (vn < 0) { p.vx -= nx * vn; p.vz -= nz * vn; } hit = true;
    }
    if (!hit) break;
  }

  /* --- vertical --- */
  let ny = p.y + p.vy * dt;
  if (p.vy > 0) {
    const ce = ceilAt(W, p.x, p.z, p.y + h, ny + h + 0.02);
    if (ce < 1e8 && ny + h > ce) { ny = ce - h; p.vy = 0; p.jumping = false; }
    p.y = ny; p.gnd = false;
  } else {
    const fl = floorAt(W, p.x, p.z, p.y + (p.gnd ? PH.STEP : 0.03));
    if (ny <= fl + 0.0005) {
      if (!p.gnd && vyBefore < -4) p.landV = -vyBefore;
      p.y = fl; p.vy = 0; if (!p.gnd) { p.gnd = true; p.jumping = false; }
    } else if (p.gnd && p.y - fl < 0.42 && p.vy <= 0 && !p.jumping) { p.y = fl; p.vy = 0; }
    else { p.y = ny; p.gnd = false; }
  }
  p.hspd = Math.hypot(p.vx, p.vz);
  p.stepD += (p.gnd || swim) ? p.hspd * dt : 0;
}
