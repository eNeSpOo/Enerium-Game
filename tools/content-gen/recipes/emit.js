/* Проверки, счёт и вывод: design/ui/recipes.js и tables.md.
   Проверки (любая ошибка — сборка не пишет файлы):
   - у рецепта 1–6 ячеек, количество целое 1–100, вход не повторяется и не из будущего цикла, спойлерный вход — только в рецепте для команды;
   - в рецепте не больше двух ресурсов одного ремесла (§9.2): считаются базовые, ключи и ресурсы крафтовых биомов;
   - у рецепта цикла N есть хотя бы один вход цикла N (базовые общего пула за вход цикла не считаются);
   - достижимость (§12): предмет или падает, или создаётся рецептом, все входы которого достижимы, — считается до неподвижной точки;
   - всё, что падает, нужно хотя бы в одном рецепте; у заготовки и изделия есть выход дальше;
   - призыв крафтового босса несёт находку своей руины и уникальный ресурс босса биома (§12.3);
   - у каждого крафтового босса есть пробуждённый: его призыв несёт обычный призыв той же руины, Многоликого и её находку (ADR-0025);
   - руины идут цепочкой: активация руины не требует добычи руины, которая открывается позже, — в цикле I их проходят по одной,
     в том же активном слоте, что и обычные забеги (ADR-0014, ADR-0023, п. 5);
   - герой с максимумом доблести 4–5 требует трофея, уникального ресурса или двух находок.
   Предупреждения (файлы пишутся): расхождения героя с составом — id, имя, источник «крафт». */
const fs = require('fs'), path = require('path');
const C = require('./common');
const OUT_JS = path.join(__dirname, '..', '..', '..', 'design', 'ui', 'recipes.js');
const OUT_MD = path.join(__dirname, 'tables.md');

