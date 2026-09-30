/* Автопроверка отрядов (design/ui/screens/heroes.js): библиотека «Отряды» и общий лист выбора отряда для всех режимов — без браузера.
   1. screens/README.md описывает API листа: SQ.pick, SQ.of, SQ.ready, SQ.ids.
   2. Библиотека (§2.1): создать, назвать, переименовать, удалить — операции с номером: повтор номера ничего не меняет. Имя по умолчанию
      не повторяется, пустое имя — отказ, разметка из имени не проходит. Не больше десяти пресетов, последний не удалить; режимы
      удалённого отряда берут первый оставшийся, Лига и Клановый босс — ждут выбора.
   3. Места: выбрать и поменять местами, поставить героя в выбранное или первое свободное место, заменить, убрать, сдвинуть; в отряде до
      пяти разных героев; повтор номера ничего не меняет.
   4. Режимы — у каждого свой сохранённый выбор: спуск (S.prepSquad), Эхо (S.echoSquad), оборона Арены, Лига — три отряда, Клановый
      босс. Готовность по правилам режима: Эхо — ровно пять свободных; спуск и Клановый босс — идут свободные; Арена и Лига — встают
      и занятые; Лига — герой не повторяется.
   5. Связка с режимами: «Начать забег» и рунный страж идут отрядом спуска, атака Эхо — отрядом Эхо.
   6. Купленный герой состава встаёт в отряд и идёт в бой: забег и атака Эхо собирают его источник боя.
   7. Из листа режима — в библиотеку и обратно: «Изменить», «Новый», «Выбрать» возвращают в режим с листом.
   7а. Коллекция и отряды — одни герои: сетка «Мои» (книги героев) — ровно пул отрядов; купленный приходит в обе; на полке отряда —
      книги размера m, а не крупные книги сетки; свободные — корешками на нижней полке.
   8. Режим «Игрок»: библиотека, лист выбора на всех режимах, окно имени и подтверждение удаления — без служебных слов, undefined и NaN;
      режим «Команда» рисуется.
   9. «Библиотека Этриона» — отряды шкафом (слово автора 30.09.2026: «в отрядах панель слева — это буквально огромный шкаф, а то, где
      показан отряд, — это по сути полка»): слева — шкаф, отряд — отсек с пятью корешками (пустое место — след) и латунной табличкой
      имени и мощи (BM.squad) на кромке полки, выбранный отмечен; справа — выбранный отряд на одной полке крупным планом: пять мест,
      книги размера m, доска полки; нижняя полка — свободные герои корешками по мощи: цвет редкости, ступень книги, значок класса,
      мощь коротко (hbPow сверен с независимым правилом: 940, 7,4К, 75К, 1,2М); нажатие — операция с номером ставит героя в выбранное
      или первое пустое место, книга встаёт на место (показ по времени). Удержание (по часам песочницы; слово автора 30.09.2026:
      «показывать боевую мощь условно при удержании… вижу это в виде тултипа, но… через телефон») — сведения над полкой, не книга:
      мелкая книга, имя, редкость, класс, стихия, мощь, уровень, доблесть, пределы и «Книга героя»; отпустил — закрылись, отпустил
      в сведениях — остались, на «Книге героя» — книга раскрывается поверх отрядов; щелчок после удержания героя не ставит, сдвиг —
      не нажатие; правая кнопка — сразу закреплённые сведения; нажатие мимо и Esc — закрывают; героя поставили — закрыты; закрытие
      книги — к отрядам; «Выбрать» из листа режима — под шкафом, полка отряда высоты не теряет.
      Вёрстка расчётом на 932 × 430 и 844 × 390: видно не меньше трёх отсеков, книга на полке отряда не меньше 64 px, на нижней
      полке видно не меньше 12 корешков, корешки отсека помещаются рядом со строкой режимов.
   Запуск: node tools/content-gen/screens/check_squads.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, ops: 0, runs: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Отряды: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; операций ${cnt.ops}, забегов и атак ${cnt.runs}.`);
  for (const x of cnt.lay || []) console.log('вёрстка ' + x);
  console.log('Проверка пройдена: библиотека до десяти отрядов с именами, места до пяти героев, один лист выбора на все режимы со своим выбором у каждого, связка со спуском и Эхо, повтор номера ничего не меняет; отряды — шкаф: отсеки с корешками и табличкой имени и мощи, полка отряда крупным планом, нижняя полка корешков с мощью — нажатие ставит героя, удержание — сведения над полкой, из них — книга; вёрстка 932 × 430 и 844 × 390; в режиме «Игрок» служебного нет.');
  process.exit(0);
}

/* ================== 1. описание API ================== */
{
  const md = read('screens/README.md');
  for (const k of ['SQ.pick', 'SQ.of', 'SQ.ready', 'SQ.ids']) if (!md.includes(k)) say(`screens/README.md: нет описания ${k}`);
}

