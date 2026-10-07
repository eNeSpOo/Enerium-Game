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
   13. Новые записи (ADR-0047). Итог сундука — гарантированные записи (sure) первыми, за ними случайные. Осколки героев Эхо — связку
       героя недели и гарантию (запись вида target) — делит «сервер» героев Эхо: герой-цель недели сундука, излишек — следующей цели,
       собран весь отряд недели — прах Эха; проверка пересчитывает цепочку сама (echoSim) и сверяет получателей, осколки и прах Эха.
       У каждого вида сундука — свой вид (coKind): сундуки КрафБоссов и артели берут чужой рисунок и несут отметку темы.
   14. Законы открытия — функции без аргументов → список нарушений; их же зовёт проверка мутацией:
       grant — гарантия выдана цели недели и не теряется; again — повтор номера ничего не выдаёт; theme — сундук темы даёт запись
       темы наверняка; forbid — в сундуке нет запрещённого (билеты призыва, души, Энериум, герои целиком, изделия, ларцы;
       руны — только в сундуках КрафБоссов). Мутации ломают «сервер», розыгрыш или данные — закон обязан упасть.
   Запуск: node tools/content-gen/screens/check_chest_open.js [--mut — напечатать, что закон нашёл у каждой поломки]
   [--laws — только данные вида, законы и мутации: быстрый прогон при правке законов; полная проверка — без него] */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText, teamCount } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const SHOW_MUT = process.argv.includes('--mut');
