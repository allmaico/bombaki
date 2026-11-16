const G = require('./t_sim.js');
const map = G.buildFazenda(1); const nav = new G.NavGrid(map);
const sim = new G.Sim({ mode: 'tatico', map, nav, seed: 5, cfg: { botLevel: 'insano', perTeam: 5, rounds: 5 } });
sim.startMatch();
// teste manual de granada com humano local
const me = sim.players.find(p => !p.bot) || sim.players[0]; me.bot = false; me.ai = null; me.local = true;
for (let i = 0; i < 60 * 9; i++) sim.step();
console.log('fase', sim.phase, 'nades', me.nades, 'w', me.w);
me.cmd.acts = ['g']; sim.step(); me.cmd.acts = null;
console.log('após g: w =', me.w, 'equipT', me.equipT.toFixed(2), 'autoThrow', me.autoThrow);
let thrown = 0; for (let i = 0; i < 60; i++) { sim.step(); for (const e of sim.ev) if (e.t === 'nade') thrown++; sim.ev.length = 0; }
console.log('granadas lançadas:', thrown, 'nades restantes', me.nades, 'w', me.w, 'ativas', sim.nades.length);
// agora observa bots tentando
let gates = { tried: 0 }; const orig = G.BotBrain.prototype.maybeNade;
G.BotBrain.prototype.maybeNade = function (s, p, c) { gates.tried++; const before = this.nadeUntil; orig.call(this, s, p, c); if (this.nadeUntil !== before) gates.ok = (gates.ok || 0) + 1; };
let throws = 0, nk = 0;
for (let i = 0; i < 60 * 240; i++) { sim.step(); for (const e of sim.ev) { if (e.t === 'nade') throws++; if (e.t === 'kill' && e.w === 'batata') nk++; } sim.ev.length = 0; if (sim.phase === 'over') break; }
console.log('bots: maybeNade chamadas', gates.tried, 'aceitas', gates.ok || 0, 'lançadas', throws, 'kills batata', nk);
// distribuição das distâncias quando há alvo
const ds = []; const sim2 = new G.Sim({ mode: 'tatico', map, nav, seed: 9, cfg: { botLevel: 'insano', perTeam: 5, rounds: 5 } }); sim2.startMatch();
const o2 = G.BotBrain.prototype.maybeNade;
G.BotBrain.prototype.maybeNade = function (s, p, c) { if (p.cdT > 0 || p.relT > 0 || p.throwT > 0) { ds.push('cd'); return; } if (this.tgt && this.tgt.alive && s.t - this.seenT < 4 && this.last) ds.push(Math.round(Math.hypot(this.last.x - p.m.x, this.last.z - p.m.z) / 5) * 5); else ds.push('none'); o2.call(this, s, p, c); };
for (let i = 0; i < 60 * 150; i++) { sim2.step(); sim2.ev.length = 0; }
const h = {}; for (const d of ds) h[d] = (h[d] || 0) + 1; console.log('hist', h);
