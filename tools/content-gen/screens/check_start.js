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
      дух в уровни, руна обучения, предел, рецепт в Мастерской, забеги и стражи настоящим ядром. Ворота обучения включены: игроку
      доступен только шаг сценария (ADR-0040), и бот проходит их все. Путь — шаги, уровни, найм и итог — совпадает с прогоном сборщика
      (EN_START.path): одно ядро, одни правила. Награда каждого уровня выдана ровно один раз; после последнего шага — окно цикла II.
   7–8. Законы обучения по сценарию и пропуска (ADR-0040):
      — добыча цикла I — по сценарию: каждый этаж выдан строкой таблицы EN_START.loot, и она равна тому, что дали бы ядро и генератор;
      — пропуск с каждого уровня 1–10 даёт один итог, и он равен итогу прохождения; повтор номера ничего не выдаёт; пропуск после
        пропуска и после конца обучения — отказ; после пропуска — окно перехода в цикл II;
      — первый рецепт подсказкой: рецепт целиком в окне уровня 6, пометка Этриона с ним и подсветка ячеек в Мастерской, найденный лист
        в книге, «Попробовать» ведёт к столу с рецептом, стол с рецептом — удача, другой — отказ без расхода;
      — действия вне сценария закрыты: обход экранов и листов на уровнях 1, 6 и 10 и на шагах сундука, Лавки и артефакта — каждое
        действие, кроме шага, не меняет ни запасов, ни кошелька, ни героев, ни отрядов, ни шага, у замка — причина словами игрока; сами
        операции сервера — отказ (Лавка, сундуки, артефакты — тоже);
      — сундук уровня 3, Лавка и первый артефакт — шаги с заданным итогом (EN_START.tut): карточка сундука и его открытие — содержимое
        сценария; витрина обучения — товары сценария по местам и ценам Лавки, срок и обновление её не меняют, купить — только товар шага;
        артефакт — только свой, золото и души на него набраны к шагу. Сверка — со свежей сборкой, не с данными прототипа;
      — артефакт активных биомов (ADR-0054, слова автора 06.10.2026): шаг покупки — до первого забега; до покупки активного биома нет —
        «Спуск» вместо «Начать забег» предлагает купить артефакт, забег не начинается; покупка — операция с номером: золото по цене
        таблицы автора, активных биомов — один; повтор номера ничего не покупает; уровней артефакта в обучении нет.
   7б. Погружения Подземного леса (ADR-0049, слово автора 02.10.2026: биом 2 — «до условных 5 - 10 заходов», «с каждым новым погружением
      показывает новое окно… рассказывает про навыки героя, систему как и что работает»):
      — заходов в лес и к стражу — коридор автора; погружений — столько, сколько уроков; каждое глубже прежнего, хозяйка леса — в последнем;
      — перед каждым погружением встаёт его урок, по порядку, когда шаг сценария — само погружение; урок показывает данные игры: приёмы
        героя из его набора (kits.js, abilities.js), что открыла доблесть, круг стихий ядра, угрозу класса, приёмы хозяйки леса, её раунды
        и совет сказителя — ожидание собрано из данных до мутаций;
      — «Попробовать» урока ведёт в его окно, и окна уроков — новые: ни уровень Странника, ни прежний урок туда не вели;
      — дар погружения выдан один раз и ровно данные свежей сборки, повтор номера ничего не выдаёт, итог забега показывает дар;
        сид добычи погружения — сервера сценария (забег полного пути), добыча — та, что в таблице.
   9. Проверка мутацией: ворота сняты, добыча и итог пропуска испорчены, повтор номера выдаёт заново, у уровня 6 нет подсказки,
      шаги сценария переставлены, сундук и витрина обучения разошлись со сценарием, сценарий пускает другой артефакт, итог пропуска
      без артефакта; урок погружения не встал, повтор дара выдаёт заново, дар не выдан, сид погружения свой, урок без приёмов из данных,
      окно урока — старое; и законы сборщика: коридор заходов, старое окно урока, урок о чужом герое, дар без духа — итог не тот, что у
      полного пути. Законы ловят каждую поломку.
   10. Режим «Команда» и глаза игрока: окна рисуются; подтверждение пропуска — числа итога; «Пропустить обучение» — в окне уровня,
      в Убежище и в настройках.
   11. Арт окна уровня (п. 4 очереди docs/art-queue.md, OB_ART): выгруженное есть на диске и в описи ui-art.json; окна уровней 1, 3, 6, 10
      рисуют раму, медальон, вспышку, фонарь опыта и знак у каждого открытия; замок раздела — знаком; без выгрузки — прежний вид.
   Запуск: node tools/content-gen/screens/check_start.js [--mut — напечатать, что законы нашли у каждой поломки] */
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
  console.log(`Проверено: отрисовок ${cnt.views}, окон уровня и уроков ${cnt.popups}, уроков погружений ${cnt.lessons || 0}, шагов сценария ${cnt.steps}, операций сервера ${cnt.ops}, действий вне сценария ${cnt.acts || 0}; поломок поймано ${cnt.mut || '—'}. Проверка пройдена: новый аккаунт с нуля, ворота разделов и мест, уровень и награда — одной операцией с номером, повтор ничего не выдаёт, окна уровня по одному, сценарий проходится через операции прототипа тем же путём, что прогон ядром; обучение по сценарию — вне шага всё закрыто, добыча из таблицы равна ядру, первый рецепт подсказкой, пропуск с любого уровня — итог прохождения; Подземный лес — ${DV0 ? DV0.list.length : 0} погружений в коридоре ${DV0 ? DV0.runs.join('–') : ''} заходов, перед каждым — свой урок с данными игры и новым окном, дар погружения — один раз.`);
  process.exit(0);
}

