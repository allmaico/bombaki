# 🥔💥 BOMBAKI — Guerra no Roçado (v5.8)

FPS multiplayer cartoon com temática rural brasileira que roda **direto no navegador** (PC, notebook e celular na
horizontal). Um único arquivo `index.html`, motor WebGL2 próprio, multiplayer P2P — funciona no **GitHub Pages**.

## ▶️ Publicar no GitHub Pages
1. Crie um repositório e envie o **`index.html`** para a raiz.
2. **Settings → Pages → Deploy from a branch → `main` / `(root)` → Save**.
3. O jogo fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Também abre direto do arquivo (offline, contra bots). Online precisa de internet.

## 🆕 v5.8 — Celular de verdade
* **Tela cheia**: o jogo cobre o navegador (some a barra de endereço) e trava na horizontal. Entra sozinho no primeiro toque da partida
  (o navegador só permite em resposta a um toque) e pelo botão **⛶** — no jogo, na pausa e no menu. Se você sair pelo ⛶, ele respeita.
  No iPhone (Safari não tem tela cheia para páginas): Compartilhar → "Adicionar à Tela de Início" abre o BOMBAKI em tela cheia.
* **Barra do jogo** no canto superior direito: **⛶** tela cheia · **⏸** menu/pausa · **✖ Sair da partida** (com confirmação).
* **Imagem nítida**: novo gráfico **Celular** (resolução cheia da tela) com **resolução automática** que reduz a nitidez só quando o FPS cai
  e volta quando sobra desempenho. Celulares que estavam no "Baixo" padrão passam para ele automaticamente.
* **Nada sobreposto**: HUD em escala certa para tela de celular; minimapa e objetivo compactos; munição acima da vida; dinheiro abaixo do
  placar; atalhos (mapa, placar, cura, loja) numa fileira pequena no topo; disparo grande à direita e disparo/corrida à esquerda.
* **5x5 no celular**: os ícones **Z X C F** das habilidades e a **barra de armas** são tocáveis.
* Textos mostram os botões de toque no lugar das teclas (ex.: "salte com ⤒" em vez de "Espaço").
* Opções novas: Configurações → Gráficos → "Resolução automática"; Jogabilidade → "Tela cheia automática no celular".
* Teste novo `test/mobile.js` (Pixel 7 deitado, 5x5 e Battle Royale): tela cheia, ⛶/⏸/✖, nada sobreposto, habilidades tocáveis, nitidez.

## 🆕 v5.7 — Equilíbrio ataque × defesa e poses dos agentes
* **Equilíbrio (bots × bots)**: ataque vence ~52% na Vila do Roçado, ~48% no Moinho e ~59% na Fazenda do Milharal (antes 65–79%).
  As regras (plantio 4 s, desarme 7 s, economia) não mudaram; a correção é na tática da defesa:
  a posição montada na compra é mantida quando o round começa; defensores escolhem lugares **sem visão para as saídas do spawn
  do ataque** (ninguém morre de graça quando a barreira cai) e miram **por onde o ataque vai chegar** (caminho real até eles);
  o "rodador" segura o meio só onde há esconderijo (no Moinho, onde a Passagem é exposta, a defesa joga nos sites).
  O teste `t_tat.js` agora exige ataque entre 35% e 65%.
* **Poses na seleção e no carregamento** (como nas artes): Tico Bruto com a escopeta no ombro, Dona Jurema com a galinha erguida
  na mão, Zé Patrão de braços cruzados, Tati Fumaça com o frasco de fumaça perto do rosto e Seu Mineiro com o frasco verde brilhante.

