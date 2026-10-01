/* Автопроверка оболочки прототипа «Свет снизу» — шахта, портрет Странника, шапка, бейджи дел, переход между разделами — без браузера.
   1. index.html: концы строк — только CRLF; встроенные скрипты компилируются. Прежнего экрана Эхо (echoView, ECHO_COST) в index.html нет:
      экран Эхо рисует screens/echo.js.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Шахта на каждом маршруте SCREENS: ровно пять разделов карты экранов — в порядке и с путевыми иконками MAP; у каждой кнопки подпись,
      aria-label и подсказка; выбран не больше одного раздела — раздел маршрута (свой или раздел его «назад»); язычок — только у выбранного.
      Странник и Летопись — портрет над шахтой, Лавка Энериума — «+» у Энериума: в шахте тогда ничего не выбрано.
   4. Бейджи — только число дел: цифра или «9+», «!» нет. Число сходится с делами, посчитанными здесь независимо от шахты: разговоры
      проводников, итоги забегов, герои с пределом или доблестью, пробуждение, сундуки (пачка — одно дело), проданные лоты, ритуалы,
      контракты, Дары (пачка), места Памяти; колокол — письма и дар дня. Дела меняются вместе с состоянием; больше девяти — «9+».
      Каждая строка NAV_TODO считает без исключений: сбой строки — ошибка, а не тихий ноль.
   5. Закрытый раздел (NAV_OPEN): замок, условие вместо перехода, без бейджа.
   6. Переход: сменился раздел — язычок едет на разницу шагов (--d), экран входит снизу, сверху или проявляется (data-enter);
      та же отрисовка ещё раз — без перехода. Ключевые кадры перехода меняют только transform и opacity.
   7. Вёрстка расчётом на 932 × 430 и 844 × 390 по CSS index.html: шаг шахты вмещает картинку и подпись, зона нажатия не меньше 44 px,
      подпись и бейдж не шире шахты, подписи на этих экранах видны; на пороге сворачивания подпись ещё помещается.
      SHELL_SIZE UI-кита совпадает с CSS.
   8. UI-кит: раздел «Оболочка и навигация» (KIT_EXTRA) рисуется без исключений, undefined и NaN, размеры в нём — расчётные.
   9. Хвосты задачи: в recipes.js нет заглушки drops.contracts; в лутбоксах «Контракты» заканчивают неделю на планке прогона
      контрактов (contracts.js) во всех циклах.
   10. Тонкие линии, портрет в ячейке, сильные кнопки (слова автора 01.10.2026) — законы по каскаду стилей (css_cascade.js) на 932 × 430
       и 844 × 390, с переменными <html> из screens/shell.js; каждый закон проверен мутацией:
       а) толщины — из данных: SHL_VIEW.line и frame — от 1 до THIN px; нить шапки, шахты и ячейки портрета — line, рамки кнопок — frame;
          в стилях оболочки толщина рамки — только переменной --shl-*, кольцо тенью — не толще THIN;
       б) портрет Странника с уровнем и бейджем — в своей ячейке над шахтой и вне скруглённого угла экрана; колокол с бейджем «9+» —
          вне скруглённого угла справа;
       в) состояния кнопок: обычная, с делами, выбранная, закрытая — различимы видом; выбранная — светом духа, закрытая — серой
          картинкой, замком и «ур. N»; колокол с письмами и без, медальоны Убежища «ждёт игрока» и нет — разные.
   Запуск: node tools/content-gen/screens/check_shell.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
const cnt = { routes: 0, draws: 0, badges: 0, cases: 0, moves: 0 };

/* ================== ДАННЫЕ ПРОВЕРКИ ================== */
/* раздел, который шахта должна выбрать на маршруте: '' — вне шахты; 'wanderer' — портрет Странника над шахтой.
   Маршрут без строки берёт раздел своего «назад» (back) — так встают новые экраны режимов */
const EXPECT = { shelter: 'shelter', descent: 'descent', battle: 'descent', heroes: 'heroes', craft: 'craft', week: 'week', echo: 'week',
  contracts: 'week', rituals: 'week', arena: 'week', clan: 'week', event: 'week', profile: 'wanderer', chronicle: 'wanderer', store: '' };
const TOUCH = 44;              // зона нажатия на телефоне — не меньше, px
const CHAR_EM = 0.62;          // ширина буквы подписи в em — с запасом для PT Sans Narrow Bold заглавными
const LABEL_MARGIN = 4;        // поле подписи до края шахты с каждой стороны, px
const ANIM_PROPS = ['transform', 'opacity'];   // что может менять переход между разделами

/* ================== 1. файл ================== */
{
  const crlf = (html.match(/\r\n/g) || []).length, lf = (html.match(/\n/g) || []).length, cr = (html.match(/\r/g) || []).length;
  if (crlf !== lf || cr !== crlf) say(`index.html: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}, CR ${cr}`);
  if (/\bechoView\b|\bECHO_COST\b/.test(html)) say('index.html: остался прежний экран Эхо — echoView или ECHO_COST; экран рисует screens/echo.js');
}
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
for (const s of scripts) if (!s.src) { try { new vm.Script(s.code, { filename: 'index.html' }); } catch (e) { say('синтаксис встроенного скрипта: ' + e.message); } }
if (err.length) done();

