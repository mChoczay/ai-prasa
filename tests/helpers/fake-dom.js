// A tiny DOM stand-in for the rating controller tests: class and tag selectors only, enough for
// site/js/feedback.js. No dependencies.

export class El {
  constructor(tag, { cls = '', attrs = {}, dataset = {} } = {}) {
    this.tagName = tag.toUpperCase();
    this.classes = new Set(cls.split(' ').filter(Boolean));
    this.attrs = { ...attrs };
    this.dataset = { ...dataset };
    this.children = [];
    this.parent = null;
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.textContent = '';
    this.listeners = {};
    this.classList = {
      add: (c) => this.classes.add(c),
      remove: (c) => this.classes.delete(c),
      toggle: (c, on) => (on === undefined ? (this.classes.has(c) ? this.classes.delete(c) : this.classes.add(c)) : on ? this.classes.add(c) : this.classes.delete(c)),
      contains: (c) => this.classes.has(c),
    };
  }
  append(...kids) {
    for (const k of kids) {
      k.parent = this;
      this.children.push(k);
    }
    return this;
  }
  matches(sel) {
    return sel.split(',').some((s) => {
      s = s.trim();
      return s.startsWith('.') ? this.classes.has(s.slice(1)) : this.tagName === s.toUpperCase();
    });
  }
  closest(sel) {
    for (let el = this; el; el = el.parent) if (el.matches(sel)) return el;
    return null;
  }
  querySelectorAll(sel) {
    const out = [];
    const walk = (el) => el.children.forEach((c) => { if (c.matches(sel)) out.push(c); walk(c); });
    walk(this);
    return out;
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  getAttribute(n) {
    return n in this.attrs ? this.attrs[n] : null;
  }
  setAttribute(n, v) {
    this.attrs[n] = String(v);
  }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }
  focus() {}
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  removeEventListener(type, fn) {
    this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn);
  }
  dispatch(type, target = this) {
    for (const fn of this.listeners[type] || []) fn({ type, target });
  }
}

// One rating block shaped like feedbackBlock(n, '').
export function fakeBlock(n) {
  const rates = ['more', 'ok', 'less'].map((r) => new El('button', { cls: 'fb-rate', attrs: { 'aria-pressed': 'false' }, dataset: { rate: r } }));
  const textarea = new El('textarea');
  const save = new El('button', { cls: 'fb-save' });
  const block = new El('div', { cls: 'feedback', dataset: { n: String(n) } }).append(
    new El('p', { cls: 'fb-row' }).append(...rates),
    new El('button', { cls: 'fb-note-toggle' }),
    new El('div', { cls: 'fb-note' }).append(textarea, save),
    new El('p', { cls: 'fb-msg' }),
  );
  block.querySelector('.fb-note').hidden = true;
  block.querySelector('.fb-note-toggle').textContent = 'dodaj uwagę';
  return { block, rates, textarea, save };
}

export function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
