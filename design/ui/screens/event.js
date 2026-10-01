/* Энериум · прототип «Свет снизу» — «Неделя → Событие недели» (screens/event.js).
   Подключается после screens/model.js. Данные — design/ui/event.js (EN_EVENT и алгоритм EnEvent): собирает
   tools/content-gen/event/build.js, руками не править. Черновик для автора — docs/content/событие.md.
   Правила §27: метарежим недели расы — очки за дела по всей игре; три слоя наград — личные планки, клановые планки,
   межсерверные места игроков и кланов; главная награда — сундуки рабочих (§23). Магазина События в GDD нет.
   Регистрирует: SCREENS.event; листы OV.evrew (три слоя наград, вкладки — тот же лист с аргументом), OV.evsrc (источник очков);
   действие ACT.evdemo (кнопки команды); строку «Событие» в реестре WEEK_MODES (screens/week.js); раздел UI-кита через KIT_EXTRA;
   сценарии презентации. Глобал evPlanks — личные планки с сундуками (его зовут week.js и check_all.js); window.EN_EV — для проверки.
   Своё состояние — S.event (заводится как S.bag): очки недели, очки по источникам, сделанное по единицам, журнал «сервера».
   Сервер решает, клиент показывает: очки начисляет «сервер» EV_SRV по подтверждённому делу — операция с номером, повтор номера
   ничего не начисляет; после отсечки приём закрыт; дневные потолки одинаковы для всех. Дела в игре превращает в операции
   наблюдатель evObserve после каждой отрисовки: забеги, атаки Эхо, забранные ритуалы, исполненные контракты, Арена, клан, мастерская.
   Правила воздуха (ADR-0026): на карточке — не больше двух чисел, двух чипов и одного действия; подробности — в листах; значки — ICON.
   Служебное — только команде: TM, PL, tmT из index.html. Автопроверка — tools/content-gen/screens/check_event.js. */
