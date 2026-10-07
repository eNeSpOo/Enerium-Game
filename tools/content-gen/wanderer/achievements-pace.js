/* Темп достижений — прогон по калькуляторам экономики (черновик). Когда обычный (3 ч в день), увлечённый (8 ч) и плательщик при времени
   обычного получают каждое достижение каталога achievements.js, кривая получения по дням и итог наград.
   Прогон идёт до конца цикла VI (ADR-0047, п. 6). У обычного и плательщика календарь один — длины циклов capacity.json, cycleDays;
   у увлечённого — свой, cycleDaysBy.e: он проходит циклы быстрее, и его средний день в capacity.json считан на его длине цикла.
   Источники — только данные, этот файл их не меняет:
   - tools/content-gen/contracts/capacity.json — средний день циклов II–VI, все отряды (economy.py, sets.py, echo.py): этажи, элиты, боссы,
     цели Эхо, вершины лестницы по неделям, победы над призванными врагами и Многоликим, длины циклов, часы игры, золото и дух;
   - tools/content-gen/wanderer/pace-inputs.json — мост к sets.py и economy.py (pace_inputs.py): обучение, победы у рунных стражей
     по циклам, дни до рун на пределы, герои за золото по дням, вход к стражам;
   - design/ui/contracts.js — ёмкость занятий дня (caps: рецепты, изделия, ритуалы, Арена, Лига, клан, прах) и исполнение контрактов
     (econ: доля дней с исполненным дневным и недельным), дни без игры обычного — прогон контрактов (SIM);
   - tools/content-gen/biomes/pace.json — прогон ядра: в какой день цикла II пали боссы биомов и откуда пришёл второй биом;
   - design/ui/lootboxes.js — недельные сундуки режимов (осколки Эхо, шарды рабочих, талисманы, снаряжение), допущения assume,
     строки режима «Достижения» и ожидаемое содержимое сундука странника ev.wander; у режимов — typical: какую ступень своей полосы
     профиль берёт за неделю;
   - design/ui/arena.js — прогон Арены и Лиги: победы за неделю у обычного, увлечённого и плательщика, цикл и порог героев Лиги;
   - design/ui/rituals.js — прогон ритуалов: завершённых в день по циклу у каждого профиля, цикл открытия;
   - design/ui/event.js — очки События за неделю у каждого профиля и пороги личных планок цикла;
   - design/ui/echo-rules.js — шанс Многоликого при призыве; design/ui/recipes.js — доля рецептов героев, шанс уникального ресурса босса,
     модель стока крафта (забеги в крафтовые места), рецепты и места по циклам;
   - design/ui/roster.js — героев за золото по циклам (потолок покупки), герои Эхо по циклам, комплект осколков героя Эхо;
   - design/ui/clan.js — эталонные недели клана: кругов кланового босса за неделю;
   - tools/content-gen/cycle/climb-days.json — записи дня калькулятора подъёма: пределы и доблесть героев главной ступени цикла;
   - артефакты — из сборки wanderer.js (цикл открытия, уровни).
   Модель каждого счётчика — METRICS[m].model, BLOCK_METRICS и PACE в achievements.js: числа там, здесь только алгоритм. Счёт целочисленный:
   значения счётчиков — × 100, день — целый. День 0 — цикл I (обучение, ~4 ч), день 1 — первый день цикла II.
   Ступени гибких серий блоков циклов подбирает slotBlock — по закону кривой, от темпа обычного. */
'use strict';

const PROF = ['o', 'e', 'p'];                           // обычный, увлечённый, плательщик при времени обычного
const RATE_OF = { o: 'o', e: 'e', p: 'o' };             // чьи ставки берёт профиль
const LB_OF = { o: 'free', e: 'fan', p: 'free' };       // чей недельный сундук
const PACE_NAME = { o: 'обычный', e: 'увлечённый', p: 'обычный' };   // имена профилей в pace.json биомов
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const isInt = x => Number.isInteger(x);

/* Лига открыта в день d — одно правило для счётчика league и для калькуляторов (leagueOpen): цикл не ниже rule.from и героев в коллекции
   не меньше rule.heroes (правило — tools/content-gen/arena/rules.js, league; H — счётчик heroes × 100) */
const leagueAt = (cyc, H, rule, d) => cyc(d) >= rule.from && H[d] >= rule.heroes * 100;

/* значение по циклу: запись с наибольшим ключом не больше c; нет — null */
function byCycle(obj, c) {
  let best = -1, v = null;
  for (const [k, x] of Object.entries(obj || {})) if (+k <= c && +k > best) { best = +k; v = x; }
  return v;
}

/* календарь профиля: len — длины циклов II–VI, start — первый день цикла (день 0 — обучение), H — последний день прогона: конец цикла VI.
   by — длины циклов из capacity.json; нет записи цикла — lenLate */
function calendar(by, lenLate) {
  const len = { 1: 0 };
  for (let c = 2; c <= 6; c++) len[c] = by && by[String(c)] ? +by[String(c)] : lenLate;
  const start = { 1: 0, 2: 1 };
  for (let c = 3; c <= 6; c++) start[c] = start[c - 1] + len[c - 1];
  const cyc = d => { let c = 1; for (let k = 2; k <= 6; k++) if (d >= start[k]) c = k; return c; };
  const end = c => (c === 1 ? 0 : start[c] + len[c] - 1);
  return { len, start, cyc, end, H: end(6) };
}

/* счётчики блоков циклов: шаблоны BLOCK_METRICS → по счётчику на цикл блока: id — ключ и номер цикла, {c} в имени — цикл римскими */
function blockMetrics(A) {
  const out = {};
  for (const c of A.BLOCKS.cycles) for (const [k, M] of Object.entries(A.BLOCK_METRICS)) out[k + c] = Object.assign({}, M, { n: M.n.replace('{c}', ROMAN[c]), c, key: k });
  return out;
}

/* прогон: { cal — календари профилей, start, len, cyc, H — календарь обычного, val: { профиль: { счётчик: [×100 по дням] } }, err,
   note — чего не хватило во входах, но прогон не остановило }.
   src.block — входы счётчиков блоков: mixBp, sink, totals, climb, clanWeeks, modes (их собирает build.js из данных игры) */