/* ---------- 1. данные свежие ---------- */
let TUT0 = {};   // шаги сверх боя по свежей сборке (EN_START.tut): с ними законы сверяют прототип — не с его же данными
let DV0 = null;  // погружения леса по свежей сборке (EN_START.dives, ADR-0049): план, уроки и дары
{
  const B = require(path.join(ROOT, 'tools', 'content-gen', 'start', 'build.js')), R = B.build();
  if (R.err.length) { say('сборка сценария: ' + R.err.join('; ')); done(); }
  TUT0 = JSON.parse(JSON.stringify(R.data.tut || {}));
  DV0 = JSON.parse(JSON.stringify(R.data.dives || null));
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
  ACT, OV, SCREENS, NAV_OPEN, RSI, RS, BAG, EB, HD_SRV, WS_SRV, GD_SRV, SQ_SRV, LV_SRV, render, initialState, startRun, advance, focusRun,
  hdOp, wsOp, gdOp, gdCost, rsGold, rsHas, limitRune, hrTwin, hrMine, setTeam, get team() { return KH.team; }, H, zpOpen: function () { return zpOpen.apply(this, arguments); },
  zpV: () => zpV(), zpGroups: () => zpChestGroups(), zpDef: sp => zpDef(sp), WN_SRV, wnOp: () => wnOp(), shopCost, LV_DATA, mkMin, SH_SRV, get STORE() { return window.EN_STORE; },
  EN_TRAIL: s => window.EN_TRAIL(s), get EN_WANDERER() { return window.EN_WANDERER; },   // активные биомы — слоты по артефакту (ADR-0054)
  renderKit: () => renderKit(), renderMap: () => renderMap(),
  OB: { D: OB_D, R: OB_R, SRV: OB_SRV, sync: obSync, switch: obSwitch, pop: obPopHtml, can: obCanShow, slotLock: obSlotLock, hero: obHero, get mode() { return OB_MODE; },
    SC: OB_SC, gate: obGate, step: () => obStepOf(), tut: () => obTut(), hintOn: () => obHintOn(), TEXT: OB_TEXT, HINT: OB_HINT, VIEW: OB_VIEW_ACT, rid: obRid,
    TU: OB_TU, shopGen: OB_SHOP_GEN, isTutSp: obIsTutChestSp, doStep: () => obDoStep(), ART: OB_ART, openArt: obOpenArt, kit: () => obKitHtml(),
    DV: OB_DV, lesOf: obLesOf, lesHero: obLesHero, lesHeroId: obLesHeroId, bossId: obBossId, goLes: obGoLesson, go: obGo, isLes: obIsLes, fix: obFixOf,
    set gateOff(v) { OB_GATE_OFF = !!v; }, set seedOff(v) { OB_SEED_OFF = !!v; }, get chk() { return OB_CHK; }, set chk(v) { OB_CHK = v; } },
  heroKit: h => heroKit(h), get foes() { return window.EN_BIOME_FOES; }, runById: id => runById(id),
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
const cyWinOf = h => (String(h).match(/<div class="cy-pop[\s\S]*/) || [''])[0];   // окно «Событие нового цикла» (screens/cycle.js)

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


/* ---------- 6. сценарий через операции прототипа ----------
   Мир для канонического игрока (bot.js) — операции прототипа: найм через Призыв, дух в уровни, рецепт на столе, руна обучения, предел,
   забеги и стражи настоящим ядром. Ворота обучения включены: игрок может только то, что велит сценарий (ADR-0040), — значит, бот идёт
   по шагам сценария. o.draw — окна уровней рисуются и закрываются «Позже», как их покажет прототип; o.stopL — остановка, как только взят
   уровень stopL (для пропуска с этого уровня); o.sink — куда писать ошибки мира (проверка мутацией пишет в свой список) */
const PATH = D.path || {};
const STOP = { stop: true };
function mkW(o = {}) {
  const sink = o.sink || say, popSeen = {};
  let msAll = 0, stepsDone = 0;
  const W = {
    st() {
      const s = T.S, L = s.ob.srv.lvl, rn = T.limitRune(1, 1);
      const heroes = s.heroes.map(h => ({ id: (T.hrTwin(h) || { id: h.id }).id, lvl: h.lvl, cap: h.cap, lim: h.lim || 0, valor: h.valor || 0, maxV: h.maxV }));
      const front = (s.biomes.find(b => b.state === 'front') || { id: 'b1' }).id, boss = {};
      for (const [b, g] of Object.entries(s.siege)) if (g && g.killed) boss[b] = 1;
      const TU = T.OB.TU;
      return { lvl: L, cycle: s.acc.cycle, slots: R.slots(L), gold: s.wallet.gold, spirit: s.wallet.spirit, souls: s.wallet.souls, keys: s.wallet.keys, train: s.hd.train,
        runes: T.BAG.qty(rn.id), heroes, front, boss, guard: Object.assign({}, s.ob.guard), recipe: s.bag.known.length,
        craft: L >= R.opensAt('seg', 'craft:work'), stock: L >= R.opensAt('seg', 'craft:stock'), shop: L >= R.opensAt('seg', 'craft:shop'), arts: L >= (D.gates.art || 1),
        chest: s.bag.chests.some(c => T.OB.isTutSp(c)), bought: TU.shop && s.lv && s.lv.gen === T.OB.shopGen && s.sold.includes(TU.shop.i) ? TU.shop.buy : null,
        art: Object.assign({}, s.wn ? s.wn.art : {}), has: (id, n) => T.BAG.has(id, n) };
    },
    ms: () => msAll,
    price: k => T.rsGold(1, k),
    levelCost: n => T.EB.levelCost(n),
    entry: b => T.gdCost(b),
    /* уровни с прошлого раза: окна закрываются «Позже» по одному, как их покажет прототип */
    claim() {
      const s = T.S; T.OB.sync(); cnt.ops++;
      if (o.stopL && s.ob.srv.lvl >= o.stopL) throw STOP;
      if (o.stopK) { const st = T.OB.step(); if (st && st.k === o.stopK) throw STOP; }   // остановка перед шагом сценария этого вида
      if (o.stopD) { const st = T.OB.step(); if (st && st.k === 'run' && st.d === o.stopD) throw STOP; }   // остановка перед погружением леса (ADR-0049)
      const got = s.ob.got.splice(0).map(L => ({ L, ms: msAll }));
      s.route = 'shelter'; s.overlay = null; s.ob.hold = '';
      let guard = 0;
      while (s.ob.queue.length && guard++ < 20) {
        const L = s.ob.queue[0];
        /* урок погружения (ADR-0049): встаёт, когда шаг сценария — само погружение; его окно — урок с данными игры */
        if (T.OB.isLes(L)) {
          const j = +String(L).slice(1), st = T.OB.step();
          if (o.les) o.les.push({ j, step: st ? { k: st.k, d: st.d } : null });
          if (o.draw) { const h = popOf(draw(`урок погружения ${j}`)); cnt.popups++; cnt.lessons = (cnt.lessons || 0) + 1; ladder(`урок погружения ${j}`, h); for (const e of lawLessonHtml(j, h)) sink(e); }
          T.ACT.oblater(String(L)); continue;
        }
        if (o.draw) {
          const h = draw(`окно уровня ${L}`); cnt.popups++;
          ladder(`окно уровня ${L}`, popOf(h));
          if (!new RegExp(`Уровень ${L} ·`).test(h)) sink(`окно уровня ${L} не показано в свой черёд`);
          if (!popSeen[L]) { popSeen[L] = 1; T.S.overlay = { t: 'level' }; draw(`лист уровня на уровне ${s.ob.srv.lvl}`); ladder(`лист уровня на уровне ${s.ob.srv.lvl}`, run('лист уровня', () => T.OV.level())); T.S.overlay = null; }
        }
        T.ACT.oblater(String(L));
      }
      return got;
    },
    hire(id) {
      const s = T.S, h = T.RSI[id]; s.route = 'heroes'; s.seg.heroes = 'hire'; s.seg.hire = 'gold';
      run('найм ' + id, () => T.ACT.gbuy(id));
      if (!s.overlay || s.overlay.act !== 'gbuydo') { sink(`найм ${id}: нет подтверждения с ценой`); return false; }
      run('найм ' + id, () => T.ACT[s.overlay.act](s.overlay.v));
      return T.rsHas(h);
    },
    levelUp(id) { const h = T.OB.hero(id); if (!h) return false; const r = T.HD_SRV.lvl(T.hdOp(), h.id, 1); return !!r.ok; },
    valor(id) { const h = T.OB.hero(id); if (!h) return false; const r = T.HD_SRV.valor(T.hdOp(), h.id); return !!r.ok; },
    limit(id) { const h = T.OB.hero(id); if (!h) return false; const r = T.HD_SRV.limit(T.hdOp(), h.id); return !!r.ok; },
    /* сундук сценария — «Открыть» на его карточке в Запасах */
    open() {
      const s = T.S; s.route = 'craft'; s.seg.craft = 'stock'; s.overlay = null; T.zpV().tab = 'chest';
      const g = T.zpGroups().find(x => T.OB.isTutSp(x.cs)); if (!g) { sink('сундук сценария: его нет в запасах'); return false; }
      T.zpV().sel.chest = g.key; if (o.draw) draw('Запасы · сундук сценария');
      run('сундук сценария', () => T.ACT.zpopen(g.key, { dataset: { op: 'zo' + (T.zpV().op || 1), n: '1' } }));
      s.overlay = null;
      return !s.bag.chests.some(c => T.OB.isTutSp(c));
    },
    /* Лавка — лист товара и «Купить» с номером операции и витрины */
    buy(id) {
      const s = T.S, i = s.shop.findIndex(g => g[0] === id && g[2] === 'gold'); if (i < 0) { sink(`Лавка: товара ${id} нет на витрине`); return false; }
      s.route = 'craft'; s.seg.craft = 'shop'; s.overlay = null; if (o.draw) draw('Лавка обучения');
      run('Лавка', () => T.ACT.buy(String(i)));
      if (!s.overlay || s.overlay.act !== 'buydo') { sink('Лавка: нет листа товара с покупкой'); return false; }
      run('Лавка', () => T.ACT.buydo(s.overlay.v)); s.overlay = null;
      return s.sold.includes(i);
    },
    /* артефакт активных биомов — главная кнопка «Спуска», пока активного биома нет: покупка операцией с номером (ADR-0054) */
    trail(id) {
      const s = T.S; s.route = 'descent'; s.overlay = null;
      if (o.draw) { const h = draw('Спуск · активного биома нет'); if (!/data-a="wnbuy" data-v="[^"]*"/.test(h)) sink('«Спуск» без активного биома: нет покупки артефакта активных биомов'); }
      run('артефакт активных биомов', () => T.ACT.wnbuy(`${id}:${T.wnOp()}`));
      s.overlay = null;
      return s.wn.art[id] != null;
    },
    /* артефакт — «Купить» и «Улучшить» в Реликварии, каждое — операцией с номером */
    art(id, lv) {
      const s = T.S; s.route = 'profile'; s.seg.profile = 'arts'; s.overlay = null; if (o.draw) draw('Реликварий · первый артефакт');
      run('артефакт', () => T.ACT.wnbuy(`${id}:${T.wnOp()}`));
      for (let k = 0; k < lv; k++) run('артефакт', () => T.ACT.wnup(`${id}:${T.wnOp()}`));
      s.overlay = null;
      return s.wn.art[id] != null && s.wn.art[id] >= lv;
    },
    craft(cells) {
      T.S.route = 'craft'; T.S.seg.craft = 'work'; if (o.draw) draw('Мастерская перед первым рецептом');
      const r = T.WS_SRV.attempt(T.wsOp(), cells.map(([id, q], i) => ({ id, q, pos: i })), true);
      return !!(r.res && r.res.kind === 'made');
    },
    run(b) {
      const s = T.S; s.selBiome = b; s.prepSquad = 's1'; s.route = 'descent';
      const st0 = T.OB.step(), dj = st0 && st0.k === 'run' ? st0.d || 0 : 0;   // погружение леса (ADR-0049): урок перед ним уже был?
      if (o.dives && dj) o.dives.push({ d: dj, les: (o.les || []).some(x => x.j === dj) });
      run('забег ' + b, () => T.startRun('s1', b));
      const Rr = s.runs[s.runs.length - 1]; if (!Rr || Rr.guard || Rr.over) { sink(`забег ${b} не начался`); return { wall: 0, win: false, ms: 0 }; }
      s.focus = Rr.id; s.route = 'descent';
      if (o.draw && stepsDone % 9 === 0) { s.route = 'battle'; const h = draw(`бой · шаг ${stepsDone + 1}`); if (/class="ob-pop"/.test(h)) sink('окно уровня поверх идущего боя'); s.route = 'descent'; }
      let n = 0; while (!Rr.over && n++ < 100000) run('ход', () => T.advance(Rr, 60000));   // бой идёт свёрнутым: показ — частицы холста, их в песочнице нет
      s.route = 'descent'; msAll += Rr.runMs; stepsDone++;
      const E = Rr.end || {}; return { wall: E.kind === 'wall' ? E.floor : Rr.floor, win: E.kind === 'boss', ms: Rr.runMs };
    },
    guard(b) {
      const s = T.S; s.selBiome = b; s.prepSquad = 's1'; s.route = 'descent'; s.overlay = null;
      run('страж ' + b, () => T.ACT.guard(T.gdOp()));
      const Rr = s.runs[s.runs.length - 1]; if (!Rr || !Rr.guard || Rr.over) { sink(`страж ${b}: вход не случился${s.overlay ? ' — ' + s.overlay.t : ''}`); return { win: false, ms: 0 }; }
      s.route = 'descent';   // бой свёрнут
      let n = 0; while (!Rr.over && n++ < 100000) run('ход', () => T.advance(Rr, 60000));
      s.route = 'descent'; msAll += Rr.runMs; stepsDone++;
      return { win: (Rr.end || {}).kind === 'guardWin', ms: Rr.runMs };
    },
  };
  return W;
}
/* новый аккаунт и сценарий до уровня stopL (или до конца): игрок останавливается, как только уровень взят */
function playTo(stopL, sink) {
  T.OB.switch(true);
  try { const P = play(mkW({ stopL, sink }), D); return { P, stopped: false }; }
  catch (e) { if (e === STOP) return { stopped: true }; (sink || say)(`сценарий до уровня ${stopL}: исключение — ${e.message}`); return { stopped: false, err: true }; }
}

/* снимок того, что выдаёт обучение: аккаунт, отряд, кошелёк, запасы, рецепты, сундуки, осколки, руна обучения, бестиарий, путь вниз, ворота,
   место Памяти, шаг сценария. Вид экрана, номера операций, журналы и «что держал в руках» мастерской (его пишет и просмотр книги) — не в снимке */
function fp(s) {
  const sorted = o => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  const rid = h => (T.hrTwin(h) || { id: h.id }).id;
  return JSON.stringify({
    acc: [s.acc.level, s.acc.xp, s.acc.next, s.acc.cycle], srv: [s.ob.srv.lvl, s.ob.srv.xp, sorted(s.ob.srv.facts)],
    wallet: sorted(s.wallet), heroes: s.heroes.map(h => [rid(h), h.id, h.lvl, h.lim || 0, h.valor || 0, h.cap, h.keep == null ? null : h.keep]),
    owned: Object.keys(s.rs.owned).sort(), shards: sorted(s.rs.shards), squads: s.squads.map(q => q.m),
    items: sorted(s.bag.items), known: s.bag.known.slice().sort(), chests: s.bag.chests.map(c => [c.id, c.box, c.r, c.cyc, c.src]), seq: s.bag.seq,
    part: Object.keys(s.ws.part || {}).sort(), train: s.hd.train,
    bestiary: (s.known || []).slice().sort(), siege: Object.keys(s.siege).filter(b => s.siege[b] && s.siege[b].killed).sort(),
    best: sorted(s.ob.best), guard: sorted(s.ob.guard), lastRun: s.lastRun, runNo: s.runNo, biomes: s.biomes.map(b => [b.id, b.state, b.name]),
    k: s.ob.k, mem: s.mem.slots.map(x => x.st), nav: JSON.parse(JSON.stringify(T.NAV_OPEN)), art: s.wn ? Object.entries(s.wn.art).sort() : [],   // и купленный без уровня: артефакт активных биомов
    shop: s.lv ? [s.lv.buys || 0, (s.sold || []).length] : [], live: s.runs.filter(r => !r.over).length,
  });
}

run('свежий лист для сценария', () => T.OB.switch(true));
T.OB.chk = [];   // что дали бы ядро и генератор на каждом этаже обучения — для закона добычи
const LES_MAIN = [], DIVES_MAIN = [];   // уроки и погружения прохождения (ADR-0049)
const P = run('сценарий', () => play(mkW({ draw: true, les: LES_MAIN, dives: DIVES_MAIN }), D)) || { log: [], steps: [], done: false };
const CHK = T.OB.chk || []; T.OB.chk = null;
cnt.steps = P.steps.length;
if (!P.done) say(`сценарий не дошёл до цикла II: уровень ${T.S.ob.srv.lvl}, шагов ${P.steps.length}`);
/* путь — тот же, что у прогона сборщика */
const steps = P.steps.map(s => s.kind === 'run' ? ['run', s.b, s.wall, s.win ? 1 : 0] : ['guard', s.b, s.win ? 1 : 0]);
const stepIdx = x => { let i = 0; for (const s of P.log) { if (s === x) return i; if (s.kind === 'run' || s.kind === 'guard') i++; } return i; };
const lv = P.log.filter(x => x.kind === 'level').map(x => [x.L, stepIdx(x)]), hires = P.log.filter(x => x.kind === 'hire').map(x => [x.id, stepIdx(x)]);
const diff = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return i; return -1; };
const SC = T.OB.SC, FP_END = fp(T.S);
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
  /* сундуки уровней — в запасах, кроме сундука сценария: его открыл шаг обучения (EN_START.tut.chest) */
  const chests = s.bag.chests.filter(c => /Уровень Странника/.test(c.src || '')).length, want = D.levels.filter(l => l.reward.chest).length - (D.tut && D.tut.chest ? 1 : 0);
  if (chests !== want) say(`сундуков уровня в запасах ${chests}, ждали ${want}`);
  /* шаги сверх боя сделаны: Лавка — покупка сценария, первый артефакт — на своём уровне */
  if (D.tut && D.tut.shop && !(s.sold.includes(D.tut.shop.i) && s.lv.buys === 1)) say('прохождение: покупки сценария в Лавке нет или она не одна');
  const artN = (D.tut && D.tut.art ? 1 : 0) + (D.tut && D.tut.trail ? 1 : 0);
  if (D.tut && D.tut.art && (s.wn.art[D.tut.art.id] !== D.tut.art.lv || Object.keys(s.wn.art).length !== artN)) say(`прохождение: артефакты ${JSON.stringify(s.wn.art)} — ждали «${D.tut.art.id}» на ${D.tut.art.lv}-м`);
  /* артефакт активных биомов: куплен, уровней нет — активный биом в обучении один и единственный (ADR-0054, п. 15) */
  if (D.tut && D.tut.trail && (s.wn.art[D.tut.trail.id] !== 0 || T.EN_TRAIL(s).slots !== D.tut.trail.slots)) say(`прохождение: артефакт активных биомов ${JSON.stringify(s.wn.art)}, активных биомов ${T.EN_TRAIL(s).slots} — ждали «${D.tut.trail.id}» без уровней и ${D.tut.trail.slots}`);
  const sh = D.levels.flatMap(l => l.reward.shards || []); for (const [id, n] of sh) if ((s.rs.shards[id] || 0) !== n) say(`осколки ${id}: ${s.rs.shards[id] || 0}, ждали ${n}`);
  /* цикл II: Неделя открыта, Мастерская и лес пройдены, рубеж — Библиотека Улариона, место Памяти ждёт */
  if (T.NAV_OPEN.week > s.ob.srv.lvl) say('цикл II: Неделя не открылась на 10-м уровне');
  const fr = s.biomes.find(b => b.state === 'front');
  if (!fr || fr.id !== 'b3' || s.biomes.find(b => b.id === 'b1').state !== 'done' || s.biomes.find(b => b.id === 'b2').state !== 'done') say('цикл II: путь вниз не открыл Библиотеку Улариона');
  if (!s.mem.slots.some(x => x.st === 'open')) say('цикл II: место Памяти не открылось');
  /* сценарий пройден шаг за шагом: все шаги сделаны, обучение кончилось, окно перехода в цикл II ждёт показа */
  if (s.ob.k !== SC.length) say(`сценарий: сделано шагов ${s.ob.k} из ${SC.length}`);
  if (T.OB.tut()) say('обучение не кончилось после последнего шага');
  /* переход I → II — той же операцией цикла, что II → VI (CY_SRV.advance, ADR-0041): окно «Событие нового цикла» для цикла II в очереди */
  if (!s.cy || s.cy.srv.cycle !== 2 || !s.cy.queue.includes(2)) say('после последнего шага нет перехода в цикл II операцией цикла и его окна');
  s.route = 'shelter'; s.overlay = null; s.ob.queue = [];
  const cy = cyWinOf(draw('окно «Событие нового цикла» · цикл II'));
  if (!/class="cy-pop pop"/.test(cy) || !cy.includes('Рейтинг цикла II')) say('окно цикла II: нет окна «Событие нового цикла» или «Рейтинг цикла II»');
  ladder('окно цикла II', cy);
  s.route = 'echo'; draw('цикл II · Эхо');
  s.route = 'week'; draw('цикл II · Неделя');
  s.route = 'shelter';
  /* погружения леса (ADR-0049): число заходов, урок перед каждым, глубже прежнего, дары, окна уроков */
  for (const e of lawDives(LES_MAIN, DIVES_MAIN, P.steps, 'прохождение')) say(e);
  for (const e of lawGift('прохождение')) say(e);
  for (const e of lawLessonGo('прохождение')) say(e);
  if (cnt.lessons !== (DV0 ? DV0.list.length : 0)) say(`уроков погружений показано ${cnt.lessons || 0}, в плане ${DV0 ? DV0.list.length : 0}`);
  s.route = 'shelter'; s.overlay = null;
}

/* ---------- 7. законы обучения по сценарию и пропуска (ADR-0040). Каждый — функция: проверка мутацией зовёт её с поломкой ---------- */
const tagIds = h => { const a = (h.match(/\sdata-a="([^"]*)"/) || [])[1], v = (h.match(/\sdata-v="([^"]*)"/) || [])[1]; return a ? [a, v == null ? '' : v.replace(/&quot;/g, '"').replace(/&amp;/g, '&')] : null; };
/* добыча обучения — по сценарию: что выдал прототип на каждом этаже, — строка таблицы EN_START.loot, и она же — что дали бы ядро
   и генератор канонического прогона. chk — записи прохождения (OB_CHK): этаж, ядро, предметы генератора */
function lawLoot(chk, where) {
  const out = [], L = T.OB.D.loot, seen = {};
  for (const c of chk) {
    const row = (L[c.no - 1] || []).find(x => x[0] === c.floor); seen[c.no + ':' + c.floor] = 1;
    if (!row) { out.push(`${where}: забег ${c.no}, этаж ${c.floor} — в таблице добычи нет строки`); continue; }
    const core = [c.core.gold, c.core.spirit, c.core.souls], items = Object.entries(c.items || {}).filter(([, n]) => n > 0).sort(), tab = row[4].slice().sort();
    if (JSON.stringify(core) !== JSON.stringify(row.slice(1, 4)) || JSON.stringify(items) !== JSON.stringify(tab))
      out.push(`${where}: забег ${c.no}, этаж ${c.floor} — таблица ${JSON.stringify(row.slice(1))}, ядро и генератор ${JSON.stringify(core.concat([items]))}`);
  }
  return out;
}
/* пропуск с уровня L: аккаунт с нуля, сценарий до уровня L, пропуск одной операцией — итог тот же, что у прохождения; повтор номера —
   прежний ответ и ничего не меняет; новый номер после пропуска — отказ; окно перехода в цикл II встаёт */
function lawSkip(L, where, sink) {
  const out = [], st = playTo(L, sink);
  if (!st.stopped) { out.push(`${where}: сценарий не дошёл до уровня ${L}`); return out; }
  const s = T.S, op = 'ob' + s.ob.srv.seq;
  if (!T.OB.tut()) out.push(`${where}: на уровне ${L} обучение уже кончилось — пропускать нечего`);
  const r = T.OB.SRV.skip(op); cnt.ops++;
  if (!r.res || r.again) { out.push(`${where}: пропуск не выдан (${JSON.stringify(r)})`); return out; }
  const f1 = fp(s);
  /* что обещало подтверждение — то и в запасах после перехода в цикл II: сундуки и кошелёк итога, без чужих наград */
  const E = T.OB.D.skip, w = s.wallet;
  if (s.bag.chests.length !== E.chests.length || Object.keys(E.wallet).some(k => (w[k] || 0) !== E.wallet[k]))
    out.push(`${where}: после пропуска не то, что обещало подтверждение: сундуков ${s.bag.chests.length} из ${E.chests.length}, кошелёк ${JSON.stringify(w)}`);
  if (f1 !== FP_END) { const a = JSON.parse(f1), b = JSON.parse(FP_END), k = Object.keys(b).filter(x => JSON.stringify(a[x]) !== JSON.stringify(b[x])); out.push(`${where}: итог пропуска не равен итогу прохождения: ${k.map(x => `${x}: ${JSON.stringify(a[x]).slice(0, 120)} против ${JSON.stringify(b[x]).slice(0, 120)}`).join('; ')}`); }
  const r2 = T.OB.SRV.skip(op); cnt.ops++;
  if (!r2.again || fp(s) !== f1) out.push(`${where}: повтор номера пропуска ${r2.again ? 'изменил состояние' : 'выдал заново'}`);
  const r3 = T.OB.SRV.skip('ob' + s.ob.srv.seq); cnt.ops++;
  if (!r3.refuse || fp(s) !== f1) out.push(`${where}: пропуск после пропуска не отказан`);
  s.route = 'shelter'; s.overlay = null;
  if (!s.cy || s.cy.srv.cycle !== 2 || !/class="cy-pop pop"/.test(cyWinOf(draw(`${where} · окно цикла II`)))) out.push(`${where}: после пропуска нет перехода в цикл II и окна «Событие нового цикла»`);
  return out;
}
/* первый рецепт — подсказкой: в окне уровня подсказки — рецепт целиком (состав, количества, итог); в Мастерской — пометка Этриона с ним
   и подсвеченные ячейки, «Выложить на стол» кладёт рецепт; в книге — найденный лист; «Попробовать» ведёт к столу с рецептом; не сделать
   его нельзя: стол с рецептом — удача, другой стол — отказ без расхода */
function lawHint(where, stateOnly) {
  const out = [], H = T.OB.HINT, s = T.S, X = T.OB.TEXT;
  if (!H) return [`${where}: в данных нет подсказки первого рецепта (EN_START.hint)`];
  const names = H.in.map(([id]) => T.BAG.item(id).n), outN = T.BAG.item(H.out[0]).n, isRc = h => /class="ob-rc[ "]/.test(h) && names.every(n => h.includes(n)) && H.in.every(([, q]) => h.includes('×' + q)) && h.includes(outN);
  s.ob.queue = [H.L]; s.route = 'shelter'; s.overlay = null; s.ob.hold = '';
  const w = popOf(draw(`${where} · окно уровня ${H.L}`)); cnt.popups++;
  if (!isRc(w)) out.push(`${where}: в окне уровня ${H.L} нет рецепта целиком — ${names.join(', ')} → ${outN}`);
  ladder(`${where} · окно уровня ${H.L}`, w);
  if (stateOnly) { s.ob.queue = []; return out; }
  /* Мастерская: пустой стол — пометка с рецептом, ячейки светятся, «Выложить на стол» */
  s.ob.queue = []; s.route = 'craft'; s.seg.craft = 'work'; s.ws.view = 'table'; s.ws.cells = s.ws.cells.map(() => null);
  const m = draw(`${where} · Мастерская, стол пуст`);
  if (!/ob-hint/.test(m) || !isRc(m)) out.push(`${where}: в Мастерской нет пометки Этриона с первым рецептом`);
  if ((m.match(/\bob-hl\b/g) || []).length < H.in.length) out.push(`${where}: на пустом столе не подсвечены ячейки рецепта`);
  if (!/data-a="obhint"/.test(m)) out.push(`${where}: у пометки нет «${X.hintPut}»`);
  run('выложить рецепт', () => T.ACT.obhint());
  const cells = s.ws.cells.filter(Boolean).map(c => [c.id, c.q]).sort(), want = H.in.map(x => x.slice()).sort();
  if (JSON.stringify(cells) !== JSON.stringify(want)) out.push(`${where}: «${X.hintPut}» положил ${JSON.stringify(cells)}, а не рецепт`);
  const m2 = draw(`${where} · Мастерская, рецепт на столе`);
  if (!m2.includes(X.hintOn)) out.push(`${where}: стол с рецептом не зовёт «Попробовать»`);
  /* книга: найденный лист */
  const bk = T.WS_SRV.book(); if (!bk.some(x => x.id === H.r && x.whole)) out.push(`${where}: в книге рецептов нет найденного листа «${H.n}»`);
  s.ws.view = 'book'; const b = draw(`${where} · книга рецептов`); s.ws.view = 'table';
  if (!new RegExp(`class="ws-rc rb-e rb-w"[^>]*data-rid="${H.r}"`).test(b)) out.push(`${where}: лист «${H.n}» в книге — не целый`);
  /* «Попробовать» окна уровня — к столу с рецептом */
  s.ws.cells = s.ws.cells.map(() => null); s.route = 'shelter'; s.ob.queue = [H.L];
  run('«Попробовать» уровня подсказки', () => T.ACT.obtry(String(H.L)));
  const c2 = s.ws.cells.filter(Boolean).map(c => [c.id, c.q]).sort();
  if (s.route !== 'craft' || s.seg.craft !== 'work' || JSON.stringify(c2) !== JSON.stringify(want)) out.push(`${where}: «Попробовать» уровня ${H.L} не привело к столу с рецептом`);
  /* другой стол — отказ без расхода; рецепт на столе — удача */
  const f0 = fp(s), bad = T.WS_SRV.attempt(T.wsOp(), [{ id: H.in[0][0], q: H.in[0][1], pos: 0 }], true);
  if (!bad.refuse || fp(s) !== f0) out.push(`${where}: стол без всего рецепта не отказан или что-то сжёг`);
  const okA = T.WS_SRV.attempt(T.wsOp(), H.in.map(([id, q], i) => ({ id, q, pos: i })), true);
  if (!okA.res || okA.res.kind !== 'made') out.push(`${where}: рецепт подсказки на столе не сложился`);
  return out;
}
/* действия вне сценария закрыты: на экранах и листах обучения каждое действие, кроме шага сценария, ничего не меняет — ни запасов,
   ни кошелька, ни героев, ни отрядов, ни шага; у закрытого — причина «откроется на N-м уровне» или «сначала — шаг». Плюс сами операции
   сервера в обход экрана — отказ */
function lawClosed(where) {
  const out = [], s = T.S, st = T.OB.step(); if (!st) return [`${where}: обучение не идёт`];
  const h0 = s.heroes[0], views = [
    ...Object.keys(T.SCREENS).filter(r => r !== 'battle').map(r => ['экран ' + r, () => { s.route = r; s.overlay = null; }]),
    ['Призыв за золото', () => { s.route = 'heroes'; s.seg.heroes = 'hire'; s.seg.hire = 'gold'; s.overlay = null; }],
    ['книга «до покупки»', () => { s.route = 'heroes'; s.seg.heroes = 'hire'; s.seg.hire = 'gold'; s.rs.gsel = (T.RS.heroes.find(x => x.src === 'gold' && x.c === 1 && !T.rsHas(x) && x.id !== st.id) || {}).id || ''; s.overlay = null; }],
    ['Запасы · сундуки', () => { s.route = 'craft'; s.seg.craft = 'stock'; s.overlay = null; }],
    ['Лавка', () => { s.route = 'craft'; s.seg.craft = 'shop'; s.overlay = null; }],
    ['лист уровня', () => { s.route = 'shelter'; s.overlay = { t: 'level' }; }],
    ['настройки', () => { s.route = 'shelter'; s.overlay = { t: 'settings' }; }],
  ].concat(h0 ? [['книга героя · развитие', () => { s.route = 'heroes'; s.seg.heroes = 'coll'; s.hview = 'mine'; s.hgrid = 'own'; s.selHero = h0.id; s.seg.hero = 'power'; s.overlay = null; }],
    ['отряды', () => { s.route = 'heroes'; s.seg.heroes = 'squads'; s.overlay = null; }]] : []);
  const pairs = new Map(), per = {};
  for (const [n, set] of views) {
    run(`${where} · ${n}`, set); const h = draw(`${where} · ${n}`);
    for (const m of h.matchAll(/<(?:button|a|div|span|li|input|select|label)\b[^>]*\sdata-a="[^"]*"[^>]*>/g)) {
      const p = tagIds(m[0]); if (!p || !T.ACT[p[0]]) continue;
      const key = p.join('\u0000'); if (pairs.has(key) || (per[p[0]] = (per[p[0]] || 0) + 1) > 4) continue;
      pairs.set(key, { a: p[0], v: p[1], view: n, set });
    }
  }
  let tried = 0, locked = 0;
  for (const x of pairs.values()) {
    if (stepAct(x.a, x.v, st) || x.a === 'rsteam') continue;   // шаг сценария и путь к нему делает сценарий; «Игрок / Команда» — переключатель прототипа
    const g = T.OB.gate(x.a, x.v);
    if (g && g.lock) { locked++; if (!/^(Откроется на \d+-м уровне Странника|Сначала — шаг обучения: .+|Положите на стол|Лавка Энериума откроется в цикле II)/.test(g.why || '')) out.push(`${where}: «${x.a}» закрыто без причины словами игрока: ${g.why}`); }
    run(`${where} · ${x.view}`, x.set);
    const f0 = fp(T.S), k0 = T.S.ob.k, S0 = T.S, seg = JSON.stringify(T.S.seg), route = T.S.route, ov = T.S.overlay;
    const el = { value: x.v, checked: false, dataset: { v: x.v, a: x.a }, getAttribute: k => (k === 'data-v' ? x.v : null), closest: () => null, classList: { add() {}, remove() {}, contains: () => false }, matches: () => false };
    try { T.ACT[x.a](x.v, el, { preventDefault() {}, target: el }); } catch (_) { /* обработчики вида без DOM песочницы */ }
    tried++;
    if (T.S !== S0) { out.push(`${where}: «${x.a}:${x.v}» сменило аккаунт`); T.S = S0; }
    if (fp(T.S) !== f0 || T.S.ob.k !== k0) {
      const a = JSON.parse(fp(T.S)), b = JSON.parse(f0), k = Object.keys(b).filter(y => JSON.stringify(a[y]) !== JSON.stringify(b[y]));
      out.push(`${where}: действие вне сценария «${x.a}:${x.v}» (${x.view}) изменило ${k.join(', ') || 'шаг'}`);
    }
    T.S.seg = JSON.parse(seg); T.S.route = route; T.S.overlay = ov; T.S.toast = null; if (T.team) T.setTeam(false);
    if (T.S.runs.some(r => !r.over)) T.S.runs = T.S.runs.filter(r => r.over);
  }
  /* сами операции сервера — в обход экрана */
  const f0 = fp(s), heroes = s.heroes.slice();
  for (const h of heroes) {
    const rid = T.OB.rid(h), to = st.k === 'lvl' ? st.to.find(t => t[0] === rid) : null;
    if (!to && !T.HD_SRV.lvl(T.hdOp(), h.id, 1).refuse) out.push(`${where}: дух в уровни герою вне шага — не отказ`);
    if (!(st.k === 'valor' && st.id === rid) && !T.HD_SRV.valor(T.hdOp(), h.id).refuse) out.push(`${where}: доблесть вне шага — не отказ`);
    if (!(st.k === 'limit' && st.id === rid) && !T.HD_SRV.limit(T.hdOp(), h.id).refuse) out.push(`${where}: предел вне шага — не отказ`);
  }
  if (st.k !== 'craft' && !T.WS_SRV.attempt(T.wsOp(), [{ id: 'fang', q: 1, pos: 0 }], true).refuse) out.push(`${where}: попытка на столе вне шага — не отказ`);
  if (!T.WS_SRV.make(T.wsOp(), T.OB.HINT ? T.OB.HINT.r : 'r_p_fang', 1, true).refuse) out.push(`${where}: автодокрафт в обучении — не отказ`);
  for (const b of ['b1', 'b2']) if (!(st.k === 'guard' && st.b === b) && !T.GD_SRV.enter(T.gdOp(), b, 's1').refuse) out.push(`${where}: вход к стражу ${b} вне шага — не отказ`);
  const no0 = s.runNo; for (const b of ['b1', 'b2']) if (!(st.k === 'run' && st.b === b)) run('забег вне шага', () => T.startRun('s1', b));
  run('демо-прыжок', () => T.startRun('s1', 'b1', 15));
  if (s.runNo !== no0) out.push(`${where}: забег вне шага начался`);
  /* Лавка: товар не своего шага и обновление витрины; сундуки, кроме сундука сценария на его шаге; артефакты, кроме своего на его шаге */
  const gi = s.shop.findIndex(g => !(st.k === 'shop' && g[0] === st.id));
  if (gi >= 0 && !T.LV_SRV.buy('lvx' + no0, gi, s.lv ? s.lv.gen : 0).refuse) out.push(`${where}: покупка «${s.shop[gi][0]}» в Лавке вне шага — не отказ`);
  if (!T.LV_SRV.refresh('lvr' + no0, 'free').refuse) out.push(`${where}: обновление витрины в обучении — не отказ`);
  for (const g of T.zpGroups()) if (!(st.k === 'chest' && T.OB.isTutSp(g.cs))) run('сундук', () => T.zpOpen(g.key, 'zox' + no0, 1));
  for (const id of ['a1', 'a2', 'a4', 'a5', 'a7', 'a18', 'a19']) {
    if ((st.k === 'art' || st.k === 'trail') && st.id === id) continue;
    if (!T.WN_SRV.buy('wnx' + id, id).refuse || !T.WN_SRV.up('wny' + id, id).refuse) out.push(`${where}: артефакт «${id}» вне шага — не отказ`);
  }
  /* Лавка Энериума — во 2 цикле (слово автора 01.10.2026): покупка и реклама за Энериум в обучении — отказ */
  const sid = T.STORE && T.STORE.chain && T.STORE.chain.steps[0] ? T.STORE.chain.steps[0].id : '';
  if (!T.SH_SRV.buy('shx' + no0, sid).refuse || !T.SH_SRV.ad('sha' + no0).refuse) out.push(`${where}: Лавка Энериума в обучении — не отказ`);
  if (fp(s) !== f0) out.push(`${where}: операция сервера вне шага изменила состояние`);
  if (!tried || !locked) out.push(`${where}: проверено действий ${tried}, закрытых ${locked} — обход ничего не нашёл`);
  cnt.acts = (cnt.acts || 0) + tried;
  return out;
}
/* действие шага сценария — по самому сценарию, а не по воротам прототипа (их и проверяем): найм своего героя, дух в уровни героям шага,
   доблесть и предел своему герою, стол Мастерской на шаге рецепта, забег и страж на своём шаге; действия самого обучения (ob…) */
function stepAct(a, v, st) {
  if (/^ob/.test(a)) return true;
  const hid = () => { const s = String(v || ''), p = s.includes(':') ? s.split(':')[1] : s; return T.OB.rid(T.H(p)); };
  switch (st.k) {
    case 'hire': return (a === 'gbuy' || a === 'gbuydo') && v === st.id;
    case 'lvl': return a === 'lvlup' && st.to.some(t => t[0] === hid());
    case 'valor': case 'limit': return a.startsWith(st.k) && a !== 'valorcraft' && hid() === st.id;
    case 'craft': return ['wstry', 'wstrydo', 'wsmake'].includes(a);
    case 'chest': return a === 'zpopen' && T.zpGroups().some(g => g.key === v && T.OB.isTutSp(g.cs));
    case 'shop': { const g = T.S.shop[+String(v || '').split(':')[0]]; return a === 'buydo' && !!g && g[0] === st.id; }
    case 'art': return (a === 'wnbuy' || a === 'wnup') && String(v || '').split(':')[0] === st.id;
    case 'trail': return a === 'wnbuy' && String(v || '').split(':')[0] === st.id;
    case 'run': return a === 'start' || a === 'again' || (a === 'sheet' && v === 'prep');
    case 'guard': return (a === 'guard' || a === 'guardgo') && v !== 'demo';
  }
  return false;
}
/* замок говорит, на каком уровне откроется: будущий найм — на уровне своего шага сценария */
function lawLockLevel(where) {
  const out = [], st = T.OB.step(), lvl = T.S.ob.srv.lvl;
  for (const x of SC.slice(T.S.ob.k + 1)) {
    if (x.k !== 'hire' || x.L <= lvl) continue;
    const g = T.OB.gate('gbuy', x.id);
    if (!g || !g.lock || !g.why.includes(`${x.L}-м уровне`)) out.push(`${where}: найм ${x.id} — замок «${g ? g.why : 'нет'}», ждали «откроется на ${x.L}-м уровне»`);
  }
  if (st && st.k === 'hire' && T.OB.gate('gbuy', st.id)) out.push(`${where}: найм героя шага закрыт`);
  return out;
}

/* новый аккаунт и сценарий до шага вида k: игрок останавливается перед ним */
function playToK(k, sink) {
  T.OB.switch(true);
  try { play(mkW({ stopK: k, sink }), D); return false; }
  catch (e) { if (e === STOP) return true; (sink || say)(`сценарий до шага «${k}»: исключение — ${e.message}`); return false; }
}
const sortObj = o => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const delta = (a, b) => { const out = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (a[k] || 0) - (b[k] || 0); if (d) out[k] = d; } return out; };
/* сундук сценария (ADR-0040): на его шаге карточка показывает содержимое сценария — валюту и число предметов, в составе — его предметы;
   «Открыть» выдаёт ровно его, сундук уходит из запасов, повтор номера ничего не выдаёт, шаг сценария сменяется. Сверка — со свежей
   сборкой (TUT0), а не с данными прототипа */
