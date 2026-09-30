/* Каскад CSS без браузера — для проверок вёрстки (check_hero_book.js): какое правило побеждает у элемента разметки и какое значение
   у свойства после наследования и var(). Не проверка сама по себе: её зовут проверки.
   — sheets(ui, html): стили прототипа в порядке документа — <style> index.html и <link rel="stylesheet"> на screens/*.css;
   — parseHtml(html): дерево разметки {tag, id, cls, attrs, kids, parent, style}; wrap(chain, html) — цепочка предков вокруг разметки
     (html с классами, body, рамка устройства, #game);
   — new Cascade(rules, env): win(el, prop) — победившее объявление {v, src, sel, spec, imp} или null; value(el, prop) — значение
     с наследованием и подстановкой var(); rulesFor(el, test) — все подходящие правила.
   Условия: @media — по экрану устройства env.w × env.h (наведения нет — сенсор, «меньше движения» — env.reduced), @container — по
   размеру ближайшего предка-контейнера с этим именем (env.containers[имя] = [ширина, высота]; неизвестный — условие ложно),
   @supports — да. Селекторы: тег, #id, .класс, [атрибут] и [атрибут(=|~=|^=|$=|*=||=)"…"], :is, :where, :not, :has, :root,
   :first-child, :last-child, :only-child, :nth-child(an+b), :disabled, :checked; прочие состояния (:hover, :focus…) и ::before,
   ::after — не элемент в покое: такие селекторы мимо. Комбинаторы: потомок, >, +, ~. Специфичность — CSS Selectors 4; !important;
   style="" — выше правил. Сокращения: inset, overflow, flex, gap, padding, margin, font (размер), grid-column. */
'use strict';
const fs = require('fs'), path = require('path');