function run(A, src) {
  const P = A.PACE, CAP = src.cap, LB = src.lb, SIM = src.ctSim, err = [], note = [];
  /* длины циклов: обычный и плательщик при его времени — capacity.json, cycleDays (цикл II — прогон темпа, III–VI — калькулятор подъёма,
     сроки автора ADR-0043); увлечённый — cycleDaysBy.e */
  const CAL = { o: calendar(CAP.cycleDays, P.lenLate) };
  CAL.e = calendar((CAP.cycleDaysBy && CAP.cycleDaysBy.e) || CAP.cycleDays, P.lenLate);
  CAL.p = CAL.o;
  const IN = src.inputs, CT = src.ct;
  const shareBp = [IN.limitShareBp, 10000 - IN.limitShareBp];   // доли побед у стражей пределов и доблести
  const I = Object.assign({}, IN.cycleI, P.i);                  // цикл I: калькулятор и сценарий уровней 1–10
  const uniqueBp = src.uniqueBp, manyBp = src.manyBp;
  const heroShare = [src.heroRecipes, src.allRecipes];
  const PJ = src.paceBiomes, BS = src.block;
  /* комплект осколков героя Эхо по циклу героя (ADR-0047: 1 000 … 25 000) — roster.js, rules.echoSet (src.echoKit, его даёт echoKitOf).
     Вызов без него (leagueOpen у калькуляторов контрактов и События) — тот же ряд из допущений lootboxes.js (assume.echoSet), а пока
     его нет — прежний общий комплект assume.shardsPerHero: одно правило для всех, кто считает героев по дням */
  const kitOf = c => (src.echoKit && src.echoKit[c]) || (Array.isArray(LB.assume.echoSet) && LB.assume.echoSet[c - 1]) || LB.assume.shardsPerHero;

  const val = {};
  for (const pr of PROF) {
    const K = CAL[pr], { start, len, cyc } = K, H = K.H;
    const days = Array.from({ length: H + 1 }, (_, d) => d);
    /* заготовки рядов: поток в день и в неделю (×100), ступенька по событиям */
    const flow = (perDay, i100) => { const a = []; let s = i100; for (const d of days) { if (d) s += perDay(d); a.push(s); } return a; };
    const flowWeek = (perWeek, i100) => { const a = []; let num = 0; for (const d of days) { if (d) num += perWeek(d); a.push(i100 + Math.floor(num / 7)); } return a; };
    const steps = ev => days.map(d => ev.reduce((v, [at, x]) => (at <= d && x > v ? x : v), 0));   // ev: [[день, значение × 100]]
    /* недели от начала цикла II: номер недели, её последний день и цикл */
    const weeks = [];
    for (let w = 0; start[2] + 7 * w + 6 <= H; w++) { const end = start[2] + 7 * w + 6; weeks.push({ w, end, c: cyc(end), k: Math.floor((end - start[cyc(end)]) / 7) }); }
    /* второй биом цикла: с какого дня, когда пал босс; цикл II — pace.json, дальше — те же доли цикла */
    const biomeDays = c => {
      const D = PJ && PJ.rows && PJ.rows.days && PJ.rows.days[PACE_NAME[pr]];
      if (!D) { err.push(`pace.json: нет дней профиля «${PACE_NAME[pr]}»`); return null; }
      const b = ['b3', 'b4'].map(id => D[id]);
      if (b.some(x => !x || !x.boss)) { err.push('pace.json: у биомов цикла II нет дня босса'); return null; }
      const scale = x => (c === 2 ? x : start[c] - 1 + Math.ceil((x - start[2] + 1) * len[c] / len[2]));
      return { bossA: scale(b[0].boss.day), bossB: scale(b[1].boss.day), fromB: scale(b[1].from), siegeA: b[0].boss.runs > 1 || c > 2 };
    };

    const rp = RATE_OF[pr], lbk = LB_OF[pr], V = val[pr] = {};
    const iOf = m => (I[m] || 0) * 100;
    const pay = m => (pr === 'p' && P.payer[m] && P.payer[m].bp) || 10000;
    const capDay = key => d => { const c = cyc(d); return c >= 2 ? Math.floor(CAP.cycles[c][rp][key] * pay(key) / 10000) : 0; };
    const guards = d => { const c = cyc(d); return c >= 2 ? byCycle(IN.guards[rp], c) : 0; };
    const ctDay = (kind, bp, m, from) => d => { const c = cyc(d); if (c < from) return 0; const row = CT.caps[c] && CT.caps[c][kind];
      if (!row) { err.push(`contracts.js: нет ёмкости «${kind}» цикла ${c}`); return 0; }
      return Math.floor(row[rp === 'e' ? 1 : 0] * (bp || 10000) * pay(m) / 100000000); };
    const econ = c => CT.econ[c][rp], off = SIM ? SIM.prof[rp].off : 0;
    /* дни биомов нужны только счётчикам биомов: урезанный каталог (leagueOpen) обходится без pace.json */
    const needBd = Object.values(A.METRICS).some(M => M.model.k === 'biomes' || M.model.k === 'siege' || M.model.k === 'bestiary');
    const bd = {}; if (needBd) for (let c = 2; c <= 6; c++) bd[c] = biomeDays(c);
    if (needBd && Object.values(bd).some(x => !x)) return { err };

    for (const [m, M] of Object.entries(A.METRICS)) {
      const md = M.model, from = md.from || 2;
      if (md.b) {
        /* ---------- счётчик блока цикла M.c: растёт, только пока профиль в этом цикле ---------- */
        const c = M.c, B = md.b, s0 = start[c], e0 = K.end(c), on = d => d >= s0 && d <= e0;
        if (!BS) { err.push(`счётчик ${m}: нет входов блоков циклов (src.block)`); continue; }
        if (B.cap) {   // capacity.json: в день × 10^6 у профиля в своём цикле; per — множитель-допущение из PACE
          const x = CAP.cycles[c] && CAP.cycles[c][rp] ? CAP.cycles[c][rp][B.cap] : null, per = B.per ? P[B.per] : 1;
          if (!isInt(x) || !isInt(per)) { err.push(`счётчик ${m}: в capacity.json нет «${B.cap}» цикла ${c} или множителя ${B.per}`); continue; }
          let s = 0; V[m] = days.map(d => { if (on(d)) s += x * per; return Math.floor(s / 10000); });
        } else if (B.sink) {   // модель стока recipes.js: в день × 100 у обычного; увлечённому — по часам игры (допущение PACE.runsByHours)
          const row = BS.sink && BS.sink[c];
          if (!row || !isInt(row[B.sink])) { err.push(`счётчик ${m}: в модели стока recipes.js нет «${B.sink}» цикла ${c}`); continue; }
          const per = rp === 'e' && P.runsByHours ? Math.floor(row[B.sink] * CAP.hours.e / CAP.hours.o) : row[B.sink];
          V[m] = flow(d => (on(d) ? per : 0), 0);
        } else if (B.ct) {   // ёмкость дня калькулятора контрактов; total — потолок: сколько таких вещей у цикла в данных
          const tot = B.total ? BS.totals && BS.totals[B.total] && BS.totals[B.total][c] : null;
          if (B.total && !isInt(tot)) { err.push(`счётчик ${m}: нет числа «${B.total}» цикла ${c}`); continue; }
          const f = ctDay(B.ct, 10000, m, 2);
          V[m] = flow(d => (on(d) ? f(d) : 0), 0).map(x => (tot == null ? x : Math.min(x, tot * 100)));
        } else if (B.lb) {   // недельные сундуки lootboxes.js, штук × 100; kit — на комплект осколков героя Эхо цикла; total — потолок
          const kit = B.kit ? kitOf(c) : 1, tot = B.total ? BS.totals && BS.totals[B.total] && BS.totals[B.total][c] : null;
          if (!isInt(kit) || kit < 1 || (B.total && !isInt(tot))) { err.push(`счётчик ${m}: нет комплекта осколков или числа «${B.total}» цикла ${c}`); continue; }
          const perWeek = B.lb.reduce((s, [mode, key]) => s + ((((LB.week[mode] || {})[c] || {})[lbk] || {})[key] || 0), 0);
          let num = 0; V[m] = days.map(d => { if (on(d)) num += perWeek; const x = Math.floor(num / (7 * kit)); return tot == null ? x : Math.min(x, tot * 100); });
        } else if (B.climb) {   // записи дня калькулятора подъёма: герои главной ступени развития цикла c — пределы и доблесть
          const CL = BS.climb, X = CL && CL.idx;
          if (!CL || !CL.days[pr] || !CL.ends[pr]) { err.push(`счётчик ${m}: в climb-days.json нет записей профиля ${pr}`); continue; }
          /* ряд по записям профиля who. Цикл в подъёме: с дня после конца прошлого цикла до своего конца; подъём не дошёл до конца цикла —
             до последней записи; не дошёл и до его начала — счётчик стоит на нуле, прогон это отмечает (note) */
          const series = who => {
            const rows = CL.days[who], ends = CL.ends[who];
            const c0 = c === 2 ? 0 : ends[String(c - 1)], cEnd = isInt(ends[String(c)]) ? ends[String(c)] : rows.length;
            if (!isInt(c0) || cEnd <= c0) { note.push(`счётчик ${m}, ${who}: калькулятор подъёма не дошёл до цикла ${ROMAN[c]} — счётчик стоит`); return days.map(() => 0); }
            if (!isInt(ends[String(c)])) note.push(`счётчик ${m}, ${who}: калькулятор подъёма не дошёл до конца цикла ${ROMAN[c]} — взяты записи до последнего дня`);
            const cLen = cEnd - c0;
            let best = 0;
            return days.map(d => {
              if (on(d)) { const r = rows[c0 + Math.min(d - s0 + 1, cLen) - 1];   // день цикла у профиля; календарь прогона длиннее — последний день цикла подъёма
                if (r && r[X.stageC] === c) best = Math.max(best, B.climb === 'lim' ? r[X.lim] : P.squad * r[X.stageV] + r[X.up]); }
              return best * 100; });
          };
          /* плательщик при времени обычного живёт по календарю обычного: его цикл в подъёме короче, а отстать от обычного он не может —
             берём лучшее из двух рядов */
          const own = series(pr), base = pr === 'p' && CL.days.o && CL.ends.o ? series('o') : null;
          V[m] = base ? own.map((x, d) => Math.max(x, base[d])) : own;
        } else if (B.clan) {   // эталонные недели clan.js: кругов кланового босса за неделю у клана профиля — старшая неделя своего цикла, нет — младшего
          const rows = (BS.clanWeeks || []).filter(r => r.prof === rp && r.c <= c);
          if (!rows.length) { err.push(`счётчик ${m}: в clan.js нет эталонной недели профиля ${rp} до цикла ${c}`); continue; }
          const top = rows.reduce((a, r) => (r.c > a.c || (r.c === a.c && r.w > a.w) ? r : a));
          V[m] = flowWeek(d => (on(d) ? top.circles * 100 : 0), 0);
        } else if (B.planks) {   // недельные режимы с личными планками (lootboxes.js): typical — ступень своей полосы у профиля, top — ступеней в полосе
          const ms = (BS.modes || []).filter(x => x.from <= c);
          if (!ms.length || ms.some(x => !isInt(x.top) || !isInt(x.typical[lbk]))) { err.push(`счётчик ${m}: в lootboxes.js нет ступеней режимов (typical, планки) у профиля ${lbk}`); continue; }
          const sum = ms.reduce((s, x) => s + x.typical[lbk], 0), tops = ms.filter(x => x.typical[lbk] >= x.top).length;
          V[m] = B.planks === 'sum' ? flowWeek(d => (on(d) ? sum * 100 : 0), 0) : days.map(d => (d >= s0 + 6 ? tops * 100 : 0));   // верх — итогом первой недели цикла
        } else err.push(`счётчик ${m}: неизвестная модель блока ${JSON.stringify(B)}`);
      }
      else if (md.cap) V[m] = flow(capDay(md.cap), iOf(m));
      else if (md.ct) V[m] = flow(ctDay(md.ct, md.bp, m, from), iOf(m));
      else if (md.rate) V[m] = flow(d => { const c = cyc(d); return c >= from ? Math.floor(byCycle(md.rate[rp], c) * pay(m) / 10000) : 0; }, iOf(m));
      else if (md.week) V[m] = flowWeek(d => { const c = cyc(d); return c >= from ? byCycle(md.week[rp], c) : 0; }, iOf(m));
      else if (md.lb) {   // capPerCycle — не больше стольких за каждый открытый цикл, начиная с from (героев Эхо — по одному на расу)
        /* div: 'shardsPerHero' — комплект осколков героя Эхо своего цикла (kitOf); иначе — допущение lootboxes.js или число */
        const divOf = c => (md.div === 'shardsPerHero' ? kitOf(c) : typeof md.div === 'string' ? LB.assume[md.div] : md.div || 1);
        V[m] = flowWeek(d => { const c = cyc(d); if (c < from) return 0; return md.lb.reduce((s, [mode, key]) => s + ((LB.week[mode][c] || {})[lbk] || {})[key] || 0, 0) / divOf(c); }, iOf(m));
        V[m] = V[m].map((x, d) => Math.min(Math.floor(x), md.capPerCycle ? md.capPerCycle * Math.max(0, cyc(d) - from + 1) * 100 : Infinity));
      } else if (md.lbAssume) V[m] = flowWeek(d => (cyc(d) >= from ? LB.assume[md.lbAssume][lbk] * 100 : 0), iOf(m));
      else if (md.day) V[m] = steps([[md.day[rp], 100]]);
      else if (md.k === 'biomes') {   // цикл I — оба биома; дальше — боссы первого и второго биома цикла
        const ev = [[0, P.biomesPerCycle * 100]];
        for (let c = 2; c <= 6; c++) ev.push([bd[c].bossA, ((c - 1) * P.biomesPerCycle + 1) * 100], [bd[c].bossB, c * P.biomesPerCycle * 100]);
        V[m] = steps(ev);
      } else if (md.k === 'siege') {
        let at = null; for (let c = 2; c <= 6 && at == null; c++) if (bd[c].siegeA) at = bd[c].bossA;
        V[m] = steps(at == null ? [] : [[at, 100]]);
      } else if (md.k === 'cycle') V[m] = days.map(d => cyc(d) * 100);
      else if (md.k === 'guards') V[m] = flow(guards, iOf(m));
      else if (md.k === 'valorGuard') V[m] = flow(d => Math.floor(guards(d) * shareBp[1] / 10000), iOf(m));
      else if (md.k === 'keys') V[m] = flow(d => Math.floor(guards(d) * (shareBp[0] * IN.keyEntry[0] + shareBp[1] * IN.keyEntry[1]) * cyc(d) / 10000), iOf(m));
      else if (md.k === 'uniques') { const b = V.bosses || flow(capDay('boss'), iOf('bosses')); V[m] = b.map(x => Math.floor(x * uniqueBp / 10000)); }
      else if (md.k === 'echoStep' || md.k === 'uberRaces') {
        const ev = [], seen = new Set(); let top = 0;
        for (const W of weeks) {
          const list = CAP.cycles[W.c][rp].echoTop || [], t = list.length ? list[Math.min(W.k, list.length - 1)] : 0;
          if (md.k === 'echoStep') { if (t > top) { top = t; ev.push([W.end, t * 100]); } }
          else if (t >= P.uberStep) { seen.add(W.w % P.races); ev.push([W.end, seen.size * 100]); }
        }
        V[m] = steps(ev);
      } else if (md.k === 'many') {   // победы над Многоликим — прогон Эхо (capacity.json, echoManyX1e6): он вершина недели (ADR-0039); нет поля — победы × шанс
        if (Number.isInteger(CAP.cycles[2][rp].echoManyX1e6)) V[m] = flow(capDay('echoManyX1e6'), 0).map(x => Math.floor(x / 10000));
        else { const k = V.echoKills || flow(capDay('echoKill'), 0); V[m] = k.map(x => Math.floor(x * manyBp / 10000)); }
      }
      else if (md.k === 'contracts') {   // дневной — в дни игры с долей исполненных, недельный — раз в неделю с долей исполненных (прогон контрактов)
        V[m] = flowWeek(d => { const c = cyc(d); return c >= 2 ? Math.floor(((7 - off) * econ(c).dayDoneBp + econ(c).weekDoneBp) / 100) : 0; }, 0);
      } else if (md.k === 'certified') {   // заверяет недельный тот, у кого так в прогоне контрактов; обычному — допущение
        V[m] = flowWeek(d => { const c = cyc(d); return c < 2 ? 0 : SIM.prof[rp].cert === 'w' ? Math.floor(econ(c).weekDoneBp / 100) : P.certifiedO; }, 0);
      } else if (md.k === 'arena') {   // победы за неделю × 100; плательщику — отношение его побед к увлечённому при той же силе и времени
        const AR = src.arena, pr0 = AR.model.prof, w = pr === 'e' ? pr0.fan.wins : pr0.free.wins;
        const k = pr === 'p' ? Math.floor(w * pr0.payer.wins / pr0.fan.wins) : w;
        V[m] = flowWeek(d => (cyc(d) >= AR.arena.from ? k : 0), 0);
      } else if (md.k === 'league') {   // Лига — с цикла Лиги и порога героев в коллекции; побед за неделю — прогон Лиги
        const AR = src.arena, L = AR.league, lp = AR.model.league.prof[pr === 'e' ? 'fan' : 'free'], H0 = V.heroes;
        if (!H0) { err.push('счётчик league: нужен heroes раньше в METRICS'); continue; }
        V[m] = flowWeek(d => (leagueAt(cyc, H0, L, d) ? lp.wins * 100 : 0), 0);
      } else if (md.k === 'calendar') V[m] = flowWeek(d => (7 - off) * 100, iOf(m));   // дар — за каждый день игры
      else if (md.k === 'rituals') {   // завершённых ритуалов в день × 100 — прогон ритуалов по циклу и профилю, с цикла открытия
        const RT = src.rituals, c0 = RT.rules.open.cycle, miss = [];
        for (let c = c0; c <= 6; c++) if (!(RT.sim[c] && RT.sim[c][pr] && Number.isInteger(RT.sim[c][pr].rituals))) miss.push(c);
        if (miss.length) { err.push(`rituals.js: нет прогона ритуалов циклов ${miss.join(', ')} у профиля ${pr}`); continue; }
        V[m] = flow(d => (cyc(d) >= c0 ? RT.sim[cyc(d)][pr].rituals : 0), iOf(m));
      } else if (md.k === 'plank') {   // очки недели События копятся ровно по дням; планка засчитывается сразу; счёт — с начала недели цикла
        const EV = src.event, miss = [];
        for (let c = EV.from; c <= 6; c++) if (!(EV.econ[c] && Number.isInteger(EV.econ[c].week[pr]) && Array.isArray(EV.planks[c]))) miss.push(c);
        if (miss.length) { err.push(`event.js: нет очков недели или порогов планок циклов ${miss.join(', ')} у профиля ${pr}`); continue; }
        let best = 0;
        V[m] = days.map(d => { const c = cyc(d); if (c < EV.from) return best * 100;
          const k = (d - start[c]) % 7 + 1, pts = Math.floor(EV.econ[c].week[pr] * k / 7), n = EV.planks[c].filter(x => pts >= x).length;
          if (n > best) best = n;
          return best * 100; });
      }
      else if (md.k === 'memory') V[m] = days.map(d => Math.max(0, cyc(d) - 1) * 100);
      else if (md.k === 'artifacts') {
        const at = src.art.map((a, i) => (a.from === 1 && i === src.art.findIndex(x => x.from === 1) ? 0 : start[a.from] + P.artLag[rp]));
        V[m] = days.map(d => at.filter(x => x <= d).length * 100);
      } else if (md.k === 'bestiary') {
        const ev = [[0, P.biomesPerCycle * P.creatures]];
        for (let c = 2; c <= 6; c++) ev.push([start[c], P.creatures], [bd[c].fromB, P.creatures]);
        const known = {};
        for (const W of weeks) { const list = CAP.cycles[W.c][rp].echoTop || [], t = list.length ? list[Math.min(W.k, list.length - 1)] : 0, r = W.w % P.races; if (t > (known[r] || 0)) { ev.push([W.end, t - (known[r] || 0)]); known[r] = t; } }
        ev.sort((a, b) => a[0] - b[0]);
        let i = 0, s = 0; V[m] = days.map(d => { while (i < ev.length && ev[i][0] <= d) s += ev[i++][1]; return s * 100; });
      } else if (md.k === 'heroes') {   // за золото — по дням калькулятора (sets.py gold_buy) до конца цикла III, дальше — его темп; потолок — каталог
        const G = IN.heroGold[rp], last = G.length - 1, e2 = start[3] - 1, gold = src.goldHeroes;
        if (last <= e2) { err.push('pace-inputs.json: герои за золото не доходят до конца цикла III'); continue; }
        const g = d => {
          const x = d <= last ? G[d] * 100 : G[last] * 100 + Math.floor((G[last] - G[e2]) * (d - last) * 100 / (last - e2));
          let cap = 0; for (let c = 1; c <= cyc(d); c++) cap += gold[c] || 0;
          return Math.min(x, cap * 100);
        };
        const echo = V.echoHeroes;   // герои Эхо — свой счётчик выше, с потолком по открытым циклам
        if (!echo) { err.push('счётчик heroes: нужен echoHeroes раньше в METRICS'); continue; }
        const donat = d => (pr === 'p' ? P.payer.heroes.perCycle * Object.keys(start).filter(c => +c >= P.payer.heroes.from && start[c] <= d).length * 100 : 0);
        V[m] = days.map(d => Math.floor(g(d) / 100) * 100 + echo[d] + donat(d));
      } else if (md.k === 'echoSquad') V[m] = steps([[start[6] + 7 * P.echoSquadWeek - 1, 100]]);
      else if (md.k === 'craftHero') { const r = V.recipes; V[m] = r.map(x => Math.floor(x * heroShare[0] / heroShare[1] / 100) * 100); }
      else if (md.k === 'dustHero') {   // прах копится, герой собирается, как только праха хватает на героя своего цикла: цена — dustHero × цикл
        const dust = flow(ctDay('dust', 10000, m, 2), 0);   // прах лишних осколков в день — калькулятор контрактов
        let spent = 0, n = 0;
        V[m] = days.map(d => { const cost = P.dustHero * cyc(d) * 100; while (dust[d] - spent >= cost) { spent += cost; n++; } return n * 100; });
      }
      else if (md.k === 'valor') {
        const vg = V.valorGuard; if (!vg) { err.push('счётчик chapters: нужен valorGuard раньше в METRICS'); continue; }
        V[m] = vg.map(x => P.valorI * 100 + Math.floor(Math.max(0, x - iOf('valorGuard')) * P.valorFragX100 / 100 / P.valorFrag));
      } else if (md.k === 'order') { const ch = V.chapters; V[m] = ch.map(x => P.orderValor.filter(n => x >= n * 100).length * 100); }
      else if (md.k === 'limitHero') V[m] = steps([[0, P.limitHero * 100]].concat(IN.limitSquad[rp].map((d, k) => [d, (k + 1) * 100])));   // не ниже предела отряда
      else if (md.k === 'limitSquad') V[m] = steps(IN.limitSquad[rp].map((d, k) => [d, (k + 1) * 100]));
      else err.push(`счётчик ${m}: неизвестная модель ${JSON.stringify(md)}`);
      if (V[m] && V[m].some(x => !Number.isInteger(x) || x < 0)) err.push(`счётчик ${m}, ${pr}: нецелое или отрицательное значение`);
    }
  }
  const O = CAL.o;
  return { cal: CAL, start: O.start, len: O.len, cyc: O.cyc, H: O.H, val, err, note: [...new Set(note)] };
}

