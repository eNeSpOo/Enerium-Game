/* Лутбоксы — сундуки всех режимов: GDD §23, §14.4, §15, §17–§21, §25–§27, §29; ADR-0023, п. 4, 7, 8 и «Второй круг»; ADR-0024.
   Черновик · предложение · ждёт автора. Все числа — демонстрация. Шансы — в базисных пунктах: 10 000 = 100 %.
   Только целые числа: ожидаемые значения считаются точными дробями на BigInt, в вывод идут целые — сотые доли.

   Данные сундуков — в начале файла, раздел «ДАННЫЕ». Ниже — только сборка, проверки и вывод:
   - design/ui/lootboxes.js — данные и алгоритм открытия для UI-кита, руками не править;
   - tables.md — таблицы для документа;
   - docs/content/лутбоксы.md — текст doc.md, таблицы вместо @@имя@@, числа вместо {{имя}}.
   Только читает и ничего в них не меняет:
   - design/ui/recipes.js — ресурсы, пулы по циклам, цены рынка, крафтовые боссы и редкость их сундуков;
   - docs/content/герои/состав-героев.csv — герои Эхо по неделям и циклам;
   - source-data/Enerium_Талисманы_Финал.xlsx — талисманы и их веса;
   - design/ui/talismans.js — имена, описания и виды талисманов после переработки, линейки «для команды» (собирает
     tools/content-gen/talismans/build.js — его пересобрать первым);
   - docs/lore/дайджест.md — раздел «Нельзя показывать раннему игроку», чтобы найти спойлеры в именах талисманов;
   - design/ui/battle.js — только чтобы сверить генератор.
   Любая ошибка — файлы не пишутся. Пересборка даёт те же байты: нет времени, случайности без сида и зависимости от порядка обхода.
   Запуск: cd tools/content-gen/lootboxes && node build.js */
'use strict';

/* ================================ ДАННЫЕ ================================ */

/* Семь редкостей — сквозная шкала игры (§3.1). Ценность ступени удваивается, как прах за осколок в демо-таблице §15.3:
   этой мерой — «очками редкости» — сравниваются талисманы, шарды рабочих и снаряжение. */
const RARITY = ['обычная', 'редкая', 'уникальная', 'эпическая', 'древняя', 'первородная', 'вневременная'];
const BOX_RARITY = ['обычный', 'редкий', 'уникальный', 'эпический', 'древний', 'первородный', 'вневременный'];
const RVALUE = [1, 2, 4, 8, 16, 32, 64];
const WEEKS = ['Люди', 'Дворфы', 'Эльфы', 'Звери', 'Саганы', 'Аппараты', 'Искажённые', 'Нежить', 'Забытые'];   // круг недель, §1.1

/* Окна редкостей содержимого — свойство конкретного сундука (ADR-0023, п. 7). Доли — в б. п., сумма каждой строки — 10 000.
   step — «лестница»: сундук редкости N даёт N−2…N — правило 5 таблицы талисманов автора; верхняя ступень реже.
   wild — «шальное»: от обычной до вневременной, «безумный рандом» автора; кривая — его стартовое предложение для Памяти (§2.6).
   pure — «чистое»: только своя редкость, мусора нет, как в примере автора «только вневременные». Чисел не требует. */
const WINDOWS = {
  step: [
    [[1, 10000]],
    [[1, 6000], [2, 4000]],
    [[1, 5000], [2, 3000], [3, 2000]],
    [[2, 5000], [3, 3000], [4, 2000]],
    [[3, 5000], [4, 3000], [5, 2000]],
    [[4, 5000], [5, 3000], [6, 2000]],
    [[5, 5000], [6, 3000], [7, 2000]],
  ],
  wild: [[1, 4500], [2, 2000], [3, 1500], [4, 1000], [5, 600], [6, 300], [7, 100]],
};
const WIN_NAMES = { step: 'лестница', wild: 'шальное', pure: 'чистое' };

/* Валюты сундуков (§9.3, §14.4). Душ и Энериума в сундуках нет — это проверяет сборщик, раздел «чего сундук не даёт». */
const CURRENCY = { gold: 'Золото', spirit: 'Дух', keys: 'Рунные ключи', dust: 'Прах душ' };

/* Прах — демо-таблица §15.3: прах за один осколок и цена одного осколка в цикле I, по редкости героя; оба × цикл героя. */
const DUST = { perShard: [1, 2, 4, 8, 16, 32, 64], price: [5, 10, 20, 40, 80, 160, 320] };

/* Линии пула — что может выпасть на каждой редкости предмета (ADR-0023, п. 7: пул бывает смешанным).
   Редкость записи — ступень ценности: у талисманов, рабочих и снаряжения это их редкость; у осколков, ключей и праха — размер связки;
   у ресурсов — ярус: базовые, ключи ремёсел, уникальные боссов. from — с какого цикла линия есть в сундуках. */
const LINES = {
  shards: { n: 'Осколки героя недели', kind: 'shards', pack: [6, 12, 16, 24, 36, 54, 80] },    // связка осколков одного героя; герой — поровну из отряда недели, открытого к циклу
  workers: { n: 'Шарды рабочего', kind: 'workers', qty: [3, 3, 3, 3, 3, 3, 3] },               // рабочий этой редкости (§19.1)
  tal: { n: 'Духовный талисман', kind: 'tal' },                                                 // какой — по весу таблицы автора внутри редкости (правило 5)
  equip: { n: 'Предмет снаряжения', kind: 'equip' },   // §21, снаряжение.md: сундук разыгрывает редкость, предмет создаёт EnEquip на сиде сундука и номере записи, слот — из девяти
  keys: { n: 'Рунные ключи', kind: 'cur', cur: 'keys', qty: [2, 3, 4, 6, 8, 10, 12] },          // редкость сундука растёт с циклом — ключей больше вместе с ценой входа к стражу
  dust: { n: 'Прах душ', kind: 'cur', cur: 'dust', qty: [5, 10, 20, 40, 80, 160, 320], perCycle: true, from: 2 },  // × цикл: ровно цена одного осколка героя этой редкости (§15.3)
  res: { n: 'Ресурсы', kind: 'res', by: [['basic', 3], ['basic', 6], ['key', 1], ['key', 2], ['key', 3], ['unique', 1], ['unique', 2]] },  // один ресурс × штук; ключи и уникальные — своего цикла
  many: { n: 'Многоликий', kind: 'item', by: [null, null, null, ['many', 1], null, null, null], from: 2 },   // призыв: активируется как биом недели или идёт в крафт (§17.4)
};

/* Сундуки по содержимому. lines — [линия, вес, с какого цикла]; вес делится между линиями, у которых на выпавшей редкости есть записи.
   items — предметов по редкости сундука (§23: от 1 до 10). cur — гарантированная валюта по редкости сундука.
   Цикл в валюту не множится отдельно: база редкости сундука растёт на ступень за цикл, с ней — и валюта (ADR-0014: всё растёт с циклом).
   main — чем мерить сундук в проверках: осколки, ключи, очки редкости или прах. */
const BOXES = {
  shards: { n: 'Сундук осколков', lines: [['shards', 85], ['res', 15]], items: [2, 2, 3, 3, 3, 3, 3],
    cur: { spirit: [2000, 3000, 4000, 5000, 6000, 7000, 8000] }, main: 'shards' },
  keys: { n: 'Сундук ключей', lines: [['keys', 70], ['res', 30]], items: [2, 2, 3, 3, 3, 3, 3],
    cur: { gold: [1000, 1500, 2000, 2500, 3000, 3500, 4000] }, main: 'keys' },
  equip: { n: 'Сундук снаряжения', lines: [['equip', 80], ['res', 20]], items: [2, 2, 3, 3, 3, 3, 3],
    cur: { gold: [1000, 1500, 2000, 2500, 3000, 3500, 4000] }, main: 'equipV' },
  talisman: { n: 'Сундук талисманов', lines: [['tal', 80], ['res', 20]], items: [2, 2, 3, 3, 3, 3, 3],
    cur: { spirit: [2000, 3000, 4000, 5000, 6000, 7000, 8000] }, main: 'talV' },
  workers: { n: 'Сундук рабочих', lines: [['workers', 75], ['res', 25]], items: [2, 2, 3, 3, 3, 3, 3],
    cur: { gold: [1000, 1500, 2000, 2500, 3000, 3500, 4000] }, main: 'wshV' },
  craft: { n: 'Сундук крафтового босса', lines: [['workers', 60], ['tal', 40, 4]], items: [2, 2, 3, 3, 3, 3, 3],
    cur: { gold: [1000, 1500, 2000, 2500, 3000, 3500, 4000] }, main: 'craftV' },
  wander: { n: 'Сундук странника', lines: [['res', 55], ['dust', 45]], items: [1, 1, 2, 2, 2, 3, 3],
    cur: { gold: [1000, 1500, 2000, 2500, 3000, 3500, 4000], spirit: [2000, 3000, 4000, 5000, 6000, 7000, 8000] }, main: 'dust' },
};

/* Выплаты по режимам. Редкость сундука = база цикла получателя + сдвиг; get — [сдвиг, штук, окно], окно по умолчанию — лестница.
   Сундук получает цикл игрока в момент выплаты, у Эхо — ещё и неделю; содержимое — пул этого цикла.
   Планки: x — во сколько раз больше очков, чем на первой планке; соседние — не ближе ×2 (правило ×1,7). Платят при достижении.
   Места: top — не ниже этого места, 0 — любой участник с очками; игрок получает одну строку — лучшую. Платят по итогу недели.
   clan — штук на каждого участника в общий пул клана: половину делит сервер по вкладу, половину — глава (§24.4).
   typical — где неделю заканчивают обычный и увлечённый игрок: номер планки или место. Допущение до баланса очков режимов;
   у контрактов — итог прогона сборщика контрактов (design/ui/contracts.js, econ и planks): сборка сверяет его во всех циклах. */
