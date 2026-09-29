/* Клан — калькулятор и сборщик: GDD §24 «Кланы», §25 «Клановый босс», §1.2, §6, §16, §18, §23, §36; ADR-0005, ADR-0010, ADR-0014,
   ADR-0016, ADR-0022–ADR-0026, ADR-0028. Черновик · предложение · ждёт автора. Все числа — демонстрация.

   Что считает:
   1. Резервуар (§24.3). Цели §24.3 — «первое очко за пару дней» и «сотое к концу второго года активного клана» — при показателе 1,5
      не сходятся: сумма требований до сотого уровня в 40 501 раз больше первого. Решение: цели — главное, показатель — ручка.
      База — два дня притока свежего клана (25 обычных игроков цикла II), показатель — дробь из кандидатов, у которой эталонный
      клан берёт сотое очко ближе всего к 730-му дню. Приток — половина очков контрактов (EN_CONTRACTS.econ, контракты §18.1),
      участники — полный состав по вместимости древа, циклы — по календарю калькуляторов (capacity.json).
   2. Древо (§24.2, слово автора 29.09.2026): 100 уровней, ветки Сила → Добыча → Рост → Клан блоками по десять, круг повторяется.
      Вехи — от уровня: каждый 5-й — +1 атака в день (к сотому +20), каждый 10-й — +1 место (25 → 35). В блоке — восемь пассивок ветки,
      одна из трёх; 5-й уровень — вилка кланового босса, одна тактика из трёх; 10-й — ключ ветки. Виды пассивок — только готовые
      примитивы ядра и экономики, у каждого — потолок суммы. Вилки меряются прогоном ядра поодиночке, полное древо — эталонным выбором
      на силе эталонных недель; сроки уровней — прогоном резервуара. Пассивки — только по спискам 7 стихий и 6 классов; в PvP не действуют.
   3. Клановый босс (§25): круг — три элиты и босс; «статы × X» — уровень врагов круга: (12 + уровень) × X за круг. Круг 1 —
      по силе отряда обычного игрока в первый день цикла II (capacity.json). Здоровье элит и босса — прогон ядра боя (battle.js)
      отрядом прототипа: на равной силе элита — за eliteAtk атак, босс — за bossAtk. Неделя эталонных кланов — тот же прогон:
      сколько кругов и очков клан берёт своими атаками.
      Враги — сонмы стихий (слово автора 29.09.2026, foes.js): семь стихий, в сонме восемь фигур. Этаж элиты — Голос сонма (маг ДД),
      Щит, Лекарь и двое Пут (контроль); этаж босса — Хозяин (маг ДД), те же Щит и Лекарь, Клинок и Стрела (физ ДД силы и ловкости).
      Элиты каждую неделю одни и те же: стихии круга — случай из семи без повторов. Босс недели — Хозяин стихии, которую будит Эхо недели.
   4. Награды (§24.4, §23): пул клана — сундуки места клана из lootboxes.js на каждого участника; половина — сервер по вкладу,
      половина — глава. Ступень сундука — от цикла получателя.
   5. Проверки: целые числа; каркас древа, вехи и вилки; потолки видов; примитивы — делом в ядре боя и по данным достижений и Памяти;
      прибавки боя клана ложатся в карты ядра; вилка не делает круг дороже; полное древо на боссе не хуже вех, вехи — не хуже пустого
      древа; наборы врагов в библиотеке; цели резервуара; калибровка круга 1; рост кругов; ступени наград; ×1,7 (§1.2) — уровни древа
      плательщики берут не раньше 1/1,7 срока обычных; законы честной модерации.

   Пишет:
   - design/ui/clan.js — данные прототипа (window.EN_CLAN) и алгоритмы клана (window.EnClan из core.js как есть), руками не править;
   - docs/content/клан.md — только таблицы между метками «<!-- @таблица имя -->» и «<!-- /таблица имя -->»; текст — ручной.
   Читает: capacity.json (python tools/content-gen/clan/capacity.py), design/ui/battle.js, abilities.js, kits.js — ядро боя и
   библиотека; contracts.js — очки контрактов; lootboxes.js — сундуки места клана; roster.js — недели рас и цивилизации Эхо;
   foes.js — сонмы стихий: имена, облик, совет старика, неделя Хозяина; tools/art-gen/jobs/clan-foes.json — задание арта сонмов,
   tools/art-gen/ui-art.json и design/ui/assets/art/clan/ — что из арта уже выгружено; tools/content-gen/lore/spoilers.js — спойлеры.
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
  foes: path.join(__dirname, 'foes.js'),
  job: path.join(ROOT, 'tools', 'art-gen', 'jobs', 'clan-foes.json'),
  uiArt: path.join(ROOT, 'tools', 'art-gen', 'ui-art.json'),
  assets: path.join(UI, 'assets', 'art'),
  generated: path.join(ROOT, 'art', 'generated'),
  manifest: path.join(ROOT, 'art', 'generated', 'manifest.json'),
  out: path.join(UI, 'clan.js'),
  doc: path.join(ROOT, 'docs', 'content', 'клан.md'),
  ui: ['battle.js', 'abilities.js', 'kits.js', 'lootboxes.js', 'contracts.js', 'roster.js', 'wanderer.js'].map(f => path.join(UI, f)),   // wanderer.js — только сверка примитивов: виды пассивок достижений и семейства Памяти
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
  capacity: { base: 25, add: 1 },              // §24.1: вместимость 25 → 35, +1 за каждый 10-й уровень древа (веха cap — TREE.miles)
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

/* Древо §24.2 по слову автора 29.09.2026: «на каждом 5 уровне будет +1 атака в КБ, а на 10 — +1 вместимость… Ветки должны быть уникальными
   и полезными и действительно давать буст… На 5 уровне нужно продумывать Вилку, связанную с КБ».
   Каркас: 100 уровней, ветки блоками по десять, круг веток повторяется — 1–40, 41–80, 81–100 (§24.2). В блоке: 1–4 и 6–9 — пассивка
   ветки, одна из трёх; 5 — вилка кланового босса, одна из трёх; 10 — ключ ветки, одна. Вехи — от уровня: каждый 5-й — +1 атака в день,
   каждый 10-й — +1 место. «На 5 уровне» понято как пятый уровень ветки — §24.2: «на каждом пятом уровне веток — пассивки, влияющие на
   тактику убийства КБ»; в паре с «на 10» у автора — те же места блока. Вилок — десять, по одной на блок.
   Виды пассивок — только готовые примитивы ядра и экономики (prim): core — поле ядра боя, которое сервер задаёт при сборке боя или
   добычи; ach — вид пассивок достижений (EN_WANDERER.ach.kinds); mem — семейство пассивок Памяти (EN_WANDERER.passives, fam);
   clan — данные клана. Сборщик сверяет, что примитив есть. fx — как вид действует в бою клана: прототип применяет его вживую
   (EnClan.fightMods, EnClan.battle); остальное в прототипе — показ, в игре прибавки кладёт сервер, как бонусы режима талисманов.
   v — значение по кругу древа I, II, III; cap — потолок суммы вида на всём древе: сборщик проверяет, что его не набрать выше.
   В PvP клановые бонусы не действуют (§24.2). Числа — демонстрация */
