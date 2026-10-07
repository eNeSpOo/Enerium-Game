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
   4а. Ступени загрузки (ADR-0047) — законы, каждый проверен мутацией (флаг --mut печатает, что поймано):
      A — мера: загрузка — часы завершённых ритуалов по карточкам к часам мест недели; ритуал идёт в счёт один раз — когда досыпался;
          старт, сбор, повтор сбора и отмена часов не прибавляют; время — по карточке, а не с ускорением бригады;
      B — роллы: ни бесплатный, ни платный ролл загрузку не растят; карточка из платного ролла даёт ровно своё время;
      C — ступени: лестница — та же, что у сундуков (Л1–Л4 общих законов ladder_laws.js); ступень взята, как только набран порог;
          «Дары» дают сундуки взятой ступени один раз; следующая ступень платит только себя;
      D — неделя и места: место, открытое посреди недели, считается с этого часа и взятую ступень не роняет; ритуал, досыпавшийся
          после конца недели, в счёт не идёт; новая неделя расы — счёт с нуля;
      E — калькулятор: увлечённый — на ступени, куда его ставят сундуки (typical); обычный — на своей или на пороге следующей; верхняя
          ступень — только места без простоя; плательщик — не выше обычного больше чем на ступень; ритуалы вместе с сундуками
          артели — не больше потолка золота забегов обычного.
   7. Неделя и Убежище: строка «Ритуалы» — режим реестра WEEK_MODES: загрузка и ступени, счётчик готовых — сходятся со слотами; прошлая
      неделя — выплаты из «Даров». Анимация сбора — только transform и opacity.
   Запуск: node tools/content-gen/screens/check_rituals.js [--dump] [--mut] */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const DUMP = process.argv.includes('--dump');
