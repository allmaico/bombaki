/* =====================================================================
   47_flow.js — FLUXO DA PARTIDA 5x5 (máquina de estados, lado do anfitrião)
   SELEÇÃO DE AGENTES (80 s) → CARREGAMENTO DO MAPA → COMPRA (45 s na 1ª rodada de cada metade)
   → ROUND (1min40s; mandioca plantada: 45 s) → RESULTADO (7 s) → COMPRA (30 s) → ROUND … → FIM DA PARTIDA.
   Barreiras da compra: só nas saídas do spawn de ATAQUE (a defesa circula
   livre entre A e B e já pode montar armadilhas). Tudo validado aqui.
   ===================================================================== */
'use strict';
const FLOW_T = { select: 80, loadMin: 2.5, loadMax: 25, buy1: 45, buy: 30 };   /* estilo Valorant competitivo */
/* fase interna → estado oficial */
const FLOW_STATE = { lobby: 'LOBBY', select: 'AGENT_SELECTION', loading: 'MAP_LOADING', live: 'ROUND_ACTIVE', post: 'ROUND_RESULT', over: 'MATCH_FINISHED' };
/* transições válidas (qualquer outra é recusada) */
const FLOW_NEXT = { lobby: ['select', 'prep'], select: ['loading'], loading: ['prep'], prep: ['live'], live: ['post'], post: ['prep', 'over'], over: [] };

