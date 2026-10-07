/* Проверки, счёт и вывод: design/ui/recipes.js и tables.md.
   Проверки (любая ошибка — сборка не пишет файлы):
   - у предмета есть ярус, семейство, строка лора, подсказка Этриона (hint), вид для иконки (art) и строка «где падает»; имена не повторяются;
   - у рецепта 1–6 ячеек, количество целое 1–100, вход не повторяется и не из будущего цикла, спойлерный вход — только в рецепте для команды;
     рецепт не моложе своего выхода: поздний цикл может дать новый путь к старому предмету, ранний к позднему — нет;
   - в рецепте не больше двух ресурсов одного ремесла (§9.2): считаются базовые, ключи и ресурсы крафтовых биомов;
   - у рецепта цикла N есть хотя бы один вход цикла N (базовые общего пула и валюты кошелька за вход цикла не считаются);
   - достижимость (§12): предмет или падает (валюта кошелька — тоже источник), или создаётся рецептом, все входы которого достижимы;
   - мёртвых предметов нет: всё, что не конечная цель (герой, призыв, руина, город, руна, ларец, валюта), нужно хотя бы в одном рецепте;
   - каждый ключ ремесла стоит в полной цене хотя бы одного повторяемого рецепта — активации, призыва, заряженного карста или топлива;
   - каждый призыв врага несёт Энериум своей ступени и уникальный ресурс босса биома — сам или через перекрафт (слово автора, 30.09.2026);
   - лестница Энериума: 100 первой ступени — одна второй, 100 второй — одна третьей;
   - призыв босса руины или города несёт находку своего места; у каждого — пробуждённый: обычный призыв, Многоликий, находка (ADR-0025);
   - у каждого призванного врага — тип по силе (ADR-0039): элита, босс, Убер или Пробуждённый (CRAFT.type);
   - места идут цепочкой: активация не требует добычи места, которое открывается позже;
   - герой с максимумом доблести 4–5 требует трофея, уникального ресурса или двух находок;
   - все числа — целые.
   Предупреждения (файлы пишутся): расхождения героя с составом — id, имя, источник «крафт». */
const fs = require('fs'), path = require('path');
const C = require('./common');
const OUT_JS = path.join(__dirname, '..', '..', '..', 'design', 'ui', 'recipes.js');
const OUT_MD = path.join(__dirname, 'tables.md');
/* конечные цели: предмет, который не обязан уходить в рецепт */
const TERMINAL = new Set(['hero', 'ruin', 'city', 'call', 'awcall', 'memcall', 'mask', 'valor', 'rune', 'product', 'wallet']);
const REPEAT = new Set(['ruin', 'city', 'call', 'awcall', 'memcall', 'karst', 'fuel', 'recraft']);
const ENER_IDS = [C.ENER.t1, C.ENER.t2, C.ENER.t3];

