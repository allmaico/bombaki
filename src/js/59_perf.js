/* =====================================================================
   59_perf.js — medidor de desempenho e benchmark (Render v2)
   • Configurações → Gráficos → "Medidor de desempenho detalhado" (ou ?perf=1)
     mostra FPS, tempo de quadro (média / p95 / pior), tempo de CPU do
     render, tempo de GPU por passe (sombra, cena, pós) quando o navegador
     expõe EXT_disjoint_timer_query_webgl2, chamadas de desenho, triângulos,
     resolução, caminho de render, memória de vídeo estimada e heap JS.
   • ?bench=1 (com ?auto=caos ou tatico): percorre os presets Alto, Médio,
     Baixo e Muito baixo no mesmo ponto do mapa (câmera girando devagar) e
     mostra uma tabela comparativa — serve para medir no SEU hardware.
   ===================================================================== */
'use strict';
const PerfHud = {
  ft: new Float32Array(240), fi: 0, fn: 0, t: 0, el: null,
  tick(dt) { const now = performance.now(); dt = this.last ? (now - this.last) / 1000 : dt; this.last = now; this.ft[this.fi] = dt * 1000; this.fi = (this.fi + 1) % this.ft.length; this.fn = Math.min(this.fn + 1, this.ft.length); this.t += dt; if (this.t > .25) { this.t = 0; this.draw(); } if (this.bench) this.benchTick(dt); },
  stats() {
    const n = this.fn; if (!n) return { avg: 0, p95: 0, max: 0, fps: 0 }; const a = Array.from(this.ft.subarray(0, n)).sort((x, y) => x - y);
    const avg = a.reduce((s, v) => s + v, 0) / n; return { avg, p95: a[Math.min(n - 1, Math.floor(n * .95))], max: a[n - 1], fps: 1000 / avg };
  },
  on() { return settings.perfHud || QS.get('perf') === '1' || !!this.bench; },
  draw() {
    let el = this.el; if (!this.on()) { if (el) el.style.display = 'none'; return; }
    if (!el) { el = this.el = document.createElement('div'); el.id = 'perfhud'; document.body.appendChild(el); }
    el.style.display = 'block'; const R = G.R; if (!R) return; const s = this.stats(), I = R.perfInfo(), mb = b => (b / 1048576).toFixed(0) + ' MB';
    const gpu = I.gpu ? Object.entries(I.gpu).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · ') + ' ms' : 'indisponível neste navegador';
    el.innerHTML = `<b>${s.fps.toFixed(0)} FPS</b> · quadro ${s.avg.toFixed(1)} ms (p95 ${s.p95.toFixed(1)}, pior ${s.max.toFixed(1)})<br>CPU render ${R.perf.cpu.toFixed(2)} ms · GPU: ${gpu}<br>`
      + `${I.draws} chamadas · ${(I.tris / 1000).toFixed(0)} mil triângulos · ${I.w}×${I.h} · ${esc(QUALITY[effQuality()].name)} (${I.path})<br>VRAM estimada ${mb(I.vram)}${I.heap ? ' · heap JS ' + mb(I.heap) : ''}`
      + (this.res ? `<hr>${this.res}` : '');
  },
  /* ---------- benchmark ---------- */
  startBench() {
    if (this.bench || G.scene !== 'play') return; const keep = { quality: settings.quality, perfMode: settings.perfMode, fpsCap: settings.fpsCap, outline: settings.outline, ao: settings.ao };
    settings.perfMode = false; settings.fpsCap = 0;
    this.bench = { keep, list: [['alto', 'auto', 'auto', 'Alto'], ['alto', 'off', 'auto', 'Alto sem contorno'], ['alto', 'auto', 'off', 'Alto sem AO'], ['medio', 'auto', 'auto', 'Médio'], ['baixo', 'auto', 'auto', 'Baixo'], ['muito_baixo', 'auto', 'auto', 'Muito baixo']], i: -1, t: 0, out: [], warm: 2, dur: +(QS.get('bdur') || 8) };
    this.nextPreset();
  },
  nextPreset() {
    const B = this.bench; B.i++; if (B.i >= B.list.length) return this.endBench();
    const L = B.list[B.i]; settings.quality = L[0]; settings.outline = L[1]; settings.ao = L[2]; B.name = L[3]; applySettings('quality'); B.t = 0; B.n = 0; B.sum = 0; B.arr = []; B.gpu = {}; B.gn = 0; B.dr = 0; B.tr = 0;
  },
  benchTick(dt) {
    const B = this.bench; B.t += dt; G.view.yaw += dt * .35; G.syncView = true;
    if (B.t < B.warm) return;
    B.n++; B.sum += dt; B.arr.push(dt * 1000); const I = G.R.perfInfo(); B.dr += I.draws; B.tr += I.tris;
    if (I.gpu) { for (const k in I.gpu) B.gpu[k] = (B.gpu[k] || 0) + I.gpu[k]; B.gn++; }
    if (B.t >= B.warm + B.dur) {
      const a = B.arr.sort((x, y) => x - y), avg = B.sum / B.n * 1000;
      B.out.push({ q: B.name, fps: 1000 / avg, avg, p95: a[Math.floor(a.length * .95)], draws: B.dr / B.n, tris: B.tr / B.n, gpu: B.gn ? Object.fromEntries(Object.entries(B.gpu).map(([k, v]) => [k, v / B.gn])) : null, res: I.w + '×' + I.h, path: I.path, vram: I.vram });
      this.nextPreset();
    }
  },
  endBench() {
    const B = this.bench; Object.assign(settings, B.keep); applySettings('quality'); this.bench = null;
    const rows = B.out.map(r => `<tr><td>${r.q}</td><td>${r.fps.toFixed(0)}</td><td>${r.avg.toFixed(1)}</td><td>${r.p95.toFixed(1)}</td><td>${r.gpu ? Object.values(r.gpu).reduce((s, v) => s + v, 0).toFixed(2) : '—'}</td><td>${r.draws.toFixed(0)}</td><td>${(r.tris / 1000).toFixed(0)}k</td><td>${r.res}</td><td>${(r.vram / 1048576).toFixed(0)} MB</td></tr>`).join('');
    this.res = `<b>Benchmark</b><table><tr><th>Preset</th><th>FPS</th><th>ms</th><th>p95</th><th>GPU ms</th><th>chamadas</th><th>tri</th><th>res.</th><th>VRAM</th></tr>${rows}</table>`;
    window.__bench = B.out; console.log('BENCH ' + JSON.stringify(B.out)); this.draw();
  }
};
