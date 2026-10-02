/* Враги Эхо — девять недель, Убер-боссы и отряды недели: ADR-0025, ADR-0024, ADR-0016, ADR-0015, ADR-0010; §4, §5, §17 GDD.
   Черновик · предложение · ждёт автора. Все числа — демонстрация. Только целые числа.

   Данные — по неделям, файлы weeks/*.js: наборы 14 врагов лестницы, защитники каждой ступени (у Многоликого — ни одного), уникальные способности
   Убер-босса и наборы пятерых героев Эхо недели; Многоликий — вершина недели и один из Забытых (ADR-0039): его уникальный набор
   один на все недели — many.js. Здесь — сборка, проверки и вывод:
   - design/ui/echo-foes.js — данные для ядра боя и прототипа, руками не править. Формат — в шапке файла (FORMAT ниже);
   - docs/content/эхо-враги.md — текст doc.md, таблицы вместо @@имя@@.
   Только читает и ничего в них не меняет:
   - design/ui/screens/echo.js — блок ECH: имена, стихии, классы и облик 14 врагов каждой недели, лестница по рангам;
   - tools/content-gen/abilities/library.json — библиотека способностей (ADR-0015);
   - tools/content-gen/abilities/kits.json — ранги врагов, доли хода по редкости, наборы 110 героев черновиков (ADR-0016);
   - docs/content/герои/состав-героев.csv — герои Эхо: класс, школа, редкость, максимум доблести, неприязнь (ADR-0019, ADR-0024);
     набор героя — по законам ADR-0050: первые две записи — пара доблести 0 (активка и черта), дальше — по одной на доблесть,
     последняя — ульта; способностей — максимум + 2; у героя с максимумом 4–5 — сочетание. Неповторимость во всей игре, связку
     черты и потолок «одна черта — трём героям цикла» проверяет tools/content-gen/abilities/assign.py --check;
   - design/ui/roster.js — порядок недель, цивилизации, отряды, число неприязни (rules.aversionBp);
   - design/ui/recipes.js — облик Многоликого (предмет many).
   Любая ошибка — файлы не пишутся. Пересборка даёт те же байты.
   Запуск: node tools/content-gen/echo/build.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  echo: path.join(ROOT, 'design/ui/screens/echo.js'),
  library: path.join(ROOT, 'tools/content-gen/abilities/library.json'),
  kits: path.join(ROOT, 'tools/content-gen/abilities/kits.json'),
  csv: path.join(ROOT, 'docs/content/герои/состав-героев.csv'),
  roster: path.join(ROOT, 'design/ui/roster.js'),
  recipes: path.join(ROOT, 'design/ui/recipes.js'),
  weeks: path.join(__dirname, 'weeks'),
  many: path.join(__dirname, 'many.js'),
  doc: path.join(__dirname, 'doc.md'),
  outUi: path.join(ROOT, 'design/ui/echo-foes.js'),
  outMd: path.join(ROOT, 'docs/content/эхо-враги.md'),
};

/* ================================ ПРАВИЛА ================================ */

/* Ступень лестницы → ранг ядра (RULES.resist и доли хода в battle.js).
   Многоликий — один из Забытых, вершина лестницы (слово автора 01.10.2026, ADR-0039): ранг «Забытый», свой уникальный набор (many.js).
   Бьётся один, без свиты (ответ автора 01.10.2026: «Сделай чтобы многоликий был без свиты, и тогда его сразу же смогут убивать»):
   лица недели — в его венце. Прежний «лёгкий бой один на один с набором элиты» (ADR-0025) не вернулся: набор — свой, ранг — Забытый. */
const RANK_OF = { o: 'o', e: 'e', b: 'b', u: 'uber', m: 'forgotten' };
const RANK_KITS = { o: 'рядовой', e: 'элита', b: 'босс биома', uber: 'убер', forgotten: 'забытый' };   // ключи rankAbilities в kits.json
const RANK_ORDER = ['o', 'e', 'b', 'uber', 'forgotten'];                                           // «сила защитников не выше главного» — по рангу
const RANK_NAME = { o: 'рядовой', e: 'элита', b: 'босс недели', uber: 'убер', forgotten: 'Забытый' };
const G_NAME = { o: 'рядовой', e: 'элита', b: 'босс', u: 'Убер-босс', m: 'Многоликий' };
const UBER_ULTS = [1, 2];         // ADR-0025: «варианты и с 2 ультами» — у Убер-босса одна или две ульты в пяти способностях
const DEFENDERS = 4;              // ADR-0025, п. 1: главный враг и четыре защитника; у Многоликого — ни одного (ADR-0039, ответ автора)
const defendersOf = g => (g === 'm' ? 0 : DEFENDERS);
/* Составы защитников растут по лестнице: [первая ступень, последняя, { ранг: сколько }]. Ранг защитника — не выше главного. */
const DEF_MIX = [
  [1, 6, { o: 4 }],
  [7, 8, { e: 1, o: 3 }],
  [9, 10, { e: 2, o: 2 }],
  [11, 12, { e: 2, o: 2 }],
  [13, 13, { e: 3, o: 1 }],
  [14, 14, { b: 1, e: 3 }],
  [15, 15, {}],               // Многоликий — вершина и бьётся один, без свиты (ADR-0039, ответ автора 01.10.2026)
];
const TGT = ['threat', 'danger', 'lowest', 'healer', 'ally_lowest', 'ally_strong', 'all', 'allies', 'self'];

/* Что ядру нужно добавить для уникальных способностей Уберов. Поля и значения здесь — единственное, что разрешено сверх библиотеки:
   поле уникальной способности, которого нет ни в библиотеке, ни в этом списке, — ошибка сборки. */
