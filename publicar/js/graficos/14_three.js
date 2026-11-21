/* =====================================================================
   14_three.js — RENDERIZADOR THREE.JS (Fase 2)
   Usa as MESMAS malhas (MB) e a MESMA textura em camadas do motor clássico,
   mas desenha com o Three.js: iluminação física (PBR), sombras suaves
   (PCF), oclusão de ambiente (GTAO), bloom, tom de cinema (ACES) e
   carregador de modelos .glb. O resto do jogo não muda: só o
   Renderer.render() troca de "pincel". Motor clássico continua disponível
   (Configurações → Motor gráfico).
   ===================================================================== */
'use strict';
const ENGINE = () => (typeof THREE !== 'undefined' && (settings.engine || 'three') === 'three') ? 'three' : 'classico';

const ThreeR = {
  rd: null, failed: false,
  /* ---------- criação ---------- */
  setup(R) {
    const T = THREE, g = R.gl;
    const rd = this.rd = new T.WebGLRenderer({ canvas: R.canvas, context: g, antialias: false, powerPreference: 'high-performance' });
    rd.setPixelRatio(1); rd.autoClear = false; rd.outputColorSpace = T.SRGBColorSpace; rd.toneMapping = T.ACESFilmicToneMapping;
    rd.shadowMap.enabled = true; rd.shadowMap.type = T.PCFSoftShadowMap; rd.shadowMap.autoUpdate = true;
    this.scene = new T.Scene(); this.cam = new T.PerspectiveCamera(70, 1, .08, 1200); this.cam.rotation.order = 'YXZ';
    this.vmScene = new T.Scene(); this.vmCam = new T.PerspectiveCamera(62, 1, .015, 40);
    /* luzes */
    this.hemi = new T.HemisphereLight(0xffffff, 0x444444, 1); this.scene.add(this.hemi);
    this.sun = new T.DirectionalLight(0xffffff, 3); this.sun.castShadow = true; this.scene.add(this.sun); this.scene.add(this.sun.target);
    const sc = this.sun.shadow; sc.bias = -.0004; sc.normalBias = .035; sc.radius = 2.5;
    this.vmHemi = new T.HemisphereLight(0xffffff, 0x444444, 1); this.vmSun = new T.DirectionalLight(0xffffff, 3); this.vmScene.add(this.vmHemi, this.vmSun, this.vmSun.target);
    /* textura em camadas (a mesma do motor clássico) */
    const L = R.tex.layers, n = R.tex.nLayers, ta = this.texArr = new T.DataArrayTexture(L, TEXN, TEXN, n);
    ta.format = T.RGBAFormat; ta.type = T.UnsignedByteType; ta.colorSpace = T.SRGBColorSpace; ta.generateMipmaps = true; ta.minFilter = T.LinearMipmapLinearFilter; ta.magFilter = T.LinearFilter;
    ta.wrapS = ta.wrapT = T.RepeatWrapping; ta.anisotropy = 8; ta.needsUpdate = true;
    /* uniforms compartilhados */
    this.U = { uTexArr: { value: ta }, uTime: { value: 0 }, uWind: { value: .35 } };
    this.SU = this._skyUniforms();
    this.mats = this._materials();
    /* malhas dinâmicas (personagens, efeitos, vidro, marcas de tiro, braço) */
    this.dyn = this._dynMesh(this.mats.world, true); this.scene.add(this.dyn.mesh);
    this.trans = this._dynMesh(this.mats.trans, false); this.scene.add(this.trans.mesh);
    this.decal = this._dynMesh(this.mats.decal, false); this.scene.add(this.decal.mesh);
    this.vm = this._dynMesh(this.mats.vm, false); this.vmScene.add(this.vm.mesh); this.vm.mesh.castShadow = false;
    /* céu */
    this.sky = new T.Mesh(new T.SphereGeometry(1, 32, 16), this.mats.sky); this.sky.frustumCulled = false; this.sky.renderOrder = -10; this.sky.scale.setScalar(900); this.scene.add(this.sky);
    /* partículas e rastros */
    this.partA = this._partMesh(R.pbuf.alpha, false); this.partD = this._partMesh(R.pbuf.add, true); this.beams = this._beamMesh(R.beamBuf);
    this.scene.add(this.partA, this.partD, this.beams);
    this._composer(R);
    this.built = new WeakMap();
  },
  /* ---------- geometria a partir de um MB (mesmo formato de vértice: 40 bytes) ---------- */
  _geoFrom(buf, n, ix, ni) {
    const T = THREE, f32 = new Float32Array(buf, 0, n * 10), u8 = new Uint8Array(buf, 0, n * 40);
    const ibF = new T.InterleavedBuffer(f32, 10), ibU = new T.InterleavedBuffer(u8, 40), geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.InterleavedBufferAttribute(ibF, 3, 0)); geo.setAttribute('normal', new T.InterleavedBufferAttribute(ibF, 3, 3));
    geo.setAttribute('aUv', new T.InterleavedBufferAttribute(ibF, 2, 6)); geo.setAttribute('color', new T.InterleavedBufferAttribute(ibU, 4, 32, true));
    geo.setAttribute('aW', new T.InterleavedBufferAttribute(ibU, 4, 32, true)); geo.setAttribute('aMat', new T.InterleavedBufferAttribute(ibU, 4, 36, false));
    geo.setIndex(new T.BufferAttribute(ix.subarray(0, ni), 1)); return { geo, ibF, ibU };
  },
  staticGeo(mb) { const buf = mb.buf.slice(0, mb.n * 40); const r = this._geoFrom(buf, mb.n, mb.ix.slice(0, mb.ni), mb.ni); r.geo.computeBoundingSphere(); return r.geo; },
  _dynMesh(mat, cast) {
    const T = THREE, mesh = new T.Mesh(new T.BufferGeometry(), mat); mesh.frustumCulled = false; mesh.castShadow = cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
    if (mat.userData.depth) mesh.customDepthMaterial = mat.userData.depth;
    return { mesh, buf: null, ix: null, ibF: null, ibU: null, iattr: null, cap: 0 };
  },
  _updDyn(D, mb) {
    const T = THREE; if (!mb.ni) { D.mesh.visible = false; return; } D.mesh.visible = true;
    if (D.buf !== mb.buf) { const f32 = new Float32Array(mb.buf), u8 = new Uint8Array(mb.buf); D.ibF = new T.InterleavedBuffer(f32, 10); D.ibU = new T.InterleavedBuffer(u8, 40); D.ibF.setUsage(T.DynamicDrawUsage); D.ibU.setUsage(T.DynamicDrawUsage);
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.InterleavedBufferAttribute(D.ibF, 3, 0)); geo.setAttribute('normal', new T.InterleavedBufferAttribute(D.ibF, 3, 3)); geo.setAttribute('aUv', new T.InterleavedBufferAttribute(D.ibF, 2, 6));
      geo.setAttribute('color', new T.InterleavedBufferAttribute(D.ibU, 4, 32, true)); geo.setAttribute('aMat', new T.InterleavedBufferAttribute(D.ibU, 4, 36, false));
      if (D.mesh.geometry) D.mesh.geometry.dispose(); D.mesh.geometry = geo; D.buf = mb.buf; D.ix = null; }
    const geo = D.mesh.geometry;
    if (D.ix !== mb.ix) { D.iattr = new T.BufferAttribute(mb.ix, 1); D.iattr.setUsage(T.DynamicDrawUsage); geo.setIndex(D.iattr); D.ix = mb.ix; }
    D.ibF.clearUpdateRanges(); D.ibF.addUpdateRange(0, mb.n * 10); D.ibF.needsUpdate = true; D.ibU.clearUpdateRanges(); D.ibU.addUpdateRange(0, mb.n * 40); D.ibU.needsUpdate = true;
    D.iattr.clearUpdateRanges(); D.iattr.addUpdateRange(0, mb.ni); D.iattr.needsUpdate = true; geo.setDrawRange(0, mb.ni);
  },
  /* ---------- materiais (PBR do Three + textura em camadas + vento + recorte + emissão) ---------- */
  _materials() {
    const T = THREE, U = this.U, NO = TX.noise;
    const VHEAD = `attribute vec4 aMat; attribute vec2 aUv; varying vec4 vMatW; varying vec2 vUvW; uniform float uTime; uniform float uWind;
#ifdef BK_INST
attribute vec4 iA; attribute vec4 iB;
#endif
`;
    const VBEGIN = `vec3 transformed = vec3(position);
#ifdef BK_INST
{ float cs = cos(iA.w), sn = sin(iA.w); transformed *= iB.x; transformed = vec3(cs*transformed.x + sn*transformed.z, transformed.y, -sn*transformed.x + cs*transformed.z) + iA.xyz; }
#endif
{ float wd = aMat.z / 255.0; if (wd > 0.0) { float ph = transformed.x*0.37 + transformed.z*0.29; vec2 w = vec2(sin(uTime*1.7 + ph), cos(uTime*1.35 + ph*1.3))*0.45 + vec2(sin(uTime*0.6 + transformed.x*0.06), cos(uTime*0.5 + transformed.z*0.06))*0.9; transformed.xz += w * wd * uWind; } }
vMatW = aMat; vUvW = aUv;`;
    const VNORM = `vec3 objectNormal = vec3(normal);
#ifdef BK_INST
{ float cs = cos(iA.w), sn = sin(iA.w); objectNormal = vec3(cs*objectNormal.x + sn*objectNormal.z, objectNormal.y, -sn*objectNormal.x + cs*objectNormal.z); }
#endif
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif`;
    const FHEAD = `precision highp sampler2DArray; uniform sampler2DArray uTexArr; varying vec4 vMatW; varying vec2 vUvW;\n`;
    const FMAP = `int bkLayer = int(vMatW.x + 0.5); float bkSpec = vMatW.y / 255.0; int bkWf = int(vMatW.w + 0.5); bool bkCut = bkWf >= 128; float bkEmis = float(bkWf & 127) / 127.0;
vec4 bkT = texture(uTexArr, vec3(vUvW, float(bkLayer)));
if (!bkCut) bkT.rgb = mix(textureLod(uTexArr, vec3(vUvW, float(bkLayer)), 5.0).rgb, bkT.rgb, 0.7);
if (bkCut && bkT.a < 0.45) discard;
diffuseColor *= bkT;`;
    const patch = (mat, inst, extraKey) => {
      mat.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = (inst ? '#define BK_INST\n' : '') + VHEAD + sh.vertexShader.replace('#include <begin_vertex>', VBEGIN).replace('#include <beginnormal_vertex>', VNORM)
          .replace('#include <color_vertex>', '#include <color_vertex>\n#if defined(BK_INST) && defined(USE_COLOR_ALPHA)\nvColor.rgb *= iB.yzw;\n#endif');
        sh.fragmentShader = FHEAD + sh.fragmentShader.replace('#include <map_fragment>', FMAP)
          .replace('#include <color_fragment>', '#if defined(USE_COLOR_ALPHA)\ndiffuseColor.rgb *= pow(vColor.rgb, vec3(2.2)); diffuseColor.a *= vColor.a;\n#endif')
          .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.9, 0.3, bkSpec);')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * bkEmis * 4.0;');
      };
      mat.customProgramCacheKey = () => 'bk' + (inst ? 'I' : '') + (extraKey || '');
      /* sombra: mesmo deslocamento (vento/instância) e recorte das folhas */
      const dm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
      dm.onBeforeCompile = sh => { Object.assign(sh.uniforms, U); sh.vertexShader = (inst ? '#define BK_INST\n' : '') + VHEAD + sh.vertexShader.replace('#include <begin_vertex>', VBEGIN);
        sh.fragmentShader = FHEAD + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n{ int wf = int(vMatW.w + 0.5); if (wf >= 128 && texture(uTexArr, vec3(vUvW, vMatW.x)).a < 0.45) discard; }'); };
      dm.customProgramCacheKey = () => 'bkd' + (inst ? 'I' : ''); mat.userData.depth = dm; return mat;
    };
    const std = o => new T.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: .8, metalness: 0, side: T.DoubleSide }, o || {}));
    const M = {};
    M.world = patch(std(), false);
    M.inst = patch(std(), true);
    M.trans = patch(std({ transparent: true, depthWrite: false }), false, 'T');
    M.decal = patch(std({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), false, 'D');
    M.vm = patch(std({ fog: false }), false, 'V');
    /* terreno: mistura de texturas (grama, terra, areia, pedra, cascalho) pelos pesos do vértice */
    M.terrain = new T.MeshStandardMaterial({ roughness: .95, metalness: 0 });
    M.terrain.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'attribute vec4 aW; varying vec4 vW4; varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvW4 = aW; vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = FHEAD.replace('varying vec4 vMatW; varying vec2 vUvW;', '') + 'varying vec4 vW4; varying vec3 vWp;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
vec2 wuv = vWp.xz; float mac = texture(uTexArr, vec3(wuv*0.021, ${NO}.0)).r, mac2 = texture(uTexArr, vec3(wuv*0.0063+.37, ${NO}.0)).r;
vec4 w = vW4; w /= (w.r + w.g + w.b + w.a + 0.0001);
float steep = smoothstep(0.86, 0.66, normalize(vNormal).y);
vec3 cg = texture(uTexArr, vec3(wuv*0.34, ${TX.grass}.0)).rgb * (0.9 + 0.2*texture(uTexArr, vec3(wuv*0.071, ${TX.grass}.0)).g);
cg *= mix(vec3(0.82, 0.95, 0.76), vec3(1.06, 1.03, 0.84), smoothstep(0.1, 0.5, mac2));
vec3 cd = texture(uTexArr, vec3(wuv*0.3, ${TX.dirt}.0)).rgb, cs = texture(uTexArr, vec3(wuv*0.3, ${TX.sand}.0)).rgb, cr = texture(uTexArr, vec3(wuv*0.28, ${TX.gravel}.0)).rgb, ck = texture(uTexArr, vec3(wuv*0.16, ${TX.rockT}.0)).rgb;
vec3 base = cg*w.r + cd*w.g + cs*w.b + cr*w.a; base = mix(base, ck, steep); base *= mix(0.8, 1.1, mac) * mix(0.92, 1.06, mac2);
diffuseColor.rgb = base;`);
    };
    M.terrain.customProgramCacheKey = () => 'bkterr';
    /* água (shader próprio, porta do clássico) */
    M.water = new T.ShaderMaterial({ uniforms: Object.assign({}, U, this.SU), vertexShader: SHADER3.vWorld, fragmentShader: SHADER3.common + SHADER3.water, transparent: true, depthWrite: false, side: T.DoubleSide });
    M.water.extensions = {};
    /* céu */
    M.sky = new T.ShaderMaterial({ uniforms: Object.assign({}, U, this.SU), vertexShader: SHADER3.vSky, fragmentShader: SHADER3.common + SHADER3.sky, side: T.BackSide, depthWrite: false, fog: false });
    return M;
  },
  _skyUniforms() {
    const V3 = () => ({ value: new THREE.Vector3() });
    return { uSunDir: V3(), uSunCol: V3(), uAmbS: V3(), uAmbG: V3(), uFogC: V3(), uZen: V3(), uHor: V3(), uCloudLight: V3(), uCloudDark: V3(), uCloudRange: { value: new THREE.Vector2(.45, .72) }, uFogD: { value: .005 }, uFogS: { value: 100 }, uExp: { value: 1 } };
  },
  /* partículas: quad instanciado lendo o mesmo buffer do clássico (12 floats por partícula) */
  _partMesh(B, add) {
    const T = THREE, geo = new T.InstancedBufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0], 3)); geo.setIndex([0, 1, 2, 2, 1, 3]);
    const ib = new T.InstancedInterleavedBuffer(B.data, 12); ib.setUsage(T.DynamicDrawUsage);
    geo.setAttribute('pA', new T.InterleavedBufferAttribute(ib, 4, 0)); geo.setAttribute('pB', new T.InterleavedBufferAttribute(ib, 4, 4)); geo.setAttribute('pC', new T.InterleavedBufferAttribute(ib, 4, 8));
    const mat = new T.ShaderMaterial({ uniforms: Object.assign({ uRight: { value: new T.Vector3() }, uUp: { value: new T.Vector3() }, uAdd: { value: add ? 1 : 0 } }, this.U, this.SU), vertexShader: SHADER3.vPart, fragmentShader: SHADER3.common + SHADER3.part,
      transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending, side: T.DoubleSide });
    const m = new T.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 5; m.userData = { B, ib }; return m;
  },
  _beamMesh(B) {
    const T = THREE, geo = new T.InstancedBufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 0, 1, 0, 1, 1, 0], 3)); geo.setIndex([0, 1, 2, 2, 1, 3]);
    const ib = new T.InstancedInterleavedBuffer(B.data, 12); ib.setUsage(T.DynamicDrawUsage);
    geo.setAttribute('bA', new T.InterleavedBufferAttribute(ib, 4, 0)); geo.setAttribute('bB', new T.InterleavedBufferAttribute(ib, 4, 4)); geo.setAttribute('bC', new T.InterleavedBufferAttribute(ib, 4, 8));
    const mat = new T.ShaderMaterial({ uniforms: {}, vertexShader: SHADER3.vBeam, fragmentShader: SHADER3.beam, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    const m = new T.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 6; m.userData = { B, ib }; return m;
  },
  _updInst(m) { const { B, ib } = m.userData; m.visible = B.n > 0; if (!B.n) return; ib.clearUpdateRanges(); ib.addUpdateRange(0, B.n * 12); ib.needsUpdate = true; m.geometry.instanceCount = B.n; },
  /* ---------- pós-processamento ---------- */
  _composer(R) {
    const T = THREE, rd = this.rd, W = Math.max(2, R.w), H = Math.max(2, R.h);
    const rt = new T.WebGLRenderTarget(W, H, { type: T.HalfFloatType, samples: 0 });
    const cp = this.comp = new T.EffectComposer(rd, rt); cp.setPixelRatio(1);
    this.pMain = new T.RenderPass(this.scene, this.cam);
    this.pAO = new T.GTAOPass(this.scene, this.cam, W, H); this.pAO.output = T.GTAOPass.OUTPUT.Default; this.pAO.blendIntensity = .85;
    this.pAO.updateGtaoMaterial({ radius: .55, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 12 });
    this.pVM = new T.RenderPass(this.vmScene, this.vmCam); this.pVM.clear = false; this.pVM.clearDepth = true;
    this.pBloom = new T.UnrealBloomPass(new T.Vector2(W, H), .32, .45, .92);
    this.pOut = new T.OutputPass();
    this.pAA = new T.SMAAPass(W, H);
    /* gradação de cor (como no clássico): vibrância, contraste em S, sombras levemente frias e luzes quentes */
    this.pGrade = new T.ShaderPass({ uniforms: { tDiffuse: { value: null }, uSat: { value: 1.12 }, uCon: { value: 1.08 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uCon; varying vec2 vUv;
void main(){ vec4 t = texture2D(tDiffuse, vUv); vec3 c = t.rgb; float l = dot(c, vec3(.299,.587,.114));
  c += vec3(-0.012, 0.0, 0.03) * (1.0 - smoothstep(0.0, 0.5, l)); c += vec3(0.02, 0.008, -0.016) * smoothstep(0.5, 1.0, l);
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)); c = mix(vec3(l), c, uSat + 0.12 * (1.0 - (mx - mn)));
  c = (c - 0.5) * uCon + 0.5; c = mix(c, c*c*(3.0-2.0*c), 0.12); gl_FragColor = vec4(clamp(c, 0.0, 1.0), t.a); }` });
    cp.addPass(this.pMain); cp.addPass(this.pAO); cp.addPass(this.pVM); cp.addPass(this.pBloom); cp.addPass(this.pOut); cp.addPass(this.pGrade); cp.addPass(this.pAA);
    this.cw = W; this.ch = H;
  },
  /* ---------- cena do mapa ---------- */
  buildScene(R, d, S) {
    const T = THREE, root = new T.Group(); root.matrixAutoUpdate = false; const X = { root, chunks: [], terrain: [], trans: [], inst: [], water: [] };
    const mk = (mb, mat, cast) => { const m = new T.Mesh(this.staticGeo(mb), mat); m.matrixAutoUpdate = false; m.castShadow = cast; m.receiveShadow = true; if (mat.userData.depth) m.customDepthMaterial = mat.userData.depth; root.add(m); return m; };
    for (const o of d.terrain || []) { if (!o.mb || o.mb.empty) continue; const m = mk(o.mb, this.mats.terrain, true); m.userData.lod = o.lodMb && !o.lodMb.empty ? this.staticGeo(o.lodMb) : null; m.userData.full = m.geometry; X.terrain.push(m); }
    for (const o of d.chunks || []) { if (!o.mb || o.mb.empty) continue; X.chunks.push(mk(o.mb, this.mats.world, true)); }
    for (const o of d.trans || []) { if (!o.mb || o.mb.empty) continue; const m = mk(o.mb, this.mats.trans, false); m.renderOrder = 2; X.trans.push(m); }
    for (const o of d.water || []) { if (!o.mb || o.mb.empty) continue; const m = mk(o.mb, this.mats.water, false); m.receiveShadow = false; m.renderOrder = 3; X.water.push(m); }
    for (const o of d.inst || []) {
      const base = this.staticGeo(o.mb), geo = new T.InstancedBufferGeometry(); for (const k in base.attributes) geo.setAttribute(k, base.attributes[k]); geo.setIndex(base.index);
      const ib = new T.InstancedInterleavedBuffer(o.data, 8); geo.setAttribute('iA', new T.InterleavedBufferAttribute(ib, 4, 0)); geo.setAttribute('iB', new T.InterleavedBufferAttribute(ib, 4, 4)); geo.instanceCount = o.count;
      const m = new T.Mesh(geo, this.mats.inst); m.frustumCulled = false; m.matrixAutoUpdate = false; m.castShadow = !!o.cast; m.receiveShadow = true; m.customDepthMaterial = this.mats.inst.userData.depth;
      m.userData = { count: o.count, maxDist: o.maxDist || 90, dist: o.dist, mn: o.mn, mx: o.mx }; root.add(m); X.inst.push(m);
    }
    /* bounds dos chunks estáticos para o recorte por distância */
    for (const m of X.chunks.concat(X.terrain, X.trans)) { m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox; m.userData.mn = [b.min.x, b.min.y, b.min.z]; m.userData.mx = [b.max.x, b.max.y, b.max.z]; }
    return X;
  },
  /* ---------- quadro ---------- */
  render(R, cam, opts) {
    const T = THREE, rd = this.rd, e = R.env, S = R.scene; opts = opts || {}; if (!R.ready) return;
    R.resize(); const W = R.w, H = R.h, asp = W / H, qd = R.q.dist * (R.st.viewDist || 1); R.qd = qd;
    const altK = clamp(((cam.y || 0) - (R.groundY || 0) - 25) / 110, 0, 1), rm = 1 + altK * 1.3; R.rm = rm; R.cullD = 400 * qd * rm;
    const wMul = clamp(e.fogD / .0046, .7, 3.5); R.fogS = R.cullD * .45 / Math.sqrt(wMul); R.fogD = 1.6 / Math.max(60, R.cullD - R.fogS) * Math.sqrt(wMul);
    const far = Math.max(600 + altK * 300, R.cullD + 60);
    /* matrizes do clássico (HUD, nomes e recorte usam R.VP) */
    R._cam(cam, asp, .08, far, R.P, R.V, R.VP); frustumPlanes(R.VP, R.pl); R.cam = cam;
    rd.resetState(); rd.info.autoReset = false; rd.info.reset(); if (this.cw !== W || this.ch !== H) { rd.setSize(W, H, false); this.comp.setSize(W, H); this.cw = W; this.ch = H; }
    /* câmera */
    const C = this.cam; C.fov = cam.fov; C.aspect = asp; C.near = .08; C.far = far; C.position.set(cam.x, cam.y, cam.z); C.rotation.set(cam.pitch, cam.yaw, cam.roll || 0); C.updateProjectionMatrix(); C.updateMatrixWorld();
    /* ambiente: luz, névoa, céu */
    this.U.uTime.value = R.time; this.U.uWind.value = R.windAmp === undefined ? .35 : R.windAmp;
    const SU = this.SU, sd = e.sunDir; SU.uSunDir.value.set(sd[0], sd[1], sd[2]); SU.uSunCol.value.fromArray(e.sunCol); SU.uAmbS.value.fromArray(e.ambS); SU.uAmbG.value.fromArray(e.ambG); SU.uFogC.value.fromArray(e.fogC);
    SU.uZen.value.fromArray(e.zen); SU.uHor.value.fromArray(e.hor); SU.uCloudLight.value.fromArray(e.cloudLight); SU.uCloudDark.value.fromArray(e.cloudDark); SU.uCloudRange.value.set(e.cloudLo, e.cloudHi); SU.uFogD.value = R.fogD; SU.uFogS.value = R.fogS; SU.uExp.value = 1;
    const sMax = Math.max(e.sunCol[0], e.sunCol[1], e.sunCol[2]), aMax = Math.max(...e.ambS);
    this.sun.color.setRGB(e.sunCol[0] / sMax, e.sunCol[1] / sMax, e.sunCol[2] / sMax); this.sun.intensity = sMax * 1.05;
    this.hemi.color.setRGB(e.ambS[0] / aMax, e.ambS[1] / aMax, e.ambS[2] / aMax); const gM = Math.max(...e.ambG); this.hemi.groundColor.setRGB(e.ambG[0] / gM, e.ambG[1] / gM, e.ambG[2] / gM); this.hemi.intensity = aMax * 3.0;
    rd.toneMappingExposure = (e.exp || 1) * .95;
    this.scene.fog = this.scene.fog || new T.Fog(0xffffff, 100, 500); this.scene.fog.color.setRGB(e.fogC[0], e.fogC[1], e.fogC[2]); this.scene.fog.near = R.fogS; this.scene.fog.far = R.fogS + 1.6 / Math.max(1e-5, R.fogD);
    this.sky.position.set(cam.x, cam.y, cam.z); this.sky.scale.setScalar(Math.min(900, far * .95));
    /* sombra do sol acompanha a câmera (encaixe em grade para não tremer) */
    const shOn = R.shOn && !opts.noShadow; rd.shadowMap.enabled = shOn; this.sun.castShadow = shOn;
    if (shOn) { const sr = R.shR || 60, sh = this.sun.shadow; if (sh.mapSize.x !== R.shSize) { sh.mapSize.set(R.shSize, R.shSize); if (sh.map) { sh.map.dispose(); sh.map = null; } }
      const oc = sh.camera; oc.left = -sr; oc.right = sr; oc.top = sr; oc.bottom = -sr; oc.near = 1; oc.far = 420; oc.updateProjectionMatrix();
      const step = sr * 2 / R.shSize * 4, cx = Math.round(cam.x / step) * step, cz = Math.round(cam.z / step) * step, cy = cam.y;
      this.sun.target.position.set(cx, cy - 2, cz); this.sun.position.set(cx + sd[0] * 200, cy - 2 + sd[1] * 200, cz + sd[2] * 200); this.sun.target.updateMatrixWorld(); }
    else this.sun.position.set(cam.x + sd[0] * 200, cam.y + sd[1] * 200, cam.z + sd[2] * 200), this.sun.target.position.set(cam.x, cam.y, cam.z), this.sun.target.updateMatrixWorld();
    /* cena estática */
    if (S && !S.three) S.three = this.buildScene(R, S.src || {}, S);
    if (this.curS !== S) { if (this.curS && this.curS.three) this.scene.remove(this.curS.three.root); if (S && S.three) this.scene.add(S.three.root); this.curS = S; }
    if (S && S.three) {
      const X = S.three, cf = R.cullD, pl = R.pl, ld = R.q.terrLod || 64;
      for (const m of X.terrain) { const u = m.userData, v = aabbVisible(pl, u.mn, u.mx); m.visible = v; if (v && u.lod) m.geometry = R._chunkDist(cam, { mn: u.mn, mx: u.mx }) > ld ? u.lod : u.full; }
      for (const m of X.chunks) { const u = m.userData; m.visible = aabbVisible(pl, u.mn, u.mx) && R._chunkDist(cam, { mn: u.mn, mx: u.mx }) < cf; }
      for (const m of X.trans) { const u = m.userData; m.visible = aabbVisible(pl, u.mn, u.mx); }
      const gk = R.q.grass * (R.st.grass === undefined ? 1 : R.st.grass);
      for (const m of X.inst) { const u = m.userData; if (!aabbVisible(pl, u.mn, u.mx)) { m.visible = false; continue; }
        const cx = (u.mn[0] + u.mx[0]) / 2, cz = (u.mn[2] + u.mx[2]) / 2, rr = Math.hypot(u.mx[0] - u.mn[0], u.mx[2] - u.mn[2]) / 2, dd = Math.hypot(cam.x - cx, cam.z - cz) - rr;
        if (dd > u.maxDist * qd * (u.dist ? 1 : rm)) { m.visible = false; continue; } const f = u.dist ? clamp(gk, .05, 1.5) : 1; m.visible = true; m.geometry.instanceCount = Math.min(u.count, Math.max(1, (u.count * Math.min(f, 1)) | 0)); }
    }
    /* dinâmicos */
    this._updDyn(this.dyn, R.dyn); this._updDyn(this.trans, R.transMB);
    if (R.decalDirty) { if (R.decalRebuild) { R._rebuildDecals(); R.decalRebuild = false; } R.decalDirty = false; } this._updDyn(this.decal, R.decalMB);
    this._updInst(this.partA); this._updInst(this.partD); this._updInst(this.beams);
    const Vm = R.V; for (const pm of [this.partA, this.partD]) { pm.material.uniforms.uRight.value.set(Vm[0], Vm[4], Vm[8]); pm.material.uniforms.uUp.value.set(Vm[1], Vm[5], Vm[9]); }
    /* braço/arma em primeira pessoa */
    const vmOn = !!opts.vm && R.vmMB.ni > 0; this.pVM.enabled = vmOn;
    if (vmOn) { this._updDyn(this.vm, R.vmMB); const vc = this.vmCam; vc.fov = opts.vmFov || 62; vc.aspect = asp; vc.updateProjectionMatrix();
      const ld = new T.Vector3(sd[0], sd[1], sd[2]).applyQuaternion(C.quaternion.clone().invert()); this.vmSun.position.copy(ld).multiplyScalar(10); this.vmSun.target.position.set(0, 0, 0); this.vmSun.target.updateMatrixWorld();
      this.vmSun.color.copy(this.sun.color); this.vmSun.intensity = this.sun.intensity * .9; this.vmHemi.color.copy(this.hemi.color); this.vmHemi.groundColor.copy(this.hemi.groundColor); this.vmHemi.intensity = this.hemi.intensity; }
    /* qualidade: AO e anti-serrilhado só no Alto; bloom a partir do Médio */
    const post = R.q.post | 0; this.pAO.enabled = post >= 2 && settings.ao !== 'off' && settings.ao !== false; this.pBloom.enabled = post >= 1 && settings.bloom !== false; this.pAA.enabled = post >= 2;
    this.pGrade.uniforms.uSat.value = (e.sat || 1.1) * 1.02; this.pGrade.enabled = post >= 1;
    this.comp.render(); rd.resetState();
    const inf = rd.info.render; R.stats.draws = inf.calls; R.stats.tris = inf.triangles;
  }
};

