/* =====================================================================
   15_glb.js — PERSONAGENS EM MODELO 3D (.glb / .gltf) — só no motor Three.js
   Para trocar o boneco de código por um modelo feito no Blender/Meshy:
     CHAR_GLB.capuz = { url: 'modelos/maico.glb', scale: 1, clips: { idle: 'Idle', walk: 'Walk', run: 'Run', jump: 'Jump', death: 'Death', dance: 'Dance' } };
   (a chave é o id do personagem em SKINS: capuz, ze, tonhao, chico, galinha, porcao, joao)
   Ajuste fino da arma na mão (se precisar): wpos: [x,y,z], wrot: [rx,ry,rz], wscale: 1
   • animações trocam com transição suave (parado → andar → correr → pular → morrer → emote)
   • a arma é presa no osso da mão direita (nome com "RightHand"/"hand_r"), usando o mesmo
     modelo de arma do jogo (com a skin escolhida)
   • enquanto o arquivo carrega (ou se falhar), o boneco de código continua aparecendo
   ===================================================================== */
'use strict';
const CHAR_GLB = {};
const CharGLB = {
  cache: new Map(), inst: new Map(), frame: 0, wcache: new Map(), budget: 0,
  /* carrega (uma vez) o arquivo */
  load(url) {
    if (this.cache.has(url)) return this.cache.get(url);
    const rec = { url, gltf: null, err: null, p: null };
    const key = url.replace(/^.*\//, '').replace(/\.glb$/i, ''), emb = typeof GLB_DATA !== 'undefined' && GLB_DATA ? GLB_DATA[key] : null;
    rec.p = new Promise(res => { try {
      const ok = g => { rec.gltf = g; res(rec); }, bad = e => { rec.err = e; console.warn('GLB falhou', url, e); res(rec); };
      const parse = b64 => { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); new THREE.GLTFLoader().parse(u8.buffer, '', ok, bad); };
      if (emb) parse(emb);   /* embutido no build */
      else {
        /* versão do site: cada modelo é um modelos/js/<nome>.js (base64). Script carrega também abrindo o index.html
           direto do disco (file://), onde o navegador bloqueia ler o .glb; se não existir, tenta o .glb pela rede */
        const W = /** @type {any} */ (window), sc = document.createElement('script'); sc.async = true;
        sc.src = url.replace(/[^/]*$/, '') + 'js/' + key + '.js';
        sc.onload = () => { const d = W.GLB_DATA && W.GLB_DATA[key]; if (d) { parse(d); W.GLB_DATA[key] = null; } else new THREE.GLTFLoader().load(url, ok, undefined, bad); };
        sc.onerror = () => new THREE.GLTFLoader().load(url, ok, undefined, bad);
        document.head.appendChild(sc);
      }
    } catch (e) { rec.err = e; res(rec); } });
    this.cache.set(url, rec); return rec;
  },
  defOf(c) {
    if (!c) return null; const AL = typeof agentLook === 'function' ? agentLook(c.farmer) : null, S = AL || SKINS[(c.skin | 0) % SKINS.length];
    if (!AL && S && CHAR_GLB[S.id]) return CHAR_GLB[S.id];                        /* modelo próprio do personagem (se existir) */
    if (!BODY3D.on || !S || (!BODY3D.tex && (S.special === 'chicken' || S.onesie))) return null;     /* com roupas em arquivo, as fantasias de bicho também usam o corpo 3D */
    let lite = c.key !== 'menu' && typeof isTat === 'function' && !isTat() && typeof G !== 'undefined' && G.scene === 'play';
    /* 5x5: corpo original só perto da câmera; longe (> ~15 m) a versão leve, que não dá para distinguir (com folga para não ficar trocando) */
    if (!lite && c.key !== 'menu' && typeof G !== 'undefined' && G.scene === 'play' && G.cam) { const d = Math.hypot(c.x - G.cam.x, c.z - G.cam.z), I = this.inst.get(c.key), wasLite = I && /_lod/.test(I.url || ''); lite = d > (wasLite ? 13 : 17) || !['alto', 'ultra'].includes(typeof effQuality === 'function' ? effQuality() : 'alto'); }   /* médio/baixo/celular: versão leve sempre (mais fluido) */
    if (!AL && BODY3D.tex && S.agentSkin && AGENT_GLB[S.agentSkin]) return BASE_GLB['ag_' + AGENT_GLB[S.agentSkin].m + (lite ? 'L' : '')];   /* agente escolhido como personagem no Todos contra Todos */
    if (AL && BODY3D.tex && AGENT_GLB[c.farmer]) return BASE_GLB['ag_' + AGENT_GLB[c.farmer].m + (lite ? 'L' : '')];   /* agente do 5x5: modelo próprio */
    return S.female ? (lite ? BASE_GLB.fL : BASE_GLB.f) : (lite ? BASE_GLB.mL : BASE_GLB.m);   /* corpo base do Meshy, roupa pintada por região */
  },
  /* true = desenhou com o modelo 3D (o boneco de código não precisa ser desenhado) */
  draw(c, opt) {
    if (typeof ENGINE !== 'function' || ENGINE() !== 'three' || !ThreeR.rd || !c.key) return false;
    const D = this.defOf(c); if (!D) return false; if (!this._pre) { this._pre = 1; preloadModels(); }
    if (D.base && G.cam && c.key !== 'menu') {   /* orçamento: longe ou além do limite por quadro → boneco leve de código */
      const far = isTat() ? BODY3D.far : BODY3D.farBR, d = Math.hypot(c.x - G.cam.x, c.z - G.cam.z), I0 = this.inst.get(c.key), was = I0 && I0.used === this.frame - 1;
      /* perto (< 30 m) sempre 3D; quem já estava 3D no quadro anterior tem folga — senão o personagem fica piscando entre 3D e boneco de código */
      if (d > far || (d > 30 && this.budget >= BODY3D.max + (was ? 20 : 0))) return false; this.budget++; } const rec = this.load(D.url); if (!rec.gltf) return false;
    let I = this.inst.get(c.key);
    if (!I || I.url !== D.url) { if (I) this.drop(c.key); if (D.base) { Body3D.prep(rec); Body3D.lockRoot(rec); } I = this.make(rec, D); if (D.base) Body3D.init(I, rec); this.inst.set(c.key, I); }
    I.used = this.frame; I.root.visible = true;
    if (D.base) { Body3D.update(I, c, opt, D); return true; }
    const sc = D.scale || 1; I.root.position.set(c.x, c.y + (D.y || 0), c.z); I.root.rotation.set(0, c.yaw + Math.PI + (D.rot || 0), 0); I.root.scale.setScalar(sc);
    /* animação conforme o estado */
    const spd = c.spd || 0, want = c.dead ? 'death' : c.emote ? 'dance' : c.air ? 'jump' : spd > 4.5 ? 'run' : spd > .6 ? 'walk' : 'idle';
    this.play(I, want, D); const t = (opt && opt.time) || 0, dt = I.t0 === undefined ? 0 : clamp(t - I.t0, 0, .1); I.t0 = t;
    if (I.cur && (want === 'walk' || want === 'run')) I.cur.timeScale = clamp(spd / (want === 'run' ? 6 : 2.6), .6, 1.6);
    I.mixer.update(dt);
    this.weapon(I, c);
    return true;
  },
  make(rec, D) {
    const T = THREE, root = T.SkeletonUtils.clone(rec.gltf.scene); root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    const mixer = new T.AnimationMixer(root), clips = rec.gltf.animations || [], byName = n => n && clips.find(a => a.name.toLowerCase() === String(n).toLowerCase() || a.name.toLowerCase().includes(String(n).toLowerCase()));
    const acts = {}, names = D.clips || {}, keys = new Set(['idle', 'walk', 'run', 'jump', 'death', 'dance'].concat(Object.keys(names)));
    for (const k of keys) { const nm = names[k] || (D.base ? null : k); if (!nm) continue; const cl = clips.find(a => a.name === nm) || byName(nm); if (cl) acts[k] = mixer.clipAction(cl); }
    for (const k of ['death', 'death2', 'death3', 'jump', 'em_vitoria', 'em_derrota']) if (acts[k]) { acts[k].setLoop(T.LoopOnce, 1); acts[k].clampWhenFinished = true; }
    let hand = null; root.traverse(o => { if (!hand && o.isBone && /right.?hand|hand.?r\b|hand_r|r_hand|handr/i.test(o.name)) hand = o; });
    ThreeR.scene.add(root); return { root, mixer, acts, cur: null, curK: '', url: rec.url, hand, wkey: '', wmesh: null, used: 0, def: D };
  },
  play(I, k, D) {
    if (I.curK === k) return; const a = I.acts[k] || I.acts.idle || Object.values(I.acts)[0]; I.curK = k; if (!a || a === I.cur) return;
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); if (I.cur) I.cur.crossFadeTo(a, k === 'death' ? .12 : .22, false); I.cur = a;
  },
  /* arma do jogo presa na mão */
  weapon(I, c) {
    const key = c.wid ? c.wid + '|' + (c.wsk || '') : ''; if (key === I.wkey) return; I.wkey = key;
    if (I.wmesh) { I.wmesh.parent && I.wmesh.parent.remove(I.wmesh); I.wmesh = null; } if (!key || !I.hand) return;
    let geo = this.wcache.get(key); if (!geo) { const mb = new MB(1 << 12); drawWeapon(mb, c.wid, { sk: c.wsk }); geo = mb.ni ? ThreeR.staticGeo(mb) : null; this.wcache.set(key, geo); } if (!geo) return;
    const m = new THREE.Mesh(geo, ThreeR.mats.world); m.castShadow = true; m.customDepthMaterial = ThreeR.mats.world.userData.depth;
    const ws = 1 / Math.max(1e-3, I.root.scale.x * (I.hand.getWorldScale(new THREE.Vector3()).x / Math.max(1e-3, I.root.scale.x)));
    const D = I.def || {}, wp = D.wpos || [0, 0, 0], wr = D.wrot || [-Math.PI / 2, 0, 0]; m.scale.setScalar(ws * (D.wscale || 1)); m.position.set(wp[0], wp[1], wp[2]); m.rotation.set(wr[0], wr[1], wr[2]); I.hand.add(m); I.wmesh = m;
  },
  drop(key) { const I = this.inst.get(key); if (!I) return; I.root.parent && I.root.parent.remove(I.root); I.mixer.stopAllAction(); if (I.mats) for (const m of I.mats) m.dispose(); this.inst.delete(key); },
  /* a cada quadro: esconde quem não apareceu (morreu longe, saiu da partida, troca de cena) */
  endFrame() { this.budget = 0; for (const [k, I] of this.inst) { if (I.used !== this.frame) { I.root.visible = false; if (this.frame - I.used > 600) this.drop(k); } } this.frame++; }
};
/* =====================================================================
   CORPO 3D (v7.5) — bases do Meshy (masculina e feminina, mesmo esqueleto de 24 ossos)
   para TODOS os personagens. A roupa é "pintada" por região do corpo (osso dominante de
   cada vértice): pele/rosto, camisa, antebraço (manga), barriga (top), cinto, calça e botas.
   Poses por código direto nos ossos: braços em IK de 2 ossos segurando a arma na mira,
   agachar (joelhos em IK), cabeça seguindo a mira, pulo, queda ao morrer, paraquedas e emotes.
   Andar/correr usam as animações do próprio modelo.
   ===================================================================== */
const BODY3D = { on: true, nu: false, tex: true, far: 170, farBR: 170, max: 50 };   /* v7.10: corpo 3D (leve quando longe) até a distância de visão; antes, longe ou com muitos na tela virava o boneco antigo */
if (typeof window !== 'undefined' && /** @type {any} */ (window).BOMBAKI_NO3D) { BODY3D.on = false; BODY3D.tex = false; }   /* versão leve (testes de rede) */
/* v7.8: corpo com a textura original do modelo + roupa e chapéu em arquivos próprios (modelos/roupa_*.glb, chapeu_*.glb) */
const OUTFIT = {
  agent: { peao: 'vermelha', rastreador: 'verde', guardiao: 'marrom', mateiro: 'marrom', socorrista: 'amarela' },
  skin: { capuz: 'azul', ze: 'vermelha', tonhao: 'amarela', chico: 'verde', galinha: 'galinha', porcao: 'porco', joao: 'marrom' },
  /* chapéu 3D de cada agente do 5x5 (no lugar dos chapéus de código) */
  agentHat: { peao: 'palha', rastreador: 'broto', guardiao: 'safari', mateiro: '', socorrista: 'bone' },
  hood: { galinha: 1, porco: 1, azul: 1 },
  long: { galinha: 1, porco: 1, azul: 1 }   /* manga comprida: o antebraço do corpo fica escondido (só as mãos aparecem) */   /* fantasias com capuz: cobrem a cabeça e não usam chapéu */
};
/**
 * Armas em GLB (modelos/arma_N.glb, do Meshy: cano em −x, comprimento 1,9). grip/fore = onde ficam a mão do gatilho
 * e a mão de apoio, medidos na vista de lado do modelo (x, y). len = comprimento no jogo (m). flat = estilingue (de frente).
 */
