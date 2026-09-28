/* Автопроверка окна открытия сундука (design/ui/screens/chest-open.js) — без браузера.
   1. index.html подключает chest-open.css и chest-open.js после bag.js; концы строк файлов окна — только CRLF; файл компилируется.
   2. Числа вида CO_VIEW — целые; по семи редкостям — ожидание, размах дрожи, ореол, лучи, всплеск, искра, вспышка; ожидание и
      размах растут с редкостью. У каждого вида сундука из EN_LOOTBOXES — свой материал и эмблема.
   3. Операция: кнопка «Открыть» карточки несёт номер операции. Выдача — до анимации: запасы, кошелёк, осколки и «из сундуков»
      изменились ровно на итог, итог — EnLoot.roll на сиде каждого сундука с прахом по коллекции (пересчёт независимый). Повтор того же
      номера ничего не выдаёт и показа не меняет; две свежие сессии с одними номерами получают одни итоги.
   4. Анимация по часам песочницы: карточки — все выпавшие записи по возрастанию ценности, самая ценная последней и крупнее, у каждой —
      выпавшая редкость; карточка летит из щели сундука к своему месту; итог — ровно в конце, не раньше; ожидание растёт с редкостью;
      лучи — с эпического, золотая оковка — с древнего; перерисовка посреди анимации продолжает её с того же места.
   5. Итог: одна сетка, каждая запись один раз, редкие сверху; валюта — сумма по сундукам; «Открыть ещё» — если есть такие же,
      «Открыть все · N» — если осталось два и больше, «Закрыть»; номера операций на них открывают следующие сундуки.
   6. Пачка: ×N из карточки и «Открыть все» — короткое ожидание и одна карточка — самый ценный предмет пачки; сводка по редкостям.
   7. «Пропустить анимацию» — итог сразу; галочка посреди анимации и нажатие на сцену — итог сразу; выбор помнит localStorage, без него
      всё работает; при prefers-reduced-motion галочка стоит и заблокирована. Окно закрыли посреди анимации — итог сообщением, выдачи
      второй раз нет, таймеры стоят.
   8. Все виды × редкости × окна × циклы (× недели у осколков): показ без исключений, undefined и NaN, служебного игроку не видно.
   9. UI-кит: раздел «Открытие сундука» — семь видов, семь редкостей, пачка; проба не меняет S; «С анимацией» раздела «Лутбоксы» —
      те же предметы, что его список бросков. Карта экранов: шаблон «Открытие сундука», число шаблонов в сводке и в README совпадает.
   10. Режим «Игрок»: на всех видах окна нет служебных слов (SERVICE из check_player_view.js); в режиме «Команда» — пометка о выдаче.
   11. Сценарии презентации «Сундук · открытие» и «Сундуки · пачкой».
   Запуск: node tools/content-gen/screens/check_chest_open.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText, teamCount } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, ops: 0, chests: 0, synth: 0, trials: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Открытие сундука: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; операций ${cnt.ops}, сундуков открыто ${cnt.chests}, всех видов ${cnt.synth}, проб UI-кита ${cnt.trials}.`);
  console.log('Проверка пройдена: итог выдан до анимации на сиде каждого сундука, повтор номера ничего не выдаёт, анимация и итог рисуются, пропуск работает, в режиме «Игрок» служебного нет.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
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
}
if (err.length) done();

/* ================== песочница ==================
   Скрипты прототипа — по порядку, как в браузере, с заглушкой DOM; boot() не запускается. Часы свои: setTimeout ставит задачу в очередь,
   tick(мс) двигает время и выполняет задачи по порядку — так видно, когда наступает итог. storage — 'throw' или Map; reduced — меньше движения */
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
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => clock.now } };
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
    zpChestGroups, zpChestKey, zpV, zpDef, zpSeed, zpExtraKey,
    CO_VIEW, CO_KINDS, CO_DEMO, CO_KIT, coShow, coReveal, coGroups, coVal, coSync, coKitAct, coKitHtml, coStageHtml,
  })`, ctx);
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
/* свежая сессия: «Запасы → Сундуки», «Пропустить анимацию» — как задано */
function fresh(P, o = {}) {
  const T = P.T;
  T.S = T.initialState(); T.S.overlay = null; T.S.route = 'craft'; T.S.seg.craft = 'stock'; T.S.zp.tab = 'chest';
  if (o.skip != null) T.S.co.skip = o.skip;
}
const snap = T => JSON.parse(JSON.stringify({ wallet: T.S.wallet, items: T.S.bag.items, shards: T.S.rs.shards, extra: T.S.zp.extra, chests: T.S.bag.chests.map(c => c.id), op: T.S.zp.op }));
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
/* сдвиг запасов по ожидаемому итогу: валюта — в кошелёк, ресурсы — в запасы, осколки — героям, прах — в кошелёк, прочее — «из сундуков» */
function delta(T, log) {
  const d = { wallet: {}, items: {}, shards: {}, extra: {} }, add = (m, k, q) => { m[k] = (m[k] || 0) + q; };
  for (const L of log) {
    for (const [k, a] of L.cur) add(d.wallet, k, a);
    for (const it of L.items) {
      if (it.kind === 'item') add(d.items, it.id, it.q);
      else if (it.kind === 'cur') add(d.wallet, it.id, it.q);
      else if (it.kind === 'shard') { if (it.dust) add(d.wallet, 'dust', it.dust); else add(d.shards, it.id, it.q); }
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
/* показ по существу: карточки по ценности, самая ценная последней и крупнее, выпавшие редкости, полёт из щели, моменты */
function checkRun(P, where, R, h) {
  const T = P.T, V = T.CO_VIEW, G = V.geo, many = R.n > 1;
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
  const t = R.T, ts = [t.tW, t.tO].concat(t.cards, [t.end]);
  if (ts.some(x => !Number.isInteger(x))) say(`${where}: моменты анимации не целые`);
  for (let i = 1; i < ts.length; i++) if (ts[i] <= ts[i - 1]) say(`${where}: моменты анимации не растут — ${ts.join(', ')}`);
  if (t.wait !== (many ? V.waitMany : V.wait[R.r - 1])) say(`${where}: ожидание ${t.wait}, ждали ${many ? V.waitMany : V.wait[R.r - 1]}`);
  if (!h) return;
  const st = h.slice(h.indexOf('<div class="co-st'));
  const cards = [...st.matchAll(/<div class="co-card co-a( best)?[^"]*" data-r="(\d)" data-i="(\d+)"[^>]*style="([^"]*)"/g)];
  if (cards.length !== R.cards.length) say(`${where}: карточек в разметке ${cards.length}, в показе ${R.cards.length}`);
  const mx = G.w / 2, my = G.h - G.chest[1] - G.pad + G.seam;
  cards.forEach((m, i) => {
    const c = R.cards[+m[3]], sty = m[4], num = k => +((sty.match(new RegExp(`(?:^|;)${k}:(-?\\d+)(?:px|ms)?`)) || [])[1]);
    if (!!m[1] !== (i === cards.length - 1)) say(`${where}: «самая ценная» — не у последней карточки`);
    if (c && +m[2] !== c.r) say(`${where}: у карточки редкость ${m[2]}, выпало ${c.r}`);
    const L = num('left'), Tp = num('top'), w = num('--w'), hh = num('--h'), fx = num('--fx'), fy = num('--fy');
    if (Math.abs(L + w / 2 + fx - mx) > 1 || Math.abs(Tp + hh / 2 + fy - my) > 1) say(`${where}: карточка ${i} вылетает не из щели сундука`);
    if (i === cards.length - 1 && (w !== G.best[0] || hh !== G.best[1])) say(`${where}: самая ценная карточка не крупнее`);
  });
  if (/style="[^"]*\d\.\d/.test(st.replace(/<svg[\s\S]*?<\/svg>/g, ''))) say(`${where}: в стилях сцены дробные числа`);
  const chest = st.match(/<div class="co-chest co-a" data-g="(\d)"/);
  if (!chest || +chest[1] !== (R.r >= V.gild ? 1 : 0)) say(`${where}: золотая оковка не по редкости`);
  if (st.includes('class="co-rays"') !== (R.r >= V.rays)) say(`${where}: лучи ${R.r >= V.rays ? 'пропали' : 'лишние'} у редкости ${R.r}`);
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

/* ================== 2. данные вида ================== */
const P = load({ storage: new Map() });
const { T } = P;
const V = T.CO_VIEW;
{
  const bad = [];
  (function walk(x, k) { if (typeof x === 'number') { if (!Number.isInteger(x)) bad.push(k); } else if (x && typeof x === 'object') for (const [kk, v] of Object.entries(x)) walk(v, k + '.' + kk); })(V, 'CO_VIEW');
  if (bad.length) say('CO_VIEW: не целые числа — ' + bad.slice(0, 8).join(', '));
  for (const k of ['wait', 'amp', 'halo', 'ray']) if (!Array.isArray(V[k]) || V[k].length !== 7) say(`CO_VIEW.${k}: не семь значений по редкостям`);
  for (const k of ['open', 'card']) if (!Array.isArray(V.fx[k]) || V.fx[k].length !== 7) say(`CO_VIEW.fx.${k}: не семь значений по редкостям`);
  if (V.fx.best.flash.length !== 7) say('CO_VIEW.fx.best.flash: не семь значений');
  for (const k of ['wait', 'amp', 'halo']) for (let i = 1; i < 7; i++) if (V[k][i] < V[k][i - 1]) say(`CO_VIEW.${k}: у редкости ${i + 1} меньше, чем у ${i}`);
  for (let i = 0; i < 7; i++) {
    const O = V.fx.open[i];
    if (!O.sparks || !O.streaks || !O.flash) say(`CO_VIEW.fx.open[${i}]: нет искр, полос или вспышки`);
    if (i + 1 >= V.rays && !V.ray[i]) say(`CO_VIEW.ray[${i}]: лучей нет с эпического`);
    if (!!O.rings !== (i + 1 >= 5) || !!O.shake !== (i + 1 >= 5)) say(`CO_VIEW.fx.open[${i}]: кольца и дрожь — не с древнего`);
    if (i && O.sparks[0] <= V.fx.open[i - 1].sparks[0]) say(`CO_VIEW.fx.open[${i}]: всплеск не богаче, чем у редкости ниже`);
  }
  for (const k of Object.keys(T.LBX.boxes)) {
    const K = T.CO_KINDS[k];
    if (!K) { say(`CO_KINDS: нет вида ${k}`); continue; }
    for (const c of ['wood', 'wood2', 'metal', 'metal2']) if (!/^#[0-9a-f]{6}$/i.test(K[c] || '')) say(`CO_KINDS.${k}.${c}: не цвет #rrggbb`);
    if (!K.n || !K.ic) say(`CO_KINDS.${k}: нет подписи или эмблемы`);
  }
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
    if (!/data-a="coreveal"/.test(ovOf(h1))) say('анимация: сцену нельзя нажать, чтобы сразу увидеть итог');
    /* перерисовка посреди анимации: задержки отсчитаны от начала — анимация продолжается с того же места */
    P.tick(R.T.tO + 100);
    const hm = view(P, 'анимация · перерисовка посреди');
    if (!hm.includes(`--do:${R.T.tO - (R.T.tO + 100)}ms`)) say('перерисовка посреди анимации: задержка открытия не отсчитана от начала');
    if (R.phase !== 'anim') say('анимация: итог наступил раньше конца');
    P.tick(R.T.end - (R.T.tO + 100) - 1);
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
    run('ещё · нажатие на сцену', () => T.ACT.coreveal());
    if (R.phase !== 'res') say('нажатие на сцену посреди анимации: итог не открылся сразу');
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

