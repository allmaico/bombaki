/* teste do motor: cena simples com terreno, caixas, árvores e personagem */
(async () => {
  const cv = document.getElementById('cv'); const R = new Renderer(cv, Object.assign({}, settings, { quality: 'alto' }));
  window.R = R; const t0 = performance.now();
  await R.init(p => { document.title = 'tex ' + (p * 100 | 0); });
  window.texMs = performance.now() - t0;
  /* terreno 80x80 */
  const hf = (x, z) => Math.sin(x * .07) * Math.cos(z * .06) * 1.6 + Math.sin(x * .021 + z * .017) * 3 - (x * x + z * z) * .0002 * 0;
  const terr = [];
  for (let cz = -2; cz < 2; cz++) for (let cx = -2; cx < 2; cx++) {
    const mb = new MB(4096), S = 20, N = 20; mb.mat(TX.white, 0, 0, 0, 0);
    const x0 = cx * S, z0 = cz * S; mb._grow((N + 1) * (N + 1), N * N * 6);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = x0 + i * S / N, z = z0 + j * S / N, h = hf(x, z), e = .5; const nx = -(hf(x + e, z) - hf(x - e, z)) / (2 * e), nz = -(hf(x, z + e) - hf(x, z - e)) / (2 * e);
      const path = Math.exp(-Math.pow((x - z * .3) / 3, 2)); const g = 1 - path;
      mb.cw = ((255 * (j & 1 ? 255 : 255) << 24) | ((0) << 16) | ((path * 255 | 0) << 8) | (g * 255 | 0)) >>> 0; mb._v(x, h, z, nx, 1, nz, 0, 0);
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i; mb._q(a, a + N + 1, a + N + 2, a + 1); }
    terr.push({ mb });
  }
  const mb = new MB(8192);
  /* celeiro */
  mb.push().tr(8, hf(8, -6), -6);
  mb.mat(TX.barn, 0, 0, 0, 0).col(0xffffff).uvs(.5, .5).box(10, 5, 8, 0, 2.5, 0);
  mb.mat(TX.shingle, 20).col(0xaaaaaa).uvs(.35, .35).gable(11.4, 3.2, 9, 0, 5, 0);
  mb.mat(TX.trim, 0).col(0xffffff).uvs(.5, .5).box(3.2, 3.6, .25, 0, 1.8, 4.05);
  mb.mat(TX.door, 0).col(0xffffff).uvs(.33, .27).box(2.8, 3.2, .3, 0, 1.6, 4.1);
  mb.pop();
  /* container */
  mb.push().tr(-6, hf(-6, -3), -3).ry(.4); mb.mat(TX.cont, 120).col(0x2f6fd0).uvs(.4, .4).box(6, 2.6, 2.4, 0, 1.3, 0); mb.pop();
  mb.push().tr(-6, hf(-6, -3) + 2.6, -3).ry(.4); mb.mat(TX.cont, 120).col(0xd04a2a).uvs(.4, .4).box(6, 2.6, 2.4, 0, 1.3, 0); mb.pop();
  /* árvore */
  for (let k = 0; k < 6; k++) { const x = -14 + k * 3.7, z = 6 + (k % 2) * 4, y = hf(x, z); mb.push().tr(x, y, z); mb.mat(TX.bark, 0).col(0xffffff).uvs(1, .5).cyl(.28, .18, 4, 8); mb.mat(TX.leaf, 0, 120).col(0xffffff).uvs(.35, .35).sph(2.4, 2, 2.4, 10, 7, 0, 5, 0).sph(1.7, 1.5, 1.7, 8, 6, 1.2, 4.2, .5); mb.pop(); }
  /* personagem */
  mb.push().tr(2, hf(2, 4), 4);
  mb.mat(TX.cloth, 0).col(0x2f55d6).uvs(1).box(.6, .8, .34, 0, 1.3, 0).col(0x1c1c26).box(.26, .75, .3, -.15, .4, 0).box(.26, .75, .3, .15, .4, 0).col(0x2f55d6).box(.2, .7, .22, -.42, 1.3, 0).box(.2, .7, .22, .42, 1.3, 0);
  mb.mat(TX.white, 0).col(0xf2b88c).box(.46, .46, .46, 0, 1.95, 0);
  mb.mat(TX.face, 0, 0, 0, 1).col(0xffffff).quad([-.23, 1.72, .232], [.23, 1.72, .232], [.23, 2.18, .232], [-.23, 2.18, .232]);
  mb.pop();
  /* feno + cerca */
  for (let k = 0; k < 14; k++) { mb.push().tr(-3 + k * 1.6, hf(-3 + k * 1.6, 12), 12); mb.mat(TX.wood, 0).col(0xffffff).uvs(.5, .5).box(.18, 1.2, .18, 0, .6, 0).box(1.6, .12, .08, .8, 1.0, 0).box(1.6, .12, .08, .8, .55, 0); mb.pop(); }
  mb.mat(TX.hay, 0).col(0xffffff).uvs(.6, .6).cyl(1.1, 1.1, 1.3, 14, 4, hf(4, 10), 10); 
  const scene = R.buildScene({ terrain: terr, chunks: [{ mb }], inst: [], bounds: [-40, -40, 40, 40] }); R.setScene(scene);
  window.renderOnce = (cam, env) => { R.setEnv(env || 'dia'); R.beginFrame(); R.time = 3; R.render(cam); };
  cv.style.width = '100vw'; cv.style.height = '100vh';
  window.ready = true;
})().catch(e => { window.err = String(e && e.stack || e); console.error(e); });
