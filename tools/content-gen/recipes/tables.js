/* Таблицы для docs/content/ресурсы-рецепты-дроп.md и docs/content/ресурсы-каталог.md — из тех же данных, что recipes.js.
   Каждый блок начинается меткой <!-- имя -->. Блок inline — числа для текста: assemble.js подставляет их вместо {{имя}}.
   Темп доблести считает tempo.py — его блоки в tempo.md. */
const fs = require('fs');
const C = require('./common');
/* иммунитет к контролю — по рангу типа призванного врага: таблица ядра RULES.resist (ADR-0010, ADR-0039), своих чисел нет */
const EB = (() => { require('../../../design/ui/battle.js'); return globalThis.EnBattle; })();
const G_NAME = { e: 'элита', b: 'босс', u: 'Убер', f: 'Забытый' };
const immBp = g => EB.RULES.resist[EB.RULES.echo.kind[g]] || 0;
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pct = bp => (bp % 100 ? (bp / 100).toFixed(2).replace(/0$/, '').replace('.', ',') : String(bp / 100)) + ' %';   // 1350 → 13,5 %
const x100 = n => (n % 100 ? (n / 100).toFixed(2).replace(/0$/, '').replace('.', ',') : String(n / 100));
const esc = s => String(s == null ? '' : s).replace(/\|/g, '/').replace(/\n/g, ' ');
const KIND = { part: 'заготовка', made: 'изделие', act: 'активация', call: 'призыв', hero: 'герой', product: 'награда', story: 'сюжет', rune: 'руна', valor: 'руна доблести' };
const raceLc = r => ['Забытые', 'Перворождённые'].includes(r) ? r : String(r || '').toLowerCase();
const TIER_ORDER = ['trophy', 'unique', 'echo', 'find', 'craftres', 'key', 'vshard', 'rune', 'product', 'basic'];
/* порядок семейств в каталоге цикла */
const FAM_ORDER = ['key', 'unique', 'recraft', 'memcall', 'memtrophy', 'ruin', 'city', 'res', 'find', 'lure', 'call', 'trophy', 'awcall', 'awtrophy',
  'part', 'made', 'karst', 'fuel', 'product', 'mask', 'echo', 'hero', 'rune', 'vshard', 'valor', 'wallet', 'ener', 'dust', 'basic'];

