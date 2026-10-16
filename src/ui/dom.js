/** Cria um elemento (sem depender das extensões de DOM do Obsidian). */
export function h(tag, classe, pai, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto != null) e.textContent = texto;
  if (pai) pai.appendChild(e);
  return e;
}

export function dataBR(instante) {
  const d = new Date(instante);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Ponto colorido usado em legendas, listas e sugestões. */
export function ponto(pai, cor, brilho = false) {
  const p = h("span", "c3d-ponto", pai);
  p.style.background = cor;
  if (brilho) p.style.boxShadow = `0 0 6px ${cor}`;
  return p;
}
