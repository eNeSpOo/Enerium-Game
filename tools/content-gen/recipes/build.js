/* Сборка древа рецептов: общий пул базовых (basics.js), лестница Энериума, рунная пыль и валюты (global.js), данные циклов — c1.js … c6.js.
   Здесь нет чисел баланса — только сборка. Числа добычи — в common.js, количества в ячейках — в данных циклов.
   Что собирается:
   - ресурсы добычи: общий пул из 36 базовых (ADR-0023, п. 1), шесть ключей на биом (п. 2), уникальные боссов;
     ресурсы, находки и трофеи крафтовых биомов — руин и городов (п. 4, 5), трофеи эха боссов биомов;
   - рецепты: заготовки и изделия (поля in и why у предмета), заряженные карсты и топливо, активации руин и городов, призывы
     крафтовых боссов и их пробуждённых версий за Многоликого (ADR-0025), перекрафт уникальных ресурсов и призыв эха боссов биомов,
     герои из скрытых рецептов (ADR-0019), награды мастерской, лестница Энериума, распыление рунных ключей, перековка рун.
   У каждого предмета три строки: lore — что это, hint — подсказка Этриона, где это пригодится (загадка), art — вид для иконки.
   Героев берём из docs/content/герои/состав-героев.csv — только читаем. Id, ожидаемое имя и источник «крафт» сверяются;
   расхождение — предупреждение, а не ошибка: состав правят отдельно.
   Запуск: node build.js — проверки и вывод (emit.js). */
const fs = require('fs'), path = require('path');
const C = require('./common');
const POOL = require('./basics');
const G = require('./global');
const CYC = [1, 2, 3, 4, 5, 6].filter(n => fs.existsSync(path.join(__dirname, `c${n}.js`))).map(n => require(`./c${n}`));
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const HEROES_CSV = path.join(__dirname, '..', '..', '..', 'docs', 'content', 'герои', 'состав-героев.csv');

const items = [], recipes = [], byId = {}, places = [], memories = [], warnings = [];
const addItem = it => { if (byId[it.id]) throw new Error('повтор предмета ' + it.id); byId[it.id] = it; items.push(it); return it; };
const addRecipe = r => { if (recipes.some(x => x.id === r.id)) throw new Error('повтор рецепта ' + r.id); recipes.push(r); return r; };
const pct = bp => (bp % 100 ? (bp / 100).toFixed(2).replace('.', ',') : String(bp / 100)) + ' %';
const lcFirst = s => s.charAt(0).toLowerCase() + s.slice(1);
const raceLc = r => ['Забытые', 'Перворождённые'].includes(r) ? r : r.toLowerCase();   // имена народов финала и Эхо — с заглавной, как в своде
/* Пробуждение босса руины или города требует Многоликого: рецепт пробуждения — не раньше цикла, где Многоликий появляется (Эхо). */
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
/* строка «где падает» у предмета, который делает рецепт */
const MADE_SRC = ['Мастерская · рецепт'];
/* призванный враг в строке «где падает» — по типу силы (ADR-0039): «крафтового босса» как типа нет, тип — CRAFT.type по виду призыва */
const SUMMONED_N = { e: 'Призванная элита', b: 'Призванный босс', u: 'Призванный Убер', f: 'Забытый' };
const summonedOf = kind => SUMMONED_N[C.CRAFT.type[kind]];

/* Общий пул базовых: падают во всех биомах с первого, вперемешку. */
for (const [id, n, spec, lore, hint, art] of POOL) addItem({ id, n, cyc: 1, b: null, pool: true, tier: 'basic', fam: 'basic', spec, r: 1, lore, hint, art,
  src: [`Любой биом с первого · за взятый этаж с шансом ${pct(C.ENEMY.basePerFloorBp)}; за срабатывание — от 1 до номера биома, вперемешку из всех 36`,
    'Ритуалы рабочих', 'Цепочка обучения — первые ресурсы для крафта, предложение', 'Лавка и рынок'] });

