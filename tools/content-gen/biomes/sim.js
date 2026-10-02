/* Прогон биомов 2–4 ядром боя — для темпа (pace.py) и проверки (check_biomes.js). Без браузера, только Node.
   Ядро и данные — как в прототипе: battle.js, abilities.js, kits.js, biome-foes.js. Отряд — фикстура S.heroes из index.html:
   характеристики, доблесть, черновик героя, от него набор (kits.js, ADR-0016). Фикстура одна: калькулятор экономики (economy.py, SIM_JS)
   и через него sets.py и echo.py берут SQUAD отсюда. Числа прогона — не баланс. Только целые числа.

   Модуль: require('./sim.js') → { EB, X, SQUAD, TRAIN_ID, run, campaign, guardWin, tutor, levelCost }.
   Командная строка: node sim.js '<json>' — печатает JSON:
   - { mode: 'levels', biome, levels: [L…], squad?: [id…], valor?: число } — по уровням: стена, забегов до падения босса осадой,
     время и добыча первого забега, победа над рунным стражем;
   - { mode: 'tutor', pace } — биом 2 с обучения: забег за забегом, герои приходят по ходу, дух — в уровни (pace — параметры, pace.py). */
'use strict';
const path = require('path');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
globalThis.window = globalThis;
for (const f of ['battle.js', 'abilities.js', 'kits.js', 'biome-foes.js']) require(path.join(UI, f));
const EB = globalThis.EnBattle, X = globalThis.EN_BIOME_FOES;

/* Отряд прогонов — одна фикстура на все калькуляторы (economy.py, sets.py, echo.py берут её отсюда через economy.SIM_JS):
   S.heroes из design/ui/index.html — характеристики, черновик героя (от него набор kits.js, ADR-0016), уровни прототипа; прогон
   уровни меняет. Реальный отряд (ADR-0031, п. 1): пятеро золотых героев цикла I, личный максимум доблести — 1 по составу
   (состав-героев.csv: c1-01…c1-05); доблесть 0, кроме бойца урона пары — у него доблесть 1 от руны обучения (8-й уровень аккаунта,
   §16, ADR-0018; ADR-0031, п. 2: её можно применить на любом пределе). Обычная доблесть — только на пятом пределе (§10.2).
   Доли хода — у набора в kits.js, по редкости героя в составе (assign.py, ADR-0030, п. 5а): обычная, обычная, редкая, редкая, редкая.
   Пятёрка обучения — квинтэссенция этеров (слово автора 02.10.2026, ADR-0050): дворф-танк, норд-воин без стихии (сила вместо ловкости),
   человек — маг огня Самир Недоучка (c1-11, на месте Лаэйры), эльфийка-лекарь, человек-контролёр. Образцы характеристик — по классу */
