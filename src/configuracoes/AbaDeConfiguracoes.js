const { PluginSettingTab, Setting } = require("obsidian");
import { AREAS, PADRAO } from "./padrao.js";

/** Tela de configurações do plugin (Configurações → Cérebro 3D). */
export class AbaDeConfiguracoes extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const el = this.containerEl;
    el.empty();
    el.createEl("h2", { text: "🧠 Cérebro 3D" });
    this.secaoAparencia(el);
    this.secaoMovimento(el);
    this.secaoClassificacao(el);
    this.secaoMemorias(el);
    new Setting(el).addButton((b) => b.setButtonText("Restaurar padrão").setWarning().onClick(async () => {
      this.plugin.settings = structuredClone(PADRAO);
      await this.plugin.salvar();
      this.display();
    }));
  }

  get s() { return this.plugin.settings; }
  salvar() { return this.plugin.salvar(); }

  alternar(el, nome, descricao, chave) {
    new Setting(el).setName(nome).setDesc(descricao)
      .addToggle((t) => t.setValue(!!this.s[chave]).onChange((v) => { this.s[chave] = v; this.salvar(); }));
  }

  deslizar(el, nome, descricao, chave, min, max, passo) {
    new Setting(el).setName(nome).setDesc(descricao).addSlider((sl) =>
      sl.setLimits(min, max, passo).setValue(this.s[chave]).setDynamicTooltip().onChange((v) => { this.s[chave] = v; this.salvar(); }));
  }

  texto(el, nome, descricao, chave, placeholder = "") {
    new Setting(el).setName(nome).setDesc(descricao)
      .addText((t) => t.setPlaceholder(placeholder).setValue(this.s[chave] || "").onChange((v) => { this.s[chave] = v.trim(); this.salvar(); }));
  }

  regras(el, nome, descricao, chave, placeholder) {
    new Setting(el).setName(nome).setDesc(descricao).addTextArea((t) => {
      t.setPlaceholder(placeholder).setValue(this.s[chave] || "").onChange((v) => { this.s[chave] = v; this.salvar(); });
      t.inputEl.rows = 8;
      t.inputEl.style.width = "100%";
    });
  }

  secaoAparencia(el) {
    el.createEl("h3", { text: "Aparência" });
    for (const [id, area] of Object.entries(AREAS)) {
      new Setting(el).setName(`${area.nome}`).setDesc(area.regiao).addColorPicker((c) =>
        c.setValue(this.s.cores[id]).onChange((v) => { this.s.cores[id] = v; this.salvar(); }));
    }
    new Setting(el).setName("Cor do cérebro (partículas)").addColorPicker((c) =>
      c.setValue(this.s.corCerebro).onChange((v) => { this.s.corCerebro = v; this.salvar(); }));
    this.alternar(el, "Tingir regiões do cérebro", "Cada lobo ganha um leve toque da cor da sua área", "tingirRegioes");
    this.alternar(el, "Nomes dos hubs sempre visíveis", "Os outros nomes aparecem ao passar o mouse ou selecionar", "mostrarRotulos");
  }

  secaoMovimento(el) {
    el.createEl("h3", { text: "Movimento e brilho" });
    this.alternar(el, "Girar automaticamente", "Pausa quando você mexe na câmera e volta sozinho depois", "girarAutomatico");
    this.deslizar(el, "Velocidade da rotação", "0 = parado", "velocidadeGiro", 0, 2, 0.05);
    this.deslizar(el, "Brilho (bloom)", "Intensidade do brilho neon", "brilho", 0, 1.5, 0.05);
    this.deslizar(el, "Sinais nos axônios", "Quantos sinais de luz correm pelas conexões (0 = nenhum)", "sinapses", 0, 12, 1);
    this.deslizar(el, "Densidade do cérebro", "Quantidade de partículas da superfície", "densidade", 0.3, 2, 0.1);
    this.deslizar(el, "Opacidade do cérebro", "Mais baixo = neurônios aparecem mais", "opacidadeCerebro", 0.05, 1, 0.01);
    this.deslizar(el, "Limite de 'áreas esquecidas'", "Notas com até N ligações", "limiteEsquecidas", 0, 6, 1);
    this.alternar(el, "Seguir a nota aberta", "A câmera vai até a nota que você abrir no editor", "seguirNotaAberta");
  }

  secaoClassificacao(el) {
    el.createEl("h3", { text: "Qual nota vai para qual área" });
    const areas = Object.keys(AREAS).join(", ");
    this.regras(el, "Por tag (prioridade)", `Uma regra por linha: tag => área. Áreas: ${areas}`, "regrasTags", "projeto => projetos");
    this.texto(el, "Prefixos de hub", "Notas cujo nome começa com estes prefixos viram hubs (separe por vírgula)", "prefixosHub", "🏠, 🗂️");
    this.regras(el, "Por pasta", "Uma regra por linha: início do caminho => área", "regrasPastas", "Projetos/ => projetos\nEstudos/ => estudos");
    this.texto(el, "Pasta de foco", "Opcional: habilita o botão que mostra só esta pasta", "pastaFoco", "Minha pasta/");
  }

  secaoMemorias(el) {
    el.createEl("h3", { text: "Memórias do Claude Code" });
    this.alternar(el, "Mostrar memórias do Claude", "Lê ~/.claude/projects/*/memory e coloca cada memória no hipocampo", "mostrarMemorias");
    this.texto(el, "Pasta dos projetos do Claude", "Vazio = ~/.claude/projects", "pastaMemorias");
    this.regras(el, "Memória → nota do projeto", "Uma regra por linha: trecho do nome da pasta => nome da nota", "regrasMemorias", "meu-app => Projeto - Meu App");
  }
}
