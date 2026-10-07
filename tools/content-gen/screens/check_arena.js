/* Автопроверка Арены и Лиги (design/ui/arena.js, design/ui/screens/arena.js) — без браузера.
   1. Файлы: index.html подключает arena.js до основного скрипта, arena.css и screens/arena.js — после heroes.js; прежнего экрана
      arenaView, листа opp, действия arenago и состояния S.arena в initialState в index.html нет; карта экранов отмечает готовыми
      arena, opponent, pvp-setup, defence и league.
   2. Данные свежие: сборщик tools/content-gen/arena/build.js без ошибок даёт ровно design/ui/arena.js и таблицы черновика; все числа
      EN_ARENA — целые; прогон (model.json): выгода равной атаки около нуля, пороги планок — typical лутбоксов.
   3. Алгоритм EnArena: таблица Эло, ожидание симметрично, сдвиг защиты, K по боям и рейтингу, удачная оборона — половина,
      поражений обороны в сутки — не больше пяти, выгода равной атаки при честном шансе — ноль; сброс сезона; матч Лиги — третий раунд
      только при равном счёте; подбор — окно, расширение, без атакованных, тот же сид — тот же список; Энериум за место.
   4. Бой PvP ядром: у защитников здоровье героя, порядок отряда на бой не влияет, тот же сид — тот же бой, исход по гибели или по
      снятой доле здоровья; раундов — из таблицы ядра (roundsOf('pvp'), 25); статистика боя (EnArena.pvpRun) — тот же бой, что EB.run:
      исход тот же, числа целые и сходятся с картами ядра, ульты и способности — из событий ядра; просмотр — тот же бой, что решил исход.
   5. «Сервер» экрана: атака — попытка, рейтинг обеим сторонам, соперник выбывает, повтор номера ничего не меняет, отказы ничего не
      меняют; после каждого боя список новый сам — новые лица мимо атакованных и прежнего списка, повтор номера список не трогает;
      «Обновить» — бесплатные за сутки, дальше за Энериум по цене с лимитом, без согласия платить — отказ; итог со статистикой: сдвиг
      рейтинга на виду, «Подробности боя» — раунды, обе стороны, сработавшее, «К новым соперникам»; «Пропустить» и доигранный просмотр
      показывают одно и то же; сутки — попытки до предела, бесплатные обновления заново, Энериум топа письмом, нападения на оборону;
      итог обороны — со статистикой глазами защитника; сезон — сброс; оборона из последней атаки, пока не выбрана.
   6. Лига: в демо открыта — 15 героев к 9-му дню цикла II, «Дары» платят за эту неделю, а за прошлую — нет; с пятью героями закрыта —
      нужно 15, «Дары» не платят ни за эту, ни за прошлую неделю; сценарий открывает её — три отряда
      без повторов, матч из двух или трёх боёв; «Пропустить» — в каждом бою матча; итог — строка на каждый бой с его статистикой;
      после матча список новый.
   7. Вид: три вкладки, все листы, бой и итог — без исключений, undefined и NaN. Правила воздуха на карточке соперника: не больше двух
      чисел, одного чипа, одно действие. Итог — тот же вид, что итог Эхо: классы «Подробностей боя» есть в echo.css. Режим «Игрок»:
      служебных слов нет; «Команда» — служебное есть.
   8. Неделя: строки «Арена» и «Лига» в WEEK_MODES — настоящие, целые, планки — порог × x, Энериум прошлой недели — суточные срезы.
   8а. Лестница планок (ADR-0047) — законы Л1–Л4 (ladder_laws.js), проверены мутацией: планки побед Арены и Лиги — ступени лестницы
      на все циклы, та же, что даёт EnLoot.ladder для цикла игрока; пороги — по победам: первая планка (EN_ARENA) × множитель ступени,
      рейтинг планок не берёт; в листе наград видны все пять полос — прошлые «пройдено», будущие с порогом и сундуком; за верхней
      планкой своей полосы — планки следующей, без перехода в новый цикл: полоса внизу экрана ведёт к ней, «Дары» платят её сундуки.
   9. UI-кит: итог со статистикой и правило списка; сценарии презентации, у пропуска — итог с раскрытой статистикой.
   Запуск: node tools/content-gen/screens/check_arena.js [--mut]   (--mut — какой закон поймал каждую поломку лестницы) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const LL = require('./ladder_laws.js');   // законы лестницы планок (ADR-0047) — общие с проверками Недели и экранов режимов
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [], note = [];
const cnt = { views: 0, player: 0, ops: 0, cards: 0, fights: 0, ladders: 0, mut: '' };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  for (const n of note) console.log('предупреждение: ' + n);
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Арена и Лига: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; карточек ${cnt.cards}; операций ${cnt.ops}; боёв ${cnt.fights}. Лестница планок: состояний сверено ${cnt.ladders}, мутаций поймано ${cnt.mut || 'нет'}.`);
  console.log('Проверка пройдена: данные свежие и целые, Эло и подбор — по правилам, бой решён на сиде и показ его не меняет, операции не повторяются, Лига закрыта до 15 героев и «Дары» ей не платят, итоги недели — в реестре, игроку служебного не видно.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const i = src => scripts.findIndex(s => s.src === src), iMain = scripts.findIndex(s => !s.src && /const EB = window\.EnBattle/.test(s.code));
  if (i('arena.js') < 0) say('index.html: не подключены данные arena.js');
  else if (iMain >= 0 && i('arena.js') > iMain) say('index.html: arena.js подключён после основного скрипта');
  if (i('screens/arena.js') < 0) say('index.html: не подключён screens/arena.js');
  else if (i('screens/arena.js') < i('screens/heroes.js')) say('index.html: screens/arena.js подключён раньше heroes.js — нет SQ и листа отрядов');
  if (!/<link rel="stylesheet" href="screens\/arena\.css">/.test(html)) say('index.html: не подключён screens/arena.css');
  for (const old of ['function arenaView', 'arena: arenaView', 'arenago(', 'const p = S.arena.opp', '.oprow{', "arena: { rating: 1260"])
    if (html.includes(old)) say(`index.html: остался прежний код Арены — «${old}»`);
  const card = html.match(/\{ n: 'Арена'[\s\S]*?\},\r?\n/);
  for (const id of ['arena', 'opponent', 'pvp-setup', 'defence', 'league']) if (!card || !new RegExp(`ready:\\s*\\[[^\\]]*'${id}'`).test(card[0])) say(`карта экранов: у «Арены» нет ready: ${id}`);
  for (const f of ['arena.js', 'screens/arena.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
  /* итог — тот же вид, что итог Эхо: «Подробности боя», числа и таблица — классы echo.css, подключённого до экрана */
  const echoCss = read('screens/echo.css');
  for (const [cls, re] of [['ech-det', /\.ech-det>summary\{/], ['ech-res-kpi', /\.ech-res-kpi\{/], ['ech-res-t', /\.ech-res-t\{/], ['ech-rf', /\.ech-rf\{/]])
    if (!re.test(echoCss)) say(`echo.css: нет класса ${cls} — итог Арены больше не того же вида, что итог Эхо`);
  if (!/<link rel="stylesheet" href="screens\/echo\.css">/.test(html)) say('index.html: не подключён screens/echo.css — итогу Арены нечем рисовать «Подробности боя»');
}
if (err.length) done();

/* ================== 2. данные ================== */
const B = require('../arena/build.js');
const built = B.build();
if (built.err.length) say('сборщик Арены: ' + built.err.slice(0, 5).join('; '));
else {
  if (read('arena.js') !== B.render(built.data)) say('design/ui/arena.js устарел — пересобрать: node tools/content-gen/arena/build.js');
  const doc = fs.existsSync(B.FILES.doc) ? fs.readFileSync(B.FILES.doc, 'utf8') : null;
  if (!doc) say('нет черновика docs/content/арена-и-лига.md');
  else {
    if (B.withTables(doc, built.tables) !== doc) say('docs/content/арена-и-лига.md: таблицы устарели — пересобрать');
    for (const k of Object.keys(built.tables)) if (!doc.includes(B.markA(k))) say(`черновик: нет таблицы ${k}`);
  }
}
/* прогон (model.json) — по тем же ядру, наборам, составу и правилам: иначе предупреждение, пересчитать model.js и собрать */
try {
  const have = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'arena', 'model.json'), 'utf8')).meta.inputs, now = require('../arena/model.js').inputsSha();
  if (have !== now) note.push('прогон Арены устарел: входы изменились — node tools/content-gen/arena/model.js, затем build.js');
} catch (e) { note.push('прогон Арены не сверен: ' + e.message); }
const ctxD = { window: {} }; ctxD.window = ctxD; vm.createContext(ctxD); vm.runInContext(read('arena.js'), ctxD);
const D = ctxD.EN_ARENA, AE = ctxD.EnArena;
if (!D || !AE) { say('arena.js: нет window.EN_ARENA или window.EnArena'); done(); }
{
  const walk = (x, p) => { if (typeof x === 'number') { if (!Number.isInteger(x)) say(`EN_ARENA: не целое ${p} = ${x}`); } else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, p + '.' + k); };
  walk(D, 'EN_ARENA');
  if (!D.model || Math.abs(D.model.shifts.find(x => x.shift === D.elo.def.shift).eqGain) > 50) say('прогон: выгода равной атаки при принятом сдвиге — не около нуля');
  if (!(D.pool.arena.length >= 30 && D.pool.league.length >= 10)) say('демо-сервер: мало соперников');
}

