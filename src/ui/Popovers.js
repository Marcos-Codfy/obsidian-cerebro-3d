import { h, ponto } from "./dom.js";
import { Autocompletar } from "./Autocompletar.js";

/** Painel flutuante ao lado da barra de ferramentas. */
export class Popover {
  constructor(pai, titulo, classeExtra = "") {
    this.el = h("div", `c3d-popover c3d-vidro ${classeExtra}`.trim(), pai);
    h("div", "c3d-pop-titulo", this.el, titulo);
  }
  get aberto() { return this.el.classList.contains("aberto"); }
  abrir() { this.el.classList.add("aberto"); }
  fechar() { this.el.classList.remove("aberto"); }
}

/** Garante um popover aberto por vez e avisa quem precisa saber (ex.: botões da barra). */
export class GerenciadorDePopovers {
  constructor(aoMudar) {
    this.popovers = {};
    this.aoMudar = aoMudar;
  }
  registrar(chave, popover) { this.popovers[chave] = popover; return popover; }
  alternar(chave) {
    const alvo = this.popovers[chave];
    const abrir = !alvo.aberto;
    this.fecharTodos(false);
    if (abrir) alvo.abrir();
    this.aoMudar();
  }
  abrir(chave) { if (!this.popovers[chave].aberto) this.alternar(chave); }
  fecharTodos(avisar = true) {
    for (const p of Object.values(this.popovers)) p.fechar();
    if (avisar) this.aoMudar();
  }
  estaAberto(chave) { return this.popovers[chave].aberto; }
}

/** Caminho entre duas notas: dois campos com sugestões + resultado clicável. */
export class PainelCaminho extends Popover {
  constructor(pai, { buscar, cor, aoTracar, aoFocar, aviso }) {
    super(pai, "Caminho entre duas notas");
    this.escolha = { de: null, ate: null };
    this.cor = cor;
    this.aoFocar = aoFocar;
    this.campoDe = this.campo("De", "de", buscar);
    this.campoAte = this.campo("Até", "ate", buscar);
    const botao = h("button", "c3d-primario", this.el, "Traçar caminho");
    botao.onclick = () => (this.escolha.de && this.escolha.ate ? aoTracar(this.escolha.de, this.escolha.ate) : aviso("Escolha as duas notas na lista"));
    this.resultado = h("div", "c3d-resultado", this.el);
  }

  campo(rotulo, chave, buscar) {
    const w = h("div", "c3d-campo", this.el);
    h("span", "c3d-campo-rotulo", w, rotulo);
    const input = h("input", "c3d-input", w);
    input.placeholder = "Digite o nome…";
    new Autocompletar(input, w, { buscar, cor: this.cor, aoEscolher: (n) => { this.escolha[chave] = n; input.value = n.nome; } });
    return input;
  }

  /** Preenche a origem e deixa o cursor no destino ("caminho a partir daqui"). */
  comecarDe(no) {
    this.escolha = { de: no, ate: null };
    this.campoDe.value = no.nome;
    this.campoAte.value = "";
    setTimeout(() => this.campoAte.focus(), 50);
  }

  mostrarResultado(caminho) {
    this.resultado.innerHTML = "";
    if (!caminho) { h("div", "c3d-vazio", this.resultado, "Essas notas não estão conectadas."); return; }
    h("div", "c3d-rotulo", this.resultado, `${caminho.nos.length - 1} salto(s)`);
    const trilha = h("div", "c3d-trilha", this.resultado);
    caminho.nos.forEach((n, i) => {
      const chip = h("button", "c3d-chip", trilha);
      ponto(chip, this.cor(n.lobo));
      h("span", null, chip, n.rotulo);
      chip.onclick = () => this.aoFocar(n);
      if (i < caminho.nos.length - 1) h("span", "c3d-seta", trilha, "→");
    });
  }

  limparResultado() { this.resultado.innerHTML = ""; }
}

/**
 * Ajustes ao vivo (sem remontar a cena). Cada ajuste: { rotulo, chave, min, max, passo, aplicar(v), formato(v) }.
 */
export class PainelAjustes extends Popover {
  constructor(pai, { config, ajustes, aoSalvar, aoAbrirConfiguracoes }) {
    super(pai, "Ajustes rápidos", "c3d-pop-ajustes");
    for (const a of ajustes) this.linha(config, a, aoSalvar);
    const todas = h("button", "c3d-secundario c3d-largo", this.el, "Todas as configurações");
    todas.onclick = aoAbrirConfiguracoes;
  }

  linha(config, { rotulo, chave, min, max, passo, aplicar, formato = (v) => v }, aoSalvar) {
    const linha = h("div", "c3d-ajuste", this.el);
    const topo = h("div", "c3d-ajuste-topo", linha);
    h("span", null, topo, rotulo);
    const valor = h("span", "c3d-ajuste-valor", topo, formato(config[chave]));
    const r = h("input", "c3d-range", linha);
    Object.assign(r, { type: "range", min, max, step: passo, value: config[chave] });
    const pintar = () => r.style.setProperty("--p", ((r.value - min) / (max - min)) * 100 + "%");
    pintar();
    r.addEventListener("input", () => {
      config[chave] = +r.value;
      valor.textContent = formato(config[chave]);
      pintar();
      aplicar(config[chave]);
    });
    r.addEventListener("change", aoSalvar);
  }
}

const ATALHOS = [
  ["Clique", "seleciona e mostra detalhes"], ["Duplo clique", "abre a nota"], ["Botão direito", "aproxima a câmera"],
  ["Arrastar / roda", "girar / zoom"], ["/", "buscar"], ["Espaço", "tocar a linha do tempo"], ["R", "centralizar"],
  ["H", "modo foco"], ["Esc", "limpar destaques"],
];

export class PainelAtalhos extends Popover {
  constructor(pai) {
    super(pai, "Atalhos", "c3d-pop-ajuda");
    for (const [tecla, acao] of ATALHOS) {
      const l = h("div", "c3d-atalho", this.el);
      h("kbd", "c3d-kbd", l, tecla);
      h("span", null, l, acao);
    }
  }
}
