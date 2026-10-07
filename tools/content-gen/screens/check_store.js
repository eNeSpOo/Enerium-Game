/* Автопроверка Лавки Энериума (design/ui/screens/store.js, данные design/ui/store.js) — без браузера. Слово автора 30.09.2026: пять
   наборов Энериума; три выдачи раз в день; боевой пропуск за деньги; лимитированные предложения; реклама за Энериум по желанию,
   с попапом. Слово автора 02.10.2026 (ADR-0047): 1 рубль = 1 Энериум. Слово автора 06.10.2026 (ADR-0054): ×2 разовых наборов — только
   самой первой покупке, набор выбирает игрок; у комплекта Энериума ×2 — на каждый, один раз на комплект. Расчёт — docs/content/монетизация.md.
   1. Файлы: index.html подключает данные store.js после pass.js, экран screens/store.js — после screens/pass.js, стили screens/store.css;
      компилируется; концы строк экрана и стилей — CRLF; все классы st- из экрана описаны в стилях.
   2. Данные свежие: сборщик tools/content-gen/store/build.js без ошибок, store.js и таблицы документа совпадают со сборкой; всё целое;
      рунные ключи и души — только в разовых наборах. Законы сборщика о курсе и ×2 проверены мутацией данных.
   3. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   4. Вкладки: «Наборы», «Энериум», «Выдача», «Пропуск»; облика в продаже нет — строка витрины ведёт в «Облик».
   5. Разовые наборы и ×2 — законы, каждый — функция, её же зовёт проверка мутацией:
      О — операция с номером: без номера — отказ, повтор номера ничего не выдаёт и ничего не запоминает, отказ ничего не меняет;
      П — порядок покупки любой: все 120 порядков пяти наборов проходят, каждый набор — раз за игру, второй раз — отказ;
      Д — ×2 разового набора — один раз на игру: удвоен весь состав самой первой покупки, какой бы набор ни был первым, остальные —
          как есть; сервер записал, кому досталось удвоение; чужие покупки его не тратят; итог худшего случая сходится со сборщиком;
      К — ×2 комплекта Энериума — один раз на комплект: первая покупка каждого удвоена, вторая и третья — нет; комплекты и разовые
          наборы удвоения друг у друга не отнимают;
      Л — честный показ: лист «что придёт» называет ровно то, что выдаст сервер, до и после удвоения; печать «×2» — у каждого комплекта,
          пока его ×2 ждёт; у разовых наборов — одна общая пометка «×2 — на первую покупку, набор на ваш выбор», пока удвоение ждёт,
          после — без пометки; плитки ряда выбирают набор для витрины.
   6. Наборы Энериума: пять карточек, не больше двух чисел; цена — область игрока: рубли или доллары.
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
   14. Мутации: каждая ломает «сервер», алгоритм или показ в песочнице — закон обязан упасть. Не упал — ошибка проверки.
   Запуск: node tools/content-gen/screens/check_store.js [--mut — напечатать, что закон нашёл у каждой поломки] */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { strip, playerText, SERVICE } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const JS = read('screens/store.js'), CSS = read('screens/store.css');
