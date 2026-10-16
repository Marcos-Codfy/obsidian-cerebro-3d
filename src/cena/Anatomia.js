import * as THREE from "three";
import { esq, dir } from "./malhas/fsaverage5.js";
import { cerebelo as CEREBELO } from "./malhas/cerebelo_suit.js";
import { rng } from "./util.js";

/**
 * Anatomia do cérebro a partir de malhas reais:
 * - córtex: superfície pial fsaverage5 (FreeSurfer, via nilearn) + profundidade dos sulcos;
 * - cerebelo: superfície pial do atlas SUIT (SUITPy).
 * Coordenadas em mm no espaço MNI (x = esquerda/direita, y = trás/frente, z = baixo/cima),
 * convertidas para a cena (X = x, Y = z, Z = y).
 */
const ESCALA = 2.4;
export const mm = (x, y, z) => [x * ESCALA, (z - 14) * ESCALA, (y + 18) * ESCALA];

function decodificar(b64, Tipo) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Tipo(bytes.buffer);
}

/** Região anatômica aproximada de um ponto da superfície (mm) → área do vault. */
export function regiaoMM(x, y, z) {
  const ax = Math.abs(x);
  if (ax < 13 && z > 0 && z < 44 && y > -55 && y < 38) return "perfil"; // giro do cíngulo (face medial)
  if (y < -74 || (y < -62 && z < 26)) return "estudos";                   // occipital
  if (z < 4 && ax > 28 && y > -66) return "claude";                       // temporal
  if (y > -14 - 0.22 * (z - 30)) return "projetos";                       // frontal (sulco central inclinado)
  return "ferramentas";                                                   // parietal
}

/** Uma malha triangular pronta para sorteio de pontos proporcional à área. */
class MalhaAmostravel {
  constructor(dados, lado, deslocX, regiaoFixa) {
    const v = decodificar(dados.v, Int16Array);
    this.faces = decodificar(dados.f, Uint16Array);
    this.sulco = decodificar(dados.s, Int8Array);
    this.lado = lado;
    this.n = v.length / 3;
    this.pos = new Float32Array(v.length);
    this.regiao = new Array(this.n);
    const valido = new Uint8Array(this.n);
    for (let k = 0; k < this.n; k++) {
      const x = v[3 * k] / 100 + deslocX, y = v[3 * k + 1] / 100, z = v[3 * k + 2] / 100;
      valido[k] = v[3 * k] || v[3 * k + 1] || v[3 * k + 2] ? 1 : 0; // a malha do SUIT tem vértices "mortos" na origem
      this.pos.set(mm(x, y, z), 3 * k);
      this.regiao[k] = regiaoFixa || regiaoMM(x, y, z);
    }
    const nf = this.faces.length / 3;
    this.acumulado = new Float32Array(nf);
    let total = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < nf; t++) {
      const ia = this.faces[3 * t], ib = this.faces[3 * t + 1], ic = this.faces[3 * t + 2];
      if (valido[ia] && valido[ib] && valido[ic]) {
        a.fromArray(this.pos, 3 * ia); b.fromArray(this.pos, 3 * ib); c.fromArray(this.pos, 3 * ic);
        total += b.sub(a).cross(c.sub(a)).length() / 2;
      }
      this.acumulado[t] = total;
    }
    this.areaTotal = total;
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._c = new THREE.Vector3();
  }

  /** Ponto aleatório na superfície: { x, y, z, sulco (+ fundo / − crista), vertice }. */
  sortear(r) {
    const alvo = r() * this.areaTotal;
    let lo = 0, hi = this.acumulado.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (this.acumulado[m] < alvo) lo = m + 1; else hi = m; }
    const ia = this.faces[3 * lo], ib = this.faces[3 * lo + 1], ic = this.faces[3 * lo + 2];
    let u = r(), v = r();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const w = 1 - u - v;
    const A = this._a.fromArray(this.pos, 3 * ia), B = this._b.fromArray(this.pos, 3 * ib), C = this._c.fromArray(this.pos, 3 * ic);
    return {
      x: A.x * w + B.x * u + C.x * v, y: A.y * w + B.y * u + C.y * v, z: A.z * w + B.z * u + C.z * v,
      sulco: (this.sulco[ia] * w + this.sulco[ib] * u + this.sulco[ic] * v) / 127,
      vertice: ia,
    };
  }
}

/** Regiões profundas (sem superfície própria) onde algumas áreas ficam: caixas em mm. */
const CAIXAS_MM = {
  hub: { x: [-5, 5], y: [-30, 26], z: [15, 23] },                       // corpo caloso
  perfil: { x: [5, 11], y: [-36, 28], z: [28, 38], lados: true },       // giro do cíngulo
  memorias: { x: [19, 33], y: [-40, -2], z: [-22, -4], lados: true },   // hipocampo / temporal medial
};

export class Anatomia {
  static instancia() {
    if (!Anatomia._unica) Anatomia._unica = new Anatomia();
    return Anatomia._unica;
  }

  constructor() {
    this.hemisferios = [new MalhaAmostravel(esq, -1, -1.5), new MalhaAmostravel(dir, 1, 1.5)];
    this.cerebelo = new MalhaAmostravel(CEREBELO, 0, 0, "outros");
    this.verticesPorRegiao = {};
    for (const h of this.hemisferios) for (let k = 0; k < h.n; k++) (this.verticesPorRegiao[h.regiao[k]] ||= []).push([h, k]);
  }

  /**
   * Posiciona cada nó dentro da sua região, sempre para dentro da superfície
   * (30–68% do caminho até o centro do hemisfério), espalhando para não amontoar.
   */
  posicionar(nodes) {
    const colocados = {};
    for (const n of nodes) {
      const r = rng(n.seed);
      const lista = (colocados[n.lobo] ||= []);
      let melhor = null, maiorDistancia = -1;
      for (let tentativa = 0; tentativa < 24; tentativa++) {
        const p = this.candidato(n.lobo, r);
        let d = Infinity;
        for (const q of lista) d = Math.min(d, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);
        if (d > maiorDistancia) { maiorDistancia = d; melhor = p; }
      }
      lista.push(melhor);
      [n.x, n.y, n.z] = melhor;
      n.fx = n.x; n.fy = n.y; n.fz = n.z; // posição fixa (sem simulação de forças)
    }
  }

  candidato(area, r) {
    const entre = (a, b, t) => a + (b - a) * t;
    const caixa = CAIXAS_MM[area];
    if (caixa) {
      const lado = caixa.lados ? (r() < 0.5 ? -1 : 1) : 1;
      return mm(lado * entre(caixa.x[0], caixa.x[1], r()), entre(caixa.y[0], caixa.y[1], r()), entre(caixa.z[0], caixa.z[1], r()));
    }
    if (area === "outros") {
      const lado = r() < 0.5 ? -1 : 1;
      return mm(lado * (14 + 20 * r()), -63 + 30 * (r() - 0.5), -36 + 14 * (r() - 0.5));
    }
    const lista = this.verticesPorRegiao[area] || this.verticesPorRegiao.projetos;
    const [h, k] = lista[Math.floor(r() * lista.length)];
    const nucleo = mm(h.lado * 27, -18, 16);
    const t = 0.3 + 0.38 * r();
    return [0, 1, 2].map((e) => entre(h.pos[3 * k + e], nucleo[e], t));
  }
}
