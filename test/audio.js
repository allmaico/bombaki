// Motor de áudio 2.0: renderiza cada trilha e uma demonstração de efeitos (OfflineAudioContext),
// mede volume/pico/silêncio, salva WAVs para ouvir, testa vozes/prioridade/limpeza e a integração com a partida.
// Uso: WAV=<pasta> node test/audio.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.WAV || ''; let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push('err: ' + m.text().slice(0, 200)); });
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?test=1');
  await p.waitForFunction('window.G && G.scene === "menu"', null, { timeout: 240000 });
  /* ---------- 1. renderização offline: trilhas ---------- */
  const render = (kind, arg, secs) => p.evaluate(async ([kind, arg, secs]) => {
    const sr = 32000, ctx = new OfflineAudioContext(2, sr * secs, sr), S = new Sfx(); S.init(ctx); S.listen(0, 1.6, 0, 0);
    if (kind === 'music') { S.startMusic(arg); for (let i = 0; i < 200 && S.mus && S.mus.nextBar < secs + 1; i++) S._schedule(secs + 1); }
    else { for (const [t, code] of arg) { S._tBias = t; try { new Function('S', code)(S); } catch (e) { console.error('demo', e.message); } } S._tBias = 0; }
    const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1); let peak = 0, sum = 0, nan = 0, silentWin = 0, wins = 0;
    for (let i = 0; i < L.length; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (!isFinite(v)) nan++; else { if (v > peak) peak = v; sum += L[i] * L[i]; } }
    for (let w = 0; w + sr < L.length; w += sr) { wins++; let e = 0; for (let i = w; i < w + sr; i++) e += L[i] * L[i]; if (Math.sqrt(e / sr) < .002) silentWin++; }
    /* WAV 16 bits estéreo em base64 */
    const n = L.length, ab = new ArrayBuffer(44 + n * 4), dv = new DataView(ab), wr = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    wr(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); wr(8, 'WAVE'); wr(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); wr(36, 'data'); dv.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    let s = ''; const u8 = new Uint8Array(ab); for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    return { peak, rms: Math.sqrt(sum / L.length), nan, silentWin, wins, notes: S.stats.notes, wav: btoa(s) };
  }, [kind, arg, secs]);
  const save = (name, r) => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, name + '.wav'), Buffer.from(r.wav, 'base64')); } };
  for (const [id, secs] of [['natal', 40], ['tranquilo', 24], ['celeiro', 24], ['correria', 16], ['ultimos', 16], ['vitoria', 12], ['feira', 20], ['violada', 20], ['quadrilha', 16], ['entardecer', 24], ['xaxado', 20]]) {
    const r = await render('music', id, secs); save('musica_' + id, r);
    ok(r.nan === 0 && r.peak > .05 && r.peak <= 1.001 && r.rms > .01 && r.silentWin <= 1, `trilha ${id}: ${r.notes} notas em ${secs} s · pico ${r.peak.toFixed(2)} · RMS ${r.rms.toFixed(3)} · trechos mudos ${r.silentWin}/${r.wins}`);
  }
  /* ---------- 1b. playlist do menu: troca de trilha sozinha, em loop ---------- */
  const pl = await p.evaluate(async () => { const ctx = new OfflineAudioContext(2, 32000 * 30, 32000), S = new Sfx(); S.init(ctx); const keep = MUSIC.feira.plSec; MUSIC.feira.plSec = 6; S.playlist(['feira', 'violada']); const seen = new Set([S.mus.id]); for (let k = 0; k < 40; k++) { S._schedule((k + 1) * 1); if (S.mus) seen.add(S.mus.id); } MUSIC.feira.plSec = keep; return { list: MENU_PLAYLIST.length, seen: [...seen], natal: MENU_PLAYLIST.includes('natal') }; });
  ok(pl.list === 6 && !pl.natal, `playlist do menu com ${pl.list} trilhas, sem a de Natal (Natal só no carregamento)`);
  ok(pl.seen.includes('feira') && pl.seen.includes('violada'), 'playlist avança sozinha para a próxima trilha (' + pl.seen.join(' → ') + ')');
  /* ---------- 2. demonstração dos efeitos ---------- */
  const demo = [
    [.2, "S.shot('galho', null, true)"], [.9, "S.shot('colher', null, true)"], [1.6, "S.shot('estilingue', null, true)"], [2.4, "S.shot('porteira', null, true)"], [3.4, "S.shot('vassoura', null, true)"],
    [4.6, "S.shot('galho', { x: 30, y: 1.6, z: -20 }, false)"], [5.0, "S.shot('galho', { x: -90, y: 1.6, z: -60 }, false)"],
    [5.6, "S.reloadStep('galho', 0)"], [5.9, "S.reloadStep('galho', 1)"], [6.25, "S.reloadStep('galho', 2)"],
    [6.8, "S.step('dirt')"], [7.15, "S.step('dirt')"], [7.5, "S.step('wood')"], [7.85, "S.step('wood')"], [8.2, "S.step('metal')"], [8.55, "S.step('water')"], [9.0, "S.land(10)"],
    [9.6, "S.hit(false)"], [9.9, "S.hit(true)"], [10.3, "S.kill()"], [10.9, "S.hurt()"], [11.4, "S.headshot()"], [12.0, "S.whiz()"],
    [12.6, "S.impact('wood', { x: 4, y: 1, z: -6 })"], [12.9, "S.impact('metal', { x: -4, y: 1, z: -6 })"], [13.2, "S.impact('stone', { x: 2, y: 1, z: -8 })"], [13.5, "S.glass({ x: 3, y: 1.5, z: -4 })"],
    [14.4, "S.beep({ x: 6, y: 1, z: -6 }, false)"], [15.1, "S.beep({ x: 6, y: 1, z: -6 }, true)"], [15.6, "S.planted()"], [16.4, "S.defused()"],
    [17.4, "S.explosion({ x: 14, y: 1, z: -10 }, false, false)"], [19.5, "S.explosion({ x: 60, y: 1, z: -50 }, true, false)"],
    [22.5, "S.moo({ x: -12, y: 1, z: -14 }, true)"], [24.0, "S.cluck({ x: 6, y: 0, z: -5 }, true)"], [25.0, "S.oink({ x: -5, y: 0, z: -4 }, true)"], [26.0, "S.rooster({ x: 20, y: 3, z: -30 })"],
    [27.5, "S.ui(1)"], [27.8, "S.ui(0)"], [28.2, "S.jingle()"], [29.0, "S.roundStart()"], [29.8, "S.barrier(true)"], [30.6, "S.barrier(false)"]
  ];
  const d = await render('fx', demo, 32); save('efeitos_demo', d);
  ok(d.nan === 0 && d.peak > .2 && d.peak <= 1.001, `demonstração de efeitos: pico ${d.peak.toFixed(2)} (limitador segura em ≤ 1.0), RMS ${d.rms.toFixed(3)}`);
  /* ---------- 3. salas: mesmo tiro em campo aberto e no galpão ---------- */
  const rooms = {}; for (const room of ['aberto', 'galpao']) { const r = await render('fx', [[.05, `S.setRoom('${room}', true); S.shot('colher', { x: 8, y: 1.6, z: -8 }, false)`]], 3); save('sala_' + room, r); rooms[room] = r.rms; }
  ok(rooms.galpao > rooms.aberto * 1.1, `reverb por sala: galpão soa mais cheio que campo aberto (RMS ${rooms.galpao.toFixed(4)} × ${rooms.aberto.toFixed(4)})`);
  /* ---------- 4. variação: dois tiros iguais não são idênticos ---------- */
  const v = await p.evaluate(async () => { const run = async () => { const ctx = new OfflineAudioContext(1, 8000, 32000), S = new Sfx(); S.init(ctx); S.shot('galho', null, true); const b = await ctx.startRendering(); return Array.from(b.getChannelData(0).slice(0, 4000)); }; const a = await run(), c = await run(); let diff = 0; for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - c[i]); return diff; });
  ok(v > 1, 'tiros repetidos não são cópias idênticas (diferença ' + v.toFixed(1) + ')');
  /* ---------- 5. gerenciador de vozes, prioridade, deduplicação e limpeza (contexto real) ---------- */
  const vm = await p.evaluate(async () => {
    sfx.init(); await sfx.ctx.resume().catch(() => { }); sfx.listen(0, 1.6, 0, 0); const s0 = Object.assign({}, sfx.stats);
    for (let i = 0; i < 400; i++) { sfx.step('dirt', { x: Math.random() * 40 - 20, y: 0, z: Math.random() * 40 - 20 }, .5); sfx.shot('galho', { x: Math.random() * 30, y: 1, z: Math.random() * 30 }, false); }
    const maxV = sfx.voices.length; let crit = 0; for (let i = 0; i < 20; i++) if (sfx.dest({ x: 5, y: 1, z: 5 }, 1, 0, { prio: 3 })) crit++;
    const before = sfx.stats.dedup; sfx.beep({ x: 1, y: 0, z: 1 }); sfx.beep({ x: 1, y: 0, z: 1 }); const dd = sfx.stats.dedup - before;
    await new Promise(r => setTimeout(r, 3500)); sfx._prune(sfx.ctx.currentTime);
    return { maxV, cap: sfx.q.voices, crit, dd, after: sfx.voices.length, dropped: sfx.stats.dropped - s0.dropped, stolen: sfx.stats.stolen - s0.stolen, freed: sfx.stats.freed - s0.freed };
  });
  ok(vm.maxV <= vm.cap, `vozes simultâneas limitadas (${vm.maxV} ≤ ${vm.cap}; ${vm.dropped} descartadas, ${vm.stolen} substituídas)`);
  ok(vm.crit === 20, 'sons críticos sempre tocam, mesmo com o limite cheio (roubam vozes secundárias)');
  ok(vm.dd >= 1, 'evento duplicado no mesmo instante não toca duas vezes');
  ok(vm.after === 0 && vm.freed > 100, `recursos liberados depois dos sons (${vm.after} vozes ativas, ${vm.freed} fontes desconectadas)`);
  /* ---------- 6. integração com a partida 5x5 ---------- */
  await p.evaluate(`Game.startOffline({ mode: 'tatico', botLevel: 'normal' })`); await p.waitForFunction('G.scene === "play" && G.me && G.phase === "prep"', null, { timeout: 120000 });
  await p.evaluate(() => { settings.music = .35; sfx.init(); sfx.startMusic('tranquilo'); }); await p.waitForTimeout(1500);
  const a1 = await p.evaluate(() => sfx.info()); ok(a1.track === 'tranquilo', 'compra: trilha Toada do Roçado (' + a1.track + ')');
  await p.evaluate('__live()'); await p.waitForFunction(() => sfx.info().track === 'celeiro', null, { timeout: 30000 }).catch(() => { }); const a2 = await p.evaluate(() => sfx.info());
  ok(a2.track === 'celeiro', 'round valendo: troca para o Baião do Celeiro (' + a2.track + ')');
  await p.evaluate(() => { G.combatT = G.time; }); await p.waitForFunction(() => sfx.info().intensity >= 1, null, { timeout: 30000 }).catch(() => { }); const a3 = await p.evaluate(() => sfx.info()); ok(a3.intensity >= 1, 'combate por perto: intensidade sobe (' + a3.intensity + ')');
  ok(['aberto', 'casa', 'celeiro', 'galpao', 'porao'].includes(a3.room), 'sala acústica detectada pelo jogo: ' + a3.room);
  const occ = await p.evaluate(() => { const W = G.map.W, c = G.cam; for (let a = 0; a < 6.28; a += .2) for (let r = 6; r < 40; r += 2) { const x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r; if (!W.los(c.x, c.y, c.z, x, c.y, z)) { const g = sfx.dest({ x, y: c.y - .9, z }, 1, 0, { prio: 3 }); return g ? g.occ : 'sem voz'; } } return 'nenhuma parede'; });
  ok(occ === true, 'som atrás de parede sai abafado (obstrução informada pelo jogo): ' + occ);
  ok(errs.length === 0, 'sem erros no console' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  ✗ FALHOU: exceção', e.message); process.exit(1); });