/* ================== песочница ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
/* часы песочницы: setTimeout — в очередь, tick(мс) двигает время и выполняет наступившие; слушатели документа — для долгого нажатия */
const clock = { now: 0, q: [], id: 0 }, dlis = {};
let pointAt = null;   // что под пальцем в точке (document.elementFromPoint): отпускание над подсказкой корешка
function tick(ms) {
  const end = clock.now + ms;
  for (;;) {
    clock.q.sort((a, b) => a.at - b.at || a.id - b.id);
    const t = clock.q[0]; if (!t || t.at > end) break;
    clock.q.shift(); clock.now = t.at;
    try { t.f(); } catch (e) { say(`таймер: исключение — ${e.message}`); }
  }
  clock.now = end;
}
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
  const document = { readyState: 'loading', addEventListener: (t, f) => { (dlis[t] = dlis[t] || []).push(f); }, getElementById: id => (els[id] = els[id] || stubEl(id)),
    elementFromPoint: (x, y) => (pointAt ? pointAt(x, y) : null),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setInterval: () => 0, clearInterval() {},
    setTimeout: (f, ms) => { const id = ++clock.id; clock.q.push({ id, at: clock.now + Math.max(0, +ms || 0), f }); return id; }, clearTimeout: id => { clock.q = clock.q.filter(t => t.id !== id); },
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => clock.now } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, FLOWS, KH, RS, RSI, EB, H, SQ, SQ_DATA, render, initialState, setTeam, startRun, advance, busyNote, rsHas, sq, sqBM,
    LB_VIEW, HC_VIEW, HB_ART, BM, fmt, hrMine, hrV, hbTier, hbSpineR, lbCols, SHELL_SIZE, hbPow, SQ_PEEK: typeof SQ_PEEK !== 'undefined' ? SQ_PEEK : null,
  })`, ctx);
  return { T, els, game: () => (els.game ? els.game.innerHTML : '') };
}
const P = load(), T = P.T;
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
const fresh = () => { T.S = T.initialState(); T.S.overlay = null; };
const op = () => 'q' + T.S.sq.seq;
const act = (a, v, where) => { cnt.ops++; return run(where || `${a} ${v}`, () => T.ACT[a](v)); };
const members = id => JSON.stringify(T.sq(id).m);
const names = () => T.S.squads.map(s => s.name);
const buy = () => {   // купить героя за золото цикла II: он приходит в коллекцию
  const x = T.RS.heroes.find(h => h.src === 'gold' && h.c === 2 && !T.rsHas(h));
  T.S.acc.cycle = 2; T.S.wallet.gold = 1e9; act('gbuy', x.id); act('gbuydo', x.id);
  if (!T.H(x.id)) say(`найм ${x.n}: героя нет среди героев аккаунта`);
  return x;
};

/* ================== 2. библиотека ================== */
fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'squads';
{
  const n0 = T.S.squads.length, o = op();
  act('sqnew', o);
  const s = T.S.squads[T.S.squads.length - 1];
  if (T.S.squads.length !== n0 + 1) say('новый отряд: не создан');
  if (!T.S.overlay || T.S.overlay.t !== 'sqname' || T.S.overlay.arg !== s.id) say('новый отряд: не открылось окно имени');
  if (T.S.selSquad !== s.id) say('новый отряд: не выбран в библиотеке');
  if (new Set(names()).size !== names().length) say('новый отряд: имя по умолчанию повторяет другое');
  if (s.m.length !== T.SQ_DATA.size || s.m.some(Boolean)) say('новый отряд: не пять пустых мест');
  view('библиотека · окно имени');
  act('sqnew', o); if (T.S.squads.length !== n0 + 1) say('новый отряд: повтор номера создал ещё один');
  /* имя */
  P.els.sqName = Object.assign(P.els.sqName || {}, { value: '   Разведка    боем  ' });
  const ro = op(); act('sqrendo', `${ro}|${s.id}`);
  if (s.name !== 'Разведка боем') say(`имя отряда: «${s.name}» — ждали «Разведка боем»`);
  if (T.S.overlay) say('имя отряда: окно не закрылось после сохранения');
  P.els.sqName.value = 'Другое'; act('sqrendo', `${ro}|${s.id}`);
  if (s.name !== 'Разведка боем') say('имя отряда: повтор номера переименовал ещё раз');
  T.S.overlay = { t: 'sqname', arg: s.id }; P.els.sqName.value = '    ';
  act('sqrendo', `${op()}|${s.id}`);
  if (s.name !== 'Разведка боем' || !T.S.overlay) say('имя отряда: пустое имя принято или окно закрылось');
  P.els.sqName.value = '<b>Тень</b>"' + 'я'.repeat(40);
  act('sqrendo', `${op()}|${s.id}`);
  if (/[<>]/.test(s.name) || s.name.length > T.SQ_DATA.nameMax) say(`имя отряда: разметка или длина прошли — «${s.name}»`);
  T.S.overlay = null;
  const h = view('библиотека · имя с кавычкой');
  if (h.includes('<b>Тень') || !h.includes('&quot;')) say('имя отряда: в разметке не экранировано');
  /* до десяти */
  while (T.S.squads.length < T.SQ_DATA.max) { const k = T.S.squads.length; act('sqnew', op()); T.S.overlay = null; if (T.S.squads.length !== k + 1) { say('новый отряд: не создан до десяти'); break; } }
  act('sqnew', op()); T.S.overlay = null;
  if (T.S.squads.length !== T.SQ_DATA.max) say(`библиотека: отрядов ${T.S.squads.length} — больше ${T.SQ_DATA.max}`);
  if (new Set(names()).size !== names().length) say('библиотека: имена по умолчанию повторяются');
  if (!/data-a="sqnew" data-v="[^"]*" disabled/.test(view('библиотека · полна'))) say('библиотека: «Новый отряд» не выключен на десяти');
  /* удаление: режим отряда берёт первый оставшийся */
  const del = T.S.squads.find(x => x.id === 's2');
  T.S.echoSquad = 's2'; T.SQ.set('arena', 's2'); T.SQ.set('clan', 's2'); T.SQ.set('league', 's2', 1);
  act('sqdel', 's2');
  if (!T.S.overlay || T.S.overlay.t !== 'confirm' || T.S.overlay.act !== 'sqdeldo') say('удаление: нет подтверждения');
  else {
    const o2 = ovOf(view('удаление · подтверждение'));
    if (!o2.includes('Эхо') || !o2.includes('Оборона Арены')) say('удаление: подтверждение не говорит, где выбран отряд');
    const v = T.S.overlay.v; act('sqdeldo', v);
    if (T.S.squads.includes(del)) say('удаление: отряд остался');
    const first = T.S.squads[0].id;
    if (T.S.echoSquad !== first || T.SQ.of('arena') !== first) say('удаление: Эхо и оборона не взяли первый оставшийся отряд');
    if (T.SQ.of('clan') !== null || T.SQ.of('league')[1] !== null) say('удаление: Клановый босс и Лига не ждут выбора');
    const n = T.S.squads.length; act('sqdeldo', v); if (T.S.squads.length !== n) say('удаление: повтор номера удалил ещё');
  }
  while (T.S.squads.length > 1) { const x = T.S.squads[T.S.squads.length - 1]; act('sqdeldo', `${op()}|${x.id}`); }
  act('sqdel', T.S.squads[0].id); act('sqdeldo', `${op()}|${T.S.squads[0].id}`);
  if (T.S.squads.length !== 1) say('удаление: удалён последний отряд');
  if (T.sq(T.S.prepSquad) !== T.S.squads[0] || T.sq(T.S.echoSquad) !== T.S.squads[0]) say('удаление: спуск или Эхо остались без отряда');
  view('библиотека · один отряд');
}

/* ================== 3. места ================== */
fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'squads'; T.S.selSquad = 's2';
{
  const s = T.sq('s2'), uniq = () => { const a = s.m.filter(Boolean); if (new Set(a).size !== a.length) say(`места: в отряде повтор — ${JSON.stringify(s.m)}`); };
  const e = s.m.indexOf(null), f = s.m.findIndex(Boolean), hf = s.m[f];
  act('sqslot', `${op()}|${f}`); if (T.S.sq.slot !== f) say('места: место не выбралось');
  view('места · выбрано место');
  const o = op(); act('sqslot', `${o}|${e}`);
  if (s.m[e] !== hf || s.m[f] !== null || T.S.sq.slot !== -1) say(`места: не поменялись местами — ${JSON.stringify(s.m)}`);
  const m1 = members('s2'); act('sqslot', `${o}|${f}`); act('sqslot', `${o}|${e}`); if (members('s2') !== m1) say('места: повтор номера поменял ещё раз');
  T.S.sq.slot = -1;
  const x = buy(), before = s.m.filter(Boolean).length;
  act('sqput', `${op()}|s2|${x.id}`);
  if (s.m.filter(Boolean).length !== before + 1 || !s.m.includes(x.id)) say('места: купленный герой не встал в свободное место');
  uniq();
  const full = members('s2'); act('sqput', `${op()}|s2|${T.S.heroes.find(h => !s.m.includes(h.id)) ? T.S.heroes.find(h => !s.m.includes(h.id)).id : 'h1'}`);
  if (members('s2') !== full) say('места: полный отряд принял шестого');
  const out = s.m[1]; T.S.sq.slot = 1;
  const y = T.S.heroes.find(h => !s.m.includes(h.id)) || null;
  if (y) { act('sqput', `${op()}|s2|${y.id}`); if (s.m[1] !== y.id || s.m.includes(out)) say('места: выбранное место не заменило героя'); }
  uniq();
  const hx = s.m[3]; act('sqput', `${op()}|s2|${hx}`);   // уже в отряде: ставится в выбранное или первое свободное — без повтора
  uniq();
  act('sqrem', `${op()}|s2|1`); if (s.m[1] !== null) say('места: герой не убран');
  const a = s.m[2]; act('sqmv', `${op()}|s2|2|-1`); if (s.m[1] !== a || s.m[2] !== null || T.S.sq.slot !== 1) say('места: не сдвинулся влево');
  const m2 = members('s2'), o3 = op(); act('sqmv', `${o3}|s2|1|1`); act('sqmv', `${o3}|s2|2|-1`);
  if (members('s2') === m2) say('места: сдвиг вправо не сработал'); else { const m3 = members('s2'); act('sqmv', `${o3}|s2|1|1`); if (members('s2') !== m3) say('места: повтор номера сдвинул ещё раз'); }
  uniq();
  view('места · после правок');
}

/* ================== 4. режимы ================== */
fresh();
{
  const S0 = { descent: T.SQ.of('descent'), echo: T.SQ.of('echo'), arena: T.SQ.of('arena'), league: JSON.stringify(T.SQ.of('league')), clan: T.SQ.of('clan') };
  if (S0.descent !== 's1' || S0.echo !== 's1' || S0.arena !== 's1' || S0.league !== JSON.stringify(T.SQ_DATA.demo.league) || S0.clan !== null) say(`режимы: выбор по умолчанию ${JSON.stringify(S0)}`);
  /* Лига демо открыта (ADR-0031, п. 17): три отряда выбраны и готовы — пятнадцать разных героев */
  const L0 = T.SQ.ready('league'); if (!L0.ok) say(`Лига: отряды демо не готовы — ${L0.why || JSON.stringify(L0.dup)}`);
  T.S.route = 'clan'; T.S.seg.clan = 'boss';
  run('лист клана', () => T.SQ.pick('clan'));
  if (!T.S.overlay || T.S.overlay.t !== 'prep' || T.S.overlay.arg !== 'clan' || T.S.overlay.back !== 'clan') say('SQ.pick: лист не открылся над экраном режима');
  if (!ovOf(view('лист · Клановый босс')).includes('Отряд на Кланового босса')) say('лист · Клановый босс: нет заголовка режима');
  act('sqpick', `${op()}|clan|s3`);
  if (T.SQ.of('clan') !== 's3' || T.SQ.of('echo') !== 's1' || T.SQ.of('descent') !== 's1' || T.SQ.of('arena') !== 's1') say('режимы: выбор Кланового босса тронул другие режимы');
  act('sqpick', `${op()}|echo|s2`);
  if (T.S.echoSquad !== 's2' || T.SQ.of('clan') !== 's3') say('режимы: выбор Эхо не записан в S.echoSquad или тронул Клановый босс');
  const re = T.SQ.ready('echo');
  if (re.ok || re.why !== '4 из 5') say(`Эхо: неполный отряд готов или причина не та — ${re.why}`);
  act('sqpick', `${op()}|echo|s1`);
  /* Лига: три раунда, герой не повторяется — выбор с нуля */
  for (let i = 0; i < 3; i++) T.SQ.set('league', null, i);
  T.S.route = 'arena'; T.S.seg.arena = 'league';
  run('лист Лиги', () => T.SQ.pick('league'));
  act('sqround', '1'); act('sqpick', `${op()}|league|s1|1`);
  if (JSON.stringify(T.SQ.of('league')) !== JSON.stringify([null, 's1', null])) say(`Лига: раунд II — ${JSON.stringify(T.SQ.of('league'))}`);
  if (T.S.sq.round !== 0) say('Лига: после выбора лист не перешёл к пустому раунду');
  act('sqpick', `${op()}|league|s2|0`);
  const L = T.SQ.ready('league');
  if (L.ok || !L.dup.length || L.need !== 15) say('Лига: повтор героев между раундами не замечен');
  if (!ovOf(view('лист · Лига')).includes('Герой не повторяется') && !ovOf(view('лист · Лига')).includes('разных героев')) say('лист · Лига: нет причины неготовности');
  /* занятые: забег отрядом «Авангард» — его герои заняты */
  fresh(); run('забег', () => T.startRun('s4', 'b1')); cnt.runs++;
  const busy = T.sq('s4').m.filter(Boolean);
  if (!busy.every(id => T.busyNote(id))) say('занятость: герои забега не заняты');
  const e = T.SQ.ready('echo', 's1'), d = T.SQ.ready('descent', 's1'), a = T.SQ.ready('arena', 's1'), c = T.SQ.ready('clan', 's1');
  if (e.ok || !/занят/.test(e.why)) say(`Эхо: занятые не остановили — ${e.why}`);
  if (!d.ok || d.go.length !== 5 - busy.length || d.go.some(id => busy.includes(id))) say('спуск: должны идти только свободные');
  if (!a.ok || a.go.length !== 5) say('Арена: занятые должны вставать');
  if (!c.ok || c.go.length !== 5 - busy.length) say('Клановый босс: должны идти свободные');
  T.S.route = 'descent'; T.S.overlay = { t: 'prep', arg: '' };
  if (!/отряд пойдёт вдвоём/.test(ovOf(view('лист спуска · занятые')))) say('лист спуска: не сказано, что отряд пойдёт без занятых');
  T.S.overlay = { t: 'prep', arg: 'echo' };
  if (!/Заняты:/.test(ovOf(view('лист Эхо · занятые')))) say('лист Эхо: не сказано, кто занят');
}

/* ================== 5. связка с режимами ================== */
fresh();
{
  act('sqpick', `${op()}|descent|s5`);
  T.S.route = 'descent'; T.S.overlay = { t: 'prep', arg: '' }; view('лист спуска');
  run('начать забег', () => T.ACT.start()); cnt.runs++;
  const R = T.S.runs[T.S.runs.length - 1];
  if (!R || R.squadId !== 's5' || JSON.stringify(R.squad) !== JSON.stringify(T.sq('s5').m.filter(Boolean))) say('спуск: забег пошёл не отрядом спуска');
  fresh(); act('sqpick', `${op()}|descent|s4`); T.S.route = 'descent';
  run('рунный страж', () => T.ACT.guard('demo')); cnt.runs++;
  const G = T.S.runs[T.S.runs.length - 1];
  if (!G || !G.guard || G.squadId !== 's4') say('рунный страж: не отрядом спуска');
  fresh(); act('sqpick', `${op()}|echo|s1`); T.S.route = 'echo'; view('Эхо');
  run('атака Эхо', () => T.ACT.echatk()); cnt.runs++;
  const E = T.S.runs.find(r => r.kind === 'echo');
  const ids = E ? E.heroes.map(h => h.id).sort() : [];
  if (!E || JSON.stringify(ids) !== JSON.stringify(T.sq('s1').m.filter(Boolean).slice().sort())) say(`Эхо: атака не отрядом Эхо — ${JSON.stringify(ids)}`);
}

/* ================== 6. купленный герой в отряде и в бою ================== */
fresh();
{
  const x = buy();
  T.S.route = 'heroes'; T.S.seg.heroes = 'squads';
  act('sqnew', op()); T.S.overlay = null;
  const s = T.S.squads[T.S.squads.length - 1];
  for (const id of [x.id, 'h1', 'h2', 'h3', 'h4']) act('sqput', `${op()}|${s.id}|${id}`);
  if (s.m.filter(Boolean).length !== 5 || !s.m.includes(x.id)) say(`купленный в отряде: состав ${JSON.stringify(s.m)}`);
  if (T.sqBM(s) !== s.m.reduce((acc, id) => acc + T.H(id).bm, 0)) say('купленный в отряде: мощь отряда не сходится');
  view('библиотека · с купленным');
  act('sqpick', `${op()}|descent|${s.id}`);
  run('забег с купленным', () => T.ACT.start()); cnt.runs++;
  const R = T.S.runs[T.S.runs.length - 1];
  if (!R || !R.squad.includes(x.id) || !R.heroes.some(h => h.id === x.id && h.name === x.n)) say('купленный в бою: нет его в забеге');
  else { T.S.route = 'descent'; for (let n = 0; n < 30 && !R.over; n++) run('забег · ход', () => T.advance(R, 2000)); T.S.route = 'battle'; T.S.focus = R.id; view('бой с купленным'); }
  fresh(); const y = buy();
  T.S.route = 'heroes'; T.S.seg.heroes = 'squads'; act('sqnew', op()); T.S.overlay = null;
  const s2 = T.S.squads[T.S.squads.length - 1];
  for (const id of [y.id, 'h1', 'h2', 'h3', 'h5']) act('sqput', `${op()}|${s2.id}|${id}`);
  act('sqpick', `${op()}|echo|${s2.id}`); T.S.route = 'echo';
  run('атака Эхо с купленным', () => T.ACT.echatk()); cnt.runs++;
  const E = T.S.runs.find(r => r.kind === 'echo');
  if (!E || !E.heroes.some(h => h.id === y.id)) say('купленный в Эхо: нет его в атаке');
  else { T.S.route = 'battle'; T.S.focus = E.id; view('бой Эхо с купленным'); }
}

/* ================== 7. из листа режима — в библиотеку и обратно ================== */
fresh();
{
  T.S.route = 'echo'; run('лист Эхо', () => T.SQ.pick('echo'));
  act('sqedit', 'echo|s2');
  if (T.S.route !== 'heroes' || T.S.seg.heroes !== 'squads' || T.S.selSquad !== 's2' || !T.S.sq.from || T.S.sq.from.mode !== 'echo' || T.S.sq.from.back !== 'echo') say('«Изменить»: не открыл библиотеку с возвратом в Эхо');
  const h = view('библиотека · выбор для Эхо');
  if (!h.includes('Выбор для режима «Эхо»')) say('библиотека: нет строки выбора для режима');
  act('sqpick', `${op()}|echo|s2|0`);
  if (T.S.echoSquad !== 's2' || T.S.route !== 'echo' || !T.S.overlay || T.S.overlay.t !== 'prep' || T.S.overlay.arg !== 'echo' || T.S.sq.from) say('«Выбрать»: не вернул в Эхо с листом');
  view('Эхо · лист после выбора');
  T.S.route = 'arena'; T.S.seg.arena = 'def'; run('лист обороны', () => T.SQ.pick('arena'));
  const n = T.S.squads.length; act('sqnew', `${op()}|arena`);
  if (T.S.squads.length !== n + 1 || T.S.route !== 'heroes' || !T.S.sq.from || T.S.sq.from.mode !== 'arena' || T.S.sq.from.back !== 'arena' || !T.S.overlay || T.S.overlay.t !== 'sqname') say('«Новый» из листа: не создал отряд с возвратом в оборону');
  T.S.overlay = null; act('sqback', '');
  if (T.S.route !== 'arena' || !T.S.overlay || T.S.overlay.arg !== 'arena') say('«Назад»: не вернул в оборону с листом');
  view('оборона · лист');
}

/* ================== 7а. коллекция и отряды — одни герои ==================
   Сетка «Мои» (книги героев, screens/heroes.js и screens/book.js) — ровно те герои, из которых собирают отряды (SQ.pool); купленный за
   золото сразу и в сетке, и в пуле библиотеки; книга героя раскрывается из сетки, а в редакторе отряда — мелкие книги */
{
  fresh();
  const cards = () => { T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'own'; T.S.overlay = null; const h = view('коллекция · мои'); return [...h.matchAll(/<button class="hb[ "][^>]*data-z="l"[^>]*data-v="([^"]+)"/g)].map(m => m[1]); };
  const same = (a, b) => a.slice().sort().join() === b.slice().sort().join();
  if (!same(cards(), T.SQ.pool())) say(`коллекция и отряды: в сетке «Мои» ${cards().length} героев, в пуле отрядов ${T.SQ.pool().length} — не одни и те же`);
  const x = T.RS.heroes.find(h => h.src === 'gold' && h.c === 2 && !T.rsHas(h));
  T.S.acc.cycle = 2; run('найм', () => { T.ACT.gbuy(x.id); T.ACT.gbuydo(x.id); });
  if (!cards().includes(x.id) || !T.SQ.pool().includes(x.id)) say('коллекция и отряды: купленный герой не пришёл в сетку «Мои» или в пул отрядов');
  T.S.route = 'heroes'; T.S.seg.heroes = 'squads'; T.S.selSquad = 's1';
  const g = view('отряды · редактор');
  if (/<button class="hb[^"]*" data-z="l"/.test(g)) say('отряды: на полке отряда крупные книги сетки вместо книг размера m');
  if (!(g.match(/<button class="hb[^"]*" data-z="m"/g) || []).length) say('отряды: на полке отряда нет книг героев размера m');
  const free = T.SQ.pool().filter(id => !T.sq('s1').m.includes(id));
  if ((g.match(/<button class="hs"[^>]*data-a="sqput"/g) || []).length !== free.length) say(`отряды: на нижней полке не ${free.length} корешков свободных героев`);
  if (!free.includes(x.id) || !new RegExp(`<button class="hs"[^>]*data-id="${x.id}"`).test(g)) say('отряды: купленный герой не встал корешком на нижнюю полку');
}

/* ================== 9. «Библиотека Этриона»: шкаф отрядов, полка отряда, нижняя полка корешков ================== */
{
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'squads'; T.S.selSquad = 's2'; T.S.sq.slot = -1;
  const V = T.LB_VIEW, Q = V.sq, h = view('шкаф отрядов'), s = T.sq('s2');
  const part = (a, b) => { const i = h.indexOf(a); if (i < 0) return ''; const j = b ? h.indexOf(b, i) : -1; return j < 0 ? h.slice(i) : h.slice(i, j); };
  /* слева — шкаф: отсек на каждый отряд, пять мест — корешок или след, табличка имени и мощи, где выбран — строкой */
  const left = part('<div class="lb-case tall"', '<div class="lb-case near"');
  if (!left) say('шкаф отрядов: слева нет шкафа');
  if (!/<div class="lb-top"><i class="lb-cn"/.test(left) || !left.includes(`Отряды · ${T.S.squads.length} / ${T.SQ_DATA.max}`)) say('шкаф отрядов: на карнизе нет «Отряды · N / 10»');
  if (!/data-a="sqnew"/.test(left)) say('шкаф отрядов: на карнизе нет «Новый отряд»');
  for (const k of ['<i class="lb-post l"', '<i class="lb-post r"', '<i class="lb-glow"', '<span class="lb-dust"']) if (!left.includes(k)) say(`шкаф отрядов: нет части шкафа ${k}`);
  const cmps = [...left.matchAll(/<button class="lb-cmp" data-a="sq" data-v="([^"]+)" aria-current="(true|false)"[\s\S]*?<\/button>/g)];
  if (cmps.length !== T.S.squads.length) say(`шкаф отрядов: отсеков ${cmps.length}, отрядов ${T.S.squads.length}`);
  for (const [c, id, cur] of cmps) {
    const x = T.sq(id), where = `отсек «${x.name}»`;
    const spines = [...c.matchAll(/<span class="hs[^"]*" data-z="s" data-t="(\d)" data-r="(\d)" data-s="3" data-id="([^"]+)"/g)], gaps = (c.match(/<i class="lb-gap"/g) || []).length;
    if (spines.length + gaps !== T.SQ_DATA.size || spines.length !== x.m.filter(Boolean).length) say(`${where}: мест ${spines.length + gaps} (корешков ${spines.length}), в отряде ${x.m.filter(Boolean).length} из ${T.SQ_DATA.size}`);
    spines.forEach(([, t, r, hid], i) => { const hh = T.H(hid); if (!hh || x.m.filter(Boolean)[i] !== hid || +r !== hh.r || +t !== T.hbTier(hh)) say(`${where}: корешок ${i + 1} — не ${x.m.filter(Boolean)[i]} своей ступени и редкости`); });
    if (!/<i class="lb-pl" aria-hidden="true"><i class="lb-br l"><\/i><i class="lb-br r"><\/i><\/i>/.test(c)) say(`${where}: нет полки с кронштейнами`);
    if (!c.includes(`<span class="lb-tag w"><b>${x.name.replace(/"/g, '&quot;')}</b>`) || !c.includes(`<span class="num">${T.fmt(T.sqBM(x))}</span>`)) say(`${where}: на табличке нет имени или мощи ${T.sqBM(x)}`);
    if ((cur === 'true') !== (id === s.id)) say(`${where}: отметка выбранного не у выбранного`);
    const used = T.SQ.used(id); if (used.length && !c.includes(`<small class="lb-used">${used.join(' · ')}</small>`)) say(`${where}: не сказано, где выбран`);
  }
  /* справа — отряд на полке крупным планом: пять мест, книги размера m, доска; на карнизе — имя, мощь, переименовать, удалить */
  const right = part('<div class="lb-case near"');
  if (!right) say('шкаф отрядов: справа нет полки отряда');
  if (!right.includes(`<h2 class="serif gold">${s.name}</h2>`) || !right.includes(`<span class="num">${T.fmt(T.sqBM(s))}</span>`) || !right.includes(`data-v="sqname:${s.id}"`) || !right.includes(`data-a="sqdel" data-v="${s.id}"`)) say('полка отряда: на карнизе нет имени, мощи, «Переименовать» или «Удалить»');
  const stage = part('<div class="lb-stage">', '<div class="lb-low">');
  const slots = [...stage.matchAll(/<(?:div|button) class="lb-slot( empty)?[^"]*"/g)];
  if (slots.length !== T.SQ_DATA.size) say(`полка отряда: мест ${slots.length}, ждали ${T.SQ_DATA.size}`);
  s.m.forEach((id, i) => {
    if (!id) { if (!stage.includes(`<button class="lb-slot empty" data-a="sqslot" data-v="q${T.S.sq.seq}|${i}"`)) say(`полка отряда: пустое место ${i + 1} не нажимается`); return; }
    if (!new RegExp(`<div class="lb-slot" data-hold="sqbook:${id}"><button class="hb[^"]*" data-z="m"[^>]*data-a="sqslot" data-v="q${T.S.sq.seq}\\|${i}"`).test(stage)) say(`полка отряда: на месте ${i + 1} нет книги ${id} размера m с нажатием и удержанием`);
  });
  if (!/<i class="lb-pl near" aria-hidden="true">/.test(stage)) say('полка отряда: нет доски полки');
  /* нижняя полка — свободные корешками по мощи: ступень, редкость, класс, мощь коротко; нажатие — операция с номером, удержание — сведения.
     Короткая мощь — независимым правилом: до тысячи — как есть; дальше тысячи «К» или миллионы «М», десятые — только до десяти, без «,0» */
  const low = part('<div class="lb-low">');
  const pool = T.hrMine().filter(x => !s.m.includes(x.id)).sort((a, b) => b.bm - a.bm);
  const short = n => { if (n < 1000) return String(n); const [d, u] = n >= 1e6 ? [1e6, 'М'] : [1e3, 'К'], w = Math.floor(n / d), r = Math.floor((n % d) * 10 / d); return w < 10 && r ? `${w},${r}${u}` : `${w}${u}`; };
  for (const [n, want] of [[0, '0'], [940, '940'], [999, '999'], [1000, '1К'], [7420, '7,4К'], [7000, '7К'], [9990, '9,9К'], [75080, '75К'], [128400, '128К'], [999999, '999К'], [1234000, '1,2М'], [12345678, '12М']])
    if (T.hbPow(n) !== want || short(n) !== want) say(`мощь на корешке: ${n} → «${T.hbPow(n)}», ждали «${want}»`);
  const sp = [...low.matchAll(/<button class="hs[^"]*" data-z="l" data-t="(\d)" data-r="(\d)" data-s="3" data-id="([^"]+)" style="--sr:(\d+)" data-a="sqput" data-v="([^"]+)" data-peek="([^"]+)"[\s\S]*?<\/button>/g)];
  if (sp.map(m => m[3]).join() !== pool.map(x => x.id).join()) say(`нижняя полка: корешки ${sp.map(m => m[3]).slice(0, 4).join(', ')}… — не свободные герои по мощи (${pool.length})`);
  for (const [t, tier, r, id, sr, v, peek] of sp) {
    const x = T.H(id), where = `нижняя полка · ${x.name}`;
    if (+tier !== T.hbTier(x) || +r !== x.r || +sr !== T.hbSpineR(+tier)) say(`${where}: корешок не своей ступени, редкости или толщины`);
    if (v !== `q${T.S.sq.seq}|${s.id}|${id}` || peek !== id) say(`${where}: нажатие не операция с номером или удержание не сведения героя`);
    if (!/icons\/cls-[a-z]+\.png/.test(t) || !t.includes(`<b class="hs-p num" aria-hidden="true">${short(x.bm)}</b>`) || !t.includes('<i class="hs-cr" aria-hidden="true"></i>') || !/<span class="hs-l" aria-hidden="true"><b>[^<]+<\/b><\/span>/.test(t)) say(`${where}: на корешке нет класса, мощи ${short(x.bm)}, кристалла редкости или ярлыка с именем`);
    if (/ data-hold=| title="/.test(t)) say(`${where}: у корешка осталась книга по удержанию или подпись браузера поверх своей подсказки`);
  }
  if (!low.includes('удержание — сведения')) say('нижняя полка: строка подсказки не говорит, что удержание — сведения');
  if (!/<i class="lb-pl" aria-hidden="true">/.test(low) || !/data-keep="sqpool"/.test(low)) say('нижняя полка: нет доски или прокрутка не помнит положение');
  /* нажатие на корешок: герой — в первое пустое место (операция с номером), книга встаёт на место — показ по времени */
  const e = s.m.indexOf(null), hid = pool[0].id, op0 = T.S.sq.seq;
  act('sqput', `q${op0}|${s.id}|${hid}`);
  if (s.m[e] !== hid || T.S.sq.seq !== op0 + 1) say('нижняя полка: нажатие на корешок не поставило героя в первое пустое место');
  if (!T.S.lb || !T.S.lb.rise || T.S.lb.rise.i !== e || T.S.lb.rise.hid !== hid) say('нижняя полка: нет показа — книга не встаёт на место');
  let g = view('нижняя полка · книга встаёт');
  if (!new RegExp(`<div class="lb-slot rise" data-hold="sqbook:${hid}" style="--lb-d:-?\\d+ms">`).test(g)) say('полка отряда: книга с нижней полки не встаёт на место (нет показа у места)');
  tick(V.rise + 1); g = view('нижняя полка · книга встала');
  if (/class="lb-slot rise"/.test(g)) say('полка отряда: показ не закончился в срок');
  const m1 = JSON.stringify(s.m); act('sqput', `q${op0}|${s.id}|${pool[1].id}`); if (JSON.stringify(s.m) !== m1) say('нижняя полка: повтор номера поставил героя ещё раз');
  /* выбранное место: нажатие на корешок — в него */
  act('sqslot', `q${T.S.sq.seq}|1`); const was = s.m[1], nx = T.hrMine().find(x => !s.m.includes(x.id));
  act('sqput', `q${T.S.sq.seq}|${s.id}|${nx.id}`); if (s.m[1] !== nx.id || s.m.includes(was)) say('нижняя полка: герой не встал в выбранное место');
  /* удержание корешка — по часам песочницы: pointerdown, hold мс — сведения над полкой (подсказка), не книга; отпустил — закрылись;
     щелчок после удержания героя не ставит; сдвиг — прокрутка, не нажатие; отпустил в сведениях — остались; на «Книге героя» — книга */
  const fire = (k, ev) => { for (const f of dlis[k] || []) f(ev); };
  const el = id => ({ getAttribute: a => (a === 'data-peek' ? id : null), isConnected: true, disabled: false, classList: { contains: c => c === 'hs' }, querySelector: () => null, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) });
  const ev = (t, o = {}) => Object.assign({ target: { closest: q => (q === '[data-peek]' ? t : null) }, button: 0, pointerId: 1, clientX: 40, clientY: 300, pd: 0, sp: 0, preventDefault() { this.pd++; }, stopPropagation() { this.sp++; } }, o);
  const peekOf = () => T.S.sq.peek ? `${T.S.sq.peek.id}${T.S.sq.peek.pin ? ' · закреплены' : ''}` : 'нет';
  if (!(dlis.pointerdown || []).length || !(dlis.pointerup || []).length || !(dlis.click || []).length || !(dlis.contextmenu || []).length) say('удержание: нет слушателей pointerdown, pointerup, click и contextmenu');
  if (!T.SQ_PEEK || ![T.SQ_PEEK.gap, T.SQ_PEEK.edge, T.SQ_PEEK.tip].every(n => Number.isInteger(n) && n > 0)) say('сведения корешка: нет целых чисел места SQ_PEEK (над корешком, от края, хвостик)');
  const free2 = T.hrMine().find(x => !s.m.includes(x.id)), b = el(free2.id);
  T.S.sq.book = ''; T.S.sq.peek = null; fire('pointerdown', ev(b)); tick(Math.floor(V.hold / 2)); fire('pointerup', ev(b)); tick(V.hold);
  const c1 = ev(b); fire('click', c1);
  if (T.S.sq.book || T.S.sq.peek || c1.sp) say(`короткое нажатие: раскрылась книга, открылись сведения (${peekOf()}) или щелчок не дошёл до действия`);
  fire('pointerdown', ev(b)); fire('pointermove', ev(b, { clientX: 40 + V.slop + 4 })); tick(V.hold + 1);
  if (T.S.sq.book || T.S.sq.peek) say('сдвиг пальца по полке: открылись книга или сведения — это прокрутка, не нажатие');
  fire('pointerup', ev(b));
  fire('pointerdown', ev(b)); tick(V.hold + 1);
  if (T.S.sq.book) say('удержание корешка: раскрылась книга — теперь сведения, книга — кнопкой в них');
  if (!T.S.sq.peek || T.S.sq.peek.id !== free2.id || T.S.sq.peek.pin) say(`удержание корешка: не открылись сведения героя над полкой (${peekOf()})`);
  { const g0 = view('сведения корешка'), r0 = g0.slice(g0.indexOf('<div class="lb-sqr">')), pk = (r0.match(/<div class="sq-peek[ "][\s\S]*?<i class="sqp-tip" aria-hidden="true"><\/i><\/div>/) || [''])[0], x = T.H(free2.id), v = T.hrV(x);
    if (!pk) say('сведения корешка: подсказки нет над полкой (в колонке отряда)');
    else {
      const need = [[`<b class="sqp-n">${x.name}</b>`, 'имени'], [`<span class="rar" data-r="${x.r}">`, 'редкости'], [`data-el="${x.el}"`, 'стихии'], [`${v.cls}</span>`, 'класса'], [`<span class="num">${T.fmt(x.bm)}</span>`, `мощи ${T.fmt(x.bm)}`],
        [`Ур.&nbsp;<b class="num">${x.lvl}</b>/${x.cap}`, 'уровня'], [`Доблесть&nbsp;<b class="num">${x.valor}</b>/${x.maxV}`, 'доблести'], [`Пределы&nbsp;<b class="num">${x.lim}</b>/`, 'пределов'],
        [`<button class="btn sm go sqp-go" data-a="sqbook" data-v="${x.id}">`, 'кнопки «Книга героя»'], [`data-z="s" `, 'мелкой книги']];
      for (const [k, what] of need) if (!pk.includes(k)) say(`сведения корешка: нет ${what}`);
      if (!new RegExp(`<button class="hs on"[^>]*data-id="${x.id}"`).test(g0)) say('сведения корешка: корешок, чьи сведения открыты, не приподнят');
    } }
  fire('pointerup', ev(b));
  if (T.S.sq.peek) say(`удержание: отпустил палец — сведения не закрылись (${peekOf()})`);
  const c2 = ev(b); fire('click', c2); if (!c2.sp || !c2.pd) say('удержание: щелчок после него поставил бы героя в отряд');
  /* отпустил в сведениях — остались; нажатие мимо — закрыты; Esc — закрыты */
  const box = { closest: q => (q === '.sq-peek' ? box : null) };
  fire('pointerdown', ev(b)); tick(V.hold + 1); pointAt = () => box; fire('pointerup', ev(b)); pointAt = null;
  if (!T.S.sq.peek || !T.S.sq.peek.pin) say(`удержание: отпустил палец в сведениях — они не остались (${peekOf()})`);
  fire('click', ev(b)); const c3 = ev(b, { target: { closest: () => null } }); fire('click', c3);
  if (T.S.sq.peek) say(`сведения: нажатие мимо не закрыло их (${peekOf()})`);
  const cm = ev(b); fire('contextmenu', cm);
  if (!T.S.sq.peek || !T.S.sq.peek.pin || !cm.pd) say(`правая кнопка на корешке: не открылись закреплённые сведения (${peekOf()})`);
  { const k = { key: 'Escape', pd: 0, sp: 0, preventDefault() { this.pd++; }, stopPropagation() { this.sp++; } }; fire('keydown', k); if (T.S.sq.peek || !k.pd) say('сведения: Esc не закрыл их'); }
  /* отпустил на «Книге героя» — книга раскрывается поверх отрядов, полёт — от корешка */
  const btn = { getAttribute: a => (a === 'data-a' ? 'sqbook' : a === 'data-v' ? free2.id : null), closest: q => (q === '.sq-peek' ? box : q === '.sq-peek [data-a]' ? btn : null) };
  fire('pointerdown', ev(b)); tick(V.hold + 1); pointAt = () => btn; fire('pointerup', ev(b)); pointAt = null;
  if (T.S.sq.book !== free2.id || T.S.sq.peek) say(`«Книга героя» в сведениях: книга героя не раскрылась или сведения остались (${peekOf()})`);
  if (!T.S.hb.anim || T.S.hb.anim.kind !== 'in' || T.S.hb.anim.id !== free2.id) say('«Книга героя» в сведениях: книга раскрылась без анимации открытия');
  const c4 = ev(b); fire('click', c4); if (!c4.sp || !c4.pd) say('«Книга героя» в сведениях: щелчок после отпускания поставил бы героя в отряд');
  g = view('книга героя поверх отрядов');
  if (!/<div class="hb-win/.test(g) || !g.includes('data-a="hbclose" data-v="sq"') || (g.match(/data-a="seg" data-v="hero:(?:power|gear|skills|path)"/g) || []).length !== 4) say('книга героя поверх отрядов: нет книги с вкладками героя или закрытие не к отрядам');
  if (!g.includes('<div class="lb-case tall"')) say('книга героя поверх отрядов: под книгой нет шкафа отрядов');
  run('книга · закрыть', () => T.ACT.hbclose('sq'));
  if (T.S.sq.book || T.S.hb.anim || /<div class="hb-win/.test(view('отряды после книги'))) say('книга героя поверх отрядов: закрытие не вернуло к отрядам');
  /* сведения открыты — героя поставили: сведения закрыты */
  T.S.sq.book = ''; T.S.sq.peek = { id: free2.id, pin: true }; T.S.sq.slot = 0;   /* место выбрано: герой встанет в него, даже если отряд полон */
  { const s2 = T.sq(T.S.selSquad); act('sqput', `q${T.S.sq.seq}|${s2.id}|${free2.id}`); if (s2.m[0] !== free2.id) say('сведения: герой из сведений не встал в выбранное место'); if (T.S.sq.peek) say('сведения: героя поставили в отряд, а сведения его корешка остались'); }
  tick(10000);
  /* «Выбрать» из листа режима — под шкафом: полка отряда справа высоты не теряет */
  fresh(); T.S.route = 'echo'; run('лист Эхо', () => T.SQ.pick('echo')); act('sqedit', 'echo|s2');
  { const h2 = view('шкаф · выбор для режима'), l2 = h2.slice(h2.indexOf('<div class="lb-sql">'), h2.indexOf('<div class="lb-sqr">'));
    if (!l2.includes('Выбор для режима «Эхо»') || !/data-a="sqpick"/.test(l2) || !/data-a="sqback"/.test(l2)) say('шкаф отрядов: «Выбрать» и «Назад» режима — не под шкафом'); }
  /* вёрстка — расчётом на 932 × 430 и 844 × 390: числа — LB_VIEW, поля экрана — токены index.html */
  const spM = +((html.match(/--sp-m:(\d+)px/) || [])[1] || 12), maxR = Math.max(...[1, 2, 3, 4, 5].map(t => T.HB_ART.spines[t].ratio));
  for (const [W, Hh, top, rail] of T.SHELL_SIZE.frames) {
    const n = `${W} × ${Hh}`, i = Hh - top <= V.low ? 1 : 0, inW = W - rail - 2 * spM, inH = Hh - top - 2 * spM;
    const body = inH - V.top[i], lw = Q.case[i], vis = body / Q.cmp[i];
    if (vis < 3) say(`вёрстка ${n}: в шкафу отрядов видно ${vis.toFixed(1)} отсека — меньше трёх`);
    const cmpIn = lw - 2 * V.post[i] - 2 * V.pad, mini = 5 * Q.mini[i] * maxR / 1000 + 4 * 2;
    if (mini > cmpIn * 0.5) say(`вёрстка ${n}: корешкам отсека тесно рядом со строкой режимов (${mini.toFixed(0)} из ${cmpIn} px)`);
    const rin = inW - lw - spM - 2 * V.post[i], low = Q.head[i] + V.air + Q.spine[i] + V.plank - V.sink, stage = body - low;
    const bw = Math.min((rin - 2 * V.pad - 4 * Q.fgap) / 5, (stage - V.air - Q.near + V.sink) * 9 / 16);
    if (bw < 64) say(`вёрстка ${n}: книга на полке отряда ${bw.toFixed(0)} px — мелко`);
    const spw = Q.spine[i] * maxR / 1000, many = Math.floor((rin - 2 * V.pad + Q.sgap) / (spw + Q.sgap));
    if (many < 12) say(`вёрстка ${n}: на нижней полке видно ${many} корешков — мало`);
    cnt.lay = (cnt.lay || []).concat(`${n}: отсеков видно ${vis.toFixed(1)}, книга на полке отряда ${bw.toFixed(0)} × ${(bw * 16 / 9).toFixed(0)}, на нижней полке — ${many} корешков ${spw.toFixed(0)} × ${Q.spine[i]}`);
  }
}

/* ================== 8. отрисовка в режимах «Игрок» и «Команда» ================== */
for (const team of [false, true]) {
  run('режим', () => T.setTeam(team)); const tag = team ? ' [команда]' : '';
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'squads';
  for (const s of T.S.squads) { T.S.selSquad = s.id; view(`библиотека · ${s.name}${tag}`); }
  for (const m of ['', 'descent', 'echo', 'arena', 'league', 'clan']) {
    fresh(); T.S.route = 'heroes'; T.S.overlay = { t: 'prep', arg: m };
    const o = ovOf(view(`лист · ${m || 'без режима'}${tag}`));
    if (!o.includes('class="sheet')) say(`лист · ${m}: не нарисован`);
    if (!o.includes('data-a="sqedit"')) say(`лист · ${m}: нет «Изменить»`);
  }
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'squads'; T.S.overlay = { t: 'sqname', arg: 's1' }; view(`окно имени${tag}`);
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'squads'; act('sqdel', 's3'); view(`удаление${tag}`);
  for (const [t, , f] of T.FLOWS.filter(x => /Отряд|Лига/.test(x[0]))) { fresh(); run('сценарий ' + t, () => f()); view(`сценарий «${t}»${tag}`); }
  for (const [route, seg, key] of [['arena', 'def', 'arena'], ['arena', 'league', 'arena'], ['clan', 'boss', 'clan']]) { fresh(); T.S.route = route; T.S.seg[key] = seg; view(`${route} · ${seg}${tag}`); }
}
run('режим «Игрок»', () => T.setTeam(false));
done();