/* Общее для всех циклов: валюты кошелька, ступени Энериума, руническая пыль (global.js) */
for (const it of G.items) addItem(Object.assign({ cyc: 1, src: MADE_SRC }, it));
for (const r of G.recipes) addRecipe(Object.assign({ cyc: 1 }, r));

/* одно место — руина или город: активация, ресурсы, находки, босс, пробуждение, трофеи */
function addPlace(cy, cb, order) {
  const c = cy.n, team = !!cy.team, boss = cb.boss, label = boss.title ? boss.n + ', ' + boss.title : boss.n, fam = cb.kind === 'city' ? 'city' : 'ruin';
  const place = { id: cb.id, kind: cb.kind || 'ruin', city: cb.city || null, n: cb.n, cyc: c, order, where: cb.where, lore: cb.lore, foes: cb.foes, act: cb.act.id,
    res: cb.res.map(x => x[0]), find: cb.finds[0][0], finds: cb.finds.map(x => x[0]),
    boss: { id: boss.id, n: boss.n, title: boss.title, label, race: boss.race, spec: boss.spec, lore: boss.lore, call: boss.call.id, trophy: boss.trophy[0], awTrophy: boss.awTrophy[0] }, team };
  places.push(place);
  const where = cb.kind === 'city' ? `Город «${cb.city}» · ${cb.n}` : `Руина «${cb.n}»`;
  addItem({ id: cb.act.id, n: cb.act.n, cyc: c, b: cb.id, place: cb.n, tier: 'act', fam, r: fam === 'city' ? 4 : 3, opens: cb.n, opensLore: cb.lore,
    city: cb.city || undefined, lore: cb.act.lore, hint: cb.act.hint, art: cb.act.art, team, src: MADE_SRC });
  addRecipe({ id: 'r_' + cb.act.id, cyc: c, n: cb.act.n, kind: 'act', fam, out: [cb.act.id, 1], in: cb.act.in,
    why: `${cb.act.why} Открывает крафтовый биом «${cb.n}».`, team });
  const resPct = pct(C.CRAFT.biome.resPerFloorBp);
  for (const [id, n, spec, lore, hint, art] of cb.res) addItem({ id, n, cyc: c, b: cb.id, place: cb.n, tier: 'craftres', fam: 'res', spec, r: 2, lore, hint, art, team,
    src: [`${where} · за этаж с шансом ${resPct}, вперемешку`] });
  cb.finds.forEach(([id, n, lore, hint, art], i) => addItem({ id, n, cyc: c, b: cb.id, place: cb.n, tier: 'find', fam: 'find', r: 3, lore, hint, art, team,
    src: [i === 0 ? `${where} · ${C.CRAFT.biome.finds} за закрытие` : `${where} · вторая находка, ${pct(C.CRAFT.biome.secondFindBp)} за закрытие`] }));
  addItem({ id: boss.call.id, n: boss.call.n, cyc: c, b: cb.id, place: cb.n, tier: 'call', fam: 'call', spec: boss.spec, r: 4, opens: label, opensLore: boss.lore, race: boss.race,
    lore: boss.call.lore, hint: boss.call.hint, art: boss.call.art, team, src: MADE_SRC });
  addRecipe({ id: 'r_' + boss.call.id, cyc: c, n: boss.call.n, kind: 'call', fam: 'call', out: [boss.call.id, 1], in: boss.call.in,
    why: `${boss.call.why} Босс встаёт в Эхо за предмет и 1 душу; раса — ${raceLc(boss.race)}, ремесло — ${lcFirst(C.SPECS[boss.spec].n)}.`, team });
  const [tid, tn, tlore, thint, tart] = boss.trophy, aw = boss.awake, alabel = `${label} · ${aw.adj}`;
  addItem({ id: tid, n: tn, cyc: c, b: cb.id, place: cb.n, tier: 'trophy', fam: 'trophy', spec: boss.spec, r: 5, foe: label, lore: tlore, hint: thint, art: tart, team,
    src: [`${summonedOf(fam)} «${label}» · Эхо · ${C.CRAFT.boss.trophies} за победу`] });
  /* Пробуждённый босс (ADR-0025, «Многоликий и арт», п. 5): обычный призыв своего места, Многоликий, вторая находка и вещи из истории босса */
  const ac = Math.max(c, MANY_CYC), ateam = team || !!CYC[ac - 1].team, acall = boss.call.id + '_aw';
  place.boss.awake = { id: boss.id + '_aw', label: alabel, lore: aw.lore, call: acall, cyc: ac };
  const [wid, wn, wlore, whint, wart] = boss.awTrophy;
  addItem({ id: wid, n: wn, cyc: c, b: cb.id, place: cb.n, tier: 'trophy', fam: 'awtrophy', spec: boss.spec, r: 6, foe: alabel, lore: wlore, hint: whint, art: wart, team,
    src: [`Пробуждённый — «${alabel}» · Эхо · ${AW.trophies} за победу`] });
  addItem({ id: acall, n: aw.call.n, cyc: ac, b: cb.id, place: cb.n, tier: 'call', fam: 'awcall', spec: boss.spec, r: AW.callR, opens: alabel, opensLore: `${boss.lore} ${aw.lore}`,
    race: boss.race, lore: aw.call.lore, hint: aw.call.hint, art: aw.call.art, team: ateam, src: MADE_SRC });
  addRecipe({ id: 'r_' + acall, cyc: ac, n: aw.call.n, kind: 'call', fam: 'awcall', out: [acall, 1], in: aw.call.in, team: ateam,
    why: `${aw.call.why} Пробуждённый встаёт в Эхо за предмет и 1 душу Забытым — высшей ступенью врага (ADR-0039): 50 раундов, сила своего типа на ${AW.powerCycleStep} цикл выше, трофей — свой, сундук — на ${AW.chestStep} ступень выше.` });
}

