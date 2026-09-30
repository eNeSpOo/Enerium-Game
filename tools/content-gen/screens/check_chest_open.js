/* Автопроверка окна открытия сундука (design/ui/screens/chest-open.js) — без браузера.
   1. index.html подключает chest-open.css и chest-open.js после bag.js; концы строк файлов окна — только CRLF; файл компилируется.
      Стили: каждая анимация объявлена в @keyframes, а кадры двигают только transform и opacity (60 кадров на телефоне).
   2. Числа вида CO_VIEW и арта CO_ART — целые; по семи редкостям — первый свет, дрожь, подскок крышки, ореол, лучи, столп, дымка,
      всплеск, искра, самая ценная; растут с редкостью. Лучи — с эпической, кольца и дрожь всплеска — с древней. У каждого вида
      сундука из EN_LOOTBOXES — свой материал заглушки и рамка рисунка: крышка над швом, корпус под ним, размеры — как у слоёв
      tools/art-gen/chest_layers.py (PNG в art/generated, если они есть). Листы режимов CO_ART.sets (jobs/chest-sheets.json): семь
      редкостей вида, у каждой шов, крышка и корпус — как в layers.json листа и как PNG слоёв; сундук листа в сцене — как прежний.
   3. Операция: кнопка «Открыть» карточки несёт номер операции. Выдача — до анимации: запасы, кошелёк, осколки, «из сундуков» и
      снаряжение (предметами — screens/equipment.js) изменились ровно на итог, итог — EnLoot.roll на сиде каждого сундука с прахом по
      коллекции (пересчёт независимый). Повтор того же
      номера ничего не выдаёт и показа не меняет; две свежие сессии с одними номерами получают одни итоги.
   4. Анимация по часам песочницы: карточки — все выпавшие записи по возрастанию ценности, самая ценная последней и крупнее, у каждой —
      выпавшая редкость; карточка поднимается из щели сундука к своему месту. Свет поднимается от нижней ступени окна сундука до
      редкости самой ценной (не больше CO_VIEW.climb ступеней), ступени — в разметке по порядку, свет щели гаснет при открытии.
      Моменты целые и растут; итог — ровно в конце, не раньше; крышка — 3D с осью у задней кромки; лучи — с эпической, кольцо под
      сундуком — с эпического сундука, золотой отблеск — с древнего; перерисовка посреди анимации продолжает её с того же места.
   5. Итог: одна сетка, каждая запись один раз, редкие сверху; валюта — сумма по сундукам; «Открыть ещё» — если есть такие же,
      «Открыть все · N» — если осталось два и больше, «Закрыть»; номера операций на них открывают следующие сундуки.
   6. Пачка: ×N из карточки и «Открыть все» — короткие моменты CO_VIEW.many и одна карточка — самый ценный предмет пачки; сводка по
      редкостям.
   7. Нажатие на сцену ведёт к следующему моменту: замок, самая ценная, её переворот, итог — итог и выдача не меняются. «Пропустить
      анимацию» — итог сразу; галочка посреди анимации — итог сразу; выбор помнит localStorage, без него всё работает; при
      prefers-reduced-motion галочка стоит и заблокирована. Окно закрыли посреди анимации — итог сообщением, выдачи второй раз нет.
   8. Арт: пока путь не выгружен — заглушка SVG и градиенты, ни одной картинки из assets/art/chests; все пути выгружены — рисунок
      корпуса и крышки, замок и текстуры света; у вида с листом режима — сундук своей редкости и замок режима; нет слоя редкости —
      прежний сундук вида; сундук без одного из слоёв остаётся заглушкой.
   9. Все виды × редкости × окна × циклы (× недели у осколков): показ без исключений, undefined и NaN, служебного игроку не видно.
   10. UI-кит: раздел «Открытие сундука» — семь видов, семь редкостей, пачка; проба не меняет S; раскадровка — пять моментов;
       «С анимацией» раздела «Лутбоксы» — те же предметы, что его список бросков. Карта экранов: шаблон «Открытие сундука».
   11. Режим «Игрок»: на всех видах окна нет служебных слов (SERVICE из check_player_view.js); в режиме «Команда» — пометка о выдаче.
   12. Сценарии презентации «Сундук · открытие» и «Сундуки · пачкой».
   Запуск: node tools/content-gen/screens/check_chest_open.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText, teamCount } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, ops: 0, chests: 0, synth: 0, trials: 0, taps: 0, art: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Открытие сундука: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; операций ${cnt.ops}, сундуков открыто ${cnt.chests}, всех видов ${cnt.synth}, нажатий на сцену ${cnt.taps}, проб UI-кита ${cnt.trials}, показов с артом ${cnt.art}.`);
  console.log('Проверка пройдена: итог выдан до анимации на сиде каждого сундука, повтор номера ничего не выдаёт, свет поднимается до самой ценной, анимация и итог рисуются, нажатие ведёт по моментам, пропуск работает, арт — по выгрузке, в режиме «Игрок» служебного нет.');
  process.exit(0);
}

/* ================== 1. файлы и стили ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const CSS = read('screens/chest-open.css');
{
  const iB = scripts.findIndex(s => s.src === 'screens/bag.js'), iC = scripts.findIndex(s => s.src === 'screens/chest-open.js');
  if (iC < 0) say('index.html: не подключён screens/chest-open.js');
  else if (iC < iB) say('index.html: chest-open.js подключён раньше bag.js');
  if (!/<link rel="stylesheet" href="screens\/chest-open\.css">/.test(html)) say('index.html: не подключён screens/chest-open.css');
  for (const f of ['screens/chest-open.js', 'screens/chest-open.css']) {
    const s = read(f), crlf = (s.match(/\r\n/g) || []).length, lf = (s.match(/\n/g) || []).length, cr = (s.match(/\r/g) || []).length;
    if (crlf !== lf || cr !== crlf) say(`${f}: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}, CR ${cr}`);
  }
  try { new vm.Script(read('screens/chest-open.js'), { filename: 'screens/chest-open.js' }); } catch (e) { say('screens/chest-open.js: синтаксис — ' + e.message); }
  /* кадры: только transform и opacity; каждая анимация — объявлена */
  const css = CSS.replace(/\/\*[\s\S]*?\*\//g, ''), frames = new Map();
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    let i = m.index + m[0].length, depth = 1; const from = i;
    while (depth && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    frames.set(m[1], css.slice(from, i - 1));
  }
  for (const [name, body] of frames) for (const p of body.matchAll(/([a-z-]+)\s*:/g)) if (!['transform', 'opacity', 'animation-timing-function'].includes(p[1])) say(`chest-open.css: @keyframes ${name} двигает ${p[1]} — только transform и opacity`);
  const own = new Set(frames.keys()), ext = new Set(['fade']);
  for (const m of css.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)) for (const part of m[1].split(',')) {
    const name = part.trim().split(/\s+/).find(w => /^[a-z][\w-]*$/.test(w) && !/^(ease|ease-in|ease-out|ease-in-out|linear|both|forwards|backwards|none|infinite|alternate|reverse|normal|paused|running|step-start|step-end)$/.test(w));
    if (name && !own.has(name) && !ext.has(name)) say(`chest-open.css: анимация ${name} не объявлена в @keyframes`);
  }
  if (/transition\s*:/.test(css.replace(/@media \(prefers-reduced-motion[\s\S]*$/, ''))) say('chest-open.css: переходы transition — движение только анимациями по времени');
}
if (err.length) done();

/* ================== песочница ==================
   Скрипты прототипа — по порядку, как в браузере, с заглушкой DOM; boot() не запускается. Часы свои: setTimeout ставит задачу в очередь,
   tick(мс) двигает время и выполняет задачи по порядку — так видно, когда наступает итог. storage — 'throw' или Map; reduced — меньше
   движения; ready — выгруженные пути арта (CO_ART.ready) */
