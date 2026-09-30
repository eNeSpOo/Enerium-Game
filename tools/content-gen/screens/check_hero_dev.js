/* Автопроверка развития героя и окна снаряжения (design/ui/screens/hero-dev.js) — без браузера.
   1. Файлы: index.html подключает hero-dev.css и hero-dev.js после equipment.js; концы строк — CRLF; прежнего развития в index.html нет
      (heroDev, лестница, ACT.lvlup, limit, valor); карточка героя — пять вкладок («Развитие», «Мощь», «Снаряжение», «Навыки», «Путь»),
      «Развитие» зовёт hdPower, «Снаряжение» — места и hdGearFoot. Числа экрана — целые, в блоках HD_DATA и HD_VIEW.
   2. Доблесть по §3.3 и ADR-0016: +INV.hero.valorPct % к базовым характеристикам накопительно, целыми; источник героя для боя и мощи
      (EB.heroSrc, BM_SRC0) — с ней; карточка и лист «Характеристики» показывают те же числа.
   3. Вкладка «Развитие» в каждом состоянии: путь — пять ворот и звезда доблести, следующие ворота — кнопка предела; ворота — рунные
      камни, как на плитке и в шапке: горят пройденные, следующий на потолке уровня тлеет, с рунами — пульсирует (rpNext); значок шага
      предела — тот же камень; одна карточка следующего шага и не больше одной главной кнопки; строка «уровень · предел · доблесть»; характеристики — пять
      значков тихой строкой, она ведёт на страницу «Мощь».
   3а. Превью шага — числа ядра (слово автора 30.09.2026: меню прокачки «не показывает столько статов и атрибутов станет у героя»):
      для +1, +10 и «Макс» мощь и атрибуты «было → станет» — BM.hero, heroUnit и attrList на копии героя с новым уровнем, строкой —
      только изменившиеся; характеристики — heroSt с прибавкой снаряжения, неизменные — со словами «этот шаг не меняет»; у кнопки —
      номер операции, число уровней и цена lvlCost, кнопка — последней в карточке; у доблести характеристики «было → станет» — valorSt.
   4. «Сервер» HD_SRV: уровень, предел и доблесть — операции с номером; расход — ровно цена; повтор номера ничего не меняет; отказ ничего
      не меняет. «Макс» — сколько хватает духа, не выше потолка.
   5. Лист предела: главное — камень этого предела, у имени — пять камней героя; сколько нужно, сколько есть, что будет; подтверждение —
      только когда можно. Анимация пробития: руны слетаются в погасший камень, он загорается, под ним новый камень загорается в ряду
      из пяти; новый потолок; пропуск — сразу итог; «Дальше» посреди анимации — пропуск.
   6. Доблесть: честное превью до подтверждения — доблесть, +30 % к пяти характеристикам (числа — valorSt), способность из набора,
      глава, что начнётся заново (уровень, пределы, мощь сейчас и на прежнем уровне), что сохранится; до последней доблести орден
      не называется; недоступно — причина и путь к руне. После — карточка «Что изменилось»: по строке, было → стало; на последней
      доблести — орден или «вне орденов».
   7. Анимации: время от начала показа (--el), пропуск нажатием, prefers-reduced-motion; ключевые кадры меняют только transform и opacity.
      Рунный камень: погасший — фон, горящий — слой ::after; SVG-заглушка, нарисованный камень — у крупных, в RP_ART.ready — только
      выгруженные файлы; при prefers-reduced-motion пульса нет, «можно пробить» — ровный свет.
   8. Окно снаряжения: девять мест снаряжения и четыре талисмана слева, запасы справа; нажатие — выбор, подсветка мест, надеть в место;
      перетаскивание — те же операции (grDrop), снять — в запасы; сравнение стрелками и прибавка мощи; привязка талисмана к классу —
      значком класса, чужой — тусклый с причиной; «Надеть лучшее» — операция с номером; листы OV.tal и OV.eq открывают это окно.
   8а. Окно — оружейная героя (слово автора 30.09.2026: окна снаряжения и талисманов «выглядят теперь как заглушка»): колонки герой —
      запасы — карточка; ниша с портретом, доспех — гнёздами слева, оружие и украшения — справа, талисманы — под портретом; надетая
      вещь и плитка запасов — в единой рамке предмета (itf) с редкостью; одно главное действие внизу карточки («Надеть лучшее»,
      «Надеть», «Заменить»); сравнение — «надето → эта» по строкам и мощь героя «было → станет».
   8б. Жест на поддельном DOM: нажатие без движения — щелчок; мышь — перетаскивание на своё место надевает, на чужое — нет; палец
      вверх-вниз в запасах — прокрутка, вбок — перетаскивание, на героя мимо места — в своё место; из места в запасы — снять;
      призрак и подсветка убираются, слушатели снимаются, щелчок после броска гасится.
   9. Режим «Игрок»: служебных слов нет (SERVICE из check_player_view.js); режим «Команда» рисуется.
   10. Вёрстка — расчётом размеров на 932 × 430 и 844 × 390: вкладки книги героя (лист чернёного пергамента в правой странице разворота
      каждой ступени), окно снаряжения, анимации и превью помещаются; правая страница (снизу — над полосой обреза) — не меньше прежней
      (316 × 290 и 284 × 259); «Развитие» — мощь и четыре атрибута превью видны без прокрутки на самой низкой странице, низ карточки
      («сколько за раз» и кнопка с ценой) — в её ширину, кнопка не ниже 44 px; «Снаряжение» — сетками 3 × 3 и 2 × 2 с рубриками и низом
      одной строкой, кнопка не ниже 44 px; окно снаряжения — герой в нише с гнёздами, запасы не уже 6 плиток (на 844 × 390 — 5), карточка
      сравнения без прокрутки, «Надеть лучшее» с прибавкой — в её ширину; камни ворот — на оси пути; ряд камней анимации — над подписью.
   11. UI-кит (KIT_EXTRA): разделы «Рунные пределы» (камень в четырёх состояниях и размерах, плитки, шапка, путь, строки) и «Развитие
      героя и снаряжение»; сценарии презентации, карта экранов: hero, equipment, equipment-item, talismans — готовы.
   Запуск: node tools/content-gen/screens/check_hero_dev.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, ops: 0, states: 0, layout: 0 }, lay = [];
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Развитие и снаряжение: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; операций ${cnt.ops}, состояний пути ${cnt.states}, расчётов вёрстки ${cnt.layout}.`);
  for (const x of lay) console.log('вёрстка ' + x);
  console.log('Проверка пройдена: одна главная кнопка — следующий шаг, внизу справа; превью шага — числа ядра; предел и доблесть — операции с номером и честное превью; анимации — transform и opacity; снаряжение и талисманы — одно окно-оружейная; всё помещается на 932 × 430 и 844 × 390.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const main = scripts.filter(s => !s.src).map(s => s.code).join('\n');
const JS = read('screens/hero-dev.js'), CSS = read('screens/hero-dev.css');
{
  const i = src => scripts.findIndex(s => s.src === src);
  if (i('screens/hero-dev.js') < 0) say('index.html: не подключён screens/hero-dev.js');
  else if (i('screens/hero-dev.js') < i('screens/equipment.js') || i('screens/hero-dev.js') < i('screens/talismans.js')) say('index.html: hero-dev.js подключён раньше talismans.js и equipment.js');
  if (!/<link rel="stylesheet" href="screens\/hero-dev\.css">/.test(html)) say('index.html: не подключён screens/hero-dev.css');
  for (const [f, t] of [['screens/hero-dev.js', JS], ['screens/hero-dev.css', CSS]]) {
    const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
    if (crlf !== lf) say(`${f}: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}`);
  }
  try { new vm.Script(JS, { filename: 'screens/hero-dev.js' }); } catch (e) { say('screens/hero-dev.js: синтаксис — ' + e.message); }
  const OLD = [[/function heroDev\(/, 'heroDev'], [/const hdIt = /, 'hdIt'], [/<div class="ladder">/, 'лестница развития'], [/\n  lvlup\(\) \{/, 'ACT.lvlup'],
    [/\n  limit\(\) \{/, 'ACT.limit'], [/\n  valor\(\) \{/, 'ACT.valor'], [/\n  valordo\(v\) \{/, 'ACT.valordo'], [/\n  limitdo\(v\) \{/, 'ACT.limitdo']];
  for (const [re, what] of OLD) if (re.test(main)) say(`index.html: остался прежний ${what} — развитие живёт в screens/hero-dev.js`);
  /* вкладки героя — heroDetail (index.html); книга героя (screens/book.js) берёт их без шапки: портрет — на левой странице */
  const hd = main.match(/function heroDetail\(h(?:, o = \{\})?\)[\s\S]*?\n\}/);
  if (!hd) say('index.html: нет heroDetail');
  else {
    if (!/hdPower\(h\)/.test(hd[0])) say('index.html: вкладка «Развитие» не зовёт hdPower');
    if (!/t === 'gear'[\s\S]{0,300}eqRow\(h\)[\s\S]{0,120}talRow\(h\)[\s\S]{0,120}hdGearFoot\(h\)/.test(hd[0])) say('index.html: вкладка «Снаряжение» — не места снаряжения, талисманов и hdGearFoot');
    if (!/\['power', 'Развитие'\], \['stats', 'Мощь'\], \['gear', 'Снаряжение'\], \['skills', 'Навыки'\], \['path', 'Путь'\]/.test(hd[0])) say('index.html: у книги героя не пять закладок «Развитие», «Мощь», «Снаряжение», «Навыки», «Путь»');
  }
  if (!/heroDetail\(h, \{ head: false/.test(read('screens/book.js'))) say('screens/book.js: книга героя не берёт вкладки из heroDetail — развитие без неё');
  if (!/const grow = typeof heroDev !== 'function'/.test(main)) say('index.html: шахта зовёт heroDev без проверки, что экран подключён');
  if (!/const valorSt = /.test(main) || !/const heroSt = /.test(main) || !/INV\.hero\.valorPct/.test(main.match(/const valorSt = [^\n]*/)[0] || '')) say('index.html: нет valorSt и heroSt — доблесть по INV.hero.valorPct');
  const iV = main.indexOf('EB.heroSrc = h => { const s = src0(h);'), iB = main.indexOf('const BM_SRC0 = EB.heroSrc;');
  if (iV < 0 || iB < 0 || iV > iB) say('index.html: источник героя с доблестью должен быть до BM_SRC0 — иначе мощь её не видит');
  /* числа экрана — в блоках данных, целые */
  const data = JS.match(/const HD_DATA = \{[\s\S]*?\n\};/), view = JS.match(/const HD_VIEW = \{[\s\S]*?\n\};/);
  if (!data || !view) say('hero-dev.js: нет блоков HD_DATA и HD_VIEW');
  else for (const [n, b] of [['HD_DATA', data[0]], ['HD_VIEW', view[0]]]) { const f = b.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').match(/\d+\.\d+/g); if (f) say(`hero-dev.js: в ${n} дробные числа ${f.slice(0, 5).join(', ')}`); }
}
if (err.length) done();

/* ================== песочница ================== */
function load(opt = {}) {
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
  const els = {}, timers = [];
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null, elementFromPoint: () => null };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  let now = 0;
  const wl = {};   // слушатели окна: перетаскивание вешает pointermove и pointerup на window
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener: (t, f) => { (wl[t] = wl[t] || []).push(f); }, removeEventListener: (t, f) => { wl[t] = (wl[t] || []).filter(x => x !== f); }, dispatchEvent() {},
    matchMedia: q => ({ matches: !!opt.reduced && /reduce/.test(q), addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => now } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    if (s.src && !fs.existsSync(path.join(UI, s.src))) continue;
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, FLOWS, KH, MAP, KIT_EXTRA, H, EB, INV, BAG, BM, RS, RSI, RSS, render, initialState, setTeam, fmt, ROMAN,
    heroDev, heroSt, valorSt, BM_SRC0, lvlCost, heroKit, hrTwin: typeof hrTwin === 'function' ? hrTwin : null, rsChTitle,
    HD_DATA, HD_VIEW, HD_SRV, GR_SRV, hdPower, hdGearFoot, hdKitHtml, hdQty, hdOpens, hdChapter, hdBmAt, grWin, grPlan, grDrop, grPick, grBind,
    RP_ART, rpNext, rpRow, rpPost, rpKitHtml, hdKitHero, heroHead: typeof heroHead === 'function' ? heroHead : null, HB_VIEW: typeof HB_VIEW !== 'undefined' ? HB_VIEW : null, HB_ART: typeof HB_ART !== 'undefined' ? HB_ART : null, PG_ART: typeof PG_ART !== 'undefined' ? PG_ART : null,
    TB, TL: window.EN_TALISMANS, tlEq, tlWhy, tlFam, tlR, tlMul, tlMulOf, EQD: window.EN_EQUIPMENT, eqItem, eqWornList, eqGain, eqMulOf, EQ_SRV, TL_SRV, heroUnit, attrList, ATTR_T, eqStatAdd, STATS,
  })`, ctx);
  return { T, els, rootCls, timers, wl, document, tick: ms => { now += ms; }, setNow: ms => { now = ms; }, game: () => (els.game ? els.game.innerHTML : '') };
}
const P = load(), T = P.T;
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
function scan(h, where) {
  cnt.views++;
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
const view = where => { run(where, () => T.render()); return scan(P.game(), where); };
const fresh = () => { T.S = T.initialState(); T.S.overlay = null; T.S.wallet.spirit = 1e9; };
const ovOf = h => { const i = h.indexOf('<div class="ov'); return i < 0 ? '' : h.slice(i); };
const tabOf = h => { const i = h.indexOf('<div class="hd-body">'); return i < 0 ? '' : h.slice(i, h.indexOf('</section>', i)); };
const count = (s, re) => (s.match(re) || []).length;
const snapBag = () => JSON.stringify(T.S.bag.items);
const card = (hid, tab) => { T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.selHero = hid; T.S.seg.hero = tab; T.S.overlay = null; };
const D = T.INV.hero, TOP = D.capByLim.length - 1, pct = D.valorPct;
const vst = (st, v) => st.map(x => Math.floor(x * (100 + pct) ** v / 100 ** v));

/* ================== 2. доблесть: +30 % к базовым характеристикам ================== */
fresh();
{
  if (pct !== 30) say(`INV.hero.valorPct = ${pct}, в §10.2 и ADR-0016 — 30`);
  for (const h of T.S.heroes) {
    const want = vst(h.st, h.valor);
    if (JSON.stringify(T.heroSt(h)) !== JSON.stringify(want)) say(`${h.name}: heroSt ${T.heroSt(h)} — ждали ${want} (доблесть ${h.valor})`);
    if (JSON.stringify(T.EB.heroSrc(h).st) !== JSON.stringify(want)) say(`${h.name}: источник героя для боя без доблести — ${T.EB.heroSrc(h).st}`);
    if (JSON.stringify(T.BM_SRC0(h).st) !== JSON.stringify(want)) say(`${h.name}: мощь (BM_SRC0) не видит доблесть`);
    const x = Object.assign({}, h, { valor: 0 }); if (JSON.stringify(T.heroSt(x)) !== JSON.stringify(h.st)) say(`${h.name}: без доблести характеристики не базовые`);
  }
  if (JSON.stringify(T.valorSt([100, 200, 1000, 7, 0], 5)) !== JSON.stringify([371, 742, 3712, 25, 0])) say(`valorSt: пять ступеней от [100, 200, 1000, 7, 0] — ${T.valorSt([100, 200, 1000, 7, 0], 5)}, ждали [371, 742, 3712, 25, 0] (×3,7)`);
  card('h1', 'power');
  const g = view('карточка · характеристики с доблестью'), h = T.H('h1');
  const st = T.heroSt(h); for (const v of st) if (!tabOf(g).includes(`<b class="num">${v}</b>`)) { say(`вкладка «Развитие»: характеристика ${v} (с доблестью) не видна`); break; }
  T.S.overlay = { t: 'hattr', arg: 'h1' }; const ga = view('лист «Характеристики»');
  for (const v of st) if (!ga.includes(`<span class="v">${v}`)) { say(`лист «Характеристики»: нет числа ${v} с доблестью`); break; }
}

/* ================== 3. вкладка «Развитие» в каждом состоянии ================== */
function checkPower(where, h, want) {
  cnt.states++;
  card(h.id, 'power');
  const g = tabOf(view(`«Развитие» · ${where}`)), d = T.heroDev(h);
  if (d.step !== want) say(`${where}: шаг «${d.step}», ждали «${want}»`);
  if (count(g, /class="hdv-gate[ "]/g) !== TOP) say(`${where}: ворот пределов ${count(g, /class="hdv-gate[ "]/g)}, ждали ${TOP}`);
  if (count(g, /class="hdv-gate done"/g) !== Math.min(h.lim, TOP)) say(`${where}: светится ворот ${count(g, /class="hdv-gate done"/g)}, пройдено ${h.lim}`);
  if (h.lim < TOP && !new RegExp(`<button class="hdv-gate next[^"]*" data-v="${h.id}" data-a="limit"`).test(g)) say(`${where}: следующие ворота — не кнопка предела`);
  /* ворота — рунные камни, как на плитке и в шапке (rpNext): горят пройденные, следующий на потолке тлеет или пульсирует, дальние погасшие */
  const gates = [...g.matchAll(/class="hdv-gate ([^"]*)"[^>]*><i class="rp-s (on|off|wait|ready) p"><\/i>/g)].map(m => m[2]);
  const nx = T.rpNext(h), wantSt = Array.from({ length: TOP }, (_, k) => k < h.lim ? 'on' : k === h.lim && nx ? nx : 'off').join(' ');
  if (gates.join(' ') !== wantSt) say(`${where}: камни ворот «${gates.join(' ')}», ждали «${wantSt}»`);
  if (nx && !new RegExp(`class="hdv-gate next ${nx}"`).test(g)) say(`${where}: у следующих ворот нет состояния «${nx}»`);
  if (d.step === 'limit' && d.rune && !g.includes(`<span class="hdv-ic"><i class="rp-s ${d.have >= d.need ? 'on' : 'wait'} p"></i></span>`)) say(`${where}: значок шага предела — не камень этого предела (с рунами горит ровно, без рун тлеет)`);
  if (count(g, /<i class="rp-s ready/g) > 1) say(`${where}: пульсирует ${count(g, /<i class="rp-s ready/g)} камня во вкладке — только сам следующий камень пути`);
  if (/class="limits"/.test(g)) say(`${where}: остались прежние отметки .limits`);
  if (!new RegExp(`<button class="hdv-star [^"]*" data-v="${h.id}" data-a="valor"`).test(g)) say(`${where}: звезда доблести — не кнопка`);
  if (count(g, /class="hdv-next"/g) !== 1) say(`${where}: карточек следующего шага ${count(g, /class="hdv-next"/g)} — нужна одна`);
  if (count(g, /class="btn go[ "]/g) > 1) say(`${where}: главных кнопок ${count(g, /class="btn go[ "]/g)} — нужна одна`);
  for (const n of ['str', 'int', 'agi', 'end', 'spd']) if (!g.includes(`icons/${n}.png`)) say(`${where}: в тихой строке нет значка ${n}`);
  if (/[!！]/.test(playerText(strip(g)))) say(`${where}: в тексте «!» — правила воздуха`);
  return g;
}
fresh();
{
  const h = T.H('h1');   // 146 из 150: Гарт отстал от отряда (демо — 11-й день цикла II)
  let g = checkPower('уровень растёт', h, 'lvl');
  const q = T.hdQty(h); if (!g.includes(`data-a="lvlup"`) || !g.includes(`:${h.id}:${q}"`)) say('уровень: у кнопки «Поднять» нет номера операции и числа уровней');
  const h2 = T.H('h2');  // 150 из 150, руны предела II в запасах
  g = checkPower('предел ждёт', h2, 'limit');
  if (!/data-a="limit">Пробить/.test(g)) say('предел: при рунах «Пробить» недоступна или не главная');
  const d2 = T.heroDev(h2); T.BAG.take(d2.rune.id, T.BAG.qty(d2.rune.id) - (d2.need - 1));
  g = checkPower('предел · мало рун', h2, 'limit');
  if (!/data-a="limit" disabled/.test(g) || !g.includes(`data-a="item" data-v="${d2.rune.id}"`)) say('предел · мало рун: «Пробить» доступна или нет «Где взять руны»');
  /* доблесть: пятый предел, руны нет, осколков хватает — «Собрать руну»; руна есть — «Взять доблесть» */
  fresh();
  const h4 = T.H('h4'), d4 = T.heroDev(h4);
  h4.lim = D.valorAtLim; h4.cap = D.capByLim[h4.lim]; h4.lvl = h4.cap;
  T.BAG.add(d4.vs.id, d4.vsNeed);
  g = checkPower('доблесть · осколки на руну', h4, 'valor');
  if (!g.includes(`data-a="valorcraft" data-v="${d4.rec.id}"`)) say('доблесть · осколки: нет «Собрать руну»');
  T.BAG.add(d4.vr.id, 1);
  g = checkPower('доблесть · руна есть', h4, 'valor');
  if (!new RegExp(`data-v="${h4.id}" data-a="valor">Взять доблесть`).test(g)) say('доблесть · руна: нет «Взять доблесть» главной кнопкой');
  if (!/class="hdv-star ready/.test(g)) say('доблесть открыта, а звезда не светится');
  /* путь пройден: доблесть на личном максимуме, пятый предел. Герой — тот, у кого доблесть уже на максимуме (у демо-отряда ADR-0031 —
     Хравн: максимум 1, доблесть 1 от руны обучения) */
  const h3 = T.S.heroes.find(x => x.maxV > 0 && x.valor >= x.maxV) || T.H('h3'); h3.lim = TOP; h3.cap = D.capByLim[TOP]; h3.lvl = h3.cap;
  g = checkPower('путь пройден', h3, 'done');
  if (/data-a="(?:lvlup|limit|valordo)"[^>]*>(?:Поднять|Пробить)/.test(g)) say('путь пройден: осталось действие развития');
  if (!/class="hdv-star max/.test(g)) say('путь пройден: звезда не «максимум»');
  /* вкладка «Снаряжение» */
  fresh(); card('h1', 'gear');
  const gg = tabOf(view('вкладка «Снаряжение»'));
  if (count(gg, /class="eq-slot[ "]/g) !== 9 || count(gg, /class="tl-slot[ "]/g) !== 4) say(`вкладка «Снаряжение»: мест ${count(gg, /class="eq-slot[ "]/g)} + ${count(gg, /class="tl-slot[ "]/g)}, ждали 9 + 4`);
  if (!/data-a="gearbest"|data-a="dlg" data-v="gear:h1"/.test(gg)) say('вкладка «Снаряжение»: нет «Надеть лучшее» или входа в окно');
  if (count(gg, /class="btn go[ "]/g) !== 1) say(`вкладка «Снаряжение»: главных кнопок ${count(gg, /class="btn go[ "]/g)}`);
}

