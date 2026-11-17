/* =====================================================================
   12_render.js — renderer WebGL2: shaders, sombra, céu, água, partículas
   ===================================================================== */
'use strict';
/* ---------- ambientes ---------- */
const ENVS = {
  dia: {
    zen: [.1, .36, .95], hor: [.58, .82, 1.0], sunDir: norm3([-.42, .74, -.52]), sunCol: [3.05, 2.85, 2.45], ambS: [.56, .68, .92], ambG: [.34, .3, .18],
    fogC: [.64, .82, 1.0], fogD: .0046, exp: .96, cloudLo: .44, cloudHi: .7, cloudLight: [1.35, 1.33, 1.3], cloudDark: [.7, .78, .95], sat: 1.1
  },
  entardecer: {
    zen: [.1, .15, .46], hor: [1.1, .5, .22], sunDir: norm3([.55, .13, -.82]), sunCol: [4.4, 2.1, .85], ambS: [.34, .3, .56], ambG: [.34, .19, .1],
    fogC: [.92, .5, .3], fogD: .0065, exp: .95, cloudLo: .46, cloudHi: .72, cloudLight: [1.6, .8, .45], cloudDark: [.32, .24, .42], sat: 1.15
  },
  tarde: {
    zen: [.2, .36, .8], hor: [.95, .78, .6], sunDir: norm3([.5, .42, -.6]), sunCol: [3.4, 2.5, 1.6], ambS: [.42, .5, .76], ambG: [.32, .22, .13],
    fogC: [.88, .74, .62], fogD: .005, exp: .92, cloudLo: .5, cloudHi: .78, cloudLight: [1.3, 1.05, .85], cloudDark: [.55, .55, .72], sat: 1.14
  }
};
/* clima: variações leves e baratas (sem pós-processamento) */
const WEATHER = [
  { id: 'sol', name: 'Dia ensolarado', rain: 0 },
  { id: 'nublado', name: 'Céu nublado', rain: 0, mod: { sunCol: .55, ambS: 1.12, cloudLo: .3, cloudHi: .62, fogD: 1.15, sat: .92, hor: [.72, .78, .84], zen: [.36, .44, .58] } },
  { id: 'chuva', name: 'Chuva leve', rain: .5, mod: { sunCol: .45, ambS: 1.1, cloudLo: .22, cloudHi: .56, fogD: 1.35, sat: .88, hor: [.62, .68, .74], zen: [.3, .36, .46] } },
  { id: 'tempestade', name: 'Tempestade', rain: 1, storm: 1, mod: { sunCol: .3, ambS: .95, cloudLo: .12, cloudHi: .48, fogD: 1.7, sat: .8, hor: [.42, .46, .54], zen: [.18, .22, .3] } },
  { id: 'neblina', name: 'Neblina', rain: 0, mod: { sunCol: .6, ambS: 1.15, fogD: 3.2, sat: .9, hor: [.8, .82, .84], fogC: [.8, .82, .84] } }
];
function weatherEnv(base, w) {
  const e = Object.assign({}, ENVS[base] || ENVS.dia), M = (WEATHER[w] || WEATHER[0]).mod; if (!M) return e;
  if (M.sunCol) e.sunCol = e.sunCol.map(v => v * M.sunCol); if (M.ambS) e.ambS = e.ambS.map(v => v * M.ambS); if (M.fogD) e.fogD *= M.fogD; if (M.sat) e.sat = M.sat;
  for (const k of ['hor', 'zen', 'fogC']) if (M[k]) e[k] = M[k]; if (M.hor && !M.fogC) e.fogC = M.hor; if (M.cloudLo) { e.cloudLo = M.cloudLo; e.cloudHi = M.cloudHi; e.cloudLight = e.cloudLight.map(v => v * .8); e.cloudDark = e.cloudDark.map(v => v * .7); }
  return e;
}
function norm3(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

/* ---------- GLSL ---------- */
const GL_HEAD = `precision highp float; precision highp int; precision highp sampler2DArray; precision highp sampler2DShadow; precision highp sampler2D;\nfloat sstep(float a, float b, float x){ float t = clamp((x-a)/(b-a), 0.0, 1.0); return t*t*(3.0-2.0*t); }\n`;
const VS_MAIN = GL_HEAD + `
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec2 aUv; layout(location=3) in vec4 aCol; layout(location=4) in vec4 aMat;
#ifdef INST
layout(location=5) in vec4 iA; layout(location=6) in vec4 iB;
#endif
uniform mat4 uVP; uniform float uTime; uniform float uWind;
out vec3 vW; out vec3 vN; out vec2 vUv; out vec4 vCol; flat out vec4 vMat;
void main(){
  vec3 p = aPos, n = aNor;
  #ifdef INST
  float cs = cos(iA.w), sn = sin(iA.w);
  p *= iB.x; p = vec3(cs*p.x + sn*p.z, p.y, -sn*p.x + cs*p.z); n = vec3(cs*n.x + sn*n.z, n.y, -sn*n.x + cs*n.z); p += iA.xyz;
  #endif
  float wd = aMat.z / 255.0;
  if (wd > 0.0) {
    float ph = p.x*0.37 + p.z*0.29;
    vec2 w = vec2(sin(uTime*1.7 + ph), cos(uTime*1.35 + ph*1.3))*0.45 + vec2(sin(uTime*0.6 + p.x*0.06), cos(uTime*0.5 + p.z*0.06))*0.9;
    p.xz += w * wd * uWind;
  }
  vW = p; vN = n; vUv = aUv; vCol = aCol;
  #ifdef INST
  vCol.rgb *= iB.yzw;
  #endif
  vMat = aMat;
  gl_Position = uVP * vec4(p, 1.0);
}`;
const FS_COMMON = GL_HEAD + `
uniform sampler2DArray uTex; uniform sampler2DShadow uShadow; uniform sampler2D uCloud;
uniform mat4 uSh; uniform vec3 uCam; uniform vec3 uSunDir, uSunCol, uAmbS, uAmbG, uFogC, uZen, uHor;
uniform float uFogD, uFogS, uExp, uShOn, uShBias, uShTexel, uSat, uTime, uBump;
uniform vec3 uCloudLight, uCloudDark; uniform vec2 uCloudRange;
/* Render v2: saída HDR (tonemap no pós), toon, tons de sombra/luz, rim, gradação de cor e vetores da câmera para o buffer de normais */
uniform float uHdr, uToon, uRim, uGrade, uVmFlag, uShSpread; uniform vec3 uShTint, uLiTint, uVR, uVU, uFwd;
vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
vec3 grade(vec3 c, float k){
  /* gradação cartoon: sombras levemente frias, luzes quentes, curva S suave e vibrância (sem neon) */
  float l = dot(c, vec3(.299,.587,.114));
  c += vec3(-0.012, 0.0, 0.035) * (1.0 - sstep(0.0, 0.5, l)) * k;
  c += vec3(0.018, 0.008, -0.016) * sstep(0.5, 1.0, l) * k;
  c = mix(c, c*c*(3.0-2.0*c), 0.16*k);
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  c = mix(vec3(l), c, 1.0 + 0.14*k*(1.0 - (mx - mn)));
  return clamp(c, 0.0, 1.0);
}
vec3 finish(vec3 c){ if (uHdr > 0.5) return c * uExp; c = aces(c * uExp); c = pow(c, vec3(1.0/2.2)); float l = dot(c, vec3(.299,.587,.114)); c = mix(vec3(l), c, uSat); return grade(c, uGrade); }
vec3 skyBase(vec3 d){
  float h = max(d.y, 0.0); vec3 c = mix(uHor, uZen, pow(h, 0.5));
  c = mix(c, uHor*1.08, exp(-h*7.0)*0.4);
  float sd = max(dot(d, uSunDir), 0.0);
  c += uSunCol * (pow(sd, 900.0) * 6.0 + pow(sd, 30.0) * 0.2 + pow(sd, 5.0) * 0.07);
  return c;
}
vec3 skyFull(vec3 d){
  vec3 c = skyBase(d);
  if (d.y > 0.0) {
    vec2 cp = d.xz / (d.y + 0.14); float t = uTime * 0.0035;
    /* nuvens cartoon volumosas: borda definida, topo iluminado pelo sol e base sombreada (amostra deslocada para o sol) */
    vec2 o1 = cp*0.22 + vec2(t, t*0.4), o2 = cp*0.7 + vec2(-t*.6, t*.8), sd2 = normalize(uSunDir.xz + vec2(1e-4)) * 0.045;
    float n = texture(uCloud, o1).r*0.62 + texture(uCloud, o2).r*0.38;
    float ns = texture(uCloud, o1 + sd2).r*0.62 + texture(uCloud, o2 + sd2*3.2).r*0.38;
    float cov = sstep(uCloudRange.x, uCloudRange.x + (uCloudRange.y - uCloudRange.x) * 0.55, n) * sstep(0.0, 0.16, d.y);
    float shade = clamp(0.55 + (n - ns) * 5.0, 0.0, 1.0);
    float core = sstep(uCloudRange.x, uCloudRange.y + .1, n);
    vec3 cc = mix(uCloudDark, uCloudLight, clamp(shade * 0.85 + (1.0 - core) * 0.35, 0.0, 1.0)) * (0.85 + 0.35*pow(max(dot(d, uSunDir),0.0), 3.0));
    c = mix(c, cc, cov * 0.96);
  } else { c = mix(uHor, uFogC*0.9, sstep(0.0, -0.12, d.y)); }
  return c;
}
vec3 fogCol(vec3 dir){ float sd = max(dot(dir, uSunDir), 0.0); return uFogC + uSunCol * pow(sd, 6.0) * 0.05; }
float shadowAt(vec3 wp, vec3 n){
  vec4 l = uSh * vec4(wp + n*0.07, 1.0); vec3 pc = l.xyz / l.w * 0.5 + 0.5;
  if (pc.x < 0.0 || pc.x > 1.0 || pc.y < 0.0 || pc.y > 1.0 || pc.z > 1.0) return 1.0;
  float s = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) s += texture(uShadow, vec3(pc.xy + vec2(float(i), float(j)) * uShTexel * max(uShSpread, 1.0), pc.z - uShBias));
  s /= 9.0; vec2 e = abs(pc.xy * 2.0 - 1.0); float f = sstep(0.82, 1.0, max(e.x, e.y)); return mix(s, 1.0, f);
}
`;
const FS_MAIN = FS_COMMON + `
in vec3 vW; in vec3 vN; in vec2 vUv; in vec4 vCol; flat in vec4 vMat;
layout(location=0) out vec4 oCol; layout(location=1) out vec4 oNrm;
void main(){
  int layer = int(vMat.x + 0.5); float spec = vMat.y / 255.0; float wnd = vMat.z / 255.0; int wf = int(vMat.w + 0.5); bool cut = wf >= 128; float emis = float(wf & 127) / 127.0;
  vec3 Ng = normalize(vN); if (!gl_FrontFacing) Ng = -Ng;
  vec3 V = uCam - vW; float dist = length(V); V /= dist;
  vec3 N = Ng; vec3 base; float alpha = vCol.a; float tlum = 0.0;
  #ifdef TERRAIN
    vec2 wuv = vW.xz;
    float mac = texture(uTex, vec3(wuv*0.021, 23.0)).r, mac2 = texture(uTex, vec3(wuv*0.0063+.37, 23.0)).r;
    vec4 w = vCol; float ws = w.r + w.g + w.b + w.a + 0.0001; w /= ws;
    float steep = sstep(0.86, 0.66, Ng.y);
    vec3 cg = texture(uTex, vec3(wuv*0.34, 30.0)).rgb * (0.9 + 0.2*texture(uTex, vec3(wuv*0.071, 30.0)).g);
    cg *= mix(vec3(0.78, 0.92, 0.72), vec3(1.08, 1.04, 0.82), sstep(0.3, 0.7, mac2));   /* manchas de grama: verde-azulado x verde-amarelado */
    vec3 cd = texture(uTex, vec3(wuv*0.3, 31.0)).rgb, cs = texture(uTex, vec3(wuv*0.3, 32.0)).rgb, cr = texture(uTex, vec3(wuv*0.28, 34.0)).rgb;
    vec3 ck = texture(uTex, vec3(wuv*0.16, 33.0)).rgb;
    base = cg*w.r + cd*w.g + cs*w.b + cr*w.a;
    base = mix(base, ck, steep);
    if (uToon > 0.5) { vec3 flat3 = textureLod(uTex, vec3(wuv*0.34, 30.0), 6.0).rgb * w.r + textureLod(uTex, vec3(wuv*0.3, 31.0), 6.0).rgb * w.g + textureLod(uTex, vec3(wuv*0.3, 32.0), 6.0).rgb * w.b + textureLod(uTex, vec3(wuv*0.28, 34.0), 6.0).rgb * w.a; base = mix(base, flat3 * mix(0.74, 1.22, mac) * mix(0.92, 1.08, mac2), 0.3 * (1.0 - steep));
      base = mix(vec3(dot(base, vec3(.3, .59, .11))), base, 0.8) * vec3(0.95, 0.94, 1.0); }   /* terreno menos "limão": tira o excesso de saturação e de brilho */
    base *= mix(0.72, 1.12, mac) * mix(0.92, 1.08, mac2);
    tlum = dot(base, vec3(.3,.59,.11)); alpha = 1.0;
  #else
    vec4 t = texture(uTex, vec3(vUv, float(layer)));
    /* cartoon "pintado": achata o ruído fino da textura em direção à cor média local (mip alto), mantendo tábuas/tijolos legíveis */
    if (uToon > 0.5 && !cut) t.rgb = mix(textureLod(uTex, vec3(vUv, float(layer)), 5.0).rgb, t.rgb, 0.62);
    if (cut && t.a < 0.45) discard;
    base = t.rgb * toLin(vCol.rgb); alpha = t.a * vCol.a; tlum = dot(t.rgb, vec3(.3,.59,.11));
  #endif
  #ifndef NOBUMP
  if (!cut && uBump > 0.0) {
    vec3 dpx = dFdx(vW), dpy = dFdy(vW); float dlx = dFdx(tlum), dly = dFdy(tlum);
    vec3 r1 = cross(dpy, N), r2 = cross(N, dpx); float det = dot(dpx, r1);
    vec3 g = sign(det) * (dlx * r1 + dly * r2); float fade = 1.0 - sstep(10.0, 28.0, dist);
    N = normalize(abs(det) * N - uBump * fade * g);
  }
  #endif
  float ndl = max(dot(N, uSunDir), 0.0);
  float sh = 1.0; if (uShOn > 0.5 && dot(Ng, uSunDir) > -0.2) sh = shadowAt(vW, Ng);
  vec3 amb = mix(uAmbG, uAmbS, N.y * 0.5 + 0.5);
  vec3 col; float lit = ndl * sh;
  if (uToon > 0.5) {
    /* toon: terminador definido + 2 faixas de luz; sombra fria (tom do céu) e luz quente; a sombra projetada também vira faixa */
    #ifdef TERRAIN
    const float soft = 0.22;
    #else
    const float soft = 0.07;
    #endif
    float nl = mix(dot(Ng, uSunDir), dot(N, uSunDir), 0.4);
    lit = sstep(-0.02, soft, nl) * (0.74 + 0.26 * sstep(0.4, 0.4 + soft * 1.6, nl)) * sstep(0.22, 0.7, sh);
    col = base * (amb * uShTint * 0.98 + uSunCol * uLiTint * lit * 1.02);
  } else col = base * (amb + uSunCol * lit);
  if (wnd > 0.0 && !cut) col += base * uSunCol * sh * max(dot(-N, uSunDir), 0.0) * 0.18;
  if (cut && wnd > 0.0) col += base * uSunCol * sh * (0.25 + 0.2*max(dot(-Ng, uSunDir), 0.0));
  if (spec > 0.0) {
    vec3 H = normalize(V + uSunDir); float sp = pow(max(dot(N, H), 0.0), 20.0 + spec * 150.0) * spec;
    if (uToon > 0.5) sp = sstep(0.18, 0.3, sp) * spec * 0.55;                 /* brilho cartoon: mancha definida */
    float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    col += uSunCol * sp * sh * ndl * (0.35 + spec);
    col += skyBase(reflect(-V, N)) * (0.04 + 0.4 * spec) * (0.25 + fr) * (0.4 + 0.6*sh);
  }
  #ifndef TERRAIN
  /* rim light discreta (contorno de luz do céu nas bordas), some com a distância */
  if (uToon > 0.5 && !cut) { float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * (1.0 - sstep(25.0, 70.0, dist)); col += base * (uAmbS * 0.9 + uSunCol * lit * 0.25) * rim * uRim; }
  #endif
  col += base * emis * 5.0;
  #ifndef NOFOG
  float fg = 1.0 - exp(-max(dist - uFogS, 0.0) * uFogD);
  col = mix(col, fogCol(-V), clamp(fg, 0.0, 1.0));
  #endif
  oCol = vec4(finish(col), alpha);
  /* buffer de normais/profundidade para contorno e oclusão: xy = normal na câmera, z = tipo, w = profundidade (m) */
  #ifdef TERRAIN
  const float kind = 0.9;
  #else
  float kind = cut ? 0.5 : (uVmFlag > 0.5 ? 0.75 : 1.0);
  #endif
  oNrm = vec4(dot(Ng, uVR), dot(Ng, uVU), kind, max(dot(vW - uCam, uFwd), 0.0));
}`;
const FS_SHADOW = GL_HEAD + `
uniform sampler2DArray uTex; in vec3 vW; in vec3 vN; in vec2 vUv; in vec4 vCol; flat in vec4 vMat; out vec4 oCol;
void main(){ int wf = int(vMat.w + 0.5); if (wf >= 128) { if (texture(uTex, vec3(vUv, vMat.x)).a < 0.45) discard; } oCol = vec4(0.0); }`;

const VS_SKY = GL_HEAD + `
uniform mat4 uInvVP; uniform vec3 uCam; out vec3 vDir;
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vec2 ndc = p * 2.0 - 1.0; vec4 w = uInvVP * vec4(ndc, 1.0, 1.0); vDir = w.xyz / w.w - uCam; gl_Position = vec4(ndc, 1.0, 1.0); }`;
const FS_SKY = FS_COMMON + `in vec3 vDir; layout(location=0) out vec4 oCol; layout(location=1) out vec4 oNrm; void main(){ vec3 d = normalize(vDir); oCol = vec4(finish(skyFull(d)), 1.0); oNrm = vec4(0.0, 0.0, 0.0, 1e4); }`;

const FS_WATER = FS_COMMON + `
in vec3 vW; in vec3 vN; in vec2 vUv; in vec4 vCol; flat in vec4 vMat; out vec4 oCol;
float hgt(vec2 p){ return texture(uTex, vec3(p, 23.0)).r; }
void main(){
  vec3 V = uCam - vW; float dist = length(V); V /= dist;
  vec2 p = vW.xz; float t = uTime;
  vec2 p1 = p*0.11 + vec2(t*0.012, t*0.007), p2 = p*0.27 + vec2(-t*0.017, t*0.011), p3 = p*0.9 + vec2(t*0.03, -t*0.02);
  float e = 0.004; float h0 = hgt(p1)*0.6 + hgt(p2)*0.3 + hgt(p3)*0.1;
  float hx = hgt(p1+vec2(e,0.))*0.6 + hgt(p2+vec2(e,0.))*0.3 + hgt(p3+vec2(e,0.))*0.1, hz = hgt(p1+vec2(0.,e))*0.6 + hgt(p2+vec2(0.,e))*0.3 + hgt(p3+vec2(0.,e))*0.1;
  vec3 N = normalize(vec3(-(hx-h0)/e*0.012, 1.0, -(hz-h0)/e*0.012));
  float shore = vCol.a;
  float fr = 0.03 + 0.97*pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 refl = skyFull(R);
  /* água cartoon: azul vivo, turquesa na margem, reflexo do céu contido e brilho do sol em pontos */
  vec3 deep = vec3(0.012, 0.16, 0.42), shal = vec3(0.06, 0.48, 0.62);
  vec3 wc = mix(shal, deep, sstep(0.0, 0.4, shore)) * (uAmbS*1.0 + uSunCol*0.16);
  float sp = pow(max(dot(R, uSunDir), 0.0), 260.0);
  float glint = sstep(0.72, 0.8, hgt(p*0.6 + vec2(t*0.04, -t*0.03))) * 0.18;
  vec3 col = mix(wc, refl * 0.85, clamp(fr * 0.6 + 0.04, 0.0, 0.7)) + uSunCol * (sp * 1.5 + glint * 0.08);
  float foam = sstep(0.06, 0.0, shore) * (0.45 + 0.55 * hgt(p*0.5 + vec2(t*0.05, 0.0)));
  foam += sstep(0.62, 0.9, hgt(p*0.35 + vec2(t*0.02))) * 0.07;
  col = mix(col, vec3(0.9, 0.95, 0.95) * (uAmbS + uSunCol*0.4), clamp(foam, 0.0, 1.0));
  float fg = 1.0 - exp(-max(dist - uFogS, 0.0) * uFogD);
  col = mix(col, fogCol(-V), clamp(fg, 0.0, 1.0));
  float a = mix(0.55, 0.95, sstep(0.0, 0.3, shore)); a = max(a, clamp(foam, 0.0, 1.0)*0.9);
  oCol = vec4(finish(col), a);
}`;

const VS_PART = GL_HEAD + `
layout(location=0) in vec4 pA; layout(location=1) in vec4 pB; layout(location=2) in vec4 pC;
uniform mat4 uVP; uniform vec3 uRight, uUp; out vec2 vQ; out vec4 vC; out vec2 vT;
void main(){
  vec2 q = vec2((gl_VertexID & 1) == 0 ? -1.0 : 1.0, (gl_VertexID & 2) == 0 ? -1.0 : 1.0);
  float c = cos(pC.x), s = sin(pC.x); vec2 r = vec2(q.x*c - q.y*s, q.x*s + q.y*c);
  vec3 P = pA.xyz + (uRight * r.x + uUp * r.y) * pA.w;
  vQ = q; vC = pB; vT = pC.yz; gl_Position = uVP * vec4(P, 1.0);
}`;
const FS_PART = FS_COMMON + `
in vec2 vQ; in vec4 vC; in vec2 vT; out vec4 oCol; uniform float uAdd;
void main(){
  float d = length(vQ); int ty = int(vT.x + 0.5); float a = 0.0; vec3 c = vC.rgb;
  if (ty == 0) { // fumaça macia
    float n = texture(uTex, vec3(vQ*0.35 + vT.y*3.7, 23.0)).r;
    a = sstep(1.0, 0.25, d + (n-0.5)*0.5) ; a *= a;
  } else if (ty == 1) { a = pow(clamp(1.0 - d, 0.0, 1.0), 2.0); c *= 1.0 + a; }
  else if (ty == 2) { a = sstep(1.0, 0.55, d); }
  else if (ty == 3) { float r = abs(d - 0.82); a = sstep(0.18, 0.0, r) * (1.0 - sstep(0.7, 1.0, d)*0.0); }
  else if (ty == 4) { float n = texture(uTex, vec3(vQ*0.5 + vT.y*5.1, 23.0)).r; a = sstep(1.0, 0.4, d) * (0.5 + 0.6*n); }
  else { a = sstep(1.0, 0.8, d); }
  a *= vC.a; if (a < 0.003) discard;
  vec3 o = c; if (uAdd < 0.5) { o = finish(c); } else { o = c * 1.0; }
  oCol = vec4(o, a);
}`;
const VS_BEAM = GL_HEAD + `
layout(location=0) in vec4 bA; layout(location=1) in vec4 bB; layout(location=2) in vec4 bC;
uniform mat4 uVP; uniform vec3 uCam; out vec2 vQ; out vec4 vC;
void main(){
  float t = (gl_VertexID & 1) == 0 ? 0.0 : 1.0; float side = (gl_VertexID & 2) == 0 ? -1.0 : 1.0;
  vec3 p0 = bA.xyz, p1 = bB.xyz; vec3 mid = mix(p0, p1, 0.5); vec3 dir = p1 - p0; vec3 sd = normalize(cross(dir, uCam - mid) + vec3(1e-5));
  vec3 P = mix(p0, p1, t) + sd * side * bA.w * 0.5;
  vQ = vec2(t, side); vC = vec4(bC.rgb, bB.w); gl_Position = uVP * vec4(P, 1.0);
}`;
const FS_BEAM = GL_HEAD + `
in vec2 vQ; in vec4 vC; out vec4 oCol;
void main(){ float e = 1.0 - vQ.y*vQ.y; float g = pow(vQ.x, 1.6); float a = vC.a * e * (0.15 + 0.85*g); if (a < 0.002) discard; oCol = vec4(vC.rgb * (0.7 + 1.6*g), a); }`;

/* ---------- Renderer ---------- */
class Renderer {
  constructor(canvas, st) {
    this.canvas = canvas; this.st = st || settings;
    const q = QQ();
    const g = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false, desynchronized: false });
    if (!g) throw new Error('WebGL2 indisponível');
    gl = g; this.gl = g; this.q = q; this.tex = null; this.ready = false;
    g.getExtension('EXT_color_buffer_float'); g.getExtension('OES_texture_float_linear');
    this.prog = {};
    const P = (n, vs, fs, d) => this.prog[n] = compileProg(g, n, vs, fs, d);
    P('main', VS_MAIN, FS_MAIN, ''); P('inst', VS_MAIN, FS_MAIN, '#define INST\n'); P('terr', VS_MAIN, FS_MAIN, '#define TERRAIN\n#define NOBUMP\n');
    P('vm', VS_MAIN, FS_MAIN, '#define NOFOG\n'); P('shadow', VS_MAIN, FS_SHADOW, ''); P('shadowI', VS_MAIN, FS_SHADOW, '#define INST\n');
    P('sky', VS_SKY, FS_SKY, ''); P('water', VS_MAIN, FS_WATER, ''); P('part', VS_PART, FS_PART, ''); P('beam', VS_BEAM, FS_BEAM, '');
    this._initPost();
    this.cloud = buildCloudTex(g);
    this.emptyVao = g.createVertexArray();
    /* sombra */
    this.dummyShadow = g.createTexture(); g.bindTexture(g.TEXTURE_2D, this.dummyShadow); g.texStorage2D(g.TEXTURE_2D, 1, g.DEPTH_COMPONENT24, 1, 1);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_COMPARE_MODE, g.COMPARE_REF_TO_TEXTURE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_COMPARE_FUNC, g.LEQUAL);
    this._initShadow();
    this.shR = q.shR || 60; this.shVP = new Float32Array(16); this.shPl = new Float32Array(24);
    /* matrizes */
    this.P = new Float32Array(16); this.V = new Float32Array(16); this.VP = new Float32Array(16); this.IVP = new Float32Array(16); this.pl = new Float32Array(24);
    this.vmP = new Float32Array(16); this.vmV = new Float32Array(16); this.vmVP = new Float32Array(16);
    /* dinâmicos */
    this.dyn = new MB(1 << 14); this.dynMesh = uploadMesh(g, this.dyn, true);
    this.vmMB = new MB(1 << 13); this.vmMesh = uploadMesh(g, this.vmMB, true);
    this.decalMB = new MB(1 << 11); this.decalMesh = uploadMesh(g, this.decalMB, true); this.decalDirty = false;
    this.transMB = new MB(1 << 11); this.transMesh = uploadMesh(g, this.transMB, true);
    this.pbuf = { alpha: this._pbuf(12000), add: this._pbuf(8000) }; this.beamBuf = this._pbuf(1200);
    this.env = ENVS.dia; this.scene = null; this.time = 0; this.w = 1; this.h = 1; this.cam = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, fov: 80 };
    this.stats = { draws: 0, tris: 0 };
    this.resize();
  }
  _pbuf(cap) {
    const g = this.gl, vao = g.createVertexArray(), buf = g.createBuffer(); g.bindVertexArray(vao); g.bindBuffer(g.ARRAY_BUFFER, buf); g.bufferData(g.ARRAY_BUFFER, cap * 48, g.DYNAMIC_DRAW);
    for (let i = 0; i < 3; i++) { g.enableVertexAttribArray(i); g.vertexAttribPointer(i, 4, g.FLOAT, false, 48, i * 16); g.vertexAttribDivisor(i, 1); }
    return { vao, buf, cap, data: new Float32Array(cap * 12), n: 0 };
  }
  async init(onProgress) { this.tex = await buildTexArray(this.gl, onProgress); this.ready = true; }
  resize() {
    const c = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, 2) * (this.st.renderScale || 1) * this.q.scale * (this.autoK || 1);
    const w = Math.max(2, Math.round(c.clientWidth * dpr)), h = Math.max(2, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } this.w = w; this.h = h;
  }
  _initShadow() {
    const g = this.gl, q = this.q; if (this.shTex) { g.deleteTexture(this.shTex); g.deleteFramebuffer(this.shFbo); this.shTex = this.shFbo = null; }
    this.shSize = (this.st.shadowQ === 'auto' || this.st.shadowQ === undefined || this.st.perfMode) ? (q.shadow || 0) : (+this.st.shadowQ || 0); this.shOn = this.shSize > 0; this.shReady = false; if (!this.shOn) return;
    const S = this.shSize; this.shTex = g.createTexture(); g.bindTexture(g.TEXTURE_2D, this.shTex); g.texStorage2D(g.TEXTURE_2D, 1, g.DEPTH_COMPONENT24, S, S);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_COMPARE_MODE, g.COMPARE_REF_TO_TEXTURE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_COMPARE_FUNC, g.LEQUAL);
    this.shFbo = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, this.shFbo); g.framebufferTexture2D(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.TEXTURE_2D, this.shTex, 0);
    g.drawBuffers([g.NONE]); g.readBuffer(g.NONE); g.bindFramebuffer(g.FRAMEBUFFER, null);
  }
  setQuality() { this.q = QQ(); this.shR = this.q.shR || 60; this._initShadow(); this.resize(); }
  setEnv(e) { this.env = typeof e === 'string' ? ENVS[e] : e; }
  /* ----- cena estática ----- */
  buildScene(d) {
    const g = this.gl, S = { terrain: [], chunks: [], trans: [], inst: [], water: [], bounds: d.bounds };
    const up = (list, out) => { for (const o of list || []) { if (!o.mb || o.mb.empty) continue; const m = o.mb.build(g); m.maxDist = o.maxDist; if (o.lodMb && !o.lodMb.empty) m.lod = o.lodMb.build(g); out.push(m); } };
    up(d.terrain, S.terrain); up(d.chunks, S.chunks); up(d.trans, S.trans); up(d.water, S.water);
    for (const o of d.inst || []) { const m = makeInstanced(g, o.mb, o.data, o.count); if (o.lodMb) m.lod = makeInstancedLod(g, o.lodMb, m.ibuf); m.maxDist = o.maxDist || 90; m.mn = o.mn; m.mx = o.mx; m.cast = !!o.cast; m.dist = o.dist; S.inst.push(m); }
    return S;
  }
  freeScene(S) { if (!S) return; for (const k of ['terrain', 'chunks', 'trans', 'inst', 'water']) for (const m of S[k]) freeMesh(this.gl, m); }
  setScene(S) { this.scene = S; }
  addDecal(x, y, z, nx, ny, nz, r, col, alpha, ragged) {
    const L = this.decals || (this.decals = []); L.push({ x, y, z, nx, ny, nz, r, col, alpha, ragged, a0: Math.random() * TAU, j: Array.from({ length: 9 }, () => .6 + Math.random() * .55) });
    if (L.length > 320) L.shift(); this.decalDirty = true; this.decalRebuild = true;
  }
  _rebuildDecals() {
    const mb = this.decalMB.reset(); mb.mat(TX.white, 0, 0, 0, 0);
    for (const d of this.decals || []) {
      const { x, y, z, nx, ny, nz, r, col, alpha } = d; let tx, ty, tz;
      if (Math.abs(ny) < .9) { tx = nz; ty = 0; tz = -nx; } else { tx = 1; ty = 0; tz = 0; }
      const l = Math.hypot(tx, ty, tz) || 1; tx /= l; ty /= l; tz /= l; const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
      const rr = (col >> 16) & 255, gg = (col >> 8) & 255, bb = col & 255, cA = ((((alpha * 255) | 0) << 24) | (bb << 16) | (gg << 8) | rr) >>> 0, cE = ((bb << 16) | (gg << 8) | rr) >>> 0;
      mb._grow(10, 27); const c0 = mb.n, ox = x + nx * .012, oy = y + ny * .012, oz = z + nz * .012; mb.cw = cA; mb._v(ox, oy, oz, nx, ny, nz, 0, 0); mb.cw = cE; const seg = 9;
      for (let i = 0; i < seg; i++) { const a = d.a0 + i / seg * TAU, rad = r * (d.ragged ? d.j[i] : 1), cx = Math.cos(a) * rad, cy = Math.sin(a) * rad; mb._v(ox + tx * cx + bx * cy, oy + ty * cx + by * cy, oz + tz * cx + bz * cy, nx, ny, nz, 0, 0); }
      for (let i = 0; i < seg; i++) mb._t(c0, c0 + 1 + i, c0 + 1 + ((i + 1) % seg));
    }
  }
  clearDecals() { this.decals = []; this.decalMB.reset(); this.decalDirty = true; }
  /* ----- câmera ----- */
  _cam(c, aspect, near, far, P, V, VP) {
    M4.persp(P, c.fov * DEG, aspect, near, far);
    const cp = Math.cos(c.pitch), fx = -Math.sin(c.yaw) * cp, fy = Math.sin(c.pitch), fz = -Math.cos(c.yaw) * cp;
    M4.look(V, c.x, c.y, c.z, c.x + fx, c.y + fy, c.z + fz, 0, 1, 0);
    if (c.roll) { const r = this._rz || (this._rz = new Float32Array(16)), t = this._rt || (this._rt = new Float32Array(16)); M4.ident(r); const cs = Math.cos(c.roll), sn = Math.sin(c.roll); r[0] = cs; r[1] = sn; r[4] = -sn; r[5] = cs; M4.mul(t, r, V); V.set(t); }
    M4.mul(VP, P, V);
  }
  _shadowSetup(c) {
    const e = this.env, R = this.shR, sd = e.sunDir, cp = Math.cos(c.pitch), fx = -Math.sin(c.yaw) * cp, fz = -Math.cos(c.yaw) * cp;
    const tx = c.x + fx * R * .45, tz = c.z + fz * R * .45, ty = Math.max(0, c.y - 1.5), D = 160;
    const V = this._shV || (this._shV = new Float32Array(16)), P = this._shP || (this._shP = new Float32Array(16));
    const up = Math.abs(sd[1]) > .96 ? [1, 0, 0] : [0, 1, 0];
    M4.look(V, tx + sd[0] * D, ty + sd[1] * D, tz + sd[2] * D, tx, ty, tz, up[0], up[1], up[2]);
    const texel = 2 * R / this.shSize, sx = V[12], sy = V[13]; V[12] = Math.round(sx / texel) * texel; V[13] = Math.round(sy / texel) * texel;
    M4.ortho(P, -R, R, -R, R, 1, D * 2); M4.mul(this.shVP, P, V); frustumPlanes(this.shVP, this.shPl);
    this.shBias = 0.1 / (D * 2 - 1);
  }
  _bindCommon(p, vp, vm) {
    const g = this.gl, e = this.env, c = this.cam; let sdir = e.sunDir;
    if (vm) { const V = this.V, d = e.sunDir; sdir = [V[0] * d[0] + V[4] * d[1] + V[8] * d[2], V[1] * d[0] + V[5] * d[1] + V[9] * d[2], V[2] * d[0] + V[6] * d[1] + V[10] * d[2]]; }
    g.useProgram(p.p);
    p.set({ uVP: vp, uCam: [c.x, c.y, c.z], uTime: this.time, uWind: this.windAmp === undefined ? .35 : this.windAmp, uSunDir: sdir, uSunCol: e.sunCol, uAmbS: vm ? e.ambS.map(v => v * 1.15 + .04) : e.ambS, uAmbG: vm ? e.ambG.map(v => v * 1.2 + .05) : e.ambG, uFogC: e.fogC, uZen: e.zen, uHor: e.hor,
      uFogD: this.fogD || e.fogD, uFogS: this.fogS || 0, uExp: e.exp, uSat: e.sat || 1.1, uShOn: (this.shOn && !vm && this.shReady) ? 1 : 0, uShBias: this.shBias || 0, uShTexel: 1 / (this.shSize || 1), uSh: this.shVP, uBump: .02,
      uCloudLight: e.cloudLight, uCloudDark: e.cloudDark, uCloudRange: [e.cloudLo, e.cloudHi] });
    g.uniform1i(p.loc('uTex'), 0); g.uniform1i(p.loc('uShadow'), 1); g.uniform1i(p.loc('uCloud'), 2);
    this._v2Uniforms(p, vm);
  }
  _bindTex() {
    const g = this.gl; g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D_ARRAY, this.tex);
    g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, this.shOn && this.shReady ? this.shTex : this.dummyShadow);
    g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, this.cloud); g.activeTexture(g.TEXTURE0);
  }
  _chunkDist(c, m) { const cx = (m.mn[0] + m.mx[0]) / 2, cz = (m.mn[2] + m.mx[2]) / 2, r = Math.hypot(m.mx[0] - m.mn[0], m.mx[2] - m.mn[2]) / 2; return Math.max(0, Math.hypot(c.x - cx, c.z - cz) - r); }
  _draw(m) { const g = this.gl; g.bindVertexArray(m.vao); g.drawElements(g.TRIANGLES, m.n, g.UNSIGNED_INT, 0); this.stats.draws++; this.stats.tris += m.n / 3; }
  /* ----- quadro ----- */
  render(cam, opts) {
    const g = this.gl, S = this.scene, e = this.env; opts = opts || {}; this.cam = cam; this.stats.draws = 0; this.stats.tris = 0; if (!this.ready) return;
    const tCpu = performance.now(); this.timer.poll();
    this.resize(); const W = this.w, H = this.h, asp = W / H, qd = this.q.dist * (this.st.viewDist || 1); this.qd = qd;
    /* alcance e névoa: a névoa só começa depois de fogS e chega a ~85% no limite de desenho; no alto (paraquedas/vaca) o alcance cresce */
    const altK = clamp(((cam.y || 0) - (this.groundY || 0) - 25) / 110, 0, 1), rm = 1 + altK * 1.3; this.rm = rm; this.cullD = 400 * qd * rm;
    /* névoa só no fundo: começa em ~45% do alcance e chega a ~80% no limite de desenho (o clima engrossa um pouco) */
    const wMul = clamp(e.fogD / .0046, .7, 3.5); this.fogS = this.cullD * .45 / Math.sqrt(wMul); this.fogD = 1.6 / Math.max(60, this.cullD - this.fogS) * Math.sqrt(wMul);
    this._cam(cam, asp, .08, Math.max(600 + altK * 300, this.cullD + 60), this.P, this.V, this.VP); frustumPlanes(this.VP, this.pl); M4.inv(this.IVP, this.VP);
    const dynOn = this.dyn.ni > 0, vmOn = opts.vm && this.vmMB.ni > 0;
    if (dynOn) updateDyn(g, this.dynMesh, this.dyn);
    if (this.decalDirty) { if (this.decalRebuild) { this._rebuildDecals(); this.decalRebuild = false; } updateDyn(g, this.decalMesh, this.decalMB); this.decalDirty = false; }
    if (this.transMB.ni > 0) updateDyn(g, this.transMesh, this.transMB);
    /* upload dos partículas */
    this._uploadPB(this.pbuf.alpha); this._uploadPB(this.pbuf.add); this._uploadPB(this.beamBuf);
    /* --- sombra --- */
    this.shReady = false;
    if (this.shOn && S && !opts.noShadow) {
      this.timer.begin('sombra'); this._shadowSetup(cam); const sp = this.prog.shadow, spi = this.prog.shadowI;
      g.bindFramebuffer(g.FRAMEBUFFER, this.shFbo); g.viewport(0, 0, this.shSize, this.shSize); g.clear(g.DEPTH_BUFFER_BIT); g.enable(g.DEPTH_TEST); g.depthMask(true); g.disable(g.BLEND); g.disable(g.CULL_FACE);
      g.enable(g.POLYGON_OFFSET_FILL); g.polygonOffset(1.5, 3);
      g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D_ARRAY, this.tex);
      for (const pp of [sp, spi]) { g.useProgram(pp.p); pp.set({ uVP: this.shVP, uTime: this.time, uWind: this.windAmp === undefined ? .35 : this.windAmp }); g.uniform1i(pp.loc('uTex'), 0); }
      g.useProgram(sp.p);
      for (const m of S.chunks) if (aabbVisible(this.shPl, m.mn, m.mx)) this._draw(m);
      if (dynOn) this._draw(this.dynMesh);
      g.useProgram(spi.p);
      for (const m of S.inst) if (m.cast && aabbVisible(this.shPl, m.mn, m.mx) && dist2(cam.x, cam.z, (m.mn[0] + m.mx[0]) / 2, (m.mn[2] + m.mx[2]) / 2) < 70 * 70) { const mm = m.lod || m; g.bindVertexArray(mm.vao); g.drawElementsInstanced(g.TRIANGLES, mm.n, g.UNSIGNED_INT, 0, m.count); this.stats.draws++; }
      g.disable(g.POLYGON_OFFSET_FILL); g.bindFramebuffer(g.FRAMEBUFFER, null); this.shReady = true; this.timer.end();
    }
    /* --- principal --- */
    this._beginScene(W, H); this.timer.begin('cena');
    g.viewport(0, 0, W, H); g.clearColor(e.hor[0], e.hor[1], e.hor[2], 1); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
    if (this.postActive && this.pf.nrm) g.clearBufferfv(g.COLOR, 1, [0, 0, 0, 1e4]);
    g.enable(g.DEPTH_TEST); g.depthFunc(g.LEQUAL); g.depthMask(true); g.disable(g.BLEND); g.enable(g.CULL_FACE); g.cullFace(g.BACK);
    this._bindTex();
    /* céu */
    { const p = this.prog.sky; this._bindCommon(p, this.VP, false); p.set({ uInvVP: this.IVP }); g.disable(g.DEPTH_TEST); g.disable(g.CULL_FACE); g.bindVertexArray(this.emptyVao); g.drawArrays(g.TRIANGLES, 0, 3); g.enable(g.DEPTH_TEST); g.enable(g.CULL_FACE); }
    if (S) {
      /* terreno */
      { const p = this.prog.terr; this._bindCommon(p, this.VP, false); const ld = this.q.terrLod || 64; for (const m of S.terrain) if (aabbVisible(this.pl, m.mn, m.mx)) { if (m.lod && this._chunkDist(cam, m) > ld) this._draw(m.lod); else this._draw(m); } }
      /* estáticos */
      { const p = this.prog.main; this._bindCommon(p, this.VP, false);
        const cf = this.cullD; for (const m of S.chunks) if (aabbVisible(this.pl, m.mn, m.mx) && this._chunkDist(cam, m) < cf) this._draw(m);
        if (dynOn) { g.disable(g.CULL_FACE); this._draw(this.dynMesh); g.enable(g.CULL_FACE); } }
      /* vegetação instanciada */
      { const p = this.prog.inst; this._bindCommon(p, this.VP, false); g.disable(g.CULL_FACE);
        const gk = this.q.grass * (this.st.grass === undefined ? 1 : this.st.grass);
        for (const m of S.inst) {
          if (!aabbVisible(this.pl, m.mn, m.mx)) continue; const cx = (m.mn[0] + m.mx[0]) / 2, cz = (m.mn[2] + m.mx[2]) / 2, rr = Math.hypot(m.mx[0] - m.mn[0], m.mx[2] - m.mn[2]) / 2;
          const d = Math.hypot(cam.x - cx, cam.z - cz) - rr; if (d > m.maxDist * qd * (m.dist ? 1 : rm)) continue;
          const f = m.dist ? clamp(gk, .05, 1.5) : 1, n = Math.min(m.count, Math.max(1, (m.count * Math.min(f, 1)) | 0));
          const mm = (m.lod && d > (this.q.lodDist || 55) * Math.min(1.4, qd)) ? m.lod : m; g.bindVertexArray(mm.vao); g.drawElementsInstanced(g.TRIANGLES, mm.n, g.UNSIGNED_INT, 0, n); this.stats.draws++; this.stats.tris += mm.n / 3 * n;
        }
        g.enable(g.CULL_FACE); }
    }
    /* transparentes (não escrevem no buffer de normais) */
    this._mrt(false);
    g.enable(g.BLEND); g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA); g.depthMask(false);
    if (S) {
      { const p = this.prog.main; this._bindCommon(p, this.VP, false); g.disable(g.CULL_FACE);
        for (const m of S.trans) if (aabbVisible(this.pl, m.mn, m.mx)) this._draw(m);
        if (this.transMB.ni > 0) this._draw(this.transMesh);
        g.enable(g.POLYGON_OFFSET_FILL); g.polygonOffset(-2, -2); if (this.decalMB.ni > 0) this._draw(this.decalMesh); g.disable(g.POLYGON_OFFSET_FILL); g.enable(g.CULL_FACE); }
      { const p = this.prog.water; this._bindCommon(p, this.VP, false); g.disable(g.CULL_FACE); for (const m of S.water) if (aabbVisible(this.pl, m.mn, m.mx)) this._draw(m); g.enable(g.CULL_FACE); }
    }
    /* partículas */
    this._drawParts();
    /* viewmodel */
    if (vmOn) {
      this._mrt(true); g.depthMask(true); g.disable(g.BLEND); g.clear(g.DEPTH_BUFFER_BIT); const vc = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, fov: opts.vmFov || 62 };
      this._cam(vc, asp, .015, 40, this.vmP, this.vmV, this.vmVP); const p = this.prog.vm;
      const sv = this.cam; this.cam = { x: 0, y: 0, z: 0 }; this._bindCommon(p, this.vmVP, true); this.cam = sv; p.set({ uBump: .012 });
      updateDyn(g, this.vmMesh, this.vmMB); g.disable(g.CULL_FACE); this._draw(this.vmMesh); g.enable(g.CULL_FACE);
    }
    g.depthMask(true); g.disable(g.BLEND); this.timer.end();
    if (this.postActive) this._post(W, H, cam.fov);
    this.perf.cpu = this.perf.cpu * .9 + (performance.now() - tCpu) * .1;
  }
  /* partículas / feixes: dados em Float32Array de 12 floats por item */
  _uploadPB(b) { const g = this.gl; if (!b.n) return; g.bindBuffer(g.ARRAY_BUFFER, b.buf); g.bufferSubData(g.ARRAY_BUFFER, 0, b.data.subarray(0, b.n * 12)); }
  _drawParts() {
    const g = this.gl, c = this.cam, V = this.V;
    const rx = V[0], ry = V[4], rz = V[8], ux = V[1], uy = V[5], uz = V[9];
    const p = this.prog.part; this._bindCommon(p, this.VP, false); p.set({ uRight: [rx, ry, rz], uUp: [ux, uy, uz] }); g.disable(g.CULL_FACE);
    const A = this.pbuf.alpha; if (A.n) { p.set({ uAdd: 0 }); g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA); g.bindVertexArray(A.vao); g.drawArraysInstanced(g.TRIANGLE_STRIP, 0, 4, A.n); this.stats.draws++; }
    const D = this.pbuf.add; if (D.n) { p.set({ uAdd: 1 }); g.blendFunc(g.SRC_ALPHA, g.ONE); g.bindVertexArray(D.vao); g.drawArraysInstanced(g.TRIANGLE_STRIP, 0, 4, D.n); this.stats.draws++; }
    const B = this.beamBuf; if (B.n) { const q = this.prog.beam; g.useProgram(q.p); q.set({ uVP: this.VP, uCam: [c.x, c.y, c.z] }); g.blendFunc(g.SRC_ALPHA, g.ONE); g.bindVertexArray(B.vao); g.drawArraysInstanced(g.TRIANGLE_STRIP, 0, 4, B.n); this.stats.draws++; }
    g.enable(g.CULL_FACE);
  }
  /* escreve partícula em buffer: pos+size, rgba, rot,type,seed */
  pushPart(add, x, y, z, size, r, gg, b, a, rot, type, seed) {
    const B = add ? this.pbuf.add : this.pbuf.alpha; if (B.n >= B.cap) return; const d = B.data, o = B.n++ * 12;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = size; d[o + 4] = r; d[o + 5] = gg; d[o + 6] = b; d[o + 7] = a; d[o + 8] = rot; d[o + 9] = type; d[o + 10] = seed || 0; d[o + 11] = 0;
  }
  pushBeam(x0, y0, z0, w, x1, y1, z1, a, r, g, b) {
    const B = this.beamBuf; if (B.n >= B.cap) return; const d = B.data, o = B.n++ * 12;
    d[o] = x0; d[o + 1] = y0; d[o + 2] = z0; d[o + 3] = w; d[o + 4] = x1; d[o + 5] = y1; d[o + 6] = z1; d[o + 7] = a; d[o + 8] = r; d[o + 9] = g; d[o + 10] = b; d[o + 11] = 0;
  }
  beginFrame() { this.dyn.reset(); this.vmMB.reset(); this.transMB.reset(); this.pbuf.alpha.n = 0; this.pbuf.add.n = 0; this.beamBuf.n = 0; }
}