const MODES = {
  echo: { n: 'Эхо', box: 'shards', from: 2, base: [0, 1, 2, 3, 4, 5], weekly: true, basis: 'очки Эхо недели (§17.6)',
    layers: [
      { id: 'me', n: 'Личные планки', one: 'Личная планка', kind: 'plank', rows: [{ x: 1, get: [[0, 2]] }, { x: 2, get: [[0, 1]] }, { x: 4, get: [[0, 1]] }, { x: 8, get: [[1, 1]] }, { x: 16, get: [[1, 1]] }] },
      { id: 'top', n: 'Личные места', one: 'Личное место', kind: 'place', rows: [{ top: 1, get: [[2, 1, 'pure']] }, { top: 10, get: [[2, 1]] }, { top: 100, get: [[1, 1]] }, { top: 1000, get: [[0, 1]] }] },
      { id: 'clan', n: 'Клановые планки', one: 'Клановая планка', kind: 'plank', clan: true, rows: [{ x: 1, get: [[0, 2]] }, { x: 2, get: [[0, 1]] }, { x: 4, get: [[0, 1]] }] },
    ],
    typical: { free: { me: 3, clan: 1 }, fan: { me: 5, clan: 2 } }, midPlace: 100 },
  contract: { n: 'Контракты', box: 'keys', from: 2, base: [0, 1, 2, 3, 4, 5], weekly: true, basis: 'личные очки выполненных контрактов за неделю (§18.1)',
    layers: [
      { id: 'me', n: 'Личные планки', one: 'Личная планка', kind: 'plank', rows: [{ x: 1, get: [[0, 2]] }, { x: 2, get: [[0, 1]] }, { x: 4, get: [[0, 1]] }, { x: 8, get: [[1, 1]] }, { x: 16, get: [[1, 1]] }] },
      { id: 'top', n: 'Личные места', one: 'Личное место', kind: 'place', rows: [{ top: 1, get: [[2, 1, 'pure']] }, { top: 10, get: [[2, 1]] }, { top: 100, get: [[1, 1]] }, { top: 1000, get: [[0, 1]] }] },
    ],
    typical: { free: { me: 4 }, fan: { me: 5 } } },   // прогон контрактов: обычный — 4-я планка, увлечённый — 5-я (docs/content/контракты.md)
  arena: { n: 'Арена', box: 'equip', from: 2, base: [0, 1, 2, 3, 4, 5], weekly: true, basis: 'победы сезона — планки, рейтинг — места (§20)',
    layers: [
      { id: 'me', n: 'Планки побед', one: 'Планка побед', kind: 'plank', rows: [{ x: 1, get: [[0, 2]] }, { x: 2, get: [[0, 1]] }, { x: 4, get: [[0, 1]] }, { x: 8, get: [[1, 1]] }] },
      { id: 'top', n: 'Места по рейтингу', one: 'Место по рейтингу', kind: 'place', rows: [{ top: 1, get: [[2, 1, 'pure']] }, { top: 10, get: [[2, 1]] }, { top: 100, get: [[1, 1]] }, { top: 1000, get: [[0, 1]] }] },
    ],
    typical: { free: { me: 3 }, fan: { me: 4 } } },
  /* Лига: планки побед — ×1, ×3, ×6, ×13 порога первой (arena/rules.js, league.plank): соседние не ближе ×2, а последнюю увлечённый берёт
     в части недель (ADR-0031, п. 12). Было ×1, ×2, ×4, ×8 при пороге 5: 40 побед при 23 у увлечённого — никогда */
  league: { n: 'Лига', box: 'equip', from: 2, base: [0, 2, 3, 4, 5, 6], weekly: true, basis: 'победы в матчах — планки, рейтинг — места (§20.4)',
    layers: [
      { id: 'me', n: 'Планки побед', one: 'Планка побед', kind: 'plank', rows: [{ x: 1, get: [[0, 2]] }, { x: 3, get: [[0, 1]] }, { x: 6, get: [[0, 1]] }, { x: 13, get: [[1, 1]] }] },
      { id: 'top', n: 'Места по рейтингу', one: 'Место по рейтингу', kind: 'place', rows: [{ top: 1, get: [[1, 1, 'pure']] }, { top: 10, get: [[1, 1]] }, { top: 100, get: [[0, 1]] }] },
    ],
    typical: { free: { me: 2 }, fan: { me: 3 } } },
  clan: { n: 'Клановый босс', box: 'talisman', from: 2, base: [0, 1, 2, 3, 4, 5], weekly: true, basis: 'место клана и личные очки (§25.3): планок нет',
    layers: [
      { id: 'clanTop', n: 'Места кланов', one: 'Место клана', kind: 'place', clan: true, rows: [{ top: 1, get: [[2, 2]] }, { top: 10, get: [[1, 1], [2, 1]] }, { top: 100, get: [[1, 2]] }, { top: 1000, get: [[0, 1], [1, 1]] }, { top: 0, get: [[0, 2]] }] },
      { id: 'top', n: 'Личные места', one: 'Личное место', kind: 'place', rows: [{ top: 1, get: [[2, 1, 'pure']] }, { top: 10, get: [[2, 1]] }, { top: 100, get: [[1, 1]] }] },
    ],
    typical: { free: { clanTop: 0 }, fan: { clanTop: 1000 } } },
  event: { n: 'Событие', box: 'workers', from: 2, base: [0, 1, 2, 3, 4, 5], weekly: true, basis: 'очки События за неделю (§27)',
    layers: [
      { id: 'me', n: 'Личные планки', one: 'Личная планка', kind: 'plank', rows: [{ x: 1, get: [[0, 2]] }, { x: 2, get: [[0, 1]] }, { x: 4, get: [[0, 1]] }, { x: 8, get: [[1, 1]] }, { x: 16, get: [[1, 1]] }] },
      /* клановые планки События (ADR-0031, п. 12): вторая — ×4 первой, третья — ×1,5 второй, чтобы её брал и клан увлечённых в части недель;
         пороги считает сборщик События (event/build.js, clanX) — шаги x у него те же. minStepBp — исключение из закона «не ближе ×2» */
      { id: 'clan', n: 'Клановые планки', one: 'Клановая планка', kind: 'plank', clan: true, minStepBp: 15000, rows: [{ x: 1, get: [[0, 2]] }, { x: 4, get: [[0, 1]] }, { x: 6, get: [[0, 1]] }] },
      { id: 'top', n: 'Места игроков, межсерверные', one: 'Место игрока, межсерверное', kind: 'place', rows: [{ top: 1, get: [[2, 1, 'pure']] }, { top: 10, get: [[2, 1]] }, { top: 100, get: [[1, 1]] }] },
      { id: 'clanTop', n: 'Места кланов, межсерверные', one: 'Место клана, межсерверное', kind: 'place', clan: true, rows: [{ top: 1, get: [[2, 1]] }, { top: 10, get: [[1, 1]] }, { top: 100, get: [[0, 1]] }] },
    ],
    typical: { free: { me: 3, clan: 1 }, fan: { me: 5, clan: 2 } } },
  craft: { n: 'Крафтовые боссы', box: 'craft', from: 1, perKill: true, basis: 'победа над крафтовым боссом в Эхо (§12.3, ADR-0023, п. 4)' },
  first: { n: 'Первая победа над боссом биома', box: 'wander', from: 1, once: true, proposal: true, base: [1, 2, 3, 4, 5, 6], biomeOff: [0, 1],
    basis: 'первое убийство босса биома — раз на аккаунт' },
  feats: { n: 'Достижения', box: 'wander', from: 1, once: true, proposal: true, clamp: true, base: [1, 2, 3, 4, 5, 6], basis: 'получение достижения (§29) — цикл игрока в этот момент',
    rows: [{ n: 'Персональные', count: 50, get: [[0, 1]] }, { n: 'Возрождённые', count: 22, get: [[1, 1]] }, { n: 'Таинственные', count: 22, get: [[1, 1, 'pure']] },
      { n: 'Первенство сервера', count: 0, get: [[2, 1, 'pure']] }] },
  /* календарь — лист «Дар дня» (§29; ADR-0030, п. 22в; ADR-0031, п. 20): 30 отметок за вход в игру, сундуки — на шальных отметках и вехах,
     остальное — валюты. Лист один на сундуки и пропуск — CAL в tools/content-gen/pass/build.js; строки режима собирает calRows ниже */
  calendar: { n: 'Календарь', box: 'wander', from: 1, proposal: true, clamp: true, base: [1, 2, 3, 4, 5, 6],
    basis: 'лист даров «Дар дня»: 30 отметок за вход в игру (§29); сундуки — на шальных отметках и вехах 7, 14, 20, 30', rows: null },
};
/* строки календаря из листа даров: сундук со своей редкостью (r) — одна строка на всю группу таких отметок, базой — эта редкость;
   сундук вехи со сдвигом (off) — строка на веху. Окно — как в листе; лестница — окно по умолчанию */
function calRows(CAL) {
  const rows = [], same = new Map();
  CAL.list.forEach((cell, i) => {
    const m = i + 1;
    for (const x of cell) {
      if (x.k !== 'chest') continue;
      const get = [0, 1].concat(x.win && x.win !== 'step' ? [x.win] : []);
      if (x.r != null) {
        const key = x.r + '|' + (x.win || 'step');
        if (!same.has(key)) { const row = { marks: [], days: 0, base: [1, 2, 3, 4, 5, 6].map(() => x.r), get: [get] }; same.set(key, row); rows.push(row); }
        const row = same.get(key); row.marks.push(m); row.days++;
      } else {
        get[0] = x.off;
        const M = CAL.miles[m];
        rows.push({ n: `${m}-я отметка — ${M ? M.n.toLowerCase() : 'сундук'}`, days: 1, get: [get] });
      }
    }
  });
  for (const row of rows) if (row.marks) { row.n = `${row.get[0][2] === 'wild' ? 'Шальной сундук' : 'Сундук'} — отметки ${row.marks.join(', ')}`; delete row.marks; }
  return rows;
}
MODES.calendar.rows = calRows(require('../pass/build.js').CAL);

/* Допущения для оценок — не правила игры. */
const ASSUME = {
  shardsPerHero: 50,       // комплект осколков героя: в GDD числа нет (§15.2), 50 — как в прототипе UI-кита
  workerShards: 10,        // шардов на рабочего: в GDD числа нет (§19.1)
  payerPts: [146, 100],    // плательщик набирает очков не больше ×1,46 — худший день Т12 черновика экономики (слотов — номер цикла, ADR-0031)
  craftKills: { free: 1, fan: 3 },   // побед над крафтовыми боссами в неделю: билет — уникальный ресурс босса биома, 5 % (§9.1)
  rb: { cap: 10, shareBp: [7000, 3000] },   // кап побед у рунных стражей в день и доля стражей пределов и доблести (черновик сет-бонусов, С8а)
  day: {   // доход дня всех отрядов — С1 черновика сет-бонусов, вывод sets.py (финальный прогон ADR-0031: реальный отряд, слотов — номер цикла)
    2: { free: { gold: 41967, spirit: 83935 }, fan: { gold: 128594, spirit: 257188 } },
    3: { free: { gold: 105446, spirit: 210892 }, fan: { gold: 328856, spirit: 657712 } },
  },
};

/* Спойлеры в таблице талисманов автора. Имена в таблицах автора — заглушки (ADR-0022, п. 3). Как их переименовать, решено
   в данных талисманов (design/ui/talismans.js, черновик docs/content/талисманы.md): имя, описание и вид сундук берёт оттуда.
   Линейка с пометкой «для команды» в talismans.js в сундуках есть только с цикла «для команды» — как ресурсы цикла VI в recipes.js.
   Сборщик ещё раз сверяет итоговые имена и описания со словами раздела дайджеста «Нельзя показывать раннему игроку»
   (docs/lore/дайджест.md; каждое слово там есть) и с именами собственными цикла «для команды» из recipes.js — биомы, боссы,
   стражи: спойлер без пометки — ошибка. Спойлеры таблицы автора и что с ними решено — таблица документа.
   «Демон» — прежнее имя Перворождённых (§3.1), в дайджесте они названы новым именем — поле seen.
   Не спойлер: «Печать …» — нарицательное слово, на печать Эуклида не указывает; «Покров Пятерых» — боги, которых игрок знает. */
const SPOILERS = [
  { stem: 'иридиум', why: 'мать мира Иридиум' },
  { stem: 'марионетк', why: 'Этрион как антагонист и его марионетки' },
  { stem: 'эуклид', why: 'Эуклид' },
  { stem: 'оболочк', why: 'Оболочка' },
  { stem: 'шестой элемент', why: 'шестой элемент' },
  { stem: 'колыбел', why: '«сломанные колыбели»' },
  { stem: 'перворожд', why: 'Перворождённые — не раньше 11-го биома' },
  { stem: 'демон', seen: 'перворожд', why: 'Демоны — прежнее имя Перворождённых (§3.1), их не показываем раньше 11-го биома' },
];

/* Законы и пороги проверок. */
const RULES = {
  itemsMax: 10,                    // §23: 1–10 предметов
  x17: [17, 10],                   // плательщик быстрее не больше ×1,7 (§1.2, §36.1)
  plankStep: 2,                    // соседние планки — не ближе ×2 по очкам
  spreadMax: 8,                    // Эхо: разброс внутри цикла не больше ×8 (§17.6)
  forbidTiers: ['part', 'made', 'act', 'call', 'hero', 'product', 'story', 'rune', 'vshard', 'valor'],   // рецепты, изделия, герои, руны
  resTiers: ['basic', 'key', 'unique', 'echo'],
  mcOpens: 2000, mcZ: 5,           // проверка открытием: открытий на сундук; среднее — не дальше 5 стандартных ошибок от расчёта
};

/* ================================ СБОРКА ================================ */

const fs = require('fs'), path = require('path'), vm = require('vm');
const { readSheet } = require('./xlsx');
require('./open');
const EnLoot = globalThis.EnLoot;
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  recipes: path.join(ROOT, 'design', 'ui', 'recipes.js'), battle: path.join(ROOT, 'design', 'ui', 'battle.js'),
  heroes: path.join(ROOT, 'docs', 'content', 'герои', 'состав-героев.csv'), tal: path.join(ROOT, 'source-data', 'Enerium_Талисманы_Финал.xlsx'),
  talData: path.join(ROOT, 'design', 'ui', 'talismans.js'),
  contracts: path.join(ROOT, 'design', 'ui', 'contracts.js'),
  digest: path.join(ROOT, 'docs', 'lore', 'дайджест.md'),
  outJs: path.join(ROOT, 'design', 'ui', 'lootboxes.js'), outDoc: path.join(ROOT, 'docs', 'content', 'лутбоксы.md'),
  tables: path.join(__dirname, 'tables.md'), doc: path.join(__dirname, 'doc.md'), open: path.join(__dirname, 'open.js'),
};
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const err = [], warn = [];

