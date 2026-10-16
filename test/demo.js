// Gera um vault FICTÍCIO para demonstração/gravação (nenhum dado real).
// Uso: node test/demo.js  → test/dados-demo.js
const fs = require("fs");
const path = require("path");

let semente = 20261015;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);
const escolher = (lista, n) => [...lista].sort(() => rnd() - 0.5).slice(0, n);
const data = (mesMin, mesMax) => {
  const mes = mesMin + Math.floor(rnd() * (mesMax - mesMin + 1));
  const dia = 1 + Math.floor(rnd() * 27);
  return `2026-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
};

const notas = [];
const nota = (pasta, nome, tags, extra = {}) => {
  const n = { path: `${pasta}/${nome}.md`, nome, tags, links: new Set(), ...extra };
  notas.push(n);
  return n;
};
const ligar = (a, b) => { if (a && b && a !== b) a.links.add(b.path); };

const hubs = ["🏠 Início", "🗂️ Índice de Projetos", "🧰 Índice de Ferramentas", "📅 Linha do Tempo", "🔗 Conexões e Padrões"]
  .map((n) => nota("Mapa", n, ["hub"], { inicio: "2026-03-02" }));

const ferramentas = ["Flutter", "Dart", "Firebase", "Git e GitHub", "VS Code", "Node.js", "Python", "Docker", "Figma", "Obsidian",
  "three.js", "Next.js", "Supabase", "Vercel", "Cloudflare", "Postman", "Android Studio", "n8n", "Tailwind", "PostgreSQL"]
  .map((n) => nota("Ferramentas", `Ferramenta - ${n}`, ["ferramenta"], { inicio: data(3, 9) }));

const estudos = ["Algoritmos", "Estruturas de Dados", "Clean Architecture", "SOLID", "Design Patterns", "Testes Automatizados",
  "Banco de Dados", "Redes", "Sistemas Operacionais", "IHC", "UX Writing", "Gamificação", "Cálculo", "Matemática Discreta",
  "Estatística", "Engenharia de Requisitos", "Scrum", "Git Avançado", "Segurança Web", "Acessibilidade", "Cloud Computing",
  "Inglês Técnico", "Pesquisa Científica", "Ondas Cerebrais", "Arquitetura de Software"]
  .map((n) => nota("Estudos", `Estudos - ${n}`, ["estudo"], { inicio: data(3, 8) }));

const status = ["ativo", "ativo", "entregue", "entregue", "entregue", "pausado"];
const projetos = ["App de Finanças", "Agenda Acadêmica", "Portfólio Web", "Bot do Telegram", "Jogo 2D", "Dashboard de Vendas",
  "API de Pagamentos", "Landing Page de Evento", "Sistema de Reservas", "Pesquisa de Clima", "Design System", "App de Hábitos",
  "Quiz Educativo", "Loja Virtual", "Chat em Tempo Real", "Leitor de RSS", "Controle de Estoque", "Mapa Interativo",
  "Automação de Posts", "Planner Semanal", "Visualizador 3D", "Biblioteca Pessoal", "Pomodoro", "Quadro Kanban", "Cérebro 3D"]
  .map((n, i) => nota("Projetos", `Projeto - ${n}`, ["projeto"], { inicio: data(3 + Math.floor(i / 4), Math.min(10, 4 + Math.floor(i / 3))), status: status[i % status.length] }));

const claude = ["Claude - Configuração", "Claude - Prompts úteis", "Claude - Memórias", "Claude - Skills", "IA - Comparação de modelos",
  "Claude - Fluxo de trabalho", "Claude - Conectores MCP", "Claude - Revisão de código", "IA - Ética e privacidade", "Claude - Agentes"]
  .map((n) => nota("IA", n, ["claude"], { inicio: data(5, 10) }));

const perfil = ["Perfil - Quem sou eu", "Perfil - Carreira", "Perfil - Metas 2026", "Perfil - Faculdade", "Perfil - Eventos", "Perfil - Ambiente de trabalho"]
  .map((n) => nota("Perfil", n, ["perfil"], { inicio: data(3, 6) }));

const outros = ["Ideias soltas", "Rascunho", "Lista de leitura", "Receitas", "Viagens", "Filmes", "Diário", "Links úteis", "Citações", "Música"]
  .map((n) => nota("Diversos", n, [], { inicio: data(3, 10) }));

// ligações plausíveis
for (const p of projetos) {
  escolher(ferramentas, 3 + Math.floor(rnd() * 4)).forEach((f) => ligar(p, f));
  escolher(estudos, 1 + Math.floor(rnd() * 3)).forEach((e) => ligar(p, e));
  if (rnd() < 0.5) ligar(p, escolher(projetos, 1)[0]);
  if (rnd() < 0.4) ligar(p, escolher(claude, 1)[0]);
  ligar(hubs[1], p);
}
for (const e of estudos) { escolher(estudos, 2).forEach((x) => ligar(e, x)); ligar(hubs[0], e); }
for (const f of ferramentas) { ligar(hubs[2], f); if (rnd() < 0.5) ligar(f, escolher(ferramentas, 1)[0]); }
for (const c of claude) { escolher(projetos, 2 + Math.floor(rnd() * 3)).forEach((p) => ligar(c, p)); ligar(hubs[0], c); }
for (const p of perfil) { escolher(projetos, 2).forEach((x) => ligar(p, x)); ligar(hubs[0], p); }
for (const o of outros) if (rnd() < 0.5) ligar(o, escolher(estudos, 1)[0]);
hubs.forEach((h) => hubs.forEach((x) => ligar(h, x)));
ligar(hubs[3], projetos[0]); ligar(hubs[4], estudos[2]);

const files = notas.map((n) => n.path);
const resolved = {}, meta = {};
for (const n of notas) {
  resolved[n.path] = Object.fromEntries([...n.links].map((p) => [p, 1]));
  const [a, m, d] = n.inicio.split("-").map(Number);
  meta[n.path] = {
    frontmatter: { tags: n.tags, inicio: n.inicio, ...(n.status ? { status: n.status } : {}) },
    stat: { ctime: new Date(a, m - 1, d).getTime(), size: 1500 + Math.floor(rnd() * 9000) },
  };
}

// memórias fictícias do Claude, por projeto
const tipos = ["feedback", "projeto", "referencia", "usuario"];
const memorias = [];
for (const p of escolher(projetos, 12)) {
  const slug = p.nome.replace("Projeto - ", "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
  for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) {
    const tipo = tipos[Math.floor(rnd() * tipos.length)];
    const [a, m, d] = data(6, 10).split("-").map(Number);
    memorias.push({
      projeto: `C--dev-${slug}`, arquivo: `~/.claude/projects/C--dev-${slug}/memory/${tipo}-${k}.md`,
      nome: `${tipo}-${slug}-${k + 1}`, desc: `Memória fictícia (${tipo}) do projeto ${p.nome.replace("Projeto - ", "")}.`,
      tipo, mtime: new Date(a, m - 1, d).getTime(), size: 900,
    });
  }
}

const config = {
  regrasPastas: "Mapa/ => hub",
  prefixosHub: "🏠, 🗂️, 🧰",
  regrasMemorias: projetos.map((p) => `${p.nome.replace("Projeto - ", "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-")} => ${p.nome}`).join("\n"),
};

const saida = path.join(__dirname, "dados-demo.js");
fs.writeFileSync(saida,
  "window.__DADOS=" + JSON.stringify({ files, resolved, meta }) +
  ";window.__MEMORIAS=" + JSON.stringify(memorias) +
  ";window.__CONFIG=" + JSON.stringify(config) + ";");
console.log(`${files.length} notas fictícias, ${memorias.length} memórias → ${saida}`);
