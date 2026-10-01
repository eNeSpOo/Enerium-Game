/* Автопроверка режима «Чистый лист» и уровня Странника (design/ui/screens/start.js, design/ui/start.js) — без браузера.
   1. Данные свежие: design/ui/start.js — та же сборка, что даёт tools/content-gen/start/build.js; пороги растут, уровней сценария — 10.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается;
      localStorage недоступен — прототип открывается демо-аккаунтом, как прежде: уровень 24, ворот сценария нет.
   3. «Чистый лист»: новый аккаунт — уровень 1 первой операцией сервера, кошелёк — награда уровня 1, ни одного героя, Мастерская — рубеж,
      закрыты Ремесло (до 3-го), Неделя (до 10-го), места отряда со второго. Карта экранов и UI-кит при запуске не падают.
      Окна уровней и лист «Уровень Странника» — без спойлеров и намёков по лестнице циклов I–II (lore/ladder.js). Все маршруты и листы рисуются без исключений,
      undefined и NaN; в режиме «Игрок» — без служебных слов (check_player_view.js, SERVICE).
   4. Сервер: повтор номера операции ничего не выдаёт; без новых уровней номер не тратится; веха опыта — один раз.
   5. Окна уровня — по одному, очередью: два уровня разом — два окна по порядку; во время боя окна нет; «Попробовать» ведёт
      к механике, следующее окно ждёт смены экрана.
   6. Сценарий проходится через операции прототипа: канонический игрок (tools/content-gen/start/bot.js) в мире прототипа — найм,
      дух в уровни, руна обучения, предел, рецепт в Мастерской, забеги и стражи настоящим ядром. Путь — шаги, уровни, найм и итог —
      совпадает с прогоном сборщика (EN_START.path): одно ядро, одни правила. Награда каждого уровня выдана ровно один раз.
   7. Режим «Игрок»: окна уровней 1–10 и лист «Уровень Странника» по ходу сценария — без служебных слов.
   Запуск: node tools/content-gen/screens/check_start.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const { play } = require(path.join(ROOT, 'tools', 'content-gen', 'start', 'bot.js'));
const LAD = require(path.join(ROOT, 'tools', 'content-gen', 'lore', 'ladder.js'));
const err = [], cnt = { views: 0, levels: 0, popups: 0, steps: 0, ops: 0 };
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Проверено: отрисовок ${cnt.views}, окон уровня ${cnt.popups}, шагов сценария ${cnt.steps}, операций сервера ${cnt.ops}. Проверка пройдена: новый аккаунт с нуля, ворота разделов и мест, уровень и награда — одной операцией с номером, повтор ничего не выдаёт, окна уровня по одному, сценарий проходится через операции прототипа тем же путём, что прогон ядром.`);
  process.exit(0);
}

/* ---------- 1. данные свежие ---------- */
{
  const B = require(path.join(ROOT, 'tools', 'content-gen', 'start', 'build.js')), R = B.build();
  if (R.err.length) { say('сборка сценария: ' + R.err.join('; ')); done(); }
  const js = B.render(R.data);
  if (read('start.js') !== js) say('design/ui/start.js устарел — пересобрать: node tools/content-gen/start/build.js');
  const L = R.data.levels;
  if (L.length !== 10) say(`уровней сценария ${L.length}, а не 10 (§16)`);
  L.forEach((l, i) => { if (i && l.xp <= L[i - 1].xp) say(`порог уровня ${l.L} не выше порога уровня ${l.L - 1}`); });
}

/* ---------- 2. песочница ---------- */
const html = read('index.html');
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
if (!scripts.some(s => s.src === 'start.js')) say('index.html: не подключены данные start.js');
if (!scripts.some(s => s.src === 'screens/start.js')) say('index.html: не подключён screens/start.js');
if (!/href="screens\/start\.css"/.test(html)) say('index.html: не подключены стили screens/start.css');
if (!/id="devAcc"[\s\S]{0,400}data-acc="fresh"/.test(html)) say('index.html: нет переключателя «Аккаунт: Демо / Чистый лист» (#devAcc)');
if (!/id="obMap"/.test(html)) say('index.html: нет места сценария на карте экранов (#obMap)');
const stubEl = id => {
  const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, prepend() {}, remove() {},
    animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
  e.querySelector = () => stubEl();
  return e;
};
const els = {}, rootCls = new Set(), root = stubEl('html');
root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
  querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
  documentElement: root, activeElement: null, fonts: null, baseURI: 'http://localhost/' };
