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
  cache: new Map(), inst: new Map(), frame: 0, wcache: new Map(),
  /* carrega (uma vez) o arquivo */
  load(url) {
    if (this.cache.has(url)) return this.cache.get(url);
    const rec = { url, gltf: null, err: null, p: null };
    rec.p = new Promise(res => { try { new THREE.GLTFLoader().load(url, g => { rec.gltf = g; res(rec); }, undefined, e => { rec.err = e; console.warn('GLB falhou', url, e); res(rec); }); } catch (e) { rec.err = e; res(rec); } });
    this.cache.set(url, rec); return rec;
  },
  defOf(c) { if (!c || c.farmer && isTat()) return null; const S = SKINS[(c.skin | 0) % SKINS.length]; return S && CHAR_GLB[S.id] || null; },
  /* true = desenhou com o modelo 3D (o boneco de código não precisa ser desenhado) */
  draw(c, opt) {
    if (typeof ENGINE !== 'function' || ENGINE() !== 'three' || !ThreeR.rd || !c.key) return false;
    const D = this.defOf(c); if (!D) return false; const rec = this.load(D.url); if (!rec.gltf) return false;
    let I = this.inst.get(c.key);
    if (!I || I.url !== D.url) { if (I) this.drop(c.key); I = this.make(rec, D); this.inst.set(c.key, I); }
    I.used = this.frame; I.root.visible = true;
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
    const acts = {}, names = D.clips || {}; for (const k of ['idle', 'walk', 'run', 'jump', 'death', 'dance']) { const cl = byName(names[k] || k); if (cl) acts[k] = mixer.clipAction(cl); }
    if (acts.death) { acts.death.setLoop(T.LoopOnce, 1); acts.death.clampWhenFinished = true; }
    if (acts.jump) { acts.jump.setLoop(T.LoopOnce, 1); acts.jump.clampWhenFinished = true; }
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
  drop(key) { const I = this.inst.get(key); if (!I) return; I.root.parent && I.root.parent.remove(I.root); I.mixer.stopAllAction(); this.inst.delete(key); },
  /* a cada quadro: esconde quem não apareceu (morreu longe, saiu da partida, troca de cena) */
  endFrame() { for (const [k, I] of this.inst) { if (I.used !== this.frame) { I.root.visible = false; if (this.frame - I.used > 600) this.drop(k); } } this.frame++; }
};
/* liga no desenho do personagem */
(function () {
  const base = drawChar;
  window.drawChar = function (m, c, opt) { if (c && c.key && CharGLB.draw(c, opt)) return; return base(m, c, opt); };
  const baseR = ThreeR.render.bind(ThreeR);
  ThreeR.render = function (R, cam, opts) { baseR(R, cam, opts); CharGLB.endFrame(); };
})();
