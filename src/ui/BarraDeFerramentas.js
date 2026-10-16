import { h } from "./dom.js";
import { icone } from "./icones.js";

/**
 * Barra vertical de ícones com dica. Cada botão é declarado por { chave, icone, dica, acao, separadorAntes }.
 * Novos botões entram só na lista — a classe não muda (aberta para extensão).
 */
export class BarraDeFerramentas {
  constructor(pai, botoes) {
    this.el = h("div", "c3d-barra c3d-vidro", pai);
    this.botoes = {};
    for (const b of botoes) {
      if (b.separadorAntes) h("div", "c3d-separador", this.el);
      const el = h("button", "c3d-botao", this.el);
      icone(el, b.icone, 17);
      el.setAttribute("data-dica", b.dica);
      el.setAttribute("aria-label", b.dica);
      el.onclick = (ev) => { ev.stopPropagation(); b.acao(); };
      if (b.oculto) el.style.display = "none";
      this.botoes[b.chave] = el;
    }
  }

  marcar(chave, ativo) {
    if (this.botoes[chave]) this.botoes[chave].classList.toggle("ativo", !!ativo);
  }
}
