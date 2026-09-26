/* Энериум · бой пять на пять — прототип ядра для UI-кита.
   Правила боя: docs/gdd/05-боевая-система.md; характеристики: docs/gdd/03-герой.md (§3.2);
   цена в атаках и ротация: docs/gdd/04-способности-и-ротация.md.
   Решения автора 26.09.2026 (ADR-0004, ADR-0005): до пяти врагов на этаже, враги — такие же карты,
   как герои, одна библиотека способностей, массовые способности у обеих сторон, агро симметричное.
   Каждая карта действует на своей скорости атаки (RULES.tempoPct растягивает её для экрана),
   поэтому карты ходят не хором и не по очереди сторон. Пока идёт анимация действия (RULES.act),
   та же карта снова не ходит. Бой — сценарий, который сервер считает целиком заранее.
   Биом — испытание на истощение: здоровье и павшие переходят с этажа на этаж. Сид — сам биом.

   Основная модель — «10 раундов» (ADR-0010), режим 'rounds'. Прежняя модель темпа ADR-0007 ('tempo') оставлена для справки:
   - в раунде каждая живая карта ходит один раз, по убыванию скорости; равную скорость решает
     бросок генератора, один на карту в начале боя;
   - в свой ход карта делает один бросок против таблицы шансов: способность, ульта или обычная атака.
     Ни цены в атаках, ни ротации, ни зарядки ульты;
   - длительность эффектов — в ходах носителя, то есть в раундах;
   - после последнего раунда «песок вышел»: этаж не взят, как при пределе времени в основной модели.
   Числа модели — в RULES.rounds и в поле r каждой способности. Режим по умолчанию — 'rounds'.
   Иммунитет к контролю — по рангу карты (RULES.resist, ADR-0010). Рунный страж — пять карт: страж и четыре элиты.
   Добыча этажа считается здесь же (floorLoot): её решает сервер, шанс ресурса — отдельный поток генератора.

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
  cls: {  // thr — классовый множитель угрозы (§5.3), main — характеристика обычной атаки, fx — вид удара на экране, healer — цель правила «лекарь противника»
    'Танк': { thr: 300, main: 'str', fx: 'melee' },
    'Физ. ДД': { thr: 100, main: 'str', fx: 'melee' }, 'Физ. ДД силы': { thr: 100, main: 'str', fx: 'melee' }, 'Физ. ДД ловкости': { thr: 100, main: 'str', fx: 'arrow' },
    'Маг. ДД': { thr: 100, main: 'int', fx: 'magic' },
    'Хилер': { thr: 100, main: 'int', fx: 'magic', healer: true }, 'Лекарь': { thr: 100, main: 'int', fx: 'magic', healer: true },
    'Контроль': { thr: 120, main: 'int', fx: 'magic' }, 'Дебаффер': { thr: 120, main: 'int', fx: 'magic' },
    'Босс': { thr: 150, main: 'str', fx: 'melee' }, 'Страж': { thr: 150, main: 'str', fx: 'melee' },
  },
  threat: { base: 100, dealt: 100, taken: 50, heal: 150, cast: 30, ult: 150, switchPct: 120, decayPct: 97, tauntPct: 130, tauntAdd: 50 },
  resist: { rune: 2500, uber: 5000, forgotten: 7500, clan: 10000 },  // иммунитет к контролю по рангу, б. п. (ADR-0010); рядовой, элита и босс биома — 0
  ultAfter: 3, ultChargeDiv: 2,         // §5.1: три применения, затем зарядка = сумма цен / 2
  shieldCapPct: 100,                    // щит не больше здоровья
  foeLvl: { base: 20, perFloor: 1 },    // уровень карт врага растёт с этажом
  tempoPct: 250,                        // скорость атаки из §3.2, растянутая для экрана: интервал ×2,5
  act: { attack: 900, cast: 1300, mass: 1700, ult: 2400, skip: 600 },  // сколько действие идёт на экране; раньше карта снова не ходит
  floor: { limitMs: { o: 150000, e: 240000, b: 360000 }, gapMs: 2500 }, // предел боя этажа и переход к следующему, мс
  rounds: {                             // модель «10 раундов»
    max: 10,                            // раундов в бою; после последнего — «песок вышел»
    capBp: 6000,                        // сумма шансов способностей карты не выше 60 %: больше — сжимается пропорционально
    act: { attack: 600, cast: 900, mass: 1100, ult: 1600, skip: 400 },   // сколько ход идёт на экране, мс
    gapMs: 700,                         // надпись «Раунд N» между раундами, мс
    foeHpPct: 60,                       // здоровье врагов в этой модели: за 10 раундов каждая карта ходит только 10 раз
  },
  drop: {                               // добыча по рангу убитой карты (§9.1, ADR-0010); золото и дух — до пересчёта экономики
    o: { gold: 20, spirit: 10 },
    e: { gold: 100, spirit: 50, souls: 1, keys: 1 },            // элита: душа и ключ ремесла своего биома
    b: { gold: 500, spirit: 250, souls: 5, uniqueBp: 500 },     // босс биома: шанс уникального ресурса
    rune: { souls: 0 },                                         // рунный страж: руны пределов — отдельно (§11)
    basePerFloorBp: 1000,               // шанс базового ресурса за взятый этаж; артефакты прибавляют свои б. п.
  },
};

/* ================== библиотека способностей ==================
   Каждая способность — набор примитивов: kind (что делает), tgt (правило цели), stat и coef
   (база = характеристика × coef / 100), price (цена в обычных атаках), st/left/pow (эффект).
   school: «класс» — немагический приём класса, иначе стихия школы.
   r — модель «10 раундов»: ch — шанс сработать в ход карты, б. п.; left — длительность эффекта в раундах.
   Описания d — для основной модели «10 раундов»; price и left без r — прежняя модель темпа. */
