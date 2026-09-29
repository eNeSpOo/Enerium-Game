/* Боевой пропуск и лист даров — калькулятор и сборщик: GDD §32 (пропуск: два ряда, сезон, прогресс не продаётся — только очки
   за активность), §29 (календарь: тридцать дней, главный приз на двадцатый, прощение пропусков, награды растут с уровнем), §16
   (Награда = База × (1 + Уровень × 0,1)), §1.2 (×1,7, дневные капы одинаковы для всех), §9.3 (источники Энериума), §23 (сундуки);
   ADR-0014, ADR-0021, ADR-0023, ADR-0026, ADR-0029, ADR-0030. Черновик · предложение · ждёт автора. Все числа — демонстрация.

   Что считает:
   1. Очки пропуска — за реальные дела, по таблице цен дел Событий недели (одна цена дела на всю игру), без акцента недели.
      Ёмкость дня обычного, увлечённого и плательщика — прогон Событий (event.js, econ), он же — калькуляторы экономики
      (contracts/capacity.json). Занятый — треть дня обычного, пять дней в неделю.
   2. Прогон сезонов: активность дня 40–140 %, дни без игры; потолок сезона копится по дням. Когда каждый проходит бесплатный ряд,
      на какой ступени заканчивает сезон занятый.
   3. Награды двух рядов: валюта растёт с уровнем Странника (§16), сундук странника — с циклом. Правило ×1,7 для платного ряда —
      по каждому виду награды: (бесплатный + платный) / бесплатный, с содержимым сундуков по ожиданию лутбоксов (ev). Доля ряда
      в доходе обычного за сезон. Энериум: возврат цены, Энериум бесплатного ряда и листа даров против Энериума контрактов.
   4. Лист даров: 30 отметок, вехи 7 / 14 / 20 / 30, главный дар — двадцатая; ценность листа по циклам.
   5. Арт: задания tools/art-gen/jobs/pass.json, выбранные картинки в art/generated/, траты — манифест, выгружено ли в прототип.

   Пишет:
   - design/ui/pass.js — данные прототипа (window.EN_PASS) и алгоритм «сервера» (window.EnPass из rules.js), руками не править;
   - docs/content/пропуск-и-награды.md — только таблицы между метками «<!-- @таблица имя -->» и «<!-- /таблица имя -->»; текст — ручной.
   Читает: design/ui/event.js (таблица дел, дневные потолки, ёмкость дня), design/ui/lootboxes.js (сундук странника, окна, ожидание),
   design/ui/contracts.js (Энериум контрактов), design/ui/roster.js (цены донатных героев — для сравнения), contracts/capacity.json
   (доход дня), tools/art-gen/jobs/pass.json, art/generated/manifest.json, design/ui/assets/art/ (что выгружено).
   Любая ошибка — файлы не пишутся. Пересборка даёт те же байты.
   Порядок: после Событий (node tools/content-gen/event/build.js) и лутбоксов. Пересобрать после выгрузки арта: список выгруженного
   обновится сам.
   Запуск: node tools/content-gen/pass/build.js           — собрать и записать;
           node tools/content-gen/pass/build.js --check   — только проверить, что файлы свежие;
           node tools/content-gen/pass/build.js --print   — таблицы в консоль. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const PS = require('./rules.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  rules: path.join(__dirname, 'rules.js'),
  event: path.join(ROOT, 'design', 'ui', 'event.js'),
  loot: path.join(ROOT, 'design', 'ui', 'lootboxes.js'),
  contracts: path.join(ROOT, 'design', 'ui', 'contracts.js'),
  roster: path.join(ROOT, 'design', 'ui', 'roster.js'),
  cap: path.join(ROOT, 'tools', 'content-gen', 'contracts', 'capacity.json'),
  jobs: path.join(ROOT, 'tools', 'art-gen', 'jobs', 'pass.json'),
  manifest: path.join(ROOT, 'art', 'generated', 'manifest.json'),
  assets: path.join(ROOT, 'design', 'ui', 'assets', 'art'),
  generated: path.join(ROOT, 'art', 'generated'),
  out: path.join(ROOT, 'design', 'ui', 'pass.js'),
  doc: path.join(ROOT, 'docs', 'content', 'пропуск-и-награды.md'),
};

/* ================================ ДАННЫЕ ================================ */

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const BP = 10000;

/* Правила пропуска. Числа — демонстрация */
const RULES = {
  open: { level: 10, cycle: 2 },          // пропуск — с 10-го уровня, вместе с «Неделей» и Событием: дела считаются с цикла II (§16)
  season: { id: 'autumn', n: 'Осенний путь', days: 28, weeks: 4 },   // сезон — четыре недели, начало и конец — в час недельного подсчёта (§1.1)
  tiers: 30,                              // ступеней
  tierPts: 30,                            // очков на ступень — одинаково на всех ступенях
  dayCap: 60,                             // потолок копится: к дню d — не больше d × 60 очков; пропущенный день можно добрать
  /* очков дел на одно очко пропуска: дела — по таблице цен Событий, без акцента недели. 55, а не 100 (ADR-0031): под потолком спуска
     (event/build.js) средний день обычного цикла II — около 3 950 очков дел, и при 100 он проходил бесплатный ряд к 28-му дню;
     при 55 — к 17-му, в 90 % сезонов — к 19-му (ADR-0030, п. 22б: 15–18-й); увлечённый упирается в потолок 60 в день */
  rate: 55,
  level: { perLevelBp: 1000 },            // §16: Награда = База × (1 + Уровень × 0,1)
  chestBox: 'wander',                     // сундук странника — общий: ресурсы и прах (лутбоксы, «Категория — у своего источника»)
  chestBase: [0, 1, 2, 3, 4, 5, 6],       // редкость сундука по циклу аккаунта: цикл I — обычный … цикл VI — первородный (как у календаря лутбоксов)
  price: 600,                             // Энериума за платный ряд сезона: прогресс не продаётся, продаётся только второй ряд наград
  frame: 'pass',                          // последняя ступень бесплатного ряда — рамка облика «Осенний путь» (screens/wanderer.js)
  kinds: ['gold', 'spirit', 'dust', 'keys', 'enerium', 'chest', 'frame'],   // что может дать клетка: ни душ, ни рун, ни героев, ни снаряжения
};