function load(o = {}) {
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, prepend() {}, remove() {},
      animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
    e.querySelector = () => null;
    return e;
  };
  const rootCls = new Set(), root = stubEl('html');
  root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
  const els = {};
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const S0 = o.storage, noStore = () => { throw new Error('localStorage недоступен'); };
  const localStorage = S0 instanceof Map ? { getItem: k => (S0.has(k) ? S0.get(k) : null), setItem: (k, v) => { S0.set(k, String(v)); }, removeItem: k => { S0.delete(k); } }
    : { getItem: noStore, setItem: noStore, removeItem: noStore };
  const clock = { now: 0, q: [], id: 0 };
  const quiet = { log() {}, info() {}, warn() {}, error() {} };   // чужие разделы UI-кита пишут в консоль, когда им не хватает DOM
  const win = { document, console: quiet, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} }, localStorage,
    innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1, addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    matchMedia: q => ({ matches: !!o.reduced && /prefers-reduced-motion/.test(q), addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setInterval: () => 0, clearInterval() {},
    setTimeout: (f, ms) => { const id = ++clock.id; clock.q.push({ id, at: clock.now + Math.max(0, +ms || 0), f }); return id; },
    clearTimeout: id => { clock.q = clock.q.filter(t => t.id !== id); },
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, Image: function Image() {}, performance: { now: () => clock.now } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, FLOWS, KH, BAG, LBX, RSI, RX, LB, TEMPLATES, KIT_EXTRA, render, initialState, setTeam, fmt, rsHas, lbHtml, EnLoot: window.EnLoot,
    zpChestGroups, zpChestKey, zpV, zpDef, zpSeed, zpExtraKey, zpChestPic, chestPic: typeof chestPic === 'function' ? chestPic : null,
    CO_VIEW, CO_ART, CO_KINDS, CO_DEMO, CO_KIT, coShow, coReveal, coGroups, coVal, coSync, coKitAct, coKitHtml, coStageHtml, coChestGeo, coWinMin,
  })`, ctx);
  if (o.ready) { T.CO_ART.ready.length = 0; T.CO_ART.ready.push(...o.ready); }   // свой набор выгруженного: [] — «без арта»
  /* время вперёд: задачи — по порядку их моментов */
  const tick = ms => {
    const end = clock.now + ms;
    for (;;) {
      clock.q.sort((a, b) => a.at - b.at || a.id - b.id);
      const t = clock.q[0]; if (!t || t.at > end) break;
      clock.q.shift(); clock.now = t.at;
      try { t.f(); } catch (e) { say(`таймер: исключение — ${e.message}`); }
    }
    clock.now = end;
  };
  return { T, els, rootCls, clock, tick, game: () => (els.game ? els.game.innerHTML : '') };
}

const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const num = (sty, k) => +((sty.match(new RegExp(`(?:^|;)${reEsc(k)}:(-?\\d+)(?:px|ms|deg)?(?:;|$)`)) || [])[1]);
/* разметка без исключений, undefined и NaN; в режиме «Игрок» — без служебных слов в тексте и подсказках */
function clean(P, h, where) {
  cnt.views++;
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!P.T.KH.team) {
    cnt.player++;
    const v = strip(h), txt = playerText(h).split('\n').concat(tips(v));
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
  }
  return h;
}
function view(P, where) { run(where, () => P.T.render()); return clean(P, P.game(), where); }
const ovOf = h => { const i = h.indexOf('<div class="ov co-ov'); return i < 0 ? '' : h.slice(i); };
const resOf = h => { const i = h.indexOf('<section class="co-res'); return i < 0 ? '' : h.slice(i, h.indexOf('</section>', i)); };
const stOf = h => { const i = h.indexOf('<div class="co-st'); return i < 0 ? '' : h.slice(i); };
/* свежая сессия: «Запасы → Сундуки», «Пропустить анимацию» — как задано */
function fresh(P, o = {}) {
  const T = P.T;
  T.S = T.initialState(); T.S.overlay = null; T.S.route = 'craft'; T.S.seg.craft = 'stock'; T.S.zp.tab = 'chest';
  if (o.skip != null) T.S.co.skip = o.skip;
}
const snap = T => JSON.parse(JSON.stringify({ wallet: T.S.wallet, items: T.S.bag.items, shards: T.S.rs.shards, extra: T.S.zp.extra, eq: T.S.eq ? Object.keys(T.S.eq.items).length : 0, chests: T.S.bag.chests.map(c => c.id), op: T.S.zp.op }));
const grp = (T, key) => T.zpChestGroups().find(g => g.key === key) || null;
/* ожидаемый итог — независимо: EnLoot.roll на сиде каждого сундука, прах по коллекции на момент открытия */
function expect(T, chests) {
  return chests.map(c => {
    const res = T.EnLoot.roll(T.zpDef(c), T.zpSeed(c)), aw = {};
    res.items.forEach(it => { if (it.kind === 'shard' && T.RSI[it.id] && T.rsHas(T.RSI[it.id])) aw[it.id] = true; });
    const conv = T.EnLoot.toDust(T.LBX, res, aw);
    return { cur: conv.cur, items: conv.items };
  });
}
/* сдвиг запасов по ожидаемому итогу: валюта — в кошелёк, ресурсы — в запасы, осколки — героям, прах — в кошелёк, снаряжение — предметами
   в запасы снаряжения (screens/equipment.js: сервер создаёт предмет на сиде сундука), прочее — «из сундуков» */
function delta(T, log) {
  const d = { wallet: {}, items: {}, shards: {}, extra: {}, eq: 0 }, add = (m, k, q) => { m[k] = (m[k] || 0) + q; };
  for (const L of log) {
    for (const [k, a] of L.cur) add(d.wallet, k, a);
    for (const it of L.items) {
      if (it.kind === 'item') add(d.items, it.id, it.q);
      else if (it.kind === 'cur') add(d.wallet, it.id, it.q);
      else if (it.kind === 'shard') { if (it.dust) add(d.wallet, 'dust', it.dust); else add(d.shards, it.id, it.q); }
      else if (it.kind === 'equip' && T.S.eq) d.eq += it.q;
      else add(d.extra, T.zpExtraKey(it), it.q);
    }
  }
  return d;
}
function diff(a, b) { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const x = (b[k] || 0) - (a[k] || 0); if (x) o[k] = x; } return o; }
const sorted = o => Object.keys(o).sort().map(k => [k, o[k]]);
/* нажатие кнопки открытия: номер операции и сколько — с самой кнопки в разметке, как в браузере */
function press(P, where, h, key, which) {
  const T = P.T, re = new RegExp(`<button[^>]*data-a="zpopen" data-v="${reEsc(esc(key))}"[^>]*>([^<]*)`, 'g');
  const btns = [...h.matchAll(re)].map(m => ({ tag: m[0], label: decode(m[1]), op: (m[0].match(/data-op="([^"]+)"/) || [])[1], n: (m[0].match(/data-n="([^"]+)"/) || [])[1] }));
  const b = btns.find(x => which(x));
  if (!b) { say(`${where}: нет кнопки открытия`); return null; }
  if (!b.op) say(`${where}: у кнопки «${b.label}» нет номера операции`);
  run(where, () => T.ACT.zpopen(key, { dataset: { op: b.op, n: b.n } }));
  return b;
}
/* одна операция: выдача ровно на итог, итог — пересчёт на сидах, запись операции; показ начат */
function checkOp(P, where, s0, key, chests, op, skip) {
  const T = P.T, L = T.S.zp.last, R = T.S.co.run;
  cnt.ops++; cnt.chests += chests.length;
  if (!L || L.key !== key || L.sum.n !== chests.length) { say(`${where}: нет итога или открыто не ${chests.length}`); return null; }
  if (op && T.S.zp.ops[op] !== L) say(`${where}: операция ${op} не записана`);
  const want = expect(T, chests);
  if (!eq(L.sum.log.map(x => ({ cur: x.cur, items: x.items })), want)) say(`${where}: итог не совпал с EnLoot.roll на сиде каждого сундука`);
  const s1 = snap(T), d = delta(T, want);
  if (!eq(sorted(diff(s0.wallet, s1.wallet)), sorted(d.wallet))) say(`${where}: кошелёк ${JSON.stringify(diff(s0.wallet, s1.wallet))}, ждали ${JSON.stringify(d.wallet)}`);
  if (!eq(sorted(diff(s0.items, s1.items)), sorted(d.items))) say(`${where}: запасы изменились не на итог`);
  if (!eq(sorted(diff(s0.shards, s1.shards)), sorted(d.shards))) say(`${where}: осколки изменились не на итог`);
  if (!eq(sorted(diff(s0.extra, s1.extra)), sorted(d.extra))) say(`${where}: «из сундуков» изменилось не на итог`);
  if (s1.eq - s0.eq !== d.eq) say(`${where}: снаряжения прибавилось ${s1.eq - s0.eq}, по итогу — ${d.eq}`);
  const gone = s0.chests.filter(id => !s1.chests.includes(id));
  if (!eq(gone.sort(), chests.map(c => c.id).sort())) say(`${where}: из запасов ушли не те сундуки`);
  if (!R || R.key !== key || R.n !== chests.length) { say(`${where}: показ не начат или не тот`); return null; }
  if (!T.S.overlay || T.S.overlay.t !== 'co') say(`${where}: окно открытия не открыто`);
  if (skip ? R.phase !== 'res' : R.phase !== 'anim') say(`${where}: показ в фазе ${R.phase}, ждали ${skip ? 'итог' : 'анимацию'}`);
  return R;
}
/* повтор номера: ни выдачи, ни нового показа */
function checkAgain(P, where, key, op, n) {
  const T = P.T, s0 = snap(T), r0 = T.S.co.run;
  run(where + ' · повтор', () => T.ACT.zpopen(key, { dataset: { op, n } }));
  if (!eq(s0, snap(T))) say(`${where}: повтор операции ${op} изменил запасы или кошелёк`);
  if (T.S.co.run !== r0) say(`${where}: повтор операции ${op} начал новый показ`);
}
/* показ по существу: карточки по ценности, самая ценная последней и крупнее, выпавшие редкости, подъём из щели, ступени света, моменты */
function checkRun(P, where, R, h) {
  const T = P.T, V = T.CO_VIEW, G = V.geo, many = R.n > 1, M = V.many;
  const all = R.items, best = all.reduce((b, c) => T.coVal(c) > T.coVal(b) ? c : b, all[0]);
  if (!all.length) { say(`${where}: в показе нет выпавших записей`); return; }
  if (many ? R.cards.length !== 1 : R.cards.length !== all.length) say(`${where}: карточек ${R.cards.length}, ждали ${many ? 1 : all.length}`);
  for (let i = 1; i < R.cards.length; i++) if (T.coVal(R.cards[i]) < T.coVal(R.cards[i - 1])) say(`${where}: карточки не по возрастанию ценности`);
  const last = R.cards[R.cards.length - 1];
  if (T.coVal(last) !== T.coVal(best)) say(`${where}: последняя карточка — не самая ценная запись`);
  if (R.items.some(c => !(c.r >= 1 && c.r <= 7))) say(`${where}: редкость записи вне 1–7`);
  /* записи показа — ровно выданные: вид, id, количество, выпавшая редкость и прах, по всем сундукам операции */
  if (!R.trial) {
    const rec = x => [x.kind, x.id, x.q, x.r, x.dust || 0].join('|'), L = T.S.zp.last;
    const want = L && L.op === R.op ? [].concat(...L.sum.log.map(x => x.items)).map(rec).sort() : null;
    if (want && !eq(R.items.map(rec).sort(), want)) say(`${where}: записи показа не те, что выданы`);
  }
  /* свет: от нижней ступени окна сундука до редкости самой ценной, подряд, не больше CO_VIEW.climb ступеней вверх */
  const lo = T.coWinMin(R.cs), up = many ? M.climb : V.climb, cl = R.climb;
  if (R.b !== last.r) say(`${where}: свет поднимается не до редкости самой ценной — ${R.b} против ${last.r}`);
  if (!cl.length || cl[cl.length - 1] !== R.b || cl[0] !== Math.min(R.b, Math.max(lo, R.b - up)) || cl.some((x, i) => i && x !== cl[i - 1] + 1)) say(`${where}: ступени света ${cl.join('→')} при окне от ${lo} и самой ценной ${R.b}`);
  /* моменты: целые, растут; длительности — из CO_VIEW */
  const t = R.T, s = cl.length - 1, H = t.H;
  const ts = [t.land, t.climb0].concat(t.lv.slice(1), [t.lock, t.open], t.cards, [t.hero.hover, t.hero.flip, t.hero.shown, t.end]);
  if (ts.some(x => !Number.isInteger(x))) say(`${where}: моменты анимации не целые`);
  for (let i = 1; i < ts.length; i++) if (ts[i] <= ts[i - 1]) { say(`${where}: моменты анимации не растут — ${ts.join(', ')}`); break; }
  const charge = many ? M.charge : V.charge[R.r - 1], step = many ? M.step : V.step, fin = many ? M.final : V.final;
  if (t.open - t.climb0 !== charge + (s ? (s - 1) * step + fin : 0)) say(`${where}: предвкушение ${t.open - t.climb0} мс, ждали ${charge + (s ? (s - 1) * step + fin : 0)}`);
  const want = many ? [M.rise, M.hover, M.flip, M.hold] : [V.hero.rise, V.hero.hover, V.hero.flip, V.hero.hold].map(a => a[R.b - 1]);
  if (!eq([H.rise, H.hover, H.flip, H.hold], want) || t.hero.hover - t.hero.start !== H.rise || t.end - t.hero.shown !== H.hold) say(`${where}: моменты самой ценной не из CO_VIEW`);
  if (!eq(t.beats, [t.lock, t.hero.start, t.hero.flip, t.end])) say(`${where}: нажатие ведёт не по моментам замок → самая ценная → переворот → итог`);
  if (!h) return;
  const st = stOf(h);
  /* щель сундука — точка, откуда поднимаются карточки */
  const chest = st.match(/<div class="co-chest co-a( art)?" data-g="(\d)" style="([^"]*)"/), mpt = st.match(/<i class="co-mpt" style="([^"]*)"/);
  if (!chest || !mpt) { say(`${where}: нет сундука или точки щели`); return; }
  const mx = num(chest[3], 'left') + num(mpt[1], 'left'), my = num(chest[3], 'top') + num(mpt[1], 'top');
  if (Math.abs(mx - G.w / 2) > 1) say(`${where}: щель сундука не посередине сцены`);
  if (+chest[2] !== (R.r >= V.gild ? 1 : 0)) say(`${where}: золотой отблеск не по редкости сундука`);
  if (num(chest[3], 'top') + num(chest[3], 'height') !== G.h - G.ground) say(`${where}: сундук стоит не на земле`);
  const cards = [...st.matchAll(/<div class="co-card co-a( best)?[^"]*" data-r="(\d)" data-i="(\d+)"[^>]*style="([^"]*)"/g)];
  if (cards.length !== R.cards.length) say(`${where}: карточек в разметке ${cards.length}, в показе ${R.cards.length}`);
  cards.forEach((m, i) => {
    const c = R.cards[+m[3]], sty = m[4];
    if (!!m[1] !== (i === cards.length - 1)) say(`${where}: «самая ценная» — не у последней карточки`);
    if (c && +m[2] !== c.r) say(`${where}: у карточки редкость ${m[2]}, выпало ${c.r}`);
    const L = num(sty, 'left'), Tp = num(sty, 'top'), w = num(sty, '--w'), hh = num(sty, '--h'), fx = num(sty, '--fx'), fy = num(sty, '--fy');
    if (Math.abs(L + w / 2 + fx - mx) > 1 || Math.abs(Tp + hh / 2 + fy - my) > 1) say(`${where}: карточка ${i} поднимается не из щели сундука`);
    if (L < 0 || L + w > G.w || Tp < 0) say(`${where}: карточка ${i} за краем сцены`);
    const big = i === cards.length - 1;
    if (big ? (w !== G.hero[0] || hh !== G.hero[1]) : (w !== G.card[0] || hh !== G.card[1])) say(`${where}: размер карточки ${i} не из CO_VIEW.geo`);
    if (!/--tp:\d+ms/.test(sty) || !/--ta:-?\d+deg/.test(sty)) say(`${where}: у карточки ${i} нет переворота или шлейфа`);
  });
  if (/style="[^"]*\d\.\d/.test(st.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/url\('[^']*'\)/g, ''))) say(`${where}: в стилях сцены дробные числа`);
  /* ступени света — по порядку: ореол, изнанка крышки и щель; последняя ступень щели гаснет при открытии */
  const lvOf = cls => [...st.matchAll(new RegExp(`<(?:div|i) class="${cls} co-lvx( z)?" data-r="(\\d)" style="([^"]*)"`, 'g'))];
  for (const cls of ['co-lv', 'co-ulv', 'co-crk']) {
    const L = lvOf(cls);
    if (!eq(L.map(x => +x[2]), cl)) { say(`${where}: ступени ${cls} — ${L.map(x => x[2]).join('→')}, ждали ${cl.join('→')}`); continue; }
    if (cls === 'co-crk') { const z = L[L.length - 1]; if (z[1] || !z[3].includes(`--l1:${num(st.match(/style="([^"]*)"/)[1], '--do')}ms`)) say(`${where}: свет щели не гаснет при открытии`); }
    else if (!L[L.length - 1][1] || L.slice(0, -1).some(x => x[1])) say(`${where}: у ${cls} последней остаётся не последняя ступень`);
  }
  /* крышка — 3D с осью у задней кромки; замок; лучи — с эпической; кольцо под сундуком — с эпического сундука */
  const lid = st.match(/<div class="co-lid co-a" style="[^"]*transform-origin:50% 100% -(\d+)px"/);
  if (!lid || !(+lid[1] > 0)) say(`${where}: у крышки нет оси у задней кромки`);
  if (!/<div class="co-lock co-a"/.test(st)) say(`${where}: нет замка`);
  if (st.includes('class="co-rays co-a"') !== (R.b >= V.rays)) say(`${where}: лучи ${R.b >= V.rays ? 'пропали' : 'лишние'} у редкости ${R.b}`);
  if (st.includes('class="co-hrays co-a"') !== (R.b >= V.rays)) say(`${where}: лучи самой ценной ${R.b >= V.rays ? 'пропали' : 'лишние'} у редкости ${R.b}`);
  if (st.includes('class="co-rune co-a"') !== (R.r >= V.rune)) say(`${where}: кольцо под сундуком ${R.r >= V.rune ? 'пропало' : 'лишнее'} у сундука ${R.r}`);
  if (!st.includes(`data-co-run="${R.id}"`)) say(`${where}: сцена не помечена своим показом`);
}
/* итог: сетка, редкие сверху, валюта, кнопки по остатку; номер операции на кнопках — следующий */
function checkRes(P, where, R, h) {
  const T = P.T, r = resOf(h), many = R.n > 1;
  if (!r) { say(`${where}: нет окна итога`); return; }
  if (!r.includes(many ? `Открыто: ${T.fmt(R.n)} ` : 'Сундук открыт')) say(`${where}: в итоге нет заголовка «${many ? 'Открыто: ' + R.n : 'Сундук открыт'}»`);
  if (!r.includes('в запасах')) say(`${where}: итог не говорит, что всё в запасах`);
  const G = T.coGroups(R), tiles = [...r.matchAll(/<div class="co-t( dust)?" data-r="(\d)"/g)];
  if (tiles.length !== G.length) say(`${where}: плиток ${tiles.length}, записей ${G.length}`);
  for (let i = 1; i < tiles.length; i++) if (+tiles[i][2] > +tiles[i - 1][2]) say(`${where}: в итоге редкие не сверху`);
  const keys = G.map(g => [g.kind, g.id, g.dust ? 1 : 0].join(':'));
  if (new Set(keys).size !== keys.length) say(`${where}: одна запись — не одной плиткой`);
  const sumQ = {}; for (const c of R.items) { const k = [c.kind, c.id, c.dust ? 1 : 0].join(':'); sumQ[k] = (sumQ[k] || 0) + c.q; }
  for (const g of G) if (g.q !== sumQ[[g.kind, g.id, g.dust ? 1 : 0].join(':')]) say(`${where}: у плитки ${g.name} сумма не сходится`);
  const cur = {}; for (const L of T.S.zp.last.sum.log) for (const [k, a] of L.cur) cur[k] = (cur[k] || 0) + a;
  if (!R.trial && !eq(sorted(R.cur), sorted(cur))) say(`${where}: гарантированная валюта в итоге не сумма по сундукам`);
  for (const [k, a] of Object.entries(cur)) if (a && !r.includes(`+${T.fmt(a)}`)) say(`${where}: в итоге нет валюты ${k} +${a}`);
  if (many) { const rg = [...r.matchAll(/<div class="co-rg"><span class="co-rh"><span class="rar" data-r="(\d)"/g)].map(m => +m[1]); for (let i = 1; i < rg.length; i++) if (rg[i] >= rg[i - 1]) say(`${where}: разделы пачки не по убыванию редкости`); if (!rg.length) say(`${where}: у пачки нет разделов по редкостям`); }
  const g = grp(T, R.key), left = g ? g.q : 0, op = 'zo' + T.S.zp.op;
  const more = r.match(/data-a="zpopen"[^>]*data-op="([^"]+)" data-n="1">Открыть ещё/), all = r.match(/data-a="zpopen"[^>]*data-op="([^"]+)" data-n="all">Открыть все · ([\d\s ]+)/);
  if (!!more !== left >= 1) say(`${where}: «Открыть ещё» ${more ? 'есть' : 'нет'}, осталось ${left}`);
  if (!!all !== left >= 2) say(`${where}: «Открыть все» ${all ? 'есть' : 'нет'}, осталось ${left}`);
  if (all && +all[2].replace(/\D/g, '') !== left) say(`${where}: «Открыть все · ${all[2]}», осталось ${left}`);
  for (const m of [more, all]) if (m && m[1] !== op) say(`${where}: на кнопке итога номер ${m[1]}, следующий — ${op}`);
  if (!/data-a="close">Закрыть</.test(r)) say(`${where}: в итоге нет «Закрыть»`);
}

