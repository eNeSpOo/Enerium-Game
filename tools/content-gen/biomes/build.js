/* Враги биомов 2–4 для ядра боя и прототипа — сборка, проверки и вывод.
   ADR-0010, ADR-0011, ADR-0014, ADR-0015, ADR-0016, ADR-0018, ADR-0020, ADR-0025; §7, §8, §9, §11 GDD.
   Черновик · предложение · ждёт автора. Все числа — демонстрация. Только целые числа.

   Данные — по биомам, файлы data/b2.js, data/b3.js, data/b4.js: враги (имя, класс, раса, стихия, облик, запись сказителя, набор),
   колода этажей, свита рунного стража, параметры силы и уникальные способности. Источник — docs/content/враги-биомов.md.
   Здесь — правила сборки, проверки и вывод:
   - design/ui/biome-foes.js — данные для ядра и прототипа, руками не править. Формат — в шапке файла (FORMAT ниже).
     Файл сам регистрирует биомы в ядре: EnBattle.addLib, addFoes, addBiome — поэтому грузится после battle.js и abilities.js;
   - docs/content/биомы-2-4.md — текст doc.md, таблицы вместо @@имя@@.
   Только читает и ничего в них не меняет:
   - tools/content-gen/abilities/library.json — библиотека способностей (ADR-0015);
   - tools/content-gen/abilities/kits.json — состав врага по рангу и доли хода по редкости (ADR-0016);
   - design/ui/battle.js, abilities.js, kits.js — ядро: характеристики образцов Мастерской, здоровье и мощь карточек бестиария;
   - design/ui/recipes.js — имена биомов, боссов, стражей и уникальных ресурсов, ставки добычи (drops.enemies);
   - design/ui/assets/art/ — какой арт биомов уже выгружен: арена arena-bN.jpg и портреты foes/<id>.jpg;
   - tools/content-gen/biomes/pace.json — прогон темпа (pace.py), если он сделан на этих же данных.
   Любая ошибка — файлы не пишутся. Пересборка даёт те же байты.
   Запуск: node tools/content-gen/biomes/build.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');
const FILES = {
  library: path.join(ROOT, 'tools/content-gen/abilities/library.json'),
  kits: path.join(ROOT, 'tools/content-gen/abilities/kits.json'),
  data: path.join(__dirname, 'data'),
  doc: path.join(__dirname, 'doc.md'),
  pace: path.join(__dirname, 'pace.json'),
  farm: path.join(__dirname, 'farm.json'),
  art: path.join(UI, 'assets', 'art'),
  outUi: path.join(UI, 'biome-foes.js'),
  outMd: path.join(ROOT, 'docs', 'content', 'биомы-2-4.md'),
};
const BIOMES = ['b2', 'b3', 'b4'];

/* ================================ ПРАВИЛА ================================ */

/* Ранг карты ядра → ключ rankAbilities в kits.json (ADR-0016): сколько способностей, сколько из них ульт, доли хода как у редкости.
   Способности врага — все записи набора: активные, ульты, пассивки (как у Убер-боссов Эхо, echo-foes.js) */
const RANK_KEY = { o: 'рядовой', e: 'элита', b: 'босс биома', rune: 'рунный' };
const RANK_OF = { o: 'o', e: 'e', b: 'b', g: 'rune' };                 // буква id врага → ранг ядра
const TYPE = { o: 'Рядовой', e: 'Элита', b: 'Босс биома', rune: 'Рунный страж' };
const G_OF = { o: 'o', e: 'e', b: 'b', rune: 'b' };                     // ряд бестиария «Спуска»: рядовые, элиты, путь вниз (как у Мастерской)
const CLASSES = ['Физ. ДД силы', 'Физ. ДД ловкости', 'Маг. ДД', 'Танк', 'Лекарь', 'Дебаффер', 'Босс', 'Страж'];
/* Характеристики — по образцу FOES Мастерской (черновик, «Общие правила», п. 8): у карты те же пять чисел и здоровье,
   что у образца её ранга и класса; силу биома задают уровень врагов и здоровье биома. id образца в EnBattle.FOES */
const TEMPLATE = {
  o: { 'Физ. ДД силы': 'o1', 'Дебаффер': 'o2', 'Маг. ДД': 'o3', 'Танк': 'o4', 'Лекарь': 'o5', 'Физ. ДД ловкости': 'o6' },
  e: { 'Физ. ДД силы': 'e1', 'Физ. ДД ловкости': 'e2', 'Танк': 'e3', 'Маг. ДД': 'e4', 'Лекарь': 'e5', 'Дебаффер': 'e6' },
  b: { 'Босс': 'b1' },
  rune: { 'Страж': 'g1' },
};
/* Обычный рядовой-стрелок: у Мастерской ловкий рядовой только один — редкий убийца. Стрелок — медленнее и крепче его */
const ARCHER_ST = [60, 25, 100, 90, 70];
/* Боевая мощь карточки бестиария — §6: БМ = C × √(УВС × ЭЗ) со слоем 1 — вкладом способностей (ADR-0051): одна функция ядра EnBattle.bm
   на героев и врагов. C — косметическая, × 100 */