module.exports = function emit(D) {
  const { items, recipes, byId, CYC, ROMAN, places, memories, warnings } = D;
  const T = C.TIERS, err = [];
  const isDrop = it => !!T[it.tier].drop || !!it.wallet || (it.tier === 'rune' && /^rn\d_1$/.test(it.id));
  const names = {};
  for (const it of items) {
    if (!T[it.tier]) { err.push(`${it.id}: неизвестный ярус ${it.tier}`); continue; }
    if (!C.FAMS[it.fam]) err.push(`${it.id}: неизвестное семейство ${it.fam}`);
    if (names[it.n]) err.push(`повтор названия «${it.n}»: ${names[it.n]} и ${it.id}`); else names[it.n] = it.id;
    for (const f of ['lore', 'hint', 'art']) if (!it[f] || !String(it[f]).trim()) err.push(`${it.id} (${it.n}): нет поля ${f}`);
    if (it.art && /[А-Яа-яЁё]/.test(it.art)) err.push(`${it.id}: в строке арта кириллица — арт пишется по-английски`);
    if (!it.src || !it.src.length) err.push(`${it.id}: нет строки «где падает»`);
  }
  for (const r of recipes) {
    const out = byId[r.out[0]];
    if (!out) { err.push(`${r.id}: нет выхода ${r.out[0]}`); continue; }
    if (out.cyc > r.cyc) err.push(`${r.id}: рецепт цикла ${r.cyc} создаёт предмет цикла ${out.cyc}`);
    if (isDrop(out) && !out.wallet && !(out.tier === 'vshard' && r.fam === 'dust')) err.push(`${r.id}: рецепт создаёт ресурс добычи ${out.id}`);
    if (!Number.isInteger(r.out[1]) || r.out[1] < 1) err.push(`${r.id}: выход не целый`);
    if (r.in.length < 1 || r.in.length > 6) err.push(`${r.id}: ячеек ${r.in.length}, нужно от 1 до 6`);
    if (!r.why) err.push(`${r.id}: нет строки «зачем»`);
    const seen = new Set(), perSpec = {}; let cur = false;
    for (const [id, q] of r.in) {
      const it = byId[id];
      if (!it) { err.push(`${r.id}: нет входа ${id}`); continue; }
      if (seen.has(id)) err.push(`${r.id}: вход ${id} дважды`); seen.add(id);
      if (id === r.out[0]) err.push(`${r.id}: выход среди входов`);
      if (!Number.isInteger(q) || q < 1 || q > 100) err.push(`${r.id}: количество ${q} вне 1–100`);
      if (it.cyc > r.cyc) err.push(`${r.id}: вход ${id} из будущего цикла ${it.cyc}`);
      if (it.cyc === r.cyc && !it.pool && !(it.wallet && r.cyc > 1)) cur = true;
      if (it.team && !r.team) err.push(`${r.id}: спойлерный вход ${id} в открытом рецепте`);
      if (T[it.tier].res && it.spec) perSpec[it.spec] = (perSpec[it.spec] || 0) + 1;
    }
    if (!cur) err.push(`${r.id}: ни одного входа своего цикла ${r.cyc}`);
    for (const [s, n] of Object.entries(perSpec)) if (n > 2) err.push(`${r.id}: ${n} ресурса ремесла «${C.SPECS[s].n}» — по §9.2 не больше двух`);
  }
  if (err.length) return fail(err, warnings);
  /* достижимость до неподвижной точки */
  const have = new Set(items.filter(isDrop).map(i => i.id));
  for (let grew = true; grew;) { grew = false; for (const r of recipes) if (!have.has(r.out[0]) && r.in.every(([id]) => have.has(id))) { have.add(r.out[0]); grew = true; } }
  for (const it of items) if (!have.has(it.id)) err.push(`${it.id} (${it.n}): недостижим — не падает и не создаётся из достижимого`);
  const USE = {}, OUT = {};
  for (const r of recipes) { r.in.forEach(([id]) => (USE[id] = USE[id] || []).push(r)); (OUT[r.out[0]] = OUT[r.out[0]] || []).push(r); }
  for (const it of items) if (!USE[it.id] && !TERMINAL.has(it.fam)) err.push(`${it.id} (${it.n}): мёртвый — не конечная цель и не нужен ни в одном рецепте`);
  for (const it of items) if (!isDrop(it) && !OUT[it.id]) err.push(`${it.id} (${it.n}): не падает и нет рецепта`);
  /* лестница Энериума — ровно по слову автора */
  const E = C.ENER, ladder = [[E.t2, E.t1], [E.t3, E.t2]];
  for (const [o, i] of ladder) if (!(OUT[o] || []).some(r => r.out[1] === 1 && r.in.length === 1 && r.in[0][0] === i && r.in[0][1] === E.step))
    err.push(`лестница Энериума: нет рецепта «${E.step} × ${i} → 1 × ${o}»`);
  if (err.length) return fail(err, warnings);

  /* полная цена: во что обходится одно создание рецепта в ресурсах добычи (первый рецепт каждого промежуточного узла) */
  function need(id, q, acc, depth = 0) {
    const it = byId[id];
    if (isDrop(it) || depth > 30) { acc[id] = (acc[id] || 0) + q; return acc; }
    const r = OUT[id][0], crafts = Math.ceil(q / r.out[1]);
    for (const [x, qx] of r.in) need(x, qx * crafts, acc, depth + 1);
    return acc;
  }
  const bomOf = r => r.in.reduce((acc, [id, q]) => need(id, q, acc), {});
  const WEIGHT = { basic: 1, key: 3, craftres: 2, find: 25, unique: 60, trophy: 120, echo: 60, vshard: 1, rune: 1 };
  const WALLET_W = { energ: 1, rkey: 5 };
  const weightOf = bom => Object.entries(bom).reduce((a, [id, q]) => a + q * (WALLET_W[id] || WEIGHT[byId[id].tier] || 1), 0);
  for (const r of recipes) { r.bom = bomOf(r); r.weight = weightOf(r.bom); }
  for (const r of recipes.filter(x => x.kind === 'hero')) {
    const h = byId[r.out[0]], b = r.bom, rare = Object.keys(b).filter(id => ['trophy', 'unique'].includes(byId[id].tier)).length, finds = Object.keys(b).filter(id => byId[id].tier === 'find').reduce((a, id) => a + b[id], 0);
    if (h.maxV >= 4 && !rare && finds < 2) err.push(`${r.id}: герой с максимумом доблести ${h.maxV} без трофея, уникального ресурса или двух находок`);
  }
  /* рунные ключи — слово автора 30.09.2026 (ADR-0033): падают только с боссов биома, у донатного сета ключников, в сундуках с малым
     шансом и за контракты. Рецептов ключей нет, у крафтовых мест и призванных врагов ключа нет — малый шанс живёт в их сундуке */
  for (const r of recipes) if (r.out[0] === 'rkey') err.push(`${r.id}: рецепт создаёт рунные ключи — их дают только боссы биома, сет ключников, сундуки и контракты (ADR-0033)`);
  for (const [k, v] of Object.entries(C.CRAFT)) if (v && v.runeKeyBp) err.push(`CRAFT.${k}: рунный ключ ${v.runeKeyBp} б. п. — у крафтовых мест и призванных врагов его нет (ADR-0033)`);
  /* призывы врагов: Энериум своей ступени и уникальный ресурс босса биома — сам или через перекрафт */
  const calls = recipes.filter(r => byId[r.out[0]].tier === 'call');
  for (const r of calls) {
    if (!r.in.some(([id]) => ENER_IDS.includes(id))) err.push(`${r.id}: призыв без Энериума (слово автора, 30.09.2026)`);
    if (!Object.keys(r.bom).some(id => byId[id].tier === 'unique')) err.push(`${r.id}: призыв без уникального ресурса босса биома и без его перекрафта`);
  }
  for (const m of memories) {
    const rc = (OUT[m.recraft] || [])[0], mc = (OUT[m.call] || [])[0];
    if (!rc || !rc.in.some(([id]) => id === m.unique)) err.push(`${m.recraft}: перекрафт без уникального ресурса ${m.unique}`);
    if (!mc || !mc.in.some(([id]) => id === m.recraft)) err.push(`${m.call}: призыв эха без перекрафта ${m.recraft}`);
  }
  /* ключи в стоке: полная цена повторяемых рецептов */
  const repeat = recipes.filter(r => REPEAT.has(r.fam));
  const inRepeat = new Set(repeat.flatMap(r => Object.keys(r.bom)));
  for (const it of items.filter(i => i.tier === 'key')) {
    if (!inRepeat.has(it.id)) err.push(`${it.id} (${it.n}): ключ не стоит ни в одной активации, призыве, карсте или топливе — излишек копился бы`);
    if ((USE[it.id] || []).length < 2) err.push(`${it.id} (${it.n}): ключ нужен только в одном рецепте — нет развилки`);
  }
  for (const p of places) {
    const r = (OUT[p.boss.call] || [])[0]; if (!r) { err.push(`${p.boss.call}: нет рецепта призыва`); continue; }
    if (!r.in.some(([id]) => p.finds.includes(id))) err.push(`${r.id}: призыв без находки своего места «${p.n}»`);
    const a = p.boss.awake, ra = a && (OUT[a.call] || [])[0];
    if (!ra) { err.push(`${p.boss.id}: нет пробуждённого босса и рецепта его призыва (ADR-0025)`); continue; }
    for (const need of [p.boss.call, C.CRAFT.awake.item]) if (!ra.in.some(([id]) => id === need)) err.push(`${ra.id}: пробуждение без «${byId[need] ? byId[need].n : need}»`);
    if (!ra.in.some(([id]) => p.finds.includes(id))) err.push(`${ra.id}: пробуждение без находки своего места`);
  }
  /* места цепочкой: какие места нужны активации (по её полной цене), без мест, открытых позже */
  const order = Object.fromEntries(places.map(p => [p.id, p.order]));
  for (const p of places) {
    const r = OUT[p.act][0], needs = [...new Set(Object.keys(r.bom).map(id => byId[id].b).filter(b => b && order[b] !== undefined))];
    p.needs = needs;
    for (const b of needs) if (order[b] >= order[p.id]) err.push(`${r.id}: активация «${p.n}» требует добычи места «${places.find(x => x.id === b).n}», которое открывается не раньше`);
  }
  if (err.length) return fail(err, warnings);

  const sheets = require('./sheets')(items, CYC);
  const stats = buildStats(items, recipes, CYC, places, USE, byId, isDrop);
  const drops = buildDrops(CYC, places, memories, items, recipes, byId);
  const sink = require('./sink')({ items, recipes, byId, CYC, places, memories, OUT, isDrop, need });
  stats.sink = sink.summary;
  /* веса видов ресурса места — из модели стока: доля вида в расходе, не ниже пола (common.js, CRAFT.biome.resFloorBp) */
  const RW = {}; for (const d of sink.detail) for (const p of d.places) RW[p.id] = p.types.map(t => t.wBp);
  for (const b of drops.craftBiomes) { b.resWBp = RW[b.id]; if (!b.resWBp || b.resWBp.length !== b.res.length || b.resWBp.reduce((a, x) => a + x, 0) !== 10000) err.push(`веса ресурсов ${b.id}: не сходятся`); }
  const ints = (o, p) => { if (typeof o === 'number') { if (!Number.isInteger(o)) err.push('не целое: ' + p); } else if (o && typeof o === 'object') for (const k in o) ints(o[k], p + '.' + k); };
  ints(drops, 'drops'); ints(stats, 'stats'); ints(recipes.map(r => [r.in, r.out, r.bom, r.weight]), 'recipes'); ints(sink, 'sink');
  if (err.length) return fail(err, warnings);
  writeJs({ items, recipes, drops, stats, CYC, ROMAN, places, memories, sheets });
  require('./tables')({ items, recipes, byId, CYC, ROMAN, places, memories, drops, stats, USE, OUT, isDrop, OUT_MD, sheets, sink });
  if (warnings.length) console.log('Предупреждения:\n' + warnings.join('\n'));
  const T0 = stats.total;
  console.log(`Готово: ${T0.items} предметов (добыча ${T0.drops}, создаётся ${T0.crafted}), ${T0.recipes} рецептов; мест ${places.length}, эха боссов ${memories.length}, листов иконок ${sheets.length}`);
  console.log('По циклам — предметы:', stats.byCycle.map(s => s.items).join(' / '), '· рецепты:', stats.byCycle.map(s => s.recipes).join(' / '));
  console.log('Сток ключей цикла, % от выпадения у обычного:', sink.summary.map(s => `${ROMAN[s.cyc]} ${s.keysPct}% (${s.keyMinPct}–${s.keyMaxPct})`).join(' · '));
  console.log('Сток базовых, %:', sink.summary.map(s => `${ROMAN[s.cyc]} ${s.basicsPct}%`).join(' · '));
};