/* ================== 3а. превью шага — числа ядра ==================
   Слово автора 30.09.2026: «Само меню после прокачки за дух не показывает столько статов и атрибутов станет у героя». Для +1, +10
   и «Макс»: мощь и атрибуты «было → станет» — те же функции ядра на копии героя с новым уровнем (BM.hero, heroUnit и attrList), строкой —
   только изменившиеся; характеристики — heroSt с прибавкой снаряжения (уровень их не меняет — так и сказано); у кнопки — номер
   операции, число уровней и цена lvlCost. Доблесть: характеристики «было → станет» — valorSt ядра. Руками ничего не считается */
fresh();
{
  const h = T.H('h1'), rowRe = /<div class="hdv-g([^"]*)" role="listitem"><span class="ic">[\s\S]*?<\/span><span class="k">([^<]*)<\/span><span class="v">(?:<s class="num">([^<]*)<\/s><i aria-hidden="true">→<\/i>)?<b class="num">([^<]*)<\/b>/g;
  const cellRe = /<span class="s5( ch)?" title="[^"]*"><img[^>]*><b class="num">(\d+)<\/b>(?:<i class="num">→ (\d+)<\/i>)?<\/span>/g;
  const withEq = x => T.heroSt(x).map((v, i) => v + T.eqStatAdd(x)[i]);
  for (const qv of T.HD_DATA.qty) {
    T.S.qty = qv; card('h1', 'power');
    const g = tabOf(view(`«Развитие» · превью · ${qv}`)), q = T.hdQty(h), to = h.lvl + q, x = Object.assign({}, h, { lvl: to });
    const a0 = T.attrList(T.heroUnit(h)), a1 = T.attrList(T.heroUnit(x)), rows = [...g.matchAll(rowRe)];
    const bm = rows.find(r => r[2] === 'Мощь');
    if (!bm || bm[3] !== T.fmt(T.BM.hero(h)) || bm[4] !== T.fmt(T.BM.hero(x))) say(`превью ${qv}: мощь «${bm ? bm[3] + ' → ' + bm[4] : '—'}», ядро — ${T.fmt(T.BM.hero(h))} → ${T.fmt(T.BM.hero(x))}`);
    const changed = a1.map(([k, v], i) => [k, a0[i][1], v]).filter(([, a, b]) => a !== b);
    if (!changed.length) say(`превью ${qv}: ядро не нашло ни одного изменившегося атрибута при подъёме на ${q} ур.`);
    for (const [k, a, b] of changed) { const r = rows.find(y => y[2] === T.ATTR_T[k]); if (!r || r[3] !== a || r[4] !== b) say(`превью ${qv}: ${T.ATTR_T[k]} «${r ? r[3] + ' → ' + r[4] : 'нет строки'}», ядро — ${a} → ${b}`); }
    for (const r of rows) if (r[2] !== 'Мощь' && !changed.some(([k]) => T.ATTR_T[k] === r[2])) say(`превью ${qv}: строка «${r[2]}» — атрибут не меняется или не из ядра`);
    const st0 = withEq(h), st1 = withEq(x), cells = [...g.matchAll(cellRe)];
    if (cells.length !== 5 || cells.some((c, i) => +c[2] !== st0[i] || (st1[i] !== st0[i] ? +c[3] !== st1[i] : !!c[3]))) say(`превью ${qv}: характеристики — не heroSt с прибавкой снаряжения (${st0.join(', ')} → ${st1.join(', ')})`);
    if (st1.every((v, i) => v === st0[i]) && !/Характеристики этот шаг не меняет/.test(g)) say(`превью ${qv}: не сказано, что шаг не меняет характеристики`);
    const cost = T.fmt(T.lvlCost(h.lvl, q)).replace(/\s/g, '\\s');
    if (!new RegExp(`data-v="hd\\d+:h1:${q}" data-a="lvlup">Поднять<span class="cost"><img[^>]*>${cost}</span></button></div></div>`).test(g)) say(`превью ${qv}: у кнопки «Поднять» нет ${q} ур. или цены — или она не последней в карточке`);
    cnt.states++;
  }
  /* доблесть: характеристики «было → станет» — valorSt ядра на копии героя */
  fresh(); const h4 = T.H('h4'); h4.lim = D.valorAtLim; h4.cap = D.capByLim[h4.lim]; h4.lvl = h4.cap; card('h4', 'power');
  const g = tabOf(view('«Развитие» · превью доблести')), st0 = withEq(h4), st1 = withEq(Object.assign({}, h4, { valor: h4.valor + 1 }));
  const cells = [...g.matchAll(cellRe)];
  if (cells.length !== 5 || cells.some((c, i) => +c[2] !== st0[i] || +c[3] !== st1[i])) say(`превью доблести: характеристики «было → станет» — не valorSt ядра (${st0.join(', ')} → ${st1.join(', ')})`);
  if (T.STATS.some((_, i) => st1[i] !== T.valorSt(h4.st, h4.valor + 1)[i] + T.eqStatAdd(h4)[i])) say('превью доблести: характеристики после доблести — не valorSt ядра');
  cnt.states++;
}

