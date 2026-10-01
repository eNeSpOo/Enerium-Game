/* Подъём по циклам — бои ядром для калькулятора tools/content-gen/cycle/climb.py (ADR-0041: «новый цикл — новая ступень аккаунта»).
   Без браузера, только Node. Ядро, данные и отряд прогонов — как у темпа: tools/content-gen/biomes/sim.js (battle.js, abilities.js,
   kits.js, biome-foes.js; отряд SQUAD — пятеро золотых героев, характеристики и наборы прототипа).

   Биомы циклов III–VI в ядре ещё не собраны (враги биомов 5–12 — черновик docs/content/враги-биомов.md). Калькулятор меряет их по образцу
   цикла II, как калькуляторы экономики и сетов («биом цикла — образец цикла II, враги — по кривой §3.3»): первый биом цикла c — колода,
   карты и стражи Библиотеки Улариона (b3), второй — Искусственного Стоун-Хейма (b4), а уровень врагов на этаже — по той же формуле, что у
   b3 и b4 и у ступеней Эхо (economy/echo.py, biome_L): (12 + уровень) = (32 + этаж) × K, K = P(c) у первого биома и √(P(c) × P(c + 1)) у
   второго; P — кривая силы §3.3 из ядра (RULES.cycleX10), за циклом VI — ещё шаг (P7, как у echo.py). Ручки цикла (данные climb.py):
   kX — сила врагов, % кривой (K × kX / 100), hpX — здоровье босса и стража, % образца. Образец цикла II по этой формуле совпадает с b3
   и b4 этаж в этаж — это проверяется.

   Герой цикла k — тот же герой отряда с полем cycle: ядро умножает его атаку, здоровье и защиту на кривую §3.3 (RULES.cycleX10, ADR-0041).

   Командная строка: node climb-sim.js '<json>' — печатает JSON:
   - { mode: 'biomes', hpX } — уровни врагов виртуальных биомов по этажам и сверка образца цикла II с b3 и b4;
   - { mode: 'grid', biome, k, levels: [L…], valor?, max?, hpX } — по уровням отряда героев цикла k: стена, забегов до падения босса осадой,
     доля здоровья босса за первый бой, победа над рунным стражем;
   - { mode: 'guard', biome, k, from, to, step, hpX } — первый уровень, с которого страж пал, и провалы выше него;
   - { mode: 'days', biomes: [id…], plan: [[k, L] по дням, с дня 1], hours, hpX } — биомы по очереди: забеги hours часов в день, осада
     копится между забегами и днями, страж — раз в день на уровне дня. Итог по биому: день и уровень падения босса и стража, стены.
   Только целые числа. */
'use strict';
const path = require('path');
const SIM = require(path.join(__dirname, '..', 'biomes', 'sim.js'));
const { EB, SQUAD, run, guardWin } = SIM;

const P = EB.RULES.cycleX10 || [10, 16, 26, 41, 66, 105];   // кривая §3.3 × 10 — одна в ядре
/* целый корень, округлённый до ближайшего: √(16 × 26 × 10⁴) = 2 039,6 → 2 040 — как 51/25 у b4 */
const isqrt = n => { if (n < 2) return n; let x = Math.floor(Math.sqrt(n)); while (x * x > n) x--; while ((x + 1) * (x + 1) <= n) x++; return (x + 1) * (x + 1) - n < n - x * x ? x + 1 : x; };

/* K × 1000 биома: ab — 'A' (первый биом цикла) или 'B' (второй); pNext — P цикла за VI */
function kOf(c, ab, pNext) {
  const pc = P[c - 1], pn = c < P.length ? P[c] : pNext;
  return ab === 'A' ? pc * 100 : isqrt(pc * pn * 10000);
}
/* виртуальный биом цикла c: образец цикла II (b3 — первый, b4 — второй), уровни по K, здоровье босса и стража × hpX % */
function virt(c, ab, o) {
  const T = EB.BIOMES[ab === 'A' ? 'b3' : 'b4'], kx = (o.kX && o.kX[c] && o.kX[c][ab]) || 100, hp = (o.hpX && o.hpX[c] && o.hpX[c][ab]) || 100;
  const K = Math.floor(kOf(c, ab, o.pNext) * kx / 100);   // сила врагов — % кривой §3.3: ручка цикла (kX, данные climb.py)
  const id = `v${c}${ab}`;
  /* здоровье босса: своё у биома или с карты босса последнего этажа (у b3 — с карты) */
  const bossPct = T.bossHpPct != null ? T.bossHpPct : EB.FOES[T.floors[T.floors.length - 1].m[0]].hpPct;
  EB.BIOMES[id] = Object.assign({}, T, {
    n: 2 * c - (ab === 'A' ? 1 : 0), cycle: c, name: `Образец цикла ${c}, биом ${ab}`,
    foeLvl: { base: Math.floor(32 * K / 1000) - 12, perFloor: K, div: 1000 },
    bossHpPct: hp === 100 ? T.bossHpPct : Math.floor(bossPct * hp / 100), guardHpPct: Math.floor(T.guardHpPct * hp / 100),
  });
  return id;
}
function setup(o) {
  const ids = [];
  for (let c = 2; c <= 6; c++) for (const ab of ['A', 'B']) ids.push(virt(c, ab, o));
  return ids;
}
const lvlOf = (id, f) => { const B = EB.BIOMES[id], L = B.foeLvl || EB.RULES.foeLvl; return L.base + Math.floor(f * L.perFloor / (L.div || 1)); };
/* отряд героев цикла k на уровне L: доблесть — своя у героя отряда или общая */
const squad = (k, L, valor) => SQUAD.map(h => EB.heroSrcValor(Object.assign({}, h, { lvl: L, valor: valor != null ? valor : h.valor, cycle: k })));

