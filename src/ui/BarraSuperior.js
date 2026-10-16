import { h } from "./dom.js";
import { icone } from "./icones.js";
import { Autocompletar } from "./Autocompletar.js";

const VISTAS = [
  ["Esq", "Lateral esquerda", { x: -540, y: 40, z: 20 }],
  ["Dir", "Lateral direita", { x: 540, y: 40, z: 20 }],
  ["Topo", "Vista superior", { x: 0, y: 560, z: 40 }],
  ["Frente", "Vista frontal", { x: 0, y: 60, z: 560 }],
  ["Trás", "Vista posterior", { x: 0, y: 60, z: -560 }],
];

/** Faixa superior: marca com números · busca · vistas rápidas de câmera. */
export class BarraSuperior {
  constructor(pai, { buscar, cor, aoEscolher, aoVista }) {
    const topo = h("div", "c3d-topo", pai);

    const marca = h("div", "c3d-marca c3d-vidro c3d-hud", topo);
    icone(h("span", "c3d-marca-icone", marca), "cerebro", 18);
    const txt = h("div", "c3d-marca-txt", marca);
    h("div", "c3d-marca-titulo", txt, "Cérebro 3D");
    this.numeros = h("div", "c3d-marca-sub", txt, "");

    const busca = h("div", "c3d-busca c3d-vidro c3d-hud", topo);
    icone(h("span", "c3d-busca-icone", busca), "busca", 15);
    this.campo = h("input", "c3d-input", busca);
    this.campo.placeholder = "Buscar nota ou memória…";
    h("kbd", "c3d-kbd", busca, "/");
    new Autocompletar(this.campo, busca, {
      buscar, cor,
      aoEscolher: (n) => { aoEscolher(n); this.campo.value = ""; this.campo.blur(); },
    });

    const vistas = h("div", "c3d-vistas c3d-vidro c3d-hud", topo);
    for (const [rotulo, dica, posicao] of VISTAS) {
      const b = h("button", "c3d-vista", vistas, rotulo);
      b.title = dica;
      b.setAttribute("aria-label", dica);
      b.onclick = () => aoVista(posicao);
    }
  }

  mostrarNumeros(notas, memorias, conexoes) {
    this.numeros.textContent = `${notas} notas · ${memorias} memórias · ${conexoes} conexões`;
  }

  focarBusca() { this.campo.focus(); }
}