module.exports = function emit(D) {
  const { items, recipes, byId, CYC, ROMAN, places, warnings } = D;
  const T = C.TIERS, err = [];
  const isDrop = it => !!T[it.tier].drop || (it.tier === 'rune' && /_1$/.test(it.id));
  const names = {};
  for (const it of items) {
    if (!T[it.tier]) { err.push(`${it.id}: неизвестный ярус ${it.tier}`); continue; }
    if (names[it.n]) err.push(`повтор названия «${it.n}»: ${names[it.n]} и ${it.id}`); else names[it.n] = it.id;
    if (!it.lore) err.push(`${it.id}: нет строки лора`);
    if (!it.src || !it.src.length) err.push(`${it.id}: нет строки «где падает»`);
  }
  for (const r of recipes) {
    const out = byId[r.out[0]];
    if (!out) { err.push(`${r.id}: нет выхода ${r.out[0]}`); continue; }
    if (out.cyc !== r.cyc) err.push(`${r.id}: цикл рецепта ${r.cyc}, а выхода — ${out.cyc}`);
    if (isDrop(out)) err.push(`${r.id}: рецепт создаёт ресурс добычи ${out.id}`);
    if (!Number.isInteger(r.out[1]) || r.out[1] < 1) err.push(`${r.id}: выход не целый`);
    if (r.in.length < 1 || r.in.length > 6) err.push(`${r.id}: ячеек ${r.in.length}, нужно от 1 до 6`);
    const seen = new Set(), perSpec = {}; let cur = false;
    for (const [id, q] of r.in) {
      const it = byId[id];
      if (!it) { err.push(`${r.id}: нет входа ${id}`); continue; }
      if (seen.has(id)) err.push(`${r.id}: вход ${id} дважды`); seen.add(id);
      if (id === r.out[0]) err.push(`${r.id}: выход среди входов`);
      if (!Number.isInteger(q) || q < 1 || q > 100) err.push(`${r.id}: количество ${q} вне 1–100`);
      if (it.cyc > r.cyc) err.push(`${r.id}: вход ${id} из будущего цикла ${it.cyc}`);
      if (it.cyc === r.cyc && !it.pool) cur = true;
      if (it.team && !r.team) err.push(`${r.id}: спойлерный вход ${id} в открытом рецепте`);
      if (T[it.tier].res && it.spec) perSpec[it.spec] = (perSpec[it.spec] || 0) + 1;
    }
    if (!cur) err.push(`${r.id}: ни одного входа своего цикла ${r.cyc}`);
    for (const [s, n] of Object.entries(perSpec)) if (n > 2) err.push(`${r.id}: ${n} ресурса ремесла «${C.SPECS[s].n}» — по §9.2 не больше двух`);
  }
  /* достижимость до неподвижной точки */
  const have = new Set(items.filter(isDrop).map(i => i.id));
  for (let grew = true; grew;) { grew = false; for (const r of recipes) if (!have.has(r.out[0]) && r.in.every(([id]) => have.has(id))) { have.add(r.out[0]); grew = true; } }
  for (const it of items) if (!have.has(it.id)) err.push(`${it.id} (${it.n}): недостижим — не падает и не создаётся из достижимого`);
  const USE = {}, OUT = {};
  for (const r of recipes) { r.in.forEach(([id]) => (USE[id] = USE[id] || []).push(r)); (OUT[r.out[0]] = OUT[r.out[0]] || []).push(r); }
  for (const it of items) {
    if (isDrop(it) && it.tier !== 'rune' && !USE[it.id]) err.push(`${it.id} (${it.n}): падает, но не нужен ни в одном рецепте`);
    if (['part', 'made'].includes(it.tier) && !USE[it.id]) err.push(`${it.id} (${it.n}): ${T[it.tier].n.toLowerCase()} без выхода дальше`);
  }
  for (const p of places) {
    const r = (OUT[p.boss.call] || [])[0]; if (!r) { err.push(`${p.boss.call}: нет рецепта призыва`); continue; }
    if (!r.in.some(([id]) => byId[id] && byId[id].tier === 'unique')) err.push(`${r.id}: призыв без уникального ресурса босса биома (§12.3)`);
    if (!r.in.some(([id]) => id === p.find)) err.push(`${r.id}: призыв без находки своей руины «${p.n}»`);
    const a = p.boss.awake, ra = a && (OUT[a.call] || [])[0];
    if (!ra) { err.push(`${p.boss.id}: нет пробуждённого босса и рецепта его призыва (ADR-0025)`); continue; }
    for (const need of [p.boss.call, C.CRAFT.awake.item, p.find]) if (!ra.in.some(([id]) => id === need)) err.push(`${ra.id}: пробуждение без «${byId[need] ? byId[need].n : need}»`);
  }
  if (err.length) return fail(err, warnings);

  /* полная цена: во что обходится одно создание рецепта в ресурсах добычи (первый рецепт каждого промежуточного узла) */
  function need(id, q, acc) {
    const it = byId[id];
    if (isDrop(it)) { acc[id] = (acc[id] || 0) + q; return acc; }
    const r = OUT[id][0], crafts = Math.ceil(q / r.out[1]);
    for (const [x, qx] of r.in) need(x, qx * crafts, acc);
    return acc;
  }
  const bomOf = r => r.in.reduce((acc, [id, q]) => need(id, q, acc), {});
  const WEIGHT = { basic: 1, key: 3, craftres: 2, find: 25, unique: 60, trophy: 120, echo: 60, vshard: 1, rune: 1 };
  const weightOf = bom => Object.entries(bom).reduce((a, [id, q]) => a + q * (WEIGHT[byId[id].tier] || 1), 0);
  for (const r of recipes) { r.bom = bomOf(r); r.weight = weightOf(r.bom); }
  for (const r of recipes.filter(x => x.kind === 'hero')) {
    const h = byId[r.out[0]], b = r.bom, rare = Object.keys(b).filter(id => ['trophy', 'unique'].includes(byId[id].tier)).length, finds = Object.keys(b).filter(id => byId[id].tier === 'find').reduce((a, id) => a + b[id], 0);
    if (h.maxV >= 4 && !rare && finds < 2) err.push(`${r.id}: герой с максимумом доблести ${h.maxV} без трофея, уникального ресурса или двух находок`);
  }
  /* руины цепочкой: какие руины нужны активации (по её полной цене), без циклов и без руин, открытых позже */
  const order = Object.fromEntries(places.map((p, i) => [p.id, i]));
  for (const p of places) {
    const r = OUT[p.act][0], needs = [...new Set(Object.keys(r.bom).map(id => byId[id].b).filter(b => b && order[b] !== undefined))];
    p.needs = needs;
    for (const b of needs) if (order[b] >= order[p.id]) err.push(`${r.id}: активация руины «${p.n}» требует добычи руины «${places[order[b]].n}», которая открывается не раньше`);
  }
  if (err.length) return fail(err, warnings);

  const stats = buildStats(items, recipes, CYC, places, USE, byId, isDrop);
  const drops = buildDrops(CYC, places, items, recipes, byId);
  const ints = (o, p) => { if (typeof o === 'number') { if (!Number.isInteger(o)) err.push('не целое: ' + p); } else if (o && typeof o === 'object') for (const k in o) ints(o[k], p + '.' + k); };
  ints(drops, 'drops'); ints(stats, 'stats'); ints(recipes.map(r => [r.in, r.out, r.bom, r.weight]), 'recipes');
  if (err.length) return fail(err, warnings);
  writeJs({ items, recipes, drops, stats, CYC, ROMAN, places });
  require('./tables')({ items, recipes, byId, CYC, ROMAN, places, drops, stats, USE, OUT, isDrop, OUT_MD });
  if (warnings.length) console.log('Предупреждения:\n' + warnings.join('\n'));
  console.log('Готово:', items.length, 'предметов,', recipes.length, 'рецептов; общий пул базовых —', stats.total.pool);
  console.log('По циклам — ресурсы без пула:', stats.byCycle.map(s => s.resources).join(' / '), '· рецепты:', stats.byCycle.map(s => s.recipes).join(' / '));
  console.log('Развилки по циклам:', stats.byCycle.map(s => s.forks).join(' / '), '· биомов в цепочках:', stats.byCycle.map(s => s.biomesInChains).join(' / '));
};

