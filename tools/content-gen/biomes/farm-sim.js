/* Фарм старых биомов — бои ядром для калькулятора tools/content-gen/biomes/farm.py (ADR-0044). Без браузера, только Node.
   Ядро, данные и отряд прогонов — как у темпа (sim.js: battle.js, abilities.js, kits.js, biome-foes.js; SQUAD — пятеро золотых героев).
   Биомы 1–2 — полные варианты: «сервер» выбирает их по циклу игрока, здесь — EB.atCycle(cyc) из спецификации (цикл II и выше).
   Биомы циклов III–VI в ядре ещё не собраны — образцы подъёма (cycle/climb-sim.js, setup): колоды биомов 3–4, сила по кривой §3.3 × kX;
   золото и дух образца — ставка своего номера биома из черновика добычи (recipes.js, drops.enemies), души — номер биома.

   Бой не зависит от ритуала этажа: исход, добыча и сам бой (fightMs) те же при любом RULES.floor.minMs. Поэтому прогон отдаёт этажи как
   [вид, бой мс, взят] — время забега при любом минимуме калькулятор считает сам (farm.py, run_ms), без новых боёв.

   Командная строка: node farm-sim.js '<json>' — печатает JSON:
   - { mode: 'deck', biomes: [id…], cyc, kX, hpX, pNext } — колоды и ожидаемая добыча забега, где пали все: этажи по виду, враги по рангу,
     золото, дух, души, ключи ремёсел, базовые × 100, шанс уникального и рунного ключа с босса, б. п., ключей за срабатывание;
   - { mode: 'runs', list: [{ biome, k, L, v?, j? }], cyc, … } — честный забег отряда героев цикла k на уровне L с доблестью v (j героев — на v + 1): этажи, добыча ядра (floorLoot
     с циклом игрока cyc), павшие по рангу (kills), стена, пал ли босс;
   - { mode: 'ritual', biomes: [id…], k, L, cyc, … } — забег сверхсильного отряда: по каждому этажу вид, бой, время этажа ядра и минимум —
     ритуал этажа (закон: время взятого этажа = max(бой, минимум), проигранного — бой).
   Только целые числа. */
'use strict';
const path = require('path');
const SIM = require('./sim.js');
const CL = require(path.join(__dirname, '..', 'cycle', 'climb-sim.js'));
const { EB } = SIM;
const RX = (() => { globalThis.window = globalThis; require(path.join(__dirname, '..', '..', '..', 'design', 'ui', 'recipes.js')); return globalThis.EN_RECIPES; })();

/* образцы циклов III–VI и ставка золота и духа по номеру биома (recipes.js — те же ставки, что у калькуляторов) */
function setup(o) {
  CL.setup({ kX: o.kX || {}, hpX: o.hpX || {}, pNext: o.pNext });
  const D = RX.drops.enemies, base = EB.RULES.drop.o.spirit;
  for (let c = 2; c <= 6; c++) for (const ab of ['A', 'B']) {
    const B = EB.BIOMES[`v${c}${ab}`], e = D.find(x => x.biome === 'b' + B.n);
    if (e) B.dropPct = e.ordinary.spirit * 100 / base;
  }
  EB.atCycle(o.cyc || 2);
}
const fl = (a, b) => Math.floor(a / b);
const rankOf = id => EB.FOES[id].rank;

/* ожидаемая добыча забега, где пали все: по рангам врагов колоды, как floorLoot ядра без фарма и артефактов */
function deck(id, cyc) {
  const B = EB.BIOMES[id], D = EB.RULES.drop, M = B.dropPct || 100, out = { id, n: B.n, cycle: B.cycle, dropPct: M, floors: B.floors.map(F => F.g),
    ranks: { o: 0, e: 0, b: 0 }, gold: 0, spirit: 0, souls: 0, keys: 0, boss: { gold: 0, spirit: 0, souls: 0 } };
  for (const F of B.floors) for (const m of F.m) {
    const r = rankOf(m), d = D[r] || {};
    out.ranks[r] = (out.ranks[r] || 0) + 1;
    const g = fl((d.gold || 0) * M, 100), sp = fl((d.spirit || 0) * M, 100), so = (d.soulsPerBiome || 0) * B.n;
    out.gold += g; out.spirit += sp; out.souls += so; out.keys += d.keys || 0;
    if (r === 'b') { out.boss.gold += g; out.boss.spirit += sp; out.boss.souls += so; }   // добыча босса — для осады: она приходит раз в N забегов
  }
  out.baseX100 = fl(B.floors.length * D.basePerFloorBp * (1 + B.n), 200);          // базовых за забег × 100: шанс за этаж × среднее 1…номер биома
  const old = cyc > B.cycle;
  out.uniqueBp = old ? fl(D.b.uniqueBp * D.b.uniqueOldPct, 100) : D.b.uniqueBp;      // уникальный с босса: в старом биоме — доля обычного
  out.uniqueBpNormal = D.b.uniqueBp;
  out.runeKeyBp = cyc >= D.b.runeKeyFrom ? D.b.runeKeyBp : 0;                        // рунный ключ с босса: с цикла II
  out.runeKeyMaxBp = D.b.runeKeyMaxBp;
  out.runeKeys = B.cycle;                                                            // ключей за срабатывание — цикл биома (§11)
  out.old = old;
  return out;
}

