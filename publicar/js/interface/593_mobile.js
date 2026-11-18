/* =====================================================================
   593_mobile.js — CELULAR: tela cheia (esconde o navegador e trava na
   horizontal), barra do jogo (⛶ tela cheia · ⏸ menu · ✖ sair), resolução
   automática (nítido sem travar), habilidades e armas tocáveis no HUD.
   ===================================================================== */
'use strict';
const Full = {
  el: () => document.documentElement,
  api() { const e = this.el(); return !!(e.requestFullscreen || e.webkitRequestFullscreen); },
  isOn() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  isIOS: () => /iPhone|iPad|iPod/i.test(navigator.userAgent || '') && !window.MSStream,
  standalone: () => (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || navigator.standalone === true,
  async enter(quiet) {
    if (this.isOn() || this.standalone()) return true; const e = this.el();
    try { if (e.requestFullscreen) await e.requestFullscreen({ navigationUI: 'hide' }); else if (e.webkitRequestFullscreen) e.webkitRequestFullscreen(); }
    catch (er) { if (!quiet) this.hint(); return false; }
    try { if (screen.orientation && screen.orientation.lock && IS_TOUCH) await screen.orientation.lock('landscape'); } catch (er) { }
    setTimeout(() => { if (G.R) G.R.resize(); }, 250); return true;
  },
  exit() { try { if (document.exitFullscreen) document.exitFullscreen(); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); } catch (e) { } },
  userOff: false,
  toggle() { if (this.isOn()) { this.userOff = true; this.exit(); } else if (!this.api()) this.hint(); else { this.userOff = false; this.enter(); } },
  hint() {
    if (this.isIOS()) UI.toast('No iPhone: toque em Compartilhar ⬆️ → "Adicionar à Tela de Início" e abra o BOMBAKI por lá — fica em tela cheia.', 7000);
    else UI.toast('Este navegador não deixou entrar em tela cheia. Abra o link no Chrome (⋮ → Abrir no Chrome) e toque em ⛶.', 6000);
  }
};
/* ---------- barra do jogo (aparece no celular; no PC também, discreta) ---------- */
const GameBar = {
  init() {
    const b = document.createElement('div'); b.id = 'gbar';
    b.innerHTML = `<button data-g="full" title="Tela cheia">⛶</button><button data-g="emo" title="Emotes">☺</button><button data-g="menu" title="Menu / pausa">⏸</button><button data-g="exit" title="Sair da partida">✖</button>`;
    $('hud').appendChild(b);
    let lastT = 0; const act = g => { const now = performance.now(); if (now - lastT < 450) return; lastT = now; sfx.ui && sfx.ui(0); if (g === 'full') Full.toggle(); else if (g === 'emo') EmoteWheel.toggle(); else if (g === 'menu') this.menu(); else if (g === 'exit') this.confirmExit(); };
    b.addEventListener('touchstart', e => { if (e.target.closest('[data-g]')) { e.preventDefault(); e.stopPropagation(); } }, { passive: false });
    b.addEventListener('touchend', e => { const t = e.target.closest('[data-g]'); if (!t) return; e.preventDefault(); e.stopPropagation(); act(t.dataset.g); }, { passive: false });   /* touchend = gesto válido para tela cheia */
    b.addEventListener('click', e => { const t = e.target.closest('[data-g]'); if (t) act(t.dataset.g); });
    /* menu da tela inicial: botão de tela cheia no canto */
    const mf = document.createElement('button'); mf.id = 'menuFull'; mf.textContent = '⛶ Tela cheia'; mf.onclick = () => Full.toggle(); const menu = $('menu'); if (menu) menu.appendChild(mf);
    /* pausa: botão de tela cheia junto de Continuar / Configurações / Sair */
    const pr = $('pause') && $('pause').querySelector('.row'); if (pr) { const fb = document.createElement('button'); fb.className = 'btn'; fb.id = 'pFull'; fb.textContent = '⛶ Tela cheia'; fb.onclick = () => Full.toggle(); pr.insertBefore(fb, $('pLeave')); }
    const upd = () => { const on = Full.isOn(); b.querySelector('[data-g=full]').classList.toggle('on', on); mf.textContent = on ? '⛶ Sair da tela cheia' : '⛶ Tela cheia'; mf.style.display = Full.api() || Full.isIOS() ? '' : 'none'; setTimeout(() => G.R && G.R.resize(), 200); };
    document.addEventListener('fullscreenchange', upd); document.addEventListener('webkitfullscreenchange', upd); upd();
  },
  menu() { if (G.scene !== 'play') return; Input.btn[0] = false; Input.v.fire = false; showPause(true); try { document.exitPointerLock(); } catch (e) { } },
  confirmExit() {
    if (G.scene !== 'play') return; const was = G.paused; if (G.kind === 'offline') G.paused = true;
    const m = UI.open(`<h2>Sair da partida?</h2><p>${G.kind === 'offline' ? 'O treino será encerrado.' : 'Você sai da sala (um bot assume a sua vaga).'}</p><div class="row" style="justify-content:center;margin-top:14px"><button class="btn" id="exNo">Continuar jogando</button><button class="btn r" id="exYes">Sair da partida</button></div>`, '', () => { G.paused = was; });
    m.querySelector('#exNo').onclick = () => { UI.close(); G.paused = was; };
    m.querySelector('#exYes').onclick = () => { UI.close(); showPause(false); Game.leave(); };
  }
};
/* ---------- resolução automática: o mais nítido possível mantendo ~50+ FPS ---------- */
const AutoRes = {
  acc: 0, n: 0, k: 1, cool: 0,
  tick(dt) {
    if (!G.R || G.scene !== 'play' || settings.autoRes === false || G.paused) return;
    this.acc += dt; this.n++; this.cool -= dt; if (this.acc < 1.5) return;
    const fps = this.n / this.acc; this.acc = 0; this.n = 0; if (this.cool > 0) return; let k = this.k;
    const target = settings.fpsCap && settings.fpsCap < 50 ? settings.fpsCap - 3 : 46;
    if (fps < target) k = Math.max(.5, k * (fps < target * .7 ? .82 : .9)); else if (fps > target + 10 && k < 1) k = Math.min(1, k * 1.07);
    if (Math.abs(k - this.k) > .01) { this.k = k; G.R.autoK = k; G.R.resize(); this.cool = 2; }
  },
  reset() { this.k = 1; this.acc = 0; this.n = 0; if (G.R) { G.R.autoK = 1; G.R.resize(); } }
};
/* ---------- habilidades (Z X C F) e armas tocáveis no HUD ---------- */
const TouchHud = {
  init() {
    if (!IS_TOUCH) return;
    const hit = (sel, fn) => document.addEventListener('touchstart', e => { const t = e.target.closest && e.target.closest(sel); if (!t || G.scene !== 'play') return; e.preventDefault(); e.stopPropagation(); fn(t); }, { passive: false, capture: true });
    hit('#abhud .ab-slot', t => { Input.acts.push('ab:' + t.dataset.i); t.classList.add('dn'); setTimeout(() => t.classList.remove('dn'), 160); });
    hit('#hotbar > *', t => { const i = [...t.parentElement.children].indexOf(t); if (i >= 0) Input.acts.push('s' + (i + 1)); });
  }
};
(function () {
  /* migração: celulares que estavam no "Baixo" padrão passam para o modo nítido com resolução automática */
  if (IS_TOUCH && !settings.mob2) { if (!settings.quality || settings.quality === 'baixo') settings.quality = 'celular'; settings.autoRes = true; if (!(settings.renderScale >= .9)) settings.renderScale = 1; settings.mob2 = 1;  try { saveSettings(); } catch (e) { } }
  if (settings.autoRes === undefined) settings.autoRes = IS_TOUCH;
  if (IS_TOUCH && settings.touchLayoutV !== 3) { settings.touchLayout = {}; settings.touchLayoutV = 3; try { saveSettings(); } catch (e) { } }   /* novo arranjo dos botões */
  /* qualquer toque (gesto completo) durante a partida no celular: entra em tela cheia, a menos que o jogador tenha saído de propósito pelo ⛶ */
  document.addEventListener('touchend', () => { if (IS_TOUCH && settings.autoFull !== false && !Full.userOff && G.scene === 'play' && !Full.isOn() && Full.api()) Full.enter(true); }, { capture: true, passive: true });
  /* sons de interface em todos os botões (passar o mouse e clicar) */
  let lastHover = null; document.addEventListener('mouseover', e => { const b = e.target.closest && e.target.closest('button, .btn, .as-card, .sc-card, .bg-it, .seg > *'); if (b && b !== lastHover && !b.disabled) { lastHover = b; sfx.uiHover && sfx.uiHover(); } else if (!b) lastHover = null; }, true);
  const go = () => { GameBar.init(); TouchHud.init(); if (IS_TOUCH) document.body.classList.add('mobile'); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