let order = 0;
for (const cy of CYC) {
  const c = cy.n, R = ROMAN[c], team = !!cy.team, [A, B] = cy.biomes;
  const bossSpec = {};   // ремесло босса руины или города цикла → его тип и имя: он роняет ключи своего ремесла
  for (const cb of cy.craft) bossSpec[cb.boss.spec] = `${summonedOf(cb.kind === 'city' ? 'city' : 'ruin')} «${cb.boss.title ? cb.boss.n + ', ' + cb.boss.title : cb.boss.n}»`;
  for (const b of cy.biomes) {
    const bn = b.id.slice(1);
    for (const [spec, n, lore, hint, art] of b.keys) {
      const src = [`Любая элита биома «${b.n}» · один из шести ключей биома наугад`, `Ритуалы рабочих · ${b.n} · от эпической редкости`];
      if (c === 1) src.push('Цепочка обучения — недостающие ключи, предложение');
      if (bossSpec[spec]) src.push(`${bossSpec[spec]} · Эхо · ключи своего ремесла`);
      addItem({ id: `k${bn}_${spec}`, n, cyc: c, b: b.id, tier: 'key', fam: 'key', spec, r: 2, lore, hint, art, team, src });
    }
    const [uid, un, ulore, uimg, uhint, uart] = b.unique;
    addItem({ id: uid, n: un, cyc: c, b: b.id, tier: 'unique', fam: 'unique', r: 4, img: uimg || null, boss: b.boss, lore: ulore, hint: uhint, art: uart, team,
      src: [`Босс биома «${b.boss}» · ${pct(C.ENEMY.uniqueBp)} за победу`, 'Уникальный ритуал рабочих · 1 % на карточку пула'] });
    /* Эхо босса биома (поручение 30.09.2026, п. 11): уникальный → перекрафт → призыв; трофей — с эха */
    const m = b.memory;
    if (m) {
      memories.push({ id: m.id, biome: b.id, cyc: c, boss: b.boss, label: m.label, race: m.race, spec: m.spec, lore: m.lore, unique: uid, recraft: m.recraft.id, call: m.call.id, trophy: m.trophy[0], team });
      addItem({ id: m.recraft.id, n: m.recraft.n, cyc: c, b: b.id, tier: 'made', fam: 'recraft', spec: m.spec, r: 4, lore: m.recraft.lore, hint: m.recraft.hint, art: m.recraft.art, team, src: MADE_SRC });
      addRecipe({ id: 'r_' + m.recraft.id, cyc: c, n: m.recraft.n, kind: 'made', fam: 'recraft', out: [m.recraft.id, 1], in: m.recraft.in, why: m.recraft.why, team });
      addItem({ id: m.call.id, n: m.call.n, cyc: c, b: b.id, tier: 'call', fam: 'memcall', spec: m.spec, r: 5, opens: m.label, opensLore: m.lore, race: m.race,
        lore: m.call.lore, hint: m.call.hint, art: m.call.art, team, src: MADE_SRC });
      addRecipe({ id: 'r_' + m.call.id, cyc: c, n: m.call.n, kind: 'call', fam: 'memcall', out: [m.call.id, 1], in: m.call.in, team,
        why: `${m.call.why} Эхо босса встаёт в Эхо за предмет и 1 душу боссом, как босс руины своего цикла (ADR-0039).` });
      const [tid, tn, tlore, thint, tart] = m.trophy;
      addItem({ id: tid, n: tn, cyc: c, b: b.id, tier: 'trophy', fam: 'memtrophy', spec: m.spec, r: 5, foe: m.label, lore: tlore, hint: thint, art: tart, team,
        src: [`Эхо босса биома «${m.label}» · Эхо · ${C.CRAFT.memory.trophies} за победу`] });
    }
  }
  /* Руины и город цикла: активация, ресурсы, находки, призыв, трофей; пробуждённый — за Многоликого */
  for (const cb of cy.craft) addPlace(cy, cb, order++);
  /* Заготовки, изделия, заряженный карст, топливо: рецепт — в самом предмете */
  for (const it of cy.items) {
    const { in: inp, why, q, ...rest } = it;
    addItem(Object.assign({ cyc: c, r: C.TIERS[it.tier].r, fam: it.fam || it.tier, team, src: MADE_SRC }, rest));
    addRecipe({ id: 'r_' + it.id, cyc: c, n: it.n, kind: it.kind || it.tier, fam: it.fam || it.tier, out: [it.id, q || 1], in: inp, why, team });
  }
  /* Герои из скрытых рецептов (ADR-0019): имя, класс, редкость и максимум доблести — из состава героев. Находят перебором (§12). */
  for (const h of cy.heroes) {
    const row = heroRow(h), id = 'h_' + row.id.replace('-', '_'), maxV = +row['максимум доблести'];
    addItem({ id, n: row['имя'], cyc: c, tier: 'hero', fam: 'hero', r: C.RARITY[row['редкость']] || 3, heroId: row.id, cls: row['класс'], race: row['раса'], school: row['школа'],
      maxV, lore: row['кто он'], hint: h.hint, art: h.art, team, src: ['Мастерская · скрытый рецепт: находят перебором, как любой рецепт'] });
    addRecipe({ id: 'r_' + id, cyc: c, n: row['имя'], kind: 'hero', fam: 'hero', out: [id, 1], in: h.in, why: `${h.why} Максимум доблести — ${maxV}.`, team, hidden: true });
  }
  /* Многоликий: «где падает» и флаг недели — из записи добычи Эхо (common.js, ECHO.many), чтобы данные и строка не расходились */
  const M = C.ECHO.many;
  for (const it of cy.echo) addItem(Object.assign({ cyc: c, tier: 'echo', fam: 'echo', team }, it, it.id !== M.item ? {} : { week: M.week || undefined,
    src: [`Эхо · ступень ${M.step} недели — Многоликий, ${M.count} за победу`]
      .concat(M.week ? ['Ресурс своей недели: активировать его биом или отдать в рецепт можно только на этой неделе'] : []) }));
  for (const it of cy.products) addItem(Object.assign({ cyc: c, team, fam: it.fam || (it.tier === 'call' ? 'mask' : 'product'), src: MADE_SRC }, it));
  for (const r of cy.recipes) addRecipe(Object.assign({ cyc: c, team, fam: r.fam || r.kind }, r));
  /* Руны пределов и доблести: страж пределов роняет руны I–V, перековка три к одной с ключом ремесла; руна доблести — из 100 осколков.
     Первая руна и осколок — добыча; остальное — рецепты. Строки игрока — G.rune (global.js). */
  const W = C.GUARD.limits.weightsBp, key = ([spec, side]) => `k${(side ? B : A).id.slice(1)}_${spec}`, RT = G.runeText;
  for (let k = 1; k <= 5; k++) addItem({ id: `rn${c}_${k}`, n: `Руна предела ${ROMAN[k]} · цикл ${R}`, cyc: c, b: A.id, tier: 'rune', fam: 'rune', r: [0, 2, 2, 3, 4, 5][k], glyph: ROMAN[k], team,
    lore: RT.lore[k], hint: RT.hint(k, c), art: RT.art(k, c),
    src: [`Рунный страж «${A.guard}» · ${C.GUARD.limits.runesPerKill} руны за победу, предел ${ROMAN[k]} — ${pct(W[k - 1])}`].concat(k > 1 ? [`Мастерская · три руны предела ${ROMAN[k - 1]}`] : []) });
  addItem({ id: `vs${c}`, n: `Осколок доблести · цикл ${R}`, cyc: c, b: B.id, tier: 'vshard', fam: 'vshard', r: 3, glyph: 'V', team,
    lore: RT.shardLore, hint: RT.shardHint(c), art: RT.shardArt(c),
    src: [`Рунный страж «${B.guard}» · ${C.GUARD.valor.shardsBp[0][0]}–${C.GUARD.valor.shardsBp[C.GUARD.valor.shardsBp.length - 1][0]} осколков за победу`]
      .concat(c > 1 ? [`Мастерская · руна доблести цикла ${ROMAN[c - 1]} и руническая пыль`] : []).concat(['Мастерская · руническая пыль, хуже боя со стражем']) });
  addItem({ id: `vr${c}`, n: `Руна доблести · цикл ${R}`, cyc: c, b: null, tier: 'valor', fam: 'valor', r: 4, glyph: 'V', team,
    lore: RT.valorLore, hint: RT.valorHint(c), art: RT.valorArt(c), src: ['Мастерская · из 100 осколков'] });
  for (let k = 2; k <= 5; k++) addRecipe({ id: `r_rn${c}_${k}`, cyc: c, n: `Руна предела ${ROMAN[k]} · цикл ${R}`, kind: 'rune', fam: 'rune', out: [`rn${c}_${k}`, 1],
    in: [[`rn${c}_${k - 1}`, 3], [key(C.RUNE_KEYS[k]), 1]], why: 'Перековка младших рун в старшие — сток излишков (GDD §10.1).', team });
  addRecipe({ id: `r_vr${c}`, cyc: c, n: `Руна доблести · цикл ${R}`, kind: 'valor', fam: 'valor', out: [`vr${c}`, 1], in: [[`vs${c}`, C.GUARD.valor.shardsPerRune]],
    why: 'Руна собирается из 100 осколков (GDD §10.2). Рецепт известен с первого осколка.', known0: true, team });
  /* Перекрафт рун (поручение 30.09.2026, п. 6–7): пятая руна через пыль, руна предела I — в пыль, пыль — в осколки доблести, старая руна доблести — в осколки нового цикла.
     Всё — хуже прямого пути: темп руны доблести у обычного не меняется (tempo.py). */
  const D = C.DUST, crumb = `k${B.id.slice(1)}_ench`;
  addRecipe({ id: `r_rn${c}_5d`, cyc: c, n: `Руна предела V · цикл ${R} · через пыль`, kind: 'rune', fam: 'dust', out: [`rn${c}_5`, 1],
    in: [[`rn${c}_4`, 3], [D.id, D.fifthDust]], why: 'Пятая руна — самая редкая. Руническая пыль держит три руны IV вместо ключа ремесла: вход тот же, связка — из ключей богов.', team });
  addRecipe({ id: `r_rdust_rn${c}`, cyc: c, n: `Руническая пыль · из рун предела I цикла ${R}`, kind: 'rune', fam: 'dust', out: [D.id, D.runeDust],
    in: [[`rn${c}_1`, D.runeIn], [crumb, 1]], why: 'Лишние руны первого предела растирают в пыль, когда все герои цикла его прошли. Крупица своего бога связывает пыль.', team });
  addRecipe({ id: `r_vs${c}_dust`, cyc: c, n: `Осколки доблести · цикл ${R} · из пыли`, kind: 'valor', fam: 'dust', out: [`vs${c}`, D.shardOut[c]],
    in: [[D.id, D.shardDust], [crumb, 5]], why: `Пыль ключей богов с крупицами своего бога — ${D.shardOut[c]} ${D.shardOut[c] === 1 ? 'осколок' : D.shardOut[c] < 5 ? 'осколка' : 'осколков'} доблести. Втрое-вчетверо дороже боя со стражем: это сток лишних ключей, а не путь к доблести.`, team });
  if (c > 1) addRecipe({ id: `r_vs${c}_old`, cyc: c, n: `Осколки доблести · цикл ${R} · из руны цикла ${ROMAN[c - 1]}`, kind: 'valor', fam: 'dust', out: [`vs${c}`, D.valorShards],
    in: [[`vr${c - 1}`, 1], [D.id, D.valorIn], [crumb, 2]], why: `Руна доблести прошлого цикла, которой некого поднять, переплавляется в ${D.valorShards} осколков нового с крупицами своего бога: три старые руны — меньше одной новой.`, team });
}

