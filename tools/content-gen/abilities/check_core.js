/* Автопроверка библиотеки в ядре боя прототипа: каждая из 339 способностей срабатывает без ошибок.
   Запуск из корня репозитория: node tools/content-gen/abilities/check_core.js
   Для каждой способности собирается бой, где у неё есть повод сработать: активная и ульта — с долей хода 100 %,
   пассивка и реакция — с опорными способностями, которые создают условие (дебафф своей школы, лечение, враг с ультой).
   Бой перебирает сиды, пока способность не сработает. Сработала:
   - активная и ульта — применение в ленте боя;
   - пассивка и реакция — счётчик b.cov ядра: он растёт, только когда поправка или ответ действительно применились;
   - фарм — добыча этажа изменилась против того же боя без фарма; где исход — бросок, хватает счётчика.
   Попутно проверяется инвариант: здоровье, щиты и добыча — только целые числа. Числа боёв — проверочные, не баланс.
   Наборы героев состава (ADR-0031, п. 7) — у каждого из героев roster.js есть набор в kits.js по его id:
   - шагов — максимум доблести + 1, по одной способности на доблесть 0…максимум, пустых доблестей нет;
   - доблесть 0 — активная, ульта — ровно на последней доблести;
   - способности — из библиотеки и школы героя (фарм-герою — ещё и фарм), редкость — как в составе;
   - ядро находит набор через EB.heroSrc; таблица шансов на каждой доблести открывает ровно открытые активные и ульты, доли целые;
   - id черновика ведёт к набору его героя в составе;
   - дымовой бой: пятеро героев каждого источника на личном максимуме доблести — без исключений, числа целые. */
'use strict';
const path = require('path');
const UI = path.join(__dirname, '../../../design/ui/');
globalThis.window = globalThis;
require(UI + 'abilities.js'); require(UI + 'kits.js'); require(UI + 'battle.js'); require(UI + 'roster.js');
const EB = globalThis.EnBattle, L = EB.lib(), A = globalThis.EN_ABILITIES;
const SEEDS = 40;

/* Опора для пассивок и реакций: что должно быть в наборе испытуемого, чтобы условию было откуда взяться */
const SUPPORT = {
  dmgWhileDot: p => [p.school + '.dot.one'], dotLeft: p => [p.school + '.dot.one'], supportWhileDot: p => [p.school + '.dot.one', 'Вода.heal.one'],
  dmgVsDebuff: p => [p.school + '.debuff.one'], shieldUp: p => [p.school + '.shield.one'], speedWhileDot: p => [p.school + '.dot.one'],
  debuffLeft: p => [p.school + '.debuff.one'], dotDrain: p => [p.school + '.dot.one'], cleanseBleedOnHeal: () => ['Вода.heal.one'],
  healVsLow: () => ['Вода.heal.one'], hotLeft: p => [p.school + '.hot.one'], defWhileHot: p => [p.school + '.hot.one'], dmgVsDot: p => [p.school + '.dot.one'],
  react: p => p.trig === 'kill' && p.then === 'spreadDot' ? [p.school + '.dot.one'] : [],
};
const FOE_KITS = [   // враги-провокаторы: ульта по всем, дебаффы, контроль, урон по времени с кровотечением, крит
  { cls: 'Босс', rank: 'b', ultPct: 3000, actPct: 3000, kit: ['Вода.ult.dmg', 'Земля.dmg.one'] },
  { cls: 'Дебаффер', rank: 'e', ultPct: 0, actPct: 6000, kit: ['Воздух.debuff.one', 'Тьма.debuff.one'] },
  { cls: 'Контроль', rank: 'e', ultPct: 0, actPct: 6000, kit: ['Без школы.ctrl.one>threat', 'Свет.ctrl.one'] },   // >threat — правило цели: оглушение идёт в танка
  { cls: 'Физ. ДД ловкости', rank: 'o', ultPct: 0, actPct: 5000, kit: ['Без школы.dot.one', 'Огонь.dot.one'] },
  { cls: 'Физ. ДД силы', rank: 'o', ultPct: 0, actPct: 3000, kit: ['Земля.dmg.one'] },
];
const kitOf = (ids, actPct, ultPct) => ({ actPct, ultPct, kit: ids.map(s => {
  const [id, tgt] = s.split('>');
  return Object.assign({ v: 0, slot: id.includes('.ult.') ? 'ult' : L[id] && L[id].t === 'react' ? 'react' : L[id] && L[id].t === 'pas' ? 'pas' : 'act', id }, tgt ? { tgt } : {});
}) });
const unit = (key, cls, lvl, st, kit, extra) => Object.assign({ key, id: key, name: key, cls, el: 'Земля', lvl, st, kit, valor: 0 }, extra || {});