/* ================== 4. уровень — операция с номером ================== */
fresh();
{
  const h = T.H('h1'), lv0 = h.lvl, sp0 = T.S.wallet.spirit;
  T.S.qty = 1; const op = `hd${T.S.hd.seq}`;
  run('уровень', () => T.ACT.lvlup(`${op}:h1:3`)); cnt.ops++;
  if (h.lvl !== lv0 + 3 || T.S.wallet.spirit !== sp0 - T.lvlCost(lv0, 3)) say(`уровень: ${lv0} → ${h.lvl}, дух ${sp0} → ${T.S.wallet.spirit}, ждали +3 и −${T.lvlCost(lv0, 3)}`);
  run('уровень · повтор', () => T.ACT.lvlup(`${op}:h1:3`)); cnt.ops++;
  if (h.lvl !== lv0 + 3) say('уровень: повтор номера поднял ещё раз');
  run('уровень · сверх потолка', () => T.ACT.lvlup(`hd${T.S.hd.seq}:h1:999`)); cnt.ops++;
  if (h.lvl !== h.cap) say(`уровень: «сверх потолка» — ${h.lvl}, потолок ${h.cap}`);
  const sp1 = T.S.wallet.spirit; run('уровень · на потолке', () => T.ACT.lvlup(`hd${T.S.hd.seq}:h1:1`)); cnt.ops++;
  if (h.lvl !== h.cap || T.S.wallet.spirit !== sp1) say('уровень: на потолке что-то списалось');
  /* «Макс» — сколько хватает духа */
  fresh(); const g = T.H('h1'); T.S.qty = 'max'; T.S.wallet.spirit = T.lvlCost(g.lvl, 3) + 1;
  if (T.hdQty(g) !== 3) say(`«Макс»: при духе на три уровня — ${T.hdQty(g)}`);
  T.S.wallet.spirit = 0; const lv = g.lvl; run('уровень · без духа', () => T.ACT.lvlup(`hd${T.S.hd.seq}:h1:1`)); cnt.ops++;
  if (g.lvl !== lv) say('уровень: без духа уровень поднялся');
  if (T.HD_DATA.qtyStart && T.initialState().qty !== T.HD_DATA.qtyStart) say('выбор «сколько за раз» при входе — не HD_DATA.qtyStart');
}