/* ================== 2. песочница ================== */
const stubEl = id => {
  const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, remove() {},
    animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
  e.querySelector = () => stubEl();   // экран боя рисует карты по найденным элементам; isConnected у заглушки нет — шахта её не трогает
  return e;
};
const els = {};
/* <html>: флаги «арт загружен» и переменные --shl-* из screens/shell.js — их читает каскад законов раздела 10 */
const rootCls = new Set(), rootVars = {}, rootEl = stubEl('html');
rootEl.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
rootEl.style = { setProperty: (k, v) => { rootVars[k] = v; } };
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
  querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
  documentElement: rootEl, activeElement: null, fonts: null, baseURI: 'file:///ui/index.html' };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
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
  get S() { return S; }, set S(v) { S = v; }, render, initialState, SCREENS, ACT, NAV, NAV_OPEN, NAV_TODO, navSection, navHeroes, navStep,
  NPCS, MAP, PATH, KIT_EXTRA, SHELL_SIZE, FLOWS, startRun, RS, rsHas, rsCyc, heroDev, navItem, avaHtml, bellHtml, navTodo,
  hrMine: typeof hrMine === 'function' ? hrMine : null, darRows: typeof darRows === 'function' ? darRows : null,
  shChat: typeof shChat === 'function' ? shChat : null, psShelterBtns: typeof psShelterBtns === 'function' ? psShelterBtns : null,
})`, ctx);
const RX = ctx.EN_RECIPES, LBX = ctx.EN_LOOTBOXES, CT = ctx.EN_CONTRACTS;

const BAD = /.{0,60}(?:undefined|NaN|\[object ).{0,40}/;
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const draw = where => { run(where, () => T.render()); cnt.draws++; const h = els.game ? els.game.innerHTML : ''; const m = h.match(BAD); if (m) say(`${where}: в разметке undefined, NaN или [object — «${m[0].replace(/\s+/g, ' ')}»`); return h; };
const reset = () => { T.S = T.initialState(); T.S.overlay = null; };

/* ================== разбор разметки ================== */
const attr = (tag, a) => { const m = tag.match(new RegExp(`\\s${a}="([^"]*)"`)); return m ? m[1] : null; };
function railOf(h) {
  const nav = h.match(/<nav class="g-rail"[^>]*>([\s\S]*?)<\/nav>/);
  if (!nav) return null;
  return [...nav[1].matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].map(([, a, body]) => {
    const tag = '<button' + a + '>', lamp = body.match(/<i class="lamp([^"]*)"([^>]*)><\/i>/), bdg = body.match(/<span class="bdg"[^>]*>([^<]*)<\/span>/);
    const img = body.match(/<img src="([^"]+)"/), lbl = body.match(/<span class="lbl"[^>]*>([^<]*)<\/span>/);
    return { cls: attr(tag, 'class') || '', k: attr(tag, 'data-k'), a: attr(tag, 'data-a'), v: attr(tag, 'data-v'), cur: /aria-current="page"/.test(tag),
      label: attr(tag, 'aria-label'), title: attr(tag, 'title'), img: img ? img[1] : '', lbl: lbl ? lbl[1] : '', bdg: bdg ? bdg[1] : null,
      lamp: lamp ? { cls: lamp[1].trim(), d: (lamp[2].match(/--d:(-?\d+)/) || [])[1] } : null, lock: /class="lk"/.test(body) };
  });
}
const avaOf = h => { const m = h.match(/<button class="g-ava"([^>]*)>([\s\S]*?)<\/button>/); if (!m) return null; const b = m[2].match(/<span class="bdg"[^>]*>([^<]*)<\/span>\s*$/); return { cur: /aria-current="page"/.test(m[1]), bdg: b ? b[1] : null, label: attr('<b' + m[1] + '>', 'aria-label') }; };
const bellOf = h => { const m = h.match(/<button class="g-icon" data-a="sheet" data-v="inbox"([^>]*)>([\s\S]*?)<\/button>/); if (!m) return null; const b = m[2].match(/<span class="bdg"[^>]*>([^<]*)<\/span>/); return { bdg: b ? b[1] : null, label: attr('<b' + m[1] + '>', 'aria-label') }; };
const mainOf = h => { const m = h.match(/<main class="g-main"([^>]*)>/); return m ? { enter: attr('<m' + m[1] + '>', 'data-enter') } : null; };
const shown = n => n > 9 ? '9+' : n ? String(n) : null;

/* ================== 3. шахта на каждом маршруте ================== */
const secOf = (route, scr) => route in EXPECT ? EXPECT[route] : scr && scr.back && scr.back in EXPECT ? EXPECT[scr.back] : '';
const shaft = (T.MAP || []).filter(m => /^Шахта/.test(m.where));
if (shaft.length !== T.NAV.length) say(`MAP: разделов шахты ${shaft.length}, а в NAV — ${T.NAV.length}`);
T.NAV.forEach(([k, n, p], i) => { const m = shaft[i]; if (!m || m.n !== n || m.p !== p) say(`NAV ${i + 1}: «${n}», иконка ${p} — а в MAP «${m ? m.n : '—'}», иконка ${m ? m.p : '—'}`); });
function checkShell(route, h, where) {
  const R = railOf(h); if (!R) { say(`${where}: нет шахты`); return; }
  if (R.length !== T.NAV.length) say(`${where}: в шахте ${R.length} кнопок, а разделов ${T.NAV.length}`);
  R.forEach((b, i) => {
    const [k, n, p] = T.NAV[i] || [];
    if (b.k !== k) say(`${where}: кнопка ${i + 1} — «${b.k}», а по NAV — «${k}»`);
    if (b.img !== T.PATH(p)) say(`${where}: у «${n}» не путевая иконка ${p}: ${b.img}`);
    if (b.lbl !== n) say(`${where}: подпись «${b.lbl}» вместо «${n}»`);
    if (!b.label || !b.label.startsWith(n) || b.title !== b.label) say(`${where}: у «${n}» нет aria-label и подсказки с именем раздела`);
    if (b.bdg != null && !/^([1-9]|9\+)$/.test(b.bdg)) say(`${where}: бейдж «${b.bdg}» у «${n}» — не число дел`);
    if (b.lamp && !b.cur) say(`${where}: язычок у невыбранного «${n}»`);
    if (b.cur && !b.lamp) say(`${where}: у выбранного «${n}» нет язычка`);
  });
  const cur = R.filter(b => b.cur).map(b => b.k), want = secOf(route, run(where + ' · экран', () => T.SCREENS[route]()));
  const railWant = want === 'wanderer' ? '' : want;
  if (cur.length > 1) say(`${where}: выбрано разделов ${cur.length}`);
  if ((cur[0] || '') !== railWant) say(`${where}: выбран «${cur[0] || 'ничего'}», а нужен «${railWant || 'ничего'}»`);
  const A = avaOf(h);
  if (!A) say(`${where}: нет портрета Странника`);
  else {
    if (A.cur !== (want === 'wanderer')) say(`${where}: портрет Странника ${A.cur ? 'выбран' : 'не выбран'} не по маршруту`);
    if (A.bdg != null && !/^([1-9]|9\+)$/.test(A.bdg)) say(`${where}: бейдж портрета «${A.bdg}» — не число дел`);
  }
  const B = bellOf(h);
  if (!B) say(`${where}: нет колокола Входящих`);
  else if (B.bdg != null && !/^([1-9]|9\+)$/.test(B.bdg)) say(`${where}: бейдж Входящих «${B.bdg}» — не число`);
  if (!/<button class="g-plus" data-a="go" data-v="store"/.test(h)) say(`${where}: нет «+» у Энериума с переходом в Лавку Энериума`);
  if (/class="plus"/.test(h)) say(`${where}: остался прежний «+» внутри числа Энериума`);
  const shell = (h.match(/<header class="g-top">[\s\S]*?<\/header>/) || [''])[0] + (h.match(/<nav class="g-rail"[\s\S]*?<\/nav>/) || [''])[0];
  if (/<span class="bdg[^"]*"[^>]*>[^<]*!/.test(shell)) say(`${where}: «!» в шапке или шахте`);
}
reset();
for (const route of Object.keys(T.SCREENS)) {
  if (route === 'battle') { run('бой: старт забега', () => T.startRun('s1', 'b1')); if (!T.S.runs.length) say('бой: забег не начался'); }
  T.S.route = route; T.S.overlay = null;
  const h = draw(route);
  checkShell(route, h, 'маршрут ' + route);
  if (!(route in EXPECT)) console.log(`заметка: маршрут «${route}» — нет в EXPECT, раздел по «назад»`);
  if (route === 'battle') T.S.runs = [];
  cnt.routes++;
}