/* ================== Лига: когда открыта — одно место для калькуляторов ==================
   Правило — в данных Арены (arena/rules.js, league: from — цикл рейтинга, heroes — порог разных героев, как на экране Лиги). Герои
   в коллекции по дням — счётчик heroes этого прогона: за золото (pace-inputs.json), герои Эхо из сундуков (lootboxes.js), донатный сет
   плательщика. Калькуляторы контрактов и События берут отсюда долю дней цикла с открытой Лигой, прогон достижений — тот же день.
   src — как у run, хватает cap, lb, inputs, goldHeroes; echoKit — комплект осколков героя Эхо по циклу (echoKitOf), без него — допущение
   lootboxes.js. Итог: { day: { o, e, p }, share: { цикл: { o, e, p } } — б. п., err } */
/* героев за золото по циклам — потолок покупки в счётчике heroes (design/ui/roster.js, EN_ROSTER) */
const goldHeroesOf = RO => { const g = {}; for (const h of RO.heroes) if (h.src === 'gold') g[h.c] = (g[h.c] || 0) + 1; return g; };
/* комплект осколков героя Эхо по циклу героя (design/ui/roster.js): rules.echoSet — массив по циклам I–VI (ADR-0047: герой Эхо — только
   из осколков, комплект растёт с циклом); пока поля нет — прежний общий комплект rules.stub.shards */