const SHOW_MUT = process.argv.includes('--mut');
const err = [];
const cnt = { views: 0, ops: 0, sheets: 0, buys: 0, orders: 0, mutData: 0, mut: 0 };
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Лавка Энериума: отрисовок ${cnt.views}, листов ${cnt.sheets}, операций «сервера» ${cnt.ops}, покупок ${cnt.buys}, порядков покупки разовых наборов ${cnt.orders}; мутаций данных ${cnt.mutData}, мутаций «сервера» и показа ${cnt.mut} — пойманы все.`);
  console.log('Проверка пройдена: курс — 1 рубль = 1 Энериум; разовые наборы — в любом порядке, каждый раз за игру, ×2 — только самой первой покупке, один раз на игру; наборы Энериума — ×2 первой покупки, один раз на набор; выдача — письмом раз в сутки; предложения — датой и лимитом; реклама — по нажатию, два ролика в сутки; пропуск — за деньги; что придёт — до оплаты, честным числом; повтор номера ничего не выдаёт; игроку служебного не видно.');
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

/* ================== 2. данные свежие; законы сборщика о курсе и ×2 ловят поломку данных ================== */
const SB = require('../store/build.js');
{
  const R = run('сборщик Лавки', () => SB.build());
  if (!R) done();
  for (const e of R.err || []) say('сборщик: ' + e);
  if (!R.err.length) {
    if (SB.render(R.data) !== fs.readFileSync(SB.FILES.out, 'utf8')) say('design/ui/store.js устарел — node tools/content-gen/store/build.js');
    const doc = fs.readFileSync(SB.FILES.doc, 'utf8'), fresh = SB.withTables(doc, R.tables);
    if (fresh == null) say('документ монетизация.md: нет меток таблиц'); else if (fresh !== doc) say('таблицы документа устарели — node tools/content-gen/store/build.js');
  }
  if (err.length) done();
  /* мутации данных: правим данные сборщика в памяти, сборщик обязан назвать ошибку; затем возвращаем как было.
     Числа поломок считаются от чистой сборки: закон недели дохода ловит именно худший случай — удвоен самый большой набор */
  const L = SB.ONCE.steps, last = L[L.length - 1], getI = (s, k) => s.get.findIndex(x => x[0] === k);
  const lim = { keys: R.keysDay * SB.LAWS.onceDays, souls: R.soulsDay * SB.LAWS.onceDays };
  /* самый большой набор получает столько, чтобы все пять без удвоения — и даже с удвоением самого малого — укладывались в неделю,
     а с удвоением самого большого — уже нет */
  const worst = k => { const others = R.onceSum[k] - last.get[getI(last, k)][1], v = Math.floor((lim[k] - others) / 2) + 1, first = L[0].get[getI(L[0], k)][1]; return others + v + first <= lim[k] && others + 2 * v > lim[k] ? v : null; };
  const swap = (obj, key, val) => { const had = key in obj, was = obj[key]; obj[key] = val; return () => { if (had) obj[key] = was; else delete obj[key]; }; };
  const DATA_MUT = [
    ['курс: база набора Энериума не по курсу автора', () => swap(SB.PACKS[1], 'en', SB.PACKS[1].en + 20)],
    ['курс: малый набор с прибавкой — уже не базовый курс', () => swap(SB.PACKS[0], 'bonusBp', 500)],
    ['курс: Энериум разового набора выгоднее курса автора', () => swap(L[2].get[getI(L[2], 'enerium')], 1, L[2].get[getI(L[2], 'enerium')][1] + 1)],
    ['курс: рубль автора — не один Энериум', () => swap(SB.RATE, 'en', 2)],
    ['×2 набора Энериума — не ×2', () => swap(SB.PACKS[0], 'firstX', 3)],
    ['×2 разовых наборов — не ×2', () => swap(SB.ONCE, 'x', 3)],
    ['неделя дохода: ключи — мимо худшего случая', () => { const v = worst('keys'); if (v == null) throw new Error('не подобрать число ключей'); return swap(last.get[getI(last, 'keys')], 1, v); }],
    ['неделя дохода: души — мимо худшего случая', () => { const v = worst('souls'); if (v == null) throw new Error('не подобрать число душ'); return swap(last.get[getI(last, 'souls')], 1, v); }],
    ['выдача хуже ×1,5 базового курса', () => swap(SB.SUBS[0], 'daily', Math.floor(SB.SUBS[0].daily * 2 / 3))],
    ['предложение выгоднее ×2 базового курса', () => swap(SB.OFFERS.list[0].get[0], 1, SB.OFFERS.list[0].get[0][1] + 100)],
    ['ключи в наборе Энериума', () => swap(SB.PACKS[2], 'keys', 5)],
  ];
  for (const [what, brk] of DATA_MUT) {
    let undo = null, got = [];
    try { undo = brk(); got = (SB.build().err || []); } catch (e) { say(`мутация данных «${what}»: не применилась — ${e.message}`); }
    if (undo) undo();
    if (SHOW_MUT) console.log(`мутация данных «${what}»: ${got.length ? got[0].slice(0, 200) : 'НЕ ПОЙМАНА'}`);
    if (got.length) cnt.mutData++; else say(`мутация данных «${what}»: законы сборщика её не поймали`);
  }
  const back = run('сборщик после мутаций', () => SB.build());
  if (!back || back.err.length) say('сборщик после мутаций данных: ' + ((back && back.err[0]) || 'не собрался'));
  else if (SB.render(back.data) !== fs.readFileSync(SB.FILES.out, 'utf8')) say('сборщик после мутаций данных: данные не вернулись');
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
  stState: typeof stState === 'function' ? s => stState(s) : null,
  SH_SRV: typeof SH_SRV !== 'undefined' ? SH_SRV : null, PS_SRV, EN_STORE: window.EN_STORE, EnStore: window.EnStore, EN_PASS: window.EN_PASS,
})`, ctx);
const D = T.EN_STORE, SA = T.EnStore;
if (!D || !SA || !T.SH_SRV || !T.stState) { say('нет данных Лавки или «сервера»: EN_STORE, EnStore, SH_SRV, stState'); done(); }
const reset = () => { T.S = T.initialState(); T.S.overlay = null; T.S.toast = null; timers.length = 0; };
/* только память Лавки заново — кошелёк остаётся: законы считают разницу */
const freshStore = () => { T.stState(T.S); T.S.overlay = null; };
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
const num = s => parseInt(String(s).replace(/\D/g, ''), 10);

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

/* ================== 5. разовые наборы и ×2: законы ==================
   Каждый закон — функция без аргументов → список нарушений: её же зовёт проверка мутацией (раздел 14) */
