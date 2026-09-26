/* Таблицы для docs/content/ресурсы-рецепты-дроп.md — из тех же данных, что recipes.js. */
const fs = require('fs');
const C = require('./common');
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pct = bp => (bp % 100 ? (bp / 100).toFixed(2).replace('.', ',') : String(bp / 100)) + ' %';
module.exports = function tables({ items, recipes, byId, CYC, ROMAN, drops, OUT_MD }) {
  const L = [];
  const ing = list => list.map(([id, q]) => `${byId[id].n} ×${q}`).join(', ');
  const spec = s => s ? s.split('+').map(x => C.SPECS[x].n.toLowerCase()).join(' + ') : '—';
  for (const cy of CYC) {
    const c = cy.n, R = ROMAN[c];
    L.push(`<!-- cycle ${c} resources -->`);
    for (const b of cy.biomes) {
      L.push(`\n**${b.id.slice(1)}. ${b.n}** — ${b.kind}; босс «${b.boss}», рунный страж «${b.guard}».${cy.team ? ' **Для команды: спойлер §38.**' : ''}\n`);
      L.push('| Ресурс | Ярус | Ремесло | Откуда | Почему так называется |', '|---|---|---|---|---|');
      for (const it of items.filter(x => x.b === b.id && ['basic', 'key', 'unique'].includes(x.tier))) {
        const where = it.tier === 'basic' ? 'рядовые, 1–3; элиты, 1–2' : it.tier === 'key' ? `элита${it.elite ? ' «' + it.elite + '»' : ''}, 1 гарантированно` : `босс «${b.boss}», ${pct(C.ENEMY.boss.uniqueBp)}`;
        L.push(`| ${it.n} | ${C.TIERS[it.tier].n.toLowerCase()} | ${it.spec ? C.SPECS[it.spec].n.toLowerCase() : '—'} | ${where} | ${it.lore} |`);
      }
    }
    L.push(`\n<!-- cycle ${c} recipes -->\n`);
    L.push('| Рецепт | Входы | Выход | Зачем |', '|---|---|---|---|');
    for (const r of recipes.filter(x => x.cyc === c && x.kind !== 'rune' && x.kind !== 'valor')) L.push(`| ${r.n} | ${ing(r.in)} | ${byId[r.out[0]].n} ×${r.out[1]} | ${r.why} |`);
    const rn = recipes.filter(x => x.cyc === c && x.kind === 'rune');
    L.push(`| Руны пределов II–V | по три младшие руны + ${rn.map(r => byId[r.in[1][0]].n).join(' / ')} | руна следующего предела ×1 | Перековка младших рун в старшие (§10.1) |`);
    L.push(`| Руна доблести · цикл ${R} | Осколок доблести ×100 | Руна доблести ×1 | Известна с первого осколка (§10.2) |`);
    L.push(`\n<!-- cycle ${c} craft -->\n`);
    const cb = drops.craftBiomes.find(x => x.cyc === c), cs = drops.craftBosses.find(x => x.cyc === c && x.call === 'call' + c);
    L.push(`- Крафтовый биом «${cb.name}»: активация «${byId['act' + c].n}», находка «${byId['find' + c].n}». ${byId['act' + c].opensLore}`);
    L.push(`- Крафтовый босс «${cs.name}» (${C.SPECS[cs.spec].n.toLowerCase()}): призыв «${byId['call' + c].n}», трофей «${byId['tr' + c].n}». ${byId['call' + c].opensLore}`);
  }
  L.push('\n<!-- enemies -->\n');
  L.push('| Биом | Цикл | Рядовой: золото / дух | Элита: золото / дух / души | Босс: золото / дух / души |', '|---|---|---|---|---|');
  for (const e of drops.enemies) { const b = CYC.flatMap(x => x.biomes).find(x => x.id === e.biome);
    L.push(`| ${e.biome.slice(1)}. ${e.cyc === 6 ? 'для команды' : b.n} | ${ROMAN[e.cyc]} | ${fmt(e.ordinary.gold)} / ${fmt(e.ordinary.spirit)} | ${fmt(e.elite.gold)} / ${fmt(e.elite.spirit)} / ${e.elite.souls} | ${fmt(e.boss.gold)} / ${fmt(e.boss.spirit)} / ${e.boss.souls} |`); }
  L.push('\n<!-- guardians -->\n');
  L.push('| Цикл | Страж пределов | Вход, ключей | Страж доблести | Вход, ключей |', '|---|---|---|---|---|');
  for (const cy of CYC) { const g = drops.guardians.filter(x => x.cyc === cy.n);
    L.push(cy.team ? `| ${ROMAN[cy.n]} | для команды | ${g[0].entryKeys} | для команды | ${g[1].entryKeys} |` : `| ${ROMAN[cy.n]} | ${g[0].name} | ${g[0].entryKeys} | ${g[1].name} | ${g[1].entryKeys} |`); }
  L.push('\n<!-- rituals heroes -->\n');
  const W = drops.rituals.workers, HR = drops.rituals.heroes;
  L.push('| Редкость | Рабочие: время | Базовые | Ключи ремесла | Герои: время | Золото | Дух | Души |', '|---|---|---|---|---|---|---|---|');
  for (let r = 0; r < 7; r++) L.push(`| ${r + 1} | ${W.minutes[r]} мин | ${W.basics[r]} | ${W.keys[r]} | ${HR.minutes[r] / 60} ч | ${fmt(HR.byCycle[0].gold[r])} | ${fmt(HR.byCycle[0].spirit[r])} | ${HR.byCycle[0].souls[r]} |`);
  L.push('\n<!-- contracts -->\n');
  L.push('| Цикл | День, 70 очков: ключи / золото / дух / базовые | Неделя, 300 очков: ключи / золото / дух / базовые / Энериум | Заверение дня / недели, золото |', '|---|---|---|---|');
  for (const x of drops.contracts.byCycle) L.push(`| ${ROMAN[x.cyc]} | ${x.day.runeKeys} / ${fmt(x.day.gold)} / ${fmt(x.day.spirit)} / ${x.day.basics} | ${x.week.runeKeys} / ${fmt(x.week.gold)} / ${fmt(x.week.spirit)} / ${x.week.basics} / ${x.week.enerium} | ${fmt(x.day.stakeGold)} / ${fmt(x.week.stakeGold)} |`);
  L.push('\n<!-- craft drops -->\n');
  L.push('| Цикл | Крафтовый биом: находки / золото / дух / души / осколки сборных / базовые | Крафтовый босс: трофей / ларец рабочих / ключи ремесла / Энериум |', '|---|---|---|');
  for (const cy of CYC) { const b = drops.craftBiomes.find(x => x.cyc === cy.n), s = drops.craftBosses.find(x => x.cyc === cy.n && x.call === 'call' + cy.n);
    L.push(`| ${ROMAN[cy.n]} | 1 + 50 % / ${fmt(b.gold)} / ${fmt(b.spirit)} / ${b.souls} / ${b.heroShards} / ${b.basics} | 1 / редкость ${s.workerBoxRarity} / ${s.specKeys} / ${s.enerium} |`); }
  L.push('\n<!-- lootboxes -->\n');
  L.push('| Редкость ларца | Редкость содержимого | Предметов | Золото, цикл I |', '|---|---|---|---|');
  for (let n = 1; n <= 7; n++) L.push(`| ${n} | ${drops.lootboxes.rarityFrom[n - 1]}–${n} | ${drops.lootboxes.items[n - 1]} | ${fmt(drops.lootboxes.goldByCycle[0][n - 1])} |`);
  const cl = drops.clearB1;
  L.push(`\n<!-- clear b1 -->\n\nПолный забег Мастерской форм по колоде прототипа: ${cl.ordinary} рядовых, ${cl.elite} элит, босс → золото ${fmt(cl.gold)}, дух ${fmt(cl.spirit)}, души ${cl.souls}, базовых около ${cl.basicsAvg}, ключей ремёсел ${cl.specKeys}, рунических ключей ${(cl.runeKeysPer100Clears / 100).toFixed(2).replace('.', ',')} в среднем, уникальный — ${cl.uniquePer100Clears} раз на 100 закрытий.`);
  fs.writeFileSync(OUT_MD, L.join('\n') + '\n', 'utf8');
};