function fail(err, warnings) {
  if (warnings && warnings.length) console.log('Предупреждения:\n' + warnings.join('\n'));
  console.log('ОШИБКИ:\n' + err.join('\n')); process.exitCode = 1;
}

function buildStats(items, recipes, CYC, places, USE, byId, isDrop) {
  const tiers = Object.keys(C.TIERS), kinds = ['part', 'made', 'act', 'call', 'hero', 'product', 'story', 'rune', 'valor'];
  const RES = ['basic', 'key', 'unique', 'craftres', 'find', 'trophy'];
  const byCycle = CYC.map(cy => {
    const c = cy.n, its = items.filter(i => i.cyc === c && !i.pool), recs = recipes.filter(r => r.cyc === c);
    const tierCount = Object.fromEntries(tiers.map(t => [t, its.filter(i => i.tier === t).length]));
    const kindCount = Object.fromEntries(kinds.map(k => [k, recs.filter(r => r.kind === k).length]));
    /* развилка — предмет, который открытые к этому циклу рецепты (циклы 1…N) тянут хотя бы в два места */
    const open = recipes.filter(r => r.cyc <= c), uses = {};
    for (const r of open) for (const [id] of r.in) uses[id] = (uses[id] || 0) + 1;
    const forks = Object.values(uses).filter(n => n >= 2).length, edges = Object.values(uses).reduce((a, n) => a + n, 0);
    /* биомы и руины, чья собственная добыча входит в полную цену рецептов этого цикла; общий пул падает везде и не считается */
    const src = new Set(); for (const r of recs) for (const id of Object.keys(r.bom)) { const it = byId[id]; if (it.b) src.add(it.b); }
    const poolUsed = new Set(); for (const r of recs) for (const [id] of r.in) if (byId[id].pool) poolUsed.add(id);
    return { cyc: c, items: its.length, resources: its.filter(i => RES.includes(i.tier)).length, poolUsed: poolUsed.size,
      recipes: recs.length, recipesNoRunes: recs.filter(r => r.kind !== 'rune' && r.kind !== 'valor').length,
      tiers: tierCount, kinds: kindCount, forks, edges, biomesInChains: src.size, crossCycleInputs: recs.reduce((a, r) => a + r.in.filter(([id]) => byId[id].cyc < c && !byId[id].pool).length, 0) };
  });
  const total = { items: items.length, recipes: recipes.length, pool: items.filter(i => i.pool).length,
    resources: items.filter(i => RES.includes(i.tier)).length,
    tiers: Object.fromEntries(tiers.map(t => [t, items.filter(i => i.tier === t).length])),
    craftBiomes: places.length, craftBosses: places.length + 1, awakened: places.filter(p => p.boss.awake).length };
  return { byCycle, total };
}