const BM_C_X100 = 4000;   // C = 40 — косметическая ручка §6; её же берёт общая функция мощи героев BM (design/ui/index.html) и клан
/* Поля уникальной способности, которые ядро понимает (как в abilities.js и echo-foes.js). Чужое поле — ошибка сборки */
const UNIQUE_FIELDS = ['tgt', 'targets', 'ch', 'coef', 'stat', 'ult', 'st', 'pow', 'left', 'focus', 'steal', 'pas', 'dmgPct', 'guardPct', 'every', 'cast', 'then', 'drain'];
const TGT = ['threat', 'danger', 'lowest', 'healer', 'ally_lowest', 'ally_strong', 'all', 'allies', 'self'];

/* ================================ ЗАГРУЗКА ================================ */

const err = [];
const fail = m => err.push(m);
const read = p => fs.readFileSync(p, 'utf8');
const LIBJ = JSON.parse(read(FILES.library)), KITS = JSON.parse(read(FILES.kits));
const LIB = {};
for (const s of Object.values(LIBJ.sets)) for (const [k, t] of [['active', 'act'], ['ult', 'ult'], ['passive', 'pas'], ['reaction', 'react']]) for (const x of s[k] || []) LIB[x.id] = Object.assign({ t }, x);
/* черты врагов (ADR-0051) — набор «Черты врагов» библиотеки: пассивки и реакции именных врагов */
for (const [k, t] of [['passive', 'pas'], ['reaction', 'react']]) for (const x of (LIBJ.foeTraits || {})[k] || []) LIB[x.id] = Object.assign({ t, foe: true }, x);
const LIBNAME = {};
for (const x of Object.values(LIB)) (LIBNAME[x.n] = LIBNAME[x.n] || []).push(x.id);
const RANKS = KITS.rules.rankAbilities, SHARES = KITS.rules.rarityShares;

/* ядро прототипа в песочнице: EnBattle, библиотека и наборы — для образцов, проверки наборов и карточек бестиария */
function sandbox(extra) {
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['battle.js', 'abilities.js', 'kits.js', 'recipes.js']) vm.runInContext(read(path.join(UI, f)), ctx, { filename: f });
  if (extra) vm.runInContext(extra, ctx, { filename: 'biome-foes.js' });
  return ctx;
}
const S0 = sandbox();
const EB0 = S0.EnBattle, RX = S0.EN_RECIPES;

const DATA = BIOMES.map(id => {
  const file = path.join(FILES.data, id + '.js');
  delete require.cache[require.resolve(file)];
  const d = require(file);
  if (d.id !== id) fail(`${id}.js: id «${d.id}»`);
  return d;
});

/* ================================ СБОРКА ================================ */

const fullId = (b, short) => b.id + short;
const rankOf = short => RANK_OF[short[0]];
const floors = b => b.deck.map(s => s.trim().split(/\s+/));
/* колода этажа ядра: g — o рядовые, e элита с сопровождением, b босс; первым идёт лидер (battle.js, FLOORS) */
const floorOf = (b, ids) => ({ g: ids.some(x => x[0] === 'b') ? 'b' : ids.some(x => x[0] === 'e') ? 'e' : 'o', m: ids.map(x => fullId(b, x)) });