## 🆕 v5.6 — Visual próprio de cada agente
No 5x5 cada agente tem a sua aparência (como nas artes), no lugar do personagem do perfil: no mundo, nos retratos da seleção/carregamento,
nos braços em 1ª pessoa (mangas e luvas) e no rosto do HUD.
* **Tico Bruto**: camisa xadrez vermelha de manga dobrada, colete marrom, calça jeans, luvas, cinto com fivela dourada, chapéu de palha, sorrisão.
* **Dona Jurema**: chapéu verde com girassol, trança longa sobre o ombro, top cropped verde, calça cargo com bolsinhas e uma galinha caipira no ombro.
* **Zé Patrão**: grandalhão de barba, bigode e sobrancelhas brancas, camisa xadrez amarela e verde, macacão azul, chapéu de palha largo.
* **Tati Fumaça**: cabelo rosa em dois coques com óculos de proteção, top preto, calça roxa, luvas sem dedo e frasco de fumaça roxa na cintura.
* **Seu Mineiro**: óculos de grau, camisa bege, colete verde com bolsos, chapéu de palha e mochila com cilindro verde brilhante.
Os chapéus cosméticos do perfil continuam valendo no Battle Royale. No tiro na cabeça, voa o chapéu do agente.

## 🆕 v5.5 — 5 agentes com 4 habilidades + Fazenda do Milharal
### Agentes (escolhidos na SELEÇÃO DE AGENTES)
Cada agente tem **Z e X** (compradas na loja), **C — assinatura** (1 grátis por round, recarrega sozinha) e **F — suprema**
(carrega com pontos: +1 por abate, +1 por morte, +1 por plantar/desarmar e +1 pela **Espiga Dourada**, que aparece 2 vezes por round
no caminho do ataque até cada bombsite). Todas as supremas custam 7 pontos e são anunciadas para os dois times.
| Agente | Função | Z | X | C (assinatura) | F (suprema) |
|---|---|---|---|---|---|
| **Tico Bruto** | Espetáculo | Investida do Touro | Granada de Milho (clarão) | Pulo do Sítio (salto de ~4 m) | **Festa do Roçado** — 5 estouros de fogos numa área marcada |
| **Dona Jurema** | Caçadora | Marca do Matuto (gavião revela) | Espião do Mato (dardo com 2 pulsos) | Armadilha de Galinha (persegue, explode em penas, cega e revela) | **Olho da Roça** — revela todos os inimigos 3 vezes |
| **Zé Patrão** | Parede | Cerca Elétrica (armadilha) | Portão Blindado (barreira) | Sinal do Gado (sino sensor) | **Território do Patrão** — após 5 s prende inimigos a 16 m (lentos e sem atirar); a placa pode ser quebrada |
| **Tati Fumaça** | Neblina | Fumaça da Roça | Nuvem Tática (fumaça à distância na mira) | Campo Sujeira (lama) | **Chuva de Insetos** — enxame que tapa a visão, deixa lento e causa dano |
| **Seu Mineiro** | Suporte | Pão de Queijo (cura 50) | Cura de Fazenda (área de cura) | Reforço do Sítio (+50 de escudo em você e aliados a 5 m) | **Reanimação do Bão** — levanta um aliado caído com 60 de vida |
* HUD com 4 espaços (recarga da assinatura e pontos da suprema), aviso "SUPREMA PRONTA", tela de "preso" no Território.
* Bots usam as 20 habilidades (inclusive supremas no momento certo) e a defesa arma Cerca Elétrica e Sinal do Gado na compra.
* Teclas novas: `C` assinatura e `F` suprema (o `C` deixou de agachar; agachar é `Ctrl`). Tudo remapeável.
### Mapa: Fazenda do Milharal (3º mapa competitivo)
Defesa ao norte com acesso livre a A (Celeiro) e B (Armazém) na compra; ataque ao sul com **3 saídas** (A Main, Mid, B Main) fechadas
pelas barreiras. Controle do Mid com A Curto e B Curto, Árvore (meio alto) para a rotação da defesa, palheiro elevado no A,
contêiner elevado no B, milharais nas bordas, caixas-d'água, moinhos e tratores.
### Testes novos
`test/t_agents.js` (as 20 habilidades, assinatura, suprema, Espiga, escudo, reviver e uso pelos bots) e `test/agents_ui.js` (HUD,
ícones e supremas no navegador); `t_flow`/`t_tat` também rodam no mapa novo.

