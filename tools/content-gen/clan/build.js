/* Клан — калькулятор и сборщик: GDD §24 «Кланы», §25 «Клановый босс», §1.2, §6, §16, §18, §23, §36; ADR-0005, ADR-0010, ADR-0014,
   ADR-0016, ADR-0022–ADR-0026, ADR-0028. Черновик · предложение · ждёт автора. Все числа — демонстрация.

   Что считает:
   1. Резервуар (§24.3). Цели §24.3 — «первое очко за пару дней» и «сотое к концу второго года активного клана» — при показателе 1,5
      не сходятся: сумма требований до сотого уровня в 40 501 раз больше первого. Решение: цели — главное, показатель — ручка.
      База — два дня притока свежего клана (25 обычных игроков цикла II), показатель — дробь из кандидатов, у которой эталонный
      клан берёт сотое очко ближе всего к 730-му дню. Приток — половина очков контрактов (EN_CONTRACTS.econ, контракты §18.1),
      участники — полный состав по вместимости древа, циклы — по календарю калькуляторов (capacity.json).
   2. Древо (§24.2): 100 уровней, четыре ветки по десять, круг повторяется; на уровне — одна пассивка из 1–5 альтернатив. Вехи:
      пятый уровень ветки первого круга — +1 атака КБ, дальше те же места — пул элит, скорость резервуара, длительность бонусов;
      десятый — +1 место. Пассивки — только по спискам 7 стихий, 6 классов, 9 рас недели; в PvP не действуют.
   3. Клановый босс (§25): круг — три элиты и босс; «статы × X» — уровень врагов круга: (12 + уровень) × X за круг. Круг 1 —
      по силе отряда обычного игрока в первый день цикла II (capacity.json). Здоровье элит и босса — прогон ядра боя (battle.js)
      отрядом прототипа: на равной силе элита — за eliteAtk атак, босс — за bossAtk. Неделя эталонных кланов — тот же прогон:
      сколько кругов и очков клан берёт своими атаками.
   4. Награды (§24.4, §23): пул клана — сундуки места клана из lootboxes.js на каждого участника; половина — сервер по вкладу,
      половина — глава. Ступень сундука — от цикла получателя.
   5. Проверки: целые числа, структура древа и вехи, списки пассивок, наборы врагов в библиотеке, цели резервуара, калибровка
      круга 1, рост кругов, ступени наград, ×1,7 (§1.2), законы честной модерации.

   Пишет:
   - design/ui/clan.js — данные прототипа (window.EN_CLAN) и алгоритмы клана (window.EnClan из core.js как есть), руками не править;
   - docs/content/клан.md — только таблицы между метками «<!-- @таблица имя -->» и «<!-- /таблица имя -->»; текст — ручной.
   Читает: capacity.json (python tools/content-gen/clan/capacity.py), design/ui/battle.js, abilities.js, kits.js — ядро боя и
   библиотека; contracts.js — очки контрактов; lootboxes.js — сундуки места клана; roster.js — недели рас.
   Любая ошибка — файлы не пишутся. Пересборка даёт те же байты.
   Запуск: node tools/content-gen/clan/build.js            — собрать и записать;
           node tools/content-gen/clan/build.js --check    — только проверить, что файлы свежие;
           node tools/content-gen/clan/build.js --print    — напечатать таблицы, и при ошибках. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const FILES = {
  cap: path.join(__dirname, 'capacity.json'),
  core: path.join(__dirname, 'core.js'),
  out: path.join(UI, 'clan.js'),
  doc: path.join(ROOT, 'docs', 'content', 'клан.md'),
  ui: ['battle.js', 'abilities.js', 'kits.js', 'lootboxes.js', 'contracts.js', 'roster.js'].map(f => path.join(UI, f)),
};

/* ================================ ДАННЫЕ ================================ */

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/* Общие правила §24: паспорт, роли и права, вход и выход, законы. Числа — демонстрация */
const RULES = {
  bp: 10000,
  open: { level: 10, cycle: 2 },            // §16: кланы открывает 10-й уровень Странника — начало цикла II
  lists: {
    els: ['Вода', 'Огонь', 'Земля', 'Воздух', 'Свет', 'Тьма', 'Время'],   // §36.15: семь элементов
    classes: ['Танк', 'Лекарь', 'Физ. ДД силы', 'Физ. ДД ловкости', 'Маг. ДД', 'Контроль'],   // §36.15: шесть боевых классов; контроль и дебаффер — один класс (ADR-0022)
    // §24.2: канонические 10 рас; Перворождённые — спойлер до 11-го биома (дайджест), в пассивки игроку не идут — девять рас недели из roster.js
  },
  capacity: { base: 25, every: 10, add: 1 },   // §24.1: вместимость 25 → 35, +1 за каждый 10-й уровень древа
  passport: {
    types: [   // §24.1: тип клана — Хард / Средний / Чил; тип — обещание участникам, правил боя он не меняет
      { id: 'hard', n: 'Хард', d: 'Все атаки босса и контракт каждый день. Цель — верхние места.' },
      { id: 'mid', n: 'Средний', d: 'Атаки и контракты — каждый день, сколько получится.' },
      { id: 'chill', n: 'Чил', d: 'Без обязательств: играем, как выходит.' },
    ],
    join: [{ id: 'open', n: 'Свободный вход' }, { id: 'apply', n: 'По заявке' }],
    req: { level: [10, 15, 20, 25, 30, 40, 50], cycle: [2, 3, 4, 5, 6] },   // требования: уровень Странника и цикл
    nameMax: 24, noteMax: 140, emblems: 12,          // эмблем — заглушки до арта (tools/art-gen/jobs/clan.json)
    createGoldPerCycle: 10000,                        // создать клан — золото × цикл, как первый герой за золото цикла (ADR-0014)
  },
  /* §24.1: роли — глава называет роли сам, с капами по ролям; прототип — три уровня прав */
  roles: [
    { id: 'head', n: 'Глава', cap: 1, rights: ['passport', 'goals', 'tree', 'reset', 'gifts', 'roles', 'apps', 'kick', 'lead'] },
    { id: 'treasurer', n: 'Казначей', cap: 2, rights: ['goals', 'gifts', 'apps'] },
    { id: 'member', n: 'Участник', cap: 0, rights: [] },
  ],
  rights: {
    passport: 'Паспорт: имя, эмблема, тип, требования',
    goals: 'Цели дня, недели и месяца',
    tree: 'Очки навыков — пассивки древа',
    reset: 'Сброс древа за Энериум',
    gifts: 'Раздача половины наград',
    roles: 'Роли участников',
    apps: 'Заявки на вступление',
    kick: 'Исключение — с причиной в журнале',
    lead: 'Передача главенства',
  },
  headAwayDays: 7,                                    // глава не заходит неделю — главенство переходит казначею с наибольшим вкладом
  kickReasons: ['Не играет больше двух недель', 'Нарушает принципы клана', 'Попросил сам', 'Другая причина — в журнале'],
  /* CLAUDE.md, «Честная модерация»: никаких коллективных наказаний; для клана — никаких наказаний всего клана за одного */
  laws: [
    'Клан не наказывают за одного: ни штрафа, ни запрета на рейтинг, ни снятия наград с остальных.',
    'Выйти можно в любой момент, без штрафа и ожидания: герои, запасы, личный рейтинг и Дары остаются с игроком.',
    'Исключает только глава и только с причиной — причина и имя главы пишутся в журнал. Исключённый ничего своего не теряет.',
    'Журнал клана видят все участники, и он не стирается при выходе: раздача наград — публичный факт.',
    'Половину наград делит сервер по вкладу — эту половину глава не трогает.',
    'Глава не раздал свою половину в срок — её раздаёт сервер по вкладу.',
    'Бан за читы и мошенничество выносит модерация игры с доказательством из журналов сервера; клан за него не отвечает.',
  ],
};