const TREE = {
  levels: 100, branchLen: 10,
  order: ['power', 'loot', 'growth', 'clan'],   // клан учится бить, потом собирать, потом расти, потом держаться вместе
  branches: {
    power: { n: 'Сила', d: 'Урон и живучесть героев во всех боях, кроме Арены и Лиги.', key: 'keyPower' },
    loot: { n: 'Добыча', d: 'Золото, дух, ресурсы, ключи и души с забегов.', key: 'keyLoot' },
    growth: { n: 'Рост', d: 'Уровни героев, руны, ритуалы, прах, перековка и рабочие — дешевле и быстрее.', key: 'keyGrowth' },
    clan: { n: 'Клан', d: 'Бой клана, контракты, Эхо, лавка и ритуалы; ключ ветки — скорость резервуара.', key: 'keyClan' },
  },
  why: 'Каждый пятый уровень — атака в день, каждый десятый — место. На пятом уровне ветки — вилка кланового босса.',
  miles: { attack: { every: 5, v: 1 }, cap: { every: 10, v: 1 } },   // слово автора: каждый 5-й — +1 атака, каждый 10-й — +1 место
  mileName: { attack: '+1 атака в день', cap: '+1 место в клане' },
  pos: { fork: 5, key: 10 },
  clsAlias: { 'Хилер': 'Лекарь', 'Дебаффер': 'Контроль', 'Физ. ДД': 'Физ. ДД силы' },   // прежние имена классов в прототипе → канонический список §36.15
  reset: { price: 300, perWeek: 1 },   // §24.2: сброс древа за Энериум — не чаще раза в неделю расы; уровень, вехи и очки не меняет
  kinds: {
    /* Сила — урон и живучесть во всех боях PvE: прибавка боя по типу врага, классу и стихии героя — поле ядра aura.dmgUp */
    dmgO: { n: 'Против рядовых', d: 'Урон героев в боях с рядовыми +{v} %', v: [3, 4, 5], cap: 24, prim: 'core:aura.dmgUp' },
    dmgE: { n: 'Против элит', d: 'Урон героев в боях с элитой +{v} %', v: [3, 4, 5], cap: 24, prim: 'core:aura.dmgUp', fx: { t: 'dmg', on: 'e' } },
    dmgB: { n: 'Против боссов', d: 'Урон героев в боях с боссом +{v} %', v: [3, 4, 5], cap: 24, prim: 'core:aura.dmgUp', fx: { t: 'dmg', on: 'b' } },
    dmgCls: { n: 'Выучка: {p}', d: 'Урон героев класса «{p}» +{v} %', v: [3, 4, 5], cap: 12, list: 'classes', prim: 'core:aura.dmgUp', fx: { t: 'dmg', by: 'cls' } },
    hpCls: { n: 'Закалка: {p}', d: 'Здоровье героев класса «{p}» +{v} %', v: [4, 6, 8], cap: 18, list: 'classes', prim: 'core:hpPct', fx: { t: 'hp', by: 'cls' } },
    hp: { n: 'Крепость', d: 'Здоровье героев +{v} %', v: [2, 3, 4], cap: 18, prim: 'core:hpPct', fx: { t: 'hp' } },
    shield: { n: 'Крепкий щит', d: 'Щиты героев +{v} %', v: [4, 6, 8], cap: 36, prim: 'core:pas.shieldUp', fx: { t: 'shield' } },
    crit: { n: 'Точный удар', d: 'Критический урон героев +{v} %', v: [4, 6, 8], cap: 36, prim: 'core:critDmg', fx: { t: 'crit' } },
    dmgEl: { n: 'Стихия: {p}', d: 'Урон героев стихии «{p}» +{v} %', v: [3, 4, 5], cap: 12, list: 'els', prim: 'core:aura.dmgUp', fx: { t: 'dmg', by: 'el' } },
    keyPower: { n: 'Знамя клана', d: 'Урон героев +{v} %', v: [3, 4, 5], cap: 12, prim: 'core:aura.dmgUp', fx: { t: 'dmg' } },
    /* Добыча — с врагов биомов: поля фарма ядра (floorLoot) и шанс рунного ключа экономики */
    gold: { n: 'Звонкая монета', d: 'Золото с врагов биомов +{v} %', v: [2, 2, 3], cap: 21, prim: 'core:farm.gold' },
    spirit: { n: 'Лёгкий дух', d: 'Дух с врагов биомов +{v} %', v: [2, 2, 3], cap: 21, prim: 'core:farm.spirit' },
    double: { n: 'Удачный удар', d: 'Шанс двойной добычи с врага биома +{v} п.п.', s: '+{v} п.п.', v: [1, 1, 1], cap: 9, prim: 'core:farm.doubleCh' },
    base: { n: 'Мешок находок', d: 'Шанс базового ресурса за этаж выше на {v} %', v: [3, 4, 5], cap: 36, prim: 'core:farm.baseResMul' },
    uniq: { n: 'Тонкая жила', d: 'Шанс уникального ресурса босса биома выше на {v} %', v: [3, 4, 5], cap: 36, prim: 'core:farm.rareMul' },
    keyCh: { n: 'Второй ключ', d: 'Шанс второго ключа ремесла с элиты +{v} п.п.', s: '+{v} п.п.', v: [2, 3, 4], cap: 27, prim: 'core:farm.keyCh' },
    rkey: { n: 'Связка ключей', d: 'Шанс рунного ключа с босса биома выше на {v} %', v: [3, 4, 5], cap: 36, prim: 'ach:key' },
    souls: { n: 'Ловцы душ', d: '+{v} душа с босса биома', s: '+{v}', v: [1, 1, 1], cap: 9, prim: 'core:farm.souls' },
    keyLoot: { n: 'Общий котёл', d: 'Золото и дух с врагов биомов +{v} %', v: [2, 3, 4], cap: 9, prim: 'core:farm.gold' },
    /* Рост — развитие героев и хозяйства: виды пассивок достижений и семейства Памяти */
    lvl: { n: 'Наставники', d: 'Уровни героев дешевле духом на {v} %', s: '−{v} %', v: [1, 1, 1], cap: 6, prim: 'ach:lvl' },
    rune: { n: 'Рунная пыльца', d: 'Шанс {v} % получить лишнюю руну предела', s: '{v} %', v: [1, 2, 2], cap: 9, prim: 'mem:Руны: пыльца' },
    limit: { n: 'Бережный вклад', d: 'Шанс {v} %, что руна не спишется при вкладе в предел', s: '{v} %', v: [1, 2, 2], cap: 9, prim: 'mem:Руны: предел' },
    ritual: { n: 'Скорые ритуалы', d: 'Ритуалы короче на {v} %', s: '−{v} %', v: [1, 2, 2], cap: 9, prim: 'ach:ritual' },
    dust: { n: 'Прах к праху', d: 'Праха за лишние осколки +{v} %', v: [2, 3, 3], cap: 15, prim: 'ach:dust' },
    forge: { n: 'Кузня клана', d: 'Перековка дешевле золотом на {v} %', s: '−{v} %', v: [2, 3, 3], cap: 15, prim: 'ach:forge' },
    worker: { n: 'Артель', d: 'Пробуждение рабочих дешевле душами на {v} %', s: '−{v} %', v: [2, 3, 3], cap: 15, prim: 'ach:worker' },
    art: { n: 'Знакомый мастер', d: 'Артефакты дешевле золотом на {v} %', s: '−{v} %', v: [2, 3, 3], cap: 15, prim: 'mem:Артефакты: золото' },
    keyGrowth: { n: 'Школа клана', d: 'Уровни героев дешевле духом на {v} %', s: '−{v} %', v: [2, 3, 3], cap: 5, prim: 'ach:lvl' },
    /* Клан — бой клана и неделя: прибавки боя клана, Эхо, контракты, лавка, ритуалы; ключ — скорость резервуара */
    clanDmg: { n: 'Братство', d: 'Урон героев в бою клана +{v} %', v: [3, 4, 4], cap: 21, prim: 'core:aura.dmgUp', fx: { t: 'dmg' } },
    clanHp: { n: 'Плечом к плечу', d: 'Здоровье героев в бою клана +{v} %', v: [3, 4, 4], cap: 21, prim: 'core:hpPct', fx: { t: 'hp' } },
    echoBack: { n: 'Паромщик', d: 'Шанс {v} % вернуть души за атаку в Эхо, если она добила цель', s: '{v} %', v: [2, 3, 3], cap: 15, prim: 'mem:Эхо: возврат' },
    echoSummon: { n: 'Зоркий призыв', d: 'Шанс {v} %, что призыв в Эхо покажет ещё один вариант', s: '{v} %', v: [2, 3, 3], cap: 15, prim: 'mem:Эхо: призыв' },
    ctGold: { n: 'Общий заказ', d: 'Золото в наградах контрактов +{v} %', v: [2, 3, 3], cap: 15, prim: 'mem:Контракты: золото' },
    ctRes: { n: 'Общий обоз', d: 'Ресурсы в наградах контрактов +{v} %', v: [2, 3, 3], cap: 15, prim: 'mem:Контракты: ресурсы' },
    shop: { n: 'Свой купец', d: 'Товары лавки за золото дешевле на {v} %', s: '−{v} %', v: [2, 3, 3], cap: 15, prim: 'mem:Лавка: скидки' },
    ritSoul: { n: 'Караван душ', d: 'Души из героических ритуалов +{v} %', v: [2, 3, 3], cap: 15, prim: 'mem:Ритуалы: души' },
    keyClan: { n: 'Сердце клана', d: 'Резервуар наполняется быстрее на {v} %', v: [10, 10, 10], cap: 20, prim: 'clan:speed', fx: { t: 'speed' } },
    /* вилки кланового босса: значение — в самой вилке (forks) */
    kbBoss: { n: 'Натиск на босса', d: 'Урон героев в атаках по клановому боссу +{v} %', cap: 55, prim: 'core:aura.dmgUp', fx: { t: 'dmg', on: 'b' }, fork: 1 },
    kbElite: { n: 'Охота на элит', d: 'Урон героев в атаках по элитам клана +{v} %', cap: 55, prim: 'core:aura.dmgUp', fx: { t: 'dmg', on: 'e' }, fork: 1 },
    kbPool: { n: 'Шире круг', d: '+{v} элита в круге — больше выбор стихий', s: '+{v}', cap: 2, prim: 'clan:pool', fx: { t: 'pool' }, fork: 1 },
    kbRound: { n: 'Долгий бой', d: '+{v} раунд в атаке по элите', s: '+{v}', cap: 3, prim: 'clan:rounds', fx: { t: 'rounds', on: 'e' }, fork: 1 },
    kbCarry: { n: 'Запас атак', d: 'Кошелёк держит ещё {v} дневную норму атак', s: '+{v}', cap: 2, prim: 'clan:carry', fx: { t: 'carry' }, fork: 1 },
    kbHp: { n: 'Стойкий отряд', d: 'Здоровье героев в атаках клана +{v} %', cap: 60, prim: 'core:hpPct', fx: { t: 'hp' }, fork: 1 },
    kbLeech: { n: 'Жажда боя', d: 'Вампиризм героев в атаках по клановому боссу {v} %', s: '{v} %', cap: 23, prim: 'core:aura.lifesteal', fx: { t: 'leech', on: 'b' }, fork: 1 },
    kbRetinue: { n: 'Рассеять свиту', d: 'Здоровье свиты элиты −{v} %', s: '−{v} %', cap: 60, prim: 'clan:retinue', fx: { t: 'retinue', on: 'e' }, fork: 1 },
    kbEdge: { n: 'Сильная стихия', d: 'Урон героев, чья стихия сильнее стихии цели, +{v} %', cap: 60, prim: 'core:aura.dmgUp', fx: { t: 'dmg', edge: true }, fork: 1 },
  },
  /* пассивки блока: места 1–4 и 6–9, по три альтернативы; «вид:параметр»; «dmgEl:#» — следующая стихия по кругу семи на всём древе */
  rows: {
    power: [['dmgO', 'dmgE', 'dmgB'], ['dmgCls:Физ. ДД силы', 'dmgCls:Физ. ДД ловкости', 'dmgCls:Маг. ДД'], ['hp', 'shield', 'crit'], ['dmgEl:#', 'dmgEl:#', 'dmgEl:#'],
      ['dmgO', 'dmgE', 'dmgB'], ['hpCls:Танк', 'hpCls:Лекарь', 'dmgCls:Контроль'], ['hp', 'shield', 'crit'], ['dmgEl:#', 'dmgEl:#', 'dmgEl:#']],
    loot: [['gold', 'spirit', 'double'], ['base', 'uniq', 'keyCh'], ['rkey', 'souls', 'gold'], ['spirit', 'double', 'base'],
      ['uniq', 'keyCh', 'rkey'], ['souls', 'gold', 'spirit'], ['double', 'base', 'uniq'], ['keyCh', 'rkey', 'souls']],
    growth: [['lvl', 'rune', 'ritual'], ['dust', 'forge', 'worker'], ['art', 'limit', 'lvl'], ['rune', 'ritual', 'dust'],
      ['forge', 'worker', 'art'], ['limit', 'lvl', 'rune'], ['ritual', 'dust', 'forge'], ['worker', 'art', 'limit']],
    clan: [['clanDmg', 'clanHp', 'echoBack'], ['ctGold', 'ctRes', 'shop'], ['echoSummon', 'ritSoul', 'clanDmg'], ['clanHp', 'echoBack', 'ctGold'],
      ['ctRes', 'shop', 'echoSummon'], ['ritSoul', 'clanDmg', 'clanHp'], ['echoBack', 'ctGold', 'ctRes'], ['shop', 'echoSummon', 'ritSoul']],
  },
  /* вилки кланового босса — пятый уровень каждого блока: три тактики, у каждой своя беда клана — босс, стена элит, выбор стихий,
     короткий бой, пропуск дня, отряд гибнет, свита. Значение растёт к концу древа */
  forks: {
    5: [['kbBoss', 10], ['kbElite', 10], ['kbPool', 1]],       // примеры автора: урон по КБ, урон по элите, +1 элита в пул
    15: [['kbRound', 1], ['kbCarry', 1], ['kbEdge', 10]],
    25: [['kbHp', 10], ['kbLeech', 5], ['kbRetinue', 10]],
    35: [['kbPool', 1], ['kbBoss', 10], ['kbElite', 10]],
    45: [['kbEdge', 15], ['kbHp', 15], ['kbRetinue', 15]],
    55: [['kbRound', 1], ['kbCarry', 1], ['kbLeech', 8]],
    65: [['kbBoss', 15], ['kbElite', 15], ['kbEdge', 15]],
    75: [['kbHp', 15], ['kbRetinue', 15], ['kbRound', 1]],
    85: [['kbBoss', 20], ['kbElite', 20], ['kbEdge', 20]],
    95: [['kbHp', 20], ['kbRetinue', 20], ['kbLeech', 10]],
  },
  /* эталонный выбор для расчёта баланса — клан, который качает древо под клановый босс. С сонмами стихий (29.09.2026) стену держит Хозяин
     со свитой — Щит, Лекарь, Клинок и Стрела: в вилках сначала урон по боссу, здоровье отряда и вампиризм, потом элиты; в ветках — бой
     клана и бой с боссом; где этого нет — первая альтернатива */
  ref: {
    fork: ['kbBoss', 'kbHp', 'kbLeech', 'kbElite', 'kbPool', 'kbRetinue', 'kbRound', 'kbEdge', 'kbCarry'],
    rows: ['clanDmg', 'clanHp', 'dmgB', 'keyPower', 'hp', 'dmgE', 'crit', 'shield'],
  },
};