const NEED = {
  basicAll: { n: 'Обычная атака по всем', fields: [],
    d: 'Поле врага basic: { tgt: "all", coef }. Обычная атака бьёт всех живых противников, каждого — coef % главного стата. Удар массовый: угрозы не создаёт и не учитывает (§5.3). У каждой цели свои броски уклонения и крита — по порядку карт стороны. Реакции на удар — как обычно.' },
  cast: { n: 'Способность по реакции', fields: ['cast'],
    d: 'Реакция с полем cast сразу применяет эту способность из набора владельца — вне очереди, без броска таблицы шансов. Запреты — как в ходе: под пропуском хода и безмолвием ничего не выходит, под «Остановкой» ульта не срабатывает; реакция всё равно считается сработавшей. Ульта по реакции вызывает ответы противников на ульту: «Уклон от бури», «Задержку», «Слепящий ответ».' },
  doom: { n: 'Отложенный удар', fields: [], values: { st: ['doom'] },
    d: 'Дебафф st: "doom" с coef. Тает в конце хода носителя, как любой дебафф, и под пропуском хода тоже. Когда спадает, носитель получает удар наложившего: coef % его главного стата по формуле удара §5.2, с бросками уклонения и крита. Наложивший пал — метка спадает без удара. Снимается и отражается, как любой дебафф: «Полноводье», «Чистый поток», «Отражение порчи».' },
  guardPerAlly: { n: 'Сила от союзников', fields: ['guardPct', 'dmgPct'], values: { pas: ['guardPerAlly'] },
    d: 'Пассивка: −guardPct % получаемого урона за каждого живого союзника и +dmgPct % урона за каждого павшего союзника. Считается в момент удара; урон не ниже 1.' },
  steal: { n: 'Забрать эффекты', fields: ['steal'],
    d: 'Поле steal способности: после её действия у каждой цели забирается до steal положительных эффектов — сначала баффы из GOOD_ST с их силой и оставшейся длительностью, затем щит целиком, не выше предела щита наложившего. "all" — все. Бросков нет. Нечего забрать — только основное действие.' },
  focus: { n: 'Цель для всех', fields: ['focus'],
    d: 'Дебафф с полем focus: пока эффект на цели и она жива, все союзники наложившего выбирают её для обычной атаки и способностей с правилом «по угрозе». Другие правила цели — «самый раненый», «лекарь», массовые — не меняются. Снимается, как любой дебафф.' },
  everyN: { n: 'Каждый N-й ход', fields: ['cast'], values: { pas: ['everyN'] },
    d: 'Пассивка: каждый every-й свой ход — ход, в котором карта действовала, — после действия применяет способность cast из своего набора вне очереди. Пропущенный ход — оглушение, заморозка, ужас, сброс — не считается. Запреты — как у cast: под «Остановкой» ульта не срабатывает, но счёт ходов идёт.' },
  ctrlBypass: { n: 'Контроль мимо иммунитета', fields: [], values: { pas: ['ctrlBypass'] },
    d: 'Пассивка: контроль из списка st ложится на носителя без броска иммунитета по рангу (§5.4, ADR-0010). Остальной контроль — с броском, как обычно.' },
  ward: { n: 'Защита до метки', fields: ['reduce', 'reflect', 'unless'], values: { pas: ['ward'] },
    d: 'Пассивка: пока на носителе нет эффекта unless, прямой урон по нему — удары, не урон по времени — меньше на reduce %, а reflect % прошедшего урона возвращается атакующему. Возврат — без бросков и защиты, как урон по времени; отражённый урон не отражается снова и не вызывает реакций на удар. Под эффектом unless пассивка молчит.' },
  mirror: { n: 'Повтор чужой ульты', fields: ['mirror'],
    d: 'Реакция на ульту противника (trig foeUlt) с полем mirror: после его ульты носитель применяет ту же ульту как свою — своими характеристиками, цели — по правилу ульты со своей стороны. Запреты — как у cast. Повторённая ульта не повторяется снова.' },
  revive: { n: 'Поднять павшего', fields: ['pct', 'unlessDot'], values: { kind: ['revive'], tgt: ['ally_dead'] },
    d: 'Способность kind: "revive", tgt: "ally_dead": поднимает павших союзников — targets последних павших, null — всех — с pct % здоровья, без эффектов; поднятый ходит со следующего раунда. Каждая карта встаёт раз за бой. Павший, на котором в момент гибели был урон по времени школы unlessDot, не встаёт — «сгоревший не встаёт». Поднимать некого — ход уходит в обычную атаку.' },
  lifeSave: { n: 'Спасение раз за жизнь цели', fields: ['survivePct', 'unlessDot'], values: { once: ['life'] },
    d: 'Реакция на смертельный удар (trig lethal) с полями survivePct, once: "life" и unlessDot: носитель остаётся с survivePct % здоровья. Раз за жизнь цели Эхо: сработавшее спасение помнится между атаками, как здоровье. Не срабатывает, если на носителе урон по времени школы unlessDot.' },
  nameless: { n: 'Срезанное имя', fields: [], values: { st: ['nameless'] },
    d: 'Контроль st: "nameless" — в списке CTL_ST, режется иммунитетом по рангу. Пока он есть, пассивки и реакции носителя не действуют, спасение от смерти тоже; ходит носитель как обычно. Тает в конце его хода.' },
  dmgVsSt: { n: 'Урон по цели под эффектом', fields: ['st'],
    d: 'Пассивка dmgVsDebuff с полем st: прибавка урона по цели под этим эффектом, а не под дебаффом своей школы.' },
};

/* ================================ ЧТЕНИЕ ================================ */

const err = [], warn = [];
const fail = m => err.push(m);
const read = f => fs.readFileSync(f, 'utf8');
function browserData(file, key) {   // выгрузка прототипа: window.KEY = {...}
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(read(file), ctx, { filename: path.basename(file) });
  if (!ctx.window[key]) throw new Error(`${path.basename(file)}: нет window.${key}`);
  return ctx.window[key];
}
function echData() {   // блок ECH экрана Эхо — чистые данные: имена, стихии, классы, облик
  const src = read(FILES.echo), a = src.indexOf('const ECH = {'), b = src.indexOf('\n};\n', a);
  if (a < 0 || b < 0) throw new Error('screens/echo.js: не найден блок const ECH = { … };');
  return vm.runInNewContext('(' + src.slice(a + 'const ECH = '.length, b + 2) + ')', {});
}
function parseCsv(t) {
  const rows = []; let r = [], f = '', q = false;
  t = t.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { r.push(f); f = ''; }
    else if (c === '\n') { r.push(f.replace(/\r$/, '')); rows.push(r); r = []; f = ''; }
    else f += c;
  }
  if (f || r.length) { r.push(f.replace(/\r$/, '')); rows.push(r); }
  const [h, ...body] = rows.filter(x => x.length > 1);
  return body.map(x => Object.fromEntries(h.map((k, i) => [k, x[i] || ''])));
}