/* Резервуар §24.3: цели — главное, показатель — ручка (см. шапку файла) */
const RES = {
  targets: { firstDays: 2, lastDays: 730, tolBp: 1000 },   // §24.3: первое очко — за пару дней, сотое — к концу второго года; допуск ±10 %
  baseStep: 100,                                            // база кратна 100
  exps: [[1, 2], [5, 9], [4, 7], [7, 12], [3, 5], [5, 8], [2, 3], [3, 2]],   // кандидаты показателя; 3/2 — прежний §24.3, для сравнения
  gdd: [3, 2],
  ref: { prof: 'o', startMembers: 25 },                    // эталон: «активный клан» — полный состав обычных игроков (3 ч в день)
  horizonDays: 40000,                                       // предел прогона, дней
  marks: [1, 5, 10, 15, 25, 35, 50, 75, 100],              // уровни в таблице сроков
};

/* Древо §24.2: ветки, вехи, каталог пассивок. Значения — × номер круга древа (1–3), «плоские» — нет */
const TREE = {
  levels: 100, branchLen: 10,
  branches: [
    { id: 'power', n: 'Сила в бою', d: 'Урон по врагам разных типов и героями разных классов, щиты и лечение.' },
    { id: 'elem', n: 'Стихии', d: 'Урон героев своей стихии.' },
    { id: 'loot', n: 'Добыча', d: 'Золото, дух, души, ключи, ресурсы и осколки.' },
    { id: 'time', n: 'Время и выносливость', d: 'Раунды у врагов клана, здоровье, контроль и заслоны от стихий.' },
  ],
  why: 'Клан учится бить, потом бить правильно, потом собирать, потом выживать.',
  mile5: { first: { k: 'attack', v: 1 }, next: [{ k: 'pool', v: 1 }, { k: 'speed', v: 1000 }, { k: 'dur', v: 1 }] },   // §24.2: «4 за 40», затем пул элит, скорость резервуара, длительность бонусов
  mile10: { k: 'cap', v: 1 },                                                                                      // §24.2: каждый десятый — +1 вместимость
  mileName: { attack: '+1 атака по врагам клана в день', pool: '+1 элита в круге', speed: 'Резервуар наполняется быстрее на 10 %', dur: 'Баффы героев в бою клана держатся на раунд дольше', cap: '+1 место в клане' },
  alts: { regular: { power: 4, elem: 5, loot: 4, time: 4 }, tactic: 3, key: 1 },   // §24.2: одна пассивка из 1–5 альтернатив
  caps: { roundB: 5, roundE: 5, ctrlDur: 2, debuffKb: 2 },                            // потолки суммы «плоских» пассивок
  reset: { price: 300, perWeek: 1 },   // §24.2: сброс древа за Энериум — не чаще раза в неделю расы; уровень и очки не меняет
  /* виды пассивок: n и d — шаблоны ({p} — параметр из списка, {v} — значение), v — значение на первом круге, flat — не растёт с кругом,
     live — прототип применяет в бою клана; остальное — показ: сервер переводит бонусы в прибавки при сборке боя, как бонусы режима талисманов */
  kinds: {
    dmgCls: { n: 'Выучка: {p}', d: 'Урон героев класса «{p}» +{v} %', v: 2, list: 'classes' },
    dmgRace: { n: 'Знание: {p}', d: 'Урон по врагам расы «{p}» +{v} %', v: 2, list: 'races' },
    dmgO: { n: 'Против рядовых', d: 'Урон по рядовым +{v} %', v: 2 },
    dmgE: { n: 'Против элит', d: 'Урон по элитам +{v} %', v: 2 },
    dmgB: { n: 'Против боссов', d: 'Урон по боссам +{v} %', v: 1 },
    shield: { n: 'Крепкий щит', d: 'Щиты героев +{v} %', v: 3 },
    heal: { n: 'Тёплые руки', d: 'Лечение героев +{v} %', v: 3 },
    dmgEl: { n: 'Карст: {p}', d: 'Урон героев стихии «{p}» +{v} %', v: 2, list: 'els' },
    gold: { n: 'Звонкая монета', d: 'Золото с врагов +{v} %', v: 2 },
    spirit: { n: 'Лёгкий дух', d: 'Дух с врагов +{v} %', v: 2 },
    souls: { n: 'Ловцы душ', d: 'Души с элит и боссов +{v} %', v: 1 },
    keys: { n: 'Связка ключей', d: 'Рунные ключи из контрактов +{v} %', v: 2 },
    base: { n: 'Мешок находок', d: 'Базовые ресурсы из забегов +{v} %', v: 2 },
    shards: { n: 'Осколки в дорогу', d: 'Осколки героев из сундуков Эхо +{v} %', v: 2 },
    resEl: { n: 'Заслон: {p}', d: 'Урон по героям от врагов стихии «{p}» −{v} %', v: 2, list: 'els' },
    hp: { n: 'Выносливость', d: 'Здоровье героев +{v} %', v: 2 },
    ctrlDur: { n: 'Долгий контроль', d: 'Контроль героев держится на {v} раунд дольше', v: 1, flat: true },
    dmgKb: { n: 'Натиск на босса', d: 'Урон по клановому боссу +{v} %', v: 3 },
    dmgKe: { n: 'Охота на элит', d: 'Урон по элитам клана +{v} %', v: 3 },
    debuffKb: { n: 'Слабое место', d: 'Дебаффы героев на клановом боссе держатся на {v} раунд дольше', v: 1, flat: true },
    roundB: { n: 'Долгий бой с боссом', d: '+{v} раунд в атаке по клановому боссу', v: 1, flat: true, live: true },
    roundE: { n: 'Долгий бой с элитами', d: '+{v} раунд в атаке по элитам клана', v: 1, flat: true, live: true },
    edge: { n: 'Сильная стихия', d: 'Урон героев, чья стихия сильнее стихии цели клана, +{v} %', v: 3 },
    keyPower: { n: 'Знамя клана', d: 'Урон всех героев +{v} %', v: 2 },
    keyElem: { n: 'Круг стихий', d: 'Урон героев по стихии, слабой к их стихии, +{v} %', v: 2 },
    keyLoot: { n: 'Общий котёл', d: 'Вся добыча забегов +{v} %', v: 1 },
    keyTime: { n: 'Стойкость клана', d: 'Здоровье героев +{v} %', v: 2 },
  },
  catalog: { power: ['dmgCls', 'dmgRace', 'dmgO', 'dmgE', 'dmgB', 'shield', 'heal'], elem: ['dmgEl'], loot: ['gold', 'spirit', 'souls', 'keys', 'base', 'shards'], time: ['resEl', 'hp', 'ctrlDur'] },
  tactic: { power: ['dmgKb', 'dmgKe', 'debuffKb'], elem: ['edge', 'dmgKb', 'dmgKe'], loot: ['roundE', 'dmgKe', 'edge'], time: ['roundB', 'roundE', 'debuffKb'] },   // §24.2: пятые уровни — тактика убийства КБ
  key: { power: 'keyPower', elem: 'keyElem', loot: 'keyLoot', time: 'keyTime' },
};

