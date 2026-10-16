import { h, ponto } from "./dom.js";
import { icone } from "./icones.js";
import { AREAS } from "../configuracoes/padrao.js";

/** Lista das áreas com contagem: clicar foca a área, o olho esconde/mostra. */
export class Legenda {
  constructor(pai, { cor, aoFocarArea, aoAlternarArea }) {
    Object.assign(this, { cor, aoFocarArea, aoAlternarArea });
    this.el = h("div", "c3d-legenda c3d-vidro c3d-hud", pai);
    const topo = h("div", "c3d-legenda-topo", this.el);
    h("div", "c3d-pop-titulo", topo, "Áreas do cérebro");
    h("div", "c3d-legenda-dica", topo, "clique foca · olho oculta");
    this.lista = h("div", "c3d-legenda-lista", this.el);
    const rodape = h("div", "c3d-legenda-rodape", this.el);
    h("span", "c3d-pulso", rodape);
    h("span", null, rodape, "ativo");
    h("span", "c3d-apagado", rodape);
    h("span", null, rodape, "pausado");
  }

  render(contagem, areaAtiva, areasOcultas) {
    this.lista.innerHTML = "";
    for (const [id, area] of Object.entries(AREAS)) {
      if (!contagem[id]) continue;
      const oculta = areasOcultas.has(id);
      const linha = h("div", "c3d-leg" + (areaAtiva === id ? " ativo" : "") + (oculta ? " oculto" : ""), this.lista);
      ponto(linha, this.cor(id), true);
      const txt = h("span", "c3d-leg-txt", linha);
      h("span", "c3d-leg-area", txt, area.nome);
      h("span", "c3d-leg-regiao", txt, area.regiao);
      h("span", "c3d-leg-num", linha, String(contagem[id]));
      const olho = h("button", "c3d-leg-olho", linha);
      icone(olho, oculta ? "olhoFechado" : "olho", 14);
      olho.title = oculta ? "Mostrar área" : "Ocultar área";
      olho.onclick = (e) => { e.stopPropagation(); this.aoAlternarArea(id); };
      linha.onclick = () => this.aoFocarArea(id);
    }
  }
}
