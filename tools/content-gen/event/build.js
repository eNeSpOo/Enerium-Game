/* Событие недели — калькулятор и сборщик: GDD §27, §1.1–§1.2, §10.3, §17–§20, §23–§25, §36; ADR-0014, ADR-0023, ADR-0024,
   ADR-0026, ADR-0028. Черновик · предложение · ждёт автора. Все числа — демонстрация.

   Что считает:
   1. Таблица «занятие → очки» (§27: «финальная сборка, открыто»): только то, что в игре реально делается, — этажи, элиты, боссы,
      рунные стражи, атаки в Эхо, ритуалы, контракты, Арена и Лига, клан, мастерская. Цена единицы — целое число, одна на все циклы.
   2. Ёмкость занятий по циклам у обычного (3 ч в день) и увлечённого (8 ч): биомы и Эхо — capacity.json (калькуляторы экономики),
      стражи, Арена, Лига, клан, мастерская и ритуалы — ёмкость калькулятора контрактов (design/ui/contracts.js), раунды атаки Эхо —
      правила боя Эхо (echo-rules.js). Сколько очков приносит средний день и чья доля больше.
   3. Прогон недель: активность дня — от 40 до 140 % обычной, обычный один день не играет, как в прогоне контрактов; у каждой
      из девяти недель свой акцент. Пороги пяти личных планок цикла: соседние ×2 (лутбоксы); первая — наибольшее «красивое» число,
      при котором увлечённый берёт пятую, а обычный — третью планку почти каждую неделю; обычный берёт четвёртую нечасто.
   4. Клановые планки — сумма личных порогов участников (третьих, четвёртых, пятых), прогон кланов: обычный клан — первая,
      клан увлечённых — вторая. Правило ×1,7 (§1.2): плательщик при времени обычного и сила коллекции на потолке — не больше
      одной планки сверху. Демо-аккаунт прототипа — середина недели обычного игрока на третьей планке.

   Пишет:
   - design/ui/event.js — данные прототипа (window.EN_EVENT) и алгоритм «сервера» (window.EnEvent из rules.js), руками не править;
   - docs/content/событие.md — только таблицы: каждая между метками «<!-- @таблица имя -->» и «<!-- /таблица имя -->»; текст — ручной.
   Читает: capacity.json (python tools/content-gen/contracts/capacity.py), design/ui/contracts.js (ёмкость и прогон контрактов),
   design/ui/echo-rules.js (раунды атак), design/ui/lootboxes.js (сундуки рабочих, типичная неделя, плательщик),
   design/ui/roster.js (недели и цивилизации).
   Любая ошибка — файлы не пишутся. Пересборка даёт те же байты.
   Порядок: сначала контракты (node tools/content-gen/contracts/build.js), потом эта сборка. Калькулятор контрактов берёт отсюда
   только правила — цены единиц, потолки, ёмкость дня dayUnits без контрактов, — а не event.js: круга сборки нет.
   Лига: правило — tools/content-gen/arena/rules.js (league: цикл и порог 15 разных героев, как на экране Лиги); когда обычный
   и увлечённый его набирают — leagueOpen в tools/content-gen/wanderer/achievements-pace.js по tools/content-gen/wanderer/pace-inputs.json,
   lootboxes.js и roster.js. Матчи Лиги в дне — только доля дней цикла с открытой Лигой.
   Запуск: node tools/content-gen/event/build.js           — собрать и записать;
           node tools/content-gen/event/build.js --check   — только проверить, что файлы свежие;
           node tools/content-gen/event/build.js --print   — таблицы в консоль, для настройки чисел.
   Из других скриптов: require('./build.js').build() — { data, tables, err, warn } без записи; dayUnits и dayPoints100 — ёмкость
   и очки среднего дня (их берёт калькулятор контрактов для задания «Набрать очки События»). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const EV = require('./rules.js');
const LEAGUE = require('../arena/rules.js').RULES_SRC.league;   // Лига: цикл рейтинга и порог героев — одно правило в данных
const ACH = require('../wanderer/achievements.js'), AP = require('../wanderer/achievements-pace.js');   // темп героев: когда открыта Лига
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  cap: path.join(ROOT, 'tools', 'content-gen', 'contracts', 'capacity.json'),
  paceIn: path.join(ROOT, 'tools', 'content-gen', 'wanderer', 'pace-inputs.json'),
  rules: path.join(__dirname, 'rules.js'),
  contracts: path.join(ROOT, 'design', 'ui', 'contracts.js'),
  echo: path.join(ROOT, 'design', 'ui', 'echo-rules.js'),
  loot: path.join(ROOT, 'design', 'ui', 'lootboxes.js'),
  roster: path.join(ROOT, 'design', 'ui', 'roster.js'),
  out: path.join(ROOT, 'design', 'ui', 'event.js'),
  doc: path.join(ROOT, 'docs', 'content', 'событие.md'),
};

/* ================================ ДАННЫЕ ================================ */

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const BP = 10000;

/* Правила События. Числа — демонстрация. */
const RULES = {
  from: 2,                     // рейтинговые режимы — с цикла II, 10-й уровень (§16, лутбоксы: EN_LOOTBOXES.modes.event.from)
  cycles: [2, 3, 4, 5, 6],
  cutoffH: 1,                  // §1.1: приём результатов закрывается за час до серверного подсчёта — одна отсечка на всю игру
  countH: 1,                   // §1.1: подсчёт — один серверный час, потом новая неделя
  accentBp: 15000,             // акцент недели: очки одного занятия ×1,5 (предложение)
  /* клановые планки (ADR-0031, п. 12): планка k — сумма по участникам первого личного порога его цикла × clanX[k] / 100. Шаги — x:
     вторая ×4 первой, третья ×1,5 второй — те же, что у строк клановых планок в лутбоксах (EN_LOOTBOXES.modes.event, clan). Первая
     доля clanX[0] — не ручка: сборщик берёт середину отрезка долей, при которых законы кланов держатся во всех циклах. Прежнее правило — сумма третьих, четвёртых и пятых личных порогов — делало третью ×2 второй: её не брал
     и клан увлечённых */
  clan: { x: [1, 4, 6], per: 100 },
  plankDigits: 3,              // порог первой личной планки — вниз до трёх значащих цифр: при двух у порогов около 10 000 шаг —
                               // 10 %, и с доблестью в ядре (29.09.2026) порог цикла V упал с 10 900 до 10 000 — неделя этажей
                               // давала обычному четвёртую планку в 45 % недель
  /* мерка первой личной планки (ADR-0042, ADR-0043): типичная неделя обычного (медиана) — во столько первых планок, × 100; одна на все
     циклы — клан любого цикла берёт клановую планку одинаково. Перебор: от, до, шаг; сборщик берёт середину самого длинного отрезка,
     где законы держатся во всех циклах */
  plankR: [400, 1200, 5],
  shop: false,                 // магазина События в GDD нет: очки — мера недели, не валюта (§27, §36.3)
};

