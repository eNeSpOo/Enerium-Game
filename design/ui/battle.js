/* Энериум · бой пять на пять — прототип ядра для UI-кита.
   Правила боя: docs/gdd/05-боевая-система.md; характеристики: docs/gdd/03-герой.md (§3.2);
   цена в атаках и ротация: docs/gdd/04-способности-и-ротация.md.
   Решения автора 26.09.2026: до пяти врагов на этаже, враги — такие же карты, как герои,
   одна библиотека способностей, массовые способности у обеих сторон, агро симметричное.

   Инварианты ядра соблюдены и в прототипе:
   - только целые числа: время в мс, доли — в процентах или базисных пунктах (10 000 = 100 %);
   - вся случайность — из генератора с сидом, порядок обращений к нему — часть формата боя;
   - числа баланса лежат в RULES, LIB, PAS, FOES и FLOORS, в функциях — только алгоритм.
   Это ориентир для настоящего ядра на C#, а не код игры. */
(function (root) {
'use strict';

/* ================== правила ================== */
const RULES = {
  stat: { atk: 10, hp: 100, def: 2, lvlDiv: 12, evaDiv: 400, critDiv: 400 },   // §3.2 и §3.3
  caps: { defPct: 50, evaBp: 2500, critBp: 2500, asMin: 50, asMax: 250 },     // скорость атаки — в сотых удара в секунду
  critDmgPct: 150, K: 112,                                                     // §5.2
  elem: { circle: ['Вода', 'Огонь', 'Земля', 'Воздух'], fwd: 125, back: 75, pair: ['Свет', 'Тьма'], pairPct: 150, base: 100 }, // §3.1
  cls: {  // thr — классовый множитель угрозы (§5.3), main — характеристика обычной атаки, healer — цель правила «лекарь противника»
    'Танк': { thr: 300, main: 'str' },
    'Физ. ДД': { thr: 100, main: 'str' }, 'Физ. ДД силы': { thr: 100, main: 'str' }, 'Физ. ДД ловкости': { thr: 100, main: 'str' },
    'Маг. ДД': { thr: 100, main: 'int' },
    'Хилер': { thr: 100, main: 'int', healer: true }, 'Лекарь': { thr: 100, main: 'int', healer: true },
    'Контроль': { thr: 120, main: 'int' }, 'Дебаффер': { thr: 120, main: 'int' },
    'Босс': { thr: 150, main: 'str' }, 'Страж': { thr: 150, main: 'str' },
  },
  threat: { base: 100, dealt: 100, taken: 50, heal: 150, cast: 30, ult: 150, switchPct: 120, decayPct: 97, tauntPct: 130, tauntAdd: 50 },
  resist: { boss: 2500, guard: 5000 },  // сопротивление контролю, б. п. (§5.4)
  ultAfter: 3, ultChargeDiv: 2,         // §5.1: три применения, затем зарядка = сумма цен / 2
  shieldCapPct: 100,                    // щит не больше здоровья
  foeLvl: { base: 20, perFloor: 1 },    // уровень карт врага растёт с этажом
  floor: { limitMs: { o: 45000, e: 75000, b: 150000 }, minMs: { o: 4000, e: 17000, b: 75000 } }, // §7 и §8.2
};

/* ================== библиотека способностей ==================
   Каждая способность — набор примитивов: kind (что делает), tgt (правило цели), stat и coef
   (база = характеристика × coef / 100), price (цена в обычных атаках), st/left/pow (эффект).
   school: «класс» — немагический приём класса, иначе стихия школы. */
const LIB = {
  // --- герои: общие приёмы классов
  'Вызов': { school: 'класс', kind: 'taunt', tgt: 'all', price: 3, d: 'Все враги переключаются на стража: угроза выше лучшей на 30%.' },
  'Удар щитом': { school: 'класс', kind: 'dmg', stat: 'str', coef: 160, tgt: 'threat', then: { st: 'stun', left: 2 }, price: 4, d: 'Урон силой и оглушение на 2 атаки цели.' },
  'Быстрый выпад': { school: 'класс', kind: 'dmg', stat: 'str', coef: 150, tgt: 'threat', price: 2, d: 'Короткий удар силой.' },
  'Разряд': { school: 'класс', kind: 'dmg', stat: 'int', coef: 250, tgt: 'lowest', price: 3, d: 'Урон интеллектом по самому раненому врагу.' },
  'Живая вода': { school: 'класс', kind: 'heal', stat: 'int', coef: 250, tgt: 'ally_lowest', price: 3, d: 'Лечит самого раненого героя.' },
  'Оберег': { school: 'класс', kind: 'shield', stat: 'int', coef: 100, tgt: 'allies', price: 4, d: 'Щит всему отряду, тратится первым.' },
  'Оковы': { school: 'класс', kind: 'ctrl', st: 'stun', left: 2, tgt: 'danger', price: 4, d: 'Оглушение на 2 атаки самому готовому к способности врагу. Боссы сопротивляются.' },
  'Ослабление': { school: 'класс', kind: 'debuff', st: 'weak', pow: 2500, left: 5, tgt: 'threat', price: 3, d: '−25% урона цели на 5 её атак.' },
  // --- герои: школы стихий
  'Осыпание': { school: 'Земля', kind: 'debuff', st: 'pierce', pow: 3000, left: 4, tgt: 'threat', price: 3, d: '−30% физ. защиты цели на 4 её атаки: открывает цель ударам силы.' },
  'Горение': { school: 'Огонь', kind: 'dot', stat: 'str', coef: 40, max: 3, left: 5, tgt: 'threat', price: 3, d: 'Поджог: урон каждую атаку цели, до 3 стаков на 5 атак.' },
  'Погребальный костёр': { school: 'Огонь', kind: 'dmg', stat: 'str', coef: 300, per: { kind: 'dot', school: 'Огонь', pct: 25 }, tgt: 'threat', price: 5, d: 'Мощный удар: +25% за каждый стак горения на цели.' },
  'Остановка': { school: 'Время', kind: 'ctrl', st: 'stop', left: 2, tgt: 'danger', price: 4, d: 'Цель теряет накопленные атаки и 2 атаки их не копит.' },
  'Сияние': { school: 'Свет', kind: 'hot', stat: 'int', coef: 35, max: 3, left: 5, over: true, tgt: 'ally_lowest', price: 3, d: 'Лечит цель каждую её атаку; лишнее становится щитом.' },
  'Увядание': { school: 'Тьма', kind: 'dot', stat: 'int', coef: 40, max: 3, left: 5, drain: 1000, tgt: 'threat', price: 3, d: 'Урон каждую атаку цели; 10% урона лечат наложившего.' },
  // --- ульты героев
  'Долгая ночь': { school: 'Тьма', kind: 'ctrl', st: 'silence', left: 3, tgt: 'all', ult: true, d: 'Безмолвие всем врагам на 3 их атаки. Боссы сопротивляются.' },
  'Испепеление': { school: 'Время', kind: 'dmg', stat: 'int', coef: 400, tgt: 'threat', ult: true, d: 'Крупный урон одной цели.' },
  // --- враги Мастерской форм: та же библиотека
  'Каменный осколок': { school: 'Земля', kind: 'dmg', stat: 'str', coef: 150, tgt: 'threat', price: 2, d: 'Быстрый удар.' },
  'Длинная рука': { school: 'класс', kind: 'dmg', stat: 'str', coef: 170, tgt: 'lowest', price: 3, d: 'Дотягивается до самого раненого.' },
  'Порыв': { school: 'Воздух', kind: 'dmg', stat: 'int', coef: 60, tgt: 'all', price: 4, d: 'Массовый удар ветром по всему отряду.' },
  'Напор': { school: 'класс', kind: 'taunt', tgt: 'all', price: 4, d: 'Все герои переключаются на него.' },
  'Замазка': { school: 'Земля', kind: 'heal', stat: 'int', coef: 220, tgt: 'ally_lowest', price: 3, d: 'Лечит самого раненого из своих.' },
  'Удар в спину': { school: 'класс', kind: 'dmg', stat: 'str', coef: 190, tgt: 'healer', price: 2, d: 'Сразу идёт к лекарю отряда.' },
  'Замес': { school: 'Земля', kind: 'dmg', stat: 'str', coef: 240, tgt: 'threat', price: 3, d: 'Тяжёлый удар.' },
  'Тяжёлая рука': { school: 'класс', kind: 'debuff', st: 'weak', pow: 2000, left: 4, tgt: 'threat', price: 4, d: '−20% урона цели на 4 её атаки.' },
  'Подрез': { school: 'Воздух', kind: 'dot', stat: 'str', coef: 30, max: 4, left: 4, tgt: 'lowest', price: 3, d: 'Порезы по самому раненому, до 4 стаков.' },
  'Снять лишнее': { school: 'класс', kind: 'dmg', stat: 'str', coef: 220, tgt: 'lowest', price: 3, d: 'Добивает самого раненого.' },
  'Плита': { school: 'Земля', kind: 'shield', stat: 'str', coef: 150, tgt: 'allies', price: 4, d: 'Щит всем своим.' },
  'Меха': { school: 'Воздух', kind: 'dmg', stat: 'int', coef: 80, tgt: 'all', price: 3, d: 'Порыв по всему отряду.' },
  'Сквозняк': { school: 'Воздух', kind: 'ctrl', st: 'stop', left: 2, tgt: 'danger', price: 4, d: 'Сбивает накопленные атаки у самого готового героя.' },
  'Заплата': { school: 'Земля', kind: 'heal', stat: 'int', coef: 240, tgt: 'ally_lowest', price: 2, d: 'Быстро латает самого раненого.' },
  'Шов': { school: 'Земля', kind: 'heal', stat: 'int', coef: 120, tgt: 'allies', price: 4, d: 'Лечит всех своих.' },
  'Съём': { school: 'класс', kind: 'debuff', st: 'mark', pow: 2000, left: 5, tgt: 'threat', price: 3, d: 'Метка: цель получает +20% урона 5 атак.' },
  'Снять форму': { school: 'класс', kind: 'dispel', then: { st: 'weak', pow: 2500, left: 4 }, tgt: 'lowest', price: 3, d: 'Снимает щит и лечение, затем ослабляет.' },
  'Правка': { school: 'Земля', kind: 'dmg', stat: 'str', coef: 260, tgt: 'threat', price: 2, d: 'Удар по тому, кто мешает.' },
  'Глиняный вал': { school: 'Земля', kind: 'dmg', stat: 'str', coef: 90, tgt: 'all', price: 3, d: 'Массовый удар по отряду.' },
  'Последний штрих': { school: 'Земля', kind: 'dmg', stat: 'str', coef: 220, tgt: 'all', ult: true, d: 'Ульта: тяжёлый удар по всему отряду.' },
};

/* ================== пассивки ================== */
const PAS = {
  'Несгибаемость': { kind: 'lowShield', belowPct: 50, shieldPct: 20 },
  'Точность': { kind: 'crit', bp: 800 },
  'Средоточие': { kind: 'nth', n: 3, pct: 150 },
  'Отклик': { kind: 'critShield', pct: 30 },
  'Тень': { kind: 'debuffLeft', add: 1 },
  'Незавершённость': { kind: 'enrage', maxPct: 100 },
};

/* ================== карты врагов Мастерской форм ==================
   st — Сила, Интеллект, Ловкость, Выносливость, Скорость; hpPct — множитель здоровья карты. */
const FOES = {
  o1: { name: 'Безликий образец', cls: 'Физ. ДД силы', el: 'Земля', st: [130, 26, 60, 110, 60], hpPct: 250, abs: ['Каменный осколок'] },
  o2: { name: 'Долгорукий образец', cls: 'Физ. ДД ловкости', el: 'Земля', st: [97, 26, 160, 90, 70], hpPct: 250, abs: ['Длинная рука'] },
  o3: { name: 'Пустотелый образец', cls: 'Маг. ДД', el: 'Воздух', st: [26, 136, 60, 90, 70], hpPct: 250, abs: ['Порыв'] },
  o4: { name: 'Безголовый образец', cls: 'Танк', el: 'Земля', st: [91, 26, 50, 240, 50], hpPct: 250, abs: ['Напор'] },
  o5: { name: 'Сырой образец', cls: 'Лекарь', el: 'Земля', st: [26, 130, 50, 140, 60], hpPct: 250, abs: ['Замазка'] },
  o6: { name: 'Однорукий образец', cls: 'Дебаффер', el: 'Земля', st: [117, 39, 150, 80, 130], hpPct: 250, abs: ['Удар в спину'] },
  e1: { name: 'Подмастерье', cls: 'Физ. ДД силы', el: 'Земля', st: [169, 32, 70, 180, 60], hpPct: 700, abs: ['Замес', 'Тяжёлая рука'] },
  e2: { name: 'Резчик', cls: 'Физ. ДД ловкости', el: 'Земля', st: [130, 32, 180, 150, 80], hpPct: 700, abs: ['Подрез', 'Снять лишнее'] },
  e3: { name: 'Упор', cls: 'Танк', el: 'Земля', st: [104, 32, 60, 280, 50], hpPct: 800, abs: ['Напор', 'Плита'] },
  e4: { name: 'Мех', cls: 'Маг. ДД', el: 'Воздух', st: [32, 169, 70, 150, 70], hpPct: 650, abs: ['Меха', 'Сквозняк'] },
  e5: { name: 'Штопарь', cls: 'Лекарь', el: 'Земля', st: [32, 156, 60, 180, 60], hpPct: 650, abs: ['Заплата', 'Шов'] },
  e6: { name: 'Съёмщик', cls: 'Дебаффер', el: 'Земля', st: [39, 149, 90, 160, 70], hpPct: 700, abs: ['Съём', 'Снять форму'] },
  b1: { name: 'Первый набросок', cls: 'Босс', el: 'Земля', st: [195, 65, 60, 300, 60], hpPct: 3000, abs: ['Правка', 'Глиняный вал'], ult: 'Последний штрих', pas: ['Незавершённость'], resist: 'boss' },
};

/* ================== колоды этажей ==================
   g: o — рядовые, e — элита с сопровождением, b — босс с сопровождением. Первым идёт лидер. */
const FLOORS = [
  { g: 'o', m: ['o1', 'o1'] }, { g: 'o', m: ['o1', 'o2'] }, { g: 'o', m: ['o1', 'o1', 'o2'] }, { g: 'o', m: ['o2', 'o1', 'o3'] },
  { g: 'e', m: ['e1', 'o1', 'o1'] },
  { g: 'o', m: ['o1', 'o2', 'o3'] }, { g: 'o', m: ['o4', 'o1', 'o2'] }, { g: 'o', m: ['o4', 'o3', 'o2'] }, { g: 'o', m: ['o1', 'o2', 'o3', 'o5'] },
  { g: 'e', m: ['e2', 'o2', 'o3'] },
  { g: 'o', m: ['o4', 'o2', 'o5'] }, { g: 'o', m: ['o3', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o1', 'o2', 'o3'] }, { g: 'o', m: ['o4', 'o2', 'o3', 'o5'] },
  { g: 'e', m: ['e5', 'o4', 'o1'] },
  { g: 'o', m: ['o2', 'o3', 'o5', 'o1'] }, { g: 'o', m: ['o4', 'o3', 'o3', 'o5'] }, { g: 'o', m: ['o6', 'o1', 'o2'] }, { g: 'o', m: ['o4', 'o6', 'o3', 'o5'] },
  { g: 'e', m: ['e3', 'o5', 'o2', 'o3'] },
  { g: 'o', m: ['o4', 'o2', 'o3', 'o5', 'o1'] }, { g: 'o', m: ['o6', 'o3', 'o5', 'o4'] }, { g: 'o', m: ['o4', 'o6', 'o2', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o3', 'o3', 'o6', 'o5'] },
  { g: 'e', m: ['e4', 'o3', 'o3', 'o5'] },
  { g: 'o', m: ['o4', 'o6', 'o6', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o2', 'o2', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o4', 'o3', 'o6', 'o5'] }, { g: 'o', m: ['o6', 'o6', 'o3', 'o3', 'o5'] },
  { g: 'e', m: ['e6', 'o4', 'o5', 'o6'] },
  { g: 'o', m: ['o4', 'o6', 'o3', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o2', 'o6', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o4', 'o6', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o6', 'o3', 'o5'] },
  { g: 'b', m: ['b1', 'o4', 'o5'] },
];

/* ================== генератор ================== */
function mix32(x) { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; }
function floorSeed(week, floor) { return mix32((week ^ Math.imul(floor, 0x9E3779B1)) >>> 0); }
function makeRng(seed) {  // mulberry32: целые 32 бита; roll(n) — целое от 0 до n − 1
  let a = seed >>> 0;
  return n => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) % n; };
}

/* ================== карты ================== */
const fl = (a, b) => Math.floor(a / b);
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const thrMul = u => (RULES.cls[u.cls] || { thr: 100 }).thr;
const mainStat = u => (RULES.cls[u.cls] || { main: 'str' }).main;
const isHealer = u => !!(RULES.cls[u.cls] && RULES.cls[u.cls].healer);
const pct = u => fl(u.hp * 10000, u.maxHp);

function mkUnit(src, side, i) {
  const s = RULES.stat, L = s.lvlDiv + src.lvl;
  const [str, int, agi, sta, spd] = src.st;
  const maxHp = fl(s.hp * (100 + sta) * L * (src.hpPct || 100), 100 * s.lvlDiv * 100);
  const as = clamp(RULES.caps.asMin + spd, RULES.caps.asMin, RULES.caps.asMax);
  const u = {
    key: src.key, id: src.id, name: src.name, side, i, cls: src.cls, el: src.el, lvl: src.lvl, lead: !!src.lead, resist: src.resist || null,
    maxHp, hp: src.hp != null ? clamp(src.hp, 1, maxHp) : maxHp, sh: 0,
    atk: { str: fl(s.atk * (100 + str) * L, 100 * s.lvlDiv), int: fl(s.atk * (100 + int) * L, 100 * s.lvlDiv) },
    def: { str: fl(s.def * str * L, s.lvlDiv), int: fl(s.def * int * L, s.lvlDiv) },
    eva: Math.min(RULES.caps.evaBp, fl(agi * 10000, s.evaDiv)),
    crit: Math.min(RULES.caps.critBp, fl(agi * 10000, s.critDiv)),
    critDmg: RULES.critDmgPct,
    ivl: fl(100000, as),
    abs: (src.abs || []).map(n => LIB[n] && Object.assign({ n }, LIB[n])).filter(Boolean),
    ult: src.ult && LIB[src.ult] ? Object.assign({ n: src.ult }, LIB[src.ult]) : null,
    pas: (src.pas || []).map(n => PAS[n]).filter(Boolean),
    ptr: 0, cnt: 0, uses: 0, spent: 0, phase: 'rot', charge: 0, chargeMax: 0, nAbil: 0,
    st: [], th: [], cur: -1, alive: true, next: 0, lowUsed: false,
    dealt: 0, healed: 0, taken: 0,
  };
  for (const p of u.pas) if (p.kind === 'crit') u.crit = Math.min(RULES.caps.critBp, u.crit + p.bp);
  return u;
}

function heroSrc(h) {
  return { key: h.id, id: h.id, name: h.name, cls: h.cls, el: h.el, lvl: h.lvl, st: h.st,
    abs: h.ab.map(a => a.n), ult: h.ult && h.valor >= h.ult.at ? h.ult.n : null,
    pas: h.pas.filter(p => p.t === 'боевая').map(p => p.n) };
}
function foeSrc(id, floor, k, lead, hp) {
  const f = FOES[id];
  return { key: id + '#' + k, id, name: f.name, cls: f.cls, el: f.el, lvl: RULES.foeLvl.base + floor * RULES.foeLvl.perFloor, st: f.st,
    hpPct: f.hpPct, abs: f.abs, ult: f.ult, pas: f.pas, resist: f.resist, lead, hp };
}
function floorFoes(floor, siegeHp) {
  const F = FLOORS[floor - 1];
  return F.m.map((id, k) => foeSrc(id, floor, k, F.g !== 'o' && k === 0, F.g === 'b' && k === 0 ? siegeHp : null));
}

/* ================== бой ================== */
function create(o) {
  const b = { t: 0, limit: o.limitMs, rng: makeRng(o.seed), seed: o.seed, u: [[], []], over: false, win: false, why: '', ev: [] };
  // порядок героев в отряде на бой не влияет: иначе перестановка отряда перебрасывала бы случайность
  o.heroes.slice().sort((x, y) => x.key < y.key ? -1 : x.key > y.key ? 1 : 0).forEach((s, i) => b.u[0].push(mkUnit(s, 0, i)));
  o.foes.forEach((s, i) => b.u[1].push(mkUnit(s, 1, i)));
  for (const side of [0, 1]) for (const u of b.u[side]) u.th = b.u[1 - side].map(v => fl(RULES.threat.base * thrMul(v), 100));
  for (const side of [0, 1]) for (const u of b.u[side]) u.next = b.rng(u.ivl);   // порядок: герои, затем враги
  return b;
}
const emit = (b, e) => { e.at = b.t; b.ev.push(e); };
const has = (u, k) => u.st.find(s => s.k === k);
const rmSt = (u, s) => { u.st.splice(u.st.indexOf(s), 1); };
const alive = arr => arr.filter(v => v.alive);
function elemMul(a, d) {
  const E = RULES.elem, ia = E.circle.indexOf(a), id = E.circle.indexOf(d);
  if (ia >= 0 && id >= 0) { if ((ia + 1) % E.circle.length === id) return E.fwd; if ((id + 1) % E.circle.length === ia) return E.back; return E.base; }
  if (a !== d && E.pair.includes(a) && E.pair.includes(d)) return E.pairPct;
  return E.base;
}

function nextActor(b) { let best = null; for (const side of [0, 1]) for (const u of b.u[side]) if (u.alive && (!best || u.next < best.next)) best = u; return best; }
function nextAt(b) { const u = nextActor(b); return u && u.next <= b.limit ? u.next : b.limit + 1; }
function step(b) {
  if (b.over) return b.ev.splice(0);
  const u = nextActor(b);
  if (!u || u.next > b.limit) { b.t = b.limit; finish(b, false, 'time'); return b.ev.splice(0); }
  b.t = u.next;
  act(b, u);
  u.next += u.ivl;
  const a0 = b.u[0].some(v => v.alive), a1 = b.u[1].some(v => v.alive);
  if (!a1) finish(b, true, 'win'); else if (!a0) finish(b, false, 'wipe');
  return b.ev.splice(0);
}
function finish(b, win, why) { b.over = true; b.win = win; b.why = why; emit(b, { k: 'end', win, why }); }
function run(b) { while (!b.over) step(b); return b; }

function act(b, u) {
  tickPeriodic(b, u); if (!u.alive) return;
  const stun = has(u, 'stun');
  if (stun) { stun.left--; if (stun.left <= 0) rmSt(u, stun); emit(b, { k: 'skip', s: u }); decay(u); return; }
  const silenced = !!has(u, 'silence'), stopped = !!has(u, 'stop');
  if (u.phase === 'ult' && u.ult && !silenced) { cast(b, u, u.ult, true); u.phase = 'rot'; u.uses = 0; }
  else if (u.phase === 'rot' && u.abs.length && u.cnt >= u.abs[u.ptr].price && !silenced) {
    const ab = u.abs[u.ptr]; cast(b, u, ab, false);
    u.cnt = 0; u.ptr = (u.ptr + 1) % u.abs.length; u.uses++; u.spent += ab.price;
    if (u.ult && u.uses >= RULES.ultAfter) { u.phase = 'charge'; u.charge = fl(u.spent, RULES.ultChargeDiv); u.chargeMax = u.charge; u.spent = 0; if (u.charge <= 0) u.phase = 'ult'; }
  } else {
    attack(b, u);
    if (!stopped) { if (u.phase === 'charge') { u.charge--; if (u.charge <= 0) u.phase = 'ult'; } else if (u.phase === 'rot') u.cnt++; }
  }
  for (const s of u.st.slice()) if (s.k === 'weak' || s.k === 'mark' || s.k === 'pierce' || s.k === 'silence' || s.k === 'stop') { s.left--; if (s.left <= 0) rmSt(u, s); }
  decay(u);
}
function decay(u) { for (let j = 0; j < u.th.length; j++) u.th[j] = fl(u.th[j] * RULES.threat.decayPct, 100); }

/* ---------- цели ---------- */
function byThreat(b, u) {
  const opp = b.u[1 - u.side]; let best = -1;
  for (let j = 0; j < opp.length; j++) if (opp[j].alive && (best < 0 || u.th[j] > u.th[best])) best = j;
  if (best < 0) return null;
  const cur = u.cur;
  if (cur >= 0 && cur !== best && opp[cur].alive && u.th[best] * 100 <= u.th[cur] * RULES.threat.switchPct) return opp[cur];
  u.cur = best; return opp[best];
}
function ready(v) {
  if (!v.alive) return -1;
  if (v.phase === 'ult') return 30000;
  if (v.phase === 'charge') return 20000 + (v.chargeMax ? fl((v.chargeMax - v.charge) * 10000, v.chargeMax) : 0);
  return v.abs.length ? fl(v.cnt * 10000, v.abs[v.ptr].price) : 0;
}
function minBy(arr, f) { let m = null, mv = 0; for (const v of arr) { const x = f(v); if (!m || x < mv) { m = v; mv = x; } } return m; }
function maxBy(arr, f) { let m = null, mv = 0; for (const v of arr) { const x = f(v); if (!m || x > mv) { m = v; mv = x; } } return m; }
function pick(b, u, rule) {
  const foes = alive(b.u[1 - u.side]), mates = alive(b.u[u.side]);
  switch (rule) {
    case 'all': return foes;
    case 'allies': return mates;
    case 'self': return [u];
    case 'ally_lowest': return mates.length ? [minBy(mates, pct)] : [];
    case 'lowest': return foes.length ? [minBy(foes, pct)] : [];
    case 'healer': { const h = foes.find(isHealer); if (h) return [h]; break; }
    case 'danger': { const d = maxBy(foes, ready); if (d && ready(d) > 0) return [d]; break; }
  }
  const t = byThreat(b, u); return t ? [t] : [];
}

/* ---------- действия ---------- */
function attack(b, u) {
  const t = pick(b, u, 'threat')[0]; if (!t) return;
  emit(b, { k: 'swing', s: u, t });
  hit(b, u, t, mainStat(u), 100, {});
}
function cast(b, u, ab, isUlt) {
  const tg = pick(b, u, ab.tgt);
  const mass = ab.tgt === 'all' || ab.tgt === 'allies';
  emit(b, { k: 'cast', s: u, n: ab.n, ult: isUlt, mass, school: ab.school, t: tg });
  if (!mass) { const fix = isUlt ? RULES.threat.ult : RULES.threat.cast; for (const v of b.u[1 - u.side]) if (v.alive) v.th[u.i] += fl(fix * thrMul(u), 100); }
  u.nAbil++;
  const nth = u.pas.find(p => p.kind === 'nth'), boost = nth && u.nAbil % nth.n === 0 ? nth.pct : 100;
  switch (ab.kind) {
    case 'dmg': for (const t of tg) for (let h = 0; h < (ab.hits || 1); h++) {
      if (!t.alive) break;
      let coef = ab.coef;
      if (ab.per) { const p = t.st.find(s => s.k === ab.per.kind && s.school === ab.per.school); if (p) coef = fl(coef * (100 + ab.per.pct * p.stacks), 100); }
      const d = hit(b, u, t, ab.stat, fl(coef * boost, 100), { mass, drain: ab.drain });
      if (d > 0 && ab.then) addStatus(b, u, t, ab.then, ab.then.st === 'stun');
    } break;
    case 'dot': case 'hot': for (const t of tg) addPeriodic(b, u, t, ab); break;
    case 'heal': for (const t of tg) heal(b, u, t, fl(u.atk[ab.stat] * ab.coef * boost, 10000), mass); break;
    case 'shield': for (const t of tg) addShield(b, u, t, fl(u.atk[ab.stat] * ab.coef, 100)); break;
    case 'taunt': for (const v of b.u[1 - u.side]) if (v.alive) { let m = 0; for (let j = 0; j < v.th.length; j++) if (b.u[u.side][j].alive && v.th[j] > m) m = v.th[j]; v.th[u.i] = fl(m * RULES.threat.tauntPct, 100) + RULES.threat.tauntAdd; v.cur = u.i; } break;
    case 'ctrl': for (const t of tg) addStatus(b, u, t, { st: ab.st, left: ab.left }, true); break;
    case 'debuff': for (const t of tg) addStatus(b, u, t, { st: ab.st, left: ab.left, pow: ab.pow }, false); break;
    case 'dispel': for (const t of tg) { const lost = t.sh; t.sh = 0; t.st = t.st.filter(s => s.k !== 'hot'); emit(b, { k: 'dispel', s: u, t, v: lost }); if (ab.then) addStatus(b, u, t, ab.then, false); } break;
  }
}
function hit(b, src, t, stat, coef, o) {
  if (b.rng(10000) < t.eva) { emit(b, { k: 'miss', s: src, t }); return 0; }
  let base = fl(src.atk[stat] * coef, 100);
  const w = has(src, 'weak'); if (w) base = fl(base * (10000 - w.pow), 10000);
  const enr = src.pas.find(p => p.kind === 'enrage'); if (enr) base = fl(base * (100 + fl((10000 - pct(src)) * enr.maxPct, 10000)), 100);
  let crit = false;
  if (b.rng(10000) < src.crit) { base = fl(base * src.critDmg, 100); crit = true; }
  let def = t.def[stat]; const pr = stat === 'str' && has(t, 'pierce'); if (pr) def = fl(def * (10000 - pr.pow), 10000);
  const kl = RULES.K * src.lvl;
  let d = fl(base * kl, kl + def);
  const least = fl(base * (100 - RULES.caps.defPct), 100); if (d < least) d = least;
  d = fl(d * elemMul(src.el, t.el), 100);
  const mk = has(t, 'mark'); if (mk) d = fl(d * (10000 + mk.pow), 10000);
  if (d < 1) d = 1;
  damage(b, src, t, d, { crit, mass: o.mass });
  if (o.drain && src.alive) heal(b, src, src, fl(d * o.drain, 10000), true, true);
  return d;
}
function damage(b, src, t, d, o) {
  let left = d;
  if (t.sh > 0) { const a = Math.min(t.sh, left); t.sh -= a; left -= a; }
  t.hp -= left; t.taken += d; if (src) src.dealt += d;
  emit(b, { k: o.dot ? 'dot' : 'hit', s: src, t, v: d, crit: !!o.crit, school: o.school, sh: d - left });
  if (src && src.side !== t.side && !o.mass) {   // массовые способности агро не трогают (§5.3)
    t.th[src.i] += fl(d * RULES.threat.dealt * thrMul(src), 10000);
    if (src.alive) src.th[t.i] += fl(d * RULES.threat.taken * thrMul(t), 10000);
  }
  if (t.hp <= 0) { t.hp = 0; t.alive = false; t.st = []; t.sh = 0; emit(b, { k: 'die', t }); return; }
  const low = t.pas.find(p => p.kind === 'lowShield');
  if (low && !t.lowUsed && t.hp * 100 < t.maxHp * low.belowPct) { t.lowUsed = true; addShield(b, t, t, fl(t.maxHp * low.shieldPct, 100)); }
}
function heal(b, src, t, amount, mass, quiet) {
  if (!t.alive) return 0;
  let a = amount, crit = false;
  if (!quiet && b.rng(10000) < src.crit) { a = fl(a * src.critDmg, 100); crit = true; }
  const real = Math.min(a, t.maxHp - t.hp);
  t.hp += real; src.healed += real;
  emit(b, { k: 'heal', s: src, t, v: real, crit, quiet: !!quiet });
  if (crit) { const cs = src.pas.find(p => p.kind === 'critShield'); if (cs) addShield(b, src, t, fl(a * cs.pct, 100)); }
  if (!mass && !quiet && real > 0) {
    const opp = alive(b.u[1 - src.side]);
    for (const v of opp) v.th[src.i] += fl(real * RULES.threat.heal * thrMul(src), 10000 * opp.length);
  }
  return a - real;
}
function addShield(b, src, t, v) {
  if (!t.alive || v <= 0) return;
  t.sh = Math.min(t.sh + v, fl(t.maxHp * RULES.shieldCapPct, 100));
  emit(b, { k: 'shield', s: src, t, v });
}
function addStatus(b, src, t, s, isCtrl) {
  if (!t.alive) return;
  if (isCtrl && t.resist && b.rng(10000) < RULES.resist[t.resist]) { emit(b, { k: 'resist', s: src, t, st: s.st }); return; }
  const dl = src.side !== t.side ? src.pas.find(p => p.kind === 'debuffLeft') : null;
  const left = s.left + (dl ? dl.add : 0);
  const ex = has(t, s.st);                       // одинаковые обновляют длительность, разные стакаются (§5.4)
  if (ex) { ex.left = Math.max(ex.left, left); ex.pow = Math.max(ex.pow, s.pow || 0); }
  else t.st.push({ k: s.st, left, pow: s.pow || 0 });
  if (s.st === 'stop') { t.cnt = 0; if (t.phase === 'charge') t.charge = t.chargeMax; }
  emit(b, { k: 'status', s: src, t, st: s.st, left });
}
function addPeriodic(b, src, t, ab) {
  if (!t.alive) return;
  let per = fl(src.atk[ab.stat] * ab.coef, 100);
  if (ab.kind === 'dot') per = fl(per * elemMul(src.el, t.el), 100);
  const p = t.st.find(s => s.k === ab.kind && s.school === ab.school);
  if (p) { p.stacks = Math.min(ab.max, p.stacks + 1); p.left = ab.left; if (per > p.per) p.per = per; p.src = src; }
  else t.st.push({ k: ab.kind, school: ab.school, per, stacks: 1, max: ab.max, left: ab.left, src, drain: ab.drain || 0, over: !!ab.over });
  emit(b, { k: 'status', s: src, t, st: ab.kind, school: ab.school });
}
function tickPeriodic(b, u) {
  for (const p of u.st.slice()) {
    if (p.k !== 'dot' && p.k !== 'hot') continue;
    const v = p.per * p.stacks;
    if (p.k === 'dot') {
      damage(b, p.src, u, v, { dot: true, school: p.school });
      if (p.drain && p.src.alive) heal(b, p.src, p.src, fl(v * p.drain, 10000), true, true);
      if (!u.alive) return;
    } else {
      const over = heal(b, p.src, u, v, true, true);
      if (p.over && over > 0) addShield(b, p.src, u, over);
    }
    p.left--; if (p.left <= 0 && u.st.includes(p)) rmSt(u, p);
  }
}

/* ================== забег ================== */
function floorBattle(heroes, week, floor, siegeHp) {
  const g = FLOORS[floor - 1].g;
  return create({ heroes, foes: floorFoes(floor, siegeHp), seed: floorSeed(week, floor), limitMs: RULES.floor.limitMs[g] });
}
function floorMs(floor, battleMs) { return Math.max(battleMs, RULES.floor.minMs[FLOORS[floor - 1].g]); }
function simRun(heroes, week, siegeHp) {
  const floors = []; let runMs = 0, bossHp = siegeHp;
  for (let f = 1; f <= FLOORS.length; f++) {
    const b = run(floorBattle(heroes, week, f, bossHp));
    runMs += floorMs(f, b.t);
    const boss = FLOORS[f - 1].g === 'b' ? b.u[1][0] : null;
    floors.push({ floor: f, win: b.win, why: b.why, ms: b.t, alive: b.u[0].filter(v => v.alive).length, bossHp: boss ? boss.hp : null, bossMax: boss ? boss.maxHp : null });
    if (boss) bossHp = boss.alive ? boss.hp : 0;
    if (!b.win) break;
  }
  return { floors, runMs, bossHp };
}

root.EnBattle = { RULES, LIB, PAS, FOES, FLOORS, floorSeed, makeRng, create, step, nextAt, run, heroSrc, floorFoes, floorBattle, floorMs, simRun, elemMul, ready, pct };
})(typeof window !== 'undefined' ? window : globalThis);
