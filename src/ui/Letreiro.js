import { h } from "./dom.js";

/** Letreiro cinematográfico da reprodução: mês grande, ano, contagens e nomes das notas que nascem. */
export class Letreiro {
  constructor(pai) {
    this.el = h("div", "c3d-cinema", pai);
    this.mes = h("div", "c3d-cinema-mes", this.el);
    this.ano = h("div", "c3d-cinema-ano", this.el);
    const linha = h("div", "c3d-cinema-linha", this.el);
    this.novos = h("span", null, linha);
    h("span", "c3d-cinema-sep", linha, "·");
    this.total = h("span", null, linha);
    this.nomes = h("div", "c3d-cinema-nomes", this.el);
  }

  mostrarMes(mes, novosNoMes) {
    this.mes.textContent = mes.nomeLongo;
    this.ano.textContent = String(mes.ano);
    this.novos.textContent = novosNoMes ? `+${novosNoMes} neste mês` : "mês tranquilo";
    this.el.classList.remove("entra");
    void this.el.offsetWidth; // reinicia a animação de entrada
    this.el.classList.add("entra");
  }

  contar(neuronios) { this.total.textContent = `${neuronios} neurônios`; }

  anunciar(nome, cor) {
    const chip = h("div", "c3d-cinema-nome");
    chip.style.setProperty("--cor", cor);
    chip.textContent = nome;
    this.nomes.prepend(chip);
    while (this.nomes.children.length > 3) this.nomes.lastChild.remove();
    setTimeout(() => chip.remove(), 2700);
  }
}
