/* =====================================================================
   13_post.js — RENDER V2 (Fase A): pós-processamento cartoon sobre o
   renderizador WebGL2 próprio, sem trocar o pipeline existente.

   Cena → FBO (cor HDR RGBA16F + normal/profundidade RGBA16F + depth)
        → [Alto] oclusão ambiente em meia resolução (SAO simplificado)
        → composição: contorno cartoon (profundidade + normais),
          oclusão, tonemap ACES, saturação e gradação de cor
        → FXAA → tela
   Baixo / Muito baixo: desenha direto na tela como antes (toon + gradação
   no próprio shader, custo extra ~zero).
   Se o navegador não puder renderizar em float, cai sozinho para o
   caminho direto (nada quebra).
   Também mede tempo de GPU por passe (EXT_disjoint_timer_query_webgl2)
   quando o navegador oferece, para o medidor de desempenho.
   ===================================================================== */
'use strict';
const VS_FULL = `#version 300 es
out vec2 vUv; void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const POST_HEAD = `#version 300 es
precision highp float; precision highp sampler2D;
float sstep(float a, float b, float x){ float t = clamp((x-a)/(b-a), 0.0, 1.0); return t*t*(3.0-2.0*t); }
in vec2 vUv; out vec4 oCol;
`;
/* oclusão ambiente: hemisfério no espaço da câmera a partir da profundidade linear e da normal (8 amostras em espiral + ruído) */
const FS_AO = POST_HEAD + `
uniform sampler2D uN; uniform vec2 uTan; uniform float uR, uK; uniform vec2 uRes;
vec3 vpos(vec2 uv, float z){ return vec3((uv * 2.0 - 1.0) * uTan * z, -z); }
vec3 nrm(vec4 n){ return vec3(n.xy, sqrt(max(0.0, 1.0 - dot(n.xy, n.xy)))); }
void main(){
  vec4 n0 = texture(uN, vUv); float z = n0.w;
  if (n0.z < 0.85 || z > 90.0 || z < 0.3) { oCol = vec4(1.0); return; }
  vec3 P = vpos(vUv, z), N = nrm(n0);
  float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float rUv = uR / (2.0 * z * uTan.y), asp = uTan.y / uTan.x, sum = 0.0;
  for (int i = 0; i < 8; i++) {
    float t = (float(i) + 0.5) / 8.0, a = (float(i) * 2.399 + noise * 6.283);
    vec2 uv = vUv + vec2(cos(a) * asp, sin(a)) * rUv * t; vec4 ns = texture(uN, uv); if (ns.z < 0.01) continue;
    vec3 v = vpos(uv, ns.w) - P; float d2 = dot(v, v);
    sum += max(0.0, dot(v, N) - 0.015 * z) / (d2 + 0.02) * (1.0 - sstep(uR * uR * 0.6, uR * uR * 2.2, d2));
  }
  float ao = clamp(1.0 - uK * sum * uR / 8.0, 0.0, 1.0);
  oCol = vec4(mix(ao, 1.0, sstep(45.0, 90.0, z)));
}`;
/* composição: contorno + oclusão + tonemap + gradação */
const FS_COMP = POST_HEAD + `
uniform sampler2D uC, uN, uAO; uniform vec2 uPx, uAoPx; uniform float uOut, uOutW, uAoOn, uAoK, uHdr, uExp, uSat, uGrade, uOutK, uBloom, uVig;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
vec3 grade(vec3 c, float k){
  float l = dot(c, vec3(.299,.587,.114));
  c += vec3(-0.012, 0.0, 0.035) * (1.0 - sstep(0.0, 0.5, l)) * k;
  c += vec3(0.018, 0.008, -0.016) * sstep(0.5, 1.0, l) * k;
  c = mix(c, c*c*(3.0-2.0*c), 0.16*k);
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  c = mix(vec3(l), c, 1.0 + 0.14*k*(1.0 - (mx - mn)));
  return clamp(c, 0.0, 1.0);
}
vec3 nrm(vec4 n){ return vec3(n.xy, sqrt(max(0.0, 1.0 - dot(n.xy, n.xy)))); }
void main(){
  vec3 c = texture(uC, vUv).rgb; vec4 n0 = texture(uN, vUv); float z0 = n0.w, f0 = n0.z;
  /* oclusão ambiente (borrão 5 amostras que respeita a profundidade) */
  if (uAoOn > 0.5 && f0 > 0.85) {
    float s = texture(uAO, vUv).r, w = 1.0;
    for (int i = 0; i < 4; i++) { vec2 o = vec2(i < 2 ? (i == 0 ? -1.0 : 1.0) : 0.0, i >= 2 ? (i == 2 ? -1.0 : 1.0) : 0.0) * uAoPx * 1.5; float zz = texture(uN, vUv + o).w, ww = 1.0 - sstep(0.02, 0.08, abs(zz - z0) / max(z0, 0.1)); s += texture(uAO, vUv + o).r * ww; w += ww; }
    c *= mix(1.0, s / w, uAoK);
  }
  /* contorno cartoon: só na borda do objeto MAIS PRÓXIMO (profundidade) e em quinas vivas (normais) */
  if (uOut > 0.5 && f0 > 0.01) {
    float e = 0.0; vec3 a = nrm(n0); bool vm = f0 > 0.7 && f0 < 0.8, ter = f0 > 0.85 && f0 < 0.95;
    for (int i = 0; i < 8; i++) {
      /* 8 vizinhos (cruz + diagonais) → traço contínuo, sem pontilhado nas bordas inclinadas */
      vec2 dd = i < 4 ? vec2(i == 0 ? -1.0 : i == 1 ? 1.0 : 0.0, i == 2 ? -1.0 : i == 3 ? 1.0 : 0.0) : vec2(i == 4 || i == 6 ? -0.72 : 0.72, i < 6 ? -0.72 : 0.72);
      vec2 o = dd * uPx * uOutW;
      vec4 n = texture(uN, vUv + o); float dz = (n.w - z0) / max(z0, 0.05);
      bool nter = n.z > 0.85 && n.z < 0.95;
      float th = vm ? 0.18 : (ter && nter ? 0.3 : 0.045 + z0 * 0.0006);
      float de = sstep(th, th * 1.8, dz);
      float ne = 0.0;
      if (!ter && f0 > 0.7 && n.z > 0.7 && !nter && abs(n.w - z0) / max(z0, 0.05) < 0.04) ne = sstep(0.55, 0.3, dot(a, nrm(n)));
      e = max(e, max(de, ne * 0.75));
    }
    float k = (f0 < 0.6 ? 0.3 : ter ? 0.6 : 1.0) * (vm ? 1.0 : 1.0 - sstep(60.0, 170.0, z0));
    c = mix(c, c * 0.16, clamp(e * k * uOutK, 0.0, 1.0));
  }
  /* bloom: brilho suave em volta das partes muito claras (sol, reflexos, fogos, clarões) */
  if (uBloom > 0.0) { vec3 b = vec3(0.0); float ws = 0.0;
    for (int i = 0; i < 12; i++) { float a = float(i) * 0.5236 + 0.26; for (int r = 1; r <= 2; r++) { float rr = float(r) * 7.0; vec3 s = texture(uC, vUv + vec2(cos(a), sin(a)) * uPx * rr * (1.0 + float(i & 1) * 0.6)).rgb; float l = dot(s, vec3(.299, .587, .114)); b += s * max(l - 2.2, 0.0) / max(l, 0.001); ws += 1.0; } }
    c += b / ws * uBloom * 2.4; }
  if (uHdr > 0.5) { c = aces(c); c = pow(c, vec3(1.0/2.2)); float l = dot(c, vec3(.299,.587,.114)); c = mix(vec3(l), c, uSat); c = grade(c, uGrade); }
  if (uVig > 0.0) { vec2 q = vUv - 0.5; c *= 1.0 - uVig * dot(q, q) * 1.15; }   /* vinheta sutil */
  oCol = vec4(c, dot(c, vec3(0.299, 0.587, 0.114)));
}`;
/* FXAA (variante compacta do FXAA 3.x: redução de borda por luma, 2 amostras ao longo da direção) */
const FS_FXAA = POST_HEAD + `
uniform sampler2D uL; uniform vec2 uPx;
void main(){
  vec3 rgbM = texture(uL, vUv).rgb;
  float lNW = texture(uL, vUv + vec2(-1.0, -1.0) * uPx).a, lNE = texture(uL, vUv + vec2(1.0, -1.0) * uPx).a;
  float lSW = texture(uL, vUv + vec2(-1.0, 1.0) * uPx).a, lSE = texture(uL, vUv + vec2(1.0, 1.0) * uPx).a, lM = dot(rgbM, vec3(0.299, 0.587, 0.114));
  float mn = min(lM, min(min(lNW, lNE), min(lSW, lSE))), mx = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  if (mx - mn < max(0.0312, mx * 0.125)) { oCol = vec4(rgbM, 1.0); return; }
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
  float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0), rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir * rcp, -8.0, 8.0) * uPx;
  vec3 A = 0.5 * (texture(uL, vUv + dir * (1.0/3.0 - 0.5)).rgb + texture(uL, vUv + dir * (2.0/3.0 - 0.5)).rgb);
  vec3 B = A * 0.5 + 0.25 * (texture(uL, vUv - dir * 0.5).rgb + texture(uL, vUv + dir * 0.5).rgb);
  float lB = dot(B, vec3(0.299, 0.587, 0.114));
  oCol = vec4((lB < mn || lB > mx) ? A : B, 1.0);
}`;

/* ---------- cronômetro de GPU por passe (quando o navegador permite) ---------- */
class GpuTimer {
  constructor(g) { this.g = g; this.ext = g.getExtension('EXT_disjoint_timer_query_webgl2'); this.pend = []; this.cur = null; this.ms = {}; this.acc = {}; this.n = 0; }
  /* sem a extensão: modo de diagnóstico (window.__syncT) mede com gl.finish() — só para testes, trava o pipeline */
  begin(name) { if (this.cur) return; if (!this.ext) { if (window.__syncT) { this.g.finish(); this.cur = { name, t0: performance.now() }; } return; } const q = this.g.createQuery(); this.g.beginQuery(this.ext.TIME_ELAPSED_EXT, q); this.cur = { q, name }; }
  end() { if (!this.cur) return; if (!this.ext) { this.g.finish(); const ms = performance.now() - this.cur.t0; (this.sync || (this.sync = {}))[this.cur.name] = ms; this.cur = null; return; } this.g.endQuery(this.ext.TIME_ELAPSED_EXT); this.pend.push(this.cur); this.cur = null; }
  poll() {
    if (!this.ext) return; const g = this.g, dis = g.getParameter(this.ext.GPU_DISJOINT_EXT);
    while (this.pend.length) {
      const p = this.pend[0]; if (!g.getQueryParameter(p.q, g.QUERY_RESULT_AVAILABLE)) break; this.pend.shift();
      if (!dis) { const ms = g.getQueryParameter(p.q, g.QUERY_RESULT) / 1e6; this.acc[p.name] = (this.acc[p.name] || 0) * .9 + ms * .1; }
      g.deleteQuery(p.q);
    }
    if (this.pend.length > 60) { for (const p of this.pend) g.deleteQuery(p.q); this.pend.length = 0; }
  }
}

/* ---------- configuração efetiva do pós (preset + opções do jogador) ---------- */
function postCfg(q, st) {
  const pick = (v, auto) => (v === 'on' ? true : v === 'off' ? false : auto);
  const post = (q.post | 0) > 0;
  return { post, outline: post && pick(st.outline, !!q.outline), ao: post && pick(st.ao, !!q.ao), fxaa: post, toon: st.toon !== false };
}

Object.assign(Renderer.prototype, /** @type {ThisType<Renderer> & Record<string, any>} */ ({
  _initPost() {
    const g = this.gl;
    this.floatOk = !!g.getExtension('EXT_color_buffer_float');
    try {
      this.prog.ao = compileProg(g, 'ao', VS_FULL.replace('#version 300 es\n', ''), FS_AO.replace('#version 300 es\n', ''), '');
      this.prog.comp = compileProg(g, 'comp', VS_FULL.replace('#version 300 es\n', ''), FS_COMP.replace('#version 300 es\n', ''), '');
      this.prog.fxaa = compileProg(g, 'fxaa', VS_FULL.replace('#version 300 es\n', ''), FS_FXAA.replace('#version 300 es\n', ''), '');
      this.postOk = this.floatOk;
    } catch (e) { console.warn('pós-processamento indisponível', e); this.postOk = false; }
    this.timer = new GpuTimer(g); this.pf = { w: 0, h: 0 }; this.perf = { cpu: 0, frames: 0 };
  },
  _tex(fmt, w, h, filt) {
    const g = this.gl, t = g.createTexture(); g.bindTexture(g.TEXTURE_2D, t); g.texStorage2D(g.TEXTURE_2D, 1, fmt, w, h);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, filt); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, filt);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE); return t;
  },
  _freePost() {
    const g = this.gl, F = this.pf; if (!F.fb) return;
    for (const t of [F.col, F.nrm, F.ldr, F.ao]) if (t) g.deleteTexture(t); if (F.dep) g.deleteRenderbuffer(F.dep);
    for (const f of [F.fb, F.fbL, F.fbA]) if (f) g.deleteFramebuffer(f); this.pf = { w: 0, h: 0 };
  },
  /* cria/recria os alvos quando o tamanho ou o preset muda */
  _ensurePost(W, H, C) {
    const key = W + 'x' + H + (C.outline || C.ao ? 'N' : '') + (C.ao ? 'A' : ''); if (this.pf.key === key) return this.pf.ok;
    this._freePost(); const g = this.gl, F = this.pf = /** @type {any} */ ({ w: W, h: H, key, needN: C.outline || C.ao });
    F.col = this._tex(g.RGBA16F, W, H, g.NEAREST);
    if (F.needN) F.nrm = this._tex(g.RGBA16F, W, H, g.NEAREST);
    F.dep = g.createRenderbuffer(); g.bindRenderbuffer(g.RENDERBUFFER, F.dep); g.renderbufferStorage(g.RENDERBUFFER, g.DEPTH_COMPONENT24, W, H);
    F.fb = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, F.fb);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, F.col, 0); if (F.nrm) g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT1, g.TEXTURE_2D, F.nrm, 0);
    g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, F.dep);
    F.ok = g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE;
    F.ldr = this._tex(g.RGBA8, W, H, g.LINEAR); F.fbL = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, F.fbL); g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, F.ldr, 0);
    if (C.ao) { F.aw = Math.max(1, W >> 1); F.ah = Math.max(1, H >> 1); F.ao = this._tex(g.R8, F.aw, F.ah, g.LINEAR); F.fbA = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, F.fbA); g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, F.ao, 0); }
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    /* memória de vídeo dos alvos (aprox.) */
    F.bytes = W * H * (8 + (F.nrm ? 8 : 0) + 4 + 4) + (F.ao ? F.aw * F.ah : 0);
    if (!F.ok) { console.warn('FBO do pós incompleto — voltando ao caminho direto'); this.postOk = false; }
    return F.ok;
  },
  /* chamado no começo do quadro principal: decide o caminho e liga o FBO */
  _beginScene(W, H) {
    const C = this.pc = postCfg(this.q, this.st); this.postActive = !!(C.post && this.postOk && this._ensurePost(W, H, C));
    const g = this.gl;
    if (this.postActive) {
      g.bindFramebuffer(g.FRAMEBUFFER, this.pf.fb); g.drawBuffers(this.pf.nrm ? [g.COLOR_ATTACHMENT0, g.COLOR_ATTACHMENT1] : [g.COLOR_ATTACHMENT0]);
      if (this.pf.nrm) g.clearBufferfv(g.COLOR, 1, [0, 0, 0, 1e4]);
    } else g.bindFramebuffer(g.FRAMEBUFFER, null);
  },
  _mrt(on) { if (!this.postActive || !this.pf.nrm) return; const g = this.gl; g.drawBuffers(on ? [g.COLOR_ATTACHMENT0, g.COLOR_ATTACHMENT1] : [g.COLOR_ATTACHMENT0, g.NONE]); },
  /* uniforms do Render v2 comuns a todos os programas da cena */
  _v2Uniforms(p, vm) {
    const e = this.env, C = this.pc || postCfg(this.q, this.st), V = this.V;
    const R = vm ? [1, 0, 0] : [V[0], V[4], V[8]], U = vm ? [0, 1, 0] : [V[1], V[5], V[9]], F = vm ? [0, 0, -1] : [-V[2], -V[6], -V[10]];
    p.set({ uHdr: this.postActive ? 1 : 0, uToon: C.toon ? 1 : 0, uRim: vm ? .25 : .45, uGrade: 1, uVmFlag: vm ? 1 : 0, uShSpread: this.q.shSpread || 1,
      uShTint: e.shTint || [.8, .92, 1.3], uLiTint: e.liTint || [1.04, 1.0, .93], uVR: R, uVU: U, uFwd: F });
  },
  /* passes de pós: AO → composição → FXAA */
  _post(W, H, fov) {
    const g = this.gl, F = this.pf, C = this.pc, e = this.env; this.timer.begin('pós');
    g.disable(g.DEPTH_TEST); g.disable(g.BLEND); g.disable(g.CULL_FACE); g.depthMask(false); g.bindVertexArray(this.emptyVao);
    const tanY = Math.tan(fov * DEG / 2), tanX = tanY * W / H;
    if (C.ao && F.ao) {
      g.bindFramebuffer(g.FRAMEBUFFER, F.fbA); g.viewport(0, 0, F.aw, F.ah); const p = this.prog.ao; g.useProgram(p.p);
      g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, F.nrm); g.uniform1i(p.loc('uN'), 0); p.set({ uTan: [tanX, tanY], uR: 1.0, uK: 1.7, uRes: [F.aw, F.ah] }); g.drawArrays(g.TRIANGLES, 0, 3);
    }
    g.bindFramebuffer(g.FRAMEBUFFER, F.fbL); g.viewport(0, 0, W, H);
    { const p = this.prog.comp; g.useProgram(p.p);
      g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, F.col); g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, F.nrm || F.col); g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, F.ao || F.col);
      g.uniform1i(p.loc('uC'), 0); g.uniform1i(p.loc('uN'), 1); g.uniform1i(p.loc('uAO'), 2);
      p.set({ uPx: [1 / W, 1 / H], uAoPx: [2 / W, 2 / H], uOut: C.outline && F.nrm ? 1 : 0, uOutW: Math.max(1.5, H / 520), uOutK: .9, uAoOn: C.ao && F.ao ? 1 : 0, uAoK: .85, uHdr: 1, uExp: e.exp, uSat: e.sat || 1.1, uGrade: 1, uBloom: settings.bloom === false ? 0 : (C.post >= 2 ? .9 : .5), uVig: settings.vignette === false ? 0 : .55 });
      g.drawArrays(g.TRIANGLES, 0, 3); }
    g.bindFramebuffer(g.FRAMEBUFFER, null); g.viewport(0, 0, W, H);
    { const p = this.prog.fxaa; g.useProgram(p.p); g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, F.ldr); g.uniform1i(p.loc('uL'), 0); p.set({ uPx: [1 / W, 1 / H] }); g.drawArrays(g.TRIANGLES, 0, 3); }
    g.activeTexture(g.TEXTURE0); g.depthMask(true); g.enable(g.DEPTH_TEST); g.enable(g.CULL_FACE); this.timer.end();
  },
  /* resumo para o medidor de desempenho */
  perfInfo() {
    const t = this.timer, C = this.pc || {}, mem = (this.pf && this.pf.bytes && this.postActive ? this.pf.bytes : 0) + (this.shOn ? this.shSize * this.shSize * 4 : 0) + 256 * 256 * 4 * 37 * 1.34;
    return { gpu: t.ext ? t.acc : null, draws: this.stats.draws, tris: this.stats.tris, w: this.w, h: this.h, vram: mem, path: this.postActive ? ('pós' + (C.outline ? '+contorno' : '') + (C.ao ? '+AO' : '') + '+FXAA') : 'direto', heap: (performance.memory && performance.memory.usedJSHeapSize) || 0 };
  }
}));