/* Клетки рядов. b — база валюты до роста с уровнем (§16), n — число без роста, off — сдвиг редкости сундука от базы цикла,
   r — своя редкость сундука, win — окно сундука: step — лестница, wild — шальное, pure — чистое (лутбоксы) */
const G = b => ({ k: 'gold', b }), SP = b => ({ k: 'spirit', b }), DU = b => ({ k: 'dust', b }), KE = n => ({ k: 'keys', n }), EN = n => ({ k: 'enerium', n });
const CH = (off, win) => ({ k: 'chest', off, win }), CR = (r, win) => ({ k: 'chest', r, win }), FR = id => ({ k: 'frame', id });
/* прах душ — со второго цикла, как в сундуках (лутбоксы, «Прах душ · с цикла II»); до него — дух */
const DUc = (b, alt) => ({ k: 'dust', b, from: 2, alt: SP(alt) });

/* Бесплатный ряд: каждые пять ступеней — золото, дух или Энериум, ключи, прах, сундук. На 10-й и 20-й — сундук на ступень выше
   цикла, на 20-й — чистое окно, на 15-й — шальное. Последняя, 30-я, — рамка «Осенний путь» и сундук на две ступени выше.
   Золото и дух клетки — 1 600 и 6 400 до роста с уровнем (было 3 000 и 12 000): с реальным отрядом (ADR-0031) доход обычного за сезон
   ниже, и прежние клетки давали в цикле II 8,2 % его золота и духа при законе 5 % (LAWS.incomeBp) */
const FREE = [
  [G(1600)], [SP(6400)], [KE(3)], [DU(25)], [CH(0, 'step')],
  [G(1600)], [EN(10)], [KE(3)], [DU(25)], [CH(1, 'step')],
  [G(1600)], [SP(6400)], [KE(4)], [DU(25)], [CH(0, 'wild')],
  [G(1600)], [EN(10)], [KE(4)], [DU(25)], [CH(1, 'pure')],
  [G(1600)], [SP(6400)], [KE(5)], [DU(25)], [CH(0, 'step')],
  [G(1600)], [EN(10)], [KE(5)], [DU(25)], [FR(RULES.frame), CH(2, 'step')],
];
/* Платный ряд — «ещё немного того же»: валюты — 60 % бесплатного ряда по каждому виду, разложены на шесть ступеней;
   три сундука на вехах 10, 20 и 30 — как на 10-й ступени бесплатного ряда, без чистого окна; Энериум — возврат части цены.
   Венец сезона — сундук на две ступени выше и рамка — только у бесплатного ряда: сундук платного ряда той же редкости дал бы
   по ресурсам сундуков больше ×1,7 (цикл IV). Облика в платном ряду нет: облик не продаётся (ADR-0030, п. 20). Героев и осколков
   героев нет: это не донатный сет */
const PAID = [
  [SP(1920)], [G(960)], [DU(15)], [KE(2)], [EN(40)],
  [SP(1920)], [G(960)], [DU(15)], [KE(2)], [CH(1, 'step')],
  [SP(1920)], [G(960)], [DU(15)], [KE(2)], [EN(40)],
  [SP(1920)], [G(960)], [DU(15)], [KE(3)], [CH(1, 'step')],
  [SP(1920)], [G(960)], [DU(15)], [KE(3)], [EN(40)],
  [SP(1920)], [G(960)], [DU(15)], [KE(2)], [CH(1, 'step'), EN(80)],
];

/* Лист даров (§29): 30 отметок, одна — в серверные сутки за вход в игру. Лист не сгорает: пропущенный день ничего не отнимает,
   следующая отметка ждёт. Вехи — 7, 14, 20 (главный дар, §29) и 30; после 30-й начинается новый лист. На обычных отметках —
   одна награда: золото, дух, ключи, прах, шальной сундук, изредка Энериум. Сундук вехи — по циклу аккаунта (chestBase) */
const CAL = {
  marks: 30, main: 20,
  miles: {
    7: { n: 'Дар недели', art: 'pass/gift-07.jpg' },
    14: { n: 'Дар двух недель', art: 'pass/gift-14.jpg' },
    20: { n: 'Главный дар', art: 'pass/gift-20.jpg', main: 1 },
    30: { n: 'Венец листа', art: 'pass/gift-30.jpg' },
  },
  list: [
    [G(2500)], [SP(5000)], [CR(1, 'wild')], [KE(2)], [DUc(15, 5000)], [G(2500)], [CH(0, 'step')],
    [SP(5000)], [CR(1, 'wild')], [EN(5)], [G(2500)], [KE(2)], [DUc(15, 5000)], [CH(1, 'step')],
    [SP(5000)], [CR(1, 'wild')], [G(2500)], [KE(3)], [DUc(15, 5000)], [CH(1, 'pure'), EN(20)],
    [SP(5000)], [CR(1, 'wild')], [G(2500)], [EN(5)], [KE(3)], [DUc(15, 5000)], [SP(5000)], [CR(1, 'wild')], [G(2500)], [CH(1, 'step'), EN(15)],
  ],
  open: 1,        // лист даров — с первого дня игры: новичку он нужнее всех
  forgive: 'all', // пропуск не сбрасывает лист: §29 просит прощать часть пропусков — прощаем все (предложение автору)
};

/* Допущения прогона — ручки */
const SIM = {
  seasons: 400,
  seed: 'прогон пропуска',
  tau: [40, 140],                     // активность дня, % обычной: как в прогонах контрактов и Событий
  prof: {
    o: { n: 'обычный', src: 'o', mulBp: BP, off: 1 },                 // 3 ч в день, один день в неделю без игры
    e: { n: 'увлечённый', src: 'e', mulBp: BP, off: 0 },              // 8 ч в день
    z: { n: 'занятый', src: 'o', mulBp: 3300, off: 2 },               // час в день, пять дней в неделю
    p: { n: 'плательщик', src: 'o', mulBp: 0, off: 1 },               // время обычного, лишний отряд: неделя плательщика к неделе обычного в прогоне Событий
  },
  /* уровни Странника в цикле — допущение: те же, что у чужих профилей демо-сервера (screens/social.js, SOC_DATA.gen.lvl) */
  lvl: { 1: [1, 9], 2: [10, 30], 3: [28, 46], 4: [44, 62], 5: [60, 78], 6: [76, 95] },
};