const noStore = () => { throw new Error('localStorage недоступен'); };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 }, URL };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
const T = vm.runInContext(`({
  get S() { return S; }, set S(v) { S = v; },
  ACT, OV, SCREENS, NAV_OPEN, RSI, RS, BAG, EB, HD_SRV, WS_SRV, GD_SRV, SQ_SRV, render, initialState, startRun, advance, focusRun,
  hdOp, wsOp, gdOp, gdCost, rsGold, rsHas, limitRune, hrTwin, hrMine, setTeam,
  renderKit: () => renderKit(), renderMap: () => renderMap(),
  OB: { D: OB_D, R: OB_R, SRV: OB_SRV, sync: obSync, switch: obSwitch, pop: obPopHtml, can: obCanShow, slotLock: obSlotLock, hero: obHero, get mode() { return OB_MODE; } },
})`, ctx);
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const game = () => (els.game ? els.game.innerHTML : '');
function scan(where, h, player) {
  cnt.views++;
  if (typeof h !== 'string') { say(`${where}: разметка не строка`); return; }
  if (/undefined|NaN|\[object /.test(h)) say(`${where}: в разметке undefined, NaN или [object`);
  if (!player) return;
  const t = playerText(h);
  for (const [what, re] of SERVICE) { const m = t.match(re); if (m) { const a = Math.max(0, m.index - 40); say(`${where}: в режиме «Игрок» — ${what}: «…${t.slice(a, m.index + m[0].length + 40)}…»`); } }
}
const draw = (where, player = true) => { run(where, () => T.render()); scan(where, game(), player); return game(); };
/* лестница спойлеров (01.10.2026): окна уровней и лист «Уровень Странника» игрок видит в циклах I–II — ни спойлеров, ни намёков
   (tools/content-gen/lore/ladder.js). Смотрим только своё: окно уровня из разметки и лист целиком, без экрана под ними */
function ladder(where, h) {
  const t = playerText(String(h || ''));
  for (const x of LAD.violations(t, 1, false)) say(`${where}: лестница спойлеров, ${x.lvl} «${x.hit}» — ${x.why}`);
}
const popOf = h => (String(h).match(/<div class="ob-pop"[\s\S]*/) || [''])[0];

/* ---------- демо-аккаунт — как был ---------- */
if (T.OB.mode) say('без localStorage прототип открылся не демо-аккаунтом');
if (T.S.ob) say('демо-аккаунт несёт состояние «Чистого листа» (S.ob)');
if (JSON.stringify(T.NAV_OPEN) !== JSON.stringify({ week: 10 })) say(`демо: ворота шахты ${JSON.stringify(T.NAV_OPEN)} — ждали прежние { week: 10 }`);
if (T.S.acc.level !== 24) say('демо-аккаунт не на 24-м уровне');
T.S.overlay = { t: 'level' }; { const h = draw('демо · лист «Уровень Странника»'); if (!/Уровни 1–10/.test(h)) say('демо: лист уровня без таблицы уровней 1–10'); }
T.S.overlay = null;

/* ---------- 3. новый аккаунт ---------- */
const D = T.OB.D, R = T.OB.R;
run('переключение на «Чистый лист»', () => T.OB.switch(true));
const S0 = T.S;
if (!S0.ob || !S0.ob.on) { say('«Чистый лист»: нет состояния S.ob'); done(); }
/* запуск: boot() сразу после render() рисует карту экранов и UI-кит; у нового аккаунта нет героев — кит не должен падать, иначе панель
   прототипа остаётся без обработчиков (размеры устройства, вкладки, «Сбросить») */
run('«Чистый лист»: карта экранов при запуске', () => T.renderMap());
run('«Чистый лист»: UI-кит при запуске', () => T.renderKit());
if (T.S !== S0) say('«Чистый лист»: UI-кит подменил состояние аккаунта');
if (S0.ob.srv.lvl !== 1 || S0.acc.level !== 1) say(`новый аккаунт: уровень ${S0.ob.srv.lvl} — ждали 1 первой операцией сервера`);
{
  const r1 = R.reward(1), w = S0.wallet;
  if (w.gold !== r1.gold || w.spirit !== r1.spirit || w.keys !== 0 || w.souls !== 0 || w.enerium !== 0) say(`новый аккаунт: кошелёк ${JSON.stringify(w)} — ждали награду уровня 1 (${r1.gold} золота, ${r1.spirit} духа)`);
  if (S0.heroes.length || Object.keys(S0.rs.owned).length) say('новый аккаунт: есть герои');
  if (Object.keys(S0.bag.items).length || S0.bag.chests.length) say('новый аккаунт: запасы не пусты');
  if (S0.biomes.find(b => b.state === 'front').id !== 'b1' || S0.biomes.some(b => b.id !== 'b1' && b.state !== 'lock')) say('новый аккаунт: Мастерская форм не единственный открытый биом');
  if (JSON.stringify(S0.ob.queue) !== '[1]') say(`новый аккаунт: очередь окон ${JSON.stringify(S0.ob.queue)} — ждали окно уровня 1`);
  if (T.NAV_OPEN.craft !== D.gates.nav.craft || T.NAV_OPEN.week !== D.gates.nav.week) say(`ворота шахты не по данным: ${JSON.stringify(T.NAV_OPEN)}`);
  for (let i = 0; i < 5; i++) { const lk = T.OB.slotLock(i), want = i < D.gates.slots[0] ? 0 : D.gates.slots.findIndex(n => n > i) + 1; if (lk !== want) say(`место отряда ${i + 1}: замок ${lk}, ждали ${want}`); }
}
/* окно уровня 1 */
{
  T.S.route = 'shelter'; const h = draw('окно уровня 1');
  if (!/class="ob-pop"/.test(h)) say('окно уровня 1 не показано поверх Убежища');
  if (!/Уровень 1 ·/.test(h) || !/data-a="obtry"/.test(h)) say('окно уровня 1: нет «Уровень 1» или «Попробовать»');
  if ((h.match(/class="ob-pop"/g) || []).length !== 1) say('окон уровня больше одного разом');
  cnt.popups++;
}
/* ворота: закрытые разделы и вкладки */
{
  const h = draw('шахта на уровне 1');
  if (!/class="g-nav lock"[^>]*data-k="craft"|data-k="craft"[^>]*class="g-nav lock"/.test(h) && !/<button class="g-nav lock[^"]*" data-k="craft"/.test(h)) say('уровень 1: «Ремесло» в шахте не закрыто');
  if (!/<button class="g-nav lock[^"]*" data-k="week"/.test(h)) say('уровень 1: «Неделя» в шахте не закрыта');
  T.S.ob.queue = []; T.S.route = 'craft'; T.S.seg.craft = 'work';
  const c = draw('Ремесло · Мастерская закрыта');
  if (!/ob-lock/.test(c)) say('уровень 1: Мастерская не показывает замок');
  T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls';
  const g = draw('Призыв · за души закрыто');
  if (!/ob-lock/.test(g)) say('уровень 1: «За души» не показывает замок');
  T.S.seg.heroes = 'squads'; const q = draw('Отряды · места закрыты');
  if ((q.match(/class="lb-slot lock"/g) || []).length !== 4) say('уровень 1: в отряде не четыре закрытых места');
  T.S.seg.hire = 'gold'; T.S.seg.heroes = 'hire';
}
/* все маршруты и листы нового аккаунта рисуются */
for (const route of Object.keys(T.SCREENS)) {
  if (route === 'battle') continue;
  T.S.route = route; T.S.overlay = null; draw(`новый аккаунт · ${route}`);
}
for (const t of ['level', 'inbox', 'coll', 'mem', 'gift']) { if (!T.OV[t]) continue; T.S.route = 'shelter'; T.S.overlay = { t }; draw(`новый аккаунт · лист ${t}`); }
T.S.overlay = null; T.S.route = 'shelter';
{
  T.S.overlay = { t: 'level' }; const h = draw('лист «Уровень Странника» на уровне 1');
  if (!/Следующий уровень · 2/.test(h)) say('лист уровня: нет следующего уровня и его этапа');
  if (!/Пройти пять этажей Мастерской/.test(h)) say('лист уровня: нет этапа уровня 2');
  T.S.overlay = null;
}

/* ---------- 4. сервер: повтор номера, веха один раз ---------- */
{
  const s = T.S, op = Object.keys(s.ob.srv.ops)[0], g0 = s.wallet.gold;
  const r = T.OB.SRV.claim(op); cnt.ops++;
  if (!r.again || s.wallet.gold !== g0 || s.ob.srv.lvl !== 1) say('повтор операции уровня выдал награду снова');
  const r2 = T.OB.SRV.claim('ob' + s.ob.srv.seq); cnt.ops++;
  if (r2.refuse !== 'none' || s.ob.srv.seq !== 2) say('операция без новых уровней потратила номер или выдала награду');
  const x0 = s.ob.srv.xp; T.S.known.push('o1'); T.OB.sync(); const x1 = s.ob.srv.xp; T.OB.sync(); T.S.known = T.S.known.filter(id => id !== 'o1');
  if (x1 - x0 !== D.xp.kill || s.ob.srv.xp !== x1) say(`веха «первое убийство»: опыт ${x1 - x0}, повтор — ${s.ob.srv.xp - x1}`);
}

/* ---------- 5. окна: два уровня разом — по порядку; в бою окна нет ---------- */
{
  run('свежий лист', () => T.OB.switch(true));
  const s = T.S; s.ob.queue = [];
  s.ob.srv.xp = D.levels[2].xp; s.ob.best.b1 = 10;   // этапы и опыт уровней 2 и 3 разом
  T.OB.sync();
  if (JSON.stringify(s.ob.queue) !== '[2,3]') say(`два уровня разом: очередь ${JSON.stringify(s.ob.queue)} — ждали [2,3]`);
  if (s.ob.srv.lvl !== 3) say('два уровня разом: сервер не выдал оба');
  s.route = 'shelter'; let h = draw('окно уровня 2 из очереди'); cnt.popups++;
  if (!/Уровень 2 ·/.test(h) || /Уровень 3 ·/.test(h)) say('очередь: первым показано не окно уровня 2 или два окна разом');
  run('«Позже»', () => T.ACT.oblater('2')); h = draw('окно уровня 3 после «Позже»'); cnt.popups++;
  if (!/Уровень 3 ·/.test(h)) say('очередь: после «Позже» нет окна уровня 3');
  run('«Попробовать»', () => T.ACT.obtry('3'));
  if (s.route !== 'craft' || s.seg.craft !== 'stock') say(`«Попробовать» уровня 3 привело в ${s.route}:${s.seg.craft}, ждали Ремесло · Запасы`);
  s.ob.queue.push(4); h = draw('после «Попробовать» — следующее ждёт смены экрана');
  if (/class="ob-pop"/.test(h)) say('после «Попробовать» следующее окно не дождалось смены экрана');
  s.route = 'shelter'; s.ob.hold = ''; h = draw('новое окно после смены экрана');
  if (!/class="ob-pop"/.test(h)) say('окно уровня не показано после смены экрана');
  s.ob.queue = [];
}

/* ---------- 6. сценарий через операции прототипа ---------- */
run('свежий лист для сценария', () => T.OB.switch(true));
const PATH = D.path || {};
let msAll = 0;
const W = {
  st() {
    const s = T.S, L = s.ob.srv.lvl, rn = T.limitRune(1, 1);
    const heroes = s.heroes.map(h => ({ id: (T.hrTwin(h) || { id: h.id }).id, lvl: h.lvl, cap: h.cap, lim: h.lim || 0, valor: h.valor || 0, maxV: h.maxV }));
    const front = (s.biomes.find(b => b.state === 'front') || { id: 'b1' }).id, boss = {};
    for (const [b, g] of Object.entries(s.siege)) if (g && g.killed) boss[b] = 1;
    return { lvl: L, cycle: s.acc.cycle, slots: R.slots(L), gold: s.wallet.gold, spirit: s.wallet.spirit, keys: s.wallet.keys, train: s.hd.train,
      runes: T.BAG.qty(rn.id), heroes, front, boss, guard: Object.assign({}, s.ob.guard), recipe: s.bag.known.length,
      craft: L >= R.opensAt('seg', 'craft:work'), has: (id, n) => T.BAG.has(id, n) };
  },
  ms: () => msAll,
  price: k => T.rsGold(1, k),
  levelCost: n => T.EB.levelCost(n),
  entry: b => T.gdCost(b),
  /* уровни с прошлого раза: окна закрываются «Позже» по одному, как их покажет прототип */
  claim() {
    const s = T.S; T.OB.sync(); cnt.ops++;
    const got = s.ob.got.splice(0).map(L => ({ L, ms: msAll }));
    s.route = 'shelter'; s.overlay = null; s.ob.hold = '';
    let guard = 0;
    while (s.ob.queue.length && guard++ < 20) {
      const L = s.ob.queue[0], h = draw(`окно уровня ${L}`); cnt.popups++;
      ladder(`окно уровня ${L}`, popOf(h));
      if (!new RegExp(`Уровень ${L} ·`).test(h)) say(`окно уровня ${L} не показано в свой черёд`);
      if (!popSeen[L]) { popSeen[L] = 1; T.S.overlay = { t: 'level' }; draw(`лист уровня на уровне ${s.ob.srv.lvl}`); ladder(`лист уровня на уровне ${s.ob.srv.lvl}`, run('лист уровня', () => T.OV.level())); T.S.overlay = null; }
      T.ACT.oblater(String(L));
    }
    return got;
  },
  hire(id) {
    const s = T.S, h = T.RSI[id]; s.route = 'heroes'; s.seg.heroes = 'hire'; s.seg.hire = 'gold';
    run('найм ' + id, () => T.ACT.gbuy(id));
    if (!s.overlay || s.overlay.act !== 'gbuydo') { say(`найм ${id}: нет подтверждения с ценой`); return false; }
    run('найм ' + id, () => T.ACT[s.overlay.act](s.overlay.v));
    return T.rsHas(h);
  },
  levelUp(id) { const h = T.OB.hero(id); if (!h) return false; const r = T.HD_SRV.lvl(T.hdOp(), h.id, 1); return !!r.ok; },
  valor(id) { const h = T.OB.hero(id); if (!h) return false; const r = T.HD_SRV.valor(T.hdOp(), h.id); return !!r.ok; },
  limit(id) { const h = T.OB.hero(id); if (!h) return false; const r = T.HD_SRV.limit(T.hdOp(), h.id); return !!r.ok; },
  craft(cells) {
    T.S.route = 'craft'; T.S.seg.craft = 'work'; draw('Мастерская перед первым рецептом');
    const r = T.WS_SRV.attempt(T.wsOp(), cells.map(([id, q], i) => ({ id, q, pos: i })), true);
    return !!(r.res && r.res.kind === 'made');
  },
  run(b) {
    const s = T.S; s.selBiome = b; s.prepSquad = 's1'; s.route = 'descent';
    run('забег ' + b, () => T.startRun('s1', b));
    const Rr = s.runs[s.runs.length - 1]; if (!Rr || Rr.guard) { say(`забег ${b} не начался`); return { wall: 0, win: false, ms: 0 }; }
    s.focus = Rr.id; s.route = 'descent';
    if (stepsDone % 9 === 0) { s.route = 'battle'; const h = draw(`бой · шаг ${stepsDone + 1}`); if (/class="ob-pop"/.test(h)) say('окно уровня поверх идущего боя'); s.route = 'descent'; }
    let n = 0; while (!Rr.over && n++ < 100000) run('ход', () => T.advance(Rr, 60000));   // бой идёт свёрнутым: показ — частицы холста, их в песочнице нет
    s.route = 'descent'; msAll += Rr.runMs; stepsDone++;
    const E = Rr.end || {}; return { wall: E.kind === 'wall' ? E.floor : Rr.floor, win: E.kind === 'boss', ms: Rr.runMs };
  },
  guard(b) {
    const s = T.S; s.selBiome = b; s.prepSquad = 's1'; s.route = 'descent'; s.overlay = null;
    run('страж ' + b, () => T.ACT.guard(T.gdOp()));
    const Rr = s.runs[s.runs.length - 1]; if (!Rr || !Rr.guard || Rr.over) { say(`страж ${b}: вход не случился${s.overlay ? ' — ' + s.overlay.t : ''}`); return { win: false, ms: 0 }; }
    s.route = 'descent';   // бой свёрнут
    let n = 0; while (!Rr.over && n++ < 100000) run('ход', () => T.advance(Rr, 60000));
    s.route = 'descent'; msAll += Rr.runMs; stepsDone++;
    return { win: (Rr.end || {}).kind === 'guardWin', ms: Rr.runMs };
  },
};
const popSeen = {};
let stepsDone = 0;
const P = run('сценарий', () => play(W, D)) || { log: [], steps: [], done: false };
cnt.steps = P.steps.length;
if (!P.done) say(`сценарий не дошёл до цикла II: уровень ${T.S.ob.srv.lvl}, шагов ${P.steps.length}`);
/* путь — тот же, что у прогона сборщика */
const steps = P.steps.map(s => s.kind === 'run' ? ['run', s.b, s.wall, s.win ? 1 : 0] : ['guard', s.b, s.win ? 1 : 0]);
const stepIdx = x => { let i = 0; for (const s of P.log) { if (s === x) return i; if (s.kind === 'run' || s.kind === 'guard') i++; } return i; };
const lv = P.log.filter(x => x.kind === 'level').map(x => [x.L, stepIdx(x)]), hires = P.log.filter(x => x.kind === 'hire').map(x => [x.id, stepIdx(x)]);
const diff = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return i; return -1; };
{
  const d = diff(steps, PATH.steps || []);
  if (d >= 0) say(`прототип пошёл другим путём, чем прогон ядром, с шага ${d + 1}: ${JSON.stringify(steps[d])} против ${JSON.stringify((PATH.steps || [])[d])}`);
  const dl = diff(lv, PATH.levels || []); if (dl >= 0) say(`уровни: в прототипе ${JSON.stringify(lv[dl])}, в прогоне ${JSON.stringify((PATH.levels || [])[dl])} (уровень, шаг)`);
  const dh = diff(hires, PATH.hires || []); if (dh >= 0) say(`найм: в прототипе ${JSON.stringify(hires[dh])}, в прогоне ${JSON.stringify((PATH.hires || [])[dh])}`);
  const E = PATH.end || {}, s = T.S, heroes = s.heroes.map(h => [(T.hrTwin(h) || { id: h.id }).id, h.lvl, h.lim || 0, h.valor || 0]);
  if (s.ob.srv.lvl !== E.lvl || s.ob.srv.xp !== E.xp || s.acc.cycle !== E.cycle) say(`итог: уровень ${s.ob.srv.lvl}, опыт ${s.ob.srv.xp}, цикл ${s.acc.cycle} — в прогоне ${E.lvl}, ${E.xp}, ${E.cycle}`);
  if (JSON.stringify(heroes) !== JSON.stringify(E.heroes)) say(`итог: отряд ${JSON.stringify(heroes)} — в прогоне ${JSON.stringify(E.heroes)}`);
  if (s.wallet.gold !== E.gold || s.wallet.spirit !== E.spirit || s.wallet.keys !== E.keys) say(`итог: кошелёк ${s.wallet.gold}/${s.wallet.spirit}/${s.wallet.keys} — в прогоне ${E.gold}/${E.spirit}/${E.keys}`);
  /* награды — ровно один раз: золото, дух и ключи уровней в операциях сервера */
  const got = Object.values(s.ob.srv.ops).flatMap(o => o.levels.map(x => x.L));
  if (JSON.stringify(got) !== JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])) say(`уровни в операциях сервера: ${JSON.stringify(got)} — каждый ровно один раз, по порядку`);
  const chests = s.bag.chests.filter(c => /Уровень Странника/.test(c.src || '')).length, want = D.levels.filter(l => l.reward.chest).length;
  if (chests !== want) say(`сундуков уровня в запасах ${chests}, ждали ${want}`);
  const sh = D.levels.flatMap(l => l.reward.shards || []); for (const [id, n] of sh) if ((s.rs.shards[id] || 0) !== n) say(`осколки ${id}: ${s.rs.shards[id] || 0}, ждали ${n}`);
  /* цикл II: Неделя открыта, Мастерская и лес пройдены, рубеж — Библиотека Улариона, место Памяти ждёт */
  if (T.NAV_OPEN.week > s.ob.srv.lvl) say('цикл II: Неделя не открылась на 10-м уровне');
  const fr = s.biomes.find(b => b.state === 'front');
  if (!fr || fr.id !== 'b3' || s.biomes.find(b => b.id === 'b1').state !== 'done' || s.biomes.find(b => b.id === 'b2').state !== 'done') say('цикл II: путь вниз не открыл Библиотеку Улариона');
  if (!s.mem.slots.some(x => x.st === 'open')) say('цикл II: место Памяти не открылось');
  s.route = 'echo'; draw('цикл II · Эхо');
  s.route = 'week'; draw('цикл II · Неделя');
}

/* ---------- 7. режим «Команда»: те же окна рисуются ---------- */
run('режим «Команда»', () => T.setTeam(true));
T.S.ob.queue = [10]; T.S.route = 'shelter'; T.S.overlay = null; draw('окно уровня 10 · Команда', false);
T.S.overlay = { t: 'level' }; draw('лист уровня · Команда', false);
run('режим «Игрок»', () => T.setTeam(false));
T.S.overlay = null; T.S.ob.queue = [];
run('обратно в демо', () => T.OB.switch(false));
if (T.S.ob || T.S.acc.level !== 24 || JSON.stringify(T.NAV_OPEN) !== JSON.stringify({ week: 10 })) say('возврат в демо: аккаунт или ворота не прежние');
done();
