# 🥔💥 BOMBAKI — Guerra no Roçado (v7.10 BETA)

FPS multiplayer cartoon com temática rural brasileira que roda **direto no navegador** (PC, notebook e celular na
horizontal). Um único arquivo `index.html`, motor WebGL2 próprio, multiplayer P2P — funciona no **GitHub Pages**.

## ▶️ Publicar no GitHub Pages
1. Crie um repositório e envie o **`index.html`** para a raiz.
2. **Settings → Pages → Deploy from a branch → `main` / `(root)` → Save**.
3. O jogo fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Também abre direto do arquivo (offline, contra bots). Online precisa de internet.

## 🛠️ Desenvolvimento (TypeScript + esbuild)
Precisa do **Node.js 18+**. Na pasta do projeto:
```bash
npm install            # instala esbuild e TypeScript (só para desenvolver; o jogo não depende deles)
npm run build          # gera dist/index.html (arquivo único)
npm run build:split    # gera a pasta publicar/ (arquivos separados)
npm run typecheck      # verifica os tipos de TODO o código (precisa dar 0 erros)
npm test               # bateria completa de testes (tipos + lógica + navegador)
```
- Os módulos ficam em `src/js/NN_nome.ts` (TypeScript) ou `src/js/NN_nome.js` (JavaScript verificado pelo TypeScript com `checkJs`). O número define a ordem.
- O **esbuild** converte os `.ts` e valida a sintaxe dos `.js` no build.
- Migração em andamento: o núcleo (`00_util`, `02_world`, `03_move`) já é TypeScript; o resto é JavaScript com verificação de tipos ligada. Os tipos compartilhados ficam em `types/`.
- Motor gráfico: `src/js/14_three.js` (Three.js) usa as mesmas malhas/texturas do clássico (`10_gl`–`13_post`); o Three.js vem do `npm` e é embutido pelo build (`src/vendor/three-entry.js`).

## 📁 Código separado
O código-fonte fica separado em `src/` (é aqui que se edita):
- `src/index.template.html` — estrutura das telas · `src/style.css` — visual · `src/js/NN_nome.js` — 50 módulos, na ordem do número.

`node build.js` junta tudo e gera **dois jeitos de publicar** (o jogo é igual nos dois):
- **Arquivo único** → `dist/index.html` (copie para `index.html`). Mais simples: um arquivo só.
- **Separado** → `node build.js --split publicar` gera a pasta `publicar/` com `index.html`, `css/bombaki.css` e `js/<área>/*.js`
  (`nucleo`, `graficos`, `mapas`, `modelos`, `simulacao`, `rede-audio`, `interface`, `jogo`). Envie **o conteúdo da pasta** para o repositório.
  Vantagem: o navegador guarda os arquivos em cache e erros mostram o arquivo e a linha certos.

## 🆕 v7.10 BETA — 5 agentes novos (os únicos personagens) e melhorias gerais
### Agentes (modelo 3D próprio com roupa, rig do Meshy, animações do jogo transferidas)
| Agente | Papel | Z | X | C (assinatura) | F (suprema) |
|---|---|---|---|---|---|
| **Zeca Rojão** | Duelista | Laço (puxa até 18 m) | Pulo de Rodeio | Arrancada de Touro (abate recarrega) | Rodeio Final (8 s: +15% velocidade, tiro andando preciso, recarga −30%; abate renova) |
| **Bia Gavião** | Iniciadora | Rojão de São João (cega) | Pena Marcadora (revela) | Gavião (cone de 38 m) | Revoada (3 pulsos no mapa todo) |
| **Dona Zefa** | Sentinela | Arame Farpado | Sino da Porteira | Cerca de Madeira | Porteira Trancada |
| **Seu Brasa** | Controlador | Cinza Quente (lentidão) | Fogueira (fumaça na mira) | Carvão em Brasa (2 fumaças) | Queimada (muro de fumaça de 28 m) |
| **Lua Raizeira** | Suporte | Chá de Boldo (cura em área) | Muda de Mandacaru (parede que espeta) | Benzedura (cura até 15 m) | Simpatia (revive) |
- Os 5 são **os únicos personagens** do jogo: no 5x5 são os agentes; no Todos contra Todos qualquer um pode usar, de graça.
- Modelos: `modelos/agente_<nome>.glb` (+ `_lod` para longe/qualidade baixa). As animações do boneco base foram **transferidas** para o rig de cada um (`ferramentas/retarget.mjs`, rotação relativa à pose de repouso + quadril escalado) e as alturas igualadas. Os corpos/roupas antigos foram para `ferramentas/fontes_modelos/` (fora do jogo).
- **Mandioca-bomba 3D** (`modelos/mandioca.glb`, 555 mil → 12 mil triângulos): nas costas, no chão, plantada e na mão.
### Melhorias
- Corpos 3D até 170 m (antes viravam bonecos de código longe); retrato da HUD em 3D; braços em 1ª pessoa com a roupa e a pele de cada agente.
- Pistolas: pose com as duas mãos em 3ª pessoa; em 1ª pessoa, recarga própria do Trezoitão (tambor) e do Tijolinho (pente). Corrigido: as armas novas não usavam a mira (ADS) e a recarga certas em 1ª pessoa.
- Bots pegam armas melhores do chão no 5x5 e variam a compra entre as 12 armas; equilíbrio bot × bot ≈ 50% ataque.
- Dicas de controle (Q larga a arma, E pega), mixagem do volume de cada arma, nomes das skins Natal/Ouro das 6 armas novas.
- Testes de rede/toque usam a **versão leve** `dist/leve.html` (`node build.js --web --nomodels --out dist/leve.html`, sem modelos 3D) — o `test/all.sh` gera as duas.