const err = [], note = [];
const cnt = { views: 0, player: 0, ops: 0, cards: 0, starts: 0, claims: 0, laws: 0, mut: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  for (const n of note) console.log('предупреждение: ' + n);
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Ритуалы: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; карточек ${cnt.cards}; операций ${cnt.ops}, стартов ${cnt.starts}, сборов ${cnt.claims}; ступени загрузки — законов ${cnt.laws}, мутаций поймано ${cnt.mut}.`);
  console.log('Проверка пройдена: данные свежие и целые, пул и исход решаются на сиде, операции не повторяются, выдача — ровно исход, занятость героев держится, загрузка недели — часы завершённых ритуалов по карточкам, ролл её не растит, ступень платит один раз, игроку служебного не видно.');
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
  /* ступени загрузки (ADR-0047): мера — в правилах, прогон — в данных; счёт — в общем алгоритме */
  const LR = D.rules.ladder, LD = D.ladder;
  if (!LR || !LR.mode || !(LR.weekH > 0) || LR.weekH % 24) say('данные: нет правила ступеней загрузки (rules.ladder: mode, weekH — целые сутки)');
  if (!LD || !LD.load || !LD.step || !LD.withBoxBp) say('данные: нет прогона ступеней загрузки (ladder: load, step, withBoxBp)');
  else for (const c of B.SIM.cycles) for (const pk of B.SIM.ladder.prof.concat(B.SIM.ladder.top.id)) if (!(LD.load[c] && LD.load[c][pk] >= 0 && LD.load[c][pk] <= 100 && LD.step[c][pk] >= 0)) say(`данные: у цикла ${c} нет загрузки профиля ${pk}`);
  for (const f of ['weekMs', 'capMs', 'load', 'stepOf']) if (typeof E[f] !== 'function') say(`алгоритм: нет EnRitual.${f}`);
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
  /* мера ступеней загрузки: неделя — weekH часов; места — целыми неделями, новое место — с остатка недели; проценты — целые, вниз, не выше ста */
  const WK = E.weekMs(D), HM = D.rules.hourMs;
  if (WK !== D.rules.ladder.weekH * HM) say('загрузка: неделя — не weekH часов');
  if (E.capMs(D, 3) !== 3 * WK || E.capMs(D, 0) !== 0) say('загрузка: часы мест — не мест × неделя');
  if (E.capMs(D, 3, 2, WK / 2) !== 4 * WK || E.capMs(D, 3, 2, 2 * WK) !== 5 * WK || E.capMs(D, 3, 2, -HM) !== 3 * WK) say('загрузка: место, открытое посреди недели, считается не с остатка недели');
  if (E.load(0, WK) !== 0 || E.load(WK / 2, WK) !== 50 || E.load(WK / 2 - 1, WK) !== 49 || E.load(3 * WK, WK) !== 100 || E.load(HM, 0) !== 0) say('загрузка: проценты — не целые вниз или выше ста');
  if (!Number.isInteger(E.load(123456789, 7 * WK))) say('загрузка: не целое');
  if (E.stepOf([20, 35, 50], 19) !== 0 || E.stepOf([20, 35, 50], 20) !== 1 || E.stepOf([20, 35, 50], 49) !== 2 || E.stepOf([20, 35, 50], 100) !== 3) say('загрузка: ступень берётся не с порога');
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
    LB: window.EN_LOOTBOXES || null, EL: window.EnLoot || null, RSW: typeof RS !== 'undefined' && RS.weeks ? RS.weeks : [],
    rsSetWeek: typeof rsSetWeek === 'function' ? rsSetWeek : null, darRows: typeof darRows === 'function' ? darRows : null,
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

/* ================== 4а. ступени загрузки (ADR-0047) ==================
   Законы — функции → список нарушений: их же зовёт проверка мутацией. Каждый закон начинает с чистого состояния демо.
   Функции экрана законы зовут живыми именами (live): мутация подменяет их в песочнице */
const LL = require('./ladder_laws.js');
const live = n => vm.runInContext(n, P.ctx);
const MODE = D.rules.ladder.mode, HMS = D.rules.hourMs;
const LAD0 = T.EL ? T.EL.ladder : null;   // алгоритм лестницы прототипа до мутаций
const ladLayer = () => { const M = T.LB.modes[MODE]; return M.layers.find(l => l.id === M.ladder.layer); };
const ats = () => ladLayer().rows.map(r => r.at);
const wk = () => R().wk;
const wkState = () => T.WEEK.state(MODE, 'now');
const loadNow = () => live('rtLoad')();
const taken = () => live('rtSteps')().filter(x => x.reached).length;
let fakeNo = 0;
/* ритуал-проба, который досыпается в миг t1 (по умолчанию — сейчас): время по карточке ms; в слоты — вместо свободного */
const fake = (ms, t1) => ({ st: 'run', uid: 'проба' + (++fakeNo), n: 'проба', kind: 'hero', r: 1, ppl: 1, biome: null, unique: false, cyc: T.S.acc.cycle, card: 'проба',
  crew: [], t0: (t1 == null ? R().now : t1) - ms, t1: t1 == null ? R().now : t1, ms, nominal: ms, got: { cur: [], items: {} } });
function addMs(ms, t1) {
  const Rr = R(); let k = Rr.slots.findIndex(s => s.st === 'free');
  if (k < 0) { k = Rr.slots.length - 1; Rr.slots[k] = { st: 'free' }; }
  Rr.slots[k] = fake(ms, t1); T.RT_SRV.tick(); Rr.slots[k] = { st: 'free' };
}
/* сколько мс не хватает до k-й ступени */
const msTo = k => Math.max(0, Math.ceil(ats()[k - 1] * wk().cap / 100) - wk().done);
const chests = () => T.S.bag.chests.length;
const darNowRows = () => (T.darRows ? T.darRows(T.S).filter(p => p.id === MODE && p.wk && p.wk.id === 'now') : []);
const cntOf = p => p.groups.reduce((a, g) => a + g.count, 0);

const LAW = {
  /* A — мера: часы завершённых ритуалов по карточкам к часам мест недели; в счёт — один раз, когда ритуал досыпался */
  A() {
    const e = []; reset();
    const W0 = wk(); if (!W0) return ['нет счёта недели — S.rituals.wk'];
    const ready = R().slots.filter(s => s.st === 'ready');
    if (W0.cap !== E.capMs(D, T.rtSlotsN())) e.push(`часы мест недели — ${W0.cap}, по местам — ${E.capMs(D, T.rtSlotsN())}`);
    if (W0.t1 - W0.t0 !== E.weekMs(D) || !(W0.t0 <= R().now && R().now < W0.t1)) e.push('неделя счёта — не weekH часов или «сейчас» вне её');
    if (W0.done !== T.RT_DEMO.week.doneH * HMS + ready.reduce((a, x) => a + x.nominal, 0) || ready.some(x => !x.wk)) e.push('демо: завершённое до сессии и готовый ритуал — не в счёте недели');
    if (loadNow() !== E.load(W0.done, W0.cap) || !Number.isInteger(loadNow())) e.push(`загрузка ${loadNow()} % — не по счёту недели (${E.load(W0.done, W0.cap)} %)`);
    if (W0.top !== E.stepOf(ats(), loadNow()) || taken() !== W0.top) e.push(`взято ступеней ${taken()} (счёт — ${W0.top}), по загрузке — ${E.stepOf(ats(), loadNow())}`);
    /* ритуал рабочих с бригадой, что ускоряет: в счёт — время по карточке, и только когда досыпался */
    const Rr = R(); Rr.slots = Rr.slots.map(s => (s.st === 'free' ? s : { st: 'free' })); Rr.now = Rr.day * 86400000 + 60000;
    const i = Rr.work.findIndex(c => !c.taken && !c.unique), card = Rr.work[i], d0 = wk().done;
    T.RT_SRV.start(op(), 'work', i, []);
    const k = Rr.slots.findIndex(s => s.st === 'run'), x = Rr.slots[k];
    if (!x) return e.concat('ритуал рабочих не начался');
    if (x.ms >= card.ms) note.push('ступени загрузки: бригада демо не ускорила ритуал — «по карточке, а не с ускорением» не проверено');
    if (wk().done !== d0) e.push('старт ритуала прибавил часы: в счёт идёт только завершённый');
    Rr.now = x.t1 - 1; T.RT_SRV.tick(); if (wk().done !== d0) e.push('часы прибавились до срока ритуала');
    Rr.now = x.t1; T.RT_SRV.tick();
    if (wk().done - d0 !== card.ms) e.push(`досыпавшийся ритуал прибавил ${wk().done - d0} мс, время по карточке — ${card.ms}, с ускорением бригады — ${x.ms}`);
    const d1 = wk().done; T.RT_SRV.tick(); Rr.now += 60000; T.RT_SRV.tick();
    if (wk().done !== d1) e.push('ход часов прибавил часы готового ритуала ещё раз');
    const o2 = op(); T.RT_SRV.claim(o2, k); if (wk().done !== d1) e.push('сбор прибавил часы'); T.RT_SRV.claim(o2, k); if (wk().done !== d1) e.push('повтор сбора прибавил часы');
    /* отмена: участники свободны, часов нет — ни сразу, ни когда вышел бы срок */
    const j = Rr.hero.findIndex(c => !c.taken), hc = Rr.hero[j], ids = live('rtHeroPool')().slice(0, hc.crew).map(q => q.h.id);
    T.RT_SRV.start(op(), 'hero', j, ids);
    const k2 = Rr.slots.findIndex(s => s.st === 'run'), y = Rr.slots[k2];
    if (!y) return e.concat('ритуал героев не начался');
    T.RT_SRV.cancel(op(), k2); Rr.now = y.t1 + 1000; T.RT_SRV.tick();
    if (wk().done !== d1) e.push('отменённый ритуал пошёл в счёт недели');
    if (loadNow() !== E.load(wk().done, wk().cap)) e.push('после сбора и отмены загрузка — не по счёту недели');
    return e;
  },
  /* B — роллы: ни бесплатный, ни платный загрузку не растят; карточка из платного ролла даёт ровно своё время */
  B() {
    const e = []; reset();
    const Rr = R(), same0 = () => JSON.stringify([wk().done, wk().cap, wk().top, loadNow()]), s0 = same0();
    if (!(Rr.free > 0)) return ['у демо нет бесплатного ролла'];
    const r1 = T.RT_SRV.roll(op(), 'work'); if (!r1.ok || r1.paid) e.push('бесплатный ролл не прошёл');
    if (same0() !== s0) e.push('бесплатный ролл изменил счёт недели');
    Rr.free = 0; T.S.wallet.enerium = 1000;
    const r2 = T.RT_SRV.roll(op(), 'hero'); if (!r2.ok || !(r2.paid > 0)) e.push('ролл за Энериум не прошёл');
    if (same0() !== s0) e.push('ролл за Энериум прибавил часы или ступень: Энериум покупает роллы, не время (§19.5)');
    const j = Rr.hero.findIndex(c => c.paid && !c.taken);
    if (j < 0) return e.concat('после платного ролла нет карточки из него');
    Rr.slots = Rr.slots.map(s => (s.st === 'free' ? s : { st: 'free' })); Rr.now = Rr.day * 86400000 + 60000;
    const card = Rr.hero[j], d0 = wk().done, ids = live('rtHeroPool')().slice(0, card.crew).map(q => q.h.id);
    T.RT_SRV.start(op(), 'hero', j, ids);
    const x = Rr.slots.find(s => s.st === 'run'); if (!x) return e.concat('карточка платного ролла не началась');
    Rr.now = x.t1; T.RT_SRV.tick();
    if (wk().done - d0 !== card.ms) e.push(`карточка из платного ролла прибавила ${wk().done - d0} мс, её время — ${card.ms}`);
    return e;
  },
  /* C — ступени: лестница сундуков; взята — набран порог; «Дары» дают сундуки взятой ступени один раз */
  C() {
    const e = []; reset();
    if (!T.WEEK || !T.darRows) return ['нет Недели или «Даров» — ступени платить некому'];
    const c = T.S.acc.cycle, A = ats(), n0 = taken(), law = t => LL.stateLaw(T.LB, 'ступени · ' + t, wkState(), c, LAD0);
    e.push(...law('демо'));
    const st0 = wkState();
    if (st0.lock || st0.points !== loadNow() || st0.planks.length !== A.length || st0.planks.filter(p => p.reached).length !== n0) e.push(`Неделя: строка режима — загрузка ${st0.points}, ступеней ${st0.planks.length}, взято ${st0.planks.filter(p => p.reached).length}; на экране — ${loadNow()} %, ${A.length}, ${n0}`);
    if (n0 >= A.length - 1) return e.concat('демо взяло почти все ступени — проверять нечего');
    /* до порога не хватает одной миллисекунды — ступень не взята; с порогом — взята */
    const need = msTo(n0 + 1);
    if (need > 1) { addMs(need - 1); if (taken() !== n0) e.push(`ступень ${n0 + 1} взята до порога: загрузка ${loadNow()} % при пороге ${A[n0]} %`); addMs(1); } else addMs(need);
    if (taken() !== n0 + 1 || loadNow() < A[n0]) e.push(`набран порог ${A[n0]} %, а ступень ${n0 + 1} не взята`);
    e.push(...law('после порога'));
    /* «Дары»: строка на каждую взятую ступень, сундуки — строки её слоя; «Получить» выдаёт их один раз */
    const rows = darNowRows(), ly = ladLayer();
    if (rows.length !== n0 + 1 || rows.some(p => p.cat !== 'me' || p.kind !== 'plank')) e.push(`«Дары»: строк этой недели ${rows.length}, взятых ступеней ${n0 + 1}`);
    rows.forEach((p, i) => { const want = (ly.rows[i].cyc[c] || []).reduce((a, g) => a + g.count, 0); if (cntOf(p) !== want) e.push(`«Дары»: ступень ${i + 1} — ${cntOf(p)} сундуков, в лестнице — ${want}`); });
    for (const p of rows.filter(q => q.st === 'ok')) {
      const c0 = chests(); T.ACT.darget(p.key);
      if (chests() - c0 !== cntOf(p)) e.push(`«Дары»: «${p.label}» выдала ${chests() - c0} сундуков из ${cntOf(p)}`);
      const c1 = chests(); T.ACT.darget(p.key);
      if (chests() !== c1) e.push(`«Дары»: «${p.label}» заплатила второй раз`);
    }
    if (darNowRows().some(p => p.st !== 'got')) e.push('«Дары»: полученная ступень не отмечена полученной');
    /* следующая ступень платит только себя; полученные — «в запасах» и в листе */
    addMs(msTo(n0 + 2));
    const after = darNowRows(), fresh = after.filter(p => p.st === 'ok');
    if (taken() !== n0 + 2 || after.length !== n0 + 2 || fresh.length !== 1 || cntOf(fresh[0]) !== (ly.rows[n0 + 1].cyc[c] || []).reduce((a, g) => a + g.count, 0)) e.push(`следующая ступень: взято ${taken()}, строк в «Дарах» ${after.length}, к получению ${fresh.length}`);
    e.push(...law('две ступени'));
    /* лист: лестница — «дорогой» общего помощника Недели (Л4) или своими строками; отметка «в запасах» у полученной */
    T.S.route = 'rituals'; T.S.seg.rituals = 'work'; T.S.overlay = { t: 'rtload' }; T.render();
    const h = P.game();
    if (h.includes('class="rt-lad" data-by="week"')) e.push(...LL.roadLaw(T.LB, 'лист ступеней', h, wkState(), c, ['<p class="reason">']));
    else if ((h.match(/<div class="rt-st[ "]/g) || []).length !== A.length) e.push('лист ступеней: строк не столько, сколько ступеней');
    if (!/в запасах/.test(h)) e.push('лист ступеней: полученная в «Дарах» ступень не отмечена «в запасах»');
    T.S.overlay = null;
    return e;
  },
  /* D — неделя и места: новое место — с этого часа, взятая ступень остаётся; после конца недели — не в счёт; новая неделя расы — с нуля */
  D() {
    const e = []; reset();
    R().slots = R().slots.map(s => (s.st === 'free' ? s : { st: 'free' }));   // идущий ритуал демо досыпался бы посреди проверки — снимаем
    const A = ats(), a = D.rules.slots.art, W = wk(), n0 = taken();
    addMs(msTo(n0 + 1));
    const top0 = taken(), cap0 = W.cap, lv0 = T.S.wn.art[a] || 0;
    if (top0 !== n0 + 1) return e.concat('не удалось взять следующую ступень перед проверкой мест');
    if (lv0 >= D.art.slots.lv) note.push('ступени загрузки: «Караванный шатёр» демо уже на потолке — новое место посреди недели не проверено');
    else {
      T.S.wn.art[a] = lv0 + 1; live('rtSync')();
      const add = T.rtSlotsN() - cap0 / E.weekMs(D), want = cap0 + add * (W.t1 - R().now);
      if (!(add > 0) || wk().cap !== want) e.push(`новое место посреди недели: часы мест ${wk().cap}, ждали ${want} — место считается с часа, когда открылось`);
      live('rtSync')(); if (wk().cap !== want) e.push('повтор сверки мест прибавил часы мест ещё раз');
      if (loadNow() !== E.load(wk().done, wk().cap)) e.push('после нового места загрузка — не по счёту недели');
      if (taken() !== top0) e.push(`новое место уронило взятую ступень: было ${top0}, стало ${taken()} при загрузке ${loadNow()} %`);
      if (T.WEEK && wkState().planks.filter(p => p.reached).length !== top0) e.push('Неделя: после нового места взятая ступень пропала');
    }
    /* ритуал, досыпавшийся в последний миг недели, — в счёт; после её конца — нет */
    const d0 = wk().done;
    addMs(HMS, wk().t1 - 1); if (wk().done !== d0) e.push('ритуал с будущим сроком пошёл в счёт раньше срока');
    R().now = wk().t1 - 1; addMs(HMS, wk().t1 - 1); if (wk().done - d0 !== HMS) e.push('ритуал, досыпавшийся в последний миг недели, не засчитан');
    const d1 = wk().done; R().now = wk().t1 + HMS; addMs(HMS, wk().t1); addMs(HMS);
    if (wk().done !== d1) e.push('ритуал, досыпавшийся после конца недели, пошёл в её счёт');
    /* новая неделя расы: счёт с нуля, ступени не взяты, прежние часы не переходят */
    if (!T.rsSetWeek || !T.RSW.length) note.push('ступени загрузки: нет смены недели расы (rsSetWeek) — новая неделя не проверена');
    else {
      const no0 = wk().no, cur = T.RSW.findIndex(w => String(w.gen).toLowerCase() === String(T.S.week.race).toLowerCase()), next = T.RSW[(cur + 1) % T.RSW.length];
      T.rsSetWeek(next.race); T.RT_SRV.tick();
      const N = wk();
      if (N.no !== no0 + 1 || N.done !== 0 || N.top !== 0 || N.t0 !== R().now || N.cap !== E.capMs(D, T.rtSlotsN())) e.push(`новая неделя расы: счёт не с нуля — неделя ${N.no}, часов ${N.done}, ступеней ${N.top}`);
      if (taken() !== 0 || loadNow() !== 0) e.push('новая неделя расы: загрузка или ступени остались с прошлой');
      addMs(msTo(1)); if (taken() !== 1) e.push('новая неделя: первая ступень не берётся заново');
    }
    return e;
  },
  /* E — калькулятор: кто где стоит — по данным прогона (EN_RITUALS.ladder), порогам сундуков и целям сборщика */
  E() {
    const e = [], L = D.ladder, TG = B.TARGET.ladder, M = T.LB.modes[MODE], ly = ladLayer(), A = ats(), n = A.length, top = B.SIM.ladder.top.id;
    const want = { o: M.typical.free[ly.id], e: M.typical.fan[ly.id] }, RM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
    if (ly.unit !== '%' || M.ladder.next != null) e.push('сундуки: порог ступеней загрузки — не проценты или у лестницы есть продолжение');
    for (const c of B.SIM.cycles) {
      const S2 = L.step[c], Ld = L.load[c];
      for (const pk of Object.keys(Ld)) if (S2[pk] !== E.stepOf(A, Ld[pk])) e.push(`цикл ${RM[c]}: у профиля ${pk} ступень ${S2[pk]} не по загрузке ${Ld[pk]} %`);
      if (S2.e !== want.e) e.push(`цикл ${RM[c]}: увлечённый — на ${S2.e}-й ступени, сундуки ставят его на ${want.e}-ю`);
      if (S2.o !== want.o && !(S2.o === want.o + 1 && Ld.o - A[want.o] <= TG.edge)) e.push(`цикл ${RM[c]}: обычный — на ${S2.o}-й ступени при загрузке ${Ld.o} %: не на ${want.o}-й и не на пороге следующей`);
      for (const pk of B.SIM.ladder.prof) if (S2[pk] >= n) e.push(`цикл ${RM[c]}: профиль ${pk} берёт верхнюю ступень — она только для мест без простоя`);
      if (S2[top] < n && A[n - 1] - Ld[top] > TG.edge) e.push(`цикл ${RM[c]}: и без простоя верхняя ступень не берётся — ${Ld[top]} % при пороге ${A[n - 1]} %`);
      if (S2.p > S2.o + TG.payerSteps) e.push(`цикл ${RM[c]}: плательщик — на ${S2.p}-й ступени, обычный — на ${S2.o}-й`);
      if (!(L.withBoxBp[c] > 0) || L.withBoxBp[c] > TG.withBoxMaxBp) e.push(`цикл ${RM[c]}: ритуалы с сундуками артели — ${L.withBoxBp[c] / 100} % золота забегов обычного, потолок ${TG.withBoxMaxBp / 100} %`);
    }
    return e;
  },
};
const lawRun = k => { try { return LAW[k](); } catch (x) { return ['исключение: ' + x.message + ' | ' + String(x.stack || '').split('\n').slice(1, 3).join(' | ').trim()]; } };
if (!T.LB || !T.LB.modes[MODE] || !T.EL || !wk()) say('ступени загрузки: нет лестницы режима в сундуках или счёта недели');
else {
  for (const k of Object.keys(LAW)) { cnt.laws++; for (const x of lawRun(k)) say(`ступени загрузки, закон ${k}: ${x}`); }
  if (err.length) done();
  /* проверка мутацией: ломаем — закон обязан упасть; слом снят — закон снова чист. Строка — код для песочницы, функция — правка данных */
  const CREDIT = (cond, ms) => `rtCredit0 = rtCredit; rtCredit = function (x) { const W = S.rituals.wk; if (!W || x.wk || !(${cond})) return; x.wk = W.no; W.done += ${ms}; rtLatch(); };`;
  const MUT = [
    ['A', 'в счёт идёт время с ускорением бригады, а не по карточке', CREDIT('x.t1 >= W.t0 && x.t1 < W.t1', 'x.ms'), 'rtCredit = rtCredit0;'],
    ['A', 'ритуал засчитан дважды — когда досыпался и при сборе', `RT_SRV.claim0 = RT_SRV.claim; RT_SRV.claim = (o, k) => { const x = S.rituals.slots[k], r = RT_SRV.claim0(o, k); if (r.ok && !r.again && x) S.rituals.wk.done += x.nominal; return r; };`, 'RT_SRV.claim = RT_SRV.claim0;'],
    ['A', 'отменённый ритуал идёт в счёт', `RT_SRV.cancel0 = RT_SRV.cancel; RT_SRV.cancel = (o, k) => { const x = S.rituals.slots[k], r = RT_SRV.cancel0(o, k); if (r.ok && !r.again && x) S.rituals.wk.done += x.nominal; return r; };`, 'RT_SRV.cancel = RT_SRV.cancel0;'],
    ['A', 'часы идут в счёт при старте, а не когда ритуал досыпался', `RT_SRV.start0 = RT_SRV.start; RT_SRV.start = (o, t, i, ids) => { const r = RT_SRV.start0(o, t, i, ids); if (r.ok && !r.again) { const x = S.rituals.slots[r.k]; S.rituals.wk.done += x.nominal; x.wk = S.rituals.wk.no; } return r; };`, 'RT_SRV.start = RT_SRV.start0;'],
    ['B', 'ролл за Энериум прибавляет час', `RT_SRV.roll0 = RT_SRV.roll; RT_SRV.roll = (o, t) => { const r = RT_SRV.roll0(o, t); if (r.ok && !r.again && r.paid) { S.rituals.wk.done += RT_HOUR; rtLatch(); } return r; };`, 'RT_SRV.roll = RT_SRV.roll0;'],
    ['B', 'карточка из платного ролла считается вдвое', CREDIT('x.t1 >= W.t0 && x.t1 < W.t1', '(S.rituals.hero.concat(S.rituals.work).some(c => c.id === x.card && c.paid) ? 2 : 1) * x.nominal'), 'rtCredit = rtCredit0;'],
    ['C', 'ступень берётся раньше порога', `rtLatch0 = rtLatch; rtLatch = function (s = S) { const W = s.rituals.wk; W.top = Math.max(W.top, Math.min(rtLadRows(s).length, RTE.stepOf(rtLadRows(s).map(x => x.at), rtLoad(s)) + 1)); };`, 'rtLatch = rtLatch0;'],
    ['C', 'лестница экрана — без верхней ступени сундуков', `EnLoot.ladder0 = EnLoot.ladder; EnLoot.ladder = (L, id, c) => EnLoot.ladder0(L, id, c).slice(0, -1);`, 'EnLoot.ladder = EnLoot.ladder0;'],
    ['C', 'взятая ступень не доходит до Недели и «Даров»', `rtSteps0 = rtSteps; rtSteps = function (s = S) { return rtSteps0(s).map((x, i) => Object.assign(x, { reached: i ? false : x.reached })); };`, 'rtSteps = rtSteps0;'],
    ['D', 'новое место посреди недели роняет взятую ступень', `rtSteps1 = rtSteps; rtSteps = function (s = S) { return rtSteps1(s).map(x => Object.assign(x, { reached: rtLoad(s) >= x.need })); };`, 'rtSteps = rtSteps1;'],
    ['D', 'новое место считается за всю неделю, а не с часа, когда открылось', `RTE.capMs0 = RTE.capMs; RTE.capMs = (D0, slots, add, left) => RTE.capMs0(D0, slots, add, add ? RTE.weekMs(D0) : left);`, 'RTE.capMs = RTE.capMs0;'],
    ['D', 'ритуал, досыпавшийся после конца недели, идёт в счёт', CREDIT('x.t1 >= W.t0', 'x.nominal'), 'rtCredit = rtCredit0;'],
    ['D', 'новая неделя расы не сбрасывает счёт', `rtWeekSync0 = rtWeekSync; rtWeekSync = function () { };`, 'rtWeekSync = rtWeekSync0;'],
    ['E', 'обычный стоит на две ступени выше, чем ставят сундуки', () => { D.ladder.step0 = D.ladder.step[3].o; D.ladder.load0 = D.ladder.load[3].o; D.ladder.load[3].o = ats()[ats().length - 1]; D.ladder.step[3].o = ats().length; }, () => { D.ladder.step[3].o = D.ladder.step0; D.ladder.load[3].o = D.ladder.load0; delete D.ladder.step0; delete D.ladder.load0; }],
    ['E', 'ритуалы с сундуками артели — выше потолка дохода', () => { D.ladder.box0 = D.ladder.withBoxBp[6]; D.ladder.withBoxBp[6] = B.TARGET.ladder.withBoxMaxBp + 1; }, () => { D.ladder.withBoxBp[6] = D.ladder.box0; delete D.ladder.box0; }],
  ];
  const apply = f => (typeof f === 'function' ? f() : vm.runInContext(f, P.ctx));
  for (const [k, what, brk, fix] of MUT) {
    try { apply(brk); } catch (x) { say(`мутация «${what}»: не применилась — ${x.message}`); continue; }
    const got = lawRun(k);
    try { apply(fix); } catch (x) { say(`мутация «${what}»: не снялась — ${x.message}`); }
    if (got.length) cnt.mut++; else say(`мутация «${what}»: закон ${k} её не поймал`);
    if (process.argv.includes('--mut')) console.log(`мутация «${what}»: ${got.length ? 'закон ' + k + ' — ' + got.slice(0, 2).join(' | ').slice(0, 300) : 'НЕ ПОЙМАНА'}`);
  }
  for (const k of Object.keys(LAW)) for (const x of lawRun(k)) say(`ступени загрузки, закон ${k} после мутаций: ${x}`);
  reset();
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
      /* ступени загрузки: полоса под карточками — число, засечки всех ступеней, сундук ближайшей; одно действие — лист */
      const strip = (h.match(/<button class="rt-load"[\s\S]*?<\/button>/) || [''])[0];
      if (!strip || !strip.includes('data-v="rtload"') || !strip.includes(`>${loadNow()} %<`)) say(`экран ${tab}: нет полосы «Загрузка недели» с числом загрузки`);
      else if ((strip.match(/<i class="(?:on)?" style="--v:\d+">/g) || []).length !== ats().length || !/class="well itf rt-chest"/.test(strip)) say(`экран ${tab}: в полосе загрузки не все ступени или нет сундука ближайшей`);
      R()[tab].forEach((_, i) => { T.S.overlay = { t: 'ritual', arg: `${tab}:${i}` }; view(P, `лист · ${tab}:${i}${team ? ' · команда' : ''}`); });
    }
    for (const [t, arg] of [['rtart', ''], ['rtslot', '0'], ['rtslot', '1'], ['rtslot', '2'], ['rtload', '']]) {
      T.S.overlay = { t, arg }; const hs = view(P, `лист ${t}:${arg}${team ? ' · команда' : ''}`);
      if (t === 'rtload' && (!/class="rt-lad"/.test(hs) || !/data-v="gifts:me"/.test(hs))) say('лист «Загрузка недели»: нет лестницы ступеней или пути в «Дары»');
    }
    /* окно сбора: итог сразу — нажатие на сцену */
    const k = R().slots.findIndex(s => s.st === 'ready');
    run('сбор · вид', () => T.ACT.rtclaim(`${op()}:${k}`)); view(P, 'окно сбора' + (team ? ' · команда' : ''));
    run('сбор · пропуск', () => T.ACT.rtfx()); const h2 = view(P, 'окно сбора · итог');
    if (!/rt-fx done/.test(h2)) say('окно сбора: нажатие на сцену не показало итог сразу');
    /* закрытый экран */
    reset(); T.S.acc.level = 5; T.S.acc.cycle = 1; T.S.route = 'rituals'; T.S.overlay = null;
    const h3 = view(P, 'закрыто' + (team ? ' · команда' : ''));
    if (!/rt-lock/.test(h3)) say('закрытый экран: нет объяснения, когда откроется');
    if (/class="rt-load"/.test(h3)) say('закрытый экран: показана полоса загрузки');
  }
  run('режим', () => T.setTeam(false));
  /* раздел UI-кита */
  reset();
  for (const team of [false, true]) { T.KH.team = team; const h = run('UI-кит', () => T.rtKitHtml()); if (!h || !/kitRituals/.test(h)) say('UI-кит: нет раздела «Ритуалы и рабочие»'); else scan(P, h, 'UI-кит' + (team ? ' · команда' : '')); }
  T.KH.team = false;
  if (!T.KIT_EXTRA.some(x => x.html === T.rtKitHtml)) say('UI-кит: раздел не зарегистрирован в KIT_EXTRA');
  /* сценарии презентации */
  const flows = T.FLOWS.filter(f => /Ритуал|Рабочие/.test(f[0]));
  if (flows.length < 5 || !flows.some(f => /ступени загрузки/.test(f[0]))) say(`сценариев ритуалов ${flows.length}, ждали 5 — со ступенями загрузки`);
  for (const [t, , f] of flows) { reset(); run('сценарий ' + t, () => f()); view(P, 'сценарий ' + t); }
}

/* ================== 7. Неделя и Убежище ================== */
{
  reset();
  const Rr = R(), cnts = () => ({ ready: Rr.slots.filter(s => s.st === 'ready').length, run: Rr.slots.filter(s => s.st === 'run').length });
  T.S.route = 'week'; T.S.seg.week = 'now'; let h = view(P, 'Неделя');
  /* строка «Ритуалы» — режим реестра WEEK_MODES: загрузка недели и ступени; прежняя строка под режимами — только пока режима нет */
  const W = T.WEEK, m = W ? W.modes().find(x => x.id === MODE) : null;
  if (!m || m.demo) say('Неделя: ритуалы не сообщили режим в реестр WEEK_MODES');
  else {
    const st = W.state(MODE, 'now'), c = cnts(), A = ats(), sum = rs => rs.reduce((a, r) => a + r.groups.reduce((b, g) => b + g.count, 0), 0);
    if (st.lock || st.points !== loadNow() || st.place != null) say(`Неделя: строка «Ритуалы» — ${st.lock || st.points + ' %'}, на экране — ${loadNow()} %; места у ритуалов нет`);
    if (st.planks.length !== A.length || st.planks.some((p, i) => p.need !== A[i])) say('Неделя: ступени строки «Ритуалы» — не ступени загрузки сундуков');
    if (c.ready ? !st.alert || !st.alert.includes(String(c.ready)) : st.alert) say('Неделя: отметка готовых ритуалов не сходится со слотами');
    if (!new RegExp(`<div class="wk-row[^"]*" data-mode="${MODE}"`).test(h)) say('Неделя: нет строки режима «Ритуалы»');
    if ((h.match(/data-a="go" data-v="rituals"/g) || []).length !== 1) say('Неделя: путь в ритуалы — не один: строка режима и прежняя строка вместе');
    T.S.overlay = { t: 'wkmode', arg: MODE + ':now' }; view(P, 'Неделя · лист «Ритуалы»'); T.S.overlay = null;
    /* прошлая неделя — та, за которую платят «Дары»: сундуки сходятся, загрузка — между порогами взятых ступеней */
    const ps = W.state(MODE, 'past'), rows = T.darRows ? T.darRows(T.S, 'prev').filter(p => p.id === MODE) : [], k = rows.filter(p => p.kind === 'plank').length;
    if (ps.lock || sum(ps.rewards) !== sum(rows)) say(`Неделя: прошлая неделя ритуалов — ${ps.lock || sum(ps.rewards) + ' сундуков'}, в «Дарах» — ${sum(rows)}`);
    else if (k && (ps.points < A[k - 1] || (k < A.length && ps.points >= A[k]))) say(`Неделя: прошлая загрузка ${ps.points} % — не между порогами взятых ступеней (${k})`);
    T.S.seg.week = 'past'; view(P, 'Неделя · прошлая'); T.S.overlay = { t: 'wkmode', arg: MODE + ':past' }; view(P, 'Неделя · прошлая · лист «Ритуалы»'); T.S.overlay = null; T.S.seg.week = 'now';
    const lv = T.S.acc.level, cy = T.S.acc.cycle;
    T.S.acc.level = T.RT.rules.open.level - 1; T.S.acc.cycle = T.RT.rules.open.cycle - 1;
    if (!W.state(MODE, 'now').lock) say('Неделя: до открытия ритуалов строка «Ритуалы» не закрыта');
    T.S.acc.level = lv; T.S.acc.cycle = cy;
  }
  T.S.route = 'shelter'; h = view(P, 'Убежище');
  if (!/data-v="rituals"/.test(h)) say('Убежище: нет перехода к ритуалам');
  if (cnts().ready && !/Ритуал готов/.test(h)) say('Убежище: не видно готового ритуала');
}
done();
