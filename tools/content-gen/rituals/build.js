/* Ритуалы и рабочие — калькулятор и сборщик: GDD §19, §1.2, §2.1, §9.3, §14.1, §15, §16, §17, §23, §27, §36;
   ADR-0011, ADR-0014, ADR-0018, ADR-0023, ADR-0026, ADR-0028. Черновик · предложение · ждёт автора. Все числа — демонстрация.

   Что считает:
   1. Сетку ритуалов: редкость — это длительность (§19.4): рабочие 0,5–6 ч, герои вдвое дольше, 1–12 ч. Бригада — цена недоступности,
      растёт с длительностью; награда от неё не зависит (§19.5: допуск — только количество).
   2. Награду: у героев — золото, дух и души за час × цикл аккаунта (§19.3), у рабочих — базовые общего пула и ключи ремёсел биома,
      у уникального ритуала — уникальный ресурс хозяина биома (§19.4). Души — только у героев.
   3. Прогон: дни циклов II–VI у обычного (заходит дважды в день, 3 ч забегов), увлечённого (пять заходов, 8 ч), занятого (дважды
      в день, полчаса забегов) и плательщика (как обычный, плюс пять роллов за Энериум). Пул — тем же алгоритмом, что у прототипа
      (pool.js), на сидах. Рабочие приходят шардами из сундуков События и крафтовых боссов (lootboxes.js).
   4. Сравнение с доходом забегов (capacity.json калькулятора контрактов): доля ритуалов в золоте, духе, душах, базовых и ключах;
      души против атак Эхо (echo-rules.js); уникальные против боссов биомов; правило ×1,7 (§1.2).
   5. Перековку рабочих (слова автора 29.09.2026): RULES.forge — сколько одной редкости, цена золотом по циклу; прогон тех же дней
      с перековкой избытка (SIM.forge) против прогона без неё — артель, лучшая пятёрка, средняя бригада, базовые, золото; вариант «2 → 1».
   6. Проверки: целые числа и миллисекунды, сетка и потолки, законы §19.5, цели долей, ×1,7, генератор совпадает с сундуками;
      перековка — избыток не копится, золото — сток в своих пределах, бригадам не хуже.

   Пишет:
   - design/ui/rituals.js — данные прототипа (window.EN_RITUALS) и алгоритм tools/content-gen/rituals/pool.js как есть, руками не править;
   - docs/content/ритуалы.md — только таблицы: каждая между метками «<!-- @таблица имя -->» и «<!-- /таблица имя -->»; текст — ручной.
   Читает: tools/content-gen/contracts/capacity.json, design/ui/recipes.js (биомы, общий пул, ключи и уникальные), lootboxes.js (шарды
   рабочих), wanderer.js (артефакты ритуалов), echo-rules.js (цена атаки Эхо), roster.js (цена пробуждения героя — для сравнения).
   Любая ошибка — файлы не пишутся. Пересборка даёт те же байты.
   Запуск: node tools/content-gen/rituals/build.js           — собрать и записать;
           node tools/content-gen/rituals/build.js --check   — только проверить, что файлы свежие;
           node tools/content-gen/rituals/build.js --print   — таблицы в консоль, без записи.
   Из других скриптов: require('./build.js').build() — { data, tables, sim, err, warn } без записи. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('./pool.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  pool: path.join(__dirname, 'pool.js'),
  cap: path.join(ROOT, 'tools', 'content-gen', 'contracts', 'capacity.json'),
  recipes: path.join(ROOT, 'design', 'ui', 'recipes.js'),
  loot: path.join(ROOT, 'design', 'ui', 'lootboxes.js'),
  wanderer: path.join(ROOT, 'design', 'ui', 'wanderer.js'),
  echo: path.join(ROOT, 'design', 'ui', 'echo-rules.js'),
  roster: path.join(ROOT, 'design', 'ui', 'roster.js'),
  out: path.join(ROOT, 'design', 'ui', 'rituals.js'),
  doc: path.join(ROOT, 'docs', 'content', 'ритуалы.md'),
};

/* ================================ ДАННЫЕ ================================ */

const RARITY = ['обычная', 'редкая', 'уникальная', 'эпическая', 'древняя', 'первородная', 'вневременная'];
const RARITY_M = ['', 'обычный', 'редкий', 'уникальный', 'эпический', 'древний', 'первородный', 'вневременной'];   // рабочий — по редкости 1–7
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const H = 3600000;   // мс в часе

/* Правила §19 и таблиц автора. Числа — демонстрация. */
const RULES = {
  bp: 10000,
  hourMs: H,
  open: { level: 10, cycle: 2 },            // ритуалы открываются с циклом II — вместе с Эхо и Событием, которые они кормят (§16, §19, §27)
  slots: { base: 1, art: 'a14', step: 2, cap: 7 },   // §19.2: 1 → ~8 артефактами; «Караванный шатёр» +2 за уровень, потолок 7 (лист «Правила» автора, п. 4)
  rolls: { free: 3, art: 'a15', step: 1, paid: [10, 20, 30, 40, 50] },   // §19.2: 3 бесплатных (артефактами до 6) + 5 за Энериум; цена растёт к пятому
  cards: { base: 3, art: 'a16', step: 1 },  // карточек во вкладке; «Вторая тропа» +1 за уровень
  /* редкость ритуала — прежде всего длительность (§19.4), а не ценность: награда за час одна на всех редкостях. Веса растут к долгим —
     режим для тех, кто заходит дважды в день: ритуал на ночь находится бесплатными роллами, платные почти ничего не прибавляют (×1,7) */
  rarW: [1200, 1200, 1300, 1400, 1500, 1600, 1800],
  bands: [0, 0, 1, 1, 2, 2, 2],             // имя карточки — из списка своей длины: короткие, средние, долгие
  speed: { perRBp: 200, capBp: 5000 },      // §19.1: −2 % × редкость рабочего за участника, суммарный кап −50 %
  /* §19.4: уникальный — шанс 1 % на карточку рабочих, таймер — верх сетки, бригада полная, ресурс босса гарантирован.
     Только в дневном пуле и бесплатных роллах и не больше одного во вкладке: платный ролл шанс не поднимает (§19.5, §1.2) */
  unique: { chanceBp: 100, max: 1, r: 7, crew: 5, qty: 1, freeOnly: true },
  awaken: { soulsPerPct: 25 },              // цена пробуждения рабочего: 25 душ за процент его ускорения — 50 × редкость
  starter: [5, 0, 0, 0, 0, 0, 0],           // первая артель на открытии: пять обычных рабочих
  shardsPer: null,                          // шардов на рабочего — из lootboxes.js (assume.workerShards)
  /* перековка рабочих — слова автора 29.09.2026: «пусть люди их перекрафчивают в более крутую версию, если их становится избыток; цены
     в золоте». need свободных одной редкости → один рабочий редкостью выше; gold — золото за вход редкости 1…6, × cyc[цикл аккаунта].
     Рабочие одной редкости одинаковы (§19.1: специализаций нет), поэтому итог без случайности. Занятые в ритуале не перековываются.
     need — 10, слова автора 29.09.2026: «игрок должен сам выбирать, какие 10 талисманов, рабочих и снаряжение он перекует» (ADR-0031,
     дополнение). Прежние 3 → 1 были решением исполнителя — таблица «forgeAlt» черновика показывает их для сравнения */
  forge: { need: 10, gold: [1000, 2000, 4000, 8000, 16000, 32000], cyc: [0, 0, 1, 2, 3, 4, 5] },
};

