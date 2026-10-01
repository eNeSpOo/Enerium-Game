/* Контракты — калькулятор и сборщик: GDD §18, §1.2, §3.1, §8–§12, §15–§17, §19, §20, §23–§27, §36; ADR-0014, ADR-0018, ADR-0022,
   ADR-0023, ADR-0026–ADR-0028. Черновик · предложение · ждёт автора. Все числа — демонстрация.

   Что считает:
   1. Каталог заданий — только то, что в игре реально можно делать: этажи и элиты, боссы, рунные стражи, мастерская и рецепты,
      Эхо, Арена и Лига, ритуалы и рабочие, лавка и рынок, развитие героев, прах Возрождения душ, клан, Событие.
   2. Объём задания по редкости: ёмкость занятия у обычного игрока (3 ч в день) × сетка времени §18.5 — неделя: 1 / 1,5 / 2 / 3 /
      3,5 / 4 / 5 дня; день — те же доли седьмыми дня. Ёмкость — калькуляторы экономики (capacity.json) и допущения ниже.
      Вид задания выдаётся на редкости, только если после округления объём не дальше допуска от сетки.
   3. Прогон: пул на сиде тем же алгоритмом, что у прототипа (offer.js), замены, отмена, подпись, исход по активности дня —
      у обычного, увлечённого (8 ч) и плательщика при времени обычного. Сколько контрактов исполнено, сколько очков и наград.
   4. Награды: цель — доля недельного дохода обычного игрока (ключи — доля капа рунных стражей), делённая на исполненные
      задание-дни. Энериум — с эпической редкости, без цикла. Заверение — ×2 наград, не очков, ставка — 2 × золото пула.
   5. Проверки: объёмы и время, цели наград, ключи против капа, правило ×1,7 (§1.2), Энериум не окупает платные замены, пороги планок.

   Пишет:
   - design/ui/contracts.js — данные прототипа (window.EN_CONTRACTS) и алгоритм пула (window.EnContracts из offer.js), руками не править;
   - docs/content/контракты.md — только таблицы: каждая между метками «<!-- @таблица имя -->» и «<!-- /таблица имя -->»; текст — ручной.
   Читает: capacity.json (python tools/content-gen/contracts/capacity.py), design/ui/lootboxes.js (сундук ключей, сундуки рейтинга,
   шарды рабочих), design/ui/recipes.js (ключ с босса, вход к стражам), design/ui/wanderer.js (артефакты и Память о контрактах),
   design/ui/echo-rules.js (раунды атак Эхо — для очков События), правила сборщика События tools/content-gen/event/build.js — цены единиц,
   дневные потолки и ёмкость дня (dayUnits, dayPoints100) без контрактов. event.js не читается: Событие собирается после контрактов
   и само читает их прогон — круга нет.
   Лига — одно правило в данных: tools/content-gen/arena/rules.js, league (цикл рейтинга и порог 15 разных героев, как на экране Лиги).
   Когда обычный и увлечённый его набирают — одно место: leagueOpen в tools/content-gen/wanderer/achievements-pace.js (герои за золото —
   wanderer/pace-inputs.json, герои Эхо — lootboxes.js, каталог за золото — design/ui/roster.js). В прогоне недели до открытия Лиги
   заданий Лиги не выдаются: доля недель — доля дней цикла с открытой Лигой.
   Любая ошибка — файлы не пишутся. Пересборка даёт те же байты.
   Запуск: node tools/content-gen/contracts/build.js           — собрать и записать;
           node tools/content-gen/contracts/build.js --check   — только проверить, что файлы свежие.
   Из других скриптов: require('./build.js').build() — { data, tables, sim, err, warn } без записи. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const OC = require('./offer.js');
const EVB = require('../event/build.js');   // только правила События: цены, потолки, ёмкость дня — не его вывод event.js
const LEAGUE = require('../arena/rules.js').RULES_SRC.league;   // Лига: цикл рейтинга и порог героев — одно правило в данных
const ACH = require('../wanderer/achievements.js'), AP = require('../wanderer/achievements-pace.js');   // темп героев: когда открыта Лига
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  cap: path.join(__dirname, 'capacity.json'),
  offer: path.join(__dirname, 'offer.js'),
  loot: path.join(ROOT, 'design', 'ui', 'lootboxes.js'),
  recipes: path.join(ROOT, 'design', 'ui', 'recipes.js'),
  wanderer: path.join(ROOT, 'design', 'ui', 'wanderer.js'),
  echo: path.join(ROOT, 'design', 'ui', 'echo-rules.js'),
  roster: path.join(ROOT, 'design', 'ui', 'roster.js'),
  paceIn: path.join(ROOT, 'tools', 'content-gen', 'wanderer', 'pace-inputs.json'),
  out: path.join(ROOT, 'design', 'ui', 'contracts.js'),
  doc: path.join(ROOT, 'docs', 'content', 'контракты.md'),
};

/* ================================ ДАННЫЕ ================================ */

