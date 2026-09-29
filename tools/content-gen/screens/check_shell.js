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
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
  querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
  documentElement: stubEl('html'), activeElement: null, fonts: null };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
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
  get S() { return S; }, set S(v) { S = v; }, render, initialState, SCREENS, ACT, NAV, NAV_OPEN, NAV_TODO, navSection, navHeroes, navStep,
  NPCS, MAP, PATH, KIT_EXTRA, SHELL_SIZE, FLOWS, startRun, RS, rsHas, rsCyc, heroDev,
  hrMine: typeof hrMine === 'function' ? hrMine : null, darRows: typeof darRows === 'function' ? darRows : null,
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

done();

function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Оболочка: маршрутов ${cnt.routes}, отрисовок ${cnt.draws}, бейджей сверено ${cnt.badges} в ${cnt.cases} состояниях, переходов ${cnt.moves}.`);
  console.log('Проверка пройдена: шахта из пяти разделов на каждом маршруте, бейджи — число дел, закрытый раздел объясняет условие, переход — transform и opacity, вёрстка на 932 × 430 и 844 × 390, раздел UI-кита, хвосты.');
}
