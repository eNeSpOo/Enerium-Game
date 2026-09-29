/* Автопроверка рулетки «Возрождения душ» (design/ui/screens/roulette.js) — без браузера.
   1. index.html подключает roulette.css и roulette.js после model.js, вкладка «За души» зовёт rlCol; roulette.js компилируется.
   2. Данные: цена прокрутки RL_DATA.price — та же, что EN_ROSTER.rules.spin (§15.1); три кнопки ×1, ×10, ×100; шансы — целые б. п.,
      веса осколков в сумме дают 100 %.
   3. «Сервер» rlRoll — чистая функция: тот же пул, сид и число — тот же итог; ×1, ×10, ×100 — 1, 10, 100 итогов. Формат — ровно три
      броска на прокрутку: итог пересчитывается независимо тем же генератором EnLoot. На 20 000 прокруток доли полного чертежа,
      числа осколков и героев сходятся с RL_DATA. Две свежие сессии с одними номерами операций получают одни итоги.
   4. Операция RL_SRV через кнопку ACT.rlspin: Энериум списан один раз — цена × число; осколки — в S.rs.shards, герой из коллекции —
      в прах по §15.3 (rsDustOf); итог операции сходится с запасами и кошельком; повтор того же номера ничего не меняет; нехватка
      Энериума, пустой пул и неверное число — отказ без расхода. Полный чертёж — комплект осколков: «Пробудить» из итога приводит героя
      с 0 ур., 0 РП и 0 Добл, остаток — в прах (§15.2).
   5. Вид: колонка на циклах I–VI, окно рулетки — лента, цена, три кнопки, галочка; нехватка — кнопка неактивна, причина — строкой.
      Без пропуска лента крутится: выпавшая карточка — итог сервера, длительность 4–6 с, у ×10 и ×100 — короткая лента на самый ценный
      итог; новая лента начинается с соседей прошлой остановки; кривая монотонна и тормозит до нуля; итог — только после остановки.
      «Пропустить анимацию» и prefers-reduced-motion — итог сразу; выбор помнит localStorage, без него всё работает. Сводка ×10 и ×100:
      полные — первыми, осколки по героям с суммой, прах, потрачено.
   6. Режим «Игрок»: на всех видах рулетки нет служебных слов (SERVICE из check_player_view.js), нет undefined и NaN;
      в режиме «Команда» пометка «шансы — демонстрация» на месте.
   7. «Дорого-богато» (слово автора 29.09.2026): за окном и вкладкой — алтарь душ (RL_ART.altar или CSS), у входа — веер героев пула
      в раме: шаг от середины — целые --d и --a, середина впереди; полный герой ленты и итога — в раме (рисунок RL_ART.frame или CSS),
      осколок — стекло с лицом героя (shardGhost, class="hsg") в ленте, в итоге и в сводке. Честно (§1.2): у входа и в окне видны цена
      прокрутки и шанс героя целиком, лист «Шансы» — ссылкой, пока лента стоит. Арт: пути RL_ART.ready лежат в assets/art, невыгруженные
      (RL_ART.want без ready) в разметке не встречаются — битых картинок нет.
   Запуск: node tools/content-gen/screens/check_roulette.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText, teamCount } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, ops: 0, spins: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Рулетка: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; операций ${cnt.ops}, прокруток ${cnt.spins}.`);
  console.log('Проверка пройдена: итог решает «сервер» на сиде, расход один раз, выдача сходится с кошельком, лента и итог рисуются, в режиме «Игрок» служебного нет.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const iM = scripts.findIndex(s => s.src === 'screens/model.js'), iR = scripts.findIndex(s => s.src === 'screens/roulette.js');
  if (iR < 0) say('index.html: не подключён screens/roulette.js');
  else if (iR < iM) say('index.html: roulette.js подключён раньше model.js');
  if (!/<link rel="stylesheet" href="screens\/roulette\.css">/.test(html)) say('index.html: не подключён screens/roulette.css');
  const souls = html.match(/function rsSoulsView\(\)[\s\S]*?\n\}/);
  if (!souls || !/rlCol\(\)/.test(souls[0])) say('index.html: вкладка «За души» (rsSoulsView) не зовёт rlCol');
  try { new vm.Script(read('screens/roulette.js'), { filename: 'screens/roulette.js' }); } catch (e) { say('screens/roulette.js: синтаксис — ' + e.message); }
}
if (err.length) done();

/* ================== песочница ==================
   Скрипты прототипа — по порядку, как в браузере, с заглушкой DOM; boot() не запускается. storage — 'throw' (localStorage недоступен)
   или Map; reduced — prefers-reduced-motion. Классы <html> настоящие: режим «Команда» ставит класс team */
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
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const S0 = o.storage;
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const localStorage = S0 instanceof Map ? { getItem: k => (S0.has(k) ? S0.get(k) : null), setItem: (k, v) => { S0.set(k, String(v)); }, removeItem: k => { S0.delete(k); } }
    : { getItem: noStore, setItem: noStore, removeItem: noStore };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} }, localStorage,
    innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1, addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    matchMedia: q => ({ matches: !!o.reduced && /prefers-reduced-motion/.test(q), addEventListener() {}, addListener() {} }),
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
    ACT, OV, FLOWS, KH, RS, RSI, render, initialState, setTeam, rsPool, rsCyc, rsHas, rsDustOf, fmt, EnLoot: window.EnLoot,
    RL_DATA, RL_VIEW, RL_SRV, rlRoll, rlLand, rlReveal, rlFilm, rlBest, rlEase, rlGroups, rlCol, rlPct,
    RL_ART: typeof RL_ART !== 'undefined' ? RL_ART : null, rlCard: typeof rlCard === 'function' ? rlCard : null, RS_ART: typeof RS_ART !== 'undefined' ? RS_ART : null, KIT_EXTRA,
  })`, ctx);
  return { T, els, rootCls, game: () => (els.game ? els.game.innerHTML : '') };
}

const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
/* разметка экрана: без исключений, undefined и NaN; в режиме «Игрок» — без служебных слов в тексте, подсказках и сообщениях */
function view(P, where) {
  cnt.views++;
  run(where, () => P.T.render());
  const h = P.game();
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!P.T.KH.team) {
    cnt.player++;
    const v = strip(h), txt = playerText(h).split('\n').concat(tips(v));
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
  }
  return h;
}
/* свежая сессия: рулетка цикла II, Энериума с запасом, «Пропустить анимацию» — как задано */
function fresh(P, o = {}) {
  const T = P.T;
  T.S = T.initialState(); T.S.overlay = null; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls';
  T.S.acc.cycle = o.cyc || 2; T.S.rs.cyc = 0; T.S.wallet.enerium = o.en != null ? o.en : 1000000;
  if (o.skip != null) T.S.rl.skip = o.skip;
}
const snap = T => JSON.parse(JSON.stringify({ en: T.S.wallet.enerium, dust: T.S.wallet.dust, souls: T.S.wallet.souls, shards: T.S.rs.shards, owned: T.S.rs.owned, seq: T.S.rl.seq }));
const next = T => 'rl' + T.S.rl.seq;
/* окно итога из разметки экрана: за ним — вкладка «За души» с теми же именами героев */
const resOf = h => { const i = h.indexOf('<section class="rl-res'); return i < 0 ? '' : h.slice(i, h.indexOf('</section>', i)); };
/* нажатие кнопки прокрутки: номер операции берётся с кнопки, как в разметке */
function spin(P, n, where) {
  const T = P.T, op = next(T);
  const btn = new RegExp(`data-a="rlspin" data-v="${n}:${op}"`);
  if (T.S.overlay && T.S.overlay.t === 'rl' && !btn.test(view(P, where + ' · кнопка'))) say(`${where}: в окне нет кнопки ×${n} с номером операции ${op}`);
  run(where, () => T.ACT.rlspin(`${n}:${op}`));
  return op;
}

/* ================== 2. данные ================== */
const P = load();
const { T } = P;
const D = T.RL_DATA, V = T.RL_VIEW;
if (D.price !== T.RS.rules.spin) say(`RL_DATA.price = ${D.price}, а EN_ROSTER.rules.spin = ${T.RS.rules.spin}: цена прокрутки §15.1 разошлась`);
if (!eq(D.counts, [1, 10, 100])) say(`RL_DATA.counts = ${JSON.stringify(D.counts)}: ждали ×1, ×10, ×100`);
{
  const ints = [];
  (function walk(x, k) { if (typeof x === 'number') { if (!Number.isInteger(x)) ints.push(k); } else if (x && typeof x === 'object') for (const [kk, v] of Object.entries(x)) walk(v, k + '.' + kk); })(D, 'RL_DATA');
  if (ints.length) say('RL_DATA: не целые числа — ' + ints.join(', '));
  const W = D.shards.reduce((a, x) => a + x[1], 0);
  if (W !== D.bp) say(`RL_DATA.shards: сумма весов ${W}, ждали ${D.bp}`);
  if (!(D.fullBp > 0 && D.fullBp < D.bp)) say('RL_DATA.fullBp вне (0; bp)');
}

/* ================== 3. «сервер»: rlRoll ================== */
fresh(P);
const pool = T.rsPool(), need = T.RS.rules.stub.shards, counts = D.shards.map(x => x[0]);
if (pool.length < 2) say(`пул рулетки цикла II: героев ${pool.length}`);
if (pool.some(h => h.src !== 'roulette' || h.c !== 2)) say('пул рулетки цикла II: чужие герои');
/* независимый пересчёт: три броска на прокрутку — герой, полный ли чертёж, число осколков */
function reroll(pl, seed, n) {
  const rng = T.EnLoot.makeRng(seed), W = D.shards.reduce((a, x) => a + x[1], 0), out = [];
  for (let i = 0; i < n; i++) {
    const h = pl[rng(pl.length)], full = rng(D.bp) < D.fullBp; let k = rng(W), q = 0;
    for (const [c, w] of D.shards) { if (k < w) { q = c; break; } k -= w; }
    out.push({ id: h.id, full, q: full ? need : q });
  }
  return out;
}
for (const seed of [1, 12345, 0xDEADBEEF, T.EnLoot.seedOf('возрождение|проверка')]) for (const n of D.counts) {
  const a = T.rlRoll(pool, seed, n), b = T.rlRoll(pool, seed, n);
  cnt.spins += n;
  if (!eq(a, b)) say(`rlRoll: сид ${seed}, ×${n} — два вызова дали разный итог`);
  if (a.length !== n) say(`rlRoll: ×${n} вернул ${a.length} итогов`);
  if (!eq(a, reroll(pool, seed, n))) say(`rlRoll: сид ${seed}, ×${n} — итог не совпал с пересчётом «три броска на прокрутку»`);
  for (const g of a) {
    if (!pool.some(h => h.id === g.id)) say(`rlRoll: герой ${g.id} не из пула цикла`);
    if (g.full ? g.q !== need : !counts.includes(g.q)) say(`rlRoll: ${g.id} — ${g.full ? 'чертёж' : 'осколки'} ×${g.q} не по данным`);
  }
  if (n > 1 && !eq(a.slice(0, 1), T.rlRoll(pool, seed, 1))) say(`rlRoll: сид ${seed} — первая прокрутка ×${n} не та же, что ×1`);
}
if (eq(T.rlRoll(pool, 1, 100), T.rlRoll(pool, 2, 100))) say('rlRoll: разные сиды дали один итог ×100');
{
  const N = 20000, L = T.rlRoll(pool, T.EnLoot.seedOf('возрождение|статистика'), N), by = {}, byQ = {};
  let full = 0;
  for (const g of L) { by[g.id] = (by[g.id] || 0) + 1; if (g.full) full++; else byQ[g.q] = (byQ[g.q] || 0) + 1; }
  cnt.spins += N;
  const want = N * D.fullBp / D.bp;
  if (Math.abs(full - want) > want * 0.3) say(`доля полного чертежа: ${full} из ${N}, ждали около ${want}`);
  for (const [q, w] of D.shards) { const got = (byQ[q] || 0) / (N - full), exp = w / D.bp; if (Math.abs(got - exp) > 0.015) say(`доля осколков ×${q}: ${(got * 100).toFixed(1)} %, ждали ${(exp * 100).toFixed(1)} %`); }
  for (const h of pool) { const got = (by[h.id] || 0) / N, exp = 1 / pool.length; if (Math.abs(got - exp) > 0.015) say(`доля героя ${h.n}: ${(got * 100).toFixed(1)} %, ждали ${(exp * 100).toFixed(1)} %`); }
}

/* ================== 4. операция: расход, выдача, повтор, отказы ================== */
/* проверка одной операции: кошелёк и запасы изменились ровно на итог сервера; итог — rlRoll на сиде операции */
function checkOp(where, s0, op) {
  const S = T.S, R = S.rl.srv.ops[op];
  if (!R) { say(`${where}: операции ${op} нет у «сервера»`); return null; }
  cnt.ops++; cnt.spins += R.n;
  if (R.list.length !== R.n) say(`${where}: итогов ${R.list.length}, прокруток ${R.n}`);
  if (R.cost !== D.price * R.n) say(`${where}: цена операции ${R.cost}, ждали ${D.price * R.n}`);
  if (s0.en - S.wallet.enerium !== R.cost) say(`${where}: списано Энериума ${s0.en - S.wallet.enerium}, ждали ${R.cost}`);
  if (!eq(R.list.map(g => ({ id: g.id, full: g.full, q: g.q })), T.rlRoll(pool, R.seed, R.n))) say(`${where}: итог не совпал с rlRoll на сиде операции`);
  const sh = {}, own = id => !!s0.owned[id];
  let dust = 0;
  for (const g of R.list) {
    const h = T.RSI[g.id];
    if (own(g.id)) { const d = g.q * T.rsDustOf(h); dust += d; if (g.dust !== d) say(`${where}: ${h.n} в коллекции — прах ${g.dust}, ждали ${d}`); }
    else { sh[g.id] = (sh[g.id] || 0) + g.q; if (g.dust) say(`${where}: ${h.n} не в коллекции, а осколки ушли в прах`); }
  }
  const dsh = {};
  for (const id of new Set([...Object.keys(s0.shards), ...Object.keys(S.rs.shards)])) { const d = (S.rs.shards[id] || 0) - (s0.shards[id] || 0); if (d) dsh[id] = d; }
  if (!eq(Object.entries(dsh).sort(), Object.entries(sh).sort())) say(`${where}: осколки в запасах ${JSON.stringify(dsh)}, ждали ${JSON.stringify(sh)}`);
  if (S.wallet.dust - s0.dust !== dust || R.dust !== dust) say(`${where}: прах +${S.wallet.dust - s0.dust} (в итоге ${R.dust}), ждали +${dust}`);
  if (S.wallet.souls !== s0.souls) say(`${where}: прокрутка тронула души`);
  if (S.rl.seq !== s0.seq + 1) say(`${where}: номер следующей операции не сдвинулся`);
  return R;
}
/* повтор того же номера: ни расхода, ни выдачи */
function checkAgain(where, op, n) {
  const s0 = snap(T);
  run(where + ' · повтор', () => T.ACT.rlspin(`${n}:${op}`));
  const r = run(where + ' · повтор на сервере', () => T.RL_SRV.spin(op, n));
  if (!r || !r.again) say(`${where}: «сервер» не узнал повтор операции ${op}`);
  const s1 = snap(T);
  if (!eq(s0, s1)) say(`${where}: повтор операции ${op} изменил кошелёк или запасы`);
}

/* ×1, ×10, ×100 с пропуском анимации; три героя пула уже в коллекции — их осколки уходят в прах */
fresh(P, { skip: true });
for (const h of pool.slice(0, 3)) T.S.rs.owned[h.id] = { lvl: 0, lim: 0, valor: 0, how: 'souls' };
T.S.overlay = { t: 'rl', arg: '' };
view(P, 'окно рулетки · покой');
const summary = {};
for (const n of D.counts) {
  const where = `операция ×${n}`, s0 = snap(T), op = spin(P, n, where);
  const R = checkOp(where, s0, op);
  if (!R) continue;
  if (T.S.rl.show !== op || T.S.rl.anim) say(`${where}: «Пропустить анимацию» — итог не открылся сразу`);
  const h = resOf(view(P, where + ' · итог'));
  summary[n] = { R, h };
  if (!h) { say(`${where}: нет окна итога`); continue; }
  if (n === 1) {
    const g = R.list[0];
    if (!h.includes('Итог прокрутки') || !h.includes(T.RSI[g.id].n)) say(`${where}: в окне итога нет «Итог прокрутки» или имени героя`);
  } else {
    if (!h.includes(`Итог · ×${n}`) || !h.includes('Потрачено') || !h.includes(T.fmt(R.cost))) say(`${where}: в сводке нет заголовка или «Потрачено ${R.cost}»`);
    const G = T.rlGroups(R), q = G.shards.reduce((a, x) => a + x.q, 0);
    if (G.shards.length && !h.includes(`Осколки · ${T.fmt(q)}`)) say(`${where}: сумма осколков ${q} не в сводке`);
    for (const x of G.shards) if ((h.match(new RegExp(`<b>${T.RSI[x.id].n}</b>`, 'g')) || []).length !== 1) say(`${where}: осколки ${T.RSI[x.id].n} не одной строкой`);
    if (R.dust && (!h.includes('В прах') || !h.includes(T.fmt(R.dust)))) say(`${where}: прах ${R.dust} не в сводке`);
    const iF = h.indexOf('Полные чертежи'), iS = h.indexOf('Осколки ·'), iD = h.indexOf('В прах');
    if (iF >= 0 && iS >= 0 && iF > iS) say(`${where}: полные чертежи не первыми`);
    if (iS >= 0 && iD >= 0 && iS > iD) say(`${where}: прах выше осколков`);
  }
  checkAgain(where, op, n);
  const col = (T.S.overlay = null, view(P, where + ' · колонка'));
  if (!/Прошлая/.test(col)) say(`${where}: колонка не показывает прошлую прокрутку`);
  T.S.overlay = { t: 'rl', arg: '' };
}
if (summary[100] && !summary[100].R.dust) say('×100 с тремя героями в коллекции: ничего не ушло в прах');

/* полный чертёж: демо команды «следующим — полный»; герой не в коллекции — комплект осколков и «Пробудить» из итога */
{
  fresh(P, { skip: true }); T.S.overlay = { t: 'rl', arg: '' };
  T.S.rl.demoFull = true;
  const s0 = snap(T), op = spin(P, 1, 'полный чертёж'), R = checkOp('полный чертёж', s0, op);
  if (R) {
    const g = R.list[0], h = T.RSI[g.id];
    if (!g.full || g.q !== need) say(`полный чертёж: выпало ${g.full ? 'чертёж' : 'осколки'} ×${g.q}`);
    if (T.S.rl.demoFull) say('полный чертёж: демо-флаг не снялся после операции');
    const html1 = resOf(view(P, 'полный чертёж · итог'));
    if (!html1.includes('Полный чертёж') || !html1.includes('Герой') || !html1.includes(`data-a="activate" data-v="${g.id}"`)) say('полный чертёж: в итоге нет «Полный чертёж», «Герой» или «Пробудить»');
    const d0 = T.S.wallet.dust, extra = (T.S.rs.shards[g.id] || 0) - need;
    run('пробуждение', () => T.ACT.activate(g.id));
    if (!T.S.overlay || T.S.overlay.t !== 'confirm') say('пробуждение из итога: нет подтверждения');
    else view(P, 'пробуждение · подтверждение');
    run('пробуждение', () => T.ACT.activatedo(g.id));
    const own = T.S.rs.owned[g.id];
    if (!own || own.lvl !== 0 || own.lim !== 0 || own.valor !== 0) say(`пробуждение: ${h.n} не пришёл с 0 ур., 0 РП и 0 Добл`);
    if (T.S.rs.shards[g.id]) say('пробуждение: осколки героя остались в запасах');
    if (T.S.wallet.dust - d0 !== Math.max(0, extra) * T.rsDustOf(h)) say(`пробуждение: остаток осколков в прах ${T.S.wallet.dust - d0}, ждали ${Math.max(0, extra) * T.rsDustOf(h)}`);
    /* тот же герой уже в коллекции: следующий чертёж — целиком в прах */
    T.S.overlay = { t: 'rl', arg: '' };
    let tries = 0, got = null;
    while (tries++ < 40 && !got) {
      T.S.rl.demoFull = true;
      const s1 = snap(T), op2 = spin(P, 1, 'чертёж героя из коллекции'), R2 = checkOp('чертёж героя из коллекции', s1, op2);
      if (R2 && R2.list[0].id === g.id) got = R2;
    }
    if (!got) say('чертёж героя из коллекции: за 40 операций тот же герой не выпал');
    else {
      if (got.list[0].dust !== need * T.rsDustOf(h)) say(`чертёж героя из коллекции: прах ${got.list[0].dust}, ждали ${need * T.rsDustOf(h)}`);
      const html2 = resOf(view(P, 'чертёж героя из коллекции · итог'));
      if (!html2.includes('Уже в коллекции')) say('чертёж героя из коллекции: итог не говорит, что всё ушло в прах');
    }
  }
  /* ×100 с полным чертежом: полные — первыми и крупно */
  fresh(P, { skip: true }); T.S.overlay = { t: 'rl', arg: '' }; T.S.rl.demoFull = true;
  const s2 = snap(T), op3 = spin(P, 100, '×100 с чертежом'), R3 = checkOp('×100 с чертежом', s2, op3);
  if (R3) {
    const h3 = resOf(view(P, '×100 с чертежом · сводка')), iF = h3.indexOf('Полные чертежи'), iS = h3.indexOf('Осколки ·');
    if (iF < 0) say('×100 с чертежом: в сводке нет «Полные чертежи»');
    else if (iS >= 0 && iF > iS) say('×100 с чертежом: полные чертежи не первыми');
  }
}

/* две свежие сессии с одними номерами операций — одни итоги */
{
  const res = [];
  for (let k = 0; k < 2; k++) {
    fresh(P, { skip: true });
    const ops = D.counts.map(n => spin(P, n, `сессия ${k + 1} · ×${n}`));
    res.push(ops.map(op => T.S.rl.srv.ops[op] && T.S.rl.srv.ops[op].list));
  }
  if (!eq(res[0], res[1])) say('две сессии с одними номерами операций получили разные итоги');
}

/* отказы без расхода: нехватка Энериума, неверное число, пустой пул */
{
  const refuse = (where, v, prep) => {
    fresh(P, { skip: true }); if (prep) prep();
    T.S.overlay = { t: 'rl', arg: '' };
    const s0 = snap(T);
    run(where, () => T.ACT.rlspin(v(next(T))));
    if (!eq(s0, snap(T))) say(`${where}: отказ изменил кошелёк, запасы или номер операции`);
    if (Object.keys(T.S.rl.srv.ops).length) say(`${where}: «сервер» записал операцию`);
    if (!T.S.toast || !T.S.toast.t) say(`${where}: нет сообщения о причине`);
    view(P, where);
  };
  refuse('нехватка Энериума', op => `10:${op}`, () => { T.S.wallet.enerium = 340; });
  refuse('неверное число прокруток', op => `7:${op}`);
  refuse('пустой пул цикла I', op => `1:${op}`, () => { T.S.rs.cyc = 1; });
}

/* ================== 5. вид ================== */
/* нехватка Энериума: кнопка неактивна, причина — строкой */
for (const [en, lack] of [[340, [10, 100]], [50, [1, 10, 100]], [100000, []]]) {
  fresh(P, { en }); T.S.overlay = { t: 'rl', arg: '' };
  const h = view(P, `окно · Энериума ${en}`);
  for (const n of D.counts) {
    const m = h.match(new RegExp(`<button[^>]*data-a="rlspin" data-v="${n}:[^"]*"[^>]*>`));
    if (!m) { say(`окно · Энериума ${en}: нет кнопки ×${n}`); continue; }
    const off = /\sdisabled/.test(m[0]);
    if (off !== lack.includes(n)) say(`окно · Энериума ${en}: кнопка ×${n} ${off ? 'неактивна' : 'активна'}`);
  }
  if (lack.length && !/Не хватает Энериума/.test(playerText(h))) say(`окно · Энериума ${en}: причина не видна`);
  if (!lack.length && /Не хватает Энериума/.test(h)) say(`окно · Энериума ${en}: причина при полном кошельке`);
}
/* воздух: в окне — лента, цена, три кнопки прокрутки и галочка; действий игрока — только прокрутка, галочка и закрыть */
{
  fresh(P, { en: 340 }); T.S.overlay = { t: 'rl', arg: '' };
  const h = strip(view(P, 'окно · воздух')), acts = [...h.matchAll(/data-a="([^"]+)"/g)].map(m => m[1]);
  const dlg = h.slice(h.indexOf('rl-ov'));
  const inDlg = [...dlg.matchAll(/data-a="([^"]+)"/g)].map(m => m[1]);
  if (inDlg.filter(a => a === 'rlspin').length !== 3) say('окно · воздух: кнопок прокрутки не три');
  if ((dlg.match(/type="checkbox" data-a="rlskip"/g) || []).length !== 1) say('окно · воздух: нет галочки «Пропустить анимацию»');
  /* «Шансы» — ссылка на лист rlodds (§1.2: шансы видны там, где крутят); других действий нет */
  const extra = [...new Set(inDlg)].filter(a => !['rlspin', 'rlskip', 'close', 'sheet'].includes(a));
  if (extra.length) say('окно · воздух: игроку видны лишние действия — ' + extra.join(', '));
  if ([...dlg.matchAll(/data-a="sheet" data-v="([^"]*)"/g)].some(m => m[1] !== 'rlodds')) say('окно · воздух: лист из окна — не «Шансы»');
  if (!/data-a="sheet" data-v="rlodds"/.test(dlg)) say('окно: нет ссылки «Шансы»');
  if (!acts.length || !/id="rlTrack"/.test(dlg) || !/id="rlMark"/.test(dlg)) say('окно · воздух: нет ленты или метки');
  if (!/Прокрутка —/.test(playerText(h))) say('окно · воздух: цена не видна');
}
/* лента без пропуска: выпавшая карточка — итог сервера; итог — только после остановки; новая лента — с соседей прошлой остановки */
{
  fresh(P, { skip: false }); T.S.overlay = { t: 'rl', arg: '' };
  view(P, 'лента · покой');
  const idle = T.rlFilm();
  if (!idle || idle.op || idle.cards.length !== 2 * V.ctx + 1) say('лента покоя: не та');
  /* демо-переключатель цикла: лента покоя — из пула нового цикла */
  T.S.rs.cyc = 3; view(P, 'лента покоя · цикл III');
  const idle3 = T.rlFilm(), pool3 = T.rsPool().map(h => h.id);
  if (!idle3 || idle3.c !== 3 || idle3.cards.some(c => !pool3.includes(c.id))) say('лента покоя: после смены цикла — карточки прежнего пула');
  T.S.rs.cyc = 0; view(P, 'лента покоя · цикл II');
  let prev = idle;
  for (const n of [1, 10, 1, 100]) {
    const where = `лента ×${n}`, s0 = snap(T), op = spin(P, n, where), R = checkOp(where, s0, op);
    if (!R) continue;
    const F = T.S.rl.film;
    if (T.S.rl.anim !== op || T.S.rl.show) say(`${where}: итог открылся до остановки ленты`);
    if (!F || F.op !== op) { say(`${where}: нет ленты операции`); continue; }
    const best = T.rlBest(R.list), x = F.cards[F.T];
    if (!x || x.id !== best.id || x.full !== best.full || x.q !== best.q) say(`${where}: выпавшая карточка ленты не самый ценный итог сервера`);
    if (n === 1 && !eq({ id: x.id, full: x.full, q: x.q }, { id: R.list[0].id, full: R.list[0].full, q: R.list[0].q })) say(`${where}: карточка не итог прокрутки`);
    const [m0, m1] = n === 1 ? V.ms : V.msShort;
    if (F.ms < m0 || F.ms > m1) say(`${where}: длительность ${F.ms} мс вне ${m0}–${m1}`);
    if (n === 1 && (F.ms < 4000 || F.ms > 6000)) say(`${where}: одна прокрутка — не 4–6 с до остановки`);
    if (n > 1 && F.ms >= V.ms[0]) say(`${where}: лента ×${n} не короче одной прокрутки`);
    if (F.T !== F.from + (n === 1 ? V.run : V.runShort) || F.cards.length !== F.T + V.ctx + 1) say(`${where}: длина ленты не по RL_VIEW`);
    if (Math.abs(F.jit) > V.jitter) say(`${where}: остановка дальше ${V.jitter} % от середины карточки`);
    if (!eq(F.cards.slice(F.from - V.ctx, F.from + V.ctx + 1), prev.cards.slice(prev.T - V.ctx, prev.T + V.ctx + 1)) || F.fromJit !== prev.jit) say(`${where}: лента начинается не с соседей прошлой остановки — будет скачок`);
    for (const c of F.cards) if (!T.RSI[c.id]) say(`${where}: в ленте неизвестный герой ${c.id}`);
    const h = view(P, where + ' · крутится');
    if (!/id="rlTrack"/.test(h) || (h.match(/class="rl-card /g) || []).length !== F.cards.length) say(`${where}: карточек ленты в разметке не столько, сколько в ленте`);
    if (/Итог прокрутки|Итог · ×/.test(h)) say(`${where}: окно итога открыто, пока лента крутится`);
    if (/data-a="sheet"/.test(h.slice(h.indexOf('rl-ov')))) say(`${where}: пока лента крутится, в окне есть ссылка на лист — окно ушло бы с ленты`);
    if (!/data-a="rlspin"[^>]*disabled/.test(h)) say(`${where}: кнопки прокрутки активны, пока лента крутится`);
    const s1 = snap(T);
    run(where + ' · нажатие посреди ленты', () => T.ACT.rlspin(`1:${next(T)}`));
    if (!eq(s1, snap(T))) say(`${where}: вторая прокрутка прошла, пока лента крутится`);
    run(where + ' · остановка', () => T.rlLand(op));
    if (T.S.rl.show) say(`${where}: итог открылся без паузы после остановки`);
    run(where + ' · итог', () => T.rlReveal(op));
    if (T.S.rl.show !== op || T.S.rl.anim) say(`${where}: после остановки итог не открылся`);
    const hr = view(P, where + ' · итог');
    if (!hr.includes(n === 1 ? 'Итог прокрутки' : `Итог · ×${n}`)) say(`${where}: нет окна итога`);
    if (!/class="rl-card [^"]*won/.test(hr)) say(`${where}: выпавшая карточка не подсвечена`);
    run(where + ' · закрыть итог', () => T.ACT.rlhide());
    prev = T.S.rl.film;
  }
  /* галочка посреди ленты — итог сразу */
  const op = spin(P, 1, 'галочка посреди ленты');
  if (T.S.rl.anim !== op) say('галочка посреди ленты: лента не пошла');
  run('галочка посреди ленты', () => T.ACT.rlskip('', { checked: true }));
  if (T.S.rl.show !== op || T.S.rl.anim) say('галочка посреди ленты: итог не открылся сразу');
  view(P, 'галочка посреди ленты · итог');
}
/* кривая: 0 и 1 на концах, монотонна, скорость непрерывна и спадает до нуля к остановке */
{
  const N = 2000; let last = 0, bad = 0, jump = 0;
  for (let i = 1; i <= N; i++) { const u = i / N, e = T.rlEase(u); if (e < last - 1e-12) bad++; if (e - last > 0.01) jump++; last = e; }
  if (T.rlEase(0) !== 0 || Math.abs(T.rlEase(1) - 1) > 1e-9) say('rlEase: не 0 и 1 на концах');
  if (bad) say(`rlEase: лента идёт назад в ${bad} точках`);
  if (jump) say('rlEase: рывок — шаг больше 1 % пути за 1/2000 времени');
  const a = V.accel, d = 1e-4, vL = (T.rlEase(a) - T.rlEase(a - d)) / d, vR = (T.rlEase(a + d) - T.rlEase(a)) / d;
  if (Math.abs(vL - vR) > 0.01 * vL) say(`rlEase: скорость рвётся на конце разгона — ${vL.toFixed(3)} и ${vR.toFixed(3)}`);
  const vEnd = (T.rlEase(1) - T.rlEase(1 - d)) / d, vMax = vL;
  if (vEnd > vMax * 0.001) say('rlEase: к остановке скорость не спадает до нуля');
}
/* prefers-reduced-motion и localStorage */
{
  const Q = load({ reduced: true });
  fresh(Q, { skip: false }); Q.T.S.overlay = { t: 'rl', arg: '' };
  const h = view(Q, 'меньше движения · окно');
  if (!/type="checkbox" data-a="rlskip" checked disabled/.test(h)) say('меньше движения: галочка не стоит и не заблокирована');
  const op = spin(Q, 1, 'меньше движения');
  if (Q.T.S.rl.show !== op || Q.T.S.rl.anim) say('меньше движения: итог не открылся сразу');
  view(Q, 'меньше движения · итог');

  const store = new Map(), A = load({ storage: store });
  if (A.T.S.rl.skip) say('localStorage пуст: «Пропустить анимацию» стоит');
  fresh(A, {}); A.T.S.overlay = { t: 'rl', arg: '' };
  run('галочка', () => A.T.ACT.rlskip('', { checked: true }));
  if (store.get('en-rl-skip') !== '1') say('галочка: выбор не записан в localStorage');
  const B = load({ storage: store });
  if (!B.T.S.rl.skip) say('галочка: новая страница не помнит «Пропустить анимацию»');
  B.T.S = B.T.initialState();
  if (!B.T.S.rl.skip) say('галочка: сброс прототипа забыл «Пропустить анимацию»');
  run('галочка', () => B.T.ACT.rlskip('', { checked: false }));
  if (store.get('en-rl-skip') !== '0') say('галочка: снятие не записано в localStorage');

  const C = load();   // localStorage бросает исключение
  if (C.T.S.rl.skip) say('без localStorage: «Пропустить анимацию» стоит');
  fresh(C, {}); C.T.S.overlay = { t: 'rl', arg: '' };
  run('без localStorage', () => C.T.ACT.rlskip('', { checked: true }));
  if (!C.T.S.rl.skip) say('без localStorage: галочка не встала');
  const op2 = spin(C, 10, 'без localStorage');
  if (C.T.S.rl.show !== op2) say('без localStorage: с галочкой итог не открылся сразу');
  view(C, 'без localStorage · сводка');
}

/* ================== 7. «дорого-богато»: алтарь, рамы, стекло осколка, честная строка, арт ================== */
{
  const A = T.RL_ART;
  if (!A) say('нет RL_ART — арта Возрождения душ');
  else {
    for (const p of A.ready) if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`арт: ${p} в RL_ART.ready, а файла нет`);
    for (const p of [A.altar, A.frame]) if (!A.ready.includes(p) && !A.want.includes(p)) say(`арт: ${p} ни в ready, ни в want`);
    if (!Array.isArray(A.win) || A.win.length !== 4 || A.win.some(x => !Number.isInteger(x) || x < 0 || x >= 500)) say('арт: окно рамы RL_ART.win — не четыре целых доли');
  }
  const pend = A ? A.want.filter(p => !A.ready.includes(p)) : [];
  const noPend = (h, where) => { for (const p of pend) if (h.includes(p)) say(`${where}: в разметке невыгруженный ${p} — будет битая картинка`); };
  const honest = (h, where) => {
    const t = playerText(h);
    if (!/Прокрутка —/.test(t) || !t.includes(`герой целиком — ${T.rlPct(D.fullBp)}`)) say(`${where}: не видны цена прокрутки и шанс героя целиком (§1.2)`);
  };
  /* вход в сцене: веер героев пула — целые шаги от середины, середина впереди; честная строка; «К рулетке» и «Шансы» */
  fresh(P, { skip: true });
  const tab = view(P, 'алтарь · вкладка'), pool2 = T.rsPool(), fan = [...tab.matchAll(/<button class="rl-ef"[^>]*style="--d:(-?\d+);--a:(\d+);--z:(\d+)"/g)].map(m => ({ d: +m[1], a: +m[2], z: +m[3] }));
  if (fan.length !== pool2.length) say(`алтарь: карточек веера ${fan.length}, героев пула ${pool2.length}`);
  fan.forEach((x, i) => { if (x.d !== 2 * i - (fan.length - 1) || x.a !== Math.abs(x.d)) say(`алтарь: карточка ${i + 1} веера — шаг ${x.d}, ждали ${2 * i - (fan.length - 1)}`); });
  if (fan.length && Math.max(...fan.map(x => x.z)) !== fan[Math.floor((fan.length - 1) / 2)].z && Math.max(...fan.map(x => x.z)) !== fan[Math.ceil((fan.length - 1) / 2)].z) say('алтарь: впереди не середина веера');
  if (!/class="rl-scn[ "]/.test(tab)) say('алтарь: за вкладкой нет сцены алтаря');
  if ((tab.match(/class="rl-fr"|class="rl-frc"/g) || []).length < pool2.length) say('алтарь: не у каждого героя веера рама');
  honest(tab.slice(tab.indexOf('rl-entry')), 'алтарь · вкладка'); noPend(tab, 'алтарь · вкладка');
  if (!/data-a="dlg" data-v="rl"/.test(tab) || !/data-a="sheet" data-v="rlodds"/.test(tab)) say('алтарь: нет «К рулетке» или «Шансы»');
  /* окно: алтарь за окном, честная строка; лента — осколки стеклом с лицом, полные — в раме */
  T.S.overlay = { t: 'rl', arg: '' };
  const w = view(P, 'алтарь · окно'), dlg = w.slice(w.indexOf('rl-ov'));
  if (!/class="rl-scn[ "]/.test(dlg)) say('окно: за окном нет сцены алтаря');
  honest(dlg, 'окно'); noPend(w, 'окно');
  const cards = [...dlg.matchAll(/<span class="rl-card (full|shard)[^"]*"[\s\S]*?(?=<span class="rl-card |<\/div><\/div><i class="rl-mark)/g)].map(m => ({ k: m[1], h: m[0] }));
  if (!cards.length) say('окно: не нашлось карточек ленты');
  for (const c of cards) {
    if (c.k === 'shard' && !c.h.includes('class="hsg"')) { say('лента: осколок — не стекло с лицом (shardGhost)'); break; }
    if (c.k === 'full' && !/class="rl-fr"|class="rl-frc"/.test(c.h)) { say('лента: полный герой без рамы'); break; }
  }
  if (!cards.some(c => c.k === 'full')) {   // полный в ленте покоя может не выпасть — проверим саму карточку
    const f = T.rlCard({ id: pool2[0].id, full: true }, '');
    if (!/class="rl-fr"|class="rl-frc"/.test(f)) say('лента: полный герой без рамы');
  }
  /* итог: одна прокрутка осколков и полного — стекло и рама; сводка ×10 — осколки строками со стеклом */
  T.S.rl.demoFull = true; spin(P, 1, 'рама · полный');
  const r1 = resOf(view(P, 'рама · полный · итог'));
  if (!/class="rl-big full"[\s\S]*?class="rl-fr"|class="rl-big full"[\s\S]*?class="rl-frc"/.test(r1)) say('итог: полный герой без рамы');
  T.S.rl.show = '';
  let sh = null;
  for (let k = 0; k < 20 && !sh; k++) { const op = spin(P, 1, 'стекло · осколки'); const R = T.S.rl.srv.ops[op]; if (R && !R.list[0].full && !T.rsHas(T.RSI[R.list[0].id])) sh = R; }
  if (!sh) say('итог: за 20 прокруток не выпали осколки героя не из коллекции');
  else if (!/class="rl-big shard"[\s\S]*?class="hsg"/.test(resOf(view(P, 'стекло · итог')))) say('итог: осколки — не стекло с лицом');
  const op10 = spin(P, 10, 'стекло · сводка'), R10 = T.S.rl.srv.ops[op10], h10 = resOf(view(P, 'стекло · сводка'));
  if (R10 && T.rlGroups(R10).shards.length && (h10.match(/class="rl-gs"><span class="hsg"/g) || []).length !== T.rlGroups(R10).shards.length) say('сводка: не у каждой строки осколков стекло с лицом');
  noPend(h10, 'сводка');
  /* потолок доблести у входа — по циклу (RS.srcInfo.roulette.maxByC, ADR-0030, п. 5а) */
  const I = T.RS.srcInfo.roulette;
  if (I && I.maxByC) for (let c = 2; c <= 6; c++) {
    fresh(P, { cyc: c, skip: true }); const M = I.maxByC[c]; if (!M) continue;
    const want = M[0] === M[1] ? `доблесть до ${M[0]}` : `доблесть ${M[0]}–${M[1]}`, h = view(P, `алтарь · цикл ${c}`);
    if (!playerText(h.slice(h.indexOf('rl-eh'))).includes(want)) say(`алтарь · цикл ${c}: у входа не «${want}»`);
  }
  /* раздел UI-кита «Возрождение душ · рулетка» рисуется без исключений, undefined и NaN */
  const kit = T.KIT_EXTRA.find(x => { try { return x.html().includes('<h3>Возрождение душ · рулетка</h3>'); } catch (_) { return false; } });
  if (!kit) say('UI-кит: нет раздела «Возрождение душ · рулетка»');
  else { const h = run('UI-кит · рулетка', () => kit.html()) || ''; if (/undefined|NaN|\[object /.test(h)) say('UI-кит · рулетка: undefined, NaN или [object'); if (!/class="hsg"/.test(h) || !/class="rl-fr"|class="rl-frc"/.test(h)) say('UI-кит · рулетка: нет стекла осколка или рамы'); }
}

/* ================== 6. режим «Игрок» и «Команда» на всех видах рулетки ================== */
function tour(team) {
  const tag = team ? ' [команда]' : '';
  run('режим', () => T.setTeam(team));
  let teamEls = 0;
  const v = (w, f) => { if (f) run(w, f); const h = view(P, w + tag); if (team) teamEls += teamCount(h); return h; };
  for (let c = 1; c <= 6; c++) {
    fresh(P, { cyc: c, skip: true });
    v(`колонка · цикл ${c}`);
    T.S.overlay = { t: 'rlodds', arg: '' }; v(`шансы · цикл ${c}`);
    T.S.overlay = { t: 'rl', arg: '' }; v(`окно · цикл ${c}`);
    if (c < 2) continue;
    for (const n of D.counts) { spin(P, n, `цикл ${c} · ×${n}`); v(`итог ×${n} · цикл ${c}`); }
    T.S.overlay = null; v(`колонка после прокруток · цикл ${c}`);
  }
  fresh(P, { skip: true }); T.S.overlay = { t: 'rl', arg: '' };
  for (const h of pool.slice(0, 5)) T.S.rs.owned[h.id] = { lvl: 0, lim: 0, valor: 0, how: 'souls' };
  for (const n of D.counts) { T.S.rl.demoFull = n > 1; spin(P, n, `прах ×${n}`); v(`итог с прахом ×${n}`); }
  fresh(P, { skip: false }); T.S.overlay = { t: 'rl', arg: '' };
  const op = spin(P, 1, 'крутится'); v('лента крутится');
  run('закрыть посреди ленты', () => T.ACT.close());
  v('окно закрыто посреди ленты'); run('остановка', () => T.rlLand(op)); run('итог', () => T.rlReveal(op));
  fresh(P, { en: 50 }); T.S.overlay = { t: 'rl', arg: '' }; v('окно · нет Энериума');
  run('отказ', () => T.ACT.rlspin(`1:${next(T)}`)); v('отказ · сообщение');
  fresh(P, {}); const fl = T.FLOWS.find(f => /Возрождение душ/.test(f[0]));
  if (!fl) say('нет сценария презентации «Возрождение душ»');
  else { run('сценарий', () => fl[2]()); const h = v('сценарий «Возрождение душ»'); if (!/id="rlTrack"/.test(h)) say('сценарий «Возрождение душ»: нет окна с лентой'); if (T.S.wallet.enerium < D.price * 111) say('сценарий «Возрождение душ»: Энериума не хватит на ×100'); }
  if (team) {
    if (!teamEls) say('режим «Команда»: у рулетки нет элементов team-only');
    fresh(P, {}); T.S.overlay = { t: 'rl', arg: '' };
    const h = v('окно · пометка шансов');
    if (!/team-only[^>]*>[\s\S]*?демонстрация/.test(h)) say('режим «Команда»: в окне нет пометки «шансы — демонстрация»');
    T.S.overlay = { t: 'rlodds', arg: '' };
    if (!/team-only[^>]*>[^<]*демонстрация/.test(v('шансы · пометка'))) say('режим «Команда»: в листе «Шансы» нет пометки «демонстрация»');
  }
}
tour(false);
tour(true);
run('режим «Игрок»', () => T.setTeam(false));
done();
