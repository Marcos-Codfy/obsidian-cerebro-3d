// Copia o plugin compilado para a pasta de plugins de um vault do Obsidian.
// Uso: npm run instalar -- "C:/caminho/do/vault"   (ou defina OBSIDIAN_VAULT)
const fs = require("fs");
const path = require("path");

const vault = process.argv[2] || process.env.OBSIDIAN_VAULT;
if (!vault) {
  console.error('Informe o vault: npm run instalar -- "C:/caminho/do/vault" (ou a variável OBSIDIAN_VAULT)');
  process.exit(1);
}
const raiz = path.join(__dirname, "..");
const destino = path.join(vault, ".obsidian", "plugins", "cerebro-3d");
fs.mkdirSync(destino, { recursive: true });
for (const arquivo of ["main.js", "manifest.json", "styles.css"]) {
  fs.copyFileSync(path.join(raiz, arquivo), path.join(destino, arquivo));
}
console.log("Cérebro 3D instalado em", destino);