/* ================== 2. данные вида и арта ================== */
const P = load({ storage: new Map() });
const { T } = P;
const V = T.CO_VIEW, ART = T.CO_ART;
{
  const bad = [];
  const walk = (x, k) => { if (typeof x === 'number') { if (!Number.isInteger(x)) bad.push(k); } else if (x && typeof x === 'object') for (const [kk, v] of Object.entries(x)) walk(v, k + '.' + kk); };
  walk(V, 'CO_VIEW'); walk(ART, 'CO_ART');
  if (bad.length) say('CO_VIEW и CO_ART: не целые числа — ' + bad.slice(0, 8).join(', '));
  const seven = (a, k) => { if (!Array.isArray(a) || a.length !== 7) { say(`${k}: не семь значений по редкостям`); return false; } return true; };
  const grows = (a, k) => { if (seven(a, k)) for (let i = 1; i < 7; i++) if (a[i] < a[i - 1]) { say(`${k}: у редкости ${i + 1} меньше, чем у ${i}`); break; } };
  for (const k of ['charge', 'amp', 'lift', 'halo', 'ray', 'beam', 'haze']) grows(V[k], 'CO_VIEW.' + k);
  for (const k of ['rise', 'hover', 'flip', 'hold', 'zoom', 'dim']) grows(V.hero[k], 'CO_VIEW.hero.' + k);
  seven(V.fx.open, 'CO_VIEW.fx.open'); seven(V.fx.card, 'CO_VIEW.fx.card');
  if (V.rays !== 4) say('CO_VIEW.rays: лучи — с эпической (ADR-0028, п. 13)');
  if (V.gild !== 5) say('CO_VIEW.gild: золотой отблеск — с древнего сундука (ADR-0028, п. 13)');
  for (let i = 0; i < 7; i++) {
    const O = V.fx.open[i];
    if (!O.sparks || !O.streaks || !O.flash) say(`CO_VIEW.fx.open[${i}]: нет искр, полос или вспышки`);
    if (!!V.ray[i] !== (i + 1 >= V.rays)) say(`CO_VIEW.ray[${i}]: лучи — ровно с эпической`);
    if (!!O.rings !== (i + 1 >= 5) || !!O.shake !== (i + 1 >= 5)) say(`CO_VIEW.fx.open[${i}]: кольца и дрожь — не с древней`);
    if (i && O.sparks[0] <= V.fx.open[i - 1].sparks[0]) say(`CO_VIEW.fx.open[${i}]: всплеск не богаче, чем у редкости ниже`);
    if (i && V.fx.card[i][0] <= V.fx.card[i - 1][0]) say(`CO_VIEW.fx.card[${i}]: искра не богаче, чем у редкости ниже`);
  }
  if (!(V.climb >= 1 && V.many.climb >= 1 && V.many.climb <= V.climb)) say('CO_VIEW: ступеней света у пачки больше, чем у одного сундука');
  if (!(V.many.charge < V.charge[0] && V.many.hold <= V.hero.hold[6])) say('CO_VIEW.many: пачка не короче одного сундука');
  if (!(V.lockLead < V.final && V.lockLead < V.many.final)) say('CO_VIEW.lockLead: замок рвётся раньше последней ступени света');
  /* виды: материал заглушки и рамка рисунка — крышка над швом, корпус под ним, обе внутри рамки */
  const gen = path.join(ROOT, 'art', 'generated'), layers = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'jobs', 'chests.json'), 'utf8')).layers;
  const pngSize = f => { try { const b = fs.readFileSync(f); return b.toString('ascii', 12, 16) === 'IHDR' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; } catch (_) { return null; } };
  const geo = (k, g) => {
    const [fx, fy, fw, fh] = g.frame, [lx, ly, lw, lh] = g.lid, [bx, by, bw, bh] = g.body;
    if (!(ly + lh >= g.seam && ly + lh <= g.seam + 4 && by <= g.seam && by >= g.seam - 4)) say(`CO_ART.${k}: крышка и корпус не сходятся на шве ${g.seam}`);
    if (lx < fx || ly !== fy || lx + lw > fx + fw || bx < fx || bx + bw > fx + fw || by + bh !== fy + fh) say(`CO_ART.${k}: крышка или корпус вне рамки`);
  };
  for (const k of Object.keys(T.LBX.boxes)) {
    const K = T.CO_KINDS[k], g = ART.chests[k];
    if (!K) { say(`CO_KINDS: нет вида ${k}`); continue; }
    for (const c of ['wood', 'wood2', 'metal', 'metal2']) if (!/^#[0-9a-f]{6}$/i.test(K[c] || '')) say(`CO_KINDS.${k}.${c}: не цвет #rrggbb`);
    if (!K.n || !K.ic) say(`CO_KINDS.${k}: нет подписи или эмблемы`);
    if (!g) { say(`CO_ART.chests: нет рамки вида ${k}`); continue; }
    geo(k, g);
    const L = layers.chests[k];
    if (!L || L.seam !== g.seam) say(`CO_ART.${k}: шов не тот, что в jobs/chests.json`);
    else for (const part of ['body', 'lid']) {
      const f = path.join(gen, L.from.replace(/\.png$/, `.${part}.png`)), px = pngSize(f);
      if (px && (px[0] !== g[part][2] || px[1] !== g[part][3])) say(`CO_ART.${k}.${part}: ${g[part][2]}×${g[part][3]}, а слой ${px[0]}×${px[1]}`);
    }
  }
  geo('svg', ART.svg);
  const lockPx = pngSize(path.join(gen, layers.items.lock.from.replace(/\.png$/, '.clean.png')));
  if (lockPx && !eq(lockPx, ART.lock)) say(`CO_ART.lock: ${ART.lock.join('×')}, а замок ${lockPx.join('×')}`);
  if (!eq([...ART.fx].sort(), Object.keys(layers.fx).sort())) say('CO_ART.fx: не те текстуры, что в jobs/chests.json');
  /* листы режимов: семь редкостей вида, геометрия — как в layers.json листа и как PNG слоёв; сундук в сцене — как прежний */
  const sheets = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'jobs', 'chest-sheets.json'), 'utf8')).layers.sheets;
  for (const [k, S] of Object.entries(ART.sets || {})) {
    if (!T.LBX.boxes[k]) { say(`CO_ART.sets: вида ${k} нет в EN_LOOTBOXES`); continue; }
    if (!(S.scale > 0) || !Array.isArray(S.lock) || S.lock.length !== 2 || !Array.isArray(S.by) || S.by.length !== 7) { say(`CO_ART.sets.${k}: нет масштаба, замка или семи редкостей`); continue; }
    const sid = Object.keys(sheets).find(x => sheets[x].box === k);
    const lf = sid && path.join(gen, path.dirname(sheets[sid].from), sid, 'layers.json'), L = lf && fs.existsSync(lf) ? JSON.parse(fs.readFileSync(lf, 'utf8')) : null;
    if (!sid) say(`CO_ART.sets.${k}: нет листа в jobs/chest-sheets.json`);
    S.by.forEach((g, i) => {
      geo(`sets.${k}.r${i + 1}`, g);
      const w = Math.round(g.frame[2] * S.scale / 1000);
      if (w < 200 || w > 272) say(`CO_ART.sets.${k}.r${i + 1}: сундук в сцене ${w} px — не как прежний (200–272)`);
      const c = L && L.chests[i];
      if (!L) return;
      if (!c || c.r !== i + 1 || !eq(c.frame, g.frame) || c.seam !== g.seam || !eq(c.lid, g.lid) || !eq(c.body, g.body)) { say(`CO_ART.sets.${k}.r${i + 1}: не та геометрия, что в layers.json листа`); return; }
      for (const part of ['body', 'lid']) { const px = pngSize(path.join(gen, c.files[part])); if (px && (px[0] !== g[part][2] || px[1] !== g[part][3])) say(`CO_ART.sets.${k}.r${i + 1}.${part}: ${g[part][2]}×${g[part][3]}, а слой ${px[0]}×${px[1]}`); }
    });
    if (L && !eq(L.lock.px, S.lock)) say(`CO_ART.sets.${k}.lock: ${S.lock.join('×')}, а замок листа ${L.lock.px.join('×')}`);
  }
  const setPaths = Object.keys(ART.sets || {}).flatMap(k => [1, 2, 3, 4, 5, 6, 7].flatMap(r => [`chests/${k}/r${r}-body.webp`, `chests/${k}/r${r}-lid.webp`, `chests/${k}/r${r}.webp`]).concat(`chests/${k}/lock.webp`));
  const paths = Object.keys(ART.chests).flatMap(k => [`chests/${k}-body.png`, `chests/${k}-lid.png`]).concat('chests/lock.png', ART.fx.map(n => `chests/fx-${n}.png`), setPaths);
  for (const p of ART.ready) if (!paths.includes(p)) say(`CO_ART.ready: лишний путь ${p}`);
  for (const p of ART.ready) if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`CO_ART.ready: ${p} отмечен, а файла в design/ui/assets/art нет`);
}

