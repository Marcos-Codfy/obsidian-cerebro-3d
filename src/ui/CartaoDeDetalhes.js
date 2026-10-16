import { h, ponto, dataBR } from "./dom.js";
import { icone } from "./icones.js";
import { AREAS, STATUS } from "../configuracoes/padrao.js";

/**
 * Cartão da nota selecionada: área, status, números, ações e conexões agrupadas por área.
 * callbacks: aoAbrir(n), aoFocar(n), aoCaminhoDaqui(n), aoSelecionar(n), aoPassarMouse(n|null), aoFechar()
 */
export class CartaoDeDetalhes {
  constructor(pai, { cor, ...acoes }) {
    this.el = h("div", "c3d-card c3d-vidro c3d-hud", pai);
    this.cor = cor;
    this.acoes = acoes;
  }

  mostrar(n) {
    const c = this.el;
    c.innerHTML = "";
    c.style.setProperty("--cor", this.cor(n.lobo));
    c.classList.add("aberto");
    this.cabecalho(n);
    this.etiquetas(n);
    if (n.desc) h("div", "c3d-card-desc", c, n.desc.slice(0, 220));
    this.botoes(n);
    if (n.vizinhos.length) this.conexoes(n);
  }

  fechar() { this.el.classList.remove("aberto"); }

  cabecalho(n) {
    const topo = h("div", "c3d-card-topo", this.el);
    const titulo = h("div", "c3d-card-titulo", topo);
    h("div", "c3d-card-area", titulo, `${AREAS[n.lobo].nome} · ${AREAS[n.lobo].regiao}`);
    h("div", "c3d-card-nome", titulo, n.nome);
    const fechar = h("button", "c3d-icone-btn", topo);
    icone(fechar, "fechar", 15);
    fechar.onclick = () => this.acoes.aoFechar();
  }

  etiquetas(n) {
    const meta = h("div", "c3d-card-meta", this.el);
    if (n.status) h("span", "c3d-tag c3d-st-" + n.status, meta, STATUS[n.status]);
    if (n.memoria && n.tipoMem) h("span", "c3d-tag", meta, "memória · " + n.tipoMem);
    h("span", "c3d-tag", meta, `${n.grau} ligações`);
    h("span", "c3d-tag", meta, (n.memoria ? "modificada " : "desde ") + dataBR(n.data));
  }

  botoes(n) {
    const linha = h("div", "c3d-card-acoes", this.el);
    const abrir = h("button", "c3d-primario", linha);
    icone(h("span", null, abrir), "abrir", 14);
    h("span", null, abrir, n.memoria ? "Abrir memória" : "Abrir nota");
    abrir.onclick = () => this.acoes.aoAbrir(n);
    const quadrado = (nomeIcone, dica, acao) => {
      const b = h("button", "c3d-secundario c3d-quadrado", linha);
      icone(b, nomeIcone, 15);
      b.title = dica;
      b.onclick = acao;
    };
    quadrado("mira", "Focar a câmera", () => this.acoes.aoFocar(n));
    quadrado("caminho", "Traçar caminho a partir daqui", () => this.acoes.aoCaminhoDaqui(n));
  }

  conexoes(n) {
    h("div", "c3d-rotulo", this.el, `Conectada a ${n.vizinhos.length} ${n.vizinhos.length === 1 ? "nota" : "notas"}`);
    const porArea = {};
    for (const v of n.vizinhos) (porArea[v.lobo] ||= []).push(v);
    const lista = h("div", "c3d-vizinhos", this.el);
    for (const area of Object.keys(AREAS)) {
      const vizinhos = porArea[area];
      if (!vizinhos) continue;
      const grupo = h("div", "c3d-viz-grupo", lista);
      ponto(grupo, this.cor(area));
      h("span", null, grupo, AREAS[area].nome);
      h("span", "c3d-leg-num", grupo, String(vizinhos.length));
      for (const v of vizinhos.sort((a, b) => b.grau - a.grau).slice(0, 25)) {
        const item = h("button", "c3d-viz", lista);
        h("span", "c3d-viz-nome", item, v.rotulo);
        h("span", "c3d-viz-grau", item, String(v.grau));
        item.onclick = () => this.acoes.aoSelecionar(v);
        item.onmouseenter = () => this.acoes.aoPassarMouse(v);
        item.onmouseleave = () => this.acoes.aoPassarMouse(null);
      }
    }
  }
}