function buildDrops(CYC, places, items, recipes, byId) {
  const E = C.ENEMY, S = E.spirit, cyc6 = [1, 2, 3, 4, 5, 6];
  const mulHalf = (base, c, second) => base * (2 * c + (second ? 1 : 0)) / 2;   // × (цикл + 0,5) во втором биоме; базы чётные — результат целый
  /* базовых за забег × 100: этажей × шанс × среднее за срабатывание (1 + номер биома) / 2 */
  const basicsX100 = (floors, bn) => floors * E.basePerFloorBp * (1 + bn) / 200;
  const perRun = (deck, bn, c) => ({ basicsX100: basicsX100(deck.floors, bn), specKeys: deck.elites, souls: deck.elites * C.ENEMY.soulsElitePerBiome * bn + C.ENEMY.soulsBossPerBiome * bn,
    runeKeysPer100: E.bossRuneKeyBp / 100 * c, uniquePer100: E.uniqueBp / 100 });
  const enemies = [];
  for (const cy of CYC) cy.biomes.forEach((b, i) => {
    const c = cy.n, bn = +b.id.slice(1), deck = C.DECKS[b.deck];
    const sp = k => mulHalf(S[k], c, i === 1), rank = k => ({ spirit: sp(k), gold: Math.floor(sp(k) / 2) });
    enemies.push({ biome: b.id, name: b.n, cyc: c, team: !!cy.team, deck: b.deck, floors: deck.floors, elites: deck.elites,
      ordinary: rank('ordinary'), elite: Object.assign(rank('elite'), { souls: C.ENEMY.soulsElitePerBiome * bn, specKeys: 1, runeKeyBp: 0 }),
      boss: Object.assign(rank('boss'), { souls: C.ENEMY.soulsBossPerBiome * bn, uniqueBp: E.uniqueBp, runeKeyBp: E.bossRuneKeyBp, runeKeys: c }),
      guard: rank('guard'), basePerFloorBp: E.basePerFloorBp, basicsPerTriggerMax: bn,
      perRun: perRun(deck, bn, c), perRunAfterTutorial: c === 1 ? perRun(C.DECKS.sample, bn, c) : null });
  });
  const guardians = [];
  for (const cy of CYC) {
    const [A, B] = cy.biomes, c = cy.n;
    guardians.push({ id: A.id + 'g', name: A.guard, biome: A.id, cyc: c, kind: 'limits', entryKeys: C.GUARD.limits.entryKeysPerCycle * c, runesPerKill: C.GUARD.limits.runesPerKill, weightsBp: C.GUARD.limits.weightsBp, team: !!cy.team });
    guardians.push({ id: B.id + 'g', name: B.guard, biome: B.id, cyc: c, kind: 'valor', entryKeys: C.GUARD.valor.entryKeysPerCycle * c, shardsBp: C.GUARD.valor.shardsBp, undefinedBp: C.GUARD.valor.undefinedBp, team: !!cy.team });
  }
  const CB = C.CRAFT.biome, CS = C.CRAFT.boss;
  const craftBiomes = places.map(p => ({ id: p.id, name: p.n, cyc: p.cyc, act: p.act, needs: p.needs, res: p.res, find: p.find, floors: CB.floors, resPerFloorBp: CB.resPerFloorBp,
    finds: CB.finds, secondFindBp: CB.secondFindBp, spirit: CB.spirit * p.cyc, gold: CB.spirit * p.cyc / 2, souls: CB.souls * p.cyc, heroShards: CB.heroShards * p.cyc,
    eventPoints: CB.eventPoints, runeKeyBp: CB.runeKeyBp, runeKeys: p.cyc, team: p.team }));
  const craftBosses = places.map(p => ({ id: p.boss.id, name: p.boss.label, cyc: p.cyc, spec: p.boss.spec, race: p.boss.race, call: p.boss.call, trophy: p.boss.trophy,
    trophies: CS.trophies, specKeys: CS.specKeys, spirit: CS.spirit * p.cyc, gold: CS.spirit * p.cyc / 2, enerium: CS.enerium * p.cyc, runeKeyBp: CS.runeKeyBp, runeKeys: p.cyc,
    workerBoxRarity: Math.min(7, p.cyc + 1), summonSouls: CS.summonSouls, immunityBp: CS.immunityBp, team: p.team }))
    .concat([{ id: 'lik', name: 'Лик недели', cyc: 2, spec: null, race: 'раса недели', call: 'mask', trophy: null, trophies: 0, heroShardsWeekBp: C.CRAFT.lik.heroShardsWeekBp, specKeys: 0, spirit: 0, gold: 0, enerium: 0,
      runeKeyBp: 0, runeKeys: 0, workerBoxRarity: 0, summonSouls: CS.summonSouls, immunityBp: CS.immunityBp, team: false }]);
  /* пробуждённые (ADR-0025): тот же вид записи, что у крафтового босса; cyc — цикл, с которого есть рецепт пробуждения.
     awake — id обычного босса; powerCycleStep — сила как у крафтового босса на столько циклов выше. */
  const AW = C.CRAFT.awake;
  for (const p of places.filter(x => x.boss.awake)) { const a = p.boss.awake, c = a.cyc, cur = CS.spirit * c * AW.currencyMul;
    craftBosses.push({ id: a.id, name: a.label, cyc: c, spec: p.boss.spec, race: p.boss.race, call: a.call, trophy: p.boss.trophy,
      trophies: AW.trophies, specKeys: AW.specKeys, spirit: cur, gold: cur / 2, enerium: CS.enerium * c * AW.currencyMul, runeKeyBp: AW.runeKeyBp, runeKeys: c,
      workerBoxRarity: Math.min(7, c + 1 + AW.chestStep), summonSouls: CS.summonSouls, immunityBp: CS.immunityBp, team: p.team || !!CYC[c - 1].team,
      awake: p.boss.id, powerCycleStep: AW.powerCycleStep }); }
  const M = C.MARKET;
  const market = { basic: cyc6.map(c => M.basic * c), key: cyc6.map(c => M.key * c), craftres: cyc6.map(c => M.craftres * c), unique: cyc6.map(c => M.unique * c),
    find: cyc6.map(c => M.find * c), trophy: cyc6.map(c => M.trophy * c), commissionPct: M.commissionPct, soulsTradable: false };
  /* для сборщика сундуков (tools/content-gen/lootboxes): общий пул базовых и наборы по циклам и ярусам. Что делается по рецепту, сундук не выдаёт (ADR-0023, п. 7). */
  const pools = cyc6.map(c => {
    const its = items.filter(i => i.cyc === c && !i.pool), ids = t => its.filter(i => i.tier === t).map(i => i.id);
    return { cyc: c, key: ids('key'), unique: ids('unique'), craftres: ids('craftres'), find: ids('find'), trophy: ids('trophy'), products: ids('product') };
  });
  return {
    enemies, guardians, dailyGuardianCap: C.GUARD.dailyCap,
    echo: Object.assign({}, C.ECHO, { uber: C.ECHO.many }),   // uber — прежнее имя той же записи: его читают экран Эхо и его проверки; снять, когда перейдут на echo.many
    payouts: 'design/ui/lootboxes.js',
    lootboxes: { basicPool: items.filter(i => i.pool).map(i => i.id), pools },
    activeSlots: { shared: true, byCycle: C.CRAFT.activeCap },
    craftBiomes, craftBosses, market,
  };
}

