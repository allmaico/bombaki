// Animações do corpo 3D masculino (pacote 2): parado com arma, de lado (esq./dir.), de costas, correr com arma,
// recarregar (arma presa na mão), arremessar o ovo, emotes com animação própria e morte. Uso: SC=<pasta> node test/anims.js
const { chromium } = require('playwright'); const path = require('path');
const SC = process.env.SC || '/tmp'; let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push('err: ' + m.text().slice(0, 200)); });
  await p.addInitScript(`try{localStorage.setItem('bombaki2.settings', JSON.stringify({quality:'baixo', renderScale:.5}))}catch(e){}`);
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1');
  await p.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 240000 });
  const clips = await p.evaluate(async () => { const r = CharGLB.load(BASE_GLB.m.url); await r.p; return r.gltf.animations.map(a => a.name); });
  ok(['Rifle_Idle', 'Strafe_Left', 'Strafe_Right', 'Crouch_Pull_and_Throw', 'Thrust_Slash', 'Dance_Forro', 'Victory_Cheer', 'Wave_One_Hand', 'Knock_Down', 'Dead', 'CrouchLookAroundBow'].every(n => clips.includes(n)), 'modelo masculino com as animações novas e as antigas (' + clips.length + ')');
  await p.evaluate(`Game.startOffline({ mode: 'tatico', botLevel: 'normal' })`); await p.waitForFunction('G.scene === "play" && G.me', null, { timeout: 120000 });
  await p.evaluate(() => { const s = G.sim, me = G.me; for (const q of s.players) q.ai = null; const q = s.players.find(x => x !== me); q.farmer = 'peao'; if (q.own.galho === undefined) q.own.galho = 0; q.w = 'galho'; q.equipT = 0; q.ammo[WEAPONS.galho.ammo] = 90;
    s.placeAt(q, { x: .5, z: 58, yaw: 0 }); s.placeAt(me, { x: .5, z: 50, yaw: Math.PI }); window.__cam = { x: .5, y: 2.2, z: 53.2, yaw: Math.PI, pitch: -.15 }; window.__id = q.id;
    window.__drive = (o, ms) => new Promise(res => { const t = setInterval(() => { const c = blankCmd(); c.yaw = q.m.yaw; Object.assign(c, o); q.cmd = c; }, 8); setTimeout(() => { clearInterval(t); const c = blankCmd(); c.yaw = q.m.yaw; q.cmd = c; res(); }, ms); });
    window.__st = () => { const I = CharGLB.inst.get(q.id); return I ? { k: I.curK, ov: I.ovK || '', base: !!I.base } : null; }; });
  await p.waitForFunction(() => { const s = window.__st(); return s && s.base; }, null, { timeout: 90000 }).catch(() => { });
  const dbg = await p.evaluate(() => ({ st: window.__st(), keys: [...CharGLB.inst.keys()].slice(0, 12), id: window.__id, e: (({ x, z, alive, swim, wid, team, deadT }) => ({ x, z, alive, swim, wid, team, deadT }))(G.ents.get(window.__id) || {}), my: G.myId, sp: (q => ({ x: q.m.x, z: q.m.z, alive: q.alive, spec: q.spec }))(G.sim.get(window.__id)), cam: G.cam && [G.cam.x, G.cam.z] })); console.log(JSON.stringify(dbg));
  await p.waitForFunction(() => window.__st().k === 'idleW', null, { timeout: 20000 }).catch(() => { });
  ok((await p.evaluate(() => window.__st().k)) === 'idleW', 'parado com a arma: Rifle_Idle');
  const shot = n => p.screenshot({ path: `${SC}/anim_${n}.png`, timeout: 120000 });
  const during = async (o, ms, want, name) => { await p.evaluate(() => { window.__seen = new Set(); window.__sp = 0; clearInterval(window.__pi); window.__pi = setInterval(() => { const s = window.__st(), e = G.ents.get(window.__id); if (s) window.__seen.add(s.k); if (e) window.__sp = Math.max(window.__sp, e.spd); }, 30); }); const d = p.evaluate(([o2, ms2]) => window.__drive(o2, ms2), [o, ms]); const r = await p.waitForFunction(w => window.__st().k === w, want, { timeout: ms + 4000 }).then(() => true).catch(() => false); if (r) await shot(name); await d; ok(r, `${name}: ${want} (visto: ${await p.evaluate(() => [...window.__seen].join('/') + ' vel. máx ' + window.__sp.toFixed(1))})`); await p.waitForTimeout(400); };
  await during({ mvf: 1, sprint: true, yaw: Math.PI }, 1500, 'runW', 'correr_arma');
  await during({ mvr: 1 }, 2500, 'strafeR', 'lado_direita');
  await during({ mvr: -1 }, 2500, 'strafeL', 'lado_esquerda');
  await during({ mvf: -1 }, 2500, 'back', 'de_costas');
  await during({ mvf: 1, crouch: true }, 2500, 'crouchWalk', 'agachado_andando');
  /* recarga: camada de cima + arma presa na mão */
  await p.evaluate(() => { const q = G.sim.get(window.__id); q.w = 'galho'; q.equipT = 0; q.relT = 0; q.ammo[WEAPONS.galho.ammo] = 90; q.mag.galho = 1; const c = blankCmd(); c.yaw = q.m.yaw; c.acts = ['r']; q.cmd = c; });
  const rl = await p.waitForFunction(() => { const s = window.__st(); return s.ov === 'reload' ? s : null; }, null, { timeout: 8000 }).then(h => h.jsonValue()).catch(() => null);
  await p.waitForTimeout(500); await shot('recarga');
  const wd = await p.evaluate(() => { const I = CharGLB.inst.get(window.__id); return I.wobj ? I.bones.RightHand.getWorldPosition(new THREE.Vector3()).distanceTo(I.wobj.getWorldPosition(new THREE.Vector3())) : 99; });
  ok(!!rl && wd < .6, `recarga com animação (camada de cima) e arma na mão (${wd.toFixed(2)} m)`);
  await p.waitForFunction(() => window.__st().ov === '', null, { timeout: 10000 }).catch(() => { }); ok((await p.evaluate(() => window.__st().ov)) === '', 'recarga termina e volta a empunhar');
  /* arremesso do ovo */
  await p.evaluate(() => { const q = G.sim.get(window.__id); q.nades = 2; q.cdT = 0; const c = blankCmd(); c.yaw = q.m.yaw; c.acts = ['g']; q.cmd = c; });
  const th = await p.waitForFunction(() => window.__st().ov === 'throw', null, { timeout: 8000 }).then(() => true).catch(() => false); if (th) await shot('arremesso');
  ok(th, 'arremesso do ovo com animação');
  /* emotes com animação própria */
  for (const em of ['forro', 'galinha', 'requebra', 'vitoria', 'derrota', 'chapeu', 'rena']) {
    await p.evaluate(e => { const q = G.sim.get(window.__id); const c = blankCmd(); c.yaw = q.m.yaw; c.acts = ['em:' + e]; q.cmd = c; }, em);
    const r = await p.waitForFunction(e => window.__st().k === 'em_' + e, em, { timeout: 25000 }).then(() => true).catch(() => false); if (r) { await p.waitForTimeout(700); await shot('emote_' + em); }
    ok(r, 'emote ' + em + ' usa a animação do modelo'); await p.waitForFunction(() => !window.__st().k.startsWith('em_'), null, { timeout: 40000 }).catch(() => { }); await p.waitForTimeout(2500);
  }
  /* feminino: mesmas animações no corpo dela */
  await p.evaluate(() => { const q = G.sim.get(window.__id); q.farmer = 'rastreador'; });
  const fem = await p.waitForFunction(() => { const I = CharGLB.inst.get(window.__id); return I && /feminino/.test(I.url) && I.curK === 'idleW'; }, null, { timeout: 120000 }).then(() => true).catch(() => false);
  ok(fem, 'feminino: corpo dela parado com a arma (Rifle_Idle)');
  await during({ mvr: -1 }, 2500, 'strafeL', 'fem_lado');
  await p.evaluate(() => { const q = G.sim.get(window.__id); const c = blankCmd(); c.yaw = q.m.yaw; c.acts = ['em:forro']; q.cmd = c; });
  const ff = await p.waitForFunction(() => window.__st().k === 'em_forro', null, { timeout: 8000 }).then(() => true).catch(() => false); if (ff) { await p.waitForTimeout(700); await shot('fem_forro'); } ok(ff, 'feminino: emote forró com a animação dela');
  await p.waitForFunction(() => !window.__st().k.startsWith('em_'), null, { timeout: 12000 }).catch(() => { });
  /* morte */
  await p.evaluate(() => { const q = G.sim.get(window.__id); G.sim.kill(q, G.me, 'galho', 'body'); });
  const dd = await p.waitForFunction(() => window.__st().k.startsWith('death'), null, { timeout: 8000 }).then(() => true).catch(() => false); await p.waitForTimeout(1500); await shot('morte');
  ok(dd, 'morte com animação do modelo (' + (await p.evaluate(() => window.__st().k)) + ')');
  const nan = await p.evaluate(() => { const I = CharGLB.inst.get(window.__id); for (const k in I.bones) { const q = I.bones[k].quaternion; if (![q.x, q.y, q.z, q.w].every(Number.isFinite)) return true; } return false; }); ok(!nan, 'ossos sem NaN');
  ok(errs.length === 0, 'sem erros no console' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  ✗ FALHOU: exceção', e.message); process.exit(1); });