/* Законы и пороги проверок */
const LAWS = {
  oDay: 25, oDoneBp: 9000,     // обычный проходит бесплатный ряд к 25-му дню сезона не меньше чем в 90 % сезонов — в каждом цикле
  minDay: 14,                  // раньше 14-го дня бесплатный ряд не пройти никому: потолок держит сезон живым
  x17: 170,                    // (бесплатный + платный) / бесплатный — не больше ×1,7 по каждому виду награды (§1.2)
  paidMax: 159,                // ADR-0030, п. 22б: платный ряд — не больше ×1,59 по каждой награде; облика, героев и осколков в нём нет
  pace17: 170,                 // плательщик проходит путь не быстрее ×1,7 обычного
  incomeBp: 500,               // бесплатный ряд — не больше 5 % золота и духа обычного за сезон
  enBp: BP,                    // Энериум бесплатного ряда и листа даров за 4 недели — не больше Энериума контрактов обычного (цикл II)
  refundBp: 5000,              // возврат цены платным рядом — не больше половины цены
  calMain: 20,                 // §29: главный приз — на двадцатый день
};

/* Демо-аккаунт прототипа — один календарь (ADR-0031, п. 17): 11-й день цикла II, четвёртый день второй недели, 16:48. Сезон начался
   вместе с циклом II — в час недельного подсчёта, поэтому день сезона — 11-й; очки — медиана обычного игрока цикла II к этому дню; три
   ступени ждут «Забрать»; платный ряд не открыт. Лист даров — по возрасту аккаунта: цикл I и 11 дней цикла II, обычный не входит один
   день в неделю — десять отметок взяты, одиннадцатая ждёт. До смены серверных суток — 7 ч 12 мин */
const DEMO = { day: 11, waiting: 3, cal: { got: 10, leftMin: 432 } };   // leftMin — минут до смены серверных суток: одни сутки на лист и сезон

/* Арт: задание tools/art-gen/jobs/pass.json → путь выгрузки в прототип (design/ui/assets/art/…), размер и поле кадра;
   выгружает tools/art-gen/export_ui.py по строке tools/art-gen/ui-art.json — строки в черновике, таблица «Выгрузка» */
const ART = [
  { key: 'banner', job: 'pass-banner-autumn', to: 'pass/banner.jpg', size: [1584, 672], use: 'баннер сезона — шапка пропуска' },
  { key: 'gift7', job: 'cal-gift-07', to: 'pass/gift-07.jpg', size: [512, 512], use: 'веха листа даров: 7-я отметка' },
  { key: 'gift14', job: 'cal-gift-14', to: 'pass/gift-14.jpg', size: [512, 512], use: 'веха листа даров: 14-я отметка' },
  { key: 'gift20', job: 'cal-gift-20', to: 'pass/gift-20.jpg', size: [512, 512], use: 'главный дар: 20-я отметка' },
  { key: 'gift30', job: 'cal-gift-30', to: 'pass/gift-30.jpg', size: [512, 512], use: 'веха листа даров: 30-я отметка' },
  { key: 'crown', job: 'pass-crown', to: 'pass/crown.jpg', size: [512, 512], use: 'последняя ступень пропуска' },
  { key: 'worker', job: 'icon-worker', to: 'workers/worker.png', size: [256, 256], fit: 80, use: 'значок рабочего: ритуалы, артель, перековка' },
  { key: 'dust', job: 'icon-dust', to: 'dust.png', size: [128, 128], fit: 96, use: 'значок праха душ вместо рисунка SVG' },
];

/* ================================ РАСЧЁТ ================================ */

const loadJs = (file, names) => { const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx); return names.map(n => ctx[n]); };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const dec = (num, den, d = 1) => { if (!den) return '0'; const p = 10 ** d, v = Math.round(num * p / den) / p; return String(v).replace('.', ','); };
const pct = (num, den, d = 0) => dec(num * 100, den, d) + ' %';
const sha = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 12);

