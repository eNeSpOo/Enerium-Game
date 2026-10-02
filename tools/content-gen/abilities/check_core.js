/* Автопроверка библиотеки в ядре боя прототипа: каждая способность библиотеки срабатывает без ошибок.
   Запуск из корня репозитория: node tools/content-gen/abilities/check_core.js
   Для каждой способности собирается бой, где у неё есть повод сработать: активная и ульта — с долей хода 100 %,
   пассивка и реакция — с опорными способностями, которые создают условие (дебафф своей школы, лечение, враг с ультой).
   Бой перебирает сиды, пока способность не сработает. Сработала:
   - активная и ульта — применение в ленте боя;
   - пассивка и реакция — счётчик b.cov ядра: он растёт, только когда поправка или ответ действительно применились;
   - фарм — добыча этажа изменилась против того же боя без фарма; где исход — бросок, хватает счётчика.
   Попутно проверяется инвариант: здоровье, щиты и добыча — только целые числа. Числа боёв — проверочные, не баланс.
   Сборные герои (ADR-0050):
   - сочетание: в ходе, где оно применено, действуют обе части — по событиям боя; цели второй части с правилом same — среди целей
     первой; коэффициенты частей — не больше доли rules.comboPct своих, контроль, дебафф и бафф — не длиннее своих: за ход сочетание
     даёт не больше 120 % одной способности;
   - аура party гаснет с гибелью героя: с павшим хозяином пассивка не срабатывает ни разу;
   - «любой контроль»: «Удар по скованному» срабатывает по цели под контролем чужой школы;
   - имена сочетаний и черт не повторяют имён способностей врагов и уникальных способностей Эхо и биомов (Б5).
   Наборы героев состава (ADR-0050, законы Н1, Н2, Н5, Н8 — зеркало законов assign.py на выгрузке kits.js) — у каждого героя roster.js:
   - на доблести 0 — пара: одна активная и одна черта (пассивка или реакция); записей — максимум доблести + 2;
   - с доблести 1 — по одной записи на доблесть, на последней — ульта; вторая ульта — только ульта-сочетание на предпоследней
     доблести у героя с максимумом от 4;
   - активные и ульты — школы героя или «Без школы», сочетание — школы героя или «Без школы», двух стихий — не у героя за золото;
     редкость — как в составе;
   - наборы пятёрки обучения — как в принятом проекте (TUT ниже);
   - ядро находит набор через EB.heroSrc; таблица шансов на каждой доблести открывает ровно открытые активные и ульты, доли целые;
   - id черновика ведёт к набору его героя в составе;
   - дымовой бой: пятеро героев каждого источника на личном максимуме доблести — без исключений, числа целые.
   Закон базы по циклу (слово автора 02.10.2026, ADR-0050: «герои… с новых циклов по базовым статам больше, чем герои с низких циклов»):
   у героя старшего цикла атака, здоровье и защита на том же уровне и без доблести выше, чем у героя младшего цикла того же класса, —
   при любом источнике; внутри цикла источник базу не меняет. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const UI = path.join(__dirname, '../../../design/ui/');
globalThis.window = globalThis;
require(UI + 'abilities.js'); require(UI + 'kits.js'); require(UI + 'battle.js'); require(UI + 'roster.js');
const EB = globalThis.EnBattle, L = EB.lib(), A = globalThis.EN_ABILITIES;
const SEEDS = 40;

/* Наборы пятёрки обучения — принятый проект с ответами автора 02.10.2026 (ADR-0050): [активка, черта, ульта] */
const TUT = {
  'c1-01': ['Пробивающий удар', 'Кураж', 'Боевой гимн'],
  'c1-02': ['Осыпание', 'Трещина в броне', 'Каменная крепость'],
  'c1-11': ['Искра', 'Пепельный след', 'Великий пожар'],
  'c1-04': ['Свежий ветер', 'Шелест листвы', 'Весенний ветер'],
  'c1-05': ['Ледяные оковы', 'Крепкий лёд', 'Великое оледенение'],
};