## 🆕 v5.4 — Fluxo competitivo profissional (5x5)
**SELEÇÃO DE AGENTES → CARREGAMENTO → COMPRA INICIAL 70 s → BARREIRAS LIBERADAS → ROUND → RESULTADO → COMPRA 15 s → PRÓXIMO ROUND**
* **Máquina de estados no anfitrião** (`src/js/47_flow.js`): `AGENT_SELECTION → MAP_LOADING → INITIAL_BUY_PHASE → ROUND_ACTIVE →
  ROUND_RESULT → ROUND_BUY_PHASE → … → MATCH_FINISHED`. Toda troca passa por `setPhase`, que recusa transições inválidas.
  Os cronômetros são do anfitrião; os clientes só exibem o que ele manda.
* **Seleção de agentes (60 s)**: os 10 escolhem ao mesmo tempo (clicar no agente + **TRAVAR**); um agente por equipe; bots escolhem
  sozinhos em momentos diferentes (e cedem a vaga se um humano quiser o agente deles). Se os 10 travarem antes, a seleção
  acaba na hora; se o tempo acabar, quem não escolheu recebe um agente livre. Os agentes dos adversários só aparecem no carregamento.
* **Carregamento**: mapa ilustrado (bombsites, spawns e barreiras), os dois times com agentes e o status **PRONTO** de cada um.
  A partida espera todos os clientes (até 25 s; quem não carregar não trava ninguém).
* **Compra**: 70 s antes do 1º round e 15 s nos seguintes (após o resultado). Na compra todos andam, compram e usam habilidades,
  mas ninguém atira nem causa dano.
* **Barreiras só no spawn do ATAQUE** (cerca energética: palanques, fios elétricos e cortina de luz, com som de ativação/liberação).
  São calculadas automaticamente a partir da malha de navegação de cada mapa (servem para qualquer mapa novo): a defesa circula livre
  entre A e B e já monta armadilhas; o ataque fica no spawn. Colisão real (no anfitrião e na predição dos clientes), sem
  passar por portas estreitas nem por cima de caixas. Somem no mesmo tick para todos quando o round começa.
* **Bots na compra**: compram, a defesa se posiciona no bombsite combinado e o ataque encosta na barreira da rota planejada.
* **Avisos**: SELECIONE SEU AGENTE · MAPA CARREGANDO · PREPARE-SE · FASE DE COMPRA · BARREIRAS ATIVADAS · ROUND INICIADO /
  BARREIRAS LIBERADAS · ROUND VENCIDO · ROUND PERDIDO · PRÓXIMO ROUND.
* **Testes**: `test/t_flow.js` (lógica: 10 bots, humanos + bots, seleção antecipada e por tempo, cliente lento, 70 s/15 s exatos,
  barreiras em todas as saídas + varredura em 24 direções, liberação simultânea, créditos, ciclo até o fim) e `test/flow_ui.js`
  (navegador); `test/mp_e2e.js` cobre seleção, "pronto" e barreiras sincronizadas entre anfitrião e cliente.

## 🆕 v5.3 — Sensação de tiro, mortes cartoon e chapéus
* **Números de dano** sobre o inimigo (somam rajadas; amarelo com "!" no tiro na cabeça). Liga/desliga em Configurações → Jogabilidade.
* **Marcador de acerto** em três tons: branco (corpo), amarelo (cabeça), vermelho maior (eliminação).
* **Reação ao tiro**: o personagem atingido dá um tranco para trás (mais forte na cabeça).
* **Chapéu voa no tiro na cabeça**: sai girando, cai devagar e fica no chão alguns segundos; o personagem fica sem chapéu.
* **Eliminações cartoon** (com "puf" de poeira, penas na Dona Galinha e sons próprios):
  cai de costas · cara no chão (quique) · **rodopia e senta tonto com estrelinhas** (tiro na cabeça) ·
  **arremessado longe** (ovo, mandioca, escopeta — sem atravessar paredes) · ajoelha e tomba de lado (facão, zona).
  Sons cartoon desligáveis em Configurações → Áudio.