function writeJs({ items, recipes, drops, stats, CYC, ROMAN, places }) {
  const J = v => Array.isArray(v) ? '[' + v.map(J).join(', ') + ']'
    : v && typeof v === 'object' ? '{ ' + Object.entries(v).map(([k, x]) => (/^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + J(x)).join(', ') + ' }'
    : JSON.stringify(v);
  const cycles = CYC.map(cy => ({ n: cy.n, roman: ROMAN[cy.n], god: cy.god, el: cy.el, karst: cy.karst, team: !!cy.team, about: cy.about,
    biomes: cy.biomes.map(b => ({ id: b.id, n: b.n, kind: b.kind, boss: b.boss, guard: b.guard, guardKind: b.guardKind })),
    craft: places.filter(p => p.cyc === cy.n).map(p => p.id),
    craftBiome: places.filter(p => p.cyc === cy.n).map(p => p.n).join(', '),
    craftBoss: places.filter(p => p.cyc === cy.n).map(p => p.boss.label).join(', ') }));
  const keysOrder = ['id', 'n', 'cyc', 'b', 'pool', 'place', 'tier', 'spec', 'r', 'img', 'glyph', 'boss', 'foe', 'opens', 'opensLore', 'heroId', 'cls', 'race', 'school', 'maxV', 'week', 'team', 'lore', 'src'];
  const clean = it => { const o = {}; for (const k of keysOrder) if (it[k] !== undefined && it[k] !== null && !(['team', 'pool'].includes(k) && !it[k])) o[k] = it[k]; return o; };
  const rkeys = ['id', 'cyc', 'n', 'kind', 'out', 'in', 'known0', 'hidden', 'team', 'why', 'weight'];
  const rclean = r => { const o = {}; for (const k of rkeys) if (r[k] !== undefined && !(['team', 'known0', 'hidden'].includes(k) && !r[k])) o[k] = r[k]; return o; };
  const out = `/* Энериум · ресурсы и древо рецептов — данные прототипа «Свет снизу».
   Черновик · предложение · ждёт автора. Собирается tools/content-gen/recipes/ (node build.js), вручную не править.
   Все числа — демонстрация, под прогоны; шансы — в базисных пунктах (10 000 = 100 %).
   Обоснование и летопись — docs/content/ресурсы-рецепты-дроп.md; его таблицы собраны из этих же данных.
   В игре рецепты и таблицы наград живут только на сервере (CLAUDE.md, инварианты; GDD §12, §36.16): клиент получает
   лишь рецепты, уже открытые игроком. Здесь полный набор — для проектирования. Записи с team: true — спойлеры (§38), только для команды.
   pool: true — базовый ресурс общего пула: падает во всех биомах с первого (ADR-0023, п. 1). */
window.EN_RECIPES = {
  specs: ${J(C.SPECS)},
  specOrder: ${J(C.SPEC_ORDER)},
  tiers: ${J(Object.fromEntries(Object.entries(C.TIERS).map(([k, t]) => [k, { n: t.n, r: t.r }])))},
  cycles: [
${cycles.map(x => '    ' + J(x)).join(',\n')}
  ],
  places: [
${places.map(x => '    ' + J(x)).join(',\n')}
  ],
  items: [
${items.map(x => '    ' + J(clean(x))).join(',\n')}
  ],
  recipes: [
${recipes.map(x => '    ' + J(rclean(x))).join(',\n')}
  ],
  stats: ${J(stats)},
  drops: {
${Object.entries(drops).map(([k, v]) => `    ${k}: ${J(v)}`).join(',\n')}
  },
};
`;
  fs.writeFileSync(OUT_JS, out, 'utf8');
}
