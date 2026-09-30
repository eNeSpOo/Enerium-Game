/* Автопроверка Лавки Энериума (design/ui/screens/store.js, данные design/ui/store.js) — без браузера. Слово автора 30.09.2026: пять
   стартовых наборов цепочкой, все ×2; пять наборов Энериума; три выдачи раз в день; боевой пропуск за деньги; лимитированные предложения;
   реклама за Энериум по желанию, с попапом. Черновик — docs/content/монетизация.md.
   1. Файлы: index.html подключает данные store.js после pass.js, экран screens/store.js — после screens/pass.js, стили screens/store.css;
      компилируется; концы строк экрана и стилей — CRLF; все классы st- из экрана описаны в стилях.
   2. Данные свежие: сборщик tools/content-gen/store/build.js без ошибок, store.js и таблицы черновика совпадают со сборкой; всё целое;
      рунные ключи и души — только в стартовых наборах.
   3. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   4. Вкладки: «Наборы», «Энериум», «Выдача», «Пропуск»; облика в продаже нет — строка витрины ведёт в «Облик».
   5. Стартовая цепочка: продаётся одна ступень — следующая за купленной; не по порядку — отказ, ступень второй раз — отказ; выдача —
      ровно состав ×2; повтор номера ничего не выдаёт; после пятой — «все пять собраны».
   6. Наборы Энериума: первая покупка каждого ×2, дальше без удвоения; цена — область игрока: рубли или доллары.
   7. Выдача: сегодняшняя порция сразу, дальше — письмом во Входящие в каждые сутки, письмо выдаёт Энериум; повторная покупка в тот же день
      не выдаёт порцию второй раз; больше 90 дней вперёд — отказ; дни кончились — писем нет.
   8. Предложения: открывает сервер, открытие — одно; покупка не больше лимита; срок — датой, без секунд; закрылось — отказ.
   9. Реклама: попап — только по нажатию игрока, «Не сейчас» ничего не меняет; награда — за досмотренный ролик, один раз на номер;
      два ролика в сутки, третий — отказ; закрыл ролик — награды нет; новые сутки — снова два.
   10. Пропуск за деньги: покупка ряда — «сервер» Лавки, Энериум не списывается, второй раз — отказ.
   11. Честность и воздух: у каждого товара лист «что придёт» до оплаты с ценой; на карточках наборов, выдачи и предложений — не больше двух
       чисел вне чипов и кнопок; торопящих слов нет; анимации — только transform и opacity; есть «меньше движения».
   12. Арт: пока путь не в EN_STORE.art.ready — ни одной ссылки на store/…; выгруженный — AV с версией.
   13. UI-кит, карта экранов, сценарии; режим «Игрок» — ни одного служебного слова.
   Запуск: node tools/content-gen/screens/check_store.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { strip, playerText, SERVICE } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const JS = read('screens/store.js'), CSS = read('screens/store.css');
const err = [];
const cnt = { views: 0, ops: 0, sheets: 0, buys: 0 };
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Лавка Энериума: отрисовок ${cnt.views}, листов ${cnt.sheets}, операций «сервера» ${cnt.ops}, покупок ${cnt.buys}.`);
  console.log('Проверка пройдена: стартовые наборы — цепочкой, все ×2, по одному; наборы — первая покупка ×2; выдача — письмом раз в сутки; предложения — датой и лимитом; реклама — по нажатию, два ролика в сутки; пропуск — за деньги; что придёт — до оплаты; повтор номера ничего не выдаёт; игроку служебного не видно.');
  process.exit(0);
}
const RUSH = /успей|последн(?:ий|яя) шанс|только сегодня|потеряешь|потеряете|спеши|осталось всего|не упусти|таймер/i;
const EQ_ = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const at = s => scripts.findIndex(x => x.src === s);
  const iD = at('store.js'), iP = at('pass.js'), iMain = scripts.findIndex(s => !s.src && /function initialState\(/.test(s.code));
  const iS = at('screens/store.js'), iSp = at('screens/pass.js');
  if (iD < 0) say('index.html: не подключены данные store.js');
  else { if (iD < iP) say('index.html: store.js подключён раньше pass.js'); if (iD > iMain) say('index.html: store.js подключён после основного скрипта'); }
  if (iS < 0) say('index.html: не подключён screens/store.js');
  else if (iS < iSp) say('index.html: screens/store.js подключён раньше screens/pass.js — вкладки Лавки оборачивают пропуск');
  if (!html.includes('href="screens/store.css"')) say('index.html: не подключён screens/store.css');
  try { new vm.Script(JS, { filename: 'screens/store.js' }); } catch (e) { say('синтаксис screens/store.js: ' + e.message); }
  for (const [f, t] of [['screens/store.js', JS], ['screens/store.css', CSS]]) {
    const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
    if (crlf !== lf) say(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`);
  }
  const defined = new Set((CSS.match(/\.st-[a-z0-9-]+/g) || []).map(s => s.slice(1)));
  const NOT_CLASS = new Set(['st-srv']);
  for (const c of new Set(JS.match(/\bst-[a-z0-9]+(?:-[a-z0-9]+)*/g) || [])) if (!defined.has(c) && !NOT_CLASS.has(c)) say(`store.css: не описан класс ${c}`);
}
if (err.length) done();

