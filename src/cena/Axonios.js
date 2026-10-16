import * as THREE from "three";
import { TEXTURA_BRILHO } from "./util.js";

const SEGMENTOS = 22;
const DIA = 86400000;

/** Estado de uma ligação: 0 oculta · 0.12 apagada · 1 normal · 2 acesa (foco/caminho). */
export const ESTADO_AXONIO = { OCULTO: 0, APAGADO: 0.12, NORMAL: 1, ACESO: 2 };

const VERTEX_LINHAS = `
  attribute vec3 aCor; attribute float aT; attribute float aFase; attribute float aEstado; attribute float aNasc;
  uniform float uPerto, uLonge, uAgora, uJanela;
  varying vec3 vCor; varying float vT; varying float vFase; varying float vEstado; varying float vNevoa; varying float vCresc;
  void main() {
    vCor = aCor; vT = aT; vFase = aFase; vEstado = aEstado;
    vCresc = clamp((uAgora - aNasc) / uJanela, 0.0, 1.0); // 0 = ainda não nasceu, 1 = axônio completo
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNevoa = 0.3 + 0.7 * (1.0 - smoothstep(uPerto, uLonge, -mv.z));
    gl_Position = projectionMatrix * mv;
  }`;

const FRAGMENT_LINHAS = `
  uniform float uTempo, uDensidade, uIntensidade;
  varying vec3 vCor; varying float vT; varying float vFase; varying float vEstado; varying float vNevoa; varying float vCresc;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    if (vEstado < 0.01 || vT > vCresc) discard;
    float ponta = (1.0 - step(0.999, vCresc)) * smoothstep(vCresc - 0.12, vCresc, vT); // ponta brilhante enquanto cresce
    float aceso = smoothstep(1.2, 2.0, vEstado);
    float base = (vEstado < 1.0 ? vEstado * 0.5 : 0.5 + (vEstado - 1.0) * 0.5) * 0.22;
    // sinal de luz viajando da origem (t = 0) ao destino (t = 1)
    float vel = mix(0.12 + 0.18 * vFase, 0.45, aceso);
    float s = uTempo * vel + vFase * 7.0;
    float liga = step(hash(floor(s) * 12.9898 + vFase * 78.233), mix(uDensidade, 1.0, aceso));
    float d = vT - fract(s);
    float cauda = smoothstep(-0.16, 0.0, d) * (1.0 - smoothstep(0.0, 0.015, d));
    float sinal = cauda * liga * (vEstado < 0.9 ? 0.15 : 1.0) * mix(0.9, 1.6, aceso);
    vec3 c = vCor * (0.55 + 0.45 * aceso) + vec3(1.0) * (sinal * 0.35 + ponta * 0.6);
    gl_FragColor = vec4(c, (base + sinal * 0.9 + ponta * 1.2) * vNevoa * uIntensidade);
  }`;