const WEAPON_GLB = {
  faca: { f: 1, grip: [.56, 0], len: .55 },
  colher: { f: 2, grip: [.63, -.31], fore: [-.49, .21], len: .58 },
  porteira: { f: 5, grip: [.21, -.07], fore: [-.42, .14], len: 1 },
  galho: { f: 6, grip: [.31, 0], fore: [-.21, .06], len: 1.05 },
  vassoura: { f: 9, grip: [.28, .1], fore: [-.21, .17], len: 1.4 },
  estilingue: { f: 10, grip: [-.33, .2], len: .3, flat: 1 },
  /* v7.9: armas novas */
  cabrita: { f: 3, grip: [.49, -.28], fore: [-.38, .21], len: .62 },
  moedor: { f: 4, grip: [.7, -.35], fore: [0, 0], len: .6 },
  enxadao: { f: 7, grip: [.35, .07], fore: [-.07, .2], len: 1 },
  vara: { f: 8, grip: [.35, 0], fore: [-.07, .07], len: 1.3 },
  trezoitao: { f: 11, grip: [.63, -.21], fore: [.45, -.1], len: .34 },
  tijolinho: { f: 12, grip: [.56, -.21], fore: [.4, -.12], len: .3 }
};
/** cores dos braços em 1ª pessoa para cada roupa nova (manga, barra/punho, comprimento) + tom de pele do corpo novo */
const OUTFIT_VM = {
  vermelha: { shirt: 0xd8262a, shirt2: 0xb81e22, sleeve: 'short' }, amarela: { shirt: 0xf2b21a, shirt2: 0xe8e8e0, sleeve: 'short' },
  verde: { shirt: 0x2aa83a, shirt2: 0xc8f040, sleeve: 'short' }, marrom: { shirt: 0x8a4a22, shirt2: 0x7ac040, sleeve: 'short' },
  galinha: { shirt: 0xf4f2ee, shirt2: 0xe8e2d8, sleeve: 'full', wrist: 0xf4f2ee }, porco: { shirt: 0xf4a0c0, shirt2: 0xe888b0, sleeve: 'full', wrist: 0xf4a0c0 },
  azul: { shirt: 0x2a6ae8, shirt2: 0x22d8e0, sleeve: 'full', wrist: 0x1a1a22 },
  /* agentes com modelo próprio: braço em 1ª pessoa com a roupa de cada um */
  ag_peao: { shirt: 0xeadfc8, shirt2: 0xd8ccb0, sleeve: 'short', skin: 0xe2a882 },                       /* Zeca: camisa creme arregaçada */
  ag_rastreador: { shirt: 0x5a6a34, shirt2: 0x4a5a2a, sleeve: 'short', skin: 0xc68a62, glove: 0 },        /* Bia: jaqueta verde-oliva arregaçada */
  ag_guardiao: { shirt: 0xf0a828, shirt2: 0xd86a1a, sleeve: 'short', skin: 0xe0a07a },                    /* Zefa: xadrez amarelo e laranja */
  ag_mateiro: { shirt: 0x4a4a50, shirt2: 0x3a3a40, sleeve: 'short', skin: 0xd09070, glove: 0x1e1a18 },    /* Brasa: camisa cinza e luvas pretas */
  ag_socorrista: { shirt: 0xe8dcc0, shirt2: 0xe0d0b0, sleeve: 'short', skin: 0xb87a52 }                   /* Lua: blusa de linho de manga curta */
};
const BODY_SKIN = 0xf0b08a;
/** visual dos braços em 1ª pessoa: o do personagem antigo trocado pelas cores da roupa nova (agente ou skin) */
function vmLook(S, farmer, skinIdx) {
  if (!BODY3D.tex || !S) return S; const AL = farmer && agentLook(farmer), SS = /** @type {any} */ (SKINS[(skinIdx | 0) % SKINS.length] || {}), id = AL ? (AGENT_GLB[farmer] ? 'ag_' + farmer : OUTFIT.agent[farmer]) : SS.agentSkin ? 'ag_' + SS.agentSkin : OUTFIT.skin[SS.id] || 'marrom', V = OUTFIT_VM[id];
  return V ? Object.assign({}, S, { skin: V.skin || BODY_SKIN, glove: 0, plaid: 0, style: '', onesie: '', wrist: V.wrist || V.shirt2 }, V) : S;
}
/** chapéu do jogo → arquivo (os que não têm modelo ficam sem chapéu) */
const HAT_GLB = { straw: 'palha', cap: 'bone', bucket: 'safari', broto: 'broto', safari: 'safari' };
/** tamanho de cada chapéu em relação à largura da cabeça e quanto desce na testa */
const HAT_FIT = { palha: { w: 1.75, d: .3 }, safari: { w: 1.6, d: .3 }, broto: { w: 1.55, d: .32 }, bone: { w: 1.12, d: .3 } };
/* animações usadas (as que faltarem no arquivo caem nas poses por código) */
const MIXAMO_CLIPS = { walk: 'Walking', walkW: 'Walk_Forward_While_Shooting', run: 'Running', crouch: 'CrouchLookAroundBow', crouchWalk: 'Cautious_Crouch_Walk_Forward', crouchBack: 'Cautious_Crouch_Walk_Backward', crouchSide: 'Crouch_Walk_Left_with_Gun',
  death: 'Knock_Down', death2: 'Dead', death3: 'dying_backwards', jump: 'Jump_Over_Obstacle_2',
  /* pacote 2 (com arma): parado, mirando, correr, andar para trás e de lado */
  idleW: 'Rifle_Aim_Idle', aimW: 'Rifle_Aim_Idle', runW: 'Rifle_Charge', back: 'Walk_Backward_with_Gun', strafeL: 'Strafe_Left', strafeR: 'Strafe_Right',
  /* só a parte de cima do corpo (por cima da locomoção) */
  reload: 'Standing_Reload', throw: 'Crouch_Pull_and_Throw', knife: 'Thrust_Slash', hit: 'Hit_Reaction',
  /* emotes */
  em_forro: 'Dance_Forro', em_galinha: 'Dance_Galinha', em_requebra: 'Dance_Requebra', em_vitoria: 'Victory_Cheer', em_derrota: 'Defeat', em_chapeu: 'Wave_One_Hand', em_rena: 'FunnyDancing_01' };
/**
 * Pele procedural (os modelos base não têm textura de cor): tom do personagem + manchas suaves + poros + rubor,
 * olhos/sobrancelhas/boca pintados no rosto quando o modelo não tem rosto na textura, e roupa de baixo neutra.
 * Tudo no espaço do modelo em repouso (vObj), então a pele "gruda" no corpo durante as animações.
 */
