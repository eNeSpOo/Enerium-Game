/* Сборка древа рецептов: общий пул базовых (basics.js) и данные циклов — data1.js (I–II), data2.js (III–IV), data3.js (V–VI).
   Здесь нет чисел баланса — только сборка. Числа добычи — в common.js, количества в ячейках — в данных циклов.
   Что собирается:
   - ресурсы добычи: общий пул из 36 базовых (ADR-0023, п. 1), шесть ключей на биом (п. 2), уникальные боссов;
     ресурсы, находки и трофеи крафтовых биомов и боссов (п. 4, 5);
   - рецепты: заготовки и изделия (поля in и why у предмета), активации крафтовых биомов, призывы крафтовых боссов
     и их пробуждённых версий за Многоликого (ADR-0025), герои из скрытых рецептов (ADR-0019), награды мастерской,
     перековка рун предела и руна доблести.
   Героев берём из docs/content/герои/состав-героев.csv — только читаем. Id, ожидаемое имя и источник «крафт» сверяются;
   расхождение — предупреждение, а не ошибка: состав правят отдельно.
   Запуск: node build.js — проверки и вывод (emit.js). */
const fs = require('fs'), path = require('path');
const C = require('./common');
const POOL = require('./basics');
const CYC = [...require('./data1'), ...require('./data2'), ...require('./data3')];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const HEROES_CSV = path.join(__dirname, '..', '..', '..', 'docs', 'content', 'герои', 'состав-героев.csv');

const items = [], recipes = [], byId = {}, places = [], warnings = [];
const addItem = it => { if (byId[it.id]) throw new Error('повтор предмета ' + it.id); byId[it.id] = it; items.push(it); return it; };
const addRecipe = r => { if (recipes.some(x => x.id === r.id)) throw new Error('повтор рецепта ' + r.id); recipes.push(r); return r; };
const pct = bp => (bp % 100 ? (bp / 100).toFixed(2).replace('.', ',') : String(bp / 100)) + ' %';
const lcFirst = s => s.charAt(0).toLowerCase() + s.slice(1);
const raceLc = r => ['Забытые', 'Перворождённые'].includes(r) ? r : r.toLowerCase();   // имена народов финала и Эхо — с заглавной, как в своде
/* Пробуждение крафтового босса требует Многоликого: рецепт пробуждения — не раньше цикла, где Многоликий появляется (Эхо). */
const AW = C.CRAFT.awake;
const MANY_CYC = (CYC.find(cy => (cy.echo || []).some(e => e.id === AW.item)) || { n: 0 }).n;
if (!MANY_CYC) throw new Error('нет предмета пробуждения ' + AW.item + ' в данных циклов');

