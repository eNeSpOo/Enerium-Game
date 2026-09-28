/* Таблицы для docs/content/ресурсы-рецепты-дроп.md — из тех же данных, что recipes.js. Каждый блок начинается меткой <!-- имя -->.
   Блок inline — числа для текста документа: assemble.js подставляет их вместо {{имя}}. */
const fs = require('fs');
const C = require('./common');
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pct = bp => (bp % 100 ? (bp / 100).toFixed(2).replace('.', ',') : String(bp / 100)) + ' %';
const x100 = n => (n % 100 ? (n / 100).toFixed(2).replace(/0$/, '').replace('.', ',') : String(n / 100));
const KIND = { part: 'заготовка', made: 'изделие', act: 'активация', call: 'призыв', hero: 'герой', product: 'награда', story: 'сюжет', rune: 'руна', valor: 'руна доблести' };
const raceLc = r => ['Забытые', 'Перворождённые'].includes(r) ? r : r.toLowerCase();   // имена народов финала и Эхо — с заглавной, как в своде
const TIER_ORDER = ['trophy', 'unique', 'echo', 'find', 'craftres', 'key', 'vshard', 'rune', 'basic'];

module.exports = function tables({ items, recipes, byId, CYC, ROMAN, places, drops, stats, USE, OUT, isDrop, OUT_MD }) {
  const L = [], block = n => L.push(`\n<!-- ${n} -->\n`);
  const nm = id => byId[id].n;
  const ing = list => list.map(([id, q]) => `${nm(id)} ×${q}`).join(', ');
  const cyLabel = cy => `${ROMAN[cy.n]}${cy.team ? ' · для команды' : ''}`;
  const usedIn = (id, c, max = 4) => {
    const outs = [...new Set((USE[id] || []).map(r => r.out[0]))];
    if (!outs.length) return '—';
    const names = outs.map(o => nm(o) + (c === null || byId[o].cyc !== c ? ` (${ROMAN[byId[o].cyc]})` : ''));
    return names.length > max ? names.slice(0, max).join('; ') + `; ещё ${names.length - max}` : names.join('; ');
  };
  const bomLine = bom => Object.entries(bom).sort((a, b) => TIER_ORDER.indexOf(byId[a[0]].tier) - TIER_ORDER.indexOf(byId[b[0]].tier) || byId[a[0]].cyc - byId[b[0]].cyc)
    .map(([id, q]) => `${nm(id)} ×${q}`).join(', ');
  const pool = items.filter(i => i.pool);

  /* ——— числа для текста ——— */
  const S = stats.byCycle, heroRecs = recipes.filter(r => r.kind === 'hero');
  const valorCount = [1, 2, 3, 4, 5].map(v => `${v} — ${heroRecs.filter(r => byId[r.out[0]].maxV === v).length}`).join(', ');
  const heaviest = recipes.slice().sort((a, b) => b.weight - a.weight)[0], heaviestHero = heroRecs.slice().sort((a, b) => b.weight - a.weight)[0];
  const TT = stats.total.tiers, byRace = {};
  places.forEach(p => { byRace[p.boss.race] = (byRace[p.boss.race] || 0) + 1; });
  const inline = { items: stats.total.items, recipes: stats.total.recipes, runeRecipes: recipes.filter(r => r.kind === 'rune' || r.kind === 'valor').length,
    resources: stats.total.resources, pool: stats.total.pool, key: TT.key, unique: TT.unique, craftres: TT.craftres, find: TT.find, trophy: TT.trophy,
    recipesByCycle: S.map(s => s.recipes).join(' / '), resourcesByCycle: S.map(s => s.resources).join(' / '),
    forksFirst: S[0].forks, forksLast: S[S.length - 1].forks, biomesByCycle: S.map(s => s.biomesInChains).join(' / '),
    heroes: heroRecs.length, heroesByCycle: S.map(s => s.kinds.hero).join(' / '), places: places.length, heroValor: valorCount,
    heaviest: `${heaviest.n} — вес ${heaviest.weight}`, heaviestHero: `${heaviestHero.n} — вес ${heaviestHero.weight}`,
    bossRaces: Object.entries(byRace).map(([r, n]) => `${raceLc(r)} — ${n}`).join(', '),
    awakened: stats.total.awakened, awakeTrophies: C.CRAFT.awake.trophies, awakeKeys: C.CRAFT.awake.specKeys, awakeMul: C.CRAFT.awake.currencyMul,
    awakeChestStep: C.CRAFT.awake.chestStep, awakePowerStep: C.CRAFT.awake.powerCycleStep, awakeRuneKey: pct(C.CRAFT.awake.runeKeyBp), bossRuneKey: pct(C.CRAFT.boss.runeKeyBp),
    manyCycle: ROMAN[byId[C.CRAFT.awake.item].cyc] };
  block('inline');
  for (const [k, v] of Object.entries(inline)) L.push(`${k}: ${v}`);

  /* ——— сводка по циклам ——— */
  block('summary');
  L.push('| Цикл | Ключи элит | Уникальные | Ресурсы руин | Находки | Трофеи | Ресурсов цикла | Базовых общего пула в рецептах цикла | Рецептов | Без рун | Развилок в открытом древе |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of S) { const t = s.tiers, cy = CYC[s.cyc - 1];
    L.push(`| ${cyLabel(cy)} | ${t.key} | ${t.unique} | ${t.craftres} | ${t.find} | ${t.trophy} | ${s.resources} | ${s.poolUsed} из ${stats.total.pool} | ${s.recipes} | ${s.recipesNoRunes} | ${s.forks} |`); }
  const sumR = S.reduce((a, s) => a + s.recipesNoRunes, 0);
  L.push(`| Всего | ${TT.key} | ${TT.unique} | ${TT.craftres} | ${TT.find} | ${TT.trophy} | ${stats.total.resources - stats.total.pool} и ${stats.total.pool} базовых пула | — | ${stats.total.recipes} | ${sumR} | — |`);

  /* ——— общий пул базовых: ремёсла ——— */
  block('pool');
  L.push('| Ремесло | Базовые общего пула |', '|---|---|');
  for (const s of C.SPEC_ORDER) L.push(`| ${C.SPECS[s].n} | ${pool.filter(i => i.spec === s).map(i => i.n).join(', ')} |`);

  /* ——— ключи: биомы × ремёсла ——— */
  block('keys');
  L.push(`| Биом | ${C.SPEC_ORDER.map(s => C.SPECS[s].n).join(' | ')} |`, `|---|${C.SPEC_ORDER.map(() => '---').join('|')}|`);
  for (const cy of CYC) for (const b of cy.biomes)
    L.push(`| ${b.id.slice(1)}. ${b.n}${cy.team ? ' · для команды' : ''} | ${C.SPEC_ORDER.map(s => byId[`k${b.id.slice(1)}_${s}`].n).join(' | ')} |`);

  /* ——— ремёсла по циклам: что делает каждое ——— */
  block('crafts');
  L.push(`| Ремесло | ${CYC.map(cyLabel).join(' | ')} |`, `|---|${CYC.map(() => '---').join('|')}|`);
  for (const s of C.SPEC_ORDER) L.push(`| ${C.SPECS[s].n} | ${CYC.map(cy => items.filter(i => ['part', 'made'].includes(i.tier) && i.cyc === cy.n && i.spec && i.spec.split('+')[0] === s).map(i => i.n).join(', ') || '—').join(' | ')} |`);

  /* ——— уникальные ——— */
  block('uniques');
  L.push('| Цикл | Биом | Босс биома | Уникальный ресурс | Входной билет и тяжёлые рецепты |', '|---|---|---|---|---|');
  for (const it of items.filter(i => i.tier === 'unique')) { const cy = CYC[it.cyc - 1], b = cy.biomes.find(x => x.id === it.b);
    L.push(`| ${cyLabel(cy)} | ${b.id.slice(1)}. ${b.n} | ${b.boss} | ${it.n} | ${usedIn(it.id, it.cyc)} |`); }

  /* ——— крафтовые биомы и боссы ——— */
  block('craft places');
  L.push('| Цикл | Крафтовый биом | Где | Активация — из чего | Нужна добыча руин | Ресурсы руины | Находка | Крафтовый босс · раса · ремесло | Призыв — из чего | Трофей |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const p of places) { const act = OUT[p.act][0], call = OUT[p.boss.call][0];
    L.push(`| ${cyLabel(CYC[p.cyc - 1])} | ${p.n} | ${p.where} | ${nm(p.act)}: ${ing(act.in)} | ${p.needs.length ? p.needs.map(b => places.find(x => x.id === b).n).join(', ') : '—'} | ${p.res.map(nm).join(', ')} | ${nm(p.find)} | ${p.boss.label} · ${raceLc(p.boss.race)} · ${C.SPECS[p.boss.spec].n.toLowerCase()} | ${nm(p.boss.call)}: ${ing(call.in)} | ${nm(p.boss.trophy)} |`); }

  /* ——— пробуждённые крафтовые боссы (ADR-0025): призыв, сила и лут против обычного ——— */
  block('awakened');
  const AW = C.CRAFT.awake, CB = drops.craftBosses, RN = Object.keys(C.RARITY);   // RARITY — имя → номер по порядку
  L.push('| Цикл | Пробуждённый босс | Руина | Призыв — из чего | Сила | Трофей | Ключи ремесла | Дух / золото / Энериум — заглушка | Рунный ключ | Сундук крафтового босса, редкость |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const p of places) { const a = p.boss.awake, w = CB.find(b => b.id === a.id), o = CB.find(b => b.id === p.boss.id), r = OUT[a.call][0], up = a.cyc + AW.powerCycleStep;
    const same = CB.find(b => !b.awake && b.trophy && b.cyc === a.cyc);   // обычный крафтовый босс того же цикла — для сравнения сундука
    L.push(`| ${cyLabel(CYC[a.cyc - 1])} | ${a.label} | ${p.n} | ${nm(a.call)}: ${ing(r.in)} | как крафтовый босс ${up <= CYC.length ? 'цикла ' + ROMAN[up] : 'на ' + AW.powerCycleStep + ' цикл выше ' + ROMAN[a.cyc]} | ${nm(w.trophy)} ×${w.trophies} (обычный — ×${o.trophies}) | ${w.specKeys} (обычный — ${o.specKeys}) | ${fmt(w.spirit)} / ${fmt(w.gold)} / ${w.enerium} | ${pct(w.runeKeyBp)} × ${w.runeKeys} | ${RN[w.workerBoxRarity - 1]} (у обычного крафтового босса цикла ${ROMAN[a.cyc]} — ${RN[same.workerBoxRarity - 1]}) |`); }

  /* ——— каталог: общий пул ——— */
  block('pool catalog');
  L.push('| Ресурс | Ремесло | Идёт в | Строка для игрока |', '|---|---|---|---|');
  for (const it of pool) L.push(`| ${it.n} | ${C.SPECS[it.spec].n.toLowerCase()} | ${usedIn(it.id, null, 5)} | ${it.lore} |`);

  /* ——— каталог по циклам ——— */
  for (const cy of CYC) {
    const c = cy.n;
    block(`cycle ${c} resources`);
    for (const b of cy.biomes) {
      L.push(`\n**${b.id.slice(1)}. ${b.n}** — ${b.kind}; босс «${b.boss}», рунный страж «${b.guard}».${cy.team ? ' **Для команды: спойлер §38.**' : ''}\n`);
      L.push('| Ресурс | Ярус | Ремесло | Откуда | Идёт в | Строка для игрока |', '|---|---|---|---|---|---|');
      for (const it of items.filter(x => x.b === b.id && ['key', 'unique'].includes(x.tier))) {
        const where = it.tier === 'key' ? 'любая элита биома, один из шести наугад' : `босс «${b.boss}», ${pct(C.ENEMY.uniqueBp)}`;
        L.push(`| ${it.n} | ${C.TIERS[it.tier].n.toLowerCase()} | ${it.spec ? C.SPECS[it.spec].n.toLowerCase() : '—'} | ${where} | ${usedIn(it.id, c)} | ${it.lore} |`);
      }
    }
    for (const p of places.filter(x => x.cyc === c)) {
      L.push(`\n**Крафтовый биом «${p.n}»** — ${p.where}. Кто там — предложение: ${p.foes}. Босс — ${p.boss.label}, ${raceLc(p.boss.race)}.${p.team ? ' **Для команды.**' : ''}\n`);
      L.push('| Предмет | Ярус | Ремесло | Откуда | Идёт в | Строка для игрока |', '|---|---|---|---|---|---|');
      for (const id of [p.act, ...p.res, p.find, p.boss.call, p.boss.awake.call, p.boss.trophy]) { const it = byId[id];
        const where = it.tier === 'act' || it.tier === 'call' ? `мастерская, рецепт${it.cyc !== c ? ', с цикла ' + ROMAN[it.cyc] : ''}` : it.tier === 'craftres' ? `этаж, ${pct(C.CRAFT.biome.resPerFloorBp)}` : it.tier === 'find' ? `1 за закрытие + ${pct(C.CRAFT.biome.secondFindBp)}` : `«${p.boss.label}», 1 за победу; пробуждённый — ${C.CRAFT.awake.trophies}`;
        const goes = it.tier === 'act' ? `призывает «${p.n}» в «Биомах»` : it.tier === 'call' ? `призывает «${it.opens}» в Эхо` : usedIn(id, c);
        L.push(`| ${it.n} | ${C.TIERS[it.tier].n.toLowerCase()} | ${it.spec ? C.SPECS[it.spec].n.toLowerCase() : '—'} | ${where} | ${goes} | ${it.lore} |`); }
    }
    block(`cycle ${c} recipes`);
    L.push('| Рецепт | Вид | Входы | Выход | Зачем |', '|---|---|---|---|---|');
    for (const r of recipes.filter(x => x.cyc === c && x.kind !== 'rune' && x.kind !== 'valor'))
      L.push(`| ${r.n} | ${KIND[r.kind]} | ${ing(r.in)} | ${nm(r.out[0])} ×${r.out[1]} | ${r.why} |`);
    const rn = recipes.filter(x => x.cyc === c && x.kind === 'rune');
    L.push(`| Руны пределов II–V | руна | по три младшие руны + ${rn.map(r => nm(r.in[1][0])).join(' / ')} | руна следующего предела ×1 | Перековка младших рун в старшие (§10.1). |`);
    L.push(`| Руна доблести · цикл ${ROMAN[c]} | руна доблести | Осколок доблести ×100 | Руна доблести ×1 | Известна с первого осколка (§10.2). |`);
  }

  /* ——— набор обучения: первые рецепты и первая активация ——— */
  block('tutorial kit');
  const kitRecipes = ['r_p_coal', 'r_p_clay', 'r_p_fang', 'r_act_cb1'].map(id => recipes.find(r => r.id === id));
  L.push('| Шаг обучения | Рецепт | Что выдать, если не выпало |', '|---|---|---|');
  const step = ['первый рецепт', 'первый рецепт', 'первый рецепт', 'первая активация крафтового биома'];
  kitRecipes.forEach((r, i) => L.push(`| ${step[i]} | ${r.n} | ${bomLine(r.bom)} |`));

  /* ——— герои из скрытых рецептов ——— */
  block('heroes');
  L.push('| Цикл | Герой | Класс · раса · стихия | Редкость | Максимум доблести | Рецепт | Вес |', '|---|---|---|---|---|---|---|');
  for (const r of heroRecs) { const h = byId[r.out[0]];
    L.push(`| ${cyLabel(CYC[h.cyc - 1])} | ${h.n} | ${h.cls} · ${h.race} · ${h.school} | ${Object.keys(C.RARITY).find(k => C.RARITY[k] === h.r)} | ${h.maxV} | ${ing(r.in)} | ${r.weight} |`); }

  /* ——— полная цена ——— */
  block('bom');
  L.push('| Цикл | Рецепт | Вид | Вес | Полная цена в ресурсах добычи |', '|---|---|---|---|---|');
  for (const r of recipes.filter(x => ['act', 'call', 'hero', 'product', 'story'].includes(x.kind)))
    L.push(`| ${cyLabel(CYC[r.cyc - 1])} | ${r.n}${r.out[1] > 1 ? ' ×' + r.out[1] : ''} | ${KIND[r.kind]} | ${r.weight} | ${bomLine(r.bom)} |`);

  /* ——— развилки ——— */
  block('forks');
  L.push('| Цикл | Рецептов открыто всего | Развилок | Связей «ресурс → рецепт» | Биомов и руин в цепочках рецептов цикла | Входов из прошлых циклов |', '|---|---|---|---|---|---|');
  for (const s of S) L.push(`| ${cyLabel(CYC[s.cyc - 1])} | ${recipes.filter(r => r.cyc <= s.cyc).length} | ${s.forks} | ${s.edges} | ${s.biomesInChains} | ${s.crossCycleInputs} |`);

  /* ——— враги и добыча за забег ——— */
  block('enemies');
  L.push('| Биом | Цикл | Колода: этажей / элит | Базовые: шанс за этаж / за срабатывание | Рядовой: дух / золото | Элита: дух / золото / души | Босс: дух / золото / души / рунный ключ | Страж: дух / золото |', '|---|---|---|---|---|---|---|---|');
  for (const e of drops.enemies) L.push(`| ${e.biome.slice(1)}. ${e.team ? 'для команды' : e.name} | ${ROMAN[e.cyc]} | ${e.floors} / ${e.elites} | ${pct(e.basePerFloorBp)} / ${e.basicsPerTriggerMax > 1 ? '1–' + e.basicsPerTriggerMax : '1'} | ${fmt(e.ordinary.spirit)} / ${fmt(e.ordinary.gold)} | ${fmt(e.elite.spirit)} / ${fmt(e.elite.gold)} / ${e.elite.souls} | ${fmt(e.boss.spirit)} / ${fmt(e.boss.gold)} / ${e.boss.souls} / ${pct(e.boss.runeKeyBp)} × ${e.boss.runeKeys} | ${fmt(e.guard.spirit)} / ${fmt(e.guard.gold)} |`);
  block('per run');
  L.push('| Биом | Базовых за забег | После обучения | Ключей ремёсел | Душ | Рунных ключей на 100 забегов | Уникальный |', '|---|---|---|---|---|---|---|');
  for (const e of drops.enemies) L.push(`| ${e.biome.slice(1)}. ${e.team ? 'для команды' : e.name} | около ${x100(e.perRun.basicsX100)} | ${e.perRunAfterTutorial ? 'около ' + x100(e.perRunAfterTutorial.basicsX100) : '—'} | ${e.perRun.specKeys}${e.perRunAfterTutorial ? ' → ' + e.perRunAfterTutorial.specKeys : ''} | ${e.perRun.souls}${e.perRunAfterTutorial ? ' → ' + e.perRunAfterTutorial.souls : ''} | ${e.perRun.runeKeysPer100} | ${e.perRun.uniquePer100} раз на 100 закрытий |`);

  block('guardians');
  L.push('| Цикл | Страж пределов | Вход, ключей | Страж доблести | Вход, ключей |', '|---|---|---|---|---|');
  for (const cy of CYC) { const g = drops.guardians.filter(x => x.cyc === cy.n);
    L.push(cy.team ? `| ${ROMAN[cy.n]} | для команды | ${g[0].entryKeys} | для команды | ${g[1].entryKeys} |` : `| ${ROMAN[cy.n]} | ${g[0].name} | ${g[0].entryKeys} | ${g[1].name} | ${g[1].entryKeys} |`); }

  block('rituals heroes');
  const W = drops.rituals.workers, HR = drops.rituals.heroes;
  L.push('| Редкость | Рабочие: время | Базовые | Ключи ремёсел | Герои: время | Золото | Дух | Души |', '|---|---|---|---|---|---|---|---|');
  for (let r = 0; r < 7; r++) L.push(`| ${r + 1} | ${W.minutes[r]} мин | ${W.basics[r]} | ${W.keys[r]} | ${HR.minutes[r] / 60} ч | ${fmt(HR.byCycle[0].gold[r])} | ${fmt(HR.byCycle[0].spirit[r])} | ${HR.byCycle[0].souls[r]} |`);

  block('contracts');
  L.push('| Цикл | День, 70 очков: ключи / золото / дух / базовые | Неделя, 300 очков: ключи / золото / дух / базовые / Энериум | Заверение дня / недели, золото |', '|---|---|---|---|');
  for (const x of drops.contracts.byCycle) L.push(`| ${ROMAN[x.cyc]} | ${x.day.runeKeys} / ${fmt(x.day.gold)} / ${fmt(x.day.spirit)} / ${x.day.basics} | ${x.week.runeKeys} / ${fmt(x.week.gold)} / ${fmt(x.week.spirit)} / ${x.week.basics} / ${x.week.enerium} | ${fmt(x.day.stakeGold)} / ${fmt(x.week.stakeGold)} |`);

  block('craft drops');
  L.push('| Крафтовый биом | Цикл | Этажей | Ресурс за этаж | Находки | Дух / золото / души / осколки сборных героев | Рунный ключ |', '|---|---|---|---|---|---|---|');
  for (const b of drops.craftBiomes) L.push(`| ${b.name} | ${ROMAN[b.cyc]} | ${b.floors} | ${pct(b.resPerFloorBp)} | ${b.finds} + ${pct(b.secondFindBp)} | ${fmt(b.spirit)} / ${fmt(b.gold)} / ${b.souls} / ${b.heroShards} | ${pct(b.runeKeyBp)} × ${b.runeKeys} |`);
  L.push('', '| Крафтовый босс | Цикл | Раса | Ремесло | Ресурсы: трофей / ключи ремесла | Валюта: дух / золото / Энериум — заглушка | Рунный ключ | Сундук крафтового босса | Иммунитет к контролю |', '|---|---|---|---|---|---|---|---|---|');
  for (const s of drops.craftBosses) L.push(`| ${s.name} | ${ROMAN[s.cyc]} | ${s.race} | ${s.spec ? C.SPECS[s.spec].n.toLowerCase() : '—'} | ${s.trophy ? nm(s.trophy) + ' ×' + s.trophies : '20 осколков героев недели'} / ${s.specKeys} | ${fmt(s.spirit)} / ${fmt(s.gold)} / ${s.enerium} | ${s.runeKeyBp ? pct(s.runeKeyBp) + ' × ' + s.runeKeys : '—'} | ${s.workerBoxRarity ? 'редкость ' + s.workerBoxRarity : '—'} | ${pct(s.immunityBp)} |`);

  block('pools');
  L.push('| Цикл | Ключи | Уникальные | Ресурсы руин | Находки | Трофеи | Награды мастерской |', '|---|---|---|---|---|---|---|');
  for (const p of drops.lootboxes.pools) L.push(`| ${cyLabel(CYC[p.cyc - 1])} | ${p.key.length} | ${p.unique.length} | ${p.craftres.length} | ${p.find.length} | ${p.trophy.length} | ${p.products.map(nm).join(', ') || '—'} |`);

  block('market');
  const MK = drops.market;
  L.push(`| Ярус | ${CYC.map(cy => ROMAN[cy.n]).join(' | ')} |`, `|---|${CYC.map(() => '---').join('|')}|`);
  for (const [k, n] of [['basic', 'Базовый'], ['craftres', 'Ресурс крафтового биома'], ['key', 'Ключ ремесла'], ['find', 'Находка'], ['unique', 'Уникальный'], ['trophy', 'Трофей']])
    L.push(`| ${n} | ${MK[k].map(fmt).join(' | ')} |`);

  fs.writeFileSync(OUT_MD, L.join('\n') + '\n', 'utf8');
};