const SKIN_GLSL = `
uniform vec3 uSkinK; uniform float uNu, uMapAvg, uHasMap; uniform vec3 uSkin, uUwCol; uniform vec4 uFace, uUw;
varying vec3 vRegC; varying float vRegS; varying vec3 vObj; varying float vReg; varying float vArm; varying float vLeg; varying float vFore; uniform float uHide;
float h31(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float el(vec2 d, vec2 r) { return length(d / r); }
float band(float y, float a, float b) { return smoothstep(a - .004, a + .004, y) * (1. - smoothstep(b - .004, b + .004, y)); }
float uwMask() { float y = vObj.y, body = 1. - smoothstep(.3, .7, vArm);
  return body * max(band(y, uUw.x, uUw.y), band(y, uUw.z, uUw.w) * (1. - smoothstep(.3, .7, vLeg)) * (1. - smoothstep(.105, .115, abs(vObj.x)))); }
vec3 skinBase(vec3 tex) {
  vec3 P = vObj; float n1 = vn(P * 9.), n2 = vn(P * 45.), n3 = vn(P * 190. + 7.);
  vec3 sk = mix(uSkin, vec3(dot(uSkin, vec3(.3, .59, .11))), .18);   /* pele menos "plástico laranja" */
  vec3 c = sk * (.93 + .1 * n1) * (.965 + .05 * n2) * (.982 + .036 * n3);
  c = mix(c, c * vec3(1.07, .9, .87), smoothstep(.55, .85, n1) * .35);            /* manchas quentes */
  float l = dot(tex, vec3(.299, .587, .114));
  if (uHasMap > .5) { float d = l / max(.05, uMapAvg); c *= clamp(mix(1., d, .85), .08, 1.25);        /* detalhes pintados na textura (olhos, boca) */
    c = mix(c, vec3(.92, .9, .88), smoothstep(1.32, 1.55, d) * step(5.5, vReg) * step(vReg, 6.5)); }  /* branco dos olhos */
  if (uFace.w > .5 && abs(vReg - 6.) < .5) {                                         /* rosto pintado (modelo sem textura) */
    vec3 q = P - uFace.xyz; float front = smoothstep(.035, .06, q.z);
    for (int s = 0; s < 2; s++) { float sx = s == 0 ? -1. : 1.; vec2 e = q.xy - vec2(sx * .044, .074);
      float sc = el(e, vec2(.017, .0095)), ir = length(e - vec2(0., -.001)) / .0072, pu = ir * 2.1;
      c = mix(c, vec3(.95, .94, .92), (1. - smoothstep(.85, 1., sc)) * front);
      c = mix(c, vec3(.28, .17, .09), (1. - smoothstep(.8, 1., ir)) * front);
      c = mix(c, vec3(.03), (1. - smoothstep(.8, 1., pu)) * front);
      c = mix(c, vec3(.3, .2, .14), (1. - smoothstep(.9, 1., el(e - vec2(0., .0085), vec2(.018, .0018)))) * front);       /* cílios */
      c = mix(c, vec3(.16, .1, .06), (1. - smoothstep(.8, 1., el(e - vec2(sx * .002, .027 - abs(e.x) * .25), vec2(.021, .0032)))) * front);   /* sobrancelha */
      c = mix(c, c * vec3(1.12, .82, .8), (1. - smoothstep(0., 1., el(q.xy - vec2(sx * .052, .03), vec2(.022, .016)))) * .45 * front); }  /* bochecha */
    c = mix(c, c * vec3(1.05, .62, .6), (1. - smoothstep(.6, 1., el(q.xy - vec2(0., .012), vec2(.03, .0065)))) * front); }   /* boca */
  float u = uwMask(); if (u > 0.) { float f = .9 + .1 * vn(P * 260.); c = mix(c, uUwCol * f, u); }   /* roupa de baixo */
  return c; }
float skinRough(float r) { return mix(.62 + .1 * vn(vObj * 120.), .85, uwMask()); }
`;
/** animações que tocam só no tronco e braços */
const UPPER_CLIPS = ['reload', 'throw', 'knife', 'hit'];
/** nome "canônico" de cada osso (rig do Meshy ou do Mixamo → mesmos nomes no código) */
function boneCanon(name, mixamo) {
  const n = String(name).replace(/^mixamorig[:_]?/i, '');
  if (!mixamo) return n;
  return ({ Spine: 'Spine02', Spine1: 'Spine01', Spine2: 'Spine', Neck: 'neck', HeadTop_End: 'head_end' })[n] || n;
}
const BASE_GLB = {
  m: { url: 'modelos/base_masculino.glb', base: 'm', clips: MIXAMO_CLIPS }, f: { url: 'modelos/base_feminino.glb', base: 'f', clips: MIXAMO_CLIPS },
  /* versões leves (~4 mil triângulos) para partidas grandes (Todos contra Todos) */
  mL: { url: 'modelos/base_masculino_lod.glb', base: 'm', clips: MIXAMO_CLIPS }, fL: { url: 'modelos/base_feminino_lod.glb', base: 'f', clips: MIXAMO_CLIPS }
};
/* v7.10: os 5 agentes do 5x5 com modelo próprio (roupa e cabelo no modelo, rig do Meshy, animações do jogo transferidas) */
const AGENT_GLB = { peao: { m: 'zeca', f: 0 }, rastreador: { m: 'bia', f: 1 }, guardiao: { m: 'zefa', f: 1 }, mateiro: { m: 'brasa', f: 0 }, socorrista: { m: 'lua', f: 1 } };
for (const k in AGENT_GLB) { const a = AGENT_GLB[k]; BASE_GLB['ag_' + a.m] = { url: 'modelos/agente_' + a.m + '.glb', base: a.f ? 'f' : 'm', clips: MIXAMO_CLIPS, own: 1 }; BASE_GLB['ag_' + a.m + 'L'] = { url: 'modelos/agente_' + a.m + '_lod.glb', base: a.f ? 'f' : 'm', clips: MIXAMO_CLIPS, own: 1 }; }
const Body3D = {
  REG: { pele: 0, camisa: 1, antebraco: 2, calca: 3, botas: 4, cinto: 5, cabeca: 6, barriga: 7 },
  _v: null,
  tmp() { if (!this._v) { const T = THREE; this._v = { a: new T.Vector3(), b: new T.Vector3(), c: new T.Vector3(), d: new T.Vector3(), e: new T.Vector3(), q: new T.Quaternion(), q2: new T.Quaternion(), q3: new T.Quaternion(), m: new T.Matrix4() }; } return this._v; },
  /** uma vez por modelo: região de cada vértice + tom de pele médio da textura */
  prep(rec) {
    if (rec.prepped) return; rec.prepped = true; const T = THREE, R = this.REG;
    rec.gltf.scene.traverse(o => {
      if (!o.isSkinnedMesh || o.geometry.getAttribute('aReg')) return;
      const g = o.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, pos = g.attributes.position, B = o.skeleton.bones, n = pos.count, reg = new Float32Array(n);
      const mix = B.some(b => /^mixamorig/i.test(b.name)), cn = B.map(b => boneCanon(b.name, mix).toLowerCase()), hip = B[cn.indexOf('hips')], hipY = hip ? hip.getWorldPosition(new T.Vector3()).y : .96;
      const handP = B.filter((b, i) => /^(left|right)hand$/.test(cn[i])).map(b => b.getWorldPosition(new T.Vector3())), bp = B.map(b => b.getWorldPosition(new T.Vector3()));
      for (let v = 0; v < n; v++) {
        let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > bw) { bw = w; best = si.getComponent(v, k); } }
        const nm = cn[best] || '', y = pos.getY(v); let r = R.camisa;
        if (!/hips|spine|neck|head|arm|hand|leg|foot|toe|shoulder/.test(nm)) { r = handP.some(h => h.distanceTo(bp[best]) < .2) ? R.pele : y < hipY - .04 ? R.calca : R.camisa; reg[v] = r; continue; }   /* ossos extras do rig */
        if (/head|neck/.test(nm)) r = R.cabeca; else if (/hand/.test(nm)) r = R.pele; else if (/forearm/.test(nm)) r = R.antebraco;
        else if (/foot|toe/.test(nm)) r = R.botas; else if (/upleg|leg/.test(nm)) r = y < .2 ? R.botas : R.calca;
        else if (/hips/.test(nm)) r = y > hipY + .05 ? R.barriga : y > hipY - .035 ? R.cinto : R.calca;
        else if (/spine02/.test(nm) && y < hipY + .16) r = y < hipY + .05 ? R.cinto : R.barriga;
        reg[v] = r;
      }
      g.setAttribute('aReg', new T.BufferAttribute(reg, 1));
      /* tom médio da pele na textura (para recolorir mantendo olhos, boca e sombras) */
      const mat = o.material, img = mat.map && mat.map.image, uv = g.attributes.uv; let sk = [.93, .76, .64];
      try { if (img && uv) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); x.drawImage(img, 0, 0, 64, 64); const d = x.getImageData(0, 0, 64, 64).data; let r = 0, gg = 0, b = 0, c = 0;
        for (let v = 0; v < n; v += 7) { if (reg[v] !== R.pele) continue; const px = Math.min(63, Math.max(0, uv.getX(v) * 64 | 0)), py = Math.min(63, Math.max(0, (mat.map.flipY ? 1 - uv.getY(v) : uv.getY(v)) * 64 | 0)), i = (py * 64 + px) * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2]; c++; }
        if (c > 10) sk = [r / c / 255, gg / c / 255, b / c / 255]; } } catch (e) { }
      rec.skinRef = img ? sk.map(x => Math.max(.2, Math.pow(x, 2.2))) : [.6, .6, .6];   /* linear (sem textura: cor base cinza .6) */
    });
  },
  /** trava o deslocamento das animações (o jogo move o personagem): mantém só a altura do quadril */
  lockRoot(rec) {
    if (rec.rootLocked) return; rec.rootLocked = true;
    for (const cl of rec.gltf.animations || []) for (const tr of cl.tracks) { if (!/hips\.position$/i.test(tr.name)) continue; const v = tr.values; for (let i = 3; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; } }
  },
  /** material próprio de cada personagem (cores por região) */
  material(base, rec) {
    const T = THREE, m = base.clone(), U = { uCol: { value: Array.from({ length: 8 }, () => new T.Color(1, 1, 1)) }, uSkinK: { value: new T.Vector3(1, 1, 1) }, uSkinR: { value: [0, 0, 0, 0, 0, 0, 0, 0] },
      uNu: { value: 0 }, uSkin: { value: new T.Color(.8, .55, .42) }, uMapAvg: { value: .5 }, uHasMap: { value: m.map ? 1 : 0 }, uFace: { value: new T.Vector4(0, 1.5, 0, 0) }, uUw: { value: new T.Vector4(.75, .95, 9, 9) }, uUwCol: { value: new T.Color(.5, .5, .5) }, uHide: { value: 0 } };
    m.userData.U = U; if (!m.map) m.color.setScalar(.6); if (!m.metalnessMap) m.metalness = 0; if (!m.roughnessMap) m.roughness = .82;   /* modelo original: usa os mapas de relevo/rugosidade dele */
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      /* cor da região calculada por vértice e interpolada: bordas suaves entre camisa, cinto, calça e pele */
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aReg;\nuniform vec3 uCol[8];\nuniform float uSkinR[8];\nvarying vec3 vRegC;\nvarying float vRegS;\nvarying vec3 vObj;\nvarying float vReg;\nvarying float vArm;\nvarying float vLeg;\nvarying float vFore;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position; vReg = aReg; { int q = int(aReg + .5); vArm = (q == 0 || q == 2 || q == 6) ? 1. : 0.; vLeg = q == 3 ? 1. : 0.; vFore = q == 2 ? 1. : 0.; }\n{ int r = int(aReg + .5); vRegC = vec3(1.); vRegS = 0.; for (int i = 0; i < 8; i++) { if (i == r) { vRegC = uCol[i]; vRegS = uSkinR[i]; } } }');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + SKIN_GLSL)
        .replace('#include <map_fragment>', `#include <map_fragment>
        if (uHide > .5 && vArm < .5) discard;   /* pele coberta pela roupa */
        if (uHide > 1.5 && vFore > .5) discard;   /* manga comprida: antebraço também */
        if (uHide > .5) diffuseColor.rgb = mix(diffuseColor.rgb, uSkin, smoothstep(.3, .8, vFore));   /* antebraço com pele (o corpo base vem de macacão) */
        if (uNu > 1.5) { } else if (uNu > .5) diffuseColor.rgb = skinBase(diffuseColor.rgb);
        else { float l = dot(diffuseColor.rgb, vec3(.299, .587, .114));
          vec3 cloth = vRegC * clamp(l * 1.9, .62, 1.2), skin = clamp(diffuseColor.rgb * uSkinK, 0., 1.);
          diffuseColor.rgb = mix(cloth, skin, clamp(vRegS, 0., 1.)); }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nif (uNu > .5 && uNu < 1.5) roughnessFactor = skinRough(roughnessFactor);');
    };
    m.customProgramCacheKey = () => 'bombaki-corpo3d';
    return m;
  },
  init(I, rec) {
    const T = THREE; I.mats = []; I.base = true; I.bones = {};
    let mix = false; I.root.traverse(o => { if (o.isBone && /^mixamorig/i.test(o.name)) mix = true; }); I.mix = mix;
    I.root.traverse(o => { if (o.isBone) I.bones[boneCanon(o.name, mix)] = o; if (o.isSkinnedMesh) { o.material = this.material(o.material, rec); I.mats.push(o.material); o.frustumCulled = true; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); o.geometry.boundingSphere.radius = Math.max(o.geometry.boundingSphere.radius, 1.4); } });
    I.root.traverse(o => { if (o.isSkinnedMesh && !I.body) I.body = o; }); I.rec = rec;
    I.skinRef = rec.skinRef || [.8, .55, .42]; I.lookKey = ''; I.hair = null; I.bomb = null; I.wobj = null;
    /* posições de repouso (para medir comprimentos e prender acessórios) */
    I.root.updateMatrixWorld(true); const wp = n => I.bones[n] ? I.bones[n].getWorldPosition(new T.Vector3()) : new T.Vector3();
    I.rest = { head: wp('Head'), top: wp('head_end'), shR: wp('RightArm'), shL: wp('LeftArm'), hip: wp('Hips'), chest: wp('Spine') };
    I.restQ = {}; I.restP = {}; for (const k in I.bones) { I.restQ[k] = I.bones[k].quaternion.clone(); I.restP[k] = I.bones[k].position.clone(); }
    I.restW = []; I.root.traverse(o => { if (o.isSkinnedMesh && o === I.body) I.restW = o.skeleton.bones.map(b => b.getWorldPosition(new T.Vector3())); });   /* ossos na pose de repouso (metros) */
    I.bindW = {}; for (const k of ['Head', 'Spine01', 'Spine']) if (I.bones[k]) I.bindW[k] = I.bones[k].matrixWorld.clone();
    /* dedos (rig com dedos): normal da palma no espaço da mão, para fechar a mão em volta da arma */
    I.palm = {}; for (const sd of ['Left', 'Right']) { const B = I.bones, H = B[sd + 'Hand'], f1 = B[sd + 'HandMiddle1'] || B[sd + 'HandIndex1'], f3 = B[sd + 'HandMiddle3'] || B[sd + 'HandIndex3'], th = B[sd + 'HandThumb1'];
      if (!H || !f1 || !f3 || !th) continue; const P = o => o.getWorldPosition(new T.Vector3()), d = P(f3).sub(P(f1)).normalize(), tdir = P(th).sub(P(f1)).normalize(); let n = new T.Vector3().crossVectors(d, tdir).normalize();
      const toBody = I.rest.hip.clone().sub(P(H)).setY(0).normalize(); if (n.dot(toBody) < 0) n.negate(); I.palm[sd] = n.applyQuaternion(H.getWorldQuaternion(new T.Quaternion()).invert()); }
    /* camada de cima (recarregar, arremessar): segundo mixer só com tronco e braços, aplicado por cima da locomoção */
    I.up = new T.AnimationMixer(I.root); I.upActs = {}; I.vf = 0; I.vr = 0;
    for (const k of UPPER_CLIPS) { const a = I.acts[k]; if (!a) continue; delete I.acts[k]; const cl = a.getClip();
      const f = new T.AnimationClip(cl.name + '_cima', cl.duration, cl.tracks.filter(tr => !/(Hips|Leg|Foot|Toe)/.test(tr.name.split('.')[0])));
      const ua = I.up.clipAction(f); ua.setLoop(T.LoopOnce, 1); ua.clampWhenFinished = true; I.upActs[k] = ua; }
  },
  col(h) { const c = new THREE.Color(h >>> 0); return c; },
  /** aplica a roupa do personagem (cores por região) e o cabelo/chapéu */
  look(I, c) {
    const AL = typeof agentLook === 'function' ? agentLook(c.farmer) : null, S = AL || SKINS[(c.skin | 0) % SKINS.length], hat = AL ? (S.hat === 'none' ? '' : S.hat) : hatOf(c.skin);
    const key = (AL ? 'a:' + c.farmer : 's:' + (c.skin | 0)) + '|' + hat + '|' + (c.hatOff ? 1 : 0); if (key === I.lookKey) return; I.lookKey = key; I.S = S;
    const R = this.REG, full = S.sleeve === 'full' || (!S.toon && S.sleeve !== 'short'), skinC = this.col(S.skin), sr = I.skinRef;
    const lin = c2 => c2.convertSRGBToLinear ? c2.clone().convertSRGBToLinear() : c2.clone(), sk = lin(skinC);
    for (const m of I.mats) {
      const U = m.userData.U, set = (r, h) => U.uCol.value[r].copy(lin(this.col(h)));
      set(R.camisa, S.shirt); set(R.antebraco, full ? S.shirt : S.skin); set(R.calca, S.pants); set(R.botas, S.boots); set(R.cinto, S.belt || S.pants2 || S.shirt2 || S.pants); set(R.barriga, S.crop ? S.skin : S.shirt); set(R.pele, S.skin); set(R.cabeca, S.skin);
      U.uSkinK.value.set(Math.min(1.6, sk.r / sr[0]), Math.min(1.6, sk.g / sr[1]), Math.min(1.6, sk.b / sr[2]));
      U.uSkinR.value = [1, 0, full ? 0 : 1, 0, 0, 0, 1, S.crop ? 1 : 0];
      /* corpo base sem roupa: pele procedural no corpo todo + roupa de baixo neutra (as roupas vêm depois como arquivos) */
      U.uNu.value = BODY3D.tex ? 2 : BODY3D.nu ? 1 : 0; if (BODY3D.tex) U.uSkin.value.setRGB(sr[0], sr[1], sr[2]);
      if (BODY3D.nu) { const r = I.rest, fem = /feminino/.test(I.url || ''); U.uSkin.value.copy(sk); U.uMapAvg.value = (sr[0] + sr[1] + sr[2]) / 3;
        U.uFace.value.set(r.head.x, r.head.y, r.head.z, U.uHasMap.value > .5 ? 0 : 1);
        U.uUw.value.set(r.hip.y - .17, r.hip.y + .06, fem ? r.chest.y - .1 : 9, fem ? r.chest.y + .035 : 9); U.uUwCol.value.copy(lin(this.col(0x3c4652))); }
    }
    /* cabelo, barba e chapéu (mesmos do personagem) presos ao osso da cabeça */
    if (I.hair) { I.hair.parent && I.hair.parent.remove(I.hair); I.hair.geometry.dispose(); I.hair = null; }
    I.outWant = BODY3D.tex ? (AL ? OUTFIT.agent[c.farmer] : OUTFIT.skin[S.id]) || 'marrom' : '';
    I.hatWant = !BODY3D.tex || OUTFIT.hood[I.outWant] || c.hatOff ? '' : AL && OUTFIT.agentHat[c.farmer] !== undefined ? OUTFIT.agentHat[c.farmer] : hat ? HAT_GLB[hat] || 'code:' + hat : '';
    if (/agente_/.test(I.url || '')) { I.outWant = ''; I.hatWant = ''; }   /* agente com modelo próprio: já vem vestido */
    if (BODY3D.tex) return;   /* modelos novos: careca de fábrica, cabelo/chapéu vêm dos arquivos */
    const mb = new MB(1 << 14); drawHeadToon(mb, S, c.hatOff || BODY3D.nu ? '' : hat, null, 0, true);
    if (mb.ni) { const geo = ThreeR.staticGeo(mb), mesh = new THREE.Mesh(geo, ThreeR.mats.world); mesh.castShadow = true; mesh.customDepthMaterial = ThreeR.mats.world.userData.depth; I.hair = mesh; this.attach(I, 'Head', mesh, this.headXf(I)); }
  },
  /* ---------------- roupas e chapéus em arquivo ---------------- */
  fitCache: new Map(),
  /** malha (geometria + material) de um GLB estático, com as transformações dos nós aplicadas */
  staticOf(rec) {
    if (rec.flat) return rec.flat; const T = THREE; rec.gltf.scene.updateMatrixWorld(true); let g = /** @type {any} */ (null), mat = /** @type {any} */ (null);
    rec.gltf.scene.traverse(o => { if (o.isMesh && !g) { g = o.geometry.clone().applyMatrix4(o.matrixWorld); mat = o.material; } });
    if (g) { g.computeBoundingBox(); if (mat) { mat.side = T.FrontSide; } } return (rec.flat = { g, mat });
  },
  /** dados do corpo para encaixe: vértices (espaço do modelo), pesos, caixa abaixo do pescoço e caixa da cabeça */
  bodyInfo(I) {
    if (I.rec.binfo) return I.rec.binfo; const g = I.body.geometry, P = g.attributes.position, R = g.attributes.aReg, n = P.count;
    let neck = 9, top = -9, foot = 9; const hb = { x0: 9, x1: -9, z0: 9, z1: -9, y0: 9, y1: -9 };
    for (let i = 0; i < n; i++) { const y = P.getY(i); top = Math.max(top, y); foot = Math.min(foot, y); if (R && Math.round(R.getX(i)) === 6) { neck = Math.min(neck, y); const x = P.getX(i), z = P.getZ(i); hb.x0 = Math.min(hb.x0, x); hb.x1 = Math.max(hb.x1, x); hb.z0 = Math.min(hb.z0, z); hb.z1 = Math.max(hb.z1, z); hb.y0 = Math.min(hb.y0, y); hb.y1 = Math.max(hb.y1, y); } }
    const bb = { x0: 9, x1: -9, z0: 9, z1: -9 }; for (let i = 0; i < n; i++) { if (P.getY(i) > neck) continue; const x = P.getX(i), z = P.getZ(i); bb.x0 = Math.min(bb.x0, x); bb.x1 = Math.max(bb.x1, x); bb.z0 = Math.min(bb.z0, z); bb.z1 = Math.max(bb.z1, z); }
    /* grade espacial para achar os vértices do corpo mais próximos */
    const C = .04, grid = new Map(), key = (a, b, c) => a + ',' + b + ',' + c; for (let i = 0; i < n; i++) { const k = key(Math.floor(P.getX(i) / C), Math.floor(P.getY(i) / C), Math.floor(P.getZ(i) / C)); let L = grid.get(k); if (!L) grid.set(k, L = []); L.push(i); }
    return (I.rec.binfo = { neck, top, foot, bb, hb, grid, C, key });
  },
  /** encaixa a roupa no corpo (escala por eixo) e copia os pesos dos ossos dos vértices do corpo mais próximos */
  fit(I, rec, hood, long) {
    const T = THREE, RG = this.rigSrc(I, rec), F = RG || this.staticOf(rec); if (!F.g) return null; const B = this.bodyInfo(I), g = F.g.clone(), P = g.attributes.position, ob = F.g.boundingBox;
    const top = hood ? B.top : B.neck, sy = (top - B.foot) / (ob.max.y - ob.min.y), sx = (B.bb.x1 - B.bb.x0) / (ob.max.x - ob.min.x) * 1.02, sz = Math.max(sx * .9, (B.bb.z1 - B.bb.z0) / (ob.max.z - ob.min.z) * 1.04);
    const cx = (ob.max.x + ob.min.x) / 2, cz = (ob.max.z + ob.min.z) / 2, bx = (B.bb.x0 + B.bb.x1) / 2, bz = (B.bb.z0 + B.bb.z1) / 2;
    for (let i = 0; i < P.count; i++) P.setXYZ(i, (P.getX(i) - cx) * sx + bx, (P.getY(i) - ob.min.y) * sy + B.foot, (P.getZ(i) - cz) * sz + bz);
    if (hood) {   /* capuz: a cabeça do personagem é grande (cartoon); aumenta a parte acima do pescoço até cobrir a cabeça */
      const hb = B.hb, hw = Math.max(hb.x1 - hb.x0, hb.z1 - hb.z0); let x0 = 9, x1 = -9, z0 = 9, z1 = -9; for (let i = 0; i < P.count; i++) if (P.getY(i) > B.neck + .03) { const x = P.getX(i), z = P.getZ(i); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const hx = (x0 + x1) / 2, hz = (z0 + z1) / 2, k = x1 > x0 ? Math.max(1.06, hw * 1.2 / Math.max(x1 - x0, z1 - z0)) : 1, cx2 = (hb.x0 + hb.x1) / 2, cz2 = (hb.z0 + hb.z1) / 2, y0 = B.neck - .04;
      if (k > 1.01) for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y <= y0) continue; const f = 1 + (k - 1) * Math.min(1, (y - y0) / .1);
        const r = Math.min(1, (y - y0) / .1); P.setXYZ(i, cx2 + (P.getX(i) - hx) * f, y0 + (y - y0) * f, cz2 + (P.getZ(i) - hz) * f + .01 * r); }   /* centralizado na cabeça (o capuz do Meshy vem torto) */
    }
    g.computeVertexNormals(); g.computeBoundingSphere();
    if (RG) { if (hood) this.hoodHead(I, g, B); if (long) this.noHands(I, g); return { g, mat: F.mat }; }   /* roupa com rig: pesos dela (já trocados para os ossos do corpo) */
    /* pesos por OSSO: cada ponto da roupa segue os 2 segmentos de osso mais próximos (posição de repouso), com regras de região:
       abaixo da cintura só quadril/pernas; mangas (fora do tronco) só ossos do braço do mesmo lado; tronco/capuz só coluna, pescoço,
       cabeça e ombros. Funciona mesmo com a roupa mais larga que o corpo (não depende da superfície do corpo). */
    const sk = I.body.skeleton, bones = sk.bones, nB = bones.length, n = P.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    const bp = bones.map((b, k) => (I.restW[k] || new T.Vector3()).clone());
    const seg = bones.map((b, k) => { const ch = b.children.find(o => o.isBone); const j = ch ? bones.indexOf(/** @type {any} */ (ch)) : -1; return [bp[k], j >= 0 ? bp[j] : bp[k]]; });
    const cx0 = (B.bb.x0 + B.bb.x1) / 2, nm = bones.map(b => b.name), side = k => /left/i.test(nm[k]) ? 1 : /right/i.test(nm[k]) ? -1 : 0;
    /* lado esquerdo do personagem = +x quando ele olha para +z (Mixamo); confere pela posição dos ossos */
    const lArm = nm.findIndex(x => /leftarm$/i.test(x)), sgnL = lArm >= 0 && bp[lArm].x < cx0 ? -1 : 1;
    const isLeg = k => /upleg|leg|foot|toe/i.test(nm[k]) || /hips$/i.test(nm[k]), isArm = k => /arm|hand/i.test(nm[k]) && !/shoulder/i.test(nm[k]);
    const isTorso = k => !isLeg(k) && !isArm(k) || /hips$/i.test(nm[k]);
    const hipY = I.rest.hip.y - .02, torsoW = Math.abs(I.rest.shR.x - cx0) * .78, v = new T.Vector3(), tmpL = new T.Line3(), q = new T.Vector3();
    for (let i = 0; i < n; i++) {
      v.set(P.getX(i), P.getY(i), P.getZ(i)); const dx = v.x - cx0, sl = Math.abs(dx) > torsoW && v.y > hipY - .05, sd = Math.sign(dx) * sgnL;
      let b1 = -1, d1 = 1e9, b2 = -1, d2 = 1e9;
      for (let k = 0; k < nB; k++) {
        if (v.y < hipY ? !isLeg(k) : sl ? !isArm(k) : isLeg(k) && !/hips$/i.test(nm[k])) continue;
        const s2 = side(k); if (s2 && (v.y < hipY || isArm(k)) && s2 !== sd) continue;   /* perna/braço do mesmo lado (o tronco perto da axila mistura com o braço) */
        tmpL.set(seg[k][0], seg[k][1]); tmpL.closestPointToPoint(v, true, q); const d = q.distanceTo(v) * (/shoulder/i.test(nm[k]) ? 2.2 : 1);   /* clavícula quase não mexe: só pega o que está bem em cima dela */
        if (d < d1) { b2 = b1; d2 = d1; b1 = k; d1 = d; } else if (d < d2) { b2 = k; d2 = d; }
      }
      if (b1 < 0) { si[i * 4] = 0; sw[i * 4] = 1; continue; }
      const w1 = 1 / Math.pow(d1 + .01, 4), w2 = b2 >= 0 ? 1 / Math.pow(d2 + .01, 4) : 0, sum = w1 + w2;
      si[i * 4] = b1; sw[i * 4] = w1 / sum; if (b2 >= 0) { si[i * 4 + 1] = b2; sw[i * 4 + 1] = w2 / sum; }
    }
    g.setAttribute('skinIndex', new T.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new T.BufferAttribute(sw, 4));
    if (hood) this.hoodHead(I, g, B); if (long) this.noHands(I, g); return { g, mat: F.mat };
  },
  /**
   * Roupa que já vem com rig (Meshy/Mixamo/Blender): malha na pose de repouso + pesos dela, com os índices trocados para os
   * ossos do corpo pelo nome (ossos extras do rig da roupa usam o osso-pai). O encaixe no tamanho do corpo é o mesmo das outras.
   */
  rigSrc(I, rec) {
    if (rec.rigSrc !== undefined && rec.rigSrc && rec.rigSrc.body === I.url) return rec.rigSrc;
    let om = /** @type {any} */ (null); rec.gltf.scene.traverse(o => { if (o.isSkinnedMesh && !om) om = o; }); if (!om) { rec.rigSrc = null; return null; }
    const T = THREE, mixO = om.skeleton.bones.some(b => /^mixamorig/i.test(b.name)), mixB = I.body.skeleton.bones.some(b => /^mixamorig/i.test(b.name));
    const idx = new Map(I.body.skeleton.bones.map((b, k) => [boneCanon(b.name, mixB).toLowerCase(), k]));
    const map = om.skeleton.bones.map(b => { for (let o = b; o && o.isBone; o = o.parent) { const k = idx.get(boneCanon(o.name, mixO).toLowerCase()); if (k !== undefined) return k; } return 0; });
    if (new Set(map).size < 8) { rec.rigSrc = null; return null; }
    rec.gltf.scene.updateMatrixWorld(true); const g = om.geometry.clone(); g.applyMatrix4(om.bindMatrix); g.deleteAttribute('tangent'); g.computeBoundingBox();
    const SI = g.attributes.skinIndex, si = new Uint16Array(SI.count * 4); for (let i = 0; i < SI.count; i++) for (let c = 0; c < 4; c++) si[i * 4 + c] = map[SI.getComponent(i, c)];
    g.setAttribute('skinIndex', new T.BufferAttribute(si, 4)); const mat = om.material; if (mat) mat.side = T.FrontSide;
    return (rec.rigSrc = { g, mat, body: I.url });
  },
  /** roupa com rig gerada como personagem (Meshy cria "luvas" no lugar das mãos): tira os triângulos presos às mãos, aparecem as mãos do corpo */
  noHands(I, g) {
    /* alinha cada manga com o braço do personagem: gira os pontos presos ao braço em volta do ombro (do eixo da manga para o eixo
       ombro→pulso do corpo) e encurta/estica para a barra terminar no pulso. A mão do corpo aparece logo depois da barra. */
    const T = THREE, bones = I.body.skeleton.bones, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    const pos = k => (I.restW[k] || new T.Vector3()).clone(), v = new T.Vector3(), q0 = new T.Quaternion();
    for (const sd of ['Left', 'Right']) {
      const fi = re => bones.findIndex(b => re.test(b.name)), a = fi(new RegExp(sd + 'arm$', 'i')), f = fi(new RegExp(sd + 'forearm$', 'i')), h = fi(new RegExp(sd + 'hand$', 'i')); if (a < 0 || h < 0) continue;
      const side = new Set([a, f, h]), S = pos(a), W = pos(h), armDir = W.clone().sub(S), L = armDir.length(); armDir.normalize();
      const wArm = i => { let w = 0; for (let c = 0; c < 4; c++) if (side.has(SI.getComponent(i, c))) w += SW.getComponent(i, c); return w; };
      const list = []; let maxD = 0; for (let i = 0; i < P.count; i++) { const w = wArm(i); if (w < .05) continue; v.fromBufferAttribute(P, i); const d = v.distanceTo(S); list.push([i, w, d]); if (w > .9) maxD = Math.max(maxD, d); }
      if (!list.length || maxD < .05) continue;
      const tip = new T.Vector3(); let n = 0; for (const [i, w, d] of list) if (w > .9 && d > maxD * .75) { v.fromBufferAttribute(P, i); tip.add(v); n++; } if (!n) continue;
      const sleeveDir = tip.multiplyScalar(1 / n).sub(S).normalize(), q = new T.Quaternion().setFromUnitVectors(sleeveDir, armDir);
      for (const [i, w] of list) { v.fromBufferAttribute(P, i).sub(S).applyQuaternion(q0.identity().slerp(q, Math.min(1, w))).add(S); P.setXYZ(i, v.x, v.y, v.z); }
      /* comprimento: a barra termina no pulso */
      let maxT = 0; for (const [i, w] of list) { if (w < .5) continue; v.fromBufferAttribute(P, i); maxT = Math.max(maxT, v.clone().sub(S).dot(armDir)); }
      if (maxT > .05) { const k = (L + .005) / maxT; for (const [i, w] of list) { v.fromBufferAttribute(P, i); const t = v.clone().sub(S).dot(armDir); if (t > 0) { v.addScaledVector(armDir, (t * k - t) * Math.min(1, w)); P.setXYZ(i, v.x, v.y, v.z); } } }
    }
    P.needsUpdate = true; g.computeVertexNormals();
  },
  /** capuz: tudo acima do pescoço segue o osso da cabeça (com transição suave no pescoço), senão a cabeça sai do capuz ao mirar */
  hoodHead(I, g, B) {
    const bones = I.body.skeleton.bones, h = bones.findIndex(b => /head$/i.test(b.name) && !/top/i.test(b.name)); if (h < 0) return;
    const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, y0 = B.neck - .03, y1 = B.neck + .05;
    for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y <= y0) continue; const f = Math.min(1, (y - y0) / (y1 - y0));
      const w = [0, 1, 2, 3].map(c => SW.getComponent(i, c) * (1 - f)); let slot = 3, mn = 9; for (let c = 0; c < 4; c++) if (SI.getComponent(i, c) === h) { slot = c; mn = -1; break; } else if (w[c] < mn) { mn = w[c]; slot = c; }
      for (let c = 0; c < 4; c++) SW.setComponent(i, c, c === slot ? (SI.getComponent(i, c) === h ? w[c] : 0) + f : w[c]); SI.setComponent(i, slot, h);
      let sum = 0; for (let c = 0; c < 4; c++) sum += SW.getComponent(i, c); for (let c = 0; c < 4; c++) SW.setComponent(i, c, SW.getComponent(i, c) / (sum || 1)); }
    SW.needsUpdate = SI.needsUpdate = true;
  },
  /** veste a roupa (id) no personagem: malha com os mesmos ossos do corpo; a pele por baixo some */
  dress(I, id) {
    if (I.outId === id || !I.body) return;
    const setHide = v => { for (const m of I.mats) m.userData.U.uHide.value = v && OUTFIT.long[id] ? 2 : v; };
    if (I.out) { I.out.parent && I.out.parent.remove(I.out); I.out = null; setHide(0); }
    if (!id) { I.outId = id; return; }
    const rec = CharGLB.load('modelos/roupa_' + id + '.glb'); if (!rec.gltf) return;   /* ainda carregando: tenta no próximo quadro */
    I.outId = id; const key = id + '|' + I.url; let F = this.fitCache.get(key); if (F === undefined) { F = this.fit(I, rec, !!OUTFIT.hood[id], !!OUTFIT.long[id]); this.fitCache.set(key, F); } if (!F) return;
    const m = new THREE.SkinnedMesh(F.g, F.mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    I.body.parent.add(m); m.bind(I.body.skeleton, I.body.bindMatrix); I.out = m; setHide(1);
  },
  /** chapéu em arquivo preso ao osso da cabeça, do tamanho da cabeça do modelo */
  hatG(I, id) {
    if (I.hatId === id || !I.body) return;
    if (I.hat3) { I.hat3.parent && I.hat3.parent.remove(I.hat3); I.hat3 = null; }
    if (!id) { I.hatId = id; return; }
    if (id.startsWith('code:')) { I.hatId = id; this.hatCode(I, id.slice(5)); return; }
    const rec = CharGLB.load('modelos/chapeu_' + id + '.glb'); if (!rec.gltf) return; I.hatId = id;
    const T = THREE, F = this.staticOf(rec); if (!F.g) return; const B = this.bodyInfo(I), hb = B.hb, ob = F.g.boundingBox, fit = HAT_FIT[id] || { w: 1.5, d: .3 };
    /* o Meshy deixa a frente do chapéu em −x: gira para a frente do corpo (+z) */
    const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 2), hw = hb.x1 - hb.x0, hh = hb.y1 - hb.y0, s = hw * fit.w / (ob.max.z - ob.min.z);
    const c = new T.Vector3((ob.max.x + ob.min.x) / 2, ob.min.y, (ob.max.z + ob.min.z) / 2).multiplyScalar(s).applyQuaternion(q);
    const pos = new T.Vector3((hb.x0 + hb.x1) / 2, hb.y1 - hh * fit.d, (hb.z0 + hb.z1) / 2).sub(c);
    const m = new T.Mesh(F.g, F.mat); m.castShadow = true; this.attach(I, 'Head', m, new T.Matrix4().compose(pos, q, new T.Vector3(s, s, s))); I.hat3 = m;
  },
  /** chapéus que ainda não têm arquivo (bandana, panela, Noel...): o desenho de código, ajustado à cabeça do modelo novo */
  hatCode(I, hat) {
    const T = THREE, mb = new MB(1 << 13); drawHat(mb, hat); if (!mb.ni) return; const geo = ThreeR.staticGeo(mb); geo.computeBoundingBox();
    const B = this.bodyInfo(I), hb = B.hb, ob = geo.boundingBox, hw = hb.x1 - hb.x0, hh = hb.y1 - hb.y0, s = hw * 1.05 / Math.max(.05, ob.max.x - ob.min.x) * 1.35;
    const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI), c = new T.Vector3((ob.max.x + ob.min.x) / 2, ob.min.y, (ob.max.z + ob.min.z) / 2).multiplyScalar(s).applyQuaternion(q);
    const pos = new T.Vector3((hb.x0 + hb.x1) / 2, hb.y1 - hh * .28, (hb.z0 + hb.z1) / 2).sub(c);
    const m = new T.Mesh(geo, ThreeR.mats.world); m.castShadow = true; m.customDepthMaterial = ThreeR.mats.world.userData.depth; this.attach(I, 'Head', m, new T.Matrix4().compose(pos, q, new T.Vector3(s, s, s))); I.hat3 = m;
  },
  /* ---- skins das armas em GLB: o material do Meshy recolorido no shader (listras, gelo, ouro, neon, brasa, camuflado, algodão-doce) ---- */
  wmats: new Map(),
  wmat(geo, sk) {
    const base = geo.userData.mat; if (!base || !sk || sk === 'padrao' || !WSKINS[sk]) return base; const key = geo.uuid + '|' + sk; let m = this.wmats.get(key); if (m) return m;
    const ids = { natal: 1, neve: 2, ouro: 3, neon: 4, brasa: 5, camo: 6, algodao: 7 }; m = base.clone(); m.userData = { sk };
    if (sk === 'ouro') { m.metalness = .85; m.roughness = .28; } if (sk === 'neve') { m.roughness = .25; } if (sk === 'neon' || sk === 'brasa') m.emissive = new THREE.Color(1, 1, 1);
    m.onBeforeCompile = sh => {
      sh.uniforms.uWs = { value: ids[sk] || 0 };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWp; uniform float uWs;
float wh(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float wn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(mix(mix(wh(i), wh(i + vec3(1,0,0)), f.x), mix(wh(i + vec3(0,1,0)), wh(i + vec3(1,1,0)), f.x), f.y), mix(mix(wh(i + vec3(0,0,1)), wh(i + vec3(1,0,1)), f.x), mix(wh(i + vec3(0,1,1)), wh(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 wGlow = vec3(0.);`).replace('#include <map_fragment>', `#include <map_fragment>
{ float l = dot(diffuseColor.rgb, vec3(.299, .587, .114)), k = clamp(l * 1.8, .35, 1.25); vec3 c = diffuseColor.rgb; int s = int(uWs + .5);
  if (s == 1) c = mix(vec3(.8, .05, .08), vec3(.97, .95, .93), step(.5, fract((vWp.x + vWp.y + vWp.z) * 9.))) * k;
  else if (s == 2) c = mix(vec3(.45, .68, .95), vec3(.96, .99, 1.), smoothstep(.15, .7, l)) * (.85 + .25 * wn(vWp * 40.));
  else if (s == 3) c = vec3(1., .74, .25) * (.4 + .9 * l);
  else if (s == 4) { c = vec3(.05, .05, .07) * k; float g = step(.9, fract(vWp.z * 7.)); wGlow = mix(vec3(0., 1., .65), vec3(1., .2, .8), step(.5, fract(vWp.z * 3.5))) * g; c += wGlow * .4; }
  else if (s == 5) { float n = wn(vWp * 18.); c = vec3(.07, .06, .06) * k; float cr = smoothstep(.62, .72, n) - smoothstep(.72, .8, n); wGlow = vec3(1., .38, .04) * cr * 1.6; c += wGlow * .5; }
  else if (s == 6) { float n = wn(vWp * 9.); c = (n < .38 ? vec3(.32, .4, .16) : n < .62 ? vec3(.55, .48, .22) : vec3(.2, .16, .08)) * k; }
  else if (s == 7) c = mix(vec3(1., .62, .8), vec3(.6, .82, 1.), step(.5, wn(vWp * 7.))) * k;
  diffuseColor.rgb = c; }`).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = wGlow;');
    };
    m.customProgramCacheKey = () => 'bombaki-wskin-' + sk; this.wmats.set(key, m); return m;
  },
  /** transformação (no espaço do modelo) que encaixa a cabeça de código no crânio do modelo */
  headXf(I) { const r = I.rest, h = r.top.y - r.head.y, s = h / (2 * .235) * 1.04, T = THREE; return new T.Matrix4().compose(new T.Vector3(r.head.x, r.head.y + h * .5, r.head.z + .01), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI), new T.Vector3(s, s, s)); },
  /** prende um objeto a um osso mantendo o encaixe medido na pose de repouso */
  attach(I, bone, obj, xf) { const B = I.bones[bone], W = I.bindW[bone]; if (!B || !W) { I.root.add(obj); obj.matrixAutoUpdate = false; obj.matrix.copy(xf); return; } obj.matrixAutoUpdate = false; obj.matrix.copy(new THREE.Matrix4().copy(W).invert().multiply(xf)); B.add(obj); },
  /* ---- IK ---- */
  aim(bone, child, target) {
    const V = this.tmp(), bp = bone.getWorldPosition(V.a), cur = child.getWorldPosition(V.b).sub(bp).normalize(), want = V.c.copy(target).sub(bp).normalize();
    const dq = V.q.setFromUnitVectors(cur, want), wq = bone.getWorldQuaternion(V.q2), pq = bone.parent.getWorldQuaternion(V.q3);
    bone.quaternion.copy(pq.invert().multiply(dq.multiply(wq))); bone.updateMatrixWorld(true);
  },
  limb(I, up, mid, end, target, pole) {
    const B = I.bones, U = B[up], M = B[mid], E = B[end]; if (!U || !M || !E) return; const V = this.tmp();
    const a = U.getWorldPosition(new THREE.Vector3()), m = M.getWorldPosition(new THREE.Vector3()), e = E.getWorldPosition(new THREE.Vector3()), L1 = a.distanceTo(m), L2 = m.distanceTo(e);
    const ab = V.d.copy(target).sub(a), d = Math.min(ab.length(), (L1 + L2) * .999), u = ab.normalize(), ca = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
    const p = V.e.copy(pole).addScaledVector(u, -pole.dot(u)); if (p.lengthSq() < 1e-6) p.set(0, -1, 0); p.normalize();
    const el = a.clone().addScaledVector(u, L1 * ca).addScaledVector(p, L1 * sa);
    this.aim(U, M, el); this.aim(M, E, target);
  },
  /** ponto/direção do espaço do personagem do jogo (frente −z) → mundo */
  W(I, x, y, z) { return I.root.localToWorld(new THREE.Vector3(-x, y, -z)); },
  D(I, x, y, z) { return new THREE.Vector3(-x, y, -z).applyQuaternion(I.root.quaternion); },
  rotW(bone, axis, ang) { if (!bone || !ang) return; const V = this.tmp(), q = V.q.setFromAxisAngle(axis, ang), wq = bone.getWorldQuaternion(V.q2), pq = bone.parent.getWorldQuaternion(V.q3); bone.quaternion.copy(pq.invert().multiply(q.multiply(wq))); bone.updateMatrixWorld(true); },
  update(I, c, opt, D) {
    const T = THREE, t = (opt && opt.time) || 0, dt = I.t0 === undefined ? 0 : clamp(t - I.t0, 0, .1); I.t0 = t;
    this.look(I, c); this.dress(I, I.outWant || ''); this.hatG(I, I.hatWant || ''); const S = I.S || {}, bulk = BODY3D.tex ? 1 : S.bulk || 1, dead = c.dead || 0;
    /* raiz: posição, direção e queda ao morrer */
    I.root.position.set(c.x, c.y, c.z); I.root.rotation.set(0, c.yaw + Math.PI, 0, 'YXZ'); I.root.scale.set(bulk, 1, bulk);
    if (c._q) I.root.quaternion.copy(c._q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.yaw + Math.PI));   /* inclinação vinda de fora (paraquedas) */
    /* velocidade no espaço do personagem (frente/direita) para escolher andar, de costas ou de lado */
    if (I.px !== undefined && dt > 0) { const dx = c.x - I.px, dz = c.z - I.pz, f = this.D(I, 0, 0, -1), r = this.D(I, 1, 0, 0), k = Math.min(1, dt * 10), lim = v => clamp(v / dt, -12, 12);
      I.vf += (lim(dx * f.x + dz * f.z) - I.vf) * k; I.vr += (lim(dx * r.x + dz * r.z) - I.vr) * k; }
    I.px = c.x; I.pz = c.z; if ((c.fire || 0) > .5 && (I.fireT === undefined || t - I.fireT > .3)) I.fireT = t; if ((c.hit || 0) > .8 && (I.hitT === undefined || t - I.hitT > .5)) I.hitT = t; I.tNow = t;
    let E = !dead && c.emote && typeof emoteAnim === 'function' ? emoteAnim(c.emote.id, c.emote.t) : null;
    const emK = E && c.emote && I.acts['em_' + c.emote.id] ? 'em_' + c.emote.id : '';
    if (emK) E = null;   /* emote com animação própria no modelo: sem pose por código */
    const deathClip = dead && (I.acts.death || I.acts.death2 || I.acts.death3);
    if (dead && !deathClip) { const dv = c.dv | 0, f = deathBounce(Math.min(1, dead * 1.4)); I.root.rotateX(dv === 1 ? f * 1.45 : -f * 1.45); I.root.position.y += .12 * f; }
    if (E) { I.root.position.y += E.by || 0; I.root.rotateY(E.ry || 0); }
    /* locomoção: animações do modelo (andar/correr); parado = pose de repouso */
    /* estado → animação do arquivo (as que não existirem viram pose por código) */
    const spd = dead ? 0 : (c.spd || 0), crK = Math.max(c.cr || 0, E ? E.cr || 0 : 0) > .5, airK = c.air && !c.chute && !dead;
    const has = k => !!I.acts[k], armed = !!c.wid && !dead && !c.emote, mv = spd > .6, side = Math.abs(I.vr) > Math.abs(I.vf) * 1.2, backK = I.vf < -.3 && !side;
    let want = 'idle';
    if (mv) { if (side && has('strafeL') && has('strafeR')) want = I.vr > 0 ? 'strafeR' : 'strafeL'; else if (backK && has('back')) want = 'back'; else want = spd > 4.5 ? (armed && has('runW') ? 'runW' : 'run') : armed && has('walkW') ? 'walkW' : 'walk'; }
    else if (armed) want = has('aimW') && t - (I.fireT === undefined ? -9 : I.fireT) < 1.5 ? 'aimW' : has('idleW') ? 'idleW' : 'idle';
    if (emK) want = emK;
    if (dead && deathClip) { const ds = ['death', 'death2', 'death3'].filter(has); want = ds[(c.dv | 0) % ds.length]; }
    else if (airK && I.acts.jump) want = 'jump';
    else if (crK && I.acts.crouch) want = !mv ? 'crouch' : side && has('crouchSide') ? 'crouchSide' : backK && has('crouchBack') ? 'crouchBack' : has('crouchWalk') ? 'crouchWalk' : 'crouch';
    if (I.curK !== want) { if (want === 'idle' || !I.acts[want]) { if (I.cur) I.cur.fadeOut(.2); I.cur = null; I.curK = want; } else this.playK(I, want); }
    /* ritmo do passo acompanha a velocidade (de lado agachado para a direita = clipe da esquerda ao contrário) */
    const ts = /** @type {Record<string, number>} */ ({ walk: 2.6, walkW: 2.2, run: 6, runW: 6, back: 1.6, strafeL: 1.2, strafeR: 1.2, crouchWalk: 1.8, crouchBack: 1.6, crouchSide: 1.4 })[want];
    if (I.cur && ts) I.cur.timeScale = clamp(spd / ts, .6, 1.6) * (want === 'crouchSide' && I.vr > 0 ? -1 : 1);
    if (I.cur && want.startsWith('death')) I.cur.timeScale = 1.5;   /* queda mais seca */
    I.clipCrouch = want.startsWith('crouch'); I.clipJump = want === 'jump'; I.clipDead = want.startsWith('death');
    /* sem animação tocando: volta à pose de repouso (as posições também, senão o agachar acumularia) */
    if (!I.cur) { for (const k in I.bones) { const r = I.restQ[k]; if (r) I.bones[k].quaternion.slerp(r, I.curK === 'idle' ? Math.min(1, dt * 10) : 1); const rp = I.restP[k]; if (rp) I.bones[k].position.copy(rp); } }
    else if (I.bones.Hips && I.restP.Hips && !I.cur.getClip().tracks.some(t => /Hips\.position/.test(t.name))) I.bones.Hips.position.copy(I.restP.Hips);
    I.mixer.update(dt);
    const emW = k => { const a = I.acts[k]; return a && a.isRunning() ? a.getEffectiveWeight() : 0; }, emOn = /agente_/.test(I.url || '') && ((I.curK && I.curK.startsWith('em_')) || Object.keys(I.acts).some(k => k.startsWith('em_') && emW(k) > .01));
    if (emOn) {   /* emotes (e a saída deles): menos cabeça baixa e tronco curvado (ficava feio com cabeça/chapéu grandes) */
      const sad = I.curK === 'em_derrota' || emW('em_derrota') > .01; for (const [n, k] of /** @type {[string, number][]} */ ([['neck', sad ? .8 : .6], ['Head', sad ? .8 : .6], ['Spine', sad ? .6 : .3], ['Spine01', sad ? .5 : .2]])) { const b = I.bones[n], r = I.restQ[n]; if (b && r) b.quaternion.slerp(r, k); }
    }
    I.root.updateMatrixWorld(true);
    const B = I.bones, up = this.D(I, 0, 1, 0), right = this.D(I, 1, 0, 0), fwd = this.D(I, 0, 0, -1);
    /* agachar / pulo: abaixa o quadril e dobra os joelhos mantendo os pés no chão */
    const cr = I.clipCrouch ? 0 : Math.max(c.cr || 0, E ? E.cr || 0 : 0), air = c.air && !c.chute && !dead && !I.clipJump;
    if ((cr > .02 || air) && B.Hips && B.LeftFoot && B.RightFoot) {
      const fl = B.LeftFoot.getWorldPosition(new T.Vector3()), fr = B.RightFoot.getWorldPosition(new T.Vector3()), hp = B.Hips.getWorldPosition(new T.Vector3());
      hp.addScaledVector(up, -.34 * cr); B.Hips.position.copy(B.Hips.parent.worldToLocal(hp)); B.Hips.updateMatrixWorld(true);
      if (air) { fl.addScaledVector(up, .22); fr.addScaledVector(up, .16); }
      const pole = fwd.clone(); this.limb(I, 'LeftUpLeg', 'LeftLeg', 'LeftFoot', fl, pole); this.limb(I, 'RightUpLeg', 'RightLeg', 'RightFoot', fr, pole);
      if (B.Spine02) this.rotW(B.Spine02, right, -cr * .3);
    }
    /* tronco e cabeça acompanham a mira */
    const pit = clamp(c.pitch || 0, -1.2, 1.2) * (dead ? 0 : 1), flinch = (c.hit || 0) * .25;
    if (B.Spine) this.rotW(B.Spine, right, -pit * .25 - flinch); if (B.Head) this.rotW(B.Head, right, -pit * .45 - (E && E.head ? E.head[0] : 0));
    /* braços */
    const sh = (n) => B[n] ? B[n].getWorldPosition(new T.Vector3()) : null, shY = (I.rest.shR.y - c.y * 0) , hasW = !!c.wid && !dead && !c.emote;
    const armPole = sd => this.D(I, sd * .55, -1, .45);
    if (E && E.arms) {
      for (const [i, sd, A] of /** @type {[number, number, string][]} */ ([[0, 1, 'Right'], [1, -1, 'Left']])) { const a = E.arms[i], s0 = sh(A + 'Arm'); if (!s0) continue; const dir = new T.Vector3(0, -1, 0).applyAxisAngle(new T.Vector3(0, 0, 1), sd * a[1]).applyAxisAngle(new T.Vector3(1, 0, 0), a[0]); const d = this.D(I, dir.x, dir.y, dir.z); this.limb(I, A + 'Arm', A + 'ForeArm', A + 'Hand', s0.addScaledVector(d, .52), armPole(sd)); }
    } else if (c.chute) {
      for (const [sd, A] of /** @type {[number, string][]} */ ([[1, 'Right'], [-1, 'Left']])) { const s0 = sh(A + 'Arm'); if (!s0) continue; const tgt = c.chute === 'open' ? this.W(I, sd * .18, I.rest.shR.y + .5, -.02) : this.W(I, sd * .62, I.rest.shR.y + .05, -.1); this.limb(I, A + 'Arm', A + 'ForeArm', A + 'Hand', tgt, armPole(sd)); }
    } else if (hasW) {
      if (!this.overlay(I, c)) this.hold(I, c, (pit - (c.rel ? .5 : 0)) * .9, spd, t);
    } else if (!I.cur) { this.rest(I, 'Right', 1, spd, t); this.rest(I, 'Left', -1, spd, t); }
    if (!hasW) this.weapon(I, null);
    /* mandioca nas costas de quem carrega */
    if (!hasW && I.ovK) this.overlay(I, { wid: '' });
    if (hasW && !I.clipDead && I.ovK !== 'throw') { const knife = c.wid === 'faca'; this.fingers(I, 'Right', knife ? 1.25 : 1.05); if (c.wid !== 'faca' && c.wid !== 'batata' && !I.ovK) this.fingers(I, 'Left', .95); }
    this.bomb(I, !!c.bomb && !dead);
    return true;
  },
  /** fecha os dedos em volta do cabo (rig com dedos): cada falange gira na direção da palma */
  fingers(I, sd, amt) {
    const n0 = I.palm && I.palm[sd], B = I.bones, H = B[sd + 'Hand']; if (!n0 || !H) return; const T = THREE, n = n0.clone().applyQuaternion(H.getWorldQuaternion(new T.Quaternion()));
    for (const f of ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']) for (let k = 1; k <= 3; k++) {
      const b = B[sd + 'Hand' + f + k], nx = B[sd + 'Hand' + f + (k + 1)]; if (!b || !nx) continue;
      const d = nx.getWorldPosition(new T.Vector3()).sub(b.getWorldPosition(new T.Vector3())).normalize(), ax = new T.Vector3().crossVectors(d, n); if (ax.lengthSq() < 1e-6) continue;
      const a = (f === 'Thumb' ? .35 : f === 'Index' && sd === 'Right' ? .7 : 1) * amt * (k === 1 ? .8 : 1); this.rotW(b, ax.normalize(), a);
    }
  },
  /**
   * Camada de cima por cima da locomoção: arremesso do ovo (c.thr = tempo desde o arremesso) e recarga (c.rel = progresso 0..1,
   * a animação acompanha o progresso real). Na recarga a arma vai grudada na mão direita com o encaixe do último quadro.
   */
  overlay(I, c) {
    const U = I.upActs || {}, t = I.tNow || 0, thr = c.thr !== undefined && U.throw ? 'throw' : '';
    const rel = !thr && c.rel > 0 && c.rel < 1 && U.reload && !['faca', 'batata', 'estilingue', 'mandioca', ''].includes(c.wid || '') ? 'reload' : '';
    const kn = !thr && !rel && c.wid === 'faca' && U.knife && I.fireT !== undefined && t - I.fireT < .5 ? 'knife' : '';
    const hit = !thr && !rel && !kn && U.hit && c.wid && I.hitT !== undefined && t - I.hitT < .6 ? 'hit' : '';
    const k = thr || rel || kn || hit; for (const n in U) if (n !== k && U[n].isRunning()) U[n].stop();
    I.ovK = k; if (!k) { I.wRel = null; return false; }
    const a = U[k]; if (!a.isRunning()) { a.reset(); a.play(); }
    /* tempo da animação = progresso real da ação (facada: só o golpe, do meio do clipe; dano: o tranco inicial) */
    const f = k === 'throw' ? c.thr / .8 : k === 'reload' ? c.rel : k === 'knife' ? .15 + (t - I.fireT) / .5 * .6 : (t - I.hitT) / .6 * .55;
    a.time = clamp(f, 0, .999) * a.getClip().duration; I.up.update(0); I.root.updateMatrixWorld(true);
    if (k === 'throw') { this.weapon(I, null); return true; }
    const w = this.weapon(I, c), H = I.bones.RightHand; if (!w || !H) return true; const T = THREE;
    if (!I.wRel) { w.updateMatrixWorld(true); I.wRel = new T.Matrix4().copy(I.wHand || H.matrixWorld).invert().multiply(w.matrixWorld); }
    new T.Matrix4().copy(I.root.matrixWorld).invert().multiply(H.matrixWorld).multiply(I.wRel).decompose(w.position, w.quaternion, w.scale); return true;
  },
  rest(I, A, sd, spd, t) { const s0 = I.bones[A + 'Arm']; if (!s0) return; const p = s0.getWorldPosition(new THREE.Vector3()), sw = Math.sin(t * 2) * .02; this.limb(I, A + 'Arm', A + 'ForeArm', A + 'Hand', p.add(this.D(I, sd * .1, -.55, -.06 + sw)), this.D(I, sd * .3, -1, .6)); },
  playK(I, k) { const a = I.acts[k]; I.curK = k; if (!a) return; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); if (I.cur && I.cur !== a) I.cur.crossFadeTo(a, .22, false); else a.fadeIn(.2); I.cur = a; },
  /** geometria da arma do jogo (com a skin) + tamanho medido (onde fica a coronha) */
  /** arma do modelo GLB (cano em −z como as armas de código, cabo na âncora de empunhadura do jogo) ou null se ainda não carregou */
  wglb(wid) {
    const D = WEAPON_GLB[wid]; if (!D) return null; const key = 'glb|' + wid; let F = CharGLB.wcache.get(key); if (F !== undefined) return F;
    const rec = CharGLB.load('modelos/arma_' + D.f + '.glb'); if (!rec.gltf) return null;
    const T = THREE, S = this.staticOf(rec); if (!S.g) { CharGLB.wcache.set(key, null); return null; }
    const A = WANCH[wid] || WANCH.galho, len = D.len || A.len || .9, g = S.g.clone(), ob = S.g.boundingBox, s = len / Math.max(ob.max.x - ob.min.x, ob.max.y - ob.min.y);
    /* Meshy: cano em −x → jogo: cano em −z (o estilingue fica de frente, sem girar) */
    const M = new T.Matrix4().makeScale(s, s, s); if (!D.flat) M.premultiply(new T.Matrix4().makeRotationY(-Math.PI / 2));
    const P = v => new T.Vector3(v[0], v[1], 0).applyMatrix4(M), grip = P(D.grip), fore = P(D.fore || D.grip), off = new T.Vector3(A.grip[0], A.grip[1], A.grip[2]).sub(grip);
    g.applyMatrix4(M.premultiply(new T.Matrix4().makeTranslation(off.x, off.y, off.z))); g.computeBoundingBox(); g.computeBoundingSphere();
    const fw = fore.add(off), bx = g.boundingBox; g.userData.box = bx.clone(); g.userData.anch = { grip: A.grip, fore: [fw.x, fw.y, fw.z], muzzle: [0, (bx.min.y + bx.max.y) / 2 + (bx.max.y - bx.min.y) * .2, bx.min.z] }; g.userData.mat = S.mat;
    CharGLB.wcache.set(key, g); return g;
  },
  wgeo(c) {
    const gl = this.wglb(c.wid); if (gl) return gl;
    const key = c.wid + '|' + (c.wsk || ''); let geo = CharGLB.wcache.get(key);
    if (geo === undefined) { const mb = new MB(1 << 12); drawWeapon(mb, c.wid, { sk: c.wsk }); geo = mb.ni ? ThreeR.staticGeo(mb) : null; if (geo) { geo.computeBoundingBox(); geo.userData.box = geo.boundingBox.clone(); } CharGLB.wcache.set(key, geo); }
    return geo;
  },
  weapon(I, c) {
    const gl = c && c.wid && this.wglb(c.wid), key = c && c.wid ? c.wid + '|' + (gl ? 'glb|' : '') + (c.wsk || '') : ''; if (key === I.wkey) return I.wobj; I.wkey = key;
    if (I.wobj) { I.wobj.parent && I.wobj.parent.remove(I.wobj); I.wobj = null; }
    const geo = key ? this.wgeo(c) : null; if (geo) { const mat = (geo.userData.mat && this.wmat(geo, c.wsk)) || ThreeR.mats.world, m = new THREE.Mesh(geo, mat); m.castShadow = true; if (!geo.userData.mat) m.customDepthMaterial = ThreeR.mats.world.userData.depth; I.root.add(m); I.wobj = m; }
    return I.wobj;
  },
  /**
   * Empunhadura por tipo de arma (tudo no espaço do modelo: frente +z, direita −x):
   *  rifles (galho, porteira, vassoura, colher): coronha no ombro direito, gira em torno do ombro ao mirar;
   *  estilingue: braço esquerdo esticado com a forquilha, mão direita puxando o elástico perto do rosto;
   *  facão: mão direita baixa à frente; batata: mão direita erguida; mandioca: nas duas mãos.
   */
  hold(I, c, p, spd, t) {
    const T = THREE, B = I.bones, w = this.weapon(I, c); if (!w) return; const geo = w.geometry, box = geo.userData.box || new T.Box3(new T.Vector3(-.05, -.1, -.5), new T.Vector3(.05, .1, .4));
    const b = I.root.scale.x || 1, L = v => I.root.worldToLocal(v), wpos = n => B[n].getWorldPosition(new T.Vector3());
    const qw = new T.Quaternion().setFromEuler(new T.Euler(p, Math.PI, 0, 'YXZ')), R = (x, y, z) => new T.Vector3(x, y, z).applyQuaternion(qw);
    const shR = L(wpos('RightArm')), shL = L(wpos('LeftArm')), head = L(wpos('Head')), kick = (c.fire || 0) * .05, wid = c.wid;
    const fwd = R(0, 0, -1);   /* direção do cano no espaço do modelo */
    let origin, hands;
    if (wid === 'estilingue') {
      /* forquilha à frente na linha dos olhos, braço esquerdo esticado; mão direita puxa o elástico até perto do rosto */
      const frame = shL.clone().lerp(shR, .35).add(new T.Vector3(0, .1, 0)).addScaledVector(fwd, .5);
      origin = frame.clone().sub(R(0, .03, .02)); const pull = c.fire ? .12 : .32;
      hands = { L: origin.clone().add(R(0, -.1, 0)), R: origin.clone().add(R(0, .03, pull)) };
    } else if (wid === 'faca') {
      origin = new T.Vector3(shR.x + .02, shR.y - .42, shR.z + .3 - (c.fire || 0) * -.25); w.position.copy(origin);
      if (B.RightHand) (I.wHand || (I.wHand = new T.Matrix4())).copy(B.RightHand.matrixWorld); w.quaternion.copy(new T.Quaternion().setFromEuler(new T.Euler(p * .5 - .35 - (c.fire || 0) * 1.0, Math.PI, 0, 'YXZ')));
      w.scale.set(1 / b, 1, 1 / b); this.limb(I, 'RightArm', 'RightForeArm', 'RightHand', I.root.localToWorld(origin.clone()), this.D(I, .55, -1, .45)); this.rest(I, 'Left', -1, spd, t); if (B.RightHand) (I.wHand || (I.wHand = new T.Matrix4())).copy(B.RightHand.matrixWorld); return;
    } else if (wid === 'batata') {
      origin = new T.Vector3(shR.x - .08, shR.y + .05, shR.z + .08); hands = { R: origin.clone() };
    } else if (wid === 'mandioca') {
      origin = new T.Vector3((shR.x + shL.x) / 2, shR.y - .45, shR.z + .3); hands = { R: origin.clone().add(R(.06, -.04, 0)), L: origin.clone().add(R(-.07, -.04, 0)) };
    } else if (SECONDARIES.includes(wid) || (typeof wBase === 'function' && SECONDARIES.includes(wBase(wid)))) {
      /* pistola: braços esticados à frente, as duas mãos no cabo, arma na linha dos olhos (não encosta no ombro) */
      const mid = shL.clone().lerp(shR, .62), A = geo.userData.anch || WANCH[wid] || WANCH.galho;
      const grip = mid.clone().add(new T.Vector3(0, head.y - .1 - mid.y, 0)).addScaledVector(fwd, .42 - kick * 1.5);
      origin = grip.clone().sub(R(A.grip[0], A.grip[1], A.grip[2]));
      hands = { R: grip.clone(), L: grip.clone().add(R(-.04, -.035, .02)) };
    } else {
      /* rifle no ombro: coronha (fundo da arma) encostada no "bolso" do ombro direito, na altura da bochecha */
      const pocket = shR.clone().add(new T.Vector3(.075, -.045, .06)); pocket.y = Math.min(pocket.y, head.y - .05);
      const butt = box.max.z * .92, by = (box.min.y + box.max.y) * .5;
      origin = pocket.clone().sub(R(0, by, butt)).addScaledVector(fwd, -kick);
      const A = geo.userData.anch || WANCH[wid] || WANCH.galho; hands = { R: origin.clone().add(R(A.grip[0], A.grip[1], A.grip[2])), L: origin.clone().add(R(A.fore[0], A.fore[1], A.fore[2])) };
      if (B.Head) this.rotW(B.Head, this.D(I, 0, 0, -1), -.12);   /* inclina a cabeça na coronha */
    }
    w.position.copy(origin); w.quaternion.copy(qw); w.scale.set(1 / b, 1, 1 / b);
    const W = v => I.root.localToWorld(v.clone());
    if (hands.R) this.limb(I, 'RightArm', 'RightForeArm', 'RightHand', W(hands.R), this.D(I, .7, -1, .3));
    if (hands.L) this.limb(I, 'LeftArm', 'LeftForeArm', 'LeftHand', W(hands.L), this.D(I, -.6, -1, .1)); else this.rest(I, 'Left', -1, spd, t);
    if (B.RightHand) (I.wHand || (I.wHand = new T.Matrix4())).copy(B.RightHand.matrixWorld);   /* encaixe da mão para a recarga */
  },
  bomb(I, on) {
    if (on && !I.bomb) { const cg = CassGLB.get(), mb = new MB(1 << 12); if (!cg) drawCassava(mb, { led: 1, scale: 1 }); if (cg || mb.ni) { const m = cg ? new THREE.Mesh(cg, cg.userData.mat) : new THREE.Mesh(ThreeR.staticGeo(mb), ThreeR.mats.world); const r = I.rest, T = THREE; this.attach(I, 'Spine01', m, new T.Matrix4().compose(new T.Vector3(0, r.hip.y + .3, r.hip.z - .17), new T.Quaternion(), new T.Vector3(1, 1, 1))); I.bomb = m; } }
    if (I.bomb) I.bomb.visible = on;
  }
};
/* liga no desenho do personagem */
(function () {
  const base = drawChar;
  window.drawChar = function (m, c, opt) {
    /* desenhado dentro de uma transformação do construtor (ex.: paraquedas balançando): o modelo 3D usa a mesma posição e inclinação */
    if (c && c.key && !c.x && !c.z && m && m.M && typeof G !== 'undefined' && G.R && m === G.R.dyn && m.o > 0) {
      const T = THREE, M = new T.Matrix4().fromArray(m.M, m.o), p = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3(); M.decompose(p, q, sc);
      const c2 = Object.assign({}, c, { x: p.x, y: p.y, z: p.z, yaw: 0, _q: q }); if (CharGLB.draw(c2, opt)) return;
    }
    if (c && c.key && CharGLB.draw(c, opt)) return; return base(m, c, opt);
  };
  const baseR = ThreeR.render.bind(ThreeR);
  ThreeR.render = function (R, cam, opts) { baseR(R, cam, opts); CharGLB.endFrame(); if (ThreeR._vmW) ThreeR._vmW.visible = false; };
  /** arma em primeira pessoa com o modelo GLB (espaço da câmera, mesma transformação do desenho por código: T·Ry·Rx·Rz) */
  ThreeR.vmGlb = function (geo, pos, rot, sk) {
    const T = THREE, R3 = /** @type {any} */ (ThreeR); if (!R3.vmScene) return; let m = R3._vmW;
    if (!m) { m = R3._vmW = new T.Mesh(geo, geo.userData.mat); m.matrixAutoUpdate = false; m.frustumCulled = false; R3.vmScene.add(m); }
    const mat = Body3D.wmat(geo, sk); if (m.geometry !== geo || m.material !== mat) { m.geometry = geo; m.material = mat; }
    m.matrix.compose(new T.Vector3(pos[0], pos[1], pos[2]), new T.Quaternion().setFromEuler(new T.Euler(rot[0], rot[1], rot[2], 'YXZ')), new T.Vector3(1, 1, 1)); m.matrixWorldNeedsUpdate = true; m.visible = true;
  };
})();
/* =====================================================================
   Ícones 3D dos modelos novos (armas com skin, chapéus, personagens, emotes e rostos)
   Renderizador próprio, fora da cena do jogo. Devolve null enquanto algum arquivo ainda está carregando
   (quem chama tenta de novo depois, sem guardar o ícone vazio).
   ===================================================================== */