/* Вкладки §19.3. ms — длительность по редкостям; unitMs — единица награды; crew — бригада lo…hi по редкостям. */
const TABS = {
  work: {
    n: 'Рабочие',
    unitMs: H / 2,
    ms: [1, 2, 3, 4, 6, 8, 12].map(u => u * H / 2),          // 0,5 / 1 / 1,5 / 2 / 3 / 4 / 6 ч — «рабочие вдвое короче»
    crew: { lo: [1, 1, 2, 2, 3, 3, 4], hi: [1, 2, 2, 3, 3, 4, 5] },
    basics: 2,                               // базовых общего пула за полчаса ритуала
    keys: { from: 4, per: 4 },               // ключ ремесла биома — с эпической, один за каждые 2 ч
    names: [
      ['Короткая выборка', 'Сбор у входа', 'Просев песка', 'Мелкий разбор'],
      ['Разбор завалов', 'Выборка из трещин', 'Тихая выработка', 'Сбор у стены'],
      ['Долгая смена', 'Ночная артель', 'Глубокая выработка', 'Спуск за светом', 'Счёт камней', 'Выгребка до дна'],
    ],
    uniqueNames: ['Следы погребённого', 'По следу хозяина', 'Там, где пал хозяин', 'Остывший трон'],
  },
  hero: {
    n: 'Герои',
    unitMs: H,
    ms: [1, 2, 3, 4, 6, 8, 12].map(h => h * H),               // 1 / 2 / 3 / 4 / 6 / 8 / 12 ч
    crew: { lo: [1, 1, 2, 2, 3, 3, 4], hi: [1, 2, 2, 3, 3, 4, 5] },
    /* награда — за curH часов × цикл аккаунта на старте, вниз до целого; золото — половина духа, как в биомах (ADR-0014).
       Души — 18 за 10 ч, а не 2 в час (ADR-0031): с реальным отрядом забеги обычного дают меньше душ, и при 2 в час ритуалы давали
       13,1 % душ его забегов в цикле II и 13,8 % в цикле III — выше цели 13 % (TARGET.shareO). Шаг «за 10 ч» — чтобы ручка была
       мельче целой души в час; золото и дух — прежние 75 и 150 в час */
    curH: 10,
    cur: [['gold', 750], ['spirit', 1500], ['souls', 18]],
    names: [
      ['Малый дозор', 'Слово у порога', 'Счёт песка', 'Смена караула'],
      ['Дозор у пролома', 'Проводы вниз', 'Тихий караул', 'Свеча у часов'],
      ['Долгая дорога', 'Бдение до рассвета', 'Вахта над проломом', 'Ночь у часов', 'Долгие проводы'],
    ],
    uniqueNames: [],
  },
};

/* Тексты игрока: без спойлеров §38. Лор ритуалов в своде не описан — это предложение автору (docs/content/ритуалы.md). */
const TEXT = {
  work: 'Рабочие спускаются в уже открытый биом и выносят то, что там лежит.',
  hero: 'Герои несут службу наверху, в Эндалоре, и возвращаются с золотом, духом и душами.',
  unique: 'Рабочие идут по следу хозяина биома: его уникальный ресурс — наверняка.',
  law: 'Провала нет: награда решена при старте и придёт, когда досыплется песок.',
  busy: 'Участники заняты до конца: забеги, Эхо и клан их не получат. Арена и Лига — получат.',
  cancel: 'Отмена освобождает участников сразу, но награды не будет, а ритуал из пула пропадёт.',
};

/* Прогон: допущения калькулятора. Заходы — часы суток; забеги обычного — после вечернего захода. Ростер героев — сколько героев
   может стоять в ритуалах (у увлечённого — без трёх отрядов забегов). Событие: личные и клановые планки недели. */
const SIM = {
  seeds: 12,
  /* дней в цикле — не здесь: одна длина на все калькуляторы, capacity.json (cycleDays: II — прогон темпа biomes/pace.json, III — sets.py);
     IV–VI — как последний записанный, III, по образцу echo.py (TEMPLATE). Функция daysOf */
  cycles: [2, 3, 4, 5, 6],
  prof: {
    o: { n: 'обычный', cap: 'o', visits: [8, 23], paid: 0, heroes: [12, 18, 24, 30, 36], event: 'free', craft: 'free' },
    e: { n: 'увлечённый', cap: 'e', visits: [8, 12, 16, 20, 23], paid: 0, heroes: [9, 16, 23, 28, 33], event: 'fan', craft: 'fan' },
    z: { n: 'занятый', cap: 'o', capBp: 1667, visits: [8, 22], paid: 0, heroes: [8, 10, 12, 14, 16], event: 'free', craft: 'none' },
    p: { n: 'плательщик', cap: 'o', visits: [8, 23], paid: 5, heroes: [17, 23, 29, 35, 41], event: 'payer', craft: 'free' },
  },
  heroShare: { num: 2, den: 3 },   // доля слотов под героев: души важнее — остальное рабочим
  rollIfBelowBp: 6000,             // роллить, если лучшая подходящая карточка короче 60 % того, что влезает в зазор до следующего захода
  rollsPerPick: 2,
  echoBp: 5000,                    // в Эхо уходит половина душ дня — как в калькуляторе Эхо и сет-бонусов (эхо-экономика, Э5)
  /* перековка в прогоне: после каждой недели притока игрок держит под бригады keep лучших рабочих, остальных — по RULES.forge.need
     одной редкости, от младших к старшим — перековывает, пока хватает. keep — две бригады по пять: столько рабочих у обычного занято
     одновременно в пике. alt — вариант «2 → 1» для сравнения, вопрос автору. Профили — обычный и увлечённый, плательщик — для ×1,7 */
  forge: { keep: 10, alt: 3, prof: ['o', 'e', 'p'] },   // alt — сравнение: прежние 3 → 1
};
let ECHO_BP = SIM.echoBp, PAYER_BP = 0;   // PAYER_BP — лишний отряд плательщика в забегах: lootboxes.js, assume.payerPts

/* Цели и законы. Доли — от дохода забегов обычного того же дня (capacity.json). */
const TARGET = {
  shareO: { gold: [500, 1500], spirit: [500, 1500], souls: [500, 1300], basics: [500, 3000] },   // б. п.: ритуалы — дополнение, не замена
  shareEmax: 1000,          // у увлечённого ритуалы — не больше 10 % любой валюты забегов
  zOfO: 2500,               // занятый получает с ритуалов не больше 25 % душ забегов обычного
  payer: 12000,             // плательщик в ритуалах — не больше ×1,2 обычного: роллы за Энериум покупают выбор, не время
  x17: 17000,
  uniqOfBoss: 5000,         // уникальных с ритуалов — не больше половины уникальных с боссов у обычного (с цикла III)
  awakenOfHero: 5000,       // рабочий дороже половины героя не бывает: «заметно дешевле героев» (§19.1)
  /* перековка рабочих: артель к концу любого цикла не больше artelMax; золото на неё — не больше goldMaxBp дохода забегов дня;
     базовых с перековкой — не меньше basicsMinBp того, что без неё: перековка не отнимает рабочих у бригад.
     artelMax — 45: при 10 → 1 (слово автора, RULES.forge.need) избыток уходит медленнее — к циклу VI у обычного 25 рабочих, у
     увлечённого 42 (при прежних 3 → 1 было 14). Порог ловит, если артель начнёт расти без меры */
  forge: { artelMax: 45, goldMaxBp: 300, basicsMinBp: 9900 },
};

/* ================================ ЗАГРУЗКА ================================ */

const loadJs = (file, name) => { const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx); return ctx[name]; };

function inputs() {
  const cap = JSON.parse(fs.readFileSync(FILES.cap, 'utf8'));
  const RX = loadJs(FILES.recipes, 'EN_RECIPES'), L = loadJs(FILES.loot, 'EN_LOOTBOXES'), LB = loadJs(FILES.loot, 'EnLoot');
  const W = loadJs(FILES.wanderer, 'EN_WANDERER'), E = loadJs(FILES.echo, 'EN_ECHO_RULES'), RS = loadJs(FILES.roster, 'EN_ROSTER');
  return { cap, RX, L, LB, W, E, RS };
}