/* Клановый босс §25 */
const BOSS = {
  attacks: { day: 5, carryDays: 1 },     // §25.1: 5 атак в день, растёт древом; общий кошелёк на элит и босса; копится ещё одна дневная норма — беречь для КБ
  pool: 3, poolMax: 5, kills: 3,         // §25.2: 3 элиты в пуле, пул растёт древом; три победы — автопризыв КБ, висящие элиты сгорают
  rounds: { e: 10, b: 15 },              // §25.1: лимит атаки — раунды; у босса дольше: контроль на него не действует, только дебаффы
  circle: { xBp: 12500, from: { prof: 'o', c: 2, day: 1 } },   // §25.2: статы × X за круг — ×1,25; круг 1 — отряд обычного игрока в 1-й день цикла II
  points: { elite: 100, boss: 600, yBp: 12500 },               // §25.3: элита платит меньше КБ, очки растут с кругом — как сила врагов, очко за атаку не зависит от круга
  design: { eliteAtk: 6, bossAtk: 30, seeds: [11, 29] },       // на равной силе элита падает за 6 атак, босс — за 30 (калибровка круга 1)
  classes: ['Танк', 'Лекарь', 'Физ. ДД силы', 'Физ. ДД ловкости', 'Маг. ДД', 'Дебаффер'],   // классы ядра; «Дебаффер» — класс «Контроль» (ADR-0022)
  tplE: { 'Физ. ДД силы': 'e1', 'Физ. ДД ловкости': 'e2', 'Танк': 'e3', 'Маг. ДД': 'e4', 'Лекарь': 'e5', 'Дебаффер': 'e6' },   // характеристики — элиты Мастерской того же класса
  tplB: 'b1', bossCls: 'Босс',                                  // босс — характеристики босса Мастерской, класс ядра «Босс»
  rank: { e: { core: 'e', acts: 2, ults: 0, share: [3600, 0] }, b: { core: 'clan', acts: 5, ults: 2, share: [5000, 1000] } },   // ADR-0016: элита — две без ульты, как уникальная; клановый — семь, как вневременная
  kinds: {
    e: {   // приёмы класса по порядку, как у врагов Эхо (screens/echo.js, ECH.fight.kinds)
      'Танк': ['dmg.grp', 'shield.all', 'debuff.one', 'ctrl.one'],
      'Физ. ДД силы': ['dmg.one', 'dmg.grp', 'debuff.one', 'dot.one'],
      'Физ. ДД ловкости': ['dmg.one', 'dot.one', 'dmg.grp', 'debuff.one'],
      'Маг. ДД': ['dmg.all', 'dmg.one', 'dot.grp', 'ctrl.one'],
      'Лекарь': ['heal.one', 'heal.all', 'hot.one', 'shield.one'],
      'Дебаффер': ['debuff.grp', 'ctrl.one', 'debuff.one', 'dot.grp'],
    },
    b: ['dmg.all', 'dot.all', 'debuff.all', 'ctrl.grp', 'buff.one', 'ult.dmg', 'ult.debuff'],   // §7: пять приёмов по пятерым и ульта
  },
  /* §25.4: состав боссов по девяти расам и их стихии — таблица автора, её пока нет. Заглушка: стихии по кругу семи в порядке недель */
  raceEls: 'round',
  single: { 'Люди': 'Человек', 'Дворфы': 'Дворф', 'Эльфы': 'Эльф', 'Звери': 'Зверь', 'Саганы': 'Саган', 'Аппараты': 'Аппарат', 'Искажённые': 'Искажённый', 'Нежить': 'Нежить', 'Забытые': 'Забытый' },
  bmC: 4000,                             // §6: C = 40, как у бестиария биомов (tools/content-gen/biomes/build.js)
  antiHop: 'next-week',                  // §25.3: кто на этой неделе бил врагов другого клана, клану приносит очки со следующей недели
};

/* Награды §24.4 */
const REWARDS = {
  splitBp: 5000,                          // половина — сервер по вкладу, половина — глава
  contrib: { resBp: 5000, bossBp: 5000 }, // вклад: доля в резервуаре недели и доля в очках КБ — поровну
  headH: 48,                              // срок раздачи главой после подсчёта недели; не успел — сервер по вкладу
  mode: 'clan',                           // строки мест кланов — EN_LOOTBOXES.modes.clan
};

/* Отряд прототипа — фикстура S.heroes из design/ui/index.html, как в калькуляторе экономики (economy.py, SIM_JS) */
const A = a => a.map(n => ({ n })), P = a => a.map(n => ({ n, t: 'боевая' }));
const SQUAD = [
  { id: 'h1', name: 'Гарт Нишевой', cls: 'Танк', el: 'Земля', draft: 'h01_2', lvl: 42, valor: 2, st: [128, 54, 72, 246, 62], ab: A(['Вызов', 'Удар щитом', 'Осыпание']), pas: P(['Несгибаемость']), ult: null },
  { id: 'h2', name: 'Хравн Сборщик', cls: 'Физ. ДД ловкости', fx: 'melee', el: 'Огонь', draft: 'h01_3', lvl: 50, valor: 1, st: [128, 54, 245, 72, 62], ab: A(['Горение', 'Быстрый выпад', 'Погребальный костёр']), pas: P(['Точность']), ult: null },
  { id: 'h3', name: 'Лаэйра', cls: 'Маг. ДД', el: 'Время', draft: 'h01_5', lvl: 118, valor: 2, st: [72, 246, 54, 62, 128], ab: A(['Разряд', 'Остановка']), pas: P(['Средоточие']), ult: { n: 'Испепеление', at: 5 } },
  { id: 'h4', name: 'Ильмерра', cls: 'Хилер', el: 'Воздух', draft: 'h01_1', lvl: 46, valor: 1, st: [62, 246, 54, 128, 72], ab: A(['Живая вода', 'Лёгкая поступь', 'Оберег']), pas: P(['Отклик']), ult: null },
  { id: 'h5', name: 'Мирт Переписчик', cls: 'Контроль', el: 'Вода', draft: 'h01_4', lvl: 35, valor: 3, st: [62, 246, 54, 128, 72], ab: A(['Оковы', 'Стужа', 'Ослабление']), pas: P(['Тень']), ult: { n: 'Ледяные оковы', at: 2 } },
];

/* эталонные недели кланового босса: профиль, цикл, неделя цикла; сила отряда — средняя за неделю (capacity.json),
   участники и атаки — по древу эталонного клана на середину той недели */
const WEEKS = [
  { prof: 'o', c: 2, w: 1 }, { prof: 'o', c: 2, w: 2 }, { prof: 'o', c: 3, w: 2 }, { prof: 'o', c: 4, w: 2 }, { prof: 'o', c: 5, w: 2 }, { prof: 'o', c: 6, w: 2 },
  { prof: 'e', c: 2, w: 2 }, { prof: 'e', c: 3, w: 2 }, { prof: 'e', c: 6, w: 2 },
];
const PROF = { o: 'обычный', e: 'увлечённый' };