/* ================== 5. предел: лист, операция, анимация ================== */
fresh();
{
  /* Хравн — на потолке своего предела, руны следующего есть (демо — 11-й день цикла II: предел I, руны предела II, ADR-0031, п. 17) */
  const h = T.H('h2'), d = T.heroDev(h), bag0 = T.BAG.qty(d.rune.id), lim0 = h.lim;
  card('h2', 'power');
  run('предел · лист', () => T.ACT.limit('h2'));
  const O = T.S.overlay;
  if (!O || O.t !== 'hdlim' || O.act !== 'limitdo' || !/^hd\d+:h2$/.test(O.v)) say(`предел: лист без подтверждения с номером — ${JSON.stringify(O)}`);
  let g = ovOf(view('предел · лист'));
  if (!g.includes(`${h.cap}</span> → <span class="num">${D.capByLim[lim0 + 1]}`) || !g.includes('data-a="limitdo"')) say('предел · лист: нет «потолок было → стало» или подтверждения');
  if (!g.includes('<span class="hdl-st"><i class="rp-s ready p"></i></span>')) say('предел · лист: главное — не пульсирующий камень этого предела');
  if (!new RegExp(`<span class="hdl-who"><span class="eyebrow">[^<]*</span><span class="rp i" role="img" aria-label="Рунный предел ${h.lim} из ${TOP}"[^>]*>(?:<i class="rp-s (?:on|off|wait|ready)"></i>){${TOP}}</span>`).test(g)) say('предел · лист: у имени нет пяти камней героя');
  run('предел · подтверждение', () => T.ACT.limitdo(O.v)); cnt.ops++;
  if (h.lim !== lim0 + 1 || h.cap !== D.capByLim[lim0 + 1] || T.BAG.qty(d.rune.id) !== bag0 - d.need) say(`предел: lim ${h.lim}, потолок ${h.cap}, руны ${bag0} → ${T.BAG.qty(d.rune.id)}`);
  if (!T.S.overlay || T.S.overlay.t !== 'hdfx') say('предел: после подтверждения нет анимации');
  g = ovOf(view('предел · анимация'));
  if (count(g, /<i style="--a:/g) !== d.need || !g.includes('class="hdfx-mark"') || !g.includes('data-a="hdskip"') || !/--el:\d+/.test(g)) say('предел · анимация: не руны по числу, не отметка, нет пропуска или времени --el');
  /* новый камень загорается: в центре — камень предела, под ним — пять камней героя, новый загорается вместе с ним */
  if (!g.includes('<span class="hdfx-mark"><i class="rp-s on p"></i></span>')) say('предел · анимация: в центре не рунный камень, который загорается');
  const row = (g.match(/<span class="hdfx-row">([\s\S]*?)<\/span>/) || [])[1] || '';
  if (count(row, /<i class="rp-s /g) !== TOP || count(row, /<i class="rp-s on/g) !== h.lim || count(row, / new"/g) !== 1
    || !new RegExp(`^(?:<i class="rp-s on"></i>){${h.lim - 1}}<i class="rp-s on new"></i>`).test(row)) say(`предел · анимация: под камнем не пять камней героя с новым ${h.lim}-м`);
  if (!g.includes(`<s class="num">${D.capByLim[lim0]}</s> <b class="num">${D.capByLim[lim0 + 1]}</b>`)) say('предел · анимация: нет нового потолка «было → стало»');
  run('предел · «Дальше» посреди', () => T.ACT.hdfxok());
  if (!T.S.overlay || T.S.overlay.t !== 'hdfx' || !T.S.hd.fx.skip) say('предел: «Дальше» посреди анимации закрыло её, а должно показать итог');
  if (!/class="ov hdfx hdfx-lim done"/.test(ovOf(view('предел · итог')))) say('предел: пропуск не показал итог (класс done)');
  run('предел · закрыть', () => T.ACT.hdfxok()); if (T.S.overlay) say('предел: «Дальше» после итога не закрыло анимацию');
  const b1 = snapBag(); run('предел · повтор', () => T.ACT.limitdo(O.v)); cnt.ops++;
  if (h.lim !== lim0 + 1 || snapBag() !== b1) say('предел: повтор номера что-то изменил');
  /* не на потолке — лист без подтверждения, операция отказывает */
  T.S.overlay = null; run('предел · рано', () => T.ACT.limit('h2'));
  if (!T.S.overlay || T.S.overlay.act) say('предел не на потолке: в листе есть подтверждение');
  if (!ovOf(view('предел · рано')).includes('Сначала уровень')) say('предел не на потолке: лист не говорит, что сначала уровень');
  const b2 = snapBag(); run('предел · рано · операция', () => T.ACT.limitdo('h2')); cnt.ops++;
  if (h.lim !== lim0 + 1 || snapBag() !== b2) say('предел не на потолке: что-то списалось');
  /* пятый предел — потолок не растёт, путь к доблести */
  fresh(); const h5 = T.H('h4'), c = h5.cycle;
  h5.lim = TOP - 1; h5.cap = D.capByLim[h5.lim]; h5.lvl = h5.cap;
  const r5 = T.heroDev(h5).rune; T.BAG.add(r5.id, D.runesPerLimit);
  run('предел V · лист', () => T.ACT.limit('h4'));
  if (!ovOf(view('предел V · лист')).includes('Путь к доблести')) say('предел V: лист не говорит про путь к доблести');
  run('предел V', () => T.ACT.limitdo(T.S.overlay.v)); cnt.ops++;
  if (h5.lim !== TOP || h5.cap !== D.capByLim[TOP]) say(`предел V: lim ${h5.lim}, потолок ${h5.cap}`);
  if (!ovOf(view('предел V · анимация')).includes('Путь к доблести открыт')) say('предел V: анимация не говорит про доблесть');
  if (T.heroDev(h5).step !== 'valor') say(`предел V: следующий шаг — ${T.heroDev(h5).step}, ждали доблесть`);
  if (c !== h5.cycle) say('предел V: цикл героя изменился');
}

/* ================== 6. доблесть: превью, операция, «Что изменилось» ================== */
function prepValor(hid, valor) {
  const h = T.H(hid); if (valor != null) h.valor = valor;
  h.lim = D.valorAtLim; h.cap = D.capByLim[h.lim]; h.lvl = h.cap;
  const d = T.heroDev(h); if (!d.vrHave) T.BAG.add(d.vr.id, 1);
  return h;
}
const orderNames = h => { const rh = T.hrTwin ? T.hrTwin(h) : T.RSI[h.id]; return ((rh && rh.team && rh.team.sets) || []).map(k => T.RSS[k]).filter(Boolean).map(s => s.name); };
fresh();
{
  const h = prepValor('h4'), v = h.valor, st0 = T.heroSt(h), st1 = T.valorSt(h.st, v + 1), bm0 = h.bm, lvl0 = h.lvl, d = T.heroDev(h);
  card('h4', 'power');
  run('доблесть · превью', () => T.ACT.valor('h4'));
  const O = T.S.overlay;
  if (!O || O.t !== 'hdval' || O.act !== 'valordo' || !/^hd\d+:h4$/.test(O.v)) say(`доблесть: превью без подтверждения с номером — ${JSON.stringify(O)}`);
  const g = ovOf(view('доблесть · превью'));
  for (const [i, x] of st1.entries()) if (!g.includes(`<b class="num">${x}</b><i class="num">+${x - st0[i]}</i>`)) { say(`превью: нет характеристики ${x} (+${x - st0[i]})`); break; }
  if (!g.includes(`+${pct} %`)) say('превью: нет «+30 %»');
  for (const x of T.hdOpens(h, v + 1)) if (!g.includes(`«${x.n}»`)) say(`превью: нет способности «${x.n}» доблести ${v + 1}`);
  const ch = T.hdChapter(h, v + 1); if (ch && !g.includes(`«${ch}»`)) say(`превью: нет главы «${ch}»`);
  if (!g.includes(`<s>${lvl0}</s>`) || !/Уровень/.test(g) || !/Рунный предел/.test(g)) say('превью: нет «уровень было → 0» или рунных пределов');
  if (!g.includes(`<s><span class="rp i" role="img" aria-label="Рунный предел ${h.lim} из ${TOP}"`) || !g.includes(`<b><span class="rp i" role="img" aria-label="Рунный предел 0 из ${TOP}"`) || /class="limits"/.test(g)) say('превью: рунные пределы не строкой камней «было → стало»');
  const bmA = T.hdBmAt(h, { valor: v + 1, lvl: 0 }), bmS = T.hdBmAt(h, { valor: v + 1 });
  if (!g.includes(T.fmt(bm0)) || !g.includes(T.fmt(bmA)) || !g.includes(T.fmt(bmS))) say(`превью: мощь ${bm0} → ${bmA}, на прежнем уровне ${bmS} — не все числа видны`);
  if (!(bmS > bm0)) say(`превью: на прежнем уровне мощь не выросла — ${bm0} → ${bmS}`);
  if (!/Останутся/.test(g)) say('превью: не сказано, что сохранится');
  if (!g.includes('icons/valor.png') || !/data-a="valordo"/.test(g)) say('превью: у подтверждения нет цены руной доблести');
  if (!(v + 1 >= h.maxV)) for (const n of orderNames(h)) if (playerText(strip(g)).includes(n)) say(`превью до последней доблести называет орден «${n}»`);
  /* операция */
  const bag0 = T.BAG.qty(d.vr.id);
  run('доблесть · подтверждение', () => T.ACT.valordo(O.v)); cnt.ops++;
  if (h.valor !== v + 1 || h.lvl !== 0 || h.lim !== 0 || h.cap !== D.capByLim[0] || T.BAG.qty(d.vr.id) !== bag0 - 1) say(`доблесть: ${h.valor}/${h.lvl}/${h.lim}/${h.cap}, руна ${bag0} → ${T.BAG.qty(d.vr.id)}`);
  if (JSON.stringify(T.heroSt(h)) !== JSON.stringify(st1)) say('доблесть: характеристики после — не как в превью');
  if (h.bm !== bmA) say(`доблесть: мощь после — ${h.bm}, в превью ${bmA}`);
  const r = T.S.hd.srv[O.v.split(':')[0]];
  if (!r || r.ok !== 'valor' || r.was.bm !== bm0 || r.now.bm !== h.bm) say('доблесть: итог сервера без мощи было → стало');
  const fx = ovOf(view('доблесть · анимация'));
  if (!fx.includes('class="hdfx-stars"') || count(fx, /<i class="on new"><\/i>/g) !== 1 || !fx.includes('class="hdfx-rise"') || !fx.includes('что изменилось')) say('доблесть · анимация: нет звёзд с новой, взлёта значка или карточки «Что изменилось»');
  /* строк: доблесть, характеристики, способности этой доблести по набору, глава, раскрытие; уровень, пределы, мощь — набор сжат
     к личному максимуму (ADR-0031, п. 7), поэтому число строк — по данным героя, а не постоянное */
  const rowsWant = 5 + T.hdOpens(h, v + 1).length + (ch != null ? 1 : 0) + (r && r.reveal ? 1 : 0);
  if (count(fx, /<li style="--k:\d+">/g) !== rowsWant) say(`доблесть · «Что изменилось»: строк ${count(fx, /<li style="--k:\d+">/g)}, по набору и главам — ${rowsWant}`);
  for (const t of ['Доблесть', 'Характеристики', 'Уровень', 'Рунный предел', 'Мощь']) if (!fx.includes(`<span class="k">${t}</span>`)) say(`«Что изменилось»: нет строки «${t}»`);
  if (count(fx, /<s>/g) < 3) say('«Что изменилось»: мало строк «было → стало»');
  if (count(fx, /<span class="rp i" role="img"/g) !== 2 || /class="limits"/.test(fx)) say('«Что изменилось»: рунные пределы не строкой камней «было → стало»');
  if (ch && !fx.includes('data-a="hdread"')) say('«Что изменилось»: нет «Читать главу»');
  run('доблесть · пропуск', () => T.ACT.hdskip());
  run('доблесть · читать главу', () => T.ACT.hdread());
  if (T.S.overlay || T.S.seg.hero !== 'path' || T.S.selHero !== 'h4') say('«Читать главу» не открыло «Путь» героя');
  const b1 = snapBag(); run('доблесть · повтор', () => T.ACT.valordo(O.v)); cnt.ops++;
  if (h.valor !== v + 1 || snapBag() !== b1) say('доблесть: повтор номера что-то изменил');
  /* недоступно: не пятый предел — нет подтверждения, причина; руны нет, осколков хватает — «Собрать руну» */
  /* герой — с доблестью ниже максимума и не на пятом пределе (у демо-отряда ADR-0031 это любой, кроме Хравна) */
  fresh(); const hx = T.S.heroes.find(x => x.valor < x.maxV && x.lim < D.valorAtLim) || T.H('h2'), dx = T.heroDev(hx); T.BAG.add(dx.vs.id, dx.vsNeed);
  run('доблесть · рано', () => T.ACT.valor(hx.id));
  let gx = ovOf(view('доблесть · рано'));
  if (/data-a="valordo"/.test(gx) || T.S.overlay.act) say('доблесть не на пятом пределе: есть подтверждение');
  if (!gx.includes(`рунного предела ${T.ROMAN[D.valorAtLim]}`)) say('доблесть не на пятом пределе: нет причины');
  if (!gx.includes(`data-a="valorcraft" data-v="${dx.rec.id}"`)) say('доблесть: осколков хватает, а «Собрать руну» нет');
  const b2 = snapBag(), vv = hx.valor; run('доблесть · рано · операция', () => T.ACT.valordo(hx.id)); cnt.ops++;
  if (hx.valor !== vv || snapBag() !== b2) say('доблесть не на пятом пределе: что-то списалось');
  /* личный максимум — герой, у которого доблесть уже на максимуме (у демо-отряда ADR-0031 — Хравн) */
  const hm = T.S.heroes.find(x => x.maxV > 0 && x.valor >= x.maxV) || T.H('h3');
  run('доблесть · максимум', () => T.ACT.valor(hm.id));
  if (!ovOf(view('доблесть · максимум')).includes('личный максимум')) say('доблесть на максимуме: нет причины');
  /* последняя доблесть: орден раскрыт или «вне орденов»; Безликий — память */
  fresh(); const hl = prepValor(T.HD_DATA.flow.last, T.H(T.HD_DATA.flow.last).maxV - 1), names = orderNames(hl);
  run('последняя · превью', () => T.ACT.valor(hl.id));
  const gp = ovOf(view('последняя доблесть · превью'));
  if (!/Орден|Память/.test(gp)) say('последняя доблесть: превью не говорит про орден');
  for (const n of names) if (playerText(strip(gp)).includes(n)) say(`последняя доблесть: превью раскрывает орден «${n}» до подтверждения`);
  run('последняя · подтверждение', () => T.ACT.valordo(T.S.overlay.v)); cnt.ops++;
  const gf = ovOf(view('последняя доблесть · анимация'));
  if (names.length ? !names.every(n => gf.includes(n)) : !gf.includes('вне орденов')) say(`последняя доблесть: «Что изменилось» не раскрывает орден — ${names.join(', ') || 'вне орденов'}`);
}

/* ================== 6б. руна обучения (ADR-0031, п. 2; §16): руну первой доблести даёт 8-й уровень аккаунта — на любом пределе ==================
   Отдельного предмета нет: признак — источник (HD_DATA.train), счёт — «сервер» развития S.hd.train. Обычная руна — только на пятом
   пределе; на пятом с обычной руной тратится обычная. Руна обучения — первая доблесть героя своего цикла; повтор номера ничего не меняет */
{
  const TR = T.HD_DATA.train;
  if (!TR || !Number.isInteger(TR.level) || !Number.isInteger(TR.cyc) || !Number.isInteger(TR.demo)) say('руна обучения: нет правила HD_DATA.train с уровнем, циклом и демо');
  else {
    fresh();
    if (T.S.hd.train !== (T.S.acc.level >= TR.level ? TR.demo : 0)) say(`руна обучения: у демо-аккаунта ${T.S.hd.train}, по правилу ${TR.demo}`);
    const pick = c => T.RS.heroes.find(r => r.src === 'gold' && r.c === c && r.maxV > 0 && !T.S.rs.owned[r.id] && !(T.hrTwin && T.S.heroes.some(x => T.hrTwin(x) === r)));
    const own = (r, lim, valor = 0) => { T.S.rs.owned[r.id] = { lvl: D.capByLim[lim], lim, valor, how: 'gold' }; return T.H(r.id); };
    const x1 = pick(TR.cyc), x2 = pick(TR.cyc + 1);
    if (!x1) say('руна обучения: нет золотого героя цикла I');
    else {
      /* второй биом: предел I, руны обучения нет — доблести нет */
      fresh(); let h = own(x1, 1); const vr = T.heroDev(h).vr, b0 = snapBag();
      run('руна обучения · без руны', () => T.ACT.valor(h.id));
      if (T.S.overlay && T.S.overlay.act) say('руна обучения: без руны на пределе I есть подтверждение');
      run('руна обучения · без руны · операция', () => T.ACT.valordo(`hd${T.S.hd.seq}:${h.id}`));
      if (h.valor !== 0 || snapBag() !== b0) say('руна обучения: без руны на пределе I доблесть взята');
      /* обычная руна доблести на пределе I — нельзя */
      if (vr) { T.BAG.add(vr.id, 1); const b1 = snapBag(); run('обычная руна · предел I', () => T.ACT.valordo(`hd${T.S.hd.seq}:${h.id}`)); if (h.valor !== 0 || snapBag() !== b1) say('руна обучения: обычная руна доблести сработала на пределе I'); }
      /* руна обучения на пределе I — можно: превью со строкой, операция с номером, руна обучения тратится, запасы — нет */
      fresh(); h = own(x1, 1); T.S.hd.train = 1; card(h.id, 'power');
      const g0 = tabOf(view('руна обучения · путь'));
      if (!/class="hdv-star ready dot"/.test(g0)) say('руна обучения: звезда доблести на пути не готова');
      run('руна обучения · превью', () => T.ACT.valor(h.id));
      const O = T.S.overlay, g = ovOf(view('руна обучения · превью'));
      if (!O || O.act !== 'valordo') say('руна обучения: в превью нет подтверждения');
      if (!playerText(strip(g)).includes('Руна обучения: можно на любом пределе')) say('руна обучения: в превью нет строки «Руна обучения: можно на любом пределе»');
      if (!/data-a="valordo"[^>]*>Взять доблесть<span class="cost"><img[^>]*alt="Руна обучения"/.test(g)) say('руна обучения: у подтверждения нет цены руной обучения');
      const b2 = snapBag();
      if (O) run('руна обучения · подтверждение', () => T.ACT.valordo(O.v)); cnt.ops++;
      if (h.valor !== 1 || h.lim !== 0 || h.lvl !== 0 || T.S.hd.train !== 0 || snapBag() !== b2) say(`руна обучения: доблесть ${h.valor}, предел ${h.lim}, рун обучения ${T.S.hd.train}, запасы ${snapBag() === b2 ? 'те же' : 'изменились'}`);
      if (h.keep !== 1) say(`руна обучения: пределы прошлого круга ${h.keep}, ждали 1 — сила коллекции держит только пройденные`);
      const r = O && T.S.hd.srv[O.v.split(':')[0]]; if (!r || !r.train || r.rune) say('руна обучения: итог сервера не говорит, что взята руна обучения');
      if (O) { run('руна обучения · повтор', () => T.ACT.valordo(O.v)); if (h.valor !== 1 || T.S.hd.train !== 0) say('руна обучения: повтор номера что-то изменил'); }
      /* пятый предел, обычная руна есть — тратится обычная, руна обучения остаётся */
      fresh(); h = own(x1, TOP); T.S.hd.train = 1; const d5 = T.heroDev(h);
      if (d5.vr) { if (!d5.vrHave) T.BAG.add(d5.vr.id, 1); const q = T.BAG.qty(d5.vr.id); run('пятый предел · обычная', () => T.ACT.valordo(`hd${T.S.hd.seq}:${h.id}`));
        if (h.valor !== 1 || T.BAG.qty(d5.vr.id) !== q - 1 || T.S.hd.train !== 1) say('руна обучения: на пятом пределе с обычной руной потрачена не обычная'); }
      /* не первая доблесть и чужой цикл — руна обучения не подходит */
      fresh(); T.S.hd.train = 1; h = own(x1, 1, 1);
      if (T.heroDev(h).train) say('руна обучения: подходит герою не на первой доблести');
      if (x2) { h = own(x2, 1); if (T.heroDev(h).train) say('руна обучения: подходит герою цикла II'); }
    }
  }
}

/* ================== 7. анимации: время, пропуск, меньше движения, только transform и opacity ================== */
{
  const kf = [...CSS.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)];
  if (kf.length < 10) say(`hero-dev.css: ключевых кадров ${kf.length} — анимаций мало`);
  for (const [, n, b] of kf) {
    const props = [...b.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]).filter(p => !/^(from|to)$/.test(p));
    const bad = props.filter(p => !['transform', 'opacity'].includes(p));
    if (bad.length) say(`hero-dev.css: @keyframes ${n} меняет ${[...new Set(bad)].join(', ')} — только transform и opacity`);
  }
  const rm = CSS.match(/@media \(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
  if (!rm || !/\.hdfx/.test(rm[1]) || !/animation:none/.test(rm[1])) say('hero-dev.css: при prefers-reduced-motion анимации не выключены');
  if (!rm || !/\.rp-s::after/.test(rm[1]) || !/\.rp-s\.ready::after\{opacity:/.test(rm[1])) say('hero-dev.css: при prefers-reduced-motion пульс рунных камней не выключен или «можно пробить» без ровного света');
  /* рунный камень: погасший — фон, горящий со светом — слой ::after; пульс и загорание меняют только opacity */
  for (const [n, re] of [['камень .rp-s с погасшим фоном', /\.rp-s\{[^}]*background:var\(--rp-off\)/], ['горящий слой ::after', /\.rp-s::after\{[^}]*opacity:0;background:var\(--rp-on\)/],
    ['горит пройденный', /\.rp-s\.on::after\{opacity:1\}/], ['тлеет на потолке', /\.rp-s\.wait::after\{opacity:\.\d+\}/], ['пульсирует, когда можно пробить', /\.rp-s\.ready::after\{animation:rpPulse /],
    ['SVG-заглушка камня', /--rp-on:url\("data:image\/svg\+xml,[^"]+"\);\s*--rp-off:url\("data:image\/svg\+xml,[^"]+"\)/], ['нарисованный камень у крупных', /\.rp-s\.p\{background-image:var\(--rp-off-p,var\(--rp-off\)\)\}/]])
    if (!re.test(CSS)) say(`hero-dev.css: нет — ${n}`);
  /* нарисованный камень: в RP_ART.ready — только выгруженные файлы */
  for (const p of T.RP_ART.ready) if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`RP_ART.ready: ${p} — файла нет в assets/art`);
  if (!/\.hdfx\.done[^{]*\{animation:none!important\}/.test(CSS)) say('hero-dev.css: пропуск (.done) не выключает анимации');
  if (!/calc\(\(var\(--d[a-z]*\) - var\(--el\)\) \* 1ms\)/.test(CSS)) say('hero-dev.css: задержки не отсчитаны от начала показа (--el)');
  /* меньше движения: итог сразу — класс done, частиц нет */
  const R = load({ reduced: true }), X = R.T;
  X.S = X.initialState(); X.S.overlay = null;
  const h = X.H('h2'), limR = h.lim; X.S.selHero = 'h2';
  run('меньше движения', () => { X.ACT.limit('h2'); X.ACT.limitdo(X.S.overlay.v); X.render(); });
  if (!/class="ov hdfx hdfx-lim done"/.test(R.game()) || R.timers.length) say('prefers-reduced-motion: анимация не сразу итог или ждут частицы');
  if (h.lim !== limR + 1) say('prefers-reduced-motion: предел не пробит');
  /* обычный показ: частицы назначены на время вспышки */
  const Q = load(), Y = Q.T; Y.S = Y.initialState(); Y.S.overlay = null; Y.S.selHero = 'h2';
  run('частицы', () => { Y.ACT.limit('h2'); Y.ACT.limitdo(Y.S.overlay.v); });
  if (!Q.timers.some(([, ms]) => ms === Y.HD_VIEW.lim.burst)) say('анимация предела: вспышка частиц не назначена на HD_VIEW.lim.burst');
  /* перерисовка посреди анимации не рвёт её: --el растёт */
  Q.setNow(700); Y.render(); const e1 = (Q.game().match(/--el:(\d+)/) || [])[1];
  if (+e1 !== 700) say(`анимация: после перерисовки --el ${e1}, ждали 700`);
}

/* ================== 8. окно снаряжения ================== */
fresh();
{
  const h = T.H('h1');
  card('h1', 'gear'); T.S.overlay = { t: 'gear', arg: 'h1' };
  let g = ovOf(view('окно · открыто'));
  if (!/class="ov gw-ov in"/.test(g)) say('окно: при открытии нет входа (класс in)');
  if (count(g, /data-gslot="eq:/g) !== 9 || count(g, /data-gslot="tal:/g) !== 4) say(`окно: мест ${count(g, /data-gslot="eq:/g)} + ${count(g, /data-gslot="tal:/g)}, ждали 9 + 4`);
  if (!/data-gdrop="stock"/.test(g) || count(g, /class="gw-it[ "][^>]*data-gdrag="eq:/g) !== Object.values(T.S.eq.items).length) say('окно: не все предметы запасов — перетаскиваемые плитки');
  if (/class="ov gw-ov in"/.test(ovOf(view('окно · вторая отрисовка')))) say('окно: вход играет на каждой перерисовке');
  /* нажатие: предмет → его место подсвечено, остальные — тусклые; место → надето */
  const it = Object.values(T.S.eq.items).find(x => !x.on);
  run('окно · выбор', () => T.ACT.gearpick('eq:' + it.uid));
  g = ovOf(view('окно · выбран предмет'));
  if (!new RegExp(`class="gw-slot eq[^"]* ok[^"]*"[^>]*data-gslot="eq:${it.slot}"`).test(g)) say('окно: место выбранного предмета не подсвечено');
  if (count(g, /class="gw-slot eq[^"]* dim/g) !== 8) say(`окно: тусклых мест снаряжения ${count(g, /class="gw-slot eq[^"]* dim/g)}, ждали 8`);
  if (!/data-a="eqput"/.test(g) || !/gw-bmd/.test(g) || !/[▲▼=]/.test(g)) say('окно: у выбранного нет «Надеть», мощи или стрелок сравнения');
  run('окно · место', () => T.ACT.gearslot('eq:' + it.slot)); cnt.ops++;
  if (it.on !== 'h1' || (T.S.eq.worn.h1 || {})[it.slot] !== it.uid) say('окно: нажатие на подсвеченное место не надело предмет');
  /* сравнение: в слоте, где есть предметы с разной главной строкой, надет слабый, выбран сильный — стрелки у строк и у мощи в шапке */
  const free = Object.values(T.S.eq.items).filter(x => !x.on), bySlot = {};
  for (const x of free) (bySlot[x.slot] = bySlot[x.slot] || []).push(x);
  const pair = Object.values(bySlot).map(l => l.slice().sort((a, b) => a.lines[0][1] - b.lines[0][1])).find(l => l.length > 1 && l[0].lines[0][1] < l[l.length - 1].lines[0][1]);
  if (!pair) say('демо-запасы: нет слота с двумя разными предметами для сравнения');
  else {
    run('окно · надеть слабый', () => T.ACT.eqput(`eq${T.S.eq.seq}:h1:${pair[0].uid}`)); cnt.ops++;
    run('окно · сравнение', () => T.ACT.gearpick('eq:' + pair[pair.length - 1].uid));
    g = ovOf(view('окно · сравнение'));
    if (!/class="gw-d up">▲/.test(g) || !/<i class="num up">▲/.test(g) || !/class="chip gw-bmd up"/.test(g)) say('окно: сравнение без стрелок вверх у строк, у мощи в шапке или в карточке');
    run('окно · снять выбор', () => T.ACT.gearpick('eq:' + pair[pair.length - 1].uid));
  }
  /* снять — кнопкой и перетаскиванием в запасы */
  run('окно · место надетого', () => T.ACT.gearslot('eq:' + it.slot));
  g = ovOf(view('окно · надетый предмет'));
  if (!new RegExp(`data-a="eqout" data-v="eq\\d+:h1:${it.slot}"`).test(g)) say('окно: у надетого нет «Снять»');
  run('окно · бросок в запасы', () => T.grDrop(`slot:eq:${it.slot}`, { dataset: { gdrop: 'stock' } })); cnt.ops++;
  if (it.on) say('окно: перетаскивание надетого в запасы не сняло его');
  /* перетаскивание из запасов в место: своё место — надето, чужое — отказ */
  const it3 = Object.values(T.S.eq.items).find(x => !x.on && x.slot !== 'head');
  run('окно · бросок не туда', () => T.grDrop('eq:' + it3.uid, { dataset: { gslot: 'eq:head' } }));
  if (it3.on) say('окно: предмет надет не в своё место');
  run('окно · бросок в место', () => T.grDrop('eq:' + it3.uid, { dataset: { gslot: 'eq:' + it3.slot } })); cnt.ops++;
  if (it3.on !== 'h1') say('окно: перетаскивание в своё место не надело предмет');
  /* бросок мимо места, но на героя: предмет ложится в своё место */
  const it4 = Object.values(T.S.eq.items).find(x => !x.on && x.slot !== it3.slot);
  if (it4) { run('окно · бросок на героя', () => T.grDrop('eq:' + it4.uid, { dataset: { gdrop: 'hero' } })); cnt.ops++; if (it4.on !== 'h1') say('окно: бросок на героя мимо места не надел предмет в его место'); }
  /* талисманы: чужой класс — тусклый со значком класса и причиной; подходящий — в место */
  run('окно · талисманы', () => T.ACT.geartab('tal'));
  g = ovOf(view('окно · талисманы'));
  const TL = T.TL, list = T.TB.list(), mism = list.find(x => T.tlFam(x.no).cls && T.tlR(x.no) < TL.rules.freeFrom && T.tlWhy(h, x.no, 0) === 'cls');
  const fit = list.find(x => !T.tlWhy(h, x.no, 0) && T.tlFam(x.no).bm);
  if (!mism || !fit) say('демо-запасы: нет талисмана чужого класса или подходящего боевого');
  else {
    if (!new RegExp(`class="gw-it tal off[^"]*"[^>]*data-v="tal:${mism.no}"`).test(g)) say('окно: талисман чужого класса не тусклый');
    if (!/class="gw-cls no"/.test(g) || !/class="gw-cls"/.test(g)) say('окно: у талисманов с привязкой нет значка класса — своего и чужого');
    const firstOff = g.search(/class="gw-it tal off/), lastOk = [...g.matchAll(/class="gw-it tal(?! off)[^"]*"/g)].map(m => m.index).pop();
    if (firstOff >= 0 && lastOk > firstOff) say('окно: подходящие талисманы не сверху');
    run('окно · чужой класс', () => T.ACT.gearpick('tal:' + mism.no));
    g = ovOf(view('окно · чужой класс'));
    if (!/data-a="talput"[^>]*disabled/.test(g) || !/class="gw-bind warn"/.test(g) || count(g, /class="gw-slot tal[^"]* no/g) !== 4) say('окно: чужой класс — не причина, не отказ в кнопке или места не отмечены');
    run('окно · чужой класс · место', () => T.ACT.gearslot('tal:0'));
    if (T.tlEq('h1')[0] === mism.no) say('окно: талисман чужого класса надет');
    run('окно · подходящий', () => T.ACT.gearpick('tal:' + fit.no));
    g = ovOf(view('окно · подходящий талисман'));
    if (!/class="gw-slot tal[^"]* ok/.test(g) || !/data-a="talput"(?![^>]*disabled)/.test(g)) say('окно: подходящий талисман не подсветил места или кнопка недоступна');
    const m0 = T.tlMul('h1');
    run('окно · талисман в место', () => T.ACT.gearslot('tal:1')); cnt.ops++;
    if (T.tlEq('h1')[1] !== fit.no) say('окно: нажатие на место не надело талисман');
    if (T.tlFam(fit.no).bm && !(T.tlMul('h1') > m0)) say('окно: боевой талисман не прибавил мощи');
    run('окно · талисман в запасы', () => T.grDrop('slot:tal:1', { dataset: { gdrop: 'stock' } })); cnt.ops++;
    if (T.tlEq('h1')[1]) say('окно: перетаскивание талисмана в запасы не сняло его');
  }
  /* «Надеть лучшее»: операция с номером, мощь растёт, повтор ничего не меняет */
  fresh(); const hb = T.H('h1'), plan = T.grPlan(hb), bm0 = hb.bm, op = `gr${T.S.gear.seq}`;
  if (!(plan.gain > 0) || !plan.eq.length) say('«Надеть лучшее»: в демо нет прибавки');
  run('лучшее', () => T.ACT.gearbest(`${op}:h1`)); cnt.ops++;
  if (!(hb.bm > bm0)) say(`«Надеть лучшее»: мощь ${bm0} → ${hb.bm}`);
  for (const x of plan.eq) if ((T.S.eq.worn.h1 || {})[x.slot] !== x.uid) say(`«Надеть лучшее»: в место ${x.slot} не лёг выбранный предмет`);
  if (Object.values(T.S.eq.items).some(x => x.on && x.on !== 'h1')) say('«Надеть лучшее»: взяло вещь с другого героя');
  const w1 = JSON.stringify(T.S.eq.worn); run('лучшее · повтор', () => T.ACT.gearbest(`${op}:h1`)); cnt.ops++;
  if (JSON.stringify(T.S.eq.worn) !== w1) say('«Надеть лучшее»: повтор номера что-то изменил');
  if (T.grPlan(hb).gain > 0) say('«Надеть лучшее»: после него план всё ещё находит прибавку');
  /* листы OV.tal и OV.eq — то же окно на своём месте; выбранный для места сохраняется */
  fresh(); T.S.tal.pick = T.TB.list()[0].no; T.S.tal.pickFor = 'h4:2'; T.S.overlay = { t: 'tal', arg: 'h4:2' };
  g = ovOf(view('лист талисманов → окно'));
  if (!/class="gw"/.test(g) || T.S.gear.focus !== 'tal:2' || T.S.gear.tab !== 'tal' || T.S.tal.pick !== T.TB.list()[0].no) say('OV.tal: не окно снаряжения на своём месте или выбранный потерян');
  fresh(); T.S.overlay = { t: 'eq', arg: 'h1:ring' }; g = ovOf(view('лист снаряжения → окно'));
  if (!/class="gw"/.test(g) || T.S.gear.focus !== 'eq:ring' || !/class="chip gw-filt"/.test(g)) say('OV.eq: не окно на месте слота или запасы не отобраны по слоту');
  /* другой герой — не закрывая окна */
  run('окно · следующий герой', () => T.ACT.gearhero('1'));
  if (T.S.gear.hid === 'h1' || T.S.selHero !== T.S.gear.hid) say('окно: переключение героя не сработало');
  view('окно · другой герой');
}

/* ================== 8а. окно — оружейная героя ==================
   Слово автора 30.09.2026: «окно талисманов и снаряжения выглядят теперь как заглушка». Колонки — герой, запасы, карточка; у героя —
   ниша с портретом и места-гнёзда: доспех столбцом слева, оружие и украшения справа, талисманы под портретом; вещь в гнезде и в запасах
   — в единой рамке предмета (itf) с редкостью; одно главное действие — внизу карточки: без выбора — «Надеть лучшее», с выбором —
   «Надеть» или «Заменить»; сравнение — «надето → эта» по строкам и мощь героя «было → станет» */
fresh();
{
  T.S.overlay = { t: 'gear', arg: 'h1' };
  let g = ovOf(view('окно · оружейная'));
  const order = [...g.matchAll(/<(?:section|aside) class="(gw-hero|gw-stock|gw-card)[ "]/g)].map(m => m[1]).join(' ');
  if (order !== 'gw-hero gw-stock gw-card') say(`окно: колонки «${order}», ждали герой — запасы — карточка`);
  const doll = (g.match(/<div class="gw-doll">([\s\S]*?)<\/section>/) || [])[1] || '';
  const cols = [...doll.matchAll(/<div class="gw-col">([\s\S]*?)<\/div>/g)].map(m => [...m[1].matchAll(/data-gslot="eq:(\w+)"/g)].map(x => x[1]).join(','));
  const armor = T.EQD.rules.slots.filter(s => T.EQD.slots[s].grp === 'armor').join(','), rest = T.EQD.rules.slots.filter(s => T.EQD.slots[s].grp !== 'armor').join(',');
  if (cols[0] !== armor || cols[1] !== rest) say(`окно: гнёзда «${cols.join(' | ')}», ждали доспех слева (${armor}) и оружие с украшениями справа (${rest})`);
  if (!/<span class="gw-por" aria-hidden="true"><img src="[^"]+"/.test(doll) || count((doll.match(/<div class="gw-tals">[\s\S]*$/) || [''])[0], /data-gslot="tal:\d"/g) !== 4) say('окно: в нише нет портрета героя или четырёх мест талисманов под ним');
  if (count(g, /class="btn go[ "]/g) !== 1 || !/<button class="btn go gw-go gw-best" data-a="gearbest"[^>]*>Надеть лучшее<span class="cost num">▲[^<]+<\/span><\/button><\/div><\/aside>/.test(g)) say(`окно без выбора: главных кнопок ${count(g, /class="btn go[ "]/g)}, ждали одну — «Надеть лучшее» с прибавкой внизу карточки`);
  /* надетая вещь — в единой рамке предмета с редкостью; плитки запасов — тоже */
  run('окно · лучшее', () => T.ACT.gearbest(`gr${T.S.gear.seq}:h1`)); g = ovOf(view('окно · надето лучшее'));
  const worn = T.eqWornList('h1'); if (!worn.length) say('окно: «Надеть лучшее» ничего не надело');
  for (const it of worn) if (!new RegExp(`data-gslot="eq:${it.slot}"[^>]*><span class="gw-pic itf" data-r="${it.r}">`).test(g)) { say(`окно: надетая вещь ${it.slot} — не в единой рамке предмета с редкостью ${it.r}`); break; }
  if (/data-gslot="eq:\w+"[^>]*><span class="gw-pic itf/.test(g.replace(/<button class="gw-slot eq on[^"]*"[^>]*>/g, ''))) say('окно: пустое гнездо в рамке предмета');
  const tiles = [...g.matchAll(/<button class="gw-it[^"]*" data-r="(\d)"[^>]*data-gdrag="eq:[^"]+"[^>]*><span class="eq-t lg itf" data-r="(\d)"/g)];
  if (!tiles.length || tiles.some(m => m[1] !== m[2])) say('окно: плитки снаряжения в запасах — не в единой рамке предмета с редкостью');
  /* выбор: сравнение «надето → эта» по строкам и мощь героя «было → станет»; одно главное действие — «Заменить» последним в карточке */
  const it2 = Object.values(T.S.eq.items).find(x => !x.on && worn.some(w => w.slot === x.slot));
  if (!it2) say('демо-запасы: нет вещи для сравнения с надетой');
  else {
    run('окно · выбор для сравнения', () => T.ACT.gearpick('eq:' + it2.uid)); g = ovOf(view('окно · сравнение с надетым'));
    const cardH = (g.match(/<aside class="gw-card"[\s\S]*?<\/aside>/) || [''])[0], bm1 = T.fmt(T.BM.hero(Object.assign({}, T.H('h1'))));
    if (!/<div class="gw-lh" aria-hidden="true"><span>свойство<\/span><span>надето<\/span><span>эта<\/span>/.test(cardH) || !/<div class="gw-ln main"><span class="k">[\s\S]*?<\/span><s class="num">[^<]*<\/s><b class="num">[^<]*<\/b><span class="gw-d/.test(cardH)) say('окно: сравнение без столбцов «надето → эта»');
    if (!new RegExp(`<div class="gw-pw"[\\s\\S]*?<s class="num">${bm1.replace(/\s/g, '\\s')}</s><i aria-hidden="true">→</i><b class="num">[^<]+</b>`).test(cardH)) say('окно: в карточке нет мощи героя «было → станет»');
    if (count(g, /class="btn go[ "]/g) !== 1 || !/<button class="btn go gw-go" data-a="eqput"[^>]*>Заменить<\/button><\/div><\/aside>/.test(cardH)) say('окно: у выбранной вещи главное действие — не одно «Заменить» внизу карточки');
  }
  cnt.states++;
}