const VERTEX_BOTOES = `
  attribute vec3 aCor; attribute float aEstado; attribute float aNasc; uniform float uEscala, uAgora, uJanela;
  varying vec3 vCor; varying float vA;
  void main() {
    float chegou = step(1.0, (uAgora - aNasc) / uJanela + 0.0001);
    vCor = aCor; vA = chegou * (aEstado < 1.0 ? aEstado * 0.25 : 0.25 + (aEstado - 1.0) * 0.5);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (1.6 + aEstado) * uEscala / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;

const FRAGMENT_BOTOES = `
  uniform sampler2D uMapa; varying vec3 vCor; varying float vA;
  void main() { float a = texture2D(uMapa, gl_PointCoord).a * vA; if (a < 0.01) discard; gl_FragColor = vec4(vCor, a); }`;

/**
 * Axônios: todas as ligações num único LineSegments com shader próprio (uma chamada de desenho).
 * Cada ligação é uma curva que arqueia para dentro do cérebro, com cor da área de origem para a de destino,
 * sinais de luz viajando e um botão sináptico na chegada. Também "cresce" na linha do tempo.
 */
export class Axonios {
  constructor(links, corDaArea, dataBase = 0) {
    this.links = links;
    const nL = links.length, porLink = SEGMENTOS * 2;
    this.porLink = porLink;
    const pos = new Float32Array(nL * porLink * 3), cor = new Float32Array(nL * porLink * 3);
    const t = new Float32Array(nL * porLink), fase = new Float32Array(nL * porLink), nasc = new Float32Array(nL * porLink);
    this.estado = new Float32Array(nL * porLink).fill(1);
    this.alvo = new Float32Array(nL).fill(1);
    this.atual = new Float32Array(nL).fill(1);
    const bPos = new Float32Array(nL * 3), bCor = new Float32Array(nL * 3), bNasc = new Float32Array(nL);
    this.estadoBotoes = new Float32Array(nL).fill(1);

    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), P = new THREE.Vector3();
    const ca = new THREE.Color(), cb = new THREE.Color(), cm = new THREE.Color();
    const curva = (u, out) => {
      const v = 1 - u;
      return out.set(v * v * A.x + 2 * v * u * C.x + u * u * B.x, v * v * A.y + 2 * v * u * C.y + u * u * B.y, v * v * A.z + 2 * v * u * C.z + u * u * B.z);
    };

    links.forEach((l, i) => {
      const s = l.source, d = l.target;
      A.set(s.x, s.y, s.z);
      B.set(d.x, d.y, d.z);
      // ponto de controle: meio do caminho puxado para o centro (como os feixes de substância branca)
      C.copy(A).add(B).multiplyScalar(0.5).multiplyScalar(0.62 - 0.18 * l.curva);
      C.y += (l.curva - 0.5) * A.distanceTo(B) * 0.25;
      ca.set(corDaArea(s.lobo));
      cb.set(corDaArea(d.lobo));
      const f = (l.curva * 9.13 + i * 0.6180339) % 1;
      const dia = (Math.max(s.data || 0, d.data || 0) - dataBase) / DIA;
      for (let k = 0; k < SEGMENTOS; k++) {
        const base = i * porLink + k * 2;
        for (const [j, u] of [[0, k / SEGMENTOS], [1, (k + 1) / SEGMENTOS]]) {
          curva(u, P);
          pos.set([P.x, P.y, P.z], (base + j) * 3);
          cm.copy(ca).lerp(cb, u);
          cor.set([cm.r, cm.g, cm.b], (base + j) * 3);
          t[base + j] = u;
          fase[base + j] = f;
          nasc[base + j] = dia;
        }
      }
      bPos.set([B.x, B.y, B.z], i * 3);
      bCor.set([cb.r, cb.g, cb.b], i * 3);
      bNasc[i] = dia;
    });

    this.uniforms = {
      uTempo: { value: 0 }, uDensidade: { value: 0.35 }, uIntensidade: { value: 1 },
      uPerto: { value: 300 }, uLonge: { value: 800 }, uAgora: { value: 1e9 }, uJanela: { value: 0.001 },
    };
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aCor", new THREE.BufferAttribute(cor, 3));
    geo.setAttribute("aT", new THREE.BufferAttribute(t, 1));
    geo.setAttribute("aFase", new THREE.BufferAttribute(fase, 1));
    geo.setAttribute("aNasc", new THREE.BufferAttribute(nasc, 1));
    this.atrEstado = new THREE.BufferAttribute(this.estado, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aEstado", this.atrEstado);
    const linhas = new THREE.LineSegments(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERTEX_LINHAS, fragmentShader: FRAGMENT_LINHAS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    linhas.frustumCulled = false;
    linhas.renderOrder = 1;

    const gb = new THREE.BufferGeometry();
    gb.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
    gb.setAttribute("aCor", new THREE.BufferAttribute(bCor, 3));
    gb.setAttribute("aNasc", new THREE.BufferAttribute(bNasc, 1));
    this.atrBotoes = new THREE.BufferAttribute(this.estadoBotoes, 1).setUsage(THREE.DynamicDrawUsage);
    gb.setAttribute("aEstado", this.atrBotoes);
    this.uniformesBotoes = { uMapa: { value: TEXTURA_BRILHO }, uEscala: { value: 300 }, uAgora: this.uniforms.uAgora, uJanela: this.uniforms.uJanela };
    const botoes = new THREE.Points(gb, new THREE.ShaderMaterial({
      uniforms: this.uniformesBotoes, vertexShader: VERTEX_BOTOES, fragmentShader: FRAGMENT_BOTOES,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    botoes.frustumCulled = false;

    this.objeto = new THREE.Group();
    this.objeto.add(linhas, botoes);
    this.animando = false;
  }

  set densidadeDeSinais(v) { this.uniforms.uDensidade.value = Math.min(1, Math.max(0, v)); }
  set intensidade(v) { this.uniforms.uIntensidade.value = v; }

  /** Mostra os axônios existentes até um dia (relativo); janela > 0 faz eles crescerem. */
  mostrarAte(dia, janelaEmDias = 0.001) {
    this.uniforms.uAgora.value = dia;
    this.uniforms.uJanela.value = janelaEmDias;
  }

  mostrarTodos() { this.mostrarAte(1e9); }

  /** fn(ligação) → ESTADO_AXONIO; a mudança acontece suavemente em animar(). */
  definirEstados(fn) {
    this.links.forEach((l, i) => { this.alvo[i] = fn(l); });
    this.animando = true;
  }

  animar(tempo, distanciaCamera) {
    const u = this.uniforms;
    u.uTempo.value = tempo;
    u.uPerto.value = Math.max(50, distanciaCamera - 160);
    u.uLonge.value = distanciaCamera + 260;
    this.uniformesBotoes.uEscala.value = 300 * (window.devicePixelRatio || 1);
    if (!this.animando) return;
    let mudou = false;
    for (let i = 0; i < this.atual.length; i++) {
      const dif = this.alvo[i] - this.atual[i];
      if (Math.abs(dif) < 0.004) { if (this.atual[i] !== this.alvo[i]) { this.atual[i] = this.alvo[i]; mudou = true; } continue; }
      this.atual[i] += dif * 0.2;
      mudou = true;
    }
    if (!mudou) { this.animando = false; return; }
    for (let i = 0; i < this.atual.length; i++) {
      this.estado.fill(this.atual[i], i * this.porLink, (i + 1) * this.porLink);
      this.estadoBotoes[i] = this.atual[i];
    }
    this.atrEstado.needsUpdate = true;
    this.atrBotoes.needsUpdate = true;
  }

  descartar() {
    this.objeto.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }
}