/* законы калькулятора */
const LAWS = { x17: 170, circleTolBp: 1500, maxCircles: 80 };

/* ================================ ЗАГРУЗКА ================================ */

const err = [], warn = [];
const fail = m => err.push(m);
const ctx = { console }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of FILES.ui.concat(FILES.core)) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: path.basename(f) });
const EB = ctx.EnBattle, EC = ctx.EnClan, LBX = ctx.EN_LOOTBOXES, CT = ctx.EN_CONTRACTS, RS = ctx.EN_ROSTER;
const CAP = JSON.parse(fs.readFileSync(FILES.cap, 'utf8'));
const fl = (a, b) => Math.floor(a / b);
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const dec = (num, den, k = 1) => { const m = 10 ** k, v = Math.round(num * m / den); const s = String(Math.floor(v / m)) + (k ? ',' + String(v % m).padStart(k, '0') : ''); return s.replace(/,0+$/, ''); };
const pct = (num, den, k = 0) => dec(num * 100, den, k) + ' %';

/* ================================ СБОРКА ДАННЫХ ================================ */

function build() {
  const D = { meta: { builder: 'tools/content-gen/clan/build.js', capacity: 'tools/content-gen/clan/capacity.json', core: 'tools/content-gen/clan/core.js',
    sources: ['GDD §24', 'GDD §25', 'GDD §1.2', 'GDD §6', 'GDD §23', 'ADR-0010', 'ADR-0016', 'ADR-0022', 'ADR-0026', 'design/ui/contracts.js', 'design/ui/lootboxes.js', 'design/ui/roster.js'] } };
  D.bp = RULES.bp;
  D.open = RULES.open;
  const races = RS.weeks.map(w => w.race);
  D.lists = { els: RULES.lists.els.slice(), classes: RULES.lists.classes.slice(), races, gen: Object.fromEntries(RS.weeks.map(w => [w.race, w.gen])) };
  D.capacity = RULES.capacity;
  D.passport = RULES.passport;
  D.roles = RULES.roles; D.rights = RULES.rights; D.laws = RULES.laws; D.headAwayDays = RULES.headAwayDays; D.kickReasons = RULES.kickReasons;
  D.tree = buildTree(D);
  D.boss = { attacks: BOSS.attacks, pool: BOSS.pool, poolMax: BOSS.poolMax, kills: BOSS.kills, rounds: BOSS.rounds, points: BOSS.points, classes: BOSS.classes,
    bossCls: BOSS.bossCls, rank: BOSS.rank, kinds: BOSS.kinds, single: BOSS.single, bmC: BOSS.bmC, antiHop: BOSS.antiHop,
    tpl: { e: Object.fromEntries(BOSS.classes.map(c => [c, EB.FOES[BOSS.tplE[c]].st.slice()])), b: EB.FOES[BOSS.tplB].st.slice() },
    races: Object.fromEntries(races.map((r, i) => [r, { el: RULES.lists.els[i % RULES.lists.els.length], stub: true }])),
    roundsCap: { roundB: TREE.caps.roundB, roundE: TREE.caps.roundE } };
  const F = BOSS.circle.from, pow1 = CAP.power[F.prof][String(F.c)][F.day - 1];
  D.boss.circle = { pow1, xBp: BOSS.circle.xBp, lvlDiv: CAP.lvlDiv };
  D.rewards = { splitBp: REWARDS.splitBp, contrib: REWARDS.contrib, headH: REWARDS.headH, mode: REWARDS.mode };
  D.res = { splitBp: CT.rules.splitBp, targets: RES.targets, gdd: RES.gdd };
  return D;
}

/* древо: 100 уровней по ветвям, вехи и альтернативы */
function buildTree(D) {
  const T = TREE, lists = { els: D.lists.els, classes: D.lists.classes, races: D.lists.races };
  const expand = keys => keys.flatMap(k => T.kinds[k].list ? lists[T.kinds[k].list].map(p => ({ k, p })) : [{ k, p: '' }]);
  const cat = Object.fromEntries(Object.entries(T.catalog).map(([b, keys]) => [b, expand(keys)]));
  const alt = (x, circle) => {
    const K = T.kinds[x.k], v = K.flat ? K.v : K.v * circle;
    const put = s => s.replace('{p}', x.p).replace('{v}', v);
    return Object.assign({ k: x.k, p: x.p, v, n: put(K.n), d: put(K.d) }, K.flat ? { flat: 1 } : {}, K.live ? { live: 1 } : {});
  };
  const seen = { power: 0, elem: 0, loot: 0, time: 0 }, levels = [];
  for (let L = 1; L <= T.levels; L++) {
    const bi = fl(L - 1, T.branchLen) % T.branches.length, b = T.branches[bi].id, pos = (L - 1) % T.branchLen + 1, circle = fl(L - 1, T.branches.length * T.branchLen) + 1;
    let alts, mile = null, kind = 'regular';
    if (pos === 5) {
      kind = 'tactic'; alts = T.tactic[b].slice(0, T.alts.tactic).map(k => alt({ k, p: '' }, circle));
      mile = circle === 1 ? T.mile5.first : T.mile5.next[fl(L - (T.branches.length * T.branchLen + 5), T.branchLen) % T.mile5.next.length];
    } else if (pos === T.branchLen) {
      kind = 'key'; alts = [alt({ k: T.key[b], p: '' }, circle)]; mile = T.mile10;
    } else {
      const C = cat[b], n = Math.min(T.alts.regular[b], C.length), off = seen[b]++ * n;
      alts = Array.from({ length: n }, (_, j) => alt(C[(off + j) % C.length], circle));
    }
    levels.push({ L, br: bi, pos, circle, kind, mile: mile ? { k: mile.k, v: mile.v } : null, alts });
  }
  return { branches: T.branches, why: T.why, mileName: T.mileName, levels, reset: T.reset, caps: T.caps, kinds: Object.keys(T.kinds).filter(k => T.kinds[k].live) };
}

/* ================================ РАСЧЁТ ================================ */

/* приток резервуара с участника в день, сотые очка: половина очков контракта недели / 7 (EN_CONTRACTS.econ) */
const inflow = (c, prof) => fl(CT.econ[String(c)][prof].pts * 100 * CT.rules.splitBp, CT.rules.bp * 7);
const cycDays = Object.fromEntries(Object.entries(CAP.cycleDays).map(([c, n]) => [+c, n]));
function cycleOfDay(d) { let t = 0; for (const c of Object.keys(cycDays).map(Number).sort((a, b) => a - b)) { t += cycDays[c]; if (d < t) return c; } return 6; }
const dayOf = (c, w) => { let t = 0; for (let k = 2; k < c; k++) t += cycDays[k]; return t + (w - 1) * 7 + 3; };   // середина недели w цикла c от создания клана

