/* Старт с чистого листа — сборка, прогон и проверки сценария цикла I: уровни Странника 1–10, их пороги и награды (GDD §16, §31,
   ADR-0018, ADR-0019, ADR-0031). Слово автора 01.10.2026 — в data.js.
   Сборка:
   1. Прогон ядром — канонический игрок (bot.js) в мире ядра (world-sim.js): найм, дух в уровни, руна обучения, предел, рецепт, забеги
      и стражи — настоящими боями battle.js на данных biome-foes.js. Первый проход берёт уровни по этапам и запоминает, сколько опыта было
      в этот миг: это и есть пороги уровней 2–10. Второй проход идёт по правилу сервера (rules.js: опыт и этап) и обязан повторить первый.
   2. Законы (ошибка — файлы не пишутся):
      — сценарий проходится: уровень 10 и цикл II; пороги растут; каждый уровень — в миг своего этапа;
      — темп (data.js, PACE): биом 1 — 7–10 минут боя, биом 2 — 90–180 минут забегов;
      — найм не ждёт золота: герой нанят, как только открылось место;
      — ключей хватает на входы к стражам канонического прохождения и ещё GUARD.spareEntries входа;
      — руна обучения и рецепт — в цикле I; рунный предел пробит в цикле I; рун предела I на пятерых хватает к циклу II;
      — рунные стражи без провалов по уровню: от первой победы до 160-го — только победы (пара без доблести и с доблестью бойца —
        Мастерская; пятеро с доблестью бойца и без — Подземный лес);
      — правило уровня одно: показатель духа за уровень ядра (battle.js, RULES.levelExp) — тот же, что у калькулятора (economy.py);
      — тексты игрока — без спойлеров (tools/content-gen/lore/spoilers.js) и служебных слов; числа — только целые.
   3. Вывод:
      — design/ui/start.js — window.EN_START (данные, пороги, канонический путь для проверки прототипа) и алгоритм rules.js как есть;
      — tools/content-gen/start/start.json — итоги цикла I для калькуляторов (biomes/pace.py, economy/economy.py);
      — таблицы docs/content/старт-с-чистого-листа.md между метками.
   Запуск: node tools/content-gen/start/build.js            — собрать;
           node tools/content-gen/start/build.js --check    — только проверить законы и свежесть файлов;
           node tools/content-gen/start/build.js --print    — напечатать таблицы. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  data: path.join(__dirname, 'data.js'),
  rules: path.join(__dirname, 'rules.js'),
  out: path.join(ROOT, 'design', 'ui', 'start.js'),
  json: path.join(__dirname, 'start.json'),
  doc: path.join(ROOT, 'docs', 'content', 'старт-с-чистого-листа.md'),
  economy: path.join(ROOT, 'tools', 'content-gen', 'economy', 'economy.py'),
};
const DATA = require(FILES.data);
const WS = require('./world-sim.js');
const { play } = require('./bot.js');
const SP = require(path.join(ROOT, 'tools', 'content-gen', 'lore', 'spoilers.js'));
const LAD = require(path.join(ROOT, 'tools', 'content-gen', 'lore', 'ladder.js'));   // лестница спойлеров по циклам (01.10.2026)
const { EB, SQUAD } = require(path.join(ROOT, 'tools', 'content-gen', 'biomes', 'sim.js'));
const ROSTER = globalThis.EN_ROSTER, RX = globalThis.EN_RECIPES;
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/* ================================ ПРАВИЛА СБОРКИ ================================ */
const LEVEL_MAX = 100;            // §16: 100 уровней
const GUARD_SCAN = [1, 160];      // стражи без провалов: от первой победы до этого уровня
const B2_SCAN = 30;               // Подземный лес: с какого уровня искать первую победу пятерых
/* служебные слова в текстах игрока — как в проверке check_player_view.js */
const SERVICE = /ADR|§|GDD|демо(?!н)|заглушк|черновик|прототип|для команды|баланс|толковани|допущени/i;

/* ================================ СБОРКА ================================ */
const fmt = n => Number(n).toLocaleString('ru-RU');
const dec1 = (num, den) => { const q = Math.round(num * 10 / den); return q % 10 ? `${Math.floor(q / 10)},${q % 10}` : String(q / 10); };
const mins = ms => dec1(ms, 60000);
/* сотые без потерь: 925 → «9,25», 930 → «9,3» */
const dec2 = v100 => { const f = v100 % 100; return f ? `${Math.floor(v100 / 100)},${String(f).padStart(2, '0').replace(/0$/, '')}` : String(v100 / 100); };
const T =(head, rows) => ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|'].concat(rows.map(r => '| ' + r.join(' | ') + ' |')).join('\n');