## 🆕 v7.9.1 — Drop de armas no 5x5 (estilo Valorant)
- **5x5:** ao morrer, as armas de fogo caem no chão (menos estilingue e facão), com o pente que tinham e a **skin de quem era o dono**. Qualquer um pega com **E** (aliado ou inimigo, na compra ou na rodada): troca pela arma do mesmo tipo (primária ↔ primária, pistola ↔ pistola) e a skin vai junto (os outros jogadores também veem). **Q** larga a arma da mão (ou a mandioca, se estiver com ela na mão). As armas no chão somem no começo da rodada seguinte.
- Arma pega do chão **não pode ser vendida** (só o que você comprou na rodada); se comprar outra do mesmo tipo, a pega do chão é largada.
- **Todos contra Todos:** largar/pegar já existia; agora a skin também acompanha a arma.
- Rede: a lista de itens no chão vale no 5x5 também (com a skin) e cada jogador envia a skin da arma pega (campo 15 do jogador).
- Teste novo: `test/drop5.js`.

## 🆕 v7.9 BETA — Arsenal de 12 armas, precisão por movimento e loja nova do 5x5
- **Armas novas** (modelos 3D do Meshy): **Cabrita** e **Moedor de Café** (metralhadoras), **Enxadão** (fuzil), **Vara de Pescar** (sniper básica), **Trezoitão** (revólver) e **Tijolinho** (pistola). A **Porteira** deixou de ser escopeta e virou o fuzil pesado (um tiro na cabeça derruba).
- Arsenal: pistolas (Estilingue grátis, Tijolinho, Trezoitão) · metralhadoras (Cabrita, Chuva de Milho, Moedor) · fuzis (Enxadão, Roçadeira, Porteira) · snipers (Vara, Coronel) · Facão. Pistolas compradas ficam no slot 2 (uma por vez; o estilingue continua).
- Cada arma nova usa a animação de 1ª pessoa e o som da arma "base" (`base` em `WEAPONS`, função `wBase`); novas entram no fim de `WSLOTS` (rede compatível). Bots compram e escolhem as novas (`BOT_PREF`); itens do Todos contra Todos incluem todas.
- **Precisão estilo tático** (`calcSpread`, `MOVE_INACC`): parado o 1º tiro vai reto; andando a imprecisão cresce com a velocidade (fuzis sofrem mais, metralhadoras e pistolas menos, snipers muito, mesmo com luneta); no ar fica péssima; parar devolve a precisão na hora. A mira abre e fecha junto.
- **Loja do 5x5 nova**: todas as armas numa grade compacta (sem categorias) com ícones 3D, detalhe à direita (giro 3D, atributos, comprar/vender) e, embaixo, as 4 habilidades do agente no estilo do TAB (tecla, descrição curta, cargas, preço) + equipamentos.
- **Sons de tiro próprios** para cada arma (perfis em `WEAPON_SND`): corrente da bicicleta na Cabrita, manivela no Moedor, lâmina vibrando no Enxadão, tambor do Trezoitão, estalo seco do Tijolinho, pancada grave da Porteira.
- **Todos contra Todos:** o dobro de loot, toda arma no chão vem com a munição dela ao lado, munição só das armas que existem; **baús** espalhados (brilham de longe, abrem com E, soltam arma de nível melhor + munição + cura + colete/capacete/ovo/especial; bots também abrem); **armas no chão com o modelo 3D** (`LootGLB`); som de baú abrindo.
- **Desempenho:** em qualidade Média/Baixa/Celular os outros personagens usam o corpo leve (LOD); em Alto/Ultra o corpo original só a até ~15 m. Retratos 3D (seleção de agentes, HUD) são montados uma vez e esperam a roupa carregar, sem travar a tela.
- Testes novos: `test/armas_novas.js`, `test/br_loot.js` (e `test/shop.js` atualizado para a loja nova).

