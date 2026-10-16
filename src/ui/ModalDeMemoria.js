const obsidian = require("obsidian");
// Memórias do Claude ficam fora do vault; por isso abrem num modal do Obsidian em vez do editor do sistema.

const dataBR = (t) => new Date(t).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function lerArquivo(caminho) {
  try { return require("fs").readFileSync(caminho, "utf8"); } catch (e) { return null; }
}

function separarFrontmatter(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return m ? texto.slice(m[0].length) : texto;
}

// Nome do projeto a partir da pasta do Claude (ex.: C--dev-meu-app → meu app)
function nomeDoProjeto(caminho) {
  const m = String(caminho).replace(/\\/g, "/").match(/projects\/([^/]+)\/memory/);
  if (!m) return "";
  return m[1].replace(/^C--(dev|Users-Marcos-(Documents|Desktop|Downloads|Videos))-?/i, "").replace(/-/g, " ").trim();
}

/**
 * Abre uma memória do Claude dentro do Obsidian (modal com o markdown renderizado),
 * em vez de mandar o arquivo para o editor padrão do Windows.
 */
export function abrirMemoria(app, n, cor) {
  const texto = lerArquivo(n.arquivo);
  const Modal = obsidian.Modal;
  if (!Modal) return;
  const modal = new Modal(app);
  modal.modalEl.addClass("c3d-modal-memoria");
  modal.modalEl.style.setProperty("--cor", cor);
  modal.titleEl.setText(n.nome);

  const el = modal.contentEl;
  const meta = el.createDiv({ cls: "c3d-mem-meta" });
  meta.createSpan({ cls: "c3d-mem-tag", text: "Memória do Claude" });
  if (n.tipoMem) meta.createSpan({ cls: "c3d-mem-tag", text: n.tipoMem });
  const proj = nomeDoProjeto(n.arquivo);
  if (proj) meta.createSpan({ cls: "c3d-mem-tag", text: "projeto: " + proj });
  meta.createSpan({ cls: "c3d-mem-tag", text: "modificada " + dataBR(n.data) });

  const corpo = el.createDiv({ cls: "c3d-mem-corpo markdown-rendered" });
  if (texto == null) {
    corpo.setText("Não consegui ler o arquivo da memória.");
  } else if (obsidian.MarkdownRenderer && obsidian.Component) {
    const comp = new obsidian.Component();
    comp.load();
    obsidian.MarkdownRenderer.render(app, separarFrontmatter(texto), corpo, "", comp);
    modal.onClose = () => comp.unload();
  } else {
    corpo.createEl("pre", { text: separarFrontmatter(texto) });
  }

  const rodape = el.createDiv({ cls: "c3d-mem-rodape" });
  rodape.createSpan({ cls: "c3d-mem-caminho", text: n.arquivo });
  const copiar = rodape.createEl("button", { text: "Copiar caminho" });
  copiar.onclick = () => { navigator.clipboard.writeText(n.arquivo); new obsidian.Notice("Caminho copiado"); };
  const externo = rodape.createEl("button", { text: "Abrir no editor externo" });
  externo.onclick = () => { try { require("electron").shell.openPath(n.arquivo); } catch (e) { /* sem electron no teste */ } };
  modal.open();
}