/* Клановый босс §25 */
const BOSS = {
  attacks: { day: 5, carryDays: 1 },     // §25.1: 5 атак в день, растёт древом (+1 за каждый 5-й уровень); общий кошелёк на элит и босса; копится ещё одна дневная норма — беречь для КБ
  pool: 3, poolMax: 5, kills: 3,         // §25.2: 3 элиты в пуле, пул растёт вилкой «Шире круг» до пяти — пять карточек ещё держат воздух; три победы — автопризыв КБ, висящие элиты сгорают
  // §25.1: лимит атаки — раунды; тип боя в таблице ядра RULES.rounds.by — одна таблица на все режимы (решение автора 29.09.2026):
  // элита со свитой — 10 раундов, клановый босс — 100: бой на достойном враге длится дольше
  rounds: { e: 'e', b: 'clan' },
  /* Сонмы стихий (слово автора 29.09.2026; имена, облик и неделя Хозяина — foes.js). Семь стихий, в сонме восемь фигур. Бой — один этаж, пятеро
     врагов: у Голоса (элита) — Щит, Лекарь и двое Пут (контроль); у Хозяина (клановый босс) — те же Щит и Лекарь, Клинок и Стрела (физ ДД силы
     и ловкости). Щит и Лекарь — одни на оба этажа: восемь портретов на стихию, 56 на всё. Свита в каждой атаке свежая, урон копится только у
     цели; бой кончается, когда пала цель — как в Эхо. Классы — ядра (RULES.cls), «Дебаффер» — класс «Контроль» (ADR-0022).
     Голос — элита Мастерской того же класса; Хозяин — босс Мастерской, у которого сила и интеллект меняются местами: клановый босс — маг ДД.
     Свита — ранг рядовой (ADR-0016): рядовые Мастерской того же класса, одна способность школы своей стихии — kind */
  host: {
    roles: {
      elite: { g: 'e', cls: 'Маг. ДД', tpl: 'e4' },
      boss: { g: 'b', cls: 'Маг. ДД', tpl: 'b1', swap: [0, 1] },   // swap — какие характеристики образца меняются местами: сила ↔ интеллект
      tank: { cls: 'Танк', tpl: 'o4', kind: 'shield.grp' },        // щит троим самым раненым
      healer: { cls: 'Лекарь', tpl: 'o5', kind: 'heal.one' },       // сильное лечение самого раненого
      ctl1: { cls: 'Дебаффер', tpl: 'o2', kind: 'ctrl.one' },       // контроль самого опасного
      ctl2: { cls: 'Дебаффер', tpl: 'o2', kind: 'debuff.grp' },     // дебафф на двоих
      dd1: { cls: 'Физ. ДД силы', tpl: 'o1', kind: 'dmg.one' },     // мощный удар по одному
      dd2: { cls: 'Физ. ДД ловкости', tpl: 'o6', kind: 'dot.grp' }, // урон по времени на троих
    },
    floors: { e: ['tank', 'healer', 'ctl1', 'ctl2'], b: ['tank', 'healer', 'dd1', 'dd2'] },   // слово автора: «он и 4 свиты»; танк и лекарь — на обоих этажах
    order: ['elite', 'boss', 'tank', 'healer', 'ctl1', 'ctl2', 'dd1', 'dd2'],
    retinue: { rank: { core: 'o', acts: 1, share: [2900, 0] }, hpPct: 100 },   // рядовой: одна способность без ульты, доля хода — как у обычной редкости; здоровье — % hpPct образца
    art: { dir: 'clan/', ext: '.jpg', job: 'clan-' },   // портрет — design/ui/assets/art/clan/<стихия>-<роль>.jpg; задание — clan-<стихия>-<роль>
  },
  circle: { xBp: 12500, from: { prof: 'o', c: 2, day: 1 } },   // §25.2: статы × X за круг — ×1,25; круг 1 — отряд обычного игрока в 1-й день цикла II
  points: { elite: 100, boss: 600, yBp: 12500 },               // §25.3: элита платит меньше КБ, очки растут с кругом — как сила врагов, очко за атаку не зависит от круга
  /* на равной силе элита падает за 6 атак, босс — за 30 (калибровка круга 1). Десять сидов на цель: у стены урон атаки мал, и малое число
     сидов даёт ложную «непробиваемую» цель. С реальным отрядом (ADR-0031) шести уже не хватало: элита круга 8 у обычного клана цикла II
     выходила в 39 000 атак, а вилка «Сильная стихия» по шуму сида делала круг стены дороже на 10 % */
  design: { eliteAtk: 6, bossAtk: 30, seeds: [11, 29, 47, 71, 97, 131, 163, 199, 241, 277] },
  rank: { e: { core: 'e', acts: 2, ults: 0, share: [3600, 0] }, b: { core: 'clan', acts: 5, ults: 2, share: [5000, 1000] } },   // ADR-0016: элита — две без ульты, как уникальная; клановый — семь, как вневременная
  kinds: {
    e: ['dmg.all', 'dmg.one'],                                                                 // Голос — маг ДД: удар по всем и мощный по одному
    b: ['dmg.all', 'dmg.one', 'dot.all', 'debuff.all', 'ctrl.grp', 'ult.dmg', 'ult.debuff'],   // Хозяин — маг ДД: пять приёмов и две ульты
  },
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

/* Арт сонмов — задание tools/art-gen/jobs/clan-foes.json, отбор 29.09.2026: файл art/generated/clan/ для каждой фигуры <стихия>-<роль>.
   Выгрузка в прототип — строки tools/art-gen/ui-art.json «clan/<стихия>-<роль>.jpg» и export_ui.py (их делает команда); что выгружено,
   сборщик видит сам: строка в таблице выгрузки и файл в design/ui/assets/art. mirror — отразить при выгрузке: корпус и щит смотрят вправо */
const ART_PICK = {
  'water-elite': 'clan-water-elite__nb2-v3.jpg', 'water-boss': 'clan-water-boss__nb2.jpg', 'water-tank': 'clan-water-tank__nb2.jpg', 'water-healer': 'clan-water-healer__nb2-v2.jpg',
  'water-ctl1': 'clan-water-ctl1__nb2.jpg', 'water-ctl2': 'clan-water-ctl2__nb2.jpg', 'water-dd1': 'clan-water-dd1__nb2.jpg', 'water-dd2': 'clan-water-dd2__nb2.jpg',
  'fire-elite': 'clan-fire-elite__nb2.jpg', 'fire-boss': 'clan-fire-boss__nb2.jpg', 'fire-tank': 'clan-fire-tank__nb2-v3.jpg', 'fire-healer': 'clan-fire-healer__nb2.jpg',
  'fire-ctl1': 'clan-fire-ctl1__nb2-v2.jpg', 'fire-ctl2': 'clan-fire-ctl2__nb2.jpg', 'fire-dd1': 'clan-fire-dd1__nb2-v2.jpg', 'fire-dd2': 'clan-fire-dd2__nb2.jpg',
  'earth-elite': 'clan-earth-elite__nb2.jpg', 'earth-boss': 'clan-earth-boss__nb2.jpg', 'earth-tank': { from: 'clan-earth-tank__nb2.jpg', mirror: true }, 'earth-healer': 'clan-earth-healer__nb2.jpg',
  'earth-ctl1': 'clan-earth-ctl1__nb2-v2.jpg', 'earth-ctl2': 'clan-earth-ctl2__nb2-v2.jpg', 'earth-dd1': 'clan-earth-dd1__nb2.jpg', 'earth-dd2': 'clan-earth-dd2__nb2.jpg',
  'air-elite': 'clan-air-elite__nb2.jpg', 'air-boss': 'clan-air-boss__nb2.jpg', 'air-tank': 'clan-air-tank__nb2.jpg', 'air-healer': 'clan-air-healer__nb2.jpg',
  'air-ctl1': 'clan-air-ctl1__nb2.jpg', 'air-ctl2': 'clan-air-ctl2__nb2.jpg', 'air-dd1': 'clan-air-dd1__nb2.jpg', 'air-dd2': 'clan-air-dd2__nb2.jpg',
  'light-elite': 'clan-light-elite__nb2.jpg', 'light-boss': 'clan-light-boss__nb2.jpg', 'light-tank': 'clan-light-tank__nb2.jpg', 'light-healer': 'clan-light-healer__nb2-v2.jpg',
  'light-ctl1': 'clan-light-ctl1__nb2.jpg', 'light-ctl2': 'clan-light-ctl2__nb2.jpg', 'light-dd1': 'clan-light-dd1__nb2.jpg', 'light-dd2': 'clan-light-dd2__nb2.jpg',
  'dark-elite': 'clan-dark-elite__nb2.jpg', 'dark-boss': 'clan-dark-boss__nb2.jpg', 'dark-tank': 'clan-dark-tank__nb2.jpg', 'dark-healer': 'clan-dark-healer__nb2.jpg',
  'dark-ctl1': 'clan-dark-ctl1__nb2.jpg', 'dark-ctl2': 'clan-dark-ctl2__nb2-v2.jpg', 'dark-dd1': 'clan-dark-dd1__nb2.jpg', 'dark-dd2': 'clan-dark-dd2__nb2.jpg',
  'time-elite': 'clan-time-elite__nb2-v2.jpg', 'time-boss': 'clan-time-boss__nb2-v2.jpg', 'time-tank': 'clan-time-tank__nb2.jpg', 'time-healer': 'clan-time-healer__nb2.jpg',
  'time-ctl1': 'clan-time-ctl1__nb2.jpg', 'time-ctl2': 'clan-time-ctl2__nb2-v2.jpg', 'time-dd1': 'clan-time-dd1__nb2.jpg', 'time-dd2': 'clan-time-dd2__nb2.jpg',
};

/* Отряд расчётов — одна фикстура на все калькуляторы: tools/content-gen/biomes/sim.js, SQUAD (ADR-0031, п. 1): пятеро золотых героев
   цикла I с личным максимумом доблести 1, доблесть 0, у бойца урона 1 от руны обучения. Её же берут economy.py, sets.py, echo.py и прогон
   темпа; своей копии у клана нет. Уровни фикстуры клан не берёт — сила отряда по дням из capacity.json (heroesAt) */
const SQUAD = require('../biomes/sim.js').SQUAD;

/* эталонные недели кланового босса: профиль, цикл, неделя цикла; сила отряда — средняя за неделю (capacity.json),
   участники и атаки — по древу эталонного клана на середину той недели */
const WEEKS = [
  { prof: 'o', c: 2, w: 1 }, { prof: 'o', c: 2, w: 2 }, { prof: 'o', c: 3, w: 2 }, { prof: 'o', c: 4, w: 2 }, { prof: 'o', c: 5, w: 2 }, { prof: 'o', c: 6, w: 2 },
  { prof: 'e', c: 2, w: 2 }, { prof: 'e', c: 3, w: 2 }, { prof: 'e', c: 6, w: 2 },
];
const PROF = { o: 'обычный', e: 'увлечённый' };

/* законы калькулятора */
const LAWS = { x17: 170, circleTolBp: 1500, maxCircles: 80, forkNoiseBp: 300 };   // forkNoiseBp — шум сида: вилка не делает круг дороже больше чем на 3 %

/* ================================ ЗАГРУЗКА ================================ */

const err = [], warn = [];
const fail = m => err.push(m);
const ctx = { console }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of FILES.ui.concat(FILES.core)) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: path.basename(f) });
const EB = ctx.EnBattle, EC = ctx.EnClan, LBX = ctx.EN_LOOTBOXES, CT = ctx.EN_CONTRACTS, RS = ctx.EN_ROSTER, WN = ctx.EN_WANDERER;
const CAP = JSON.parse(fs.readFileSync(FILES.cap, 'utf8'));
const FOES = require(FILES.foes), SP = require('../lore/spoilers.js');   // сонмы стихий; спойлеры дайджеста — общие с Летописью
const readJson = (f, d) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d;
const fl = (a, b) => Math.floor(a / b);
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const dec = (num, den, k = 1) => { const m = 10 ** k, v = Math.round(num * m / den); const s = String(Math.floor(v / m)) + (k ? ',' + String(v % m).padStart(k, '0') : ''); return s.replace(/,0+$/, ''); };
const pct = (num, den, k = 0) => dec(num * 100, den, k) + ' %';
const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, r = m % 10; return m > 10 && m < 20 ? c : r === 1 ? a : r >= 2 && r <= 4 ? b : c; };

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
  D.boss = { attacks: BOSS.attacks, pool: BOSS.pool, poolMax: BOSS.poolMax, kills: BOSS.kills, points: BOSS.points,
    rounds: { e: EB.roundsOf(BOSS.rounds.e), b: EB.roundsOf(BOSS.rounds.b) }, roundsKind: BOSS.rounds,   // раунды — из таблицы ядра
    rank: BOSS.rank, kinds: BOSS.kinds, bmC: BOSS.bmC, antiHop: BOSS.antiHop,
    host: buildHost(), weeks: buildWeeks(races), art: buildArt(),
    roundsCap: { roundB: 0, roundE: TREE.kinds.kbRound.cap } };   // раунды древо прибавляет только элите — вилкой «Долгий бой»
  const F = BOSS.circle.from, pow1 = CAP.power[F.prof][String(F.c)][F.day - 1];
  D.boss.circle = { pow1, xBp: BOSS.circle.xBp, lvlDiv: CAP.lvlDiv };
  D.rewards = { splitBp: REWARDS.splitBp, contrib: REWARDS.contrib, headH: REWARDS.headH, mode: REWARDS.mode };
  D.res = { splitBp: CT.rules.splitBp, targets: RES.targets, gdd: RES.gdd };
  return D;
}