/* ---------- дроби: только целые, BigInt ---------- */
const big = x => BigInt(x);
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
class Q {
  constructor(n, d = 1n) { n = big(n); d = big(d); if (d === 0n) throw new Error('деление на ноль'); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; this.n = n / g; this.d = d / g; }
  add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  mul(o) { return new Q(this.n * o.n, this.d * o.d); }
  div(o) { return new Q(this.n * o.d, this.d * o.n); }
  cmp(o) { const a = this.n * o.d, b = o.n * this.d; return a < b ? -1 : a > b ? 1 : 0; }
  zero() { return this.n === 0n; }
  scaled(k) { const s = 10n ** big(k); return (this.n * s * 2n + this.d) / (2n * this.d); }   // округление до k знаков, половина — вверх
  int(k = 2) { return Number(this.scaled(k)); }
}
const Q0 = new Q(0), Q1 = new Q(1);
const sumQ = list => list.reduce((a, x) => a.add(x), Q0);

/* ---------- числа для текста ---------- */
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function fx(q, k) {   // дробь → «12,5»: округление, лишние нули справа убираются
  const s = q.scaled(k), neg = s < 0n, a = neg ? -s : s, p = 10n ** big(k), ip = a / p;
  let fr = k ? (a % p).toString().padStart(k, '0').replace(/0+$/, '') : '';
  return (neg ? '−' : '') + fmt(ip.toString()) + (fr ? ',' + fr : '');
}
const pct = bp => fx(new Q(bp, 100), 2) + ' %';   // базисные пункты → «57 %», «5,92 %»
const pctQ = q => fx(q.mul(new Q(100)), 1) + ' %';

/* ---------- чтение источников ---------- */
function loadRecipes() {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(FILES.recipes, 'utf8'), ctx, { filename: 'recipes.js' });
  if (!ctx.window.EN_RECIPES) throw new Error('recipes.js: нет window.EN_RECIPES');
  return JSON.parse(JSON.stringify(ctx.window.EN_RECIPES));
}
function readCsv(file) {
  const t = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''), rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return { head, rows: rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()]))) };
}

const REC = loadRecipes();
const byId = Object.fromEntries(REC.items.map(i => [i.id, i]));
const LB = REC.drops.lootboxes, MARKET = REC.drops.market;

/* герои Эхо: неделя — из источника «Эхо: неделя …» (ADR-0023, второй круг, п. 3) */
const WEEK_OF = { 'людей': 'Люди', 'дворфов': 'Дворфы', 'эльфов': 'Эльфы', 'зверей': 'Звери', 'саганов': 'Саганы', 'аппаратов': 'Аппараты', 'искажённых': 'Искажённые', 'нежити': 'Нежить', 'забытых': 'Забытые' };
const CSV = readCsv(FILES.heroes);
for (const col of ['id', 'имя', 'редкость', 'цикл', 'источник']) if (!CSV.head.includes(col)) err.push(`состав-героев.csv: нет столбца «${col}»`);
const HATE = CSV.head.find(h => h.toLowerCase().startsWith('неприязн'));
const heroesByWeek = Object.fromEntries(WEEKS.map(w => [w, []])), heroInfo = {};
for (const h of CSV.rows) {
  if (!/^эхо/i.test(h['источник'])) continue;
  const m = h['источник'].match(/неделя\s+([А-Яа-яЁё]+)/), week = m && WEEK_OF[m[1].toLowerCase()];
  const r = RARITY.indexOf(h['редкость'].toLowerCase()) + 1, cyc = ROMAN.indexOf(h['цикл']);
  if (!week) { err.push(`${h.id}: неделя Эхо не распознана в «${h['источник']}»`); continue; }
  if (r < 1) { err.push(`${h.id}: редкость «${h['редкость']}» не из семи`); continue; }
  if (cyc < 2) { err.push(`${h.id}: герой Эхо цикла «${h['цикл']}» — Эхо открывается с цикла II`); continue; }
  if (HATE && h[HATE] && !h[HATE].toLowerCase().includes(week.toLowerCase().slice(0, 4))) warn.push(`${h.id} ${h['имя']}: неприязнь «${h[HATE]}», а неделя — ${week} (ADR-0024, п. 4)`);
  heroesByWeek[week].push({ id: h.id, cyc, r });
  heroInfo[h.id] = { n: h['имя'], r, cyc, week };
}
for (const w of WEEKS) {
  heroesByWeek[w].sort((a, b) => a.cyc - b.cyc || (a.id < b.id ? -1 : 1));
  const cycles = heroesByWeek[w].map(h => h.cyc).join(',');
  if (cycles !== '2,3,4,5,6') warn.push(`неделя ${w}: героев Эхо по циклам — [${cycles}], ждём по одному на циклы II–VI (ADR-0023, второй круг, п. 3)`);
}

/* талисманы — таблица автора: редкость и вес внутри редкости (правило 5 листа «Правила пула») */
const TAL = readSheet(FILES.tal, 'Талисманы'), TH = TAL[0], tcol = n => { const i = TH.indexOf(n); if (i < 0) err.push(`таблица талисманов: нет столбца «${n}»`); return i; };
const [tNo, tCat, tR, tName, tW, tDesc] = ['№', 'Категория', 'Редкость', 'Название', 'Вес (авто)', 'Описание'].map(tcol);
/* спойлеры: имена собственные цикла «для команды» из recipes.js — биомы, боссы, стражи. Талисман с таким именем — тоже для команды (§38) */
const TEAM_WORDS = [...new Set(REC.cycles.filter(c => c.team).flatMap(c => c.biomes.flatMap(b => [b.n, b.boss, b.guard])).join(' ').split(/[^А-Яа-яЁё-]+/).filter(w => /^[А-ЯЁ]/.test(w) && w.length >= 5))];
const TEAM_FROM = Math.min(...REC.cycles.filter(c => c.team).map(c => c.n));
const DIGEST = (() => {
  const t = fs.readFileSync(FILES.digest, 'utf8').replace(/\r\n/g, '\n'), i = t.indexOf('## Нельзя показывать раннему игроку');
  if (i < 0) { err.push('дайджест: нет раздела «Нельзя показывать раннему игроку»'); return ''; }
  const j = t.indexOf('\n## ', i + 3);
  return t.slice(i, j < 0 ? t.length : j).toLowerCase();
})();
for (const sp of SPOILERS) if (!DIGEST.includes(sp.seen || sp.stem)) err.push(`спойлер «${sp.stem}»: слова «${sp.seen || sp.stem}» нет в разделе дайджеста`);
const spoilOf = text => { const low = String(text).toLowerCase(); return SPOILERS.filter(sp => low.includes(sp.stem)).map(sp => sp.why).concat(TEAM_WORDS.filter(w => String(text).includes(w) && !SPOILERS.some(sp => w.toLowerCase().includes(sp.stem))).map(w => `имя цикла «для команды» — ${w}`)); };
/* данные талисманов после переработки: имя, описание, вид и пометка «для команды» — design/ui/talismans.js */
const TLD = (() => {
  try { const c = {}; c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync(FILES.talData, 'utf8'), c); return c.EN_TALISMANS || null; }
  catch (e) { err.push(`talismans.js не читается — ${e.message}: собрать tools/content-gen/talismans/build.js`); return null; }
})();
const TAL_CATS = TLD ? ['fight', 'hunt', 'farm', 'seal'].map(k => TLD.rules.cats[k]) : [];
/* talSpoil — спойлер в итоговом имени или описании: такие линейки только «для команды»; talAuthor — спойлеры таблицы автора и решение по ним */
const talByR = {}, talInfo = {}, talCat = {}, talSpoil = {}, talAuthor = {};
for (const row of TAL.slice(1)) {
  if (!row[tNo]) continue;
  const r = RARITY.indexOf(String(row[tR]).toLowerCase()) + 1, w = +row[tW], no = +row[tNo];
  if (r < 1) { err.push(`талисман №${row[tNo]}: редкость «${row[tR]}»`); continue; }
  if (!Number.isInteger(w) || w < 1) { err.push(`талисман №${row[tNo]}: вес «${row[tW]}» не целый`); continue; }
  if (talInfo[no]) { err.push(`талисман №${no} дважды`); continue; }
  const it = TLD && TLD.items[no], f = it && TLD.fams[it[0]];
  if (!f) { err.push(`талисман №${no}: нет в talismans.js — собрать tools/content-gen/talismans/build.js`); continue; }
  if (it[1] !== r || f.w[r - 1] !== w) err.push(`талисман №${no}: в talismans.js редкость ${it[1]} и вес ${f.w[r - 1]}, в таблице автора — ${r} и ${w}`);
  if (f.team && f.team !== TEAM_FROM) err.push(`талисман №${no}: в talismans.js «для команды» с цикла ${f.team}, а цикл «для команды» — ${TEAM_FROM}`);
  const aName = spoilOf(row[tName]), aDesc = spoilOf(row[tDesc]);
  if (aName.length || aDesc.length) talAuthor[no] = { n: row[tName], where: aName.length && aDesc.length ? 'имя и описание' : aName.length ? 'имя' : 'описание', why: [...new Set(aName.concat(aDesc))].join('; '), d: row[tDesc] };
  const spoil = [...new Set(spoilOf(f.n).concat(spoilOf(f.d)))], team = f.team ? 1 : 0;
  if (spoil.length && !team) err.push(`талисман №${no} «${f.n}»: спойлер (${spoil.join('; ')}), а в talismans.js нет пометки «для команды»`);
  if (team) talSpoil[no] = spoil.join('; ') || 'линейка «для команды» в talismans.js';
  const cat = TLD.rules.cats[f.cat];
  (talByR[r] = talByR[r] || []).push([no, w, team]);
  talInfo[no] = [f.n, cat, team];
  talCat[r] = talCat[r] || {}; talCat[r][cat] = (talCat[r][cat] || 0) + 1;
}

/* ресурсы: общий пул базовых и наборы по циклам — drops.lootboxes в recipes.js */
const pools = { basic: LB.basicPool.slice(), key: {}, unique: {}, heroes: heroesByWeek, tal: talByR };
for (const p of LB.pools) { pools.key[p.cyc] = p.key.slice(); pools.unique[p.cyc] = p.unique.slice(); }
const itemsOut = {};
const useItem = id => { const it = byId[id]; if (it) itemsOut[id] = { n: it.n, r: it.r, cyc: it.cyc, tier: it.tier, team: !!it.team }; return it; };
for (const id of pools.basic) useItem(id);
for (const c of Object.keys(pools.key)) for (const id of pools.key[c].concat(pools.unique[c])) useItem(id);
for (const ln of Object.values(LINES)) if (ln.kind === 'item') for (const b of ln.by) if (b) useItem(b[0]);

/* данные для алгоритма открытия — то же, что уйдёт в lootboxes.js */
const L = { bpTotal: 10000, teamFrom: TEAM_FROM, rarity: RARITY, boxRarity: BOX_RARITY, rvalue: RVALUE, weeks: WEEKS, windows: WINDOWS, winNames: WIN_NAMES,
  currencies: CURRENCY, dust: DUST, lines: LINES, boxes: BOXES, pools };

