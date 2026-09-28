/* Автопроверка экрана «Странник» (design/ui/screens/wanderer.js) и его данных (design/ui/wanderer.js) — без браузера.
   1. index.html подключает wanderer.css, данные wanderer.js и экран после model.js; файлы компилируются.
   2. Данные: 146 пассивок Памяти, семь редкостей, вес — по «Настройкам» автора (база редкости × множитель силы), доли редкостей дают
      10 000 б. п.; цены §0 — переброс 50, сброс 100; места — циклы II–VI; «+1 активный биом» — ровно одна пассивка, это № mem.slot (ADR-0014);
      рунный ключ с элит нигде не обещан (ADR-0023, вариант Б); 18 артефактов, уровней не больше циклов, души на все уровни — по правилу автора;
      с «Печатью открытых троп» и пассивкой — семь забегов; достижения — около 50 / 22 / 22 и первенства по циклам; все числа целые.
   3. «Сервер» Памяти: wnRoll — чистая функция; независимый пересчёт тем же генератором (mulberry32, FNV-1a) — те же тройки, ровно шесть
      бросков на тройку; в тройке нет повторов, закреплённых и прошлой тройки; на 40 000 вариантов доли редкостей и весов сходятся с данными;
      сумма шансов каталога — 100 %.
   4. Операции: места по циклам; тройку решает сервер при первом открытии и не меняет при повторном; первый переброс бесплатный, платный —
      только после подтверждения цены, списывается один раз; повтор номера операции ничего не меняет; устаревшее окно не закрепит вариант;
      нехватка Энериума — отказ без расхода; «Вспомнить» закрепляет место, Убежище видит его закреплённым; полный сброс — 100 Энериума,
      раз в неделю, бесплатные перебросы не возвращаются, тройку незакреплённого места сброс не меняет.
   4б. «Право владыки» (onlyFree) — только в бесплатных тройках: в тройках за Энериум (платный переброс, после сброса) его нет ни на одном
      из 60 000 сидов и ни в одной из сотен троек пути «сервера»; в бесплатных — с долей данных; бесплатных троек у места не больше двух;
      игроку — строка в каталоге, в листе пассивки и в подтверждении платного переброса.
   5. Анимация: тройка решена до анимации; карты выходят по очереди, вспышка — у каждой, по её редкости; чем реже, тем богаче частицы;
      перерисовка посреди анимации не сбрасывает её; «Пропустить анимацию», prefers-reduced-motion и закрытие окна — тройка сразу;
      без localStorage всё работает.
   6. Артефакты: покупка золотом, уровень душами — база × номер уровня, не выше цикла; уровень аккаунта для открытия; повтор и нехватка.
   7. Достижения: сундук по строке режима «Достижения» lootboxes.js на цикл получения, в запасы — один раз; таинственные скрыты до получения;
      первенства — только свои.
   8. Вид: вкладки, окно, листы и каталог рисуются в режимах «Игрок» и «Команда» без исключений, undefined и NaN; игроку — без служебных слов.
   9. UI-кит: раздел «Память Странника» — карты всех семи редкостей; карта экранов отмечает готовое.
   Запуск: node tools/content-gen/screens/check_wanderer.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText, teamCount } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, ops: 0, triples: 0, bursts: 0 };
const MISSING = new Set();
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
function done() {
  if (MISSING.size) console.log(`Пропущены подключённые, но ещё не написанные чужие экраны: ${[...MISSING].join(', ')}.`);
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`«Странник»: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; операций ${cnt.ops}, троек пересчитано ${cnt.triples}, вспышек ${cnt.bursts}.`);
  console.log('Проверка пройдена: тройку решает «сервер» на сиде до анимации, расход один раз, частицы растут с редкостью, артефакты и достижения по правилам, в режиме «Игрок» служебного нет.');
  process.exit(0);
}
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const iD = scripts.findIndex(s => s.src === 'wanderer.js'), iM = scripts.findIndex(s => s.src === 'screens/model.js'), iW = scripts.findIndex(s => s.src === 'screens/wanderer.js');
  const iMain = scripts.findIndex(s => !s.src && /function initialState\(/.test(s.code));
  if (iD < 0) say('index.html: не подключены данные wanderer.js');
  else if (iD > iMain) say('index.html: данные wanderer.js подключены после основного скрипта');
  if (iW < 0) say('index.html: не подключён screens/wanderer.js');
  else if (iW < iM) say('index.html: screens/wanderer.js подключён раньше model.js');
  if (!/<link rel="stylesheet" href="screens\/wanderer\.css">/.test(html)) say('index.html: не подключён screens/wanderer.css');
  for (const f of ['wanderer.js', 'screens/wanderer.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
}
if (err.length) done();

/* ================== 2. данные ================== */
const WD = (() => { const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(read('wanderer.js'), ctx, { filename: 'wanderer.js' }); return ctx.window.EN_WANDERER; })();
{
  if (!WD) { say('wanderer.js: нет window.EN_WANDERER'); done(); }
  const P = WD.passives, M = WD.mem;
  if (P.length !== 146) say(`Память: пассивок ${P.length}, §2.8 — 146`);
  if (new Set(P.map(p => p.id)).size !== P.length) say('Память: id пассивок повторяются');
  if (new Set(P.map(p => p.n)).size !== P.length) say('Память: имена пассивок повторяются');
  for (const p of P) {
    if (!(p.r >= 1 && p.r <= 7)) say(`${p.id}: редкость ${p.r}`);
    if (!(p.pow >= 1 && p.pow <= 5)) say(`${p.id}: сила ${p.pow}`);
    const w = Math.floor((M.weight.base[p.r - 1] * M.weight.powPct[p.pow - 1] + 50) / 100);
    if (p.w !== w) say(`${p.id} «${p.n}»: вес ${p.w}, по «Настройкам» — ${w}`);
    if (!p.fam || !p.cat || !p.d) say(`${p.id}: пустое поле`);
    if (/ключа с элит/.test(p.d)) say(`${p.id} «${p.n}»: рунный ключ с элит — против ADR-0023`);
  }
  for (let r = 1; r <= 7; r++) if (!P.some(p => p.r === r)) say(`Память: нет пассивок редкости ${r}`);
  if (M.rarBp.length !== 7 || M.rarBp.reduce((a, b) => a + b, 0) !== 10000) say('Память: доли редкостей не дают 10 000 б. п.');
  if (!eq(M.rarBp, [4500, 2000, 1500, 1000, 600, 300, 100])) say('Память: доли редкостей не как в §2.6');
  if (M.reroll !== 50 || M.reset !== 100) say(`Память: цены §0 — переброс 50 и сброс 100, в данных ${M.reroll} и ${M.reset}`);
  if (!eq(M.places, [2, 3, 4, 5, 6])) say('Память: места — циклы II–VI (§2.4)');
  if (M.offer !== 3) say('Память: в тройке не три варианта');
  const slots = P.filter(p => /активн\S* биом/.test(p.d));
  if (slots.length !== 1 || slots[0].no !== M.slot) say('Память: «+1 активный биом» — ровно одна пассивка, и это mem.slot (ADR-0014)');
  const A = WD.art.list;
  if (A.length !== 18) say(`артефактов ${A.length}, в таблице автора 18`);
  for (const a of A) {
    if (a.lv < 1 || a.lv > 7 - a.from) say(`${a.id} «${a.n}»: уровней ${a.lv} с цикла ${a.from} — больше, чем циклов`);
    if (a.total !== a.soul * a.lv * (a.lv + 1) / 2) say(`${a.id}: души на все уровни не по правилу «база × номер уровня»`);
    if (/(?:ресурс\S*|ключа) с элит(?!ой)/.test(a.d)) say(`${a.id} «${a.n}»: ресурсы или ключ «с элит» — против ADR-0010, ADR-0023`);
  }
  const walk = A.find(a => a.no === 1);
  if (!walk || walk.base + walk.step * walk.lv + 1 !== 7) say('«Печать открытых троп» и пассивка Памяти: забегов не семь (ADR-0014)');
  const keys = A.filter(a => /рунного ключа с босса/.test(a.d)).reduce((s, a) => s + a.step * a.lv, 0);
  if (10 + keys !== 25) say(`рунный ключ с босса: 10 % и артефакты дают ${10 + keys} %, по §11 — 25 %`);
  const L = WD.ach.list, byCat = c => L.filter(a => a.cat === c).length;
  if (byCat('pers') < 45 || byCat('pers') > 55 || byCat('rev') < 18 || byCat('rev') > 26 || byCat('myst') < 18 || byCat('myst') > 26) say('достижения: не около 50 / 22 / 22 (§29)');
  for (const a of L) { if (!WD.ach.kinds[a.pk]) say(`${a.id}: вид пассивки «${a.pk}»`); if (a.cat === 'myst' && !a.hint) say(`${a.id}: у таинственного нет подсказки`); }
  for (let c = 1; c <= 6; c++) { const n = WD.ach.firsts.filter(f => f.c === c).length; if (n !== (c === 1 ? 3 : 4)) say(`первенства цикла ${c}: ${n}`); }
  if (!WD.fixes.length || WD.fixes.some(f => !f.what || !f.why)) say('правки под систему: пусто или без «почему»');
  const nums = []; (function walkNum(x) { if (typeof x === 'number') nums.push(x); else if (x && typeof x === 'object') Object.values(x).forEach(walkNum); })(WD);
  if (nums.some(x => !Number.isInteger(x))) say('wanderer.js: есть нецелые числа');
}