* **Chapéus cosméticos desbloqueados por nível** (Perfil → Chapéu): Palha (2), Boné do Trator (3), Pescador (4), Bandana (5),
  Vaqueiro (7), Panela da Vó (9), Girassol (12), Coroa de Milho (15). Aparecem para todos no online
  (o chapéu viaja junto com a skin, sem mudar o protocolo). A tela de resultado avisa quando um chapéu novo é liberado.

## 🆕 v5.2 — Modo competitivo tático 5x5
* **Formato competitivo** (até 13, troca após 12, prorrogação no 12x12), rodada de 1min40s, plantio 4 s, desarme 7 s.
* **5 fazendeiros** com 2 habilidades cada (modelos, efeitos e HUD próprios), sem repetição na equipe.
* **Economia** com bônus de derrotas seguidas, prêmio por objetivo e dinheiro por abate conforme a arma.
* **IA tática**: planos por rodada, lurker, rotação da defesa, recuo, rádio da equipe e uso de habilidades.
* **Segundo mapa competitivo** (Moinho das Três Porteiras) e **seleção de mapa**.
* **Interface**: indicador de vivos, `Tab` enxuto, tela de vitória/derrota e resultados com MVP, revanche e anti-AFK.

## 🎨 v5.1 — Render v2, Fase A (visual cartoon)
Mesmo renderizador WebGL2 próprio, com um estágio de pós-processamento (`src/js/13_post.js`):
* **Luz cartoon em faixas** (terminador definido + 2 faixas), **sombra fria** (tom do céu) e **luz quente**, **rim light** discreta,
  brilho especular em mancha e texturas "pintadas" (ruído fino achatado para a cor média).
* **Contorno cartoon** por profundidade + normais (só na borda do objeto mais próximo; mais fraco em folhagem e terreno, some ao longe).
* **Oclusão ambiente** em meia resolução, **imagem HDR** (RGBA16F) com tonemap ACES, **gradação de cor** e **FXAA**.
* Presets: **Baixo** (direto na tela, luz cartoon, sombra curta), **Médio** (HDR + gradação + FXAA, sombra 70 m),
  **Alto** (+ contorno + oclusão, sombra 90 m mais suave). Opções separadas: Contornos, Oclusão, Iluminação cartoon.
* **Medidor de desempenho** (Configurações → Gráficos, ou `?perf=1`): FPS, tempo de quadro (média/p95/pior), CPU do render,
  GPU por passe (quando o navegador oferece `EXT_disjoint_timer_query_webgl2`), chamadas, triângulos, VRAM estimada.
* **Benchmark** no seu hardware: abra `index.html?auto=caos&bench=1` (ou `auto=tatico`) e espere ~1 minuto: a tabela compara
  Alto, Alto sem contorno, Alto sem AO, Médio, Baixo e Muito baixo.

## 🆕 v5 — Battle Royale cartoon
* **Visual:** dia azul com nuvens volumosas, névoa só no horizonte (alcance maior; nada de cenário desbotado), grama em tons de verde
  com manchas, caminhos de terra alaranjados, paredões em arenito, água azul-turquesa com brilho do sol.
* **Mapa:** 4 chapadas com paredão e rampa (Morro do Mirante, Chapada do Gavião, Pedra do Sino, Serrote) com torre no topo; píeres e
  barquinhos nas lagoas; ilha; campo de girassóis 3D; chiqueiro; celeiro com portas de correr abertas e acabamento branco; casarão de
  madeira; caminhonete e trator cartoon.
* **Paraquedas:** velame de 9 gomos inflados preso ao personagem numa única hierarquia — as linhas terminam nas mãos; abertura que
  infla, balanço de pêndulo, inclinação nas curvas, pouso com agachamento e pano que murcha.