/* прогон резервуара эталонного клана: день получения каждого очка; mulPct — множитель притока (плательщик) */
function resRun(D, base, exp, prof, mulPct) {
  const R = Object.assign({}, D, { res: Object.assign({}, D.res, { base, exp }) });
  let have = 0, n = 1; const got = {};
  for (let d = 0; d < RES.horizonDays && n <= TREE.levels; d++) {
    const lvl = n - 1, members = EC.capacity(R, lvl), speed = EC.resSpeedBp(R, lvl);
    have += fl(fl(inflow(cycleOfDay(d), prof) * members * (D.bp + speed), D.bp) * (mulPct || 100), 100);
    while (n <= TREE.levels && have >= EC.need(R, n) * 100) { have -= EC.need(R, n) * 100; got[n] = d + 1; n++; }
  }
  return got;
}
function solveRes(D) {
  const first = 2 * RES.ref.startMembers * inflow(2, RES.ref.prof) / 100;
  const base = fl(first, RES.baseStep) * RES.baseStep;
  const rows = RES.exps.map(e => ({ exp: e, got: resRun(D, base, e, RES.ref.prof) }));
  const ok = rows.filter(r => r.got[TREE.levels]);
  const best = ok.slice().sort((a, b) => Math.abs(a.got[TREE.levels] - RES.targets.lastDays) - Math.abs(b.got[TREE.levels] - RES.targets.lastDays))[0];
  return { base, first, rows, best };
}

/* бой клана: отряд прототипа силы p против карты врага, урон одной атаки */
const heroesAt = p => SQUAD.map(h => EB.heroSrc(Object.assign({}, h, { lvl: p - CAP.lvlDiv })));
function hit(p, src, seed, rounds) {
  const b = EB.run(EB.create({ heroes: heroesAt(p), foes: [src], seed, mode: 'rounds', maxRounds: rounds }));
  const u = b.u[1][0];
  return { dmg: Math.max(0, u.maxHp - u.hp), max: u.maxHp, fallen: b.u[0].filter(x => !x.alive).length, rounds: b.round };
}
/* карты круга k для прогона: все сочетания класс × стихия у элит, семь стихий у босса */
function eliteCards(D, k) { return D.boss.classes.flatMap(cls => D.lists.els.map(el => EC.card(D, { g: 'e', uid: 'e', cls, el, race: D.lists.races[0], k }))); }
function bossCards(D, k) { return D.lists.els.map(el => EC.card(D, { g: 'b', uid: 'b', el, race: D.lists.races[0], k })); }
/* атак на убийство, сотые: здоровье / урон одной атаки; не меньше одной атаки */
function attacks(p, cards, g, D) {
  let sum = 0, n = 0, fallen = 0;
  for (const src of cards) for (const s of BOSS.design.seeds) {
    const r = hit(p, src, s + n, D.boss.rounds[g]);
    sum += r.dmg >= r.max ? 100 : Math.max(100, Math.ceil(r.max * 100 / Math.max(1, r.dmg)));
    fallen += r.fallen; n++;
  }
  return { a100: fl(sum, n), fallen100: fl(fallen * 100, n) };
}
/* калибровка круга 1: здоровье элит и босса (hpPct) — на силе круга элита падает за eliteAtk атак, босс — за bossAtk */
function calibrate(D) {
  const pow1 = D.boss.circle.pow1, out = {};
  for (const g of ['e', 'b']) {
    const huge = Object.assign({}, D, { boss: Object.assign({}, D.boss, { hp: { e: 1000000, b: 1000000 } }) });
    const cards = g === 'e' ? eliteCards(huge, 1) : bossCards(huge, 1);
    let q = 0, n = 0;   // атак на убийство цели со здоровьем 1 % образца, × 1 000 000: здоровье единицы hpPct / урон одной атаки
    for (const src of cards) for (const s of BOSS.design.seeds) {
      const r = hit(pow1, src, s + n, D.boss.rounds[g]), unit = EB.foeMaxHp(Object.assign({}, src, { hpPct: 100 }));
      q += fl(unit * 1000000, 100 * Math.max(1, r.dmg)); n++;
    }
    const want = g === 'e' ? BOSS.design.eliteAtk : BOSS.design.bossAtk;
    out[g] = Math.max(10, Math.round(want * 1000000 * n / q / 10) * 10);   // среднее число атак = want
  }
  return out;
}

/* неделя эталонного клана: круги по порядку, пока хватает атак недели; незаконченный круг — только добитые элиты */
const costCache = new Map();
function costOf(D, p, k) {
  const key = p + ':' + k;
  if (!costCache.has(key)) costCache.set(key, { e: attacks(p, eliteCards(D, k), 'e', D), b: attacks(p, bossCards(D, k), 'b', D) });
  return costCache.get(key);
}
function weekRun(D, W, lvlAt) {
  const pw = CAP.power[W.prof][String(W.c)], days = pw.slice((W.w - 1) * 7, W.w * 7), p = fl(days.reduce((a, x) => a + x, 0), days.length);
  const lvl = lvlAt(W.prof, dayOf(W.c, W.w)), members = EC.capacity(D, lvl), perDay = EC.attacksDay(D, lvl), budget = members * perDay * 7 * 100;
  let left = budget, k = 1, pts = 0, circles = 0, elitesLast = 0, top = null;
  for (; k <= LAWS.maxCircles; k++) {
    const c = costOf(D, p, k), cost = D.boss.kills * c.e.a100 + c.b.a100;
    top = c;
    if (left < cost) { elitesLast = Math.min(D.boss.kills, fl(left, c.e.a100)); pts += elitesLast * EC.points(D, k, 'e'); break; }
    left -= cost; circles++; pts += D.boss.kills * EC.points(D, k, 'e') + EC.points(D, k, 'b');
  }
  return { W, p, lvl, members, perDay, budget: fl(budget, 100), circles, partial: elitesLast, pts, perMember: fl(pts, members), lastCost: top, k };
}

/* ================================ ТАБЛИЦЫ ================================ */

const head = cols => [`| ${cols.join(' | ')} |`, `| ${cols.map(() => '---').join(' | ')} |`];
const cells = a => `| ${a.join(' | ')} |`;
const yearsDays = d => d >= 365 ? `${fmt(d)} дн. · ${dec(d, 365)} г.` : `${fmt(d)} дн.`;