function build() {
  const err = [], warn = [];
  const [EV] = loadJs(FILES.event, ['EN_EVENT']);
  const [LB, EL] = loadJs(FILES.loot, ['EN_LOOTBOXES', 'EnLoot']);
  const [CT] = loadJs(FILES.contracts, ['EN_CONTRACTS']);
  const [RS] = loadJs(FILES.roster, ['EN_ROSTER']);
  const CAP = JSON.parse(fs.readFileSync(FILES.cap, 'utf8'));
  if (!EV || !LB || !EL || !CT || !RS) { err.push('нет данных: event.js, lootboxes.js, contracts.js или roster.js'); return { err, warn }; }
  /* генератор прогона — тот же mulberry32, что у ядра боя и сундуков (EnLoot) */
  const makeRng = EL.makeRng, seedOf = EL.seedOf;
  const BOX = LB.boxes[RULES.chestBox];
  if (!BOX) err.push(`лутбоксы: нет сундука ${RULES.chestBox}`);
  if (EV.from !== RULES.open.cycle) err.push(`События считают дела с цикла ${EV.from}, пропуск — с ${RULES.open.cycle}`);

  /* --- данные «сервера»: таблица дел Событий как есть --- */
  const D = {
    bp: BP, open: RULES.open, season: RULES.season, tiers: RULES.tiers, tierPts: RULES.tierPts, dayCap: RULES.dayCap, rate: RULES.rate,
    level: RULES.level, chestBox: RULES.chestBox, chestBase: RULES.chestBase, price: RULES.price, frame: RULES.frame,
    units: Object.fromEntries(Object.entries(EV.units).map(([k, U]) => [k, Object.assign({ n: U.n, src: U.src, price: U.price }, U.gate ? { gate: U.gate } : {})])),
    caps: EV.caps, sources: EV.sources.map(s => ({ id: s.id, n: s.n, go: s.go, p: s.p, what: s.what })),
    rows: { free: FREE, paid: PAID },
    cal: CAL,
  };

  /* --- законы данных: клетки --- */
  const kinds = new Set(RULES.kinds);
  for (const [row, list] of Object.entries(D.rows)) {
    if (list.length !== RULES.tiers) err.push(`ряд ${row}: ступеней ${list.length}, а надо ${RULES.tiers}`);
    list.forEach((cellX, i) => {
      if (!cellX.length) err.push(`ряд ${row}, ступень ${i + 1}: пустая клетка`);
      for (const x of cellX) {
        if (!kinds.has(x.k)) err.push(`ряд ${row}, ступень ${i + 1}: вид «${x.k}» — не из ${RULES.kinds.join(', ')}`);
        if (x.k === 'frame' && (row !== 'free' || i !== RULES.tiers - 1)) err.push(`рамка — только последняя ступень бесплатного ряда, а здесь ${row} ${i + 1}`);
        for (const v of [x.b, x.n, x.off, x.r]) if (v != null && (!Number.isInteger(v) || v < 0)) err.push(`ряд ${row}, ступень ${i + 1}: не целое ${v}`);
        if (x.k === 'chest' && !LB.windows[x.win] && x.win !== 'pure') err.push(`ряд ${row}, ступень ${i + 1}: окно ${x.win}`);
      }
    });
  }
  if (!D.rows.free[RULES.tiers - 1].some(x => x.k === 'frame' && x.id === RULES.frame)) err.push('последняя ступень бесплатного ряда не даёт рамку «пропуск»');
  if (D.rows.paid.some(c => c.some(x => x.k === 'frame'))) err.push('в платном ряду облик: облик не продаётся');
  if (CAL.list.length !== CAL.marks) err.push(`лист даров: отметок ${CAL.list.length}, а надо ${CAL.marks}`);
  for (const m of Object.keys(CAL.miles).map(Number)) if (!CAL.list[m - 1]) err.push(`лист даров: вехи ${m} нет в листе`);
  if (CAL.main !== LAWS.calMain || !CAL.miles[CAL.main] || !CAL.miles[CAL.main].main) err.push('лист даров: главный дар — не двадцатая отметка');
  CAL.list.forEach((c, i) => {
    const m = i + 1;
    if (!c.length || (c.length > 1 && !CAL.miles[m])) err.push(`лист даров, отметка ${m}: ${c.length ? 'две награды без вехи' : 'пусто'} — день даёт одну награду`);
    for (const x of c) if (!kinds.has(x.k) || x.k === 'frame') err.push(`лист даров, отметка ${m}: вид «${x.k}»`);
  });
  /* главный дар — самый ценный: чистое окно и больше всех Энериума */
  const enOf = c => c.filter(x => x.k === 'enerium').reduce((a, x) => a + x.n, 0);
  const mainCell = CAL.list[CAL.main - 1];
  if (!mainCell.some(x => x.k === 'chest' && x.win === 'pure')) err.push('главный дар без сундука чистого окна');
  if (CAL.list.some((c, i) => i !== CAL.main - 1 && enOf(c) >= enOf(mainCell))) err.push('главный дар — не самый богатый Энериумом');
  /* лист даров и календарь лутбоксов — один лист (ADR-0031, п. 20): сборщик лутбоксов собирает сундуки календаря из CAL. Разошлись —
     лутбоксы собраны до правки листа: пересобрать tools/content-gen/lootboxes/build.js */
  {
    const want = [], got = [], M = LB.modes && LB.modes.calendar;
    for (let c = 1; c <= 6; c++) {
      for (const cell of CAL.list) for (const x of cell) if (x.k === 'chest') want.push(`${c}:${Math.min(7, x.r != null ? x.r : RULES.chestBase[c] + x.off)}:${x.win || 'step'}`);
      if (M) for (const row of M.layers[0].rows) for (let i = 0; i < (row.days || 0); i++) for (const g of row.cyc[c] || []) for (let k = 0; k < g.count; k++) got.push(`${c}:${g.r}:${g.win}`);
    }
    if (want.sort().join() !== got.sort().join()) err.push('лист даров и календарь лутбоксов разошлись — пересобрать tools/content-gen/lootboxes/build.js');
  }
  if (err.length) return { err, warn };

  /* --- ёмкость дня: очки дел в средний день прогона Событий, без акцента --- */
  const cycles = [2, 3, 4, 5, 6];
  const dayEv = {}, payerBp = {};
  for (const c of cycles) {
    const E = EV.econ[c]; if (!E) { err.push(`События: нет econ цикла ${ROMAN[c]}`); continue; }
    dayEv[c] = { o: E.day.o, e: E.day.e };
    payerBp[c] = Math.floor(E.week.p * BP / E.week.o);
  }
  if (err.length) return { err, warn };

  /* --- прогон сезонов: сотые очка пропуска --- */
  const goal = PS.goal100(D), days = RULES.season.days;
  function simSeason(c, pid, s) {
    const P = SIM.prof[pid], rng = makeRng(seedOf(`${SIM.seed}|${pid}|${c}|${s}`)), mul = pid === 'p' ? payerBp[c] : P.mulBp;
    let have = 0, done = 0; const by = [];
    for (let w = 0; w < RULES.season.weeks; w++) {
      const tau = []; for (let d = 0; d < 7; d++) tau.push(SIM.tau[0] + rng(SIM.tau[1] - SIM.tau[0] + 1));
      for (let k = 0; k < P.off; k++) tau[rng(7)] = 0;
      for (let d = 0; d < 7; d++) {
        const day = w * 7 + d + 1, ev = Math.floor(Math.floor(dayEv[c][P.src] * tau[d] / 100) * mul / BP);
        have += PS.add100(D, have, Math.floor(ev * 100 / RULES.rate), day);
        by.push(have);
        if (!done && have >= goal) done = day;
      }
    }
    return { done, have, by };
  }
  const runs = {};
  for (const c of cycles) { runs[c] = {}; for (const pid of Object.keys(SIM.prof)) runs[c][pid] = Array.from({ length: SIM.seasons }, (_, s) => simSeason(c, pid, s)); }
  const median = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const quant = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q / BP))] : 0; };
  const pace = {};
  for (const c of cycles) {
    pace[c] = {};
    for (const pid of Object.keys(SIM.prof)) {
      const R = runs[c][pid], fin = R.filter(r => r.done).map(r => r.done);
      pace[c][pid] = {
        doneBp: Math.floor(fin.length * BP / R.length), by25Bp: Math.floor(R.filter(r => r.done && r.done <= LAWS.oDay).length * BP / R.length),
        med: fin.length ? median(fin) : 0, p90: fin.length === R.length ? quant(fin, 9000) : 0, min: fin.length ? Math.min(...fin) : 0,
        tier: median(R.map(r => PS.tierOf(D, r.have))), pts: median(R.map(r => Math.floor(r.have / 100))),
      };
    }
    const o = pace[c].o, e = pace[c].e, p = pace[c].p;
    if (o.by25Bp < LAWS.oDoneBp) err.push(`цикл ${ROMAN[c]}: обычный проходит бесплатный ряд к ${LAWS.oDay}-му дню в ${pct(o.by25Bp, BP)} сезонов — меньше ${pct(LAWS.oDoneBp, BP)}`);
    for (const pid of Object.keys(SIM.prof)) if (pace[c][pid].min && pace[c][pid].min < LAWS.minDay) err.push(`цикл ${ROMAN[c]}: ${SIM.prof[pid].n} прошёл ряд на ${pace[c][pid].min}-й день — раньше ${LAWS.minDay}-го`);
    if (!e.med) err.push(`цикл ${ROMAN[c]}: увлечённый не проходит ряд`);
    if (p.med && o.med && o.med * 100 > p.med * LAWS.pace17) err.push(`цикл ${ROMAN[c]}: плательщик быстрее обычного в ${dec(o.med, p.med, 2)} раза`);
  }

  /* --- ценность рядов: по видам, с ожиданием содержимого сундуков (lootboxes ev, × 100) --- */
  const evBox = (c, r, win) => { const x = LB.ev[RULES.chestBox][c]; const w = x && (x[win] || x.step); return (w && w[r - 1]) || {}; };
  function rowValue(row, c, level) {
    const v = { gold: 0, spirit: 0, dust: 0, keys: 0, enerium: 0, chests: 0, resGold: 0, frame: 0 };
    for (let t = 1; t <= RULES.tiers; t++) for (const x of PS.cell(D, row, t, { level, cycle: c })) {
      if (x.k === 'chest') { const e = evBox(c, x.r, x.win); v.chests++; v.gold += Math.floor((e.gold || 0) / 100); v.spirit += Math.floor((e.spirit || 0) / 100); v.dust += Math.floor((e.dust || 0) / 100); v.resGold += Math.floor((e.resGold || 0) / 100); }
      else if (x.k === 'frame') v.frame++;
      else v[x.k] += x.n;
    }
    return v;
  }
  const CATS = ['gold', 'spirit', 'dust', 'keys', 'resGold'];
  const x17 = {};
  for (const c of cycles) for (const level of SIM.lvl[c]) {
    const f = rowValue('free', c, level), p = rowValue('paid', c, level), k = `${c}:${level}`;
    x17[k] = { c, level, f, p, r: {} };
    for (const cat of CATS) {
      if (!f[cat] && p[cat]) { err.push(`цикл ${ROMAN[c]}, уровень ${level}: в платном ряду есть «${cat}», которого нет в бесплатном`); continue; }
      const r = f[cat] ? Math.floor((f[cat] + p[cat]) * 100 / f[cat]) : 100;
      x17[k].r[cat] = r;
      if (r > LAWS.x17) err.push(`цикл ${ROMAN[c]}, уровень ${level}: «${cat}» с платным рядом — ×${dec(r, 100, 2)}, больше ×1,7`);
      else if (r > LAWS.paidMax) err.push(`цикл ${ROMAN[c]}, уровень ${level}: «${cat}» с платным рядом — ×${dec(r, 100, 2)}, больше ×${dec(LAWS.paidMax, 100, 2)} (ADR-0030, п. 22б)`);
    }
  }
  const refund = rowValue('paid', 2, 10).enerium, freeEn = rowValue('free', 2, 10).enerium;
  if (refund * BP > RULES.price * LAWS.refundBp) err.push(`платный ряд возвращает ${fmt(refund)} Энериума — больше половины цены ${fmt(RULES.price)}`);
  if (refund >= RULES.price) err.push('платный ряд окупает себя Энериумом');

  /* --- доля в доходе обычного за сезон: золото и дух дня (capacity.json) × дни игры --- */
  const income = {};
  const playDays = RULES.season.days - RULES.season.weeks * SIM.prof.o.off;
  for (const c of cycles) {
    const C = CAP.cycles[c] && CAP.cycles[c].o; if (!C) { err.push(`capacity.json: нет цикла ${ROMAN[c]}`); continue; }
    const g = Math.floor(C.gold * playDays / 100), s = Math.floor(C.spirit * playDays / 100), mid = SIM.lvl[c][1];
    const f = rowValue('free', c, mid), p = rowValue('paid', c, mid);
    income[c] = { g, s, mid, f, p, gBp: Math.floor(f.gold * BP / g), sBp: Math.floor(f.spirit * BP / s), keysWeek: CT.econ[c] ? CT.econ[c].o.keys : 0 };
    if (income[c].gBp > LAWS.incomeBp || income[c].sBp > LAWS.incomeBp) err.push(`цикл ${ROMAN[c]}: бесплатный ряд — ${pct(income[c].gBp, BP, 1)} золота и ${pct(income[c].sBp, BP, 1)} духа обычного за сезон, больше ${pct(LAWS.incomeBp, BP)}`);
  }

  /* --- Энериум: бесплатный ряд и лист даров за 4 недели против контрактов обычного --- */
  const calEn = CAL.list.reduce((a, c) => a + enOf(c), 0);
  const calEn28 = Math.floor(calEn * RULES.season.days / CAL.marks);
  const ctEn28 = CT.econ[2].o.en * RULES.season.weeks;
  if ((freeEn + calEn28) * BP > ctEn28 * LAWS.enBp) err.push(`Энериум бесплатного ряда и листа даров за 4 недели — ${freeEn + calEn28}, больше контрактов обычного — ${ctEn28}`);
  const en = { price: RULES.price, refund, freeEn, calEn, calEn28, ctEn28, ctEn28e: CT.econ[2].e.en * RULES.season.weeks, payerNet: freeEn + refund - RULES.price, donat: RS.rules.stub.donatPrice };

  /* --- лист даров: ценность по циклам на уровне середины цикла --- */
  function calValue(c, level) {
    const v = { gold: 0, spirit: 0, dust: 0, keys: 0, enerium: 0, chests: 0, wild: 0 };
    for (let m = 1; m <= CAL.marks; m++) for (const x of PS.mark(D, m, { level, cycle: c })) {
      if (x.k === 'chest') { v.chests++; if (x.win === 'wild') v.wild++; } else v[x.k] += x.n;
    }
    return v;
  }
  const cal = {};
  const calPlay = CAL.marks - Math.floor(CAL.marks * SIM.prof.o.off / 7);   // дней игры обычного за 30 дней
  for (let c = 1; c <= 6; c++) {
    cal[c] = { level: SIM.lvl[c][0] + Math.floor((SIM.lvl[c][1] - SIM.lvl[c][0]) / 2), v: null, gBp: 0, sBp: 0 };
    cal[c].v = calValue(c, cal[c].level);
    const C = CAP.cycles[c] && CAP.cycles[c].o;
    if (!C) continue;   // цикл I — обучение на часы, дневного дохода в калькуляторах нет
    cal[c].gBp = Math.floor(cal[c].v.gold * BP * 100 / (C.gold * calPlay));
    cal[c].sBp = Math.floor(cal[c].v.spirit * BP * 100 / (C.spirit * calPlay));
    if (cal[c].gBp > LAWS.incomeBp || cal[c].sBp > LAWS.incomeBp) err.push(`цикл ${ROMAN[c]}: лист даров — ${pct(cal[c].gBp, BP, 1)} золота и ${pct(cal[c].sBp, BP, 1)} духа обычного за 30 дней, больше ${pct(LAWS.incomeBp, BP)}`);
  }

  /* --- демо-аккаунт: медиана обычного цикла II к дню демо --- */
  const demoPts = Math.floor(median(runs[2].o.map(r => r.by[DEMO.day - 1])) / 100);
  const demoTier = PS.tierOf(D, demoPts * 100), demoClaimed = Math.max(0, demoTier - DEMO.waiting);
  if (demoTier <= DEMO.waiting) err.push(`демо: ступень ${demoTier} — нечего ждать`);
  if (demoPts * 100 > PS.capTo(D, DEMO.day)) err.push('демо: очков больше потолка дня');
  const demo = { day: DEMO.day, pts: demoPts, claimed: demoClaimed, paid: 0, cal: DEMO.cal };

  /* --- арт: задания, выбранные картинки, траты, выгружено ли --- */
  const JOBS = JSON.parse(fs.readFileSync(FILES.jobs, 'utf8'));
  const MAN = JSON.parse(fs.readFileSync(FILES.manifest, 'utf8'));
  const items = Array.isArray(MAN) ? MAN : (MAN.items || []);
  const art = { rows: [], cost: 0, n: 0 };
  for (const A of ART) {
    const job = JOBS.jobs.find(j => j.id === A.job);
    if (!job) { err.push(`арт: нет задания ${A.job} в tools/art-gen/jobs/pass.json`); continue; }
    const got = items.filter(x => x.job === A.job && x.category === job.category);
    for (const x of got) { art.cost += x.cost_usd || 0; art.n++; }
    const pick = got.length ? got[got.length - 1] : null;
    const file = pick ? pick.file.replace(/^art\/generated\//, '') : '';
    if (pick && !fs.existsSync(path.join(ROOT, pick.file))) err.push(`арт: в манифесте ${pick.file}, а файла нет`);
    const out = fs.existsSync(path.join(FILES.assets, ...A.to.split('/')));
    art.rows.push(Object.assign({}, A, { title: job.title, from: file, tries: got.length, out }));
  }
  art.cost = Math.round(art.cost * 10000) / 10000;
  const artData = {
    ready: art.rows.filter(r => r.out).map(r => r.to),
    banner: 'pass/banner.jpg', crown: 'pass/crown.jpg', dust: 'dust.png', worker: 'workers/worker.png',
  };

  /* --- данные прототипа --- */
  const data = Object.assign({
    meta: { builder: 'tools/content-gen/pass/build.js', rules: 'tools/content-gen/pass/rules.js', eventSha: sha(FILES.event), lootSha: sha(FILES.loot),
      sources: ['GDD §32', 'GDD §29', 'GDD §16', 'GDD §1.2', 'GDD §9.3', 'ADR-0030', 'design/ui/event.js', 'design/ui/lootboxes.js', 'design/ui/contracts.js'] },
  }, D, {
    art: artData,
    demo,
    econ: {
      pace: Object.fromEntries(cycles.map(c => [c, pace[c]])),
      x17: Object.fromEntries(cycles.map(c => [c, Object.fromEntries(SIM.lvl[c].map(l => [l, x17[`${c}:${l}`].r]))])),
      income: Object.fromEntries(cycles.map(c => [c, { gBp: income[c].gBp, sBp: income[c].sBp, level: income[c].mid }])),
      en: { price: en.price, refund: en.refund, free: en.freeEn, cal: en.calEn, cal28: en.calEn28, contracts28: en.ctEn28, payerNet: en.payerNet },
      lvl: SIM.lvl,
    },
  });
  const walk = (x, where) => { if (typeof x === 'number' && !Number.isInteger(x)) err.push(`данные: не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, where + '.' + k); };
  walk(Object.assign({}, data, { meta: null }), 'EN_PASS');

  /* ================================ ТАБЛИЦЫ ================================ */
  const TBL = {};
  const head = cols => ['| ' + cols.join(' | ') + ' |', '| ' + cols.map(() => '---').join(' | ') + ' |'];
  const cells = xs => '| ' + xs.join(' | ') + ' |';
  const RN = LB.boxRarity, WN = { step: '', wild: ' · шальное', pure: ' · чистое' };
  const NAME = { gold: 'Золото', spirit: 'Дух', dust: 'Прах душ', keys: 'Рунные ключи', enerium: 'Энериум' };
  const rawTxt = x => x.k === 'chest' ? (x.r ? `сундук странника · ${RN[x.r - 1]}${WN[x.win] || ''}` : `сундук странника · цикл${x.off ? ' + ' + x.off : ''}${WN[x.win] || ''}`)
    : x.k === 'frame' ? 'рамка «Осенний путь»' : x.b != null ? `${NAME[x.k]} · база ${fmt(x.b)}${x.from ? ` (до цикла ${ROMAN[x.from]} — ${NAME[x.alt.k].toLowerCase()} · база ${fmt(x.alt.b)})` : ''}` : `${NAME[x.k]} ×${fmt(x.n)}`;
  const outTxt = x => x.k === 'chest' ? `сундук ${RN[x.r - 1]}${WN[x.win] || ''}` : x.k === 'frame' ? 'рамка' : `${NAME[x.k].toLowerCase()} ${fmt(x.n)}`;
  const LV = SIM.lvl[2][1];   // пример: цикл II, верх уровней цикла
  let T;

  // сезон
  T = head(['Что', 'Значение']);
  T.push(cells(['Сезон', `«${RULES.season.n}», ${RULES.season.days} дней — ${RULES.season.weeks} недели, начало и конец — в час недельного подсчёта`]));
  T.push(cells(['Открывается', `с ${RULES.open.level}-го уровня Странника — вместе с «Неделей»; дела считаются с цикла ${ROMAN[RULES.open.cycle]}`]));
  T.push(cells(['Ступеней', `${RULES.tiers}, по ${RULES.tierPts} очков — всего ${fmt(RULES.tiers * RULES.tierPts)}`]));
  T.push(cells(['Очки', `дела по таблице цен Событий без акцента недели; ${RULES.rate} очков дел — 1 очко пропуска; дневные потолки единиц — как у Событий`]));
  T.push(cells(['Потолок сезона', `копится: к дню d — не больше d × ${RULES.dayCap}; пройти ряд быстрее ${Math.ceil(RULES.tiers * RULES.tierPts / RULES.dayCap)} дней нельзя`]));
  T.push(cells(['Платный ряд', `${fmt(RULES.price)} Энериума за сезон; возвращает ${fmt(refund)} Энериума по пути; купить можно в любой день — награды взятых ступеней сразу ждут «Забрать»`]));
  T.push(cells(['Рост наград', `валюта — × (1 + уровень × ${dec(RULES.level.perLevelBp, BP, 1)}) по §16; сундук — редкость по циклу; ключи и Энериум — без роста`]));
  TBL.season = T.join('\n');

  // ряды
  T = head(['Ступень', 'Очков', 'Бесплатный ряд', `Цикл II, уровень ${LV}`, 'Платный ряд', `Цикл II, уровень ${LV}`]);
  for (let t = 1; t <= RULES.tiers; t++) {
    const o = { level: LV, cycle: 2 };
    T.push(cells([String(t) + (t % 10 === 0 ? ' ★' : ''), fmt(t * RULES.tierPts), FREE[t - 1].map(rawTxt).join(' + '), PS.cell(D, 'free', t, o).map(outTxt).join(' + '),
      PAID[t - 1].map(rawTxt).join(' + '), PS.cell(D, 'paid', t, o).map(outTxt).join(' + ')]));
  }
  TBL.rows = T.join('\n');

  // прогон
  T = head(['Цикл', 'Профиль', 'Очков в средний день игры', 'Проходит ряд, доля сезонов', 'День: медиана / 90 % / раньше всех', 'Ступень к концу сезона, медиана']);
  for (const c of cycles) for (const pid of Object.keys(SIM.prof)) {
    const P = pace[c][pid], mul = pid === 'p' ? payerBp[c] : SIM.prof[pid].mulBp, day = Math.floor(Math.floor(dayEv[c][SIM.prof[pid].src] * mul / BP) / RULES.rate);
    T.push(cells([pid === 'o' ? ROMAN[c] : '', SIM.prof[pid].n + (pid === 'p' ? ` · ×${dec(payerBp[c], BP, 2)}` : ''), fmt(day), pct(P.doneBp, BP), P.med ? `${P.med} / ${P.p90 || '—'} / ${P.min}` : '—', `${P.tier} из ${RULES.tiers}`]));
  }
  TBL.pace = T.join('\n');

  // ×1,7
  T = head(['Цикл', 'Уровень', 'Золото', 'Дух', 'Прах', 'Ключи', 'Ресурсы сундуков', 'Сундуков: бесплатный / платный', 'Не больше ×1,7']);
  for (const c of cycles) for (const level of SIM.lvl[c]) {
    const X = x17[`${c}:${level}`], r = X.r, ok = CATS.every(k => (r[k] || 0) <= LAWS.x17);
    T.push(cells([level === SIM.lvl[c][0] ? ROMAN[c] : '', String(level), ...CATS.map(k => `×${dec(r[k] || 100, 100, 2)}`), `${X.f.chests} / ${X.p.chests}`, ok ? 'да' : 'нет']));
  }
  TBL.x17 = T.join('\n');

  // доход
  T = head(['Цикл', 'Уровень', 'Золото ряда / сезона обычного', 'Доля', 'Дух ряда / сезона', 'Доля', 'Ключи ряда / ключи обычного за неделю', 'Прах ряда', 'Не больше 5 %']);
  for (const c of cycles) {
    const I = income[c];
    T.push(cells([ROMAN[c], String(I.mid), `${fmt(I.f.gold)} / ${fmt(I.g)}`, pct(I.gBp, BP, 1), `${fmt(I.f.spirit)} / ${fmt(I.s)}`, pct(I.sBp, BP, 1), `${fmt(I.f.keys)} / ${fmt(Math.floor(I.keysWeek))}`, fmt(I.f.dust), I.gBp <= LAWS.incomeBp && I.sBp <= LAWS.incomeBp ? 'да' : 'нет']));
  }
  TBL.income = T.join('\n');

  // Энериум
  T = head(['Что', 'Энериум']);
  T.push(cells(['Цена платного ряда за сезон', fmt(en.price)]));
  T.push(cells(['Возврат по пути в платном ряду', `${fmt(en.refund)} — ${pct(en.refund, en.price)} цены`]));
  T.push(cells(['Итог плательщика за сезон, с бесплатным рядом', (en.payerNet < 0 ? '−' : '') + fmt(Math.abs(en.payerNet))]));
  T.push(cells(['Бесплатный ряд за сезон', fmt(en.freeEn)]));
  T.push(cells(['Лист даров: за 30 отметок / за 28 дней', `${fmt(en.calEn)} / ${fmt(en.calEn28)}`]));
  T.push(cells(['Контракты обычного / увлечённого за 4 недели, цикл II', `${fmt(en.ctEn28)} / ${fmt(en.ctEn28e)}`]));
  T.push(cells(['Бесплатный ряд и лист даров за 4 недели — не больше контрактов обычного', `${fmt(en.freeEn + en.calEn28)} из ${fmt(en.ctEn28)} — ${(en.freeEn + en.calEn28) <= en.ctEn28 ? 'да' : 'нет'}`]));
  T.push(cells(['Донатные герои цикла — для сравнения', en.donat.map(fmt).join(' / ')]));
  TBL.energium = T.join('\n');

  // лист даров
  T = head(['Отметка', 'Награда', 'Цикл I, уровень 5', 'Цикл II, уровень 24', 'Цикл VI, уровень 85']);
  for (let m = 1; m <= CAL.marks; m++) {
    const M = CAL.miles[m], at = (c, level) => PS.mark(D, m, { level, cycle: c }).map(outTxt).join(' + ');
    T.push(cells([M ? `**${m} · ${M.n}**` : String(m), CAL.list[m - 1].map(rawTxt).join(' + '), at(1, 5), at(2, 24), at(6, 85)]));
  }
  TBL.cal = T.join('\n');

  T = head(['Цикл', 'Уровень', 'Золото', 'Дух', 'Прах', 'Ключи', 'Энериум', 'Сундуков, из них шальных', 'Доля золота и духа обычного за 30 дней']);
  for (let c = 1; c <= 6; c++) {
    const v = cal[c].v;
    T.push(cells([ROMAN[c], String(cal[c].level), fmt(v.gold), fmt(v.spirit), fmt(v.dust), fmt(v.keys), fmt(v.enerium), `${v.chests}, ${v.wild}`, c === 1 ? '— · обучение на часы' : `${pct(cal[c].gBp, BP, 1)} / ${pct(cal[c].sBp, BP, 1)}`]));
  }
  TBL.calval = T.join('\n');

  // демо
  T = head(['Что', 'Демо-аккаунт']);
  T.push(cells(['День сезона', `${demo.day}-й из ${RULES.season.days}`]));
  T.push(cells(['Очки', `${fmt(demo.pts)} — медиана обычного цикла II к этому дню`]));
  T.push(cells(['Ступени', `взято ${demoTier}, забрано ${demoClaimed}, ждут «Забрать» — ${demoTier - demoClaimed}`]));
  T.push(cells(['Платный ряд', 'не открыт']));
  const markW = n => { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? 'отметок' : b === 1 ? 'отметка' : b >= 2 && b <= 4 ? 'отметки' : 'отметок'; };
  T.push(cells(['Лист даров', `взято ${DEMO.cal.got} ${markW(DEMO.cal.got)}, ${DEMO.cal.got + 1}-я ждёт`]));
  TBL.demo = T.join('\n');

  // арт
  T = head(['Картинка', 'Файл в art/generated/', 'Выгрузка в design/ui/assets/art/', 'Размер', 'Где', 'Выгружено']);
  for (const r of art.rows) T.push(cells([r.title, r.from ? '`' + r.from + '`' : '—', '`' + r.to + '`', `${r.size[0]}×${r.size[1]}${r.fit ? `, fit ${r.fit}` : ''}`, r.use, r.out ? 'да' : 'нет — заглушка CSS']));
  T.push(cells(['Всего', `${art.n} генераций`, '', '', `$${String(art.cost.toFixed(3)).replace('.', ',')}`, '']));
  TBL.art = T.join('\n');

  return { data, tables: TBL, err, warn, pace, x17, income, en, cal, demo, art };
}

/* ================================ ВЫВОД ================================ */

function render(data) {
  const rules = fs.readFileSync(FILES.rules, 'utf8').replace(/\r\n/g, '\n');
  const head = `/* Боевой пропуск и лист даров — данные прототипа «Свет снизу». Собирает tools/content-gen/pass/build.js из таблицы дел Событий
   (event.js), сундуков (lootboxes.js), Энериума контрактов (contracts.js) и ёмкости дня (capacity.json). Руками не править: пересборка
   затрёт правку. Черновик · предложение · ждёт автора. Числа — демонстрация, только целые; доли — в базисных пунктах (10 000 = 100 %).
   season — сезон, tiers и tierPts — ступени, dayCap — потолок, копится по дням; rate — очков дел на очко пропуска; units и caps — таблица
   дел и дневные потолки Событий как есть; rows.free и rows.paid — клетки двух рядов; price — цена платного ряда; cal — лист даров;
   art — пути картинок и выгруженные (ready); demo — демо-аккаунт; econ — итоги прогона. Обоснование — docs/content/пропуск-и-награды.md.
   В игре очки, ступени и выдачу решает сервер (§32, §36.16). Ниже данных — алгоритм tools/content-gen/pass/rules.js как есть. */\n`;
  return head + 'window.EN_PASS = ' + JSON.stringify(data) + ';\n' + rules;
}
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/pass/build.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) return null;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { build, render, withTables, markA, markB, FILES, RULES, FREE, PAID, CAL, SIM, LAWS, DEMO, ART };

if (require.main === module) {
  const R = build();
  for (const w of R.warn) console.log('предупреждение: ' + w);
  if (process.argv.includes('--print')) {
    if (R.err.length) console.log('ОШИБКИ:\n' + R.err.join('\n'));
    for (const [k, t] of Object.entries(R.tables || {})) console.log(`\n### ${k}\n\n${t}`);
    process.exit(R.err.length ? 1 : 0);
  }
  if (R.err.length) { console.log('ОШИБКИ:\n' + R.err.join('\n')); process.exit(1); }
  const js = render(R.data);
  const docOld = fs.existsSync(FILES.doc) ? fs.readFileSync(FILES.doc, 'utf8') : null;
  const docNew = docOld ? withTables(docOld, R.tables) : null;
  if (process.argv.includes('--check')) {
    const okJs = fs.existsSync(FILES.out) && fs.readFileSync(FILES.out, 'utf8') === js, okDoc = !!docOld && docNew === docOld;
    console.log(okJs && okDoc ? 'Свежие: pass.js и таблицы документа совпадают со сборкой.' : `Устарели: ${[!okJs && 'design/ui/pass.js', !okDoc && 'docs/content/пропуск-и-награды.md'].filter(Boolean).join(', ')} — пересобрать.`);
    process.exit(okJs && okDoc ? 0 : 1);
  }
  fs.writeFileSync(FILES.out, js);
  if (docNew) fs.writeFileSync(FILES.doc, docNew);
  else console.log(`предупреждение: в ${path.relative(ROOT, FILES.doc)} нет меток таблиц — таблицы не вставлены`);
  const P = R.pace[2];
  console.log(`Собрано: ${RULES.tiers} ступеней × ${RULES.tierPts} очков, потолок ${RULES.dayCap} в день; обычный цикла II проходит ряд на ${P.o.med}-й день, увлечённый — на ${P.e.med}-й, занятый к концу сезона — ступень ${P.z.tier}. Арт: ${R.art.n} генераций, $${R.art.cost}.`);
}