/* ---------- проверки данных ---------- */
const isInt = x => Number.isInteger(x);
for (const [k, W] of Object.entries(WINDOWS)) {
  const rows = k === 'step' ? W : [W];
  if (k === 'step' && W.length !== 7) err.push('окно «лестница»: нужно 7 строк — по редкости сундука');
  rows.forEach((row, i) => {
    const tag = `окно «${WIN_NAMES[k]}»${k === 'step' ? ' · ' + BOX_RARITY[i] : ''}`;
    if (!row.length) err.push(`${tag}: пустое`);
    const s = row.reduce((a, [, bp]) => a + bp, 0);
    if (s !== L.bpTotal) err.push(`${tag}: сумма ${s} б. п., нужно 10 000`);
    row.forEach(([r, bp], j) => {
      if (!isInt(r) || r < 1 || r > 7) err.push(`${tag}: редкость ${r} вне 1–7`);
      if (!isInt(bp) || bp < 1) err.push(`${tag}: доля ${bp} не целое положительное`);
      if (j && r <= row[j - 1][0]) err.push(`${tag}: редкости не по возрастанию`);
    });
    if (k === 'step' && row[row.length - 1][0] !== i + 1) err.push(`${tag}: верх окна не совпадает с редкостью сундука`);
  });
}
for (const [id, ln] of Object.entries(LINES)) {
  for (const k of ['pack', 'qty']) if (ln[k] && (ln[k].length !== 7 || !ln[k].every(q => isInt(q) && q > 0))) err.push(`линия ${id}: ${k} — нужно 7 целых > 0`);
  if (ln.by) {
    if (ln.by.length !== 7) err.push(`линия ${id}: by — нужно 7 ступеней`);
    ln.by.forEach(b => { if (b && (!isInt(b[1]) || b[1] < 1)) err.push(`линия ${id}: количество ${b[1]} не целое`); });
    if (ln.kind === 'res') ln.by.forEach(b => { if (b && !pools[b[0]]) err.push(`линия ${id}: нет пула «${b[0]}»`); });
  }
  if (ln.kind === 'cur' && !CURRENCY[ln.cur]) err.push(`линия ${id}: неизвестная валюта ${ln.cur}`);
}
for (const [id, B] of Object.entries(BOXES)) {
  if (!B.lines.length) err.push(`${B.n}: нет линий`);
  for (const [ln, w, from] of B.lines) {
    if (!LINES[ln]) err.push(`${B.n}: нет линии ${ln}`);
    if (!isInt(w) || w < 1) err.push(`${B.n}: вес линии ${ln} — ${w}`);
    if (from !== undefined && (!isInt(from) || from < 1 || from > 6)) err.push(`${B.n}: цикл линии ${ln} — ${from}`);
  }
  if (B.items.length !== 7 || !B.items.every(n => isInt(n) && n >= 1 && n <= RULES.itemsMax)) err.push(`${B.n}: предметов — нужно 7 целых от 1 до ${RULES.itemsMax} (§23)`);
  for (const [cur, arr] of Object.entries(B.cur)) {
    if (!CURRENCY[cur]) err.push(`${B.n}: неизвестная валюта ${cur}`);
    if (arr.length !== 7 || !arr.every(a => isInt(a) && a >= 0)) err.push(`${B.n}: валюта ${cur} — нужно 7 целых`);
  }
  if (!Object.values(B.cur).some(arr => arr.every(a => a > 0))) err.push(`${B.n}: гарантированной валюты нет на всех редкостях (§23)`);
}
/* чего сундук не даёт: скрытых рецептов и того, что делается по рецепту; душ; Энериума; рун (ADR-0023, п. 7; §1.2; §9.3; §11) */
for (const [id, it] of Object.entries(itemsOut)) {
  const src = byId[id];
  if (!src) { err.push(`пул: предмета ${id} нет в recipes.js`); continue; }
  if (RULES.forbidTiers.includes(src.tier)) err.push(`пул: ${id} «${src.n}» — ${src.tier}: делается по рецепту или это руна`);
  if (!RULES.resTiers.includes(src.tier)) err.push(`пул: ${id} «${src.n}» — ярус ${src.tier} не для сундуков`);
  if (REC.recipes.some(r => r.out[0] === id)) err.push(`пул: ${id} «${src.n}» создаётся рецептом — сундук не выдаёт результат рецепта`);
}
for (const cur of Object.keys(CURRENCY)) if (['souls', 'enerium'].includes(cur)) err.push(`валюта ${cur} в сундуках запрещена`);
for (const w of WEEKS) for (const h of heroesByWeek[w]) {
  const row = CSV.rows.find(x => x.id === h.id);
  if (!/^эхо/i.test(row['источник'])) err.push(`${h.id}: не герой Эхо`);
}

/* ---------- выплаты: разворот по циклам ---------- */
const clampR = (m, r) => m.clamp ? Math.min(7, r) : r;
function unfold(m, row, c) {
  const base = (row.base || m.base)[c - 1];
  return row.get.map(([off, count, win]) => ({ r: clampR(m, base + off), count, win: win || 'step' }));
}
const PAY = {};   // режим → слои → строки → { cyc: [{ r, count, win }] }
for (const [mid, m] of Object.entries(MODES)) {
  if (!BOXES[m.box]) { err.push(`${m.n}: нет сундука ${m.box}`); continue; }
  const P = PAY[mid] = { layers: [] };
  const push = (layer, row, label) => {
    const out = { label, x: row.x, top: row.top, n: row.n, count: row.count, days: row.days, cyc: {} };
    for (let c = m.from; c <= 6; c++) {
      const got = unfold(m, row, c);
      for (const g of got) {
        if (!isInt(g.r) || g.r < 1 || g.r > 7) err.push(`${m.n} · ${label}, цикл ${ROMAN[c]}: редкость сундука ${g.r} вне 1–7`);
        if (!isInt(g.count) || g.count < 1) err.push(`${m.n} · ${label}: штук ${g.count}`);
        if (!WIN_NAMES[g.win]) err.push(`${m.n} · ${label}: окно ${g.win}`);
      }
      out.cyc[c] = got;
    }
    layer.rows.push(out);
  };
  if (m.layers) for (const ly of m.layers) {
    const layer = { id: ly.id, n: ly.n, one: ly.one || ly.n, kind: ly.kind, clan: !!ly.clan, rows: [] };
    P.layers.push(layer);
    ly.rows.forEach((row, i) => push(layer, row, ly.kind === 'plank' ? `планка ${i + 1}` : row.top ? `топ-${row.top}` : 'все с очками'));
    if (ly.kind === 'plank') ly.rows.forEach((row, i) => { const stepBp = ly.minStepBp || RULES.plankStep * 10000; if (i && row.x * 10000 < ly.rows[i - 1].x * stepBp) err.push(`${m.n} · ${ly.n}: планки ${i} и ${i + 1} ближе ×${stepBp / 10000} по очкам`); });
    if (ly.kind === 'place') ly.rows.forEach((row, i) => { if (i && row.top !== 0 && row.top <= ly.rows[i - 1].top) err.push(`${m.n} · ${ly.n}: места не по возрастанию`); });
  }
  if (m.rows) { const layer = { id: 'rows', n: m.n, kind: 'once', rows: [] }; P.layers.push(layer); m.rows.forEach(row => push(layer, row, row.n)); }
  if (mid === 'first') {
    const layer = { id: 'biomes', n: 'Биомы', kind: 'once', rows: [] }; P.layers.push(layer);
    for (const cy of REC.cycles) cy.biomes.forEach((b, i) => {
      const r = m.base[cy.n - 1] + m.biomeOff[i];
      if (r < 1 || r > 7) err.push(`${m.n} · ${b.n}: редкость ${r}`);
      layer.rows.push({ label: cy.team ? `биом ${b.id.slice(1)} · для команды` : b.n, biome: b.id, team: !!cy.team, cyc: { [cy.n]: [{ r, count: 1, win: 'step' }] }, only: cy.n });
    });
  }
  if (mid === 'craft') {
    const layer = { id: 'bosses', n: 'Крафтовые боссы', kind: 'kill', rows: [] }; P.layers.push(layer);
    for (const s of REC.drops.craftBosses) {
      if (!s.workerBoxRarity) continue;   // Лик недели платит осколками напрямую (recipes.js), сундука нет
      if (s.workerBoxRarity < 1 || s.workerBoxRarity > 7) err.push(`${s.name}: редкость сундука ${s.workerBoxRarity}`);
      layer.rows.push({ label: s.team ? 'для команды' : s.name, boss: s.id, team: !!s.team, cyc: { [s.cyc]: [{ r: s.workerBoxRarity, count: 1, win: 'step' }] }, only: s.cyc });
    }
  }
  for (const k of Object.keys(m.typical || {})) for (const [lid, v] of Object.entries(m.typical[k])) {
    const ly = (m.layers || []).find(x => x.id === lid);
    if (!ly) err.push(`${m.n}: typical ${k}.${lid} — нет слоя`);
    else if (ly.kind === 'plank' && (v < 0 || v > ly.rows.length)) err.push(`${m.n}: typical ${k}.${lid} — нет планки ${v}`);
    else if (ly.kind === 'place' && !ly.rows.some(r => r.top === v)) err.push(`${m.n}: typical ${k}.${lid} — нет места ${v}`);
  }
}
/* контракты: typical — не допущение, а прогон сборщика контрактов. Планка профиля — сколько порогов недели (planks) не выше его
   средних очков (econ.o — обычный, econ.e — увлечённый); должна совпасть во всех циклах. Сборщик контрактов читает lootboxes.js,
   но не typical — круга нет. Нет contracts.js — предупреждение: сверить нечем */
const CT_RUN = (() => {
  if (!fs.existsSync(FILES.contracts)) { warn.push('contracts.js нет — typical контрактов не сверен с прогоном: собрать tools/content-gen/contracts/build.js'); return null; }
  try { const c = {}; c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync(FILES.contracts, 'utf8'), c); return c.EN_CONTRACTS || null; }
  catch (e) { err.push(`contracts.js не читается — ${e.message}`); return null; }
})();
if (CT_RUN) {
  const T = MODES.contract.typical, who = { free: 'o', fan: 'e' };
  for (const c of CT_RUN.rules.cycles) for (const [k, p] of Object.entries(who)) {
    const pts = CT_RUN.econ[c][p].pts, got = CT_RUN.planks[c].filter(x => pts >= x).length;
    if (got !== T[k].me) err.push(`Контракты, цикл ${ROMAN[c]}: typical ${k}.me = ${T[k].me}, а прогон контрактов даёт ${got}-ю планку (${fmt(pts)} очков недели)`);
  }
}
const used = new Set(Object.values(MODES).map(m => m.box));
for (const id of Object.keys(BOXES)) if (!used.has(id)) err.push(`${BOXES[id].n}: ни один режим его не выдаёт — мёртвые данные`);

if (err.length) fail();

/* ---------- ожидаемое содержимое: точные дроби ---------- */
const specKey = s => `${s.box}:${s.r}:${s.win}:${s.cyc}:${s.week || ''}`;
const DEF = new Map(), EV = new Map();
function def(spec) {
  const k = specKey(spec);
  if (!DEF.has(k)) {
    const d = EnLoot.resolve(L, spec);
    for (const [x] of d.window) if (!d.byR[x] || !d.byR[x].length) err.push(`${BOXES[spec.box].n} · ${BOX_RARITY[spec.r - 1]} · цикл ${ROMAN[spec.cyc]}${spec.week ? ' · ' + spec.week : ''}: пустая редкость «${RARITY[x - 1]}» в окне`);
    DEF.set(k, d);
  }
  return DEF.get(k);
}
function evOf(spec) {
  const k = specKey(spec);
  if (EV.has(k)) return EV.get(k);
  const d = def(spec), acc = {}, add = (key, q) => { acc[key] = (acc[key] || Q0).add(q); };
  for (const [id, amt] of d.cur) add('cur:' + id, new Q(amt));
  const bpSum = d.window.reduce((a, x) => a + x[1], 0);
  for (const [x, bp] of d.window) {
    const lines = d.byR[x] || [], W = lines.reduce((a, l) => a + l.w, 0);
    for (const l of lines) {
      const E = l.entries.reduce((a, e) => a + e.w, 0);
      for (const e of l.entries) {
        const p = new Q(big(bp) * big(l.w) * big(e.w) * big(d.n) * big(e.q), big(bpSum) * big(W) * big(E));
        const key = e.kind === 'shard' ? 'shard:' + e.id : e.kind === 'wshard' ? 'wsh:' + x : e.kind === 'tal' ? 'tal:' + x : e.kind === 'equip' ? 'eq:' + x : e.kind === 'cur' ? 'cur:' + e.id : 'item:' + e.id;
        add(key, p);
        if (e.kind === 'item') add('resGold', p.mul(new Q(priceOf(e.id, spec.cyc))));
      }
    }
  }
  const v = derive(acc);
  EV.set(k, v);
  return v;
}
function priceOf(id, c) {   // минимальная цена рынка (§13), золото: базовые — по циклу получателя, ключи и уникальные — по своему циклу
  const it = byId[id];
  if (it.tier === 'basic') return MARKET.basic[c - 1];
  if (it.tier === 'key') return MARKET.key[it.cyc - 1];
  if (it.tier === 'unique') return MARKET.unique[it.cyc - 1];
  return 0;   // Многоликий не торгуется ценой рынка — в золото не переводим
}
function derive(acc) {
  const v = Object.assign({}, acc), sumBy = (pre, f) => sumQ(Object.keys(acc).filter(k => k.startsWith(pre)).map(k => acc[k].mul(new Q(f(k)))));
  v.shards = sumBy('shard:', () => 1);
  v.tal = sumBy('tal:', () => 1); v.talV = sumBy('tal:', k => RVALUE[+k.slice(4) - 1]);
  v.wsh = sumBy('wsh:', () => 1); v.wshV = sumBy('wsh:', k => RVALUE[+k.slice(4) - 1]);
  v.eq = sumBy('eq:', () => 1); v.equipV = sumBy('eq:', k => RVALUE[+k.slice(3) - 1]);
  v.craftV = v.talV.add(v.wshV);
  v.keys = acc['cur:keys'] || Q0; v.dust = acc['cur:dust'] || Q0; v.gold = acc['cur:gold'] || Q0; v.spirit = acc['cur:spirit'] || Q0;
  v.many = acc['item:many'] || Q0; v.resGold = acc.resGold || Q0;
  v.basic = sumBy('item:', k => byId[k.slice(5)].tier === 'basic' ? 1 : 0);
  v.key = sumBy('item:', k => byId[k.slice(5)].tier === 'key' ? 1 : 0);
  v.unique = sumBy('item:', k => byId[k.slice(5)].tier === 'unique' ? 1 : 0);
  return v;
}
const LEDGERS = ['shards', 'keys', 'talV', 'wshV', 'equipV', 'craftV', 'dust', 'tal', 'wsh', 'eq', 'gold', 'spirit', 'resGold', 'basic', 'key', 'unique', 'many'];
const addEv = (a, b, times = Q1) => { const o = Object.assign({}, a); for (const k of LEDGERS) o[k] = (a[k] || Q0).add((b[k] || Q0).mul(times)); return o; };
const EMPTY = Object.fromEntries(LEDGERS.map(k => [k, Q0]));
const specOf = (mid, c, g, week) => ({ box: MODES[mid].box, r: g.r, win: g.win, cyc: c, week: MODES[mid].box === 'shards' ? (week || WEEKS[0]) : null });
const evRow = (mid, row, c, week) => (row.cyc[c] || []).reduce((acc, g) => addEv(acc, evOf(specOf(mid, c, g, week)), new Q(g.count)), EMPTY);