/* Жёсткий бой: испытуемый — танк с высокой ловкостью (криты и уклонение), в отряде лекарь, слабый союзник и бойцы; враги сильнее. */
function hardBattle(tester, seed, soft) {
  const heroes = [
    unit('h0', 'Танк', soft ? 60 : 40, [120, 120, 200, 260, 60], tester),
    unit('h1', 'Хилер', 40, [60, 200, 60, 150, 70], kitOf(['Вода.heal.one', 'Вода.hot.one'], 6000, 0)),
    unit('h2', 'Маг. ДД', 5, [40, 60, 40, 20, 40], kitOf([], 0, 0)),
    unit('h3', 'Физ. ДД силы', 40, [200, 60, 80, 120, 60], kitOf([], 0, 0)),
    unit('h4', 'Физ. ДД ловкости', 40, [80, 60, 200, 120, 80], kitOf([], 0, 0)),
  ];
  const foes = FOE_KITS.map((f, i) => unit('f' + i, f.cls, soft ? 30 : 45, [150, 150, 250, 200, 50], kitOf(f.kit, f.actPct, f.ultPct), { rank: f.rank, hpPct: 150 }));
  return EB.create({ heroes, foes, seed, mode: 'rounds' });
}
/* Лёгкий бой для фарма: сильный отряд против слабой колоды с боссом и элитами — этаж берётся, добыча считается. */
function farmBattle(tester, seed) {
  const heroes = [unit('h0', 'Физ. ДД силы', 80, [250, 100, 150, 200, 80], tester)]
    .concat([1, 2, 3, 4].map(i => unit('h' + i, 'Физ. ДД силы', 80, [250, 100, 150, 200, 60], kitOf([], 0, 0))));
  const foes = ['b', 'e', 'e', 'o', 'o'].map((rank, i) => unit('f' + i, rank === 'b' ? 'Босс' : 'Танк', 5, [40, 40, 40, 60, 30], kitOf([], 0, 0), { rank, hpPct: 300 }));
  return EB.create({ heroes, foes, seed, mode: 'rounds' });
}

const ints = [];
function run(b) {
  const casts = {};
  while (!b.over) { const a = EB.step(b); if (a && a.ev) for (const e of a.ev) if (e.k === 'cast') casts[e.n] = (casts[e.n] || 0) + 1; }
  for (const side of [0, 1]) for (const u of b.u[side]) for (const k of ['hp', 'sh']) if (!Number.isInteger(u[k])) ints.push(`${u.key}.${k}=${u[k]}`);
  return casts;
}
const lootOf = (b, floor) => { const x = EB.floorLoot('b1', floor, b, 0); for (const k of ['gold', 'spirit', 'souls', 'keys', 'base', 'unique']) if (!Number.isInteger(x[k])) ints.push(`добыча.${k}=${x[k]}`); return x; };
const same = (x, y) => ['gold', 'spirit', 'souls', 'keys', 'base', 'unique'].every(k => x[k] === y[k]);
const RANDOM_FARM = ['baseResMul', 'keyCh', 'uniqueAdd', 'doubleCh', 'rareMul'];   // исход — бросок добычи: достаточно, что бонус учтён
const NO_TARGET = ['resCapAdd'];   // в Мастерской ресурсов с рядовых нет — пассивке нечего увеличивать (вопрос автору)