## 🆕 v7.8.2 — Roupas presas aos ossos, ícones novos e roupa com rig
- **Roupas:** cada ponto da roupa segue os 2 ossos mais próximos (repouso) com regras de região: abaixo da cintura só pernas, braço só do mesmo lado, clavícula com peso baixo (a manga sobe junto com o braço). Fantasias com capuz: a parte de cima segue a cabeça e cresce para cobrir a cabeça grande do personagem.
- **Roupa com rig** (ex.: `roupa_azul.glb`, moletom do Maico Capuz Azul): usa os pesos do rig dela, ligados aos ossos do corpo pelo nome; a posição é encaixada no tamanho de cada corpo.
- **Ícones 3D novos** (`Icon3D` em `36_glb.js`): armas com as skins (o shader recolore o modelo: listras de Natal, gelo, ouro, neon, brasa, camuflado, algodão-doce), chapéus com modelo, personagens vestidos, emotes na pose, retratos/rostos (HUD, seleção de agentes, perfil). Armário, Loja, barra de armas e seleção de agentes usam os ícones novos.
- **Chapéus:** Palha, Boné, Pescador (safári) e o novo **Chapéu de Broto** (nível 6) em 3D; os demais (bandana, panela, vaqueiro, Noel...) continuam com o desenho antigo, ajustado à cabeça nova.

## 🆕 v7.8 BETA — Personagens novos, roupas, chapéus e armas em 3D (Meshy)
- **Corpo base novo** (cartoon de cabeção, rosto com textura) masculino e feminino, rig Mixamo de 24 ossos. Animações do Meshy + as do pacote 2 trazidas por `ferramentas/juntar_anims.mjs` (`TRAZER=...`).
- Clipes no jogo: andar atirando (`Walk_Forward_While_Shooting`), facada (`Thrust_Slash`), arremesso (`Crouch_Pull_and_Throw`), reação a dano (`Hit_Reaction`) e recarga como camada de cima; morte `Knock_Down`/`Dead`/`dying_backwards`; emotes Acenar (`Wave_One_Hand`, no lugar da saudação), `FunnyDancing_01` (Pulo da Rena), `Victory_Cheer`.
- **Roupas em arquivo** (`modelos/roupa_*.glb`): encaixadas no tamanho de cada corpo e presas ao esqueleto na hora (pesos copiados dos vértices do corpo mais próximos; abaixo da cintura só pernas, mangas só braços). A pele coberta pela roupa some; antebraço com tom de pele. Quem usa o quê: `OUTFIT` em `36_glb.js`.
- **Chapéus em arquivo** (`modelos/chapeu_*.glb`): palha, boné, safári e broto, presos ao osso da cabeça (`HAT_GLB`, `HAT_FIT`). Fantasias com capuz (galinha, porco) ficam sem chapéu.
- **Armas em 3D** (`modelos/arma_N.glb`): Facão, Estilingue, Chuva de Milho, Porteira, Roçadeira e Coronel com os modelos novos, na mão dos personagens e em primeira pessoa (`WEAPON_GLB`: cabo, mão de apoio e tamanho). Os modelos 3, 4, 7, 8, 11 e 12 já estão no build para as armas novas.
- **Build:** `node build.js --web --out index.html` gera o `index.html` do site (2 MB) e a pasta `modelos/js/` (cada modelo em base64, carregado por `<script>` só quando precisa: funciona no site **e abrindo o index.html direto do disco**); `node build.js --split publicar` faz o mesmo separado em arquivos. `node build.js` sozinho gera `dist/index.html` com os modelos embutidos (abre direto do disco, ~110 MB). Publique sempre a pasta `modelos/` junto.
- Roupas, chapéus e armas foram reduzidos (25 mil / ~10 mil / 14 mil triângulos, textura 1024) para aguentar 10 personagens na tela; os corpos são os originais.