/* Дополнительные строки «где падает» у наград мастерской и валют. */
const SRC_EXTRA = {
  /* строки видит игрок: без ссылок на ADR и GDD, без служебных слов (проверка check_player_view.js) */
  /* рунный ключ — слово автора 30.09.2026 (ADR-0033): боссы биома, донатный сет ключников «Менялы», сундуки с малым шансом, контракты;
     за деньги — только стартовый набор, раз за игру. Энериум — ручеёк бесплатного игрока (docs/content/экономика-энериум.md) */
  rkey: ['Контракты — главный источник', 'Босс биома — 10 %; за срабатывание столько ключей, какой цикл. С элит не падает', 'Сет «Менялы» — ключ с каждого N-го босса биома', 'Сундук странника и сундук призыва — изредка', 'Стартовый набор в Лавке Энериума — один раз за игру'],
  energ: ['Дар дня, бесплатный ряд пропуска, контракты эпической редкости и выше', 'Арена: суточный топ-100', 'Призванные враги — боссы руин и городов, эхо боссов биомов: победа возвращает часть Энериума призыва', 'Рецепт «Энериум из жилы» — с цикла V', 'Лавка Энериума'],
  necro: ['Мастерская · сюжетный рецепт, открывается после Зарифа'],
};
for (const it of items) if (SRC_EXTRA[it.id]) it.src = SRC_EXTRA[it.id];

module.exports = { items, recipes, byId, CYC, ROMAN, places, memories, warnings };
if (require.main === module) require('./emit')(module.exports);