/* все сундуки всех выплат: пустые окна, достижимость содержимого */
const reach = new Set();
for (const [mid, P] of Object.entries(PAY)) for (const ly of P.layers) for (const row of ly.rows) for (const c of Object.keys(row.cyc).map(Number)) for (const g of row.cyc[c]) {
  const weeks = MODES[mid].box === 'shards' ? WEEKS : [null];
  for (const w of weeks) {
    const d = def(specOf(mid, c, g, w));
    for (const [x] of d.window) for (const l of d.byR[x] || []) for (const e of l.entries) reach.add(`${e.kind}:${e.kind === 'shard' || e.kind === 'item' ? e.id : e.kind === 'tal' ? x : e.kind === 'cur' ? e.id : x}`);
  }
}
if (err.length) fail();
/* одна неделя Эхо не выгоднее другой: осколков поровну */
for (let c = 2; c <= 6; c++) for (let r = 1; r <= 7; r++) {
  const vals = WEEKS.map(w => evOf({ box: 'shards', r, win: 'step', cyc: c, week: w }).shards);
  if (vals.some(v => v.cmp(vals[0]))) err.push(`Сундук осколков · ${BOX_RARITY[r - 1]} · цикл ${ROMAN[c]}: осколков по неделям не поровну`);
}
/* достижимость: каждый герой Эхо, каждая редкость талисманов, рабочих и снаряжения, каждый ресурс пулов */
const unreached = { heroes: [], tal: [], wsh: [], eq: [], res: [] };
for (const w of WEEKS) for (const h of heroesByWeek[w]) if (!reach.has('shard:' + h.id)) unreached.heroes.push(h.id);
for (let r = 1; r <= 7; r++) {
  if (!reach.has('tal:' + r)) unreached.tal.push(r);
  if (!reach.has('wshard:' + r)) unreached.wsh.push(r);
  if (!reach.has('equip:' + r)) unreached.eq.push(r);
}
for (const id of Object.keys(itemsOut)) if (!reach.has('item:' + id)) unreached.res.push(id);
if (unreached.heroes.length) err.push('герои Эхо недостижимы: ' + unreached.heroes.join(', '));
for (const k of ['tal', 'wsh', 'eq']) if (unreached[k].length) err.push(`${{ tal: 'талисманы', wsh: 'рабочие', eq: 'снаряжение' }[k]}: редкости ${unreached[k].map(r => RARITY[r - 1]).join(', ')} не выпадают ни из одного сундука`);

/* ---------- проверка открытием: алгоритм открытия и расчёт — одно и то же ----------
   Для главной меры сундука считаем точные среднее и дисперсию одного предмета; среднее N открытий на сиде должно лежать
   не дальше mcZ стандартных ошибок от расчёта: (S − N·μ)² ≤ z²·N·σ². Сиды постоянные — итог проверки не плавает. */
let mcCount = 0, mcWorst = { dev: -1 };
const mcSeen = new Set();
for (const [mid, P] of Object.entries(PAY)) for (const ly of P.layers) for (const row of ly.rows) for (const c of Object.keys(row.cyc).map(Number)) for (const g of row.cyc[c]) {
  const spec = specOf(mid, c, g), k = specKey(spec);
  if (mcSeen.has(k)) continue; mcSeen.add(k);
  const d = def(spec), mainKey = BOXES[spec.box].main;
  let m1 = Q0, m2 = Q0;
  const bpSum = d.window.reduce((a, x) => a + x[1], 0);
  for (const [x, bp] of d.window) {
    const lines = d.byR[x], W = lines.reduce((a, l) => a + l.w, 0);
    for (const l of lines) {
      const E = l.entries.reduce((a, e) => a + e.w, 0);
      for (const e of l.entries) {
        const a = amountMain(mainKey, { kind: e.kind, id: e.id, q: e.q, r: x });
        if (!a) continue;
        const p = new Q(big(bp) * big(l.w) * big(e.w), big(bpSum) * big(W) * big(E));
        m1 = m1.add(p.mul(new Q(a))); m2 = m2.add(p.mul(new Q(a * a)));
      }
    }
  }
  const mu = m1.mul(new Q(d.n)), sigma2 = m2.add(new Q(-1).mul(m1.mul(m1))).mul(new Q(d.n));
  if (mu.cmp(evOf(spec)[mainKey].add(new Q(-1).mul(guaranteedMain(d, mainKey)))) !== 0) err.push(`${k}: две дороги расчёта дали разное среднее`);
  if (mu.zero()) continue;
  let total = 0;
  for (let i = 0; i < RULES.mcOpens; i++) {
    const res = EnLoot.roll(d, EnLoot.seedOf(k + ':' + i));
    if (res.items.length !== d.n) err.push(`${k}: предметов ${res.items.length}, а нужно ${d.n}`);
    for (const it of res.items) total += amountMain(mainKey, it);
  }
  const N = new Q(RULES.mcOpens), diff = new Q(total).add(new Q(-1).mul(N.mul(mu)));
  const devBp = Math.abs(diff.div(N.mul(mu)).int(4));
  mcCount++;
  if (devBp > mcWorst.dev) mcWorst = { dev: devBp, k };
  if (diff.mul(diff).cmp(new Q(RULES.mcZ * RULES.mcZ).mul(N).mul(sigma2)) > 0) err.push(`${k}: среднее ${RULES.mcOpens} открытий дальше ${RULES.mcZ} стандартных ошибок от расчёта — алгоритм и расчёт разошлись`);
}
function guaranteedMain(d, mainKey) { const cur = { keys: 'keys', dust: 'dust' }[mainKey]; const x = cur && d.cur.find(c => c[0] === cur); return x ? new Q(x[1]) : Q0; }
function amountMain(mainKey, it) {
  switch (mainKey) {
    case 'shards': return it.kind === 'shard' ? it.q : 0;
    case 'keys': return it.kind === 'cur' && it.id === 'keys' ? it.q : 0;
    case 'dust': return it.kind === 'cur' && it.id === 'dust' ? it.q : 0;
    case 'talV': return it.kind === 'tal' ? RVALUE[it.r - 1] : 0;
    case 'wshV': return it.kind === 'wshard' ? it.q * RVALUE[it.r - 1] : 0;
    case 'equipV': return it.kind === 'equip' ? RVALUE[it.r - 1] : 0;
    case 'craftV': return it.kind === 'tal' ? RVALUE[it.r - 1] : it.kind === 'wshard' ? it.q * RVALUE[it.r - 1] : 0;
  }
  return 0;
}
/* тот же генератор, что в ядре боя прототипа */
let rngSame = null;
try {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(FILES.battle, 'utf8'), ctx, { filename: 'battle.js' });
  const B = ctx.window.EnBattle;
  rngSame = true;
  for (const seed of [1, 0xDEADBEEF, EnLoot.seedOf('Эхо')]) {
    const a = B.makeRng(seed), b = EnLoot.makeRng(seed);
    for (let i = 0; i < 1000; i++) { const n = [10000, 7, 36, 9045][i % 4]; if (a(n) !== b(n)) rngSame = false; }
    if (B.seedOf('Сундук') !== EnLoot.seedOf('Сундук')) rngSame = false;
  }
  if (!rngSame) err.push('генератор открытия не совпадает с генератором ядра боя (battle.js)');
} catch (e) { warn.push('battle.js не загрузился, генератор не сверен: ' + e.message); }

/* ---------- законы: ×1,7, разброс и удержание Эхо ---------- */
const MAIN = mid => BOXES[MODES[mid].box].main;
const x17 = [], spread = [], retention = [];
const X17 = new Q(RULES.x17[0], RULES.x17[1]);
for (const [mid, m] of Object.entries(MODES)) {
  if (!m.layers) continue;
  for (const ly of PAY[mid].layers.filter(l => l.kind === 'plank')) {
    let worst = null;
    for (let c = m.from; c <= 6; c++) {
      let cum = EMPTY;
      ly.rows.forEach((row, i) => {
        const next = addEv(cum, evRow(mid, row, c));
        if (i) for (const led of [MAIN(mid), ...Object.keys(BOXES[m.box].cur)]) {
          if (cum[led].zero()) continue;
          const ratio = next[led].div(cum[led]);
          if (!worst || ratio.cmp(worst.ratio) > 0) worst = { ratio, c, led, k: i + 1 };
          if (ratio.cmp(X17) > 0) err.push(`${m.n} · ${ly.n}, цикл ${ROMAN[c]}: планка ${i + 1} даёт ×${fx(ratio, 2)} к накопленному по «${led}» — больше ×1,7 (§1.2)`);
        }
        cum = next;
      });
    }
    x17.push({ mode: m.n, layer: ly.n, clan: ly.clan, worst });
  }
}
/* места: чем выше место, тем не меньше награда — по главной мере в каждом цикле */
for (const [mid, m] of Object.entries(MODES)) if (m.layers) for (const ly of PAY[mid].layers.filter(l => l.kind === 'place')) for (let c = m.from; c <= 6; c++) {
  const vals = ly.rows.map(row => evRow(mid, row, c)[MAIN(mid)]);
  for (let i = 1; i < vals.length; i++) if (vals[i].cmp(vals[i - 1]) > 0) err.push(`${m.n} · ${ly.n}, цикл ${ROMAN[c]}: ${ly.rows[i].label} даёт больше, чем ${ly.rows[i - 1].label}`);
}
{
  const m = MODES.echo, me = PAY.echo.layers.find(l => l.id === 'me'), top = PAY.echo.layers.find(l => l.id === 'top');
  const mid = top.rows.find(r => r.top === m.midPlace);
  for (let c = m.from; c <= 6; c++) {
    const first = evRow('echo', me.rows[0], c).shards, all = me.rows.reduce((a, row) => a.add(evRow('echo', row, c).shards), Q0);
    const best = top.rows.reduce((a, row) => { const v = evRow('echo', row, c).shards; return v.cmp(a) > 0 ? v : a; }, Q0);
    const s = all.add(best).div(first);
    spread.push({ c, first, all, best, s, ok: s.cmp(new Q(RULES.spreadMax)) <= 0 });
    if (s.cmp(new Q(RULES.spreadMax)) > 0) warn.push(`Эхо, цикл ${ROMAN[c]}: разброс ×${fx(s, 1)} — больше ×${RULES.spreadMax} (§17.6)`);
    if (c < 6) {
      const lastNext = evRow('echo', me.rows[me.rows.length - 1], c + 1).shards, midNow = evRow('echo', mid, c).shards, ok = lastNext.cmp(midNow) >= 0;
      retention.push({ c, lastNext, midNow, ok });
      if (!ok) warn.push(`Эхо: последняя планка цикла ${ROMAN[c + 1]} хуже места топ-${m.midPlace} цикла ${ROMAN[c]} (§17.6)`);
    }
  }
}

