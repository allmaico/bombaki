(async () => {
  const cv = document.getElementById('cv'); const R = new Renderer(cv, Object.assign({}, settings, { quality: 'alto' })); window.R = R; await R.init();
  const map = buildFazenda(1); window.map = map; R.setScene(R.buildScene(map.render));
  window.show = (t, camx, camy, camz, yaw, pitch) => {
    R.setEnv('dia'); R.beginFrame(); R.time = t; const m = R.dyn; const bx0 = -112, bz0 = 8;
    const g = (x, z) => map.W.heightAt(x, z);
    for (let i = 0; i < 7; i++) { const x = bx0 + i * 1.4 - 4.5, z = bz0; drawChar(m, { x, y: g(x, z), z, yaw: Math.PI, pitch: 0, skin: i, team: i % 2 + 1, wid: ['galho', 'estilingue', 'vassoura', 'colher', 'faca', 'batata', 'galho'][i], cr: 0, spd: 0, wph: 0, bomb: i === 6 }, { time: t }); }
    for (let i = 0; i < 4; i++) { const x = bx0 + i * 1.4 - 4.5, z = bz0 - 3; drawChar(m, { x, y: g(x, z), z, yaw: Math.PI, pitch: 0, skin: i, team: 0, wid: 'galho', cr: i === 1 ? 1 : 0, spd: i === 2 ? 6 : 0, wph: t * 10, slide: i === 3, dead: i === 0 ? 1 : 0 }, { time: t }); }
    ['galho', 'estilingue', 'vassoura', 'colher', 'faca', 'batata', 'mandioca'].forEach((id, i) => { const x = bx0 + i * 1.0 - 3.2, z = bz0 - 6.5; m.push().tr(x, g(x, z) + 1.0, z).ry(Math.PI * .5 + .3).sc(1.4); drawWeapon(m, id, {}); m.pop(); });
    drawBombWorld(m, { x: bx0 + 3, y: g(bx0 + 3, bz0 - 8), z: bz0 - 8, armed: true }, t);
    drawCow(m, { x: bx0 - 4, y: g(bx0 - 4, bz0 - 8), z: bz0 - 8, rot: 1, ph: 0 }, t);
    R.render({ x: camx, y: camy, z: camz, yaw: yaw, pitch: pitch, roll: 0, fov: 60 });
  };
  window.ready = true;
})().catch(e => { window.err = String(e && e.stack || e); console.error(e); });