* **Mochila (`I`)** e **placar (`Tab`)** redesenhados no estilo madeira, com retratos 3D dos personagens.
* **Correções:** guarda de área jogável no 5x5 (ninguém fica em telhado/fora do mapa), laço de bots pegando/largando arma sem parar.

## 🎮 Modos (regras independentes)
### Roçado Tático 5x5 (Azul x Vermelho) — modo competitivo
* **Formato competitivo**: vence quem fizer **13**; rodadas 1–12 Azul ataca, **troca de lados após 12** (intervalo com placar parcial).
  **12x12 → prorrogação** em blocos de 6 (3 atacando + 3 defendendo; vence quem fizer 4 no bloco; empate após 4 blocos).
  Formato **Rápido**: vence quem fizer 5, troca após 4. Valores em `TAT_FORMATS` (`src/js/01_data.js`).
* **Rodada**: 1min40s · fase de compra de 70 s no 1º round e 15 s nos seguintes · **plantar 4 s** · **desarmar 7 s** ·
  mandioca explode 40 s após o plantio. Vitória por eliminação, por tempo (defesa), por explosão ou por desarme.
* **Fazendeiros** (escolhidos na tela de SELEÇÃO DE AGENTES; um de cada por equipe; habilidades em `Z` e `X`, cargas compradas na loja):
  | Fazendeiro | Papel | Habilidades |
  |---|---|---|
  | Peão de Choque | Ataque | Investida do Boi (arrancada) · Rojão de São João (clarão que cega até 2 s) |
  | Rastreador | Informação | Gavião Vigia (revela inimigos num cone) · Sino do Gado (sensor que revela quem passa) |
  | Guardião do Terreiro | Defesa | Cerca de Arame (barreira destrutível) · Arapuca (armadilha que prende e revela) |
  | Mateiro | Controle | Fumaça de Queimada (bloqueia visão) · Lamaçal (área que deixa lento) |
  | Socorrista | Suporte | Garrafada (cura em aliado ou em si) · Mutirão (área de cura para a equipe) |

  Nenhuma habilidade causa abate sozinha: todas têm contra-jogo (cerca quebra, fumaça some, clarão pode ser evitado virando o rosto).
* **Economia** (`ECON`/`KILL_MONEY`): começa com $800, máximo $9.000; abate paga conforme a arma (facão $750, estilingue $300,
  Chuva de Milho $450, Arregaça-Porteira $600, Roçadeira $300, Espingarda $100); vitória $3.250 ($3.500 por objetivo);
  derrota $1.400 + **bônus de derrotas seguidas** (+$500 por derrota, até $3.400); plantar/desarmar +$300 e +$600 para a equipe
  atacante que plantou mesmo perdendo. Vender devolve 50% (100% na mesma rodada). Quem sobrevive mantém o equipamento.
* **Loja (`B`)** com categorias e ficha completa de cada arma: preço, dano, cadência, precisão, distância efetiva, carregador e reserva.
* **IA tática dos bots**: plano por rodada (site, rotas longa/curta/alternativa, um "lurker" que segura o outro lado), defesa
  coordenada com rotação para o site em perigo, recuo em desvantagem, reação a sons e tiros, uso das habilidades por fazendeiro,
  rádio da equipe ("inimigo no Curral!") e precisão que varia com distância, arma, movimento próprio, recuo e dificuldade.
* **Interface**: placar de rodadas, relógio, objetivo A/B, dinheiro, vida, colete, arma e munição, habilidades, minimapa e
  **indicador de vivos** de cada equipe. **`Tab`** enxuto: Jogador · Abates · Mortes · Assist. · Dinheiro · Ping.
* **Fim de partida**: tela de **Vitória/Derrota/Empate** com placar, linha do tempo das rodadas (como cada uma foi vencida),
  **MVP da partida** e tabelas das duas equipes (abates, mortes, assistências, MVPs da rodada, pontos). MVP de cada rodada no anúncio.
  **Revanche** (mesmo mapa e, online, mesmas equipes) ou **jogar no outro mapa**. Histórico de partidas registra o mapa.
