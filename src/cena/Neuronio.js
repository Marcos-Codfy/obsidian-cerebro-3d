import * as THREE from "three";
import SpriteText from "three-spritetext";
import { rng, TEXTURA_BRILHO } from "./util.js";

const GEO_SOMA = new THREE.IcosahedronGeometry(1, 3);
const GEO_NUCLEO = new THREE.IcosahedronGeometry(0.45, 2);

/** Nível visual: 0 apagado · 1 normal · 2 vizinho/destacado · 3 foco · 4 pausado */
export const NIVEL = { APAGADO: 0, NORMAL: 1, DESTACADO: 2, FOCO: 3, PAUSADO: 4 };

const OPACIDADES = {
  soma: [0.06, 0.55, 0.7, 0.85, 0.25],
  nucleo: [0.08, 0.95, 1, 1, 0.35],
  halo: [0.0, 0.12, 0.28, 0.42, 0.04],
  dend: [0.02, 0.3, 0.5, 0.65, 0.1],
  escalaHalo: [2.5, 3.2, 3.8, 4.6, 2.8],
};

const aproximar = (atual, alvo) => (Math.abs(alvo - atual) < 0.002 ? alvo : atual + (alvo - atual) * 0.18);

/** Dendritos curtos e ramificados (ficam perto do corpo, nunca saem do cérebro). */
function criarDendritos(raio, semente, cor) {
  const r = rng(semente);
  const pts = [];
  const limite = Math.min(raio * 2.4, 11);
  const galho = (origem, direcao, comprimento, nivel) => {
    let p = origem.clone();
    for (let i = 0; i < 3; i++) {
      const d = direcao.clone().add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.6)).normalize();
      const q = p.clone().addScaledVector(d, comprimento / 3);
      pts.push(p.x, p.y, p.z, q.x, q.y, q.z);
      p = q;
      direcao = d;
    }
    if (nivel < 1) {
      for (let k = 0; k < 2; k++) {
        const nd = direcao.clone().add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(1.2)).normalize();
        galho(p, nd, comprimento * 0.5, nivel + 1);
      }
    }
  };
  for (let i = 0, n = 4 + Math.floor(r() * 3); i < n; i++) {
    const u = r() * 2 - 1, t = r() * 6.283, s = Math.sqrt(1 - u * u);
    const d = new THREE.Vector3(s * Math.cos(t), u, s * Math.sin(t));
    galho(d.clone().multiplyScalar(raio * 0.85), d, limite * (0.55 + 0.45 * r()), 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: cor, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
}

/**
 * Representação 3D de uma nota: membrana translúcida, núcleo, halo, dendritos e rótulo.
 * Sabe mudar de nível com transição suave, pulsar (projeto ativo) e "nascer" (linha do tempo).
 */
export class VisualDoNeuronio {
  constructor(no, cor, { rotuloSempreVisivel = false } = {}) {
    this.no = no;
    this.cor = new THREE.Color(cor);
    this.rotuloSempreVisivel = rotuloSempreVisivel;
    this.grupo = new THREE.Group();

    this.soma = new THREE.Mesh(GEO_SOMA, new THREE.MeshBasicMaterial({ color: this.cor.clone().multiplyScalar(0.55), transparent: true, opacity: 0.55, depthWrite: false }));
    this.soma.add(new THREE.Mesh(GEO_NUCLEO, new THREE.MeshBasicMaterial({ color: this.cor.clone().lerp(new THREE.Color("#ffffff"), 0.35), transparent: true, opacity: 0.95 })));
    this.nucleo = this.soma.children[0];
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEXTURA_BRILHO, color: this.cor, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
    // memórias são neurônios menores e mais simples, para o hipocampo não virar um borrão
    this.dendritos = criarDendritos(no.memoria ? no.raio * 0.55 : no.raio, no.seed, this.cor);
    this.rotulo = this.criarRotulo(no);
    this.grupo.add(this.soma, this.halo, this.dendritos, this.rotulo);

    this.nivel = NIVEL.NORMAL;
    this.alvo = null;
    this.escalaHalo = null;
    this.nascimento = null;
    no.__vis = this;
  }

  criarRotulo(no) {
    const t = new SpriteText(no.rotulo);
    t.fontFace = "Inter, Segoe UI, sans-serif";
    t.fontWeight = "600";
    t.color = "rgba(232,238,255,0.92)";
    t.textHeight = no.lobo === "hub" ? 3.6 : 3;
    t.backgroundColor = "rgba(8,12,24,0.55)";
    t.padding = [2, 1];
    t.borderRadius = 2;
    t.position.y = no.raio + 5;
    t.material.depthWrite = false;
    t.material.depthTest = false;
    t.renderOrder = 10;
    t.visible = false;
    return t;
  }

  /** Define o nível de destaque (a transição acontece em animar()). */
  definirNivel(nivel, corDestaque) {
    this.nivel = nivel;
    this.alvo = {
      soma: OPACIDADES.soma[nivel], nucleo: OPACIDADES.nucleo[nivel], halo: OPACIDADES.halo[nivel],
      dend: OPACIDADES.dend[nivel], escala: OPACIDADES.escalaHalo[nivel],
    };
    if (this.escalaHalo == null) this.aplicarAlvoNaHora();
    this.halo.material.color.copy(corDestaque && nivel === NIVEL.FOCO ? corDestaque : this.cor);
    this.rotulo.visible = nivel === NIVEL.DESTACADO || nivel === NIVEL.FOCO || (nivel === NIVEL.NORMAL && this.rotuloSempreVisivel);
  }

  aplicarAlvoNaHora() {
    this.soma.material.opacity = this.alvo.soma;
    this.nucleo.material.opacity = this.alvo.nucleo;
    this.halo.material.opacity = this.alvo.halo;
    this.dendritos.material.opacity = this.alvo.dend;
    this.escalaHalo = this.alvo.escala;
  }

  esconderRotulo() { this.rotulo.visible = false; }

  nascer(tempo) { this.nascimento = tempo; }

  /** Um quadro: transição de opacidade, pulso e animação de nascimento. */
  animar(tempo, pulsar) {
    const a = this.alvo;
    if (a) {
      this.soma.material.opacity = aproximar(this.soma.material.opacity, a.soma);
      this.nucleo.material.opacity = aproximar(this.nucleo.material.opacity, a.nucleo);
      this.halo.material.opacity = aproximar(this.halo.material.opacity, a.halo);
      this.dendritos.material.opacity = aproximar(this.dendritos.material.opacity, a.dend);
      this.escalaHalo = aproximar(this.escalaHalo, a.escala);
    }
    const pulso = pulsar ? 1 + 0.12 * Math.sin(tempo * 2.4 + (this.no.seed % 7)) : 1;
    let crescimento = 1, clarão = 0;
    if (this.nascimento != null) {
      const idade = tempo - this.nascimento;
      if (idade < 1.2) {
        const x = Math.min(1, idade / 0.7) - 1;
        crescimento = 1 + 2.70158 * x * x * x + 1.70158 * x * x; // "ease out back": cresce, passa um pouco e assenta
        clarão = 1 - idade / 1.2;
        this.halo.material.opacity = Math.max(this.halo.material.opacity, 0.85 * clarão);
      } else this.nascimento = null;
    }
    const r = this.no.raio;
    this.soma.scale.setScalar(r * pulso * crescimento);
    this.halo.scale.setScalar(r * (this.escalaHalo || 3.2) * (1 + (pulso - 1) * 2.2) * (1 + 1.8 * clarão) * Math.min(1, crescimento + 0.2));
  }
}