const LIB = JSON.parse(read(FILES.library));
const KITS = JSON.parse(read(FILES.kits));
const ECH = echData();
const RS = browserData(FILES.roster, 'EN_ROSTER');
const RX = browserData(FILES.recipes, 'EN_RECIPES');
const CSV = parseCsv(read(FILES.csv));

/* библиотека: id → запись с местом в наборе */
const BY = {};
for (const [school, S] of Object.entries(LIB.sets)) {
  for (const x of S.active) BY[x.id] = Object.assign({ slot: 'act' }, x);
  for (const x of S.ult) BY[x.id] = Object.assign({ slot: 'ult' }, x);
  for (const x of S.passive) BY[x.id] = Object.assign({ slot: 'pas', set: school }, x);
  for (const x of S.reaction) BY[x.id] = Object.assign({ slot: 'react', set: school }, x);
}
for (const x of LIB.farm.passive) BY[x.id] = Object.assign({ slot: 'pas' }, x);
for (const x of LIB.farm.active) BY[x.id] = Object.assign({ slot: 'act' }, x);
for (const x of LIB.farm.ult) BY[x.id] = Object.assign({ slot: 'ult' }, x);
/* сочетания (ADR-0050): способность из двух; set — школа первой части, two — сочетание двух стихий (героям Эхо открыто) */
for (const x of (LIB.combos || {}).active || []) BY[x.id] = Object.assign({ slot: 'act' }, x);
for (const x of (LIB.combos || {}).ult || []) BY[x.id] = Object.assign({ slot: 'ult' }, x);
const SCHOOLS = Object.keys(LIB.sets);
const NO_SCHOOL = 'Без школы';
const HERO_LAW = { comboFrom: 4, ult2From: 4 };   // ADR-0050: с какого максимума сочетание обязательно и с какого бывает вторая ульта — как в assign.py

/* что ядро уже понимает: поля и значения из библиотеки */
const KNOWN = { fields: new Set(['id', 'n', 'set', 'kind', 'tier', 'tgt', 'targets', 'ch', 'coef', 'twist', 'd', 'stat', 'ult', 'left', 'max', 'st', 'pow',
  'pas', 'trig', 'then', 'once', 'need', 'stacks']), pas: new Set(), trig: new Set(Object.keys(LIB.rules.triggers)), kind: new Set(), st: new Set(), tgt: new Set(TGT), once: new Set(), then: new Set() };
for (const x of Object.values(BY)) {
  for (const k of Object.keys(x)) if (k !== 'slot' && k !== 'src') KNOWN.fields.add(k);
  KNOWN.kind.add(x.kind);
  if (x.pas) KNOWN.pas.add(x.pas);
  if (x.once) KNOWN.once.add(x.once);
  if (typeof x.then === 'string') KNOWN.then.add(x.then);
  for (const s of [x.st, x.then && x.then.st, x.atStacks && x.atStacks.st, x.atMax, x.whileShield && x.whileShield.st]) if (typeof s === 'string') KNOWN.st.add(s);
}

/* ранги: число способностей и доли хода — из kits.json (ADR-0016) */
const EPIC = KITS.rules.rarityShares['эпическая'];
const RANKS = {};
for (const [code, key] of Object.entries(RANK_KITS)) {
  const ra = KITS.rules.rankAbilities[key]; if (!ra) throw new Error(`kits.json: нет ранга «${key}»`);
  const sh = KITS.rules.rarityShares[ra.sharesAs];
  RANKS[code] = { n: RANK_NAME[code], abilities: ra.abilities, ults: ra.ults, sharesAs: ra.sharesAs, ultPct: code === 'o' || code === 'e' ? 0 : sh.ult, actPct: sh.act };
}
RANKS.uber.ultsUber = UBER_ULTS;
const STEPS = ECH.ladder.flatMap(([g, n]) => Array.from({ length: n }, () => g));   // 14 ступеней по типам
const TOP = STEPS.length, MANY = TOP + 1;
const MANY_ITEM = (RX.items || []).find(x => x.id === 'many');
if (!MANY_ITEM) throw new Error('recipes.js: нет предмета many — Многоликого');
const MANY_SET = require(FILES.many);   // уникальный набор Многоликого — один на все недели (ADR-0039)
const AVERSION_BP = RS.rules && RS.rules.aversionBp;
if (!Number.isInteger(AVERSION_BP)) throw new Error('roster.js: нет rules.aversionBp — числа неприязни');
const BASIC_ALL_COEF = LIB.rules.tiersTpl.dmg.all.coef;   // удар по всем — как ступень «на всех» урона библиотеки
const DEF_CH = { ult: LIB.rules.ultCh, ctrl: LIB.rules.ctrlCh, other: LIB.rules.ch };
const shareOf = r => KITS.rules.rarityShares[r];
const chR = (ch, act) => ch ? Math.floor(ch * act / EPIC.act) : null;   // шанс реакции растёт с долей способностей (ADR-0017, п. 1)

/* ================================ НЕДЕЛИ ================================ */

const weekFiles = fs.readdirSync(FILES.weeks).filter(f => f.endsWith('.js')).sort();
const DATA = {};
for (const f of weekFiles) {
  const w = require(path.join(FILES.weeks, f));
  if (DATA[w.race]) fail(`${f}: неделя «${w.race}» уже описана`);
  DATA[w.race] = Object.assign({ file: f }, w);
}
const ORDER = RS.weeks.map(w => w.race);
for (const race of Object.keys(DATA)) if (!ORDER.includes(race)) fail(`${DATA[race].file}: нет недели «${race}» в roster.js`);

const UNIQ = {};      // уникальные способности: id → запись формата библиотеки
const OUT = { foes: {}, weeks: [], heroes: {}, abilities: [], manyBiome: {} };
const fidOf = (race, step) => race + '#' + step;
const rankIdx = r => RANK_ORDER.indexOf(r);
const needUsed = {};  // ключ NEED → где нужен