const echoKitOf = RO => { const R = RO.rules, kit = {}; for (let c = 2; c <= 6; c++) kit[c] = Array.isArray(R.echoSet) && R.echoSet[c - 1] ? R.echoSet[c - 1] : R.stub.shards; return kit; };
function leagueOpen(A, src, rule) {
  const R = run({ METRICS: { echoHeroes: A.METRICS.echoHeroes, heroes: A.METRICS.heroes }, PACE: A.PACE }, src);
  if ((R.err && R.err.length) || !R.val) return { day: {}, share: {}, err: R.err && R.err.length ? R.err : ['прогон героев не собрался'] };
  return leagueOf(R, rule);
}
/* день открытия у профиля и доля дней цикла с открытой Лигой, б. п., — по готовому прогону со счётчиком heroes; цикл — по календарю профиля */
function leagueOf(R, rule) {
  const day = {}, share = {};
  for (const pr of PROF) { const H = R.val[pr].heroes, d = H.findIndex((_, i) => leagueAt(R.cal[pr].cyc, H, rule, i)); day[pr] = d < 0 ? null : d; }
  for (let c = 2; c <= 6; c++) {
    share[c] = {};
    for (const pr of PROF) {
      const s = R.cal[pr].start[c], L = R.cal[pr].len[c], d = day[pr], open = d == null ? 0 : Math.max(0, Math.min(L, s + L - Math.max(d, s)));
      share[c][pr] = L ? Math.floor(open * 10000 / L) : 0;
    }
  }
  return { day, share, err: [] };
}