(function () {
'use strict';

const EVD = window.EN_EVENT || null, EVA = window.EnEvent || null;

/* ================== данные экрана: вид и кнопки команды — демонстрация ================== */
const EV_VIEW = { chest: 30, top: 3, pastShift: 3, tickMs: 2000 };   // размер сундука, лидеров в листе, сдвиг имён прошлой недели, шаг наблюдателя
const EV_TEAM = { run: { floor: 35, elite: 7, boss: 1 }, echo: 'e', soonS: 10 };   // «+ забег», «+ атака Эхо» (ранг цели), «отсечка через 10 с»
const EV_T = { day: 24 * 3600, hour: 3600, days: 7, minMs: 60000, half: 30 };   // размерности: секунд в сутках и в часе, дней в неделе, мс в минуте, минут в получасе
const EV_NAMES = { me: 'Личные', clan: 'Клан', top: 'Места' };   // вкладки листа наград

/* ================== помощники ================== */
const EV_TABS = ['me', 'clan', 'top'];
const evOk = () => !!(EVD && EVA && window.EN_LOOTBOXES);
const evWk = () => (typeof rsWeek === 'function' ? rsWeek() : null) || (RS.weeks && RS.weeks[0]) || null;
const evRace = () => { const w = evWk(); return w ? w.race : ''; };
const evW = race => (EVD && EVD.weeks[race || evRace()]) || null;
const evOpen = (s = S) => !!EVD && s.acc.cycle >= EVD.from;
const evM = () => LBX.modes.event;
const evLy = id => evM().layers.find(l => l.id === id);
const evLeft = () => Math.max(0, Math.floor(S.week.left));
/* окно приёма недели в секундах: неделя без часа отсечки и часа подсчёта (§1.1) */
const evWindow = () => EV_T.days * EV_T.day - (EVD.cutoffH + EVD.countH) * EV_T.hour;
const evWord = n => plural(n, 'очко', 'очка', 'очков');
const evU = (k, n) => { const U = EVD.units[k]; return plural(n, U.u[0], U.u[1], U.u[2]); };
const evSrc = id => EVD.sources.find(x => x.id === id) || null;
const evPay = pay => pay.map(g => `${g.count > 1 ? g.count + ' × ' : ''}${lbBoxName(evM().box, g.r, g.win)}`).join(', ');
const evTop = pay => pay.reduce((a, g) => Math.max(a, g.r), 0);
const evChest = (pay, t) => pay.length ? `<span class="well itf ev-chest" data-r="${evTop(pay)}" style="--s:${EV_VIEW.chest}px" title="${trEsc(t ? t + ' · ' + evPay(pay) : evPay(pay))}">${chestPic(evM().box, evTop(pay))}</span>` : '';
/* сила коллекции РП1 (§10.3) — одна функция прототипа collRp (index.html): те же числа, что на экране «Герои» и в листе «Сила коллекции» */
function evRp1(s = S) {
  return EVA && typeof collRp === 'function' ? collRp(1, s) : 0;
}
/* доли и множители — из базисных пунктов целыми: 40 → «0,4 %», 15 000 → «×1,5» */
const evFrac = (v, den, digits) => { const i = Math.floor(v / den), f = v % den; return f ? `${i},${String(f).padStart(digits, '0').replace(/0+$/, '')}` : String(i); };
const evPct = bp => evFrac(bp, 100, 2) + ' %';
const evMul = bp => '×' + evFrac(bp, EVD.bp, 4);
const evHours = half => { const h = Math.floor(half / 2); return `${fmt(h)} ч${half % 2 ? ' 30 мин' : ''}`; };

/* единица с условием (gate) закрыта у аккаунта: «league» — Лига по одному правилу экранов Лиги и контрактов (leagueOpen, index.html) */
const evGateShut = (U, s = S) => U.gate === 'league' && !(typeof leagueOpen === 'function' && leagueOpen(s));

/* ================== состояние: S.event ==================
   Очки недели, очки по источникам, сделанное по единицам и журнал «сервера». Новый цикл или новая неделя — новый счёт.
   Демо-аккаунт — четвёртый день недели обычного игрока (EN_EVENT.demo, ADR-0031, п. 17): «сервер» уже подтвердил дела прошлых дней */
function evNew(s, empty) {
  const w = (RS.weeks || []).find(x => trNorm(x.gen) === trNorm(s.week.race)) || (RS.weeks || [])[0] || { race: '' };
  const E = { v: 1, race: w.race, cyc: s.acc.cycle, weekNo: 1, pts: 0, by: {}, cnt: {}, clan: { others: 0 }, demo: false,
    srv: { ops: {}, seq: 1, runs: {}, obs: null, day: { n: -1, used: {} } } };
  if (!evOk() || s.acc.cycle < EVD.from) return E;
  const D = EVD.demo.cyc[s.acc.cycle];
  if (D && !empty) {
    const rp = evRp1(s);
    for (const [k, n] of Object.entries(D.cnt)) {
      const U = EVD.units[k]; if (!U || (U.from && s.acc.cycle < U.from) || evGateShut(U, s)) continue;
      const p = EVA.pts(EVD, k, n, { race: E.race, rp1: rp });
      E.cnt[k] = n; E.pts += p; E.by[U.src] = (E.by[U.src] || 0) + p; E.srv.ops['demo:' + k] = p;
    }
    E.demo = true;
  }
  evClanSeed(E, s);
  return E;
}
/* клан в демо: очки остальных участников — «сервер» клана. Считаются под нынешний состав: клан заводит свой файл (screens/clan.js),
   поэтому состав сверяется при каждой сверке. Остальные к этому часу недели в среднем набрали столько же, сколько обычный игрок своего
   цикла (EN_EVENT.demo.cyc[цикл].pts), но играют не все — доля clanActiveBp (EN_EVENT.demo). Очки участника другого цикла — в очках цикла
   игрока, по первым личным порогам (ADR-0042, EnEvent.clanPts) */
function evClanKey(s) { const C = s.clan; return !C || C.in === false ? '' : `${C.n}|${(evMembers(s) || []).join('')}`; }
function evClanSeed(E, s) {
  const M = evMembers(s), mid = c => ((EVD.demo.cyc[c] || {}).pts || 0);   // очки обычного игрока цикла c к этому часу недели
  E.clan.key = evClanKey(s);
  const me = s.acc.cycle;
  E.clan.others = M && me >= EVD.from ? Math.floor((M.reduce((a, c) => a + EVA.clanPts(EVD, mid(c), c, me), 0) - mid(me)) * EVD.demo.clanActiveBp / EVD.bp) : 0;
}
/* циклы участников клана, «я» — цикл аккаунта: у клана screens/clan.js — поле cyc участника; без списка — число мест mem; без клана — null.
   Вступивший на этой неделе (weeks — 0) приносит очки клану со следующей недели — в пороги и очки клана он пока не входит (§25.3) */
function evMembers(s = S) {
  const C = s.clan;
  if (!C || C.in === false) return null;
  if (Array.isArray(C.members) && C.members.length) {
    const i = Math.max(0, C.members.findIndex(m => m && m.me)), out = [];
    C.members.forEach((m, j) => { if (j === i) out.push(s.acc.cycle); else if (m && m.weeks !== 0) out.push(Number.isInteger(m.cyc) ? m.cyc : s.acc.cycle); });
    return out;
  }
  return Array(Math.max(1, C.mem || 1)).fill(s.acc.cycle);
}
/* сверка: цикл аккаунта или неделя сменились — «сервер» ведёт новый счёт; место недели — в общем списке мест S.ranks */
function evSync() {
  if (!S) return null;
  if (!S.event || S.event.v !== 1 || S.event.cyc !== S.acc.cycle || S.event.race !== evRace()) S.event = evNew(S);
  if (evOk() && S.event.clan.key !== evClanKey(S)) evClanSeed(S.event, S);
  evRank(S);
  return S.event;
}

/* ================== планки, клан, места ================== */
/* личные планки: пороги цикла из данных, сундук каждой — строка планки EN_LOOTBOXES.modes.event цикла игрока */
function evPlanks() {
  if (!evOk() || !S.event) return [];
  const c = S.acc.cycle, ly = evLy('me'), pts = S.event.pts;
  return (c >= EVD.from ? EVA.planks(EVD, c) : []).map((need, i) => {
    const row = ly && ly.rows[i], got = pts >= need;
    return { k: i + 1, need, box: evM().box, pay: row ? row.cyc[c] || [] : [], got, reached: got };
  });
}
window.evPlanks = evPlanks;
/* клан (ADR-0042): очки — сумма очков участников, у других циклов — в очках цикла игрока по первым личным порогам; планка k — участников ×
   первый порог цикла игрока × clanX[k] / 100. Так планки и место клана у всех участников одни, в каком бы цикле каждый ни смотрел.
   Остальные участники в демо — в среднем чуть выше своего третьего порога (EN_EVENT.demo). Без клана — null */
function evClan() {
  const M = evMembers(); if (!M) return null;
  const c = S.acc.cycle, needs = EVA.clanPlanks(EVD, M, c), ly = evLy('clan'), pts = S.event.pts + S.event.clan.others;
  return { n: M.length, cycles: M, needs, pts, mine: S.event.pts, rows: needs.map((need, i) => ({ k: i + 1, need, pay: ly && ly.rows[i] ? ly.rows[i].cyc[c] || [] : [], got: pts >= need })) };
}
/* опоры рейтинга цикла: игроки — доли пятой личной планки, кланы — доли суммы пятых планок клана из clanRef участников */
function evAnchors(kind, c = S.acc.cycle) {
  const P = EVA.planks(EVD, c), P5 = P[P.length - 1] || 0;
  return kind === 'clan' ? EVA.anchorsOf(EVD.top.clans, P5 * EVD.top.clanRef) : EVA.anchorsOf(EVD.top.players, P5);
}
const evPlace = (v = S.event ? S.event.pts : 0, c = S.acc.cycle) => v > 0 ? EVA.place(evAnchors('me', c), v) : null;
/* место в Событии — одно число: считает «сервер» по очкам недели, S.ranks и все экраны (профиль, «Дары», Неделя, рейтинг) берут его
   отсюда (ADR-0031, п. 17). s — состояние: и живое, и заготовка initialState */
function evRank(s) {
  const r = (s.ranks || []).find(x => x[0] === 'Событие');
  if (r && evOk()) r[1] = evOpen(s) && s.event ? evPlace(s.event.pts, s.acc.cycle) : null;
}
const evClanPlace = v => v > 0 ? EVA.place(evAnchors('clan'), v) : null;
/* лидеры: имена по кругу, очки — опоры рейтинга на своих местах; прошлая неделя — имена со сдвигом */
function evLeaders(kind, n, past) {
  const A = evAnchors(kind), names = kind === 'clan' ? EVD.top.clanNames : EVD.top.names, sh = past ? EV_VIEW.pastShift : 0;
  return Array.from({ length: n }, (_, i) => [names[(i + sh) % names.length], EVA.pointsAt(A, i + 1)]);
}
/* выплата за место, если неделя кончится сейчас: наименьший «топ-N», куда место входит */
function evTier(place, clan) {
  const ly = evLy(clan ? 'clanTop' : 'top'), c = S.acc.cycle;
  if (!ly || !place) return null;
  const row = ly.rows.filter(r => r.top && place <= r.top).sort((a, b) => a.top - b.top)[0];
  return row ? { label: row.label, one: ly.one, pay: row.cyc[c] || [] } : null;
}
/* прошлая неделя — та, за которую платят «Дары» (bag.js): взятые планки, место; очки — порог взятой и доля пути к следующей */
function evPast() {
  const c = S.acc.cycle, needs = EVA.planks(EVD, c);
  const rows = typeof darRows === 'function' && S.zp ? darRows(S, 'prev').filter(p => p.id === 'event') : [];
  const k = rows.length ? rows.filter(p => p.kind === 'plank').length : (evM().typical.free.me || 0);
  const lo = k ? needs[Math.min(k, needs.length) - 1] : 0, hi = k < needs.length ? needs[k] : lo * 2;
  const pts = lo + Math.floor((hi - lo) * EVD.demo.pastFracBp / EVD.bp), pr = rows.find(p => p.kind === 'place' && p.place);
  return { pts, place: pr ? pr.place : evPlace(pts), rows };
}

/* ================== «сервер» События ==================
   credit(op, unit, n) — одна операция с номером: проверка, дневной потолок, очки, запись в журнал. Ответ: { ok, pts, n } — начислено;
   { again, pts } — повтор номера, ничего не меняет; { refuse } — отказ без изменений: нет данных, цикл, приём закрыт, единица */
const EV_SRV = {
  /* номер дня недели для дневных потолков: сколько суток прошло от начала приёма */
  day() { return Math.max(0, Math.floor((evWindow() - evLeft()) / EV_T.day)); },
  credit(op, unit, n) {
    const E = evSync();
    if (!evOk() || !E) return { refuse: 'data' };
    if (E.srv.ops[op] != null) return { again: true, pts: E.srv.ops[op] };
    const U = EVD.units[unit];
    if (!U || !(n > 0) || !Number.isInteger(n)) return { refuse: 'unit' };
    if (S.acc.cycle < EVD.from || (U.from && S.acc.cycle < U.from)) return { refuse: 'cycle' };
    if (evGateShut(U)) return { refuse: 'gate' };   // матч Лиги без открытой Лиги не бывает: правило Арены
    if (!evLeft()) return { refuse: 'closed' };
    const d = EV_SRV.day(); if (E.srv.day.n !== d) E.srv.day = { n: d, used: {} };
    const k = Math.min(n, EVA.room(EVD, unit, E.srv.day.used[unit]));
    const was = EVA.reached(EVA.planks(EVD, S.acc.cycle), E.pts);
    const p = k > 0 ? EVA.pts(EVD, unit, k, { race: E.race, rp1: evRp1() }) : 0;
    E.srv.ops[op] = p; E.srv.seq++;
    if (k > 0) { E.srv.day.used[unit] = (E.srv.day.used[unit] || 0) + k; E.cnt[unit] = (E.cnt[unit] || 0) + k; }
    if (p > 0) { E.pts += p; E.by[U.src] = (E.by[U.src] || 0) + p; evRank(S); }   // место — сразу по новым очкам
    const now = EVA.reached(EVA.planks(EVD, S.acc.cycle), E.pts);
    return { ok: true, pts: p, n: k, cut: n - k, plank: now > was ? now : 0 };
  },
  /* новая неделя: счёт с нуля, журнал — новый; клан начинает с демо-вклада остальных участников */
  next() {
    const E = evSync(); if (!E) return;
    S.event = Object.assign(evNew(S, true), { weekNo: E.weekNo + 1 });
  },
};

/* ================== наблюдатель: дела в игре → операции «сервера» ==================
   В игре очки начисляет сервер по журналу подтверждённых операций. Здесь — по состоянию прототипа после каждой отрисовки.
   Номер операции — от самого дела: забег и этажи, атака Эхо и её номер, ритуал, период контракта, операция мастерской.
   У Арены и клана своих номеров нет — номер ведёт журнал События. Сделанное до отсечки засчитано, после — нет */
function ritMin(s) {
  if (!s) return 0;
  /* время по карточке: у ритуалов screens/rituals.js — nominal в мс (ms — уже с ускорением рабочих); иначе — сетка recipes.js */
  const ms = Number.isInteger(s.nominal) ? s.nominal : Number.isInteger(s.ms) ? s.ms : 0;
  if (ms > 0) return Math.floor(ms / EV_T.minMs);
  const R = RX.drops && RX.drops.rituals; if (!R) return 0;
  if (s.unique) return R.workers.unique.minutes;
  const T = s.kind === 'hero' ? R.heroes : R.workers;
  return T && T.minutes ? T.minutes[(s.r || 1) - 1] || 0 : 0;
}
function evSnap() {
  const rit = {};
  for (const s of (S.rituals && S.rituals.slots) || []) if (s && s.uid) rit[s.uid] = { st: s.st, half: Math.floor(ritMin(s) / EV_T.half) };
  const C = S.contracts, Ar = S.arena, Lg = Ar && Ar.lg;
  return { rit,
    ct: C && C.day && C.week ? { d: [C.day.st, C.dayNo, (C.day.tasks || []).length], w: [C.week.st, C.weekNo, (C.week.tasks || []).length] } : null,
    /* Арена: счётчик побед сезона, если он есть (screens/arena.js), иначе — попытки и рейтинг; Лига — счётчик побед матчей */
    arena: Ar ? [Ar.att, Ar.rating, Number.isInteger(Ar.wins) ? Ar.wins : null, Ar.season || 0] : null, league: Lg && Number.isInteger(Lg.wins) ? Lg.wins : null,
    clan: S.clan && S.clan.boss ? S.clan.boss.att : null };
}
let evBusy = false;
function evObserve() {
  if (evBusy || !S || !evOk()) return;
  const E = evSync(); if (!E || S.acc.cycle < EVD.from) return;
  evBusy = true;
  try {
    const got = [], C = (op, unit, n) => { if (n > 0) { const r = EV_SRV.credit(op, unit, n); if (r.ok && r.plank) got.push(r.plank); } };
    /* забеги: этажи и элиты — по высокой отметке забега, босс и страж — по итогу */
    for (const R of S.runs || []) {
      if (R.kind) continue;
      const L = E.srv.runs[R.id] || (E.srv.runs[R.id] = { fl: 0, end: '' }), fl = R.guard ? 0 : (R.curve || []).length;
      if (fl > L.fl) {
        const B = EB.BIOMES[R.biome]; let el = 0;
        for (let f = R.startFloor + L.fl; f < R.startFloor + fl; f++) if (B && B.floors[f - 1] && B.floors[f - 1].g === 'e') el++;
        C(`run:${R.id}:fl:${L.fl}-${fl}`, 'floor', fl - L.fl); C(`run:${R.id}:el:${L.fl}-${fl}`, 'elite', el);
        L.fl = fl;
      }
      const end = R.end ? R.end.kind : '';
      if (end && !L.end) { L.end = end; if (end === 'boss') C(`run:${R.id}:boss`, 'boss', 1); if (end === 'guardWin') C(`run:${R.id}:guard`, 'guard', 1); }
    }
    /* Эхо: последняя атака — её цель и номер; очки — раунды атаки по рангу цели */
    const A = S.ech && S.ech.last;
    if (A && A.uid) C(`echo:${A.uid}:${A.no}`, 'echoRound', EVD.echoRounds[A.g] || EVD.echoRounds.o);
    /* мастерская: операции стола и автодокрафта с номером; предметы — под дневным потолком, новый рецепт — отдельно */
    for (const [op, res] of Object.entries((S.ws && S.ws.ops) || {})) {
      if (!res || E.srv.ops['craft:' + op] != null) continue;
      E.srv.ops['craft:' + op] = 0;
      if (res.kind === 'made' || res.kind === 'make') { C(`craft:${op}:i`, 'craftItem', res.out || 0); if (res.isNew) C(`craft:${op}:r`, 'recipe', 1); }
    }
    const now = evSnap(), was = E.srv.obs; E.srv.obs = now;
    if (was) {
      /* ритуал: был готов — награду забрали; очки — за его время по карточке */
      for (const [uid, x] of Object.entries(was.rit)) if (x.st === 'ready' && (!now.rit[uid] || now.rit[uid].st !== 'ready')) C(`ritual:${uid}`, 'ritualHalf', x.half);
      /* контракт исполнен: сделаны все задания; пустой — не в счёт */
      if (now.ct) for (const t of ['d', 'w']) { const [st, no, n] = now.ct[t]; if ((st === 'done' || st === 'paid') && n > 0) C(`contract:${t}:${no}`, t === 'd' ? 'contractD' : 'contractW', 1); }
      /* Арена: новые победы сезона — каждая своим номером; без счётчика — атака потрачена и рейтинг вырос */
      if (now.arena && was.arena) {
        const [a1, r1, w1, s1] = now.arena, [a0, r0, w0] = was.arena;
        if (w1 != null && w0 != null) { for (let w = w0 + 1; w <= w1; w++) C(`arena:${s1}:${w}`, 'arenaWin', 1); }
        else if (a1 < a0 && r1 > r0) C(`arena:#${E.srv.seq}`, 'arenaWin', 1);
      }
      /* Лига: выигранные матчи сезона */
      if (now.league != null && was.league != null) for (let w = was.league + 1; w <= now.league; w++) C(`league:${now.arena ? now.arena[3] : 0}:${w}`, 'leagueWin', 1);
      /* клан: потраченные атаки общего кошелька */
      if (now.clan != null && was.clan != null && now.clan < was.clan) C(`clan:#${E.srv.seq}`, 'clanAtk', was.clan - now.clan);
    }
    if (got.length && typeof toast === 'function' && S.route !== 'battle') toast(`Событие: планка ${Math.max(...got)} взята — сундук в «Дарах»`, CHEST);
  } finally { evBusy = false; }
}
if (typeof addEventListener === 'function') {
  addEventListener('en-render', () => { evObserve(); });
  /* сбор ритуала (screens/rituals.js): сразу, не дожидаясь отрисовки; номер — тот же, что у наблюдателя, дважды не засчитается */
  addEventListener('en-ritual', e => { const x = e && e.detail; if (x && x.uid && evOk() && S && S.event) EV_SRV.credit(`ritual:${x.uid}`, 'ritualHalf', Math.floor(ritMin(x) / EV_T.half)); });
}
if (typeof setInterval === 'function') setInterval(() => { if (S && S.event) evObserve(); }, EV_VIEW.tickMs);

/* ================== экран ================== */
/* шапка: тема недели, мои очки, ближайшая планка и её сундук; одно действие — «Награды» */
function heroHtml() {
  const E = S.event, w = evWk(), W = evW(), P = evPlanks(), nx = P.find(p => !p.got), L = evLeft();
  const art = window.EN_ECHO && EN_ECHO.arena ? EN_ECHO.arena(w.race) : null;
  const prev = nx ? P.filter(p => p.need < nx.need).reduce((a, p) => Math.max(a, p.need), 0) : 0;
  const pct = nx ? Math.max(0, Math.min(100, Math.floor((E.pts - prev) * 100 / Math.max(1, nx.need - prev)))) : 100;
  const line = !L ? `<span class="ev-why">${ic('hour')}Приём закрыт — идёт подсчёт</span>`
    : nx ? `<span class="ev-why">до следующей планки — ещё <b class="num">${fmt(nx.need - E.pts)}</b></span>` : `<span class="ev-why ok">${ic('check')}все планки недели взяты</span>`;
  return `<div class="pnl ev-hero">
    <div class="ev-ban">${art ? `<img class="ev-art" src="${art}" alt="">` : ''}<div class="ev-id"><span class="eyebrow">Событие недели</span><b class="serif">${W ? W.n : 'Событие'}</b><small>Неделя ${w.gen} · ${w.civ}</small></div></div>
    <div class="ev-body">
      <div class="ev-pts"><b class="num">${fmt(E.pts)}</b><small>${evWord(E.pts)} за неделю</small></div>
      <div class="ev-next">${bar(pct, nx ? '' : 'sp')}${nx ? evChest(nx.pay, 'Планка ' + nx.k) : ''}</div>
      ${line}
      <div class="ev-foot">${W ? `<span class="chip spirit ev-acc" title="${trEsc(W.line)}">${ic('spark')}<span>Акцент — ${W.an}</span></span>` : ''}<button class="btn go ev-rew" data-a="sheet" data-v="evrew:me">Награды ${ic('chev')}</button></div>
    </div></div>`;
}
/* рейтинг: лидер и я — весь блок открывает лист «Рейтинг» */
function rankHtml() {
  const lead = evLeaders('me', 1)[0], pl = evPlace();
  return `<button class="pnl ev-rank" data-a="sheet" data-v="rank:Событие" aria-label="Рейтинг Событий: лидеры и ваше место">
    <span class="eyebrow">Рейтинг · цикл ${ROMAN[S.acc.cycle]}</span>
    <span class="ev-rk">${ic('crown')}<span class="ev-rkn">${trEsc(lead[0])}</span><b class="num">${fmt(lead[1])}</b></span>
    <span class="ev-rk me">${ic('users')}<span class="ev-rkn">Вы</span>${pl ? `<span class="ev-rkp">место <b class="num">${fmt(pl)}</b></span>` : '<span class="ev-rkp">пока без места</span>'}</span>
  </button>`;
}
/* где брать очки: строка — источник, что засчитывается, очки этой недели; строка — лист, «›» — прямо в режим */
function srcRow(x) {
  const E = S.event, W = evW(), acc = W && W.accent.units.some(k => EVD.units[k] && EVD.units[k].src === x.id), v = E.by[x.id] || 0;
  return `<div class="ev-row${acc ? ' acc' : ''}" data-src="${x.id}">
    <button class="ev-main" data-a="sheet" data-v="evsrc:${x.id}" aria-label="${trEsc(`${x.n}: ${v} ${evWord(v)} за неделю — подробности`)}"><img class="ev-pic" src="${PATH(x.p)}" alt="">
      <span class="ev-tx"><b>${x.n}</b><small>${x.what}</small></span>${acc ? `<span class="chip spirit ev-x" title="Акцент недели">${evMul(W.accent.bp)}</span>` : ''}<b class="num ev-v">${v ? fmt(v) : '—'}</b></button>
    <button class="iconbtn ev-go" data-a="go" data-v="${x.go}" aria-label="Открыть «${x.n}»" title="Открыть">${ic('chev')}</button>
  </div>`;
}
function srcHtml(team) {
  return `<div class="pnl ev-src"><div class="ev-sh"><span class="eyebrow">Где брать очки</span><small>за эту неделю</small></div>
    <div class="ev-rows">${EVD.sources.map(srcRow).join('')}</div>${team || ''}</div>`;
}
/* команде: демо-кнопки и откуда числа */
function teamHtml() {
  const n = S.event.srv.seq;   // номер операции несёт кнопка: повторное нажатие того же номера ничего не начислит
  return TM(`<div class="row ev-team"><span class="eyebrow">Команда</span>
    <button class="btn sm" data-a="evdemo" data-v="run:${n}">+ забег</button><button class="btn sm" data-a="evdemo" data-v="echo:${n}">+ атака Эхо</button>
    <button class="btn sm" data-a="evdemo" data-v="soon">отсечка через ${EV_TEAM.soonS} с</button><button class="btn sm" data-a="evdemo" data-v="week">новая неделя</button>
    <span class="faint ev-tnote">EN_EVENT: цены единиц, пороги цикла ${ROMAN[S.acc.cycle]} — ${EVA.planks(EVD, S.acc.cycle).map(fmt).join(' / ')}; сила коллекции +${evPct(evRp1())}; журнал — ${Object.keys(S.event.srv.ops).length} операций. Демо — четвёртый день недели обычного игрока.</span></div>`);
}
SCREENS.event = function () {
  const meta = { title: 'Событие недели', back: 'week', chip: weekChip() };
  if (!evOk()) return Object.assign(meta, { html: '<section class="scr"><div class="pnl pad"><p class="faint">Нет данных События: рядом с index.html должны лежать event.js и lootboxes.js.</p></div></section>' });
  evSync();
  if (!evOpen()) return Object.assign(meta, { html: `<section class="scr"><div class="pnl pad ev-lock">${ic('lock')}<b class="serif">Событие недели откроется во втором цикле</b><p class="reason">Вместе с Эхо, контрактами и кланами: тогда каждое дело недели пойдёт в общий счёт.</p></div></section>` });
  return Object.assign(meta, { html: `<section class="scr ev"><div class="ev-l">${heroHtml()}${rankHtml()}</div>${srcHtml(teamHtml())}</section>` });
};

/* ================== листы ================== */
const evTabs = t => `<div class="tabs ev-tabs" role="tablist" aria-label="Награды События">${EV_TABS.map(k => `<button role="tab" aria-selected="${t === k}" data-a="sheet" data-v="evrew:${k}">${EV_NAMES[k]}</button>`).join('')}</div>`;
const evStat = (v, s) => `<div class="stat"><b class="num">${v}</b><small>${s}</small></div>`;
/* сундуки выплаты кристаллами редкости: значок ICON r1…r7 и количество; полные имена — в подсказке */
const evCr = pay => pay.map(g => `<span class="ev-cr" data-r="${g.r}">${ICON('r' + g.r, 14, RAR[g.r])}<b class="num">×${g.count}</b></span>`).join('');
function evRung(r, have, unitTxt) {
  const nx = !r.got && r.first, box = LBX.boxes[evM().box];
  return `<div class="ev-pk ${r.got ? 'got' : nx ? 'next' : ''}">${evChest(r.pay, '') || '<span></span>'}<span class="ev-pkt"><b class="num">${fmt(r.need)}</b><small title="${trEsc(evPay(r.pay))}">${r.pay.length ? `${box ? box.n : 'Сундук'} ${evCr(r.pay)}` : '—'}${unitTxt || ''}</small></span>${r.got ? `<span class="chip spirit">${ic('check')}взята</span>` : nx ? `<span class="faint num ev-pkl">ещё ${fmt(r.need - have)}</span>` : '<span></span>'}</div>`;
}
const evFirst = rows => { const i = rows.findIndex(r => !r.got); return rows.map((r, j) => Object.assign({}, r, { first: j === i })); };
function evBoard(rows, me) {
  const row = r => `<div class="rkrow ${r.me ? 'me' : ''}"><b class="serif">${fmt(r.place)}</b><span>${trEsc(r.n)}</span><span class="num">${fmt(r.v)}</span>${r.me ? '<span class="chip spirit">вы</span>' : '<span></span>'}</div>`;
  const list = rows.map((x, i) => ({ place: i + 1, n: x[0], v: x[1] }));
  if (me && me.place && me.place <= list.length) list.splice(me.place - 1, 0, Object.assign({ me: true }, me));
  const cut = list.slice(0, rows.length);
  const tail = me && me.place && me.place > rows.length ? `<div class="wk-gap" aria-hidden="true">···</div>${row(Object.assign({ me: true }, me))}` : '';
  return `<div class="wk-board">${cut.map(row).join('')}${tail}</div>`;
}
Object.assign(OV, {
  /* три слоя наград (§27): личные планки, клан, места — вкладки одного листа */
  evrew(o) {
    if (!evOk()) return sheet('Награды События', '<p class="faint">Нет данных События.</p>');
    evSync();
    const t = EV_TABS.includes(o.arg) ? o.arg : 'me', W = evW(), w = evWk(), c = S.acc.cycle, E = S.event;
    const head = `${evTabs(t)}<p class="ev-shead"><b class="serif">${W ? W.n : 'Событие'}</b> · неделя ${w.gen}</p>`;
    if (!evOpen()) return sheet('Награды События', `${head}<p class="rs-line">${ic('lock')}Событие недели — со второго цикла.</p>`);
    let body = '', foot = '';
    if (t === 'me') {
      const P = evFirst(evPlanks()), got = P.filter(p => p.got).length;
      body = `<div class="row wk-stats">${evStat(fmt(E.pts), evWord(E.pts))}${evStat(`${got} из ${P.length}`, 'планок')}</div>
        <div class="ev-pks">${P.map(r => evRung(r, E.pts)).join('')}</div>
        <p class="reason">Планка засчитывается сразу. Сундуки рабочих получают в «Дарах», открывают — в запасах.</p>
        ${W ? `<p class="ev-line">${W.line}</p>` : ''}<p class="reason">${EVD.world}</p>
        ${TM(`Пороги цикла ${ROMAN[c]} — EN_EVENT.planks, соседние ×2; прогон: обычный берёт третью в ${evPct(EVD.econ[c].oP3Bp)} недель, четвёртую — в ${evPct(EVD.econ[c].oP4Bp)}; увлечённый пятую — в ${evPct(EVD.econ[c].eP5Bp)}. Сундуки — EN_LOOTBOXES.modes.event, слой «Личные планки».`, 'p', 'reason')}`;
      foot = `<button class="btn go" data-a="sheet" data-v="gifts:me">Дары ${ic('chev')}</button>`;
    } else if (t === 'clan') {
      const K = evClan();
      if (!K) {
        body = `<p class="rs-line">${ic('shield')}Вы не в клане: клановые планки и места кланов — вместе с кланом.</p>
          <p class="reason">Ваши очки идут в личные планки и место. Вступившему клан засчитывает очки со следующей недели.</p>`;
        foot = `<button class="btn go" data-a="go" data-v="clan">Найти клан ${ic('chev')}</button>`;
      } else {
        const rows = evFirst(K.rows), got = rows.filter(r => r.got).length, cy = [...new Set(K.cycles)].sort((a, b) => a - b).map(x => ROMAN[x]).join(', ');
        body = `<div class="row wk-stats">${evStat(fmt(K.pts), 'очков клана')}${evStat(fmt(K.mine), 'ваш вклад')}</div>
          <p class="ev-cn">${ic('shield')}<b>${trEsc(S.clan.n)}</b><span class="faint">планок ${got} из ${rows.length}</span></p>
          <div class="ev-pks">${rows.map(r => evRung(r, K.pts, ' · каждому')).join('')}</div>
          <p class="reason">Очки клана — сумма очков участников; очки других циклов — в пересчёте на ваш цикл по первой личной планке: взяли одинаково планок — принесли поровну. Первая планка — будто каждый участник взял третью личную, вторая — четвёртую, третья — пятую.</p>
          <p class="reason">Сундуки — каждому участнику: половину делит сервер по вкладу, половину — глава клана; журнал раздачи видят все. Вступивший приносит очки новому клану со следующей недели.</p>
          ${TM(`Клановая планка k — участников × первый личный порог цикла игрока × ${EVD.clanX.map(x => evFrac(x, 100, 2)).join(' / ')} (EN_EVENT.clanX; третья — ×1,5 второй); очки участника другого цикла — × порог цикла игрока / порог его цикла (ADR-0042, EnEvent.clanPts): участников ${K.n}, циклы ${cy}; остальные в демо к этому часу недели набрали в среднем столько же, сколько обычный игрок своего цикла, играет ${evPct(EVD.demo.clanActiveBp)}. Прогон: обычный клан из 25 берёт первую, клан увлечённых — вторую, третью — в части недель.`, 'p', 'reason')}`;
        foot = `<button class="btn go" data-a="sheet" data-v="gifts:clan">Дары · клан ${ic('chev')}</button>`;
      }
    } else {
      const pl = evPlace(), K = evClan(), cpl = K ? evClanPlace(K.pts) : null, me = evTier(pl), cl = evTier(cpl, true);
      const pays = (id, sfx) => evLy(id).rows.map(r => `<div class="ev-tr"><span>${r.label}</span>${evChest(r.cyc[c] || [], r.label)}<small title="${trEsc(evPay(r.cyc[c] || []))}">${evCr(r.cyc[c] || [])}${(r.cyc[c] || []).some(g => g.win === 'pure') ? ' · всё своей редкости' : ''}${sfx || ''}</small></div>`).join('');
      body = `<div class="row wk-stats">${evStat(pl ? '#' + fmt(pl) : '—', 'ваше место')}${evStat(cpl ? '#' + fmt(cpl) : '—', 'место клана')}</div>
        <p class="rs-line">${me ? `Если неделя закончится сейчас: ${me.one.toLowerCase()} — ${me.label}, ${evPay(me.pay)}.` : 'Сундук за место — с топ-100. Места игроков — среди Странников вашего цикла на всех серверах.'}</p>
        <span class="eyebrow">Места игроков</span><div class="ev-trs">${pays('top')}</div>
        <span class="eyebrow">Места кланов</span><div class="ev-trs">${pays('clanTop', ' · каждому')}</div>
        ${cl ? `<p class="rs-line">Клан сейчас в «${cl.label}»: ${evPay(cl.pay)} каждому.</p>` : ''}
        <span class="eyebrow">Лидеры</span>${evBoard(evLeaders('me', EV_VIEW.top), pl ? { place: pl, n: 'Вы', v: E.pts } : null)}
        <span class="eyebrow">Кланы-лидеры</span>${evBoard(evLeaders('clan', EV_VIEW.top), cpl && K ? { place: cpl, n: S.clan.n, v: K.pts } : null)}
        <p class="reason">Места становятся наградой после подсчёта недели.</p>
        ${TM('Опоры рейтинга — EN_EVENT.top: доли пятой личной планки цикла (игроки) и суммы пятых планок клана из 25 (кланы). В игре места считает сервер по всем игрокам цикла.', 'p', 'reason')}`;
      foot = `<button class="btn" data-a="sheet" data-v="rank:Событие">Рейтинг ${ic('chev')}</button>`;
    }
    return sheet('Награды События', head + body, foot);
  },
  /* источник очков: цена дела, сделанное за неделю, акцент недели и потолки; одно действие — прямо в режим */
  evsrc(o) {
    if (!evOk()) return sheet('Событие', '<p class="faint">Нет данных События.</p>');
    evSync();
    const x = evSrc(o.arg); if (!x) return sheet('Событие', '<p class="faint">Такого источника очков нет.</p>');
    const E = S.event, W = evW(), c = S.acc.cycle, rp = evRp1();
    const units = Object.entries(EVD.units).filter(([, U]) => U.src === x.id);
    const acc = W && units.some(([k]) => W.accent.units.includes(k));
    const price = (k, U) => k === 'echoRound'
      ? `<span class="ev-up">${['o', 'e', 'b', 'u'].map(g => fmt(U.price * EVD.echoRounds[g])).join(' · ')}</span><small>рядовой · элита · босс · Убер-босс</small>`
      : `<span class="ev-up">${fmt(U.price)}</span><small>${evWord(U.price)} за ${U.a}</small>`;
    const done = (k, n) => k === 'ritualHalf' ? evHours(n) : k === 'echoRound' ? `${fmt(n)} ${evU(k, n)}` : fmt(n);
    const lg = window.EN_ARENA && EN_ARENA.league;
    const rows = units.map(([k, U]) => { const lock = (U.from && c < U.from) || evGateShut(U), n = E.cnt[k] || 0, cap = EVD.caps[k];
      const why = U.from && c < U.from ? `С цикла ${ROMAN[U.from]}.` : `Когда откроется Лига: нужно ${lg ? lg.heroes : ''} разных героев.`;
      return `<div class="ev-u ${lock ? 'lock' : ''}"><span class="ev-un"><b>${U.n}</b><small>${lock ? why : U.what}${cap != null ? ` Не больше ${cap} в день.` : ''}</small></span><span class="ev-upc">${price(k, U)}</span><span class="ev-uc"><b class="num">${done(k, n)}</b><small>за неделю</small></span></div>`; }).join('');
    const body = `<div class="ev-sh2"><img class="ev-pic lg" src="${PATH(x.p)}" alt="">${evStat(fmt(E.by[x.id] || 0), evWord(E.by[x.id] || 0) + ' за неделю')}</div>
      <div class="ev-us">${rows}</div>
      ${acc ? `<p class="rs-line ev-accl">${ic('spark')}Акцент недели «${W.n}»: очки ${evMul(W.accent.bp)}.</p><p class="ev-line">${W.line}</p>` : ''}
      ${rp ? `<p class="rs-line">${ic('star')}Сила коллекции: +${evPct(rp)} ко всем очкам События.</p>` : ''}
      <p class="reason">Очки приходят, когда итог подтверждён: забег, атака, ритуал, контракт. Просмотр боя и повтор ничего не добавляют.</p>
      ${TM(`Очки = ⌊цена × n × акцент × (10 000 + РП1) / 10 000²⌋, округление — на операцию (EnEvent.pts). Акцент — ${evMul(W ? W.accent.bp : EVD.bp)}, РП1 — ${rp} б. п., потолок ${EVD.rp1.capBp} б. п. Средний день обычного в цикле ${ROMAN[c]} — ${fmt(EVD.econ[c].day.o)} очков, доля «${x.n}» — ${evPct(EVD.econ[c].share.o[x.id] || 0)}.`, 'p', 'reason')}`;
    return sheet(x.n + ' · очки События', body, `<button class="btn go" data-a="go" data-v="${x.go}">${x.n} ${ic('chev')}</button>`);
  },
});

/* ================== действия ================== */
Object.assign(ACT, {
  /* команда: «+ забег» и «+ атака Эхо» — операции «сервера» с номером, который несёт кнопка; отсечка скоро; новая неделя */
  evdemo(v) {
    if (!evOk()) return;
    evSync();
    const [kind, n0] = String(v).split(':'), n = n0 || 'без номера';
    if (kind === 'run') { for (const [k, q] of Object.entries(EV_TEAM.run)) EV_SRV.credit(`команда:${n}:${k}`, k, q); }
    else if (kind === 'echo') EV_SRV.credit(`команда:${n}:эхо`, 'echoRound', EVD.echoRounds[EV_TEAM.echo]);
    else if (kind === 'soon') S.week.left = Math.min(S.week.left, EV_TEAM.soonS);
    else if (kind === 'week') { EV_SRV.next(); S.week.left = evWindow(); }
    render();
  },
});

/* ================== состояние: S.event заводится у новых и у текущего S ================== */
const evInit0 = initialState;
initialState = function () { const s = evInit0(); s.event = evNew(s); evRank(s); return s; };
if (S && (!S.event || S.event.v !== 1)) S.event = evNew(S);
if (S) evRank(S);

/* ================== неделя: итоги в реестр WEEK_MODES (screens/week.js) ==================
   Строка «Событие» на экране «Неделя»: очки недели, личные планки с сундуками рабочих, место и лидеры; прошлая неделя — «Дары» */
(window.WEEK_MODES = window.WEEK_MODES || []).push({
  id: 'event', n: 'Событие', icon: 21, go: 'event', order: 20, unit: ['очко', 'очка', 'очков'],
  now() {
    if (!evOk()) return { lock: 'нет данных' };
    evSync();
    if (!evOpen()) return { lock: `рейтинг — с цикла ${ROMAN[EVD.from]}` };
    const W = evW(), pl = evPlace(), K = evClan();
    return { place: pl, points: S.event.pts, planks: evPlanks().map(p => ({ k: p.k, need: p.need, pay: p.pay, reached: p.got })), top: evLeaders('me', EV_VIEW.top),
      clanPlanks: K ? K.rows.map(r => ({ k: r.k, need: r.need, pay: r.pay, reached: r.got })) : [],   // взятые клановые — «Дарам» этой недели (bag.js)
      tier: evTier(pl), note: W ? `${W.n}: акцент недели — ${W.an}, очки ${evMul(W.accent.bp)}` : '' };
  },
  past() {
    if (!evOk()) return { lock: 'нет данных' };
    evSync();
    if (!evOpen()) return { lock: `рейтинг — с цикла ${ROMAN[EVD.from]}` };
    const X = evPast();
    return { place: X.place, points: X.pts, top: evLeaders('me', EV_VIEW.top, true),
      rewards: X.rows.map(p => ({ label: p.label, box: p.box, groups: p.groups.map(g => ({ r: g.r, count: g.count, win: g.win })), st: p.st, cat: p.cat, kind: p.kind })) };
  },
});

/* ================== раздел UI-кита ================== */
function evKitHtml() {
  if (!evOk()) return '';
  evSync();
  const c = Math.max(EVD.from, S.acc.cycle), noop = h => h.replace(/data-a="[^"]*"/g, 'data-a="noop"');
  const weeks = (RS.weeks || []).map(w => { const W = EVD.weeks[w.race]; return W ? `<li><b>${W.n}</b> · ${w.race}, ${w.civ} — акцент: ${W.an}</li>` : ''; }).join('');
  const prices = Object.entries(EVD.units).map(([k, U]) => `<tr><td>${evSrc(U.src).n}</td><td>${U.n}</td><td class="n">${k === 'echoRound' ? ['o', 'e', 'b', 'u'].map(g => fmt(U.price * EVD.echoRounds[g])).join(' / ') : fmt(U.price)}</td><td class="n">${EVD.caps[k] != null ? EVD.caps[k] : '—'}</td></tr>`).join('');
  const planks = EVD.cycles.map(cc => `<tr><td>${ROMAN[cc]}</td><td class="n">${EVA.planks(EVD, cc).map(fmt).join(' / ')}</td><td class="n">${fmt(EVD.econ[cc].week.o)} / ${fmt(EVD.econ[cc].week.e)}</td></tr>`).join('');
  const demo = evOpen() ? `<div class="k-demo ev-kit"><div class="ev-l">${noop(heroHtml())}${noop(rankHtml())}</div><div class="ev-rows">${noop(srcRow(EVD.sources[0]))}${noop(srcRow(EVD.sources[1]))}</div></div>` : '<p class="k-note">Событие — со второго цикла: в цикле I раздел показывает правила без демо.</p>';
  return `<section class="k-box" style="grid-column:1/-1" id="kitEvent"><h3>Событие недели</h3>
    <p class="k-note">Метарежим недели расы: каждое подтверждённое дело — в общий счёт. Экран — тема недели, мои очки и ближайшая планка, одно действие «Награды»; рейтинг — лидер и я; «Где брать очки» — строки с переходом прямо в режим. Три слоя наград — личные планки, клан, места — вкладки одного листа.${TM(' §27, §10.3, ADR-0024, ADR-0026. Данные — design/ui/event.js, сборщик tools/content-gen/event/build.js, черновик docs/content/событие.md. Экран — screens/event.js.')}</p>
    ${demo}
    <p class="k-note">Карточка: до двух чисел, до двух чипов, одно действие. Строка источника: значок режима, что засчитывается, очки недели; нажатие — лист с ценой дела, «›» — сам режим. Акцент недели — чип «×1,5» у своего источника.</p>
    <div class="k-air-r"><b>Девять Событий — по одному на расу недели</b><ul class="k-note ev-kweeks">${weeks}</ul></div>
    ${TM(`<div class="ev-kg"><div class="k-air-r"><b>Занятие → очки</b><table class="p-table ev-kt"><thead><tr><th>Источник</th><th>Единица</th><th>Очков</th><th>В день</th></tr></thead><tbody>${prices}</tbody></table></div>
      <div class="k-air-r"><b>Пороги личных планок · медиана недели обычного / увлечённого</b><table class="p-table ev-kt"><thead><tr><th>Цикл</th><th>Планки 1–5</th><th>Неделя</th></tr></thead><tbody>${planks}</tbody></table><small>Клановая планка — сумма личных порогов участников: третьих, четвёртых, пятых. Цикл демо — ${ROMAN[c]}.</small></div></div>`)}
  </section>`;
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: evKitHtml });

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Событие · очки недели', 'Тема недели, мои очки и ближайшая планка; где брать очки — строкой с переходом прямо в режим', () => { S.route = 'event'; S.overlay = null; }],
  ['Событие · три слоя наград', 'Личные планки, клан и места — один лист с вкладками; сундуки — в «Дарах»', () => { S.route = 'event'; S.overlay = { t: 'evrew', arg: 'me' }; }],
  ['Событие · откуда очки', 'Лист источника: цена дела, сделанное за неделю, акцент недели', () => { S.route = 'event'; S.overlay = { t: 'evsrc', arg: 'echo' }; }],
);

/* для автопроверки tools/content-gen/screens/check_event.js и консоли */
window.EN_EV = { srv: EV_SRV, observe: evObserve, sync: evSync, fresh: evNew, planks: evPlanks, clan: evClan, place: evPlace, clanPlace: evClanPlace,
  leaders: evLeaders, tier: evTier, past: evPast, rp1: evRp1, kit: evKitHtml, hero: heroHtml, rank: rankHtml, row: srcRow, view: EV_VIEW, team: EV_TEAM };
})();