function calc() {
  const D = build();
  /* 1. резервуар */
  const S = solveRes(D);
  if (!S.best) fail('резервуар: ни один показатель не довёл эталонный клан до сотого очка');
  D.res.base = S.base; D.res.exp = S.best ? S.best.exp : RES.gdd;
  const refGot = S.best ? S.best.got : {};
  const eGot = resRun(D, D.res.base, D.res.exp, 'e');
  const lvlOf = (got, d) => { let l = 0; for (let n = 1; n <= TREE.levels; n++) if (got[n] && got[n] <= d) l = n; return l; };
  const lvlAt = (prof, d) => lvlOf(prof === 'e' ? eGot : refGot, d);
  const x17 = Math.max(...Object.values(CT.econ).map(x => x.x17 || 100));
  const pGot = resRun(D, D.res.base, D.res.exp, 'o', x17);
  D.res.ref = { o: RES.marks.map(n => [n, refGot[n] || 0]), e: RES.marks.map(n => [n, eGot[n] || 0]), p: RES.marks.map(n => [n, pGot[n] || 0]), x17 };

  /* 2. клановый босс: калибровка и круги */
  D.boss.hp = calibrate(D);
  const pow1 = D.boss.circle.pow1, c1 = costOf(D, pow1, 1);
  const circles = [];
  for (let k = 1; k <= 30; k++) {
    const e = eliteCards(D, k), b = bossCards(D, k);
    circles.push({ k, lvl: EC.circleLvl(D, k), hpE: fl(e.reduce((a, x) => a + x.maxHp, 0), e.length), hpB: fl(b.reduce((a, x) => a + x.maxHp, 0), b.length),
      bmE: fl(e.reduce((a, x) => a + EC.cardBm(D, x), 0), e.length), bmB: fl(b.reduce((a, x) => a + EC.cardBm(D, x), 0), b.length), ptsE: EC.points(D, k, 'e'), ptsB: EC.points(D, k, 'b') });
  }
  const weeks = WEEKS.map(W => weekRun(D, W, lvlAt));
  D.calc = { c1: { e: c1.e.a100, b: c1.b.a100 }, circles: circles.slice(0, 20).map(c => [c.k, c.lvl, c.hpE, c.hpB, c.bmE, c.bmB, c.ptsE, c.ptsB]),
    weeks: weeks.map(r => [r.W.prof, r.W.c, r.W.w, r.p, r.lvl, r.members, r.perDay, r.budget, r.circles, r.partial, r.pts, r.perMember]) };

  /* 3. награды: ступени мест кланов по циклам */
  const M = LBX.modes[REWARDS.mode], ly = M ? M.layers.find(x => x.kind === 'place' && x.clan) : null;
  if (!ly) fail('lootboxes.js: нет строк мест кланов у режима «Клановый босс»');
  const tiers = ly ? ly.rows.map(r => ({ label: r.label, top: r.top, steps: EC.stepsOf(r, M.from) })) : [];
  D.rewards.tiers = tiers.map(t => ({ label: t.label, top: t.top, steps: t.steps.map(g => [g.step, g.count, g.win]) }));
  D.rewards.from = M ? M.from : 2;
  D.rewards.box = M ? M.box : 'talisman';

  checks(D, S, circles, weeks, ly, M);
  const tables = mkTables(D, S, circles, weeks, tiers);
  return { data: D, tables, S, circles, weeks };
}

function mkTables(D, S, circles, weeks, tiers) {
  const TBL = {};
  let T;
  // резервуар: кандидаты показателя
  T = head(['Показатель', 'Первое очко', '10-е', '50-е', 'Сотое', 'Цель «сотое к концу второго года»']);
  for (const r of S.rows) {
    const g = r.got, last = g[TREE.levels];
    T.push(cells([`${r.exp[0]}/${r.exp[1]}${r.exp.join() === RES.gdd.join() ? ' — прежний §24.3' : ''}${r === S.best ? ' — **принят**' : ''}`, g[1] ? `${g[1]} дн.` : '—', g[10] ? `${fmt(g[10])} дн.` : '—', g[50] ? yearsDays(g[50]) : '—',
      last ? yearsDays(last) : `не за ${fmt(RES.horizonDays)} дней`, last ? (Math.abs(last - RES.targets.lastDays) * D.bp <= RES.targets.lastDays * RES.targets.tolBp ? 'в допуске' : last > RES.targets.lastDays ? 'дольше' : 'быстрее') : 'нет']));
  }
  TBL.resExp = T.join('\n');
  // резервуар: требования
  const nd = n => EC.need(D, n);
  let sum = 0; const cum = {}; for (let n = 1; n <= TREE.levels; n++) { sum += nd(n); cum[n] = sum; }
  T = head(['Очко навыков', 'Требование, очков контрактов', 'С начала']);
  for (const n of [1, 2, 3, 5, 10, 15, 25, 35, 50, 75, 100]) T.push(cells([n, fmt(nd(n)), fmt(cum[n])]));
  TBL.resNeed = T.join('\n');
  // резервуар: сроки
  const byMark = arr => Object.fromEntries(arr);
  const o = byMark(D.res.ref.o), e = byMark(D.res.ref.e), p = byMark(D.res.ref.p);
  T = head(['Уровень клана', 'Обычные, 25 → 35', 'Увлечённые', `Плательщики, приток ×${dec(D.res.ref.x17, 100, 2)}`, 'Что даёт уровень']);
  for (const n of RES.marks) {
    const m = D.tree.levels[n - 1].mile;
    T.push(cells([n, o[n] ? yearsDays(o[n]) : '—', e[n] ? yearsDays(e[n]) : '—', p[n] ? yearsDays(p[n]) : '—', m ? D.tree.mileName[m.k] : '—']));
  }
  TBL.resDays = T.join('\n');
  // древо: вехи
  T = head(['Уровни', 'Ветка', 'Альтернатив', 'Веха']);
  const rows = [];
  for (let c = 0; c < 3; c++) for (let b = 0; b < 4; b++) {
    const lo = c * 40 + b * 10 + 1; if (lo > TREE.levels) continue;
    const hi = Math.min(TREE.levels, lo + 9), Ls = D.tree.levels.slice(lo - 1, hi);
    const miles = Ls.filter(x => x.mile).map(x => `${x.L}: ${D.tree.mileName[x.mile.k].toLowerCase()}`).join('; ');
    rows.push(cells([`${lo}–${hi}`, D.tree.branches[b].n, Ls.map(x => x.alts.length).join(' · '), miles]));
  }
  TBL.tree = T.concat(rows).join('\n');
  // древо: каталог первого круга
  T = head(['Ветка', 'Уровень 1…10: пассивки на выбор (первый круг)']);
  for (let b = 0; b < 4; b++) {
    const Ls = D.tree.levels.slice(b * 10, b * 10 + 10);
    T.push(cells([D.tree.branches[b].n, Ls.map(x => `**${x.L}**: ${x.alts.map(a => a.n).join(' / ')}`).join('<br>')]));
  }
  TBL.treeCat = T.join('\n');
  // клановый босс: круги
  T = head(['Круг', 'Уровень врагов', 'Здоровье элиты, в среднем', 'Здоровье босса', 'Мощь элиты', 'Мощь босса', 'Очки: элита / босс']);
  for (const c of circles.filter(x => x.k <= 12 || x.k % 4 === 0)) T.push(cells([c.k, fmt(c.lvl), fmt(c.hpE), fmt(c.hpB), fmt(c.bmE), fmt(c.bmB), `${fmt(c.ptsE)} / ${fmt(c.ptsB)}`]));
  TBL.circles = T.join('\n');
  // клановый босс: калибровка
  T = head(['Цель', 'Круг 1: уровень врагов', 'Здоровье, % образца', 'Атак на убийство отрядом силы круга', 'Цель']);
  T.push(cells(['Элита', fmt(EC.circleLvl(D, 1)), fmt(D.boss.hp.e), dec(D.calc.c1.e, 100), BOSS.design.eliteAtk]));
  T.push(cells(['Клановый босс', fmt(EC.circleLvl(D, 1)), fmt(D.boss.hp.b), dec(D.calc.c1.b, 100), BOSS.design.bossAtk]));
  TBL.calib = T.join('\n');
  // клановый босс: неделя эталонных кланов
  T = head(['Клан', 'Сила отряда', 'Уровень клана', 'Участников × атак в день', 'Атак за неделю', 'Кругов', 'Стена: атак на элиту / босса', 'Очков клана', 'На участника']);
  for (const r of weeks) T.push(cells([`${PROF[r.W.prof]}, цикл ${ROMAN[r.W.c]}, ${r.W.w}-я неделя`, fmt(r.p), r.lvl, `${r.members} × ${r.perDay}`, fmt(r.budget), `${r.circles}${r.partial ? ` + ${r.partial} ${r.partial === 1 ? 'элита' : 'элиты'}` : ''}`,
    `круг ${r.k}: ${dec(r.lastCost.e.a100, 100)} / ${dec(r.lastCost.b.a100, 100)}`, fmt(r.pts), fmt(r.perMember)]));
  TBL.weeks = T.join('\n');
  // награды
  T = head(['Место клана', 'На участника · ступени', 'Пул клана из 25', 'Сервер по вкладу', 'Глава']);
  for (const t of tiers) {
    const per = t.steps.map(g => `${g.count} × ступень ${g.step}`).join(' + '), total = t.steps.reduce((a, g) => a + g.count * 25, 0), H = EC.halves(D, t.steps.map(g => ({ step: g.step, win: g.win, count: g.count * 25 })));
    T.push(cells([t.label, per, total, H.reduce((a, g) => a + g.server, 0), H.reduce((a, g) => a + g.head, 0)]));
  }
  TBL.rewards = T.join('\n');
  // босс по расам
  T = head(['Неделя', 'Стихия босса — заглушка', 'Класс']);
  for (const r of D.lists.races) T.push(cells([r, D.boss.races[r].el, D.boss.bossCls]));
  TBL.races = T.join('\n');
  return TBL;
}

