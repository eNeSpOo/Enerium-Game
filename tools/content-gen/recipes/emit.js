/* Проверки и вывод: design/ui/recipes.js и tables.md. */
const fs = require('fs'), path = require('path');
const C = require('./common');
const OUT_JS = path.join(__dirname, '..', '..', '..', 'design', 'ui', 'recipes.js');
const OUT_MD = path.join(__dirname, 'tables.md');
const SRC_EXTRA = {
  many: ['Эхо · Убер-босс недели, взятый по лестнице · 1'],
  mask: ['Мастерская · рецепт'],
  rkey: ['Элиты — 5 %, босс биома — 10 %; за срабатывание столько ключей, какой цикл', 'Контракты — главный источник', 'Крафтовые биомы и крафтовые боссы', 'Рецепт «Ключи из горна» — с цикла III'],
  energ: ['Рецепт «Энериум из жилы» — цикл V', 'Крафтовые боссы · 5 × цикл', 'Контракты эпической редкости и выше', 'Топ-100 Арены, награды главам кланов'],
  chest_eq4: ['Мастерская · рецепт', 'Лутбоксы Арены и Лиги'],
  chest_tal5: ['Мастерская · рецепт', 'Лутбоксы Кланового босса'],
  necro: ['Мастерская · сюжетный рецепт, открывается после Зарифа'],
  chest_tal6: ['Мастерская · рецепт', 'Лутбоксы Кланового босса'],
  chest_eq6: ['Мастерская · рецепт', 'Лутбоксы Арены и Лиги'],
};
const DROPPED = new Set(['basic', 'key', 'unique', 'vshard', 'find', 'trophy', 'echo']);

module.exports = function emit({ items, recipes, byId, CYC, ROMAN }) {
  const err = [], warn = [];
  for (const it of items) if (SRC_EXTRA[it.id]) it.src = SRC_EXTRA[it.id];
  const produced = new Set(recipes.map(r => r.out[0]));
  const used = new Set(); recipes.forEach(r => r.in.forEach(([id]) => used.add(id)));
  for (const r of recipes) {
    if (!byId[r.out[0]]) err.push(`${r.id}: нет выхода ${r.out[0]}`);
    if (r.in.length > 6) err.push(`${r.id}: больше шести ячеек`);
    const perSpec = {};
    for (const [id, q] of r.in) {
      const it = byId[id];
      if (!it) { err.push(`${r.id}: нет входа ${id}`); continue; }
      if (!Number.isInteger(q) || q < 1 || q > 100) err.push(`${r.id}: количество ${q} вне 1–100`);
      if (it.cyc > r.cyc) err.push(`${r.id}: вход ${id} из будущего цикла ${it.cyc}`);
      if (it.team && !r.team) err.push(`${r.id}: спойлерный вход ${id} в открытом рецепте`);
      if ((it.tier === 'basic' || it.tier === 'key') && it.spec) perSpec[it.spec] = (perSpec[it.spec] || 0) + 1;
    }
    for (const [s, n] of Object.entries(perSpec)) if (n > 2) err.push(`${r.id}: ${n} ресурса ремесла ${s} (правило §9.2 — не больше двух)`);
    if (!Number.isInteger(r.out[1]) || r.out[1] < 1) err.push(`${r.id}: выход не целый`);
  }
  for (const it of items) {
    const isRune1 = it.tier === 'rune' && /_1$/.test(it.id);
    if (!DROPPED.has(it.tier) && !isRune1 && !produced.has(it.id)) err.push(`${it.id}: недостижим — ни дропа, ни рецепта`);
    if (!it.src || !it.src.length) err.push(`${it.id}: нет строки «где падает»`);
    if (['basic', 'key', 'unique', 'find', 'trophy', 'echo', 'vshard'].includes(it.tier) && !used.has(it.id)) warn.push(`${it.id} (${it.n}) ни в одном рецепте`);
  }
  const ints = (o, p) => { if (typeof o === 'number') { if (!Number.isInteger(o)) err.push('не целое: ' + p); } else if (o && typeof o === 'object') for (const k in o) ints(o[k], p + '.' + k); };
  const drops = buildDrops(CYC);
  ints(drops, 'drops'); ints(recipes.map(r => [r.in, r.out]), 'recipes');
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exitCode = 1; return; }
  if (warn.length) console.log('Предупреждения:\n' + warn.join('\n'));
  writeJs(items, recipes, drops, CYC, ROMAN);
  require('./tables')({ items, recipes, byId, CYC, ROMAN, drops, OUT_MD });
  const tiers = {}; items.forEach(i => tiers[i.tier] = (tiers[i.tier] || 0) + 1);
  console.log('Готово:', items.length, 'предметов,', recipes.length, 'рецептов', JSON.stringify(tiers));
};

