import { NIVEL } from "../cena/Neuronio.js";
import { ESTADO_AXONIO } from "../cena/Axonios.js";

/**
 * O que está em destaque agora (passar o mouse, seleção, área, caminho, notas esquecidas, nota aberta)
 * e a regra que transforma isso em nível visual de cada neurônio e axônio.
 */
export class EstadoVisual {
  constructor() {
    this.aberta = null;
    this.limpar();
  }

  /** Limpa os modos; a nota aberta no editor continua lembrada. */
  limpar() {
    this.hover = null;
    this.selecionada = null;
    this.area = null;
    this.esquecidas = false;
    this.caminho = null;
  }

  get foco() { return this.hover || this.selecionada; }
  get modoAtivo() { return !!(this.caminho || this.foco || this.area || this.esquecidas); }

  nivelDe(n, limiteEsquecidas) {
    if (this.caminho) return this.caminho.nos.includes(n) ? NIVEL.FOCO : NIVEL.APAGADO;
    const foco = this.foco;
    if (foco) return n === foco ? NIVEL.FOCO : foco.vizinhos.includes(n) || n === this.selecionada ? NIVEL.DESTACADO : NIVEL.APAGADO;
    if (this.area) return n.lobo === this.area ? NIVEL.DESTACADO : NIVEL.APAGADO;
    if (this.esquecidas) return n.grau <= limiteEsquecidas ? NIVEL.FOCO : NIVEL.APAGADO;
    if (n === this.aberta) return NIVEL.FOCO;
    return n.status === "pausado" ? NIVEL.PAUSADO : NIVEL.NORMAL;
  }

  /** Ligações que acendem: as do caminho, as do foco ou as da nota aberta. */
  ligacoesAcesas() {
    if (this.caminho) return new Set(this.caminho.links);
    if (this.foco) return new Set(this.foco.links);
    if (this.aberta && !this.area && !this.esquecidas) return new Set(this.aberta.links);
    return new Set();
  }

  estadoDoAxonio(l, acesas, areasOcultas) {
    if (areasOcultas.has(l.source.lobo) || areasOcultas.has(l.target.lobo)) return ESTADO_AXONIO.OCULTO;
    if (acesas.has(l)) return ESTADO_AXONIO.ACESO;
    return this.modoAtivo ? ESTADO_AXONIO.APAGADO : ESTADO_AXONIO.NORMAL;
  }
}
