/* Мир сценария «Старт с чистого листа» на ядре боя — для сборщика (build.js). Без браузера, только Node.
   Ядро, наборы и биомы — как в прототипе: biomes/sim.js грузит battle.js, abilities.js, kits.js, biome-foes.js; герои обучения — фикстура
   SQUAD той же записью, что прототип ставит в отряд боя (design/ui/screens/start.js). Добыча этажа — EB.floorLoot; предметы — тем же
   порядком бросков, что lootItems прототипа (index.html): базовые, ключи ремёсел, уникальный, руны стража; сид — номер забега.
   Уровень и награды — алгоритм rules.js (EnStart), тот же, что в прототипе. Только целые; время — мс боя и переходов между этажами.
   make(D, opt) → мир для bot.js; opt.stageOnly — первый проход сборщика: пороги опыта ещё не известны, уровень берётся по этапу,
   а мир запоминает, сколько опыта было в этот миг (moments).
   Добыча обучения (ADR-0040): мир пишет добычу каждого этажа каждого забега и стража — S.lootLog[номер забега] = [[этаж, золото, дух,
   души, [[предмет, сколько], …]], …]. Это и есть добыча сценария: прототип в обучении выдаёт её из данных, а не бросками.
   opt.loot — такая же таблица: мир берёт добычу из неё, а не из ядра и генератора, — так сборщик проверяет, что таблица ведёт к тому же итогу.
   Шаги сценария сверх боя (ADR-0040; D.tut — их собирает build.js, tutOf): сундук уровня chest.L открывается с заданным содержимым,
   в Лавке — одна покупка витрины обучения по цене Лавки, первый артефакт — покупка за золото и уровни за души по правилу артефактов
   (screens/wanderer.js, WN_SRV: купить — a.gold, уровень k — a.soul × k); артефакт активных биомов — только покупка: она открывает
   активный биом, без неё мир не пускает в забег (ADR-0054). Сундуки помнят номер выдачи (no) — как ch<номер> прототипа.
   Погружения Подземного леса (ADR-0049, D.dives; собирает build.js): сид добычи забега — сид сценария, seeds[номер забега] — номер забега
   полного пути, чью добычу даёт этот забег (без записи — свой номер); дар погружения — в конце забега, gifts[номер забега] — [золото, дух,
   души, [[предмет, сколько], …]]: добыча однообразных забегов, которые погружение заменило. opt.gift(номер, S) — дар считается по ходу
   (первый проход сборщика). Выданные дары — S.giftLog, в счётчиках биома — и в золоте, духе и душах, и отдельно (tot.gift). Уровни,
   взятые посреди забега, — S.lvRun[номер забега]: по ним сборщик находит забеги, где взят этап. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const SIM = require(path.join(ROOT, 'tools', 'content-gen', 'biomes', 'sim.js'));
const { EB, SQUAD } = SIM;
const RX = (() => { globalThis.window = globalThis; require(path.join(ROOT, 'design', 'ui', 'recipes.js')); return globalThis.EN_RECIPES; })();
const ROSTER = (() => { require(path.join(ROOT, 'design', 'ui', 'roster.js')); return globalThis.EN_ROSTER; })();
const LBX = (() => { require(path.join(ROOT, 'design', 'ui', 'lootboxes.js')); return globalThis.EN_LOOTBOXES; })();   // сундуки и алгоритм открытия EnLoot
const WNA = (() => { require(path.join(ROOT, 'design', 'ui', 'wanderer.js')); return globalThis.EN_WANDERER.art; })();  // артефакты Странника
const EnStart = require(path.join(__dirname, 'rules.js'));

/* шаги сценария сверх боя — из данных сценария (data.js, SCRIPT): содержимое сундука, витрина и цена покупки Лавки, цена артефакта.
   Сундук — сундук странника своей редкости, как выпал бы по своему сиду (EnLoot.resolve и roll, сид «сундук|ch<номер>» — как у
   прототипа, zpSeed), без валют из drop. Номер сундука — по порядку сундуков в наградах уровней. Цена Лавки — правило Лавки
   (screens/shop.js, shopCost: за золото — минимальная рынка × количество, mkMin). Только целые */