/* ---------- barreiras do spawn de ataque (calculadas da malha de navegação; iguais no anfitrião e nos clientes) ---------- */
function computeBarrier(map, nav) {
  if (map._barrier !== undefined) return map._barrier;
  map._barrier = null; if (!map.sites || !map.spawns || !map.spawns.atk || !nav || typeof nav.idx !== 'function' || !nav.ok) return null;
  const gw = nav.gw, gh = nav.gh, N = nav.N, ok = nav.ok, ny = nav.y, dist = new Int32Array(N).fill(-1), q = new Int32Array(N); let qh = 0, qt = 0;
  for (const s of map.spawns.atk) { const k = nav.idx(s.x, s.z); if (k >= 0 && ok[k] && dist[k] < 0) { dist[k] = 0; q[qt++] = k; } }
  if (!qt) return null;
  const nb = k => { const i = k % gw, j = (k / gw) | 0, o = []; if (i > 0) o.push(k - 1); if (i < gw - 1) o.push(k + 1); if (j > 0) o.push(k - gw); if (j < gh - 1) o.push(k + gw); return o; };
  while (qh < qt) { const k = q[qh++]; for (const n of nb(k)) if (ok[n] && dist[n] < 0 && Math.abs(ny[n] - ny[k]) < 1.2) { dist[n] = dist[k] + 1; q[qt++] = n; } }
  /* limite: a região do ataque nunca chega perto dos bombsites nem do spawn da defesa */
  let lim = 1e9; const near = (x, z) => { const k = nav.idx(x, z); if (k >= 0 && dist[k] >= 0) lim = Math.min(lim, dist[k]); };
  for (const id in map.sites) { const S = map.sites[id]; for (let x = S.x0; x <= S.x1; x += 1) for (let z = S.z0; z <= S.z1; z += 1) near(x, z); }
  for (const s of map.spawns.def || []) near(s.x, s.z);
  const hist = new Int32Array(Math.max(2, Math.min(lim, 400) + 2)); for (let k = 0; k < N; k++) if (dist[k] >= 0 && dist[k] < hist.length) hist[dist[k]]++;
  /* escolhe o raio cuja fronteira é a mais estreita (as "portas" do spawn) */
  const dMin = 10, dMax = Math.max(dMin + 2, Math.min(lim - 10, 48)); let best = -1, bestN = 1e9;
  for (let D = dMin; D <= dMax && D + 1 < hist.length; D++) { const n = hist[D + 1]; if (n > 0 && n < bestN - 1) { bestN = n; best = D; } }
  if (best < 0) return null;
  const D = best, cells = [], inReg = k => dist[k] >= 0 && dist[k] <= D;
  for (let k = 0; k < N; k++) if (dist[k] === D + 1) cells.push({ k, x: nav.cx(k), z: nav.cz(k), y: ny[k], low: false });
  const set0 = new Set(cells.map(c => c.k));   /* fronteira principal (já é barreira) */
  /* obstáculos escaláveis (caixas, fardos) e passagens estreitas (portas) entre a região e o resto: o grupo INTEIRO que liga
     o spawn ao lado de fora ganha barreira (ninguém passa por baixo, pela porta, nem anda por cima das caixas) */
  const W = map.W, cand = new Uint8Array(N), gy = new Float32Array(N);
  for (let k = 0; k < N; k++) { if (ok[k]) continue; const x = nav.cx(k), z = nav.cz(k), f = W.heightAt(x, z); gy[k] = f; if (!W.solidAt(x, f + 1.0, z) || !W.solidAt(x, f + .4, z) || !W.solidAt(x, f + 2.9, z)) cand[k] = 1; }
  const blobSeen = new Uint8Array(N);
  for (let k0 = 0; k0 < N; k0++) {
    if (!cand[k0] || blobSeen[k0]) continue; const blob = [], st = [k0]; blobSeen[k0] = 1; let inside = false, outside = false, fy = -1e9;
    while (st.length && blob.length < 400) {
      const k = st.pop(); blob.push(k); const i = k % gw, j = (k / gw) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= gw || jj >= gh || (!di && !dj)) continue; const n = jj * gw + ii;
        if (ok[n]) { if (inReg(n)) { inside = true; fy = Math.max(fy, ny[n]); } else if (!set0.has(n)) outside = true; }
        else if (cand[n] && !blobSeen[n]) { blobSeen[n] = 1; st.push(n); } }
    }
    if (!inside || !outside) continue;
    for (const k of blob) { const x = nav.cx(k), z = nav.cz(k), f = Math.min(gy[k], fy), low = W.solidAt(x, gy[k] + 1.0, z) && W.solidAt(x, gy[k] + .4, z); cells.push({ k, x, z, y: low ? Math.max(gy[k], fy) : f, low }); }
  }
  /* portões (grupos conectados) para os bots e o desenho */
  const set = new Map(cells.map(c => [c.k, c])), seen = new Set(), gates = [];
  for (const c of cells) {
    if (seen.has(c.k) || c.low) continue; const grp = [], st = [c]; seen.add(c.k);
    while (st.length) { const a = st.pop(); grp.push(a); const i = a.k % gw, j = (a.k / gw) | 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const n = (j + dj) * gw + i + di, b = set.get(n); if (b && !seen.has(n) && !b.low) { seen.add(n); st.push(b); } } }
    let gx = 0, gz = 0; for (const a of grp) { gx += a.x; gz += a.z; } gx /= grp.length; gz /= grp.length;
    /* normal para fora: do centro do spawn para o portão */
    let sx = 0, sz = 0; for (const s of map.spawns.atk) { sx += s.x; sz += s.z; } sx /= map.spawns.atk.length; sz /= map.spawns.atk.length;
    const l = Math.hypot(gx - sx, gz - sz) || 1; gates.push({ x: gx, z: gz, nx: (gx - sx) / l, nz: (gz - sz) / l, n: grp.length });
  }
  const cs = nav.cs * .5;
  const boxes = cells.map(c => [c.x - cs, c.y - .3, c.z - cs, c.x + cs, c.y + (c.low ? 7 : 5.5), c.z + cs]);
  /* ligações entre células vizinhas (fios da cerca elétrica) */
  const links = []; for (const c of cells) { if (c.low) continue; const i = c.k % gw, j = (c.k / gw) | 0; for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const b = set.get((j + dj) * gw + i + di); if (b && !b.low) links.push([c, b]); } }
  map._barrier = { D, dist, cells, boxes, gates, links, on: false, objs: [] };
  return map._barrier;
}
/* liga/desliga a colisão real das barreiras num mundo (idempotente) */
function setBarrier(W, bar, on) {
  if (!bar || !W || bar.on === !!on) return; bar.on = !!on;
  if (on) bar.objs = bar.boxes.map(b => { const o = W.addDyn(b, 'barrier'); o.barrier = true; return o; });
  else { for (const o of bar.objs) W.removeDyn(o); bar.objs = []; }
}