function kitOf(b, short, f) {
  const rank = rankOf(short), R = RANKS[RANK_KEY[rank]], sh = SHARES[R.sharesAs], own = b.unique.filter(u => u.owner === short);
  const kit = f.kit.map(([id, as, tgt]) => {
    const u = own.find(x => x.id === id), L = LIB[id];
    if (!u && !L) { fail(`${b.id}${short}: нет способности «${id}» ни в библиотеке, ни в уникальных`); return null; }
    if (u && (as || tgt)) fail(`${b.id}${short}: уникальной «${u.n}» имя и цель задаются в ней самой`);
    if (L && !u && L.set !== f.el) fail(`${b.id}${short}: «${id}» — не школа стихии врага (${f.el}); враги берут приёмы своей стихии (ADR-0016)`);
    if (tgt && !TGT.includes(tgt)) fail(`${b.id}${short}: правило цели «${tgt}»`);
    const slot = u ? u.t : L.t === 'ult' ? 'ult' : L.t === 'pas' ? 'pas' : L.t === 'react' ? 'react' : 'act';
    return Object.assign({ v: 0, slot, id }, as ? { as } : {}, tgt ? { tgt } : {});
  }).filter(Boolean);
  const ults = kit.filter(x => x.slot === 'ult').length;
  if (kit.length !== R.abilities || ults !== R.ults) fail(`${b.id}${short}: способностей ${kit.length}, из них ульт ${ults}; ранг «${RANK_KEY[rank]}» — ${R.abilities} и ${R.ults} (ADR-0016)`);
  /* черта именного врага (ADR-0051): элите, боссу и рунному стражу — запись набора «Черты врагов» по имени (поле trait врага);
     рядовому черта не положена. В число способностей по рангу черта не входит; шанс реакции — по рангу, как у героя по редкости */
  if ((rank !== 'o') !== !!f.trait) fail(`${b.id}${short}: ${rank === 'o' ? 'у рядового черты нет — рядовые остаются простыми' : 'у именного врага нет черты'} (ADR-0051)`);
  if (f.trait) {
    const tid = (LIBNAME[f.trait] || []).find(id => LIB[id].foe);
    if (!tid) fail(`${b.id}${short}: черты «${f.trait}» нет в наборе «Черты врагов» библиотеки`);
    else { const a = LIB[tid], it = { v: 0, slot: a.t, id: tid, trait: true }; if (a.t === 'react' && a.ch) it.chR = Math.floor(a.ch * sh.act / SHARES['эпическая'].act); kit.push(it); }
  }
  return { rank, ultPct: R.ults ? sh.ult : 0, actPct: sh.act, kit };
}

function statsOf(b, short, f) {
  const rank = rankOf(short);
  if (!CLASSES.includes(f.cls)) fail(`${b.id}${short}: класс «${f.cls}» не знаком ядру`);
  const tid = f.rare || rank !== 'o' || f.cls !== 'Физ. ДД ловкости' ? (TEMPLATE[rank] || {})[f.cls] : null;
  const T = tid ? EB0.FOES[tid] : null;
  if (rank !== 'o' || f.cls !== 'Физ. ДД ловкости' || f.rare) { if (!T) fail(`${b.id}${short}: нет образца Мастерской для «${f.cls}» ранга ${rank}`); }
  const st = f.st || (T ? T.st.slice() : ARCHER_ST.slice());
  const hpPct = T ? T.hpPct : EB0.FOES.o6.hpPct;
  return { st, hpPct, tpl: tid || 'стрелок' };
}