function dataOf(levelsXp) {
  return {
    meta: { builder: 'tools/content-gen/start/build.js', rules: 'tools/content-gen/start/rules.js', bot: 'tools/content-gen/start/bot.js',
      sources: ['GDD §16', 'GDD §31', 'ADR-0018', 'ADR-0019', 'ADR-0031', 'design/ui/battle.js', 'design/ui/biome-foes.js', 'design/ui/roster.js', 'design/ui/recipes.js'],
      doc: 'docs/content/старт-с-чистого-листа.md' },
    xp: DATA.XP, formula: Object.assign({ max: LEVEL_MAX }, DATA.FORMULA), heroes: DATA.HEROES, train: DATA.TRAIN, start: DATA.START,
    open: DATA.OPEN, gates: DATA.GATES, pace: DATA.PACE, guard: DATA.GUARD, bot: DATA.BOT,
    levels: DATA.LEVELS.map((l, i) => Object.assign({}, l, { xp: levelsXp ? levelsXp[i] : 0 })),
  };
}

/* Возрождение душ: прокрутка — осколки одного героя пула цикла наугад (RL_DATA.shards, веса — б. п.) или, с шансом fullBp, полный
   чертёж — комплект. Гарантия (RL_DATA.pity, решение автора 01.10.2026): каждая every-я прокрутка — q осколков героя, которого выбрал
   игрок; броски генератора те же, гарантия заменяет итог своей прокрутки — как на экране (screens/roulette.js). Выбранный — герой 0
   прогона. Сколько прокруток до первого собранного героя пула и до выбранного — среднее по trials прогонам на генераторе ядра */
function rouletteCalc() {
  const src = fs.readFileSync(path.join(ROOT, 'design', 'ui', 'screens', 'roulette.js'), 'utf8'), m = src.match(/const RL_DATA = (\{[\s\S]*?\n\});/);
  if (!m) return { err: 'screens/roulette.js: нет RL_DATA' };
  const RL = vm.runInNewContext('(' + m[1] + ')'), Q = DATA.ROULETTE, need = ROSTER.rules.stub.shards;
  const W = RL.shards.reduce((a, x) => a + x[1], 0), avg100 = Math.floor(RL.shards.reduce((a, x) => a + x[0] * x[1], 0) * 100 / W);
  const rows = [];
  for (const c of Q.cycles) {
    const pool = ROSTER.heroes.filter(h => h.src === 'roulette' && h.c === c).length; if (!pool) continue;
    const rng = EB.makeRng(EB.seedOf(Q.seed + ' · ' + c)); let first = 0, spec = 0;
    for (let t = 0; t < Q.trials; t++) {
      const got = new Array(pool).fill(0); let k = 0, f = 0, sp = 0;
      while ((!f || !sp) && k < 100000) {
        k++; let h = rng(pool), q = need; const full = rng(RL.bp) < RL.fullBp;
        if (!full) { let r = rng(W); for (const [v, w] of RL.shards) { if (r < w) { q = v; break; } r -= w; } }
        if (RL.pity && k % RL.pity.every === 0) { h = 0; q = RL.pity.q; }   // гарантия: итог прокрутки — осколки выбранного
        got[h] += q;
        if (!f && got[h] >= need) f = k;
        if (!sp && got[0] >= need) sp = k;
      }
      first += f; spec += sp;
    }
    rows.push({ c, pool, first: Math.round(first / Q.trials), spec: Math.round(spec / Q.trials) });
  }
  return { RL, need, souls: ROSTER.rules.stub.activateSouls, spin: ROSTER.rules.spin, avg100, rows };
}
/* первая победа над стражем и провалы выше неё: ids — герои фикстуры, val — у кого доблесть 1 */
function guardScan(biome, ids, val, from) {
  let first = null; const holes = [];
  for (let L = from; L <= GUARD_SCAN[1]; L++) {
    const hs = ids.map(id => EB.heroSrcValor(Object.assign({}, SQUAD.find(h => h.id === id), { lvl: L, valor: val.includes(id) ? 1 : 0 })));
    const win = EB.run(EB.guardBattle(hs, biome, 'rounds')).win;
    if (win && first == null) first = L;
    if (!win && first != null) holes.push(L);
  }
  return { first, holes };
}

