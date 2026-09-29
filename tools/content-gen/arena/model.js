/* Арена и Лига — калькулятор: прогон ядром боя и рейтинга на модельных игроках (GDD §20, §1.2, §5, §36; ADR-0010, ADR-0014).
   Черновик · предложение · ждёт автора. Все числа — демонстрация. Результат — tools/content-gen/arena/model.json: его читает сборщик
   build.js (данные прототипа и таблицы черновика docs/content/арена-и-лига.md).

   Что считает:
   1. Бой PvP ядром (battle.js, abilities.js, kits.js, roster.js, echo-foes.js) на героях состава циклов I–II с наборами способностей:
      - предел раундов: сколько боёв решает гибель стороны, а сколько — предел, сколько длится показ; таймер §20.2 — 90 секунд;
      - сила: сколько рейтинга стоит уровень отряда — доля побед отряда на N уровней выше, в очках Эло;
      - головоломка: сколько стоит выбор отряда под соперника — из трёх пресетов тот, что лучше против этого состава на других сидах,
        против пресета по умолчанию; это и есть выгода атакующего, который видит соперника целиком;
      - сторона: у атакующего нет выгоды от того, что он ходит первым при равенстве, — зеркальный бой.
   2. Рейтинг на модельных игроках: сервер из N игроков, сила внутри цикла — разброс в очках Эло; три профиля — обычный, увлечённый
      и плательщик при времени увлечённого. Четыре сезона по семь дней, сброс между сезонами. Список из трёх, окно подбора; после
      каждой атаки список новый сам (правила: arena.refresh.auto, слово автора 29.09.2026); «Обновить» руками — бесплатные за сутки
      и платные за Энериум по правилам; выбор соперника по оценке с шумом, исход — таблица Эло от разницы сил. Суточный срез
      рейтинга — Энериум топ-100. Что меряет: выгоду равной атаки (закон §20.5 — ноль) при прочтениях сдвига защиты, дрейф рейтинга,
      совпадение рейтинга и силы, победы за неделю по профилям (пороги планок), Энериум и места плательщика против увлечённого (×1,7),
      окупает ли Энериум обновления, таблицу «рейтинг → место» и лидеров. Для сравнения — тот же сервер без автообновления: список
      живёт, пока в нём есть кого атаковать (прежнее правило), — сколько побед и ручных обновлений меняет автообновление.
   3. Лига: сколько стоит расстановка трёх отрядов — прямой порядок против лучшей, с «отдать раунд»; победы в неделю по профилям.

   Только целые числа в игровых величинах: рейтинг, доли — б. п., сила — очки Эло, шансы — таблица Эло. Отчёт (среднее по игрокам) —
   целые сотые. Генератор — mulberry32 на сидах прогона: тот же прогон — те же числа.
   Запуск: node tools/content-gen/arena/model.js            — посчитать и записать model.json (около 20 секунд; затем build.js,
                                                              а если сдвинулись победы за неделю — и wanderer/build.js: достижения берут их);
           node tools/content-gen/arena/model.js --print    — только напечатать. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const OUT = path.join(__dirname, 'model.json');
globalThis.window = globalThis;
for (const f of ['battle.js', 'abilities.js', 'kits.js', 'roster.js', 'echo-foes.js']) require(path.join(UI, f));
const EB = globalThis.EnBattle, RS = globalThis.EN_ROSTER, KITS = globalThis.EN_KITS, XF = globalThis.EN_ECHO_FOES;
const A = require('./elo.js');
const { RULES } = require('./rules.js');

/* ================================ ДАННЫЕ ПРОГОНА ================================ */
const SIM = {
  cyc: 2,                                  // герои состава циклов I–II — цикл демо-аккаунта
  valorMax: 0,                             // доблесть героев отрядов прогона: в цикле II её нет — только на пятом пределе (ADR-0031, п. 1)
  rounds: [15, 20, 25, 30],                // пределы раундов на пробу: 25 — решение автора 29.09.2026 (RULES.rounds.by.pvp); таймер §20.2 — 90 с
  timerMs: 90000,
  level: 60, samples: 300,                 // бой на пробу: средний уровень отряда, боёв на точку
  gaps: [2, 5, 10],                        // сила: отряд на столько уровней выше
  levels: [40, 60, 90, 130],               // сила — на этих уровнях
  puzzle: { pool: 10, presets: 3, probe: 4, samples: 300 },   // головоломка: героев у игрока, пресетов, сидов на оценку, проб
  mirror: 300,                             // зеркальный бой: тот же отряд с обеих сторон
  /* сервер: игроков, разброс силы внутри цикла (очки Эло), профили — доля, атак в день, дней в неделю, выгода выбора отряда
     (доля выгоды головоломки, б. п.), шум оценки соперника (очки Эло), ref — «Обновить» руками: none — не жмёт, free — только
     бесплатные за сутки, paid — бесплатные и платные до лимита суток. Сколько их и почём — правила (arena.refresh), не допущение прогона */
  server: {
    players: 5000, spreadT: 320, seasons: 4, days: 7, mid: 4,
    placeTable: { from: 2200, to: 600, step: 20 },   // таблица «рейтинг → место»: от, до, шаг рейтинга
    prof: {
      free: { share: 6000, att: 12, days: 6, pickBp: 5000, noise: 220, ref: 'none' },
      fan: { share: 3000, att: 20, days: 7, pickBp: 10000, noise: 110, ref: 'free' },
      payer: { share: 1000, att: 20, days: 7, pickBp: 10000, noise: 110, ref: 'paid' },
    },
    bad: 5000,                             // обновить список, если лучший соперник по оценке ниже этого шанса, б. п.
    equalBand: 25,                         // «равная» атака: разница рейтингов и сил не больше, очков
    /* полоса силы для сравнения плательщика с увлечённым — не меньше стольких игроков каждого профиля: при трёх плательщиках полоса —
       шум (с 25 раундами верхняя полоса из трёх плательщиков дала «+18,66 Энериума при расходе 16,66» — случай одного места) */
    bandMin: { fan: 5, payer: 5 },
    /* запас на шум, когда полосы плательщика и увлечённого сравнивают по Энериуму топа: столько стандартных ошибок разницы (enSe полосы).
       Полоса, где плательщики ничего не купили, всё равно даёт разницу в обе стороны — это шум групп, а не отдача покупок */
    noiseSe: 2,
    shifts: [0, 25, 35, 50, -50],          // сдвиг защиты на пробу: 35 — принято (состав п. 5а ADR-0030), 25 — прежнее, 50 — прежнее прочтение, −50 — буквальное «+50 защитнику»
  },
  league: {
    players: 2000, spreadT: 300, depth: [0, 140, 300], depthNoise: 60,   // сила трёх отрядов: лучший, второй, третий — разница от лучшего
    prof: { free: { share: 6000, att: 3, days: 6 }, fan: { share: 4000, att: 6, days: 7 } },
    samples: 4000,
  },
};

