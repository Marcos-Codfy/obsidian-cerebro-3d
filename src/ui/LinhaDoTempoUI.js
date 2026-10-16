import { h } from "./dom.js";
import { icone } from "./icones.js";

/**
 * Barra da linha do tempo: play, velocidade, histograma de notas por mês, cursor e rótulos.
 * Histograma, cursor e rótulos usam a MESMA escala: o mês i ocupa a faixa [i, i+1] da largura.
 * callbacks: aoTocar(), aoVelocidade() → número, aoEscolherMes(i), aoMostrarTudo()
 */
export class LinhaDoTempoUI {
  constructor(pai, acoes) {
    this.acoes = acoes;
    this.el = h("div", "c3d-tempo c3d-vidro c3d-hud", pai);
    this.play = h("button", "c3d-play", this.el);
    icone(this.play, "play", 14);
    this.play.onclick = () => acoes.aoTocar();
    this.vel = h("button", "c3d-vel", this.el, "1×");
    this.vel.title = "Velocidade da reprodução";
    this.vel.onclick = () => { this.vel.textContent = acoes.aoVelocidade() + "×"; };

    const trilho = h("div", "c3d-trilho", this.el);
    this.histo = h("canvas", "c3d-histo", trilho);
    const cursor = h("div", "c3d-cursor", trilho);
    this.preenchimento = h("div", "c3d-cursor-preench", cursor);
    this.polegar = h("div", "c3d-cursor-polegar", cursor);
    // range invisível por cima: só para arrastar/teclado (o desenho é o cursor acima)
    this.range = h("input", "c3d-range-invisivel", cursor);
    Object.assign(this.range, { type: "range", step: "any", min: 0 });
    this.range.setAttribute("aria-label", "Linha do tempo");
    this.range.addEventListener("input", () => this.aoArrastar(+this.range.value));
    this.rotulos = h("div", "c3d-meses", trilho);
    this.dica = h("div", "c3d-dica-mes", trilho);
    this.histo.addEventListener("mousemove", (e) => this.mostrarDica(e));
    this.histo.addEventListener("mouseleave", () => this.dica.classList.remove("visivel"));
    this.histo.addEventListener("click", (e) => acoes.aoEscolherMes(this.mesNoPonto(e)));

    this.resumo = h("button", "c3d-mes", this.el);
    this.resumo.title = "Mostrar tudo";
    this.resumo.onclick = () => acoes.aoMostrarTudo();
    this.tocando = false;
    this.posicao = null;
  }

  configurar(calendario) {
    this.calendario = calendario;
    this.range.max = String(calendario.total);
    this.rotulos.innerHTML = "";
    const passo = Math.ceil(calendario.total / 12);
    calendario.meses.forEach((m, i) => h("span", null, this.rotulos, i % passo === 0 || i === calendario.ultimo ? m.rotulo : ""));
  }

  aoArrastar(valor) {
    const n = this.calendario.total;
    if (valor >= n - 0.15) this.acoes.aoMostrarTudo();
    else this.acoes.aoEscolherMes(Math.min(n - 1, Math.max(0, Math.floor(valor))));
  }

  marcarTocando(sim) {
    this.tocando = sim;
    icone(this.play, sim ? "pause" : "play", 14);
    this.desenhar();
  }

  /** Mês escolhido na mão: cursor embaixo do rótulo, histograma aceso até o fim do mês. */
  mostrarEscolha(indice, tudo) {
    const n = this.calendario.total;
    this.posicao = tudo ? n : indice + 1;
    this.moverCursor(tudo ? 1 : (indice + 0.5) / n);
    this.desenhar();
  }

  /** Posição contínua (play): cursor e playhead no mesmo ponto. */
  mostrarPosicao(posicao) {
    this.posicao = posicao;
    this.moverCursor(posicao / this.calendario.total);
    this.desenhar();
  }

  mostrarMes(indice, tudo, quantidade) {
    const m = this.calendario.meses[indice];
    this.resumo.innerHTML = "";
    const coluna = h("span", "c3d-mes-col", this.resumo);
    h("span", "c3d-mes-nome", coluna, tudo ? "Tudo" : `${m.rotulo}/${m.ano}`);
    this.quantidade = h("span", "c3d-mes-sub", coluna, quantidade != null ? `${quantidade} neurônios` : "");
    [...this.rotulos.children].forEach((s, k) => s.classList.toggle("atual", k === indice));
  }

  mostrarQuantidade(n) { if (this.quantidade) this.quantidade.textContent = `${n} neurônios`; }

  moverCursor(fracao) {
    const f = Math.max(0, Math.min(1, fracao));
    this.polegar.style.left = f * 100 + "%";
    this.preenchimento.style.width = f * 100 + "%";
    this.range.value = String(f * this.calendario.total);
  }

  mesNoPonto(e) {
    const r = this.histo.getBoundingClientRect();
    return Math.max(0, Math.min(this.calendario.ultimo, Math.floor(((e.clientX - r.left) / r.width) * this.calendario.total)));
  }

  mostrarDica(e) {
    const i = this.mesNoPonto(e);
    const m = this.calendario.meses[i];
    this.dica.textContent = `${m.rotulo}/${m.ano} · ${this.calendario.contagem[i]} novos`;
    this.dica.style.left = ((i + 0.5) / this.calendario.total) * this.histo.getBoundingClientRect().width + "px";
    this.dica.classList.add("visivel");
  }

  desenhar() {
    const cv = this.histo, cal = this.calendario;
    if (!cal) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, alt = cv.clientHeight;
    if (!w || !alt) return;
    cv.width = w * dpr;
    cv.height = alt * dpr;
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    const max = Math.max(1, ...cal.contagem), n = cal.total, largura = w / n;
    const cabeca = Math.min(w, (this.posicao ?? n) * largura);
    const barras = (acesas) => cal.contagem.forEach((c, i) => {
      const a = Math.max(2, Math.sqrt(c / max) * (alt - 3));
      const bw = Math.min(14, largura * 0.34);
      const x = i * largura + (largura - bw) / 2, y = alt - a;
      const g = ctx.createLinearGradient(0, y, 0, alt);
      if (acesas) { g.addColorStop(0, "rgba(196,212,255,0.95)"); g.addColorStop(1, "rgba(142,170,255,0.18)"); }
      else { g.addColorStop(0, "rgba(142,170,255,0.2)"); g.addColorStop(1, "rgba(142,170,255,0.04)"); }
      ctx.fillStyle = g;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, bw, a, [bw / 2, bw / 2, 1, 1]); else ctx.rect(x, y, bw, a);
      ctx.fill();
    });
    barras(false);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cabeca, alt);
    ctx.clip();
    barras(true);
    ctx.restore();
    if (this.tocando) {
      const g = ctx.createLinearGradient(cabeca - 18, 0, cabeca, 0);
      g.addColorStop(0, "rgba(170,195,255,0)");
      g.addColorStop(1, "rgba(170,195,255,0.35)");
      ctx.fillStyle = g;
      ctx.fillRect(cabeca - 18, 0, 18, alt);
      ctx.fillStyle = "rgba(225,234,255,0.95)";
      ctx.fillRect(cabeca - 1, 0, 2, alt);
    }
  }
}