function buildDrops(CYC) {
  const E = C.ENEMY, enemies = [];
  for (const cy of CYC) for (const b of cy.biomes) {
    const c = cy.n, m = 3 ** (c - 1), bn = +b.id.slice(1);
    enemies.push({ biome: b.id, cyc: c,
      ordinary: { gold: E.ordinary.gold * m, spirit: E.ordinary.spirit * m, souls: 0, basics: E.ordinary.basics },
      elite: { gold: E.elite.gold * m, spirit: E.elite.spirit * m, souls: bn, basics: E.elite.basics, specKeys: 1, runeKeyBp: E.elite.runeKeyBp, runeKeys: c },
      boss: { gold: E.boss.gold * m, spirit: E.boss.spirit * m, souls: 5 * bn, uniqueBp: E.boss.uniqueBp, runeKeyBp: E.boss.runeKeyBp, runeKeys: c } });
  }
  const guardians = [];
  for (const cy of CYC) {
    const [A, B] = cy.biomes, c = cy.n;
    guardians.push({ id: A.id + 'g', name: A.guard, biome: A.id, cyc: c, kind: 'limits', entryKeys: c, runesPerKill: C.GUARD.limits.runesPerKill, weightsBp: C.GUARD.limits.weightsBp, team: !!cy.team });
    guardians.push({ id: B.id + 'g', name: B.guard, biome: B.id, cyc: c, kind: 'valor', entryKeys: 2 * c, shardsBp: C.GUARD.valor.shardsBp, undefinedBp: C.GUARD.valor.undefinedBp, team: !!cy.team });
  }
  const cyc6 = [1, 2, 3, 4, 5, 6], H = C.RITUALS.heroes, hours = H.minutes.map(x => x / 60);
  const CT = C.CONTRACTS, per = CT.per10Points;
  const contract = (k, c) => { const x = CT[k], t = x.points / 10;
    return { points: x.points, tasks: x.tasks, runeKeys: per.runeKeys * t * c, gold: per.gold * t * c, spirit: per.spirit * t * c, basics: per.basics * t, enerium: CT.eneriumPerEpicTask * x.epic, stakeGold: CT.stakeGoldPerPoint * x.points * c }; };
  return {
    enemies, guardians, dailyGuardianCap: C.GUARD.dailyCapPerCycle,
    clearB1: (() => { const d = C.DECK_B1, e = enemies[0];
      return { ordinary: d.ordinary, elite: d.elite, boss: d.boss, floors: d.floors,
        gold: d.ordinary * e.ordinary.gold + d.elite * e.elite.gold + e.boss.gold,
        spirit: d.ordinary * e.ordinary.spirit + d.elite * e.elite.spirit + e.boss.spirit,
        souls: d.elite * e.elite.souls + e.boss.souls,
        basicsAvg: d.ordinary * 2 + (d.elite * 3) / 2 | 0, specKeys: d.elite,
        runeKeysPer100Clears: (d.elite * e.elite.runeKeyBp + e.boss.runeKeyBp) / 100, uniquePer100Clears: e.boss.uniqueBp / 100 }; })(),
    rituals: {
      workers: C.RITUALS.workers,
      heroes: { minutes: H.minutes, byCycle: cyc6.map(c => ({ cyc: c, gold: hours.map(h => H.perHour.gold * h * c), spirit: hours.map(h => H.perHour.spirit * h * c), souls: hours.map(h => H.perHour.souls * h * c) })) },
    },
    contracts: { taskPoints: CT.taskPoints, certifyMul: CT.certifyMul, byCycle: cyc6.map(c => ({ cyc: c, day: contract('day', c), week: contract('week', c) })) },
    echo: C.ECHO, clanBoss: C.CLAN, event: C.EVENT,
    lootboxes: { items: C.BOXES.items, perSlot: C.BOXES.perSlot, categories: C.BOXES.categories,
      rarityFrom: [1, 2, 3, 4, 5, 6, 7].map(n => Math.max(1, n - 2)), goldByCycle: cyc6.map(c => C.BOXES.goldBase.map(g => g * c)) },
    craftBiomes: CYC.map(cy => { const c = cy.n, m = 3 ** (c - 1), x = C.CRAFT.biome;
      return { cyc: c, name: cy.craft.biome[0], act: 'act' + c, find: 'find' + c, finds: x.finds, secondFindBp: x.secondFindBp, gold: x.gold * m, spirit: x.spirit * m, souls: x.souls * c, heroShards: x.heroShards * c, basics: x.basics, eventPoints: x.eventPoints, runeKeyBp: x.runeKeyBp, runeKeys: c, team: !!cy.team }; }),
    craftBosses: CYC.map(cy => { const c = cy.n, x = C.CRAFT.boss;
      return { cyc: c, name: cy.craft.boss[0], spec: cy.craft.boss[1], call: 'call' + c, trophy: 'tr' + c, trophies: x.trophies, workerBoxRarity: Math.min(7, c + 1), specKeys: x.specKeys, enerium: x.enerium * c, runeKeyBp: x.runeKeyBp, runeKeys: c, summonSouls: x.summonSouls, team: !!cy.team }; })
      .concat([{ cyc: 2, name: 'Лик недели', spec: null, call: 'mask', trophy: null, trophies: 0, workerBoxRarity: 0, heroShardsWeek: 20, specKeys: 0, enerium: 0, runeKeyBp: 0, runeKeys: 0, summonSouls: 1, team: false }]),
    market: { basic: cyc6.map(c => C.MARKET.basic * c), key: cyc6.map(c => C.MARKET.key * c), unique: cyc6.map(c => C.MARKET.unique * c), commissionPct: C.MARKET.commissionPct, soulsTradable: false },
  };
}

