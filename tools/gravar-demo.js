// Grava a demonstração com o vault FICTÍCIO (test/dados-demo.js), quadro a quadro, com relógio controlado:
// o resultado sai fluido mesmo que a máquina renderize devagar.
// Uso: npm run demo && node tools/gravar-demo.js   (precisa do ffmpeg: pip install imageio-ffmpeg)
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const MIDIA = path.join(RAIZ, "docs", "midia");
const BRUTO = path.join(MIDIA, "bruto");
const FPS = 20;
const LARGURA = 1280, ALTURA = 720;

const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
function servir() {
  const servidor = http.createServer((req, res) => {
    const arquivo = path.join(RAIZ, decodeURIComponent(req.url.split("?")[0]));
    if (!arquivo.startsWith(RAIZ) || !fs.existsSync(arquivo)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(arquivo)] || "application/octet-stream" });
    fs.createReadStream(arquivo).pipe(res);
  });
  return new Promise((ok) => servidor.listen(0, () => ok(servidor)));
}

function ffmpeg() {
  return execFileSync("python", ["-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim();
}

class Gravador {
  constructor(pagina, nome, { limpar = true } = {}) {
    this.pagina = pagina;
    this.pasta = path.join(BRUTO, nome);
    if (limpar) {
      fs.rmSync(this.pasta, { recursive: true, force: true });
      fs.mkdirSync(this.pasta, { recursive: true });
    }
    this.n = limpar ? 0 : fs.readdirSync(this.pasta).length;
  }
  async quadros(segundos) {
    for (let i = 0, total = Math.round(segundos * FPS); i < total; i++) {
      await this.pagina.clock.runFor(1000 / FPS);
      await this.pagina.screenshot({ path: path.join(this.pasta, `${String(this.n++).padStart(5, "0")}.png`) });
    }
  }
  async ate(condicao, maxSegundos, sobra = 0) {
    for (let s = 0; s < maxSegundos * FPS && (await this.pagina.evaluate(condicao)); s++) await this.quadros(1 / FPS);
    if (sobra) await this.quadros(sobra);
  }
  /** Gera MP4 (alta qualidade) e GIF (otimizado com paleta) a partir dos quadros. */
  exportar(nome, { larguraGif = 760, fpsGif = 12, cores = 128 } = {}) {
    const ff = ffmpeg();
    const entrada = path.join(this.pasta, "%05d.png");
    const mp4 = path.join(MIDIA, `${nome}.mp4`), gif = path.join(MIDIA, `${nome}.gif`);
    // as partículas são "ruído" para o compressor: crf mais alto e preset lento mantêm o vídeo leve
    execFileSync(ff, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", entrada, "-c:v", "libx264", "-preset", "slow", "-pix_fmt", "yuv420p", "-crf", "27", "-movflags", "+faststart", mp4]);
    const filtro = `fps=${fpsGif},scale=${larguraGif}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${cores}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`;
    execFileSync(ff, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", entrada, "-filter_complex", filtro, gif]);
    const mb = (f) => (fs.statSync(f).size / 1048576).toFixed(1) + " MB";
    console.log(`${nome}: ${this.n} quadros · mp4 ${mb(mp4)} · gif ${mb(gif)}`);
  }
}

async function main() {
  fs.mkdirSync(MIDIA, { recursive: true });
  if (process.argv.includes("--so-exportar")) {
    // reaproveita os quadros já gravados em docs/midia/bruto
    new Gravador(null, "linha-do-tempo", { limpar: false }).exportar("linha-do-tempo", { larguraGif: 680, fpsGif: 10, cores: 96 });
    new Gravador(null, "interacao", { limpar: false }).exportar("interacao", { larguraGif: 680, fpsGif: 10, cores: 112 });
    return;
  }
  const servidor = await servir();
  const url = `http://localhost:${servidor.address().port}/test/index.html?demo`;
  // usa o Chrome instalado (GPU de verdade); sem ele, cai no Chromium do Playwright
  const navegador = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11"] })
    .catch(() => chromium.launch({ args: ["--ignore-gpu-blocklist"] }));
  const pagina = await navegador.newPage({ viewport: { width: LARGURA, height: ALTURA }, deviceScaleFactor: 1 });
  // relógio congelado: só avança quando pedimos (cada quadro = 1/FPS s), mesmo que a captura demore
  const inicio = new Date("2026-10-15T12:00:00");
  await pagina.clock.install({ time: inicio });
  await pagina.clock.pauseAt(new Date(inicio.getTime() + 1000));
  await pagina.goto(url);
  await pagina.clock.runFor(4000); // monta o cérebro e some a tela de carregamento
  const foto = (nome) => pagina.screenshot({ path: path.join(MIDIA, `${nome}.png`) });
  const js = (codigo) => pagina.evaluate(codigo);

  // 1) visão geral girando
  await pagina.clock.runFor(1500);
  await foto("visao-geral");

  // 2) linha do tempo em play (o destaque da demonstração)
  const play = new Gravador(pagina, "linha-do-tempo");
  await play.quadros(1.2);
  await js("view.reprodutor.velocidade = 2; view.linhaDoTempo.vel.textContent = '2×'; view.reprodutor.tocar()");
  await play.quadros(4.5);
  await foto("linha-do-tempo-play");
  await play.ate("view.reprodutor.ativo", 30, 2.5);
  play.exportar("linha-do-tempo", { larguraGif: 680, fpsGif: 10, cores: 96 });

  // 3) interação: selecionar, ver conexões, traçar caminho, focar uma área
  const inter = new Gravador(pagina, "interacao");
  await js("view.cena.centralizar(0)");
  await inter.quadros(1);
  await js("view.selecionar(view.grafo.porNome.get('Projeto - App de Finanças'), true)");
  await inter.quadros(2.6);
  await foto("cartao-de-detalhes");
  await js("view.limparDestaques(); view.cena.centralizar(900)");
  await inter.quadros(1.2);
  await js("view.popovers.abrir('caminho'); view.tracarCaminho(view.grafo.porNome.get('Estudos - Ondas Cerebrais'), view.grafo.porNome.get('Projeto - Cérebro 3D'))");
  await inter.quadros(2.8);
  await foto("caminho-entre-notas");
  await js("view.popovers.fecharTodos(); view.focarArea('estudos')");
  await inter.quadros(2.6);
  await js("view.focarArea('estudos'); view.popovers.abrir('ajustes'); view.cena.centralizar(900)");
  await inter.quadros(1.6);
  await foto("ajustes-rapidos");
  await js("view.popovers.fecharTodos()");
  await inter.quadros(1);
  inter.exportar("interacao", { larguraGif: 680, fpsGif: 10, cores: 112 });

  await navegador.close();
  servidor.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
