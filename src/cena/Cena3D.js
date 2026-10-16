import ForceGraph3D from "3d-force-graph";
import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export const CAMERA_INICIAL = { x: 430, y: 130, z: 250 };
const ORIGEM = { x: 0, y: 0, z: 0 };

/** Giro automático: pausa quando o usuário mexe e volta sozinho depois de um tempo parado. */
class ControleDeGiro {
  constructor(controles, { ligado, velocidade }) {
    this.controles = controles;
    this.ligado = ligado;
    controles.autoRotate = ligado;
    controles.autoRotateSpeed = velocidade;
  }
  set velocidade(v) { this.controles.autoRotateSpeed = v; }
  alternar() { this.ligado = !this.ligado; this.controles.autoRotate = this.ligado; return this.ligado; }
  pausar() { clearTimeout(this.timer); this.controles.autoRotate = false; }
  retomar(ms = 4000) {
    clearTimeout(this.timer);
    if (this.ligado) this.timer = setTimeout(() => { if (this.ligado) this.controles.autoRotate = true; }, ms);
  }
  descartar() { clearTimeout(this.timer); }
}

/**
 * Tudo que é "motor 3D": grafo (3d-force-graph), brilho (bloom), controles de câmera,
 * redimensionamento sem loop e o laço de animação. Não conhece notas nem HUD — só recebe callbacks.
 */
export class Cena3D {
  /**
   * @param {HTMLElement} palco
   * @param {object} o  callbacks: objetoDoNo(n), visivel(n), dicaDoNo(n), aoPassarMouse(n), aoClicar(n),
   *                    aoClicarDireito(n), aoClicarFundo(), aoQuadro(dt, t), aoInteragir(inicio|fim)
   */
  constructor(palco, o, { brilho, girar, velocidadeGiro }) {
    this.palco = palco;
    this.g = ForceGraph3D({ controlType: "orbit" })(palco)
      .backgroundColor("#000000")
      .showNavInfo(false)
      .enableNodeDrag(false)
      .nodeId("id")
      .nodeLabel(o.dicaDoNo)
      .nodeThreeObject(o.objetoDoNo)
      .nodeVisibility(o.visivel)
      .onNodeHover((n) => { palco.style.cursor = n ? "pointer" : ""; o.aoPassarMouse(n || null); })
      .onNodeClick(o.aoClicar)
      .onNodeRightClick(o.aoClicarDireito)
      .onBackgroundClick(o.aoClicarFundo)
      .cooldownTicks(1);
    // posições são fixas (anatomia): sem simulação de forças
    for (const f of ["charge", "center", "link"]) this.g.d3Force(f, null);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(palco.clientWidth || 800, palco.clientHeight || 600), brilho, 0.35, 0.55);
    this.g.postProcessingComposer().addPass(this.bloom);
    this.g.postProcessingComposer().addPass(new OutputPass());

    const c = this.g.controls();
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 60;
    c.maxDistance = 1300;
    this.giro = new ControleDeGiro(c, { ligado: girar, velocidade: velocidadeGiro });
    c.addEventListener("start", () => o.aoInteragir("inicio"));
    c.addEventListener("end", () => o.aoInteragir("fim"));

    this.observarTamanho();
    this.iniciarLaco(o.aoQuadro);
    this.g.cameraPosition(CAMERA_INICIAL, ORIGEM, 0);
  }

  get camera() { return this.g.camera(); }
  get controles() { return this.g.controls(); }
  get cena() { return this.g.scene(); }
  /** Distância usada pela névoa de profundidade dos shaders. */
  get distanciaCamera() { return this.camera.position.distanceTo(this.controles.target) + this.controles.target.length(); }
  set brilho(v) { this.bloom.strength = v; }

  adicionar(objeto) { this.cena.add(objeto); }
  remover(objeto) { this.cena.remove(objeto); }
  definirNos(nodes) { this.g.graphData({ nodes, links: [] }); } // ligações são desenhadas pelos Axonios
  reavaliarVisibilidade() { this.g.nodeVisibility(this.g.nodeVisibility()); }

  voar(posicao, alvo = ORIGEM, ms = 1300) { this.g.cameraPosition(posicao, alvo, ms); }
  centralizar(ms = 1300) { this.voar(CAMERA_INICIAL, ORIGEM, ms); }
  /** Aproxima a câmera de um ponto, mantendo a direção a partir do centro do cérebro. */
  focar(p, distancia = 120) {
    const r = 1 + distancia / Math.max(1, Math.hypot(p.x, p.y, p.z));
    this.giro.pausar();
    this.giro.retomar(7000);
    this.voar({ x: p.x * r, y: p.y * r + 25, z: p.z * r }, { x: p.x, y: p.y, z: p.z });
  }

  /** Redimensiona só quando o tamanho realmente muda (evita o loop que fazia a tela tremer). */
  observarTamanho() {
    let atual = { w: 0, h: 0 }, quadro = 0;
    this.aoRedimensionar = () => {};
    this.observador = new ResizeObserver(() => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const w = Math.floor(this.palco.clientWidth), h = Math.floor(this.palco.clientHeight);
        if (!w || !h || (w === atual.w && h === atual.h)) return;
        atual = { w, h };
        this.g.width(w);
        this.g.height(h);
        this.bloom.setSize(w, h);
        this.aoRedimensionar();
      });
    });
    this.observador.observe(this.palco);
  }

  iniciarLaco(aoQuadro) {
    const relogio = new THREE.Clock();
    let anterior = 0;
    const quadro = () => {
      const t = relogio.getElapsedTime();
      const dt = Math.min(0.1, t - anterior);
      anterior = t;
      aoQuadro(dt, t);
      this.idQuadro = requestAnimationFrame(quadro);
    };
    this.idQuadro = requestAnimationFrame(quadro);
  }

  descartar() {
    cancelAnimationFrame(this.idQuadro);
    this.giro.descartar();
    this.observador.disconnect();
    this.g.pauseAnimation();
    this.g._destructor();
  }
}