/* сонмы стихий (foes.js, BOSS.host): роли — класс, ранг и набор; этажи; образцы характеристик; записи сказителя — EN_CLAN.boss.host.
   figs — фигура по id «<стихия>-<роль>»: n — имя, look — облик, tip — совет старика */
function buildHost() {
  const H = BOSS.host, R = H.roles;
  const st = role => { const x = EB.FOES[R[role].tpl].st.slice(); if (R[role].swap) { const [a, b] = R[role].swap; [x[a], x[b]] = [x[b], x[a]]; } return x; };
  const figs = {};
  for (const h of FOES.hosts) for (const role of H.order) { const f = h.figs[role]; if (f) figs[h.id + '-' + role] = { id: h.id + '-' + role, el: h.el, role, n: f.n, look: f.look, tip: f.tip }; }
  return {
    race: FOES.race,
    roles: Object.fromEntries(H.order.map(role => [role, Object.assign({ cls: R[role].cls, n: FOES.roles[role].n, d: FOES.roles[role].d }, R[role].g ? { g: R[role].g } : { kind: R[role].kind })])),
    floors: H.floors, order: H.order, rank: H.retinue.rank,
    tpl: Object.fromEntries(H.order.map(role => [role, st(role)])),
    hp: Object.fromEntries(H.order.filter(role => !R[role].g).map(role => [role, fl(EB.FOES[R[role].tpl].hpPct * H.retinue.hpPct, 100)])),
    hosts: FOES.hosts.map(h => ({ el: h.el, id: h.id, n: h.n, place: h.place })),
    figs, lore: FOES.lore, short: FOES.short, aversionTip: FOES.aversionTip,
  };
}
/* Хозяин недели (§25.4 — таблица контента): неделя расы → стихия, цивилизация Эхо недели из roster.js и строка «почему» из foes.js */
function buildWeeks(races) {
  return Object.fromEntries(races.map(r => { const W = FOES.weeks[r] || {}, R = RS.weeks.find(w => w.race === r); return [r, { el: W.el || '', civ: R ? R.civ : '', why: W.why || '' }]; }));
}
/* арт сонмов: путь в прототипе (от design/ui/assets/art) → отобранный файл art/generated; ready — выгружено: строка в таблице выгрузки
   tools/art-gen/ui-art.json и файл в design/ui/assets/art, как у биомов и Летописи. Чего нет в ready — экран рисует заглушку */
function artRows() {
  const A = BOSS.host.art;
  return Object.entries(ART_PICK).map(([id, v]) => ({ id, path: A.dir + id + A.ext, from: 'clan/' + (typeof v === 'string' ? v : v.from), mirror: !!(v && v.mirror) }));
}
function buildArt() {
  const table = readJson(FILES.uiArt, { items: {} }).items || {};
  const ready = artRows().filter(r => r.path in table && fs.existsSync(path.join(FILES.assets, ...r.path.split('/')))).map(r => r.path);
  return { dir: BOSS.host.art.dir, ext: BOSS.host.art.ext, ready };
}

/* древо: 100 уровней — ветка блока, место в блоке, круг древа, вид уровня (пассивка, вилка, ключ), вехи и альтернативы */
function buildTree(D) {
  const T = TREE, nB = T.order.length, per = nB * T.branchLen;
  const els = D.lists.els; let elNo = 0;   // «dmgEl:#» — следующая стихия по кругу семи
  const alt = (k, p, v) => {
    const K = T.kinds[k], put = s => s.replace('{p}', p).replace('{v}', v);
    return Object.assign({ k, p, v, n: put(K.n), d: put(K.d), s: put(K.s || '+{v} %') }, K.fx ? { live: 1 } : {});
  };
  const regular = (entry, circle) => {
    const [k, p0] = entry.split(':'), p = p0 === '#' ? els[elNo++ % els.length] : p0 || '';
    return alt(k, p, T.kinds[k].v[circle - 1]);
  };
  const levels = [];
  for (let L = 1; L <= T.levels; L++) {
    const bi = fl(L - 1, T.branchLen) % nB, b = T.order[bi], pos = (L - 1) % T.branchLen + 1, circle = fl(L - 1, per) + 1;
    let alts, kind = 'regular';
    if (pos === T.pos.fork) { kind = 'fork'; alts = T.forks[L].map(([k, v]) => alt(k, '', v)); }
    else if (pos === T.pos.key) { kind = 'key'; const k = T.branches[b].key; alts = [alt(k, '', T.kinds[k].v[circle - 1])]; }
    else { const row = T.rows[b][pos < T.pos.fork ? pos - 1 : pos - 2]; alts = row.map(e => regular(e, circle)); }
    const mile = Object.entries(T.miles).filter(([, m]) => L % m.every === 0).map(([k, m]) => ({ k, v: m.v }));
    levels.push({ L, br: bi, pos, circle, kind, mile, alts });
  }
  const kinds = Object.fromEntries(Object.entries(T.kinds).map(([k, K]) => [k, Object.assign({ n: K.n, cap: K.cap, prim: K.prim }, K.fx ? { fx: K.fx } : {}, K.fork ? { fork: 1 } : {}, K.list ? { list: K.list } : {})]));
  return { branches: T.order.map(id => ({ id, n: T.branches[id].n, d: T.branches[id].d })), len: T.branchLen, why: T.why, mileName: T.mileName, pos: T.pos, levels, reset: T.reset,
    clsAlias: T.clsAlias, kinds, caps: Object.fromEntries(Object.entries(T.kinds).map(([k, K]) => [k, K.cap])) };
}
/* эталонный выбор (TREE.ref): индекс альтернативы на каждом уровне — первая по списку предпочтений, иначе первая */
function refPicks(D) {
  return D.tree.levels.map(x => {
    const pref = x.kind === 'fork' ? TREE.ref.fork : TREE.ref.rows;
    for (const k of pref) { const i = x.alts.findIndex(a => a.k === k); if (i >= 0) return i; }
    return 0;
  });
}

/* ================================ РАСЧЁТ ================================ */

let REFP = null;   // эталонный выбор на всех уровнях (refPicks) — задаёт calc()

/* приток резервуара с участника в день, сотые очка: половина очков контракта недели / 7 (EN_CONTRACTS.econ) */
const inflow = (c, prof) => fl(CT.econ[String(c)][prof].pts * 100 * CT.rules.splitBp, CT.rules.bp * 7);
const cycDays = Object.fromEntries(Object.entries(CAP.cycleDays).map(([c, n]) => [+c, n]));
function cycleOfDay(d) { let t = 0; for (const c of Object.keys(cycDays).map(Number).sort((a, b) => a - b)) { t += cycDays[c]; if (d < t) return c; } return 6; }
const dayOf = (c, w) => { let t = 0; for (let k = 2; k < c; k++) t += cycDays[k]; return t + (w - 1) * 7 + 3; };   // середина недели w цикла c от создания клана

/* прогон резервуара эталонного клана: день получения каждого очка; mulPct — множитель притока (плательщик). Глава тратит очко сразу,
   ключ ветки «Клан» ускоряет резервуар — выбор эталонный (у ключа альтернатив нет) */