/* день, когда счётчик m у профиля pr впервые не меньше goal; null — за горизонтом прогона профиля */
function dayOf(R, pr, m, goal) {
  const a = R.val[pr][m]; if (!a) return null;
  const i = a.findIndex(x => x >= goal * 100);
  return i < 0 ? null : i;
}

/* редкость вехи начала пути — по дню обычного: ступени PACE.rarDays; дальше или вне модели — вневременная */
function rarityOf(P, d) {
  if (d == null) return 7;
  const i = P.rarDays.findIndex(x => d <= x);
  return i < 0 ? 7 : i + 1;
}

/* редкость достижения блока цикла c — по трети цикла (BLOCKS.rarBp), в которой его берёт обычный: цикл, цикл + 1, цикл + 2, не выше
   вневременной; вне его прогона или позже своего цикла — вневременная */
function blockRarity(R, B, c, d) {
  const K = R.cal.o;
  if (d == null || d > K.end(c)) return 7;
  const bp = Math.floor(Math.max(0, d - K.start[c]) * 10000 / K.len[c]);
  return Math.min(7, c + B.rarBp.filter(x => bp >= x).length);
}

/* ================== гибкие ступени блока цикла: подбор по закону кривой ==================
   Идём по циклу c обычного от его первого дня (там достижение входа в цикл). fixed — дни, когда обычный и так получает достижение: вехи
   начала пути и явные ступени блока. До следующего такого дня не дальше gap[1] — вставка не нужна. Иначе ставим гибкую ступень в окно
   [прошлое + gap[0], прошлое + gap[1]], не ближе gap[0] к следующему обязательному дню; когда хватает одной вставки — и не дальше gap[1]
   от него (тесно для gap[0] с обеих сторон — берём запасное loose[0], совсем тесно — середину).
   Кандидат серии — самая круглая цель, до которой её счётчик у обычного доходит в окне (и больше её прошлой цели). Из серий берём ту, у кого
   класс круглости лучше; при равенстве — ту, что реже брали на единицу веса; дальше — круглее; дальше — порядок данных. В окне нет ни одной
   цели — берём любую до верха окна. Последний промежуток — до первого дня следующего цикла (у цикла VI — до конца прогона).
   o: { c, gap: [не раньше, не позже], loose: [запасное «не раньше», класс круглости, хуже которого окно открывается раньше],
   fixed: [дни], series: [{ key, m, w, max }], units, cls }. Итог: { steps: [{ key, goal, day }], err } */