/* ---------- разбор CSS ---------- */
function splitTop(s, sep) {
  const out = []; let d = 0, q = null, b = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === q && s[i - 1] !== '\\') q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(') d++; else if (c === ')') d--; else if (c === '[') b++; else if (c === ']') b--;
    if (c === sep && !d && !b) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map(x => x.trim()).filter(x => x !== '');
}
function parseDecls(body) {
  const out = [];
  for (const d of splitTop(body, ';')) {
    const i = d.indexOf(':'); if (i < 0) continue;
    const p = d.slice(0, i).trim().toLowerCase(); let v = d.slice(i + 1).trim(), imp = false;
    if (/!\s*important\s*$/i.test(v)) { imp = true; v = v.replace(/!\s*important\s*$/i, '').trim(); }
    out.push({ p: p.startsWith('--') ? d.slice(0, i).trim() : p, v, imp });
  }
  return out;
}
function parseCss(text, src) {
  const s = text.replace(/\/\*[\s\S]*?\*\//g, ''), rules = [];
  let i = 0;
  const skipBlock = () => { let d = 1; for (; i < s.length && d; i++) { if (s[i] === '{') d++; else if (s[i] === '}') d--; } };
  function block(conds) {
    while (i < s.length) {
      while (i < s.length && /\s/.test(s[i])) i++;
      if (i >= s.length) return;
      if (s[i] === '}') { i++; return; }
      let j = i, d = 0, q = null;
      for (; j < s.length; j++) {
        const c = s[j];
        if (q) { if (c === q) q = null; continue; }
        if (c === '"' || c === "'") { q = c; continue; }
        if (c === '(') d++; else if (c === ')') d--; else if (!d && (c === '{' || c === ';')) break;
      }
      const pre = s.slice(i, j).trim();
      if (s[j] === ';' || j >= s.length) { i = j + 1; continue; }
      i = j + 1;
      if (pre.startsWith('@')) {
        const m = pre.match(/^@([\w-]+)\s*([\s\S]*)$/) || [];
        if (['media', 'container', 'supports', 'layer'].includes(m[1])) block(conds.concat([{ kind: m[1], q: (m[2] || '').trim() }]));
        else skipBlock();
      } else {
        let k = i, dq = null, dd = 0;
        for (; k < s.length; k++) {
          const c = s[k];
          if (dq) { if (c === dq) dq = null; continue; }
          if (c === '"' || c === "'") { dq = c; continue; }
          if (c === '(') dd++; else if (c === ')') dd--; else if (c === '}' && !dd) break;
        }
        const body = s.slice(i, k); i = k + 1;
        rules.push({ sel: pre, sels: splitTop(pre, ',').map(parseSel), decls: parseDecls(body), conds, src });
      }
    }
  }
  block([]);
  return rules;
}

/* ---------- разбор селектора ---------- */
function readBalanced(s, i, open, close) { let d = 0, q = null, j = i; for (; j < s.length; j++) { const c = s[j]; if (q) { if (c === q) q = null; continue; } if (c === '"' || c === "'") { q = c; continue; } if (c === open) d++; else if (c === close) { d--; if (!d) return j; } } return j; }
function parseSel(str) {
  const parts = []; let comp = null, comb = null, i = 0;
  const s = str.trim();
  const newComp = () => { comp = { tag: null, id: null, cls: [], attrs: [], ps: [], pe: null }; parts.push({ comp, comb: parts.length ? (comb || ' ') : null }); comb = null; };
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { if (comp) comp = null; i++; continue; }
    if (c === '>' || c === '+' || c === '~') { comb = c; comp = null; i++; continue; }
    if (!comp) newComp();
    if (c === '*') { comp.tag = '*'; i++; continue; }
    if (/[a-zA-Z]/.test(c)) { const m = s.slice(i).match(/^[a-zA-Z][\w-]*/)[0]; comp.tag = m.toLowerCase(); i += m.length; continue; }
    if (c === '#' || c === '.') { const m = s.slice(i + 1).match(/^(?:\\.|[\w-])+/); const n = m ? m[0].replace(/\\(.)/g, '$1') : ''; if (c === '#') comp.id = n; else comp.cls.push(n); i += 1 + (m ? m[0].length : 0); continue; }
    if (c === '[') {
      const j = readBalanced(s, i, '[', ']'), a = s.slice(i + 1, j).trim();
      const m = a.match(/^([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?\s*(i)?$/);
      if (m) comp.attrs.push({ n: m[1].toLowerCase(), op: m[2] || null, v: m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5], ci: !!m[6] });
      else comp.attrs.push({ n: '__bad__', op: null });
      i = j + 1; continue;
    }
    if (c === ':') {
      const dbl = s[i + 1] === ':'; const m = s.slice(i + (dbl ? 2 : 1)).match(/^[\w-]+/); const n = m ? m[0].toLowerCase() : ''; i += (dbl ? 2 : 1) + n.length;
      let arg = null;
      if (s[i] === '(') { const j = readBalanced(s, i, '(', ')'); arg = s.slice(i + 1, j); i = j + 1; }
      if (dbl || ['before', 'after', 'first-line', 'first-letter', 'placeholder', 'marker', 'selection', 'backdrop'].includes(n)) comp.pe = n;
      else comp.ps.push({ n, arg, sub: ['is', 'where', 'not', 'has', 'matches', '-webkit-any'].includes(n) ? splitTop(arg || '', ',').map(parseSel) : null });
      continue;
    }
    i++;   // незнакомое — пропустить
  }
  const sel = { parts, text: str, pe: parts.some(p => p.comp.pe) };
  sel.spec = specOf(sel);
  return sel;
}
function specOf(sel) {
  const sp = [0, 0, 0];
  for (const { comp } of sel.parts) {
    if (comp.id) sp[0]++;
    sp[1] += comp.cls.length + comp.attrs.length;
    if (comp.tag && comp.tag !== '*') sp[2]++;
    if (comp.pe) sp[2]++;
    for (const p of comp.ps) {
      if (p.n === 'where') continue;
      if (p.sub) { const mx = p.sub.map(x => x.spec).reduce((a, b) => (cmp(b, a) > 0 ? b : a), [0, 0, 0]); sp[0] += mx[0]; sp[1] += mx[1]; sp[2] += mx[2]; }
      else sp[1]++;
    }
  }
  return sp;
}
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/* ---------- разбор HTML ---------- */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
function el(tag, attrs, parent) {
  const e = { tag, attrs: attrs || new Map(), kids: [], parent: parent || null };
  e.id = e.attrs.get('id') || null;
  e.cls = new Set(String(e.attrs.get('class') || '').split(/\s+/).filter(Boolean));
  e.style = e.attrs.has('style') ? parseDecls(e.attrs.get('style')) : [];
  if (parent) parent.kids.push(e);
  return e;
}
function parseAttrs(s) {
  const m = new Map(), re = /([^\s=/"'>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g; let x;
  const ent = v => v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  while ((x = re.exec(s))) m.set(x[1].toLowerCase(), ent(x[2] !== undefined ? x[2] : x[3] !== undefined ? x[3] : x[4] !== undefined ? x[4] : ''));
  return m;
}
function parseHtml(html, root) {
  const top = root || el('#root', new Map(), null);
  let cur = top;
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[1]) {
      const t = m[1].toLowerCase(); let a = cur;
      while (a && a !== top && a.tag !== t) a = a.parent;
      if (a && a !== top) cur = a.parent;
      continue;
    }
    const t = m[2].toLowerCase(), e = el(t, parseAttrs(m[3] || ''), cur);
    if (!VOID.has(t) && !m[4]) cur = e;
  }
  return top;
}
/* цепочка предков вокруг разметки: chain — [[тег, {атрибуты}], …] сверху вниз; разметка ложится в последний */
function wrap(chain, html) {
  let p = null, root = null;
  for (const [t, a] of chain) { const e = el(t, new Map(Object.entries(a || {})), p); if (!root) root = e; p = e; }
  parseHtml(html, p);
  return root;
}
function* walk(e) { yield e; for (const k of e.kids) yield* walk(k); }
const prevEl = e => { if (!e.parent) return null; const k = e.parent.kids, i = k.indexOf(e); return i > 0 ? k[i - 1] : null; };

/* ---------- совпадение ---------- */
function nth(arg, i) {
  const a = String(arg || '').replace(/\s+/g, '').toLowerCase();
  if (a === 'odd') return i % 2 === 1; if (a === 'even') return i % 2 === 0;
  const m = a.match(/^([+-]?\d*)n([+-]\d+)?$/);
  if (m) { const A = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : +m[1], B = +(m[2] || 0); return A === 0 ? i === B : (i - B) / A >= 0 && (i - B) % A === 0; }
  return i === +a;
}
function matchCompound(e, c) {
  if (!e || e.tag === '#root') return false;
  if (c.tag && c.tag !== '*' && c.tag !== e.tag) return false;
  if (c.id && c.id !== e.id) return false;
  for (const k of c.cls) if (!e.cls.has(k)) return false;
  for (const a of c.attrs) {
    if (!e.attrs.has(a.n)) return false;
    if (!a.op) continue;
    let v = e.attrs.get(a.n), w = a.v || ''; if (a.ci) { v = v.toLowerCase(); w = w.toLowerCase(); }
    const ok = a.op === '=' ? v === w : a.op === '~=' ? v.split(/\s+/).includes(w) : a.op === '^=' ? v.startsWith(w) : a.op === '$=' ? v.endsWith(w) : a.op === '*=' ? v.includes(w) : a.op === '|=' ? v === w || v.startsWith(w + '-') : false;
    if (!ok) return false;
  }
  for (const p of c.ps) {
    const sibs = e.parent ? e.parent.kids : [e], idx = sibs.indexOf(e) + 1;
    switch (p.n) {
      case 'is': case 'where': case 'matches': case '-webkit-any': if (!p.sub.some(s => !s.pe && matchSel(e, s))) return false; break;
      case 'not': if (p.sub.some(s => matchSel(e, s))) return false; break;
      case 'has': if (!p.sub.some(s => hasRel(e, s))) return false; break;
      case 'root': if (e.tag !== 'html') return false; break;
      case 'first-child': if (idx !== 1) return false; break;
      case 'last-child': if (idx !== sibs.length) return false; break;
      case 'only-child': if (sibs.length !== 1) return false; break;
      case 'nth-child': if (!nth(p.arg, idx)) return false; break;
      case 'nth-last-child': if (!nth(p.arg, sibs.length - idx + 1)) return false; break;
      case 'first-of-type': if (sibs.filter(x => x.tag === e.tag)[0] !== e) return false; break;
      case 'last-of-type': { const t = sibs.filter(x => x.tag === e.tag); if (t[t.length - 1] !== e) return false; break; }
      case 'disabled': if (!e.attrs.has('disabled')) return false; break;
      case 'enabled': if (e.attrs.has('disabled')) return false; break;
      case 'checked': if (!e.attrs.has('checked')) return false; break;
      case 'empty': if (e.kids.length) return false; break;
      default: return false;   // :hover, :focus, :active, :focus-visible … — не в покое
    }
  }
  return true;
}
function matchAt(e, parts, k) {
  if (!matchCompound(e, parts[k].comp)) return false;
  if (k === 0) return true;
  const c = parts[k].comb;
  if (c === '>') return matchAt(e.parent, parts, k - 1);
  if (c === '+') { const p = prevEl(e); return !!p && matchAt(p, parts, k - 1); }
  if (c === '~') { for (let p = prevEl(e); p; p = prevEl(p)) if (matchAt(p, parts, k - 1)) return true; return false; }
  for (let a = e.parent; a; a = a.parent) if (matchAt(a, parts, k - 1)) return true;
  return false;
}
const matchSel = (e, sel) => sel.parts.length > 0 && matchAt(e, sel.parts, sel.parts.length - 1);
/* :has(отн. селектор): ведущий комбинатор — от самого элемента; без него — потомки */
function hasRel(e, sel) {
  const text = sel.text.trim();
  const rel = /^[>+~]/.test(text) ? text[0] : ' ';
  const inner = rel === ' ' ? sel : parseSel(text.slice(1));
  const cand = rel === '>' ? e.kids : rel === '+' ? [e.parent ? e.parent.kids[e.parent.kids.indexOf(e) + 1] : null].filter(Boolean)
    : rel === '~' ? (e.parent ? e.parent.kids.slice(e.parent.kids.indexOf(e) + 1) : []) : [...walk(e)].slice(1);
  return cand.some(x => matchSel(x, inner));
}

/* ---------- условия ---------- */
function mediaOk(q, env) {
  return splitTop(q, ',').some(part => {
    let s = part.trim().toLowerCase(), neg = false;
    if (s.startsWith('not ')) { neg = true; s = s.slice(4); }
    s = s.replace(/^only\s+/, '');
    const ok = s.split(/\s+and\s+/).every(t => {
      t = t.trim();
      if (t === 'screen' || t === 'all') return true;
      if (t === 'print') return false;
      const m = t.match(/^\(\s*([\w-]+)\s*(?::\s*([^)]+))?\)$/); if (!m) return false;
      const f = m[1], v = (m[2] || '').trim(), n = parseFloat(v);
      if (f === 'max-width') return env.w <= n; if (f === 'min-width') return env.w >= n;
      if (f === 'max-height') return env.h <= n; if (f === 'min-height') return env.h >= n;
      if (f === 'orientation') return v === (env.w > env.h ? 'landscape' : 'portrait');
      if (f === 'prefers-reduced-motion') return v === 'reduce' ? !!env.reduced : !env.reduced;
      if (f === 'hover') return v === 'hover' ? !!env.hover : !env.hover;
      if (f === 'pointer' || f === 'any-pointer') return v === (env.hover ? 'fine' : 'coarse');
      return false;
    });
    return neg ? !ok : ok;
  });
}
function containerOk(q, e, C) {
  const m = q.match(/^([\w-]+)?\s*(\([\s\S]*\))$/); if (!m) return false;
  const name = m[1] && !/^(not|and|or)$/.test(m[1]) ? m[1] : null;
  for (let a = e.parent; a; a = a.parent) {
    const type = C.value(a, 'container-type'), names = String(C.value(a, 'container-name') || '').split(/\s+/);
    if (!type || type === 'normal') continue;
    if (name && !names.includes(name)) continue;
    const size = C.env.containers && C.env.containers[name || names[0]];
    if (!size) return false;
    return splitTop(m[2], ',').every(t => t.split(/\s+and\s+/).every(c => {
      const x = c.trim().match(/^\(\s*(max|min)-(width|height)\s*:\s*([\d.]+)px\s*\)$/); if (!x) return false;
      const v = x[2] === 'width' ? size[0] : size[1], n = +x[3];
      return x[1] === 'max' ? v <= n : v >= n;
    }));
  }
  return false;
}