function resRun(D, base, exp, prof, mulPct) {
  const R = Object.assign({}, D, { res: Object.assign({}, D.res, { base, exp }) }), picks = REFP;
  let have = 0, n = 1; const got = {};
  for (let d = 0; d < RES.horizonDays && n <= TREE.levels; d++) {
    const lvl = n - 1, members = EC.capacity(R, lvl), speed = EC.resSpeedBp(R, lvl, picks);
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

/* бой клана: отряд прототипа силы p против цели — элиты со свитой или босса (EnClan.battle, как в прототипе), урон одной атаки по цели.
   M — прибавки древа (EnClan.fightMods) или null */
const heroesAt = p => SQUAD.map(h => EB.heroSrcValor(Object.assign({}, h, { lvl: p - CAP.lvlDiv })));   // доблесть — правило ядра, как в прототипе
function hit(p, src, seed, rounds, D, M) {
  const b = EB.run(EC.battle(D, heroesAt(p), src, seed, rounds, M || null));
  const u = b.u[1][0];
  return { dmg: Math.max(0, u.maxHp - u.hp), max: u.maxHp, fallen: b.u[0].filter(x => !x.alive).length, rounds: b.round };
}
/* карты круга k для прогона: семь Голосов сонмов — элиты, семь Хозяев — боссы; у каждой цели своя свита стихии (EnClan.retinue) */
function eliteCards(D, k) { return D.lists.els.map(el => EC.card(D, { g: 'e', uid: 'e', el, k })); }
function bossCards(D, k) { return D.lists.els.map(el => EC.card(D, { g: 'b', uid: 'b', el, k })); }
/* атак на убийство, сотые: здоровье цели / средний урон одной атаки по сидам; не меньше одной атаки. Цель теряет здоровье атака за атакой,
   сиды атак независимы — поэтому делим на средний урон, а не усредняем «здоровье / урон»: одна атака без урона иначе делала бы цель
   «непробиваемой» (29.09.2026, древо: вилки так меряются честно). list — по каждой карте, a100 — среднее по картам */
function attacks(p, cards, g, D, M, rounds) {
  let sum = 0, n = 0, fallen = 0; const list = [];
  for (const src of cards) {
    let got = 0, max = 0;
    for (const s of BOSS.design.seeds) {
      const r = hit(p, src, s + n, rounds || D.boss.rounds[g], D, M);
      got += Math.min(r.dmg, r.max); max += r.max; fallen += r.fallen; n++;
    }
    const a = got >= max ? 100 : Math.max(100, Math.ceil(max * 100 / Math.max(1, got)));
    sum += a * BOSS.design.seeds.length; list.push(a);
  }
  return { a100: fl(sum, n), fallen100: fl(fallen * 100, n), list: list.sort((a, b) => a - b) };
}
/* клан бьёт из пула P элит три самые дешёвые (остальные сгорают, §25.2): ожидание их суммы, сотые атаки. Элиты круга — P разных стихий
   из семи без повторов (EnClan.roll): случайное P-подмножество семи Голосов. i-й по цене Голос (list отсортирован) входит в подмножество
   и стоит в нём j-м по цене с вероятностью C(i−1, j−1) · C(N−i, P−j) / C(N, P); точная дробь, BigInt */
function cheapest(list, P, kills) {
  const N = list.length, C = (n, k) => { if (k < 0 || n < 0) return 0n; let r = 1n; for (let i = 0; i < k; i++) r = r * BigInt(n - i) / BigInt(i + 1); return r; };
  const all = C(N, Math.min(P, N));
  let tot = 0n;
  for (let i = 1; i <= N; i++) for (let j = 1; j <= Math.min(kills, P); j++) tot += BigInt(list[i - 1]) * C(i - 1, j - 1) * C(N - i, P - j);
  return Number(tot / all);
}
/* калибровка круга 1: здоровье элит и босса (hpPct) — на силе круга элита падает за eliteAtk атак, босс — за bossAtk */
function calibrate(D) {
  const pow1 = D.boss.circle.pow1, out = {};
  for (const g of ['e', 'b']) {
    const huge = Object.assign({}, D, { boss: Object.assign({}, D.boss, { hp: { e: 1000000, b: 1000000 } }) });
    const cards = g === 'e' ? eliteCards(huge, 1) : bossCards(huge, 1);
    let q = 0, n = 0, cardsN = 0;   // атак на убийство цели со здоровьем 1 % образца, × 1 000 000: здоровье единицы hpPct / средний урон атаки
    for (const src of cards) {
      const unit = EB.foeMaxHp(Object.assign({}, src, { hpPct: 100 }));
      let dmg = 0;
      for (const s of BOSS.design.seeds) { dmg += hit(pow1, src, s + n, D.boss.rounds[g], huge).dmg; n++; }
      q += fl(unit * BOSS.design.seeds.length * 1000000, 100 * Math.max(1, dmg)); cardsN++;
    }
    const want = g === 'e' ? BOSS.design.eliteAtk : BOSS.design.bossAtk;
    out[g] = Math.max(10, Math.round(want * 1000000 * cardsN / q / 10) * 10);   // среднее по картам число атак = want
  }
  return out;
}

/* цена круга k силой p: атаки на каждую элиту и на босса. T — древо { picks, lvl } или null: прибавки боя клана из вилок и пассивок.
   Кэш — по силе, кругу и прибавкам: древо без прибавок боя стоит столько же, сколько без древа */
const costCache = new Map();
const noMods = M => !Object.values(M).some(v => typeof v === 'number' ? v : Object.keys(v).length);
function treeFight(D, T) {
  if (!T) return null;
  const e = EC.fightMods(D, T.picks, T.lvl, 'e'), b = EC.fightMods(D, T.picks, T.lvl, 'b'), rE = EC.rounds(D, 'e', T.picks, T.lvl);
  return noMods(e) && noMods(b) && rE === D.boss.rounds.e ? null : { e, b, rE };
}
function costOf(D, p, k, T) {
  const F = treeFight(D, T), key = p + ':' + k + ':' + (F ? JSON.stringify(F) : '');
  if (!costCache.has(key)) costCache.set(key, { e: attacks(p, eliteCards(D, k), 'e', D, F && F.e, F && F.rE), b: attacks(p, bossCards(D, k), 'b', D, F && F.b) });
  return costCache.get(key);
}
/* неделя клана силы p: круги по порядку, пока хватает атак недели; в круге — три самые дешёвые элиты пула и босс;
   незаконченный круг — только добитые элиты. Бюджет — участники × атаки в день × 7: весь клан бьёт все атаки */
function weekOf(D, p, members, perDay, pool, T) {
  const budget = members * perDay * 7 * 100;
  let left = budget, k = 1, pts = 0, circles = 0, elitesLast = 0, top = null;
  for (; k <= LAWS.maxCircles; k++) {
    const c = costOf(D, p, k, T), ce = cheapest(c.e.list, pool, D.boss.kills), cost = ce + c.b.a100;
    top = { e: fl(ce, D.boss.kills), b: c.b.a100, ce };
    if (left < cost) { elitesLast = Math.min(D.boss.kills, fl(left, Math.max(1, fl(ce, D.boss.kills)))); pts += elitesLast * EC.points(D, k, 'e'); break; }
    left -= cost; circles++; pts += D.boss.kills * EC.points(D, k, 'e') + EC.points(D, k, 'b');
  }
  return { budget: fl(budget, 100), circles, partial: elitesLast, pts, lastCost: top, k };
}
const powOf = W => { const pw = CAP.power[W.prof][String(W.c)], days = pw.slice((W.w - 1) * 7, W.w * 7); return fl(days.reduce((a, x) => a + x, 0), days.length); };
/* неделя эталонного клана — вехи древа (атаки, места) без вилок: чистая сила клана по дням его жизни */
function weekRun(D, W, lvlAt) {
  const p = powOf(W), lvl = lvlAt(W.prof, dayOf(W.c, W.w)), members = EC.capacity(D, lvl), perDay = EC.attacksDay(D, lvl);
  const r = weekOf(D, p, members, perDay, D.boss.pool, null);
  return Object.assign({ W, p, lvl, members, perDay, perMember: fl(r.pts, members) }, r);
}

/* ================================ ТАБЛИЦЫ ================================ */

const head = cols => [`| ${cols.join(' | ')} |`, `| ${cols.map(() => '---').join(' | ')} |`];
const cells = a => `| ${a.join(' | ')} |`;
const yearsDays = d => d >= 365 ? `${fmt(d)} дн. · ${dec(d, 365)} г.` : `${fmt(d)} дн.`;

/* древо на клановом боссе: вилки поодиночке и эталонный выбор целиком (TREE.ref). Прогон ядром тем же боем, что у прототипа */
const TREE_CALC = {
  forkAt: 5,                          // вилки меряются на последнем взятом круге недели эталонных кланов WEEKS[5]: обычный, цикл VI, 2-я неделя
  boss: [{ w: 1, lvls: [0, 100] }, { w: 5, lvls: [0, 20, 50, 100] }],   // сила — неделя WEEKS[w]; уровни древа — эталонный выбор, и 100 — одни вехи
  /* клан, где играют не все: 70 % участников заходят за неделю (Событие, SIM.clan.activeBp) и тратят 4 атаки из 5 (контракты, ASSUME.clan) —
     бюджет атак 56 %. На нём видно, чего стоят атаки древа: у полного клана их с запасом */
  act: { bp: 5600 },
  when: [['конец цикла II', 14], ['конец цикла III', 35], ['конец цикла IV', 56], ['конец цикла V', 77], ['конец цикла VI', 98], ['год', 365], ['два года', 730]],
};
function treeCalc(D, weeks, got) {
  const lvlOf = (g, d) => { let l = 0; for (let n = 1; n <= TREE.levels; n++) if (g[n] && g[n] <= d) l = n; return l; };
  const only = (L, i) => { const p = D.tree.levels.map(() => null); p[L - 1] = i; return p; };
  const circleCost = (p, k, T, pool) => { const c = costOf(D, p, k, T); return cheapest(c.e.list, pool, D.boss.kills) + c.b.a100; };
  /* вилки поодиночке: атак на круг 1 силой круга и на последний круг, который эталонный клан цикла VI ещё берёт, — дальше стена */
  const W = weeks[TREE_CALC.forkAt], pow1 = D.boss.circle.pow1, wall = W.k - 1;
  const base1 = circleCost(pow1, 1, null, D.boss.pool), baseW = circleCost(W.p, wall, null, D.boss.pool);
  const forks = [];
  for (const x of D.tree.levels.filter(y => y.kind === 'fork')) x.alts.forEach((a, i) => {
    const T = { picks: only(x.L, i), lvl: x.L }, pool = EC.elitePool(D, x.L, T.picks), F = D.tree.kinds[a.k].fx;
    const c1 = F.t === 'carry' ? null : circleCost(pow1, 1, T, pool), cw = F.t === 'carry' ? null : circleCost(W.p, wall, T, pool);
    forks.push({ L: x.L, i, k: a.k, n: a.n, v: a.v, s: a.s, c1, cw });
  });
  /* эталонный выбор на силе недель WEEKS: уровни древа; «вехи» — тот же уровень без пассивок и вилок */
  const boss = [];
  for (const B of TREE_CALC.boss) {
    const R = weeks[B.w], p = R.p;
    for (const L of B.lvls) for (const mode of L === TREE.levels ? ['miles', 'ref'] : [L ? 'ref' : 'none']) {
      const T = mode === 'ref' ? { picks: REFP, lvl: L } : null, pool = mode === 'ref' ? EC.elitePool(D, L, REFP) : D.boss.pool;
      const r = weekOf(D, p, EC.capacity(D, L), EC.attacksDay(D, L), pool, T);
      boss.push(Object.assign({ W: R.W, p, L, mode, members: EC.capacity(D, L), perDay: EC.attacksDay(D, L), pool, wallet: EC.walletCap(D, L, mode === 'ref' ? REFP : null) }, r));
    }
    /* тот же клан, когда играют не все: атаки древа без вилок — бюджет × act.bp */
    for (const L of [0, TREE.levels]) {
      const members = EC.capacity(D, L), perDay = EC.attacksDay(D, L), r = weekOf(D, p, 1, fl(members * perDay * TREE_CALC.act.bp, D.bp), D.boss.pool, null);
      boss.push(Object.assign({ W: R.W, p, L, mode: 'miles', act: true, members, perDay, pool: D.boss.pool, wallet: EC.walletCap(D, L, null) }, r));
    }
  }
  /* когда приходит: уровень обычных, увлечённых и плательщиков к вехам календаря */
  const when = TREE_CALC.when.map(([n, d]) => ({ n, d, o: lvlOf(got.o, d), e: lvlOf(got.e, d), p: lvlOf(got.p, d) }));
  /* потолки видов: наибольшая сумма, которую вид набирает на всём древе, если клан берёт его везде, где он есть */
  const most = {}, seen = {};
  for (const x of D.tree.levels) for (const a of x.alts) { const key = a.k + (a.p ? ':' + a.p : ''); most[key] = (most[key] || 0) + a.v; seen[key] = (seen[key] || 0) + 1; }
  return { forks, base1, baseW, wall, W, boss, when, most, seen };
}

function calc() {
  const D = build();
  REFP = refPicks(D);
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
  const pow1 = D.boss.circle.pow1, c1 = costOf(D, pow1, 1, null);
  const circles = [];
  for (let k = 1; k <= 30; k++) {
    const e = eliteCards(D, k), b = bossCards(D, k);
    circles.push({ k, lvl: EC.circleLvl(D, k), hpE: fl(e.reduce((a, x) => a + x.maxHp, 0), e.length), hpB: fl(b.reduce((a, x) => a + x.maxHp, 0), b.length),
      bmE: fl(e.reduce((a, x) => a + EC.cardBm(D, x), 0), e.length), bmB: fl(b.reduce((a, x) => a + EC.cardBm(D, x), 0), b.length), ptsE: EC.points(D, k, 'e'), ptsB: EC.points(D, k, 'b') });
  }
  const weeks = WEEKS.map(W => weekRun(D, W, lvlAt));

  /* 3. древо: вилки, эталонный выбор на клановом боссе, сроки и потолки */
  const TC = treeCalc(D, weeks, { o: refGot, e: eGot, p: pGot });
  D.calc = { c1: { e: c1.e.a100, b: c1.b.a100 }, circles: circles.slice(0, 20).map(c => [c.k, c.lvl, c.hpE, c.hpB, c.bmE, c.bmB, c.ptsE, c.ptsB]),
    weeks: weeks.map(r => [r.W.prof, r.W.c, r.W.w, r.p, r.lvl, r.members, r.perDay, r.budget, r.circles, r.partial, r.pts, r.perMember]),
    forks: TC.forks.map(f => [f.L, f.i, f.c1 == null ? -1 : f.c1, f.cw == null ? -1 : f.cw]), forkBase: [TC.base1, TC.baseW, TC.wall],
    treeBoss: TC.boss.map(r => [r.W.prof, r.W.c, r.W.w, r.p, r.L, r.mode === 'ref' ? 2 : r.mode === 'miles' ? 1 : 0, r.act ? 1 : 0, r.members, r.perDay, r.pool, r.circles, r.partial, r.pts]), actBp: TREE_CALC.act.bp,
    when: TC.when.map(w => [w.d, w.o, w.e, w.p]) };

  /* 3. награды: ступени мест кланов по циклам */
  const M = LBX.modes[REWARDS.mode], ly = M ? M.layers.find(x => x.kind === 'place' && x.clan) : null;
  if (!ly) fail('lootboxes.js: нет строк мест кланов у режима «Клановый босс»');
  const tiers = ly ? ly.rows.map(r => ({ label: r.label, top: r.top, steps: EC.stepsOf(r, M.from) })) : [];
  D.rewards.tiers = tiers.map(t => ({ label: t.label, top: t.top, steps: t.steps.map(g => [g.step, g.count, g.win]) }));
  D.rewards.from = M ? M.from : 2;
  D.rewards.box = M ? M.box : 'talisman';

  checks(D, S, circles, weeks, ly, M, TC);
  const tables = mkTables(D, S, circles, weeks, tiers, TC);
  return { data: D, tables, S, circles, weeks, TC };
}

function mkTables(D, S, circles, weeks, tiers, TC) {
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
  const lvlWhat = x => [x.mile.map(m => D.tree.mileName[m.k]).join(', '), x.kind === 'fork' ? 'вилка кланового босса' : x.kind === 'key' ? `ключ ветки: ${x.alts[0].n}` : ''].filter(Boolean).join('; ') || '—';
  T = head(['Уровень клана', 'Обычные, 25 → 35', 'Увлечённые', `Плательщики, приток ×${dec(D.res.ref.x17, 100, 2)}`, 'Что даёт уровень']);
  for (const n of RES.marks) T.push(cells([n, o[n] ? yearsDays(o[n]) : '—', e[n] ? yearsDays(e[n]) : '—', p[n] ? yearsDays(p[n]) : '—', lvlWhat(D.tree.levels[n - 1])]));
  TBL.resDays = T.join('\n');
  // древо: блоки
  const altTxt = a => `${a.n} ${a.s}`;
  T = head(['Уровни', 'Ветка', 'Круг древа', 'Вилка кланового босса — 5-й уровень ветки', 'Ключ ветки — 10-й', 'Вехи блока']);
  for (let lo = 1; lo <= TREE.levels; lo += TREE.branchLen) {
    const Ls = D.tree.levels.slice(lo - 1, lo - 1 + TREE.branchLen), f = Ls.find(x => x.kind === 'fork'), k = Ls.find(x => x.kind === 'key');
    const att = Ls.reduce((a, x) => a + x.mile.filter(m => m.k === 'attack').reduce((b, m) => b + m.v, 0), 0), cap = Ls.reduce((a, x) => a + x.mile.filter(m => m.k === 'cap').reduce((b, m) => b + m.v, 0), 0);
    T.push(cells([`${lo}–${lo + TREE.branchLen - 1}`, D.tree.branches[Ls[0].br].n, ROMAN[Ls[0].circle], f ? f.alts.map(altTxt).join(' / ') : '—', k ? altTxt(k.alts[0]) : '—', `+${att} ${plural(att, 'атака', 'атаки', 'атак')} в день, +${cap} ${plural(cap, 'место', 'места', 'мест')}`]));
  }
  TBL.tree = T.join('\n');
  // древо: все сто уровней
  T = head(['Ур.', 'Ветка', 'На выбор — одна', 'Веха']);
  for (const x of D.tree.levels) {
    const what = x.kind === 'fork' ? `**Вилка:** ${x.alts.map(altTxt).join(' / ')}` : x.kind === 'key' ? `**Ключ ветки:** ${altTxt(x.alts[0])}` : x.alts.map(altTxt).join(' / ');
    T.push(cells([x.L, D.tree.branches[x.br].n, what, x.mile.length ? x.mile.map(m => D.tree.mileName[m.k]).join(', ') : '']));
  }
  TBL.treeAll = T.join('\n');
  // древо: потолки видов
  const primTxt = pr => { const t = pr.slice(0, pr.indexOf(':')), v = pr.slice(pr.indexOf(':') + 1); return t === 'core' ? `ядро: ${v}` : t === 'ach' ? `достижения: «${WN.ach.kinds[v].n}»` : t === 'mem' ? `Память: «${v}»` : `клан: ${v}`; };
  const brOf = k => { for (const b of TREE.order) if (TREE.rows[b].some(r => r.some(e => e.split(':')[0] === k)) || TREE.branches[b].key === k) return TREE.branches[b].n; return 'Вилки'; };
  T = head(['Ветка', 'Пассивка', 'Что даёт', 'За выбор', 'Потолок на древе', 'Примитив']);
  for (const [k, K] of Object.entries(TREE.kinds)) {
    const keys = Object.keys(TC.most).filter(x => x.split(':')[0] === k), top = keys.length ? Math.max(...keys.map(x => TC.most[x])) : 0;
    const circ = [...new Set(D.tree.levels.filter(x => x.alts.some(y => y.k === k)).map(x => x.circle))].sort((x, y) => x - y);
    const vals = K.fork ? D.tree.levels.filter(x => x.kind === 'fork').flatMap(x => x.alts.filter(y => y.k === k).map(y => y.v)) : circ.map(c => K.v[c - 1]);
    const unit = (K.s || '+{v} %').replace('{v}', '').trim();
    T.push(cells([brOf(k), K.list ? K.n.replace(': {p}', '') : K.n, K.d.replace('{p}', '…').replace('{v}', '…'), `${vals.join(' / ')} ${unit.replace(/^[+−]/, '').trim()}`.trim(), (K.s || '+{v} %').replace('{v}', top), primTxt(K.prim)]));
  }
  TBL.treeCaps = T.join('\n');
  // вилки: атак на круг 1 и на круг стены
  const chg = (v, b) => { if (v == null) return '—'; const d = dec(Math.abs(v - b) * 100, b, 0); return `${fmt(fl(v + 50, 100))} · ${d === '0' ? '0' : (v < b ? '−' : '+') + d} %`; };
  T = head(['Уровень', 'Вариант', `Круг 1 силой круга: атак на круг, без древа ${fmt(fl(TC.base1 + 50, 100))}`, `Круг ${TC.wall} — последний, что берёт клан цикла VI: атак на круг, без древа ${fmt(fl(TC.baseW + 50, 100))}`]);
  for (const f of TC.forks) T.push(cells([f.i ? '' : f.L, `${f.n} ${f.s}`, f.k === 'kbCarry' ? 'атак за неделю не меньше: день без игры не пропадает' : chg(f.c1, TC.base1), f.k === 'kbCarry' ? '—' : chg(f.cw, TC.baseW)]));
  TBL.forks = T.join('\n');
  // древо на клановом боссе: эталонный выбор
  T = head(['Сила отряда', 'Древо', 'Участников × атак в день', 'Элит в круге', 'Кругов', 'Очков клана', 'Очков к древу 0']);
  for (const r of TC.boss) {
    const b0 = TC.boss.find(x => x.W === r.W && x.L === 0 && !!x.act === !!r.act), what = r.L === 0 ? 'нет' : r.mode === 'miles' ? `${r.L} — только вехи` : `${r.L} — эталонный выбор`;
    T.push(cells([r.L || r.act ? '' : `${PROF[r.W.prof]}, цикл ${ROMAN[r.W.c]}, ${r.W.w}-я неделя · ${fmt(r.p)}`, r.act ? `${what}; играют не все — ${fl(TREE_CALC.act.bp, 100)} % атак` : what, `${r.members} × ${r.perDay}`, r.pool,
      `${r.circles}${r.partial ? ` + ${r.partial} ${r.partial === 1 ? 'элита' : 'элиты'}` : ''}`, fmt(r.pts), r.L === 0 && !r.act ? '—' : `×${dec(r.pts, Math.max(1, b0.pts), 2)}`]));
  }
  TBL.treeBoss = T.join('\n');
  // когда приходит
  const forksBy = L => D.tree.levels.filter(x => x.kind === 'fork' && x.L <= L).length;
  T = head(['Когда', 'Обычные: уровень · атак в день · мест · вилок', 'Увлечённые', 'Плательщики']);
  const cell = L => `${L} · ${EC.attacksDay(D, L)} · ${EC.capacity(D, L)} · ${forksBy(L)}`;
  for (const w of TC.when) T.push(cells([`${w.n}, ${w.d}-й день`, cell(w.o), cell(w.e), cell(w.p)]));
  TBL.treeWhen = T.join('\n');
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
    `круг ${r.k}: ${dec(r.lastCost.e, 100)} / ${dec(r.lastCost.b, 100)}`, fmt(r.pts), fmt(r.perMember)]));
  TBL.weeks = T.join('\n');
  // награды
  T = head(['Место клана', 'На участника · ступени', 'Пул клана из 25', 'Сервер по вкладу', 'Глава']);
  for (const t of tiers) {
    const per = t.steps.map(g => `${g.count} × ступень ${g.step}`).join(' + '), total = t.steps.reduce((a, g) => a + g.count * 25, 0), H = EC.halves(D, t.steps.map(g => ({ step: g.step, win: g.win, count: g.count * 25 })));
    T.push(cells([t.label, per, total, H.reduce((a, g) => a + g.server, 0), H.reduce((a, g) => a + g.head, 0)]));
  }
  TBL.rewards = T.join('\n');
  // сонмы стихий: восемь фигур каждой стихии
  const HS = D.boss.host, figN = (h, role) => HS.figs[h.id + '-' + role].n;
  T = head(['Стихия', 'Сонм', ...HS.order.map(role => `${HS.roles[role].n} · ${ROLE_CLS[role]}`)]);
  for (const h of HS.hosts) T.push(cells([h.el, h.n, ...HS.order.map(role => figN(h, role))]));
  TBL.hosts = T.join('\n');
  // этажи: кто с кем выходит, класс, ранг и способности по стихии
  const L = EB.lib();
  T = head(['Этаж', 'Роль', 'Класс ядра', 'Ранг', 'Способности — вид из библиотеки', 'Например, у Воды']);
  const kindsOf = role => role === 'elite' ? D.boss.kinds.e : role === 'boss' ? D.boss.kinds.b : [HS.roles[role].kind];
  const rowsOf = (floor, lead) => [lead].concat(HS.floors[floor]).map((role, i) => cells([i ? '' : floor === 'e' ? 'Этаж Голоса — элита' : 'Этаж Хозяина — клановый босс', HS.roles[role].n, HS.roles[role].cls,
    role === 'elite' ? 'элита' : role === 'boss' ? 'клановый' : 'рядовой', kindsOf(role).join(', '), kindsOf(role).map(k => L[D.lists.els[0] + '.' + k] ? L[D.lists.els[0] + '.' + k].n : k).join(', ')]));
  T.push(...rowsOf('e', 'elite'), ...rowsOf('b', 'boss'));
  TBL.floors = T.join('\n');
  // Хозяин недели по неделям рас
  const beats = el => D.lists.els.filter(x => EB.elemMul(x, el) > EB.RULES.elem.base);
  T = head(['Неделя', 'Эхо недели', 'Хозяин', 'Стихия', 'Сильнее его', 'Почему он встаёт — игроку']);
  for (const r of D.lists.races) { const W = D.boss.weeks[r], h = HS.hosts.find(x => x.el === W.el); T.push(cells([r, W.civ, h ? figN(h, 'boss') : '—', W.el, beats(W.el).join(', ') || 'никто: время со всеми ×1', W.why])); }
  TBL.rotation = T.join('\n');
  // арт: выгрузка и траты
  const M = readJson(FILES.manifest, { items: [] }).items || [], jobIds = new Set(artRows().map(r => BOSS.host.art.job + r.id));
  const mine = M.filter(x => jobIds.has(x.job)), usd = mine.reduce((a, x) => a + (x.cost_usd || 0), 0);
  T = head(['Картинка в прототипе', 'Файл art/generated', 'Отразить', 'Попыток', 'Выгружено']);
  for (const r of artRows()) { const n = mine.filter(x => x.job === BOSS.host.art.job + r.id).length; T.push(cells([`design/ui/assets/art/${r.path}`, r.from, r.mirror ? 'да' : '', n, D.boss.art.ready.includes(r.path) ? 'да' : 'нет'])); }
  T.push(cells(['**Итого**', `${mine.length} ${plural(mine.length, 'генерация', 'генерации', 'генераций')}`, '', '', `$${dec(Math.round(usd * 100), 100, 2)}`]));
  TBL.art = T.join('\n');
  return TBL;
}
/* класс роли для подписи таблиц: как в каноническом списке §36.15 */
const ROLE_CLS = { elite: 'маг ДД', boss: 'маг ДД', tank: 'танк', healer: 'лекарь', ctl1: 'контроль', ctl2: 'контроль', dd1: 'физ ДД силы', dd2: 'физ ДД ловкости' };

