/* Сборка древа рецептов из данных циклов: data1.js (I–II), data2.js (III–IV), data3.js (V–VI).
   Здесь нет чисел баланса — только сборка. Числа добычи — в common.js, количества в ячейках — в данных циклов.
   Что собирается:
   - ресурсы добычи: базовые, ключи ремёсел (по одному на элиту), уникальные боссов; ресурсы, находки и трофеи крафта;
   - рецепты: заготовки и изделия (поля in и why у предмета), активации крафтовых биомов, призывы крафтовых боссов,
     герои из скрытых рецептов (ADR-0019), награды мастерской, перековка рун предела и руна доблести.
   Героев берём из docs/content/герои/состав-героев.csv — только читаем. Если файла нет или героя в нём нет, сборка падает с ошибкой.
   Запуск: node build.js — проверки и вывод (emit.js). */
const fs = require('fs'), path = require('path');
const C = require('./common');
const CYC = [...require('./data1'), ...require('./data2'), ...require('./data3')];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const HEROES_CSV = path.join(__dirname, '..', '..', '..', 'docs', 'content', 'герои', 'состав-героев.csv');

const items = [], recipes = [], byId = {}, places = [];
const addItem = it => { if (byId[it.id]) throw new Error('повтор предмета ' + it.id); byId[it.id] = it; items.push(it); return it; };
const addRecipe = r => { if (recipes.some(x => x.id === r.id)) throw new Error('повтор рецепта ' + r.id); recipes.push(r); return r; };
const pct = bp => (bp % 100 ? (bp / 100).toFixed(2).replace('.', ',') : String(bp / 100)) + ' %';

/* CSV с кавычками: поля в "…", внутри кавычек запятые и переводы строк — часть поля. */
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
  const head = rows.shift();
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] || ''])));
}
const HEROES = Object.fromEntries(readCsv(HEROES_CSV).map(h => [h.id, h]));

/* Кто из элит выходит в обучающей колоде прототипа (design/ui/battle.js, FLOORS_TUTOR) и в свите стража обучения. */
const TUTOR = { floors: ['Подмастерье', 'Резчик'], guard: ['Подмастерье', 'Мех'] };