function fail(err, warnings) {
  if (warnings && warnings.length) console.log('Предупреждения:\n' + warnings.join('\n'));
  console.log('ОШИБКИ:\n' + err.join('\n')); process.exitCode = 1;
}

function buildStats(items, recipes, CYC, places, USE, byId, isDrop) {
  const tiers = Object.keys(C.TIERS), fams = Object.keys(C.FAMS), kinds = ['part', 'made', 'act', 'call', 'hero', 'product', 'story', 'rune', 'valor'];
  const RES = ['basic', 'key', 'unique', 'craftres', 'find', 'trophy'];
  const byCycle = CYC.map(cy => {
    const c = cy.n, its = items.filter(i => i.cyc === c && !i.pool), recs = recipes.filter(r => r.cyc === c);
    const tierCount = Object.fromEntries(tiers.map(t => [t, its.filter(i => i.tier === t).length]));
    const famCount = Object.fromEntries(fams.map(f => [f, its.filter(i => i.fam === f).length]));
    const kindCount = Object.fromEntries(kinds.map(k => [k, recs.filter(r => r.kind === k).length]));
    const famRec = Object.fromEntries(fams.map(f => [f, recs.filter(r => r.fam === f).length]));
    /* развилка — предмет, который открытые к этому циклу рецепты (циклы 1…N) тянут хотя бы в два места */
    const open = recipes.filter(r => r.cyc <= c), uses = {};
    for (const r of open) for (const [id] of r.in) uses[id] = (uses[id] || 0) + 1;
    const forks = Object.values(uses).filter(n => n >= 2).length, edges = Object.values(uses).reduce((a, n) => a + n, 0);
    /* биомы и места, чья собственная добыча входит в полную цену рецептов этого цикла; общий пул падает везде и не считается */
    const src = new Set(); for (const r of recs) for (const id of Object.keys(r.bom)) { const it = byId[id]; if (it.b) src.add(it.b); }
    const poolUsed = new Set(); for (const r of recs) for (const [id] of r.in) if (byId[id].pool) poolUsed.add(id);
    /* глубина цепочки: самый длинный путь от добычи до выхода рецепта цикла */
    return { cyc: c, items: its.length, drops: its.filter(isDrop).length, crafted: its.filter(i => !isDrop(i)).length,
      resources: its.filter(i => RES.includes(i.tier)).length, poolUsed: poolUsed.size,
      recipes: recs.length, recipesNoRunes: recs.filter(r => r.kind !== 'rune' && r.kind !== 'valor').length,
      tiers: tierCount, fams: famCount, kinds: kindCount, famRecipes: famRec, forks, edges, biomesInChains: src.size,
      crossCycleInputs: recs.reduce((a, r) => a + r.in.filter(([id]) => byId[id].cyc < c && !byId[id].pool && !byId[id].wallet).length, 0),
      depth: Math.max(0, ...recs.map(r => depthOf(r.out[0], byId, recipes))) };
  });
  const total = { items: items.length, recipes: recipes.length, pool: items.filter(i => i.pool).length,
    drops: items.filter(isDrop).length, crafted: items.filter(i => !isDrop(i)).length,
    resources: items.filter(i => RES.includes(i.tier)).length,
    tiers: Object.fromEntries(tiers.map(t => [t, items.filter(i => i.tier === t).length])),
    fams: Object.fromEntries(fams.map(f => [f, items.filter(i => i.fam === f).length])),
    famRecipes: Object.fromEntries(fams.map(f => [f, recipes.filter(r => r.fam === f).length])),
    craftBiomes: places.length, ruins: places.filter(p => p.kind === 'ruin').length, cities: places.filter(p => p.kind === 'city').length,
    craftBosses: places.length + 1, awakened: places.filter(p => p.boss.awake).length,
    forks: Object.values(USE).filter(l => l.length >= 2).length };
  return { byCycle, total };
}
const DEPTH = {};
function depthOf(id, byId, recipes) {
  if (DEPTH[id] !== undefined) return DEPTH[id];
  DEPTH[id] = 0;
  const r = recipes.find(x => x.out[0] === id); const it = byId[id];
  if (!r || C.TIERS[it.tier].drop || it.wallet) return (DEPTH[id] = 0);
  return (DEPTH[id] = 1 + Math.max(...r.in.map(([x]) => depthOf(x, byId, recipes))));
}

