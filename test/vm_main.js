/* teste do viewmodel: renderiza cada arma/estado em primeira pessoa */
(async () => {
  const cv = document.getElementById('cv'); const R = new Renderer(cv, Object.assign({}, settings, { quality: 'alto' })); window.R = R; await R.init();
  const map = buildFazenda(1); window.map = map; R.setScene(R.buildScene(map.render)); window.vm = new ViewModel();
  const sp = map.spawns.atk[0]; const gy = map.W.heightAt(sp.x, sp.z);
  const mk = (w) => ({ w, ads: false, equipT: 0, relT: 0, relMax: 2.35, cdT: 0, throwT: 0, windT: 0, useT: 0, useMax: 3.2, useK: '', mag: { galho: 30, estilingue: 12, vassoura: 5, colher: 35 }, own: { galho: 0, estilingue: 0, vassoura: 0, colher: 0, faca: 0 }, m: { hspd: 0, gnd: true, cr: 0, sliding: false, sprinting: false, vy: 0, stepD: 0 } });
  window.shot = (o) => {
    o = o || {}; const P = mk(o.w || 'galho'); Object.assign(P, o.P || {}); Object.assign(P.m, o.m || {});
    if (o.hip) VM_HIP[o.w || 'galho'] = o.hip;
    const v = o.fresh ? new ViewModel() : window.vm; window.vm = v; v.update(1 / 60, P, 0, 0);
    if (o.relU !== undefined) { P.relMax = WEAPONS[P.w].reload; if (o.empty) P.mag[P.w] = 0; P.relT = P.relMax * .999; v.update(1 / 60, P, 0, 0); P.relT = P.relMax * (1 - o.relU); }
    P.ads = !!o.ads; if (o.ads) { for (let i = 0; i < 60; i++) v.update(1 / 60, P, 0, 0); }
    if (o.swing) { v.meleeStart(o.swing); v.swing.t = o.swingT || 0; }
    if (o.throwU !== undefined) { P.throwT = .32 * (1 - o.throwU); v.throwAnim = o.throwU; }
    if (o.sprint) { P.m.sprinting = true; P.m.hspd = 7; for (let i = 0; i < 60; i++) { P.m.stepD += 7 / 60; v.update(1 / 60, P, 0, 0); } }
    if (o.useK) { P.useK = o.useK; P.useT = o.useT || 1; for (let i = 0; i < 40; i++) v.update(1 / 60, P, 0, 0); }
    if (o.fire) { v.fire(P.w, !!o.ads); v.update(0.01, P, 0, 0); }
    v.update(1 / 60, P, 0, 0);
    R.setEnv(o.env || 'dia'); R.beginFrame(); R.time = 2; v.draw(R.vmMB, P, o.skin || 0, 2);
    R.render({ x: sp.x, y: gy + 1.62, z: sp.z, yaw: sp.yaw, pitch: -.02, roll: 0, fov: 58.7 }, { vm: true, vmFov: o.vmFov || 55 });
    return { muz: v.muz, relU: v.relU };
  };
  window.ready = true;
})().catch(e => { window.err = String(e && e.stack || e); console.error(e); });