const ONLY_LAWS = process.argv.includes('--laws');   // только данные вида, законы открытия и мутации — быстрый прогон при правке законов
const cnt = { views: 0, player: 0, ops: 0, chests: 0, synth: 0, trials: 0, taps: 0, art: 0, echo: 0, edust: 0, sure: 0, laws: 0, mut: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  if (ONLY_LAWS) { console.log(`Быстрый прогон --laws: данные вида, законов открытия ${cnt.laws}, мутаций ${cnt.mut} — пойманы все. Это не вся проверка: полная — без флага.`); process.exit(0); }
  console.log(`Открытие сундука: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; операций ${cnt.ops}, сундуков открыто ${cnt.chests}, всех видов ${cnt.synth}, нажатий на сцену ${cnt.taps}, проб UI-кита ${cnt.trials}, показов с артом ${cnt.art}.`);
  console.log(`Новые записи: гарантированных выдано ${cnt.sure}, раздач осколков героев Эхо ${cnt.echo}, из них с прахом Эха ${cnt.edust}; законов открытия ${cnt.laws}, мутаций ${cnt.mut} — пойманы все.`);
  console.log('Проверка пройдена: итог выдан до анимации на сиде каждого сундука, гарантия ушла цели недели и не потерялась, повтор номера ничего не выдаёт, сундук темы даёт запись темы наверняка, запрещённого в сундуках нет; свет поднимается до самой ценной, анимация и итог рисуются, нажатие ведёт по моментам, пропуск работает, арт — по выгрузке, в режиме «Игрок» служебного нет.');
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
    ACT, OV, FLOWS, KH, BAG, LBX, RSI, RX, RS, LB, TEMPLATES, KIT_EXTRA, render, initialState, setTeam, fmt, rsHas, lbHtml, EnLoot: window.EnLoot,
    zpChestGroups, zpChestKey, zpV, zpDef, zpSeed, zpExtraKey, zpChestPic, zpWeekOf, chestPic: typeof chestPic === 'function' ? chestPic : null,
    CO_VIEW, CO_ART, CO_KINDS, CO_DEMO, CO_KIT, coShow, coReveal, coGroups, coVal, coSync, coKitAct, coKitHtml, coStageHtml, coChestGeo, coWinMin,
    coKind, coArtBox, coMark, EH: window.EN_ECHO_HEROES,
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
  return { T, ctx, els, rootCls, clock, tick, game: () => (els.game ? els.game.innerHTML : '') };
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
/* цепочка героев Эхо — пересчёт проверки, независимый от «сервера» прототипа (ADR-0047). Комплект героя Эхо — roster.js,
   rules.echoSet по его циклу; собран — в коллекции или комплект набран; отряд недели — её герои, открытые по циклу аккаунта, младший
   первым; цель недели — выбранная игроком, пока не собрана, иначе старший несобранный. Гарантия q недели: цели до комплекта, излишек —
   следующей цели; целей нет — прах Эха, осколок × rules.echoDust.perShard. Связка героя: ему до комплекта (открыт по циклу и не
   собран), излишек — как гарантия его недели. shards — осколки до операции; give(запись, неделя сундука) → { parts, dust } и ведёт
   свой счёт осколков; roll — розыгрыш (по умолчанию — EnLoot.roll песочницы) */
function echoSim(T, shards) {
  const RS = T.RS, have = Object.assign({}, shards), cyc = T.S.acc.cycle, per = RS.rules.echoDust ? RS.rules.echoDust.perShard : 1;
  const isEcho = id => !!T.RSI[id] && T.RSI[id].src === 'echo';
  const need = h => RS.rules.echoSet[h.c - 1], got = h => have[h.id] || 0, done = h => T.rsHas(h) || got(h) >= need(h);
  const squad = race => { const W = RS.weeks.find(w => w.race === race); return W ? W.squad.map(id => T.RSI[id]).filter(h => h && h.c <= cyc).sort((a, b) => a.c - b.c) : []; };
  const target = race => { const sq = squad(race).filter(h => !done(h)), id = ((T.S.ech && T.S.ech.targets) || {})[race]; return sq.find(h => h.id === id) || sq[sq.length - 1] || null; };
  const grant = (race, q) => {
    const parts = []; let left = q;
    for (let guard = 0; left > 0 && guard < 16; guard++) { const h = target(race); if (!h) break; const n = Math.min(left, need(h) - got(h)); if (n <= 0) break; have[h.id] = got(h) + n; left -= n; parts.push([h.id, n]); }
    return { parts, dust: left * per };
  };
  const give = (it, week) => {
    if (it.kind === 'target') return grant(it.id || week || '', it.q);
    const h = T.RSI[it.id], n = done(h) || h.c > cyc ? 0 : Math.min(it.q, need(h) - got(h));
    if (n > 0) have[h.id] = got(h) + n;
    const W = RS.weeks.find(w => w.squad.includes(it.id)), rest = grant(W ? W.race : '', it.q - n);
    return { parts: (n > 0 ? [[h.id, n]] : []).concat(rest.parts), dust: rest.dust };
  };
  return { isEcho, echoIt: it => it.kind === 'target' || (it.kind === 'shard' && isEcho(it.id)), give, per, squad, target, need, done, got };
}
/* ожидаемый итог — независимо: EnLoot.roll на сиде каждого сундука — гарантированные записи первыми, за ними случайные; прах — по
   коллекции на момент открытия у героев возрождения душ; осколки героев Эхо в общий прах не идут — их делит цепочка целей (delta) */
function expect(T, chests, roll) {
  const E = echoSim(T, {});
  return chests.map(c => {
    const res = (roll || T.EnLoot.roll)(T.zpDef(c), T.zpSeed(c)), aw = {};
    (res.sure || []).concat(res.items).forEach(it => { if (it.kind === 'shard' && !E.isEcho(it.id) && T.RSI[it.id] && T.rsHas(T.RSI[it.id])) aw[it.id] = true; });
    const conv = T.EnLoot.toDust(T.LBX, res, aw);
    return { cur: conv.cur, items: (conv.sure || []).concat(conv.items), week: T.zpWeekOf(c) };
  });
}
/* сдвиг запасов по ожидаемому итогу: валюта — в кошелёк, ресурсы — в запасы, осколки — героям, прах — в кошелёк, снаряжение — предметами
   в запасы снаряжения (screens/equipment.js: сервер создаёт предмет на сиде сундука), прочее — «из сундуков». Осколки героев Эхо —
   по цепочке целей недели от осколков до операции (shards0): to — раздача каждой такой записи по порядку, прах Эха — в кошелёк */
function delta(T, log, shards0) {
  const d = { wallet: {}, items: {}, shards: {}, extra: {}, eq: 0, to: [] }, add = (m, k, q) => { m[k] = (m[k] || 0) + q; }, E = echoSim(T, shards0 || {});
  for (const L of log) {
    for (const [k, a] of L.cur) add(d.wallet, k, a);
    for (const it of L.items) {
      if (it.kind === 'item') add(d.items, it.id, it.q);
      else if (it.kind === 'cur') add(d.wallet, it.id, it.q);
      else if (E.echoIt(it)) { const to = E.give(it, L.week); d.to.push(to); for (const [id, n] of to.parts) add(d.shards, id, n); if (to.dust) add(d.wallet, 'edust', to.dust); }
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
  if (!eq(L.sum.log.map(x => ({ cur: x.cur, items: x.items })), want.map(x => ({ cur: x.cur, items: x.items })))) say(`${where}: итог не совпал с EnLoot.roll на сиде каждого сундука`);
  const s1 = snap(T), d = delta(T, want, s0.shards);
  if (!eq(sorted(diff(s0.wallet, s1.wallet)), sorted(d.wallet))) say(`${where}: кошелёк ${JSON.stringify(diff(s0.wallet, s1.wallet))}, ждали ${JSON.stringify(d.wallet)}`);
  if (!eq(sorted(diff(s0.items, s1.items)), sorted(d.items))) say(`${where}: запасы изменились не на итог`);
  if (!eq(sorted(diff(s0.shards, s1.shards)), sorted(d.shards))) say(`${where}: осколки изменились не на итог — ${JSON.stringify(diff(s0.shards, s1.shards))}, ждали ${JSON.stringify(d.shards)}`);
  /* осколки героев Эхо: запись итога несёт раздачу «сервера» (скрытое поле to) — та же, что у пересчёта по цепочке целей недели;
     ни один осколок не потерян: получатели и прах Эха вместе — всё количество записи; сумма итога — те же осколки и тот же прах Эха */
  {
    const E = echoSim(T, {}), all = [].concat(...L.sum.log.map(x => x.items)), got = all.filter(it => E.echoIt(it)).map(it => it.to || null);
    if (!eq(got, d.to)) say(`${where}: раздача осколков героев Эхо не по цепочке целей недели — ${JSON.stringify(got).slice(0, 140)}, ждали ${JSON.stringify(d.to).slice(0, 140)}`);
    all.filter(it => E.echoIt(it)).forEach(it => { const to = it.to; if (to && to.parts.reduce((a, p) => a + p[1], 0) * E.per + to.dust !== it.q * E.per) say(`${where}: запись осколков героя Эхо ×${it.q} роздана не целиком — ${JSON.stringify(to)}`); });
    const ed = d.to.reduce((a, t) => a + t.dust, 0), sh = {};
    for (const [k, v] of Object.entries(d.shards)) sh[k] = v;
    if ((L.sum.edust || 0) !== ed) say(`${where}: в сумме итога прах Эха ${L.sum.edust || 0}, по цепочке целей — ${ed}`);
    if (!eq(sorted(L.sum.shards), sorted(sh))) say(`${where}: в сумме итога осколки героев не те, что выданы`);
    cnt.echo += d.to.length; cnt.edust += d.to.filter(t => t.dust).length; cnt.sure += all.filter(it => it.sure).length;
  }
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
  /* прах Эха — своей строкой «прах Эха ×N», когда осколкам героев Эхо не нашлось цели; иначе строки нет */
  const ed = R.items.reduce((a, c) => a + (c.edust || 0), 0), edl = /class="co-dust co-edl"/.test(r);
  if (!!ed !== edl) say(`${where}: строка праха Эха ${edl ? 'лишняя' : 'пропала'} — праха Эха в итоге ${ed}`);
  if (ed && !r.includes(`прах Эха ×${T.fmt(ed)}`)) say(`${where}: в итоге нет строки «прах Эха ×${T.fmt(ed)}»`);
  /* гарантированная запись помечена: на плитке — точка, в подсказке — «Наверняка» */
  if (G.some(g => g.sure) !== /class="co-pin"/.test(r)) say(`${where}: пометка гарантированной записи ${G.some(g => g.sure) ? 'пропала' : 'лишняя'}`);
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
  /* вид — у каждого сундука данных: свой из CO_KINDS или собранный по теме (coKind). Сундук КрафБосса — имя темы и тип врага, значок
     ремесла темы, рисунок каменного сундука призыва; сундук артели — рабочий короб. Вид с чужим рисунком несёт отметку темы — иначе
     его не отличить от хозяина рисунка; имена видов не повторяются */
  const kindNames = [];
  for (const k of Object.keys(T.LBX.boxes)) {
    const K = T.coKind(k), ab = T.coArtBox(k), g = ART.chests[ab], B = T.LBX.boxes[k], mk = T.coMark(k);
    if (!K) { say(`вид сундука: нет вида ${k} — ни в CO_KINDS, ни по теме`); continue; }
    kindNames.push(K.n);
    for (const c of ['wood', 'wood2', 'metal', 'metal2']) if (!/^#[0-9a-f]{6}$/i.test(K[c] || '')) say(`вид сундука ${k}.${c}: не цвет #rrggbb`);
    if (!K.n || !K.ic) say(`вид сундука ${k}: нет подписи или эмблемы`);
    if (B.theme) {
      const Th = T.LBX.summon.themes[B.theme], sp = T.RX.specs[B.theme];
      if (!Th || !sp || K.mark !== B.theme || K.type !== B.type || K.ic !== sp.icon || !K.n.startsWith(Th.n)) say(`вид сундука ${k}: не по теме ${B.theme} и типу ${B.type}`);
      if (ab !== (ART.chests[k] || (ART.sets && ART.sets[k]) ? k : 'craft')) say(`вид сундука ${k}: рисунок — не свой и не каменный сундук призыва`);
    }
    /* отметка — пока один рисунок делят несколько сундуков, у того, чей вид её несёт: свой рисунок выгружен каждому — отметки уходят */
    const shared = Object.keys(T.LBX.boxes).some(b => b !== k && T.coArtBox(b) === ab);
    if (!!mk !== !!(K.mark && shared)) say(`вид сундука ${k}: отметка темы ${mk ? 'лишняя' : 'пропала'}`);
    if (mk && (!mk.ic || !mk.tip || (B.theme && mk.ty !== B.type))) say(`вид сундука ${k}: у отметки нет значка, подсказки или типа врага`);
    if (!g) { say(`CO_ART.chests: нет рамки вида ${ab}${ab !== k ? ` — его рисунок берёт сундук ${k}` : ''}`); continue; }
    if (ab !== k) continue;   // рамку и слои чужого рисунка проверяет его хозяин
    geo(k, g);
    const L = layers.chests[k];
    if (!L || L.seam !== g.seam) say(`CO_ART.${k}: шов не тот, что в jobs/chests.json`);
    else for (const part of ['body', 'lid']) {
      const f = path.join(gen, L.from.replace(/\.png$/, `.${part}.png`)), px = pngSize(f);
      if (px && (px[0] !== g[part][2] || px[1] !== g[part][3])) say(`CO_ART.${k}.${part}: ${g[part][2]}×${g[part][3]}, а слой ${px[0]}×${px[1]}`);
    }
  }
  if (new Set(kindNames).size !== kindNames.length) say('виды сундуков: имена повторяются — ' + kindNames.filter((n, i) => kindNames.indexOf(n) !== i).join(', '));
  /* сундуки с одним рисунком различимы: у каждого — своя отметка (тема и тип врага), без отметки — только хозяин рисунка */
  {
    const by = {};
    for (const k of Object.keys(T.LBX.boxes)) { const mk = T.coMark(k); (by[T.coArtBox(k)] = by[T.coArtBox(k)] || []).push(mk ? mk.th + ':' + mk.ty : ''); }
    for (const [ab, list] of Object.entries(by)) if (new Set(list).size !== list.length) say(`рисунок ${ab}: его делят ${list.length} сундуков, а отметки не у всех разные — их не отличить`);
  }
  if (!Array.isArray(V.geo.mark) || V.geo.mark.length !== 2 || V.geo.mark.some(x => !(x > 0 && x < 100))) say('CO_VIEW.geo.mark: отметка темы — не на корпусе сундука (два процента от 1 до 99)');
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
if (!ONLY_LAWS) {
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
if (!ONLY_LAWS) {
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
      /* герой Эхо этой недели собран, других целей в цикле аккаунта нет: его осколки и гарантия — прах Эха, а не общий прах */
      if (!R.items.some(c => c.edust)) say('пачка: осколки собранного героя Эхо ни разу не стали прахом Эха — проверка праха Эха не сработала');
      else if (!/class="co-dust co-edl"/.test(resOf(hr))) say('пачка: в итоге нет строки праха Эха');
      if (R.items.some(c => c.dust)) say('пачка: осколки героя Эхо ушли в общий прах — их делит цепочка целей недели');
      if (b) checkAgain(P, 'ещё · «Открыть все»', key, b.op, b.n);
    }
  }
  /* осколки пробуждённого героя возрождения душ — в общий прах (§15.2): «Урна имён» даёт их наверняка, запись темы помечена */
  {
    fresh(P, { skip: true });
    const su = { box: 'urn', r: 3, cyc: 2, win: 'step', week: 'Эльфы' };
    for (let i = 0; i < 4; i++) T.BAG.addChest(Object.assign({ src: 'проверка', seed: T.EnLoot.seedOf('проверка-урна-' + i) }, su));
    for (const h of T.LBX.pools.roulette[2] || []) T.S.rs.owned[h.id] = { lvl: 0, lim: 0, valor: 0, how: 'souls' };
    const ku = 'g:' + T.zpChestKey(su), gu = grp(T, ku), sU = snap(T), opU = 'zo' + T.S.zp.op;
    if (!gu) say('урна: сундук не лёг в запасы');
    else {
      run('урна', () => T.ACT.zpopen(ku, { dataset: { op: opU, n: 'all' } }));
      const RU = checkOp(P, 'урна · пачка', sU, ku, gu.list.slice(), opU, true);
      if (RU) {
        const hu = view(P, 'урна · итог'); checkRes(P, 'урна · итог', RU, hu);
        if (!RU.items.some(c => c.dust)) say('урна: осколки пробуждённого героя возрождения душ не ушли в прах');
        else if (!/<p class="co-dust">/.test(resOf(hu))) say('урна: в итоге нет строки праха');
        if (!RU.items.some(c => c.sure)) say('урна: в итоге нет гарантированной записи темы');
      }
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
if (!ONLY_LAWS) {
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
if (!ONLY_LAWS) {
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
if (!ONLY_LAWS) {
  const setAll = Object.keys(ART.sets || {}).flatMap(k => [1, 2, 3, 4, 5, 6, 7].flatMap(r => [`chests/${k}/r${r}-body.webp`, `chests/${k}/r${r}-lid.webp`, `chests/${k}/r${r}.webp`]).concat(`chests/${k}/lock.webp`));
  const all = Object.keys(ART.chests).flatMap(k => [`chests/${k}-body.png`, `chests/${k}-lid.png`]).concat('chests/lock.png', ART.fx.map(n => `chests/fx-${n}.png`), setAll);
  const scene = (Q, box, r, where) => {
    fresh(Q, { skip: false });
    const sp = { box, r, cyc: 3, win: 'step' }; if (Q.T.LBX.boxes[box].week) sp.week = 'Эльфы';
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
  /* сундук с чужим рисунком (сундуки КрафБоссов, сундук артели): сцена берёт рисунок хозяина и его замок и несёт отметку темы —
     бирку со значком ремесла на корпусе, тип врага — на бирке; у сундука со своим рисунком отметки нет */
  let marks = 0;
  for (const box of Object.keys(T.LBX.boxes)) {
    const ab = T.coArtBox(box), mk = T.coMark(box);
    if (!mk) continue;
    const h = scene(full, box, 4, `с артом · ${box}`); cnt.art++; marks++;
    const set = !!(ART.sets && ART.sets[ab]);
    const want = set ? [`chests/${ab}/r4-body.webp`, `chests/${ab}/r4-lid.webp`, `chests/${ab}/lock.webp`] : [`chests/${ab}-body.png`, `chests/${ab}-lid.png`, 'chests/lock.png'];
    for (const p of want) if (!new RegExp(`<img src="[^"]*${reEsc(p)}\\?v=`).test(h)) say(`с артом · ${box}: нет картинки ${p} — рисунка вида ${ab}`);
    const m = h.match(/<i class="co-thm" data-th="([^"]+)"(?: data-ty="([^"]+)")?[^>]*style="([^"]*)"/);
    if (!m || m[1] !== mk.th || (m[2] || '') !== mk.ty) say(`с артом · ${box}: на сундуке нет отметки темы ${mk.th}${mk.ty ? ' типа ' + mk.ty : ''}`);
    else if (!(num(m[3], 'left') > 0 && num(m[3], 'top') > 0)) say(`с артом · ${box}: отметка темы не на корпусе`);
    if (!h.includes(`#i-${mk.ic}`)) say(`с артом · ${box}: у отметки нет значка ${mk.ic}`);
    const hn = scene(none, box, 4, `без арта · ${box}`);
    if (/chests\//.test(hn) || !/<i class="co-thm"/.test(hn)) say(`без арта · ${box}: путь к невыгруженному арту или нет отметки темы`);
  }
  if (!marks) say('отметка темы: сундуков с чужим рисунком нет — проверка ничего не сторожит');
  for (const box of Object.keys(ART.chests)) if (!T.coMark(box) && /<i class="co-thm"/.test(scene(full, box, 4, `без отметки · ${box}`))) say(`${box}: отметка темы у сундука со своим рисунком`);
  /* плитка сундука в запасах и наградах (zpChestPic, chestPic): у вида с листом — тот же рисунок своей редкости, уменьшенный; без листа —
     прежний сундук вида; без арта — значок CHEST. Рисунок — своего вида или хозяина рисунка (coArtBox); с чужим — отметка темы */
  let pics = 0;
  for (const box of Object.keys(T.LBX.boxes)) for (let r = 1; r <= 7; r++) {
    const ab = T.coArtBox(box), mk = T.coMark(box);
    const set = !!(ART.sets && ART.sets[ab]), h = full.T.zpChestPic(box, r), w = set ? `chests/${ab}/r${r}.webp` : `chests/${ab}-body.png`; pics++;
    if (!h.includes(w + '?v=')) say(`плитка сундука · ${box} · ${r}: нет картинки ${w}`);
    if (!full.T.chestPic || full.T.chestPic(box, r) !== h) say(`chestPic · ${box} · ${r}: не та же картинка, что в запасах`);
    if (/chests\//.test(none.T.zpChestPic(box, r))) say(`плитка сундука без арта · ${box} · ${r}: путь к невыгруженному арту`);
    const tm = h.match(/<i class="zp-tm" data-th="([^"]+)"(?: data-ty="([^"]+)")?>/);
    if (mk ? (!tm || tm[1] !== mk.th || (tm[2] || '') !== mk.ty) : !!tm) say(`плитка сундука · ${box} · ${r}: отметка темы ${mk ? 'пропала или не та' : 'лишняя'}`);
  }
  if (!pics) say('плитка сундука: не проверена');
  /* сундук без одного слоя — заглушка целиком, пути нет */
  const half = load({ ready: ['chests/keys-body.png'] }), hh = scene(half, 'keys', 4, 'арт без крышки');
  if (/chests\/keys/.test(hh) || (hh.match(/<svg class="co-sv"/g) || []).length < 3) say('арт без крышки: сундук не остался заглушкой целиком');
}

/* ================== 9. все виды × редкости × окна × циклы (× недели) ==================
   Спойлеры игроку не называются: талисманы со спойлером в имени, ресурсы цикла VI и записи recipes.js с team — как в check_bag.js */
if (!ONLY_LAWS) {
  fresh(P, { skip: false });
  /* имя, которое совпадает со своей маской «ярус · цикл» (осколок и руна доблести цикла VI), спойлером не считается: маску игрок видит */
  const ROMAN6 = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'], masks = new Set(T.RX.items.filter(i => i.team && T.RX.tiers[i.tier]).map(i => `${T.RX.tiers[i.tier].n} · цикл ${ROMAN6[i.cyc]}`));
  const spoil = [...new Set(Object.values(T.LBX.talInfo).filter(t => t[2]).map(t => t[0])
    .concat(Object.values(T.LBX.items).filter(i => i.team).map(i => i.n), T.RX.items.filter(i => i.team).map(i => i.n)))].filter(n => !masks.has(n));
  let leaks = 0;
  const leak = (h, where) => { const l = spoil.filter(n => h.includes(n)); if (l.length && leaks++ < 5) say(`${where}: спойлер без режима «Команда» — ${l.slice(0, 3).join(', ')}`); };
  const pool = Object.values(T.LBX.pools.heroes).flat();
  pool.forEach((h, i) => { if (i % 2 === 0 && T.RSI[h.id]) T.S.rs.owned[h.id] = { lvl: 0, lim: 0, valor: 0, how: 'souls' }; });
  let k = 0;
  /* неделя — у сундука, который её помнит: сундук осколков — все недели Эхо, «Урна имён» — две (раса врага) */
  const weeksOf = box => (!T.LBX.boxes[box].week ? [null] : box === 'shards' ? T.LBX.weeks : [T.LBX.weeks[0], T.LBX.weeks[2]]);
  for (const box of Object.keys(T.LBX.boxes)) for (let r = 1; r <= 7; r++) for (const win of Object.keys(T.LBX.winNames)) for (let cyc = 1; cyc <= 6; cyc++) for (const week of weeksOf(box)) {
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
if (!ONLY_LAWS) {
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
    for (const [box, r, win, cyc, week, awake, seed] of [['shards', 3, 'step', 3, 'Эльфы', false, 'проба-7'], ['shards', 5, 'wild', 4, 'Люди', true, 'проба-3'], ['talisman', 6, 'pure', 5, 'Эльфы', false, 'проба-1'], ['wander', 2, 'step', 2, 'Эльфы', false, 'проба-9'],
      ['forge_a', 5, 'pure', 4, 'Эльфы', false, 'проба-4'], ['urn_u', 4, 'pure', 3, 'Эльфы', true, 'проба-2'], ['artel', 3, 'step', 3, 'Эльфы', false, 'проба-5']]) {
      Object.assign(T0.LB, { box, r, win, cyc, week, awake, seed });
      const lb = run('раздел «Лутбоксы»', () => T0.lbHtml()) || '';
      if (!lb.includes('data-co="lb"')) say('раздел «Лутбоксы»: у пробного открытия нет кнопки «С анимацией»');
      run('С анимацией', () => T0.coKitAct('lb'));
      const R = T0.CO_KIT.run, def = T0.EnLoot.resolve(T0.LBX, { box, r, win, cyc, week: box === 'shards' ? week : null }), res = T0.EnLoot.roll(def, T0.EnLoot.seedOf(seed)), want = (res.sure || []).concat(res.items);
      if (!R) { say(`С анимацией ${box} ${r}: показа нет`); continue; }
      const got = R.items.map(c => ({ kind: c.kind, id: c.id, q: c.q, r: c.r }));
      if (!eq(got, want.map(it => ({ kind: it.kind, id: it.id, q: it.q, r: it.r })))) say(`С анимацией ${box} ${r}: предметы не те, что в списке бросков раздела «Лутбоксы»`);
      /* «герои пробуждены»: осколки героев возрождения душ — в общий прах, осколки героев Эхо и гарантия — в прах Эха */
      if (awake && want.some(it => it.kind === 'shard' || it.kind === 'target') && !R.items.some(c => c.dust || c.edust)) say(`С анимацией ${box} ${r}: «герои пробуждены» — осколки не ушли ни в прах, ни в прах Эха`);
      if (R.items.filter(c => c.sure).length !== (res.sure || []).length) say(`С анимацией ${box} ${r}: гарантированных записей в показе ${R.items.filter(c => c.sure).length}, в розыгрыше ${(res.sure || []).length}`);
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
if (!ONLY_LAWS) { tour(false); tour(true); }

/* ================== 14. законы открытия и мутации ==================
   Своя песочница: мутации ломают «сервер» героев Эхо, розыгрыш и данные сундуков — другим разделам они не видны. Закон — функция
   (quick) → список нарушений; quick — остановиться на первом: так его зовёт проверка мутацией. Что должно было выпасть, закон
   считает по розыгрышу до мутаций (ROLL0) и по цепочке целей недели (echoSim), что выдано — по состоянию до и после операции.
   Числа — вид проверки, не баланс: цикл аккаунта, при котором в отряде недели открыто несколько героев, неделя, редкость, сиды */
const M = load(), MT = M.T, ROLL0 = MT.EnLoot.roll;
const LAWV = { cyc: 4, week: 'Эльфы', r: 4, seeds: 3, rs: [1, 4, 7], wins: ['step', 'pure'], cycs: [2, 5] };
/* запрещённое в сундуках (слова задачи и закон 3 сборщика): билеты призыва, изделия и заготовки, герои целиком, награды мастерской;
   души и Энериум; ларцы; руны пределов, осколки и руны доблести — только в сундуках КрафБоссов */
const BAN = { tiers: ['act', 'call', 'echo', 'part', 'made', 'hero', 'product', 'story'], cur: ['souls', 'enerium'], runes: ['rune', 'vshard', 'valor'], kinds: ['item', 'cur', 'shard', 'target', 'tal', 'wshard', 'equip'] };
function lawFresh(cyc) {
  fresh(M, { skip: true });
  MT.S.acc.cycle = cyc || LAWV.cyc;
  if (MT.S.ech) MT.S.ech.targets = {};
}
/* сундуки вида sp — в запасы, все — одной операцией с номером. Ожидаемое считается до открытия: коллекция и сиды те же */
function lawOpen(sp, n, tag) {
  const T = MT;
  for (let i = 0; i < n; i++) T.BAG.addChest(Object.assign({ src: 'закон', seed: T.EnLoot.seedOf(`закон|${tag}|${i}`) }, sp));
  const key = 'g:' + T.zpChestKey(sp), g = grp(T, key); if (!g) return null;
  const chests = g.list.slice(), s0 = snap(T), op = 'zo' + T.S.zp.op, want = expect(T, chests, ROLL0);
  let threw = '';
  try { T.ACT.zpopen(key, { dataset: { op, n: 'all' } }); } catch (e) { threw = e.message; }   // показ после выдачи: его поломка выдачу не отменяет
  const L = T.S.zp.last && T.S.zp.last.op === op ? T.S.zp.last : null, s1 = snap(T);
  return { key, op, chests, s0, s1, L, want, threw, d: delta(T, want, s0.shards), log: L ? L.sum.log : [], all: L ? [].concat(...L.sum.log.map(x => x.items)) : [] };
}
/* выдано ровно ожидаемое: записи итога — розыгрыш до мутаций, запасы и кошелёк сдвинулись на него */
function lawGiven(x, where) {
  const out = [];
  if (!x || !x.L) return [`${where}: сундук не открылся`];
  if (!eq(x.log.map(l => ({ cur: l.cur, items: l.items })), x.want.map(l => ({ cur: l.cur, items: l.items })))) out.push(`${where}: записи итога не те, что в розыгрыше на сиде сундука`);
  const d = x.d, w = diff(x.s0.wallet, x.s1.wallet), sh = diff(x.s0.shards, x.s1.shards);
  if (!eq(sorted(w), sorted(d.wallet))) out.push(`${where}: кошелёк ${JSON.stringify(w)}, по итогу — ${JSON.stringify(d.wallet)}`);
  if (!eq(sorted(sh), sorted(d.shards))) out.push(`${where}: осколки ${JSON.stringify(sh)}, по итогу — ${JSON.stringify(d.shards)}`);
  if (!eq(sorted(diff(x.s0.items, x.s1.items)), sorted(d.items))) out.push(`${where}: запасы изменились не на итог`);
  if (!eq(sorted(diff(x.s0.extra, x.s1.extra)), sorted(d.extra))) out.push(`${where}: «из сундуков» изменилось не на итог`);
  if (x.s1.eq - x.s0.eq !== d.eq) out.push(`${where}: снаряжения прибавилось ${x.s1.eq - x.s0.eq}, по итогу — ${d.eq}`);
  return out;
}
const LAW = {
  /* гарантия выдана цели недели и не теряется: сундук осколков недели несёт запись target; её осколки получает герой-цель недели
     сундука — выбранный игроком или старший несобранный; излишек — следующей цели; собран весь отряд — прах Эха, строкой итога */
  grant(quick) {
    const out = [], T = MT, RS = T.RS, wk = LAWV.week, W = RS.weeks.find(w => w.race === wk), per = RS.rules.echoDust ? RS.rules.echoDust.perShard : 1;
    const sp = { box: 'shards', r: LAWV.r, cyc: LAWV.cyc, win: 'step', week: wk }, q = T.LBX.lines.target.q[LAWV.r - 1];
    const squad = W.squad.map(id => T.RSI[id]).filter(h => h && h.c <= LAWV.cyc).sort((a, b) => a.c - b.c), need = h => RS.rules.echoSet[h.c - 1];
    if (squad.length < 3) return ['в отряде недели открыто меньше трёх героев — закону нечем проверить цепочку целей'];
    if (!(q > 0) || squad.some(h => !(need(h) > q))) return ['гарантия не меньше комплекта героя — закону нечем проверить излишек'];
    const top = squad[squad.length - 1], mid = squad[squad.length - 2], low = squad[0], gap = 10;
    const clear = () => { for (const h of squad) { delete T.S.rs.shards[h.id]; delete T.S.rs.owned[h.id]; } };
    /* сценарий: подготовка → кому и сколько должна уйти гарантия: [[id, осколков]], прах Эха */
    const scen = [
      ['цель по умолчанию — старший несобранный', () => {}, [[top.id, q]], 0],
      ['цель выбрал игрок', () => { const r = T.EH.pick('закон-цель', wk, low.id); if (!r || r.refuse) throw new Error('цель не выбралась'); }, [[low.id, q]], 0],
      ['цель почти собрана — излишек следующей', () => { T.S.rs.shards[top.id] = need(top) - gap; }, [[top.id, gap], [mid.id, q - gap]], 0],
      ['старший в коллекции — цель следующий', () => { T.S.rs.owned[top.id] = { lvl: 0, lim: 0, valor: 0, how: 'souls' }; }, [[mid.id, q]], 0],
      ['отряд недели собран — прах Эха', () => { for (const h of squad) T.S.rs.shards[h.id] = need(h); }, [], q * per],
      ['последней цели не хватает немного — остаток в прах Эха', () => { for (const h of squad) T.S.rs.shards[h.id] = need(h); T.S.rs.shards[low.id] = need(low) - gap; }, [[low.id, gap]], (q - gap) * per],
    ];
    for (const [name, prep, parts, dust] of scen) {
      if (quick && out.length) break;
      lawFresh(); clear();
      try { prep(); } catch (e) { out.push(`${name}: ${e.message}`); continue; }
      const x = lawOpen(sp, 1, 'гарантия|' + name), where = `гарантия · ${name}`;
      out.push(...lawGiven(x, where));
      if (!x || !x.L) continue;
      const g = x.all.filter(it => it.kind === 'target');
      if (g.length !== 1 || !g[0].sure || g[0].q !== q || g[0].id !== wk || x.all[0] !== g[0]) { out.push(`${where}: в итоге нет гарантии — записи осколков герою-цели недели ×${q}, первой`); continue; }
      const to = g[0].to;
      if (!to) { out.push(`${where}: запись гарантии не названа выданной — нет получателей`); continue; }
      if (!eq(to.parts, parts) || to.dust !== dust) out.push(`${where}: гарантия ушла ${JSON.stringify(to.parts)} и в прах Эха ${to.dust}, по правилу — ${JSON.stringify(parts)} и ${dust}`);
      if (to.parts.reduce((a, p) => a + p[1], 0) * per + to.dust !== q * per) out.push(`${where}: гарантия ×${q} потеряна частично — ${JSON.stringify(to)}`);
      if (to.parts.some(p => !W.squad.includes(p[0]))) out.push(`${where}: осколки гарантии получил герой чужой недели`);
      /* все записи героев Эхо этого сундука — по цепочке целей: получатели, осколки и прах Эха; сумма итога — тот же прах Эха */
      const E = echoSim(T, {}), got = x.all.filter(it => E.echoIt(it)).map(it => it.to || null);
      if (!eq(got, x.d.to)) out.push(`${where}: раздача осколков героев Эхо не по цепочке целей недели`);
      const ed = x.d.to.reduce((a, t) => a + t.dust, 0);
      if ((x.L.sum.edust || 0) !== ed) out.push(`${where}: в сумме итога прах Эха ${x.L.sum.edust || 0}, выдано ${ed}`);
      /* что ушло в прах Эха — строкой «прах Эха ×N»: в окне открытия и в карточке сундука в запасах */
      let win = '', card = '';
      try { win = T.OV.co() || ''; T.S.overlay = null; T.render(); card = M.game(); } catch (e) { out.push(`${where}: показ итога — исключение ${e.message}`); }
      const line = `прах Эха ×${T.fmt(ed)}`, inWin = /class="co-dust co-edl"/.test(win) && win.includes(line), inCard = /class="zp-edl"/.test(card) && card.includes(line);
      if (ed ? !inWin : /class="co-dust co-edl"/.test(win)) out.push(`${where}: окно открытия ${ed ? 'не называет «' + line + '»' : 'называет прах Эха, которого нет'}`);
      if (ed ? !inCard : /class="zp-edl"/.test(card)) out.push(`${where}: карточка сундука ${ed ? 'не называет «' + line + '»' : 'называет прах Эха, которого нет'}`);
    }
    return out;
  },
  /* повтор номера ничего не выдаёт: тот же номер операции — ни запасов, ни кошелька, ни нового итога и показа; открытый сундук ушёл
     из запасов; следующий номер открывает следующий сундук */
  again(quick) {
    const out = [], T = MT;
    const specs = [{ box: 'shards', r: LAWV.r, cyc: LAWV.cyc, win: 'step', week: LAWV.week }, { box: 'forge_u', r: 5, cyc: LAWV.cyc, win: 'pure' }, { box: 'urn', r: 3, cyc: 2, win: 'step', week: LAWV.week }, { box: 'keys', r: 3, cyc: 2, win: 'step' }];
    for (const sp of specs) {
      if (quick && out.length) break;
      lawFresh();
      const where = `повтор · ${sp.box}`;
      for (let i = 0; i < 3; i++) T.BAG.addChest(Object.assign({ src: 'закон', seed: T.EnLoot.seedOf(`закон|повтор|${sp.box}|${i}`) }, sp));
      const key = 'g:' + T.zpChestKey(sp), g = grp(T, key); if (!g) { out.push(`${where}: сундуки не легли в запасы`); continue; }
      const first = g.list[0], second = g.list[1], s0 = snap(T), op = 'zo' + T.S.zp.op, want = expect(T, [first], ROLL0), d = delta(T, want, s0.shards);
      try { T.ACT.zpopen(key, { dataset: { op, n: '1' } }); } catch (e) { out.push(`${where}: исключение — ${e.message}`); continue; }
      const L1 = T.S.zp.last, R1 = T.S.co.run, s1 = snap(T);
      if (!L1 || L1.op !== op || L1.sum.n !== 1) { out.push(`${where}: первая операция не открыла один сундук`); continue; }
      if (s1.chests.includes(first.id)) out.push(`${where}: открытый сундук остался в запасах`);
      if (!eq(sorted(diff(s0.wallet, s1.wallet)), sorted(d.wallet)) || !eq(sorted(diff(s0.shards, s1.shards)), sorted(d.shards))) out.push(`${where}: первая операция выдала не итог сундука`);
      for (const n of ['1', 'all', '']) {
        try { T.ACT.zpopen(key, { dataset: { op, n } }); } catch (e) { out.push(`${where}: повтор — исключение ${e.message}`); }
        const s2 = snap(T);
        if (!eq(s1, s2)) { out.push(`${where}: повтор номера ${op} изменил запасы, кошелёк или сундуки — ${JSON.stringify(diff(s1.wallet, s2.wallet))}, сундуков ${s1.chests.length} → ${s2.chests.length}`); break; }
        if (T.S.zp.last !== L1) { out.push(`${where}: повтор номера ${op} записал новый итог`); break; }
        if (T.S.co.run !== R1) { out.push(`${where}: повтор номера ${op} начал новый показ`); break; }
      }
      /* следующий номер — следующий сундук, и только он */
      const sA = snap(T), op2 = 'zo' + T.S.zp.op;
      if (op2 === op) out.push(`${where}: номер следующей операции не сменился`);
      const want2 = expect(T, [second], ROLL0), d2 = delta(T, want2, sA.shards);
      try { T.ACT.zpopen(key, { dataset: { op: op2, n: '1' } }); } catch (e) { out.push(`${where}: следующая операция — исключение ${e.message}`); }
      const sB = snap(T);
      if (sB.chests.length !== sA.chests.length - 1 || sB.chests.includes(second.id)) out.push(`${where}: следующий номер открыл не один следующий сундук`);
      if (!eq(sorted(diff(sA.wallet, sB.wallet)), sorted(d2.wallet)) || !eq(sorted(diff(sA.shards, sB.shards)), sorted(d2.shards))) out.push(`${where}: следующая операция выдала не итог своего сундука`);
    }
    return out;
  },
  /* сундук темы даёт запись темы наверняка: у каждого КрафБосса — сундук его темы и типа; первые записи итога — из линий темы
     (сколько — по типу врага), за ними с силы «сильной линии» — запись сильной линии (у Убера и Пробуждённого); всего записей — по
     типу; валюта Пробуждённого — × множитель типа от валюты босса той же темы. Всё это выдано */
  theme(quick) {
    const out = [], T = MT, SM = T.LBX.summon, seen = new Set();
    lawFresh(6);   // аккаунт цикла VI: открыты все герои отрядов недель
    const bosses = Object.entries(SM.bosses).filter(([, b]) => b.th);
    if (bosses.length < 20) return ['у врагов нет сундуков тем — закону нечего проверять'];
    for (const [id, b] of bosses) {
      if (quick && out.length) break;
      const B = T.LBX.boxes[b.box], fb = T.RX.drops.craftBosses.find(v => v.id === id), where = `тема · ${id} · ${b.box}`;
      if (!B || !fb) { out.push(`${where}: нет сундука или врага`); continue; }
      const Th = SM.themes[B.theme], K = SM.types[B.type];
      if (B.theme !== fb.spec || B.type !== fb.g || b.th !== fb.spec) { out.push(`${where}: сундук темы ${B.theme} и типа ${B.type}, а враг — ремесла ${fb.spec}, тип ${fb.g}`); continue; }
      if (b.box !== Th.box + K.sfx || b.win !== K.win) out.push(`${where}: сундук или окно не по теме и типу врага`);
      const force = fb.cyc + (fb.powerCycleStep || 0);   // сила врага: цикл, у пробуждённого — на цикл выше; пул сундука — не выше цикла VI
      if (b.r !== Math.min(7, force + 1) || b.pc !== Math.min(6, force)) out.push(`${where}: редкость ${b.r} и цикл пула ${b.pc} — не по силе врага ${force}`);
      const sp = { box: b.box, r: b.r, cyc: b.pc, win: b.win }; if (B.week) sp.week = b.week;
      const key = T.zpChestKey(sp); if (seen.has(key)) continue; seen.add(key);
      const x = lawOpen(sp, LAWV.seeds, 'тема|' + key);
      out.push(...lawGiven(x, where));
      if (!x || !x.L) continue;
      const strong = b.pc >= SM.strong.from ? K.strongSure : 0;
      x.log.forEach((l, ci) => {
        const its = l.items, tag = `${where} · сундук ${ci + 1}`;
        if (its.length !== K.total) out.push(`${tag}: записей ${its.length}, по типу «${K.n}» — ${K.total}`);
        for (let i = 0; i < K.sure; i++) if (!its[i] || !its[i].sure || !Th.sure.includes(its[i].line)) { out.push(`${tag}: запись ${i + 1} — не запись темы «${Th.n}» наверняка${its[i] ? ` (линия ${its[i].line})` : ''}`); break; }
        for (let i = K.sure; i < K.sure + strong; i++) if (!its[i] || !its[i].sure || !Th.strong.includes(its[i].line)) { out.push(`${tag}: запись ${i + 1} — не сильная линия наверняка${its[i] ? ` (линия ${its[i].line})` : ''}`); break; }
        if (its.slice(K.sure + strong).some(it => it.sure)) out.push(`${tag}: гарантированных записей больше, чем по типу и силе врага`);
        if (b.pc < SM.strong.from && its.some(it => Th.strong.includes(it.line))) out.push(`${tag}: сильная линия раньше силы ${SM.strong.from}`);
      });
      /* валюта сундука — по типу: у Пробуждённого × множитель от валюты босса той же темы */
      const base = T.LBX.boxes[Th.box];
      for (const k of Object.keys(base.cur)) if (!eq(B.cur[k], base.cur[k].map(v => v * K.curMul))) out.push(`${where}: валюта ${k} — не × ${K.curMul} от сундука босса`);
    }
    return out;
  },
  /* в сундуке нет запрещённого: по всем сундукам данных, на открытиях: виды записей — только известные; ни душ, ни Энериума; ни
     билетов призыва, ни изделий, ни героев целиком, ни ларцов; руны и доблесть — только в сундуках КрафБоссов */
  forbid(quick) {
    const out = [], T = MT;
    lawFresh(6);
    let n = 0;
    for (const box of Object.keys(T.LBX.boxes)) for (const r of LAWV.rs) for (const win of LAWV.wins) for (const cyc of LAWV.cycs) {
      if (quick && out.length) return out;
      const sp = { box, r, cyc, win }, B = T.LBX.boxes[box], where = `запрет · ${box} · ${r} · ${win} · цикл ${cyc}`; if (B.week) sp.week = LAWV.week;
      const x = lawOpen(sp, 2, 'запрет|' + [box, r, win, cyc].join('|'));
      if (!x || !x.L) { out.push(`${where}: сундук не открылся`); continue; }
      n++;
      for (const it of x.all) {
        if (!BAN.kinds.includes(it.kind)) { out.push(`${where}: запись вида «${it.kind}» — такого в сундуках нет`); continue; }
        if (it.kind === 'cur' && BAN.cur.includes(it.id)) out.push(`${where}: в сундуке ${it.id === 'souls' ? 'души' : 'Энериум'}`);
        if (it.kind !== 'item') continue;
        const src = T.BAG.item(it.id);
        if (!src) { out.push(`${where}: предмета ${it.id} нет в игре`); continue; }
        if (BAN.tiers.includes(src.tier)) out.push(`${where}: в сундуке «${src.n}» — ${src.tier}: билет призыва, изделие или герой`);
        if (/^chest_/.test(it.id)) out.push(`${where}: в сундуке ларец ${it.id}`);
        if (BAN.runes.includes(src.tier) && !B.theme) out.push(`${where}: «${src.n}» — руны и доблесть есть только в сундуках КрафБоссов`);
      }
      for (const k of x.L.sum.cur ? Object.keys(x.L.sum.cur) : []) if (BAN.cur.includes(k)) out.push(`${where}: валюта сундука — ${k}`);
      const w = diff(x.s0.wallet, x.s1.wallet);
      for (const k of BAN.cur) if (w[k]) out.push(`${where}: кошелёк получил ${k} ×${w[k]}`);
    }
    if (!n) out.push('запрет: ни один сундук не открыт');
    return out;
  },
};
const lawRun = (k, quick) => { try { return LAW[k](quick) || []; } catch (e) { return ['исключение: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()]; } };
for (const k of Object.keys(LAW)) { for (const e of lawRun(k, false)) say(`закон ${k}: ${e}`); cnt.laws++; }
if (err.length) done();

/* мутации: ломаем — закон обязан упасть. Код — в песочнице законов; вторая строка возвращает как было */
vm.runInContext(`
  var __roll0 = EnLoot.roll, __grant0 = EN_ECHO_HEROES.grant, __give0 = zpEchoGive, __open0 = zpOpen, __drop0 = BAG.dropChest, __res0 = zpResHtml, __cres0 = coResHtml;
  var __sure0 = null, __cur0 = null;
  function __push(f) { EnLoot.roll = function (d, s, t) { const r = __roll0(d, s, t), x = f(d); if (x) r.items.push(x); return r; }; }
`, M.ctx);
const UNROLL = 'EnLoot.roll = __roll0;', UNGRANT = 'EN_ECHO_HEROES.grant = __grant0;', UNSURE = 'for (const id of Object.keys(__sure0)) LBX.boxes[id].sure = __sure0[id];';
const MUT = [
  ['grant', '«сервер» героев Эхо выдаёт половину гарантии', `EN_ECHO_HEROES.grant = function (race, q) { return __grant0.call(EN_ECHO_HEROES, race, Math.floor(q / 2)); };`, UNGRANT],
  ['grant', 'гарантия уходит младшему герою отряда, а не цели недели', `EN_ECHO_HEROES.grant = function (race, q) { const h = EN_ECHO_HEROES.squad(race)[0]; if (!h) return __grant0.call(EN_ECHO_HEROES, race, q); S.rs.shards[h.id] = (S.rs.shards[h.id] || 0) + q; return { parts: [[h.id, q]], dust: 0 }; };`, UNGRANT],
  ['grant', 'выбор цели игроком не учтён', `EN_ECHO_HEROES.grant = function (race, q) { const t = S.ech.targets; S.ech.targets = {}; const r = __grant0.call(EN_ECHO_HEROES, race, q); S.ech.targets = t; return r; };`, UNGRANT],
  ['grant', 'излишек цели не переходит следующей — сразу в прах Эха', `EN_ECHO_HEROES.grant = function (race, q) { const h = EN_ECHO_HEROES.target(race); if (!h) return __grant0.call(EN_ECHO_HEROES, race, q); const n = Math.min(q, EN_ECHO_HEROES.need(h) - EN_ECHO_HEROES.have(h)); S.rs.shards[h.id] = EN_ECHO_HEROES.have(h) + n; if (q - n) S.wallet.edust = (S.wallet.edust || 0) + (q - n); return { parts: n ? [[h.id, n]] : [], dust: q - n }; };`, UNGRANT],
  ['grant', 'прах Эха за излишек не начислен', `EN_ECHO_HEROES.grant = function (race, q) { const d0 = S.wallet.edust; const r = __grant0.call(EN_ECHO_HEROES, race, q); S.wallet.edust = d0; return r; };`, UNGRANT],
  ['grant', 'гарантированная запись потеряна при выдаче', `EnLoot.roll = function (d, s, t) { const r = __roll0(d, s, t); r.sure = []; return r; };`, UNROLL],
  ['grant', 'гарантия выдана цели чужой недели', `zpEchoGive = function (it, week) { return __give0(it.kind === 'target' ? Object.assign({}, it, { id: 'Люди' }) : it, 'Люди'); };`, 'zpEchoGive = __give0;'],
  ['grant', 'гарантия выдана дважды', `zpEchoGive = function (it, week) { if (it.kind === 'target') __give0(it, week); return __give0(it, week); };`, 'zpEchoGive = __give0;'],
  ['grant', 'карточка сундука не называет прах Эха', `zpResHtml = function (L) { return __res0(L).replace(/<p class="zp-edl"[\\s\\S]*?<\\/p>/, ''); };`, 'zpResHtml = __res0;'],
  ['grant', 'окно открытия не называет прах Эха', `coResHtml = function (R, e) { return __cres0(R, e).replace(/<p class="co-dust co-edl"[\\s\\S]*?<\\/p>/, ''); };`, 'coResHtml = __cres0;'],
  ['again', '«сервер» не помнит номер операции', `zpOpen = function (key, op, want) { const V = zpV(); if (V.ops) delete V.ops[op]; return __open0(key, op, want); };`, 'zpOpen = __open0;'],
  ['again', 'повтор номера показывает итог заново', `zpOpen = function (key, op, want) { const V = zpV(); if (op && V.ops && V.ops[op]) { coShow(V.ops[op]); return; } return __open0(key, op, want); };`, 'zpOpen = __open0;'],
  ['again', 'открытый сундук остаётся в запасах', `BAG.dropChest = function () {};`, 'BAG.dropChest = __drop0;'],
  ['again', 'номер операции не растёт: следующая операция — тот же номер', `zpOpen = function (key, op, want) { const V = zpV(), o = V.op; const r = __open0(key, op, want); V.op = o; return r; };`, 'zpOpen = __open0;'],
  ['theme', 'запись темы потеряна: розыгрыш без гарантированных записей', `EnLoot.roll = function (d, s, t) { const r = __roll0(d, s, t); r.sure = []; return r; };`, UNROLL],
  ['theme', 'запись темы — из чужой линии', `EnLoot.roll = function (d, s, t) { const r = __roll0(d, s, t); if (r.sure.length) r.sure[0] = { line: 'dust', r: r.sure[0].r, kind: 'cur', id: 'dust', q: 5, sure: 1 }; return r; };`, UNROLL],
  ['theme', 'у Убера и Пробуждённого нет сильной линии наверняка', `__sure0 = {}; for (const [id, B] of Object.entries(LBX.boxes)) if (B.type === 'u' || B.type === 'a') { __sure0[id] = B.sure; B.sure = B.sure.slice(0, -1); }`, UNSURE],
  ['theme', 'у Пробуждённого одна запись темы, а не две', `__sure0 = {}; for (const [id, B] of Object.entries(LBX.boxes)) if (B.type === 'a') { __sure0[id] = B.sure; B.sure = B.sure[0][1] > 1 ? B.sure.map((x, i) => (i ? x : [x[0], 1, x[2]])) : B.sure.slice(1); }`, UNSURE],
  ['theme', 'сильная линия наверняка — с первого цикла', `__sure0 = {}; for (const [id, B] of Object.entries(LBX.boxes)) if (B.type === 'u') { __sure0[id] = B.sure; B.sure = B.sure.map(x => [x[0], x[1], 1]); }`, UNSURE],
  ['theme', 'валюта Пробуждённого не удвоена', `__cur0 = {}; for (const [id, B] of Object.entries(LBX.boxes)) if (B.type === 'a') { __cur0[id] = B.cur; B.cur = LBX.boxes[id.replace(/_a$/, '')].cur; }`, 'for (const id of Object.keys(__cur0)) LBX.boxes[id].cur = __cur0[id];'],
  ['theme', 'сундук темы выдан не весь: первая запись не дошла до запасов', `EnLoot.toDust0 = EnLoot.toDust; EnLoot.toDust = function (L, res, aw) { const c = EnLoot.toDust0(L, res, aw); if (c.sure.length) c.sure = c.sure.slice(1); return c; };`, 'EnLoot.toDust = EnLoot.toDust0;'],
  ['forbid', 'в сундуке — души', `__push(() => ({ line: 'dust', r: 1, kind: 'cur', id: 'souls', q: 1 }));`, UNROLL],
  ['forbid', 'в сундуке — Энериум', `__push(() => ({ line: 'dust', r: 1, kind: 'cur', id: 'enerium', q: 5 }));`, UNROLL],
  ['forbid', 'руна предела в сундуке лестницы', `__push(d => (LBX.boxes[d.spec.box].theme ? null : { line: 'rune', r: 2, kind: 'item', id: LBX.pools.rune[d.spec.cyc][0], q: 1 }));`, UNROLL],
  ['forbid', 'осколок доблести в сундуке странника', `__push(d => (d.spec.box === 'wander' ? { line: 'vshard', r: 3, kind: 'item', id: LBX.pools.vshard[d.spec.cyc][0], q: 1 } : null));`, UNROLL],
  ['forbid', 'руна доблести в сундуке артели', `__push(d => (d.spec.box === 'artel' ? { line: 'valor', r: 6, kind: 'item', id: LBX.pools.valor[d.spec.cyc][0], q: 1 } : null));`, UNROLL],
  ['forbid', 'билет призыва в сундуке', `__push(() => ({ line: 'res', r: 3, kind: 'item', id: RX.items.find(i => i.tier === 'call').id, q: 1 }));`, UNROLL],
  ['forbid', 'Многоликий в сундуке КрафБосса', `__push(d => (LBX.boxes[d.spec.box].theme ? { line: 'res', r: 4, kind: 'item', id: RX.items.find(i => i.tier === 'echo').id, q: 1 } : null));`, UNROLL],
  ['forbid', 'изделие мастерской в сундуке', `__push(() => ({ line: 'res', r: 3, kind: 'item', id: RX.items.find(i => i.tier === 'made').id, q: 1 }));`, UNROLL],
  ['forbid', 'ларец в сундуке', `__push(() => ({ line: 'res', r: 5, kind: 'item', id: 'chest_tal5', q: 1 }));`, UNROLL],
  ['forbid', 'герой целиком в сундуке', `__push(() => ({ line: 'shards', r: 5, kind: 'hero', id: Object.keys(RSI)[0], q: 1 }));`, UNROLL],
];
for (const [k, what, brk, fix] of MUT) {
  try { vm.runInContext(brk, M.ctx); } catch (e) { say(`мутация «${what}»: не применилась — ${e.message}`); continue; }
  const got = lawRun(k, true);
  try { vm.runInContext(fix, M.ctx); } catch (e) { say(`мутация «${what}»: не снялась — ${e.message}`); }
  if (SHOW_MUT) console.log(`мутация «${what}» [${k}]: ${got.length ? got[0].slice(0, 220) : 'НЕ ПОЙМАНА'}`);
  if (got.length) cnt.mut++; else say(`мутация «${what}»: закон ${k} её не поймал`);
}
/* мутации сняты — законы снова чисты */
for (const k of Object.keys(LAW)) for (const e of lawRun(k, true)) say(`закон ${k} после мутаций: ${e}`);
done();