function slotBlock(R, o) {
  const K = R.cal.o, s = K.start[o.c], e = K.end(o.c), [gmin, gmax] = o.gap, out = [], err = [], used = {}, last = {};
  const fixed = [...new Set(o.fixed.filter(d => d > s && d <= e))].sort((a, b) => a - b);
  const unit = G => { let u = 1; for (const x of o.units) if (G % x === 0) u = x; return u; };
  const cls = r => { const i = o.cls.findIndex(x => r <= x); return i < 0 ? o.cls.length : i; };
  /* лучшая цель серии в окне дней [lo, hi]: счётчик проходит её не раньше lo и не позже hi; самая круглая, при равенстве — большая (позже) */
  const pick = (S, lo, hi) => {
    const V = R.val.o[S.m]; if (!V) return null;
    const a = Math.max(Math.floor(V[lo - 1] / 100), last[S.key] || 0) + 1, b = Math.floor(V[hi] / 100);
    if (a > b) return null;
    const stepG = b - a > 20000 ? unit(Math.pow(10, String(b - a).length - 3)) : 1;   // очень быстрый счётчик: перебор по круглым
    let best = null;
    for (let G = Math.ceil(a / stepG) * stepG; G <= b; G += stepG) { const r = G / unit(G); if (!best || r < best.r || (r === best.r && G > best.G)) best = { G, r }; }
    if (!best) return null;
    best.day = V.findIndex(x => x >= best.G * 100);
    return best;
  };
  let prev = s, fi = 0;
  for (let guard = 0; guard < 2000; guard++) {
    while (fi < fixed.length && fixed[fi] <= prev) fi++;
    const next = fi < fixed.length ? fixed[fi] : e + 1;
    if (next - prev <= gmax) { if (next > e) break; prev = next; continue; }
    /* окно: не раньше gmin и не позже gmax после прошлого и не ближе gmin к следующему обязательному дню. Хватает одной вставки
       (до следующего не дальше двух gmax) — она ещё и не дальше gmax от него */
    const one = next - prev <= 2 * gmax, win = g => [Math.max(prev + g, one ? next - gmax : 0), Math.min(prev + gmax, next - g)];
    let [lo, hi] = win(gmin);
    if (hi < lo && o.loose) [lo, hi] = win(o.loose[0]);                                  // тесно — с запасным «не раньше» с обеих сторон
    if (hi < lo) lo = hi = Math.min(prev + gmax, prev + Math.ceil((next - prev) / 2));   // совсем тесно — посередине
    hi = Math.min(hi, e); lo = Math.min(lo, hi);
    const scan = (a, b) => {
      let best = null;
      for (const S of o.series) {
        const n = used[S.key] || 0; if (S.max && n >= S.max) continue;
        const c = pick(S, a, b); if (!c) continue;
        const k = cls(c.r);
        /* класс круглости; затем — кого реже брали на единицу веса: n / w сравниваем крест-накрест, без дробей; затем — круглее */
        if (!best || k < best.k || (k === best.k && (n * best.S.w < best.n * S.w || (n * best.S.w === best.n * S.w && c.r < best.c.r)))) best = { S, c, k, n };
      }
      return best;
    };
    let best = scan(lo, hi);
    /* круглой цели в окне нет (класс хуже o.loose[1]) — окно открывается раньше, с o.loose[0] дней после прошлого: ступень ближе, зато
       число круглее; берём раннюю, только если её класс лучше */
    if (o.loose && (!best || best.k > o.loose[1]) && prev + o.loose[0] < lo) { const b2 = scan(Math.min(prev + o.loose[0], hi), hi); if (b2 && (!best || b2.k < best.k)) best = b2; }
    if (!best) best = scan(prev + 1, Math.min(prev + gmax, next - 1, e));
    if (!best) { err.push(`блок цикла ${ROMAN[o.c]}: после ${prev}-го дня нет ни одной гибкой ступени до ${Math.min(prev + gmax, next - 1, e)}-го — счётчики серий стоят или ступени серий кончились`); break; }
    out.push({ key: best.S.key, goal: best.c.G, day: best.c.day });
    used[best.S.key] = best.n + 1; last[best.S.key] = best.c.G; prev = best.c.day;
  }
  return { steps: out, err };
}