/* ================== 3. алгоритм ================== */
{
  const T = D.elo.table, BP = AE.BP;
  if (T[0] !== 5000 || T[400] !== 909 || T.some((v, i) => i && v > T[i - 1])) say('Эло: таблица не 50 % в нуле, не 1/11 на 400 или не убывает');
  for (const d of [0, 7, 50, 150, 400, 900]) if (AE.expect(D, 1000, 1000 + d, 0) + AE.expect(D, 1000 + d, 1000, 0) !== BP) say(`Эло: ожидание несимметрично при разнице ${d}`);
  if (AE.expect(D, 1000, 1000, D.elo.def.shift) <= 5000) say('Эло: сдвиг защиты не в пользу атакующего');
  const K = D.elo.k;
  if (AE.kOf(D, 0, 1000) !== K.new || AE.kOf(D, K.newGames, 1000) !== K.base || AE.kOf(D, K.newGames, K.highFrom + 1) !== K.high || AE.kOf(D, K.newGames, K.highFrom) !== K.base) say('Эло: K не по правилам — новичок, база, выше порога');
  const A0 = { r: 1200, g: 99 }, B0 = { r: 1200, g: 99, lost: 0 };
  const w = AE.attack(D, A0, B0, 2), l = AE.attack(D, A0, B0, 0), dr = AE.attack(D, A0, B0, 1);
  if (!(w.da > 0 && w.dd < 0 && l.da < 0 && l.dd > 0)) say('Эло: знаки сдвигов при победе и поражении');
  if (l.dd !== AE.divRound(l.raw * D.elo.def.winBp, BP)) say('Эло: удачная оборона — не доля расчётного');
  if (AE.attack(D, A0, Object.assign({}, B0, { lost: D.elo.def.lossCap }), 2).dd !== 0 || AE.attack(D, A0, Object.assign({}, B0, { lost: D.elo.def.lossCap - 1 }), 2).dd >= 0) say('Эло: потери обороны не ограничены поражениями за сутки');
  if (!(dr.da < 0 || dr.da === 0) || dr.lost) say('Эло: ничья — не поражение обороны, атакующему со сдвигом — не выигрыш');
  /* выгода равной атаки при честном шансе (шанс = ожидание со сдвигом): ноль с точностью до округления */
  for (const r of [1000, 1300, 1700]) {
    const p = AE.expect(D, r, r, D.elo.def.shift), a = AE.attack(D, { r, g: 99 }, { r, g: 99 }, 2).da, b = AE.attack(D, { r, g: 99 }, { r, g: 99 }, 0).da;
    if (Math.abs(p * a + (BP - p) * b) > BP) say(`Эло: выгода равной атаки на ${r} — не ноль`);
  }
  if (AE.reset(D, 1500) !== 1250 || AE.reset(D, 700) !== 850 || AE.reset(D, 1000) !== 1000 || AE.reset(D, 1001) !== 1000) say('сезон: сброс не 1000 + (Р − 1000) × 0,5 к старту');
  /* Лига: все исходы двух и трёх раундов */
  for (const a of [0, 1, 2]) for (const b of [0, 1, 2]) {
    const need = a + b === 2;
    if (AE.leagueNext([a, b]) !== need) say(`Лига: третий раунд при ${a}:${b} — ${!need}`);
    const s2 = AE.leagueScore([a, b]);
    if (!need && s2.half !== (a + b > 2 ? 2 : 0)) say(`Лига: матч ${a}+${b} — не тот исход`);
    for (const c of [0, 1, 2]) { const s3 = AE.leagueScore([a, b, c]); if (need && s3.half !== (2 + c > 3 ? 2 : 2 + c < 3 ? 0 : 1)) say(`Лига: матч ${a}+${b}+${c} — не тот исход`); }
  }
  /* подбор */
  const pool = D.pool.arena.filter(o => o.c === 2).map(o => ({ id: o.id, r: o.r })), Mk = D.arena;
  const L1 = AE.pickList(Mk, pool, 1300, AE.makeRng(7), []), L2 = AE.pickList(Mk, pool, 1300, AE.makeRng(7), []);
  if (L1.ids.join() !== L2.ids.join()) say('подбор: тот же сид — другой список');
  if (L1.ids.length !== Mk.list || L1.ids.some(id => Math.abs(pool.find(x => x.id === id).r - 1300) > L1.w)) say('подбор: список не из окна');
  const L3 = AE.pickList(Mk, pool, 1300, AE.makeRng(7), L1.ids);
  if (L3.ids.some(id => L1.ids.includes(id))) say('подбор: вернул тех, кого надо пропустить');
  const far = AE.pickList(Mk, pool, 2600, AE.makeRng(3), []);
  if (far.w !== Mk.maxWindow) say('подбор: окно не расширяется до предела при недоборе');
  if (AE.dailyEn(D, 1) !== 100 || AE.dailyEn(D, 10) !== 50 || AE.dailyEn(D, 11) !== 25 || AE.dailyEn(D, 100) !== 10 || AE.dailyEn(D, 101) !== 0) say('Энериум за место: не таблица §20.6');
  if (AE.attemptsAfter(Mk, 35, 1) !== Mk.att.cap || AE.attemptsAfter(Mk, 0, 1) !== Mk.att.day) say('попытки: не копятся до предела');
}
if (err.length) done();

