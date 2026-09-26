/* Сборка design/ui/recipes.js и таблиц для документа. Входы заготовок, активаций, призывов и рун строятся по схеме цикла:
   α: базовые охоты ×10 и портняжного ×20 + ключ портняжного A + ключ охоты B
   β: базовые инженерии ×20 и кузнечества ×15 + ключ инженерии A + ключ кузнечества B
   γ: базовые алхимии ×15 и зачарования ×20 + ключ алхимии A + ключ зачарования B
   руны: I→II ключ зачарования A, II→III кузнечества A, III→IV алхимии B, IV→V зачарования B (по три младшие руны)
   активация: α + β + уникальный [+ трофей прошлого цикла + базовый прошлого цикла ×30] + ключ инженерии B
   призыв: γ ×2 + уникальный + находка + ключ охоты A + ключ портняжного B
   Входы, записанные в data*.js у parts/act/call, игнорируются: источник правды — эта схема. */
const fs = require('fs'), path = require('path');
const C = require('./common');
const CYC = [...require('./data1'), ...require('./data2'), ...require('./data3')];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const OUT_JS = path.join(__dirname, '..', '..', '..', 'design', 'ui', 'recipes.js');
const OUT_MD = path.join(__dirname, 'tables.md');
const OLD_BASIC = { 2: 'sand', 3: 'rag', 4: 'ash', 5: 'ink', 6: 'yarn' };
const PART_Q = [[['hunt', 10], ['tail', 20]], [['eng', 20], ['smith', 15]], [['alch', 15], ['ench', 20]]];
const PART_KEYS = [['tail', 'A'], ['hunt', 'B'], ['eng', 'A'], ['smith', 'B'], ['alch', 'A'], ['ench', 'B']];
const RUNE_KEYS = [null, null, ['ench', 'A'], ['smith', 'A'], ['alch', 'B'], ['ench', 'B']];

const items = [], recipes = [], byId = {};
const addItem = it => { if (byId[it.id]) throw new Error('повтор предмета ' + it.id); byId[it.id] = it; items.push(it); };
const addRecipe = r => { if (recipes.some(x => x.id === r.id)) throw new Error('повтор рецепта ' + r.id); recipes.push(r); };
const lc = s => s.charAt(0).toLowerCase() + s.slice(1);