function lawChest(where) {
  const out = [], s = T.S, C = TUT0.chest, st = T.OB.step(); if (!C) return out;
  if (!st || st.k !== 'chest') return [`${where}: шаг сценария — не сундук (${st ? st.k : 'обучение кончилось'})`];
  const g = T.zpGroups().find(x => T.OB.isTutSp(x.cs)); if (!g) return [`${where}: сундука сценария нет в запасах`];
  const V = T.zpV(); s.route = 'craft'; s.seg.craft = 'stock'; s.overlay = null; V.tab = 'chest'; V.sel.chest = g.key; V.last = null;
  const h = draw(`${where} · карточка сундука`), def = T.zpDef(g.cs) || { cur: [], n: 0, byR: {} };
  if (JSON.stringify(def.cur) !== JSON.stringify(C.cur) || def.n !== C.items.length) out.push(`${where}: карточка сундука — ${JSON.stringify(def.cur)} и ${def.n} предм., сценарий — ${JSON.stringify(C.cur)} и ${C.items.length}`);
  const ent = Object.values(def.byR).flatMap(ls => ls.flatMap(l => l.entries.map(e => [e.id, e.q])));
  if (JSON.stringify(ent.sort()) !== JSON.stringify(C.items.map(x => x.slice()).sort())) out.push(`${where}: в составе сундука ${JSON.stringify(ent)}, сценарий — ${JSON.stringify(C.items)}`);
  if (!/data-a="zpopen"/.test(h)) out.push(`${where}: у сундука сценария нет «Открыть»`);
  const w0 = Object.assign({}, s.wallet), i0 = Object.assign({}, s.bag.items), op = 'zo' + (V.op || 1);
  run('сундук сценария', () => T.ACT.zpopen(g.key, { dataset: { op, n: '1' } }));
  const dw = delta(s.wallet, w0), di = delta(s.bag.items, i0);
  if (JSON.stringify(sortObj(dw)) !== JSON.stringify(sortObj(Object.fromEntries(C.cur))) || JSON.stringify(sortObj(di)) !== JSON.stringify(sortObj(Object.fromEntries(C.items))))
    out.push(`${where}: сундук выдал ${JSON.stringify(dw)} и ${JSON.stringify(di)}, сценарий — ${JSON.stringify(C.cur)} и ${JSON.stringify(C.items)}`);
  if (s.bag.chests.some(c => T.OB.isTutSp(c))) out.push(`${where}: сундук сценария не ушёл из запасов`);
  const f1 = fp(s); run('сундук · повтор номера', () => T.zpOpen(g.key, op, 1)); if (fp(s) !== f1) out.push(`${where}: повтор номера открытия что-то выдал`);
  s.overlay = null; T.OB.sync(); const st2 = T.OB.step(); if (st2 && st2.k === 'chest') out.push(`${where}: после открытия шаг сценария не сменился`);
  return out;
}
/* Лавка обучения (ADR-0040): витрина — товары сценария, места и валюты — как у Лавки, цена — правило Лавки; срок новых товаров витрину
   не меняет, обновление — отказ; купить можно только товар шага — лист товара и «Купить»: расход по цене, товар в запасах; повтор номера
   ничего не делает; шаг сменяется */