## 🆕 v7.7 BETA — Pacote 2 de animações (masculino e feminino)
- Novo `modelos/base_masculino.glb`: o rig do Meshy/Mixamo enviado (57 ossos) com **27 animações** — as 20 novas + agachar, morrer e pular do pacote antigo (trazidas por `ferramentas/juntar_anims.mjs`, só rotações e quadril ajustado à altura).
- Animações geradas por texto renomeadas: `Rifle_Idle`, `Rifle_Aim_Idle`, `Strafe_Left/Right`, `Rifle_Reload`, `Grenade_Throw`, `Dance_Forro`, `Dance_Galinha`, `Dance_Requebra`, `Victory`, `Defeat`.
- No jogo: parado e mirando com arma, correr com arma (`Rifle_Charge`), andar de costas, andar de lado (e agachado de lado), 3 animações de morte.
- Camada de cima (tronco e braços por cima das pernas): **recarga** acompanha o progresso real, com a arma presa na mão; **arremesso do ovo**.
- Emotes com animação própria: Forró, Galinha e 3 novos grátis — *Requebrado do Arraiá*, *Colheita Farta* (vitória) e *Perdeu pro Mato* (derrota).
- **Pele procedural** nos dois corpos (`SKIN_GLSL` em `36_glb.js`): tom do personagem + manchas suaves, poros e rubor, presa ao corpo durante as animações. No masculino (sem textura) olhos, sobrancelhas, bochechas e boca são pintados no shader; no feminino vêm da textura dela.
- **Corpo base sem roupa** (`BODY3D.nu = true`): só roupa de baixo neutra e sem chapéu, esperando os arquivos de roupa. Para voltar às roupas pintadas por região: `BODY3D.nu = false`.
- Versões leves (LOD) refeitas dos modelos novos.
- Feminino: novo `modelos/base_feminino.glb` com rig Mixamo (24 ossos, sem dedos), as mesmas animações + `Dance_Rebolado`, e os clipes antigos de agachar/morrer/pular trazidos do masculino.
- Teste novo: `test/anims.js`.

## 🆕 v7.6 BETA — Corpo masculino com rig Mixamo (dedos + 19 animações)
* `modelos/base_masculino.glb` agora vem do rig **Mixamo** (57 ossos, com dedos) e 19 animações; otimizado de 24,5 MB para 2 MB.
* Nomes de osso traduzidos automaticamente (rig Meshy e rig Mixamo funcionam juntos — o feminino ainda usa o rig antigo).
* Deslocamento das animações travado (o jogo move o personagem; só a altura do quadril é usada).
* Animações reais: **andar/correr**, **agachado parado** e **andando agachado**, **pulo** e **duas mortes** (alternadas);
  o que não tem animação continua por código (mira, armas, paraquedas, emotes).
* **Dedos fecham em volta da arma** (cada falange gira na direção da palma; indicador direito mais solto no gatilho).

## 🆕 v7.5.1 — Armas na mão (corpo 3D)
* Empunhadura por tipo de arma: **rifles** (Roçadeira, Porteira, Coronel, Chuva de Milho) com a coronha apoiada no ombro direito,
  rosto na arma e cano na linha da mira, girando em torno do ombro; **estilingue** com o braço esquerdo esticado e a mão direita
  puxando o elástico; **facão** baixo à frente; **batata** erguida para arremessar; **mandioca** nas duas mãos.
* A posição usa o osso real do ombro (acompanha a mira e o agachamento) e o tamanho real de cada arma.

## 🆕 v7.5 BETA — Corpo 3D (bases do Meshy) para todos os personagens
* Dois modelos base gerados no Meshy (**masculino** e **feminino**, mesmo esqueleto de 24 ossos) em `modelos/`, otimizados de
  22–25 MB / 181 mil triângulos para **~760 KB / ~13 mil triângulos** (e versões leves de ~4 mil para o Todos contra Todos).
  O build embute os `.glb` em base64 (`GLB_DATA`), então funcionam também abrindo o `index.html` direto do disco.
* **Roupa por região do corpo** (osso dominante de cada vértice): pele/rosto (mantém olhos e boca da textura, ajustando o tom
  de pele), camisa, manga (curta mostra o antebraço), barriga (top), cinto, calça e botas — cores tiradas de cada personagem/agente.
  Cabelo, barba, capuz e chapéu de cada um ficam presos ao osso da cabeça; a mandioca vai nas costas de quem carrega.
* **Poses por código direto nos ossos**: braços com IK de 2 ossos segurando a arma na direção da mira, cabeça e tronco
  acompanhando a mira, agachar (quadril desce e joelhos dobram com os pés no chão), pulo, queda ao morrer, paraquedas e emotes.
  Andar/correr usam as animações do próprio modelo (velocidade da animação acompanha a do jogador).
* **Desempenho**: até 14 corpos 3D por quadro (55 m no 5x5, 28 m no Todos contra Todos com o modelo leve); além disso,
  o boneco de código. Fantasias de bicho (galinha/porco) continuam no boneco de código. Teste: `test/body3d.js`.
* Para gerar/otimizar de novo: `node ferramentas/opt_glb.mjs entrada.glb modelos/base_x.glb 0.07 1024` (gltf-transform + meshoptimizer).