/* ================================ ПРОВЕРКИ ================================ */

function checks(D, S, circles, weeks, ly, M) {
  // целые числа во всех данных
  (function walk(x, where) {
    if (typeof x === 'number') { if (!Number.isInteger(x)) fail(`не целое: ${where} = ${x}`); return; }
    if (Array.isArray(x)) x.forEach((v, i) => walk(v, `${where}[${i}]`));
    else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, `${where}.${k}`);
  })(D, 'EN_CLAN');
  // древо
  const T = D.tree;
  if (T.levels.length !== TREE.levels) fail(`древо: уровней ${T.levels.length}`);
  T.levels.forEach((x, i) => {
    if (x.L !== i + 1) fail(`древо: уровень ${i + 1} под номером ${x.L}`);
    if (x.br !== fl(i, 10) % 4) fail(`древо: уровень ${x.L} в ветке ${x.br}`);
    if (x.alts.length < 1 || x.alts.length > 5) fail(`древо: уровень ${x.L} — альтернатив ${x.alts.length}, по §24.2 от 1 до 5`);
    const ids = x.alts.map(a => a.k + ':' + a.p); if (new Set(ids).size !== ids.length) fail(`древо: уровень ${x.L} — альтернатива повторяется`);
    for (const a of x.alts) {
      const K = TREE.kinds[a.k]; if (!K) { fail(`древо: вид ${a.k}`); continue; }
      if (K.list && !D.lists[K.list].includes(a.p)) fail(`древо: ${a.n} — «${a.p}» не из канонического списка`);
      if (a.p === 'Перворождённые') fail('древо: Перворождённые — спойлер до 11-го биома');
      if (/PvP|Арен|Лиг/.test(a.d)) fail(`древо: ${a.n} — клановые бонусы в PvP не действуют`);
    }
  });
  const M100 = EC.milestones(D, TREE.levels);
  if (M100.attack !== 4) fail(`древо: атак за вехи ${M100.attack}, по §24.2 — 4 за 40`);
  if (EC.milestones(D, 40).attack !== 4 || EC.milestones(D, 39).attack !== 4 || EC.milestones(D, 34).attack !== 3) fail('древо: +1 атака — на пятых уровнях веток первого круга');
  if (EC.capacity(D, TREE.levels) !== 35 || EC.capacity(D, 0) !== 25) fail(`древо: вместимость ${EC.capacity(D, 0)} → ${EC.capacity(D, TREE.levels)}, по §24.1 — 25 → 35`);
  if (M100.pool !== 2 || M100.speed !== 2000 || M100.dur !== 2) fail(`древо: вехи следующих кругов — пул ${M100.pool}, скорость ${M100.speed}, длительность ${M100.dur}`);
  if (EC.elitePool(D, TREE.levels) > D.boss.poolMax) fail('древо: пул элит выше потолка');
  // наборы врагов — в библиотеке, число способностей — по рангу (ADR-0016)
  const L = EB.lib();
  for (const cls of D.boss.classes) for (const el of D.lists.els) {
    const K = EC.kit(D, 'e', cls, el);
    if (K.kit.length !== 2 || K.kit.some(x => x.slot !== 'act')) fail(`элита ${cls} · ${el}: набор — не две способности без ульты`);
    for (const x of K.kit) if (!L[x.id]) fail(`элита ${cls} · ${el}: нет в библиотеке «${x.id}»`);
  }
  for (const el of D.lists.els) {
    const K = EC.kit(D, 'b', D.boss.bossCls, el);
    if (K.kit.length !== 7 || K.kit.filter(x => x.slot === 'ult').length !== 2) fail(`босс · ${el}: набор — не семь способностей с двумя ультами`);
    for (const x of K.kit) if (!L[x.id]) fail(`босс · ${el}: нет в библиотеке «${x.id}»`);
    const b = EB.create({ mode: 'rounds', seed: 1, heroes: [], foes: [EC.card(D, { g: 'b', uid: 'b', el, race: D.lists.races[0], k: 1 })] });
    if (EB.kitTable(b.u[1][0]).length !== 7) fail(`босс · ${el}: ядро собрало таблицу шансов не из всех способностей`);
    if ((EB.RULES.resist[D.boss.rank.b.core] || 0) !== 10000) fail('клановый босс: иммунитет к контролю не 100 % (ADR-0010)');
  }
  for (const r of D.lists.races) if (!D.boss.races[r] || !D.lists.els.includes(D.boss.races[r].el)) fail(`босс недели «${r}»: нет стихии`);
  // резервуар: цели §24.3
  const g = S.best ? S.best.got : {};
  if (!(g[1] <= RES.targets.firstDays)) fail(`резервуар: первое очко на ${g[1]}-й день, цель — ${RES.targets.firstDays}`);
  if (!g[TREE.levels] || Math.abs(g[TREE.levels] - RES.targets.lastDays) * D.bp > RES.targets.lastDays * RES.targets.tolBp) fail(`резервуар: сотое очко на ${g[TREE.levels]}-й день, цель — ${RES.targets.lastDays} ± ${RES.targets.tolBp / 100} %`);
  const gddRow = S.rows.find(r => r.exp.join() === RES.gdd.join());
  if (gddRow && gddRow.got[TREE.levels] && gddRow.got[TREE.levels] <= RES.targets.lastDays * 2) warn.push('резервуар: прежний показатель 3/2 сходится с целью — противоречие §24.3 не подтвердилось');
  for (let n = 2; n <= TREE.levels; n++) if (EC.need(D, n) < EC.need(D, n - 1)) fail(`резервуар: требование ${n}-го очка меньше ${n - 1}-го`);
  // клановый босс: калибровка круга 1 и рост
  const tol = (got, want) => Math.abs(got - want * 100) * D.bp <= want * 100 * LAWS.circleTolBp;
  if (!tol(D.calc.c1.e, BOSS.design.eliteAtk)) fail(`круг 1: элита падает за ${dec(D.calc.c1.e, 100)} атак, цель ${BOSS.design.eliteAtk}`);
  if (!tol(D.calc.c1.b, BOSS.design.bossAtk)) fail(`круг 1: босс падает за ${dec(D.calc.c1.b, 100)} атак, цель ${BOSS.design.bossAtk}`);
  for (let i = 1; i < circles.length; i++) {
    const a = circles[i - 1], b = circles[i];
    if (!(b.lvl > a.lvl && b.hpE > a.hpE && b.hpB > a.hpB && b.ptsE > a.ptsE && b.ptsB > a.ptsB)) fail(`круг ${b.k}: сила, здоровье или очки не растут`);
    if (b.ptsB <= b.ptsE * D.boss.kills) fail(`круг ${b.k}: босс платит не больше трёх элит (§25.3: элиты платят меньше КБ)`);
  }
  for (const r of weeks) {
    if (r.circles < 1) fail(`неделя ${PROF[r.W.prof]} цикла ${ROMAN[r.W.c]}: ни одного круга`);
    if (r.k > LAWS.maxCircles) fail(`неделя ${PROF[r.W.prof]} цикла ${ROMAN[r.W.c]}: лестница без потолка силы — кругов больше ${LAWS.maxCircles}`);
  }
  for (let i = 1; i < weeks.length; i++) if (weeks[i].W.prof === weeks[i - 1].W.prof && weeks[i].p > weeks[i - 1].p && weeks[i].circles < weeks[i - 1].circles) fail(`неделя: клан сильнее, а кругов меньше — ${weeks[i].W.c}`);
  // награды: ступени одинаковы во всех циклах, лучше место — не меньше
  if (ly && M) {
    const cycles = Object.keys(ly.rows[0].cyc).map(Number);
    const val = (row, c) => (row.cyc[c] || []).reduce((a, x) => a + x.r * x.count, 0);
    for (const row of ly.rows) {
      const s0 = JSON.stringify(EC.stepsOf(row, cycles[0]));
      for (const c of cycles) if (JSON.stringify(EC.stepsOf(row, c)) !== s0) fail(`награды: у строки «${row.label}» ступени цикла ${ROMAN[c]} не как у цикла ${ROMAN[cycles[0]]}`);
    }
    const sorted = ly.rows.slice().sort((a, b) => (a.top || 1e9) - (b.top || 1e9));
    for (let i = 1; i < sorted.length; i++) for (const c of cycles) if (val(sorted[i], c) > val(sorted[i - 1], c)) fail(`награды: место «${sorted[i].label}» даёт больше, чем «${sorted[i - 1].label}»`);
  }
  // ×1,7 (§1.2): атаки и очки не продаются, плательщик наполняет резервуар не быстрее ×1,7, сброс древа не даёт очков
  if (D.res.ref.x17 > LAWS.x17) fail(`×1,7: плательщик наполняет резервуар ×${dec(D.res.ref.x17, 100, 2)}`);
  if (JSON.stringify(D.boss).includes('enerium') || JSON.stringify(D.boss).includes('Энериум')) fail('×1,7: у кланового босса есть цена в Энериуме — атаки и очки не продаются (§36.3)');
  // честная модерация
  if (!D.laws.some(l => /не наказывают за одного/.test(l))) fail('законы: нет запрета коллективных наказаний');
  if (!D.laws.some(l => /журнал/i.test(l))) fail('законы: нет журнала клана');
  for (const r of D.roles) if (r.id !== 'head' && r.rights.includes('kick')) fail(`роли: исключать может не только глава — «${r.n}»`);
  if (D.roles.filter(r => r.id === 'head').length !== 1 || D.roles.find(r => r.id === 'head').cap !== 1) fail('роли: глава — ровно один');
}