/* ---------- неделя обычного и увлечённого ---------- */
function weekEv(mid, who, c) {
  const m = MODES[mid], t = (m.typical || {})[who] || {};
  let acc = EMPTY, boxes = 0;
  for (const ly of PAY[mid].layers) {
    if (!(ly.id in t)) continue;
    const v = t[ly.id];
    const rows = ly.kind === 'plank' ? ly.rows.slice(0, v) : ly.rows.filter(r => r.top === v);
    for (const row of rows) { acc = addEv(acc, evRow(mid, row, c)); boxes += (row.cyc[c] || []).reduce((a, g) => a + g.count, 0); }
  }
  return { ev: acc, boxes };
}
const WEEK = {};
for (const [mid, m] of Object.entries(MODES)) if (m.weekly) {
  WEEK[mid] = {};
  for (let c = m.from; c <= 6; c++) WEEK[mid][c] = { free: weekEv(mid, 'free', c), fan: weekEv(mid, 'fan', c) };
}
/* крафтовые боссы: сундук за победу, побед в неделю — допущение */
const CRAFT = PAY.craft.layers[0].rows.map(row => { const c = row.only; return { row, c, ev: evRow('craft', row, c) }; });

if (err.length) fail();

/* ================================ ВЫВОД ================================ */
const bn = r => BOX_RARITY[r - 1];
const rn = r => RARITY[r - 1];
const nameOf = id => { const it = byId[id]; return it.team ? 'для команды' : it.n; };
const boxLabel = (g, short) => `${g.count > 1 ? g.count + ' × ' : ''}${short ? bn(g.r).slice(0, 4) + '.' : bn(g.r)}${g.win !== 'step' ? ' · ' + WIN_NAMES[g.win] : ''}`;
const gotLabel = (got, short) => got.map(g => boxLabel(g, short)).join(' + ');

const T = [], block = n => T.push(`\n<!-- ${n} -->\n`);
const inline = {};

/* окна */
block('windows');
T.push('| Сундук | Лестница: доли по редкостям | Чистое |', '|---|---|---|');
for (let r = 1; r <= 7; r++) T.push(`| ${bn(r)} | ${WINDOWS.step[r - 1].map(([x, bp]) => `${rn(x)} ${pct(bp)}`).join(' · ')} | ${rn(r)} 100 % |`);
T.push('', `Шальное окно — одно на все редкости сундука: ${WINDOWS.wild.map(([x, bp]) => `${rn(x)} ${pct(bp)}`).join(' · ')}.`);

/* линии */
block('lines');
T.push('| Линия | ' + RARITY.map(r => r).join(' | ') + ' |', '|---|' + RARITY.map(() => '---').join('|') + '|');
const lineCell = (id, x) => {
  const ln = LINES[id];
  switch (ln.kind) {
    case 'shards': return `×${ln.pack[x - 1]}`;
    case 'workers': return `×${ln.qty[x - 1]}`;
    case 'tal': return `${(talByR[x] || []).length} шт.`;
    case 'equip': return '1';
    case 'cur': return `${ln.qty[x - 1]}${ln.perCycle ? ' × цикл' : ''}`;
    case 'res': { const b = ln.by[x - 1]; return b ? `${{ basic: 'базовый', key: 'ключ ремесла', unique: 'уникальный' }[b[0]]} ×${b[1]}` : '—'; }
    case 'item': { const b = ln.by[x - 1]; return b ? `${byId[b[0]].n} ×${b[1]}` : '—'; }
  }
};
for (const id of Object.keys(LINES)) T.push(`| ${LINES[id].n}${LINES[id].from ? ` · с цикла ${ROMAN[LINES[id].from]}` : ''} | ${RARITY.map((_, i) => lineCell(id, i + 1)).join(' | ')} |`);
/* доли линий на каждой редкости: у линии без записей на этой редкости её вес делят остальные */
block('shares');
T.push('| Сундук | Циклы | Доли линий на редкости предмета |', '|---|---|---|');
for (const [id, B] of Object.entries(BOXES)) {
  const from = Math.min(...Object.values(MODES).filter(m => m.box === id).map(m => m.from)), rows = [];
  for (let c = from; c <= 6; c++) {
    const d = EnLoot.resolve(L, { box: id, r: 7, win: 'wild', cyc: c, week: id === 'shards' ? WEEKS[0] : null }), groups = new Map();
    for (let x = 1; x <= 7; x++) {
      const lines = d.byR[x] || [], W = lines.reduce((a, l) => a + l.w, 0);
      const txt = lines.map(l => { const n = LINES[l.line].n.replace(' — заглушка', ''); return `${LINES[l.line].kind === 'item' ? n : n.toLowerCase()} ${pctQ(new Q(l.w, W))}`; }).join(', ');
      groups.set(txt, (groups.get(txt) || []).concat(x));
    }
    const line = [...groups].map(([txt, xs]) => `${xs.length === 7 ? 'любая' : xs.map(rn).join(', ')} — ${txt}`).join('; ');
    if (rows.length && rows[rows.length - 1].line === line) rows[rows.length - 1].to = c; else rows.push({ from: c, to: c, line });
  }
  rows.forEach((r, i) => T.push(`| ${i ? '' : B.n} | ${ROMAN[r.from]}${r.to > r.from ? '–' + ROMAN[r.to] : ''} | ${r.line} |`));
}

/* каталог */
block('catalog');
T.push('| Сундук | Кто выдаёт | Линии пула, вес | Предметов: обычный … вневременный | Гарантированная валюта: обычный … вневременный | Окна |', '|---|---|---|---|---|---|');
for (const [id, B] of Object.entries(BOXES)) {
  const who = Object.values(MODES).filter(m => m.box === id).map(m => m.n + (m.proposal ? ' — предложение' : '')).join('; ');
  const lines = B.lines.map(([ln, w, from]) => `${LINES[ln].n.replace(' — заглушка', '')} ${w}${from ? ` · с цикла ${ROMAN[from]}` : ''}`).join('; ');
  const cur = Object.entries(B.cur).map(([k, a]) => `${CURRENCY[k].toLowerCase()} ${a.map(fmt).join(' / ')}`).join('; ');
  const wins = [...new Set(Object.entries(PAY).filter(([mid]) => MODES[mid].box === id).flatMap(([, P]) => P.layers.flatMap(l => l.rows.flatMap(r => Object.values(r.cyc).flat().map(g => g.win)))))].map(w => WIN_NAMES[w]).join(', ');
  T.push(`| ${B.n} | ${who} | ${lines} | ${B.items.join(' / ')} | ${cur} | ${wins} |`);
}

/* выплаты режимов */
for (const mid of ['echo', 'contract', 'arena', 'league', 'clan', 'event']) {
  const m = MODES[mid];
  block('pay_' + mid);
  const cycles = [2, 3, 4, 5, 6];
  T.push(`| ${m.n} | ${cycles.map(c => ROMAN[c]).join(' | ')} |`, '|---|' + cycles.map(() => '---').join('|') + '|');
  for (const ly of PAY[mid].layers) for (const row of ly.rows) {
    const lab = `${ly.one}${ly.kind === 'plank' ? ' ' + row.label.replace('планка ', '') : ': ' + row.label}${ly.kind === 'plank' && row.x > 1 ? ` · ×${row.x} очков` : ''}${ly.clan ? ' · на участника' : ''}`;
    T.push(`| ${lab} | ${cycles.map(c => gotLabel(row.cyc[c] || [])).join(' | ')} |`);
  }
}
block('pay_craft');
T.push('| Крафтовый босс | Цикл | Сундук за победу | Шардов рабочих: штук / очки редкости | Талисманов: штук / очки редкости | Золото |', '|---|---|---|---|---|---|');
for (const { row, c, ev } of CRAFT) T.push(`| ${row.label} | ${ROMAN[c]} | ${gotLabel(row.cyc[c])} | ${fx(ev.wsh, 1)} / ${fx(ev.wshV, 1)} | ${fx(ev.tal, 1)} / ${fx(ev.talV, 1)} | ${fmt(ev.gold.int(0))} |`);
block('pay_first');
T.push('| Биом | Цикл | Сундук странника |', '|---|---|---|');
for (const row of PAY.first.layers[0].rows) T.push(`| ${row.label} | ${ROMAN[row.only]} | ${gotLabel(row.cyc[row.only])} |`);
block('pay_once');
T.push('| Основание | Сколько раз | I | II | III | IV | V | VI |', '|---|---|---|---|---|---|---|---|');
for (const mid of ['feats', 'calendar']) for (const row of PAY[mid].layers[0].rows)
  T.push(`| ${MODES[mid].n}: ${row.label.toLowerCase()} | ${row.count ? '~' + row.count : row.days ? row.days + ' в месяц' : 'по первенствам'} | ${[1, 2, 3, 4, 5, 6].map(c => gotLabel(row.cyc[c] || [], false)).join(' | ')} |`);

/* пул по циклам */
block('pool');
T.push('| Цикл | Ресурсы: базовые / ключи ремёсел цикла / уникальные цикла | Героев недели в сундуке осколков | Многоликий и прах | Талисманы в сундуке крафтового босса |', '|---|---|---|---|---|');
for (let c = 1; c <= 6; c++) {
  const team = [...pools.key[c], ...pools.unique[c]].some(id => byId[id].team);
  T.push(`| ${ROMAN[c]}${team ? ' · для команды' : ''} | ${pools.basic.length} / ${pools.key[c].length} / ${pools.unique[c].length} | ${c >= 2 ? heroesByWeek[WEEKS[0]].filter(h => h.cyc <= c).length : '— · Эхо с цикла II'} | ${c >= LINES.many.from ? 'есть' : '—'} | ${c >= BOXES.craft.lines.find(l => l[0] === 'tal')[2] ? 'есть' : '—'} |`);
}
block('heroes');
T.push('| Неделя | II | III | IV | V | VI |', '|---|---|---|---|---|---|');
for (const w of WEEKS) T.push(`| ${w} | ${[2, 3, 4, 5, 6].map(c => { const h = heroesByWeek[w].find(x => x.cyc === c); return h ? `${heroInfo[h.id].n} · ${rn(h.r)}` : '—'; }).join(' | ')} |`);
block('talismans');
T.push(`| Редкость | Талисманов | ${TAL_CATS.map((k, i) => i ? k.toLowerCase() : k).join(' / ')} | Сумма весов |`, '|---|---|---|---|');
for (let r = 1; r <= 7; r++) { const cat = talCat[r] || {}; T.push(`| ${rn(r)} | ${(talByR[r] || []).length} | ${TAL_CATS.map(k => cat[k] || 0).join(' / ')} | ${fmt((talByR[r] || []).reduce((a, t) => a + t[1], 0))} |`); }

/* ожидаемое в одном сундуке — цикл III */
block('ev_box');
const REF = 3;
inline.refCycle = ROMAN[REF];
T.push(`| Сундук | Мера | ${BOX_RARITY.join(' | ')} |`, '|---|---|' + BOX_RARITY.map(() => '---').join('|') + '|');
const mainName = { shards: 'осколки героев', keys: 'рунные ключи', talV: 'очки редкости талисманов', wshV: 'очки редкости рабочих', equipV: 'очки редкости снаряжения', craftV: 'очки редкости: рабочие и талисманы', dust: 'прах' };
for (const [id, B] of Object.entries(BOXES)) {
  const cells = [];
  for (let r = 1; r <= 7; r++) { const v = evOf({ box: id, r, win: 'step', cyc: REF, week: id === 'shards' ? WEEKS[0] : null }); cells.push(fx(v[B.main], 1)); }
  T.push(`| ${B.n} | ${mainName[B.main]} | ${cells.join(' | ')} |`);
}
{
  const cells = []; for (let r = 1; r <= 7; r++) cells.push(fx(evOf({ box: 'shards', r, win: 'pure', cyc: REF, week: WEEKS[0] }).shards, 1));
  T.push(`| Сундук осколков, чистое окно | осколки героев | ${cells.join(' | ')} |`);
  const res = []; for (let r = 1; r <= 7; r++) res.push(fmt(evOf({ box: 'keys', r, win: 'step', cyc: REF }).resGold.int(0)));
  T.push(`| Сундук ключей | ресурсы, золото по цене рынка | ${res.join(' | ')} |`);
}