/* ================== 4. бейджи — число дел ================== */
/* дела, посчитанные здесь, без шахты: по правилам карты экранов и договору экранов */
function expectTodo() {
  const S = T.S, o = {};
  const add = (k, n) => { o[k] = (o[k] || 0) + n; };
  add('shelter', Object.values(T.NPCS).filter(n => n.isNew).length);
  for (const r of S.runs) if (r.over && !r.seen) add(r.scene ? (EXPECT[r.scene.back] || '') : 'descent', 1);
  const mine = T.hrMine ? T.hrMine() : S.heroes;
  add('heroes', mine.filter(h => { const d = T.heroDev(h); return (d.atCap && d.rune && d.have >= d.need) || (d.open && h.valor < h.maxV && d.vrHave > 0); }).length);
  const need = T.RS.rules ? T.RS.rules.stub.shards : 0;
  if (need) add('heroes', T.RS.heroes.filter(h => (S.rs.shards[h.id] || 0) >= need && !T.rsHas(h) && h.c <= T.rsCyc()).length);
  add('craft', S.bag.chests.length ? 1 : 0);
  add('craft', S.market.mine.filter(l => l.st === 'sold').length);
  add('week', S.rituals && S.rituals.slots ? S.rituals.slots.filter(s => s.st === 'ready').length : 0);
  if (S.contracts) for (const k of ['day', 'week']) { const x = S.contracts[k]; if (x && ((x.st === 'draft' && x.tasks.length) || x.st === 'done')) add('week', 1); }
  if (T.darRows && S.zp && T.darRows(S).some(p => p.st === 'ok')) add('week', 1);
  add('wanderer', S.mem.slots.filter(s => s.st === 'open').length);
  return { sec: o, inbox: S.inbox.length + (S.gift && S.gift.got < S.gift.day ? 1 : 0) };
}
function checkBadges(where) {
  T.S.route = 'shelter'; T.S.overlay = null;
  const h = draw(where), R = railOf(h) || [], E = expectTodo(), A = avaOf(h), B = bellOf(h);
  for (const b of R) {
    if (b.lock) continue;
    const want = shown(E.sec[b.k] || 0);
    if (b.bdg !== want) say(`${where}: у «${b.k}» бейдж ${b.bdg || 'нет'}, а дел ${want || 'нет'}`);
    cnt.badges++;
  }
  if (A && A.bdg !== shown(E.sec.wanderer || 0)) say(`${where}: у портрета Странника бейдж ${A.bdg || 'нет'}, а мест Памяти ${shown(E.sec.wanderer || 0) || 'нет'}`);
  if (B && B.bdg !== shown(E.inbox)) say(`${where}: у Входящих бейдж ${B.bdg || 'нет'}, а писем и дара ${E.inbox}`);
  if (B && B.label !== `Входящие: ${E.inbox}`) say(`${where}: подпись колокола «${B.label}»`);
  cnt.cases++;
  return { R, E };
}
/* каждая строка NAV_TODO считает без исключений */
{
  reset();
  const X = { runs: sec => T.S.runs.filter(r => r.over && !r.seen && (r.scene ? T.navSection(r.scene.back) : 'descent') === sec).length,
    ct: f => T.S.contracts ? ['day', 'week'].filter(k => T.S.contracts[k] && f(T.S.contracts[k])).length : 0, heroes: () => T.navHeroes() };
  T.NAV_TODO.forEach(([sec, label, count], i) => {
    const q = run(`NAV_TODO ${i + 1} (${sec})`, () => count(X));
    if (!Number.isInteger(q) || q < 0) say(`NAV_TODO ${i + 1} (${sec}): количество ${q} — не целое неотрицательное`);
    const t = run(`NAV_TODO ${i + 1} (${sec}) · подпись`, () => label(2));
    if (typeof t !== 'string' || !t || /!/.test(t)) say(`NAV_TODO ${i + 1} (${sec}): подпись «${t}»`);
  });
}
/* демо-состояние и перемены */
reset();
{
  const base = checkBadges('бейджи · демо');
  if (!Object.values(base.E.sec).some(Boolean)) say('бейджи · демо: в демо-состоянии нет ни одного дела — проверка ничего не сравнила');
}
{
  const keep = Object.fromEntries(Object.entries(T.NPCS).map(([k, n]) => [k, n.isNew]));
  Object.values(T.NPCS).forEach(n => { n.isNew = false; });
  checkBadges('бейджи · разговоры прочитаны');
  Object.entries(keep).forEach(([k, v]) => { T.NPCS[k].isNew = v; });
}
reset(); T.S.bag.chests = []; checkBadges('бейджи · сундуки открыты');
reset(); T.S.market.mine.forEach(l => { l.st = 'sold'; }); checkBadges('бейджи · все лоты проданы');
reset();
if (T.S.rituals && T.S.rituals.slots) {
  T.S.rituals.slots = Array.from({ length: 12 }, (_, i) => Object.assign({}, T.S.rituals.slots[0], { uid: 'rtx' + i, st: 'ready' }));
  const { R } = checkBadges('бейджи · двенадцать ритуалов готовы');
  const w = R.find(b => b.k === 'week'); if (!w || w.bdg !== '9+') say(`бейджи · двенадцать ритуалов готовы: у Недели «${w && w.bdg}», а нужно «9+»`);
}
reset();
if (T.S.contracts) {
  T.S.contracts.day.st = 'signed'; checkBadges('бейджи · контракт дня подписан');
  T.S.contracts.day.st = 'done'; checkBadges('бейджи · контракт дня исполнен');
}
reset();
{   /* место Памяти закреплено: у места появляется пассивка p (screens/wanderer.js выводит st из неё) */
  const p0 = ctx.EN_WANDERER && ctx.EN_WANDERER.passives && ctx.EN_WANDERER.passives[0];
  T.S.mem.slots.forEach(s => { if (s.st === 'open') { if (Object.getOwnPropertyDescriptor(s, 'st').set || !Object.getOwnPropertyDescriptor(s, 'st').get) s.st = 'set'; else s.p = p0 ? p0.id : 'p1'; } });
  if (T.S.mem.slots.some(s => s.st === 'open')) say('бейджи · Память выбрана: место не закрылось');
  checkBadges('бейджи · Память выбрана');
}
reset(); T.S.inbox = []; T.S.gift.got = T.S.gift.day; checkBadges('бейджи · Входящие пусты');
reset();
{
  run('бейджи · забег', () => T.startRun('s1', 'b1'));
  const R0 = T.S.runs[0];
  if (R0) {
    R0.over = true; R0.seen = false; checkBadges('бейджи · итог забега ждёт');
    R0.seen = true; checkBadges('бейджи · итог забега просмотрен');
  } else say('бейджи · забег: не начался');
  T.S.runs = [];
}

/* ================== 5. закрытый раздел ================== */
reset();
for (const [k, lvl] of Object.entries(T.NAV_OPEN)) {
  T.S.acc.level = lvl - 1; T.S.route = 'shelter';
  const R = railOf(draw('закрыт · ' + k)) || [], b = R.find(x => x.k === k);
  if (!b) { say(`закрыт · ${k}: нет кнопки`); continue; }
  if (!/\block\b/.test(b.cls) || !b.lock) say(`закрыт · ${k}: на уровне ${lvl - 1} нет замка`);
  if (b.a !== 'toast' || !b.v || !b.v.includes(`${lvl}-м уровне`)) say(`закрыт · ${k}: вместо перехода нет условия открытия — ${b.a} «${b.v}»`);
  if (b.bdg != null) say(`закрыт · ${k}: у закрытого раздела бейдж`);
  run(`закрыт · ${k} · нажатие`, () => T.ACT.toast(b.v));
  if (!T.S.toast || !T.S.toast.t.includes(`${lvl}-м уровне`)) say(`закрыт · ${k}: нажатие не объясняет условие`);
  T.S.acc.level = lvl; T.S.toast = null;
  const R2 = railOf(draw('открыт · ' + k)) || [], b2 = R2.find(x => x.k === k);
  if (!b2 || /\block\b/.test(b2.cls) || b2.a !== 'go') say(`открыт · ${k}: на уровне ${lvl} раздел всё ещё закрыт`);
  reset();
}

