import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune, dedup, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { execFileSync } from 'child_process'; import fs from 'fs';
const [src, dst, ratio, texSize] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc = await io.read(src); const root = doc.getRoot();
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) { if (p.getAttribute('TANGENT')) p.setAttribute('TANGENT', null); }
for (const m of root.listMaterials()) { m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setMetallicFactor(0); m.setRoughnessFactor(.85); m.setDoubleSided(false); }
await doc.transform(prune(), dedup(), weld({ tolerance: 0.0001 }), simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: +(process.env.ERR || 0.002), lockBorder: false }), resample(), prune());
for (const t of root.listTextures()) {
  const tmp = (process.env.TMPDIR || '/tmp') + '/_bombaki_tex_' + process.pid + '_' + root.listTextures().indexOf(t); fs.writeFileSync(tmp + '.in', Buffer.from(t.getImage()));
  execFileSync('python3', ['-I', '-c', `from PIL import Image; im=Image.open('${tmp}.in').convert('RGB'); im=im.resize((${texSize},${texSize}), Image.LANCZOS); im.save('${tmp}.jpg', quality=86)`]);
  t.setImage(new Uint8Array(fs.readFileSync(tmp + '.jpg'))).setMimeType('image/jpeg');
}
await io.write(dst, doc);
let tris = 0; for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) tris += p.getIndices().getCount() / 3;
console.log(dst.split('/').pop(), (fs.statSync(dst).size / 1024).toFixed(0) + ' KB', Math.round(tris) + ' tris', root.listAnimations().map(a => a.getName()).join(','));
