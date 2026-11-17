#!/bin/bash
# roda toda a bateria de testes (lógica em Node + navegador headless)
cd "$(dirname "$0")/.." ; export NODE_PATH=${NODE_PATH:-/opt/npm-tools/node_modules}; F=0
run() { echo "=== $*"; if ! timeout 1500 node "$@" > /tmp/bk_test.log 2>&1; then F=$((F+1)); echo "!!! FALHOU: $*"; fi; grep -E "✓|✗|FALH|TUDO OK|PAGEERROR|err:|STATE|boot ms|qualidade|^[a-z ]+:" /tmp/bk_test.log | tail -40; }
for t in t_sim t_arena t_arena2 t_match t_move t_hit t_bots t_map t_tat t_afk t_flow t_agents; do run test/$t.js; done; MAP=arena2 run test/t_flow.js; MAP=arena3 run test/t_flow.js; MAP=arena3 SEEDS=11,12 run test/t_tat.js; MAP=arena2 SEEDS=41,42 run test/t_tat.js
run test/play.js play 960 540; run test/play.js caos 960 540; run test/play2.js 960 540; run test/v3.js all
run test/mp_e2e.js; run test/mp_br.js; run test/mp_pub.js; run test/acc.js; run test/touch.js; run test/mobile.js; MODE=caos run test/mobile.js; run test/shop.js; run test/tat_ui.js; run test/flow_ui.js; run test/agents_ui.js
QUAL=alto run test/perf.js; MODE=caos QUAL=medio run test/perf.js
echo "FALHAS TOTAIS: $F"