/* ================== законы каталога ==================
   Считаются по собранным данным экрана (EN_WANDERER.ach: list, kinds, metrics, blocks, pace) — одна функция для сборщика, автопроверки
   check_wanderer.js и её мутаций. Итог: { err: [{ k — закон, m — что не так }], worst: { цикл: [с дня, по день] — самая длинная пауза } }.
   Б1 — у каждого цикла III–VI свой блок: серии и таинственные в числе BLOCKS.myst.
   Б2 — сколько достижений каталога, без таинственных, обычный берёт за цикл: не меньше BLOCKS.need.
   Б3 — кривая: в цикле I и каждый день цикла II — достижение у обоих профилей; у обычного пауза не длиннее порога: ранние отрезки цикла III
        (PACE.curve.gaps) и порог своего цикла (PACE.curve.pause) до первого дня следующего; в первый день циклов IV–VI — достижение.
   Б4 — потолки: сумма вида у вех начала пути — не выше cap, в блоке цикла — не выше blk; blk класса — не выше BLOCKS.capCls.
   Б5 — пассивки — фарм и экономика: в тексте вида нет слов боя и рейтинга, класс вида известен.
   Б6 — цикл «для команды»: достижения его блока помечены team, остальные — нет.
   Б7 — спойлеры: в именах, условиях и подсказках блоков, которые видит игрок, нет ни одного слова лестницы (spoil — lore/ladder.js).
   Б8 — счётчик достижения блока — своего цикла; у вех начала пути счётчик без цикла.
   Б9 — условий, которые покупает Энериум, нет: счётчик не покупается, в условии нет прокруток и покупок. */
