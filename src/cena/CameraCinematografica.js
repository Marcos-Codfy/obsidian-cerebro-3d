import * as THREE from "three";

/**
 * Câmera da reprodução: orbita o cérebro devagar e se aproxima de onde as notas estão nascendo.
 * Se o usuário arrastar a câmera, ela fica livre até a próxima reprodução.
 */
export class CameraCinematografica {
  constructor(cena3d) {
    this.cena3d = cena3d;
    this.livre = false;
    this.focos = [];
  }

  iniciar() {
    const cam = this.cena3d.camera, alvo = this.cena3d.controles.target;
    this.alvo = alvo.clone();
    this.esfera = new THREE.Spherical().setFromVector3(cam.position.clone().sub(this.alvo));
    this.livre = false;
    this.focos = [];
  }

  liberar() { this.livre = true; }

  /** Registra um ponto de interesse (um neurônio que acabou de nascer). */
  observar(ponto, tempo) { this.focos.push({ ponto, tempo }); }

  passo(dt, tempo) {
    if (this.livre || !this.alvo) return;
    this.focos = this.focos.filter((f) => tempo - f.tempo < 2.6);
    const foco = new THREE.Vector3();
    if (this.focos.length) {
      for (const f of this.focos) foco.add(new THREE.Vector3(f.ponto.x, f.ponto.y, f.ponto.z));
      foco.multiplyScalar(0.6 / this.focos.length); // meio caminho entre o centro e onde as notas nascem
    }
    const suave = (taxa) => 1 - Math.exp(-dt * taxa);
    const agito = Math.min(1, this.focos.length / 8);
    this.alvo.lerp(foco, suave(0.9));
    this.esfera.radius += (680 - 200 * agito - this.esfera.radius) * suave(0.6);
    this.esfera.theta += dt * (0.14 + 0.05 * agito);
    this.esfera.phi += (1.12 + 0.24 * Math.sin(tempo * 0.21) - this.esfera.phi) * suave(0.6);
    const cam = this.cena3d.camera;
    cam.position.setFromSpherical(this.esfera).add(this.alvo);
    this.cena3d.controles.target.copy(this.alvo);
    cam.lookAt(this.alvo);
  }
}