function build() {
  const err = [], warn = [];
  /* правило уровня ядра — то же, что у калькулятора */
  const ecoText = fs.readFileSync(FILES.economy, 'utf8'), m = ecoText.match(/^LEVEL_EXP\s*=\s*\((\d+),\s*(\d+)\)/m);
  if (!m || +m[1] !== EB.RULES.levelExp[0] || +m[2] !== EB.RULES.levelExp[1]) err.push(`дух за уровень: ядро ${JSON.stringify(EB.RULES.levelExp)}, economy.py LEVEL_EXP ${m ? `(${m[1]}, ${m[2]})` : 'не найден'} — одно правило разошлось`);
  /* герои обучения — в составе, золотые, цикл I, по порядку №1–5; фикстура прогонов — та же запись */
  DATA.HEROES.forEach((h, i) => {
    const r = ROSTER.heroes.find(x => x.id === h.id);
    if (!r) { err.push(`герой обучения ${h.id}: нет в составе`); return; }
    if (r.src !== 'gold' || r.c !== 1 || r.no !== i + 1 || !r.tut) err.push(`герой обучения ${h.id}: в составе не «золото, №${i + 1} — обучение» цикла I`);
    const f = SQUAD.find(x => x.id === h.bot);
    if (!f || !r.team || f.draft !== r.team.draft) err.push(`герой обучения ${h.id}: фикстура ${h.bot} не того черновика — бой прототипа и прогона разойдётся`);
  });
  for (const l of DATA.LEVELS) for (const k of l.opens) if (!DATA.OPEN[k]) err.push(`уровень ${l.L}: открытие «${k}» не описано в OPEN`);
  for (const [k, n] of [['items', 'предмет'], ['shards', 'герой']]) for (const l of DATA.LEVELS) for (const [id] of (l.reward[k] || [])) {
    if (k === 'items' && !RX.items.find(i => i.id === id)) err.push(`уровень ${l.L}: ${n} ${id} — нет в recipes.js`);
    if (k === 'shards' && !ROSTER.heroes.find(h => h.id === id)) err.push(`уровень ${l.L}: ${n} ${id} — нет в составе`);
  }
  if (err.length) return { err, warn };

  /* 1. первый проход: пороги */
  const D1 = dataOf(null), w1 = WS.make(D1, { stageOnly: true }), p1 = play(w1.W, D1);
  if (!p1.done) err.push(`первый проход: сценарий не дошёл до цикла II за ${DATA.BOT.maxSteps} шагов — уровень ${w1.M.lvl}`);
  const mom = DATA.LEVELS.map(l => w1.moments.find(x => x.L === l.L) || null);
  mom.forEach((x, i) => { if (!x) err.push(`уровень ${i + 1}: этап не взят в каноническом прохождении`); });
  if (err.length) return { err, warn };
  const thr = mom.map(x => x.xp);
  for (let i = 1; i < thr.length; i++) if (thr[i] <= thr[i - 1]) err.push(`порог уровня ${i + 1} (${thr[i]}) не выше порога уровня ${i} (${thr[i - 1]}): этапы без нового опыта — уровни слиплись`);
  if (thr[0] !== 0) err.push('уровень 1 — с нуля опыта');

  /* 2. второй проход: правило сервера повторяет первый */
  const D = dataOf(thr), w2 = WS.make(D, {}), p2 = play(w2.W, D), S = w2.S, M = w2.M;
  if (!p2.done) err.push('второй проход: сценарий не дошёл до цикла II');
  const lv2 = p2.log.filter(x => x.kind === 'level').map(x => ({ L: x.L, ms: x.ms }));
  for (const x of mom) { const y = lv2.find(z => z.L === x.L); if (!y || y.ms !== x.ms) err.push(`уровень ${x.L}: по правилу сервера взят ${y ? `на ${mins(y.ms)} мин` : 'не взят'}, по этапу — на ${mins(x.ms)} мин: пороги и этапы разошлись`); }
  if (p1.steps.length !== p2.steps.length || p1.steps.some((s, i) => JSON.stringify(s) !== JSON.stringify(p2.steps[i]))) err.push('второй проход пошёл другим путём, чем первый');

  /* 3. темп */
  const b1 = S.tot.b1 || {}, b2 = S.tot.b2 || {};
  const inC = (ms, [lo, hi]) => ms >= lo * 60000 && ms <= hi * 60000;
  if (!inC(b1.ms || 0, DATA.PACE.b1)) err.push(`биом 1: ${mins(b1.ms || 0)} мин боя — вне ${DATA.PACE.b1.join('–')} (ADR-0031, п. 5)`);
  if (!inC(b2.ms || 0, DATA.PACE.b2)) err.push(`биом 2: ${mins(b2.ms || 0)} мин забегов — вне ${DATA.PACE.b2.join('–')} (ADR-0018, ADR-0031, п. 5)`);

  /* 4. найм не ждёт золота: герой нанят до следующего забега после того, как открылось его место (посреди забега — сразу после него) */
  const hires = p2.log.filter(x => x.kind === 'hire');
  DATA.HEROES.forEach((h, i) => {
    const at = hires.find(x => x.id === h.id), Lslot = DATA.GATES.slots.findIndex(n => n >= i + 1) + 1, slotAt = p2.log.find(x => x.kind === 'level' && x.L === Lslot);
    if (!at) err.push(`${h.id}: не нанят в цикле I`);
    else if (slotAt && stepIndex(p2, at) !== stepIndex(p2, slotAt)) err.push(`${h.id}: место открыто на ${mins(slotAt.ms)} мин, нанят только на ${mins(at.ms)} — между ними забег: найм ждал золота`);
  });
  /* 5. ключи: входы канонического пути и запас */
  const entries = b => (S.tot[b] ? S.tot[b].guardTries : 0) * w2.W.entry(b);
  const keysGot = DATA.LEVELS.reduce((a, l) => a + (l.reward.keys || 0), 0), keysUsed = entries('b1') + entries('b2');
  const spareNeed = Math.max(w2.W.entry('b1'), w2.W.entry('b2')) * DATA.GUARD.spareEntries;
  if (keysGot - keysUsed < spareNeed) err.push(`рунные ключи: дано ${keysGot}, на входы ушло ${keysUsed} — запаса меньше ${spareNeed}`);
  /* 6. уроки цикла I */
  const did = k => p2.log.some(x => x.kind === k);
  if (!did('valor')) err.push('руна обучения не применена в цикле I');
  if (!did('recipe')) err.push('первый рецепт не найден в цикле I');
  const limitsI = p2.log.filter(x => x.kind === 'limit' && x.ms < (lv2.find(y => y.L === 10) || { ms: Infinity }).ms).length;
  if (!limitsI) err.push('рунный предел не пробит в цикле I: урок уровня 9 не случился');
  const runesGot = DATA.LEVELS.reduce((a, l) => a + (l.reward.runes || 0), 0);
  if (runesGot < DATA.HEROES.length * DATA.BOT.runesPerLimit) err.push(`руны предела I: наградами ${runesGot} — пятерым к циклу II нужно ${DATA.HEROES.length * DATA.BOT.runesPerLimit}`);
  const endLimI = S.heroes.filter(h => h.lim >= 1).length;
  if (endLimI < DATA.HEROES.length) err.push(`к циклу II предел I пробит у ${endLimI} из ${DATA.HEROES.length}`);

  /* 7. стражи без провалов */
  const DD = DATA.HEROES[0].bot, pair = DATA.HEROES.slice(0, 2).map(h => h.bot), pack = DATA.HEROES.map(h => h.bot);
  const scans = [
    ['Мастерская · пара', 'b1', pair, []], ['Мастерская · пара, доблесть бойца', 'b1', pair, [DD]],
    ['Подземный лес · пятеро', 'b2', pack, []], ['Подземный лес · пятеро, доблесть бойца', 'b2', pack, [DD]],
  ].map(([n, b, ids, val]) => Object.assign({ n, b }, guardScan(b, ids, val, b === 'b2' ? B2_SCAN : GUARD_SCAN[0])));
  for (const x of scans) {
    if (x.first == null) err.push(`${x.n}: страж не пал ни на одном уровне до ${GUARD_SCAN[1]}-го`);
    if (x.holes.length) err.push(`${x.n}: страж берётся с ${x.first}-го, но проигрывает на ${x.holes.join(', ')} — провалы по уровню`);
  }

  /* 8. тексты игрока: спойлеры, лестница по циклам и служебные слова. Окна уровней 1–10 игрок видит в цикле I — на циклах I–II
     лестница не пускает ни спойлеров, ни намёков (tools/content-gen/lore/ladder.js) */
  const texts = [];
  for (const l of DATA.LEVELS) texts.push([`уровень ${l.L}`, l.n], [`уровень ${l.L}`, l.why], [`уровень ${l.L}, слово`, l.say[1]]);
  for (const [k, o] of Object.entries(DATA.OPEN)) texts.push([`открытие ${k}`, o.n], [`открытие ${k}`, o.d]);
  for (const [w, t] of texts) {
    for (const x of SP.scan(t)) err.push(`${w}: спойлер «${x.hit}» — ${x.why}`);
    for (const x of LAD.violations(t, 1, false)) err.push(`${w}: лестница спойлеров, ${x.lvl} «${x.hit}» — ${x.why}`);
    const s = String(t).match(SERVICE); if (s) err.push(`${w}: служебное «${s[0]}» в тексте игрока`);
  }
  for (const l of DATA.LEVELS) if (!/^(mage|enzo|smith|alch)$/.test(l.say[0])) err.push(`уровень ${l.L}: проводник «${l.say[0]}» — не из Убежища`);
  /* 9. только целые */
  const ints = []; (function walk(x, k) { if (typeof x === 'number') { if (!Number.isInteger(x)) ints.push(k); } else if (x && typeof x === 'object') for (const [kk, v] of Object.entries(x)) walk(v, k + '.' + kk); })(D, 'EN_START');
  if (ints.length) err.push('не целые числа: ' + ints.join(', '));
  if (err.length) return { err, warn };

  /* ================================ ИТОГИ ================================ */
  const R = w2.R, gold = [], acc = { gold: 0, spirit: 0, keys: 0, runes: 0, train: 0 };
  for (let L = 1; L <= 10; L++) { const r = R.reward(L); gold.push(r.gold); acc.gold += r.gold; acc.spirit += r.spirit; acc.keys += r.keys; acc.runes += r.runes; acc.train += r.train; }
  const lvAt = L => lv2.find(x => x.L === L);
  const firstBoss = b => p2.steps.find(s => s.kind === 'run' && s.b === b && s.win);
  const guardWin = b => p2.steps.find(s => s.kind === 'guard' && s.b === b && s.win);
  /* канонический путь — для проверки прототипа: шаги, уровни, итог */
  const path_ = {
    steps: p2.steps.map(s => s.kind === 'run' ? ['run', s.b, s.wall, s.win ? 1 : 0] : ['guard', s.b, s.win ? 1 : 0]),
    levels: p2.log.filter(x => x.kind === 'level').map(x => [x.L, stepIndex(p2, x)]),
    hires: hires.map(x => [x.id, stepIndex(p2, x)]),
    end: { lvl: M.lvl, xp: M.xp, cycle: S.cycle, heroes: S.heroes.map(h => [h.id, h.lvl, h.lim, h.valor]), gold: S.gold, spirit: S.spirit, keys: S.keys },
    min: { b1: Math.round((b1.ms || 0) / 1000), b2: Math.round((b2.ms || 0) / 1000) },
  };
  D.path = path_;
  const summary = {
    b1: { ms: b1.ms, runs: b1.runs, guardTries: b1.guardTries, boss: firstBoss('b1') ? { lvls: firstBoss('b1').lvls } : null, guard: guardWin('b1') ? { lvls: guardWin('b1').lvls } : null },
    b2: { ms: b2.ms, runs: b2.runs, guardTries: b2.guardTries, boss: firstBoss('b2') ? { lvls: firstBoss('b2').lvls } : null, guard: guardWin('b2') ? { lvls: guardWin('b2').lvls } : null },
  };
  /* start.json — для калькуляторов: биом 2 — в той же форме, что прежний прогон темпа (pace.json, rows.b2) */
  const lvMs = L => (lvAt(L) || { ms: 0 }).ms;
  const json = {
    meta: { builder: 'tools/content-gen/start/build.js', note: 'итоги цикла I по сценарию «Старт с чистого листа»; калькуляторы берут отсюда темп и награды обучения' },
    pace: DATA.PACE,
    account: acc, gold, trainSpirit: DATA.LEVELS.reduce((a, l) => a + (l.reward.spirit || 0), 0),
    b1: { ms: b1.ms, runs: b1.runs, guardTries: b1.guardTries, bossLvl: summary.b1.boss ? summary.b1.boss.lvls : null, guardLvl: summary.b1.guard ? summary.b1.guard.lvls : null, heroes: 2 },
    b2: { boss: { runs: stepCount(p2, 'b2', firstBoss('b2')), ms: msUntil(p2, w2, firstBoss('b2')), lvl: summary.b2.boss ? summary.b2.boss.lvls : null, heroes: DATA.HEROES.length },
      guard: { runs: b2.runs, ms: b2.ms, tries: b2.guardTries, lvl: summary.b2.guard ? summary.b2.guard.lvls : null, heroes: DATA.HEROES.length },
      tot: { floors: b2.floors, o: b2.o, e: b2.e, b: b2.b, spirit: b2.spirit, gold: b2.gold, souls: b2.souls, guardWins: b2.guardWins, runs: b2.runs, ms: b2.ms },
      log: logOf(p2, 'b2') },
    b1log: logOf(p2, 'b1'),
    levels: DATA.LEVELS.map((l, i) => ({ L: l.L, xp: thr[i], min: Math.round(lvMs(l.L) / 60000) })),
    /* формула уровней с 11-го и опыт вех §16 — калькулятор экономики считает по ним «Дар Страннику» в цикле II (economy.py, ADR-0039) */
    formula: DATA.FORMULA, xp: DATA.XP,
    end: path_.end,
    scans: scans.map(x => ({ n: x.n, first: x.first })),
  };
  /* ================================ ТАБЛИЦЫ ================================ */
  const TBL = {};
  const rw = L => { const r = R.reward(L), out = [`${fmt(r.gold)} золота`];
    if (r.spirit) out.push(`${fmt(r.spirit)} духа`); if (r.keys) out.push(`${r.keys} рунных ключа`.replace(/^(\d+) рунных ключа$/, (s, n) => `${n} ${+n % 10 === 1 && +n !== 11 ? 'рунный ключ' : [2, 3, 4].includes(+n % 10) && ![12, 13, 14].includes(+n) ? 'рунных ключа' : 'рунных ключей'}`));
    if (r.runes) out.push(`${r.runes} рун предела I`); if (r.train) out.push('руна обучения');
    for (const [id, n] of r.items) out.push(`${(RX.items.find(i => i.id === id) || { n: id }).n} ×${n}`);
    if (r.chest) out.push(`сундук странника, ${['', 'обычный', 'редкий'][r.chest.r] || r.chest.r}`);
    for (const [id, n] of r.shards) out.push(`осколки «${(ROSTER.heroes.find(h => h.id === id) || { n: id }).n}» ×${n}`);
    return out.join(', '); };
  TBL.levels = T(['Уровень', 'За что', 'Опыт: порог · до следующего', 'Открывается', 'Награда', 'Миг: мин боя'],
    DATA.LEVELS.map((l, i) => [`${l.L} · ${l.n}`, l.why, `${fmt(thr[i])} · ${fmt(R.need(l.L))}`, l.opens.map(k => DATA.OPEN[k].n).join('; '), rw(l.L), mins(lvMs(l.L))]));
  TBL.next = T(['Уровень', 'Опыт на переход', 'Дар Страннику, золото'], [11, 12, 15, 20, 25, 30, 50, 99].map(L => [`${L} → ${L + 1}`, fmt(R.need(L)), fmt(R.gift(L + 1))]));
  const xpBy = {}; for (const [k, v] of Object.entries(M.facts)) { const kind = k.split(':')[0]; xpBy[kind] = (xpBy[kind] || 0) + v; }
  const XN = { kill: 'первые убийства', hero: 'герои', closure: 'закрытие биома', guard: 'рунные стражи', valor: 'доблесть', limit: 'рунные пределы', cycle: 'переход в цикл II' };
  TBL.xp = T(['Веха', 'Опыт', 'Сколько раз'], Object.entries(xpBy).map(([k, v]) => [XN[k] || k, fmt(v), Object.keys(M.facts).filter(x => x.startsWith(k + ':')).length]).concat([['всего', fmt(M.xp), '']]));
  TBL.pace = T(['Биом', 'Цель', 'Забегов', 'Попыток у стража', 'Минут боя', 'Уровни у босса', 'Уровни у стража'], [
    ['Мастерская форм', `${DATA.PACE.b1.join('–')} мин боя, остальное до часа — обучение`, b1.runs, b1.guardTries, mins(b1.ms), (summary.b1.boss || { lvls: [] }).lvls.join(' / '), (summary.b1.guard || { lvls: [] }).lvls.join(' / ')],
    ['Подземный лес', `${DATA.PACE.b2.join('–')} мин забегов`, b2.runs, b2.guardTries, mins(b2.ms), (summary.b2.boss || { lvls: [] }).lvls.join(' / '), (summary.b2.guard || { lvls: [] }).lvls.join(' / ')]]);
  TBL.path = T(['Шаг', 'Что', 'Отряд, уровни', 'Итог'], p2.steps.map((s, i) => [i + 1, s.kind === 'run' ? (s.b === 'b1' ? 'Мастерская' : 'Подземный лес') : `рунный страж · ${s.b === 'b1' ? 'Мастер' : 'Отголосок Виала'}`,
    (s.lvls || []).join(' / '), s.kind === 'run' ? (s.win ? 'босс пал' : `стена — этаж ${s.wall}`) : s.win ? 'победа' : 'поражение']));
  TBL.guards = T(['Страж', 'Первая победа, уровень', `Провалы до ${GUARD_SCAN[1]}-го`], scans.map(x => [x.n, x.first, x.holes.length ? x.holes.join(', ') : 'нет']));
  const cumSp = n => { let c = 0; for (let k = 1; k <= n; k++) c += EB.levelCost(k); return c; };
  TBL.prices = T(['Что', 'Цена', 'Правило'], [
    ['Герой обучения 1…5 за золото', [1, 2, 3, 4, 5].map(k => fmt(WS.goldPrice(1, k))).join(' / '), '10 000 × цикл × (1 + 30 % × (k − 1)), ADR-0023'],
    ['Уровни за дух, от нуля до 10 / 20 / 30 / 40 / 50', [10, 20, 30, 40, 50].map(n => fmt(cumSp(n))).join(' / '), 'уровень n — ⌈n^1,2⌉ духа, §9.3'],
    ['Рунный предел I', `${DATA.BOT.runesPerLimit} рун предела I`, '§10.1'],
    ['Доблесть', 'руна обучения — наградой уровня 7; обычная руна — 100 осколков доблести', '§10.2, ADR-0031, п. 2'],
    ['Вход к стражу', `Мастер — ${w2.W.entry('b1')} ключ, Отголосок Виала — ${w2.W.entry('b2')} ключа`, 'recipes.js, drops.guardians'],
  ]);
  TBL.end = T(['К циклу II', 'Итог'], [
    ['Уровень Странника, опыт', `${M.lvl}, ${fmt(M.xp)}`],
    ['Отряд: уровни, пределы, доблесть', S.heroes.map(h => `${(ROSTER.heroes.find(x => x.id === h.id) || { n: h.id }).n} ${h.lvl}${h.lim ? ` · предел ${['', 'I', 'II'][h.lim]}` : ''}${h.valor ? ' · доблесть' : ''}`).join('; ')],
    ['Золото и дух в кошельке', `${fmt(S.gold)} и ${fmt(S.spirit)}`],
    ['Души, ключи', `${fmt(S.souls)}, ${S.keys}`],
    ['Наградами уровней 1–10', `${fmt(acc.gold)} золота, ${fmt(acc.spirit)} духа, ${acc.keys} ключей, ${acc.runes} рун предела I, руна обучения`],
  ]);
  const RQ = rouletteCalc();
  if (RQ.err) err.push(RQ.err);
  else TBL.roulette = T(['Цикл', 'Героев в пуле', 'Прокруток до первого героя пула', 'До выбранного героя', 'Энериума до первого', 'Дней ручейка обычного'],
    RQ.rows.map(r => [ROMAN[r.c], r.pool, r.first, r.spec, fmt(r.first * RQ.spin), r.c === 2 ? Math.round(r.first * RQ.spin / DATA.ROULETTE.enerDay) : '—'])) +
    `

Прокрутка — ${RQ.spin} Энериума: осколки одного героя пула — ${RQ.RL.shards.map(([v, w]) => `${v} с весом ${w / 100} %`).join(', ')}, в среднем ${dec2(RQ.avg100)}; полный чертёж — ${RQ.RL.fullBp / 100} %.${RQ.RL.pity ? ` Гарантия — каждая ${RQ.RL.pity.every}-я прокрутка: ${RQ.RL.pity.q} осколков героя, которого выбрал игрок.` : ''} Комплект — ${RQ.need} осколков, пробуждение — ${fmt(RQ.souls)} душ.`;
  return { data: D, json, tables: TBL, err, warn, S, M, p2, summary, thr, scans };
}
/* забеги биома для таблиц калькулятора темпа (pace.py, Б1): номер, время забегов с начала биома, героев, уровни, стена, дух; попытка
   у стража после забега — guard */