const uniques = [], foes = {}, cards = {}, biomes = {}, names = {};
/* имена приёмов врагов Мастерской (kits.json) — чтобы тот же приём не звался у врагов биомов иначе и наоборот */
for (const [fid, f] of Object.entries(KITS.foes)) for (const x of f.kit) if (x.as && LIB[x.id]) {
  const L = LIB[x.id]; names[x.as] = { lib: x.id, sig: `${L.kind}.${L.tier}.${x.tgt || L.tgt}`, who: fid + ' Мастерской' };
}
for (const b of DATA) {
  /* полный вариант биома цикла I — с цикла II (ADR-0044): своя колода и страж, те же враги */
  const FF = b.full ? b.full.deck.map(s => s.trim().split(/\s+/)) : [];
  const F = floors(b), used = new Set(F.flat().concat(b.guard, FF.flat(), b.full ? b.full.guard : []));
  for (const short of Object.keys(b.foes)) if (!used.has(short)) fail(`${b.id}${short}: враг не встречается ни в колоде, ни в свите стража`);
  for (const short of used) if (!b.foes[short]) fail(`${b.id}: в колоде или свите «${short}», а такого врага нет`);
  const n = { o: 0, e: 0, b: 0, g: 0 }; for (const k of Object.keys(b.foes)) n[k[0]]++;
  if (n.o !== 6 || n.e !== 6 || n.b !== 1 || n.g !== 1) fail(`${b.id}: врагов ${JSON.stringify(n)} — нужно шесть рядовых, шесть элит, босс и рунный босс (§8.4)`);
  for (const u of b.unique) {
    if (!u.id.startsWith('Спуск.' + b.id)) fail(`${b.id}: id уникальной «${u.id}» — не «Спуск.${b.id}…»`);
    for (const k of Object.keys(u.data)) if (!UNIQUE_FIELDS.includes(k)) fail(`${u.id}: поле «${k}» ядру незнакомо`);
    if (u.data.cast && !b.unique.some(x => x.id === u.data.cast)) fail(`${u.id}: cast «${u.data.cast}» — не своя способность`);
    if (LIBNAME[u.n]) fail(`${u.id}: имя «${u.n}» занято библиотекой (${LIBNAME[u.n].join(', ')})`);
    uniques.push({ id: u.id, n: u.n, set: u.set, t: u.t, k: u.k, tier: u.tier, trig: null, d: u.d, ch: u.ch, data: u.data, owner: fullId(b, u.owner), why: u.why });
  }
  for (const [short, f] of Object.entries(b.foes)) {
    const id = fullId(b, short), rank = rankOf(short), kit = kitOf(b, short, f), s = statsOf(b, short, f);
    for (const x of kit.kit) if (x.as && !x.trait) {   // имя приёма у врага не должно совпасть с чужой записью библиотеки или с другим по действию приёмом под тем же именем
      if (LIBNAME[x.as] && !LIBNAME[x.as].includes(x.id)) fail(`${id}: имя «${x.as}» в библиотеке у другой способности (${LIBNAME[x.as].join(', ')})`);
      const L = LIB[x.id], sig = `${L.kind}.${L.tier}.${x.tgt || L.tgt}`;   // одно имя — одно действие; школа может быть разной
      const seen = names[x.as]; if (seen && seen.sig !== sig) fail(`${id}: «${x.as}» уже зовётся приём ${seen.lib} у ${seen.who} с другим действием`); else names[x.as] = { lib: x.id, sig, who: id };
    }
    foes[id] = Object.assign({ biome: b.id, rank, name: f.name, cls: f.cls, el: f.el, race: f.race, st: s.st, hpPct: s.hpPct },
      f.main ? { main: f.main } : {}, f.fx ? { fx: f.fx } : {}, { kit });
    const tale = f.tale || null;
    cards[id] = Object.assign({ biome: b.id, g: G_OF[rank], type: TYPE[rank], tag: f.tag, look: f.look, desc: tale ? tale[0] : f.look, tip: tale ? tale[1] : '', rare: !!f.rare, tpl: s.tpl }, f.pos ? { pos: f.pos } : {});   // pos — кадр портрета, как FPOS
  }
  const deck = F.map(ids => floorOf(b, ids));
  const el = deck.reduce((a, x) => a + x.m.filter(m => m.slice(2)[0] === 'e').length, 0);
  if (!b.guard.length || b.guard[0] !== 'g1' || b.guard.slice(1).some(x => x[0] !== 'e')) fail(`${b.id}: свита стража — рунный босс и элиты (ADR-0010)`);
  if (deck[deck.length - 1].g !== 'b' || deck.slice(0, -1).some(x => x.g === 'b')) fail(`${b.id}: босс — на последнем этаже и только там (§8.1)`);
  const D = RX.drops.enemies.find(e => e.biome === b.id);
  if (!D) fail(`${b.id}: нет в recipes.js drops.enemies`);
  else {
    if (D.name !== b.name) fail(`${b.id}: имя «${b.name}», в recipes.js — «${D.name}»`);
    if (D.floors !== deck.length || D.elites !== el) fail(`${b.id}: этажей ${deck.length} и элит ${el}, а черновик добычи считает ${D.floors} и ${D.elites} (recipes.js)`);
    if (D.ordinary.spirit !== EB0.RULES.drop.o.spirit * b.core.dropPct / 100 || D.cyc !== b.cycle) fail(`${b.id}: ставка духа × ${b.core.dropPct} % не совпала с recipes.js`);
  }
  const G = RX.drops.guardians.find(g => g.biome === b.id);
  if (!G || G.name !== b.foes.g1.name) fail(`${b.id}: рунный страж «${b.foes.g1.name}», в recipes.js — «${G && G.name}»`);
  const un = RX.items.find(i => i.tier === 'unique' && i.b === b.id);
  if (!un || !String(un.src || '').includes(b.foes.b1.name)) fail(`${b.id}: уникальный ресурс босса не называет «${b.foes.b1.name}» (recipes.js)`);
  /* полный вариант (ADR-0044): только у биома цикла I, с цикла II; колода — 35 этажей и 12 элит, как образец цикла II и черновик добычи после
     обучения (recipes.js, perRunAfterTutorial); босс — только на последнем этаже; на этаже до пяти врагов; страж — рунный босс и четыре элиты */
  let full = null;
  if (b.full) {
    const fd = FF.map(ids => floorOf(b, ids)), fel = fd.reduce((a, x) => a + x.m.filter(m => m.slice(2)[0] === 'e').length, 0);
    if (b.cycle !== 1 || !(b.full.from > b.cycle)) fail(`${b.id}: полный вариант — только у биома цикла I и с цикла выше его (ADR-0044)`);
    if (fd[fd.length - 1].g !== 'b' || fd.slice(0, -1).some(x => x.g === 'b')) fail(`${b.id}: в полном варианте босс — не на последнем этаже или не только там`);
    if (FF.some(ids => ids.length > 5)) fail(`${b.id}: в полном варианте на этаже больше пяти врагов`);
    if (!b.full.guard.length || b.full.guard[0] !== 'g1' || b.full.guard.length !== 5 || b.full.guard.slice(1).some(x => x[0] !== 'e')) fail(`${b.id}: страж полного варианта — рунный босс и четыре элиты (ADR-0010)`);
    if (D && D.perRunAfterTutorial && (D.perRunAfterTutorial.specKeys !== fel)) fail(`${b.id}: элит в полном варианте ${fel}, а черновик добычи после обучения считает ${D.perRunAfterTutorial.specKeys} (recipes.js)`);
    /* валюта полного варианта — общее правило ADR-0014: × цикл биома, у второго биома цикла ещё +0,5 (решение координатора, ADR-0044):
       исключение 80 % — только у короткого варианта обучения */
    const rateFull = b.cycle * 100 + (b.n % 2 === 0 ? 50 : 0);
    if ((b.full.core.dropPct || 100) !== rateFull) fail(`${b.id}: валюта полного варианта — × (цикл + 0,5) у второго биома цикла (ADR-0014, ADR-0044): ${b.full.core.dropPct} против ${rateFull}`);
    full = Object.assign({ from: b.full.from }, b.full.core, { floors: fd, guard: { g: 'r', m: b.full.guard.map(x => fullId(b, x)) } });
  }
  biomes[b.id] = {
    core: Object.assign({ n: b.n, cycle: b.cycle, name: b.name }, b.core, { floors: deck, guard: { g: 'r', m: b.guard.map(x => fullId(b, x)) } }, full ? { full } : {}),
    ui: Object.assign({ god: b.god, kind: b.kind, el: b.el, karst: b.karst, els: b.els, races: b.races, tone: b.tone, intro: b.intro, demoFloor: b.demoFloor }, b.ui),
  };
}

