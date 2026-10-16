export const DIA = 86400000;
export const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Meses cobertos pelas notas (do primeiro ao último) e quantas notas nasceram em cada um. */
export class Calendario {
  constructor(nodes) {
    const datas = nodes.map((n) => n.data).filter(Number.isFinite);
    this.inicio = datas.length ? Math.min(...datas) : Date.now();
    this.fim = datas.length ? Math.max(...datas) : Date.now();
    this.meses = [];
    const a = new Date(this.inicio), b = new Date(this.fim);
    for (let d = new Date(a.getFullYear(), a.getMonth(), 1); d <= b; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      this.meses.push({
        ini: d.getTime(),
        fim: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1,
        rotulo: MESES_CURTOS[d.getMonth()],
        nomeLongo: MESES_LONGOS[d.getMonth()],
        ano: d.getFullYear(),
      });
    }
    this.contagem = this.meses.map((m) => nodes.filter((n) => n.data >= m.ini && n.data <= m.fim).length);
  }

  get total() { return this.meses.length; }
  get ultimo() { return this.meses.length - 1; }

  /** Posição contínua (em meses) de um instante: 2.5 = meio do terceiro mês. */
  posicaoDe(instante, dica = 0) {
    let i = Math.max(0, dica);
    while (i < this.ultimo && instante > this.meses[i].fim) i++;
    const m = this.meses[i];
    const frac = Math.min(1, Math.max(0, (instante - m.ini) / (m.fim - m.ini)));
    return { indice: i, posicao: i + frac };
  }

  /** Dias desde o início do calendário (usado pelo shader dos axônios). */
  diasDesdeInicio(instante) { return (instante - this.inicio) / DIA; }
}
