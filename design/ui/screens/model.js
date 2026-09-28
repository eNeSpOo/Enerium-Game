/* Энериум · прототип «Свет снизу» — общие запасы игрока для экранов «Ремесло», «Запасы», «Сундуки» и «Эхо».
   Подключается после основного скрипта index.html, до запуска: boot() идёт по DOMContentLoaded.
   Предметы и рецепты — EN_RECIPES (recipes.js), сундуки — EN_LOOTBOXES и EnLoot (lootboxes.js), герои — roster.js.
   Демо-состояние — в DEMO_BAG: это данные, а не код. В игре запасы, рецепты и итог открытия решает сервер (§36):
   клиент получает только найденные игроком рецепты.

   Договор для файлов экранов (screens/*.js):
   - запасы — только через BAG: BAG.qty / add / take / has, предметы — BAG.item, рецепты — BAG.recipe;
   - найденные рецепты — BAG.known / learn; где предмет нужен — BAG.usedIn (все) и BAG.knownUses (найденные);
   - сундуки — S.bag.chests, BAG.chest / addChest / dropChest; открывает экран «Запасы» через EnLoot;
   - «Ремесло»: сегменты — CRAFT_SEGS.work (screens/craft.js) и CRAFT_SEGS.stock (screens/bag.js), остальные — прежний craftView;
   - активации из запасов — ACTIVATE[ярус предмета](id): act — крафтовый биом, call — крафтовый босс, echo — Многоликий (screens/echo.js). */

const DEMO_BAG = {
  /* id предмета → количество: все 36 базовых, ключи циклов I–II, уникальные и ресурсы руин цикла I, находка и активации дороги */
  items: {
    resin: 3, mushroom: 14, acid: 25, ash: 7, salt: 18, vial: 29, sand: 11, dormite: 22, runechip: 4, crystal: 15,
    ink: 26, candle: 8, spring: 19, plank: 30, mechpart: 12, nail: 23, bracket: 5, gear: 16, thread: 27, dye: 9,
    rag: 20, leather: 31, canvas: 13, yarn: 24, fang: 6, bone: 17, claw: 28, hide: 10, feather: 21, sinew: 3,
    ember: 14, ironore: 25, scrap: 7, dross: 18, copper: 29, coal: 11, k1_hunt: 1, k1_tail: 2, k1_eng: 3, k1_alch: 4,
    k1_ench: 5, k1_smith: 1, k2_hunt: 2, k2_tail: 3, k2_eng: 4, k2_alch: 5, k2_ench: 1, k2_smith: 2, k3_hunt: 3,
    k3_tail: 4, k3_eng: 5, k3_alch: 1, k3_ench: 2, k3_smith: 3, k4_hunt: 4, k4_tail: 5, k4_eng: 1, k4_alch: 2,
    k4_ench: 3, k4_smith: 4, u1: 1, u2: 1, cr_stone: 2, cr_harness: 5, cr_shoe: 8, cr_karst: 4, cr_prop: 7,
    cr_mold: 3, find_cb1: 1, act_cb1: 1, call_fb1: 1, p_fang: 2, p_waxthread: 3, p_frame: 1, a_lamp: 1, rn1_1: 3,
    rn1_2: 1, vs1: 2, many: 1
  },
  /* найденные рецепты: пять заготовок цикла I, активация Заброшенной дороги и призыв её босса */
  known: ["r_p_fang", "r_p_waxthread", "r_p_frame", "r_p_clay", "r_p_print", "r_act_cb1", "r_call_fb1"],
  /* сундуки в запасах: spec для EnLoot.resolve — box, r (редкость 1–7), cyc, win, week; src — откуда пришёл */
  chests: [
    { box: 'shards', r: 2, cyc: 2, win: 'step', week: 'Эльфы', src: 'Эхо · личная планка' },
    { box: 'keys', r: 2, cyc: 2, win: 'step', src: 'Контракты · неделя' },
    { box: 'workers', r: 1, cyc: 2, win: 'step', src: 'Событие · планка' },
    { box: 'talisman', r: 2, cyc: 2, win: 'step', src: 'Клановый босс · доля клана' },
    { box: 'craft', r: 2, cyc: 1, win: 'step', src: 'Крафтовый босс · Хатт-Уру' },
    { box: 'wander', r: 2, cyc: 1, win: 'step', src: 'Первая победа над боссом биома' },
    { box: 'wander', r: 1, cyc: 2, win: 'wild', src: 'Календарь · день 3' },
  ],
};

const BAG = (() => {
  const items = new Map(EN_RECIPES.items.map(i => [i.id, i]));
  const recipes = new Map(EN_RECIPES.recipes.map(r => [r.id, r]));
  const uses = new Map();
  for (const r of EN_RECIPES.recipes) for (const [id] of r.in) { if (!uses.has(id)) uses.set(id, []); uses.get(id).push(r.id); }
  const fresh = () => ({
    items: { ...DEMO_BAG.items },
    known: [...DEMO_BAG.known],
    chests: DEMO_BAG.chests.map((c, i) => ({ id: 'ch' + (i + 1), ...c })),
    seq: DEMO_BAG.chests.length,
  });
  return {
    fresh,
    item: id => items.get(id) || null,
    recipe: id => recipes.get(id) || null,
    qty: id => S.bag.items[id] || 0,
    has: (id, n = 1) => (S.bag.items[id] || 0) >= n,
    add(id, n = 1) { S.bag.items[id] = (S.bag.items[id] || 0) + n; },
    take(id, n = 1) {
      const q = S.bag.items[id] || 0;
      if (q < n) return false;
      if (q === n) delete S.bag.items[id]; else S.bag.items[id] = q - n;
      return true;
    },
    known: id => S.bag.known.includes(id),
    learn(id) { if (!S.bag.known.includes(id)) S.bag.known.push(id); },
    usedIn: id => (uses.get(id) || []).map(r => recipes.get(r)),
    knownUses: id => (uses.get(id) || []).filter(r => S.bag.known.includes(r)).map(r => recipes.get(r)),
    chest: id => S.bag.chests.find(c => c.id === id) || null,
    addChest(spec) { S.bag.chests.push({ id: 'ch' + (++S.bag.seq), ...spec }); },
    dropChest(id) { S.bag.chests = S.bag.chests.filter(c => c.id !== id); },
  };
})();

/* активации из запасов: ярус предмета → обработчик; регистрирует screens/echo.js */
const ACTIVATE = {};

/* «Ремесло»: сегменты по файлам экранов, прежний craftView — для лавки и рынка */
const CRAFT_SEGS = {};
SCREENS.craft = () => {
  const f = CRAFT_SEGS[S.seg.craft];
  if (!f) return craftView();
  return { title: 'Ремесло', seg: { key: 'craft', items: [['work', 'Мастерская'], ['stock', 'Запасы'], ['shop', 'Лавка'], ['market', 'Рынок']] }, html: f() };
};

/* состояние: у текущей сессии и у сброса — одни и те же запасы */
const initialStateBase = initialState;
initialState = function () { const s = initialStateBase(); s.bag = BAG.fresh(); return s; };
S.bag = BAG.fresh();
