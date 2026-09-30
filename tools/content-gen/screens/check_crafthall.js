/* Автопроверка слоя «Ремесла» — залы башни и вещи мастера (design/ui/screens/crafthall.js и crafthall.css, «Рынок» — market.js
   и market.css, вид окон — craft.css, bag.css, shop.css, reforge.css, chest-open.css) — без браузера.
   Слово автора 30.09.2026: «Само Окно крафта так же сделай дорогим и богатым, как и в целом над всеми окнами в ремесле, чтобы они
   выглядили ааа уровня, сгенерируй для этого всё что надо будет».
   1. Файлы: index.html подключает crafthall.css до craft.css (у правил раздела вес :where — правило экрана сильнее), market.css;
      crafthall.js — после reforge.js, market.js — после crafthall.js; скрипты компилируются; концы строк — CRLF; классы cr-* и mk-*
      из скриптов описаны в своих стилях; ключевые кадры — только transform и opacity; «меньше движения» — без движения.
   2. Арт: пути CR_ART.ready есть на диске; у каждого вида рамки — картинка и окно (целые ‰, окно внутри тела); срезы страницы
      гримуара — внутри картинки; ярус данных без вида рамки — предупреждение (такой ярус получит рамку сырья).
   3. Залы: у каждого окна «Ремесла» свой зал — Мастерская, Запасы, Лавка, Рынок, Кузня; фаза пыли — от часов страницы: перерисовка
      не начинает движение заново; окно открытия сундука — зал Запасов и помост под сундуком.
   4. Рамки: колодцы предметов — data-fk своего вида в Мастерской (плитки, гнёзда, пьедестал), в Запасах (клетки и карточка), в Лавке,
      на Рынке и в листах; у талисманов, снаряжения, осколков и сундуков рамки предмета нет.
   5. Пометка Этриона (поле hint): карточка ресурса Мастерской и Запасов, лист товара Лавки, у стола — для выбранной ячейки, печать
      у гнезда; без поля — нигде; у спойлера цикла VI — нет.
   6. Тысяча ресурсов — вторая песочница: 1000 ресурсов разных ярусов, циклов, биомов и ремёсел, 500 найденных рецептов, 300 лотов.
      Мастерская и Запасы рисуют порцию CR_VIEW.page, «Показать ещё» — следующую; грани цикл, биом, вид, ремесло, редкость отбирают
      то же, что независимый отбор; поиск; книга рецептов и рынок — порциями; время отрисовки — в отчёте.
   7. Отклик: ресурс в гнезде опускается по времени от события (класс держится WS_FX.drop.life), сложившийся рецепт встаёт на пьедестал
      один раз; пометка у стола появляется один раз; перерисовка не повторяет движение.
   8. Вёрстка — расчётом на 932 × 430 и 844 × 390 из чисел стилей: стол входит в свою зону, гнёзда и пьедестал — внутри стола,
      пометке у стола не меньше 120 px; карточка Запасов — страница гримуара, внутри не меньше 380 px; ряд Лавки вмещает товар на
      подушке, имя в две строки и бирку цены; строка Рынка вмещает предмет, имя, число, цену и действие.
   9. Режим «Игрок»: служебного нет ни в одном окне раздела, ни в их листах (SERVICE из check_player_view.js).
   10. UI-кит: раздел «Ремесло: залы и вещи мастера» — пять залов, восемь рамок в семи редкостях, пометка, вещи стола.
   Запуск: node tools/content-gen/screens/check_crafthall.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { strip, playerText, SERVICE } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const OWN = ['screens/crafthall.js', 'screens/crafthall.css', 'screens/market.js', 'screens/market.css'];
const CSS = { hall: read('screens/crafthall.css'), craft: read('screens/craft.css'), bag: read('screens/bag.css'), shop: read('screens/shop.css'), mk: read('screens/market.css'), co: read('screens/chest-open.css') };
const err = [], warn = [], rep = [];
const say = m => err.push(m), ok = (m, c) => { if (!c) err.push(m); };
let drawn = 0;

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const order = scripts.map(s => s.src || ''), links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
ok('index.html: не подключён screens/crafthall.css', links.includes('screens/crafthall.css'));
ok('index.html: crafthall.css подключён не до craft.css — правило экрана при равном весе должно быть сильнее', links.indexOf('screens/crafthall.css') >= 0 && links.indexOf('screens/crafthall.css') < links.indexOf('screens/craft.css'));
ok('index.html: не подключён screens/market.css', links.includes('screens/market.css'));
ok('index.html: crafthall.js не после reforge.js — зал ложится поверх вкладки «Перековка»', order.indexOf('screens/crafthall.js') > order.indexOf('screens/reforge.js'));
ok('index.html: market.js не после crafthall.js', order.indexOf('screens/market.js') > order.indexOf('screens/crafthall.js'));
for (const f of OWN) {
  const t = read(f), crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
  if (crlf !== lf) say(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`);
  if (f.endsWith('.js')) try { new vm.Script(t, { filename: f }); } catch (e) { say(`синтаксис ${f}: ${e.message}`); }
}
/* классы: cr-* из скриптов раздела описаны в crafthall.css, mk-* из market.js — в market.css. Переменные --cr-* и чужие zp-cr — не классы */
const defs = (css, p) => new Set((css.match(new RegExp(`\\.${p}-[a-z0-9-]+`, 'g')) || []).map(s => s.slice(1)));
const uses = (js, p) => new Set((js.match(new RegExp(`(?<![-\\w])${p}-[a-z0-9-]*[a-z0-9]`, 'g')) || []));
{
  const crDef = defs(CSS.hall, 'cr'), crHtml = new Set(Object.values(CSS).flatMap(css => (css.match(/html\.cr-[a-z0-9-]+/g) || []).map(s => s.slice(5))));
  for (const f of ['screens/crafthall.js', 'screens/craft.js', 'screens/bag.js', 'screens/shop.js', 'screens/market.js', 'screens/chest-open.js'])
    for (const c of uses(read(f), 'cr')) if (!crDef.has(c) && !crHtml.has(c)) say(`crafthall.css: не описан класс ${c} (${f})`);
  const mkDef = defs(CSS.mk, 'mk'), idx = defs(html, 'mk');
  for (const c of uses(read('screens/market.js'), 'mk')) if (!mkDef.has(c) && !idx.has(c)) say(`market.css: не описан класс ${c}`);
}
/* ключевые кадры — только transform и opacity; объявленная анимация есть; «меньше движения» — без движения */
for (const [f, css] of [['crafthall.css', CSS.hall], ['market.css', CSS.mk], ['craft.css', CSS.craft], ['bag.css', CSS.bag], ['shop.css', CSS.shop]]) {
  const c = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const kf = [...c.matchAll(/@keyframes\s+([a-z0-9-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)], own = new Set(kf.map(m => m[1]));
  for (const [, name, body] of kf) {
    const bad = [...body.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]).filter(p => p !== 'transform' && p !== 'opacity');
    if (bad.length) say(`${f}: @keyframes ${name} двигает ${[...new Set(bad)].join(', ')} — только transform и opacity`);
  }
  const allKf = new Set(Object.values(CSS).concat(html).flatMap(t => [...t.matchAll(/@keyframes\s+([a-z0-9-]+)/g)].map(m => m[1])));
  for (const m of c.matchAll(/animation:\s*([a-z][a-z0-9-]*)/g)) if (!['none', 'inherit'].includes(m[1]) && !own.has(m[1]) && !allKf.has(m[1])) say(`${f}: анимация ${m[1]} без ключевых кадров`);
  if (/animation:/.test(c) && !/prefers-reduced-motion:reduce/.test(c)) say(`${f}: у движения нет правила «меньше движения»`);
}
if (err.length) done();

/* ================== песочница: прототип по порядку скриптов, заглушка DOM, часы — управляемые ================== */
function sandbox(beforeModel) {
  let clock = 0;
  const stubEl = id => ({ id, innerHTML: '', textContent: '', value: '', style: { setProperty() {} }, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x,
    insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 });
  const els = {};
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
    createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: stubEl('html'), activeElement: null, fonts: null, baseURI: 'file:///ui/' };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1, URL,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => clock } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { (/^screens\/(?!crafthall|market|craft|bag|shop|model)/.test(s.src || '') ? warn : err).push(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
    /* данные тысячи ресурсов — сразу после recipes.js: основной скрипт и BAG строят свои справочники уже с ними */
    if (s.src === 'recipes.js' && beforeModel) vm.runInContext(`(${beforeModel.toString()})(EN_RECIPES)`, ctx);
  }
  vm.runInContext(`globalThis.__T = {
    get S() { return S; }, set S(v) { S = v; }, reset(seg) { S = initialState(); S.route = 'craft'; S.seg.craft = seg || 'work'; KH.team = false; },
    html() { render(); return document.getElementById('game').innerHTML; }, rootStyle: document.documentElement.style,
    ACT, OV, BAG, EN_RECIPES, KIT_EXTRA, KH, CR_VIEW, CR_ART, CR_KIND, CR_FRAMES, crKind, crK, crHint, crHintText, crFacets, crFacetMatch, crBiomeOf,
    crHallHtml, crKitHtml, crPage, WS_DATA, WS_FX, WS_SRV, wsInvView, wsStock, wsSetTable, zpView, zpEntries, mkView, lvCard, LV_DATA,
    eqIcon: typeof eqIcon === 'function' ? eqIcon : null, zpCell, ZP_VIEW, rfEqTile, eqSlotName: typeof eqSlotName === 'function' ? eqSlotName : null,
  };`, ctx);
  const T = win.__T;
  T.tick = ms => { clock += ms; };
  T.now = () => clock;
  return T;
}
const T = sandbox(null);
if (err.length) done();
const A = T.ACT, R = T.EN_RECIPES;
function look(label, h) {
  drawn++;
  if (typeof h !== 'string' || !h) { say(label + ': пустая разметка'); return ''; }
  const bad = h.match(/undefined|NaN|\[object /);
  if (bad) say(`${label}: в разметке «${bad[0]}» — …${h.slice(Math.max(0, bad.index - 80), bad.index + 30).replace(/\s+/g, ' ')}…`);
  const dup = h.match(/<[a-z]+\b[^>]*?\s(style|class|data-fk)="[^"]*"[^>]*?\s\1="/);
  if (dup) say(`${label}: в теге дважды ${dup[1]} — ${dup[0].slice(0, 120)}`);
  return h;
}
const seen = new Set();
function service(label, h) {
  const i = h.indexOf('<main'), part = i < 0 ? h : h.slice(i), v = strip(part);
  const txt = playerText(part).split('\n').concat([...v.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => m[1]));
  for (const t of txt) for (const [what, re] of SERVICE) {
    const k = what + '|' + t; if (!re.test(t) || seen.has(k)) continue;
    seen.add(k); say(`${label}: игроку видно служебное (${what}) — «${t.slice(0, 100)}»`);
  }
}
const view = label => { const h = look(label, T.html()); service(label, h); return h; };
function run(label, f) { try { f(); } catch (e) { say(`${label}: исключение — ${e.message}\n    ${(e.stack || '').split('\n').slice(1, 3).join('\n    ')}`); } }