const Icon3D = {
  rd: /** @type {any} */ (null), sc: /** @type {any} */ (null), cam: /** @type {any} */ (null),
  on() { return typeof BODY3D !== 'undefined' && BODY3D.tex && typeof THREE !== 'undefined' && !!ThreeR.rd; },
  init() {
    if (this.rd) return true; if (!this.on()) return false; const T = THREE;
    try { this.rd = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return false; }
    this.rd.outputColorSpace = T.SRGBColorSpace; this.rd.toneMapping = ThreeR.rd.toneMapping; this.rd.toneMappingExposure = ThreeR.rd.toneMappingExposure || 1;
    this.sc = new T.Scene(); const h = new T.HemisphereLight(0xfff6e8, 0x6a5a48, 2.1), d = new T.DirectionalLight(0xffffff, 2.4), d2 = new T.DirectionalLight(0xffe6c8, .9);
    d.position.set(2, 3, 4); d2.position.set(-3, 1.5, -2); this.sc.add(h, d, d2); this.cam = new T.PerspectiveCamera(22, 1, .01, 100); return true;
  },
  /** fotografa um objeto: o.w/o.h tamanho, o.ry/o.rx giro, o.pad folga, o.box caixa para enquadrar (espaço do objeto) */
  shot(obj, o) {
    if (!this.init()) return null; const T = THREE, W = o.w || 256, H = o.h || 256, ss = o.ss || 1.5, pv = new T.Group();
    pv.rotation.set(o.rx || 0, o.ry || 0, 0, 'YXZ'); pv.add(obj); this.sc.add(pv); pv.updateMatrixWorld(true);
    const box = o.box ? o.box.clone().applyMatrix4(pv.matrixWorld) : new T.Box3().setFromObject(pv, true);
    this.rd.setPixelRatio(1); this.rd.setSize(Math.round(W * ss), Math.round(H * ss), false);
    const c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3()), asp = W / H, vf = Math.tan(T.MathUtils.degToRad(11));
    this.cam.aspect = asp; this.cam.fov = 22; this.cam.updateProjectionMatrix();
    const dist = Math.max(sz.y / 2 / vf, sz.x / 2 / (vf * asp)) * (o.pad || 1.1) + sz.z / 2; this.cam.position.set(c.x, c.y, c.z + dist); this.cam.lookAt(c);
    this.rd.setClearColor(0, 0); this.rd.render(this.sc, this.cam); this.sc.remove(pv); pv.remove(obj);
    const out = document.createElement('canvas'); out.width = this.rd.domElement.width; out.height = this.rd.domElement.height; const x = out.getContext('2d'); if (x) x.drawImage(this.rd.domElement, 0, 0); return out;
  },
  /** arma (com skin) de lado, cano para a direita */
  weapon(id, sk, o) {
    if (!WEAPON_GLB[id] || !this.on()) return undefined; const g = Body3D.wglb(id); if (!g) return null;
    const m = new THREE.Mesh(g, Body3D.wmat(g, sk)); m.rotation.y = WEAPON_GLB[id].flat ? Math.PI : -Math.PI / 2;   /* estilingue: de frente */ return this.shot(m, Object.assign({ w: 320, h: 180, rx: .12, ry: -.35, pad: 1.05 }, o || {}, { rx: (o && o.rx) || .12, ry: ((o && o.spin) || 0) - .35 }));
  },
  /** chapéu em arquivo (ou undefined se o chapéu não tem modelo) */
  hat(hat, o) {
    const id = HAT_GLB[hat]; if (!id || !this.on()) return undefined; const rec = CharGLB.load('modelos/chapeu_' + id + '.glb'); if (!rec.gltf) return null;
    const F = Body3D.staticOf(rec); if (!F.g) return undefined; const m = new THREE.Mesh(F.g, F.mat); m.rotation.y = Math.PI / 2;
    return this.shot(m, Object.assign({ w: 220, h: 180, rx: .5, ry: -.5, pad: 1.1 }, o || {}));
  },
  /**
   * personagem com o corpo 3D, roupa, chapéu e arma: c = estado como no jogo (skin, farmer, wid, wsk, emote {id,t}).
   * o.face = só o rosto. Devolve undefined se o personagem não usa o corpo 3D.
   */
  char(c, o) {
    if (!this.on()) return undefined;
    const cc = Object.assign({ x: 0, y: 0, z: 0, yaw: Math.PI, pitch: 0, spd: 0, cr: 0, dead: 0, wid: '', team: 0 }, c, { key: 'menu' });
    const D = CharGLB.defOf(cc); if (!D) return undefined; const rec = CharGLB.load(D.url); if (!rec.gltf) return null;
    /* o personagem do retrato é montado UMA vez e reaproveitado enquanto roupa/chapéu/arma carregam (montar é caro) */
    const key = JSON.stringify(cc) + '|' + JSON.stringify(o || {}); this.pend = this.pend || new Map(); let I = this.pend.get(key);
    if (!I) {
      const now = performance.now(); if (now - (this.lastChar || 0) < 120) return null; this.lastChar = now;   /* no máximo ~8 montagens por segundo */
      Body3D.prep(rec); Body3D.lockRoot(rec); I = CharGLB.make(rec, D); I.root.parent && I.root.parent.remove(I.root); Body3D.init(I, rec); I.tries = 0; this.pend.set(key, I);
    }
    const drop = () => { for (const m of I.mats || []) m.dispose(); I.mixer.stopAllAction(); this.pend.delete(key); };
    for (let k = 0; k < 3; k++) Body3D.update(I, cc, { time: 1 + k * .02 + I.tries * .06 }, D);
    if (cc.emote && I.cur) { const a = I.cur; I.mixer.stopAllAction(); a.reset(); a.setEffectiveWeight(1); a.play(); a.time = Math.min(a.getClip().duration * .999, cc.emote.t || 0); I.mixer.update(0); I.root.updateMatrixWorld(true); }   /* pose do emote na hora (sem o fade de entrada) */
    const ready = !((I.outWant && I.outId !== I.outWant) || (I.hatWant && I.hatId !== I.hatWant) || (cc.wid && !I.wobj));
    if (!ready && ++I.tries < 400) return null;                                                                 /* roupa/chapéu/arma ainda carregando */
    I.root.position.set(0, 0, 0); I.root.updateMatrixWorld(true);
    let box; if (o && o.face && I.bones.Head) { const T = THREE, h = I.bones.Head.getWorldPosition(new T.Vector3()), t = (I.bones.head_end || I.bones.Head).getWorldPosition(new T.Vector3()), r = Math.max(.12, t.distanceTo(h)) * .78; const ctr = h.clone().lerp(t, .45); box = new T.Box3(ctr.clone().subScalar(r), ctr.clone().addScalar(r)); }
    try { return this.shot(I.root, Object.assign({ w: 220, h: 280, ry: .38, rx: .04, pad: 1.06 }, o || {}, box ? { box } : {})); } finally { drop(); }
  }
};
/* carrega antes os modelos de roupa, chapéu e arma (os ícones e o primeiro personagem saem sem esperar) */
function preloadModels() {
  if (!BODY3D.tex) return; const L = Object.values(AGENT_GLB).map(a => 'agente_' + a.m).concat(['mandioca'], ['chapeu_palha', 'chapeu_bone', 'chapeu_safari', 'chapeu_broto']).concat(Object.values(WEAPON_GLB).map(d => 'arma_' + d.f));
  for (const n of L) CharGLB.load('modelos/' + n + '.glb');
}

