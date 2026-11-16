(async () => {
  try {
    const cv = document.getElementById('cv'); cv.style.cssText = 'position:fixed;left:0;top:0;width:10px;height:10px';
    const R = new Renderer(cv, Object.assign({}, settings, { quality: 'medio' })); await R.init(); window.G = { R };
    document.body.style.cssText = 'background:#2a2018;overflow:auto;height:auto;font:14px sans-serif;color:#fff';
    const ids = (window.ICON_IDS || Object.keys(ITEMS)); const wrap = document.createElement('div'); wrap.style.cssText = 'display:grid;grid-template-columns:repeat(4,320px);gap:8px;padding:8px';
    for (const id of ids) { const d = document.createElement('div'); d.style.cssText = 'background:radial-gradient(#5a4632,#2a2018);border-radius:8px;text-align:center'; d.innerHTML = Icons.img(id, 'md') + '<div>' + id + '</div>'; wrap.appendChild(d); }
    document.body.appendChild(wrap); window.ready = true;
  } catch (e) { window.err = String(e && e.stack || e); }
})();
