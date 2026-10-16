const { Plugin } = require("obsidian");
import { CerebroView, VIEW_TYPE } from "./CerebroView.js";
import { PADRAO } from "./configuracoes/padrao.js";
import { AbaDeConfiguracoes } from "./configuracoes/AbaDeConfiguracoes.js";

function adiar(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Ponto de entrada do plugin: registra a view, o comando, o ícone e as configurações. */
export default class Cerebro3DPlugin extends Plugin {
  async onload() {
    const salvo = (await this.loadData()) || {};
    this.settings = Object.assign(structuredClone(PADRAO), salvo, { cores: Object.assign({}, PADRAO.cores, salvo.cores) });
    this.registerView(VIEW_TYPE, (leaf) => new CerebroView(leaf, this));
    this.addRibbonIcon("brain", "Abrir Cérebro 3D", () => this.abrir());
    this.addCommand({ id: "abrir-cerebro-3d", name: "Abrir Cérebro 3D", callback: () => this.abrir() });
    this.addSettingTab(new AbaDeConfiguracoes(this.app, this));
    this.reconstruirViews = adiar(() => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view.reconstruir();
    }, 800);
  }

  /** Salva e remonta a cena (mudanças estruturais: cores, regras, densidade…). */
  async salvar() {
    await this.saveData(this.settings);
    this.reconstruirViews();
  }

  /** Salva sem remontar (ajustes ao vivo: brilho, sinais, giro…). */
  async salvarSemRecarregar() {
    await this.saveData(this.settings);
  }

  async abrir() {
    const existentes = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (existentes.length) return this.app.workspace.revealLeaf(existentes[0]);
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}

export { CerebroView, PADRAO };