function logOf(p, b) {
  const out = []; let ms = 0, n = 0;
  for (const s of p.steps) {
    if (s.b !== b) continue;
    ms += s.ms;
    if (s.kind === 'run') { n++; out.push({ run: n, ms, heroes: s.lvls.length, lvl: s.lvls, wall: s.wall, win: s.win, spirit: s.spirit }); }
    else if (out.length) { out[out.length - 1].guard = s.win; out[out.length - 1].ms = ms; }
  }
  return out;
}
/* номер шага бота, после которого случилось событие лога: шаги идут по времени */
function stepIndex(p, x) { let i = 0; for (const s of p.log) { if (s === x) return i; if (s.kind === 'run' || s.kind === 'guard') i++; } return i; }
function stepCount(p, b, upto) { if (!upto) return null; let n = 0; for (const s of p.steps) { if (s.kind === 'run' && s.b === b) n++; if (s === upto) break; } return n; }
function msUntil(p, w, upto) { if (!upto) return null; let ms = 0; for (const s of p.steps) { if (s.b === 'b2') ms += s.ms; if (s === upto) break; } return ms; }

/* ================================ ВЫВОД ================================ */
function render(data) {
  const rules = fs.readFileSync(FILES.rules, 'utf8').replace(/\r\n/g, '\n');
  const head = `/* Старт с чистого листа — данные прототипа «Свет снизу». Собирает tools/content-gen/start/build.js из data.js: уровни Странника 1–10
   цикла I — этап, порог опыта, открытия, награда, слово проводника; ворота разделов и мест отряда; канонический путь прогона ядром (path) —
   по нему проверка tools/content-gen/screens/check_start.js сверяет прототип. Руками не править: пересборка затрёт правку.
   Черновик · предложение · ждёт автора. Числа — демонстрация, только целые. Обоснование — docs/content/старт-с-чистого-листа.md.
   Уровень и награду выдаёт сервер одной операцией с номером: повтор ничего не повторяет (§16, §36). Ниже данных — алгоритм
   tools/content-gen/start/rules.js как есть. */\n`;
  return head + 'window.EN_START = ' + JSON.stringify(data) + ';\n' + rules;
}
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/start/build.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) return null;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { build, render, withTables, markA, markB, FILES };

