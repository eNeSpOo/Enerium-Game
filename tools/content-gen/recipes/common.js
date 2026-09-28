/* Общие справочники и параметры добычи. Все числа — демонстрация, под прогоны. Шансы — в базисных пунктах (10 000 = 100 %).
   Источники: GDD §9, §11–§13, §17–§19, §23; ADR-0010 (ключ и душа с элиты, базовый за этаж по шансу), ADR-0011 (души растут с биомом),
   ADR-0014 (дух и золото × цикл, биом 2 — ещё +0,5 цикла), ADR-0018 (цикл I — обучение), ADR-0019 (герои из скрытых рецептов). */
const SPECS = {
  alch: { n: 'Алхимия', icon: 'drop' },
  ench: { n: 'Зачарование', icon: 'spark' },
  eng: { n: 'Инженерия', icon: 'gear' },
  tail: { n: 'Портняжное дело', icon: 'cut' },
  hunt: { n: 'Охота', icon: 'target' },
  smith: { n: 'Кузнечество', icon: 'flame' },
};
const SPEC_ORDER = ['alch', 'ench', 'eng', 'tail', 'hunt', 'smith'];
/* Ярусы. drop — падает, а не создаётся; res — ресурс ремесла: к нему относится правило §9.2 «не больше двух одного ремесла». */
const TIERS = {
  basic: { n: 'Базовый ресурс', r: 1, drop: true, res: true },
  key: { n: 'Ключ ремесла', r: 2, drop: true, res: true },
  unique: { n: 'Уникальный ресурс босса', r: 4, drop: true },
  craftres: { n: 'Ресурс крафтового биома', r: 2, drop: true, res: true },
  find: { n: 'Находка крафтового биома', r: 3, drop: true },
  trophy: { n: 'Трофей крафтового босса', r: 5, drop: true },
  part: { n: 'Заготовка', r: 2 },
  made: { n: 'Изделие', r: 3 },
  act: { n: 'Активация крафтового биома', r: 3 },
  call: { n: 'Призыв крафтового босса', r: 4 },
  hero: { n: 'Герой из скрытого рецепта', r: 3 },
  product: { n: 'Награда мастерской', r: 4 },
  rune: { n: 'Руна предела', r: 2 },
  vshard: { n: 'Осколок доблести', r: 3, drop: true },
  valor: { n: 'Руна доблести', r: 4 },
  echo: { n: 'Добыча Эхо', r: 4, drop: true },
};
const RARITY = { 'обычная': 1, 'редкая': 2, 'уникальная': 3, 'эпическая': 4, 'древняя': 5, 'первородная': 6, 'вневременная': 7 };
/* Добыча врагов биома. Дух — ADR-0014: рядовой 10, элита 50, босс 250, рунный страж 500 за победу; × цикл, во втором биоме цикла — × (цикл + 0,5).
   Золото — половина духа, округление вниз. Души — ADR-0011: элита — номер биома, босс — 5 × номер биома.
   Базовый ресурс — один за взятый этаж с шансом basePerFloorBp (ADR-0010); в цикле I — предложение 5 000 б. п.: обучение крафту без лавки и рынка.
   Уникальный — 5 % с босса (§9.1). Рунический ключ — элита 5 %, босс 10 %; за срабатывание столько ключей, какой цикл (§11). */
const ENEMY = {
  spirit: { ordinary: 10, elite: 50, boss: 250, guard: 500 },
  soulsElitePerBiome: 1, soulsBossPerBiome: 5,
  basePerFloorBp: 1000, basePerFloorBpByCycle: [5000, 1000, 1000, 1000, 1000, 1000],
  uniqueBp: 500, eliteRuneKeyBp: 500, bossRuneKeyBp: 1000, eliteRuneKeyBpMax: 1000, bossRuneKeyBpMax: 2500,
};
/* Колоды для оценок «за забег». Мастерская форм — обучающая колода прототипа (ADR-0018): 15 этажей, элиты Подмастерье (5-й) и Резчик (10-й).
   Второй биом цикла I в прототипе ещё не собран — предложение: 25 этажей и все шесть элит. Цикл II и дальше — образец ADR-0011: 35 этажей, 12 элит. */