function campaign(heroes, biome, max) {
  const B = EB.BIOMES[biome], last = B.floors.length, pre = run(heroes, biome, null);
  const base = { wall: pre.wall, ms: pre.ms, spirit: pre.spirit, gold: pre.gold };
  if (pre.wall < last) return Object.assign(base, { runs: 0, reach: false, dmgBp: 0 });
  let hp = null, runs = 0, max0 = null, dmgBp = 0;
  while (runs < (max || 60)) {
    runs++;
    const b = EB.run(EB.floorBattle(pre.entry, biome, last, hp, 'rounds')), boss = b.u[1][0];
    if (max0 == null) { max0 = boss.maxHp; dmgBp = Math.floor((boss.maxHp - boss.hp) * 10000 / boss.maxHp); }
    if (!boss.alive) return Object.assign(base, { runs, reach: true, dmgBp: runs === 1 ? 10000 : dmgBp });
    if (boss.hp === hp) break;
    hp = boss.hp;
  }
  return Object.assign(base, { runs: null, reach: true, dmgBp });
}

function days(o) {
  const cache = {}, out = {};
  const at = (biome, k, L) => {
    const key = biome + '|' + k + '|' + L; if (cache[key]) return cache[key];
    const heroes = squad(k, L), r = run(heroes, biome, null);
    return (cache[key] = { heroes, r });
  };
  let bi = 0, siege = null, bossDead = false;
  for (let d = 1; d <= o.plan.length && bi < o.biomes.length; d++) {
    const [k, L] = o.plan[d - 1]; let budget = o.hours * 3600000, guardTried = false;
    while (budget > 0 && bi < o.biomes.length) {
      const biome = o.biomes[bi], B = EB.BIOMES[biome], last = B.floors.length, x = out[biome] || (out[biome] = { runs: 0, from: d, walls: [] });
      if (!bossDead) {
        const c = at(biome, k, L);
        if (c.r.wall < last) { x.runs++; x.wall = c.r.wall; if (!x.walls.length || x.walls[x.walls.length - 1][1] !== c.r.wall) x.walls.push([d, c.r.wall, k, L]); budget -= c.r.ms; continue; }
        const b = EB.run(EB.floorBattle(c.r.entry, biome, last, siege, 'rounds')), boss = b.u[1][0];
        x.runs++; budget -= c.r.ms;
        if (!boss.alive) { bossDead = true; siege = null; x.boss = { day: d, k, lvl: L, runs: x.runs }; }
        else { siege = boss.hp; x.siege = Math.floor(10000 - boss.hp * 10000 / boss.maxHp); }
        continue;
      }
      if (guardTried) break;
      guardTried = true;
      const g = guardWin(squad(k, L), biome);
      if (!g.win) { x.guardLost = [k, L]; continue; }
      x.guard = { day: d, k, lvl: L }; bi++; bossDead = false; siege = null; guardTried = false;
    }
  }
  return out;
}

module.exports = { P, kOf, setup, lvlOf, squad, campaign, days };

if (require.main === module) {
  const o = JSON.parse(process.argv[2] || '{}'), out = {};
  const ids = setup(o);
  if (o.mode === 'biomes') {
    out.biomes = ids.map(id => { const B = EB.BIOMES[id]; return { id, n: B.n, cycle: B.cycle, foeLvl: B.foeLvl, bossHpPct: B.bossHpPct, guardHpPct: B.guardHpPct,
      first: lvlOf(id, 1), last: lvlOf(id, B.floors.length), guard: lvlOf(id, B.floors.length + 1) }; });
    /* образец цикла II — тот же b3 и b4 этаж в этаж, со стражем */
    out.same = ['A', 'B'].every((ab, i) => { const t = ['b3', 'b4'][i], v = 'v2' + ab, B = EB.BIOMES[t];
      for (let f = 1; f <= B.floors.length + 1; f++) if (lvlOf(t, f) !== lvlOf(v, f)) return false;
      return B.bossHpPct === EB.BIOMES[v].bossHpPct && B.guardHpPct === EB.BIOMES[v].guardHpPct; });
  } else if (o.mode === 'grid') {
    out.rows = o.levels.map(L => {
      const h = squad(o.k, L, o.valor), c = campaign(h, o.biome, o.max || 60), g = guardWin(h, o.biome);
      return { lvl: L, wall: c.wall, reach: c.reach, runs: c.runs, dmgBp: c.dmgBp, ms: c.ms, spirit: c.spirit, gold: c.gold, guard: g.win };
    });
  } else if (o.mode === 'guard') {
    /* first — первая победа; stable — начало последней полосы побед до to: с него провалов нет (как «страж без провалов» темпа) */
    let first = null, stable = null; const lost = [];
    for (let L = o.from; L <= o.to; L += o.step) {
      const w = guardWin(squad(o.k, L), o.biome).win;
      if (w) { if (first == null) first = L; if (stable == null) stable = L; } else { if (first != null) lost.push(L); stable = null; }
    }
    out.first = first; out.stable = stable; out.lost = lost;
  } else if (o.mode === 'days') out.biomes = days(o);
  process.stdout.write(JSON.stringify(out));
}