function check(x) {
  const p = L[x.id];
  if (p.kind === 'farm') {
    const slotIds = [x.id];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const act = p.t === 'act' ? 10000 : 0, ult = p.t === 'ult' ? 10000 : 0;
      const b = farmBattle(kitOf(slotIds, act, ult), seed), b0 = farmBattle(kitOf([], 0, 0), seed);
      run(b); run(b0);
      if (!b.win || !b0.win) continue;
      const got = lootOf(b, 20), base = lootOf(b0, 20);
      if (!b.cov[x.id]) continue;
      if (NO_TARGET.some(k => p[k] != null)) return { ok: true, note: 'нет цели в экономике' };
      if (RANDOM_FARM.some(k => p[k] != null) || p.onKill && p.onKill.baseResAdd) return { ok: true, note: 'учтён бонус к броску' };
      if (!same(got, base)) return { ok: true };
    }
    return { ok: false, why: 'добыча не изменилась' };
  }
  if (p.t === 'act' || p.t === 'ult') {
    for (let seed = 1; seed <= SEEDS; seed++) { const casts = run(hardBattle(kitOf([x.id], p.t === 'act' ? 10000 : 0, p.t === 'ult' ? 10000 : 0), seed, true)); if (casts[p.n]) return { ok: true }; }
    return { ok: false, why: 'не применилась' };
  }
  const sup = (SUPPORT[p.pas] || SUPPORT[p.t === 'react' ? 'react' : ''] || (() => []))(p);
  for (let seed = 1; seed <= SEEDS; seed++) for (const soft of [false, true]) {
    const b = hardBattle(kitOf([x.id].concat(sup), sup.length ? 6000 : 0, 0), seed, soft);
    run(b);
    if (b.cov[x.id]) return { ok: true };
  }
  return { ok: false, why: 'условие не наступило' };
}

const all = A.sets.flatMap(s => s.items);
let ok = 0; const bad = [], notes = [];
for (const x of all) {
  let r;
  try { r = check(x); } catch (e) { r = { ok: false, why: 'ошибка: ' + String(e && e.stack || e).split('\n').slice(0, 2).join(' | ') }; }
  if (r.ok) { ok++; if (r.note) notes.push(`${x.id} «${x.n}» — ${r.note}`); } else bad.push(`${x.id} «${x.n}» — ${r.why}`);
}
console.log(`Способностей ${all.length}: сработали ${ok}, не сработали ${bad.length}.`);
for (const s of notes) console.log('  · ' + s);
for (const s of bad) console.log('  ✗ ' + s);

/* ---------- наборы героев состава (ADR-0031, п. 7) ---------- */
const RS = globalThis.EN_ROSTER, K = globalThis.EN_KITS;
const RARITY = ['обычная', 'редкая', 'уникальная', 'эпическая', 'древняя', 'первородная', 'вневременная'];   // §3.1: r героя состава — 1…7
const CORE_CLS = { 'танк': 'Танк', 'лекарь': 'Лекарь', 'контроль': 'Контроль', 'маг ДД': 'Маг. ДД', 'физ ДД силы': 'Физ. ДД силы',
  'физ ДД ловкости': 'Физ. ДД ловкости', 'фармер': 'Физ. ДД ловкости' };   // класс ядра — как HR_DATA.cls в screens/heroes.js
const kitBad = [];
const rosterSrc = h => EB.heroSrc({ id: h.id, name: h.id, cls: CORE_CLS[h.cl[0]] || 'Танк', el: h.sch, lvl: 40, st: [150, 150, 150, 150, 150],
  ab: [], pas: [], ult: null, draft: h.id, valor: h.maxV });