/* ---------- каскад ---------- */
const INHERIT = new Set(['color', 'font', 'font-family', 'font-size', 'font-style', 'font-weight', 'font-variant', 'font-variant-numeric', 'letter-spacing', 'line-height',
  'text-align', 'text-transform', 'text-indent', 'text-shadow', 'white-space', 'visibility', 'cursor', 'direction', 'word-spacing', 'hyphens', 'list-style', 'quotes',
  '-webkit-text-fill-color', 'overflow-wrap', 'word-break']);
const SHORT = {
  top: [['inset', 0]], right: [['inset', 1]], bottom: [['inset', 2]], left: [['inset', 3]],
  'overflow-x': [['overflow', 0]], 'overflow-y': [['overflow', 1]],
  'flex-grow': [['flex', 'g']], 'flex-shrink': [['flex', 's']], 'flex-basis': [['flex', 'b']],
  'row-gap': [['gap', 0]], 'column-gap': [['gap', 1]],
  'padding-top': [['padding', 0]], 'padding-right': [['padding', 1]], 'padding-bottom': [['padding', 2]], 'padding-left': [['padding', 3]],
  'margin-top': [['margin', 0]], 'margin-right': [['margin', 1]], 'margin-bottom': [['margin', 2]], 'margin-left': [['margin', 3]],
  'font-size': [['font', 'size']], 'grid-column-start': [['grid-column', 0]], 'grid-column-end': [['grid-column', 1]],
};
function fromShort(sh, part, v) {
  const t = splitTop(v, ' ').filter(Boolean);
  if (sh === 'inset' || sh === 'padding' || sh === 'margin') { const [a, b = a, c = a, d = b] = t; return [a, b, c, d][part]; }
  if (sh === 'overflow' || sh === 'gap') return t[part] || t[0];
  if (sh === 'grid-column') { const s = splitTop(v, '/'); return (s[part] || (part ? 'auto' : s[0])).trim(); }
  if (sh === 'flex') {
    if (v === 'none') return { g: '0', s: '0', b: 'auto' }[part];
    if (v === 'auto') return { g: '1', s: '1', b: 'auto' }[part];
    const nums = t.filter(x => /^[\d.]+$/.test(x)), basis = t.find(x => !/^[\d.]+$/.test(x));
    return { g: nums[0] || '1', s: nums[1] || '1', b: basis || (nums.length ? '0%' : 'auto') }[part];
  }
  if (sh === 'font') { const m = v.match(/(?:^|\s)((?:[\d.]+(?:px|em|rem|%))|var\([^)]*\))(?:\/\S+)?\s+\S/); return m ? m[1] : null; }
  return null;
}
class Cascade {
  constructor(rules, env) {
    this.rules = rules.map((r, i) => Object.assign({ order: i }, r)); this.env = env || {};
    this.memo = new Map();
  }
  condOk(r, e) { return r.conds.every(c => c.kind === 'media' ? mediaOk(c.q, this.env) : c.kind === 'container' ? containerOk(c.q, e, this) : true); }
  /* объявления свойства (и его сокращений) у элемента — по возрастанию силы */
  decls(e, prop) {
    const names = [[prop, null]].concat(SHORT[prop] || []), out = [];
    for (const r of this.rules) {
      const ds = r.decls.filter(d => names.some(([n]) => n === d.p)); if (!ds.length) continue;
      let best = null; for (const s of r.sels) if (!s.pe && matchSel(e, s) && (!best || cmp(s.spec, best) > 0)) best = s.spec;
      if (!best || !this.condOk(r, e)) continue;
      for (const d of ds) { const nm = names.find(([n]) => n === d.p); const v = nm[1] === null ? d.v : fromShort(d.p, nm[1], d.v); if (v != null) out.push({ v, imp: d.imp, spec: best, order: r.order, src: r.src, sel: r.sel, p: d.p }); }
    }
    for (const d of e.style || []) { const nm = names.find(([n]) => n === d.p); if (nm) { const v = nm[1] === null ? d.v : fromShort(d.p, nm[1], d.v); if (v != null) out.push({ v, imp: d.imp, spec: [9, 9, 9], order: 1e9, src: 'style=""', sel: 'style', p: d.p }); } }
    out.sort((a, b) => (a.imp - b.imp) || cmp(a.spec, b.spec) || (a.order - b.order));
    return out;
  }
  win(e, prop) { const d = this.decls(e, prop); return d.length ? d[d.length - 1] : null; }
  value(e, prop, depth = 0) {
    if (!e || e.tag === '#root') return null;
    const key = prop; let mm = this.memo.get(e); if (!mm) this.memo.set(e, (mm = new Map()));
    if (mm.has(key)) return mm.get(key);
    const w = this.win(e, prop), inh = prop.startsWith('--') || INHERIT.has(prop);
    let v = w ? w.v : null;
    if (v === 'inherit' || (v == null && inh) || (v === 'unset' && inh)) v = this.value(e.parent, prop, depth + 1);
    /* элемент флекса и сетки — блочный (blockification): inline-flex → flex и так далее */
    if (prop === 'display' && v && /^inline/.test(v)) { let pa = e.parent; while (pa && this.value(pa, 'display') === 'contents') pa = pa.parent; const pd = pa ? this.value(pa, 'display') : null; if (pd && /flex|grid/.test(pd)) v = v === 'inline' || v === 'inline-block' ? 'block' : v.replace(/^inline-/, ''); }
    else if (v === 'initial' || v === 'unset') v = null;
    if (v != null && depth < 40) v = this.subst(e, v, depth);
    mm.set(key, v);
    return v;
  }
  subst(e, v, depth) {
    let guard = 0;
    while (/var\(/.test(v) && guard++ < 20) {
      const i = v.indexOf('var('), j = readBalanced(v, i + 3, '(', ')'), args = splitTop(v.slice(i + 4, j), ',');
      const name = args[0].trim(), fb = args.length > 1 ? args.slice(1).join(',').trim() : null;
      let r = this.value(e, name, depth + 1); if (r == null) r = fb;
      if (r == null) return null;
      v = v.slice(0, i) + r + v.slice(j + 1);
    }
    return v;
  }
  rulesFor(e, test) { return this.rules.filter(r => r.sels.some(s => !s.pe && matchSel(e, s)) && this.condOk(r, e) && (!test || test(r))); }
}

/* ---------- стили прототипа ---------- */
function sheets(ui, html) {
  const out = [], re = /<style>([\s\S]*?)<\/style>|<link rel="stylesheet" href="([^"]+)">/g; let m;
  while ((m = re.exec(html))) {
    if (m[1] !== undefined) out.push(...parseCss(m[1], 'index.html'));
    else if (!/^https?:/.test(m[2]) && fs.existsSync(path.join(ui, m[2]))) out.push(...parseCss(fs.readFileSync(path.join(ui, m[2]), 'utf8'), m[2]));
  }
  return out;
}
const q = (root, pred) => [...walk(root)].filter(pred);
const hasCls = (...c) => e => c.every(k => e.cls.has(k));
const within = (e, pred) => { for (let a = e; a; a = a.parent) if (pred(a)) return true; return false; };

module.exports = { parseCss, parseSel, parseHtml, wrap, walk, Cascade, sheets, q, hasCls, within, matchSel, cmp };