/* ================================ ПРОВЕРКИ ================================ */

/* примитивы ядра — проверка делом: поле, которое сервер задаёт при сборке боя, меняет исход; поле фарма доходит до добычи этажа */
const CLAN_PRIM = ['pool', 'rounds', 'carry', 'retinue', 'speed'];   // данные клана: пул элит, раунды элиты, кошелёк, свита, скорость резервуара
function coreProbe(D) {
  const ok = {}, p = D.boss.circle.pow1, src = EC.card(D, { g: 'b', uid: 'проба', el: D.lists.els[0], race: D.lists.races[0], k: 1 });
  const fight = (tune, hp) => { const b = EB.create({ mode: 'rounds', seed: 7, heroes: heroesAt(p).map(h => hp ? Object.assign({}, h, { hpPct: hp }) : h), foes: [src], maxRounds: 6 }); for (const u of b.u[0]) tune(u); EB.run(b); return b; };
  const dealt = b => b.u[0].reduce((a, u) => a + u.dealt, 0), healed = b => b.u[0].reduce((a, u) => a + u.healed, 0);
  const b0 = fight(() => {});
  ok['aura.dmgUp'] = dealt(fight(u => { u.aura.dmgUp += 5000; })) > dealt(b0);
  ok['aura.lifesteal'] = healed(fight(u => { u.aura.lifesteal += 5000; })) > healed(b0);
  ok['critDmg'] = dealt(fight(u => { u.critDmg += 500; })) > dealt(b0);
  ok['hpPct'] = fight(() => {}, 150).u[0].every((u, i) => u.maxHp > b0.u[0][i].maxHp);
  ok['pas.shieldUp'] = /pasOf\(src, 'shieldUp'\)/.test(fs.readFileSync(FILES.ui[0], 'utf8'));   // поправка щитов наложившего — supportPct ядра
  const fb = EB.run(EB.floorBattle(heroesAt(p), 'b1', 1, null, 'rounds'));
  if (fb.win) {
    const hero = fb.u[0].find(u => u.alive), F0 = EB.floorLoot('b1', 1, fb).farm;
    hero.lpas.push({ kind: 'farm', id: 'клан:проба', gold: 500, spirit: 500, doubleCh: 100, baseResMul: 10500, rareMul: 10500, keyCh: 100, souls: { b: 1 } });
    const F = EB.floorLoot('b1', 1, fb).farm;
    ok['farm.gold'] = F.goldPct > F0.goldPct; ok['farm.spirit'] = F.spiritPct > F0.spiritPct; ok['farm.doubleCh'] = F.doubleCh > F0.doubleCh;
    ok['farm.baseResMul'] = F.basePct > F0.basePct; ok['farm.rareMul'] = F.rarePct > F0.rarePct; ok['farm.keyCh'] = F.keyCh > F0.keyCh; ok['farm.souls'] = (F.souls.b || 0) > (F0.souls.b || 0);
  }
  return ok;
}
function primChecks(D) {
  const core = coreProbe(D), mem = new Set(WN ? WN.passives.map(x => x.fam) : []), ach = WN && WN.ach ? WN.ach.kinds : {};
  if (!WN) fail('примитивы: нет wanderer.js — виды достижений и семейства Памяти не сверить');
  for (const K of Object.values(TREE.kinds)) {
    const t = K.prim.slice(0, K.prim.indexOf(':')), v = K.prim.slice(K.prim.indexOf(':') + 1);   // семейства Памяти сами с двоеточием
    const ok = t === 'core' ? core[v] === true : t === 'ach' ? !!ach[v] : t === 'mem' ? mem.has(v) : t === 'clan' ? CLAN_PRIM.includes(v) : false;
    if (!ok) fail(`примитив: у «${K.n}» — «${K.prim}», такого нет ${t === 'core' ? 'в ядре боя' : t === 'ach' ? 'у пассивок достижений' : t === 'mem' ? 'в семействах Памяти' : 'в данных клана'}`);
  }
}
/* прибавки вилок и пассивок боя клана ложатся в карты ядра: урон, здоровье, щиты, крит, вампиризм, свита, «сильная стихия» */
function fxChecks(D) {
  const p = D.boss.circle.pow1, heroes = heroesAt(p);
  for (const [k, K] of Object.entries(TREE.kinds)) {
    const F = K.fx; if (!F || ['pool', 'rounds', 'carry', 'speed'].includes(F.t)) continue;
    const x = D.tree.levels.find(y => y.alts.some(a => a.k === k)), i = x.alts.findIndex(a => a.k === k), a = x.alts[i];
    const picks = D.tree.levels.map(() => null); picks[x.L - 1] = i;
    const g = F.on || 'e', el = F.edge ? D.lists.els.find(e => heroes.some(h => EC.edge(h.el, e))) : D.lists.els[0];
    const src = EC.card(D, { g, uid: 'проба', el, k: 1 }), rounds = EC.rounds(D, g, picks, x.L);
    const M = EC.fightMods(D, picks, x.L, g), b0 = EC.battle(D, heroes, src, 3, rounds, null), b1 = EC.battle(D, heroes, src, 3, rounds, M);
    const H = b1.u[0], H0 = b0.u[0];
    let ok;
    if (F.t === 'dmg') ok = F.by ? (F.by === 'cls' ? M.cls[a.p] : M.el[a.p]) === a.v && H.every(u => u.aura.dmgUp === EC.heroDmg(D, M, u, el) * 100) : H.some(u => u.aura.dmgUp > 0);
    else if (F.t === 'hp') ok = F.by ? M.hpCls[a.p] === a.v : H.every((u, j) => u.maxHp > H0[j].maxHp);
    else if (F.t === 'shield') ok = H.every(u => u.lpas.some(q => q.pas === 'shieldUp' && q.pct === a.v));
    else if (F.t === 'crit') ok = H.every((u, j) => u.critDmg === H0[j].critDmg + a.v);
    else if (F.t === 'leech') ok = H.every(u => u.aura.lifesteal === a.v * 100);
    else if (F.t === 'retinue') ok = b1.u[1].length === b0.u[1].length && b1.u[1].slice(1).every((u, j) => u.maxHp < b0.u[1][j + 1].maxHp);
    if (!ok) fail(`бой клана: «${a.n}» (${x.L}-й уровень) не легла в карты ядра`);
  }
}