const RARITY = ['обычная', 'редкая', 'уникальная', 'эпическая', 'древняя', 'первородная', 'вневременная'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/* Правила §18 и таблиц автора. Числа — демонстрация. */
const RULES = {
  bp: 10000,
  openLevel: 10, openCycle: 2,            // §16, §18: квесты открывает 10-й уровень — начало цикла II
  cycles: [2, 3, 4, 5, 6],
  tables: ['d', 'w'],                     // §18.1: дневная — до конца дня, недельная — до отсечки недели
  tableName: { d: 'Дневной', w: 'Недельный' },
  perTable: 1,                            // §18.1: из каждой таблицы принять контракт можно один раз за период
  pool: { base: 3, art: 'a12', mem: 'p188' },   // §18.2: пул 3; артефакт «Доска у ворот» +2 за уровень, Память «Второй подряд» +1
  rer: { free: 3, art: 'a13', price: 5, paidCap: 8, shared: true },
  // §18.2: 3 бесплатных замены + артефакт «Кости писаря», Память и достижения; дальше 5 Энериума. Бесплатные — одни на обе таблицы
  // и сгорают в конце дня. Платных — не больше 8 в день: чтобы рейтинг и награды не покупались заменами (§36.3, §1.2). Было 10:
  // правило ×1,7 и к обычному профилю (ADR-0031, п. 9) — плательщик при 10 заменах набирал очков ×1,71 к обычному в цикле II, при 8 — ×1,63
  cert: { mul: 2, stakePct: 200, one: true, both: 'p199', disc: { p60: 1000, p109: 2000, p157: 3000 } },
  // §18.5: заверение — ×2 на награды, не на очки. Ставка — 2 × золото пула: платишь золотом за второй пул ключей и ресурсов.
  // Ставка уходит при подписи: исполнил — пул ×2, сорвал — ставка сгорает со всем. Заверить можно один контракт из двух —
  // так в таблице Памяти автора: «Заверенное слово» разрешает оба. «Печати» Памяти снижают ставку на 10 / 20 / 30 %
  cutoffMin: 60,                          // §18.6, §1.1: приём закрывается за час до серверного подсчёта недели
  points: [10, 20, 40, 80, 160, 320, 640],   // §18.5: очки за задание — 10 × 2^(редкость − 1)
  splitBp: 5000,                          // §18.1: ½ очков — личный и клановый рейтинг, ½ — резервуар клана
  mods: {                                 // Память Странника о контрактах (таблица автора): прибавки к награде и скидки
    gold: { p11: 300, p61: 500, p108: 1000, p143: 1500 },   // награда золотом +3 / 5 / 10 / 15 %
    res: { p32: 500, p79: 1000, p106: 1500 },               // награда ресурсами +5 / 10 / 15 %
    rer: { p107: 1, p150: 2, p171: 3 },                     // бесплатных замен в день
    late: 'p182',                                           // «Отсрочка Странника» — показ, в расчётах нет: спорит с одной отсечкой §1.1
  },
};

/* Редкость задания: шанс броска, сетка времени, допуски объёма. */
const RAR = {
  wBp: [4500, 2000, 1500, 1000, 600, 300, 100],   // шанс редкости в каждом броске — кривая Памяти §2.6 и «шального» окна сундуков
  u10: [10, 15, 20, 30, 35, 40, 50],               // сетка §18.5 в десятых: неделя — дней, день — седьмых долей дня
  tolBp: 3000,                                     // объём после округления — не дальше 30 % от сетки, иначе вид на этой редкости не выдаётся
  maxDayBp: 8000,                                  // дневное задание — не больше 80 % дня обычного игрока
  maxWeekBp: 55000,                                // недельное — не больше 5,5 дня: два дня запаса на жизнь (§18.5)
};

/* Группы: в одном контракте — не больше одного задания группы, чтобы одно занятие не закрывало два задания. */
const GROUPS = {
  bio: 'Этажи и рядовые', elite: 'Элиты и боссы', rb: 'Рунные стражи', craft: 'Мастерская', echo: 'Эхо', arena: 'Арена', league: 'Лига',
  rit: 'Ритуалы и рабочие', gold: 'Золото: лавка, рынок, найм', hero: 'Развитие героев', soul: 'Возрождение душ', clan: 'Клан', event: 'Событие',
};

/* Каталог. u — формы слова для счёта «1 / 2 / 5»; g — родительный для «из 1 / из 5»; t — таблицы; w — вес вида в броске; pace — как читать время:
   time — минуты игры, tries — доля дневных попыток, week — дни недели; go — куда ведёт «К делу»; p — иконка пути раздела;
   cap — ёмкость: src — счётчик capacity.json, fix — допущение в день, slot — на слот ритуала, wk — допущение в неделю;
   what — что засчитывается (текст игроку); need — условие игрока, его проверяет сервер при броске. */
const KINDS = [
  { id: 'floors', grp: 'bio', n: 'Взять этажи', u: ['этаж', 'этажа', 'этажей'], g: ['этажа', 'этажей'], t: 'dw', w: 10, pace: 'time', go: 'descent', p: 10, cap: { src: 'floors' }, what: 'Этажи, взятые в любом биоме.' },
  { id: 'foes', grp: 'bio', n: 'Победить рядовых', u: ['рядовой', 'рядовых', 'рядовых'], g: ['рядового', 'рядовых'], t: 'dw', w: 10, pace: 'time', go: 'descent', p: 10, cap: { src: 'rf' }, what: 'Рядовые враги любого биома.' },
  { id: 'elites', grp: 'elite', n: 'Одолеть элиты', u: ['элита', 'элиты', 'элит'], g: ['элиты', 'элит'], t: 'dw', w: 10, pace: 'time', go: 'descent', p: 10, cap: { src: 'el' }, what: 'Элиты на этажах любого биома.' },
  { id: 'bosses', grp: 'elite', n: 'Сразить боссов биомов', u: ['босс', 'босса', 'боссов'], g: ['босса', 'боссов'], t: 'dw', w: 8, pace: 'time', go: 'descent', p: 10, cap: { src: 'boss' }, what: 'Босс биома пал — в любом биоме, осадой тоже.' },
  { id: 'guard', grp: 'rb', n: 'Победить рунных стражей', u: ['победа', 'победы', 'побед'], g: ['победы', 'побед'], t: 'dw', w: 8, pace: 'tries', go: 'descent', p: 27, cap: { fix: 'guard' }, what: 'Победа над рунным стражем любого биома и цикла.' },
  { id: 'craft', grp: 'craft', n: 'Создать предметы', u: ['предмет', 'предмета', 'предметов'], g: ['предмета', 'предметов'], t: 'dw', w: 8, pace: 'tries', go: 'craft:work', p: 11, cap: { fix: 'craft' }, what: 'Всё, что создано в мастерской: по найденным рецептам и новое.' },
  { id: 'recipe', grp: 'craft', n: 'Найти новые рецепты', u: ['рецепт', 'рецепта', 'рецептов'], g: ['рецепта', 'рецептов'], t: 'w', w: 5, pace: 'week', go: 'craft:work', p: 11, cap: { wk: 'recipe' }, need: 'recipes', what: 'Рецепт, которого ещё нет в книге.' },
  { id: 'echoAtk', grp: 'echo', n: 'Атаковать в Эхо', u: ['атака', 'атаки', 'атак'], g: ['атаки', 'атак'], t: 'dw', w: 10, pace: 'time', go: 'echo', p: 18, cap: { src: 'echoAtk' }, what: 'Атаки любых целей Эхо.' },
  { id: 'echoKill', grp: 'echo', n: 'Победить цели Эхо', u: ['цель', 'цели', 'целей'], g: ['цели', 'целей'], t: 'dw', w: 8, pace: 'time', go: 'echo', p: 18, cap: { src: 'echoKill' }, what: 'Цель Эхо пала от вашего отряда.' },
  { id: 'echoPts', grp: 'echo', n: 'Набрать очки Эхо', u: ['очко', 'очка', 'очков'], g: ['очка', 'очков'], t: 'w', w: 6, pace: 'time', go: 'echo', p: 18, cap: { src: 'echoPtsWeek', week: true }, what: 'Рейтинговые очки Эхо этой недели.' },
  { id: 'arena', grp: 'arena', n: 'Сразиться на Арене', u: ['бой', 'боя', 'боёв'], g: ['боя', 'боёв'], t: 'dw', w: 8, pace: 'tries', go: 'arena:arena', p: 3, cap: { fix: 'arena' }, what: 'Атаки на Арене, победа или нет.' },
  { id: 'arenaWin', grp: 'arena', n: 'Победить на Арене', u: ['победа', 'победы', 'побед'], g: ['победы', 'побед'], t: 'dw', w: 6, pace: 'tries', go: 'arena:arena', p: 3, cap: { fix: 'arenaWin' }, what: 'Победы в атаках на Арене.' },
  { id: 'league', grp: 'league', n: 'Сыграть матчи Лиги', u: ['матч', 'матча', 'матчей'], g: ['матча', 'матчей'], t: 'dw', w: 6, pace: 'tries', go: 'arena:league', p: 3, from: LEAGUE.from, cap: { fix: 'league' }, need: 'league', what: 'Сыгранные матчи Лиги.' },
  { id: 'ritual', grp: 'rit', n: 'Завершить ритуалы', u: ['ритуал', 'ритуала', 'ритуалов'], g: ['ритуала', 'ритуалов'], t: 'dw', w: 10, pace: 'tries', go: 'rituals', p: 33, cap: { slot: 'ritual' }, what: 'Ритуалы рабочих и героев: награда забрана.' },
  { id: 'workers', grp: 'rit', n: 'Пробудить рабочих', u: ['рабочий', 'рабочих', 'рабочих'], g: ['рабочего', 'рабочих'], t: 'w', w: 4, pace: 'week', go: 'rituals', p: 33, cap: { workers: true }, what: 'Рабочий, собранный из шардов и пробуждённый.' },
  { id: 'shop', grp: 'gold', n: 'Купить в лавке', u: ['золота', 'золота', 'золота'], g: ['золота', 'золота'], t: 'dw', w: 8, pace: 'time', go: 'craft:shop', p: 11, cap: { src: 'gold', bp: 1000 }, what: 'Золото, отданное за товары лавки. Покупки за Энериум не в счёт.' },
  { id: 'market', grp: 'gold', n: 'Торговать на рынке', u: ['золота', 'золота', 'золота'], g: ['золота', 'золота'], t: 'dw', w: 6, pace: 'time', go: 'craft:market', p: 11, cap: { src: 'gold', bp: 1000 }, what: 'Сумма сделок: купленные лоты и проданные свои, по цене сделки.' },
  { id: 'gold', grp: 'gold', n: 'Потратить золото', u: ['золота', 'золота', 'золота'], g: ['золота', 'золота'], t: 'dw', w: 8, pace: 'time', go: 'craft:shop', p: 11, cap: { src: 'gold', bp: 8000 }, what: 'Любые траты золота, кроме ставки этого контракта.' },
  { id: 'hire', grp: 'gold', n: 'Нанять героев за золото', u: ['герой', 'героя', 'героев'], g: ['героя', 'героев'], t: 'w', w: 5, pace: 'week', go: 'heroes:hire', p: 24, cap: { wk: 'hire' }, need: 'hire', what: 'Герой куплен за золото.' },
  { id: 'spirit', grp: 'hero', n: 'Вложить дух в уровни', u: ['духа', 'духа', 'духа'], g: ['духа', 'духа'], t: 'dw', w: 10, pace: 'time', go: 'heroes', p: 24, cap: { src: 'spirit' }, what: 'Дух, потраченный на уровни любых героев.' },
  { id: 'limit', grp: 'hero', n: 'Пробить рунные пределы', u: ['предел', 'предела', 'пределов'], g: ['предела', 'пределов'], t: 'w', w: 5, pace: 'week', go: 'heroes', p: 24, cap: { wk: 'limit' }, what: 'Рунный предел пробит у любого героя.' },
  { id: 'dust', grp: 'soul', n: 'Выкупить осколки за прах', u: ['праха', 'праха', 'праха'], g: ['праха', 'праха'], t: 'w', w: 4, pace: 'week', go: 'heroes:hire', p: 24, from: 3, cap: { dust: true }, need: 'dust', what: 'Прах душ, отданный за осколки героев в Возрождении душ.' },
  { id: 'clan', grp: 'clan', n: 'Атаковать врагов клана', u: ['атака', 'атаки', 'атак'], g: ['атаки', 'атак'], t: 'dw', w: 8, pace: 'tries', go: 'clan', p: 26, cap: { fix: 'clan' }, need: 'clan', what: 'Атаки по элитам и клановому боссу.' },
  { id: 'event', grp: 'event', n: 'Набрать очки События', u: ['очко', 'очка', 'очков'], g: ['очка', 'очков'], t: 'dw', w: 6, pace: 'time', go: 'event', p: 21, cap: { event: true }, what: 'Очки События за любые дела, кроме этого контракта.' },
];

/* Допущения ёмкости: в GDD чисел нет, в калькуляторах экономики — только эти. Все × 100 в день, недельные — × 100 в неделю. */
const ASSUME = {
  guard: { o: 700, e: 1000 },        // побед у рунных стражей: кап 10 в день (ADR-0022); обычному ключей хватает на ~70 % (§11), увлечённому — на весь
  craft: { o: 1200, e: 3000 },       // созданных предметов: рецепты цикла просят 1–3 базовых (recipes.js), горлышко — знание и ресурсы
  arena: { o: 1500, e: 2000 },       // атак: 20 в день (§20.2), обычный тратит не все
  arenaWin: { o: 750, e: 1000 },     // побед: половина атак — Эло при равных (§20.5)
  league: { o: 400, e: 600 },        // матчей в день открытой Лиги: 6 (§20.4); открыта — с порога героев (arena/rules.js, league), день — leagueOpen
  ritualSlot: { o: 200, e: 300 },    // ритуалов на слот в день — sets.py RITUALS; слотов — номер цикла и ещё один
  clan: { o: 400, e: 500 },          // атак по клановым врагам: 5 в день (§25.1)
  // лавка и рынок меряются золотом, а не штуками: одна дешёвая сделка стоит минуты, награда за неё была бы даром.
  // Лавке и рынку — по 10 % золота дня (bp у видов shop и market)
  week: {                            // недельные потоки, × 100 в неделю
    recipe: { 2: { o: 300, e: 600 }, 3: { o: 200, e: 400 }, 4: { o: 200, e: 400 }, 5: { o: 200, e: 400 }, 6: { o: 200, e: 400 } },   // рецептов цикла 17–26 (recipes.js)
    hire: { 2: { o: 300, e: 600 }, 3: { o: 300, e: 600 }, 4: { o: 300, e: 600 }, 5: { o: 300, e: 600 }, 6: { o: 300, e: 600 } },     // С10 сет-бонусов: к концу цикла II — 24 / 37 героев
    limit: { 2: { o: 500, e: 700 }, 3: { o: 500, e: 700 }, 4: { o: 500, e: 700 }, 5: { o: 500, e: 700 }, 6: { o: 500, e: 700 } },    // С8а: 7,5 / 8,1 победы у РБ, 70 % — страж пределов, 2 руны, 10 рун на предел
  },
  workerShards: 10,                  // лутбоксы: шардов на рабочего (в GDD числа нет, §19.1)
  dustWeek: { 3: 49500, 4: 251000, 5: 713400, 6: 1261200 },   // × 100: праха из лишних осколков Эхо у обычного — лутбоксы.md, «Неделя Эхо в поздних циклах»
  // очки События — не допущение: цены единиц и ёмкость дня сборщика События (event/build.js, dayUnits без контрактов) на ёмкости выше
};

/* Цели наград: доля недельного дохода обычного игрока, которую дают его исполненные контракты. */
const TARGET = {
  keysAllBp: 7500,    // ключи обычного со всех источников — 75 % недельного капа рунных стражей (§11: целевой доход ~70 % капа);
                      // контракты добирают то, чего не дают боссы биомов и сундуки планок рейтинга
  goldBp: 600,        // золото — 6 % недельного золота: ставка заверения возвращает его сторож
  spiritBp: 400,      // дух — 4 %: дух тратится только на уровни (§9.3), его главный источник — биомы
  baseBp: 1500,       // базовые ресурсы общего пула — 15 %: их в биомах мало (10 % за этаж), контракт кормит мастерскую
  ckeysBp: 300,       // ключи ремёсел — 3 % дохода с элит; с уникальной редкости задания
  ckeyFrom: 3,
  uniq: { d: [0, 0, 0, 0, 0, 0, 0], w: [0, 0, 0, 0, 0, 0, 1] },   // уникальный ресурс босса — за вневременное задание недели
  /* Энериум — с эпической (§9.3, §18.5), без цикла: цены в Энериуме от цикла не зависят. ×4 к прежним 1 / 2 / 3 / 5 и 5 / 8 / 12 / 20 —
     ручеёк бесплатного игрока (слово автора 30.09.2026, ADR-0033): контракты — главный заработанный Энериум, около 13–25 в день у обычного.
     Сроки целей и ×1,7 — tools/content-gen/economy/enerium.js; платные замены по-прежнему не окупаются (LAWS.loopPct) */
  en: { d: [0, 0, 0, 4, 8, 12, 20], w: [0, 0, 0, 20, 32, 48, 80] },
  chest: { box: 'keys', win: 'step', t: 'w' },                     // недельный контракт — ещё сундук ключей редкости самого редкого задания (§23)
  tolBp: 2000,        // достигнутая после округления доля — не дальше 20 % от цели
  keysCoverMin: 7000, // ключи обычного со всех источников — не меньше 70 % капа (§11)
};

/* Прогон. Активность дня — равномерно от 40 до 140 % обычной: бывает и час игры вместо трёх; обычный один день недели не играет. */
const SIM = {
  weeks: 200, seed: 'прогон контрактов', tau: [40, 140],
  typical: { artPool: { 2: 1, 3: 2, 4: 3, 5: 4, 6: 4 }, artRer: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2 } },   // уровень «Доски объявлений» и «Костей писаря»: не выше одного за цикл (ADR-0028)
  prof: {
    o: { n: 'обычный', cap: 'o', lg: 'o', off: 1, keepDayBp: 6000, keepWeekBp: 42000, below: 3, paid: 0, cert: '' },
    e: { n: 'увлечённый', cap: 'e', lg: 'e', off: 0, keepDayBp: 10000, keepWeekBp: 70000, below: 3, paid: 0, cert: 'w' },
    p: { n: 'плательщик, время обычного', cap: 'o', lg: 'p', off: 1, keepDayBp: 10000, keepWeekBp: 70000, below: 7, paid: 'cap', cert: '' },
    q: { n: 'тот же риск без платных замен', cap: 'o', lg: 'p', off: 1, keepDayBp: 10000, keepWeekBp: 70000, below: 7, paid: 0, cert: '' },
  },
  // o — оставляет задания не больше 60 % своего дня и 4,2 дня недели, меняет обычные и редкие; e — берёт всё и заверяет недельный;
  // p — берёт всё и ловит редкость всеми платными заменами; q — p без платных замен: разница p и q — чистый вклад Энериума.
  // lg — чей темп героев открывает Лигу (leagueOpen: o, e, p — плательщик с донатным сетом); у q — тот же, что у p
};