## 🆕 v7.4 BETA — Personagens humanoides, menu minimalista e playlist
* **Corpo humanoide para todos** (5x5 e Todos contra Todos): proporções reais (cabeça menor, ombros/deltoides, peitoral, cintura,
  quadril), **cotovelo e joelho por IK de 2 ossos** (braços seguram a arma dobrando o cotovelo, pernas dobram no agachamento),
  mão com palma, quatro dedos e polegar, botas com cano, bico e sola. Cada personagem mantém rosto, cabelo, chapéu e cores.
  O boneco do menu agora é o mesmo em todos os modos (antes trocava ao escolher o 5x5).
* **Menu e painéis minimalistas** no estilo da HUD (madeira escura translúcida, bege, dourado): barra de navegação compacta,
  botão JOGAR menor, cartões e abas discretos em Loja, Perfil, Armário, Conquistas e janelas.
* **Natal só na tela de carregamento**: o menu perdeu neve, árvore, boneco de neve, gorro do logo e o card do evento
  (virou **Presente do Dia**); a luz do menu é de fim de tarde. A loja mostra a coleção como **Destaques** / **LIMITADO**.
* **Playlist do menu em loop** com 6 trilhas (5 novas): Toada do Roçado, **Forró da Feira**, **Moda de Viola**,
  **Quadrilha do Roçado**, **Entardecer na Varanda** e **Xaxado do Cangaço** — cada uma toca ~2 min e passa para a próxima.
  Total do jogo: 11 trilhas compostas + a de Natal do carregamento.

## 🆕 v7.3 BETA — Motor de áudio 2.0 (procedural, arquivo único `src/js/51_audio.js`)
Tudo continua gerado por código (Web Audio API, nenhum MP3/WAV/OGG), agora organizado em 12 subsistemas dentro da classe `Sfx`
(Core, Bus, DSP, Layers, Spatial, Environment, Weapons, Movement, Combat, Ambient, Music, Manager). A interface antiga (`sfx.shot`, `sfx.step`…) foi mantida.
* **Músicas novas compostas** com instrumentos sintetizados (violão Karplus-Strong com corpo, baixo, **sanfona** com palhetas desafinadas e vibrato,
  glockenspiel, **sinos de trenó**, **zabumba**, **triângulo**, bacalhau, ganzá, pad):
  **Natal na Roça** (tela de carregamento e menu — *Jingle Bells*, domínio público, em arranjo de roça) · **Toada do Roçado** (compra) ·
  **Baião do Celeiro** (round 5x5, camadas sobem com a intensidade: combate por perto → mandioca plantada/clutch) · **Correria da Mandioca** ·
  **Últimos Sobreviventes** · **Forró da Vitória**. Seções (verso, refrão, ponte), instrumento solista alternando a cada volta, humanização e
  troca de trilha sincronizada no compasso. A música abaixa sozinha em tiros, explosões e dano (*ducking*).
* **Efeitos realistas por camadas**: perfil por arma (estalo, corpo, explosão do disparo, cauda, mecânica, saturação), ressonância de materiais
  (madeira, metal, pedra, terra, vidro, água, borracha, carne) nos passos e impactos de bala, explosões com chegada atrasada pela distância,
  destroços e ronco; animais por formantes (vaca, galo, galinha, porco); vento estéreo com rajadas, folhas, grilos e pássaros posicionados.
* **Espacial**: `PannerNode` com HRTF para sons próximos/críticos, abafamento por distância, **obstrução por paredes** (o jogo informa via
  linha de visão), **reverb por sala** (aberto, casa, celeiro, galpão, porão — detectada pela câmera) e Doppler para fontes em movimento.
* **Gerenciador de vozes**: limite de vozes, prioridade (crítico rouba vozes secundárias), deduplicação, limpeza dos nós e qualidade adaptativa
  (menos vozes e sem HRTF quando o fps cai). Testes em `test/audio.js` renderizam as trilhas e uma demonstração de efeitos (WAV com `WAV=<pasta>`).

## 🆕 v7.2 BETA — Tempos do 5x5 no estilo Valorant competitivo
| Etapa | Antes | Agora |
|---|---|---|
| Seleção de agentes | 60 s | **80 s** |
| 1ª compra de cada metade (rodadas 1 e 13) | 70 s (só na rodada 1) | **45 s** |
| Compra normal | 15 s | **30 s** |
| Combate | 1min40s | 1min40s |
| Mandioca plantada | 40 s | **45 s** |
| Resultado da rodada | 5 s | **7 s** |
| Prorrogação (12x12) | blocos 3+3, quem fizer 4 | **pares de rodadas, vence quem ganhar as duas** (troca de lado a cada rodada, $ 5000 para todos) |

O TAB também foi redesenhado: dois painéis lado a lado (ALIADOS | INIMIGOS) com K / D / A / PING.