/* armas no chão (Todos contra Todos) com o modelo 3D: malhas reaproveitadas a cada quadro, com a cor do nível num anel */
const LootGLB = {
  pool: /** @type {any[]} */ ([]), used: 0,
  draw(it, t) {
    if (!BODY3D.tex || !ThreeR.scene || !WEAPON_GLB[it.w]) return false; const g = Body3D.wglb(it.w); if (!g) return false;
    let m = this.pool[this.used]; if (!m) { m = new THREE.Mesh(g, g.userData.mat); m.castShadow = true; ThreeR.scene.add(m); this.pool.push(m); }
    this.used++; const mt = Body3D.wmat(g, it.sk || ''); if (m.geometry !== g || m.material !== mt) { m.geometry = g; m.material = mt; }
    m.visible = true; m.position.set(it.x, it.y + .55 + Math.sin(t * 2 + it.x) * .06, it.z); m.rotation.set(0, t * 1.2 + it.x, 0); const s = 1.25; m.scale.set(s, s, s);
    return true;
  },
  end() { for (let i = this.used; i < this.pool.length; i++) this.pool[i].visible = false; this.used = 0; }
};
(function () { const r = ThreeR.render.bind(ThreeR); ThreeR.render = function (R, cam, opts) { r(R, cam, opts); LootGLB.end(); }; })();