/* Законы и пороги проверок. */
const LAWS = { x17: 170, loopPct: 50, plankStep: 2 };

/* ================================ РАСЧЁТ ================================ */

const loadJs = (file, name) => { const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx); return ctx[name]; };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const dec = (num, den, d = 1) => { const p = 10 ** d, v = Math.round(num * p / den) / p; return String(v).replace('.', ','); };
const pct = (num, den, d = 0) => dec(num * 100, den, d) + ' %';
const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2]; };
/* округление до «красивого»: x100 — значение × 100; шаг растёт с величиной — около двух значащих цифр */
function nice(x100) {
  if (x100 <= 0) return 0;
  const v = x100 / 100, step = v < 20 ? 1 : v < 100 ? 5 : v < 1000 ? 10 : v < 10000 ? 100 : v < 100000 ? 1000 : 10000;
  return Math.max(1, Math.round(v / step) * step);
}
const niceDown = v => { const step = v < 20 ? 1 : v < 100 ? 5 : v < 1000 ? 10 : v < 10000 ? 100 : v < 100000 ? 1000 : 10000; return Math.max(step, Math.floor(v / step) * step); };

/* Лига у профилей: день открытия и доля дней цикла, б. п. — leagueOpen (одно место: темп героев прогона достижений) по правилу LEAGUE */
function leagueShare(CAP, LB, RO, err) {
  const IN = fs.existsSync(FILES.paceIn) ? JSON.parse(fs.readFileSync(FILES.paceIn, 'utf8')) : null;
  if (!IN || !RO) { err.push('Лига: нет tools/content-gen/wanderer/pace-inputs.json или roster.js — python tools/content-gen/wanderer/pace_inputs.py'); return null; }
  const R = AP.leagueOpen(ACH, { cap: CAP, lb: LB, inputs: IN, goldHeroes: AP.goldHeroesOf(RO) }, LEAGUE);
  for (const e of R.err) err.push('Лига: ' + e);
  return R.err.length ? null : R;
}