/* ================================ ЯДРО: КАРТОЧКИ БЕСТИАРИЯ ================================ */

/* §6: мощь считает ядро — EnBattle.bm(карта, C): слой 0 — характеристики, слой 1 — вклад способностей набора (ADR-0051).
   Своей формулы у сборщика нет */
/* здоровье и мощь карточки — ядро на этаже первой встречи врага: уровень этажа, здоровье биома, набор; для любого биома ядра */
function cardNums(ctx, biome, ids) {
  const EB = ctx.EnBattle, B = EB.BIOMES[biome], L = B.foeLvl || EB.RULES.foeLvl, lvlAt = f => L.base + Math.floor(f * L.perFloor / (L.div || 1)), first = {}, out = {};
  B.floors.forEach((F, i) => F.m.forEach((id, k) => { if (!first[id]) first[id] = { floor: i + 1, boss: F.g === 'b' && k === 0 }; }));
  B.guard.m.forEach((id, k) => { if (!first[id]) first[id] = { floor: B.floors.length + 1, guard: k === 0 }; });
  const lastE = B.floors.reduce((a, F, i) => F.g === 'e' ? i + 1 : a, 1);   // кого нет в колоде (элиты вне обучающей колоды Мастерской) — как элиты её последнего элитного этажа
  for (const id of ids) {
    const f = EB.FOES[id], kit = f.kit || ctx.EN_KITS.foes[id], at = first[id] || (biome === 'b1' ? { floor: lastE } : null);
    if (!at) { fail(`${id}: не встречается в биоме ${biome}`); continue; }
    const lvl = lvlAt(at.floor), hpPct = at.boss ? B.bossHpPct || f.hpPct : at.guard ? B.guardHpPct || f.hpPct : B.foeHpPct ? Math.floor(f.hpPct * B.foeHpPct / 100) : f.hpPct;
    const bt = EB.create({ mode: 'rounds', seed: 1, heroes: [], foes: [{ key: id, id, name: f.name, cls: f.cls, el: f.el, lvl, st: f.st, hpPct, main: f.main, rank: f.rank, kit }] });
    const u = bt.u[1][0], table = EB.kitTable(u);
    if (table.length !== kit.kit.filter(x => x.slot === 'act' || x.slot === 'ult').length) fail(`${id}: ядро собрало таблицу шансов не из всех способностей`);
    for (const x of kit.kit.filter(y => y.trait)) if (!u.lpas.some(p => p.id === x.id)) fail(`${id}: черта «${x.id}» не встала в пассивки карты ядра`);
    for (const x of kit.kit) if (!EB.lib()[x.id]) fail(`${id}: ядро не знает «${x.id}»`);
    out[id] = { lvl, floor: at.floor, hp: u.maxHp, bm: EB.bm(u, BM_C_X100) };
  }
  return out;
}
let workshop = {};
function core(ctx) {
  for (const b of DATA) Object.entries(cardNums(ctx, b.id, Object.keys(foes).filter(x => foes[x].biome === b.id))).forEach(([id, n]) => Object.assign(cards[id], n));
  /* Мастерская — те же числа ядра, чтобы бестиарий был один на все биомы: у её карточек в index.html прежние фикстуры */
  workshop = cardNums(ctx, 'b1', Object.keys(ctx.EN_KITS.foes));
}

