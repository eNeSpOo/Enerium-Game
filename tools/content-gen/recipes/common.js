/* Общие справочники и параметры дропа. Все числа — демонстрация, под прогоны. Шансы — в базисных пунктах (10 000 = 100 %). */
const SPECS = {
  hunt: { n: 'Охота', icon: 'target' },
  tail: { n: 'Портняжное дело', icon: 'cut' },
  eng: { n: 'Инженерия', icon: 'gear' },
  alch: { n: 'Алхимия', icon: 'drop' },
  ench: { n: 'Зачарование', icon: 'spark' },
  smith: { n: 'Кузнечество', icon: 'flame' },
};
const SPEC_ORDER = ['hunt', 'tail', 'eng', 'alch', 'ench', 'smith'];
const TIERS = {
  basic: { n: 'Базовый ресурс', r: 1 },
  key: { n: 'Ключ ремесла', r: 2 },
  unique: { n: 'Уникальный ресурс биома', r: 4 },
  rune: { n: 'Руна предела', r: 2 },
  vshard: { n: 'Осколок доблести', r: 3 },
  valor: { n: 'Руна доблести', r: 4 },
  part: { n: 'Заготовка', r: 2 },
  act: { n: 'Активация крафтового биома', r: 3 },
  call: { n: 'Призыв крафтового босса', r: 3 },
  find: { n: 'Находка крафтового биома', r: 3 },
  trophy: { n: 'Трофей крафтового босса', r: 4 },
  echo: { n: 'Добыча Эхо', r: 4 },
  product: { n: 'Изделие', r: 3 },
};
/* Рядовой, элита, босс биома: GDD §9.1 для биома 1; рост — старый ориентир §9.1:
   золото и дух ×3 за цикл, души элиты +1 и босса +5 за каждый следующий биом. */
const ENEMY = {
  ordinary: { gold: 20, spirit: 10, basics: [1, 3] },
  elite: { gold: 100, spirit: 50, basics: [1, 2], specKeys: 1, runeKeyBp: 500, runeKeyBpMax: 1000 },
  boss: { gold: 500, spirit: 250, uniqueBp: 500, uniqueBpArtifacts: 1000, runeKeyBp: 1000, runeKeyBpMax: 2500 },
};
const GUARD = {
  limits: { runesPerKill: 2, weightsBp: [4000, 2700, 1800, 1000, 500] },
  valor: { shardsBp: [[1, 5000], [2, 2500], [3, 1250], [5, 725], [10, 300]], undefinedBp: 225, shardsPerRune: 100 },
  dailyCapPerCycle: 10,
};
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
const CRAFT = {
  biome: { finds: 1, secondFindBp: 5000, gold: 3000, spirit: 1500, souls: 2, heroShards: 10, basics: 60, eventPoints: 60, runeKeyBp: 1000 },
  boss: { trophies: 1, specKeys: 2, enerium: 5, runeKeyBp: 2000, summonSouls: 1 },
};
const MARKET = { basic: 5, key: 300, unique: 25000, commissionPct: 10 };
/* Колода первого биома из design/ui/battle.js (ADR-0007): 110 рядовых, 6 элит, босс. */
const DECK_B1 = { ordinary: 110, elite: 6, boss: 1, floors: 35 };
module.exports = { SPECS, SPEC_ORDER, TIERS, ENEMY, GUARD, RITUALS, CONTRACTS, ECHO, CLAN, EVENT, BOXES, CRAFT, MARKET, DECK_B1 };