const A = a => a.map(n => ({ n })), P = a => a.map(n => ({ n, t: 'боевая' }));
const SQUAD = [
  { id: 'h1', name: 'Гарт Нишевой', cls: 'Танк', el: 'Земля', draft: 'h01_2', lvl: 42, valor: 0, maxV: 1, st: [128, 54, 72, 246, 62], ab: A(['Вызов', 'Удар щитом', 'Осыпание']), pas: P(['Несгибаемость']), ult: null },
  { id: 'h2', name: 'Хравн Сборщик', cls: 'Физ. ДД силы', fx: 'melee', el: 'без стихии', draft: 'h01_3', lvl: 50, valor: 1, maxV: 1, st: [245, 54, 128, 72, 62], ab: A(['Удар щитом', 'Быстрый выпад']), pas: P(['Точность']), ult: null },
  { id: 'h3', name: 'Самир Недоучка', cls: 'Маг. ДД', el: 'Огонь', draft: 'h04_2', lvl: 118, valor: 0, maxV: 1, st: [72, 246, 54, 62, 128], ab: A(['Разряд', 'Горение']), pas: P(['Средоточие']), ult: { n: 'Испепеление', at: 5 } },
  { id: 'h4', name: 'Ильмерра', cls: 'Хилер', el: 'Воздух', draft: 'h01_1', lvl: 46, valor: 0, maxV: 1, st: [62, 246, 54, 128, 72], ab: A(['Живая вода', 'Лёгкая поступь', 'Оберег']), pas: P(['Отклик']), ult: null },
  { id: 'h5', name: 'Мирт Переписчик', cls: 'Контроль', el: 'Вода', draft: 'h01_4', lvl: 35, valor: 0, maxV: 1, st: [62, 246, 54, 128, 72], ab: A(['Оковы', 'Стужа', 'Ослабление']), pas: P(['Тень']), ult: { n: 'Ледяные оковы', at: 2 } },
];
const TRAIN_ID = SQUAD.find(h => h.valor > 0).id;   // кому руна обучения: боец урона пары первого биома
const hero = (id, lvl, valor) => EB.heroSrcValor(Object.assign({}, SQUAD.find(h => h.id === id), { lvl, valor }));   // доблесть — +30 % за ступень, правило ядра
const RANK_OF = u => u.rank === 'e' ? 'e' : u.rank === 'b' ? 'b' : u.rank === 'rune' ? 'rune' : 'o';

/* Один забег: этажи подряд, здоровье и павшие переходят дальше (ADR-0007), осада — hp босса на входе.
   Возвращает стену, время, убитых по рангу, дух и золото ядра (floorLoot), здоровье босса после боя */
function run(heroes, biome, siegeHp, from) {
  const B = EB.BIOMES[biome], k = { o: 0, e: 0, b: 0 }; let cur = heroes.map(h => Object.assign({}, h)), ms = 0, wall = 0, bossHp = siegeHp, spirit = 0, gold = 0, win = false, entry = null;
  for (let f = from || 1; f <= B.floors.length; f++) {
    if (B.floors[f - 1].g === 'b') entry = cur;   // отряд у босса — для осады: этажи до него в каждом забеге те же
    const b = EB.run(EB.floorBattle(cur, biome, f, bossHp, 'rounds'));
    ms += b.t + (f < B.floors.length ? EB.RULES.floor.gapMs : 0);
    for (const u of b.u[1]) if (!u.alive) k[RANK_OF(u)]++;
    const L = EB.floorLoot(biome, f, b, 0); spirit += L.spirit; gold += L.gold;
    if (B.floors[f - 1].g === 'b') bossHp = b.u[1][0].alive ? b.u[1][0].hp : 0;
    cur = EB.carry(cur, b); wall = f;
    if (!b.win) break;
    if (f === B.floors.length) win = true;
  }
  return { wall, ms, k, spirit, gold, win, bossHp, heroes: cur, entry };
}
/* Осада: забеги подряд тем же отрядом, пока босс не пал. Сценарий детерминирован: этажи до босса в каждом забеге те же,
   поэтому они считаются один раз, а бой с боссом повторяется с остатком его здоровья. max — сколько забегов пробовать.
   Итог: стена, забегов до падения босса (null — осада не движется или не хватило max), время, дух и золото первого забега */
function campaign(heroes, biome, max) {
  const B = EB.BIOMES[biome], last = B.floors.length, pre = run(heroes, biome, null);
  const base = { wall: pre.wall, ms: pre.ms, spirit: pre.spirit, gold: pre.gold, k: pre.k };
  if (pre.wall < last) return Object.assign(base, { runs: 0, reach: false });
  let hp = null, runs = 0, max0 = null, dmgFirst = 0;
  while (runs < (max || 60)) {
    runs++;
    const b = EB.run(EB.floorBattle(pre.entry, biome, last, hp, 'rounds')), boss = b.u[1][0];
    if (max0 == null) { max0 = boss.maxHp; dmgFirst = boss.maxHp - boss.hp; }
    if (!boss.alive) return Object.assign(base, { runs, reach: true, dmg: dmgFirst, bossMax: max0 });
    if (boss.hp === hp || B.siege === false) break;   // осада не движется или её нет — босс со свежим здоровьем
    hp = boss.hp;
  }
  return Object.assign(base, { runs: null, reach: true, dmg: dmgFirst, bossMax: max0 });
}
/* Рунный страж: бой 25 раундов, обычная атака рунного босса отнимает раунд (ADR-0020) */
function guardWin(heroes, biome) { const b = EB.run(EB.guardBattle(heroes, biome, 'rounds')); return { win: b.win, why: b.why, rounds: b.round, ms: b.t }; }