/* ================== 2. данные свежие ================== */
const SB = require('../store/build.js');
{
  const R = run('сборщик Лавки', () => SB.build());
  if (!R) done();
  for (const e of R.err || []) say('сборщик: ' + e);
  if (!R.err.length) {
    if (SB.render(R.data) !== fs.readFileSync(SB.FILES.out, 'utf8')) say('design/ui/store.js устарел — node tools/content-gen/store/build.js');
    const doc = fs.readFileSync(SB.FILES.doc, 'utf8'), fresh = SB.withTables(doc, R.tables);
    if (fresh == null) say('черновик монетизация.md: нет меток таблиц'); else if (fresh !== doc) say('таблицы черновика устарели — node tools/content-gen/store/build.js');
  }
}
if (err.length) done();

/* ================== 3. песочница ================== */
let reduced = false;
const stubEl = id => {
  const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, remove() {},
    animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
  e.querySelector = () => null;
  return e;
};
const els = {}, timers = [];
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
  createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: stubEl('html'), activeElement: null, fonts: null };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: reduced, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
const T = vm.runInContext(`({
  get S() { return S; }, set S(v) { S = v; },
  ACT, OV, SCREENS, FLOWS, KIT_EXTRA, MAP, KH, render, initialState, setTeam, psNewDay, stPriceTxt, stAdLink, stKitHtml,
  SH_SRV: typeof SH_SRV !== 'undefined' ? SH_SRV : null, PS_SRV, EN_STORE: window.EN_STORE, EnStore: window.EnStore, EN_PASS: window.EN_PASS,
})`, ctx);
const D = T.EN_STORE, SA = T.EnStore;
if (!D || !SA || !T.SH_SRV) { say('нет данных Лавки или «сервера»: EN_STORE, EnStore, SH_SRV'); done(); }
const reset = () => { T.S = T.initialState(); T.S.overlay = null; T.S.toast = null; timers.length = 0; };
const game = () => (els.game ? els.game.innerHTML : '');
const seenSvc = new Set();
function look(where, h) {
  cnt.views++;
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/undefined|NaN|\[object /);
  if (bad) say(`${where}: в разметке «${bad[0]}» — …${h.slice(Math.max(0, bad.index - 90), bad.index + 30).replace(/\s+/g, ' ')}…`);
  if (T.KH.team) return h;
  const v = strip(h), txt = playerText(h).split('\n').concat([...v.matchAll(/\s(?:title|aria-label)="([^"]*)"/g)].map(m => m[1]));
  for (const t of txt) {
    for (const [what, re] of SERVICE) { const k = what + '|' + t; if (re.test(t) && !seenSvc.has(k)) { seenSvc.add(k); say(`${where}: игроку видно служебное (${what}) — «${t.slice(0, 110)}»`); } }
    if (RUSH.test(t)) say(`${where}: торопящие слова — «${t.slice(0, 110)}»`);
  }
  return h;
}
const draw = where => { run(where, () => T.render()); return look(where, game()); };
const ovOf = h => { const i = h.indexOf('<div class="ov"'); return i < 0 ? '' : h.slice(i); };
const mainOf = h => { const i = h.indexOf('<main'), j = h.indexOf('<div class="ov"'); return i < 0 ? '' : h.slice(i, j > i ? j : undefined); };
const sheetOf = (where, t, arg) => { T.S.overlay = { t, arg }; cnt.sheets++; return ovOf(draw(where)); };
const wallet = () => JSON.parse(JSON.stringify(T.S.wallet));
const delta = (a, b) => Object.fromEntries(Object.keys(Object.assign({}, a, b)).sort().map(k => [k, (b[k] || 0) - (a[k] || 0)]).filter(([, v]) => v));
const op = () => 'st' + T.S.store.srv.seq;
const tab = (t, where) => { T.S.overlay = null; T.S.route = 'store'; T.S.seg.store = t; return mainOf(draw(where)); };
/* числа карточки вне чипов, кнопок и срока */
const cardNums = h => playerText(h.replace(/<span class="chip[\s\S]*?<\/span>/g, '').replace(/<button[\s\S]*?<\/button>/g, '').replace(/<small class="st-until">[\s\S]*?<\/small>/g, '').replace(/<i class="st-x2[^"]*"[^>]*>[\s\S]*?<\/i>/g, '')).match(/\d[\d  ]*(?:[.,]\d+)?/g) || [];

/* ================== 4. вкладки ================== */
{
  reset();
  const m = T.SCREENS.store();
  const ids = (m.seg && m.seg.items || []).map(x => x[0]);
  if (!EQ_(ids, ['start', 'en', 'subs', 'pass'])) say(`Лавка: вкладки ${ids.join(', ')}, а надо «Наборы», «Энериум», «Выдача», «Пропуск»`);
  for (const [t, n] of [['start', 'Наборы'], ['en', 'Энериум'], ['subs', 'Выдача']]) {
    const h = tab(t, `Лавка · ${n}`);
    if (!/class="st-hall/.test(h)) say(`Лавка · ${n}: нет зала`);
    if (!/Облик не продаётся/.test(h) || !/data-a="sheet" data-v="look"/.test(h)) say(`Лавка · ${n}: нет строки «Облик не продаётся» с переходом`);
  }
  tab('pass', 'Лавка · Пропуск');
}

/* ================== 5. стартовая цепочка ================== */
{
  reset();
  const C = D.chain, n = C.steps.length;
  if (n !== 5 || C.x !== 2) say(`цепочка: ${n} наборов ×${C.x}, а по слову автора — 5, все ×2`);
  let h = tab('start', 'Наборы · демо');
  if (!h.includes(`data-a="stbuy" data-v="${C.steps[0].id}"`) || !/раз за игру/.test(h)) say('Наборы: нет первой ступени с «раз за игру»');
  if ((h.match(/class="st-rung /g) || []).length !== n) say('Наборы: в лесенке не пять ступеней');
  for (const [k, v] of C.steps[0].get) if (!new RegExp(`data-k="${k}"[^>]*>[\\s\\S]*?<b class="num">${String(v * C.x).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00a0\\u202f]?')}</b>`).test(h)) say(`Наборы: в витрине ${k} не ×2`);
  /* не по порядку — отказ без изменений */
  const w0 = wallet();
  let r = T.SH_SRV.buy('st:x2', C.steps[1].id); cnt.ops++;
  if (r.refuse !== 'order' || !EQ_(wallet(), w0)) say('цепочка: вторая ступень до первой не отказала или что-то изменила');
  /* по порядку: ровно состав ×2, повтор ничего, второй раз — отказ */
  const total = {};
  for (let i = 0; i < n; i++) {
    const s = C.steps[i], a = wallet(), o = op();
    const sh = sheetOf(`лист ступени ${i + 1}`, 'stbuy', s.id);
    if (!sh.includes(`data-a="stbuydo" data-v="${o}|${s.id}"`) || !sh.includes(T.stPriceTxt(s.id))) say(`ступень ${i + 1}: в листе нет покупки с номером и ценой`);
    r = T.SH_SRV.buy(o, s.id); cnt.ops++; cnt.buys++;
    const want = Object.fromEntries(s.get.map(([k, v]) => [k, v * C.x]).sort((x, y) => x[0] < y[0] ? -1 : 1));
    if (!r.res || !EQ_(delta(a, wallet()), want)) say(`ступень ${i + 1}: выдано ${JSON.stringify(delta(a, wallet()))}, а надо ${JSON.stringify(want)}`);
    for (const [k, v] of Object.entries(want)) total[k] = (total[k] || 0) + v;
    const b = wallet();
    r = T.SH_SRV.buy(o, s.id);
    if (!r.again || !EQ_(wallet(), b)) say(`ступень ${i + 1}: повтор номера выдал ещё раз`);
    r = T.SH_SRV.buy(op(), s.id);
    if (r.refuse !== 'once' || !EQ_(wallet(), b)) say(`ступень ${i + 1}: вторая покупка не отказала`);
    if (i < n - 1 && SA.chainAt(D, T.S.store) !== i + 2) say(`ступень ${i + 1}: не открылась следующая`);
  }
  if (total.keys !== D.econ.chain.keys || total.souls !== D.econ.chain.souls || total.enerium !== D.econ.chain.enerium) say('цепочка: итог не сходится с EN_STORE.econ.chain');
  h = tab('start', 'Наборы · все пять');
  if (!/все пять собраны/.test(h) || /data-a="stbuy" data-v="start\d"[^>]*>\d/.test(h.replace(/<div class="st-rungs[\s\S]*$/, ''))) say('Наборы: после пятой ступени витрина не «все пять собраны»');
  /* ACT: повтор нажатия ничего не выдаёт */
  reset(); const k0 = T.S.wallet.keys; T.ACT.stbuydo('st9|start1'); T.ACT.stbuydo('st9|start1'); T.ACT.stbuydo('st10|start1');
  if (T.S.wallet.keys - k0 !== C.steps[0].get.find(x => x[0] === 'keys')[1] * C.x) say('ACT.stbuydo: повтор или второе нажатие выдали ещё раз');
  if (!T.S.overlay || T.S.overlay.t !== 'stgot') say('покупка: нет показа получения');
  else { const g = ovOf(draw('получение')); if (!/class="st-got anim"/.test(g) || !/data-a="stskip"/.test(g)) say('получение: нет подъёма наград или «сразу итог»'); run('сразу итог', () => T.ACT.stskip()); if (/class="st-got anim"/.test(ovOf(draw('получение · итог')))) say('получение: нажатие не дало итог'); }
}

/* ================== 6. наборы Энериума ================== */
{
  reset();
  if (D.packs.length !== 5) say(`наборов Энериума ${D.packs.length}, а у автора — пять`);
  const h = tab('en', 'Энериум');
  const cards = [...h.matchAll(/<div class="st-pk[\s\S]*?<\/button><\/div>/g)].map(m => m[0]);
  if (cards.length !== 5) say(`Энериум: карточек ${cards.length}, а надо 5`);
  for (const c of cards) { const nums = cardNums(c); if (nums.length > 2) say(`Энериум: на карточке больше двух чисел — ${nums.join(', ')}`); }
  for (const p of D.packs) {
    const e = SA.packEn(D, p.id), a = wallet();
    let r = T.SH_SRV.buy(op(), p.id); cnt.ops++; cnt.buys++;
    if (!r.res || T.S.wallet.enerium - a.enerium !== e.first) say(`${p.n}: первая покупка — +${T.S.wallet.enerium - a.enerium}, а надо ×${p.firstX}: ${e.first}`);
    const b = wallet(); r = T.SH_SRV.buy(op(), p.id); cnt.ops++; cnt.buys++;
    if (!r.res || T.S.wallet.enerium - b.enerium !== e.n) say(`${p.n}: вторая покупка — +${T.S.wallet.enerium - b.enerium}, а надо ${e.n}`);
  }
  /* область цен: рубли — «₽», доллары — «$…,99» */
  reset();
  const rub = T.stPriceTxt('en1'); T.S.store.region = 'us'; const us = T.stPriceTxt('en1');
  if (!/^\d[\d  ]* ₽$/.test(rub) || !/^\$\d+,\d\d$/.test(us)) say(`цена: рубли «${rub}», доллары «${us}»`);
  const hu = tab('en', 'Энериум · Запад');
  if (!hu.includes(us)) say('Энериум: цены Запада не в долларах');
  for (const id of Object.keys(D.tiers)) { const T2 = D.tiers[id]; if (T2.usd % 100 !== 99) say(`ступень ${id}: $ не …,99`); }
}

/* ================== 7. выдача ================== */
{
  reset();
  const s = D.subs[0], day0 = T.S.gift.today, a = wallet(), i0 = T.S.inbox.length;
  let r = T.SH_SRV.buy(op(), s.id); cnt.ops++; cnt.buys++;
  if (!r.res || T.S.wallet.enerium - a.enerium !== s.daily) say(`${s.n}: сегодняшняя порция не пришла сразу`);
  if (T.S.store.subs[s.id] !== s.days - 1) say(`${s.n}: впереди ${T.S.store.subs[s.id]} дней, а надо ${s.days - 1}`);
  /* та же покупка в тот же день — порции нет, дни прибавились */
  const b = wallet(); r = T.SH_SRV.buy(op(), s.id); cnt.ops++;
  if (!r.res || T.S.wallet.enerium !== b.enerium || T.S.store.subs[s.id] !== 2 * s.days - 1) say(`${s.n}: повторная покупка в тот же день выдала порцию или не прибавила ${s.days} дней`);
  /* больше maxDays вперёд — отказ: покупаем, пока сервер не откажет */
  let guard = 0;
  while (guard++ < 10) { const was = T.S.store.subs[s.id], e1 = T.S.wallet.enerium; r = T.SH_SRV.buy(op(), s.id); cnt.ops++; if (r.refuse) { if (r.refuse !== 'days' || T.S.store.subs[s.id] !== was || T.S.wallet.enerium !== e1) say(`${s.n}: отказ не «days» или что-то изменил`); break; } if (T.S.store.subs[s.id] > s.maxDays) say(`${s.n}: оплачено ${T.S.store.subs[s.id]} дней вперёд — больше ${s.maxDays}`); }
  if (guard >= 10 || T.S.store.subs[s.id] + s.days <= s.maxDays) say(`${s.n}: больше ${s.maxDays} дней вперёд не отказала`);
  const h = tab('subs', 'Выдача');
  const cards = [...h.matchAll(/<div class="st-sb[\s\S]*?(?:<\/button>|<\/span>)<\/div>/g)].map(m => m[0]);
  if (cards.length !== 3) say(`Выдача: карточек ${cards.length}, а надо 3`);
  for (const c of cards) { const nums = cardNums(c.replace(/<small class="st-sbl">[\s\S]*?<\/small>/, '')); if (nums.length > 2) say(`Выдача: на карточке больше двух чисел — ${nums.join(', ')}`); }
  if (!/не сгорает/.test(h) || !/не продлевается/.test(h)) say('Выдача: нет «не сгорает» и «сама не продлевается»');
  /* новые сутки — письмо с порцией; письмо выдаёт Энериум */
  T.psNewDay();
  const m = T.S.inbox.find(x => x.id === `st-${s.id}-${day0 + 1}`);
  if (!m || !EQ_(m.rew, [['enerium', s.daily]]) || T.S.inbox.length !== i0 + 1) say(`${s.n}: новые сутки — нет письма с порцией`);
  else { const e0 = T.S.wallet.enerium; T.ACT.claim(m.id); if (T.S.wallet.enerium - e0 !== s.daily) say(`${s.n}: письмо выдало не ${s.daily}`); }
  /* дни кончились — писем нет */
  T.S.store.subs[s.id] = 1; T.psNewDay(); const n1 = T.S.inbox.filter(x => String(x.id).startsWith(`st-${s.id}-`)).length; T.psNewDay();
  if (T.S.inbox.filter(x => String(x.id).startsWith(`st-${s.id}-`)).length !== n1 || T.S.store.subs[s.id] !== 0) say(`${s.n}: письма идут, когда дни кончились`);
}

/* ================== 8. предложения ================== */
{
  reset();
  const O = T.S.store.offers.find(o => o.left > 0);
  if (!O) say('предложения: у демо нет открытого предложения недели');
  else {
    const P = SA.product(D, O.id), K = D.offers.kinds[P.of];
    const h = tab('start', 'Наборы · предложение');
    const card = (h.match(/<div class="st-of"[\s\S]*?<\/button><\/div>/) || [''])[0];
    if (!card) say('Наборы: нет карточки предложения');
    else {
      if (!/до (?:пн|вт|ср|чт|пт|сб|вс), \d\d:\d\d<\/small>/.test(card)) say('предложение: срок не датой «до сб, 20:00»');
      if (/\d\d:\d\d:\d\d/.test(card)) say('предложение: срок с секундами — таймер');
      const nums = cardNums(card); if (nums.length > 2) say(`предложение: на карточке больше двух чисел — ${nums.join(', ')}`);
    }
    for (let i = 0; i < K.limit; i++) { const a = wallet(); const r = T.SH_SRV.buy(op(), O.id); cnt.ops++; cnt.buys++; if (!r.res || T.S.wallet.enerium - a.enerium !== P.get[0][1]) say(`предложение: покупка ${i + 1} выдала не ${P.get[0][1]}`); }
    const b = wallet(), r = T.SH_SRV.buy(op(), O.id);
    if (r.refuse !== 'limit' || !EQ_(wallet(), b)) say(`предложение: больше ${K.limit} раз не отказало`);
  }
  /* «Дар пути» открывает сервер — одно открытие; закрылось — отказ */
  reset();
  const id = `path${Math.min(6, Math.max(2, T.S.acc.cycle))}`;
  if (!T.SH_SRV.open(id)) say('«Дар пути»: сервер не открыл');
  if (T.SH_SRV.open(id)) say('«Дар пути»: открыт второй раз');
  if (T.S.store.offers.filter(o => o.left > 0).length > D.offers.maxActive) say('предложений открыто больше maxActive');
  T.S.store.offers.forEach(o => { if (o.id === id) o.left = 0; });
  const w = wallet(), r = T.SH_SRV.buy(op(), id);
  if (r.refuse !== 'gone' || !EQ_(wallet(), w)) say('закрытое предложение продано');
  for (const o of D.offers.list) for (const [k] of o.get) if (k !== 'enerium') say(`предложение ${o.id}: «${k}» — только Энериум`);
}

/* ================== 9. реклама ================== */
{
  reset();
  const A = D.ads, e0 = T.S.wallet.enerium;
  if (A.perView * A.dayCap < 10) say(`реклама: ${A.perView * A.dayCap} в день — меньше «от 10» автора`);
  /* попап не всплывает сам: без нажатия его нет ни на одной вкладке */
  for (const t of ['start', 'en', 'subs', 'pass']) { tab(t, `реклама · ${t}`); if (T.S.overlay) say(`вкладка ${t}: попап открылся сам`); }
  const strip2 = tab('en', 'реклама · строка');
  if (!/data-a="stad"/.test(strip2)) say('Энериум: нет строки рекламы с попапом');
  run('попап', () => T.ACT.stad());
  let p = ovOf(draw('попап рекламы'));
  if (!/data-a="stadgo"/.test(p) || !/Не сейчас/.test(p) || !/решаете вы/.test(p)) say('попап рекламы: нет «Смотреть», «Не сейчас» или «решаете вы»');
  run('не сейчас', () => T.ACT.close());
  if (T.S.wallet.enerium !== e0 || T.S.overlay) say('«Не сейчас»: что-то изменилось');
  /* досмотрел — награда один раз на номер */
  run('попап', () => T.ACT.stad()); const opA = (ovOf(draw('попап')).match(/data-a="stadgo" data-v="([^"]+)"/) || [])[1];
  run('смотреть', () => T.ACT.stadgo(opA)); cnt.ops++;
  if (!T.S.store.play) say('ролик не пошёл');
  p = ovOf(draw('ролик'));
  if (!/class="st-bar"/.test(p) || !/Закрыть без награды/.test(p)) say('ролик: нет полосы или «Закрыть без награды»');
  if (T.S.wallet.enerium !== e0) say('ролик: награда до конца ролика');
  const tm = timers.pop(); run('ролик досмотрен', () => tm && tm[0]());
  if (T.S.wallet.enerium - e0 !== A.perView) say(`реклама: награда ${T.S.wallet.enerium - e0}, а надо ${A.perView}`);
  const r2 = T.SH_SRV.ad(opA);
  if (!r2.again || T.S.wallet.enerium - e0 !== A.perView) say('реклама: повтор номера выдал ещё раз');
  for (let i = 1; i < A.dayCap; i++) { T.SH_SRV.ad('ad:x' + i); cnt.ops++; }
  const e1 = T.S.wallet.enerium, r3 = T.SH_SRV.ad('ad:сверх');
  if (r3.refuse !== 'cap' || T.S.wallet.enerium !== e1) say('реклама: сверх дневного потолка засчитано');
  T.S.overlay = null; const h3 = tab('en', 'реклама · на сегодня всё');
  if (/data-a="stad"/.test(h3)) say('реклама: после потолка строка всё ещё зовёт смотреть');
  T.psNewDay();
  if (SA.adLeft(D, T.S.store, T.S.gift.today) !== A.dayCap) say('реклама: новые сутки не вернули ролики');
  /* закрыл ролик — награды нет */
  run('попап', () => T.ACT.stad()); run('смотреть', () => T.ACT.stadgo('adstop')); const tm2 = timers.pop(); run('закрыть ролик', () => T.ACT.stadstop()); run('таймер после закрытия', () => tm2 && tm2[0]());
  if (T.S.wallet.enerium !== e1) say('реклама: закрытый ролик выдал награду');
  /* закрыл попап крестиком посреди ролика — награды нет */
  run('попап', () => T.ACT.stad()); run('смотреть', () => T.ACT.stadgo('adx2')); const tm3 = timers.pop(); run('крестик', () => T.ACT.close()); run('таймер после крестика', () => tm3 && tm3[0]());
  if (T.S.wallet.enerium !== e1 || T.S.store.play) say('реклама: попап закрыт крестиком посреди ролика — а награда выдана');
  /* строка в «Даре дня» — только ссылка на попап */
  if (!/data-a="stad"/.test(T.stAdLink())) say('«Дар дня»: нет строки рекламы');
}

/* ================== 10. пропуск за деньги ================== */
{
  reset();
  const w0 = wallet(), r = T.PS_SRV.buy('ps:проверка'); cnt.ops++;
  if (!r.res || !T.S.pass.paid || !EQ_(wallet(), w0)) say('пропуск: платный ряд не открыт за деньги или списан Энериум');
  if (!T.S.store.bought['pass:' + T.S.pass.no]) say('пропуск: сервер Лавки не запомнил покупку ряда');
  if (T.SH_SRV.buy(op(), 'pass').refuse !== 'bought') say('пропуск: ряд продан второй раз');
  const sh = sheetOf('лист «stbuy» пропуска', 'stbuy', 'pass');
  if (!/Платный ряд/.test(sh)) say('лист товара «pass» — не лист платного ряда');
}

/* ================== 11. честность, анимации ================== */
{
  reset();
  for (const id of [D.chain.steps[0].id, D.packs[0].id, D.subs[0].id, ...T.S.store.offers.map(o => o.id)]) {
    const sh = sheetOf(`лист ${id}`, 'stbuy', id);
    if (!sh.includes(T.stPriceTxt(id))) say(`лист ${id}: нет цены`);
    if (!/class="st-gi"/.test(sh)) say(`лист ${id}: не видно, что придёт`);
  }
  for (const m of CSS.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g))
    for (const d of m[2].matchAll(/([a-z-]+)\s*:/g)) if (!['transform', 'opacity'].includes(d[1])) say(`store.css: кадр ${m[1]} меняет ${d[1]} — только transform и opacity`);
  for (const m of CSS.matchAll(/transition\s*:\s*([^;}]+)/g)) for (const part of m[1].split(',')) { const p = part.trim().replace(/\s*!important$/, '').split(/\s+/)[0]; if (p !== 'none' && !['transform', 'opacity'].includes(p)) say(`store.css: переход по ${p}`); }
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(CSS)) say('store.css: нет «меньше движения»');
  reduced = true; reset(); T.ACT.stbuydo(`${op()}|${D.packs[0].id}`);
  if (!T.S.store.fx || !T.S.store.fx.done) say('«меньше движения»: показ не пропущен');
  reduced = false;
}

/* ================== 12. арт ================== */
{
  reset();
  const ready0 = D.art.ready.slice();
  D.art.ready.length = 0;
  let h = ['start', 'en', 'subs'].map(t => tab(t, `арт · не выгружен · ${t}`)).join('');
  if (/src="[^"]*store\//.test(h)) say('арт: ссылка на невыгруженную картинку');
  ready0.forEach(p => D.art.ready.push(p));
  h = tab('start', 'арт · выгружен');
  if (ready0.includes(D.art.map.start1) && !/<img class="st-pic[^"]*" src="[^"]*store\/start-1\.png\?v=/.test(h)) say('арт: стартовый набор не AV с версией');
  if (ready0.includes(D.art.map.hall) && !/<img class="st-bg" src="[^"]*store\/hall\.jpg\?v=/.test(h)) say('арт: зал не AV с версией');
}

/* ================== 13. UI-кит, карта, сценарии, режим «Игрок» ================== */
{
  for (const team of [false, true]) {
    run('режим', () => T.setTeam(team));
    reset();
    const k = T.KIT_EXTRA.find(x => { try { return x.html().includes('Лавка Энериума'); } catch (_) { return false; } });
    if (!k) say('UI-кит: нет раздела «Лавка Энериума»');
    else { const h = run('UI-кит', () => k.html()) || ''; if (/undefined|NaN|\[object /.test(h)) say('UI-кит: undefined или NaN'); if (!team && /EN_STORE/.test(strip(h))) say('UI-кит: служебное без team-only'); }
    const flows = T.FLOWS.filter(x => /^Лавка/.test(x[0]));
    if (flows.length < 5) say(`сценариев Лавки ${flows.length}, а надо не меньше пяти`);
    for (const [t, , f] of flows) { reset(); run('сценарий ' + t, () => f()); draw(`сценарий «${t}»${team ? ' [команда]' : ''}`); }
    reset();
    for (const t of ['start', 'en', 'subs']) tab(t, `вкладка ${t}${team ? ' [команда]' : ''}`);
    for (const id of [...D.chain.steps.map(s => s.id), ...D.packs.map(p => p.id), ...D.subs.map(s => s.id)]) sheetOf(`лист ${id}${team ? ' [команда]' : ''}`, 'stbuy', id);
    T.S.overlay = { t: 'stad' }; draw('попап' + (team ? ' [команда]' : ''));
  }
  run('режим «Игрок»', () => T.setTeam(false));
  const shop = T.MAP.find(m => m.n === 'Лавка Энериума');
  for (const id of ['forbidden-shop', 'battle-pass', 'subscriptions', 'checkout', 'ad-reward']) if (!shop || !(shop.ready || []).includes(id)) say(`карта экранов: «${id}» не отмечен готовым`);
}
done();
