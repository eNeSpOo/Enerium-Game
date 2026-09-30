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
   7а. Коллекция и отряды — одни герои: сетка «Мои» (книги героев) — ровно пул отрядов; купленный приходит в обе; в редакторе отряда —
      мелкие книги, а не крупные книги сетки.
   8. Режим «Игрок»: библиотека, лист выбора на всех режимах, окно имени и подтверждение удаления — без служебных слов, undefined и NaN;
      режим «Команда» рисуется.
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
  console.log('Проверка пройдена: библиотека до десяти отрядов с именами, места до пяти героев, один лист выбора на все режимы со своим выбором у каждого, связка со спуском и Эхо, повтор номера ничего не меняет, в режиме «Игрок» служебного нет.');
  process.exit(0);
}

/* ================== 1. описание API ================== */
{
  const md = read('screens/README.md');
  for (const k of ['SQ.pick', 'SQ.of', 'SQ.ready', 'SQ.ids']) if (!md.includes(k)) say(`screens/README.md: нет описания ${k}`);
}

/* ================== песочница ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
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
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, FLOWS, KH, RS, RSI, EB, H, SQ, SQ_DATA, render, initialState, setTeam, startRun, advance, busyNote, rsHas, sq, sqBM,
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
  if (/<button class="hb[^"]*" data-z="l"/.test(g)) say('отряды: в редакторе отряда крупные книги сетки вместо мелких');
  if (!(g.match(/<button class="hb[^"]*" data-z="s"/g) || []).length) say('отряды: в редакторе отряда нет мелких книг героев');
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
