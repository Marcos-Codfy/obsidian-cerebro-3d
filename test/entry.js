// Monta a CerebroView fora do Obsidian (obsidian simulado) para testar e gravar a demonstração.
const { CerebroView, PADRAO } = require("../src/main.js");

const D = window.__DADOS;
const arquivos = D.files.map((p) => ({ path: p, basename: p.split("/").pop().replace(/\.md$/, ""), stat: D.meta[p].stat }));
const app = {
  vault: { getMarkdownFiles: () => arquivos, on: () => {} },
  metadataCache: { resolvedLinks: D.resolved, getFileCache: (f) => ({ frontmatter: D.meta[f.path].frontmatter }), on: () => {} },
  workspace: { openLinkText: (p) => console.log("abrir", p), on: () => {}, getActiveViewOfType: () => null },
};
const plugin = {
  settings: Object.assign(structuredClone(PADRAO), window.__CONFIG || {}),
  salvar: async () => {},
  salvarSemRecarregar: async () => {},
};
const view = new CerebroView({ app, el: document.getElementById("leaf") }, plugin);
window.view = view;
view.onOpen();