function tutOf(SC, levels) {
  const out = {};
  if (SC.chest) {
    const no = levels.filter(l => l.reward.chest && l.L <= SC.chest.L).length, lv = levels.find(l => l.L === SC.chest.L), sp = lv && lv.reward.chest;
    if (!sp) throw new Error(`сценарий: у уровня ${SC.chest.L} нет сундука`);
    const def = globalThis.EnLoot.resolve(LBX, { box: sp.box, r: sp.r, win: 'step', cyc: 1 });
    const res = globalThis.EnLoot.roll(def, globalThis.EnLoot.seedOf('сундук|ch' + no));
    out.chest = { L: SC.chest.L, no, box: sp.box, r: sp.r, cur: res.cur.filter(([k]) => !(SC.chest.drop || []).includes(k)).map(x => x.slice()),
      items: res.items.filter(x => x.kind === 'item').map(x => [x.id, x.q]) };
  }
  if (SC.shop) {
    const goods = SC.shop.goods.map(g => g.slice()), i = goods.findIndex(g => g[0] === SC.shop.buy && g[2] === 'gold');
    const it = RX.items.find(x => x.id === SC.shop.buy), p = it && RX.drops.market[it.tier];
    if (i < 0 || !Array.isArray(p)) throw new Error(`сценарий: покупки ${SC.shop.buy} нет на витрине за золото`);
    out.shop = { buy: SC.shop.buy, i, q: goods[i][1], cost: p[it.cyc - 1] * goods[i][1], goods };
  }
  if (SC.art) {
    const a = WNA.list.find(x => x.id === SC.art.id);
    if (!a) throw new Error(`сценарий: артефакта ${SC.art.id} нет`);
    let souls = 0; for (let k = 1; k <= SC.art.lv; k++) souls += a.soul * k;
    out.art = { id: a.id, n: a.n, lv: SC.art.lv, gold: a.gold, souls };
  }
  /* артефакт активных биомов (ADR-0054): покупка за золото сама открывает активные биомы (own) — уровней в обучении нет */
  if (SC.trail) {
    const a = WNA.list.find(x => x.id === SC.trail.id);
    if (!a || a.id !== WNA.rules.trail || !a.own) throw new Error(`сценарий: ${SC.trail.id} — не артефакт активных биомов (wanderer.js, art.rules.trail)`);
    out.trail = { id: a.id, n: a.n, gold: a.gold, slots: a.base + a.own, open: a.open || WNA.rules.openLevel };
  }
  return out;
}

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
  const Dd = dropOf(biome), max = got.baseMax || (Dd ? Dd.basicsPerTriggerMax : EB.BIOMES[biome] ? EB.BIOMES[biome].n : 1);   // ларцы — got.baseMax (ADR-0044)
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
    heroes: [], known: {}, best: {}, boss: {}, guard: {}, recipe: 0, recipes: [], runNo: 0, ms: 0, msBy: {}, runsBy: {}, chests: [], shards: {},
    lootLog: {}, lastRun: {},   // добыча по забегам и этажам (ADR-0040); последний забег биома — как S.lastRun прототипа
    held: new Set(),            // что игрок держал в руках: всё, что прошло через запасы (как S.ws.seen мастерской прототипа)
    chestSeq: 0, opened: [], bought: null, art: {},   // сундуков выдано, открытые (номера), покупка Лавки, артефакты: уровень
    giftLog: {}, lvRun: {}, inRun: 0,   // дары погружений по номеру забега; уровни, взятые посреди забега; номер идущего забега (ADR-0049)
    tot: {} };   // по биомам: этажей взято, убито по рангам, дух и золото, забегов, попыток у стража и побед — счётчики для калькуляторов
  const tot = b => S.tot[b] || (S.tot[b] = { floors: 0, o: 0, e: 0, b: 0, spirit: 0, gold: 0, souls: 0, runs: 0, ms: 0, guardTries: 0, guardWins: 0, guardMs: 0 });
  /* погружения (ADR-0049): сид добычи — сервера сценария; дар погружения — в конце забега, тем же порядком, что у прототипа */
  const DV = D.dives || {};
  const seedNo = no => (DV.seeds && DV.seeds[no]) || no;
  function giveGift(biome, no) {
    const g = opt.gift ? opt.gift(no, S) : (DV.gifts && DV.gifts[no]) || null;
    if (!g || !(g[0] || g[1] || g[2] || (g[3] || []).length)) return null;
    const T = tot(biome), G = T.gift || (T.gift = { gold: 0, spirit: 0, souls: 0, items: 0, n: 0 });
    S.gold += g[0]; S.spirit += g[1]; S.souls += g[2]; addItems(Object.fromEntries(g[3] || []));
    T.gold += g[0]; T.spirit += g[1]; T.souls += g[2];
    G.gold += g[0]; G.spirit += g[1]; G.souls += g[2]; G.items += (g[3] || []).reduce((a, x) => a + x[1], 0); G.n++;
    S.giftLog[no] = [g[0], g[1], g[2], (g[3] || []).map(x => x.slice())];
    return S.giftLog[no];
  }
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
      if (r.runes) { const rn = limitRune(1, 1); S.items[rn.id] = (S.items[rn.id] || 0) + r.runes; S.held.add(rn.id); }
      for (const [id, n] of r.items) { S.items[id] = (S.items[id] || 0) + n; S.held.add(id); }
      if (r.chest) S.chests.push({ box: r.chest.box, r: r.chest.r, cyc: S.cycle, L: x.L, no: ++S.chestSeq });   // цикл — тот, в котором выдан: как в прототипе
      for (const [id, n] of r.shards) S.shards[id] = (S.shards[id] || 0) + n;
    }
  }
  /* уровни: второй проход — по правилу сервера (опыт и этап); первый — только по этапу, опыт запоминается */
  function claimNow() {
    const during = Ls => { if (S.inRun && Ls.length) (S.lvRun[S.inRun] || (S.lvRun[S.inRun] = [])).push(...Ls); return Ls; };
    if (opt.stageOnly) {
      const got = [];
      while (M.lvl < R.N && R.stageOk(D.levels[M.lvl].stage, F())) {
        M.lvl++; moments.push({ L: M.lvl, xp: M.xp, ms: S.ms, run: S.runNo });
        got.push({ L: M.lvl, reward: R.reward(M.lvl) });
      }
      grant(got); for (const x of got) granted.push({ L: x.L, ms: S.ms });
      return during(got.map(x => x.L));
    }
    const r = R.claim(M, 'op' + M.seq, F());
    if (r.res) { grant(r.res.levels); for (const x of r.res.levels) granted.push({ L: x.L, ms: S.ms }); return during(r.res.levels.map(x => x.L)); }
    return [];
  }
  const heroSrc = h => EB.heroSrcValor(Object.assign({}, SQUAD.find(x => x.id === byId[h.id].bot), { lvl: h.lvl, valor: h.valor }));
  const killFacts = b => { for (const u of b.u[1]) if (!u.alive && !S.known[u.id]) { S.known[u.id] = 1; fact('kill:' + u.id, 'kill'); } };
  const addItems = items => { for (const [id, n] of Object.entries(items)) { S.items[id] = (S.items[id] || 0) + n; if (n > 0) S.held.add(id); } };
  /* добыча этажа: из ядра и генератора — или, с opt.loot, из таблицы сценария; запись — в журнал добычи забега */
  function lootOf(biome, floor, b, seed, guardWin) {
    let got, items;
    if (opt.loot) {
      const row = ((opt.loot[S.runNo - 1] || []).find(x => x[0] === floor)) || [floor, 0, 0, 0, []];
      got = { gold: row[1], spirit: row[2], souls: row[3] }; items = Object.fromEntries(row[4]);
    } else { got = EB.floorLoot(biome, floor, b, 0); items = lootItems(biome, floor, got, seed, guardWin); }
    const L = S.lootLog[S.runNo] || (S.lootLog[S.runNo] = []);
    L.push([floor, got.gold, got.spirit, got.souls, Object.entries(items).filter(([, n]) => n > 0)]);
    return { got, items };
  }
  const TUT = D.tut || {};
  const W = {
    st: () => ({ lvl: M.lvl, cycle: S.cycle, slots: R.slots(M.lvl), gold: S.gold, spirit: S.spirit, souls: S.souls, keys: S.keys, train: S.train,
      runes: S.items[limitRune(1, 1).id] || 0, heroes: S.heroes.map(h => ({ id: h.id, lvl: h.lvl, cap: capOf(h), lim: h.lim, valor: h.valor, maxV: h.maxV })),
      front: front(), boss: Object.assign({}, S.boss), guard: Object.assign({}, S.guard), recipe: S.recipe, craft: M.lvl >= R.opensAt('seg', 'craft:work'),
      stock: M.lvl >= R.opensAt('seg', 'craft:stock'), shop: M.lvl >= R.opensAt('seg', 'craft:shop'), arts: M.lvl >= (D.gates.art || 1),
      chest: !!TUT.chest && S.chests.some(c => c.no === TUT.chest.no), bought: S.bought, art: Object.assign({}, S.art),
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
    /* сундук сценария: валюта и предметы — заданные (TUT.chest), сундук уходит из запасов */
    open() {
      const C = TUT.chest, i = C ? S.chests.findIndex(c => c.no === C.no) : -1; if (i < 0) return false;
      S.chests.splice(i, 1); S.opened.push(C.no);
      for (const [k, a] of C.cur) { if (k === 'gold') S.gold += a; else if (k === 'spirit') S.spirit += a; else if (k === 'souls') S.souls += a; else if (k === 'keys') S.keys += a; }
      addItems(Object.fromEntries(C.items));
      return true;
    },
    /* Лавка: покупка витрины обучения — цена Лавки, товар в запасы; одна */
    buy(id) {
      const P = TUT.shop; if (!P || P.buy !== id || S.bought || S.gold < P.cost) return false;
      S.gold -= P.cost; addItems({ [id]: P.q }); S.bought = id;
      return true;
    },
    /* артефакт: купить за золото, уровни до lv — за души */
    art(id, lv) {
      const A = TUT.art; if (!A || A.id !== id || A.lv !== lv || S.art[id] != null) return false;
      if (S.gold < A.gold || S.souls < A.souls) return false;
      S.gold -= A.gold; S.souls -= A.souls; S.art[id] = lv;
      return true;
    },
    /* артефакт активных биомов: покупка за золото — куплен (уровень 0), активных биомов — TUT.trail.slots */
    trail(id) {
      const A = TUT.trail; if (!A || A.id !== id || S.art[id] != null || M.lvl < A.open || S.gold < A.gold) return false;
      S.gold -= A.gold; S.art[id] = 0;
      return true;
    },
    craft(cells, rid) {
      if (!cells.every(([id, q]) => (S.items[id] || 0) >= q)) return false;
      const r = rid ? RX.recipes.find(x => x.id === rid) : null;
      for (const [id, q] of cells) S.items[id] -= q;
      if (r) { S.items[r.out[0]] = (S.items[r.out[0]] || 0) + r.out[1]; S.recipes.push(r.id); S.held.add(r.out[0]); }   // итог рецепта — в запасы, как в мастерской прототипа
      S.recipe++;
      return true;
    },
    /* забег — этажи подряд до стены или до конца биома, как startRun → advance → floorDone прототипа */
    run(biome) {
      if (TUT.trail && S.art[TUT.trail.id] == null) return { refuse: 'trail', wall: 0, win: false, ms: 0, spirit: 0 };   // нет активного биома — нет забега (ADR-0054)
      const B = EB.BIOMES[biome]; S.runNo++; S.inRun = S.runNo;
      const seed = EB.seedOf(`${biome}|добыча|${seedNo(S.runNo)}`);
      let cur = S.heroes.map(heroSrc), ms = 0, wall = 0, win = false, spirit = 0;
      for (let f = 1; f <= B.floors.length; f++) {
        const b = EB.run(EB.floorBattle(cur, biome, f, null, 'rounds')), dt = b.t + (f < B.floors.length ? EB.RULES.floor.gapMs : 0);
        ms += dt; S.ms += dt;   // миг уровня — время к концу этажа, где взят этап
        killFacts(b);
        const { got, items } = lootOf(biome, f, b, seed, false), T = tot(biome);
        S.gold += got.gold; S.spirit += got.spirit; S.souls += got.souls; spirit += got.spirit;
        T.gold += got.gold; T.spirit += got.spirit; T.souls += got.souls;
        for (const u of b.u[1]) if (!u.alive && RANK(u)) T[RANK(u)]++;
        addItems(items);
        cur = EB.carry(cur, b); wall = f;
        if (b.win) { S.best[biome] = Math.max(S.best[biome] || 0, f); T.floors++; }
        if (B.floors[f - 1].g === 'b' && !b.u[1][0].alive && !S.boss[biome]) { S.boss[biome] = 1; fact('closure:' + biome, 'closure'); }
        claimNow();   // уровень — как только взят этап: награда приходит посреди забега, бой идёт тем же отрядом
        if (!b.win) break;
        if (f === B.floors.length) win = true;
      }
      S.msBy[biome] = (S.msBy[biome] || 0) + ms; S.runsBy[biome] = (S.runsBy[biome] || 0) + 1;
      tot(biome).runs++; tot(biome).ms += ms;
      /* последний забег биома — как S.lastRun прототипа (endRun): стена, босс или отказ */
      S.lastRun[biome] = win ? { wall: null, kind: 'boss', floor: wall } : { wall, kind: 'wall', floor: wall };
      const gift = giveGift(biome, S.runNo); S.inRun = 0;   // дар погружения — после добычи этажей, в конце забега (ADR-0049)
      return { wall, win, ms, spirit, gift };
    },
    guard(biome) {
      const B = EB.BIOMES[biome], g = guardOf(biome);
      if (!g || S.keys < g.entryKeys) return { win: false, ms: 0 };
      S.keys -= g.entryKeys; S.runNo++; S.inRun = S.runNo;
      const seed = EB.seedOf(`${biome}|добыча|${seedNo(S.runNo)}`);
      const b = EB.run(EB.guardBattle(S.heroes.map(heroSrc), biome, 'rounds'));
      killFacts(b);
      const { got, items } = lootOf(biome, B.floors.length + 1, b, seed, b.win), T = tot(biome);
      S.gold += got.gold; S.spirit += got.spirit; S.souls += got.souls;
      T.gold += got.gold; T.spirit += got.spirit; T.souls += got.souls; T.guardTries++; T.guardMs += b.t; T.ms += b.t;
      if (b.win) T.guardWins++;
      addItems(items);
      if (b.win && !S.guard[biome]) {
        S.guard[biome] = 1; fact('guard:' + biome, 'guard');
        if (biome === 'b2') { fact('cycle:' + (S.cycle + 1), 'cycle'); S.cycle++; }
      }
      S.ms += b.t; S.msBy[biome] = (S.msBy[biome] || 0) + b.t; S.guardMs = (S.guardMs || 0) + b.t;
      claimNow();
      const gift = giveGift(biome, S.runNo); S.inRun = 0;
      return { win: b.win, ms: b.t, gift };
    },
  };
  return { W, S, M, R, moments };
}

module.exports = { make, levelCost, goldPrice, lootItems, limitRune, tutOf };