/* ================== 8б. жест: нажатие, перетаскивание, прокрутка пальцем, гашение щелчка ==================
   Поддельный DOM: #game ловит pointerdown и щелчок, окно — pointermove и pointerup; elementFromPoint отдаёт место, героя или запасы */
{
  const G = load(), X = G.T;
  X.S = X.initialState(); X.S.overlay = { t: 'gear', arg: 'h1' }; X.render();
  const cls = () => { const set = new Set(); return { add: (...c) => c.forEach(x => set.add(x)), remove: (...c) => c.forEach(x => set.delete(x)), contains: c => set.has(c), set }; };
  const gw = { id: 'gw' }, stock = { dataset: { gdrop: 'stock' }, classList: cls() }, hero = { dataset: { gdrop: 'hero' }, classList: cls() };
  const it = Object.values(X.S.eq.items).find(x => !x.on);
  const slot = { dataset: { gslot: 'eq:' + it.slot }, classList: cls() }, other = { dataset: { gslot: 'eq:' + (it.slot === 'head' ? 'chest' : 'head') }, classList: cls() };
  slot.closest = sel => sel === '.gw [data-gslot]' ? slot : sel === '.gw [data-gdrop]' ? hero : null;
  other.closest = sel => sel === '.gw [data-gslot]' ? other : sel === '.gw [data-gdrop]' ? hero : null;
  hero.closest = sel => sel === '.gw [data-gdrop]' ? hero : null;
  stock.closest = sel => sel === '.gw [data-gdrop]' ? stock : null;
  const tile = { dataset: { gdrag: 'eq:' + it.uid, r: String(it.r) }, classList: cls(), innerHTML: '<span></span>', setPointerCapture() {} };
  tile.closest = sel => sel === '[data-gdrag]' ? tile : sel === '.gw' ? gw : sel === '.gw-stock' ? stock : null;
  const gl = {}, game = { dataset: {}, offsetWidth: 932, getBoundingClientRect: () => ({ left: 0, top: 0, width: 932, height: 430 }), appendChild: x => { game.kids = (game.kids || []).concat(x); return x; },
    addEventListener: (t, f) => { (gl[t] = gl[t] || []).push(f); }, querySelectorAll: () => [], innerHTML: '' };
  G.els.game = game;
  const ghosts = [];
  G.document.createElement = () => { const e = { className: '', dataset: {}, style: {}, classList: cls(), setAttribute() {}, remove() { e.gone = true; } }; ghosts.push(e); return e; };
  G.document.querySelectorAll = sel => sel === '.gw [data-gslot]' ? [slot, other] : sel === '.gw .drop-ok, .gw .drop-no' ? [slot, other].filter(x => x.classList.contains('drop-ok') || x.classList.contains('drop-no')) : [];
  G.document.querySelector = sel => sel === '.gw-stock' ? stock : null;
  let under = null; G.document.elementFromPoint = () => under;
  run('жест · привязка', () => X.grBind()); run('жест · привязка второй раз', () => X.grBind());
  if ((gl.pointerdown || []).length !== 1 || (gl.click || []).length !== 1) say('жест: #game ловит pointerdown и щелчок не по одному разу');
  else {
    const fire = (t, e) => { for (const f of (G.wl[t] || []).slice()) f(Object.assign({ pointerId: 1, cancelable: true, preventDefault() {} }, e)); };
    const down = (type, x, y) => gl.pointerdown[0]({ target: tile, button: 0, clientX: x, clientY: y, pointerId: 1, pointerType: type });
    const click = () => { let stopped = false; gl.click[0]({ stopPropagation() { stopped = true; }, preventDefault() {} }); return stopped; };
    /* нажатие без движения — обычный щелчок: ничего не надето, щелчок не гасится */
    run('жест · нажатие', () => { down('mouse', 100, 100); fire('pointerup', { clientX: 101, clientY: 100 }); });
    if (it.on || ghosts.length || click()) say('жест: нажатие без движения стало перетаскиванием или погасило щелчок');
    /* мышь: вбок и на чужое место — отказ; призрак убран; щелчок после броска гасится */
    run('жест · мимо места', () => { down('mouse', 100, 100); fire('pointermove', { clientX: 130, clientY: 104 }); under = other; fire('pointermove', { clientX: 60, clientY: 90 }); fire('pointerup', { clientX: 60, clientY: 90 }); });
    if (it.on) say('жест: предмет надет не в своё место');
    if (!ghosts.length || !ghosts.every(g => g.gone)) say('жест: призрак не появился или не убран после броска');
    if (!click()) say('жест: щелчок после броска не погашен');
    /* мышь: на своё место — подсвечено при перетаскивании, после броска — надето, подсветка снята */
    under = slot;
    run('жест · в место', () => { down('mouse', 100, 100); fire('pointermove', { clientX: 120, clientY: 100 }); if (!slot.classList.contains('drop-ok')) say('жест: своё место не подсвечено при перетаскивании'); fire('pointermove', { clientX: 40, clientY: 60 }); fire('pointerup', { clientX: 40, clientY: 60 }); });
    if (it.on !== 'h1') say('жест: перетаскивание мышью на своё место не надело предмет');
    if (slot.classList.contains('drop-ok') || slot.classList.contains('drop-over')) say('жест: подсветка мест осталась после броска');
    /* палец в запасах: сначала вверх — это прокрутка списка, перетаскивания нет */
    const it2 = Object.values(X.S.eq.items).find(x => !x.on && x.slot !== it.slot);
    tile.dataset.gdrag = 'eq:' + it2.uid; const n0 = ghosts.length;
    run('жест · прокрутка пальцем', () => { down('touch', 100, 100); fire('pointermove', { clientX: 102, clientY: 130 }); fire('pointermove', { clientX: 40, clientY: 60 }); fire('pointerup', { clientX: 40, clientY: 60 }); });
    if (ghosts.length !== n0 || it2.on) say('жест: движение пальца вверх-вниз в запасах начало перетаскивание вместо прокрутки');
    if ((G.wl.pointermove || []).length) say('жест: слушатели окна не сняты после жеста');
    /* палец вбок — перетаскивание; бросок на героя мимо места — предмет в своё место */
    under = hero;
    run('жест · палец вбок', () => { down('touch', 100, 100); fire('pointermove', { clientX: 70, clientY: 102 }); fire('pointermove', { clientX: 30, clientY: 80 }); fire('pointerup', { clientX: 30, clientY: 80 }); });
    if (it2.on !== 'h1') say('жест: пальцем вбок на героя — предмет не лёг в своё место');
    /* надетое — из места в запасы: снято */
    const slotTile = { dataset: { gdrag: 'slot:eq:' + it2.slot }, classList: cls(), innerHTML: '', setPointerCapture() {} };
    slotTile.closest = sel => sel === '[data-gdrag]' ? slotTile : sel === '.gw' ? gw : null;
    under = stock;
    run('жест · снять в запасы', () => { gl.pointerdown[0]({ target: slotTile, button: 0, clientX: 40, clientY: 60, pointerId: 1, pointerType: 'mouse' }); fire('pointermove', { clientX: 200, clientY: 60 }); fire('pointermove', { clientX: 500, clientY: 200 }); fire('pointerup', { clientX: 500, clientY: 200 }); });
    if (it2.on) say('жест: перетаскивание надетого в запасы не сняло его');
    cnt.ops += 3;
  }
}

