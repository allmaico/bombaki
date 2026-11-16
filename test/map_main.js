(async () => {
  const cv = document.getElementById('cv'); const R = new Renderer(cv, Object.assign({}, settings, { quality: window.QL || 'alto' }));
  window.R = R; await R.init();
  const t0 = performance.now(); const map = buildFazenda(1); window.mapMs = performance.now() - t0; window.map = map;
  const sc = R.buildScene(map.render); R.setScene(sc);
  window.renderOnce = (cam, env, t) => { R.setEnv(env || 'dia'); R.beginFrame(); R.time = t || 3; R.render(cam); };
  window.ready = true;
})().catch(e => { window.err = String(e && e.stack || e); console.error(e); });
