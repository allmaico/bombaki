// EMOTES: ação 'em:<id>' vira evento para todos · id inválido é ignorado · intervalo mínimo · morto não dança
const G = require('./t_sim.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
const map = G.buildVila(21), nav = new G.NavGrid(map);
const sim = new G.Sim({ mode: 'tatico', map, nav, seed: 5, cfg: { fill: false } }); const me = sim.addPlayer({ name: 'Eu', local: true, squad: 0 }); sim.addPlayer({ name: 'Ele', local: true, squad: 1 }); sim.startMatch();
for (let i = 0; i < 90 * 60 && sim.phase !== 'live'; i++) { sim.step(); sim.ev.length = 0; }
const act = (a, n) => { const ev = []; for (let i = 0; i < (n || 1); i++) { const c = G.blankCmd(); c.acts = i === 0 ? [a] : null; me.cmd = c; me.q.push(c); sim.step(); ev.push(...sim.ev); sim.ev.length = 0; } return ev.filter(e => e.t === 'emote'); };
let e = act('em:forro'); ok(e.length === 1 && e[0].e === 'forro' && e[0].id === me.id, 'emote válido gera evento');
e = act('em:forro'); ok(e.length === 0, 'spam bloqueado (intervalo mínimo)');
e = act('em:hackeado', 90); ok(e.length === 0, 'id inválido ignorado');
e = act('em:rena'); ok(e.length === 1 && e[0].e === 'rena', 'emote de Natal (Pulo da Rena)');
me.alive = false; e = act('em:galinha', 90); e = act('em:galinha'); ok(e.length === 0, 'morto não faz emote');
console.log(fails ? 'FALHAS: ' + fails : 'TUDO OK'); process.exit(fails ? 1 : 0);
