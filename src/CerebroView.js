const { ItemView, debounce, Notice } = require("obsidian");
import * as THREE from "three";
import { AREAS, STATUS } from "./configuracoes/padrao.js";
import { Grafo } from "./dominio/Grafo.js";
import { Calendario } from "./dominio/Calendario.js";
import { Anatomia } from "./cena/Anatomia.js";
import { Cena3D } from "./cena/Cena3D.js";
import { NuvemCerebral } from "./cena/NuvemCerebral.js";
import { VisualDoNeuronio } from "./cena/Neuronio.js";
import { Axonios } from "./cena/Axonios.js";
import { Ondas } from "./cena/Ondas.js";
import { CameraCinematografica } from "./cena/CameraCinematografica.js";
import { EstadoVisual } from "./app/EstadoVisual.js";
import { Reprodutor } from "./app/Reprodutor.js";
import { h } from "./ui/dom.js";
import { Aviso, TelaDeCarregamento } from "./ui/Avisos.js";
import { BarraSuperior } from "./ui/BarraSuperior.js";
import { BarraDeFerramentas } from "./ui/BarraDeFerramentas.js";
import { GerenciadorDePopovers, PainelCaminho, PainelAjustes, PainelAtalhos } from "./ui/Popovers.js";
import { Legenda } from "./ui/Legenda.js";
import { CartaoDeDetalhes } from "./ui/CartaoDeDetalhes.js";
import { LinhaDoTempoUI } from "./ui/LinhaDoTempoUI.js";
import { Letreiro } from "./ui/Letreiro.js";
import { abrirMemoria } from "./ui/ModalDeMemoria.js";

export const VIEW_TYPE = "cerebro-3d-view";
const BRANCO = new THREE.Color("#ffffff");
const AMARELO = new THREE.Color("#ffe3a3");

/**
 * View do Obsidian: monta as peças (cena, HUD, reprodução) e faz a mediação entre elas.
 * As regras ficam nas peças; aqui só se decide "quem chama quem".
 */