/* ================== песочница ================== */
function load() {
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
  const els = {};
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, FLOWS, KH, KIT_EXTRA, MAP, RS, RSI, EB, H, SQ, SQ_DATA, ZP_DEMO: typeof ZP_DEMO !== 'undefined' ? ZP_DEMO : null, render, initialState, setTeam, advance,
    darRows: typeof darRows === 'function' ? darRows : null, WEEK: window.EN_WEEK, UIA: window.EN_ARENA_UI, AD: window.EN_ARENA, AE: window.EnArena,
    LBX: window.EN_LOOTBOXES, EnLoot: window.EnLoot, fmt, lbRowLabel: typeof lbRowLabel === 'function' ? lbRowLabel : null,
  })`, ctx);
  return { T, els, game: () => (els.game ? els.game.innerHTML : '') };
}
const P = load(), T = P.T;
if (!T.UIA || !T.AD) { say('screens/arena.js не отработал: нет EN_ARENA_UI'); done(); }
const U = T.UIA;
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
function view(where) {
  cnt.views++;
  run(where, () => T.render());
  const h = P.game();
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
const ovOf = h => { const i = h.indexOf('<div class="ov'); return i < 0 ? '' : h.slice(i); };
const fresh = () => { T.S = T.initialState(); T.S.overlay = null; T.S.route = 'arena'; T.S.seg.arena = 'arena'; T.S.runs = []; };
const act = (a, v, where) => { cnt.ops++; return run(where || `${a} ${v}`, () => T.ACT[a](v)); };
const btn = (h, a) => { const m = h.match(new RegExp(`data-a="${a}" data-v="([^"]+)"`)); return m ? decode(m[1]) : null; };
/* бой до конца вне экрана боя: так просмотр не рисует частицы */
const finish = R => { const was = T.S.route; T.S.route = 'week'; for (let n = 0; n < 40000 && !R.over; n++) run('просмотр', () => T.advance(R, 500)); T.S.route = was; };

/* ================== 4. бой PvP ядром ================== */
{
  fresh();
  const o = T.AD.pool.arena.find(x => x.c === 2), mine = T.SQ.ids('arena');
  const my = mine.map(id => T.EB.heroSrc(T.H(id))), th = o.f.map(x => T.EB.heroSrc(U.oppHero(x)));
  const seed = T.AE.battleSeed('арена', 'проба', 0, T.AE.teamKey(mine), T.AE.teamKey(o.f.map(x => x[0])));
  const b1 = T.EB.run(T.AE.pvpBattle(T.EB, my, th, seed, D.arena.rounds)), b2 = T.EB.run(T.AE.pvpBattle(T.EB, my, th.slice().reverse(), seed, D.arena.rounds));
  const r1 = T.AE.pvpResult(b1), r2 = T.AE.pvpResult(b2); cnt.fights += 2;
  if (JSON.stringify(r1) !== JSON.stringify(r2)) say('бой: порядок отряда защитника меняет исход');
  const probe = T.EB.create({ mode: 'rounds', heroes: th.map(s => Object.assign({}, s)), foes: [], seed: 1 }).u[0];
  for (const u of b1.u[1]) { const p = probe.find(x => 'b:' + x.key === u.key); if (!p || p.maxHp !== u.maxHp) say(`бой: у защитника ${u.name} здоровье не героя`); }
  if (r1.why === 'win' ? r1.half !== 2 : r1.why === 'wipe' ? r1.half !== 0 : r1.half !== (r1.shA > r1.shB ? 2 : r1.shA < r1.shB ? 0 : 1)) say('бой: исход не по правилу §20.2');
  if (b1.maxRounds !== D.arena.rounds) say('бой: предел раундов не из данных');
  // одна таблица раундов на все режимы (слово автора 29.09.2026): Арена и Лига — каждый бой по RULES.rounds.by.pvp
  if (D.arena.rounds !== T.EB.RULES.rounds.by.pvp || D.league.rounds !== T.EB.RULES.rounds.by.pvp) say(`бой: раунды Арены ${D.arena.rounds} и Лиги ${D.league.rounds} — не из таблицы ядра (${T.EB.RULES.rounds.by.pvp})`);
  if (T.EB.roundsOf('pvp') !== T.EB.RULES.rounds.by.pvp || T.EB.RULES.rounds.by.pvp !== 25) say(`бой: roundsOf('pvp') — ${T.EB.roundsOf('pvp')}, а слово автора — 25 на каждый бой Арены и Лиги`);
  /* статистика: тот же бой, что EB.run — исход тот же; числа — из карт ядра; сработавшее — из событий ядра; только целые */
  const out = T.AE.pvpRun(T.EB, T.AE.pvpBattle(T.EB, my, th, seed, D.arena.rounds)); cnt.fights++;
  if (JSON.stringify(out.res) !== JSON.stringify(r1)) say('статистика: pvpRun дал другой исход, чем EB.run — бой не тот');
  const st = out.st;
  if (!st || st.rounds !== b1.round || st.max !== b1.maxRounds || st.why !== b1.why || st.sides.length !== 2) say('статистика: раунды, предел или причина — не те, что у боя');
  else {
    st.sides.forEach((us, sd) => us.forEach((u, i) => {
      const v = b1.u[sd][i];
      if (u.key !== v.key || u.dealt !== v.dealt || u.healed !== v.healed || u.taken !== v.taken || u.alive !== v.alive) say(`статистика: ${u.name} — не те урон, лечение, принятое или гибель, что у карты ядра`);
      for (const [k, x] of [['ab', u.ab], ['ult', u.ult], ['re', u.re]]) for (const [n, c] of x) if (typeof n !== 'string' || !n || !(Number.isInteger(c) && c > 0)) say(`статистика: ${u.name} — ${k} «${n}» ×${c}`);
    }));
    const ints = (x, p) => { if (typeof x === 'number') { if (!Number.isInteger(x)) say(`статистика: не целое ${p} = ${x}`); } else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) ints(v, p + '.' + k); };
    ints(st, 'st');
    /* сработавшее — ровно события ядра: тот же бой шагами, счёт cast и react по картам */
    const b3 = T.AE.pvpBattle(T.EB, my, th, seed, D.arena.rounds), tally = new Map();
    while (!b3.over) { const a = T.EB.step(b3); if (!a) break; for (const e of a.ev) if ((e.k === 'cast' || e.k === 'react') && e.s) tally.set(e.s.key, (tally.get(e.s.key) || 0) + 1); }
    for (const us of st.sides) for (const u of us) { const n = [u.ab, u.ult, u.re].reduce((a, x) => a + x.reduce((s, [, c]) => s + c, 0), 0); if (n !== (tally.get(u.key) || 0)) say(`статистика: у ${u.name} сработало ${n}, а событий ядра — ${tally.get(u.key) || 0}`); }
    if (!st.sides.some(us => us.some(u => u.ab.length || u.ult.length))) say('статистика: за весь бой ни одной способности — события ядра не читаются');
  }
}

