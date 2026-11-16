// Anti-AFK do 5x5: aviso, bot assume o peão parado e devolve o controle quando o jogador mexe
const G = require('./t_sim.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const map = G.buildArena(7), nav = new G.NavGrid(map);
const sim = new G.Sim({ mode: 'tatico', map, nav, seed: 4, cfg: { fill: true, perTeam: 5, format: 'comp', afk: true } });
const me = sim.addPlayer({ name: 'Parado', local: true }); sim.startMatch();
const ev = []; let seq = 0; const idle = () => { const c = G.blankCmd(); c.seq = ++seq; c.yaw = 0; me.cmd = c; };
const run = (sec, f) => { for (let i = 0; i < 60 * sec; i++) { (f || idle)(); sim.step(); for (const e of sim.ev) if (e.t === 'afk' && e.p === me.id) ev.push({ k: e.k, t: sim.t, rd: sim.round }); sim.ev.length = 0; } };
for (let i = 0; i < 60 * 40 && sim.phase !== 'live'; i++) { idle(); sim.step(); sim.ev.length = 0; }
/* fica parado: mantém o jogador vivo para medir o tempo parado (imortal só no teste) */
const x0 = me.m.x, z0 = me.m.z; let moved = 0; me.hp = 1e9;
for (let i = 0; i < 60 * 160; i++) { idle(); if (sim.phase === 'live') { sim.pt = 99; } me.hp = 1e9; sim.step(); for (const e of sim.ev) if (e.t === 'afk' && e.p === me.id) ev.push({ k: e.k, t: sim.t }); sim.ev.length = 0; if (me.afk) moved = Math.max(moved, Math.hypot(me.m.x - x0, me.m.z - z0)); }
const warn = ev.find(e => e.k === 'warn'), bot = ev.find(e => e.k === 'bot');
ok(!!warn, 'aviso de parado emitido');
ok(!!bot && me.afk, 'bot assumiu o peão parado');
ok(bot && warn && bot.t - warn.t > 25, 'bot só assume ~30 s depois do aviso');
ok(moved > 3, 'o bot movimenta o peão (' + moved.toFixed(1) + ' m)');
/* volta a mexer */
const c = G.blankCmd(); c.seq = ++seq; c.yaw = 0; c.mvf = 1; me.cmd = c; sim.step(); for (const e of sim.ev) if (e.t === 'afk' && e.p === me.id) ev.push({ k: e.k }); sim.ev.length = 0;
ok(!me.afk && ev.some(e => e.k === 'back'), 'jogador retoma o controle ao se mexer');
/* sem a opção (offline/treino) nada acontece */
const s2 = new G.Sim({ mode: 'tatico', map, nav, seed: 4, cfg: { fill: true, perTeam: 5, format: 'comp' } }), p2 = s2.addPlayer({ name: 'Treino', local: true }); s2.startMatch(); let afk2 = 0;
for (let i = 0; i < 60 * 130; i++) { const c2 = G.blankCmd(); p2.cmd = c2; p2.hp = 1e9; if (s2.phase === 'live') s2.pt = 99; s2.step(); for (const e of s2.ev) if (e.t === 'afk') afk2++; s2.ev.length = 0; }
ok(afk2 === 0 && !p2.afk, 'treino offline: anti-AFK desligado');
console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
