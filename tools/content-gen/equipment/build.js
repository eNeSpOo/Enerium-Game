/* Снаряжение: GDD §21 (слоты, 63 шаблона, ношение), §22 (перековка), §23 (сундук снаряжения), §3 (характеристики, кривая цикла),
   §5 (бой), §6 (БМ, слой 2); ADR-0003, ADR-0023, ADR-0026, ADR-0027, ADR-0028. Черновик · предложение · ждёт автора.
   Все числа — демонстрация, только целые. Центры строк — в сотых долях, множители и доли — в процентах и базисных пунктах.

   Пишет:
   - design/ui/equipment.js — данные прототипа (window.EN_EQUIPMENT) и алгоритм генерации (window.EnEquip) из mint.js, руками не править;
   - docs/content/снаряжение.md — только таблицы: каждая между метками «<!-- @таблица имя -->» и «<!-- /таблица имя -->»; текст — ручной.
   Только читает: design/ui/lootboxes.js (сундук снаряжения, окна, Арена и Лига — экономика), design/ui/battle.js (правила и карта
   бойца — вклад в БМ), design/ui/recipes.js (ларцы снаряжения из крафта).
   Любая ошибка — файлы не пишутся. Пересборка даёт те же байты.
   Запуск: node tools/content-gen/equipment/build.js           — собрать и записать;
           node tools/content-gen/equipment/build.js --check   — только проверить, что файлы свежие.
   Из других скриптов: require('./build.js').build() — { data, tables, warn, err } без записи. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  mint: path.join(__dirname, 'mint.js'),
  loot: path.join(ROOT, 'design', 'ui', 'lootboxes.js'),
  battle: path.join(ROOT, 'design', 'ui', 'battle.js'),
  recipes: path.join(ROOT, 'design', 'ui', 'recipes.js'),
  out: path.join(ROOT, 'design', 'ui', 'equipment.js'),
  doc: path.join(ROOT, 'docs', 'content', 'снаряжение.md'),
};

/* ================================ ДАННЫЕ ================================ */

const RARITY = ['обычная', 'редкая', 'уникальная', 'эпическая', 'древняя', 'первородная', 'вневременная'];

/* Правила. Числа — демонстрация, их правит автор. */
const RULES = {
  bp: 10000,
  openCycle: 2,                 // снаряжение приходит с Ареной и Лигой: рейтинговые режимы открываются с цикла II (§16, уровень 10)
  slots: ['head', 'chest', 'hands', 'legs', 'feet', 'main', 'off', 'ring', 'amulet'],   // §21.1: девять
  /* «Под верх цикла» (§21.2): центр главной строки — доля эталона. Эталон — главная характеристика героя цикла I в прототипе
     (образцы классов, screens/heroes.js HR_DATA.st); на цикле c эталон и все плоские строки × cycMul */
  ref: 245,
  mainShare: 220,               // центр главной строки обычной брони — 2,20 % эталона (сотые доли процента)
  ladder: [100, 120, 144, 173, 207, 249, 299],   // сила строки по редкости, % к обычной: ×1,2 за ступень
  cycMul: [100, 160, 260, 410, 660, 1050],        // плоские строки — кривая базы §3.3: ×1 … ×10,5
  cycSec: [100, 115, 130, 145, 160, 175],         // строки в процентах — мягкая кривая: иначе к циклу VI урон крита вырос бы в 10 раз
  width: { main: 15, extra: 10 },                 // ± % от центра: главная строка — самый широкий диапазон (§21.1)
  extraShare: 50,               // доп. характеристика — половина главной строки той же редкости
  secShare: 60,                 // вторичное свойство сверх главной строки — 60 % центра этого свойства
  /* строк сверх главной у брони и оружия: число строк = ступень редкости (§21.2), вторичка — с эпической, сверх пяти базовых — вторичка */
  lines: { char: [0, 1, 2, 2, 3, 4, 4], sec: [0, 0, 0, 1, 1, 1, 2] },
  reforge: { need: 10, gold: [2500, 5000, 10000, 20000, 40000, 80000] },   // §22: 10 → 1 редкостью выше; золото за вход × цикл итога
  caskets: { chest_eq4: 4, chest_eq6: 6 },       // ларцы крафта (recipes.js): один предмет своей редкости, слот случайный
  lowPct: 50,                   // «ниже половины здоровья» — порог «Хищника» и «Течения» библиотеки (Тьма, Вода)
};