const LAW_COMBAT = /урон|атак|защит|здоров|крит|уклон|скорост|мощ|раунд|рейтинг|побед|очк\S* (?:эхо|арен|лиг|событ|клан|недел)/i;
const LAW_BUY = /энериум|прокрут|донат|за деньги|за рубл/i;
const LAW_CLS = ['money', 'chance', 'narrow', 'count'];
function laws(D, spoil) {
  const out = [], say = (k, m) => out.push({ k, m }), worst = {};
  const L = D.list, KD = D.kinds, B = D.blocks, PC = D.pace, start = PC.start, H = PC.horizon, cur = PC.curve, R = c => ROMAN[c];
  const cycO = d => { let c = 1; for (let k = 2; k <= 6; k++) if (d >= start[k]) c = k; return c; };
  const model = L.filter(a => !a.est);
  /* Б1 */
  for (let c = 3; c <= 6; c++) {
    if (!B.cycles.includes(c)) { say('Б1', `у цикла ${R(c)} нет блока`); continue; }
    const own = L.filter(a => a.c === c), my = own.filter(a => a.cat === 'myst').length;
    if (!own.some(a => a.cat !== 'myst')) say('Б1', `блок цикла ${R(c)}: нет ни одной серии`);
    if (my < B.myst[0] || my > B.myst[1]) say('Б1', `блок цикла ${R(c)}: таинственных ${my}, нужно от ${B.myst[0]} до ${B.myst[1]}`);
  }
  for (const a of L) if (a.c != null && !B.cycles.includes(a.c)) say('Б1', `${a.id}: блок цикла ${a.c}, а такого блока нет`);
  /* Б2 */
  for (const [c, n] of Object.entries(B.need)) {
    const k = model.filter(a => a.at.o != null && cycO(a.at.o) === +c).length;
    if (k < n) say('Б2', `в цикле ${R(+c)} обычный берёт ${k} достижений, нужно не меньше ${n}`);
  }
  /* Б3 */
  for (const pr of ['o', 'e']) {
    const miss = []; for (let d = cur.daily[0]; d <= cur.daily[1]; d++) if (!model.some(a => a.at[pr] === d)) miss.push(d);
    if (miss.length) say('Б3', `${pr === 'o' ? 'обычный' : 'увлечённый'}: дни без достижений в цикле I–II — ${miss.join(', ')}`);
  }
  const has = new Set(model.filter(a => a.at.o != null).map(a => a.at.o));
  const gapOf = (a, b, tail) => {   // дни с достижением от a − 1 (пауза считается и от последнего дня прошлого отрезка) до b; хвост — до дня tail
    const ds = []; for (let d = a - 1; d <= b; d++) if (has.has(d)) ds.push(d);
    if (!ds.length) return null;
    let w = [ds[0], ds[0]]; for (let i = 1; i < ds.length; i++) if (ds[i] - ds[i - 1] > w[1] - w[0]) w = [ds[i - 1], ds[i]];
    if (tail - ds[ds.length - 1] > w[1] - w[0]) w = [ds[ds.length - 1], tail];
    return w;
  };
  let earlyEnd = cur.daily[1];
  for (const [a, b, max] of cur.gaps) {
    earlyEnd = Math.max(earlyEnd, b);
    const w = gapOf(a, b, b);
    if (!w) say('Б3', `обычный: с ${a}-го по ${b}-й день нет ни одного достижения`);
    else if (w[1] - w[0] > max) say('Б3', `обычный: пауза ${w[1] - w[0]} дней — с ${w[0]}-го по ${w[1]}-й, на отрезке ${a}–${b} больше ${max}`);
  }
  for (const [cs, max] of Object.entries(cur.pause)) {
    const c = +cs, a = Math.max(start[c], earlyEnd + 1), b = c === 6 ? H : start[c + 1] - 1;
    if (a === start[c] && !has.has(a)) say('Б3', `обычный: в первый день цикла ${R(c)} нет достижения — пауза цикла считается от входа в него`);
    const w = gapOf(a, b, c === 6 ? H : start[c + 1]);   // хвост — до первого дня следующего цикла, у цикла VI — до конца прогона
    if (!w) { say('Б3', `обычный: в цикле ${R(c)} нет ни одного достижения`); continue; }
    worst[c] = w;
    if (w[1] - w[0] > max) say('Б3', `обычный: пауза ${w[1] - w[0]} дней в цикле ${R(c)} — с ${w[0]}-го по ${w[1]}-й день, порог цикла — ${max}`);
  }
  /* Б4 и Б5 */
  const sumOld = {}, sumB = {};
  for (const a of L) {
    if (!KD[a.pk]) { say('Б5', `${a.id}: вида пассивки «${a.pk}» нет`); continue; }
    if (a.c == null) sumOld[a.pk] = (sumOld[a.pk] || 0) + a.v;
    else { const s = sumB[a.c] = sumB[a.c] || {}; s[a.pk] = (s[a.pk] || 0) + a.v; }
  }
  for (const [k, s] of Object.entries(sumOld)) if (s > KD[k].cap) say('Б4', `вехи начала пути, «${KD[k].n}»: сумма ${s} больше потолка ${KD[k].cap}`);
  for (const [c, S] of Object.entries(sumB)) for (const [k, s] of Object.entries(S)) if (s > KD[k].blk) say('Б4', `блок цикла ${R(+c)}, «${KD[k].n}»: сумма ${s} больше потолка блока ${KD[k].blk}`);
  for (const [k, K] of Object.entries(KD)) {
    const lim = B.capCls[K.cls];
    if (lim != null && K.blk > lim) say('Б4', `«${K.n}»: потолок блока ${K.blk} больше потолка класса — ${lim}`);
    if (!LAW_CLS.includes(K.cls)) say('Б5', `«${K.n}»: неизвестный класс вида «${K.cls}»`);
    if (LAW_COMBAT.test([K.n].concat(K.t).join(' '))) say('Б5', `«${K.n}»: в тексте вида — слово боя или рейтинга; пассивки достижений — фарм и экономика (§29)`);
  }
  /* Б6 */
  for (const a of L) {
    const team = a.c != null && B.team.includes(a.c);
    if (team && !a.team) say('Б6', `${a.id}: блок цикла ${R(a.c)} — только для команды, а пометки нет`);
    if (!team && a.team) say('Б6', `${a.id}: пометка «для команды» вне цикла для команды`);
  }
  /* Б7 */
  if (spoil) for (const a of L) {
    if (a.c == null || a.team) continue;
    const hit = spoil([a.n, a.d, a.hint || ''].join(' · '));
    if (hit.length) say('Б7', `${a.id} «${a.n}»: слово лестницы спойлеров — ${hit.join(', ')}; в блоках циклов III–V их нет совсем`);
  }
  /* Б8 и Б9 */
  for (const a of L) {
    const M = D.metrics[a.m];
    if (a.cat !== 'myst') {
      if (!M) { say('Б8', `${a.id}: счётчик «${a.m}» не описан`); continue; }
      if (a.c != null && M.c !== a.c) say('Б8', `${a.id}: блок цикла ${R(a.c)}, а счётчик «${a.m}» — ${M.c ? 'цикла ' + R(M.c) : 'общий'}`);
      if (a.c == null && M.c != null) say('Б8', `${a.id}: веха начала пути берёт счётчик блока цикла ${R(M.c)}`);
    }
    if (LAW_BUY.test(a.d)) say('Б9', `${a.id} «${a.n}»: условие покупается — «${a.d}»`);
  }
  return { err: out, worst };
}

module.exports = { run, dayOf, rarityOf, blockRarity, slotBlock, blockMetrics, laws, calendar, byCycle, PROF, ROMAN, leagueAt, leagueOpen, leagueOf, goldHeroesOf, echoKitOf };
