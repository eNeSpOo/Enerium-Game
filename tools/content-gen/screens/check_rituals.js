/* Автопроверка ритуалов и рабочих (design/ui/rituals.js, design/ui/screens/rituals.js) — без браузера. GDD §19.
   1. Файлы: index.html подключает данные rituals.js до основного скрипта, screens/rituals.js — после model.js и до screens/contracts.js
      (контракты оборачивают ACT.rclaim), rituals.css; прежнего экрана ritualsView и его помощников в index.html нет; карта экранов
      отмечает ritual и workers готовыми, шаблон «Входящие» — «пока вас не было».
   2. Данные свежие: калькулятор tools/content-gen/rituals/build.js без ошибок даёт ровно EN_RITUALS и таблицы черновика. Все числа целые;
      сетка 30 минут — 12 часов, рабочие вдвое короче героев; души — только у героев; уникальный — бригада полная, верх сетки.
   3. Алгоритм: тот же сид — тот же пул; на карточку рабочих ровно пять бросков, героев — три; уникальный — не в платном ролле и не больше
      одного во вкладке; исход старта — на сиде карточки, предметов столько, сколько на карточке.
   4. «Сервер» экрана: старт (свободный слот, бригада, лот взят), сбор (кошелёк и запасы — ровно исход, письмо уходит), отмена (без
      награды, лот пропал), ролл (бесплатные, потом Энериум по цене из данных, потолок, уникальный остаётся), пробуждение рабочего
      (шарды и души); повтор операции с тем же номером ничего не меняет, отказ ничего не меняет. Часы: готов к сроку, новый день —
      новый пул, перемотка — письма «пока вас не было». Время — целые миллисекунды.
   5. Занятость: герой в ритуале занят (busyNote) — Эхо не готово, «Спуск» идёт без него, Арена берёт; после срока — свободен.
   6. Вид: обе вкладки, все листы, закрытый экран, сценарии, раздел UI-кита — без исключений, undefined и NaN. Правила воздуха на карточке:
      не больше двух чисел, двух чипов и одного действия. Режим «Игрок»: служебных слов нет; «Команда» — служебное есть.
   7. Неделя и Убежище: строка «Ритуалы» и счётчики сходятся со слотами. Анимация сбора — только transform и opacity.
   Запуск: node tools/content-gen/screens/check_rituals.js [--dump] */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const DUMP = process.argv.includes('--dump');