function writeJs(items, recipes, drops, CYC, ROMAN) {
  const J = v => Array.isArray(v) ? '[' + v.map(J).join(', ') + ']'
    : v && typeof v === 'object' ? '{ ' + Object.entries(v).map(([k, x]) => (/^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + J(x)).join(', ') + ' }'
    : JSON.stringify(v);
  const cycles = CYC.map(cy => ({ n: cy.n, roman: ROMAN[cy.n], god: cy.god, el: cy.el, karst: cy.karst, team: !!cy.team, about: cy.about,
    biomes: cy.biomes.map(b => ({ id: b.id, n: b.n, kind: b.kind, boss: b.boss, guard: b.guard, guardKind: b.guardKind })),
    craftBiome: cy.craft.biome[0], craftBoss: cy.craft.boss[0], craftBossSpec: cy.craft.boss[1] }));
  const keysOrder = ['id', 'n', 'cyc', 'b', 'tier', 'spec', 'r', 'img', 'glyph', 'elite', 'opens', 'opensLore', 'boss', 'team', 'lore', 'src'];
  const clean = it => { const o = {}; for (const k of keysOrder) if (it[k] !== undefined && it[k] !== null && !(k === 'team' && !it[k])) o[k] = it[k]; return o; };
  const rkeys = ['id', 'cyc', 'n', 'kind', 'out', 'in', 'known0', 'team', 'why'];
  const rclean = r => { const o = {}; for (const k of rkeys) if (r[k] !== undefined && !((k === 'team' || k === 'known0') && !r[k])) o[k] = r[k]; return o; };
  const out = `/* Энериум · древо рецептов — данные прототипа «Свет снизу».
   Черновик · предложение · ждёт автора. Все числа — демонстрация, под прогоны; шансы — в базисных пунктах (10 000 = 100 %).
   Документ с обоснованием: docs/content/ресурсы-рецепты-дроп.md; его таблицы собраны из этих же данных — правьте их вместе.
   В игре рецепты и таблицы наград живут только на сервере (CLAUDE.md, инварианты; GDD §12, §36.16): клиент получает
   лишь рецепты, уже открытые игроком. Здесь полный набор — для проектирования. Записи с team: true — спойлеры (§38), только для команды. */
window.EN_RECIPES = {
  specs: ${J(C.SPECS)},
  tiers: ${J(C.TIERS)},
  cycles: [
${cycles.map(x => '    ' + J(x)).join(',\n')}
  ],
  items: [
${items.map(x => '    ' + J(clean(x))).join(',\n')}
  ],
  recipes: [
${recipes.map(x => '    ' + J(rclean(x))).join(',\n')}
  ],
  drops: {
${Object.entries(drops).map(([k, v]) => `    ${k}: ${J(v)}`).join(',\n')}
  },
};
`;
  fs.writeFileSync(OUT_JS, out, 'utf8');
}