/* Слоты §21.1. main — главная строка; sec — вторичные свойства слота: [вид, вес]. Имена — рабочие, для предмета — имя слота */
const SLOTS = {
  head: { n: 'Шлем', grp: 'armor', main: 'int', sec: [['critDmg', 1], ['healLow', 1], ['shieldUp', 1], ['dotReduce', 1]] },
  chest: { n: 'Доспех', grp: 'armor', main: 'end', sec: [['hpPct', 1], ['physReduce', 1], ['dotReduce', 1], ['shieldUp', 1]] },
  hands: { n: 'Перчатки', grp: 'armor', main: 'str', sec: [['critDmg', 1], ['armorPen', 1], ['lifesteal', 1], ['dmgLow', 1]] },
  legs: { n: 'Поножи', grp: 'armor', main: 'agi', sec: [['evade', 1], ['hpPct', 1], ['physReduce', 1], ['dmgLow', 1]] },
  feet: { n: 'Сапоги', grp: 'armor', main: 'spd', sec: [['evade', 1], ['dotReduce', 1], ['lifesteal', 1], ['healLow', 1]] },
  main: { n: 'Оружие', grp: 'weapon', main: 'dmg', sec: [['critDmg', 1], ['armorPen', 1], ['dmgLow', 1], ['lifesteal', 1]] },
  off: { n: 'Щит', grp: 'weapon', main: 'guard', sec: [['physReduce', 1], ['shieldUp', 1], ['hpPct', 1], ['evade', 1]] },
  ring: { n: 'Кольцо', grp: 'jewel', main: 'critDmg', sec: 'all' },
  amulet: { n: 'Амулет', grp: 'jewel', main: 'hpPct', sec: 'all' },
};
const GROUPS = { armor: 'броня', weapon: 'оружие', jewel: 'украшение' };

/* Виды строк. Характеристики и строки оружия — плоские (flat), растут по кривой базы; вторичные — в процентах (sec).
   st — индекс характеристики [Сила, Интеллект, Ловкость, Выносливость, Скорость]; w — вес вида, % к главной строке брони:
   очко скорости в БМ стоит втрое дороже очка главной характеристики (§6: скорость атаки множит УВС), поэтому её строки мельче.
   core — как свойство ложится в бой прототипа: пассивка библиотеки (pas) или множитель здоровья карты (hpPct).
   bm — вклад в БМ (§6, слой 2): auto — через характеристики карты бойца; crit, eva — в формулу УВС и ЭЗ;
   [сторона, доля] — доля значения в УВС (off) или ЭЗ (def), как у боевых талисманов. base — центр на обычной редкости, сотые %. */
const KINDS = {
  str: { n: 'Сила', st: 0, grow: 'flat', w: 100, ico: 'icon:str' },
  int: { n: 'Интеллект', st: 1, grow: 'flat', w: 100, ico: 'icon:int' },
  agi: { n: 'Ловкость', st: 2, grow: 'flat', w: 100, ico: 'icon:agi' },
  end: { n: 'Выносливость', st: 3, grow: 'flat', w: 100, ico: 'icon:end' },
  spd: { n: 'Скорость', st: 4, grow: 'flat', w: 40, ico: 'icon:spd' },
  dmg: { n: 'Урон', to: 'main', grow: 'flat', w: 150, ico: 'icon:patk', d: 'к главной характеристике героя: от неё идёт обычная атака (§5.2)' },
  guard: { n: 'Защита', to: 'guard', st2: [0, 1], grow: 'flat', w: 70, ico: 'icon:def-phys', d: 'к Силе и Интеллекту: физическая и магическая защита' },
  critDmg: { n: 'Урон крита', unit: '%', grow: 'sec', base: 400, core: { pas: 'critDmg' }, bm: 'crit', ico: 'icon:critdmg' },
  evade: { n: 'Уклонение', unit: '%', grow: 'sec', base: 150, core: { pas: 'evade' }, bm: 'eva', ico: 'icon:eva' },
  hpPct: { n: 'Здоровье', unit: '%', grow: 'sec', base: 300, core: 'hpPct', bm: 'auto', ico: 'icon:hp' },
  lifesteal: { n: 'Вампиризм', unit: '%', grow: 'sec', base: 100, core: { pas: 'lifesteal' }, bm: ['def', 5000], ico: 'ic:drop' },
  armorPen: { n: 'Пробитие брони', unit: '%', grow: 'sec', base: 300, core: { pas: 'armorPen' }, bm: ['off', 2500], ico: 'ic:crack' },
  physReduce: { n: 'Меньше физ. урона', unit: '%', grow: 'sec', base: 150, core: { pas: 'physReduce' }, bm: ['def', 5000], ico: 'icon:def-phys' },
  dmgLow: { n: 'Урон по раненым', unit: '%', grow: 'sec', base: 400, core: { pas: 'dmgVsLow', belowPct: RULES.lowPct }, bm: ['off', 2500], ico: 'ic:skull' },
  healLow: { n: 'Лечение раненых', unit: '%', grow: 'sec', base: 400, core: { pas: 'healVsLow', belowPct: RULES.lowPct }, bm: ['off', 2000], ico: 'ic:heal' },
  shieldUp: { n: 'Сила щитов', unit: '%', grow: 'sec', base: 400, core: { pas: 'shieldUp' }, bm: ['def', 2000], ico: 'ic:shield' },
  dotReduce: { n: 'Меньше урона по времени', unit: '%', grow: 'sec', base: 400, core: { pas: 'dotReduce' }, bm: ['def', 1500], ico: 'ic:flame' },
};
const CHARS = ['str', 'int', 'agi', 'end', 'spd'];
/* что делает вторичное свойство — строка для листа; {v} — значение */
const SEC_FX = {
  critDmg: 'Критический удар сильнее на {v} %', evade: 'Уклонение +{v} %', hpPct: 'Здоровье +{v} %', lifesteal: 'Лечится на {v} % нанесённого урона',
  armorPen: 'Обычные атаки пробивают {v} % физической защиты', physReduce: 'Получаемый физический урон −{v} %',
  dmgLow: 'Урон по целям ниже половины здоровья +{v} %', healLow: 'Лечение целей ниже половины здоровья +{v} %',
  shieldUp: 'Щиты героя крепче на {v} %', dotReduce: 'Получаемый урон по времени −{v} %',
};