const err = [], note = [];
const cnt = { views: 0, player: 0, ops: 0, cards: 0, starts: 0, claims: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  for (const n of note) console.log('предупреждение: ' + n);
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Ритуалы: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; карточек ${cnt.cards}; операций ${cnt.ops}, стартов ${cnt.starts}, сборов ${cnt.claims}.`);
  console.log('Проверка пройдена: данные свежие и целые, пул и исход решаются на сиде, операции не повторяются, выдача — ровно исход, занятость героев держится, игроку служебного не видно.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const i = src => scripts.findIndex(s => s.src === src), iMain = scripts.findIndex(s => !s.src && /const EB = window\.EnBattle/.test(s.code));
  if (i('rituals.js') < 0) say('index.html: не подключены данные rituals.js');
  else if (iMain >= 0 && i('rituals.js') > iMain) say('index.html: rituals.js подключён после основного скрипта');
  if (i('screens/rituals.js') < 0) say('index.html: не подключён screens/rituals.js');
  else {
    if (i('screens/rituals.js') < i('screens/model.js')) say('index.html: screens/rituals.js подключён раньше model.js');
    if (i('screens/contracts.js') >= 0 && i('screens/rituals.js') > i('screens/contracts.js')) say('index.html: screens/rituals.js — после contracts.js: наблюдатель контрактов не увидит сбор ритуала');
    if (i('screens/wanderer.js') >= 0 && i('screens/rituals.js') < i('screens/wanderer.js')) say('index.html: screens/rituals.js — раньше wanderer.js: слоты не увидят «Караванный шатёр»');
  }
  if (!/<link rel="stylesheet" href="screens\/rituals\.css">/.test(html)) say('index.html: не подключён screens/rituals.css');
  for (const old of ['function ritualsView', 'rituals: ritualsView', 'function ritSpec', 'function ritGive', 'const ritTime', 'const ritWho', 'drops.rituals', '.rslot{', '.worker{', "S.rituals.slots.forEach(s => { if (s.left)"])
    if (html.includes(old)) say(`index.html: остался прежний код ритуалов — «${old}»`);
  const card = html.match(/\{ n: 'Ритуалы'[\s\S]*?\},\r?\n/);
  if (!card || !/ready:\s*\[[^\]]*'rituals'[^\]]*'workers'/.test(card[0])) say('index.html: на карте экранов ритуалы и рабочие не отмечены готовыми (ready карточки «Ритуалы»)');
  if (!/\['Входящие',[^\n]*\[[^\]\[]*'offline-rewards'[^\]\[]*\]\]/.test(html)) say('index.html: шаблон «Входящие» не отмечает «пока вас не было» готовым');   // готовое — четвёртое поле шаблона, в нём может быть и почта
  if (!/const busyNote = [^\n]*rtBusyNote/.test(html)) say('index.html: busyNote не спрашивает занятость ритуалом (rtBusyNote)');
  for (const f of ['rituals.js', 'screens/rituals.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
  /* анимация сбора — только transform и opacity */
  const css = read('screens/rituals.css');
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
    const props = [...m[2].matchAll(/([a-z-]+)\s*:/g)].map(x => x[1]).filter(p => !['transform', 'opacity'].includes(p));
    if (props.length) say(`rituals.css: в анимации ${m[1]} двигается не только transform и opacity — ${[...new Set(props)].join(', ')}`);
  }
  if (/transition:[^;]*(?:width|height|top|left|margin)/.test(css)) say('rituals.css: переход по размеру или положению — только transform и opacity');
}
if (err.length) done();

/* ================== 2. данные ================== */
const B = require('../rituals/build.js');
const built = B.build();
if (built.err.length) say('калькулятор ритуалов: ' + built.err.slice(0, 5).join('; '));
const ctxD = { window: {} }; ctxD.window = ctxD; vm.createContext(ctxD); vm.runInContext(read('rituals.js'), ctxD);
const D = ctxD.EN_RITUALS, E = ctxD.EnRitual;
{
  if (!D || !E) say('rituals.js: нет window.EN_RITUALS или window.EnRitual');
  else if (B.render(built.data) !== read('rituals.js')) say('rituals.js устарел: пересобрать — node tools/content-gen/rituals/build.js');
  const doc = fs.existsSync(B.FILES.doc) ? fs.readFileSync(B.FILES.doc, 'utf8') : null;
  if (!doc) say('нет черновика docs/content/ритуалы.md');
  else { const fresh = B.withTables(doc, built.tables); if (fresh == null) say('ритуалы.md: нет меток таблиц'); else if (fresh !== doc) say('ритуалы.md: таблицы устарели — пересобрать'); }
}
if (err.length) done();
{
  const walk = (x, where) => { if (typeof x === 'number' && !Number.isInteger(x)) say(`данные: не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, where + '.' + k); };
  walk(D, 'EN_RITUALS');
  const TW = D.tabs.work, TH = D.tabs.hero;
  if (TW.ms[0] !== 1800000 || TH.ms[6] !== 43200000) say('сетка: не от 30 минут до 12 часов (§19.4)');
  TW.ms.forEach((ms, i) => { if (TH.ms[i] !== ms * 2) say(`сетка: рабочие не вдвое короче героев на редкости ${i + 1}`); if (i && ms <= TW.ms[i - 1]) say('сетка: длительность не растёт с редкостью'); });
  if (TW.cur || !TH.cur.some(c => c[0] === 'souls')) say('данные: души — только с вкладки героев (§19.5)');
  if (D.rules.unique.crew !== 5 || D.rules.unique.r !== 7 || D.rules.unique.chanceBp !== 100) say('данные: уникальный — 1 %, бригада полная, верх сетки (§19.4)');
  if (D.rules.slots.cap !== 7 || D.rules.rolls.free !== 3 || D.rules.rolls.paid.length !== 5) say('данные: слоты до 7, роллы 3 бесплатных и 5 за Энериум (§19.2, таблица автора)');
  if (D.rules.speed.perRBp !== 200 || D.rules.speed.capBp !== 5000) say('данные: ускорение рабочего — 2 % × редкость, кап 50 % (§19.1)');
  if (D.heroAwaken && E.awaken(D, 7) * 2 > D.heroAwaken) say('данные: вневременной рабочий не «заметно дешевле» героя');
}