/* ================================ СБОРКА ДАННЫХ ================================ */

function makeData(I, err) {
  const art = id => ((I.W.art && I.W.art.list) || []).find(a => a.id === id) || null;
  const A = {};
  for (const k of ['slots', 'rolls', 'cards']) {
    const a = art(RULES[k].art);
    if (!a) { err.push(`артефакт ${RULES[k].art} не найден в wanderer.js`); continue; }
    A[k] = { id: a.id, n: a.n, d: a.d, step: a.step, lv: a.lv, from: a.from, gold: a.gold, soul: a.soul, max: a.max };
    if (a.step !== RULES[k].step) err.push(`${a.n}: шаг в wanderer.js ${a.step}, в правилах ритуалов ${RULES[k].step}`);
  }
  if (A.slots && RULES.slots.base + A.slots.step * A.slots.lv !== RULES.slots.cap) err.push(`${A.slots.n}: 1 + шаг × уровни ≠ потолку ${RULES.slots.cap}`);
  if (A.rolls && A.rolls.max && !A.rolls.max.includes(String(RULES.rolls.free))) err.push(`${A.rolls.n}: база бесплатных роллов не ${RULES.rolls.free}`);
  const shards = I.L.assume && I.L.assume.workerShards;
  if (!Number.isInteger(shards) || shards <= 0) err.push('lootboxes.js: нет assume.workerShards');
  /* биомы: номер — вес «перевеса к свежим» (§19.4); ключи и уникальные — из recipes.js, прототип берёт их оттуда же */
  const biomes = {};
  for (const c of I.RX.cycles) for (const b of c.biomes) {
    const n = +String(b.id).replace(/\D/g, '');
    const keys = I.RX.items.filter(i => i.tier === 'key' && i.b === b.id).length, un = I.RX.items.filter(i => i.tier === 'unique' && i.b === b.id).length;
    if (keys !== 6) err.push(`биом ${b.id}: ключей ремёсел ${keys}, ждали 6`);
    if (!un) err.push(`биом ${b.id}: нет уникального ресурса хозяина`);
    biomes[b.id] = { n, w: n, cyc: c.n, team: !!c.team };
  }
  const memory = (I.W.passives || []).filter(p => p.cat === 'Ритуалы' || p.cat === 'Рабочие').map(p => ({ id: p.id, n: p.n, d: p.d, r: p.r }));
  return {
    meta: { builder: 'tools/content-gen/rituals/build.js', draft: 'docs/content/ритуалы.md', algorithm: 'tools/content-gen/rituals/pool.js' },
    rules: Object.assign({}, RULES, { shardsPer: shards }),
    tabs: TABS,
    text: TEXT,
    biomes,
    art: A,
    memory,
    heroAwaken: I.RS.rules && I.RS.rules.stub ? I.RS.rules.stub.activateSouls : null,
  };
}

/* ================================ ПРИТОК РАБОЧИХ ================================ */

/* Ожидаемые шарды по редкостям за неделю, в сотых: сундуки рабочих События (личные и клановые планки) и сундуки крафтовых боссов */
function shardsWeek(I, c, who) {
  const L = I.L, out = [0, 0, 0, 0, 0, 0, 0];
  const add = (box, r, win, count) => {
    const def = I.LB.resolve(L, { box, r, win, cyc: c });
    const bpSum = def.window.reduce((a, x) => a + x[1], 0);
    for (const [x, w] of def.window) {
      const lines = def.byR[x] || [], sumW = lines.reduce((a, l) => a + l.w, 0);
      for (const l of lines) if (l.line === 'workers') {
        const q = l.entries[0].q;
        out[x - 1] += count * def.n * w * l.w * q * 100 / (bpSum * sumW);   // сотые шарда
      }
    }
  };
  const ev = L.modes.event, typ = who === 'payer' ? { me: ev.typical.free.me + 1, clan: ev.typical.free.clan } : ev.typical[who] || ev.typical.free;
  for (const layer of ev.layers.filter(l => l.kind === 'plank')) {
    const k = layer.clan ? typ.clan : typ.me;
    for (const row of layer.rows.slice(0, k)) for (const g of row.cyc[c] || []) add(ev.box, g.r, g.win, g.count);
  }
  return out.map(x => Math.round(x));
}
function craftWeek(I, c, who) {
  const kills = who === 'none' ? 0 : (I.L.assume.craftKills || {})[who === 'fan' ? 'fan' : 'free'] || 0, out = [0, 0, 0, 0, 0, 0, 0];
  if (!kills) return out;
  const b = I.RX.drops.craftBosses.find(x => x.cyc === c && x.workerBoxRarity && !x.awake);
  if (!b) return out;
  const def = I.LB.resolve(I.L, { box: 'craft', r: b.workerBoxRarity, win: 'step', cyc: c });
  const bpSum = def.window.reduce((a, x) => a + x[1], 0);
  for (const [x, w] of def.window) {
    const lines = def.byR[x] || [], sumW = lines.reduce((a, l) => a + l.w, 0);
    for (const l of lines) if (l.line === 'workers') out[x - 1] += kills * def.n * w * l.w * l.entries[0].q * 100 / (bpSum * sumW);
  }
  return out.map(x => Math.round(x));
}

/* ================================ ПРОГОН ================================ */

const cycIdx = c => c - SIM.cycles[0];
/* дней в цикле c — capacity.json (cycleDays); циклов дальше записанных — как последний записанный (III), по образцу echo.py */
function daysOf(I, c) {
  const D = I.cap.cycleDays || {}, k = Object.keys(D).map(Number).filter(x => x <= c).sort((a, b) => a - b).pop();
  return k == null ? 0 : +D[k];
}
function artLv(D, k, c) { const a = D.art[k]; return a ? Math.max(0, Math.min(a.lv, c - a.from + 1)) : 0; }   // один уровень за цикл (wnCap)

