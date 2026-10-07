/* Автопроверка клана (design/ui/clan.js, design/ui/screens/clan.js) — без браузера.
   1. Файлы: index.html подключает clan.js до основного скрипта, clan.css и screens/clan.js — после model.js и heroes.js; прежнего экрана
      clanView, его состояния и стилей в index.html нет; карта экранов отмечает окна клана готовыми, «Неделя» — раздачу наград.
   2. Данные свежие: калькулятор tools/content-gen/clan/build.js без ошибок даёт ровно EN_CLAN и таблицы черновика docs/content/клан.md;
      capacity.json совпадает с калькуляторами экономики (если есть Python). Все числа целые.
   3. Алгоритмы EnClan: требование резервуара растёт, первое очко — за пару дней, сотое — к концу второго года; круги растут;
      доля по весам сходится с суммой; элиты круга — на сиде, тот же сид — те же элиты.
   3а. Клан и разные циклы (ADR-0042): вклад нормирован по циклу — нормы — первые личные планки режимов из их данных, первая планка
      любого цикла засчитывается как первая планка базового; своя копия цели — круг 1 по норме силы цикла; клан из одного цикла
      и смешанный приходят к очкам кланового босса, резервуару и клановой планке Событий не дальше допуска из данных; на экране —
      игрок цикла IV бьёт копию в силе своего цикла, доля здоровья цели общая, повтор номера ничего не повторяет; очки контрактов
      засчитываются по первой планке его цикла, повтор сверки — без двойного счёта; цикл у каждого участника, лист «Как засчитан вклад».
   4. «Сервер» экрана:
      — атака: без отряда — лист выбора; одна атака из кошелька, бой ядром на сиде — повтор того же боя даёт тот же итог; повтор номера
        ничего не списывает; пустой кошелёк — отказ; урон копится, выплата — в момент смерти по снятому здоровью, сумма — очки врага;
        три элиты — босс, висящие элиты сгорают; босс — новый круг; анти-прыгун — очки клану со следующей недели;
      — «атаковать всеми» (ADR-0031, п. 13): все атаки кошелька по цели одной операцией — сумма пакета равна сумме одиночных атак
        на тех же сидах, атак не больше, чем было, цель пала — остаток в кошельке, повтор ничего не меняет, итог — один лист без боёв;
        правила боя 29.09.2026: раунды — таблица ядра (элита 10, босс 100), у цели свита из четырёх её сонма — у Голоса Щит, Лекарь
        и двое Пут, у Хозяина те же Щит и Лекарь, Клинок и Стрела; осада — остаток здоровья цели на входе — её максимум в атаке;
      — сонмы стихий (слово автора 29.09.2026): элиты — Голоса семи сонмов, стихии круга без повторов; три победы — Хозяин недели
        по таблице недель; бестиарий — запись открывает победа, свита открыта вместе с целью; портрет — только выгруженный
        (EN_CLAN.boss.art.ready), иначе заглушка без картинки; лист фигуры — облик и совет старика, лист «Сонмы стихий»;
      — древо (слово автора 29.09.2026): каждый 5-й уровень — +1 атака, каждый 10-й — +1 место; вилка кланового босса на 5-м уровне ветки —
        выбор главы операцией с номером, повтор ничего не меняет, участник выбрать не может; вилки и пассивки боя клана ложатся в бой ядром
        (урон, здоровье, свита, раунды, пул элит, кошелёк); пассивка — только следующий уровень и только со свободным очком; сброс — Энериум,
        раз в неделю, уровень и вехи остаются;
      — резервуар: очки контрактов игрока → очки навыков;
      — раздача: пул места на каждого участника, половина по вкладу — сразу, половина главы — ровно её размер, запись в журнал, повтор
        ничего не меняет, участник раздать не может; срок вышел — раздаёт сервер по вкладу;
      — подсчёт недели, роли с капами, исключение только с причиной, заявки, паспорт, выход без штрафа, вход, заявка, создание клана.
   5. Вид: четыре вкладки, поиск, все листы и диалоги, бой и итог атаки, сценарии, раздел UI-кита — без исключений, undefined и NaN.
      Правила воздуха: на карточке цели и на карточке выбора древа — не больше двух чисел, двух чипов и одного действия; вкладка древа —
      одна большая мысль: выбор карточками или следующая веха. Режим «Игрок»: служебных слов нет.
   6. Неделя: строка «Клановый босс» в WEEK_MODES — не демо: место и очки клана, вклад, выплата за место; прошлая — выплаты из «Даров».
      «Дары» берут клановую долю Кланового босса из журнала раздачи: половина сервера по вкладу, доля главы — ждёт, после раздачи —
      ровно расписанное, «Получить» выдаёт её; эта неделя — место клана сейчас на участника; без клана — клановой доли этой недели нет.
   Запуск: node tools/content-gen/screens/check_clan.js [--dump] */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const DUMP = process.argv.includes('--dump');
