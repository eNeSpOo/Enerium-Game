/* Мир сценария «Старт с чистого листа» на ядре боя — для сборщика (build.js). Без браузера, только Node.
   Ядро, наборы и биомы — как в прототипе: biomes/sim.js грузит battle.js, abilities.js, kits.js, biome-foes.js; герои обучения — фикстура
   SQUAD той же записью, что прототип ставит в отряд боя (design/ui/screens/start.js). Добыча этажа — EB.floorLoot; предметы — тем же
   порядком бросков, что lootItems прототипа (index.html): базовые, ключи ремёсел, уникальный, руны стража; сид — номер забега.
   Уровень и награды — алгоритм rules.js (EnStart), тот же, что в прототипе. Только целые; время — мс боя и переходов между этажами.
   make(D, opt) → мир для bot.js; opt.stageOnly — первый проход сборщика: пороги опыта ещё не известны, уровень берётся по этапу,
   а мир запоминает, сколько опыта было в этот миг (moments). */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const SIM = require(path.join(ROOT, 'tools', 'content-gen', 'biomes', 'sim.js'));
const { EB, SQUAD } = SIM;
const RX = (() => { globalThis.window = globalThis; require(path.join(ROOT, 'design', 'ui', 'recipes.js')); return globalThis.EN_RECIPES; })();
const ROSTER = (() => { require(path.join(ROOT, 'design', 'ui', 'roster.js')); return globalThis.EN_ROSTER; })();
const EnStart = require(path.join(__dirname, 'rules.js'));

/* предметы добычи — как lootItems в index.html: общий пул базовых, ключи и уникальный биома, руны и осколки стража */
const poolItems = RX.items.filter(i => i.pool && !i.team);
const biomeItems = (tier, b) => RX.items.filter(i => i.tier === tier && i.b === b);
const cycItems = (tier, c) => RX.items.filter(i => i.tier === tier && i.cyc === c);
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const limitRune = (c, k) => cycItems('rune', c).find(i => i.glyph === ROMAN[k]) || null;
const dropOf = b => (RX.drops.enemies || []).find(e => e.biome === b) || null;
const guardOf = b => (RX.drops.guardians || []).find(g => g.biome === b) || null;
function lootItems(biome, floor, got, seed, guardWin) {
  const roll = EB.makeRng(EB.floorSeed(seed >>> 0, floor)), out = {}, put = (id, n) => { out[id] = (out[id] || 0) + n; };
  const add = list => { if (list.length) put(list[roll(list.length)].id, 1); };
  const Dd = dropOf(biome), max = Dd ? Dd.basicsPerTriggerMax : EB.BIOMES[biome] ? EB.BIOMES[biome].n : 1;
  for (let t = 0; t < (got.base || 0); t++) { const n = 1 + roll(max); for (let k = 0; k < n; k++) add(poolItems); }
  const keys = biomeItems('key', biome); for (let k = 0; k < (got.keys || 0); k++) add(keys);
  const un = biomeItems('unique', biome); for (let k = 0; k < (got.unique || 0); k++) add(un);
  const g = guardWin ? guardOf(biome) : null;
  if (g && g.kind === 'limits') {
    const W = g.weightsBp, sum = W.reduce((a, x) => a + x, 0);
    for (let k = 0; k < g.runesPerKill; k++) { let r = roll(sum), j = 0; while (r >= W[j]) { r -= W[j]; j++; } const rn = limitRune(g.cyc, j + 1); if (rn) put(rn.id, 1); }
  } else if (g && g.kind === 'valor') {
    const vs = cycItems('vshard', g.cyc)[0], sum = g.shardsBp.reduce((a, x) => a + x[1], 0) + (g.undefinedBp || 0);
    let r = roll(sum); const row = g.shardsBp.find(([, bp]) => { if (r < bp) return true; r -= bp; return false; });
    if (vs && row) put(vs.id, row[0]);
  }
  return out;
}

const LIMIT_CAP = [50, 150, 350, 700, 1200];
/* дух за уровень n — правило ядра (EB.levelCost): ⌈n^1,2⌉, тот же показатель, что у калькулятора экономики */
const levelCost = n => EB.levelCost(n);
/* цена k-го героя за золото цикла c — правило состава (EN_ROSTER.rules.gold, ADR-0023) */
const goldPrice = (c, k) => { const g = ROSTER.rules.gold, bp = ROSTER.rules.bp; return Math.floor(g.first * c * (bp + g.stepBp * (k - 1)) / bp); };