export class CerebroView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.estado = new EstadoVisual();
    this.areasOcultas = new Set();
    this.soPastaFoco = false;
    this.limite = Infinity;
  }

  get cfg() { return this.plugin.settings; }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Cérebro 3D"; }
  getIcon() { return "brain"; }
  async onOpen() { this.montar(); }
  async onClose() { this.desmontar(); }
  reconstruir() { this.desmontar(); this.montar(); }

  cor = (area) => this.cfg.cores[area] || "#8a94a6";
  areaVisivel = (area) => !this.areasOcultas.has(area);
  visivel = (n) => n.data <= this.limite && this.areaVisivel(n.lobo);

  // ================= montagem =================
  montar() {
    const raiz = this.contentEl;
    raiz.innerHTML = "";
    raiz.classList.add("c3d-root");
    raiz.tabIndex = 0;
    this.raiz = raiz;
    const palco = h("div", "c3d-palco", raiz);
    this.montarHud(raiz);

    this.cena = new Cena3D(palco, {
      objetoDoNo: (n) => this.criarNeuronio(n),
      visivel: this.visivel,
      dicaDoNo: (n) => this.dicaDoNo(n),
      aoPassarMouse: (n) => { this.estado.hover = n; this.atualizarVisual(); },
      aoClicar: (n) => this.cliqueNo(n),
      aoClicarDireito: (n) => this.cena.focar(n),
      aoClicarFundo: () => this.limparDestaques(),
      aoQuadro: (dt, t) => this.quadro(dt, t),
      aoInteragir: (fase) => this.aoInteragirComCamera(fase),
    }, { brilho: this.cfg.brilho, girar: this.cfg.girarAutomatico !== false, velocidadeGiro: this.cfg.velocidadeGiro });
    this.cena.aoRedimensionar = () => this.linhaDoTempo.desenhar();

    this.anatomia = Anatomia.instancia();
    this.nuvem = new NuvemCerebral(this.anatomia, {
      densidade: this.cfg.densidade, opacidade: this.cfg.opacidadeCerebro, cor: this.cfg.corCerebro,
      cores: this.cfg.cores, tingir: this.cfg.tingirRegioes,
    });
    this.cena.adicionar(this.nuvem.objeto);
    this.ondas = new Ondas();
    this.cena.adicionar(this.ondas.objeto);

    const vista = this; // os getters abaixo leem sempre os dados atuais (o grafo muda a cada recarga)
    this.reprodutor = new Reprodutor({
      cena: this.cena, camera: new CameraCinematografica(this.cena), ondas: this.ondas,
      linhaDoTempo: this.linhaDoTempo, letreiro: this.letreiro,
      contexto: {
        get grafo() { return vista.grafo; }, get calendario() { return vista.calendario; }, get axonios() { return vista.axonios; },
        cor: this.cor, areaVisivel: this.areaVisivel,
        definirLimite: (instante) => { this.limite = instante; },
        aoComecar: () => { this.limparDestaques(false); this.popovers.fecharTodos(); this.cena.giro.pausar(); this.raiz.classList.add("c3d-tocando"); this.atualizarVisual(); },
        aoPausar: () => this.raiz.classList.remove("c3d-tocando"),
        aoTerminar: () => this.aoTerminarReproducao(),
      },
    });

    this.carregar();
    this.ouvirObsidian();
    raiz.addEventListener("keydown", (e) => this.teclado(e));
  }

  montarHud(raiz) {
    this.carregamento = new TelaDeCarregamento(raiz);
    const buscar = (q) => (this.grafo ? this.grafo.buscar(q) : []);
    this.barraSuperior = new BarraSuperior(raiz, {
      buscar, cor: this.cor,
      aoEscolher: (n) => this.selecionar(n, true),
      aoVista: (pos) => { this.cena.giro.pausar(); this.cena.giro.retomar(6000); this.cena.voar(pos, undefined, 1100); },
    });
    this.aviso = new Aviso(raiz);

    this.popovers = new GerenciadorDePopovers(() => this.sincronizarBotoes());
    const pasta = this.cfg.pastaFoco;
    this.barra = new BarraDeFerramentas(raiz, [
      { chave: "centro", icone: "centro", dica: "Centralizar (R)", acao: () => this.centralizar() },
      { chave: "giro", icone: "girar", dica: "Girar automaticamente", acao: () => this.alternarGiro() },
      { chave: "caminho", icone: "caminho", dica: "Caminho entre duas notas", acao: () => this.popovers.alternar("caminho") },
      { chave: "esquecidas", icone: "esquecidas", dica: "Áreas esquecidas", acao: () => this.alternarEsquecidas() },
      { chave: "foco", icone: "camadas", dica: `Vault todo / só "${pasta}"`, acao: () => this.alternarPastaFoco(), oculto: !pasta },
      { chave: "ajustes", icone: "ajustes", dica: "Ajustes rápidos", acao: () => this.popovers.alternar("ajustes"), separadorAntes: true },
      { chave: "hud", icone: "foco", dica: "Modo foco — esconder painéis (H)", acao: () => this.alternarHud() },
      { chave: "ajuda", icone: "ajuda", dica: "Atalhos", acao: () => this.popovers.alternar("ajuda") },
    ]);

    this.painelCaminho = this.popovers.registrar("caminho", new PainelCaminho(raiz, {
      buscar, cor: this.cor, aoTracar: (a, b) => this.tracarCaminho(a, b), aoFocar: (n) => this.cena.focar(n), aviso: (t) => this.aviso.mostrar(t),
    }));
    this.popovers.registrar("ajustes", new PainelAjustes(raiz, {
      config: this.cfg,
      aoSalvar: () => this.plugin.salvarSemRecarregar(),
      aoAbrirConfiguracoes: () => this.abrirConfiguracoes(),
      ajustes: this.ajustesRapidos(),
    }));
    this.popovers.registrar("ajuda", new PainelAtalhos(raiz));

    const coluna = h("div", "c3d-coluna", raiz);
    this.legenda = new Legenda(coluna, {
      cor: this.cor, aoFocarArea: (a) => this.focarArea(a), aoAlternarArea: (a) => this.alternarArea(a),
    });
    this.cartao = new CartaoDeDetalhes(coluna, {
      cor: this.cor,
      aoAbrir: (n) => this.abrir(n),
      aoFocar: (n) => this.cena.focar(n),
      aoCaminhoDaqui: (n) => { this.painelCaminho.comecarDe(n); this.popovers.abrir("caminho"); },
      aoSelecionar: (n) => this.selecionar(n, true),
      aoPassarMouse: (n) => { this.estado.hover = n; this.atualizarVisual(); },
      aoFechar: () => this.limparDestaques(),
    });

    this.linhaDoTempo = new LinhaDoTempoUI(raiz, {
      aoTocar: () => this.reprodutor.alternar(),
      aoVelocidade: () => this.reprodutor.alternarVelocidade(),
      aoEscolherMes: (i) => { this.reprodutor.interromper(); this.irParaMes(i, false); },
      aoMostrarTudo: () => { this.reprodutor.interromper(); this.irParaMes(this.calendario.ultimo, true); },
    });
    this.letreiro = new Letreiro(raiz);

    raiz.addEventListener("pointerdown", (e) => {
      if (!e.target.closest(".c3d-popover, .c3d-barra, .c3d-sugestoes, .c3d-card")) this.popovers.fecharTodos();
    });
  }

  ajustesRapidos() {
    const pct = (v) => Math.round(v * 100) + "%";
    return [
      { rotulo: "Brilho neon", chave: "brilho", min: 0, max: 1.5, passo: 0.05, aplicar: (v) => { this.cena.brilho = v; }, formato: pct },
      { rotulo: "Sinais nos axônios", chave: "sinapses", min: 0, max: 12, passo: 1, aplicar: (v) => { this.axonios.densidadeDeSinais = v / 12; }, formato: (v) => v || "nenhum" },
      { rotulo: "Intensidade dos axônios", chave: "intensidadeAxonios", min: 0, max: 2, passo: 0.05, aplicar: (v) => { this.axonios.intensidade = v; }, formato: pct },
      { rotulo: "Partículas do cérebro", chave: "opacidadeCerebro", min: 0.05, max: 1, passo: 0.01, aplicar: (v) => { this.nuvem.opacidade = v; }, formato: pct },
      { rotulo: "Velocidade do giro", chave: "velocidadeGiro", min: 0, max: 2, passo: 0.05, aplicar: (v) => { this.cena.giro.velocidade = v; }, formato: (v) => v.toFixed(2) + "×" },
    ];
  }

  ouvirObsidian() {
    const recarregar = debounce(() => this.carregar(), 2500, true);
    this.registerEvent(this.app.metadataCache.on("resolved", recarregar));
    this.registerEvent(this.app.vault.on("delete", recarregar));
    this.registerEvent(this.app.vault.on("rename", recarregar));
    this.registerEvent(this.app.workspace.on("file-open", (f) => {
      if (!f || !this.grafo) return;
      const n = this.grafo.porId.get(f.path) || null;
      this.estado.aberta = n;
      this.atualizarVisual();
      if (n && this.cfg.seguirNotaAberta && this.app.workspace.getActiveViewOfType(CerebroView) !== this) this.cena.focar(n, 140);
    }));
  }

  desmontar() {
    if (this.axonios) this.axonios.descartar();
    if (this.nuvem) this.nuvem.descartar();
    if (this.ondas) this.ondas.descartar();
    if (this.cena) this.cena.descartar();
    this.axonios = this.nuvem = this.ondas = this.cena = null;
    this.contentEl.innerHTML = "";
  }

  // ================= dados =================
  carregar() {
    if (!this.cena) return;
    this.grafo = Grafo.doVault(this.app, this.cfg, { pastaFoco: this.soPastaFoco ? this.cfg.pastaFoco : "" });
    this.anatomia.posicionar(this.grafo.nodes);
    this.calendario = new Calendario(this.grafo.nodes);
    this.reprodutor.interromper();
    this.limite = Infinity;
    for (const n of this.grafo.nodes) n.nascido = true;
    this.estado.limpar();
    this.cena.definirNos(this.grafo.nodes);

    if (this.axonios) { this.cena.remover(this.axonios.objeto); this.axonios.descartar(); }
    this.axonios = new Axonios(this.grafo.links, this.cor, this.calendario.inicio);
    this.axonios.densidadeDeSinais = this.cfg.sinapses / 12;
    this.axonios.intensidade = this.cfg.intensidadeAxonios ?? 1;
    this.cena.adicionar(this.axonios.objeto);

    this.linhaDoTempo.configurar(this.calendario);
    this.irParaMes(this.calendario.ultimo, true);
    this.cartao.fechar();
    const memorias = this.grafo.quantidadeDeMemorias;
    this.barraSuperior.mostrarNumeros(this.grafo.nodes.length - memorias, memorias, this.grafo.links.length);
    this.renderLegenda();
  }

  criarNeuronio(n) {
    const visual = new VisualDoNeuronio(n, this.cor(n.lobo), { rotuloSempreVisivel: this.cfg.mostrarRotulos && n.lobo === "hub" });
    visual.definirNivel(this.estado.nivelDe(n, this.cfg.limiteEsquecidas), BRANCO);
    return visual.grupo;
  }

  dicaDoNo(n) {
    const extra = n.status ? " · " + STATUS[n.status] : "";
    return `<div class="c3d-tip"><div class="c3d-tip-nome"><span style="color:${this.cor(n.lobo)}">●</span> ${n.nome}</div>` +
      `<div class="c3d-tip-sub">${AREAS[n.lobo].nome} · ${n.grau} ligações${extra}</div></div>`;
  }

  // ================= visual =================
  atualizarVisual() {
    if (!this.grafo) return;
    const e = this.estado;
    const destaque = e.esquecidas ? AMARELO : BRANCO;
    for (const n of this.grafo.nodes) if (n.__vis) n.__vis.definirNivel(e.nivelDe(n, this.cfg.limiteEsquecidas), destaque);
    // no foco, só os 12 vizinhos mais conectados ganham nome (evita parede de texto)
    if (e.foco && !e.caminho) {
      const principais = new Set([...e.foco.vizinhos].sort((a, b) => b.grau - a.grau).slice(0, 12));
      for (const v of e.foco.vizinhos) if (v.__vis && !principais.has(v)) v.__vis.esconderRotulo();
    }
    const acesas = e.ligacoesAcesas();
    if (this.axonios) this.axonios.definirEstados((l) => e.estadoDoAxonio(l, acesas, this.areasOcultas));
  }

  quadro(dt, t) {
    if (!this.grafo) return;
    this.reprodutor.passo(dt, t);
    const distancia = this.cena.distanciaCamera;
    this.nuvem.animar(t, distancia);
    if (this.axonios) this.axonios.animar(t, distancia);
    const e = this.estado;
    for (const n of this.grafo.nodes) {
      const v = n.__vis;
      if (!v) continue;
      const pulsar = (n.status === "ativo" && v.nivel >= 1 && v.nivel <= 3) || n === e.aberta || n === e.selecionada;
      v.animar(t, pulsar);
    }
    if (!this.carregado) { this.carregado = true; this.carregamento.concluir(); }
  }

  sincronizarBotoes() {
    const b = this.barra;
    b.marcar("giro", this.cena && this.cena.giro.ligado);
    b.marcar("esquecidas", this.estado.esquecidas);
    b.marcar("foco", this.soPastaFoco);
    b.marcar("caminho", this.popovers.estaAberto("caminho"));
    b.marcar("ajustes", this.popovers.estaAberto("ajustes"));
    b.marcar("ajuda", this.popovers.estaAberto("ajuda"));
  }

  renderLegenda() { this.legenda.render(this.grafo.contagemPorArea(), this.estado.area, this.areasOcultas); }

  // ================= ações =================
  cliqueNo(n) {
    const agora = performance.now();
    if (this.ultimoClique && this.ultimoClique.n === n && agora - this.ultimoClique.t < 420) return this.abrir(n);
    this.ultimoClique = { n, t: agora };
    this.selecionar(n);
  }

  selecionar(n, focar = false) {
    this.estado.limpar();
    this.estado.selecionada = n;
    this.cartao.mostrar(n);
    this.renderLegenda();
    this.sincronizarBotoes();
    this.atualizarVisual();
    if (focar) this.cena.focar(n);
  }

  abrir(n) {
    if (n.memoria) abrirMemoria(this.app, n, this.cor(n.lobo));
    else this.app.workspace.openLinkText(n.path, "", true);
  }

  limparDestaques(redesenhar = true) {
    this.estado.limpar();
    this.cartao.fechar();
    this.painelCaminho.limparResultado();
    this.renderLegenda();
    this.sincronizarBotoes();
    if (redesenhar) this.atualizarVisual();
  }

  centralizar() {
    this.limparDestaques();
    this.cena.centralizar();
  }

  focarArea(area) {
    const jaAtiva = this.estado.area === area;
    this.limparDestaques(false);
    if (!jaAtiva) {
      this.estado.area = area;
      const nos = this.grafo.nodes.filter((n) => n.lobo === area);
      if (nos.length) {
        const c = nos.reduce((a, n) => ({ x: a.x + n.x / nos.length, y: a.y + n.y / nos.length, z: a.z + n.z / nos.length }), { x: 0, y: 0, z: 0 });
        this.cena.focar(c, 260);
      }
    }
    this.renderLegenda();
    this.atualizarVisual();
  }

  alternarArea(area) {
    if (this.areasOcultas.has(area)) this.areasOcultas.delete(area); else this.areasOcultas.add(area);
    this.cena.reavaliarVisibilidade();
    this.atualizarVisual();
    this.renderLegenda();
  }

  alternarEsquecidas() {
    const ligar = !this.estado.esquecidas;
    this.limparDestaques(false);
    this.estado.esquecidas = ligar;
    if (ligar) {
      const qtd = this.grafo.nodes.filter((n) => n.grau <= this.cfg.limiteEsquecidas).length;
      this.aviso.mostrar(`${qtd} neurônios com até ${this.cfg.limiteEsquecidas} ligações — bons candidatos para conectar`);
    }
    this.sincronizarBotoes();
    this.atualizarVisual();
  }

  tracarCaminho(a, b) {
    this.limparDestaques(false);
    const caminho = this.grafo.caminhoEntre(a, b);
    this.painelCaminho.mostrarResultado(caminho);
    if (caminho) {
      this.estado.caminho = caminho;
      this.cena.focar(caminho.nos[Math.floor(caminho.nos.length / 2)], 300);
    }
    this.atualizarVisual();
  }

  alternarGiro() {
    const ligado = this.cena.giro.alternar();
    this.cfg.girarAutomatico = ligado;
    this.plugin.salvarSemRecarregar();
    this.aviso.mostrar(ligado ? "Giro automático ligado" : "Giro automático desligado", 1800);
    this.sincronizarBotoes();
  }

  alternarPastaFoco() {
    this.soPastaFoco = !this.soPastaFoco;
    this.aviso.mostrar(this.soPastaFoco ? `Mostrando só "${this.cfg.pastaFoco}"` : "Mostrando o vault todo");
    this.carregar();
    this.sincronizarBotoes();
  }

  alternarHud() {
    const escondido = this.raiz.classList.toggle("c3d-sem-hud");
    this.barra.marcar("hud", escondido);
    this.aviso.mostrar(escondido ? "Modo foco — aperte H para mostrar os painéis" : "Painéis visíveis", 2200);
  }

  abrirConfiguracoes() {
    try { this.app.setting.open(); this.app.setting.openTabById("cerebro-3d"); } catch (e) { new Notice("Abra Configurações → Cérebro 3D"); }
  }

  aoInteragirComCamera(fase) {
    if (fase === "inicio") {
      if (this.reprodutor.ativo) this.reprodutor.camera.liberar();
      this.cena.giro.pausar();
    } else if (!this.reprodutor.ativo) this.cena.giro.retomar(4000);
  }

  // ================= linha do tempo =================
  irParaMes(i, tudo) {
    if (!this.calendario.total) return;
    this.limite = tudo ? Infinity : this.calendario.meses[i].fim;
    for (const n of this.grafo.nodes) n.nascido = n.data <= this.limite;
    if (tudo) this.axonios.mostrarTodos();
    else this.axonios.mostrarAte(this.calendario.diasDesdeInicio(this.limite));
    const visiveis = this.grafo.nodes.filter((n) => n.data <= this.limite).length;
    this.linhaDoTempo.mostrarMes(i, tudo, visiveis);
    this.linhaDoTempo.mostrarEscolha(i, tudo);
    this.cena.reavaliarVisibilidade();
    this.atualizarVisual();
  }

  aoTerminarReproducao() {
    this.raiz.classList.remove("c3d-tocando");
    this.irParaMes(this.calendario.ultimo, true);
    this.aviso.mostrar(`Hoje · ${this.grafo.nodes.length} neurônios e ${this.grafo.links.length} conexões`, 3500);
    this.cena.centralizar(2600);
    this.cena.giro.retomar(3000);
  }

  teclado(e) {
    const digitando = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
    if (e.key === "Escape") { this.popovers.fecharTodos(); this.limparDestaques(); if (digitando) e.target.blur(); return; }
    if (digitando) return;
    if (e.key === "/") { e.preventDefault(); this.barraSuperior.focarBusca(); }
    else if (e.key === " ") { e.preventDefault(); this.reprodutor.alternar(); }
    else if (e.key === "r" || e.key === "R") this.centralizar();
    else if (e.key === "h" || e.key === "H") this.alternarHud();
  }
}