/* F — перековка в прогоне (SIM.forge): { need, gold, cyc, keep }; без F — прогон без перековки, как раньше */
function simulate(D, I, pk, c, seedNo, lists, F) {
  const pr = SIM.prof[pk], R = D.rules, days = daysOf(I, c);
  const nSlots = P.slots(D, artLv(D, 'slots', c)), nFree = P.freeRolls(D, artLv(D, 'rolls', c)), nCards = P.cardsN(D, artLv(D, 'cards', c));
  const heroSlots = Math.max(1, nSlots - Math.floor(nSlots * (SIM.heroShare.den - SIM.heroShare.num) / SIM.heroShare.den));
  const roster = pr.heroes[cycIdx(c)];
  const seed = `прогон|${pk}|${c}|${seedNo}`;
  /* артель к началу цикла: первая артель и приток прошлых циклов; дальше — по неделям этого */
  const workers = [];
  const shards = [0, 0, 0, 0, 0, 0, 0];
  const tot = { gold: 0, spirit: 0, souls: 0, basics: 0, keys: 0, uniq: 0, rituals: 0, hWork: 0, hHero: 0, freeRolls: 0, paidRolls: 0, en: 0, awakenSouls: 0, uniqRituals: 0,
    forges: 0, forgeGold: 0, wRituals: 0, speedBp: 0 };
  /* перековка: keep лучших — под бригады; из остальных свободных — по F.need одной редкости, от младших к старшим, пока хватает.
     Перековки и золото считаются только внутри цикла прогона */
  const forgeNow = (cc, now, count) => {
    if (!F) return;
    for (;;) {
      const keep = new Set(workers.slice().sort((a, b) => b.r - a.r).slice(0, F.keep));
      let r = 1, ex = [];
      for (; r < 7; r++) { ex = workers.filter(w => w.r === r && !keep.has(w) && w.until <= now); if (ex.length >= F.need) break; }
      if (r >= 7) return;
      for (const w of ex.slice(0, F.need)) workers.splice(workers.indexOf(w), 1);
      workers.push({ r: r + 1, until: 0 });
      if (count) { tot.forges++; tot.forgeGold += F.gold[r - 1] * F.cyc[cc]; }
    }
  };
  const weekIn = (cc, doAwaken, now) => {
    const ev = shardsWeek(I, cc, pr.event), cr = craftWeek(I, cc, pr.craft);
    for (let r = 0; r < 7; r++) shards[r] += ev[r] + cr[r];
    for (let r = 0; r < 7; r++) while (shards[r] >= R.shardsPer * 100) { shards[r] -= R.shardsPer * 100; workers.push({ r: r + 1, until: 0 }); if (doAwaken) tot.awakenSouls += P.awaken(D, r + 1); }
    forgeNow(cc, now, doAwaken);
  };
  R.starter.forEach((n, i) => { for (let k = 0; k < n; k++) workers.push({ r: i + 1, until: 0 }); });
  for (let cc = SIM.cycles[0]; cc < c; cc++) for (let w = 0; w < Math.ceil(daysOf(I, cc) / 7); w++) weekIn(cc, false, 0);
  const slots = Array.from({ length: nSlots }, () => null);
  const visits = pr.visits.map(h => h * H);
  let heroBusy = [];   // [{ until, n }]
  for (let d = 0; d < days; d++) {
    if (d % 7 === 0) weekIn(c, true, d * 24 * H);
    const open = Object.keys(D.biomes).filter(id => D.biomes[id].cyc < c || (D.biomes[id].cyc === c && (D.biomes[id].n % 2 === 1 || d >= days / 2)));
    const openW = P.openW(D, open);
    const pools = {}, rollNo = { work: 0, hero: 0 };
    let freeLeft = nFree, paidLeft = pr.paid;
    /* ролл меняет все невзятые карточки вкладки, кроме уникальной: она ждёт до конца дня */
    const fresh = (tab, paid) => { const keep = (pools[tab] || []).filter(x => x.unique && !x.taken);
      pools[tab] = keep.concat(P.pool(D, { seed, day: d, tab, roll: rollNo[tab], paid, n: nCards - keep.length, open: openW, uniqueOk: !keep.length })); };
    fresh('work', false); fresh('hero', false);
    for (let vi = 0; vi < visits.length; vi++) {
      const now = d * 24 * H + visits[vi];
      const next = vi + 1 < visits.length ? d * 24 * H + visits[vi + 1] : (d + 1) * 24 * H + visits[0];
      const gap = next - now;
      /* сбор */
      for (let i = 0; i < slots.length; i++) if (slots[i] && slots[i].until <= now) slots[i] = null;
      heroBusy = heroBusy.filter(x => x.until > now);
      /* старт в свободные слоты */
      for (let i = 0; i < slots.length; i++) {
        if (slots[i]) continue;
        const runH = slots.filter(s => s && s.tab === 'hero').length, pref = runH < heroSlots ? 'hero' : 'work';
        const freeHeroes = roster - heroBusy.reduce((a, x) => a + x.n, 0);
        const freeW = workers.filter(w => w.until <= now).sort((a, b) => b.r - a.r);
        const staff = (tab, x) => tab === 'hero' ? x.crew <= freeHeroes : x.crew <= freeW.length;
        const best = tab => {
          let pick = null, pickReal = 0, over = null;
          for (const x of pools[tab]) {
            if (x.taken || !staff(tab, x)) continue;
            const real = P.time(D, x, tab === 'work' ? freeW.slice(0, x.crew).map(w => w.r) : []);
            if (x.unique && real <= gap) return { x, real };
            if (real <= gap && (!pick || x.ms > pick.ms)) { pick = x; pickReal = real; }
            if (real > gap && (!over || real < over.real)) over = { x, real };
          }
          return pick ? { x: pick, real: pickReal } : over;
        };
        /* вкладка: карточка, что влезает в зазор до следующего захода; короче 60 % возможного — ролл, бесплатный, потом платный */
        const tryTab = tab => {
          const ideal = Math.max(...D.tabs[tab].ms.filter(ms => ms <= gap), D.tabs[tab].ms[0]);
          let b = best(tab), tries = 0;
          while (tries < SIM.rollsPerPick && (!b || (!b.x.unique && b.x.ms * R.bp < ideal * SIM.rollIfBelowBp))) {
            if (!pools[tab].some(x => !x.taken && staff(tab, x)) && pools[tab].every(x => x.taken || x.crew > (tab === 'hero' ? freeHeroes : freeW.length))) {
              if (pools[tab].some(x => !x.taken)) break;   // карточки есть, но некого послать — ролл не поможет
            }
            if (freeLeft > 0) { freeLeft--; tot.freeRolls++; rollNo[tab]++; fresh(tab, false); }
            else if (paidLeft > 0) { tot.en += R.rolls.paid[pr.paid - paidLeft]; paidLeft--; tot.paidRolls++; rollNo[tab]++; fresh(tab, true); }
            else break;
            tries++; b = best(tab);
          }
          return b ? { tab, b } : null;
        };
        const got = tryTab(pref) || tryTab(pref === 'hero' ? 'work' : 'hero');
        if (!got) continue;
        const tab = got.tab, b = got.b;
        const x = b.x; x.taken = true;
        const crewW = tab === 'work' ? freeW.slice(0, x.crew) : [];
        const until = now + b.real;
        crewW.forEach(w => { w.until = until; });
        if (tab === 'hero') heroBusy.push({ until, n: x.crew });
        slots[i] = { tab, until };
        const A = P.amount(D, x, c);
        for (const [k, n] of A.cur) tot[k] += n;
        tot.basics += A.basics; tot.keys += A.keys; tot.uniq += A.uniq; if (x.unique) tot.uniqRituals++;
        tot.rituals++;
        if (tab === 'hero') tot.hHero += x.ms; else { tot.hWork += x.ms; tot.wRituals++; tot.speedBp += P.speedBp(D, x, crewW.map(w => w.r)); }
      }
    }
  }
  const hist = [0, 0, 0, 0, 0, 0, 0]; workers.forEach(w => { hist[w.r - 1]++; });
  return { tot, days, nSlots, heroSlots, nFree, nCards, roster, workers: workers.length, workersR: workers.reduce((a, w) => a + w.r, 0), hist };
}
/* ускорение лучшей пятёрки артели, б. п.: пять самых редких, не больше капа — полная бригада долгого и уникального ритуала */
function top5Bp(D, hist) {
  let left = D.rules.unique.crew, s = 0;
  for (let r = 7; r >= 1 && left; r--) { const n = Math.min(left, hist[r - 1]); s += n * r; left -= n; }
  return Math.min(D.rules.speed.capBp, s * D.rules.speed.perRBp);
}
/* прогон с перековкой и без: по профилю и циклу — артель к концу цикла, её редкости, лучшая пятёрка, средняя бригада, базовые в день,
   перековок за цикл и золото на них в день. Всё в сотых, как у доходов дня */
function forgeSim(D, I, lists, need) {
  const R = D.rules.forge, F = { need, gold: R.gold, cyc: R.cyc, keep: SIM.forge.keep }, out = {};
  for (const c of SIM.cycles) {
    out[c] = {};
    for (const pk of SIM.forge.prof) {
      const acc = [null, F].map(f => {
        const a = { artel: 0, hist: [0, 0, 0, 0, 0, 0, 0], t5: 0, speed: 0, wr: 0, basics: 0, forges: 0, gold: 0, days: 0 };
        for (let s = 0; s < SIM.seeds; s++) {
          const r = simulate(D, I, pk, c, s, lists, f);
          a.artel += r.workers; r.hist.forEach((x, i) => { a.hist[i] += x; }); a.t5 += top5Bp(D, r.hist);
          a.speed += r.tot.speedBp; a.wr += r.tot.wRituals; a.basics += r.tot.basics; a.forges += r.tot.forges; a.gold += r.tot.forgeGold; a.days = r.days;
        }
        const n = SIM.seeds;
        return { artel: Math.round(a.artel * 100 / n), hist: a.hist.map(x => Math.round(x * 100 / n)), t5: Math.round(a.t5 / n), speed: a.wr ? Math.round(a.speed / a.wr) : 0,
          basics: Math.round(a.basics * 100 / (n * a.days)), forges: Math.round(a.forges * 100 / n), gold: Math.round(a.gold * 100 / (n * a.days)) };
      });
      out[c][pk] = { off: acc[0], on: acc[1] };
    }
  }
  return out;
}