/* ================================ БОЙ ЯДРОМ ================================ */
/* образцы классов и перевод классов — из screens/heroes.js (HR_DATA): герой состава в бою прототипа — тот же */
const HR = (() => {
  const src = fs.readFileSync(path.join(UI, 'screens', 'heroes.js'), 'utf8'), i = src.indexOf('const HR_DATA = {'), j = src.indexOf('\n};', i);
  if (i < 0 || j < 0) throw new Error('screens/heroes.js: нет HR_DATA');
  const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(i, j + 3).replace('const HR_DATA', 'HR_DATA'), ctx); return ctx.HR_DATA;
})();
const coreCls = h => HR.cls[String(h.cls || '').split(' / ')[0].trim()] || HR.cls[(h.cl || [])[0]] || HR.clsStub;
/* набор героя: по id героя состава (kits.js, ADR-0031, п. 7 — набор есть у всех 360); запасные пути — черновик и отряд недели Эхо */
function draftOf(h) {
  if (KITS.heroes[h.id]) return h.id;
  const d = h.team && h.team.draft; if (d && KITS.heroes[d]) return d;
  const e = XF && XF.heroes ? XF.heroes[h.id] : null; if (!e) return null;
  const key = HR.echoKit + h.id; if (!KITS.heroes[key]) KITS.heroes[key] = { ultPct: e.ultPct, actPct: e.actPct, rarity: e.rarity, maxV: e.maxV, kit: e.kit };
  return key;
}
const srcOf = (h, lvl, valor) => {
  const c = coreCls(h), T = HR.st[c] || HR.st['Танк'];
  return EB.heroSrcValor({ id: h.id, name: h.n, cls: c, el: h.sch, lvl, st: T[0].slice(), ab: [], pas: [], ult: null, draft: draftOf(h), valor });   // доблесть — правило ядра, как в прототипе
};
const POOL = RS.heroes.filter(h => h.c <= SIM.cyc && draftOf(h));
const byCls = c => POOL.filter(h => coreCls(h) === c);
/* отряд: танк, лекарь и трое из остальных, уровни — вокруг среднего. Доблесть — SIM.valorMax: в циклах I–II доблесть берут только на пятом
   пределе (§10.2; ADR-0031, п. 1 — отряд прогонов реальный), руна обучения — одна на аккаунт; прежде было «до личного максимума» */
