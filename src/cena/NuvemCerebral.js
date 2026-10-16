import * as THREE from "three";
import { mm } from "./Anatomia.js";
import { rng, TEXTURA_BRILHO } from "./util.js";

const VERTEX = `
  attribute vec3 aCor; attribute float aTam; attribute float aFase; attribute float aAlfa;
  uniform float uTempo, uEscala, uPerto, uLonge;
  varying vec3 vCor; varying float vAlfa;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float prof = -mv.z;
    float nevoa = 1.0 - smoothstep(uPerto, uLonge, prof);   // o lado de trás fica mais apagado
    vCor = aCor;
    vAlfa = aAlfa * (0.22 + 0.78 * nevoa) * (0.88 + 0.12 * sin(uTempo * 0.9 + aFase));
    gl_PointSize = aTam * uEscala / prof;
    gl_Position = projectionMatrix * mv;
  }`;

const FRAGMENT = `
  uniform sampler2D uMapa; uniform float uOpac;
  varying vec3 vCor; varying float vAlfa;
  void main() {
    float a = texture2D(uMapa, gl_PointCoord).a * vAlfa * uOpac;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vCor, a);
  }`;

/** Acumula atributos de partículas antes de virar BufferGeometry. */
class LoteDePontos {
  constructor(corBase, r) {
    this.base = new THREE.Color(corBase);
    this.clara = new THREE.Color("#eef3ff");
    this.tmp = new THREE.Color();
    this.r = r;
    this.pos = []; this.cor = []; this.tam = []; this.fase = []; this.alfa = [];
  }

  adicionar(x, y, z, brilho, tinta, tamanho = 1, alfa = 1) {
    this.pos.push(x, y, z);
    this.tmp.copy(this.base);
    if (tinta) this.tmp.lerp(new THREE.Color(tinta), 0.22);
    this.tmp.lerp(this.clara, brilho * 0.4);
    const k = 0.35 + 0.65 * brilho;
    this.cor.push(this.tmp.r * k, this.tmp.g * k, this.tmp.b * k);
    this.tam.push((0.75 + 1.05 * brilho) * tamanho);
    this.fase.push(this.r() * 6.283);
    this.alfa.push(alfa * (0.18 + 0.82 * brilho));
  }

  paraPontos(material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("aCor", new THREE.Float32BufferAttribute(this.cor, 3));
    g.setAttribute("aTam", new THREE.Float32BufferAttribute(this.tam, 1));
    g.setAttribute("aFase", new THREE.Float32BufferAttribute(this.fase, 1));
    g.setAttribute("aAlfa", new THREE.Float32BufferAttribute(this.alfa, 1));
    const p = new THREE.Points(g, material);
    p.renderOrder = -1;
    return p;
  }
}

/**
 * Superfície do cérebro em partículas: cristas dos giros claras, fundos dos sulcos escuros
 * (profundidade real), névoa de profundidade e cintilação leve.
 */
export class NuvemCerebral {
  constructor(anatomia, { densidade = 1, opacidade = 0.55, cor = "#9db7ff", cores = {}, tingir = true } = {}) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTempo: { value: 0 }, uOpac: { value: opacidade }, uEscala: { value: 300 },
        uPerto: { value: 300 }, uLonge: { value: 800 }, uMapa: { value: TEXTURA_BRILHO },
      },
      vertexShader: VERTEX, fragmentShader: FRAGMENT,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const r = rng(7);
    const cortex = new LoteDePontos(cor, r);
    for (const h of anatomia.hemisferios) {
      for (let i = 0, n = Math.round(38000 * densidade); i < n; i++) {
        const p = h.sortear(r);
        cortex.adicionar(p.x, p.y, p.z, Math.max(0, Math.min(1, 0.55 - 0.75 * p.sulco)), tingir ? cores[h.regiao[p.vertice]] : null);
      }
    }
    const profundo = new LoteDePontos(cor, r);
    for (let i = 0, n = Math.round(22000 * densidade); i < n; i++) {
      const p = anatomia.cerebelo.sortear(r);
      profundo.adicionar(p.x, p.y, p.z, Math.max(0, Math.min(1, 0.5 - 0.7 * p.sulco)), tingir ? cores.outros : null, 0.8);
    }
    this.adicionarTronco(profundo, r, densidade);

    this.objeto = new THREE.Group();
    this.objeto.add(cortex.paraPontos(this.material), profundo.paraPontos(this.material));
  }

  /** Tronco encefálico procedural com a ponte (a malha cortical não inclui). */
  adicionarTronco(lote, r, densidade) {
    for (let i = 0, n = 3000 * densidade; i < n; i++) {
      const h = r(), t = r() * 6.283;
      const ponte = 1 + 0.45 * Math.exp(-((h - 0.22) ** 2) / 0.01);
      const raio = (10.5 - 3 * h) * ponte;
      const [x, y, z] = mm(raio * Math.cos(t), -22 - 14 * h + raio * Math.sin(t) * 0.8 + 3, -18 - 52 * h);
      lote.adicionar(x, y, z, 0.3 + 0.35 * r(), null, 0.85, 0.7);
    }
  }

  set opacidade(v) { this.material.uniforms.uOpac.value = v; }

  animar(tempo, distanciaCamera) {
    const u = this.material.uniforms;
    u.uTempo.value = tempo;
    u.uPerto.value = Math.max(50, distanciaCamera - 160);
    u.uLonge.value = distanciaCamera + 260;
    u.uEscala.value = 300 * (window.devicePixelRatio || 1);
  }

  descartar() {
    this.objeto.traverse((o) => o.geometry && o.geometry.dispose());
    this.material.dispose();
  }
}
