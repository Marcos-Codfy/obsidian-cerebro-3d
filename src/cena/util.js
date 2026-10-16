import * as THREE from "three";

/** Gerador pseudoaleatório determinístico (mesma semente → mesmo resultado). */
export function rng(semente) {
  let s = semente >>> 0 || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    return ((s ^= s >>> 16) >>> 0) / 4294967295;
  };
}

function texturaRadial(paradas, tamanho = 64, raioInterno = 0) {
  const c = document.createElement("canvas");
  c.width = c.height = tamanho;
  const ctx = c.getContext("2d");
  const meio = tamanho / 2;
  const g = ctx.createRadialGradient(meio, meio, raioInterno, meio, meio, meio - 1);
  for (const [pos, cor] of paradas) g.addColorStop(pos, cor);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, tamanho, tamanho);
  return new THREE.CanvasTexture(c);
}

/** Brilho redondo e suave (partículas, halos, botões sinápticos). */
export const TEXTURA_BRILHO = texturaRadial([[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.55)"], [1, "rgba(255,255,255,0)"]]);

/** Anel fino (onda de luz do nascimento de um neurônio). */
export const TEXTURA_ANEL = texturaRadial(
  [[0, "rgba(255,255,255,0)"], [0.6, "rgba(255,255,255,0.85)"], [0.75, "rgba(255,255,255,0.2)"], [1, "rgba(255,255,255,0)"]],
  128,
  44
);