function team(r, lvl) {
  const pick = xs => xs[r(xs.length)], t = [pick(byCls('Танк')), pick(byCls('Лекарь'))], rest = POOL.filter(h => !['Танк', 'Лекарь'].includes(coreCls(h)));
  while (t.length < 5) { const h = pick(rest); if (!t.includes(h)) t.push(h); }
  return t.map(h => ({ h, lvl: Math.max(1, lvl + r(9) - 4), valor: r(Math.min(h.maxV, SIM.valorMax) + 1) }));
}
const srcs = (t, dl) => t.map(x => srcOf(x.h, x.lvl + (dl || 0), x.valor));
function fight(ta, tb, seed, rounds, dla) { return A.pvpResult(EB.run(A.pvpBattle(EB, srcs(ta, dla), srcs(tb), seed, rounds))); }
/* доля побед → очки Эло по таблице: наименьшая разница, у которой ожидание не ниже доли */
function ptsOf(D, bp) {
  const T = D.elo.table, s = bp >= 5000 ? 1 : -1, x = s > 0 ? bp : A.BP - bp;
  let d = 0; while (d < T.length - 1 && A.BP - T[d] < x) d++;
  return s * d;
}
const half2bp = (sum, n) => Math.floor(sum * A.BP / (n * 2));

function calib(D) {
  const out = { rounds: [], strength: [], puzzle: null, mirror: null, pool: POOL.length };
  /* 1. предел раундов */
  for (const R of SIM.rounds) {
    const r = A.makeRng(A.seedOf('калибровка|раунды')); let dec = 0, draws = 0, ms = 0, over = 0, sc = 0, rds = 0;
    for (let k = 0; k < SIM.samples; k++) {
      const ta = team(r, SIM.level), tb = team(r, SIM.level), o = fight(ta, tb, A.seedOf('раунды|' + k), R);
      if (o.why !== 'sand') dec++; if (o.half === 1) draws++; ms += o.t; if (o.t > SIM.timerMs) over++; sc += o.half; rds += o.rounds;
    }
    out.rounds.push({ rounds: R, decBp: Math.floor(dec * A.BP / SIM.samples), drawBp: Math.floor(draws * A.BP / SIM.samples), ms: Math.floor(ms / SIM.samples),
      msRound: Math.floor(ms / rds), overBp: Math.floor(over * A.BP / SIM.samples), attBp: half2bp(sc, SIM.samples) });
  }
  /* 2. сила: отряд на gap уровней выше — доля побед и очки Эло за уровень */
  for (const L of SIM.levels) for (const g of SIM.gaps) {
    const r = A.makeRng(A.seedOf(`калибровка|сила|${L}|${g}`)); let sc = 0;
    for (let k = 0; k < SIM.samples; k++) { const ta = team(r, L), tb = team(r, L); sc += fight(ta, tb, A.seedOf(`сила|${L}|${g}|${k}`), D.arena.rounds, g).half; }
    const bp = half2bp(sc, SIM.samples), pts = ptsOf(D, bp);
    out.strength.push({ lvl: L, gap: g, winBp: bp, pts, perLvl: Math.floor(pts / g) });
  }
  /* 3. головоломка: у игрока pool героев и presets пресетов; «видит состав» — берёт пресет, лучший против этого соперника на других
     сидах; «не смотрит» — первый пресет. Бой — на своём сиде. Разница — выгода атакующего */
  {
    const P = SIM.puzzle, r = A.makeRng(A.seedOf('калибровка|головоломка')); let s0 = 0, s1 = 0, best = 0;
    for (let k = 0; k < P.samples; k++) {
      const col = [], pick = xs => xs[r(xs.length)];
      while (col.length < P.pool) { const h = pick(POOL); if (!col.includes(h)) col.push(h); }
      const tanks = col.filter(h => coreCls(h) === 'Танк'), heals = col.filter(h => coreCls(h) === 'Лекарь');
      const presets = [];
      for (let p = 0; p < P.presets; p++) {
        const t = [], add = h => { if (h && !t.includes(h)) t.push(h); };
        add(tanks.length ? pick(tanks) : null); add(heals.length ? pick(heals) : null);
        while (t.length < 5) add(pick(col));
        presets.push(t.map(h => ({ h, lvl: SIM.level, valor: Math.min(h.maxV, 1) })));
      }
      const foe = team(r, SIM.level).map(x => Object.assign(x, { lvl: SIM.level })), seed = A.seedOf('головоломка|' + k);
      const est = presets.map((t, p) => { let s = 0; for (let q = 0; q < P.probe; q++) s += fight(t, foe, A.seedOf(`оценка|${k}|${p}|${q}`), D.arena.rounds).half; return s; });
      const bi = est.indexOf(Math.max(...est));
      s0 += fight(presets[0], foe, seed, D.arena.rounds).half; s1 += fight(presets[bi], foe, seed, D.arena.rounds).half; if (bi) best++;
    }
    const b0 = half2bp(s0, P.samples), b1 = half2bp(s1, P.samples);
    out.puzzle = { defBp: b0, pickBp: b1, pts: ptsOf(D, b1) - ptsOf(D, b0), changedBp: Math.floor(best * A.BP / P.samples) };
  }
  /* 4. сторона: зеркальный бой — у первой стороны нет выгоды */
  {
    const r = A.makeRng(A.seedOf('калибровка|зеркало')); let sc = 0;
    for (let k = 0; k < SIM.mirror; k++) { const t = team(r, SIM.level); sc += fight(t, t, A.seedOf('зеркало|' + k), D.arena.rounds).half; }
    out.mirror = { attBp: half2bp(sc, SIM.mirror) };
  }
  return out;
}