function checkUnique(x, owner, el, whose = 'стихия Убер-босса') {
  const where = `${owner} · ${x.id}`;
  if (BY[x.id] || UNIQ[x.id]) fail(`${where}: id уже занят`);
  if (!x.id.startsWith('Эхо.')) fail(`${where}: id уникальной способности начинается с «Эхо.»`);
  if (x.set !== el) fail(`${where}: школа «${x.set}» — не ${whose} «${el}»`);
  if (!SCHOOLS.includes(x.set)) fail(`${where}: нет школы «${x.set}»`);
  if (!x.n || !x.d) fail(`${where}: нет названия или описания`);
  const need = x.need || [];
  for (const k of need) { if (!NEED[k]) fail(`${where}: нет примитива «${k}» в списке «нужно ядру»`); else (needUsed[k] = needUsed[k] || []).push(x.id); }
  const allowF = new Set(need.flatMap(k => NEED[k] ? NEED[k].fields : []));
  const allowV = k => new Set(need.flatMap(n => NEED[n] && NEED[n].values && NEED[n].values[k] || []));
  for (const k of Object.keys(x)) if (!KNOWN.fields.has(k) && !allowF.has(k)) fail(`${where}: поле «${k}» ядро не знает — опишите его в NEED и в need способности`);
  const val = (k, v) => { if (v != null && !KNOWN[k].has(v) && !allowV(k).has(v)) fail(`${where}: ${k} «${v}» ядро не знает`); };
  val('kind', x.kind); val('pas', x.pas); val('trig', x.trig); val('tgt', x.tgt); val('once', x.once);
  if (typeof x.then === 'string') val('then', x.then);
  const sts = [].concat(x.st || [], x.then && x.then.st || [], x.atStacks && x.atStacks.st || []);
  for (const s of sts) if (!KNOWN.st.has(s) && !allowV('st').has(s)) fail(`${where}: эффект «${s}» ядро не знает`);
  if (x.pas === 'dmgVsDebuff' && x.st && !need.includes('dmgVsSt')) fail(`${where}: dmgVsDebuff со своим st — нужен примитив dmgVsSt`);
  const ints = (o, p) => { for (const [k, v] of Object.entries(o)) { if (typeof v === 'number' && !Number.isInteger(v)) fail(`${where}: ${p}${k} = ${v} — не целое`); else if (v && typeof v === 'object') ints(v, p + k + '.'); } };
  ints(x, '');
  const slot = x.ult ? 'ult' : x.kind === 'passive' ? 'pas' : x.kind === 'reaction' ? 'react' : 'act';
  if (slot === 'act' || slot === 'ult') {
    if (!x.tgt) fail(`${where}: нет правила цели`);
    if (x.ch == null) x.ch = slot === 'ult' ? DEF_CH.ult : x.kind === 'ctrl' ? DEF_CH.ctrl : DEF_CH.other;
    if (['dmg', 'heal', 'shield', 'dot', 'hot'].includes(x.kind) && !x.stat) x.stat = 'main';
  }
  if (slot === 'react' && !x.trig) fail(`${where}: у реакции нет события trig`);
  if (slot === 'pas' && !x.pas) fail(`${where}: у пассивки нет вида pas`);
  return slot;
}