/* ================== 3–5. одна операция: выдача до анимации, пересчёт, повтор, анимация, итог ================== */
{
  fresh(P, { skip: false });
  const g0 = T.zpChestGroups().find(g => g.q >= 1);
  run('выбор сундука', () => T.ACT.zpsel(g0.key));
  const h0 = view(P, 'карточка сундука');
  const chests = g0.list.slice(0, 1), s0 = snap(T);
  const b = press(P, 'открыть один', h0, g0.key, x => /Открыть/.test(x.label));
  if (b && b.op !== 'zo1') say(`карточка: у «Открыть» номер ${b.op}, ждали zo1`);
  const R = checkOp(P, 'открыть один', s0, g0.key, chests, b && b.op, false);
  if (R) {
    checkAgain(P, 'открыть один', g0.key, b.op, b.n);
    const h1 = view(P, 'анимация · начало');
    checkRun(P, 'анимация', R, h1);
    if (resOf(h1)) say('анимация: итог открыт сразу, до конца анимации');
    if (!/data-a="coreveal"/.test(ovOf(h1))) say('анимация: сцену нельзя нажать');
    /* перерисовка посреди анимации: задержки отсчитаны от начала — анимация продолжается с того же места */
    P.tick(R.T.open + 100);
    const hm = view(P, 'анимация · перерисовка посреди');
    if (!hm.includes(`--do:${R.T.open - (R.T.open + 100)}ms`)) say('перерисовка посреди анимации: задержка открытия не отсчитана от начала');
    if (R.phase !== 'anim') say('анимация: итог наступил раньше конца');
    P.tick(R.T.end - (R.T.open + 100) - 1);
    if (R.phase !== 'anim' || resOf(view(P, 'анимация · за миг до итога'))) say('анимация: итог наступил раньше конца');
    P.tick(1);
    if (R.phase !== 'res') say(`анимация: в конце (${R.T.end} мс) итог не наступил`);
    const h2 = view(P, 'итог одного');
    if (!/<div class="co-st co-done"/.test(h2)) say('итог: сцена не в конечном виде (co-done)');
    checkRes(P, 'итог одного', R, h2);
  }
}
/* «Открыть ещё» и «Открыть все» из итога: их номера открывают следующие сундуки; пачка — одна карточка и сводка */
{
  fresh(P, { skip: false });
  const sp = { box: 'shards', r: 4, cyc: 3, win: 'step', week: 'Эльфы' };
  for (let i = 0; i < 6; i++) T.BAG.addChest(Object.assign({ src: 'проверка', seed: T.EnLoot.seedOf('проверка-ещё-' + i) }, sp));
  const key = 'g:' + T.zpChestKey(sp);
  T.S.rs.owned[T.LBX.pools.heroes['Эльфы'][0].id] = { lvl: 0, lim: 0, valor: 0, how: 'souls' };   // осколки пробуждённого — в прах
  run('выбор', () => T.ACT.zpsel(key));
  let s0 = snap(T), g = grp(T, key), b = press(P, 'ещё · первый', view(P, 'ещё · карточка'), key, x => /Открыть/.test(x.label));
  let R = checkOp(P, 'ещё · первый', s0, key, g.list.slice(0, 1), b && b.op, false);
  if (R) { P.tick(R.T.end); const h = view(P, 'ещё · итог первого'); checkRes(P, 'ещё · итог первого', R, h);
    s0 = snap(T); g = grp(T, key);
    b = press(P, 'ещё · «Открыть ещё»', h, key, x => x.n === '1');
    R = checkOp(P, 'ещё · «Открыть ещё»', s0, key, g.list.slice(0, 1), b && b.op, false);
    if (R) { checkRun(P, 'ещё · второй', R, view(P, 'ещё · второй')); if (b) checkAgain(P, 'ещё · «Открыть ещё»', key, b.op, b.n); }
  }
  if (R) {
    /* нажатия на сцену: замок → самая ценная → её переворот → итог; итог и выдача не меняются */
    const s1 = snap(T), T0 = R.T, now = () => P.clock.now - R.t0;
    P.tick(300);
    for (const [k, want] of [[1, T0.lock], [2, T0.hero.start], [3, T0.hero.flip]]) {
      run('нажатие ' + k, () => T.ACT.coreveal()); cnt.taps++;
      if (R.phase !== 'anim' || now() !== want) say(`нажатие ${k} на сцену: показ в ${now()} мс (${R.phase}), ждали момент ${want}`);
      const hv = view(P, 'после нажатия ' + k);
      if (!hv.includes(`--do:${T0.open - want}ms`)) say(`нажатие ${k}: разметка нарисована не из нового момента`);
    }
    P.tick(T0.end - T0.hero.flip - 1);
    if (R.phase !== 'anim') say('нажатия: итог наступил раньше конца');
    run('нажатие 4', () => T.ACT.coreveal()); cnt.taps++;
    if (R.phase !== 'res') say('нажатие на сцену после переворота самой ценной: итог не открылся');
    if (!eq(s1, snap(T))) say('нажатия на сцену изменили запасы или кошелёк');
    const h = view(P, 'ещё · итог второго');
    s0 = snap(T); g = grp(T, key);
    b = press(P, 'ещё · «Открыть все»', h, key, x => x.n === 'all');
    R = checkOp(P, 'ещё · «Открыть все»', s0, key, g.list.slice(), b && b.op, false);
    if (R) {
      const hb = view(P, 'пачка · анимация');
      checkRun(P, 'пачка', R, hb);
      if (!/<b class="co-n">×4<\/b>/.test(hb)) say('пачка: на сундуке нет «×4»');
      P.tick(R.T.end);
      const hr = view(P, 'пачка · итог');
      checkRes(P, 'пачка · итог', R, hr);
      if (grp(T, key)) say('«Открыть все»: сундуки этого вида остались');
      if (!R.items.some(c => c.dust)) say('пачка: осколки пробуждённого героя ни разу не ушли в прах — проверка праха не сработала');
      else if (!/co-dust/.test(resOf(hr))) say('пачка: в итоге нет строки праха');
      if (b) checkAgain(P, 'ещё · «Открыть все»', key, b.op, b.n);
    }
  }
  /* ×N из карточки: шаг количества и «Открыть N» — пачка из N */
  fresh(P, { skip: false });
  for (let i = 0; i < 5; i++) T.BAG.addChest(Object.assign({ src: 'проверка', seed: T.EnLoot.seedOf('проверка-N-' + i) }, { box: 'keys', r: 3, cyc: 2, win: 'step' }));
  const k2 = 'g:' + T.zpChestKey({ box: 'keys', r: 3, cyc: 2, win: 'step' });
  run('×N', () => { T.ACT.zpsel(k2); T.ACT.zpn('1'); T.ACT.zpn('1'); });
  const hN = view(P, '×N · карточка'), gN = grp(T, k2), sN = snap(T);
  const bN = press(P, '×N', hN, k2, x => /Открыть 3/.test(x.label));
  const RN = checkOp(P, '×N', sN, k2, gN.list.slice(0, 3), bN && bN.op, false);
  if (RN) { checkRun(P, '×N', RN, view(P, '×N · анимация')); P.tick(RN.T.end); checkRes(P, '×N · итог', RN, view(P, '×N · итог')); }
}
/* две свежие сессии с одними номерами операций — одни итоги */
{
  const res = [];
  for (let k = 0; k < 2; k++) {
    const Q = load();
    fresh(Q, { skip: true });
    const out = [];
    for (const g of Q.T.zpChestGroups()) { const op = 'zo' + Q.T.S.zp.op; run('сессия', () => Q.T.ACT.zpopen(g.key, { dataset: { op, n: 'all' } })); out.push(Q.T.S.zp.last && Q.T.S.zp.last.sum.log); }
    res.push(out);
  }
  if (!eq(res[0], res[1])) say('две сессии с одними номерами операций получили разные итоги');
}