/* ================== 3. алгоритм ================== */
{
  const open = E.openW(D, ['b1', 'b2', 'b3']), sp = (seed, tab, roll = 0, paid = false) => ({ seed, day: 7, tab, roll, paid, n: 5, open, uniqueOk: true });
  const a = E.pool(D, sp('А', 'work')), b = E.pool(D, sp('А', 'work')), z = E.pool(D, sp('Б', 'work'));
  if (JSON.stringify(a) !== JSON.stringify(b)) say('пул: тот же сид — разный пул');
  if (JSON.stringify(a) === JSON.stringify(z)) say('пул: разные сиды — одинаковый пул');
  /* формат бросков: рабочие — уникальный, редкость, бригада, биом, имя; герои — редкость, бригада, имя */
  for (const tab of ['work', 'hero']) for (let s = 0; s < 50; s++) {
    const S0 = sp('формат ' + s, tab), P = E.pool(D, S0), rng = E.makeRng(E.seedOf([S0.seed, S0.day, S0.tab, S0.roll].join('|'))), T = D.tabs[tab], used = [];
    let left = D.rules.unique.max;
    for (const x of P) {
      const u = tab === 'work' ? rng(D.rules.bp) : D.rules.bp, r0 = E.pickIdx(D.rules.rarW, rng(D.rules.rarW.reduce((q, w) => q + w, 0))) + 1;
      const crew = T.crew.lo[r0 - 1] + rng(T.crew.hi[r0 - 1] - T.crew.lo[r0 - 1] + 1);
      let biome = null; if (tab === 'work') biome = open[E.pickIdx(open.map(o => o[1]), rng(open.reduce((q, o) => q + o[1], 0)))][0];
      const uniq = tab === 'work' && left > 0 && u < D.rules.unique.chanceBp; if (uniq) left--;
      const list = uniq ? T.uniqueNames : T.names[D.rules.bands[r0 - 1]]; let nm = rng(list.length);
      for (let k = 0; k < list.length && used.includes(list[nm]); k++) nm = (nm + 1) % list.length;
      used.push(list[nm]);
      if (x.unique !== uniq || x.r !== (uniq ? 7 : r0) || x.crew !== (uniq ? 5 : crew) || x.biome !== biome || x.n !== list[nm]) { say(`пул ${tab}: броски не совпали с форматом — ${JSON.stringify(x)}`); break; }
    }
    if (new Set(P.map(x => x.n)).size !== P.length) say(`пул ${tab}: имена повторились`);
  }
  let paidU = 0, freeU = 0;
  for (let s = 0; s < 3000; s++) {
    const f = E.pool(D, sp('у' + s, 'work')), p = E.pool(D, sp('у' + s, 'work', 1, true));
    freeU += f.filter(x => x.unique).length; paidU += p.filter(x => x.unique).length;
    if (f.filter(x => x.unique).length > D.rules.unique.max) say('пул: два уникальных во вкладке');
    if (E.pool(D, sp('г' + s, 'hero')).some(x => x.unique)) say('пул: уникальный у героев');
  }
  if (paidU) say(`пул: уникальный в платном ролле — ${paidU}`);
  if (!freeU) say('пул: уникальных нет и в бесплатных');
  /* время и ускорение: целые мс, кап */
  for (const r of [1, 4, 7]) {
    const c = { tab: 'work', r, ms: D.tabs.work.ms[r - 1] };
    const t5 = E.time(D, c, [7, 7, 7, 7, 7]);
    if (t5 * 2 !== c.ms) say('ускорение: пять вневременных — не ровно −50 %');
    if (!Number.isInteger(E.time(D, c, [1, 2, 3]))) say('ускорение: время не целое');
    if (E.time(D, { tab: 'hero', r, ms: D.tabs.hero.ms[r - 1] }, [7, 7]) !== D.tabs.hero.ms[r - 1]) say('герои ускорились: ускоряют только рабочие');
  }
}
if (err.length) done();