/* уникальный набор Многоликого (many.js): школа — своя, «Без школы»: у Многоликого нет своего лица (ADR-0039) */
for (const x of MANY_SET.unique || []) {
  const slot = checkUnique(x, 'Многоликий', MANY_SET.school, 'школа Многоликого');
  UNIQ[x.id] = Object.assign({ owner: 'many', slot }, x);
}
if (!(MANY_SET.unique || []).length) fail('many.js: нет уникального набора Многоликого');
if (!MANY_SET.memo || !MANY_SET.hook) fail('many.js: нет абзаца «чем запоминается» или строки hook');
for (const race of ORDER) {
  const W = DATA[race]; if (!W) continue;
  const RW = RS.weeks.find(w => w.race === race), civ = ECH.civ[race];
  if (!civ || civ.foes.length !== TOP) { fail(`${race}: в ECH нет ${TOP} врагов недели`); continue; }
  const uberRow = civ.foes[TOP - 1];
  /* уникальные способности Убер-босса */
  const uniq = {};
  for (const x of W.unique || []) {
    const slot = checkUnique(x, race, uberRow[1]);
    uniq[x.id] = Object.assign({ owner: fidOf(race, TOP), slot }, x);
    UNIQ[x.id] = uniq[x.id];
  }
  /* враги */
  const bySteps = {};
  for (const F of W.foes) {
    if (bySteps[F.step]) fail(`${race}: ступень ${F.step} описана дважды`);
    bySteps[F.step] = F;
  }
  const foes = [];
  for (let step = 1; step <= MANY; step++) {
    const F = bySteps[step], fid = fidOf(race, step), g = step === MANY ? 'm' : STEPS[step - 1], rank = RANK_OF[g], R = RANKS[rank];
    if (!F) { fail(`${race}: нет ступени ${step}`); continue; }
    const row = step === MANY ? null : civ.foes[step - 1];
    const base = row ? { name: row[0], el: row[1], cls: row[2], look: row[3] } : { name: MANY_ITEM.n, el: uberRow[1], cls: uberRow[2], look: MANY_ITEM.lore };
    if (F.rename) { warn(`${race} ${step}: «${base.name}» → «${F.rename.n}» — ${F.rename.why}`); base.was = base.name; base.name = F.rename.n; }
    foes.push(Object.assign({ fid, race, step, g, rank, R, F }, base));
  }
  const byStep = Object.fromEntries(foes.map(f => [f.step, f]));
  for (const f of foes) {
    const where = `${race} ${f.step} «${f.name}»`, kit = [];
    if (f.g === 'm' && f.F.kit) fail(`${where}: набор Многоликого — один на все недели, в many.js; в неделе — только защитники`);
    const kitSrc = f.g === 'm' ? (MANY_SET.unique || []).map(x => x.id) : f.F.kit || [];
    for (const e of kitSrc) {
      const [id, as, tgt] = Array.isArray(e) ? e : [e];
      const x = { id, as: as || null, tgt: tgt || null };
      const a = BY[x.id] || UNIQ[x.id];
      if (!a) { fail(`${where}: способности ${x.id} нет ни в библиотеке, ни среди уникальных`); continue; }
      if (UNIQ[x.id] && f.g !== 'u' && f.g !== 'm') fail(`${where}: уникальная способность ${x.id} — только у Убер-босса и Многоликого`);
      if (UNIQ[x.id] && f.g === 'u' && UNIQ[x.id].owner !== f.fid) fail(`${where}: ${x.id} — способность чужого Убер-босса`);
      if (UNIQ[x.id] && f.g === 'm' && UNIQ[x.id].owner !== 'many') fail(`${where}: ${x.id} — не из набора Многоликого`);
      if (BY[x.id] && f.g !== 'm' && BY[x.id].set !== f.el) fail(`${where}: ${x.id} — не школа врага «${f.el}» (ADR-0016: по классу и стихии)`);
      if (BY[x.id] && BY[x.id].set === 'Фарм') fail(`${where}: фарм врагам не положен`);
      if (x.tgt && !TGT.includes(x.tgt)) fail(`${where}: правило цели «${x.tgt}» ядро не знает`);
      const slot = BY[x.id] ? BY[x.id].slot : UNIQ[x.id].slot;
      const it = { v: 0, slot, id: x.id };
      if (x.as) it.as = x.as;
      if (x.tgt) it.tgt = x.tgt;
      if (slot === 'react') { const c = chR(a.ch, f.R.actPct); if (c) it.chR = c; }
      it.n = a.n;
      kit.push(it);
    }
    /* ADR-0016: число способностей по рангу, ульты; первая — активная */
    const R = f.R, nU = kit.filter(x => x.slot === 'ult').length;
    if (kit.length !== R.abilities) fail(`${where}: ${G_NAME[f.g]} — способностей ${kit.length}, а по рангу «${R.n}» — ${R.abilities} (ADR-0016)`);
    const wantU = f.g === 'u' ? UBER_ULTS : f.g === 'm' ? [MANY_SET.ults] : [R.ults];
    if (!wantU.includes(nU)) fail(`${where}: ульт ${nU}, а положено ${wantU.join(' или ')} (ADR-0016${f.g === 'u' ? ', ADR-0025' : f.g === 'm' ? ', ADR-0039' : ''})`);
    if (kit.length && kit[0].slot !== 'act') fail(`${where}: первая способность — активная`);
    if (new Set(kit.map(x => x.id)).size !== kit.length) fail(`${where}: способность повторяется`);
    if ((f.g === 'u' || f.g === 'm') && !kit.every(x => UNIQ[x.id])) fail(`${where}: у ${f.g === 'u' ? 'Убер-босса' : 'Многоликого'} весь набор — уникальный (${f.g === 'u' ? 'ADR-0025, п. 7' : 'ADR-0039'})`);
    if (f.g === 'u' && (!W.memo || !W.hook)) fail(`${where}: нет абзаца «чем запоминается» или строки hook`);
    /* cast уникальной способности — только способность своего набора */
    for (const x of kit) { const u = UNIQ[x.id]; if (u && u.cast && (f.g === 'u' || f.g === 'm') && !kit.some(y => y.id === u.cast)) fail(`${where}: ${x.id} применяет ${u.cast} — его нет в наборе`); }
    /* особенность: обычная атака по всем — только у Убер-босса */
    let basic = null;
    if (f.F.basic) {
      if (f.g !== 'u') fail(`${where}: обычная атака по всем — особенность Убер-босса`);
      basic = { tgt: 'all', coef: f.F.basic.coef || BASIC_ALL_COEF };
      (needUsed.basicAll = needUsed.basicAll || []).push(f.fid);
    }
    /* защитники: четверо своей недели, не Убер и не Многоликий, ранг не выше главного, состав — по лестнице (DEF_MIX).
       У Многоликого — ни одного: он бьётся один (ADR-0039, ответ автора 01.10.2026) */
    const def = f.F.def || [];
    {
      if (def.length !== defendersOf(f.g)) fail(`${where}: защитников ${def.length}, нужно ${defendersOf(f.g)}`);
      if (new Set(def).size !== def.length) fail(`${where}: защитник повторяется`);
      const mix = {}, want = (DEF_MIX.find(([a, b]) => f.step >= a && f.step <= b) || [])[2];
      for (const d of def) {
        const x = byStep[d];
        if (!x || d >= TOP) { fail(`${where}: защитник ${d} — не враг лестницы 1–${TOP - 1}`); continue; }
        if (d === f.step) fail(`${where}: защищает сам себя`);
        if (rankIdx(x.rank) > rankIdx(f.rank)) fail(`${where}: защитник «${x.name}» (${RANK_NAME[x.rank]}) сильнее главного (${RANK_NAME[f.rank]})`);
        mix[x.rank] = (mix[x.rank] || 0) + 1;
      }
      if (!want || JSON.stringify(Object.entries(mix).sort()) !== JSON.stringify(Object.entries(want).sort())) fail(`${where}: защитники ${JSON.stringify(mix)}, а по лестнице — ${JSON.stringify(want)}`);
    }
    if (!f.F.idea) fail(`${where}: нет замысла состава`);
    f.kit = kit; f.basic = basic;
    f.out = Object.assign({ race, step: f.step, g: f.g, rank: f.rank, name: f.name, cls: f.cls, el: f.el, look: f.look },
      f.was ? { was: f.was } : {}, { ultPct: R.ultPct, actPct: R.actPct, kit: kit.map(({ n, ...x }) => x) },
      basic ? { basic } : {}, { def: def.map(d => fidOf(race, d)), idea: f.F.idea });
    OUT.foes[f.fid] = f.out;
  }
  /* отряд недели: пятеро героев Эхо, наборы из библиотеки по ADR-0016 */
  const csv = CSV.filter(h => /^Эхо/.test(h['источник']) && h['неприязнь'] === race);
  const ids = RW.squad.slice();
  if (csv.length !== 5 || !csv.every(h => ids.includes(h.id))) fail(`${race}: отряд в roster.js (${ids.join(', ')}) не совпадает с героями Эхо в CSV (${csv.map(h => h.id).join(', ')})`);
  if (!W.squad || !W.squad.answer) fail(`${race}: нет строки «чем отряд отвечает Уберу»`);
  const heroes = [];
  for (const id of ids) {
    const h = csv.find(x => x.id === id), spec = W.squad && W.squad.kits[id];
    if (!h) continue;
    const where = `${race} · ${id} ${h['имя']}`;
    if (!spec) { fail(`${where}: нет набора`); continue; }
    const maxV = +h['максимум доблести'], r = h['редкость'], school = h['школа'], sh = shareOf(r);
    if (!sh) { fail(`${where}: редкость «${r}» не из шкалы`); continue; }
    /* набор героя (ADR-0050): первые две записи — пара доблести 0 — активка и черта; дальше — по одной на доблесть 1…maxV, последняя — ульта */
    if (spec.length !== maxV + 2) fail(`${where}: способностей ${spec.length}, а нужно максимум доблести + 2 — ${maxV + 2} (ADR-0050)`);
    const kit = spec.map((aid, i) => {
      const a = BY[aid], v = i < 2 ? 0 : i - 1, trait = i === 1;
      if (!a) { fail(`${where}: нет способности ${aid} в библиотеке`); return null; }
      /* школа (Н5): своя, приём «Без школы», сочетание — школы первой части; черта — любой школы (связку проверяет assign.py) */
      if (a.set !== school && a.set !== NO_SCHOOL && !trait) fail(`${where}: ${aid} — не школа героя «${school}» и не приём «Без школы»`);
      const it = { v, slot: a.slot, id: aid };
      if (a.slot === 'react') { const c = chR(a.ch, sh.act); if (c) it.chR = c; }
      it.n = a.n;
      return it;
    }).filter(Boolean);
    if (kit.length > 1 && (kit[0].slot !== 'act' || !['pas', 'react'].includes(kit[1].slot))) fail(`${where}: на доблести 0 — пара «активка + черта» (ADR-0050, Н1)`);
    if (kit.length && kit[kit.length - 1].slot !== 'ult') fail(`${where}: последняя доблесть — ульта (ADR-0016)`);
    kit.forEach((x, i) => { if (x.slot === 'ult' && i !== kit.length - 1 && !(i === kit.length - 2 && maxV >= HERO_LAW.ult2From && BY[x.id].combo)) fail(`${where}: ульта ${x.id} не на последней доблести — вторая ульта бывает только сочетанием на предпоследней доблести героя с максимумом от ${HERO_LAW.ult2From} (ADR-0050, Н2)`); });
    if (maxV >= HERO_LAW.comboFrom && !kit.some(x => BY[x.id].combo)) fail(`${where}: максимум доблести ${maxV} — в наборе нет сочетания (ADR-0050, Н6)`);
    if (new Set(kit.map(x => x.id)).size !== kit.length) fail(`${where}: способность повторяется`);
    const hero = { id, name: h['имя'], cls: h['класс'], el: school, school, rarity: r, maxV, cycle: h['цикл'], week: race,
      ultPct: sh.ult, actPct: sh.act, avers: { race, bp: AVERSION_BP }, kit };
    heroes.push(hero);
    OUT.heroes[id] = Object.assign({}, hero, { kit: kit.map(({ n, ...x }) => x) });
  }
  /* биом Многоликого: этажи — ступени 1–14, этаж — главный враг ступени и его защитники, как в бою Эхо */
  OUT.manyBiome[race] = foes.filter(f => f.step <= TOP).map(f => ({ floor: f.step, lead: f.fid, foes: [f.fid].concat(f.out ? f.out.def : []) }));
  OUT.weeks.push({ race, gen: RW.gen, civ: RW.civ, raid: RW.raid, steps: foes.map(f => f.fid), uber: fidOf(race, TOP), many: fidOf(race, MANY),
    squad: ids, answer: W.squad ? W.squad.answer : '', memo: W.memo || '' });
  for (const x of Object.values(uniq)) OUT.abilities.push(x);
  DATA[race].built = { foes, heroes, uniq };
}