const C = D.chain, L5 = C.steps, ids5 = L5.map(s => s.id);
const X2_NOTE = '×' + C.x + ' — на первую покупку, набор на ваш выбор';
/* состав набора × множитель — в том же виде, что разница кошелька */
const comp = (s, x) => Object.fromEntries(s.get.map(([k, v]) => [k, v * x]).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const buy = id => { const a = wallet(), r = T.SH_SRV.buy(op(), id); cnt.ops++; if (r.res) cnt.buys++; return { r, d: delta(a, wallet()) }; };
/* числа листа «что придёт»: { вид по порядку строк: число } — строки st-gi, число — после «×» */
const sheetNums = sh => [...sh.matchAll(/<div class="st-gi"[^>]*>[\s\S]*?<b class="num gold">×([^<]*)<\/b><\/div>/g)].map(m => num(m[1]));
const LAW = {
  /* О — операция с номером */
  op() {
    const out = [];
    freshStore();
    let w = wallet(), r = T.SH_SRV.buy('', ids5[0]);
    if (r.refuse !== 'op' || !EQ_(wallet(), w)) out.push('покупка без номера не отказала или что-то выдала');
    const o1 = op(); r = T.SH_SRV.buy(o1, ids5[2]); cnt.ops++;
    if (!r.res) out.push('покупка разового набора с номером не прошла');
    else if (r.res.x !== C.x) out.push(`отказ до первой покупки потратил ×${C.x} разовых наборов: множитель первой покупки — ${r.res.x}`);
    w = wallet(); let mem = JSON.stringify(T.S.store);
    let again = T.SH_SRV.buy(o1, ids5[2]);
    if (!again.again || !EQ_(wallet(), w) || JSON.stringify(T.S.store) !== mem) out.push('повтор номера покупки разового набора выдал ещё раз или изменил память сервера');
    again = T.SH_SRV.buy(o1, ids5[4]);
    if (!again.again || !again.res || again.res.id !== ids5[2] || !EQ_(wallet(), w) || JSON.stringify(T.S.store) !== mem) out.push('тот же номер с другим товаром выдал товар');
    const o2 = op(); r = T.SH_SRV.buy(o2, D.packs[0].id); cnt.ops++;
    w = wallet(); mem = JSON.stringify(T.S.store);
    again = T.SH_SRV.buy(o2, D.packs[0].id);
    if (!again.again || !EQ_(wallet(), w) || JSON.stringify(T.S.store) !== mem) out.push('повтор номера покупки набора Энериума выдал ещё раз или изменил память сервера');
    r = T.SH_SRV.buy(op(), ids5[2]);
    if (r.refuse !== 'once' || !EQ_(wallet(), w) || JSON.stringify(T.S.store) !== mem) out.push('отказ во второй покупке разового набора что-то изменил');
    r = T.SH_SRV.buy(op(), 'нет-такого');
    if (r.refuse !== 'none' || !EQ_(wallet(), w) || JSON.stringify(T.S.store) !== mem) out.push('отказ «нет товара» что-то изменил');
    /* нажатия: повтор кнопки с тем же номером и второе нажатие с новым — одна выдача */
    freshStore();
    const k0 = T.S.wallet.keys || 0, o3 = op(), want = L5[0].get.find(x => x[0] === 'keys')[1] * C.x;
    T.ACT.stbuydo(`${o3}|${ids5[0]}`); T.ACT.stbuydo(`${o3}|${ids5[0]}`); T.ACT.stbuydo(`${op()}|${ids5[0]}`);
    if ((T.S.wallet.keys || 0) - k0 !== want) out.push(`нажатия «Купить»: повтор или второе нажатие выдали ещё раз — ключей ${(T.S.wallet.keys || 0) - k0}, а надо ${want}`);
    return out;
  },
  /* П — порядок покупки любой, каждый набор — раз за игру */
  order() {
    const out = [];
    for (const order of perms(ids5)) {
      freshStore(); cnt.orders++;
      for (const id of order) {
        if (SA.refuse(D, T.S.store, id, {}) !== null) { out.push(`порядок ${order.join(' → ')}: набор ${id} не продаётся — отказ «${SA.refuse(D, T.S.store, id, {})}»`); break; }
        const { r } = buy(id);
        if (!r.res) { out.push(`порядок ${order.join(' → ')}: покупка ${id} не прошла — «${r.refuse}»`); break; }
        const w = wallet(), r2 = T.SH_SRV.buy(op(), id);
        if (r2.refuse !== 'once' || !EQ_(wallet(), w)) { out.push(`порядок ${order.join(' → ')}: набор ${id} продан второй раз`); break; }
      }
      if (out.length) break;
      if (SA.onceLeft(D, T.S.store).length) out.push(`порядок ${order.join(' → ')}: после пяти покупок остались наборы ${SA.onceLeft(D, T.S.store).join(', ')}`);
      if (ids5.some(id => SA.count(T.S.store, id) !== 1)) out.push(`порядок ${order.join(' → ')}: набор куплен не один раз`);
      if (out.length) break;
    }
    return out;
  },
  /* Д — ×2 разового набора: только самая первая покупка, один раз на игру */
  x2once() {
    const out = [];
    freshStore();
    if (!SA.onceX2(D, T.S.store)) out.push('у нового игрока ×2 разовых наборов не ждёт');
    for (const s of L5) if (!EQ_(Object.fromEntries(SA.gets(D, T.S.store, s.id, 1).slice().sort((a, b) => (a[0] < b[0] ? -1 : 1))), comp(s, C.x))) out.push(`до первой покупки набор ${s.id} не обещает ×${C.x}`);
    /* память сервера: удвоение использовано, если записано, кому оно досталось, или если куплен хоть один разовый набор */
    if (SA.onceX2(D, { bought: { [ids5[1]]: 1 }, x2: { once: '' } })) out.push('набор куплен, записи нет — а ×2 снова ждёт');
    if (SA.onceX2(D, { bought: {}, x2: { once: ids5[1] } })) out.push('запись об удвоении есть — а ×2 снова ждёт');
    if (!SA.onceX2(D, { bought: {}, x2: {} }) || !SA.onceX2(D, {})) out.push('пустая память — а ×2 не ждёт');
    /* каждый набор первым: он удвоен целиком, остальные четыре — как есть; сервер записал, кому досталось */
    for (const first of L5) {
      freshStore();
      const sum = {};
      const a = buy(first.id);
      if (!a.r.res || !EQ_(a.d, comp(first, C.x))) out.push(`первым куплен ${first.id}: выдано ${JSON.stringify(a.d)}, а надо весь состав ×${C.x} — ${JSON.stringify(comp(first, C.x))}`);
      if (a.r.res && a.r.res.x !== C.x) out.push(`первым куплен ${first.id}: в ответе сервера множитель ${a.r.res.x}, а надо ${C.x}`);
      if (!T.S.store.x2 || T.S.store.x2.once !== first.id) out.push(`первым куплен ${first.id}: сервер не записал, кому досталось ×${C.x}`);
      if (SA.onceX2(D, T.S.store)) out.push(`первым куплен ${first.id}: ×${C.x} всё ещё ждёт`);
      for (const [k, v] of Object.entries(a.d)) sum[k] = (sum[k] || 0) + v;
      for (const s of L5) if (s !== first) {
        const b = buy(s.id);
        if (!b.r.res || !EQ_(b.d, comp(s, 1))) out.push(`первым куплен ${first.id}, затем ${s.id}: выдано ${JSON.stringify(b.d)}, а надо без удвоения — ${JSON.stringify(comp(s, 1))}`);
        if (b.r.res && b.r.res.x !== 1) out.push(`первым куплен ${first.id}, затем ${s.id}: в ответе сервера множитель ${b.r.res.x}`);
        for (const [k, v] of Object.entries(b.d)) sum[k] = (sum[k] || 0) + v;
      }
      if (T.S.store.x2.once !== first.id) out.push(`первым куплен ${first.id}: запись об удвоении переписана — ${T.S.store.x2.once}`);
      /* итог всех пяти: состав без удвоения и ещё один состав первого набора; худший случай — как у сборщика */
      for (const k of Object.keys(D.econ.chain.sum)) {
        const f = (first.get.find(x => x[0] === k) || [0, 0])[1], want = D.econ.chain.sum[k] + f * (C.x - 1);
        if ((sum[k] || 0) !== want) out.push(`первым куплен ${first.id}: всего ${k} — ${sum[k] || 0}, а надо ${want}`);
        if (first.id === D.econ.chain.top && (sum[k] || 0) !== D.econ.chain.max[k]) out.push(`худший случай (${first.id} первым): ${k} — ${sum[k] || 0}, а у сборщика ${D.econ.chain.max[k]}`);
        if ((sum[k] || 0) > D.econ.chain.max[k]) out.push(`первым куплен ${first.id}: ${k} — ${sum[k]}, больше худшего случая сборщика ${D.econ.chain.max[k]}`);
      }
    }
    /* чужие покупки удвоение разовых наборов не тратят: комплекты Энериума, выдача, предложение */
    freshStore();
    for (const p of D.packs) { buy(p.id); buy(p.id); }
    buy(D.subs[0].id);
    for (const o of T.S.store.offers.filter(x => x.left > 0)) buy(o.id);
    if (!SA.onceX2(D, T.S.store)) out.push('покупка наборов Энериума, выдачи или предложения потратила ×2 разовых наборов');
    const z = buy(ids5[3]);
    if (!EQ_(z.d, comp(L5[3], C.x))) out.push(`после наборов Энериума первая покупка разового набора — не ×${C.x}: ${JSON.stringify(z.d)}`);
    return out;
  },
  /* К — ×2 комплекта Энериума: первая покупка каждого, один раз на комплект */
  x2pack() {
    const out = [];
    freshStore();
    for (const p of D.packs) {
      const e = SA.packEn(D, p.id);
      if (e.first !== e.n * p.firstX) out.push(`${p.n}: первая покупка ${e.first} — не ×${p.firstX} от ${e.n}`);
      const a = buy(p.id), b = buy(p.id), c = buy(p.id);
      if (!a.r.res || a.d.enerium !== e.first || a.r.res.x !== p.firstX) out.push(`${p.n}: первая покупка — +${a.d.enerium}, а надо ×${p.firstX}: ${e.first}`);
      if (!b.r.res || b.d.enerium !== e.n || b.r.res.x !== 1) out.push(`${p.n}: вторая покупка — +${b.d.enerium}, а надо без удвоения: ${e.n}`);
      if (!c.r.res || c.d.enerium !== e.n) out.push(`${p.n}: третья покупка — +${c.d.enerium}, а надо ${e.n}`);
      if (Object.keys(a.d).length !== 1) out.push(`${p.n}: в наборе Энериума не только Энериум — ${JSON.stringify(a.d)}`);
    }
    /* у каждого комплекта своё удвоение: в обратном порядке и после разового набора — всё равно ×2 у первой покупки каждого */
    freshStore();
    buy(ids5[0]); buy(ids5[4]);
    for (const p of D.packs.slice().reverse()) {
      const e = SA.packEn(D, p.id), a = buy(p.id);
      if (a.d.enerium !== e.first) out.push(`${p.n}: после разовых наборов и других наборов Энериума первая покупка — +${a.d.enerium}, а надо ${e.first}`);
    }
    for (const p of D.packs) { const e = SA.packEn(D, p.id), a = buy(p.id); if (a.d.enerium !== e.n) out.push(`${p.n}: ×${p.firstX} выдано второй раз — +${a.d.enerium}`); }
    return out;
  },
  /* Л — честный показ: лист до оплаты, печати и общая пометка */
  sheet() {
    const out = [];
    /* лист называет ровно то, что выдаст сервер: разовый набор до и после удвоения, комплект до и после */
    const honest = (id, where) => {
      const sh = sheetOf(`лист ${where}`, 'stbuy', id), nums = sheetNums(sh), x = SA.mult(D, T.S.store, id);
      const o = op();
      if (!sh.includes(`data-a="stbuydo" data-v="${o}|${id}"`) || !sh.includes(T.stPriceTxt(id))) out.push(`${where}: в листе нет покупки с номером и ценой`);
      if (/class="st-x2/.test(sh) !== (x > 1)) out.push(`${where}: печать «×2» на листе ${x > 1 ? 'пропала' : 'стоит без удвоения'}`);
      T.S.overlay = null;
      const a = wallet(), r = T.SH_SRV.buy(o, id); cnt.ops++; cnt.buys++;
      const got = r.res ? r.res.got.map(g => g[1]) : [];
      if (!r.res || !EQ_(nums, got)) out.push(`${where}: лист обещал ${JSON.stringify(nums)}, а сервер выдал ${JSON.stringify(got)}`);
      if (r.res && !EQ_(delta(a, wallet()), Object.fromEntries(r.res.got.slice().sort((p, q) => (p[0] < q[0] ? -1 : 1))))) out.push(`${where}: в кошелёк пришло не то, что в ответе сервера`);
      return sh;
    };
    freshStore();
    let sh = honest(ids5[1], 'разовый набор, первая покупка');
    if (!/Первая покупка разового набора/.test(sh) || !/Без удвоения:/.test(sh) || !/Удвоение одно: остальные наборы придут без него/.test(sh)) out.push('лист первой покупки разового набора не говорит, что удвоение одно и что было бы без него');
    /* «без удвоения» лист называет состав набора как есть — те же числа, что в данных */
    { const base = (playerText(sh).split('Без удвоения:')[1] || '').replace(/[\s  ]/g, ''); for (const [, v] of L5[1].get) if (!base.includes(String(v))) out.push(`лист первой покупки разового набора: нет числа ${v} «без удвоения»`); }
    sh = honest(ids5[4], 'разовый набор после использованного ×2');
    if (!/уже использовано/.test(sh) || /Первая покупка разового набора/.test(sh) || /Удвоение одно/.test(sh)) out.push('лист разового набора после использованного ×2 не говорит, что набор придёт как есть');
    sh = honest(D.packs[2].id, 'набор Энериума, первая покупка');
    if (!/Первая покупка этого набора/.test(sh)) out.push('лист первой покупки набора Энериума не называет ×2');
    sh = honest(D.packs[2].id, 'набор Энериума, вторая покупка');
    if (!/уже использовано/.test(sh)) out.push('лист второй покупки набора Энериума не говорит, что ×2 использовано');
    /* купленный разовый набор: лист без покупки, с причиной */
    sh = sheetOf('лист купленного разового набора', 'stbuy', ids5[1]); T.S.overlay = null;
    if (/data-a="stbuydo"/.test(sh) || !/уже куплен/.test(sh)) out.push('лист купленного разового набора всё ещё продаёт его');

    /* «Наборы»: одна общая пометка и одна печать, пока ×2 ждёт; числа витрины — что придёт сейчас */
    freshStore();
    for (const s of L5) {
      run('выбор набора', () => T.ACT.stpick(s.id));
      const h = tab('start', `Наборы · выбран ${s.id}`), show = (h.match(/<div class="st-show[\s\S]*?<\/div><\/div>/) || [''])[0];
      if (!show.includes(`data-st="${s.id}"`) || !show.includes(`data-a="stbuy" data-v="${s.id}"`)) out.push(`Наборы: плитка ${s.id} не поставила набор на витрину`);
      if (!/раз за игру/.test(show)) out.push(`Наборы: у набора ${s.id} нет «раз за игру»`);
      if ((h.match(/class="st-x2[" ]/g) || []).length !== 1) out.push(`Наборы, ×2 ждёт: печатей «×2» ${(h.match(/class="st-x2[" ]/g) || []).length}, а общая пометка — одна`);
      if (playerText(h).split(X2_NOTE).length !== 2) out.push(`Наборы, ×2 ждёт: пометки «${X2_NOTE}» не одна`);
      for (const [k, v] of s.get) if (!new RegExp(`data-k="${k}"[^>]*>[\\s\\S]*?<b class="num">${String(v * C.x).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00a0\\u202f]?')}</b>`).test(show)) out.push(`Наборы, ×2 ждёт: на витрине ${s.id} ${k} не ×${C.x}`);
    }
    if ((tab('start', 'Наборы · ряд').match(/class="st-set[" ]/g) || []).length !== L5.length) out.push('Наборы: в ряду не пять плиток');
    if (/st-rung|#i-lock/.test((tab('start', 'Наборы · ряд').match(/<div class="st-sets"[\s\S]*?<\/div>/) || [''])[0])) out.push('Наборы: в ряду остался замок цепочки');
    /* после первой покупки: пометки и печати нет, состав остальных — как есть; купленный — с отметкой */
    T.S.store.pick = '';
    buy(ids5[2]);
    for (const s of L5) {
      run('выбор набора', () => T.ACT.stpick(s.id));
      const h = tab('start', `Наборы · после первой покупки · ${s.id}`), show = (h.match(/<div class="st-show[\s\S]*?<\/div><\/div>/) || [''])[0];
      if (/class="st-x2[" ]/.test(h)) out.push(`Наборы, ×2 использовано: печать «×2» осталась (выбран ${s.id})`);
      if (playerText(h).includes('на первую покупку')) out.push(`Наборы, ×2 использовано: пометка о первой покупке осталась (выбран ${s.id})`);
      for (const [k, v] of s.get) if (!new RegExp(`data-k="${k}"[^>]*>[\\s\\S]*?<b class="num">${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00a0\\u202f]?')}</b>`).test(show)) out.push(`Наборы, ×2 использовано: на витрине ${s.id} ${k} — не состав без удвоения`);
      const bought = s.id === ids5[2];
      if (bought !== /куплен</.test(show) || bought === show.includes(`data-a="stbuy" data-v="${s.id}"`)) out.push(`Наборы: набор ${s.id} ${bought ? 'куплен, а продаётся' : 'не куплен, а отмечен купленным'}`);
    }
    /* все пять куплены */
    T.S.store.pick = '';
    for (const s of L5) if (!SA.count(T.S.store, s.id)) buy(s.id);
    const all = tab('start', 'Наборы · все пять');
    if (!/все пять собраны/.test(all) || /data-a="stbuy" data-v="start\d"/.test(all)) out.push('Наборы: после пятой покупки витрина не «все пять собраны»');

    /* «Энериум»: печать — у каждого комплекта своя, пока его ×2 ждёт; число на карточке — что придёт сейчас */
    freshStore();
    const cardsOf = h => [...h.matchAll(/<div class="st-pk[\s\S]*?<\/button><\/div>/g)].map(m => m[0]);
    const packLook = where => {
      const cards = cardsOf(tab('en', where));
      if (cards.length !== D.packs.length) { out.push(`${where}: карточек ${cards.length}, а наборов ${D.packs.length}`); return; }
      D.packs.forEach((p, i) => {
        const e = SA.packEn(D, p.id), first = !SA.count(T.S.store, p.id), seal = /class="st-x2[" ]/.test(cards[i]);
        const n = num((cards[i].match(/<span class="st-pa">[\s\S]*?<b class="num">([^<]*)<\/b>/) || ['', ''])[1]);
        if (seal !== first) out.push(`${where}: у «${p.n}» печать «×2» ${first ? 'пропала до первой покупки' : 'осталась после первой покупки'}`);
        if (n !== (first ? e.first : e.n)) out.push(`${where}: на карточке «${p.n}» — ${n}, а придёт ${first ? e.first : e.n}`);
      });
    };
    packLook('Энериум · ничего не куплено');
    buy(D.packs[1].id); packLook('Энериум · куплен второй набор');
    buy(D.packs[4].id); buy(ids5[0]); packLook('Энериум · куплены второй и пятый наборы и разовый набор');
    for (const p of D.packs) buy(p.id);
    packLook('Энериум · все наборы куплены');
    return out;
  },
};
const lawRun = k => { try { return LAW[k]() || []; } catch (e) { return ['исключение: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()]; } };
{
  reset();
  if (L5.length !== 5 || C.x !== 2) say(`разовые наборы: ${L5.length} наборов, первая покупка ×${C.x}, а по слову автора — 5 и ×2`);
  if (D.rate.rub !== 1 || D.rate.en !== 1) say(`курс: ${D.rate.rub} ₽ = ${D.rate.en} Энериум, а по слову автора — 1 рубль = 1 Энериум`);
  for (const k of Object.keys(LAW)) for (const e of lawRun(k)) say(`закон ${k}: ${e}`);
  /* получение: награды поднимаются, нажатие — сразу итог; после первой покупки разового набора — слово об использованном ×2 */
  reset(); T.ACT.stbuydo(`${op()}|${ids5[0]}`);
  if (!T.S.overlay || T.S.overlay.t !== 'stgot') say('покупка: нет показа получения');
  else {
    const g = ovOf(draw('получение'));
    if (!/class="st-got anim"/.test(g) || !/data-a="stskip"/.test(g)) say('получение: нет подъёма наград или «сразу итог»');
    if (!/первой покупки использовано/.test(g)) say('получение: после первой покупки разового набора не сказано, что ×2 использовано');
    run('сразу итог', () => T.ACT.stskip());
    if (/class="st-got anim"/.test(ovOf(draw('получение · итог')))) say('получение: нажатие не дало итог');
  }
}
if (err.length) done();

/* ================== 6. наборы Энериума: карточки и цены ================== */
{
  reset();
  if (D.packs.length !== 5) say(`наборов Энериума ${D.packs.length}, а у автора — пять`);
  const h = tab('en', 'Энериум');
  const cards = [...h.matchAll(/<div class="st-pk[\s\S]*?<\/button><\/div>/g)].map(m => m[0]);
  if (cards.length !== 5) say(`Энериум: карточек ${cards.length}, а надо 5`);
  for (const c of cards) { const nums = cardNums(c); if (nums.length > 2) say(`Энериум: на карточке больше двух чисел — ${nums.join(', ')}`); }
  for (const p of D.packs) if (p.firstX !== 2) say(`${p.n}: первая покупка ×${p.firstX}, а по слову автора — ×2`);
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
  if (!SA.onceX2(D, T.S.store)) say('пропуск: покупка ряда потратила ×2 разовых наборов');
  const sh = sheetOf('лист «stbuy» пропуска', 'stbuy', 'pass');
  if (!/Платный ряд/.test(sh)) say('лист товара «pass» — не лист платного ряда');
}

/* ================== 11. честность, анимации ================== */
{
  reset();
  for (const id of [...ids5, ...D.packs.map(p => p.id), D.subs[0].id, ...T.S.store.offers.map(o => o.id)]) {
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
  if (ready0.includes(D.art.map.start1) && !/<img class="st-pic[^"]*" src="[^"]*store\/start-1\.png\?v=/.test(h)) say('арт: разовый набор не AV с версией');
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
    if (flows.length < 6) say(`сценариев Лавки ${flows.length}, а надо не меньше шести`);
    if (!flows.some(x => /после первой покупки/.test(x[0]))) say('сценарии Лавки: нет «разовые наборы после первой покупки»');
    for (const x of flows) if (/цепочк|стартов/i.test(x[0] + ' ' + x[1])) say(`сценарий «${x[0]}»: прежнее правило — цепочка стартовых наборов`);
    for (const [t, , f] of flows) { reset(); run('сценарий ' + t, () => f()); draw(`сценарий «${t}»${team ? ' [команда]' : ''}`); }
    reset();
    for (const t of ['start', 'en', 'subs']) tab(t, `вкладка ${t}${team ? ' [команда]' : ''}`);
    for (const id of [...ids5, ...D.packs.map(p => p.id), ...D.subs.map(s => s.id)]) sheetOf(`лист ${id}${team ? ' [команда]' : ''}`, 'stbuy', id);
    /* те же вкладки и листы — после первой покупки разового набора и набора Энериума: другие слова, тот же взгляд игрока */
    T.S.overlay = null; T.SH_SRV.buy(op(), ids5[1]); T.SH_SRV.buy(op(), D.packs[0].id);
    for (const t of ['start', 'en']) tab(t, `вкладка ${t} после покупок${team ? ' [команда]' : ''}`);
    for (const id of [ids5[1], ids5[3], D.packs[0].id]) sheetOf(`лист ${id} после покупок${team ? ' [команда]' : ''}`, 'stbuy', id);
    T.S.overlay = { t: 'stad' }; draw('попап' + (team ? ' [команда]' : ''));
  }
  run('режим «Игрок»', () => T.setTeam(false));
  const shop = T.MAP.find(m => m.n === 'Лавка Энериума');
  for (const id of ['forbidden-shop', 'battle-pass', 'subscriptions', 'checkout', 'ad-reward']) if (!shop || !(shop.ready || []).includes(id)) say(`карта экранов: «${id}» не отмечен готовым`);
}
if (err.length) done();

/* ================== 14. мутации: ломаем — закон обязан упасть ==================
   __mult(f) подменяет решение сервера о множителе покупки и то, что придёт, разом — как если бы поломка была в алгоритме;
   f(D, st, id, m0) → множитель, m0 — настоящий. __unmult() возвращает настоящий */
vm.runInContext(`
  var __m0 = EnStore.mult, __g0 = EnStore.gets, __r0 = EnStore.refuse, __b0 = SH_SRV.buy;
  function __mult(f) {
    EnStore.mult = (D, st, id) => f(D, st, id, __m0);
    EnStore.gets = (D, st, id, day) => { const P = EnStore.product(D, id); if (!P || (P.kind !== 'chain' && P.kind !== 'pack')) return __g0(D, st, id, day);
      const x = EnStore.mult(D, st, id); return P.kind === 'chain' ? P.get.map(([k, n]) => [k, n * x]) : [['enerium', EnStore.packEn(D, id).n * x]]; };
  }
  function __unmult() { EnStore.mult = __m0; EnStore.gets = __g0; }
  var __isOnce = (D, id) => D.chain.steps.some(s => s.id === id), __isPack = (D, id) => D.packs.some(p => p.id === id);
`, ctx);
const MUT = [
  ['op', 'сервер не помнит номер операции', `SH_SRV.buy = function (op, id) { if (S.store) delete S.store.srv.ops[op]; return __b0.call(SH_SRV, op, id); };`, 'SH_SRV.buy = __b0;'],
  ['op', 'сервер принимает покупку без номера', `SH_SRV.buy = function (op, id) { return __b0.call(SH_SRV, op || 'без-номера-' + S.store.srv.seq, id); };`, 'SH_SRV.buy = __b0;'],
  ['op', 'отказ сдвигает счёт операций', `SH_SRV.buy = function (op, id) { const r = __b0.call(SH_SRV, op, id); if (r.refuse) S.store.srv.seq++; return r; };`, 'SH_SRV.buy = __b0;'],
  ['op', 'отказ тратит ×2 разовых наборов', `SH_SRV.buy = function (op, id) { const r = __b0.call(SH_SRV, op, id); if (r.refuse && S.store) S.store.x2 = { once: 'отказ' }; return r; };`, 'SH_SRV.buy = __b0;'],
  ['op', 'повтор номера тратит ×2 набора Энериума: счёт покупок растёт', `SH_SRV.buy = function (op, id) { const r = __b0.call(SH_SRV, op, id); if (r.again && S.store) S.store.bought[id] = (S.store.bought[id] || 0) + 1; return r; };`, 'SH_SRV.buy = __b0;'],
  ['order', 'замок цепочки вернулся: набор — только после предыдущего', `EnStore.refuse = (D, st, id, c) => { const i = D.chain.steps.findIndex(s => s.id === id); return i > 0 && !EnStore.count(st, D.chain.steps[i - 1].id) ? 'order' : __r0(D, st, id, c); };`, 'EnStore.refuse = __r0;'],
  ['order', 'разовый набор продаётся второй раз', `EnStore.refuse = (D, st, id, c) => (__isOnce(D, id) ? null : __r0(D, st, id, c));`, 'EnStore.refuse = __r0;'],
  ['x2once', 'все разовые наборы ×2 — прежнее правило', `__mult((D, st, id, m0) => (__isOnce(D, id) ? D.chain.x : m0(D, st, id)));`, '__unmult();'],
  ['x2once', 'самая первая покупка разового набора — без удвоения', `__mult((D, st, id, m0) => (__isOnce(D, id) ? 1 : m0(D, st, id)));`, '__unmult();'],
  ['x2once', '×2 — только первому по списку набору, а не первой покупке', `__mult((D, st, id, m0) => (__isOnce(D, id) ? (id === D.chain.steps[0].id ? D.chain.x : 1) : m0(D, st, id)));`, '__unmult();'],
  ['x2once', '×2 — второй покупке разового набора тоже', `__mult((D, st, id, m0) => (__isOnce(D, id) ? (D.chain.steps.filter(s => EnStore.count(st, s.id)).length < 2 ? D.chain.x : 1) : m0(D, st, id)));`, '__unmult();'],
  ['x2once', 'сервер не записал, кому досталось ×2', `SH_SRV.buy = function (op, id) { const r = __b0.call(SH_SRV, op, id); if (r.res && r.res.kind === 'chain') S.store.x2 = { once: '' }; return r; };`, 'SH_SRV.buy = __b0;'],
  ['x2once', 'покупка набора Энериума тратит ×2 разовых наборов', `__mult((D, st, id, m0) => (__isOnce(D, id) && D.packs.some(p => EnStore.count(st, p.id)) ? 1 : m0(D, st, id)));`, '__unmult();'],
  ['x2once', 'удвоен только Энериум набора, а не весь состав', `EnStore.gets = (D, st, id, day) => { const P = EnStore.product(D, id); if (!P || P.kind !== 'chain') return __g0(D, st, id, day); const x = __m0(D, st, id); return P.get.map(([k, n]) => [k, k === 'enerium' ? n * x : n]); };`, 'EnStore.gets = __g0;'],
  ['x2pack', '×2 набора Энериума — на каждую покупку', `__mult((D, st, id, m0) => (__isPack(D, id) ? EnStore.product(D, id).firstX : m0(D, st, id)));`, '__unmult();'],
  ['x2pack', '×2 наборов Энериума — одно на все: правило разовых наборов', `__mult((D, st, id, m0) => (__isPack(D, id) ? (D.packs.some(p => EnStore.count(st, p.id)) ? 1 : EnStore.product(D, id).firstX) : m0(D, st, id)));`, '__unmult();'],
  ['x2pack', 'покупка разового набора тратит ×2 наборов Энериума', `__mult((D, st, id, m0) => (__isPack(D, id) && D.chain.steps.some(s => EnStore.count(st, s.id)) ? 1 : m0(D, st, id)));`, '__unmult();'],
  ['x2pack', 'первая покупка набора Энериума — без удвоения', `__mult((D, st, id, m0) => (__isPack(D, id) ? 1 : m0(D, st, id)));`, '__unmult();'],
  ['sheet', 'лист обещает вдвое больше, чем выдаст сервер', `OV.stbuy0 = OV.stbuy; OV.stbuy = o => OV.stbuy0(o).replace(/(<b class="num gold">×)([^<]*)(<\\/b>)/g, (m, a, n, b) => a + (parseInt(n.replace(/\\D/g, ''), 10) * 2) + b);`, 'OV.stbuy = OV.stbuy0;'],
  ['sheet', 'лист разового набора обещает ×2 и после использованного удвоения', `OV.stbuy1 = OV.stbuy; OV.stbuy = o => { const h = OV.stbuy1(o), id = o && o.arg; return __isOnce(STD, id) && !EnStore.count(S.store, id) && __m0(STD, S.store, id) === 1 ? h.replace(/(<b class="num gold">×)([^<]*)(<\\/b>)/g, (m, a, n, b) => a + (parseInt(n.replace(/\\D/g, ''), 10) * STD.chain.x) + b) : h; };`, 'OV.stbuy = OV.stbuy1;'],
  ['sheet', 'пометка ×2 разовых наборов остаётся после первой покупки', `EnStore.onceX2_0 = EnStore.onceX2; EnStore.onceX2 = () => true;`, 'EnStore.onceX2 = EnStore.onceX2_0;'],
  ['sheet', 'печать ×2 — на каждой плитке ряда разовых наборов', `stOnceRow0 = stOnceRow; stOnceRow = o => stOnceRow0(o).replace(/<span class="st-setp">/g, '<span class="st-setp"><i class="st-x2 sm" aria-hidden="true">×2</i>');`, 'stOnceRow = stOnceRow0;'],
  ['sheet', 'общей пометки разовых наборов нет', `stOnceShow1 = stOnceShow; stOnceShow = o => stOnceShow1(o).replace(/<small class="st-sub st-x2n">[\\s\\S]*?<\\/small>/, '');`, 'stOnceShow = stOnceShow1;'],
  ['sheet', 'печать ×2 набора Энериума остаётся после первой покупки', `stPackCard0 = stPackCard; stPackCard = (p, o) => stPackCard0(p, Object.assign({}, o, { first: true }));`, 'stPackCard = stPackCard0;'],
  ['sheet', 'печати ×2 у наборов Энериума нет', `stPackCard1 = stPackCard; stPackCard = (p, o) => stPackCard1(p, o).replace(/<i class="st-x2[^>]*>[^<]*<\\/i>/, '');`, 'stPackCard = stPackCard1;'],
  ['sheet', 'плитка ряда не ставит набор на витрину', `ACT.stpick0 = ACT.stpick; ACT.stpick = () => {};`, 'ACT.stpick = ACT.stpick0;'],
  ['sheet', 'витрина разового набора показывает состав без удвоения, пока ×2 ждёт', `stOnceShow2 = stOnceShow; stOnceShow = o => stOnceShow2(Object.assign({}, o, { st: { bought: S.store.bought, x2: { once: 'другой' } } }));`, 'stOnceShow = stOnceShow2;'],
];
for (const [k, what, brk, fix] of MUT) {
  reset();
  try { vm.runInContext(brk, ctx); } catch (e) { say(`мутация «${what}»: не применилась — ${e.message}`); continue; }
  const got = lawRun(k);
  try { vm.runInContext(fix, ctx); } catch (e) { say(`мутация «${what}»: не снялась — ${e.message}`); }
  if (SHOW_MUT) console.log(`мутация «${what}» [${k}]: ${got.length ? got[0].slice(0, 220) : 'НЕ ПОЙМАНА'}`);
  if (got.length) cnt.mut++; else say(`мутация «${what}»: закон ${k} её не поймал`);
}
/* мутации сняты — законы снова чисты */
reset();
for (const k of Object.keys(LAW)) for (const e of lawRun(k)) say(`закон ${k} после мутаций: ${e}`);
done();
