import { AREAS, lerRegras } from "../configuracoes/padrao.js";

const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Decide a área, o status e a data de cada nota a partir das regras configuradas.
 * Prioridade da área: tag → prefixo de hub no nome → pasta → "outros".
 */
export class ClassificadorDeNotas {
  constructor(cfg) {
    this.regrasTags = lerRegras(cfg.regrasTags).filter(([, area]) => AREAS[area]);
    this.regrasPastas = lerRegras(cfg.regrasPastas).filter(([, area]) => AREAS[area]);
    this.prefixosHub = String(cfg.prefixosHub || "").split(/[,\s]+/).filter(Boolean);
  }

  areaDe(arquivo, cache) {
    const tags = ClassificadorDeNotas.tagsDe(cache);
    for (const [tag, area] of this.regrasTags) if (tags.has(tag.toLowerCase())) return area;
    if (this.prefixosHub.some((p) => arquivo.basename.startsWith(p))) return "hub";
    for (const [pasta, area] of this.regrasPastas) if (arquivo.path.startsWith(pasta)) return area;
    return "outros";
  }

  /** "ativo" pulsa, "pausado" fica apagado, "entregue" é normal. */
  statusDe(frontmatter) {
    const s = semAcento(frontmatter && frontmatter.status);
    if (!s) return null;
    if (/pausad|parad|\blento|^ideia|ideias|nao e projeto|so documenta|apoio|acervo/.test(s)) return "pausado";
    if (/ativo|andamento|em uso|em operac|no ar|recorrente/.test(s)) return "ativo";
    if (/conclu|entreg|finaliz|publicad|producao|exercicio|pontual/.test(s)) return "entregue";
    return null;
  }

  /** Data de nascimento da nota: frontmatter (inicio/instalado_em/atualizado) ou criação do arquivo. */
  dataDe(frontmatter, stat) {
    const v = frontmatter && (frontmatter.inicio || frontmatter.instalado_em || frontmatter.atualizado);
    const m = v && String(v).match(/(\d{4})-(\d{2})(?:-(\d{2}))?/);
    if (m) return new Date(+m[1], +m[2] - 1, +(m[3] || 1)).getTime();
    return stat ? stat.ctime : Date.now();
  }

  static tagsDe(cache) {
    const out = new Set();
    const fm = cache && cache.frontmatter;
    let t = fm && (fm.tags || fm.tag);
    if (typeof t === "string") t = t.split(/[,\s]+/);
    if (Array.isArray(t)) t.forEach((x) => x && out.add(String(x).replace(/^#/, "").toLowerCase()));
    if (cache && cache.tags) cache.tags.forEach((x) => out.add(x.tag.replace(/^#/, "").toLowerCase()));
    return out;
  }
}