## 🆕 v7.1 BETA — HUD nova, mapa novo, emote e braços
* **HUD reformulada** (rural, moderna e minimalista — madeira escura, bege, verde, dourado; aliado petróleo, inimigo terracota):
  minimapa com moldura de madeira (norte para cima, sua seta mostra a direção), placar compacto **ALIADOS | TEMPO | INIMIGOS**
  com animação ao pontuar, contagem discreta da compra (últimos 5 s em destaque), vida com coração (cor muda aos poucos, alerta
  quando baixa, barra "fantasma" mostrando o dano), colete com escudo, retrato 3D real do agente, inventário central com tecla,
  ícone, munição e destaque dourado, habilidades separadas ao lado (disponível, recarga com varredura circular, usada, sem cargas).
* Saíram da HUD permanente: lista de jogadores, painel de objetivo, lista de controles e dinheiro. **TAB** abre o placar temático
  (aliados × inimigos) e o **dinheiro aparece só dentro da loja (B)**. Loja e TAB com animação de entrada/saída.
* Organização em componentes no `HUD` (`matchScore`, `roundTimer`, `playerStatus`, `updateHotbar`, `drawMini`, `tab`) lendo só os
  dados reais do jogo e atualizando apenas o que mudou. Testado em 1920×1080, 1600×900, 1366×768 e 1280×720 (`test/hud_ui.js`).
* **Mapa novo**: Vila Girassol (ver abaixo). Os 3 mapas antigos foram apagados.
* **Emote** não troca mais o personagem do menu; **braços e mãos** arredondados e pegada do estilingue refeita.

## 🆕 v7.0 BETA — Motor gráfico Three.js (Fase 2)
- O jogo agora desenha com o **Three.js** (embutido no arquivo, funciona offline e no GitHub Pages):
  iluminação física (PBR), **sombras suaves** que acompanham o jogador, **oclusão de ambiente (GTAO)** nos cantos e contatos,
  **bloom**, tom de cinema **ACES** e anti-serrilhado **SMAA** (no gráfico Alto).
- Céu com nuvens, água, partículas, rastros de tiro, vidros, marcas de tiro e o braço em primeira pessoa foram portados.
- **Modelos 3D (.glb/.gltf) com animação**: registre o arquivo do personagem e ele substitui o boneco de código, com
  animações parado/andar/correr/pular/morrer/emote em transição suave e a arma presa no osso da mão:
  ```js
  CHAR_GLB.capuz = { url: 'modelos/maico.glb', scale: 1, clips: { idle: 'Idle', walk: 'Walk', run: 'Run', jump: 'Jump', death: 'Death', dance: 'Dance' } };
  ```
  (arquivo `src/js/36_glb.js`; chaves: capuz, ze, tonhao, chico, galinha, porcao, joao)
- **Configurações → Motor gráfico**: Three.js (padrão) ou Clássico (mais leve, para aparelhos fracos). Se o Three.js falhar
  no aparelho, o jogo volta sozinho para o clássico.

## 🆕 v6.2 BETA — Personagens novos (estilo cartoon fofo)
- Os 7 personagens refeitos no estilo da arte oficial: cabeça grande e redonda, **rosto pintado** (olhos grandes com íris colorida e dois brilhos, cílios, sobrancelhas marcadas, sorriso de canto, bochechas; piscadinha no Seu Porcão), cabelo em mechas macias.
- Corpo, braços e pernas **arredondados**, mãos de luva com polegar, botas e tênis com bico, sola grossa e cadarço cruzado.
- Roupas detalhadas: camisa de botão com gola, bolsos com aba, fivela e manga dobrada; moletom com capuz, listras, cordões e bolso canguru; calças cargo com bolsos; macacões de **galinha** (bico, olhos, crista, penas, gravata, pés de galinha) e de **porco** (orelhas, focinho, rabinho).
- Chapéus novos: palha do Zé, boné virado do Tonhão, safári do Chico e chapéu com broto do João.
- Rostinhos do menu/HUD e cartões do Armário mostram o modelo real do jogo; braço em primeira pessoa arredondado.