function make(D, opt = {}) {
  const R = EnStart.make(D), M = R.fresh();
  const byId = Object.fromEntries(D.heroes.map(h => [h.id, h]));
  const S = { gold: D.start.wallet.gold, spirit: D.start.wallet.spirit, souls: D.start.wallet.souls, keys: D.start.wallet.keys, train: 0, items: {}, cycle: D.start.cycle,
    heroes: [], known: {}, best: {}, boss: {}, guard: {}, recipe: 0, runNo: 0, ms: 0, msBy: {}, runsBy: {}, chests: [], shards: {},
    tot: {} };   // по биомам: этажей взято, убито по рангам, дух и золото, забегов, попыток у стража и побед — счётчики для калькуляторов
  const tot = b => S.tot[b] || (S.tot[b] = { floors: 0, o: 0, e: 0, b: 0, spirit: 0, gold: 0, souls: 0, runs: 0, ms: 0, guardTries: 0, guardWins: 0, guardMs: 0 });
  const RANK = u => u.rank === 'e' ? 'e' : u.rank === 'b' ? 'b' : u.rank === 'rune' ? null : 'o';
  const moments = [];   // первый проход: уровень, опыт и миг
  const granted = [];   // уровни, взятые с прошлого W.claim(): посреди забега их берёт сам мир — бот узнаёт о них после
  const fact = (key, kind) => R.fact(M, key, kind, S.cycle);
  const capOf = h => LIMIT_CAP[Math.min(h.lim, LIMIT_CAP.length - 1)];
  const F = () => ({ floor: S.best, boss: S.boss, guard: S.guard, recipe: S.recipe, cap: S.heroes.some(h => h.lvl >= capOf(h)), cycle: S.cycle, kill: S.known });
  const front = () => S.guard.b1 ? (S.guard.b2 ? 'b3' : 'b2') : 'b1';
  function grant(levels) {
    for (const x of levels) {
      const r = x.reward;
      S.gold += r.gold; S.spirit += r.spirit; S.keys += r.keys; S.train += r.train;
      if (r.runes) { const rn = limitRune(1, 1); S.items[rn.id] = (S.items[rn.id] || 0) + r.runes; }
      for (const [id, n] of r.items) S.items[id] = (S.items[id] || 0) + n;
      if (r.chest) S.chests.push(r.chest);
      for (const [id, n] of r.shards) S.shards[id] = (S.shards[id] || 0) + n;
    }
  }
  /* уровни: второй проход — по правилу сервера (опыт и этап); первый — только по этапу, опыт запоминается */
  function claimNow() {
    if (opt.stageOnly) {
      const got = [];
      while (M.lvl < R.N && R.stageOk(D.levels[M.lvl].stage, F())) {
        M.lvl++; moments.push({ L: M.lvl, xp: M.xp, ms: S.ms, run: S.runNo });
        got.push({ L: M.lvl, reward: R.reward(M.lvl) });
      }
      grant(got); for (const x of got) granted.push({ L: x.L, ms: S.ms });
      return got.map(x => x.L);
    }
    const r = R.claim(M, 'op' + M.seq, F());
    if (r.res) { grant(r.res.levels); for (const x of r.res.levels) granted.push({ L: x.L, ms: S.ms }); return r.res.levels.map(x => x.L); }
    return [];
  }
  const heroSrc = h => EB.heroSrcValor(Object.assign({}, SQUAD.find(x => x.id === byId[h.id].bot), { lvl: h.lvl, valor: h.valor }));
  const killFacts = b => { for (const u of b.u[1]) if (!u.alive && !S.known[u.id]) { S.known[u.id] = 1; fact('kill:' + u.id, 'kill'); } };
  const addItems = items => { for (const [id, n] of Object.entries(items)) S.items[id] = (S.items[id] || 0) + n; };
  const W = {
    st: () => ({ lvl: M.lvl, cycle: S.cycle, slots: R.slots(M.lvl), gold: S.gold, spirit: S.spirit, keys: S.keys, train: S.train,
      runes: S.items[limitRune(1, 1).id] || 0, heroes: S.heroes.map(h => ({ id: h.id, lvl: h.lvl, cap: capOf(h), lim: h.lim, valor: h.valor, maxV: h.maxV })),
      front: front(), boss: Object.assign({}, S.boss), guard: Object.assign({}, S.guard), recipe: S.recipe, craft: M.lvl >= R.opensAt('seg', 'craft:work'),
      has: (id, n) => (S.items[id] || 0) >= n }),
    ms: () => S.ms,
    price: k => goldPrice(1, k),
    levelCost,
    entry: b => { const g = guardOf(b); return g ? g.entryKeys : 0; },
    claim: () => { claimNow(); return granted.splice(0); },
    hire(id) {
      const k = S.heroes.length + 1, p = goldPrice(1, k);
      if (S.gold < p || S.heroes.length >= R.slots(M.lvl)) return false;
      S.gold -= p; S.heroes.push({ id, lvl: 0, lim: 0, valor: 0, maxV: (ROSTER.heroes.find(h => h.id === id) || {}).maxV || 1 });
      fact('hero:' + id, 'hero');
      return true;
    },
    levelUp(id) {
      const h = S.heroes.find(x => x.id === id); if (!h || h.lvl >= capOf(h)) return false;
      const c = levelCost(h.lvl + 1); if (S.spirit < c) return false;
      S.spirit -= c; h.lvl++;
      return true;
    },
    valor(id) {
      const h = S.heroes.find(x => x.id === id); if (!h || S.train < 1 || h.valor >= h.maxV) return false;
      S.train--; h.valor++; h.lvl = 0; h.lim = 0;
      fact(`valor:${id}:${h.valor}`, 'valor');
      return true;
    },
    limit(id) {
      const h = S.heroes.find(x => x.id === id), rn = limitRune(1, (h ? h.lim : 0) + 1);
      if (!h || !rn || h.lvl < capOf(h) || (S.items[rn.id] || 0) < D.bot.runesPerLimit) return false;
      S.items[rn.id] -= D.bot.runesPerLimit; h.lim++;
      fact(`limit:${id}:${h.valor}:${h.lim}`, 'limit');
      return true;
    },
    craft(cells) {
      if (!cells.every(([id, q]) => (S.items[id] || 0) >= q)) return false;
      for (const [id, q] of cells) S.items[id] -= q;
      S.recipe++;
      return true;
    },
    /* забег — этажи подряд до стены или до конца биома, как startRun → advance → floorDone прототипа */
    run(biome) {
      const B = EB.BIOMES[biome]; S.runNo++;
      const seed = EB.seedOf(`${biome}|добыча|${S.runNo}`);
      let cur = S.heroes.map(heroSrc), ms = 0, wall = 0, win = false, spirit = 0;
      for (let f = 1; f <= B.floors.length; f++) {
        const b = EB.run(EB.floorBattle(cur, biome, f, null, 'rounds')), dt = b.t + (f < B.floors.length ? EB.RULES.floor.gapMs : 0);
        ms += dt; S.ms += dt;   // миг уровня — время к концу этажа, где взят этап
        killFacts(b);
        const got = EB.floorLoot(biome, f, b, 0), T = tot(biome);
        S.gold += got.gold; S.spirit += got.spirit; S.souls += got.souls; spirit += got.spirit;
        T.gold += got.gold; T.spirit += got.spirit; T.souls += got.souls;
        for (const u of b.u[1]) if (!u.alive && RANK(u)) T[RANK(u)]++;
        addItems(lootItems(biome, f, got, seed, false));
        cur = EB.carry(cur, b); wall = f;
        if (b.win) { S.best[biome] = Math.max(S.best[biome] || 0, f); T.floors++; }
        if (B.floors[f - 1].g === 'b' && !b.u[1][0].alive && !S.boss[biome]) { S.boss[biome] = 1; fact('closure:' + biome, 'closure'); }
        claimNow();   // уровень — как только взят этап: награда приходит посреди забега, бой идёт тем же отрядом
        if (!b.win) break;
        if (f === B.floors.length) win = true;
      }
      S.msBy[biome] = (S.msBy[biome] || 0) + ms; S.runsBy[biome] = (S.runsBy[biome] || 0) + 1;
      tot(biome).runs++; tot(biome).ms += ms;
      return { wall, win, ms, spirit };
    },
    guard(biome) {
      const B = EB.BIOMES[biome], g = guardOf(biome);
      if (!g || S.keys < g.entryKeys) return { win: false, ms: 0 };
      S.keys -= g.entryKeys; S.runNo++;
      const seed = EB.seedOf(`${biome}|добыча|${S.runNo}`);
      const b = EB.run(EB.guardBattle(S.heroes.map(heroSrc), biome, 'rounds'));
      killFacts(b);
      const got = EB.floorLoot(biome, B.floors.length + 1, b, 0), T = tot(biome);
      S.gold += got.gold; S.spirit += got.spirit; S.souls += got.souls;
      T.gold += got.gold; T.spirit += got.spirit; T.souls += got.souls; T.guardTries++; T.guardMs += b.t; T.ms += b.t;
      if (b.win) T.guardWins++;
      addItems(lootItems(biome, B.floors.length + 1, got, seed, b.win));
      if (b.win && !S.guard[biome]) {
        S.guard[biome] = 1; fact('guard:' + biome, 'guard');
        if (biome === 'b2') { fact('cycle:' + (S.cycle + 1), 'cycle'); S.cycle++; }
      }
      S.ms += b.t; S.msBy[biome] = (S.msBy[biome] || 0) + b.t; S.guardMs = (S.guardMs || 0) + b.t;
      claimNow();
      return { win: b.win, ms: b.t };
    },
  };
  return { W, S, M, R, moments };
}

module.exports = { make, levelCost, goldPrice, lootItems, limitRune };