const LIB = {
  // --- герои: общие приёмы классов
  'Вызов': { school: 'класс', kind: 'taunt', tgt: 'all', price: 3, r: { ch: 2500 }, d: 'Все враги переключаются на стража: угроза выше лучшей на 30%.' },
  'Удар щитом': { school: 'класс', kind: 'dmg', stat: 'str', coef: 160, tgt: 'threat', then: { st: 'stun', left: 2 }, price: 4, r: { ch: 2000, left: 1 }, d: 'Урон силой и оглушение: цель пропускает свой ход.' },
  'Быстрый выпад': { school: 'класс', kind: 'dmg', stat: 'str', coef: 150, tgt: 'threat', price: 2, r: { ch: 3000 }, d: 'Короткий удар силой.' },
  'Разряд': { school: 'класс', kind: 'dmg', stat: 'int', coef: 250, tgt: 'lowest', price: 3, r: { ch: 2500 }, d: 'Урон интеллектом по самому раненому врагу.' },
  'Живая вода': { school: 'класс', kind: 'heal', stat: 'int', coef: 250, tgt: 'ally_lowest', price: 3, r: { ch: 3000 }, d: 'Лечит самого раненого героя.' },
  'Оберег': { school: 'класс', kind: 'shield', stat: 'int', coef: 100, tgt: 'allies', price: 4, r: { ch: 2000 }, d: 'Щит всему отряду, тратится первым.' },
  'Оковы': { school: 'класс', kind: 'ctrl', st: 'stun', left: 2, tgt: 'danger', price: 4, r: { ch: 2000, left: 1 }, d: 'Оглушение на раунд тому врагу, кто ходит раньше всех из ещё не ходивших. У рунных и старших боссов — иммунитет по рангу.' },
  'Ослабление': { school: 'класс', kind: 'debuff', st: 'weak', pow: 2500, left: 5, tgt: 'threat', price: 3, r: { ch: 2500, left: 3 }, d: '−25% урона цели на 3 раунда.' },
  // --- герои: школы стихий
  'Осыпание': { school: 'Земля', kind: 'debuff', st: 'pierce', pow: 3000, left: 4, tgt: 'threat', price: 3, r: { ch: 2500, left: 3 }, d: '−30% физ. защиты цели на 3 раунда: открывает цель ударам силы.' },
  'Горение': { school: 'Огонь', kind: 'dot', stat: 'str', coef: 40, max: 3, left: 5, tgt: 'threat', price: 3, r: { ch: 3000, left: 3 }, d: 'Поджог: урон в каждый ход цели, до 3 стаков на 3 раунда.' },
  'Погребальный костёр': { school: 'Огонь', kind: 'dmg', stat: 'str', coef: 300, per: { kind: 'dot', school: 'Огонь', pct: 25 }, tgt: 'threat', price: 5, r: { ch: 1500 }, d: 'Мощный удар: +25% за каждый стак горения на цели.' },
  'Остановка': { school: 'Время', kind: 'ctrl', st: 'stop', left: 2, tgt: 'danger', price: 4, r: { ch: 2000, left: 2 }, d: 'Цель ходит последней в раунде два раунда подряд.' },
  'Сияние': { school: 'Свет', kind: 'hot', stat: 'int', coef: 35, max: 3, left: 5, over: true, tgt: 'ally_lowest', price: 3, r: { ch: 2500, left: 3 }, d: 'Лечит цель в каждый её ход 3 раунда; лишнее становится щитом.' },
  'Увядание': { school: 'Тьма', kind: 'dot', stat: 'int', coef: 40, max: 3, left: 5, drain: 1000, tgt: 'threat', price: 3, r: { ch: 2500, left: 3 }, d: 'Урон в каждый ход цели 3 раунда; 10% урона лечат наложившего.' },
  // --- ульты героев
  'Долгая ночь': { school: 'Тьма', kind: 'ctrl', st: 'silence', left: 3, tgt: 'all', ult: true, r: { ch: 800, left: 2 }, d: 'Безмолвие всем врагам на 2 раунда: только обычная атака. У рунных и старших боссов — иммунитет по рангу.' },
  'Испепеление': { school: 'Время', kind: 'dmg', stat: 'int', coef: 400, tgt: 'threat', ult: true, r: { ch: 800 }, d: 'Крупный урон одной цели.' },
  // --- враги Мастерской форм: та же библиотека
  'Каменный осколок': { school: 'Земля', kind: 'dmg', stat: 'str', coef: 150, tgt: 'threat', price: 2, r: { ch: 3000 }, d: 'Быстрый удар.' },
  'Длинная рука': { school: 'класс', kind: 'dmg', stat: 'str', coef: 170, tgt: 'lowest', price: 3, r: { ch: 2500 }, d: 'Дотягивается до самого раненого.' },
  'Порыв': { school: 'Воздух', kind: 'dmg', stat: 'int', coef: 60, tgt: 'all', price: 4, r: { ch: 2000 }, d: 'Массовый удар ветром по всему отряду.' },
  'Напор': { school: 'класс', kind: 'taunt', tgt: 'all', price: 4, r: { ch: 2000 }, d: 'Все герои переключаются на него.' },
  'Замазка': { school: 'Земля', kind: 'heal', stat: 'int', coef: 220, tgt: 'ally_lowest', price: 3, r: { ch: 2500 }, d: 'Лечит самого раненого из своих.' },
  'Удар в спину': { school: 'класс', kind: 'dmg', stat: 'str', coef: 190, tgt: 'healer', price: 2, r: { ch: 3000 }, d: 'Сразу идёт к лекарю отряда.' },
  'Замес': { school: 'Земля', kind: 'dmg', stat: 'str', coef: 240, tgt: 'threat', price: 3, r: { ch: 2500 }, d: 'Тяжёлый удар.' },
  'Тяжёлая рука': { school: 'класс', kind: 'debuff', st: 'weak', pow: 2000, left: 4, tgt: 'threat', price: 4, r: { ch: 2000, left: 2 }, d: '−20% урона цели на 2 раунда.' },
  'Подрез': { school: 'Воздух', kind: 'dot', stat: 'str', coef: 30, max: 4, left: 4, tgt: 'lowest', price: 3, r: { ch: 2500, left: 3 }, d: 'Порезы по самому раненому, до 4 стаков.' },
  'Снять лишнее': { school: 'класс', kind: 'dmg', stat: 'str', coef: 220, tgt: 'lowest', price: 3, r: { ch: 2500 }, d: 'Добивает самого раненого.' },
  'Плита': { school: 'Земля', kind: 'shield', stat: 'str', coef: 150, tgt: 'allies', price: 4, r: { ch: 2000 }, d: 'Щит всем своим.' },
  'Меха': { school: 'Воздух', kind: 'dmg', stat: 'int', coef: 80, tgt: 'all', price: 3, r: { ch: 2500 }, d: 'Порыв по всему отряду.' },
  'Сквозняк': { school: 'Воздух', kind: 'ctrl', st: 'stop', left: 2, tgt: 'danger', price: 4, r: { ch: 2000, left: 1 }, d: 'Самый готовый герой ходит последним в раунде.' },
  'Заплата': { school: 'Земля', kind: 'heal', stat: 'int', coef: 240, tgt: 'ally_lowest', price: 2, r: { ch: 3000 }, d: 'Быстро латает самого раненого.' },
  'Шов': { school: 'Земля', kind: 'heal', stat: 'int', coef: 120, tgt: 'allies', price: 4, r: { ch: 2000 }, d: 'Лечит всех своих.' },
  'Съём': { school: 'класс', kind: 'debuff', st: 'mark', pow: 2000, left: 5, tgt: 'threat', price: 3, r: { ch: 2500, left: 3 }, d: 'Метка: цель получает +20% урона 3 раунда.' },
  'Снять форму': { school: 'класс', kind: 'dispel', then: { st: 'weak', pow: 2500, left: 4 }, tgt: 'lowest', price: 3, r: { ch: 2500, left: 2 }, d: 'Снимает щит и лечение, затем ослабляет.' },
  'Правка': { school: 'Земля', kind: 'dmg', stat: 'str', coef: 260, tgt: 'threat', price: 2, r: { ch: 3000 }, d: 'Удар по тому, кто мешает.' },
  'Глиняный вал': { school: 'Земля', kind: 'dmg', stat: 'str', coef: 90, tgt: 'all', price: 3, r: { ch: 2500 }, d: 'Массовый удар по отряду.' },
  'Последний штрих': { school: 'Земля', kind: 'dmg', stat: 'str', coef: 220, tgt: 'all', ult: true, r: { ch: 1500 }, d: 'Ульта: тяжёлый удар по всему отряду.' },
  // --- рунный страж Мастерской
  'Резец Мастера': { school: 'класс', kind: 'dmg', stat: 'str', coef: 280, tgt: 'threat', price: 3, r: { ch: 3000 }, d: 'Точный удар резцом из светящегося камня.' },
  'Остановись': { school: 'класс', kind: 'ctrl', st: 'stun', left: 2, tgt: 'danger', price: 4, r: { ch: 2000, left: 1 }, d: 'Ладонь вперёд: самый готовый к ходу пропускает его.' },
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
   rank — ранг карты: o рядовой, e элита, b босс биома, rune рунный страж (ADR-0010).
   st — Сила, Интеллект, Ловкость, Выносливость, Скорость; hpPct — множитель здоровья карты.
   Уклонение = Ловкость / 400 (§3.2): заметно уклоняются только ловкие — Долгорукий, Однорукий, Резчик. */
const FOES = {
  o1: { rank: 'o', name: 'Безликий образец', cls: 'Физ. ДД силы', el: 'Земля', st: [104, 20, 20, 110, 60], hpPct: 125, abs: ['Каменный осколок'] },
  o2: { rank: 'o', name: 'Долгорукий образец', cls: 'Физ. ДД ловкости', el: 'Земля', st: [77, 20, 60, 90, 70], hpPct: 125, abs: ['Длинная рука'] },
  o3: { rank: 'o', name: 'Пустотелый образец', cls: 'Маг. ДД', el: 'Воздух', st: [20, 108, 20, 90, 70], hpPct: 125, abs: ['Порыв'] },
  o4: { rank: 'o', name: 'Безголовый образец', cls: 'Танк', el: 'Земля', st: [72, 20, 15, 240, 50], hpPct: 125, abs: ['Напор'] },
  o5: { rank: 'o', name: 'Сырой образец', cls: 'Лекарь', el: 'Земля', st: [20, 104, 20, 140, 60], hpPct: 125, abs: ['Замазка'] },
  o6: { rank: 'o', name: 'Однорукий образец', cls: 'Дебаффер', el: 'Земля', st: [93, 31, 70, 80, 130], hpPct: 125, main: 'str', fx: 'melee', abs: ['Удар в спину'] },
  e1: { rank: 'e', name: 'Подмастерье', cls: 'Физ. ДД силы', el: 'Земля', st: [135, 25, 30, 180, 60], hpPct: 350, abs: ['Замес', 'Тяжёлая рука'] },
  e2: { rank: 'e', name: 'Резчик', cls: 'Физ. ДД ловкости', el: 'Земля', st: [104, 25, 80, 150, 80], hpPct: 350, abs: ['Подрез', 'Снять лишнее'] },
  e3: { rank: 'e', name: 'Упор', cls: 'Танк', el: 'Земля', st: [83, 25, 20, 280, 50], hpPct: 400, abs: ['Напор', 'Плита'] },
  e4: { rank: 'e', name: 'Мех', cls: 'Маг. ДД', el: 'Воздух', st: [25, 135, 30, 150, 70], hpPct: 325, abs: ['Меха', 'Сквозняк'] },
  e5: { rank: 'e', name: 'Штопарь', cls: 'Лекарь', el: 'Земля', st: [25, 124, 20, 180, 60], hpPct: 325, abs: ['Заплата', 'Шов'] },
  e6: { rank: 'e', name: 'Съёмщик', cls: 'Дебаффер', el: 'Земля', st: [31, 119, 40, 160, 70], hpPct: 350, abs: ['Съём', 'Снять форму'] },
  b1: { rank: 'b', name: 'Первый набросок', cls: 'Босс', el: 'Земля', st: [156, 52, 30, 300, 60], hpPct: 1500, abs: ['Правка', 'Глиняный вал'], ult: 'Последний штрих', pas: ['Незавершённость'] },
  g1: { rank: 'rune', name: 'Мастер', cls: 'Страж', el: 'Земля', st: [150, 60, 60, 320, 70], hpPct: 1800, abs: ['Резец Мастера', 'Остановись'] },
};

/* ================== колоды этажей ==================
   g: o — рядовые, e — элита с сопровождением, b — босс с сопровождением. Первым идёт лидер. */
const FLOORS = [
  { g: 'o', m: ['o1'] }, { g: 'o', m: ['o1'] }, { g: 'o', m: ['o2'] }, { g: 'o', m: ['o1', 'o1'] },
  { g: 'e', m: ['e1'] },
  { g: 'o', m: ['o1', 'o2'] }, { g: 'o', m: ['o1', 'o3'] }, { g: 'o', m: ['o4', 'o1'] }, { g: 'o', m: ['o2', 'o3'] },
  { g: 'e', m: ['e2', 'o2'] },
  { g: 'o', m: ['o4', 'o2', 'o3'] }, { g: 'o', m: ['o1', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o1', 'o2'] }, { g: 'o', m: ['o3', 'o3', 'o5'] },
  { g: 'e', m: ['e5', 'o4', 'o1'] },
  { g: 'o', m: ['o4', 'o2', 'o5'] }, { g: 'o', m: ['o6', 'o1', 'o3'] }, { g: 'o', m: ['o4', 'o6', 'o5'] }, { g: 'o', m: ['o2', 'o3', 'o3', 'o5'] },
  { g: 'e', m: ['e3', 'o5', 'o2'] },
  { g: 'o', m: ['o4', 'o2', 'o3', 'o5'] }, { g: 'o', m: ['o6', 'o3', 'o5', 'o4'] }, { g: 'o', m: ['o4', 'o6', 'o2', 'o3'] }, { g: 'o', m: ['o4', 'o3', 'o3', 'o5'] },
  { g: 'e', m: ['e4', 'o3', 'o5', 'o4'] },
  { g: 'o', m: ['o4', 'o6', 'o3', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o2', 'o2', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o4', 'o3', 'o6', 'o5'] }, { g: 'o', m: ['o6', 'o6', 'o3', 'o3', 'o5'] },
  { g: 'e', m: ['e6', 'o4', 'o5', 'o6', 'o3'] },
  { g: 'o', m: ['o4', 'o6', 'o3', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o2', 'o6', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o4', 'o6', 'o3', 'o5'] }, { g: 'o', m: ['o4', 'o6', 'o3', 'o5', 'o2'] },
  { g: 'b', m: ['b1', 'o4', 'o5', 'o3', 'o6'] },
];

/* ================== генератор ================== */
function mix32(x) { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; }
function seedOf(str) { let h = 0x811C9DC5; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0; return mix32(h); }  // FNV-1a
function floorSeed(biomeSeed, floor) { return mix32((biomeSeed ^ Math.imul(floor, 0x9E3779B1)) >>> 0); }

/* ================== биомы ==================
   Сид — сам биом: один и тот же биом с тем же отрядом всегда даёт тот же сценарий. */
const BIOMES = {
  b1: { name: 'Мастерская форм', seed: seedOf('Мастерская форм'), floors: FLOORS,
    // рунный страж — пять карт (ADR-0010): Мастер ждёт и отвечает; Упор держит, Штопарь латает, Резчик добивает слабых, Съёмщик снимает силу
    guard: { g: 'r', m: ['g1', 'e3', 'e5', 'e2', 'e6'] } },
};
function makeRng(seed) {  // mulberry32: целые 32 бита; roll(n) — целое от 0 до n − 1
  let a = seed >>> 0;
  return n => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) % n; };
}

/* ================== карты ================== */
const fl = (a, b) => Math.floor(a / b);
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const thrMul = u => (RULES.cls[u.cls] || { thr: 100 }).thr;
const mainStat = u => u.main;
const fxOf = (u, stat) => stat === 'int' ? 'magic' : u.fx === 'magic' ? 'melee' : u.fx;   // вид удара на экране
const isHealer = u => !!(RULES.cls[u.cls] && RULES.cls[u.cls].healer);
const pct = u => fl(u.hp * 10000, u.maxHp);

function mkUnit(src, side, i) {
  const s = RULES.stat, L = s.lvlDiv + src.lvl;
  const [str, int, agi, sta, spd] = src.st;
  const maxHp = fl(s.hp * (100 + sta) * L * (src.hpPct || 100), 100 * s.lvlDiv * 100);
  const as = clamp(RULES.caps.asMin + spd, RULES.caps.asMin, RULES.caps.asMax);
  const C = RULES.cls[src.cls] || { main: 'str', fx: 'melee' };
  const u = {
    key: src.key, id: src.id, name: src.name, side, i, cls: src.cls, el: src.el, lvl: src.lvl, lead: !!src.lead, rank: src.rank || null,
    main: src.main || C.main, fx: src.fx || C.fx,
    maxHp, hp: src.dead ? 0 : src.hp != null ? clamp(src.hp, 1, maxHp) : maxHp, sh: 0,
    atk: { str: fl(s.atk * (100 + str) * L, 100 * s.lvlDiv), int: fl(s.atk * (100 + int) * L, 100 * s.lvlDiv) },
    def: { str: fl(s.def * str * L, s.lvlDiv), int: fl(s.def * int * L, s.lvlDiv) },
    eva: Math.min(RULES.caps.evaBp, fl(agi * 10000, s.evaDiv)),
    crit: Math.min(RULES.caps.critBp, fl(agi * 10000, s.critDiv)),
    critDmg: RULES.critDmgPct,
    as, ivl: fl(100000 * RULES.tempoPct, as * 100),
    abs: (src.abs || []).map(n => LIB[n] && Object.assign({ n }, LIB[n])).filter(Boolean),
    ult: src.ult && LIB[src.ult] ? Object.assign({ n: src.ult }, LIB[src.ult]) : null,
    pas: (src.pas || []).map(n => PAS[n]).filter(Boolean),
    ptr: 0, cnt: 0, uses: 0, spent: 0, phase: 'rot', charge: 0, chargeMax: 0, nAbil: 0,
    st: [], th: [], cur: -1, alive: !src.dead, next: 0, lowUsed: false,
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
    hpPct: f.hpPct, main: f.main, fx: f.fx, abs: f.abs, ult: f.ult, pas: f.pas, rank: f.rank, lead, hp };
}
function floorFoes(biome, floor, siegeHp) {
  const F = BIOMES[biome].floors[floor - 1];
  return F.m.map((id, k) => foeSrc(id, floor, k, F.g !== 'o' && k === 0, F.g === 'b' && k === 0 ? siegeHp : null));
}

/* ================== бой ================== */
function create(o) {
  const mode = o.mode === 'tempo' ? 'tempo' : 'rounds';   // основная модель — «10 раундов» (ADR-0010)
  const b = { mode, t: 0, limit: mode === 'rounds' ? Infinity : o.limitMs, rng: makeRng(o.seed), seed: o.seed, u: [[], []], over: false, win: false, why: '', ev: [],
    round: 0, queue: [] };
  // порядок героев в отряде на бой не влияет: иначе перестановка отряда перебрасывала бы случайность
  o.heroes.slice().sort((x, y) => x.key < y.key ? -1 : x.key > y.key ? 1 : 0).forEach((s, i) => b.u[0].push(mkUnit(s, 0, i)));
  const foeSrc = mode === 'rounds' ? s => Object.assign({}, s, { hpPct: fl((s.hpPct || 100) * RULES.rounds.foeHpPct, 100) }) : s => s;
  o.foes.forEach((s, i) => b.u[1].push(mkUnit(foeSrc(s), 1, i)));
  for (const side of [0, 1]) for (const u of b.u[side]) u.th = b.u[1 - side].map(v => fl(RULES.threat.base * thrMul(v), 100));
  if (mode === 'rounds') for (const side of [0, 1]) for (const u of b.u[side]) { u.tie = b.rng(10000); u.table = chanceTable(u); u.acted = false; }  // порядок: герои, затем враги
  else for (const side of [0, 1]) for (const u of b.u[side]) u.next = b.rng(u.ivl);   // порядок: герои, затем враги
  return b;
}
/* Таблица шансов карты для модели «10 раундов»: способности по порядку, затем ульта.
   Длительности эффектов заменены раундовыми (r.left). Если сумма шансов выше RULES.rounds.capBp,
   шансы сжимаются пропорционально — иначе карта с тремя способностями почти не била бы обычной атакой. */
function chanceTable(u) {
  const list = u.abs.concat(u.ult ? [u.ult] : []).filter(ab => ab.r && ab.r.ch > 0);
  const sum = list.reduce((a, ab) => a + ab.r.ch, 0), cap = RULES.rounds.capBp;
  return list.map(ab => {
    const left = ab.r.left != null ? ab.r.left : ab.left;
    return Object.assign({}, ab, { ch: sum > cap ? fl(ab.r.ch * cap, sum) : ab.r.ch, left,
      then: ab.then ? Object.assign({}, ab.then, { left: ab.r.left != null ? ab.r.left : ab.then.left }) : undefined });
  });
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
/* Одно действие одной карты. Действует та, чья очередь по её собственной скорости атаки;
   следующий её ход — не раньше, чем кончится анимация этого (RULES.act).
   Возвращает запись действия: когда началось, сколько длится, кто действует, что и какие события. */
function step(b) {
  if (b.over) return null;
  if (b.mode === 'rounds') return stepRound(b);
  const u = nextActor(b);
  if (!u || u.next > b.limit) { b.t = b.limit; finish(b, false, 'time'); return { at: b.t, dur: 0, kind: 'end', ev: b.ev.splice(0) }; }
  b.t = u.next;
  const at = b.t;
  const a = act(b, u);
  const dur = RULES.act[a.kind];
  u.next = Math.max(at + u.ivl, at + dur);
  const a0 = b.u[0].some(v => v.alive), a1 = b.u[1].some(v => v.alive);
  if (!a1) finish(b, true, 'win'); else if (!a0) finish(b, false, 'wipe');
  return { at, dur, s: u, kind: a.kind, ab: a.ab || null, fx: a.fx || null, school: a.school || null, ev: b.ev.splice(0) };
}
function finish(b, win, why) { b.over = true; b.win = win; b.why = why; emit(b, { k: 'end', win, why }); }
function run(b) { while (!b.over) step(b); return b; }
function nextAt(b) {
  if (b.mode === 'rounds') return b.t;   // ходы идут подряд: следующий начинается, когда кончился предыдущий
  const u = nextActor(b); return u && u.next <= b.limit ? u.next : b.limit + 1;
}

/* ---------- модель «10 раундов» ---------- */
/* Очередь раунда: по убыванию скорости, равную решает бросок начала боя. Под «Остановкой» — в конец. */
function order(b) {
  const all = [];
  for (const side of [0, 1]) for (const u of b.u[side]) if (u.alive) all.push(u);
  const late = u => has(u, 'stop') ? 1 : 0;
  return all.sort((x, y) => late(x) - late(y) || y.as - x.as || y.tie - x.tie || x.side - y.side || x.i - y.i);
}
/* Один шаг: начало раунда или ход одной карты. Возвращает запись действия, как step в основной модели,
   плюс номер раунда, бросок и шанс сработавшей способности. */
function stepRound(b) {
  let u = null;
  while (!u) {
    if (!b.queue.length) {
      if (b.round >= RULES.rounds.max) { finish(b, false, 'sand'); return { at: b.t, dur: 0, kind: 'end', round: b.round, ev: b.ev.splice(0) }; }
      b.round++;
      for (const side of [0, 1]) for (const v of b.u[side]) v.acted = false;
      b.queue = order(b);
      emit(b, { k: 'round', n: b.round });
      const at = b.t, dur = RULES.rounds.gapMs; b.t += dur;
      return { at, dur, kind: 'round', round: b.round, order: b.queue.slice(), ev: b.ev.splice(0) };
    }
    const next = b.queue.shift();
    if (next.alive) u = next;
  }
  const at = b.t;
  const a = actRound(b, u);
  u.acted = true;
  const dur = RULES.rounds.act[a.kind];
  b.t = at + dur;
  const a0 = b.u[0].some(v => v.alive), a1 = b.u[1].some(v => v.alive);
  if (!a1) finish(b, true, 'win'); else if (!a0) finish(b, false, 'wipe');
  return { at, dur, s: u, kind: a.kind, ab: a.ab || null, fx: a.fx || null, school: a.school || null, round: b.round, roll: a.roll, ch: a.ch || 0, ev: b.ev.splice(0) };
}
function actRound(b, u) {
  tickPeriodic(b, u); if (!u.alive) return { kind: 'skip' };
  const stun = has(u, 'stun');
  if (stun) { stun.left--; if (stun.left <= 0) rmSt(u, stun); emit(b, { k: 'skip', s: u }); endTurn(u); return { kind: 'skip' }; }
  const roll = b.rng(10000);   // один бросок на ход, даже под безмолвием: порядок обращений к генератору не зависит от эффектов
  let ab = null;
  if (!has(u, 'silence')) { let sum = 0; for (const x of u.table) { sum += x.ch; if (roll < sum) { ab = x; break; } } }
  let out;
  if (ab) { cast(b, u, ab, !!ab.ult); out = { kind: ab.ult ? 'ult' : ab.tgt === 'all' || ab.tgt === 'allies' ? 'mass' : 'cast', ab, fx: abFx(u, ab), school: ab.school, roll, ch: ab.ch }; }
  else { attack(b, u); out = { kind: 'attack', fx: fxOf(u, u.main), roll }; }
  endTurn(u);
  return out;
}
/* Длительности считают ходы носителя: в модели раундов это и есть раунды. */
function endTurn(u) {
  for (const s of u.st.slice()) if (s.k === 'weak' || s.k === 'mark' || s.k === 'pierce' || s.k === 'silence' || s.k === 'stop') { s.left--; if (s.left <= 0) rmSt(u, s); }
  decay(u);
}
/* «Самый готовый» в модели раундов — кто ходит раньше всех из ещё не ходивших; если все сходили — самый быстрый. */
function readyRound(b, v) {
  if (!v.alive) return -1;
  const q = b.queue.indexOf(v);
  return q >= 0 ? 20000 - q : 10000 + v.as;
}

function act(b, u) {
  tickPeriodic(b, u); if (!u.alive) return { kind: 'skip' };
  const stun = has(u, 'stun');
  if (stun) { stun.left--; if (stun.left <= 0) rmSt(u, stun); emit(b, { k: 'skip', s: u }); decay(u); return { kind: 'skip' }; }
  const silenced = !!has(u, 'silence'), stopped = !!has(u, 'stop');
  let out;
  if (u.phase === 'ult' && u.ult && !silenced) { cast(b, u, u.ult, true); u.phase = 'rot'; u.uses = 0; out = { kind: 'ult', ab: u.ult, fx: abFx(u, u.ult), school: u.ult.school }; }
  else if (u.phase === 'rot' && u.abs.length && u.cnt >= u.abs[u.ptr].price && !silenced) {
    const ab = u.abs[u.ptr]; cast(b, u, ab, false);
    u.cnt = 0; u.ptr = (u.ptr + 1) % u.abs.length; u.uses++; u.spent += ab.price;
    if (u.ult && u.uses >= RULES.ultAfter) { u.phase = 'charge'; u.charge = fl(u.spent, RULES.ultChargeDiv); u.chargeMax = u.charge; u.spent = 0; if (u.charge <= 0) u.phase = 'ult'; }
    out = { kind: ab.tgt === 'all' || ab.tgt === 'allies' ? 'mass' : 'cast', ab, fx: abFx(u, ab), school: ab.school };
  } else {
    attack(b, u);
    if (!stopped) { if (u.phase === 'charge') { u.charge--; if (u.charge <= 0) u.phase = 'ult'; } else if (u.phase === 'rot') u.cnt++; }
    out = { kind: 'attack', fx: fxOf(u, u.main) };
  }
  for (const s of u.st.slice()) if (s.k === 'weak' || s.k === 'mark' || s.k === 'pierce' || s.k === 'silence' || s.k === 'stop') { s.left--; if (s.left <= 0) rmSt(u, s); }
  decay(u);
  return out;
}
const abFx = (u, ab) => ab.fx || (ab.stat ? fxOf(u, ab.stat) : 'magic');
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
    case 'danger': { const rd = b.mode === 'rounds' ? v => readyRound(b, v) : ready, d = maxBy(foes, rd); if (d && rd(d) > 0) return [d]; break; }
  }
  const t = byThreat(b, u); return t ? [t] : [];
}

