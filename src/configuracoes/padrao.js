/**
 * Áreas do cérebro: cada uma recebe as notas de um tipo e ocupa uma região anatômica.
 * A ordem aqui é a ordem da legenda.
 */
export const AREAS = {
  hub: { nome: "Hubs", regiao: "corpo caloso" },
  projetos: { nome: "Projetos", regiao: "lobo frontal" },
  ferramentas: { nome: "Ferramentas", regiao: "lobo parietal" },
  claude: { nome: "Claude e IA", regiao: "lobos temporais" },
  estudos: { nome: "Estudos", regiao: "lobo occipital" },
  perfil: { nome: "Perfil", regiao: "sistema límbico" },
  memorias: { nome: "Memórias do Claude", regiao: "hipocampo" },
  outros: { nome: "Outros", regiao: "cerebelo" },
};

export const STATUS = { ativo: "Ativo", entregue: "Entregue", pausado: "Pausado" };

/** Configurações padrão (genéricas — cada vault ajusta as regras nas configurações do plugin). */
export const PADRAO = {
  cores: {
    hub: "#e9c46a",
    projetos: "#5b8def",
    ferramentas: "#4fc3dc",
    claude: "#f0a35e",
    estudos: "#5fd39a",
    perfil: "#a08cf0",
    memorias: "#b9e06a",
    outros: "#8a94a6",
  },
  corCerebro: "#9db7ff",
  tingirRegioes: true,
  regrasTags: [
    "hub => hub",
    "ferramenta => ferramentas",
    "claude => claude",
    "ia => claude",
    "projeto => projetos",
    "estudo => estudos",
    "estudos => estudos",
    "perfil => perfil",
  ].join("\n"),
  regrasPastas: "",
  prefixosHub: "🏠",
  pastaFoco: "",
  mostrarMemorias: true,
  pastaMemorias: "",
  regrasMemorias: "",
  velocidadeGiro: 0.35,
  girarAutomatico: true,
  brilho: 0.35,
  sinapses: 4,
  intensidadeAxonios: 1,
  densidade: 1,
  opacidadeCerebro: 0.55,
  seguirNotaAberta: true,
  mostrarRotulos: false,
  limiteEsquecidas: 2,
};

/** Converte "chave => valor" (uma regra por linha) em pares. */
export function lerRegras(texto) {
  return String(texto || "")
    .split(/\r?\n/)
    .map((l) => l.split("=>").map((p) => p.trim()))
    .filter((p) => p.length === 2 && p[0] && p[1]);
}
