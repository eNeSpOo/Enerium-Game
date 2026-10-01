/* Автопроверка «Новый цикл — новая ступень аккаунта» прототипа «Свет снизу» (ADR-0041; design/ui/screens/cycle.js, cycle.js) — без браузера.
   1. Файлы на месте и компилируются; index.html подключает данные cycle.js после start.js, экран screens/cycle.js — последним, cycle.css.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Законы (каждый — функция над песочницей; раздел 4 ломает реализацию и требует, чтобы закон это поймал):
      A. Переход — одна операция сервера с номером. Страж второго биома пал — переход принят: цикл +1, опыт Странника × номер прошлого
         цикла, место Памяти нового цикла открыто, «Дар пути» открылся, взятые планки недели в таблице прошлого цикла — сундуками в
         запасы, окно в очереди. Повтор того же номера — прежний ответ и ничего сверху: ни опыта, ни предложений, ни сундуков, ни окон. Другой номер на то же «из» — отказ (окно устарело); страж стоит — отказ.
      B. Окно перечисляет то, что открылось, по данным: шесть блоков разметки EN_CYCLE.sections; на плитке — главный пункт блока; лист блока —
         все пункты игрока блока с их строкой; «Рейтинг цикла N» и место Памяти; пункты «для команды» игроку не видны; в цикле VI
         игроку не видно имён бога и биомов (ADR-0038). Ни undefined, ни NaN, ни служебного в режиме «Игрок».
      C. Закрытие не теряет выбор: «Позже» снимает окно, место Памяти ждёт; окно открывается снова — у зеркала Памяти и запиской в Убежище.
      D. Рейтинг — своего цикла: лист «Рейтинг» — «Рейтинг цикла N» и «Лидеры цикла N»; шапка Эхо и Арены — цикл; очки недели нового
         цикла — с нуля, рейтинг Арены и Лиги — со старта; соперники Арены — игроки цикла N; Событие считает заново; итог прошлого цикла —
         в «Обзоре» Странника и в листе итога.
      E. Герои и враги цикла N + 1 сильнее: у героя цикла N + 1 на том же уровне атака, здоровье и защита выше (ядро, RULES.cycleX10);
         кривая — одна у ядра, калькуляторов и снаряжения; враги Эхо цикла N + 1 на каждой ступени выше уровнем, раунд атаки дороже;
         враги образцов биомов циклов III–VI (калькулятор подъёма, climb-sim.js) выше уровнем.
   4. Мутации: каждая ломает реализацию в песочнице (или ядро в отдельном прогоне), закон обязан упасть. Не упал — ошибка проверки.
   Запуск: node tools/content-gen/screens/check_cycle.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const err = [];
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.map(e => '  ' + e).join('\n')); process.exit(1); }
  console.log('Проверка пройдена: переход — одна операция, повтор ничего не выдаёт; окно перечисляет открывшееся по данным и не теряет выбор; рейтинг — своего цикла; герои и враги нового цикла сильнее; мутации пойманы.');
  process.exit(0);
}

/* 1. файлы и подключение */
for (const f of ['cycle.js', 'screens/cycle.js', 'screens/cycle.css']) if (!fs.existsSync(path.join(UI, f))) say('нет design/ui/' + f);
if (err.length) done();
for (const f of ['cycle.js', 'screens/cycle.js']) { try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); } }
const html = read('index.html');
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const order = scripts.map(s => s.src || 'inline');
const iData = order.indexOf('cycle.js'), iStart = order.indexOf('start.js'), iScr = order.indexOf('screens/cycle.js'), iStartScr = order.indexOf('screens/start.js');
if (iData < 0) say('index.html: не подключены данные cycle.js');
else if (iData < iStart) say('index.html: данные cycle.js — после start.js (опыт перехода — EN_START)');
if (iScr < 0) say('index.html: не подключён screens/cycle.js');
else if (iScr < iStartScr || iScr !== order.lastIndexOf(order.filter(o => o.startsWith('screens/')).pop())) say('index.html: screens/cycle.js — последним из экранов: он оборачивает endRun, overlay и shNext поверх screens/start.js');
if (!html.includes('href="screens/cycle.css"')) say('index.html: не подключён screens/cycle.css');
if (err.length) done();