/* ================================ СБОРКА ================================ */

function build() {
  const err = [], warn = [];
  const I = inputs();
  const D = makeData(I, err);
  const pp = I.L.assume && I.L.assume.payerPts;
  if (!pp || pp.length !== 2) err.push('lootboxes.js: нет assume.payerPts');
  for (const c of SIM.cycles) if (!(daysOf(I, c) > 0)) err.push(`capacity.json: нет длины цикла ${ROMAN[c]} (cycleDays)`);
  else PAYER_BP = Math.round(pp[0] * RULES.bp / pp[1]);
  if (err.length) return { err, warn };

  /* генератор совпадает с сундуками */
  for (const s of ['ритуалы', 'демо-странник|1|work|0', 'x'.repeat(40)]) {
    const a = P.makeRng(P.seedOf(s)), b = I.LB.makeRng(I.LB.seedOf(s));
    for (let k = 0; k < 64; k++) if (a(1000003) !== b(1000003)) { err.push(`генератор ритуалов расходится с EnLoot на сиде «${s}»`); break; }
  }

  /* сетка и законы данных */
  const ints = (v, w) => { if (Array.isArray(v)) v.forEach((x, i) => ints(x, `${w}[${i}]`)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) ints(x, `${w}.${k}`); else if (typeof v === 'number' && !Number.isInteger(v)) err.push(`не целое: ${w} = ${v}`); };
  ints({ rules: D.rules, tabs: D.tabs }, 'данные');
  const TW = TABS.work, TH = TABS.hero;
  if (TW.ms[0] !== H / 2 || TH.ms[6] !== 12 * H) err.push('сетка §19.4: от 30 минут до 12 часов');
  TW.ms.forEach((ms, i) => { if (ms * 2 !== TH.ms[i]) err.push(`рабочие вдвое короче героев: редкость ${i + 1}`); if (ms % RULES.bp) err.push('длительность не кратна 10 000 мс'); });
  for (let i = 1; i < 7; i++) if (TW.ms[i] <= TW.ms[i - 1]) err.push('длительность не растёт с редкостью');
  for (const T of [TW, TH]) for (let i = 0; i < 7; i++) { if (T.crew.lo[i] < 1 || T.crew.hi[i] > 5 || T.crew.lo[i] > T.crew.hi[i]) err.push(`${T.n}: бригада редкости ${i + 1} вне 1–5`); }
  if (RULES.unique.crew !== 5 || RULES.unique.r !== 7) err.push('уникальный: бригада полная, таймер — верх сетки (§19.4)');
  if (RULES.rarW.reduce((a, x) => a + x, 0) !== RULES.bp) err.push('веса редкостей ≠ 10 000');
  if (TW.cur || !TH.cur.some(x => x[0] === 'souls')) err.push('души — только с вкладки героев (§19.5)');
  if (RULES.rolls.paid.length !== 5) err.push('роллов за Энериум — пять (§19.2)');
  const aw = [1, 2, 3, 4, 5, 6, 7].map(r => P.awaken(D, r));
  if (D.heroAwaken && aw[6] * RULES.bp > D.heroAwaken * TARGET.awakenOfHero) err.push(`рабочий вневременной (${aw[6]} душ) дороже половины героя (${D.heroAwaken})`);

  /* пул: детерминизм, уникальные только в бесплатных, биом — открытый */
  const openAll = P.openW(D, ['b1', 'b2', 'b3']);
  const p1 = JSON.stringify(P.pool(D, { seed: 's', day: 1, tab: 'work', roll: 0, n: 5, open: openAll, uniqueOk: true }));
  if (p1 !== JSON.stringify(P.pool(D, { seed: 's', day: 1, tab: 'work', roll: 0, n: 5, open: openAll, uniqueOk: true }))) err.push('пул не детерминирован');
  let uFree = 0, uPaid = 0, cards = 0;
  for (let s = 0; s < 4000; s++) {
    const a = P.pool(D, { seed: 'u' + s, day: 1, tab: 'work', roll: 0, n: 3, open: openAll, uniqueOk: true }), b = P.pool(D, { seed: 'u' + s, day: 1, tab: 'work', roll: 1, n: 3, open: openAll, uniqueOk: true, paid: true });
    uFree += a.filter(x => x.unique).length; uPaid += b.filter(x => x.unique).length; cards += a.length;
    if (a.filter(x => x.unique).length > RULES.unique.max) err.push('два уникальных в одной вкладке');
    for (const x of a.concat(b)) if (!['b1', 'b2', 'b3'].includes(x.biome)) err.push('карточка рабочих из закрытого биома');
  }
  if (uPaid) err.push(`уникальный в платном ролле: ${uPaid}`);
  const uRate = uFree * RULES.bp / cards;
  if (Math.abs(uRate - RULES.unique.chanceBp) > RULES.unique.chanceBp / 2) warn.push(`доля уникальных на пробе ${uRate} б. п. при шансе ${RULES.unique.chanceBp}`);

  /* списки ресурсов для исхода */
  const lists = { basic: I.RX.items.filter(i => i.pool && !i.team).map(i => i.id), key: {}, unique: {} };
  for (const b of Object.keys(D.biomes)) { lists.key[b] = I.RX.items.filter(i => i.tier === 'key' && i.b === b).map(i => i.id); lists.unique[b] = I.RX.items.filter(i => i.tier === 'unique' && i.b === b).map(i => i.id); }
  if (lists.basic.length !== 36) err.push(`общий пул базовых — ${lists.basic.length}, ждали 36`);
  /* исход на сиде: количества сходятся с карточкой */
  for (const tab of ['work', 'hero']) for (let s = 0; s < 200; s++) for (const x of P.pool(D, { seed: 'r' + s, day: 2, tab, roll: 0, n: 3, open: openAll, uniqueOk: true })) {
    const A = P.amount(D, x, 3), G = P.resolve(D, x, 3, P.seedOf('исход|' + s + x.id), { basic: lists.basic, key: lists.key[x.biome] || [], unique: lists.unique[x.biome] || [] });
    const n = Object.values(G.items).reduce((a, q) => a + q, 0);
    if (n !== A.basics + A.keys + A.uniq) err.push(`исход ${x.id}: предметов ${n}, на карточке ${A.basics + A.keys + A.uniq}`);
    if (tab === 'work' && G.cur.length) err.push('рабочие принесли валюту');
    if (tab === 'hero' && n) err.push('герои принесли ресурсы');
  }

  /* прогон */
  const sim = {};
  for (const c of SIM.cycles) {
    sim[c] = {};
    for (const pk of Object.keys(SIM.prof)) {
      const acc = { gold: 0, spirit: 0, souls: 0, basics: 0, keys: 0, uniq: 0, rituals: 0, hWork: 0, hHero: 0, freeRolls: 0, paidRolls: 0, en: 0, awakenSouls: 0, uniqRituals: 0 };
      let meta = null;
      for (let s = 0; s < SIM.seeds; s++) { const r = simulate(D, I, pk, c, s, lists); for (const k of Object.keys(acc)) acc[k] += r.tot[k]; meta = r; }
      const n = SIM.seeds * meta.days;
      /* в день — в сотых */
      const day = {}; for (const k of Object.keys(acc)) day[k] = Math.round(acc[k] * 100 / n);
      sim[c][pk] = { day, days: meta.days, nSlots: meta.nSlots, heroSlots: meta.heroSlots, nFree: meta.nFree, nCards: meta.nCards, roster: meta.roster, workers: meta.workers, workersR: meta.workersR };
    }
  }

  /* доход забегов и доли */
  const capOf = (pk, c) => { const pr = SIM.prof[pk], x = I.cap.cycles[c][pr.cap], k = pr.capBp || RULES.bp;
    return { gold: x.gold * k / RULES.bp, spirit: x.spirit * k / RULES.bp, souls: x.souls * k / RULES.bp, basics: x.base * k / RULES.bp, keys: x.el * k / RULES.bp, uniq: x.boss * I.RX.drops.enemies[0].boss.uniqueBp * k / RULES.bp / RULES.bp }; };
  const share = (pk, c, k) => { const b = capOf(pk, c)[k]; return b ? Math.round(sim[c][pk].day[k] * RULES.bp / b) : 0; };
  for (const c of SIM.cycles) {
    for (const k of Object.keys(TARGET.shareO)) {
      const s = share('o', c, k), [lo, hi] = TARGET.shareO[k];
      if (s < lo || s > hi) err.push(`цикл ${ROMAN[c]}: у обычного ритуалы дают ${s / 100} % ${k} забегов, цель ${lo / 100}–${hi / 100} %`);
    }
    for (const k of ['gold', 'spirit', 'souls']) if (share('e', c, k) > TARGET.shareEmax) err.push(`цикл ${ROMAN[c]}: у увлечённого ритуалы — ${share('e', c, k) / 100} % ${k}`);
    const zS = sim[c].z.day.souls, oS = capOf('o', c).souls;
    if (zS * RULES.bp > oS * TARGET.zOfO) err.push(`цикл ${ROMAN[c]}: занятый с ритуалов — ${Math.round(zS * RULES.bp / oS) / 100} % душ забегов обычного`);
    for (const k of ['gold', 'spirit', 'souls', 'basics']) { const o = sim[c].o.day[k], p = sim[c].p.day[k]; if (o && p * RULES.bp > o * TARGET.payer) err.push(`цикл ${ROMAN[c]}: плательщик в ритуалах ×${(p / o).toFixed(2)} по ${k}`); }
    if (c >= 3) { const u = sim[c].o.day.uniq, b = capOf('o', c).uniq; if (u * RULES.bp > b * TARGET.uniqOfBoss) err.push(`цикл ${ROMAN[c]}: уникальных с ритуалов ${u / 100} в день при ${b / 100} с боссов`); }
  }

  /* перековка рабочих: правило данных и вариант для автора; избыток не копится, золото — сток, бригадам не хуже */
  const FR = D.rules.forge;
  if (!(FR.need >= 2) || FR.gold.length !== 6 || FR.cyc.length !== 7) err.push('перековка рабочих: нужно от двух, цена на шесть редкостей входа, множитель на циклы 0–6');
  for (let i = 1; i < FR.gold.length; i++) if (FR.gold[i] <= FR.gold[i - 1]) err.push('перековка рабочих: цена не растёт с редкостью');
  for (let c = D.rules.open.cycle; c < FR.cyc.length; c++) if (!(FR.cyc[c] > 0) || (c > D.rules.open.cycle && FR.cyc[c] <= FR.cyc[c - 1])) err.push(`перековка рабочих: множитель цикла ${ROMAN[c]} не растёт`);
  if (FR.cyc.slice(0, D.rules.open.cycle).some(x => x)) err.push('перековка рабочих: цена до открытия ритуалов');
  const fsim = forgeSim(D, I, lists, FR.need), falt = forgeSim(D, I, lists, SIM.forge.alt);
  for (const c of SIM.cycles) for (const pk of ['o', 'e']) {
    const x = fsim[c][pk], g = capOf(pk, c).gold;
    if (x.on.artel > TARGET.forge.artelMax * 100) err.push(`перековка, цикл ${ROMAN[c]}, ${SIM.prof[pk].n}: артель ${x.on.artel / 100} — избыток копится`);
    if (x.on.gold * RULES.bp > g * TARGET.forge.goldMaxBp) err.push(`перековка, цикл ${ROMAN[c]}, ${SIM.prof[pk].n}: золото ${Math.round(x.on.gold * RULES.bp / g) / 100} % дохода дня`);
    if (x.on.basics * RULES.bp < x.off.basics * TARGET.forge.basicsMinBp) err.push(`перековка, цикл ${ROMAN[c]}, ${SIM.prof[pk].n}: базовых меньше, чем без неё`);
  }
  for (const c of SIM.cycles) { const o = fsim[c].o.on.basics, p = fsim[c].p.on.basics; if (o && p * RULES.bp > o * TARGET.payer) err.push(`перековка, цикл ${ROMAN[c]}: плательщик ×${(p / o).toFixed(2)} по базовым`); }

  const tables = makeTables(D, I, sim, capOf, share, lists, fsim, falt);
  const data = Object.assign({}, D, { sim: slimSim(sim, capOf), forge: slimForge(fsim) });
  return { data, tables, sim, fsim, falt, err, warn, D, I };
}
/* в данные прототипа — прогон перековки для UI-кита команде: артель, лучшая пятёрка и золото дня у обычного и увлечённого */
function slimForge(fsim) {
  const out = {};
  for (const c of SIM.cycles) { out[c] = {}; for (const pk of ['o', 'e']) { const x = fsim[c][pk]; out[c][pk] = { artel: [x.off.artel, x.on.artel], t5: [x.off.t5, x.on.t5], speed: [x.off.speed, x.on.speed], forges: x.on.forges, gold: x.on.gold }; } }
  return out;
}