/* сонмы стихий (слово автора 29.09.2026): по стихии — Голос маг ДД с танком, лекарем и двумя контролёрами; Хозяин маг ДД с двумя физ ДД,
   танком и лекарем; танк и лекарь — одни на оба этажа; все — своей стихии. Хозяин недели — по таблице недель, повторов подряд нет.
   Тексты игрока — без спойлеров дайджеста; арт — отобран для каждой фигуры, файл есть, задание — на каждую фигуру */
function hostChecks(D, L) {
  const HS = D.boss.host, R = HS.roles, want = { elite: 'Маг. ДД', boss: 'Маг. ДД', tank: 'Танк', healer: 'Лекарь', ctl1: 'Дебаффер', ctl2: 'Дебаффер', dd1: 'Физ. ДД силы', dd2: 'Физ. ДД ловкости' };
  for (const [role, cls] of Object.entries(want)) if (!R[role] || R[role].cls !== cls) fail(`сонм: роль «${role}» — класс ${R[role] ? R[role].cls : 'нет'}, по слову автора — ${cls}`);
  const fl2 = HS.floors;
  if (fl2.e.join() !== 'tank,healer,ctl1,ctl2' || fl2.b.join() !== 'tank,healer,dd1,dd2') fail(`сонм: этажи ${fl2.e.join()} / ${fl2.b.join()} — не «танк, лекарь, два контроля» и «танк, лекарь, два физ ДД»`);
  if (HS.hosts.map(h => h.el).sort().join() !== D.lists.els.slice().sort().join()) fail('сонмы: не по одному на каждую из семи стихий');
  if (!RS.weeks.some(w => w.race === HS.race) || /перворожд/i.test(HS.race)) fail(`сонмы: раса «${HS.race}» — не из рас недели`);
  const names = new Set();
  for (const h of HS.hosts) for (const role of HS.order) {
    const id = h.id + '-' + role, f = HS.figs[id];
    if (!f) { fail(`сонм ${h.el}: нет фигуры «${role}»`); continue; }
    if (!f.n || !f.look || !f.tip) fail(`сонм ${h.el}: у «${id}» нет имени, облика или совета старика`);
    if (names.has(f.n)) fail(`сонмы: имя «${f.n}» повторяется`); names.add(f.n);
    if (f.el !== h.el || f.role !== role) fail(`сонм: фигура «${id}» не своей стихии или роли`);
    if (!ART_PICK[id]) fail(`арт: для «${f.n}» (${id}) не отобрана картинка`);
  }
  if (Object.keys(HS.figs).length !== HS.hosts.length * HS.order.length) fail(`сонмы: фигур ${Object.keys(HS.figs).length}, нужно ${HS.hosts.length * HS.order.length}`);
  // свита этажа: четверо стихии цели, ранг рядовой, набор — в библиотеке; танк и лекарь — те же фигуры у Голоса и у Хозяина
  for (const el of D.lists.els) for (const g of ['e', 'b']) {
    const src = EC.card(D, { g, uid: g, el, k: 1 }), guards = EC.retinue(D, src), floor = fl2[g];
    if (src.cls !== R[g === 'b' ? 'boss' : 'elite'].cls || src.race !== HS.race) fail(`${el} · ${g}: цель — класс ${src.cls}, раса ${src.race}`);
    if (guards.length !== floor.length) { fail(`${el} · ${g}: свита — ${guards.length}, нужно ${floor.length}`); continue; }
    guards.forEach((u, j) => {
      const f = HS.figs[u.fig];
      if (!f || f.role !== floor[j] || f.el !== el || u.el !== el) fail(`${el} · ${g}: приспешник «${u.name}» — не «${floor[j]}» своей стихии`);
      if (!EB.RULES.cls[u.cls] || u.rank !== HS.rank.core || u.race !== HS.race) fail(`${el} · ${g}: приспешник «${u.name}» — класс ${u.cls}, ранг ${u.rank}`);
      for (const x of u.kit.kit) if (!L[x.id]) fail(`${el} · ${g}: у «${u.name}» нет в библиотеке «${x.id}»`);
    });
    const b = EC.battle(D, heroesAt(D.boss.circle.pow1), src, 1, D.boss.rounds[g]);
    if (b.u[1].length !== floor.length + 1 || b.maxRounds !== D.boss.rounds[g]) fail(`${el} · ${g}: в бою врагов ${b.u[1].length}, раундов ${b.maxRounds}`);
  }
  // Хозяин недели: каждая неделя расы — стихия из семи и её Хозяин; все семь Хозяев в ротации; рядом одинаковых нет, по кругу недель тоже
  const W = D.lists.races.map(r => D.boss.weeks[r]);
  W.forEach((w, i) => {
    if (!w || !D.lists.els.includes(w.el) || !w.why || !w.civ) fail(`Хозяин недели «${D.lists.races[i]}»: нет стихии, цивилизации Эхо или строки «почему»`);
    else if (W[(i + 1) % W.length] && W[(i + 1) % W.length].el === w.el) fail(`Хозяин недели: «${D.lists.races[i]}» и следующая неделя — один Хозяин подряд`);
  });
  for (const el of D.lists.els) if (!W.some(w => w && w.el === el)) fail(`Хозяин недели: стихии «${el}» нет ни в одной неделе`);
  if (Object.keys(FOES.weeks).some(r => !D.lists.races.includes(r))) fail('Хозяин недели: в foes.js неделя не из roster.js');
  // тексты игрока: без спойлеров дайджеста и §38 (tools/content-gen/lore/spoilers.js)
  const texts = [...HS.lore, HS.short, HS.aversionTip, ...Object.values(HS.figs).flatMap(f => [f.n, f.look, f.tip]), ...W.map(w => w ? w.why : ''),
    ...HS.hosts.flatMap(h => [h.n, h.place]), ...Object.values(HS.roles).flatMap(r => [r.n, r.d])];
  for (const t of texts) for (const hit of SP.scan(t)) fail(`спойлер в тексте игрока: «${hit.hit}» — ${hit.why}: «${t.slice(0, 60)}»`);
  // арт: отобранный файл есть; выгруженное — из отобранного; задание — на каждую фигуру, промты без спойлеров
  for (const r of artRows()) if (!fs.existsSync(path.join(FILES.generated, ...r.from.split('/')))) fail(`арт: нет файла art/generated/${r.from}`);
  const JOB = readJson(FILES.job, null);
  if (!JOB) fail('арт: нет задания tools/art-gen/jobs/clan-foes.json');
  else {
    const ids = new Set(JOB.jobs.map(j => j.id));
    for (const id of Object.keys(HS.figs)) if (!ids.has(BOSS.host.art.job + id)) fail(`арт: в задании нет «${BOSS.host.art.job + id}»`);
    for (const j of JOB.jobs) { const m = [JOB.style, JOB.negative, JOB.categories[j.category] && JOB.categories[j.category].frame, j.subject].join('\n').match(SP.PROMPT_BAN); if (m) fail(`арт ${j.id}: в промте «${m[0]}» — спойлер`); }
  }
}

