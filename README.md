# 🥔💥 BOMBAKI — Guerra no Roçado (v4)

FPS multiplayer cartoon com temática rural brasileira que roda **direto no navegador** (PC, notebook e celular na
horizontal). Um único arquivo `index.html`, motor WebGL2 próprio, multiplayer P2P — funciona no **GitHub Pages**.

## ▶️ Publicar no GitHub Pages
1. Crie um repositório e envie o **`index.html`** para a raiz.
2. **Settings → Pages → Deploy from a branch → `main` / `(root)` → Save**.
3. O jogo fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Também abre direto do arquivo (offline, contra bots). Online precisa de internet.

## 🎮 Modos (regras independentes)
### Roçado Tático 5x5 (Azul x Vermelho)
* **12 rodadas regulares**: rodadas 1–6 Azul ataca / Vermelho defende; **intervalo** com placar parcial; 7–12 lados trocados.
  A partida **não acaba ao chegar em 7** — joga as 12. 6x6 → **prorrogação** em pares (cada equipe ataca e defende uma vez)
  até alguém abrir 2 de vantagem (empate declarado após 6 pares). Há também o formato "Amistoso (6)" para salas privadas.
* **Mandioca (bomba)**: carregar, soltar (`Q`), pegar (`E`), plantar segurando `E` 3,2 s no ponto A/B, 40 s até explodir,
  desarmar segurando `E` 5,5 s. Explosão grande (letal até ~20 m com visão).
* **Economia + loja (`B`)** na fase de compra (20 s no início de cada tempo, 15 s nas demais): começa com $800;
  abate +200, vitória +3.000, derrota +1.900, plantar/desarmar +300 (máx. $9.000; valores em `ECON`, `src/js/01_data.js`).
  Vender devolve 50% (100% se comprado na mesma rodada). Quem sobrevive mantém armas e colete.
* **Cura limitada**: Pano de Prato do Vovô (+25 HP em 2,5 s, 1 por rodada) e Caixinha do Seu Zé (+50 HP em 5 s em você
  ou num aliado ao lado, **só uma por equipe**). Interrompidas por dano. Colete de Ração absorve dano (não cura).
* **Placar `Tab`**: equipes, K/D/A, headshots, precisão, pontos, dinheiro da sua equipe, ping, vivo/eliminado e 🥔 no portador.
* **Voz da equipe** (WebRTC, só aliados): Configurações → Áudio → "Apertar para falar" (`T`) ou "Microfone aberto".

### Todos Contra Todos — Battle Royale (até 50, com bots)
* **Vaca voadora** atravessa o mapa; salte quando quiser (`Espaço`). Quem fica até o fim da trajetória é avisado e eliminado (anti-AFK).
* **Paraquedas improvisado** (lençol, pano de prato, toalha ou guarda-chuva — escolha no perfil): `WASD` direciona, `Ctrl` desce mais rápido.
* **Loot** variável por partida (mais perto das construções), **mochila (`I`)** com limite de capacidade: equipar/trocar/largar armas, ver munição,
  **selecionar e confirmar** cura (nunca automática): Pano de Prato 25/2 s · Leite da Mimosa 15/2 s · Spray Mata-Bicheira 30/1,5 s ·
  Mel do Apiário 40/5 s · Marmita da Vó 50/4 s · Caixa do Seu Zé 100/7 s (rara). Atalho `H` usa a cura selecionada.
* **Zona progressiva** em 5 fases (dano crescente), próxima zona marcada; **mapa grande `M`** mostra zona, rota da vaca e
  inimigos só por ~3 s quando atiram.

## 🗺️ Dois mapas independentes
### Vila do Roçado — exclusivo do 5x5 (competitivo, 160 × 136 m)
Planta no estilo CS/Valorant: **Bombsite A** (Celeiro Vermelho) no extremo oeste e **Bombsite B** (Armazém dos Silos) no extremo leste,
~110 m entre eles. Acampamento dos atacantes ao sul, Base da Defesa ao norte. Para cada site: **rota longa** (Longo A / Longo B),
**rota curta** pelo meio (Casa do Caseiro → Curto A, Galinheiro → Curto B) e **acesso pelo fundo** (rotação da defesa pelo Corredor).
**Pátio** central de confronto, **Rampa** e **Riacho** rebaixado como flanco entre os dois longos. Posições elevadas por escada
(palheiro do A, contêiner do B, mirantes do meio), caixas, fardos e muros de cobertura. Tempos de deslocamento medidos no teste
(`test/t_arena.js`): os dois sites ficam equilibrados para ataque e defesa.

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
`R` recarregar · `E` interagir · `G` ovo · `Q` soltar a mandioca · `H` cura · `B` loja · `I` mochila · `M` mapa · `Tab` placar · `Enter` chat · `T` falar · `1–5` armas.
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
`bash test/all.sh` roda tudo: regras (12 rodadas, intervalo, prorrogação, economia, loja, cura, BR com 50, vaca, paraquedas, natação),
bots, colisões, multiplayer com 2 abas (5x5 e BR, compra pela rede, reconexão, salas públicas), contas, toque no celular e desempenho.

## 🧱 Desenvolvimento
`node build.js` → `dist/index.html`. Código em `src/js/` (módulos numerados): `10–12` renderizador, `20–24` mapa e regiões da fazenda, `25` mapa 5x5,
`30–31` modelos e arsenal central, `40–44` simulação/regras/bots/itens, `50` rede, `51` áudio, `52–58` cliente/HUD/UI/controles/contas, `60–61` jogo e boot.