/* в данные прототипа — только то, что показывает UI-кит команде: доход дня и доли */
function slimSim(sim, capOf) {
  const out = {};
  for (const c of SIM.cycles) { out[c] = {}; for (const pk of Object.keys(SIM.prof)) { const d = sim[c][pk].day, b = capOf(pk, c);
    out[c][pk] = { gold: d.gold, spirit: d.spirit, souls: d.souls, basics: d.basics, keys: d.keys, uniq: d.uniq, rituals: d.rituals,
      shareBp: { gold: Math.round(d.gold * 10000 / b.gold), spirit: Math.round(d.spirit * 10000 / b.spirit), souls: Math.round(d.souls * 10000 / b.souls), basics: Math.round(d.basics * 10000 / b.basics) } }; } }
  return out;
}

/* ================================ ТАБЛИЦЫ ================================ */

const fmt = n => { const s = String(Math.round(n)), neg = s[0] === '-'; const d = neg ? s.slice(1) : s; return (neg ? '−' : '') + d.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
const dec = (x100, d = 1) => { const v = Math.round(x100 / (100 / Math.pow(10, d))) / Math.pow(10, d), [i, f] = String(v).split('.'); return fmt(+i) + (f ? ',' + f : ''); };   // сотые → «12,5», «1 508»
const pctBp = (bp, d = 1) => dec(bp, d) + ' %';
const hrs = ms => { const m = ms / 60000; return m < 60 ? `${m} мин` : m % 60 ? `${Math.floor(m / 60)},${m % 60 / 6} ч` : `${m / 60} ч`; };
const head = cols => [`| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`];
const cells = a => `| ${a.join(' | ')} |`;

function makeTables(D, I, sim, capOf, share, lists, fsim, falt) {
  const TBL = {}, TW = D.tabs.work, TH = D.tabs.hero;
  let T;

  // сетка
  T = head(['Редкость', 'Шанс в пуле', 'Рабочие: время', 'Бригада', 'Базовые', 'Ключи ремёсел', 'Герои: время', 'Бригада', 'Цикл II: золото / дух / души']);
  for (let r = 1; r <= 7; r++) {
    const w = P.amount(D, { tab: 'work', r, ms: TW.ms[r - 1] }, 2), h = P.amount(D, { tab: 'hero', r, ms: TH.ms[r - 1] }, 2);
    T.push(cells([RARITY[r - 1], pctBp(D.rules.rarW[r - 1], 0), hrs(TW.ms[r - 1]), `${TW.crew.lo[r - 1]}–${TW.crew.hi[r - 1]}`.replace(/^(\d)–\1$/, '$1'), w.basics, w.keys || '—', hrs(TH.ms[r - 1]), `${TH.crew.lo[r - 1]}–${TH.crew.hi[r - 1]}`.replace(/^(\d)–\1$/, '$1'), h.cur.map(x => fmt(x[1])).join(' / ')]));
  }
  T.push(cells(['уникальный', `${pctBp(D.rules.unique.chanceBp, 0)} на карточку рабочих`, hrs(TW.ms[D.rules.unique.r - 1]), D.rules.unique.crew, '—', '—', '—', '—', `уникальный ресурс хозяина биома ×${D.rules.unique.qty}`]));
  TBL.grid = T.join('\n');

  // награда героев по циклам
  T = head(['Цикл', `За ${TH.curH || 1} ч: золото / дух / души`, '12 ч: золото / дух / души', 'Атак Эхо за души 12-часового ритуала, рядовой']);
  for (let c = 1; c <= 6; c++) {
    const a = TH.cur.map(x => x[1] * c), b = P.amount(D, { tab: 'hero', r: 7, ms: TH.ms[6] }, c).cur.map(x => x[1]);
    const atk = I.E.cycles[c] ? I.E.cycles[c][0].souls : null;
    T.push(cells([ROMAN[c] + (c === 1 ? ' · ритуалов нет' : ''), a.map(fmt).join(' / '), b.map(fmt).join(' / '), atk ? `${dec(b[2] * 100 / atk)} при ${atk} душах за атаку` : '—']));
  }
  TBL.heroes = T.join('\n');

  // слоты, роллы, карточки
  T = head(['Цикл', 'Слотов', 'Бесплатных роллов в день', 'Карточек во вкладке', 'Платные роллы, Энериум', 'Героев под ритуалы: обычный / увлечённый']);
  for (const c of SIM.cycles) T.push(cells([ROMAN[c], P.slots(D, artLv(D, 'slots', c)), P.freeRolls(D, artLv(D, 'rolls', c)), P.cardsN(D, artLv(D, 'cards', c)), D.rules.rolls.paid.join(' / '), `${SIM.prof.o.heroes[cycIdx(c)]} / ${SIM.prof.e.heroes[cycIdx(c)]}`]));
  TBL.slots = T.join('\n');

  // рабочие: пробуждение, ускорение, приток
  T = head(['Редкость рабочего', 'Ускорение за участника', 'Бригада из пяти таких', 'Пробуждение, душ']);
  for (let r = 1; r <= 7; r++) T.push(cells([RARITY[r - 1], pctBp(D.rules.speed.perRBp * r, 0), pctBp(Math.min(D.rules.speed.capBp, D.rules.speed.perRBp * r * 5), 0) + (D.rules.speed.perRBp * r * 5 >= D.rules.speed.capBp ? ' — кап' : ''), P.awaken(D, r)]));
  TBL.speed = T.join('\n');
  T = head(['Цикл', 'Шардов в неделю, обычный: по редкостям 1–7', 'Рабочих в неделю', 'Увлечённый: шардов', 'Рабочих в неделю', 'Артель в прогоне к концу цикла: обычный / увлечённый', 'Души на пробуждение в день: обычный / увлечённый']);
  for (const c of SIM.cycles) {
    const o = shardsWeek(I, c, 'free').map((x, i) => x + craftWeek(I, c, 'free')[i]), e = shardsWeek(I, c, 'fan').map((x, i) => x + craftWeek(I, c, 'fan')[i]);
    const so = o.reduce((a, x) => a + x, 0), se = e.reduce((a, x) => a + x, 0);
    T.push(cells([ROMAN[c], o.map(x => dec(x)).join(' / '), dec(so / D.rules.shardsPer), dec(se), dec(se / D.rules.shardsPer), `${sim[c].o.workers} / ${sim[c].e.workers}`, `${dec(sim[c].o.day.awakenSouls)} / ${dec(sim[c].e.day.awakenSouls)}`]));
  }
  TBL.workers = T.join('\n');

  // перековка рабочих: правило и цена по циклу
  const FR = D.rules.forge, openC = SIM.cycles;
  T = head(['Рабочие на входе', 'Сколько', 'Выйдет', 'Ускорение за участника: было → стало', `Цена, золото: цикл ${openC.map(c => ROMAN[c]).join(' / ')}`]);
  for (let r = 1; r < 7; r++) T.push(cells([RARITY[r - 1], FR.need, `рабочий ${RARITY_M[r + 1]}`, `${pctBp(D.rules.speed.perRBp * r, 0)} → ${pctBp(D.rules.speed.perRBp * (r + 1), 0)}`, openC.map(c => fmt(FR.gold[r - 1] * FR.cyc[c])).join(' / ')]));
  TBL.forgeRule = T.join('\n');
  // прогон с перековкой: избыток не копится
  const arrow = (a, b, f) => `${f(a)} → ${f(b)}`;
  T = head(['Цикл', 'Игрок', 'Артель к концу цикла: без перековки → с ней', 'С перековкой, по редкостям 1–7', 'Перековок за цикл', 'Золото на перековку в день · доля дохода забегов', 'Лучшая пятёрка: без → с', 'Средняя бригада: без → с', 'Базовые в день: без → с']);
  for (const c of SIM.cycles) for (const pk of ['o', 'e']) {
    const x = fsim[c][pk], g = capOf(pk, c).gold;
    T.push(cells([pk === 'o' ? ROMAN[c] : '', SIM.prof[pk].n, arrow(x.off.artel, x.on.artel, v => dec(v)), x.on.hist.map(v => dec(v)).join(' / '), dec(x.on.forges), `${fmt(x.on.gold / 100)} · ${pctBp(Math.round(x.on.gold * RULES.bp / g))}`,
      arrow(x.off.t5, x.on.t5, v => pctBp(v, 0)), arrow(x.off.speed, x.on.speed, v => pctBp(v)), arrow(x.off.basics, x.on.basics, v => dec(v))]));
  }
  TBL.forge = T.join('\n');
  // вариант «2 → 1» — для решения автора
  T = head(['Цикл', 'Игрок', 'Артель к концу цикла', 'Лучшая пятёрка', 'Средняя бригада', 'Базовые в день: без → с', 'Золото на перековку в день · доля дохода забегов']);
  for (const c of SIM.cycles) for (const pk of ['o', 'e']) {
    const x = falt[c][pk], g = capOf(pk, c).gold;
    T.push(cells([pk === 'o' ? ROMAN[c] : '', SIM.prof[pk].n, dec(x.on.artel), pctBp(x.on.t5, 0), pctBp(x.on.speed), arrow(x.off.basics, x.on.basics, v => dec(v)), `${fmt(x.on.gold / 100)} · ${pctBp(Math.round(x.on.gold * RULES.bp / g))}`]));
  }
  TBL.forgeAlt = T.join('\n');

  // доход в день
  T = head(['Цикл', 'Игрок', 'Ритуалов в день', 'Золото', 'Дух', 'Души', 'Базовые', 'Ключи ремёсел', 'Доля забегов обычного того же дня: золото / дух / души / базовые']);
  for (const c of SIM.cycles) for (const pk of ['o', 'e', 'z', 'p']) {
    const d = sim[c][pk].day;
    T.push(cells([pk === 'o' ? ROMAN[c] : '', SIM.prof[pk].n, dec(d.rituals), fmt(d.gold / 100), fmt(d.spirit / 100), dec(d.souls, 0), dec(d.basics, 0), dec(d.keys),
      pk === 'o' || pk === 'p' ? ['gold', 'spirit', 'souls', 'basics'].map(k => pctBp(Math.round(d[k] * 10000 / capOf('o', c)[k]))).join(' / ')
        : pk === 'e' ? `свои забеги: ${['gold', 'spirit', 'souls', 'basics'].map(k => pctBp(share('e', c, k))).join(' / ')}`
        : `свои полчаса забегов: ${['gold', 'spirit', 'souls', 'basics'].map(k => pctBp(share('z', c, k))).join(' / ')}`]));
  }
  TBL.day = T.join('\n');

  // за цикл
  T = head(['Цикл', 'Дней', 'Обычный: золото / дух / души', 'Базовые / ключи / уникальные', 'Увлечённый: золото / дух / души', 'Базовые / ключи / уникальные']);
  for (const c of SIM.cycles) {
    const n = daysOf(I, c), o = sim[c].o.day, e = sim[c].e.day, t = (x) => x * n / 100;
    T.push(cells([ROMAN[c], n, `${fmt(t(o.gold))} / ${fmt(t(o.spirit))} / ${fmt(t(o.souls))}`, `${fmt(t(o.basics))} / ${fmt(t(o.keys))} / ${dec(o.uniq * n)}`, `${fmt(t(e.gold))} / ${fmt(t(e.spirit))} / ${fmt(t(e.souls))}`, `${fmt(t(e.basics))} / ${fmt(t(e.keys))} / ${dec(e.uniq * n)}`]));
  }
  TBL.cycle = T.join('\n');

  // души: всё в сотых — capacity.json и прогон
  T = head(['Цикл', 'Души забегов в день: обычный', 'Ритуалы: обычный', 'Доля', 'Рядовая атака Эхо, душ', 'Атак на души ритуалов в день: обычный / занятый', 'Занятый: души забегов + ритуалов', 'Бюджет Эхо занятого к бюджету обычного', 'Пробуждение рабочих, душ в день: обычный']);
  for (const c of SIM.cycles) {
    const o = sim[c].o.day, z = sim[c].z.day, atk = I.E.cycles[c][0].souls, bo = capOf('o', c).souls, bz = capOf('z', c).souls;
    const echoO = (bo + o.souls) * ECHO_BP / RULES.bp, echoZ = (bz + z.souls) * ECHO_BP / RULES.bp;
    T.push(cells([ROMAN[c], dec(bo, 0), dec(o.souls, 0), pctBp(share('o', c, 'souls')), atk, `${dec(o.souls / atk)} / ${dec(z.souls / atk)}`, `${dec(bz, 0)} + ${dec(z.souls, 0)}`, pctBp(Math.round(echoZ * RULES.bp / echoO)), dec(o.awakenSouls, 0)]));
  }
  TBL.souls = T.join('\n');

  // ×1,7: плательщик при том же времени — лишний отряд забегов (payerPts сундуков) и роллы ритуалов за Энериум
  T = head(['Цикл', 'Плательщик / обычный в ритуалах: золото', 'Дух', 'Души', 'Базовые', 'Роллов в день: бесплатных / платных', 'Энериум в день', 'Весь доход душ: забеги ×' + dec(PAYER_BP / 100, 2) + ' и ритуалы']);
  for (const c of SIM.cycles) {
    const o = sim[c].o.day, p = sim[c].p.day, r = k => o[k] ? '×' + dec(Math.round(p[k] * 100 / o[k]), 2) : '—';
    const b = capOf('o', c).souls, tot = Math.round((b * PAYER_BP / RULES.bp + p.souls) * 100 / (b + o.souls));
    T.push(cells([ROMAN[c], r('gold'), r('spirit'), r('souls'), r('basics'), `${dec(p.freeRolls)} / ${dec(p.paidRolls)}`, dec(p.en, 0), '×' + dec(tot, 2)]));
  }
  TBL.x17 = T.join('\n');

  // уникальные: в неделю
  T = head(['Цикл', 'С боссов биомов: обычный, в неделю', 'С ритуалов: обычный', 'Увлечённый: с боссов / с ритуалов', 'Занятый: с ритуалов']);
  for (const c of SIM.cycles) {
    const w = x => dec(x * 7), o = sim[c].o.day.uniq, e = sim[c].e.day.uniq, z = sim[c].z.day.uniq;
    T.push(cells([ROMAN[c], w(capOf('o', c).uniq), w(o), `${w(capOf('e', c).uniq)} / ${w(e)}`, w(z)]));
  }
  TBL.unique = T.join('\n');

  return TBL;
}

/* ================================ ВЫВОД ================================ */

function render(data) {
  const pool = fs.readFileSync(FILES.pool, 'utf8').replace(/\r\n/g, '\n');
  const head = `/* Ритуалы и рабочие — данные прототипа «Свет снизу» (GDD §19). Собирает tools/content-gen/rituals/build.js из калькуляторов
   экономики (capacity.json), сундуков, рецептов и таблиц Странника. Руками не править: пересборка затрёт правку.
   Черновик · предложение · ждёт автора. Числа — демонстрация, только целые; шансы — в базисных пунктах (10 000 = 100 %),
   время — в миллисекундах. rules — слоты, роллы, карточки, веса редкостей, ускорение рабочих, уникальный ритуал, пробуждение;
   tabs — вкладки: длительность по редкостям, бригада, награда за единицу времени, имена карточек; biomes — вес «перевеса к свежим»;
   art — артефакты ритуалов из wanderer.js; sim — прогон калькулятора: доход дня в сотых и доли от забегов обычного.
   Обоснование и таблицы — docs/content/ритуалы.md. В игре пул, старт, исход и выдачу решает сервер (§19, §36.16):
   клиент получает карточки и итог. Ниже данных — алгоритм tools/content-gen/rituals/pool.js как есть. */\n`;
  return head + 'window.EN_RITUALS = ' + JSON.stringify(data) + ';\n' + pool;
}
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/rituals/build.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) return null;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { build, render, withTables, markA, markB, FILES, RULES, TABS, SIM, TARGET, top5Bp };

