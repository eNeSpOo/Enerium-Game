/* Автопроверка боевого пропуска и дара дня (design/ui/screens/pass.js, данные design/ui/pass.js) — без браузера.
   1. Файлы: index.html подключает данные pass.js после event.js и lootboxes.js, экран screens/pass.js — после screens/event.js, bag.js
      и wanderer.js, до social.js, стили screens/pass.css; компилируется; концы строк экрана и стилей — CRLF; все классы
      ps- и dg- из экрана описаны в стилях. Прежнего пропуска и дара дня в index.html нет: ни «Энериум ×50» за день, ни стилей .gcal,
      .gday, .ms, .track, ни пропуска-заглушки на 620 очков.
   2. Данные свежие: сборщик tools/content-gen/pass/build.js без ошибок, pass.js и таблицы черновика совпадают со сборкой; всё целое.
      Таблица дел пропуска — таблица Событий как есть: цены, источники, условия и дневные потолки.
   3. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   4. Экран «Пропуск»: баннер сезона, ступень и очки; три страницы по десять ступеней, страница кончается вехой; в столбце — две клетки,
      в клетке — значок и не больше одного числа; следующая награда крупно — не больше двух чисел и одно главное действие; у платного
      ряда — замок и цена; закрыт до 10-го уровня — условие и последняя награда сезона.
   5. «Сервер» пропуска: зачёт дела — очки по таблице дел, повтор номера ничего не прибавляет, дневные потолки единиц, потолок сезона
      копится по дням, выше цели очки не идут, Лига — только открытая, до 10-го уровня — отказ; обёртка «сервера» Событий засчитывает
      то же дело пропуску один раз. «Забрать» и «Забрать всё» — выдача ровно клетки на уровне и цикле аккаунта, один раз;
      невзятая ступень и закрытый платный ряд — отказ без изменений. Покупка — нехватка ничего не меняет, покупка списывает цену
      один раз, платные клетки взятых ступеней сразу ждут. Последняя ступень — рамка «Осенний путь» навсегда. Конец сезона —
      незабранное письмом во Входящие, письмо выдаёт его в кошелёк и запасы, новый сезон с нуля.
   6. Лист даров: отметка в сутки, повтор номера и вторая за сутки — ничего; пропуск суток лист не сбрасывает; главный дар — 20-я:
      сундук чистого окна и Энериум; после 30-й — новый лист; прах в цикле I — дух; колокол — письма и дар дня, как прежде.
   7. Анимации: «Забрать» — показ с моментами от начала, нажатие — сразу итог, «меньше движения» — без показа; в кадрах pass.css —
      только transform и opacity; есть «меньше движения».
   8. Честность: лист «Платный ряд» называет до покупки каждый вид его наград, цену, «очков не прибавляет»; ни в одном тексте игрока
      пропуска и дара дня нет торопящих слов.
   9. Арт: пока путь не в EN_PASS.art.ready — ни одной ссылки на pass/…; выгруженный — AV с версией.
   10. Убежище, Входящие, Лавка: кнопки «Дар дня» и «Пропуск», строка дара во Входящих, точка у вкладки «Пропуск».
   11. UI-кит, карта экранов (ready у battle-pass и calendar), сценарии; режим «Игрок» — ни одного служебного слова.
   Запуск: node tools/content-gen/screens/check_pass.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { strip, playerText, SERVICE } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const JS = read('screens/pass.js'), CSS = read('screens/pass.css');
const err = [];
const cnt = { views: 0, ops: 0, marks: 0, sheets: 0 };
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Пропуск и дар дня: отрисовок ${cnt.views}, листов ${cnt.sheets}, операций «сервера» ${cnt.ops}, отметок листа даров ${cnt.marks}.`);
  console.log('Проверка пройдена: очки — только за дела и один раз, потолок копится, «Забрать» и покупка — операции с номером, платный ряд виден до покупки, лист даров не сгорает, главный дар — 20-я отметка, анимации — transform и opacity, игроку служебного не видно.');
  process.exit(0);
}

/* ================== ДАННЫЕ ПРОВЕРКИ ================== */
const ANIM_PROPS = ['transform', 'opacity'];
const RUSH = /успей|последн(?:ий|яя) шанс|только сегодня|потеряешь|потеряете|спеши|осталось всего|не упусти/i;   // торопящие слова — нельзя
const EQ_ = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const at = s => scripts.findIndex(x => x.src === s);
  const iD = at('pass.js'), iEv = at('event.js'), iLb = at('lootboxes.js'), iMain = scripts.findIndex(s => !s.src && /function initialState\(/.test(s.code));
  const iS = at('screens/pass.js'), iSe = at('screens/event.js'), iBag = at('screens/bag.js'), iW = at('screens/wanderer.js'), iSoc = at('screens/social.js');
  if (iD < 0) say('index.html: не подключены данные pass.js');
  else { if (iD < iEv || iD < iLb) say('index.html: pass.js подключён раньше event.js или lootboxes.js'); if (iD > iMain) say('index.html: pass.js подключён после основного скрипта'); }
  if (iS < 0) say('index.html: не подключён screens/pass.js');
  else { if (iS < iSe || iS < iBag || iS < iW) say('index.html: screens/pass.js подключён раньше event.js, bag.js или wanderer.js'); if (iSoc >= 0 && iS > iSoc) say('index.html: screens/pass.js подключён после social.js'); }
  if (!html.includes('href="screens/pass.css"')) say('index.html: не подключён screens/pass.css');
  try { new vm.Script(JS, { filename: 'screens/pass.js' }); } catch (e) { say('синтаксис screens/pass.js: ' + e.message); }
  for (const [f, t] of [['screens/pass.js', JS], ['screens/pass.css', CSS]]) {
    const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
    if (crlf !== lf) say(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`);
  }
  const defined = new Set((CSS.match(/\.(?:ps|dg)-[a-z0-9-]+/g) || []).map(s => s.slice(1)));
  const NOT_CLASS = new Set(['ps-end']);   // не класс: номер письма конца сезона
  for (const c of new Set(JS.match(/\b(?:ps|dg)-[a-z0-9]+(?:-[a-z0-9]+)*/g) || [])) if (!defined.has(c) && !NOT_CLASS.has(c)) say(`pass.css: не описан класс ${c}`);
  const inline = scripts.filter(s => !s.src).map(s => s.code).join('\n');
  for (const [re, what] of [[/S\.gift\.got = S\.gift\.day/, '«Забрать» дара дня без номера'], [/Дар дня: Энериум ×50/, 'Энериум ×50 за любой день'], [/<div class="gcal">/, 'прежний лист дара'],
    [/620 очков|Открыть платный ряд<\/button>/, 'пропуск-заглушка на 620 очков'], [/class="ms"|class="track"/, 'прежняя лента пропуска']])
    if (re.test(inline)) say(`index.html: остался прежний код — ${what}`);
  for (const [re, what] of [[/\n\.gcal\{|\n\.gday\{/, 'стили .gcal и .gday'], [/\n\.ms\{|\n\.track\{/, 'стили .ms и .track']]) if (re.test(html)) say(`index.html: остались ${what}`);
}
if (err.length) done();

/* ================== 2. данные свежие ================== */
const PB = require('../pass/build.js');
{
  const R = run('сборщик пропуска', () => PB.build());
  if (!R) done();
  for (const e of R.err || []) say('сборщик: ' + e);
  if (!R.err.length) {
    if (PB.render(R.data) !== fs.readFileSync(PB.FILES.out, 'utf8')) say('design/ui/pass.js устарел — node tools/content-gen/pass/build.js');
    const doc = fs.readFileSync(PB.FILES.doc, 'utf8'), fresh = PB.withTables(doc, R.tables);
    if (fresh == null) say('черновик пропуск-и-награды.md: нет меток таблиц'); else if (fresh !== doc) say('таблицы черновика устарели — node tools/content-gen/pass/build.js');
  }
}
if (err.length) done();

/* ================== 3. песочница ================== */
let reduced = false;
const stubEl = id => {
  const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, remove() {},
    animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
  e.querySelector = () => null;
  return e;
};
const els = {}, timers = [];
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
  createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: stubEl('html'), activeElement: null, fonts: null };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: reduced, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
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
  ACT, OV, SCREENS, FLOWS, KIT_EXTRA, MAP, TEMPLATES, KH, BAG, LBX, render, initialState, setTeam, inboxN, leagueOpen: typeof leagueOpen === 'function' ? leagueOpen : null,
  PS_SRV, DG_SRV, psWaiting, psNewDay, psShelterBtns, psGiftRow, psKitHtml, dgSync, LK_DATA, EN_PASS: window.EN_PASS, EnPass: window.EnPass, EN_EVENT: window.EN_EVENT, EN_EV: window.EN_EV,
})`, ctx);
const D = T.EN_PASS, PA = T.EnPass;
const BIG = Object.keys(D.units).find(k => D.caps[k] == null && !D.units[k].gate);   // дело без дневного потолка и условия — для больших зачётов
const reset = () => { T.S = T.initialState(); T.S.overlay = null; T.S.toast = null; timers.length = 0; };
const game = () => (els.game ? els.game.innerHTML : '');
const seenSvc = new Set();
function look(where, h) {
  cnt.views++;
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/undefined|NaN|\[object /);
  if (bad) say(`${where}: в разметке «${bad[0]}» — …${h.slice(Math.max(0, bad.index - 90), bad.index + 30).replace(/\s+/g, ' ')}…`);
  if (T.KH.team) return h;
  const v = strip(h), txt = playerText(h).split('\n').concat([...v.matchAll(/\s(?:title|aria-label)="([^"]*)"/g)].map(m => m[1]));
  for (const t of txt) {
    for (const [what, re] of SERVICE) { const k = what + '|' + t; if (re.test(t) && !seenSvc.has(k)) { seenSvc.add(k); say(`${where}: игроку видно служебное (${what}) — «${t.slice(0, 110)}»`); } }
    if (RUSH.test(t)) say(`${where}: торопящие слова — «${t.slice(0, 110)}»`);
  }
  return h;
}
const draw = where => { run(where, () => T.render()); return look(where, game()); };
const ovOf = h => { const i = h.indexOf('<div class="ov"'); return i < 0 ? '' : h.slice(i); };
const mainOf = h => { const i = h.indexOf('<main'), j = h.indexOf('<div class="ov"'); return i < 0 ? '' : h.slice(i, j > i ? j : undefined); };
const sheetOf = (where, t, arg) => { T.S.overlay = { t, arg }; cnt.sheets++; return ovOf(draw(where)); };
const numbers = s => (playerText(s).match(/\d[\d  ]*(?:[.,]\d+)?[КМ]?/g) || []).length;

/* ================== 2б. таблица дел — таблица Событий ================== */
{
  const EU = T.EN_EVENT.units;
  if (!EQ_(Object.keys(D.units).sort(), Object.keys(EU).sort())) say('EN_PASS.units: не те единицы, что у Событий');
  for (const [k, U] of Object.entries(D.units)) { const E = EU[k] || {}; if (U.price !== E.price || U.src !== E.src || (U.gate || '') !== (E.gate || '')) say(`EN_PASS.units.${k}: цена, источник или условие не как у Событий`); }
  if (!EQ_(D.caps, T.EN_EVENT.caps)) say('EN_PASS.caps: дневные потолки не как у Событий');
  if (!EQ_(D.sources.map(s => s.id), T.EN_EVENT.sources.map(s => s.id))) say('EN_PASS.sources: источники не как у Событий');
  const f = T.LK_DATA.frames.find(x => x.id === D.frame);
  if (!f) say(`рамки «${D.frame}» нет в облике (LK_DATA.frames)`); else if (f.n !== D.season.n) say(`рамка «${f.n}» и сезон «${D.season.n}» названы по-разному`);
  if (D.rows.paid.some(c => c.some(x => x.k === 'frame'))) say('в платном ряду облик');
  const walk = (x, where) => { if (typeof x === 'number' && !Number.isInteger(x)) say(`EN_PASS: не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, where + '.' + k); };
  walk(Object.assign({}, D, { meta: null }), 'EN_PASS');
}

/* ================== 4. экран «Пропуск» ================== */
{
  reset(); T.S.route = 'store'; T.S.seg.store = 'pass';
  const h = draw('пропуск · демо'), M = mainOf(h);
  if (!M.includes(D.season.n)) say('пропуск: нет имени сезона');
  if (!/class="ps-pts"[^>]*data-a="sheet" data-v="pssrc"/.test(M)) say('пропуск: очки не ведут в «Откуда очки»');
  const tabs = (M.match(/data-a="pspage"/g) || []).length;
  if (tabs !== Math.ceil(D.tiers / 10)) say(`пропуск: страниц ${tabs}, а надо ${Math.ceil(D.tiers / 10)}`);
  for (let pg = 1; pg <= tabs; pg++) {
    run('страница', () => T.ACT.pspage(String(pg)));
    const P = mainOf(draw(`пропуск · страница ${pg}`));
    const cols = [...P.matchAll(/<div class="ps-t([^"]*)"><span class="ps-tn num">(\d+)<\/span>([\s\S]*?)<\/div>(?=<div class="ps-t|<\/div><\/div>)/g)];
    if (cols.length !== 10) say(`страница ${pg}: столбцов ${cols.length}, а надо 10`);
    for (const c of cols) {
      const t = +c[2], cells = [...c[3].matchAll(/<button class="ps-c [^"]*"[\s\S]*?<\/button>/g)].map(m => m[0]);
      if (cells.length !== 2) say(`ступень ${t}: клеток ${cells.length}, а надо 2`);
      for (const x of cells) { if ((x.match(/<small class="num">/g) || []).length > 1) say(`ступень ${t}: в клетке больше одного числа`); if (/class="chip/.test(x)) say(`ступень ${t}: чип в клетке`); }
      if ((t % 10 === 0) !== /\bmile\b/.test(c[1])) say(`ступень ${t}: веха отмечена не так`);
    }
    if (cols.length && +cols[cols.length - 1][2] % 10 !== 0) say(`страница ${pg}: кончается не вехой`);
  }
  T.S.pass.view.page = 0;
  const N = (mainOf(draw('пропуск · следующая')).match(/<div class="pnl ps-next[\s\S]*?<\/div>(?=<div class="pnl ps-rib)/) || [''])[0];
  if (!N) say('пропуск: нет карточки следующей награды');
  else {
    if (numbers(N.replace(/<span class="eyebrow">[^<]*<\/span>/, '')) > 2) say('следующая награда: больше двух чисел');
    if ((N.match(/class="btn go/g) || []).length !== 1 || !/data-a="psall" data-v="ps\d+"/.test(N)) say('следующая награда: «Забрать всё» не одно главное действие с номером');
  }
  if (!/class="ps-buy"[^>]*data-a="sheet" data-v="pspaid"/.test(M)) say('пропуск: у платного ряда нет цены и пути в его лист');
  /* закрыт до 10-го уровня */
  reset(); T.S.acc.level = D.open.level - 1; T.S.route = 'store'; T.S.seg.store = 'pass';
  const L = mainOf(draw('пропуск · закрыт'));
  if (!L.includes(`${D.open.level}-м уровне`) || /data-a="psall"|class="ps-grid"/.test(L)) say('пропуск до 10-го уровня: нет условия или видна лента');
  const x = T.PS_SRV.claim('psX', 'free', 1); if (!x.refuse) say('пропуск до 10-го уровня: «Забрать» не отказал');
}

/* ================== 5. «сервер» пропуска ================== */
const fresh = (day = 1) => { reset(); T.S.pass = Object.assign(T.S.pass, { pts100: 0, by: {}, got: { free: {}, paid: {} }, day, srv: { ops: {}, seq: 1, used: { n: day, u: {} } } }); };
const op = () => 'ps' + T.S.pass.srv.seq;
const wallet = () => JSON.parse(JSON.stringify(T.S.wallet));
{
  /* зачёт дела: очки по таблице дел, повтор номера, отказы */
  fresh();
  let r = T.PS_SRV.credit('t:1', 'floor', 10); cnt.ops++;
  if (!r.res || T.S.pass.pts100 !== PA.pts100(D, 'floor', 10)) say(`зачёт: этажи ×10 — ${T.S.pass.pts100}, а по таблице дел ${PA.pts100(D, 'floor', 10)}`);
  const p0 = T.S.pass.pts100;
  r = T.PS_SRV.credit('t:1', 'floor', 10); cnt.ops++;
  if (!r.again || T.S.pass.pts100 !== p0) say('зачёт: повтор номера прибавил очки');
  for (const [u, n, why] of [['nope', 1, 'неизвестная единица'], ['floor', 0, 'ноль'], ['floor', 1.5, 'дробь']]) { const q = T.PS_SRV.credit('t:bad:' + why, u, n); if (!q.refuse || T.S.pass.pts100 !== p0) say(`зачёт: ${why} не отказал`); }
  /* потолок сезона копится: в первый день — не больше dayCap, на третий — втрое */
  /* большие зачёты — делом без дневного потолка (BIG): этажи и элиты под потолком спуска Событий (ADR-0031, п. 12) */
  fresh(1);
  T.PS_SRV.credit('t:big1', BIG, 100000); cnt.ops++;
  if (T.S.pass.pts100 !== D.dayCap * 100) say(`потолок дня 1: ${T.S.pass.pts100 / 100} очков, а надо ${D.dayCap}`);
  T.S.pass.day = 3; T.PS_SRV.credit('t:big3', BIG, 100000); cnt.ops++;
  if (T.S.pass.pts100 !== 3 * D.dayCap * 100) say(`потолок копится: к 3-му дню ${T.S.pass.pts100 / 100}, а надо ${3 * D.dayCap}`);
  T.S.pass.day = D.season.days; T.PS_SRV.credit('t:bigE', BIG, 10000000); cnt.ops++;
  if (T.S.pass.pts100 !== D.tiers * D.tierPts * 100) say('выше цели очки идут');
  /* дневной потолок единицы: победы Арены */
  fresh(2);
  const cap = D.caps.arenaWin;
  T.PS_SRV.credit('t:ar1', 'arenaWin', cap + 5); cnt.ops++;
  if (T.S.pass.pts100 !== PA.pts100(D, 'arenaWin', cap)) say('дневной потолок побед Арены не держится');
  const a0 = T.S.pass.pts100; T.PS_SRV.credit('t:ar2', 'arenaWin', 1);
  if (T.S.pass.pts100 !== a0) say('дневной потолок: сверх потолка засчиталось');
  T.psNewDay(); T.PS_SRV.credit('t:ar3', 'arenaWin', 1);
  if (T.S.pass.pts100 !== a0 + PA.pts100(D, 'arenaWin', 1)) say('новые сутки: потолок единицы не обнулился');
  /* Лига — только открытая */
  if (T.leagueOpen && !T.leagueOpen(T.S)) { fresh(); const q = T.PS_SRV.credit('t:lg', 'leagueWin', 1); if (!q.refuse || T.S.pass.pts100) say('матч Лиги засчитан при закрытой Лиге'); }
  /* обёртка «сервера» Событий: то же дело — пропуску, один раз */
  fresh(1);
  if (!T.EN_EV || !T.EN_EV.srv.psWrapped) say('«сервер» Событий не обёрнут: дела не идут в пропуск');
  else {
    run('Событие → пропуск', () => T.EN_EV.srv.credit('проверка:этажи', 'floor', 7)); cnt.ops++;
    const e1 = T.S.pass.pts100;
    if (e1 !== PA.pts100(D, 'floor', 7)) say(`Событие → пропуск: засчитано ${e1}, а надо ${PA.pts100(D, 'floor', 7)}`);
    run('Событие → пропуск', () => T.EN_EV.srv.credit('проверка:этажи', 'floor', 7));
    if (T.S.pass.pts100 !== e1) say('Событие → пропуск: повтор дела засчитан дважды');
  }
}
{
  /* «Забрать»: ровно клетка на уровне и цикле аккаунта, один раз */
  reset();
  const tier = PA.tierOf(D, T.S.pass.pts100), acc = { level: T.S.acc.level, cycle: T.S.acc.cycle };
  const w = T.psWaiting();
  if (w.length !== tier - D.demo.claimed) say(`демо: ждут ${w.length}, а взято ${tier}, забрано ${D.demo.claimed}`);
  const [row, t] = w[0], cell = PA.cell(D, row, t, acc), w0 = wallet(), c0 = T.S.bag.chests.length, o = op();
  let r = T.PS_SRV.claim(o, row, t); cnt.ops++;
  if (!r.res) say(`«Забрать» ступень ${t}: отказ ${r.refuse}`);
  const w1 = wallet(), c1 = T.S.bag.chests.length;
  for (const x of cell) {
    if (x.k === 'chest') { const ch = T.S.bag.chests[T.S.bag.chests.length - 1]; if (c1 !== c0 + 1 || ch.box !== x.box || ch.r !== x.r || ch.win !== x.win || ch.cyc !== T.S.acc.cycle) say(`«Забрать» ступень ${t}: сундук не тот`); }
    else if (x.k !== 'frame' && w1[x.k] - w0[x.k] !== x.n) say(`«Забрать» ступень ${t}: ${x.k} +${w1[x.k] - w0[x.k]}, а надо +${x.n}`);
  }
  r = T.PS_SRV.claim(o, row, t);
  if (!r.again || !EQ_(wallet(), w1) || T.S.bag.chests.length !== c1) say('«Забрать»: повтор номера выдал ещё раз');
  r = T.PS_SRV.claim(op(), row, t);
  if (!r.refuse || !EQ_(wallet(), w1)) say('«Забрать»: забранную клетку выдали снова');
  r = T.PS_SRV.claim(op(), 'free', Math.min(D.tiers, tier + 1));
  if (!r.refuse) say('«Забрать»: невзятая ступень выдана');
  r = T.PS_SRV.claim(op(), 'paid', 1);
  if (r.refuse !== 'paid') say('«Забрать»: платный ряд без покупки выдан');
  /* рост с уровнем: золото клетки по §16 */
  const gt = D.rows.free.findIndex(c => c[0].k === 'gold') + 1;
  T.S.acc.level = 50; T.S.pass.got.free[gt] = 0; delete T.S.pass.got.free[gt];
  const g0 = T.S.wallet.gold; T.PS_SRV.claim(op(), 'free', gt); cnt.ops++;
  const want = Math.floor(D.rows.free[gt - 1][0].b * (D.bp + 50 * D.level.perLevelBp) / D.bp);
  if (T.S.wallet.gold - g0 !== want) say(`рост с уровнем: золото ${T.S.wallet.gold - g0}, а по §16 — ${want}`);
  /* «Забрать всё» — одной операцией, каждая клетка один раз */
  reset();
  const all = T.psWaiting().length, o2 = op();
  r = T.PS_SRV.all(o2); cnt.ops++;
  if (!r.res || r.res.items.length !== all || T.psWaiting().length) say(`«Забрать всё»: выдано ${r.res ? r.res.items.length : 0} из ${all}`);
  const wa = wallet(); r = T.PS_SRV.all(o2);
  if (!r.again || !EQ_(wallet(), wa)) say('«Забрать всё»: повтор номера выдал ещё раз');
  if (!T.PS_SRV.all(op()).refuse) say('«Забрать всё»: пустое не отказало');
}
{
  /* покупка платного ряда */
  reset();
  T.S.wallet.enerium = D.price - 1;
  const w0 = wallet(), o = op();
  let r = T.PS_SRV.buy(o); cnt.ops++;
  if (r.refuse !== 'money' || !EQ_(wallet(), w0) || T.S.pass.paid) say('покупка при нехватке что-то изменила');
  T.S.overlay = { t: 'pspaid' }; const lack = ovOf(draw('платный ряд · нехватка'));
  if (!lack.includes('Не хватает') || /data-a="psbuy"/.test(lack)) say('лист платного ряда при нехватке: нет «Не хватает» или есть покупка');
  T.S.wallet.enerium = D.price + 10;
  const o2 = op(); r = T.PS_SRV.buy(o2); cnt.ops++;
  if (!r.res || T.S.wallet.enerium !== 10 || !T.S.pass.paid) say('покупка: цена не списана или ряд не открыт');
  r = T.PS_SRV.buy(o2);
  if (!r.again || T.S.wallet.enerium !== 10) say('покупка: повтор номера списал ещё раз');
  if (T.PS_SRV.buy(op()).refuse !== 'bought') say('покупка: второй раз не отказала');
  const tier = PA.tierOf(D, T.S.pass.pts100);
  const paidWait = T.psWaiting().filter(([row]) => row === 'paid').length;
  if (paidWait !== tier) say(`после покупки ждут платных ${paidWait}, а взято ступеней ${tier}`);
  const cell = PA.cell(D, 'paid', 5, { level: T.S.acc.level, cycle: T.S.acc.cycle }), e0 = T.S.wallet.enerium;
  T.PS_SRV.claim(op(), 'paid', 5); cnt.ops++;
  const en = cell.filter(x => x.k === 'enerium').reduce((a, x) => a + x.n, 0);
  if (T.S.wallet.enerium - e0 !== en) say('платная клетка 5: Энериум не тот');
}
{
  /* последняя ступень — рамка навсегда; конец сезона — незабранное во Входящие */
  reset();
  T.S.pass.day = D.season.days; T.PS_SRV.credit('t:all', BIG, 10000000);
  if (PA.tierOf(D, T.S.pass.pts100) !== D.tiers) say('цель сезона не берётся');
  if (!(T.S.look.pass && T.S.look.pass.pts >= T.S.look.pass.goal && T.S.look.pass.goal === D.tiers * D.tierPts)) say('облик: прогресс рамки не сходится с пропуском');
  const i0 = T.S.inbox.length, no = T.S.pass.no;
  const unclaimed = T.psWaiting();
  const r = T.PS_SRV.end(); cnt.ops++;
  if (!r || r.n !== unclaimed.reduce((a, [row, t]) => a + D.rows[row][t - 1].length, 0)) say('конец сезона: не все незабранные награды');
  if (!T.S.look.got['f:' + D.frame]) say('конец сезона: рамка не записана навсегда');
  if (T.S.inbox.length !== i0 + 1) say('конец сезона: нет письма во Входящих');
  if (T.S.pass.no !== no + 1 || T.S.pass.pts100 !== 0 || Object.keys(T.S.pass.got.free).length) say('конец сезона: новый сезон не с нуля');
  const m = T.S.inbox[0], c0 = T.S.bag.chests.length, w0 = wallet();
  run('письмо сезона', () => T.ACT.claim(m.id));
  const gotCur = Object.entries(Object.fromEntries(m.rew)).every(([k, n]) => T.S.wallet[k] - w0[k] === n);
  if (!gotCur || T.S.bag.chests.length !== c0 + (m.chests || []).length) say('письмо сезона: валюта или сундуки не пришли');
  if (T.S.inbox.some(x => x.id === m.id)) say('письмо сезона не закрылось');
  /* рамка по последней ступени — «Забрать» */
  reset(); T.S.look.got = {};
  T.S.pass.day = D.season.days; T.PS_SRV.credit('t:all2', BIG, 10000000);
  T.PS_SRV.claim(op(), 'free', D.tiers); cnt.ops++;
  if (!T.S.look.got['f:' + D.frame]) say('последняя ступень: рамка не записана');
}

/* ================== 6. лист даров ================== */
{
  reset();
  const G = T.S.gift, acc = () => ({ level: T.S.acc.level, cycle: T.S.acc.cycle });
  if (G.got !== D.demo.cal.got || G.day !== G.got + 1) say(`лист даров: демо не «взято ${D.demo.cal.got}, ${D.demo.cal.got + 1}-я ждёт»`);
  if (T.inboxN() !== T.S.inbox.length + 1) say('колокол: не считает дар дня');
  const g = sheetOf('дар дня', 'gift');
  const b = g.match(/data-a="giftget" data-v="(dg\d+)"/);
  if (!b) say('дар дня: нет «Забрать» с номером');
  if ((g.match(/class="dg-c /g) || []).length !== D.cal.marks) say('дар дня: в листе не 30 отметок');
  if (!/class="dg-c now/.test(g)) say('дар дня: сегодняшняя не светится');
  if ((g.match(/class="dg-c [^"]*\bmile\b/g) || []).length !== Object.keys(D.cal.miles).length) say('дар дня: вехи отмечены не все');
  if (!/class="dg-c [^"]*\bmain\b/.test(g)) say('дар дня: главный дар не отмечен');
  if ((g.match(/<div class="dg-m[ "]/g) || []).length !== Object.keys(D.cal.miles).length) say('дар дня: вехи крупно — не по одной на каждую');
  if (!/<div class="dg-m main[^>]*>[\s\S]*?Главный дар/.test(g)) say('дар дня: в строке вех нет главного дара');
  const m = G.got + 1, list = PA.mark(D, m, acc()), w0 = wallet(), c0 = T.S.bag.chests.length;
  let r = T.DG_SRV.claim(b ? b[1] : 'dg1'); cnt.ops++; cnt.marks++;
  const w1 = wallet();
  for (const x of list) if (x.k === 'chest') { if (T.S.bag.chests.length !== c0 + 1) say('отметка: сундук не пришёл'); } else if (w1[x.k] - w0[x.k] !== x.n) say(`отметка ${m}: ${x.k} +${w1[x.k] - w0[x.k]}, а надо +${x.n}`);
  if (T.S.gift.got !== m || T.S.gift.day !== m) say('отметка: поля колокола не обновились');
  if (T.inboxN() !== T.S.inbox.length) say('колокол: взятый дар всё ещё считается');
  r = T.DG_SRV.claim(b ? b[1] : 'dg1');
  if (!r.again || !EQ_(wallet(), w1)) say('отметка: повтор номера выдал ещё раз');
  r = T.DG_SRV.claim('dg' + T.S.gift.srv.seq);
  if (r.refuse !== 'today' || !EQ_(wallet(), w1)) say('отметка: вторая за сутки выдана');
  /* пропуск суток лист не сбрасывает */
  for (let k = 0; k < 3; k++) T.DG_SRV.newDay();
  if (T.S.gift.got !== m || T.S.gift.day !== m + 1) say('пропуск суток сбросил лист или отметок стало больше одной');
  /* главный дар — 20-я: сундук чистого окна и Энериум */
  T.S.gift.got = D.cal.main - 1; T.S.gift.last = T.S.gift.today - 1; T.dgSync();
  const e0 = T.S.wallet.enerium, ch0 = T.S.bag.chests.length;
  T.DG_SRV.claim('dg' + T.S.gift.srv.seq); cnt.ops++; cnt.marks++;
  const ch = T.S.bag.chests[T.S.bag.chests.length - 1], main = PA.mark(D, D.cal.main, acc());
  if (T.S.bag.chests.length !== ch0 + 1 || ch.win !== 'pure' || ch.r !== main.find(x => x.k === 'chest').r) say('главный дар: не сундук чистого окна');
  if (T.S.wallet.enerium - e0 !== main.filter(x => x.k === 'enerium').reduce((a, x) => a + x.n, 0) || T.S.wallet.enerium === e0) say('главный дар: нет Энериума');
  /* после 30-й — новый лист */
  T.S.gift.got = D.cal.marks - 1; T.S.gift.last = T.S.gift.today - 1; T.dgSync();
  T.DG_SRV.claim('dg' + T.S.gift.srv.seq); cnt.marks++;
  const sh = T.S.gift.sheet; T.DG_SRV.newDay();
  if (T.S.gift.sheet !== sh + 1 || T.S.gift.got !== 0 || T.S.gift.day !== 1) say('после 30-й отметки новый лист не начался');
  /* цикл I: прах — дух; валюта растёт с уровнем */
  const dm = D.cal.list.findIndex(c => c[0].k === 'dust') + 1, x1 = PA.mark(D, dm, { level: 5, cycle: 1 })[0], x2 = PA.mark(D, dm, { level: 24, cycle: 2 })[0];
  if (x1.k !== 'spirit' || x2.k !== 'dust') say('лист даров: прах в цикле I не заменён духом');
  const gm = D.cal.list.findIndex(c => c[0].k === 'gold') + 1, gx = PA.mark(D, gm, { level: 24, cycle: 2 })[0];
  if (gx.n !== Math.floor(D.cal.list[gm - 1][0].b * (D.bp + 24 * D.level.perLevelBp) / D.bp)) say('лист даров: золото не по §16');
  /* отметки листа — одна награда в день, вехи — до двух */
  D.cal.list.forEach((c, i) => { if (c.length > (D.cal.miles[i + 1] ? 2 : 1)) say(`отметка ${i + 1}: наград ${c.length}`); });
}

/* ================== 7. анимации ================== */
{
  reset(); T.S.route = 'store'; T.S.seg.store = 'pass';
  run('«Забрать всё»', () => T.ACT.psall(op()));
  const fx = T.S.pass.fx;
  if (!fx || fx.done || !T.S.overlay || T.S.overlay.t !== 'psgot') say('«Забрать всё»: нет показа получения');
  const a = ovOf(draw('показ получения'));
  if (!/class="ps-got anim"/.test(a) || !/--dt:-?\d+ms/.test(a) || !/data-a="psskip"/.test(a)) say('показ получения: нет моментов или нажатия «сразу итог»');
  if (!timers.length) say('показ получения: частицы не запланированы');
  run('сразу итог', () => T.ACT.psskip());
  if (!T.S.pass.fx.done || /class="ps-got anim"/.test(ovOf(draw('показ · итог')))) say('нажатие не дало сразу итог');
  reduced = true; reset(); T.S.route = 'store'; T.S.seg.store = 'pass';
  run('«меньше движения»', () => T.ACT.psall(op()));
  if (!T.S.pass.fx || !T.S.pass.fx.done) say('«меньше движения»: показ не пропущен');
  run('дар дня · «меньше движения»', () => T.ACT.giftget('dg' + T.S.gift.srv.seq));
  if (T.S.gift.fx) say('дар дня · «меньше движения»: показ не пропущен');
  reduced = false; reset();
  run('дар дня · забрать', () => T.ACT.giftget('dg' + T.S.gift.srv.seq)); cnt.marks++;
  if (!T.S.gift.fx) say('дар дня: нет показа');
  const gh = ovOf(draw('дар дня · показ'));
  if (!/class="dg-today[^"]*\banim\b/.test(gh) || !/data-a="dgskip"/.test(gh)) say('дар дня: показ не в карточке «Сегодня» или нет «сразу итог»');
  run('дар дня · сразу итог', () => T.ACT.dgskip());
  if (T.S.gift.fx) say('дар дня: нажатие не дало итог');
  for (const m of CSS.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g))
    for (const d of m[2].matchAll(/([a-z-]+)\s*:/g)) if (!ANIM_PROPS.includes(d[1])) say(`pass.css: кадр ${m[1]} меняет ${d[1]} — только transform и opacity`);
  for (const m of CSS.matchAll(/transition\s*:\s*([^;}]+)/g)) for (const part of m[1].split(',')) { const p = part.trim().replace(/\s*!important$/, '').split(/\s+/)[0]; if (p !== 'none' && !ANIM_PROPS.includes(p)) say(`pass.css: переход по ${p}`); }
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(CSS)) say('pass.css: нет «меньше движения»');
}

/* ================== 8. честность ================== */
{
  reset();
  const s = sheetOf('платный ряд', 'pspaid'), acc = { level: T.S.acc.level, cycle: T.S.acc.cycle };
  const kinds = new Set(); for (let t = 1; t <= D.tiers; t++) for (const x of PA.cell(D, 'paid', t, acc)) kinds.add(x.k);
  const NAME = { gold: 'Золото', spirit: 'Дух', dust: 'Прах душ', keys: 'Рунные ключи', enerium: 'Энериум', chest: '×3' };
  for (const k of kinds) if (NAME[k] && !playerText(s).includes(NAME[k])) say(`лист платного ряда: не назван вид «${k}»`);
  if (!/Очков не прибавляет/.test(s)) say('лист платного ряда: нет «очков не прибавляет»');
  if (!s.includes(`${D.price}`) && !s.includes(Number(D.price).toLocaleString('ru-RU'))) say('лист платного ряда: нет цены');
  for (const [t, a] of [['pssrc'], ['psinfo'], ['pstier', '1'], ['pstier', String(D.tiers)]]) {
    const h = sheetOf(`лист ${t} ${a || ''}`, t, a);
    if (t === 'pssrc' && !/не продаются/.test(h)) say('«Откуда очки»: нет «очки и ступени не продаются»');
  }
}

/* ================== 9. арт ================== */
{
  reset(); T.S.route = 'store'; T.S.seg.store = 'pass';
  const ready0 = D.art.ready.slice();
  D.art.ready.length = 0;
  let h = draw('арт · не выгружен') + ovOf((T.S.overlay = { t: 'gift' }, draw('арт · дар дня')));
  if (/src="[^"]*pass\//.test(h) || /src="[^"]*workers\/worker/.test(h)) say('арт: ссылка на невыгруженную картинку');
  D.art.ready.push(D.art.banner, D.cal.miles[7].art, D.cal.miles[20].art, D.art.dust);
  T.S.overlay = null; h = draw('арт · выгружен');
  if (!/<img class="ps-art" src="[^"]*pass\/banner\.jpg\?v=/.test(h)) say('арт: выгруженный баннер не AV с версией');
  T.S.gift.got = 6; T.S.gift.last = 0; T.dgSync(); T.S.overlay = { t: 'gift' }; h = ovOf(draw('арт · веха'));
  if (!/class="dg-art" src="[^"]*pass\/gift-07\.jpg/.test(h)) say('арт: веха 7 без рисунка');
  if (!/class="dg-mimg" src="[^"]*pass\/gift-20\.jpg/.test(h)) say('арт: клетка главного дара без рисунка');
  D.art.ready.length = 0; ready0.forEach(p => D.art.ready.push(p));
}

/* ================== 10. Убежище, Входящие, Лавка ================== */
{
  reset(); T.S.route = 'shelter';
  const h = mainOf(draw('Убежище'));
  if (!/data-a="dlg" data-v="gift"/.test(h) || !/data-a="go" data-v="store:pass"/.test(h)) say('Убежище: нет «Дар дня» или «Пропуск»');
  if (!/ps-sb hot/.test(h)) say('Убежище: «Дар дня» не светится, пока отметка ждёт');
  T.S.seg.mailt = 'rew'; const ib = sheetOf('Входящие', 'inbox');
  if (!/class="mail dg-row" data-a="dlg" data-v="gift"/.test(ib) || !ib.includes(`отметка ${T.S.gift.day} из ${D.cal.marks}`)) say('Входящие: нет строки дара дня');
  T.S.overlay = null; T.S.route = 'store'; T.S.seg.store = 'en';
  const st = draw('Лавка · Энериум');
  if (!/data-v="store:pass">Пропуск<span class="bdg"/.test(st)) say('Лавка: у вкладки «Пропуск» нет точки, когда ждут награды');
  T.S.seg.store = 'look'; draw('Лавка · облик');
}

/* ================== 11. UI-кит, карта экранов, сценарии, режим «Игрок» ================== */
{
  for (const team of [false, true]) {
    run('режим', () => T.setTeam(team));
    reset();
    const k = T.KIT_EXTRA.find(x => { try { return x.html().includes('Боевой пропуск и дар дня'); } catch (_) { return false; } });
    if (!k) say('UI-кит: нет раздела «Боевой пропуск и дар дня»');
    else { const h = run('UI-кит', () => k.html()) || ''; if (/undefined|NaN|\[object /.test(h)) say('UI-кит: undefined или NaN'); if (!team && /EN_PASS/.test(strip(h))) say('UI-кит: служебное без team-only'); }
    for (const [t, , f] of T.FLOWS.filter(x => /^Пропуск|^Дар дня/.test(x[0]))) { reset(); run('сценарий ' + t, () => f()); draw(`сценарий «${t}»${team ? ' [команда]' : ''}`); }
    /* все состояния экрана и листов — в обоих режимах */
    reset(); T.S.route = 'store'; T.S.seg.store = 'pass';
    draw('пропуск' + (team ? ' [команда]' : ''));
    for (const [t, a] of [['pspaid'], ['pssrc'], ['psinfo'], ['gift']].concat(Array.from({ length: D.tiers }, (_, i) => ['pstier', String(i + 1)]))) sheetOf(`лист ${t} ${a || ''}${team ? ' [команда]' : ''}`, t, a);
    reset(); T.S.wallet.enerium = D.price; T.PS_SRV.buy(op()); T.S.route = 'store'; T.S.seg.store = 'pass'; draw('платный ряд открыт' + (team ? ' [команда]' : ''));
    T.S.pass.day = D.season.days; T.PS_SRV.credit('t:done', BIG, 10000000); T.PS_SRV.all(op()); T.S.overlay = null; draw('путь пройден' + (team ? ' [команда]' : ''));
  }
  run('режим «Игрок»', () => T.setTeam(false));
  const shop = T.MAP.find(m => m.n === 'Лавка Энериума');
  if (!shop || !(shop.ready || []).includes('battle-pass')) say('карта экранов: пропуск не отмечен готовым');
  const tpl = T.TEMPLATES.find(x => x[0] === 'Входящие');
  if (!tpl || !(tpl[3] || []).includes('calendar')) say('карта экранов: дар дня не отмечен готовым');
  if (T.FLOWS.filter(x => /^Пропуск|^Дар дня/.test(x[0])).length < 4) say('сценариев пропуска и дара дня меньше четырёх');
}
done();