/* Опора для пассивок и реакций: что должно быть в наборе испытуемого, чтобы условию было откуда взяться */
const stGiver = st => { const x = A.sets.flatMap(s => s.items).find(a => a.t === 'act' && a.tier === 'one' && a.data && a.data.st === st); return x ? x.id : null; };
const SUPPORT = {
  dmgWhileDot: p => [p.school + '.dot.one'], dotLeft: p => [p.school + '.dot.one'], supportWhileDot: p => [p.school + '.dot.one', 'Вода.heal.one'],
  dmgVsDebuff: p => [p.ctrl ? 'Без школы.ctrl.one>threat' : p.st ? stGiver(p.st) + '>threat' : p.school + '.debuff.one'],   // свой эффект st или любой контроль — в цель героя
  shieldUp: p => [p.school + '.shield.one'], speedWhileDot: p => [p.school + '.dot.one'],
  debuffLeft: p => [p.school + '.debuff.one'], dotDrain: p => [p.school + '.dot.one'], cleanseBleedOnHeal: () => ['Вода.heal.one'],
  healVsLow: () => ['Вода.heal.one'], hotLeft: p => [p.school + '.hot.one'], defWhileHot: p => [p.school + '.hot.one'], dmgVsDot: p => [p.school + '.dot.one'],
  hotAura: p => [p.school + '.hot.one'], ctrlFirm: p => [stGiver(p.st)],
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
function hardBattle(tester, seed, soft, extra) {
  const heroes = [
    unit('h0', 'Танк', soft ? 60 : 40, [120, 120, 200, 260, 60], tester, extra),
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
/* прогон боя: применения по именам; steps — ходы с событиями (для сочетаний) */
function run(b, steps) {
  const casts = {};
  while (!b.over) { const a = EB.step(b); if (a && a.ev) { if (steps) steps.push(a); for (const e of a.ev) if (e.k === 'cast') casts[e.n] = (casts[e.n] || 0) + 1; } }
  for (const side of [0, 1]) for (const u of b.u[side]) for (const k of ['hp', 'sh']) if (!Number.isInteger(u[k])) ints.push(`${u.key}.${k}=${u[k]}`);
  return casts;
}
const lootOf = (b, floor) => { const x = EB.floorLoot('b1', floor, b, 0); for (const k of ['gold', 'spirit', 'souls', 'keys', 'base', 'unique']) if (!Number.isInteger(x[k])) ints.push(`добыча.${k}=${x[k]}`); return x; };
const same = (x, y) => ['gold', 'spirit', 'souls', 'keys', 'base', 'unique'].every(k => x[k] === y[k]);
const RANDOM_FARM = ['baseResMul', 'keyCh', 'uniqueAdd', 'doubleCh', 'rareMul'];   // исход — бросок добычи: достаточно, что бонус учтён
const NO_TARGET = ['resCapAdd'];   // в Мастерской ресурсов с рядовых нет — пассивке нечего увеличивать (вопрос автору)

/* след части способности в событиях хода: что должно случиться, если часть подействовала хотя бы на одну цель */
function partSeen(part, school, ev, self) {
  const st = (k, sch) => ev.some(e => e.k === 'status' && e.s === self && e.st === k && (!sch || e.school === sch));
  switch (part.kind) {
    case 'dmg': return ev.some(e => (e.k === 'hit' || e.k === 'miss' || e.k === 'unhurt') && e.s === self);
    case 'heal': return ev.some(e => e.k === 'heal' && e.s === self && !e.quiet);
    case 'shield': return ev.some(e => e.k === 'shield' && e.s === self);
    case 'dot': case 'hot': return st(part.kind, school);
    default: return st(part.st) || ev.some(e => e.k === 'resist' && e.s === self && e.st === part.st) || ev.some(e => e.k === 'react' && e.t === self);   // контроль мог упереться в иммунитет, дебафф — в отражение
  }
}
/* сочетание: обе части подействовали в одном ходе; цели same — среди целей первой части; числа — по правилу силы */
function checkCombo(x) {
  const p = L[x.id], out = [], pct = A.rules.comboPct, parts = (p.parts || []).map(id => L[id]);
  if (!p.also || parts.length !== 2 || parts.some(a => !a)) return ['нет второй части или частей нет в библиотеке'];
  if (!!parts[0].ult !== !!parts[1].ult || !!p.ult !== !!parts[0].ult) out.push('части разного уровня: две активки или две ульты');
  [[p, parts[0]], [p.also, parts[1]]].forEach(([c, a], i) => {
    if (c.kind !== a.kind) out.push(`часть ${i + 1}: вид ${c.kind}, у «${a.n}» — ${a.kind}`);
    if (c.coef != null && a.coef != null && c.coef * 100 > a.coef * pct) out.push(`часть ${i + 1}: коэффициент ${c.coef} больше ${pct} % от ${a.coef}`);
    if (['ctrl', 'debuff', 'buff'].includes(c.kind) && c.left > a.left) out.push(`часть ${i + 1}: эффект длиннее, чем у «${a.n}»`);
    for (const k of ['coef', 'left', 'pow', 'max', 'stacks']) if (c[k] != null && !Number.isInteger(c[k])) out.push(`часть ${i + 1}: ${k} — не целое`);
  });
  if (2 * pct > 120) out.push(`две части по ${pct} % — больше 120 % одной способности`);
  let seen = false;
  for (let seed = 1; seed <= SEEDS && !seen; seed++) {
    const steps = [], b = hardBattle(kitOf([x.id], p.ult ? 0 : 10000, p.ult ? 10000 : 0), seed, true);
    run(b, steps);
    for (const a of steps) {
      const cast = a.ev.find(e => e.k === 'cast' && e.n === p.n); if (!cast) continue;
      const ok1 = partSeen(p, p.school, a.ev, cast.s), ok2 = partSeen(p.also, p.also.school, a.ev, cast.s);
      if (p.also.tgt === 'same') {   // цели второй части — только цели первой
        const t2 = a.ev.filter(e => e.k === 'status' && e.s === cast.s && (e.st === p.also.st || e.st === p.also.kind)).map(e => e.t);
        if (t2.some(t => !cast.t.includes(t))) out.push('same: вторая часть ушла мимо целей первой');
        if (p.also.targets && t2.length > p.also.targets) out.push(`same: целей второй части ${t2.length}, а положено ${p.also.targets}`);
      }
      if (ok1 && ok2) { seen = true; break; }
    }
  }
  if (!seen) out.push('обе части ни разу не подействовали в одном ходе');
  return out;
}

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
    if (p.also) { const bad = checkCombo(x); return bad.length ? { ok: false, why: bad.join('; ') } : { ok: true }; }
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
const combos = all.filter(x => L[x.id].also);
console.log(`Способностей ${all.length}: сработали ${ok}, не сработали ${bad.length}; сочетаний ${combos.length} — обе части действуют.`);
for (const s of notes) console.log('  · ' + s);
for (const s of bad) console.log('  ✗ ' + s);

/* ---------- примитивы ADR-0050: аура party и «любой контроль» ---------- */
const primBad = [];
{
  /* аура party гаснет с гибелью героя: хозяин пассивки пал до боя — пассивка не срабатывает ни разу, хотя условие у отряда есть;
     с живым хозяином в том же бою — срабатывает */
  for (const x of all.filter(a => L[a.id].party)) {
    const p = L[x.id], sup = (SUPPORT[p.pas] || (() => []))(p);
    let alive = 0, dead = 0;
    for (let seed = 1; seed <= SEEDS && !(alive && dead === 0 && seed > 8); seed++) {
      const mk = isDead => {
        const b = hardBattle(kitOf([x.id], 0, 0), seed, true, isDead ? { dead: true } : null);
        /* условие кладёт союзник: бойцу — опорная способность пассивки */
        const h3 = b.u[0].find(u => u.key === 'h3'); h3.kit = kitOf(sup, 6000, 0); h3.table = EB.chanceTable(h3);
        run(b); return b.cov[x.id] || 0;
      };
      alive += mk(false); dead += mk(true);
    }
    if (!alive) primBad.push(`${x.id} «${x.n}»: аура отряда ни разу не сработала при живом хозяине`);
    if (dead) primBad.push(`${x.id} «${x.n}»: аура отряда работает после гибели хозяина — ${dead} раз`);
  }
  /* «любой контроль»: пассивка с ctrl срабатывает по цели под контролем любой школы, а не только своей */
  for (const x of all.filter(a => L[a.id].ctrl && L[a.id].pas === 'dmgVsDebuff')) {
    const givers = all.filter(a => a.t === 'act' && a.tier === 'one' && a.k === 'ctrl');
    for (const g of givers) {
      let seen = false;
      for (let seed = 1; seed <= SEEDS && !seen; seed++) { const b = hardBattle(kitOf([x.id, g.id + '>threat'], 6000, 0), seed, true); run(b); seen = !!b.cov[x.id]; }
      if (!seen) primBad.push(`${x.id} «${x.n}»: не сработала по цели под контролем «${g.n}»`);
    }
  }
  /* Б5: имена сочетаний и черт не повторяют имён способностей врагов и уникальных способностей Эхо и биомов */
  const fresh = new Map(all.filter(a => L[a.id].also || (a.t === 'pas' && A.rules.basePas && +a.id.split('.').pop() > A.rules.basePas && a.set !== 'Фарм')).map(a => [a.n, a.id]));
  const ctx = { window: {} }; vm.createContext(ctx);
  for (const f of ['echo-foes.js', 'biome-foes.js']) if (fs.existsSync(UI + f)) vm.runInContext(fs.readFileSync(UI + f, 'utf8').replace(/\(function[\s\S]*$/, m => (f === 'biome-foes.js' ? '' : m)), ctx, { filename: f });
  const foreign = [];
  const XF = ctx.window.EN_ECHO_FOES, BF = ctx.window.EN_BIOME_FOES;
  if (XF) { for (const a of XF.abilities || []) foreign.push([a.n, 'уникальная способность Эхо']); for (const f of Object.values(XF.foes || {})) for (const k of f.kit || []) if (k.as) foreign.push([k.as, `приём врага Эхо «${f.name}»`]); }
  if (BF) { for (const a of BF.abilities || BF.lib || []) foreign.push([a.n, 'уникальная способность биома']); for (const f of Object.values(BF.foes || {})) for (const k of (f.kit && f.kit.kit) || []) if (k.as) foreign.push([k.as, `приём врага «${f.name}»`]); }
  for (const f of Object.values((globalThis.EN_KITS || {}).foes || {})) for (const k of f.kit || []) if (k.as) foreign.push([k.as, 'приём врага Мастерской']);
  for (const [n, where] of foreign) if (fresh.has(n)) primBad.push(`Б5: имя «${n}» (${fresh.get(n)}) уже занято — ${where}`);
  console.log(`Примитивы ADR-0050: аур отряда ${all.filter(a => L[a.id].party).length}, «любой контроль» — ${all.filter(a => L[a.id].ctrl).length}; имён сочетаний и черт ${fresh.size}, чужих имён сверено ${foreign.length}${primBad.length ? `, нарушений ${primBad.length}` : ', нарушений нет'}.`);
  for (const s of primBad) console.log('  ✗ ' + s);
}

/* ---------- наборы героев состава (ADR-0050; ADR-0031, п. 7) ---------- */
const RS = globalThis.EN_ROSTER, K = globalThis.EN_KITS;
const RARITY = ['обычная', 'редкая', 'уникальная', 'эпическая', 'древняя', 'первородная', 'вневременная'];   // §3.1: r героя состава — 1…7
const CORE_CLS = { 'танк': 'Танк', 'лекарь': 'Лекарь', 'контроль': 'Контроль', 'маг ДД': 'Маг. ДД', 'физ ДД силы': 'Физ. ДД силы',
  'физ ДД ловкости': 'Физ. ДД ловкости', 'фармер': 'Физ. ДД ловкости' };   // класс ядра — как HR_DATA.cls в screens/heroes.js
const ULT2_FROM = 4;   // вторая ульта — ульта-сочетание — у героя с максимумом доблести от (assign.py, ULT2_FROM)
const kitBad = [];
const rosterSrc = h => EB.heroSrc({ id: h.id, name: h.id, cls: CORE_CLS[h.cl[0]] || 'Танк', el: h.sch, lvl: 40, st: [150, 150, 150, 150, 150],
  ab: [], pas: [], ult: null, draft: h.id, valor: h.maxV });
let steps = 0, pairs = 0;
for (const h of RS.heroes) {
  const k = K.heroes[h.id], where = `${h.id} ${h.n}`, M = h.maxV;
  if (!k) { kitBad.push(`${where}: нет набора`); continue; }
  if (k.maxV !== M) kitBad.push(`${where}: максимум доблести в наборе ${k.maxV}, в составе ${M}`);
  if (k.kit.length !== M + 2) kitBad.push(`${where}: способностей ${k.kit.length}, а максимум доблести + 2 — ${M + 2}`);
  /* Н1: пара доблести 0 — активная и черта */
  const v0 = k.kit.filter(x => x.v === 0), act0 = v0.filter(x => x.slot === 'act'), tr0 = v0.filter(x => x.slot === 'pas' || x.slot === 'react');
  if (v0.length !== 2 || act0.length !== 1 || tr0.length !== 1) kitBad.push(`${where}: на доблести 0 — ${v0.map(x => x.slot).join(' + ') || 'пусто'}, а нужна пара «активная + черта»`);
  else pairs++;
  /* Н2: с доблести 1 — по одной записи, на последней — ульта; вторая ульта — только ульта-сочетание на предпоследней, максимум от 4 */
  for (let v = 1; v <= M; v++) { const n = k.kit.filter(x => x.v === v).length; if (n !== 1) kitBad.push(`${where}: на доблести ${v} записей ${n}, а нужна одна`); }
  if (k.kit.some(x => !(x.v >= 0 && x.v <= M))) kitBad.push(`${where}: запись вне доблестей 0…${M}`);
  const ults = k.kit.filter(x => x.slot === 'ult');
  if (!ults.some(x => x.v === M)) kitBad.push(`${where}: на последней доблести ${M} нет ульты`);
  for (const x of ults) if (x.v !== M && !(x.v === M - 1 && M >= ULT2_FROM && L[x.id] && L[x.id].also)) kitBad.push(`${where}: ульта ${x.id} на доблести ${x.v} — вторая ульта бывает только сочетанием на предпоследней доблести героя с максимумом от ${ULT2_FROM}`);
  if (new Set(k.kit.map(x => x.id)).size !== k.kit.length) kitBad.push(`${where}: способность повторяется`);
  /* Н5: школы */
  const farm = h.cl[0] === 'фармер', school = farm || h.sch === 'без стихии' ? 'Без школы' : h.sch;
  for (const x of k.kit) {
    const a = L[x.id];
    if (!a) { kitBad.push(`${where}: ${x.id} — нет в библиотеке`); continue; }
    if (a.t !== x.slot) kitBad.push(`${where}: ${x.id} — место «${x.slot}», в библиотеке «${a.t}»`);
    const own = a.school === school || a.school === 'Без школы' || (farm && a.school === 'Фарм');
    const trait = x.v === 0 && (x.slot === 'pas' || x.slot === 'react');
    if (!own && !trait) kitBad.push(`${where}: ${x.id} — не школа героя «${school}» и не приём «Без школы»`);
    if (a.also && a.also.school !== a.school && a.also.school !== 'Без школы' && h.src === 'gold') kitBad.push(`${where}: ${x.id} — сочетание двух стихий у героя за золото`);
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
  /* черта работает с доблести 0: ядро берёт её в пассивки карты без доблести */
  if (tr0.length === 1 && !EB.create({ heroes: [Object.assign(rosterSrc(h), { valor: 0 })], foes: [], seed: 1, mode: 'rounds' }).u[0][0].lpas.some(p => p.id === tr0[0].id)) kitBad.push(`${where}: черта ${tr0[0].id} не действует на доблести 0`);
}
/* Н8: наборы пятёрки обучения — как в принятом проекте */
for (const [id, names] of Object.entries(TUT)) {
  const k = K.heroes[id], got = k ? k.kit.map(x => (L[x.id] || { n: x.id }).n) : [];
  if (JSON.stringify(got) !== JSON.stringify(names)) kitBad.push(`пятёрка обучения ${id}: набор ${got.join(' + ') || 'нет'}, а по проекту — ${names.join(' + ')}`);
  const h = RS.heroes.find(x => x.id === id);
  if (!h || !h.tut) kitBad.push(`пятёрка обучения ${id}: в составе герой не помечен «обучение»`);
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
console.log(`Наборы героев состава: ${RS.heroes.length} героев, набор по id — у ${RS.heroes.filter(h => K.heroes[h.id]).length}; пара доблести 0 — у ${pairs}; шагов по доблести ${steps}, `
  + `черновиков ведёт к герою ${drafts.length}; дымовых боёв ${smoke}${kitBad.length ? `, нарушений ${kitBad.length}` : ', нарушений нет'}.`);
for (const s of kitBad.slice(0, 40)) console.log('  ✗ ' + s);

/* ---------- закон базы по циклу (слово автора 02.10.2026, ADR-0050) ---------- */
const baseBad = [];
{
  /* образцы характеристик по классу — HR_DATA экрана героев: тот же вырез, что у калькулятора Арены (arena/model.js) */
  const src = fs.readFileSync(UI + 'screens/heroes.js', 'utf8'), m = src.match(/const HR_DATA = (\{[\s\S]*?\n\});/);
  if (!m) baseBad.push('screens/heroes.js: нет HR_DATA — образцов характеристик героев состава');
  else {
    const HR = vm.runInNewContext('(' + m[1] + ')'), LVL = 50;
    const core = h => HR.cls[h.cls] || HR.cls[h.cl[0]] || HR.clsStub;
    const card = h => { const c = core(h), T = HR.st[c] || HR.st['Танк'];
      const u = EB.create({ heroes: [EB.heroSrc({ id: h.id, name: h.n, cls: c, el: h.sch, lvl: LVL, st: T[0].slice(), cycle: h.c, ab: [], pas: [], ult: null, draft: h.id, valor: 0 })], foes: [], seed: 1, mode: 'rounds' }).u[0][0];
      return { core: c, hp: u.maxHp, atk: u.atk[u.main], def: u.def.str + u.def.int }; };
    const by = {};   // класс ядра → цикл → источник → карта
    for (const h of RS.heroes) { const x = card(h); ((by[x.core] = by[x.core] || {})[h.c] = by[x.core][h.c] || {})[h.src] = by[x.core][h.c][h.src] || x; if (JSON.stringify([x.hp, x.atk, x.def]) !== JSON.stringify([by[x.core][h.c][h.src].hp, by[x.core][h.c][h.src].atk, by[x.core][h.c][h.src].def])) baseBad.push(`${h.id}: база героя не та, что у героев его класса, цикла и источника`); }
    let cmp = 0;
    for (const [cls, cyc] of Object.entries(by)) {
      const cs = Object.keys(cyc).map(Number).sort((a, b) => a - b);
      for (const c of cs) { const v = Object.values(cyc[c]); if (v.some(x => x.hp !== v[0].hp || x.atk !== v[0].atk || x.def !== v[0].def)) baseBad.push(`${cls}, цикл ${c}: база зависит от источника героя — ${Object.entries(cyc[c]).map(([s, x]) => `${s} ${x.atk}/${x.hp}`).join(', ')}`); }
      for (let i = 1; i < cs.length; i++) for (const [s2, hi] of Object.entries(cyc[cs[i]])) for (const [s1, lo] of Object.entries(cyc[cs[i - 1]])) {
        cmp++;
        if (!(hi.hp > lo.hp && hi.atk > lo.atk && hi.def > lo.def)) baseBad.push(`${cls}: герой цикла ${cs[i]} (${s2}) не сильнее по базе героя цикла ${cs[i - 1]} (${s1}) — атака ${hi.atk} против ${lo.atk}, здоровье ${hi.hp} против ${lo.hp}`);
      }
    }
    console.log(`База по циклу: классов ${Object.keys(by).length}, сравнений «старший цикл против младшего» по источникам ${cmp}${baseBad.length ? `, нарушений ${baseBad.length}` : ' — у старшего цикла атака, здоровье и защита выше при любом источнике; внутри цикла источник базу не меняет'}.`);
  }
  for (const s of baseBad.slice(0, 20)) console.log('  ✗ ' + s);
}
if (ints.length) console.log('  ✗ не целые числа: ' + ints.slice(0, 10).join(', '));
process.exitCode = bad.length || ints.length || kitBad.length || primBad.length || baseBad.length ? 1 : 0;
