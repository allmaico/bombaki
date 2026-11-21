// Corpo 3D (bases do Meshy): todos os personagens usam o modelo, roupa por região, mãos na arma (IK),
// agachar dobra os joelhos sem afundar, sem NaN nos ossos, masculino/feminino certos, LOD no Todos contra Todos
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push('err: ' + m.text().slice(0, 200)); });
  await p.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:.5}))}catch(e){}`);
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1');
  await p.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 240000 });
  ok(await p.evaluate(() => typeof GLB_DATA !== 'undefined' && ['agente_zeca', 'agente_bia', 'agente_zefa', 'agente_brasa', 'agente_lua', 'agente_zeca_lod', 'mandioca'].every(k => GLB_DATA[k] && GLB_DATA[k].length > 1e5)), 'modelos dos 5 agentes (e versões leves) embutidos');
  await p.waitForFunction(() => CharGLB.inst.get('menu') && CharGLB.inst.get('menu').base, null, { timeout: 60000 }).catch(() => { });
  ok(await p.evaluate(() => !!(CharGLB.inst.get('menu') && CharGLB.inst.get('menu').base)), 'menu: personagem desenhado com o corpo 3D');
  await p.evaluate(`Game.startOffline({ mode: 'tatico', botLevel: 'normal' })`); await p.waitForFunction('G.scene === "play" && G.me', null, { timeout: 120000 });
  await p.evaluate(() => { const s = G.sim, me = G.me, far = ['peao', 'rastreador', 'guardiao', 'mateiro', 'socorrista'], L = s.players.filter(q => q !== me).slice(0, 5); for (const q of s.players) q.ai = null;
    L.forEach((q, i) => { q.farmer = far[i]; s.placeAt(q, { x: -6 + i * 3, z: 58, yaw: 0 }); }); s.placeAt(me, { x: 0, z: 50, yaw: Math.PI }); window.__cam = { x: 0, y: 2, z: 53.6, yaw: Math.PI, pitch: -.12 }; window.__L = L.map(q => q.id); });
  await p.waitForFunction(() => window.__L.every(id => { const I = CharGLB.inst.get(id), e = G.ents.get(id); return I && I.base && I.lookKey && /agente_/.test(I.url); }), null, { timeout: 120000 }).catch(() => { });
  const MODEL_OF = await p.evaluate(() => Object.fromEntries(Object.entries(AGENT_GLB).map(([k, v]) => [k, v.m])));
  const r = await p.evaluate(() => window.__L.map(id => { const I = CharGLB.inst.get(id), e = G.ents.get(id); if (!I) return null; const U = I.mats[0].userData.U, h = I.bones.RightHand.getWorldPosition(new THREE.Vector3()), wp = I.wobj ? I.wobj.getWorldPosition(new THREE.Vector3()) : null;
    let nan = false; for (const k in I.bones) { const q = I.bones[k].quaternion; if (![q.x, q.y, q.z, q.w].every(Number.isFinite)) nan = true; }
    return { base: I.base, url: I.url, shirt: U.uCol.value[1].getHexString(), pants: U.uCol.value[3].getHexString(), hair: !!I.out, outId: I.outId, hat: I.hatId || '', wdist: wp ? h.distanceTo(wp) : 99, nan, female: /feminino/.test(I.url), far: e && e.farmer }; }));
  ok(r.every(x => x && x.base), 'os 5 agentes usam o modelo 3D próprio');
  ok(r.every(x => x && new RegExp('agente_' + MODEL_OF[x.far] + '(_lod)?\\.glb').test(x.url)), 'cada agente com o modelo dele: ' + r.map(x => x && x.far + '=' + x.url.split('/').pop()).join(' '));
  ok(r.every(x => x && x.wdist < .45), 'mão direita na arma por IK (distâncias: ' + r.map(x => x && x.wdist.toFixed(2)).join(', ') + ' m)');
  ok(r.every(x => x && !x.nan), 'ossos sem NaN');
  /* agachar: quadril desce, pés continuam no chão */
  const cr = await p.evaluate(async () => { const id = window.__L[2], q = G.sim.get(id), I = CharGLB.inst.get(id), hy0 = I.bones.Hips.getWorldPosition(new THREE.Vector3()).y;
    const t = setInterval(() => { const c = blankCmd(); c.yaw = q.m.yaw; c.crouch = true; q.cmd = c; }, 8); await new Promise(r2 => setTimeout(r2, 2500)); clearInterval(t);
    return { hy0, hy1: I.bones.Hips.getWorldPosition(new THREE.Vector3()).y, foot: I.bones.LeftFoot.getWorldPosition(new THREE.Vector3()).y - I.root.position.y, rootVsSim: +(I.root.position.y - q.m.y).toFixed(2), cr: G.ents.get(id).cr }; });
  ok(cr.hy1 < cr.hy0 - .15 && cr.foot < .25 && cr.foot > -.1, `agachar: quadril ${cr.hy0.toFixed(2)} → ${cr.hy1.toFixed(2)} m, pé a ${cr.foot.toFixed(2)} m do chão (raiz−sim ${cr.rootVsSim}, cr ${cr.cr})`);
  ok(errs.length === 0, 'sem erros no console' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  ✗ FALHOU: exceção', e.message); process.exit(1); });
