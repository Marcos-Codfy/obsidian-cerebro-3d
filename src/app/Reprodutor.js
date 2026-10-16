import { DIA } from "../dominio/Calendario.js";

const MES_MEDIO = 30.44 * DIA;
const VELOCIDADES = [0.5, 1, 2, 4];
const JANELA_DE_CRESCIMENTO = 9; // dias do calendário que um axônio leva para crescer

/**
 * Reprodução cinematográfica da linha do tempo: avança o tempo de forma contínua e,
 * a cada quadro, faz nascer os neurônios do período, cresce os axônios, move a câmera
 * e atualiza linha do tempo e letreiro.
 *
 * Colaboradores (injetados): cena (Cena3D), camera (CameraCinematografica), ondas (Ondas),
 * linhaDoTempo (LinhaDoTempoUI), letreiro (Letreiro) e um "contexto" com os dados atuais:
 *   contexto.grafo, contexto.calendario, contexto.axonios, contexto.cor(area), contexto.areaVisivel(area),
 *   contexto.definirLimite(instante), contexto.aoComecar(), contexto.aoPausar(), contexto.aoTerminar()
 */
export class Reprodutor {
  constructor({ cena, camera, ondas, linhaDoTempo, letreiro, contexto }) {
    Object.assign(this, { cena, camera, ondas, linhaDoTempo, letreiro, contexto });
    this.ativo = false;
    this.instante = null;
    this.velocidade = 1;
  }

  get segundosPorMes() { return 2.6 / this.velocidade; }

  alternarVelocidade() {
    this.velocidade = VELOCIDADES[(VELOCIDADES.indexOf(this.velocidade) + 1) % VELOCIDADES.length];
    return this.velocidade;
  }

  alternar() { this.ativo ? this.pausar() : this.tocar(); }

  tocar() {
    const { calendario, grafo, axonios } = this.contexto;
    if (!calendario.total) return;
    const fim = calendario.meses[calendario.ultimo].fim;
    if (this.instante == null || this.instante >= fim) {
      this.instante = calendario.meses[0].ini - DIA;
      for (const n of grafo.nodes) { n.nascido = false; if (n.__vis) n.__vis.grupo.visible = false; }
    }
    this.ativo = true;
    this.mesAtual = -1;
    axonios.mostrarAte(calendario.diasDesdeInicio(this.instante), JANELA_DE_CRESCIMENTO);
    this.camera.iniciar();
    this.contexto.aoComecar();
    this.linhaDoTempo.marcarTocando(true);
  }

  pausar() {
    this.ativo = false;
    this.linhaDoTempo.marcarTocando(false);
    this.contexto.aoPausar();
    this.cena.reavaliarVisibilidade();
    this.cena.giro.retomar(6000);
  }

  /** O usuário escolheu um mês na mão: abandona a reprodução. */
  interromper() {
    if (this.ativo) this.pausar();
    this.instante = null;
  }

  terminar() {
    this.ativo = false;
    this.instante = null;
    this.linhaDoTempo.marcarTocando(false);
    for (const n of this.contexto.grafo.nodes) n.nascido = true;
    this.contexto.aoTerminar();
  }

  /** Um quadro (dt em segundos reais, tempo = relógio da cena). */
  passo(dt, tempo) {
    this.ondas.animar(tempo);
    if (!this.ativo) return;
    const { calendario, grafo, axonios } = this.contexto;
    const fim = calendario.meses[calendario.ultimo].fim;
    this.instante += dt * (MES_MEDIO / this.segundosPorMes);
    if (this.instante >= fim) return this.terminar();

    this.contexto.definirLimite(this.instante);
    axonios.mostrarAte(calendario.diasDesdeInicio(this.instante), JANELA_DE_CRESCIMENTO);

    const { indice, posicao } = calendario.posicaoDe(this.instante, this.mesAtual);
    this.linhaDoTempo.mostrarPosicao(posicao, true);
    if (indice !== this.mesAtual) {
      this.mesAtual = indice;
      this.linhaDoTempo.mostrarMes(indice, false);
      this.letreiro.mostrarMes(calendario.meses[indice], calendario.contagem[indice]);
    }

    this.fazerNascer(grafo, tempo);
    const vivos = grafo.nodes.filter((n) => n.nascido).length;
    this.letreiro.contar(vivos);
    this.linhaDoTempo.mostrarQuantidade(vivos);
    this.camera.passo(dt, tempo);
  }

  fazerNascer(grafo, tempo) {
    for (const n of grafo.nodes) {
      const visual = n.__vis;
      if (!n.nascido && n.data <= this.instante) {
        n.nascido = true;
        if (this.contexto.areaVisivel(n.lobo)) {
          if (visual) visual.nascer(tempo);
          this.ondas.emitir(n, this.contexto.cor(n.lobo), n.raio, tempo);
          this.camera.observar(n, tempo);
          if (!n.memoria) this.letreiro.anunciar(n.rotulo, this.contexto.cor(n.lobo));
        }
      }
      if (visual) visual.grupo.visible = !!n.nascido && this.contexto.areaVisivel(n.lobo);
    }
  }
}