/* ================== 5. «сервер» Арены ================== */
fresh();
{
  const A = () => T.S.arena;
  if (A().opp.length !== D.arena.list) say(`список: соперников ${A().opp.length}, ждали ${D.arena.list}`);
  for (const id of A().opp) { const o = T.AD.pool.arena.find(x => x.id === id); if (!o || o.c !== T.S.acc.cycle || Math.abs(o.r - A().rating) > D.arena.maxWindow) say(`список: ${id} не из цикла или вне окна`); }
  const pl = (T.S.ranks.find(x => x[0] === 'Арена') || [])[1];
  if (pl !== U.arPlace(A().rating)) say('место Арены в S.ranks не сходится с рейтингом');
  /* демо-аккаунт стоит на своём месте сервера, как бы прогон ни сдвинул рейтинги: рейтинг — из таблицы мест (EN_ARENA.server.demo) */
  const acct = D.server.demo;
  if (!acct || Math.abs(U.arPlace(A().rating) - acct.place) > 3 || Math.abs(T.AE.placeOf(D.server.placeEnd, A().past.rating) - acct.pastPlace) > 3) say(`демо-аккаунт: не на своём месте сервера — сейчас #${U.arPlace(A().rating)}, прошлая неделя #${T.AE.placeOf(D.server.placeEnd, A().past.rating)}`);
  /* атака: подготовка, «В бой», итог */
  const oid = A().opp[0]; T.S.overlay = { t: 'opp', arg: oid };
  let h = view('витрина соперника');
  if (!h.includes('data-a="arprep"')) say('витрина: нет «Выбрать отряд»');
  if ((ovOf(h).match(/<button class="hb[ "]/g) || []).length < 5) say('витрина: не пять книг героев соперника');
  act('arprep', oid);
  if (!T.S.overlay || T.S.overlay.t !== 'prep' || T.S.overlay.arg !== 'pvp') say('подготовка: не открылся лист атаки');
  h = view('подготовка атаки');
  const go = btn(ovOf(h), 'aratk'); if (!go) say('подготовка: нет «В бой»');
  const r0 = A().rating, att0 = A().att, n0 = A().games, list0 = A().opp.slice(), no0 = A().listNo;
  act('aratk', go);
  const L = A().last, R = T.S.runs.find(r => r.kind === 'pvp');
  if (!L || !R) say('атака: нет итога или просмотра');
  else {
    cnt.fights++;
    const F = L.fights[0];
    if (A().att !== att0 - 1 || A().games !== n0 + 1 || A().rating !== r0 + L.e.da) say('атака: попытка, боёв или рейтинг не сходятся');
    if (A().opp.includes(oid) || !A().hit[oid]) say('атака: соперник не выбыл');
    /* после боя список новый сам (слово автора 29.09.2026): номер списка — следующий, новые лица мимо атакованных и прежних трёх */
    if (!L.fresh || A().listNo !== no0 + 1) say('после боя: список не обновился сам');
    if (A().opp.length !== D.arena.list || A().opp.some(id => list0.includes(id) || A().hit[id])) say(`после боя: в новом списке прежние или атакованные — ${A().opp.join(', ')} после ${list0.join(', ')}`);
    if (F.rounds !== T.EB.roundsOf('pvp')) say(`бой: раундов ${F.rounds}, а в таблице ядра — ${T.EB.roundsOf('pvp')}`);
    if (T.S.route !== 'battle') say('атака: не открылся бой');
    h = view('бой Арены');
    if (!h.includes('data-a="arskip"')) say('бой Арены: нет «Пропустить»');
    /* показ — тот же бой: исход и статистика повтора совпадают с решёнными */
    const shown = T.AE.pvpRun(T.EB, T.AE.pvpBattle(T.EB, F.a, F.b, F.seed, F.rounds));
    if (JSON.stringify(shown.res) !== JSON.stringify(F.res)) say('просмотр: бой не тот, что решил исход');
    if (JSON.stringify(shown.st) !== JSON.stringify(F.st)) say('итог: статистика не та, что у боя, решившего исход');
    T.S.route = 'arena'; act('arskip', R.id);
    h = ovOf(view('итог боя · «Пропустить»'));
    if (!/Победа|Поражение|Ничья/.test(h)) say('итог: нет исхода');
    if (!h.includes('class="ech-det ar-det"') || !h.includes('Подробности боя')) say('итог: нет свёрнутых «Подробностей боя» — вид не как у Эхо');
    if ((h.match(/<tr class="(?:fell)?">/g) || []).length !== 10) say('итог: в подробностях не пять своих и пять соперника');
    if (!h.includes(`${F.st.rounds} / ${F.st.max}`)) say('итог: нет раундов боя');
    if (!h.includes('К новым соперникам')) say('итог: кнопка не говорит, что список уже новый');
    if (!/рейтинг [\d\s  ]+ · место [\d\s  ]+/.test(h)) say('итог: нет рейтинга и места под сдвигом');
    const skipped = h;
    const r1 = A().rating, opp1 = A().opp.join();
    act('aratk', go);   // повтор того же номера
    if (A().rating !== r1 || A().att !== att0 - 1) say('атака: повтор номера что-то изменил');
    if (A().opp.join() !== opp1) say('после боя: повтор номера обновил список ещё раз');
    /* повтор атаки того же соперника — отказ */
    const r2 = U.SRV.attack('a' + A().seq, oid, (U.mySquad() || {}).id);
    if (!r2.refuse) say('атака: того же соперника атаковали дважды за неделю');
    /* «Смотреть бой» из итога: доигранный просмотр — те же урон, лечение и принятое, что в итоге; итог — тот же лист, что после «Пропустить» */
    act('arwatch', R.id); const R2 = T.S.runs.find(r => r.kind === 'pvp');
    if (!R2) say('«Смотреть бой»: нет просмотра'); else {
      finish(R2); if (!R2.over) say('«Смотреть бой»: просмотр не кончился');
      const m = R2.b.u.map(us => us.map(u => [u.key, u.dealt, u.healed, u.taken, u.alive].join())).join('|'), s = F.st.sides.map(us => us.map(u => [u.key, u.dealt, u.healed, u.taken, u.alive].join())).join('|');
      if (m !== s) say('«Смотреть бой»: доигранный просмотр разошёлся со статистикой итога');
      T.S.route = 'arena'; T.S.overlay = { t: 'arres', arg: R2.id };
      const watched = ovOf(view('итог боя · после просмотра'));
      const body = x => (x.match(/<details[\s\S]*<\/details>/) || [''])[0];
      if (body(watched) !== body(skipped)) say('итог: после просмотра статистика не та, что после «Пропустить»');
    }
  }
  /* отказ: неполный отряд — ничего не меняется */
  const s5 = T.S.squads.find(s => s.m.filter(Boolean).length < 5);
  if (s5) { const before = JSON.stringify([A().rating, A().att, A().opp]); const r = U.SRV.attack('a' + A().seq, A().opp[0], s5.id); if (!r.refuse || JSON.stringify([A().rating, A().att, A().opp]) !== before) say('атака неполным отрядом: не отказ или что-то изменилось'); }
  /* попытки кончились */
  const keep = A().att; A().att = 0;
  { const r = U.SRV.attack('a' + A().seq, A().opp[0], (U.mySquad() || {}).id); if (!r.refuse || r.refuse !== 'att') say('атака без попыток: не отказ'); }
  A().att = keep;
  /* атаки подряд: после каждой — новый список, атакованные не возвращаются */
  for (let k = 0; k < 3 && A().opp.length; k++) {
    const id = A().opp[0], no = A().listNo, r = U.SRV.attack('a' + A().seq, id, (U.mySquad() || {}).id); cnt.ops++; cnt.fights++;
    if (r.refuse) { say('атака подряд: отказ ' + r.refuse); break; }
    if (A().listNo !== no + 1 || A().opp.length !== D.arena.list || A().opp.some(x => A().hit[x])) say('атака подряд: список после боя не новый или с атакованными');
  }
  /* «Обновить»: бесплатные за сутки — без Энериума; дальше без согласия платить — отказ, с согласием — цены суток до лимита */
  A().freeUsed = 0; A().paid = 0;
  const en0 = T.S.wallet.enerium, RF = D.arena.refresh;
  T.S.route = 'arena'; T.S.seg.arena = 'arena'; T.S.overlay = null;
  let r, hr = view('Арена · «Обновить» бесплатно');
  if (!btn(hr, 'arref')) say('«Обновить»: бесплатного нет, а бесплатные остались');
  for (let k = 0; k < RF.free; k++) {
    const op = 'a' + A().seq, was = A().opp.slice(); r = U.SRV.refresh(op, 'arena', false); cnt.ops++;
    if (r.refuse || r.price !== 0 || !r.free) { say('«Обновить»: бесплатное — отказ или цена ' + (r.refuse || r.price)); break; }
    if (A().opp.some(id => was.includes(id))) say('«Обновить»: в новом списке прежние лица, а новых в окне хватает');
    if (!U.SRV.refresh(op, 'arena', false).again) say('«Обновить»: повтор номера — новая операция');
  }
  if (T.S.wallet.enerium !== en0 || A().freeUsed !== RF.free) say('«Обновить»: бесплатные списали Энериум или не посчитались');
  hr = view('Арена · «Обновить» за Энериум');
  if (!/data-a="sheet" data-v="arpay:arena"/.test(hr)) say('«Обновить»: бесплатные кончились, а цены на кнопке нет');
  T.S.overlay = { t: 'arpay', arg: 'arena' }; if (!/Бесплатные на сегодня кончились/.test(ovOf(view('лист цены обновления')))) say('лист цены: не сказано, что бесплатные кончились');
  T.S.overlay = null;
  r = U.SRV.refresh('a' + A().seq, 'arena', false); if (!r.refuse || r.refuse !== 'free') say('«Обновить»: платное без согласия — не отказ');
  const prices = [];
  for (let k = 0; k < RF.price.length + 1; k++) { const op = 'a' + A().seq; r = U.SRV.refresh(op, 'arena', true); cnt.ops++; if (!r.refuse) { prices.push(r.price); const again = U.SRV.refresh(op, 'arena', true); if (!again.again) say('«Обновить»: повтор номера — новая операция'); } }
  if (prices.join() !== RF.price.join() || T.S.wallet.enerium !== en0 - prices.reduce((a, x) => a + x, 0)) say(`«Обновить»: цены ${prices.join('/')} или расход Энериума не сходятся`);
  if (!r.refuse || r.refuse !== 'limit') say('«Обновить»: нет лимита суток');
  if (!/<button class="btn sm" disabled title="Обновлений на сегодня больше нет/.test(view('Арена · «Обновить» до завтра'))) say('«Обновить»: на сегодня всё, а кнопка не гаснет');
  /* нет новых лиц — отказ без платы: все, кроме списка, уже атакованы */
  { const keepHit = Object.assign({}, A().hit); A().paid = 0; A().freeUsed = 0;
    for (const o of T.AD.pool.arena) if (!A().opp.includes(o.id)) A().hit[o.id] = 1;
    const en1 = T.S.wallet.enerium; r = U.SRV.refresh('a' + A().seq, 'arena', false);
    if (!r.refuse || r.refuse !== 'empty' || T.S.wallet.enerium !== en1 || A().freeUsed !== 0) say('«Обновить»: без новых лиц — не отказ или что-то списано');
    A().hit = keepHit; }
  /* сутки: попытки до предела, обновления заново, Энериум топа письмом, нападения на оборону */
  A().att = D.arena.att.cap - 3; A().rating = 1500; A().freeUsed = RF.free; A().paid = 1; const inbox0 = T.S.inbox.length, day0 = A().day;
  T.S.route = 'arena'; T.S.seg.arena = 'def'; T.S.overlay = null;
  let hd = view('оборона');
  act('arday', btn(hd, 'arday') || 'a' + A().seq);
  if (A().att !== D.arena.att.cap) say('сутки: попытки не дошли до предела');
  if (A().freeUsed !== 0 || A().paid !== 0) say('сутки: бесплатные и платные обновления не начались заново');
  if (A().day !== Math.min(7, day0 + 1)) say('сутки: день не сменился');
  if (!T.S.inbox.some(m => m.rew && m.rew.some(x => x[0] === 'enerium'))) say('сутки: на месте в топ-100 нет Энериума письмом');
  if (T.S.inbox.length <= inbox0) say('сутки: писем нет');
  const defs = A().log.filter(x => x.k === 'def' && x.fight);
  if (!defs.length) say('сутки: нападений на оборону нет');
  T.S.route = 'arena'; T.S.overlay = null; hd = view('оборона после суток');
  const eye = btn(hd, 'ardefplay'); if (!eye) say('оборона: у свежего нападения нет «Смотреть бой»'); else {
    act('ardefplay', eye); const R3 = T.S.runs.find(x => x.kind === 'pvp');
    if (R3) {
      const hb = view('бой обороны'); if (!hb.includes('data-a="arskip"')) say('бой обороны: нет «Пропустить»');
      finish(R3); T.S.route = 'arena'; T.S.overlay = { t: R3.scene.result, arg: R3.id }; const ho = ovOf(view('итог обороны'));
      if (!/Оборона выстояла|Оборону пробили|Ничья/.test(ho)) say('итог обороны: нет исхода глазами защитника');
      /* статистика глазами защитника: «Ваш отряд» — вторая сторона боя, герои обороны */
      const F3 = R3.res.fights[0], mine = F3.st ? F3.st.sides[1].map(u => u.name) : [];
      const tb = decode((ho.match(/<table class="ech-res-t ar-st">[\s\S]*?<\/table>/) || [''])[0]);
      if (!F3.flip || !mine.length || !tb.includes('Ваш отряд') || mine.some(n => !tb.includes(n))) say('итог обороны: «Ваш отряд» в подробностях — не герои обороны');
    }
  }
  /* оборона из последней атаки, пока игрок её не выбрал */
  const s2 = T.S.squads.find(s => s.m.filter(Boolean).length === 5 && s.id !== T.SQ.of('arena')) || null;
  if (s2) { A().defAuto = true; T.SQ.set('pvp', s2.id); const id = A().opp[0]; U.SRV.attack('a' + A().seq, id, s2.id); if (T.SQ.of('arena') !== s2.id) say('оборона: не назначилась из последней атаки'); }
  /* сезон: сброс рейтинга */
  const rs = A().rating; act('arseason', 'a' + A().seq);
  if (A().rating !== T.AE.reset(D, rs) || A().wins !== 0 || Object.keys(A().hit).length) say('сезон: сброс рейтинга, побед или атакованных не по правилам');
}