function lawShop(where) {
  const out = [], s = T.S, P = TUT0.shop, st = T.OB.step(); if (!P) return out;
  if (!st || st.k !== 'shop') return [`${where}: шаг сценария — не Лавка (${st ? st.k : 'обучение кончилось'})`];
  const want = P.goods.map(g => g.slice(0, 3));
  if (JSON.stringify(s.shop.map(g => g.slice(0, 3))) !== JSON.stringify(want)) out.push(`${where}: витрина ${JSON.stringify(s.shop.map(g => g[0]))} — не витрина обучения ${JSON.stringify(want.map(g => g[0]))}`);
  for (const sl of T.LV_DATA.slots) { const n = s.shop.filter(g => g[2] === sl.cur).length; if (n !== sl.n) out.push(`${where}: товаров за ${sl.cur} — ${n}, у Лавки ${sl.n}`); }
  for (const g of s.shop) { const p = T.shopCost(g)[1]; if (!(p > 0)) out.push(`${where}: товар ${g[0]} без цены`); }
  const c0 = T.shopCost(s.shop[P.i]); if (c0[0] !== 'gold' || c0[1] !== P.cost || s.shop[P.i][0] !== P.buy) out.push(`${where}: покупка сценария — ${s.shop[P.i] ? s.shop[P.i][0] : '—'} за ${c0[1]} ${c0[0]}, сценарий — ${P.buy} за ${P.cost} золота`);
  const sh0 = JSON.stringify(s.shop); run('Лавка · срок вышел', () => T.LV_SRV.auto()); if (JSON.stringify(s.shop) !== sh0) out.push(`${where}: витрина обучения сменилась по сроку`);
  const f0 = fp(s), oi = s.shop.findIndex((g, i) => i !== P.i && g[2] === 'gold');
  if (!T.LV_SRV.buy('lvq' + s.lv.seq, oi, s.lv.gen).refuse || !T.LV_SRV.refresh('lvr' + s.lv.seq, 'free').refuse || fp(s) !== f0) out.push(`${where}: чужой товар или обновление витрины не отказаны`);
  s.route = 'craft'; s.seg.craft = 'shop'; s.overlay = null; draw(`${where} · Лавка обучения`);
  run('Лавка · лист товара', () => T.ACT.buy(String(P.i)));
  const v = s.overlay && s.overlay.v; if (!v) return out.concat([`${where}: нет листа товара с покупкой`]);
  const g0 = s.wallet.gold, q0 = T.BAG.qty(P.buy);
  run('Лавка · купить', () => T.ACT.buydo(v));
  if (s.wallet.gold !== g0 - P.cost || T.BAG.qty(P.buy) !== q0 + P.q) out.push(`${where}: покупка — золото ${g0} → ${s.wallet.gold}, ${P.buy} ${q0} → ${T.BAG.qty(P.buy)}; ждали −${P.cost} и +${P.q}`);
  const f1 = fp(s); run('Лавка · повтор номера', () => T.ACT.buydo(v)); if (fp(s) !== f1) out.push(`${where}: повтор номера покупки что-то сделал`);
  s.overlay = null; T.OB.sync(); const st2 = T.OB.step(); if (st2 && st2.k === 'shop') out.push(`${where}: после покупки шаг сценария не сменился`);
  return out;
}
/* первый артефакт (ADR-0040): на его шаге золота и душ хватает; другие артефакты — отказ без расхода; свой — купить за золото и поднять
   до уровня шага за души; выше — отказ; шаг сменяется */
