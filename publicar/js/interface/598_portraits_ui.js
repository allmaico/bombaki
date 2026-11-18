/* =====================================================================
   598_portraits_ui.js — rostinhos (menu, HUD, esquadrão, amigos) feitos
   com o PRÓPRIO modelo 3D do personagem (o que você vê é o que joga)
   ===================================================================== */
'use strict';
(function () {
  const cache = new Map(), base = drawFace;
  const headIcon = i => {
    if (cache.has(i)) return cache.get(i); if (typeof G === 'undefined' || !G.R || !G.R.ready) return null;
    let c = null; try { const S = SKINS[i]; c = G.R.renderIcon(m => { m.push().ry(PI + .3); drawHeadToon(m, S, hatOf(i), null, 0); m.pop(); }, { w: 128, h: 128, rx: .06, ry: 0, ss: 2, pad: 1.0, sphere: true }); } catch (e) { c = null; }
    if (c) cache.set(i, c); return c;
  };
  window.drawFace = function (cv, skinIdx, px) {
    if (typeof skinIdx !== 'object' || !skinIdx) {
      const i = (skinIdx | 0) % SKINS.length; if (SKINS[i].toon) { const ic = headIcon(i);
        if (ic) { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); const g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#3a5a9a'); g.addColorStop(1, '#1a2448'); c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(ic, 0, 0, cv.width, cv.height); cv.style.imageRendering = 'auto'; return; } }
    }
    return base(cv, skinIdx, px);
  };
})();