## 🆕 v6.1 BETA — Amigos e Esquadrão (estilo Free Fire)
- **Código de amigo** (ex.: `#K7Q2MX`) e **link de convite** (`?amigo=CÓDIGO`) para mandar no WhatsApp. Funciona sem servidor: cada jogador abre uma "caixa postal" P2P.
- **Aba AMIGOS**: enviar pedido pelo código, pedidos recebidos (aceitar / recusar / bloquear) com aviso na aba, lista com status ao vivo (No menu · No esquadrão 2/4 · Jogando · Offline), **remover** e **bloquear** (com confirmação), lista de bloqueados e "Jogaram com você" para adicionar quem estava na partida.
- **Esquadrão (party) de até 4**: convite chega como popup em qualquer tela (Aceitar/Recusar), "Entrar no esquadrão" de um amigo, "Pedir para entrar", líder remove membro, membro sai; membros apertam **PRONTO**; os companheiros aparecem **em 3D ao lado do seu peão** no menu, com nome e status.
- **Começar juntos**: o líder escolhe o modo e aperta JOGAR — a sala é criada e todos entram juntos (no Treino com Bots ou na Partida Pública). No **5x5 o esquadrão cai no mesmo time**.
- **Battle Royale em Solo, Dupla ou Esquadrão (4)**: aliados não se ferem, bots completam os esquadrões e respeitam o time, nomes e vida dos aliados aparecem na tela (com distância), painel ESQUADRÃO na partida e vitória do último esquadrão de pé ("BOOYAH NA ROÇA!").
- O esquadrão continua junto depois da partida.

## 🆕 v6.0 BETA — Natal na Roça: menu novo, Perfil, Armário, Loja de Cosméticos e Emotes
- **Tela de carregamento de Natal**: noite estrelada com aurora, neve caindo, celeiro com pisca-pisca, árvore de Natal, boneco de neve, barra de bengala doce com porcentagem e dicas.
- **Menu inicial refeito**: barra superior (Jogar · Perfil · Armário · Loja · Conquistas), Milho 🌽 (moeda), cartão de perfil com nível e título, seletor de modo, botão JOGAR novo, cartão do evento com contagem para o Natal e **presente diário**, barra de emotes, versão **BETA v6.0.0** (Discord removido). Cena 3D com árvore de Natal, presentes, boneco de neve, montes e flocos de neve; arraste para girar o personagem.
- **Perfil**: apelido, título, XP, estatísticas e tudo que está equipado.
- **Armário** com prévia 3D ao vivo: skins de arma, emotes (3 espaços), chapéus, personagem e paraquedas.
- **Loja de Cosméticos** (só visual): 7 acabamentos para **todas as armas, inclusive o facão** (Bengala de Natal, Floco de Neve, Ouro do Coronel, Neon do Forró, Brasa do Fogão, Camuflado Milharal, Algodão-Doce), com chaveiros e **armas personalizadas** (Bengala Quebra-Nozes, Peixeira do Coronel, Lâmina de Gelo…), chapéus de Natal e emote de Natal. Compra com Milho ganho nas partidas.
- **Emotes**: Forró Arretado, Saudação do Peão, Dança da Galinha (iniciais) e Pulo da Rena (loja). Na partida: **Y** e depois **1/2/3** (no celular, botão ☺); a câmera vai para terceira pessoa enquanto você dança. Todos veem seus emotes e suas skins (bots também usam skins).
- Janelas do jogo (Jogar, Configurações, Criar sala…) no novo tema azul-noite com dourado.

## 🆕 v5.9 — Vidros quebráveis, parkour, armas e animais novos
- **Mochila no 5x5 corrigida**: agora abre (tecla B / botão) com armas, curas e as 4 habilidades do agente; na fase de compra o botão abre a Loja.
- **Janelas de vidro de verdade**: dá para enxergar através, quebrar com tiro (a bala continua), facada, granada ou correndo/pulando contra. Janela quebrada = **parkour**: corra ou aperte Espaço de frente para pular pelo peitoril. No 5x5 os vidros voltam a cada rodada; janelas pintadas nos blocos sólidos quebram mas não são passagem.
- **Armas**: estilingue puxa a borracha, solta com estalo e a pedra voa com rastro; cápsulas ejetadas, fumaça no cano, novos acabamentos (lâmina girando na Roçadeira, anéis de latão e flores na Porteira, estrela de xerife na do Coronel, palha na Chuva de Milho, miçangas no estilingue).
- **Animais novos**: vacas com manchas, sino e rabo; galinhas que batem as asas e bicam; porcos que fuçam. Fogem de tiros, explosões e de quem passa correndo, com mugido/cacarejo/ronco.
- **Visual e menus**: bloom e vinheta (desligáveis nas Configurações), animações de entrada nos menus, botões com brilho e som ao passar o mouse.

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
**SELEÇÃO DE AGENTES (80 s) → CARREGAMENTO → COMPRA INICIAL 45 s → BARREIRAS LIBERADAS → ROUND (1min40s) → RESULTADO (7 s) → COMPRA 30 s → PRÓXIMO ROUND**
* **Máquina de estados no anfitrião** (`src/js/47_flow.js`): `AGENT_SELECTION → MAP_LOADING → INITIAL_BUY_PHASE → ROUND_ACTIVE →
  ROUND_RESULT → ROUND_BUY_PHASE → … → MATCH_FINISHED`. Toda troca passa por `setPhase`, que recusa transições inválidas.
  Os cronômetros são do anfitrião; os clientes só exibem o que ele manda.