function lawArt(where) {
  const out = [], s = T.S, A = TUT0.art, st = T.OB.step(); if (!A) return out;
  if (!st || st.k !== 'art') return [`${where}: шаг сценария — не артефакт (${st ? st.k : 'обучение кончилось'})`];
  if (st.id !== A.id || st.lv !== A.lv) out.push(`${where}: шаг сценария — «${st.id}» до ${st.lv}, сборка — «${A.id}» до ${A.lv}`);
  if (s.wallet.gold < A.gold || s.wallet.souls < A.souls) out.push(`${where}: к шагу золота ${s.wallet.gold} и душ ${s.wallet.souls} — нужно ${A.gold} и ${A.souls}`);
  s.route = 'profile'; s.seg.profile = 'arts'; s.overlay = null; draw(`${where} · Реликварий`);
  const f0 = fp(s);
  for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a7', 'a18', 'a19', 'a20']) if (id !== A.id) { run('другой артефакт', () => T.ACT.wnbuy(`${id}:${T.wnOp()}`)); run('другой артефакт · уровень', () => T.ACT.wnup(`${id}:${T.wnOp()}`)); }
  if (fp(s) !== f0) out.push(`${where}: куплен не тот артефакт: ${JSON.stringify(s.wn.art)}`);
  const g0 = s.wallet.gold, u0 = s.wallet.souls;
  run('артефакт · купить', () => T.ACT.wnbuy(`${A.id}:${T.wnOp()}`));
  for (let k = 0; k < A.lv; k++) run('артефакт · поднять', () => T.ACT.wnup(`${A.id}:${T.wnOp()}`));
  if (s.wn.art[A.id] !== A.lv || g0 - s.wallet.gold !== A.gold || u0 - s.wallet.souls !== A.souls) out.push(`${where}: артефакт ${JSON.stringify(s.wn.art)}, золото −${g0 - s.wallet.gold}, души −${u0 - s.wallet.souls}; ждали «${A.id}» на ${A.lv}-м, −${A.gold} и −${A.souls}`);
  const f1 = fp(s); run('артефакт · выше шага', () => T.WN_SRV.up('wnz' + s.wn.seq, A.id)); if (fp(s) !== f1) out.push(`${where}: артефакт поднят выше уровня шага`);
  s.overlay = null; T.OB.sync(); const st2 = T.OB.step(); if (st2 && st2.k === 'art') out.push(`${where}: после артефакта шаг сценария не сменился`);
  return out;
}

/* артефакт активных биомов (слова автора 06.10.2026, ADR-0054, п. 3 и п. 15): «…обязан быть в обучении чтобы игрок его сам купил и мы
   познакомили игрока с этой механикой»; «Я хочу чтобы игрок буквально покупал артефакт и ему открывался - 1 биом который он может
   фармить»; «Я имею ввиду 1 и единственный биом на обучение не 2». На шаге покупки: забегов ещё не было; активного биома нет — «Спуск»
   показывает замок слотов и вместо «Начать забег» — покупку артефакта, сервер забег не начинает; чужие артефакты — отказ; покупка —
   золото по цене свежей сборки, артефакт куплен без уровня, активных биомов — один; повтор номера ничего не покупает; уровень
   артефакта в обучении — отказ; шаг сменяется, «Спуск» показывает один слот */
