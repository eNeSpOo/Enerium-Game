/* Автопроверка экрана «Герои» (design/ui/screens/heroes.js): коллекция, плитка и карточка героя, «Призыв» — без браузера.
   1. index.html подключает heroes.css и heroes.js после model.js; heroes.js компилируется и в CRLF. Прежнего кода в index.html нет: плитки
      с кристаллом стихии в углу (el(…, true) в плитке), экрана heroes(), колонок «За души», прежних sq, sqBM и листа prep; .hc — в heroes.css.
   2. Плитка — одна анатомия: кристалл редкости (--rico, ADR-0027) и data-r; значков доблести ровно по личному максимуму, светятся
      взятые; у героя аккаунта — рунные пределы двумя зеркальными столбами по пять камней по бокам портрета (горят пройденные,
      следующий — по запасам) и уровень; класс значком; у героя состава вне коллекции — цикл и никаких камней. Кристалла стихии в плитке
      нет, прежних отметок .limits нет. Строки — кристалл у лица рисует CSS (.rs-av::after с --rico).
   2б. Рунные пределы (слово автора 29.09.2026 — «по бокам» героя): на потолке уровня следующий камень тлеет, с рунами — пульсирует,
      на плитке и в шапке одинаково; у чужого героя — только горящие и погасшие; UI-кит задаёт состояние явно. Вёрстка плитки — расчётом
      по стилям на ширинах коллекции, редактора отряда и UI-кита: камень не мельче 4,5 px, не налезает на кристалл, доблесть, соседей
      и строку уровня, имени остаётся не меньше 44 px.
   3. Шапка карточки героя аккаунта: боевая мощь, доблесть «текущая / максимальная», уровень «N / потолок», лицо между двумя столбами
      рунных камней с подписью предела, кристалл редкости у названия редкости, класс значком. У героя состава вне коллекции —
      потенциал доблести и лицо без камней.
   4. Купленный герой состава — герой аккаунта: запись коллекции — 0 ур., 0 РП, 0 Добл; H(id) находит его в форме S.heroes; «Мои»
      показывают его плитку, карточку с развитием на всех вкладках; уровень поднимается за дух и пишется в запись коллекции; БМ — целое
      по §6. У героя Эхо — набор из echo-foes.js.
   4б. Боевая мощь — одна функция BM (index.html, §6): в initialState числа нет, h.bm — свойство для чтения; независимый пересчёт
      C × √(УВС × ЭЗ) по карте ядра сходится у героев, после уровня и со слоями талисманов и снаряжения; одно число на плитке
      «Пятёрки сильнейших» (все герои аккаунта), в шапке, в библиотеке отрядов и листе выбора отряда; соперник Арены, цель Эхо
      и цель клана — та же формула, C одна у героев, бестиария и клана; у клана видна мощь отряда атаки.
   5. «Призыв → За души» (правила воздуха): сцена алтаря (hrSoulsView) — вход рулетки с героями пула и «К рулетке»; отряд Эхо недели —
      входом с листом hrecho, лавка праха — отдельным окном dust; в самой вкладке строк-списков нет.
   5а. Лавка праха — окно (слово автора 29.09.2026: «магазин праха… отдельным окном»): витрина героев пула доступных циклов — стекло
      с лицом, цена осколка и доля; выбранный — справа. Осколки за прах — 1, 10 и до комплекта — и пробуждение за души — операции
      SOUL_SRV с номером: списано ровно цена, повтор номера ничего не меняет, отказы (нехватка, лишнее, герой Эхо) — без расхода и словами.
      Пробуждение — подтверждение в том же окне, затем окно пробуждения; герой — 0 ур., 0 РП, 0 Добл, лишние осколки — в прах (§15.2).
      Вёрстка окна считается на 932 × 430 и 844 × 390: две строки витрины и выбранный герой входят без прокрутки окна.
   5б. Дыра праха закрыта (слово автора 29.09.2026): правило в данных — rules.dustSrc без героев Эхо; лавка праха на всех циклах без
      героев Эхо и с объяснением; ACT.dustbuy отказывает героям Эхо словами и ничего не списывает; в листе отряда недели — «Пробудить» за
      души и никакого праха, лишние осколки — в прах (§15.2); в запасах у героя Эхо нет «Осколка» за прах.
   5г. Осколок героя по образцу автора (shardGhost): всегда стекло с лицом — class="hsg", лицо — портрет героя, у героя без портрета —
      силуэт класса, не инициалы; лицо не гаснет с долей — доля в --s и заживающих трещинах --cr, полный комплект — data-full.
      Арт: выгруженные пути (ART_ICONS.ready, DU_ART.ready, RS_ART) лежат в assets/art; слои стекла — все три или ни одного.
   5в. «За Энериум» — витрина: пятеро на ступенях цены по местам, цены растут и видны; входы всех сетов; сет-бонус строкой и листом со
      ступенями по сумме доблестей, N ступеней и пятерыми; кнопка покупки с номером и ценой. Покупка — подтверждение с остатком,
      одна операция DN_SRV (списано ровно цена, герой — 0 ур., 0 РП, 0 Добл), окно получения и «сразу итог», повтор номера ничего
      не меняет, отказы — без расхода, нехватка — сколько и где пополнить, цикл I — купить нельзя. В режиме «Игрок» — без служебного.
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
  for (const x of cnt.lay || []) console.log('рунные камни: ' + x);
  console.log('Проверка пройдена: плитка, строка и карточка героя — с одобренным кристаллом, доблестью, пределом рунными камнями по бокам портрета, уровнем и классом; «За души» — сцена алтаря с рулеткой, отряд Эхо входом, лавка праха окном с операциями с номером; осколок — стекло с лицом героя; героев Эхо прахом не собрать; «За Энериум» — ступени цены, сет-бонус по ступеням, покупка с номером и окно получения; в режиме «Игрок» служебного нет.');
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
    [/\n  (?:psq|esq|sqadd|sqnew)\(/, 'прежние действия отрядов'], [/\n  spin\(\) \{/, 'прежняя прокрутка «по очереди»'],
    [/\n  (?:dustbuy|activate|activatedo)\(v\) \{/, 'прежние осколок за прах и пробуждение без номера операции']];
  for (const [re, what] of OLD) if (re.test(main) || (what.startsWith('стили') && re.test(html))) say(`index.html: остался ${what}`);
  const souls = main.match(/function rsSoulsView\(\)[\s\S]*?\n\}/);
  if (!souls || !/hrSoulsView\(\)/.test(souls[0])) say('index.html: «За души» (rsSoulsView) не собирает сцену алтаря hrSoulsView');
  if (!/function hrSoulsView\(\)[\s\S]*?rlCol\(\)[\s\S]*?hrSoulsSide\(\)/.test(js)) say('heroes.js: сцена алтаря hrSoulsView не собирает вход рулетки rlCol и входы hrSoulsSide');
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
    hrTile, hrHead, BAG, heroDev: typeof heroDev === 'function' ? heroDev : null, rpNext: typeof rpNext === 'function' ? rpNext : null,
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
/* плитки из разметки: <button class="hc…"> … </button> */
const tilesOf = h => [...h.matchAll(/<button class="hc[^"]*"[\s\S]*?<\/button>/g)].map(m => m[0]);
const ovOf = h => { const i = h.indexOf('<div class="ov'); return i < 0 ? '' : h.slice(i); };
const count = (s, re) => (s.match(re) || []).length;
const starsOf = t => { const m = t.match(/<span class="stars[^"]*"[^>]*>([\s\S]*?)<\/span>/); return m ? { all: count(m[1], /<i/g), on: count(m[1], /<i class="on"/g) } : null; };
/* рунные пределы — два столба камней по бокам портрета (знак — screens/hero-dev.js): kind t — плитка, h — шапка; side l и r;
   st — состояния камней I…V: on, off, wait, ready */
const postsOf = (t, kind) => [...t.matchAll(/<span class="rp (t|h) (l|r)" aria-hidden="true">([\s\S]*?)<\/span>/g)].filter(m => !kind || m[1] === kind)
  .map(m => ({ kind: m[1], side: m[2], st: [...m[3].matchAll(/<i class="rp-s (on|off|wait|ready)"><\/i>/g)].map(x => x[1]), n: count(m[3], /<i /g) }));
const TOP = () => T.INV.hero.capByLim.length - 1;
/* два зеркальных столба по TOP камней: горят ровно lim, следующий — nx или погасший, дальше — погасшие */
function checkPosts(t, where, kind, lim, nx) {
  const P = postsOf(t, kind);
  if (P.length !== 2 || P[0].side !== 'l' || P[1].side !== 'r') { say(`${where}: столбов рунных камней ${P.length} — ждали два, слева и справа`); return; }
  const want = Array.from({ length: TOP() }, (_, k) => k < lim ? 'on' : k === lim && nx ? nx : 'off').join(' ');
  for (const p of P) if (p.n !== TOP() || p.st.join(' ') !== want) say(`${where}: столб ${p.side === 'l' ? 'слева' : 'справа'} — «${p.st.join(' ')}», ждали «${want}»`);
  if (/class="limits"/.test(t)) say(`${where}: остались прежние отметки .limits`);
}

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
    checkPosts(t, where, 't', x.lim, x.nx || '');
    if (!/^<button class="hc rpp[ "]/.test(t)) say(`${where}: у плитки с пределами нет отступа имени от камней (.rpp)`);
    if (!new RegExp(`<small>ур\\.</small><b class="num">${x.lvl}</b>`).test(t)) say(`${where}: на плитке нет уровня ${x.lvl}`);
  } else {
    if (!t.includes(`цикл ${T.ROMAN[x.c]}`)) say(`${where}: у героя вне коллекции нет цикла на плитке`);
    if (postsOf(t).length || / rpp[ "]/.test(t)) say(`${where}: у героя вне коллекции — рунные камни, а пределов у него нет`);
  }
}
const nxOf = h => (h && T.rpNext ? T.rpNext(h) : '');
/* «Мои»: каждый герой аккаунта */
fresh();
T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine';
{
  /* герои аккаунта — отряд прототипа и купленные: у демо (11-й день цикла II, ADR-0031, п. 17) их 16 */
  const h = view('коллекция · мои'), tiles = tilesOf(h), mineH = T.hrMine();
  if (tiles.length !== mineH.length) say(`«Мои»: плиток ${tiles.length}, героев ${mineH.length}`);
  mineH.forEach((x, i) => { const t = tiles.find(y => y.includes(`data-v="${x.id}"`)); if (!t) say(`«Мои»: нет плитки ${x.name}`); else checkTile(t, `«Мои» · ${x.name}`, { r: x.r, maxV: x.maxV, valor: x.valor, own: true, lim: x.lim, lvl: x.lvl, nx: nxOf(x) }); });
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
    checkTile(t, `«Все» · ${x.n}`, { r: v.r, maxV: v.maxV, valor: v.valor, own: v.own, lim: v.lim, lvl: v.lvl, c: x.c, nx: v.acc ? nxOf(v.acc) : '' });
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
  for (const tab of ['power', 'gear', 'skills', 'path']) {
    T.S.seg.hero = tab; const h = view(`карточка · ${x.name} · ${tab}`), i = h.indexOf('<div class="hd-top">'), top = i < 0 ? '' : h.slice(i, h.indexOf('<div class="hd-body">', i));
    if (tab !== 'power') continue;
    cnt.heads++;
    if (!top.includes(`<span class="rar" data-r="${x.r}">`)) say(`шапка · ${x.name}: нет кристалла редкости`);
    if (!/icons\/power\.png/.test(top) || !top.includes(T.fmt(x.bm))) say(`шапка · ${x.name}: нет боевой мощи`);
    if (!top.includes(`<small class="num">${x.valor} / ${x.maxV}</small>`)) say(`шапка · ${x.name}: нет доблести «${x.valor} / ${x.maxV}»`);
    if (!top.includes(`<b class="num">${x.lvl}</b><small class="faint num">/ ${x.cap}</small>`)) say(`шапка · ${x.name}: нет уровня «${x.lvl} / ${x.cap}»`);
    checkPosts(top, `шапка · ${x.name}`, 'h', x.lim, nxOf(x));
    if (!new RegExp(`<div class="hd-rp" role="img" aria-label="Рунный предел ${x.lim} из ${TOP()}"`).test(top)) say(`шапка · ${x.name}: лицо не в раме рунных камней или без подписи «Рунный предел ${x.lim} из ${TOP()}»`);
    if (!/icons\/cls-[a-z]+\.png/.test(top)) say(`шапка · ${x.name}: нет значка класса`);
  }
}
{
  const x = T.RS.heroes.find(h => h.src === 'roulette' && !T.rsHas(h));
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'all'; T.S.rs.sel = x.id;
  const h = view('карточка героя состава'), top = h.slice(h.indexOf('<div class="hd-top">'));
  if (!top.includes(`доблесть до ${x.maxV}`) || !top.includes(`<span class="rar" data-r="${x.r}">`)) say('карточка героя состава: нет потенциала доблести или кристалла редкости');
  const head = top.slice(0, Math.max(0, top.indexOf('<div class="hd-body">')));
  if (postsOf(head).length || head.includes('class="hd-rp"')) say('карточка героя состава: у героя вне коллекции — рунные камни, а пределов у него нет');
  cnt.heads++;
}

/* ================== 2б. рунные пределы: следующий камень, чужие герои, вёрстка плитки ==================
   Слово автора 29.09.2026: чёрточки предела у уровня — «слабо», пределы — «по бокам» героя. Следующий камень на потолке уровня тлеет
   (wait), а когда рун хватает — пульсирует (ready), на плитке и в шапке одинаково; у героя соперника и чужого профиля — только горящие
   и погасшие: запасы не наши. Вёрстка — расчётом размеров по стилям на реальных ширинах плитки */
{
  const tileOf = id => tilesOf(view(`пределы · ${id}`)).find(y => y.includes(`data-v="${id}"`)) || '';
  const headOf = () => { const g = P.game(), i = g.indexOf('<div class="hd-top">'); return i < 0 ? '' : g.slice(i, g.indexOf('<div class="hd-body">', i)); };
  const mine = id => { T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.seg.hero = 'power'; T.S.selHero = id; T.S.overlay = null; };
  fresh();
  const h2 = T.H('h2'), d2 = T.heroDev(h2);   // 150 из 150, руны предела II в запасах (демо — 11-й день цикла II)
  if (!(h2.lvl >= h2.cap) || !d2.rune || d2.have < d2.need) say('пределы: у героя h2 в демо не потолок уровня или мало рун — сценарий «можно пробить» не проверить');
  mine('h2');
  let t = tileOf('h2'); checkPosts(t, 'пределы · можно пробить · плитка', 't', h2.lim, 'ready'); checkPosts(headOf(), 'пределы · можно пробить · шапка', 'h', h2.lim, 'ready');
  if (!/можно пробить следующий/.test((t.match(/aria-label="([^"]*)"/) || [])[1] || '')) say('пределы: подпись плитки не говорит, что предел можно пробить');
  T.BAG.take(d2.rune.id, T.BAG.qty(d2.rune.id) - (d2.need - 1));
  t = tileOf('h2'); checkPosts(t, 'пределы · мало рун · плитка', 't', h2.lim, 'wait'); checkPosts(headOf(), 'пределы · мало рун · шапка', 'h', h2.lim, 'wait');
  const h1 = T.H('h1'); mine('h1');
  if (h1.lvl >= h1.cap) say('пределы: h1 в демо на потолке — сценарий «уровень растёт» не проверить');
  checkPosts(tileOf('h1'), 'пределы · уровень растёт · плитка', 't', h1.lim, '');
  /* чужой герой: та же плитка и шапка без запасов аккаунта — ни тлеющего, ни пульсирующего */
  fresh(); const hx = T.H('h2'), vx = Object.assign(T.hrV(hx), { acc: null, lim: 2 });
  checkPosts(T.hrTile(vx, { act: 'noop', bm: true }), 'пределы · чужой герой · плитка', 't', 2, '');
  checkPosts(T.hrHead(vx), 'пределы · чужой герой · шапка', 'h', 2, '');
  /* UI-кит задаёт состояние явно */
  checkPosts(T.hrTile(T.hrV(T.H('h1')), { act: 'noop', rpNext: 'ready' }), 'пределы · UI-кит', 't', T.H('h1').lim, 'ready');
  cnt.tiles += 7; cnt.heads += 3;

  /* вёрстка: камни по бокам плитки — от кристалла и доблести до строки уровня, имя отступает от них, строка уровня — во всю ширину */
  const DEV = read('screens/hero-dev.css'), HCSS = read('screens/heroes.css');
  const num = (css, re, what) => { const m = css.match(re); if (!m) { say(`вёрстка плитки: в стилях нет ${what}`); return null; } return m.slice(1).map(Number); };
  const [rpw] = num(DEV, /\.hc\{container-type:inline-size;--rp-w:(\d+)cqw\}/, '.hc — контейнер и --rp-w в cqw') || [0];
  const [pTop, pPct, pBot] = num(DEV, /\.hc \.rp\.t\{[^}]*top:max\((\d+)px,(\d+)%\);bottom:(\d+)px/, 'столба .hc .rp.t') || [0, 0, 0];
  const [pl, pr] = num(HCSS, /\.hc\.rpp \.nm\{padding:0 calc\(var\(--rp-w\) - (\d+)px\) 0 calc\(var\(--rp-w\) - (\d+)px\)\}/, 'отступа имени .hc.rpp .nm') || [0, 0];
  const [ar1, ar2] = num(DEV, /\.rp-s\{[^}]*aspect-ratio:(\d+)\/(\d+)/, 'пропорции камня .rp-s') || [40, 58];
  const [crL, crT, crW] = num(HCSS, /\.hc \.cr\{position:absolute;left:(\d+)px;top:(\d+)px;z-index:2;width:(\d+)px/, 'кристалла .hc .cr') || [4, 4, 17];
  const [stT] = num(HCSS, /\.hc \.top\{position:absolute;right:\d+px;top:(\d+)px/, 'доблести .hc .top') || [5];
  const [stW] = num(HCSS, /\.hc \.stars i\{width:(\d+)px/, 'значка доблести') || [11];
  const [bL, bR, bB] = num(HCSS, /\.hc \.bot\{position:absolute;left:(\d+)px;right:(\d+)px;bottom:(\d+)px/, 'низа плитки .hc .bot') || [6, 5, 5];
  const metaH = 13;   // строка уровня: значок класса 13 px — выше числа
  /* ширины плитки: коллекция (3 в ряд), редактор отряда (5 в ряд), UI-кит — по стилям index.html и heroes.css */
  const I = html, px1 = (re, d) => { const m = I.match(re); return m ? +m[1] : d; };
  const spM = px1(/--sp-m:(\d+)px/, 12), sqL = +((HCSS.match(/\.sq\{display:grid;grid-template-columns:(\d+)px/) || [])[1] || 236);
  const sqMax = +((HCSS.match(/\.hr-sqed \.sq-slots\{max-width:(\d+)px/) || [])[1] || 520), sqMaxSm = +((HCSS.match(/@container main \(max-height: 360px\)\{[\s\S]*?\.hr-sqed \.sq-slots\{max-width:(\d+)px/) || [])[1] || 440);
  const widths = [];
  for (const X of [{ n: '932 × 430', W: 932, rail: 78, sm: false }, { n: '844 × 390', W: 844, rail: 72, sm: true }]) {
    const inW = X.W - X.rail - 2 * spM, left = Math.max(250, Math.floor(inW * 34 / 100)), coll = left - 2 - 2 * spM, g = X.sm ? 6 : 8;
    widths.push([`коллекция ${X.n}`, Math.floor((coll - 2 * g) / 3)]);
    const right = inW - sqL - spM - 2 - 2 * spM, slots = Math.min(right, X.sm ? sqMaxSm : sqMax);
    widths.push([`отряд ${X.n}`, Math.floor((slots - 4 * 8) / 5)]);
  }
  widths.push(['UI-кит', 80], ['UI-кит, крупно', 110]);
  const out = [];
  for (const [n, W] of widths) {
    const H = W * 5 / 4, sw = W * rpw / 100, sh = sw * ar2 / ar1, top = Math.max(pTop, H * pPct / 100), post = H - top - pBot, gap = (post - 5 * sh) / 4;
    if (sw < 4.5) say(`вёрстка плитки · ${n}: камень ${sw.toFixed(1)} px — мельче 4,5 px, не читается`);
    if (gap < 1) say(`вёрстка плитки · ${n}: камни в столбе налезают — шаг ${gap.toFixed(1)} px`);
    if (top < crT + crW) say(`вёрстка плитки · ${n}: столб начинается на ${top.toFixed(1)} px — под кристаллом редкости (до ${crT + crW} px)`);
    if (top < stT + stW) say(`вёрстка плитки · ${n}: столб справа залезает под значки доблести`);
    if (pBot < bB + metaH) say(`вёрстка плитки · ${n}: нижний камень залезает на строку уровня`);
    if (bL + (sw - pl) < 2 + sw + 2 || bR + (sw - pr) < 2 + sw + 1) say(`вёрстка плитки · ${n}: имя залезает на камни`);
    const nameW = W - bL - bR - (sw - pl) - (sw - pr);
    if (nameW < 44) say(`вёрстка плитки · ${n}: на имя остаётся ${nameW.toFixed(0)} px`);
    out.push(`${n} — плитка ${W} px, камень ${sw.toFixed(1)} × ${sh.toFixed(1)}, шаг ${gap.toFixed(1)}, имя ${nameW.toFixed(0)} px`);
  }
  cnt.lay = out;
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
  const body = h.slice(h.indexOf('<div class="hr-souls'));
  if (!/class="pnl rl-entry[ "]/.test(body)) say(`${tag}: нет входа рулетки`);
  if (!/class="rl-scn[ "]/.test(body)) say(`${tag}: нет сцены алтаря`);
  if (open && count(body, /class="rl-ef"/g) !== pool.length) say(`${tag}: лиц пула ${count(body, /class="rl-ef"/g)}, героев пула ${pool.length}`);
  if (open && pool.length && !body.includes('data-a="dlg" data-v="rl"')) say(`${tag}: нет «К рулетке»`);
  if (!body.includes('data-a="sheet" data-v="hrecho"')) say(`${tag}: нет входа отряда Эхо недели`);
  if (!body.includes('data-a="dlg" data-v="dust"')) say(`${tag}: нет входа лавки праха`);
  if (/class="rs-row|rs-col/.test(body)) say(`${tag}: во вкладке остались списки — им место в листах и окнах`);
  /* воздух: во вкладке одна главная вещь; строк текста и кнопок — немного */
  const lines = playerText(body).split('\n').length, btns = count(body, /<button/g);
  if (lines > 24) say(`${tag}: строк текста ${lines} — тесно`);
  if (btns > pool.length + 6) say(`${tag}: кнопок ${btns} — тесно`);
  /* вход отряда Эхо — компактно: осколок стеклом с лицом у каждого героя недели, которого ещё нет в коллекции */
  const W = T.rsWeek(), eb = body.slice(body.indexOf('data-v="hrecho"')), eIn = eb.slice(0, eb.indexOf('</button>'));
  const want = (W ? W.squad : []).filter(id => T.RSI[id] && !T.rsHas(T.RSI[id])).length;
  if (count(eIn, /class="hsg"/g) !== want) say(`${tag}: во входе отряда Эхо осколков ${count(eIn, /class="hsg"/g)}, героев недели не в коллекции ${want}`);
  T.S.overlay = { t: 'hrecho' }; if (!ovOf(view(`${tag} · лист hrecho`)).includes('class="sheet')) say(`${tag}: лист отряда недели не открылся`);
  T.S.overlay = { t: 'dust' }; if (!/^<div class="ov du-ov/.test(ovOf(view(`${tag} · окно лавки`)))) say(`${tag}: окно лавки праха не открылось`);
  T.S.overlay = null;
  cnt.cycles++;
}
for (const team of [false, true]) { run('режим', () => T.setTeam(team)); for (let c = 1; c <= 6; c++) souls(c, team); }
run('режим «Игрок»', () => T.setTeam(false));
/* ================== 5а. лавка праха: окно и операции SOUL_SRV ================== */
{
  fresh(); T.S.rs.shards = {}; T.S.acc.cycle = 2;   // демо-осколки запасов (screens/bag.js) — прочь: считаем с нуля
 T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls';
  const need = T.RS.rules.stub.shards, cat = T.hrDustCat(), x = cat[0], y = cat[1], p = T.rsShardPrice(x);
  T.S.overlay = { t: 'dust' };
  let o = ovOf(view('лавка'));
  /* витрина: все герои лавки карточками — стекло с лицом, цена осколка и доля собранного */
  const cards = [...o.matchAll(/<button class="du-c[^"]*" data-r="\d" data-a="ssel" data-v="([^"]+)"[\s\S]*?<\/button>/g)];
  if (cards.length !== cat.length) say(`лавка: карточек ${cards.length}, героев в лавке ${cat.length}`);
  for (const m of cards) {
    const h = T.RSI[m[1]]; if (!h) { say(`лавка: карточка неизвестного героя ${m[1]}`); continue; }
    if (!m[0].includes('class="hsg"')) say(`лавка: у ${h.n} на карточке нет стекла с лицом`);
    if (!m[0].includes(`>${T.fmt(T.rsShardPrice(h))}</span>`)) say(`лавка: у ${h.n} на карточке нет цены осколка ${T.rsShardPrice(h)}`);
    if (!m[0].includes(`${T.fmt(T.S.rs.shards[h.id] || 0)}/${need}`)) say(`лавка: у ${h.n} на карточке нет доли собранного`);
  }
  if (!/Героев Эхо здесь нет/.test(o)) say('лавка: не объяснено, почему в ней нет героев Эхо');
  if (!o.includes(T.fmt(T.S.wallet.dust))) say('лавка: не виден прах на руках');
  /* выбранный: «Осколки ×q» — номер операции, сколько и цена; покупка — списано ровно цена, повтор номера — ничего */
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
  /* «10» и «до комплекта» */
  T.S.du.q = 10; o = ovOf(view('лавка · ×10')); m = o.match(buyRe(x.id));
  if (!m || m[2] !== '10') say('лавка: «10» не ведёт к «Осколки ×10»');
  else { const s0 = T.S.rs.shards[x.id], d1 = T.S.wallet.dust; run('лавка · ×10', () => T.ACT.dustbuy(`${m[1]}|${x.id}|10`)); if (T.S.rs.shards[x.id] !== s0 + 10 || T.S.wallet.dust !== d1 - 10 * p) say('лавка: ×10 — не десять осколков за десять цен'); }
  T.S.du.q = 0; o = ovOf(view('лавка · до комплекта')); m = o.match(buyRe(x.id));
  const left = need - T.S.rs.shards[x.id];
  if (!m || +m[2] !== left) say(`лавка: «до ${need}» не ведёт к ×${left}`);
  else { run('лавка · до комплекта', () => T.ACT.dustbuy(`${m[1]}|${x.id}|${left}`)); if (T.S.rs.shards[x.id] !== need) say('лавка: «до комплекта» не собрал комплект'); }
  /* комплект собран: «Пробудить» вместо покупки; сверх комплекта и дробное число — отказ без расхода */
  o = ovOf(view('лавка · комплект'));
  if (buyRe(x.id).test(o) || !new RegExp(`data-a="activate" data-v="du\\d+\\|${x.id}"`).test(o)) say('лавка: при собранном комплекте нет «Пробудить» или осталась покупка');
  { const d2 = T.S.wallet.dust, r = T.SOUL_SRV.buy('du' + T.S.du.seq, x.id, 1); if (r.refuse !== 'full' || T.S.wallet.dust !== d2) say('лавка: сверх комплекта — не отказ или расход'); }
  { const r = T.SOUL_SRV.buy('du' + T.S.du.seq, y.id, 1.5); if (r.refuse !== 'qty') say('лавка: дробное число осколков — не отказ'); }
  /* нехватка праха: кнопка неактивна, сказано сколько; «сервер» — отказ без выдачи */
  T.S.wallet.dust = 0; T.S.du.q = 1; run('лавка · другой', () => T.ACT.ssel(y.id)); o = ovOf(view('лавка · нет праха')); m = o.match(buyRe(y.id));
  if (!m || !/disabled/.test(m[3]) || !o.includes(`Не хватает ${T.fmt(T.rsShardPrice(y))} праха`)) say('лавка: при нехватке праха кнопка активна или не сказано сколько');
  { const r = T.SOUL_SRV.buy('du' + T.S.du.seq, y.id, 1); if (r.refuse !== 'dust' || (T.S.rs.shards[y.id] || 0)) say('лавка: без праха — не отказ или выдача'); }
  /* пробуждение: подтверждение в том же окне → операция → окно пробуждения; повтор номера ничего не списывает */
  T.S.rs.ssel = x.id; T.S.rs.shards[x.id] = need + 3; T.S.wallet.souls = 1e6; T.S.wallet.dust = 0;
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
  /* отказы пробуждения без расхода: осколков мало, душ мало */
  {
    const z = cat[2] || y; T.S.rs.shards[z.id] = need - 1; T.S.wallet.souls = 1e6; const s2 = T.S.wallet.souls;
    const r1 = T.SOUL_SRV.wake('du' + T.S.du.seq, z.id);
    T.S.rs.shards[z.id] = need; T.S.wallet.souls = 0;
    const r2 = T.SOUL_SRV.wake('du' + T.S.du.seq, z.id);
    if (r1.refuse !== 'shards' || r2.refuse !== 'souls' || T.rsHas(z) || T.S.rs.shards[z.id] !== need) say(`пробуждение: отказы ${r1.refuse}, ${r2.refuse} — или выдача при отказе`);
    T.S.wallet.souls = s2;
  }
  /* старый вызов из запасов и итога рулетки: ACT.dustbuy(герой) — один осколок, номер — следующий */
  { const w = cat[3] || y; T.S.wallet.dust = 1e6; const s0 = T.S.rs.shards[w.id] || 0, seq = T.S.du.seq; run('лавка · старый вызов', () => T.ACT.dustbuy(w.id)); if ((T.S.rs.shards[w.id] || 0) !== s0 + 1 || !T.S.du.ops['du' + seq]) say('лавка: старый вызов ACT.dustbuy(герой) — не один осколок операцией с номером'); }
}
/* вёрстка окна лавки — расчётом по стилям (зеркало heroes.css и index.html: .du, .du-h, .du-pick, .du-c, .btn, .qty): на 932 × 430 и 844 × 390
   выбранный герой — со строкой причины — и две строки витрины входят в тело окна без прокрутки окна */
{
  const V = T.DU_VIEW, G = { pad: 12, headTop: 10, eyebrow: 12.6, h2: [28, 24], bal: 34, gap: 8, foot: 15.6,
    card: { pad: 17, gap: 6, name: 15.2, meta: 14 }, pick: { pad: [24, 20], gap: [6, 5], name: 28, type: 15, bar: 12, qty: 30, btn: [44, 40], gapA: 5, reason: 16.25 } };
  [[932, 430], [844, 390]].forEach(([W, H], k) => {
    const head = G.headTop + Math.max(G.eyebrow + 2 + G.h2[k], G.bal), body = H - 20 - G.pad - head - 2 * G.gap - G.foot, P = G.pick;
    const pick = P.pad[k] + V.pick[k] + 2 + P.name + P.type + P.bar + P.qty + P.btn[k] + P.gapA + P.reason + 5 * P.gap[k];
    if (pick > body) say(`лавка ${W} × ${H}: выбранный герой — ${pick.toFixed(1)} px, в тело окна входит ${body.toFixed(1)}`);
    const card = G.card.pad + V.card[k] + G.card.gap + G.card.name + G.card.meta, rows = 2 * card + 8 + 6;
    if (rows > body) say(`лавка ${W} × ${H}: две строки витрины — ${rows.toFixed(1)} px, в тело окна входит ${body.toFixed(1)}`);
  });
  /* сцена «За души» (зеркало heroes.css и roulette.css: .hr-souls, .hr-entry, .rl-entry, .rl-faces, .rl-ef): сцена — рабочая область без
     полей экрана, строки вкладок и шага; веер героев пула самого большого цикла — лица не уже 28 px; пять осколков отряда Эхо — в ряд
     в табличке; вход рулетки — имя, строка цены и кнопка — по высоте */
  const S2 = { frame: [[932, 430, 78, 46], [844, 390, 72, 44]], scr: 12, tabs: 38, pad: [[12, 12, 16], [10, 10, 12]], side: [212, 196], gap: 12, col1: 180, fanPad: 16, card: [58, 52],
    plaque: [[12, 30], [10, 28]], shard: [V.side, 28], title: [67.4, 61.7], foot: 148 };
  const most = Math.max(...[2, 3, 4, 5, 6].map(c => T.RS.heroes.filter(h => h.src === 'roulette' && h.c === c).length));
  S2.frame.forEach(([fw, fh, rail, top], k) => {
    const mw = fw - rail, mh = fh - top, W = mw - 2 * S2.scr, Hh = mh - 2 * S2.scr - S2.tabs - S2.gap, [pv, pr, pl] = S2.pad[k];
    const entry = W - pl - pr - S2.side[k] - S2.gap, fan = entry - S2.col1 - S2.gap - S2.fanPad, w = S2.card[k];
    const step = w + Math.min(-6, (fan - most * w) / (most - 1));
    if (step < 28) say(`«За души» ${fw} × ${fh}: в веере из ${most} героев лицо видно на ${step.toFixed(1)} px — меньше 28`);
    const inner = S2.side[k] - 2 - S2.plaque[k][0] - S2.plaque[k][1], row = 5 * S2.shard[k] + 4 * 3;
    if (row > inner) say(`«За души» ${fw} × ${fh}: пять осколков отряда Эхо — ${row} px, в табличке ${inner}`);
    const col = S2.title[k] + 8 + S2.foot, h = Hh - 2 * pv;
    if (col > h) say(`«За души» ${fw} × ${fh}: вход рулетки — ${col.toFixed(1)} px, по высоте ${h}`);
  });
}
/* ================== 5б. дыра праха закрыта: героев Эхо прахом не собрать ==================
   Правило — в данных (EN_ROSTER.rules.dustSrc), его проверяет и «сервер» (ACT.dustbuy), и каждая кнопка «Осколок». Пробудить героя Эхо
   из осколков сундуков Эхо за души — можно: из листа отряда недели и из запасов */
{
  const R = T.RS.rules, src = R && R.dustSrc;
  if (!Array.isArray(src) || !src.length) say('прах: в данных нет правила rules.dustSrc — чьи осколки продаёт каталог праха');
  else {
    if (src.includes('echo')) say('прах: rules.dustSrc разрешает героев Эхо — дыра в обход Эхо');
    if (src.some(k => !['roulette'].includes(k) && !T.RS.sources.includes(k))) say(`прах: в rules.dustSrc неизвестный источник — ${src.join(', ')}`);
  }
  /* другие источники осколков: осколки героя дают только рулетка и сундук осколков Эхо (EN_LOOTBOXES: линии kind: 'shards').
     Каталог праха не продаёт героев, у которых осколков нет вовсе (золото, Энериум, крафт) */
  for (const h of T.RS.heroes) if (T.rsDustable(h) !== !!(src && src.includes(h.src))) { say(`прах: rsDustable(${h.id}) расходится с rules.dustSrc`); break; }
  for (const k of ['gold', 'donat', 'craft', 'echo']) if (src && src.includes(k)) say(`прах: каталог продаёт осколки героев «${k}»`);
  for (let c = 1; c <= 6; c++) {
    fresh(); T.S.rs.cyc = c;
    const cat = T.hrDustCat(), bad = cat.filter(h => !T.rsDustable(h) || h.src === 'echo');
    if (bad.length) say(`каталог праха · цикл ${c}: в нём герои Эхо — ${bad.slice(0, 3).map(h => h.n).join(', ')}`);
    T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.overlay = { t: 'dust' };
    const o = ovOf(view(`лавка праха · цикл ${c}`));
    const echoIn = T.RS.heroes.filter(h => h.src === 'echo' && new RegExp(`data-a="(?:ssel|dustbuy|activate)" data-v="(?:du\\d+\\|)?${h.id}[|"]`).test(o));
    if (echoIn.length) say(`лавка праха · цикл ${c}: в витрине герои Эхо — ${echoIn.slice(0, 3).map(h => h.n).join(', ')}`);
    if (!/Героев Эхо здесь нет/.test(o)) say(`лавка праха · цикл ${c}: не объяснено, почему в ней нет героев Эхо`);
    if (cat.length && (o.match(/class="hsg"/g) || []).length < cat.length) say(`лавка праха · цикл ${c}: не у каждого собираемого героя стекло осколка с лицом`);
  }
  /* «сервер»: осколок героя Эхо за прах — отказ, прах и осколки не тронуты */
  fresh(); T.S.acc.cycle = 6;
  const e = T.RS.heroes.find(h => h.src === 'echo' && h.c <= 6 && !T.rsHas(h));
  T.S.wallet.dust = 1e6; const d0 = T.S.wallet.dust, s0 = T.S.rs.shards[e.id] || 0;
  run('прах · осколок героя Эхо', () => T.ACT.dustbuy(e.id));
  if (T.S.wallet.dust !== d0 || (T.S.rs.shards[e.id] || 0) !== s0) say(`прах: ACT.dustbuy продал осколок героя Эхо ${e.n}`);
  if (!T.S.toast || !/Эхо/.test(T.S.toast.t)) say('прах: отказ по герою Эхо не объяснён игроку');
  /* лист отряда недели: выбор героя, «Пробудить» за души, «Осколка» за прах нет; осколки — призрачным осколком */
  fresh(); T.S.acc.cycle = 6; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls';
  const W = T.rsWeek(), sq5 = W.squad.map(id => T.RSI[id]).filter(Boolean), x = sq5.find(h => !T.rsHas(h)), need = T.RS.rules.stub.shards;
  T.S.overlay = { t: 'hrecho' };
  let o = ovOf(view('отряд недели'));
  if (/data-a="dustbuy"/.test(o) || /data-v="hrdust"/.test(o)) say('отряд недели: в листе прах — осколки героев Эхо за прах');
  if (!/только из сундуков Эхо/.test(o)) say('отряд недели: не сказано, что осколки героев Эхо — только из сундуков Эхо');
  if ((o.match(/class="hsg"/g) || []).length < sq5.filter(h => !T.rsHas(h)).length) say('отряд недели: не у каждого героя, которого собирают, стекло осколка с лицом (shardGhost)');
  run('отряд недели · выбор', () => T.ACT.ssel(x.id));
  o = ovOf(view('отряд недели · выбран'));
  if (!new RegExp(`data-a="activate" data-v="(?:du\\d+\\|)?${x.id}"`).test(o)) say('отряд недели: у выбранного героя Эхо нет «Пробудить»');
  if (o.includes(`data-a="dustbuy" data-v="${x.id}"`)) say('отряд недели: у героя Эхо есть «Осколок» за прах');
  T.S.rs.shards[x.id] = need + 3; T.S.wallet.souls = 1e6;
  const dust0 = T.S.wallet.dust;
  run('отряд недели · пробудить', () => T.ACT.activate(x.id)); run('отряд недели · подтверждение', () => T.ACT.activatedo(x.id));
  if (!T.rsHas(x) || !T.H(x.id)) say('отряд недели: пробуждённый душами герой Эхо не пришёл в коллекцию');
  if (T.S.wallet.dust !== dust0 + 3 * T.rsDustOf(x)) say('отряд недели: лишние осколки героя Эхо не ушли в прах (§15.2)');
  /* запасы: карточка осколков героя Эхо — без «Осколка» за прах и с объяснением, «Пробудить» есть */
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

/* ================== 5г. осколок героя по образцу автора ==================
   Стекло с лицом всегда: портрет героя или силуэт его класса, не инициалы; лицо не гаснет — доля в --s, трещины --cr «заживают»,
   полный комплект — data-full. Арт: выгруженные пути лежат в assets/art, слои стекла — все три вместе, заказанное — в want */
{
  const A = T.ART_ICONS, sg = T.shardGhost, art = p => fs.existsSync(path.join(UI, 'assets', 'art', p));
  if (!A || !sg) say('осколок: нет ART_ICONS или shardGhost (screens/art-icons.js)');
  else {
    for (const p of A.ready) if (!art(p)) say(`арт значков: ${p} в ART_ICONS.ready, а файла нет`);
    const G = Object.values(A.glass), gotG = G.filter(p => A.ready.includes(p)).length;
    if (gotG && gotG !== G.length) say('осколок: выгружены не все слои стекла — маска, кромка и трещины ложатся только вместе');
    for (const p of G) if (!A.ready.includes(p) && !A.want.includes(p)) say(`осколок: слой ${p} ни в ready, ни в want`);
    if (!Number.isInteger(A.heal) || A.heal < 0 || A.heal > 100) say('осколок: ART_ICONS.heal — не целая доля 0…100');
    const withArt = T.RS.heroes.find(h => h.src === 'roulette' && T.RS_ART && T.RS_ART.has(h.id));
    const noArt = T.RS.heroes.find(h => h.src === 'roulette' && T.RS_ART && !T.RS_ART.has(h.id));
    fresh();
    for (const [h, got] of [[withArt, 0], [withArt, 20], [withArt, 50], [withArt, 60], [noArt, 7]]) {
      if (!h) { say('осколок: в составе нет героя рулетки с портретом или без'); break; }
      const x = sg(h, got, 50, 64) || '', tag = `осколок ${h.n} ${got}/50`;
      if (!/^<span class="hsg"/.test(x)) { say(`${tag}: не стекло осколка`); continue; }
      if (h === withArt && !x.includes(`heroes/${h.id}.jpg`)) say(`${tag}: в стекле не портрет героя`);
      if (h === noArt && !/class="hsg-face (?:cls|svg)"/.test(x)) say(`${tag}: у героя без портрета нет силуэта класса`);
      if (/hsg-init|>\s*[А-ЯЁA-Z]{1,2}\s*</.test(x)) say(`${tag}: в стекле инициалы вместо лица`);
      if (/class="hsg-face[^"]*"[^>]*opacity/.test(x)) say(`${tag}: лицо гаснет с долей — оно должно быть видно всегда`);
      const s = +((x.match(/--s:(\d+)/) || [])[1]), cr = +((x.match(/--cr:(\d+)/) || [])[1]), want = Math.min(100, Math.floor(got * 100 / 50));
      if (s !== want) say(`${tag}: доля --s ${s}, ждали ${want}`);
      if (cr !== 100 - Math.floor(want * A.heal / 100)) say(`${tag}: трещины --cr ${cr}, ждали ${100 - Math.floor(want * A.heal / 100)}`);
      if ((got >= 50) !== / data-full="1"/.test(x)) say(`${tag}: полный комплект ${got >= 50 ? 'не отмечен' : 'отмечен раньше времени'}`);
      for (const p of A.want.filter(q => !A.ready.includes(q))) if (x.includes(p)) say(`${tag}: в разметке невыгруженный ${p}`);
    }
    /* силуэт класса — свой у каждого класса состава: герой без портрета узнаётся хотя бы по классу */
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
  /* разделы UI-кита «За души · алтарь и лавка праха» и «Осколок героя» рисуются без исключений, undefined и NaN */
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

/* ================== 5в. «За Энериум»: витрина донатного сета ==================
   Пятеро Безликих на ступенях цены: места 1…5 слева направо, цены растут и видны; сеты циклов; сет-бонус строкой и листом со ступенями;
   выбранный герой и одна кнопка покупки с номером операции. Покупка — DN_SRV: Энериум списывается один раз, герой приходит с 0 ур.,
   0 РП и 0 Добл; повтор номера ничего не меняет; отказ — без расхода. Окно получения героя; цикл I — витрина без покупки */
const priceOf = h => T.RS.rules.stub.donatPrice[h.place - 1];
const niches = h => [...h.matchAll(/<button class="dn-ni[^"]*" style="--k:(\d)"[^>]*data-v="([^"]+)"[\s\S]*?<\/button>/g)].map(m => ({ k: +m[1], id: m[2], html: m[0] }));
for (const team of [false, true]) {
  run('режим', () => T.setTeam(team));
  for (let c = 1; c <= 6; c++) {
    fresh(); T.S.acc.cycle = c; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'donat';
    const tag = `«За Энериум» · цикл ${c}${team ? ' [команда]' : ''}`, h = view(tag), sets = T.dnSets(), s = T.dnSet(), open = s.cycle <= c;
    const N = niches(h);
    if (N.length !== s.members.length) { say(`${tag}: героев на ступенях ${N.length}, в сете ${s.members.length}`); continue; }
    N.forEach((n, i) => {
      const x = T.RSI[n.id];
      if (!x || x.dset !== s.key || n.k !== x.place || x.place !== i + 1) say(`${tag}: ступень ${i + 1} — не ${i + 1}-й герой сета`);
      else if (!n.html.includes(`<b class="num">${T.fmt(priceOf(x))}</b>`)) say(`${tag}: у ${x.n} на ступени нет цены ${priceOf(x)}`);
    });
    for (let i = 1; i < N.length; i++) if (priceOf(T.RSI[N[i].id]) <= priceOf(T.RSI[N[i - 1].id])) say(`${tag}: цена не растёт от первого к пятому`);
    if (sets.some(x => !h.includes(`data-a="dcyc" data-v="${x.cycle}"`))) say(`${tag}: не у всех донатных сетов есть вход`);
    if (!h.includes(`data-a="sheet" data-v="hrset:${s.key}"`)) say(`${tag}: нет сет-бонуса строкой`);
    if (/class="kh-set/.test(h)) say(`${tag}: сет-бонус со ступенями — на витрине, а не в листе`);
    const buy = h.match(/data-a="dbuy" data-v="(dn\d+)\|([^"]+)"/);
    if (open && !buy) say(`${tag}: нет кнопки покупки с номером операции`);
    if (!open && buy) say(`${tag}: сет закрыт, а купить можно`);
    if (buy && !h.includes(`Купить<span class="cost">`)) say(`${tag}: на кнопке покупки нет цены`);
    /* воздух: на витрине — не больше 14 чисел: пять цен, сет-бонус, «в коллекции N из 5», доблесть и цикл */
    const txt = playerText(h.slice(h.indexOf('<div class="dn'))), nums = (txt.match(/\d[\d\s ]*/g) || []).filter(x => x.trim()).length;
    if (!team && nums > 14) say(`${tag}: на витрине ${nums} чисел — тесно`);
    /* лист сет-бонуса: ступеней — по сумме доблестей, у каждой — фишки героев и эффект с N ступени */
    T.S.overlay = { t: 'hrset', arg: s.key };
    const o = ovOf(view(`${tag} · сет-бонус`)), st = (o.match(/class="dn-st[ "]/g) || []).length, tiers = T.rsTiers(s.sum);
    if (st !== tiers) say(`${tag} · сет-бонус: ступеней ${st}, по сумме доблестей ${s.sum} — ${tiers}`);
    (s.n || []).slice(0, tiers).forEach(n => { if (!o.includes(`${T.fmt(n)}-го`)) say(`${tag} · сет-бонус: нет N = ${n}`); });
    if (s.members.some(id => !o.includes(`data-a="dsel" data-v="${id}"`))) say(`${tag} · сет-бонус: нет пятерых сета`);
    if (!/5–9 — одна, 10–14 — две, 15 и больше — три/.test(o)) say(`${tag} · сет-бонус: не сказано, сколько ступеней даёт сумма доблестей`);
    T.S.overlay = null;
    cnt.cycles++;
  }
}
run('режим «Игрок»', () => T.setTeam(false));
/* покупка: подтверждение, одна операция, повтор, отказы, окно получения */
{
  fresh(); T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'donat';
  const s = T.dnSet(), x = T.RSI[s.members[0]], p = priceOf(x);
  T.S.wallet.enerium = p + 5;
  const h = view('покупка · витрина'), m = h.match(/data-a="dbuy" data-v="(dn\d+)\|([^"]+)"/);
  run('покупка · выбрать первого', () => T.ACT.dsel(x.id));
  const h2 = view('покупка · первый выбран'), m2 = h2.match(/data-a="dbuy" data-v="(dn\d+)\|([^"]+)"/);
  if (!m2 || m2[2] !== x.id) say('покупка: у выбранного героя нет своей кнопки «Купить»');
  else {
    const op = m2[1];
    run('покупка · подтверждение', () => T.ACT.dbuy(`${op}|${x.id}`));
    const o = ovOf(view('покупка · окно подтверждения'));
    if (!T.S.overlay || T.S.overlay.t !== 'dnbuy') say('покупка: нет подтверждения');
    if (!o.includes(`data-a="dbuydo" data-v="${op}|${x.id}"`) || !o.includes('0 уровнем') || !o.includes(`останется ${T.fmt(5)}`)) say('покупка: подтверждение без номера, без «с чем приходит» или без остатка Энериума');
    const e0 = T.S.wallet.enerium;
    run('покупка · купить', () => T.ACT.dbuydo(`${op}|${x.id}`));
    if (T.S.wallet.enerium !== e0 - p) say(`покупка: списано ${e0 - T.S.wallet.enerium}, цена ${p}`);
    if (JSON.stringify(T.S.rs.owned[x.id]) !== JSON.stringify({ lvl: 0, lim: 0, valor: 0, how: 'donat' })) say(`покупка: запись коллекции ${JSON.stringify(T.S.rs.owned[x.id])}`);
    if (!T.S.overlay || T.S.overlay.t !== 'hrgot') say('покупка: нет окна получения героя');
    const g = ovOf(view('получение героя'));
    if (!g.includes(x.n) || !/class="dn-fr/.test(g) || !/--t0:-\d+ms/.test(g)) say('получение героя: нет имени, рамы или времени сцены');
    if (!g.includes(`data-a="dngo" data-v="${x.id}"`)) say('получение героя: нет перехода к развитию');
    run('получение · сразу итог', () => T.ACT.dnskip());
    const g2 = ovOf(view('получение героя · итог'));
    if (!/class="ov dn-got done"/.test(g2) || !/class="ov-scrim" data-a="close"/.test(g2)) say('получение героя: нажатие не ведёт сразу к итогу');
    /* повтор той же операции — ничего не списывает и не выдаёт */
    const e1 = T.S.wallet.enerium;
    run('покупка · повтор номера', () => T.ACT.dbuydo(`${op}|${x.id}`));
    if (T.S.wallet.enerium !== e1) say('покупка: повтор номера списал Энериум ещё раз');
    const r = T.DN_SRV.buy(op, x.id); if (!r.again) say('покупка: повтор номера — не «повтор»');
    /* отказы: уже в коллекции, не хватает Энериума, сет закрыт — без расхода */
    const y = T.RSI[s.members[4]]; T.S.wallet.enerium = priceOf(y) - 1;
    const e2 = T.S.wallet.enerium, r1 = T.DN_SRV.buy('dn' + T.S.dn.seq, y.id), r2 = T.DN_SRV.buy('dn' + T.S.dn.seq, x.id);
    if (r1.refuse !== 'enerium' || r2.refuse !== 'own' || T.S.wallet.enerium !== e2 || T.rsHas(y)) say(`покупка: отказы ${r1.refuse}, ${r2.refuse} — или расход при отказе`);
    run('покупка · не хватает', () => T.ACT.dsel(y.id));
    const h3 = view('покупка · не хватает Энериума');
    if (!/data-a="dbuy"[^>]*disabled/.test(h3) || !h3.includes(`Не хватает ${T.fmt(1)} Энериума`) || !h3.includes('data-a="go" data-v="store"')) say('покупка: при нехватке Энериума не сказано сколько и где пополнить');
    const z = T.RS.heroes.find(q => q.src === 'donat' && q.c === 3); T.S.wallet.enerium = 1e6;
    const r3 = T.DN_SRV.buy('dn' + T.S.dn.seq, z.id);
    if (r3.refuse !== 'shut' || T.rsHas(z)) say('покупка: героя закрытого сета можно купить');
    /* купленный — «в коллекции» и «К развитию» на витрине, на ступени — отметка вместо цены */
    run('покупка · купленный', () => T.ACT.dsel(x.id));
    const h4 = view('витрина · купленный');
    if (!h4.includes(`data-a="dngo" data-v="${x.id}"`) || /data-a="dbuy"[^>]*\|c2/.test(h4.slice(h4.indexOf('<div class="dn-card')))) say('витрина: у купленного героя нет «К развитию» или снова «Купить»');
    run('к развитию', () => T.ACT.dngo(x.id));
    if (T.S.route !== 'heroes' || T.S.seg.heroes !== 'coll' || T.S.hview !== 'mine' || !T.H(T.S.selHero)) say('«К развитию»: не ведёт в «Мои» к купленному герою');
  }
  if (m && !/^dn\d+$/.test(m[1])) say('покупка: номер операции не вида dnN');
}
/* арт витрины: выгруженные пути (DN_ART.ready) лежат в assets/art — иначе битая картинка; невыгруженные на витрине не рисуются */
{
  const A = T.DN_ART, known = [A.hall, A.frame].concat(T.dnSets().map(s => A.emblem(s.key)));
  for (const p of A.ready) { if (!known.includes(p)) say(`арт витрины: неизвестный путь ${p}`); if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`арт витрины: ${p} в DN_ART.ready, а файла нет`); }
  fresh(); T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'donat';
  const h = view('витрина · арт');
  for (const p of known) if (!A.ready.includes(p) && h.includes(p)) say(`арт витрины: ${p} не выгружен, а на витрине есть`);
}
/* цикл I: витрина — обещание, купить нельзя; старый вызов ACT.dbuy(id) отказывает словами */
{
  fresh(); T.S.acc.cycle = 1; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'donat';
  const h = view('«За Энериум» · цикл I'), x = T.RSI[T.dnSet().members[0]], e0 = T.S.wallet.enerium;
  if (/data-a="dbuy"/.test(h) || !/с цикла II/.test(h)) say('цикл I: на витрине можно купить или не сказано, с какого цикла');
  run('цикл I · купить', () => T.ACT.dbuy(x.id));
  if (T.S.wallet.enerium !== e0 || T.rsHas(x) || (T.S.overlay && T.S.overlay.t === 'dnbuy')) say('цикл I: покупка прошла');
}
/* сценарии витрины рисуются */
for (const [n, , f] of T.FLOWS.filter(x => /Энериум|отряд Эхо недели/.test(x[0]))) { fresh(); run('сценарий ' + n, () => f()); view(`сценарий «${n}»`); }
/* лист «Подробнее» героя состава — с новой шапкой */
for (const x of [T.RS.heroes[0], T.RS.heroes.find(h => h.src === 'donat'), T.RS.heroes.find(h => h.src === 'echo')]) { fresh(); T.S.route = 'heroes'; T.S.overlay = { t: 'rhero', arg: x.id }; const o = ovOf(view(`лист героя · ${x.n}`)); if (!o.includes('class="hd-top"')) say(`лист героя ${x.n}: нет шапки`); }

/* ================== 5д. Сила коллекции (§10.3, ADR-0031, п. 18): одна функция collRp на все экраны ==================
   Бонус героя = perBp × редкость × цикл × круг, круг = 2^доблесть; РП k — за предел k; доблесть не сбрасывает: не пройденный заново
   предел держит прошлый круг (после руны обучения — только пройденные до неё). Целые б. п.; сумма — не выше потолка. «Герои», лист
   «Сила коллекции» и Событие показывают одно число */
run('сила коллекции', () => {
  const X = { collRp: T.collRp, collHero: T.collHero, collPct: T.collPct, R: T.collRule(), EV: T.EV, top: T.INV.hero.capByLim.length - 1 }, R = X.R;
  if (!R) { say('сила коллекции: нет правила EN_EVENT.rp1'); return; }
  const hero = o => Object.assign({ r: 2, c: 3, lim: 0, valor: 0 }, o), unit = R.perBp * 2 * 3;
  const want = [[{}, 1, 0], [{ lim: 1 }, 1, unit], [{ lim: 1 }, 2, 0], [{ valor: 1 }, 1, unit], [{ valor: 1, lim: 1 }, 1, unit * 2], [{ valor: 2, lim: 3 }, 5, unit * 2],
    [{ valor: 2, lim: 3 }, 3, unit * 4], [{ valor: 1, keep: 1 }, 1, unit], [{ valor: 1, keep: 1 }, 2, 0], [{ valor: R.maxValor + 3, lim: X.top }, 1, unit * 2 ** R.maxValor]];
  for (const [o, k, w] of want) { const v = X.collHero(hero(o), k); if (v !== w || !Number.isInteger(v)) say(`сила коллекции: герой ${JSON.stringify(o)}, РП${k} — ${v}, ждали ${w}`); }
  fresh();
  const rp = [1, 2, 3, 4, 5].map(k => X.collRp(k));
  if (rp.some(v => !Number.isInteger(v) || v < 0 || v > R.capBp)) say(`сила коллекции: не целые или выше потолка — ${rp.join(', ')}`);
  if (rp.some((v, i) => i && v > rp[i - 1])) say(`сила коллекции: РП дальних пределов больше ближних — ${rp.join(', ')}`);
  const sum = [1, 2, 3, 4, 5].map(k => Math.min(R.capBp, T.hrMine().reduce((a, h) => a + X.collHero(h, k), 0)));
  if (sum.join() !== rp.join()) say(`сила коллекции: сумма по героям коллекции ${sum.join(', ')}, collRp — ${rp.join(', ')}`);
  T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine';
  const h = view('сила коллекции · кнопка'), chip = (h.match(/class="collpow"[\s\S]*?<span class="chip spirit">([^<]*)<\/span>/) || [])[1];
  if (chip !== '+' + X.collPct(rp[0])) say(`сила коллекции: на кнопке «${chip}», РП1 — +${X.collPct(rp[0])}`);
  T.S.overlay = { t: 'coll' }; const sh = ovOf(view('сила коллекции · лист')), vs = [...sh.matchAll(/<span class="v">([^<]*)<\/span>/g)].map(m => m[1]);
  if (vs.join('|') !== rp.map(v => '+' + X.collPct(v)).join('|')) say(`сила коллекции: в листе «${vs.join(' ')}», collRp — ${rp.map(X.collPct).join(' ')}`);
  if (X.EV && X.EV.rp1() !== rp[0]) say(`сила коллекции: Событие считает РП1 ${X.EV.rp1()}, collRp — ${rp[0]}`);
  /* купленный герой с пробитым пределом прибавляет ровно свой вклад */
  const nh = T.RS.heroes.find(x => !T.rsHas(x) && x.src === 'gold'), was = X.collRp(1);
  if (nh) { T.S.rs.owned[nh.id] = { lvl: 50, lim: 1, valor: 0, how: 'gold' }; const add = X.collHero({ r: nh.r, c: nh.c, lim: 1, valor: 0 }, 1); if (X.collRp(1) !== Math.min(R.capBp, was + add) || !add) say('сила коллекции: купленный герой с пределом не прибавил свой вклад'); }
});

/* ================== 6. режим «Команда»: коллекция и карточки рисуются ================== */
run('режим «Команда»', () => T.setTeam(true));
fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'all'; view('коллекция · все [команда]');
T.S.hview = 'mine'; view('коллекция · мои [команда]');
run('режим «Игрок»', () => T.setTeam(false));
done();