/* ================== песочница ==================
   Скрипты прототипа по порядку, как в браузере, с заглушкой DOM; boot() не запускается. Часы и таймеры — свои: время двигает проверка.
   storage — 'throw' (localStorage недоступен) или Map; reduced — prefers-reduced-motion. EnFx заменён записью вызовов */
function load(o = {}) {
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, prepend() {}, remove() {},
      animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
    e.querySelector = () => stubEl();
    return e;
  };
  const rootCls = new Set(), root = stubEl('html');
  root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
  const els = {};
  const game = stubEl('game'); game.parentElement = stubEl('inner'); els.game = game;
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const S0 = o.storage;
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const localStorage = S0 instanceof Map ? { getItem: k => (S0.has(k) ? S0.get(k) : null), setItem: (k, v) => { S0.set(k, String(v)); }, removeItem: k => { S0.delete(k); } }
    : { getItem: noStore, setItem: noStore, removeItem: noStore };
  const clock = { now: 0, q: [] };
  const setTimeout = (f, ms) => { clock.q.push({ at: clock.now + (ms || 0), f }); return clock.q.length; };
  const clearTimeout = id => { const t = clock.q[id - 1]; if (t) t.f = null; };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} }, localStorage,
    innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1, addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    matchMedia: q => ({ matches: !!o.reduced && /prefers-reduced-motion/.test(q), addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '#ffffff' }), CustomEvent: function CustomEvent() {}, performance: { now: () => clock.now } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    /* чужой экран, который подключён, но ещё не написан (параллельная работа), — пропуск с пометкой; свои файлы обязательны */
    if (s.src && /^screens\//.test(s.src) && !/wanderer/.test(s.src) && !fs.existsSync(path.join(UI, s.src))) { MISSING.add(s.src); continue; }
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  /* частицы: запись вызовов вместо холста */
  const fxLog = [];
  win.EnFx.create = host => { const rec = k => (...a) => fxLog.push({ k, a }); return { host, center: () => ({ x: 10, y: 10, w: 150, h: 170 }), ring: rec('ring'), burst: rec('burst'), shake: rec('shake'), destroy() {} }; };
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, SCREENS, FLOWS, KH, KIT_EXTRA, MAP, BAG, LBX, render, initialState, setTeam, fmt, EnLoot: window.EnLoot,
    WN, WN_VIEW, WN_DEMO, WN_SRV, wnRoll, wnChance, wnSync, wnBurst, wnChest, wnProg, wnReady, wnCap, wnLv, wnCyc, wnMemTab, wnArtTab, wnAchTab,
  })`, ctx);
  const advance = ms => {
    const end = clock.now + ms;
    for (;;) {
      const due = clock.q.map((t, i) => ({ t, i })).filter(x => x.t.f && x.t.at <= end).sort((a, b) => a.t.at - b.t.at || a.i - b.i)[0];
      if (!due) break;
      clock.now = Math.max(clock.now, due.t.at); const f = due.t.f; due.t.f = null;
      run('таймер', f);
    }
    clock.now = end;
  };
  return { T, els, rootCls, fxLog, clock, advance, game: () => els.game.innerHTML };
}
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
/* разметка: без исключений, undefined и NaN; в режиме «Игрок» — без служебных слов */
function view(P, where) {
  cnt.views++;
  run(where, () => P.T.render());
  const h = P.game();
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!P.T.KH.team) {
    cnt.player++;
    const txt = playerText(h).split('\n').concat(tips(strip(h)));
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
  }
  return h;
}
const fresh = (P, o = {}) => { const T = P.T; T.S = T.initialState(); T.S.overlay = null; T.S.route = 'profile'; T.S.seg.profile = 'mem'; T.S.acc.cycle = o.cyc || 2; if (o.skip != null) T.S.mem.skip = o.skip; P.fxLog.length = 0; };
const op = T => 'wn' + T.S.wn.seq;          // номер операции, как на кнопке: его несут действия ACT
let uopN = 0; const uop = () => 'проверка-' + (++uopN);   // свой номер для прямых вызовов «сервера»
const snap = T => JSON.parse(JSON.stringify({ en: T.S.wallet.enerium, gold: T.S.wallet.gold, souls: T.S.wallet.souls, mem: T.S.mem.slots.map(x => [x.p, x.free, x.n]), art: T.S.wn.art, got: T.S.wn.ach.got, chests: T.S.bag.chests.length }));

/* ================== 3. «сервер» Памяти: чистая функция и независимый пересчёт ================== */
const P0 = load();
const W = P0.T.WN;
/* независимый генератор: FNV-1a + mix32 для сида, mulberry32 для бросков — как в lootboxes.js и battle.js */
const mix32 = x => { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; };
const seedOf = s => { let h = 0x811C9DC5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0; return mix32(h); };
function rngOf(seed) { let a = seed >>> 0, calls = 0; const f = n => { calls++; a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) % n; }; f.calls = () => calls; return f; }
function roll2(seed, excl, paid) {
  const rng = rngOf(seed), used = new Set(excl), out = [];
  if (paid) WD.passives.filter(p => p.onlyFree).forEach(p => used.add(p.id));   // тройка за Энериум: у «только бесплатно» вес 0
  for (let k = 0; k < 3; k++) {
    const byR = [1, 2, 3, 4, 5, 6, 7].map(r => WD.passives.filter(p => p.r === r && !used.has(p.id)));
    const bp = WD.mem.rarBp.map((b, i) => (byR[i].length ? b : 0));
    let x = rng(bp.reduce((a, b) => a + b, 0)), r = 0; while (x >= bp[r]) { x -= bp[r]; r++; }
    const l = byR[r]; let y = rng(l.reduce((a, p) => a + p.w, 0)), j = 0; while (y >= l[j].w) { y -= l[j].w; j++; }
    out.push(l[j].id); used.add(l[j].id);
  }
  return { ids: out, calls: rng.calls() };
}
{
  const T = P0.T;
  if (T.WN_SRV.seed(0, 0) !== seedOf('память|0|0')) say('сид места: не FNV-1a от «память|место|номер»');
  const ids = WD.passives.map(p => p.id);
  for (let s = 0; s < 600; s++) {
    const excl = Array.from({ length: s % 8 }, (_, k) => ids[(s * 13 + k * 29) % ids.length]), seed = seedOf('проверка|' + s), paid = s % 2 === 1;
    const a = T.wnRoll(seed, excl, paid), b = T.wnRoll(seed, excl, paid), c = roll2(seed, excl, paid);
    cnt.triples++;
    if (!eq(a, b)) { say(`wnRoll не чистая: сид ${s}`); break; }
    if (!eq(a, c.ids)) { say(`wnRoll расходится с независимым пересчётом: сид ${s} — ${a} против ${c.ids}`); break; }
    if (c.calls !== 6) say(`тройка: бросков ${c.calls}, формат — шесть`);
    if (new Set(a).size !== 3) say(`тройка ${s}: варианты повторяются`);
    if (a.some(id => excl.includes(id))) say(`тройка ${s}: в ней исключённая пассивка`);
  }
  /* доли: первый вариант тройки из полного пула — редкость по долям §2.6, внутри — по весу */
  const N = 40000, byR = [0, 0, 0, 0, 0, 0, 0, 0], byP = {};
  for (let s = 0; s < N; s++) { const id = T.wnRoll(seedOf('доли|' + s), [])[0], p = WD.passives.find(q => q.id === id); byR[p.r]++; byP[id] = (byP[id] || 0) + 1; }
  for (let r = 1; r <= 7; r++) {
    const pr = WD.mem.rarBp[r - 1] / 10000, exp = N * pr, sd = Math.sqrt(N * pr * (1 - pr));
    if (Math.abs(byR[r] - exp) > 5 * sd) say(`доли редкостей: ${r} — ${byR[r]} из ${N}, ожидалось ${Math.round(exp)}`);
  }
  const common = WD.passives.filter(p => p.r === 1), sw = common.reduce((a, p) => a + p.w, 0);
  for (const p of common) { const pr = p.w / sw * 0.45, exp = N * pr, sd = Math.sqrt(N * pr * (1 - pr)); if (Math.abs((byP[p.id] || 0) - exp) > 5 * sd) say(`вес внутри редкости: ${p.n} — ${byP[p.id] || 0}, ожидалось ${Math.round(exp)}`); }
  const total = WD.passives.reduce((a, p) => a + T.wnChance(p, []), 0);
  if (Math.abs(total - 1000000) > WD.passives.length) say(`сумма шансов каталога — ${total} миллионных, а не 100 %`);
  const pinned = [WD.passives[0].id, WD.passives[140].id];
  if (T.wnChance(WD.passives[0], pinned) !== 0) say('шанс закреплённой пассивки не ноль');
}

/* ================== 4. операции Памяти ================== */
{
  const P = load(), T = P.T;
  fresh(P, { cyc: 1 });
  if (T.S.mem.slots.some(x => x.st === 'open')) say('цикл I: место Памяти открыто, а цикл I — обучение (§2.4)');
  fresh(P, { cyc: 2 });
  if (!eq(T.S.mem.slots.map(x => x.st), ['open', 'lock', 'lock', 'lock', 'lock'])) say(`цикл II: места ${T.S.mem.slots.map(x => x.st)}`);
  T.S.mem.cyc = 4;
  if (T.S.mem.slots.filter(x => x.st === 'open').length !== 3) say('демо-цикл IV: открытых мест не три');
  T.S.mem.cyc = 0; T.S.route = 'shelter';
  if (!view(P, 'Убежище · место открыто').includes('Место Памяти цикла II открыто')) say('Убежище не видит открытое место Памяти');
  /* первое открытие: тройку решает сервер; повторное — та же тройка */
  fresh(P, { skip: true });
  const b0 = snap(T);
  run('Вспомнить', () => T.ACT.wnmem('0'));
  const o0 = T.S.mem.offer[0];
  if (!o0 || o0.ids.length !== 3) { say('окно: тройки нет'); done(); }
  if (!eq(o0.ids, roll2(seedOf('память|0|0'), []).ids)) say('первая тройка не та, что решает сид места');
  run('закрыть', () => T.ACT.close()); run('открыть снова', () => T.ACT.wnmem('0'));
  if (!eq(T.S.mem.offer[0], o0) || T.S.wallet.enerium !== b0.en || T.S.mem.slots[0].free !== 1) say('повторное открытие окна сменило тройку или списало переброс (§2.5)');
  /* бесплатный переброс */
  const v1 = `0:${o0.n}:${op(T)}`;
  run('переброс', () => T.ACT.wnroll(v1)); cnt.ops++;
  const o1 = T.S.mem.offer[0];
  if (T.S.wallet.enerium !== b0.en) say('бесплатный переброс списал Энериум');
  if (T.S.mem.slots[0].free !== 0) say('бесплатный переброс не израсходован');
  if (!o1 || o1.n !== o0.n + 1 || !eq(o1.ids, roll2(seedOf('память|0|1'), o0.ids).ids)) say('переброс: новая тройка не по сиду места и номеру');
  if (o1.ids.some(id => o0.ids.includes(id))) say('переброс: в новой тройке есть варианты прошлой');
  run('повтор', () => T.ACT.wnrollok(v1));
  if (T.S.mem.offer[0] !== o1) say('повтор номера операции перебросил снова');
  /* платный: сначала подтверждение цены */
  const v2 = `0:${o1.n}:${op(T)}`;
  run('платный переброс', () => T.ACT.wnroll(v2));
  if (T.S.mem.ask !== 'roll' || T.S.wallet.enerium !== b0.en || T.S.mem.offer[0] !== o1) say('платный переброс без подтверждения цены');
  if (!view(P, 'подтверждение переброса').includes('Перебросить тройку?')) say('подтверждение переброса не нарисовано');
  run('отмена', () => T.ACT.wnask());
  if (T.S.mem.ask || T.S.wallet.enerium !== b0.en) say('отмена подтверждения что-то изменила');
  run('платный переброс', () => T.ACT.wnroll(v2)); run('подтвердить', () => T.ACT.wnrollok(v2)); cnt.ops++;
  if (T.S.wallet.enerium !== b0.en - W.mem.reroll) say(`платный переброс: списано ${b0.en - T.S.wallet.enerium}, а не ${W.mem.reroll}`);
  const o2 = T.S.mem.offer[0];
  run('повтор', () => T.ACT.wnrollok(v2));
  if (T.S.wallet.enerium !== b0.en - W.mem.reroll || T.S.mem.offer[0] !== o2) say('повтор платного переброса списал второй раз');
  /* устаревшее окно не закрепит заменённый вариант */
  const s1 = snap(T);
  run('устаревшее окно', () => T.ACT.wnpin(`0:${o1.n}:0:${op(T)}`));
  if (!eq(snap(T), s1)) say('устаревшее окно закрепило вариант');
  /* нехватка Энериума */
  T.S.wallet.enerium = 10;
  const s2 = snap(T), rr = T.WN_SRV.reroll(uop(), 0, o2.n);
  if (rr.refuse !== 'enerium' || !eq(snap(T), s2)) say('нехватка Энериума: не отказ или был расход');
  view(P, 'окно · не хватает Энериума');
  T.S.wallet.enerium = 1000;
  /* «Вспомнить» */
  T.S.mem.pick = 2;
  const vp = `0:${o2.n}:2:${op(T)}`;
  run('Вспомнить', () => T.ACT.wnpin(vp)); cnt.ops++;
  if (T.S.mem.slots[0].p !== o2.ids[2] || T.S.mem.slots[0].st !== 'set') say('«Вспомнить» не закрепил выделенный вариант');
  if (T.S.overlay) say('после «Вспомнить» окно не закрылось');
  const s3 = snap(T);
  run('повтор «Вспомнить»', () => T.ACT.wnpin(vp));
  if (!eq(snap(T), s3)) say('повтор «Вспомнить» что-то изменил');
  if (T.WN_SRV.pin(uop(), 0, o2.n + 1, 0).refuse !== 'set') say('закреплённое место выбирается снова без сброса');
  T.S.route = 'shelter';
  if (view(P, 'Убежище · место закреплено').includes('Место Памяти цикла II открыто')) say('Убежище не видит, что место закреплено');
  /* полный сброс: 100 Энериума, раз в неделю, перебросы не возвращаются */
  const en = T.S.wallet.enerium, vr = op(T);
  run('сброс', () => T.ACT.wnreset(vr)); cnt.ops++;
  if (T.S.wallet.enerium !== en - W.mem.reset) say(`сброс: списано ${en - T.S.wallet.enerium}, а не ${W.mem.reset}`);
  if (T.S.mem.slots[0].p || T.S.mem.slots[0].st !== 'open') say('сброс не открыл место заново');
  if (T.S.mem.slots[0].free !== 0) say('сброс вернул бесплатный переброс — прототип их не возвращает');
  run('повтор сброса', () => T.ACT.wnreset(vr));
  if (T.S.wallet.enerium !== en - W.mem.reset) say('повтор сброса списал второй раз');
  run('Вспомнить снова', () => T.ACT.wnmem('0'));
  const o3 = T.S.mem.offer[0];
  if (!o3 || o3.n <= o2.n) say('после сброса тройка не новая');
  /* бесплатная или за Энериум: первая тройка места и бесплатный переброс — бесплатные; платный переброс и тройка после сброса — за Энериум */
  if (o0.paid || o1.paid || !o2.paid || !o3 || !o3.paid) say(`тройки: бесплатная ли — ${[o0, o1, o2, o3].map(o => o && (o.paid ? 'за Энериум' : 'бесплатная'))}, ждали: бесплатная, бесплатная, за Энериум, за Энериум`);
  if (o3 && !eq(o3.ids, roll2(o3.seed, [], true).ids)) say('тройка после сброса не по сиду места и номеру или не без «только бесплатно»');
  T.S.mem.slots[0].p = o3.ids[0]; delete T.S.mem.offer[0];
  if (T.WN_SRV.reset(uop()).refuse !== 'week') say('второй сброс за неделю не отклонён (§2.7)');
  T.S.mem.resetWeek = ''; T.S.wallet.enerium = 99;
  if (T.WN_SRV.reset(uop()).refuse !== 'enerium') say('сброс без 100 Энериума не отклонён');
  /* сброс не перебрасывает тройку незакреплённого места мимо цены */
  fresh(P, { cyc: 3, skip: true }); T.S.wallet.enerium = 10000;
  run('тройка места II', () => T.ACT.wnmem('0')); const k0 = T.S.mem.offer[0];
  run('Вспомнить место II', () => T.ACT.wnpin(`0:${k0.n}:0:${op(T)}`));
  run('тройка места III', () => T.ACT.wnmem('1')); const k1 = T.S.mem.offer[1];
  run('сброс', () => T.ACT.wnreset(op(T)));
  if (T.S.mem.offer[1] !== k1) say('полный сброс сменил тройку незакреплённого места — это переброс мимо цены');
}

/* ================== 4б. «Право владыки» — только в бесплатных тройках (решение 28.09, ×1,7 §1) ==================
   У пассивок onlyFree вес 0 в тройке за Энериум: после платного переброса и после полного сброса. Бесплатные тройки — первая тройка
   места и бесплатный переброс: там она выпадает со своей долей. Бесплатных троек у места за всю игру — не больше двух */
{
  const P = load(), T = P.T;
  const OF = WD.passives.filter(p => p.onlyFree), slot = WD.passives.find(p => p.no === WD.mem.slot);
  if (!OF.length || !slot || !slot.onlyFree) say('«Право владыки» (+1 забег) не помечено «только бесплатно» в данных');
  const isOF = id => OF.some(p => p.id === id);
  /* чистая функция: за Энериум — ни на одном сиде из 60 000, в бесплатных — с долей данных */
  let bad = 0;
  for (let s = 0; s < 60000; s++) if (T.wnRoll(seedOf('за Энериум|' + s), [], true).some(isOF)) bad++;
  if (bad) say(`тройка за Энериум: «только бесплатно» выпала ${bad} раз из 60 000`);
  const N = 200000; let hit = 0;
  for (let s = 0; s < N; s++) if (T.wnRoll(seedOf('бесплатно|' + s), [], false)[0] === slot.id) hit++;
  const r7 = WD.passives.filter(p => p.r === slot.r), pr = WD.mem.rarBp[slot.r - 1] / 10000 * slot.w / r7.reduce((a, p) => a + p.w, 0);
  const exp = N * pr, sd = Math.sqrt(N * pr * (1 - pr));
  if (!hit || Math.abs(hit - exp) > 5 * sd) say(`бесплатная тройка: «${slot.n}» ${hit} раз из ${N}, ожидалось ${Math.round(exp)}`);
  if (T.wnChance(slot, [], true) !== 0 || T.wnChance(slot, [], false) <= 0) say('шанс «только бесплатно»: за Энериум не ноль или бесплатно ноль');
  /* путь «сервера»: 400 платных перебросов и 150 кругов «Вспомнить — сброс» — ни одной такой пассивки, бесплатных троек не больше двух */
  fresh(P, { skip: true }); T.S.wallet.enerium = 1e9;
  const seen = [];
  run('первая тройка', () => T.ACT.wnmem('0')); seen.push(T.S.mem.offer[0]);
  for (let k = 0; k < 400; k++) { const o = T.S.mem.offer[0], r = T.WN_SRV.reroll(uop(), 0, o.n); if (!r.res) { say('платный переброс отказан: ' + r.refuse); break; } seen.push(T.S.mem.offer[0]); }
  for (let k = 0; k < 150; k++) {
    const o = T.S.mem.offer[0];
    T.WN_SRV.pin(uop(), 0, o.n, 0); T.S.mem.resetWeek = '';
    if (!T.WN_SRV.reset(uop()).res) { say('сброс отказан'); break; }
    T.WN_SRV.offer(0); seen.push(T.S.mem.offer[0]);
    if (k % 3 === 0) { const r = T.WN_SRV.reroll(uop(), 0, T.S.mem.offer[0].n); if (r.res) seen.push(T.S.mem.offer[0]); }
  }
  const free = seen.filter(o => !o.paid), paidHit = seen.filter(o => o.paid && o.ids.some(isOF)).length;
  if (paidHit) say(`путь сервера: «только бесплатно» в ${paidHit} тройках за Энериум`);
  if (free.length > 2) say(`у места ${free.length} бесплатных троек — больше двух: первая и бесплатный переброс`);
  cnt.triples += seen.length;
  /* игроку видно: каталог, лист пассивки, подтверждение платного переброса */
  T.S.route = 'profile'; T.S.seg.profile = 'mem'; T.S.seg.wnrar = String(slot.r); T.S.overlay = { t: 'wncat' };
  if (!playerText(view(P, 'каталог · вневременные')).includes('За Энериум её не вызвать')) say('каталог: у «только бесплатно» нет строки для игрока');
  T.S.overlay = { t: 'wnp', arg: slot.id };
  if (!playerText(view(P, 'лист · Право владыки')).includes('За Энериум её не вызвать')) say('лист пассивки: нет строки «за Энериум не вызвать»');
  T.S.overlay = { t: 'mem', arg: '0' }; T.S.mem.ask = 'roll';
  if (!playerText(view(P, 'подтверждение · за Энериум')).includes('за Энериум не выпадает')) say('подтверждение платного переброса: нет строки о «только бесплатно»');
}

/* ================== 5. анимация: тройка решена до неё, частицы по редкости ================== */
{
  const P = load(), T = P.T;
  fresh(P, { skip: false });
  run('Вспомнить', () => T.ACT.wnmem('0'));
  let h = view(P, 'окно · анимация начата');
  const o = T.S.mem.offer[0], A = T.S.mem.anim;
  if (!A) say('анимация не началась'); else if (!eq(A.rs, o.ids.map(id => WD.passives.find(p => p.id === id).r))) say('анимация показывает не ту тройку, что решил сервер');
  const dl = [...h.matchAll(/id="wnCard(\d)"[^>]*style="--dl:(-?\d+)ms"/g)].map(m => +m[2]);
  if (dl.length !== 3 || !(dl[0] < dl[1] && dl[1] < dl[2])) say(`карты выходят не по очереди: задержки ${dl}`);
  if (!/data-a="wnpin"[^>]*disabled/.test(h)) say('пока карты выходят, «Вспомнить» доступно');
  run('en-render', () => T.wnSync());
  if (!T.S.mem.anim || !T.S.mem.anim.t0) say('анимация не взяла время старта');
  P.advance(700);
  h = view(P, 'окно · посреди анимации');
  const dl2 = [...h.matchAll(/id="wnCard(\d)"[^>]*style="--dl:(-?\d+)ms"/g)].map(m => [+m[1], +m[2]]);
  const cls = Object.fromEntries([...h.matchAll(/class="(wn-card[^"]*)" data-r="\d" id="wnCard(\d)"/g)].map(m => [m[2], m[1].split(/\s+/)]));
  if (!cls[0] || cls[0].includes('in') || !cls[1] || !cls[1].includes('in') || !dl2.some(([k, d]) => k === 1 && d < 0)) say(`перерисовка посреди анимации начала её заново: ${JSON.stringify(cls)} ${JSON.stringify(dl2)}`);
  run('en-render', () => T.wnSync());
  P.advance(3000);
  const bursts = P.fxLog.filter(x => x.k === 'burst').length;
  cnt.bursts += bursts;
  if (!bursts) say('вспышек появления нет');
  if (T.S.mem.anim || !T.S.mem.shown[o.i + ':' + o.n]) say('анимация не закончилась');
  h = view(P, 'окно · тройка показана');
  if (/class="wn-card[^"]*\bin\b/.test(h) || /data-a="wnpin"[^>]*disabled/.test(h)) say('после анимации карты не на месте или «Вспомнить» недоступно');
  /* богаче с редкостью: по каждой редкости — число вызовов частиц */
  const calls = [];
  const fxRec = { host: { appendChild() {} }, center: () => ({ x: 0, y: 0, w: 100, h: 100 }), ring: () => P.fxLog.push({ k: 'ring' }), burst: (x, y, c, n) => P.fxLog.push({ k: 'burst', n }), shake: () => P.fxLog.push({ k: 'shake' }) };
  for (let r = 1; r <= 7; r++) {
    P.fxLog.length = 0; run('вспышка ' + r, () => T.wnBurst(fxRec, {}, r)); P.advance(3000);
    calls.push({ r, n: P.fxLog.filter(x => x.k === 'burst').reduce((a, x) => a + x.n, 0), rings: P.fxLog.filter(x => x.k === 'ring').length, shake: P.fxLog.some(x => x.k === 'shake') });
  }
  for (let i = 1; i < 7; i++) if (calls[i].n <= calls[i - 1].n || calls[i].rings < calls[i - 1].rings) say(`частицы: редкость ${i + 1} не богаче ${i} — ${calls[i].n} против ${calls[i - 1].n}`);
  if (T.WN_VIEW.fx[1].flash || T.WN_VIEW.fx[1].shake || calls[0].n > 6) say('у обычной — вспышка, дрожь или много искр: должно быть почти ничего');
  if (!T.WN_VIEW.fx[7].flash || !T.WN_VIEW.fx[7].shake || !calls[6].shake) say('у вневременной нет полного всплеска: вспышки и дрожи');
  /* закрыли посреди анимации — тройка считается показанной */
  fresh(P, { skip: false });
  run('Вспомнить', () => T.ACT.wnmem('0')); view(P, 'окно'); run('en-render', () => T.wnSync());
  run('закрыть', () => T.ACT.close()); run('en-render', () => T.wnSync());
  if (T.S.mem.anim) say('окно закрыли посреди анимации — анимация осталась');
  run('открыть снова', () => T.ACT.wnmem('0'));
  if (T.S.mem.anim) say('повторное открытие проиграло ту же тройку заново');
  /* пропуск: галочка посреди анимации — тройка сразу; localStorage помнит, без него работает */
  const store = new Map(), P2 = load({ storage: store }), T2 = P2.T;
  fresh(P2, { skip: false });
  run('Вспомнить', () => T2.ACT.wnmem('0')); run('en-render', () => T2.wnSync());
  run('пропустить', () => T2.ACT.wnskip('', { checked: true }));
  if (T2.S.mem.anim || store.get('en-wn-skip') !== '1') say('«Пропустить анимацию» посреди анимации: тройка не сразу или выбор не запомнен');
  const P3 = load({ storage: store });
  if (!P3.T.S.mem.skip) say('«Пропустить анимацию» не прочитано из localStorage');
  const P4 = load({ reduced: true }), T4 = P4.T;
  fresh(P4, { skip: false });
  run('Вспомнить', () => T4.ACT.wnmem('0'));
  const h4 = view(P4, 'окно · меньше движения');
  if (T4.S.mem.anim || /class="wn-card[^"]*\bin\b/.test(h4) || !/data-a="wnskip"[^>]*checked[^>]*disabled/.test(h4)) say('prefers-reduced-motion: анимация есть или галочка не заблокирована');
  /* демо команды: вневременная в следующей тройке */
  fresh(P, { skip: true }); T.S.mem.demoHigh = true;
  run('Вспомнить', () => T.ACT.wnmem('0'));
  if (!T.S.mem.offer[0].ids.some(id => WD.passives.find(p => p.id === id).r === 7)) say('демо «вневременная в следующей тройке» не сработало');
}

/* ================== 6. артефакты ================== */
{
  const P = load(), T = P.T;
  fresh(P); T.S.seg.profile = 'arts';
  const a = id => WD.art.list.find(x => x.id === id);
  const v = id => `${id}:${op(T)}`;
  if (T.WN_SRV.up(uop(), 'a1').refuse !== 'cap') say('артефакт на потолке цикла поднимается выше');
  let s = snap(T), vu = v('a3');
  run('улучшить', () => T.ACT.wnup(vu)); cnt.ops++;
  if (T.S.wn.art.a3 !== 2 || T.S.wallet.souls !== s.souls - a('a3').soul * 2) say('уровень артефакта: не база × номер уровня');
  s = snap(T); run('повтор', () => T.ACT.wnup(vu));
  if (!eq(snap(T), s)) say('повтор улучшения списал второй раз');
  s = snap(T); const vb = v('a6');
  run('купить', () => T.ACT.wnbuy(vb)); cnt.ops++;
  if (T.S.wn.art.a6 !== 0 || T.S.wallet.gold !== s.gold - a('a6').gold) say('покупка артефакта: не золото или не уровень 0');
  run('повтор', () => T.ACT.wnbuy(vb));
  if (T.S.wallet.gold !== s.gold - a('a6').gold) say('повтор покупки списал второй раз');
  if (T.WN_SRV.buy(uop(), 'a9').refuse !== 'cycle') say('артефакт цикла III куплен в цикле II');
  T.S.mem.cyc = 3;
  if (T.WN_SRV.buy(uop(), 'a9').res === undefined) say('артефакт цикла III не куплен в цикле III');
  if (T.wnCap(a('a2')) !== 3) say('потолок уровня в цикле III для артефакта цикла I — не III');
  T.S.acc.level = 3;
  if (T.WN_SRV.buy(uop(), 'a18').refuse !== 'level') say('артефакты открыты до 4-го уровня Странника (§16)');
  T.S.acc.level = 24; T.S.wallet.gold = 10;
  s = snap(T);
  if (T.WN_SRV.buy(uop(), 'a18').refuse !== 'gold' || !eq(snap(T), s)) say('нехватка золота: не отказ или расход');
  T.S.wallet.souls = 0;
  if (T.WN_SRV.up(uop(), 'a2').refuse !== 'souls') say('нехватка душ: не отказ');
}

/* ================== 7. достижения ================== */
{
  const P = load(), T = P.T;
  fresh(P); T.S.seg.profile = 'ach';
  const ready = W.ach.list.filter(a => T.wnReady(a));
  if (!ready.length) say('демо: ни одного достижения к получению');
  const a = ready.find(x => x.cat === 'pers') || ready[0], s = snap(T), vc = `${a.id}:${op(T)}`;
  const want = T.wnChest(a, 2);
  run('получить', () => T.ACT.wnclaim(vc)); cnt.ops++;
  const got = T.S.bag.chests.slice(s.chests);
  if (!T.S.wn.ach.got[a.id]) say('достижение не получено');
  if (got.length !== want.length || !want.length || got.some((c, i) => c.box !== want[i].box || c.r !== want[i].r || c.cyc !== 2 || c.win !== want[i].win)) say('сундук за достижение не по строке «Достижения» lootboxes.js на цикл II');
  const row = T.LBX.modes.feats.layers.flatMap(l => l.rows).find(r => r.label === 'Персональные');
  if (a.cat === 'pers' && (!row || want[0].r !== row.cyc[2][0].r)) say('редкость сундука не из lootboxes.js');
  run('повтор', () => T.ACT.wnclaim(vc));
  if (T.S.bag.chests.length !== got.length + s.chests) say('повтор получения выдал второй сундук');
  const not = W.ach.list.find(x => !T.wnReady(x) && !T.S.wn.ach.got[x.id]);
  const s2 = snap(T);
  if (T.WN_SRV.claim(uop(), not.id).refuse !== 'goal' || !eq(snap(T), s2)) say('невыполненное достижение получено');
  /* таинственные: условие скрыто до получения */
  T.S.seg.wnach = 'myst';
  let h = view(P, 'достижения · таинственные'), txt = playerText(h);
  const hid = W.ach.list.filter(x => x.cat === 'myst' && !T.S.wn.ach.got[x.id] && !T.wnReady(x));
  for (const x of hid) if (txt.includes(x.n) || txt.includes(x.d)) say(`таинственное «${x.id}» видно игроку до получения`);
  const m = hid[0]; T.S.wn.ach.p[m.id] = m.goal;
  h = view(P, 'достижения · таинственное выполнено');
  if (!playerText(h).includes(m.n)) say('выполненное таинственное не раскрылось');
  /* первенства: только свои; в цикле II — четыре */
  T.S.seg.wnach = 'first';
  h = view(P, 'достижения · первенства');
  if ((h.match(/class="wn-first[ "]/g) || []).length !== 4) say('первенств цикла II на экране не четыре');
  const mine = W.ach.firsts.find(f => T.S.wn.ach.first[f.id] === '@' && !T.S.wn.ach.got[f.id]), other = W.ach.firsts.find(f => T.S.wn.ach.first[f.id] && T.S.wn.ach.first[f.id] !== '@');
  if (T.WN_SRV.claim(uop(), other.id).refuse !== 'goal') say('чужое первенство можно забрать');
  const n0 = T.S.bag.chests.length;
  run('первенство', () => T.ACT.wnclaim(`${mine.id}:${op(T)}`)); cnt.ops++;
  const fr = T.LBX.modes.feats.layers.flatMap(l => l.rows).find(r => r.label === 'Первенство сервера').cyc[2][0];
  const c = T.S.bag.chests[n0];
  if (!c || c.r !== fr.r || c.win !== fr.win) say('сундук первенства не по строке «Первенство сервера»');
}

/* ================== 8. вид: «Игрок» и «Команда» ================== */
for (const team of [false, true]) {
  const P = load(), T = P.T, tag = team ? ' [команда]' : '';
  run('режим', () => T.setTeam(team));
  const teamSeen = [];
  for (const cyc of [1, 2, 4, 6]) {
    fresh(P, { cyc, skip: true });
    for (const t of ['over', 'mem', 'arts', 'ach']) {
      T.S.route = 'profile'; T.S.seg.profile = t; T.S.overlay = null;
      if (t !== 'ach') { const h = view(P, `Странник · ${t} · цикл ${cyc}${tag}`); if (team) teamSeen.push(teamCount(h)); continue; }
      for (const c of W.ach.cats) { T.S.seg.wnach = c.id; view(P, `достижения · ${c.id} · цикл ${cyc}${tag}`); }
    }
    /* окна и листы */
    T.S.route = 'profile'; T.S.seg.profile = 'mem';
    for (const i of ['', '0', '1', '4']) { T.S.overlay = { t: 'mem', arg: i }; view(P, `окно Памяти ${i || 'первое'} · цикл ${cyc}${tag}`); }
    T.S.overlay = { t: 'memreset' }; view(P, `сброс · цикл ${cyc}${tag}`);
    for (let r = 0; r <= 7; r++) { T.S.seg.wnrar = String(r); T.S.overlay = { t: 'wncat' }; view(P, `каталог · ${r}${tag}`); }
    T.S.mem.q = 'руна'; T.S.seg.wnrar = '0'; T.S.overlay = { t: 'wncat' };
    const hq = view(P, `каталог · поиск${tag}`); if (!/wn-row/.test(hq)) say('каталог: поиск «руна» ничего не нашёл'); T.S.mem.q = '';
    for (const p of WD.passives.filter((_, k) => k % 7 === 0)) { T.S.overlay = { t: 'wnp', arg: p.id }; view(P, `пассивка ${p.id}${tag}`); }
    for (const a of WD.art.list) { T.S.overlay = { t: 'wnart', arg: a.id }; view(P, `артефакт ${a.id} · цикл ${cyc}${tag}`); }
    for (const a of WD.ach.list.concat(WD.ach.firsts)) { T.S.overlay = { t: 'wnfeat', arg: a.id }; view(P, `достижение ${a.id}${tag}`); }
    for (const t of ['wnpas', 'wnfame']) { T.S.overlay = { t }; view(P, `лист ${t} · цикл ${cyc}${tag}`); }
  }
  /* окно с анимацией и подтверждением */
  fresh(P, { skip: false });
  T.S.overlay = { t: 'mem', arg: '' }; view(P, `окно · анимация${tag}`);
  T.S.mem.anim = null; T.S.mem.shown = { '0:0': true }; T.S.mem.slots[0].free = 0; T.S.mem.ask = 'roll'; view(P, `окно · подтверждение${tag}`);
  /* сценарии «Странника» */
  for (const [t, , f] of T.FLOWS.filter(x => /Памят|Артефакт|Достижени/.test(x[0]))) { fresh(P, { skip: true }); run('сценарий ' + t, () => f()); view(P, `сценарий «${t}»${tag}`); }
  if (team && !teamSeen.some(Boolean)) say('режим «Команда»: на экране «Странник» нет служебного — демо и пояснения не размечены');
}

/* ================== 9. UI-кит и карта экранов ================== */
{
  const P = load(), T = P.T;
  const kit = T.KIT_EXTRA.find(x => { try { return /Память Странника/.test(x.html()); } catch (_) { return false; } });
  if (!kit) say('UI-кит: нет раздела «Память Странника» в KIT_EXTRA');
  else {
    const h = kit.html();
    for (let r = 1; r <= 7; r++) if (!new RegExp(`id="wnKit${r}"`).test(h) || !new RegExp(`class="wn-card[^"]*" data-r="${r}"`).test(h)) say(`UI-кит: нет карты редкости ${r}`);
    if (/undefined|NaN/.test(h)) say('UI-кит: undefined или NaN');
    run('UI-кит · paint', () => kit.paint());
  }
  const m = T.MAP.find(x => x.n === 'Странник');
  if (!m || !m.ready || !['wanderer-passives', 'artifacts', 'achievements', 'server-firsts'].every(id => m.ready.includes(id))) say('карта экранов: «Странник» не отмечен готовым');
  if (!/\.p-old\.ok/.test(html) || !/готово в прототипе/.test(html)) say('карта экранов: нет отметки «готово в прототипе»');
}

done();