/* Цена уровня героя — ceil(n ^ p / q) духа за уровень n (economy.py, LEVEL_EXP), × цикл героя; только целые */
function levelCost(n, exp, cyc) {
  const [p, q] = exp, x = BigInt(n) ** BigInt(p);
  let lo = 0n, hi = 1n; while (hi ** BigInt(q) < x) hi *= 2n;
  while (lo < hi) { const mid = (lo + hi) / 2n; if (mid ** BigInt(q) >= x) hi = mid; else lo = mid + 1n; }
  return Number(lo) * (cyc || 1);
}

/* Биом 2 с обучения (ADR-0018): пара первого биома входит на своём уровне, ещё трое героев приходят по ходу биома — по этажу,
   до которого дошёл отряд. Забег за забегом: дух убитых — в уровни, первым качается самый низкий, не выше первого предела.
   Босс — за один забег, без осады. После босса после каждого забега — попытка у рунного стража. */
function tutor(P) {
  const lv = {}, val = {}; let bank = P.startSpirit || 0, ms = 0, runs = 0, best = 0, boss = null, guard = null, tries = 0;
  const log = [], tot = { floors: 0, o: 0, e: 0, b: 0, spirit: 0, gold: 0, guardWins: 0 };   // итог биома до победы над стражем — счётчики обучения (sets.py)
  for (const a of P.arrive) if (a.floor === 0) { lv[a.id] = a.lvl || 0; val[a.id] = a.valor || 0; }
  const levelUp = () => {
    for (;;) {
      const ids = Object.keys(lv).filter(id => lv[id] < P.cap).sort((a, b) => lv[a] - lv[b] || (a < b ? -1 : 1));
      if (!ids.length) return;
      const id = ids[0], c = levelCost(lv[id] + 1, P.levelExp, 1);
      if (bank < c) return;
      bank -= c; lv[id]++;
    }
  };
  levelUp();
  while (runs < P.maxRuns && !guard) {
    for (const a of P.arrive) if (!(a.id in lv) && best >= a.floor) { lv[a.id] = 0; val[a.id] = a.valor || 0; levelUp(); }
    const heroes = Object.keys(lv).sort().map(id => hero(id, lv[id], val[id]));
    const r = run(heroes, P.biome, null);
    runs++; ms += r.ms + P.gapMs; bank += r.spirit; best = Math.max(best, r.wall);
    tot.floors += r.win ? r.wall : r.wall - 1; tot.o += r.k.o; tot.e += r.k.e; tot.b += r.k.b; tot.spirit += r.spirit; tot.gold += r.gold;
    const row = { run: runs, ms, heroes: Object.keys(lv).length, lvl: Object.keys(lv).sort().map(id => lv[id]), wall: r.wall, win: r.win, spirit: r.spirit };
    if (r.win && !boss) boss = { runs, ms, lvl: row.lvl.slice(), heroes: row.heroes };
    if (boss) {
      tries++; const g = guardWin(heroes, P.biome); ms += g.ms; row.guard = g.win;
      if (g.win) { guard = { runs, ms, tries, lvl: row.lvl.slice(), heroes: row.heroes }; tot.guardWins++; }
    }
    log.push(row);
    levelUp();
  }
  return { boss, guard, runs, ms, log, tot };
}