/* 2. песочница — как у check_week.js */
function sandbox() {
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, remove() {},
      animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
    e.querySelector = () => stubEl();
    return e;
  };
  const els = {};
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
    createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: stubEl('html'), activeElement: null, fonts: null };
  const win = { document, console: { log() {}, warn() {}, error() {} }, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
  win.window = win; win.self = win;
  win.__player = h => playerText(h);
  win.__service = t => SERVICE.filter(([, re]) => re.test(t)).map(([w]) => w);
  win.__strip = h => strip(h);
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  return ctx;
}

/* 3. законы — выполняются внутри песочницы; каждый возвращает список ошибок */
function lawsSrc() {
  const L = {};
  const draw = () => { render(); return document.getElementById('game').innerHTML; };
  const team = on => { KH.team = !!on; };
  const fresh = () => { S = initialState(); S.overlay = null; S.route = 'shelter'; team(false); };
  const playerOf = h => __player(h);
  const memOpen = c => { const x = S.mem.slots.find(s => s.c === c); return !!x && x.st === 'open'; };
  const offers = () => (S.store && S.store.offers ? S.store.offers.map(o => o.id).join(',') : '');
  /* A. переход — одна операция */
  L.A = () => {
    fresh();
    const out = [], c0 = S.acc.cycle;
    const xp0 = S.acc.xp + S.acc.level * 1e9, of0 = offers(), ch0 = S.bag.chests.length;
    const wk0 = darRows(S).filter(p => p.wk.id === 'now' && p.st === 'ok' && p.kind === 'plank' && p.cat === 'me').reduce((a, p) => a + p.groups.reduce((b, g) => b + g.count, 0), 0);
    if (CY_SRV.advance('t1', c0).refuse !== 'guard') out.push('страж стоит — переход должен быть отказом «guard»');
    if (S.acc.cycle !== c0) out.push('отказ сдвинул цикл');
    S.cy.guard[c0] = 1;
    const r1 = CY_SRV.advance('t1', c0);
    if (!r1.res || r1.again) { out.push('переход не принят: ' + JSON.stringify(r1)); return out; }
    const c1 = S.acc.cycle, xp1 = S.acc.xp + S.acc.level * 1e9, of1 = offers(), q1 = S.cy.queue.join(), st = EN_CYCLE.steps[c1], ch1 = S.bag.chests.length;
    if (ch1 - ch0 !== wk0) out.push(`взятые планки недели в таблице прошлого цикла: сундуков ${ch1 - ch0}, ждали ${wk0}`);
    if (c1 !== c0 + 1) out.push(`цикл после перехода ${c1}, ждали ${c0 + 1}`);
    if (!(xp1 > xp0)) out.push('опыт Странника за переход не начислен');
    if (r1.res.xp !== EN_CYCLE.rules.xp * c0) out.push(`опыт перехода ${r1.res.xp}, ждали ${EN_CYCLE.rules.xp} × ${c0}`);
    if (!memOpen(c1)) out.push(`место Памяти цикла ${c1} не открылось`);
    if (st.offer && !of1.split(',').includes(st.offer.id)) out.push(`«Дар пути» ${st.offer.id} не открылся`);
    if (!S.cy.queue.includes(c1)) out.push('окно перехода не в очереди');
    const r2 = CY_SRV.advance('t1', c0);
    if (!r2.again) out.push('повтор того же номера не отдал прежний ответ');
    if (S.acc.cycle !== c1 || S.acc.xp + S.acc.level * 1e9 !== xp1 || offers() !== of1 || S.cy.queue.join() !== q1 || S.bag.chests.length !== ch1) out.push('повтор номера что-то выдал: цикл, опыт, предложение, сундуки или окно');
    const r3 = CY_SRV.advance('t2', c0);
    if (!r3.refuse) out.push('другой номер на тот же переход принят — переход выдан дважды');
    if (S.acc.cycle !== c1) out.push('второй номер сдвинул цикл');
    return out;
  };
  /* B. окно — по данным */
  L.B = () => {
    const out = [];
    for (const c of Object.keys(EN_CYCLE.steps).map(Number)) {
      fresh(); EN_CYCLE_UI.demoTo(c);
      const st = EN_CYCLE.steps[c], h = draw(), txt = playerOf(h), all = __strip(h);
      if (!/cy-pop/.test(h)) { out.push(`цикл ${c}: окно не встало`); continue; }
      for (const s of EN_CYCLE.sections) {
        const xs = st.open.filter(x => x.sec === s.k && !x.team), main = xs.find(x => x.main) || xs[0];
        if (!all.includes(s.n)) out.push(`цикл ${c}: в окне нет блока «${s.n}»`);
        if (main && !all.includes(main.n)) out.push(`цикл ${c}: на плитке «${s.n}» нет главного пункта «${main.n}»`);
        S.overlay = { t: 'cysec', arg: c + ':' + s.k }; const sh = __strip(draw());
        for (const x of xs) if (!sh.includes(x.n) || !sh.includes(x.d)) out.push(`цикл ${c}: в листе «${s.n}» нет пункта «${x.n}»`);
        for (const x of st.open.filter(q => q.sec === s.k && q.team)) if (playerOf(draw()).includes(x.n)) out.push(`цикл ${c}: игроку видно «для команды» — «${x.n}»`);
        S.overlay = null;
      }
      if (!all.includes(`Рейтинг цикла ${ROMAN[c]}`)) out.push(`цикл ${c}: в окне нет «Рейтинг цикла ${ROMAN[c]}»`);
      if (!st.open.some(x => x.k === 'memory')) out.push(`цикл ${c}: нет места Памяти`);
      if (/undefined|NaN|\[object /.test(h)) out.push(`цикл ${c}: undefined, NaN или [object в окне`);
      for (const t of txt.split('\n')) { const w = __service(t); if (w.length) out.push(`цикл ${c}: игроку видно служебное (${w.join(', ')}) — «${t.slice(0, 90)}»`); }
      if (st.team) {
        /* имена проводников Убежища — не тайна цикла: «Хранитель знаний» не путать с «Хранителем» биома 12 */
        const C = EN_RECIPES.cycles[c - 1], secret = [C.god].concat(C.biomes.flatMap(b => [b.n, b.boss, b.guard]));
        const said = Object.values(typeof NPCS !== 'undefined' ? NPCS : {}).reduce((t, n) => t.split(n.n).join(' '), txt);
        for (const w of secret) if (said.includes(w)) out.push(`цикл ${c}: игроку видно «${w}» — цикл только для команды`);
      }
    }
    return out;
  };
  /* C. закрытие не теряет выбор */
  L.C = () => {
    const out = [];
    fresh(); EN_CYCLE_UI.demoTo(3);
    ACT.cylater('3');
    if (S.cy.queue.length) out.push('«Позже» не сняло окно');
    if (/cy-pop pop/.test(draw())) out.push('после «Позже» окно встаёт снова само');
    if (!memOpen(3)) out.push('после «Позже» место Памяти цикла III закрыто — выбор потерян');
    S.route = 'profile'; S.seg.profile = 'mem'; S.overlay = null;
    const m = draw();
    if (!/data-v="cycle:3"/.test(m)) out.push('у зеркала Памяти нет входа к окну цикла');
    S.route = 'shelter';
    const sh = draw();
    if (!/data-v="cycle:3"/.test(sh)) out.push('в Убежище нет входа к окну цикла');
    if (!/data-a="cymem" data-v="3"/.test(sh)) out.push('в Убежище нет «Вспомнить» для места цикла III');
    S.overlay = { t: 'cycle', arg: '3' };
    if (!/cy-pop/.test(draw())) out.push('окно цикла не открывается снова');
    return out;
  };
  /* D. рейтинг — своего цикла */
  L.D = () => {
    const out = [];
    fresh();
    const c0 = S.acc.cycle;
    EN_CYCLE_UI.demoTo(c0 + 1);
    const c = S.acc.cycle, R = ROMAN[c];
    S.cy.queue = [];
    S.route = 'week'; S.overlay = { t: 'rank', arg: 'Эхо' };
    const rk = __strip(draw());
    if (!rk.includes(`Рейтинг цикла ${R}`)) out.push(`лист «Рейтинг» — не «Рейтинг цикла ${R}»`);
    if (!rk.includes(`Лидеры цикла ${R}`)) out.push(`лидеры — не «Лидеры цикла ${R}»`);
    S.overlay = null;
    if (!__strip(draw()).includes(`Рейтинг цикла ${R}`)) out.push(`«Неделя» не называет «Рейтинг цикла ${R}»`);
    S.route = 'echo';
    if (!__strip(draw()).includes(`цикл ${R}`)) out.push('шапка Эхо не называет цикл рейтинга');
    if (S.echo.score !== 0) out.push('очки Эхо нового цикла — не с нуля');
    if (S.contracts && S.contracts.pts !== 0) out.push('очки контрактов нового цикла — не с нуля');
    if (S.event && (S.event.cyc !== c || S.event.pts !== 0)) out.push('Событие нового цикла — не новый счёт с нуля');
    if (S.arena.rating !== EN_CYCLE.rules.arenaStart || (S.arena.lg && S.arena.lg.rating !== EN_CYCLE.rules.arenaStart)) out.push('рейтинг Арены и Лиги нового цикла — не со старта');
    const opp = (S.arena.opp || []).map(id => (EN_ARENA.pool.arena.find(o => o.id === (id.id || id)) || {}).c);
    if (opp.length && opp.some(x => x !== c)) out.push(`соперники Арены — не игроки цикла ${R}: циклы ${opp.join(', ')}`);
    S.route = 'arena'; S.seg.arena = 'arena';
    if (!__strip(draw()).includes(`цикла ${R}`)) out.push('Арена не называет рейтинг цикла');
    S.route = 'event'; draw();
    if (S.event && S.event.cyc !== c) out.push('Событие не начало счёт нового цикла');
    S.route = 'profile'; S.seg.profile = 'over';
    const ov = __strip(draw());
    if (!ov.includes(`Рейтинг цикла ${R}`)) out.push('«Обзор» Странника — не «Рейтинг цикла»');
    if (!ov.includes(`Итог цикла ${ROMAN[c0]}`)) out.push('в «Обзоре» нет итога прошлого цикла');
    S.overlay = { t: 'cyhist' };
    const hi = __strip(draw());
    for (const x of S.cy.hist[c0] || []) if (!hi.includes(x.n)) out.push(`в листе итога нет режима «${x.n}»`);
    if (!(S.cy.hist[c0] || []).length) out.push('итог прошлого цикла пуст');
    return out;
  };
  /* E. герои и враги цикла N + 1 сильнее */
  L.E = () => {
    const out = [], K = EnBattle.RULES.cycleX10;
    const h0 = { id: 'x', name: 'x', cls: 'Танк', el: 'Земля', lvl: 100, st: [128, 54, 72, 246, 62], ab: [], pas: [], ult: null, valor: 0 };
    const unit = c => EnBattle.create({ mode: 'rounds', heroes: [EnBattle.heroSrc(Object.assign({}, h0, { cycle: c }))], foes: [], seed: 1 }).u[0][0];
    for (let c = 1; c < 6; c++) {
      const a = unit(c), b = unit(c + 1);
      if (!(b.maxHp > a.maxHp && b.atk.str > a.atk.str && b.def.str > a.def.str)) out.push(`герой цикла ${ROMAN[c + 1]} на том же уровне не сильнее героя цикла ${ROMAN[c]}`);
    }
    for (let c = 1; c < K.length; c++) if (!(K[c] > K[c - 1])) out.push(`кривая ядра: цикл ${ROMAN[c + 1]} не выше цикла ${ROMAN[c]}`);
    if (EN_CYCLE.curve.join() !== K.join()) out.push('кривая окна не из ядра');
    if (EN_EQUIPMENT.rules.cycMul.map(v => v / 10).join() !== K.join()) out.push('кривая снаряжения не та, что у ядра');
    const E = EN_ECHO_RULES;
    for (let c = 3; c <= 6; c++) {
      const a = E.cycles[String(c - 1)], b = E.cycles[String(c)];
      b.forEach((x, i) => { if (!(x.foeLvl > a[i].foeLvl)) out.push(`Эхо: ступень ${x.step} цикла ${ROMAN[c]} не сильнее`); });
      if (!(E.roundSouls[c - 1] > E.roundSouls[c - 2])) out.push(`Эхо: раунд атаки цикла ${ROMAN[c]} не дороже`);
    }
    return out;
  };
  return L;
}

const ctx = sandbox();
if (err.length) done();
vm.runInContext('var __L = (' + lawsSrc.toString() + ')();', ctx);
const run = k => { try { return vm.runInContext(`__L.${k}()`, ctx); } catch (e) { return ['исключение: ' + e.message + ' ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')]; } };
for (const k of ['A', 'B', 'C', 'D', 'E']) for (const e of run(k)) say(`закон ${k}: ${e}`);