let steps = 0;
for (const h of RS.heroes) {
  const k = K.heroes[h.id], where = `${h.id} ${h.n}`, M = h.maxV;
  if (!k) { kitBad.push(`${where}: нет набора`); continue; }
  const vs = k.kit.map(x => x.v).join(), ults = k.kit.filter(x => x.slot === 'ult').map(x => x.v).join();
  if (k.maxV !== M) kitBad.push(`${where}: максимум доблести в наборе ${k.maxV}, в составе ${M}`);
  if (k.kit.length !== M + 1) kitBad.push(`${where}: шагов ${k.kit.length}, а максимум доблести + 1 — ${M + 1}`);
  if (vs !== Array.from({ length: M + 1 }, (_, i) => i).join()) kitBad.push(`${where}: доблести набора ${vs} — пустая доблесть или две способности на одной`);
  if (!k.kit.length || k.kit[0].slot !== 'act') kitBad.push(`${where}: доблесть 0 — не активная`);
  if (ults !== String(M)) kitBad.push(`${where}: ульта не ровно на последней доблести ${M} — ${ults || 'ульты нет'}`);
  const farm = h.cl[0] === 'фармер', school = farm || h.sch === 'без стихии' ? 'Без школы' : h.sch;
  for (const x of k.kit) {
    const a = L[x.id];
    if (!a) { kitBad.push(`${where}: ${x.id} — нет в библиотеке`); continue; }
    if (a.school !== school && !(farm && a.school === 'Фарм')) kitBad.push(`${where}: ${x.id} — не школа героя «${school}»`);
  }
  if (k.rarity !== RARITY[h.r - 1]) kitBad.push(`${where}: редкость набора «${k.rarity}», в составе «${RARITY[h.r - 1]}»`);
  if (rosterSrc(h).kit !== k) kitBad.push(`${where}: EB.heroSrc не находит набор по id героя`);
  for (let v = 0; v <= M; v++) {
    const T = EB.chanceTable({ kit: k, valor: v }), want = k.kit.filter(x => x.v <= v && (x.slot === 'act' || x.slot === 'ult')).length;
    const sum = T.reduce((s, x) => s + x.ch, 0);
    if (T.length !== want) kitBad.push(`${where}: на доблести ${v} в таблице шансов ${T.length} способностей, открыто ${want}`);
    if (!T.every(x => Number.isInteger(x.ch) && x.ch >= 0) || sum > 10000) kitBad.push(`${where}: на доблести ${v} доли хода не целые или больше 100 % — ${sum}`);
    steps++;
  }
}
const drafts = Object.entries(K.drafts || {});
for (const [d, id] of drafts) {
  const h = RS.heroes.find(x => x.team && x.team.draft === d);
  if (!h || h.id !== id) kitBad.push(`черновик ${d} ведёт к ${id}, в составе — ${h ? h.id : 'нет героя'}`);
  if (K.heroes[d] !== K.heroes[id]) kitBad.push(`черновик ${d}: набор не тот же, что у героя ${id}`);
}
/* дымовой бой: пятеро героев одного источника, взятых по составу вразброс, на личном максимуме доблести против врагов-провокаторов */
const bySrc = {};
for (const h of RS.heroes) (bySrc[h.src] = bySrc[h.src] || []).push(h);
let smoke = 0;
for (const [src, hs] of Object.entries(bySrc)) for (const seed of [1, 2]) {
  const step = Math.max(1, Math.floor(hs.length / 5)), heroes = hs.filter((_, i) => i % step === 0).slice(0, 5).map(rosterSrc);
  const foes = FOE_KITS.map((f, i) => unit('f' + i, f.cls, 40, [150, 150, 250, 200, 50], kitOf(f.kit, f.actPct, f.ultPct), { rank: f.rank, hpPct: 150 }));
  try { run(EB.create({ heroes, foes, seed, mode: 'rounds' })); smoke++; } catch (e) { kitBad.push(`бой героев «${src}», сид ${seed}: ${String(e && e.message || e)}`); }
}
console.log(`Наборы героев состава: ${RS.heroes.length} героев, набор по id — у ${RS.heroes.filter(h => K.heroes[h.id]).length}; шагов по доблести ${steps}, `
  + `черновиков ведёт к герою ${drafts.length}; дымовых боёв ${smoke}${kitBad.length ? `, нарушений ${kitBad.length}` : ', нарушений нет'}.`);
for (const s of kitBad.slice(0, 40)) console.log('  ✗ ' + s);
if (ints.length) console.log('  ✗ не целые числа: ' + ints.slice(0, 10).join(', '));
process.exitCode = bad.length || ints.length || kitBad.length ? 1 : 0;
