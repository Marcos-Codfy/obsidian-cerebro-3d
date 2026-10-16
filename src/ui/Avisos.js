import { h } from "./dom.js";

/** Mensagem curta que aparece no topo e some sozinha. */
export class Aviso {
  constructor(pai) {
    this.el = h("div", "c3d-aviso", pai);
  }
  mostrar(texto, ms = 3800) {
    this.el.textContent = texto;
    this.el.classList.add("visivel");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.remove("visivel"), ms);
  }
}

/** Tela preta com spinner enquanto o cérebro é montado. */
export class TelaDeCarregamento {
  constructor(pai) {
    this.el = h("div", "c3d-carregando", pai);
    h("div", "c3d-spinner", this.el);
    h("div", null, this.el, "Montando o cérebro…");
  }
  concluir() { setTimeout(() => this.el.classList.add("pronto"), 250); }
}