/* Цикл II по дням: уровень главного отряда на каждый день — из калькулятора экономики (economy.py, timeline: пределы, руны, дух
   всех слотов), здесь — только бой. Главный отряд идёт по биомам по очереди: забеги подряд hours часов в день, осада босса
   копится между забегами и днями; когда босс пал — бой с рунным стражем, раз в день на уровне этого дня (исход при том же
   уровне тот же). Страж пал — следующий биом, в тот же день. P: { biomes, levels: [уровень на день 0, 1, …], hours, squad? } */
function days(P) {
  const ids = P.squad || SQUAD.map(h => h.id), out = {}, cache = {};
  let bi = 0, siege = null, bossDead = false;
  const at = (biome, L) => {   // этажи до босса на уровне L — одни и те же в каждом забеге
    const k = biome + '|' + L; if (cache[k]) return cache[k];
    const heroes = ids.map(id => hero(id, L, SQUAD.find(h => h.id === id).valor)), r = run(heroes, biome, null);
    return (cache[k] = { heroes, r });
  };
  for (let d = 1; d < P.levels.length && bi < P.biomes.length; d++) {
    const L = P.levels[d]; let budget = P.hours * 3600000, guardTried = false;
    while (budget > 0 && bi < P.biomes.length) {
      const biome = P.biomes[bi], B = EB.BIOMES[biome], last = B.floors.length, o = out[biome] || (out[biome] = { runs: 0, from: d, walls: [] });
      if (!bossDead) {
        const c = at(biome, L);
        if (c.r.wall < last) { o.runs++; o.wall = c.r.wall; if (!o.walls.length || o.walls[o.walls.length - 1][1] !== c.r.wall) o.walls.push([d, c.r.wall]); budget -= c.r.ms; continue; }
        const b = EB.run(EB.floorBattle(c.r.entry, biome, last, siege, 'rounds')), boss = b.u[1][0];
        o.runs++; budget -= c.r.ms;
        if (!boss.alive) { bossDead = true; siege = null; o.boss = { day: d, lvl: L, runs: o.runs }; }
        else { siege = boss.hp; o.siege = Math.round(100 - boss.hp * 100 / boss.maxHp); }
        continue;
      }
      if (guardTried) break;   // страж на этом уровне уже не пустил — завтра, на новом уровне
      guardTried = true;
      const g = guardWin(ids.map(id => hero(id, L, SQUAD.find(h => h.id === id).valor)), biome);
      if (!g.win) { o.guardLost = L; continue; }
      o.guard = { day: d, lvl: L }; bi++; bossDead = false; siege = null; guardTried = false;
    }
  }
  return out;
}

module.exports = { EB, X, SQUAD, TRAIN_ID, hero, run, campaign, guardWin, tutor, days, levelCost };

if (require.main === module) {
  const spec = JSON.parse(process.argv[2] || '{}'), out = {};
  if (spec.mode === 'levels') {
    out.rows = [];
    const ids = spec.squad || SQUAD.map(h => h.id);
    for (const L of spec.levels) {
      const heroes = ids.map(id => { const h = SQUAD.find(x => x.id === id); return hero(id, L, spec.valor != null ? spec.valor : h.valor); });
      const c = campaign(heroes, spec.biome, spec.max || 60), g = guardWin(heroes, spec.biome);
      out.rows.push({ lvl: L, siege: EB.BIOMES[spec.biome].siege !== false, wall: c.wall, reach: c.reach, runs: c.runs, ms: c.ms, spirit: c.spirit, gold: c.gold, k: c.k, dmg: c.dmg || 0, bossMax: c.bossMax || 0, guard: g.win, guardRounds: g.rounds });
    }
  } else if (spec.mode === 'tutor') Object.assign(out, tutor(spec.pace));
  else if (spec.mode === 'days') out.biomes = days(spec);
  process.stdout.write(JSON.stringify(out));
}
