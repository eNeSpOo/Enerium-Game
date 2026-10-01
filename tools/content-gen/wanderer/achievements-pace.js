/* Темп достижений — прогон по калькуляторам экономики (черновик). Когда обычный (3 ч в день), увлечённый (8 ч) и плательщик при времени
   обычного получают каждое достижение каталога achievements.js, кривая получения по дням и итог наград.
   Источники — только данные, этот файл их не меняет:
   - tools/content-gen/contracts/capacity.json — средний день циклов II–VI, все отряды (economy.py, sets.py, echo.py): этажи, элиты, боссы,
     цели Эхо, вершины лестницы по неделям, забегов одновременно, золото и дух;
   - tools/content-gen/wanderer/pace-inputs.json — мост к sets.py и economy.py (pace_inputs.py): обучение, победы у рунных стражей
     по циклам, дни до рун на пределы, герои за золото по дням, вход к стражам;
   - design/ui/contracts.js — ёмкость занятий дня (caps: рецепты, изделия, ритуалы, Арена, Лига, клан, прах) и исполнение контрактов
     (econ: доля дней с исполненным дневным и недельным), дни без игры обычного — прогон контрактов (SIM);
   - tools/content-gen/biomes/pace.json — прогон ядра: в какой день цикла II пали боссы биомов и откуда пришёл второй биом;
   - design/ui/lootboxes.js — недельные сундуки режимов (осколки Эхо, шарды рабочих, талисманы, снаряжение), допущения assume,
     строки режима «Достижения» и ожидаемое содержимое сундука странника ev.wander;
   - design/ui/arena.js — прогон Арены и Лиги: победы за неделю у обычного, увлечённого и плательщика, цикл и порог героев Лиги;
   - design/ui/rituals.js — прогон ритуалов: завершённых в день по циклу у каждого профиля, цикл открытия;
   - design/ui/event.js — очки События за неделю у каждого профиля и пороги личных планок цикла;
   - design/ui/echo-rules.js — шанс Многоликого при призыве; design/ui/recipes.js — доля рецептов героев, шанс уникального ресурса босса;
   - design/ui/roster.js — героев за золото по циклам (потолок покупки); артефакты — из сборки wanderer.js (цикл открытия, уровни).
   Модель каждого счётчика — METRICS[m].model и PACE в achievements.js: числа там, здесь только алгоритм. Счёт целочисленный:
   значения счётчиков — × 100, день — целый. День 0 — цикл I (обучение, ~4 ч), день 1 — первый день цикла II. */
'use strict';

const PROF = ['o', 'e', 'p'];                           // обычный, увлечённый, плательщик при времени обычного
const RATE_OF = { o: 'o', e: 'e', p: 'o' };             // чьи ставки берёт профиль
const LB_OF = { o: 'free', e: 'fan', p: 'free' };       // чей недельный сундук
const PACE_NAME = { o: 'обычный', e: 'увлечённый', p: 'обычный' };   // имена профилей в pace.json биомов

/* Лига открыта в день d — одно правило для счётчика league и для калькуляторов (leagueOpen): цикл не ниже rule.from и героев в коллекции
   не меньше rule.heroes (правило — tools/content-gen/arena/rules.js, league; H — счётчик heroes × 100) */
const leagueAt = (cyc, H, rule, d) => cyc(d) >= rule.from && H[d] >= rule.heroes * 100;

/* значение по циклу: запись с наибольшим ключом не больше c; нет — null */
function byCycle(obj, c) {
  let best = -1, v = null;
  for (const [k, x] of Object.entries(obj || {})) if (+k <= c && +k > best) { best = +k; v = x; }
  return v;
}