Object.assign(Sim.prototype, /** @type {ThisType<Sim> & Record<string, any>} */ ({
  flowState() { return this.phase === 'prep' ? (this.round <= 1 ? 'INITIAL_BUY_PHASE' : 'ROUND_BUY_PHASE') : FLOW_STATE[this.phase] || this.phase; },
  /* toda troca de fase passa por aqui (estados incompatíveis são recusados) */
  setPhase(ph) {
    const ok = FLOW_NEXT[this.phase]; if (ok && !ok.includes(ph) && this.phase !== ph) { this.flowErr = (this.flowErr | 0) + 1; return false; }
    this.phase = ph;
    if (this.mode === 'tatico') { const bar = this.barrier; setBarrier(this.W, bar, ph === 'prep'); }
    return true;
  },
  /* ---------- SELEÇÃO DE AGENTES ---------- */
  beginSelect() {
    this.barrier = this.mode === 'tatico' ? computeBarrier(this.map, this.nav) : null;
    this.setPhase('select'); this.pt = this.cfg.selectTime || FLOW_T.select; this.selT = 0;
    for (const p of this.players) {
      p.farmer = ''; p.ready = false; p.alive = false; p.abC = [0, 0];
      /* bots escolhem em momentos diferentes (sem atrasar a partida) */
      p.pickAt = p.bot ? this.rng.f() * 10 + 2 : (this.cfg.autoPick ? .5 : 1e9);
    }
    this.emit({ t: 'flow', s: 'select', pt: this.pt });
  },
  stepSelect(dt) {
    this.pt -= dt; this.selT += dt;
    for (const p of this.players) if (!p.farmer && this.selT >= p.pickAt) this.autoPickFarmer(p);
    const all = this.players.every(p => !!p.farmer);
    if (!all && this.pt <= 0) for (const p of this.players) if (!p.farmer) this.autoPickFarmer(p, true);
    if (all || this.pt <= 0) this.beginLoading();
  },
  /* escolha automática: bot (com preferência de função) ou jogador que não escolheu a tempo */
  autoPickFarmer(p, timeout) {
    const used = new Set(this.players.filter(q => q !== p && q.squad === p.squad && q.farmer).map(q => q.farmer));
    const free = FARMER_IDS.filter(f => !used.has(f)); if (!free.length) { p.farmer = FARMER_IDS[this.rng.int(0, FARMER_IDS.length - 1)]; }
    else if (!p.bot && FARMERS[p.wantFar] && free.includes(p.wantFar)) p.farmer = p.wantFar;
    else { const pref = ['mateiro', 'rastreador', 'guardiao', 'peao', 'socorrista'].filter(f => free.includes(f)); p.farmer = this.rng.chance(.6) ? pref[0] : free[this.rng.int(0, free.length - 1)]; }
    this.refillAbilities(p); this.emit({ t: 'far', p: p.id, f: p.farmer, auto: timeout ? 1 : 0 });
  },
  /* ---------- CARREGAMENTO ---------- */
  beginLoading() {
    if (!this.setPhase('loading')) return; this.pt = FLOW_T.loadMax; this.loadT = 0;
    for (const p of this.players) p.ready = p.bot || !!p.local || !p.connected;
    this.emit({ t: 'flow', s: 'loading', pt: this.pt });
  },
  stepLoading(dt) {
    this.pt -= dt; this.loadT += dt;
    const all = this.players.every(p => p.ready || p.bot || !p.connected);
    if ((all && this.loadT >= (this.cfg.loadMin !== undefined ? this.cfg.loadMin : FLOW_T.loadMin)) || this.pt <= 0) {
      for (const p of this.players) if (!p.ready) p.ready = true;   /* quem não carregou a tempo entra assim que puder (não trava a partida) */
      this.startRound();
    }
  },
  /* ações aceitas fora de rodada (seleção/carregamento) */
  flowAct(p, a) {
    if (a.startsWith('far:')) this.pickFarmer(p, a.slice(4));
    else if (a === 'rdy' && this.phase === 'loading') { if (!p.ready) { p.ready = true; this.emit({ t: 'rdy', p: p.id }); } }
  },
  /* dados da seleção/carregamento para os clientes */
  selSnap() { return this.players.map(p => [p.id, p.squad | 0, FARMER_IDS.indexOf(p.farmer), p.ready ? 1 : 0, p.bot ? 1 : 0]); }
}));