/* Единицы: очки за одно дело. Цена — целое, одна на все циклы: у кого больше слотов и отрядов, у того и очков больше,
   а рейтинг и так свой у каждого цикла (§1.1). Энериумом очки не покупаются (§36.3):
   - ритуал платит за своё время по карточке, а не за штуку: перебросы пула длину слота не меняют;
   - контракт платит за исполнение, а не за редкость заданий: платные замены очков не прибавляют;
   - Арена платит за победу, но не больше 10 побед в день: обновление списка за Энериум потолок не поднимает. */
/* n — имя, u — единица для числа (1, 2, 5), a — «за что» в винительном: «1 очко за этаж»; gate: 'league' — только при открытой Лиге:
   правило Арены (arena/rules.js, league — 15 разных героев), своего цикла у Событий нет */
/* ADR-0031, п. 12: спуск — не главный источник недели. Этажи и элиты — под дневным потолком (CAPS); цены босса и атаки Эхо подняты
   (босс 30 → 60, раунд Эхо 5 → 7): это дела, которые растут со временем игры, — без них потолок спуска сжал бы неделю увлечённого
   к неделе обычного, и увлечённый не брал бы пятую планку. Раунды по типу врага (ADR-0039): атака Эхо длиннее, атак в день меньше,
   раундов в день у обычного — на пятую часть меньше; при 7 очках Эхо теряло вес недели, а у обычного неделя Эхо давала четвёртую
   планку в 48 % недель. Раунд Эхо — 9: доли недели — как до новых раундов */
const UNITS = {
  floor: { n: 'Этаж', src: 'descent', price: 1, u: ['этаж', 'этажа', 'этажей'], a: 'этаж', what: 'Этаж любого биома, взятый в забеге.' },
  elite: { n: 'Элита', src: 'descent', price: 1, u: ['элита', 'элиты', 'элит'], a: 'элиту', what: 'Элита на этаже любого биома — сверх самого этажа.' },
  boss: { n: 'Босс биома', src: 'descent', price: 60, u: ['босс', 'босса', 'боссов'], a: 'босса', what: 'Босс биома пал: биом закрыт, в том числе осадой.' },
  guard: { n: 'Рунный страж', src: 'descent', price: 40, u: ['победа', 'победы', 'побед'], a: 'победу', what: 'Победа над рунным стражем любого биома.' },
  echoRound: { n: 'Атака в Эхо', src: 'echo', price: 9, u: ['раунд', 'раунда', 'раундов'], a: 'раунд', what: 'Атака по цели Эхо, победа или нет: очки — за раунды атаки по рангу цели.' },
  ritualHalf: { n: 'Ритуал', src: 'rituals', price: 10, u: ['полчаса', 'получаса', 'получасов'], a: 'полчаса', what: 'Завершённый ритуал рабочих или героев: очки — за его время по карточке.' },
  contractD: { n: 'Дневной контракт', src: 'contracts', price: 300, u: ['контракт', 'контракта', 'контрактов'], a: 'контракт', what: 'Дневной контракт исполнен: сделаны все задания. Пустой не в счёт.' },
  contractW: { n: 'Недельный контракт', src: 'contracts', price: 1500, u: ['контракт', 'контракта', 'контрактов'], a: 'контракт', what: 'Недельный контракт исполнен до отсечки.' },
  arenaWin: { n: 'Победа на Арене', src: 'arena', price: 40, u: ['победа', 'победы', 'побед'], a: 'победу', what: 'Победа в атаке на Арене.' },
  leagueWin: { n: 'Матч Лиги', src: 'arena', price: 120, gate: 'league', u: ['победа', 'победы', 'побед'], a: 'победу', what: 'Выигранный матч Лиги: три отряда, три раунда.' },
  clanAtk: { n: 'Атака клана', src: 'clan', price: 70, u: ['атака', 'атаки', 'атак'], a: 'атаку', what: 'Атака по элите или Клановому боссу из общего кошелька.' },
  craftItem: { n: 'Создание', src: 'craft', price: 3, u: ['предмет', 'предмета', 'предметов'], a: 'предмет', what: 'Предмет, созданный в мастерской: на столе или автодокрафтом.' },
  recipe: { n: 'Новый рецепт', src: 'craft', price: 200, u: ['рецепт', 'рецепта', 'рецептов'], a: 'рецепт', what: 'Рецепт, которого ещё не было в книге.' },
};
/* дневные потолки единиц — одинаковы для всех (§1.2). Этажи и элиты — потолок спуска (ADR-0031, п. 12): без него спуск давал 45–69 %
   очков недели, и акцент недели двигал медиану на ±7 %. С потолком 400 этажей и 100 элит спуск у обычного — 22–35 % недели по циклам:
   обычный берёт его за первый час забегов, дальше неделю решают Эхо, ритуалы, контракты, Арена и клан */
const CAPS = { floor: 400, elite: 100, arenaWin: 10, leagueWin: 3, craftItem: 20 };

/* Источники — строки экрана «Где брать очки»: переход прямо в режим; значок — картинка пути PATH(p) */
const SOURCES = [
  { id: 'descent', n: 'Спуск', go: 'descent', p: 10, what: 'этажи, элиты, боссы и рунные стражи' },
  { id: 'echo', n: 'Эхо', go: 'echo', p: 18, what: 'атаки по целям недели' },
  { id: 'rituals', n: 'Ритуалы', go: 'rituals', p: 33, what: 'время завершённых ритуалов' },
  { id: 'contracts', n: 'Контракты', go: 'contracts', p: 38, what: 'исполненные контракты' },
  { id: 'arena', n: 'Арена и Лига', go: 'arena:arena', p: 3, what: 'победы' },
  { id: 'clan', n: 'Клан', go: 'clan:boss', p: 26, what: 'атаки по элитам и боссу клана' },
  { id: 'craft', n: 'Мастерская', go: 'craft', p: 11, what: 'новые рецепты и созданное' },
];

/* Девять Событий — по одному на расу недели (§1.1), имя и строка — от древней цивилизации недели (ADR-0024).
   Акцент — одно занятие недели ×1,5: неделя отличается от недели, правила — одни. Строка игроку — без спойлеров §38. */
