/* Автопроверка развития героя и окна снаряжения (design/ui/screens/hero-dev.js) — без браузера.
   1. Файлы: index.html подключает hero-dev.css и hero-dev.js после equipment.js; концы строк — CRLF; прежнего развития в index.html нет
      (heroDev, лестница, ACT.lvlup, limit, valor); карточка героя — четыре вкладки, «Развитие» зовёт hdPower, «Снаряжение» — места
      и hdGearFoot. Числа экрана — целые, в блоках HD_DATA и HD_VIEW.
   2. Доблесть по §3.3 и ADR-0016: +INV.hero.valorPct % к базовым характеристикам накопительно, целыми; источник героя для боя и мощи
      (EB.heroSrc, BM_SRC0) — с ней; карточка и лист «Характеристики» показывают те же числа.
   3. Вкладка «Развитие» в каждом состоянии: путь — пять ворот и звезда доблести, следующие ворота — кнопка предела; одна карточка
      следующего шага и не больше одной главной кнопки; характеристики — пять значков тихой строкой.
   4. «Сервер» HD_SRV: уровень, предел и доблесть — операции с номером; расход — ровно цена; повтор номера ничего не меняет; отказ ничего
      не меняет. «Макс» — сколько хватает духа, не выше потолка.
   5. Лист предела: сколько нужно, сколько есть, что будет; подтверждение — только когда можно. Анимация пробития: руны, отметка, новый
      потолок; пропуск — сразу итог; «Дальше» посреди анимации — пропуск.
   6. Доблесть: честное превью до подтверждения — доблесть, +30 % к пяти характеристикам (числа — valorSt), способность из набора,
      глава, что начнётся заново (уровень, пределы, мощь сейчас и на прежнем уровне), что сохранится; до последней доблести орден
      не называется; недоступно — причина и путь к руне. После — карточка «Что изменилось»: по строке, было → стало; на последней
      доблести — орден или «вне орденов».
   7. Анимации: время от начала показа (--el), пропуск нажатием, prefers-reduced-motion; ключевые кадры меняют только transform и opacity.
   8. Окно снаряжения: девять мест снаряжения и четыре талисмана слева, запасы справа; нажатие — выбор, подсветка мест, надеть в место;
      перетаскивание — те же операции (grDrop), снять — в запасы; сравнение стрелками и прибавка мощи; привязка талисмана к классу —
      значком класса, чужой — тусклый с причиной; «Надеть лучшее» — операция с номером; листы OV.tal и OV.eq открывают это окно.
   8б. Жест на поддельном DOM: нажатие без движения — щелчок; мышь — перетаскивание на своё место надевает, на чужое — нет; палец
      вверх-вниз в запасах — прокрутка, вбок — перетаскивание, на героя мимо места — в своё место; из места в запасы — снять;
      призрак и подсветка убираются, слушатели снимаются, щелчок после броска гасится.
   9. Режим «Игрок»: служебных слов нет (SERVICE из check_player_view.js); режим «Команда» рисуется.
   10. Вёрстка — расчётом размеров на 932 × 430 и 844 × 390: вкладки карточки, окно снаряжения, анимации и превью помещаются.
   11. UI-кит (KIT_EXTRA), сценарии презентации, карта экранов: hero, equipment, equipment-item, talismans — готовы.
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
  console.log('Проверка пройдена: одна главная кнопка — следующий шаг; предел и доблесть — операции с номером и честное превью; анимации — transform и opacity; снаряжение и талисманы — одно окно; всё помещается на 932 × 430 и 844 × 390.');
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
  const hd = main.match(/function heroDetail\(h\)[\s\S]*?\n\}/);
  if (!hd) say('index.html: нет heroDetail');
  else {
    if (!/hdPower\(h\)/.test(hd[0])) say('index.html: вкладка «Развитие» не зовёт hdPower');
    if (!/t === 'gear'[\s\S]{0,300}eqRow\(h\)[\s\S]{0,120}talRow\(h\)[\s\S]{0,120}hdGearFoot\(h\)/.test(hd[0])) say('index.html: вкладка «Снаряжение» — не места снаряжения, талисманов и hdGearFoot');
    if (!/\['power', 'Развитие'\], \['gear', 'Снаряжение'\], \['skills', 'Навыки'\], \['path', 'Путь'\]/.test(hd[0])) say('index.html: у карточки героя не четыре вкладки «Развитие», «Снаряжение», «Навыки», «Путь»');
  }
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
    TB, TL: window.EN_TALISMANS, tlEq, tlWhy, tlFam, tlR, tlMul, tlMulOf, EQD: window.EN_EQUIPMENT, eqItem, eqWornList, eqGain, eqMulOf, EQ_SRV, TL_SRV,
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
  if (!new RegExp(`<button class="hdv-star [^"]*" data-v="${h.id}" data-a="valor"`).test(g)) say(`${where}: звезда доблести — не кнопка`);
  if (count(g, /class="hdv-next"/g) !== 1) say(`${where}: карточек следующего шага ${count(g, /class="hdv-next"/g)} — нужна одна`);
  if (count(g, /class="btn go[ "]/g) > 1) say(`${where}: главных кнопок ${count(g, /class="btn go[ "]/g)} — нужна одна`);
  for (const n of ['str', 'int', 'agi', 'end', 'spd']) if (!g.includes(`icons/${n}.png`)) say(`${where}: в тихой строке нет значка ${n}`);
  if (/[!！]/.test(playerText(strip(g)))) say(`${where}: в тексте «!» — правила воздуха`);
  return g;
}
fresh();
{
  const h = T.H('h1');   // уровень 42 из 50
  let g = checkPower('уровень растёт', h, 'lvl');
  const q = T.hdQty(h); if (!g.includes(`data-a="lvlup"`) || !g.includes(`:${h.id}:${q}"`)) say('уровень: у кнопки «Поднять» нет номера операции и числа уровней');
  const h2 = T.H('h2');  // 50 из 50, руны предела I в запасах
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
  /* путь пройден: доблесть на личном максимуме, пятый предел */
  const h3 = T.H('h3'); h3.lim = TOP; h3.cap = D.capByLim[TOP]; h3.lvl = h3.cap;
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
  const h = T.H('h2'), d = T.heroDev(h), bag0 = T.BAG.qty(d.rune.id);
  card('h2', 'power');
  run('предел · лист', () => T.ACT.limit('h2'));
  const O = T.S.overlay;
  if (!O || O.t !== 'hdlim' || O.act !== 'limitdo' || !/^hd\d+:h2$/.test(O.v)) say(`предел: лист без подтверждения с номером — ${JSON.stringify(O)}`);
  let g = ovOf(view('предел · лист'));
  if (!g.includes(`${h.cap}</span> → <span class="num">${D.capByLim[1]}`) || !g.includes('data-a="limitdo"')) say('предел · лист: нет «потолок было → стало» или подтверждения');
  run('предел · подтверждение', () => T.ACT.limitdo(O.v)); cnt.ops++;
  if (h.lim !== 1 || h.cap !== D.capByLim[1] || T.BAG.qty(d.rune.id) !== bag0 - d.need) say(`предел: lim ${h.lim}, потолок ${h.cap}, руны ${bag0} → ${T.BAG.qty(d.rune.id)}`);
  if (!T.S.overlay || T.S.overlay.t !== 'hdfx') say('предел: после подтверждения нет анимации');
  g = ovOf(view('предел · анимация'));
  if (count(g, /<i style="--a:/g) !== d.need || !g.includes('class="hdfx-mark"') || !g.includes('data-a="hdskip"') || !/--el:\d+/.test(g)) say('предел · анимация: не руны по числу, не отметка, нет пропуска или времени --el');
  if (!g.includes(`<s class="num">${D.capByLim[0]}</s> <b class="num">${D.capByLim[1]}</b>`)) say('предел · анимация: нет нового потолка «было → стало»');
  run('предел · «Дальше» посреди', () => T.ACT.hdfxok());
  if (!T.S.overlay || T.S.overlay.t !== 'hdfx' || !T.S.hd.fx.skip) say('предел: «Дальше» посреди анимации закрыло её, а должно показать итог');
  if (!/class="ov hdfx hdfx-lim done"/.test(ovOf(view('предел · итог')))) say('предел: пропуск не показал итог (класс done)');
  run('предел · закрыть', () => T.ACT.hdfxok()); if (T.S.overlay) say('предел: «Дальше» после итога не закрыло анимацию');
  const b1 = snapBag(); run('предел · повтор', () => T.ACT.limitdo(O.v)); cnt.ops++;
  if (h.lim !== 1 || snapBag() !== b1) say('предел: повтор номера что-то изменил');
  /* не на потолке — лист без подтверждения, операция отказывает */
  T.S.overlay = null; run('предел · рано', () => T.ACT.limit('h2'));
  if (!T.S.overlay || T.S.overlay.act) say('предел не на потолке: в листе есть подтверждение');
  if (!ovOf(view('предел · рано')).includes('Сначала уровень')) say('предел не на потолке: лист не говорит, что сначала уровень');
  const b2 = snapBag(); run('предел · рано · операция', () => T.ACT.limitdo('h2')); cnt.ops++;
  if (h.lim !== 1 || snapBag() !== b2) say('предел не на потолке: что-то списалось');
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
  if (count(fx, /<li style="--k:\d+">/g) < 6) say(`доблесть · «Что изменилось»: строк ${count(fx, /<li style="--k:\d+">/g)}`);
  for (const t of ['Доблесть', 'Характеристики', 'Уровень', 'Рунный предел', 'Мощь']) if (!fx.includes(`<span class="k">${t}</span>`)) say(`«Что изменилось»: нет строки «${t}»`);
  if (count(fx, /<s>/g) < 3) say('«Что изменилось»: мало строк «было → стало»');
  if (ch && !fx.includes('data-a="hdread"')) say('«Что изменилось»: нет «Читать главу»');
  run('доблесть · пропуск', () => T.ACT.hdskip());
  run('доблесть · читать главу', () => T.ACT.hdread());
  if (T.S.overlay || T.S.seg.hero !== 'path' || T.S.selHero !== 'h4') say('«Читать главу» не открыло «Путь» героя');
  const b1 = snapBag(); run('доблесть · повтор', () => T.ACT.valordo(O.v)); cnt.ops++;
  if (h.valor !== v + 1 || snapBag() !== b1) say('доблесть: повтор номера что-то изменил');
  /* недоступно: не пятый предел — нет подтверждения, причина; руны нет, осколков хватает — «Собрать руну» */
  fresh(); const hx = T.H('h2'), dx = T.heroDev(hx); T.BAG.add(dx.vs.id, dx.vsNeed);
  run('доблесть · рано', () => T.ACT.valor('h2'));
  let gx = ovOf(view('доблесть · рано'));
  if (/data-a="valordo"/.test(gx) || T.S.overlay.act) say('доблесть не на пятом пределе: есть подтверждение');
  if (!gx.includes(`рунного предела ${T.ROMAN[D.valorAtLim]}`)) say('доблесть не на пятом пределе: нет причины');
  if (!gx.includes(`data-a="valorcraft" data-v="${dx.rec.id}"`)) say('доблесть: осколков хватает, а «Собрать руну» нет');
  const b2 = snapBag(), vv = hx.valor; run('доблесть · рано · операция', () => T.ACT.valordo('h2')); cnt.ops++;
  if (hx.valor !== vv || snapBag() !== b2) say('доблесть не на пятом пределе: что-то списалось');
  /* личный максимум */
  run('доблесть · максимум', () => T.ACT.valor('h3'));
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
  if (!/\.hdfx\.done[^{]*\{animation:none!important\}/.test(CSS)) say('hero-dev.css: пропуск (.done) не выключает анимации');
  if (!/calc\(\(var\(--d[a-z]*\) - var\(--el\)\) \* 1ms\)/.test(CSS)) say('hero-dev.css: задержки не отсчитаны от начала показа (--el)');
  /* меньше движения: итог сразу — класс done, частиц нет */
  const R = load({ reduced: true }), X = R.T;
  X.S = X.initialState(); X.S.overlay = null;
  const h = X.H('h2'); X.S.selHero = 'h2';
  run('меньше движения', () => { X.ACT.limit('h2'); X.ACT.limitdo(X.S.overlay.v); X.render(); });
  if (!/class="ov hdfx hdfx-lim done"/.test(R.game()) || R.timers.length) say('prefers-reduced-motion: анимация не сразу итог или ждут частицы');
  if (h.lim !== 1) say('prefers-reduced-motion: предел не пробит');
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
   Размеры — из стилей (index.html, hero-dev.css), ширина текста — оценка по кеглю: узкий шрифт интерфейса и цифры ~0,5 кегля на знак,
   прописные с разрядкой 0,1 em — ~0,7 кегля. Итог — что каждая область влезает в свою коробку */
{
  const px = (css, re, name) => { const m = css.match(re); if (!m) { say(`вёрстка: не найдено ${name}`); return 0; } return +m[1]; };
  const I = html;
  const SCR = [{ n: '932 × 430', W: 932, H: 430, top: 46, rail: 78, small: false }, { n: '844 × 390', W: 844, H: 390, top: 44, rail: 72, small: true }];
  const spM = px(I, /--sp-m:(\d+)px/, '--sp-m'), spS = px(I, /--sp-s:(\d+)px/, '--sp-s');
  const face = px(I, /\.hd-face\{[^}]*height:(\d+)px/, '.hd-face height'), faceSm = px(I, /@container main \(max-height: 360px\)\{[\s\S]*?\.hd-face\{width:\d+px;height:(\d+)px/, '.hd-face компакт');
  const tabH = px(I, /\.tabs button\{[^}]*height:(\d+)px/, '.tabs button height'), tabPad = px(I, /\.tabs\{[^}]*padding:(\d+)px/, '.tabs padding');
  const trackH = px(CSS, /\.hdv-track\{[^}]*height:(\d+)px/, '.hdv-track height'), icoN = px(CSS, /\.hdv-ic\{[^}]*height:(\d+)px/, '.hdv-ic');
  const title = px(CSS, /\.hdv-t\{font:600 (\d+)px/, '.hdv-t'), titleSm = px(CSS, /@container main \(max-height: 360px\)\{[\s\S]*?\.hdv-t\{font-size:(\d+)px/, '.hdv-t компакт');
  const qtyH = px(I, /\.qty button\{[^}]*height:(\d+)px/, '.qty button height');
  const goH = px(CSS, /\.hdv-go\.btn\{min-height:(\d+)px/, '.hdv-go');
  const slotGw = px(CSS, /\.gw-slot\{--gs:(\d+)px/, '.gw-slot --gs'), slotGwSm = px(CSS, /\.g\.sm \.gw-slot\{--gs:(\d+)px/, '.g.sm .gw-slot'), gwL = px(CSS, /--gw-l,(\d+)px/, '--gw-l'), gwLSm = px(CSS, /\.g\.sm \.gw-b\{--gw-l:(\d+)px/, '.g.sm --gw-l');
  const gwH = px(CSS, /\.gw-h\{[^}]*height:(\d+)px/, '.gw-h'), gwHSm = px(CSS, /\.g\.sm \.gw-h\{height:(\d+)px/, '.g.sm .gw-h'), tile = px(CSS, /minmax\((\d+)px,1fr\)\);grid-auto-rows/, '.gw-grid плитка');
  const eqSlot = px(CSS, /\.hd-gear \.eq-slot\{width:(\d+)px/, '.hd-gear .eq-slot'), eqSlotSm = px(CSS, /@container main \(max-height: 360px\)\{[\s\S]*?\.hd-gear \.eq-slot\{width:(\d+)px/, '.hd-gear .eq-slot компакт');
  const tlSlotH = px(CSS, /\.hd-gear \.tl-slot\{min-height:(\d+)px/, '.hd-gear .tl-slot'), tlSlotHSm = px(CSS, /@container main \(max-height: 360px\)\{[\s\S]*?\.hd-gear \.tl-slot\{min-height:(\d+)px/, '.hd-gear .tl-slot компакт');
  const w = (s, k, caps) => Math.ceil(String(s).length * k * (caps ? 0.7 : 0.5));
  for (const X of SCR) {
    cnt.layout++;
    const mainW = X.W - X.rail, mainH = X.H - X.top, compact = mainH <= 360;
    const inW = mainW - 2 * spM, inH = mainH - 2 * spM;
    const left = Math.max(250, Math.floor(inW * 34 / 100)), panelW = inW - left - spM;
    const hdPadV = compact ? 8 : spM, hdPadH = compact ? 10 : spM;
    const bodyW = panelW - 2 - 2 * hdPadH, bodyH = inH - 2 - 2 * hdPadV - (compact ? faceSm : face) - spS - (tabH + 2 * tabPad + 2) - spS;
    /* «Развитие»: путь, карточка шага, тихая строка */
    const gap = compact ? 6 : spS, padN = compact ? 8 : 10, tH = Math.ceil((compact ? titleSm : title) * 1.1);
    const nextH = 2 + 2 * padN + Math.max(icoN, goH, tH + 6 + qtyH);
    const quietH = 6 + 1 + 18;
    const powerH = trackH + gap + nextH + gap + quietH;
    if (powerH > bodyH) say(`вёрстка ${X.n}: «Развитие» ${powerH} px, а места ${bodyH} px`);
    /* ширина карточки шага: значок, самая длинная строка, самая широкая кнопка */
    const btnPad = 2 * 14 + 2, costW = n => 10 + 1 + 18 + 5 + w(n, 14);
    const btn = Math.max(btnPad + w('Взять доблесть', 13, true), btnPad + w('Поднять', 13, true) + 8 + costW('12 345'), btnPad + w('Пробить', 13, true) + 8 + costW('10 / 10'));
    const qtyW = w('+1+10Макс', 12) + 3 * 16 + 2, chipW = 16 + 13 + 5 + w('+12 345', 11);
    const text = Math.max(w('Уровень 1199 → 1200', compact ? titleSm : title), qtyW + 10 + chipW);
    const nextW = 2 * (compact ? 10 : 12) + icoN + 2 * (compact ? 10 : 12) + text + btn;
    if (nextW > bodyW) say(`вёрстка ${X.n}: карточка шага ${nextW} px, а ширина ${bodyW} px`);
    const quietW = 5 * (18 + 5 + w('1234', 14)) + 4 * 14 + 12 + 28;
    if (quietW > bodyW) say(`вёрстка ${X.n}: строка характеристик ${quietW} px, а ширина ${bodyW} px`);
    /* «Снаряжение» в карточке: две группы мест и низ */
    const es = compact ? eqSlotSm : eqSlot, tl = compact ? tlSlotHSm : tlSlotH, g2 = compact ? 6 : spS;
    const gearH = (20 + g2 + es) + g2 + (20 + g2 + tl) + g2 + 32;
    if (gearH > bodyH) say(`вёрстка ${X.n}: «Снаряжение» ${gearH} px, а места ${bodyH} px`);
    if (9 * es + 8 * (compact ? 4 : 5) > bodyW) say(`вёрстка ${X.n}: девять мест не влезают в ширину ${bodyW} px`);
    /* окно снаряжения */
    const s = X.small ? slotGwSm : slotGw, L = X.small ? gwLSm : gwL, gh = X.small ? gwHSm : gwH, gp = X.small ? 10 : spM, rowG = X.small ? 4 : 6;
    const winW = X.W - 16 - 2, winH = X.H - 16 - 2, bodyGh = winH - gh - 1 - 2 * gp;
    const slotsH = (20 + rowG) + s + rowG + s + rowG + (20 + rowG) + s + rowG;
    const cardH = bodyGh - slotsH;
    if (cardH < 100) say(`вёрстка ${X.n}: карточке сравнения в окне остаётся ${cardH} px — меньше 100`);
    if (5 * s + 4 * 6 > L || 4 * s + 3 * 6 + 10 > L) say(`вёрстка ${X.n}: места героя шире левой колонки ${L} px`);
    const rightW = winW - 2 * gp - L - gp, cols = Math.floor((rightW - 4 + 6) / (tile + 6));
    if (cols < 6) say(`вёрстка ${X.n}: в запасах ${cols} плиток в ряд — тесно`);
    const rowsVis = Math.floor((bodyGh - 36 - 8 - 16 - 8) / (6 + 44 + 3 + 12 + 4 + 6));
    if (rowsVis < 3) say(`вёрстка ${X.n}: видно ${rowsVis} ряда запасов`);
    const headW = 32 * 2 + 34 + 230 + 8 * 6 + w('999 999 ▲99 999', 20) + 2 * 11 + w('Лучшее', 12, true) + 14 + 6 + 32;
    if (headW > winW) say(`вёрстка ${X.n}: шапка окна ${headW} px, а ширина ${winW} px`);
    /* анимации: предел — сцена и подпись; доблесть — сцена слева, карточка справа */
    const limTxtTop = Math.floor(X.H * 62 / 100), limTxtH = 14 + 6 + 30 + 6 + 30 + 6 + 8 + 44;
    if (limTxtTop + limTxtH > X.H - 4) say(`вёрстка ${X.n}: подпись предела заканчивается на ${limTxtTop + limTxtH} px при высоте ${X.H}`);
    const V = T.HD_VIEW.val, cardWv = Math.min(392, Math.floor(X.W * 46 / 100)), stageX = Math.floor(X.W * 29 / 100);
    if (stageX + 68 > X.W - 26 - cardWv - 8) say(`вёрстка ${X.n}: портрет доблести заходит под карточку «Что изменилось»`);
    const stageY = Math.floor(X.H * 44 / 100);
    if (stageY - 126 < 4 || stageY + 56 + V.star + V.from > X.H + 40) say(`вёрстка ${X.n}: сцена доблести не помещается по высоте`);
    const rowsV = 9, cardHv = 12 + 14 + 6 + rowsV * 25 + 18 + 44 + 10;
    if (cardHv > X.H - 24) say(`вёрстка ${X.n}: карточка «Что изменилось» ${cardHv} px при высоте ${X.H - 24}`);
    /* превью доблести: лист во всю ширину до 640, две колонки строк */
    const dlgW = Math.min(640, X.W - 32), colW = Math.floor((dlgW - 36 - spM) * 11 / 20);
    if (w('Характеристики', 13) + 20 + 8 + w('+30 %', 13.5) > colW) say(`вёрстка ${X.n}: строка превью шире колонки ${colW} px`);
    const dlgH = 50 + 40 + spM + (14 + 6 * 24 + 20 + 16) + spM + 58;
    if (dlgH > X.H - 24) say(`вёрстка ${X.n}: превью доблести ${dlgH} px при высоте ${X.H - 24}`);
    lay.push(`${X.n}: карточка героя ${bodyW} × ${bodyH} — «Развитие» ${nextW} × ${powerH}, строка характеристик ${quietW}, «Снаряжение» ${gearH}; окно снаряжения ${winW} × ${winH} — места ${L}, карточка сравнения ${cardH}, запасы ${cols} в ряд, видно ${rowsVis} ряда; превью доблести ${dlgW} × ${dlgH}`);
  }
}

/* ================== 11. UI-кит, сценарии, карта экранов ================== */
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
