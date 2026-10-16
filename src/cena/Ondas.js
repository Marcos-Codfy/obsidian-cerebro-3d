import * as THREE from "three";
import { TEXTURA_ANEL } from "./util.js";

const DURACAO = 1.5;
const suaveSaida = (x) => 1 - Math.pow(1 - x, 3);

/** Ondas de luz (anéis que se expandem) — usadas quando um neurônio nasce. Pool fixo, sem alocar a cada onda. */
export class Ondas {
  constructor(tamanhoDoPool = 40) {
    this.objeto = new THREE.Group();
    this.sprites = Array.from({ length: tamanhoDoPool }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEXTURA_ANEL, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.visible = false;
      this.objeto.add(s);
      return s;
    });
    this.proxima = 0;
  }

  emitir(posicao, cor, raio, tempo) {
    const s = this.sprites[this.proxima++ % this.sprites.length];
    s.position.set(posicao.x, posicao.y, posicao.z);
    s.material.color.set(cor);
    s.userData = { inicio: tempo, raio };
    s.visible = true;
  }

  animar(tempo) {
    for (const s of this.sprites) {
      if (!s.visible) continue;
      const idade = (tempo - s.userData.inicio) / DURACAO;
      if (idade >= 1) { s.visible = false; continue; }
      s.scale.setScalar(s.userData.raio * 2 + suaveSaida(idade) * 26);
      s.material.opacity = 0.38 * (1 - idade) * (1 - idade);
    }
  }

  descartar() { for (const s of this.sprites) s.material.dispose(); }
}