/* уникальный набор Многоликого — один на все недели: в abilities он один раз, после Убер-боссов */
for (const x of MANY_SET.unique || []) OUT.abilities.push(UNIQ[x.id]);

/* ни одного одинакового набора героя — ни среди героев Эхо, ни с 110 героями черновиков */
const sig = k => k.map(x => x.id).join('|');
const seen = {};
for (const [id, h] of Object.entries(KITS.heroes)) seen[sig(h.kit)] = id;
for (const [id, h] of Object.entries(OUT.heroes)) { const s = sig(h.kit); if (seen[s]) fail(`${id}: набор совпадает с ${seen[s]}`); seen[s] = id; }
for (const k of Object.keys(needUsed)) if (!NEED[k]) fail(`нет примитива ${k}`);

if (err.length) {
  console.error(`Ошибок: ${err.length}. Файлы не записаны.`);
  for (const m of err) console.error('  ✗ ' + m);
  process.exit(1);
}

/* ================================ ВЫВОД ================================ */

const FORMAT = `/* Собрано tools/content-gen/echo/build.js из tools/content-gen/echo/weeks/*.js и many.js — враги Эхо, Убер-боссы, Многоликий
   и отряды недели. Руками не править. ADR-0025, ADR-0024, ADR-0016, ADR-0015, ADR-0010, ADR-0039. Черновик · все числа — демонстрация, только целые.

   window.EN_ECHO_FOES = {
     rules: {
       ranks: { o | e | b | uber | forgotten: { n, abilities, ults, sharesAs, ultPct, actPct } }   // ADR-0016: состав врага по рангу, доли хода — как у редкости
         // uber.ultsUber — у Убер-босса одна или две ульты в тех же пяти способностях (ADR-0025); forgotten — Многоликий, один из Забытых (ADR-0039)
       defenders: 4,                  // главный враг ступени и четверо защитников своей недели (ADR-0025, п. 1); Многоликий — один, без свиты (ADR-0039)
       aversionBp: 2000,              // расовая неприязнь героя Эхо: +20 % урона по расе своей недели (ADR-0024), из roster.js
       basicAllCoef: 60,              // обычная атака по всем — coef ступени «на всех» урона библиотеки
       count: 'способности врага — все записи набора: активные, ульты, пассивки, реакции; иммунитет и обычная атака по всем — особенности, не способности'
     },
     weeks: [ { race, gen, civ, raid, steps: [fid × 15], uber: fid, many: fid, squad: [id героя × 5], answer, memo } ],   // порядок недель — roster.js
     manyBiome: { 'Эльфы': [ { floor, lead: fid, foes: [fid главного, ...fid защитников] } × 14 ] },
         // биом Многоликого по неделе (ADR-0025, «Многоликий и арт»): этажи 1–14 — ступени лестницы, этаж — главный враг и его защитники, как в бою Эхо
     foes: {
       'Эльфы#7': {                   // fid — «раса#ступень», как fidOf в screens/echo.js; ступень 15 — Многоликий (там — 'many' с расой недели)
         race, step, g,               // g — место в лестнице: o рядовой, e элита, b босс, u Убер-босс, m Многоликий
         rank,                        // ранг ядра: o, e, b, uber — иммунитет RULES.resist и доли хода; у Многоликого — forgotten: он один из Забытых
         name, cls, el, look,         // имя, класс RULES.cls, стихия, облик — из ECH screens/echo.js
         ultPct, actPct,              // доли хода по рангу, б. п. (у рядового и элиты ульты нет — доля идёт в обычную атаку)
         kit: [ { v: 0, slot: 'act' | 'ult' | 'pas' | 'react', id, as?, tgt?, chR? } ],   // как EN_KITS.foes: as — имя способности у врага,
                                      // tgt — своё правило цели (targets: 1), chR — шанс реакции по рангу; у Многоликого — его набор из many.js
         basic?: { tgt: 'all', coef }, // только у части Убер-боссов: обычная атака по всем (нужно ядру — basicAll)
         def: [fid × 4],              // защитники ступени: ранг не выше главного; уровень и здоровье — калькулятор Эхо; у Многоликого — [] (ADR-0039)
         idea                         // замысел состава
       } },
     heroes: { 'c6-51': { id, name, cls, el, school, rarity, maxV, cycle, week, ultPct, actPct,
       avers: { race, bp },           // неприязнь — особенность, не способность
       kit: [ { v, slot, id, chR? } ] } },   // как EN_KITS.heroes, ключ — id героя состава (roster.js); ADR-0050: на доблести 0 — пара
                                      // «активка + черта», дальше — по одной записи на доблесть 1…maxV, последняя — ульта
     abilities: [ { id, n, set, t, k, tier, trig, d, ch, data, owner, need } ],   // уникальные способности Убер-боссов и Многоликого (owner 'many') — формат EN_ABILITIES:
                                      // ядро кладёт их в lib2() так же: Object.assign({ id, n, d, school: set, t, kind: k, tier, trig }, data)
     need: { ключ: { n, d, used: [id способности или fid врага] } }   // примитивы, которых в ядре ещё нет: что добавить и кто ими пользуется
   };
   Характеристики и здоровье врагов Эхо здесь не задаются — это кривая силы ступеней калькулятора Эхо. */`;