/* ================== 7. пропуск, галочка, меньше движения, localStorage, закрытие посреди анимации ================== */
{
  fresh(P, { skip: true });
  const g = T.zpChestGroups()[0], s0 = snap(T);
  run('пропуск', () => T.ACT.zpopen(g.key, { dataset: { op: 'zo' + T.S.zp.op } }));
  const R = checkOp(P, 'пропуск', s0, g.key, g.list.slice(0, 1), 'zo1', true);
  if (R) { const h = view(P, 'пропуск · итог'); if (!/co-st co-done/.test(h) || !resOf(h)) say('пропуск: итог не сразу'); if (!/type="checkbox" data-a="coskip" checked/.test(h)) say('пропуск: галочка не стоит'); }
  /* галочка посреди анимации — итог сразу и запомнен */
  const store = new Map(), A = load({ storage: store });
  fresh(A, { skip: false });
  const gA = A.T.zpChestGroups()[0];
  run('галочка', () => A.T.ACT.zpopen(gA.key, { dataset: { op: 'zo1' } }));
  const RA = A.T.S.co.run;
  if (!RA || RA.phase !== 'anim') say('галочка: анимация не пошла');
  A.tick(300);
  run('галочка посреди', () => A.T.ACT.coskip('', { checked: true }));
  if (!RA || RA.phase !== 'res') say('галочка посреди анимации: итог не открылся сразу');
  if (store.get('en-co-skip') !== '1') say('галочка: выбор не записан в localStorage');
  view(A, 'галочка · итог');
  const B = load({ storage: store });
  if (!B.T.S.co.skip) say('галочка: новая страница не помнит «Пропустить анимацию»');
  B.T.S = B.T.initialState();
  if (!B.T.S.co.skip) say('галочка: сброс прототипа забыл «Пропустить анимацию»');
  run('галочка снята', () => B.T.ACT.coskip('', { checked: false }));
  if (store.get('en-co-skip') !== '0') say('галочка: снятие не записано в localStorage');
  /* меньше движения: галочка стоит и заблокирована, итог сразу */
  const Q = load({ reduced: true });
  fresh(Q, { skip: false });
  const gQ = Q.T.zpChestGroups()[0];
  run('меньше движения', () => Q.T.ACT.zpopen(gQ.key, { dataset: { op: 'zo1' } }));
  const hQ = view(Q, 'меньше движения · итог');
  if (!Q.T.S.co.run || Q.T.S.co.run.phase !== 'res') say('меньше движения: итог не сразу');
  if (!/type="checkbox" data-a="coskip" checked disabled/.test(hQ)) say('меньше движения: галочка не стоит и не заблокирована');
  /* без localStorage всё работает */
  const C = load();
  if (C.T.S.co.skip) say('без localStorage: «Пропустить анимацию» стоит');
  fresh(C, {});
  run('без localStorage', () => C.T.ACT.coskip('', { checked: true }));
  if (!C.T.S.co.skip) say('без localStorage: галочка не встала');
  /* окно закрыли посреди анимации: итог выдан, сообщение говорит о нём, таймеры стоят */
  const D = load();
  fresh(D, { skip: false });
  const gD = D.T.zpChestGroups()[0];
  run('закрыть посреди', () => D.T.ACT.zpopen(gD.key, { dataset: { op: 'zo1' } }));
  const RD = D.T.S.co.run; D.tick(500);
  const sD = snap(D.T);
  run('закрыть посреди', () => { D.T.ACT.close(); D.T.coSync(); });
  if (D.T.S.co.run) say('закрыть посреди анимации: показ не остановлен');
  D.tick(1);
  if (!D.T.S.toast || !/в запасах/.test(D.T.S.toast.t)) say('закрыть посреди анимации: нет сообщения, что всё в запасах');
  D.tick(20000);
  if (RD && RD.phase !== 'anim') say('закрыть посреди анимации: таймеры показа продолжили работу');
  if (!eq(sD, snap(D.T))) say('закрыть посреди анимации: запасы или кошелёк изменились');
  if (D.T.S.overlay) say('закрыть посреди анимации: окно открылось снова');
}

