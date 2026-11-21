// Junta animações num GLB riggado (Mixamo): renomeia as do Meshy (que vêm com código) e traz clipes de outro
// GLB com o mesmo esqueleto (só rotações + posição do quadril, ajustada à altura do novo quadril).
// uso: [TRAZER=Clipe1,Clipe2] node juntar_anims.mjs <novo.glb> <antigo.glb> <saida.glb>
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import fs from 'fs';
const [src, old, dst] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const A = await io.read(src), B = await io.read(old), RA = A.getRoot();
/* nomes das animações geradas por texto (ordem do arquivo do Meshy) */
const RENOMEAR = { '_01a1f616': 'Rifle_Idle', '_01a1f617': 'Rifle_Aim_Idle', '_01a1f61c': 'Strafe_Right', '_01a1f61d': 'Strafe_Left', '_01a1f621': 'Rifle_Reload',
  '_01a1f626': 'Dance_Requebra', '_01a1f629': 'Grenade_Throw', '_01a1f62b': 'Dance_Forro', '_01a1f62c': 'Dance_Rebolado', '_01a1f62d': 'Dance_Galinha', '_01a1f62e': 'Victory', '_01a1f62f': 'Defeat' };
for (const a of RA.listAnimations()) { a.setName(a.getName().replace(/_inplace$/, '').replace(/^Cautious_Crouch_Walk_Forward$/, 'Cautious_Crouch_Walk_Forward')); const k = Object.keys(RENOMEAR).find(p => a.getName().startsWith(p)); if (k) a.setName(RENOMEAR[k]); }
const TRAZER = process.env.TRAZER ? process.env.TRAZER.split(',') : ['Cautious_Crouch_Walk_Backward', 'CrouchLookAroundBow', 'Crouch_Walk_Left_with_Gun_inplace', 'Dead', 'dying_backwards', 'Jump_Over_Obstacle_2', 'Kneeling_Reload'];   /* TRAZER=a,b,c para escolher */
const byName = new Map(RA.listNodes().map(n => [n.getName(), n])), buf = RA.listBuffers()[0];
const hipA = byName.get('mixamorig:Hips').getTranslation()[1], hipB = B.getRoot().listNodes().find(n => n.getName() === 'mixamorig:Hips').getTranslation()[1], k = hipA / hipB;
for (const an of B.getRoot().listAnimations()) {
  if (!TRAZER.includes(an.getName()) || RA.listAnimations().some(a => a.getName() === an.getName())) continue;
  const out = A.createAnimation(an.getName());
  for (const ch of an.listChannels()) {
    const n = ch.getTargetNode(), path = ch.getTargetPath(), tn = n && byName.get(n.getName()); if (!tn) continue;
    const hips = n.getName() === 'mixamorig:Hips'; if (path === 'scale' || (path === 'translation' && !hips)) continue;
    const s = ch.getSampler(), inp = A.createAccessor().setType('SCALAR').setArray(new Float32Array(s.getInput().getArray())).setBuffer(buf);
    const o = new Float32Array(s.getOutput().getArray()); if (path === 'translation') for (let i = 0; i < o.length; i++) o[i] *= k;
    const outp = A.createAccessor().setType(s.getOutput().getType()).setArray(o).setBuffer(buf);
    const sm = A.createAnimationSampler().setInput(inp).setOutput(outp).setInterpolation(s.getInterpolation()); out.addSampler(sm);
    out.addChannel(A.createAnimationChannel().setTargetNode(tn).setTargetPath(path).setSampler(sm));
  }
}
await io.write(dst, A);
console.log(dst.split('/').pop(), (fs.statSync(dst).size / 1048576).toFixed(1) + ' MB', RA.listAnimations().map(a => a.getName()).join(', '));