/* ================================ АРТ ================================ */

/* выгруженный арт биомов: пути от design/ui/assets/art/ — прототип показывает их вместо заглушки. Готов тот арт, что стоит
   в таблице выгрузки tools/art-gen/ui-art.json и уже выгружен (export_ui.py): отметить — строка в таблице и выгрузка,
   затем пересобрать. Чего нет — прототип рисует заглушку в свете карста биома */
const ART_TABLE = path.join(ROOT, 'tools', 'art-gen', 'ui-art.json');
function artReady() {
  const table = fs.existsSync(ART_TABLE) ? JSON.parse(read(ART_TABLE)).items || {} : {}, out = [];
  const ok = p => p in table && fs.existsSync(path.join(FILES.art, p));
  for (const b of DATA) {
    const a = `arena-${b.id}.jpg`; if (ok(a)) out.push(a);
    for (const id of Object.keys(foes).filter(x => foes[x].biome === b.id)) { const p = `foes/${id}.jpg`; if (ok(p)) out.push(p); }
  }
  return out;
}

/* ================================ ВЫВОД ================================ */

const FORMAT = `/* Собрано tools/content-gen/biomes/build.js из tools/content-gen/biomes/data/*.js — враги, колоды и стражи биомов 2–4.
   Руками не править. Источник — docs/content/враги-биомов.md. ADR-0010, ADR-0011, ADR-0014, ADR-0016, ADR-0018, ADR-0020.
   Черновик · все числа — демонстрация, только целые.

   window.EN_BIOME_FOES = {
     rules: { sig, ranks, template, archer, bmC },   // подпись данных боя (pace.json), состав врага по рангу (ADR-0016), образцы, C мощи (§6)
     art: [путь от assets/art/],                // выгруженный арт биомов; чего нет — прототип рисует заглушку
     abilities: [запись как в abilities.js],    // уникальные способности — EnBattle.addLib; why — зачем уникальная, для команды
     foes: { b2o1: { biome, rank, name, cls, el, race, st, hpPct, main?, fx?, kit: { rank, ultPct, actPct, kit: [{ v, slot, id, as?, tgt?, trait?, chR? }] } } },
         // trait — черта именного врага из набора «Черты врагов» (ADR-0051): сверх числа способностей по рангу; chR — шанс её реакции
         // карта ядра — EnBattle.addFoes: те же поля, что у FOES Мастерской, набор — как EN_KITS.foes
     cards: { b2o1: { biome, g, type, tag, look, desc, tip, rare, tpl, pos?, lvl, floor, hp, bm } },
         // бестиарий: запись сказителя — desc и tip; у кого записи нет — облик и без совета; hp и bm — ядро на этаже первой встречи
     workshop: { o1: { lvl, floor, hp, bm } },   // Мастерская форм — те же числа ядра для её карточек бестиария (index.html держит фикстуры)
     biomes: { b2: { core: { n, cycle, name, siege, foeLvl, foeHpPct?, bossHpPct?, guardHpPct, dropPct, floors, guard,   // EnBattle.addBiome
                             full? },   // полный вариант биома цикла I с цикла full.from (ADR-0044): те же поля, вариант ставит EnBattle.atCycle
                     ui: { god, kind, el, karst, els, races, tone, intro, demoFloor, eyebrow, quote, shelf, boss, guardWin, guardLose, word?, next } } },
     pace: прогон темпа pace.py или null,
     farm: калькулятор фарма farm.py — { sig, pick, minMs, verdict, est } или null (ADR-0044: ритуал этажа, ключи, уникальный в старом биоме),
   };
   В конце файл регистрирует всё в ядре — грузить после battle.js и abilities.js. */`;

function js(pace, farm) {
  const X = {
    rules: { sig: sigOf(), ranks: Object.fromEntries(Object.entries(RANK_KEY).map(([r, k]) => [r, Object.assign({ n: k }, RANKS[k])])), template: TEMPLATE, archer: ARCHER_ST, bmC: BM_C_X100 },
    art: artReady(), abilities: uniques, foes, cards, workshop, biomes, pace, farm: farm || null,
  };
  return `${FORMAT}\nwindow.EN_BIOME_FOES = ${JSON.stringify(X)};\n` +
    `/* регистрация в ядре: уникальные способности, карты врагов, биомы */\n` +
    `(function (EB, X) {\n  if (!EB || !X || !EB.addBiome) return;\n  EB.addLib(X.abilities); EB.addFoes(X.foes);\n  for (const id in X.biomes) EB.addBiome(id, X.biomes[id].core);\n})(window.EnBattle, window.EN_BIOME_FOES);\n`;
}
/* подпись данных боя — чтобы прогон темпа pace.json не приняли за свежий после правки */
const sigOf = () => crypto.createHash('sha1').update(JSON.stringify({ abilities: uniques, foes, core: Object.fromEntries(Object.entries(biomes).map(([k, v]) => [k, v.core])) })).digest('hex').slice(0, 12);

