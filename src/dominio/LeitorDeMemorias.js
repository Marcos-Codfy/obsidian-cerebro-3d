/**
 * Lê as memórias persistentes do Claude Code (~/.claude/projects/<projeto>/memory/*.md).
 * Só funciona no desktop (Node/Electron); em outros ambientes devolve lista vazia.
 */
export class LeitorDeMemorias {
  constructor(pastaRaiz) {
    this.pastaRaiz = pastaRaiz;
  }

  ler() {
    if (typeof window !== "undefined" && window.__MEMORIAS) return window.__MEMORIAS; // gancho do ambiente de teste
    try {
      const fs = require("fs"), path = require("path"), os = require("os");
      const raiz = this.pastaRaiz || path.join(os.homedir(), ".claude", "projects");
      if (!fs.existsSync(raiz)) return [];
      const memorias = [];
      for (const projeto of fs.readdirSync(raiz)) {
        const pasta = path.join(raiz, projeto, "memory");
        if (!fs.existsSync(pasta)) continue;
        for (const nomeArquivo of fs.readdirSync(pasta)) {
          if (!nomeArquivo.endsWith(".md") || nomeArquivo === "MEMORY.md") continue;
          memorias.push(this.lerArquivo(fs, path.join(pasta, nomeArquivo), projeto, nomeArquivo));
        }
      }
      return memorias;
    } catch (e) {
      console.warn("Cérebro 3D: não consegui ler as memórias do Claude", e);
      return [];
    }
  }

  lerArquivo(fs, caminho, projeto, nomeArquivo) {
    const texto = fs.readFileSync(caminho, "utf8").slice(0, 1500);
    const campo = (re) => (texto.match(re) || [])[1];
    const st = fs.statSync(caminho);
    return {
      projeto,
      arquivo: caminho,
      nome: (campo(/^name:\s*(.+)$/m) || nomeArquivo.replace(/\.md$/, "")).trim(),
      desc: (campo(/^description:\s*(.+)$/m) || "").replace(/^"|"$/g, ""),
      tipo: campo(/^\s*type:\s*(\w+)/m) || "",
      mtime: st.mtimeMs,
      size: st.size,
    };
  }
}