const DECKS = { tutorial: { floors: 15, elites: 2 }, cycle1b: { floors: 25, elites: 6 }, sample: { floors: 35, elites: 12 } };
const GUARD = {
  limits: { runesPerKill: 2, weightsBp: [4000, 2700, 1800, 1000, 500] },
  valor: { shardsBp: [[1, 5000], [2, 2500], [3, 1250], [5, 725], [10, 300]], undefinedBp: 225, shardsPerRune: 100 },
  dailyCap: 10,   // общий дневной кап побед над рунными боссами (ADR-0022)
};
/* Перековка рун предела: три младшие + ключ ремесла. Ключи по ступеням: зачарование A, кузнечество A, алхимия B, зачарование B (A — мастерская, B — творение). */
const RUNE_KEYS = [null, null, ['ench', 0], ['smith', 0], ['alch', 1], ['ench', 1]];
const RITUALS = {
  workers: { minutes: [30, 60, 120, 180, 240, 300, 360], basics: [6, 12, 24, 36, 48, 60, 72], keys: [0, 0, 0, 1, 1, 2, 3],
    unique: { chanceBp: 100, minutes: 360, crew: 5, uniques: 1 } },
  heroes: { minutes: [60, 120, 240, 360, 480, 600, 720], perHour: { gold: 150, spirit: 75, souls: 1 } },
};
const CONTRACTS = {
  taskPoints: [10, 20, 40, 80, 160, 320, 640],
  per10Points: { runeKeys: 1, gold: 300, spirit: 100, basics: 10 },  // ключи, золото, дух — × цикл; базовые — без множителя
  eneriumPerEpicTask: 5, certifyMul: 2, stakeGoldPerPoint: 20,
  day: { points: 70, tasks: [1, 2, 3], epic: 0 },
  week: { points: 300, tasks: [2, 3, 4, 5], epic: 2 },
};
const ECHO = {
  summonSouls: 1, oldAttackSouls: { ordinary: 1, elite: 2, boss: 4, uber: 25 }, pointsCycleMul: 3,
  planks: [[10000, 1], [25000, 2], [50000, 3], [100000, 4], [200000, 5]],   // цикл II: очки → редкость ларца осколков героев недели
  places: [[1, 7], [10, 6], [100, 5], [1000, 4]],
  uber: { item: 'many', count: 1 },
};
const CLAN = {
  pool: [[1, 6, 40], [10, 5, 40], [100, 4, 40], [1000, 3, 40], [0, 2, 40]],  // место не ниже, редкость ларца талисманов, ларцов на клан
  splitPct: [50, 50],
  gmEnerium: [[1, 300], [10, 150], [100, 50]],
};
const EVENT = {
  personal: [[1000, 1, 1000], [2500, 2, 2000], [5000, 3, 4000], [10000, 4, 8000], [20000, 5, 16000]], // очки, редкость ларца рабочих, золото × цикл
  clan: [[20000, 2], [50000, 3], [100000, 4]],
  places: [[1, 7], [10, 6], [100, 5]],
  points: { contract: 40, biome: 60, ritual: 25, echo: 30, arena: 15, craftBiome: 60 },
};
const BOXES = {
  items: [2, 3, 4, 5, 6, 8, 10],
  goldBase: [500, 1000, 2000, 4000, 8000, 16000, 32000],
  perSlot: { workers: 5, keys: 2, heroShards: 5, equipment: 1, talismans: 1 },
  categories: [['Событие', 'Шарды рабочих'], ['Контракты', 'Рунные ключи'], ['Арена и Лига', 'Снаряжение'], ['Эхо', 'Осколки героев недели'], ['Клановый босс', 'Духовные талисманы'], ['Крафтовые боссы', 'Шарды рабочих']],
};
/* Крафтовый биом — экземпляр из предмета (§12.2): 10 этажей, ресурс биома за этаж с шансом, находка — одна гарантированно, вторая — 50 %.
   Крафтовый босс живёт в Эхо (§12.3): ранг «Забытый босс», иммунитет к контролю 75 % (ADR-0010); призыв — предмет и 1 душа (§17.1). */
const CRAFT = {
  biome: { floors: 10, resPerFloorBp: 6000, finds: 1, secondFindBp: 5000, spirit: 1500, souls: 2, heroShards: 10, eventPoints: 60, runeKeyBp: 1000 },
  boss: { trophies: 1, specKeys: 2, enerium: 5, runeKeyBp: 2000, summonSouls: 1, immunityBp: 7500 },
};
const MARKET = { basic: 5, key: 300, craftres: 150, unique: 25000, find: 2500, trophy: 50000, commissionPct: 10 };
module.exports = { SPECS, SPEC_ORDER, TIERS, RARITY, ENEMY, DECKS, GUARD, RUNE_KEYS, RITUALS, CONTRACTS, ECHO, CLAN, EVENT, BOXES, CRAFT, MARKET };
