/* =====================================================================
   598_portraits_ui.js — rostinhos (menu, HUD, esquadrão, amigos) feitos
   com o PRÓPRIO modelo 3D do personagem (o que você vê é o que joga)
   ===================================================================== */
'use strict';
(function () {
  const cache = new Map(), base = drawFace;
  const headIcon = i => {
    if (cache.has(i)) return cache.get(i); if (typeof G === 'undefined' || !G.R || !G.R.ready) return null;
    const g3 = Icon3D.char({ skin: i }, { face: true, w: 128, h: 128, ry: .3, ss: 2 }); if (g3 === null || (g3 === undefined && BODY3D.tex && !Icon3D.on())) return null;   /* 3D ainda não pronto: tenta depois (não guarda o rosto antigo) */ if (g3) { cache.set(i, g3); return g3; }
    let c = null; try { const S = SKINS[i]; c = G.R.renderIcon(m => { m.push().ry(PI + .3); drawHeadToon(m, S, hatOf(i), null, 0); m.pop(); }, { w: 128, h: 128, rx: .06, ry: 0, ss: 2, pad: 1.0, sphere: true }); } catch (e) { c = null; }
    if (c) cache.set(i, c); return c;
  };
  const lookIcon = L => {
    if (cache.has(L)) return cache.get(L); if (typeof G === 'undefined' || !G.R || !G.R.ready) return null;
    const far = typeof FARMERS !== 'undefined' ? Object.keys(FARMERS).find(f => agentLook(f) === L) : '';
    const g3 = far ? Icon3D.char({ farmer: far }, { face: true, w: 128, h: 128, ry: .3, ss: 2 }) : undefined; if (g3 === null || (g3 === undefined && far && BODY3D.tex && !Icon3D.on())) return null; if (g3) { cache.set(L, g3); return g3; }
    let c = null; try { c = G.R.renderIcon(m => { m.push().ry(PI + .3); if (typeof HUMANO !== 'undefined' && HUMANO) drawHeadToon(m, L, L.hat === 'none' ? '' : L.hat, null, 0); else drawHead(m, L, L.special, L.hat === 'none' ? '' : L.hat); m.pop(); }, { w: 128, h: 128, rx: .08, ry: 0, ss: 2, pad: .92 }); } catch (e) { c = null; }
    if (c) cache.set(L, c); return c;
  };
  window.drawFace = function (cv, skinIdx, px) {
    /* modelo 3D ainda carregando: desenha o antigo agora e redesenha quando o retrato novo ficar pronto */
    const want3 = typeof Icon3D !== 'undefined' && BODY3D.tex && (!skinIdx || typeof skinIdx !== 'object' || !skinIdx.special);
    if (want3 && !cache.has(skinIdx && typeof skinIdx === 'object' ? skinIdx : (skinIdx | 0) % SKINS.length) && !cv.__retry) { cv.__retry = 1; setTimeout(() => { cv.__retry = 0; window.drawFace(cv, skinIdx, px); }, 700); }
    if (skinIdx && typeof skinIdx === 'object' && !skinIdx.special) { const ic = lookIcon(skinIdx);
      if (ic) { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); const g = c.createRadialGradient(cv.width / 2, cv.height * .38, 4, cv.width / 2, cv.height / 2, cv.width * .7); g.addColorStop(0, '#f6e7c6'); g.addColorStop(1, '#b08c5a'); c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(ic, 0, 0, cv.width, cv.height); return; } }
    if (typeof skinIdx !== 'object' || !skinIdx) {
      const i = (skinIdx | 0) % SKINS.length; if (SKINS[i].toon) { const ic = headIcon(i);
        if (ic) { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); const g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#3a5a9a'); g.addColorStop(1, '#1a2448'); c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(ic, 0, 0, cv.width, cv.height); cv.style.imageRendering = 'auto'; return; } }
    }
    return base(cv, skinIdx, px);
  };
})();