/* ================== 8. все виды × редкости × окна × циклы (× недели) ==================
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

/* ================== 9. UI-кит и карта экранов ================== */
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
    run('UI-кит · paint', () => entry.paint());
    if (!/co-st co-idle/.test(K.els.coKitStage ? K.els.coKitStage.innerHTML : '')) say('UI-кит: до пробы на сцене нет закрытого сундука');
    /* раскадровка: четыре кадра — ожидание, крышка, карточки, итог; кадр стоит в своём моменте (задержки от начала показа) */
    const board = clean(K, K.els.coKitBoard ? K.els.coKitBoard.innerHTML : '', 'UI-кит · раскадровка');
    const frames = board.split('<figure class="co-still">').slice(1);
    if (frames.length !== 4) say(`UI-кит · раскадровка: кадров ${frames.length}, ждали 4`);
    else {
      const V0 = K.T.CO_VIEW, d = f => +((f.match(/--do:(-?\d+)ms/) || [])[1]);
      if (!(d(frames[0]) > 0)) say('раскадровка: первый кадр не до открытия крышки');
      if (!(d(frames[1]) < 0 && d(frames[1]) === -V0.board.open)) say('раскадровка: второй кадр не сразу после открытия');
      if (!/class="co-card co-a best"/.test(frames[2])) say('раскадровка: в третьем кадре нет карточек');
      if (!/<section class="co-res/.test(frames[3]) || !/co-st co-done/.test(frames[3])) say('раскадровка: четвёртый кадр — не итог');
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
    if ((K.els.coKitBoard.innerHTML.match(/data-box="keys"/g) || []).length !== 4) say('UI-кит: раскадровка не показала выбранный вид');
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

/* ================== 10–11. режим «Игрок» и «Команда», сценарии ================== */
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
      if (!skip) { v(`${g.key} · начало`); Q.tick(R.T.tO + 50); v(`${g.key} · крышка`); Q.tick(R.T.end); }
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