/* ---------------- черновик для автора ---------------- */
const KIND = { dmg: 'урон', heal: 'лечение', shield: 'щит', dot: 'урон по времени', hot: 'лечение по времени', ctrl: 'контроль', debuff: 'дебафф', buff: 'бафф', passive: 'пассивка' };
const TIER = { all: 'на всех', grp: 'на 2–3', one: 'на одного' };
const TGT_RU = { threat: 'по угрозе', danger: 'самый готовый', lowest: 'самый раненый', healer: 'лекарь', ally_lowest: 'свой раненый', self: 'на себя', all: 'все', allies: 'все свои' };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function abRow(id, x) {
  const u = uniques.find(y => y.id === x.id), L = LIB[x.id];
  const nm = u ? u.n : x.as || L.n, what = u ? `уникальная: ${KIND[u.k] || u.k}${u.tier ? ' ' + (TIER[u.tier] || '') : ''}` : `${L.id}${x.as ? ` «${L.n}»` : ''}`;
  if (x.trait) return `«${L.n}» — черта${x.chR ? `, шанс ${(x.chR / 100).toFixed(1).replace('.', ',').replace(',0', '')} %` : ''}: ${L.d}`;
  return `«${nm}»${x.slot === 'ult' ? ' — ульта' : x.slot === 'pas' ? ' — пассивка' : ''} · ${what}${x.tgt ? ' · цель: ' + TGT_RU[x.tgt] : ''}`;
}
function doc(pace, stale) {
  const T = (head, rows) => ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|', ...rows.map(r => '| ' + r.join(' | ') + ' |')].join('\n');
  const parts = {};
  parts.summary = T(['№', 'Биом', 'Цикл', 'Этажей', 'Элит', 'Уровень врагов', 'Здоровье', 'Осада', 'Босс', 'Рунный страж', 'Свита'], DATA.map(b => {
    const B = biomes[b.id].core, lv = f => B.foeLvl.base + Math.floor(f * B.foeLvl.perFloor / (B.foeLvl.div || 1));
    const el = B.floors.reduce((a, x) => a + x.m.filter(m => foes[m].rank === 'e').length, 0);
    return [b.n, b.name, ['I', 'II'][b.cycle - 1], B.floors.length, el, `${lv(1)}–${lv(B.floors.length)}, страж ${lv(B.floors.length + 1)}`,
      `${B.foeHpPct ? 'врагов ' + B.foeHpPct + ' %, ' : ''}${B.bossHpPct ? 'босса ' + B.bossHpPct + ' %, ' : ''}стража ${B.guardHpPct} %`, B.siege ? 'да' : 'нет',
      b.foes.b1.name, b.foes.g1.name, b.guard.slice(1).map(x => b.foes[x].name).join(', ')];
  }));
  parts.foes = DATA.map(b => `### ${b.n}. ${b.name}\n\n` + T(['id', 'Враг', 'Ранг · класс', 'Раса · стихия', 'Способности', 'Первая встреча', 'Здоровье · БМ'],
    Object.keys(foes).filter(id => foes[id].biome === b.id).map(id => {
      const f = foes[id], c = cards[id];
      return [id, f.name + (c.rare ? ' · редкий' : ''), `${TYPE[f.rank]} · ${f.cls}`, `${f.race} · ${f.el}`, f.kit.kit.map(x => abRow(id, x)).join('<br>'),
        c.floor > B_(b).floors.length ? 'рунный бой' : `этаж ${c.floor}, ур. ${c.lvl}`, `${fmt(c.hp)} · ${fmt(c.bm)}`];
    }))).join('\n\n');
  parts.unique = T(['Способность', 'Чья', 'Что делает', 'Почему уникальная'], uniques.map(u => [u.n, foes[u.owner].name, u.d, u.why]));
  /* полные биомы 1–2 с цикла II (ADR-0044): Мастерская — в ядре (battle.js, BIOMES.b1.full), Подземный лес — здесь (data/b2.js, full) */
  {
    const W = EB0.BIOMES.b1, rows = [], name = id => (foes[id] || EB0.FOES[id] || {}).name || id;
    const lvOf = (L, f) => L.base + Math.floor(f * L.perFloor / (L.div || 1));
    const row = (nm, v, R) => {
      const L = R.foeLvl || EB0.RULES.foeLvl, n = R.floors.length, el = R.floors.reduce((a, x) => a + x.m.filter(m => (foes[m] || EB0.FOES[m]).rank === 'e').length, 0);
      return [nm, v, R.full ? 'I, обучение' : `с ${['I', 'II', 'III'][(R.from || 2) - 1]}`, n, el, `${lvOf(L, 1)}–${lvOf(L, n)}, страж ${lvOf(L, n + 1)}`,
        `${R.foeHpPct ? 'врагов ' + R.foeHpPct + ' %, ' : ''}${R.bossHpPct ? 'босса ' + R.bossHpPct + ' %, ' : ''}стража ${R.guardHpPct || '—'} %`, R.siege === false ? 'нет' : 'да',
        `${R.guard.m.length}: ${R.guard.m.map(name).join(', ')}`, `${R.dropPct || 100} %`];
    };
    rows.push(row('1. Мастерская форм', 'короткий', W.tut ? Object.assign({ full: true }, W, W.tut) : W));
    if (W.full) rows.push(row('1. Мастерская форм', 'полный', W.full));
    const B2 = biomes.b2 && biomes.b2.core;
    if (B2) { rows.push(row('2. Подземный лес', 'короткий', Object.assign({}, B2, { full: true }))); if (B2.full) rows.push(row('2. Подземный лес', 'полный', B2.full)); }
    parts.full = T(['Биом', 'Вариант', 'Цикл игрока', 'Этажей', 'Элит', 'Уровень врагов', 'Здоровье', 'Осада', 'Рунный страж', 'Золото и дух'], rows)
      + (B2 && B2.full ? `\n\n**Подземный лес, полный** — ${B2.full.floors.length} этажей:\n\n` + T(['Этаж', 'Колода'], B2.full.floors.map((F, i) => [i + 1, F.m.map(id => foes[id].name).join(', ') + (F.g === 'e' ? ' · элита' : F.g === 'b' ? ' · босс' : '')])) : '');
  }
  parts.decks = DATA.map(b => `**${b.name}** — ${B_(b).floors.length} этажей:\n\n` + T(['Этаж', 'Колода'], B_(b).floors.map((F, i) => [i + 1, F.m.map(id => foes[id].name).join(', ') + (F.g === 'e' ? ' · элита' : F.g === 'b' ? ' · босс' : '')]))
    + `\n\nРунный страж: ${B_(b).guard.m.map(id => foes[id].name).join(', ')}.`).join('\n\n');
  parts.art = `Выгружено: ${artReady().length} из ${DATA.length * 15} — арены arena-b2…b4.jpg и портреты foes/<id>.jpg (1688×716 и 464×576).`;
  parts.pace = pace ? pace.md + (stale ? '\n\n**Прогон сделан на прежних данных — перезапустите pace.py.**' : '') : 'Прогона ещё нет: `python tools/content-gen/biomes/pace.py`.';
  return read(FILES.doc).replace(/@@(\w+)@@/g, (m, k) => { if (!(k in parts)) { fail(`doc.md: нет раздела @@${k}@@`); return m; } return parts[k]; });
}
const B_ = b => biomes[b.id].core;