function lawTrail(where) {
  const out = [], s = T.S, A = TUT0.trail, st = T.OB.step(); if (!A) return [`${where}: в сборке нет шага артефакта активных биомов`];
  if (!st || st.k !== 'trail') return [`${where}: шаг сценария — не артефакт активных биомов (${st ? st.k : 'обучение кончилось'})`];
  if (st.id !== A.id) out.push(`${where}: шаг сценария — «${st.id}», сборка — «${A.id}»`);
  if (s.runNo) out.push(`${where}: до покупки артефакта активных биомов уже был забег (${s.runNo})`);
  if (!s.heroes.length) out.push(`${where}: к шагу нет героя — покупка стоит после найма первого`);
  if (s.wallet.gold < A.gold) out.push(`${where}: к шагу золота ${s.wallet.gold} — нужно ${A.gold}`);
  const t0 = T.EN_TRAIL(s); if (t0.slots !== 0 || t0.own) out.push(`${where}: до покупки активных биомов ${t0.slots} — без артефакта их быть не должно`);
  s.route = 'descent'; s.selBiome = 'b1'; s.overlay = null;
  const h0 = draw(`${where} · Спуск без активного биома`);
  if (/data-a="sheet" data-v="prep"/.test(h0) || /data-a="start"/.test(h0)) out.push(`${where}: «Спуск» без активного биома предлагает забег`);
  if (!new RegExp(`data-a="wnbuy" data-v="${A.id}:`).test(h0)) out.push(`${where}: «Спуск» без активного биома не предлагает купить артефакт`);
  if (!h0.includes(A.n)) out.push(`${where}: «Спуск» не называет артефакт «${A.n}»`);
  if (!/class="ds-slots none"/.test(h0)) out.push(`${where}: слоты биомов не показаны закрытыми`);
  const f0 = fp(s);
  run('забег без активного биома', () => T.startRun('s1', 'b1'));
  for (const id of ['a2', 'a3', 'a4', 'a5', 'a7', 'a18', 'a19', 'a20']) run('другой артефакт', () => T.ACT.wnbuy(`${id}:${T.wnOp()}`));
  run('уровень некупленного артефакта', () => T.ACT.wnup(`${A.id}:${T.wnOp()}`));
  if (fp(s) !== f0) out.push(`${where}: до покупки что-то изменилось: забег, чужой артефакт или уровень`);
  const g0 = s.wallet.gold, u0 = s.wallet.souls, op = T.wnOp();
  run('артефакт активных биомов · купить', () => T.ACT.wnbuy(`${A.id}:${op}`));
  const t1 = T.EN_TRAIL(s);
  if (s.wn.art[A.id] !== 0 || g0 - s.wallet.gold !== A.gold || u0 !== s.wallet.souls) out.push(`${where}: артефакт ${JSON.stringify(s.wn.art)}, золото −${g0 - s.wallet.gold}, души −${u0 - s.wallet.souls}; ждали «${A.id}» без уровня и −${A.gold} золота`);
  if (t1.slots !== A.slots || A.slots !== 1) out.push(`${where}: после покупки активных биомов ${t1.slots} — в обучении он один и единственный (сборка — ${A.slots})`);
  const f1 = fp(s);
  run('артефакт активных биомов · повтор номера', () => T.ACT.wnbuy(`${A.id}:${op}`));
  run('артефакт активных биомов · ещё раз', () => T.ACT.wnbuy(`${A.id}:${T.wnOp()}`));
  run('артефакт активных биомов · уровень в обучении', () => T.ACT.wnup(`${A.id}:${T.wnOp()}`));
  if (!T.WN_SRV.up('wnz' + s.wn.seq, A.id).refuse) out.push(`${where}: уровень артефакта активных биомов в обучении — не отказ`);
  if (fp(s) !== f1) out.push(`${where}: повтор покупки или уровень в обучении что-то изменили`);
  s.overlay = null; T.OB.sync(); const st2 = T.OB.step(); if (st2 && st2.k === 'trail') out.push(`${where}: после покупки шаг сценария не сменился`);
  s.route = 'descent'; const h1 = draw(`${where} · Спуск с активным биомом`);
  if (/class="ds-slots none"/.test(h1) || !/class="ds-slots[^"]*"[^>]*data-v="wnart:/.test(h1)) out.push(`${where}: после покупки «Спуск» не показывает слот и путь к артефакту`);
  if (/data-a="wnbuy"/.test(h1)) out.push(`${where}: после покупки «Спуск» всё ещё предлагает купить артефакт`);
  return out;
}

/* ---------- 7б. погружения Подземного леса и уроки (ADR-0049) ----------
   Слово автора 02.10.2026: «…нужно условно врагов в нём до условных 5 - 10 заходов чтобы пройти… с каждым новым погружением, показывает
   новое окно которое не было доступно, рассказывает про навыки героя, систему как и что работает». Законы:
   — заходов в лес — коридор автора; погружений — столько, сколько уроков; каждое глубже прежнего, хозяйка леса — в последнем;
   — перед каждым погружением встаёт его урок, по порядку, когда шаг сценария — само погружение;
   — урок показывает данные игры: приёмы героя из его набора, то, что открыла доблесть, круг стихий ядра, угрозу класса, приёмы хозяйки
     леса, её раунды и совет сказителя — ожидание собрано из данных до мутаций;
   — «Попробовать» урока ведёт в его окно, и окна уроков — новые: ни уровень, ни прежний урок туда не вели;
   — дар погружения выдан один раз, ровно данные свежей сборки; повтор номера ничего не выдаёт; итог забега показывает дар */
/* функции, а не константы: урок впервые проверяется в прохождении сценария (раздел 6), раньше этого места файла */
function fmtX(v) { const a = Math.abs(v), s = a % 100 ? (a / 100).toFixed(2).replace(/0$/, '') : String(a / 100); return s.replace('.', ','); }
function kitOfId(id) { const r = T.RSI[id], d = r && r.team && r.team.draft; return d ? T.heroKit({ draft: d }) : null; }
function lesExpect(j) {
  const l = T.OB.lesOf(j), L = T.EB.lib(), out = []; if (!l) return null;
  const hid = T.OB.lesHeroId(l);   // герой урока — из данных: роль среди пятерых обучения или руна обучения
  if (hid) {
    const K = kitOfId(hid); out.push(T.RSI[hid].n);
    for (const x of (K ? K.kit : [])) if (L[x.id] && (l.kind !== 'valor' || x.v >= 1)) out.push(x.as || L[x.id].n);
    if (l.kind === 'valor') out.push(`+${T.EB.RULES.valorPct} %`);
    if (l.kind === 'threat') { const fx = T.OB.fix(hid); out.push(`×${fmtX(((fx && T.EB.RULES.cls[fx.cls]) || {}).thr || T.EB.RULES.threat.base)}`); }
  }
  if (l.kind === 'elements') { const E = T.EB.RULES.elem; out.push(...E.circle, `×${fmtX(E.fwd)}`, `×${fmtX(E.back)}`); }
  const hide = [];
  if (l.kind === 'boss') {   // до первой победы — как в бестиарии: ни имени, ни записи сказителя; приёмы — те, что отряд видел в бою
    const id = T.OB.bossId(), f = T.EB.FOES[id], c = T.foes && T.foes.cards ? T.foes.cards[id] : null;
    out.push(String(T.EB.roundsOf('b'))); for (const x of f.kit.kit) if (L[x.id]) out.push(x.as || L[x.id].n);   // имя приёма — своё у врага
    hide.push(f.name); if (c && c.tip) hide.push(c.tip);
    return { n: l.n, say: l.say[1], want: out, hide, boss: id };
  }
  return { n: l.n, say: l.say[1], want: out, hide };
}
/* ожидание уроков — из данных, один раз, до мутаций: первый показ урока — в прохождении сценария (раздел 6). Объявление без значения:
   присваивание здесь стёрло бы ожидание, собранное раньше этого места файла, и мутация собрала бы его заново — уже из сломанных данных */
var LES_EXP;
function lesExp(j) {
  if (!LES_EXP) { LES_EXP = {}; for (let k = 1; k <= ((T.OB.DV && T.OB.DV.list.length) || 0); k++) LES_EXP[k] = lesExpect(k); }
  return LES_EXP[j];
}
lesExp(1);   // ожидание собрано до мутаций, даже если прохождение не дошло до уроков
function unEsc(h) { return String(h).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }
function lawLessonHtml(j, html) {
  const out = [], E = lesExp(j), X = T.OB.TEXT, h = unEsc(html); if (!E) return [`урок погружения ${j}: нет в данных`];
  if (!/class="ob-pop"/.test(h) || !h.includes(`${X.lesson} · ${E.n}`)) out.push(`урок погружения ${j}: окно не показано или без заголовка «${E.n}»`);
  if (!h.includes(X.dive(j, (DV0 || { list: [] }).list.length))) out.push(`урок погружения ${j}: нет «${X.dive(j, (DV0 || { list: [] }).list.length)}»`);
  if (!h.includes(E.say)) out.push(`урок погружения ${j}: нет слова проводника`);
  const miss = E.want.filter(w => !h.includes(w)); if (miss.length) out.push(`урок погружения ${j} «${E.n}»: из данных игры нет — ${miss.join(', ')}`);
  if (E.boss && !(T.S.known || []).includes(E.boss)) { const leak = (E.hide || []).filter(w => h.includes(w)); if (leak.length) out.push(`урок погружения ${j} «${E.n}»: до первой победы открыто то, что бестиарий прячет, — ${leak.join(', ')}`); }
  if (!new RegExp(`data-a="obtry" data-v="d${j}"`).test(h)) out.push(`урок погружения ${j}: нет «${X.tryIt}»`);
  return out;
}
/* погружения сыгранного пути: les — уроки по порядку (номер и шаг в миг показа), dives — погружения (номер и был ли урок до него), steps — путь */
function lawDives(les, dives, steps, where) {
  const out = [], n = DV0 ? DV0.list.length : 0, C = DV0 ? DV0.runs : [5, 10], fl = DV0 ? DV0.floors : 25;
  const forest = steps.filter(s => s.kind === 'run' && s.b === (DV0 || {}).b), guards = steps.filter(s => s.kind === 'guard' && s.b === (DV0 || {}).b).length;
  if (forest.length < C[0] || forest.length + guards > C[1]) out.push(`${where}: заходов в лес ${forest.length} и к стражу ${guards} — вне ${C.join('–')} (слово автора)`);
  if (dives.length !== n || forest.length !== n) out.push(`${where}: погружений сыграно ${dives.length} (забегов леса ${forest.length}), в плане ${n}`);
  dives.forEach((x, i) => { if (x.d !== i + 1) out.push(`${where}: погружение ${x.d} — не по порядку`); if (!x.les) out.push(`${where}: погружение ${x.d} началось без своего урока`); });
  if (les.map(x => x.j).join() !== dives.map(x => x.d).join()) out.push(`${where}: уроки ${les.map(x => x.j).join(', ')} — не по одному перед погружениями ${dives.map(x => x.d).join(', ')}`);
  for (const x of les) if (!x.step || x.step.k !== 'run' || x.step.d !== x.j) out.push(`${where}: урок ${x.j} встал не перед своим погружением (шаг ${JSON.stringify(x.step)})`);
  const depth = s => (s.win ? fl + 1 : s.wall);
  forest.forEach((s, i) => { if (i && depth(s) <= depth(forest[i - 1])) out.push(`${where}: погружение ${i + 1} не глубже прежнего — однообразный повтор`); });
  if (!forest.length || !forest[forest.length - 1].win || forest.slice(0, -1).some(s => s.win)) out.push(`${where}: хозяйка леса пала не в последнем погружении`);
  const ids = (DV0 ? DV0.list : []).map(d => d.lesson); if (new Set(ids).size !== ids.length) out.push(`${where}: урок повторяется`);
  return out;
}
/* дары: у каждого погружения с даром — выдан один раз и ровно данные свежей сборки; повтор номера ничего не меняет; итог забега его показывает */
function lawGift(where) {
  const out = [], s = T.S, G = (DV0 && DV0.gifts) || {};
  for (const d of (DV0 ? DV0.list : [])) {
    const g = G[d.no], got = s.ob.gift[d.no];
    if (!g) { if (got) out.push(`${where}: погружение ${d.j} — дар, которого нет в данных`); continue; }
    if (!got || JSON.stringify(got.gift) !== JSON.stringify(g)) out.push(`${where}: погружение ${d.j} — дар ${JSON.stringify(got && got.gift).slice(0, 80)}, в сборке ${JSON.stringify(g).slice(0, 80)}`);
    const f0 = fp(s), r = T.OB.SRV.gift(d.no); cnt.ops++;
    if (!r.again || fp(s) !== f0) out.push(`${where}: повтор дара погружения ${d.j} что-то выдал`);
  }
  const R = s.runs.find(x => x.d && x.gift);
  if (!R) out.push(`${where}: ни у одного забега погружения нет дара в итоге`);
  else {
    s.overlay = { t: 'result', arg: R.id }; s.route = 'descent';
    const h = unEsc(draw(`${where} · итог погружения ${R.d}`)); s.overlay = null;
    if (!h.includes(T.OB.TEXT.gift) || !h.includes(Number(R.gift[1]).toLocaleString('ru-RU'))) out.push(`${where}: итог погружения ${R.d} не показывает дар (${T.OB.TEXT.gift}, дух ${R.gift[1]})`);
    if (!h.includes(T.OB.TEXT.dive(R.d, DV0.list.length))) out.push(`${where}: итог погружения ${R.d} без «${T.OB.TEXT.dive(R.d, DV0.list.length)}»`);
  }
  return out;
}
/* окно урока: «Попробовать» ведёт туда, куда велят данные; окна уроков — новые: ни уровень Странника, ни прежний урок туда не вели */
function winKey(s) {
  return [s.route, s.route === 'descent' ? s.selBiome : '', s.route === 'heroes' ? s.seg.heroes : '', s.route === 'heroes' ? s.seg.hero : '', s.route === 'heroes' ? (T.hrTwin(T.H(s.selHero)) || { id: s.selHero }).id : '',
    s.overlay ? s.overlay.t : '', s.overlay ? String(s.overlay.arg || '') : '', s.route === 'craft' ? s.seg.craft : '', s.route === 'profile' ? s.seg.profile : ''].join('|');
}
function lawLessonGo(where) {
  const out = [], s = T.S, seen = new Map(), keep = JSON.stringify({ route: s.route, seg: s.seg, sel: s.selHero, hold: s.ob.hold });
  for (const l of D.levels) for (const k of l.opens) { s.overlay = null; s.route = 'shelter'; run('окно уровня', () => T.OB.go(k)); const key = winKey(s); if (!seen.has(key)) seen.set(key, `уровень ${l.L}`); }
  for (const d of (DV0 ? DV0.list : [])) {
    const l = T.OB.lesOf(d.j); if (!l) { out.push(`${where}: у погружения ${d.j} нет урока`); continue; }
    s.overlay = null; s.route = 'shelter'; s.ob.hold = ''; s.ob.queue = ['d' + d.j];
    run('«Попробовать» урока', () => T.ACT.obtry('d' + d.j));
    const g = l.go || {}, key = winKey(s);
    if (s.route !== g.route || (g.hero && s.seg.hero !== g.hero) || (g.sheet && !(s.overlay && s.overlay.t === g.sheet.split(':')[0]))) out.push(`${where}: «Попробовать» урока ${d.j} «${l.n}» привело в ${key}, а не в окно урока`);
    if (seen.has(key)) out.push(`${where}: урок ${d.j} «${l.n}» ведёт в окно, куда уже вёл ${seen.get(key)}`); else seen.set(key, `урок ${d.j}`);
  }
  const k0 = JSON.parse(keep); s.overlay = null; s.route = k0.route; s.seg = k0.seg; s.selHero = k0.sel; s.ob.hold = k0.hold; s.ob.queue = [];
  return out;
}