/* ================== 9. режим «Игрок» и «Команда» ================== */
for (const team of [false, true]) {
  run('режим', () => T.setTeam(team));
  fresh();
  for (const h of T.S.heroes) for (const tab of ['power', 'gear']) { card(h.id, tab); view(`${team ? 'Команда' : 'Игрок'} · ${h.name} · ${tab}`); }
  for (const [a, v] of [['limit', 'h1'], ['limit', 'h2'], ['valor', 'h1'], ['valor', 'h3'], ['valor', 'h4']]) { fresh(); card(v, 'power'); run(a, () => T.ACT[a](v)); view(`${team ? 'Команда' : 'Игрок'} · лист ${a} ${v}`); }
  fresh(); prepValor('h4'); run('анимация', () => { T.ACT.valor('h4'); T.ACT.valordo(T.S.overlay.v); }); view(`${team ? 'Команда' : 'Игрок'} · анимация доблести`);
  for (const hid of T.S.heroes.map(h => h.id)) { fresh(); T.S.overlay = { t: 'gear', arg: hid }; view(`${team ? 'Команда' : 'Игрок'} · окно ${hid}`); run('вкладка', () => T.ACT.geartab('tal')); view(`${team ? 'Команда' : 'Игрок'} · окно ${hid} · талисманы`); }
  fresh(); T.S.acc.cycle = 1; card('h1', 'gear'); view(`${team ? 'Команда' : 'Игрок'} · цикл I · вкладка «Снаряжение»`); T.S.overlay = { t: 'gear', arg: 'h1' }; view(`${team ? 'Команда' : 'Игрок'} · цикл I · окно`);
}
run('режим «Игрок»', () => T.setTeam(false));

