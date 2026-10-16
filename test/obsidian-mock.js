function enh(el) {
  el.empty = () => { el.innerHTML = ""; };
  el.addClass = (c) => el.classList.add(c);
  el.removeClass = (c) => el.classList.remove(c);
  el.hasClass = (c) => el.classList.contains(c);
  el.toggleClass = (c, v) => el.classList.toggle(c, v);
  el.setText = (t) => { el.textContent = t; };
  el.setAttr = (k, v) => el.setAttribute(k, v);
  const mk = (tag, o = {}) => {
    const c = document.createElement(tag);
    if (o.cls) c.className = o.cls;
    if (o.text) c.textContent = o.text;
    if (o.type) c.type = o.type;
    if (o.placeholder) c.placeholder = o.placeholder;
    el.appendChild(c);
    return enh(c);
  };
  el.createDiv = (o) => mk("div", o);
  el.createEl = (t, o) => mk(t, o);
  el.createSpan = (o) => mk("span", o);
  return el;
}
class ItemView { constructor(leaf) { this.leaf = leaf; this.app = leaf.app; this.contentEl = enh(leaf.el); } registerEvent() {} }
class Plugin {}
class PluginSettingTab {}
class Setting {}
class Component { load() {} unload() {} }
class Notice { constructor(m) { console.log("Notice:", m); } }
class Modal {
  constructor() {
    this.fundo = enh(document.createElement("div"));
    this.fundo.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99;display:grid;place-items:center";
    this.modalEl = enh(this.fundo.createDiv({ cls: "modal" }));
    this.modalEl.style.cssText = "background:#1e1e1e;color:#ddd;padding:20px;border-radius:10px;font-family:sans-serif";
    this.titleEl = enh(this.modalEl.createDiv({ cls: "modal-title" }));
    this.titleEl.style.cssText = "font-size:18px;font-weight:600;margin-bottom:10px";
    this.contentEl = enh(this.modalEl.createDiv({ cls: "modal-content" }));
    this.fundo.onclick = (e) => { if (e.target === this.fundo) this.close(); };
  }
  open() { document.body.appendChild(this.fundo); }
  close() { this.fundo.remove(); if (this.onClose) this.onClose(); }
}
const MarkdownRenderer = { render: (app, md, el) => { const p = document.createElement("pre"); p.textContent = md; p.style.whiteSpace = "pre-wrap"; el.appendChild(p); } };
const debounce = (f) => f;
module.exports = { ItemView, Plugin, PluginSettingTab, Setting, Notice, Modal, MarkdownRenderer, Component, debounce, enh };
