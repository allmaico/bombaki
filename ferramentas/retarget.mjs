// Retarget: copia as animações do boneco base (rig Meshy com nomes mixamorig:) para um personagem com rig do Meshy,
// aplicando a mesma rotação "de mundo" relativa à pose de repouso de cada osso (corrige diferenças de A-pose),
// e a posição do quadril escalada pela altura do quadril. Tira as animações próprias do personagem.
// uso: node retarget.mjs <personagem.glb> <base.glb> <saida.glb>
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as T from '/home/user/bombaki/node_modules/three/build/three.module.js'; import fs from 'fs';
const [dstIn, srcIn, out] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const D = await io.read(dstIn), S = await io.read(srcIn), RD = D.getRoot(), RS = S.getRoot();
if (process.env.SCALE) { const arm = RD.listNodes().find(n => n.listChildren().some(c => c.getName() === 'Hips')); const s0 = arm.getScale(), k0 = +process.env.SCALE; arm.setScale([s0[0] * k0, s0[1] * k0, s0[2] * k0]); console.log('escala', k0); }
const canon = n => { n = n.replace(/^mixamorig[:_]?/, ''); return ({ Spine: 'Spine02', Spine1: 'Spine01', Spine2: 'Spine', Neck: 'neck', HeadTop_End: 'head_end' })[n] || n; };
const isMix = RS.listNodes().some(n => /^mixamorig/.test(n.getName()));
const sNodes = new Map(RS.listNodes().map(n => [isMix ? canon(n.getName()) : n.getName(), n])), dNodes = new Map(RD.listNodes().map(n => [n.getName(), n]));
const BONES = RD.listSkins()[0].listJoints().map(j => j.getName()).filter(n => sNodes.has(n) && n !== 'headfront' && n !== 'head_end');
const parentOf = (root, node) => root.listNodes().find(p => p.listChildren().includes(node)) || null;
/* repouso */
const restLocal = n => ({ t: new T.Vector3(...n.getTranslation()), r: new T.Quaternion(...n.getRotation()), s: new T.Vector3(...n.getScale()) });
const worldMat = (root, n, localOf) => { const chain = []; for (let c = n; c; c = parentOf(root, c)) chain.unshift(c); const M = new T.Matrix4(); for (const c of chain) { const L = localOf(c); M.multiply(new T.Matrix4().compose(L.t, L.r, L.s)); } return M; };
const qOf = M => { const p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3(); M.decompose(p, q, s); return { p, q, s }; };
const sRestW = new Map(), dRestW = new Map();
for (const b of BONES) { sRestW.set(b, qOf(worldMat(RS, sNodes.get(b), restLocal))); dRestW.set(b, qOf(worldMat(RD, dNodes.get(b), restLocal))); }
const hipS = sRestW.get('Hips').p.y, hipD = dRestW.get('Hips').p.y, k = hipD / hipS;
const dHipParentW = worldMat(RD, parentOf(RD, dNodes.get('Hips')), restLocal), dHipParentInv = dHipParentW.clone().invert();
console.log('altura do quadril: base', hipS.toFixed(3), '→ personagem', hipD.toFixed(3), 'k', k.toFixed(3), '·', BONES.length, 'ossos');
/* tira as animações próprias */
for (const a of RD.listAnimations()) { for (const c of a.listChannels()) c.dispose(); for (const s of a.listSamplers()) { s.getInput() && s.getInput().dispose(); s.getOutput() && s.getOutput().dispose(); s.dispose(); } a.dispose(); }
const buf = RD.listBuffers()[0];
/* amostragem de um canal */
function sampler(ch) {
  const s = ch.getSampler(), ti = s.getInput().getArray(), vo = s.getOutput().getArray(), n = ch.getTargetPath() === 'rotation' ? 4 : 3, step = s.getInterpolation() === 'STEP', cub = s.getInterpolation() === 'CUBICSPLINE';
  const val = i => { const o = cub ? (i * 3 + 1) * n : i * n; return Array.from(vo.slice(o, o + n)); };
  return t => { if (t <= ti[0]) return val(0); const L = ti.length - 1; if (t >= ti[L]) return val(L); let i = 0; while (ti[i + 1] < t) i++; const a = val(i), b = val(i + 1); if (step) return a; const u = (t - ti[i]) / (ti[i + 1] - ti[i]);
    if (n === 4) { const qa = new T.Quaternion(...a), qb = new T.Quaternion(...b); return qa.slerp(qb, u).toArray(); } return a.map((x, j) => x + (b[j] - x) * u); };
}
for (const an of RS.listAnimations()) {
  const tr = new Map(); let dur = 0;
  for (const ch of an.listChannels()) { const n = ch.getTargetNode(); if (!n) continue; const nm = isMix ? canon(n.getName()) : n.getName(); const e = tr.get(nm) || {}; e[ch.getTargetPath()] = sampler(ch); tr.set(nm, e); const ti = ch.getSampler().getInput().getArray(); dur = Math.max(dur, ti[ti.length - 1]); }
  const fps = 30, N = Math.max(2, Math.round(dur * fps) + 1), times = new Float32Array(N); for (let i = 0; i < N; i++) times[i] = Math.min(dur, i / fps);
  const rotOut = new Map(BONES.map(b => [b, new Float32Array(N * 4)])), hipOut = new Float32Array(N * 3);
  /* nós da base em ordem de hierarquia */
  const order = []; const visit = n => { order.push(n); for (const c of n.listChildren()) visit(c); }; for (const r of RS.listScenes()[0].listChildren()) visit(r);
  for (let i = 0; i < N; i++) {
    const t = times[i], W = new Map();
    const localAt = n => { const nm = isMix ? canon(n.getName()) : n.getName(), L = restLocal(n), e = tr.get(nm); if (e) { if (e.rotation) L.r.fromArray(e.rotation(t)); if (e.translation) L.t.fromArray(e.translation(t)); if (e.scale) L.s.fromArray(e.scale(t)); } return L; };
    for (const n of order) { const p = parentOf(RS, n), L = localAt(n), M = new T.Matrix4().compose(L.t, L.r, L.s); W.set(n, p ? W.get(p).clone().multiply(M) : M); }
    const dW = new Map();   /* mundo do personagem, calculado de pai para filho */
    for (const b of BONES) {
      const sw = qOf(W.get(sNodes.get(b))).q, want = sw.clone().multiply(sRestW.get(b).q.clone().invert()).multiply(dRestW.get(b).q);
      const dp = parentOf(RD, dNodes.get(b)), pw = dp && dW.has(dp.getName()) ? dW.get(dp.getName()) : qOf(worldMat(RD, dp, restLocal)).q;
      const loc = pw.clone().invert().multiply(want); dW.set(b, want); loc.toArray(rotOut.get(b), i * 4);
    }
    const sp = new T.Vector3().setFromMatrixPosition(W.get(sNodes.get('Hips'))), d = sp.sub(sRestW.get('Hips').p).multiplyScalar(k), wp = dRestW.get('Hips').p.clone().add(d).applyMatrix4(dHipParentInv); wp.toArray(hipOut, i * 3);
  }
  const A = D.createAnimation(an.getName()), inp = D.createAccessor().setType('SCALAR').setArray(times).setBuffer(buf);
  const add = (node, path, arr, type) => { const o = D.createAccessor().setType(type).setArray(arr).setBuffer(buf), s = D.createAnimationSampler().setInput(inp).setOutput(o).setInterpolation('LINEAR'); A.addSampler(s); A.addChannel(D.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(s)); };
  for (const b of BONES) add(dNodes.get(b), 'rotation', rotOut.get(b), 'VEC4');
  add(dNodes.get('Hips'), 'translation', hipOut, 'VEC3');
}
await io.write(out, D);
console.log(out.split('/').pop(), (fs.statSync(out).size / 1048576).toFixed(1) + ' MB', RD.listAnimations().length, 'animações');
