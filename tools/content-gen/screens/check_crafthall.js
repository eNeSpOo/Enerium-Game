/* Автопроверка слоя «Ремесла» — залы башни и вещи мастера (design/ui/screens/crafthall.js и crafthall.css, «Рынок» — market.js
   и market.css, вид окон — craft.css, bag.css, shop.css, reforge.css, chest-open.css) — без браузера.
   Слово автора 30.09.2026: «Само Окно крафта так же сделай дорогим и богатым, как и в целом над всеми окнами в ремесле, чтобы они
   выглядили ааа уровня, сгенерируй для этого всё что надо будет».
   1. Файлы: index.html подключает crafthall.css до craft.css (у правил раздела вес :where — правило экрана сильнее), market.css;
      crafthall.js — после reforge.js, market.js — после crafthall.js; скрипты компилируются; концы строк — CRLF; классы cr-* и mk-*
      из скриптов описаны в своих стилях; ключевые кадры — только transform и opacity; «меньше движения» — без движения.
   2. Арт: пути CR_ART.ready есть на диске, картинок рамок по виду нет; срезы страницы гримуара — внутри картинки.
   3. Залы: у каждого окна «Ремесла» свой зал — Мастерская, Запасы, Лавка, Рынок, Кузня; фаза пыли — от часов страницы: перерисовка
      не начинает движение заново; окно открытия сундука — зал Запасов и помост под сундуком.
   4. Рамка предмета — одна на все предметы (слово автора 30.09.2026: «пусть они будут едины для всех предметов, и будут более тонкие
      и в тёмных стилях, а вот подсветка будет определять редкость ресурса»): crK даёт один атрибут любому предмету данных, значку
      кошелька — ничего; в стилях нет правил по виду рамки; рамка тонкая (металл ≤ 2 px) и тёмная; редкость — свет: кромка, свет снизу
      и свечение — цветом --rc, кромка ярче с редкостью, свечение — с эпической; у предметов разных видов одной редкости рамка
      одинакова до значения. Колодцы предметов в рамке — в Мастерской (плитки, гнёзда, пьедестал, книга), в Запасах (клетки всех видов
      и карточка), в Лавке, на Рынке, в листах, в Перековке, в Эхо и в наградах (ритуалы, контракты, Входящие).
   4а. Иконка — ровно в окне рамки (каскад css_cascade.js, как в браузере, на 932 × 430 и 844 × 390): у живописи position:absolute,
      левый и верхний край — отступ рамки и металл, размер задан явно, 2·left + width = сторона колодца для любой стороны, left = top,
      width = height; рамка без своей кромки колодца (border:0), вектор и глиф — по центру сетки; в кнопке-сцене нет вложенной кнопки
      (браузер закрыл бы внешнюю, и иконка выпала бы из сцены).
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
   10. UI-кит: раздел «Ремесло: залы и вещи мастера» — пять залов, рамка предмета — виды, семь редкостей и размеры, пометка, вещи стола.
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
  /* классы у <html> — флаги выгруженного арта (cr-t, cr-p…): каскад рамки берёт их, как браузер */
  const rootCls = new Set(), rootEl = stubEl('html');
  rootEl.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
    createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: rootEl, activeElement: null, fonts: null, baseURI: 'file:///ui/' };
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
    ACT, OV, BAG, EN_RECIPES, KIT_EXTRA, KH, CR_VIEW, CR_ART, crK, crFramed, crKitWell, crHint, crHintText, crFacets, crFacetMatch, crBiomeOf,
    crHallHtml, crKitHtml, crPage, WS_DATA, WS_FX, WS_SRV, wsInvView, wsStock, wsSetTable, zpView, zpEntries, mkView, lvCard, LV_DATA,
    eqIcon: typeof eqIcon === 'function' ? eqIcon : null, zpCell, ZP_VIEW, rfEqTile, rfTalTile, rfWorkTile, eqSlotName: typeof eqSlotName === 'function' ? eqSlotName : null,
    itWell, FLOWS, open: (t, arg, extra) => { S.overlay = Object.assign({ t, arg }, extra || {}); },
  };`, ctx);
  const T = win.__T;
  T.tick = ms => { clock += ms; };
  T.now = () => clock;
  T.rootCls = rootCls;
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
  /* рамки по виду сняты словом автора 30.09.2026: рамка одна и рисуется CSS (art-icons.css) — картинок рамок и их флага у <html> нет */
  ok('CR_ART: в выгрузке остались картинки рамок по виду (craft/frame-*)', !T.CR_ART.ready.some(p => /^craft\/frame-/.test(p)) && !('frames' in T.CR_ART));
  ok('у <html> стоит флаг рамок по виду cr-f', !T.rootCls.has('cr-f'));
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

/* ================== 4. рамка предмета — одна на все предметы ==================
   Слово автора 30.09.2026: «рамки слишком толстые, пусть они будут едины для всех предметов, и будут более тонкие и в тёмных стилях,
   а вот подсветка будет определять редкость ресурса». Рамка — art-icons.css («Рамка предмета»): класс itf или атрибут data-fk="item" (crK) */
const FRAME = ' data-fk="item"', flatCss = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
const ICSS = flatCss(read('screens/art-icons.css'));
const framedIn = h => (h.match(/<(?:button|span)\b[^>]*\sdata-fk="item"[^>]*>/g) || []).length;
run('рамка предмета', () => {
  /* разметка: один атрибут у любого предмета данных; у значков кошелька (семейство wallet — Энериум, рунный ключ) — ничего */
  let bad = 0;
  for (const it of R.items) { const want = it.fam === 'wallet' ? '' : FRAME; if (T.crK(it) !== want && bad++ < 3) say(`crK: у ${it.id} (${it.tier}${it.fam ? ' · ' + it.fam : ''}) «${T.crK(it)}», нужно «${want}»`); }
  ok('в данных нет значка кошелька — правило «кошельку рамки нет» ничего не проверяет', R.items.some(it => it.fam === 'wallet'));
  /* стили: вид рамкой не различается — ни одного правила по значению data-fk */
  const sheetsAll = [['index.html', html], ...fs.readdirSync(path.join(UI, 'screens')).filter(f => f.endsWith('.css')).map(f => ['screens/' + f, read('screens/' + f)])];
  for (const [f, css] of sheetsAll) { const m = flatCss(css).match(/\[data-fk="[^"]*"\]/); if (m) say(`${f}: правило по виду рамки ${m[0]} — рамка одна на все предметы`); }
  /* тонкая и тёмная: металл не толще 2 px, четыре цвета скоса — тёмные (самый светлый канал не выше 0x70) */
  const b = (ICSS.match(/:root\{[^}]*--itf-b:(\d+(?:\.\d+)?)px/) || [])[1];
  ok(`рамка: металл --itf-b ${b} px — толще 2 px`, b != null && +b <= 2);
  const after = (ICSS.match(/:is\(\.itf,\[data-fk\],[^{]*\)::after\{([^}]*)\}/) || [])[1] || '';
  const hexes = ((after.match(/border-color:([^;]+)/) || [])[1] || '').match(/#[0-9a-f]{6}/gi) || [];
  ok(`рамка: у металла не четыре цвета скоса (${hexes.length})`, hexes.length === 4);
  for (const x of hexes) if (Math.max(...[1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16))) > 0x70) say(`рамка: металл ${x} — светлый, рамка должна быть тёмной`);
  /* редкость — светом: кромка, свет снизу и свечение — цветом --rc, их силу ставит редкость; рамка — по отступу --itf-in */
  ok('рамка: кромка, свет снизу и свечение — не цветом редкости --rc', ['--itf-k', '--itf-l', '--itf-g'].every(v => new RegExp(`color-mix\\(in srgb,var\\(--rc[^)]*\\) (?:calc\\()?var\\(${v}\\)`).test(after)));
  ok('рамка: не по отступу --itf-in и металлу --itf-b', /inset:var\(--itf-in\)/.test(after) && /border:var\(--itf-b\) solid/.test(after));
  /* колодцы предметов в рамке — по окнам: Мастерская, Запасы, Лавка, Рынок, листы */
  T.reset('work');
  let h = view('Мастерская · рамки'), grid = h.slice(h.indexOf('ws-grid'), h.indexOf('ws-craft'));
  const tiles = [...grid.matchAll(/data-wsdrag="([^"]+)"/g)].map(m => m[1]), wallet = tiles.filter(id => (T.BAG.item(id) || {}).fam === 'wallet').length;
  ok(`Мастерская: плиток ${tiles.length}, в рамке ${framedIn(grid)}, значков кошелька ${wallet}`, tiles.length > 0 && framedIn(grid) === tiles.length - wallet);
  T.wsSetTable(T.WS_DATA.demo.table); h = view('Мастерская · стол');
  ok('стол: ресурс в гнезде не в рамке', /class="well ws-cell[^"]*"[^>]*data-fk="item"/.test(h));
  ok('стол: итог на пьедестале не в рамке', /class="well ws-core known[^"]*"[^>]*data-fk="item"/.test(h));
  ok('стол: нет диска, кольца и желобов', h.includes('class="ws-disc"') && h.includes('class="ws-rg"') && (h.match(/class="ws-gr[ "]/g) || []).length === T.WS_DATA.cells);
  A.wsinfo('fang'); h = view('карточка ресурса · рамка'); A.close();
  ok('карточка ресурса: крупная плитка без рамки', /<span class="well" data-r="\d"[^>]*data-fk="item"/.test(h));
  /* Запасы: ресурс — атрибутом; клетки остальных видов (талисман, снаряжение, осколок, сундук) — в рамке по редкости (art-icons.css) */
  T.reset('stock');
  for (const tab of ['res', 'rune', 'call', 'shard', 'chest', 'tal', 'eq']) {
    T.S.zp.tab = tab; h = view(`Запасы · ${tab}`);
    const g = (h.match(/<div class="zp-grid[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/) || [])[1] || '';
    const E = T.zpEntries(tab).slice(0, T.CR_VIEW.page), items = E.filter(e => e.kind === 'item' && e.it.fam !== 'wallet').length;
    ok(`Запасы · ${tab}: предметов ${items}, в рамке ${framedIn(g)}`, framedIn(g) === items);
    const withR = (g.match(/<button class="zp-cell[^"]*" data-r="\d"/g) || []).length;
    ok(`Запасы · ${tab}: клеток с редкостью ${withR}, а предметов ${E.filter(e => e.kind !== 'wallet').length} — у рамки нет редкости`, withR === E.filter(e => e.kind !== 'wallet').length);
    const e = E[0];
    if (e) { A.zpsel(e.key); const c = view(`Запасы · ${tab} · карточка`), card = c.slice(c.indexOf('zp-card'));
      ok(`Запасы · ${tab}: у карточки ресурса нет рамки`, e.kind !== 'item' || /class="zp-ic lg[^"]*"[^>]*data-fk="item"/.test(card)); }
  }
  /* Лавка и Рынок */
  T.reset('shop'); h = view('Лавка · рамки');
  const ics = (h.match(/<span class="lv-ic"[^>]*>/g) || []);
  ok(`Лавка: у товаров нет рамки предмета — ${ics.length}`, ics.length === T.S.shop.length && ics.every(x => x.includes(FRAME)));
  A.buy('0'); h = view('Лавка · лист товара'); A.close();
  ok('лист товара: крупная плитка без рамки', /class="lv-big"[^>]*data-fk="item"/.test(h));
  T.reset('market'); T.S.seg.market = 'buy'; h = view('Рынок · лоты');
  ok('Рынок: у лотов нет рамки предмета', (h.match(/class="well mk-ic"[^>]*data-fk="item"/g) || []).length === T.S.market.lots.length);
  ok('Рынок: навес над рядами', h.includes('class="mk-aw"'));
  T.S.seg.market = 'mine'; h = view('Рынок · свои лоты');
  ok('Рынок · свои лоты: предмет лота без рамки', /class="mk-pick"><button class="well mk-ic"[^>]*data-fk="item"/.test(h));
  ok('Рынок · форма лота: предметы не группами по виду', /<optgroup label="[^"]+">/.test(h));
  /* Перековка: талисман, снаряжение и рабочий — в рамке предмета; кристалл рабочего без арта — без неё */
  const tal = T.rfTalTile(1, false), eq = T.rfEqTile('main', 3, false), wk = T.rfWorkTile(2, false);
  ok('Перековка: талисман, снаряжение или рабочий не в рамке предмета', [tal, eq, wk].every(x => !/class="rf-t[^"]*"/.test(x) || /class="rf-t[^"]*\bitf\b/.test(x)));
  /* награды: колодец предмета (itWell, index.html) — в рамке; без действия — не кнопка */
  const any = R.items.find(it => !it.team && it.fam !== 'wallet' && it.tier === 'basic');
  ok('награды: колодец предмета itWell без рамки', T.itWell(any.id, { act: 'noop', size: 30 }).includes(FRAME));
  ok('itWell { stat }: колодец без действия — не span', /^<span class="well bw"[^>]*>[\s\S]*<\/span>$/.test(T.itWell(any.id, { stat: true, size: 30 })) && !/data-a=/.test(T.itWell(any.id, { stat: true })));
  /* снаряжение — иконка слота своей редкости (art-icons.js: eqIcon(slot, px, alt, r)) в Запасах и Перековке */
  if (T.eqIcon && T.eqSlotName) {
    T.reset('stock');
    const eqs = T.zpEntries('eq').filter(e => e.kind === 'equip');
    for (const e of eqs) { const want = T.eqIcon(e.slot, T.ZP_VIEW.cellArt, e.name, e.r); if (want && !T.zpCell(e, false).includes(want)) say(`Запасы · снаряжение ${e.key}: иконка не своей редкости ${e.r}`); }
    const slot = eqs.length ? eqs[0].slot : 'main';
    for (let r = 1; r <= 7; r++) { const want = T.eqIcon(slot, 26, T.eqSlotName(slot), r); if (want && !T.rfEqTile(slot, r, false).includes(want)) say(`Перековка: иконка снаряжения не своей редкости ${r}`); }
  }
});

/* ================== 4а. иконка — ровно в окне рамки: каскад, как в браузере ==================
   css_cascade.js решает, чьё правило побеждает у элемента, как браузер: специфичность, порядок, @media и @container. У живописи в рамке
   (res-art, eq-grid, tal-grid, ab-art, картинка без класса, портрет у .face): position:absolute, размер задан явно — у картинки с
   position:absolute размер auto — её собственный (атрибуты width и height), так иконки съезжали вправо вниз и обрезались (30.09.2026).
   Длины — линейно по стороне колодца S (a·S + b px): 2·left + width = S и left = top, width = height — для любой стороны; left — ровно
   отступ рамки и металл (--itf-in + --itf-b), как у кольца рамки; у рамки нет своей кромки колодца (border:0). Вектор и глиф — по центру
   сетки. Кнопка в кнопке — браузер закрывает внешнюю, иконка выпадает из сцены (ритуалы, 30.09.2026) */
const CC = require('./css_cascade.js');
/* длина → [a, b]: a·S + b px (S — сторона колодца); число без единиц — множитель; null — не линейно или auto */
function lin(v) {
  const s = String(v == null ? '' : v).replace(/calc\(/g, '(').trim(); let i = 0;
  const ws = () => { while (s[i] === ' ') i++; };
  function factor() {
    ws();
    if (s[i] === '(') { i++; const x = sum(); ws(); if (s[i] !== ')') return null; i++; return x; }
    const m = s.slice(i).match(/^(-?\d+(?:\.\d+)?)(px|%)?/); if (!m) return null; i += m[0].length;
    return m[2] === 'px' ? { a: 0, b: +m[1] } : m[2] === '%' ? { a: +m[1] / 100, b: 0 } : { a: 0, b: +m[1], k: true };
  }
  function prod() {
    let x = factor(); ws();
    while (x && (s[i] === '*' || s[i] === '/')) {
      const op = s[i++], y = factor(); if (!y) return null;
      if (op === '*') x = x.k ? { a: y.a * x.b, b: y.b * x.b, k: y.k } : y.k ? { a: x.a * y.b, b: x.b * y.b } : null;
      else x = y.k && y.b ? { a: x.a / y.b, b: x.b / y.b, k: x.k } : null;
      ws();
    }
    return x;
  }
  function sum() {
    let x = prod(); ws();
    while (x && (s[i] === '+' || s[i] === '-')) { const op = s[i++], y = prod(); if (!y) return null; x = op === '+' ? { a: x.a + y.a, b: x.b + y.b } : { a: x.a - y.a, b: x.b - y.b }; ws(); }
    return x;
  }
  const r = sum(); ws();
  return r && i === s.length && !r.k ? [r.a, r.b] : null;
}
const same = (x, y) => !!x && !!y && Math.abs(x[0] - y[0]) < 1e-6 && Math.abs(x[1] - y[1]) < 1e-6;
/* колодец в рамке: класс itf, атрибут data-fk или клетка и плитка «Запасов» с редкостью */
const isFrame = e => e.cls.has('itf') || e.attrs.has('data-fk') || ((e.cls.has('zp-cell') || (e.cls.has('zp-ic') && !e.cls.has('bare'))) && e.attrs.has('data-r'));
const PAINT = ['res-art', 'eq-grid', 'tal-grid', 'ab-art'];
const isPaint = (f, k) => k.tag === 'img' && (PAINT.some(c => k.cls.has(c)) || !k.attrs.has('class') || f.cls.has('face'));
/* вложенные кнопки в разметке-строке: браузер закрыл бы внешнюю */
function nestedButtons(h) { const re = /<(\/?)button\b[^>]*>/g; let m, d = 0, n = 0; while ((m = re.exec(h))) { if (m[1]) d = Math.max(0, d - 1); else { if (d) n++; d++; } } return n; }
run('иконка в окне рамки', () => {
  const RULES = CC.sheets(UI, html);
  const gv = (re, name) => { const m = html.match(re); if (!m) { say(`каскад: не найдено ${name}`); return 0; } return +m[1]; };
  const G = { top: gv(/\n\.g\{--top:(\d+)px/, '.g --top'), rail: gv(/\n\.g\{--top:\d+px;--rail:(\d+)px/, '.g --rail'), topS: gv(/\n\.g\.sm\{[^}]*--top:(\d+)px/, '.g.sm --top'), railS: gv(/\n\.g\.sm\{[^}]*--rail:(\d+)px/, '.g.sm --rail') };
  const tree = (small, markup) => CC.wrap([['html', { class: [...T.rootCls].join(' '), lang: 'ru' }], ['body', {}], ['div', { class: 'p-device', id: 'device' }], ['div', { class: 'p-device-inner' }], ['div', { class: small ? 'g sm' : 'g', id: 'game', lang: 'ru' }]], markup);
  const SCR2 = [{ n: '932 × 430', w: 932, h: 430, small: false }, { n: '844 × 390', w: 844, h: 390, small: true }];
  const flow = name => { const f = T.FLOWS.find(x => x[0] === name); if (!f) { say(`каскад: нет сценария «${name}»`); return; } T.S.overlay = null; f[2](); };
  /* окна с предметами: Мастерская, Запасы (все вкладки и карточка), Лавка, Рынок, листы, Перековка, Эхо, награды */
  const WIN = [
    ['Мастерская · стол', () => { T.reset('work'); T.wsSetTable(T.WS_DATA.demo.table); }],
    ['Мастерская · книга рецептов', () => { T.reset('work'); A.wsview('book'); }],
    ['Мастерская · карточка ресурса', () => { T.reset('work'); A.wsinfo('fang'); }],
    ...['res', 'rune', 'call', 'shard', 'chest', 'tal', 'eq'].map(tab => [`Запасы · ${tab}`, () => { T.reset('stock'); T.S.zp.tab = tab; const e = T.zpEntries(tab)[0]; if (e) A.zpsel(e.key); }]),
    ['Лавка', () => T.reset('shop')], ['Лавка · лист товара', () => { T.reset('shop'); A.buy('3'); }],
    ['Рынок', () => { T.reset('market'); T.S.seg.market = 'buy'; }], ['Рынок · свои лоты', () => { T.reset('market'); T.S.seg.market = 'mine'; }],
    ['Сведения', () => { T.reset('market'); T.S.seg.market = 'buy'; T.open('item', 'u2'); }],
    ...['tal', 'eq', 'work'].map(m => [`Перековка · ${m}`, () => { T.reset('reforge'); T.S.seg.rf = m; }]),
    ['Эхо · активация', () => { T.reset('stock'); A.itact('act_cb1'); }],
    ['Ритуалы · сбор', () => { flow('Ритуалы · сбор'); if (A.rtfx) A.rtfx(); }],
    ['Входящие', () => flow('Входящие')],
    ['UI-кит · рамка предмета', null],
  ];
  const tot = { frames: 0, paint: 0, glyph: 0 };
  for (const X of SCR2) {
    const K = () => new CC.Cascade(RULES, { w: X.w, h: X.h, reduced: false, hover: false, containers: { main: [X.w - (X.small ? G.railS : G.rail), X.h - (X.small ? G.topS : G.top)] } });
    for (const [label, set] of WIN) {
      const where = `каскад ${X.n} · ${label}`;
      let h;
      if (set) { set(); h = view(where); } else h = look(where, T.crKitHtml());
      if (!h) continue;
      const nb = nestedButtons(h); if (nb) say(`${where}: кнопка в кнопке (${nb}) — браузер закроет внешнюю, иконка выпадет из сцены`);
      const root = tree(X.small, h), C = K(), frames = CC.q(root, isFrame);
      if (!frames.length) { say(`${where}: нет ни одного колодца в рамке`); continue; }
      let paint = 0, beat = 0;
      for (const f of frames) {
        tot.frames++;
        const brd = C.value(f, 'border');
        if (brd !== '0' && beat++ < 3) say(`${where}: у колодца .${[...f.cls].join('.')} своя кромка «${brd}» (${(C.win(f, 'border') || {}).src}) — окно рамки уедет`);
        const off = lin(`calc(${C.value(f, '--itf-in')} + ${C.value(f, '--itf-b')})`);
        for (const k of f.kids) {
          if (isPaint(f, k)) {
            paint++; tot.paint++;
            const p = C.value(k, 'position'), L = lin(C.value(k, 'left')), Tt = lin(C.value(k, 'top')), W = lin(C.value(k, 'width')), H = lin(C.value(k, 'height'));
            const tell = `${where}: иконка у .${[...f.cls].join('.')}`;
            if (p !== 'absolute') { if (beat++ < 6) say(`${tell} — position ${p}, а нужна absolute`); continue; }
            if (!L || !Tt || !W || !H) { if (beat++ < 6) say(`${tell} — размер не задан явно: left ${C.value(k, 'left')}, top ${C.value(k, 'top')}, width ${C.value(k, 'width')}, height ${C.value(k, 'height')} — у картинки auto — её собственный размер, иконка съедет`); continue; }
            if (!same(L, Tt) || !same(W, H)) { if (beat++ < 6) say(`${tell} — не квадрат по центру: left ${C.value(k, 'left')}, top ${C.value(k, 'top')}, width ${C.value(k, 'width')}, height ${C.value(k, 'height')}`); continue; }
            if (!same([2 * L[0] + W[0], 2 * L[1] + W[1]], [1, 0]) && beat++ < 6) say(`${tell} — не по центру окна: 2·left + width = ${(2 * L[0] + W[0]).toFixed(3)}·S + ${(2 * L[1] + W[1]).toFixed(1)} px, нужно S`);
            if (!same(L, off) && beat++ < 6) say(`${tell} — край ${C.value(k, 'left')} не по окну рамки (--itf-in + --itf-b)`);
            const fit = C.value(k, 'object-fit'); if (!['cover', 'contain'].includes(fit) && beat++ < 6) say(`${tell} — object-fit ${fit}`);
            for (const side of ['right', 'bottom']) { const v = C.value(k, side); if (v && v !== 'auto' && beat++ < 6) say(`${tell} — ${side} ${v}: размер задан явно, край противоположной стороны — auto`); }
          } else if (k.tag === 'svg' || k.tag === 'img' || ['gl', 'hsg', 'zp-cp', 'tl-t'].some(c => k.cls.has(c))) {
            /* вектор, глиф, вырезка (фигура рабочего), стекло осколка, сундук, медальон — по центру сетки колодца */
            tot.glyph++; paint++;
            const d = C.value(f, 'display'), pi = C.value(f, 'place-items');
            if ((d !== 'grid' || pi !== 'center') && beat++ < 6) say(`${where}: значок у .${[...f.cls].join('.')} не по центру — display ${d}, place-items ${pi}`);
          }
        }
      }
      if (set && !paint) say(`${where}: в рамках нет ни одной иконки — разметка не та`);
    }
  }
  /* редкость — светом: сила кромки растёт с редкостью, свечение — с эпической; вид рамкой не различается — у предметов разных ярусов
     одной редкости все свойства рамки и окна иконки равны до значения */
  const C = new CC.Cascade(RULES, { w: 932, h: 430, containers: { main: [932 - G.rail, 430 - G.top] } });
  const one = R.items.find(it => !it.team && it.tier === 'basic' && T.crFramed(it));
  const rar = [1, 2, 3, 4, 5, 6, 7].map(r => { const root = tree(false, T.crKitWell(one, r, 44, 'проба')), f = CC.q(root, isFrame)[0]; return f ? { r, k: parseFloat(C.value(f, '--itf-k')), g: parseFloat(C.value(f, '--itf-g')), rc: C.value(f, '--rc') } : null; });
  if (rar.some(x => !x)) say('каскад: у пробы редкости нет колодца в рамке');
  else {
    const rr = r => rar[r - 1];
    ok(`редкость: кромка не ярче с редкостью — ${rar.map(x => x.k).join(', ')}`, rr(1).k < rr(2).k && rr(2).k === rr(3).k && rr(3).k < rr(4).k && [5, 6, 7].every(r => rr(r).k === rr(4).k));
    ok(`редкость: свечение не с эпической — ${rar.map(x => x.g).join(', ')}`, [1, 2, 3].every(r => rr(r).g === 0) && [4, 5, 6, 7].every(r => rr(r).g > 0));
    for (const x of rar) { const want = (html.match(new RegExp(`--r${x.r}:(#[0-9a-f]{6})`, 'i')) || [])[1]; if (!want || String(x.rc).toLowerCase() !== want.toLowerCase()) say(`редкость ${x.r}: свет рамки ${x.rc}, а цвет редкости ${want} (ADR-0027)`); }
  }
  const PROPS = ['border', 'border-radius', 'background', 'box-shadow', 'overflow', '--itf-b', '--itf-in', '--itf-r', '--itf-k', '--itf-l', '--itf-g', '--rc'];
  const drawn = it => !it.team && T.crFramed(it) && !it.img && it.fam !== 'hero';   // иконка сеткой — у всех, кроме своей картинки и героя
  const tiers = [...new Set(R.items.filter(drawn).map(it => it.tier))];
  let base = null, baseT = '';
  for (const t of tiers) {
    const it = R.items.find(x => drawn(x) && x.tier === t), root = tree(false, T.crKitWell(it, 4, 44, t)), f = CC.q(root, isFrame)[0];
    const img = f && f.kids.find(k => isPaint(f, k)); if (!f || !img) { say(`вид ${t}: проба без колодца или иконки`); continue; }
    const sig = PROPS.map(p => C.value(f, p)).concat(['position', 'left', 'top', 'width', 'height', 'object-fit'].map(p => C.value(img, p))).join(' | ');
    if (base === null) { base = sig; baseT = t; } else if (sig !== base) { say(`вид ${t}: рамка не как у ${baseT} — вид рамкой различаться не должен`); break; }
  }
  rep.push(`каскад: колодцев в рамке ${tot.frames} на двух экранах, иконок сеткой ровно в окне ${tot.paint}, значков по центру ${tot.glyph}, видов с одной рамкой ${tiers.length}`);
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
    ok('лист «Сведения»: нет пометки или рамки предмета', h.includes(NOTE) && /class="tr-big" data-r="\d" data-fk="item"/.test(h));
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
  const icon = [px(SH, /\.lv-ic\[data-fk\]\{width:(\d+)px/, 'значка товара'), px(Sc, /\.lv-ic\[data-fk\]\{width:(\d+)px/, 'значка товара низкого экрана')];
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
  const kv = T.CR_VIEW.kit, nk = kv.tiers.filter(t => R.items.some(it => !it.team && it.tier === t && T.crFramed(it))).length;
  ok(`UI-кит: рамок предмета не ${nk + 7 + kv.sizes.length} — виды, семь редкостей, размеры`, (k.match(/class="well cr-kw" data-fk="item"/g) || []).length === nk + 7 + kv.sizes.length && nk === kv.tiers.length);
  ok('UI-кит: у рамок пробы не семь редкостей', [1, 2, 3, 4, 5, 6, 7].every(r => k.includes(`data-fk="item" data-r="${r}"`)));
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
  console.log('Проверка пройдена: у каждого окна «Ремесла» свой зал, предметы — в одной рамке на все виды, редкость — светом, иконка — ровно в окне рамки на обоих экранах, пометка Этриона там, где есть поле hint, тысяча ресурсов — порциями и гранями, стол, Запасы, Лавка и Рынок помещаются на 932 × 430 и 844 × 390, игроку служебного не видно.');
  process.exit(0);
}