/* Эталонные герои для таблицы БМ — образцы классов прототипа (screens/heroes.js, HR_DATA.st); уровень — верх цикла I, предел I */
const SAMPLE = {
  lvl: 50,
  cls: [
    ['Танк', [128, 54, 72, 246, 62]],
    ['Физ. ДД силы', [245, 54, 128, 72, 62]],
    ['Физ. ДД ловкости', [128, 54, 245, 72, 62]],
    ['Маг. ДД', [72, 246, 54, 62, 128]],
    ['Лекарь', [62, 246, 54, 128, 72]],
    ['Контроль', [62, 246, 54, 128, 72]],
  ],
};
/* Экономика: планки Арены и Лиги, где заканчивает неделю обычный и увлечённый игрок, — typical из lootboxes.js. Недель в цикле —
   как у талисманов и сет-бонусов: II — 2, III–VI — по 3. Отряд — 45 мест: пять героев по девять слотов */
const ECON = { who: ['free', 'fan'], cycles: [2, 3, 4, 5, 6], weeks: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3 }, modes: ['arena', 'league'], squad: 45 };

/* ================================ СБОРКА ================================ */

const isInt = x => Number.isInteger(x);
const fl = (a, b) => Math.floor(a / b);
function isqrt(n) { if (n < 2) return n; let x = n, y = fl(x + 1, 2); while (y < x) { x = y; y = fl(x + fl(n, x), 2); } return x; }