function build() {
  const err = [], warn = [];
  const CAP = JSON.parse(fs.readFileSync(FILES.cap, 'utf8'));
  const LB = loadJs(FILES.loot, 'EN_LOOTBOXES'), RX = loadJs(FILES.recipes, 'EN_RECIPES'), WN = loadJs(FILES.wanderer, 'EN_WANDERER'), ER = loadJs(FILES.echo, 'EN_ECHO_RULES');
  if (!ER) err.push('echo-rules.js: нет EN_ECHO_RULES — очки События не посчитать (python tools/content-gen/economy/echo.py --js)');
  /* Лига: доля дней цикла, когда у профиля открыта Лига, б. п. — одно место, leagueOpen (темп героев прогона достижений) */
  const LO = leagueShare(CAP, LB, loadJs(FILES.roster, 'EN_ROSTER'), err);
  const KI = Object.fromEntries(KINDS.map(k => [k.id, k]));
  for (const K of KINDS) { if (!GROUPS[K.grp]) err.push(`вид ${K.id}: нет группы ${K.grp}`); K.from = K.from || RULES.openCycle; }

  /* --- ёмкость занятия: × 100 в день --- */
  function capOf(K, c, pk) {
    const C = CAP.cycles[c][pk], cp = K.cap;
    if (cp.src) return cp.week ? Math.floor(C[cp.src] / 7) : Math.floor(C[cp.src] * (cp.bp || RULES.bp) / RULES.bp);
    if (cp.fix) return ASSUME[cp.fix][pk];
    if (cp.slot) return ASSUME.ritualSlot[pk] * CAP.slots[c];
    if (cp.wk) return Math.floor(ASSUME.week[cp.wk][c][pk] / 7);
    if (cp.workers) return Math.floor(LB.week.event[c][pk === 'o' ? 'free' : 'fan'].wsh / (ASSUME.workerShards * 7));
    if (cp.dust) {
      const base = ASSUME.dustWeek[c] || 0, E = LB.week.echo[c];
      return Math.floor((pk === 'o' ? base : base * E.fan.shards / E.free.shards) / 7);
    }
    throw new Error('ёмкость вида ' + K.id);
  }
  /* очки События в средний день, × 100: цены единиц и потолки сборщика События на той же ёмкости — этажи, элиты, боссы, Эхо из
     capacity.json, стражи, ритуалы, Арена, Лига, клан и мастерская — ёмкость видов выше. Контракты в счёт не идут: задание не копит
     очки само себе, а их прогон ещё не готов */
  const eventCap = (c, pk) => EVB.dayPoints100(EVB.dayUnits(CAP, Object.fromEntries(Object.entries(caps[c]).map(([k, x]) => [k, [x.o, x.e]])), ER, c, pk, null,
    LO && LO.share[c] ? LO.share[c][pk] : RULES.bp));
  const caps = {};
  for (const c of RULES.cycles) {
    caps[c] = {};
    for (const K of KINDS) if (!K.cap.event) caps[c][K.id] = { o: capOf(K, c, 'o'), e: capOf(K, c, 'e') };
    for (const K of KINDS) if (K.cap.event) caps[c][K.id] = { o: eventCap(c, 'o'), e: eventCap(c, 'e') };   // после остальных: берёт их ёмкость
  }

  /* --- объём по редкости: сетка времени × ёмкость обычного, округление, допуск --- */
  const vol = { d: {}, w: {} }, share = { d: {}, w: {} };
  const target = (t, r) => t === 'd' ? RAR.u10[r - 1] * 1000 / 7 : RAR.u10[r - 1] * 1000;   // б. п. дня
  for (const t of RULES.tables) for (const c of RULES.cycles) {
    vol[t][c] = {}; share[t][c] = {};
    for (const K of KINDS) {
      if (!K.t.includes(t) || c < K.from) continue;
      const co = caps[c][K.id].o, ce = caps[c][K.id].e;
      if (co <= 0) { warn.push(`вид ${K.id}, цикл ${ROMAN[c]}: ёмкость 0 — не выдаётся`); continue; }
      const V = [], SH = [];
      let last = 0;
      for (let r = 1; r <= 7; r++) {
        const ideal = t === 'd' ? co * RAR.u10[r - 1] / 70 : co * RAR.u10[r - 1] / 10;   // × 100
        const v = nice(Math.floor(ideal));
        const sO = Math.floor(v * 100 * RULES.bp / co), sE = Math.floor(v * 100 * RULES.bp / ce), tg = target(t, r);
        const ok = v > last && Math.abs(sO - tg) * RULES.bp <= RAR.tolBp * tg && sO <= (t === 'd' ? RAR.maxDayBp : RAR.maxWeekBp);
        V.push(ok ? v : 0); SH.push(ok ? [sO, sE] : [0, 0]);
        if (ok) last = v;
      }
      if (!V.some(Boolean)) { warn.push(`вид ${K.id}, ${RULES.tableName[t].toLowerCase()}, цикл ${ROMAN[c]}: ни одной редкости в допуске`); continue; }
      vol[t][c][K.id] = V; share[t][c][K.id] = SH;
    }
  }

  /* --- данные алгоритма пула (без наград — их считает прогон) --- */
  const kinds = {};
  for (const K of KINDS) kinds[K.id] = { n: K.n, u: K.u, g: K.g, grp: K.grp, w: K.w, t: K.t, from: K.from, pace: K.pace, go: K.go, p: K.p, what: K.what, need: K.need || '' };
  const D = {
    rules: { bp: RULES.bp, points: RULES.points }, rar: { wBp: RAR.wBp, u10: RAR.u10 }, kinds, order: KINDS.map(k => k.id), vol,
    rewKeys: ['keys', 'gold', 'spirit', 'base', 'ckeys', 'uniq', 'en'], chest: TARGET.chest, rew: { d: {}, w: {} }, stake: { d: {}, w: {} },
  };
  const U = r => RAR.u10[r - 1];   // десятые дня

  /* --- прогон: пул на сиде, замены, отмена, подпись, исход по активности дня --- */
  function poolOf(c) { return RULES.pool.base + 2 * SIM.typical.artPool[c]; }
  function rerOf(c) { return RULES.rer.free + SIM.typical.artRer[c]; }
  function simulate(c, pid) {
    const P = SIM.prof[pid], pk = P.cap, rng = OC.makeRng(OC.seedOf(`${SIM.seed}|${pid}|${c}`));
    const size = poolOf(c), free = rerOf(c), paid = P.paid === 'cap' ? RULES.rer.paidCap : P.paid;
    const st = { weeks: SIM.weeks, dayTry: 0, dayDone: 0, weekTry: 0, weekDone: 0, tasksD: 0, tasksW: 0, done: { d: [0, 0, 0, 0, 0, 0, 0], w: [0, 0, 0, 0, 0, 0, 0] },
      cert: { d: [0, 0, 0, 0, 0, 0, 0], w: [0, 0, 0, 0, 0, 0, 0] }, certDone: { d: [0, 0, 0, 0, 0, 0, 0], w: [0, 0, 0, 0, 0, 0, 0] },
      chest: [0, 0, 0, 0, 0, 0, 0], chestCert: [0, 0, 0, 0, 0, 0, 0], paid: 0, pts: 0, ptsWeek: [], units10: 0 };
    const shareOf = (t, x) => share[t][c][x.kind][x.r - 1][pk === 'o' ? 0 : 1];
    const fish = (tasks, spec, n) => {   // замены: самое простое задание, пока его редкость ниже порога профиля
      let used = 0;
      for (let k = 0; k < n; k++) {
        let i = -1;
        tasks.forEach((x, j) => { if (x.r < P.below && (i < 0 || x.r < tasks[i].r)) i = j; });
        if (i < 0) break;
        const y = OC.reroll(D, spec, tasks, i); used++;
        if (y) tasks[i] = y;
      }
      return used;
    };
    const run = (t, spec, nFree, nPaid, tau) => {
      const tasks = OC.offer(D, spec, size);
      fish(tasks, spec, nFree);
      st.paid += fish(tasks, spec, nPaid);
      const keep = tasks.filter(x => shareOf(t, x) <= (t === 'd' ? P.keepDayBp : P.keepWeekBp));
      const ok = keep.every(x => shareOf(t, x) <= tau * 100);
      const cert = P.cert === t && keep.length > 0;
      if (cert) keep.forEach(x => st.cert[t][x.r - 1]++);
      if (t === 'd') { st.dayTry++; st.tasksD += keep.length; } else { st.weekTry++; st.tasksW += keep.length; }
      if (!ok) return 0;
      let pts = 0, top = 0;
      for (const x of keep) { st.done[t][x.r - 1]++; if (cert) st.certDone[t][x.r - 1]++; pts += RULES.points[x.r - 1]; st.units10 += t === 'd' ? 0 : U(x.r); if (x.r > top) top = x.r; }
      if (t === 'd') { st.dayDone++; st.dayUnits70 = (st.dayUnits70 || 0) + keep.reduce((a, x) => a + U(x.r), 0); }
      else { st.weekDone++; if (top) { st.chest[top - 1]++; if (cert) st.chestCert[top - 1]++; } }
      return pts;
    };
    const lgBp = LO && LO.share[c] ? LO.share[c][P.lg] : RULES.bp;   // доля дней цикла с открытой Лигой у профиля
    for (let w = 0; w < SIM.weeks; w++) {
      const tau = []; for (let d = 0; d < 7; d++) tau.push(SIM.tau[0] + rng(SIM.tau[1] - SIM.tau[0] + 1));
      if (P.off) tau[rng(7)] = 0;
      const wf = Math.floor(free / 2), wp = Math.floor(paid / 2);
      /* до открытия Лиги сервер её заданий не выдаёт (условие игрока need): такие недели — первыми, их доля — доля закрытых дней */
      const ok = w * RULES.bp >= SIM.weeks * (RULES.bp - lgBp) ? null : k => k !== 'league';
      let pts = run('w', { t: 'w', c, seed: pid, period: 'w' + w, ok }, wf, wp, tau.reduce((a, x) => a + x, 0));
      for (let d = 0; d < 7; d++) {
        if (!tau[d]) continue;   // день без игры — контракт не взят
        pts += run('d', { t: 'd', c, seed: pid, period: `w${w}d${d}`, ok }, free - (d ? 0 : wf), paid - (d ? 0 : wp), tau[d]);
      }
      st.pts += pts; st.ptsWeek.push(pts);
    }
    st.units10 = st.units10 + Math.floor((st.dayUnits70 || 0) / 7);   // задание-дни × 10: недельные — дни, дневные — седьмые доли
    st.size = size; st.free = free; st.paidCap = paid;
    return st;
  }
  const sims = {};
  for (const c of RULES.cycles) { sims[c] = {}; for (const pid of Object.keys(SIM.prof)) sims[c][pid] = simulate(c, pid); }

  /* --- награды: цель ÷ исполненные задание-дни обычного --- */
  const capKeysWeek = c => {   // ключей на кап побед у рунных стражей за неделю: 10 в день, вход 1 × цикл и 3 × цикл, доля 7 : 3 — как в лутбоксах
    const g = RX.drops.guardians.filter(x => x.cyc === c), lim = g.find(x => x.kind === 'limits').entryKeys, val = g.find(x => x.kind === 'valor').entryKeys;
    return LB.assume.rb.cap * 7 * (lim * LB.assume.rb.shareBp[0] + val * LB.assume.rb.shareBp[1]) / RULES.bp;
  };
  const chestKeys100 = (c, r) => LB.ev.keys[c].step[r - 1].keys;           // ожидаемые ключи сундука ключей, × 100
  const chestGold = (c, r) => LB.boxes.keys.cur.gold[r - 1];
  const bossKeys100Week = (c, pk) => {   // ключи с боссов биомов: шанс 10 %, штук — номер цикла (ADR-0023, вариант Б), × 100 в неделю
    const e = RX.drops.enemies.find(x => x.cyc === c && x.boss.runeKeyBp);
    return Math.floor(CAP.cycles[c][pk].boss * 7 * e.boss.runeKeyBp * e.boss.runeKeys / RULES.bp);
  };
  const weekOf = (c, k) => CAP.cycles[c].o[k] * 7;   // недельный доход обычного, × 100

  /* --- пороги планок рейтинга контрактов: соседние ×2 (лутбоксы); увлечённый в среднем доходит до 5-й --- */
  const planks = {};
  const meanPts = (c, pid) => sims[c][pid].pts / sims[c][pid].weeks;
  for (const c of RULES.cycles) { const p1 = niceDown(meanPts(c, 'e') / 16); planks[c] = LB.modes.contract.layers[0].rows.map(x => p1 * x.x); }
  const plankOf = (c, pts) => planks[c].filter(x => pts >= x).length;
  /* сундуки личных планок рейтинга за неделю — по планке, которую профиль берёт в среднем; ключи × 100 */
  const ratingKeys100 = (c, pid) => LB.modes.contract.layers[0].rows.slice(0, plankOf(c, meanPts(c, pid)))
    .reduce((a, row) => a + (row.cyc[c] || []).reduce((b, g) => b + g.count * LB.ev.keys[c][g.win][g.r - 1].keys, 0), 0);
  const per = {}, keysGoal = {};
  for (const c of RULES.cycles) {
    const s = sims[c].o, W = s.weeks, units = s.units10;   // задание-дни × 10 за все недели
    const u3 = ['d', 'w'].reduce((a, t) => a + s.done[t].reduce((b, n, i) => b + (i + 1 >= TARGET.ckeyFrom ? n * U(i + 1) * (t === 'd' ? 1 : 7) : 0), 0), 0) / 7;
    const chK = s.chest.reduce((a, n, i) => a + n * chestKeys100(c, i + 1), 0) / (100 * W), chG = s.chest.reduce((a, n, i) => a + n * chestGold(c, i + 1), 0) / W;
    keysGoal[c] = capKeysWeek(c) * TARGET.keysAllBp / RULES.bp - (bossKeys100Week(c, 'o') + ratingKeys100(c, 'o')) / 100;   // что должны дать контракты с их сундуками
    per[c] = {
      keys: (keysGoal[c] - chK) * W * 10 / units,
      gold: (weekOf(c, 'gold') / 100 * TARGET.goldBp / RULES.bp - chG) * W * 10 / units,
      spirit: weekOf(c, 'spirit') / 100 * TARGET.spiritBp / RULES.bp * W * 10 / units,
      base: weekOf(c, 'base') / 100 * TARGET.baseBp / RULES.bp * W * 10 / units,
      ckeys: weekOf(c, 'el') / 100 * TARGET.ckeysBp / RULES.bp * W * 10 / u3,
    };
    for (const t of RULES.tables) {
      const rows = [], stakes = [];
      for (let r = 1; r <= 7; r++) {
        const f = U(r) / (t === 'd' ? 70 : 10), prev = rows[r - 2] || {};
        const row = {
          keys: Math.max(1, nice(Math.round(per[c].keys * f * 100))),
          gold: nice(Math.round(per[c].gold * f * 100)),
          spirit: nice(Math.round(per[c].spirit * f * 100)),
          base: Math.max(1, nice(Math.round(per[c].base * f * 100))),
          ckeys: r >= TARGET.ckeyFrom ? Math.max(1, nice(Math.round(per[c].ckeys * f * 100))) : 0,
          uniq: TARGET.uniq[t][r - 1], en: TARGET.en[t][r - 1],
        };
        for (const k of D.rewKeys) row[k] = Math.max(row[k], prev[k] || 0);   // выше редкость — не меньше награда
        rows.push(row); stakes.push(row.gold * RULES.cert.stakePct / 100);
      }
      D.rew[t][c] = rows; D.stake[t][c] = stakes;
    }
  }

  /* --- доход от контрактов по профилям: исполненные задания × награда редкости, заверенные — ещё раз, сундуки --- */
  const income = {};
  for (const c of RULES.cycles) {
    income[c] = {};
    for (const pid of Object.keys(SIM.prof)) {
      const s = sims[c][pid], W = s.weeks, out = { keys: 0, gold: 0, spirit: 0, base: 0, ckeys: 0, uniq: 0, en: 0, stake: 0, chestKeys: 0 };
      for (const t of RULES.tables) for (let r = 1; r <= 7; r++) {
        const n = s.done[t][r - 1] + s.certDone[t][r - 1], row = D.rew[t][c][r - 1];
        for (const k of D.rewKeys) out[k] += n * row[k];
        out.stake += s.cert[t][r - 1] * D.stake[t][c][r - 1];
      }
      for (let r = 1; r <= 7; r++) { const n = s.chest[r - 1] + s.chestCert[r - 1]; out.chestKeys += n * chestKeys100(c, r) / 100; out.gold += n * chestGold(c, r); }
      for (const k of Object.keys(out)) out[k] = out[k] / W;   // в неделю
      out.rating = ratingKeys100(c, pid) / 100; out.boss = bossKeys100Week(c, SIM.prof[pid].cap) / 100;
      out.keysAll = out.keys + out.chestKeys + out.boss + out.rating;
      income[c][pid] = out;
    }
  }

  /* ================================ ПРОВЕРКИ ================================ */
  for (const t of RULES.tables) for (const c of RULES.cycles) {
    const kindsHere = Object.keys(vol[t][c]);
    const groups = new Set(kindsHere.map(k => KI[k].grp));
    if (groups.size < poolOf(c)) err.push(`${RULES.tableName[t]}, цикл ${ROMAN[c]}: групп ${groups.size} меньше типичного пула ${poolOf(c)} — пул не заполнится`);
    for (let r = 1; r <= 7; r++) if (!kindsHere.some(k => vol[t][c][k][r - 1])) err.push(`${RULES.tableName[t]}, цикл ${ROMAN[c]}: на редкости «${RARITY[r - 1]}» нет ни одного вида`);
    for (const k of kindsHere) for (const [i, v] of vol[t][c][k].entries()) if (v && !Number.isInteger(v)) err.push(`объём ${k}: не целое ${v}`);
  }
  for (const c of RULES.cycles) for (const t of RULES.tables) for (const [i, row] of D.rew[t][c].entries()) {
    for (const k of D.rewKeys) if (!Number.isInteger(row[k]) || row[k] < 0) err.push(`награда ${t} ${c} ${i + 1}: ${k} не целое`);
    if (row.en && i + 1 < 4) err.push(`Энериум на редкости ниже эпической: ${t} ${c} ${i + 1}`);
  }
  const ach = {};
  for (const c of RULES.cycles) {
    const I = income[c].o;
    ach[c] = {
      keys: I.keys + I.chestKeys, keysT: keysGoal[c],
      gold: I.gold, goldT: weekOf(c, 'gold') / 100 * TARGET.goldBp / RULES.bp,
      spirit: I.spirit, spiritT: weekOf(c, 'spirit') / 100 * TARGET.spiritBp / RULES.bp,
      base: I.base, baseT: weekOf(c, 'base') / 100 * TARGET.baseBp / RULES.bp,
    };
    for (const k of ['keys', 'gold', 'spirit', 'base']) {
      const a = ach[c][k], tg = ach[c][k + 'T'];
      if (Math.abs(a - tg) * RULES.bp > TARGET.tolBp * tg) err.push(`цикл ${ROMAN[c]}: ${k} после округления — ${Math.round(a)} в неделю при цели ${Math.round(tg)}: дальше допуска`);
    }
    const cover = income[c].o.keysAll * RULES.bp / capKeysWeek(c);
    if (cover < TARGET.keysCoverMin) err.push(`цикл ${ROMAN[c]}: ключи обычного со всех источников — ${pct(cover, RULES.bp)} капа, меньше ${pct(TARGET.keysCoverMin, RULES.bp)}`);
  }
  /* ×1,7: плательщик при том же времени — на мерах прогресса: ключи после капа, золото, дух, базовые — со всеми источниками, задание-дни и очки.
     Против обычного (ADR-0031, п. 9: правило держится и к нему, хоть он осторожнее) и против бесплатного игрока с тем же риском (q):
     второе — чистый вклад Энериума */
  const x17 = {};
  for (const c of RULES.cycles) {
    const o = income[c].o, p = income[c].p, q = income[c].q, capK = capKeysWeek(c), C = CAP.cycles[c].o;
    const tot = (I, k) => I[k] + C[k] * 7 / 100;
    const row = {
      units: sims[c].p.units10 / sims[c].o.units10, pts: meanPts(c, 'p') / meanPts(c, 'o'),
      keys: Math.min(capK, p.keysAll) / Math.min(capK, o.keysAll),
      gold: tot(p, 'gold') / tot(o, 'gold'), spirit: tot(p, 'spirit') / tot(o, 'spirit'), base: tot(p, 'base') / tot(o, 'base'),
      unitsQ: sims[c].p.units10 / sims[c].q.units10, ptsQ: meanPts(c, 'p') / meanPts(c, 'q'),
    };
    row.worst = Math.max(row.keys, row.gold, row.spirit, row.base, row.units, row.pts);   // ADR-0031, п. 9: и задание-дни с очками — к обычному
    row.worstQ = Math.max(row.unitsQ, row.ptsQ);
    x17[c] = row;
    if (row.worst * 100 > LAWS.x17) err.push(`цикл ${ROMAN[c]}: плательщик быстрее обычного в ×${dec(row.worst * 100, 100, 2)} — больше ×1,7`);
    if (row.worstQ * 100 > LAWS.x17) err.push(`цикл ${ROMAN[c]}: платные замены дают ×${dec(row.worstQ * 100, 100, 2)} к очкам или наградам — больше ×1,7`);
  }
  /* платные замены не окупаются Энериумом: сверх того, что дают бесплатные, — не больше половины цены */
  const loop = {};
  for (const c of RULES.cycles) {
    const p = income[c].p, q = income[c].q, n = sims[c].p.paid / sims[c].p.weeks;
    loop[c] = { paid: n, spent: n * RULES.rer.price, got: p.en - q.en };
    if (n && (p.en - q.en) * 100 > LAWS.loopPct * n * RULES.rer.price) err.push(`цикл ${ROMAN[c]}: платные замены возвращают ${pct(p.en - q.en, n * RULES.rer.price)} Энериума — больше ${LAWS.loopPct} %`);
  }
  for (const c of RULES.cycles) {
    if (plankOf(c, meanPts(c, 'o')) < 3) err.push(`цикл ${ROMAN[c]}: обычный не доходит до 3-й планки`);
    if (plankOf(c, meanPts(c, 'e')) < 5) err.push(`цикл ${ROMAN[c]}: увлечённый не доходит до 5-й планки`);
    for (let i = 1; i < planks[c].length; i++) if (planks[c][i] < planks[c][i - 1] * LAWS.plankStep) err.push(`цикл ${ROMAN[c]}: планки ближе ×${LAWS.plankStep}`);
  }
  /* определённость: тот же сид — тот же пул */
  {
    const spec = { t: 'd', c: 2, seed: 'проверка', period: 'd1' }, a = JSON.stringify(OC.offer(D, spec, 5)), b = JSON.stringify(OC.offer(D, spec, 5));
    if (a !== b) err.push('пул на одном сиде вышел разным');
  }

  /* ================================ ДАННЫЕ ПРОТОТИПА ================================ */
  const art = id => { const a = WN.art.list.find(x => x.id === id); return a ? { id, n: a.n, d: a.d, step: a.step, lv: a.lv, base: a.base } : null; };
  const pas = id => { const p = WN.passives.find(x => x.id === id); return p ? { id, n: p.n, d: p.d, r: p.r } : null; };
  const achRer = WN.ach.list.filter(a => a.pk === 'reroll').map(a => ({ id: a.id, n: a.n, v: a.v }));
  const round1 = x => Math.round(x * 10) / 10;
  const data = {
    meta: { builder: 'tools/content-gen/contracts/build.js', capacity: 'tools/content-gen/contracts/capacity.json', capSha: crypto.createHash('sha256').update(fs.readFileSync(FILES.cap)).digest('hex').slice(0, 12),
      sources: ['GDD §18', 'ADR-0014', 'ADR-0022', 'ADR-0023', 'ADR-0028', 'design/ui/lootboxes.js', 'design/ui/recipes.js', 'design/ui/wanderer.js', 'design/ui/echo-rules.js', 'tools/content-gen/event/build.js'] },
    rules: {
      bp: RULES.bp, openLevel: RULES.openLevel, openCycle: RULES.openCycle, cycles: RULES.cycles, tables: RULES.tables, tableName: RULES.tableName,
      pool: Object.assign({}, RULES.pool, { artInfo: art(RULES.pool.art), memInfo: pas(RULES.pool.mem) }),
      rer: Object.assign({}, RULES.rer, { artInfo: art(RULES.rer.art), ach: achRer, mem: RULES.mods.rer }),
      cert: Object.assign({}, RULES.cert, { bothInfo: pas(RULES.cert.both) }), cutoffMin: RULES.cutoffMin, points: RULES.points, splitBp: RULES.splitBp,
      mods: { gold: RULES.mods.gold, res: RULES.mods.res, late: pas(RULES.mods.late), names: Object.fromEntries([...Object.keys(RULES.mods.gold), ...Object.keys(RULES.mods.res), ...Object.keys(RULES.cert.disc)].map(id => [id, (pas(id) || {}).n || id])) },
    },
    rar: { names: RARITY, wBp: RAR.wBp, u10: RAR.u10 },
    groups: GROUPS, kinds, order: D.order, vol, share, rew: D.rew, stake: D.stake, rewKeys: D.rewKeys, chest: TARGET.chest,
    caps: Object.fromEntries(RULES.cycles.map(c => [c, Object.fromEntries(KINDS.map(K => [K.id, [caps[c][K.id].o, caps[c][K.id].e]]))])),
    hours: CAP.hours,
    typical: Object.fromEntries(RULES.cycles.map(c => [c, { pool: poolOf(c), rer: rerOf(c) }])),
    planks,
    /* econ — итог прогона в неделю: keys — ключи со всех источников, ctKeys — только режима «Контракты» (награды заданий, сундук
       недельного контракта, сундуки планок рейтинга, без ключей с боссов) — их берёт калькулятор сет-бонусов economy/sets.py;
       gold — золото наград и сундуков, stake — ставки заверения, spirit — дух наград: их берёт калькулятор экономики economy/economy.py (Т7) */
    econ: Object.fromEntries(RULES.cycles.map(c => [c, {
      capKeys: Math.round(capKeysWeek(c)),
      o: { dayDoneBp: Math.round(sims[c].o.dayDone * RULES.bp / sims[c].o.dayTry), weekDoneBp: Math.round(sims[c].o.weekDone * RULES.bp / sims[c].o.weekTry),
        keys: Math.round(income[c].o.keysAll), ctKeys: Math.round(income[c].o.keys + income[c].o.chestKeys + income[c].o.rating),
        pts: Math.round(meanPts(c, 'o')), en: Math.round(income[c].o.en), gold: Math.round(income[c].o.gold), stake: Math.round(income[c].o.stake), spirit: Math.round(income[c].o.spirit) },
      e: { dayDoneBp: Math.round(sims[c].e.dayDone * RULES.bp / sims[c].e.dayTry), weekDoneBp: Math.round(sims[c].e.weekDone * RULES.bp / sims[c].e.weekTry),
        keys: Math.round(income[c].e.keysAll), ctKeys: Math.round(income[c].e.keys + income[c].e.chestKeys + income[c].e.rating),
        pts: Math.round(meanPts(c, 'e')), en: Math.round(income[c].e.en), gold: Math.round(income[c].e.gold), stake: Math.round(income[c].e.stake), spirit: Math.round(income[c].e.spirit) },
      /* p — плательщик при времени обычного: его ключи контрактов берёт прогон темпа (biomes/pace.py, ×1,7 темпа цикла II),
         Энериум — калькулятор ручейка Энериума (economy/enerium.js, ×1,7 Энериума игрой) */
      p: { keys: Math.round(income[c].p.keysAll), ctKeys: Math.round(income[c].p.keys + income[c].p.chestKeys + income[c].p.rating), pts: Math.round(meanPts(c, 'p')), en: Math.round(income[c].p.en) },
      x17: Math.round(x17[c].worst * 100),
    }])),
  };

  /* ================================ ТАБЛИЦЫ ДОКУМЕНТА ================================ */
  const TBL = {};
  let T;
  const cells = a => '| ' + a.join(' | ') + ' |';
  const head = a => [cells(a), cells(a.map(() => '---'))];
  const rarHead = RARITY.map(x => x);
  const GEN = ['обычной', 'редкой', 'уникальной', 'эпической', 'древней', 'первородной', 'вневременной'];
  const tag = (t, c, k) => {
    const V = vol[t][c] && vol[t][c][k]; if (!V) return '—';
    const on = V.map((v, i) => v ? i + 1 : 0).filter(Boolean); if (!on.length) return '—'; if (on.length === 7) return 'все';
    const a = on[0], b = on[on.length - 1], gap = []; for (let r = a; r <= b; r++) if (!on.includes(r)) gap.push(GEN[r - 1]);
    const span = a === b ? RARITY[a - 1] : `${RARITY[a - 1]} — ${RARITY[b - 1]}`;
    return gap.length ? `${span}, без ${gap.length > 1 ? gap.slice(0, -1).join(', ') + ' и ' + gap[gap.length - 1] : gap[0]}` : span;
  };
  const num100 = v => v >= 10000 ? fmt(Math.round(v / 100)) : dec(v, 100);   // × 100 → число: большие — целыми
  const capTxt = (K, c) => { const x = caps[c][K.id]; const wk = K.pace === 'week' || (K.cap.src && K.cap.week); return wk ? `${fmt(Math.round(x.o * 7 / 100))} / ${fmt(Math.round(x.e * 7 / 100))} в неделю` : `${num100(x.o)} / ${num100(x.e)} в день`; };

  // редкости: и условная выполнимость одного задания у обычного — та же активность дня, что в прогоне, день без игры в неделе
  const feas = { d: [0, 0, 0, 0, 0, 0, 0], w: [0, 0, 0, 0, 0, 0, 0] }, FN = 20000;
  {
    const rng = OC.makeRng(OC.seedOf(SIM.seed + '|выполнимость')), span = SIM.tau[1] - SIM.tau[0] + 1;
    for (let i = 0; i < FN; i++) {
      const day = SIM.tau[0] + rng(span), tau = []; for (let d = 0; d < 7; d++) tau.push(SIM.tau[0] + rng(span));
      tau[rng(7)] = 0; const sum = tau.reduce((a, x) => a + x, 0);
      for (let r = 1; r <= 7; r++) { if (target('d', r) <= day * 100) feas.d[r - 1]++; if (target('w', r) <= sum * 100) feas.w[r - 1]++; }
    }
  }
  T = head(['Редкость', 'Шанс броска', 'Неделя: дней обычной игры', 'День: доля дня', 'День: минут из 3 ч', 'Очки', 'Энериум: день / неделя', 'Обычный успевает: день / неделя']);
  for (let r = 1; r <= 7; r++) T.push(cells([RARITY[r - 1], pct(RAR.wBp[r - 1], RULES.bp, 0), dec(U(r), 10), pct(U(r), 70, 0), String(Math.round(U(r) * 180 / 70)), String(RULES.points[r - 1]), `${TARGET.en.d[r - 1] || '—'} / ${TARGET.en.w[r - 1] || '—'}`, `${pct(feas.d[r - 1], FN)} / ${pct(feas.w[r - 1], FN)}`]));
  TBL.rar = T.join('\n');

  // каталог
  T = head(['Задание', 'Группа', 'С цикла', 'Дневной', 'Недельный', 'Ёмкость, цикл II: обычный / увлечённый', 'Что засчитывается']);
  for (const K of KINDS) T.push(cells([K.n, GROUPS[K.grp], ROMAN[K.from], K.t.includes('d') ? tag('d', Math.max(2, K.from), K.id) : '—', K.t.includes('w') ? tag('w', Math.max(2, K.from), K.id) : '—', capTxt(K, Math.max(2, K.from)), K.what + (K.need ? ' Выдаётся, если ' + { recipes: 'в открытых циклах остались ненайденные рецепты', league: `у игрока ${LEAGUE.heroes} разных героев — Лига открыта`, hire: 'в каталоге есть герои за золото', dust: 'в запасах есть прах', clan: 'игрок в клане' }[K.need] + '.' : '')]));
  TBL.kinds = T.join('\n');

  // объёмы цикла II и цикла, где вид открывается
  const volTable = (t, c) => {
    const X = head(['Задание', ...rarHead]);
    for (const K of KINDS) {
      const V = vol[t][c][K.id], S = share[t][c][K.id]; if (!V) continue;
      X.push(cells([K.n, ...V.map((v, i) => v ? `${fmt(v)} · ${t === 'd' ? pct(S[i][0], RULES.bp, 0) : dec(S[i][0], RULES.bp) + ' дн.'}` : '—')]));
    }
    return X.join('\n');
  };
  TBL.volD2 = volTable('d', 2); TBL.volW2 = volTable('w', 2); TBL.volD4 = volTable('d', 4); TBL.volW4 = volTable('w', 4);

  // время: обычный и увлечённый, цикл II или цикл, где вид открывается
  T = head(['Задание', 'Как считать', 'День, самая низкая редкость: обычный / увлечённый', 'День, самая высокая', 'Неделя, самая низкая', 'Неделя, самая высокая']);
  const cOf = k => Math.max(2, KI[k].from);
  const tm = (t, k, r, who) => { const S = share[t][cOf(k)][k]; if (!S || !S[r - 1][0]) return '—'; const s = S[r - 1][who]; if (t === 'w') return dec(s, RULES.bp) + ' дн.'; return KI[k].pace === 'time' ? `${Math.round(s * CAP.hours[who ? 'e' : 'o'] * 60 / RULES.bp)} мин` : pct(s, RULES.bp, 0); };
  const firstR = (t, k, hi) => { const V = vol[t][cOf(k)][k]; if (!V) return 0; const on = V.map((v, i) => v ? i + 1 : 0).filter(Boolean); return hi ? on[on.length - 1] : on[0]; };
  for (const K of KINDS) {
    const d1 = firstR('d', K.id), d7 = firstR('d', K.id, 1), w1 = firstR('w', K.id), w7 = firstR('w', K.id, 1);
    T.push(cells([K.n, { time: 'минуты игры', tries: 'доля попыток дня', week: 'дни недели' }[K.pace],
      d1 ? `${tm('d', K.id, d1, 0)} / ${tm('d', K.id, d1, 1)}` : '—', d7 ? `${tm('d', K.id, d7, 0)} / ${tm('d', K.id, d7, 1)}` : '—',
      w1 ? `${tm('w', K.id, w1, 0)} / ${tm('w', K.id, w1, 1)}` : '—', w7 ? `${tm('w', K.id, w7, 0)} / ${tm('w', K.id, w7, 1)}` : '—']));
  }
  TBL.time = T.join('\n');

  // награды
  const rewTable = t => {
    const X = head(['Цикл', 'Редкость', 'Ключи', 'Золото', 'Дух', 'Базовые', 'Ключи ремёсел', 'Уникальный', 'Энериум', 'Ставка заверения']);
    for (const c of RULES.cycles) for (let r = 1; r <= 7; r++) { const w = D.rew[t][c][r - 1]; X.push(cells([r === 1 ? ROMAN[c] : '', RARITY[r - 1], fmt(w.keys), fmt(w.gold), fmt(w.spirit), fmt(w.base), w.ckeys ? fmt(w.ckeys) : '—', w.uniq || '—', w.en || '—', fmt(D.stake[t][c][r - 1])])); }
    return X.join('\n');
  };
  TBL.rewD = rewTable('d'); TBL.rewW = rewTable('w');

  // пул и замены
  T = head(['Цикл', 'Контрактов', 'Пул: база / типичный / потолок', 'Бесплатных замен в день: база / типичные', 'Платных замен в день']);
  for (const c of RULES.cycles) T.push(cells([ROMAN[c], '1 дневной и 1 недельный', `${RULES.pool.base} / ${poolOf(c)} / ${RULES.pool.base + 8 + 1}`, `${RULES.rer.free} / ${rerOf(c)}`, `до ${RULES.rer.paidCap}, по ${RULES.rer.price} Энериума`]));
  TBL.pool = T.join('\n');

  // прогон
  T = head(['Цикл', 'Профиль', 'Заданий в дневном / недельном', 'Дневной исполнен', 'Недельный исполнен', 'Задание-дней в неделю', 'Очков в неделю', 'Ключи со всех источников, доля капа', 'Золото контрактов, доля дохода', 'Дух, доля', 'Базовые, доля', 'Энериум в день']);
  for (const c of RULES.cycles) for (const pid of ['o', 'e', 'p', 'q']) {
    const s = sims[c][pid], I = income[c][pid], C = CAP.cycles[c][SIM.prof[pid].cap];
    T.push(cells([pid === 'o' ? ROMAN[c] : '', SIM.prof[pid].n, `${dec(s.tasksD, s.dayTry)} / ${dec(s.tasksW, s.weekTry)}`, pct(s.dayDone, s.dayTry), pct(s.weekDone, s.weekTry),
      dec(s.units10, 10 * s.weeks), fmt(Math.round(meanPts(c, pid))), `${fmt(Math.round(I.keysAll))} · ${pct(I.keysAll, capKeysWeek(c))}`,
      pct(I.gold - I.stake, C.gold * 7 / 100, 1), pct(I.spirit, C.spirit * 7 / 100, 1), pct(I.base, C.base * 7 / 100, 0), dec(I.en, 7)]));
  }
  TBL.sim = T.join('\n');

  // ×1,7
  const xx = v => '×' + dec(v * 100, 100, 2);
  T = head(['Цикл', 'К обычному: задание-дни', 'Очки', 'Ключи после капа', 'Золото, все источники', 'Дух', 'Базовые', 'К тому же риску без замен: задание-дни', 'Очки', 'Не больше ×1,7']);
  for (const c of RULES.cycles) { const x = x17[c]; T.push(cells([ROMAN[c], xx(x.units), xx(x.pts), xx(x.keys), xx(x.gold), xx(x.spirit), xx(x.base), xx(x.unitsQ), xx(x.ptsQ), x.worst * 100 <= LAWS.x17 && x.worstQ * 100 <= LAWS.x17 ? 'да' : 'нет'])); }
  TBL.x17 = T.join('\n');

  // Энериум
  T = head(['Цикл', 'Платных замен в неделю', 'Потрачено Энериума', 'Добыто сверх бесплатных замен', 'Возврат', `Не больше ${LAWS.loopPct} %`, 'Энериум в день: обычный / увлечённый']);
  for (const c of RULES.cycles) { const L = loop[c]; T.push(cells([ROMAN[c], dec(L.paid, 1), fmt(Math.round(L.spent)), dec(L.got, 1), pct(L.got, L.spent || 1), L.got * 100 <= LAWS.loopPct * L.spent ? 'да' : 'нет', `${dec(income[c].o.en, 7)} / ${dec(income[c].e.en, 7)}`])); }
  TBL.loop = T.join('\n');

  // планки
  T = head(['Цикл', 'Планки 1–5, очков недели', 'Обычный: очков → планка', 'Увлечённый', 'Плательщик', 'Резервуар клана: очков в день с игрока, обычный']);
  for (const c of RULES.cycles) T.push(cells([ROMAN[c], planks[c].map(fmt).join(' / '), `${fmt(Math.round(meanPts(c, 'o')))} → ${plankOf(c, meanPts(c, 'o'))}`, `${fmt(Math.round(meanPts(c, 'e')))} → ${plankOf(c, meanPts(c, 'e'))}`, `${fmt(Math.round(meanPts(c, 'p')))} → ${plankOf(c, meanPts(c, 'p'))}`, dec(meanPts(c, 'o') * RULES.splitBp / RULES.bp, 7)]));
  TBL.planks = T.join('\n');

  // цели наград
  T = head(['Цикл', 'Ключи: контракты / цель', 'Золото / цель', 'Дух / цель', 'Базовые / цель', 'Ставка увлечённого, доля его золота']);
  for (const c of RULES.cycles) { const a = ach[c]; T.push(cells([ROMAN[c], `${fmt(Math.round(a.keys))} / ${fmt(Math.round(a.keysT))}`, `${fmt(Math.round(a.gold))} / ${fmt(Math.round(a.goldT))}`, `${fmt(Math.round(a.spirit))} / ${fmt(Math.round(a.spiritT))}`, `${fmt(Math.round(a.base))} / ${fmt(Math.round(a.baseT))}`, pct(income[c].e.stake, CAP.cycles[c].e.gold * 7 / 100, 1)])); }
  TBL.target = T.join('\n');

  // ёмкость по циклам
  T = head(['Задание', ...RULES.cycles.map(c => 'Цикл ' + ROMAN[c])]);
  for (const K of KINDS) T.push(cells([K.n, ...RULES.cycles.map(c => c < K.from ? '—' : capTxt(K, c))]));
  TBL.cap = T.join('\n');

  return { data, tables: TBL, sims, income, x17, loop, planks, err, warn, D };
}