if (require.main === module) {
  const R = build();
  for (const w of R.warn) console.log('предупреждение: ' + w);
  if (R.err.length) { console.log('ОШИБКИ:\n' + R.err.join('\n')); process.exit(1); }
  if (process.argv.includes('--print')) { for (const [k, t] of Object.entries(R.tables)) console.log(`\n### ${k}\n\n${t}`); process.exit(0); }
  const js = render(R.data), json = JSON.stringify(R.json, null, 1) + '\n';
  const docOld = fs.existsSync(FILES.doc) ? fs.readFileSync(FILES.doc, 'utf8') : null, docNew = docOld ? withTables(docOld, R.tables) : null;
  const say = `цикл I: биом 1 — ${mins(R.S.tot.b1.ms)} мин боя, ${R.S.tot.b1.runs} заб.; биом 2 — ${mins(R.S.tot.b2.ms)} мин, ${R.S.tot.b2.runs} заб.; пороги ${R.thr.join(' / ')}`;
  if (process.argv.includes('--check')) {
    const okJs = fs.existsSync(FILES.out) && fs.readFileSync(FILES.out, 'utf8') === js, okJson = fs.existsSync(FILES.json) && fs.readFileSync(FILES.json, 'utf8') === json, okDoc = !!docNew && docNew === docOld;
    console.log(okJs && okJson && okDoc ? `Свежие: start.js, start.json и таблицы документа совпадают со сборкой; законы держатся. ${say}` : `Устарели: ${[!okJs && 'design/ui/start.js', !okJson && 'start/start.json', !okDoc && 'docs/content/старт-с-чистого-листа.md'].filter(Boolean).join(', ')} — пересобрать.`);
    process.exit(okJs && okJson && okDoc ? 0 : 1);
  }
  fs.writeFileSync(FILES.out, js);
  fs.writeFileSync(FILES.json, json);
  if (docNew) fs.writeFileSync(FILES.doc, docNew);
  else console.log(`предупреждение: в ${path.relative(ROOT, FILES.doc)} нет меток таблиц — таблицы не вставлены`);
  console.log(`Собрано: ${say}.`);
}