/* враги образцов биомов циклов III–VI — калькулятор подъёма (climb-sim.js): уровень врагов растёт с циклом, образец II = b3 и b4 */
try {
  const CS = require(path.join(ROOT, 'tools', 'content-gen', 'cycle', 'climb-sim.js'));
  CS.setup({ pNext: 168 });
  for (let c = 3; c <= 6; c++) for (const ab of ['A', 'B']) {
    const a = `v${c - 1}${ab}`, b = `v${c}${ab}`;
    if (!(CS.lvlOf(b, 1) > CS.lvlOf(a, 1) && CS.lvlOf(b, 36) > CS.lvlOf(a, 36))) say(`закон E: враги биома ${ab} цикла ${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][c]} не выше уровнем`);
  }
} catch (e) { say('закон E: калькулятор подъёма не загрузился — ' + e.message); }
if (err.length) done();

/* 4. мутации: ломаем — закон обязан упасть */
const MUT = [
  ['A', 'сервер не помнит номер операции', `CYR.advance0 = CYR.advance; CYR.advance = (M, op, from, f) => { const r = CYR.advance0(M, op, from, f); if (r.again) { M.cycle = from; delete M.done[from + 1]; return CYR.advance0(M, op + '#', from, f); } return r; };`, 'CYR.advance = CYR.advance0;'],
  ['A', 'другой номер на тот же переход выдаёт снова', `CYR.advance1 = CYR.advance; CYR.advance = (M, op, from, f) => { if (op === 't2') { M.cycle = from; delete M.done[from + 1]; } return CYR.advance1(M, op, from, f); };`, 'CYR.advance = CYR.advance1;'],
  ['B', 'окно теряет блок «Герои»', `cyTile0 = cyTile; cyTile = (c, s) => s.k === 'heroes' ? '' : cyTile0(c, s);`, 'cyTile = cyTile0;'],
  ['B', 'лист блока теряет пункт', `cyItems0 = cyItems; cyItems = (c, sec) => cyItems0(c, sec).slice(1);`, 'cyItems = cyItems0;'],
  ['B', 'игроку видно «для команды»', `cyItems2 = cyItems; cyItems = (c, sec) => { const st = EN_CYCLE.steps[c]; return st ? st.open.filter(x => !sec || x.sec === sec) : []; }; OV.cysec2 = OV.cysec; OV.cysec = o => OV.cysec2(o).replace(/ team-only/g, '');`, 'cyItems = cyItems2; OV.cysec = OV.cysec2;'],
  ['C', '«Позже» закрепляет место Памяти пустым — выбор потерян', `ACT.cylater0 = ACT.cylater; ACT.cylater = v => { const x = S.mem.slots.find(s => s.c === +v); if (x) x.p = 'p1'; ACT.cylater0(v); };`, 'ACT.cylater = ACT.cylater0;'],
  ['C', 'у зеркала Памяти нет входа к окну', `cyMemBtn0 = cyMemBtn; cyMemBtn = () => '';`, 'cyMemBtn = cyMemBtn0;'],
  ['D', 'рейтинг — не своего цикла', `cyRankCycle0 = cyRankCycle; cyRankCycle = () => 2;`, 'cyRankCycle = cyRankCycle0;'],
  ['D', 'таблицы нового цикла не начинаются заново', `cyFreshTables0 = cyFreshTables; cyFreshTables = () => {};`, 'cyFreshTables = cyFreshTables0;'],
  ['E', 'кривая героя плоская', `EnBattle.RULES.cycleX10_0 = EnBattle.RULES.cycleX10.slice(); EnBattle.RULES.cycleX10.fill(10);`, 'EnBattle.RULES.cycleX10.splice(0, 6, ...EnBattle.RULES.cycleX10_0);'],
];
let caught = 0;
for (const [k, what, brk, fix] of MUT) {
  try { vm.runInContext(brk, ctx); } catch (e) { say(`мутация «${what}»: не применилась — ${e.message}`); continue; }
  const got = run(k);
  try { vm.runInContext(fix, ctx); } catch (e) { say(`мутация «${what}»: не снялась — ${e.message}`); }
  if (got.length) caught++; else say(`мутация «${what}»: закон ${k} её не поймал`);
}
/* после мутаций законы снова чисты */
for (const k of ['A', 'D', 'E']) for (const e of run(k)) say(`закон ${k} после мутаций: ${e}`);
if (!err.length) console.log(`Мутаций ${MUT.length}, поймано ${caught}.`);
done();
