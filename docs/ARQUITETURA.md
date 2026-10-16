# Arquitetura do Cérebro 3D

## Visão geral

```
src/
├── main.js                     Plugin do Obsidian: registra view, comando, ícone e configurações
├── CerebroView.js              Mediador: monta as peças e decide "quem chama quem"
├── configuracoes/
│   ├── padrao.js               Áreas, status, configurações padrão, leitura de regras
│   └── AbaDeConfiguracoes.js   Tela de configurações
├── dominio/                    Sem three.js e sem DOM — regras puras
│   ├── Grafo.js                Nós, ligações, busca e menor caminho (BFS)
│   ├── Classificador.js        Área / status / data de cada nota
│   ├── Calendario.js           Meses cobertos e contagem por mês
│   └── LeitorDeMemorias.js     Memórias do Claude Code no disco
├── cena/                       Tudo que é 3D
│   ├── Cena3D.js               3d-force-graph, bloom, câmera, redimensionamento, laço de animação, giro
│   ├── Anatomia.js             Malhas reais, regiões anatômicas, posição dos neurônios
│   ├── NuvemCerebral.js        Superfície em partículas (shader)
│   ├── Neuronio.js             Visual de uma nota (níveis, pulso, nascimento)
│   ├── Axonios.js              Todas as ligações num LineSegments com shader (sinais e crescimento)
│   ├── Ondas.js                Pool de anéis de luz
│   ├── CameraCinematografica.js
│   ├── util.js                 RNG determinístico e texturas
│   └── malhas/                 fsaverage5 e cerebelo SUIT (dados compactados em base64)
├── app/
│   ├── EstadoVisual.js         O que está em destaque → nível de cada neurônio/axônio
│   └── Reprodutor.js           Play da linha do tempo
└── ui/                         Um componente por elemento da HUD
    ├── BarraSuperior.js · BarraDeFerramentas.js · Popovers.js · Autocompletar.js
    ├── Legenda.js · CartaoDeDetalhes.js · LinhaDoTempoUI.js · Letreiro.js
    ├── Avisos.js · ModalDeMemoria.js · icones.js · dom.js
```

## Princípios aplicados

| Princípio | Onde |
|---|---|
| **Responsabilidade única (S)** | cada arquivo faz uma coisa: `Classificador` só classifica, `Axonios` só desenha ligações, `LinhaDoTempoUI` só desenha a barra… A `CerebroView` não tem regra de negócio: só liga as peças. |
| **Aberto/fechado (O)** | a `BarraDeFerramentas` recebe uma lista declarativa de botões; os `Popovers` herdam de uma base; novas áreas entram em `AREAS`/regras sem mudar o código das classes. |
| **Substituição de Liskov (L)** | `PainelCaminho`, `PainelAjustes` e `PainelAtalhos` são `Popover` e funcionam no `GerenciadorDePopovers` sem tratamento especial. |
| **Segregação de interfaces (I)** | componentes recebem só os callbacks que usam (`aoFocarArea`, `aoAlternarArea`…), nunca a view inteira. |
| **Inversão de dependência (D)** | `Reprodutor` recebe colaboradores (cena, câmera, ondas, linha do tempo, letreiro, contexto) — dá para testar com dublês. O `dominio/` não depende de `cena/` nem de `ui/`. |

## Decisões

- **Posições fixas pela anatomia, sem simulação de forças.** Cada nota é sorteada dentro da sua região (30–68% do caminho entre a superfície e o centro do hemisfério), com espaçamento mínimo. Resultado estável entre aberturas e nada sai do cérebro.
- **Axônios no shader, não no 3d-force-graph.** ~1.000 ligações viram um único `LineSegments`: uma chamada de desenho, sinais animados e crescimento na linha do tempo calculados na GPU (`uAgora`, `uJanela`). O 3d-force-graph cuida só dos nós.
- **Malhas reais embutidas.** As superfícies GIFTI são convertidas por `tools/converter_*.py` em `Int16/Uint16/Int8` base64 — o plugin funciona offline.
- **Linha do tempo numa só escala.** Histograma, cursor e rótulos usam a mesma conta (o mês *i* ocupa a faixa `[i, i+1]`), por isso nunca dessincronizam.
- **Sem loop de redimensionamento.** O `ResizeObserver` só age quando o tamanho inteiro muda, e a view não tem rolagem nem padding (antes isso fazia a tela tremer).
- **Configuração pessoal fora do código.** Os padrões são genéricos; regras de cada vault ficam no `data.json` do próprio plugin.

## Testes visuais

`test/` monta a `CerebroView` no navegador com um Obsidian simulado (`obsidian-mock.js`). `npm run demo` gera um vault fictício determinístico e `tools/gravar-demo.js` grava a demonstração quadro a quadro com o relógio do Playwright — o vídeo sai fluido mesmo em máquina lenta.