/* ================================ ЗАПУСК ================================ */

if (!err.length) {
  const sig = sigOf();
  let pace = null, stale = false;
  if (fs.existsSync(FILES.pace)) { const P = JSON.parse(read(FILES.pace)); stale = P.sig !== sig; pace = P; }
  const probe = js(null, null), ctx = sandbox(probe);   // ядро с этими данными: наборы, таблицы шансов, карточки
  if (!ctx.EnBattle.BIOMES.b2) fail('biome-foes.js не зарегистрировал биомы в ядре');
  else core(ctx);
  if (!err.length) {
    /* калькулятор фарма — если сделан на этих же данных (подпись); его вердикт и оценка циклов III–VI — в UI-кит */
    const F = fs.existsSync(FILES.farm) ? JSON.parse(read(FILES.farm)) : null, farm = F && F.sig === sig ? { sig: F.sig, pick: F.pick, minMs: F.minMs, verdict: F.verdict, est: F.est } : null;
    const out = js(pace && !stale ? { sig: pace.sig, rows: pace.rows, verdict: pace.verdict } : null, farm), md = doc(pace, stale);
    if (!err.length) {
      fs.writeFileSync(FILES.outUi, out);
      fs.writeFileSync(FILES.outMd, md);
      console.log(`biome-foes.js: врагов ${Object.keys(foes).length}, уникальных способностей ${uniques.length}, биомов ${DATA.length}, арта ${artReady().length}; подпись ${sig}${pace ? stale ? ', прогон темпа устарел' : ', прогон темпа свежий' : ', прогона темпа нет'}${farm ? ', фарм свежий' : ', фарма на этих данных нет — python tools/content-gen/biomes/farm.py'}`);
    }
  }
}
if (err.length) { console.error('Ошибки — файлы не записаны:\n' + err.map(e => '  ✗ ' + e).join('\n')); process.exitCode = 1; }