* **Anti-AFK** (partidas online): parado 45 s numa rodada valendo → aviso; 75 s → um bot assume o peão até o jogador voltar a mexer.
  Desligado no treino offline. **Reconexão**: quem cai volta para a mesma partida (um bot segura a vaga enquanto isso).
* **Espectador** após morrer (clique troca o companheiro assistido), **chat**, **rádio** e **voz da equipe** (WebRTC, só aliados,
  `T` ou microfone aberto), sons posicionais, **treino com bots** (offline, dificuldade ajustável) e **seleção de mapa**.

### Todos Contra Todos — Battle Royale (até 50, com bots)
* **Vaca voadora** atravessa o mapa; salte quando quiser (`Espaço`). Quem fica até o fim da trajetória é avisado e eliminado (anti-AFK).
* **Paraquedas improvisado** (lençol, pano de prato, toalha ou guarda-chuva — escolha no perfil): `WASD` direciona, `Ctrl` desce mais rápido.
* **Loot** variável por partida (mais perto das construções), **mochila (`I`)** com limite de capacidade: equipar/trocar/largar armas, ver munição,
  **selecionar e confirmar** cura (nunca automática): Pano de Prato 25/2 s · Leite da Mimosa 15/2 s · Spray Mata-Bicheira 30/1,5 s ·
  Mel do Apiário 40/5 s · Marmita da Vó 50/4 s · Caixa do Seu Zé 100/7 s (rara). Atalho `H` usa a cura selecionada.
* **Zona progressiva** em 5 fases (dano crescente), próxima zona marcada; **mapa grande `M`** mostra zona, rota da vaca e
  inimigos só por ~3 s quando atiram.

## 🗺️ Mapas independentes
Os mapas do 5x5 são exclusivos do modo competitivo (nada é reaproveitado do Battle Royale). Escolha em **Jogar**, **Criar Partida**
ou no **Chiqueiro** (anfitrião): Vila do Roçado, Moinho das Três Porteiras, Fazenda do Milharal ou Aleatório.

### Vila do Roçado — 5x5 (160 × 136 m, norte–sul)
Planta no estilo CS/Valorant: **Bombsite A** (Celeiro Vermelho) no extremo oeste e **Bombsite B** (Armazém dos Silos) no extremo leste,
~110 m entre eles. Acampamento dos atacantes ao sul, Base da Defesa ao norte. Para cada site: **rota longa** (Longo A / Longo B),
**rota curta** pelo meio (Casa do Caseiro → Curto A, Galinheiro → Curto B) e **acesso pelo fundo** (rotação da defesa pelo Corredor).
**Pátio** central de confronto, **Rampa** e **Riacho** rebaixado como flanco entre os dois longos. Posições elevadas por escada
(palheiro do A, contêiner do B, mirantes do meio), caixas, fardos e muros de cobertura (`test/t_arena.js`).

### Moinho das Três Porteiras — 5x5 (170 × 128 m, leste–oeste, fim de tarde)
Ataque a leste, defesa a oeste; **A (Moinho)** ao norte e **B (Celeiro)** ao sul, ~98 m entre eles (rotação A↔B ~17 s).
Três rotas principais: **Estrada do Moinho** (longo A, com Paiol e Porteira de pedra quebrando a visão), **Rua do Meio → Pátio →
Beco/Janela** (curto A) ou **Curral** (curto B) e **Beira do Rio** (longo B, com Vau). Rotas alternativas pela **Tulha** e pela
**Casa do Rio** (construções com duas portas ligando longo ↔ pátio). Defesa com corredores diretos e a Passagem até o pátio.
Pontos elevados: palheiro do A, contêiner do B e mirante (contêiner) do Pátio. Tempos e linhas de visão medidos em `test/t_arena2.js`
(ataque ~20 s até cada site, defesa ~8 s, meio disputado com diferença < 2 s).