/* ================================ ВЫВОД ================================ */

function render(data) {
  const offer = fs.readFileSync(FILES.offer, 'utf8').replace(/\r\n/g, '\n');
  const head = `/* Контракты — данные прототипа «Свет снизу». Собирает tools/content-gen/contracts/build.js из калькуляторов экономики
   (capacity.json), сундуков, рецептов и таблиц Странника. Руками не править: пересборка затрёт правку.
   Черновик · предложение · ждёт автора. Числа — демонстрация, только целые; шансы — в базисных пунктах (10 000 = 100 %).
   vol[таблица][цикл][вид] — объём задания по редкостям, 0 — на этой редкости вид не выдаётся; share — доля дня обычного
   и увлечённого игрока в б. п. (у недельных — дни × 10 000); rew — награда задания по редкости; stake — ставка заверения.
   Обоснование и таблицы — docs/content/контракты.md. В игре пул, замену, исход и награду решает сервер (§18, §36.16):
   клиент получает состав и прогресс. Ниже данных — алгоритм пула tools/content-gen/contracts/offer.js как есть. */\n`;
  return head + 'window.EN_CONTRACTS = ' + JSON.stringify(data) + ';\n' + offer;
}
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/contracts/build.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) return null;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { build, render, withTables, markA, markB, FILES, RULES, TARGET, SIM, LAWS };

