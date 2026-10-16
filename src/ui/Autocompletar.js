import { h, ponto } from "./dom.js";
import { AREAS } from "../configuracoes/padrao.js";

/**
 * Lista de sugestões para um campo de texto (setas, Enter, Esc).
 * @param {(texto: string) => object[]} buscar  devolve nós
 * @param {(area: string) => string} cor
 * @param {(no: object) => void} aoEscolher
 */
export class Autocompletar {
  constructor(input, ancora, { buscar, cor, aoEscolher }) {
    Object.assign(this, { input, buscar, cor, aoEscolher });
    this.caixa = h("div", "c3d-sugestoes c3d-vidro", ancora);
    this.itens = [];
    this.ativo = 0;
    input.addEventListener("input", () => { this.itens = this.buscar(input.value); this.ativo = 0; this.render(); });
    input.addEventListener("keydown", (e) => this.teclado(e));
    input.addEventListener("blur", () => setTimeout(() => this.fechar(), 120));
    this.fechar();
  }

  teclado(e) {
    if (e.key === "ArrowDown") { this.ativo = Math.min(this.ativo + 1, this.itens.length - 1); this.render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { this.ativo = Math.max(this.ativo - 1, 0); this.render(); e.preventDefault(); }
    else if (e.key === "Enter" && this.itens[this.ativo]) { this.escolher(this.itens[this.ativo]); e.preventDefault(); }
    else if (e.key === "Escape") this.fechar();
    e.stopPropagation(); // não dispara os atalhos da tela enquanto digita
  }

  escolher(no) { this.aoEscolher(no); this.fechar(); }

  render() {
    this.caixa.innerHTML = "";
    this.itens.forEach((n, i) => {
      const item = h("div", "c3d-sug" + (i === this.ativo ? " ativo" : ""), this.caixa);
      ponto(item, this.cor(n.lobo));
      h("span", "c3d-sug-nome", item, n.nome);
      h("span", "c3d-sug-area", item, AREAS[n.lobo].nome);
      item.onpointerdown = (e) => { e.preventDefault(); this.escolher(n); };
    });
    this.caixa.style.display = this.itens.length ? "block" : "none";
  }

  fechar() { this.caixa.style.display = "none"; }
}