function buildDrops(CYC, places, memories, items, recipes, byId) {
  const E = C.ENEMY, S = E.spirit, cyc6 = [1, 2, 3, 4, 5, 6];
  const mulHalf = (base, c, second) => base * (2 * c + (second ? 1 : 0)) / 2;   // × (цикл + 0,5) во втором биоме; базы чётные — результат целый
  /* базовых за забег × 100: этажей × шанс × среднее за срабатывание (1 + номер биома) / 2 */
  const basicsX100 = (floors, bn) => floors * E.basePerFloorBp * (1 + bn) / 200;
  const perRun = (deck, bn, c) => ({ basicsX100: basicsX100(deck.floors, bn), specKeys: deck.elites, souls: deck.elites * C.ENEMY.soulsElitePerBiome * bn + C.ENEMY.soulsBossPerBiome * bn,
    runeKeysPer100: E.bossRuneKeyBp / 100 * c, uniquePer100: E.uniqueBp / 100 });
  const enemies = [];
  for (const cy of CYC) cy.biomes.forEach((b, i) => {
    const c = cy.n, bn = +b.id.slice(1), deck = C.DECKS[b.deck];
    const b2 = i === 1 && E.biome2Pct && E.biome2Pct[c];   // исключение второго биома цикла: % ставки × цикл (common.js, ENEMY.biome2Pct)
    const sp = k => b2 ? Math.floor(S[k] * c * b2 / 100) : mulHalf(S[k], c, i === 1), rank = k => ({ spirit: sp(k), gold: Math.floor(sp(k) / 2) });
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
  const CB = C.CRAFT.biome, CS = C.CRAFT.boss, CM = C.CRAFT.memory, TY = C.CRAFT.type;   // TY — тип призванного врага по виду призыва (ADR-0039)
  const craftBiomes = places.map(p => ({ id: p.id, name: p.n, kind: p.kind, city: p.city || undefined, cyc: p.cyc, act: p.act, needs: p.needs, res: p.res, find: p.find, finds: CB.finds, findIds: p.finds,
    floors: CB.floors, resPerFloorBp: CB.resPerFloorBp, secondFindBp: CB.secondFindBp, spirit: CB.spirit * p.cyc, gold: CB.spirit * p.cyc / 2, souls: CB.souls * p.cyc, heroShards: CB.heroShards * p.cyc,
    eventPoints: CB.eventPoints, runeKeyBp: CB.runeKeyBp, runeKeys: p.cyc, team: p.team }));
  const craftBosses = places.map(p => ({ id: p.boss.id, name: p.boss.label, kind: p.kind === 'city' ? 'city' : 'ruin', g: TY[p.kind === 'city' ? 'city' : 'ruin'], cyc: p.cyc, spec: p.boss.spec, race: p.boss.race, call: p.boss.call, trophy: p.boss.trophy,
    trophies: CS.trophies, specKeys: CS.specKeys, spirit: CS.spirit * p.cyc, gold: CS.spirit * p.cyc / 2, enerium: CS.enerium * p.cyc, runeKeyBp: CS.runeKeyBp, runeKeys: p.cyc,
    workerBoxRarity: Math.min(7, p.cyc + 1), summonSouls: CS.summonSouls, team: p.team }))
    .concat([{ id: 'lik', name: 'Лик недели', kind: 'mask', g: TY.mask, cyc: 2, spec: null, race: 'раса недели', call: 'mask', trophy: null, trophies: 0, heroShardsWeekBp: C.CRAFT.lik.heroShardsWeekBp, specKeys: 0, spirit: 0, gold: 0, enerium: 0,
      runeKeyBp: 0, runeKeys: 0, workerBoxRarity: 0, summonSouls: CS.summonSouls, team: false }]);
  /* эхо боссов биомов: тот же вид записи; kind — memory */
  for (const m of memories) craftBosses.push({ id: m.id, name: m.label, kind: 'memory', g: TY.memory, cyc: m.cyc, spec: m.spec, race: m.race, call: m.call, trophy: m.trophy,
    trophies: CM.trophies, specKeys: CM.specKeys, spirit: CM.spirit * m.cyc, gold: CM.spirit * m.cyc / 2, enerium: CM.enerium * m.cyc, runeKeyBp: CM.runeKeyBp, runeKeys: m.cyc,
    workerBoxRarity: Math.min(7, m.cyc + 1 + CM.chestStep), summonSouls: CS.summonSouls, team: m.team, biome: m.biome });
  /* пробуждённые (ADR-0025): тот же вид записи, что у босса руины; cyc — цикл, с которого есть рецепт пробуждения.
     awake — id обычного босса; тип — Пробуждённый (ADR-0039, ADR-0054), powerCycleStep — сила его типа на столько циклов выше; трофей — свой. */
  const AW = C.CRAFT.awake;
  for (const p of places.filter(x => x.boss.awake)) { const a = p.boss.awake, c = a.cyc, cur = CS.spirit * c * AW.currencyMul;
    craftBosses.push({ id: a.id, name: a.label, kind: 'awake', g: TY.awake, cyc: c, spec: p.boss.spec, race: p.boss.race, call: a.call, trophy: p.boss.awTrophy,
      trophies: AW.trophies, specKeys: AW.specKeys, spirit: cur, gold: cur / 2, enerium: CS.enerium * c * AW.currencyMul, runeKeyBp: AW.runeKeyBp, runeKeys: c,
      workerBoxRarity: Math.min(7, c + 1 + AW.chestStep), summonSouls: CS.summonSouls, team: p.team || !!CYC[c - 1].team,
      awake: p.boss.id, powerCycleStep: AW.powerCycleStep }); }
  /* тип по силе — у каждого (ADR-0039): от него раунды, рамка, иммунитет и сундук; «крафтового» типа нет */
  for (const b of craftBosses) if (!['e', 'b', 'u', 'a'].includes(b.g)) throw new Error(`${b.id} «${b.name}»: нет типа по силе (CRAFT.type, вид ${b.kind})`);
  const M = C.MARKET;
  const market = { basic: cyc6.map(c => M.basic * c), key: cyc6.map(c => M.key * c), craftres: cyc6.map(c => M.craftres * c), unique: cyc6.map(c => M.unique * c),
    find: cyc6.map(c => M.find * c), trophy: cyc6.map(c => M.trophy * c), commissionPct: M.commissionPct, soulsTradable: false };
  /* для сборщика сундуков (tools/content-gen/lootboxes): общий пул базовых и наборы по циклам и ярусам. Что делается по рецепту, сундук не выдаёт (ADR-0023, п. 7). */
  const pools = cyc6.map(c => {
    const its = items.filter(i => i.cyc === c && !i.pool), ids = t => its.filter(i => i.tier === t).map(i => i.id);
    return { cyc: c, key: ids('key'), unique: ids('unique'), craftres: ids('craftres'), find: ids('find'), trophy: ids('trophy'), products: its.filter(i => i.tier === 'product' && !i.wallet).map(i => i.id) };
  });
  return {
    enemies, guardians, dailyGuardianCap: C.GUARD.dailyCap,
    echo: Object.assign({}, C.ECHO, { uber: C.ECHO.many }),   // uber — прежнее имя той же записи: его читают экран Эхо и его проверки; снять, когда перейдут на echo.many
    payouts: 'design/ui/lootboxes.js',
    lootboxes: { basicPool: items.filter(i => i.pool).map(i => i.id), pools },
    activeSlots: { shared: true, art: C.CRAFT.activeArt },   // слот даёт артефакт активных биомов (wanderer.js), не номер цикла (ADR-0054)
    craftBiomes, craftBosses, market,
    ener: { t1: C.ENER.t1, t2: C.ENER.t2, t3: C.ENER.t3, step: C.ENER.step },
    dust: Object.assign({}, C.DUST),
  };
}

function writeJs({ items, recipes, drops, stats, CYC, ROMAN, places, memories, sheets }) {
  const J = v => Array.isArray(v) ? '[' + v.map(J).join(', ') + ']'
    : v && typeof v === 'object' ? '{ ' + Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => (/^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + J(x)).join(', ') + ' }'
    : JSON.stringify(v);
  const cycles = CYC.map(cy => ({ n: cy.n, roman: ROMAN[cy.n], god: cy.god, el: cy.el, karst: cy.karst, team: !!cy.team, about: cy.about,
    biomes: cy.biomes.map(b => ({ id: b.id, n: b.n, kind: b.kind, boss: b.boss, guard: b.guard, guardKind: b.guardKind })),
    craft: places.filter(p => p.cyc === cy.n).map(p => p.id),
    craftBiome: places.filter(p => p.cyc === cy.n).map(p => p.n).join(', '),
    craftBoss: places.filter(p => p.cyc === cy.n).map(p => p.boss.label).join(', ') }));
  const keysOrder = ['id', 'n', 'cyc', 'b', 'pool', 'place', 'city', 'tier', 'fam', 'spec', 'r', 'img', 'glyph', 'boss', 'foe', 'opens', 'opensLore', 'heroId', 'cls', 'race', 'school', 'maxV', 'week', 'wallet', 'team', 'sheet', 'lore', 'hint', 'art', 'src'];
  const clean = it => { const o = {}; for (const k of keysOrder) if (it[k] !== undefined && it[k] !== null && !(['team', 'pool'].includes(k) && !it[k])) o[k] = it[k]; return o; };
  const rkeys = ['id', 'cyc', 'n', 'kind', 'fam', 'out', 'in', 'known0', 'hidden', 'sinkMain', 'team', 'why', 'weight'];
  const rclean = r => { const o = {}; for (const k of rkeys) if (r[k] !== undefined && !(['team', 'known0', 'hidden', 'sinkMain'].includes(k) && !r[k])) o[k] = r[k]; return o; };
  const out = `/* Энериум · ресурсы и древо рецептов — данные прототипа «Свет снизу».
   Черновик · предложение · ждёт автора. Собирается tools/content-gen/recipes/ (node build.js), вручную не править.
   Все числа — демонстрация, под прогоны; шансы — в базисных пунктах (10 000 = 100 %).
   Обоснование и летопись — docs/content/ресурсы-рецепты-дроп.md; его таблицы собраны из этих же данных.
   В игре рецепты и таблицы наград живут только на сервере (CLAUDE.md, инварианты; GDD §12, §36.16): клиент получает
   лишь рецепты, уже открытые игроком. Здесь полный набор — для проектирования. Записи с team: true — спойлеры (§38), только для команды.
   pool: true — базовый ресурс общего пула: падает во всех биомах с первого (ADR-0023, п. 1).
   У предмета: tier — ярус (вкладка экрана), fam — семейство (роль в крафте), lore — что это, hint — подсказка Этриона,
   art — вид для иконки, sheet — лист иконок (sheets). wallet — валюта кошелька в ячейке мастерской: энериум, рунные ключи. */
window.EN_RECIPES = {
  specs: ${J(C.SPECS)},
  specOrder: ${J(C.SPEC_ORDER)},
  tiers: ${J(Object.fromEntries(Object.entries(C.TIERS).map(([k, t]) => [k, { n: t.n, r: t.r }])))},
  fams: ${J(C.FAMS)},
  cycles: [
${cycles.map(x => '    ' + J(x)).join(',\n')}
  ],
  places: [
${places.map(x => '    ' + J(x)).join(',\n')}
  ],
  memories: [
${memories.map(x => '    ' + J(x)).join(',\n')}
  ],
  items: [
${items.map(x => '    ' + J(clean(x))).join(',\n')}
  ],
  recipes: [
${recipes.map(x => '    ' + J(rclean(x))).join(',\n')}
  ],
  sheets: [
${sheets.map(x => '    ' + J(x)).join(',\n')}
  ],
  stats: ${J(stats)},
  drops: {
${Object.entries(drops).map(([k, v]) => `    ${k}: ${J(v)}`).join(',\n')}
  },
};
`;
  fs.writeFileSync(OUT_JS, out, 'utf8');
}