/* ================== 2. арт ================== */
run('арт', () => {
  const ART = path.join(UI, 'assets', 'art');
  for (const p of T.CR_ART.ready) ok(`арт: выгрузки нет на диске — ${p}`, fs.existsSync(path.join(ART, p)));
  const kinds = T.CR_FRAMES.map(([k]) => k);
  for (const k of kinds) {
    ok(`рамка «${k}»: нет картинки в CR_ART.ready`, T.CR_ART.ready.includes(`craft/frame-${k}.png`));
    const w = T.CR_ART.frames[k];
    ok(`рамка «${k}»: окно — не четыре целых ‰`, Array.isArray(w) && w.length === 4 && w.every(Number.isInteger));
    if (w) ok(`рамка «${k}»: окно не внутри тела — ${w}`, w[0] + w[2] < 1000 && w[1] + w[3] < 1000 && w.every(x => x > 0));
  }
  for (const [t, k] of Object.entries(T.CR_KIND)) ok(`CR_KIND: ярус ${t} ведёт к неизвестной рамке ${k}`, kinds.includes(k));
  const free = Object.keys(R.tiers || {}).filter(t => !(t in T.CR_KIND));
  if (free.length) warn.push(`ярусы данных без вида рамки — получат рамку сырья: ${free.join(', ')} (строка в CR_KIND, screens/crafthall.js)`);
  /* вид по семейству (CR_FAM, поле fam): город, карст, топливо, Энериум — свои рамки; каждая из рамок кому-то нужна */
  const used = new Set(R.items.map(it => T.crKind(it)));
  for (const k of used) ok(`предмет получает неизвестную рамку ${k}`, kinds.includes(k));
  for (const k of kinds) ok(`рамка «${k}» не нужна ни одному предмету данных`, used.has(k));
  for (const [fam, k] of [['city', 'city'], ['karst', 'karst'], ['fuel', 'karst'], ['ener', 'karst']]) {
    const it = R.items.find(x => x.fam === fam);
    if (it) ok(`семейство ${fam}: рамка ${T.crKind(it)}, а нужна ${k}`, T.crKind(it) === k);
  }
  const P = T.CR_ART.page;
  ok('страница гримуара: срезы border-image — не внутри картинки', P.slice[0] + P.slice[2] < P.px[1] && P.slice[1] + P.slice[3] < P.px[0] && P.slice.every(Number.isInteger));
  /* страница в стилях — те же срезы, что в CR_ART.page */
  const sl = P.slice.join(' ');
  for (const [f, css] of [['craft.css', CSS.craft], ['bag.css', CSS.bag]]) ok(`${f}: срезы страницы гримуара не как в CR_ART.page (${sl})`, css.includes(`var(--cr-page) ${sl} fill`));
  /* переменные арта — только выгруженным */
  ok('арт: у <html> не стоят адреса залов', !!T.CR_ART.hall.work);
});