const WEEKS = {
  'Люди': { n: 'Названные ночи', an: 'Контракты', units: ['contractD', 'contractW'],
    line: 'Звездочёты Ан-Кешара давали имя каждой ночи и записывали её. На этой неделе исполненный контракт весит больше.' },
  'Дворфы': { n: 'Дорога по уступам', an: 'Этажи', units: ['floor'],
    line: 'Хатун-Руми вели дороги вниз по обрывам. На этой неделе каждый этаж весит больше.' },
  'Эльфы': { n: 'Большой счёт', an: 'Ритуалы', units: ['ritualHalf'],
    line: 'Иш-Кантун считали дни кругами Большого счёта. На этой неделе каждый час ритуала весит больше.' },
  'Звери': { n: 'Общий перегон', an: 'Клан', units: ['clanAtk'],
    line: 'Орда Златого Оленя кочевала вся разом, великими перегонами. На этой неделе атаки клана весят больше.' },
  'Саганы': { n: 'Обсидиановые зеркала', an: 'Арена и Лига', units: ['arenaWin', 'leagueWin'],
    line: 'В зеркалах Ицаль противник видел самого себя. На этой неделе победы на Арене и в Лиге весят больше.' },
  'Аппараты': { n: 'Медные мастерские', an: 'Мастерская', units: ['craftItem', 'recipe'],
    line: 'Медный Архай отливал стражей для своих островов. На этой неделе мастерская весит больше.' },
  'Искажённые': { n: 'Тысяча обличий', an: 'Элиты', units: ['elite'],
    line: 'У Мешен-Гара маска лежала на маске. На этой неделе каждая элита весит больше.' },
  'Нежить': { n: 'Неувядающие стражи', an: 'Боссы и рунные стражи', units: ['boss', 'guard'],
    line: 'В Та-Нехем мёртвый царь правил дальше, и стражи не покидали постов. На этой неделе боссы и рунные стражи весят больше.' },
  'Забытые': { n: 'Стоячие камни', an: 'Эхо', units: ['echoRound'],
    line: 'Безымянные отказались от имён, и держит их только память. На этой неделе атаки в Эхо весят больше.' },
};
/* что такое Событие в мире — одна строка игроку */
const WORLD = 'Неделя помнит всё, что сделано. Каждое дело — в общий счёт, а счёт приводит рабочих: простые души, что жили на Этериосе.';

/* Сила коллекции РП1 (§10.3): 0,05 % × редкость × цикл × круг за каждого героя коллекции с пробитым первым пределом; не пройденный
   заново предел держит прошлый круг (collRp прототипа, ADR-0031, п. 18). limits — пределов в круге (§10.1: 50 / 150 / 350 / 700 / 1200):
   после обычной доблести пройдены все. Потолок — прежний ориентир максимума §10.3, 33,6 %: без него сила коллекции поздних циклов
   перекрывала бы игру недели */
const RP1 = { perBp: 5, lim: 1, maxValor: 4, capBp: 3360, limits: 5 };

/* Допущения прогона — ручки. Ёмкость — калькуляторы; здесь — то, чего в них нет */
const SIM = {
  weeks: 40,                             // недель на каждую из девяти рас в цикле: всего 360
  seed: 'прогон События',
  tau: [40, 140],                        // активность дня, % обычной: как в прогоне контрактов
  off: { o: 1, e: 0, p: 1 },             // дней без игры в неделе
  ritualMin: { o: 360, e: 300 },         // среднее время ритуала: обычный ставит на время между двумя заходами, увлечённый — чаще
  leagueWinBp: 5000,                     // доля выигранных матчей Лиги: Эло при равных (§20.5)
  payerUnits: ['floor', 'elite', 'boss', 'echoRound', 'craftItem'],   // плательщик: лишний отряд — больше забегов и душ на Эхо
  clan: { members: 25, activeBp: 7000 }, // типичный клан: 25 мест (§24.1), играют 70 % — остальные в неделю не заходят
};

/* Законы и пороги проверок */
const LAWS = {
  oP3Bp: 9000,        // обычный берёт третью планку не меньше чем в 90 % недель
  oP4Bp: 2500,        // и четвёртую — не чаще чем в 25 % недель (в среднем по девяти неделям)
  oP4WeekBp: 4000,    // в самую щедрую неделю акцента — не чаще 40 %
  eP4Bp: 7500,        // увлечённый берёт четвёртую не меньше чем в 75 % недель. Было — пятую: в годовых циклах (ADR-0043) увлечённый —
                      // ×2,1–2,3 обычного по очкам недели, а не ×3: темп его забегов упирается в ритуал этажа, а не в силу отряда
  clanLo: 9000, clanHi: 1000,   // обычный клан — первая клановая планка в 90 % недель, вторая — не чаще 10 %; клан увлечённых — вторая в 90 %
  clanFan3Max: 2500,            // клан увлечённых берёт третью не чаще четверти недель. Было — «в части недель, от 3 до 25 %» (ADR-0031, п. 12):
                                // в годовых циклах (ADR-0043) клан увлечённых — ×2,1 клана обычных, неделя клана — сумма 17 недель и почти
                                // не гуляет; третья (×6 первой) — у кланов сильнее клана увлечённых
  x17: 170,           // §1.2: плательщик при времени обычного — не больше ×1,7
  plankStep: 2,       // соседние планки ×2 (лутбоксы)
};

/* Рейтинг — опоры «место → очки» в долях пятой личной планки цикла (игроки) и суммы пятых планок клана из 25 (кланы), б. п.
   Межсерверный рейтинг — свой у каждого цикла (§1.1). Опоры — демонстрация, в игре места считает сервер по всем игрокам */
const TOP = {
  players: [[1, 25000], [10, 16000], [100, 7000], [300, 2500], [3000, 500]],
  clans: [[1, 20000], [10, 12000], [100, 6000], [1000, 1500]],
  /* лидеры — Странники других серверов: имена не совпадают с участниками клана демо (screens/clan.js) */
  names: ['Медная сойка', 'Горький мёд', 'Третий ключ', 'Полночный счёт', 'Сухая ветвь', 'Лёгкая поступь', 'Ясный уголь', 'Долгая тень', 'Соль дорог', 'Тихий порог'],
  clanNames: ['Северный дозор', 'Светлый круг', 'Серые крылья', 'Медный узел', 'Соль и камень', 'Долгая дорога', 'Белый холм', 'Пепельная стража', 'Ночной караван', 'Тихая гавань'],
};

/* Демо-аккаунт прототипа — один календарь (ADR-0031, п. 17): 11-й день цикла II, вторая неделя цикла, четвёртый день недели, 16:48 —
   до отсечки 3 д 5 ч 12 мин (S.week.left в index.html). Очки демо — медиана недели обычного × доля прошедшего приёма недели; единицы —
   средний день обычного, сколько таких дней нужно на эти очки. Лига у демо открыта: 15 героев обычный набирает к 9-му дню цикла II.
   Клан — остальные участники в среднем набрали столько же, но играют не все — доля SIM.clan.activeBp. Прошлая неделя — первая неделя
   цикла II целиком: типичная неделя обычного */
const DEMO = {
  elapsedS: 3 * 86400 + 16 * 3600 + 48 * 60,   // от начала приёма недели: окно — неделя без часа отсечки и часа подсчёта (cutoffH, countH)
  pastFracBp: 3000,   // прошлая неделя: очки — порог взятой планки и 30 % пути к следующей
};

/* ================================ РАСЧЁТ ================================ */