/* неделя: обычный / увлечённый */
block('ev_week');
T.push('| Режим | Мера | II | III | IV | V | VI |', '|---|---|---|---|---|---|---|');
const wk = (mid, led, f = q => fx(q, 1)) => [2, 3, 4, 5, 6].map(c => { const W = WEEK[mid][c]; return `${f(W.free.ev[led])} / ${f(W.fan.ev[led])}`; }).join(' | ');
const wkBoxes = mid => [2, 3, 4, 5, 6].map(c => `${WEEK[mid][c].free.boxes} / ${WEEK[mid][c].fan.boxes}`).join(' | ');
T.push(`| Эхо | сундуков | ${wkBoxes('echo')} |`);
T.push(`| Эхо | осколков | ${wk('echo', 'shards')} |`);
T.push(`| Эхо | на героя отряда | ${[2, 3, 4, 5, 6].map(c => `${fx(WEEK.echo[c].free.ev.shards.div(new Q(c - 1)), 1)} / ${fx(WEEK.echo[c].fan.ev.shards.div(new Q(c - 1)), 1)}`).join(' | ')} |`);
T.push(`| Эхо | недель на комплект нового героя, ${ASSUME.shardsPerHero} осколков | ${[2, 3, 4, 5, 6].map(c => `${fx(new Q(ASSUME.shardsPerHero * (c - 1)).div(WEEK.echo[c].free.ev.shards), 1)} / ${fx(new Q(ASSUME.shardsPerHero * (c - 1)).div(WEEK.echo[c].fan.ev.shards), 1)}`).join(' | ')} |`);
T.push(`| Контракты | рунных ключей | ${wk('contract', 'keys')} |`);
T.push(`| Контракты | доля ключей на кап рунных стражей за неделю | ${[2, 3, 4, 5, 6].map(c => { const cap = new Q(capKeysWeek(c)); return `${pctQ(WEEK.contract[c].free.ev.keys.div(cap))} / ${pctQ(WEEK.contract[c].fan.ev.keys.div(cap))}`; }).join(' | ')} |`);
T.push(`| Арена | предметов снаряжения | ${wk('arena', 'eq')} |`);
T.push(`| Арена | очков редкости снаряжения | ${wk('arena', 'equipV')} |`);
T.push(`| Лига | предметов снаряжения | ${wk('league', 'eq')} |`);
T.push(`| Клановый босс | талисманов на участника | ${wk('clan', 'tal')} |`);
T.push(`| Клановый босс | очков редкости талисманов | ${wk('clan', 'talV')} |`);
T.push(`| Событие | шардов рабочих | ${wk('event', 'wsh')} |`);
T.push(`| Событие | рабочих, по ${ASSUME.workerShards} шардов | ${wk('event', 'wsh', q => fx(q.div(new Q(ASSUME.workerShards)), 1))} |`);
{
  const K = ASSUME.craftKills, boss = c => CRAFT.find(x => x.c === c);
  const cell = (c, led) => { const b = boss(c); return b ? `${fx(b.ev[led].mul(new Q(K.free)), 1)} / ${fx(b.ev[led].mul(new Q(K.fan)), 1)}` : '—'; };
  T.push(`| Крафтовые боссы, побед в неделю: ${K.free} / ${K.fan} | шардов рабочих | ${[2, 3, 4, 5, 6].map(c => cell(c, 'wsh')).join(' | ')} |`);
  T.push(`| Крафтовые боссы, побед в неделю: ${K.free} / ${K.fan} | талисманов | ${[2, 3, 4, 5, 6].map(c => cell(c, 'tal')).join(' | ')} |`);
}
function capKeysWeek(c) {   // ключей на кап побед у рунных стражей за неделю: вход 1 × цикл и 3 × цикл, доля 7 : 3
  const g = REC.drops.guardians.filter(x => x.cyc === c), lim = g.find(x => x.kind === 'limits').entryKeys, val = g.find(x => x.kind === 'valor').entryKeys;
  return ASSUME.rb.cap * 7 * (lim * ASSUME.rb.shareBp[0] + val * ASSUME.rb.shareBp[1]) / 10000;
}
{
  const all = (c, who) => Object.keys(WEEK).reduce((a, mid) => addEv(a, WEEK[mid][c][who].ev), EMPTY);
  block('ev_income');
  T.push('| Цикл | Кто | Сундуков в неделю | Золото сундуков | Доля недельного золота | Дух сундуков | Доля недельного духа | Ресурсы, золото по цене рынка |', '|---|---|---|---|---|---|---|---|');
  for (const c of [2, 3]) for (const who of ['free', 'fan']) {
    const e = all(c, who), boxes = Object.keys(WEEK).reduce((a, mid) => a + WEEK[mid][c][who].boxes, 0), d = ASSUME.day[c][who];
    T.push(`| ${ROMAN[c]} | ${who === 'free' ? 'обычный' : 'увлечённый'} | ${boxes} | ${fmt(e.gold.int(0))} | ${pctQ(e.gold.div(new Q(d.gold * 7)))} | ${fmt(e.spirit.int(0))} | ${pctQ(e.spirit.div(new Q(d.spirit * 7)))} | ${fmt(e.resGold.int(0))} |`);
    if (c === 2 && who === 'free') { inline.goldShare2 = pctQ(e.gold.div(new Q(d.gold * 7))); inline.spiritShare2 = pctQ(e.spirit.div(new Q(d.spirit * 7))); inline.boxes2 = boxes; }
    if (c === 2 && who === 'fan') inline.boxes2fan = boxes;
  }
}

/* где заканчивают неделю обычный и увлечённый — допущение из данных */
block('typical');
T.push('| Режим | Обычный | Увлечённый |', '|---|---|---|');
const posLabel = (mid, who) => {
  const t = MODES[mid].typical[who];
  return MODES[mid].layers.filter(ly => ly.id in t).map(ly => {
    const v = t[ly.id], name = ly.n.toLowerCase();
    return ly.kind === 'plank' ? `${name}: ${v}-я из ${ly.rows.length}` : `${name}: ${v ? 'топ-' + v : 'все с очками'}`;
  }).join('; ');
};
for (const mid of Object.keys(WEEK)) T.push(`| ${MODES[mid].n} | ${posLabel(mid, 'free')} | ${posLabel(mid, 'fan')} |`);
{
  const range = (mid, f) => { const v = [2, 3, 4, 5, 6].flatMap(c => [f(WEEK[mid][c].free.ev)]); return [v.reduce((a, q) => q.cmp(a) < 0 ? q : a), v.reduce((a, q) => q.cmp(a) > 0 ? q : a, Q0)]; };
  const [t0, t1] = range('clan', e => e.tal), [w0, w1] = range('event', e => e.wsh.div(new Q(ASSUME.workerShards)));
  inline.talWeek = `${fx(t0, 0)}–${fx(t1, 0)}`; inline.workersWeek = `${fx(w0, 0)}–${fx(w1, 0)}`;
  const shares = [];
  for (const c of [2, 3]) for (const who of ['free', 'fan']) {
    const e = Object.keys(WEEK).reduce((a, mid) => addEv(a, WEEK[mid][c][who].ev), EMPTY), d = ASSUME.day[c][who];
    shares.push(e.gold.div(new Q(d.gold * 7)), e.spirit.div(new Q(d.spirit * 7)));
  }
  inline.curShare = `${fx(shares.reduce((a, q) => q.cmp(a) < 0 ? q : a).mul(new Q(100)), 0)}–${fx(shares.reduce((a, q) => q.cmp(a) > 0 ? q : a, Q0).mul(new Q(100)), 0)} %`;
  const lik = REC.drops.craftBosses.find(b => b.id === 'lik');
  /* доля недельных осколков героев в базисных пунктах (ADR-0025): 1350 → «13,5 %» */
  inline.likShards = lik && lik.heroShardsWeekBp != null ? `${Math.floor(lik.heroShardsWeekBp / 100)}${lik.heroShardsWeekBp % 100 ? ',' + String(lik.heroShardsWeekBp % 100).replace(/0+$/, '') : ''} %` : '—';
  inline.boxesFreeRange = [2, 3, 4, 5, 6].map(c => Object.keys(WEEK).reduce((a, mid) => a + WEEK[mid][c].free.boxes, 0)).filter((v, i, a) => a.indexOf(v) === i).join('–');
}

/* законы */
block('x17');
T.push('| Режим | Слой | Худший шаг: планка, цикл, мера | Прибавка к накопленному | Не больше ×1,7 |', '|---|---|---|---|---|');
const ledName = { shards: 'осколки', keys: 'ключи', talV: 'талисманы', wshV: 'рабочие', equipV: 'снаряжение', gold: 'золото', spirit: 'дух', dust: 'прах' };
for (const x of x17) T.push(`| ${x.mode} | ${x.layer}${x.clan ? ', на участника' : ''} | ${x.worst.k}-я, ${ROMAN[x.worst.c]}, ${ledName[x.worst.led] || x.worst.led} | ×${fx(x.worst.ratio, 2)} | ${x.worst.ratio.cmp(X17) <= 0 ? 'да' : 'нет'} |`);
inline.x17worst = '×' + fx(x17.reduce((a, x) => x.worst.ratio.cmp(a) > 0 ? x.worst.ratio : a, Q0), 2);
inline.clanPayer = '×' + fx(new Q(ASSUME.payerPts[0] + ASSUME.payerPts[1], 2 * ASSUME.payerPts[1]), 2);
inline.payerPts = '×' + fx(new Q(ASSUME.payerPts[0], ASSUME.payerPts[1]), 2);
block('spread');
T.push('| Цикл | Первая планка, осколков | Все планки | Лучшее место | Разброс, не больше ×8 | Последняя планка следующего цикла / топ-100 этого |', '|---|---|---|---|---|---|');
for (const s of spread) {
  const rt = retention.find(x => x.c === s.c);
  T.push(`| ${ROMAN[s.c]} | ${fx(s.first, 1)} | ${fx(s.all, 1)} | ${fx(s.best, 1)} | ×${fx(s.s, 1)} ${s.ok ? 'да' : 'нет'} | ${rt ? `${fx(rt.lastNext, 1)} / ${fx(rt.midNow, 1)} ${rt.ok ? 'да' : 'нет'}` : '—'} |`);
}

/* лишние осколки */
block('dust');
T.push(`| Лишний осколок: редкость героя | Нужный: ${[3, 4, 5, 6, 7].map(rn).join(' | ')} |`, '|---|---|---|---|---|---|');
for (let a = 3; a <= 7; a++) T.push(`| ${rn(a)} | ${[3, 4, 5, 6, 7].map(b => fx(new Q(DUST.price[b - 1], DUST.perShard[a - 1]), 2)).join(' | ')} |`);
/* неделя Эхо в поздних циклах: герои отряда прошлых циклов пробуждены — их осколки уходят в прах. Прах покупает осколки только героев
   рулетки (roster.js, rules.dustSrc — ADR-0030, п. 16: героев Эхо прахом не собрать), поэтому новый герой недели идёт только своими осколками */
block('dust_week');
T.push('| Цикл | Нового героя напрямую | Лишних: прежние герои отряда пробуждены | Праха из них — на героев рулетки | Недель на комплект нового |', '|---|---|---|---|---|');
for (let c = 3; c <= 6; c++) {
  const T0 = WEEK.echo[c].free.ev.shards, per = T0.div(new Q(c - 1));
  let dust = Q0;
  for (const w of WEEKS) {
    const hs = heroesByWeek[w].filter(h => h.cyc <= c), old = hs.filter(h => h.cyc < c);
    dust = dust.add(old.reduce((a, h) => a.add(per.mul(new Q(DUST.perShard[h.r - 1] * h.cyc))), Q0));
  }
  dust = dust.div(new Q(WEEKS.length));
  T.push(`| ${ROMAN[c]} | ${fx(per, 1)} | ${fx(per.mul(new Q(c - 2)), 1)} | ${fmt(dust.int(0))} | ${fx(new Q(ASSUME.shardsPerHero).div(per), 1)} |`);
  if (c === 6) { inline.dust6 = fmt(dust.int(0)); inline.per6 = fx(per, 1); inline.weeks6 = fx(new Q(ASSUME.shardsPerHero).div(per), 1); }
}