* **Seleção de agentes (60 s)**: os 10 escolhem ao mesmo tempo (clicar no agente + **TRAVAR**); um agente por equipe; bots escolhem
  sozinhos em momentos diferentes (e cedem a vaga se um humano quiser o agente deles). Se os 10 travarem antes, a seleção
  acaba na hora; se o tempo acabar, quem não escolheu recebe um agente livre. Os agentes dos adversários só aparecem no carregamento.
* **Carregamento**: mapa ilustrado (bombsites, spawns e barreiras), os dois times com agentes e o status **PRONTO** de cada um.
  A partida espera todos os clientes (até 25 s; quem não carregar não trava ninguém).
* **Compra**: 45 s na 1ª rodada de cada metade (rodadas 1 e 13) e 30 s nas demais. Na compra todos andam, compram e usam habilidades,
  mas ninguém atira nem causa dano.
* **Barreiras só no spawn do ATAQUE** (cerca energética: palanques, fios elétricos e cortina de luz, com som de ativação/liberação).
  São calculadas automaticamente a partir da malha de navegação de cada mapa (servem para qualquer mapa novo): a defesa circula livre
  entre A e B e já monta armadilhas; o ataque fica no spawn. Colisão real (no anfitrião e na predição dos clientes), sem
  passar por portas estreitas nem por cima de caixas. Somem no mesmo tick para todos quando o round começa.
* **Bots na compra**: compram, a defesa se posiciona no bombsite combinado e o ataque encosta na barreira da rota planejada.
* **Avisos**: SELECIONE SEU AGENTE · MAPA CARREGANDO · PREPARE-SE · FASE DE COMPRA · BARREIRAS ATIVADAS · ROUND INICIADO /
  BARREIRAS LIBERADAS · ROUND VENCIDO · ROUND PERDIDO · PRÓXIMO ROUND.
* **Testes**: `test/t_flow.js` (lógica: 10 bots, humanos + bots, seleção antecipada e por tempo, cliente lento, 45 s/30 s exatos,
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
  **12x12 → prorrogação** em pares de rodadas (uma de cada lado, trocando de lado a cada rodada, todos com $ 5000): **vence quem ganhar as duas do par**; 1 a 1 → novo par.
  Formato **Rápido**: vence quem fizer 5, troca após 4. Valores em `TAT_FORMATS` (`src/js/01_data.js`).
* **Rodada**: 1min40s · compra de 45 s no início de cada metade e 30 s nas demais · **plantar 4 s** · **desarmar 7 s** ·
  mandioca explode 45 s após o plantio · 7 s de resultado entre as rodadas. Vitória por eliminação, por tempo (defesa), por explosão ou por desarme.
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
O mapa do 5x5 é exclusivo do modo competitivo (nada é reaproveitado do Battle Royale). Na v7.1 os três mapas antigos
(Vila do Roçado, Moinho das Três Porteiras e Fazenda do Milharal) foram **removidos** e substituídos por um mapa feito do zero.

### Vila Girassol — 5x5 (144 × 140 m, norte–sul) — `src/js/25_vila.js`
Vila do interior: casinhas de reboco creme com **telha vermelha**, **janelas verdes com venezianas**, floreiras, portas com degrau
e chaminés; muros de reboco com beiral de telha fechando quintais com **árvores frondosas**; ruas de terra batida, cercas de madeira,
postes, barris, caixotes e fardos; moinhos, capela, caixa-d'água e plantações de trigo e milho em volta.
* **A — Moinho** (oeste): moinho de vento girando + palheiro elevado. **B — Capela** (leste): adro com poço, bancos e coreto elevado; a torre da capela marca o lado B.
* **Ataque** ao sul (Rua de Baixo) com 3 saídas: **Estrada A**, **Viela do Meio** e **Estrada B** (barreiras na compra). Porteiras de pedra estreitam as estradas antes dos sites.
* **Praça** central com poço, grande mangueira, bancos e canteiros; **Beco A / Beco B** ligam a praça aos sites.
* **Defesa** ao norte (Rua de Cima) com descidas para A e B, **Corredor da Igreja** até a praça e **Travessas A/B** para rodar entre os sites.
* Medido em `test/t_vila.js`: ataque ~16,6 s até cada site, defesa ~12,3 s, meio disputado (8,6 s × 8,9 s), blocos sem vazamento,
  plantio/desarme nos dois sites; em `test/t_tat.js` o ataque vence ~43% das rodadas entre bots.

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
