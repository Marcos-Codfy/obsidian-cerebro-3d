import { lerRegras } from "../configuracoes/padrao.js";
import { ClassificadorDeNotas } from "./Classificador.js";
import { LeitorDeMemorias } from "./LeitorDeMemorias.js";

function hash(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}

const rotuloCurto = (nome) => nome.replace(/^(Projeto|Ferramenta|Claude|Estudos|IA) - /, "");

/**
 * Grafo de notas e memórias. Os nós e ligações são objetos simples (o 3d-force-graph os consome direto);
 * cada ligação guarda referências para os dois nós (source/target).
 */
export class Grafo {
  constructor() {
    this.nodes = [];
    this.links = [];
    this.porId = new Map();
    this.porNome = new Map();
  }

  /** Monta o grafo a partir do vault do Obsidian. */
  static doVault(app, cfg, { pastaFoco = "" } = {}) {
    const grafo = new Grafo();
    const classificador = new ClassificadorDeNotas(cfg);
    const arquivos = app.vault.getMarkdownFiles().filter((f) => !pastaFoco || f.path.startsWith(pastaFoco));
    for (const f of arquivos) grafo.adicionarNota(f, app.metadataCache.getFileCache(f) || {}, classificador);
    grafo.ligarPelosLinks(app.metadataCache.resolvedLinks);
    if (cfg.mostrarMemorias && !pastaFoco) {
      grafo.adicionarMemorias(new LeitorDeMemorias(cfg.pastaMemorias).ler(), lerRegras(cfg.regrasMemorias));
    }
    grafo.calcularRaios();
    return grafo;
  }

  adicionarNota(arquivo, cache, classificador) {
    const fm = cache.frontmatter || {};
    const n = {
      id: arquivo.path, path: arquivo.path, nome: arquivo.basename, rotulo: rotuloCurto(arquivo.basename),
      lobo: classificador.areaDe(arquivo, cache), status: classificador.statusDe(fm), data: classificador.dataDe(fm, arquivo.stat),
      tamanho: (arquivo.stat && arquivo.stat.size) || 1000, grau: 0, vizinhos: [], links: [], seed: hash(arquivo.path),
    };
    this.adicionarNo(n);
    return n;
  }

  adicionarNo(n) {
    this.nodes.push(n);
    this.porId.set(n.id, n);
    if (!this.porNome.has(n.nome)) this.porNome.set(n.nome, n);
  }

  ligar(a, b, tipo) {
    const l = { source: a, target: b, tipo, curva: ((a.seed ^ b.seed) % 100) / 100 };
    this.links.push(l);
    a.grau++; b.grau++;
    a.vizinhos.push(b); b.vizinhos.push(a);
    a.links.push(l); b.links.push(l);
    return l;
  }

  /** Uma ligação por par de notas, sem direção. */
  ligarPelosLinks(resolvedLinks) {
    const vistos = new Set();
    for (const [origem, alvos] of Object.entries(resolvedLinks)) {
      const a = this.porId.get(origem);
      if (!a) continue;
      for (const destino of Object.keys(alvos)) {
        const b = this.porId.get(destino);
        if (!b || a === b) continue;
        const chave = a.id < b.id ? a.id + "|" + b.id : b.id + "|" + a.id;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        this.ligar(a, b, "nota");
      }
    }
  }

  /** Cada memória liga na nota do projeto (pelas regras) ou, sem regra, na primeira memória do mesmo projeto. */
  adicionarMemorias(memorias, regras) {
    const primeiraDoProjeto = new Map();
    for (const m of memorias) {
      const n = {
        id: "mem:" + m.arquivo, arquivo: m.arquivo, nome: m.nome, rotulo: m.nome, desc: m.desc, tipoMem: m.tipo,
        lobo: "memorias", status: null, data: m.mtime, tamanho: m.size, grau: 0, vizinhos: [], links: [],
        seed: hash(m.arquivo), memoria: true,
      };
      this.adicionarNo(n);
      const regra = regras.find(([trecho]) => m.projeto.toLowerCase().includes(trecho.toLowerCase()));
      const alvo = regra && this.porNome.get(regra[1]);
      if (alvo) this.ligar(n, alvo, "memoria");
      else if (primeiraDoProjeto.has(m.projeto)) this.ligar(n, primeiraDoProjeto.get(m.projeto), "memoria");
      if (!primeiraDoProjeto.has(m.projeto)) primeiraDoProjeto.set(m.projeto, n);
    }
  }

  /** Tamanho do neurônio: ligações + tamanho do conteúdo. */
  calcularRaios() {
    for (const n of this.nodes) {
      let r = 1.2 + 0.5 * Math.sqrt(n.grau) + 0.3 * Math.log2(1 + n.tamanho / 2500);
      if (n.lobo === "hub") r += 1;
      if (n.memoria) r *= 0.6;
      n.raio = Math.min(r, 6.5);
    }
  }

  get quantidadeDeMemorias() { return this.nodes.filter((n) => n.memoria).length; }

  contagemPorArea() {
    const c = {};
    for (const n of this.nodes) c[n.lobo] = (c[n.lobo] || 0) + 1;
    return c;
  }

  /** Busca por nome: notas antes de memórias, começo do nome primeiro, mais conectadas primeiro. */
  buscar(texto, limite = 8) {
    const q = String(texto || "").toLowerCase().trim();
    if (!q) return [];
    return this.nodes
      .filter((n) => n.nome.toLowerCase().includes(q))
      .sort((a, b) => (a.memoria - b.memoria) || (a.nome.toLowerCase().indexOf(q) - b.nome.toLowerCase().indexOf(q)) || b.grau - a.grau)
      .slice(0, limite);
  }

  /** Menor caminho (BFS) entre dois nós; devolve { nos, links } ou null. */
  caminhoEntre(a, b) {
    if (!a || !b || a === b) return null;
    const anterior = new Map([[a, null]]);
    const fila = [a];
    while (fila.length) {
      const n = fila.shift();
      if (n === b) break;
      for (const v of n.vizinhos) if (!anterior.has(v)) { anterior.set(v, n); fila.push(v); }
    }
    if (!anterior.has(b)) return null;
    const nos = [];
    for (let n = b; n; n = anterior.get(n)) nos.unshift(n);
    const links = [];
    for (let i = 0; i < nos.length - 1; i++) {
      const l = nos[i].links.find((x) => x.source === nos[i + 1] || x.target === nos[i + 1]);
      if (l) links.push(l);
    }
    return { nos, links };
  }
}