/* ---------- shaders portados do motor clássico (céu, água, partículas, rastros) ---------- */
const SHADER3 = {
  vWorld: `varying vec3 vW; varying vec4 vCol; attribute vec4 aW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vCol = aW; gl_Position = projectionMatrix * viewMatrix * w; }`,
  vSky: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  common: `precision highp sampler2DArray; uniform sampler2DArray uTexArr; uniform float uTime;
uniform vec3 uSunDir, uSunCol, uAmbS, uAmbG, uFogC, uZen, uHor, uCloudLight, uCloudDark; uniform vec2 uCloudRange; uniform float uFogD, uFogS, uExp;
float sstep(float a, float b, float x){ float t = clamp((x-a)/(b-a), 0.0, 1.0); return t*t*(3.0-2.0*t); }
float cloudN(vec2 p){ return texture(uTexArr, vec3(p, ${TX.noise}.0)).r; }
vec3 skyBase(vec3 d){ float h = max(d.y, 0.0); vec3 c = mix(uHor, uZen, pow(h, 0.5)); c = mix(c, uHor*1.08, exp(-h*7.0)*0.4); float sd = max(dot(d, uSunDir), 0.0); c += uSunCol * (pow(sd, 900.0) * 6.0 + pow(sd, 30.0) * 0.2 + pow(sd, 5.0) * 0.07); return c; }
vec3 skyFull(vec3 d){
  vec3 c = skyBase(d);
  if (d.y > 0.0) { vec2 cp = d.xz / (d.y + 0.14); float t = uTime * 0.0035; vec2 o1 = cp*0.22 + vec2(t, t*0.4), o2 = cp*0.7 + vec2(-t*.6, t*.8), sd2 = normalize(uSunDir.xz + vec2(1e-4)) * 0.045;
    float n = cloudN(o1)*0.62 + cloudN(o2)*0.38, ns = cloudN(o1 + sd2)*0.62 + cloudN(o2 + sd2*3.2)*0.38;
    float cov = sstep(uCloudRange.x, uCloudRange.x + (uCloudRange.y - uCloudRange.x) * 0.55, n) * sstep(0.0, 0.16, d.y), shade = clamp(0.55 + (n - ns) * 5.0, 0.0, 1.0), core = sstep(uCloudRange.x, uCloudRange.y + .1, n);
    vec3 cc = mix(uCloudDark, uCloudLight, clamp(shade * 0.85 + (1.0 - core) * 0.35, 0.0, 1.0)) * (0.85 + 0.35*pow(max(dot(d, uSunDir),0.0), 3.0)); c = mix(c, cc, cov * 0.96);
  } else { c = mix(uHor, uFogC*0.9, sstep(0.0, -0.12, d.y)); }
  return c;
}
vec3 fogCol(vec3 dir){ float sd = max(dot(dir, uSunDir), 0.0); return uFogC + uSunCol * pow(sd, 6.0) * 0.05; }
`,
  sky: `varying vec3 vDir; void main(){ vec3 d = normalize(vDir); gl_FragColor = vec4(skyFull(d) * uExp, 1.0); }`,
  water: `varying vec3 vW; varying vec4 vCol;
float hgt(vec2 p){ return cloudN(p); }
void main(){
  vec3 V = cameraPosition - vW; float dist = length(V); V /= dist; vec2 p = vW.xz; float t = uTime;
  vec2 p1 = p*0.11 + vec2(t*0.012, t*0.007), p2 = p*0.27 + vec2(-t*0.017, t*0.011), p3 = p*0.9 + vec2(t*0.03, -t*0.02); float e = 0.004;
  float h0 = hgt(p1)*0.6 + hgt(p2)*0.3 + hgt(p3)*0.1, hx = hgt(p1+vec2(e,0.))*0.6 + hgt(p2+vec2(e,0.))*0.3 + hgt(p3+vec2(e,0.))*0.1, hz = hgt(p1+vec2(0.,e))*0.6 + hgt(p2+vec2(0.,e))*0.3 + hgt(p3+vec2(0.,e))*0.1;
  vec3 N = normalize(vec3(-(hx-h0)/e*0.012, 1.0, -(hz-h0)/e*0.012)); float shore = vCol.a;
  float fr = 0.03 + 0.97*pow(1.0 - max(dot(N, V), 0.0), 5.0); vec3 R = reflect(-V, N); R.y = abs(R.y); vec3 refl = skyFull(R);
  vec3 deep = vec3(0.012, 0.16, 0.42), shal = vec3(0.06, 0.48, 0.62); vec3 wc = mix(shal, deep, sstep(0.0, 0.4, shore)) * (uAmbS*1.0 + uSunCol*0.16);
  float sp = pow(max(dot(R, uSunDir), 0.0), 260.0); float glint = sstep(0.72, 0.8, hgt(p*0.6 + vec2(t*0.04, -t*0.03))) * 0.18;
  vec3 col = mix(wc, refl * 0.85, clamp(fr * 0.6 + 0.04, 0.0, 0.7)) + uSunCol * (sp * 1.5 + glint * 0.08);
  float foam = sstep(0.06, 0.0, shore) * (0.45 + 0.55 * hgt(p*0.5 + vec2(t*0.05, 0.0))); foam += sstep(0.62, 0.9, hgt(p*0.35 + vec2(t*0.02))) * 0.07;
  col = mix(col, vec3(0.9, 0.95, 0.95) * (uAmbS + uSunCol*0.4), clamp(foam, 0.0, 1.0));
  float fg = 1.0 - exp(-max(dist - uFogS, 0.0) * uFogD); col = mix(col, fogCol(-V), clamp(fg, 0.0, 1.0));
  float a = mix(0.55, 0.95, sstep(0.0, 0.3, shore)); a = max(a, clamp(foam, 0.0, 1.0)*0.9); gl_FragColor = vec4(col * uExp, a);
}`,
  vPart: `attribute vec4 pA; attribute vec4 pB; attribute vec4 pC; uniform vec3 uRight, uUp; varying vec2 vQ; varying vec4 vC; varying vec2 vT;
void main(){ vec2 q = position.xy; float c = cos(pC.x), s = sin(pC.x); vec2 r = vec2(q.x*c - q.y*s, q.x*s + q.y*c); vec3 P = pA.xyz + (uRight * r.x + uUp * r.y) * pA.w; vQ = q; vC = pB; vT = pC.yz; gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0); }`,
  part: `varying vec2 vQ; varying vec4 vC; varying vec2 vT; uniform float uAdd;
void main(){
  float d = length(vQ); int ty = int(vT.x + 0.5); float a = 0.0; vec3 c = vC.rgb;
  if (ty == 0) { float n = cloudN(vQ*0.35 + vT.y*3.7); a = sstep(1.0, 0.25, d + (n-0.5)*0.5); a *= a; }
  else if (ty == 1) { a = pow(clamp(1.0 - d, 0.0, 1.0), 2.0); c *= 1.0 + a; }
  else if (ty == 2) { a = sstep(1.0, 0.55, d); }
  else if (ty == 3) { float r = abs(d - 0.82); a = sstep(0.18, 0.0, r); }
  else if (ty == 4) { float n = cloudN(vQ*0.5 + vT.y*5.1); a = sstep(1.0, 0.4, d) * (0.5 + 0.6*n); }
  else { a = sstep(1.0, 0.8, d); }
  a *= vC.a; if (a < 0.003) discard; gl_FragColor = vec4(c * uExp, a);
}`,
  vBeam: `attribute vec4 bA; attribute vec4 bB; attribute vec4 bC; varying vec2 vQ; varying vec4 vC;
void main(){ float t = position.x, side = position.y; vec3 p0 = bA.xyz, p1 = bB.xyz; vec3 mid = mix(p0, p1, 0.5); vec3 dir = p1 - p0; vec3 sd = normalize(cross(dir, cameraPosition - mid) + vec3(1e-5));
  vec3 P = mix(p0, p1, t) + sd * side * bA.w * 0.5; vQ = vec2(t, side); vC = vec4(bC.rgb, bB.w); gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0); }`,
  beam: `varying vec2 vQ; varying vec4 vC; void main(){ float e = 1.0 - vQ.y*vQ.y; float g = pow(vQ.x, 1.6); float a = vC.a * e * (0.15 + 0.85*g); if (a < 0.002) discard; gl_FragColor = vec4(vC.rgb * (0.7 + 1.6*g), a); }`
};

/* ---------- liga o renderizador Three.js no lugar do clássico ---------- */
(function () {
  const baseRender = Renderer.prototype.render, baseBuild = Renderer.prototype.buildScene;
  Renderer.prototype.buildScene = function (d) { const S = baseBuild.call(this, d); S.src = d; return S; };
  Renderer.prototype.render = function (cam, opts) {
    if (ENGINE() === 'three' && !ThreeR.failed && this.ready) {
      try { if (!ThreeR.rd) ThreeR.setup(this); ThreeR.render(this, cam, opts); return; }
      catch (e) { console.error('Three.js falhou, voltando ao motor clássico:', e); ThreeR.failed = true; try { ThreeR.rd && ThreeR.rd.resetState(); } catch (e2) { } }
    }
    return baseRender.call(this, cam, opts);
  };
})();