if (require.main === module) {
  const R = build();
  for (const w of R.warn) console.log('предупреждение: ' + w);
  if (process.argv.includes('--print')) {   // таблицы — и при ошибках: для настройки чисел
    if (R.err.length) console.log('ОШИБКИ:\n' + R.err.join('\n'));
    for (const [k, t] of Object.entries(R.tables)) console.log(`\n### ${k}\n\n${t}`);
    process.exit(R.err.length ? 1 : 0);
  }
  if (R.err.length) { console.log('ОШИБКИ:\n' + R.err.join('\n')); process.exit(1); }
  const js = render(R.data);
  const docOld = fs.existsSync(FILES.doc) ? fs.readFileSync(FILES.doc, 'utf8') : null;
  const docNew = docOld ? withTables(docOld, R.tables) : null;
  if (process.argv.includes('--check')) {
    const okJs = fs.existsSync(FILES.out) && fs.readFileSync(FILES.out, 'utf8') === js, okDoc = !docOld || docNew === docOld;
    console.log(okJs && okDoc ? 'Свежие: contracts.js и таблицы документа совпадают со сборкой.' : `Устарели: ${[!okJs && 'design/ui/contracts.js', !okDoc && 'docs/content/контракты.md'].filter(Boolean).join(', ')} — пересобрать.`);
    process.exit(okJs && okDoc ? 0 : 1);
  }
  fs.writeFileSync(FILES.out, js);
  if (docNew) fs.writeFileSync(FILES.doc, docNew);
  else console.log(`предупреждение: в ${path.relative(ROOT, FILES.doc)} нет меток таблиц — таблицы не вставлены`);
  const n = Object.values(R.data.vol.d[2]).length;
  console.log(`Собрано: видов заданий ${Object.keys(R.data.kinds).length}, в дневном цикла II — ${n}; прогон ${SIM.weeks} недель × ${RULES.cycles.length} циклов × ${Object.keys(SIM.prof).length} профиля.`);
}
