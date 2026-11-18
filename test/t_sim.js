// Testes lógicos da simulação (Node, sem DOM)
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '../src/js');
const files = ['00_util.js','01_data.js','02_world.js','03_move.js','10_gl.js','20_mapkit.js','21_props.js','22_terrain.js','23_fazenda.js','24_regions.js','25_arena.js','26_arena2.js','27_arena3.js','40_sim.js','41_rules.js','42_nav.js','43_bots.js','44_items.js','45_farmers.js','46_bots_tat.js','47_flow.js','48_agents.js','49_glass.js'];
const { readModule } = require('./_src.js'); const src = files.map(n => readModule(n)).join('\n');
const fn = new Function('window','document','localStorage','performance', src + '\nreturn {glassVaultStep,glassNear,buildArena3,ARENA3,orbSpots,NADE_NAMES,computeBarrier,setBarrier,FLOW_T,FLOW_STATE,buildFazenda,buildArena,ARENA,buildArena2,ARENA2,TAT_MAPS,Sim,FARMERS,FARMER_IDS,NavGrid,BotBrain,WEAPONS,PH,T_ATK,T_DEF,SIMC,blankCmd,DT,MODES,PRIMARIES,HEALS};');
const G = fn({}, undefined, { getItem(){return null;}, setItem(){} }, { now: () => Date.now() });
module.exports = G;
if (require.main === module) {
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ FALHOU:', m); } else console.log('  ✓', m); };
  let t0 = Date.now(); const map = G.buildArena(7); console.log('mapa 5x5 (Vila do Roçado)', Date.now() - t0, 'ms');
  t0 = Date.now(); const nav = new G.NavGrid(map); console.log('nav', Date.now() - t0, 'ms; células andáveis', nav.count, '/', nav.N);
  // caminho entre spawns
  const a = map.spawns.atk[0], d = map.spawns.def[0];
  t0 = Date.now(); const pth = nav.findPath(a.x, a.z, d.x, d.z); console.log('A* spawn→spawn', Date.now() - t0, 'ms; pontos', pth && pth.length);
  ok(pth && pth.length > 2, 'existe caminho entre os spawns');
  for (const k of ['A', 'B']) { const S = map.sites[k]; const q = nav.findPath(a.x, a.z, S.x, S.z); ok(q && q.length > 1, 'caminho ATK → site ' + k); const q2 = nav.findPath(d.x, d.z, S.x, S.z); ok(q2 && q2.length > 1, 'caminho DEF → site ' + k); }
  // partida
  const sim = new G.Sim({ mode: 'tatico', map, nav, seed: 7, cfg: { botLevel: 'normal', perTeam: 5, rounds: 3 } });
  const me = sim.addPlayer({ name: 'AllMaico', skin: 0, local: true }); me.local = true;
  sim.startMatch();
  ok(sim.players.length === 10, '10 jogadores (1 humano + 9 bots): ' + sim.players.length);
  ok(sim.phase === 'prep', 'fase prep');
  ok(sim.players.filter(p => p.team === G.T_ATK).length === 5, '5 atacantes');
  ok(sim.players.filter(p => p.hasBomb).length === 1, 'exatamente um portador da bomba');
  let ticks = 0; const tt0 = Date.now();
  for (let i = 0; i < 60 * 90 && sim.phase !== 'live'; i++) { sim.step(); sim.ev.length = 0; ticks++; }
  ok(sim.phase === 'live', 'fase live após a compra inicial (70 s na 1ª rodada)');
  // tick cost
  const t1 = Date.now(); for (let i = 0; i < 60 * 20; i++) { sim.step(); sim.ev.length = 0; } const per = (Date.now() - t1) / 1200;
  console.log('  custo médio por tick (10 jogadores, bots):', per.toFixed(3), 'ms');
  ok(per < 4, 'tick < 4 ms');
  const evs = []; let planted = false, defused = false, boom = false, rounds = 0;
  for (let i = 0; i < 60 * 300; i++) { sim.step(); for (const e of sim.ev) { evs.push(e); if (e.t === 'bomb' && e.k === 'plant') planted = true; if (e.t === 'rend') rounds++; } sim.ev.length = 0; if (sim.phase === 'over') break; }
  const kills = evs.filter(e => e.t === 'kill').length, shots = evs.filter(e => e.t === 'shot').length, hits = evs.filter(e => e.t === 'hit').length;
  console.log('  eventos em ~5min simulados: tiros', shots, 'hits', hits, 'kills', kills, 'plantou?', planted, 'rodadas encerradas', rounds, 'placar', sim.score, 'fase', sim.phase);
  ok(kills > 0, 'bots se matam (kills>0)');
  ok(rounds >= 1, 'pelo menos uma rodada concluiu');
  console.log(fails ? ('FALHAS: ' + fails) : 'TUDO OK');
  process.exit(fails ? 1 : 0);
}