function build() {
  const err = [], warn = [];
  const MINT_SRC = fs.readFileSync(FILES.mint, 'utf8').replace(/\r\n/g, '\n');
  const mctx = {}; mctx.window = mctx; vm.createContext(mctx); vm.runInContext(MINT_SRC, mctx, { filename: 'mint.js' });
  const EQ = mctx.EnEquip;

  /* --- шаблоны: 9 слотов × 7 редкостей --- */
  const mainC = (kind, r) => { const K = KINDS[kind]; return K.grow === 'sec' ? fl(K.base * RULES.ladder[r - 1], 100) : fl(RULES.ref * RULES.mainShare * RULES.ladder[r - 1] * K.w, 1000000); };
  const extraC = (kind, r) => fl(mainC(kind, r) * (KINDS[kind].grow === 'sec' ? RULES.secShare : RULES.extraShare), 100);
  const templates = {};
  for (const slot of RULES.slots) {
    const S = SLOTS[slot], jewel = S.grp === 'jewel';
    const secPool = S.sec === 'all' ? Object.keys(KINDS).filter(k => KINDS[k].grow === 'sec' && k !== S.main).map(k => [k, 1]) : S.sec;
    for (let r = 1; r <= 7; r++) {
      const nChar = jewel ? 0 : RULES.lines.char[r - 1], nSec = jewel ? r - 1 : RULES.lines.sec[r - 1];
      const chars = CHARS.filter(k => k !== S.main).map(k => [k, extraC(k, r), RULES.width.extra]);
      const T = { slot, r, main: [S.main, mainC(S.main, r), RULES.width.main], chars: { n: nChar, pool: nChar ? chars : [] },
        secs: { n: nSec, pool: nSec ? secPool.map(([k, w]) => [k, w, extraC(k, r), RULES.width.extra]) : [] } };
      if (1 + nChar + nSec !== r) err.push(`${slot}.${r}: строк ${1 + nChar + nSec}, а редкость ${r} (§21.2: число строк = ступень редкости)`);
      if (T.chars.pool.length < nChar || T.secs.pool.length < nSec) err.push(`${slot}.${r}: в пуле строк меньше, чем строк`);
      templates[slot + '.' + r] = T;
    }
  }
  if (Object.keys(templates).length !== 63) err.push(`шаблонов ${Object.keys(templates).length}, по §21.2 — 63`);

  /* --- ларцы из крафта: такие предметы есть в recipes.js и у них та же редкость --- */
  const rctx = {}; rctx.window = rctx; vm.createContext(rctx); vm.runInContext(fs.readFileSync(FILES.recipes, 'utf8'), rctx);
  for (const [id, r] of Object.entries(RULES.caskets)) {
    const it = rctx.EN_RECIPES.items.find(x => x.id === id);
    if (!it) err.push(`ларец ${id}: нет в recipes.js`); else if (it.r !== r) err.push(`ларец ${id}: редкость в recipes.js ${it.r}, в правилах ${r}`);
  }

  const data = {
    meta: { builder: 'tools/content-gen/equipment/build.js', templates: Object.keys(templates).length },
    rules: Object.assign({}, RULES, { rarity: RARITY, groups: GROUPS, chars: CHARS }),
    slots: SLOTS, kinds: Object.fromEntries(Object.entries(KINDS).map(([k, K]) => [k, Object.assign({}, K, SEC_FX[k] ? { fx: SEC_FX[k] } : {})])),
    templates,
  };

  /* --- диапазоны и перехлёст соседних редкостей: главная строка брони, по циклам --- */
  const R = (slot, r, cyc) => { const T = templates[slot + '.' + r]; return EQ.rangeOf(data, T.main[0], T.main[1], T.main[2], cyc); };
  const overlap = [];
  for (let c = RULES.openCycle; c <= 6; c++) for (const slot of RULES.slots) for (let r = 1; r < 7; r++) {   // цикл I — калибровка: предметов цикла I нет
    const a = R(slot, r, c), b = R(slot, r + 1, c);
    if (a[1] < b[0]) err.push(`${slot}, цикл ${c}: лучшая ${RARITY[r - 1]} (${a[1]}) не догоняет худшую ${RARITY[r]} (${b[0]}) — перехлёста нет`);
    if (b[0] < a[0] || b[1] <= a[1]) err.push(`${slot}, цикл ${c}: ${RARITY[r]} (${b.join('–')}) не выше ${RARITY[r - 1]} (${a.join('–')})`);
    if (slot === 'hands') overlap.push({ c, r, pct: fl((a[1] - b[0]) * 1000, b[0]) });
  }

  /* --- генерация: сид даёт тот же предмет, бросков — по формату, строки в диапазоне, виды не повторяются --- */
  let minted = 0;
  const mean = {};
  for (const slot of RULES.slots) for (let r = 1; r <= 7; r++) for (let c = 1; c <= 6; c++) for (let k = 0; k < 40; k++) {
    const seed = EQ.seedOf(['проверка', slot, r, c, k].join('|')), tr = [], tr2 = [];
    const given = k % 2 === 0, spec = { slot: given ? slot : null, r, cyc: c };
    const a = EQ.mint(data, spec, seed, tr), b = EQ.mint(data, spec, seed, tr2);
    if (JSON.stringify(a) !== JSON.stringify(b)) err.push(`${slot}.${r}: один сид — два предмета`);
    const T = templates[a.slot + '.' + r];
    if (tr.length !== EQ.rollsOf(T, given)) err.push(`${slot}.${r}: бросков ${tr.length}, по формату ${EQ.rollsOf(T, given)}`);
    if (a.lines.length !== r) err.push(`${slot}.${r}: строк ${a.lines.length}`);
    const kinds = a.lines.map(x => x[0]); if (new Set(kinds).size !== kinds.length) err.push(`${slot}.${r}: вид строки повторился`);
    const spec2 = [T.main].concat(T.chars.pool, T.secs.pool.map(x => [x[0], x[2], x[3]]));
    for (const [kd, v] of a.lines) {
      const s = spec2.find(x => x[0] === kd), rg = EQ.rangeOf(data, kd, s[1], s[2], c);
      if (!isInt(v) || v < rg[0] || v > rg[1]) err.push(`${a.slot}.${r}, цикл ${c}: ${kd} = ${v} вне ${rg.join('…')}`);
    }
    if (given && c === 1) { const k0 = a.slot + '.' + r; mean[k0] = mean[k0] || [0, 0]; mean[k0][0] += a.lines[0][1]; mean[k0][1]++; }
    minted++;
  }

  /* --- вклад в БМ (§6, слой 2): полный комплект средних строк на эталонном герое класса --- */
  const bctx = { console, window: {} }; bctx.window = bctx; vm.createContext(bctx);
  vm.runInContext(fs.readFileSync(FILES.battle, 'utf8'), bctx, { filename: 'battle.js' });
  const EB = bctx.EnBattle, RB = EB.RULES;
  const unitOf = (cls, st, hpPct) => EB.create({ mode: 'rounds', heroes: [{ key: 'x', id: 'x', name: 'x', cls, el: 'Земля', lvl: SAMPLE.lvl, st, hpPct, abs: [], pas: [], kit: null }], foes: [], seed: 1 }).u[0][0];
  /* УВС и ЭЗ карты — как BM.unit (design/ui/index.html, общая функция мощи §6), целыми; eva — с добавкой уклонения, не выше колпака с эффектами */
  const sides = (u, addCrit, addEva) => {
    const kl = RB.K * u.lvl, cap = RB.caps.defPct * 100;
    const mit = k => Math.min(cap, fl(u.def[k] * 10000, Math.max(1, kl + u.def[k])));
    const m = fl(mit('str') + mit('int'), 2), eva = Math.min(RB.buffCaps.evaBp, u.eva + addEva * 100);
    return { off: fl(u.atk[u.main] * u.as * (1000000 + u.crit * (u.critDmg + addCrit - 100)), 100), def: fl(fl(u.maxHp * 10000, 10000 - m) * 10000, 10000 - eva) };
  };
  /* ожидаемая прибавка комплекта редкости r на цикле c: главная — центр, доп. строки — поровну по пулу, в сотых */
  const setAdd = (r, c, main) => {
    const st = [0, 0, 0, 0, 0], sec = {}, M = k => data.rules[KINDS[k].grow === 'sec' ? 'cycSec' : 'cycMul'][c - 1];
    const put = (k, v100) => { const K = KINDS[k]; if (K.st != null) st[K.st] += v100; else if (K.to === 'main') st[main] += v100; else if (K.to === 'guard') K.st2.forEach(i => { st[i] += v100; }); else sec[k] = (sec[k] || 0) + v100; };
    for (const slot of RULES.slots) {
      const T = templates[slot + '.' + r];
      put(T.main[0], fl(T.main[1] * M(T.main[0]), 100));
      if (T.chars.n) for (const [k, cc] of T.chars.pool) put(k, fl(cc * M(k) * T.chars.n, 100 * T.chars.pool.length));
      if (T.secs.n) { const W = T.secs.pool.reduce((a, x) => a + x[1], 0); for (const [k, w, cc] of T.secs.pool) put(k, fl(cc * M(k) * T.secs.n * w, 100 * W)); }
    }
    return { st, sec };
  };
  const MAIN_I = { str: 0, int: 1, agi: 2, sta: 3 };
  const gain = (cls, st0, add) => {
    const main = MAIN_I[RB.cls[cls].main];
    const st1 = st0.map((v, i) => v + fl(add.st[i], 100)), hp = 100 + fl(add.sec.hpPct || 0, 100);
    const a = sides(unitOf(cls, st0, 100), 0, 0), b = sides(unitOf(cls, st1, hp), fl(add.sec.critDmg || 0, 100), fl(add.sec.evade || 0, 100));
    let off = fl(b.off * 10000, a.off), def = fl(b.def * 10000, a.def);
    for (const [k, v100] of Object.entries(add.sec)) { const bm = KINDS[k].bm; if (Array.isArray(bm)) { const x = fl(v100 * bm[1], 10000); if (bm[0] === 'off') off += x; else def += x; } }
    return isqrt(off * def) - 10000;   // б. п. прибавки БМ
  };
  const bmRows = [];
  for (const [cls, st] of SAMPLE.cls) {
    const main = MAIN_I[RB.cls[cls].main], row = { cls, full: [], wing: 0, one: 0 };
    for (let r = 1; r <= 7; r++) row.full.push(gain(cls, st, setAdd(r, 1, main)));
    row.wing = gain(cls, st, setAdd(4, 2, main));
    /* один предмет: главная строка эпического основного оружия цикла I */
    const w = { st: [0, 0, 0, 0, 0], sec: {} }; w.st[main] = fl(templates['main.4'].main[1] * RULES.cycMul[0], 100); row.one = gain(cls, st, w);
    bmRows.push(row);
  }

  /* --- экономика: сколько предметов приносят Арена и Лига, точно по окнам сундуков --- */
  const lctx = { console }; lctx.window = lctx; vm.createContext(lctx); vm.runInContext(fs.readFileSync(FILES.loot, 'utf8'), lctx, { filename: 'lootboxes.js' });
  const LB = lctx.EN_LOOTBOXES, EnLoot = lctx.EnLoot;
  if (!LB.boxes.equip || !LB.lines.equip) err.push('lootboxes.js: нет сундука или линии снаряжения');
  const X = 10000;   // ожидаемое — в десятитысячных долях предмета, целые
  const expect = (spec, count) => {
    const def = EnLoot.resolve(LB, spec), out = Array(7).fill(0), bpSum = def.window.reduce((a, x) => a + x[1], 0);
    for (const [x, bp] of def.window) {
      const lines = def.byR[x] || [], W = lines.reduce((a, l) => a + l.w, 0), eq = lines.find(l => l.line === 'equip');
      if (!eq || !W) continue;
      const num = count * def.n * bp * eq.w * X, den = bpSum * W;
      if (num % den) err.push(`экономика: доля ${spec.box} ${spec.r} не делится нацело`);
      out[x - 1] += num / den;
    }
    return out;
  };
  const addTo = (a, b) => a.map((x, i) => x + b[i]);
  const econ = { rows: [], weeks: ECON.weeks, squad: ECON.squad, x: X };
  const cum = { free: Array(7).fill(0), fan: Array(7).fill(0) };
  for (const c of ECON.cycles) {
    const row = { c, weeks: ECON.weeks[c] };
    for (const who of ECON.who) {
      let wk = Array(7).fill(0);
      for (const mid of ECON.modes) {
        const m = LB.modes[mid]; if (!m || c < m.from) continue;
        const ly = m.layers.find(l => l.kind === 'plank' && !l.clan), top = (m.typical[who] || {})[ly.id] || 0;
        for (const rw of ly.rows.slice(0, top)) for (const ch of rw.cyc[c] || []) wk = addTo(wk, expect({ box: m.box, r: ch.r, win: ch.win, cyc: c }, ch.count));
      }
      const per = wk.map(x => x * ECON.weeks[c]);
      cum[who] = addTo(cum[who], per);
      row[who] = { week: wk, cycle: per, cum: cum[who].slice() };
      /* сверка с EN_LOOTBOXES.week: там предметы снаряжения в неделю, ×100 */
      const w100 = ECON.modes.reduce((a, mid) => a + ((LB.week[mid] && LB.week[mid][c] && LB.week[mid][c][who]) ? LB.week[mid][c][who].eq : 0), 0);
      const mine = wk.reduce((a, x) => a + x, 0);
      if (Math.round(mine * 100 / X) !== w100) err.push(`экономика: цикл ${c}, ${who} — ${mine / X} предметов в неделю, в lootboxes.js ${w100 / 100}`);
    }
    econ.rows.push(row);
  }
  data.econ = econ;
  data.bm = { lvl: SAMPLE.lvl, rows: bmRows };

  /* --- все числа данных — целые --- */
  const walk = (x, where) => { if (typeof x === 'number' && !isInt(x)) err.push(`не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, where + '.' + k); };
  walk(Object.assign({}, data, { econ: null }), 'EN_EQUIPMENT');
  for (const r of econ.rows) for (const who of ECON.who) for (const k of ['week', 'cycle', 'cum']) r[who][k].forEach((v, i) => { if (!isInt(v)) err.push(`экономика: не целое ${v}`); });

  /* --- таблицы документа --- */
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const dec = (x, d = 1) => { const p = 10 ** d, v = Math.round(x * p / X) / p; return String(v).replace('.', ','); };
  const pctBp = bp => { const s = bp < 0 ? '−' : '+', a = Math.abs(bp), i = fl(a, 100), f = fl(a % 100, 10); return `${s}${i}${f ? ',' + f : ''} %`; };
  const kindTxt = k => KINDS[k].n + (KINDS[k].unit ? ', %' : '');
  const rg = (slot, r, c) => { const x = R(slot, r, c); return x[0] === x[1] ? String(x[0]) : `${x[0]}–${x[1]}`; };
  const TBL = {};
  let T = ['| Слот | Группа | Главная строка | Вторичные свойства слота |', '|---|---|---|---|'];
  for (const slot of RULES.slots) {
    const S = SLOTS[slot], sec = S.sec === 'all' ? 'любое, кроме главного' : S.sec.map(([k]) => KINDS[k].n.toLowerCase()).join(', ');
    T.push(`| ${S.n} | ${GROUPS[S.grp]} | ${kindTxt(S.main)}${KINDS[S.main].d ? ' — ' + KINDS[S.main].d : ''} | ${sec} |`);
  }
  TBL.slots = T.join('\n');
  T = ['| Редкость | Строк | Броня и оружие: главная + характеристики + вторичные | Украшения: главная + вторичные |', '|---|---|---|---|'];
  for (let r = 1; r <= 7; r++) T.push(`| ${RARITY[r - 1]} | ${r} | 1 + ${RULES.lines.char[r - 1]} + ${RULES.lines.sec[r - 1]} | 1 + ${r - 1} |`);
  TBL.lines = T.join('\n');
  const C0 = RULES.openCycle;   // первый цикл снаряжения: таблицы диапазонов — на нём
  T = [`| Слот · главная строка, цикл ${ROMAN(C0)} | ${RARITY.join(' | ')} |`, `|---|${RARITY.map(() => '---').join('|')}|`];
  for (const slot of RULES.slots) T.push(`| ${SLOTS[slot].n} · ${KINDS[SLOTS[slot].main].n.toLowerCase()} | ${RARITY.map((_, i) => rg(slot, i + 1, C0)).join(' | ')} |`);
  const exR = (k, r, c) => { const x = EQ.rangeOf(data, k, extraC(k, r), RULES.width.extra, c); return x[0] === x[1] ? String(x[0]) : `${x[0]}–${x[1]}`; };
  T.push(`| Доп. характеристика · сила, интеллект, ловкость, выносливость | ${RARITY.map((_, i) => i ? exR('str', i + 1, C0) : '—').join(' | ')} |`);
  T.push(`| Доп. характеристика · скорость | ${RARITY.map((_, i) => i ? exR('spd', i + 1, C0) : '—').join(' | ')} |`);
  TBL.templates = T.join('\n');
  T = [`| Вторичное свойство | Что делает | В бою прототипа | В БМ | Главная строка украшения, цикл ${ROMAN(C0)}: обычная … вневременная | Доп. строка, цикл ${ROMAN(C0)} |`, '|---|---|---|---|---|---|'];
  for (const [k, K] of Object.entries(KINDS)) {
    if (K.grow !== 'sec') continue;
    const core = K.core === 'hpPct' ? 'да: здоровье карты' : `да: пассивка «${K.core.pas}»`;
    const bm = K.bm === 'auto' ? 'через здоровье карты' : K.bm === 'crit' ? 'в УВС: урон крита' : K.bm === 'eva' ? 'в ЭЗ: уклонение' : `${K.bm[0] === 'off' ? 'УВС' : 'ЭЗ'} × ${dec(K.bm[1] * X / 10000, 2)}`;
    const mains = RARITY.map((_, i) => { const x = EQ.rangeOf(data, k, mainC(k, i + 1), RULES.width.main, C0); return x[0] === x[1] ? x[0] : `${x[0]}–${x[1]}`; }).join(' / ');
    const ext = RARITY.map((_, i) => exR(k, i + 1, C0)).join(' / ');
    T.push(`| ${K.n} | ${SEC_FX[k].replace('{v}', 'N')} | ${core} | ${bm} | ${mains} | ${ext} |`);
  }
  TBL.sec = T.join('\n');
  T = ['| Цикл | Множитель плоских строк | Перчатки · сила: обычная / эпическая / вневременная | Множитель строк в % | Кольцо · урон крита: обычная / эпическая / вневременная |', '|---|---|---|---|---|'];
  for (let c = 1; c <= 6; c++) T.push(`| ${ROMAN(c)}${c < C0 ? ' · калибровка, предметов нет' : ''} | ×${dec(RULES.cycMul[c - 1] * X / 100, 2)} | ${[1, 4, 7].map(r => rg('hands', r, c)).join(' / ')} | ×${dec(RULES.cycSec[c - 1] * X / 100, 2)} | ${[1, 4, 7].map(r => rg('ring', r, c)).join(' / ')} |`);
  TBL.cycles = T.join('\n');
  T = [`| Перехлёст: лучшая против худшей следующей, перчатки · сила | ${RARITY.slice(0, 6).map((x, i) => `${x} → ${RARITY[i + 1]}`).join(' | ')} |`, `|---|${RARITY.slice(0, 6).map(() => '---').join('|')}|`];
  for (let c = C0; c <= 6; c++) T.push(`| цикл ${ROMAN(c)} | ${overlap.filter(o => o.c === c).map(o => `${o.pct >= 0 ? '+' : '−'}${String(Math.abs(o.pct) / 10).replace('.', ',')} %`).join(' | ')} |`);
  TBL.overlap = T.join('\n');
  T = [`| Класс · эталон цикла I, уровень ${SAMPLE.lvl} | Полный комплект: ${RARITY.join(' / ')} | Эпический комплект цикла II — «крыло ангела» | Одно эпическое оружие |`, '|---|---|---|---|'];
  for (const row of bmRows) T.push(`| ${row.cls} | ${row.full.map(pctBp).join(' / ')} | ${pctBp(row.wing)} | ${pctBp(row.one)} |`);
  TBL.bm = T.join('\n');
  const sum = a => a.reduce((x, y) => x + y, 0);
  T = ['| Цикл | Недель | В неделю: обычный / увлечённый | За цикл | К концу цикла | Отрядов по 45 мест к концу цикла |', '|---|---|---|---|---|---|'];
  for (const r of econ.rows) T.push(`| ${ROMAN(r.c)} | ${r.weeks} | ${dec(sum(r.free.week))} / ${dec(sum(r.fan.week))} | ${dec(sum(r.free.cycle))} / ${dec(sum(r.fan.cycle))} | ${dec(sum(r.free.cum))} / ${dec(sum(r.fan.cum))} | ${dec(sum(r.free.cum) / ECON.squad)} / ${dec(sum(r.fan.cum) / ECON.squad)} |`);
  TBL.econ = T.join('\n');
  T = [`| Цикл | ${RARITY.join(' | ')} |`, `|---|${RARITY.map(() => '---').join('|')}|`];
  for (const r of econ.rows) T.push(`| ${ROMAN(r.c)} | ${r.free.cum.map((x, i) => `${dec(x)} / ${dec(r.fan.cum[i])}`).join(' | ')} |`);
  TBL.rarity = T.join('\n');
  data.meta.sha256 = crypto.createHash('sha256').update(JSON.stringify(templates)).digest('hex');
  return { data, tables: TBL, warn, err, minted, mintSrc: MINT_SRC };
}
function ROMAN(c) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][c]; }

/* ================================ ВЫВОД ================================ */

function render(data, mintSrc) {
  const head = `/* Снаряжение — данные прототипа «Свет снизу». Собирает tools/content-gen/equipment/build.js из своего раздела «ДАННЫЕ»;
   руками не править: пересборка затрёт правку. Черновик · предложение · ждёт автора — docs/content/снаряжение.md.
   Числа — демонстрация, только целые: центры строк — в сотых долях, множители — в процентах, доли — в базисных пунктах.
   В игре предмет создаёт сервер: сид, шаблон и итог — его (GDD §21.2, §34.1, §36.16). Ниже данных — алгоритм генерации
   (window.EnEquip), тот же, что в сборщике. */\n`;
  return head + 'window.EN_EQUIPMENT = ' + JSON.stringify(data) + ';\n\n' + mintSrc;
}
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/equipment/build.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) return null;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { build, render, withTables, markA, markB, FILES };

if (require.main === module) {
  const R = build();
  for (const w of R.warn) console.log('предупреждение: ' + w);
  if (R.err.length) { console.log('ОШИБКИ:\n' + [...new Set(R.err)].slice(0, 40).join('\n')); process.exit(1); }
  const js = render(R.data, R.mintSrc);
  const docOld = fs.existsSync(FILES.doc) ? fs.readFileSync(FILES.doc, 'utf8') : null;
  const docNew = docOld ? withTables(docOld, R.tables) : null;
  if (process.argv.includes('--check')) {
    const okJs = fs.existsSync(FILES.out) && fs.readFileSync(FILES.out, 'utf8') === js, okDoc = !docOld || docNew === docOld;
    console.log(okJs && okDoc ? 'Свежие: equipment.js и таблицы документа совпадают со сборкой.' : `Устарели: ${[!okJs && 'design/ui/equipment.js', !okDoc && 'docs/content/снаряжение.md'].filter(Boolean).join(', ')} — пересобрать.`);
    process.exit(okJs && okDoc ? 0 : 1);
  }
  if (process.argv.includes('--dry')) { for (const [k, t] of Object.entries(R.tables)) console.log(`\n== ${k}\n${t}`); process.exit(0); }
  fs.writeFileSync(FILES.out, js);
  if (docNew) fs.writeFileSync(FILES.doc, docNew);
  else console.log(`предупреждение: в ${path.relative(ROOT, FILES.doc)} нет меток таблиц — таблицы не вставлены`);
  console.log(`Собрано: ${R.data.meta.templates} шаблонов, ${Object.keys(R.data.kinds).length} видов строк; проверено генераций ${R.minted}.`);
}
