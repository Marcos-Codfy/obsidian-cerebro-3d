# Créditos e licenças de terceiros

O código do **Cérebro 3D** é distribuído sob a [PolyForm Noncommercial 1.0.0](LICENSE).
Ele usa e redistribui (dentro do `main.js` compilado) os trabalhos abaixo, cada um sob a sua própria licença:

| Componente | Uso | Licença |
|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) | renderização 3D, shaders, pós-processamento (UnrealBloomPass, OutputPass) | MIT |
| [3d-force-graph](https://github.com/vasturiano/3d-force-graph) | grafo 3D, câmera orbital, interação com os nós | MIT |
| [three-spritetext](https://github.com/vasturiano/three-spritetext) | rótulos de texto na cena | MIT |
| **fsaverage5** — superfície pial e profundidade dos sulcos ([FreeSurfer](https://surfer.nmr.mgh.harvard.edu/), distribuída pelo [nilearn](https://github.com/nilearn/nilearn)) | malha do córtex (`dados_brutos/fsaverage5`, `src/cena/malhas/fsaverage5.js`) | nilearn: BSD-3-Clause · FreeSurfer: termos da licença FreeSurfer |
| **Atlas SUIT** — superfície pial do cerebelo ([SUITPy](https://github.com/DiedrichsenLab/SUITPy), Diedrichsen Lab) | malha do cerebelo (`dados_brutos/suit_cerebelo`, `src/cena/malhas/cerebelo_suit.js`) | MIT |
| Ícones no estilo [Lucide](https://lucide.dev) | ícones da interface (redesenhados em `src/ui/icones.js`) | ISC |

### Referências científicas das malhas
- Fischl, B. *FreeSurfer*. NeuroImage 62(2), 774–781 (2012).
- Diedrichsen, J. *A spatially unbiased atlas template of the human cerebellum*. NeuroImage 33(1), 127–138 (2006).
- Diedrichsen, J.; Zotow, E. *Surface-based display of volume-averaged cerebellar imaging data*. PLoS ONE 10(7) (2015).

Ferramentas de desenvolvimento (não vão no plugin): [esbuild](https://esbuild.github.io) (MIT), [Playwright](https://playwright.dev) (Apache-2.0), [FFmpeg](https://ffmpeg.org) via imageio-ffmpeg (LGPL/GPL).