/* ---------- 8. законы на сценарии ---------- */
for (const e of lawLoot(CHK, 'добыча обучения')) say(e);
if (CHK.length !== T.OB.D.loot.reduce((a, r) => a + r.length, 0)) say(`добыча обучения: этажей в прохождении ${CHK.length}, в таблице ${T.OB.D.loot.reduce((a, r) => a + r.length, 0)}`);
{ const r = T.OB.SRV.skip('ob' + T.S.ob.srv.seq); if (!r.refuse) say('пропуск после конца обучения не отказан'); }
for (let L = 1; L <= D.levels.length; L++) for (const e of lawSkip(L, `пропуск с уровня ${L}`)) say(e);
/* подсказка и замки — на уровне подсказки, до рецепта; замки ещё — на старте и в последнем шаге (уровень 10, пределы) */
{
  const HL = T.OB.HINT ? T.OB.HINT.L : 6;
  if (playTo(1).stopped) { for (const e of lawClosed('уровень 1')) say(e); for (const e of lawLockLevel('уровень 1')) say(e); } else say('сценарий: уровень 1 не взят');
  if (playTo(HL).stopped) {
    if (!T.OB.hintOn()) say(`подсказка: на уровне ${HL} не включилась`);
    for (const e of lawClosed(`уровень ${HL}`)) say(e);
    for (const e of lawHint(`уровень ${HL}`)) say(e);
  } else say(`сценарий: уровень ${HL} не взят`);
  if (playTo(D.levels.length).stopped) { T.OB.sync(); for (const e of lawClosed(`уровень ${D.levels.length}, последние шаги`)) say(e); } else say(`сценарий: уровень ${D.levels.length} не взят`);
}
/* сундук, Лавка, первый артефакт — шаги с заданным итогом (ADR-0040): на каждом — всё прочее закрыто, а сам шаг даёт ровно итог сценария */
for (const [k, n, law] of [['trail', 'артефакт активных биомов', lawTrail], ['chest', 'сундук сценария', lawChest], ['shop', 'Лавка обучения', lawShop], ['art', 'первый артефакт', lawArt]]) {
  if (!TUT0[k]) continue;
  if (!playToK(k)) { say(`сценарий: шаг «${n}» не настал`); continue; }
  for (const e of lawClosed(`шаг «${n}»`)) say(e);
  for (const e of law(n)) say(e);
}

/* ---------- 9. проверка мутацией: законы ловят поломки ---------- */
const MUT = [];
function mutant(name, apply, revert, law) {
  let found = [];
  try { apply(); found = law() || []; } catch (e) { found = ['исключение: ' + e.message]; } finally { try { revert(); } catch (_) { } }
  MUT.push([name, found.length > 0]);
  if (process.argv.includes('--mut')) console.log(`мутация «${name}»: ${found.length ? found.slice(0, 2).join(' | ').slice(0, 300) : 'НЕ ПОЙМАНА'}`);
}
mutant('ворота сняты — действия вне сценария проходят', () => { T.OB.gateOff = true; }, () => { T.OB.gateOff = false; },
  () => { if (!playTo(1).stopped) return ['нет уровня 1']; T.OB.gateOff = true; return lawClosed('мутация'); });
{
  const L0 = T.OB.D.loot[0][0], was = L0[1];
  mutant('добыча: в таблице на 1 золото больше, чем дало бы ядро', () => { L0[1] = was + 1; }, () => { L0[1] = was; },
    () => { T.OB.switch(true); T.OB.chk = []; const errs = []; try { play(mkW({ stopL: 2, sink: e => errs.push(e) }), D); } catch (e) { if (e !== STOP) throw e; } const c = T.OB.chk || []; T.OB.chk = null; return lawLoot(c, 'мутация'); });
}
{
  const E = T.OB.D.skip, g0 = E.wallet.gold;
  mutant('пропуск: итог на 1 золото больше прохождения', () => { E.wallet.gold = g0 + 1; }, () => { E.wallet.gold = g0; }, () => lawSkip(1, 'мутация', () => {}));
}
{
  const R0 = T.OB.R, s0 = R0.skip;
  mutant('пропуск: повтор номера выдаёт заново', () => { R0.skip = (M, op, E, live) => { delete M.ops[op]; return s0(M, op, E, true); }; }, () => { R0.skip = s0; }, () => lawSkip(1, 'мутация', () => {}));
}
{
  const lv6 = T.OB.D.levels.find(l => l.hint), h0 = lv6 ? lv6.hint : null;
  mutant('подсказка: у уровня 6 нет рецепта', () => { if (lv6) delete lv6.hint; }, () => { if (lv6) lv6.hint = h0; },
    () => (playTo(T.OB.HINT ? T.OB.HINT.L : 6).stopped ? lawHint('мутация', true) : ['нет уровня подсказки']));
}
{
  const a = SC[0], b = SC[1];
  mutant('сценарий: первые шаги переставлены — первым не найм', () => { SC[0] = b; SC[1] = a; }, () => { SC[0] = a; SC[1] = b; },
    () => { const errs = []; T.OB.switch(true); let P2 = null; try { P2 = play(mkW({ sink: e => errs.push(e) }), D); } catch (e) { errs.push(e.message); } return P2 && P2.done && !errs.length ? [] : ['сценарий не проходится'].concat(errs); });
}
{
  const C = T.OB.TU.chest, g0 = C ? C.cur.find(x => x[0] === 'gold') : null, was = g0 ? g0[1] : 0;
  mutant('сундук: в данных прототипа на 1 золото больше сценария', () => { if (g0) g0[1] = was + 1; }, () => { if (g0) g0[1] = was; },
    () => (playToK('chest', () => {}) ? lawChest('мутация') : ['нет шага сундука']));
}
{
  const G = T.OB.TU.shop ? T.OB.TU.shop.goods : null, a = G ? G[1] : null, b = G ? G[2] : null;
  mutant('Лавка: витрина обучения не та, что в сценарии', () => { if (G) { G[1] = b; G[2] = a; } }, () => { if (G) { G[1] = a; G[2] = b; } },
    () => (playToK('shop', () => {}) ? lawShop('мутация') : ['нет шага Лавки']));
}
{
  const st = SC.find(x => x.k === 'art'), id0 = st ? st.id : null;
  mutant('артефакт: сценарий пускает другой артефакт', () => { if (st) st.id = 'a4'; }, () => { if (st) st.id = id0; },
    () => (playToK('art', () => {}) ? lawArt('мутация') : ['нет шага артефакта']));
}
{
  const E = T.OB.D.skip, a0 = E.art;
  mutant('пропуск: итог без первого артефакта', () => { E.art = {}; }, () => { E.art = a0; }, () => lawSkip(1, 'мутация', () => {}));
  /* артефакт активных биомов (ADR-0054): итог пропуска без него; покупка открывает два биома; покупка без цены; артефакт уже куплен */
  const tid = TUT0.trail ? TUT0.trail.id : '', noTrail = Object.fromEntries(Object.entries(a0).filter(([id]) => id !== tid));
  mutant('пропуск: итог без артефакта активных биомов', () => { E.art = noTrail; }, () => { E.art = a0; }, () => lawSkip(1, 'мутация', () => {}));
  const wa = T.EN_WANDERER.art.list.find(x => x.id === tid), own0 = wa ? wa.own : 0, gold0 = wa ? wa.gold : 0;
  mutant('активные биомы: покупка открывает два биома', () => { if (wa) wa.own = 2; }, () => { if (wa) wa.own = own0; },
    () => (playToK('trail', () => {}) ? lawTrail('мутация') : ['нет шага артефакта активных биомов']));
  mutant('активные биомы: слот есть и без артефакта', () => { if (wa) wa.base = 1; }, () => { if (wa) wa.base = 0; },
    () => (playToK('trail', () => {}) ? lawTrail('мутация') : ['нет шага артефакта активных биомов']));
  mutant('активные биомы: артефакт дешевле таблицы автора', () => { if (wa) wa.gold = gold0 - 1; }, () => { if (wa) wa.gold = gold0; },
    () => (playToK('trail', () => {}) ? lawTrail('мутация') : ['нет шага артефакта активных биомов']));
}
/* погружения леса и уроки (ADR-0049): прохождение с записью уроков и погружений; до погружения j — остановка */
function playDives(sink) {
  T.OB.switch(true); const les = [], dives = []; let P2 = null;
  try { P2 = play(mkW({ les, dives, sink }), D); } catch (e) { sink('исключение: ' + e.message); }
  return { les, dives, steps: P2 ? P2.steps : [], done: !!(P2 && P2.done) };
}
function playToD(j, sink) {
  T.OB.switch(true);
  try { play(mkW({ stopD: j, sink }), D); return false; } catch (e) { if (e === STOP) return true; (sink || say)(`сценарий до погружения ${j}: исключение — ${e.message}`); return false; }
}
if (DV0 && DV0.list.length > 1) {
  const L2 = DV0.list[1].lesson, keep = T.OB.DV.lessons[L2];
  mutant('урок второго погружения не встаёт перед ним', () => { delete T.OB.DV.lessons[L2]; }, () => { T.OB.DV.lessons[L2] = keep; },
    () => { const errs = [], x = playDives(e => errs.push(e)); return lawDives(x.les, x.dives, x.steps, 'мутация'); });
  const g0 = T.OB.SRV.gift;
  mutant('дар погружения: повтор номера выдаёт заново', () => { T.OB.SRV.gift = (no, s) => { const st = s || T.S; if (st.ob && st.ob.gift) delete st.ob.gift[no]; return g0(no, st); }; }, () => { T.OB.SRV.gift = g0; },
    () => { const x = playDives(() => {}); return x.done ? lawGift('мутация') : ['сценарий не прошёл']; });
  mutant('дар погружения не выдаётся — однообразные забеги вернулись бы', () => { T.OB.SRV.gift = () => ({ refuse: 'none' }); }, () => { T.OB.SRV.gift = g0; },
    () => { const errs = [], x = playDives(e => errs.push(e)); return lawDives(x.les, x.dives, x.steps, 'мутация').concat(x.done ? [] : ['сценарий не прошёл']); });
  mutant('сид погружения — свой номер забега, а не сервера сценария', () => { T.OB.seedOff = true; }, () => { T.OB.seedOff = false; },
    () => { T.OB.chk = []; const ok = playToD(3, () => {}), c = T.OB.chk || []; T.OB.chk = null; return ok ? lawLoot(c, 'мутация') : ['нет погружения 3']; });
  const l1 = T.OB.lesOf(1), h1 = l1 ? T.OB.lesHeroId(l1) : null, K1 = h1 ? kitOfId(h1) : null, kit1 = K1 ? K1.kit : null;
  mutant('урок первого погружения — без приёмов героя из данных', () => { if (K1) K1.kit = []; }, () => { if (K1) K1.kit = kit1; },
    () => { if (!playToD(1, () => {})) return ['нет погружения 1']; T.S.overlay = null; T.S.route = 'shelter'; T.S.ob.hold = ''; T.S.ob.queue = ['d1']; return lawLessonHtml(1, popOf(draw('мутация · урок 1'))); });
  const lE = Object.values(T.OB.DV.lessons).find(l => l.kind === 'elements'), goE = lE ? lE.go : null;
  mutant('окно урока — то, куда уже вёл уровень Странника', () => { if (lE) lE.go = Object.assign({}, D.open.b2.go); }, () => { if (lE) lE.go = goE; },
    () => (playToD(DV0.list.length, () => {}) ? lawLessonGo('мутация') : ['нет последнего погружения']));
}
/* законы сборщика погружений (tools/content-gen/start/build.js, ADR-0049): поломка данных или мира — сборка обязана её назвать */
{
  const BLD = require(path.join(ROOT, 'tools', 'content-gen', 'start', 'build.js')), DAT = require(path.join(ROOT, 'tools', 'content-gen', 'start', 'data.js'));
  const WSM = require(path.join(ROOT, 'tools', 'content-gen', 'start', 'world-sim.js')), DVD = DAT.DIVES, errsOf = re => () => (BLD.build().err || []).filter(e => re.test(e));
  const r0 = DVD.runs.slice();
  mutant('сборка: коридор заходов автора не держится', () => { DVD.runs = [DVD.lessons.length + 2, 10]; }, () => { DVD.runs = r0; }, errsOf(/заходов/));
  const lc = DVD.lessons.find(l => l.kind === 'hero'), go0 = lc ? lc.go : null;
  mutant('сборка: урок ведёт туда, куда уже вёл уровень', () => { if (lc) lc.go = Object.assign({}, DAT.OPEN.craft.go); }, () => { if (lc) lc.go = go0; }, errsOf(/куда уже вёл/));
  const hv = lc ? lc.role : null;
  mutant('сборка: урок о герое, которого нет в обучении', () => { if (lc) lc.role = 'фармер'; }, () => { if (lc) lc.role = hv; }, errsOf(/нет героя обучения|нечему учить|не встал/));
  /* имя героя пятёрки, вшитое в слово урока: после замены героя данными урок соврал бы (ADR-0050; замена — сменой данных) */
  const sy0 = lc ? lc.say : null, hn0 = lc ? (T.RSI[(DAT.HEROES.find(h => h.role === lc.role) || {}).id] || { n: '' }).n : '';
  mutant('сборка: имя героя пятёрки в слове урока', () => { if (lc) lc.say = [sy0[0], `${sy0[1]} ${hn0} — первый.`]; }, () => { if (lc) lc.say = sy0; }, errsOf(/имя героя/));
  const mk0 = WSM.make;
  mutant('сборка: дар погружения без духа — итог не тот, что у полного пути', () => {
    WSM.make = (Dx, o = {}) => (o.gift ? mk0(Dx, Object.assign({}, o, { gift: (no, S) => { const g = o.gift(no, S); return g ? [g[0], Math.floor(g[1] / 2), g[2], g[3]] : g; } })) : mk0(Dx, o));
  }, () => { WSM.make = mk0; }, errsOf(/итог обучения не тот|не дошёл|стена|не глубже/));
}
const caught = MUT.filter(m => m[1]).length;
for (const [n, ok] of MUT) if (!ok) say(`проверка мутацией: поломку «${n}» законы не поймали`);
cnt.mut = `${caught} из ${MUT.length}`;