/* забег: этажи подряд, здоровье и павшие переходят дальше; добыча — ядро с циклом игрока; этаж — [вид, бой, взят] */
function runOf(heroes, id, cyc) {
  const B = EB.BIOMES[id], floors = [], kills = { o: 0, e: 0, b: 0 }; let cur = heroes.map(h => Object.assign({}, h)), gold = 0, spirit = 0, souls = 0, keys = 0, wall = 0, win = false, bossDead = false, entry = null;
  for (let f = 1; f <= B.floors.length; f++) {
    if (B.floors[f - 1].g === 'b') entry = cur;   // отряд у босса: осада бьёт босса им же
    const b = EB.run(EB.floorBattle(cur, id, f, null, 'rounds'));
    floors.push([B.floors[f - 1].g, b.fightMs, b.win ? 1 : 0]);
    for (const u of b.u[1]) if (!u.alive && kills[u.rank] != null) kills[u.rank]++;
    const L = EB.floorLoot(id, f, b, { cyc });
    gold += L.gold; spirit += L.spirit; souls += L.souls; keys += L.keys;
    if (B.floors[f - 1].g === 'b' && !b.u[1][0].alive) bossDead = true;
    cur = EB.carry(cur, b); wall = f;
    if (!b.win) break;
    if (f === B.floors.length) win = true;
  }
  /* осада (§8, RULES.siege): дошёл до босса и не взял — забег за забегом тем же отрядом, остаток здоровья босса копится; siegeRuns — забегов
     до его падения (null — осада не движется или её нет): в честном фарме своего биома добыча босса приходит раз в siegeRuns забегов */
  let siegeRuns = bossDead ? 1 : null;
  if (!bossDead && entry && wall === B.floors.length && B.siege !== false) {
    let hp = null;
    for (let n = 1; n <= 60; n++) {
      const bb = EB.run(EB.floorBattle(entry, id, B.floors.length, hp, 'rounds')), boss = bb.u[1][0];
      if (!boss.alive) { siegeRuns = n; break; }
      if (boss.hp === hp) break;
      hp = boss.hp;
    }
  }
  return { floors, kills, gold, spirit, souls, keys, wall, win, bossDead, siegeRuns };
}

/* ритуал этажа: время этажа ядра против минимума своего вида */
function ritual(heroes, id) {
  const B = EB.BIOMES[id], out = []; let cur = heroes.map(h => Object.assign({}, h));
  for (let f = 1; f <= B.floors.length; f++) {
    const g = B.floors[f - 1].g, b = EB.run(EB.floorBattle(cur, id, f, null, 'rounds'));
    out.push({ f, g, fight: b.fightMs, t: b.t, ritual: b.ritualMs, min: EB.ritualOf(B)[g], win: b.win });
    cur = EB.carry(cur, b);
    if (!b.win) break;
  }
  const gb = EB.run(EB.guardBattle(heroes, id, 'rounds'));   // страж — отдельный бой, отряд приходит свежим
  out.push({ f: B.floors.length + 1, g: 'guard', fight: gb.fightMs, t: gb.t, ritual: gb.ritualMs, min: EB.ritualOf(B).guard, win: gb.win });
  return out;
}

module.exports = { setup, deck, runOf, ritual };

if (require.main === module) {
  const o = JSON.parse(process.argv[2] || '{}'), out = {};
  setup(o);
  if (o.mode === 'deck') out.biomes = o.biomes.map(id => deck(id, o.cyc || 2));
  else if (o.mode === 'runs') out.runs = o.list.map(x => Object.assign({ biome: x.biome, k: x.k, L: x.L, v: x.v || 0, j: x.j || 0 }, runOf(CL.squad(x.k, x.L, x.v || 0, null, x.j || 0), x.biome, o.cyc || 2)));
  else if (o.mode === 'ritual') out.biomes = o.biomes.map(id => ({ id, floors: ritual(CL.squad(o.k, o.L), id) }));
  out.minMs = EB.RULES.floor.minMs; out.gapMs = EB.RULES.floor.gapMs;
  /* зрелище ритуала (RULES.floor.ritual — фазы показа «Боя AAA») и ход раунда: из них калькулятор берёт нижнюю границу ритуала рядовых */
  out.show = { ritual: EB.RULES.floor.ritual || null, roundGapMs: EB.RULES.rounds.gapMs, attackMs: EB.RULES.rounds.act.attack };
  out.drop = { uniqueOldPct: EB.RULES.drop.b.uniqueOldPct, runeKeyBp: EB.RULES.drop.b.runeKeyBp, runeKeyMaxBp: EB.RULES.drop.b.runeKeyMaxBp, runeKeyFrom: EB.RULES.drop.b.runeKeyFrom, uniqueBp: EB.RULES.drop.b.uniqueBp };
  out.sig = (globalThis.EN_BIOME_FOES && globalThis.EN_BIOME_FOES.rules && globalThis.EN_BIOME_FOES.rules.sig) || '';
  process.stdout.write(JSON.stringify(out));
}