const err = [], note = [];
const cnt = { views: 0, player: 0, ops: 0, cards: 0, fights: 0, laws: 0, mut: 0 };
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
function done() {
  for (const n of note) console.log('предупреждение: ' + n);
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Клан: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; карточек целей ${cnt.cards}; боёв ${cnt.fights}; операций ${cnt.ops}; ступени кланового босса — законов ${cnt.laws}, мутаций поймано ${cnt.mut}.`);
  console.log('Проверка пройдена: данные свежие и целые, бой клана решается ядром на сиде, операции не повторяются, выплаты сходятся с очками врага, раздача — ровно половина, личные ступени — по личным очкам и один раз, клановые — по взятым кругам и в пул клана, игроку служебного не видно.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const crlf = (html.match(/\r\n/g) || []).length, lf = (html.match(/\n/g) || []).length;
  if (crlf !== lf) say(`index.html: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}`);
  const i = src => scripts.findIndex(s => s.src === src), iMain = scripts.findIndex(s => !s.src && /const EB = window\.EnBattle/.test(s.code));
  if (i('clan.js') < 0) say('index.html: не подключены данные clan.js');
  else if (iMain >= 0 && i('clan.js') > iMain) say('index.html: clan.js подключён после основного скрипта');
  if (i('screens/clan.js') < 0) say('index.html: не подключён screens/clan.js');
  else { if (i('screens/clan.js') < i('screens/model.js')) say('index.html: screens/clan.js раньше model.js'); if (i('screens/heroes.js') >= 0 && i('screens/clan.js') < i('screens/heroes.js')) say('index.html: screens/clan.js раньше heroes.js — нет общего листа отряда SQ'); }
  if (!/<link rel="stylesheet" href="screens\/clan\.css">/.test(html)) say('index.html: не подключён screens/clan.css');
  for (const old of ['function clanView', 'clan: clanView', "clan: { n: 'Пепельный круг'", '.knots{', '.branch{', '.emblem{', '.goals{', "ic('bolt')}атак"])
    if (html.includes(old)) say(`index.html: остался прежний код клана — «${old}»`);
  const card = html.match(/\{ n: 'Клан'[\s\S]*?\},\r?\n/);
  const want = ['clan', 'clans', 'clan-members', 'clan-tree', 'clan-tree-reset', 'clan-reservoir', 'clan-boss', 'clan-boss-setup', 'clan-boss-ledger'];
  if (!card) say('index.html: на карте экранов нет карточки «Клан»');
  else { const r = card[0].match(/ready:\s*\[([^\]]*)\]/); const got = r ? r[1] : ''; for (const id of want) if (!got.includes(`'${id}'`)) say(`карта экранов: окно клана «${id}» не отмечено готовым`); }
  const wk = html.match(/\{ n: 'Неделя'[\s\S]*?\},\r?\n/);
  if (!wk || !/ready:\s*\[[^\]]*'clan-rewards'/.test(wk[0])) say('карта экранов: «Распределение наград» (clan-rewards) не отмечено готовым');
  for (const f of ['clan.js', 'screens/clan.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
}
if (err.length) done();

/* ================== 2. данные ================== */
const B = require('../clan/build.js');
const built = B.calc();
if (B.err.length) say('калькулятор клана: ' + B.err.slice(0, 6).join('; '));
{
  if (B.render(built.data) !== read('clan.js')) say('clan.js устарел: пересобрать — node tools/content-gen/clan/build.js');
  const doc = fs.existsSync(B.FILES.doc) ? fs.readFileSync(B.FILES.doc, 'utf8') : null;
  if (!doc) say('нет черновика docs/content/клан.md');
  else { const fresh = B.withTables(doc, built.tables); if (fresh == null) say('клан.md: нет меток таблиц'); else if (fresh !== doc) say('клан.md: таблицы устарели — пересобрать'); if (!/## Вопросы автору/.test(doc)) say('клан.md: нет раздела «Вопросы автору»'); }
  const py = cp.spawnSync('python', [path.join(ROOT, 'tools', 'content-gen', 'clan', 'capacity.py'), '--check'], { encoding: 'utf8', env: Object.assign({}, process.env, { PYTHONIOENCODING: 'utf-8' }) });
  if (py.error) note.push('Python не найден — свежесть capacity.json не проверена');
  else if (py.status !== 0) say('capacity.json устарел: ' + (py.stdout || py.stderr || '').trim().split('\n').pop());
}
if (err.length) done();

/* ================== песочница ==================
   Скрипты прототипа — по порядку, как в браузере, с заглушкой DOM; boot() не запускается; localStorage недоступен.
   Файл, на который index.html уже ссылается, но которого ещё нет (экран другой задачи в работе), пропускается с предупреждением */
function load() {
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
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    if (s.src && !fs.existsSync(path.join(UI, s.src))) { note.push(`index.html ссылается на ${s.src}, файла ещё нет — пропущен`); continue; }
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, FLOWS, KH, MAP, KIT_EXTRA, SCREENS, SQ, EB, render, initialState, setTeam, advance, runById,
    rsSetWeek: typeof rsSetWeek === 'function' ? rsSetWeek : null, darRows: typeof darRows === 'function' ? darRows : null,
    D: window.EN_CLAN, EC: window.EnClan, UI: window.EN_CLAN_UI, W: window.EN_WEEK || null, LB: window.EN_LOOTBOXES, EL: window.EnLoot || null,
  })`, ctx);
  return { T, ctx, els, game: () => (els.game ? els.game.innerHTML : '') };
}
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
const toasts = h => [...h.matchAll(/\sdata-a="toast"\s+data-v="([^"]*)"/g)].map(m => decode(m[1]).trim()).filter(Boolean);
const dumped = new Set();
function scan(P, h, where) {
  cnt.views++;
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!P.T.KH.team) {
    cnt.player++;
    const v = strip(h), txt = playerText(h).split('\n').concat(tips(v), toasts(v));
    if (P.T.S.toast) txt.push(P.T.S.toast.t);
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
    if (DUMP && !dumped.has(where)) { dumped.add(where); console.log(`\n== ${where}\n` + playerText(h)); }
  }
  return h;
}
const view = (P, where) => { run(where, () => P.T.render()); return scan(P, P.game(), where); };
/* блоки разметки по классу: сбалансированные <div class="cls …"> … </div> */
function blocks(h, cls) {
  const out = [], re = /<(\/?)div\b[^>]*>/g, open = new RegExp(`^<div\\b[^>]*\\sclass="${cls}[ "]`);
  let m, depth = 0, start = -1;
  while ((m = re.exec(h))) {
    if (start < 0) { if (!m[1] && open.test(m[0])) { start = m.index; depth = 1; } continue; }
    depth += m[1] ? -1 : 1;
    if (!depth) { out.push(h.slice(start, re.lastIndex)); start = -1; }
  }
  return out;
}
/* правила воздуха на карточке цели: два числа, два чипа, одно действие */
function airCards(h, where) {
  for (const c of blocks(h, 'cl-card')) {
    cnt.cards++;
    const text = playerText(c.replace(/\s(?:title|aria-label)="[^"]*"/g, ''));
    const nums = (text.match(/\d[\d\s ]*/g) || []).filter(s => s.trim()).length;
    if (nums > 2) say(`${where}: на карточке цели больше двух чисел — «${text.replace(/\n/g, ' · ')}»`);
    const chips = (c.match(/class="(?:chip|el )/g) || []).length;
    if (chips > 2) say(`${where}: на карточке цели ${chips} чипа`);
    const acts = (c.match(/<button class="btn/g) || []).length;
    if (acts > 1) say(`${where}: на карточке цели больше одного действия`);
  }
}
const walkInt = (x, where, seen = new Set()) => {
  if (typeof x === 'number') { if (!Number.isInteger(x)) say(`не целое: ${where} = ${x}`); return; }
  if (!x || typeof x !== 'object' || seen.has(x)) return; seen.add(x);
  for (const [k, v] of Object.entries(x)) if (typeof v !== 'function') walkInt(v, where + '.' + k, seen);
};

const P = load(), T = P.T, D = T.D, EC = T.EC, CU = T.UI;
const S = () => T.S, C = () => T.S.clan;
const op = () => 'c' + T.S.clOps.seq;
const reset = () => { T.S = T.initialState(); T.S.overlay = null; T.S.route = 'clan'; };
if (!D || !EC || !CU) { say('нет EN_CLAN, EnClan или EN_CLAN_UI в песочнице'); done(); }
walkInt(D, 'EN_CLAN');

/* ================== 3. алгоритмы ================== */
{
  for (let n = 2; n <= D.tree.levels.length; n++) if (EC.need(D, n) < EC.need(D, n - 1)) say(`резервуар: требование ${n}-го очка меньше ${n - 1}-го`);
  const ref = Object.fromEntries(D.res.ref.o);
  if (!(ref[1] <= D.res.targets.firstDays)) say(`резервуар: первое очко на ${ref[1]}-й день, цель — ${D.res.targets.firstDays}`);
  if (!ref[100] || Math.abs(ref[100] - D.res.targets.lastDays) * D.bp > D.res.targets.lastDays * D.res.targets.tolBp) say(`резервуар: сотое очко на ${ref[100]}-й день, цель — ${D.res.targets.lastDays}`);
  for (let k = 2; k <= 40; k++) if (!(EC.circlePow(D, k) > EC.circlePow(D, k - 1) && EC.points(D, k, 'b') > EC.points(D, k - 1, 'b') && EC.points(D, k, 'e') < EC.points(D, k, 'b'))) say(`круг ${k}: сила или очки не растут, или элита платит не меньше босса`);
  const w = [5, 0, 3, 7, 1], s = EC.share(101, w);
  if (s.reduce((a, x) => a + x, 0) !== 101 || s[1] !== 0) say(`доля по весам: ${s.join(', ')} — не 101 или доля без веса`);
  const a = EC.roll(D, 'проверка|круг', 5), b = EC.roll(D, 'проверка|круг', 5), z = EC.roll(D, 'проверка|другой', 5);
  if (JSON.stringify(a) !== JSON.stringify(b)) say('элиты круга: тот же сид — другие элиты');
  if (JSON.stringify(a) === JSON.stringify(z)) say('элиты круга: разные сиды — те же элиты');
  if (a.some(x => !D.lists.els.includes(x.el))) say('элиты круга: стихия не из списка семи');
  if (new Set(a.map(x => x.el)).size !== a.length) say('элиты круга: стихия повторяется в круге — у стихии один Голос');
  /* стихия — чистый случай из семи: на тысяче кругов каждая стихия выпадает */
  const seen = new Set(); for (let i = 0; i < 1000; i++) for (const x of EC.roll(D, 'частота|' + i, 3)) seen.add(x.el);
  if (seen.size !== D.lists.els.length) say(`элиты круга: за тысячу кругов выпали стихии ${[...seen].join(', ')}`);
  if (EC.capacity(D, 0) !== 25 || EC.capacity(D, 100) !== 35) say('вместимость: не 25 → 35');
  for (let L = 0; L <= D.tree.levels.length; L++) if (EC.attacksDay(D, L) !== D.boss.attacks.day + Math.floor(L / 5) || EC.capacity(D, L) !== 25 + Math.floor(L / 10)) say(`вехи древа на ${L}-м уровне: атак ${EC.attacksDay(D, L)}, мест ${EC.capacity(D, L)} — по слову автора каждый 5-й +1 атака, каждый 10-й +1 место`);
  if (EC.attacksDay(D, 100) !== D.boss.attacks.day + 20) say('атаки: к сотому уровню не +20');
  const forks = D.tree.levels.filter(x => x.kind === 'fork');
  if (forks.map(x => x.L).join() !== '5,15,25,35,45,55,65,75,85,95' || forks.some(x => x.alts.length < 2 || x.alts.length > 3)) say('вилки: не на пятых уровнях веток или не 2–3 тактики');
  if (!forks[0].alts.some(a => a.k === 'kbBoss') || !forks[0].alts.some(a => a.k === 'kbElite') || !forks[0].alts.some(a => a.k === 'kbPool')) say('первая вилка — не примеры автора: урон по боссу, по элитам, +1 элита');
  if (EB0().RULES.resist[D.boss.rank.b.core] !== 10000) say('клановый босс: иммунитет к контролю не 100 %');
}
function EB0() { return T.EB; }

/* ================== 3а. клан и разные циклы (ADR-0042) ==================
   Законы: вклад нормирован по циклу — первая планка любого цикла засчитывается как первая планка базового, нормы — первые личные планки
   режимов из их данных; своя копия цели — круг 1 копии цикла c по норме силы цикла; клан из одного цикла и смешанный приходят к очкам
   кланового босса, резервуару и клановой планке Событий не дальше допуска из данных (EN_CLAN.calc.mixTolBp), вес каждого — 1 / участников */
{
  const N = D.norm, base = N.base, CTD = P.ctx.EN_CONTRACTS, EVD = P.ctx.EN_EVENT, ERD = P.ctx.EN_ECHO_RULES;
  if (!N || !D.cycles || !D.cycles.includes(base)) say('ADR-0042: в EN_CLAN нет норм циклов или базового цикла');
  else {
    const src = { ct: c => CTD.planks[c][0], ev: c => EVD.planks[c][0], echo: c => ERD.plank1[c] };
    for (const [mode, f] of Object.entries(src)) for (const c of D.cycles) {
      if (N[mode][c] !== f(c)) say(`нормы: ${mode}, цикл ${c} — ${N[mode][c]}, а первая личная планка режима — ${f(c)}`);
      if (EC.counted(D, mode, N[mode][c], c) !== N[mode][base]) say(`вклад не нормирован: первая планка цикла ${c} (${mode}) засчитана как ${EC.counted(D, mode, N[mode][c], c)}, а не ${N[mode][base]}`);
      if (c !== base && EC.counted(D, mode, N[mode][c], c) === N[mode][c] && N[mode][c] !== N[mode][base]) say(`вклад не нормирован: очки цикла ${c} (${mode}) засчитаны как есть`);
    }
    const B0 = D.boss.circle, CAPJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'content-gen', 'clan', 'capacity.json'), 'utf8'));
    /* норма силы — средняя сила отряда обычного за все дни цикла по калькуляторам: иначе неверная норма прошла бы незамеченной —
       в прогоне «по норме» участники стоят на ней же */
    for (const c of D.cycles) { const days = CAPJ.power.o[String(c)], mean = Math.floor(days.reduce((a, x) => a + x, 0) / days.length); if (B0.norm[c] !== mean) say(`норма силы цикла ${c} — ${B0.norm[c]}, а средняя сила обычного за цикл — ${mean}`); }
    for (const c of D.cycles) {
      if (EC.circlePow(D, 1, c) !== B0.byCyc[c] || B0.byCyc[c] !== Math.floor(B0.pow1 * B0.norm[c] / B0.norm[base])) say(`своя копия цикла ${c}: круг 1 — ${EC.circlePow(D, 1, c)}, по норме силы — ${Math.floor(B0.pow1 * B0.norm[c] / B0.norm[base])}`);
      if (c > base && !(EC.circleLvl(D, 4, c) > EC.circleLvl(D, 4, c - 1))) say(`своя копия цикла ${c}: цель не сильнее копии цикла ${c - 1}`);
    }
    const M = D.calc.mix || [], tol = D.calc.mixTolBp, near = (v, w) => Math.abs(v - w) * D.bp <= w * tol;
    if (!M.length || !Number.isInteger(tol) || tol <= 0) say('смешанные кланы: нет прогона или допуска в EN_CLAN.calc');
    else {
      const r0 = M[0], name = r => r[0].map(([c, n]) => `${n} в ${c}`).join(' + ');
      if (r0[0].length !== 1 || r0[0][0][0] !== base) say('смешанные кланы: первым должен идти клан базового цикла');
      for (const r of M) {
        if (!near(r[5], r0[5])) say(`клан «${name(r)}»: клановый босс — ${r[5]} очков, клан цикла ${base} — ${r0[5]}: дальше допуска`);
        if (!near(r[7], r0[7])) say(`клан «${name(r)}»: резервуар засчитал ${r[7]}, клан цикла ${base} — ${r0[7]}: дальше допуска`);
        if (!near(r[9], r0[9])) say(`клан «${name(r)}»: клановая планка Событий — ${r[9]}, клан цикла ${base} — ${r0[9]}: дальше допуска`);
        if (r[12] * r[0].reduce((a, [, n]) => a + n, 0) > D.bp) say(`клан «${name(r)}»: вес участника по долям больше 1 / участников`);
      }
      if (!M.some(r => !near(r[2], r0[2]))) say('смешанные кланы: прежний счёт — общая лестница — не расходится с кланом цикла II: прогон не меряет разницу циклов');
    }
  }
}

/* ================== 4. «сервер» экрана ================== */
reset();
{
  const c = C();
  if (!c.in || c.members.length !== CU.data.members.length || c.role !== 'head') say('демо: игрок не глава «Пепельного круга» или состав не из данных');
  if (c.n !== CU.data.clan.n) say('демо: S.clan.n — не имя клана (его читают профиль и Неделя)');
  if (c.boss.att !== EC.attacksDay(D, c.lvl) || c.boss.att !== c.members.find(m => m.me).atk) say(`демо: атак в кошельке ${c.boss.att}, по древу — ${EC.attacksDay(D, c.lvl)}`);
  if (c.boss.targets.length !== EC.elitePool(D, c.lvl, c.picks) || c.boss.targets.filter(x => x.dead).length !== CU.data.boss.killsIn) say('демо: круг не из данных — элит или павших не столько');
  if (c.picks.slice(0, c.lvl).some((i, j) => i == null || !D.tree.levels[j].alts[i])) say('демо: выбор древа не из данных');
  if (CU.pointsFree() !== c.earned - c.lvl || CU.nextPick() !== c.lvl + 1) say('демо: свободных очков навыков нет или следующий уровень не тот');
  if (!c.past || c.past.done || !c.past.groups.length) say('демо: прошлая неделя не ждёт раздачи главы');
  walkInt(c, 'S.clan');
}

/* атака: без отряда — лист выбора; с отрядом — бой, итог, повтор номера */
reset();
{
  T.S.seg.clan = 'boss';
  const x = C().boss.targets.find(t => !t.dead && !t.burned), n = C().boss.n + 1;
  run('атака без отряда', () => T.ACT.clatk(`${x.uid}:${n}`));
  if (!T.S.overlay || T.S.overlay.t !== 'prep' || T.S.overlay.arg !== 'clan') say('атака без отряда: не открылся лист выбора отряда (§25.1: установка при первом входе)');
  if (C().boss.n !== 0) say('атака без отряда: атака списана');
  T.S.overlay = null; T.SQ.set('clan', 's1');
  const att0 = C().boss.att, hp0 = x.hp, uid = x.uid;
  run('атака', () => T.ACT.clatk(`${uid}:${n}`)); cnt.ops++; cnt.fights++;
  const L = C().boss.last;
  if (!L || C().boss.att !== att0 - 1 || C().boss.n !== 1) say(`атака: кошелёк ${att0} → ${C().boss.att}, атак за неделю ${C().boss.n}`);
  const R = T.S.runs.find(r => r.kind === 'clan');
  if (!R || T.S.route !== 'battle') say('атака: нет просмотра боя');
  if (L) {
    const y = C().boss.targets.find(t => t.uid === uid) || x;
    if (L.hp0 !== hp0 || (!L.kill && y.hp !== L.hp) || L.removed !== Math.max(0, hp0 - L.hp)) say('атака: здоровье цели и снятое не сходятся с итогом');
    const b2 = T.EB.run(CU.battleOf(L.F));
    if (b2.u[1][0].hp !== L.hpOut || b2.round !== L.rounds) say('атака: тот же бой на том же сиде дал другой итог — исход не детерминирован');
    /* правила боя 29.09.2026: раунды — таблица ядра (элита — 10, босс — 100, древо прибавляет своё); у элиты — свита из четырёх её стихии,
       у босса — никого; осада — остаток здоровья цели на входе — её максимум в атаке, прежний — max0 */
    const b3 = CU.battleOf(L.F), m3 = b3.u[1][0], RB = T.EB.RULES.rounds.by, want = L.g === 'b' ? RB.clan : RB.e, cap = L.g === 'b' ? D.boss.roundsCap.roundB : D.boss.roundsCap.roundE;
    if (D.boss.rounds.e !== RB.e || D.boss.rounds.b !== RB.clan) say(`раунды клана не из таблицы ядра: элита ${D.boss.rounds.e}, босс ${D.boss.rounds.b}`);
    if (b3.maxRounds < want || b3.maxRounds > want + cap) say(`атака: раундов ${b3.maxRounds}, по таблице ядра — ${want} и до +${cap} древа`);
    const sv = b3.u[1].slice(1);
    const HF = D.boss.host.floors[L.g === 'b' ? 'b' : 'e'], HR = D.boss.host.figs, G = L.F.guards || [];   // фигуры — в картах боя (F), в единицах ядра их нет
    if (sv.length !== HF.length || sv.some(u => u.el !== m3.el || u.rank !== D.boss.host.rank.core) || G.length !== HF.length || G.some((u, j) => !HR[u.fig] || HR[u.fig].role !== HF[j] || HR[u.fig].el !== m3.el)) say(`атака: свита ${sv.length} — не ${HF.join(', ')} стихии цели`);
    if (!HR[L.F.src.fig] || HR[L.F.src.fig].role !== (L.g === 'b' ? 'boss' : 'elite') || m3.cls !== 'Маг. ДД') say(`атака: цель — не Голос или Хозяин сонма, класс ${m3.cls}`);
    if (m3.maxHp !== L.hp0 || m3.max0 !== L.max) say(`осада: цель вышла в бой с максимумом ${m3.maxHp} (прежний ${m3.max0}), а остаток на входе — ${L.hp0} из ${L.max}`);
    if (L.share && (y.dmg.m1 || 0) < L.share && !L.kill) say('атака: урон игрока не записан в счёт цели долей здоровья');
    /* доля здоровья (ADR-0042): снятое — по итогу боя копии, счёт цели — остаток до атаки минус снятое */
    if (L.share !== EC.shareOff(D, L.left0, L.max, L.hpOut) || (L.hpOut < L.hp0 && !(L.share > 0))) say('доля здоровья: снятая доля — не по итогу боя');
    if (!L.kill && y.left !== L.left0 - L.share) say(`доля здоровья: у цели ${y.left} долей, а до атаки ${L.left0} минус снято ${L.share}`);
  }
  if (R) {
    T.S.focus = R.id; view(P, 'бой клана');
    T.S.route = 'clan';   // просмотр свёрнут: бой идёт без отрисовки, как у забегов в других проверках
    for (let k = 0; k < 400 && !R.over; k++) run('ход боя', () => T.advance(R, 500));
    if (!R.over) say('просмотр боя не закончился');
    else if (T.S.route !== 'clan' || !T.S.toast || !/Клан · атака/.test(T.S.toast.t)) say('конец свёрнутого боя: нет строки об итоге');
    T.S.route = 'battle';
  }
  const att1 = C().boss.att;
  run('повтор атаки', () => T.ACT.clatk(`${uid}:${n}`));
  if (C().boss.att !== att1 || C().boss.n !== 1) say('повтор атаки с тем же номером списал атаку');
  const again = CU.srv.attack(`atk:${C().id}:${C().boss.no}:${n}`, uid, ['h1']);
  if (!again.again || C().boss.att !== att1) say('сервер: повтор номера операции атаки не вернул прежний итог');
  if (R) { run('пропустить', () => T.ACT.clskip(R.id)); if (!T.S.overlay || T.S.overlay.t !== 'clres') say('«Пропустить»: нет итога атаки'); else view(P, 'итог атаки'); }
  /* добить третью элиту: выплата по снятому здоровью, сумма — очки врага; три победы — босс */
  T.S.overlay = null; T.S.route = 'clan';
  const e3 = C().boss.targets.find(t => !t.dead && !t.burned && t.g === 'e');
  if (e3) {
    e3.left = 1; e3.dmg.m2 = (e3.dmg.m2 || 0) + 1000;   // доля здоровья цели — общий счёт (ADR-0042)
    const mine0 = C().boss.mine, my0 = C().members.find(m => m.me).boss;
    for (let a = 0; a < 10 && !e3.dead; a++) { run('добить элиту', () => T.ACT.clatk(`${e3.uid}:${C().boss.n + 1}`)); cnt.ops++; cnt.fights++; }   // свита может закрыть элиту в одной атаке
    const L2 = C().boss.last;
    if (!L2 || !L2.kill) say('добить элиту: элита с 1 здоровья не пала');
    else {
      const sum = Object.values(L2.pay).reduce((a, v) => a + v, 0);
      if (sum !== EC.points(D, L2.k, 'e')) say(`выплата: ${sum} очков, а элита круга ${L2.k} стоит ${EC.points(D, L2.k, 'e')}`);
      if (C().boss.mine - mine0 !== (L2.pay.m1 || 0) || C().members.find(m => m.me).boss - my0 !== (L2.pay.m1 || 0)) say('выплата: личные очки игрока не по доле');
      if (!C().boss.targets.some(t => t.g === 'b' && !t.dead) || C().boss.kills !== D.boss.kills || !L2.summoned) say('три победы над элитами не призвали босса');
      const bb = C().boss.targets.find(t => t.g === 'b' && !t.dead);
      if (bb && (bb.el !== CU.weekBoss(C().boss.wk).el || bb.fig !== CU.weekBoss(C().boss.wk).id)) say(`встал не Хозяин недели: ${bb.el}, по таблице недель — ${CU.weekBoss(C().boss.wk).el}`);
      const Rr = T.S.runs.find(r => r.kind === 'clan'); if (Rr) { run('итог', () => T.ACT.clskip(Rr.id)); view(P, 'итог: элита пала, босс призван'); }
    }
    T.S.overlay = null; T.S.route = 'clan'; T.S.seg.clan = 'boss';
    airCards(view(P, 'клан · босс призван'), 'клан · босс призван');
  }
  /* босс пал: новый круг, элиты — на сиде круга */
  const bs = C().boss.targets.find(t => t.g === 'b' && !t.dead);
  if (bs) {
    const k0 = C().boss.circle; bs.left = 1;
    run('добить босса', () => T.ACT.clatk(`${bs.uid}:${C().boss.n + 1}`)); cnt.ops++; cnt.fights++;
    const L3 = C().boss.last;
    if (!L3 || !L3.kill || C().boss.circle !== k0 + 1 || C().boss.kills !== 0) say('босс пал, а новый круг не открылся');
    const want = EC.roll(D, `клан|${C().id}|неделя|${C().boss.no}|круг|${k0 + 1}`, EC.elitePool(D, C().lvl, C().picks));
    if (JSON.stringify(C().boss.targets.map(t => t.el)) !== JSON.stringify(want.map(t => t.el))) say('новый круг: элиты не с сида круга');
    if (L3 && Object.values(L3.pay).reduce((a, v) => a + v, 0) !== EC.points(D, L3.k, 'b')) say('выплата за босса не сходится с его очками');
  }
  /* пул элит больше трёх — вилка «Шире круг»: после трёх побед висящие элиты сгорают */
  const fp = D.tree.levels.find(x => x.kind === 'fork' && x.alts.some(a => a.k === 'kbPool'));
  C().picks[fp.L - 1] = fp.alts.findIndex(a => a.k === 'kbPool'); C().lvl = Math.max(C().lvl, fp.L); C().earned = Math.max(C().earned, C().lvl);
  const boss2 = C().boss.targets.find(t => !t.dead);
  C().boss.targets = CU.circleTargets(C(), C().boss.circle);
  if (C().boss.targets.length !== D.boss.pool + 1) say(`пул элит с вилкой «Шире круг» — ${C().boss.targets.length}, ждали ${D.boss.pool + 1}`);
  C().boss.att = 99;
  /* элита с 1 здоровья падает не всегда с первой атаки: свита закрывает её, пока жива, — бьём, пока не падёт (не больше десяти атак) */
  for (let j = 0; j < 3; j++) { const t = C().boss.targets.filter(x => !x.dead && !x.burned && x.g === 'e')[0]; t.left = 1; for (let a = 0; a < 10 && !t.dead; a++) { run('элита', () => T.ACT.clatk(`${t.uid}:${C().boss.n + 1}`)); cnt.fights++; } }
  if (C().boss.targets.filter(x => x.burned).length !== 1 || !C().boss.targets.some(x => x.g === 'b')) say('три победы при пуле из четырёх: висящая элита не сгорела или босс не пришёл');
  C().boss.att = 0; const n0 = C().boss.n;
  const tb = C().boss.targets.find(x => x.g === 'b');
  run('пустой кошелёк', () => T.ACT.clatk(`${tb.uid}:${n0 + 1}`));
  if (C().boss.n !== n0) say('пустой кошелёк: атака прошла');
  if (boss2 === undefined) note.push('проверка сгорания шла без прежнего босса');
}

/* клан и разные циклы (ADR-0042) на экране: у участников демо — засчитанное по первой планке их цикла; игрок цикла IV бьёт копию цели
   в силе своего цикла — общая доля здоровья, свои числа, игрок другого цикла видит ту же долю; повтор номера атаки ничего не повторяет;
   очки контрактов игрока засчитываются по первой планке его цикла, повтор сверки не считает их второй раз; вид — цикл у каждого
   участника, лист «Как засчитан вклад» с пересчётом очков другого цикла, в листе участника — засчитанное */
reset();
{
  const c = C(), base = D.norm.base, cyc = 4;
  for (const m of c.members) if (m.res !== EC.counted(D, 'ct', m.resRaw || 0, m.cyc)) say(`участник ${m.n}: засчитано ${m.res}, по первой планке цикла ${m.cyc} — ${EC.counted(D, 'ct', m.resRaw || 0, m.cyc)}`);
  if (new Set(c.members.map(m => m.cyc)).size < 3) say('демо: клан не смешанный — циклов у участников меньше трёх');
  T.S.acc.cycle = cyc; T.SQ.set('clan', 's1'); CU.sync();
  /* игрок цикла IV — так же силён для своего цикла, как отряд демо для цикла II: уровни отряда — × норма силы IV / норма II */
  const CB = D.boss.circle, sq = T.SQ.ready('clan').go.map(id => T.S.heroes.find(h => h.id === id)).filter(Boolean);
  sq.forEach(h => { h.lvl = Math.floor((CB.lvlDiv + h.lvl) * CB.norm[cyc] / CB.norm[base]) - CB.lvlDiv; });
  const me = c.members.find(m => m.me), x = c.boss.targets.find(t => !t.dead && !t.burned), copy = CU.copyOf(x, cyc), copyB = CU.copyOf(x, base);
  if (me.cyc !== cyc) say('цикл игрока не дошёл до его строки в клане');
  if (x.max !== copy.maxHp || x.hp !== EC.hpIn(D, x.left, copy.maxHp)) say('своя копия: цель на экране — не в силе цикла игрока');
  if (!(copy.lvl > copyB.lvl)) say('своя копия: цель цикла IV не сильнее цели цикла II');
  const left0 = x.left, n = c.boss.n + 1;
  run('атака в цикле IV', () => T.ACT.clatk(`${x.uid}:${n}`)); cnt.ops++; cnt.fights++;
  const L = c.boss.last;
  if (!L || L.cyc !== cyc || L.F.src.lvl !== EC.circleLvl(D, x.k, cyc)) say('своя копия: атака шла не с копией цели в силе цикла игрока');
  else if (!(L.share > 0)) say('своя копия: отряд не ранил цель первого круга — доля здоровья не проверена');
  else {
    if (L.left0 !== left0 || (!L.kill && x.left !== left0 - L.share) || L.share < 0) say('доля здоровья: счёт цели — не по снятой доле');
    if (L.share !== EC.shareOff(D, L.left0, L.max, L.hpOut)) say('доля здоровья: снятая доля — не по итогу боя');
    T.S.acc.cycle = base; CU.sync();
    if (!L.kill && (x.left !== left0 - L.share || x.max !== copyB.maxHp)) say('доля здоровья: игрок другого цикла видит другой счёт цели');
    T.S.acc.cycle = cyc; CU.sync();
  }
  const snapA = () => JSON.stringify([c.boss.targets.map(t => [t.uid, t.left, t.dmg, t.dead]), c.boss.att, c.boss.n, c.boss.mine]), a0 = snapA();
  run('повтор атаки в цикле IV', () => T.ACT.clatk(`${x.uid}:${n}`));
  const again = CU.srv.attack(CU.atkOp(c, n), x.uid, ['h1']);
  if (!again.again || snapA() !== a0) say('повтор номера атаки изменил счёт цели или кошелёк');
  const r0 = me.res, raw0 = me.resRaw || 0, add = 2900, want = EC.counted(D, 'ct', add, cyc);
  T.S.contracts.clan = (T.S.contracts.clan || 0) + add; CU.sync();
  if (me.resRaw !== raw0 + add || me.res !== r0 + want) say(`резервуар: игрок цикла IV внёс ${add}, засчитано ${me.res - r0}, по первой планке — ${want}`);
  if (want !== Math.floor(add * D.norm.ct[base] / D.norm.ct[cyc])) say('резервуар: засчитано не по первой планке контрактов');
  const snapR = JSON.stringify([me.res, me.resRaw, c.res, c.earned]);
  CU.sync(); CU.sync();
  if (JSON.stringify([me.res, me.resRaw, c.res, c.earned]) !== snapR) say('резервуар: повтор сверки засчитал очки ещё раз');
  T.S.overlay = null; T.S.route = 'clan'; T.S.runs = []; T.S.seg.clan = 'mem'; const hm = view(P, 'клан · участники разных циклов');
  for (const cc of new Set(c.members.map(m => m.cyc))) if (!hm.includes(`data-c="${cc}"`)) say(`участники: у строки участника нет цикла ${cc}`);
  if (!hm.includes('data-v="clcount"')) say('участники: нет пути к листу «Как засчитан вклад»');
  T.S.overlay = { t: 'clcount' }; const hc = view(P, 'лист «Как засчитан вклад»');
  if (!/→/.test(hc) || !hc.includes(String(D.norm.ct[cyc]))) say('«Как засчитан вклад»: нет пересчёта очков другого цикла или первых планок по циклам');
  const other = c.members.find(m => m.cyc !== cyc && m.resRaw);
  T.S.overlay = { t: 'clmem', arg: other.id }; if (!/засчитано/.test(view(P, 'лист участника другого цикла'))) say('лист участника: не видно, как засчитан его вклад');
  T.S.overlay = { t: 'clresv' }; if (!/→/.test(view(P, 'резервуар · разные циклы'))) say('резервуар: не видно пересчёта очков другого цикла');
  T.S.overlay = null; T.S.acc.cycle = base;
}

/* сонмы стихий (слово автора 29.09.2026): Хозяин недели по таблице недель; бестиарий — запись открывает победа, свита открыта вместе
   с целью; портрет — только выгруженный, через AV, до победы — в тумане; листы фигур и «Сонмы стихий» */
reset();
{
  const c = C(), H = D.boss.host, W = CU.weekBoss(c.boss.wk);
  if (Object.keys(H.figs).length !== 56 || H.hosts.length !== 7) say(`сонмы: фигур ${Object.keys(H.figs).length}, сонмов ${H.hosts.length} — не 7 × 8`);
  if (W.el !== D.boss.weeks[c.boss.wk].el || !H.figs[W.id] || H.figs[W.id].role !== 'boss') say('Хозяин недели: не по таблице недель');
  if (!c.boss.known[W.id]) say('демо: Хозяин недели не изучен, хотя три круга недели взяты');
  if (!CU.figKnown(CU.figId(W.el, 'tank')) || !CU.figKnown(CU.figId(W.el, 'dd1'))) say('бестиарий: свита Хозяина недели не открылась вместе с ним');
  const unk = H.hosts.find(h => !c.boss.known[h.id + '-elite'] && !c.boss.known[h.id + '-boss']);
  if (unk && CU.figKnown(unk.id + '-ctl1')) say('бестиарий: свита неизученного сонма открыта');
  T.SQ.set('clan', 's1'); T.S.seg.clan = 'boss'; T.S.overlay = null;
  const h0 = view(P, 'клан · босс · портреты');
  if (!D.boss.art.ready.length && /assets\/art\/clan\//.test(h0)) say('портреты: ссылка на невыгруженный арт — битая картинка');
  if (!h0.includes(`data-v="clfoe:${W.id}"`)) say('вкладка «Босс»: внизу нет «Хозяина недели»');
  const e0 = c.boss.targets.find(t => t.g === 'e' && !t.dead), p0 = D.boss.art.dir + e0.fig + D.boss.art.ext, had = CU.ART_READY.has(p0);
  CU.ART_READY.add(p0);
  if (!view(P, 'клан · босс · портрет выгружен').includes(`assets/art/${p0}?v=`)) say('портреты: выгруженный портрет не показан через AV с версией выгрузки');
  const wasK = !!c.boss.known[e0.fig]; delete c.boss.known[e0.fig];
  if (!view(P, 'клан · босс · портрет в тумане').includes('unk art')) say('портреты: до первой победы портрет не в тумане');
  if (wasK) c.boss.known[e0.fig] = true;
  if (!had) CU.ART_READY.delete(p0);
  for (const id of Object.keys(H.figs)) {
    T.S.overlay = { t: 'clfoe', arg: id }; const hf = view(P, 'лист фигуры ' + id), k = CU.figKnown(id);
    if (k ? !/Совет старика/.test(hf) || !hf.includes(H.figs[id].n) : !/Запись закрыта/.test(hf) || hf.includes(H.figs[id].tip)) say(`лист фигуры ${id}: ${k ? 'нет записи сказителя' : 'запись видна до первой победы'}`);
  }
  T.S.overlay = { t: 'clhosts' }; const hh = view(P, 'лист «Сонмы стихий»');
  const miss = H.hosts.flatMap(h => [h.id + '-elite', h.id + '-boss']).filter(id => !hh.includes(`data-v="clfoe:${id}"`));
  if (!H.lore.every(t => hh.includes(t.slice(0, 30))) || miss.length) say(`лист «Сонмы стихий»: абзацев записи нет — ${H.lore.filter(t => !hh.includes(t.slice(0, 30))).length}, нет фигур — ${miss.join(', ')}`);
  T.S.overlay = { t: 'cltgt', arg: e0.uid }; const ht = view(P, 'лист цели · свита');
  if ((ht.match(/class="cl-g"/g) || []).length !== H.floors.e.length) say('лист цели: свита не строкой из четырёх');
  T.S.overlay = { t: 'clrules' }; if (!view(P, 'лист правил круга').includes(H.aversionTip)) say('«Как устроен круг»: нет совета о неприязни к саганам');
  T.S.overlay = null;
}

/* «Атаковать всеми» (ADR-0031, п. 13): одна операция — все атаки кошелька по одной цели, каждая на своём сиде, как одиночная. Сумма пакета
   равна сумме одиночных атак на тех же сидах; атак не больше, чем было; цель пала — остаток в кошельке; повтор операции и номера атаки
   из пакета ничего не меняет; показ — один итог без боёв подряд */
reset();
{
  T.SQ.set('clan', 's1');
  const ids = T.SQ.ready('clan').go;
  const snap = () => { const c = C(); return JSON.stringify({ t: c.boss.targets.map(x => [x.uid, x.g, x.el, x.hp, x.max, x.dmg, x.dead, x.burned, x.used]), att: c.boss.att, n: c.boss.n, mine: c.boss.mine,
    kills: c.boss.kills, circle: c.boss.circle, known: c.boss.known, m: c.members.map(m => [m.id, m.boss]), log: c.log.map(l => l.t) }); };   // m.atk игрока — зеркало кошелька, его ставит сверка
  const save = () => JSON.stringify({ clan: T.S.clan, ops: T.S.clOps }, (k, v) => k === 'F' ? undefined : v);   // F — карты боя для показа, в сравнении не нужны
  const load = s => { const o = JSON.parse(s); T.S.clan = o.clan; T.S.clOps = o.ops; };
  const same = (label, uid) => {
    const s0 = save(), c0 = C(), att0 = c0.boss.att, n0 = c0.boss.n, op = `all:${c0.id}:${c0.boss.no}:${n0 + 1}`;
    const r = CU.srv.attackAll(op, uid, ids); cnt.ops++;
    if (!r.res || !r.res.A) { say(`${label}: пакет не прошёл — ${r.refuse || 'нет итога'}`); return null; }
    const A = r.res.A, s1 = snap(); cnt.fights += A.count;
    if (A.count < 1 || A.count > att0 || C().boss.att !== att0 - A.count || C().boss.n !== n0 + A.count) say(`${label}: атак ${A.count} из ${att0}, в кошельке ${C().boss.att}`);
    if (!A.kill && A.count !== att0) say(`${label}: цель жива, а атаки остались — ${A.count} из ${att0}`);
    if (A.kill && A.attLeft !== att0 - A.count) say(`${label}: остаток после падения цели — ${A.attLeft}, ждали ${att0 - A.count}`);
    if (A.rows.length !== A.count || A.rows.some((x, i) => x.n !== n0 + 1 + i)) say(`${label}: номера атак пакета не подряд`);
    if (A.removed !== A.rows.reduce((a, x) => a + x.removed, 0) || A.removed !== A.hp0 - A.hp) say(`${label}: снятое в итоге не сходится с атаками — ${A.removed}, здоровье ${A.hp0} → ${A.hp}`);
    const again = CU.srv.attackAll(op, uid, ids), againOne = CU.srv.attack(CU.atkOp(C(), n0 + 1), uid, ids);
    if (!again.again || !againOne.again || snap() !== s1) say(`${label}: повтор операции или номера атаки из пакета изменил состояние`);
    run(label + ' · прежний номер', () => T.ACT.clatkall(`${uid}:${n0 + 1}`));   // кнопка с устаревшим номером
    if (snap() !== s1) say(`${label}: кнопка с прежним номером снова потратила атаки`);
    load(s0);   // те же атаки по одной, на тех же сидах
    for (let i = 0; i < A.count; i++) { const c = C(); CU.srv.attack(CU.atkOp(c, c.boss.n + 1), uid, ids); }
    if (snap() !== s1) say(`${label}: пакет не равен сумме одиночных атак на тех же сидах`);
    load(s0);
    return A;
  };
  /* 1. раненая элита демо-круга падает раньше, чем кончатся атаки: остаток — в кошельке */
  const hurt = C().boss.targets.find(t => !t.dead && t.g === 'e');
  C().boss.att = 6;
  const A1 = same('все атаки · раненая элита', hurt.uid);
  if (A1 && !A1.kill) note.push('все атаки: раненая элита не пала — остаток после падения цели не проверен');
  /* 2. свежие элиты круга и шесть атак */
  C().boss.targets = CU.circleTargets(C(), C().boss.circle); C().boss.att = 6;
  same('все атаки · свежая элита', C().boss.targets[0].uid);
  /* 3. пустой кошелёк — отказ; одна атака — «Все атаки» не показываем: это просто «Атаковать» */
  C().boss.att = 0; const n0 = C().boss.n;
  const r0 = CU.srv.attackAll(`all:${C().id}:${C().boss.no}:${n0 + 1}`, C().boss.targets[0].uid, ids);
  if (r0.refuse !== 'att' || C().boss.n !== n0) say('все атаки: пустой кошелёк — не отказ');
  C().boss.att = 1; T.S.seg.clan = 'boss'; T.S.overlay = null;
  if (/data-a="clatkall"/.test(view(P, 'клан · босс · одна атака'))) say('«Все атаки» при одной атаке в кошельке');
  /* 4. вид: ссылка рядом с «Атаковать», итог — одним листом, боя нет */
  C().boss.att = 6; const h = view(P, 'клан · босс · все атаки');
  if (!/data-a="clatkall"/.test(h)) say('вкладка «Босс»: нет «Все атаки» рядом с «Атаковать»');
  airCards(h, 'клан · босс · все атаки');
  const x = C().boss.targets.find(t => !t.dead && !t.burned), runs0 = T.S.runs.length;
  run('все атаки', () => T.ACT.clatkall(`${x.uid}:${C().boss.n + 1}`)); cnt.ops++;
  if (!T.S.overlay || T.S.overlay.t !== 'clall' || T.S.runs.length !== runs0) say('все атаки: нет общего итога или показан бой');
  else if (!/Подробности атак/.test(view(P, 'итог · все атаки'))) say('итог всех атак: нет подробностей по атакам');
  T.S.overlay = { t: 'cltgt', arg: x.uid }; C().boss.att = 5;
  if (!/data-a="clatkall"/.test(view(P, 'лист цели · все атаки'))) say('лист цели: нет «Все атаки · N»');
  T.S.overlay = null;
}

/* анти-прыгун: бил врагов своего клана — ушёл — в новом клане очки клану со следующей недели */
reset();
{
  T.SQ.set('clan', 's1');
  const x = C().boss.targets.find(t => !t.dead); run('атака до выхода', () => T.ACT.clatk(`${x.uid}:${C().boss.n + 1}`));
  const att = C().boss.att;
  run('выход', () => T.ACT.clleavedo(op())); cnt.ops++;
  if (C().in || !C().hopFrom) say('выход: игрок остался в клане или не помечен как бивший врагов на этой неделе');
  if (C().boss.att !== att) say('выход: атаки кошелька пропали — выход без штрафа');
  T.S.route = 'clan'; view(P, 'поиск клана');
  run('вход в открытый клан', () => T.ACT.cljoin(`tg:${op()}`)); cnt.ops++;
  if (!C().in || C().id !== 'tg' || !C().hop) say('вход: не в «Тихой гавани» или нет пометки анти-прыгуна');
  const t = C().boss.targets.find(y => !y.dead); t.left = 1;
  const me = C().members.find(m => m.me);
  for (let a = 0; a < 10 && !t.dead; a++) run('атака в новом клане', () => T.ACT.clatk(`${t.uid}:${C().boss.n + 1}`));
  const L = C().boss.last;
  if (!L || !L.kill || me.boss !== 0 || C().boss.mine < (L.pay.me || 0) || !(L.pay.me > 0)) say('анти-прыгун: очки прыгуна попали клану или не дошли до него лично');
  view(P, 'новый клан · паспорт'); T.S.seg.clan = 'boss'; view(P, 'новый клан · босс');
  /* вернуться в прежний клан: он в поиске первым */
  run('выход 2', () => T.ACT.clleavedo(op()));
  const back = CU.searchList()[0];
  if (!back || back.id !== 'tg') say('поиск: покинутый клан не первым в списке');
  run('заявка', () => T.ACT.cljoin(`nk:${op()}`));
  if (C().in || !C().srch.applied.nk) say('вход по заявке: вошёл без заявки или заявка не записана');
  run('клан по заявке', () => T.ACT.cljoin(`sd:${op()}`));
  if (C().in || C().srch.applied.sd) say('требования клана не проверены: вошёл или подал заявку без 40-го уровня');
  /* создать свой клан: золото × цикл, игрок — глава */
  const gold = S().wallet.gold; C().newName = 'Новый круг';
  run('создать клан', () => T.ACT.clnewdo(op())); cnt.ops++;
  if (!C().in || C().n !== 'Новый круг' || C().role !== 'head' || S().wallet.gold !== gold - D.passport.createGoldPerCycle * Math.max(D.open.cycle, S().acc.cycle)) say('создание клана: не глава, не то имя или не та цена');
  for (const tab of ['pass', 'boss', 'mem', 'tree']) { T.S.seg.clan = tab; view(P, 'свой клан · ' + tab); }
}

/* древо: пассивка только следующего уровня и со свободным очком; сброс — раз в неделю за Энериум */
reset();
{
  const c = C(), L = CU.nextPick(), lvl0 = c.lvl;
  const o1 = op();
  run('пассивка', () => T.ACT.clpick(`${L}:0:${o1}`)); cnt.ops++;
  if (c.picks[L - 1] !== 0 || c.lvl !== Math.max(lvl0, L)) say('древо: пассивка не выбрана');
  const logN = c.log.length;
  run('повтор пассивки', () => T.ACT.clpick(`${L}:1:${o1}`));
  if (c.picks[L - 1] !== 0 || c.log.length !== logN) say('древо: повтор номера сменил выбор');
  run('пассивка без очка', () => T.ACT.clpick(`${L + 1}:0:${op()}`));
  if (c.picks[L] != null) say('древо: выбрана пассивка без свободного очка');
  const en = S().wallet.enerium, R = D.tree.reset;
  run('сброс', () => T.ACT.clresetdo(op())); cnt.ops++;
  if (S().wallet.enerium !== en - R.price || c.picks.some(x => x != null) || c.lvl !== Math.max(lvl0, L)) say('сброс древа: цена, выбор или уровень — не так');
  run('второй сброс', () => T.ACT.clresetdo(op()));
  if (S().wallet.enerium !== en - R.price) say('сброс древа: второй раз за неделю списал Энериум');
  if (CU.nextPick() !== 1) say('сброс древа: выбор не начинается с первого уровня');
  T.S.seg.clan = 'tree'; view(P, 'древо после сброса');
  for (const Lx of [1, 5, 10, 45, 100]) { T.S.overlay = { t: 'cllvl', arg: String(Lx) }; view(P, `уровень древа ${Lx}`); }
  T.S.overlay = { t: 'clbonus' }; view(P, 'бонусы клана');
}

/* вилка кланового босса (слово автора 29.09.2026): пятый уровень ветки — карточки на выбор; выбор главы — операция с номером;
   участник выбрать не может; выбранная тактика ложится в бой ядром тем же EnClan.battle; кошелёк, пул и раунды — от вилок */
reset();
{
  const c = C(), f1 = D.tree.levels.find(x => x.kind === 'fork');
  if (c.earned < f1.L) c.earned = f1.L;   // подготовка проверки: клан демо (2-й уровень, 11-й день цикла II) до вилки ещё не дорос
  run('сброс под вилку', () => T.ACT.clresetdo(op())); cnt.ops++;
  for (let L = 1; L < f1.L; L++) run('пассивка до вилки', () => T.ACT.clpick(`${L}:0:${op()}`));
  if (CU.nextPick() !== f1.L) say(`вилка: следующий выбор — уровень ${CU.nextPick()}, ждали ${f1.L}`);
  T.S.seg.clan = 'tree'; T.S.overlay = null;
  const h = view(P, 'древо · вилка карточками');
  const picks = blocks(h, 'cl-pick');
  if (picks.length !== f1.alts.length || !/Вилка кланового босса/.test(h)) say(`вилка: карточек выбора ${picks.length}, тактик ${f1.alts.length}`);
  for (const b of picks) {
    const text = playerText(b.replace(/\s(?:title|aria-label)="[^"]*"/g, '')), nums = (text.match(/\d[\d\s ]*/g) || []).filter(x => x.trim()).length;
    if (nums > 2 || (b.match(/<button class="btn/g) || []).length !== 1 || (b.match(/class="(?:chip|el )/g) || []).length > 2) say(`вилка: карточка выбора не по правилам воздуха — «${text.replace(/\n/g, ' · ')}»`);
  }
  if (blocks(h, 'pnl cl-focus').length !== 1) say('древо: слева не одна большая мысль');
  /* участник выбрать не может */
  run('роль участника', () => T.ACT.clrolev('member'));
  run('вилка участником', () => T.ACT.clpick(`${f1.L}:0:${op()}`));
  if (c.picks[f1.L - 1] != null) say('вилка: участник выбрал тактику');
  T.S.seg.clan = 'tree'; if (blocks(view(P, 'древо · глазами участника'), 'cl-pick').length) say('вилка: участнику показаны карточки выбора');
  run('роль главы', () => T.ACT.clrolev('head'));
  /* глава выбирает «Охоту на элит»: операция с номером, запись в журнал, повтор ничего не меняет */
  const iE = f1.alts.findIndex(a => a.k === 'kbElite'), o = op(), logN = c.log.length;
  run('вилка', () => T.ACT.clpick(`${f1.L}:${iE}:${o}`)); cnt.ops++;
  if (c.picks[f1.L - 1] !== iE || c.log.length !== logN + 1 || !/вилку/.test(c.log[0].t)) say('вилка: выбор главы не записан или нет записи в журнале');
  run('повтор вилки', () => T.ACT.clpick(`${f1.L}:0:${o}`));
  if (c.picks[f1.L - 1] !== iE || c.log.length !== logN + 1) say('вилка: повтор номера сменил выбор');
  /* тактика в бою: урон героев в атаке по элите — прибавки древа в картах ядра; у босса «Охоты на элит» нет */
  T.SQ.set('clan', 's1');
  const ids = T.SQ.ready('clan').go, xe = c.boss.targets.find(t => t.g === 'e' && !t.dead && !t.burned);
  if (xe) {
    const F = CU.fightOf(xe, ids, 1), b = CU.battleOf(F), M = EC.fightMods(D, c.picks, c.lvl, 'e');
    if (!(M.dmg >= f1.alts[iE].v) || b.u[0].some(u => u.aura.dmgUp !== EC.heroDmg(D, M, u, xe.el) * 100)) say(`вилка: «${f1.alts[iE].n}» не легла в бой с элитой — прибавка ${M.dmg} %`);
    const src = EC.card(D, { g: 'b', uid: 'проба', el: xe.el, race: xe.race, k: xe.k }), Mb = EC.fightMods(D, c.picks, c.lvl, 'b');
    if (Mb.dmg >= M.dmg) say('вилка: «Охота на элит» прибавила урон и по боссу');
    cnt.fights++;
  }
  /* кошелёк и пул — от вилок: «Запас атак» держит ещё норму, «Шире круг» — ещё элиту */
  const carry = D.tree.levels.find(x => x.kind === 'fork' && x.alts.some(a => a.k === 'kbCarry')), pk = c.picks.slice();
  pk[carry.L - 1] = carry.alts.findIndex(a => a.k === 'kbCarry');
  if (EC.walletCap(D, carry.L, pk) !== EC.attacksDay(D, carry.L) * (2 + 1) || EC.walletCap(D, carry.L, null) !== EC.attacksDay(D, carry.L) * 2) say('кошелёк: «Запас атак» не держит ещё дневную норму');
  const round = D.tree.levels.find(x => x.kind === 'fork' && x.alts.some(a => a.k === 'kbRound')), pr = c.picks.slice();
  pr[round.L - 1] = round.alts.findIndex(a => a.k === 'kbRound');
  if (EC.rounds(D, 'e', pr, round.L) !== D.boss.rounds.e + 1 || EC.rounds(D, 'b', pr, round.L) !== D.boss.rounds.b) say('раунды: «Долгий бой» — не +1 раунд элите');
  /* лист уровня вилки и ключа, бонусы клана, сценарий презентации */
  for (const Lx of [f1.L, D.tree.levels.find(x => x.kind === 'key').L]) { T.S.overlay = { t: 'cllvl', arg: String(Lx) }; view(P, `уровень древа ${Lx}`); }
  T.S.overlay = { t: 'clbonus' }; const hb = view(P, 'бонусы клана с вилкой');
  if (!/Вилки кланового босса/.test(hb) || !hb.includes(f1.alts[iE].n)) say('бонусы клана: нет вилки');
  T.S.overlay = null;
  reset(); const flow = T.FLOWS.find(x => x[0] === 'Клан · вилка кланового босса');
  if (!flow) say('нет сценария «Клан · вилка кланового босса»');
  else { run('сценарий вилки', () => flow[2]()); if (CU.nextPick() !== f1.L || !blocks(view(P, 'сценарий вилки'), 'cl-pick').length) say('сценарий вилки: карточек вилки нет'); }
  /* веха крупно: нет очка — следующая веха, её уровень и что он даёт */
  reset(); C().earned = C().lvl; T.S.seg.clan = 'tree'; T.S.overlay = null;
  const hm = view(P, 'древо · следующая веха'), nx = D.tree.levels.find(x => x.L > C().lvl && (x.mile.length || x.kind !== 'regular'));
  if (!hm.includes(`Уровень ${nx.L}`) || !/Следующая веха/.test(hm)) say(`древо: нет следующей вехи крупно — уровень ${nx.L}`);
}

/* резервуар: очки контрактов игрока → очки навыков */
reset();
{
  const c = C(), e0 = c.earned, me = c.members.find(m => m.me), r0 = me.res, add = EC.need(D, e0 + 1) * 2;
  S().contracts.clan = (S().contracts.clan || 0) + add;
  run('сверка', () => CU.sync());
  if (me.res !== r0 + add) say('резервуар: очки контрактов не записаны во вклад игрока');
  if (c.earned <= e0) say('резервуар: полный резервуар не дал очка навыков');
  if (!c.log.some(l => /Резервуар наполнился/.test(l.t))) say('резервуар: нет записи в журнале');
  T.S.overlay = { t: 'clresv' }; view(P, 'резервуар');
}

/* раздача наград: половина по вкладу, половина главы — ровно */
reset();
{
  const c = C(), P0 = c.past, M = T.LB.modes.clan, cyc = Math.max(M.from, S().acc.cycle);
  /* пул — сундуки места клана и клановых ступеней, взятых кругами недели (ADR-0047), на каждого участника; демо — пять кругов, вне топа */
  const row = EC.tier(T.LB, P0.place, P0.pts), stepRows = EC.circleRows(T.LB, P0.circles), cntRow = r => (r.cyc[cyc] || []).reduce((a, g) => a + g.count, 0);
  const per = (row ? cntRow(row) : 0) + stepRows.reduce((a, r) => a + cntRow(r), 0);
  const total = P0.groups.reduce((a, g) => a + g.count, 0);
  if (!per || total !== per * P0.members.length) say(`пул: ${total} сундуков, а на участника ${per} × ${P0.members.length}`);
  if (P0.circles !== CU.data.past.circles || P0.steps !== stepRows.length || P0.steps !== EC.clanStep(D, P0.circles)) say(`пул демо: кругов ${P0.circles}, клановых ступеней ${P0.steps} — не из данных демо`);
  P0.groups.forEach((g, gi) => {
    if (P0.server[gi].reduce((a, x) => a + x, 0) !== g.server || g.server + g.head !== g.count || g.server !== Math.floor(g.count * D.rewards.splitBp / D.bp)) say('пул: половина сервера не половина');
  });
  T.S.overlay = { t: 'clgifts' }; view(P, 'раздача · до');
  run('роль участника', () => T.ACT.clrolev('member'));
  run('участник раздаёт', () => T.ACT.clfill('even'));
  if (P0.groups.some((g, gi) => Object.values(P0.plan[gi]).some(v => v))) say('раздача: участник расписал половину главы');
  const r = CU.srv.gifts(op()); if (!r.refuse) say('раздача: участник раздал награды');
  T.S.overlay = { t: 'clgifts' }; view(P, 'раздача · глазами участника');
  run('роль главы', () => T.ACT.clrolev('head'));
  run('поровну', () => T.ACT.clfill('even'));
  if (!CU.planFull(P0)) say('раздача: «Поровну» не расписала всю половину главы');
  const logN = c.log.length, o = op();
  run('раздать', () => T.ACT.clgive(o)); cnt.ops++;
  if (!P0.done || c.log.length !== logN + 1 || !/раздал/.test(c.log[0].t)) say('раздача: не отмечена или нет записи в журнале');
  run('повтор раздачи', () => T.ACT.clgive(o));
  if (c.log.length !== logN + 1) say('раздача: повтор номера записал второй раз');
  T.S.overlay = { t: 'clgifts' }; view(P, 'раздача · после');
  /* срок вышел: половину главы раздаёт сервер по вкладу */
  reset();
  const c2 = C(), P2 = c2.past;
  run('срок раздачи', () => T.ACT.clauto());
  if (!P2.done || !P2.auto || P2.groups.some((g, gi) => Object.values(P2.plan[gi]).reduce((a, x) => a + x, 0) !== g.head)) say('срок раздачи: сервер раздал не всю половину главы');
}
/* «Дары» берут клановую долю Кланового босса из журнала раздачи, а не из типичной недели (§24.4): прошлая неделя — половина сервера
   по вкладу сразу, доля главы — ждёт раздачи, после неё — ровно расписанное главой; эта неделя — место клана сейчас на участника */
if (T.darRows) {
  reset();
  const c = C(), P0 = c.past, i = P0.members.findIndex(m => m.id === P0.me), cyc = S().acc.cycle, N = P0.members.length;
  const dar = () => T.darRows(T.S).filter(p => p.id === 'clan' && p.cat === 'clan'), sum = rs => rs.reduce((a, p) => a + p.groups.reduce((b, g) => b + g.count, 0), 0);
  const prev = () => dar().filter(p => p.wk.id === 'prev'), by = s => prev().filter(p => p.label.endsWith(s));
  if (i < 0) say('«Дары»: в подсчёте прошлой недели нет самого игрока');
  const srvWant = P0.groups.reduce((a, g, gi) => a + (P0.server[gi][i] || 0), 0), headAvg = P0.groups.reduce((a, g) => a + Math.floor(g.head / N), 0);
  if (sum(by('по вкладу')) !== srvWant || by('по вкладу').some(p => p.st !== 'ok')) say(`«Дары»: доля по вкладу ${sum(by('по вкладу'))}, в журнале — ${srvWant}`);
  if (sum(by('от главы')) !== headAvg || by('от главы').some(p => p.st !== 'wait')) say(`«Дары»: до раздачи доля главы — ${sum(by('от главы'))}, ${by('от главы').map(p => p.st).join('/')}; ждали ориентир ${headAvg}, «ждёт»`);
  if (prev().some(p => !/ · (?:по вкладу|от главы)$/.test(p.label))) say('«Дары»: у Кланового босса осталась строка типичной недели');
  run('поровну', () => T.ACT.clfill('even')); run('раздать', () => T.ACT.clgive(op())); cnt.ops++;
  const mine = P0.groups.reduce((a, g, gi) => a + (P0.plan[gi][P0.me] || 0), 0);
  if (!P0.done || sum(by('от главы')) !== mine || by('от главы').some(p => p.st !== 'ok')) say(`«Дары»: после раздачи доля главы ${sum(by('от главы'))}, расписано игроку ${mine}`);
  for (const p of by('от главы')) { const n0 = T.S.bag.chests.length; run('получить долю главы', () => T.ACT.darget(p.key)); if (T.S.bag.chests.length - n0 !== sum([p])) say('«Дары»: «Получить» выдало не долю из журнала'); }
  const now = dar().filter(p => p.wk.id === 'now'), pts = CU.weekPts(c), row = EC.tier(T.LB, CU.placeOf(pts), pts);
  const cntRow = r => (r.cyc[cyc] || []).reduce((a, g) => a + g.count, 0);
  const nowWant = (row ? cntRow(row) : 0) + EC.circleRows(T.LB, EC.circlesDone(c.boss.circle)).reduce((a, r) => a + cntRow(r), 0);
  if (sum(now) !== nowWant || now.some(p => p.st !== 'wait')) say(`«Дары»: эта неделя — ${sum(now)} сундуков, по месту клана и взятым клановым ступеням сейчас — ${nowWant}`);
  run('выйти', () => CU.srv.leave(op())); cnt.ops++;
  if (T.S.clan.in) say('«Дары»: выход из клана не прошёл');
  else if (dar().some(p => p.wk.id === 'now')) say('«Дары»: без клана — клановая доля этой недели');
}

/* подсчёт недели и смена недели расы */
reset();
{
  const c = C(), pts = CU.weekPts(), no = c.boss.no, done0 = EC.circlesDone(c.boss.circle), n0 = c.members.length, place0 = CU.placeOf(pts);
  /* пул недели считаем сами, по слоям сундуков: клановые ступени, взятые кругами, и строка места (строки «все с очками» нет, ADR-0047) */
  const lys = T.LB.modes.clan.layers, cyc0 = Math.max(T.LB.modes.clan.from, S().acc.cycle), cntRow = r => (r.cyc[cyc0] || []).reduce((a, g) => a + g.count, 0);
  const rows0 = lys.find(l => l.kind === 'plank' && l.clan).rows.filter(r => done0 >= r.at)
    .concat(pts > 0 && place0 ? lys.find(l => l.kind === 'place' && l.clan).rows.filter(r => r.top && place0 <= r.top).sort((a, b) => a.top - b.top).slice(0, 1) : []);
  const want0 = rows0.reduce((a, r) => a + cntRow(r), 0) * n0;
  run('подсчёт недели', () => T.ACT.clweek());
  if (c.past.pts !== pts || c.boss.circle !== 1 || c.boss.no !== no + 1 || c.members.some(m => m.res || m.boss) || c.boss.targets.length !== EC.elitePool(D, c.lvl, c.picks)) say('подсчёт недели: очки, круг или вклад не сброшены');
  const got0 = c.past.groups.reduce((a, g) => a + g.count, 0);
  if (got0 !== want0 || c.past.circles !== done0) say(`подсчёт недели: пул ${got0} сундуков при ${done0} взятых кругах и месте ${place0 || '—'}, а по сундукам — ${want0}`);
  /* раздача ждёт главу, только когда есть что раздавать: пустой пул закрыт сразу */
  if (c.past.done !== !want0) say(`подсчёт недели: пул ${want0 ? 'есть, а раздача уже отмечена' : 'пуст, а раздача ждёт главу'}`);
  reset();
  if (T.rsSetWeek) {
    const i = D.lists.races.indexOf(C().boss.wk), race = D.lists.races[(i + 1) % D.lists.races.length];
    run('новая неделя расы', () => { T.rsSetWeek(race); CU.sync(); });
    if (C().boss.wk !== race || C().boss.circle !== 1 || !C().past || C().past.race !== D.lists.races[i]) say('смена недели расы: лестница не сбросилась или неделя не подсчитана');
  }
}

/* роли, заявки, исключение, паспорт */
reset();
{
  const c = C(), m = c.members.find(x => x.role === 'member'), tr = c.members.find(x => x.role === 'treasurer');
  run('третий казначей', () => T.ACT.clrole(`${m.id}:treasurer:${op()}`));
  if (m.role !== 'member') say('роли: казначеев больше потолка');
  run('снять казначея', () => T.ACT.clrole(`${tr.id}:member:${op()}`)); cnt.ops++;
  run('назначить казначея', () => T.ACT.clrole(`${m.id}:treasurer:${op()}`)); cnt.ops++;
  if (tr.role !== 'member' || m.role !== 'treasurer') say('роли: снять или назначить не вышло');
  const k = c.members.find(x => x.role === 'member' && !x.me), n0 = c.members.length;
  c.kickR = '';
  run('исключить без причины', () => T.ACT.clkickdo(`${k.id}:${op()}`));
  if (c.members.length !== n0) say('исключение без причины прошло');
  c.kickR = D.kickReasons[0];
  T.S.overlay = { t: 'clkick', arg: k.id }; view(P, 'исключение');
  run('исключить', () => T.ACT.clkickdo(`${k.id}:${op()}`)); cnt.ops++;
  if (c.members.length !== n0 - 1 || !c.log[0].t.includes(D.kickReasons[0].toLowerCase())) say('исключение: не вышло или причины нет в журнале');
  const a = c.apps[0], n1 = c.members.length;
  run('принять заявку', () => T.ACT.clacc(`${a.id}:${op()}`)); cnt.ops++;
  if (c.members.length !== n1 + 1 || c.apps.includes(a)) say('заявки: не принята');
  run('паспорт: тип', () => T.ACT.clpset(`type:hard:${op()}`)); cnt.ops++;
  if (c.type !== 'hard' || !/паспорт/.test(c.log[0].t)) say('паспорт: тип не изменён или нет записи');
  run('паспорт: цель', () => T.ACT.clgoal('week', { value: 'Круг 9' }));
  if (c.goals.week !== 'Круг 9') say('паспорт: цель недели не изменена');
  run('роль участника', () => T.ACT.clrolev('member'));
  run('участник правит паспорт', () => T.ACT.clpset(`type:chill:${op()}`));
  if (c.type !== 'hard') say('паспорт: участник сменил тип клана');
  run('роль главы', () => T.ACT.clrolev('head'));
  const heir = c.members.find(x => x.role === 'treasurer');
  run('передать главенство', () => T.ACT.clleaddo(`${heir.id}:${op()}`)); cnt.ops++;
  if (heir.role !== 'head' || c.role === 'head') say('главенство не передано');
}

/* ================== 4а. ступени кланового босса (ADR-0047) ==================
   Законы — функции → список нарушений: их же зовёт проверка мутацией (флаг --mut печатает, что поймано).
   S1 — личные ступени: лестница сундуков (Л1–Л4 общих законов ladder_laws.js), первая — plank1 калькулятора клана, одна на все циклы;
        считаются по личным очкам недели, а не очкам клана; взята — набран порог; «Дары» дают её сундуки сразу и один раз; следующая
        полоса — без перехода цикла;
   S2 — клановые ступени: по кругам, взятым за неделю, — круг взят, когда пал его Хозяин; пороги — круги сундуков; взятая ждёт подсчёта
        недели строкой на ступень, сундуки — на участника; строка места в «Дарах» — только у клана в топе: строки «все с очками» нет;
   S3 — пул недели: подсчёт кладёт в пул сундуки взятых клановых ступеней и места клана в топе на каждого участника, половина — сервер
        по вкладу, половина — глава; без ступени и места пула нет; новая неделя — ступени с нуля;
   S4 — калькулятор: обычный — на своей ступени (typical сундуков), выше — не чаще, чем «в сильные недели»; увлечённый — на своей
        и выше; плательщик — не выше обычного больше чем на ступень; кланы — каждый на своей клановой ступени */
const LL = require('./ladder_laws.js');
const LAD0 = T.EL ? T.EL.ladder : null;   // алгоритм лестницы прототипа до мутаций
const wkClan = () => T.W.state('clan', 'now');
const lyOf = clan => T.LB.modes.clan.layers.find(l => (clan ? l.kind === 'plank' && l.clan : l.id === T.LB.modes.clan.ladder.layer));
const cntG = groups => groups.reduce((a, g) => a + g.count, 0);
/* строка места клана по строкам сундуков — эталон без алгоритма клана: наименьший «топ-N», куда место входит; вне топа — нет */
const tierRef = (place, pts) => (place && pts > 0 ? T.LB.modes.clan.layers.find(l => l.kind === 'place' && l.clan).rows.filter(r => r.top && place <= r.top).sort((a, b) => a.top - b.top)[0] || null : null);
const chestsN = () => T.S.bag.chests.length;
const LAW = {
  S1() {
    const e = []; reset(); T.SQ.set('clan', 's1');
    const c = S().acc.cycle, L = D.boss.ladder, calc = built.data.boss.ladder, law = t => LL.stateLaw(T.LB, 'личные ступени · ' + t, wkClan(), c, LAD0);
    if (!L || !Number.isInteger(L.plank1) || L.plank1 !== calc.plank1) return ['первая личная ступень на экране — не из сборки калькулятора клана'];
    const taken = () => wkClan().planks.filter(p => p.reached).length, s0 = wkClan(), k0 = taken();
    e.push(...law('демо'));
    if (s0.planks[0].need !== calc.plank1 || s0.have !== C().boss.mine) e.push(`личные ступени: первая — ${s0.planks[0].need} (калькулятор — ${calc.plank1}), набрано ${s0.have}, личных очков недели — ${C().boss.mine}`);
    if (JSON.stringify(CU.mySteps().map(p => [p.k, p.need, p.reached])) !== JSON.stringify(s0.planks.map(p => [p.k, p.need, p.reached]))) e.push('личные ступени: на экране клана и в Неделе — разные');
    for (const cc of D.cycles) { S().acc.cycle = cc; if (wkClan().planks[0].need !== calc.plank1) e.push(`первая личная ступень в цикле ${cc} — ${wkClan().planks[0].need}: она одна на все циклы`); }
    S().acc.cycle = c;
    /* очки клана выросли, личные — нет: ступень не берётся */
    C().members.find(m => !m.me).boss += 1000000;
    if (taken() !== k0) e.push('личная ступень взята очками клана, а не личными очками недели');
    /* до порога не хватает очка — не взята; на пороге — взята */
    const need = s0.planks[k0].need;
    C().boss.mine = need - 1; if (taken() !== k0) e.push(`личная ступень ${k0 + 1} взята до порога ${need}`);
    C().boss.mine = need; if (taken() !== k0 + 1) e.push(`набран порог ${need}, а личная ступень ${k0 + 1} не взята`);
    e.push(...law('после порога'));
    /* «Дары»: сундуки взятых ступеней — сразу, один раз; следующая платит только себя */
    const rows = () => (T.darRows ? T.darRows(T.S).filter(p => p.id === 'clan' && p.cat === 'me' && p.kind === 'plank' && p.wk.id === 'now') : []), ly = lyOf(false);
    if (!T.darRows) note.push('ступени кланового босса: «Дары» не подключены — выплата ступеней не проверена');
    else {
      const R1 = rows();
      if (R1.length !== k0 + 1) e.push(`«Дары»: личных ступеней этой недели ${R1.length}, взято ${k0 + 1}`);
      R1.forEach((p, i) => { const want = cntG(ly.rows[i].cyc[Math.max(T.LB.modes.clan.from, c)] || []); if (cntG(p.groups) !== want) e.push(`«Дары»: личная ступень ${i + 1} — ${cntG(p.groups)} сундуков, в лестнице — ${want}`); });
      for (const p of R1.filter(q => q.st === 'ok')) {
        const n0 = chestsN(); T.ACT.darget(p.key); if (chestsN() - n0 !== cntG(p.groups)) e.push(`«Дары»: «${p.label}» выдала ${chestsN() - n0} сундуков из ${cntG(p.groups)}`);
        const n1 = chestsN(); T.ACT.darget(p.key); if (chestsN() !== n1) e.push(`«Дары»: «${p.label}» заплатила второй раз`);
      }
      C().boss.mine = s0.planks[k0 + 1].need;
      const R2 = rows(), fresh = R2.filter(p => p.st === 'ok');
      if (R2.length !== k0 + 2 || fresh.length !== 1 || R2.filter(p => p.st === 'got').length !== k0 + 1) e.push(`следующая личная ступень: строк в «Дарах» ${R2.length}, к получению ${fresh.length}`);
    }
    /* следующая полоса — без перехода цикла: набран порог её первой ступени — взята, сундук — своей полосы */
    const nb = s0.planks.find(p => p.band > s0.planks[0].band);
    if (nb) { C().boss.mine = nb.need; const p = wkClan().planks.find(x => x.k === nb.k); if (!p.reached || S().acc.cycle !== c) e.push('ступень следующей полосы не берётся очками без перехода цикла'); e.push(...law('следующая полоса')); }
    /* лист: личная лестница — «дорогой» общего помощника Недели (Л4) или своими строками */
    C().boss.mine = need; T.S.route = 'clan'; T.S.seg.clan = 'boss'; T.S.overlay = { t: 'clsteps' }; T.render();
    const h = P.game();
    if (h.includes('class="cl-lad" data-by="week"><div class="wk-ld" data-mode="clan"')) e.push(...LL.roadLaw(T.LB, 'лист ступеней', h, wkClan(), c, ['<p class="reason">']));
    else if ((h.match(/<div class="cl-st[ "]/g) || []).length < s0.planks.filter(p => p.band === s0.planks[0].band).length) e.push('лист ступеней: личных ступеней своей полосы на экране меньше, чем в лестнице');
    T.S.overlay = null;
    return e;
  },
  S2() {
    const e = []; reset(); T.SQ.set('clan', 's1');
    const L = D.boss.ladder, c = Math.max(T.LB.modes.clan.from, S().acc.cycle), lyC = lyOf(true), A = lyC.rows.map(r => r.at);
    if (JSON.stringify(A) !== JSON.stringify(L.circles) || JSON.stringify(L.circles) !== JSON.stringify(built.data.boss.ladder.circles)) e.push(`круги клановых ступеней: в данных клана ${L.circles.join('/')}, у сундуков ${A.join('/')}`);
    const darAll = () => (T.darRows ? T.darRows(T.S).filter(p => p.id === 'clan' && p.cat === 'clan' && p.wk.id === 'now') : []);
    const dar = () => darAll().filter(p => p.label.startsWith(lyC.one));
    /* круг стоит — взято на один меньше: ступень берётся, когда пал Хозяин её круга */
    for (const [circle, want] of [[1, 0], [A[0], 0], [A[0] + 1, 1], [A[1], 1], [A[1] + 1, 2], [A[2] + 1, 3], [A[2] + 6, 3]]) {
      C().boss.circle = circle; C().boss.kills = 0; C().boss.targets = CU.circleTargets(C(), circle);
      const s = wkClan(), got = s.clanPlanks.filter(p => p.reached).length;
      if (got !== want || s.clanHave !== circle - 1 || CU.clanSteps().filter(p => p.reached).length !== want || EC.clanStep(D, EC.circlesDone(circle)) !== want) e.push(`стоит круг ${circle} — взято ${circle - 1}: клановых ступеней ${got}, ждали ${want}`);
      if (s.clanPlanks.some((p, i) => p.need !== A[i] || cntG(p.pay) !== cntG(lyC.rows[i].cyc[c] || []))) e.push('клановые ступени: порог или сундуки — не строки сундуков');
      if (T.darRows) {
        const rows = dar();
        if (rows.length !== want || rows.some(p => p.st !== 'wait')) e.push(`«Дары»: взято клановых ступеней ${want}, строк — ${rows.length}; до подсчёта недели они ждут`);
        rows.forEach((p, i) => { if (cntG(p.groups) !== cntG(lyC.rows[i].cyc[c] || [])) e.push(`«Дары»: клановая ступень ${i + 1} — ${cntG(p.groups)} сундуков на участника, в лестнице — ${cntG(lyC.rows[i].cyc[c] || [])}`); });
        /* строка места — только у клана в топе: строки «все с очками» нет (ADR-0047), вне топа клановая доля — одни ступени */
        const pts = CU.weekPts(C()), place = CU.placeOf(pts), extra = darAll().length - rows.length, wantRow = tierRef(place, pts) ? 1 : 0;
        if (extra !== wantRow) e.push(`«Дары»: место клана ${place || '—'} — строк места ${extra}, по строкам сундуков — ${wantRow}: вне топа строки места нет`);
      }
    }
    /* вкладка «Босс»: внизу — сундуки ближайших ступеней и путь в лист; в листе — оба ряда */
    reset(); T.SQ.set('clan', 's1'); T.S.seg.clan = 'boss'; T.S.overlay = null; T.render();
    const h = P.game(), foot = (h.match(/<button class="cl-mine"[\s\S]*?<\/button>/) || [''])[0];
    if (!foot.includes('data-v="clsteps"') || (foot.match(/class="well itf cl-chest"/g) || []).length !== 2) e.push('вкладка «Босс»: внизу нет сундуков ближайших ступеней — личной и клановой — или пути в лист ступеней');
    T.S.overlay = { t: 'clsteps' }; T.render();
    const hs = P.game(), rowsC = (hs.match(/<div class="wk-ld clan" data-mode="clan"[\s\S]*?<\/div><\/div>/) || [''])[0];
    if (!/Клановые ступени/.test(hs) || (rowsC ? (rowsC.match(/class="wk-ld-st/g) || []).length : (hs.match(/<div class="cl-lad" data-by="own"><span class="eyebrow">Клановые[\s\S]*?<\/div><\/div>/) || [''])[0].split('class="cl-st').length - 1) !== A.length) e.push('лист ступеней: клановых ступеней на экране не столько, сколько кругов в лестнице');
    T.S.overlay = null;
    return e;
  },
  S3() {
    const e = [];
    const M = T.LB.modes.clan, A = D.boss.ladder.circles;
    for (const circle of [A[0], A[0] + 1, A[1] + 1, A[2] + 2]) {
      reset();
      const cc = C(), cyc = Math.max(M.from, S().acc.cycle), cntRow = r => cntG(r.cyc[cyc] || []), n = cc.members.length, done = circle - 1;
      cc.boss.circle = circle; cc.boss.mine = D.boss.ladder.plank1 * 2;
      run('подсчёт недели', () => T.ACT.clweek());
      const P1 = C().past, rows = lyOf(true).rows.filter(r => done >= r.at), row = tierRef(P1.place, P1.pts), per = (row ? cntRow(row) : 0) + rows.reduce((a, r) => a + cntRow(r), 0), total = cntG(P1.groups);
      if (P1.circles !== done || P1.steps !== rows.length || rows.length !== EC.clanStep(D, done)) e.push(`подсчёт: взято кругов ${done} — в журнале кругов ${P1.circles}, клановых ступеней ${P1.steps}, по лестнице ${EC.clanStep(D, done)}`);
      if (total !== per * n) e.push(`подсчёт: взято кругов ${done} — пул ${total} сундуков, ждали ${per} × ${n} участников`);
      if (P1.groups.some((g, gi) => g.server + g.head !== g.count || g.server !== Math.floor(g.count * D.rewards.splitBp / D.bp) || P1.server[gi].reduce((a, x) => a + x, 0) !== g.server)) e.push('подсчёт: половина сервера — не половина пула');
      if (C().boss.circle !== 1 || C().boss.mine !== 0 || CU.clanSteps().some(p => p.reached) || CU.mySteps().some(p => p.reached)) e.push('новая неделя: круги, личные очки или ступени — не с нуля');
      if (T.darRows) {
        const prev = T.darRows(T.S).filter(p => p.id === 'clan' && p.cat === 'clan' && p.wk.id === 'prev'), i = P1.members.findIndex(m => m.id === P1.me);
        const mine = P1.groups.reduce((a, g, gi) => a + (P1.server[gi][i] || 0) + Math.floor(g.head / n), 0);
        if (prev.reduce((a, p) => a + cntG(p.groups), 0) !== mine) e.push(`«Дары» после подсчёта: доля игрока ${prev.reduce((a, p) => a + cntG(p.groups), 0)}, по журналу пула — ${mine}`);
        if (rows.length ? prev.some(p => !/Клановая ступень 1|Клановые ступени 1–/.test(p.label)) : prev.length) e.push('«Дары» после подсчёта: строки клановой доли не называют взятые ступени');
      }
    }
    return e;
  },
  S4() {
    const e = [], LC = D.calc.ladder, M = T.LB.modes.clan, typ = M.typical, xs = lyOf(false).rows.map(r => r.x), pp = T.LB.assume.payerPts, K = B.LAD, RM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
    if (!LC || !LC.me.length || !LC.clans.length) return ['нет прогона ступеней — EN_CLAN.calc.ladder'];
    const stepOf = pts => EC.myStep(D, xs, pts), need = k => EC.myNeed(D, xs[k - 1]);
    if (D.boss.ladder.plank1 % K.round || D.boss.ladder.plank1 <= 0) e.push(`первая личная ступень ${D.boss.ladder.plank1} — не кратна ${K.round}`);
    let oRows = 0, strong = 0;
    for (const [who, n, clan, rows] of LC.me) for (const [c, pts, step, pay, payStep] of rows) {
      const key = `${n}, ${clan}, цикл ${RM[c]}`;
      if (step !== stepOf(pts) || pay !== Math.floor(pts * pp[0] / pp[1]) || payStep !== stepOf(pay)) e.push(`${key}: ступень или очки плательщика — не по данным (${pts} очков)`);
      if (who === 'o') {
        oRows++; if (step > typ.free.me) strong++;
        if (step < typ.free.me) e.push(`${key}: обычный на ${step}-й ступени — ниже ${typ.free.me}-й`);
        if (payStep > step + 1) e.push(`${key}: плательщик на ${payStep}-й ступени при ${step}-й у обычного`);
      } else if (step < typ.fan.me && Math.abs(pts - need(typ.fan.me)) * D.bp > need(typ.fan.me) * K.edgeBp) e.push(`${key}: увлечённый на ${step}-й ступени — ниже ${typ.fan.me}-й`);
    }
    if (!oRows || strong * D.bp > oRows * K.strongBp) e.push(`обычный выше своей ступени в ${strong} строках прогона из ${oRows}`);
    for (const [n, want, rows] of LC.clans) for (const [c, , , circles, , step] of rows) if (step !== EC.clanStep(D, circles) || step !== want) e.push(`${n}, цикл ${RM[c]}: ${circles} кругов — ${step}-я клановая ступень, ждали ${want}-ю`);
    if (LC.clans[0][1] !== typ.free.clan || !LC.clans.some(x => x[1] === typ.fan.clan) || !LC.clans.some(x => x[1] === D.boss.ladder.circles.length)) e.push('прогон кланов: нет клана обычных на typical, клана увлечённых или клана на верхней ступени');
    return e;
  },
};
const lawRun = k => { try { return LAW[k](); } catch (x) { return ['исключение: ' + x.message + ' | ' + String(x.stack || '').split('\n').slice(1, 3).join(' | ').trim()]; } };
if (!D.boss.ladder || !T.W || !T.EL) say('ступени кланового босса: нет данных ступеней, Недели или лестницы сундуков');
else {
  let nLaw = 0, caught = 0;
  for (const k of Object.keys(LAW)) { nLaw++; for (const x of lawRun(k)) say(`ступени кланового босса, закон ${k}: ${x}`); }
  if (err.length) done();
  /* проверка мутацией: ломаем — закон обязан упасть; слом снят — законы снова чисты. Строка — код для песочницы, функция — правка из проверки */
  const LC = D.calc.ladder;
  const MUT = LL.mutations(LAD0).map(([what, f]) => ['S1', what, () => { T.EL.ladder = f; }, () => { T.EL.ladder = LAD0; }]).concat([
    ['S1', 'первая личная ступень — не из калькулятора клана', 'EN_CLAN.boss.ladder.plank10 = EN_CLAN.boss.ladder.plank1; EN_CLAN.boss.ladder.plank1 = 60;', 'EN_CLAN.boss.ladder.plank1 = EN_CLAN.boss.ladder.plank10; delete EN_CLAN.boss.ladder.plank10;'],
    ['S1', 'первая личная ступень растёт с циклом игрока', 'EN_WEEK.steps0 = EN_WEEK.steps; EN_WEEK.steps = (id, o) => EN_WEEK.steps0(id, id === "clan" && o && o.plank1 ? Object.assign({}, o, { plank1: o.plank1 * (o.cycle - 1) }) : o);', 'EN_WEEK.steps = EN_WEEK.steps0;'],
    ['S2', 'круг считается взятым, пока его Хозяин ещё стоит', 'EnClan.circlesDone0 = EnClan.circlesDone; EnClan.circlesDone = c => c;', 'EnClan.circlesDone = EnClan.circlesDone0;'],
    ['S2', 'пороги клановых ступеней в данных клана разошлись с сундуками', 'EN_CLAN.boss.ladder.circles[1] -= 1;', 'EN_CLAN.boss.ladder.circles[1] += 1;'],
    ['S2', 'взятая клановая ступень не доходит до «Даров»', 'EnClan.circleRows0 = EnClan.circleRows; EnClan.circleRows = () => [];', 'EnClan.circleRows = EnClan.circleRows0;'],
    ['S3', 'клановые ступени не входят в пул недели', 'EnClan.pool0 = EnClan.pool; EnClan.pool = (L, place, pts, members, c) => EnClan.pool0(L, place, pts, members, c, 0);', 'EnClan.pool = EnClan.pool0;'],
    ['S2', 'клан вне топа видит в «Дарах» прежнюю строку «все с очками»', 'EnClan.tier0 = EnClan.tier; EnClan.tier = (L, place, pts) => EnClan.tier0(L, place, pts) || (pts > 0 ? L.modes.clan.layers.find(x => x.kind === "place" && x.clan).rows.slice(-1)[0] : null);', 'EnClan.tier = EnClan.tier0;'],
    ['S3', 'клан вне топа получает в пул прежнюю строку «все с очками»', 'EnClan.pool1 = EnClan.pool; EnClan.pool = (L, place, pts, members, c, done) => { const P = EnClan.pool1(L, place, pts, members, c, done); if (P.row || !(pts > 0)) return P; const r = L.modes.clan.layers.find(x => x.kind === "place" && x.clan).rows.slice(-1)[0]; return { row: r, steps: P.steps, groups: P.groups.concat(EnClan.stepsOf(r, c).map(g => ({ step: g.step, win: g.win, count: g.count * members }))) }; };', 'EnClan.pool = EnClan.pool1;'],
    ['S4', 'обычный в прогоне — ниже своей ступени', () => { const r = LC.me.find(x => x[0] === 'o')[3][0]; r.push(r[1], r[2]); r[1] = D.boss.ladder.plank1; r[2] = 1; }, () => { const r = LC.me.find(x => x[0] === 'o')[3][0]; r[2] = r.pop(); r[1] = r.pop(); }],
    ['S4', 'клан обычных без древа — на второй клановой ступени', () => { const r = LC.clans[0][2][0]; r.push(r[3], r[5]); r[3] = D.boss.ladder.circles[1]; r[5] = 2; }, () => { const r = LC.clans[0][2][0]; r[5] = r.pop(); r[3] = r.pop(); }],
  ]);
  const apply = f => (typeof f === 'function' ? f() : vm.runInContext(f, P.ctx));
  for (const [k, what, brk, fix] of MUT) {
    try { apply(brk); } catch (x) { say(`мутация «${what}»: не применилась — ${x.message}`); continue; }
    const got = lawRun(k);
    try { apply(fix); } catch (x) { say(`мутация «${what}»: не снялась — ${x.message}`); }
    if (got.length) caught++; else say(`мутация «${what}»: закон ${k} её не поймал`);
    if (process.argv.includes('--mut')) console.log(`мутация «${what}»: ${got.length ? 'закон ' + k + ' — ' + got.slice(0, 2).join(' | ').slice(0, 300) : 'НЕ ПОЙМАНА'}`);
  }
  for (const k of Object.keys(LAW)) for (const x of lawRun(k)) say(`ступени кланового босса, закон ${k} после мутаций: ${x}`);
  cnt.laws = nLaw; cnt.mut = caught;
  reset();
}
if (err.length) done();

/* ================== 5. вид ================== */
function tour(team) {
  const tag = team ? ' [команда]' : '';
  run('режим', () => T.setTeam(team));
  reset(); T.SQ.set('clan', 's1');
  for (const tab of ['pass', 'boss', 'mem', 'tree']) {
    T.S.seg.clan = tab; const h = view(P, `клан · ${tab}${tag}`);
    if (!h.includes(`data-a="seg" data-v="clan:${tab}"`)) say(`клан · ${tab}: нет вкладки в шапке`);
    if (tab === 'boss') airCards(h, `клан · босс${tag}`);
  }
  const c = C(), m = c.members.find(x => !x.me), x = c.boss.targets[0];
  const sheets = [['clpass'], ['clroles'], ['clresv'], ['cltgt', x.uid], ['clledger'], ['clrules'], ['clmem', m.id], ['clmem', c.members.find(y => y.me).id], ['clapps'], ['clgifts'], ['cllog'],
    ['cllvl', '13'], ['clbonus'], ['clreset'], ['cllead', m.id], ['clkick', m.id], ['clleave'], ['gifts', 'clan'], ['rank', 'Клановый босс'], ['clsteps'], ['wkmode', 'clan:now'],
    ['clhosts'], ['clfoe', 'water-elite'], ['clfoe', 'time-boss'], ['clfoe', 'fire-dd2'], ['clcount']];
  for (const [t, arg] of sheets) { reset(); T.SQ.set('clan', 's1'); T.S.overlay = { t, arg }; view(P, `лист ${t} ${arg || ''}${tag}`); }
  for (const f of ['gifts', 'tree', 'join', 'boss', 'roles']) { reset(); T.S.clan.logF = f; T.S.overlay = { t: 'cllog' }; view(P, `журнал · ${f}${tag}`); }
  reset(); T.S.seg.clan = 'boss'; view(P, `клан · босс без отряда${tag}`);
  reset(); run('выход', () => T.ACT.clleavedo(op()));
  view(P, `поиск${tag}`);
  for (const f of ['hard', 'mid', 'chill']) { T.S.clan.srch.f = f; view(P, `поиск · ${f}${tag}`); }
  T.S.clan.srch.f = '';
  for (const sx of CU.searchList()) { T.S.overlay = { t: 'clfind', arg: sx.id }; view(P, `клан из поиска · ${sx.n}${tag}`); }
  T.S.overlay = { t: 'clnew' }; view(P, `создать клан${tag}`); T.S.overlay = null;
  /* сценарии презентации клана */
  for (const [t, , f] of T.FLOWS.filter(x => /^Клан ·/.test(x[0]))) { reset(); run('сценарий ' + t, () => f()); view(P, `сценарий «${t}»${tag}`); T.S.runs = []; }
  /* цикл I — кланов ещё нет: объяснение вместо поиска */
  reset(); T.S.acc.cycle = 1; const hl = view(P, `клан · цикл I${tag}`);
  if (!/Кланы — с цикла II/.test(hl) || hl.includes('data-a="cljoin"')) say('цикл I: экран клана не закрыт');
  /* профиль и Неделя читают S.clan.n */
  reset(); T.S.route = 'profile'; T.S.seg.profile = 'over'; const hp = view(P, `профиль${tag}`);
  if (!hp.includes(C().n)) say('профиль: нет имени клана');
  T.S.route = 'week'; T.S.seg.week = 'now'; view(P, `неделя${tag}`);
}
tour(false);
if (!FLOWS_OK()) say('сценарии презентации клана не зарегистрированы');
function FLOWS_OK() { return T.FLOWS.filter(x => /^Клан ·/.test(x[0])).length >= 4; }
tour(true);
run('режим «Игрок»', () => T.setTeam(false));
/* раздел UI-кита */
{
  const K = T.KIT_EXTRA.map(x => run('UI-кит', () => x.html()) || '').find(h => /Клан ·/.test(h));
  if (!K) say('UI-кит: нет раздела «Клан»');
  else { cnt.views++; if (/undefined|NaN|\[object /.test(K)) say('UI-кит, «Клан»: undefined или NaN'); airCards(K, 'UI-кит · карточки'); if (!/Сонмы стихий/.test(K) || (K.match(/class="cl-kgal-f"/g) || []).length !== 56) say('UI-кит, «Клан»: нет галереи сонмов из 56 фигур'); }
}

/* ================== 6. Неделя ================== */
reset();
{
  const W = T.W;
  if (!W) say('нет EN_WEEK: Неделя не подключена');
  else {
    const m = W.modes().find(x => x.id === 'clan');
    if (!m || m.demo) say('Неделя: строка «Клановый босс» — демо, а не экран клана');
    const st = W.state('clan', 'now');
    if (st.lock) say(`Неделя: строка клана закрыта — «${st.lock}»`);
    else {
      if (st.points !== CU.weekPts() || st.mine !== C().boss.mine || st.place !== CU.placeOf(CU.weekPts())) say('Неделя: очки, вклад или место клана не с экрана клана');
      /* клан демо — вне топа: выплаты за место нет, её место заняли ступени (ADR-0047): личные — по личным очкам, клановые — по кругам */
      const tr = EC.tier(T.LB, st.place, st.points);
      if (tr ? !st.tier || !st.tier.pay.length : st.tier) say('Неделя: выплата за место клана — не по строке мест сундуков');
      if (st.have !== C().boss.mine || !st.planks.length || st.planks[0].need !== D.boss.ladder.plank1) say('Неделя: личные ступени кланового босса — не по личным очкам недели или первая — не из данных клана');
      if (st.clanPlanks.length !== D.boss.ladder.circles.length || st.clanPlanks.some((p, i) => p.need !== D.boss.ladder.circles[i]) || st.clanHave !== EC.circlesDone(C().boss.circle)) say('Неделя: клановые ступени кланового босса — не по кругам недели');
    }
    const ps = W.state('clan', 'past'), rows = T.darRows ? T.darRows(T.S).filter(p => p.id === 'clan' && p.wk && p.wk.id === 'prev') : [];
    if (ps.lock) say(`Неделя: прошлая неделя клана закрыта — «${ps.lock}»`);
    else {
      const got = ps.rewards.reduce((a, r) => a + r.groups.reduce((b, g) => b + g.count, 0), 0), want = rows.reduce((a, p) => a + p.groups.reduce((b, g) => b + g.count, 0), 0);
      if (got !== want) say(`Неделя: прошлая — ${got} сундуков, в «Дарах» — ${want}`);
      if (ps.place !== C().past.place || ps.points !== C().past.pts) say('Неделя: место или очки прошлой недели не из подсчёта клана');
    }
    T.S.acc.cycle = 1;
    if (!W.state('clan', 'now').lock) say('Неделя: в цикле I клановый рейтинг не закрыт');
    T.S.acc.cycle = 2;
    run('выход', () => T.ACT.clleavedo(op()));
    if (!W.state('clan', 'now').lock) say('Неделя: без клана строка не закрыта');
  }
}
walkInt(T.S.clan, 'S.clan (после проверок)');
done();