for (const cy of CYC) {
  const c = cy.n, R = ROMAN[c], team = !!cy.team, [A, B] = cy.biomes;
  const baseBp = C.ENEMY.basePerFloorBpByCycle[c - 1];
  const bossSpec = {};   // ремесло крафтового босса цикла → его имя: он роняет два ключа своего ремесла
  for (const cb of cy.craft) bossSpec[cb.boss.spec] = cb.boss.n + ', ' + cb.boss.title;
  for (const b of cy.biomes) {
    const bn = b.id.slice(1);
    for (const [id, n, spec, lore] of b.basics) addItem({ id, n, cyc: c, b: b.id, tier: 'basic', spec, r: 1, lore, team,
      src: [`Этаж биома «${b.n}» · 1 за взятый этаж с шансом ${pct(baseBp)}, вперемешку с другими базовыми биома`, `Ритуалы рабочих · ${b.n}`, 'Лавка и рынок'] });
    for (const [spec, n, elite, lore] of b.keys) {
      const src = [`Элита «${elite}» · ${b.n} · 1 гарантированно`, `Ритуалы рабочих · ${b.n} · от эпической редкости`];
      if (b.deck === 'tutorial') {
        if (TUTOR.guard.includes(elite)) src.push('Свита Мастера — рунного стража обучения');
        if (!TUTOR.floors.includes(elite) && !TUTOR.guard.includes(elite)) src.push('В обучающей колоде прототипа эта элита не выходит — см. «Открыто»');
      }
      if (bossSpec[spec]) src.push(`Крафтовый босс «${bossSpec[spec]}» · Эхо · 2 ключа своего ремесла`);
      addItem({ id: `k${bn}_${spec}`, n, cyc: c, b: b.id, tier: 'key', spec, r: 2, elite, lore, team, src });
    }
    const [uid, un, ulore, uimg] = b.unique;
    addItem({ id: uid, n: un, cyc: c, b: b.id, tier: 'unique', r: 4, img: uimg || null, boss: b.boss, lore: ulore, team,
      src: [`Босс биома «${b.boss}» · ${pct(C.ENEMY.uniqueBp)} за победу`, 'Уникальный ритуал рабочих · 1 % в ролле пула'] });
  }
  /* Крафтовые биомы и боссы: активация, ресурсы, находка, призыв, трофей. */
  for (const cb of cy.craft) {
    const boss = cb.boss, label = boss.n + ', ' + boss.title;
    places.push({ id: cb.id, n: cb.n, cyc: c, where: cb.where, lore: cb.lore, foes: cb.foes, act: cb.act.id, res: cb.res.map(x => x[0]), find: cb.find[0],
      boss: { id: boss.id, n: boss.n, title: boss.title, label, spec: boss.spec, lore: boss.lore, call: boss.call.id, trophy: boss.trophy[0] }, team });
    addItem({ id: cb.act.id, n: cb.act.n, cyc: c, b: cb.id, place: cb.n, tier: 'act', r: 3, opens: cb.n, opensLore: cb.lore, lore: cb.act.lore, team, src: ['Мастерская · рецепт'] });
    addRecipe({ id: 'r_' + cb.act.id, cyc: c, n: cb.act.n, kind: 'act', out: [cb.act.id, 1], in: cb.act.in, why: `${cb.act.why} Открывает крафтовый биом «${cb.n}».`, team });
    for (const [id, n, spec, lore] of cb.res) addItem({ id, n, cyc: c, b: cb.id, place: cb.n, tier: 'craftres', spec, r: 2, lore, team,
      src: [`Крафтовый биом «${cb.n}» · за этаж с шансом ${pct(C.CRAFT.biome.resPerFloorBp)}, вперемешку`] });
    addItem({ id: cb.find[0], n: cb.find[1], cyc: c, b: cb.id, place: cb.n, tier: 'find', r: 3, lore: cb.find[2], team,
      src: [`Крафтовый биом «${cb.n}» · 1 за закрытие, вторая — ${pct(C.CRAFT.biome.secondFindBp)}`] });
    addItem({ id: boss.call.id, n: boss.call.n, cyc: c, b: cb.id, place: cb.n, tier: 'call', spec: boss.spec, r: 4, opens: label, opensLore: boss.lore, lore: boss.call.lore, team, src: ['Мастерская · рецепт'] });
    addRecipe({ id: 'r_' + boss.call.id, cyc: c, n: boss.call.n, kind: 'call', out: [boss.call.id, 1], in: boss.call.in,
      why: `${boss.call.why} Призывает в Эхо крафтового босса — Забытого: ${lcFirst(C.SPECS[boss.spec].n)}.`, team });
    const [tid, tn, tlore] = boss.trophy;
    addItem({ id: tid, n: tn, cyc: c, b: cb.id, place: cb.n, tier: 'trophy', spec: boss.spec, r: 5, foe: label, lore: tlore, team,
      src: [`Крафтовый босс «${label}» · Эхо · 1 за победу`] });
  }
  /* Заготовки и изделия: рецепт — в самом предмете. */
  for (const it of cy.items) {
    const { in: inp, why, q, ...rest } = it;
    addItem(Object.assign({ cyc: c, r: C.TIERS[it.tier].r, team, src: ['Мастерская · рецепт'] }, rest));
    addRecipe({ id: 'r_' + it.id, cyc: c, n: it.n, kind: it.tier, out: [it.id, q || 1], in: inp, why, team });
  }
  /* Герои из скрытых рецептов (ADR-0019): имя, класс, редкость и максимум доблести — из состава героев. */
  for (const h of cy.heroes) {
    const src = HEROES[h.hero]; if (!src) throw new Error('нет героя ' + h.hero + ' в ' + HEROES_CSV);
    if (src['источник'] !== 'крафт') throw new Error(`герой ${h.hero} в составе не из крафта: ${src['источник']}`);
    const id = 'h_' + h.hero.replace('-', '_'), maxV = +src['максимум доблести'];
    addItem({ id, n: src['имя'], cyc: c, tier: 'hero', r: C.RARITY[src['редкость']] || 3, heroId: h.hero, cls: src['класс'], race: src['раса'], school: src['школа'],
      maxV, lore: src['кто он'], team, src: ['Мастерская · скрытый рецепт (ADR-0019)', 'Лутбокс со скрытым рецептом — следующий шаг'] });
    addRecipe({ id: 'r_' + id, cyc: c, n: src['имя'], kind: 'hero', out: [id, 1], in: h.in, why: `${h.why} Максимум доблести — ${maxV}.`, team, hidden: true });
  }
  for (const it of cy.echo) addItem(Object.assign({ cyc: c, tier: 'echo', team }, it));
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
function lcFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

/* Дополнительные строки «где падает» у наград мастерской. */
const SRC_EXTRA = {
  rkey: ['Контракты — главный источник', 'Элиты — 5 %, босс биома — 10 %; за срабатывание столько ключей, какой цикл', 'Крафтовые биомы и крафтовые боссы', 'Рецепты «Ключи из горна» и «Ключи из древних клинков» — с цикла III'],
  energ: ['Рецепт «Энериум из жилы» — цикл V', 'Крафтовые боссы · 5 × цикл', 'Контракты эпической редкости и выше', 'Топ-100 Арены, награды главам кланов'],
  chest_eq4: ['Мастерская · рецепт', 'Лутбоксы Арены и Лиги'],
  chest_tal5: ['Мастерская · рецепт', 'Лутбоксы Кланового босса'],
  necro: ['Мастерская · сюжетный рецепт, открывается после Зарифа'],
  chest_tal6: ['Мастерская · рецепт', 'Лутбоксы Кланового босса'],
  chest_eq6: ['Мастерская · рецепт', 'Лутбоксы Арены и Лиги'],
};
for (const it of items) if (SRC_EXTRA[it.id]) it.src = SRC_EXTRA[it.id];

module.exports = { items, recipes, byId, CYC, ROMAN, places };
if (require.main === module) require('./emit')(module.exports);