/* ================== 3. залы ================== */
run('залы', () => {
  const want = { work: 'work', stock: 'stock', shop: 'shop', market: 'market', reforge: 'forge' };
  for (const [seg, hall] of Object.entries(want)) {
    T.reset(seg);
    const h = view(`зал · ${seg}`), halls = [...h.matchAll(/<div class="cr-hall" data-hall="([a-z]+)" style="--t:(-?\d+)ms"/g)];
    ok(`«Ремесло · ${seg}»: зал не один — ${halls.length}`, halls.length === 1);
    if (halls[0]) ok(`«Ремесло · ${seg}»: зал ${halls[0][1]}, ждали ${hall}`, halls[0][1] === hall);
    ok(`crafthall.css: у зала ${hall} нет фона`, CSS.hall.includes(`.cr-hall[data-hall="${hall}"] .cr-hall-bg{background:var(--cr-hall-${hall})`));
    ok(`«Ремесло · ${seg}»: пыли в луче не ${T.CR_VIEW.dust}`, (h.match(/class="cr-mt"/g) || []).length === T.CR_VIEW.dust);
  }
  /* фаза — от часов страницы: другой момент — другая фаза, рисунок пыли тот же */
  const a = T.crHallHtml('work'); T.tick(1234); const b = T.crHallHtml('work');
  ok('зал: фаза пыли не от часов страницы', /--t:-?\d+ms/.test(a) && a.replace(/--t:-?\d+ms/, '') === b.replace(/--t:-?\d+ms/, '') && a !== b);
  ok('зал: фаза — не по модулю CR_VIEW.cycle', b.includes(`--t:${-(T.now() % T.CR_VIEW.cycle)}ms`));
  /* окно открытия сундука: зал Запасов и помост */
  ok('chest-open.css: за сундуком нет зала Запасов', /html\.cr-h \.co-bg\{[^}]*var\(--cr-hall-stock\)/.test(CSS.co));
  ok('chest-open.css: нет помоста под сундуком', /\.co-dais\{/.test(CSS.co) && /html\.cr-d \.co-dais\{[^}]*var\(--cr-dais\)/.test(CSS.co));
  ok('chest-open.js: помост не в сцене', /class="co-dais"/.test(read('screens/chest-open.js')));
});

/* ================== 4. рамки ================== */
const kindsOk = new Set(T.CR_FRAMES.map(([k]) => k));
const fks = h => [...h.matchAll(/data-fk="([a-z]+)"/g)].map(m => m[1]);
run('рамки', () => {
  T.reset('work');
  let h = view('Мастерская · рамки'), grid = h.slice(h.indexOf('ws-grid'), h.indexOf('ws-craft'));
  const tiles = (grid.match(/data-wsdrag="/g) || []).length, framed = (grid.match(/<button class="well[^"]*"[^>]*data-fk="[a-z]+"[^>]*>/g) || []).length;
  ok(`Мастерская: плиток ${tiles}, в рамке своего вида ${framed}`, tiles > 0 && tiles === framed);
  for (const k of fks(grid)) if (!kindsOk.has(k)) say(`Мастерская: неизвестный вид рамки ${k}`);
  /* вид — от яруса: у каждой плитки рамка своего предмета */
  for (const m of grid.matchAll(/data-v="([^"]+)"[^>]*data-fk="([a-z]+)"/g)) { const it = T.BAG.item(m[1]); if (it && T.crKind(it) !== m[2]) say(`Мастерская: у ${m[1]} рамка ${m[2]}, вид ${T.crKind(it)}`); }
  T.wsSetTable(T.WS_DATA.demo.table); h = view('Мастерская · стол');
  ok('стол: у ресурса в гнезде нет рамки своего вида', /class="well ws-cell[^"]*"[^>]*data-fk="[a-z]+"/.test(h));
  ok('стол: у найденного рецепта на пьедестале нет рамки итога', /class="well ws-core known[^"]*"[^>]*data-fk="[a-z]+"/.test(h));
  ok('стол: нет диска, кольца и желобов', h.includes('class="ws-disc"') && h.includes('class="ws-rg"') && (h.match(/class="ws-gr[ "]/g) || []).length === T.WS_DATA.cells);
  A.wsinfo('fang'); h = view('карточка ресурса · рамка'); A.close();
  ok('карточка ресурса: крупная плитка без рамки', /<span class="well" data-r="\d"[^>]*data-fk="[a-z]+"/.test(h));
  /* Запасы: ресурсы — в рамке; талисманы, снаряжение, осколки, сундуки — со своим артом, без рамки предмета */
  T.reset('stock');
  for (const tab of ['res', 'rune', 'call', 'shard', 'chest', 'tal', 'eq']) {
    T.S.zp.tab = tab; h = view(`Запасы · ${tab}`);
    const g = (h.match(/<div class="zp-grid[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/) || [])[1] || '';
    const items = T.zpEntries(tab).filter(e => e.kind === 'item').length, framedCells = (g.match(/<button class="zp-cell[^"]*"[^>]*data-fk="/g) || []).length;
    ok(`Запасы · ${tab}: предметов ${items}, в рамке ${framedCells}`, framedCells === Math.min(items, T.CR_VIEW.page));
    const e = T.zpEntries(tab)[0];
    if (e) { A.zpsel(e.key); const c = view(`Запасы · ${tab} · карточка`), card = c.slice(c.indexOf('zp-card'));
      ok(`Запасы · ${tab}: у карточки предмета нет рамки своего вида`, e.kind !== 'item' || /class="zp-ic lg[^"]*"[^>]*data-fk="[a-z]+"/.test(card)); }
  }
  /* Лавка и Рынок */
  T.reset('shop'); h = view('Лавка · рамки');
  const ics = (h.match(/<span class="lv-ic"[^>]*>/g) || []);
  ok(`Лавка: у товаров нет рамки своего вида — ${ics.length}`, ics.length === T.S.shop.length && ics.every(x => /data-fk="[a-z]+"/.test(x)));
  A.buy('0'); h = view('Лавка · лист товара'); A.close();
  ok('лист товара: крупная плитка без рамки', /class="lv-big"[^>]*data-fk="[a-z]+"/.test(h));
  T.reset('market'); T.S.seg.market = 'buy'; h = view('Рынок · лоты');
  ok('Рынок: у лотов нет рамки своего вида', (h.match(/class="well mk-ic"[^>]*data-fk="[a-z]+"/g) || []).length === T.S.market.lots.length);
  ok('Рынок: навес над рядами', h.includes('class="mk-aw"'));
  T.S.seg.market = 'mine'; h = view('Рынок · свои лоты');
  ok('Рынок · свои лоты: предмет лота без рамки', /class="mk-pick"><button class="well mk-ic"[^>]*data-fk="/.test(h));
  ok('Рынок · форма лота: предметы не группами по виду', /<optgroup label="[^"]+">/.test(h));
  /* снаряжение — иконка слота своей редкости (art-icons.js: eqIcon(slot, px, alt, r)) в Запасах и Перековке */
  if (T.eqIcon && T.eqSlotName) {
    T.reset('stock');
    const eqs = T.zpEntries('eq').filter(e => e.kind === 'equip');
    for (const e of eqs) { const want = T.eqIcon(e.slot, T.ZP_VIEW.cellArt, e.name, e.r); if (want && !T.zpCell(e, false).includes(want)) say(`Запасы · снаряжение ${e.key}: иконка не своей редкости ${e.r}`); }
    const slot = eqs.length ? eqs[0].slot : 'main';
    for (let r = 1; r <= 7; r++) { const want = T.eqIcon(slot, 26, T.eqSlotName(slot), r); if (want && !T.rfEqTile(slot, r, false).includes(want)) say(`Перековка: иконка снаряжения не своей редкости ${r}`); }
  }
});

/* ================== 5. пометка Этриона ================== */
run('пометка Этриона', () => {
  const NOTE = 'Проверка пометки: ищите там, где нить встречает кожу', it = T.BAG.item('fang'), was = it.hint;
  T.reset('work');
  /* без поля hint — нигде: ресурс запасов без пометки в данных */
  const plain = R.items.find(x => !x.team && !x.hint && x.id !== 'fang' && T.BAG.has(x.id) && x.tier === 'basic');
  if (plain) { A.wsinfo(plain.id); const h0 = view('карточка без пометки'); A.close(); ok('без поля hint пометка есть', !h0.includes('Пометка Этриона')); }
  let h;
  it.hint = NOTE;
  try {
    A.wsinfo('fang'); h = view('карточка с пометкой'); A.close();
    ok('карточка ресурса: нет пометки Этриона', h.includes('Пометка Этриона') && h.includes(NOTE) && h.includes('class="cr-seal"'));
    T.wsSetTable([['fang', 1]]); T.S.ws.sel = 0; h = view('стол · пометка');
    ok('стол: у выбранной ячейки нет пометки слева', /<div class="ws-hex noted"><div class="cr-hint ws-note">/.test(h) && h.includes(NOTE));
    ok('стол: у гнезда с пометкой нет печати', /data-wscell="0"[^>]*>[\s\S]*?class="ws-nt"/.test(h));
    /* пометка появляется один раз: при следующей перерисовке она уже на месте */
    h = view('стол · пометка второй раз'); ok('стол: пометка снова «появляется» при перерисовке', h.includes('class="cr-hint ws-note shown"'));
    if (plain) { T.S.ws.cells[1] = { id: plain.id, q: 1 }; T.S.ws.sel = 1; h = view('стол · ячейка без пометки');
      ok('стол: пометка у ячейки без поля hint', !h.includes('ws-note') && h.includes('class="ws-hex"')); }
    /* лист «Сведения» index.html (рынок, ритуалы, развитие героя): рамка вида и пометка под загадкой */
    A.item('fang'); h = view('Сведения · пометка'); A.close();
    ok('лист «Сведения»: нет пометки или рамки вида', h.includes(NOTE) && /class="tr-big" data-r="\d" data-fk="[a-z]+"/.test(h));
    T.reset('stock'); T.S.zp.tab = 'res'; A.zpsel('i:fang'); h = view('Запасы · карточка с пометкой');
    ok('Запасы: в карточке ресурса нет пометки', h.slice(h.indexOf('zp-card')).includes(NOTE));
    T.reset('shop'); const g = T.S.shop[0], sit = T.BAG.item(g[0]); const was = sit.hint; sit.hint = NOTE;
    A.buy('0'); h = view('Лавка · лист с пометкой'); A.close(); sit.hint = was; if (was === undefined) delete sit.hint;
    ok('лист товара: нет пометки', h.includes(NOTE));
    /* спойлер цикла VI игроку не показывается */
    const team = R.items.find(x => x.team);
    if (team) { team.hint = NOTE; ok('пометка спойлера цикла VI видна игроку', T.crHint(team) === ''); delete team.hint; }
  } finally { if (was === undefined) delete it.hint; else it.hint = was; }
});

/* ================== 7. отклик ================== */
run('отклик', () => {
  T.reset('work');
  A.wscell('2'); A.wsput('fang');
  const D = T.S.ws.drop;
  ok('ресурс в гнезде: нет отметки движения', !!D && D.i === 2 && D.id === 'fang');
  let h = view('отклик · ресурс лёг');
  ok('ресурс в гнезде: нет класса движения со временем от события', /class="well[^"]*ws-cell[^"]*ws-drop"[^>]*data-wscell="2"[^>]*style="--dd:-?\d+ms"/.test(h));
  T.tick(T.WS_FX.drop.life + 1); h = view('отклик · позже');
  ok('ресурс в гнезде: движение повторяется после срока', !h.includes('ws-drop'));
  /* рецепт сложился: итог встаёт на пьедестал один раз */
  T.reset('work'); T.wsSetTable([['fang', 1]]); A.wscell('1'); A.wsput('k1_hunt'); A.wscell('0'); A.wsput('fang');
  h = view('отклик · рецепт сложился');
  ok('пьедестал: итог не встаёт в миг, когда рецепт сложился', /class="well ws-core known fresh"[^>]*style="--dm:-?\d+ms"/.test(h) && !!T.S.ws.match);
  T.tick(T.WS_FX.drop.life + 1); h = view('отклик · рецепт на столе');
  ok('пьедестал: итог встаёт заново при перерисовке', /class="well ws-core known"/.test(h) && !/ws-core known fresh/.test(h));
  ok('кольцо под пьедесталом — не по часам страницы', /class="ws-hex-in match" data-r="\d" style="--rt:-?\d+ms"/.test(h));
});

/* ================== 8. вёрстка ================== */
run('вёрстка', () => {
  const flat = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
  const C = flat(CSS.craft), IH = flat(html), B = flat(CSS.bag), SH = flat(CSS.shop), HL = flat(CSS.hall);
  const px = (src, re, what) => { const m = src.match(re); if (!m) { say(`вёрстка: в стилях нет ${what}`); return NaN; } return +m[1]; };
  /* все блоки низкого экрана файла подряд: скобки — по балансу */
  const cq = src => {
    let out = '', i = 0;
    while ((i = src.indexOf('@container main (max-height: 360px){', i)) >= 0) {
      let d = 0, j = src.indexOf('{', i);
      for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; }
      out += src.slice(i, j + 1) + ' '; i = j + 1;
    }
    return out;
  };
  const Cc = cq(C), Bc = cq(B), Sc = cq(SH);
  const frames = [{ n: '932 × 430', w: 932, h: 430, top: 46, rail: 78, sm: false }, { n: '844 × 390', w: 844, h: 390, top: 44, rail: 72, sm: true }];
  ok('вёрстка: кадры игры не 932 × 430 и 844 × 390', /\.g\{--top:46px;--rail:78px;[^}]*width:932px;height:430px/.test(IH) && /\.g\.sm\{width:844px;height:390px;--top:44px;--rail:72px\}/.test(IH));
  const spM = px(IH, /--sp-m:(\d+)px/, 'поля экрана --sp-m'), goH = px(IH, /\.btn\.go\{min-height:(\d+)px/, 'высоты главной кнопки');
  const tabsPad = px(IH, /\.tabs\{[^}]*padding:(\d+)px/, 'полей вкладок'), wsTab = px(C, /\.ws \.tabs button\{[^}]*height:(\d+)px/, 'высоты вкладок мастерской');
  const hx = [px(C, /\.ws-hex\{--hx:(\d+)px/, 'стола --hx'), px(Cc, /\.ws-hex\{--hx:(\d+)px\}/, 'стола --hx низкого экрана')];
  const cs = [px(C, /\.ws-cell\{position:absolute;--s:(\d+)px/, 'гнезда --s'), px(Cc, /\.ws-cell\{--s:(\d+)px\}/, 'гнезда низкого экрана')];
  const core = [px(C, /\.ws-core\{[^}]*--s:(\d+)px/, 'пьедестала --s'), px(Cc, /\.ws-core\{--s:(\d+)px\}/, 'пьедестала низкого экрана')];
  const pad = [10, px(Cc, /\.ws-inv,\.ws-craft\{gap:\d+px;padding:(\d+)px\}/, 'полей зоны низкого экрана')], gap = [8, px(Cc, /\.ws-inv,\.ws-craft\{gap:(\d+)px/, 'зазора зоны низкого экрана')];
  const qtyH = px(C, /\.ws-qty\{[^}]*min-height:(\d+)px/, 'строки количества'), noteMax = px(C, /\.ws-note\{[^}]*max-width:(\d+)px/, 'ширины пометки');
  /* места гнёзд в % стола — из стилей */
  const pos = [0, 1, 2, 3, 4, 5].map(i => { const m = C.match(new RegExp(`\\.ws-cell\\[data-wscell="${i}"\\]\\{left:([\\d.]+)%;top:([\\d.]+)%\\}`)); return m ? [+m[1], +m[2]] : null; });
  ok('вёрстка: места шести гнёзд не в стилях', pos.every(Boolean));
  frames.forEach((F, k) => {
    const main = [F.w - F.rail - 2 * spM, F.h - F.top - 2 * spM];
    const craftW = (main[0] - 10) * 11 / 21, inW = craftW - 2 - 2 * (k ? pad[1] : 12), inH = main[1] - 2 - 2 * pad[k];
    const head = wsTab + 2 * tabsPad + 2, area = inH - head - qtyH - goH - 3 * gap[k];
    ok(`вёрстка ${F.n}: стол ${hx[k]} px не входит в зону ${area.toFixed(0)} px`, hx[k] <= area);
    ok(`вёрстка ${F.n}: зона стола уже стола`, hx[k] <= inW);
    pos.forEach((p, i) => { if (!p) return; const cx = hx[k] * p[0] / 100, cy = hx[k] * p[1] / 100, r = cs[k] / 2;
      ok(`вёрстка ${F.n}: гнездо ${i} выходит за стол`, cx - r >= -1 && cy - r >= -1 && cx + r <= hx[k] + 1 && cy + r <= hx[k] + 1);
      const d = Math.hypot(cx - hx[k] / 2, cy - hx[k] / 2); ok(`вёрстка ${F.n}: гнездо ${i} налезает на пьедестал`, d - r >= core[k] / 2 + 2); });
    const note = Math.min(noteMax, inW - hx[k] - 12);
    ok(`вёрстка ${F.n}: пометке у стола ${note.toFixed(0)} px — уже 120`, note >= 120);
    rep.push(`${F.n}: стол ${hx[k]} из ${area.toFixed(0)} px, гнездо ${cs[k]}, пьедестал ${core[k]}, пометка ${note.toFixed(0)} px`);
  });
  /* Запасы: карточка — страница гримуара, внутри не меньше 380 px */
  const zt = [px(B, /\.zp-stock\{--zt:(\d+)px/, 'клетки запасов'), px(Bc, /\.zp-stock\{--zt:(\d+)px/, 'клетки запасов низкого экрана')];
  const zg = [px(B, /\.zp-stock\{[^}]*--zg:(\d+)px/, 'зазора запасов'), px(Bc, /\.zp-stock\{[^}]*--zg:(\d+)px/, 'зазора запасов низкого экрана')];
  const zpad = px(B, /\.zp-stock\{[^}]*--zpad:(\d+)px/, 'полей списка запасов'), stockGap = px(IH, /\.stock\{[^}]*gap:(\d+)px/, 'зазора запасов и карточки');
  const bw = [(B.match(/html\.cr-p \.zp-card\{[^}]*border-width:(\d+)px (\d+)px (\d+)px (\d+)px/) || []).slice(1).map(Number), (Bc.match(/html\.cr-p \.zp-card\{border-width:(\d+)px (\d+)px (\d+)px (\d+)px/) || []).slice(1).map(Number)];
  ok('вёрстка: у карточки Запасов нет ширин страницы гримуара', bw.every(x => x.length === 4));
  frames.forEach((F, k) => {
    const main = F.w - F.rail - 2 * spM, list = 6 * zt[k] + 5 * zg[k] + zpad, card = main - list - stockGap, inner = card - (bw[k][1] || 0) - (bw[k][3] || 0) - 24;
    ok(`вёрстка ${F.n}: в карточке Запасов ${inner} px — уже 380`, inner >= 380);
    rep.push(`${F.n}: карточка Запасов ${card} px, внутри ${inner} px`);
  });
  /* Лавка: нижний ряд вмещает товар на подушке, имя в две строки и бирку цены */
  const icon = [px(SH, /html\.cr-f \.lv-ic\[data-fk\]\{width:(\d+)px/, 'значка товара'), px(Sc, /html\.cr-f \.lv-ic\[data-fk\]\{width:(\d+)px/, 'значка товара низкого экрана')];
  const icMb = [px(SH, /\.lv-ic\{margin-bottom:(\d+)px\}/, 'поля под значком'), px(Sc, /\.lv-ic\{margin-bottom:(\d+)px\}/, 'поля под значком низкого экрана')];
  const cardGap = px(SH, /\.lv-card\{isolation:isolate;[^}]*gap:(\d+)px/, 'зазора карточки');
  const padT = px(SH, /\.lv-card\{isolation:isolate;[^}]*padding:(\d+)px/, 'поля карточки');
  const padB2 = [px(SH, /\.lv-grid>\.lv-card:nth-child\(n\+6\)\{padding-bottom:(\d+)px\}/, 'поля нижнего ряда'), px(Sc, /\.lv-grid>\.lv-card:nth-child\(n\+6\)\{padding-bottom:(\d+)px\}/, 'поля нижнего ряда низкого экрана')];
  const nmF = [px(SH, /\.lv-nm\{[^}]*font:600 ([\d.]+)px/, 'шрифта имени'), px(Sc, /\.lv-nm\{font-size:([\d.]+)px\}/, 'шрифта имени низкого экрана')];
  const prF = [px(SH, /\.lv-pr\{[^}]*font:700 ([\d.]+)px/, 'шрифта цены'), px(Sc, /\.lv-pr\{font-size:([\d.]+)px\}/, 'шрифта цены низкого экрана')];
  const headH = px(SH, /\.lv-head\{[^}]*min-height:(\d+)px/, 'шапки витрины');
  ok('вёрстка: у шапки витрины поля сверху или снизу — её высота больше min-height', /\.lv-head\{padding:0 /.test(SH));
  frames.forEach((F, k) => {
    const gridH = F.h - F.top - 2 * spM - headH - spM, row = (gridH - spM) / 2;
    const need = padT + icon[k] + icMb[k] + cardGap + nmF[k] * 1.15 * 2 + cardGap + prF[k] + 6 + padB2[k];
    ok(`вёрстка ${F.n}: нижний ряд Лавки ${row.toFixed(0)} px, товару нужно ${need.toFixed(0)} px`, need <= row);
    rep.push(`${F.n}: ряд Лавки ${row.toFixed(0)} px, товар ${need.toFixed(0)} px`);
  });
  /* Рынок: строка вмещает предмет, имя не уже 120 px, число, цену и действие */
  const M = flat(CSS.mk), cols = (M.match(/\.mk-lot\{[^}]*grid-template-columns:(\d+)px minmax\(0,1fr\) (\d+)px (\d+)px auto;gap:(\d+)px/) || []).slice(1).map(Number);
  ok('вёрстка: у строки рынка нет столбцов', cols.length === 4);
  frames.forEach(F => { const main = F.w - F.rail - 2 * spM, row = main - 20 - 22, name = row - cols[0] - cols[1] - cols[2] - 84 - 4 * cols[3];
    ok(`вёрстка ${F.n}: имени лота ${name} px — уже 120`, name >= 120); });
  ok('crafthall.css: пометке у стола на низком экране не сокращены строки', /@container main \(max-height: 360px\)\{ \.cr-hint\.ws-note/.test(HL));
});

/* ================== 9. режим «Игрок»: окна и листы ================== */
run('режим «Игрок»', () => {
  for (const seg of ['work', 'stock', 'shop', 'market', 'reforge']) {
    T.reset(seg); view(`игрок · ${seg}`);
    if (seg === 'work') { A.wsview('book'); view('игрок · книга'); A.wsview('table'); T.S.overlay = { t: 'wsfilt' }; view('игрок · фильтры мастерской'); T.S.overlay = null; }
    if (seg === 'stock') { T.S.overlay = { t: 'zpfilt' }; view('игрок · фильтры запасов'); T.S.overlay = null; }
    if (seg === 'market') { T.S.seg.market = 'mine'; view('игрок · свои лоты'); }
  }
});

/* ================== 10. UI-кит ================== */
run('UI-кит', () => {
  ok('UI-кит: нет раздела «Ремесло: залы и вещи мастера»', T.KIT_EXTRA.some(x => x.html === T.crKitHtml));
  const k = look('UI-кит · Ремесло', T.crKitHtml());
  ok('UI-кит: не пять залов', (k.match(/class="cr-kh-p" data-hall="/g) || []).length === 5);
  ok(`UI-кит: рамок не ${T.CR_FRAMES.length * 7}`, (k.match(/class="well cr-kw" data-fk="/g) || []).length === T.CR_FRAMES.length * 7);
  ok('UI-кит: нет пометки Этриона', k.includes('Пометка Этриона'));
  ok('UI-кит: нет вещей стола', ['cr-kt-t', 'cr-kt-s', 'cr-kt-c', 'cr-kt-h', 'cr-kt-d'].every(c => k.includes(c)));
});

/* ================== 6. тысяча ресурсов — своя песочница ================== */
const NRES = 1000, NREC = 500, NLOT = 300;
run('тысяча ресурсов', () => {
  const Z = sandbox(function (R) {
    /* 1000 ресурсов: ярусы по кругу — нынешние и будущие данные Этриона; циклы, биомы, руины, ремёсла и редкости — вперемешку */
    const tiers = ['basic', 'key', 'unique', 'craftres', 'find', 'trophy', 'part', 'made', 'city', 'karst', 'fuel', 'rdust'], specs = Object.keys(R.specs);
    for (let i = 0; i < 1000; i++) {
      const t = tiers[i % tiers.length], cyc = 1 + (i % 6), n = 'Проба ' + String(i).padStart(4, '0');
      const b = t === 'craftres' || t === 'find' || t === 'trophy' ? 'cb' + (1 + i % 7) : t === 'basic' ? '' : 'b' + (1 + Math.floor(i / 12) % 12);
      R.items.push({ id: 'zz' + i, n, cyc, pool: t === 'basic', tier: t, spec: specs[i % specs.length], r: 1 + (i % 7), lore: 'Загадка пробы ' + i, src: [], b, hint: i % 2 ? 'Пометка пробы ' + i : undefined });
    }
    /* 500 найденных рецептов из проб: выход — изделие пробы, вход — две базовые пробы */
    for (let i = 0; i < 500; i++) R.recipes.push({ id: 'rz' + i, cyc: 1 + (i % 6), n: 'Рецепт пробы ' + i, kind: 'made', out: ['zz' + (7 + 12 * (i % 83)), 1], in: [['zz' + (12 * (i % 80)), 1], ['zz' + (12 * ((i + 1) % 80)), 2]], why: '', weight: 1 });
  });
  if (!Z) return;
  /* запасы: у каждого — от 1 до 500, найденные — 500 рецептов проб */
  Z.reset('work');
  for (let i = 0; i < NRES; i++) Z.BAG.add('zz' + i, 1 + (i * 37) % 500);
  for (let i = 0; i < NREC; i++) Z.BAG.learn('rz' + i);
  const stock = Z.wsStock(), zz = stock.filter(it => /^zz/.test(it.id));
  ok(`тысяча ресурсов: в запасах мастерской ${zz.length} проб`, zz.length === NRES);
  let t0 = Date.now(), h = look('Мастерская · тысяча', Z.html()); const ms = Date.now() - t0;
  const tiles = (h.match(/data-wsdrag="/g) || []).length;
  ok(`Мастерская · тысяча: плиток ${tiles}, порция ${Z.CR_VIEW.page}`, tiles === Z.CR_VIEW.page);
  ok('Мастерская · тысяча: нет «Показать ещё»', /class="cr-more ws-more" data-a="crmore" data-v="wsinv:all"/.test(h));
  Z.ACT.crmore('wsinv:all'); h = Z.html();
  ok('Мастерская · «Показать ещё»: не следующая порция', (h.match(/data-wsdrag="/g) || []).length === 2 * Z.CR_VIEW.page);
  /* грани: отбор — как независимый */
  const base = Z.wsStock();
  const probe = (label, f, pred) => {
    Z.S.ws.inv.f = f; const V = Z.wsInvView(), want = base.filter(pred);
    ok(`грань ${label}: отобрано ${V.list.length}, ждали ${want.length}`, V.list.length === want.length && V.list.every(pred));
    const h2 = Z.html(), n = (h2.match(/data-wsdrag="/g) || []).length;
    ok(`грань ${label}: на экране ${n}, ждали ${Math.min(want.length, Math.max(Z.CR_VIEW.page, Z.S.cr.more['wsinv:all'] || 0))}`, n === Math.min(want.length, Math.max(Z.CR_VIEW.page, Z.S.cr.more['wsinv:all'] || 0)));
  };
  probe('цикл III', { cyc: '3' }, it => !it.pool && it.cyc === 3);
  probe('биом b5', { biome: 'b5' }, it => !it.pool && it.b === 'b5');
  probe('руины', { biome: 'ruin' }, it => /^cb/.test(it.b || ''));
  probe('вид «город»', { kind: 'city' }, it => it.tier === 'city');
  probe('ремесло и редкость', { spec: 'alch', r: '4' }, it => (it.spec || '').split('+').includes('alch') && it.r === 4);
  Z.S.ws.inv.f = { cyc: '9' }; ok('грань без значения в списке не действует', Z.wsInvView().list.length === base.length);
  Z.S.ws.inv.f = {}; Z.S.ws.inv.q = 'Проба 0007'; ok('поиск по тысяче: не нашёл пробу', (Z.html().match(/data-wsdrag="/g) || []).length === 1);
  Z.S.ws.inv.q = '';
  Z.S.overlay = { t: 'wsfilt' }; h = look('фильтры мастерской · тысяча', Z.html()); Z.S.overlay = null;
  ok('лист фильтров мастерской: нет граней цикла, биома, вида, ремесла и редкости', ['cyc:', 'biome:', 'kind:', 'spec:', 'r:'].every(k => h.includes(`data-a="wsf" data-v="${k}`)));
  ok('лист фильтров: имя крафтового биома видно до активации', !Z.EN_RECIPES.places.some(p => h.includes(p.n)));
  /* книга рецептов — порциями */
  Z.ACT.wsview('book'); h = Z.html();
  const rows = (h.match(/class="ws-rc[ "]/g) || []).length;
  ok(`книга · 500 рецептов: строк ${rows}, порция ${Z.CR_VIEW.page}`, rows === Z.CR_VIEW.page && h.includes('data-v="wsbook:all"'));
  Z.ACT.wsview('table');
  /* Запасы: порция и «+N», грани биома и вида */
  Z.S.seg.craft = 'stock'; Z.S.zp.tab = 'res'; h = Z.html();
  const W = Z.zpView('res'), cells = (h.match(/<button class="zp-cell[ "]/g) || []).length;
  ok(`Запасы · тысяча: клеток ${cells}, порция ${Z.CR_VIEW.page}`, cells === Math.min(W.shown.length, Z.CR_VIEW.page));
  ok('Запасы · тысяча: нет клетки «+N»', /<button class="zp-plus" data-a="crmore" data-v="zp:res"[^>]*><b class="num">\+\d+<\/b><\/button>/.test(h));
  Z.ACT.crmore('zp:res'); ok('Запасы · «+N»: не следующая порция', (Z.html().match(/<button class="zp-cell[ "]/g) || []).length === Math.min(W.shown.length, 2 * Z.CR_VIEW.page));
  Z.ACT.zpf('biome:b7'); ok('Запасы · биом: отбор не по биому', Z.zpView('res').shown.every(e => e.biome === 'b7') && Z.zpView('res').shown.length > 0);
  Z.ACT.zpf('biome:b7'); Z.ACT.zpf('kind:karst'); ok('Запасы · вид: отбор не по ярусу', Z.zpView('res').shown.every(e => e.tier === 'karst') && Z.zpView('res').shown.length > 0);
  Z.S.overlay = { t: 'zpfilt' }; h = look('фильтры запасов · тысяча', Z.html()); Z.S.overlay = null;
  ok('лист фильтров запасов: нет граней биома и вида', h.includes('data-v="biome:') && h.includes('data-v="kind:'));
  /* рынок — порциями */
  Z.S.seg.craft = 'market'; Z.S.seg.market = 'buy';
  Z.S.market.lots = Array.from({ length: NLOT }, (_, i) => ({ uid: 'zl' + i, id: 'zz' + (12 * (i % 80)), q: 1 + i % 9, pct: 100 }));
  h = Z.html(); const lots = (h.match(/data-a="mkbuy"/g) || []).length;
  ok(`рынок · ${NLOT} лотов: строк ${lots}, порция ${Z.CR_VIEW.page}`, lots === Z.CR_VIEW.page && h.includes('data-v="mk:buy"'));
  rep.push(`тысяча ресурсов: мастерская рисуется ${ms} мс в песочнице, порция ${Z.CR_VIEW.page}`);
});

console.log(`Разметок проверено: ${drawn}.`);
for (const x of rep) console.log('вёрстка и порции · ' + x);
done();

function done() {
  if (warn.length) console.log('Предупреждения:\n' + warn.join('\n'));
  if (err.length) { console.log('ОШИБКИ:\n' + err.slice(0, 50).join('\n') + (err.length > 50 ? `\n… и ещё ${err.length - 50}` : '')); process.exit(1); }
  console.log('Проверка пройдена: у каждого окна «Ремесла» свой зал, предметы — в рамках своего вида, пометка Этриона там, где есть поле hint, тысяча ресурсов — порциями и гранями, стол, Запасы, Лавка и Рынок помещаются на 932 × 430 и 844 × 390, игроку служебного не видно.');
  process.exit(0);
}
