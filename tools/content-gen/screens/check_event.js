/* Автопроверка «Неделя → Событие недели» (design/ui/event.js, design/ui/screens/event.js) — без браузера.
   1. Файлы: index.html подключает данные event.js до основного скрипта, event.css и screens/event.js — после model.js; прежнего экрана
      eventView, его стилей и демо-состояния в index.html нет; концы строк index.html и screens/event.* — CRLF;
      карта экранов — ready у event и event-rewards.
   2. Данные свежие: калькулятор tools/content-gen/event/build.js без ошибок даёт ровно EN_EVENT и таблицы черновика
      docs/content/событие.md; все числа целые; занятия — все, что называет задача; магазина нет; ×1,7 держится.
   3. Алгоритм: очки — целые, цена × n × акцент недели × сила коллекции, потолок силы коллекции; клановая планка — сумма личных
      порогов участников; место не растёт с очками.
   4. «Сервер»: начисление — операция с номером, повтор номера ничего не меняет; отказ до второго цикла, после отсечки и у неизвестной
      единицы; дневные потолки; взятая планка; новая неделя — с нуля. Лига — правило Арены (EN_ARENA.league), своего цикла у Событий нет.
   5. Наблюдатель: этажи и элиты забега, босс, рунный страж, атака Эхо, забранный ритуал, исполненный контракт, победа на Арене,
      атака клана, мастерская — каждое дело засчитано ровно один раз.
   6. Экран: девять недель × шесть циклов, листы наград (три вкладки), источники, «Рейтинг»; правила воздуха — на карточке темы
      и в рейтинге не больше двух чисел, двух чипов и одного действия, на строке источника — двух чисел, двух чипов и двух кнопок;
      режим «Игрок» — без служебного, тем «для команды» и спойлеров; режим «Команда» — без исключений.
   7. Неделя: строка «Событие» в WEEK_MODES — экран режима, не демо; now и past по договору; прошлая — сундуки «Даров».
   7а. Лестница планок (ADR-0047) — законы Л1–Л4 (ladder_laws.js), проверены мутацией: личные планки События — ступени лестницы на все
      циклы, та же, что даёт EnLoot.ladder для цикла игрока; пороги своей полосы — EN_EVENT.planks, дальше — множителем первой планки;
      в листе наград видны все пять полос — прошлые «пройдено», будущие с порогом и сундуком; за верхней планкой своей полосы —
      планки следующей, без перехода в новый цикл: «сервер» отмечает взятую, полоса на карточке темы ведёт к следующей.
   8. UI-кит — раздел «Событие недели»; сценарии презентации.
   Запуск: node tools/content-gen/screens/check_event.js [--dump] [--mut] [--stale-ok]
   --stale-ok — свежесть данных и таблиц — предупреждением, а не ошибкой: когда соседние сборщики в середине правок и экран нужно
   проверить на тех данных, что есть; полный прогон перед коммитом — без флага. --mut — какой закон поймал каждую поломку. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const DUMP = process.argv.includes('--dump'), STALE_OK = process.argv.includes('--stale-ok');
const err = [], note = [];
const stale = m => { if (STALE_OK) note.push(m); else say(m); };   // устаревшие данные: ошибка, с --stale-ok — предупреждение
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
function done(stat) {
  for (const n of note) console.log('предупреждение: ' + n);
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  if (stat) console.log(stat);
  console.log(`Проверка пройдена: ${note.length ? 'данные — как есть, их свежесть не подтверждена (--stale-ok, см. предупреждения)' : 'данные свежие и целые'}, очки — операциями с номером один раз, наблюдатель засчитывает каждое дело однажды, лестница планок — сразу на все циклы и без замка, экран и листы — по правилам воздуха, без служебного у игрока.`);
  process.exit(0);
}

/* ================== 1. файлы ================== */
for (const f of ['event.js', 'screens/event.js', 'screens/event.css']) if (!fs.existsSync(path.join(UI, f))) say('нет design/ui/' + f);
if (err.length) done();
for (const f of ['event.js', 'screens/event.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
for (const [name, s] of [['index.html', html], ['screens/event.js', read('screens/event.js')], ['screens/event.css', read('screens/event.css')]]) {
  const crlf = (s.match(/\r\n/g) || []).length, lf = (s.match(/\n/g) || []).length, cr = (s.match(/\r/g) || []).length;
  if (crlf !== lf || cr !== crlf) say(`${name}: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}, CR ${cr}`);
}
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const i = src => scripts.findIndex(s => s.src === src), iMain = scripts.findIndex(s => !s.src && /const EB = window\.EnBattle/.test(s.code));
  if (i('event.js') < 0) say('index.html: не подключены данные event.js');
  else if (iMain >= 0 && i('event.js') > iMain) say('index.html: event.js подключён после основного скрипта');
  if (i('screens/event.js') < 0) say('index.html: не подключён screens/event.js');
  else if (i('screens/event.js') < i('screens/model.js')) say('index.html: screens/event.js подключён раньше model.js');
  if (!html.includes('<link rel="stylesheet" href="screens/event.css">')) say('index.html: не подключён screens/event.css');
  const inline = scripts.filter(s => !s.src).map(s => s.code).join('\n');
  for (const old of ['function eventView', 'event: eventView', 'function evPlanks', 'event: { pts:', "['Путешествия', 'закрытый биом'"]) if (inline.includes(old)) say(`index.html: остался прежний код События — «${old}»`);
  if (/\.ev-note\s*\{/.test(html)) say('index.html: остались стили прежнего экрана События (.ev-note)');
  const card = html.match(/\{ n: 'Событие'[\s\S]*?\},\r?\n/);
  if (!card || !/ready:\s*\[[^\]]*'event'[^\]]*'event-rewards'/.test(card[0])) say('index.html: на карте экранов у «События» нет ready: event, event-rewards');
}
if (err.length) done();

/* ================== 2. данные ================== */
const B = require('../event/build.js');
const built = B.build();
if (built.err.length) say('калькулятор События: ' + built.err.slice(0, 6).join('; '));
if (err.length) done();
if (B.render(built.data) !== read('event.js')) stale('event.js устарел: пересобрать — node tools/content-gen/event/build.js');
{
  const doc = fs.existsSync(B.FILES.doc) ? fs.readFileSync(B.FILES.doc, 'utf8') : null;
  if (!doc) say('нет черновика docs/content/событие.md');
  else { const fresh = B.withTables(doc, built.tables); if (fresh == null) say('событие.md: нет меток таблиц'); else if (fresh !== doc) stale('событие.md: таблицы устарели — пересобрать'); if (!/## Вопросы автору/.test(doc)) say('событие.md: нет раздела «Вопросы автору»'); }
}
const ctxD = { window: {} }; ctxD.window = ctxD; vm.createContext(ctxD); vm.runInContext(read('event.js'), ctxD);
const D = ctxD.EN_EVENT, A = ctxD.EnEvent;
if (!D || !A) { say('event.js: нет window.EN_EVENT или window.EnEvent'); done(); }
{
  const walk = (x, where) => { if (typeof x === 'number' && !Number.isInteger(x)) say(`данные: не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, where + '.' + k); };
  walk(D, 'EN_EVENT');
  /* занятия, которые называет задача: этажи, элиты, боссы, Эхо, крафт, контракты, ритуалы, Арена, клан */
  const need = { floor: 'этажи', elite: 'элиты', boss: 'боссы', guard: 'рунные стражи', echoRound: 'Эхо', craftItem: 'крафт', recipe: 'рецепты', contractD: 'контракты', ritualHalf: 'ритуалы', arenaWin: 'Арена', leagueWin: 'Лига', clanAtk: 'клан' };
  for (const [k, n] of Object.entries(need)) if (!D.units[k]) say(`данные: нет очков за «${n}»`);
  for (const [k, U] of Object.entries(D.units)) { if (!D.sources.some(s => s.id === U.src)) say(`данные: у ${k} нет источника`); if (/Энериум|прокрут|реролл/i.test(U.n + U.what)) say(`данные: очки за Энериум — ${k}`); }
  if (D.shop) say('данные: у События магазин — в GDD его нет');
  for (const c of D.cycles) {
    const P = D.planks[c];
    if (!P || P.length !== 5 || P.some((x, i) => i && x !== P[i - 1] * 2)) say(`данные: пороги цикла ${c} не пять ×2`);
    if (D.econ[c].x17 > 170) say(`данные: плательщик в цикле ${c} — ×${D.econ[c].x17 / 100}, больше ×1,7`);
  }
  const races = ['Люди', 'Дворфы', 'Эльфы', 'Звери', 'Саганы', 'Аппараты', 'Искажённые', 'Нежить', 'Забытые'];
  for (const r of races) if (!D.weeks[r] || !D.weeks[r].n || !D.weeks[r].accent.units.length) say(`данные: у недели ${r} нет События или акцента`);
}

/* ================== 3. алгоритм ================== */
{
  const race = 'Эльфы', W = D.weeks[race];
  for (const k of Object.keys(D.units)) for (const n of [1, 7, 1234]) for (const rp1 of [0, 40, 99999]) {
    const p = A.pts(D, k, n, { race, rp1 });
    if (!Number.isInteger(p) || p < 0) say(`алгоритм: очки ${k} — ${p}`);
    const acc = W.accent.units.includes(k) ? W.accent.bp : D.bp, want = Math.floor(D.units[k].price * n * acc * (D.bp + Math.min(rp1, D.rp1.capBp)) / (D.bp * D.bp));
    if (A.pts(D, k, n, { race, rp1: Math.min(rp1, D.rp1.capBp) }) !== want) say(`алгоритм: очки ${k} не по формуле`);
  }
  if (A.pts(D, 'floor', 0, { race }) !== 0 || A.pts(D, 'нет', 5, { race }) !== 0) say('алгоритм: очки за пустое или неизвестное дело');
  const big = Array.from({ length: 200 }, () => ({ r: 7, c: 6, lim: 5, valor: 5 }));
  if (A.rp1Bp(D, big) !== D.rp1.capBp) say('алгоритм: сила коллекции выше потолка');
  /* правило collRp прототипа (index.html, §10.3): предел не пройден и доблести нет — 0; не пройденный заново предел держит прошлый круг —
     2^(доблесть − 1), если был пройден до доблести (keep); пройденный — 2^доблесть */
  const R1 = D.rp1, one = h => A.rp1Bp(D, [h]);
  if (one({ r: 2, c: 1, lim: 0, valor: 0 }) !== 0) say('алгоритм: сила коллекции без пробитого первого предела');
  if (one({ r: 2, c: 1, lim: 0, valor: 3 }) !== R1.perBp * 2 * 1 * 4) say('алгоритм: доблесть без пройденного заново предела — не прошлый круг 2^(доблесть − 1)');
  if (one({ r: 2, c: 1, lim: 0, valor: 3, keep: 0 }) !== 0) say('алгоритм: предел не был пройден и до доблести — а сила есть');
  if (one({ r: 3, c: 2, lim: 1, valor: 2 }) !== R1.perBp * 3 * 2 * 4) say('алгоритм: пройденный предел — не круг 2^доблесть');
  if (A.rpHero(D, { r: 3, c: 2, lim: 2, valor: 1, keep: 1 }, 2) !== R1.perBp * 3 * 2 * 2 || A.rpHero(D, { r: 3, c: 2, lim: 1, valor: 1, keep: 1 }, 2) !== 0) say('алгоритм: РП2 — не по пределу 2');
  /* клан и разные циклы (ADR-0042): пороги и очки клана — в очках цикла того, кто смотрит; клан из одного цикла — прежняя сумма порогов */
  const cp = A.clanPlanks(D, [2, 2, 3], 3), cp2 = A.clanPlanks(D, [2, 2, 2]);
  const want = D.clanX.map(x => Math.floor(D.planks[3][0] * x / 100) * 3), want2 = D.clanX.map(x => Math.floor(D.planks[2][0] * x / 100) * 3);
  if (JSON.stringify(cp) !== JSON.stringify(want) || JSON.stringify(cp2) !== JSON.stringify(want2)) say(`алгоритм: клановые планки ${cp} / ${cp2} — не участников × первый порог цикла игрока × доля (${want} / ${want2})`);
  if (A.clanPts(D, D.planks[3][0], 3, 2) !== D.planks[2][0] || A.clanPts(D, D.planks[2][0] * 2, 2, 6) !== D.planks[6][0] * 2) say('алгоритм: очки другого цикла — не по первым личным порогам');
  if (D.clanX.length !== 3 || D.clanX[2] * 2 !== D.clanX[1] * 3) say(`данные: третья клановая планка — не ×1,5 второй (${D.clanX})`);
  const anc = A.anchorsOf(D.top.players, D.planks[2][4]);
  let last = 1;
  for (let v = anc[0][1] * 2; v > 0; v = Math.floor(v * 9 / 10)) { const p = A.place(anc, v); if (!Number.isInteger(p) || p < last) { say(`алгоритм: место ${p} при ${v} очках`); break; } last = p; }
  for (let p = 1; p < 2000; p += 37) { const v = A.pointsAt(anc, p); if (A.place(anc, v) > p + 1) { say(`алгоритм: место и очки опоры не сходятся на ${p}`); break; } }
}
if (err.length) done();

/* ================== песочница ================== */
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
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
  createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: root, activeElement: null, fonts: null };
const noStore = () => { throw new Error('localStorage недоступен'); };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
/* текст игрока: служебные слова, темы «для команды», спойлеры — проверяются здесь, в Node */
const seen = new Set(), dumped = new Set();
let TEAM = [];
win.__scan = (key, h, team) => {
  if (typeof h !== 'string') { say(`${key}: разметка не строка`); return; }
  const bad = h.match(/.{0,50}(?:undefined|NaN|\[object ).{0,30}/); if (bad) say(`${key}: undefined, NaN или [object — «${bad[0]}»`);
  if (team) return;
  const i = h.indexOf('<main'), part = i < 0 ? h : h.slice(i), v = strip(part);
  const txt = playerText(part).split('\n').concat([...v.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => m[1]));
  if (DUMP && !dumped.has(key)) { dumped.add(key); console.log(`\n== ${key}\n` + playerText(part)); }
  for (const t of txt) {
    for (const [what, re] of SERVICE) { const k = what + '|' + t; if (re.test(t) && !seen.has(k)) { seen.add(k); say(`${key}: игроку видно служебное (${what}) — «${t.slice(0, 110)}»`); } }
    const leak = TEAM.filter(x => t.includes(x)); if (leak.length && !seen.has('team|' + t)) { seen.add('team|' + t); say(`${key}: игроку видно «для команды» — ${leak.join(', ')}`); }
    if (/(^|[^а-яё])мать([^а-яё]|$)|Иридиум|Эуклид|марионетк/i.test(t) && !seen.has('sp|' + t)) { seen.add('sp|' + t); say(`${key}: спойлер в тексте игрока — «${t.slice(0, 80)}»`); }
  }
};
win.__player = h => playerText(h);
win.__say = say;
win.__LAD = require('./ladder_laws.js');   // законы лестницы планок (ADR-0047) — общие с проверками Недели и экранов режимов
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
TEAM = vm.runInContext('RS.weeks.map(w => w.team && w.team.theme).filter(Boolean)', ctx);

/* ================== 4–8. сценарии — внутри песочницы ================== */
function suite() {
  const out = { errors: [], views: 0, sheets: 0, credits: 0, rows: 0, cards: 0, ladders: 0, mut: '', mutLog: [] };
  const fail = m => { if (out.errors.length < 80) out.errors.push(m); };
  const X = window.EN_EV, D = window.EN_EVENT, A = window.EnEvent;
  if (!X || !D || !A) { fail('нет EN_EV, EN_EVENT или EnEvent'); return out; }
  /* лестница планок: общие законы (ladder_laws.js), алгоритм прототипа до мутаций; блок лестницы в листе наград кончается пояснением */
  const LL = __LAD, LAD0 = window.EnLoot && EnLoot.ladder, ROAD_END = ['<p class="reason">', 'class="sheet-f"'];
  if (typeof LAD0 !== 'function' || !window.EN_WEEK || typeof EN_WEEK.ladderHtml !== 'function') { fail('нет EnLoot.ladder или помощника лестницы EN_WEEK — планки События не сверить'); return out; }
  const draw = (key, team) => { render(); out.views++; const h = document.getElementById('game').innerHTML; __scan(key, h, team); return h; };
  const reset = (race, c) => { S = initialState(); if (race) rsSetWeek(race); if (c) S.acc.cycle = c; S.overlay = null; S.route = 'event'; X.sync(); };
  const isInt = v => Number.isInteger(v);
  const E = () => S.event;
  const sumBy = () => Object.values(E().by).reduce((a, x) => a + x, 0);
  const P = c => A.planks(D, c || S.acc.cycle);
  const nums = h => (__player(h.replace(/\s(?:title|aria-label)="[^"]*"/g, '')).match(/\d[\d\s ]*/g) || []).filter(s => s.trim()).length;
  const chips = h => (h.match(/class="(?:chip|well)[ "]/g) || []).length;
  const btns = h => (h.match(/<button/g) || []).length;

  /* ---------- 4. «сервер» ---------- */
  reset('Эльфы', 2);
  if (!E() || E().cyc !== 2 || E().race !== 'Эльфы') fail('состояние: S.event не заведён под неделю и цикл');
  if (E().pts !== sumBy()) fail(`состояние: очки ${E().pts}, а по источникам — ${sumBy()}`);
  /* демо — четвёртый день недели (ADR-0031, п. 17): планок на одну меньше типичной недели обычного из «Даров» или уже столько же */
  const k0 = A.reached(P(), E().pts), kt = LBX.modes.event.typical.free.me;
  if (k0 < kt - 1 || k0 > kt) fail(`демо: взято планок ${k0}, середина недели обычного — ${kt - 1}–${kt}`);
  let p0 = E().pts, r = X.srv.credit('проверка:1', 'floor', 10); out.credits++;
  if (!r.ok || !isInt(r.pts) || E().pts !== p0 + r.pts || r.pts !== A.pts(D, 'floor', 10, { race: 'Эльфы', rp1: X.rp1() })) fail(`сервер: начисление за этажи — ${JSON.stringify(r)}`);
  p0 = E().pts; r = X.srv.credit('проверка:1', 'floor', 10);
  if (!r.again || E().pts !== p0) fail('сервер: повтор номера начислил ещё раз');
  r = X.srv.credit('проверка:2', 'нет-такого', 3); if (r.refuse !== 'unit' || E().pts !== p0) fail('сервер: неизвестная единица начислена');
  r = X.srv.credit('проверка:3', 'floor', 1.5); if (r.refuse !== 'unit') fail('сервер: дробное количество принято');
  /* Лига — одно правило экранов Лиги, контрактов и События (leagueOpen: данные Арены EN_ARENA.league — цикл II и 15 разных героев):
     своего цикла у Событий нет. У демо Лига открыта — 15 героев обычный набирает к 9-му дню цикла II (ADR-0031, п. 17), матчи Лиги
     в счёте недели. Коллекция из пятерых отряда — Лига закрыта, матч не засчитан; вернули героев — засчитан и в цикле II */
  const LR = window.EN_ARENA && EN_ARENA.league, LU = D.units.leagueWin;
  if (!LR || (LU.from && LU.from !== LR.from) || LU.gate !== 'league') fail(`данные: матч Лиги в Событии не по правилу Арены — цикл ${LU.from}, условие ${LU.gate}`);
  if (!leagueOpen()) fail('демо: Лига закрыта — у обычного к 11-му дню цикла II уже 15 героев');
  if (!E().cnt.leagueWin) fail('демо: Лига открыта, а матчей Лиги в счёте недели нет');
  const own0 = S.rs.owned; S.rs.owned = {};
  if (leagueOpen()) fail('Лига открыта и у коллекции из пятерых');
  p0 = E().pts; r = X.srv.credit('проверка:4', 'leagueWin', 1);
  if (r.refuse !== 'gate' || E().pts !== p0) fail(`сервер: матч Лиги засчитан при закрытой Лиге — ${JSON.stringify(r)}`);
  S.rs.owned = own0;
  if (!leagueOpen()) fail('Лига не открылась и с 15 героями');
  r = X.srv.credit('проверка:4', 'leagueWin', 1); out.credits++;
  if (!r.ok || r.pts !== A.pts(D, 'leagueWin', 1, { race: 'Эльфы', rp1: X.rp1() }) || E().pts !== p0 + r.pts) fail(`сервер: победа в Лиге в цикле II при открытой Лиге — ${JSON.stringify(r)}`);
  /* дневной потолок побед Арены — одинаков для всех */
  const cap = D.caps.arenaWin; r = X.srv.credit('проверка:5', 'arenaWin', cap + 5); out.credits++;
  if (!r.ok || r.n !== cap || r.cut !== 5) fail(`сервер: потолок побед Арены — засчитано ${r.n}`);
  p0 = E().pts; r = X.srv.credit('проверка:6', 'arenaWin', 1); if (!r.ok || r.pts !== 0 || E().pts !== p0) fail('сервер: победа сверх дневного потолка дала очки');
  S.week.left -= 86400; r = X.srv.credit('проверка:7', 'arenaWin', 1); out.credits++; if (!r.ok || r.n !== 1) fail('сервер: новый день не открыл потолок заново');
  /* акцент недели: эльфы — ритуалы ×1,5 */
  r = X.srv.credit('проверка:8', 'ritualHalf', 12); out.credits++;
  if (r.pts !== Math.floor(D.units.ritualHalf.price * 12 * D.weeks['Эльфы'].accent.bp * (D.bp + X.rp1()) / (D.bp * D.bp))) fail('сервер: акцент недели не применён');
  /* взятая планка */
  const nx = P().find(x => x > E().pts);
  /* победы у рунного стража — без дневного потолка: этажи и элиты под потолком спуска (ADR-0031, п. 12) */
  if (nx) { r = X.srv.credit('проверка:9', 'guard', Math.ceil((nx - E().pts + 1) / D.units.guard.price)); out.credits++; if (!r.plank) fail('сервер: взятая планка не отмечена'); }
  /* потолок спуска: этажей в день — не больше дневного потолка */
  if (D.caps.floor != null) { const was = E().srv.day.used.floor || 0; r = X.srv.credit('проверка:9а', 'floor', D.caps.floor + 50); out.credits++; if (!r.ok || r.n !== Math.max(0, D.caps.floor - was) || r.cut !== D.caps.floor + 50 - r.n) fail(`сервер: потолок этажей — засчитано ${r.n}`); }
  /* отсечка: приём закрыт, ничего не меняется */
  p0 = E().pts; S.week.left = 0; r = X.srv.credit('проверка:10', 'floor', 5); if (r.refuse !== 'closed' || E().pts !== p0) fail('сервер: после отсечки очки начислены');
  /* до второго цикла — ничего */
  reset('Эльфы', 1); r = X.srv.credit('проверка:11', 'floor', 5); if (r.refuse !== 'cycle' || E().pts) fail('сервер: в цикле I очки События');
  /* новая неделя — с нуля */
  reset('Эльфы', 3); X.srv.next(); if (E().pts || Object.keys(E().by).length || E().weekNo !== 2) fail('сервер: новая неделя не с нуля');
  r = X.srv.credit('проверка:12', 'elite', 3); if (!r.ok || E().pts !== r.pts) fail('сервер: после новой недели не начисляется');
  /* смена цикла — новый счёт */
  reset('Эльфы', 2); const a2 = E().pts; S.acc.cycle = 4; X.sync(); if (E().cyc !== 4 || E().pts === a2 && a2 !== 0 && E().by.descent === undefined) fail('сервер: смена цикла не начала новый счёт');

  /* ---------- 5. наблюдатель ---------- */
  reset('Эльфы', 2); X.observe();
  const cnt = k => E().cnt[k] || 0;
  let c0 = { ...E().cnt };
  /* забег: этажи и элиты по высокой отметке, босс — по итогу */
  startRun('s1', 'b1', EB.BIOMES.b1.floors.length - 3);
  const R = S.runs[S.runs.length - 1];
  S.route = 'descent';   // забег идёт в фоне: без экрана боя и его частиц
  if (R) {
    for (let n = 0; n < 20000 && !R.over; n++) advance(R, 30000);
    const fl = (R.curve || []).length; X.observe(); X.observe();
    if (cnt('floor') - (c0.floor || 0) !== fl) fail(`наблюдатель: этажей +${cnt('floor') - (c0.floor || 0)}, в забеге взято ${fl}`);
    if (R.end && R.end.kind === 'boss' && cnt('boss') - (c0.boss || 0) !== 1) fail('наблюдатель: босс биома не засчитан ровно один раз');
    let el = 0; for (let f = R.startFloor; f < R.startFloor + fl; f++) if (EB.BIOMES.b1.floors[f - 1] && EB.BIOMES.b1.floors[f - 1].g === 'e') el++;
    if (cnt('elite') - (c0.elite || 0) !== el) fail(`наблюдатель: элит +${cnt('elite') - (c0.elite || 0)}, на взятых этажах — ${el}`);
  } else fail('наблюдатель: забег не начался');
  S.runs = [{ id: 'проба-страж', guard: true, curve: [], startFloor: 1, biome: 'b1', end: { kind: 'guardWin' }, over: true }];
  c0 = { ...E().cnt }; X.observe(); X.observe();
  if (cnt('guard') - (c0.guard || 0) !== 1) fail('наблюдатель: рунный страж не засчитан ровно один раз');
  S.runs = [];
  /* Эхо: атака с номером */
  c0 = { ...E().cnt }; S.ech.last = { uid: 'проба', no: 1, g: 'e', kill: false }; X.observe(); X.observe();
  if (cnt('echoRound') - (c0.echoRound || 0) !== D.echoRounds.e) fail('наблюдатель: атака Эхо по элите — не раунды элиты или дважды');
  S.ech.last = { uid: 'проба', no: 2, g: 'u', kill: true }; X.observe();
  if (cnt('echoRound') - (c0.echoRound || 0) !== D.echoRounds.e + D.echoRounds.u) fail('наблюдатель: вторая атака Эхо не засчитана');
  /* ритуал: готовый забрали */
  const i = S.rituals.slots.findIndex(s => s.st === 'ready');
  if (i >= 0) {
    c0 = { ...E().cnt }; const s0 = S.rituals.slots[i], nom = Number.isInteger(s0.nominal) ? s0.nominal : Number.isInteger(s0.ms) ? s0.ms : 0;
    const half = nom ? Math.floor(nom / 1800000) : Math.floor((s0.unique ? RX.drops.rituals.workers.unique.minutes : (s0.kind === 'hero' ? RX.drops.rituals.heroes : RX.drops.rituals.workers).minutes[s0.r - 1]) / 30);
    const uid0 = s0.uid; ACT.rclaim(String(i)); X.observe(); X.observe();
    const gone = !S.rituals.slots.some(s => s.uid === uid0 && s.st === 'ready');
    if (!gone) fail('наблюдатель: готовый ритуал не забрался — проверка не состоялась');
    else if (cnt('ritualHalf') - (c0.ritualHalf || 0) !== half) fail(`наблюдатель: ритуал — ${cnt('ritualHalf') - (c0.ritualHalf || 0)} получасов вместо ${half}`);
  }
  /* контракт исполнен — один раз; пустой — не в счёт */
  if (S.contracts && S.contracts.day) {
    c0 = { ...E().cnt }; const Dc = S.contracts.day, st0 = Dc.st;
    if (!Dc.tasks.length) Dc.tasks = [{ kind: 'floors', r: 1, goal: 1, p: 1, pts: 10, slot: 0, n: 0 }];
    Dc.st = 'done'; X.observe(); Dc.st = 'paid'; X.observe();
    if (cnt('contractD') - (c0.contractD || 0) !== 1) fail('наблюдатель: исполненный дневной контракт не засчитан ровно один раз');
    Dc.st = st0;
    c0 = { ...E().cnt }; S.contracts.dayNo++; Dc.tasks = []; Dc.st = 'done'; X.observe();
    if (cnt('contractD') !== (c0.contractD || 0)) fail('наблюдатель: пустой контракт засчитан');
  }
  /* Арена: новые победы сезона (счётчик screens/arena.js) или атака с ростом рейтинга — прежняя Арена */
  c0 = { ...E().cnt }; X.observe();
  const byWins = Number.isInteger(S.arena.wins);
  if (byWins) { S.arena.wins += 2; S.arena.att -= 2; } else { S.arena.att -= 1; S.arena.rating += 14; }
  X.observe(); X.observe();
  if (cnt('arenaWin') - (c0.arenaWin || 0) !== (byWins ? 2 : 1)) fail(`наблюдатель: победы на Арене — +${cnt('arenaWin') - (c0.arenaWin || 0)}, ждали ${byWins ? 2 : 1}`);
  if (S.arena.lg && Number.isInteger(S.arena.lg.wins)) {   // Лига — правило экрана Лиги (leagueOpen): открыта — матч засчитан, в цикле II тоже
    for (const h of RS.heroes.filter(x => !rsOld(x))) { if (leagueOpen()) break; S.rs.owned[h.id] = { lvl: 0, lim: 0, valor: 0, how: 'gold' }; }
    c0 = { ...E().cnt }; S.arena.lg.wins += 1; X.observe(); X.observe();
    if (cnt('leagueWin') - (c0.leagueWin || 0) !== 1) fail(`наблюдатель: матч Лиги в цикле II при открытой Лиге — +${cnt('leagueWin') - (c0.leagueWin || 0)}, ждали +1 один раз`);
  }
  /* клан: потраченные атаки */
  c0 = { ...E().cnt }; X.observe(); S.clan.boss.att -= 2; X.observe(); X.observe();
  if (cnt('clanAtk') - (c0.clanAtk || 0) !== 2) fail('наблюдатель: атаки клана не засчитаны');
  /* мастерская: операция с номером — предметы и новый рецепт */
  c0 = { ...E().cnt }; S.ws.ops['проба-мастерская'] = { op: 'проба-мастерская', kind: 'made', out: 3, isNew: true }; X.observe(); X.observe();
  if (cnt('craftItem') - (c0.craftItem || 0) !== 3 || cnt('recipe') - (c0.recipe || 0) !== 1) fail('наблюдатель: мастерская засчитана не так');
  S.ws.ops['проба-неудача'] = { op: 'проба-неудача', kind: 'fail', burn: [] }; c0 = { ...E().cnt }; X.observe();
  if (JSON.stringify(c0) !== JSON.stringify(E().cnt)) fail('наблюдатель: неудача в мастерской дала очки');
  /* после отсечки — ничего */
  S.week.left = 0; const p1 = E().pts; S.ech.last = { uid: 'проба', no: 3, g: 'b' }; X.observe();
  if (E().pts !== p1) fail('наблюдатель: после отсечки очки начислены');
  if (E().pts !== sumBy()) fail(`наблюдатель: очки ${E().pts}, по источникам — ${sumBy()}`);

  /* ---------- 6. экран ---------- */
  const W = window.EN_WEEK;
  function airHero(key, h) {
    const a = h.indexOf('<div class="pnl ev-hero">'), b = h.indexOf('<button class="pnl ev-rank"'), c = b < 0 ? -1 : h.indexOf('</button>', b);
    if (a < 0 || b < 0) { fail(`${key}: нет карточки темы или рейтинга`); return; }
    const hero = h.slice(a, b), rank = h.slice(b, c + 9);
    out.cards += 2;
    if (nums(hero) > 2) fail(`${key}: на карточке темы ${nums(hero)} числа — «${__player(hero).replace(/\s+/g, ' ').slice(0, 120)}»`);
    if (chips(hero) > 2) fail(`${key}: на карточке темы ${chips(hero)} чипов`);
    if (btns(hero) > 1) fail(`${key}: на карточке темы ${btns(hero)} действия`);
    if (nums(rank) > 2) fail(`${key}: в рейтинге ${nums(rank)} числа`);
    const rows = h.split(/<div class="ev-row(?=[" ])/).slice(1).map(x => { const g = x.indexOf('class="iconbtn ev-go"'), e = g < 0 ? -1 : x.indexOf('</button>', g); return e < 0 ? x : x.slice(0, e + 9); });
    if (rows.length !== D.sources.length) fail(`${key}: строк источников ${rows.length} вместо ${D.sources.length}`);
    rows.forEach((row, j) => {
      out.rows++;
      const x = D.sources[j];
      if (!row.includes(`data-v="evsrc:${x.id}"`) || !row.includes(`data-a="go" data-v="${x.go}"`)) fail(`${key}: строка ${x.n} — нет листа или перехода в режим`);
      if (nums(row) > 2) fail(`${key}: на строке ${x.n} ${nums(row)} числа`);
      if (chips(row) > 2) fail(`${key}: на строке ${x.n} ${chips(row)} чипов`);
      if (btns(row) > 2) fail(`${key}: на строке ${x.n} ${btns(row)} кнопки`);
    });
  }
  for (const w of RS.weeks) for (let c = 1; c <= 6; c++) {
    const key = `${w.race} · цикл ${ROMAN[c]}`;
    try {
      reset(w.race, c);
      let h = draw(key);
      if (c < D.from) { if (!h.includes('откроется во втором цикле')) fail(`${key}: нет закрытого состояния`); continue; }
      const Wk = D.weeks[w.race];
      if (!h.includes(trEsc(Wk.n)) || !h.includes(w.civ) || !h.includes(`Неделя ${w.gen}`)) fail(`${key}: нет темы недели — имени События, расы или цивилизации`);
      if (!h.includes('data-cd="week"')) fail(`${key}: нет срока недели`);
      if (!h.includes(`<b class="num">${fmt(E().pts)}</b>`)) fail(`${key}: не видно очков недели`);
      const nx = X.planks().find(p => !p.got);
      if (nx && !h.includes(`ещё <b class="num">${fmt(nx.need - E().pts)}</b>`)) fail(`${key}: не видно пути до ближайшей планки`);
      if (!h.includes('data-v="evrew:me"') || !h.includes('data-v="rank:Событие"')) fail(`${key}: нет «Награды» или «Рейтинга»`);
      if (!h.includes(`Акцент — ${Wk.an}`)) fail(`${key}: нет акцента недели`);
      airHero(key, h);
      /* WEEK_MODES: строка События — экран режима */
      const st = W.state('event', 'now');
      if (!st || st.m.demo) fail(`${key}: строка «Событие» в «Неделе» — демо, а не экран режима`);
      else {
        if (st.points !== E().pts) fail(`${key}: в «Неделе» ${st.points} очков, на экране — ${E().pts}`);
        /* личные планки — ступени лестницы на все циклы (Л1–Л3): пороги своей полосы — данные цикла, дальше — множителем первой планки */
        if (st.planks.filter(p => p.band === c && !p.cap).map(p => p.need).join() !== P(c).join()) fail(`${key}: в «Неделе» пороги своей полосы — не EN_EVENT.planks`);
        LL.stateLaw(LBX, `${key} · Неделя`, st, c, LAD0).forEach(fail); out.ladders++;
        if (JSON.stringify(X.planks().map(p => [p.k, p.band, p.need, p.got])) !== JSON.stringify(st.planks.map(p => [p.k, p.band, p.need, p.reached]))) fail(`${key}: планки экрана События и строки «Недели» разошлись`);
        if (st.place !== X.place()) fail(`${key}: место в «Неделе» ${st.place}, на экране ${X.place()}`);
        const ps = W.state('event', 'past'); if (!ps || ps.lock) fail(`${key}: прошлая неделя События закрыта`);
        else {
          const dar = typeof darRows === 'function' ? darRows(S).filter(p => p.id === 'event' && p.wk.id === 'prev') : [];
          const want = dar.reduce((a, p) => a + p.groups.reduce((b, g) => b + g.count, 0), 0), got = ps.rewards.reduce((a, rr) => a + rr.groups.reduce((b, g) => b + g.count, 0), 0);
          if (want !== got) fail(`${key}: прошлая неделя — ${got} сундуков, в «Дарах» — ${want}`);
          if (!isInt(ps.points) || ps.points < 0) fail(`${key}: очки прошлой недели ${ps.points}`);
        }
      }
      /* листы: три слоя наград, источники, «Рейтинг» */
      for (const t of ['me', 'clan', 'top']) {
        S.overlay = { t: 'evrew', arg: t }; h = draw(`${key} · награды ${t}`); out.sheets++;
        if (!h.includes('class="ov"') || !h.includes(`aria-selected="true" data-a="sheet" data-v="evrew:${t}"`)) fail(`${key}: лист наград ${t} не открылся или не выбрана вкладка`);
      }
      S.overlay = { t: 'evrew', arg: 'me' }; h = draw(`${key} · планки`);
      /* лист личных планок — лестница общего помощника Недели: все пять полос, пороги, сундуки, без замка (Л4) */
      if (!h.includes('data-v="gifts:me"')) fail(`${key}: из листа планок нет пути в «Дары»`);
      if (st && !st.m.demo) LL.roadLaw(LBX, `${key} · лист планок`, h, st, c, ROAD_END).forEach(fail);
      S.overlay = { t: 'evrew', arg: 'clan' }; h = draw(`${key} · клан`);
      if ((h.match(/class="ev-pk[ "]/g) || []).length !== 3 || !h.includes('data-v="gifts:clan"')) fail(`${key}: в листе клана нет трёх планок или пути в «Дары»`);
      const K = X.clan();
      if (!K) fail(`${key}: демо-аккаунт без клана`);
      else if (K.pts !== E().pts + E().clan.others || K.needs.join() !== A.clanPlanks(D, K.cycles, c).join() || K.cycles.length !== K.n) fail(`${key}: клан — очки или пороги не по правилу`);
      else if (A.reached(K.needs, K.pts) !== LBX.modes.event.typical.free.clan) fail(`${key}: клан демо берёт ${A.reached(K.needs, K.pts)} клановых планки, в «Дарах» у обычного — ${LBX.modes.event.typical.free.clan}`);
      for (const x of D.sources) {
        S.overlay = { t: 'evsrc', arg: x.id }; h = draw(`${key} · источник ${x.id}`); out.sheets++;
        if (!h.includes(`data-a="go" data-v="${x.go}"`)) fail(`${key}: в листе ${x.n} нет перехода в режим`);
        const units = Object.entries(D.units).filter(([, U]) => U.src === x.id);
        if ((h.match(/class="ev-u[ "]/g) || []).length !== units.length) fail(`${key}: в листе ${x.n} не все единицы`);
      }
      S.overlay = { t: 'rank', arg: 'Событие' }; h = draw(`${key} · рейтинг`); out.sheets++;
      if (!h.includes('class="ov"')) fail(`${key}: «Рейтинг» Событий не открылся`);
      S.overlay = { t: 'evsrc', arg: 'нет-такого' }; draw(`${key} · чужой источник`);
      S.overlay = { t: 'evrew', arg: 'чужая' }; draw(`${key} · чужая вкладка`);
    } catch (x) { fail(key + ': исключение — ' + (x && x.stack ? x.stack.split('\n').slice(0, 3).join(' | ') : x)); }
  }
  /* место в Событии — одно число (ADR-0031, п. 17): S.ranks сразу после заведения, экран События, строка Недели и лист «Рейтинг» */
  {
    S = initialState(); S.overlay = null;
    const r0 = (S.ranks.find(x => x[0] === 'Событие') || [])[1];
    if (!isInt(r0) || r0 < 1) fail(`место: в S.ranks при заведении — ${r0}`);
    X.sync();
    if (r0 !== X.place()) fail(`место: в S.ranks при заведении ${r0}, на экране События ${X.place()}`);
    if (W.state('event', 'now').place !== r0) fail(`место: в «Неделе» ${W.state('event', 'now').place}, в S.ranks ${r0}`);
    S.route = 'event'; S.overlay = { t: 'rank', arg: 'Событие' };
    const h = draw('место · рейтинг');
    if (!h.includes(`<b class="num">#${fmt(r0)}</b><small>место</small>`)) fail(`место: в листе «Рейтинг» не ${r0}`);
    const p0 = E().pts; X.srv.credit('проверка:место', 'floor', 400); out.credits++;
    if ((S.ranks.find(x => x[0] === 'Событие') || [])[1] !== X.place() || X.place() === null || (E().pts > p0 && X.place() > r0)) fail('место: после очков S.ranks разошёлся с местом События');
  }
  /* 7а. За верхней планкой своей полосы — планки следующей, без перехода в новый цикл (Л3, Л4). Очков — ровно порог первой планки
     следующей полосы по эталону: «сервер» отмечает её взятой, на карточке темы полоса ведёт ко второй с её сундуком, в листе наград
     следующая полоса раскрыта. evBeyond(c) — список нарушений: его же зовёт проверка мутацией */
  function evBeyond(c) {
    const e = [], key = `за верхней планкой · цикл ${ROMAN[c]}`;
    reset('Эльфы', c);
    const ref = LL.ref(LBX, 'event', c), n = LL.ownCount(LBX, 'event', c), own = ref[0].band, p1 = P(c)[0];
    if (ref.length <= n + 1) return e;   // полоса последняя — продолжения нет
    const need = p1 * ref[n].x / ref[0].x;
    /* «сервер»: дело, которое переводит через порог, отмечает взятую планку — n + 1 */
    E().pts = need - 1; E().by = { descent: need - 1 };
    const r = X.srv.credit('проверка:за-полосой:' + c, 'guard', 1); out.credits++;
    if (!r.ok || r.plank !== n + 1) e.push(`${key}: «сервер» не отметил взятую планку следующей полосы — ${JSON.stringify(r)}`);
    const st = EN_WEEK.state('event', 'now');
    LL.stateLaw(LBX, key, st, c, LAD0).forEach(x => e.push(x));
    const p = st.planks[n];
    if (!p || !p.reached || p.band !== own + 1 || p.need !== need) { e.push(`${key}: Л3 — набрано ${E().pts}, а первая планка следующей полосы не взята: ${p ? `порог ${p.need}, полоса ${p.band}` : 'её нет в лестнице'}`); return e; }
    S.overlay = null; S.route = 'event';
    let h = draw(key + ' · экран');
    const nx = st.planks[n + 1];
    if (!h.includes(`ещё <b class="num">${fmt(nx.need - E().pts)}</b>`) || !new RegExp(`class="well itf ev-chest" data-r="${LL.topR(ref[n + 1].pay)}"`).test(h) || !h.includes(`цикл ${ROMAN[own + 1]}`)) e.push(`${key}: Л3 — карточка темы не ведёт ко второй планке следующей полосы с её сундуком`);
    S.overlay = { t: 'evrew', arg: 'me' }; h = draw(key + ' · лист');
    LL.roadLaw(LBX, key + ' · лист', h, st, c, ROAD_END).forEach(x => e.push(x));
    if (!h.includes(`<div class="wk-ld-band" data-band="${own + 1}">`)) e.push(`${key}: Л4 — полоса, по которой игрок идёт, не раскрыта`);
    return e;
  }
  for (let c = D.from; c <= 5; c++) evBeyond(c).forEach(fail);
  {
    const MUT = LL.mutations(LAD0);   // замок по циклу вернули; планка следующей полосы платит сундук своей; порог продолжения — не ×next
    let caught = 0;
    for (const [what, f] of MUT) {
      EnLoot.ladder = f;
      let got = [];
      try { got = evBeyond(D.from); } catch (x) { got = ['исключение ' + x.message]; }
      EnLoot.ladder = LAD0;
      if (got.length) caught++; else fail(`мутация «${what}»: законы лестницы её не поймали`);
      out.mutLog.push(`мутация «${what}»: ${got.length ? got.slice(0, 2).join(' | ').slice(0, 320) : 'НЕ ПОЙМАНА'}`);
    }
    out.mut = `${caught} из ${MUT.length}`;
    evBeyond(D.from).forEach(x => fail('после мутаций: ' + x));
  }

  /* после отсечки, без клана и в режиме «Команда» */
  reset('Эльфы', 2); S.week.left = 0; let h = draw('после отсечки'); if (!h.includes('Приём закрыт')) fail('после отсечки не видно, что приём закрыт');
  reset('Эльфы', 2); S.clan = Object.assign({}, S.clan, { in: false }); S.overlay = { t: 'evrew', arg: 'clan' }; h = draw('без клана');
  if (!h.includes('Вы не в клане') || !h.includes('data-a="go" data-v="clan"')) fail('без клана: нет пустого состояния клановых планок');
  S.overlay = { t: 'evrew', arg: 'top' }; draw('без клана · места');
  reset('Эльфы', 2); KH.team = true; h = draw('команда', true); if (!h.includes('EN_EVENT')) fail('режим «Команда»: нет служебного');
  for (const t of ['me', 'clan', 'top']) { S.overlay = { t: 'evrew', arg: t }; draw('команда · награды ' + t, true); }
  for (const x of D.sources) { S.overlay = { t: 'evsrc', arg: x.id }; draw('команда · источник ' + x.id, true); }
  S.overlay = null;
  const n1 = E().srv.seq, q1 = E().pts; ACT.evdemo('run:' + n1); const q2 = E().pts; ACT.evdemo('run:' + n1);
  if (q2 <= q1 || E().pts !== q2) fail('команда: «+ забег» не начислил или повтор номера начислил ещё раз');
  if (!draw('команда · забег', true).includes(`data-v="run:${E().srv.seq}"`)) fail('команда: кнопка не несёт номер следующей операции');
  for (const v of ['echo:' + E().srv.seq, 'soon', 'week']) { ACT.evdemo(v); draw('команда · ' + v, true); }
  if (E().pts !== 0 || E().weekNo < 2) fail('команда: «новая неделя» не начала счёт с нуля');
  KH.team = false;

  /* ---------- 8. UI-кит, карта, сценарии ---------- */
  reset('Эльфы', 2); renderKit();
  const kit = document.getElementById('kitGrid').innerHTML, ks = kit.indexOf('<h3>Событие недели</h3>'), kit1 = ks < 0 ? '' : kit.slice(ks, kit.indexOf('</section>', ks));
  if (ks < 0) fail('UI-кит: нет раздела «Событие недели»');
  else {
    if (/undefined|NaN|\[object /.test(kit1)) fail('UI-кит: в разделе События undefined, NaN или [object');
    if (!kit1.includes('ev-hero') || !kit1.includes('ev-row')) fail('UI-кит: в разделе События нет карточки темы или строки источника');
    for (const w of RS.weeks) if (!kit1.includes(D.weeks[w.race].n)) fail(`UI-кит: нет События недели ${w.race}`);
  }
  const me = MAP.find(m => m.n === 'Событие');
  if (!me || !['event', 'event-rewards'].every(x => (me.ready || []).includes(x))) fail('карта экранов: у «События» нет ready: event, event-rewards');
  for (const n of ['Событие · очки недели', 'Событие · три слоя наград', 'Событие · откуда очки']) {
    const f = FLOWS.find(x => x[0] === n);
    if (!f) { fail('нет сценария «' + n + '»'); continue; }
    reset(); f[2](); draw('сценарий «' + n + '»');
  }
  return out;
}
const t0 = Date.now();
let res;
try { res = vm.runInContext('(' + suite.toString() + ')()', ctx); } catch (e) { say('сценарии: ' + (e.stack || e.message)); done(); }
err.push(...res.errors);
if (process.argv.includes('--mut')) for (const m of res.mutLog) console.log(m);   // какой закон поймал каждую мутацию
done(`Событие проверено за ${Math.round((Date.now() - t0) / 1000)} с: отрисовок ${res.views}, листов ${res.sheets}, карточек ${res.cards}, строк источников ${res.rows}, операций сервера ${res.credits}. Лестница планок: состояний сверено ${res.ladders}, мутаций поймано ${res.mut}.`);