function checks(D, S, circles, weeks, ly, M, TC) {
  // целые числа во всех данных
  (function walk(x, where) {
    if (typeof x === 'number') { if (!Number.isInteger(x)) fail(`не целое: ${where} = ${x}`); return; }
    if (Array.isArray(x)) x.forEach((v, i) => walk(v, `${where}[${i}]`));
    else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, `${where}.${k}`);
  })(D, 'EN_CLAN');
  // древо: каркас — ветки блоками по десять, круг повторяется; 5-й уровень ветки — вилка, 10-й — ключ; вехи — каждый 5-й и 10-й
  const T = D.tree, nB = TREE.order.length;
  if (T.levels.length !== TREE.levels) fail(`древо: уровней ${T.levels.length}`);
  T.levels.forEach((x, i) => {
    if (x.L !== i + 1) fail(`древо: уровень ${i + 1} под номером ${x.L}`);
    if (x.br !== fl(i, TREE.branchLen) % nB) fail(`древо: уровень ${x.L} в ветке ${x.br}`);
    const want = x.pos === TREE.pos.fork ? 'fork' : x.pos === TREE.pos.key ? 'key' : 'regular';
    if (x.kind !== want) fail(`древо: уровень ${x.L} — ${x.kind}, на ${x.pos}-м месте ветки нужен ${want}`);
    if (x.alts.length < 1 || x.alts.length > 5) fail(`древо: уровень ${x.L} — альтернатив ${x.alts.length}, по §24.2 от 1 до 5`);
    if (x.kind === 'fork' && (x.alts.length < 2 || x.alts.length > 3 || x.alts.some(a => !TREE.kinds[a.k].fork))) fail(`древо: вилка ${x.L}-го уровня — не 2–3 тактики кланового босса`);
    if (x.kind !== 'fork' && x.alts.some(a => TREE.kinds[a.k] && TREE.kinds[a.k].fork)) fail(`древо: тактика кланового босса вне вилки — уровень ${x.L}`);
    if (x.kind === 'key' && (x.alts.length !== 1 || x.alts[0].k !== TREE.branches[TREE.order[x.br]].key)) fail(`древо: ключ ветки на ${x.L}-м уровне не тот`);
    const ids = x.alts.map(a => a.k + ':' + a.p); if (new Set(ids).size !== ids.length) fail(`древо: уровень ${x.L} — альтернатива повторяется`);
    const mile = Object.entries(TREE.miles).filter(([, m]) => x.L % m.every === 0).map(([k]) => k).join();
    if (x.mile.map(m => m.k).join() !== mile) fail(`древо: вехи ${x.L}-го уровня — ${x.mile.map(m => m.k).join() || 'нет'}, нужно ${mile || 'нет'}`);
    for (const a of x.alts) {
      const K = TREE.kinds[a.k]; if (!K) { fail(`древо: вид ${a.k}`); continue; }
      if (K.list && !D.lists[K.list].includes(a.p)) fail(`древо: ${a.n} — «${a.p}» не из канонического списка`);
      if (a.p === 'Перворождённые') fail('древо: Перворождённые — спойлер до 11-го биома');
      if (/PvP|Арен|Лиг/.test(a.d)) fail(`древо: ${a.n} — клановые бонусы в PvP не действуют`);
      if (!(a.v > 0)) fail(`древо: ${a.n} на ${x.L}-м уровне — значение ${a.v}`);
      if (/\{[pv]\}/.test(a.n + a.d + a.s)) fail(`древо: ${a.n} — не подставлен шаблон`);
    }
  });
  if (Object.keys(TREE.forks).map(Number).join() !== T.levels.filter(x => x.kind === 'fork').map(x => x.L).join()) fail('древо: вилки не на пятых уровнях веток');
  // вехи: +1 атака каждые 5 уровней — к сотому +20; +1 место каждые 10 — 25 → 35 (слово автора 29.09.2026, §24.1)
  for (let L = 0; L <= TREE.levels; L++) {
    if (EC.attacksDay(D, L) !== D.boss.attacks.day + fl(L, TREE.miles.attack.every) * TREE.miles.attack.v) fail(`вехи: атак в день на ${L}-м уровне — ${EC.attacksDay(D, L)}`);
    if (EC.capacity(D, L) !== RULES.capacity.base + fl(L, TREE.miles.cap.every) * TREE.miles.cap.v) fail(`вехи: мест на ${L}-м уровне — ${EC.capacity(D, L)}`);
  }
  if (EC.attacksDay(D, TREE.levels) !== D.boss.attacks.day + 20 || EC.capacity(D, TREE.levels) !== 35 || EC.capacity(D, 0) !== 25) fail(`вехи: к сотому уровню ${EC.attacksDay(D, TREE.levels)} атак и ${EC.capacity(D, TREE.levels)} мест, по слову автора — +20 и 25 → 35`);
  // кошелёк атак: копит дневную норму и ещё carryDays; вилка «Запас атак» — ещё норму; вехи и сброс древа кошелёк не обнуляют
  const allFork = k => T.levels.map(x => { const i = x.alts.findIndex(a => a.k === k); return i >= 0 ? i : 0; });
  if (EC.walletCap(D, 0, null) !== D.boss.attacks.day * (1 + D.boss.attacks.carryDays)) fail('кошелёк: без древа — не две дневные нормы');
  if (EC.walletCap(D, TREE.levels, allFork('kbCarry')) !== EC.attacksDay(D, TREE.levels) * (1 + D.boss.attacks.carryDays + TREE.kinds.kbCarry.cap)) fail('кошелёк: «Запас атак» копит не столько норм');
  // потолки: вид не набирает больше своего потолка, даже если клан берёт его везде; пул, раунды и свита — в пределах правил боя
  for (const [key, v] of Object.entries(TC.most)) { const k = key.split(':')[0]; if (v > TREE.kinds[k].cap) fail(`потолок: «${key}» набирает ${v}, потолок ${TREE.kinds[k].cap}`); }
  for (const k of Object.keys(TREE.kinds)) if (!Object.keys(TC.most).some(x => x.split(':')[0] === k)) fail(`древо: вид «${k}» нигде не предлагается`);
  if (D.boss.pool + TREE.kinds.kbPool.cap > D.boss.poolMax || EC.elitePool(D, TREE.levels, allFork('kbPool')) !== D.boss.poolMax) fail('потолок: пул элит древа — не до потолка круга');
  if (TREE.kinds.kbRetinue.cap >= 100) fail('потолок: свита не может пропасть — у элиты этаж из пяти врагов (слово автора)');
  if (EC.rounds(D, 'e', allFork('kbRound'), TREE.levels) !== D.boss.rounds.e + TREE.kinds.kbRound.cap || EC.rounds(D, 'b', allFork('kbRound'), TREE.levels) !== D.boss.rounds.b) fail('раунды: вилка «Долгий бой» — не только элите или не до потолка');
  // примитивы: каждый вид — готовое поле ядра боя, вид пассивок достижений, семейство Памяти или данные клана
  primChecks(D);
  // вилки действуют в бою клана: прибавки древа ложатся в карты ядра тем же EnClan.battle, что у прототипа
  fxChecks(D);
  // вилки дают прирост: ни одна тактика не делает круг дороже; эталонный выбор на сотом уровне берёт не меньше кругов, чем без древа
  const noisy = (v, b) => v != null && v * D.bp > b * (D.bp + LAWS.forkNoiseBp);   // бой — сценарий на сиде: тактика, которой некому помочь, двигает круг на шум сида
  for (const f of TC.forks) if (noisy(f.c1, TC.base1) || noisy(f.cw, TC.baseW)) fail(`вилка ${f.L}: «${f.n}» делает круг дороже`);
  for (const W of TREE_CALC.boss) {
    const rows = TC.boss.filter(r => r.W === weeks[W.w].W && !r.act), r0 = rows.find(r => r.L === 0), rTop = rows.find(r => r.L === TREE.levels && r.mode === 'ref'), rMiles = rows.find(r => r.L === TREE.levels && r.mode === 'miles');
    const a0 = TC.boss.find(r => r.W === weeks[W.w].W && r.act && r.L === 0), a100 = TC.boss.find(r => r.W === weeks[W.w].W && r.act && r.L === TREE.levels);
    if (!(a100.pts > a0.pts)) fail(`атаки древа: у клана, где играют не все, ${PROF[a0.W.prof]} цикла ${ROMAN[a0.W.c]} — очков не больше (${a0.pts} → ${a100.pts})`);
    if (!(rTop.circles >= rMiles.circles && rMiles.circles >= r0.circles && rTop.pts > r0.pts)) fail(`древо на клановом боссе, ${PROF[r0.W.prof]} цикла ${ROMAN[r0.W.c]}: кругов ${r0.circles} → вехи ${rMiles.circles} → эталон ${rTop.circles}`);
  }
  // ×1,7 (§1.2): уровень древа не продаётся; плательщики получают любой уровень не раньше, чем за 1/1,7 срока обычных
  for (const [n, d] of D.res.ref.p) { const o = D.res.ref.o.find(x => x[0] === n)[1]; if (o && d && o * 100 > d * LAWS.x17) fail(`×1,7: плательщики берут ${n}-й уровень на ${d}-й день, обычные — на ${o}-й`); }
  if (JSON.stringify(T).includes('Энериум') && !T.reset.price) fail('×1,7: у древа цена в Энериуме помимо сброса');
  // наборы врагов — в библиотеке, число способностей — по рангу (ADR-0016)
  const L = EB.lib();
  for (const el of D.lists.els) {
    const Ke = EC.kit(D, 'e', el);
    if (Ke.kit.length !== 2 || Ke.kit.some(x => x.slot !== 'act')) fail(`Голос сонма · ${el}: набор — не две способности без ульты`);
    for (const x of Ke.kit) if (!L[x.id]) fail(`Голос сонма · ${el}: нет в библиотеке «${x.id}»`);
    const K = EC.kit(D, 'b', el);
    if (K.kit.length !== 7 || K.kit.filter(x => x.slot === 'ult').length !== 2) fail(`Хозяин · ${el}: набор — не семь способностей с двумя ультами`);
    for (const x of K.kit) if (!L[x.id]) fail(`Хозяин · ${el}: нет в библиотеке «${x.id}»`);
    const b = EB.create({ mode: 'rounds', seed: 1, heroes: [], foes: [EC.card(D, { g: 'b', uid: 'b', el, k: 1 })] });
    if (EB.kitTable(b.u[1][0]).length !== 7) fail(`Хозяин · ${el}: ядро собрало таблицу шансов не из всех способностей`);
  }
  if ((EB.RULES.resist[D.boss.rank.b.core] || 0) !== 10000) fail('клановый босс: иммунитет к контролю не 100 % (ADR-0010)');
  // раунды — из таблицы ядра, одна таблица на все режимы (решение автора 29.09.2026): элита со свитой — как этаж с элитой, босс — свой тип
  if (D.boss.rounds.e !== EB.roundsOf(BOSS.rounds.e) || D.boss.rounds.b !== EB.roundsOf(BOSS.rounds.b)) fail(`раунды клана не из таблицы ядра: элита ${D.boss.rounds.e}, босс ${D.boss.rounds.b}`);
  hostChecks(D, L);
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
   - tree — 100 уровней: ветка br, место в ветке pos, круг древа circle, вид kind (regular, fork — вилка кланового босса, key — ключ ветки),
     вехи mile [{ k, v }], альтернативы alts { k, p, v, n, d, s, live }; kinds — вид пассивки: примитив prim, действие в бою клана fx,
     потолок cap; caps — потолки; calc.forks, calc.treeBoss, calc.when — вилки поодиночке, древо на клановом боссе, сроки уровней;
   - boss — атаки, пул и победы круга, раунды, круг: сила (12 + уровень) = pow1 × xBp^(k − 1), очки: elite, boss × yBp^(k − 1),
     здоровье hp (% образца), наборы kinds по рангу rank;
     host — сонмы стихий: роли roles (класс, имя роли, вид способности свиты), этажи floors (e — свита Голоса, b — свита Хозяина),
     образцы характеристик tpl и здоровье свиты hp по роли, семь сонмов hosts, фигуры figs «<стихия>-<роль>»: n, look, tip; lore — запись
     сказителя; weeks — Хозяин недели: неделя расы → стихия, цивилизация Эхо, почему (§25.4); art — выгруженные портреты ready (clan/…);
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

module.exports = { calc, render, withTables, markA, markB, FILES, RULES, RES, TREE, BOSS, REWARDS, ART_PICK, artRows, err, warn };

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