/* v7.10: mandioca-bomba com o modelo 3D (nas costas, no chão, plantada e na mão em 1ª pessoa).
   drawCassava (código) chama CassGLB.draw: se o modelo já carregou, põe uma malha do GLB na matriz atual do construtor. */
const CassGLB = {
  pools: { w: /** @type {any[]} */ ([]), v: /** @type {any[]} */ ([]) }, used: { w: 0, v: 0 }, geo: /** @type {any} */ (null), led: /** @type {any} */ (null),
  /** geometria normalizada: comprimento 0,46 m no eixo x, centrada, folhas em −x como a de código */
  get() {
    if (this.geo !== null) return this.geo || null; const rec = CharGLB.load('modelos/mandioca.glb'); if (!rec.gltf) return null;
    const S = Body3D.staticOf(rec); if (!S.g) { this.geo = false; return null; }
    const T = THREE, g = S.g.clone(); g.computeBoundingBox(); const b = g.boundingBox, c = b.getCenter(new T.Vector3()), s = .46 / Math.max(1e-3, b.max.x - b.min.x);
    g.applyMatrix4(new T.Matrix4().makeScale(s, s, s).multiply(new T.Matrix4().makeTranslation(-c.x, -c.y, -c.z))); g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.mat = S.mat; this.geo = g;
    this.ledMat = [new T.MeshBasicMaterial({ color: 0xff2020 }), new T.MeshBasicMaterial({ color: 0x501010 })]; this.ledGeo = new T.SphereGeometry(.014, 8, 6);
    return g;
  },
  draw(m, st) {
    if (!BODY3D.tex || typeof ThreeR === 'undefined' || !ThreeR.scene || typeof G === 'undefined' || !G.R) return false;
    const vm = m === G.R.vmMB, dyn = m === G.R.dyn; if (!vm && !dyn) return false; const sc = vm ? ThreeR.vmScene : ThreeR.scene; if (!sc) return false;
    const g = this.get(); if (!g) return false; const k = vm ? 'v' : 'w', P = this.pools[k];
    let o = P[this.used[k]]; if (!o) { o = new THREE.Mesh(g, g.userData.mat); o.matrixAutoUpdate = false; o.castShadow = !vm; o.frustumCulled = !vm; sc.add(o); P.push(o); }
    this.used[k]++; const M = m.M, i0 = m.o, sk = ((st && st.scale) || 1) * (vm ? .58 : .85);   /* o modelo é mais gordo que a de código */
    o.matrix.fromArray(M, i0); if (sk !== 1) o.matrix.multiply(new THREE.Matrix4().makeScale(sk, sk, sk)); o.matrixWorldNeedsUpdate = true; o.visible = true;
    return true;
  },
  end() { for (const k of ['w', 'v']) { const P = this.pools[k]; for (let i = this.used[k]; i < P.length; i++) P[i].visible = false; this.used[k] = 0; } }
};
(function () { const r = ThreeR.render.bind(ThreeR); ThreeR.render = function (R, cam, opts) { r(R, cam, opts); CassGLB.end(); }; })();