const abilityOut = x => {
  const { id, n, set, kind, tier, trig, d, owner, slot, need, twist, ...data } = x;
  return { id, n, set, t: slot, k: kind, tier: tier || null, trig: trig || null, d, ch: data.ch != null ? data.ch : null, data, owner, need: need || [] };
};
const ui = {
  rules: { ranks: RANKS, defenders: DEFENDERS, aversionBp: AVERSION_BP, basicAllCoef: BASIC_ALL_COEF,
    count: 'способности врага — все записи набора: активные, ульты, пассивки, реакции; иммунитет и обычная атака по всем — особенности, не способности' },
  weeks: OUT.weeks, manyBiome: OUT.manyBiome, foes: OUT.foes, heroes: OUT.heroes, abilities: OUT.abilities.map(abilityOut),
  need: Object.fromEntries(Object.entries(NEED).filter(([k]) => needUsed[k]).map(([k, v]) => [k, { n: v.n, d: v.d, used: needUsed[k] }])),
};
const uiText = FORMAT + '\nwindow.EN_ECHO_FOES = ' + JSON.stringify(ui) + ';\n';

/* ---------------- черновик для автора ---------------- */
const pct = bp => (bp % 100 ? (bp / 100).toFixed(2).replace('.', ',') : String(bp / 100)) + ' %';
const esc = s => String(s).replace(/\|/g, '\\|');
const abName = x => { const a = BY[x.id] || UNIQ[x.id]; return x.as ? `«${x.as}» (${a.n})` : `«${a.n}»`; };
const slotName = { act: '', ult: 'ульта ', pas: 'пассивка ', react: 'реакция ' };
const kitLine = kit => kit.map(x => slotName[x.slot] + abName(x)).join(', ');
function weekMd(race) {
  const W = DATA[race], B = W.built, RW = RS.weeks.find(w => w.race === race), civ = ECH.civ[race];
  const L = [];
  L.push(`### Неделя ${RW.gen} — ${RW.civ}`, '');
  L.push(`Нашествие «${RW.raid}». ${civ.raid}`, '');
  L.push('| № | Враг | Ранг · класс · стихия | Набор | Защитники — замысел |', '|---|---|---|---|---|');
  for (const f of B.foes) {
    const def = f.out.def.map(fid => { const x = B.foes.find(y => y.fid === fid); return `${x.step} ${x.name}`; }).join(', ');
    const rank = f.g === 'm' ? 'Многоликий, Забытый' : f.g === 'u' ? 'Убер-босс' : G_NAME[f.g];
    const trait = f.basic ? `; особенность — обычная атака по всем, ${f.basic.coef} %` : '';
    const kitTxt = f.g === 'm' ? 'свой набор — таблица «Многоликий» выше' : kitLine(f.kit);
    L.push(`| ${f.step} | ${esc(f.name)}${f.was ? ` (было «${esc(f.was)}»)` : ''} | ${rank} · ${f.cls[0].toLowerCase() + f.cls.slice(1)} · ${f.el} | ${esc(kitTxt)}${trait} | ${esc(def)} — ${esc(f.F.idea)} |`);
  }
  const U = B.foes.find(f => f.g === 'u');
  L.push('', `**Убер-босс «${U.name}».** ${W.memo}`, '');
  L.push('| Способность | Место | Что делает | Примитивы |', '|---|---|---|---|');
  for (const x of U.kit) {
    const a = UNIQ[x.id], nd = (a.need || []).map(k => `**нужно ядру:** ${NEED[k].n}`);
    L.push(`| «${a.n}» | ${{ act: 'активная', ult: 'ульта', pas: 'пассивка', react: 'реакция' }[x.slot]}${x.chR ? `, шанс ${pct(x.chR)}` : ''} | ${esc(a.d)} | ${nd.length ? nd.join('; ') : 'есть в ядре'} |`);
  }
  if (U.basic) L.push(`| Обычная атака по всем | особенность | Обычная атака бьёт весь отряд, каждого — ${U.basic.coef} % главного стата. | **нужно ядру:** ${NEED.basicAll.n} |`);
  L.push('', `**Отряд недели** — неприязнь к расе «${race}», +${AVERSION_BP / 100} % урона. ${W.squad.answer}`, '');
  L.push('| Герой | Класс · школа | Редкость · максимум доблести | Набор по доблести |', '|---|---|---|---|');
  for (const h of B.heroes) L.push(`| ${h.name} | ${h.cls} · ${h.school} | ${h.rarity} · ${h.maxV} | ${h.kit.map(x => `${x.v} — ${slotName[x.slot]}«${x.n}»${x.chR ? ` (${pct(x.chR)})` : ''}`).join('; ')} |`);
  L.push('');
  return L.join('\n');
}
const T = {};
T.ranks = ['| Ранг | Кто в Эхо | Способностей | Из них ульт | Доли хода как у редкости | Ульта · способности · обычная атака |', '|---|---|---|---|---|---|',
  ...Object.entries(RANKS).map(([k, R]) => `| ${R.n} | ${{ o: 'ступени 1–6', e: 'ступени 7–10', b: 'ступени 11–13', uber: 'Убер-босс — 14', forgotten: 'Многоликий — 15' }[k]} | ${R.abilities} | ${k === 'uber' ? `${R.ults}; у Убер-босса — ${UBER_ULTS.join(' или ')} (ADR-0025)` : k === 'forgotten' ? `${R.ults}; у Многоликого — ${MANY_SET.ults} (ADR-0039)` : R.ults} | ${R.sharesAs} | ${pct(R.ultPct)} · ${pct(R.actPct)} · ${pct(10000 - R.ultPct - R.actPct)} |`)].join('\n');