/* ================== 10. вёрстка: расчёт размеров на 932 × 430 и 844 × 390 ==================
   Размеры — из стилей (index.html, hero-dev.css, book-pages.css, book.css), ширина текста — оценка по кеглю: узкий шрифт интерфейса
   и цифры ~0,5 кегля на знак, прописные с разрядкой 0,1 em — ~0,7 кегля, книжный Cormorant ~0,46 кегля. Итог — что каждая область
   влезает в свою коробку */
{
  const px = (css, re, name) => { const m = css.match(re); if (!m) { say(`вёрстка: не найдено ${name}`); return 0; } return +m[1]; };
  const I = html;
  const SCR = [{ n: '932 × 430', W: 932, H: 430, top: 46, rail: 78, small: false }, { n: '844 × 390', W: 844, H: 390, top: 44, rail: 72, small: true }];
  const spM = px(I, /--sp-m:(\d+)px/, '--sp-m');
  const trackH = px(CSS, /\.hdv-track\{[^}]*height:(\d+)px/, '.hdv-track height');
  const w = (s, k, caps) => Math.ceil(String(s).length * k * (caps ? 0.7 : 0.5)), wd = (s, k) => Math.ceil(String(s).length * k * 0.46);
  /* рунные пределы: пропорция камня, камни-ворота на пути, ряд камней в анимации, строка в превью */
  const [ar1, ar2] = (CSS.match(/\.rp-s\{[^}]*aspect-ratio:(\d+)\/(\d+)/) || [0, 0, 0]).slice(1).map(Number);
  if (!ar1 || !ar2) say('вёрстка: нет пропорции камня .rp-s');
  /* правил мест в hero-dev.css нет: раскладку мест на странице книги задаёт только book-pages.css (каскад сверяет check_hero_book.js) */
  if (/\.hd-gear \.(?:eq|tl)-slots?\b/.test(CSS)) say('hero-dev.css: снова правила мест .hd-gear .eq-slot/.tl-slot — они спорят с раскладкой страницы книги');
  /* книга героя (screens/book.css, данные вида — HB_VIEW и HB_ART в screens/book.js; страницы — screens/book-pages.css): вкладки героя —
     на листе чернёного пергамента в правой странице разворота, у каждой ступени страница своя — считаем самую узкую и самую низкую.
     Поля страницы — .hb-rp (inset) и поля листа (.hb-rp.pg{padding}), закладки — над верхним краем листа (.pg-tabs). «Развитие» —
     путь, строка «уровень · предел · доблесть», карточка шага во всю высоту: заголовок и «сколько за раз», превью «было → станет»,
     тихая строка характеристик, низ — мощь после шага и главная кнопка с ценой у правого края (раскладку задаёт book-pages.css) */
  const BCSS = read('screens/book.css'), PCSS = read('screens/book-pages.css'), BV = T.HB_VIEW, BA = T.HB_ART;
  const insM = BCSS.match(/\n\.hb-rp\{[^}]*inset:(\d+)px (\d+)px (\d+)px (\d+)px/), ins = insM ? insM.slice(1).map(Number) : (say('вёрстка: нет полей правой страницы .hb-rp{inset:…}'), [0, 0, 0, 0]);
  const reM = BCSS.match(/\n\.hb-rp\{[^}]*bottom:calc\((\d+)px \+ var\(--re,0\) \* 1% \/ 10\)/);
  if (!reM) say('вёрстка: правая страница снизу не поднята над полосой обреза (.hb-rp{bottom:calc(…)})'); else ins[2] = +reM[1];
  const sheetPad = (PCSS.match(/\n\.hb-rp\.pg\{padding:0 (\d+)px (\d+)(?:px)? (\d+)px\}/) || [0, 0, 0, 0]).slice(1).map(Number);
  const tabsH = px(PCSS, /\.pg-tabs\{[^}]*height:(\d+)px;margin-top:-\d+px/, '.pg-tabs height'), tabsUp = px(PCSS, /\.pg-tabs\{[^}]*height:\d+px;margin-top:-(\d+)px/, '.pg-tabs margin-top');
  const hdGap = px(BCSS, /\.hb-hd \.hd-body\{margin-top:0;gap:(\d+)px\}/, '.hb-hd .hd-body gap');
  /* «Развитие» на странице: числа — переменные book-pages.css и их значения на низком экране (.g.sm) */
  const pv = (re, name) => px(PCSS, re, name), smv = (sel, v, name) => px(PCSS, new RegExp(`\\.g\\.sm \\.pg ${sel}\\{[^}]*--${v}:(\\d+)px`), name);
  const hdvGap = [pv(/\.pg \.hdv\{gap:(\d+)px\}/, '.pg .hdv gap'), pv(/\.g\.sm \.pg \.hdv\{gap:(\d+)px\}/, '.g.sm .pg .hdv gap')];
  const sumF = pv(/\.hdv-sum b\{[^}]*font-size:(\d+)px/, '.hdv-sum b'), sumUp = pv(/\.hdv-sum\{[^}]*margin:-(\d+)px 0 0/, '.hdv-sum margin');
  const sumK = +((PCSS.match(/\.hdv-sum\{[^}]*font:\d+ ([\d.]+)px/) || [])[1] || 11.5), sumCaps = /\.hdv-sum\{[^}]*text-transform:uppercase/.test(PCSS);
  const nGap = [pv(/gap:var\(--pg-ng,(\d+)px\);padding:var\(--pg-np,\d+px\)/, 'карточка шага --pg-ng'), smv('\\.hb-hd \\.hdv-next', 'pg-ng', '.g.sm --pg-ng')];
  const nPad = [pv(/gap:var\(--pg-ng,\d+px\);padding:var\(--pg-np,(\d+)px\) (\d+)px/, 'карточка шага --pg-np'), smv('\\.hb-hd \\.hdv-next', 'pg-np', '.g.sm --pg-np')];
  const nPadX = pv(/gap:var\(--pg-ng,\d+px\);padding:var\(--pg-np,\d+px\) (\d+)px/, 'карточка шага поля по бокам');
  const nIc = [pv(/\.pg \.hb-hd \.hdv-ic\{[^}]*width:(\d+)px/, '.pg .hb-hd .hdv-ic'), pv(/\.g\.sm \.pg \.hb-hd \.hdv-ic\{width:(\d+)px/, '.g.sm .hdv-ic')];
  const nT = [pv(/\.pg \.hb-hd \.hdv-t\{[^}]*font:600 (\d+)px/, '.pg .hb-hd .hdv-t'), pv(/\.g\.sm \.pg \.hb-hd \.hdv-t\{font-size:(\d+)px\}/, '.g.sm .hdv-t')];
  const qH = [pv(/\.hdv-act \.qty button\{height:var\(--pg-qh,(\d+)px\)/, '«сколько за раз» у кнопки --pg-qh'), smv('\\.hdv-act', 'pg-qh', '.g.sm --pg-qh')];
  const qP = [pv(/\.hdv-act \.qty button\{[^}]*padding:0 var\(--pg-qp,(\d+)px\)/, '«сколько за раз» --pg-qp'), smv('\\.hdv-act', 'pg-qp', '.g.sm --pg-qp')];
  const pageTrack = pv(/\n\.pg \.hdv-track\{height:(\d+)px\}/, 'путь на странице .pg .hdv-track');
  if (!/\n\.pg \.hdv-gate small,\.pg \.hdv-star small\{display:none\}/.test(PCSS)) say('book-pages.css: на странице у пути остались подписи ворот и звезды — им нет места над превью шага');
  const gH = [pv(/min-height:var\(--pg-gh,(\d+)px\)/, 'строка превью --pg-gh'), smv('\\.hdv-g', 'pg-gh', '.g.sm --pg-gh')];
  const qR = [pv(/min-height:var\(--pg-qr,(\d+)px\)/, 'тихая строка --pg-qr'), smv('\\.hdv-quiet', 'pg-qr', '.g.sm --pg-qr')];
  const goH = [pv(/min-height:var\(--pg-goh,(\d+)px\)/, 'кнопка шага --pg-goh'), smv('\\.hdv-act', 'pg-goh', '.g.sm --pg-goh')];
  if (goH.some(v => v < 44)) say(`вёрстка: главная кнопка шага ниже 44 px (${goH.join(' и ')})`);
  /* места снаряжения на странице: сторона рамки (обычная и на низком экране), промежуток, подпись под рамкой */
  const slotW = px(PCSS, /--pw:var\(--pg-slot,(\d+)px\)/, 'место на странице --pg-slot'), slotWSm = px(BCSS, /\.g\.sm \.hb-rp\{[^}]*--pg-slot:(\d+)px/, '.g.sm --pg-slot');
  const slotG = px(PCSS, /var\(--pg-sg,(\d+)px\)/, 'промежуток мест --pg-sg'), slotGSm = px(BCSS, /\.g\.sm \.hb-rp\{[^}]*--pg-sg:(\d+)px/, '.g.sm --pg-sg');
  /* переменная страницы на низком экране: своё правило листа (book-pages.css, .g.sm .hb-rp.pg) — поверх book.css (.g.sm .hb-rp) */
  const bsm = (v, d) => { const m = PCSS.match(new RegExp(`\\.g\\.sm \\.hb-rp\\.pg\\{[^}]*--${v}:(\\d+)px`)) || BCSS.match(new RegExp(`\\.g\\.sm \\.hb-rp\\{[^}]*--${v}:(\\d+)px`)); return m ? +m[1] : d; };
  const gRg = px(PCSS, /gap:var\(--pg-rg,(\d+)px\)/, 'сетка мест --pg-rg'), gGv = px(PCSS, /gap:var\(--pg-gv,(\d+)px\)/, 'низ и сетки --pg-gv'), gGg = px(PCSS, /var\(--pg-gg,(\d+)px\)/, 'группы --pg-gg');
  const gRb = px(PCSS, /min-height:var\(--pg-rbh,(\d+)px\)/, 'рубрика --pg-rbh'), gCap = px(PCSS, /\.pg :is\(\.eq-slot,\.tl-slot\)\.none :is\(\.eq-cap,\.tl-cap\)\{font:italic 500 (\d+)px/, 'подпись пустого места');
  const gSlotGap = px(PCSS, /\.pg :is\(\.eq-slot,\.tl-slot\)\{[^}]*gap:(\d+)px/, 'место: рамка — подпись'), gFoot = px(PCSS, /\.pg \.hdg-f\{[^}]*padding-top:(\d+)px/, '.pg .hdg-f padding-top'), gBtn = px(PCSS, /\.pg \.hdg-f \.btn\{[^}]*min-height:(\d+)px/, '.pg .hdg-f .btn');
  if (gBtn < 44) say(`вёрстка: главная кнопка «Снаряжения» ниже 44 px (${gBtn})`);
  const gateSt = px(CSS, /\.hdv-gate \.rp-s\{width:(\d+)px\}/, '.hdv-gate .rp-s'), gateLbl = px(CSS, /\.hdv-gate small\{position:absolute;top:(\d+)px/, '.hdv-gate small top');
  const segH = px(CSS, /\.hdv-seg\{[^}]*height:(\d+)px;margin-top:\d+px/, '.hdv-seg height'), segTop = px(CSS, /\.hdv-seg\{[^}]*height:\d+px;margin-top:(\d+)px/, '.hdv-seg margin-top');
  const markSt = px(CSS, /\.hdfx-mark \.rp-s\{width:(\d+)px\}/, '.hdfx-mark .rp-s'), rowTop = px(CSS, /\.hdfx-row\{position:absolute;left:0;top:(\d+)px/, '.hdfx-row top');
  const rowSt = px(CSS, /\.hdfx-row \.rp-s\{width:(\d+)px\}/, '.hdfx-row .rp-s'), stagePct = px(CSS, /\.hdfx-stage\{position:absolute;left:50%;top:(\d+)%/, '.hdfx-stage top');
  const inlSt = px(CSS, /\.hdv-r \.v \.rp\.i \.rp-s\{width:(\d+)px\}/, 'камни в превью доблести'), inlGap = px(CSS, /\.hdv-r \.v \.rp\.i\{gap:(\d+)px\}/, 'промежуток камней в превью');
  const stH = sw => sw * ar2 / Math.max(1, ar1);
  /* окно снаряжения: шапка, поля и колонки (герой | запасы | карточка), гнёзда, ниша, талисманы, плитка запасов */
  const gw = (re, name) => px(CSS, re, name);
  const gwH = [gw(/\.gw-h\{[^}]*height:(\d+)px/, '.gw-h'), gw(/\.g\.sm \.gw-h\{height:(\d+)px\}/, '.g.sm .gw-h')];
  const gwPad = [gw(/\.gw-b\{[^}]*gap:\d+px;padding:(\d+)px\}/, '.gw-b padding'), gw(/\.g\.sm \.gw-b\{[^}]*padding:(\d+)px/, '.g.sm .gw-b padding')];
  const gwGap = [gw(/\.gw-b\{[^}]*gap:(\d+)px;padding:\d+px\}/, '.gw-b gap'), gw(/\.g\.sm \.gw-b\{[^}]*gap:(\d+)px/, '.g.sm .gw-b gap')];
  const gwL = [gw(/--gw-l,(\d+)px\)/, '--gw-l'), gw(/\.g\.sm \.gw-b\{--gw-l:(\d+)px/, '.g.sm --gw-l')], gwC = [gw(/--gw-c,(\d+)px\)/, '--gw-c'), gw(/\.g\.sm \.gw-b\{[^}]*--gw-c:(\d+)px/, '.g.sm --gw-c')];
  const gs = [gw(/\.gw-slot\{--gs:(\d+)px/, '.gw-slot --gs'), gw(/\.g\.sm \.gw-slot\{--gs:(\d+)px\}/, '.g.sm .gw-slot')];
  const gt = [gw(/grid-template-columns:repeat\(2,var\(--gt,(\d+)px\)\)/, 'талисман --gt'), gw(/\.g\.sm \.gw-tals\{--gt:(\d+)px/, '.g.sm --gt')];
  const gtGap = [(CSS.match(/\.gw-tals\{[^}]*gap:(\d+)px (\d+)px/) || [0, 0, 0]).slice(1).map(Number), (CSS.match(/\.g\.sm \.gw-tals\{[^}]*gap:(\d+)px (\d+)px/) || [0, 0, 0]).slice(1).map(Number)];
  const colGap = [gw(/\.gw-col\{[^}]*gap:(\d+)px/, '.gw-col gap'), gw(/\.g\.sm \.gw-col\{gap:(\d+)px\}/, '.g.sm .gw-col gap')];
  const dollGap = [gw(/\.gw-doll\{[^}]*gap:0 (\d+)px/, '.gw-doll gap'), gw(/\.g\.sm \.gw-doll\{column-gap:(\d+)px\}/, '.g.sm .gw-doll gap')];
  const midGap = [gw(/\.gw-mid\{[^}]*gap:(\d+)px/, '.gw-mid gap'), gw(/\.g\.sm \.gw-mid\{gap:(\d+)px\}/, '.g.sm .gw-mid gap')];
  const ph = [gw(/height:var\(--gw-ph,(\d+)px\)/, 'ниша --gw-ph'), gw(/\.g\.sm \.gw-por\{--gw-ph:(\d+)px\}/, '.g.sm --gw-ph')];
  const heroPad = [gw(/\.gw-hero\{[^}]*gap:(\d+)px;padding:(\d+)px\}/, '.gw-hero gap'), gw(/\.g\.sm \.gw-hero\{gap:(\d+)px;padding:\d+px\}/, '.g.sm .gw-hero gap')];
  const heroPadP = [+((CSS.match(/\.gw-hero\{[^}]*gap:\d+px;padding:(\d+)px\}/) || [])[1] || 0), +((CSS.match(/\.g\.sm \.gw-hero\{gap:\d+px;padding:(\d+)px\}/) || [])[1] || 0)];
  const tile = gw(/minmax\((\d+)px,1fr\)\);grid-auto-rows/, '.gw-grid плитка'), goGw = gw(/\.gw-cf \.gw-go\.btn\{[^}]*min-height:(\d+)px/, 'главная кнопка карточки');
  if (goGw < 44) say(`вёрстка: главная кнопка карточки окна снаряжения ниже 44 px (${goGw})`);
  for (const X of SCR) {
    cnt.layout++;
    const k = X.small ? 1 : 0;
    /* книга героя: окно во всю игру (HB_VIEW.win), правая страница разворота; самая узкая и самая низкая ступень */
    const bw = Math.min(BV.win.max, X.W - BV.win.padX) - BV.win.lock, bh = X.H - BV.win.padY - BV.win.rib;
    let bodyW = 1e9, pageH = 1e9;
    for (const t of [1, 2, 3, 4, 5]) { const r = BA.spreads[t].r, rh = Math.floor(bh * (1000 - r[0] - r[2]) / 1000); bodyW = Math.min(bodyW, Math.floor(bw * (1000 - r[1] - r[3]) / 1000) - ins[1] - ins[3]); pageH = Math.min(pageH, rh - ins[0] - ins[2] - Math.ceil(rh * (BA.spreads[t].e || 0) / 1000)); }
    /* страница — не меньше прежнего вкладыша (316 × 290 и 284 × 259): поля пергамента не съели места */
    const minPage = X.small ? [284, 259] : [316, 290];
    if (bodyW < minPage[0] || pageH < minPage[1]) say(`вёрстка ${X.n}: правая страница книги ${bodyW} × ${pageH} — меньше прежней ${minPage[0]} × ${minPage[1]}`);
    bodyW -= sheetPad[0] + sheetPad[2]; pageH -= sheetPad[1];
    const bodyH = pageH - (tabsH - tabsUp) - hdGap;
    /* «Развитие»: путь (на странице — без подписей, высота — .pg .hdv-track), строка, карточка — заголовок, превью (мощь и четыре
       атрибута уровня видны без прокрутки; пояснение и нехватка духа — прокруткой списка), тихая строка, низ с кнопкой */
    const g = hdvGap[k], sumH = Math.ceil(sumF * 1.2) - sumUp, pathH = Math.max(pageTrack, 26) + 2;
    const headH = Math.max(nIc[k], Math.ceil(nT[k] * 1.1)), quietH = qR[k] + 2 + 1, actH = Math.max(goH[k], qH[k] + 2);
    const cardFix = 2 + 2 * nPad[k] + headH + 3 * nGap[k] + quietH + actH;
    const rowsRoom = bodyH - (pathH + g + sumH + g) - cardFix, rowsNeed = 5 * gH[k];
    if (rowsRoom < rowsNeed) say(`вёрстка ${X.n}: в карточке шага «Развития» под превью ${rowsRoom} px — мощь и четыре атрибута (${rowsNeed} px) не видны сразу`);
    /* ширина: заголовок шага; низ — «сколько за раз» и главная кнопка: подпись, под ней цена (шесть знаков); у предела — «Где взять
       руны» и «Пробить» с ценой; путь; строка «уровень · предел · доблесть» */
    const PA = T.PG_ART, bpA = px(PCSS, /padding:0 var\(--pg-bp,(\d+)px\)/, 'кнопка рисунком --pg-bp');
    const btnPad = Math.max(2 * 16 + 2, PA && PA.ready.includes(PA.img.btn) ? 2 * (PA.wide.btn[1] + bpA) : 0), costW = n => 16 + 5 + w(n, 13.5);
    const cardIn = bodyW - 2 - 2 * nPadX;
    const headW = nIc[k] + 9 + wd('Уровень 1199 → 1200', nT[k]);
    if (headW > cardIn) say(`вёрстка ${X.n}: заголовок шага ${headW} px, а в карточке ${cardIn} px`);
    const btn2 = (l, n) => btnPad + Math.max(w(l, 14, true), costW(n));
    const qtyW = w('+1+10Макс', 13) + 6 * qP[k] + 4, actW = Math.max(qtyW + 8 + btn2('Поднять', '123 456'), w('Где взять руны', 12.5) + 8 + btn2('Пробить', '10 / 10'), w('Что даст', 12.5) + 8 + btnPad + w('Где взять осколки', 14, true));
    if (actW > cardIn) say(`вёрстка ${X.n}: низ карточки шага («сколько за раз» и кнопка с ценой) ${actW} px, а в карточке ${cardIn} px`);
    const pathW = TOP * 18 + (TOP + 1) * 10 + 10 + 52;
    if (pathW > bodyW) say(`вёрстка ${X.n}: путь ${pathW} px, а ширина страницы ${bodyW} px`);
    const sumW = [['уровень', '1199', '/ 1200'], ['предел', '5', '/ 5'], ['доблесть', '5', '/ 5']].reduce((a, [kk, v, of]) => a + w(kk, sumK, sumCaps) + 2 + w(v, sumF) + 2 + w(of, 11), 0) + 2 * 14;
    if (sumW > bodyW) say(`вёрстка ${X.n}: строка «уровень · предел · доблесть» ${sumW} px, а ширина страницы ${bodyW} px`);
    if (Math.abs(stH(gateSt) / 2 - (segTop + segH / 2)) > 1.5 || gateLbl < stH(gateSt) + 2 || gateLbl + 10 > trackH) say(`вёрстка ${X.n}: камни ворот не на оси пути или подпись уровня не влезает в дорожку ${trackH} px`);
    /* «Снаряжение» на странице книги: рубрика, девять мест сеткой 3 × 3, талисманы 2 × 2 рядом; низ — у нижнего края страницы */
    const capSm = +((PCSS.match(/\.g\.sm \.pg :is\(\.eq-slot,\.tl-slot\)\.none :is\(\.eq-cap,\.tl-cap\)\{font-size:(\d+)px\}/) || [])[1] || gCap), footSm = +((PCSS.match(/\.g\.sm \.pg \.hdg-f\{padding-top:(\d+)px\}/) || [])[1] || gFoot);
    const es = X.small ? slotWSm : slotW, sg = X.small ? slotGSm : slotG, rg = X.small ? bsm('pg-rg', gRg) : gRg, rowH = es + gSlotGap + Math.round((X.small ? capSm : gCap) * 1.1);
    const gearH = 2 + (X.small ? bsm('pg-rbh', gRb) : gRb) + 1 + rg + 3 * rowH + 2 * rg + (X.small ? bsm('pg-gv', gGv) : gGv) + (X.small ? footSm : gFoot) + 1 + gBtn;
    if (gearH > bodyH) say(`вёрстка ${X.n}: «Снаряжение» ${gearH} px, а места ${bodyH} px`);
    const gearW = 5 * es + 4 * sg + (X.small ? bsm('pg-gg', gGg) : gGg);
    if (gearW > bodyW) say(`вёрстка ${X.n}: сетки мест ${gearW} px, а ширина страницы ${bodyW} px`);
    if (es < 40) say(`вёрстка ${X.n}: место снаряжения на странице книги ${es} px — мелко для живописи`);
    /* окно снаряжения: три колонки — герой в нише с гнёздами, запасы, карточка; всё без прокрутки, кроме запасов */
    const winW = X.W - 16 - 2, winH = X.H - 16 - 2, bodyGh = winH - gwH[k] - 1 - 2 * gwPad[k];
    const stockW = winW - 2 * gwPad[k] - gwL[k] - gwC[k] - 2 * gwGap[k];
    const heroIn = [gwL[k] - 2 * heroPadP[k] - 2, bodyGh - 2 * heroPadP[k] - 2];
    const armorH = 5 * gs[k] + 4 * colGap[k], talsH = 4 + 2 * gt[k] + gtGap[k][0] + 8, midH = ph[k] + midGap[k] + 20 + midGap[k] + talsH;
    const dollH = Math.max(armorH, midH), heroH = 20 + heroPad[k] + dollH;
    if (heroH > heroIn[1]) say(`вёрстка ${X.n}: герой в нише с гнёздами ${heroH} px, а в колонке ${heroIn[1]} px`);
    const midW = heroIn[0] - 2 * gs[k] - 2 * dollGap[k];
    if (midW < 2 * gt[k] + gtGap[k][1]) say(`вёрстка ${X.n}: ниша ${midW} px — талисманы 2 × 2 (${2 * gt[k] + gtGap[k][1]} px) не помещаются`);
    const cols = Math.floor((stockW - 16 - 2 + 6) / (tile + 6));
    if (cols < (X.small ? 5 : 6)) say(`вёрстка ${X.n}: в запасах ${cols} плиток в ряд — тесно`);
    const rowsVis = Math.floor((bodyGh - 2 - 16 - 30 - 8 - 14 - 8) / (5 + 44 + 3 + 11 + 4 + 2 + 6));
    if (rowsVis < 3) say(`вёрстка ${X.n}: видно ${rowsVis} ряда запасов`);
    /* карточка: вещь, «вместо надетой», мощь героя в две строки, подписи столбцов и три строки сравнения, низ с кнопкой — без прокрутки;
       кнопка «Надеть лучшее» с прибавкой — в ширину карточки */
    const cardH = 2 + 2 * (X.small ? 8 : 10) + 52 + 6 + 24 + 6 + (6 + 20 + 4 + 16 + 6 + 2) + 6 + (12 + 3 * 22) + 6 + (8 + goGw);
    if (cardH > bodyGh) say(`вёрстка ${X.n}: карточка сравнения ${cardH} px, а колонка ${bodyGh} px`);
    const cardInW = gwC[k] - 2 - 2 * (X.small ? 10 : 12), bestW = 2 * (PA && PA.ready.includes(PA.img.btn) ? PA.wide.btn[1] + bpA : 12) + w('Надеть лучшее', X.small ? 12.5 : 13, true) - 8 + 6 + w('▲+99,9 %', X.small ? 12.5 : 13);
    if (bestW > cardInW) say(`вёрстка ${X.n}: «Надеть лучшее» с прибавкой ${bestW} px, а в карточке ${cardInW} px`);
    const headW2 = 32 * 2 + 34 + 230 + 8 * 5 + w('999 999 ▲99 999', 20) + 32;
    if (headW2 > winW) say(`вёрстка ${X.n}: шапка окна ${headW2} px, а ширина ${winW} px`);
    /* анимации: предел — сцена и подпись; доблесть — сцена слева, карточка справа */
    const limTxtTop = Math.floor(X.H * 62 / 100), limTxtH = 14 + 6 + 30 + 6 + 30 + 6 + 8 + 44;
    if (limTxtTop + limTxtH > X.H - 4) say(`вёрстка ${X.n}: подпись предела заканчивается на ${limTxtTop + limTxtH} px при высоте ${X.H}`);
    const sY = Math.floor(X.H * stagePct / 100), markBot = sY + stH(markSt) / 2, rowBot = sY + rowTop + stH(rowSt);
    if (markBot + 6 > sY + rowTop || rowBot > limTxtTop - 4) say(`вёрстка ${X.n}: ряд камней в анимации предела налезает на камень или подпись (${Math.round(rowBot)} px, подпись с ${limTxtTop})`);
    const V = T.HD_VIEW.val, cardWv = Math.min(392, Math.floor(X.W * 46 / 100)), stageX = Math.floor(X.W * 29 / 100);
    if (stageX + 68 > X.W - 26 - cardWv - 8) say(`вёрстка ${X.n}: портрет доблести заходит под карточку «Что изменилось»`);
    const stageY = Math.floor(X.H * 44 / 100);
    if (stageY - 126 < 4 || stageY + 56 + V.star + V.from > X.H + 40) say(`вёрстка ${X.n}: сцена доблести не помещается по высоте`);
    const rowsV = 9, cardHv = 12 + 14 + 6 + rowsV * 25 + 18 + 44 + 10;
    if (cardHv > X.H - 24) say(`вёрстка ${X.n}: карточка «Что изменилось» ${cardHv} px при высоте ${X.H - 24}`);
    /* превью доблести: лист во всю ширину до 640, две колонки строк; строка «Рунный предел» — две строки камней «было → стало» */
    const dlgW = Math.min(640, X.W - 32), colW = Math.floor((dlgW - 36 - spM) * 11 / 20);
    if (w('Характеристики', 13) + 20 + 8 + w('+30 %', 13.5) > colW) say(`вёрстка ${X.n}: строка превью шире колонки ${colW} px`);
    const rowW = 5 * inlSt + 4 * inlGap, lossW = Math.floor((dlgW - 36 - spM) * 9 / 20) - 24;
    if (20 + 8 + w('Рунный предел', 13) + 8 + rowW + 3 + 12 + 3 + rowW > lossW) say(`вёрстка ${X.n}: строка «Рунный предел» в превью шире колонки ${lossW} px`);
    const dlgH = 50 + 40 + spM + (14 + 6 * 24 + 20 + 16) + spM + 58;
    if (dlgH > X.H - 24) say(`вёрстка ${X.n}: превью доблести ${dlgH} px при высоте ${X.H - 24}`);
    lay.push(`${X.n}: книга героя — лист не меньше ${bodyW} × ${pageH}, под вкладку ${bodyH}; «Развитие» — под превью ${rowsRoom} px (мощь и четыре атрибута — ${rowsNeed}), низ ${actW} из ${cardIn} px, кнопка ${goH[k]} px; «Снаряжение» ${gearW} × ${gearH} (место ${es} px); окно снаряжения ${winW} × ${winH} — герой ${heroH} из ${heroIn[1]} px, запасы ${cols} в ряд, видно ${rowsVis} ряда, карточка ${cardH} из ${bodyGh} px; превью доблести ${dlgW} × ${dlgH}; ряд камней в анимации до ${Math.round(rowBot)} px`);
  }
}

/* ================== 11. UI-кит, сценарии, карта экранов ================== */
{
  /* раздел «Рунные пределы»: камень в четырёх состояниях и четырёх размерах, четыре плитки, шапка с рамой камней, путь, строки */
  const k = T.KIT_EXTRA.find(x => x.html === T.rpKitHtml), iD = T.KIT_EXTRA.findIndex(x => x.html === T.hdKitHtml);
  if (!k) say('UI-кит: раздела «Рунные пределы» нет в KIT_EXTRA');
  else {
    if (T.KIT_EXTRA.indexOf(k) > iD) say('UI-кит: «Рунные пределы» — не рядом с «Развитием героя» (должен идти перед ним)');
    for (const team of [false, true]) {
      run('режим', () => T.setTeam(team)); fresh();
      const h = run('UI-кит · пределы', () => k.html()); cnt.views++;
      if (typeof h !== 'string' || !/<h3>Рунные пределы<\/h3>/.test(h) || /undefined|NaN|\[object /.test(h)) { say('UI-кит: раздел «Рунные пределы» не рисуется'); continue; }
      for (const s of ['off', 'wait', 'ready', 'on']) if (count(h, new RegExp(`<i class="rp-s ${s}(?: p)?"></i>`, 'g')) < 4) say(`UI-кит · пределы: камень «${s}» не во всех размерах`);
      if (count(h, /<figure class="rpk-tile"><button class="hb[ "]/g) !== 4 || count(h, /<span class="hb-lk" aria-hidden="true">/g) < 4) say('UI-кит · пределы: не четыре мелкие книги с замками');
      if (!h.includes('class="hd-rp"') || count(h, /class="hdv-gate[ "]/g) !== TOP || count(h, /<span class="rp i"/g) < 3) say('UI-кит · пределы: нет шапки с рамой камней, пути или строк');
      if (!team) scan(h, 'UI-кит · пределы');
    }
    run('режим «Игрок»', () => T.setTeam(false));
  }
}
{
  const k = T.KIT_EXTRA.find(x => x.html === T.hdKitHtml);
  if (!k) say('UI-кит: раздела «Развитие героя и снаряжение» нет в KIT_EXTRA');
  else for (const team of [false, true]) {
    run('режим', () => T.setTeam(team)); fresh();
    const h = run('UI-кит', () => k.html()); cnt.views++;
    if (typeof h !== 'string' || !/Развитие героя и снаряжение/.test(h) || /undefined|NaN|\[object /.test(h)) say('UI-кит: раздел не рисуется');
    else { if (count(h, /class="hdk-fr"/g) !== 6) say(`UI-кит: кадров раскадровки ${count(h, /class="hdk-fr"/g)}, ждали 6`); if (!team) scan(h, 'UI-кит'); }
  }
  run('режим «Игрок»', () => T.setTeam(false));
  for (const name of ['Развитие героя', 'Развитие · пробитие предела', 'Развитие · что даст доблесть', 'Развитие · последняя доблесть', 'Снаряжение и талисманы · одно окно', 'Духовные талисманы', 'Снаряжение · герой']) {
    fresh(); const F = T.FLOWS.find(x => x[0] === name); if (!F) { say(`нет сценария «${name}»`); continue; }
    run('сценарий ' + name, () => F[2]()); const g = view(`сценарий «${name}»`);
    if (name === 'Развитие · пробитие предела' && !/class="ov hdfx hdfx-lim/.test(g)) say('сценарий пробития: нет анимации предела');
    if (name === 'Развитие · что даст доблесть' && !/data-a="valordo"/.test(g)) say('сценарий превью: нет подтверждения доблести');
    if (name === 'Развитие · последняя доблесть' && !/class="ov hdfx hdfx-val/.test(g)) say('сценарий последней доблести: нет анимации');
    if (name === 'Снаряжение и талисманы · одно окно' && !/class="gw"/.test(g)) say('сценарий окна: окно не открыто');
  }
  const heroes = html.match(/\{ n: 'Герои'[\s\S]*?\},\r?\n/);
  for (const id of ['hero', 'equipment', 'equipment-item', 'talismans']) if (!heroes || !new RegExp(`ready:\\s*\\[[^\\]]*'${id}'`).test(heroes[0])) say(`карта экранов: ${id} не отмечен готовым у «Героев»`);
}
done();
