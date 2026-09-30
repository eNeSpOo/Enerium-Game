/* Автопроверка экрана «Герои» (design/ui/screens/heroes.js): коллекция карточками 9 : 16, большая карточка героя, «Призыв» — без браузера.
   1. index.html подключает heroes.css и heroes.js после model.js; heroes.js компилируется и в CRLF. Прежнего кода нет: плитки с кристаллом
      стихии, экрана heroes(), колонок «За души», прежних sq, sqBM и листа prep в index.html; «Мои» плитками рядом с карточкой, списка
      найма за золото, листа отряда недели строками (hrMineView, rsCollView, rsDetail, rsGoldCard, hrShardRow) в heroes.js.
   2. Карточка 9 : 16 (hcCard) — слова автора 30.09.2026: «сетка со всеми героями, которых игрок уже купил… по форме условно 9 на 16».
      Одна анатомия: портрет во всю карточку (у героя без портрета — силуэт класса, не инициалы), гребень — кристалл редкости, доблесть
      дугой (звёзд — личный максимум, горят взятые), уровень и стихия в кружках, рунные камни двумя столбами (у героя аккаунта), класс
      значком и мощь (BM.hero) внизу. Ступень вида (data-t) — по редкости и доблести из HC_VIEW.tier; искры — только у высшей ступени;
      «максимум» — только у пройденного пути.
   2а. Коллекция — купленные герои: все 16 героев аккаунта демо, по мощи сильнейшие сверху; порядок «по редкости», «по уровню»,
      «по доблести»; фильтр значками (класс, стихия, редкость, цикл) сходится с независимым отбором, счётчик «N из M», сброс; лист фильтра.
   2б. Каталог: все герои состава; купленный — в цвете с уровнем; несобранный — чёрно-белый; у сборных (рулетка, Эхо) — полоса осколков
      «собрано / нужно» со стеклом осколка; закрытый цикл — замок; фильтр «Откуда».
   2в. Рунные пределы (слово автора 29.09.2026 — «по бокам» героя): на карточке, плитке отрядов и портрете большой карточки следующий камень
      на потолке уровня тлеет, с рунами — пульсирует; у чужого героя — только горящие и погасшие. Вёрстка плитки отрядов — расчётом.
   3. Большая карточка героя аккаунта — нажатие на арт: слева портрет в раме ступени (нажатие — крупно, OV.hczoom, закрытие возвращает
      прежнее окно), рунные камни у портрета с подписью предела; справа — имя, класс, стихия, раса, редкость, мощь, доблесть «текущая /
      максимальная», уровень «N / потолок»; вкладки «Развитие», «Снаряжение», «Навыки», «Путь» без прежней шапки; «Назад» — к сетке,
      ‹ › — соседний герой той же сетки.
   3а. Карточка героя состава «до покупки» (каталог, окно поверх любого экрана): «Герой» — история и с чем приходит, «Навыки» — что откроет
      каждая доблесть, «Путь» — главы и орден; ни развития, ни снаряжения; одно действие — как получить; поверх лавки праха и витрины
      отряда недели «Назад» возвращает в них.
   4. Купленный герой состава — герой аккаунта: запись коллекции — 0 ур., 0 РП, 0 Добл; H(id) находит его; карточка в «Моих» и большая
      карточка на всех вкладках; уровень поднимается за дух и пишется в запись коллекции; БМ — целое по §6. У героя Эхо — набор из echo-foes.js.
   4б. Боевая мощь — одна функция BM (index.html, §6): независимый пересчёт C × √(УВС × ЭЗ) по карте ядра у героев, после уровня и со слоями
      талисманов и снаряжения; одно число на карточке коллекции, в большой карточке, «Пятёрке сильнейших», библиотеке отрядов и листе
      выбора отряда; соперник Арены, цель Эхо и цель клана — та же формула.
   5. «Призыв → За золото» — та же сетка: герои каталога цикла карточками, цена следующего найма — одной строкой; нажатие — большая
      карточка «до покупки»: портрет, редкость, класс, стихия, доблесть до 1, навыки по доблести, история, цена и «Купить», без
      снаряжения, талисманов и прокачки. Покупка — ACT.gbuy и подтверждение: списано ровно цена, герой — 0 ур., 0 РП, 0 Добл, карточка —
      «в коллекции» и «К развитию»; нехватка — кнопка неактивна и сколько; будущий цикл — витрина без покупки.
   5а. «За души»: сцена алтаря — вход рулетки, вход отряда Эхо недели с осколками, лавка праха окном; строк-списков во вкладке нет.
   5б. Витрина отряда недели (слова автора 30.09.2026: «с отрядом недели тоже нужно сделать красивое окно») — окно, не лист: цивилизация
      и нашествие, неприязнь, пятеро крупными карточками — несобранный чёрно-белый с полосой осколков, собранный комплект и пробуждённый —
      в цвете, будущий цикл — замок; откуда осколки; «Пробудить» у собранного — подтверждение в том же окне, операция с номером, окно
      пробуждения с возвратом в витрину.
   5в. Лавка праха и её операции SOUL_SRV, дыра праха закрыта (героев Эхо прахом не собрать), осколок героя — стекло с лицом, «За Энериум» —
      витрина сета и покупка DN_SRV: как прежде.
   5г. Лицо в стекле осколка: портрет героя или силуэт класса; маски-картинки нет (у страницы с диска она не грузится и прячет лицо).
   5д. Сила коллекции (§10.3, ADR-0031, п. 18) — одна функция collRp: кнопка в строке над сеткой, лист и Событие показывают одно число.
   6. Режим «Игрок»: на всех видах нет служебных слов (SERVICE из check_player_view.js), нет undefined и NaN; режим «Команда» рисуется.
   7. Вёрстка — расчётом на 932 × 430 и 844 × 390: сетка (карточка не уже HC_VIEW.card, видно больше строки), знаки у вершины и имя не
      налезают на камни, большая карточка (портрет, правая колонка), витрина отряда недели (пять карточек в ряд).
   8. UI-кит, раздел «Карточка героя»: три ступени на одном герое, состояния в каталоге, большая карточка, витрина; карта экранов —
      коллекция, карточка, воспоминания, орден, сила коллекции, витрина до покупки — готовы.
   Запуск: node tools/content-gen/screens/check_heroes.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, cards: 0, tiles: 0, bigs: 0, cycles: 0, bm: 0, lay: [] };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`«Герои»: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; карточек 9 : 16 — ${cnt.cards}, плиток отрядов ${cnt.tiles}, больших карточек ${cnt.bigs}, циклов «Призыва» ${cnt.cycles}; мощь сверена с формулой §6 ${cnt.bm} раз.`);
  for (const x of cnt.lay) console.log('вёрстка ' + x);
  console.log('Проверка пройдена: коллекция — купленные герои карточками 9 : 16 с редкостью, доблестью, рунными камнями, классом, стихией, уровнем и мощью, ступень вида — по редкости и доблести; порядок и фильтр; каталог — несобранные чёрно-белые с полосой осколков; большая карточка — портрет крупно и вкладки развития; «до покупки» — без прокачки и снаряжения; «За золото» — та же сетка и «Купить»; отряд недели — витрина; лицо в стекле осколка — без маски-картинки; в режиме «Игрок» служебного нет.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const main = scripts.filter(s => !s.src).map(s => s.code).join('\n');
const JS = read('screens/heroes.js'), CSS = read('screens/heroes.css');
{
  const iM = scripts.findIndex(s => s.src === 'screens/model.js'), iH = scripts.findIndex(s => s.src === 'screens/heroes.js');
  if (iH < 0) say('index.html: не подключён screens/heroes.js');
  else if (iH < iM) say('index.html: heroes.js подключён раньше model.js');
  if (!/<link rel="stylesheet" href="screens\/heroes\.css">/.test(html)) say('index.html: не подключён screens/heroes.css');
  try { new vm.Script(JS, { filename: 'screens/heroes.js' }); } catch (e) { say('screens/heroes.js: синтаксис — ' + e.message); }
  for (const [f, t] of [['screens/heroes.js', JS], ['screens/heroes.css', CSS]]) {
    const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
    if (crlf !== lf) say(`${f}: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}`);
  }
  /* прежнего кода в index.html нет: он переехал в heroes.js или заменён */
  const OLD = [[/function heroes\(\)/, 'экран heroes()'], [/function heroCard\(/, 'прежняя плитка heroCard'], [/function rsCard\(/, 'прежняя плитка rsCard'],
    [/function squadsView\(/, 'прежние отряды squadsView'], [/function rsRouletteCol\(|function rsEchoCol\(|function rsDustCol\(/, 'колонки «За души»'],
    [/const sq = id =>|const sqBM =/, 'прежние sq, sqBM'], [/\n  prep\(o\) \{/, 'прежний лист prep'], [/\n\.hc\{/, 'стили .hc в index.html'],
    [/\n  (?:psq|esq|sqadd|sqnew)\(/, 'прежние действия отрядов'], [/\n  spin\(\) \{/, 'прежняя прокрутка «по очереди»'],
    [/\n  (?:dustbuy|activate|activatedo)\(v\) \{/, 'прежние осколок за прах и пробуждение без номера операции']];
  for (const [re, what] of OLD) if (re.test(main) || (what.startsWith('стили') && re.test(html))) say(`index.html: остался ${what}`);
  /* прежней коллекции в heroes.js нет: «Мои» плитками рядом с карточкой, «Все герои» списком, лист отряда недели строками */
  for (const [re, what] of [[/function hrMineView\(/, '«Мои» плитками рядом с карточкой (hrMineView)'], [/function rsCollView\(/, '«Все герои» плитками (rsCollView)'],
    [/function rsDetail\(/, 'карточка героя состава рядом с сеткой (rsDetail)'], [/function rsGoldCard\(/, 'найм за золото списком и карточкой (rsGoldCard)'],
    [/function hrShardRow\(/, 'лист отряда недели строками (hrShardRow)']]) if (re.test(JS)) say(`heroes.js: остался прежний код — ${what}`);
  const souls = main.match(/function rsSoulsView\(\)[\s\S]*?\n\}/);
  if (!souls || !/hrSoulsView\(\)/.test(souls[0])) say('index.html: «За души» (rsSoulsView) не собирает сцену алтаря hrSoulsView');
  if (!/function hrSoulsView\(\)[\s\S]*?rlCol\(\)[\s\S]*?hrSoulsSide\(\)/.test(JS)) say('heroes.js: сцена алтаря hrSoulsView не собирает вход рулетки rlCol и входы hrSoulsSide');
  if (!/\.hc \.cr\{[^}]*var\(--rico\)/.test(CSS)) say('heroes.css: у плитки отрядов нет кристалла редкости --rico');
  if (!/\.rs-av::after\{[^}]*var\(--rico\)/.test(CSS)) say('heroes.css: у лица в строке нет кристалла редкости --rico');
  if (!/\.hk-cr\{[^}]*var\(--rico\)/.test(CSS)) say('heroes.css: у карточки 9 : 16 нет кристалла редкости --rico');
  if (!/\.hk\{[^}]*aspect-ratio:9\/16/.test(CSS)) say('heroes.css: карточка коллекции — не 9 : 16');
  /* большая карточка берёт вкладки героя из heroDetail без шапки — одна правда вкладок */
  if (!/function heroDetail\(h, o = \{\}\)[\s\S]*?\n\}/.test(main) || !/o\.head === false \? '' : heroHead\(h\)/.test((main.match(/function heroDetail\(h, o = \{\}\)[\s\S]*?\n\}/) || [''])[0])) say('index.html: heroDetail не умеет без шапки (o.head === false) — большой карточке нечего взять');
  if (!/heroDetail\(h, \{ head: false/.test(JS)) say('heroes.js: большая карточка не берёт вкладки героя из heroDetail');
  /* анимации карточки — только transform и opacity, при «меньше движения» частицы стоят */
  for (const [, n, b] of CSS.matchAll(/@keyframes\s+(hk-[\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
    const bad = [...b.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]).filter(p => !['transform', 'opacity'].includes(p));
    if (bad.length) say(`heroes.css: @keyframes ${n} меняет ${[...new Set(bad)].join(', ')} — только transform и opacity`);
  }
  if (!/@media \(prefers-reduced-motion:reduce\)\{[^\n]*\.hk-fx i\{animation:none/.test(CSS)) say('heroes.css: при «меньше движения» искры карточки не стоят');
  for (const t of ['2', '3']) if (!new RegExp(`\\[data-t="${t}"\\]`).test(CSS)) say(`heroes.css: нет вида ступени ${t}`);
  if (!/\.hk-fr\.art,\.hk-orn\.art,\.hk-crest\.art\{display:none\}/.test(CSS)) say('heroes.css: рамка картинкой не прячет CSS-рамку ступени — вид не сменить после выбора стиля');
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
    ACT, OV, SCREENS, FLOWS, KH, RS, RSI, EB, INV, H, SQ, MAP, render, initialState, setTeam, rsPool, rsCyc, rsHas, rsFrom, rsWeek, rsGold, rsBought, fmt, RAR, ROMAN,
    heroCard, rsCard, heroHead, rsHead, hrV, hrMine, hrOwn, hrDustCat, rsRow, heroDetail, rsSetWeek, sq, HR_DATA,
    hrTile, hrHead, BAG, RP_VIEW: typeof RP_VIEW !== 'undefined' ? RP_VIEW : null, heroDev: typeof heroDev === 'function' ? heroDev : null, rpNext: typeof rpNext === 'function' ? rpNext : null,
    HC_VIEW, HC_SORT, HC_ART, hcCard, hcBig, hcTier, hcMax, hcNum, hcView, hcOwnList, hcCatList, hcKitHtml, heroKit, hrDraft,
    rsDustable, rsDustOf, rsTiers, dnSets, dnSet, DN_SRV, DN_ART, zpCardHero: typeof zpCardHero === 'function' ? zpCardHero : null,
    ART_ICONS: typeof ART_ICONS !== 'undefined' ? ART_ICONS : null, shardGhost: typeof shardGhost === 'function' ? shardGhost : null,
    DU_ART: typeof DU_ART !== 'undefined' ? DU_ART : null, DU_VIEW: typeof DU_VIEW !== 'undefined' ? DU_VIEW : null, SOUL_SRV: typeof SOUL_SRV !== 'undefined' ? SOUL_SRV : null,
    RS_ART: typeof RS_ART !== 'undefined' ? RS_ART : null, rsShardPrice, duCat: typeof duCat === 'function' ? duCat : null, hrSoulsView: typeof hrSoulsView === 'function' ? hrSoulsView : null, KIT_EXTRA,
    BM: typeof BM !== 'undefined' ? BM : null, BM_SRC0: typeof BM_SRC0 !== 'undefined' ? BM_SRC0 : null, bmInit0: typeof bmInit0 === 'function' ? bmInit0 : null,
    BF: window.EN_BIOME_FOES || null, CLAN: window.EN_CLAN || null, EC: window.EnClan || null, AD: window.EN_ARENA || null, ARU: window.EN_ARENA_UI || null, ECHO: window.EN_ECHO || null,
    TB: typeof TB !== 'undefined' ? TB : null, TL_SRV: typeof TL_SRV !== 'undefined' ? TL_SRV : null, tlMul: typeof tlMul === 'function' ? tlMul : null, tlWhy: typeof tlWhy === 'function' ? tlWhy : null,
    EQ_SRV: typeof EQ_SRV !== 'undefined' ? EQ_SRV : null, eqMulOf: typeof eqMulOf === 'function' ? eqMulOf : null, eqWornList: typeof eqWornList === 'function' ? eqWornList : null,
    collRp, collHero, collPct, collRule, EV: window.EN_EV || null,
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
const tilesOf = h => [...h.matchAll(/<button class="hc[ "][\s\S]*?<\/button>/g)].map(m => m[0]);
const cardsOf = h => [...h.matchAll(/<button class="hk[ "][\s\S]*?<\/button>/g)].map(m => m[0]);
const cardOf = (h, id) => cardsOf(h).find(c => c.includes(`data-v="${id}"`)) || '';
const ovOf = h => { const i = h.indexOf('<div class="ov'); return i < 0 ? '' : h.slice(i); };
const count = (s, re) => (s.match(re) || []).length;
const TOP = () => T.INV.hero.capByLim.length - 1;
const nxOf = h => (h && T.rpNext ? T.rpNext(h) : '');
const need = () => T.RS.rules.stub.shards;
/* рунные пределы — два столба камней (знак — screens/hero-dev.js): kind t — карточка и плитка, h — портрет большой карточки и шапка;
   side l и r; st — состояния камней I…V: on, off, wait, ready */
const postsOf = (t, kind) => [...t.matchAll(/<span class="rp (t|h) (l|r)" aria-hidden="true">([\s\S]*?)<\/span>/g)].filter(m => !kind || m[1] === kind)
  .map(m => ({ kind: m[1], side: m[2], st: [...m[3].matchAll(/<i class="rp-s (on|off|wait|ready)(?: p)?"><\/i>/g)].map(x => x[1]), n: count(m[3], /<i /g) }));
function checkPosts(t, where, kind, lim, nx) {
  const Q = postsOf(t, kind);
  if (Q.length !== 2 || Q[0].side !== 'l' || Q[1].side !== 'r') { say(`${where}: столбов рунных камней ${Q.length} — ждали два, слева и справа`); return; }
  const all = Array.from({ length: TOP() }, (_, k) => k < lim ? 'on' : k === lim && nx ? nx : 'off');
  if (!T.RP_VIEW) { say(`${where}: нет RP_VIEW — как камни делятся между столбами`); return; }
  const m = Math.min(T.RP_VIEW.split, TOP()), want = { l: all.slice(0, m).join(' '), r: all.slice(m).join(' ') };
  for (const p of Q) if (p.st.join(' ') !== want[p.side]) say(`${where}: столб ${p.side === 'l' ? 'слева' : 'справа'} — «${p.st.join(' ')}», ждали «${want[p.side]}»`);
  if (/class="limits"/.test(t)) say(`${where}: остались прежние отметки .limits`);
}
/* ступень вида — независимо: по редкости и прибавка за доблести из HC_VIEW.tier, не выше top */
const tierOf = (r, valor) => { const Tt = T.HC_VIEW.tier; return Math.min(Tt.top, Tt.r[Math.max(1, Math.min(Tt.r.length, r)) - 1] + Tt.valor[Math.max(0, Math.min(Tt.valor.length - 1, valor))]); };
const arcY = (i, m) => { const d = 2 * i - (m - 1); return Math.floor(d * d * T.HC_VIEW.arc / 4); };
const shortBM = n => { if (n < T.HC_VIEW.short) return T.fmt(n); const [d, s] = n >= 1000000 ? [100000, 'М'] : [100, 'К'], k = Math.floor(n / d); return `${T.fmt(Math.floor(k / 10))}${k % 10 ? ',' + (k % 10) : ''}${s}`; };

/* ================== 2. карточка 9 : 16 — одна анатомия ================== */
/* x: r, valor, maxV, own, lim, lvl, cap, bm, nx, el, gray, shard [n, need], lock, c, img (id портрета) или sil */
function checkCard(t, where, x) {
  cnt.cards++;
  if (!t) { say(`${where}: нет карточки`); return; }
  const tier = tierOf(x.r, x.valor);
  if (!t.includes(`data-r="${x.r}"`)) say(`${where}: у карточки нет редкости data-r="${x.r}"`);
  if (!t.includes(`data-t="${tier}"`)) say(`${where}: ступень вида не ${tier} (редкость ${x.r}, доблесть ${x.valor})`);
  if (!/<i class="hk-cr" aria-hidden="true"><\/i>/.test(t)) say(`${where}: нет гребня — кристалла редкости`);
  const st = t.match(/<span class="hk-st"[^>]*>([\s\S]*?)<\/span>/);
  if (x.maxV > 0) {
    const all = st ? [...st[1].matchAll(/<i class="(on|)" style="--y:(\d+)px"><\/i>/g)] : [];
    if (all.length !== x.maxV || all.filter(m => m[1] === 'on').length !== x.valor) say(`${where}: доблесть ${all.filter(m => m[1] === 'on').length} из ${all.length}, ждали ${x.valor} из ${x.maxV}`);
    else if (all.some((m, i) => +m[2] !== arcY(i, x.maxV))) say(`${where}: звёзды доблести не дугой (--y по HC_VIEW.arc)`);
  } else if (st) say(`${where}: звёзды доблести у героя без доблести`);
  if (!/icons\/cls-[a-z]+\.png/.test(t)) say(`${where}: нет значка класса`);
  if (x.el && !t.includes(`<span class="hk-el"><span class="el bare" data-el="${x.el}"`)) say(`${where}: нет стихии «${x.el}» значком`);
  if (/class="rs-ph"|class="hsg-init"/.test(t) || />\s*[А-ЯЁA-Z]{2}\s*</.test(t.replace(/<b class="hk-nm">[^<]*<\/b>/, ''))) say(`${where}: инициалы вместо портрета`);
  if (x.img && !t.includes(`heroes/${x.img}.jpg`)) say(`${where}: портрет — не рисунок героя ${x.img}`);
  if (x.sil && !/class="hk-sil"/.test(t)) say(`${where}: у героя без портрета нет силуэта класса`);
  const own = x.own && !x.gray;
  if (own) {
    checkPosts(t, where, 't', x.lim, x.nx || '');
    if (!new RegExp(`<span class="hk-lv" title="Уровень ${x.lvl} из ${x.cap}"><b class="num">${x.lvl}</b></span>`).test(t)) say(`${where}: нет уровня ${x.lvl} в кружке`);
    if (x.bm != null && !t.includes(`<b class="num">${shortBM(x.bm)}</b>`)) say(`${where}: мощь на карточке не ${shortBM(x.bm)} (BM.hero ${x.bm})`);
    const mx = x.maxV > 0 && x.valor >= x.maxV && x.lim >= TOP() && x.lvl >= x.cap;
    if (mx !== /class="hk-max"/.test(t)) say(`${where}: лента «максимум» ${mx ? 'не стоит у пройденного пути' : 'стоит раньше времени'}`);
  } else {
    if (postsOf(t).length) say(`${where}: у героя вне коллекции — рунные камни, а пределов у него нет`);
    if (/class="hk-lv"/.test(t)) say(`${where}: у героя вне коллекции — уровень`);
    if (/class="hk-bm"/.test(t)) say(`${where}: у героя вне коллекции — мощь`);
  }
  if (x.gray && !/^<button class="hk[^"]* gray/.test(t)) say(`${where}: несобранный — не чёрно-белый`);
  if (!x.gray && /^<button class="hk[^"]* gray/.test(t)) say(`${where}: собранный или купленный — чёрно-белый`);
  if (x.lock && (!/^<button class="hk[^"]* lock/.test(t) || !/class="hk-lk"/.test(t))) say(`${where}: закрытый цикл — без замка`);
  if (x.shard) {
    const m = t.match(/<span class="hk-sh( full)?" title="Осколки (\d+) из (\d+)">([\s\S]*?)<\/small><\/span>/);
    if (!m || +m[2] !== x.shard[0] || +m[3] !== x.shard[1]) say(`${where}: полоса осколков не ${x.shard[0]} из ${x.shard[1]}`);
    else { if (!m[4].includes('class="hsg"')) say(`${where}: в полосе осколков нет стекла с лицом`); if (!!m[1] !== x.shard[0] >= x.shard[1]) say(`${where}: полный комплект не светится`); }
  } else if (/class="hk-sh/.test(t)) say(`${where}: полоса осколков у героя без осколков`);
  const fx = /class="hk-fx"/.test(t), wantFx = tier >= T.HC_VIEW.tier.top && !x.gray && !x.lock;
  if (fx !== wantFx) say(`${where}: искры у вершины ${wantFx ? 'нет у высшей ступени' : 'есть не у высшей ступени или у несобранного'}`);
}
const accX = h => ({ r: h.r, valor: h.valor, maxV: h.maxV, own: true, lim: h.lim, lvl: h.lvl, cap: h.cap, bm: T.BM.hero(h), nx: nxOf(h), el: h.el });

/* ================== 2а. коллекция — купленные герои, порядок и фильтр ================== */
const collView = (tag, o = {}) => { T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.overlay = null; T.S.hview = o.all ? 'all' : 'own'; return view(tag); };
const idsOf = h => cardsOf(h.slice(h.indexOf('<div class="hkg'))).map(c => (c.match(/data-v="([^"]+)"/) || [])[1]);
fresh();
{
  const mine = T.hrMine();
  if (mine.length !== 16) say(`коллекция: у демо героев аккаунта ${mine.length}, по демо-аккаунту (ADR-0031, п. 17) — 16`);
  const h = collView('коллекция · мои'), ids = idsOf(h);
  if (ids.length !== mine.length) say(`«Мои»: карточек ${ids.length}, героев аккаунта ${mine.length}`);
  if (/<button class="hc[ "]/.test(h.slice(h.indexOf('<div class="hkg')))) say('«Мои»: в сетке остались плитки 4 : 5 вместо карточек 9 : 16');
  if (/<div class="pnl hd">/.test(h)) say('«Мои»: рядом с сеткой осталась карточка героя — карточка открывается по нажатию');
  for (const x of mine) {
    const rh = T.hrV(x).rh, img = !T.RSI[x.id] ? null : T.RS_ART && T.RS_ART.has(x.id) ? x.id : null;
    checkCard(cardOf(h, x.id), `«Мои» · ${x.name}`, Object.assign(accX(x), img ? { img } : !T.RSI[x.id] ? {} : { sil: true }));
    if (!cardOf(h, x.id).includes(`data-a="hc" data-v="${x.id}"`)) say(`«Мои» · ${x.name}: нажатие на арт не открывает карточку`);
    if (!rh) say(`«Мои» · ${x.name}: нет записи в составе`);
  }
  /* по мощи, сильнейшие сверху — по умолчанию */
  const byBm = mine.slice().sort((a, b) => T.BM.hero(b) - T.BM.hero(a)).map(x => x.id);
  if (ids.join() !== byBm.join()) say(`«Мои»: порядок не по мощи — ${ids.slice(0, 4).join(', ')}…, ждали ${byBm.slice(0, 4).join(', ')}…`);
  if (T.S.hf.sort !== 'bm' || T.HC_SORT.own[0][0] !== 'bm') say('«Мои»: порядок по умолчанию — не по мощи');
  if (!h.includes('<option value="bm" selected>')) say('«Мои»: в списке порядка не выбрано «По мощи»');
  /* другие порядки: редкость, уровень, доблесть — сверху большее, при равенстве — по мощи */
  for (const [k, f] of [['r', x => x.r], ['lvl', x => x.lvl], ['valor', x => x.valor]]) {
    T.S.hf.sort = k;
    const got = idsOf(collView(`«Мои» · порядок ${k}`)), want = mine.slice().sort((a, b) => f(b) - f(a) || T.BM.hero(b) - T.BM.hero(a)).map(x => x.id);
    if (got.join() !== want.join()) say(`«Мои»: порядок «${k}» — ${got.slice(0, 4).join(', ')}…, ждали ${want.slice(0, 4).join(', ')}…`);
  }
  T.S.hf.sort = 'bm';
  /* фильтр значками: класс, стихия, редкость, цикл — сходится с независимым отбором; счётчик «N из M»; сброс */
  const twin = x => T.hrV(x).rh;
  const tries = [['cls', 'танк', x => twin(x).cl[0] === 'танк'], ['el', 'Огонь', x => x.el === 'Огонь'], ['r', 2, x => x.r === 2], ['c', 2, x => x.cycle === 2]];
  for (const [k, v, f] of tries) {
    run(`фильтр ${k}`, () => T.ACT.hcf(`${k}:${v}`));
    const g = collView(`«Мои» · фильтр ${k}`), got = idsOf(g), want = mine.filter(f).sort((a, b) => T.BM.hero(b) - T.BM.hero(a)).map(x => x.id);
    if (got.join() !== want.join()) say(`«Мои» · фильтр ${k}=${v}: карточки ${got.join(', ') || 'нет'}, ждали ${want.join(', ') || 'нет'}`);
    if (!g.includes(`${want.length} из ${mine.length}`)) say(`«Мои» · фильтр ${k}: нет счётчика «${want.length} из ${mine.length}»`);
    if (!/class="iconbtn hk-fb on"[^>]*>[\s\S]*?<b class="num">1<\/b>/.test(g)) say(`«Мои» · фильтр ${k}: у кнопки фильтра нет числа выбранного`);
    run(`фильтр ${k} · снять`, () => T.ACT.hcf(`${k}:${v}`));
    if (T.S.hf[k]) say(`«Мои» · фильтр ${k}: повторное нажатие не сняло фильтр`);
  }
  run('фильтр · пусто', () => { T.ACT.hcf('cls:фармер'); T.ACT.hcf('el:Тьма'); });
  { const g = collView('«Мои» · никого'); if (idsOf(g).length || !g.includes('data-a="hcclr"')) say('«Мои»: фильтр без героев — нет пустой строки со «Сбросить»'); }
  run('фильтр · сброс', () => T.ACT.hcclr());
  if (['cls', 'el', 'r', 'c', 'src'].some(k => T.S.hf[k])) say('«Мои»: «Сбросить» не снял все фильтры');
  /* лист фильтра: группы значками и сколько подходит */
  T.S.overlay = { t: 'hcflt', arg: 'own' };
  { const o = ovOf(view('лист фильтра')); for (const g of ['Класс', 'Стихия', 'Редкость', 'Цикл']) if (!o.includes(`<span class="eyebrow">${g}</span>`)) say(`лист фильтра: нет группы «${g}»`);
    if (count(o, /data-a="hcf" data-v="cls:/g) !== T.RS.classes.length || count(o, /data-a="hcf" data-v="r:/g) !== 7) say('лист фильтра: не все классы или редкости');
    if (!/icons\/cls-[a-z]+\.png/.test(o) || !/class="hkf-cr" data-r="7"/.test(o) || !/class="el bare"/.test(o)) say('лист фильтра: класс, редкость и стихия — не значками');
    if (o.includes('data-v="src:')) say('лист фильтра «Моих»: группа «Откуда» — она только у каталога');
    if (!o.includes(`Подходит героев: <b class="num">${mine.length}</b>`)) say('лист фильтра: не сказано, сколько героев подходит'); }
  T.S.overlay = null;
}

/* ================== 2б. каталог — все герои состава ================== */
fresh();
{
  const cur = T.rsCyc(), N = need(), h = collView('каталог', { all: true }), ids = idsOf(h);
  if (ids.length !== T.RS.heroes.length) say(`каталог: карточек ${ids.length}, героев в составе ${T.RS.heroes.length}`);
  const shardSrc = ['roulette', 'echo'];
  let seen = 0;
  for (const x of T.RS.heroes) {
    const v = T.hrV(x), id = v.id, t = cardOf(h, id), tag = `каталог · ${x.n}`;
    if (!t) { say(`${tag}: нет карточки`); continue; }
    if (v.own) { if (++seen <= 20) checkCard(t, tag, accX(v.acc)); continue; }
    const lock = x.c > cur, sh = shardSrc.includes(x.src) && !lock ? [T.S.rs.shards[x.id] || 0, N] : null, gray = !(sh && sh[0] >= N);
    checkCard(t, tag, { r: x.r, valor: 0, maxV: x.maxV, own: false, gray, shard: sh, lock, el: x.sch });
    if (!t.includes(`data-a="hc" data-v="${x.id}"`)) say(`${tag}: нажатие не открывает карточку героя`);
  }
  if (seen !== T.hrMine().length) say(`каталог: купленных в цвете ${seen}, героев аккаунта ${T.hrMine().length}`);
  if (T.HC_SORT.all[0][0] !== 'c') say('каталог: порядок по умолчанию — не по циклу');
  const cyc = ids.map(id => (T.H(id) ? T.H(id).cycle : T.RSI[id].c)); if (cyc.some((c, i) => i && c < cyc[i - 1])) say('каталог: не по циклу');
  /* фильтр «Откуда» — только в каталоге */
  run('каталог · Эхо', () => T.ACT.hcf('src:echo'));
  const g = collView('каталог · Эхо', { all: true }), got = idsOf(g), want = T.RS.heroes.filter(x => x.src === 'echo').map(x => T.hrV(x).id);
  if (got.slice().sort().join() !== want.slice().sort().join()) say(`каталог · «Откуда: Эхо»: карточек ${got.length}, героев Эхо ${want.length}`);
  T.S.overlay = { t: 'hcflt', arg: 'all' }; if (!ovOf(view('лист фильтра каталога')).includes('data-v="src:echo"')) say('лист фильтра каталога: нет группы «Откуда»');
  T.S.overlay = null; run('каталог · сброс', () => T.ACT.hcclr());
  /* из каталога: купленный — большая карточка героя аккаунта, несобранный — карточка «до покупки»; «Назад» — в каталог */
  const ro = T.RS.heroes.find(x => x.src === 'roulette' && !T.rsHas(x));
  run('каталог · нажатие', () => T.ACT.hc(ro.id));
  if (T.S.hview !== 'rs' || T.S.rs.sel !== ro.id) say('каталог: нажатие на несобранного не открыло карточку «до покупки»');
  run('каталог · назад', () => T.ACT.hcback()); if (T.S.hview !== 'all') say('каталог: «Назад» из карточки не вернул в каталог');
  run('каталог · свой', () => T.ACT.hc('h2')); if (T.S.hview !== 'mine' || T.S.selHero !== 'h2') say('каталог: нажатие на своего не открыло его большую карточку');
  run('каталог · назад 2', () => T.ACT.hcback()); if (T.S.hview !== 'all') say('каталог: «Назад» из большой карточки не вернул в каталог');
}

/* ================== 2в. рунные пределы: карточка, плитка отрядов, чужой герой, вёрстка плитки ================== */
{
  fresh();
  const h2 = T.H('h2'), d2 = T.heroDev(h2);   // 150 из 150, руны предела II в запасах (демо — 11-й день цикла II)
  if (!(h2.lvl >= h2.cap) || !d2.rune || d2.have < d2.need) say('пределы: у героя h2 в демо не потолок уровня или мало рун — сценарий «можно пробить» не проверить');
  let g = collView('пределы · можно пробить');
  checkPosts(cardOf(g, 'h2'), 'пределы · можно пробить · карточка', 't', h2.lim, 'ready');
  if (!/можно пробить следующий/.test((cardOf(g, 'h2').match(/aria-label="([^"]*)"/) || [])[1] || '')) say('пределы: подпись карточки не говорит, что предел можно пробить');
  T.S.hview = 'mine'; T.S.selHero = 'h2'; T.S.seg.hero = 'power'; g = view('пределы · большая карточка');
  checkPosts(g.slice(g.indexOf('<div class="hcb-pt"')), 'пределы · портрет большой карточки', 'h', h2.lim, 'ready');
  if (!/<span class="hcb-rp" role="img" aria-label="Рунный предел 1 из 5"/.test(g)) say('пределы: у портрета большой карточки нет подписи «Рунный предел N из 5»');
  T.BAG.take(d2.rune.id, T.BAG.qty(d2.rune.id) - (d2.need - 1));
  checkPosts(cardOf(collView('пределы · мало рун'), 'h2'), 'пределы · мало рун · карточка', 't', h2.lim, 'wait');
  checkPosts(T.hrTile(T.hrV(h2), { act: 'noop' }), 'пределы · мало рун · плитка', 't', h2.lim, 'wait');
  const h1 = T.H('h1'); if (h1.lvl >= h1.cap) say('пределы: h1 в демо на потолке — сценарий «уровень растёт» не проверить');
  checkPosts(cardOf(collView('пределы · уровень растёт'), 'h1'), 'пределы · уровень растёт · карточка', 't', h1.lim, '');
  /* чужой герой: та же плитка и шапка без запасов аккаунта — ни тлеющего, ни пульсирующего */
  fresh(); const vx = Object.assign(T.hrV(T.H('h2')), { acc: null, lim: 2 });
  checkPosts(T.hrTile(vx, { act: 'noop', bm: true }), 'пределы · чужой герой · плитка', 't', 2, '');
  checkPosts(T.hrHead(vx), 'пределы · чужой герой · шапка', 'h', 2, '');
  checkPosts(T.hcCard(vx, { act: 'noop' }), 'пределы · чужой герой · карточка', 't', 2, '');
  /* UI-кит задаёт состояние явно; плитки отрядов — в редакторе отряда */
  checkPosts(T.hrTile(T.hrV(T.H('h1')), { act: 'noop', rpNext: 'ready' }), 'пределы · UI-кит', 't', T.H('h1').lim, 'ready');
  T.S.route = 'heroes'; T.S.seg.heroes = 'squads'; T.S.selSquad = 's1';
  for (const t of tilesOf(view('отряды · плитки')).filter(x => !/^<button class="hc empty/.test(x))) {
    cnt.tiles++;
    if (!/<i class="cr" aria-hidden="true"><\/i>/.test(t)) say('отряды: у плитки нет кристалла редкости');
    if (postsOf(t, 't').length !== 2) say('отряды: у плитки героя нет двух столбов рунных камней');
  }
  /* вёрстка плитки отрядов: камни по бокам — от кристалла и доблести до строки уровня, имя отступает от них */
  const DEV = read('screens/hero-dev.css');
  const num = (css, re, what) => { const m = css.match(re); if (!m) { say(`вёрстка плитки: в стилях нет ${what}`); return null; } return m.slice(1).map(Number); };
  const [rpw] = num(DEV, /\.hc\{container-type:inline-size;--rp-w:(\d+)cqw\}/, '.hc — контейнер и --rp-w в cqw') || [0];
  const [pTop, pPct, pBot] = num(DEV, /\.hc \.rp\.t\{[^}]*top:max\((\d+)px,(\d+)%\);bottom:(\d+)px/, 'столба .hc .rp.t') || [0, 0, 0];
  const [pl, pr] = num(CSS, /\.hc\.rpp \.nm\{padding:0 calc\(var\(--rp-w\) - (\d+)px\) 0 calc\(var\(--rp-w\) - (\d+)px\)\}/, 'отступа имени .hc.rpp .nm') || [0, 0];
  const [ar1, ar2] = num(DEV, /\.rp-s\{[^}]*aspect-ratio:(\d+)\/(\d+)/, 'пропорции камня .rp-s') || [40, 58];
  const [crT, crW] = (num(CSS, /\.hc \.cr\{position:absolute;left:\d+px;top:(\d+)px;z-index:2;width:(\d+)px/, 'кристалла .hc .cr') || [4, 17]);
  const [stT] = num(CSS, /\.hc \.top\{position:absolute;right:\d+px;top:(\d+)px/, 'доблести .hc .top') || [5];
  const [stW] = num(CSS, /\.hc \.stars i\{width:(\d+)px/, 'значка доблести') || [11];
  const [bL, bR, bB] = num(CSS, /\.hc \.bot\{position:absolute;left:(\d+)px;right:(\d+)px;bottom:(\d+)px/, 'низа плитки .hc .bot') || [6, 5, 5];
  const spM = +((html.match(/--sp-m:(\d+)px/) || [])[1] || 12), sqL = +((CSS.match(/\.sq\{display:grid;grid-template-columns:(\d+)px/) || [])[1] || 236);
  const sqMax = +((CSS.match(/\.hr-sqed \.sq-slots\{max-width:(\d+)px/) || [])[1] || 520), sqMaxSm = +((CSS.match(/@container main \(max-height: 360px\)\{[\s\S]*?\.hr-sqed \.sq-slots\{max-width:(\d+)px/) || [])[1] || 440);
  const widths = [];
  for (const X of [{ n: '932 × 430', W: 932, rail: 78, sm: false }, { n: '844 × 390', W: 844, rail: 72, sm: true }]) {
    const inW = X.W - X.rail - 2 * spM, right = inW - sqL - spM - 2 - 2 * spM, slots = Math.min(right, X.sm ? sqMaxSm : sqMax);
    widths.push([`отряд ${X.n}`, Math.floor((slots - 4 * 8) / 5)]);
  }
  widths.push(['UI-кит', 80], ['UI-кит, крупно', 110]);
  for (const [n, W] of widths) {
    const Hh = W * 5 / 4, sw = W * rpw / 100, sh = sw * ar2 / ar1, top = Math.max(pTop, Hh * pPct / 100), post = Hh - top - pBot, perPost = Math.max(Math.min(T.RP_VIEW.split, TOP()), TOP() - Math.min(T.RP_VIEW.split, TOP())), gap = (post - perPost * sh) / Math.max(1, perPost - 1);
    if (sw < 4.5) say(`вёрстка плитки · ${n}: камень ${sw.toFixed(1)} px — мельче 4,5 px, не читается`);
    if (gap < 1) say(`вёрстка плитки · ${n}: камни в столбе налезают — шаг ${gap.toFixed(1)} px`);
    if (top < crT + crW || top < stT + stW) say(`вёрстка плитки · ${n}: столб начинается под кристаллом или доблестью`);
    if (pBot < bB + 13) say(`вёрстка плитки · ${n}: нижний камень залезает на строку уровня`);
    const nameW = W - bL - bR - (sw - pl) - (sw - pr);
    if (nameW < 44) say(`вёрстка плитки · ${n}: на имя остаётся ${nameW.toFixed(0)} px`);
    cnt.lay.push(`плитка отрядов · ${n} — ${W} px, камень ${sw.toFixed(1)} × ${sh.toFixed(1)}, шаг ${gap.toFixed(1)}, имя ${nameW.toFixed(0)} px`);
  }
}

/* ================== 3. большая карточка героя аккаунта ================== */
const bigOf = h => { const i = h.indexOf('<div class="hcb"'); return i < 0 ? '' : h.slice(i); };
const vitOf = g => (g.match(/<div class="hd-bm hr-vit[^"]*">([\s\S]*?)<\/div><\/header>/) || [])[1] || '';
fresh();
{
  for (const x of T.hrMine()) {
    T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'own';
    run('открыть', () => T.ACT.hc(x.id));
    if (T.S.hview !== 'mine' || T.S.selHero !== x.id) { say(`большая карточка · ${x.name}: нажатие на арт её не открыло`); continue; }
    for (const tab of ['power', 'gear', 'skills', 'path']) {
      T.S.seg.hero = tab; const g = bigOf(view(`большая карточка · ${x.name} · ${tab}`)); cnt.bigs++;
      if (!g) { say(`большая карточка · ${x.name}: не нарисована`); break; }
      if (/<div class="hd-top">/.test(g)) say(`большая карточка · ${x.name}: осталась прежняя шапка с маленьким лицом`);
      if (count(g, /data-a="seg" data-v="hero:(?:power|gear|skills|path)"/g) !== 4) say(`большая карточка · ${x.name}: не четыре вкладки`);
      if (tab === 'power' && (!g.includes('class="hdv-path"') || !g.includes('class="hdv-next"'))) say(`большая карточка · ${x.name}: во вкладке «Развитие» нет пути или следующего шага`);
      if (tab === 'gear' && count(g, /class="eq-slot[ "]/g) !== 9) say(`большая карточка · ${x.name}: во вкладке «Снаряжение» не девять мест`);
      if (tab === 'skills' && !/class="rot-list"/.test(g)) say(`большая карточка · ${x.name}: во вкладке «Навыки» нет способностей`);
      if (tab === 'path') { const rh = T.hrV(x).rh, ch = rh && (rh.ch && rh.ch[0] ? rh.ch[0][0] : rh.chT[0]); if (!ch || !g.includes(ch)) say(`большая карточка · ${x.name}: во вкладке «Путь» нет его главы`); }
      if (tab !== 'power') continue;
      /* портрет в раме ступени, знаки у вершины, рунные камни; шапка — имя, класс, стихия, раса, редкость; мощь, доблесть, уровень */
      const pt = g.slice(g.indexOf('<div class="hcb-pt"'), g.indexOf('<div class="hcb-in">')), vit = vitOf(g), bm = T.BM.hero(x);
      if (!pt.includes(`data-t="${tierOf(x.r, x.valor)}"`) || !pt.includes(`data-r="${x.r}"`)) say(`большая карточка · ${x.name}: портрет не в раме своей ступени`);
      if (!pt.includes(`data-a="hczoom" data-v="${x.id}"`)) say(`большая карточка · ${x.name}: портрет не открывается крупно`);
      if (!/<i class="hk-cr"/.test(pt) || !/class="hk-st"/.test(pt) || !pt.includes(`<b class="num">${x.lvl}</b>`)) say(`большая карточка · ${x.name}: у портрета нет гребня, доблести или уровня`);
      checkPosts(pt, `большая карточка · ${x.name} · портрет`, 'h', x.lim, nxOf(x));
      if (!g.includes(`<h2>${x.name}</h2>`) || !g.includes(`<span class="rar" data-r="${x.r}">`) || !/icons\/cls-[a-z]+\.png/.test(g.slice(g.indexOf('<header class="hcb-h">')))) say(`большая карточка · ${x.name}: в шапке нет имени, редкости или класса`);
      if (!/icons\/power\.png/.test(vit) || !vit.includes(`<span class="num">${T.fmt(bm)}</span>`)) say(`большая карточка · ${x.name}: мощь не BM.hero ${bm}`);
      if (!vit.includes(`<small class="num">${x.valor} / ${x.maxV}</small>`)) say(`большая карточка · ${x.name}: нет доблести «${x.valor} / ${x.maxV}»`);
      if (!vit.includes(`<b class="num">${x.lvl}</b><small class="faint num">/ ${x.cap}</small>`)) say(`большая карточка · ${x.name}: нет уровня «${x.lvl} / ${x.cap}»`);
      if (!g.includes('data-a="hcback"')) say(`большая карточка · ${x.name}: нет «Назад»`);
    }
  }
  /* ‹ › — соседний герой той же сетки и порядка; «Назад» — к сетке */
  fresh(); collView('листать'); run('открыть', () => T.ACT.hc(T.hcOwnList()[0].id));
  const L = T.hcOwnList().map(v => v.id);
  run('следующий', () => T.ACT.hcstep('1')); if (T.S.selHero !== L[1]) say('большая карточка: «›» не открыл следующего героя сетки');
  run('предыдущий', () => T.ACT.hcstep('-1')); run('предыдущий', () => T.ACT.hcstep('-1')); if (T.S.selHero !== L[L.length - 1]) say('большая карточка: «‹» с первого героя не ушёл к последнему');
  run('назад', () => T.ACT.hcback()); if (T.S.hview !== 'own') say('большая карточка: «Назад» не вернул к сетке «Мои»');
  /* портрет крупно: рисунок целиком в раме ступени; закрытие возвращает прежнее окно */
  run('крупно', () => { T.ACT.hc('h2'); T.ACT.hczoom('h2'); });
  let o = ovOf(view('портрет крупно'));
  if (!T.S.overlay || T.S.overlay.t !== 'hczoom' || !/^<div class="ov hcz-ov"/.test(o) || !o.includes('heroes/h2.jpg') || !/<figure class="hcz" data-r="1" data-t="\d"/.test(o)) say('портрет крупно: нет окна с портретом героя в раме ступени');
  run('крупно · закрыть', () => T.ACT.hczx()); if (T.S.overlay) say('портрет крупно: закрытие не вернуло к карточке');
  const ro = T.RS.heroes.find(x => x.src === 'roulette' && T.RS_ART && T.RS_ART.has(x.id) && !T.rsHas(x));
  run('крупно из окна', () => { T.ACT.rhero(ro.id); T.ACT.hczoom(ro.id); T.ACT.hczx(); });
  if (!T.S.overlay || T.S.overlay.t !== 'rhero' || T.S.overlay.arg !== ro.id) say('портрет крупно: из карточки поверх экрана закрытие не вернуло её');
  T.S.overlay = null;
}

/* ================== 3а. карточка героя состава «до покупки» ================== */
function checkPre(g, x, where) {
  cnt.bigs++;
  if (!g) { say(`${where}: нет карточки`); return; }
  const pt = g.slice(g.indexOf('<div class="hcb-pt"'), g.indexOf('<div class="hcb-in">'));
  if (!pt.includes(`data-r="${x.r}"`) || !/<i class="hk-cr"/.test(pt)) say(`${where}: портрет без редкости`);
  if (postsOf(pt).length) say(`${where}: у героя вне коллекции — рунные камни`);
  if (!g.includes(`<h2>${x.n}</h2>`) || !g.includes(`<span class="rar" data-r="${x.r}">`) || !g.includes(`data-el="${x.sch}"`) || !/icons\/cls-[a-z]+\.png/.test(g)) say(`${where}: нет имени, редкости, стихии или класса`);
  if (!g.includes(`доблесть до ${x.maxV}`)) say(`${where}: нет личного максимума доблести`);
  for (const bad of ['data-a="lvlup"', 'data-a="limit"', 'data-a="gearbest"', 'class="eq-slot', 'class="hdv-path"', 'data-a="seg" data-v="hero:']) if (g.includes(bad)) say(`${where}: у героя до покупки — прокачка или снаряжение (${bad})`);
  if (count(g, /data-a="seg" data-v="rhero:(?:who|skills|path)"/g) !== 3) say(`${where}: не три вкладки «Герой», «Навыки», «Путь»`);
}
fresh();
{
  const ro = T.RS.heroes.find(x => x.src === 'roulette' && !T.rsHas(x) && x.maxV > 1) || T.RS.heroes.find(x => x.src === 'roulette' && !T.rsHas(x));
  T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'all'; run('до покупки', () => T.ACT.hc(ro.id));
  for (const tab of ['who', 'skills', 'path']) {
    T.S.seg.rhero = tab; const g = bigOf(view(`до покупки · ${ro.n} · ${tab}`));
    checkPre(g, ro, `до покупки · ${tab}`);
    if (tab === 'who' && (!g.includes('0 ур. · 0 РП · 0 Добл') || !/class="quote|class="lore/.test(g))) say('до покупки · «Герой»: нет истории или «с чем приходит»');
    if (tab === 'skills') {
      const K = T.heroKit({ draft: T.hrDraft(ro) });
      if (!K) say('до покупки · «Навыки»: у героя нет набора');
      else for (const k of K.kit.filter(y => y.v > 0)) if (!g.includes(`>доблесть ${k.v}</span>`)) { say(`до покупки · «Навыки»: не сказано, что способность откроется на доблести ${k.v}`); break; }
    }
    if (tab === 'path' && !g.includes(ro.chT[0])) say('до покупки · «Путь»: нет глав');
  }
  const g = bigOf(view('до покупки · действие'));
  if (!g.includes(`data-a="rsgo" data-v="${ro.id}"`) || !/class="hcb-shb"/.test(g)) say('до покупки: из каталога нет пути к душам и полосы осколков');
  /* поверх любого экрана: окно на месте рабочей области; из лавки праха «Назад» возвращает в лавку */
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.overlay = { t: 'dust' };
  run('лавка · карточка', () => T.ACT.rhero(ro.id));
  let o = ovOf(view('карточка поверх лавки'));
  if (!/^<div class="ov hc-ov"/.test(o) || !o.includes('<div class="hc-win">')) say('карточка поверх экрана: не окно на месте рабочей области');
  checkPre(bigOf(o), ro, 'карточка поверх лавки');
  if (!o.includes('class="iconbtn hcb-bk" data-a="dlg" data-v="dust"')) say('карточка поверх лавки: «Назад» не возвращает в лавку');
  /* купленный герой в окне поверх — его прогресс и «К развитию» */
  const own = T.RSI['c1-06']; T.S.overlay = null; run('свой поверх', () => T.ACT.rhero(own.id)); o = ovOf(view('свой герой поверх'));
  if (!o.includes(`data-a="dngo" data-v="${own.id}"`) || !/class="hd-bm hr-vit"/.test(o)) say('свой герой поверх экрана: нет прогресса или «К развитию»');
  run('к развитию', () => T.ACT.dngo(own.id)); if (T.S.hview !== 'mine' || T.S.overlay) say('«К развитию»: не большая карточка героя');
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
    checkCard(cardOf(collView('купленный · карточка'), x.id), 'купленный · карточка', Object.assign(accX(h), { lvl: 0, lim: 0, valor: 0 }));
    T.S.hview = 'mine'; T.S.selHero = x.id;
    for (const tab of ['power', 'gear', 'skills', 'path']) {
      T.S.seg.hero = tab; const g = view(`купленный · ${tab}`);
      if (tab === 'power' && (!g.includes('data-a="limit"') || !/class="hdv-next"/.test(g))) say('купленный герой: во вкладке «Развитие» нет пути с воротами предела или следующего шага');
      if (tab === 'gear' && (g.match(/class="eq-slot[ "]/g) || []).length !== 9) say('купленный герой: во вкладке «Снаряжение» не девять мест');
      if (tab === 'path' && !g.includes(T.RSI[x.id].chT[0])) say('купленный герой: во вкладке «Путь» нет его главы');
    }
    /* превью доблести купленного героя называет его главу из состава (screens/hero-dev.js) */
    { const rh = T.RSI[x.id], ch1 = rh.ch && rh.ch[0] ? rh.ch[0][0] : rh.chT[0];
      T.S.overlay = null; run('купленный · превью доблести', () => T.ACT.valor(x.id));
      if (!view('купленный · превью доблести').includes(`«${ch1}»`)) say(`купленный герой: превью доблести не называет его главу «${ch1}»`);
      T.S.overlay = null; }
    T.S.seg.hero = 'power';
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
    /* 2. одно число везде: карточки коллекции, «Пятёрка сильнейших», библиотека отрядов, лист выбора отряда */
    const cg = collView('БМ · коллекция');
    for (const h of T.hrMine()) if (!cardOf(cg, h.id).includes(`<b class="num">${shortBM(B.hero(h))}</b>`)) say(`коллекция · ${h.name}: на карточке не BM.hero`);
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
    /* 3. рост по формуле: уровень поднимает мощь */
    { const h = T.H('h2'), b0 = h.bm; h.lvl += 10; const w = f0(heroU(T.BM_SRC0(h))); if (!(h.bm > b0) || h.bm !== w) say(`БМ: после уровня ${h.bm}, по формуле ${w}`); }
    /* 4. слои §6: талисман и снаряжение на одном герое — ⌊⌊база × талисманы⌋ × снаряжение⌋, база — без вещей */
    if (T.TB && T.TL_SRV && T.EQ_SRV && T.tlMul && T.eqMulOf) {
      fresh(); const h = T.H('h1');
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
        const Pp = B.parts(h), base = f0(heroU(T.BM_SRC0(h))), tm = T.tlMul('h1'), em = T.eqMulOf(h, T.eqWornList('h1')), want = fl(fl(base * tm, BP) * em, BP);
        if (Pp.base !== base || Pp.mul.tal !== tm || Pp.mul.eq !== em || h.bm !== want) say(`БМ · слои: ${h.bm} (база ${Pp.base} × ${Pp.mul.tal} × ${Pp.mul.eq}), ждали ${want} (${base} × ${tm} × ${em})`);
        T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.selHero = 'h1'; T.S.seg.hero = 'power';
        if (!vitOf(view('большая карточка · со слоями')).includes(T.fmt(want))) say('большая карточка: мощь со слоями — не BM.hero');
      }
    }
    /* 5. режимы: соперник Арены, цель Эхо, цель клана — та же формула */
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

/* ================== 5. «Призыв → За золото» — та же сетка и карточка «до покупки» ================== */
for (const team of [false, true]) {
  run('режим', () => T.setTeam(team));
  for (let c = 1; c <= 6; c++) {
    fresh(); T.S.acc.cycle = c; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'gold';
    const tag = `«За золото» · цикл ${c}${team ? ' [команда]' : ''}`, g = view(tag), cat = T.RS.heroes.filter(h => h.src === 'gold' && h.c === c).sort((a, b) => a.no - b.no);
    const ids = cardsOf(g).map(t => (t.match(/data-v="([^"]+)"/) || [])[1]);
    if (ids.join() !== cat.map(h => h.id).join()) say(`${tag}: карточки ${ids.length} не по «№» каталога (${cat.length})`);
    const k = T.rsBought(c) + 1;
    if (!g.includes(`Следующий найм — ${k}-й в цикле:`) || !g.includes(`<b class="num">${T.fmt(T.rsGold(c, k))}</b>`)) say(`${tag}: нет строки «Следующий найм» с ценой ${T.rsGold(c, k)}`);
    for (const h of cat.slice(0, 6)) {
      const t = cardOf(g, h.id), v = T.hrV(h), own = T.rsHas(h);
      if (!t.includes(`data-a="gsel" data-v="${h.id}"`)) say(`${tag} · ${h.n}: нажатие не открывает карточку «до покупки»`);
      if (own !== /class="hk-in"/.test(t)) say(`${tag} · ${h.n}: отметка «в коллекции» ${own ? 'пропала' : 'у некупленного'}`);
      if (!own) checkCard(t, `${tag} · ${h.n}`, { r: h.r, valor: 0, maxV: h.maxV, own: false, el: h.sch });
      else if (v.acc) checkCard(t, `${tag} · ${h.n}`, Object.assign(accX(v.acc), { bm: null }));
    }
    if (count(g, /<button class="hk[ "][^>]*>/g) !== cat.length) say(`${tag}: карточек ${count(g, /<button class="hk[ "][^>]*>/g)}, героев каталога ${cat.length}`);
    cnt.cycles++;
  }
}
run('режим «Игрок»', () => T.setTeam(false));
{
  fresh(); T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'gold';
  const x = T.RS.heroes.find(h => h.src === 'gold' && h.c === 2 && !T.rsHas(h)), k = T.rsBought(2) + 1, price = T.rsGold(2, k);
  run('золото · карточка', () => T.ACT.gsel(x.id));
  for (const tab of ['who', 'skills', 'path']) { T.S.seg.rhero = tab; checkPre(bigOf(view(`«За золото» · до покупки · ${tab}`)), x, `«За золото» · до покупки · ${tab}`); }
  T.S.seg.rhero = 'who';
  let g = view('«За золото» · до покупки');
  if (!new RegExp(`data-a="gbuy" data-v="${x.id}">Купить<span class="cost"><img[^>]*>${T.fmt(price)}</span>`).test(g)) say(`«За золото» · до покупки: нет «Купить» с ценой ${price}`);
  if (!g.includes(`${k}-я покупка цикла II`)) say('«За золото» · до покупки: не сказано, какая это покупка цикла');
  if (/rs-hbar/.test(g)) say('«За золото» · до покупки: карточка не крупным планом — осталась строка вкладок Призыва');
  if (!g.includes('data-a="gsel" data-v=""')) say('«За золото» · до покупки: нет «Назад» к сетке');
  /* нехватка золота: кнопка неактивна, сказано сколько */
  const g0 = T.S.wallet.gold; T.S.wallet.gold = price - 7; g = view('«За золото» · нет золота');
  if (!new RegExp(`data-a="gbuy" data-v="${x.id}" disabled`).test(g) || !g.includes(`Не хватает ${T.fmt(7)} золота`)) say('«За золото» · до покупки: при нехватке кнопка активна или не сказано сколько');
  T.S.wallet.gold = g0;
  /* покупка: подтверждение, списано ровно цена, карточка — «в коллекции» и «К развитию» */
  run('золото · купить', () => T.ACT.gbuy(x.id)); if (!T.S.overlay || T.S.overlay.t !== 'confirm') say('«За золото»: «Купить» без подтверждения');
  run('золото · подтвердить', () => T.ACT.gbuydo(x.id));
  if (T.S.wallet.gold !== g0 - price || JSON.stringify(T.S.rs.owned[x.id]) !== JSON.stringify({ lvl: 0, lim: 0, valor: 0, how: 'gold' })) say(`«За золото»: списано ${g0 - T.S.wallet.gold} при цене ${price} или запись не 0/0/0`);
  g = view('«За золото» · куплен');
  if (!g.includes(`data-a="dngo" data-v="${x.id}"`) || /data-a="gbuy"/.test(g)) say('«За золото»: после покупки у карточки нет «К развитию» или осталась покупка');
  run('золото · назад', () => T.ACT.gsel('')); if (T.S.rs.gsel) say('«За золото»: «Назад» не вернул к сетке');
  if (!cardOf(view('«За золото» · сетка после'), x.id).includes('class="hk-in"')) say('«За золото»: у купленного в сетке нет отметки «в коллекции»');
  /* будущий цикл — витрина: карточка без покупки */
  T.S.rs.gcyc = 4; const z = T.RS.heroes.find(h => h.src === 'gold' && h.c === 4);
  const gz = view('«За золото» · будущий цикл'); if (!/<button class="hk[^"]* lock/.test(gz)) say('«За золото» · будущий цикл: карточки без замка');
  run('будущий · карточка', () => T.ACT.gsel(z.id)); const gz2 = view('«За золото» · будущий · карточка');
  if (/data-a="gbuy"/.test(gz2) || !gz2.includes('цикл IV')) say('«За золото» · будущий цикл: можно купить или не сказано, когда откроется');
}

/* ================== 5а. «За души»: сцена алтаря ================== */
function souls(c, team) {
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.rs.cyc = c;
  const tag = `«За души» · цикл ${c}${team ? ' [команда]' : ''}`, h = view(tag), pool = T.rsPool(), open = c >= T.rsFrom('roulette');
  const body = h.slice(h.indexOf('<div class="hr-souls'));
  if (!/class="pnl rl-entry[ "]/.test(body)) say(`${tag}: нет входа рулетки`);
  if (!/class="rl-scn[ "]/.test(body)) say(`${tag}: нет сцены алтаря`);
  if (open && count(body, /class="rl-ef"/g) !== pool.length) say(`${tag}: лиц пула ${count(body, /class="rl-ef"/g)}, героев пула ${pool.length}`);
  if (open && pool.length && !body.includes('data-a="dlg" data-v="rl"')) say(`${tag}: нет «К рулетке»`);
  if (!body.includes('data-a="sheet" data-v="hrecho"')) say(`${tag}: нет входа отряда Эхо недели`);
  if (!body.includes('data-a="dlg" data-v="dust"')) say(`${tag}: нет входа лавки праха`);
  if (/class="rs-row|rs-col/.test(body)) say(`${tag}: во вкладке остались списки — им место в окнах`);
  const lines = playerText(body).split('\n').length, btns = count(body, /<button/g);
  if (lines > 24) say(`${tag}: строк текста ${lines} — тесно`);
  if (btns > pool.length + 6) say(`${tag}: кнопок ${btns} — тесно`);
  const W = T.rsWeek(), eb = body.slice(body.indexOf('data-v="hrecho"')), eIn = eb.slice(0, eb.indexOf('</button>'));
  const want = (W ? W.squad : []).filter(id => T.RSI[id] && !T.rsHas(T.RSI[id])).length;
  if (count(eIn, /class="hsg"/g) !== want) say(`${tag}: во входе отряда Эхо осколков ${count(eIn, /class="hsg"/g)}, героев недели не в коллекции ${want}`);
  if (!/<img class="hr-ebg" src="[^"]*arena-echo-/.test(eIn)) say(`${tag}: у входа отряда Эхо нет арены цивилизации недели`);
  T.S.overlay = { t: 'hrecho' }; if (!/^<div class="ov he-ov/.test(ovOf(view(`${tag} · витрина отряда недели`)))) say(`${tag}: витрина отряда недели не открылась окном`);
  T.S.overlay = { t: 'dust' }; if (!/^<div class="ov du-ov/.test(ovOf(view(`${tag} · окно лавки`)))) say(`${tag}: окно лавки праха не открылось`);
  T.S.overlay = null;
  cnt.cycles++;
}
for (const team of [false, true]) { run('режим', () => T.setTeam(team)); for (let c = 1; c <= 6; c++) souls(c, team); }
run('режим «Игрок»', () => T.setTeam(false));

/* ================== 5б. витрина отряда недели ================== */
{
  for (let c = 2; c <= 6; c++) {
    fresh(); T.S.acc.cycle = c; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.overlay = { t: 'hrecho' };
    const W = T.rsWeek(), sq5 = W.squad.map(id => T.RSI[id]).filter(Boolean), N = need(), tag = `витрина отряда недели · цикл ${c}`, o = ovOf(view(tag));
    if (!/^<div class="ov he-ov/.test(o) || /class="sheet/.test(o)) { say(`${tag}: не окно-витрина`); continue; }
    if (!o.includes(`<h2>${W.civ}</h2>`) || !o.includes(W.raid)) say(`${tag}: нет цивилизации и нашествия недели`);
    if (!/<img class="he-bg" src="[^"]*arena-echo-/.test(o)) say(`${tag}: за окном не арена цивилизации недели`);
    const av = sq5.find(h => h.avers && h.avers.race); if (av && !/class="chip he-av"/.test(o)) say(`${tag}: не видно неприязни`);
    if (!/только из сундуков Эхо за места недели/.test(o) || !o.includes('data-a="go" data-v="echo"')) say(`${tag}: не сказано, откуда осколки, или нет пути в Эхо`);
    const cards = cardsOf(o);
    if (cards.length !== sq5.length) say(`${tag}: карточек ${cards.length}, героев недели ${sq5.length}`);
    for (const h of sq5) {
      const t = cards.find(x => x.includes(`data-a="ssel" data-v="${h.id}"`)), own = T.rsHas(h), n = T.S.rs.shards[h.id] || 0, lock = h.c > c;
      if (!t) { say(`${tag}: нет карточки ${h.n}`); continue; }
      checkCard(t, `${tag} · ${h.n}`, own ? Object.assign(accX(T.H(h.id)), { bm: null }) : { r: h.r, valor: 0, maxV: h.maxV, own: false, gray: n < N, shard: [n, N], lock, el: h.sch });
    }
    if (!/class="he-sel"/.test(o)) say(`${tag}: нет выбранного героя с действием`);
  }
  /* собранный комплект — в цвете; «Пробудить» — подтверждение в том же окне, операция, окно пробуждения с возвратом в витрину */
  fresh(); T.S.acc.cycle = 3; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls';
  const W = T.rsWeek(), N = need(), x = W.squad.map(id => T.RSI[id]).find(h => h && h.c <= 3 && !T.rsHas(h));
  T.S.rs.shards[x.id] = N + 2; T.S.wallet.souls = 1e6; T.S.overlay = { t: 'hrecho' };
  run('витрина · выбор', () => T.ACT.ssel(x.id));
  let o = ovOf(view('витрина · собран'));
  const t = cardsOf(o).find(y => y.includes(`data-v="${x.id}"`)) || '';
  if (/ gray/.test(t.slice(0, 40)) || !/class="hk-sh full"/.test(t)) say('витрина: собранный комплект не в цвете или полоса не горит');
  const m = o.match(new RegExp(`data-a="activate" data-v="(du\\d+)\\|${x.id}"`));
  if (!m) say('витрина: у собранного нет «Пробудить» с номером операции');
  else {
    run('витрина · пробудить', () => T.ACT.activate(`${m[1]}|${x.id}`));
    if (!T.S.overlay || T.S.overlay.t !== 'hrecho' || !T.S.du.ask) say('витрина: подтверждение пробуждения — не в том же окне');
    o = ovOf(view('витрина · подтверждение'));
    if (!o.includes(`data-a="activatedo" data-v="${m[1]}|${x.id}"`)) say('витрина: в подтверждении нет номера операции');
    const s0 = T.S.wallet.souls; run('витрина · пробуждение', () => T.ACT.activatedo(`${m[1]}|${x.id}`));
    if (!T.rsHas(x) || T.S.wallet.souls !== s0 - T.RS.rules.stub.activateSouls) say('витрина: пробуждение не привело героя или цена не та');
    if (!T.S.overlay || T.S.overlay.t !== 'hrwake' || T.S.overlay.back !== 'hrecho') say('витрина: после пробуждения нет окна пробуждения с возвратом в витрину');
    if (!ovOf(view('витрина · окно пробуждения')).includes('data-a="dlg" data-v="hrecho"')) say('окно пробуждения: нет «К отряду недели»');
    const s1 = T.S.wallet.souls; run('витрина · повтор', () => T.ACT.activatedo(`${m[1]}|${x.id}`)); if (T.S.wallet.souls !== s1) say('витрина: повтор номера списал души ещё раз');
    T.S.overlay = { t: 'hrecho' }; o = ovOf(view('витрина · пробуждён'));
    const t2 = cardsOf(o).find(y => y.includes(`data-v="${x.id}"`)) || '';
    if (/ gray/.test(t2.slice(0, 40)) || /class="hk-sh/.test(t2)) say('витрина: пробуждённый — чёрно-белый или с полосой осколков');
  }
  /* из витрины: карточка героя поверх, «Назад» — в витрину; герой Эхо этой недели из каталога — «К отряду недели» */
  T.S.overlay = { t: 'hrecho' }; const y = W.squad.map(id => T.RSI[id]).find(h => h && !T.rsHas(h));
  if (y) {
    run('витрина · карточка', () => T.ACT.rhero(y.id));
    if (!ovOf(view('витрина · карточка героя')).includes('data-a="dlg" data-v="hrecho"')) say('карточка из витрины: «Назад» не возвращает в витрину');
    T.S.overlay = null; run('к отряду недели', () => T.ACT.rsgo(y.id));
    if (y.c <= T.rsCyc() && (!T.S.overlay || T.S.overlay.t !== 'hrecho')) say('«К отряду недели»: не открыл витрину');
  }
}

/* ================== 5в. лавка праха: окно и операции SOUL_SRV ================== */
{
  fresh(); T.S.rs.shards = {}; T.S.acc.cycle = 2;   // демо-осколки запасов (screens/bag.js) — прочь: считаем с нуля
  T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls';
  const N = need(), cat = T.hrDustCat(), x = cat[0], y = cat[1], p = T.rsShardPrice(x);
  T.S.overlay = { t: 'dust' };
  let o = ovOf(view('лавка'));
  const cards = [...o.matchAll(/<button class="du-c[^"]*" data-r="\d" data-a="ssel" data-v="([^"]+)"[\s\S]*?<\/button>/g)];
  if (cards.length !== cat.length) say(`лавка: карточек ${cards.length}, героев в лавке ${cat.length}`);
  for (const mm of cards) {
    const h = T.RSI[mm[1]]; if (!h) { say(`лавка: карточка неизвестного героя ${mm[1]}`); continue; }
    if (!mm[0].includes('class="hsg"')) say(`лавка: у ${h.n} на карточке нет стекла с лицом`);
    if (!mm[0].includes(`>${T.fmt(T.rsShardPrice(h))}</span>`)) say(`лавка: у ${h.n} на карточке нет цены осколка ${T.rsShardPrice(h)}`);
    if (!mm[0].includes(`${T.fmt(T.S.rs.shards[h.id] || 0)}/${N}`)) say(`лавка: у ${h.n} на карточке нет доли собранного`);
  }
  if (!/Героев Эхо здесь нет/.test(o)) say('лавка: не объяснено, почему в ней нет героев Эхо');
  if (!o.includes(T.fmt(T.S.wallet.dust))) say('лавка: не виден прах на руках');
  const buyRe = id => new RegExp(`data-a="dustbuy" data-v="(du\\d+)\\|${id}\\|(\\d+)"([^>]*)>`);
  T.S.du.q = 1; run('лавка · выбор', () => T.ACT.ssel(x.id));
  o = ovOf(view('лавка · выбран'));
  let m = o.match(buyRe(x.id));
  if (!m || m[2] !== '1' || !o.includes(`×1<span class="cost">`)) say('лавка: у выбранного нет «Осколки ×1» с номером операции и ценой');
  T.S.wallet.dust = 1e6;
  if (m) {
    const d0 = T.S.wallet.dust;
    run('лавка · осколок', () => T.ACT.dustbuy(`${m[1]}|${x.id}|1`));
    if ((T.S.rs.shards[x.id] || 0) !== 1 || T.S.wallet.dust !== d0 - p) say(`лавка: куплено ${T.S.rs.shards[x.id] || 0}, списано ${d0 - T.S.wallet.dust}, ждали 1 и ${p}`);
    if (!T.S.overlay || T.S.overlay.t !== 'dust') say('лавка: после покупки окно закрылось');
    run('лавка · повтор номера', () => T.ACT.dustbuy(`${m[1]}|${x.id}|1`));
    if ((T.S.rs.shards[x.id] || 0) !== 1 || T.S.wallet.dust !== d0 - p) say('лавка: повтор номера купил ещё раз');
    if (!T.SOUL_SRV.buy(m[1], x.id, 1).again) say('лавка: повтор номера — не «повтор»');
  }
  T.S.du.q = 10; o = ovOf(view('лавка · ×10')); m = o.match(buyRe(x.id));
  if (!m || m[2] !== '10') say('лавка: «10» не ведёт к «Осколки ×10»');
  else { const s0 = T.S.rs.shards[x.id], d1 = T.S.wallet.dust; run('лавка · ×10', () => T.ACT.dustbuy(`${m[1]}|${x.id}|10`)); if (T.S.rs.shards[x.id] !== s0 + 10 || T.S.wallet.dust !== d1 - 10 * p) say('лавка: ×10 — не десять осколков за десять цен'); }
  T.S.du.q = 0; o = ovOf(view('лавка · до комплекта')); m = o.match(buyRe(x.id));
  const left = N - T.S.rs.shards[x.id];
  if (!m || +m[2] !== left) say(`лавка: «до ${N}» не ведёт к ×${left}`);
  else { run('лавка · до комплекта', () => T.ACT.dustbuy(`${m[1]}|${x.id}|${left}`)); if (T.S.rs.shards[x.id] !== N) say('лавка: «до комплекта» не собрал комплект'); }
  o = ovOf(view('лавка · комплект'));
  if (buyRe(x.id).test(o) || !new RegExp(`data-a="activate" data-v="du\\d+\\|${x.id}"`).test(o)) say('лавка: при собранном комплекте нет «Пробудить» или осталась покупка');
  { const d2 = T.S.wallet.dust, r = T.SOUL_SRV.buy('du' + T.S.du.seq, x.id, 1); if (r.refuse !== 'full' || T.S.wallet.dust !== d2) say('лавка: сверх комплекта — не отказ или расход'); }
  { const r = T.SOUL_SRV.buy('du' + T.S.du.seq, y.id, 1.5); if (r.refuse !== 'qty') say('лавка: дробное число осколков — не отказ'); }
  T.S.wallet.dust = 0; T.S.du.q = 1; run('лавка · другой', () => T.ACT.ssel(y.id)); o = ovOf(view('лавка · нет праха')); m = o.match(buyRe(y.id));
  if (!m || !/disabled/.test(m[3]) || !o.includes(`Не хватает ${T.fmt(T.rsShardPrice(y))} праха`)) say('лавка: при нехватке праха кнопка активна или не сказано сколько');
  { const r = T.SOUL_SRV.buy('du' + T.S.du.seq, y.id, 1); if (r.refuse !== 'dust' || (T.S.rs.shards[y.id] || 0)) say('лавка: без праха — не отказ или выдача'); }
  T.S.rs.ssel = x.id; T.S.rs.shards[x.id] = N + 3; T.S.wallet.souls = 1e6; T.S.wallet.dust = 0;
  o = ovOf(view('лавка · пробудить'));
  const wm = o.match(new RegExp(`data-a="activate" data-v="(du\\d+)\\|${x.id}"`));
  if (!wm) say('лавка: нет «Пробудить» с номером операции');
  else {
    run('лавка · «Пробудить»', () => T.ACT.activate(`${wm[1]}|${x.id}`));
    if (!T.S.overlay || T.S.overlay.t !== 'dust' || !T.S.du.ask) say('лавка: подтверждение пробуждения — не в окне лавки');
    o = ovOf(view('лавка · подтверждение'));
    if (!o.includes(`data-a="activatedo" data-v="${wm[1]}|${x.id}"`) || !o.includes('0 уровнем') || !o.includes(`+${T.fmt(3 * T.rsDustOf(x))}`)) say('лавка: в подтверждении нет номера операции, «с чем приходит» или праха за лишние осколки');
    const s0 = T.S.wallet.souls, d3 = T.S.wallet.dust;
    run('лавка · пробуждение', () => T.ACT.activatedo(`${wm[1]}|${x.id}`));
    const own = T.S.rs.owned[x.id];
    if (!own || own.lvl || own.lim || own.valor || !T.H(x.id)) say('лавка: пробуждённый не пришёл в коллекцию с 0 ур., 0 РП и 0 Добл');
    if (T.S.wallet.souls !== s0 - T.RS.rules.stub.activateSouls || T.S.wallet.dust !== d3 + 3 * T.rsDustOf(x) || T.S.rs.shards[x.id]) say('лавка: пробуждение — не та цена, не тот прах за лишние или осколки остались');
    if (!T.S.overlay || T.S.overlay.t !== 'hrwake' || T.S.overlay.back !== 'dust') say('лавка: после пробуждения нет окна пробуждения с возвратом в лавку');
    const g = ovOf(view('окно пробуждения'));
    if (!g.includes(x.n) || !/^<div class="ov hr-wake/.test(g) || !/--t0:-\d+ms/.test(g) || !g.includes('data-a="dlg" data-v="dust"') || !g.includes(`data-a="dngo" data-v="${x.id}"`)) say('окно пробуждения: нет имени, времени сцены, «В лавку» или «К развитию»');
    if (!/class="hsg"/.test(g) || !/class="rl-fr"|class="rl-frc"/.test(g)) say('окно пробуждения: нет стекла осколка или рамы героя');
    run('окно пробуждения · сразу итог', () => T.ACT.hrwskip());
    if (!/^<div class="ov hr-wake done"/.test(ovOf(view('окно пробуждения · итог')))) say('окно пробуждения: нажатие не ведёт сразу к итогу');
    const s1 = T.S.wallet.souls;
    run('пробуждение · повтор номера', () => T.ACT.activatedo(`${wm[1]}|${x.id}`));
    if (T.S.wallet.souls !== s1) say('пробуждение: повтор номера списал души ещё раз');
    if (!T.SOUL_SRV.wake(wm[1], x.id).again) say('пробуждение: повтор номера — не «повтор»');
  }
  { const z = cat[2] || y; T.S.rs.shards[z.id] = N - 1; T.S.wallet.souls = 1e6; const s2 = T.S.wallet.souls;
    const r1 = T.SOUL_SRV.wake('du' + T.S.du.seq, z.id); T.S.rs.shards[z.id] = N; T.S.wallet.souls = 0; const r2 = T.SOUL_SRV.wake('du' + T.S.du.seq, z.id);
    if (r1.refuse !== 'shards' || r2.refuse !== 'souls' || T.rsHas(z) || T.S.rs.shards[z.id] !== N) say(`пробуждение: отказы ${r1.refuse}, ${r2.refuse} — или выдача при отказе`);
    T.S.wallet.souls = s2; }
  { const w = cat[3] || y; T.S.wallet.dust = 1e6; const s0 = T.S.rs.shards[w.id] || 0, seq = T.S.du.seq; run('лавка · старый вызов', () => T.ACT.dustbuy(w.id)); if ((T.S.rs.shards[w.id] || 0) !== s0 + 1 || !T.S.du.ops['du' + seq]) say('лавка: старый вызов ACT.dustbuy(герой) — не один осколок операцией с номером'); }
}
/* дыра праха закрыта: героев Эхо прахом не собрать — правило в данных, «сервер» и каждая кнопка «Осколок» */
{
  const R = T.RS.rules, src = R && R.dustSrc;
  if (!Array.isArray(src) || !src.length) say('прах: в данных нет правила rules.dustSrc — чьи осколки продаёт каталог праха');
  else { if (src.includes('echo')) say('прах: rules.dustSrc разрешает героев Эхо — дыра в обход Эхо'); if (src.some(k => !T.RS.sources.includes(k))) say(`прах: в rules.dustSrc неизвестный источник — ${src.join(', ')}`); }
  for (const h of T.RS.heroes) if (T.rsDustable(h) !== !!(src && src.includes(h.src))) { say(`прах: rsDustable(${h.id}) расходится с rules.dustSrc`); break; }
  for (let c = 1; c <= 6; c++) {
    fresh(); T.S.rs.cyc = c;
    const cat = T.hrDustCat(), bad = cat.filter(h => !T.rsDustable(h) || h.src === 'echo');
    if (bad.length) say(`каталог праха · цикл ${c}: в нём герои Эхо — ${bad.slice(0, 3).map(h => h.n).join(', ')}`);
    T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.overlay = { t: 'dust' };
    const o = ovOf(view(`лавка праха · цикл ${c}`));
    if (T.RS.heroes.some(h => h.src === 'echo' && new RegExp(`data-a="(?:ssel|dustbuy|activate)" data-v="(?:du\\d+\\|)?${h.id}[|"]`).test(o))) say(`лавка праха · цикл ${c}: в витрине герои Эхо`);
    if (!/Героев Эхо здесь нет/.test(o)) say(`лавка праха · цикл ${c}: не объяснено, почему в ней нет героев Эхо`);
    if (cat.length && (o.match(/class="hsg"/g) || []).length < cat.length) say(`лавка праха · цикл ${c}: не у каждого собираемого героя стекло осколка с лицом`);
  }
  fresh(); T.S.acc.cycle = 6;
  const e = T.RS.heroes.find(h => h.src === 'echo' && h.c <= 6 && !T.rsHas(h));
  T.S.wallet.dust = 1e6; const d0 = T.S.wallet.dust, s0 = T.S.rs.shards[e.id] || 0;
  run('прах · осколок героя Эхо', () => T.ACT.dustbuy(e.id));
  if (T.S.wallet.dust !== d0 || (T.S.rs.shards[e.id] || 0) !== s0) say(`прах: ACT.dustbuy продал осколок героя Эхо ${e.n}`);
  if (!T.S.toast || !/Эхо/.test(T.S.toast.t)) say('прах: отказ по герою Эхо не объяснён игроку');
  fresh(); T.S.acc.cycle = 6; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.overlay = { t: 'hrecho' };
  const o = ovOf(view('витрина · без праха'));
  if (/data-a="dustbuy"/.test(o) || /data-v="hrdust"/.test(o)) say('витрина отряда недели: в ней прах — осколки героев Эхо за прах');
  if (typeof T.zpCardHero === 'function') {
    fresh(); T.S.acc.cycle = 6;
    const y = T.RS.heroes.find(h => h.src === 'echo' && h.c <= 6 && !T.rsHas(h)), r0 = T.RS.heroes.find(h => h.src === 'roulette' && h.c <= 6 && !T.rsHas(h));
    const cardE = run('запасы · осколки героя Эхо', () => T.zpCardHero({ h: y, q: 7, key: 'hero:' + y.id })) || '';
    const cardR = run('запасы · осколки героя рулетки', () => T.zpCardHero({ h: r0, q: 7, key: 'hero:' + r0.id })) || '';
    if (/data-a="dustbuy"/.test(cardE)) say('запасы: у героя Эхо есть «Осколок» за прах');
    if (!/только из сундуков Эхо/.test(cardE) || !cardE.includes(`data-a="activate" data-v="${y.id}"`)) say('запасы: у героя Эхо нет объяснения или «Пробудить»');
    if (!cardR.includes(`data-a="dustbuy" data-v="${r0.id}"`)) say('запасы: у героя рулетки пропал «Осколок» за прах');
  }
}

/* ================== 5г. осколок героя: стекло с лицом, без маски-картинки ================== */
{
  const A = T.ART_ICONS, sg = T.shardGhost, art = p => fs.existsSync(path.join(UI, 'assets', 'art', p));
  if (!A || !sg) say('осколок: нет ART_ICONS или shardGhost (screens/art-icons.js)');
  else {
    for (const p of A.ready) if (!art(p)) say(`арт значков: ${p} в ART_ICONS.ready, а файла нет`);
    const G = Object.values(A.glass), gotG = G.filter(p => A.ready.includes(p)).length;
    if (gotG && gotG !== G.length) say('осколок: выгружены не все слои стекла — маска, кромка и трещины ложатся только вместе');
    for (const p of G) if (!A.ready.includes(p) && !A.want.includes(p)) say(`осколок: слой ${p} ни в ready, ни в want`);
    if (!Number.isInteger(A.heal) || A.heal < 0 || A.heal > 100) say('осколок: ART_ICONS.heal — не целая доля 0…100');
    /* с портретом — герой рулетки; без портрета — любой герой без рисунка (у рулетки и Эхо портреты уже у всех) */
    const withArt = T.RS.heroes.find(h => h.src === 'roulette' && T.RS_ART && T.RS_ART.has(h.id));
    const noArt = T.RS.heroes.find(h => h.src === 'roulette' && T.RS_ART && !T.RS_ART.has(h.id)) || T.RS.heroes.find(h => h.src !== 'donat' && T.RS_ART && !T.RS_ART.has(h.id) && !T.rsHas(h));
    fresh();
    for (const [h, got] of [[withArt, 0], [withArt, 20], [withArt, 50], [withArt, 60], [noArt, 7]]) {
      if (!h) { say('осколок: в составе нет героя рулетки с портретом или без'); break; }
      const x = sg(h, got, 50, 64) || '', tag = `осколок ${h.n} ${got}/50`;
      if (!/^<span class="hsg"/.test(x)) { say(`${tag}: не стекло осколка`); continue; }
      if (h === withArt && !x.includes(`heroes/${h.id}.jpg`)) say(`${tag}: в стекле не портрет героя`);
      if (h === noArt && !/class="hsg-face (?:cls|svg)"/.test(x)) say(`${tag}: у героя без портрета нет силуэта класса`);
      if (/hsg-init|>\s*[А-ЯЁA-Z]{1,2}\s*</.test(x)) say(`${tag}: в стекле инициалы вместо лица`);
      if (/class="hsg-face[^"]*"[^>]*opacity/.test(x)) say(`${tag}: лицо гаснет с долей — оно должно быть видно всегда`);
      /* лицо обрезает clip-path, а не маска-картинка: у страницы с диска (file://) маску браузер не грузит — и прячет лицо целиком */
      if (/mask-image:\s*url\(|mask:\s*url\(/.test(x)) say(`${tag}: лицо в стекле — под маской-картинкой: у страницы с диска она не грузится, лица нет`);
      const s = +((x.match(/--s:(\d+)/) || [])[1]), cr = +((x.match(/--cr:(\d+)/) || [])[1]), want = Math.min(100, Math.floor(got * 100 / 50));
      if (s !== want) say(`${tag}: доля --s ${s}, ждали ${want}`);
      if (cr !== 100 - Math.floor(want * A.heal / 100)) say(`${tag}: трещины --cr ${cr}, ждали ${100 - Math.floor(want * A.heal / 100)}`);
      if ((got >= 50) !== / data-full="1"/.test(x)) say(`${tag}: полный комплект ${got >= 50 ? 'не отмечен' : 'отмечен раньше времени'}`);
      for (const p of A.want.filter(q => !A.ready.includes(q))) if (x.includes(p)) say(`${tag}: в разметке невыгруженный ${p}`);
    }
    const AC = read('screens/art-icons.css');
    if (!/\.hsg\[data-k="art"\] \.hsg-in\{clip-path:polygon\(/.test(AC)) say('art-icons.css: лицо в стекле-рисунке не обрезано по обводу маски (clip-path)');
    if (/mask-image:url\(/.test(AC) || /mask-image:\$\{/.test(read('screens/art-icons.js'))) say('art-icons: осталась маска-картинка — у страницы с диска лицо пропадает');
    const faces = new Map();
    for (const c of T.RS.classes) {
      const h = T.RS.heroes.find(q => q.cl && q.cl[0] === c && !(T.RS_ART && T.RS_ART.has(q.id)) && q.src !== 'donat'); if (!h) continue;
      const f = ((sg(h, 0, 50, 64) || '').match(/<span class="hsg-face[\s\S]*?<\/span>(?=<\/span>)/) || [''])[0];
      if (faces.has(f)) say(`осколок: у классов «${faces.get(f)}» и «${c}» один силуэт`);
      faces.set(f, c);
    }
  }
  if (T.DU_ART) for (const p of T.DU_ART.ready) if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`арт лавки: ${p} в DU_ART.ready, а файла нет`);
  if (T.RS_ART) for (const id of T.RS_ART) if (!fs.existsSync(path.join(UI, 'assets', 'art', 'heroes', id + '.jpg'))) say(`портрет ${id} в RS_ART, а файла нет`);
  for (const p of T.HC_ART.ready) if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`рамка карточки: ${p} в HC_ART.ready, а файла нет`);
  fresh();
  for (const title of ['«За души» · алтарь и лавка праха', 'Осколок героя']) {
    const k = T.KIT_EXTRA.find(x => { try { return x.html().includes(`<h3>${title}</h3>`); } catch (_) { return false; } });
    if (!k) { say(`UI-кит: нет раздела «${title}»`); continue; }
    const h = run(`UI-кит · ${title}`, () => k.html()) || '';
    const bad = h.match(/.{0,40}(?:undefined|NaN|\[object ).{0,40}/);
    if (bad) say(`UI-кит · ${title}: в разметке undefined, NaN или [object — «${bad[0]}»`);
    if (!/class="hsg"/.test(h)) say(`UI-кит · ${title}: нет осколка героя`);
  }
}

/* ================== 5д. «За Энериум»: витрина донатного сета ================== */
const priceOf = h => T.RS.rules.stub.donatPrice[h.place - 1];
const niches = h => [...h.matchAll(/<button class="dn-ni[^"]*" style="--k:(\d)"[^>]*data-v="([^"]+)"[\s\S]*?<\/button>/g)].map(m => ({ k: +m[1], id: m[2], html: m[0] }));
for (const team of [false, true]) {
  run('режим', () => T.setTeam(team));
  for (let c = 1; c <= 6; c++) {
    fresh(); T.S.acc.cycle = c; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'donat';
    const tag = `«За Энериум» · цикл ${c}${team ? ' [команда]' : ''}`, h = view(tag), sets = T.dnSets(), s = T.dnSet(), open = s.cycle <= c;
    const N = niches(h);
    if (N.length !== s.members.length) { say(`${tag}: героев на ступенях ${N.length}, в сете ${s.members.length}`); continue; }
    N.forEach((n, i) => { const x = T.RSI[n.id]; if (!x || x.dset !== s.key || n.k !== x.place || x.place !== i + 1) say(`${tag}: ступень ${i + 1} — не ${i + 1}-й герой сета`); else if (!n.html.includes(`<b class="num">${T.fmt(priceOf(x))}</b>`)) say(`${tag}: у ${x.n} на ступени нет цены ${priceOf(x)}`); });
    for (let i = 1; i < N.length; i++) if (priceOf(T.RSI[N[i].id]) <= priceOf(T.RSI[N[i - 1].id])) say(`${tag}: цена не растёт от первого к пятому`);
    if (sets.some(x => !h.includes(`data-a="dcyc" data-v="${x.cycle}"`))) say(`${tag}: не у всех донатных сетов есть вход`);
    if (!h.includes(`data-a="sheet" data-v="hrset:${s.key}"`)) say(`${tag}: нет сет-бонуса строкой`);
    const buy = h.match(/data-a="dbuy" data-v="(dn\d+)\|([^"]+)"/);
    if (open && !buy) say(`${tag}: нет кнопки покупки с номером операции`);
    if (!open && buy) say(`${tag}: сет закрыт, а купить можно`);
    if (buy && !h.includes(`Купить<span class="cost">`)) say(`${tag}: на кнопке покупки нет цены`);
    const txt = playerText(h.slice(h.indexOf('<div class="dn'))), nums = (txt.match(/\d[\d\s ]*/g) || []).filter(x => x.trim()).length;
    if (!team && nums > 14) say(`${tag}: на витрине ${nums} чисел — тесно`);
    T.S.overlay = { t: 'hrset', arg: s.key };
    const o = ovOf(view(`${tag} · сет-бонус`)), st = (o.match(/class="dn-st[ "]/g) || []).length, tiers = T.rsTiers(s.sum);
    if (st !== tiers) say(`${tag} · сет-бонус: ступеней ${st}, по сумме доблестей ${s.sum} — ${tiers}`);
    if (s.members.some(id => !o.includes(`data-a="dsel" data-v="${id}"`))) say(`${tag} · сет-бонус: нет пятерых сета`);
    T.S.overlay = null;
    cnt.cycles++;
  }
}
run('режим «Игрок»', () => T.setTeam(false));
{
  fresh(); T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'donat';
  const s = T.dnSet(), x = T.RSI[s.members[0]], p = priceOf(x);
  T.S.wallet.enerium = p + 5;
  run('покупка · выбрать первого', () => T.ACT.dsel(x.id));
  const m2 = view('покупка · первый выбран').match(/data-a="dbuy" data-v="(dn\d+)\|([^"]+)"/);
  if (!m2 || m2[2] !== x.id) say('покупка: у выбранного героя нет своей кнопки «Купить»');
  else {
    const op = m2[1];
    run('покупка · подтверждение', () => T.ACT.dbuy(`${op}|${x.id}`));
    const o = ovOf(view('покупка · окно подтверждения'));
    if (!o.includes(`data-a="dbuydo" data-v="${op}|${x.id}"`) || !o.includes('0 уровнем') || !o.includes(`останется ${T.fmt(5)}`)) say('покупка: подтверждение без номера, без «с чем приходит» или без остатка Энериума');
    const e0 = T.S.wallet.enerium;
    run('покупка · купить', () => T.ACT.dbuydo(`${op}|${x.id}`));
    if (T.S.wallet.enerium !== e0 - p) say(`покупка: списано ${e0 - T.S.wallet.enerium}, цена ${p}`);
    if (JSON.stringify(T.S.rs.owned[x.id]) !== JSON.stringify({ lvl: 0, lim: 0, valor: 0, how: 'donat' })) say(`покупка: запись коллекции ${JSON.stringify(T.S.rs.owned[x.id])}`);
    if (!T.S.overlay || T.S.overlay.t !== 'hrgot') say('покупка: нет окна получения героя');
    const e1 = T.S.wallet.enerium; run('покупка · повтор номера', () => T.ACT.dbuydo(`${op}|${x.id}`));
    if (T.S.wallet.enerium !== e1) say('покупка: повтор номера списал Энериум ещё раз');
    run('к развитию', () => T.ACT.dngo(x.id));
    if (T.S.route !== 'heroes' || T.S.seg.heroes !== 'coll' || T.S.hview !== 'mine' || !T.H(T.S.selHero)) say('«К развитию»: не ведёт в большую карточку купленного героя');
  }
}
{
  const A = T.DN_ART, known = [A.hall, A.frame].concat(T.dnSets().map(s => A.emblem(s.key)));
  for (const p of A.ready) { if (!known.includes(p)) say(`арт витрины: неизвестный путь ${p}`); if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`арт витрины: ${p} в DN_ART.ready, а файла нет`); }
}
for (const [n, , f] of T.FLOWS.filter(x => /Энериум|отряд|Коллекция|Каталог|карточка|золото/i.test(x[0]))) { fresh(); run('сценарий ' + n, () => f()); view(`сценарий «${n}»`); }

/* ================== 5е. Сила коллекции (§10.3, ADR-0031, п. 18): одна функция collRp на все экраны ================== */
run('сила коллекции', () => {
  const X = { collHero: T.collHero, collPct: T.collPct, R: T.collRule(), EV: T.EV, top: T.INV.hero.capByLim.length - 1 }, R = X.R;
  if (!R) { say('сила коллекции: нет правила EN_EVENT.rp1'); return; }
  const hero = o => Object.assign({ r: 2, c: 3, lim: 0, valor: 0 }, o), unit = R.perBp * 2 * 3;
  const want = [[{}, 1, 0], [{ lim: 1 }, 1, unit], [{ lim: 1 }, 2, 0], [{ valor: 1 }, 1, unit], [{ valor: 1, lim: 1 }, 1, unit * 2], [{ valor: 2, lim: 3 }, 5, unit * 2],
    [{ valor: 2, lim: 3 }, 3, unit * 4], [{ valor: 1, keep: 1 }, 1, unit], [{ valor: 1, keep: 1 }, 2, 0], [{ valor: R.maxValor + 3, lim: X.top }, 1, unit * 2 ** R.maxValor]];
  for (const [o, k, w] of want) { const v = X.collHero(hero(o), k); if (v !== w || !Number.isInteger(v)) say(`сила коллекции: герой ${JSON.stringify(o)}, РП${k} — ${v}, ждали ${w}`); }
  fresh();
  const rp = [1, 2, 3, 4, 5].map(k => T.collRp(k));
  if (rp.some(v => !Number.isInteger(v) || v < 0 || v > R.capBp)) say(`сила коллекции: не целые или выше потолка — ${rp.join(', ')}`);
  const sum = [1, 2, 3, 4, 5].map(k => Math.min(R.capBp, T.hrMine().reduce((a, h) => a + X.collHero(h, k), 0)));
  if (sum.join() !== rp.join()) say(`сила коллекции: сумма по героям коллекции ${sum.join(', ')}, collRp — ${rp.join(', ')}`);
  const h = collView('сила коллекции · кнопка'), chip = (h.match(/class="collpow[^"]*"[\s\S]*?<span class="chip spirit">([^<]*)<\/span>/) || [])[1];
  if (chip !== '+' + X.collPct(rp[0])) say(`сила коллекции: на кнопке «${chip}», РП1 — +${X.collPct(rp[0])}`);
  T.S.overlay = { t: 'coll' }; const sh = ovOf(view('сила коллекции · лист')), vs = [...sh.matchAll(/<span class="v">([^<]*)<\/span>/g)].map(m => m[1]);
  if (vs.join('|') !== rp.map(v => '+' + X.collPct(v)).join('|')) say(`сила коллекции: в листе «${vs.join(' ')}», collRp — ${rp.map(X.collPct).join(' ')}`);
  if (X.EV && X.EV.rp1() !== rp[0]) say(`сила коллекции: Событие считает РП1 ${X.EV.rp1()}, collRp — ${rp[0]}`);
});

/* ================== 6. режим «Команда»: сетки и карточки рисуются ================== */
run('режим «Команда»', () => T.setTeam(true));
fresh(); collView('коллекция [команда]'); collView('каталог [команда]', { all: true });
T.S.hview = 'mine'; T.S.selHero = 'h2'; view('большая карточка [команда]');
T.S.hview = 'rs'; T.S.rs.sel = T.RS.heroes[0].id; T.S.seg.rhero = 'path'; view('карточка героя состава [команда]');
run('режим «Игрок»', () => T.setTeam(false));

/* ================== 7. вёрстка — расчётом на 932 × 430 и 844 × 390 ==================
   Размеры — из стилей (index.html, heroes.css) и данных вида (HC_VIEW): рабочая область — телефон без шапки и шахты, поля экрана --sp-m */
{
  const V = T.HC_VIEW, spM = +((html.match(/--sp-m:(\d+)px/) || [])[1] || 12), spS = +((html.match(/--sp-s:(\d+)px/) || [])[1] || 8);
  const cssN = (re, what, d) => { const m = CSS.match(re); if (!m) { say(`вёрстка: в стилях нет ${what}`); return d; } return +m[1]; };
  const gapCss = cssN(/\.hkg\{[^}]*gap:var\(--hk-gap,(\d+)px\)/, 'промежутка сетки', 8), barH = 32;
  const lvW = cssN(/\.hk-lv,\.hk-el\{position:absolute;top:(\d+)px/, 'кружков уровня и стихии', 6);
  const rpW = cssN(/\.hk\{[^}]*--rp-w:(\d+)cqw/, '--rp-w карточки', 11), postTop = cssN(/\.hk \.rp\.t\{[^}]*top:max\((\d+)px/, 'верха столба камней', 46);
  const postTopPct = cssN(/\.hk \.rp\.t\{[^}]*top:max\(\d+px,(\d+)%\)/, 'верха столба камней в %', 24), postBot = cssN(/\.hk \.rp\.t\{[^}]*bottom:(\d+)%/, 'низа столба камней', 33);
  const [ar1, ar2] = (read('screens/hero-dev.css').match(/\.rp-s\{[^}]*aspect-ratio:(\d+)\/(\d+)/) || [0, 40, 58]).slice(1).map(Number);
  if (V.gap !== gapCss) say(`вёрстка: промежуток сетки в данных ${V.gap}, в стилях по умолчанию ${gapCss}`);
  const clampV = (lo, k, hi, w) => Math.max(lo, Math.min(hi, w * k / 100));
  for (const [k, X] of [{ n: '932 × 430', W: 932, H: 430, top: 46, rail: 78 }, { n: '844 × 390', W: 844, H: 390, top: 44, rail: 72 }].entries()) {
    const inW = X.W - X.rail - 2 * spM, inH = X.H - X.top - 2 * spM;
    /* сетка: карточка не уже HC_VIEW.card, видно больше одной строки — сетку тянет листать */
    const gridW = inW + 8 - 10, gridH = inH - barH - spS + 8 - 12, min = V.card[k], cols = Math.floor((gridW + V.gap) / (min + V.gap)), cw = (gridW - (cols - 1) * V.gap) / cols, ch = cw * 16 / 9;
    const rows = (gridH + V.gap) / (ch + V.gap);
    if (cols < 5) say(`вёрстка ${X.n}: в строке сетки ${cols} карточек — мало`);
    if (cw < min) say(`вёрстка ${X.n}: карточка ${cw.toFixed(0)} px — уже ${min}`);
    if (rows < 1.15) say(`вёрстка ${X.n}: видно ${rows.toFixed(2)} строки сетки — вторую не видно, листать неочевидно`);
    /* знаки у вершины и столбы камней не налезают друг на друга и на низ карточки */
    const crest = clampV(18, 17, 40, cw), star = clampV(10, 9, 18, cw), circle = clampV(22, 19, 38, cw), arc = Math.floor(16 * V.arc / 4);
    const topZone = Math.max(lvW + circle, 4 + crest + star + arc), pTop = Math.max(postTop, ch * postTopPct / 100), pBot = ch * postBot / 100;
    const bw = clampV(3, 3, 7, cw), bottomZone = bw + 3 + 22 + 4 + 21;   // низ: рамка, строка класса и мощи, промежуток, плашка имени
    if (pTop < lvW + circle + 2) say(`вёрстка ${X.n}: столб камней начинается под кружком уровня (${pTop.toFixed(0)} px, кружок до ${(lvW + circle).toFixed(0)})`);
    if (pBot < bottomZone + 2) say(`вёрстка ${X.n}: нижний камень залезает на плашку имени`);
    const sw = cw * rpW / 100, sh = sw * ar2 / ar1, post = ch - pTop - pBot, per = Math.max(Math.min(T.RP_VIEW.split, TOP()), TOP() - Math.min(T.RP_VIEW.split, TOP())), step = (post - per * sh) / Math.max(1, per - 1);
    if (step < 1) say(`вёрстка ${X.n}: камни в столбе карточки налезают — шаг ${step.toFixed(1)} px`);
    const starsW = 5 * star + 4, gapTop = cw - 2 * (6 + circle);
    if (starsW > cw - 2 * sw - 8) say(`вёрстка ${X.n}: пять звёзд доблести шире карточки между камнями`);
    if (crest > gapTop) say(`вёрстка ${X.n}: гребень не помещается между кружками уровня и стихии`);
    const [fLo, fK, fHi] = (CSS.match(/\.hk-lv b\{font:700 clamp\((\d+)px,(\d+)cqw,(\d+)px\)/) || [0, 8, 7, 13]).slice(1).map(Number);
    const lvlFont = clampV(fLo, fK, fHi, cw); if (4 * lvlFont * 0.55 > circle - 4) say(`вёрстка ${X.n}: четыре цифры уровня не входят в кружок ${circle.toFixed(0)} px`);
    const nameW = cw - 2 * (bw + 3) - 12; if (nameW < 70) say(`вёрстка ${X.n}: на имя в плашке ${nameW.toFixed(0)} px`);
    /* большая карточка: портрет по высоте в пропорции HC_VIEW.big, не шире bigMax %; правая колонка — развитию хватает ширины */
    const pw = Math.min(inW * V.bigMax / 100, inH * V.big[0] / V.big[1]), rw = inW - pw - spM, headH = k ? 80 : 84;
    if (pw < 180) say(`вёрстка ${X.n}: портрет большой карточки ${pw.toFixed(0)} px — мелко, не рассмотреть`);
    if (rw < 440) say(`вёрстка ${X.n}: правая колонка большой карточки ${rw.toFixed(0)} px — развитию тесно`);
    const preBody = inH - headH - spS - 36 - spS - (k ? 50 : 58) - spS;
    if (preBody < 90) say(`вёрстка ${X.n}: у карточки «до покупки» на вкладку ${preBody} px`);
    /* витрина отряда недели: пять карточек в ряд — по ширине и высоте ряда */
    const wW = Math.min(904, X.W - 28), wH = X.H - 20, headW = k ? 60 : 68, footW = 44, stage = wH - headW - footW - 2 * spS - spM, rowW = wW - 2 * spM;
    const ew = Math.min((rowW - 4 * V.echo) / 5, (stage - 12) * 9 / 16);
    if (ew < 110) say(`вёрстка ${X.n}: карточка витрины отряда недели ${ew.toFixed(0)} px — мелко`);
    cnt.lay.push(`${X.n}: сетка ${cols} в ряд, карточка ${cw.toFixed(0)} × ${ch.toFixed(0)}, видно ${rows.toFixed(2)} строки, камень ${sw.toFixed(1)} × ${sh.toFixed(1)}, шаг ${step.toFixed(1)}; большая карточка — портрет ${pw.toFixed(0)} × ${inH}, справа ${rw.toFixed(0)} px, у «до покупки» на вкладку ${preBody} px; витрина отряда недели — карточка ${ew.toFixed(0)} × ${(ew * 16 / 9).toFixed(0)}`);
  }
}

/* ================== 8. UI-кит «Карточка героя» и карта экранов ================== */
{
  fresh();
  const k = T.KIT_EXTRA.find(x => x.html === T.hcKitHtml);
  if (!k) say('UI-кит: нет раздела «Карточка героя»');
  else for (const team of [false, true]) {
    run('режим', () => T.setTeam(team)); fresh();
    const h = run('UI-кит · карточка', () => k.html()) || ''; cnt.views++;
    if (!/<h3>Карточка героя<\/h3>/.test(h)) { say('UI-кит: раздел «Карточка героя» не рисуется'); continue; }
    const bad = h.match(/.{0,40}(?:undefined|NaN|\[object ).{0,40}/); if (bad) say(`UI-кит · карточка: undefined, NaN или [object — «${bad[0]}»`);
    const tiers = [...h.matchAll(/<figure class="hck-t"><div class="hck-c"><button class="hk[^"]*" data-r="\d" data-t="(\d)"/g)].map(m => m[1]).slice(0, 3);
    if (tiers.join() !== '1,2,3') say(`UI-кит: три ступени на одном герое — ${tiers.join(', ')}, ждали 1, 2, 3`);
    if (!/class="hk-max"/.test(h)) say('UI-кит: у высшей ступени нет ленты «максимум»');
    if (!/<button class="hk[^"]* gray/.test(h) || !/class="hk-sh full"/.test(h) || !/<button class="hk[^"]* lock/.test(h)) say('UI-кит: нет состояний каталога — несобранный, собранный комплект, закрытый цикл');
    if (count(h, /<div class="hcb"/g) < 2) say('UI-кит: нет большой карточки героя аккаунта и «до покупки»');
    if (!/<div class="ov he-ov/.test(h)) say('UI-кит: нет витрины отряда недели');
    if (!team) scan(h, 'UI-кит · карточка');
  }
  run('режим «Игрок»', () => T.setTeam(false));
  const heroes = html.match(/\{ n: 'Герои'[\s\S]*?\},\r?\n/);
  for (const id of ['heroes', 'hero', 'hero-story', 'orders', 'collection-passives', 'hire-preview', 'recruitment']) if (!heroes || !new RegExp(`ready:\\s*\\[[^\\]]*'${id}'`).test(heroes[0])) say(`карта экранов: ${id} не отмечен готовым у «Героев»`);
}
done();
