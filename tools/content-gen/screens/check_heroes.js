/* Автопроверка экрана «Герои» (design/ui/screens/heroes.js): коллекция, плитка и карточка героя, «Призыв» — без браузера.
   1. index.html подключает heroes.css и heroes.js после model.js; heroes.js компилируется и в CRLF. Прежнего кода в index.html нет: плитки
      с кристаллом стихии в углу (el(…, true) в плитке), экрана heroes(), колонок «За души», прежних sq, sqBM и листа prep; .hc — в heroes.css.
   2. Плитка — одна анатомия: кристалл редкости (--rico, ADR-0027) и data-r; значков доблести ровно по личному максимуму, светятся
      взятые; пять отметок рунного предела и уровень — у героя аккаунта; класс значком; у героя состава вне коллекции — цикл. Кристалла
      стихии в плитке нет. Строки — кристалл у лица рисует CSS (.rs-av::after с --rico).
   3. Шапка карточки героя аккаунта: боевая мощь, доблесть «текущая / максимальная», уровень «N / потолок» и пять отметок предела,
      кристалл редкости у названия редкости, класс значком. У героя состава вне коллекции — потенциал доблести.
   4. Купленный герой состава — герой аккаунта: запись коллекции — 0 ур., 0 РП, 0 Добл; H(id) находит его в форме S.heroes; «Мои»
      показывают его плитку, карточку с развитием на всех вкладках; уровень поднимается за дух и пишется в запись коллекции; БМ — целое
      по §6. У героя Эхо — набор из echo-foes.js.
   4б. Боевая мощь — одна функция BM (index.html, §6): в initialState числа нет, h.bm — свойство для чтения; независимый пересчёт
      C × √(УВС × ЭЗ) по карте ядра сходится у героев, после уровня и со слоями талисманов и снаряжения; одно число на плитке
      «Пятёрки сильнейших» (все герои аккаунта), в шапке, в библиотеке отрядов и листе выбора отряда; соперник Арены, цель Эхо
      и цель клана — та же формула, C одна у героев, бестиария и клана; у клана видна мощь отряда атаки.
   5. «Призыв → За души» (правила воздуха): главное — вход рулетки с лицами героев пула и «К рулетке»; отряд Эхо недели и каталог праха —
      входами, списки — в листах hrecho и hrdust; в самой вкладке строк-списков нет. Каталог праха: осколок за прах и пробуждение из листа.
      «За Энериум»: сет-бонус — входом и листом hrset, в списке только пятеро.
   6. Режим «Игрок»: на всех видах нет служебных слов (SERVICE из check_player_view.js), нет undefined и NaN; режим «Команда» рисуется.
   Запуск: node tools/content-gen/screens/check_heroes.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, tiles: 0, heads: 0, cycles: 0, bm: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`«Герои»: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; плиток ${cnt.tiles}, шапок ${cnt.heads}, циклов «Призыва» ${cnt.cycles}; мощь сверена с формулой §6 ${cnt.bm} раз.`);
  console.log('Проверка пройдена: плитка, строка и карточка героя — с одобренным кристаллом, доблестью, пределом, уровнем и классом; «За души» — рулетка крупно, остальное листами; в режиме «Игрок» служебного нет.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const main = scripts.filter(s => !s.src).map(s => s.code).join('\n');
{
  const iM = scripts.findIndex(s => s.src === 'screens/model.js'), iH = scripts.findIndex(s => s.src === 'screens/heroes.js');
  if (iH < 0) say('index.html: не подключён screens/heroes.js');
  else if (iH < iM) say('index.html: heroes.js подключён раньше model.js');
  if (!/<link rel="stylesheet" href="screens\/heroes\.css">/.test(html)) say('index.html: не подключён screens/heroes.css');
  const js = read('screens/heroes.js'), css = read('screens/heroes.css');
  try { new vm.Script(js, { filename: 'screens/heroes.js' }); } catch (e) { say('screens/heroes.js: синтаксис — ' + e.message); }
  for (const [f, t] of [['screens/heroes.js', js], ['screens/heroes.css', css]]) {
    const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
    if (crlf !== lf) say(`${f}: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}`);
  }
  /* прежнего кода в index.html нет: он переехал в heroes.js или заменён */
  const OLD = [[/function heroes\(\)/, 'экран heroes()'], [/function heroCard\(/, 'прежняя плитка heroCard'], [/function rsCard\(/, 'прежняя плитка rsCard'],
    [/function squadsView\(/, 'прежние отряды squadsView'], [/function rsRouletteCol\(|function rsEchoCol\(|function rsDustCol\(/, 'колонки «За души»'],
    [/const sq = id =>|const sqBM =/, 'прежние sq, sqBM'], [/\n  prep\(o\) \{/, 'прежний лист prep'], [/\n\.hc\{/, 'стили .hc в index.html'],
    [/\n  (?:psq|esq|sqadd|sqnew)\(/, 'прежние действия отрядов'], [/\n  spin\(\) \{/, 'прежняя прокрутка «по очереди»']];
  for (const [re, what] of OLD) if (re.test(main) || (what.startsWith('стили') && re.test(html))) say(`index.html: остался ${what}`);
  const souls = main.match(/function rsSoulsView\(\)[\s\S]*?\n\}/);
  if (!souls || !/rlCol\(\)/.test(souls[0]) || !/hrSoulsSide\(\)/.test(souls[0])) say('index.html: «За души» (rsSoulsView) не собирает вход рулетки rlCol и входы hrSoulsSide');
  if (!/\.hc \.cr\{[^}]*var\(--rico\)/.test(css)) say('heroes.css: у плитки нет кристалла редкости --rico');
  if (!/\.rs-av::after\{[^}]*var\(--rico\)/.test(css)) say('heroes.css: у лица в строке нет кристалла редкости --rico');
  if (/\.hc[^{]*\{[^}]*inset 0 -3px 0/.test(css)) say('heroes.css: у плитки осталась полоска редкости снизу вместо кристалла');
}
if (err.length) done();

/* ================== песочница ================== */
function load() {
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, prepend() {}, remove() {},
      animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, select() {}, clientWidth: 1200, clientHeight: 800 };
    e.querySelector = () => stubEl();
    return e;
  };
  const rootCls = new Set(), root = stubEl('html');
  root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
  const els = {};
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
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
    ACT, OV, SCREENS, FLOWS, KH, RS, RSI, EB, INV, H, SQ, render, initialState, setTeam, rsPool, rsCyc, rsHas, rsFrom, rsWeek, fmt, RAR, ROMAN,
    heroCard, rsCard, heroHead, rsHead, hrV, hrMine, hrOwn, hrDustCat, rsRow, heroDetail, rsSetWeek, sq, HR_DATA,
    BM: typeof BM !== 'undefined' ? BM : null, BM_SRC0: typeof BM_SRC0 !== 'undefined' ? BM_SRC0 : null, bmInit0: typeof bmInit0 === 'function' ? bmInit0 : null,
    BF: window.EN_BIOME_FOES || null, CLAN: window.EN_CLAN || null, EC: window.EnClan || null, AD: window.EN_ARENA || null, ARU: window.EN_ARENA_UI || null, ECHO: window.EN_ECHO || null,
    TB: typeof TB !== 'undefined' ? TB : null, TL_SRV: typeof TL_SRV !== 'undefined' ? TL_SRV : null, tlMul: typeof tlMul === 'function' ? tlMul : null, tlWhy: typeof tlWhy === 'function' ? tlWhy : null,
    EQ_SRV: typeof EQ_SRV !== 'undefined' ? EQ_SRV : null, eqMulOf: typeof eqMulOf === 'function' ? eqMulOf : null, eqWornList: typeof eqWornList === 'function' ? eqWornList : null,
  })`, ctx);
  return { T, els, rootCls, game: () => (els.game ? els.game.innerHTML : '') };
}
const P = load(), T = P.T;
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
/* разметка без исключений, undefined и NaN; в режиме «Игрок» — без служебных слов в тексте и подсказках */
function scan(h, where) {
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!T.KH.team) {
    cnt.player++;
    const v = strip(h), txt = playerText(h).split('\n').concat(tips(v));
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
  }
  return h;
}
function view(where) { cnt.views++; run(where, () => T.render()); return scan(P.game(), where); }
const fresh = () => { T.S = T.initialState(); T.S.overlay = null; };
/* плитки из разметки: <button class="hc…"> … </button> */
const tilesOf = h => [...h.matchAll(/<button class="hc[^"]*"[\s\S]*?<\/button>/g)].map(m => m[0]);
const ovOf = h => { const i = h.indexOf('<div class="ov'); return i < 0 ? '' : h.slice(i); };
const count = (s, re) => (s.match(re) || []).length;
const starsOf = t => { const m = t.match(/<span class="stars[^"]*"[^>]*>([\s\S]*?)<\/span>/); return m ? { all: count(m[1], /<i/g), on: count(m[1], /<i class="on"/g) } : null; };
const limsOf = t => { const m = t.match(/<span class="limits"[^>]*>([\s\S]*?)<\/span>/); return m ? { all: count(m[1], /<i/g), on: count(m[1], /<i class="on"/g) } : null; };

/* ================== 2. плитка ================== */
function checkTile(t, where, x) {
  cnt.tiles++;
  if (!t.includes(`data-r="${x.r}"`)) say(`${where}: у плитки нет редкости data-r="${x.r}"`);
  if (!/<i class="cr" aria-hidden="true"><\/i>/.test(t)) say(`${where}: у плитки нет кристалла редкости`);
  if (/class="el[ "]/.test(t)) say(`${where}: в плитке кристалл стихии — прежняя метка`);
  const st = starsOf(t);
  if (!st || st.all !== x.maxV || st.on !== x.valor) say(`${where}: доблесть на плитке ${st ? st.on + ' из ' + st.all : 'нет'}, ждали ${x.valor} из ${x.maxV}`);
  if (!/icons\/cls-[a-z]+\.png/.test(t)) say(`${where}: у плитки нет значка класса`);
  if (x.own) {
    const L = limsOf(t);
    if (!L || L.all !== 5 || L.on !== x.lim) say(`${where}: рунный предел на плитке ${L ? L.on + ' из ' + L.all : 'нет'}, ждали ${x.lim} из 5`);
    if (!new RegExp(`<small>ур\\.</small><b class="num">${x.lvl}</b>`).test(t)) say(`${where}: на плитке нет уровня ${x.lvl}`);
  } else if (!t.includes(`цикл ${T.ROMAN[x.c]}`)) say(`${where}: у героя вне коллекции нет цикла на плитке`);
}
/* «Мои»: каждый герой аккаунта */
fresh();
T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine';
{
  const h = view('коллекция · мои'), tiles = tilesOf(h);
  if (tiles.length !== T.S.heroes.length) say(`«Мои»: плиток ${tiles.length}, героев ${T.S.heroes.length}`);
  T.S.heroes.forEach((x, i) => { const t = tiles.find(y => y.includes(`data-v="${x.id}"`)); if (!t) say(`«Мои»: нет плитки ${x.name}`); else checkTile(t, `«Мои» · ${x.name}`, { r: x.r, maxV: x.maxV, valor: x.valor, own: true, lim: x.lim, lvl: x.lvl }); });
  if (/<span class="bm"/.test(tiles.join(''))) say('«Мои»: на плитке коллекции боевая мощь — лишнее число');
}
/* «Все герои»: весь состав — по одной отрисовке на фильтр цикла */
for (let c = 1; c <= 6; c++) {
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'all'; T.S.rs.f.cyc = String(c);
  const h = view(`коллекция · все · цикл ${c}`), tiles = tilesOf(h), list = T.RS.heroes.filter(x => x.c === c);
  if (tiles.length !== list.length) say(`«Все» · цикл ${c}: плиток ${tiles.length}, героев ${list.length}`);
  for (const x of list) {
    const t = tiles.find(y => y.includes(`data-v="${x.id}"`)); if (!t) { say(`«Все»: нет плитки ${x.n}`); continue; }
    const v = T.hrV(x);
    checkTile(t, `«Все» · ${x.n}`, { r: v.r, maxV: v.maxV, valor: v.valor, own: v.own, lim: v.lim, lvl: v.lvl, c: x.c });
  }
}
/* строки: у каждой строки героя — редкость на кнопке (кристалл у лица рисует CSS) */
{
  const x = T.RS.heroes.find(h => h.src === 'roulette') || T.RS.heroes[0], row = T.rsRow(x, { act: 'noop' });
  if (!row.includes(`data-r="${x.r}"`) || !row.includes('class="rs-av"')) say('строка героя: нет редкости у кнопки или лица .rs-av');
}

/* ================== 3. шапка карточки ================== */
fresh();
for (const x of T.S.heroes) {
  T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.selHero = x.id;
  for (const tab of ['power', 'skills', 'path']) {
    T.S.seg.hero = tab; const h = view(`карточка · ${x.name} · ${tab}`), i = h.indexOf('<div class="hd-top">'), top = i < 0 ? '' : h.slice(i, h.indexOf('<div class="hd-body">', i));
    if (tab !== 'power') continue;
    cnt.heads++;
    if (!top.includes(`<span class="rar" data-r="${x.r}">`)) say(`шапка · ${x.name}: нет кристалла редкости`);
    if (!/icons\/power\.png/.test(top) || !top.includes(T.fmt(x.bm))) say(`шапка · ${x.name}: нет боевой мощи`);
    if (!top.includes(`<small class="num">${x.valor} / ${x.maxV}</small>`)) say(`шапка · ${x.name}: нет доблести «${x.valor} / ${x.maxV}»`);
    if (!top.includes(`<b class="num">${x.lvl}</b><small class="faint num">/ ${x.cap}</small>`)) say(`шапка · ${x.name}: нет уровня «${x.lvl} / ${x.cap}»`);
    const L = limsOf(top); if (!L || L.all !== 5 || L.on !== x.lim) say(`шапка · ${x.name}: нет пяти отметок предела`);
    if (!/icons\/cls-[a-z]+\.png/.test(top)) say(`шапка · ${x.name}: нет значка класса`);
  }
}
{
  const x = T.RS.heroes.find(h => h.src === 'roulette' && !T.rsHas(h));
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'all'; T.S.rs.sel = x.id;
  const h = view('карточка героя состава'), top = h.slice(h.indexOf('<div class="hd-top">'));
  if (!top.includes(`доблесть до ${x.maxV}`) || !top.includes(`<span class="rar" data-r="${x.r}">`)) say('карточка героя состава: нет потенциала доблести или кристалла редкости');
  cnt.heads++;
}

/* ================== 4. купленный герой — герой аккаунта ================== */
fresh();
{
  const x = T.RS.heroes.find(h => h.src === 'gold' && h.c === 2 && !T.rsHas(h));
  T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'gold';
  run('найм', () => T.ACT.gbuy(x.id)); run('найм · подтверждение', () => T.ACT.gbuydo(x.id));
  if (JSON.stringify(T.S.rs.owned[x.id]) !== JSON.stringify({ lvl: 0, lim: 0, valor: 0, how: 'gold' })) say(`найм: запись коллекции ${JSON.stringify(T.S.rs.owned[x.id])} — ждали 0 ур., 0 РП, 0 Добл`);
  const h = T.H(x.id);
  if (!h) say('найм: H(id) не находит купленного героя');
  else {
    if (h.name !== x.n || !Array.isArray(h.st) || h.st.length !== 5 || !h.gr || !T.EB.RULES.cls[h.cls]) say('купленный герой: не в форме героя аккаунта (имя, характеристики, класс ядра)');
    if (!Number.isInteger(h.bm) || h.bm <= 0) say(`купленный герой: БМ ${h.bm} — не целое положительное`);
    if (h !== T.H(x.id)) say('купленный герой: H(id) каждый раз даёт новый объект');
    if (!T.hrMine().includes(h)) say('купленный герой: его нет в «Моих»');
    T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.selHero = x.id;
    for (const tab of ['power', 'skills', 'path']) { T.S.seg.hero = tab; const g = view(`купленный · ${tab}`); if (tab === 'power' && !g.includes('data-a="limit"')) say('купленный герой: нет лестницы развития'); if (tab === 'path' && !g.includes(T.RSI[x.id].chT[0])) say('купленный герой: во вкладке «Путь» нет его главы'); }
    T.S.seg.hero = 'power';
    const t = tilesOf(view('купленный · плитка')).find(y => y.includes(`data-v="${x.id}"`));
    if (!t) say('купленный герой: нет плитки в «Моих»'); else checkTile(t, 'купленный · плитка', { r: x.r, maxV: x.maxV, valor: 0, own: true, lim: 0, lvl: 0 });
    const sp0 = T.S.wallet.spirit, bm0 = h.bm;
    T.S.qty = 5; run('купленный · уровень', () => T.ACT.lvlup());
    if (T.S.rs.owned[x.id].lvl !== 5 || h.lvl !== 5) say(`купленный герой: уровень не записан в коллекцию — ${T.S.rs.owned[x.id].lvl}`);
    if (!(T.S.wallet.spirit < sp0)) say('купленный герой: уровень поднялся без духа');
    if (!(h.bm >= bm0)) say('купленный герой: БМ упала после уровня');
    const src = T.EB.heroSrc(h); if (!src || src.lvl !== 5 || src.name !== x.n) say('купленный герой: источник боя не из героя аккаунта');
  }
  /* пробуждённый герой Эхо: его набор — из echo-foes.js */
  const e = T.RS.heroes.find(y => y.src === 'echo');
  T.S.rs.owned[e.id] = { lvl: 0, lim: 0, valor: 0, how: 'souls' };
  const he = T.H(e.id), src = he && T.EB.heroSrc(he);
  if (!he || !src || !src.kit || !Array.isArray(src.kit.kit)) say('герой Эхо: нет набора способностей из echo-foes.js');
  if (he && (!he.avers || he.avers.race !== e.avers.race)) say('герой Эхо: нет расовой неприязни');
  T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.selHero = e.id; T.S.seg.hero = 'skills'; view('герой Эхо · навыки');
}

/* ================== 4б. боевая мощь — одна функция §6 на все экраны ================== */
{
  const B = T.BM, fl = (a, b) => Math.floor(a / b), BP = 10000;
  const isqrt = n => { if (n < 2) return n; let x = n, y = fl(x + 1, 2); while (y < x) { x = y; y = fl(x + fl(n, x), 2); } return x; };
  const C = T.BF && T.BF.rules ? T.BF.rules.bmC : 0;
  /* независимый пересчёт слоя 0 по карте ядра: C × √(УВС × ЭЗ), смягчение — эталон своего уровня, уклонение — в ЭЗ */
  const f0 = u => { cnt.bm++; const R = T.EB.RULES, kl = R.K * u.lvl, cap = R.caps.defPct * 100, mit = k => Math.min(cap, fl(u.def[k] * BP, Math.max(1, kl + u.def[k]))), m = fl(mit('str') + mit('int'), 2);
    return fl(C * isqrt(fl(u.atk[u.main] * u.as * (1000000 + u.crit * (u.critDmg - 100)), 100000000) * fl(fl(u.maxHp * BP, BP - m) * BP, BP - u.eva)), 100); };
  const heroU = src => T.EB.create({ mode: 'rounds', heroes: [src], foes: [], seed: 1 }).u[0][0];
  const foeU = src => T.EB.create({ mode: 'rounds', heroes: [], foes: [src], seed: 1 }).u[1][0];
  const num = n => `<span class="num">${T.fmt(n)}</span>`;
  if (!B || !T.BM_SRC0) say('БМ: нет общей функции BM (index.html)');
  else run('БМ · одна функция', () => {
    fresh();
    /* 1. число не хранится: в initialState у героев нет bm — только свойство для чтения, оно же BM.hero и формула §6 */
    const raw = T.bmInit0 ? T.bmInit0() : null;
    if (!raw || raw.heroes.some(h => Object.prototype.hasOwnProperty.call(h, 'bm'))) say('БМ: в initialState у героев лежит число bm — его надо считать');
    for (const h of T.S.heroes) {
      const d = Object.getOwnPropertyDescriptor(h, 'bm'), want = f0(heroU(T.BM_SRC0(h)));
      if (!d || !d.get || 'value' in d) say(`БМ · ${h.name}: bm — не свойство только для чтения`);
      if (h.bm !== want || B.hero(h) !== want) say(`БМ · ${h.name}: ${h.bm}, по формуле §6 — ${want}`);
    }
    if (!C || C !== T.HR_DATA.bmC || (T.CLAN && C !== T.CLAN.boss.bmC)) say('БМ: косметическая C у героев, бестиария и клана — разная');
    /* 2. одно число везде: «Пятёрка сильнейших» — из всех героев аккаунта, плитки и сумма; библиотека отрядов; лист выбора отряда */
    T.S.route = 'profile'; T.S.seg.profile = 'over';
    const top = T.hrMine().slice().sort((a, b) => B.hero(b) - B.hero(a)).slice(0, 5), pf = view('Странник · пятёрка сильнейших');
    if (!pf.includes(num(B.squad(top.map(h => h.id))))) say('«Пятёрка сильнейших»: сумма — не BM.squad');
    for (const h of top) { const t = tilesOf(pf).find(y => y.includes(`data-v="${h.id}"`)); if (!t || !t.includes(num(B.hero(h)))) say(`«Пятёрка сильнейших» · ${h.name}: на плитке не BM.hero`); }
    T.S.route = 'heroes'; T.S.seg.heroes = 'squads';
    for (const s of T.S.squads) {
      T.S.selSquad = s.id; const g = view(`отряды · ${s.name}`), sum = s.m.filter(Boolean).reduce((a, id) => a + B.hero(T.H(id)), 0);
      if (B.squad(s.m) !== sum || !g.includes(num(sum))) say(`отряды · ${s.name}: мощь отряда ${B.squad(s.m)}, сумма героев ${sum}`);
    }
    T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.overlay = { t: 'prep', arg: 'echo' };
    { const g = view('лист отряда · Эхо'), r = T.SQ.ready('echo'); if (!g.includes(num(B.squad(r.go)))) say('лист выбора отряда: мощь — не BM.squad'); }
    T.S.overlay = null;
    /* 3. рост по формуле: уровень поднимает мощь; доблесть сбрасывает уровень — мощь та, что на нулевом уровне */
    { const h = T.H('h2'), b0 = h.bm; h.lvl += 10; const w = f0(heroU(T.BM_SRC0(h))); if (!(h.bm > b0) || h.bm !== w) say(`БМ: после уровня ${h.bm}, по формуле ${w}`); }
    /* 4. слои §6: талисман и снаряжение на одном герое — ⌊⌊база × талисманы⌋ × снаряжение⌋, база — без вещей */
    if (T.TB && T.TL_SRV && T.EQ_SRV && T.tlMul && T.eqMulOf) {
      fresh(); const h = T.H('h1');
      /* талисман, который подходит танку и входит в БМ: надеть, проверить множитель, не тот — снять */
      let no = null;
      for (const x of T.TB.list()) {
        if (T.tlWhy(h, x.no, 0) || !T.TL_SRV.put('tl' + T.S.tal.seq, 'h1', 0, x.no).ok) continue;
        if (T.tlMul('h1') !== BP) { no = x.no; break; }
        T.TL_SRV.out('tl' + T.S.tal.seq, 'h1', 0);
      }
      const it = Object.values(T.S.eq.items).find(x => !x.on);
      const r = it ? T.EQ_SRV.put('eq' + T.S.eq.seq, 'h1', it.uid) : null;
      if (!no || !r || !r.ok) say('БМ · слои: не удалось надеть талисман и снаряжение');
      else {
        const P = B.parts(h), base = f0(heroU(T.BM_SRC0(h))), tm = T.tlMul('h1'), em = T.eqMulOf(h, T.eqWornList('h1')), want = fl(fl(base * tm, BP) * em, BP);
        if (P.base !== base || P.mul.tal !== tm || P.mul.eq !== em || h.bm !== want) say(`БМ · слои: ${h.bm} (база ${P.base} × ${P.mul.tal} × ${P.mul.eq}), ждали ${want} (${base} × ${tm} × ${em})`);
        T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.selHero = 'h1'; T.S.seg.hero = 'power';
        const g = view('карточка · со слоями'), i = g.indexOf('<div class="hd-top">'), topH = i < 0 ? '' : g.slice(i, g.indexOf('<div class="hd-body">', i));
        if (!topH.includes(T.fmt(want))) say('шапка карточки: мощь со слоями — не BM.hero');
      }
    }
    /* 5. режимы: соперник Арены — та же функция без вещей аккаунта; цель Эхо — формула по карте ядра; цель клана — та же формула,
       что у калькулятора клана */
    fresh();
    if (T.AD && T.ARU) {
      const o = T.AD.pool.arena.find(x => x.id === T.S.arena.opp[0]) || T.AD.pool.arena[0], hs = o.f.map(T.ARU.oppHero);
      for (const h of hs) if (h.bm !== B.hero(h) || h.bm !== f0(heroU(T.BM_SRC0(h)))) say(`Арена · ${h.name}: мощь соперника ${h.bm}, по формуле ${f0(heroU(T.BM_SRC0(h)))}`);
      if (T.ARU.oppBm(o) !== hs.reduce((a, h) => a + B.hero(h), 0)) say('Арена: мощь состава соперника — не сумма BM.hero');
    }
    if (T.ECHO) for (let st = 1; st <= T.ECHO.steps.length; st++) {
      const x = T.ECHO.target('step', st), F = T.ECHO.fight(x, T.sq(T.S.echoSquad).m.filter(Boolean), 1), w = f0(foeU(F.o.main));
      if (x.bm !== w || x.bm !== B.unit(foeU(F.o.main))) say(`Эхо · ступень ${st}: мощь цели ${x.bm}, по формуле карты ${w}`);
    }
    if (T.CLAN && T.EC && T.S.clan && T.S.clan.boss) {
      T.SQ.set('clan', T.S.squads[0].id); T.S.route = 'clan'; T.S.seg.clan = 'boss';
      const g = view('клан · босс');
      for (const x of T.S.clan.boss.targets) {
        const src = T.EC.card(T.CLAN, { g: x.g, uid: x.uid, cls: x.cls, el: x.el, race: x.race, k: x.k }), w = f0(foeU(src));
        if (B.unit(foeU(src)) !== w || T.EC.cardBm(T.CLAN, src) !== w) say(`клан · ${x.uid}: мощь цели ${B.unit(foeU(src))}, у калькулятора клана ${T.EC.cardBm(T.CLAN, src)}, по формуле ${w}`);
        if (!x.dead && !x.burned && !g.includes(num(w))) say(`клан · ${x.uid}: на карточке цели не BM.unit`);
      }
      if (!g.includes(num(B.squad(T.SQ.squad('clan').m)))) say('клан · босс: не видно мощи отряда атаки');
    }
  });
  fresh();
}

/* ================== 5. «Призыв» ================== */
function souls(c, team) {
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.rs.cyc = c;
  const tag = `«За души» · цикл ${c}${team ? ' [команда]' : ''}`, h = view(tag), pool = T.rsPool(), open = c >= T.rsFrom('roulette');
  const body = h.slice(h.indexOf('<div class="hr-souls">'));
  if (!body.includes('class="pnl rl-entry"')) say(`${tag}: нет входа рулетки`);
  if (open && count(body, /class="rl-ef"/g) !== pool.length) say(`${tag}: лиц пула ${count(body, /class="rl-ef"/g)}, героев пула ${pool.length}`);
  if (open && pool.length && !body.includes('data-a="dlg" data-v="rl"')) say(`${tag}: нет «К рулетке»`);
  for (const k of ['hrecho', 'hrdust']) if (!body.includes(`data-a="sheet" data-v="${k}"`)) say(`${tag}: нет входа ${k}`);
  if (/class="rs-row|rs-col/.test(body)) say(`${tag}: во вкладке остались списки — им место в листах`);
  /* воздух: во вкладке одна главная вещь; строк текста и кнопок — немного */
  const lines = playerText(body).split('\n').length, btns = count(body, /<button/g);
  if (lines > 24) say(`${tag}: строк текста ${lines} — тесно`);
  if (btns > pool.length + 6) say(`${tag}: кнопок ${btns} — тесно`);
  for (const k of ['hrecho', 'hrdust']) { T.S.overlay = { t: k }; const o = ovOf(view(`${tag} · лист ${k}`)); if (!o.includes('class="sheet')) say(`${tag}: лист ${k} не открылся`); }
  T.S.overlay = null;
  cnt.cycles++;
}
for (const team of [false, true]) { run('режим', () => T.setTeam(team)); for (let c = 1; c <= 6; c++) souls(c, team); }
run('режим «Игрок»', () => T.setTeam(false));
/* каталог праха: осколок за прах и пробуждение из листа */
{
  fresh(); T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls';
  const x = T.hrDustCat()[0], need = T.RS.rules.stub.shards;
  T.S.overlay = { t: 'hrdust' }; run('прах · выбор', () => T.ACT.ssel(x.id));
  let o = ovOf(view('прах · выбран'));
  if (!o.includes(`data-a="dustbuy" data-v="${x.id}"`) || !o.includes(`data-a="activate" data-v="${x.id}"`)) say('каталог праха: в листе нет «Осколок» и «Пробудить» выбранного героя');
  const d0 = T.S.wallet.dust; T.S.wallet.dust = 1e6;
  run('прах · осколок', () => T.ACT.dustbuy(x.id));
  if ((T.S.rs.shards[x.id] || 0) !== 1 || !T.S.overlay || T.S.overlay.t !== 'hrdust') say('каталог праха: осколок не куплен или лист закрылся');
  T.S.rs.shards[x.id] = need; T.S.wallet.souls = 1e6;
  run('прах · пробудить', () => T.ACT.activate(x.id)); run('прах · подтверждение', () => T.ACT.activatedo(x.id));
  if (!T.rsHas(x) || !T.H(x.id)) say('каталог праха: пробуждённый герой не пришёл в коллекцию');
  T.S.wallet.dust = d0;
}
/* «За Энериум»: пятеро в списке, сет-бонус — входом и листом */
{
  fresh(); T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'donat';
  const h = view('«За Энериум»'), m = h.match(/data-a="sheet" data-v="hrset:([^"]+)"/);
  if (!m) say('«За Энериум»: нет входа сет-бонуса');
  if (/class="kh-set/.test(h)) say('«За Энериум»: сет-бонус со ступенями — в списке, а не в листе');
  if (m) { T.S.overlay = { t: 'hrset', arg: m[1] }; const o = ovOf(view('лист сета')); if (!o.includes('class="kh-set')) say('лист сета: нет состава и бонуса'); }
  for (const t of ['gold', 'donat']) for (let c = 1; c <= 6; c++) { fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = t; T.S.rs.cyc = c; view(`«Призыв» · ${t} · цикл ${c}`); }
}
/* лист «Подробнее» героя состава — с новой шапкой */
for (const x of [T.RS.heroes[0], T.RS.heroes.find(h => h.src === 'donat'), T.RS.heroes.find(h => h.src === 'echo')]) { fresh(); T.S.route = 'heroes'; T.S.overlay = { t: 'rhero', arg: x.id }; const o = ovOf(view(`лист героя · ${x.n}`)); if (!o.includes('class="hd-top"')) say(`лист героя ${x.n}: нет шапки`); }

/* ================== 6. режим «Команда»: коллекция и карточки рисуются ================== */
run('режим «Команда»', () => T.setTeam(true));
fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'all'; view('коллекция · все [команда]');
T.S.hview = 'mine'; view('коллекция · мои [команда]');
run('режим «Игрок»', () => T.setTeam(false));
done();