/* ================== песочница ================== */
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
  const events = [];
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent: e => { events.push(e); return true; }, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent(t, o) { this.type = t; this.detail = o && o.detail; }, performance: { now: () => 0 } };
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
    ACT, OV, FLOWS, KH, KIT_EXTRA, SCREENS, BAG, render, initialState, setTeam, busyNote, poolItems, biomeItems,
    RT: window.EN_RITUALS, RTE: window.EnRitual, RT_SRV, RT_DEMO, rtKitHtml, rtBusyNote, rtSlotsN, rtFreeN, rtCardsN,
    SQ: typeof SQ !== 'undefined' ? SQ : null, CT_SRV: typeof CT_SRV !== 'undefined' ? CT_SRV : null, WEEK: window.EN_WEEK || null,
  })`, ctx);
  return { T, ctx, els, events, game: () => (els.game ? els.game.innerHTML : '') };
}
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
const dumped = new Set();
function scan(P, h, where) {
  cnt.views++;
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!P.T.KH.team) {
    cnt.player++;
    const v = strip(h), txt = playerText(h).split('\n').concat(tips(v));
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
    if (DUMP && !dumped.has(where)) { dumped.add(where); console.log(`\n== ${where}\n` + playerText(h)); }
  }
  return h;
}
const view = (P, where) => { run(where, () => P.T.render()); return scan(P, P.game(), where); };
/* правила воздуха на карточке ритуала: не больше двух чипов, двух чисел вне чипов и одного действия */
function airCards(h, where) {
  let at = 0;
  for (;;) {
    const s = h.indexOf('<div class="rt-card', at); if (s < 0) break;
    const a = h.indexOf('<div class="rt-ca">', s), end = h.indexOf('<div class="rt-card', s + 10), e = a >= 0 && (end < 0 || a < end) ? h.indexOf('</div>', a) : -1;
    at = s + 10;
    cnt.cards++;
    const main = h.slice(h.indexOf('>', s) + 1, e >= 0 ? a : (end < 0 ? h.length : end)).replace(/\s(?:title|aria-label)="[^"]*"/g, '');
    const chips = (main.match(/class="chip[\s"]/g) || []).length;
    if (chips > 2) say(`${where}: на карточке больше двух чипов`);
    const noChips = main.replace(/<span class="chip[^"]*"[^>]*>[\s\S]*?<\/span>/g, '');
    const text = playerText(noChips);
    const nums = (text.match(/\d[\d\s ]*/g) || []).filter(x => x.trim()).length;
    if (nums > 2) say(`${where}: на карточке больше двух чисел — «${text.replace(/\n/g, ' · ')}»`);
    if (e >= 0) { const acts = (h.slice(a, e).match(/<button/g) || []).length; if (acts > 1) say(`${where}: на карточке больше одного действия`); }
  }
}

const P = load(), T = P.T;
const reset = () => { T.S = T.initialState(); T.S.overlay = null; };
const R = () => T.S.rituals;
const op = () => `rt${R().seq}`;
const snap = () => JSON.parse(JSON.stringify({ wallet: T.S.wallet, items: T.S.bag.items, rit: R(), inbox: T.S.inbox.length, extra: T.S.zp ? T.S.zp.extra : null }));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const diff = (a, b) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (b[k] || 0) - (a[k] || 0); if (d) o[k] = d; } return o; };
const norm = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
reset();
if (!R()) { say('S.rituals не заведён'); done(); }

/* ================== 4. «сервер» ================== */
{
  const R0 = R();
  /* демо: слоты по артефакту, готовый ритуал с письмом, идущий — с бригадой рабочих; время — целые мс */
  if (R0.slots.length !== T.rtSlotsN()) say(`демо: слотов ${R0.slots.length}, по «Караванному шатру» ${T.rtSlotsN()}`);
  if (R0.free !== T.rtFreeN()) say('демо: бесплатных роллов не по данным');
  if (R0.work.length !== T.rtCardsN() || R0.hero.length !== T.rtCardsN()) say('демо: карточек во вкладке не по данным');
  const ready = R0.slots.find(x => x.st === 'ready'), runS = R0.slots.find(x => x.st === 'run');
  if (!ready || !T.S.inbox.some(m => m.rit === ready.uid && m.k === 'away')) say('демо: нет готового ритуала с письмом «пока вас не было»');
  if (!runS || runS.kind !== 'work' || runS.crew.length !== runS.ppl) say('демо: нет идущего ритуала рабочих с бригадой');
  for (const x of R0.slots.filter(s => s.st !== 'free')) for (const k of ['t0', 't1', 'ms', 'nominal']) if (!Number.isInteger(x[k])) say(`слот ${x.uid}: ${k} не целые мс`);
  /* демо: у каждого ритуала своя бригада — рабочий не бывает в двух ритуалах, что шли в одно время; готовый ритуал уже кончился */
  const works = R0.slots.filter(s => s.st !== 'free' && s.kind === 'work');
  works.forEach((a, i) => works.slice(i + 1).forEach(b => {
    const both = a.t0 < b.t1 && b.t0 < a.t1, same = a.crew.filter(id => b.crew.includes(id));
    if (both && same.length) say(`демо: рабочие ${same.join(', ')} сразу в двух ритуалах — «${a.n}» и «${b.n}»`);
  }));
  for (const x of works) if (x.st === 'ready' ? x.t1 > R0.now : x.t1 <= R0.now) say(`демо: ритуал «${x.n}» ${x.st === 'ready' ? 'готов, а срок не вышел' : 'идёт, а срок вышел'}`);
  for (const x of works) if (new Set(x.crew).size !== x.crew.length || x.crew.some(id => !R0.artel.some(w => w.id === id))) say(`демо: бригада ритуала «${x.n}» — не рабочие артели или повтор`);
  if (!Number.isInteger(R0.now)) say('часы: не целые мс');

  /* старт и сбор каждой карточки обеих вкладок: срок — по данным и бригаде, исход — на сиде, выдача — ровно исход */
  for (const tab of ['work', 'hero']) {
    const list = R()[tab].slice();
    list.forEach((card, i) => {
      const where = `${tab} · ${card.n}`, Rr = R();
      Rr.slots = Rr.slots.map(s => s.st === 'free' ? s : { st: 'free' });
      Rr.now = Rr.day * 86400000 + 60000;
      T.S.overlay = { t: 'ritual', arg: `${tab}:${i}` }; view(P, 'лист старта · ' + where);
      const o1 = op(), s0 = snap();
      run(where + ' · старт', () => T.ACT.rtstart(`${o1}:${tab}:${i}`)); cnt.ops++;
      const k = Rr.slots.findIndex(s => s.st === 'run');
      if (k < 0) { say(where + ': не начался'); return; }
      cnt.starts++;
      const x = Rr.slots[k];
      if (!Rr[tab][i].taken) say(where + ': лот не взят');
      const crewR = tab === 'work' ? x.crew.map(id => Rr.artel.find(w => w.id === id).r) : [];
      if (x.t1 - x.t0 !== T.RTE.time(T.RT, card, crewR)) say(`${where}: срок не по данным и бригаде`);
      if (x.crew.length !== card.crew) say(`${where}: бригада ${x.crew.length}, по карточке ${card.crew}`);
      const lists = tab === 'work' ? { basic: T.poolItems().map(it => it.id), key: T.biomeItems('key', card.biome).map(it => it.id), unique: T.biomeItems('unique', card.biome).map(it => it.id) } : { basic: [], key: [], unique: [] };
      const want = T.RTE.resolve(T.RT, card, T.S.acc.cycle, T.RTE.seedOf(`${Rr.seed}|${card.id}|исход`), lists);
      if (!same(want, x.got)) say(`${where}: исход старта не на сиде карточки`);
      const A = T.RTE.amount(T.RT, card, T.S.acc.cycle), nItems = Object.values(x.got.items).reduce((a, q) => a + q, 0);
      if (nItems !== A.basics + A.keys + A.uniq) say(`${where}: предметов ${nItems}, на карточке ${A.basics + A.keys + A.uniq}`);
      if (tab === 'hero' && !x.got.cur.some(c => c[0] === 'souls')) say(`${where}: герои без душ`);
      if (tab === 'work' && x.got.cur.length) say(`${where}: рабочие с валютой`);
      if (!same(snap().wallet, s0.wallet)) say(`${where}: старт что-то списал из кошелька`);
      /* повтор номера — ничего */
      const s1 = snap(); run(where + ' · повтор старта', () => T.ACT.rtstart(`${o1}:${tab}:${i}`));
      if (!same(snap().rit.slots, s1.rit.slots)) say(`${where}: повтор старта начал второй ритуал`);
      /* рано — не забрать */
      const o2 = op(), s2 = snap(); run(where + ' · рано', () => T.ACT.rtclaim(`${o2}:${k}`));
      if (!same(snap().wallet, s2.wallet) || Rr.slots[k].st !== 'run') say(`${where}: забрали до срока`);
      T.S.overlay = { t: 'rtslot', arg: String(k) }; view(P, 'идущий · ' + where);
      /* срок */
      Rr.now = x.t1 - 1; T.RT_SRV.tick(); if (x.st !== 'run') say(`${where}: готов раньше срока`);
      Rr.now = x.t1; T.RT_SRV.tick(); if (x.st !== 'ready') say(`${where}: к сроку не готов`);
      if (tab === 'hero' && x.crew.some(id => T.busyNote(id))) say(`${where}: после срока герои всё ещё заняты`);
      /* сбор: ровно исход */
      const o3 = op(), s3 = snap(), d0 = Rr.done;
      run(where + ' · сбор', () => T.ACT.rtclaim(`${o3}:${k}`)); cnt.ops++; cnt.claims++;
      const s4 = snap();
      if (norm(diff(s3.items, s4.items)) !== norm(x.got.items)) say(`${where}: в запасы пришло не то, что решено при старте`);
      if (norm(diff(s3.wallet, s4.wallet)) !== norm(Object.fromEntries(x.got.cur))) say(`${where}: в кошелёк пришло не то, что решено при старте`);
      if (Rr.slots[k].st !== 'free' || Rr.done !== d0 + 1) say(`${where}: слот не освободился или счётчик не вырос`);
      if (!T.S.overlay || T.S.overlay.t !== 'rtgot') say(`${where}: нет окна сбора`);
      else { const h = view(P, 'сбор · ' + where); if (!h.includes('rt-glass') || !h.includes('rt-gi')) say(`${where}: в окне сбора нет часов или награды`); }
      if (!P.events.some(e => e.type === 'en-ritual' && e.detail && e.detail.uid === x.uid)) say(`${where}: нет события en-ritual для других режимов`);
      run(where + ' · повтор сбора', () => T.ACT.rtclaim(`${o3}:${k}`));
      if (!same(snap(), s4)) say(`${where}: повтор сбора выдал второй раз`);
      T.S.overlay = null;
    });
  }

  /* занятость героев: Эхо не готово, спуск — без них, Арена берёт */
  reset();
  {
    const Rr = R(), i = Rr.hero.findIndex(c => !c.taken);
    T.S.overlay = { t: 'ritual', arg: 'hero:' + i }; view(P, 'лист героев');
    const card = Rr.hero[i], pick = Rr.pick ? Rr.pick.ids.slice() : [];
    if (pick.length !== card.crew) say('лист героев: предложено не столько героев, сколько просит ритуал');
    /* выбор в листе: нажатие убирает и возвращает */
    run('выбор героя', () => T.ACT.rtpick(pick[0])); if (Rr.pick.ids.includes(pick[0])) say('выбор героя: нажатие не убрало героя');
    const o0 = op(), sx = snap(); run('старт с неполной бригадой', () => T.ACT.rtstart(`${o0}:hero:${i}`));
    if (!same(snap().rit.slots, sx.rit.slots)) say('старт героев с неполной бригадой прошёл');
    run('выбор героя · вернуть', () => T.ACT.rtpick(pick[0]));
    run('старт героев', () => T.ACT.rtstart(`${op()}:hero:${i}`)); cnt.ops++;
    const x = Rr.slots.find(s => s.st === 'run' && s.kind === 'hero');
    if (!x) say('старт героев не прошёл');
    else {
      for (const id of x.crew) if (!/^Ритуал · /.test(T.busyNote(id))) say(`занятость: ${id} в ритуале не занят`);
      if (!T.SQ) note.push('SQ (screens/heroes.js) не подключён — Эхо, «Спуск» и Арена против ритуала не проверены');
      if (T.SQ) {
        const e = T.SQ.ready('echo');
        if (x.crew.some(id => T.S.squads.find(s => s.id === T.S.echoSquad).m.includes(id)) && e.ok) say('занятость: Эхо готово, хотя герой отряда в ритуале');
        const d = T.SQ.ready('descent');
        if (d.go && d.go.some(id => x.crew.includes(id))) say('занятость: «Спуск» берёт героя из ритуала');
        const ar = T.SQ.ready('arena');
        if (ar.busy && ar.busy.length) say('занятость: Арена не взяла героя из ритуала — Арена и Лига берут занятых (§19.5)');
      }
      /* второй старт теми же героями — нельзя */
      const j = Rr.hero.findIndex(c => !c.taken && c.crew <= x.crew.length);
      if (j >= 0) { Rr.pick = { card: Rr.hero[j].id, ids: x.crew.slice(0, Rr.hero[j].crew) }; const s5 = snap(); const r = T.RT_SRV.start(op(), 'hero', j, Rr.pick.ids); if (!r.refuse || !same(snap().rit.slots, s5.rit.slots)) say('занятость: занятых героев послали во второй ритуал'); }
      /* отмена: участники свободны, награды нет, лот не вернулся */
      const k = Rr.slots.indexOf(x), o = op(), s6 = snap();
      run('отмена · подтверждение', () => T.ACT.rtcancel(`${o}:${k}`)); if (!T.S.overlay || T.S.overlay.t !== 'confirm') say('отмена без подтверждения');
      run('отмена', () => T.ACT.rtcanceldo(`${o}:${k}`)); cnt.ops++;
      if (Rr.slots[k].st !== 'free' || x.crew.some(id => T.busyNote(id))) say('отмена: слот или герои не освободились');
      if (!same(snap().wallet, s6.wallet) || !same(snap().items, s6.items)) say('отмена выдала награду');
      if (!Rr.hero[i].taken) say('отмена: лот вернулся в пул — он потерян (§19.5)');
      const s7 = snap(); run('повтор отмены', () => T.ACT.rtcanceldo(`${o}:${k}`)); if (!same(snap(), s7)) say('повтор отмены что-то изменил');
    }
  }

  /* нет свободного слота, не хватает рабочих */
  reset();
  {
    const Rr = R(), s0 = snap();
    Rr.slots = Rr.slots.map((s, i) => ({ st: 'run', uid: 'x' + i, n: 'занят', kind: 'work', r: 1, ppl: 1, biome: 'b1', cyc: 2, card: 'x', crew: [], t0: Rr.now, t1: Rr.now + 60000, ms: 60000, nominal: 60000, got: { cur: [], items: {} } }));
    const busy = JSON.stringify(Rr.slots), j = Rr.work.findIndex(c => !c.taken);
    const r = T.RT_SRV.start(op(), 'work', j, []);
    if (r.refuse !== 'slots' || JSON.stringify(Rr.slots) !== busy) say('старт без свободного слота прошёл');
    T.S.route = 'rituals'; view(P, 'все слоты заняты'); T.S.overlay = { t: 'ritual', arg: 'work:' + j }; view(P, 'лист · слоты заняты'); T.S.overlay = null;
    reset(); const R2 = R(); R2.artel = R2.artel.slice(0, 1);
    const u = R2.work.findIndex(c => !c.taken && c.crew > 1);
    if (u >= 0) { const s1 = snap(), r2 = T.RT_SRV.start(op(), 'work', u, []); if (r2.refuse !== 'workers' || !same(snap().rit.slots, s1.rit.slots)) say('старт без нужного числа рабочих прошёл'); }
    const tk = R2.work.findIndex(c => c.taken);
    if (tk >= 0 && !T.RT_SRV.start(op(), 'work', tk, []).refuse) say('старт взятого лота прошёл');
    void s0;
  }

  /* роллы: бесплатные, потом Энериум по цене, потолок; уникальный остаётся; платный — без уникального */
  reset();
  {
    const Rr = R(), free0 = Rr.free;
    const u = Rr.work.find(c => c.unique && !c.taken);
    for (let k = 0; k < free0; k++) { const o = op(), s0 = snap(); run('ролл', () => T.ACT.rtroll(`${o}:work`)); cnt.ops++; if (Rr.free !== free0 - k - 1) say('ролл: бесплатный не списался'); if (snap().wallet.enerium !== s0.wallet.enerium) say('ролл: бесплатный взял Энериум'); const s1 = snap(); run('повтор ролла', () => T.ACT.rtroll(`${o}:work`)); if (!same(snap(), s1)) say('повтор ролла что-то изменил'); }
    if (u && !Rr.work.some(c => c.id === u.id)) say('ролл: уникальный ритуал пропал — он ждёт до конца дня');
    if (Rr.work.filter(c => c.unique).length > T.RT.rules.unique.max) say('ролл: два уникальных во вкладке');
    T.S.route = 'rituals'; T.S.seg.rituals = 'work'; let h = view(P, 'роллы кончились');
    if (!h.includes('data-a="rtrollpay"')) say('ролл: после бесплатных нет ролла за Энериум');
    T.S.wallet.enerium = 1000;
    for (let k = 0; k < T.RT.rules.rolls.paid.length; k++) {
      const price = T.RT.rules.rolls.paid[k], o = op(), s0 = snap();
      run('ролл за Энериум · подтверждение', () => T.ACT.rtrollpay(`${o}:hero`));
      if (!T.S.overlay || T.S.overlay.t !== 'confirm' || !T.S.overlay.cost || T.S.overlay.cost[1] !== price) say(`ролл за Энериум: нет подтверждения цены ${price}`);
      run('ролл за Энериум', () => T.ACT.rtroll(`${o}:hero`)); cnt.ops++;
      if (s0.wallet.enerium - snap().wallet.enerium !== price) say(`ролл за Энериум: списано не ${price}`);
      if (Rr.work.concat(Rr.hero).some(c => c.paid && c.unique)) say('ролл за Энериум дал уникальный');
    }
    const s9 = snap(), r = T.RT_SRV.roll(op(), 'hero');
    if (r.refuse !== 'cap' || !same(snap(), s9)) say('ролл за Энериум сверх потолка прошёл');
    h = view(P, 'роллы за Энериум кончились');
    /* новый день — новый пул и бесплатные роллы */
    const day = Rr.day; Rr.now = (day + 1) * 86400000; T.RT_SRV.tick();
    if (Rr.day !== day + 1 || Rr.free !== T.rtFreeN() || Rr.paid !== 0) say('новый день: роллы не обновились');
    if (Rr.work.some(c => c.taken) || Rr.hero.some(c => c.taken)) say('новый день: взятые лоты остались в пуле');
  }

  /* пробуждение рабочего: шарды из сундуков, души */
  reset();
  {
    const Rr = R(), need = T.RT.rules.shardsPer, cost = T.RTE.awaken(T.RT, 3), n0 = Rr.artel.length;
    T.S.zp.extra = T.S.zp.extra || {}; T.S.zp.extra['wsh:w3:3'] = need - 1;
    let s0 = snap(), r = T.RT_SRV.awaken(op(), 3);
    if (r.refuse !== 'shards' || !same(snap(), s0)) say('пробуждение без комплекта шардов прошло');
    T.S.zp.extra['wsh:w3:3'] = need + 2; T.S.overlay = { t: 'rtart' }; view(P, 'артель');
    const souls = T.S.wallet.souls; T.S.wallet.souls = cost - 1; s0 = snap();
    r = T.RT_SRV.awaken(op(), 3); if (r.refuse !== 'souls' || !same(snap(), s0)) say('пробуждение без душ прошло');
    T.S.wallet.souls = souls; const o = op();
    run('пробуждение', () => T.ACT.rtawaken(`${o}:3`)); cnt.ops++;
    if (Rr.artel.length !== n0 + 1 || Rr.artel[Rr.artel.length - 1].r !== 3) say('пробуждение: рабочий не пришёл');
    if (T.S.zp.extra['wsh:w3:3'] !== 2 || T.S.wallet.souls !== souls - cost) say('пробуждение: шарды или души списаны не так');
    const s1 = snap(); run('повтор пробуждения', () => T.ACT.rtawaken(`${o}:3`)); if (!same(snap(), s1)) say('повтор пробуждения что-то изменил');
    view(P, 'артель · после пробуждения');
  }

  /* перемотка: готовые за время отсутствия — письмами «пока вас не было»; Входящие забирают ровно исход */
  reset();
  {
    const Rr = R(), runS = Rr.slots.find(s => s.st === 'run'), k0 = T.S.inbox.filter(m => m.rit).length;
    const n = T.RT_SRV.advance(runS.t1 - Rr.now + 1000);
    if (n !== 1 || runS.st !== 'ready') say('перемотка: идущий ритуал не стал готовым');
    const letters = T.S.inbox.filter(m => m.rit);
    if (letters.length !== k0 + 1 || !letters.some(m => m.rit === runS.uid && m.k === 'away')) say('перемотка: нет письма «пока вас не было»');
    T.S.route = 'shelter'; T.S.overlay = { t: 'inbox' }; view(P, 'Входящие · ритуалы');
    for (const m of letters) {
      const x = Rr.slots.find(s => s.uid === m.rit), s0 = snap();
      run('письмо ' + m.id, () => T.ACT.claim(m.id)); cnt.claims++;
      const s1 = snap();
      if (norm(diff(s0.items, s1.items)) !== norm(x.got.items) || norm(diff(s0.wallet, s1.wallet)) !== norm(Object.fromEntries(x.got.cur))) say(`письмо ${m.id}: выдано не то, что решено при старте`);
      if (Rr.slots.some(s => s.uid === m.rit) || T.S.inbox.some(q => q.id === m.id)) say(`письмо ${m.id}: ритуал или письмо не закрылись`);
      const s2 = snap(); run('повтор письма', () => T.ACT.claim(m.id)); if (!same(snap(), s2)) say(`письмо ${m.id}: повтор выдал второй раз`);
    }
    /* ритуал, забранный на экране, письмом второй раз не выдаётся */
    reset();
    const R2 = R(), m1 = T.S.inbox.find(m => m.rit), k = R2.slots.findIndex(s => s.uid === m1.rit);
    run('сбор на экране', () => T.ACT.rtclaim(`${op()}:${k}`));
    const s3 = snap(); run('письмо о забранном', () => T.ACT.claim(m1.id)); if (!same(snap().wallet, s3.wallet) || !same(snap().items, s3.items)) say('письмо о забранном ритуале выдало второй раз');
  }
  /* наблюдатель контрактов видит сбор */
  if (T.CT_SRV) {
    reset();
    const C = T.S.contracts, X = C && C.day;
    if (X && X.st === 'draft') {
      X.tasks = [{ kind: 'ritual', r: 1, goal: 1, p: 0, pts: 10, slot: 0, n: 0 }];
      T.CT_SRV.sign('ctx1', 'd');
      const k = R().slots.findIndex(s => s.st === 'ready');
      run('контракт · сбор ритуала', () => T.ACT.rtclaim(`${op()}:${k}`));
      if (X.tasks[0].p !== 1) say('контракты: забранный ритуал не засчитан');
    } else note.push('контракты: дневной контракт демо не черновик — наблюдатель ритуала не проверен');
  } else note.push('контракты не подключены — наблюдатель ритуала не проверен');
}
if (err.length) done();

/* ================== 6. вид ================== */
{
  for (const team of [false, true]) {
    reset(); run('режим', () => T.setTeam(team));
    T.S.route = 'rituals';
    for (const tab of ['work', 'hero']) {
      T.S.seg.rituals = tab; T.S.overlay = null;
      const h = view(P, `экран · ${tab}${team ? ' · команда' : ''}`);
      if (!team) airCards(h, 'экран · ' + tab);
      if (!/class="rt-slots"/.test(h) || !/data-a="rtclaim"/.test(h)) say(`экран ${tab}: нет слотов сверху или «Забрать» у готового`);
      if (!/data-v="rituals:work"/.test(h) || !/data-v="rituals:hero"/.test(h)) say(`экран ${tab}: нет вкладок «Рабочие» и «Герои»`);
      if (team && !/team-only/.test(h)) say('режим «Команда»: нет служебного на экране');
      R()[tab].forEach((_, i) => { T.S.overlay = { t: 'ritual', arg: `${tab}:${i}` }; view(P, `лист · ${tab}:${i}${team ? ' · команда' : ''}`); });
    }
    for (const [t, arg] of [['rtart', ''], ['rtslot', '0'], ['rtslot', '1'], ['rtslot', '2']]) { T.S.overlay = { t, arg }; view(P, `лист ${t}:${arg}${team ? ' · команда' : ''}`); }
    /* окно сбора: итог сразу — нажатие на сцену */
    const k = R().slots.findIndex(s => s.st === 'ready');
    run('сбор · вид', () => T.ACT.rtclaim(`${op()}:${k}`)); view(P, 'окно сбора' + (team ? ' · команда' : ''));
    run('сбор · пропуск', () => T.ACT.rtfx()); const h2 = view(P, 'окно сбора · итог');
    if (!/rt-fx done/.test(h2)) say('окно сбора: нажатие на сцену не показало итог сразу');
    /* закрытый экран */
    reset(); T.S.acc.level = 5; T.S.acc.cycle = 1; T.S.route = 'rituals'; T.S.overlay = null;
    const h3 = view(P, 'закрыто' + (team ? ' · команда' : ''));
    if (!/rt-lock/.test(h3)) say('закрытый экран: нет объяснения, когда откроется');
  }
  run('режим', () => T.setTeam(false));
  /* раздел UI-кита */
  reset();
  for (const team of [false, true]) { T.KH.team = team; const h = run('UI-кит', () => T.rtKitHtml()); if (!h || !/kitRituals/.test(h)) say('UI-кит: нет раздела «Ритуалы и рабочие»'); else scan(P, h, 'UI-кит' + (team ? ' · команда' : '')); }
  T.KH.team = false;
  if (!T.KIT_EXTRA.some(x => x.html === T.rtKitHtml)) say('UI-кит: раздел не зарегистрирован в KIT_EXTRA');
  /* сценарии презентации */
  const flows = T.FLOWS.filter(f => /Ритуал|Рабочие/.test(f[0]));
  if (flows.length < 4) say(`сценариев ритуалов ${flows.length}, ждали 4`);
  for (const [t, , f] of flows) { reset(); run('сценарий ' + t, () => f()); view(P, 'сценарий ' + t); }
}

/* ================== 7. Неделя и Убежище ================== */
{
  reset();
  const Rr = R(), cnts = () => ({ ready: Rr.slots.filter(s => s.st === 'ready').length, run: Rr.slots.filter(s => s.st === 'run').length });
  T.S.route = 'week'; T.S.seg.week = 'now'; let h = view(P, 'Неделя');
  const row = (h.match(/<button class="wk-rit[\s\S]*?<\/button>/) || [''])[0];
  if (!row) say('Неделя: нет строки «Ритуалы»');
  else { const c = cnts(); if (c.ready && !row.includes(`готово: ${c.ready}`)) say('Неделя: в строке «Ритуалы» не то число готовых'); if (c.run && !row.includes(`идёт: ${c.run}`)) say('Неделя: в строке «Ритуалы» не то число идущих'); }
  T.S.route = 'shelter'; h = view(P, 'Убежище');
  if (!/data-v="rituals"/.test(h)) say('Убежище: нет перехода к ритуалам');
  if (cnts().ready && !/Ритуал готов/.test(h)) say('Убежище: не видно готового ритуала');
}
done();