const MIX_NAME = { o: ['рядовой', 'рядовых', 'рядовых'], e: ['элита', 'элиты', 'элит'], b: ['босс', 'босса', 'боссов'] };
const mixText = m => Object.entries(m).map(([r, n]) => `${n} ${MIX_NAME[r][n === 1 ? 0 : n < 5 ? 1 : 2]}`).join(' и ') || 'без свиты: бьётся один';
T.defmix = DEF_MIX.map(([a, b, m]) => `   - ${a === b ? `ступень ${a}` : `ступени ${a}–${b}`} (${[...new Set((STEPS.concat(['m'])).slice(a - 1, b))].map(g => G_NAME[g]).join(', ')}) — ${mixText(m)};`).join('\n');
/* Многоликий — свой набор (many.js): таблица способностей и чем запоминается */
T.many = [`**Многоликий.** ${MANY_SET.memo}`, '', '| Способность | Место | Что делает | Примитивы |', '|---|---|---|---|',
  ...(MANY_SET.unique || []).map(x => { const a = UNIQ[x.id], nd = (a.need || []).map(k => `**нужно ядру:** ${NEED[k].n}`), rk = RANKS.forgotten, c = a.slot === 'react' ? chR(a.ch, rk.actPct) : null;
    return `| «${a.n}» | ${{ act: 'активная', ult: 'ульта', pas: 'пассивка', react: 'реакция' }[a.slot]}${c ? `, шанс ${pct(c)}` : ''} | ${esc(a.d)} | ${nd.length ? nd.join('; ') : 'есть в ядре'} |`; })].join('\n');
T.weeks = ORDER.filter(r => DATA[r] && DATA[r].built).map(weekMd).join('\n');
T.ubers = ['| Неделя | Убер-босс | Чем запоминается | Особенность | Новое для ядра |', '|---|---|---|---|---|',
  ...ORDER.filter(r => DATA[r] && DATA[r].built).map(r => {
    const W = DATA[r], U = W.built.foes.find(f => f.g === 'u');
    const nd = [...new Set(U.kit.flatMap(x => UNIQ[x.id].need || []).concat(U.basic ? ['basicAll'] : []))].map(k => NEED[k].n);
    return `| ${r} | ${U.name} | ${esc(W.hook || '')} | ${U.basic ? 'обычная атака по всем' : '—'} | ${nd.join(', ') || '—'} |`;
  })].join('\n');
T.need = ['| Примитив | Что делает | Кто пользуется |', '|---|---|---|',
  ...Object.entries(NEED).filter(([k]) => needUsed[k]).map(([k, v]) => `| ${v.n} (\`${k}\`) | ${esc(v.d)} | ${needUsed[k].map(id => UNIQ[id] ? `«${UNIQ[id].n}»` : OUT.foes[id] ? OUT.foes[id].name : id).join(', ')} |`)].join('\n');
const built = ORDER.filter(r => DATA[r] && DATA[r].built);
const N = { weeks: built.length, foes: Object.keys(OUT.foes).length, heroes: Object.keys(OUT.heroes).length, unique: OUT.abilities.length, need: Object.keys(needUsed).length };
let md = read(FILES.doc);
md = md.replace(/@@(\w+)@@/g, (_, k) => { if (T[k] == null) throw new Error('doc.md: нет таблицы @@' + k + '@@'); return T[k]; });
md = md.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (N[k] == null) throw new Error('doc.md: нет числа {{' + k + '}}'); return String(N[k]); });

fs.writeFileSync(FILES.outUi, uiText);
fs.writeFileSync(FILES.outMd, md);
console.log(`Эхо собрано: недель ${N.weeks} из ${ORDER.length}, врагов ${N.foes}, героев ${N.heroes}, уникальных способностей ${N.unique}, нужно ядру — ${N.need}.`);
for (const m of warn) console.log('  · ' + m);
