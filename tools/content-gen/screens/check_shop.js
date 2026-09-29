/* Автопроверка экрана «Ремесло → Лавка» прототипа — без браузера.
   Экран — design/ui/screens/shop.js и shop.css, договор — screens/model.js, правила — GDD §14.2, ADR-0014.
   1. shop.js и shop.css подключены в index.html после model.js; компилируется; концы строк своих файлов — CRLF; все классы lv-* описаны.
      Прежней лавки в index.html больше нет: shopView, INV.shop, стили .shop и .good; shopCost — только в shop.js.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Витрина по §14.2: десять товаров — восемь за золото, два за Энериум; без повторов; только ярусы пулов, без рун, трофеев
      и спойлеров; циклы не выше текущего; уникальный — не больше одного и по одному. Цена за золото — минимальная рынка × количество,
      за Энериум — LV_DATA. Витрина — от сида: тот же номер — те же товары; так на сотнях витрин и на всех циклах.
   4. «Правила воздуха»: карточка — значок, имя, цена: не больше двух чисел, одно действие, без чипов; подробности — в листе товара.
   5. Покупка — операция с номером: лист товара показывает цену и остаток кошелька; покупка списывает цену и кладёт товар в запасы
      один раз; повтор номера, номер без витрины, чужая витрина, купленное и нехватка — ничего не меняют.
   6. «Обновить»: бесплатные, потом за Энериум по цене дня до лимита, с подтверждением цены; повтор номера не повторяет расход;
      срок новых товаров — сервер кладёт новую витрину без номера операции.
   7. Раздел UI-кита «Лавка», карта экранов — ready, сценарий презентации; в режиме «Игрок» — ни одного служебного слова;
      ключевые кадры lv-* — только transform и opacity.
   Запуск: node tools/content-gen/screens/check_shop.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { strip, playerText, SERVICE } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const html = fs.readFileSync(path.join(UI, 'index.html'), 'utf8');
const JS = fs.readFileSync(path.join(UI, 'screens', 'shop.js'), 'utf8');
const CSS = fs.readFileSync(path.join(UI, 'screens', 'shop.css'), 'utf8');
const err = [], warn = [];
let drawn = 0;

/* 1. файлы */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const order = scripts.map(s => s.src || '');
if (!html.includes('href="screens/shop.css"')) err.push('index.html: не подключён screens/shop.css');
if (order.indexOf('screens/shop.js') < 0) err.push('index.html: не подключён screens/shop.js');
else if (order.indexOf('screens/shop.js') < order.indexOf('screens/model.js')) err.push('index.html: shop.js подключён раньше model.js');
try { new vm.Script(JS, { filename: 'shop.js' }); } catch (e) { err.push('синтаксис shop.js: ' + e.message); }
for (const [f, t] of [['shop.js', JS], ['shop.css', CSS]]) {
  const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
  if (crlf !== lf) err.push(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`);
}
const defined = new Set((CSS.match(/\.lv-[a-z0-9-]+/g) || []).map(s => s.slice(1)));
for (const c of new Set(JS.match(/\blv-[a-z0-9-]+/g) || [])) if (!defined.has(c)) err.push(`shop.css: не описан класс ${c}`);
/* прежняя лавка убрана из index.html; shopCost живёт в shop.js */
const inline = scripts.filter(s => !s.src).map(s => s.code).join('\n');
for (const [re, what] of [[/function shopView\b/, 'функция shopView'], [/\bINV\.shop\b|^\s*shop:\s*\{/m, 'данные INV.shop'], [/const shopCost\b/, 'shopCost'], [/\n\.shop\{|\n\.good\{|\n\s*\.good \.well|\n\.good b\{/, 'стили .shop и .good'], [/class="good\b|class="shop\b/, 'разметка прежней лавки']])
  if (re.test(re.source.includes('\\n') ? html : inline)) err.push(`index.html: осталась прежняя лавка — ${what}`);
if (err.length) done();

/* 2. песочница */
const stubEl = id => ({ id, innerHTML: '', textContent: '', value: '', style: { setProperty() {} }, dataset: {}, children: [],
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x,
  insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 });
const els = {};
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
  createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: stubEl('html'), activeElement: null, fonts: null };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? fs.readFileSync(path.join(UI, s.src), 'utf8') : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { (/^screens\/(?!shop|model)/.test(s.src || '') ? warn : err).push(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
vm.runInContext(`globalThis.__lv = {
  get S() { return S; }, reset() { S = initialState(); S.route = 'craft'; S.seg.craft = 'shop'; S.overlay = null; },
  html() { render(); return document.getElementById('game').innerHTML; },
  ACT, BAG, OV, LV_DATA, LV_SRV, EN_RECIPES, FLOWS, KIT_EXTRA, MAP, CRAFT_SEGS, shopCost, mkMin, lvKitHtml, lvView,
};`, ctx);
const W = win.__lv, A = W.ACT, D = W.LV_DATA, R = W.EN_RECIPES;

/* что игрок видеть не должен: спойлеры цикла VI; служебное — слова и шаблоны check_player_view.js */
const legit = R.items.filter(i => !i.team).map(i => i.n + '\n' + i.lore).join('\n');
const leaks = R.items.filter(i => i.team && !legit.includes(i.n)).map(i => i.n);
const seenSvc = new Set();
function look(label, h) {
  drawn++;
  if (typeof h !== 'string' || !h) { err.push(label + ': пустая разметка'); return ''; }
  const bad = h.match(/undefined|NaN|\[object /);
  if (bad) err.push(`${label}: в разметке «${bad[0]}» — …${h.slice(Math.max(0, bad.index - 90), bad.index + 30).replace(/\s+/g, ' ')}…`);
  const dup = h.match(/<[a-z]+\b[^>]*?\s(style|class)="[^"]*"[^>]*?\s\1="/);
  if (dup) err.push(`${label}: в теге дважды ${dup[1]}`);
  for (const n of leaks) if (h.includes(n)) err.push(`${label}: спойлер цикла VI — «${n}»`);
  const i = h.indexOf('<main'), part = i < 0 ? h : h.slice(i), v = strip(part);
  const txt = playerText(part).split('\n').concat([...v.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => m[1]));
  for (const t of txt) for (const [what, re] of SERVICE) {
    const k = what + '|' + t; if (!re.test(t) || seenSvc.has(k)) continue;
    seenSvc.add(k); err.push(`${label}: игроку видно служебное (${what}) — «${t.slice(0, 100)}»`);
  }
  return h;
}
const view = label => look(label, W.html());
function scene(label, f) {
  try { f(); }
  catch (e) { err.push(`${label}: исключение — ${e.message}\n    ${(e.stack || '').split('\n').slice(1, 4).join('\n    ')}`); }
}
const eq = (label, a, b) => { if (a !== b) err.push(`${label}: ожидалось ${JSON.stringify(b)}, получено ${JSON.stringify(a)}`); };
const ok = (label, c) => { if (!c) err.push(label); };
const snap = () => JSON.stringify({ w: W.S.wallet, b: W.S.bag.items, sold: W.S.sold, gen: W.S.lv.gen, shop: W.S.shop });
const cards = h => [...h.matchAll(/<button class="lv-card[^"]*"[\s\S]*?<\/button>/g)].map(m => m[0]);
const TOTAL = D.slots.reduce((a, s) => a + s.n, 0);
const fmtN = n => Number(n).toLocaleString('ru-RU');   // как fmt прототипа
const ROMAN_ = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/* 3. витрина по §14.2 — на сотнях витрин и на всех циклах */
function rules(label, goods, cyc) {
  eq(`${label}: товаров`, goods.length, TOTAL);
  const ids = goods.map(g => g[0]);
  ok(`${label}: повтор товара`, new Set(ids).size === ids.length);
  let at = 0, uniq = 0;
  for (const sl of D.slots) for (let k = 0; k < sl.n; k++, at++) {
    const g = goods[at]; if (!g) continue;
    const it = W.BAG.item(g[0]), where = `${label} · ${g[0]}`;
    if (!it) { err.push(`${where}: нет в recipes.js`); continue; }
    const line = sl.pool.find(([t]) => t === it.tier);
    ok(`${where}: ярус ${it.tier} не из пула места`, !!line);
    ok(`${where}: спойлер цикла VI`, !it.team);
    ok(`${where}: лавка продаёт руны (ADR-0014)`, !['rune', 'vshard', 'valor'].includes(it.tier));
    ok(`${where}: предмет цикла ${it.cyc} выше текущего ${cyc}`, it.pool || it.cyc <= cyc);
    eq(`${where}: валюта места`, g[2], sl.cur);
    if (line) eq(`${where}: количество`, g[1], line[2]);
    const [c, p] = W.shopCost(g);
    ok(`${where}: цена не целое больше нуля`, Number.isInteger(p) && p > 0);
    if (c === 'gold') eq(`${where}: цена за золото — минимальная рынка × количество`, p, W.mkMin(g[0]) * g[1]);
    else eq(`${where}: цена в Энериуме — из LV_DATA`, p, D.enerium[it.tier][it.cyc - 1]);
    if (it.tier === 'unique') { uniq++; eq(`${where}: уникальный — по одному`, g[1], 1); }
  }
  ok(`${label}: уникальных больше ${D.uniqueMax}`, uniq <= D.uniqueMax);
  return uniq;
}
scene('витрина', () => {
  W.reset();
  const cyc = W.S.acc.cycle;
  rules('витрина демо', W.S.shop, cyc);
  eq('за золото', W.S.shop.filter(g => g[2] === 'gold').length, D.slots.filter(s => s.cur === 'gold').reduce((a, s) => a + s.n, 0));
  eq('за Энериум', W.S.shop.filter(g => g[2] === 'enerium').length, D.slots.filter(s => s.cur === 'enerium').reduce((a, s) => a + s.n, 0));
  ok('витрина от сида: тот же номер — те же товары', JSON.stringify(W.LV_SRV.roll(7, cyc)) === JSON.stringify(W.LV_SRV.roll(7, cyc)));
  ok('другой номер — другая витрина', JSON.stringify(W.LV_SRV.roll(7, cyc)) !== JSON.stringify(W.LV_SRV.roll(8, cyc)));
  let withU = 0;
  const N = 300;
  for (let g = 1; g <= N; g++) if (rules('витрина ' + g, W.LV_SRV.roll(g, cyc), cyc)) withU++;
  ok(`уникальный — редко: в ${withU} из ${N} витрин`, withU > 0 && withU * 10 < N * 3);   // меньше 30 % витрин
  console.log(`Уникальный ресурс — в ${withU} из ${N} витрин цикла ${ROMAN_[cyc]}.`);
  for (let c = 1; c <= 6; c++) for (let g = 1; g <= 12; g++) rules(`цикл ${c} · витрина ${g}`, W.LV_SRV.roll(g, c), c);
  ok('с циклом пул растёт', W.LV_SRV.pool('key', 2).length > W.LV_SRV.pool('key', 1).length);
});

/* 4. экран и воздух */
scene('экран', () => {
  W.reset();
  ok('сегмент «Лавка» — экран shop.js', W.CRAFT_SEGS.shop === W.lvView);
  const h = view('витрина');
  const cs = cards(h);
  eq('карточек на витрине', cs.length, TOTAL);
  cs.forEach((c, i) => {
    const txt = playerText(c).replace(/\s+/g, ' ');
    const nums = (txt.match(/\d[\d\s]*/g) || []).map(s => s.trim()).filter(Boolean);
    ok(`карточка ${i}: больше двух чисел — «${txt}»`, nums.length <= 2);
    ok(`карточка ${i}: действие не одно`, (c.match(/<button/g) || []).length === 1 && (c.match(/data-a="/g) || []).length === 1);
    ok(`карточка ${i}: чип на карточке`, !c.includes('class="chip'));
    ok(`карточка ${i}: нет кристалла редкости`, c.includes('lv-cr') && /data-r="\d"/.test(c));
    ok(`карточка ${i}: нет цены`, c.includes('lv-pr'));
  });
  ok('шапка: срок новых товаров', h.includes('Новые товары через') && h.includes('data-cd="shop"'));
  ok('шапка: сколько осталось', h.includes(`осталось ${TOTAL} из ${TOTAL}`));
  ok('шапка: «Обновить» с номером операции', /data-a="lvref" data-v="lv\d+"/.test(h));
  ok('шапка: бесплатные обновления', h.includes(`бесплатно · ${D.refresh.free}`));
  ok('шапка: как устроена лавка', h.includes('data-a="lvinfo"'));
  ok('без прежней строки правил на экране', !/Уникальное — редко и по одной/.test(h));
  A.lvinfo(); const hi = view('как устроена лавка');
  ok('лист «Лавка»: правила', hi.includes('Новые товары приходят раз в 8 часов') && hi.includes('уникальный бывает редко'));
});

/* 5. покупка — операция с номером */
scene('покупка', () => {
  W.reset();
  for (let i = 0; i < W.S.shop.length; i++) {
    const g = W.S.shop[i], [c, p] = W.shopCost(g), where = `покупка ${i} · ${g[0]}`;
    A.buy(String(i));
    const o = W.S.overlay;
    ok(`${where}: лист товара`, !!o && o.t === 'lvbuy' && o.act === 'buydo' && /^\d+:lv\d+:\d+$/.test(o.v || ''));
    const have = W.S.wallet[c], h = view(where + ' · лист');
    ok(`${where}: цена в листе`, h.includes('<dt>Цена</dt>') && h.includes(`data-a="buydo" data-v="${o.v}"`));
    ok(`${where}: остаток кошелька после покупки`, h.includes('<dt>Останется</dt>') && h.includes(fmtN(have - p)));
    const b0 = W.BAG.qty(g[0]);
    A.buydo(o.v);
    eq(`${where}: списано`, W.S.wallet[c], have - p); eq(`${where}: в запасах`, W.BAG.qty(g[0]), b0 + g[1]);
    ok(`${where}: лист закрыт, строка «Куплено»`, !W.S.overlay && !!W.S.toast && /Куплено/.test(W.S.toast.t));
    const s1 = snap();
    A.buydo(o.v); eq(`${where}: повтор номера не покупает`, snap(), s1);
    A.buydo(String(i)); eq(`${where}: без номера не покупает`, snap(), s1);
    A.buy(String(i)); const again = W.S.overlay;
    A.buydo(again.v); eq(`${where}: купленное второй раз не купить`, snap(), s1);
    look(where + ' · куплено', W.html());
  }
  const h = view('всё раскуплено');
  ok('всё раскуплено — строка в шапке', h.includes('всё раскуплено'));
  eq('купленных карточек', (h.match(/class="lv-card sold/g) || []).length, TOTAL);
  eq('куплено всего', W.S.lv.buys, TOTAL);
});
scene('покупка: нехватка и чужая витрина', () => {
  W.reset();
  const i = W.S.shop.findIndex(g => g[2] === 'enerium'), g = W.S.shop[i], [c, p] = W.shopCost(g);
  W.S.wallet[c] = p - 1;
  let h = view('нехватка: витрина');
  ok('нехватка: цена цветом нехватки', /class="lv-card lack"[\s\S]*?lv-pr lack/.test(h));
  A.buy(String(i)); h = view('нехватка: лист');
  ok('нехватка: «Не хватает» и сколько', h.includes('<dt>Не хватает</dt>') && /data-a="buydo"[^>]*disabled/.test(h));
  const s0 = snap(); A.buydo(W.S.overlay.v);
  eq('нехватка: ничего не списано', snap(), s0); ok('нехватка: строка «Не хватает»', !!W.S.toast && /Не хватает 1 /.test(W.S.toast.t));
  W.S.wallet[c] = p * 10;
  A.buy(String(i)); const v = W.S.overlay.v;
  W.LV_SRV.auto();
  h = view('чужая витрина: лист');
  ok('чужая витрина: лист говорит, что товары сменились', h.includes('Товары уже сменились'));
  const s1 = snap(); A.buydo(v); eq('чужая витрина: ничего не куплено', snap(), s1);
  /* без денег — прежняя проверка прототипа */
  W.reset(); W.S.wallet.gold = 0; W.S.wallet.enerium = 0;
  const s2 = snap(); A.buydo('0'); eq('без денег и без номера — ничего', snap(), s2); eq('без денег: купленных нет', W.S.sold.length, 0);
  for (let k = 0; k < W.S.shop.length; k++) { A.buy(String(k)); A.buydo(W.S.overlay.v); }
  eq('без денег: ничего не куплено', W.S.sold.length, 0);
});

/* 6. обновление */
scene('обновление', () => {
  W.reset();
  const R0 = D.refresh, g0 = W.S.lv.gen;
  A.buy('0'); A.buydo(W.S.overlay.v);
  let h = view('до обновления');
  const op = (h.match(/data-a="lvref" data-v="(lv\d+)"/) || [])[1];
  const s0 = JSON.stringify(W.S.wallet);
  A.lvref(op);
  eq('бесплатное: новая витрина', W.S.lv.gen, g0 + 1); eq('бесплатное: купленное сброшено', W.S.sold.length, 0);
  eq('бесплатное: Энериум не тронут', JSON.stringify(W.S.wallet), s0); eq('бесплатных осталось', W.S.lv.free, R0.free - 1);
  rules('после обновления', W.S.shop, W.S.acc.cycle);
  const s1 = snap(); A.lvref(op); eq('повтор номера обновления ничего не меняет', snap(), s1);
  h = view('после обновления');
  ok('карточки выходят по одной', /class="lv-card[^"]*"[^>]*style="--i:\d+;--df:-?\d+ms"/.test(h));
  while (W.S.lv.free > 0) A.lvref((view('бесплатно').match(/data-a="lvref" data-v="(lv\d+)"/) || [])[1]);
  h = view('за Энериум');
  ok('«Обновить» — цена в Энериуме', /data-a="lvref"[^>]*>[\s\S]*?class="cost"/.test(h));
  for (let k = 0; k < R0.paid.length; k++) {
    const opk = (view('за Энериум ' + k).match(/data-a="lvref" data-v="(lv\d+)"/) || [])[1];
    A.lvref(opk);
    ok(`платное ${k}: подтверждение цены`, !!W.S.overlay && W.S.overlay.t === 'lvref');
    const hh = view('подтверждение обновления ' + k);
    ok(`платное ${k}: цена и остаток`, hh.includes('<dt>Цена</dt>') && hh.includes('<dt>Останется</dt>'));
    const e0 = W.S.wallet.enerium, gk = W.S.lv.gen;
    A.lvrefdo();
    eq(`платное ${k}: списано`, W.S.wallet.enerium, e0 - R0.paid[k]); eq(`платное ${k}: витрина`, W.S.lv.gen, gk + 1);
    const sk = snap(); A.lvrefdo(opk); eq(`платное ${k}: повтор ничего не меняет`, snap(), sk);
  }
  h = view('лимит дня');
  ok('лимит: «Обновить» недоступна', /class="btn sm lv-ref" disabled/.test(h));
  const sl = snap(); A.lvref(''); eq('лимит: ничего не меняет', snap(), sl); ok('лимит: строка', !!W.S.toast && /закончились/.test(W.S.toast.t));
  /* нехватка Энериума на платное */
  W.reset(); W.S.lv.free = 0; W.S.wallet.enerium = D.refresh.paid[0] - 1;
  A.lvref((view('нехватка Энериума').match(/data-a="lvref" data-v="(lv\d+)"/) || [])[1]);
  ok('нехватка Энериума: кнопка недоступна', /data-a="lvrefdo"[^>]*disabled/.test(view('нехватка Энериума: подтверждение')));
  const sn = snap(); A.lvrefdo(); eq('нехватка Энериума: ничего', snap(), sn);
  /* срок новых товаров — сервер, без номера операции */
  W.reset(); const ga = W.S.lv.gen, fa = W.S.lv.free;
  W.LV_SRV.auto();
  eq('срок: новая витрина', W.S.lv.gen, ga + 1); eq('срок: снова 8 часов', W.S.lv.next, D.autoSec); eq('срок: бесплатные не тратятся', W.S.lv.free, fa);
});

/* 7. UI-кит, карта экранов, сценарий, стили */
scene('UI-кит, карта, сценарий', () => {
  W.reset();
  ok('раздел в KIT_EXTRA', W.KIT_EXTRA.some(x => x.html === W.lvKitHtml));
  const k = look('UI-кит · Лавка', W.lvKitHtml());
  ok('UI-кит: заголовок', k.includes('Лавка · витрина из десяти товаров'));
  eq('UI-кит: образцы карточек', (k.match(/<div class="lv-card/g) || []).length, 4);
  eq('UI-кит: состояния «Обновить»', (k.match(/class="btn sm lv-ref"/g) || []).length, 3);
  ok('UI-кит: образцы без действий', !/data-a="(buy|lvref)"/.test(k));
  const m = W.MAP.find(x => x.n === 'Ремесло');
  ok('карта экранов: лавка готова', !!m && (m.ready || []).includes('shop'));
  ok('карта экранов: мастерская готова', !!m && (m.ready || []).includes('craft'));
  const f = W.FLOWS.find(x => x[0] === 'Лавка · покупка');
  if (!f) err.push('нет сценария «Лавка · покупка»');
  else { W.reset(); f[2](); ok('сценарий: лист товара', !!W.S.overlay && W.S.overlay.t === 'lvbuy'); view('сценарий «Лавка · покупка»'); }
  const kf = [...CSS.matchAll(/@keyframes\s+(lv-[a-z0-9-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
  ok('ключевые кадры лавки найдены', kf.length >= 3);
  for (const [, name, body] of kf) {
    const bad = [...body.matchAll(/([a-z-]+)\s*:/g)].map(x => x[1]).filter(p => p !== 'transform' && p !== 'opacity');
    if (bad.length) err.push(`@keyframes ${name}: анимирует не только transform и opacity — ${[...new Set(bad)].join(', ')}`);
  }
  ok('«меньше движения» выключает анимацию лавки', /prefers-reduced-motion:reduce/.test(CSS));
});

console.log(`Разметок проверено: ${drawn}. Витрина по §14.2 на ${300 + 72} наборах, экран и воздух карточек, покупка с номером, нехватка, чужая витрина, обновления — бесплатные, за Энериум, лимит, срок; UI-кит, карта, сценарий.`);
done();

function done() {
  if (warn.length) console.log('Предупреждения:\n' + warn.join('\n'));
  if (err.length) { console.log('ОШИБКИ:\n' + err.slice(0, 40).join('\n') + (err.length > 40 ? `\n… и ещё ${err.length - 40}` : '')); process.exit(1); }
  console.log('Проверка пройдена: «Лавка» — десять товаров по §14.2, покупка и обновление — операции с номером, повтор ничего не меняет.');
  process.exit(0);
}