const loadJs = (file, names) => { const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx); return names.map(n => ctx[n]); };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const dec = (num, den, d = 1) => { if (!den) return '0'; const p = 10 ** d, v = Math.round(num * p / den) / p; return String(v).replace('.', ','); };
const pct = (num, den, d = 0) => dec(num * 100, den, d) + ' %';
const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2]; };
/* вниз до RULES.plankDigits значащих цифр */
const niceDown = v => { if (v < 100) return Math.max(1, Math.floor(v)); const k = 10 ** (String(Math.floor(v)).length - RULES.plankDigits); return Math.floor(v / k) * k; };

/* --- ёмкость среднего дня: общая для этой сборки и калькулятора контрактов --- */
const PROF = { o: 0, e: 1 };
/* средние раунды атаки у профиля: ступени до вершины недели, вес ступени — шанс призыва × атак на убийство (echo.py, Э8) */
const avgRounds100 = (ER, top) => { let w = 0, r = 0; for (let s = 1; s <= top; s++) { const T = ER.types[ER.ladder[s - 1]], x = ER.pickW[s - 1] * T.design; w += x; r += x * T.rounds; } return Math.floor(r * 100 / w); };
/* единиц в средний день, × 100. CAP — capacity.json; caps — ёмкость занятий калькулятора контрактов на цикл, { вид: [обычный, увлечённый] };
   ER — правила боя Эхо (echo-rules.js); econ — прогон контрактов профиля. Без econ контрактов в дне нет: так ёмкость берёт калькулятор
   контрактов для задания «Набрать очки События» — контракт не копит очки сам себе, и сборке не нужен круг «контракты → Событие → контракты».
   leagueBp — доля дней цикла с открытой Лигой, б. п. (leagueOpen, wanderer/achievements-pace.js): матчи Лиги — только в эти дни */
function dayUnits(CAP, caps, ER, c, pk, econ, leagueBp) {
  const C = CAP.cycles[c][pk], i = PROF[pk];
  const ar = Math.floor(C.echoTop.reduce((a, t) => a + avgRounds100(ER, t), 0) / C.echoTop.length);
  return {
    floor: C.floors, elite: C.el, boss: C.boss, guard: caps.guard[i],
    echoRound: Number.isInteger(C.echoRoundsDay) ? C.echoRoundsDay : Math.floor(C.echoAtk * ar / 100),   // раунды — калькулятор Эхо: лестница и КрафБоссы (ADR-0043)
    ritualHalf: Math.floor(caps.ritual[i] * SIM.ritualMin[pk] / 30),
    contractD: econ ? Math.floor(econ.dayDoneBp / 100) : 0, contractW: econ ? Math.floor(econ.weekDoneBp / 700) : 0,
    arenaWin: caps.arenaWin[i],
    leagueWin: Math.floor(Math.floor(caps.league[i] * SIM.leagueWinBp / BP) * (leagueBp == null ? BP : leagueBp) / BP),
    clanAtk: caps.clan[i], craftItem: caps.craft[i], recipe: caps.recipe[i],
    _rounds: Number.isInteger(C.echoRoundsDay) && C.echoAtk ? Math.floor(C.echoRoundsDay * 100 / C.echoAtk) : ar,
  };
}
/* очки среднего дня × 100, без акцента: цена единицы × единицы дня, дневные потолки — как у «сервера» */
const dayPoints100 = u => Object.keys(UNITS).reduce((a, k) => { let v = u[k] || 0; if (CAPS[k] != null) v = Math.min(v, CAPS[k] * 100); return a + UNITS[k].price * v; }, 0);

