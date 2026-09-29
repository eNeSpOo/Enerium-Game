/* screens/contracts.js — «Неделя → Контракты» (§18 GDD). Договор — screens/model.js.
   Регистрирует: SCREENS.contracts — день и неделя сегментами шапки; листы OV.ctask (задание), OV.cpool (награда), OV.ccert (заверение),
   OV.codds (шансы и замены), OV.ctgot (итог); действия ACT.ct*; итоги недели — в реестр WEEK_MODES (screens/week.js); раздел UI-кита
   через KIT_EXTRA; сценарии презентации. На карте экранов экран отмечен готовым — поле ready карточки «Контракты» (MAP в index.html).
   Своё состояние — S.contracts (заводится как S.bag); поля signed, tasks[].p, tasks[].goal и left читают Убежище, шахта и тик index.html.
   Данные — EN_CONTRACTS (design/ui/contracts.js, собирает tools/content-gen/contracts/build.js): каталог заданий, объём по редкости и циклу,
   награды, ставки, пороги планок. Алгоритм пула — EnContracts (tools/content-gen/contracts/offer.js, лежит там же).
   Правила §18: две таблицы — день и неделя, из каждой один контракт за период; пул заданий, замена (бесплатные на оба контракта за день,
   дальше — Энериум), отмена, заверение золотом; прогресс — только с подписи; всё или ничего; приём закрывается за час до подсчёта недели.
   Сервер решает, клиент показывает: состав пула и замена — на сиде игрока; замена, отмена, заверение, подпись и выдача — операции CT_SRV
   с номером: проверка и итог одним вызовом, повтор того же номера ничего не повторяет. Прогресс считает «сервер» по делам в игре:
   забеги, Эхо, траты, лавка, ритуалы, Арена, клан — наблюдатель ctObserve; остальное в прототипе — кнопки команды.
   Служебное — только команде: TM, PL, tmT из index.html. Автопроверка — tools/content-gen/screens/check_contracts.js. */
'use strict';

/* ================== данные экрана: демонстрация, не баланс ================== */
const CT_DEMO = {
  seed: 'демо-странник',                 // сид игрока: в игре его выдаёт сервер
  dayLeft: 6 * 3600 + 18 * 60,           // до конца серверного дня
  day: 1, week: 1,                       // номера периодов демо
  weekSigned: { cert: true, prog: [6000, 10000, 2500, 0, 0, 0, 0, 0, 0, 0, 0, 0] },   // недельный — подписан и заверен; прогресс заданий, б. п. цели
  pts: 210,                              // очки исполненных контрактов этой недели
  place: 57,                             // место в рейтинге контрактов, если нет в S.ranks
  past: { frac: 4000, pts: 1650, place: 41 },   // прошлая неделя для «Недели»: доля пути от взятой планки к следующей, б. п.; очки и место — если «Даров» нет
  top: [11500, 9800, 8600],              // лидеры недели — доля порога 5-й планки, б. п.
  names: ['Тихий ветер', 'Северный странник', 'Собиратель искр'],
  soonS: 10,                             // команда: «срок через 10 с»
  progBp: 3500,                          // команда: «+ прогресс» — доля цели
};
/* вид */
const CT_VIEW = { crystal: 18, pic: 34, chest: 22, gotItems: 8 };   // gotItems — сколько предметов показать в итоге, остальное — числом

/* ================== помощники ================== */
const CT = window.EN_CONTRACTS || null, CTE = window.EnContracts || null;
const CTB = 10000;
const ctT = key => key === 'week' ? 'w' : 'd';
const ctKey = t => t === 'w' ? 'week' : 'day';
const ctCyc = (s = S) => Math.max(CT.rules.cycles[0], Math.min(CT.rules.cycles[CT.rules.cycles.length - 1], s.acc.cycle));
const ctOpen = (s = S) => s.acc.level >= CT.rules.openLevel && s.acc.cycle >= CT.rules.openCycle;
const ctK = k => CT.kinds[k];
const ctUnit = (k, n) => { const u = ctK(k).u; return plural(n, u[0], u[1], u[2]); };            // «1 победа, 5 побед»
const ctUnitG = (k, n) => { const g = ctK(k).g; return n % 10 === 1 && n % 100 !== 11 ? g[0] : g[1]; };   // «из 1 победы, из 5 побед»
const ctBoxR = r => window.EN_LOOTBOXES && EN_LOOTBOXES.boxRarity ? EN_LOOTBOXES.boxRarity[r - 1] : RAR[r].toLowerCase();   // «сундук уникальный»
const ctLv = (s, id) => s.wn && s.wn.art && s.wn.art[id] != null ? Math.max(0, s.wn.art[id]) : 0;
const ctPins = s => new Set(((s.mem && s.mem.slots) || []).map(x => x.p).filter(Boolean));
/* пул заданий: база, «Доска объявлений» — шаг за уровень, «Вторая печать» Памяти — ещё одно */
function ctPoolSize(s = S) {
  const P = CT.rules.pool, a = P.artInfo;
  return P.base + (a ? a.step * ctLv(s, P.art) : 0) + (ctPins(s).has(P.mem) ? 1 : 0);
}
/* бесплатных замен в день: база, «Кости писаря», Память и достижения */
function ctFreeRer(s = S) {
  const R = CT.rules.rer, a = R.artInfo, pins = ctPins(s), got = (s.wn && s.wn.ach && s.wn.ach.got) || {};
  return R.free + (a ? a.step * ctLv(s, R.art) : 0) + Object.entries(R.mem).reduce((x, [id, n]) => x + (pins.has(id) ? n : 0), 0)
    + R.ach.reduce((x, a2) => x + (got[a2.id] ? a2.v : 0), 0);
}
const ctMod = (s, map) => Math.min(2000, Object.entries(map).reduce((x, [id, bp]) => x + (ctPins(s).has(id) ? bp : 0), 0));
const ctDisc = (s = S) => Object.entries(CT.rules.cert.disc).reduce((x, [id, bp]) => ctPins(s).has(id) ? Math.max(x, bp) : x, 0);
const ctBoth = (s = S) => ctPins(s).has(CT.rules.cert.both);
/* Лига открыта — одно правило экранов Лиги, контрактов и События (leagueOpen, index.html): данные Арены EN_ARENA.league —
   цикл рейтинга и 15 разных героев аккаунта */