for (const cy of CYC) {
  const c = cy.n, R = ROMAN[c], team = !!cy.team, [A, B] = cy.biomes, cr = cy.craft;
  const key = (spec, side) => `k${(side === 'A' ? A : B).id.slice(1)}_${spec}`;
  const basicOf = spec => { for (const b of cy.biomes) for (const x of b.basics) if (x[2] === spec) return x[0]; throw new Error('нет базового ' + spec + ' в цикле ' + c); };
  for (const b of cy.biomes) {
    const bn = b.id.slice(1);
    for (const [id, n, spec, lore] of b.basics) addItem({ id, n, cyc: c, b: b.id, tier: 'basic', spec, r: 1, lore, team,
      src: [`Рядовые · ${b.n} · 1–3 за врага`, `Элиты · ${b.n} · 1–2`, `Ритуалы рабочих · ${b.n}`] });
    b.keys.forEach(([n, elite, lore], si) => {
      const spec = C.SPEC_ORDER[si], id = `k${bn}_${spec}`;
      const src = [`Элита${elite ? ' «' + elite + '»' : ''} · ${b.n} · 1 гарантированно`, `Ритуалы рабочих · ${b.n} · от эпической редкости`];
      if (cr.boss[1] === spec) src.push(`Крафтовый босс «${cr.boss[0]}» · Эхо · 2 ключа ремесла`);
      addItem({ id, n, cyc: c, b: b.id, tier: 'key', spec, r: 2, lore, team, elite: elite || null, src });
    });
    const [uid, un, ulore, uimg] = b.unique;
    addItem({ id: uid, n: un, cyc: c, b: b.id, tier: 'unique', spec: null, r: 4, img: uimg || null, lore: ulore, team,
      src: [`Босс биома «${b.boss}» · ${C.ENEMY.boss.uniqueBp / 100} % за победу`, 'Уникальный ритуал рабочих · 1 % в ролле пула'] });
  }
  const W = C.GUARD.limits.weightsBp;
  for (let k = 1; k <= 5; k++) addItem({ id: `rn${c}_${k}`, n: `Руна предела ${ROMAN[k]} · цикл ${R}`, cyc: c, b: A.id, tier: 'rune', spec: null, r: [0, 2, 2, 3, 4, 5][k], glyph: ROMAN[k], team,
    lore: k === 1 ? 'Десять рун одного цикла пробивают предел.' : k === 5 ? 'Пятая руна — самая редкая.' : 'Три младшие руны перековываются в одну старшую.',
    src: [`Рунный страж «${A.guard}» · 2 руны за победу, предел ${ROMAN[k]} — ${W[k - 1] / 100} %`].concat(k > 1 ? [`Мастерская · три руны предела ${ROMAN[k - 1]}`] : []) });
  addItem({ id: `vs${c}`, n: `Осколок доблести · цикл ${R}`, cyc: c, b: B.id, tier: 'vshard', spec: null, r: 3, glyph: 'V', team,
    lore: 'Сто осколков собираются в одну руну доблести.', src: [`Рунный страж «${B.guard}» · 1–10 осколков за победу`] });
  addItem({ id: `vr${c}`, n: `Руна доблести · цикл ${R}`, cyc: c, b: null, tier: 'valor', spec: null, r: 4, glyph: 'V', team,
    lore: 'Одна руна — одна доблесть: +30 % к силе и новая глава героя.', src: ['Мастерская · из 100 осколков'] });
  cy.parts.forEach(([n, lore], i) => {
    const id = `p${c}${'abc'[i]}`, [s1, s2] = PART_Q[i], [k1, k2] = [PART_KEYS[i * 2], PART_KEYS[i * 2 + 1]];
    addItem({ id, n, cyc: c, b: null, tier: 'part', spec: s1[0] + '+' + s2[0], r: 2, lore, team, src: ['Мастерская · заготовка'] });
    addRecipe({ id: 'r_' + id, cyc: c, n, kind: 'part', out: [id, 1],
      in: [[basicOf(s1[0]), s1[1]], [basicOf(s2[0]), s2[1]], [key(k1[0], k1[1]), 1], [key(k2[0], k2[1]), 1]],
      why: `Заготовка цикла ${R}: ${lc(C.SPECS[s1[0]].n)} и ${lc(C.SPECS[s2[0]].n)}. По одному ключу из мастерской и из творения.`, team });
  });
  for (let k = 2; k <= 5; k++) addRecipe({ id: `r_rn${c}_${k}`, cyc: c, n: `Руна предела ${ROMAN[k]} · цикл ${R}`, kind: 'rune', out: [`rn${c}_${k}`, 1],
    in: [[`rn${c}_${k - 1}`, 3], [key(RUNE_KEYS[k][0], RUNE_KEYS[k][1]), 1]], why: 'Перековка младших рун в старшие — сток излишков (GDD §10.1).', team });
  addRecipe({ id: `r_vr${c}`, cyc: c, n: `Руна доблести · цикл ${R}`, kind: 'valor', out: [`vr${c}`, 1], in: [[`vs${c}`, C.GUARD.valor.shardsPerRune]],
    why: 'Руна собирается из 100 осколков (GDD §10.2). Рецепт известен с первого осколка.', known0: true, team });
  const uOf = list => list.find(([id]) => /^u\d+$/.test(id))[0];
  cr.actUnique = uOf(cr.act[2]); cr.callUnique = uOf(cr.call[2]);
  const actIn = [[`p${c}a`, 1], [`p${c}b`, 1], [cr.actUnique, 1]];
  if (c > 1) actIn.push([`tr${c - 1}`, 1], [OLD_BASIC[c], 30]);
  actIn.push([key('eng', 'B'), 1]);
  addItem({ id: `act${c}`, n: cr.act[0], cyc: c, b: null, tier: 'act', spec: null, r: 3, lore: cr.act[1], team, opens: cr.biome[0], opensLore: cr.biome[1], src: ['Мастерская · рецепт'] });
  addRecipe({ id: `r_act${c}`, cyc: c, n: cr.act[0], kind: 'act', out: [`act${c}`, 1], in: actIn, why: `${cr.act[3]} Открывает крафтовый биом «${cr.biome[0]}».`, team });
  addItem({ id: `find${c}`, n: cr.find[0], cyc: c, b: null, tier: 'find', spec: null, r: 3, lore: cr.find[1], team, src: [`Крафтовый биом «${cr.biome[0]}» · 1 гарантированно, вторая — 50 %`] });
  addItem({ id: `call${c}`, n: cr.call[0], cyc: c, b: null, tier: 'call', spec: cr.boss[1], r: 3, lore: cr.call[1], team, opens: cr.boss[0], opensLore: cr.boss[2], src: ['Мастерская · рецепт'] });
  addRecipe({ id: `r_call${c}`, cyc: c, n: cr.call[0], kind: 'call', out: [`call${c}`, 1],
    in: [[`p${c}c`, 2], [cr.callUnique, 1], [`find${c}`, 1], [key('hunt', 'A'), 1], [key('tail', 'B'), 1]],
    why: `${cr.call[3]} Призывает в Эхо крафтового босса «${cr.boss[0]}» (ремесло — ${lc(C.SPECS[cr.boss[1]].n)}).`, team });
  addItem({ id: `tr${c}`, n: cr.trophy[0], cyc: c, b: null, tier: 'trophy', spec: cr.boss[1], r: 4, lore: cr.trophy[1], team, src: [`Крафтовый босс «${cr.boss[0]}» · Эхо · 1 за победу`] });
  for (const it of cy.extra.items) addItem(Object.assign({ cyc: c, b: null, spec: null, team, src: [] }, it));
  for (const r of cy.extra.recipes) addRecipe(Object.assign({ cyc: c, team }, r));
}
module.exports = { items, recipes, byId, CYC, ROMAN };
if (require.main === module) require('./emit')(module.exports);