/* ---------- действия ---------- */
function attack(b, u) {
  const t = pick(b, u, 'threat')[0]; if (!t) return;
  emit(b, { k: 'swing', s: u, t, fx: fxOf(u, u.main) });
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
  const imm = isCtrl && t.rank ? RULES.resist[t.rank] || 0 : 0;   // иммунитет к контролю по рангу; дебафы — не контроль
  if (imm > 0 && b.rng(10000) < imm) { emit(b, { k: 'resist', s: src, t, st: s.st }); return; }
  const dl = src.side !== t.side ? src.pas.find(p => p.kind === 'debuffLeft') : null;
  const left = s.left + (dl ? dl.add : 0);
  const ex = has(t, s.st);                       // одинаковые обновляют длительность, разные стакаются (§5.4)
  if (ex) { ex.left = Math.max(ex.left, left); ex.left0 = Math.max(ex.left, ex.left0); ex.pow = Math.max(ex.pow, s.pow || 0); }
  else t.st.push({ k: s.st, left, left0: left, pow: s.pow || 0 });
  if (s.st === 'stop') {
    if (b.mode === 'rounds') { const q = b.queue.indexOf(t); if (q >= 0) { b.queue.splice(q, 1); b.queue.push(t); } }   // ходит последней в раунде
    else { t.cnt = 0; if (t.phase === 'charge') t.charge = t.chargeMax; }
  }
  emit(b, { k: 'status', s: src, t, st: s.st, left });
}
function addPeriodic(b, src, t, ab) {
  if (!t.alive) return;
  let per = fl(src.atk[ab.stat] * ab.coef, 100);
  if (ab.kind === 'dot') per = fl(per * elemMul(src.el, t.el), 100);
  const p = t.st.find(s => s.k === ab.kind && s.school === ab.school);
  if (p) { p.stacks = Math.min(ab.max, p.stacks + 1); p.left = ab.left; p.left0 = ab.left; if (per > p.per) p.per = per; p.src = src; }
  else t.st.push({ k: ab.kind, school: ab.school, per, stacks: 1, max: ab.max, left: ab.left, left0: ab.left, src, drain: ab.drain || 0, over: !!ab.over });
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

/* ================== забег ==================
   Этажи идут подряд, здоровье и павшие переходят дальше: биом — испытание на истощение.
   Щиты, эффекты и зарядка способностей обнуляются между этажами. mode — 'tempo' (ADR-0007) или 'rounds'. */
function floorBattle(heroes, biome, floor, siegeHp, mode) {
  const B = BIOMES[biome], g = B.floors[floor - 1].g;
  return create({ heroes, foes: floorFoes(biome, floor, siegeHp), seed: floorSeed(B.seed, floor), limitMs: RULES.floor.limitMs[g], mode });
}
/* Рунный страж — отдельный бой из пяти карт после биома (§8.6, §11, ADR-0010) */
function guardBattle(heroes, biome, mode) {
  const B = BIOMES[biome], G = B.guard, lvl = B.floors.length + 1;
  const foes = G.m.map((id, k) => foeSrc(id, lvl, k, k === 0, null));
  return create({ heroes, foes, seed: floorSeed(B.seed, lvl), limitMs: RULES.floor.limitMs.b, mode });
}
/* Добыча этажа по рангам убитых карт. Шансы — свой поток генератора от сида этажа,
   чтобы бросок добычи не сдвигал случайность боя. bonusBp — прибавка к шансу ресурса от артефактов. */
function floorLoot(biome, floor, b, bonusBp) {
  const D = RULES.drop, L = { gold: 0, spirit: 0, souls: 0, keys: 0, base: 0, unique: 0 };
  for (const u of b.u[1]) if (!u.alive) {
    const d = D[u.rank] || {};
    L.gold += d.gold || 0; L.spirit += d.spirit || 0; L.souls += d.souls || 0; L.keys += d.keys || 0;
  }
  const rng = makeRng(mix32((floorSeed(BIOMES[biome].seed, floor) ^ 0x4C4F4F54) >>> 0));   // 'LOOT'
  if (b.win && rng(10000) < D.basePerFloorBp + (bonusBp || 0)) L.base = 1;
  const boss = b.u[1].find(u => u.rank === 'b');
  if (boss && !boss.alive && rng(10000) < D.b.uniqueBp) L.unique = 1;
  return L;
}
function carry(heroes, b) {
  return heroes.map(h => { const u = b.u[0].find(v => v.key === h.key); return Object.assign({}, h, { hp: u.hp, dead: !u.alive }); });
}
function simRun(heroes, biome, siegeHp, mode) {
  const B = BIOMES[biome], floors = []; let runMs = 0, bossHp = siegeHp, cur = heroes.map(h => Object.assign({}, h));
  for (let f = 1; f <= B.floors.length; f++) {
    const b = run(floorBattle(cur, biome, f, bossHp, mode));
    runMs += b.t + (f < B.floors.length ? RULES.floor.gapMs : 0);
    const boss = B.floors[f - 1].g === 'b' ? b.u[1][0] : null;
    if (boss) bossHp = boss.alive ? boss.hp : 0;
    cur = carry(cur, b);
    const hp = b.u[0].reduce((a, u) => a + u.hp, 0), max = b.u[0].reduce((a, u) => a + u.maxHp, 0);
    floors.push({ floor: f, win: b.win, why: b.why, ms: b.t, rounds: b.round, alive: b.u[0].filter(v => v.alive).length, pct: fl(hp * 100, max), bossHp: boss ? boss.hp : null, bossMax: boss ? boss.maxHp : null });
    if (!b.win) break;
  }
  return { floors, runMs, bossHp };
}

root.EnBattle = { RULES, LIB, PAS, FOES, FLOORS, BIOMES, seedOf, floorSeed, makeRng, create, step, nextAt, run, heroSrc, floorFoes, floorBattle, carry, simRun, guardBattle, floorLoot, elemMul, ready, readyRound, order, chanceTable, pct, fxOf };
})(typeof window !== 'undefined' ? window : globalThis);