/* спойлеры в таблице талисманов */
block('spoilers');
T.push('| Талисман в таблице автора | Штук: редкости | Где спойлер | Почему — раздел дайджеста | Решение — `talismans.js` |', '|---|---|---|---|---|');
{
  const groups = new Map();
  for (const [no, sp] of Object.entries(talAuthor)) { if (!groups.has(sp.n)) groups.set(sp.n, { sp, nos: [] }); groups.get(sp.n).nos.push(+no); }
  for (const [n, g] of groups) {
    const rs = [...new Set(g.nos.map(no => Object.keys(talByR).find(r => talByR[r].some(t => t[0] === no))))].map(Number).sort((a, b) => a - b);
    const f = TLD.fams[TLD.items[g.nos[0]][0]], team = g.nos.some(no => talInfo[no][2]);
    const dec = [f.n !== n ? `имя — «${f.n}»` : '', f.d !== g.sp.d ? `описание — «${f.d}»` : '', team ? `в сундуках с цикла ${ROMAN[TEAM_FROM]}` : 'в сундуках всегда'].filter(Boolean).join('; ');
    T.push(`| ${n} | ${g.nos.length}: ${rs.length === 7 ? 'все семь' : rs.map(rn).join(', ')} | ${g.sp.where}${g.sp.where !== 'имя' ? `: «${g.sp.d}»` : ''} | ${g.sp.why} | ${dec} |`);
  }
  const teamNames = new Set(Object.keys(talSpoil).map(no => talInfo[no][0]));
  inline.spoilTal = Object.keys(talAuthor).length;
  inline.spoilNames = groups.size;
  inline.teamTal = Object.keys(talSpoil).length;
  inline.teamNames = [...teamNames].map(x => `«${x}»`).join(' и ');
  inline.teamRoman = ROMAN[TEAM_FROM];
}

/* проверки */
block('checks');
const heroCount = Object.values(heroesByWeek).reduce((a, l) => a + l.length, 0);
const talCount = Object.values(talByR).reduce((a, l) => a + l.length, 0);
T.push(`- окна: у каждого окна и редкости сундука сумма — 10 000 б. п.; ни в одном сундуке нет редкости без записей — развёрнуто сундуков: ${DEF.size}, это все виды, редкости, окна и циклы, а у сундука осколков — ещё все недели выплат;`);
T.push(`- пул: ресурсов из \`recipes.js\` — ${Object.keys(itemsOut).length}, все падают, а не создаются рецептом; героев Эхо из \`состав-героев.csv\` — ${heroCount}; талисманов из таблицы автора — ${talCount};`);
T.push(`- достижимость: каждый герой Эхо, все семь редкостей талисманов, рабочих и снаряжения выпадают хотя бы из одного сундука${unreached.res.length ? `; не выпадают ${unreached.res.length} ресурсов — уникальные ранних циклов: окна сундуков этих циклов не доходят до первородной` : ''};`);
T.push(`- запреты: ни душ, ни Энериума, ни рун, ни предметов из рецептов, ни героев крафта;`);
T.push(`- открытие: сундуков — ${fmt(mcCount)}, у каждого ${fmt(RULES.mcOpens)} открытий на сиде; среднее главной меры отличается от расчёта не больше чем на ${pct(mcWorst.dev)} и лежит в пределах ${RULES.mcZ} стандартных ошибок;`);
T.push(`- генератор: ${rngSame === null ? 'не сверен — battle.js не загрузился' : 'тот же, что у ядра боя прототипа, выход совпадает'};`);
T.push(`- законы: ×1,7 по планкам всех режимов — худший шаг ${inline.x17worst}; разброс Эхо не больше ×${RULES.spreadMax} во всех циклах${spread.every(s => s.ok) ? '' : ' — нарушен, см. предупреждения'}; удержание §17.6 — ${retention.every(r => r.ok) ? 'держится' : 'нарушено'}.`);
if (unreached.res.length) inline.unreachedRes = unreached.res.map(nameOf).join(', ');

/* числа для текста */
Object.assign(inline, {
  boxTypes: Object.keys(BOXES).length, modes: Object.keys(MODES).length, heroes: heroCount, talismans: talCount, resources: Object.keys(itemsOut).length,
  shardsPerHero: ASSUME.shardsPerHero, workerShards: ASSUME.workerShards,
  echoFree2: fx(WEEK.echo[2].free.ev.shards, 1), echoFan2: fx(WEEK.echo[2].fan.ev.shards, 1),
  echoFree6: fx(WEEK.echo[6].free.ev.shards, 1), echoFan6: fx(WEEK.echo[6].fan.ev.shards, 1),
  echoPerHeroMin: fx([2, 3, 4, 5, 6].map(c => WEEK.echo[c].free.ev.shards.div(new Q(c - 1))).reduce((a, q) => q.cmp(a) < 0 ? q : a), 0),
  echoPerHeroMax: fx([2, 3, 4, 5, 6].map(c => WEEK.echo[c].free.ev.shards.div(new Q(c - 1))).reduce((a, q) => q.cmp(a) > 0 ? q : a, Q0), 0),
  itemsRange: `${Math.min(...Object.values(BOXES).flatMap(b => b.items))}–${Math.max(...Object.values(BOXES).flatMap(b => b.items))}`,
  echoWeeks: (() => { const v = [2, 3, 4, 5, 6].map(c => new Q(ASSUME.shardsPerHero * (c - 1)).div(WEEK.echo[c].free.ev.shards)); return `${fx(v.reduce((a, q) => q.cmp(a) < 0 ? q : a), 1)}–${fx(v.reduce((a, q) => q.cmp(a) > 0 ? q : a, Q0), 1)}`; })(),
  keysFree6: fx(WEEK.contract[6].free.ev.keys, 1), keysShare6: pctQ(WEEK.contract[6].free.ev.keys.div(new Q(capKeysWeek(6)))),
  keysFree2: fx(WEEK.contract[2].free.ev.keys, 1), keysCap2: fmt(capKeysWeek(2)),
  keysShare2: pctQ(WEEK.contract[2].free.ev.keys.div(new Q(capKeysWeek(2)))),
  ctFree: MODES.contract.typical.free.me, ctFan: MODES.contract.typical.fan.me,
  mcOpens: fmt(RULES.mcOpens), mcCount: fmt(mcCount), mcDev: pct(mcWorst.dev), defs: fmt(DEF.size),
  winStep: WINDOWS.step[4].map(([x, bp]) => pct(bp)).join(' / '), winWild: WINDOWS.wild.map(([, bp]) => pct(bp).replace(' %', '')).join(' / ') + ' %',
});
block('inline');
for (const [k, v] of Object.entries(inline)) T.push(`${k}: ${v}`);

/* ---------- lootboxes.js ---------- */
const J = v => Array.isArray(v) ? '[' + v.map(J).join(', ') + ']'
  : v && typeof v === 'object' ? '{ ' + Object.entries(v).map(([k, x]) => (/^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + J(x)).join(', ') + ' }'
  : JSON.stringify(v);
const ev100 = v => Object.fromEntries(['shards', 'keys', 'tal', 'talV', 'wsh', 'wshV', 'eq', 'equipV', 'dust', 'gold', 'spirit', 'resGold', 'many'].filter(k => !v[k].zero()).map(k => [k, v[k].int(2)]));
const evTable = {};
for (const id of Object.keys(BOXES)) {
  evTable[id] = {};
  for (let c = 1; c <= 6; c++) evTable[id][c] = Object.fromEntries(Object.keys(WIN_NAMES).map(win => [win, BOX_RARITY.map((_, i) => ev100(evOf({ box: id, r: i + 1, win, cyc: c, week: id === 'shards' ? WEEKS[0] : null })))]));
}
const modesOut = {};
for (const [mid, m] of Object.entries(MODES)) modesOut[mid] = { n: m.n, box: m.box, basis: m.basis, from: m.from, proposal: !!m.proposal, weekly: !!m.weekly, typical: m.typical || null,
  layers: PAY[mid].layers.map(ly => ({ id: ly.id, n: ly.n, one: ly.one || ly.n, kind: ly.kind, clan: !!ly.clan, rows: ly.rows.map(r => ({ label: r.label, x: r.x, top: r.top, team: r.team, days: r.days, cyc: r.cyc })) })) };
const weekOut = {};
for (const mid of Object.keys(WEEK)) { weekOut[mid] = {}; for (const c of Object.keys(WEEK[mid])) weekOut[mid][c] = { free: Object.assign({ boxes: WEEK[mid][c].free.boxes }, ev100(WEEK[mid][c].free.ev)), fan: Object.assign({ boxes: WEEK[mid][c].fan.boxes }, ev100(WEEK[mid][c].fan.ev)) }; }
const DATA = Object.assign({}, L, {
  items: itemsOut, heroInfo, talInfo, talSpoil,
  workers: RARITY.map(r => 'Рабочий · ' + r), equip: RARITY.map(r => 'Предмет снаряжения · ' + r),
  modes: modesOut, ev: evTable, week: weekOut, assume: ASSUME,
});
const ints = (o, p) => { if (typeof o === 'number') { if (!Number.isInteger(o)) err.push('не целое в выводе: ' + p); } else if (o && typeof o === 'object') for (const k in o) ints(o[k], p + '.' + k); };
ints(DATA, 'EN_LOOTBOXES');
if (err.length) fail();

const OPEN_SRC = fs.readFileSync(FILES.open, 'utf8').replace(/\r\n/g, '\n');
const js = `/* Энериум · лутбоксы — данные прототипа «Свет снизу» для раздела «Лутбоксы» в UI-ките.
   Черновик · предложение · ждёт автора. Собирается tools/content-gen/lootboxes/ (node build.js), вручную не править.
   Все числа — демонстрация; шансы — в базисных пунктах (10 000 = 100 %); ожидаемые значения (ev, week) — в сотых долях.
   Обоснование — docs/content/лутбоксы.md; его таблицы собраны из этих же данных.
   В игре таблицы наград живут только на сервере (CLAUDE.md, инварианты; GDD §34, §36.16): клиент получает карточку сундука —
   тип, редкость, количество, возможное содержимое и шансы, — а итог открытия присылает сервер. Здесь полный набор — для проектирования.
   Спойлеры цикла VI — только для команды: у ресурсов team: true, у талисманов третье поле talInfo — 1: линейка «для команды»
   в talismans.js, в сундуках — только с цикла VI. Имена, описания и виды талисманов — из talismans.js.
   Ниже данных — алгоритм открытия (window.EnLoot), тот же, что в сборщике. */
window.EN_LOOTBOXES = {
${Object.entries(DATA).map(([k, v]) => `  ${k}: ${J(v)}`).join(',\n')},
};

${OPEN_SRC}`;
fs.writeFileSync(FILES.outJs, js, 'utf8');
const tablesMd = T.join('\n').replace(/^\n/, '') + '\n';
fs.writeFileSync(FILES.tables, tablesMd, 'utf8');

/* ---------- документ ---------- */
const NL = '\n';
const blocks = {}; { const re = /<!-- (.+?) -->\n([\s\S]*?)(?=\n<!-- |$)/g; let m; while ((m = re.exec(tablesMd))) blocks[m[1]] = m[2].trim(); }
let doc = fs.readFileSync(FILES.doc, 'utf8').replace(/\r\n/g, NL);
doc = doc.replace(/@@(.+?)@@/g, (_, k) => { if (!(k in blocks)) throw new Error('doc.md: нет блока ' + k); return NL + blocks[k] + NL; });
doc = doc.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in inline)) throw new Error('doc.md: нет числа ' + k); return String(inline[k]); });
doc = doc.replace(/\n{3,}/g, NL + NL);
fs.writeFileSync(FILES.outDoc, doc, 'utf8');

if (warn.length) console.log('Предупреждения:\n' + warn.join('\n'));
console.log(`Готово: ${Object.keys(BOXES).length} сундуков, ${Object.keys(MODES).length} источников, развёрнуто ${DEF.size}; открытий на сиде — ${mcCount} × ${RULES.mcOpens}, худшее отклонение ${pct(mcWorst.dev)}.`);
console.log(`Эхо, осколков в неделю, обычный / увлечённый: II ${inline.echoFree2} / ${inline.echoFan2}, VI ${inline.echoFree6} / ${inline.echoFan6}. ×1,7 — худший шаг ${inline.x17worst}.`);

function fail() {
  if (warn.length) console.log('Предупреждения:\n' + warn.join('\n'));
  console.log('ОШИБКИ:\n' + [...new Set(err)].join('\n'));
  process.exit(1);
}