/* ================== 6. переход между разделами ================== */
reset();
const step = (route, where, want) => {
  T.S.route = route; T.S.overlay = null;
  const h = draw(where), R = railOf(h) || [], M = mainOf(h) || {}, cur = R.find(b => b.cur), A = avaOf(h);
  if ((M.enter || '') !== want.enter) say(`${where}: экран входит «${M.enter || 'без перехода'}», а нужно «${want.enter || 'без перехода'}»`);
  if (want.d != null) { if (!cur || !cur.lamp || !/\bgo\b/.test(cur.lamp.cls) || String(cur.lamp.d) !== String(want.d)) say(`${where}: язычок едет ${cur && cur.lamp ? `«${cur.lamp.cls}» на ${cur.lamp.d}` : '—'}, а нужно на ${want.d}`); }
  else if (cur && cur.lamp && /\bgo\b/.test(cur.lamp.cls)) say(`${where}: язычок едет без смены раздела`);
  if (want.lit && (!cur || !cur.lamp || !/\blit\b/.test(cur.lamp.cls))) say(`${where}: язычок не проявляется`);
  if (want.wanderer && (!A || !A.cur)) say(`${where}: портрет Странника не выбран`);
  if (want.store && !/<button class="g-plus" data-a="go" data-v="store"[^>]*aria-current="page"/.test(h)) say(`${where}: «+» у Энериума не отмечен`);
  cnt.moves++;
};
T.S.route = 'shelter'; draw('переход · старт');
step('shelter', 'переход · та же отрисовка', { enter: '' });
step('heroes', 'переход · Убежище → Герои', { enter: 'down', d: -2 });
step('heroes', 'переход · Герои ещё раз', { enter: '' });
step('week', 'переход · Герои → Неделя', { enter: 'down', d: -2 });
step('echo', 'переход · Неделя → Эхо, тот же раздел', { enter: '' });
step('shelter', 'переход · Эхо → Убежище', { enter: 'up', d: 4 });
step('profile', 'переход · Убежище → Странник', { enter: 'up', wanderer: true });
step('chronicle', 'переход · Странник → Летопись, тот же портрет', { enter: '', wanderer: true });
step('descent', 'переход · Летопись → Спуск', { enter: 'down', lit: true });
step('store', 'переход · Спуск → Лавка Энериума', { enter: 'fade', store: true });
step('craft', 'переход · Лавка → Ремесло', { enter: 'fade', lit: true });
/* сценарий презентации ведёт к шахте с переходом */
{
  const fl = (T.FLOWS || []).find(x => x[0] === 'Шахта: разделы и дела');
  if (!fl) say('нет сценария презентации «Шахта: разделы и дела»');
  else {
    reset(); T.S.route = 'shelter'; draw('сценарий шахты · старт');
    run('сценарий шахты', () => fl[2]());
    const R = railOf(draw('сценарий шахты')) || [], cur = R.find(b => b.cur);
    if (!cur || !cur.lamp || !/\bgo\b/.test(cur.lamp.cls)) say('сценарий шахты: раздел не сменился с переходом');
  }
}
/* ключевые кадры: только transform и opacity */
{
  const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  const frames = {};
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) frames[m[1]] = m[2];
  const used = new Set([...css.matchAll(/\.g-(?:nav|main)[^{]*\{[^}]*animation:\s*([\w-]+)/g)].map(m => m[1]));
  if (!used.size) say('CSS: у шахты и экрана нет анимации перехода');
  for (const name of used) {
    if (!frames[name]) { say(`CSS: нет ключевых кадров ${name}`); continue; }
    const props = [...frames[name].matchAll(/([\w-]+)\s*:/g)].map(m => m[1]).filter(p => !/^(from|to)$/.test(p));
    const bad = props.filter(p => !ANIM_PROPS.includes(p));
    if (bad.length) say(`CSS: переход ${name} меняет ${[...new Set(bad)].join(', ')} — можно только transform и opacity`);
  }
  if (!/prefers-reduced-motion:reduce\)\{\*,\*::before,\*::after\{animation-duration/.test(css.replace(/\s+/g, ''))) say('CSS: нет «меньше движения» для анимаций');
}

/* ================== 7. вёрстка расчётом ================== */
{
  const css = ((html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '').replace(/\r?\n/g, ' ');
  const rootVar = n => { const m = css.match(new RegExp(`${n}:(\\d+(?:\\.\\d+)?)px`)); return m ? +m[1] : NaN; };
  const rule = sel => { const m = css.match(new RegExp('(?:^|[};/])\\s*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')); return m ? m[1] : ''; };   // правило целиком, не хвост чужого селектора
  const px = (body, prop) => { const m = body.match(new RegExp(`(?:^|;)${prop}:(-?\\d+(?:\\.\\d+)?)px`)); return m ? +m[1] : NaN; };
  const g = rule('.g'), gs = rule('.g.sm');
  const frames = [[px(g, 'width'), px(g, 'height'), px(g, '--top'), px(g, '--rail')], [px(gs, 'width'), px(gs, 'height'), px(gs, '--top'), px(gs, '--rail')]];
  const railRule = rule('.g-rail'), padM = railRule.match(/padding:var\((--[\w-]+)\) 0/), pad = padM ? rootVar(padM[1]) : px(railRule, 'padding');
  const nav = rule('.g-nav'), pic = rule('.g-nav .pic'), lbl = rule('.g-nav .lbl'), bdgPos = rule('.g-nav .bdg'), bdg = rule('.bdg');
  const gap = px(nav, 'gap'), picW = px(pic, 'width'), picH = px(pic, 'height');
  const lblFont = (lbl.match(/font:700 (\d+(?:\.\d+)?)px\/(\d+(?:\.\d+)?)/) || []), lblSize = +lblFont[1], lblLine = +lblFont[2] * +lblFont[1];
  const lblTrack = +((lbl.match(/letter-spacing:(\.?\d+(?:\.\d+)?)em/) || [])[1]), lblPad = +((lbl.match(/padding:0 (\d+)px/) || [])[1] || 0);
  const bdgRight = -px(bdgPos, 'right'), bdgMin = px(bdg, 'min-width'), bdgFont = +((bdg.match(/font:700 (\d+(?:\.\d+)?)px/) || [])[1]), bdgPadX = +((bdg.match(/padding:0 (\d+)px/) || [])[1] || 0);
  const hideH = +((css.match(/@container rail \(max-height:(\d+)px\)/) || [])[1]) + 1, hideW = +((css.match(/@container rail \(max-width:(\d+)px\)/) || [])[1]) + 1;
  const narrow = +((css.match(/\.g\.full\{--rail:(\d+)px\}/) || [])[1]);
  const nums = { 'ширина и высота экранов': frames.flat(), 'поля шахты': pad, 'картинка': picW, 'шаг картинки и подписи': gap, 'подпись': lblSize, 'разрядка подписи': lblTrack,
    'бейдж': bdgMin, 'порог высоты': hideH, 'порог ширины': hideW, 'узкая шахта': narrow };
  for (const [n, v] of Object.entries(nums)) if ([].concat(v).some(x => !Number.isFinite(x))) say(`вёрстка: не нашёл в CSS — ${n}`);
  const content = picH + gap + lblLine, longest = Math.max(...T.NAV.map(([, n]) => n.length));
  const lblW = longest * (CHAR_EM + lblTrack) * lblSize + 2 * lblPad, badgeW = Math.max(bdgMin, 2 * 0.55 * bdgFont + 2 * bdgPadX);
  for (const [w, h, top, rail] of frames) {
    const railH = h - top, stepH = (railH - 2 * pad) / T.NAV.length, where = `вёрстка ${w} × ${h}`;
    if (stepH < content) say(`${where}: шаг шахты ${stepH} px, а картинка с подписью — ${content}`);
    if (stepH < TOUCH || rail < TOUCH) say(`${where}: зона нажатия ${rail} × ${stepH} меньше ${TOUCH} px`);
    if (lblW > rail - 2 * LABEL_MARGIN) say(`${where}: подпись «${T.NAV.find(([, n]) => n.length === longest)[1]}» около ${Math.round(lblW)} px — шире шахты ${rail} px с полями`);
    if (rail / 2 + picW / 2 + bdgRight > rail) say(`${where}: бейдж вылезает за шахту`);
    if (rail / 2 + picW / 2 + bdgRight - badgeW < rail / 2 - picW / 2) say(`${where}: бейдж «9+» шире картинки`);
    if (railH < hideH || rail < hideW) say(`${where}: подписи на этом экране спрятаны — шахта ${rail} × ${railH}`);
  }
  if ((hideH - 2 * pad) / T.NAV.length < content) say(`вёрстка: на пороге ${hideH} px подпись уже не помещается — шаг ${(hideH - 2 * pad) / T.NAV.length} px, а нужно ${content}`);
  if (narrow >= hideW) say(`вёрстка: узкая шахта ${narrow} px шире порога ${hideW} — подписи на узком телефоне не спрячутся`);
  /* SHELL_SIZE UI-кита — зеркало CSS */
  const Z = T.SHELL_SIZE;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(Z.frames, frames)) say(`SHELL_SIZE.frames ${JSON.stringify(Z.frames)} ≠ CSS ${JSON.stringify(frames)}`);
  for (const [k, v] of Object.entries({ pad, pic: picW, gap, lbl: lblSize, hideH, hideW, narrow })) if (Z[k] !== v) say(`SHELL_SIZE.${k} = ${Z[k]}, а в CSS — ${v}`);
  console.log(`Вёрстка: ${frames.map(([w, h, top, rail]) => `${w} × ${h} — шахта ${rail} × ${h - top}, шаг ${Math.round((h - top - 2 * pad) / T.NAV.length * 10) / 10}`).join('; ')}; кнопка ${content} px, подпись до ${Math.round(lblW)} px.`);
}

/* ================== 8. UI-кит ================== */
{
  const K = (T.KIT_EXTRA || []).find(x => { try { return /Оболочка и навигация/.test(x.html()); } catch (_) { return false; } });
  if (!K) say('UI-кит: нет раздела «Оболочка и навигация» в KIT_EXTRA');
  else {
    const h = run('UI-кит · раздел', () => K.html()) || '';
    const m = h.match(BAD); if (m) say(`UI-кит: в разметке undefined, NaN или [object — «${m[0]}»`);
    run('UI-кит · paint', () => K.paint && K.paint());
    const Z = T.SHELL_SIZE, n1 = v => String(Math.round(v * 10) / 10).replace('.', ',');
    for (const [w, hh, top, rail] of Z.frames) { const t = `${w} × ${hh}: шахта ${rail} × ${hh - top}, шаг ${n1((hh - top - 2 * Z.pad) / T.NAV.length)} px`; if (!h.includes(t)) say(`UI-кит: нет строки размеров «${t}»`); }
    if (!/class="k-shell-dev" id="kitShell"/.test(h) || !/<nav class="g-rail"/.test(h)) say('UI-кит: нет живой шахты');
    if ((h.match(/<figure>/g) || []).length < 5) say('UI-кит: показаны не все состояния кнопки');
  }
}

/* ================== 9. хвосты задачи ================== */
if (!RX || !RX.drops) say('recipes.js не прочитан');
else if ('contracts' in RX.drops) say('recipes.js: осталась заглушка drops.contracts — награды контрактов только в contracts.js');
if (LBX && CT) {
  const Tp = LBX.modes.contract.typical, who = { free: 'o', fan: 'e' };
  for (const c of CT.rules.cycles) for (const [k, p] of Object.entries(who)) {
    const got = CT.planks[c].filter(x => CT.econ[c][p].pts >= x).length;
    if (Tp[k].me !== got) say(`лутбоксы: «Контракты», ${k} — ${Tp[k].me}-я планка, а по прогону контрактов в цикле ${c} — ${got}-я`);
  }
} else say('lootboxes.js или contracts.js не прочитаны');

/* ================== 10. тонкие линии, портрет в ячейке, сильные кнопки ==================
   Слова автора 01.10.2026 со снимками оболочки: «Линии общего интерфейся слишком толстые что-ли, то есть они прям зибирают много
   воздуха, рамки тоже толстые, иконка странника вылезает на интерфейс и сами кнопки слабые». Законы — функции от стилей, переменных
   <html> и разметки: проверка мутацией зовёт их с поломкой и ждёт ошибку. */
const CC = require('./css_cascade.js');
const THIN = 2;                    // линия и рамка оболочки — не толще, px
const AVA_PAD = 2;                 // поле портрета, уровня и бейджа до краёв своей ячейки — не меньше, px
const DIGIT_EM = 0.62;             // ширина цифры уровня и бейджа в em — с запасом для PT Sans Narrow Bold
const SPIRIT = '72,229,212';       // свет духа — цвет выбранного
const SHELL_SEL = /\.g-(?:top|rail|nav|ava|icon|wallet|back)\b|\.sh-md|\.sh-meds/;   // правила оболочки и медальонов Убежища
const SH = ctx.EN_SHELL;
const FR = [{ n: '932 × 430', i: 0, small: false }, { n: '844 × 390', i: 1, small: true }];
const pxOf = v => { const m = String(v == null ? '' : v).trim().match(/^(-?[\d.]+)px$/); return m ? +m[1] : null; };
/* длина: px, % от base, calc() из px и % — так пишутся смещения оболочки */
function lenOf(v, base) {
  const s = String(v == null ? '' : v).trim(), c = s.match(/^calc\((.*)\)$/), body = c ? c[1] : s;
  let sum = 0, ok = false;
  for (const m of body.replace(/\s*([+-])\s*/g, ' $1').trim().split(/\s+(?=[+-])/)) {
    const t = m.replace(/\s+/g, ''), x = t.match(/^([+-]?[\d.]+)(px|%)$/); if (!x) return null;
    sum += x[2] === '%' ? +x[1] * base / 100 : +x[1]; ok = true;
  }
  return ok ? sum : null;
}
const borderW = v => { for (const x of String(v).trim().split(/\s+(?![^(]*\))/)) { if (/^(none|hidden)$/.test(x)) return '0'; if (/^(solid|dashed|dotted|double|groove|ridge|inset|outset)$/.test(x)) return null; if (/^(?:-?[\d.]+(?:px)?|thin|medium|thick|var\(.*\)|calc\(.*\))$/.test(x)) return x; } return null; };
const CORNER = +((html.match(/\.p-device-inner\{border-radius:(\d+)px/) || [])[1]);   // скругление угла экрана прототипа
const RULES_ALL = CC.sheets(UI, html);
const rootStyle = vars => Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
const treeOf = (small, markup, vars) => CC.wrap([['html', { class: [...rootCls].join(' '), lang: 'ru', style: rootStyle(vars) }], ['body', {}], ['div', { class: 'p-device', id: 'device' }],
  ['div', { class: 'p-device-inner' }], ['div', { class: small ? 'g sm' : 'g', id: 'game', lang: 'ru' }]], markup);
const envOf = fr => { const [w, h, top, rail] = T.SHELL_SIZE.frames[fr.i]; return { w, h, reduced: false, hover: false, containers: { main: [w - rail, h - top], rail: [rail, h - top] } }; };
const in1 = (root, pred) => CC.q(root, pred)[0];
const has = (...c) => e => c.every(k => e.cls.has(k));
const inside = (k, ...c) => e => c.every(x => e.cls.has(x)) && CC.within(e.parent || e, a => a.cls.has(k));

/* а) толщины — из данных */
function lawThin(rules, view, vars, g) {
  const out = [];
  for (const k of ['line', 'frame']) for (const v of view[k]) if (!Number.isInteger(v) || v < 1 || v > THIN) out.push(`SHL_VIEW.${k}: ${v} px — нить не толще ${THIN} px (слово автора: «слишком толстые»)`);
  for (const fr of FR) {
    const root = treeOf(fr.small, g, vars), C = new CC.Cascade(rules, envOf(fr)), want = { line: view.line[fr.i], frame: view.frame[fr.i] };
    const chk = (what, e, prop, pe, kind) => {
      if (!e) { out.push(`${fr.n}: в разметке нет — ${what}`); return; }
      const v = pe ? C.pvalue(e, pe, prop) : C.value(e, prop);
      if (pxOf(v) !== want[kind]) out.push(`${fr.n}: ${what} — ${v || 'нет'}, а SHL_VIEW.${kind} — ${want[kind]} px`);
    };
    chk('нить под шапкой (.g-top)', in1(root, has('g-top')), 'border-bottom-width', null, 'line');
    chk('кромка шахты (.g-rail)', in1(root, has('g-rail')), 'border-right-width', null, 'line');
    chk('кромка ячейки портрета (.g-ava)', in1(root, has('g-ava')), 'border-right-width', null, 'line');
    chk('рамка колокола (.g-icon)', in1(root, has('g-icon')), 'border-top-width', null, 'frame');
    chk('рамка уровня Странника (.g-ava .lv)', in1(root, inside('g-ava', 'lv')), 'border-top-width', null, 'frame');
    chk('нить картинки раздела (.g-nav .nv::before)', in1(root, has('nv')), 'border-top-width', 'before', 'frame');
    chk('медальон «Чат» (.sh-md::before)', in1(root, has('sh-md')), 'border-top-width', 'before', 'frame');
    chk('медальон «Дар дня» (.ps-sb::before)', in1(root, has('ps-sb')), 'border-top-width', 'before', 'frame');
  }
  /* в стилях оболочки толщина рамки — только переменной, кольцо тенью — не толще THIN */
  for (const r of rules) {
    if (!(r.src === 'screens/shell.css' || ((r.src === 'index.html' || r.src === 'screens/shelter.css') && SHELL_SEL.test(r.sel)))) continue;
    for (const d of r.decls) {
      if (/^border(?:-(?:top|right|bottom|left))?(?:-width)?$/.test(d.p)) {
        const w = /-width$/.test(d.p) ? d.v.trim().split(/\s+(?![^(]*\))/)[0] : borderW(d.v);
        if (w && w !== '0' && !/^var\(--shl-(?:ln|fr)\b/.test(w)) out.push(`${r.src} «${r.sel}»: толщина рамки «${w}» — не из данных (var(--shl-ln) или var(--shl-fr))`);
      }
      if (d.p === 'box-shadow') for (const m of d.v.matchAll(/(?:^|,)\s*(?:inset\s+)?0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+([\d.]+)px/g)) if (+m[1] > THIN) out.push(`${r.src} «${r.sel}»: кольцо тенью ${m[1]} px — толще нити ${THIN} px`);
    }
  }
  return out;
}

/* б) портрет Странника — в своей ячейке; колокол и бейджи — вне скруглённых углов экрана */
function lawAva(rules, vars, g) {
  const out = [];
  if (!Number.isFinite(CORNER)) return ['index.html: не нашёл скругление угла экрана (.p-device-inner)'];
  /* угол: точка прямоугольника в квадрате угла дальше радиуса от его середины — уходит под скругление */
  const corner = (b, cx, cy, left) => { for (const [x, y] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]) { const dx = left ? cx - x : x - cx, dy = cy - y; if (dx > 0 && dy > 0 && dx * dx + dy * dy > CORNER * CORNER + 0.01) return true; } return false; };
  for (const fr of FR) {
    const [W, , TOP, RAIL] = T.SHELL_SIZE.frames[fr.i], root = treeOf(fr.small, g, vars), C = new CC.Cascade(rules, envOf(fr));
    const top = in1(root, has('g-top')), ava = in1(root, has('g-ava')), ring = in1(root, inside('g-ava', 'ring')), lv = in1(root, inside('g-ava', 'lv'));
    const bdg = in1(root, e => e.cls.has('bdg') && e.parent === ava), bell = in1(root, has('g-icon')), bb = bell && in1(bell, has('bdg'));
    if (!top || !ava || !ring || !lv || !bell) { out.push(`${fr.n}: в разметке нет шапки, портрета, кольца, уровня или колокола`); continue; }
    const line = pxOf(C.value(top, 'border-bottom-width')) || 0, lineR = pxOf(C.value(ava, 'border-right-width')) || 0;
    const cw = RAIL - lineR, ch = TOP - line, s = pxOf(C.value(ring, 'width'));
    if (!Number.isFinite(s)) { out.push(`${fr.n}: каскад не дал стороны кольца портрета`); continue; }
    const x0 = (cw - s) / 2, y0 = (ch - s) / 2, boxes = [{ n: 'кольцо портрета', x: x0, y: y0, w: s, h: s }];
    /* уровень: смещения — от кольца; ширина — по самому длинному уровню, трёхзначному */
    const fs = pxOf(C.value(lv, 'font-size')) || 11, pad = (pxOf(C.value(lv, 'padding-left')) || 0) + (pxOf(C.value(lv, 'padding-right')) || 0), bw = 2 * (pxOf(C.value(lv, 'border-left-width')) || 0);
    const lvW = Math.max(pxOf(C.value(lv, 'min-width')) || 0, 3 * DIGIT_EM * fs + pad + bw), lvH = pxOf(C.value(lv, 'height')) || 0;
    const lvR = lenOf(C.value(lv, 'right'), s), lvB = lenOf(C.value(lv, 'bottom'), s);
    if (lvR == null || lvB == null) out.push(`${fr.n}: уровень Странника стоит не смещениями right и bottom от кольца`);
    else boxes.push({ n: 'уровень Странника', x: x0 + s - lvR - lvW, y: y0 + s - lvB - lvH, w: lvW, h: lvH });
    /* бейдж мест Памяти — «9+» */
    const bdgEl = bdg || bb, bH = bdgEl ? pxOf(C.value(bdgEl, 'height')) || 17 : 17, bFs = bdgEl ? pxOf(C.value(bdgEl, 'font-size')) || 10.5 : 10.5;
    const bPad = bdgEl ? (pxOf(C.value(bdgEl, 'padding-left')) || 0) + (pxOf(C.value(bdgEl, 'padding-right')) || 0) : 8, bW = Math.max(bdgEl ? pxOf(C.value(bdgEl, 'min-width')) || 17 : 17, 2 * DIGIT_EM * bFs + bPad);
    if (bdg) {
      const bx = lenOf(C.value(bdg, 'left'), cw), by = lenOf(C.value(bdg, 'top'), ch);
      if (bx == null || by == null) out.push(`${fr.n}: бейдж Странника стоит не смещениями left и top`);
      else boxes.push({ n: 'бейдж Странника «9+»', x: bx, y: by, w: bW, h: bH });
    }
    for (const b of boxes) {
      if (b.x < AVA_PAD - 0.01 || b.y < AVA_PAD - 0.01 || b.x + b.w > cw - AVA_PAD + 0.01 || b.y + b.h > ch - AVA_PAD + 0.01)
        out.push(`${fr.n}: ${b.n} вылезает из ячейки портрета ${cw} × ${ch}: ${b.x.toFixed(1)}…${(b.x + b.w).toFixed(1)} × ${b.y.toFixed(1)}…${(b.y + b.h).toFixed(1)}, поле ${AVA_PAD} px`);
      if (corner(b, CORNER, CORNER, true)) out.push(`${fr.n}: ${b.n} заходит в скруглённый угол экрана слева (${CORNER} px)`);
    }
    /* колокол — последний в шапке, у правого поля; его бейдж «9+» — вне скруглённого угла */
    const padR = pxOf(C.value(top, 'padding-right')), bs = pxOf(C.value(bell, 'width'));
    if (!Number.isFinite(padR) || !Number.isFinite(bs)) { out.push(`${fr.n}: каскад не дал поля шапки или стороны колокола`); continue; }
    const bellBox = { n: 'колокол', x: W - padR - bs, y: (ch - bs) / 2, w: bs, h: bs };
    const bTop = bb ? lenOf(C.value(bb, 'top'), bs) : -3, bRight = bb ? lenOf(C.value(bb, 'right'), bs) : -3;
    const badge = { n: 'бейдж колокола «9+»', x: bellBox.x + bs - bRight - bW, y: bellBox.y + bTop, w: bW, h: bH };
    for (const b of [bellBox, badge]) {
      if (b.y < 0 || b.x + b.w > W) out.push(`${fr.n}: ${b.n} выходит за экран`);
      if (corner(b, W - CORNER, CORNER, false)) out.push(`${fr.n}: ${b.n} заходит в скруглённый угол экрана справа (${CORNER} px): ${b.x.toFixed(1)}…${(b.x + b.w).toFixed(1)} × ${b.y.toFixed(1)}`);
    }
  }
  return out;
}

/* в) состояния кнопок различимы видом и говорят своё */
function lawStates(rules, vars, m) {
  const out = [];
  for (const fr of FR) {
    const root = treeOf(fr.small, m, vars), C = new CC.Cascade(rules, envOf(fr));
    const navs = CC.q(root, has('g-nav')), sig = {};
    for (const b of navs) {
      const st = b.attrs.get('data-state'), img = in1(b, e => e.tag === 'img'), nv = in1(b, has('nv')), lbl = in1(b, has('lbl'));
      if (!st || !img || !nv) continue;
      sig[st] = { img: `${C.value(img, 'opacity')} ${C.value(img, 'filter')}`, frame: `${C.pvalue(nv, 'before', 'border-top-color')} ${C.pvalue(nv, 'before', 'box-shadow')}`, lbl: `${C.value(lbl, 'color')} ${C.value(lbl, 'opacity')}` };
    }
    const S4 = ['обычная', 'с делами', 'выбранная', 'закрытая'];
    const miss = S4.filter(k => !sig[k]);
    if (miss.length) { out.push(`${fr.n}: нет кнопки раздела в состоянии ${miss.map(k => `«${k}»`).join(', ')}`); continue; }
    for (let i = 0; i < S4.length; i++) for (let j = i + 1; j < S4.length; j++) { const a = sig[S4[i]], b = sig[S4[j]]; if (a.img === b.img && a.frame === b.frame && a.lbl === b.lbl) out.push(`${fr.n}: кнопки «${S4[i]}» и «${S4[j]}» не различить — картинка, нить и подпись одинаковы`); }
    if (sig['с делами'].frame === sig['обычная'].frame) out.push(`${fr.n}: у кнопки с делами нить — как у обычной`);
    if (!sig['выбранная'].frame.includes(SPIRIT)) out.push(`${fr.n}: выбранная кнопка не светится духом — нить ${sig['выбранная'].frame}`);
    if (!/grayscale\(1\)/.test(sig['закрытая'].img)) out.push(`${fr.n}: картинка закрытого раздела не серая — ${sig['закрытая'].img}`);
    /* колокол: письма есть и нет */
    const bells = CC.q(root, has('g-icon')), bsig = bells.map(e => `${C.value(e, 'border-top-color')} ${C.value(e, 'box-shadow')}`);
    if (bells.length < 2) out.push(`${fr.n}: нет двух колоколов — с письмами и без`); else if (bsig[0] === bsig[1]) out.push(`${fr.n}: колокол с письмами и без не различить`);
    /* медальоны Убежища: ждёт игрока и нет */
    for (const [n, sel] of [['«Дар дня»', 'gift'], ['«Пропуск»', 'pass'], ['«Чат»', 'chat']]) {
      const two = CC.q(root, e => e.attrs.get('data-med') === sel);
      if (two.length !== 2) { out.push(`${fr.n}: нет двух медальонов ${n} — ждёт игрока и нет`); continue; }
      const s2 = two.map(e => `${C.pvalue(e, 'before', 'border-top-color')} ${C.pvalue(e, 'before', 'box-shadow')}`);
      if (s2[0] === s2[1]) out.push(`${fr.n}: медальон ${n} «ждёт игрока» не отличить от спокойного`);
    }
  }
  /* разметка: закрытая — замок и уровень открытия, с делами — число, выбранная — язычок */
  const lock = (m.match(/<button data-state="закрытая"[\s\S]*?<\/button>/) || [''])[0];
  if (!/class="lk"/.test(lock) || !lock.includes(`<b>ур. ${T.NAV_OPEN.week}</b>`)) out.push(`закрытый раздел: нет замка или «ур. ${T.NAV_OPEN.week}» на картинке`);
  const todo = (m.match(/<button data-state="с делами"[\s\S]*?<\/button>/) || [''])[0];
  if (!/<span class="bdg"[^>]*>\d+<\/span>/.test(todo)) out.push('кнопка с делами: нет бейджа с числом');
  const cur = (m.match(/<button data-state="выбранная"[\s\S]*?<\/button>/) || [''])[0];
  if (!/aria-current="page"/.test(cur) || !/class="lamp/.test(cur)) out.push('выбранная кнопка: нет aria-current или язычка');
  return out;
}

{
  if (!SH) say('screens/shell.js: нет window.EN_SHELL — числа вида оболочки не прочитаны');
  else {
    const V = SH.SHL_VIEW;
    /* разметка: игра на Убежище (шапка, шахта, медальоны) и образцы состояний */
    reset(); T.S.route = 'shelter'; T.S.overlay = null;
    const g = draw('законы оболочки · Убежище');
    const it = k => T.NAV.find(x => x[0] === k), mark = (h, st) => h.replace(/^<button /, `<button data-state="${st}" `);
    const navs = [mark(T.navItem(it('craft')), 'обычная'), mark(T.navItem(it('craft'), { todo: [{ n: 2, q: 2, t: 'сундука в запасах' }] }), 'с делами'),
      mark(T.navItem(it('heroes'), { cur: true, mv: {} }), 'выбранная'), mark(T.navItem(it('week'), { lock: T.NAV_OPEN.week }), 'закрытая')].join('');
    const bell = n => `<button class="g-icon" data-a="sheet" data-v="inbox" aria-label="Входящие: ${n}">${n ? `<span class="bdg" aria-hidden="true">${n}</span>` : ''}</button>`;
    const meds0 = T.psShelterBtns ? T.psShelterBtns() : '', chat0 = T.shChat ? T.shChat() : '';
    const gift = (meds0.match(/<button class="btn sm ps-sb[^"]*" data-a="dlg" data-v="gift"[\s\S]*?<\/button>/) || [''])[0], pass = (meds0.match(/<button class="btn sm ps-sb[^"]*" data-a="go" data-v="store:pass"[\s\S]*?<\/button>/) || [''])[0];
    const med = (h, k) => h.replace(/^<button /, `<button data-med="${k}" `);
    const calm = h => h.replace(/ hot"/, '"').replace(/<i class="dot"[^>]*><\/i>/, '').replace(/<span class="bdg"[^>]*>[^<]*<\/span>/, '');
    if (!/ hot"/.test(gift) || !/class="dot"/.test(pass) || !/class="bdg"/.test(chat0)) say('законы оболочки: в демо «Дар дня» не ждёт, у «Пропуска» нет точки или у «Чата» нет непрочитанного — состояния медальонов не сверить');
    const meds = `<section class="scr flush sh"><div class="sh-ui"><div class="sh-top"><div class="sh-meds">${med(gift, 'gift')}${med(calm(gift), 'gift')}${med(pass, 'pass')}${med(calm(pass), 'pass')}</div></div><div class="sh-bot">${med(chat0, 'chat')}${med(calm(chat0), 'chat')}</div></div></section>`;
    const states = `<header class="g-top">${bell(7)}${bell(0)}</header><nav class="g-rail" aria-label="Разделы">${navs}</nav><main class="g-main">${meds}</main>`;
    const laws = [['а', () => lawThin(RULES_ALL, V, rootVars, g)], ['б', () => lawAva(RULES_ALL, rootVars, g)], ['в', () => lawStates(RULES_ALL, rootVars, states)]];
    for (const [k, f] of laws) for (const e of run(`закон ${k}`, f) || []) say(`закон ${k}: ${e}`);
    /* проверка мутацией: ломаем — закон обязан упасть */
    const plus = (css, src) => RULES_ALL.concat(CC.parseCss(css, src));
    const thick = Object.assign({}, rootVars, { '--shl-ln0': '9px', '--shl-ln1': '8px' });
    const MUT = [
      ['а', 'кромка 9 px в данных — как была', () => lawThin(RULES_ALL, Object.assign({}, V, { line: [9, 8] }), thick, g)],
      ['а', 'толщина кромки шахты числом, не из данных', () => lawThin(plus('.g-rail{border-right:9px solid #000}', 'screens/shell.css'), V, rootVars, g)],
      ['а', 'толстое кольцо тенью вокруг картинки раздела', () => lawThin(plus('.g-nav .pic{box-shadow:0 0 0 6px #0a0d0f}', 'screens/shell.css'), V, rootVars, g)],
      ['б', 'уровень Странника опущен на линию шапки', () => lawAva(plus('.g-ava .lv{bottom:-9px}', 'index.html'), rootVars, g)],
      ['б', 'колокол прижат к правому краю — бейдж в скруглённом углу', () => lawAva(plus('.g-top{padding-right:4px}', 'index.html'), rootVars, g)],
      ['в', 'у кнопки с делами нет своего вида', () => lawStates(RULES_ALL.filter(r => !/:has\(\.bdg\)/.test(r.sel)), rootVars, states)],
      ['в', 'у закрытого раздела нет уровня открытия', () => lawStates(RULES_ALL, rootVars, states.replace(/<b>ур\. \d+<\/b>/, ''))],
      ['в', 'медальон «ждёт игрока» как спокойный', () => lawStates(RULES_ALL.filter(r => !/\.ps-sb\.hot::before/.test(r.sel)), rootVars, states)],
    ];
    let caught = 0;
    for (const [k, what, f] of MUT) { const e = run(`мутация «${what}»`, f) || []; if (e.length) caught++; else say(`мутация «${what}»: закон ${k} её не поймал`); }
    console.log(`Законы оболочки: толщины — линия ${V.line.join(' / ')} px, рамка ${V.frame.join(' / ')} px; портрет и колокол в своих границах; четыре состояния кнопки различимы; мутаций ${MUT.length}, поймано ${caught}.`);
  }
}

done();

function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Оболочка: маршрутов ${cnt.routes}, отрисовок ${cnt.draws}, бейджей сверено ${cnt.badges} в ${cnt.cases} состояниях, переходов ${cnt.moves}.`);
  console.log('Проверка пройдена: шахта из пяти разделов на каждом маршруте, бейджи — число дел, закрытый раздел объясняет условие, переход — transform и opacity, вёрстка на 932 × 430 и 844 × 390, раздел UI-кита, хвосты; линии и рамки — тонкие и из данных, портрет Странника — в своей ячейке, состояния кнопок различимы, мутации пойманы.');
}