/* ================== 8. арт: пока путь не выгружен — заглушка; выгружены — рисунок ================== */
{
  const setAll = Object.keys(ART.sets || {}).flatMap(k => [1, 2, 3, 4, 5, 6, 7].flatMap(r => [`chests/${k}/r${r}-body.webp`, `chests/${k}/r${r}-lid.webp`, `chests/${k}/r${r}.webp`]).concat(`chests/${k}/lock.webp`));
  const all = Object.keys(ART.chests).flatMap(k => [`chests/${k}-body.png`, `chests/${k}-lid.png`]).concat('chests/lock.png', ART.fx.map(n => `chests/fx-${n}.png`), setAll);
  const scene = (Q, box, r, where) => {
    fresh(Q, { skip: false });
    const sp = { box, r, cyc: 3, win: 'step' }; if (box === 'shards') sp.week = 'Эльфы';
    Q.T.BAG.addChest(Object.assign({ src: 'проверка', seed: Q.T.EnLoot.seedOf(`проверка-арт-${box}-${r}`) }, sp));
    const key = 'g:' + Q.T.zpChestKey(sp);
    run(where, () => Q.T.ACT.zpopen(key, { dataset: { op: 'zo' + Q.T.S.zp.op } }));
    const R = Q.T.S.co.run; if (!R) { say(`${where}: показа нет`); return ''; }
    const h = clean(Q, run(where, () => Q.T.OV.co()) || '', where);
    checkRun(Q, where, R, h);
    return h;
  };
  const none = load({ ready: [] });
  for (const box of Object.keys(ART.chests)) {
    const h = scene(none, box, 6, `без арта · ${box}`);
    if (/chests\//.test(h)) say(`без арта · ${box}: в сцене есть путь к невыгруженному арту`);
    if ((h.match(/<svg class="co-sv"/g) || []).length < 3) say(`без арта · ${box}: крышка, корпус или замок — не заглушкой SVG`);
  }
  const full = load({ ready: all });
  for (const box of Object.keys(ART.chests)) for (const r of [2, 6]) {
    const h = scene(full, box, r, `с артом · ${box} · ${r}`); cnt.art++;
    const set = !!(ART.sets && ART.sets[box]);
    const want = set ? [`chests/${box}/r${r}-body.webp`, `chests/${box}/r${r}-lid.webp`, `chests/${box}/lock.webp`] : [`chests/${box}-body.png`, `chests/${box}-lid.png`, 'chests/lock.png'];
    for (const p of want) if (!new RegExp(`<img src="[^"]*${reEsc(p)}\\?v=`).test(h)) say(`с артом · ${box} · ${r}: нет картинки ${p}`);
    if (set && /chests\/[a-z]+-(?:body|lid)\.png/.test(h)) say(`с артом · ${box} · ${r}: у вида с листом режима — прежний сундук`);
    if (/<svg class="co-sv"/.test(h)) say(`с артом · ${box}: осталась заглушка SVG`);
    for (const n of ['haze', 'beam', 'dust', 'flash']) if (!new RegExp(`--tex:url\\('[^']*chests/fx-${n}\\.png\\?v=`).test(h)) say(`с артом · ${box}: нет текстуры ${n}`);
    if (r >= V.gild && !/class="co-shn co-a" style="--m:url\('/.test(h)) say(`с артом · ${box} · ${r}: нет золотого отблеска по рисунку`);
    if (!/class="co-lit co-lvx/.test(h)) say(`с артом · ${box}: нет света ступени на корпусе`);
  }
  /* лист режима без крышки одной редкости — прежний сундук вида этой редкости, замок режима остаётся */
  for (const box of Object.keys(ART.sets || {})) {
    const part = load({ ready: all.filter(p => p !== `chests/${box}/r3-lid.webp`) }), hp = scene(part, box, 3, `лист без крышки · ${box}`);
    if (!hp.includes(`chests/${box}-body.png`) || hp.includes(`chests/${box}/r3-`)) say(`лист без крышки · ${box}: не прежний сундук вида`);
    const hq = scene(part, box, 4, `лист · ${box} · 4`);
    if (!hq.includes(`chests/${box}/r4-lid.webp`)) say(`лист · ${box} · 4: соседняя редкость потеряла рисунок`);
  }
  /* плитка сундука в запасах и наградах (zpChestPic, chestPic): у вида с листом — тот же рисунок своей редкости, уменьшенный; без листа —
     прежний сундук вида; без арта — значок CHEST */
  let pics = 0;
  for (const box of Object.keys(T.LBX.boxes)) for (let r = 1; r <= 7; r++) {
    const set = !!(ART.sets && ART.sets[box]), h = full.T.zpChestPic(box, r), w = set ? `chests/${box}/r${r}.webp` : `chests/${box}-body.png`; pics++;
    if (!h.includes(w + '?v=')) say(`плитка сундука · ${box} · ${r}: нет картинки ${w}`);
    if (!full.T.chestPic || full.T.chestPic(box, r) !== h) say(`chestPic · ${box} · ${r}: не та же картинка, что в запасах`);
    if (/chests\//.test(none.T.zpChestPic(box, r))) say(`плитка сундука без арта · ${box} · ${r}: путь к невыгруженному арту`);
  }
  if (!pics) say('плитка сундука: не проверена');
  /* сундук без одного слоя — заглушка целиком, пути нет */
  const half = load({ ready: ['chests/keys-body.png'] }), hh = scene(half, 'keys', 4, 'арт без крышки');
  if (/chests\/keys/.test(hh) || (hh.match(/<svg class="co-sv"/g) || []).length < 3) say('арт без крышки: сундук не остался заглушкой целиком');
}

/* ================== 9. все виды × редкости × окна × циклы (× недели) ==================
   Спойлеры игроку не называются: талисманы со спойлером в имени, ресурсы цикла VI и записи recipes.js с team — как в check_bag.js */
{
  fresh(P, { skip: false });
  const spoil = [...new Set(Object.values(T.LBX.talInfo).filter(t => t[2]).map(t => t[0])
    .concat(Object.values(T.LBX.items).filter(i => i.team).map(i => i.n), T.RX.items.filter(i => i.team).map(i => i.n)))];
  let leaks = 0;
  const leak = (h, where) => { const l = spoil.filter(n => h.includes(n)); if (l.length && leaks++ < 5) say(`${where}: спойлер без режима «Команда» — ${l.slice(0, 3).join(', ')}`); };
  const pool = Object.values(T.LBX.pools.heroes).flat();
  pool.forEach((h, i) => { if (i % 2 === 0 && T.RSI[h.id]) T.S.rs.owned[h.id] = { lvl: 0, lim: 0, valor: 0, how: 'souls' }; });
  let k = 0;
  for (const box of Object.keys(T.LBX.boxes)) for (let r = 1; r <= 7; r++) for (const win of Object.keys(T.LBX.winNames)) for (let cyc = 1; cyc <= 6; cyc++) for (const week of box === 'shards' ? T.LBX.weeks : [null]) {
    const sp = { box, r, cyc, win }; if (week) sp.week = week;
    T.BAG.addChest(Object.assign({ src: 'проверка', seed: T.EnLoot.seedOf('проверка-все-' + (k++)) }, sp));
    const key = 'g:' + T.zpChestKey(sp), g = grp(T, key), where = `${box} · ${r} · ${win} · цикл ${cyc}${week ? ' · ' + week : ''}`;
    if (!g) { say(`${where}: сундук не лёг в запасы`); continue; }
    const s0 = snap(T), op = 'zo' + T.S.zp.op;
    run(where, () => T.ACT.zpopen(key, { dataset: { op } }));
    const R = checkOp(P, where, s0, key, g.list.slice(0, 1), op, false);
    if (!R) continue;
    const h = clean(P, run(where, () => T.OV.co()) || '', where + ' · анимация');
    checkRun(P, where, R, h);
    run(where, () => T.coReveal(R));
    const hr = clean(P, run(where, () => T.OV.co()) || '', where + ' · итог');
    checkRes(P, where, R, hr);
    leak(h + hr, where);
    T.S.overlay = null;
    cnt.synth++;
  }
  if (!spoil.length) say('спойлеры: список пуст — проверка утечек ничего не сторожит');
}

/* ================== 10. UI-кит и карта экранов ================== */
{
  const K = load();
  fresh(K, {});
  const entry = K.T.KIT_EXTRA.find(x => { try { return /co-kbox/.test(x.html()); } catch (_) { return false; } });
  if (!entry) say('UI-кит: нет раздела «Открытие сундука» в KIT_EXTRA');
  else {
    /* пояснение раздела — для команды, как у других разделов UI-кита (ссылки на § и файлы); сцену раздела ниже смотрим глазами игрока */
    const h = run('UI-кит', () => entry.html()) || '';
    if (!h || /undefined|NaN|\[object /.test(h)) say('UI-кит · раздел: пустая разметка или undefined, NaN');
    for (let r = 1; r <= 7; r++) if (!h.includes(`data-co="r:${r}"`)) say(`UI-кит: нет кнопки пробы редкости ${r}`);
    for (const b of Object.keys(K.T.LBX.boxes)) if (!h.includes(`data-co="box:${b}"`)) say(`UI-кит: нет вида ${b}`);
    if (!h.includes('data-co="many"') || !h.includes('id="coKit"') || !h.includes('id="coKitStage"')) say('UI-кит: нет пачки или сцены');
    if (!/Арт: листы режимов — \d+ из 7 видов по семи редкостям/.test(h)) say('UI-кит: нет строки о готовности арта');
    run('UI-кит · paint', () => entry.paint());
    const idle = K.els.coKitStage ? K.els.coKitStage.innerHTML : '';
    if (!/co-st co-idle/.test(idle) || !/class="co-lock co-a"/.test(idle)) say('UI-кит: до пробы на сцене нет закрытого сундука под замком');
    /* раскадровка: пять кадров — предвкушение, замок и крышка, карточки, самая ценная, итог; кадр стоит в своём моменте */
    const board = clean(K, K.els.coKitBoard ? K.els.coKitBoard.innerHTML : '', 'UI-кит · раскадровка');
    const frames = board.split('<figure class="co-still">').slice(1);
    if (frames.length !== 5) say(`UI-кит · раскадровка: кадров ${frames.length}, ждали 5`);
    else {
      const B = K.T.CO_VIEW.board, d = (f, k) => num((f.match(/<div class="co-st[^"]*"[^>]*style="([^"]*)"/) || [])[1] || '', k);
      if (!(d(frames[0], '--dk') > 0 && d(frames[0], '--dc0') < 0)) say('раскадровка: первый кадр не в предвкушении, до замка');
      if (d(frames[1], '--do') !== -B.open) say('раскадровка: второй кадр не сразу после открытия');
      if (!/class="co-card co-a/.test(frames[2]) || !(d(frames[2], '--do') < 0)) say('раскадровка: в третьем кадре нет карточек');
      if (d(frames[3], '--dhs') !== -B.hero) say('раскадровка: четвёртый кадр — не самая ценная после переворота');
      if (!/<section class="co-res/.test(frames[4]) || !/co-st co-done/.test(frames[4])) say('раскадровка: пятый кадр — не итог');
    }
    const s0 = snap(K.T), T0 = K.T;
    for (let r = 1; r <= 7; r++) {
      run(`проба ${r}`, () => T0.coKitAct('r:' + r));
      const R = T0.CO_KIT.run; cnt.trials++;
      if (!R || !R.trial || R.host !== 'kit' || R.r !== r || R.n !== 1) { say(`проба ${r}: показа нет или он не тот`); continue; }
      const hs = clean(K, K.els.coKitStage.innerHTML, `проба ${r} · сцена`);
      checkRun(K, `проба ${r}`, R, hs);
      K.tick(R.T.end);
      if (R.phase !== 'res') say(`проба ${r}: итог не наступил в конце`);
      const hr = K.els.coKitStage.innerHTML;
      if (!resOf(hr).includes('проба — не выдача') || /в запасах/.test(resOf(hr))) say(`проба ${r}: итог не помечен «проба — не выдача»`);
    }
    run('проба пачкой', () => T0.coKitAct('many'));
    if (!T0.CO_KIT.run || T0.CO_KIT.run.n !== T0.CO_VIEW.kitMany) say('проба пачкой: открыто не столько, сколько в CO_VIEW.kitMany');
    else { checkRun(K, 'проба пачкой', T0.CO_KIT.run, K.els.coKitStage.innerHTML); cnt.trials++; }
    run('проба ещё', () => T0.coKitAct('again'));
    if (!T0.CO_KIT.run || T0.CO_KIT.run.n !== 1) say('проба «Открыть ещё»: не один сундук');
    run('вид ключей', () => T0.coKitAct('box:keys'));
    if (T0.CO_KIT.box !== 'keys' || T0.CO_KIT.run) say('UI-кит: выбор вида не сбросил пробу');
    if (!/data-box="keys"/.test(K.els.coKitStage.innerHTML)) say('UI-кит: сцена не показала выбранный вид');
    if ((K.els.coKitBoard.innerHTML.match(/data-box="keys"/g) || []).length !== 5) say('UI-кит: раскадровка не показала выбранный вид');
    if (!eq(s0, snap(T0))) say('UI-кит: проба изменила запасы, кошелёк или сундуки');
    /* «С анимацией» раздела «Лутбоксы»: тот же сундук на том же сиде — предметы из его списка бросков */
    for (const [box, r, win, cyc, week, awake, seed] of [['shards', 3, 'step', 3, 'Эльфы', false, 'проба-7'], ['shards', 5, 'wild', 4, 'Люди', true, 'проба-3'], ['talisman', 6, 'pure', 5, 'Эльфы', false, 'проба-1'], ['wander', 2, 'step', 2, 'Эльфы', false, 'проба-9']]) {
      Object.assign(T0.LB, { box, r, win, cyc, week, awake, seed });
      const lb = run('раздел «Лутбоксы»', () => T0.lbHtml()) || '';
      if (!lb.includes('data-co="lb"')) say('раздел «Лутбоксы»: у пробного открытия нет кнопки «С анимацией»');
      run('С анимацией', () => T0.coKitAct('lb'));
      const R = T0.CO_KIT.run, def = T0.EnLoot.resolve(T0.LBX, { box, r, win, cyc, week: box === 'shards' ? week : null }), want = T0.EnLoot.roll(def, T0.EnLoot.seedOf(seed)).items;
      if (!R) { say(`С анимацией ${box} ${r}: показа нет`); continue; }
      const got = R.items.map(c => ({ kind: c.kind, id: c.id, q: c.q, r: c.r }));
      if (!eq(got, want.map(it => ({ kind: it.kind, id: it.id, q: it.q, r: it.r })))) say(`С анимацией ${box} ${r}: предметы не те, что в списке бросков раздела «Лутбоксы»`);
      if (awake && want.some(it => it.kind === 'shard') && !R.items.some(c => c.dust)) say(`С анимацией ${box} ${r}: «герои пробуждены» — осколки не ушли в прах`);
      cnt.trials++;
    }
  }
  /* карта экранов: шаблон «Открытие сундука», число шаблонов в сводке и в README */
  const tpl = K.T.TEMPLATES;
  if (!tpl.some(t => t[0] === 'Открытие сундука')) say('карта экранов: нет шаблона «Открытие сундука»');
  const kpi = html.match(/ещё (\d+) шаблонов окон поверх/), readme = fs.readFileSync(path.join(UI, 'README.md'), 'utf8').match(/(\d+) шаблонов окон поверх/);
  if (!kpi || +kpi[1] !== tpl.length) say(`карта экранов: в сводке ${kpi ? kpi[1] : '—'} шаблонов, в TEMPLATES ${tpl.length}`);
  if (!readme || +readme[1] !== tpl.length) say(`design/ui/README.md: ${readme ? readme[1] : '—'} шаблонов окон, в TEMPLATES ${tpl.length}`);
}

/* ================== 11–12. режим «Игрок» и «Команда», сценарии ================== */
function tour(team) {
  const tag = team ? ' [команда]' : '';
  const Q = load();
  run('режим', () => Q.T.setTeam(team));
  let teamEls = 0;
  const v = w => { const h = view(Q, w + tag); if (team) teamEls += teamCount(h); return h; };
  for (const skip of [false, true]) {
    fresh(Q, { skip });
    for (const g of Q.T.zpChestGroups()) {
      const op = 'zo' + Q.T.S.zp.op;
      run('открыть', () => Q.T.ACT.zpopen(g.key, { dataset: { op, n: 'all' } }));
      const R = Q.T.S.co.run; if (!R) continue;
      if (!skip) { v(`${g.key} · начало`); Q.tick(R.T.open + 50); v(`${g.key} · крышка`); Q.tick(R.T.hero.flip - R.T.open); v(`${g.key} · самая ценная`); Q.tick(R.T.end); }
      v(`${g.key} · итог${skip ? ' сразу' : ''}`);
    }
  }
  for (const name of ['Сундук · открытие', 'Сундуки · пачкой']) {
    const fl = Q.T.FLOWS.find(f => f[0] === name);
    if (!fl) { say(`нет сценария презентации «${name}»`); continue; }
    fresh(Q, { skip: false });
    run(name, () => fl[2]());
    const d = name === 'Сундук · открытие' ? Q.T.CO_DEMO.one : Q.T.CO_DEMO.many, R = Q.T.S.co.run;
    if (!Q.T.S.overlay || Q.T.S.overlay.t !== 'co' || !R || R.n !== d.count) say(`сценарий «${name}»: окно открытия не открыто или открыто не ${d.count}`);
    v(`сценарий «${name}»`);
    if (R) { Q.tick(R.T.end); v(`сценарий «${name}» · итог`); }
  }
  if (team && !teamEls) say('режим «Команда»: у окна открытия нет элементов team-only');
  if (team) { fresh(Q, { skip: true }); const g = Q.T.zpChestGroups()[0]; run('пометка', () => Q.T.ACT.zpopen(g.key, { dataset: { op: 'zo1' } })); if (!/team-only[^>]*>Итог выдан до анимации/.test(v('пометка о выдаче'))) say('режим «Команда»: в итоге нет пометки «итог выдан до анимации»'); }
}
tour(false);
tour(true);
done();