/* ================================ РЕЙТИНГ НА МОДЕЛЬНЫХ ИГРОКАХ ================================ */
/* нормальное через сумму двенадцати равномерных (Ирвин — Холл): целое, среднее 0, разброс ≈ sd */
const normal = (r, sd) => { let s = 0; for (let i = 0; i < 12; i++) s += r(10001); return Math.floor((s - 60000) * sd / 10000); };
/* auto — список новый после каждой атаки (по умолчанию — как в правилах, arena.refresh.auto); false — прежнее правило для сравнения:
   список живёт, пока в нём есть кого атаковать, кончился — новый */
function server(D, C, shift, tag, auto) {
  const S0 = SIM.server, N = S0.players, r = A.makeRng(A.seedOf('сервер|' + tag)), M = D.arena;
  const AUTO = auto == null ? !!M.refresh.auto : !!auto;
  const DD = Object.assign({}, D, { elo: Object.assign({}, D.elo, { def: Object.assign({}, D.elo.def, { shift }) }) });
  const kinds = Object.keys(S0.prof), P = [];
  for (let i = 0; i < N; i++) {
    const x = r(A.BP); let acc = 0, kind = kinds[0];
    for (const k of kinds) { acc += S0.prof[k].share; if (x < acc) { kind = k; break; } }
    P.push({ i, kind, T: normal(r, S0.spreadT), r: D.elo.start, g: 0, lost: 0, wins: 0, att: 0, en: 0, spent: 0, refs: 0, frees: 0, week: [], hit: new Set() });
  }
  const adv = p => Math.floor(C.puzzle.pts * S0.prof[p.kind].pickBp / A.BP);
  /* подбор: снимок сервера по рейтингу раз в сутки, окно — двоичным поиском, соперник — случайный из окна с проверкой по текущему
     рейтингу. Недобор — окно шире шагом, как в игре (elo.js, pickList) */
  let snap = [], snapR = [];
  const shot = () => { snap = P.slice().sort((a, b) => a.r - b.r || a.i - b.i); snapR = snap.map(p => p.r); };
  const lower = v => { let lo = 0, hi = snapR.length; while (lo < hi) { const m = (lo + hi) >> 1; if (snapR[m] < v) lo = m + 1; else hi = m; } return lo; };
  const upper = v => { let lo = 0, hi = snapR.length; while (lo < hi) { const m = (lo + hi) >> 1; if (snapR[m] <= v) lo = m + 1; else hi = m; } return lo; };
  const setR = (p, v) => { p.r = v; };
  function list(p, skip, need) {
    const got = [], want = need || M.list;
    let w = M.window;
    for (;;) {
      const lo = lower(p.r - w), hi = upper(p.r + w);
      for (let tries = 0; got.length < want && tries < 60 && hi > lo; tries++) {
        const q = snap[lo + r(hi - lo)];
        if (q === p || got.includes(q) || skip.includes(q) || p.hit.has(q.i) || Math.abs(q.r - p.r) > w) continue;
        got.push(q);
      }
      if (got.length >= want || w >= M.maxWindow) break;
      w = Math.min(M.maxWindow, w + M.step);
    }
    return got;
  }
  /* новый список — как в игре (elo.js, pickFresh): сначала новые лица мимо прежнего списка, не хватило — добор из прежних */
  function fresh(p, prev) {
    const a = list(p, prev);
    if (a.length >= M.list || !prev.length) return { ids: a, fresh: a.length };
    return { ids: a.concat(list(p, a, M.list - a.length)), fresh: a.length };
  }
  const est = (p, q) => A.expect(D, p.T + adv(p) + normal(r, S0.prof[p.kind].noise), q.T, 0);
  const stat = { eq: 0, eqSum: 0, drift: [], att: 0 };
  const midPlace = [], endPlace = [], midTop = [], endTop = [];
  for (let s = 0; s < S0.seasons; s++) {
    const last = s === S0.seasons - 1;
    if (s) for (const p of P) setR(p, A.reset(D, p.r));
    for (const p of P) { p.hit = new Set(); p.wins = 0; p.att = 0; p.en = 0; p.spent = 0; p.refs = 0; p.frees = 0; }
    for (let d = 0; d < S0.days; d++) {
      for (const p of P) p.lost = 0;
      shot();
      const order = P.slice(); for (let i = order.length - 1; i > 0; i--) { const j = r(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
      for (const p of order) {
        const pr = S0.prof[p.kind]; if (d >= pr.days) continue;
        let n = pr.att, freeUsed = 0, paid = 0, L = list(p, []);
        while (n > 0 && L.length) {
          let bi = 0, be = -1; const es = L.map(q => est(p, q)); es.forEach((e, i) => { if (e > be) { be = e; bi = i; } });
          /* список плохой — «Обновить»: сначала бесплатные за сутки, потом за Энериум — кто платит; нет новых лиц — отказ без платы */
          const cost = A.refreshCost(M, freeUsed, paid);
          if (be < S0.bad && cost != null && (cost === 0 ? pr.ref !== 'none' : pr.ref === 'paid')) {
            const nl = fresh(p, L);
            if (nl.fresh) { if (cost === 0) { freeUsed++; p.frees++; } else { p.spent += cost; paid++; p.refs++; } L = nl.ids; continue; }
          }
          const q = L[bi]; n--; p.hit.add(q.i);
          const pw = A.expect(D, p.T + adv(p), q.T, 0), half = r(A.BP) < pw ? 2 : 0;
          const o = A.attack(DD, { r: p.r, g: p.g }, { r: q.r, g: q.g, lost: q.lost }, half);
          if (last && Math.abs(p.r - q.r) <= S0.equalBand && Math.abs(p.T - q.T) <= S0.equalBand) { stat.eq++; stat.eqSum += o.da; }
          setR(p, p.r + o.da); setR(q, q.r + o.dd); p.g++; q.g++; if (o.lost) q.lost++;
          if (half === 2) p.wins++; p.att++; stat.att++;
          if (AUTO) L = fresh(p, L).ids;   // после каждого боя список новый сам
          else { L.splice(bi, 1); if (!L.length && n > 0) L = list(p, []); }   // прежнее правило: список живёт, кончился — новый бесплатно
        }
      }
      /* суточный срез: места и Энериум топа */
      const rank = P.slice().sort((a, b) => b.r - a.r || a.i - b.i);
      rank.forEach((p, k) => { p.en += A.dailyEn(D, k + 1); });
      if (last && d === S0.mid - 1) {
        for (let rt = S0.placeTable.from; rt >= S0.placeTable.to; rt -= S0.placeTable.step) { let k = 0; while (k < rank.length && rank[k].r > rt) k++; midPlace.push([rt, k + 1]); }
        midTop.push(...rank.slice(0, 3).map(p => p.r));
      }
    }
    const mean = Math.floor(P.reduce((a, p) => a + p.r, 0) / N);
    stat.drift.push(mean);
    const rank = P.slice().sort((a, b) => b.r - a.r || a.i - b.i);
    rank.forEach((p, k) => { p.place = k + 1; });
    if (last) {
      endTop.push(...rank.slice(0, 3).map(p => p.r));
      for (let rt = S0.placeTable.from; rt >= S0.placeTable.to; rt -= S0.placeTable.step) { let k = 0; while (k < rank.length && rank[k].r > rt) k++; endPlace.push([rt, k + 1]); }
    }
  }
  /* итог последнего сезона по профилям и по силе */
  const prof = {};
  for (const k of kinds) {
    const xs = P.filter(p => p.kind === k), n = xs.length || 1, sum = f => xs.reduce((a, p) => a + f(p), 0);
    const wins = xs.map(p => p.wins).sort((a, b) => a - b);
    prof[k] = { n: xs.length, att: Math.floor(sum(p => p.att) * 100 / n), wins: Math.floor(sum(p => p.wins) * 100 / n), winMed: wins[Math.floor(wins.length / 2)],
      winBp: Math.floor(sum(p => p.wins) * A.BP / Math.max(1, sum(p => p.att))), r: Math.floor(sum(p => p.r) / n), en: Math.floor(sum(p => p.en) * 100 / n),
      spent: Math.floor(sum(p => p.spent) * 100 / n), refs: Math.floor(sum(p => p.refs) * 100 / n), frees: Math.floor(sum(p => p.frees) * 100 / n),
      top100: xs.filter(p => p.place <= 100).length, top1000: xs.filter(p => p.place <= 1000).length };
  }
  /* плательщик против увлечённого при той же силе: сила — по пятидесятым долям разброса вверх, берём верхние полосы, где топ.
     enSe — стандартная ошибка разницы средних Энериума «плательщик − увлечённый», сотые: дисперсия каждой группы по игрокам, корень —
     целый (отчёт прогона, не игровая величина). По ней сборщик отделяет отдачу покупок от шума групп (SIM.server.noiseSe) */
  const bands = [];
  const varOf = (xs, g) => { const k = xs.length; if (k < 2) return 0; let s = 0, q = 0; for (const p of xs) { const x = g(p) * 100; s += x; q += x * x; } return Math.floor((k * q - s * s) / (k * (k - 1))); };
  for (let lo = 0; lo <= 3 * S0.spreadT; lo += S0.spreadT / 2) {
    const inB = k => P.filter(p => p.kind === k && p.T >= lo && p.T < lo + S0.spreadT / 2), f = inB('fan'), y = inB('payer');
    if (f.length < S0.bandMin.fan || y.length < S0.bandMin.payer) continue;
    const avg = (xs, g) => Math.floor(xs.reduce((a, p) => a + g(p), 0) * 100 / xs.length);
    bands.push({ lo, hi: lo + S0.spreadT / 2, fan: { n: f.length, r: avg(f, p => p.r) / 100 | 0, wins: avg(f, p => p.wins), en: avg(f, p => p.en), place: avg(f, p => p.place) / 100 | 0 },
      payer: { n: y.length, r: avg(y, p => p.r) / 100 | 0, wins: avg(y, p => p.wins), en: avg(y, p => p.en), place: avg(y, p => p.place) / 100 | 0, spent: avg(y, p => p.spent) },
      enSe: A.isqrt(Math.floor(varOf(y, p => p.en) / y.length) + Math.floor(varOf(f, p => p.en) / f.length)) });
  }
  /* совпадение рейтинга и силы: ранговая корреляция, б. п. */
  const rk = (xs, f) => { const o = xs.map((p, i) => [f(p), i]).sort((a, b) => a[0] - b[0]); const out = new Array(xs.length); o.forEach(([, i], k) => { out[i] = k; }); return out; };
  const ra = rk(P, p => p.r), rb = rk(P, p => p.T), n = P.length;
  let d2 = 0; for (let i = 0; i < n; i++) d2 += (ra[i] - rb[i]) * (ra[i] - rb[i]);
  const rho = A.BP - Math.floor(6 * d2 * A.BP / (n * (n * n - 1)));
  return { shift, auto: AUTO, prof, bands, eq: stat.eq, eqGain: stat.eq ? Math.floor(stat.eqSum * 100 / stat.eq) : 0, drift: stat.drift, rhoBp: rho, midPlace, endPlace, midTop, endTop, att: stat.att };
}

/* ================================ ЛИГА ================================ */
/* матч: раунд I — мой отряд π(0) против их отряда I и так далее; третий раунд — при равном счёте. Шанс раунда — таблица Эло */
function matchBp(D, my, their, perm) {
  const p = k => A.expect(D, my[perm[k]], their[k], 0), P = [p(0), p(1), p(2)], B = A.BP, f = Math.floor;
  /* победа матча — 2:0 или 2:1: I и II, I без II и III, II без I и III; ничьи раунда здесь не считаем */
  return f((f(P[0] * P[1] / B) * B + f(P[0] * (B - P[1]) / B) * P[2] + f((B - P[0]) * P[1] / B) * P[2]) / B);
}
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
function league(D, C) {
  const L = SIM.league, r = A.makeRng(A.seedOf('лига|расстановка')); let straight = 0, best = 0, sac = 0;
  const teamsOf = T => L.depth.map((dd, k) => T - dd + (k ? normal(r, L.depthNoise) : 0));
  for (let k = 0; k < L.samples; k++) {
    const T = normal(r, L.spreadT), my = teamsOf(T), th = teamsOf(T + normal(r, 80));
    for (let i = 2; i > 0; i--) { const j = r(i + 1); [th[i], th[j]] = [th[j], th[i]]; }   // их порядок — любой: сильнейший может стоять в любом раунде
    const ws = PERMS.map(p => matchBp(D, my, th, p)), bi = ws.indexOf(Math.max(...ws));
    straight += ws[0]; best += ws[bi];
    if (PERMS[bi][th.indexOf(Math.max(...th))] === 2) sac++;   // лучшая расстановка ставит слабейший отряд против их сильнейшего — «отдать раунд»
  }
  const out = { straightBp: Math.floor(straight / L.samples), bestBp: Math.floor(best / L.samples), sacBp: Math.floor(sac * A.BP / L.samples) };
  /* победы за неделю: доля побед матча при лучшей расстановке у увлечённого (он смотрит составы) и при прямой у обычного */
  out.prof = {};
  for (const [k, pr] of Object.entries(L.prof)) {
    const wbp = k === 'fan' ? out.bestBp : out.straightBp, matches = pr.att * pr.days;
    out.prof[k] = { matches, winBp: wbp, wins: Math.floor(matches * wbp / A.BP) };
  }
  return out;
}

/* ================================ ПРОГОН ================================ */
/* отпечаток входов прогона: ядро, библиотека, наборы, состав, герои Эхо, образцы классов, правила и сам калькулятор. check_arena.js сверяет
   его с model.json и предупреждает, если прогон устарел */
function inputsSha() {
  const h = require('crypto').createHash('sha256');
  const text = file => fs.readFileSync(file, 'utf8').split('\r\n').join('\n');   // концы строк не меняют отпечаток
  for (const f of ['battle.js', 'abilities.js', 'kits.js', 'roster.js', 'echo-foes.js']) h.update(text(path.join(UI, f)));
  h.update(JSON.stringify(HR));
  for (const f of ['rules.js', 'elo.js', 'model.js']) h.update(text(path.join(__dirname, f)));
  return h.digest('hex').slice(0, 16);
}
function run() {
  const D = RULES();
  const C = calib(D);
  const S = SIM.server.shifts.map(sh => server(D, C, sh, 'сдвиг ' + sh));
  /* сравнение: тот же сервер при принятом сдвиге (тот же сид — те же игроки), но список живёт до конца — прежнее правило */
  const acc = D.elo.def.shift, X = server(D, C, acc, 'сдвиг ' + acc, !D.arena.refresh.auto);
  const L = league(D, C);
  return { meta: { sim: SIM, inputs: inputsSha() }, calib: C, server: S, cmp: { shift: acc, auto: X.auto, prof: X.prof, eqGain: X.eqGain, rhoBp: X.rhoBp }, league: L };
}

module.exports = { SIM, run, calib, server, league, team, fight, POOL, coreCls, draftOf, srcOf, inputsSha };

if (require.main === module) {
  const R = run();
  const txt = JSON.stringify(R, null, 1);
  if (process.argv.includes('--print')) { console.log(txt); process.exit(0); }
  fs.writeFileSync(OUT, txt + '\n');
  const S = R.server.find(x => x.shift === RULES().elo.def.shift) || R.server[0];
  console.log(`model.json: калибровка ${R.calib.pool} героев, сервер ${SIM.server.players} игроков × ${SIM.server.seasons} сезона, отпечаток входов ${R.meta.inputs}.`);
  console.log(`Выгода равной атаки (сдвиг ${S.shift}): ${S.eqGain} сотых рейтинга на ${S.eq} атаках; выбор отряда под соперника — ${R.calib.puzzle.pts} очк. Эло.`);
}