function build() {
  const err = [], warn = [];
  const CAP = JSON.parse(fs.readFileSync(FILES.cap, 'utf8'));
  const [CT] = loadJs(FILES.contracts, ['EN_CONTRACTS']);
  const [ER] = loadJs(FILES.echo, ['EN_ECHO_RULES']);
  const [LB, EL] = loadJs(FILES.loot, ['EN_LOOTBOXES', 'EnLoot']);
  const [RS] = loadJs(FILES.roster, ['EN_ROSTER']);
  if (!CT || !ER || !LB || !EL || !RS) { err.push('нет данных: contracts.js, echo-rules.js, lootboxes.js или roster.js'); return { err, warn }; }
  const M = LB.modes.event;
  if (!M || M.box !== 'workers') err.push('лутбоксы: у События нет сундука рабочих');
  if (M && M.from !== RULES.from) err.push(`лутбоксы: Событие с цикла ${M.from}, у нас — с ${RULES.from}`);
  const ly = id => M.layers.find(l => l.id === id);
  const plankRows = ly('me').rows, clanRows = ly('clan').rows;
  if (plankRows.some((r, i) => r.x !== LAWS.plankStep ** i)) err.push('лутбоксы: личные планки События не ×2');
  if (clanRows.length !== RULES.clan.x.length || clanRows.some((r, i) => r.x !== RULES.clan.x[i])) err.push(`лутбоксы: клановые планки — ×${clanRows.map(r => r.x).join(' / ')}, у События — ×${RULES.clan.x.join(' / ')}`);
  const typ = M.typical;   // где заканчивают неделю обычный и увлечённый в лутбоксах: личные 3 / 5, клановые 1 / 2
  const PAYER_BP = Math.floor(LB.assume.payerPts[0] * BP / LB.assume.payerPts[1]);
  for (const w of RS.weeks) if (!WEEKS[w.race]) err.push(`неделя ${w.race}: нет События`);
  for (const [race, W] of Object.entries(WEEKS)) for (const u of W.units) if (!UNITS[u]) err.push(`неделя ${race}: акцент на неизвестной единице ${u}`);
  for (const [k, U] of Object.entries(UNITS)) {
    if (!SOURCES.some(s => s.id === U.src)) err.push(`единица ${k}: нет источника ${U.src}`);
    if (!Number.isInteger(U.price) || U.price < 1) err.push(`единица ${k}: цена не целое от 1`);
  }
  if (err.length) return { err, warn };

  /* --- раунды атаки Эхо по рангу цели: правила боя Эхо (ADR-0025) --- */
  const rounds = {};
  for (const [g, T] of Object.entries(ER.types)) rounds[g] = T.rounds;
  /* призванный враг — раунды своего типа по силе (ADR-0039: «крафтового босса» как типа нет): экран Эхо пишет в атаку поле g врага,
     у Забытого — f, 50 раундов, как у Многоликого */
  for (const [g, T] of Object.entries((ER.summon && ER.summon.types) || {})) if (!(g in rounds)) rounds[g] = T.rounds;

  /* --- Лига: доля дней цикла, когда она открыта у профиля, — одно место на все калькуляторы (leagueOpen: темп героев прогона
         достижений, порог и цикл — arena/rules.js) --- */
  const IN = fs.existsSync(FILES.paceIn) ? JSON.parse(fs.readFileSync(FILES.paceIn, 'utf8')) : null;
  if (!IN) { err.push('нет tools/content-gen/wanderer/pace-inputs.json — python tools/content-gen/wanderer/pace_inputs.py'); return { err, warn }; }
  const LO = AP.leagueOpen(ACH, { cap: CAP, lb: LB, inputs: IN, goldHeroes: AP.goldHeroesOf(RS) }, LEAGUE);
  if (LO.err.length) { for (const e of LO.err) err.push('Лига: ' + e); return { err, warn }; }

  /* --- ёмкость: единиц в средний день, × 100; контракты — по прогону контрактов, Лига — в дни, когда она открыта --- */
  const days = {};
  for (const c of RULES.cycles) days[c] = { o: dayUnits(CAP, CT.caps[c], ER, c, 'o', CT.econ[c].o, LO.share[c].o), e: dayUnits(CAP, CT.caps[c], ER, c, 'e', CT.econ[c].e, LO.share[c].e) };
  const dayPts100 = (u, race, mul) => Object.keys(UNITS).reduce((a, k) => {
    let v = u[k] || 0; if (CAPS[k] != null) v = Math.min(v, CAPS[k] * 100);
    if (mul && mul[k]) v = Math.floor(v * mul[k] / BP);
    return a + Math.floor(UNITS[k].price * v * EV.accentBp(D0, race, k) / BP);
  }, 0);
  const D0 = { weeks: {} };   // данные для алгоритма: недели с акцентами
  for (const [race, W] of Object.entries(WEEKS)) D0.weeks[race] = { accent: { units: W.units, bp: RULES.accentBp } };

  /* --- прогон недель: очки × 100 --- */
  const RACES = RS.weeks.map(w => w.race);
  function simWeeks(c, pid, race, W) {
    const pk = pid === 'e' ? 'e' : 'o', u = days[c][pk], out = [];
    const rng = EL.makeRng(EL.seedOf(`${SIM.seed}|${pid}|${c}|${race}`));
    const mul = {};
    if (pid === 'p') { for (const k of SIM.payerUnits) mul[k] = PAYER_BP; mul.guard = Math.floor(days[c].e.guard * BP / Math.max(1, u.guard)); mul.arenaWin = Math.floor(CAPS.arenaWin * 100 * BP / Math.max(1, u.arenaWin)); }
    for (let w = 0; w < W; w++) {
      const tau = []; for (let d = 0; d < 7; d++) tau.push(SIM.tau[0] + rng(SIM.tau[1] - SIM.tau[0] + 1));
      for (let k = 0; k < SIM.off[pid]; k++) tau[rng(7)] = 0;
      let s = 0;
      for (const t of tau) {
        if (!t) continue;
        for (const k of Object.keys(UNITS)) {
          if (k === 'contractD' || k === 'contractW') continue;
          let v = Math.floor(u[k] * t / 100); if (mul[k]) v = Math.floor(v * mul[k] / BP);
          if (CAPS[k] != null) v = Math.min(v, CAPS[k] * 100);
          s += Math.floor(UNITS[k].price * v * EV.accentBp(D0, race, k) / BP);
        }
        if (rng(BP) < CT.econ[c][pk].dayDoneBp) s += Math.floor(UNITS.contractD.price * 100 * EV.accentBp(D0, race, 'contractD') / BP);
      }
      if (rng(BP) < CT.econ[c][pk].weekDoneBp) s += Math.floor(UNITS.contractW.price * 100 * EV.accentBp(D0, race, 'contractW') / BP);
      out.push(Math.floor(s / 100));
    }
    return out;
  }
  const sims = {};
  for (const c of RULES.cycles) {
    sims[c] = {};
    for (const pid of ['o', 'e', 'p']) { sims[c][pid] = {}; for (const race of RACES) sims[c][pid][race] = simWeeks(c, pid, race, SIM.weeks); }
  }
  const all = (c, pid) => RACES.reduce((a, r) => a.concat(sims[c][pid][r]), []);
  const median = xs => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const shareAt = (xs, need) => Math.floor(xs.filter(x => x >= need).length * BP / xs.length);

  /* --- пороги личных планок — одна мерка на все циклы (ADR-0042, ADR-0043): первая планка цикла — типичная неделя обычного (медиана)
         / plankR. Тогда клан любого цикла берёт свою клановую планку одинаково: её порог — сумма первых личных порогов участников × доля.
         Мерка — не ручка: перебор RULES.plankR, середина самого длинного отрезка, где законы держатся во всех циклах; округление порога
         вниз — внутри проверки. Было: в каждом цикле — наибольший порог, при котором законы держатся, и мерка гуляла от цикла к циклу —
         клан цикла VI брал первую клановую при ×0,86 клана цикла II (ADR-0042), неделя Забытых сидела ровно на пороге --- */
  const need = P1 => [P1, P1 * 2, P1 * 4, P1 * 8, P1 * 16];
  const lawsAt = (c, P1) => {   // законы личных планок цикла c при пороге первой P1 — список нарушений
    const O = all(c, 'o'), E = all(c, 'e'), out = [];
    if (shareAt(O, P1 * 4) < LAWS.oP3Bp) out.push(`обычный берёт третью реже ${pct(LAWS.oP3Bp, BP)} недель`);
    const oP4 = shareAt(O, P1 * 8);
    if (oP4 > LAWS.oP4Bp) out.push(`обычный берёт четвёртую планку в ${pct(oP4, BP)} недель — больше ${pct(LAWS.oP4Bp, BP)}`);
    for (const race of RACES) { const x = shareAt(sims[c].o[race], P1 * 8); if (x > LAWS.oP4WeekBp) out.push(`неделя ${race}: обычный берёт четвёртую в ${pct(x, BP)} недель`); }
    if (shareAt(E, P1 * 8) < LAWS.eP4Bp) out.push(`увлечённый берёт четвёртую реже ${pct(LAWS.eP4Bp, BP)} недель`);
    // типичная неделя лутбоксов: медиана обычного — на третьей, увлечённого — на четвёртой
    const mo = EV.reached(need(P1), median(O)), me = EV.reached(need(P1), median(E));
    if (mo !== typ.free.me || me !== typ.fan.me) out.push(`медиана обычного — планка ${mo}, увлечённого — ${me}; в лутбоксах — ${typ.free.me} и ${typ.fan.me}`);
    return out;
  };
  const p1Of = (c, R) => niceDown(Math.floor(median(all(c, 'o')) * 100 / R));
  let best = [], run = [];
  for (let R = RULES.plankR[0]; R <= RULES.plankR[1]; R += RULES.plankR[2]) {
    if (!RULES.cycles.every(c => !lawsAt(c, p1Of(c, R)).length)) { run = []; continue; }
    run.push(R);
    if (run.length > best.length) best = run.slice();
  }
  if (!best.length) err.push(`личные планки: ни одна мерка ${RULES.plankR[0] / 100}–${RULES.plankR[1] / 100} не держит законы во всех циклах`);
  const plankR = best.length ? best[Math.floor(best.length / 2)] : RULES.plankR[0];
  const planks = {};
  for (const c of RULES.cycles) {
    planks[c] = need(p1Of(c, plankR));
    for (const e of lawsAt(c, planks[c][0])) err.push(`цикл ${ROMAN[c]}: ${e}`);
  }

  /* --- кланы: типичный клан из обычных и клан увлечённых; планки — сумма личных порогов участников --- */
  function simClan(c, pid) {
    const N = SIM.clan.members, act = Math.floor(N * SIM.clan.activeBp / BP), rng = EL.makeRng(EL.seedOf(`${SIM.seed}|клан|${pid}|${c}`));
    const pool = all(c, pid), res = [];
    for (let w = 0; w < SIM.weeks * 3; w++) { let s = 0; for (let m = 0; m < act; m++) s += pool[rng(pool.length)]; res.push(s); }
    return res;
  }
  /* доли клановых планок clanX: первая — середина самого длинного отрезка долей, при которых законы кланов держатся во всех циклах
     (запас в обе стороны: закон не сидит на пороге); вторая и третья — шагами RULES.clan.x. Личные планки — одной меркой (plankR),
     поэтому отрезок у всех циклов почти один */
  const clanSims = {};
  for (const c of RULES.cycles) clanSims[c] = { free: simClan(c, 'o'), fan: simClan(c, 'e') };
  const clanXOf = x1 => RULES.clan.x.map(k => x1 * k);
  const needsOf = (x1, c) => EV.clanPlanks({ clanX: clanXOf(x1), planks }, Array(SIM.clan.members).fill(c));
  const clanLaws = (x1, c) => {   // законы кланов цикла c при первой доле x1 — список нарушений
    const needs = needsOf(x1, c), fr = clanSims[c].free, fn = clanSims[c].fan, out = [];
    const r1 = shareAt(fr, needs[0]), r2 = shareAt(fr, needs[1]), f2 = shareAt(fn, needs[1]), f3 = shareAt(fn, needs[2]);
    if (r1 < LAWS.clanLo || r2 > LAWS.clanHi) out.push(`обычный клан — первая клановая в ${pct(r1, BP)}, вторая в ${pct(r2, BP)} недель`);
    if (f2 < LAWS.clanLo || f3 > LAWS.clanFan3Max) out.push(`клан увлечённых — вторая в ${pct(f2, BP)}, третья в ${pct(f3, BP)} недель`);
    if (EV.reached(needs, median(fr)) !== typ.free.clan || EV.reached(needs, median(fn)) !== typ.fan.clan) out.push('клановые планки не сходятся с типичной неделей лутбоксов');
    return out;
  };
  let cBest = [], cRun = [];
  for (let x1 = 1; x1 <= RULES.clan.per * 16; x1++) {
    if (!RULES.cycles.every(c => !clanLaws(x1, c).length)) { cRun = []; continue; }
    cRun.push(x1);
    if (cRun.length > cBest.length) cBest = cRun.slice();
  }
  if (!cBest.length) err.push('клановые планки: ни одна первая доля не держит законы кланов во всех циклах');
  const clanX1 = cBest.length ? cBest[Math.floor(cBest.length / 2)] : RULES.clan.per;
  const clanX = clanXOf(clanX1);
  const clan = {};
  for (const c of RULES.cycles) {
    clan[c] = { needs: needsOf(clanX1, c), free: clanSims[c].free, fan: clanSims[c].fan };
    for (const e of clanLaws(clanX1, c)) err.push(`цикл ${ROMAN[c]}: ${e}`);
  }

  /* --- ×1,7: плательщик при времени обычного; сила коллекции на потолке --- */
  const x17 = {};
  for (const c of RULES.cycles) {
    const mo = median(all(c, 'o')), mp = median(all(c, 'p')), ratio = Math.floor(mp * 100 / mo);
    const po = EV.reached(planks[c], mo), pp = EV.reached(planks[c], mp), pr = EV.reached(planks[c], Math.floor(mo * (BP + RP1.capBp) / BP));
    x17[c] = { mo, mp, ratio, po, pp, pr };
    if (ratio > LAWS.x17) err.push(`цикл ${ROMAN[c]}: плательщик при времени обычного — ×${dec(ratio, 100, 2)}, больше ×1,7`);
    if (pp > po + 1) err.push(`цикл ${ROMAN[c]}: плательщик на ${pp - po} планки выше обычного`);
    if (pr > po + 1) err.push(`цикл ${ROMAN[c]}: сила коллекции на потолке поднимает обычного на ${pr - po} планки`);
  }

  /* --- доля источников в среднем дне обычного, без акцента --- */
  const shares = {};
  for (const c of RULES.cycles) for (const pk of ['o', 'e']) {
    const u = days[c][pk], by = {};
    for (const [k, U] of Object.entries(UNITS)) { let v = u[k] || 0; if (CAPS[k] != null) v = Math.min(v, CAPS[k] * 100); by[U.src] = (by[U.src] || 0) + U.price * v; }
    const tot = Object.values(by).reduce((a, x) => a + x, 0);
    (shares[c] = shares[c] || {})[pk] = { tot: Math.floor(tot / 100), by: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.floor(v * BP / tot)])) };
  }

  /* --- демо-аккаунт: четвёртый день недели обычного, по циклам (DEMO). Лига у демо открыта (15 героев — к 9-му дню цикла II), матчи Лиги
         в счёте — со средней за цикл долей дней с открытой Лигой --- */
  const windowS = 7 * 86400 - (RULES.cutoffH + RULES.countH) * 3600, elapsedBp = Math.floor(DEMO.elapsedS * BP / windowS);
  if (!(elapsedBp > 0 && elapsedBp < BP)) err.push(`демо: день недели вне окна приёма — ${DEMO.elapsedS} с`);
  const demo = {};
  for (const c of RULES.cycles) {
    const u = days[c].o;
    const per = dayPts100(u, '', null), target = Math.floor(median(all(c, 'o')) * elapsedBp / BP);
    const d10 = Math.ceil(target * 1000 / Math.max(1, per));   // дней игры × 10
    const cnt = {};
    for (const k of Object.keys(UNITS)) {
      let v = Math.floor((u[k] || 0) * d10 / 1000);
      if (k === 'contractD') v = Math.floor(d10 * u.contractD / 1000);
      if (k === 'contractW') v = 0;
      if (CAPS[k] != null) v = Math.min(v, Math.floor(CAPS[k] * d10 / 10));
      if (v > 0) cnt[k] = v;
    }
    demo[c] = { d10, cnt, pts: target };
    /* середина недели: планок у демо — на одну меньше, чем за типичную неделю обычного, или уже столько же (акцент недели) */
    for (const race of RACES) {
      const p = Object.entries(cnt).reduce((a, [k, n]) => a + EV.pts({ units: UNITS, weeks: D0.weeks }, k, n, { race }), 0), k = EV.reached(planks[c], p);
      if (k < typ.free.me - 1 || k > typ.free.me) err.push(`демо, цикл ${ROMAN[c]}, неделя ${race}: ${fmt(p)} очков — планка ${k}, ждали ${typ.free.me - 1}–${typ.free.me}`);
    }
  }

  /* --- данные прототипа --- */
  const data = {
    meta: { builder: 'tools/content-gen/event/build.js', rules: 'tools/content-gen/event/rules.js', capacity: 'tools/content-gen/contracts/capacity.json',
      capSha: crypto.createHash('sha1').update(fs.readFileSync(FILES.cap)).digest('hex').slice(0, 12), sources: ['GDD §27', 'GDD §10.3', 'ADR-0024', 'ADR-0026', 'design/ui/contracts.js', 'design/ui/echo-rules.js', 'design/ui/lootboxes.js', 'design/ui/roster.js'] },
    bp: BP, from: RULES.from, cycles: RULES.cycles, cutoffH: RULES.cutoffH, countH: RULES.countH, shop: RULES.shop ? 1 : 0,
    units: UNITS, caps: CAPS, sources: SOURCES, echoRounds: rounds,
    weeks: Object.fromEntries(Object.entries(WEEKS).map(([race, W]) => [race, { n: W.n, an: W.an, line: W.line, accent: { units: W.units, bp: RULES.accentBp } }])),
    world: WORLD, rp1: RP1, clanX, planks, plankR,
    top: { players: TOP.players, clans: TOP.clans, names: TOP.names, clanNames: TOP.clanNames, clanRef: SIM.clan.members },
    demo: { elapsedBp, clanActiveBp: SIM.clan.activeBp, pastFracBp: DEMO.pastFracBp, cyc: demo },
    econ: Object.fromEntries(RULES.cycles.map(c => [c, {
      day: { o: shares[c].o.tot, e: shares[c].e.tot },
      share: { o: shares[c].o.by, e: shares[c].e.by },
      week: { o: median(all(c, 'o')), e: median(all(c, 'e')), p: median(all(c, 'p')) },
      oP3Bp: shareAt(all(c, 'o'), planks[c][2]), oP4Bp: shareAt(all(c, 'o'), planks[c][3]), eP4Bp: shareAt(all(c, 'e'), planks[c][3]), eP5Bp: shareAt(all(c, 'e'), planks[c][4]),
      x17: x17[c].ratio, rounds: { o: days[c].o._rounds, e: days[c].e._rounds },
    }])),
  };

  /* --- проверки данных: только целые --- */
  const walk = (x, where) => { if (typeof x === 'number' && !Number.isInteger(x)) err.push(`данные: не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, where + '.' + k); };
  walk(data, 'EN_EVENT');

  /* ================================ ТАБЛИЦЫ ================================ */
  const TBL = {};
  const head = cols => ['| ' + cols.join(' | ') + ' |', '| ' + cols.map(() => '---').join(' | ') + ' |'];
  const cells = xs => '| ' + xs.join(' | ') + ' |';
  const srcName = id => SOURCES.find(s => s.id === id).n;
  const unitTxt = k => { const U = UNITS[k]; return k === 'echoRound' ? `${fmt(U.price * rounds.o)} / ${fmt(U.price * rounds.e)} / ${fmt(U.price * rounds.b)} / ${fmt(U.price * rounds.u)}` : fmt(U.price); };
  let T;

  // занятия → очки
  T = head(['Занятие', 'Единица', 'Очков', 'Потолок в день', 'Что засчитывается']);
  for (const [k, U] of Object.entries(UNITS)) T.push(cells([srcName(U.src), U.n + (U.from ? ` · с цикла ${ROMAN[U.from]}` : '') + (U.gate === 'league' ? ` · при открытой Лиге: ${LEAGUE.heroes} героев` : ''), unitTxt(k) + (k === 'echoRound' ? ' — рядовой / элита / босс / Убер-босс' : k === 'ritualHalf' ? ' за полчаса' : ''), CAPS[k] != null ? String(CAPS[k]) : '—', U.what]));
  TBL.units = T.join('\n');

  // девять Событий
  T = head(['Неделя', 'Цивилизация Эхо', 'Событие', 'Акцент ×' + dec(RULES.accentBp, BP, 1), 'Строка игроку']);
  for (const w of RS.weeks) { const W = WEEKS[w.race]; T.push(cells([w.race, w.civ, W.n, W.an, W.line])); }
  TBL.weeks = T.join('\n');

  // ёмкость и очки среднего дня
  T = head(['Цикл', 'Профиль', 'Этажи', 'Элиты', 'Боссы', 'Стражи', 'Раундов Эхо', 'Получасов ритуалов', 'Победы Арены / Лиги', 'Атаки клана', 'Создано / рецептов', 'Очков в день']);
  for (const c of RULES.cycles) for (const pk of ['o', 'e']) {
    const u = days[c][pk], v = k => dec(Math.min(u[k], CAPS[k] != null ? CAPS[k] * 100 : Infinity), 100, 1);
    T.push(cells([pk === 'o' ? ROMAN[c] : '', pk === 'o' ? 'обычный' : 'увлечённый', v('floor'), v('elite'), v('boss'), v('guard'), v('echoRound'), v('ritualHalf'), `${v('arenaWin')} / ${v('leagueWin')}`, v('clanAtk'), `${v('craftItem')} / ${v('recipe')}`, fmt(shares[c][pk].tot)]));
  }
  TBL.cap = T.join('\n');

  // доли источников
  T = head(['Цикл', 'Профиль', ...SOURCES.map(s => s.n)]);
  for (const c of RULES.cycles) for (const pk of ['o', 'e']) T.push(cells([pk === 'o' ? ROMAN[c] : '', pk === 'o' ? 'обычный' : 'увлечённый', ...SOURCES.map(s => pct(shares[c][pk].by[s.id] || 0, BP))]));
  TBL.share = T.join('\n');

  // планки и прогон
  T = head(['Цикл', 'Планки 1–5', 'Обычный: неделя → планка', 'Третья / четвёртая, доля недель', 'Увлечённый: неделя → планка', 'Четвёртая / пятая, доля недель', 'Плательщик: неделя → планка', 'Неделя обычного — первых планок']);
  for (const c of RULES.cycles) {
    const E = data.econ[c];
    T.push(cells([ROMAN[c], planks[c].map(fmt).join(' / '), `${fmt(E.week.o)} → ${EV.reached(planks[c], E.week.o)}`, `${pct(E.oP3Bp, BP)} / ${pct(E.oP4Bp, BP)}`, `${fmt(E.week.e)} → ${EV.reached(planks[c], E.week.e)}`, `${pct(E.eP4Bp, BP)} / ${pct(E.eP5Bp, BP)}`, `${fmt(E.week.p)} → ${EV.reached(planks[c], E.week.p)}`, '×' + dec(E.week.o, planks[c][0], 2)]));
  }
  TBL.planks = T.join('\n');

  // недели акцентов: цикл II и VI
  T = head(['Неделя', 'Акцент', 'II: обычный, медиана', 'II: четвёртая у обычного', 'II: четвёртая у увлечённого', 'VI: обычный, медиана', 'VI: четвёртая у обычного', 'VI: четвёртая у увлечённого']);
  for (const race of RACES) {
    const r = c => [fmt(median(sims[c].o[race])), pct(shareAt(sims[c].o[race], planks[c][3]), BP), pct(shareAt(sims[c].e[race], planks[c][3]), BP)];
    T.push(cells([race, WEEKS[race].an, ...r(2), ...r(6)]));
  }
  TBL.accents = T.join('\n');

  // кланы
  T = head(['Цикл', `Клановые планки, клан из 25: на участника ×${clanX.map(x => dec(x, RULES.clan.per, 2)).join(' / ')} первого личного порога`, 'Обычный клан: неделя → планка', 'Первая / вторая, доля недель', 'Клан увлечённых: неделя → планка', 'Вторая / третья, доля недель']);
  for (const c of RULES.cycles) {
    const K = clan[c];
    T.push(cells([ROMAN[c], K.needs.map(fmt).join(' / '), `${fmt(median(K.free))} → ${EV.reached(K.needs, median(K.free))}`, `${pct(shareAt(K.free, K.needs[0]), BP)} / ${pct(shareAt(K.free, K.needs[1]), BP)}`,
      `${fmt(median(K.fan))} → ${EV.reached(K.needs, median(K.fan))}`, `${pct(shareAt(K.fan, K.needs[1]), BP)} / ${pct(shareAt(K.fan, K.needs[2]), BP)}`]));
  }
  TBL.clan = T.join('\n');

  // ×1,7
  T = head(['Цикл', 'Обычный, медиана недели', 'Плательщик при том же времени', 'Во сколько раз', 'Планка: обычный → плательщик', 'Сила коллекции на потолке: планка', 'Не больше ×1,7 и одной планки']);
  for (const c of RULES.cycles) { const X = x17[c]; T.push(cells([ROMAN[c], fmt(X.mo), fmt(X.mp), '×' + dec(X.ratio, 100, 2), `${X.po} → ${X.pp}`, String(X.pr), X.ratio <= LAWS.x17 && X.pp <= X.po + 1 && X.pr <= X.po + 1 ? 'да' : 'нет'])); }
  TBL.x17 = T.join('\n');

  // награды недели: сундуки рабочих у типичных игроков (лутбоксы)
  T = head(['Цикл', 'Личные планки: сундуки 1–5', 'Клановые планки, на участника', 'Места игроков: топ-1 / 10 / 100', 'Шардов рабочих в неделю: обычный / увлечённый']);
  const box = g => g.map(x => `${x.count > 1 ? x.count + ' × ' : ''}${LB.boxRarity[x.r - 1]}${x.win === 'pure' ? ' · чистое' : ''}`).join(' + ');
  for (const c of RULES.cycles) {
    const W = LB.week.event[c];
    T.push(cells([ROMAN[c], plankRows.map(r => box(r.cyc[c])).join('; '), clanRows.map(r => box(r.cyc[c])).join('; '), ly('top').rows.map(r => box(r.cyc[c])).join('; '), `${dec(W.free.wsh, 100, 1)} / ${dec(W.fan.wsh, 100, 1)}`]));
  }
  TBL.rewards = T.join('\n');

  // демо
  T = head(['Цикл', 'Дней игры', 'Этажей', 'Элит', 'Боссов', 'Раундов Эхо', 'Получасов ритуалов', 'Очков — неделя эльфов, без силы коллекции', 'Планка']);
  for (const c of RULES.cycles) {
    const x = demo[c].cnt, p = Object.entries(x).reduce((a, [k, n]) => a + EV.pts({ units: UNITS, weeks: D0.weeks }, k, n, { race: 'Эльфы' }), 0);
    T.push(cells([ROMAN[c], dec(demo[c].d10, 10, 1), fmt(x.floor || 0), fmt(x.elite || 0), fmt(x.boss || 0), fmt(x.echoRound || 0), fmt(x.ritualHalf || 0), fmt(p), String(EV.reached(planks[c], p))]));
  }
  TBL.demo = T.join('\n');

  return { data, tables: TBL, err, warn, sims, planks, clan, x17, shares, days };
}

/* ================================ ВЫВОД ================================ */

function render(data) {
  const rules = fs.readFileSync(FILES.rules, 'utf8').replace(/\r\n/g, '\n');
  const head = `/* Событие недели — данные прототипа «Свет снизу». Собирает tools/content-gen/event/build.js из калькуляторов экономики
   (capacity.json), ёмкости и прогона контрактов, правил боя Эхо, сундуков и недель. Руками не править: пересборка затрёт правку.
   Черновик · предложение · ждёт автора. Числа — демонстрация, только целые; доли — в базисных пунктах (10 000 = 100 %).
   units — цена единицы в очках, caps — дневные потолки, weeks — девять Событий с акцентом недели, planks[цикл] — пороги
   личных планок, clanX — клановая планка k = сумма первых личных порогов участников × clanX[k] / 100, top — опоры рейтинга, demo — демо-аккаунт,
   econ — итоги прогона. Обоснование и таблицы — docs/content/событие.md. В игре очки, планки и места решает сервер (§27, §36.16):
   клиент получает свои очки, пороги и место. Ниже данных — алгоритм tools/content-gen/event/rules.js как есть. */\n`;
  return head + 'window.EN_EVENT = ' + JSON.stringify(data) + ';\n' + rules;
}
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/event/build.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) return null;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { build, render, withTables, markA, markB, FILES, RULES, UNITS, CAPS, WEEKS, SIM, LAWS, TOP, DEMO, dayUnits, dayPoints100 };

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
    console.log(okJs && okDoc ? 'Свежие: event.js и таблицы документа совпадают со сборкой.' : `Устарели: ${[!okJs && 'design/ui/event.js', !okDoc && 'docs/content/событие.md'].filter(Boolean).join(', ')} — пересобрать.`);
    process.exit(okJs && okDoc ? 0 : 1);
  }
  fs.writeFileSync(FILES.out, js);
  if (docNew) fs.writeFileSync(FILES.doc, docNew);
  else console.log(`предупреждение: в ${path.relative(ROOT, FILES.doc)} нет меток таблиц — таблицы не вставлены`);
  const P = R.data.planks;
  console.log(`Собрано: единиц ${Object.keys(R.data.units).length}, недель ${Object.keys(R.data.weeks).length}; пороги первой планки по циклам — ${R.data.cycles.map(c => fmt(P[c][0])).join(' / ')}.`);
}