/* CSV с кавычками: поля в "…", внутри кавычек запятые и переводы строк — часть поля. Лишние столбцы («также в сете» и новые) не мешают. */
function readCsv(file) {
  const t = fs.readFileSync(file, 'utf8').replace(/^﻿/, ''), rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
const HERO_ROWS = readCsv(HEROES_CSV);
const HERO_BY_ID = Object.fromEntries(HERO_ROWS.map(h => [h.id, h]));
function heroRow(h) {
  let row = HERO_BY_ID[h.hero];
  if (row && h.name && row['имя'] !== h.name) {
    const byName = HERO_ROWS.find(x => x['имя'] === h.name);
    warnings.push(`герой ${h.hero}: в составе имя «${row['имя']}», в данных — «${h.name}»${byName ? `; по имени найден ${byName.id}, берём его` : ''}`);
    if (byName) row = byName;
  }
  if (!row && h.name) { row = HERO_ROWS.find(x => x['имя'] === h.name); if (row) warnings.push(`герой ${h.hero} не найден по id, найден по имени: ${row.id}`); }
  if (!row) throw new Error(`нет героя ${h.hero} «${h.name || ''}» в ${HEROES_CSV}`);
  if (row['источник'] !== 'крафт') warnings.push(`герой ${row.id} «${row['имя']}»: источник в составе — «${row['источник']}», а не «крафт»`);
  return row;
}

/* Общий пул базовых: падают во всех биомах с первого, вперемешку. */
for (const [id, n, spec, lore] of POOL) addItem({ id, n, cyc: 1, b: null, pool: true, tier: 'basic', spec, r: 1, lore,
  src: [`Любой биом с первого · за взятый этаж с шансом ${pct(C.ENEMY.basePerFloorBp)}; за срабатывание — от 1 до номера биома, вперемешку из всех 36`,
    'Ритуалы рабочих', 'Цепочка обучения — первые ресурсы для крафта, предложение', 'Лавка и рынок'] });

for (const cy of CYC) {
  const c = cy.n, R = ROMAN[c], team = !!cy.team, [A, B] = cy.biomes;
  const bossSpec = {};   // ремесло крафтового босса цикла → его имя: он роняет два ключа своего ремесла
  for (const cb of cy.craft) bossSpec[cb.boss.spec] = cb.boss.title ? cb.boss.n + ', ' + cb.boss.title : cb.boss.n;
  for (const b of cy.biomes) {
    const bn = b.id.slice(1);
    for (const [spec, n, lore] of b.keys) {
      const src = [`Любая элита биома «${b.n}» · один из шести ключей биома наугад`, `Ритуалы рабочих · ${b.n} · от эпической редкости`];
      if (c === 1) src.push('Цепочка обучения — недостающие ключи, предложение');
      if (bossSpec[spec]) src.push(`Крафтовый босс «${bossSpec[spec]}» · Эхо · 2 ключа своего ремесла`);
      addItem({ id: `k${bn}_${spec}`, n, cyc: c, b: b.id, tier: 'key', spec, r: 2, lore, team, src });
    }
    const [uid, un, ulore, uimg] = b.unique;
    addItem({ id: uid, n: un, cyc: c, b: b.id, tier: 'unique', r: 4, img: uimg || null, boss: b.boss, lore: ulore, team,
      src: [`Босс биома «${b.boss}» · ${pct(C.ENEMY.uniqueBp)} за победу`, 'Уникальный ритуал рабочих · 1 % на карточку пула'] });
  }
  /* Крафтовые биомы и боссы: активация, ресурсы, находка, призыв, трофей. */
  for (const cb of cy.craft) {
    const boss = cb.boss, label = boss.title ? boss.n + ', ' + boss.title : boss.n;
    places.push({ id: cb.id, n: cb.n, cyc: c, where: cb.where, lore: cb.lore, foes: cb.foes, act: cb.act.id, res: cb.res.map(x => x[0]), find: cb.find[0],
      boss: { id: boss.id, n: boss.n, title: boss.title, label, race: boss.race, spec: boss.spec, lore: boss.lore, call: boss.call.id, trophy: boss.trophy[0] }, team });
    addItem({ id: cb.act.id, n: cb.act.n, cyc: c, b: cb.id, place: cb.n, tier: 'act', r: 3, opens: cb.n, opensLore: cb.lore, lore: cb.act.lore, team, src: ['Мастерская · рецепт'] });
    addRecipe({ id: 'r_' + cb.act.id, cyc: c, n: cb.act.n, kind: 'act', out: [cb.act.id, 1], in: cb.act.in, why: `${cb.act.why} Открывает крафтовый биом «${cb.n}».`, team });
    for (const [id, n, spec, lore] of cb.res) addItem({ id, n, cyc: c, b: cb.id, place: cb.n, tier: 'craftres', spec, r: 2, lore, team,
      src: [`Крафтовый биом «${cb.n}» · за этаж с шансом ${pct(C.CRAFT.biome.resPerFloorBp)}, вперемешку`] });
    addItem({ id: cb.find[0], n: cb.find[1], cyc: c, b: cb.id, place: cb.n, tier: 'find', r: 3, lore: cb.find[2], team,
      src: [`Крафтовый биом «${cb.n}» · 1 за закрытие, вторая — ${pct(C.CRAFT.biome.secondFindBp)}`] });
    addItem({ id: boss.call.id, n: boss.call.n, cyc: c, b: cb.id, place: cb.n, tier: 'call', spec: boss.spec, r: 4, opens: label, opensLore: boss.lore, race: boss.race, lore: boss.call.lore, team, src: ['Мастерская · рецепт'] });
    addRecipe({ id: 'r_' + boss.call.id, cyc: c, n: boss.call.n, kind: 'call', out: [boss.call.id, 1], in: boss.call.in,
      why: `${boss.call.why} Босс встаёт в Эхо за предмет и 1 душу; раса — ${raceLc(boss.race)}, ремесло — ${lcFirst(C.SPECS[boss.spec].n)}.`, team });
    const [tid, tn, tlore] = boss.trophy;
    const aw = boss.awake, alabel = aw ? `${label} · ${aw.adj}` : null;
    addItem({ id: tid, n: tn, cyc: c, b: cb.id, place: cb.n, tier: 'trophy', spec: boss.spec, r: 5, foe: label, lore: tlore, team,
      src: [`Крафтовый босс «${label}» · Эхо · 1 за победу`].concat(aw ? [`Пробуждённый — «${alabel}» · Эхо · ${AW.trophies} за победу`] : []) });
    /* Пробуждённый босс (ADR-0025, «Многоликий и арт», п. 5): обычный призыв своей руины, Многоликий, вторая находка и вещи из истории босса. */
    if (aw) {
      const ac = Math.max(c, MANY_CYC), ateam = team || !!CYC[ac - 1].team, acall = boss.call.id + '_aw';
      places[places.length - 1].boss.awake = { id: boss.id + '_aw', label: alabel, lore: aw.lore, call: acall, cyc: ac };
      addItem({ id: acall, n: aw.call.n, cyc: ac, b: cb.id, place: cb.n, tier: 'call', spec: boss.spec, r: AW.callR, opens: alabel, opensLore: `${boss.lore} ${aw.lore}`,
        race: boss.race, lore: aw.call.lore, team: ateam, src: ['Мастерская · рецепт'] });
      addRecipe({ id: 'r_' + acall, cyc: ac, n: aw.call.n, kind: 'call', out: [acall, 1], in: aw.call.in, team: ateam,
        why: `${aw.call.why} Пробуждённый босс встаёт в Эхо за предмет и 1 душу: сила — как у крафтового босса на ${AW.powerCycleStep} цикл выше, трофеев — ${AW.trophies}, сундук — на ${AW.chestStep} ступень выше.` });
    }
  }
  /* Заготовки и изделия: рецепт — в самом предмете. */
  for (const it of cy.items) {
    const { in: inp, why, q, ...rest } = it;
    addItem(Object.assign({ cyc: c, r: C.TIERS[it.tier].r, team, src: ['Мастерская · рецепт'] }, rest));
    addRecipe({ id: 'r_' + it.id, cyc: c, n: it.n, kind: it.tier, out: [it.id, q || 1], in: inp, why, team });
  }
  /* Герои из скрытых рецептов (ADR-0019): имя, класс, редкость и максимум доблести — из состава героев. Находят перебором (§12). */
  for (const h of cy.heroes) {
    const row = heroRow(h), id = 'h_' + row.id.replace('-', '_'), maxV = +row['максимум доблести'];
    addItem({ id, n: row['имя'], cyc: c, tier: 'hero', r: C.RARITY[row['редкость']] || 3, heroId: row.id, cls: row['класс'], race: row['раса'], school: row['школа'],
      maxV, lore: row['кто он'], team, src: ['Мастерская · скрытый рецепт (ADR-0019): находят перебором, как любой рецепт (§12)'] });
    addRecipe({ id: 'r_' + id, cyc: c, n: row['имя'], kind: 'hero', out: [id, 1], in: h.in, why: `${h.why} Максимум доблести — ${maxV}.`, team, hidden: true });
  }
  /* Многоликий: «где падает» и флаг недели — из записи добычи Эхо (common.js, ECHO.many), чтобы данные и строка не расходились */
  const M = C.ECHO.many;
  for (const it of cy.echo) addItem(Object.assign({ cyc: c, tier: 'echo', team }, it, it.id !== M.item ? {} : { week: M.week || undefined,
    src: [`Эхо · ступень ${M.step} недели — Многоликий, ${M.count} за победу (§17.4, ADR-0025)`]
      .concat(M.week ? ['Ресурс своей недели: активировать его биом или отдать в рецепт можно только на этой неделе'] : []) }));
  for (const it of cy.products) addItem(Object.assign({ cyc: c, team, src: ['Мастерская · рецепт'] }, it));
  for (const r of cy.recipes) addRecipe(Object.assign({ cyc: c, team }, r));
  /* Руны пределов и доблести: страж пределов роняет руны I–V, перековка три к одной с ключом ремесла; руна доблести — из 100 осколков. */
  const W = C.GUARD.limits.weightsBp, key = ([spec, side]) => `k${(side ? B : A).id.slice(1)}_${spec}`;
  for (let k = 1; k <= 5; k++) addItem({ id: `rn${c}_${k}`, n: `Руна предела ${ROMAN[k]} · цикл ${R}`, cyc: c, b: A.id, tier: 'rune', r: [0, 2, 2, 3, 4, 5][k], glyph: ROMAN[k], team,
    lore: k === 1 ? 'Десять рун своего цикла пробивают предел.' : k === 5 ? 'Пятая руна — самая редкая.' : 'Три младшие руны перековываются в одну старшую.',
    src: [`Рунный страж «${A.guard}» · ${C.GUARD.limits.runesPerKill} руны за победу, предел ${ROMAN[k]} — ${pct(W[k - 1])}`].concat(k > 1 ? [`Мастерская · три руны предела ${ROMAN[k - 1]}`] : []) });
  addItem({ id: `vs${c}`, n: `Осколок доблести · цикл ${R}`, cyc: c, b: B.id, tier: 'vshard', r: 3, glyph: 'V', team,
    lore: 'Сто осколков собираются в одну руну доблести.', src: [`Рунный страж «${B.guard}» · 1–10 осколков за победу`] });
  addItem({ id: `vr${c}`, n: `Руна доблести · цикл ${R}`, cyc: c, b: null, tier: 'valor', r: 4, glyph: 'V', team,
    lore: 'Одна руна — одна доблесть: +30 % к силе и новая глава героя.', src: ['Мастерская · из 100 осколков'] });
  for (let k = 2; k <= 5; k++) addRecipe({ id: `r_rn${c}_${k}`, cyc: c, n: `Руна предела ${ROMAN[k]} · цикл ${R}`, kind: 'rune', out: [`rn${c}_${k}`, 1],
    in: [[`rn${c}_${k - 1}`, 3], [key(C.RUNE_KEYS[k]), 1]], why: 'Перековка младших рун в старшие — сток излишков (GDD §10.1).', team });
  addRecipe({ id: `r_vr${c}`, cyc: c, n: `Руна доблести · цикл ${R}`, kind: 'valor', out: [`vr${c}`, 1], in: [[`vs${c}`, C.GUARD.valor.shardsPerRune]],
    why: 'Руна собирается из 100 осколков (GDD §10.2). Рецепт известен с первого осколка.', known0: true, team });
}

/* Дополнительные строки «где падает» у наград мастерской. */
const SRC_EXTRA = {
  rkey: ['Контракты — главный источник', 'Босс биома — 10 %; за срабатывание столько ключей, какой цикл. С элит не падает (ADR-0023, вариант Б)', 'Крафтовые биомы и крафтовые боссы', 'Рецепты «Ключи из горна» и «Ключи из древних клинков» — с цикла III'],
  energ: ['Рецепт «Энериум из жилы» — цикл V, число — заглушка', 'Крафтовые боссы — заглушка', 'Контракты эпической редкости и выше', 'Топ-100 Арены, награды главам кланов'],
  necro: ['Мастерская · сюжетный рецепт, открывается после Зарифа'],
};
for (const it of items) if (SRC_EXTRA[it.id]) it.src = SRC_EXTRA[it.id];

module.exports = { items, recipes, byId, CYC, ROMAN, places, warnings };
if (require.main === module) require('./emit')(module.exports);