### Fazenda do Zé — exclusiva do Todos Contra Todos (500 × 500 m)
Sede com casa principal, celeiros grandes, Haras e Estábulo (baias e curral), Armazém de Grãos (4 silos, galpão, caminhonetes),
Morro do Mirante, torres de observação, tratores e veículos nas estradas, Fazenda Vizinha, Fazenda Abandonada, Celeiro Incendiado,
Grande Milharal, Pastagem com açude, Sítio Antigo, Rio das Pedras (fundo, 3 pontes), Cachoeiras, Vila do Bom Jesus e Galpões e Depósitos.
Todas as regiões têm nome no mapa grande (`M`). Loot concentrado nos pontos de interesse e zona segura em 5 fases.
**Natação**: em água funda a arma é guardada, não dá para atirar, a velocidade cai; `Ctrl` mergulha (gasta fôlego; sem fôlego, perde vida).

## 🔫 Armas e itens (arsenal central — `src/js/31_arsenal.js`)
Cada arma e item tem **um único modelo 3D cartoon** usado na mão (1ª pessoa), no personagem, no chão, na barra, na mochila e na loja
(as imagens da loja e os ícones são renderizados desse mesmo modelo). Facão de mato largo, Chuva de Milho com carregador de espiga e
mira de ponto, Arregaça-Porteira de **cano duplo que abre na dobradiça** (dois cartuchos saem, dois entram), Roçadeira com carregador
curvo, Espingarda do Coronel com **luneta funcional** (`V` = 2º zoom), Estilingue com elásticos e bolsa, Colete de Ração com placas,
Ovo de Galinha com explosão de casca e penas, Pano de Prato e Caixinha do Seu Zé com **animação de uso em 1ª pessoa**.
**Loja (`B`)**: categorias (Estilingues, Metralhadoras, Escopetas, Fuzis, Precisão, Equipamentos, Cura), cartões com a imagem 3D,
preço em destaque, dinheiro, estados comprado/equipado/sem dinheiro/limite, painel de detalhes com 360°, animação de compra e layout adaptável.
Estilingue (grátis, 7 + 14 pedras) · Chuva de Milho (metralhadora) · Arregaça-Porteira (escopeta, 8 chumbos) · Roçadeira (fuzil) ·
Espingarda do Coronel (precisão, `V` = 2º zoom) · Facão do Mato · Ovo de Galinha (granada, `G`).
Headshot: **CAPRICHOU NO CHAPÉU!** (+ chapéu, som e bônus); também BOA, CABOCLO! · DUPLA MANDIOCADA! · TRÊS NO ROÇADO! · FACÃO SEM DÓ! · SOBROU SÓ VOCÊ! · DONO DO ROÇADO!

## ⌨️ Controles (todos remapeáveis em Configurações → Controles)
`WASD` mover · `Shift` correr · `Ctrl`/`C` agachar/deslizar/mergulhar · `Espaço` pular/escalar/saltar da vaca · mouse mira/atira (botão direito = ADS) ·
`R` recarregar · `E` interagir · `G` ovo · `Q` soltar a mandioca · `F` fazendeiro (5x5) · `Z`/`X` habilidades (5x5) · `H` cura · `B` loja · `I` mochila · `M` mapa · `Tab` placar · `Enter` chat · `T` falar · `1–5` armas.
**Controle USB/Bluetooth** (detecção automática, ícones mudam). **Celular**: joystick virtual, câmera arrastando à direita,
botões de tiro, mira, pulo, corrida, recarga, interação, mochila/loja, troca, agachar — tamanho, transparência, sensibilidade e **posição** ajustáveis.