/* ---------- 10. режим «Команда»: те же окна рисуются ---------- */
run('свежий лист для «Команды»', () => T.OB.switch(true));
run('режим «Команда»', () => T.setTeam(true));
T.S.ob.queue = [10]; T.S.route = 'shelter'; T.S.overlay = null; draw('окно уровня 10 · Команда', false);
T.S.overlay = { t: 'level' }; draw('лист уровня · Команда', false);
T.S.overlay = { t: 'obskip', arg: 'ob' + T.S.ob.srv.seq }; draw('подтверждение пропуска · Команда', false);
run('режим «Игрок»', () => T.setTeam(false));
/* подтверждение пропуска глазами игрока: отряд, кошелёк, руны, уровень, цикл II — числа итога сценария */
{
  T.S.overlay = { t: 'obskip', arg: 'ob' + T.S.ob.srv.seq }; T.S.route = 'shelter';
  const h = draw('подтверждение пропуска'), E = T.OB.D.skip, fmtN = n => Number(n).toLocaleString('ru-RU');
  ladder('подтверждение пропуска', h);
  for (const [id, lvl] of E.heroes) if (!h.includes(T.RSI[id].n) || !h.includes(`<span class="num">${lvl}</span>`)) say(`подтверждение пропуска: нет героя ${id} с уровнем ${lvl}`);
  for (const k of ['gold', 'spirit', 'souls', 'keys']) if (!h.includes(`<b class="num">${fmtN(E.wallet[k])}</b>`)) say(`подтверждение пропуска: нет ${k} ${E.wallet[k]}`);
  if (!h.includes(`<b class="num">${E.lvl}</b>`) || !h.includes(T.OB.TEXT.skipLead)) say('подтверждение пропуска: нет уровня Странника или слов о цикле II и первом рейтинге');
  for (const id of Object.keys(E.art || {})) if (!h.includes(`«${TUT0.trail && TUT0.trail.id === id ? TUT0.trail.n : TUT0.art && TUT0.art.id === id ? TUT0.art.n : id}»`)) say(`подтверждение пропуска: нет артефакта ${id}`);
  if (TUT0.trail && !h.includes(T.OB.TEXT.skipTrail(TUT0.trail.slots))) say('подтверждение пропуска: не сказано, сколько активных биомов открывает артефакт');
  if (!h.includes(`закрытых сундуков — <b class="num">${E.chests.length}</b>`)) say(`подтверждение пропуска: закрытых сундуков не ${E.chests.length}`);
  if (!/data-a="obskipdo" data-v="ob\d+"/.test(h)) say('подтверждение пропуска: кнопка без номера операции');
  /* «Пропустить обучение» — в окне уровня, в Убежище и в настройках */
  T.S.overlay = null; T.S.ob.queue = [1]; if (!/data-a="obskip"/.test(popOf(draw('окно уровня · пропуск')))) say('окно уровня: нет «Пропустить обучение»');
  T.S.ob.queue = []; T.S.route = 'shelter'; if (!/class="sh-next"[\s\S]*data-a="obskip"/.test(draw('Убежище · пропуск'))) say('Убежище: нет «Пропустить обучение»');
  T.S.overlay = { t: 'settings' }; if (!/data-a="obskip"/.test(draw('настройки · пропуск'))) say('настройки: нет «Пропустить обучение»');
  T.S.overlay = null;
}
/* ---------- 11. арт окна уровня (п. 4 очереди docs/art-queue.md): пути выгрузки есть на диске и в описи tools/art-gen/ui-art.json;
   окно рисует раму, медальон, вспышку и знаки всех открытий уровня; без выгрузки — прежний вид: кольцо опыта, ни одной картинки ---------- */
{
  const ART = T.OB.ART, inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'ui-art.json'), 'utf8'));
  const invPaths = new Set(Object.keys(inv.files || inv.outputs || inv));
  for (const p of ART.ready) {
    if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`арт окна уровня: ${p} — нет на диске`);
    if (!invPaths.has(p) && !JSON.stringify(inv).includes(`"${p}"`)) say(`арт окна уровня: ${p} — нет в описи ui-art.json`);
  }
  for (const k of [ART.medal, ART.burst, ART.frame, ART.lock, ART.xp]) if (!ART.ready.includes(k)) say(`арт окна уровня: ${k} не выгружен`);
  for (const l of D.levels) for (const k of l.opens) if (!ART.ready.includes(T.OB.openArt(k))) say(`арт окна уровня: у открытия «${k}» нет знака ${T.OB.openArt(k)}`);
  run('свежий лист для арта', () => T.OB.switch(true));
  for (const L of [1, 3, 6, 10]) {
    T.S.ob.queue = [L]; T.S.route = 'shelter'; T.S.overlay = null; T.S.ob.hold = '';
    const w = popOf(draw(`арт · окно уровня ${L}`)), lv = D.levels[L - 1];
    if (!/class="ob-card[^"]*\bfr\b[^"]*"[^>]*--ob-fr:url\(/.test(w)) say(`арт · окно уровня ${L}: нет рамы`);
    if (!/class="ob-md"/.test(w) || !/class="ob-bs"/.test(w) || !/class="ob-hd md"/.test(w)) say(`арт · окно уровня ${L}: нет медальона или вспышки`);
    if (!lv.hint && (w.match(/class="ob-oi"/g) || []).length !== lv.opens.length) say(`арт · окно уровня ${L}: знаков открытий не столько, сколько открытий (${lv.opens.length})`);
    if (!/class="ob-xpi"/.test(w)) say(`арт · окно уровня ${L}: нет фонаря опыта`);
  }
  /* без выгрузки — прежний вид */
  const keep = ART.ready.slice(); ART.ready.length = 0;
  try {
    T.S.ob.queue = [3]; T.S.route = 'shelter'; T.S.overlay = null;
    const w = popOf(draw('арт · без выгрузки'));
    if (/<img class="ob-(md|bs|oi|xpi)"|--ob-fr|class="ob-card[^"]*\bfr\b/.test(w) || !/class="ob-ring"/.test(w)) say('арт · без выгрузки: окно не вернулось к прежнему виду (кольцо, без картинок)');
    T.S.ob.queue = []; T.S.route = 'craft'; T.S.seg.craft = 'work';
    if (!/<section class="scr"><div class="pnl pad ob-lock"><svg/.test(draw('арт · замок без выгрузки'))) say('арт · без выгрузки: замок раздела — не прежний значок');
  } finally { ART.ready.push(...keep); }
  T.S.ob.queue = []; T.S.route = 'craft'; T.S.seg.craft = 'work';
  if (!/class="ob-lka"/.test(draw('арт · замок раздела'))) say('арт: у закрытого раздела нет знака замка');
  if (!/class="ob-card still[^"]*\bfr\b/.test(T.OB.kit())) say('арт: образец окна в UI-ките — без рамы');
  T.S.route = 'shelter';
}
run('обратно в демо', () => T.OB.switch(false));
if (T.S.ob || T.S.acc.level !== 24 || JSON.stringify(T.NAV_OPEN) !== JSON.stringify({ week: 10 })) say('возврат в демо: аккаунт или ворота не прежние');
done();
