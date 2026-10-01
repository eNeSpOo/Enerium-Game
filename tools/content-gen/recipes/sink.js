/* Модель стока (черновик крафта, «Крафт — главный сток ресурсов биома»): сколько ресурсов биома падает у обычного игрока за день
   и сколько съедает мастерская. Только целая арифметика: количества — в миллионных долях единицы (SCALE), проценты — целые.
   Доход обычного — прогон ёмкости (contracts/capacity.json) и ритуалы (design/ui/rituals.js), за вычетом доли времени,
   которую он отдаёт крафтовым биомам (common.js, SINK.craftShareBp). Расход — план дня:
   - закрытия крафтовых биомов: время × слоты × доля / минут на закрытие; поровну между местами цикла, каждое съедает активацию;
   - призывы врагов: SINK.summonsPerDayX100 по смеси SINK.summonMixBp — боссы руин, эхо боссов биомов, босс города;
   - разовое: каждый прочий рецепт цикла — один раз за цикл (первое создание), поделено на дни цикла.
   Полная цена каждого создания — до ресурсов добычи по установившемуся рецепту узла (sinkMain, иначе первый), с дробными долями промежуточных.
   Цикл I — обучение: доход обучения против всех рецептов цикла по разу; путь обучения — отдельной строкой, недостающее — забеги
   пересобранных биомов цикла I после обучения. Веса ресурсов мест (resWBp) — доля вида в расходе, не ниже CRAFT.biome.resFloorBp. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const C = require('./common');
const ROOT = path.join(__dirname, '..', '..', '..');
const SCALE = 1000000;
const ONCE_SKIP = new Set(['ruin', 'city', 'call', 'awcall', 'memcall', 'rune', 'valor', 'dust', 'ener', 'mask']);

function loadRituals() {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'design', 'ui', 'rituals.js'), 'utf8'), ctx);
  return ctx.window.EN_RITUALS;
}

module.exports = function sink({ items, recipes, byId, CYC, places, memories, OUT, isDrop }) {
  const S = C.SINK;
  const cap = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'content-gen', 'contracts', 'capacity.json'), 'utf8'));
  const rit = loadRituals();
  /* дробная полная цена: q — в SCALE-долях; выход рецепта делит, промежуточное не округляется */
  /* stop — узлы, на которых разворот останавливается (для счёта кристаллов Энериума: сколько их уходит, а не из чего растут) */
  function makeBom(stop) {
    const memo = {};
    function bomUnit(id) {   // полная цена одной единицы предмета, в SCALE-долях
      if (memo[id]) return memo[id];
      const it = byId[id], acc = {};
      if (isDrop(it) || stop.has(id)) { acc[id] = SCALE; return (memo[id] = acc); }
      memo[id] = acc;   // защита от петли
      const r = OUT[id].find(x => x.sinkMain) || OUT[id][0];   // установившийся путь: круг мест цикла (sinkMain), иначе первый рецепт
      for (const [x, q] of r.in) { const u = bomUnit(x); for (const k in u) acc[k] = (acc[k] || 0) + Math.floor(u[k] * q / r.out[1]); }
      return acc;
    }
    return r => { const acc = {}; for (const [x, q] of r.in) { const u = bomUnit(x); for (const k in u) acc[k] = (acc[k] || 0) + u[k] * q; } return acc; };
  }
  const bomRecipe = makeBom(new Set()), bomEner = makeBom(new Set([C.ENER.t2, C.ENER.t3]));
  const addTo = (acc, bom, mulX100) => { for (const k in bom) acc[k] = (acc[k] || 0) + Math.floor(bom[k] * mulX100 / 100); };
  const summary = [], detail = [];
  for (const cy of CYC) {
    const c = cy.n, keys = items.filter(i => i.tier === 'key' && i.cyc === c), uniq = items.filter(i => i.tier === 'unique' && i.cyc === c);
    const pool = items.filter(i => i.pool), cplaces = places.filter(p => p.cyc === c), mem = memories.filter(m => m.cyc === c);
    const tut = c === 1;
    const tmpl = String(Math.min(c, S.templateCycle));
    const days = tut ? S.tutorial.days : (cap.cycleDays[String(c)] || cap.cycleDays[tmpl]);
    const phiBp = tut ? 0 : S.craftShareBp[c];
    const K = tut ? null : cap.cycles[String(c)][S.profile], R = tut ? null : rit.sim[String(c)][S.profile];
    /* доход дня в SCALE-долях (обучение — весь цикл I как один «день») */
    const keep = 10000 - phiBp;
    const keyDay = tut ? S.tutorial.keys * SCALE : Math.floor((K.el * keep / 10000 + R.keys) * SCALE / 100);
    const baseDay = tut ? S.tutorial.basics * SCALE : Math.floor((K.base * keep / 10000 + R.basics) * SCALE / 100);
    const uniqDay = tut ? S.tutorial.uniques * SCALE : Math.floor((K.boss * keep / 10000 * C.ENEMY.uniqueBp / 10000 + R.uniq) * SCALE / 100);
    /* закрытий крафтовых биомов в день × 100: время × слоты × доля / минут на закрытие; в обучении — по одному на место */
    const runsX100 = tut ? 100 * cplaces.length : Math.floor(S.hours * S.slotsByCycle[c - 1] * 60 * phiBp / 100 / S.runMin);
    const perPlace = cplaces.length ? Math.floor(runsX100 / cplaces.length) : 0;
    const sum = tut ? 100 : S.summonsPerDayX100[c], mix = S.summonMixBp;
    const ruinBosses = cplaces.filter(p => p.kind === 'ruin'), city = cplaces.filter(p => p.kind === 'city');
    const share = (list, bp) => list.length ? Math.floor(sum * bp / 10000 / list.length) : 0;
    const once = recipes.filter(r => r.cyc === c && !ONCE_SKIP.has(r.fam));
    /* план дня: закрытия мест, призывы врагов, разовое — прочие рецепты цикла по одному разу за цикл */
    function plan(bom) {
      const acc = {};
      for (const p of cplaces) addTo(acc, bom(OUT[p.act].find(x => x.sinkMain) || OUT[p.act][0]), perPlace);
      for (const p of ruinBosses) addTo(acc, bom(OUT[p.boss.call][0]), share(ruinBosses, mix.craft));
      for (const m of mem) addTo(acc, bom(OUT[m.call][0]), share(mem, mix.memory));
      for (const p of city) addTo(acc, bom(OUT[p.boss.call][0]), share(city, mix.city));
      for (const r of once) addTo(acc, bom(r), Math.floor(100 * S.onceEach / days));
      return acc;
    }
    const want = plan(bomRecipe), wantE = plan(bomEner);
    const pct = (a, b) => b ? Math.round(a * 100 / b) : 0;
    /* путь обучения и забеги после обучения (только цикл I) */
    let tutPath = null;
    if (tut) {
      const pw = {};
      for (const id of S.tutorial.path) addTo(pw, bomRecipe(recipes.find(r => r.id === id)), 100);
      const pk = keys.reduce((a, k) => a + (pw[k.id] || 0), 0), pb = pool.reduce((a, i) => a + (pw[i.id] || 0), 0);
      const allK = keys.reduce((a, k) => a + (want[k.id] || 0), 0);
      const lack = Math.max(0, allK - keyDay);
      tutPath = { recipes: S.tutorial.path, keysX100: Math.floor(pk / 10000), basicsX100: Math.floor(pb / 10000),
        keysPct: pct(pk, keyDay), basicsPct: pct(pb, baseDay),
        restKeysX100: Math.floor(lack / 10000), restRuns: Math.ceil(lack / SCALE / C.DECKS.cycle1b.elites) };
    }
    const keyRows = keys.map(k => ({ id: k.id, n: k.n, supply: Math.floor(keyDay / keys.length), demand: want[k.id] || 0 }));
    keyRows.forEach(x => { x.pct = pct(x.demand, x.supply); });
    const keySupply = keyRows.reduce((a, x) => a + x.supply, 0), keyDemand = keyRows.reduce((a, x) => a + x.demand, 0);
    const baseDemand = pool.reduce((a, i) => a + (want[i.id] || 0), 0);
    const uniqDemand = uniq.reduce((a, i) => a + (want[i.id] || 0), 0);
    const oldKeys = items.filter(i => i.tier === 'key' && i.cyc < c).reduce((a, i) => a + (want[i.id] || 0), 0);
    /* добыча мест: ресурсы и находки против расхода */
    const placeRows = cplaces.map(p => {
      const resSupply = Math.floor(perPlace * C.CRAFT.biome.floors * C.CRAFT.biome.resPerFloorBp / 10000 * SCALE / 100);
      const findSupply = Math.floor(perPlace * (C.CRAFT.biome.finds * 10000 + C.CRAFT.biome.secondFindBp) / 10000 * SCALE / 100);
      const resDemand = p.res.reduce((a, id) => a + (want[id] || 0), 0), findDemand = p.finds.reduce((a, id) => a + (want[id] || 0), 0);
      /* веса видов: пол resFloorBp каждому, остальное — по доле в расходе; остаток округления — самому ходовому */
      const floorBp = C.CRAFT.biome.resFloorBp, n = p.res.length, free = 10000 - floorBp * n;
      const dem = p.res.map(id => want[id] || 0);
      const w = p.res.map((id, i) => floorBp + (resDemand ? Math.floor(free * (dem[i] / 1000) / (resDemand / 1000)) : Math.floor(free / n)));
      const top = dem.indexOf(Math.max(...dem));
      w[top] += 10000 - w.reduce((a, x) => a + x, 0);
      const types = p.res.map((id, i) => ({ id, wBp: w[i], demandX100: Math.floor(dem[i] / 10000),
        supplyX100: Math.floor(resSupply * w[i] / 10000 / 10000), pct: pct(dem[i], Math.floor(resSupply * w[i] / 10000)) }));
      return { id: p.id, n: p.n, kind: p.kind, runsX100: perPlace, resSupply: Math.floor(resSupply / 10000), resDemand: Math.floor(resDemand / 10000),
        resPct: pct(resDemand, resSupply), findPct: pct(findDemand, findSupply), types };
    });
    const enerDemand = [C.ENER.t1].reduce((a, id) => a + (want[id] || 0), 0);
    const ener2Demand = wantE[C.ENER.t2] || 0, enerDirect = wantE[C.ENER.t1] || 0;
    /* рунные ключи от крафта напрямую в день × 100 (для темпа доблести, tempo.py): закрытия мест, победы над призванными (ключей — номер
       цикла), рецепты ключей — по разу за цикл. По слову автора 30.09.2026 (ADR-0033) всё это — ноль, emit.js это проверяет; малый шанс
       ключей живёт в сундуке призыва, его считает tempo.py по lootboxes.js */
    const CB = C.CRAFT;
    const rkBoss = (list, bp, keyBp) => list.length ? Math.floor(sum * bp / 10000) * keyBp * c / 10000 : 0;
    const rkOnce = once.filter(r => r.out[0] === 'rkey').reduce((a, r) => a + Math.floor(r.out[1] * 100 * S.onceEach / days), 0);
    const runeKeysX100 = tut ? 0 : Math.floor(runsX100 * CB.biome.runeKeyBp * c / 10000 + rkBoss(ruinBosses, mix.craft, CB.boss.runeKeyBp)
      + rkBoss(mem, mix.memory, CB.memory.runeKeyBp) + rkBoss(city, mix.city, CB.boss.runeKeyBp) + rkOnce);
    const u = x => Math.floor(x / 10000);   // в сотых долях единицы — для таблиц
    const row = { cyc: c, days, phiBp, runsX100, summonsX100: sum,
      keySupplyX100: u(keySupply), keyDemandX100: u(keyDemand), keysPct: pct(keyDemand, keySupply),
      keyMinPct: Math.min(...keyRows.map(x => x.pct)), keyMaxPct: Math.max(...keyRows.map(x => x.pct)),
      baseSupplyX100: u(baseDay), baseDemandX100: u(baseDemand), basicsPct: pct(baseDemand, baseDay),
      uniqSupplyX100: u(uniqDay), uniqDemandX100: u(uniqDemand), uniqPct: pct(uniqDemand, uniqDay),
      oldKeysX100: u(oldKeys), enerX100: u(enerDemand), enerDirectX100: u(enerDirect), ener2X100: u(ener2Demand), runeKeysX100, tutorial: tut, tutPath };
    summary.push(row);
    detail.push({ cyc: c, keys: keyRows.map(x => ({ id: x.id, n: x.n, supplyX100: u(x.supply), demandX100: u(x.demand), pct: x.pct })), places: placeRows });
  }
  return { summary, detail };
};