/* прогон: { start, len, cyc, H, val: { профиль: { счётчик: [×100 по дням] } }, err } */
function run(A, src) {
  const P = A.PACE, H = P.horizon, CAP = src.cap, LB = src.lb, SIM = src.ctSim, err = [];
  /* длины циклов у обычного — capacity.json (cycleDays: цикл II — прогон темпа, III–VI — калькулятор подъёма, сроки автора ADR-0043);
     нет записи цикла — lenLate */
  const len = { 1: 0 };
  for (let c = 2; c <= 6; c++) len[c] = CAP.cycleDays[String(c)] ? +CAP.cycleDays[String(c)] : P.lenLate;
  const start = { 1: 0, 2: 1 };
  for (let c = 3; c <= 6; c++) start[c] = start[c - 1] + len[c - 1];
  const cyc = d => { let c = 1; for (let k = 2; k <= 6; k++) if (d >= start[k]) c = k; return c; };
  const days = Array.from({ length: H + 1 }, (_, d) => d);
  const IN = src.inputs, CT = src.ct;
  const shareBp = [IN.limitShareBp, 10000 - IN.limitShareBp];   // доли побед у стражей пределов и доблести
  const I = Object.assign({}, IN.cycleI, P.i);                  // цикл I: калькулятор и сценарий уровней 1–10
  const uniqueBp = src.uniqueBp, manyBp = src.manyBp;
  const heroShare = [src.heroRecipes, src.allRecipes];

  /* заготовки рядов: поток в день и в неделю (×100), ступенька по событиям */
  const flow = (perDay, i100) => { const a = []; let s = i100; for (const d of days) { if (d) s += perDay(d); a.push(s); } return a; };
  const flowWeek = (perWeek, i100) => { const a = []; let num = 0; for (const d of days) { if (d) num += perWeek(d); a.push(i100 + Math.floor(num / 7)); } return a; };
  const steps = ev => days.map(d => ev.reduce((v, [at, x]) => (at <= d && x > v ? x : v), 0));   // ev: [[день, значение × 100]]
  /* недели от начала цикла II: номер недели, её последний день и цикл */
  const weeks = [];
  for (let w = 0; start[2] + 7 * w + 6 <= H; w++) { const end = start[2] + 7 * w + 6; weeks.push({ w, end, c: cyc(end), k: Math.floor((end - start[cyc(end)]) / 7) }); }
  /* второй биом цикла: с какого дня, когда пал босс; цикл II — pace.json, дальше — те же доли цикла */
  const PJ = src.paceBiomes;
  const biomeDays = (pr, c) => {
    const D = PJ && PJ.rows && PJ.rows.days && PJ.rows.days[PACE_NAME[pr]];
    if (!D) { err.push(`pace.json: нет дней профиля «${PACE_NAME[pr]}»`); return null; }
    const b = ['b3', 'b4'].map(id => D[id]);
    if (b.some(x => !x || !x.boss)) { err.push('pace.json: у биомов цикла II нет дня босса'); return null; }
    const scale = x => (c === 2 ? x : start[c] - 1 + Math.ceil((x - start[2] + 1) * len[c] / len[2]));
    return { bossA: scale(b[0].boss.day), bossB: scale(b[1].boss.day), fromB: scale(b[1].from), siegeA: b[0].boss.runs > 1 || c > 2 };
  };

  const val = {};
  for (const pr of PROF) {
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
    const needBd = Object.values(A.METRICS).some(M => M.model.k === 'biomes' || M.model.k === 'siege');
    const bd = {}; if (needBd) for (let c = 2; c <= 6; c++) bd[c] = biomeDays(pr, c);
    if (needBd && Object.values(bd).some(x => !x)) return { err };

    for (const [m, M] of Object.entries(A.METRICS)) {
      const md = M.model, from = md.from || 2;
      if (md.cap) V[m] = flow(capDay(md.cap), iOf(m));
      else if (md.ct) V[m] = flow(ctDay(md.ct, md.bp, m, from), iOf(m));
      else if (md.rate) V[m] = flow(d => { const c = cyc(d); return c >= from ? Math.floor(byCycle(md.rate[rp], c) * pay(m) / 10000) : 0; }, iOf(m));
      else if (md.week) V[m] = flowWeek(d => { const c = cyc(d); return c >= from ? byCycle(md.week[rp], c) : 0; }, iOf(m));
      else if (md.lb) {   // capPerCycle — не больше стольких за каждый открытый цикл, начиная с from (героев Эхо — по одному на расу)
        const div = typeof md.div === 'string' ? LB.assume[md.div] : md.div || 1;
        V[m] = flowWeek(d => { const c = cyc(d); if (c < from) return 0; return md.lb.reduce((s, [mode, key]) => s + ((LB.week[mode][c] || {})[lbk] || {})[key] || 0, 0) / div; }, iOf(m));
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
        V[m] = days.map(d => ev.reduce((s, [at, x]) => (at <= d ? s + x : s), 0) * 100);
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
  return { start, len, cyc, H, val, weeks, err };
}

/* ================== Лига: когда открыта — одно место для калькуляторов ==================
   Правило — в данных Арены (arena/rules.js, league: from — цикл рейтинга, heroes — порог разных героев, как на экране Лиги). Герои
   в коллекции по дням — счётчик heroes этого прогона: за золото (pace-inputs.json), герои Эхо из сундуков (lootboxes.js), донатный сет
   плательщика. Калькуляторы контрактов и События берут отсюда долю дней цикла с открытой Лигой, прогон достижений — тот же день.
   src — как у run, хватает cap, lb, inputs, goldHeroes. Итог: { day: { o, e, p }, share: { цикл: { o, e, p } } — б. п., err } */
/* героев за золото по циклам — потолок покупки в счётчике heroes (design/ui/roster.js, EN_ROSTER) */
const goldHeroesOf = RO => { const g = {}; for (const h of RO.heroes) if (h.src === 'gold') g[h.c] = (g[h.c] || 0) + 1; return g; };
function leagueOpen(A, src, rule) {
  const R = run({ METRICS: { echoHeroes: A.METRICS.echoHeroes, heroes: A.METRICS.heroes }, PACE: A.PACE }, src);
  if ((R.err && R.err.length) || !R.val) return { day: {}, share: {}, err: R.err && R.err.length ? R.err : ['прогон героев не собрался'] };
  return leagueOf(R, rule);
}
/* день открытия у профиля и доля дней цикла с открытой Лигой, б. п., — по готовому прогону со счётчиком heroes */
function leagueOf(R, rule) {
  const day = {}, share = {};
  for (const pr of PROF) { const H = R.val[pr].heroes, d = H.findIndex((_, i) => leagueAt(R.cyc, H, rule, i)); day[pr] = d < 0 ? null : d; }
  for (let c = 2; c <= 6; c++) {
    share[c] = {};
    for (const pr of PROF) {
      const s = R.start[c], L = R.len[c], d = day[pr], open = d == null ? 0 : Math.max(0, Math.min(L, s + L - Math.max(d, s)));
      share[c][pr] = L ? Math.floor(open * 10000 / L) : 0;
    }
  }
  return { day, share, err: [] };
}

/* день, когда счётчик m у профиля pr впервые не меньше goal; null — за горизонтом */
function dayOf(R, pr, m, goal) {
  const a = R.val[pr][m]; if (!a) return null;
  const i = a.findIndex(x => x >= goal * 100);
  return i < 0 ? null : i;
}

/* редкость по дню обычного: ступени PACE.rarDays; за горизонтом или вне модели — вневременная */
function rarityOf(P, d) {
  if (d == null) return 7;
  const i = P.rarDays.findIndex(x => d <= x);
  return i < 0 ? 7 : i + 1;
}

module.exports = { run, dayOf, rarityOf, byCycle, PROF, leagueAt, leagueOpen, leagueOf, goldHeroesOf };