/* ================== 6. Лига ================== */
fresh();
{
  /* демо — 11-й день цикла II (ADR-0031, п. 17): 15 героев обычный набирает к 9-му дню — Лига открыта на этой неделе, прошлой у неё нет */
  if (!U.lgOpen()) say('Лига: в демо закрыта, а у обычного к 11-му дню цикла II 15 героев');
  const W = T.WEEK;
  if (W) { const st = W.state('league', 'now'), sp = W.state('league', 'past'); if (st.lock || !sp.lock) say('Неделя: у Лиги демо — эта неделя открыта, прошлой нет'); }
  if (T.darRows && !T.darRows(T.S).some(p => p.id === 'league' && p.wk.id === 'now')) say('«Дары»: Лига открыта и планка взята, а сундуков Лиги этой недели нет');
  if (T.darRows && T.darRows(T.S).some(p => p.id === 'league' && p.wk.id === 'prev')) say('«Дары»: Лига открылась на этой неделе, а за прошлую платит');
  /* закрытая Лига: коллекция — пятеро отряда; с неё же начинается сценарий показа ниже */
  T.S.rs.owned = {};
  if (U.lgOpen()) say('Лига: открыта и у коллекции из пятерых');
  T.S.seg.arena = 'league'; let h = view('Лига · закрыта');
  if (!h.includes('Нужно 15 разных героев')) say('Лига: закрытая вкладка не говорит «Нужно 15 разных героев»');
  if (W) { const st = W.state('league', 'now'); if (!st.lock) say('Неделя: Лига не закрыта без 15 героев'); }
  if (T.darRows && T.darRows(T.S).some(p => p.id === 'league')) say('«Дары»: Лига закрыта, а сундуки Лиги есть');
  /* сценарий: коллекция на 15 героев, три отряда без повторов */
  run('сценарий Лиги', () => U.lgDemo());
  if (!U.lgOpen()) say('Лига: сценарий не открыл Лигу');
  const L = T.SQ.ready('league'); if (!L.ok) say('Лига: сценарий не собрал три отряда — ' + L.why);
  if (T.darRows && !T.darRows(T.S).some(p => p.id === 'league')) say('«Дары»: Лига открыта, а сундуков Лиги нет');
  T.S.overlay = null; h = view('Лига · открыта');
  if ((h.match(/class="ar-card"/g) || []).length !== D.league.list) say('Лига: не три соперника');
  const oid = T.S.arena.lg.opp[0]; T.S.overlay = { t: 'lgopp', arg: oid }; h = view('матч Лиги · доска');
  if ((ovOf(h).match(/class="lg-row"/g) || []).length !== 3) say('матч Лиги: не три раунда на доске');
  const go = btn(ovOf(h), 'lgplay'); if (!go) say('матч Лиги: нет «Сыграть матч»');
  const G = T.S.arena.lg, r0 = G.rating, a0 = G.att, lgList0 = G.opp.slice(), lgNo0 = G.listNo;
  act('lgplay', go);
  const R = T.S.runs.find(r => r.kind === 'pvp'), Lm = T.S.arena.last;
  if (!R || !Lm || Lm.mode !== 'league') say('матч Лиги: нет просмотра или итога');
  else {
    cnt.fights += Lm.fights.length;
    const halves = Lm.fights.map(F => F.res.half);
    if (Lm.fights.length === 3 && halves[0] + halves[1] !== 2) say('матч Лиги: третий раунд без равного счёта');
    if (Lm.fights.length === 2 && halves[0] + halves[1] === 2) say('матч Лиги: при равном счёте нет третьего раунда');
    if (new Set(Lm.fights.flatMap(F => F.mine)).size !== Lm.fights.length * 5) say('матч Лиги: герой повторился');
    if (G.rating !== r0 + Lm.e.da || G.att !== a0 - 1) say('матч Лиги: рейтинг или попытки');
    if (Lm.fights.some(F => F.rounds !== T.EB.roundsOf('pvp'))) say('матч Лиги: раундов в бою — не из таблицы ядра');
    /* после матча список новый сам */
    if (!Lm.fresh || G.listNo !== lgNo0 + 1 || G.opp.some(id => lgList0.includes(id) || G.hit[id])) say('после матча: список Лиги не новый');
    /* «Пропустить» — в каждом бою матча: в первом и во втором */
    let hb = view('бой Лиги · раунд I'); if (!hb.includes('data-a="arskip"')) say('бой Лиги: в первом бою матча нет «Пропустить»');
    { const was = T.S.route; T.S.route = 'week'; for (let n = 0; n < 40000 && !R.over && R.floor < 2; n++) run('просмотр', () => T.advance(R, 500)); T.S.route = was; }
    if (R.floor !== 2 || R.over) say('матч Лиги: второй бой матча не начался');
    else { T.S.route = 'battle'; T.S.focus = R.id; hb = view('бой Лиги · раунд II'); if (!hb.includes('data-a="arskip"')) say('бой Лиги: во втором бою матча нет «Пропустить»'); }
    act('arskip', R.id);
    if (!R.over || !T.S.overlay || T.S.overlay.t !== 'lgres') say('«Пропустить» во втором бою: не итог матча');
    h = ovOf(view('итог матча · «Пропустить»'));
    if (!/Победа|Поражение|Ничья/.test(h)) say('итог матча: нет исхода');
    if ((h.match(/class="ech-det ar-det lg-bout/g) || []).length !== Lm.fights.length) say('итог матча: не строка на каждый бой матча');
    if ((h.match(/<table class="ech-res-t ar-st">/g) || []).length !== Lm.fights.length * 2) say('итог матча: не у каждого боя статистика своих и соперника');
    if (!h.includes('К новым соперникам')) say('итог матча: кнопка не говорит, что список уже новый');
    for (const [i, F] of Lm.fights.entries()) { const re = T.AE.pvpRun(T.EB, T.AE.pvpBattle(T.EB, F.a, F.b, F.seed, F.rounds)); cnt.fights++; if (JSON.stringify(re.st) !== JSON.stringify(F.st)) say(`итог матча: статистика боя ${i + 1} — не того боя, что решил исход`); }
    T.S.overlay = { t: 'lgres', arg: R.id, open: 1 }; if (!/<details class="ech-det ar-det lg-bout[^"]*" open>/.test(ovOf(view('итог матча · первый бой раскрыт')))) say('итог матча: первый бой не раскрывается');
    const opp1 = G.opp.join();
    act('lgplay', go); if (G.rating !== r0 + Lm.e.da || G.opp.join() !== opp1) say('матч Лиги: повтор номера что-то изменил');
  }
}

/* ================== 7. вид и правила воздуха ================== */
for (const team of [false, true]) {
  const tag = team ? ' [команда]' : '';
  fresh(); run('режим', () => T.setTeam(team));
  for (const seg of ['arena', 'league', 'def']) {
    T.S.seg.arena = seg; const h = view(`вкладка ${seg}${tag}`);
    if (seg === 'arena') for (const c of h.split('<button class="ar-card"').slice(1).map(x => x.slice(0, x.indexOf('</button>')))) {
      cnt.cards++;
      const txt = playerText('<b ' + c + '</b>'), nums = txt.match(/\d[\d\s ]*/g) || [];
      if (nums.length > 2) say(`карточка соперника: ${nums.length} чисел — «${txt.replace(/\s+/g, ' ').slice(0, 90)}»`);
      if ((c.match(/class="chip/g) || []).length > 1) say('карточка соперника: больше одного чипа');
      if (/<button/.test(c)) say('карточка соперника: больше одного действия');
    }
  }
  if (team) { const h = view('команда · вкладка'); if (!/team-only/.test(h)) say('режим «Команда»: нет служебного'); }
  const oid = T.S.arena.opp[0];
  const sheets = [['opp', oid], ['opp', '0'], ['arhero', `arena:${oid}:0`], ['arrew', 'arena'], ['arrew', 'league'], ['arrules', 'arena'], ['arrules', 'league'], ['arpay', 'arena'], ['arpay', 'league'], ['ardef', ''], ['rank', 'Арена'], ['rank', 'Лига']];
  for (const [t, arg] of sheets) { T.S.seg.arena = 'arena'; T.S.overlay = { t, arg }; const h = view(`лист ${t} ${arg}${tag}`); if (!h.includes('class="ov"')) say(`лист ${t} ${arg} не открылся`); }
  T.S.arena.pick = oid; T.S.overlay = { t: 'prep', arg: 'pvp', back: 'arena' }; view(`подготовка${tag}`);
  T.S.overlay = null; T.S.acc.cycle = 1; view(`Арена в цикле I${tag}`); T.S.acc.cycle = 2;
  run('режим', () => T.setTeam(false));
}

/* ================== 8. неделя ================== */
fresh();
{
  const W = T.WEEK; if (!W) say('нет EN_WEEK'); else {
    const M = W.modes(), ar = M.find(m => m.id === 'arena'), lg = M.find(m => m.id === 'league');
    if (!ar || ar.demo || !lg || lg.demo) say('Неделя: строки Арены и Лиги — не настоящие, а демо');
    const st = W.state('arena', 'now');
    if (st.lock) say('Неделя: Арена закрыта в цикле II');
    else {
      if (st.points !== T.S.arena.rating || st.have !== T.S.arena.wins || st.place !== U.arPlace(T.S.arena.rating)) say('Неделя: Арена — не рейтинг, победы или место экрана');
    }
    const past = W.state('arena', 'past'), en = (T.S.arena.past.days || []).reduce((a, p) => a + T.AE.dailyEn(D, p), 0);
    if ((past.cur.find(x => x[0] === 'enerium') || [0, 0])[1] !== en) say('Неделя: Энериум Арены прошлой недели — не суточные срезы');
    T.S.route = 'week'; T.S.seg.week = 'now'; view('Неделя · эта'); T.S.seg.week = 'past'; view('Неделя · прошлая');
    for (const t of ['now', 'past']) for (const id of ['arena', 'league']) { T.S.overlay = { t: 'wkmode', arg: `${id}:${t}` }; view(`Неделя · лист ${id} ${t}`); }
  }
}

/* ================== 8а. лестница планок ==================
   Планки побед Арены и Лиги — ступени лестницы на все циклы (ADR-0047): пороги — по победам. Законы — ladder_laws.js */
const LAD0 = T.EnLoot && T.EnLoot.ladder;
const ROAD_END = ['<p class="reason">', '<span class="eyebrow">Энериум', 'class="team-only', 'class="sheet-f"'];   // чем кончается лестница в листе наград
const WINS = { arena: v => { T.S.arena.wins = v; }, league: v => { T.S.arena.lg.wins = v; } }, PLANK1 = { arena: D.arena.plank, league: D.league.plank };
const sheetOf = (kind, where) => { T.S.route = 'arena'; T.S.seg.arena = kind; T.S.overlay = { t: 'arrew', arg: kind }; return ovOf(view(where)); };
/* Л1–Л4 по состоянию режима и листу наград во всех циклах: список нарушений */
function arLadder() {
  const e = [];
  if (typeof LAD0 !== 'function' || !T.WEEK || !T.LBX) { e.push('нет EnLoot.ladder, EN_WEEK или EN_LOOTBOXES — планки побед не сверить'); return e; }
  for (const kind of ['arena', 'league']) for (let c = T.LBX.modes[kind].from; c <= 6; c++) {
    fresh(); T.S.acc.cycle = c;
    const key = `${kind} · цикл ${LL.ROMAN[c]}`, st = T.WEEK.state(kind, 'now');
    if (!st || st.lock) { if (kind === 'arena') e.push(`${key}: режим закрыт — ${st && st.lock}`); continue; }
    cnt.ladders++;
    LL.stateLaw(T.LBX, key, st, c, LAD0).forEach(x => e.push(x));
    /* пороги — по победам: первая планка режима × множитель ступени; «набрано» — победы недели, а не рейтинг */
    const wins = kind === 'league' ? T.S.arena.lg.wins : T.S.arena.wins, want = LL.needs(T.LBX, kind, c, PLANK1[kind]);
    if (st.planks.map(p => p.need).join() !== want.join()) e.push(`${key}: пороги — ${st.planks.slice(0, 6).map(p => p.need).join('/')}…, по победам из данных — ${want.slice(0, 6).join('/')}…`);
    if (st.have !== wins || st.points === st.have) e.push(`${key}: «набрано» к планкам — ${st.have}, побед недели — ${wins}, рейтинг — ${st.points}`);
    if (!Array.isArray(st.plankUnit) || !/побед/.test(st.plankUnit.join())) e.push(`${key}: единица планок — не победы`);
    LL.roadLaw(T.LBX, key + ' · лист наград', sheetOf(kind, key + ' · лист наград'), st, c, ROAD_END).forEach(x => e.push(x));
  }
  return e;
}
/* рейтинг планок не берёт: рейтинг вырос — планки те же; победа добавилась — «набрано» выросло */
function arByWins() {
  const e = [];
  fresh();
  const a = T.WEEK.state('arena', 'now').planks.map(p => p.reached).join(), w0 = T.S.arena.wins;
  T.S.arena.rating += 500;
  if (T.WEEK.state('arena', 'now').planks.map(p => p.reached).join() !== a) e.push('Арена: планки берёт рейтинг, а не победы');
  T.S.arena.wins = w0 + 1;
  if (T.WEEK.state('arena', 'now').have !== w0 + 1) e.push('Арена: победа недели не дошла до планок');
  return e;
}
/* за верхней планкой своей полосы — планки следующей, без перехода (Л3, Л4): побед — ровно порог первой планки следующей полосы по
   эталону. Полоса внизу экрана ведёт ко второй с её сундуком, в листе следующая полоса раскрыта, «Дары» платят сундуки её полосы.
   arBeyond() — список нарушений: его же зовёт проверка мутацией */
function arBeyond() {
  const e = [];
  for (const kind of ['arena', 'league']) {
    fresh();
    const c = T.S.acc.cycle, key = `за верхней планкой · ${kind}`, st0 = T.WEEK.state(kind, 'now');
    if (!st0 || st0.lock) { e.push(`${key}: режим закрыт в демо`); continue; }
    const ref = LL.ref(T.LBX, kind, c), n = LL.ownCount(T.LBX, kind, c), own = ref[0].band, need = PLANK1[kind] * ref[n].x / ref[0].x;
    WINS[kind](need);
    const st = T.WEEK.state(kind, 'now'), p = st.planks[n];
    LL.stateLaw(T.LBX, key, st, c, LAD0).forEach(x => e.push(x));
    if (!p || !p.reached || p.band !== own + 1 || p.need !== need) { e.push(`${key}: Л3 — побед ${need}, а первая планка следующей полосы не взята: ${p ? `порог ${p.need}, полоса ${p.band}` : 'её нет в лестнице'}`); continue; }
    T.S.overlay = null; T.S.route = 'arena'; T.S.seg.arena = kind;
    const h = view(key + ' · экран'), strip = (h.match(/<button class="ar-plank"[\s\S]*?<\/button>/) || [''])[0], nx = st.planks[n + 1];
    if (!strip.includes(`сундук за <b class="num">${T.fmt(nx.need)}</b>`) || !new RegExp(`class="well itf ar-chest" data-r="${LL.topR(ref[n + 1].pay)}"`).test(strip) || !decode(strip).includes(`цикл ${LL.ROMAN[own + 1]}`)) e.push(`${key}: Л3 — полоса побед не ведёт ко второй планке следующей полосы с её сундуком`);
    const s = sheetOf(kind, key + ' · лист');
    LL.roadLaw(T.LBX, key + ' · лист', s, st, c, ROAD_END).forEach(x => e.push(x));
    if (!s.includes(`<div class="wk-ld-band" data-band="${own + 1}">`)) e.push(`${key}: Л4 — полоса, по которой игрок идёт, не раскрыта`);
    /* «Дары»: взятая планка следующей полосы — под подписью с её циклом, сундуки — её полосы */
    if (T.darRows && T.lbRowLabel) {
      const ly = T.LBX.modes[kind].layers.find(l => l.id === T.LBX.modes[kind].ladder.layer), lab = LL.label(T.LBX, kind, p, c, T.lbRowLabel);
      const row = T.darRows(T.S).find(x => x.wk.id === 'now' && x.id === kind && x.label === lab);
      if (!row || !LL.same(row.groups, ref[n].pay)) e.push(`${key}: в «Дарах» нет строки «${lab}» с сундуками её полосы — ${row ? JSON.stringify(row.groups) : 'строки нет'}`);
      if (!lab.includes(`цикл ${LL.ROMAN[own + 1]}`) || !ly) e.push(`${key}: подпись выплаты не называет полосу — «${lab}»`);
    }
  }
  return e;
}
{
  arLadder().forEach(say); arByWins().forEach(say); arBeyond().forEach(say);
  if (typeof LAD0 === 'function') {
    const MUT = LL.mutations(LAD0);   // замок по циклу вернули; планка следующей полосы платит сундук своей; порог продолжения — не ×next
    let caught = 0;
    for (const [what, f] of MUT) {
      const n0 = err.length;   // что сломанный экран наговорит сам — тоже «поймано», а не ошибка проверки
      T.EnLoot.ladder = f;
      let got = [];
      try { got = arBeyond(); } catch (x) { got = ['исключение ' + x.message]; }
      T.EnLoot.ladder = LAD0;
      got = got.concat(err.splice(n0));
      if (got.length) caught++; else say(`мутация «${what}»: законы лестницы её не поймали`);
      if (process.argv.includes('--mut')) console.log(`мутация «${what}»: ${got.length ? got.slice(0, 2).join(' | ').slice(0, 320) : 'НЕ ПОЙМАНА'}`);
    }
    cnt.mut = `${caught} из ${MUT.length}`;
    arBeyond().forEach(x => say('после мутаций: ' + x));
  }
  fresh();
}

/* ================== 9. UI-кит и сценарии ================== */
{
  const x = T.KIT_EXTRA.find(k => { try { return /id="kitArena"/.test(k.html()); } catch (_) { return false; } });
  if (!x) say('UI-кит: нет раздела «Арена и Лига»');
  else {
    const s0 = JSON.stringify([T.S.arena.rating, T.S.arena.opp, T.S.arena.seq]), h = run('UI-кит', () => x.html()) || '';
    if (/undefined|NaN|\[object /.test(h)) say('UI-кит: undefined или NaN');
    if (!h.includes('ar-card')) say('UI-кит: нет карточки соперника');
    if (!/<details class="ech-det ar-det" open>/.test(h) || (h.match(/<table class="ech-res-t ar-st">/g) || []).length !== 2) say('UI-кит: нет итога со статистикой — «Подробности боя» раскрыты, две таблицы');
    if (!h.includes('после боя — новые трое')) say('UI-кит: нет правила списка — новый после каждого боя');
    if (JSON.stringify([T.S.arena.rating, T.S.arena.opp, T.S.arena.seq]) !== s0) say('UI-кит: пример итога изменил состояние Арены');
  }
  for (const n of ['Арена · соперник целиком', 'Арена · атака и итог', 'Арена · пропуск и статистика', 'Арена · оборона', 'Лига · матч', 'Лига · итог матча']) {
    const f = T.FLOWS.find(y => y[0] === n); if (!f) { say(`нет сценария «${n}»`); continue; }
    fresh(); run('сценарий ' + n, () => f[2]()); const h = ovOf(view(`сценарий «${n}»`));
    if (n === 'Арена · пропуск и статистика' && !/<details class="ech-det ar-det" open>/.test(h)) say('сценарий пропуска: итог без раскрытых «Подробностей боя»');
    if (n === 'Лига · итог матча' && !/<details class="ech-det ar-det lg-bout[^"]*" open>/.test(h)) say('сценарий итога матча: первый бой не раскрыт');
    const R = T.S.runs.find(r => r.kind === 'pvp'); if (R) { finish(R); T.S.runs = []; }
  }
}
done();