if (require.main === module) {
  const R = build();
  for (const w of R.warn) console.log('предупреждение: ' + w);
  if (process.argv.includes('--print')) {
    if (R.err.length) console.log('ОШИБКИ:\n' + R.err.join('\n'));
    if (R.tables) for (const [k, t] of Object.entries(R.tables)) console.log(`\n### ${k}\n\n${t}`);
    process.exit(R.err.length ? 1 : 0);
  }
  if (R.err.length) { console.log('ОШИБКИ:\n' + R.err.join('\n')); process.exit(1); }
  const js = render(R.data);
  const docOld = fs.existsSync(FILES.doc) ? fs.readFileSync(FILES.doc, 'utf8') : null;
  const docNew = docOld ? withTables(docOld, R.tables) : null;
  if (process.argv.includes('--check')) {
    const okJs = fs.existsSync(FILES.out) && fs.readFileSync(FILES.out, 'utf8') === js, okDoc = !docOld || docNew === docOld;
    console.log(okJs && okDoc ? 'Свежие: rituals.js и таблицы документа совпадают со сборкой.' : `Устарели: ${[!okJs && 'design/ui/rituals.js', !okDoc && 'docs/content/ритуалы.md'].filter(Boolean).join(', ')} — пересобрать.`);
    process.exit(okJs && okDoc ? 0 : 1);
  }
  fs.writeFileSync(FILES.out, js);
  if (docNew) fs.writeFileSync(FILES.doc, docNew);
  else console.log(`предупреждение: в ${path.relative(ROOT, FILES.doc)} нет меток таблиц — таблицы не вставлены`);
  console.log(`Собрано: вкладок 2, редкостей 7, биомов ${Object.keys(R.data.biomes).length}; прогон ${SIM.seeds} сидов × ${SIM.cycles.length} циклов × ${Object.keys(SIM.prof).length} профиля.`);
}