## ⚙️ Desempenho
LOD de terreno e árvores, corte por distância e frustum, sombras só do que está perto (e mais simples longe), neblina proporcional à
distância de visão. Presets **Muito baixo / Baixo / Médio / Alto**, **modo desempenho**, **limite de 30/60/120 FPS**, distância de visão,
qualidade das sombras e dos efeitos, indicador de **FPS, ping e perda de pacotes**. O celular começa em "Baixo".
Clima dinâmico (sol, nublado, chuva leve, tempestade, neblina) — no 5x5 só climas que não atrapalham a visão.

## 🌐 Multiplayer
* **Anfitrião autoritativo**: quem cria a sala roda a simulação (dano, eliminações, dinheiro, inventário, objetivos, resultados).
  O navegador dos outros só envia comandos e pedidos ("comprar X") — o anfitrião valida tudo.
* Conexão **WebRTC via PeerJS** (broker gratuito + STUN). Salas por código/link (`?sala=CODIGO`) e **salas públicas** `PT1…PT6` / `PC1…PC6`.
* Com bots ligados: sala pública com você sozinho inicia em 30 s; com 2+ humanos, 20 s; o anfitrião pode iniciar na hora. Equipes equilibradas.
* **Reconexão**: um bot assume enquanto você volta (até 90 s).
* **Jogadores online reais**: o menu soma os humanos das salas públicas abertas (aguardando / em partida / bots à parte). Bots nunca contam.
* Limites honestos: sem servidor TURN algumas redes restritas não conectam (adicione TURN em `ICE`, `src/js/50_net.js`); se o anfitrião sair, a partida termina.

## 👤 Contas, progresso e social
* Cadastro só com **apelido + senha**. Senha guardada apenas como **hash PBKDF2-SHA-256 (310 mil iterações + sal)**; **código de recuperação**
  mostrado no cadastro; **bloqueio progressivo** após 3 tentativas erradas; sessão de 30 dias. Pode jogar como convidado.
* Perfil: nível, XP, título, vitórias/derrotas, eliminações, mortes, assistências, headshots, precisão, tempo de jogo, estatísticas separadas do
  5x5 e do BR, **histórico** das últimas 40 partidas, **conquistas** (Primeiro Sangue, Chapéu Furado, Rei da Mandioca, Defensor do Roçado,
  Pé de Pano, Sobrevivente, Mestre do Estilingue, Dono do Roçado, Peão Veterano) e **ranking geral/semanal**.
* Amigos (status online pelas salas públicas, convite por link, entrar na sala do amigo), **bloquear** (esconde chat e voz), **denunciar**
  (vai para o anfitrião), anti-spam no chat.

> ⚠️ **Sobre "servidor e banco de dados"**: o GitHub Pages só hospeda arquivos estáticos — não roda servidor nem banco. Por isso as contas,
> estatísticas e o ranking ficam **no navegador do jogador** (com a senha em hash) e o "servidor" de cada partida é o anfitrião.
> Contas compartilhadas entre aparelhos, ranking mundial e anti-cheat de servidor exigem um backend (ex.: Supabase/Firebase/um servidor Node);
> o código foi organizado para receber isso depois (`Account` em `src/js/58_account.js` e `NetHost` em `src/js/50_net.js`).

## 🧪 Testes
`bash test/all.sh` roda tudo: regras (formato até 13, troca após 12, prorrogação, economia, loja, cura, BR com 50, vaca, paraquedas, natação),
partidas completas 5x5 só com bots nos dois mapas (`t_tat.js`), anti-AFK (`t_afk.js`), interface do 5x5 no navegador (`tat_ui.js`),
bots, colisões, multiplayer com 2 abas (5x5 e BR, compra pela rede, reconexão, salas públicas), contas, toque no celular e desempenho.

## 🧱 Desenvolvimento
`node build.js` → `dist/index.html`. Código em `src/js/` (módulos numerados): `10–12` renderizador, `20–24` mapa e regiões da fazenda, `25–26` mapas 5x5,
`30–31` modelos e arsenal central, `40–46` simulação/regras/bots/itens/fazendeiros/IA tática, `50` rede, `51` áudio, `52–58` cliente/HUD/UI/controles/contas, `60–61` jogo e boot.
