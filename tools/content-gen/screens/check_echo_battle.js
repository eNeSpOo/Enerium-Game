/* Автопроверка боя Эхо (ADR-0025) в ядре и в прототипе, приёмов Убер-боссов, расовой неприязни (ADR-0024),
   биома Многоликого и рунного стража со «Спуска» (ADR-0018, ADR-0020) — без браузера.
   Ядро (design/ui/battle.js):
   1. EB.echoBattle — главный враг и защитники по типу (RULES.echo.guards: четверо у всех, у Многоликого — ни одного, ADR-0039), предел раундов
      по типу (RULES.echo.rounds), здоровье главного врага — с входа, защитники полные; тот же сид — тот же итог;
      итог EB.echoStats сходится с самим боем; перестановка отряда боя не меняет; только целые числа.
   2. Здоровье сохраняется между атаками: цепочка атак, вход каждой — выход прошлой.
   3. Бой кончается, когда пал главный враг (RULES.echo.endOnMain).
   4. Две ульты в наборе: обе в таблице, обе срабатывают; своя доля ch у места набора — мимо деления.
   5. Обычная атака по всем — basic: { tgt: 'all', coef } (echo-foes.js), basicAll: число или true: бьёт всех живых, угрозы не создаёт.
   6. Неприязнь: +RULES.aversionBp урона по расе цели — ударом и уроном по времени; по чужой расе — нет; число как в roster.js.
   7. Рунный страж: каждая его обычная атака, даже промах, отнимает у предела раунд, текущий доигрывается.
   8. Приёмы из echo-foes.js: cast — способность по реакции вне очереди, ctrlBypass — контроль мимо иммунитета,
      lifeSave — спасение раз за жизнь цели, помнится между атаками; способности вне библиотеки — EB.addLib.
   Прототип (index.html и screens/echo.js в песочнице, как check_echo.js):
   8б. Остальные приёмы: отложенный удар, сила от союзников, забрать эффекты, цель для всех, каждый N-й ход, защита до метки,
       повтор чужой ульты, поднять павшего, срезанное имя, урон по цели под эффектом; правки ядра — удары hits делят коэффициент,
       «тепло» Огня снимает стужу.
   9.  Девять недель × шесть циклов × 14 ступеней, Многоликий и призванные враги: бой собирается и идёт до конца — дважды:
       на демо со скрытыми echo-foes.js и echo-rules.js и на данных; раунды — всегда из ядра; на данных уровень, здоровье по формуле
       правил, души и очки — из echo-rules.js, ранг, набор и защитники — из echo-foes.js. Призванный враг — тип по силе из recipes.js
       (e, b, u, f, ADR-0039): раунды, ранг и иммунитет его типа; Многоликий — ранг Забытого, свой набор, один, без свиты (ответ автора 01.10.2026).
   10. Атака: душа один раз, повтор того же номера — ничего; бой одной сценой; просмотр — тот же бой, что итог; «Пропустить» —
       итог со статистикой, отнятым здоровьем и очками; здоровье переходит в следующую атаку; неприязнь героя доходит до боя.
       Многоликий — вершина, бьётся один, без свиты (ADR-0039); ресурс «Многоликий» привязан к своей неделе.
   11. Арт Иш-Кантуна — только у недели эльфов: портреты ступеней и фон арены Эхо.
   12. «Спуск»: вход к рунному стражу — после босса биома, демо-вход — всегда; в бою видно, что удар стража отнимает раунд.
   13. Девять Убер-боссов против своих отрядов недели (герои Эхо echo-foes.js) на циклах II, IV и VI: бой идёт, Убер срабатывает
       каждым приёмом набора и обычной атакой по всем, если она у него есть.
   14. Многоликий при призыве — бросок manySummonBp сверх лестницы; «Лик недели» — likShards по циклу; биом Многоликого —
       здоровье героев переходит с этажа на этаж, главный враг полный, попытка одна.
   15. Раунды — одна таблица ядра RULES.rounds.by на все режимы (слово автора 01.10.2026, ADR-0039). Срок жизни: боссы, Убер
       и призванные враги — час, отсчёт на карточке цели, срок вышел — цель исчезает. Осада: остаток здоровья на входе — максимум в атаке,
       прежний — max0; лечение и доли от максимума — от нового (lifeSave, лекарь-защитник).
   Везде: без исключений, без undefined, NaN и [object. Числа проверки — не баланс.
   Запуск: node tools/content-gen/screens/check_echo_battle.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const html = fs.readFileSync(path.join(UI, 'index.html'), 'utf8');
const err = [];

/* песочница: скрипты прототипа по порядку, как в браузере; у элемента querySelector отдаёт заглушку — экран боя рисует карты */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
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
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? fs.readFileSync(path.join(UI, s.src), 'utf8') : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { err.push(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();

/* общие помощники песочницы: разметка без мусора, целые числа, сборка и прогон боя по всем неделям и циклам */
function helpers() {
  window.CK = {
    draw() { render(); return document.getElementById('game').innerHTML; },
    scan(fail, key, h) { const m = String(h).match(/.{0,50}(?:undefined|NaN|\[object ).{0,30}/); if (m) fail(`${key}: в разметке undefined, NaN или [object — «${m[0]}»`); return h; },
    ints(fail, key, x) { const bad = []; const walk = (v, p) => { if (typeof v === 'number' && !Number.isInteger(v)) bad.push(p + '=' + v); else if (v && typeof v === 'object') for (const k in v) walk(v[k], p + '.' + k); }; walk(x, ''); if (bad.length) fail(`${key}: не целые числа — ${bad.slice(0, 4).join(', ')}`); },
    reset(race, c) { S = initialState(); rsSetWeek(race); S.acc.cycle = c; S.route = 'echo'; S.overlay = null; S.wallet.souls = 1e9; window.EN_ECHO.sync(); },
    ids() { return sq(S.echoSquad).m.filter(Boolean); },
    /* 9. все недели × циклы × ступени, Многоликий, призванные враги: состав боя и бой до конца */
    specLoop(out, fail, label, data) {
      const E = window.EN_ECHO, EB = window.EnBattle, RU = EB.RULES, TOP = E.steps.length, X = window.EN_ECHO_FOES;
      for (const w of RS.weeks) for (let c = 1; c <= 6; c++) {
        CK.reset(w.race, c);
        const tg = [];
        for (let st = 1; st <= TOP + 1; st++) tg.push(E.target('step', st));
        for (const fb of RX.drops.craftBosses) tg.push(E.target('craft', fb));   // призванные враги: kind 'craft' — из предмета, g — тип по силе
        for (const x of tg) {
          const key = `${label} · ${w.race} · цикл ${ROMAN[c]} · ${x.kind === 'craft' ? x.fid : x.kind === 'many' ? 'Многоликий' : 'ступень ' + x.step}`;
          try {
            const F = E.fight(x, CK.ids(), 1), o = F.o, L = EB.lib(), need = RU.echo.guards[x.g];
            out.specs++;
            if (o.guards.length !== need) fail(`${key}: защитников ${o.guards.length}, по правилу — ${need}`);
            if (x.kind === 'many' && (o.guards.length !== 0 || o.main.rank !== 'forgotten')) fail(`${key}: Многоликий — ранг ${o.main.rank}, защитников ${o.guards.length}; нужно forgotten и ни одного: он без свиты (ADR-0039, ответ автора)`);
            if (x.kind === 'craft') {   // тип по силе (ADR-0039): элита, босс, Убер или Забытый — раунды, ранг и иммунитет своего типа
              const fbx = RX.drops.craftBosses.find(y => y.id === x.fid);
              if (!fbx || !['e', 'b', 'u', 'f'].includes(x.g) || fbx.g !== x.g) fail(`${key}: тип призванного «${x.g}» не из recipes.js`);
              if (o.main.rank !== RU.echo.kind[x.g]) fail(`${key}: ранг ${o.main.rank}, а у типа «${x.g}» — ${RU.echo.kind[x.g]}`);
            }
            if (o.maxRounds !== RU.echo.rounds[x.g] || o.maxRounds !== E.rounds(x.g)) fail(`${key}: раундов ${o.maxRounds}, в ядре — ${RU.echo.rounds[x.g]}`);
            if (o.main.maxHp !== x.max || o.main.hp !== x.hp) fail(`${key}: здоровье главного врага не из цели`);
            if (x.kind !== 'craft' && [o.main].concat(o.guards).some(u => u.race !== w.race)) fail(`${key}: раса врагов не недели`);
            if (new Set(o.guards.map(u => u.id)).size !== o.guards.length || o.guards.some(u => u.id === o.main.id)) fail(`${key}: защитники повторяются`);
            for (const u of [o.main].concat(o.guards)) {
              if (!RU.cls[u.cls]) fail(`${key}: класс «${u.cls}» не знаком ядру`);
              if (!(u.lvl > 0) || !Number.isInteger(u.lvl)) fail(`${key}: уровень ${u.lvl}`);
              const bad = u.kit.kit.filter(k => !L[k.id]); if (bad.length) fail(`${key}: нет в библиотеке — ${bad.map(k => k.id).join(', ')}`);
            }
            const d = data && X ? X.foes[x.kind === 'many' ? `${w.race}#${TOP + 1}` : `${w.race}#${x.step}`] : null;
            if (data && x.kind !== 'craft') {
              if (!d) fail(`${key}: нет врага в echo-foes.js`);
              else {
                if (o.main.rank !== d.rank || o.main.kit.kit !== d.kit || o.main.cls !== d.cls) fail(`${key}: ранг, класс или набор не из echo-foes.js`);
                if ((x.kind === 'step' || x.kind === 'many') && o.guards.map(u => u.id.slice(4)).join() !== d.def.join()) fail(`${key}: защитники не из echo-foes.js`);
                if (d.basic && JSON.stringify(o.main.basic) !== JSON.stringify(d.basic)) fail(`${key}: атака по всем не из echo-foes.js`);
              }
            }
            const R = window.EN_ECHO_RULES, row = data && R && x.step && R.cycles[String(c)] ? R.cycles[String(c)].find(r => r.step === x.step) : null;
            if (row) {   // echo-rules.js: уровень всех карт боя, раунды по типу, здоровье цели по формуле правил, души и очки
              if (o.maxRounds !== R.types[x.g].rounds) fail(`${key}: раундов ${o.maxRounds}, в правилах ${R.types[x.g].rounds}`);
              if ([o.main].concat(o.guards).some(u => u.lvl !== row.foeLvl)) fail(`${key}: уровень карт не ${row.foeLvl}`);
              const want = Math.floor(100 * (100 + o.main.st[3]) * (12 + row.foeLvl) * row.bossHpPct * 60 / (100 * 12 * 100 * 100));
              if (x.max !== want) fail(`${key}: здоровье цели ${x.max}, по формуле правил ${want}`);
              if (E.cost(x) !== row.souls || E.pts(x.step, c) !== row.points) fail(`${key}: цена ${E.cost(x)} и очки ${E.pts(x.step, c)} не из правил`);
            }
            const b0 = EB.echoBattle(F.heroes, o);
            if (x.g === 'u') {
              if (b0.u[1][0].table.filter(r => r.ult).length !== 2) fail(`${key}: у Убер-босса не две ульты в таблице`);
              if (b0.u[1][0].rank !== 'uber') fail(`${key}: ранг Убер-босса не uber`);
              if (!data && !b0.u[1][0].basicAll) fail(`${key}: Убер-босс демо без атаки по всем`);
              if (d && d.basic && b0.u[1][0].basicAll !== d.basic.coef) fail(`${key}: доля атаки по всем ${b0.u[1][0].basicAll}, в данных ${d.basic.coef}`);
            }
            const b = EB.run(b0), st = EB.echoStats(b);
            out.battles++;
            CK.ints(fail, key, st);
            for (const side of [0, 1]) for (const u of b.u[side]) if (!Number.isInteger(u.hp) || !Number.isInteger(u.sh) || u.hp < 0 || u.hp > u.maxHp) fail(`${key}: у ${u.name} здоровье ${u.hp}, щит ${u.sh}`);
            if (st.maxRounds !== o.maxRounds && !b.u[1].some(u => u.rank === 'rune')) fail(`${key}: предел раундов сменился`);
            if (st.rounds > st.maxRounds) fail(`${key}: раундов ${st.rounds} из ${st.maxRounds}`);
          } catch (e) { fail(`${key}: исключение — ${String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')}`); }
        }
      }
    },
  };
}
vm.runInContext('(' + helpers.toString() + ')()', ctx);

function suite() {
  const out = { errors: [], core: 0, battles: 0, specs: 0, attacks: 0, skips: 0, ults2: 0, allHits: 0, avers: 0, cuts: 0, casts: 0, bypass: 0, saves: 0, many: 0, ubers: [] };
  const fail = m => { if (out.errors.length < 80) out.errors.push(m); };
  const EB = window.EnBattle, RU = EB.RULES, E = window.EN_ECHO, TOP = E.steps.length;
  const draw = CK.draw, scan = (k, h) => CK.scan(fail, k, h), ints = (k, x) => CK.ints(fail, k, x);
  const events = b => { const ev = []; while (!b.over) { const a = EB.step(b); if (a) for (const e of a.ev) ev.push(e); } return ev; };

  const GUARD_LVL = 1;    // уровень отряда в проверках стража: на нём Мастер обучения успевает ударить обычной атакой. Было 25: у демо-отряда
                          // ADR-0031 (наборы, сжатые к максимуму, снаряжение демо) страж на 25-м падал на 3-м раунде, не ударив ни разу; было 5 —
                          // сценарий старта (01.10.2026) ослабил Мастера до 90 % здоровья, и демо-отряд на 5-м валил его до первого удара
  /* ---------- ядро: карты для проверки ---------- */
  const L = () => EB.lib();
  const kitOf = (ids, actPct, ultPct, extra) => Object.assign({ actPct, ultPct, kit: ids.map(id => ({ v: 0, slot: id.includes('.ult') ? 'ult' : id.includes('.react') ? 'react' : id.includes('.pas') ? 'pas' : 'act', id })) }, extra || {});
  const hero = (k, cls, st, kit, extra) => Object.assign({ key: 'h' + k, id: 'h' + k, name: 'Герой ' + k, cls, el: 'Земля', lvl: 60, st, kit, valor: 9 }, extra || {});
  const HEROES = (kit, extra) => [
    hero(1, 'Танк', [120, 60, 60, 260, 60], kit || kitOf([], 0, 0), extra), hero(2, 'Физ. ДД силы', [220, 60, 80, 120, 70], kit || kitOf([], 0, 0), extra),
    hero(3, 'Маг. ДД', [60, 220, 60, 110, 80], kit || kitOf([], 0, 0), extra), hero(4, 'Лекарь', [60, 200, 60, 140, 65], kitOf(['Вода.heal.one'], 3000, 0)),
    hero(5, 'Физ. ДД ловкости', [80, 60, 220, 110, 90], kit || kitOf([], 0, 0), extra)];
  const foe = (k, cls, extra) => Object.assign({ key: 'f' + k, id: 'f' + k, name: 'Враг ' + k, cls, el: 'Земля', lvl: 55, st: [110, 110, 40, 150, 60], rank: 'e', race: 'Эльфы', hpPct: 300, kit: kitOf([], 0, 0) }, extra || {});
  const MAIN = extra => foe(0, 'Физ. ДД силы', Object.assign({ rank: 'b', maxHp: 90000, hp: 90000 }, extra || {}));
  const GUARDS = () => [foe(1, 'Танк'), foe(2, 'Лекарь', { kit: kitOf(['Земля.heal.one'], 3000, 0) }), foe(3, 'Маг. ДД'), foe(4, 'Дебаффер')];
  const spec = (g, seed, main, guards) => ({ seed, g, main: main || MAIN(), guards: guards || (RU.echo.guards[g] ? GUARDS() : []) });

  /* 1. состав по типу, раунды, вход здоровья, детерминизм, итог сходится с боем */
  for (const [g, n] of [['o', 0], ['o', 3], ['e', 5], ['m', 1], ['m', 4], ['f', 5]]) { let threw = false; try { EB.echoBattle(HEROES(), { seed: 1, g, main: MAIN(), guards: GUARDS().concat(GUARDS()).slice(0, n) }); } catch (e) { threw = true; } if (!threw) fail(`ядро: бой Эхо «${g}» собрался с ${n} защитниками`); }
  /* раунды — одна таблица ядра на все режимы: RULES.rounds.by; Эхо — выборка по типу главного врага. Слово автора 01.10.2026 (ADR-0039):
     «на обычных врагов пусть будет 10 раундов, на элитных 15 раундов, на боссов 20 раундов, на рунных боссов 25 раундов, на Уберов 30
     раундов… забытый… будет иметь 50 раундов… ну и на КБ — 35 раундов»; «Пусть многоликий и будет 1 из забытых» — его раунды — ссылка
     на Забытого. Арена и Лига — 25: автор их не менял. Призванного «крафтового» типа больше нет */
  const BY = { o: 10, e: 15, b: 20, rune: 25, uber: 30, clan: 35, forgotten: 50, pvp: 25 };
  for (const k in BY) if (RU.rounds.by[k] !== BY[k]) fail(`ядро: RULES.rounds.by.${k} = ${RU.rounds.by[k]}, по слову автора — ${BY[k]}`);
  if (RU.rounds.by.many !== 'forgotten' || EB.roundsOf('many') !== BY.forgotten) fail(`ядро: Многоликий — ${RU.rounds.by.many} (${EB.roundsOf('many')} раундов), по слову автора он один из Забытых — ${BY.forgotten}`);
  if ('craft' in RU.echo.kind || 'craft' in RU.echo.guards) fail('ядро: в RULES.echo остался тип craft — «крафтового босса» как типа нет (ADR-0039)');
  /* защитников: четверо у всех, у Многоликого — ни одного: «Сделай чтобы многоликий был без свиты, и тогда его сразу же смогут убивать»
     (ответ автора 01.10.2026, ADR-0039); пробуждённые — тоже Забытые — свиту сохраняют */
  const WANT = { o: BY.o, e: BY.e, b: BY.b, u: BY.uber, f: BY.forgotten, m: BY.forgotten }, GW = { o: 4, e: 4, b: 4, u: 4, f: 4, m: 0 };
  for (const g in WANT) { if (RU.echo.rounds[g] !== WANT[g]) fail(`ядро: RULES.echo.rounds.${g} = ${RU.echo.rounds[g]}, по заданию — ${WANT[g]}`); if (RU.echo.guards[g] !== GW[g]) fail(`ядро: RULES.echo.guards.${g} = ${RU.echo.guards[g]}, а нужно ${GW[g]}`); }
  if (RU.rounds.rune !== BY.rune) fail(`ядро: RULES.rounds.rune = ${RU.rounds.rune}, а в таблице — ${BY.rune}`);
  for (const g of Object.keys(RU.echo.rounds)) for (let seed = 1; seed <= 12; seed++) {
    const key = `ядро · ${g} · сид ${seed}`, sp = spec(g, seed * 7919, MAIN({ hp: 40000 + seed * 1000 }), RU.echo.guards[g] ? GUARDS().map(x => Object.assign(x, { hp: 1 })) : []);
    const b0 = EB.echoBattle(HEROES(), sp), n = 1 + RU.echo.guards[g];
    if (b0.u[1].length !== n || b0.maxRounds !== RU.echo.rounds[g]) fail(`${key}: врагов ${b0.u[1].length}, раундов ${b0.maxRounds}`);
    // осада (RULES.siege, решение автора 29.09.2026): остаток здоровья на входе — максимум главного врага в этой атаке, прежний — max0
    if (b0.u[1][0].hp !== 40000 + seed * 1000 || b0.u[1][0].maxHp !== b0.u[1][0].hp || b0.u[1][0].max0 !== 90000 || !b0.u[1][0].lead) fail(`${key}: здоровье главного врага не с входа`);
    if (b0.u[1].slice(1).some(u => u.hp !== u.maxHp)) fail(`${key}: защитник не полный`);
    const b = EB.run(b0), st = EB.echoStats(b), st2 = EB.echoStats(EB.run(EB.echoBattle(HEROES(), sp)));
    out.core++;
    if (JSON.stringify(st) !== JSON.stringify(st2)) fail(`${key}: тот же сид — другой итог`);
    ints(key, st);
    if (st.rounds > st.maxRounds || st.maxRounds !== RU.echo.rounds[g]) fail(`${key}: раундов ${st.rounds} из ${st.maxRounds}`);
    if (st.why === 'sand' && st.rounds !== st.maxRounds) fail(`${key}: раунды вышли на ${st.rounds}`);
    if (!['kill', 'win', 'wipe', 'sand'].includes(st.why)) fail(`${key}: исход «${st.why}»`);
    if (st.main.hp0 - st.main.hp !== st.main.taken || st.main.hp !== b.u[1][0].hp || st.killed !== !b.u[1][0].alive) fail(`${key}: итог не сходится с боем`);
    const toMain = st.heroes.reduce((a, h) => a + h.toMain, 0);
    if (toMain !== b.u[1][0].taken) fail(`${key}: урон героев по главному ${toMain}, а он получил ${b.u[1][0].taken}`);
    if (st.heroes.some(h => h.toMain > h.dealt || h.dealt < 0 || h.healed < 0)) fail(`${key}: урон по главному больше всего урона героя`);
    if (st.kills !== st.foes.filter(f => f.dead).length || st.fallen !== st.heroes.filter(h => !h.alive).length) fail(`${key}: убитые и павшие не сходятся`);
    if (st.killed && !['kill', 'win'].includes(st.why)) fail(`${key}: главный враг пал, а исход «${st.why}»`);
  }
  const s1 = EB.echoStats(EB.run(EB.echoBattle(HEROES(), spec('e', 11)))), s2 = EB.echoStats(EB.run(EB.echoBattle(HEROES(), spec('e', 12))));
  if (JSON.stringify(s1) === JSON.stringify(s2)) fail('ядро: разные сиды дали один и тот же бой');
  if (JSON.stringify(EB.echoStats(EB.run(EB.echoBattle(HEROES().reverse(), spec('e', 11))))) !== JSON.stringify(s1)) fail('ядро: перестановка отряда изменила бой Эхо');

  /* 2. здоровье сохраняется между атаками; без лекаря-защитника цепочка добивает врага */
  for (const heal of [true, false]) {
    const guards = () => heal ? GUARDS() : GUARDS().map((g, k) => k === 1 ? foe(2, 'Физ. ДД силы') : g);
    let hp = 30000, total = 0, n = 0;
    while (hp > 0 && n < 60) {
      const st = EB.echoStats(EB.run(EB.echoBattle(HEROES(), spec('u', 500 + n, MAIN({ hp }), guards()))));
      if (st.main.hp0 !== hp || st.main.maxHp !== hp || st.main.max0 !== 90000) { fail('ядро: атака начала не с сохранённого здоровья'); break; }
      if (st.main.hp > st.main.hp0) { fail('ядро: осада — защитник вылечил главного врага выше остатка на входе, а это его максимум в атаке'); break; }
      total += st.main.taken; hp = st.main.hp; n++;
    }
    if (total !== 30000 - hp) fail(`ядро: за цепочку атак отнято ${total}, а здоровье ушло на ${30000 - hp}`);
    if (!heal && hp > 0) fail('ядро: без лекаря-защитника главный враг не пал за 60 атак цепочкой');
    out.core += n;
  }

  /* 3. пал главный враг — бой окончен */
  {
    let seen = false;
    for (let seed = 1; seed <= 30 && !seen; seed++) {
      const st = EB.echoStats(EB.run(EB.echoBattle(HEROES(), spec('u', seed, MAIN({ hp: 1 })))));
      if (!st.killed) continue;
      seen = true;
      if (st.why !== 'kill' && st.why !== 'win') fail(`ядро: главный враг пал, бой кончился «${st.why}»`);
      if (st.why === 'kill' && st.foes.slice(1).every(f => f.dead)) fail('ядро: «kill» при павших защитниках — должно быть «win»');
    }
    if (!seen) fail('ядро: главный враг с 1 здоровья ни разу не пал за 30 сидов');
  }

  /* 4. две ульты у одного врага */
  {
    const U2 = ['Огонь.ult.dmg', 'Огонь.ult.ctrl'], names = U2.map(id => L()[id].n);
    const uber = extra => MAIN(Object.assign({ rank: 'uber', el: 'Огонь', kit: kitOf(U2, 0, 8000) }, extra));
    const t = EB.create({ heroes: HEROES(), foes: [uber()], seed: 1, mode: 'rounds' }).u[1][0].table;
    if (t.filter(x => x.ult).length !== 2 || t.some(x => x.ch !== 4000)) fail(`ядро: две ульты — в таблице ${t.map(x => x.n + ' ' + x.ch).join(', ')}`);
    const t2 = EB.create({ heroes: HEROES(), foes: [MAIN({ kit: { actPct: 0, ultPct: 0, kit: [{ v: 0, slot: 'ult', id: U2[0], ch: 2500 }, { v: 0, slot: 'ult', id: U2[1], ch: 1500 }] } })], seed: 1, mode: 'rounds' }).u[1][0].table;
    if (t2.map(x => x.ch).join() !== '2500,1500') fail(`ядро: своя доля ульты не взята — ${t2.map(x => x.ch).join()}`);
    const cast = {};
    for (let seed = 1; seed <= 20; seed++) for (const e of events(EB.echoBattle(HEROES(), spec('u', seed, uber())))) if (e.k === 'cast' && e.ult && e.s.side === 1) cast[e.n] = (cast[e.n] || 0) + 1;
    for (const n of names) if (!cast[n]) fail(`ядро: ульта «${n}» у врага с двумя ультами не сработала за 20 боёв`);
    out.ults2 = names.filter(n => cast[n]).length;
  }

  /* 5. обычная атака по всем — свойство врага в данных */
  {
    const mk = (m, seed) => EB.echoBattle(HEROES(), spec('u', seed, m));
    const forms = [[MAIN({ basic: { tgt: 'all', coef: 60 }, kit: kitOf([], 0, 0) }), 60], [MAIN({ basicAll: 45, kit: kitOf([], 0, 0) }), 45], [MAIN({ basicAll: true }), RU.basicAllPct],
      [MAIN({ kit: kitOf([], 0, 0, { basicAll: 35 }) }), 35], [MAIN({ basic: { tgt: 'all' } }), RU.basicAllPct]];
    forms.forEach(([m, want], k) => { if (mk(m, 1).u[1][0].basicAll !== want) fail(`ядро: атака по всем, вид ${k + 1} — доля ${mk(m, 1).u[1][0].basicAll}, а не ${want}`); });
    let multi = 0, single = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const b = mk(forms[0][0], seed);
      while (!b.over) {
        const alive = b.u[0].filter(h => h.alive).length, a = EB.step(b);
        if (!a || !a.s || a.s !== b.u[1][0] || a.kind !== 'attack') continue;
        const sw = a.ev.filter(e => e.k === 'swing'), hits = new Set(a.ev.filter(e => (e.k === 'hit' || e.k === 'miss') && e.s === a.s && e.t.side === 0).map(e => e.t));
        if (!a.all || sw.length !== alive || sw.some(e => !e.all)) fail(`ядро: атака по всем замахнулась на ${sw.length} из ${alive} героев`);
        if (hits.size !== alive) fail(`ядро: атака по всем попала или промахнулась по ${hits.size} из ${alive} героев`);
        multi++; out.allHits += hits.size;
        break;
      }
      const c = mk(MAIN({ kit: kitOf([], 0, 0) }), seed);
      while (!c.over) { const a = EB.step(c); if (a && a.s === c.u[1][0] && a.kind === 'attack') { if (a.all || a.ev.filter(e => e.k === 'swing').length !== 1) fail('ядро: обычная атака без атаки по всем ударила не одного'); single++; break; } }
    }
    if (!multi || !single) fail('ядро: враг ни разу не ударил обычной атакой');
    const b = mk(forms[0][0], 3), T0 = b.u[0].map(h => h.th[0]);
    let grew = false;
    while (!b.over) { const a = EB.step(b); if (a && a.s === b.u[1][0] && a.kind === 'attack') { grew = b.u[0].some((h, j) => h.th[0] > T0[j]); break; } for (let j = 0; j < 5; j++) T0[j] = b.u[0][j].th[0]; }
    if (grew) fail('ядро: атака по всем подняла угрозу героев к врагу');
  }

  /* 6. расовая неприязнь героя Эхо */
  {
    const R = window.EN_ROSTER;
    if (R && R.rules && R.rules.aversionBp !== RU.aversionBp) fail(`ядро: неприязнь в ядре ${RU.aversionBp} б. п., в составе героев ${R.rules.aversionBp}`);
    const bp = RU.aversionBp, firstHit = (b, kind) => { while (!b.over) { const a = EB.step(b); if (a) for (const e of a.ev) if (e.k === kind && e.s && e.s.side === 0 && e.t.side === 1 && e.v > 0) return e; } return null; };
    for (let seed = 1; seed <= 12; seed++) {
      const base = firstHit(EB.echoBattle(HEROES(), spec('e', seed)), 'hit'), av = firstHit(EB.echoBattle(HEROES(null, { avers: { race: 'Эльфы' } }), spec('e', seed)), 'hit');
      const no = firstHit(EB.echoBattle(HEROES(null, { avers: { race: 'Звери' } }), spec('e', seed)), 'hit');
      if (!base || !av || !no) { fail(`ядро · неприязнь · сид ${seed}: нет удара героя`); continue; }
      if (av.s.key !== base.s.key || av.t.key !== base.t.key) { fail(`ядро · неприязнь · сид ${seed}: первый удар другой`); continue; }
      if (av.v !== Math.floor(base.v * (10000 + bp) / 10000) || !av.av) fail(`ядро · неприязнь · сид ${seed}: ${base.v} → ${av.v}, ждали ${Math.floor(base.v * (10000 + bp) / 10000)}`);
      if (no.v !== base.v || no.av) fail(`ядро · неприязнь · сид ${seed}: по чужой расе ${no.v} вместо ${base.v}`);
      const own = EB.echoBattle(HEROES(null, { avers: { race: 'Эльфы', bp: 5000 } }), spec('e', seed)).u[0][0].avers;
      if (!own || own.bp !== 5000) fail('ядро: своя прибавка неприязни героя не взята');
      out.avers++;
    }
    const dotKit = kitOf(['Огонь.dot.one'], 10000, 0), dot = (extra, seed) => firstHit(EB.echoBattle(HEROES(dotKit, extra), spec('e', seed)), 'dot');
    let dots = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const d0 = dot(null, seed), d1 = dot({ avers: { race: 'Эльфы' } }, seed);
      if (!d0 || !d1 || d0.s.key !== d1.s.key || d0.t.key !== d1.t.key) continue;
      dots++;
      if (d1.v < Math.floor(d0.v * (10000 + bp) / 10000) - 1 || d1.v <= d0.v) fail(`ядро · неприязнь · сид ${seed}: урон по времени ${d0.v} → ${d1.v}`);
    }
    if (!dots) fail('ядро: урон по времени героя ни разу не сработал');
  }

  /* 7. рунный страж: удар отнимает раунд (ADR-0020) */
  {
    /* правило ядра, а не баланс: отряд проверки — не выше GUARD_LVL, иначе отряд прототипа с доблестью валит стража обучения раньше его хода */
    const hs = S.squads[0].m.filter(Boolean).map(id => EB.heroSrc(Object.assign({}, H(id), { lvl: Math.min(H(id).lvl, GUARD_LVL) })));
    const b = EB.guardBattle(hs, 'b1', 'rounds'), max0 = b.maxRounds;
    if (max0 !== RU.rounds.rune) fail(`страж: предел ${max0}, а не ${RU.rounds.rune}`);
    let cut = 0;
    while (!b.over) {
      const before = b.maxRounds, a = EB.step(b); if (!a) continue;
      const cuts = a.ev.filter(e => e.k === 'cut').length;
      if (a.kind === 'attack' && a.s && a.s.rank === 'rune') {
        const want = before > a.round ? 1 : 0;
        if (cuts !== want || b.maxRounds !== Math.max(a.round, before - want * RU.rounds.runeCut)) fail(`страж: атака в раунде ${a.round} — предел ${before} → ${b.maxRounds}`);
      } else if (cuts) fail('страж: раунд отнят не обычной атакой стража');
      cut += cuts;
    }
    if (!cut) fail('страж: за бой ни одной обычной атаки стража');
    if (b.maxRounds < b.round) fail('страж: предел меньше сыгранных раундов');
    out.cuts += cut;
  }

  /* 8. приёмы из echo-foes.js: cast, ctrlBypass, lifeSave; способности вне библиотеки — EB.addLib */
  {
    EB.addLib([
      { id: 'Проверка.ult', n: 'Проверочный откат', set: 'Время', t: 'ult', k: 'heal', tier: 'one', trig: null, d: '', data: { tgt: 'self', targets: 1, ult: true, rewind: 3, ch: 1000, stat: 'main' } },
      { id: 'Проверка.react', n: 'Проверочный счёт', set: 'Время', t: 'react', k: 'reaction', tier: null, trig: 'half', d: '', data: { once: 'floor', cast: 'Проверка.ult' } },
      { id: 'Проверка.pas', n: 'Проверочный обод', set: 'Время', t: 'pas', k: 'passive', tier: null, trig: null, d: '', data: { pas: 'ctrlBypass', st: ['stop'] } },
      { id: 'Проверка.save', n: 'Проверочное спасение', set: 'Время', t: 'react', k: 'reaction', tier: null, trig: 'lethal', d: '', data: { survivePct: 30, once: 'life', unlessDot: 'Огонь' } },
    ]);
    if (!L()['Проверка.ult'] || L()['Проверка.ult'].kind !== 'heal' || !L()['Огонь.dmg.one']) fail('ядро: EB.addLib не положил способность в библиотеку или стёр общую');
    /* cast: ниже половины здоровья — «Проверочный откат» сразу, раз за бой. Здоровье главного — столько, сколько отряд снимает за весь
       бой Убера с «бездонного» главного: половину он теряет к середине боя при любом пределе раундов. Прежде стояло 46 000 — под бой
       в 50 раундов (ADR-0030); при 30 (ADR-0039) отряд снимал около 9 000, до половины не доходил, и реакция не срабатывала ни разу */
    const castHp = Math.max(1000, EB.echoStats(EB.run(EB.echoBattle(HEROES(), spec('u', 1, MAIN({ hp: 900000 }), GUARDS())))).main.taken);
    let casts = 0;
    for (let seed = 1; seed <= 15; seed++) {
      const b = EB.echoBattle(HEROES(), spec('u', seed, MAIN({ hp: castHp, kit: kitOf(['Проверка.react', 'Проверка.ult'], 0, 0) }), GUARDS()));
      let reacted = 0;
      while (!b.over) { const a = EB.step(b); if (!a) continue; const r = a.ev.findIndex(e => e.k === 'react' && e.id === 'Проверка.react'); if (r < 0) continue; reacted++; const c = a.ev.slice(r).find(e => e.k === 'cast' && e.s === b.u[1][0]); const blocked = b.u[1][0].st.some(s => ['stun', 'freeze', 'terror', 'knock', 'iceblock', 'silence', 'stop'].includes(s.k)); if (c && c.n === 'Проверочный откат') casts++; else if (!blocked) fail(`ядро · cast · сид ${seed}: реакция без способности`); }
      if (reacted > 1) fail(`ядро · cast · сид ${seed}: реакция «раз за бой» сработала ${reacted} раз`);
    }
    if (!casts) fail('ядро: способность по реакции (cast) ни разу не сработала');
    out.casts = casts;
    /* ctrlBypass: остановка ложится на клановый ранг (иммунитет 100 %) без броска; другой контроль — с броском */
    const stopKit = kitOf(['Время.ctrl.one'], 10000, 0), bypass = [0, 0], resist = [0, 0];
    for (const on of [true, false]) for (let seed = 1; seed <= 10; seed++) {
      const m = MAIN({ rank: 'clan', kit: kitOf(on ? ['Проверка.pas'] : [], 0, 0) });
      for (const e of events(EB.echoBattle(HEROES(stopKit), spec('u', seed, m)))) if (e.t && e.t.lead && e.t.side === 1) { if (e.k === 'status' && e.st === 'stop') bypass[on ? 0 : 1]++; if (e.k === 'resist' && e.st === 'stop') resist[on ? 0 : 1]++; }
    }
    if (!bypass[0] || resist[0]) fail(`ядро: ctrlBypass — остановка легла ${bypass[0]} раз, иммунитет сработал ${resist[0]} раз`);
    if (bypass[1] || !resist[1]) fail(`ядро: без ctrlBypass остановка легла на клановый ранг ${bypass[1]} раз`);
    out.bypass = bypass[0];
    /* lifeSave: смертельный удар оставляет 30 % — от максимума в этой атаке: остаток на входе (осада, RULES.siege), а не прежние 90 000;
       раз за жизнь цели — второй бой с сохранённым used уже не спасает */
    const SAVE_HP = 3000;
    const saveMain = used => MAIN({ hp: SAVE_HP, maxHp: 90000, used, kit: { actPct: 0, ultPct: 0, kit: [{ v: 0, slot: 'react', id: 'Проверка.save' }] } });
    let saved = null;
    for (let seed = 1; seed <= 30 && !saved; seed++) {
      const b = EB.echoBattle(HEROES(), spec('u', seed, saveMain([]))), ev = events(b), sv = ev.find(e => e.k === 'survive' && e.t === b.u[1][0]);
      if (!sv) continue;
      if (sv.hp !== Math.floor(SAVE_HP * 30 / 100)) fail(`ядро: lifeSave оставил ${sv.hp} здоровья, а не 30 % остатка на входе`);
      saved = EB.echoStats(b);
      if (!saved.main.used.includes('Проверка.save')) fail('ядро: сработавшее «раз за жизнь» не попало в итог');
    }
    if (!saved) fail('ядро: lifeSave ни разу не сработал');
    else {
      let again = 0;
      for (let seed = 1; seed <= 30; seed++) { const b = EB.echoBattle(HEROES(), spec('u', seed, saveMain(saved.main.used))); if (events(b).some(e => e.k === 'survive' && e.t === b.u[1][0])) again++; }
      if (again) fail(`ядро: спасение «раз за жизнь» сработало снова в ${again} боях`);
      out.saves++;
    }
  }


  /* 8б. остальные приёмы echo-foes.js и две правки ядра: удары hits делят коэффициент, «тепло» Огня снимает стужу */
  {
    const X = window.EN_ECHO_FOES;
    if (X) EB.addLib(X.abilities);   // уникальные способности Убер-боссов — как их кладёт экран Эхо (ensureLib); что экран кладёт их сам — сборка боя, п. 9
    const lib = L();
    EB.addLib([
      { id: 'Проверка.hit120', n: 'Проверочный удар', set: 'Воздух', t: 'act', k: 'dmg', tier: 'one', trig: null, d: '', data: { tgt: 'threat', targets: 1, ch: 2000, coef: 120, stat: 'main' } },
      { id: 'Проверка.name', n: 'Проверочное имя', set: 'Время', t: 'act', k: 'ctrl', tier: 'one', trig: null, d: '', data: { tgt: 'all', targets: null, ch: 2000, st: 'nameless', left: 3 } },
    ]);
    const flat = extra => Object.assign({ st: [150, 150, 0, 200, 60] }, extra || {});   // ловкость 0: без крита и уклонения — удар без случайности
    const hitsOf = (b, who, n) => { const out = []; while (!b.over && out.length < n) { const a = EB.step(b); if (a) for (const e of a.ev) if (e.k === 'hit' && e.s === who()) out.push(e); } return out; };
    /* hits: «Буря клинков» — пять ударов по 120 %, как у удара 120 % */
    {
      const mk = kit => EB.echoBattle(HEROES(null, null).map((h, k) => k === 0 ? Object.assign(h, flat({ kit })) : Object.assign(h, { kit: kitOf([], 0, 0) })), spec('u', 3, MAIN(flat({ el: 'Земля', hp: 90000 })), GUARDS().map(g => Object.assign(g, flat()))));
      const b5 = mk(kitOf(['Воздух.ult.dmg'], 0, 10000)), b1 = mk(kitOf(['Проверка.hit120'], 10000, 0));
      const h5 = hitsOf(b5, () => b5.u[0][0], 5), h1 = hitsOf(b1, () => b1.u[0][0], 1);
      if (h5.length !== 5 || !h1.length || h5.some(e => e.t !== h5[0].t) || h1[0].t.key !== h5[0].t.key) fail(`ядро · hits: ударов ${h5.length}, цель не та`);
      else if (h5.some(e => e.v !== h1[0].v)) fail(`ядро · hits: «Буря клинков» бьёт по ${h5.map(e => e.v).join(', ')}, удар 120 % — ${h1[0].v}`);
    }
    /* «тепло» Огня: лечение по времени снимает стужу */
    {
      const b = EB.echoBattle(HEROES().map((h, k) => k === 3 ? Object.assign(h, { kit: kitOf(['Огонь.hot.one'], 10000, 0) }) : h), spec('u', 5));
      const t = b.u[0][0]; t.hp = 10; t.st.push({ k: 'slow', left: 9, left0: 9, pow: 3000, breakPct: 0, evadeDown: 0 });
      let warm = false;
      while (!b.over && !warm) { const a = EB.step(b); if (a && a.s === b.u[0][3] && a.ab && a.ab.id === 'Огонь.hot.one') warm = true; }
      if (!warm) fail('ядро · тепло: «Очаг» не применился');
      else if (t.alive && t.st.some(s => s.k === 'slow')) fail('ядро · тепло: «Очаг» не снял стужу');
    }
    if (!X) fail('echo-foes.js не подключён: приёмы Убер-боссов не проверить');
    else {
      const U = id => ({ v: 0, slot: lib[id].t === 'react' ? 'react' : lib[id].t === 'pas' ? 'pas' : lib[id].t === 'ult' ? 'ult' : 'act', id });
      const kitU = (ids, actPct, ultPct) => ({ actPct, ultPct, kit: ids.map(U) });
      /* отложенный удар: метка спала — удар наложившего; наложенная заново метка лишь обновляет срок, как любой дебафф */
      let doom = 0;
      for (let seed = 1; seed <= 20 && !doom; seed++) {
        const b = EB.echoBattle(HEROES(), spec('u', seed, MAIN({ hp: 90000, kit: kitU(['Эхо.Люди.act2'], 3000, 0) })));
        while (!b.over) { const a = EB.step(b); if (!a) continue; const i = a.ev.findIndex(e => e.k === 'doom'); if (i < 0) continue; const e = a.ev[i]; if (e.s !== b.u[1][0] || !a.ev.slice(i).some(x => (x.k === 'hit' || x.k === 'miss') && x.s === e.s && x.t === e.t)) fail('ядро · doom: метка спала без удара наложившего'); doom++; break; }
      }
      if (!doom) fail('ядро · doom: отложенный удар ни разу не сработал');
      /* сила от союзников: −10 % урона за каждого живого союзника */
      {
        const first = pas => { const b = EB.echoBattle(HEROES(), spec('u', 4, MAIN({ hp: 90000, kit: kitU(pas, 0, 0) }))); while (!b.over) { const a = EB.step(b); if (a) for (const e of a.ev) if (e.k === 'hit' && e.t === b.u[1][0] && e.s.side === 0) return [e, b]; } return [null, b]; };
        const [e0] = first([]), [e1, b1] = first(['Эхо.Люди.pas']), p = lib['Эхо.Люди.pas'], n = b1.u[1].filter(v => v !== b1.u[1][0] && v.alive).length;
        if (!e0 || !e1) fail('ядро · guardPerAlly: нет удара по главному врагу');
        else if (e1.v !== Math.max(1, Math.floor(e0.v * Math.max(0, 100 - p.guardPct * n) / 100)) && e1.s === e0.s) fail(`ядро · guardPerAlly: ${e0.v} → ${e1.v} при ${n} живых союзниках`);
      }
      /* забрать эффекты: бафф и щит героя уходят к врагу */
      {
        let st = 0;
        for (let seed = 1; seed <= 8 && !st; seed++) {
          const b = EB.echoBattle(HEROES(), spec('u', seed, MAIN({ hp: 90000, kit: kitU(['Эхо.Искажённые.act2'], 10000, 0) })));
          for (const h of b.u[0]) { h.st.push({ k: 'dmgUp', left: 9, left0: 9, pow: 2000, breakPct: 0, evadeDown: 0 }); h.sh = 500; }
          while (!b.over && !st) { const a = EB.step(b); if (a && a.ev.some(e => e.k === 'steal' && e.s === b.u[1][0])) st = 1; }
          if (st && !(b.u[1][0].st.some(s => s.k === 'dmgUp') || b.u[1][0].sh > 0)) fail('ядро · steal: забранное не досталось врагу');
        }
        if (!st) fail('ядро · steal: эффекты ни разу не забраны');
      }
      /* цель для всех: пока метка на цели, обычные атаки союзников наложившего идут в неё */
      {
        let seen = 0;
        for (let seed = 1; seed <= 8 && !seen; seed++) {
          const b = EB.echoBattle(HEROES(), spec('u', seed, MAIN({ hp: 90000, kit: kitU(['Эхо.Дворфы.act1'], 10000, 0) })));
          while (!b.over) {
            const a = EB.step(b); if (!a) continue;
            const f = b.u[0].find(h => h.alive && h.st.some(s => s.focus));
            if (f && a.s && a.s.side === 1 && a.kind === 'attack' && !a.all) { seen++; if (!a.ev.some(e => e.k === 'swing' && e.t === f)) fail(`ядро · focus: обычная атака мимо цели для всех`); }
          }
        }
        if (!seen) fail('ядро · focus: цель для всех ни разу не проверена');
      }
      /* каждый N-й ход: каждый третий ход с действием — ульта вне очереди */
      {
        const b = EB.echoBattle(HEROES(), spec('u', 6, MAIN({ hp: 90000, kit: kitU(['Эхо.Аппараты.pas2', 'Эхо.Аппараты.ult1'], 0, 0) }))), m = b.u[1][0];
        let acted = 0, casts = 0;
        while (!b.over) { const a = EB.step(b); if (!a || a.s !== m) continue; if (a.kind !== 'skip') acted++; if (a.ev.some(e => e.k === 'cast' && e.s === m && e.n === lib['Эхо.Аппараты.ult1'].n)) { casts++; if (acted % 3 !== 0) fail(`ядро · everyN: ульта на ${acted}-м ходу`); } }
        if (!casts && acted >= 3) fail('ядро · everyN: каждый третий ход не сработал');
      }
      /* защита до метки: удар слабее на reduce %, под меткой — полный; отражение — часть прошедшего урона атакующему */
      {
        const first = (pas, mark) => { const b = EB.echoBattle(HEROES(), spec('u', 7, MAIN({ hp: 90000, kit: kitU(pas, 0, 0) }))); if (mark) b.u[1][0].st.push({ k: mark, left: 99, left0: 99, pow: 0, breakPct: 0, evadeDown: 0 }); while (!b.over) { const a = EB.step(b); if (a) for (let i = 0; i < a.ev.length; i++) { const e = a.ev[i]; if (e.k === 'hit' && e.t === b.u[1][0] && e.s.side === 0) return [e, a.ev.slice(i + 1), b]; } } return [null, [], b]; };
        const [e0] = first([]), [e1] = first(['Эхо.Аппараты.pas1']), [e2] = first(['Эхо.Аппараты.pas1'], 'mark'), w = lib['Эхо.Аппараты.pas1'];
        if (!e0 || !e1 || !e2) fail('ядро · ward: нет удара по главному врагу');
        else { if (e1.s === e0.s && e1.v !== Math.max(1, Math.floor(e0.v * (100 - w.reduce) / 100))) fail(`ядро · ward: ${e0.v} → ${e1.v}, ждали −${w.reduce} %`); if (e2.s === e0.s && e2.v !== e0.v) fail('ядро · ward: под меткой защита не молчит'); }
        const [e3, rest] = first(['Эхо.Саганы.pas']), r = lib['Эхо.Саганы.pas'];
        if (e3) { const back = rest.find(e => e.k === 'dot' && e.t === e3.s && e.s === e3.t); if (!back || back.v !== Math.floor(e3.v * r.reflect / 100)) fail(`ядро · ward: отражение ${back ? back.v : 'нет'}, ждали ${Math.floor(e3.v * r.reflect / 100)}`); }
      }
      /* повтор чужой ульты: после ульты героя враг повторяет её своими характеристиками */
      {
        let mir = 0;
        for (let seed = 1; seed <= 20 && !mir; seed++) {
          const b = EB.echoBattle(HEROES(kitOf(['Огонь.ult.dmg'], 0, 3000)), spec('u', seed, MAIN({ hp: 90000, kit: kitU(['Эхо.Искажённые.react'], 0, 0) })));
          for (const e of events(b)) if (e.k === 'cast' && e.s === b.u[1][0] && e.ult && e.n === lib['Огонь.ult.dmg'].n) mir++;
        }
        if (!mir) fail('ядро · mirror: враг ни разу не повторил ульту героя');
      }
      /* поднять павшего: павший союзник встаёт с pct % здоровья, раз за бой; поднимать некого — обычная атака */
      {
        let rev = 0;
        for (let seed = 1; seed <= 12; seed++) {
          const b = EB.echoBattle(HEROES(), spec('u', seed, MAIN({ hp: 90000, kit: kitU(['Эхо.Нежить.act2'], 10000, 0) }), GUARDS().map(g => Object.assign(g, { hpPct: 20 }))));
          const once = new Map(), p = lib['Эхо.Нежить.act2'];
          while (!b.over) {
            const deadBefore = b.u[1].some(v => !v.alive), a = EB.step(b); if (!a) continue;
            if (a.s === b.u[1][0] && !deadBefore && a.kind !== 'attack' && a.kind !== 'skip' && a.kind !== 'round') fail('ядро · revive: поднимать некого, а ход не в обычную атаку');
            for (const e of a.ev) if (e.k === 'revive') { rev++; once.set(e.t, (once.get(e.t) || 0) + 1); if (e.hp !== Math.max(1, Math.floor(e.t.maxHp * p.pct / 100)) || !e.t.alive) fail('ядро · revive: встал не с той долей здоровья'); }
          }
          for (const [t, n] of once) if (n > 1) fail(`ядро · revive: ${t.name} встал ${n} раз`);
        }
        if (!rev) fail('ядро · revive: павший ни разу не встал');
      }
      /* срезанное имя: под ним пассивки молчат — ctrlBypass не спасает от броска иммунитета */
      {
        let muted = 0, leak = 0;
        const hk = HEROES().map((h, k) => k === 0 ? Object.assign(h, { kit: kitOf(['Проверка.name'], 10000, 0) }) : k === 1 ? Object.assign(h, { kit: kitOf(['Время.ctrl.all'], 10000, 0) }) : h);
        for (let seed = 1; seed <= 20; seed++) {
          const b = EB.echoBattle(hk.map(h => Object.assign({}, h)), spec('u', seed, MAIN({ hp: 90000, rank: 'uber', kit: kitU(['Эхо.Эльфы.pas'], 0, 0) }))), m = b.u[1][0];
          while (!b.over) { const a = EB.step(b); if (a) for (const e of a.ev) if (e.k === 'resist' && e.t === m && e.st === 'stop') { if (m.st.some(s => s.k === 'nameless')) muted++; else leak++; } }
        }
        if (leak) fail(`ядро · nameless: ctrlBypass без срезанного имени пропустил бросок иммунитета ${leak} раз`);
        if (!muted) fail('ядро · nameless: под срезанным именем пассивка ни разу не замолчала');
      }
      /* урон по цели под эффектом: +pct % по цели со «срезанным именем» */
      {
        const first = pas => { const b = EB.echoBattle(HEROES(), spec('u', 9, MAIN(Object.assign({ hp: 90000, kit: kitU(pas, 0, 0) })))); for (const h of b.u[0]) h.st.push({ k: 'nameless', left: 99, left0: 99, pow: 0, breakPct: 0, evadeDown: 0 }); while (!b.over) { const a = EB.step(b); if (a) for (const e of a.ev) if (e.k === 'hit' && e.s === b.u[1][0]) return e; } return null; };
        const e0 = first([]), e1 = first(['Эхо.Забытые.pas']), p = lib['Эхо.Забытые.pas'];
        if (!e0 || !e1) fail('ядро · dmgVsSt: главный враг не ударил');
        else if (e1.t === e0.t && e1.v <= e0.v) fail(`ядро · dmgVsSt: по цели под «${p.st}» ${e0.v} → ${e1.v}, ждали +${p.pct} %`);
      }
    }
  }

  /* ---------- прототип ---------- */
  {   // демо: данных режима нет — враги, наборы и числа из ECH и библиотеки; затем те же бои на данных
    const XF0 = window.EN_ECHO_FOES, XR0 = window.EN_ECHO_RULES;
    window.EN_ECHO_FOES = null; window.EN_ECHO_RULES = null;
    try { CK.specLoop(out, fail, 'демо', false); } finally { window.EN_ECHO_FOES = XF0; window.EN_ECHO_RULES = XR0; }
    if (XF0 && XR0) CK.specLoop(out, fail, 'данные', true); else fail('echo-foes.js или echo-rules.js не подключены в index.html');
  }
  const clear = () => { S.overlay = null; S.echo.slots = S.echo.slots.map(() => null); S.ech.pending = {}; S.echo.sel = 0; S.route = 'echo'; S.runs = []; };

  /* 10. атака в прототипе: расход один раз, бой, «Пропустить», итог, здоровье между атаками */
  for (const w of RS.weeks) for (const c of [2, 5]) {
    const key = `${w.race} · цикл ${ROMAN[c]}`;
    try {
      CK.reset(w.race, c); clear();
      S.heroes.forEach(h => { h.lvl = Math.max(h.lvl, E.lvl(TOP, c)); });
      H(CK.ids()[1]).avers = { race: w.race };   // неприязнь героя доходит до боя: прибавка — RULES.aversionBp
      const x = E.target('step', 7 + (c % 4)); S.echo.slots[0] = x; S.echo.sel = 0;
      const souls0 = S.wallet.souls, cost = E.cost(x), hp0 = x.hp;
      if (!scan(key + ' · цель', draw()).includes(`data-a="echatk" data-v="${x.uid}:1"`)) fail(key + ': у кнопки атаки нет номера атаки');
      ACT.echatk(x.uid + ':1'); out.attacks++;
      const R = S.runs.find(r => r.kind === 'echo');
      if (!R || S.route !== 'battle' || S.focus !== R.id) { fail(key + ': атака не открыла бой'); continue; }
      if (S.wallet.souls !== souls0 - cost) fail(`${key}: атака стоила ${souls0 - S.wallet.souls}, а не ${cost}`);
      const h = scan(key + ' · бой', draw());
      if (!h.includes('data-a="echskip"') || !h.includes('Пропустить')) fail(key + ': в бою нет «Пропустить»');
      if (/class="ruler"[^>]*>\s*<i/.test(h)) fail(key + ': у боя Эхо линейка этажей');
      if ((h.match(/class="bc foe/g) || []).length !== 5) fail(key + ': на арене не пять врагов');
      if (R.b.u[1].length !== 5 || R.b.maxRounds !== E.rounds(x.g)) fail(key + ': бой не тот');
      if (!R.b.u[0].some(u => u.avers && u.avers.race === w.race && u.avers.bp === RU.aversionBp)) fail(key + ': неприязнь героя не дошла до боя');
      const art = w.race === 'Эльфы';
      if (art !== h.includes('arena-echo-ishkantun.jpg') || art !== /echo\/ik-\d\d\.jpg/.test(h)) fail(`${key}: арт арены и портретов Иш-Кантуна ${art ? 'не показан' : 'показан не своей неделе'}`);
      const snap = () => JSON.stringify([S.wallet.souls, S.echo.score, x.hp, x.atk, S.runs.length]), s1 = snap();
      ACT.echatk(x.uid + ':1'); ACT.echagain(`0:${x.uid}:1`); S.route = 'battle';
      if (snap() !== s1 || S.runs.find(r => r.kind === 'echo') !== R) fail(key + ': повтор атаки что-то изменил');
      const res = R.res.res, replay = EB.echoStats(EB.run(EB.echoBattle(R.heroes, E.fight(Object.assign({}, x, { hp: hp0, used: [] }), CK.ids(), 1).o)));
      if (JSON.stringify(EB.echoStats(EB.run(R.b))) !== JSON.stringify(res) || JSON.stringify(replay) !== JSON.stringify(res)) fail(key + ': просмотр и итог — разные бои');
      if (res.main.hp0 !== hp0 || (S.echo.slots[0] === x && x.hp !== res.main.hp)) fail(key + ': здоровье цели не из итога');
      ACT.echskip(R.id); out.skips++;
      if (!S.overlay || S.overlay.t !== 'echres' || S.route !== 'echo' || !R.over) { fail(key + ': «Пропустить» не открыло итог'); continue; }
      const g = scan(key + ' · итог', draw());
      for (const s of ['отнято здоровья', 'здоровье цели', 'раунд', 'по главному', 'лечение']) if (!g.includes(s)) fail(`${key}: в итоге нет «${s}»`);
      for (const u of R.b.u[0]) if (!g.includes(u.name)) fail(`${key}: в итоге нет героя ${u.name}`);
      if (!g.includes(`${res.rounds} / ${res.maxRounds}`)) fail(key + ': в итоге нет раундов');
      if (S.echo.slots[0] === x) {
        if (!g.includes(`data-a="echagain" data-v="0:${x.uid}:2"`)) fail(key + ': в итоге нет «Атаковать ещё»');
        const s2 = S.wallet.souls, hpMid = x.hp;
        ACT.echagain(`0:${x.uid}:2`); out.attacks++;
        const R2 = S.runs.find(r => r.kind === 'echo');
        if (!R2 || R2 === R || R2.res.res.main.hp0 !== hpMid || S.wallet.souls !== s2 - cost || x.atk !== 2) fail(key + ': вторая атака не с сохранённого здоровья');
        ACT.echskip(R2.id); scan(key + ' · итог 2', draw());
      }
      /* победа: очки и итог с победой */
      clear(); const y = E.target('step', 3); y.hp = 1; S.echo.slots[1] = y; S.echo.sel = 1; const sc = S.echo.score;
      for (let n = 1; n <= 40 && S.echo.slots[1] === y; n++) {
        ACT.echatk(`${y.uid}:${n}`); const Ry = S.runs.find(r => r.kind === 'echo' && !r.over);
        if (!Ry) { fail(key + ': атака по цели с 1 здоровья не началась'); break; }
        ACT.echskip(Ry.id); if (S.echo.slots[1] === y) S.overlay = null;
      }
      if (S.echo.slots[1] === y) fail(key + ': цель с 1 здоровья не пала за 40 атак');
      else { const g2 = scan(key + ' · победа', draw()); if (S.echo.score - sc !== E.pts(3, c) || !g2.includes('>Победа<') || (c >= LBX.modes.echo.from && !g2.includes('+' + fmt(E.pts(3, c))))) fail(key + ': итог победы без очков'); }
      /* Многоликий: вершина недели, бьётся один, без свиты (ADR-0039, ответ автора 01.10.2026); ресурс — своей недели */
      clear(); const m = E.target('step', TOP + 1); S.echo.slots[2] = m; S.echo.sel = 2; m.hp = 1;
      const many0 = BAG.qty('many');
      for (let n = 1; n <= 40 && S.echo.slots[2] === m; n++) {
        ACT.echatk(`${m.uid}:${n}`); const Rm = S.runs.find(r => r.kind === 'echo' && !r.over);
        if (!Rm) { fail(key + ': атака по Многоликому не началась'); break; }
        if (n === 1) { if (Rm.b.u[1].length !== 1 + RU.echo.guards.m || Rm.b.maxRounds !== EB.roundsOf('many')) fail(`${key}: у Многоликого ${Rm.b.u[1].length - 1} защитников и ${Rm.b.maxRounds} раундов`); if ((scan(key + ' · Многоликий · бой', draw()).match(/class="bc foe/g) || []).length !== 1 + RU.echo.guards.m) fail(key + ': на арене Многоликого не он один'); }
        ACT.echskip(Rm.id); if (S.echo.slots[2] === m) S.overlay = null;
      }
      if (S.echo.slots[2] === m) fail(key + ': Многоликий с 1 здоровья не пал за 40 атак');
      else {
        if (BAG.qty('many') !== many0 + RX.drops.echo.uber.count || S.ech.manyWk[w.race] !== RX.drops.echo.uber.count) fail(key + ': победа над Многоликим не дала ресурс своей недели');
        scan(key + ' · Многоликий пал', draw());
        /* привязка к неделе: на другой неделе этот Многоликий не активируется */
        const other = RS.weeks.find(v => v.race !== w.race);
        BAG.take('many', BAG.qty('many')); BAG.add('many', 1); S.ech.manyWk = { [w.race]: 1 };
        rsSetWeek(other.race); E.sync(); ACTIVATE.echo('many');
        if (!S.overlay || S.overlay.t !== 'echact' || E.checks('echo', BAG.item('many')).every(r => r.ok)) fail(key + ': Многоликий чужой недели активируется');
        scan(key + ' · Многоликий чужой недели', draw());
        rsSetWeek(w.race); E.sync(); S.overlay = null;
        if (!E.checks('echo', BAG.item('many')).every(r => r.ok) && BAG.item('many').cyc <= c) fail(key + ': Многоликий своей недели не активируется');
        out.many++;
      }
    } catch (e) { fail(`${key}: исключение — ${String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')}`); }
  }
  /* сценарий презентации: свёрнутый просмотр доигрывает бой, итог ждёт в верхней строке */
  {
    S = initialState(); S.runs = [];
    const f = FLOWS.find(x => x[0] === 'Эхо · бой и итог'); if (!f) fail('нет сценария «Эхо · бой и итог»'); else f[2]();
    const R = S.runs.find(r => r.kind === 'echo');
    if (!R) fail('сценарий: бой Эхо не начался');
    else {
      scan('сценарий · бой', draw());
      ACT.minimize();
      if (S.route !== 'echo') fail('сценарий: «Свернуть» увело не в Эхо');
      scan('сценарий · свёрнут', draw());
      for (let n = 0; !R.over && n < 5000; n++) advance(R, 250);
      if (!R.over || S.overlay) fail('сценарий: свёрнутый просмотр не дошёл до конца или открыл лист сам');
      if (!draw().includes(`data-a="focus" data-v="${R.id}"`)) fail('сценарий: итог боя Эхо не ждёт в верхней строке');
      ACT.focus(R.id);
      if (!S.overlay || S.overlay.t !== 'echres' || S.route !== 'echo') fail('сценарий: итог из верхней строки не открылся');
      scan('сценарий · итог', draw());
      if (JSON.stringify(EB.echoStats(R.b)) !== JSON.stringify(R.res.res)) fail('сценарий: доигранный просмотр разошёлся с итогом');
    }
  }

  /* 12. рунный страж со «Спуска» */
  {
    S = initialState(); S.route = 'descent'; S.selBiome = 'b1'; S.overlay = null;
    S.siege.b1 = { hp: null, max: null, killed: false };   // босс Мастерской ещё стоит (в демо Мастерская пройдена — босс пал): вход до босса
    let h = scan('Спуск', draw());
    if (/data-a="guard" data-v="gd\d+"/.test(h) || !/class="ds-st wait"/.test(h)) fail('Спуск: вход к стражу открыт до босса или не сказано, что страж ждёт за боссом');   // окно «Спуск» (screens/descent.js): до босса входа нет, состояние — «за боссом»
    if (!/class="[^"]*\bteam-only\b[^"]*" data-a="guard" data-v="demo"/.test(h)) fail('Спуск: демо-вход к стражу — не только для команды (режим «Игрок / Команда»)');
    ACT.guard('');
    if (S.runs.length) fail('Спуск: страж впустил до победы над боссом');
    S.heroes.forEach(x => { if (x.lvl > GUARD_LVL) x.lvl = GUARD_LVL; });   // правило, а не баланс: страж обучения должен успеть ударить
    ACT.guard('demo');
    let R = S.runs[S.runs.length - 1];
    if (!R || !R.guard || S.route !== 'battle') fail('Спуск: демо-вход не начал бой со стражем');
    else {
      h = scan('страж · бой', draw());
      if (!h.includes('удар стража') || !h.includes('Отнял страж') || !h.includes(`/ ${RU.rounds.rune}`)) fail('страж: в бою не видно, что удар стража отнимает раунд');
      S.route = 'descent';   // свёрнутый просмотр: холст fx.js песочница не рисует
      let cut = 0;
      for (let n = 0; !R.over && n < 20000; n++) { const b = R.b, m = b.maxRounds; advance(R, 250); if (R.b === b && b.maxRounds < m) cut += m - b.maxRounds; }
      if (!R.over) fail('страж: бой не кончился');
      if (!cut) fail('страж: за бой ни один раунд не отнят');
      out.cuts += cut;
      S.overlay = { t: 'result', arg: R.id }; scan('страж · итог', draw());
    }
    S = initialState(); G('b1').killed = true; S.route = 'descent'; S.selBiome = 'b1';
    h = scan('Спуск · босс пал', draw());
    if (!/data-a="guard" data-v="gd\d+"/.test(h)) fail('Спуск: после босса вход к стражу закрыт');
    ACT.guard('');
    R = S.runs[S.runs.length - 1];
    if (!R || !R.guard) fail('Спуск: после босса страж не впустил');
    const fl = FLOWS.find(x => x[0].startsWith('Рунный страж')); S = initialState(); fl[2]();
    if (!S.runs.some(r => r.guard)) fail('сценарий стража не начал бой');
  }


  /* 14. Многоликий при призыве (ADR-0025, ответ автора): отдельный бросок с шансом manySummonBp сверх лестницы, без «раз в неделю»;
     «Лик недели» платит likShards по циклу; биом Многоликого — здоровье и павшие героев переходят с этажа на этаж, главный враг
     этажа всегда полный — осады нет, попытка одна */
  {
    const R0 = window.EN_ECHO_RULES, count = (bp, n) => {
      window.EN_ECHO_RULES = bp == null ? R0 : Object.assign({}, R0 || {}, { manySummonBp: bp });
      let hit = 0; for (let k = 0; k < n; k++) { const o = E.draw(TOP, 3, 'проверка|призыв|' + k); if (o.includes(TOP + 1)) hit++; if (o.some(st => st < 1 || st > TOP + 1) || new Set(o).size !== o.length) fail('призыв: варианты ' + o.join(', ')); }
      return hit;
    };
    try {
      const half = count(5000, 400), none = count(0, 400), real = count(null, 100000), bp = E.manyBp();
      if (half < 140 || half > 260) fail(`призыв: при шансе 50 % Многоликий выпал ${half} раз из 400`);
      if (none) fail(`призыв: при шансе 0 Многоликий выпал ${none} раз`);
      if (real > bp * 100000 / 10000 * 4 + 5) fail(`призыв: при шансе ${bp} б. п. Многоликий выпал ${real} раз из 100 000`);
      out.manyDraw = `${real} из 100 000 при ${bp} б. п.`;
      const lik = RX.drops.craftBosses.find(b => b.id === 'lik');
      window.EN_ECHO_RULES = Object.assign({}, R0 || {}, { likShards: { '2': 7, '3': 11 } });
      if (E.likShards(2, lik) !== 7 || E.likShards(3, lik) !== 11) fail('Лик недели: осколки не из likShards по циклу');
      window.EN_ECHO_RULES = Object.assign({}, R0 || {}, { likShards: undefined });
      for (let c = 2; c <= 6; c++) {   // без likShards — доля heroShardsWeekBp от недельных осколков Эхо увлечённого (lootboxes.js, в сотых)
        const wk = LBX.week.echo[String(c)], want = lik.heroShardsWeekBp ? Math.floor(wk.fan.shards * lik.heroShardsWeekBp / 1000000) : lik.heroShardsWeek;
        if (E.likShards(c, lik) !== want || !(want > 0)) fail(`Лик недели · цикл ${ROMAN[c]}: без likShards ${E.likShards(c, lik)} осколков, а доля недельных — ${want}`);
      }
    } finally { window.EN_ECHO_RULES = R0; }
    /* биом Многоликого */
    CK.reset('Эльфы', 3); S.heroes.forEach(h => { h.lvl = Math.max(h.lvl, 3 * E.lvl(TOP, 3)); });   // отряд сильнее биома: этажей должно быть несколько — проверяем переход здоровья
    S.ech.biomes = []; S.runs = []; S.ech.manyWk = {}; BAG.add('many', 1);
    ACTIVATE.echo('many'); if (S.overlay && S.overlay.op) ACT.echactdo(S.overlay.op);
    const mb = S.ech.biomes.find(b => b.many);
    if (!mb) fail('биом Многоликого: не открылся из запасов');
    else {
      ACT.echmany(mb.uid);
      const R = S.runs.find(r => r.kind === 'many');
      if (!R) fail('биом Многоликого: забег не начался');
      else {
        if (R.b.u[1][0].hp !== R.b.u[1][0].maxHp) fail('биом Многоликого: главный враг этажа 1 не полный');
        const nx = R.scene.next; let floors = 1, carried = 0;
        R.scene.next = r => {
          const before = r.heroes.map(h => [h.key, h.hp, !!h.dead]);   // герои после прошлого этажа — через carry
          nx(r); floors++;
          for (const [key, hp, dead] of before) {
            const u = r.b.u[0].find(v => v.key === key);
            if (!u || u.alive === dead || (!dead && u.hp !== Math.min(hp, u.maxHp))) fail(`биом Многоликого · этаж ${r.floor}: ${key} пришёл не со своим здоровьем`);
            else if (!dead && hp < u.maxHp) carried++;
          }
          if (r.b.u[1][0].hp !== r.b.u[1][0].maxHp) fail(`биом Многоликого · этаж ${r.floor}: главный враг не полный — это осада`);
        };
        S.route = 'descent';
        for (let n = 0; !R.over && n < 40000; n++) advance(R, 500);
        if (!R.over) fail('биом Многоликого: забег не кончился');
        if (floors < 3) fail(`биом Многоликого: этажей ${floors} — переход здоровья не проверить`);
        else if (!carried) fail('биом Многоликого: здоровье героев между этажами восстановилось');
        if (S.ech.biomes.some(b => b.uid === mb.uid)) fail('биом Многоликого: после забега биом остался — попытка не одна');
        const runs0 = S.runs.length; ACT.echmany(mb.uid);
        if (S.runs.length !== runs0) fail('биом Многоликого: началась вторая попытка');
        out.manyFloors = `${R.taken.length} из ${TOP} этажей, ${R.end ? R.end.kind : '—'}`;
      }
    }
  }

  /* 15. срок жизни и осада (решение автора 29.09.2026): боссы, Убер и призванные враги живут час, рядовые и элиты — как было;
     у цели на час — отсчёт на карточке; срок вышел — цель исчезает. Атака: остаток здоровья цели — её полное здоровье в бою,
     прежний максимум — только в «Сведениях»; цена атаки призванного врага — раунды его типа × цена раунда цикла силы */
  {
    const R0 = window.EN_ECHO_RULES, hour = E.data.hour;
    CK.reset('Эльфы', 2);
    for (const [st, h] of [[1, 72], [7, 48], [11, 1], [TOP, 1]]) { const x = E.target('step', st); if (x.left !== h * hour) fail(`срок: ступень ${st} живёт ${x.left / hour} ч, а нужно ${h}`); }
    for (const fb of RX.drops.craftBosses) {
      const x = E.target('craft', fb), c = x.pcyc || x.cyc;
      if (x.left !== hour) fail(`срок: призванный враг ${fb.id} живёт ${x.left / hour} ч, а нужно 1`);
      if (R0 && R0.roundSouls && E.cost(x) !== E.rounds(x.g) * R0.roundSouls[Math.min(c, R0.roundSouls.length) - 1]) fail(`призванный враг ${fb.id}: цена атаки ${E.cost(x)} — не раунды типа × цена раунда`);
    }
    CK.reset('Эльфы', 2); S.echo.slots = [E.target('step', 11), E.target('step', 2), null, null]; S.echo.sel = 0;
    let h = scan('Эхо · босс на час', draw());
    if (!h.includes('ech-left')) fail('Эхо: у босса на час нет отсчёта на карточке цели');
    S.echo.sel = 1; h = scan('Эхо · рядовой', draw());
    if (h.includes('ech-left')) fail('Эхо: отсчёт на карточке у цели не на час');
    S.echo.slots[0].left = 0; E.sync();
    if (S.echo.slots[0] || !/срок цели в слоте 1 вышел/i.test(S.ech.note)) fail('Эхо: босс с вышедшим сроком не исчез');
    /* осада на экране: вторая атака по той же цели — в бой она выходит с остатком, и он — её максимум */
    const x = E.target('step', 11); S.echo.slots[0] = x; S.echo.sel = 0; x.hp = Math.floor(x.max / 2);
    const F = E.fight(x, CK.ids(), 1), b = EB.echoBattle(F.heroes, F.o), m = b.u[1][0];
    if (m.hp !== x.hp || m.maxHp !== x.hp || m.max0 !== x.max) fail(`осада: цель вышла в бой с ${m.hp} / ${m.maxHp} (прежний ${m.max0}), а на входе ${x.hp} из ${x.max}`);
  }

  /* 13. девять Убер-боссов против своих отрядов недели на циклах II, IV и VI: бой идёт без мусора, Убер срабатывает всеми приёмами.
     Здоровье Убера на входе — полное, 55 %, 3 % и 1 %: так случаются и реакции на половину здоровья, и смертельный удар. 1 % — с доблестью
     в ядре (29.09.2026): отряд недели Нежити при 3 % всегда добивает Царя горящим, а горящего его спасение «раз за жизнь» не держит */
  {
    const X = window.EN_ECHO_FOES, lib = L();
    if (!X) fail('Уберы: echo-foes.js не подключён');
    else for (const w of RS.weeks) {
      const uf = X.foes[`${w.race}#${TOP}`], wk = X.weeks.find(v => v.race === w.race), sqd = wk ? wk.squad : [];
      if (!uf || sqd.length !== 5 || sqd.some(id => !X.heroes[id])) { fail(`Убер ${w.race}: нет Убер-босса или отряда недели в echo-foes.js`); continue; }
      const seen = {}, mark = k => { seen[k] = (seen[k] || 0) + 1; };
      let kills = 0, fights = 0;
      for (const c of [2, 4, 6]) {
        CK.reset(w.race, c);
        const x = E.target('step', TOP);
        for (const frac of [100, 55, 3, 1]) for (let n = 1; n <= 6; n++) {
          const key = `Убер ${w.race} · цикл ${ROMAN[c]} · ${frac} % · ${n}`;
          try {
            const y = Object.assign({}, x, { hp: Math.max(1, Math.floor(x.max * frac / 100)), used: [] });
            const F = E.fight(y, sqd, frac * 10 + n), b = EB.echoBattle(F.heroes, F.o), m = b.u[1][0];
            if (n === 1 && frac === 100) {
              if (F.heroes.some(h => h.lvl !== F.o.main.lvl || !h.kit || !h.kit.kit.length)) fail(`${key}: отряд недели не на уровне врага или без наборов`);
              if (!F.heroes.some(h => h.avers && h.avers.race === w.race)) fail(`${key}: у отряда недели нет неприязни к расе своей недели`);
              if (m.rank !== 'uber' || m.table.filter(r => r.ult).length !== uf.kit.filter(k => k.slot === 'ult').length) fail(`${key}: ранг или ульты Убера не из данных`);
            }
            while (!b.over) {
              const a = EB.step(b); if (!a) continue;
              if (a.s === m && a.kind === 'attack' && a.all) mark('basic');
              for (const e of a.ev) if (e.k === 'cast' && e.s === m) mark('cast:' + e.n);
            }
            for (const id in b.cov) mark('cov:' + id);
            const st = EB.echoStats(b); CK.ints(fail, key, st);
            for (const side of [0, 1]) for (const u of b.u[side]) if (!Number.isInteger(u.hp) || u.hp < 0 || u.hp > u.maxHp) fail(`${key}: у ${u.name} здоровье ${u.hp}`);
            fights++; if (st.killed) kills++;
          } catch (e) { fail(`${key}: исключение — ${String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')}`); }
        }
      }
      const miss = [];
      for (const k of uf.kit) {
        const a = lib[k.id]; if (!a) { miss.push(k.id + ' — нет в библиотеке'); continue; }
        const nm = k.as || a.n, ok = k.slot === 'act' || k.slot === 'ult' ? seen['cast:' + nm] : seen['cov:' + k.id];
        if (!ok) miss.push(`«${nm}»`);
      }
      if (uf.basic && !seen.basic) miss.push('обычная атака по всем');
      if (miss.length) fail(`Убер ${w.race} «${uf.name}»: за ${fights} боёв не сработали — ${miss.join(', ')}`);
      out.ubers.push(`${w.race} ${kills}/${fights}`);
    }
  }
  return out;
}

const t0 = Date.now();
let res = {};
try { res = vm.runInContext('(' + suite.toString() + ')()', ctx); } catch (e) { err.push('сценарии: ' + (e.stack || e.message)); }
err.push(...(res.errors || []));
console.log(`Бой Эхо проверен за ${Math.round((Date.now() - t0) / 1000)} с: боёв ядра ${res.core}, сборок боя ${res.specs}, боёв прототипа ${res.battles}, атак ${res.attacks}, пропусков ${res.skips}, Многоликих ${res.many}; `
  + `двух ульт сработало ${res.ults2}, ударов атакой по всем ${res.allHits}, сидов неприязни ${res.avers}, раундов отнято стражем ${res.cuts}, способностей по реакции ${res.casts}, остановок мимо иммунитета ${res.bypass}.`);
if (res.ubers) console.log('Уберы против отрядов недели, побед над Убером из боёв: ' + res.ubers.join(' · ') + '.');
if (res.manyDraw) console.log(`Многоликий при призыве: ${res.manyDraw}; биом Многоликого — ${res.manyFloors}.`);
done();

function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log('Проверка пройдена: бой Эхо в ядре и прототипе, две ульты, атака по всем, неприязнь, Многоликий и рунный страж со «Спуска» — без исключений, undefined и NaN.');
  process.exit(0);
}
