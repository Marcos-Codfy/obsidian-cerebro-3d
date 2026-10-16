const fs = require("fs"), path = require("path"), os = require("os");
// Lê o SEU vault (OBSIDIAN_VAULT) e gera test/dados.js para testar no navegador — não vai para o git.
const root = process.env.OBSIDIAN_VAULT;
if (!root) { console.error("Defina OBSIDIAN_VAULT com o caminho do vault"); process.exit(1); }
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".md")) files.push(path.relative(root, p).split(path.sep).join("/"));
  }
})(root);
const byBase = new Map();
for (const f of files) { const b = path.posix.basename(f, ".md"); if (!byBase.has(b)) byBase.set(b, f); }
const resolved = {}, meta = {};
for (const f of files) {
  const full = path.join(root, f);
  const t = fs.readFileSync(full, "utf8");
  const o = {};
  for (const m of t.matchAll(/\[\[([^\]|#\\]+)/g)) {
    const k = m[1].trim();
    const tgt = files.includes(k + ".md") ? k + ".md" : byBase.get(path.posix.basename(k));
    if (tgt) o[tgt] = (o[tgt] || 0) + 1;
  }
  resolved[f] = o;
  const fm = {};
  const bloco = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (bloco) {
    for (const linha of bloco[1].split(/\r?\n/)) {
      const m = linha.match(/^(\w+):\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim().replace(/^"|"$/g, "");
      if (m[1] === "tags" && v.startsWith("[")) v = v.slice(1, -1).split(",").map((x) => x.trim());
      fm[m[1]] = v;
    }
  }
  const st = fs.statSync(full);
  meta[f] = { frontmatter: fm, stat: { ctime: st.birthtimeMs, size: st.size } };
}
const memorias = [];
const raiz = path.join(os.homedir(), ".claude", "projects");
for (const proj of fs.readdirSync(raiz)) {
  const dir = path.join(raiz, proj, "memory");
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".md") || f === "MEMORY.md") continue;
    const cheio = path.join(dir, f);
    const txt = fs.readFileSync(cheio, "utf8").slice(0, 1500);
    const nome = (txt.match(/^name:\s*(.+)$/m) || [])[1] || f;
    const st = fs.statSync(cheio);
    memorias.push({ projeto: proj, arquivo: cheio, nome: nome.trim(), desc: "(descrição omitida no teste)", tipo: "", mtime: st.mtimeMs, size: st.size });
  }
}
const configLocal = path.join(__dirname, "config.local.json"); // suas regras pessoais (fora do git)
const config = fs.existsSync(configLocal) ? fs.readFileSync(configLocal, "utf8") : "{}";
fs.writeFileSync(process.argv[2], "window.__DADOS=" + JSON.stringify({ files, resolved, meta }) + ";window.__MEMORIAS=" + JSON.stringify(memorias) + ";window.__CONFIG=" + config + ";");
console.log(files.length, "files", memorias.length, "memorias");