module.exports = function tables({ items, recipes, byId, CYC, ROMAN, places, memories, drops, stats, USE, OUT, isDrop, OUT_MD, sheets, sink }) {
  const L = [], block = n => L.push(`\n<!-- ${n} -->\n`);
  const nm = id => byId[id].n;
  const ing = list => list.map(([id, q]) => `${nm(id)} ×${q}`).join(', ');
  const cyLabel = cy => `${ROMAN[cy.n]}${cy.team ? ' · для команды' : ''}`;
  const famN = f => C.FAMS[f] || f;
  const usedIn = (id, c, max = 4) => {
    const outs = [...new Set((USE[id] || []).map(r => r.out[0]))];
    if (!outs.length) return '—';
    const names = outs.map(o => nm(o) + (c === null || byId[o].cyc !== c ? ` (${ROMAN[byId[o].cyc]})` : ''));
    return names.length > max ? names.slice(0, max).join('; ') + `; ещё ${names.length - max}` : names.join('; ');
  };
  const bomLine = bom => Object.entries(bom || {}).sort((a, b) => TIER_ORDER.indexOf(byId[a[0]].tier) - TIER_ORDER.indexOf(byId[b[0]].tier) || byId[a[0]].cyc - byId[b[0]].cyc)
    .map(([id, q]) => `${nm(id)} ×${q}`).join(', ');
  const main = id => (OUT[id] || []).find(r => r.sinkMain) || (OUT[id] || [])[0];
  const pool = items.filter(i => i.pool);
  const S = stats.byCycle, T = stats.total, SK = sink.summary, SD = sink.detail;
  const fam = f => items.filter(i => i.fam === f);
  const heroRecs = recipes.filter(r => r.kind === 'hero');
  const tut = SK.find(s => s.tutorial) || {};
  const tp = tut.tutPath || {};
  const nonHero = items.filter(i => i.tier !== 'hero').length;

  /* ——— числа для текста ——— */
  const TF = T.fams;
  const s24 = sheets.filter(s => s.size === 24).length, s16 = sheets.length - s24;
  const keysRange = SK.filter(s => !s.tutorial).map(s => `${ROMAN[s.cyc]} ${s.keysPct} %`).join(' · ');
  const basicsRange = SK.filter(s => !s.tutorial).map(s => `${ROMAN[s.cyc]} ${s.basicsPct} %`).join(' · ');
  const placesPct = SD.filter(d => d.cyc > 1).flatMap(d => d.places.map(p => p.resPct));
  const findsPct = SD.filter(d => d.cyc > 1).flatMap(d => d.places.map(p => p.findPct));
  const keyPctAll = SD.filter(d => d.cyc > 1).flatMap(d => d.keys.map(k => k.pct));
  const inline = {
    items: T.items, recipes: T.recipes, drops: T.drops, crafted: T.crafted, nonHero, pool: T.pool,
    itemsByCycle: S.map(s => s.items).join(' / '), recipesByCycle: S.map(s => s.recipes).join(' / '),
    key: TF.key, unique: TF.unique, res: TF.res, find: TF.find, trophy: TF.trophy, awtrophy: TF.awtrophy, memtrophy: TF.memtrophy,
    part: TF.part, made: TF.made, karst: TF.karst, fuel: TF.fuel, ruin: TF.ruin, city: TF.city, call: TF.call, awcall: TF.awcall, memcall: TF.memcall,
    recraft: TF.recraft, lure: TF.lure || 0, hero: TF.hero, rune: TF.rune, vshard: TF.vshard, valor: TF.valor, product: TF.product,
    places: places.length, ruins: places.filter(p => p.kind === 'ruin').length, cities: places.filter(p => p.kind === 'city').length,
    placesByCycle: CYC.map(cy => places.filter(p => p.cyc === cy.n).length).join(' / '), memories: memories.length,
    placesCum: CYC.map(cy => places.filter(p => p.cyc <= cy.n).length).join(' → '), activeCap: C.CRAFT.activeCap.join(' / '),
    heroes: heroRecs.length, heroesByCycle: S.map(s => s.kinds.hero).join(' / '),
    sheets: sheets.length, sheets24: s24, sheets16: s16,
    keysPct: keysRange, basicsPct: basicsRange,
    keyMin: Math.min(...keyPctAll), keyMax: Math.max(...keyPctAll), placeMin: Math.min(...placesPct), placeMax: Math.max(...placesPct),
    findMin: Math.min(...findsPct), findMax: Math.max(...findsPct),
    tutKeys: x100(tp.keysX100 || 0), tutBasics: x100(tp.basicsX100 || 0), tutKeysPct: tp.keysPct, tutBasicsPct: tp.basicsPct,
    tutAllKeysPct: tut.keysPct, tutAllBasicsPct: tut.basicsPct, tutRestKeys: Math.ceil((tp.restKeysX100 || 0) / 100), tutRestRuns: tp.restRuns,
    tutIncomeKeys: C.SINK.tutorial.keys, tutIncomeBasics: C.SINK.tutorial.basics, cycle1bElites: C.DECKS.cycle1b.elites,
    craftShare: pct(C.SINK.craftShareBp[2]), runMin: C.SINK.runMin, hours: C.SINK.hours,
    summonsPerDay: C.SINK.summonsPerDayX100.slice(2).map(x100).join(' / '),
    mixCraft: pct(C.SINK.summonMixBp.craft), mixMemory: pct(C.SINK.summonMixBp.memory), mixCity: pct(C.SINK.summonMixBp.city),
    resPerFloor: pct(C.CRAFT.biome.resPerFloorBp), floors: C.CRAFT.biome.floors, resFloor: pct(C.CRAFT.biome.resFloorBp), secondFind: pct(C.CRAFT.biome.secondFindBp),
    enerStep: C.ENER.step, dustKeyIn: C.DUST.keyIn, dustKeyOut: C.DUST.keyDust, dustRuneIn: C.DUST.runeIn, dustRuneOut: C.DUST.runeDust,
    dustShard: C.DUST.shardDust, dustValorIn: C.DUST.valorIn, dustValorShards: C.DUST.valorShards, dustFifth: C.DUST.fifthDust,
    bossRuneKey: pct(C.CRAFT.boss.runeKeyBp), biomeRuneKey: pct(C.CRAFT.biome.runeKeyBp), memRuneKey: pct(C.CRAFT.memory.runeKeyBp), awakeRuneKey: pct(C.CRAFT.awake.runeKeyBp),
    bossEner: C.CRAFT.boss.enerium, memEner: C.CRAFT.memory.enerium,
    ener2Day5: x100(SK.find(s => s.cyc === 5).ener2X100), ener2Day6: x100(SK.find(s => s.cyc === 6).ener2X100),
    oldKeys6: x100(SK.find(s => s.cyc === 6).oldKeysX100),
    manyCycle: ROMAN[byId[C.CRAFT.awake.item].cyc],
    awakeTrophies: C.CRAFT.awake.trophies, awakeKeys: C.CRAFT.awake.specKeys, awakeChestStep: C.CRAFT.awake.chestStep, awakeMul: C.CRAFT.awake.currencyMul,
    heroValor: [1, 2, 3, 4, 5].map(v => `${v} — ${heroRecs.filter(r => byId[r.out[0]].maxV === v).length}`).join(', '),
  };
  block('inline');
  for (const [k, v] of Object.entries(inline)) L.push(`${k}: ${v}`);

  /* ——— сводка по циклам ——— */
  block('summary');
  L.push('| Цикл | Предметов | Добыча / создаётся | Рецептов | Ключи | Уникальные | Ресурсы мест | Находки | Трофеи | Заготовки, изделия, приманки | Карсты и топливо | Места: руины + города | Призывы: крафтовые / пробуждённые / эхо | Герои | Руны |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of S) { const f = s.fams, cy = CYC[s.cyc - 1];
    L.push(`| ${cyLabel(cy)} | ${s.items} | ${s.drops} / ${s.crafted} | ${s.recipes} | ${f.key} | ${f.unique} | ${f.res} | ${f.find} | ${f.trophy + f.awtrophy + f.memtrophy} | ${f.part + f.made + f.recraft + (f.lure || 0)} | ${f.karst + f.fuel} | ${f.ruin} + ${f.city} | ${f.call} / ${f.awcall} / ${f.memcall} | ${f.hero} | ${f.rune + f.vshard + f.valor} |`); }
  L.push(`| Всего | ${T.items} | ${T.drops} / ${T.crafted} | ${T.recipes} | ${TF.key} | ${TF.unique} | ${TF.res} | ${TF.find} | ${TF.trophy + TF.awtrophy + TF.memtrophy} | ${TF.part + TF.made + TF.recraft + (TF.lure || 0)} | ${TF.karst + TF.fuel} | ${TF.ruin} + ${TF.city} | ${TF.call} / ${TF.awcall} / ${TF.memcall} | ${TF.hero} | ${TF.rune + TF.vshard + TF.valor} |`);
  L.push('', `Общее для всех циклов считается в цикле I: базовые общего пула (${T.pool}), Энериум и рунный ключ в ячейке, кристалл и друза Энериума, руническая пыль.`);

  /* ——— семейства ——— */
  block('fams');
  L.push('| Семейство (fam) | Ярус (tier) | Предметов | Откуда | Куда |', '|---|---|---|---|---|');
  const FROM = { basic: 'любой биом, ритуалы, лавка', key: 'элита биома, один из шести', unique: `босс биома, ${pct(C.ENEMY.uniqueBp)}`, res: `этаж крафтового места, ${pct(C.CRAFT.biome.resPerFloorBp)}, по весу вида`,
    find: `закрытие места: первая — всегда, вторая — ${pct(C.CRAFT.biome.secondFindBp)}`, trophy: 'победа над боссом руины или города', awtrophy: 'победа над пробуждённым', memtrophy: 'победа над эхом босса биома',
    wallet: 'кошелёк: покупка, контракты, Арена, кланы, реклама; победа над призванным врагом', echo: 'Эхо, Многоликий',
    rune: 'страж пределов; старшие — перековкой', vshard: 'страж доблести; из пыли и из руны прошлого цикла — рецептом', valor: 'сто осколков доблести',
    hero: 'скрытый рецепт', ener: 'лестница: сто к одному; кристалл — ещё из зелёных крупиц', dust: 'распыление рунных ключей и лишних рун предела I',
    karst: 'рецепт; Некрониум — сюжетный' };
  const TO = { ruin: 'призывает руину в «Биомы»', city: 'призывает город в «Биомы»', call: 'призывает босса руины или города в Эхо', awcall: 'призывает пробуждённого в Эхо', memcall: 'призывает эхо босса биома в Эхо',
    hero: 'комплект осколков героя', rune: 'предел героя', valor: 'доблесть героя', mask: 'Лик недели в Эхо' };
  for (const f of Object.keys(C.FAMS)) {
    const list = fam(f); if (!list.length) continue;
    const tiers = [...new Set(list.map(i => i.tier))].join(', ');
    L.push(`| ${famN(f)} (${f}) | ${tiers} | ${list.length} | ${FROM[f] || 'мастерская, рецепт'} | ${TO[f] || 'рецепты'} |`);
  }

  /* ——— круг мест цикла ——— */
  block('ring');
  L.push('| Цикл | Место | Вид | Активация — установившийся рецепт | Из прошлого места круга | Разовый путь (первый рецепт) |', '|---|---|---|---|---|---|');
  for (const cy of CYC) {
    const list = places.filter(p => p.cyc === cy.n).sort((a, b) => a.order - b.order);
    list.forEach((p, i) => {
      const r = main(p.act), first = OUT[p.act][0];
      const prev = list[(i - 1 + list.length) % list.length];
      const fromPrev = r.in.filter(([id]) => prev.finds.includes(id) || prev.res.includes(id)).map(([id, q]) => `${nm(id)} ×${q}`);
      const deep = [];   // ресурсы прошлого места внутри изделий активации
      for (const [id] of r.in) { const it = byId[id]; if (isDrop(it)) continue; const rr = main(id); if (rr) for (const [x, q] of rr.in) if (prev.res.includes(x)) deep.push(`${nm(x)} ×${q} (в «${it.n}»)`); }
      L.push(`| ${cyLabel(cy)} | ${i + 1}. ${p.n} | ${p.kind === 'city' ? 'город' : 'руина'} | ${ing(r.in)} | ${fromPrev.concat(deep).join(', ') || '—'} | ${first === r ? '—' : ing(first.in)} |`);
    });
  }

  /* ——— сток: сводка по циклам ——— */
  block('sink');
  L.push('| Цикл | Дней | Доля времени крафтовым местам | Закрытий мест в день | Призывов в день | Ключей: падает / уходит в день | Ключи, % (разброс по ключам) | Базовых: падает / уходит | Базовые, % | Уникальные, % | Ключи прошлых циклов в день | Энериум в день | Кристаллов Энериума в день |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of SK) L.push(`| ${ROMAN[s.cyc]}${s.tutorial ? ' · обучение' : ''} | ${s.days} | ${pct(s.phiBp)} | ${x100(s.runsX100)} | ${x100(s.summonsX100)} | ${x100(s.keySupplyX100)} / ${x100(s.keyDemandX100)} | ${s.keysPct} % (${s.keyMinPct}–${s.keyMaxPct}) | ${x100(s.baseSupplyX100)} / ${x100(s.baseDemandX100)} | ${s.basicsPct} % | ${s.uniqPct} % | ${x100(s.oldKeysX100)} | ${x100(s.enerDirectX100)} | ${x100(s.ener2X100)} |`);

  block('sink-keys');
  L.push('| Цикл | Ключи элит: сток, % от выпадения |', '|---|---|');
  for (const d of SD) L.push(`| ${ROMAN[d.cyc]}${d.cyc === 1 ? ' · обучение' : ''} | ${d.keys.map(k => `${k.n} ${k.pct}`).join(' · ')} |`);

  block('sink-places');
  L.push('| Цикл | Место | Закрытий в день | Ресурсов: падает / уходит в день | Ресурсы, % | Находки, % | Вес видов: ходовые (доля выпадения) |', '|---|---|---|---|---|---|---|');
  for (const d of SD) for (const p of d.places) {
    const top = p.types.slice().sort((a, b) => b.wBp - a.wBp).filter(t => t.wBp > C.CRAFT.biome.resFloorBp).map(t => `${nm(t.id)} ${pct(t.wBp)}`).join(', ');
    L.push(`| ${ROMAN[d.cyc]} | ${p.n} | ${x100(p.runsX100)} | ${x100(p.resSupply)} / ${x100(p.resDemand)} | ${p.resPct} % | ${p.findPct} % | ${top || '—'}; прочие — по ${pct(C.CRAFT.biome.resFloorBp)} |`);
  }

  /* ——— обучение ——— */
  block('tutorial kit');
  L.push('| Шаг обучения | Рецепт | Полная цена — что выдать, если не выпало |', '|---|---|---|');
  const step = ['первый рецепт', 'первый рецепт', 'первый рецепт', 'первая активация крафтового места'];
  C.SINK.tutorial.path.forEach((id, i) => { const r = recipes.find(x => x.id === id); L.push(`| ${step[i] || 'шаг'} | ${r.n} | ${bomLine(r.bom)} |`); });

  /* ——— Энериум ——— */
  block('ener');
  L.push('| Рецепт | Цикл | Входы | Выход | Зачем |', '|---|---|---|---|---|');
  for (const r of recipes.filter(x => x.fam === 'ener' || x.out[0] === C.ENER.t1)) L.push(`| ${r.n} | ${ROMAN[r.cyc]} | ${ing(r.in)} | ${nm(r.out[0])} ×${r.out[1]} | ${esc(r.why)} |`);
  block('ener-calls');
  L.push('| Цикл | Призывы боссов руин и городов | Эхо боссов биомов | Пробуждённые | Энериум возвращает победа: босс руины / эхо |', '|---|---|---|---|---|');
  const enerOf = r => { const e = r.in.find(([id]) => [C.ENER.t1, C.ENER.t2, C.ENER.t3].includes(id)); return e ? `${nm(e[0])} ×${e[1]}` : '—'; };
  const range = list => { const v = [...new Set(list.map(enerOf))]; return v.join(' / ') || '—'; };
  for (const cy of CYC) {
    const c = cy.n, rs = recipes.filter(r => r.cyc === c);
    L.push(`| ${cyLabel(cy)} | ${range(rs.filter(r => r.fam === 'call'))} | ${range(rs.filter(r => r.fam === 'memcall'))} | ${range(rs.filter(r => r.fam === 'awcall'))} | ${C.CRAFT.boss.enerium * c} / ${C.CRAFT.memory.enerium * c} |`);
  }

  /* ——— руническая пыль и перековка рун ——— */
  block('dust');
  L.push('| Рецепт | Цикл | Входы | Выход | Зачем |', '|---|---|---|---|---|');
  const dustIds = recipes.filter(r => r.fam === 'dust' || r.in.some(([id]) => id === C.DUST.id) || /^r_rn\d_5d$/.test(r.id));
  for (const r of dustIds) L.push(`| ${r.n} | ${ROMAN[r.cyc]} | ${ing(r.in)} | ${nm(r.out[0])} ×${r.out[1]} | ${esc(r.why)} |`);
  block('runes');
  L.push('| Цикл | Руны пределов: перековка вверх | Пятая руна через пыль | Руна доблести | Осколки: из пыли / из руны прошлого цикла |', '|---|---|---|---|---|');
  for (const cy of CYC) {
    const c = cy.n, up = recipes.filter(r => new RegExp(`^r_rn${c}_[2-5]$`).test(r.id)), fifth = recipes.find(r => r.id === `r_rn${c}_5d`), vr = recipes.find(r => r.id === `r_vr${c}`);
    const sd = recipes.find(r => r.id === `r_vs${c}_dust`), so = recipes.find(r => r.id === `r_vs${c}_old`);
    L.push(`| ${cyLabel(cy)} | ${up.length ? up.map(r => ing(r.in)).join('; ') : '—'} | ${fifth ? ing(fifth.in) : '—'} | ${vr ? ing(vr.in) : '—'} | ${sd ? `${ing(sd.in)} → ${sd.out[1]}` : '—'} / ${so ? `${ing(so.in)} → ${so.out[1]}` : '—'} |`);
  }

  /* ——— заряженные карсты и топливо ——— */
  block('karst');
  L.push('| Предмет | Семейство | Цикл | Рецепты | Идёт в | Подсказка Этриона |', '|---|---|---|---|---|---|');
  for (const it of items.filter(i => ['karst', 'fuel'].includes(i.fam) || i.id === C.ENER.t1)) {
    const rs = (OUT[it.id] || []).map(r => `${r.n}: ${ing(r.in)} → ×${r.out[1]}${r.kind === 'story' ? ' (сюжет)' : ''}`).join('; ') || 'кошелёк';
    L.push(`| ${it.n} | ${famN(it.fam)} | ${ROMAN[it.cyc]}${it.team ? ' · для команды' : ''} | ${esc(rs)} | ${usedIn(it.id, it.cyc, 6)} | ${esc(it.hint)} |`);
  }

  /* ——— города ——— */
  block('cities');
  L.push('| Цикл | Город | Где | Активация — из чего | Ресурсов города | Босс города · раса | Призыв — из чего | Что город делает в крафте |', '|---|---|---|---|---|---|---|---|');
  for (const p of places.filter(x => x.kind === 'city')) {
    const act = main(p.act), call = OUT[p.boss.call][0];
    const uses = [...new Set(p.res.flatMap(id => (USE[id] || []).map(r => r.out[0])))].filter(o => o !== p.boss.call).map(nm);
    L.push(`| ${cyLabel(CYC[p.cyc - 1])} | ${p.n} | ${esc(p.where)} | ${nm(p.act)}: ${ing(act.in)} | ${p.res.length} | ${p.boss.label} · ${raceLc(p.boss.race)} | ${nm(p.boss.call)}: ${ing(call.in)} | ресурсы идут в ${uses.slice(0, 5).join('; ')}${uses.length > 5 ? `; ещё ${uses.length - 5}` : ''} |`);
  }

  /* ——— эхо боссов биомов ——— */
  block('memories');
  L.push('| Цикл | Биом · босс | Уникальный | Перекрафт — из чего | Призыв эха — из чего | Трофей эха | Трофей идёт в |', '|---|---|---|---|---|---|---|');
  for (const m of memories) {
    const rc = OUT[m.recraft][0], mc = OUT[m.call][0];
    L.push(`| ${cyLabel(CYC[m.cyc - 1])} | ${m.biome.slice(1)}. ${m.boss} | ${nm(m.unique)} | ${nm(m.recraft)}: ${ing(rc.in)} | ${nm(m.call)}: ${ing(mc.in)} | ${nm(m.trophy)} | ${usedIn(m.trophy, m.cyc)} |`);
  }

  /* ——— крафтовые места и их боссы ——— */
  block('places');
  L.push('| Цикл | Место | Вид | Где | Ресурсов | Находки | Босс места · раса · ремесло | Призыв — из чего | Трофей |', '|---|---|---|---|---|---|---|---|---|');
  for (const p of places) {
    const call = OUT[p.boss.call][0];
    L.push(`| ${cyLabel(CYC[p.cyc - 1])} | ${p.n} | ${p.kind === 'city' ? 'город' : 'руина'} | ${esc(p.where)} | ${p.res.length} | ${p.finds.map(nm).join(', ')} | ${p.boss.label} · ${raceLc(p.boss.race)} · ${C.SPECS[p.boss.spec].n.toLowerCase()} | ${ing(call.in)} | ${nm(p.boss.trophy)} |`);
  }
  block('awakened');
  const AW = C.CRAFT.awake;
  L.push('| С цикла | Пробуждённый | Призыв — из чего | Трофей | Трофей идёт в |', '|---|---|---|---|---|');
  for (const p of places) { const a = p.boss.awake; if (!a) continue; const r = OUT[a.call][0];
    L.push(`| ${ROMAN[a.cyc]} | ${a.label} | ${ing(r.in)} | ${nm(p.boss.awTrophy)} | ${usedIn(p.boss.awTrophy, a.cyc)} |`); }
  L.push('', `Тип — Забытый, высшая ступень врага (ADR-0039); сила — на ${AW.powerCycleStep} цикл выше; трофеев ${AW.trophies}, ключей ремесла ${AW.specKeys}, валюта ×${AW.currencyMul}, рунный ключ ${pct(AW.runeKeyBp)}, сундук на ${AW.chestStep} ступень выше.`);

  /* ——— ключи, пул, уникальные ——— */
  block('keys');
  L.push(`| Биом | ${C.SPEC_ORDER.map(s => C.SPECS[s].n).join(' | ')} |`, `|---|${C.SPEC_ORDER.map(() => '---').join('|')}|`);
  for (const cy of CYC) for (const b of cy.biomes)
    L.push(`| ${b.id.slice(1)}. ${b.n}${cy.team ? ' · для команды' : ''} | ${C.SPEC_ORDER.map(s => byId[`k${b.id.slice(1)}_${s}`].n).join(' | ')} |`);
  block('pool');
  L.push('| Ремесло | Базовые общего пула |', '|---|---|');
  for (const s of C.SPEC_ORDER) L.push(`| ${C.SPECS[s].n} | ${pool.filter(i => i.spec === s).map(i => i.n).join(', ')} |`);
  block('uniques');
  L.push('| Цикл | Биом | Босс биома | Уникальный ресурс | Идёт в |', '|---|---|---|---|---|');
  for (const it of items.filter(i => i.tier === 'unique')) { const cy = CYC[it.cyc - 1], b = cy.biomes.find(x => x.id === it.b);
    L.push(`| ${cyLabel(cy)} | ${b.id.slice(1)}. ${b.n} | ${b.boss} | ${it.n} | ${usedIn(it.id, it.cyc, 6)} |`); }

  /* ——— герои ——— */
  block('heroes');
  L.push('| Цикл | Герой | Класс · раса · стихия | Максимум доблести | Рецепт | Вес |', '|---|---|---|---|---|---|');
  for (const r of heroRecs) { const h = byId[r.out[0]];
    L.push(`| ${cyLabel(CYC[h.cyc - 1])} | ${h.n} | ${h.cls || '—'} · ${h.race || '—'} · ${h.school || '—'} | ${h.maxV || '—'} | ${ing(r.in)} | ${r.weight} |`); }

  /* ——— листы иконок ——— */
  block('sheets');
  L.push('| Лист | Цикл | Иконок | Группа | Палитра |', '|---|---|---|---|---|');
  for (const s of sheets) L.push(`| ${s.id} | ${s.cyc ? ROMAN[s.cyc] : 'общий'} | ${s.items.length} из ${s.size} | ${esc(s.palette.join('; '))} | ${esc(s.hue)} |`);

  /* ——— дроп: враги, стражи, крафтовые места, сундуки, рынок ——— */
  block('enemies');
  L.push('| Биом | Цикл | Колода: этажей / элит | Базовые: шанс за этаж / за срабатывание | Рядовой: дух / золото | Элита: дух / золото / души | Босс: дух / золото / души / рунный ключ | Страж: дух / золото |', '|---|---|---|---|---|---|---|---|');
  for (const e of drops.enemies) L.push(`| ${e.biome.slice(1)}. ${e.team ? 'для команды' : e.name} | ${ROMAN[e.cyc]} | ${e.floors} / ${e.elites} | ${pct(e.basePerFloorBp)} / ${e.basicsPerTriggerMax > 1 ? '1–' + e.basicsPerTriggerMax : '1'} | ${fmt(e.ordinary.spirit)} / ${fmt(e.ordinary.gold)} | ${fmt(e.elite.spirit)} / ${fmt(e.elite.gold)} / ${e.elite.souls} | ${fmt(e.boss.spirit)} / ${fmt(e.boss.gold)} / ${e.boss.souls} / ${pct(e.boss.runeKeyBp)} × ${e.boss.runeKeys} | ${fmt(e.guard.spirit)} / ${fmt(e.guard.gold)} |`);
  block('per run');
  L.push('| Биом | Базовых за забег | После обучения | Ключей ремёсел | Душ | Рунных ключей на 100 забегов | Уникальный |', '|---|---|---|---|---|---|---|');
  for (const e of drops.enemies) L.push(`| ${e.biome.slice(1)}. ${e.team ? 'для команды' : e.name} | около ${x100(e.perRun.basicsX100)} | ${e.perRunAfterTutorial ? 'около ' + x100(e.perRunAfterTutorial.basicsX100) : '—'} | ${e.perRun.specKeys}${e.perRunAfterTutorial ? ' → ' + e.perRunAfterTutorial.specKeys : ''} | ${e.perRun.souls} | ${x100(e.perRun.runeKeysX100 || 0)} | ${pct(e.boss.uniqueBp)} |`);
  block('guardians');
  L.push('| Цикл | Страж пределов | Вход, ключей | Страж доблести | Вход, ключей |', '|---|---|---|---|---|');
  for (const cy of CYC) { const g = drops.guardians.filter(x => x.cyc === cy.n);
    L.push(cy.team ? `| ${ROMAN[cy.n]} | для команды | ${g[0].entryKeys} | для команды | ${g[1].entryKeys} |` : `| ${ROMAN[cy.n]} | ${g[0].name} | ${g[0].entryKeys} | ${g[1].name} | ${g[1].entryKeys} |`); }
  block('craft drops');
  L.push('| Место | Цикл | Этажей | Ресурс за этаж | Находки | Дух / золото / души / осколки сборных героев | Рунный ключ |', '|---|---|---|---|---|---|---|');
  for (const b of drops.craftBiomes) L.push(`| ${b.name} | ${ROMAN[b.cyc]} | ${b.floors} | ${pct(b.resPerFloorBp)}, вид — по весу | ${b.finds} + ${pct(b.secondFindBp)} | ${fmt(b.spirit)} / ${fmt(b.gold)} / ${b.souls} / ${b.heroShards} | ${b.runeKeyBp ? pct(b.runeKeyBp) + " × " + b.runeKeys : "—"} |`);
  L.push('', '| Враг из призыва | Вид | Тип по силе | Цикл | Раса | Ремесло | Трофей / ключи ремесла | Дух / золото / Энериум | Рунный ключ | Сундук, редкость | Иммунитет к контролю |', '|---|---|---|---|---|---|---|---|---|---|---|');
  const BK = { ruin: 'босс руины', city: 'босс города', mask: 'Лик недели', memory: 'эхо босса биома', awake: 'пробуждённый' };
  for (const s of drops.craftBosses) L.push(`| ${s.name} | ${BK[s.kind] || s.kind} | ${G_NAME[s.g]} | ${ROMAN[s.cyc]} | ${s.race} | ${s.spec ? C.SPECS[s.spec].n.toLowerCase() : '—'} | ${s.trophy ? nm(s.trophy) + ' ×' + s.trophies : pct(s.heroShardsWeekBp || 0) + ' недельных осколков героев'} / ${s.specKeys} | ${fmt(s.spirit)} / ${fmt(s.gold)} / ${s.enerium} | ${s.runeKeyBp ? pct(s.runeKeyBp) + " × " + s.runeKeys : s.workerBoxRarity ? "изредка, в сундуке" : "—"} | ${s.workerBoxRarity || '—'} | ${pct(immBp(s.g))} |`);
  block('pools');
  L.push('| Цикл | Ключи | Уникальные | Ресурсы мест | Находки | Трофеи | Награды мастерской |', '|---|---|---|---|---|---|---|');
  for (const p of drops.lootboxes.pools) L.push(`| ${cyLabel(CYC[p.cyc - 1])} | ${p.key.length} | ${p.unique.length} | ${p.craftres.length} | ${p.find.length} | ${p.trophy.length} | ${p.products.map(nm).join(', ') || '—'} |`);
  block('market');
  const MK = drops.market;
  L.push(`| Ярус | ${CYC.map(cy => ROMAN[cy.n]).join(' | ')} |`, `|---|${CYC.map(() => '---').join('|')}|`);
  for (const [k, n] of [['basic', 'Базовый'], ['craftres', 'Ресурс крафтового места'], ['key', 'Ключ ремесла'], ['find', 'Находка'], ['unique', 'Уникальный'], ['trophy', 'Трофей']])
    if (MK[k]) L.push(`| ${n} | ${MK[k].map(fmt).join(' | ')} |`);

  /* ——— каталог: общий пул ——— */
  block('pool catalog');
  L.push('| Ресурс | Ремесло | Идёт в | Подсказка Этриона | Арт иконки | Лист |', '|---|---|---|---|---|---|');
  for (const it of pool) L.push(`| ${it.n} | ${C.SPECS[it.spec].n.toLowerCase()} | ${usedIn(it.id, null, 5)} | ${esc(it.hint)} | ${esc(it.art)} | ${it.sheet} |`);
  block('global catalog');
  L.push('| Предмет | Семейство | Рецепты | Идёт в | Подсказка Этриона | Арт иконки | Лист |', '|---|---|---|---|---|---|---|');
  for (const it of items.filter(i => ['wallet', 'ener', 'dust'].includes(i.fam))) {
    const rs = (OUT[it.id] || []).map(r => `${r.n} (${ROMAN[r.cyc]})`).join('; ') || 'кошелёк';
    L.push(`| ${it.n} | ${famN(it.fam)} | ${esc(rs)} | ${usedIn(it.id, null, 5)} | ${esc(it.hint)} | ${esc(it.art)} | ${it.sheet} |`);
  }

  /* ——— каталог по циклам: предметы и рецепты ——— */
  /* откуда — коротко: биом или место и правило семейства; подробные строки «где падает» — в карточке предмета (src) */
  const bName = b => { const p = places.find(x => x.id === b); if (p) return p.n; for (const cy of CYC) { const x = cy.biomes.find(y => y.id === b); if (x) return x.n; } return b; };
  const SHORT = { key: 'элита', unique: 'босс биома', res: 'этаж', find: 'закрытие', trophy: 'босс руины или города', awtrophy: 'пробуждённый', memtrophy: 'эхо босса биома', echo: 'Эхо' };
  const where = it => {
    if (it.pool) return 'общий пул';
    if (isDrop(it)) return `${it.b ? bName(it.b) + ' · ' : ''}${SHORT[it.fam] || 'добыча'}`;
    const rs = OUT[it.id] || [];
    return rs.length > 1 ? `рецепт, путей — ${rs.length}` : 'рецепт';
  };
  for (const cy of CYC) {
    const c = cy.n;
    block(`cycle ${c} items`);
    L.push('| Предмет | Семейство | Ремесло | Откуда | Идёт в | Подсказка Этриона | Арт иконки | Лист |', '|---|---|---|---|---|---|---|---|');
    const list = items.filter(i => i.cyc === c && !i.pool && !['wallet', 'ener', 'dust'].includes(i.fam))
      .sort((a, b) => FAM_ORDER.indexOf(a.fam) - FAM_ORDER.indexOf(b.fam));
    for (const it of list) {
      const goes = it.fam === 'ruin' || it.fam === 'city' ? 'призывает место в «Биомы»' : ['call', 'awcall', 'memcall', 'mask'].includes(it.fam) ? 'призывает врага в Эхо' : it.tier === 'hero' ? 'комплект осколков героя' : usedIn(it.id, c, 3);
      L.push(`| ${it.n} | ${famN(it.fam)} | ${it.spec ? it.spec.split('+').map(s => C.SPECS[s].n.toLowerCase()).join(' + ') : '—'} | ${where(it)} | ${goes} | ${esc(it.hint)} | ${esc(it.art)} | ${it.sheet || '—'} |`);
    }
    block(`cycle ${c} recipes`);
    L.push('| Рецепт | Вид | Входы | Выход | Зачем |', '|---|---|---|---|---|');
    for (const r of recipes.filter(x => x.cyc === c)) L.push(`| ${r.n}${r.sinkMain ? ' · круг' : ''} | ${KIND[r.kind] || r.kind} | ${ing(r.in)} | ${nm(r.out[0])} ×${r.out[1]} | ${esc(r.why)} |`);
  }

  fs.writeFileSync(OUT_MD, L.join('\n') + '\n', 'utf8');
};