/* ================================ ВЫВОД ================================ */

function render(data) {
  const core = fs.readFileSync(FILES.core, 'utf8').replace(/\r\n/g, '\n');
  const headTxt = `/* Клан — данные прототипа «Свет снизу» (§24, §25 GDD). Собирает tools/content-gen/clan/build.js из калькуляторов экономики
   (capacity.json), контрактов, сундуков и ядра боя. Руками не править: пересборка затрёт правку.
   Черновик · предложение · ждёт автора. Числа — демонстрация, только целые; доли — в базисных пунктах (10 000 = 100 %).
   window.EN_CLAN:
   - roles, rights, laws — роли и права, законы честной модерации; passport — типы, вход, требования; capacity — вместимость;
   - res — резервуар: требование n-го очка = floor(base × n^(exp[0]/exp[1])), приток — splitBp очков контрактов; ref — сроки эталона;
   - tree — 100 уровней: ветка br, место в ветке pos, круг древа circle, веха mile, альтернативы alts { k, p, v, n, d, flat, live };
   - boss — атаки, пул и победы круга, раунды, круг: сила (12 + уровень) = pow1 × xBp^(k − 1), очки: elite, boss × yBp^(k − 1),
     здоровье hp (% образца), образцы характеристик tpl, наборы kinds по рангу rank, стихии боссов недель races (заглушка §25.4);
   - rewards — половина по вкладу, половина — глава; ступени мест кланов tiers; calc — таблицы калькулятора для UI-кита.
   Обоснование и таблицы — docs/content/клан.md. В игре исходы, очки, места и раздачу решает сервер (§36.16).
   Ниже данных — алгоритмы клана tools/content-gen/clan/core.js как есть. */\n`;
  return headTxt + 'window.EN_CLAN = ' + JSON.stringify(data) + ';\n' + core;
}
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/clan/build.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) return null;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { calc, render, withTables, markA, markB, FILES, RULES, RES, TREE, BOSS, REWARDS, err, warn };

if (require.main === module) {
  const R = calc();
  for (const w of warn) console.log('предупреждение: ' + w);
  if (process.argv.includes('--print')) {
    if (err.length) console.log('ОШИБКИ:\n' + err.join('\n'));
    for (const [k, t] of Object.entries(R.tables)) console.log(`\n### ${k}\n\n${t}`);
    process.exit(err.length ? 1 : 0);
  }
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  const js = render(R.data);
  const docOld = fs.existsSync(FILES.doc) ? fs.readFileSync(FILES.doc, 'utf8') : null;
  const docNew = docOld ? withTables(docOld, R.tables) : null;
  if (process.argv.includes('--check')) {
    const okJs = fs.existsSync(FILES.out) && fs.readFileSync(FILES.out, 'utf8') === js, okDoc = !docOld || docNew === docOld;
    console.log(okJs && okDoc ? 'Свежие: clan.js и таблицы документа совпадают со сборкой.' : `Устарели: ${[!okJs && 'design/ui/clan.js', !okDoc && 'docs/content/клан.md'].filter(Boolean).join(', ')} — пересобрать.`);
    process.exit(okJs && okDoc ? 0 : 1);
  }
  fs.writeFileSync(FILES.out, js);
  if (docNew) fs.writeFileSync(FILES.doc, docNew);
  else console.log(`предупреждение: в ${path.relative(ROOT, FILES.doc)} нет меток таблиц — таблицы не вставлены`);
  const b = R.S.best;
  console.log(`Собрано: резервуар — база ${fmt(R.data.res.base)}, показатель ${b.exp[0]}/${b.exp[1]}, первое очко на ${b.got[1]}-й день, сотое — на ${b.got[TREE.levels]}-й; ` +
    `круг 1 — уровень ${EC.circleLvl(R.data, 1)}, здоровье элиты ${R.data.boss.hp.e} %, босса ${R.data.boss.hp.b} %; эталонных недель ${R.weeks.length}.`);
}