const ctLeagueOpen = s => typeof leagueOpen === 'function' && leagueOpen(s);
/* условие игрока: сервер выдаёт вид, только если его можно выполнить */
function ctOk(s) {
  const c = ctCyc(s), known = new Set((s.bag && s.bag.known) || []);
  const left = (RX.recipes || []).filter(r => r.cyc <= c && !known.has(r.id)).length;
  return (k, v) => {
    switch (ctK(k).need) {
      case 'recipes': return left >= v;
      case 'league': return ctLeagueOpen(s);
      case 'dust': return (s.wallet.dust || 0) > 0;
      case 'clan': return !!(s.clan && s.clan.in);   // S.clan есть и без клана (screens/clan.js: in — игрок в клане)
      default: return true;
    }
  };
}
const ctSpec = (s, t, period) => ({ t, c: ctCyc(s), seed: s.contracts ? s.contracts.seed : CT_DEMO.seed, period, ok: ctOk(s) });
const ctPeriod = (C, t) => t === 'w' ? 'неделя-' + C.weekNo : 'день-' + C.dayNo;
const ctCur = key => S.contracts[key];
const ctDone = x => x.p >= x.goal;
const ctPts = tasks => CTE.points(CT, tasks);
/* время задания у обычного игрока: минуты игры, доля дня или дни недели */
function ctDays(bp) { const v = Math.round(bp / 1000) / 10; return Number.isInteger(v) ? `${v} ${plural(v, 'дня', 'дней', 'дней')}` : `${String(v).replace('.', ',')} дня`; }
function ctMin(m) { if (m < 60) return `${m} мин`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} ч ${r} мин` : `${h} ч`; }
function ctTime(t, c, x) {
  const sh = CT.share[t][c][x.kind], bp = sh ? sh[x.r - 1][0] : 0, K = ctK(x.kind);
  if (!bp) return '';
  if (t === 'w') return `Обычно это около ${ctDays(bp)} обычной игры.`;
  if (K.pace === 'time') return `Обычно это около ${ctMin(Math.max(1, Math.round(bp * CT.hours.o * 60 / CTB)))} игры.`;
  const n = Math.max(1, Math.round(CT.caps[c][x.kind][0] / 100));
  return `За день обычно успевают около ${fmt(n)} ${ctUnit(x.kind, n)}.`;
}
/* награда контракта с прибавками Памяти: золото — «Печати», ресурсы — «Довески» */
function ctPool(s, C) {
  if (!C.tasks.length) return null;
  const p = CTE.reward(CT, C.t, C.c || ctCyc(s), C.tasks, C.cert ? CT.rules.cert.mul : 1), g = ctMod(s, CT.rules.mods.gold), r = ctMod(s, CT.rules.mods.res);
  p.gold = Math.floor(p.gold * (CTB + g) / CTB); p.base = Math.floor(p.base * (CTB + r) / CTB); p.ckeys = Math.floor(p.ckeys * (CTB + r) / CTB);
  return p;
}
const ctStake = (s, C) => C.tasks.length ? CTE.stake(CT, C.t, C.c || ctCyc(s), C.tasks, ctDisc(s)) : 0;
/* списки ресурсов выдачи: базовые — общий пул, ключи ремёсел и уникальные — открытых циклов, без спойлеров */
const ctList = (tier, c) => RX.items.filter(i => i.tier === tier && !i.team && (tier === 'basic' || i.cyc <= c)).map(i => i.id);

/* ================== состояние ==================
   S.contracts: seed — сид игрока; dayNo, weekNo — номера периодов; rer — замены дня: free — осталось бесплатных, paid — платных сделано;
   day, week — контракт таблицы: t, period, left (сек. до срока), st — draft / signed / done / paid / failed / closed, signed (для index.html),
   tasks — [{ kind, r, goal, p, pts, slot, n }], cert, stake, c — цикл подписи, got — выданное; pts — очки недели, clan — в резервуар клана;
   srv — итоги операций по номерам, seq — номер следующей; obs — снимок наблюдателя; log — исполненные контракты */
function ctTable(s, C, t, left) {
  const x = { t, period: ctPeriod(C, t), left, st: 'draft', signed: false, tasks: [], cert: false, stake: 0, c: ctCyc(s), got: null, pts: 0 };
  if (ctOpen(s)) x.tasks = CTE.offer(CT, ctSpec(s, t, x.period), ctPoolSize(s));
  return x;
}
function ctState(s) {
  if (!CT || !CTE) return s;
  const C = s.contracts = { seed: CT_DEMO.seed, dayNo: CT_DEMO.day, weekNo: CT_DEMO.week, rer: { free: ctFreeRer(s), paid: 0 }, pts: CT_DEMO.pts, clan: 0,
    srv: {}, seq: 1, obs: null, log: [] };
  C.day = ctTable(s, C, 'd', CT_DEMO.dayLeft);
  C.week = ctTable(s, C, 'w', Math.max(0, s.week.left - CT.rules.cutoffMin * 60));
  /* недельный демо: подписан с заверением, часть заданий в пути */
  const W = C.week, D = CT_DEMO.weekSigned;
  if (W.tasks.length && D) {
    W.st = 'signed'; W.signed = true; W.cert = !!D.cert; W.stake = ctStake(s, W);
    W.tasks.forEach((x, i) => { x.p = Math.min(x.goal, Math.floor(x.goal * (D.prog[i] || 0) / CTB)); });
    if (W.tasks.every(ctDone)) W.st = 'done';
  }
  return s;
}
const ctInitBase = initialState;
initialState = function () { return ctState(ctInitBase()); };
ctState(S);

/* ================== «сервер» ==================
   Замена, отмена, заверение, подпись и выдача — одним вызовом: проверка, изменение и итог. Номер операции несут кнопки:
   повтор того же номера возвращает прежний итог и ничего не меняет. Отказ не записывается — следующая попытка идёт с тем же номером. */
const CT_SRV = {
  run(op, f) {
    const C = S.contracts, O = C.srv;
    if (O[op]) return Object.assign({ again: true }, O[op]);
    const r = f();
    if (!r.refuse) { O[op] = r; C.seq++; }
    return r;
  },
  /* замена: бесплатные — первыми, дальше Энериум, не больше потолка в день; подписанное не меняется */
  reroll(op, t, i) {
    return CT_SRV.run(op, () => {
      const C = S.contracts, X = C[ctKey(t)], R = CT.rules.rer;
      if (X.st !== 'draft') return { refuse: 'signed' };
      if (X.left <= 0) return { refuse: 'late' };
      if (!X.tasks[i]) return { refuse: 'none' };
      const free = C.rer.free > 0;
      if (!free && C.rer.paid >= R.paidCap) return { refuse: 'cap' };
      if (!free && S.wallet.enerium < R.price) return { refuse: 'enerium' };
      const y = CTE.reroll(CT, ctSpec(S, t, X.period), X.tasks, i);
      if (!y) return { refuse: 'none' };
      if (free) C.rer.free--; else { C.rer.paid++; S.wallet.enerium -= R.price; }
      const was = X.tasks[i]; X.tasks[i] = y;
      if (X.cert) X.stake = ctStake(S, X);
      return { ok: 'reroll', t, i, was, now: y, paid: free ? 0 : R.price };
    });
  },
  /* отмена: задание уходит из контракта до конца периода, контракт меньше */
  drop(op, t, i) {
    return CT_SRV.run(op, () => {
      const X = S.contracts[ctKey(t)];
      if (X.st !== 'draft') return { refuse: 'signed' };
      if (!X.tasks[i]) return { refuse: 'none' };
      const was = X.tasks.splice(i, 1)[0];
      if (X.cert) { X.stake = ctStake(S, X); if (!X.tasks.length) { X.cert = false; X.stake = 0; } }
      return { ok: 'drop', t, i, was };
    });
  },
  /* заверение: только до подписи, только с заданиями; второй контракт — только с «Заверенным словом» */
  cert(op, t, on) {
    return CT_SRV.run(op, () => {
      const C = S.contracts, X = C[ctKey(t)], Y = C[ctKey(t === 'w' ? 'd' : 'w')];
      if (X.st !== 'draft') return { refuse: 'signed' };
      if (on && !X.tasks.length) return { refuse: 'empty' };
      if (on && Y.cert && ['signed', 'done', 'draft'].includes(Y.st) && !ctBoth()) return { refuse: 'other' };
      X.cert = !!on; X.stake = on ? ctStake(S, X) : 0;
      return { ok: 'cert', t, on: X.cert, stake: X.stake };
    });
  },
  /* подпись: состав фиксируется, прогресс — с нуля, ставка уходит сразу */
  sign(op, t) {
    return CT_SRV.run(op, () => {
      const X = S.contracts[ctKey(t)];
      if (X.st !== 'draft') return { refuse: 'signed' };
      if (X.left <= 0) return { refuse: 'late' };
      const stake = X.cert ? ctStake(S, X) : 0;
      if (stake > S.wallet.gold) return { refuse: 'gold' };
      ctObserve();   // всё, что сделано до подписи, в счёт не идёт
      S.wallet.gold -= stake;
      if (S.contracts.obs) S.contracts.obs.gold = S.wallet.gold;   // ставка — не трата для задания «Потратить золото»
      X.stake = stake; X.st = 'signed'; X.signed = true; X.c = ctCyc(S);
      X.tasks.forEach(x => { x.p = 0; });
      X.pts = ctPts(X.tasks);
      if (!X.tasks.length) X.st = 'done';   // пустой контракт исполнен сразу: наград и очков нет
      return { ok: 'sign', t, stake, n: X.tasks.length };
    });
  },
  /* выдача: награда ×2 за заверение, очки — половина в рейтинг, половина в резервуар клана; повтор ничего не даёт */
  claim(op, t) {
    return CT_SRV.run(op, () => {
      const C = S.contracts, X = C[ctKey(t)];
      if (X.st === 'paid') return { refuse: 'paid' };
      if (X.st !== 'done') return { refuse: 'notDone' };
      const P = ctPool(S, X) || { keys: 0, gold: 0, spirit: 0, base: 0, ckeys: 0, uniq: 0, en: 0, chest: null }, seed = `${C.seed}|${X.period}|${t}|выдача`, c = X.c;
      S.wallet.keys += P.keys; S.wallet.gold += P.gold; S.wallet.spirit += P.spirit; S.wallet.enerium += P.en;
      const items = {};
      const put = got => { for (const [id, n] of Object.entries(got)) { BAG.add(id, n); items[id] = (items[id] || 0) + n; } };
      put(CTE.pickItems(seed + '|базовые', P.base, ctList('basic', c)));
      put(CTE.pickItems(seed + '|ключи', P.ckeys, ctList('key', c)));
      put(CTE.pickItems(seed + '|уникальные', P.uniq, ctList('unique', c)));
      const chests = [];
      if (P.chest) for (let k = 0; k < P.chest.n; k++) { const sp = { box: P.chest.box, r: P.chest.r, cyc: c, win: P.chest.win, src: `Контракт · ${CT.rules.tableName[t].toLowerCase()}` }; BAG.addChest(sp); chests.push(sp); }
      const pts = X.pts, half = Math.floor(pts * CT.rules.splitBp / CTB);
      C.pts += pts; C.clan += pts - half;
      if (C.obs) { C.obs.gold = S.wallet.gold; C.obs.spirit = S.wallet.spirit; }
      X.st = 'paid'; X.got = { P, items, chests, pts, half };
      C.log.push({ t, period: X.period, pts, cert: X.cert, cur: [['keys', P.keys], ['gold', P.gold], ['spirit', P.spirit], ['enerium', P.en]].filter(x => x[1] > 0) });
      return { ok: 'claim', t, got: X.got };
    });
  },
  /* сервер: прогресс по делам в игре — задания подписанных контрактов этого вида, пока не вышел срок */
  note(kind, n) {
    if (!S.contracts || !(n > 0)) return 0;
    let hit = 0;
    for (const key of ['day', 'week']) {
      const X = S.contracts[key];
      if (X.st !== 'signed' || X.left <= 0) continue;
      for (const x of X.tasks) if (x.kind === kind && !ctDone(x)) { x.p = Math.min(x.goal, x.p + n); hit++; }
      if (X.tasks.every(ctDone)) X.st = 'done';
    }
    return hit;
  },
  /* сервер: срок вышел — неисполненный подписанный контракт сорван, ставка сгорела; черновик закрыт */
  expire() {
    for (const key of ['day', 'week']) {
      const X = S.contracts[key];
      if (X.left > 0) continue;
      if (X.st === 'signed') X.st = 'failed';
      else if (X.st === 'draft') X.st = 'closed';
    }
  },
  /* сервер: новый период — новый пул на сиде, замены дня — заново */
  next(t) {
    const C = S.contracts;
    if (t === 'd') { C.dayNo++; C.rer = { free: ctFreeRer(S), paid: 0 }; C.day = ctTable(S, C, 'd', 24 * 3600); }
    else { C.weekNo++; C.pts = 0; C.clan = 0; C.week = ctTable(S, C, 'w', 7 * 24 * 3600 - CT.rules.cutoffMin * 60); }
  },
};
const CT_WHY = {
  signed: () => 'Контракт уже подписан: состав не меняется.',
  late: () => 'Срок этого контракта вышел.',
  none: () => 'Замены нет: все подходящие дела уже в контракте.',
  cap: () => `Платных замен сегодня больше нет: не больше ${CT.rules.rer.paidCap} в день.`,
  enerium: () => 'Не хватает Энериума.',
  empty: () => 'Заверять нечего: в контракте нет заданий.',
  other: () => 'Заверить можно один контракт из двух — дневной или недельный.',
  gold: () => 'Не хватает золота на ставку.',
  notDone: () => 'Контракт ещё не исполнен.',
  paid: () => 'Награда уже получена.',
};

/* ================== наблюдатель: дела в игре → прогресс заданий ==================
   В игре прогресс считает сервер по журналу операций. Здесь — по разнице снимков состояния после каждой отрисовки */
function ctSnap() {
  const runs = {};
  for (const R of S.runs || []) runs[R.id] = { fl: R.guard || R.kind ? 0 : (R.curve || []).length, k: R.kills || 0, end: R.end ? R.end.kind : '', kind: R.kind || '' };
  return { runs, gold: S.wallet.gold, spirit: S.wallet.spirit, echo: S.echo ? S.echo.score : 0, last: S.ech ? S.ech.last : null, sold: (S.sold || []).slice(),
    arena: S.arena ? S.arena.att : 0, rating: S.arena ? S.arena.rating : 0, clan: S.clan && S.clan.boss ? S.clan.boss.att : 0, event: S.event ? S.event.pts : 0,
    known: S.bag ? S.bag.known.length : 0, lim: (S.heroes || []).reduce((a, h) => a + (h.lim || 0), 0) };
}
function ctObserve() {
  if (!S || !S.contracts || !CT) return;
  const C = S.contracts, now = ctSnap(), was = C.obs;
  C.obs = now;
  if (!was) return;
  const N = (k, n) => CT_SRV.note(k, n);
  for (const [id, r] of Object.entries(now.runs)) {
    const p = was.runs[id] || { fl: 0, k: 0, end: '' };
    const R = (S.runs || []).find(x => x.id === id);
    if (r.kind) continue;   // Эхо и сцены — ниже, по итогу атаки
    if (r.fl > p.fl) {
      N('floors', r.fl - p.fl);
      const B = EB.BIOMES[R.biome];
      let el = 0; for (let f = R.startFloor + p.fl; f < R.startFloor + r.fl; f++) if (B && B.floors[f - 1] && B.floors[f - 1].g === 'e') el++;
      if (el) N('elites', el);
    }
    if (r.k > p.k) N('foes', r.k - p.k);
    if (r.end && !p.end) { if (r.end === 'boss') N('bosses', 1); if (r.end === 'guardWin') N('guard', 1); }
  }
  if (now.last && now.last !== was.last) { N('echoAtk', 1); if (now.last.kill) N('echoKill', 1); }
  if (now.echo > was.echo) N('echoPts', now.echo - was.echo);
  if (now.gold < was.gold) N('gold', was.gold - now.gold);
  if (now.spirit < was.spirit) N('spirit', was.spirit - now.spirit);
  const newSold = now.sold.filter(i => !was.sold.includes(i));
  for (const i of newSold) { const g = S.shop && S.shop[i]; if (g && typeof shopCost === 'function') { const [cur, price] = shopCost(g); if (cur === 'gold') N('shop', price); } }
  if (now.arena < was.arena) { N('arena', was.arena - now.arena); if (now.rating > was.rating) N('arenaWin', 1); }
  if (now.clan < was.clan) N('clan', was.clan - now.clan);
  if (now.event > was.event) N('event', now.event - was.event);
  if (now.known > was.known) N('recipe', now.known - was.known);
  if (now.lim > was.lim) N('limit', now.lim - was.lim);
}
/* ритуал: награду забрали — ритуал завершён */
if (typeof ACT !== 'undefined' && ACT.rclaim) {
  const ctRclaim0 = ACT.rclaim;
  ACT.rclaim = function (v) { const s = S.rituals.slots[+v], was = s && s.st; const r = ctRclaim0.apply(this, arguments); if (was === 'ready' && S.rituals.slots[+v] && S.rituals.slots[+v].st === 'free') CT_SRV.note('ritual', 1); return r; };
}
if (typeof addEventListener === 'function') addEventListener('en-render', () => { ctObserve(); });
if (typeof setInterval === 'function') setInterval(() => { if (S && S.contracts) { ctObserve(); CT_SRV.expire(); } }, 2000);

/* ================== вид ================== */
const ctIco = (k, n, t) => `<span class="ct-ri" title="${t}"><img src="${curImg(k)}" alt="${t}"><b class="num">${fmt(n)}</b></span>`;
const ctChest = (r, n) => `<span class="ct-ri" title="Сундук ключей · ${ctBoxR(r)}"><span class="well ct-chest" data-r="${r}" style="--s:${CT_VIEW.chest}px"><img src="${CHEST}" alt="Сундук ключей"></span>${n > 1 ? `<b class="num">×${n}</b>` : ''}</span>`;
/* награда строкой: главное — ключи; с эпической — Энериум, иначе золото; сундук недели — значком */
function ctRewShort(P) {
  if (!P) return '<span class="faint">без наград</span>';
  return ctIco('keys', P.keys, 'Рунические ключи') + (P.en ? ctIco('enerium', P.en, 'Энериум') : ctIco('gold', P.gold, 'Золото')) + (P.chest ? ctChest(P.chest.r, P.chest.n) : '');
}
/* награда полностью: строки листа */
function ctRewRows(P) {
  if (!P) return '<p class="reason">В контракте нет заданий — и наград нет.</p>';
  const row = (img, n, v, note = '') => `<div class="ct-rrow">${img}<span class="n">${n}${note ? `<small>${note}</small>` : ''}</span><b class="num">${v}</b></div>`;
  const cur = k => `<img class="ct-rimg" src="${curImg(k)}" alt="">`;
  return `<div class="ct-rlist">
    ${row(cur('keys'), 'Рунические ключи', fmt(P.keys), 'вход к рунным стражам')}
    ${row(cur('gold'), 'Золото', fmt(P.gold))}
    ${row(cur('spirit'), 'Дух', fmt(P.spirit))}
    ${P.base ? row(`<span class="ct-rimg v">${ic('gem')}</span>`, 'Базовые ресурсы', '×' + fmt(P.base), 'вперемешку из общего пула') : ''}
    ${P.ckeys ? row(`<span class="ct-rimg v">${ic('key')}</span>`, 'Ключи ремёсел', '×' + fmt(P.ckeys), 'из биомов вашего цикла') : ''}
    ${P.uniq ? row(`<span class="ct-rimg v r">${ic('star')}</span>`, 'Уникальный ресурс босса', '×' + fmt(P.uniq), 'одного из боссов вашего цикла') : ''}
    ${P.en ? row(cur('enerium'), 'Энериум', fmt(P.en), 'за задания эпической редкости и выше') : ''}
    ${P.chest ? row(`<span class="well ct-chest" data-r="${P.chest.r}" style="--s:30px"><img src="${CHEST}" alt=""></span>`, `Сундук ключей · ${ctBoxR(P.chest.r)}`, '×' + P.chest.n, 'откроется в запасах') : ''}
  </div>`;
}
/* строка срока: «до конца дня · 6 ч 18 мин» */
function ctLeftChip(X) {
  const lab = X.t === 'w' ? 'до отсечки недели' : 'до конца дня';
  return `<span class="chip" title="${tmT('Срок', `Срок: ${X.t === 'w' ? 'приём закрывается за час до подсчёта недели' : 'конец серверного дня'}. Сдать позже — ничего`)}">${ic('hour')}${lab} · <span class="num">${dur(X.left)}</span></span>`;
}
/* карточка задания: картинка раздела, кристалл редкости, имя, цель — одно-два числа и одно действие */
function ctCard(X, x, i) {
  const K = ctK(x.kind), op = `ct${S.contracts.seq}`, d = X.st !== 'draft', done = d && ctDone(x);
  /* два числа: до подписи — цель и очки; после — сделано из цели и полоса */
  const goal = d ? `<span class="ct-goal"><b class="num">${fmt(x.p)}</b><small>из ${fmt(x.goal)} ${ctUnitG(x.kind, x.goal)}</small></span>${bar(x.p * 100 / x.goal, done ? 'sp' : '')}`
    : `<span class="ct-goal"><b class="num">${fmt(x.goal)}</b><small>${ctUnit(x.kind, x.goal)}</small></span><span class="ct-pts num">+${fmt(x.pts)} ${plural(x.pts, 'очко', 'очка', 'очков')}</span>`;
  let act = '';
  if (X.st === 'draft') {
    const C = S.contracts, R = CT.rules.rer, free = C.rer.free > 0, cap = !free && C.rer.paid >= R.paidCap;
    const tip = free ? `Заменить · бесплатно, осталось ${C.rer.free}` : cap ? CT_WHY.cap() : `Заменить за ${R.price} Энериума`;
    act = free ? `<button class="iconbtn ct-rr" data-a="ctreroll" data-v="${op}:${X.t}:${i}" title="${tip}" aria-label="Заменить задание">${ic('swap')}</button>`
      : `<button class="btn sm ct-rr" data-a="ctrerollpay" data-v="${op}:${X.t}:${i}" title="${tip}" aria-label="Заменить задание за Энериум" ${cap ? 'disabled' : ''}>${ic('swap')}${costTag('enerium', R.price)}</button>`;
  } else if (done) act = `<span class="chip spirit">${ic('check')}готово</span>`;
  else if (X.st === 'signed') act = `<button class="link" data-a="go" data-v="${K.go}"${x.kind === 'dust' ? ' data-seg="hire:souls"' : ''}>К делу ${ic('chev')}</button>`;
  return `<div class="ct-card${done ? ' done' : ''}${X.st === 'failed' && !done ? ' miss' : ''}" data-r="${x.r}">
    <button class="ct-main" data-a="sheet" data-v="ctask:${X.t}:${i}" aria-label="${trEsc(`${K.n}: ${fmt(x.goal)} ${ctUnit(x.kind, x.goal)}, ${RAR[x.r].toLowerCase()}`)}">
      <span class="ct-top"><img class="ct-pic" src="${PATH(K.p)}" alt=""><span class="ct-cr" title="${RAR[x.r]}">${ICON('r' + x.r, CT_VIEW.crystal, RAR[x.r])}</span></span>
      <b class="ct-n">${K.n}</b>
      ${goal}
    </button>
    <div class="ct-act">${act}</div>
  </div>`;
}
/* шапка экрана: одна мысль — что сейчас с контрактом */
function ctHead(X) {
  const C = S.contracts, n = X.tasks.length, k = X.tasks.filter(ctDone).length, next = X.t === 'w' ? 'на следующей неделе' : 'завтра';
  const R = CT.rules.rer, rr = C.rer.free > 0 ? `<span class="chip" title="Бесплатные замены на сегодня — на оба контракта">${ic('swap')}замен: ${C.rer.free}</span>`
    : `<span class="chip" title="Бесплатные замены кончились">${ic('swap')}замена · ${R.price} Энериума</span>`;
  const pts = `<button class="chip ct-wk" data-a="sheet" data-v="rank:Контракты" title="Рейтинг контрактов недели">${ic('flag')}неделя · ${fmt(C.pts)} ${plural(C.pts, 'очко', 'очка', 'очков')}</button>`;
  const L = {
    draft: [`Составьте контракт · ${n} ${plural(n, 'задание', 'задания', 'заданий')}`, ctLeftChip(X) + `<span class="g-spacer"></span>${rr}<button class="link" data-a="sheet" data-v="codds:${X.t}">Шансы ${ic('chev')}</button>`],
    signed: [`Подписан · выполнено ${k} из ${n}`, ctLeftChip(X) + (X.cert ? `<span class="chip spirit" title="Заверен: награда ×2">×${CT.rules.cert.mul}</span>` : '') + `<span class="g-spacer"></span>${pts}`],
    done: ['Контракт исполнен', `<span class="chip spirit">${ic('check')}награда ждёт</span><span class="g-spacer"></span>${pts}`],
    paid: ['Награда получена', `<span class="chip">новый контракт — ${next}</span><span class="g-spacer"></span>${pts}`],
    failed: ['Контракт сорван', `<span class="chip bad">срок вышел</span><span class="chip">новый — ${next}</span><span class="g-spacer"></span>${pts}`],
    closed: [X.t === 'w' ? 'Приём закрыт до подсчёта недели' : 'Срок вышел', `<span class="chip">новый контракт — ${next}</span><span class="g-spacer"></span>${pts}`],
  }[X.st];
  return `<div class="ct-head"><span class="eyebrow">${L[0]}</span>${L[1]}</div>`;
}
/* низ экрана: награда, заверение и одно главное действие */
function ctFoot(X) {
  const P = ctPool(S, X), op = `ct${S.contracts.seq}`;
  const rew = `<button class="ct-rew" data-a="sheet" data-v="cpool:${X.t}"><span class="eyebrow">Награда${X.cert ? ' ×' + CT.rules.cert.mul : ''}</span><span class="row">${ctRewShort(P)}</span></button>`;
  let mid = '', main = '', line = '';
  if (X.st === 'draft') {
    mid = `<button class="ct-cb${X.cert ? ' on' : ''}" data-a="sheet" data-v="ccert:${X.t}">${ic('shield')}<span><b>${X.cert ? 'Заверено' : 'Заверение'}</b><small>${X.cert ? `ставка ${fmt(X.stake)}` : 'награда ×' + CT.rules.cert.mul}</small></span></button>`;
    main = `<button class="btn go big" data-a="ctsign" data-v="${op}:${X.t}" ${X.left > 0 ? '' : 'disabled'}>Подписать${X.cert ? costTag('gold', X.stake) : ''}</button>`;
    line = 'Прогресс пойдёт с подписи. Всё или ничего: не выполните одно задание к сроку — не будет ничего.';
  } else if (X.st === 'signed') {
    const left = X.tasks.filter(x => !ctDone(x)).length;
    line = `Всё или ничего: осталось ${left} ${plural(left, 'задание', 'задания', 'заданий')}.${X.cert ? ` Ставка ${fmt(X.stake)} золота сгорит при срыве.` : ''}`;
  } else if (X.st === 'done') {
    main = `<button class="btn go big" data-a="ctclaim" data-v="${op}:${X.t}">${ic('check')}${X.tasks.length ? 'Получить награду' : 'Закрыть контракт'}</button>`;
    line = X.tasks.length ? 'Всё исполнено в срок. Награда — в кошелёк и запасы, сундук — в запасы.' : 'Пустой контракт: наград и очков нет.';
  } else if (X.st === 'paid') line = X.tasks.length ? `Получено: ${fmt(X.got.pts)} ${plural(X.got.pts, 'очко', 'очка', 'очков')} — половина в рейтинг, половина в резервуар клана.` : 'Пустой контракт закрыт.';
  else if (X.st === 'failed') line = `Не выполнено: ${X.tasks.filter(x => !ctDone(x)).map(x => ctK(x.kind).n.toLowerCase()).join(', ')}. Наград и очков нет${X.cert ? ', ставка сгорела' : ''}.`;
  else line = X.t === 'w' ? 'Неделя подсчитывается. Новый контракт — после подсчёта.' : 'Контракт не подписан — день прошёл без него.';
  return `<div class="pnl ct-foot">${rew}${mid}<span class="g-spacer"></span>${main}</div><p class="reason ct-line">${line}</p>`;
}
/* команде: прогресс, срок и новый период — без наблюдателя */
function ctTeam(X) {
  return TM(`<div class="row ct-team"><span class="eyebrow">Команда</span>
    <button class="btn sm" data-a="ctdemo" data-v="prog:${X.t}">+ прогресс</button><button class="btn sm" data-a="ctdemo" data-v="all:${X.t}">исполнить всё</button>
    <button class="btn sm" data-a="ctdemo" data-v="soon:${X.t}">срок через ${CT_DEMO.soonS} с</button><button class="btn sm" data-a="ctdemo" data-v="next:${X.t}">${X.t === 'w' ? 'новая неделя' : 'новый день'}</button>
    <span class="faint" style="font-size:11.5px">пул ${ctPoolSize()} · замен ${ctFreeRer()} · цикл ${ROMAN[ctCyc()]} · сид «${S.contracts.seed}»</span></div>`);
}

SCREENS.contracts = function () {
  const key = S.seg.contracts === 'week' ? 'week' : 'day';
  const seg = { key: 'contracts', items: [['day', 'Дневной', S.contracts && S.contracts.day.st === 'done' ? '!' : ''], ['week', 'Недельный', S.contracts && S.contracts.week.st === 'done' ? '!' : '']] };
  if (!CT || !CTE) return { title: 'Контракты', back: 'week', html: '<section class="scr"><div class="pnl pad"><p class="faint">Нет данных контрактов.</p></div></section>' };
  if (!ctOpen()) return { title: 'Контракты', back: 'week', html: `<section class="scr"><div class="pnl pad ct-lock">${ic('lock')}<b class="serif">Контракты откроются на ${CT.rules.openLevel}-м уровне Странника</b><p class="reason">Вместе со вторым циклом, Эхо, кланами и рынком.</p></div></section>` };
  CT_SRV.expire();
  const X = S.contracts[key];
  const grid = X.tasks.length ? `<div class="ct-grid scroll">${X.tasks.map((x, i) => ctCard(X, x, i)).join('')}</div>`
    : `<div class="ct-empty pnl"><b class="serif">Пустой контракт</b><p class="reason">Подписать можно и его — наград и очков не будет. Задания вернутся ${X.t === 'w' ? 'на следующей неделе' : 'завтра'}.</p></div>`;
  return { title: 'Контракты', back: 'week', seg, chip: '', html: `<section class="scr ct-scr">${ctHead(X)}${grid}${ctFoot(X)}${ctTeam(X)}</section>` };
};

/* ================== листы ================== */
Object.assign(OV, {
  /* задание: цель, что засчитывается, сколько это времени, награда задания, очки; до подписи — заменить или убрать */
  ctask(o) {
    const [t, si] = String(o.arg || '').split(':'), X = S.contracts[ctKey(t)], i = +si, x = X && X.tasks[i];
    if (!x) return sheet('Задание', '<p class="faint">Задания больше нет в контракте.</p>');
    const K = ctK(x.kind), c = X.c || ctCyc(), P = CTE.reward(CT, t, c, [x], 1), op = `ct${S.contracts.seq}`, half = Math.floor(x.pts * CT.rules.splitBp / CTB);
    const sh = CT.share[t][c][x.kind], cap = CT.caps[c][x.kind];
    const body = `<div class="ct-sh-top" data-r="${x.r}"><img class="ct-pic lg" src="${PATH(K.p)}" alt=""><span class="col" style="gap:4px"><span class="row">${rar(x.r)}<span class="chip">${CT.groups[K.grp]}</span></span><b class="serif ct-sh-n">${K.n}</b></span></div>
      <div class="ct-sh-goal"><b class="num">${fmt(x.goal)}</b><span>${ctUnit(x.kind, x.goal)}</span></div>
      ${X.st !== 'draft' ? `<div class="col" style="gap:4px">${bar(x.p * 100 / x.goal, ctDone(x) ? 'sp lg' : 'lg')}<span class="faint num" style="font-size:12.5px">${fmt(x.p)} / ${fmt(x.goal)}${ctDone(x) ? ' · готово' : ''}</span></div>` : ''}
      <p class="ct-what">${K.what}</p>
      <p class="reason">${ctTime(t, c, x)} ${X.st === 'draft' ? 'Считается только сделанное после подписи.' : ''}</p>
      <span class="eyebrow">За это задание</span>
      <div class="row ct-sh-rew">${ctRewShort(Object.assign({}, P, { chest: null }))}${P.spirit ? ctIco('spirit', P.spirit, 'Дух') : ''}</div>
      <p class="reason">+${fmt(x.pts)} ${plural(x.pts, 'очко', 'очка', 'очков')} рейтинга: ${fmt(x.pts - half)} — вам и клану, ${fmt(half)} — в резервуар клана.</p>
      ${TM(`Вид «${x.kind}», группа «${K.grp}», цикл ${ROMAN[c]}. Ёмкость обычного — ${fmt(Math.round(cap[0] / 100))}, увлечённого — ${fmt(Math.round(cap[1] / 100))} в день (${K.pace}); объём — ёмкость × ${t === 'w' ? CT.rar.u10[x.r - 1] / 10 + ' дня' : CT.rar.u10[x.r - 1] + '/70 дня'}, округление; доля дня обычного — ${sh ? sh[x.r - 1][0] / 100 : 0} %, увлечённого — ${sh ? sh[x.r - 1][1] / 100 : 0} %. Выпало на броске ${x.n + 1}, место ${x.slot + 1}. Награда задания — по редкости и циклу, EN_CONTRACTS.rew. Числа — демонстрация.`, 'p', 'reason')}`;
    let foot = '';
    if (X.st === 'draft') {
      const free = S.contracts.rer.free > 0, R = CT.rules.rer;
      foot = `<button class="btn ghost" data-a="ctdrop" data-v="${op}:${t}:${i}">${ic('x')}Убрать</button>${free ? `<button class="btn go" data-a="ctreroll" data-v="${op}:${t}:${i}">${ic('swap')}Заменить · бесплатно</button>`
        : `<button class="btn go" data-a="ctrerollpay" data-v="${op}:${t}:${i}" ${S.contracts.rer.paid >= R.paidCap ? 'disabled' : ''}>${ic('swap')}Заменить${costTag('enerium', R.price)}</button>`}`;
    } else if (X.st === 'signed' && !ctDone(x)) foot = `${TM(`<button class="btn sm" data-a="ctdemo" data-v="task:${t}:${i}">+ прогресс</button>`)}<button class="btn go" data-a="go" data-v="${K.go}"${x.kind === 'dust' ? ' data-seg="hire:souls"' : ''}>К делу ${ic('chev')}</button>`;
    return sheet(X.t === 'w' ? 'Задание недели' : 'Задание дня', body, foot);
  },
  /* награда контракта целиком; заверение ×2 — на награду, очки те же */
  cpool(o) {
    const t = o.arg === 'w' ? 'w' : 'd', X = S.contracts[ctKey(t)], P = X.st === 'paid' && X.got ? X.got.P : ctPool(S, X), pts = X.st === 'paid' && X.got ? X.got.pts : ctPts(X.tasks), half = Math.floor(pts * CT.rules.splitBp / CTB);
    const g = ctMod(S, CT.rules.mods.gold), r = ctMod(S, CT.rules.mods.res);
    const body = `${X.cert ? `<p class="reason ct-x2">${ic('shield')} Заверено: награда ×${CT.rules.cert.mul}, очки — как без заверения.</p>` : ''}
      ${ctRewRows(P)}
      <p class="reason">Очки: ${fmt(pts)} — ${fmt(pts - half)} в рейтинг вам и клану, ${fmt(half)} — в резервуар клана.</p>
      ${g || r ? `<p class="reason">Память Странника: ${g ? `золото +${g / 100} %` : ''}${g && r ? ', ' : ''}${r ? `ресурсы +${r / 100} %` : ''}.</p>` : ''}
      <p class="reason">Всё придёт, когда исполнены все задания. Валюта — в кошелёк, ресурсы и сундук — в запасы.</p>
      ${TM(`Награда — сумма наград заданий по редкости и циклу (${X.t === 'w' ? 'неделя' : 'день'}), EN_CONTRACTS.rew; недельный — ещё сундук ключей редкости самого редкого задания, окно «лестница». Цели наград — доля недельного дохода обычного игрока: ключи с боссами и сундуками рейтинга — 75 % капа рунных стражей, золото 6 %, дух 4 %, базовые 15 % — docs/content/контракты.md.`, 'p', 'reason')}`;
    return sheet(X.t === 'w' ? 'Награда недельного контракта' : 'Награда дневного контракта', body);
  },
  /* заверение: ставка, что удваивается, что сгорает; второй контракт — нельзя */
  ccert(o) {
    const t = o.arg === 'w' ? 'w' : 'd', X = S.contracts[ctKey(t)], Y = S.contracts[ctKey(t === 'w' ? 'd' : 'w')], op = `ct${S.contracts.seq}`;
    const stake = ctStake(S, X), blocked = !X.cert && Y.cert && ['signed', 'done', 'draft'].includes(Y.st) && !ctBoth(), disc = ctDisc();
    const body = `<div class="ct-cert-big"><img src="${curImg('gold')}" alt=""><span class="col" style="gap:2px"><b class="num serif">${fmt(stake)}</b><small class="faint">ставка золотом${disc ? ` · дешевле на ${disc / 100} %` : ''}</small></span></div>
      <div class="ct-rules">
        <p>${ic('check')} Исполните контракт — награда ×${CT.rules.cert.mul}. Очки рейтинга — как без заверения.</p>
        <p>${ic('x')} Сорвёте — ставка сгорит вместе с наградой.</p>
        <p>${ic('hour')} Ставка уходит при подписи.</p>
        <p>${ic('info')} Заверить можно один контракт из двух — дневной или недельный.${ctBoth() ? ' С «Заверенным словом» — оба.' : ''}</p>
      </div>
      ${blocked ? `<p class="reason warn">Уже заверен ${Y.t === 'w' ? 'недельный' : 'дневной'} контракт.</p>` : ''}
      ${TM('Ставка — 2 × золото пула: платишь золотом за второй пул ключей, духа и ресурсов (§18.5: «конверсия золота в ресурсы»). Один контракт из двух — таблица Памяти автора: «Заверенное слово» разрешает оба. Скидки «Печатей» — 10 / 20 / 30 %.', 'p', 'reason')}`;
    const foot = X.st !== 'draft' ? '<span class="reason">Контракт подписан: заверение не меняется.</span>'
      : X.cert ? `<button class="btn" data-a="ctcert" data-v="${op}:${t}:0">Снять заверение</button>`
      : `<button class="btn go" data-a="ctcert" data-v="${op}:${t}:1" ${blocked || !X.tasks.length ? 'disabled' : ''}>Заверить${costTag('gold', stake)}</button>`;
    return sheet('Заверение золотом', body, foot);
  },
  /* шансы редкостей и цены замен */
  codds(o) {
    const t = o.arg === 'w' ? 'w' : 'd', R = CT.rules.rer, C = S.contracts;
    const rows = CT.rar.wBp.map((w, i) => { const r = i + 1, u = CT.rar.u10[i]; return `<div class="ct-orow" data-r="${r}"><span class="rar">${RAR[r]}</span><b class="num">${w / 100} %</b><span class="faint">${t === 'w' ? ctDays(u * 1000) : ctMin(Math.round(u * CT.hours.o * 60 / 70))}</span><span class="num">${CT.rules.points[i]}</span></div>`; }).join('');
    const body = `<p class="reason">Каждое задание пула выпадает само по себе: сначала редкость, потом дело. Выше редкость — больше дело, больше награда и очки. С эпической в награде — Энериум.</p>
      <div class="ct-odds"><div class="ct-orow h"><span>Редкость</span><span>Шанс</span><span>${t === 'w' ? 'Дней игры' : 'Игры в день'}</span><span>Очки</span></div>${rows}</div>
      <p class="reason">Замены: бесплатных сегодня — ${C.rer.free} на оба контракта, дальше — ${R.price} Энериума, не больше ${R.paidCap} в день. Подписанное задание уже не заменить.</p>
      ${TM('Шансы — кривая Памяти §2.6; сетка времени §18.5: неделя — 1 / 1,5 / 2 / 3 / 3,5 / 4 / 5 дня обычной игры, день — те же седьмые доли дня. Потолок платных замен — предложение ради ×1,7 и §36.3.', 'p', 'reason')}`;
    return sheet('Шансы и замены', body);
  },
  /* итог выдачи: что пришло и куда */
  ctgot(o) {
    const t = o.arg === 'w' ? 'w' : 'd', X = S.contracts[ctKey(t)], G = X && X.got;
    if (!G) return '';
    const all = Object.entries(G.items).filter(([id]) => BAG.item(id)).sort((a, b) => b[1] - a[1]), more = all.length - CT_VIEW.gotItems;
    const items = all.slice(0, CT_VIEW.gotItems).map(([id, n]) => `<span class="row" style="gap:4px">${itWell(id, { act: 'noop', size: 30 })}<b class="num">×${fmt(n)}</b></span>`).join('') + (more > 0 ? `<span class="chip">и ещё ${more}</span>` : '');
    const body = `<p class="muted" style="font-size:15px">${X.cert ? `Заверенный контракт исполнен: награда ×${CT.rules.cert.mul}.` : 'Все задания исполнены в срок.'}</p>
      <div class="row" style="gap:14px;flex-wrap:wrap">${money('keys', G.P.keys)}${money('gold', G.P.gold)}${money('spirit', G.P.spirit)}${G.P.en ? money('enerium', G.P.en) : ''}${G.chests.map(c => ctChest(c.r, 1)).join('')}</div>
      ${items ? `<span class="eyebrow">В запасах</span><div class="row" style="gap:10px;flex-wrap:wrap">${items}</div>` : ''}
      <p class="reason">+${fmt(G.pts)} ${plural(G.pts, 'очко', 'очка', 'очков')}: ${fmt(G.pts - G.half)} — в рейтинг, ${fmt(G.half)} — в резервуар клана.</p>`;
    return dialog('Контракт исполнен', body, `${G.chests.length ? '<button class="btn" data-a="go" data-v="craft:stock">В запасы</button>' : ''}<button class="btn go" data-a="close">Хорошо</button>`);
  },
});

/* ================== действия ================== */
const ctRes = (r, ok) => { if (r.again) return; if (r.refuse) { toast(CT_WHY[r.refuse] ? CT_WHY[r.refuse]() : 'Нельзя'); return; } ok(r); };
Object.assign(ACT, {
  /* замена: бесплатная — сразу; платная — подтверждение цены */
  ctreroll(v) {
    const [op, t, i] = String(v).split(':');
    ctRes(CT_SRV.reroll(op, t, +i), r => { S.overlay = null; toast(`Новое задание: ${ctK(r.now.kind).n.toLowerCase()} · ${RAR[r.now.r].toLowerCase()}`); });
  },
  ctrerollpay(v) {
    const R = CT.rules.rer, C = S.contracts;
    if (C.rer.paid >= R.paidCap) return toast(CT_WHY.cap());
    S.overlay = { t: 'confirm', title: 'Заменить задание', text: `Бесплатные замены на сегодня кончились. Замена — ${R.price} Энериума, сегодня можно ещё ${R.paidCap - C.rer.paid}.`, ok: 'Заменить', act: 'ctreroll', v, cost: ['enerium', R.price] };
    render(); focusOverlay();
  },
  ctdrop(v) {
    const [op, t, i] = String(v).split(':');
    ctRes(CT_SRV.drop(op, t, +i), r => { S.overlay = null; toast(`Задание убрано: ${ctK(r.was.kind).n.toLowerCase()}. Контракт меньше — и награда тоже`); });
  },
  ctcert(v) {
    const [op, t, on] = String(v).split(':');
    ctRes(CT_SRV.cert(op, t, on === '1'), r => { S.overlay = null; toast(r.on ? `Заверено: ставка ${fmt(r.stake)} золота уйдёт при подписи` : 'Заверение снято'); });
  },
  /* подпись — через подтверждение: состав, всё или ничего, ставка */
  ctsign(v) {
    const [op, t] = String(v).split(':'), X = S.contracts[ctKey(t)], n = X.tasks.length, pts = ctPts(X.tasks);
    S.overlay = { t: 'confirm', title: X.t === 'w' ? 'Подписать недельный контракт' : 'Подписать дневной контракт',
      text: n ? `${n} ${plural(n, 'задание', 'задания', 'заданий')}, ${fmt(pts)} ${plural(pts, 'очко', 'очка', 'очков')}. Состав больше не изменить. Всё или ничего: не выполните одно к сроку — не будет ничего${X.cert ? ', ставка сгорит' : ''}.`
        : 'Контракт пуст: наград и очков не будет. Подписать всё равно?',
      warn: X.cert ? `Ставка ${fmt(X.stake)} золота уйдёт сейчас.` : '', warnTeam: 'Прогресс — с подписи: наблюдатель сбрасывает снимок (ctObserve), сделанное раньше в счёт не идёт.',
      ok: 'Подписать', act: 'ctsigndo', v: `${op}:${t}`, cost: X.cert ? ['gold', X.stake] : null };
    render(); focusOverlay();
  },
  ctsigndo(v) {
    const [op, t] = String(v).split(':');
    ctRes(CT_SRV.sign(op, t), r => { S.overlay = null; toast(r.n ? 'Контракт подписан. Прогресс пошёл' : 'Пустой контракт подписан'); });
  },
  ctclaim(v) {
    const [op, t] = String(v).split(':');
    ctRes(CT_SRV.claim(op, t), r => { if (!r.got.pts) { S.overlay = null; toast('Пустой контракт закрыт'); return; } S.overlay = { t: 'ctgot', arg: t }; render(); focusOverlay(); });
  },
  /* команда: прогресс без наблюдателя, срок, новый период */
  ctdemo(v) {
    const [what, t, si] = String(v).split(':'), X = S.contracts[ctKey(t)];
    if (what === 'prog' || what === 'all' || what === 'task') {
      if (X.st === 'draft') return toast('Сначала подпишите контракт');
      const list = what === 'task' ? [X.tasks[+si]].filter(Boolean) : X.tasks;
      for (const x of list) CT_SRV.note(x.kind, what === 'all' ? x.goal : Math.max(1, Math.ceil(x.goal * CT_DEMO.progBp / CTB)));
      render(); return;
    }
    if (what === 'soon') { X.left = Math.min(X.left, CT_DEMO.soonS); render(); return; }
    if (what === 'next') { CT_SRV.next(t); S.overlay = null; render(); }
  },
});

/* ================== неделя: итоги в реестр WEEK_MODES (screens/week.js) ==================
   Строка «Контракты» на экране «Неделя»: очки исполненных контрактов недели, личные планки с сундуками ключей, место и лидеры;
   прошлая неделя — «Дары» и валюта недельного контракта. Пороги планок — EN_CONTRACTS.planks: соседние ×2 */
function ctPlanks(pts) {
  const c = ctCyc(), P = CT.planks[c] || [], L = window.EN_LOOTBOXES, ly = L && L.modes.contract ? L.modes.contract.layers.find(l => l.kind === 'plank' && !l.clan) : null;
  return P.map((need, i) => ({ k: i + 1, need, pay: ly && ly.rows[i] ? ly.rows[i].cyc[c] || [] : [], reached: pts >= need }));
}
const ctTop = (need, t) => CT_DEMO.names.map((n, j) => [n, Math.floor(need * (t === 'past' ? CT_DEMO.top[j] * 2 : CT_DEMO.top[j]) / CTB)]);
(window.WEEK_MODES = window.WEEK_MODES || []).push({
  id: 'contract', n: 'Контракты', icon: 38, go: 'contracts', order: 30, unit: ['очко', 'очка', 'очков'],
  now() {
    if (!CT || !S.contracts) return { lock: 'нет данных' };
    if (!ctOpen()) return { lock: `откроются на ${CT.rules.openLevel}-м уровне` };
    const pts = S.contracts.pts, pk = ctPlanks(pts), r = (S.ranks || []).find(x => x[0] === 'Контракты'), place = pts ? (r && Number.isInteger(r[1]) ? r[1] : CT_DEMO.place) : null;
    const D = S.contracts.day, W = S.contracts.week;
    const alert = D.st === 'draft' ? 'Дневной контракт не подписан' : D.st === 'done' || W.st === 'done' ? 'Награда контракта ждёт' : '';
    return { place, points: pts, planks: pk, top: ctTop(pk.length ? pk[pk.length - 1].need : 0, 'now'), alert,
      note: `Недельный: ${{ draft: 'не подписан', signed: `выполнено ${W.tasks.filter(ctDone).length} из ${W.tasks.length}`, done: 'исполнен', paid: 'награда получена', failed: 'сорван', closed: 'приём закрыт' }[W.st]}` };
  },
  past() {
    if (!CT || !S.contracts || !ctOpen()) return { lock: 'нет данных' };
    const c = ctCyc(), P0 = CT.planks[c] || [];
    /* итог прошлой недели — тот, за который платят «Дары» (bag.js): место — из выплаты за место, очки — в пределах взятых планок */
    const rows = typeof darRows === 'function' && S.zp ? darRows(S).filter(p => p.id === 'contract' && p.wk && p.wk.id === 'prev') : [];
    const k = rows.filter(p => p.kind === 'plank').length, placeRow = rows.find(p => p.kind === 'place' && p.place);
    const lo = k ? P0[Math.min(k, P0.length) - 1] : 0, hi = k < P0.length ? P0[k] : lo * 2;
    const pts = rows.length ? lo + Math.floor((hi - lo) * CT_DEMO.past.frac / CTB) : CT_DEMO.past.pts, pk = ctPlanks(pts);
    const place = placeRow ? placeRow.place : CT_DEMO.past.place;
    /* недельный контракт прошлой недели — тот же алгоритм на сиде прошлого периода, заверенный */
    const prev = CTE.offer(CT, ctSpec(S, 'w', 'неделя-' + (S.contracts.weekNo - 1)), ctPoolSize()), P = CTE.reward(CT, 'w', c, prev, CT.rules.cert.mul);
    return { place, points: pts, planks: pk, top: ctTop(pk.length ? pk[pk.length - 1].need : 0, 'past'),
      rewards: rows.map(p => ({ label: p.label, box: p.box, groups: p.groups.map(g => ({ r: g.r, count: g.count, win: g.win })), st: p.st, cat: p.cat, kind: p.kind })),
      cur: [['keys', P.keys], ['gold', P.gold], ['spirit', P.spirit], ['enerium', P.en]].filter(x => x[1] > 0) };
  },
});

/* ================== раздел UI-кита ================== */
function ctKitHtml() {
  if (!CT || !CTE) return '';
  const c = ctCyc(), e = CT.econ[c];
  const ladder = CT.rar.wBp.map((w, i) => `<figure>${ICON('r' + (i + 1), 34, RAR[i + 1])}<figcaption>${RAR[i + 1]}<br><b class="num">${w / 100} %</b> · ${CT.rules.points[i]} оч.</figcaption></figure>`).join('');
  const demoX = { t: 'd', st: 'draft', tasks: [] }, mk = (kind, r, p) => ({ kind, r, goal: CT.vol.d[c][kind] ? CT.vol.d[c][kind][r - 1] || 1 : 1, p, pts: CT.rules.points[r - 1], slot: 0, n: 0 });
  const sample = [['floors', 1, 0], ['echoAtk', 4, 0], ['guard', 7, 0]].filter(([k]) => CT.vol.d[c][k]).map(([k, r]) => mk(k, r, 0));
  const cardOf = (x, st) => { const X = Object.assign({}, demoX, { st, tasks: [x] }); return ctCard(X, x, 0).replace(/data-a="[^"]*"/g, 'data-a="noop"'); };
  const states = sample.length ? `<div class="ct-kit-cards">${cardOf(sample[0], 'draft')}${cardOf(Object.assign({}, sample[1] || sample[0], { p: Math.floor((sample[1] || sample[0]).goal / 2) }), 'signed')}${cardOf(Object.assign({}, sample[2] || sample[0], { p: (sample[2] || sample[0]).goal }), 'signed')}</div>` : '';
  const rew = t => `<table class="p-table ct-kt"><thead><tr><th>Редкость</th><th>Ключи</th><th>Золото</th><th>Дух</th><th>Базовые</th><th>Энериум</th></tr></thead><tbody>${CT.rew[t][c].map((w, i) => `<tr><td>${rar(i + 1)}</td><td class="n">${w.keys}</td><td class="n">${fmt(w.gold)}</td><td class="n">${fmt(w.spirit)}</td><td class="n">${w.base}</td><td class="n">${w.en || '—'}</td></tr>`).join('')}</tbody></table>`;
  const kinds = Object.values(CT.groups).map(g => `<span class="chip">${g}</span>`).join('');
  return `<section class="k-box ct-kit" style="grid-column:1/-1" id="kitContracts"><h3>Контракты</h3>
    <p class="k-note">День и неделя: по одному контракту за период. Пул заданий — ${CT.rules.pool.base} по умолчанию, растёт «Доской объявлений» и Памятью. Каждое задание выпадает само по себе: редкость, потом дело; замена — рыбалка за редкостью. Подпись фиксирует состав, прогресс — с подписи, всё или ничего. Заверение золотом — награда ×${CT.rules.cert.mul}, очки те же.${TM(' §18, ADR-0028 и таблицы автора. Данные — design/ui/contracts.js, сборщик tools/content-gen/contracts/build.js, черновик docs/content/контракты.md. Экран — screens/contracts.js.')}</p>
    <div class="ct-kg">
      <div class="k-air-r"><b>Редкость — шанс и очки</b><div class="k-row ct-kit-lad">${ladder}</div><small>Выше редкость — дольше дело: неделя — от 1 до 5 дней обычной игры, день — те же седьмые доли дня. С эпической — Энериум.</small></div>
      <div class="k-air-r"><b>Карточка задания</b>${states}<small>Картинка раздела, кристалл редкости, цель. До подписи — одно действие «Заменить»; после — полоса прогресса и «К делу». Подробности — лист.</small></div>
    </div>
    <div class="ct-kg">
      <div class="k-air-r"><b>Награда задания · день, цикл ${ROMAN[c]}</b>${rew('d')}<small>Контракт платит суммой наград своих заданий, когда исполнены все.</small></div>
      <div class="k-air-r"><b>Награда задания · неделя, цикл ${ROMAN[c]}</b>${rew('w')}<small>Недельный — ещё сундук ключей редкости самого редкого задания.</small></div>
    </div>
    <div class="k-air-r"><b>Группы дел — в контракте одна на группу</b><div class="row" style="flex-wrap:wrap;gap:6px">${kinds}</div></div>
    ${TM(`<p class="k-note">Прогон калькулятора, цикл ${ROMAN[c]}: обычный исполняет дневной в ${e.o.dayDoneBp / 100} % дней, недельный — в ${e.o.weekDoneBp / 100} %; ключей в неделю со всех источников — ${fmt(e.o.keys)} из капа ${fmt(e.capKeys)}; очков — ${fmt(e.o.pts)}, Энериума — ${fmt(e.o.en)} в неделю. Увлечённый — ${fmt(e.e.keys)} ключей, ${fmt(e.e.pts)} очков. Плательщик при том же времени — не быстрее ×${e.x17 / 100}. Пороги планок — ${CT.planks[c].map(fmt).join(' / ')}.</p>`)}
  </section>`;
}
/* перерисовка раздела при смене режима «Игрок / Команда» */
let ctKitWatch = false;
function ctKitPaint() {
  if (ctKitWatch || typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.documentElement) return;
  ctKitWatch = true;
  let was = !!KH.team;
  new MutationObserver(() => { if (!!KH.team === was) return; was = !!KH.team; const el = document.getElementById('kitContracts'); if (el) el.outerHTML = ctKitHtml(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: ctKitHtml, paint: ctKitPaint });
/* карта экранов: экран «Контракты» готов — поле ready карточки «Контракты» в MAP (index.html) */

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Контракт дня · составить и подписать', 'Пул на сиде, замена, заверение золотом и подпись: всё или ничего, прогресс — с подписи',
    () => { S.route = 'contracts'; S.seg.contracts = 'day'; S.overlay = null; }],
  ['Контракт недели · исполнен', 'Все задания выполнены: награда ×2 за заверение, сундук ключей, очки — в рейтинг и резервуар клана',
    () => { S.route = 'contracts'; S.seg.contracts = 'week'; S.overlay = null; const W = S.contracts.week; if (W.st === 'signed') { W.tasks.forEach(x => CT_SRV.note(x.kind, x.goal)); } }],
  ['Контракт · сорван к сроку', 'Срок вышел, одно задание не выполнено: наград и очков нет, ставка сгорела',
    () => {
      S.route = 'contracts'; S.seg.contracts = 'day'; S.overlay = null;
      const D = S.contracts.day;
      if (D.st === 'draft' && D.tasks.length) { CT_SRV.sign(`ct${S.contracts.seq}`, 'd'); CT_SRV.note(D.tasks[0].kind, D.tasks[0].goal); }
      D.left = 0; CT_SRV.expire();
    }],
);
