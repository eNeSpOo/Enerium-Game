/* Автопроверка окна «Ремесло → Перековка» (design/ui/screens/reforge.js и reforge.css) — без браузера.
   Слова автора 29.09.2026: «игрок должен сам выбирать, какие 10 талисманов, рабочих и снаряжение он перекует в редкость выше
   со случайным ролом».
   1. Файлы: index.html подключает reforge.css и reforge.js — после экранов талисманов, снаряжения и ритуалов; концы строк своих
      файлов — CRLF; reforge.js компилируется; все классы rf-* описаны в reforge.css; ключевые кадры двигают только transform
      и opacity, «меньше движения» анимацию выключает; клетка сетки — не меньше 44 px, кнопки подсказок — не ниже 36 px.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Окно: вкладка «Перековка» в шапке «Ремесла» — после Лавки и Рынка, шапка с кошельком влезает в 932 и 844 px. Вёрстка окна —
      расчёт по стилям на 932 × 430, 844 × 390 и телефоне 740 × 360: три колонки по ширине, в сетке не меньше пяти клеток в ряд
      и двух рядов, шапка сетки в ширину, лестница и наковальня по высоте. Три режима × шесть ступеней рисуются без исключений,
      undefined, NaN и [object, без второго style или class в теге; клеток — столько, сколько предметов редкости, свободных
      и надетых; на орбите — N мест; пока ничего не отмечено — «0 / N» и «Перековать» выключена; в режиме «Игрок» — ни одного
      служебного слова; закрытые режимы объясняют условие. Карта экранов: reforge готов, описание называет окно.
   4. Выбор — у игрока: нажатие отмечает и снимает, сверх N не отмечается; надетое и занятое в ритуале не отмечается и объясняет
      почему; подсказки только дополняют до N и не трогают отмеченное; «×» снимает всё; другая ступень снимает отметки; надели
      отмеченное — отметка ушла сама; на орбите наковальни — отмеченное; у снаряжения цикл итога и цена — по отмеченному.
   5. «Сервер»: перековка каждого режима — операция с номером: уходит список отмеченного, расход — ровно он, итог на ступень выше,
      повтор номера ничего не меняет, отказ номер не тратит; талисман — генератор на сиде операции по весам пула, снаряжение —
      EnEquip.mint на сиде операции, цикл — самый ранний из отмеченных; рабочие — три одной редкости в одного выше. Отказы: не N,
      чужое и повтор экземпляра, надетое и занятое, другая редкость, вневременные, нет золота, закрыто. Цена — золото по циклу:
      талисманы и рабочие — база × множитель цикла аккаунта, снаряжение — × цикл итога; в цикле II цена талисманов — ровно данные.
      Прежние входы TL_SRV.forge и EQ_SRV.forge ведут в тот же «сервер».
   6. Перековка ушла из листов героя: у листа талисманов нет вкладки «Перековка», листов eqforge и zptalforge нет; из «Запасов»
      и из листа «Артель» — переходы в окно.
   7. Показ итога: итог выдан до анимации, на орбите — отмеченное, моменты — целые мс, нажатие — сразу итог, «меньше движения» —
      без анимации; у рабочих — предупреждение, если артели не хватит на бригаду.
   8. Раздел UI-кита в KIT_EXTRA и сценарии презентации рисуются.
   Запуск: node tools/content-gen/screens/check_reforge.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { strip, playerText, SERVICE } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html'), JS = read('screens/reforge.js'), CSS = read('screens/reforge.css');
const err = [], warn = [], lay = [], cnt = { views: 0, player: 0, ops: 0, taps: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
const done = () => {
  if (warn.length) console.log('Предупреждения:\n' + warn.join('\n'));
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Перековка: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; нажатий ${cnt.taps}; операций ${cnt.ops}. Шапка «Ремесла» с пятью вкладками — до ${cnt.head932} px из 932 и до ${cnt.head844} из 844.`);
  for (const x of lay) console.log('вёрстка ' + x);
  console.log('Проверка пройдена: окно «Перековка» в «Ремесле», три режима, что сплавить — отмечает игрок, «сервер» проверяет список, операции с номером и итог на сиде, цена по циклу, показ итога, игроку служебного не видно.');
  process.exit(0);
};

/* ---------- 1. файлы ---------- */
{
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
  const order = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>/g)].map(m => m[1] || '');
  if (!links.includes('screens/reforge.css')) say('index.html: не подключён screens/reforge.css');
  const i = order.indexOf('screens/reforge.js');
  if (i < 0) say('index.html: не подключён screens/reforge.js');
  for (const f of ['screens/model.js', 'screens/bag.js', 'screens/talismans.js', 'screens/equipment.js', 'screens/rituals.js']) if (i >= 0 && order.indexOf(f) > i) say(`index.html: reforge.js подключён раньше ${f}`);
  for (const [f, t] of [['reforge.js', JS], ['reforge.css', CSS]]) { const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length; if (crlf !== lf) say(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`); }
  try { new vm.Script(JS, { filename: 'reforge.js' }); } catch (e) { say('синтаксис reforge.js: ' + e.message); }
  const defined = new Set((CSS.match(/\.rf-[a-z0-9-]+/g) || []).map(s => s.slice(1)));
  for (const c of new Set(JS.match(/\brf-[a-z0-9-]+/g) || [])) if (!defined.has(c)) say(`reforge.css: не описан класс ${c}`);
  const kf = [...CSS.matchAll(/@keyframes\s+(rf-[a-z0-9-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
  if (kf.length < 4) say('reforge.css: ключевых кадров показа меньше четырёх');
  for (const [, name, body] of kf) {
    const bad = [...body.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]).filter(p => p !== 'transform' && p !== 'opacity');
    if (bad.length) say(`@keyframes ${name}: анимирует не только transform и opacity — ${[...new Set(bad)].join(', ')}`);
  }
  if (!/@media \(prefers-reduced-motion:reduce\)\{\s*\.rf-anim \*/.test(CSS)) say('reforge.css: «меньше движения» не выключает анимацию показа');
  /* палец на телефоне: клетка — не меньше 44 px на всех экранах, подсказки и «×» — не ниже 36 px */
  const cm = CSS.match(/\.rf-cell\{[^}]*min-width:(\d+)px;min-height:(\d+)px/);
  if (!cm || +cm[1] < 44 || +cm[2] < 44) say('reforge.css: у клетки сетки нет нижней границы 44 × 44 px');
  const cells = [...CSS.matchAll(/--rf-cell:(\d+)px/g)].map(m => +m[1]);
  if (!cells.length || cells.some(x => x < 44)) say(`reforge.css: клетка сетки меньше 44 px — ${cells.join(', ')}`);
  const hb = CSS.match(/\.rf-hb\{[^}]*min-height:(\d+)px/);
  if (!hb || +hb[1] < 36) say('reforge.css: кнопки подсказок ниже 36 px');
}
if (err.length) done();

/* ---------- 2. песочница ---------- */
const handlers = {};
const stubEl = id => ({ id, innerHTML: '', textContent: '', value: '', style: { setProperty() {} }, dataset: {}, children: [],
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x,
  insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 });
const els = {};
const document = { readyState: 'loading', addEventListener(t, f) { (handlers[t] = handlers[t] || []).push(f); }, getElementById: id => (els[id] = els[id] || stubEl(id)),
  querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
  documentElement: stubEl('html'), activeElement: null, fonts: null };
let reduced = false;
const timers = [];
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: q => ({ matches: /reduce/.test(q) ? reduced : false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: (f, ms) => { timers.push({ f, ms: ms | 0 }); return timers.length; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
for (const s of scripts) {
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
const T = vm.runInContext(`({
  get S() { return S; }, set S(v) { S = v; },
  ACT, OV, SCREENS, CRAFT_SEGS, FLOWS, KIT_EXTRA, KH, MAP, render, initialState, setTeam, H, EnLoot: window.EnLoot, EnEquip: window.EnEquip,
  TL: window.EN_TALISMANS, EQD: window.EN_EQUIPMENT, RT: window.EN_RITUALS, RF_SRV, RF_MODES, RF_DATA, RF_FX, TL_SRV, EQ_SRV, TB, tlPool, tlR, eqItem, eqFree, rtBusyW,
  rfKitHtml, rfSel, rfOrbit, rfPicked, rfHelpAdd, zpEntries,
})`, ctx);
const S = () => T.S;
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message}\n    ${(e.stack || '').split('\n').slice(1, 3).join('\n    ')}`); return undefined; } };
const game = () => (els.game ? els.game.innerHTML : '');
/* разметка: без исключений, undefined, NaN и [object, без второго style или class; глазами игрока — без служебного */
const seen = new Set();
function scan(h, where) {
  cnt.views++;
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  const dup = h.match(/<[a-z]+\b[^>]*?\s(style|class)="[^"]*"[^>]*?\s\1="/);
  if (dup) say(`${where}: в теге дважды ${dup[1]} — ${dup[0].slice(0, 120)}`);
  if (!T.KH.team) {
    cnt.player++;
    const i = h.indexOf('<main'), part = i < 0 ? h : h.slice(i), v = strip(part);
    const txt = playerText(part).split('\n').concat([...v.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => m[1]));
    for (const t of txt) for (const [what, re] of SERVICE) { const k = what + '|' + t; if (re.test(t) && !seen.has(k)) { seen.add(k); say(`${where}: игроку видно служебное (${what}) — «${t.slice(0, 100)}»`); } }
  }
  return h;
}
const view = where => { run(where, () => T.render()); return scan(game(), where); };
const reset = () => { T.S = T.initialState(); T.S.overlay = null; T.S.route = 'craft'; T.S.seg.craft = 'reforge'; };
const open = (m, r) => { T.S.route = 'craft'; T.S.seg.craft = 'reforge'; T.S.seg.rf = m; T.S.overlay = null; if (r) T.S.rf.sel[m] = r; };
const snap = () => JSON.stringify({ w: S().wallet, x: S().zp && S().zp.extra, eq: Object.keys(S().eq.items).sort(), a: S().rituals.artel });
const op = () => `rf${S().rf.seq}`;
const MODES = ['tal', 'eq', 'work'];
const U = (m, r) => T.RF_MODES[m].units(r);
const freeKeys = (m, r) => U(m, r).filter(u => u.free).map(u => u.key);
const tap = (m, r, key) => { cnt.taps++; run(`нажатие ${m}:${r}:${key}`, () => T.ACT.rfpick(`${m}:${r}:${key}`)); };
const picked = (m, r) => run('отмеченное', () => T.rfPicked(m, r)) || [];
const ids = (m, keys) => keys.map(k => T.RF_MODES[m].idOf(k));
const forgeBtn = h => { const x = h.match(/<button class="btn go rf-btn[^"]*" data-a="rfforge" data-v="([^"]+)"([^>]*)>/); return x ? { v: x[1], off: /\sdisabled/.test(x[2]) } : null; };
const tlCount = r => T.TB.list().filter(x => T.tlR(x.no) === r).reduce((a, x) => a + x.q, 0);
/* один свободный талисман редкости r — на героя: какой получится по правилам мест; итог — { no, hid } или null */
function wearOne(r) {
  for (const x of T.TB.list().filter(y => T.tlR(y.no) === r)) for (const h of S().heroes) {
    const res = T.TL_SRV.put(`tl${S().tal.seq}`, h.id, T.TL.rules.slots - 1, x.no);
    if (res && res.ok) return { no: x.no, hid: h.id };
  }
  return null;
}
run('режим «Игрок»', () => T.setTeam(false));

/* ---------- 3. окно, вкладка и вёрстка ---------- */
reset();
{
  for (const seg of ['work', 'stock', 'shop', 'market', 'reforge']) {
    T.S.seg.craft = seg; const v = run('шапка', () => T.SCREENS.craft());
    const items = v && v.seg ? v.seg.items.map(x => x[0]) : [];
    const i = items.indexOf('reforge');
    if (i < 0) say(`«Ремесло · ${seg}»: в шапке нет вкладки «Перековка»`);
    else if (i < items.indexOf('shop') || i < items.indexOf('market')) say(`«Ремесло · ${seg}»: «Перековка» стоит не после Лавки и Рынка — ${items.join(', ')}`);
    if (items.filter(x => x === 'reforge').length > 1) say(`«Ремесло · ${seg}»: вкладка «Перековка» дважды`);
  }
  /* пять вкладок и кошелёк в шапке помещаются в 932 и 844 px — расчёт по CSS с запасом: буква подписи вкладки — 0,5 em
     Cormorant Garamond, цифра кошелька — 0,52 em PT Sans Narrow; выбранной может быть любая вкладка */
  {
    const IH = html.replace(/\s+/g, ' '), RC = CSS.replace(/\s+/g, ' ');
    const px = (src, re) => { const m = src.match(re); return m ? +m[1] : NaN; };
    const CH = 0.5, DIG = 0.52, SP = 0.25;
    const v = {
      gap: px(IH, /\.g-top\{[^}]*?gap:(\d+)px/), padR: px(IH, /\.g-top\{[^}]*?padding-right:(\d+)px/),
      wGap: px(IH, /\.g-wallet\{[^}]*?gap:(\d+)px/), wPad: px(IH, /\.g-wallet\{[^}]*?padding:0 (\d+)px/), wBord: px(IH, /\.g-wallet\{[^}]*?border:(\d+)px/),
      cGap: px(IH, /\.g-cur\{[^}]*?gap:(\d+)px/), cPad: px(IH, /\.g-cur\{[^}]*?padding:0 (\d+)px/), cFont: px(IH, /\.g-cur\{[^}]*?font:700 (\d+)px/), cImg: px(IH, /\.g-cur img\{[^}]*?width:(\d+)px/),
      plus: px(IH, /\.g-plus\{[^}]*?width:(\d+)px/) - px(IH, /\.g-plus\{[^}]*?margin-left:-(\d+)px/), bell: px(IH, /\.g-icon\{[^}]*?width:(\d+)px/) + px(IH, /\.g-icon\{margin-right:(\d+)px\}/),
      segGap: px(IH, /\.g-seg\{[^}]*?gap:(\d+)px/),
    };
    const frames = [{ n: 932, w: px(IH, /\.g\{[^}]*?width:(\d+)px/), rail: px(IH, /\.g\{[^}]*?--rail:(\d+)px/), f: px(RC, /\.g-seg:has\(>button:nth-child\(5\)\) button\{padding:0 (?:\d+)px;font-size:([\d.]+)px/), fs: px(RC, /\.g-seg:has\(>button:nth-child\(5\)\) button\[aria-selected="true"\]\{font-size:([\d.]+)px/), p: px(RC, /\.g-seg:has\(>button:nth-child\(5\)\) button\{padding:0 (\d+)px/) },
      { n: 844, w: px(IH, /\.g\.sm\{[^}]*?width:(\d+)px/), rail: px(IH, /\.g\.sm\{[^}]*?--rail:(\d+)px/), f: px(RC, /\.g\.sm \.g-seg:has\(>button:nth-child\(5\)\) button\{padding:0 (?:\d+)px;font-size:([\d.]+)px/), fs: px(RC, /\.g\.sm \.g-seg:has\(>button:nth-child\(5\)\) button\[aria-selected="true"\]\{font-size:([\d.]+)px/), p: px(RC, /\.g\.sm \.g-seg:has\(>button:nth-child\(5\)\) button\{padding:0 (\d+)px/) }];
    const bad = Object.entries(v).concat(...frames.map(f => Object.entries(f))).filter(([, x]) => !Number.isFinite(x));
    if (bad.length) say(`шапка «Ремесла»: не прочитаны размеры — ${bad.map(x => x[0]).join(', ')}`);
    else {
      reset();
      const labels = T.SCREENS.craft().seg.items.map(x => x[1]);
      const num = n => { const s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (s.replace(/ /g, '').length * DIG + (s.split(' ').length - 1) * SP) * v.cFont; };
      const wallet = ['gold', 'spirit', 'souls', 'enerium'].reduce((a, k) => a + 2 * v.cPad + v.cImg + v.cGap + num(T.S.wallet[k] || 0), 0) + 3 * v.wGap + 2 * v.wPad + 2 * v.wBord + v.plus;
      for (const f of frames) for (let s = 0; s < labels.length; s++) {
        const seg = labels.reduce((a, l, i) => a + l.length * CH * (i === s ? f.fs : f.f) + 2 * f.p, 0) + (labels.length - 1) * v.segGap;
        const total = f.rail + 4 * v.gap + seg + wallet + v.bell + v.padR;
        cnt['head' + f.n] = Math.max(cnt['head' + f.n] || 0, Math.round(total));
        if (total > f.w) say(`шапка «Ремесла» ${f.n} px, выбрана «${labels[s]}»: около ${Math.round(total)} px — не влезает`);
      }
    }
  }
  const card = T.MAP.find(x => x.n === 'Ремесло');
  if (!card || !(card.ready || []).includes('reforge') || !card.o.includes('reforge')) say('карта экранов: окно «Перековка» не отмечено готовым');
  if (card && !/screens\/reforge\.js/.test(card.d)) say('карта экранов: описание «Ремесла» не называет окно перековки');
}
/* вёрстка окна: размеры — из стилей (index.html, reforge.css), ширина текста — оценка по кеглю: узкий шрифт интерфейса и цифры
   ~0,5 кегля на знак, прописные с разрядкой — ~0,7, заголовок Cormorant — ~0,45. Колонки: лестница, сетка, наковальня */
{
  const IH = html.replace(/\s+/g, ' ');
  const px = (src, re, name) => { const m = src.match(re); if (!m) { say(`вёрстка: не найдено ${name}`); return 0; } return +m[1]; };
  const w = (s, k, caps) => Math.ceil(String(s).length * k * (caps ? 0.7 : 0.5));
  const spM = px(IH, /--sp-m:(\d+)px/, '--sp-m'), spS = px(IH, /--sp-s:(\d+)px/, '--sp-s');
  const tabH = px(IH, /\.tabs button\{[^}]*height:(\d+)px/, '.tabs button height'), tabPad = px(IH, /\.tabs\{[^}]*padding:(\d+)px/, '.tabs padding');
  const btnH = px(IH, /\.btn\.go\{min-height:(\d+)px/, '.btn.go min-height'), btnPad = px(IH, /\.btn\.go\{[^}]*padding:0 (\d+)px/, '.btn.go padding');
  const smPad = px(IH, /\.btn\.sm\{[^}]*padding:0 (\d+)px/, '.btn.sm padding');
  const hbH = px(CSS, /\.rf-hb\{[^}]*min-height:(\d+)px/, '.rf-hb'), foH = px(CSS, /\.rf-fo\{[^}]*min-height:(\d+)px/, '.rf-fo');
  const stepH = px(CSS, /\.rf-step\{[^}]*min-height:(\d+)px/, '.rf-step'), gridGap = px(CSS, /\.rf-grid\{[^}]*gap:(\d+)px/, '.rf-grid gap'), gridPad = px(CSS, /\.rf-grid\{[^}]*padding:(\d+)px\}/, '.rf-grid padding');
  const titleF = px(CSS, /\.rf-out b\{font-size:(\d+)px/, '.rf-out b'), subF = px(CSS, /\.rf-out small\{font-size:(\d+)px/, '.rf-out small'), clamp = px(CSS, /\.rf-out small\{[^}]*-webkit-line-clamp:(\d+)/, 'line-clamp');
  const cntF = px(CSS, /\.rf-cnt b\{font:600 (\d+)px/, '.rf-cnt b');
  const vars = src => Object.fromEntries([...String(src || '').matchAll(/--rf-(lad|anv|ring|cell):(\d+)px/g)].map(m => [m[1], +m[2]]));
  const block = q => { const i = CSS.indexOf(`@container main (${q}){`); return i < 0 ? null : { i, s: CSS.slice(i, CSS.indexOf('\n}', i)) }; };
  const base = vars((CSS.match(/\n\.rf\{([^}]*)\}/) || [])[1]), Q = { low: block('max-height: 360px'), narrow: block('max-width: 720px'), tiny: block('max-height: 330px') };
  if (['lad', 'anv', 'ring', 'cell'].some(k => !base[k])) say('вёрстка: у .rf нет переменных --rf-lad, --rf-anv, --rf-ring, --rf-cell');
  if (!Q.low || !Q.narrow || !Q.tiny) say('вёрстка: нет запросов по высоте 360 и 330 px или по ширине 720 px');
  else if (!(Q.low.i < Q.narrow.i && Q.narrow.i < Q.tiny.i)) say('вёрстка: запросы не в порядке «низкий → узкий → совсем низкий»');
  const num = (src, re, d) => { const m = String(src || '').match(re); return m ? +m[1] : d; };
  const lowTitle = num(Q.low && Q.low.s, /\.rf-out b\{font-size:(\d+)px/, titleF), lowCnt = num(Q.low && Q.low.s, /\.rf-cnt b\{font-size:(\d+)px/, cntF);
  const tinyStep = num(Q.tiny && Q.tiny.s, /\.rf-step\{min-height:(\d+)px/, stepH), tinyClamp = num(Q.tiny && Q.tiny.s, /-webkit-line-clamp:(\d+)/, clamp);
  const tinyHbPad = num(Q.tiny && Q.tiny.s, /\.rf-hb\{padding:0 (\d+)px/, smPad), tinyLabel = !/\.rf-cl\{display:none/.test(Q.tiny ? Q.tiny.s : '');
  /* тексты справа от круга: что выйдет на каждой ступени и самые длинные итоги */
  reset();
  const outs = [];
  for (const m of MODES) {
    const M = T.RF_MODES[m];
    for (let r = 1; r <= 6; r++) { const x = run('что выйдет', () => M.what(r, [])); if (x) outs.push({ t: x.t, s: x.s, link: false }); }
  }
  for (const no of Object.keys(T.TL.items).filter(n => T.tlR(+n) >= 2)) { const g = run('итог талисмана', () => T.RF_MODES.tal.got({ got: +no })); if (g) outs.push({ t: g.name, s: g.sub, link: true }); }
  for (const it of Object.values(S().eq.items)) { const g = run('итог снаряжения', () => T.RF_MODES.eq.got({ got: it.uid, r: it.r - 1 })); if (g) outs.push({ t: g.name, s: g.sub, link: true }); }
  for (let r = 1; r <= 6; r++) { const g = run('итог рабочих', () => T.RF_MODES.work.got({ r })); if (g) outs.push({ t: g.name, s: g.sub, link: true }); }
  const SCR = [{ n: '932 × 430', W: px(IH, /\.g\{[^}]*?width:(\d+)px/, '.g width'), H: px(IH, /\.g\{[^}]*?height:(\d+)px/, '.g height'), top: px(IH, /\.g\{--top:(\d+)px/, '.g --top'), rail: px(IH, /\.g\{[^}]*?--rail:(\d+)px/, '.g --rail'), rows: 3 },
    { n: '844 × 390', W: px(IH, /\.g\.sm\{[^}]*?width:(\d+)px/, '.g.sm width'), H: px(IH, /\.g\.sm\{[^}]*?height:(\d+)px/, '.g.sm height'), top: px(IH, /\.g\.sm\{[^}]*?--top:(\d+)px/, '.g.sm --top'), rail: px(IH, /\.g\.sm\{[^}]*?--rail:(\d+)px/, '.g.sm --rail'), rows: 3 },
    { n: 'телефон 740 × 360', W: 740, H: 360, top: px(IH, /\.g\{--top:(\d+)px/, '.g --top'), rail: px(IH, /\.g\{[^}]*?--rail:(\d+)px/, '.g --rail'), rows: 2 }];
  for (const X of SCR) {
    const mainW = X.W - X.rail, mainH = X.H - X.top, low = mainH <= 360, narrow = mainW <= 720, tiny = mainH <= 330;
    const v = Object.assign({}, base, low ? vars(Q.low && Q.low.s) : {}, narrow ? vars(Q.narrow && Q.narrow.s) : {}, tiny ? vars(Q.tiny && Q.tiny.s) : {});
    const inW = mainW - 2 * spM, inH = mainH - 2 * spM, bodyH = inH - (tabH + 2 * tabPad + 2) - spM;
    /* ширина: три колонки, в сетке не меньше пяти клеток */
    const pickW = inW - v.lad - v.anv - 2 * spS, gridW = pickW - 2 - 2 * spM - 2 * gridPad, cols = Math.floor((gridW + gridGap) / (v.cell + gridGap));
    if (cols < 5) say(`вёрстка ${X.n}: в сетке ${cols} клеток в ряд — меньше пяти`);
    /* шапка сетки: счётчик, подпись редкости, подсказки режима, «×» */
    const hp = tiny ? tinyHbPad : smPad, cntW = w('10', low ? lowCnt : cntF) + w('/10', 15) + 1;
    let headW = 0;
    for (const m of MODES) {
      const H0 = Object.values(T.RF_MODES[m].help), label = tiny && !tinyLabel ? 0 : 1;
      const wd = cntW + H0.reduce((a, x) => a + 2 + 2 * hp + w(x.n, 12, true), 0) + (2 + 2 * hp + 14) + (2 + label + H0.length) * spS;
      headW = Math.max(headW, wd);
    }
    if (headW > pickW - 2 - 2 * spM) say(`вёрстка ${X.n}: шапка сетки ${headW} px, а места ${pickW - 2 - 2 * spM} px`);
    /* высота сетки: сколько рядов видно без прокрутки */
    const gridH = bodyH - 2 - 2 * spS - hbH - spS - foH - spS - 2 * gridPad, rows = Math.floor((gridH + gridGap) / (v.cell + gridGap));
    if (rows < X.rows) say(`вёрстка ${X.n}: в сетке видно ${rows} ряда — меньше ${X.rows}`);
    /* лестница: шесть ступеней */
    const ladH = 6 * (tiny ? tinyStep : stepH) + 5 * 2 + 8 + 2;
    if (ladH > bodyH) say(`вёрстка ${X.n}: лестница ${ladH} px, а места ${bodyH} px`);
    /* наковальня: круг и строка рядом, под ними — «Не хватает золота» и кнопка */
    const outW = v.anv - 2 - 2 * spM - v.ring - spM, tf = low ? lowTitle : titleF, cl = tiny ? tinyClamp : clamp;
    if (outW < 100) say(`вёрстка ${X.n}: строке «что выйдет» остаётся ${outW} px`);
    const lines = (s, f, k) => Math.max(1, Math.ceil(String(s || '').length / Math.max(1, Math.floor(outW / (f * k)))));
    let outH = 0, longest = '';
    for (const o of outs) { const hh = 13 + 4 + lines(o.t, tf, 0.45) * Math.ceil(tf * 1.12) + (o.s ? 4 + Math.min(cl, lines(o.s, subF, 0.5)) * Math.ceil(subF * 1.3) : 0) + (o.link ? 4 + 12 : 0); if (hh > outH) { outH = hh; longest = o.t; } }
    const anvH = 2 + 2 * spS + Math.max(v.ring, outH) + spS + (16 + spS) + btnH;
    if (anvH > bodyH) say(`вёрстка ${X.n}: наковальня ${anvH} px, а места ${bodyH} px — строка «${longest}»`);
    const btnW = 2 + 2 * btnPad + w('Перековать', 13, true) + 8 + 10 + 1 + 18 + 4 + w('480 000', 14);
    if (btnW > v.anv - 2 - 2 * spM) say(`вёрстка ${X.n}: кнопка «Перековать» ${btnW} px, а места ${v.anv - 2 - 2 * spM} px`);
    lay.push(`${X.n}: лестница ${v.lad}, сетка ${pickW} px — ${cols} в ряд, видно ${rows} ряда, шапка ${headW}; наковальня ${v.anv} × ${anvH} из ${bodyH}, круг ${v.ring}, строка ${outW} px`);
  }
}
for (const team of [false, true]) {
  reset(); run('режим', () => T.setTeam(team));
  const tag = team ? 'Команда' : 'Игрок';
  for (const m of MODES) {
    open(m); const h = view(`${tag} · ${m}`);
    if (!h.includes('class="scr rf"')) say(`${tag} · ${m}: окно не нарисовалось`);
    if (!h.includes(`data-v="rf:${m}" `) && !h.includes(`data-v="rf:${m}">`)) say(`${tag} · ${m}: нет вкладки режима`);
    if ((h.match(/class="rf-step[ "]/g) || []).length !== 6) say(`${tag} · ${m}: ступеней лестницы не шесть`);
    const need = T.RF_MODES[m].need();
    for (let r = 1; r <= 6; r++) {
      T.S.rf.sel[m] = r; const g = view(`${tag} · ${m} · ступень ${r}`);
      if ((g.match(/class="rf-it[ "]/g) || []).length !== need) say(`${tag} · ${m} · ${r}: мест на наковальне не ${need}`);
      if ((g.match(/data-a="rfforge"/g) || []).length !== 1) say(`${tag} · ${m} · ${r}: у наковальни не одно действие`);
      const cells = (g.match(/class="rf-cell[ "]/g) || []).length, all = U(m, r).length;
      if (cells !== all) say(`${tag} · ${m} · ${r}: клеток ${cells}, а предметов этой редкости ${all}`);
      if (!all && !g.includes('class="rf-empty"')) say(`${tag} · ${m} · ${r}: пустая редкость без строки «нет»`);
      if (!g.includes(`<b class="num">0</b><small>/${need}</small>`)) say(`${tag} · ${m} · ${r}: нет счётчика «0 / ${need}»`);
      const b = forgeBtn(g); if (!b || !b.off) say(`${tag} · ${m} · ${r}: «Перековать» доступна, хотя ничего не отмечено`);
      if (/data-a="rfhelp"/.test(g) === false) say(`${tag} · ${m} · ${r}: нет подсказок`);
    }
  }
  run('режим «Игрок»', () => T.setTeam(false));
}
/* закрытые режимы: цикл I — талисманы и снаряжение; ритуалы — с 10-го уровня Странника и цикла II */
{
  reset(); T.S.acc.cycle = 1;
  for (const m of MODES) { open(m); const h = view(`цикл I · ${m}`); if (!h.includes('rf-lock') || h.includes('data-a="rfforge"')) say(`цикл I · ${m}: режим не закрыт`); }
  reset(); T.S.acc.level = Math.min(T.S.acc.level, T.RT.rules.open.level - 1);
  open('work'); const h = view('рабочие · уровень ниже'); if (!h.includes('rf-lock')) say('рабочие: до уровня открытия ритуалов режим не закрыт');
}

/* ---------- 4. выбор — у игрока ---------- */
{
  const need = T.RF_MODES.tal.need();
  reset(); open('tal', 1); T.S.wallet.gold = 10000000;
  const L = freeKeys('tal', 1);
  if (L.length < need + 1) say(`талисманы: свободных обычных ${L.length} — для проверки выбора нужно больше ${need}`);
  else {
    /* нажатие отмечает, повторное — снимает */
    for (const k of L.slice(0, 3)) tap('tal', 1, k);
    let p = picked('tal', 1);
    if (p.length !== 3 || L.slice(0, 3).some(k => !p.includes(k))) say(`выбор: три нажатия отметили ${JSON.stringify(p)}`);
    let h = view('выбор · три отмечены');
    if ((h.match(/class="rf-cell[^"]*" [^>]*aria-pressed="true"/g) || []).length !== 3) say('выбор: в сетке не три отмеченные клетки');
    if ((h.match(/<button class="rf-it"/g) || []).length !== 3) say('выбор: на орбите наковальни не три отмеченных');
    if (!h.includes('<b class="num">3</b>')) say('выбор: счётчик не «3»');
    tap('tal', 1, L[1]); p = picked('tal', 1);
    if (p.length !== 2 || p.includes(L[1])) say('выбор: повторное нажатие не сняло отметку');
    /* сверх N не отмечается */
    for (const k of L) { if (picked('tal', 1).length >= need) break; if (!picked('tal', 1).includes(k)) tap('tal', 1, k); }
    const full = picked('tal', 1); T.S.toast = null;
    const extra = L.find(k => !full.includes(k)); tap('tal', 1, extra);
    if (picked('tal', 1).length !== need || picked('tal', 1).includes(extra)) say('выбор: отмечено сверх нужного');
    if (!T.S.toast || !/Уже отмечено/.test(T.S.toast.t)) say('выбор: сверх нужного — нет объяснения');
    h = view('выбор · все отмечены'); const b = forgeBtn(h);
    if (!b || b.off) say('выбор: отмечено нужное и золота хватает, а «Перековать» выключена');
    if (!h.includes(`class="rf-cnt full"`)) say('выбор: полный счётчик не отмечен');
    /* нажатие на отмеченное на орбите — снимает отметку */
    const orb = h.match(/<button class="rf-it" [^>]*data-a="rfpick" data-v="([^"]+)"/);
    if (!orb) say('выбор: отмеченное на орбите не снимается нажатием');
    else { cnt.taps++; run('орбита', () => T.ACT.rfpick(orb[1])); if (picked('tal', 1).length !== need - 1) say('выбор: нажатие на орбите не сняло отметку'); }
    /* «×» снимает всё */
    run('сброс', () => T.ACT.rfclear('tal'));
    if (picked('tal', 1).length) say('выбор: «×» не снял отметки');
    /* подсказка «Повторы» только дополняет: отмеченное игроком остаётся, добавленное — лишние копии */
    const once = T.TB.list().find(x => T.tlR(x.no) === 1 && x.q === 1), mine = once ? `${once.no}.0` : L[0];
    tap('tal', 1, mine);
    const cand = run('подсказка', () => T.rfHelpAdd('tal', 1, 'dup', [mine])) || [];
    run('«Повторы»', () => T.ACT.rfhelp('tal:1:dup'));
    p = picked('tal', 1);
    if (!p.includes(mine)) say('«Повторы»: подсказка сняла отмеченное игроком');
    if (p.length !== 1 + cand.length) say(`«Повторы»: отмечено ${p.length}, ждали 1 + ${cand.length}`);
    for (const k of p) if (k !== mine) { const [no, c] = k.split('.').map(Number), q = T.TB.qty ? T.TB.qty(no) : 0; if (c === 0 || !q || q < 2) say(`«Повторы»: отмечена не лишняя копия — ${k}`); }
    T.S.toast = null; run('«Повторы» ещё раз', () => T.ACT.rfhelp('tal:1:dup'));
    if (picked('tal', 1).length !== p.length || !T.S.toast) say('«Повторы» ещё раз: что-то изменилось или нет объяснения');
    h = view('выбор · подсказка'); if (!/data-a="rfhelp" data-v="tal:1:dup"[^>]*disabled/.test(h)) say('«Повторы»: добавлять нечего, а кнопка доступна');
    /* другая ступень снимает отметки: все отмеченные — одной редкости */
    run('ступень', () => T.ACT.rfsel('tal:2'));
    if (picked('tal', 1).length || picked('tal', 2).length) say('выбор: другая ступень не сняла отметки');
  }
  /* надетое отметить нельзя — нажатие объясняет */
  reset(); open('tal', 1);
  const w = wearOne(1);
  if (!w) warn.push('талисманы: ни один обычный не надеть — клетка «надето» не проверена');
  else {
    const lk = U('tal', 1).find(u => !u.free);
    let h = view('надето');
    if (!lk || !/class="rf-cell lock"[^>]*aria-disabled="true"/.test(h)) say('надето: клетки «надето» нет или она не приглушена');
    else {
      tap('tal', 1, lk.key);
      if (picked('tal', 1).length || (T.S.rf.pick.tal && T.S.rf.pick.tal.keys.includes(lk.key))) say('надето: надетый талисман отметился');
      h = view('надето · причина');
      const fo = h.match(/<p class="rf-fo warn">([^<]*)<\/p>/);
      if (!fo || !/сначала снимите/.test(fo[1]) || !fo[1].includes(T.H(w.hid).name)) say(`надето: нет причины с именем героя — ${fo ? fo[1] : 'строки нет'}`);
      if (!/aria-current="true"/.test(h)) say('надето: нажатая клетка не отмечена как текущая');
    }
  }
  /* снаряжение: подсказки, отметка уходит, если предмет надели; цикл итога и цена — по отмеченному */
  reset(); open('eq', 1); T.S.wallet.gold = 10000000;
  const E = freeKeys('eq', 1), needE = T.RF_MODES.eq.need();
  if (E.length < 2) say('снаряжение: свободных обычных меньше двух');
  else {
    tap('eq', 1, E[0]); tap('eq', 1, E[1]);
    run('надеть отмеченное', () => T.EQ_SRV.put(`eq${S().eq.seq}`, S().heroes[0].id, E[0]));
    const p = picked('eq', 1); if (p.length !== 1 || p.includes(E[0])) say(`снаряжение: надели отмеченное — отметка осталась (${p.join(', ')})`);
    const h = view('снаряжение · надели отмеченное'); if (!h.includes('<b class="num">1</b>')) say('снаряжение: счётчик не пересчитался после надевания');
    if (!/class="rf-cell lock"/.test(h)) say('снаряжение: надетый предмет не показан приглушённым');
  }
  reset(); open('eq', 1); T.S.wallet.gold = 10000000;
  {
    run('«Слабые»', () => T.ACT.rfhelp('eq:1:weak'));
    const p = picked('eq', 1), weak = freeKeys('eq', 1).map(k => T.eqItem(k)).sort((a, b) => a.cyc - b.cyc || a.lines[0][1] - b.lines[0][1] || a.n - b.n).slice(0, needE).map(it => it.uid);
    if (p.length !== Math.min(needE, freeKeys('eq', 1).length) || weak.some(k => !p.includes(k))) say('«Слабые»: отмечены не самые слабые');
    run('сброс', () => T.ACT.rfclear('eq'));
    run('«Повторы»', () => T.ACT.rfhelp('eq:1:dup'));
    const d = picked('eq', 1), bySlot = {};
    for (const k of freeKeys('eq', 1)) { const it = T.eqItem(k); (bySlot[it.slot] = bySlot[it.slot] || []).push(it); }
    for (const [slot, L] of Object.entries(bySlot)) { const left = L.filter(it => !d.includes(it.uid)); if (!left.length) say(`«Повторы»: в слоте ${slot} не осталось ни одного`); else if (L.length > 1 && left.length !== 1) say(`«Повторы»: в слоте ${slot} осталось ${left.length}`); }
  }
  /* цикл итога — самый ранний из отмеченных: и в строке «что выйдет», и в цене, и в итоге «сервера» */
  reset(); open('eq', 1); T.S.wallet.gold = 10000000;
  {
    const all = freeKeys('eq', 1).slice(0, needE);
    if (all.length < needE) say('снаряжение: свободных обычных меньше нужного');
    else {
      all.forEach((k, i) => { T.eqItem(k).cyc = i < 3 ? 2 : 3; });
      for (const k of all) tap('eq', 1, k);
      let h = view('снаряжение · циклы II и III');
      const out = (h.match(/<div class="rf-out"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
      if (!/цикл II(?!I)/.test(out)) say(`снаряжение: цикл итога не самый ранний из отмеченных — «${out.replace(/<[^>]+>/g, ' ').trim()}»`);
      if (!/class="rf-cy"/.test(h)) say('снаряжение: циклы разные, а в клетках цикл не показан');
      const base = T.EQD.rules.reforge.gold[0];
      if (!h.includes(`${(base * 2).toLocaleString('ru-RU')}</span></button>`)) say('снаряжение: цена не по циклу отмеченного');
      run('сброс', () => T.ACT.rfclear('eq'));
      all.forEach(k => { T.eqItem(k).cyc = 3; });
      for (const k of all) tap('eq', 1, k);
      h = view('снаряжение · цикл III'); const b = forgeBtn(h);
      if (!b || b.off) say('снаряжение: «Перековать» выключена при полном выборе');
      else {
        const g0 = T.S.wallet.gold; run('перековка', () => T.ACT.rfforge(b.v)); cnt.ops++;
        const res = T.S.rf.last.eq, got = res && T.eqItem(res.got);
        if (!got || got.cyc !== 3 || got.r !== 2) say(`снаряжение: итог ${JSON.stringify(got && { r: got.r, cyc: got.cyc })}, ждали редкий цикла III`);
        if (g0 - T.S.wallet.gold !== base * 3) say(`снаряжение: списано ${g0 - T.S.wallet.gold}, ждали ${base * 3}`);
        if (all.some(k => T.eqItem(k))) say('снаряжение: ушли не отмеченные предметы');
      }
    }
  }
  /* рабочие: занятые в ритуале не отмечаются, причина — ритуал и время; «Любые» отмечает N свободных */
  reset(); open('work');
  {
    const busy = U('work', 2).filter(u => !u.free);
    run('ступень', () => T.ACT.rfsel('work:2'));
    if (!busy.length) warn.push('рабочие: в демо нет занятых редких — клетка «в ритуале» не проверена');
    else {
      tap('work', 2, busy[0].key);
      if (picked('work', 2).length) say('рабочие: занятый в ритуале отметился');
      const h = view('рабочие · занятый'), fo = h.match(/<p class="rf-fo warn">([^<]*)<\/p>/);
      if (!fo || !/В ритуале/.test(fo[1])) say(`рабочие: у занятого нет причины — ${fo ? fo[1] : 'строки нет'}`);
    }
    run('ступень', () => T.ACT.rfsel('work:1'));
    run('«Любые»', () => T.ACT.rfhelp('work:1:any'));
    if (picked('work', 1).length !== Math.min(T.RF_MODES.work.need(), freeKeys('work', 1).length)) say('«Любые»: отмечено не столько, сколько нужно');
  }
}

/* ---------- 5. «сервер» ---------- */
/* талисманы: уходит ровно отмеченное — даже если подсказки выбрали бы другое */
{
  reset(); T.S.wallet.gold = 10000000;
  const need = T.TL.rules.reforge.need, L = freeKeys('tal', 1);
  if (L.length < need) say(`талисманы: обычных в запасах ${L.length} — меньше ${need}`);
  else {
    const sel = L.slice(-need), I = ids('tal', sel), want = {}; for (const no of I) want[no] = (want[no] || 0) + 1;
    const q0 = {}; for (const x of T.TB.list()) q0[x.no] = x.q;
    const o = op(), g0 = T.S.wallet.gold, price = T.TL.rules.reforge.gold[0] * T.RF_DATA.talCyc[T.S.acc.cycle];
    const R = run('перековка', () => T.RF_SRV.forge('tal', o, 1, I)); cnt.ops++;
    if (!R || !R.ok) say(`талисманы: отказ на выбранном — ${JSON.stringify(R)}`);
    else {
      for (const [no, n] of Object.entries(want)) { const now = T.TB.qty(+no) - (+no === R.got ? 1 : 0); if (q0[no] - now !== n) say(`талисманы: номера ${no} ушло ${q0[no] - now}, отмечено ${n}`); }
      const other = T.TB.list().filter(x => !want[x.no] && x.no !== R.got && q0[x.no] !== x.q); if (other.length) say(`талисманы: ушли неотмеченные — ${other.map(x => x.no).join(', ')}`);
      if (g0 - T.S.wallet.gold !== price) say(`талисманы: золото ${g0 - T.S.wallet.gold}, цена ${price}`);
      if (T.tlR(R.got) !== 2) say(`талисманы: итог редкости ${T.tlR(R.got)}`);
      const pool = T.tlPool(2), W = pool.reduce((a, x) => a + x[1], 0); let k = T.EnLoot.makeRng(T.EnLoot.seedOf('перековка|' + o))(W), got = null;
      for (const [no, w] of pool) { if (k < w) { got = no; break; } k -= w; }
      if (got !== R.got) say(`талисманы: итог ${R.got} не совпал с генератором на сиде операции — ${got}`);
      const s1 = snap(), again = T.RF_SRV.forge('tal', o, 1, I);
      if (!again.again || snap() !== s1 || again.got !== R.got) say('талисманы: повтор номера что-то изменил');
    }
  }
  /* цена по циклу: база × множитель цикла аккаунта, в цикле II — ровно данные */
  for (let c = 2; c <= 6; c++) {
    reset(); T.S.acc.cycle = c; T.S.wallet.gold = 10000000;
    const g0 = T.S.wallet.gold, price = T.TL.rules.reforge.gold[0] * T.RF_DATA.talCyc[c];
    const R = run('талисманы · цикл', () => T.RF_SRV.forge('tal', op(), 1, ids('tal', freeKeys('tal', 1).slice(0, need)))); cnt.ops++;
    if (!R || !R.ok) { say(`талисманы, цикл ${c}: отказ ${JSON.stringify(R)}`); continue; }
    if (g0 - T.S.wallet.gold !== price) say(`талисманы, цикл ${c}: золото ${g0 - T.S.wallet.gold}, цена ${price}`);
    if (c === 2 && price !== T.TL.rules.reforge.gold[0]) say('талисманы: в цикле II цена не равна данным талисманов');
  }
  /* отказы: номер не тратится, запасы и кошелёк не меняются */
  const refuse = (name, want, prep, list, r = 1) => {
    reset(); T.S.wallet.gold = 10000000; if (prep) prep();
    const I = typeof list === 'function' ? list() : list, s0 = snap(), seq = S().rf.seq, R = run(name, () => T.RF_SRV.forge('tal', op(), r, I));
    if (!R || R.refuse !== want) say(`талисманы · ${name}: ждали отказ ${want}, получили ${JSON.stringify(R)}`);
    if (snap() !== s0 || S().rf.seq !== seq) say(`талисманы · ${name}: отказ что-то изменил`);
  };
  const tenOf = r => ids('tal', freeKeys('tal', r).slice(0, need));
  refuse('девять', 'few', null, () => tenOf(1).slice(0, need - 1));
  refuse('одиннадцать', 'few', null, () => tenOf(1).concat(tenOf(1).slice(0, 1)));
  refuse('чужой номер', 'bad', null, () => tenOf(1).slice(0, need - 1).concat([999999]));
  refuse('копий больше, чем есть', 'bad', null, () => { const one = T.TB.list().find(x => T.tlR(x.no) === 1 && x.q === 1); return Array(need).fill(one ? one.no : 0); });
  refuse('другая редкость', 'mix', null, () => { const rare = T.TB.list().find(x => T.tlR(x.no) === 2); return tenOf(1).slice(0, need - 1).concat([rare ? rare.no : 0]); });
  refuse('вневременные', 'top', null, () => tenOf(1), 7);
  refuse('без золота', 'gold', () => { T.S.wallet.gold = 0; }, () => tenOf(1));
  refuse('цикл I', 'lock', () => { T.S.acc.cycle = 1; }, () => tenOf(1));
  {
    reset(); T.S.wallet.gold = 10000000;
    const w = wearOne(1);
    if (w) {
      /* копий надетого номера — на одну больше, чем свободных: лишняя — та, что на герое */
      const k = T.TB.qty(w.no) + 1, I = Array(k).fill(w.no).concat(ids('tal', freeKeys('tal', 1).filter(x => +x.split('.')[0] !== w.no))).slice(0, need);
      const s0 = snap(), R = run('надетый', () => T.RF_SRV.forge('tal', op(), 1, I));
      if (!R || R.refuse !== 'busy') say(`талисманы · надетый: ждали отказ busy, получили ${JSON.stringify(R)}`);
      if (snap() !== s0) say('талисманы · надетый: отказ что-то изменил');
    }
  }
  /* отказ номер не тратит: тот же номер после пополнения кошелька проходит */
  reset(); T.S.wallet.gold = 0;
  { const o = op(), I = tenOf(1), a = T.RF_SRV.forge('tal', o, 1, I); T.S.wallet.gold = 10000000; const b = T.RF_SRV.forge('tal', o, 1, I); cnt.ops++;
    if (a.refuse !== 'gold' || !b.ok || b.again) say(`талисманы: после отказа тот же номер не прошёл — ${JSON.stringify(a)} → ${JSON.stringify(b)}`); }
  /* прежний вход: TL_SRV.forge — тот же «сервер» и тот же номер; без списка — порядок подсказок */
  reset(); const o = 'tl7', a = T.TL_SRV.forge(o, 1), b = T.RF_SRV.forge('tal', o, 1, []); cnt.ops += 2;
  if (!a.ok || !b.again || b.got !== a.got) say('талисманы: TL_SRV.forge ведёт не в общий «сервер» перековки');
}
/* снаряжение: уходит ровно отмеченное; цикл — самый ранний из отмеченных, цена × цикл итога; надетые и чужие — отказ */
{
  const need = T.EQD.rules.reforge.need, free1 = () => T.eqFree().filter(it => it.r === 1);
  reset(); T.S.wallet.gold = 10000000;
  const L = free1();
  if (L.length < need + 1) say(`снаряжение: свободных обычных ${L.length} — для проверки выбора нужно больше ${need}`);
  else {
    /* сильнейшие десять, а не слабейшие: остаётся самый слабый */
    const ord = (a, b) => a.cyc - b.cyc || a.lines[0][1] - b.lines[0][1] || a.n - b.n, weakest = L.slice().sort(ord)[0];
    const sel = L.slice().sort(ord).slice(-need).map(it => it.uid), o = op(), g0 = T.S.wallet.gold;
    const cyc = Math.min(...sel.map(u => T.eqItem(u).cyc));
    const R = run('перековка', () => T.RF_SRV.forge('eq', o, 1, sel)); cnt.ops++;
    const got = R && R.ok ? T.eqItem(R.got) : null;
    if (!got || got.r !== 2 || got.cyc !== cyc) say(`снаряжение: итог ${JSON.stringify(got && { r: got.r, cyc: got.cyc })}, ждали редкий цикла ${cyc}`);
    if (g0 - T.S.wallet.gold !== T.EQD.rules.reforge.gold[0] * cyc) say('снаряжение: золото не ровно цена × цикл итога');
    if (sel.some(u => T.eqItem(u)) || !T.eqItem(weakest.uid)) say('снаряжение: ушли не отмеченные предметы');
    const want = T.EnEquip.mint(T.EQD, { r: 2, cyc }, T.EnEquip.seedOf('перековка-снаряжения|' + o));
    if (got && (got.slot !== want.slot || JSON.stringify(got.lines) !== JSON.stringify(want.lines))) say('снаряжение: итог не совпал с генератором на сиде операции');
    const s1 = snap(), again = T.EQ_SRV.forge(o, 1); if (!again.again || snap() !== s1) say('снаряжение: повтор номера через EQ_SRV.forge что-то изменил');
  }
  const refuse = (name, want, prep, list, r = 1) => {
    reset(); T.S.wallet.gold = 10000000; if (prep) prep();
    const I = list(), s0 = snap(), R = run(name, () => T.RF_SRV.forge('eq', op(), r, I));
    if (!R || R.refuse !== want) say(`снаряжение · ${name}: ждали отказ ${want}, получили ${JSON.stringify(R)}`);
    if (snap() !== s0) say(`снаряжение · ${name}: отказ что-то изменил`);
  };
  const ten = () => free1().slice(0, need).map(it => it.uid);
  refuse('девять', 'few', null, () => ten().slice(0, need - 1));
  refuse('повтор экземпляра', 'bad', null, () => { const t = ten(); t[need - 1] = t[0]; return t; });
  refuse('чужой номер', 'bad', null, () => ten().slice(0, need - 1).concat(['нет-такого']));
  refuse('другая редкость', 'mix', null, () => ten().slice(0, need - 1).concat([T.eqFree().find(it => it.r === 2).uid]));
  refuse('надетый', 'busy', () => { const it = free1()[0]; T.EQ_SRV.put(`eq${S().eq.seq}`, S().heroes[0].id, it.uid); }, () => Object.values(S().eq.items).filter(it => it.r === 1 && it.on).slice(0, 1).concat(free1()).slice(0, need).map(it => it.uid));
  refuse('вневременные', 'top', null, ten, 7);
  refuse('без золота', 'gold', () => { T.S.wallet.gold = 0; }, ten);
  refuse('цикл I', 'lock', () => { T.S.acc.cycle = 1; }, ten);
  /* прежний вход без списка: самые слабые, надетые не берутся */
  reset(); T.S.wallet.gold = 10000000;
  const all = free1(); all.slice(0, Math.max(0, all.length - need + 1)).forEach(it => { it.on = S().heroes[0].id; });
  const r = T.EQ_SRV.forge(op(), 1); if (r.refuse !== 'few') say(`снаряжение: прежний вход взял надетые — ${JSON.stringify(r)}`);
}
/* рабочие: три отмеченных одной редкости → один выше; занятые, чужие и другой редкости — отказ; цена по циклу */
{
  const F = T.RT.rules.forge;
  if (!F || !(F.need >= 2) || !Array.isArray(F.gold) || F.gold.length !== 6 || !Array.isArray(F.cyc)) say('рабочие: нет правила перековки EN_RITUALS.rules.forge');
  else {
    for (const x of F.gold.concat(F.cyc, [F.need])) if (!Number.isInteger(x)) say(`рабочие: не целое число в правиле — ${x}`);
    const A = () => T.S.rituals.artel, add = (r, n) => { for (let i = 0; i < n; i++) A().push({ id: 'проверка' + A().length, r }); };
    for (let c = 2; c <= 6; c++) {
      reset(); T.S.acc.cycle = c; T.S.wallet.gold = 10000000;
      while (freeKeys('work', 1).length < F.need + 1) add(1, 1);
      const sel = freeKeys('work', 1).slice(-F.need), busyIds = [...T.rtBusyW()], n1 = A().filter(w => w.r === 1).length, n2 = A().filter(w => w.r === 2).length, g0 = T.S.wallet.gold, o = op();
      const R = run('рабочие', () => T.RF_SRV.forge('work', o, 1, sel)); cnt.ops++;
      if (!R || !R.ok) { say(`рабочие, цикл ${c}: отказ ${JSON.stringify(R)}`); continue; }
      if (A().filter(w => w.r === 1).length !== n1 - F.need || A().filter(w => w.r === 2).length !== n2 + 1) say(`рабочие, цикл ${c}: не ${F.need} обычных в одного редкого`);
      if (sel.some(id => A().some(w => w.id === id))) say(`рабочие, цикл ${c}: ушли не отмеченные`);
      if (busyIds.some(id => !A().some(w => w.id === id))) say(`рабочие, цикл ${c}: перекован занятый в ритуале`);
      if (g0 - T.S.wallet.gold !== F.gold[0] * F.cyc[c]) say(`рабочие, цикл ${c}: золото ${g0 - T.S.wallet.gold}, цена ${F.gold[0] * F.cyc[c]}`);
      const s1 = snap(), again = T.RF_SRV.forge('work', o, 1, sel); if (!again.again || snap() !== s1) say(`рабочие, цикл ${c}: повтор номера что-то изменил`);
    }
    const refuse = (name, want, prep, list, r = 1) => {
      reset(); T.S.wallet.gold = 10000000; while (freeKeys('work', 1).length < F.need) add(1, 1); if (prep) prep();
      const I = list(), s0 = snap(), R = run(name, () => T.RF_SRV.forge('work', op(), r, I));
      if (!R || R.refuse !== want) say(`рабочие · ${name}: ждали отказ ${want}, получили ${JSON.stringify(R)}`);
      if (snap() !== s0) say(`рабочие · ${name}: отказ что-то изменил`);
    };
    const three = () => freeKeys('work', 1).slice(0, F.need);
    refuse('двое', 'few', null, () => three().slice(0, F.need - 1));
    refuse('повтор', 'bad', null, () => { const t = three(); t[F.need - 1] = t[0]; return t; });
    refuse('чужой', 'bad', null, () => three().slice(0, F.need - 1).concat(['нет-такого']));
    refuse('занятый', 'busy', () => { while (freeKeys('work', 2).length < F.need) add(2, 1); }, () => { const b = U('work', 2).filter(u => !u.free).map(u => u.key); return b.length ? b.slice(0, 1).concat(freeKeys('work', 2)).slice(0, F.need) : ['нет-занятых']; }, 2);
    refuse('другая редкость', 'mix', () => add(2, 1), () => three().slice(0, F.need - 1).concat(freeKeys('work', 2).slice(0, 1)));
    refuse('вневременные', 'top', null, three, 7);
    refuse('без золота', 'gold', () => { T.S.wallet.gold = 0; }, three);
    refuse('цикл I', 'lock', () => { T.S.acc.cycle = 1; }, three);
  }
}
/* цены — целые и растут с редкостью и циклом */
{
  const TC = T.RF_DATA.talCyc;
  if (!Array.isArray(TC) || TC.length !== 7 || TC.some(x => !Number.isInteger(x))) say('RF_DATA.talCyc: не семь целых множителей');
  else { if (TC[2] !== 1) say('RF_DATA.talCyc: в цикле II цена талисманов не равна данным'); for (let c = 3; c <= 6; c++) if (TC[c] <= TC[c - 1]) say(`RF_DATA.talCyc: множитель цикла ${c} не растёт`); }
  for (const m of MODES) { reset(); for (let r = 1; r <= 6; r++) { const p = T.RF_MODES[m].price(r, []); if (!Number.isInteger(p) || p <= 0) say(`${m}: цена ступени ${r} — ${p}`); if (r > 1 && p <= T.RF_MODES[m].price(r - 1, [])) say(`${m}: цена не растёт с редкостью на ступени ${r}`); } }
  for (const [k, x] of Object.entries(T.RF_FX)) for (const y of [].concat(x).flat()) if (y != null && !Number.isInteger(y)) say(`RF_FX.${k}: не целое — ${y}`);
  for (const [x, y, tx, ty] of T.rfOrbit(10).concat(T.rfOrbit(3))) if (![x, y, tx, ty].every(Number.isInteger) || x < 0 || y < 0 || x + T.RF_FX.tile > 100 || y + T.RF_FX.tile > 100) say(`орбита: место вне круга или не целое — ${[x, y, tx, ty].join(', ')}`);
}

/* ---------- 6. перековка ушла из листов героя, переходы в окно ---------- */
{
  reset();
  if (T.OV.eqforge || T.OV.zptalforge) say('лист перековки снаряжения или талисманов остался — перековка живёт в своём окне');
  if (T.ACT.talforge || T.ACT.eqforge) say('прежние действия talforge или eqforge остались');
  const tal = read('screens/talismans.js'), eq = read('screens/equipment.js');
  if (/function tlForgeHtml|talforge\(|'forge', 'Перековка'/.test(tal)) say('screens/talismans.js: перековка осталась в листе талисманов');
  if (/eqforge\(|function eqForgePick|forge\(op, r\) \{/.test(eq)) say('screens/equipment.js: перековка осталась в снаряжении');
  /* лист талисманов героя — только его разметка: карточку героя рисуют другие экраны */
  const h = T.S.heroes[0];
  T.S.selHero = h.id; T.S.seg.tal = 'fit';
  let s = '';
  try { s = T.OV.tal({ t: 'tal', arg: `${h.id}:0` }) || ''; } catch (e) { warn.push(`лист талисманов героя не рисуется (${e.message}) — вкладка проверена по коду`); }
  if (/data-v="tal:forge"/.test(s)) say('лист талисманов героя: осталась вкладка «Перековка»');
  /* «Запасы»: карточки талисмана и снаряжения ведут в окно своим режимом и редкостью */
  reset(); T.S.seg.craft = 'stock';
  for (const [tab, m, kind] of [['tal', 'tal', 'tal'], ['eq', 'eq', 'equip']]) {
    T.S.zp.tab = tab; const e = T.zpEntries(tab).find(x => x.kind === kind);
    if (!e) { say(`«Запасы · ${tab}»: в демо пусто`); continue; }
    run('запасы', () => T.ACT.zpsel(e.key));
    const g = view(`запасы · ${tab}`);
    const mm = g.match(new RegExp(`data-a="rfgo" data-v="${m}:(\\d)"`));
    if (!mm) { say(`«Запасы · ${tab}»: в карточке нет перехода в окно перековки`); continue; }
    run('переход', () => T.ACT.rfgo(`${m}:${mm[1]}`));
    if (T.S.seg.craft !== 'reforge' || T.S.seg.rf !== m || T.S.rf.sel[m] !== +mm[1]) say(`«Запасы · ${tab}»: переход открыл не окно перековки нужного режима`);
    view(`после перехода · ${m}`);
    T.S.seg.craft = 'stock';
  }
  /* лист «Артель» ритуалов — кнопка «Перековка рабочих» */
  reset(); T.S.route = 'rituals'; T.S.seg.rituals = 'work'; T.S.overlay = { t: 'rtart' };
  const art = view('лист «Артель»');
  if (!art.includes('data-a="rfgo" data-v="work"')) say('лист «Артель»: нет кнопки «Перековка рабочих»');
  run('из артели', () => T.ACT.rfgo('work')); if (T.S.route !== 'craft' || T.S.seg.craft !== 'reforge' || T.S.seg.rf !== 'work' || T.S.overlay) say('лист «Артель»: кнопка не открыла окно перековки рабочих');
}

/* ---------- 7. показ итога ---------- */
{
  reset(); open('tal', 1); T.S.wallet.gold = 10000000; timers.length = 0;
  const need = T.TL.rules.reforge.need;
  run('«Повторы»', () => T.ACT.rfhelp('tal:1:dup'));
  for (const k of freeKeys('tal', 1)) { if (picked('tal', 1).length >= need) break; if (!picked('tal', 1).includes(k)) tap('tal', 1, k); }
  const n0 = tlCount(1), h0 = view('до перековки'), b = forgeBtn(h0), sel = picked('tal', 1);
  if (!b || b.off) say('показ: «Перековать» не доступна при полном выборе');
  else {
    run('перековка', () => T.ACT.rfforge(b.v)); cnt.ops++;
    const fx = T.S.rf.fx;
    if (tlCount(1) !== n0 - need) say('показ: итог не выдан до анимации');
    if (picked('tal', 1).length || T.S.rf.pick.tal) say('показ: после перековки отметки остались');
    if (!fx) say('показ: анимации нет');
    else if (JSON.stringify(fx.gone) !== JSON.stringify(ids('tal', sel))) say('показ: на орбите не то, что было отмечено, или не в том порядке');
    const h = view('показ итога');
    if (!/class="rf-ring rf-anim"/.test(h)) say('показ: круг не в анимации');
    if ((h.match(/class="rf-it rf-fly"/g) || []).length !== need) say('показ: на орбите не все ушедшие');
    const ms = [...h.matchAll(/--(?:dt|tt):(-?[\d.]+)ms/g)].map(x => x[1]);
    if (ms.length < 10 || ms.some(x => !/^-?\d+$/.test(x))) say('показ: моменты в разметке не целые мс');
    if (!h.includes('data-a="rfskip"')) say('показ: нажатие на круг не ведёт к итогу');
    if (!timers.some(t => t.ms === T.RF_FX.end)) say('показ: нет таймера конца показа');
    run('повтор кнопки', () => T.ACT.rfforge(b.v)); if (tlCount(1) !== n0 - need) say('показ: повтор кнопки перековал второй раз');
    run('пропуск', () => T.ACT.rfskip());
    const d = view('итог');
    if (T.S.rf.fx || d.includes('rf-anim')) say('показ: нажатие не закончило показ');
    if (!/<div class="rf-out"[^>]*><span class="eyebrow">Вышло<\/span>/.test(d) || !d.includes('class="rf-res"')) say('показ: после показа нет итога в центре и строки «Вышло»');
    const end = timers.find(t => t.ms === T.RF_FX.end); if (end) run('таймер', () => end.f());
    /* новая отметка убирает «Вышло» */
    tap('tal', 1, freeKeys('tal', 1)[0]);
    if (/<span class="eyebrow">Вышло<\/span>/.test(view('новая отметка'))) say('показ: после новой отметки осталось «Вышло»');
  }
  /* «меньше движения» — без анимации, итог сразу */
  reduced = true; reset(); open('eq', 1); T.S.wallet.gold = 10000000;
  run('«Слабые»', () => T.ACT.rfhelp('eq:1:weak'));
  const h = view('меньше движения · до'), b2 = forgeBtn(h);
  if (b2 && !b2.off) { run('перековка', () => T.ACT.rfforge(b2.v)); cnt.ops++; if (T.S.rf.fx) say('«меньше движения»: анимация идёт'); const d = view('меньше движения · итог'); if (!/<span class="eyebrow">Вышло<\/span>/.test(d)) say('«меньше движения»: итог не показан'); }
  else say('«меньше движения»: «Перековать» не доступна при полном выборе');
  reduced = false;
  /* рабочие: предупреждение, если артели не хватит на полную бригаду */
  reset(); open('work', 1); T.S.wallet.gold = 10000000; T.S.rituals.artel = T.S.rituals.artel.filter(w => w.r === 1 || T.rtBusyW().has(w.id)).slice(0, 4);
  while (freeKeys('work', 1).length < T.RT.rules.forge.need) T.S.rituals.artel.push({ id: 'мало' + T.S.rituals.artel.length, r: 1 });
  run('«Любые»', () => T.ACT.rfhelp('work:1:any'));
  const wv = view('рабочие · мало');
  if (T.S.rituals.artel.length - T.RT.rules.forge.need + 1 < T.RT.rules.unique.crew && !/<small class="warn">В артели останется/.test(wv)) say('рабочие: нет предупреждения о бригаде');
}

/* ---------- 8. UI-кит и сценарии ---------- */
for (const team of [false, true]) {
  reset(); run('режим', () => T.setTeam(team));
  const k = T.KIT_EXTRA.find(x => x.html === T.rfKitHtml);
  if (!k) { say('UI-кит: раздела «Перековка» нет в KIT_EXTRA'); break; }
  const h = run('UI-кит', () => k.html());
  if (typeof h !== 'string' || !h.includes('Перековка')) say('UI-кит: раздел «Перековка» не рисуется');
  else {
    const x = h.match(/.{0,40}(?:undefined|NaN|\[object ).{0,40}/); if (x) say(`UI-кит: в разметке «${x[0]}»`);
    if (!team) scan(h, 'UI-кит · Перековка');
    if (/data-a="(?!noop")[^"]*"/.test(h.replace(/<div class="k-air-r"><b>Рабочие[\s\S]*?<\/div><\/div>/, ''))) warn.push('UI-кит: в образцах есть живые действия');
    for (const t of ['свободна', 'отмечена', 'надета', 'в ритуале']) if (!h.includes(`<figcaption>${t}</figcaption>`)) say(`UI-кит: нет состояния клетки «${t}»`);
    if (!/class="rf-ph"/.test(h) || !/class="rf-ring"/.test(h)) say('UI-кит: нет счётчика с подсказками или наковальни');
  }
  for (const name of ['Перековка · талисманы', 'Перековка · итог', 'Перековка · рабочие', 'Снаряжение · перековка']) {
    reset(); run('режим', () => T.setTeam(team));
    const F = T.FLOWS.find(x => x[0] === name); if (!F) { say(`нет сценария «${name}»`); continue; }
    run('сценарий ' + name, () => F[2]()); const g = view(`${team ? 'Команда' : 'Игрок'} · сценарий «${name}»`);
    if (!g.includes('class="scr rf"')) say(`сценарий «${name}»: не открыл окно перековки`);
    if (name === 'Снаряжение · перековка' && T.S.seg.rf !== 'eq') say('сценарий «Снаряжение · перековка»: не режим снаряжения');
    if (name === 'Перековка · итог' && !T.S.rf.last.tal) say('сценарий «Перековка · итог»: перековки не было');
    if (name === 'Перековка · талисманы' && !picked('tal', T.RF_DATA.demo.r).length) say('сценарий «Перековка · талисманы»: подсказка ничего не отметила');
    if (name === 'Перековка · рабочие' && picked('work', T.RF_DATA.demo.r).length !== T.RF_MODES.work.need()) say('сценарий «Перековка · рабочие»: отмечено не столько, сколько нужно');
  }
}
run('режим «Игрок»', () => T.setTeam(false));
done();
