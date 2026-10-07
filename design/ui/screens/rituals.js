/* screens/rituals.js — «Неделя → Ритуалы»: ритуалы и рабочие (§19 GDD). Договор — screens/model.js.
   Регистрирует: SCREENS.rituals — слоты сверху, вкладки «Рабочие» и «Герои» сегментами шапки, карточки дневного пула;
   листы OV.ritual (старт: кто, какой ритуал, время, награда), OV.rtslot (идущий ритуал, отмена), OV.rtart (артель рабочих,
   пробуждение из шардов), OV.rtgot (сбор с короткой анимацией выдачи); действия ACT.rt*; раздел UI-кита через KIT_EXTRA;
   сценарии презентации. На карте экранов экран отмечен готовым — поле ready карточки «Ритуалы» (MAP в index.html).
   Своё состояние — S.rituals (заводится как S.bag). Поля слотов st (free / run / ready), uid, n, kind, r, ppl читают Убежище,
   значок шахты «Неделя», строка «Ритуалы» в «Неделе» (week.js), Входящие и наблюдатель контрактов (contracts.js оборачивает
   ACT.rclaim — этот файл подключён раньше него). Занятость героев — rtBusyNote: её спрашивает busyNote в index.html.
   Данные — EN_RITUALS (design/ui/rituals.js, собирает tools/content-gen/rituals/build.js): сетка, бригады, награды, слоты, роллы,
   артефакты; алгоритм пула и исхода — EnRitual (tools/content-gen/rituals/pool.js, лежит там же).
   Правила §19: слоты общие на две вкладки; карточка — лот дневного пула: взял — он твой, отменил — пропал; провала нет, награда
   решена при старте; рабочие ускоряют ритуал редкостью, герои — нет; души — только с вкладки героев; уникальный ритуал —
   только в дневном пуле и бесплатных роллах; Энериум покупает роллы, не время.
   Сервер решает, клиент показывает: пул — на сиде игрока, дня и номера ролла; старт, сбор, отмена, ролл и пробуждение — операции
   RT_SRV с номером: проверка, расход и итог одним вызовом, повтор того же номера ничего не повторяет. Время — целые миллисекунды
   часов «сервера» S.rituals.now; в игре их ведёт сервер, здесь — таймер прототипа раз в секунду.
   Ступени загрузки (ADR-0047): мера — загрузка своих мест за неделю, целые проценты: часы завершённых ритуалов по карточкам /
   часы мест недели (EnRitual.load, capMs — pool.js); счёт недели ведёт «сервер» — S.rituals.wk. Пороги ступеней и сундуки артели —
   EN_LOOTBOXES.modes.ritual. На экране — полоса «Загрузка недели» под карточками и лист OV.rtload: ступени — общим помощником
   EN_WEEK.ladderHtml (screens/week.js), без него — списком своей полосы. Неделе режим сообщает себя сам — WEEK_MODES, id ritual:
   загрузка и ступени; взятые ступени платят «Дары» (bag.js).
   Служебное — только команде: TM, PL, tmT из index.html. Автопроверка — tools/content-gen/screens/check_rituals.js. */
'use strict';

/* ================== данные экрана: демонстрация, не баланс ================== */
const RT_DEMO = {
  seed: 'демо-странник',                 // сид игрока: в игре его выдаёт сервер
  day: 371,                              // номер серверного дня — сид пула: у рабочих есть уникальный, у героев — ритуал на ночь
  at: 16 * 3600000 + 48 * 60000,         // «сейчас» — 16:48 серверного дня, мс от его начала: один календарь демо (ADR-0031, п. 17)
  artel: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 3],   // рабочие демо по редкостям к 11-му дню цикла II: первая артель и шарды сундуков — 14, чуть выше
                                         // темпа обычного (11 к концу цикла II, docs/content/ритуалы.md): десять свободных обычных — показ перековки 10 → 1
  done: 65,                              // завершено ритуалов к 11-му дню цикла II: прогон ритуалов обычного — 5,9 в день
  /* слоты демо: готовый пришёл, пока вас не было, — у него письмо во Входящих; второй идёт. ago — сколько мс назад начат.
     Бригады набираются по времени старта: идущий начат раньше и взял лучших, готовый — из оставшихся, короче и уже кончился;
     одна бригада в двух ритуалах разом не бывает (check_rituals.js) */
  slots: [
    { st: 'ready', tab: 'work', r: 5, crew: 3, biome: 'b2', band: 'long', nm: 0, ago: 175 * 60000 },
    { st: 'run', tab: 'work', r: 6, crew: 3, biome: 'b3', band: 'long', nm: 1, ago: 3 * 3600000 },
  ],
  skip: [3600000, 3 * 3600000, 12 * 3600000],   // команда: перемотка времени
  give: { r: 2, n: 10 },                        // команда: шарды рабочих для пробуждения
  /* ступени загрузки: идёт четвёртый день недели (тот же календарь демо); до сессии завершено ритуалов на doneH часов по карточкам —
     темп обычного игрока цикла II: срединная неделя — 56 % мест (EN_RITUALS.ladder.load). С готовым ритуалом демо выходит 31 % трёх
     мест: первая ступень взята, до второй — рукой подать */
  week: { day: 4, doneH: 154 },
  past: { fracBp: 6000 },                       // прошлая неделя: доля пути от взятой ступени к следующей — те же 56 %
};
/* вид: моменты анимации сбора, мс от её начала; сколько предметов показать в итоге, остальное — числом; chest — сундук ступени в полосе
   загрузки и в листе, px; order — место строки «Ритуалы» в реестре Недели, icon — её картинка пути */
const RT_VIEW = { flip: 520, first: 560, step: 140, end: 1400, items: 6, crystal: 18, chest: 20, chestRow: 28, order: 70, icon: 33 };

/* ================== помощники ================== */
const RT = window.EN_RITUALS || null, RTE = window.EnRitual || null;
const RT_DAY = 24 * 3600000, RT_HOUR = 3600000;   // мс в сутках и часе
const rtLv = (s, id) => s && s.wn && s.wn.art && s.wn.art[id] != null ? Math.max(0, s.wn.art[id]) : 0;
const rtOpen = (s = S) => !!RT && !!RTE && s.acc.level >= RT.rules.open.level && s.acc.cycle >= RT.rules.open.cycle;
const rtSlotsN = (s = S) => RTE.slots(RT, rtLv(s, RT.rules.slots.art));
const rtFreeN = (s = S) => RTE.freeRolls(RT, rtLv(s, RT.rules.rolls.art));
const rtCardsN = (s = S) => RTE.cardsN(RT, rtLv(s, RT.rules.cards.art));
const rtTab = t => t === 'hero' ? 'hero' : 'work';
const rtList = (t, s = S) => s.rituals[rtTab(t)];
/* время: «4 ч 55 мин» из мс; часы «сервера» — «21:40» */
function rtDur(ms) { const m = Math.max(0, Math.ceil(ms / 60000)); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} ч ${r} мин` : `${h} ч`) : `${r} мин`; }
const rtHm = ms => { const m = Math.floor((((ms % RT_DAY) + RT_DAY) % RT_DAY) / 60000); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const rtLeft = x => Math.max(0, x.t1 - S.rituals.now);
/* открытые биомы: пройденные и рубеж спуска — туда рабочие знают дорогу */
const rtOpenBiomes = (s = S) => RTE.openW(RT, (s.biomes || []).filter(b => b.state !== 'lock').map(b => b.id));
/* ресурсы исхода — из recipes.js: общий пул базовых, шесть ключей биома, уникальный хозяина */
const rtLists = b => ({ basic: poolItems().map(i => i.id), key: biomeItems('key', b).map(i => i.id), unique: biomeItems('unique', b).map(i => i.id) });
/* герои аккаунта: отряд прототипа и купленные (heroes.js) */
const rtHeroesAll = () => typeof hrMine === 'function' ? hrMine() : S.heroes;
/* рабочие артели: заняты те, кто в идущем ритуале; свободные — по редкости сверху */
const rtBusyW = () => new Set(S.rituals.slots.filter(x => x.st === 'run' && x.kind === 'work').flatMap(x => x.crew));
const rtFreeW = () => { const b = rtBusyW(); return S.rituals.artel.filter(w => !b.has(w.id)).sort((a, c) => c.r - a.r || (a.id < c.id ? -1 : 1)); };
/* бригада рабочих для карточки: лучшие свободные — сервер назначает сам, допуск — только количество (§19.1) */
const rtCrewW = card => rtFreeW().slice(0, card.crew);
const rtTime = (card, crew) => RTE.time(RT, card, card.tab === 'work' ? crew.map(w => w.r) : []);
/* шарды рабочих — в запасах сундуков (bag.js): S.zp.extra, ключ «wsh:w<редкость>:<редкость>» */
const rtShardKey = r => `wsh:w${r}:${r}`;
const rtShards = r => (S.zp && S.zp.extra ? S.zp.extra[rtShardKey(r)] || 0 : 0);
/* сколько: пул карточек и роллы дня */
const rtCost = n => RT.rules.rolls.paid[n];

/* ================== ступени загрузки (ADR-0047) ==================
   Мера и её счёт — данные и алгоритм ритуалов (EN_RITUALS.rules.ladder, EnRitual.weekMs / capMs / load / stepOf). Пороги ступеней
   и сундуки артели — режим лестницы в EN_LOOTBOXES.modes: строки своей полосы собирает EnLoot.ladder. В игре счёт ведёт сервер */
const rtMode = () => (RT && RT.rules.ladder ? RT.rules.ladder.mode : '');
const rtLadOn = () => !!(rtMode() && RTE && RTE.load && window.EN_LOOTBOXES && EN_LOOTBOXES.modes[rtMode()] && window.EnLoot && EnLoot.ladder);
const rtRace = (s = S) => String((s.week && s.week.race) || '');
/* ступени своей полосы: { k, band, i, at, pay } — порог at в процентах загрузки */
const rtLadRows = (s = S) => (rtLadOn() ? EnLoot.ladder(EN_LOOTBOXES, rtMode(), s.acc.cycle).filter(x => x.at != null && !x.cap) : []);
/* загрузка недели, целые проценты */
const rtLoad = (s = S) => { const W = s.rituals && s.rituals.wk; return W ? RTE.load(W.done, W.cap) : 0; };
/* взятая ступень остаётся взятой: место, открытое посреди недели, прибавляет часов мест — загрузка на миг ниже, ступень — нет */
function rtLatch(s = S) { const W = s.rituals.wk; W.top = Math.max(W.top, RTE.stepOf(rtLadRows(s).map(x => x.at), rtLoad(s))); }
/* новая неделя «сервера»: часы недели — weekH от t0 на часах ритуалов; места — сколько их сейчас; done — уже завершено, мс */
function rtWeekNew(s, t0, done) {
  const R = s.rituals;
  R.wk = { no: R.wk ? R.wk.no + 1 : 1, race: rtRace(s), t0, t1: t0 + RTE.weekMs(RT), done: done || 0, cap: RTE.capMs(RT, rtSlotsN(s)), top: 0 };
  rtLatch(s);
}
/* неделя расы сменилась — счёт с нуля, как у Событий и клана */
function rtWeekSync() { const R = S.rituals; if (rtLadOn() && R.wk && R.wk.race !== rtRace()) rtWeekNew(S, R.now, 0); }
/* ритуал досыпался: его время по карточке — в счёт недели, в которую он закончился; один раз */
function rtCredit(x) {
  const W = S.rituals.wk;
  if (!W || x.wk || !(x.t1 >= W.t0 && x.t1 < W.t1)) return;
  x.wk = W.no; W.done += x.nominal; rtLatch();
}
/* ступени игрока для экрана, Недели и «Даров»: { k, band, i, need, pay, reached, cap } — общим помощником Недели (EN_WEEK.steps), без
   него — своя полоса. reached — по счёту «сервера»: взятая ступень */
function rtSteps(s = S) {
  if (!rtLadOn() || !s.rituals || !s.rituals.wk) return [];
  const W = window.EN_WEEK, top = s.rituals.wk.top;
  let rows = null;
  if (s === S && W && typeof W.steps === 'function') { try { rows = W.steps(rtMode(), { have: rtLoad(s), cycle: s.acc.cycle }); } catch (_) { rows = null; } }
  if (!Array.isArray(rows) || !rows.length) rows = rtLadRows(s).map(x => ({ k: x.k, band: x.band, i: x.i, need: x.at, pay: x.pay, cap: false }));
  return rows.filter(x => x && Number.isInteger(x.need)).map(x => Object.assign({}, x, { reached: x.k <= top }));
}

/* занятость героя ритуалом — её спрашивает busyNote (index.html): «Ритуал · Долгая дорога» */
function rtBusyNote(id) {
  if (!S || !S.rituals) return '';
  const x = S.rituals.slots.find(s => s.st === 'run' && s.kind === 'hero' && s.crew.includes(id));
  return x ? `Ритуал · ${x.n}` : '';
}

/* ================== состояние ==================
   S.rituals: seed — сид игрока; day — серверный день; now — часы «сервера», мс; slots — слоты: { st: 'free' } или идущий и готовый
   ритуал { st, uid, n, kind, r, ppl, biome, unique, cyc, card, crew, t0, t1, got }; work, hero — карточки дневного пула вкладок
   { id, tab, r, crew, biome, unique, nm, n, ms, paid, taken }; roll — сколько роллов сделано во вкладке за день (номер ролла — часть
   сида); free — бесплатных роллов осталось; paid — платных сделано; artel — рабочие { id, r }; srv — итоги операций по номерам,
   seq — номер следующей; done — завершено ритуалов; log — выданное; pick — выбор героев в листе старта; last — итог сбора для окна;
   fx — момент начала анимации сбора */
function rtFresh(s, tab, paid, daily) {
  const R = s.rituals, keep = daily ? [] : R[tab].filter(x => x.unique && !x.taken);
  const cards = RTE.pool(RT, { seed: R.seed, day: R.day, tab, roll: R.roll[tab], paid, n: rtCardsN(s) - keep.length, open: rtOpenBiomes(s), uniqueOk: !keep.length });
  R[tab] = keep.concat(cards);
}
function rtDemoCard(D) {
  const T = RT.tabs[D.tab], band = { short: 0, mid: 1, long: 2 }[D.band], list = T.names[band];
  return { id: `демо-${D.tab}-${D.r}-${D.nm}`, tab: D.tab, r: D.r, crew: D.crew, biome: D.biome || null, unique: false, nm: D.nm, n: list[D.nm % list.length], ms: T.ms[D.r - 1], paid: false, taken: true };
}
function rtState(s) {
  if (!RT || !RTE) return s;
  const R = s.rituals = { seed: RT_DEMO.seed, day: RT_DEMO.day, now: RT_DEMO.day * RT_DAY + RT_DEMO.at, slots: [], work: [], hero: [], roll: { work: 0, hero: 0 },
    free: 0, paid: 0, artel: RT_DEMO.artel.map((r, i) => ({ id: 'wk' + (i + 1), r })), srv: {}, seq: 1, done: RT_DEMO.done, log: [], pick: null, last: null, fx: null, uid: 0 };
  R.slots = Array.from({ length: rtSlotsN(s) }, () => ({ st: 'free' }));
  R.free = rtFreeN(s);
  rtFresh(s, 'work', false, true); rtFresh(s, 'hero', false, true);
  /* демо: готовый и идущий ритуалы — тем же стартом сервера, только в прошлом. Бригада — лучшие рабочие, свободные в миг старта:
     кто в ту минуту был в другом ритуале демо (он уже мог стать готовым), тот занят — у каждого ритуала своя бригада */
  const letters = [], order = RT_DEMO.slots.map((D, k) => k).filter(k => k < R.slots.length).sort((a, b) => RT_DEMO.slots[b].ago - RT_DEMO.slots[a].ago);
  for (const k of order) {   // по времени старта: раньше начатый набирает бригаду первым
    const D = RT_DEMO.slots[k], t0 = R.now - D.ago, busy = new Set(R.slots.filter(x => x.st !== 'free' && x.kind === 'work' && x.t0 <= t0 && t0 < x.t1).flatMap(x => x.crew));
    const card = rtDemoCard(D), crew = R.artel.filter(w => !busy.has(w.id)).sort((a, b) => b.r - a.r).slice(0, card.crew);
    const x = rtMake(s, card, crew.map(w => w.id), crew, t0);
    if (D.st === 'ready') { x.st = 'ready'; letters.push(rtLetter(x)); }
    R.slots[k] = x;
  }
  s.inbox = letters.concat((s.inbox || []).filter(m => !m.rit));
  /* счёт недели: неделя началась RT_DEMO.week.day − 1 суток назад, в полночь; завершённое до сессии и готовый ритуал демо — уже в счёте */
  if (rtLadOn()) {
    const ready = R.slots.filter(x => x.st === 'ready');
    rtWeekNew(s, (R.day - (RT_DEMO.week.day - 1)) * RT_DAY, RT_DEMO.week.doneH * RT_HOUR + ready.reduce((a, x) => a + x.nominal, 0));
    for (const x of ready) x.wk = R.wk.no;
  }
  return s;
}
/* ритуал в слоте: исход решён при старте на сиде карточки — какие именно ресурсы, узнают при сборе */
function rtMake(s, card, ids, crewW, t0) {
  const R = s.rituals, cyc = s.acc.cycle, ms = RTE.time(RT, card, card.tab === 'work' ? crewW.map(w => w.r) : []);
  const got = RTE.resolve(RT, card, cyc, RTE.seedOf(`${R.seed}|${card.id}|исход`), card.tab === 'work' ? rtLists(card.biome) : { basic: [], key: [], unique: [] });
  return { st: 'run', uid: 'rt' + (++R.uid), n: card.n, kind: card.tab, r: card.r, ppl: card.crew, biome: card.biome, unique: !!card.unique, cyc,
    card: card.id, crew: ids.slice(), t0, t1: t0 + ms, ms, nominal: card.ms, got };
}
/* письмо «пока вас не было» (Входящие): забирает награду ритуала, ритуал и письмо закрываются вместе */
const rtLetter = x => ({ id: 'rt-' + x.uid, k: 'away', t: `Ритуал «${x.n}» готов`, s: x.kind === 'hero' ? 'Герои вернулись со службы' : x.unique ? 'Рабочие нашли след хозяина биома' : 'Рабочие вернулись с добычей', rew: [], rit: x.uid, go: 'rituals' });
const rtInitBase = initialState;
initialState = function () { return rtState(rtInitBase()); };
rtState(S);
/* слотов больше — артефакт прокачан: новые слоты свободны; идущие не трогаем. Новое место входит в часы мест недели с этого часа */
function rtSync() {
  if (!S || !S.rituals || !RT) return;
  const R = S.rituals, n = rtSlotsN(), add = n - R.slots.length;
  while (R.slots.length < n) R.slots.push({ st: 'free' });
  if (add > 0 && R.wk && RTE.capMs) R.wk.cap += RTE.capMs(RT, 0, add, R.wk.t1 - R.now);
}

/* ================== «сервер» ==================
   Старт, сбор, отмена, ролл и пробуждение — одним вызовом: проверка, изменение и итог. Номер операции несут кнопки:
   повтор того же номера возвращает прежний итог и ничего не меняет. Отказ не записывается — следующая попытка идёт с тем же номером. */
const RT_SRV = {
  run(op, f) {
    const R = S.rituals, O = R.srv;
    if (O[op]) return Object.assign({ again: true }, O[op]);
    const r = f();
    if (!r.refuse) { O[op] = r; R.seq++; }
    return r;
  },
  /* часы: готовые ритуалы — по порядку срока, каждый — в счёт своей недели (ступени загрузки); новый серверный день — новый пул
     и бесплатные роллы; сменилась неделя расы — счёт недели с нуля */
  tick() {
    const R = S.rituals; let changed = false;
    rtWeekSync();
    for (const x of R.slots.filter(y => y.st === 'run' && R.now >= y.t1).sort((a, b) => a.t1 - b.t1)) { x.st = 'ready'; rtCredit(x); changed = true; }
    while (R.now >= (R.day + 1) * RT_DAY) { RT_SRV.newDay(); changed = true; }
    return changed;
  },
  newDay() {
    const R = S.rituals;
    R.day++; R.roll = { work: 0, hero: 0 }; R.free = rtFreeN(); R.paid = 0; R.pick = null;
    rtFresh(S, 'work', false, true); rtFresh(S, 'hero', false, true);
  },
  /* перемотка часов: всё, что досыпалось за это время, — письмом «пока вас не было» */
  advance(ms) {
    const R = S.rituals, was = new Set(R.slots.filter(x => x.st === 'ready').map(x => x.uid));
    R.now += ms; RT_SRV.tick();
    const fresh = R.slots.filter(x => x.st === 'ready' && !was.has(x.uid));
    for (const x of fresh) if (!S.inbox.some(m => m.rit === x.uid)) S.inbox.unshift(rtLetter(x));
    return fresh.length;
  },
  /* старт: карточка дневного пула — лот; свободный слот; бригада — рабочие лучшие свободные, герои — выбранные свободные */
  start(op, tab, i, ids) {
    return RT_SRV.run(op, () => {
      if (!rtOpen()) return { refuse: 'closed' };
      rtSync(); RT_SRV.tick();
      const R = S.rituals, card = R[tab] && R[tab][i];
      if (!card) return { refuse: 'none' };
      if (card.taken) return { refuse: 'taken' };
      const k = R.slots.findIndex(x => x.st === 'free');
      if (k < 0) return { refuse: 'slots' };
      let crewW = [], who = [];
      if (tab === 'work') {
        crewW = rtCrewW(card);
        if (crewW.length < card.crew) return { refuse: 'workers' };
        who = crewW.map(w => w.id);
      } else {
        const heroes = rtHeroesAll().map(h => h.id), uniq = [...new Set(ids || [])];
        if (uniq.length !== card.crew) return { refuse: 'crew' };
        if (uniq.some(id => !heroes.includes(id))) return { refuse: 'crew' };
        if (uniq.some(id => busyNote(id))) return { refuse: 'busy' };
        who = uniq;
      }
      const x = rtMake(S, card, who, crewW, R.now);
      card.taken = true; R.slots[k] = x; R.pick = null;
      return { ok: 'start', k, uid: x.uid, n: x.n, ms: x.ms, t1: x.t1 };
    });
  },
  /* сбор: слот освобождается до выдачи — повтор ничего не выдаст; письмо о готовом ритуале уходит вместе с ним */
  claim(op, k) {
    return RT_SRV.run(op, () => {
      RT_SRV.tick();
      const R = S.rituals, x = R.slots[k];
      if (!x || x.st === 'free') return { refuse: 'none' };
      if (x.st !== 'ready') return { refuse: 'early' };
      R.slots[k] = { st: 'free' };
      S.inbox = S.inbox.filter(m => m.rit !== x.uid);
      for (const [c, n] of x.got.cur) S.wallet[c] = (S.wallet[c] || 0) + n;
      for (const [id, n] of Object.entries(x.got.items)) BAG.add(id, n);
      R.done++;
      const rec = { uid: x.uid, n: x.n, kind: x.kind, r: x.r, unique: x.unique, cur: x.got.cur.map(c => c.slice()), items: Object.assign({}, x.got.items), nominal: x.nominal, crew: x.crew.length };
      R.log.push(rec); R.last = rec;
      if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') { try { window.dispatchEvent(new CustomEvent('en-ritual', { detail: rec })); } catch (_) { } }
      return { ok: 'claim', k, rec };
    });
  },
  /* отмена: участники свободны сразу, награды нет, карточка из пула пропала — лот потерян (§19.5) */
  cancel(op, k) {
    return RT_SRV.run(op, () => {
      RT_SRV.tick();
      const R = S.rituals, x = R.slots[k];
      if (!x || x.st !== 'run') return { refuse: x && x.st === 'ready' ? 'ready' : 'none' };
      R.slots[k] = { st: 'free' };
      return { ok: 'cancel', k, n: x.n };
    });
  },
  /* ролл вкладки: бесплатные — первыми, дальше Энериум по цене из данных; невзятое меняется, уникальный остаётся до конца дня */
  roll(op, tab) {
    return RT_SRV.run(op, () => {
      if (!rtOpen()) return { refuse: 'closed' };
      const R = S.rituals, free = R.free > 0;
      if (!free && R.paid >= RT.rules.rolls.paid.length) return { refuse: 'cap' };
      const price = free ? 0 : rtCost(R.paid);
      if (!free && S.wallet.enerium < price) return { refuse: 'enerium' };
      if (free) R.free--; else { R.paid++; S.wallet.enerium -= price; }
      R.roll[tab]++;
      rtFresh(S, tab, !free, false);
      R.pick = null;
      return { ok: 'roll', tab, paid: price };
    });
  },
  /* пробуждение рабочего: шардов — комплект, душ — цена его редкости */
  awaken(op, r) {
    return RT_SRV.run(op, () => {
      const need = RT.rules.shardsPer, cost = RTE.awaken(RT, r);
      if (!(r >= 1 && r <= 7)) return { refuse: 'none' };
      if (rtShards(r) < need) return { refuse: 'shards' };
      if (S.wallet.souls < cost) return { refuse: 'souls' };
      const key = rtShardKey(r);
      S.zp.extra[key] -= need; if (!S.zp.extra[key]) delete S.zp.extra[key];
      S.wallet.souls -= cost;
      const R = S.rituals, id = 'wk' + (R.artel.length + 1) + '-' + R.seq;
      R.artel.push({ id, r });
      return { ok: 'awaken', r, cost, id };
    });
  },
};
const RT_WHY = {
  closed: () => `Ритуалы откроются на ${RT.rules.open.level}-м уровне Странника, со вторым циклом.`,
  none: () => 'Этого ритуала больше нет.',
  taken: () => 'Этот ритуал уже начат: лот взят.',
  slots: () => 'Все слоты заняты. Заберите готовый ритуал или дождитесь конца.',
  workers: () => 'Не хватает свободных рабочих.',
  crew: () => 'Выберите столько героев, сколько просит ритуал.',
  busy: () => 'Кто-то из героев уже занят.',
  early: () => 'Песок ещё сыплется.',
  ready: () => 'Ритуал уже готов — его можно только забрать.',
  cap: () => `Роллов за Энериум сегодня больше нет: не больше ${RT.rules.rolls.paid.length} в день.`,
  enerium: () => 'Не хватает Энериума.',
  shards: () => `Нужно ${RT.rules.shardsPer} шардов одной редкости.`,
  souls: () => 'Не хватает душ.',
};
/* часы прототипа: в игре их ведёт сервер. Готовые ритуалы и новый день — перерисовка; отсчёт — текстом без перерисовки */
if (typeof setInterval === 'function') setInterval(() => {
  if (!S || !S.rituals || !RT) return;
  S.rituals.now += 1000;
  if (RT_SRV.tick()) { render(); return; }
  if (typeof document !== 'undefined' && document.querySelectorAll) document.querySelectorAll('[data-rt-left]').forEach(e => { const x = S.rituals.slots.find(s => s.uid === e.dataset.rtLeft); if (x) e.textContent = rtDur(rtLeft(x)); });
}, 1000);
if (typeof addEventListener === 'function') addEventListener('en-render', () => { if (S && S.rituals) rtSync(); });

/* ================== вид ================== */
const rtCrystal = (r, px = RT_VIEW.crystal) => `<span class="rt-cr" data-r="${r}" title="${RAR[r]}">${ICON('r' + r, px, RAR[r])}</span>`;
/* рабочий артели — фигура (wkIcon, screens/art-icons.js) в кружке своей редкости с кристаллом; без арта — кристалл */
function rtWorker(r, px = 30) {
  const art = typeof wkIcon === 'function' ? wkIcon(px, '') : '';
  return art ? `<span class="rt-wk" data-r="${r}" style="--px:${px}px" title="${RAR[r]} рабочий">${art}<i>${ICON('r' + r, Math.max(10, Math.floor(px * 2 / 5)), '')}</i></span>` : rtCrystal(r, px);
}
const rtChipTime = ms => `<span class="chip rt-time">${ic('hour')}${rtDur(ms)}</span>`;
const rtChipCrew = n => `<span class="chip rt-crew" title="Участников: ${n}">${ic('users')}${n}</span>`;
const rtUniqItem = b => biomeItems('unique', b)[0] || null;
/* награда числами: у героев — главное число души, золото и дух значками; у рабочих — базовые и ключи; уникальный — ресурс хозяина */
function rtRewCard(card) {
  const A = RTE.amount(RT, card, S.acc.cycle);
  if (card.tab === 'hero') {
    const souls = (A.cur.find(c => c[0] === 'souls') || [0, 0])[1];
    return `<span class="rt-num" title="Души"><img src="${curImg('souls')}" alt="Души"><b class="num">${fmt(souls)}</b></span><span class="rt-also" title="Ещё золото и дух"><img src="${curImg('gold')}" alt="Золото"><img src="${curImg('spirit')}" alt="Дух"></span>`;
  }
  if (card.unique) { const u = rtUniqItem(card.biome); return u ? `<span class="rt-num">${itWell(u.id, { stat: true, size: 30 })}<b class="num">×${A.uniq}</b></span>` : ''; }
  return `<span class="rt-num" title="Базовые ресурсы общего пула">${ic('gem')}<b class="num">${fmt(A.basics)}</b></span>${A.keys ? `<span class="rt-num" title="Ключи ремёсел биома">${ic('key')}<b class="num">${fmt(A.keys)}</b></span>` : ''}`;
}
/* награда строками листа: всё, что придёт */
function rtRewRows(card, cyc) {
  const A = RTE.amount(RT, card, cyc), row = (img, n, v, note = '') => `<div class="rt-rrow">${img}<span class="n">${n}${note ? `<small>${note}</small>` : ''}</span><b class="num">${v}</b></div>`;
  const cur = k => `<img class="rt-rimg" src="${curImg(k)}" alt="">`;
  if (card.tab === 'hero') return `<div class="rt-rlist">${A.cur.map(([k, n]) => row(cur(k), CUR[k].n, fmt(n), k === 'souls' ? 'только с ритуалов героев' : '')).join('')}</div>`;
  if (card.unique) { const u = rtUniqItem(card.biome); return `<div class="rt-rlist">${row(u ? itWell(u.id, { act: 'noop', size: 30 }) : `<span class="rt-rimg v">${ic('crown')}</span>`, u ? itName(u) : 'Уникальный ресурс', '×' + A.uniq, `хозяин биома «${biomeName(card.biome)}» — наверняка`)}</div>`; }
  return `<div class="rt-rlist">${row(`<span class="rt-rimg v">${ic('gem')}</span>`, 'Базовые ресурсы', '×' + fmt(A.basics), 'вперемешку из общего пула')}${A.keys ? row(`<span class="rt-rimg v">${ic('key')}</span>`, 'Ключи ремёсел', '×' + fmt(A.keys), `наугад из шести ключей биома «${biomeName(card.biome)}»`) : ''}</div>`;
}
/* награда готового ритуала строкой — Входящие (index.html) зовут это имя */
function ritRewHtml(x) {
  if (!x || !x.got) return '';
  const out = x.got.cur.map(([k, n]) => money(k, n)), items = Object.entries(x.got.items), n = items.reduce((a, [, q]) => a + q, 0);
  if (x.unique && items.length) out.push(`<span class="row" style="gap:4px">${itWell(items[0][0], { act: 'noop', size: 26 })}<b class="num">×${items[0][1]}</b></span>`);
  else if (n) out.push(`<span class="chip">${ic('gem')}ресурсы ×${fmt(n)}</span>`);
  return out.join('');
}

/* слот сверху: одна мысль — что с ним сейчас */
function rtSlotHtml(x, k) {
  const op = `rt${S.rituals.seq}`;
  if (x.st === 'ready') return `<button class="rt-slot ready" data-r="${x.r}" data-a="rtclaim" data-v="${op}:${k}" aria-label="${trEsc(`${x.n}: готово, забрать`)}"><span class="rt-si">${rtCrystal(x.r, 16)}</span><span class="rt-sx"><b>${x.n}</b><small>${ic('check')}Забрать</small></span></button>`;
  if (x.st === 'run') {
    const p = Math.round((S.rituals.now - x.t0) * 100 / Math.max(1, x.ms));
    return `<button class="rt-slot run" data-r="${x.r}" data-a="sheet" data-v="rtslot:${k}" aria-label="${trEsc(`${x.n}: осталось ${rtDur(rtLeft(x))}`)}"><span class="rt-si">${ic('hour')}</span><span class="rt-sx"><b>${x.n}</b><small class="num" data-rt-left="${x.uid}">${rtDur(rtLeft(x))}</small></span>${bar(p, 'sand')}</button>`;
  }
  return `<div class="rt-slot free"><span class="rt-si">${ic('plus')}</span><span class="rt-sx"><b>Свободен</b><small>выберите ритуал</small></span></div>`;
}
/* сколько слотов ещё впереди: одна плитка-подсказка, а не ряд замков */
function rtLockHtml() {
  const n = rtSlotsN(), cap = RT.rules.slots.cap, a = RT.art.slots;
  if (n >= cap || !a) return '';
  return `<button class="rt-slot lock" data-a="${typeof OV.wnart === 'function' ? 'sheet' : 'noop'}" data-v="wnart:${a.id}" title="«${a.n}»: ${a.d}"><span class="rt-si">${ic('lock')}</span><span class="rt-sx"><b>ещё ${cap - n}</b><small>${a.n}</small></span></button>`;
}
/* карточка ритуала: кристалл и время, имя, бригада, награда — одно-два числа, одно действие */
function rtCardHtml(card, i) {
  const bio = card.biome ? `<small class="rt-bio">${biomeName(card.biome)}</small>` : '';
  if (card.taken) return `<div class="rt-card taken" data-r="${card.r}"><div class="rt-ct">${rtCrystal(card.r)}<span class="chip">${ic('check')}начат</span></div><b class="rt-cn">${card.n}</b>${bio}<p class="rt-cz">Лот взят. Новый — после ролла или завтра.</p></div>`;
  return `<div class="rt-card${card.unique ? ' uniq' : ''}" data-r="${card.r}">
    <button class="rt-cm" data-a="sheet" data-v="ritual:${card.tab}:${i}" aria-label="${trEsc(`${card.n}: ${rtDur(card.ms)}, участников ${card.crew}`)}">
      <span class="rt-ct">${rtCrystal(card.r)}${rtChipTime(card.ms)}</span>
      <b class="rt-cn">${card.unique ? `<span class="rt-crown" title="Уникальный ритуал">${ic('crown')}</span>` : ''}${card.n}</b>${bio}
      <span class="rt-cb">${rtChipCrew(card.crew)}</span>
      <span class="rt-cr2">${rtRewCard(card)}</span>
    </button>
    <div class="rt-ca"><button class="btn sm${card.unique ? ' go' : ''}" data-a="sheet" data-v="ritual:${card.tab}:${i}">Назначить</button></div>
  </div>`;
}
/* строка вкладки: что даёт вкладка, артель, ролл — бесплатный или за Энериум */
function rtBarHtml(tab) {
  const R = S.rituals, op = `rt${R.seq}`, free = R.free > 0, cap = !free && R.paid >= RT.rules.rolls.paid.length;
  const roll = free ? `<button class="btn sm" data-a="rtroll" data-v="${op}:${tab}" title="Новые карточки во вкладке: невзятые сменятся">${ic('swap')}Обновить · бесплатно ${R.free}</button>`
    : `<button class="btn sm" data-a="rtrollpay" data-v="${op}:${tab}" ${cap ? 'disabled' : ''} title="${cap ? RT_WHY.cap() : 'Бесплатные роллы на сегодня кончились'}">${ic('swap')}Обновить${cap ? '' : costTag('enerium', rtCost(R.paid))}</button>`;
  const artel = tab === 'work' ? `<button class="chip rt-art" data-a="sheet" data-v="rtart">${ic('users')}Артель · ${rtFreeW().length} из ${R.artel.length}</button>` : '';
  return `<div class="rt-bar"><span class="eyebrow">${tab === 'work' ? 'Ресурсы открытых биомов' : 'Золото, дух и души'}</span><span class="g-spacer"></span>${artel}${roll}</div>`;
}
/* команде: часы, день, шарды — без ожидания */
function rtTeam() {
  return TM(`<div class="row rt-team"><span class="eyebrow">Команда</span>${RT_DEMO.skip.map(ms => `<button class="btn sm" data-a="rtdemo" data-v="skip:${ms}">+${rtDur(ms)}</button>`).join('')}
    <button class="btn sm" data-a="rtdemo" data-v="day">новый день</button><button class="btn sm" data-a="rtdemo" data-v="shards">+${RT_DEMO.give.n} шардов · ${RAR[RT_DEMO.give.r].toLowerCase()}</button>
    <span class="faint rt-tn">день ${S.rituals.day} · ${rtHm(S.rituals.now)} · слотов ${rtSlotsN()} · роллов ${rtFreeN()} + ${RT.rules.rolls.paid.length} · карточек ${rtCardsN()} · цикл ${ROMAN[S.acc.cycle]} · сид «${S.rituals.seed}»${
      S.rituals.wk ? ` · неделя ${S.rituals.wk.no}: ${Math.floor(S.rituals.wk.done / RT_HOUR)} ч из ${Math.floor(S.rituals.wk.cap / RT_HOUR)} ч мест` : ''}</span></div>`);
}

SCREENS.rituals = function () {
  const tab = rtTab(S.seg.rituals);
  const seg = { key: 'rituals', items: [['work', 'Рабочие'], ['hero', 'Герои']] };
  if (!RT || !RTE || !S.rituals) return { title: 'Ритуалы', back: 'week', seg, html: '<section class="scr"><div class="pnl pad"><p class="faint">Нет данных ритуалов.</p></div></section>' };
  if (!rtOpen()) return { title: 'Ритуалы', back: 'week', html: `<section class="scr"><div class="pnl pad rt-lock">${ic('lock')}<b class="serif">${RT_WHY.closed()}</b><p class="reason">Вместе с Эхо и Событием, которые ритуалы кормят.</p></div></section>` };
  rtSync(); RT_SRV.tick();
  const R = S.rituals, cards = rtList(tab);
  const grid = cards.length ? `<div class="rt-grid scroll" data-keep="rt-grid">${cards.map((c, i) => rtCardHtml(c, i)).join('')}</div>`
    : `<div class="rt-empty pnl"><b class="serif">Пул пуст</b><p class="reason">Новые ритуалы — после ролла или завтра.</p></div>`;
  return { title: 'Ритуалы', back: 'week', seg, html: `<section class="scr rt-scr">
    <div class="rt-slots">${R.slots.map((x, k) => rtSlotHtml(x, k)).join('')}${rtLockHtml()}</div>
    ${rtBarHtml(tab)}
    ${grid}
    ${rtLoadHtml()}
    ${rtTeam()}
  </section>` };
};

/* ---------- ступени загрузки: полоса под карточками и лист ---------- */
/* сундуки ступени: колодец с сундуком старшей редкости; имя — в подсказке */
const rtPayTop = pay => (pay || []).reduce((a, g) => Math.max(a, g.r), 0);
const rtPayName = pay => (pay || []).map(g => `${g.count > 1 ? g.count + ' × ' : ''}${lbBoxName(EN_LOOTBOXES.modes[rtMode()].box, g.r, g.win)}`).join(', ');
const rtChest = (pay, px) => (pay && pay.length ? `<span class="well itf rt-chest" data-r="${rtPayTop(pay)}" style="--s:${px}px" title="${trEsc(rtPayName(pay))}">${chestPic(EN_LOOTBOXES.modes[rtMode()].box, rtPayTop(pay))}</span>` : '');
/* полоса недели от нуля до ста с засечками ступеней: взятые — светлые */
const rtLoadBar = (st, load, cls = '') => `<span class="rt-ld-bar ${cls}" aria-hidden="true"><span class="rt-ld-fill" style="--v:${load}"></span>${st.map(x => `<i class="${x.reached ? 'on' : ''}" style="--v:${x.need}"></i>`).join('')}</span>`;
/* полоса «Загрузка недели»: число, полоса со ступенями, сундук ближайшей ступени; одно действие — лист. Без лестницы — строка закона */
function rtLoadHtml() {
  const st = rtSteps();
  if (!st.length) return `<p class="reason rt-line">${RT.text.law}</p>`;
  const load = rtLoad(), nx = st.find(x => !x.reached), got = st.filter(x => x.reached).length;
  const tail = nx ? `<span class="rt-ld-nx">${rtChest(nx.pay, RT_VIEW.chest)}<small class="num">${nx.need} %</small></span>` : `<span class="rt-ld-nx all">${ic('check')}<small>все ступени</small></span>`;
  const label = `Загрузка недели: ${load} %, ступеней взято ${got} из ${st.length}${nx ? `, до следующей — ${nx.need - load} %` : ''}`;
  return `<button class="rt-load" data-a="sheet" data-v="rtload" aria-label="${trEsc(label)}" title="Ступени загрузки">
      <span class="eyebrow">Загрузка недели</span><b class="num rt-ld-n">${load} %</b>${rtLoadBar(st, load)}${tail}<span class="rt-ld-go" aria-hidden="true">${ic('chev')}</span></button>`;
}
/* лестница ступеней: общий помощник Недели (EN_WEEK.ladderHtml) рисует «дорогу» полос по готовым ступеням — прошлые циклы «пройдено»,
   свой — строками, будущие — свёрнуты: пороги те же, сундуки богаче. Без помощника — ступени своей полосы списком */
function rtLadderHtml(st, load) {
  const W = window.EN_WEEK;
  if (W && typeof W.ladderHtml === 'function') {
    try { const h = W.ladderHtml(rtMode(), { steps: st, have: load, cycle: S.acc.cycle }); if (typeof h === 'string' && h) return `<div class="rt-lad" data-by="week">${h}</div>`; } catch (_) { }
  }
  const nx = st.find(x => !x.reached), inBag = k => typeof darGot === 'function' && darGot(rtMode(), k);
  return `<div class="rt-lad" data-by="own"><span class="eyebrow">Ступени загрузки · взято ${st.filter(x => x.reached).length}</span>${st.map(x => `<div class="rt-st ${x.reached ? 'got' : x === nx ? 'next' : ''}" data-k="${x.k}"><b class="num">${x.need} %</b>${rtChest(x.pay, RT_VIEW.chestRow)}<span class="rt-st-n">${rtPayName(x.pay) || '—'}</span>${
    x.reached ? `<span class="chip ${inBag(x.k) ? '' : 'spirit'}">${ic('check')}${inBag(x.k) ? 'в запасах' : 'взята'}</span>` : x === nx ? `<span class="faint num">ещё ${x.need - load} %</span>` : '<span></span>'}</div>`).join('')}</div>`;
}

/* ================== листы ================== */
/* герои под ритуал: свободные; сначала те, кого нет в отрядах спуска и Эхо, затем слабейшие — главный отряд остаётся в деле */
function rtHeroPool() {
  const inSq = new Set([S.prepSquad, S.echoSquad].map(id => (typeof sq === 'function' ? sq(id) : null)).filter(Boolean).flatMap(s => s.m.filter(Boolean)));
  return rtHeroesAll().filter(h => !busyNote(h.id)).map(h => ({ h, sq: inSq.has(h.id) })).sort((a, b) => (a.sq - b.sq) || (a.h.bm - b.h.bm) || (a.h.id < b.h.id ? -1 : 1));
}
function rtPickOf(card) {
  const R = S.rituals;
  if (!R.pick || R.pick.card !== card.id) R.pick = { card: card.id, ids: rtHeroPool().slice(0, card.crew).map(x => x.h.id) };
  const free = new Set(rtHeroPool().map(x => x.h.id));
  R.pick.ids = R.pick.ids.filter(id => free.has(id));
  return R.pick.ids;
}
Object.assign(OV, {
  /* старт: какой ритуал, кто, сколько времени, что придёт и чего это стоит */
  ritual(o) {
    const [t, si] = String(o.arg || '').split(':'), tab = rtTab(t), R = S.rituals, card = R && R[tab] ? R[tab][+si] : null;
    if (!card) return sheet('Ритуал', '<p class="faint">Ритуала больше нет в пуле.</p>');
    if (card.taken) return sheet(card.n, `<p class="reason">${RT_WHY.taken()}</p>`);
    const free = R.slots.some(x => x.st === 'free'), op = `rt${R.seq}`;
    let who = '', ms = card.ms, ok = free, why = free ? '' : RT_WHY.slots();
    if (tab === 'work') {
      const crew = rtCrewW(card), cut = RTE.speedBp(RT, card, crew.map(w => w.r));
      ms = rtTime(card, crew);
      if (crew.length < card.crew) { ok = false; why = why || `${RT_WHY.workers()} Нужно ${card.crew}, свободно ${crew.length}.`; }
      who = `<span class="eyebrow">Бригада · ${card.crew}</span>
        <div class="rt-crew-row">${crew.map(w => rtWorker(w.r)).join('')}${Array.from({ length: Math.max(0, card.crew - crew.length) }, () => `<span class="rt-cr none">${ic('users')}</span>`).join('')}
        <span class="rt-cut">${cut ? `−${cut / 100} % времени` : 'без ускорения'}</span></div>
        <p class="reason">Лучших свободных рабочих ставит сам ритуал: допуск — только число. Редкие рабочие ускоряют.</p>`;
    } else {
      const ids = rtPickOf(card), pool = rtHeroPool(), inSq = pool.filter(x => x.sq && ids.includes(x.h.id)).map(x => x.h.name);
      if (ids.length !== card.crew) { ok = false; why = why || (pool.length < card.crew ? `Свободных героев ${pool.length}, нужно ${card.crew}.` : `Выберите ${card.crew} ${plural(card.crew, 'героя', 'героев', 'героев')}.`); }
      who = `<span class="eyebrow">Кто пойдёт · ${ids.length} из ${card.crew}</span>
        <div class="rt-heroes">${pool.map(({ h, sq: inS }) => { const on = ids.includes(h.id); return `<button class="rt-hero${on ? ' on' : ''}" data-r="${h.r}" data-a="rtpick" data-v="${h.id}" aria-pressed="${on}" title="${trEsc(h.name)}${inS ? ' · в отряде' : ''}"><img src="${h.img}" alt="${trEsc(h.name)}">${inS ? `<i class="rt-sq" title="В отряде спуска или Эхо">${ic('flag')}</i>` : ''}</button>`; }).join('') || '<p class="faint">Свободных героев нет.</p>'}</div>
        <p class="reason warn">Заняты до ${rtHm(R.now + card.ms)}: забеги, Эхо и клан их не получат. Арена и Лига — получат.${inSq.length ? ` Из отрядов уйдут: ${inSq.join(', ')}.` : ''}</p>`;
    }
    const body = `<div class="rt-sh-top" data-r="${card.r}">${rtCrystal(card.r, 30)}<span class="col" style="gap:4px"><b class="serif rt-sh-n">${card.n}</b><span class="row" style="gap:6px">${rtChipTime(ms)}${card.biome ? `<span class="chip">${biomeName(card.biome)}</span>` : ''}</span></span></div>
      <p class="rt-lore">${card.unique ? RT.text.unique : RT.text[tab]}</p>
      <span class="eyebrow">Награда · наверняка</span>${rtRewRows(card, S.acc.cycle)}
      <p class="reason">${RT.text.law}</p>
      ${who}
      ${TM(`Карточка ${card.id}: ${RAR[card.r].toLowerCase()}, ${rtDur(card.ms)} по сетке, бригада ${card.crew}${card.paid ? ', из платного ролла' : ''}. Награда за единицу времени × ${tab === 'hero' ? 'цикл ' + ROMAN[S.acc.cycle] : 'длительность'} — EN_RITUALS.tabs; исход — EnRitual.resolve на сиде карточки при старте. §19, docs/content/ритуалы.md.`, 'p', 'reason')}`;
    return sheet('Ритуал', body, `${why ? `<span class="reason warn rt-why">${why}</span>` : '<span class="g-spacer"></span>'}<button class="btn go" data-a="rtstart" data-v="${op}:${tab}:${si}" ${ok ? '' : 'disabled'}>Начать · ${rtDur(ms)}</button>`);
  },
  /* идущий ритуал: сколько осталось, кто занят, что придёт; отмена — с подтверждением */
  rtslot(o) {
    const R = S.rituals, k = +o.arg, x = R && R.slots[k];
    if (!x || x.st === 'free') return sheet('Ритуал', '<p class="faint">Слот свободен.</p>');
    const card = { tab: x.kind, r: x.r, ms: x.nominal, biome: x.biome, unique: x.unique };
    const crew = x.kind === 'hero' ? `<div class="rt-heroes">${x.crew.map(id => { const h = H(id); return h ? `<span class="rt-hero on static" data-r="${h.r}" title="${trEsc(h.name)}"><img src="${h.img}" alt="${trEsc(h.name)}"></span>` : ''; }).join('')}</div>`
      : `<div class="rt-crew-row">${x.crew.map(id => { const w = R.artel.find(y => y.id === id); return w ? rtWorker(w.r) : ''; }).join('')}</div>`;
    const body = `<div class="rt-sh-top" data-r="${x.r}">${rtCrystal(x.r, 30)}<span class="col" style="gap:4px"><b class="serif rt-sh-n">${x.n}</b><span class="row" style="gap:6px">${x.st === 'ready' ? `<span class="chip spirit">${ic('check')}готово</span>` : `<span class="chip">${ic('hour')}осталось <span class="num" data-rt-left="${x.uid}">${rtDur(rtLeft(x))}</span></span>`}</span></span></div>
      ${x.st === 'run' ? bar(Math.round((R.now - x.t0) * 100 / Math.max(1, x.ms)), 'sand lg') : ''}
      <span class="eyebrow">${x.kind === 'hero' ? 'Герои' : 'Бригада'} · ${x.crew.length}</span>${crew}
      <span class="eyebrow">Награда · решена при старте</span>${rtRewRows(card, x.cyc)}
      <p class="reason">${x.kind === 'hero' ? 'Какая валюта — видно сразу.' : 'Какие именно ресурсы — станет видно при сборе.'} ${x.st === 'run' ? `Готово в ${rtHm(x.t1)}.` : ''}</p>`;
    const op = `rt${R.seq}`;
    return sheet('Ритуал', body, x.st === 'ready' ? `<span class="g-spacer"></span><button class="btn go" data-a="rtclaim" data-v="${op}:${k}">Забрать</button>` : `<button class="btn ghost" data-a="rtcancel" data-v="${op}:${k}">${ic('x')}Отменить</button><span class="g-spacer"></span><button class="btn" data-a="close">Хорошо</button>`);
  },
  /* артель: рабочие по редкостям, шарды и пробуждение */
  rtart() {
    const R = S.rituals, busy = rtBusyW(), op = `rt${R.seq}`, need = RT.rules.shardsPer;
    const rows = [7, 6, 5, 4, 3, 2, 1].map(r => {
      const all = R.artel.filter(w => w.r === r), sh = rtShards(r), cost = RTE.awaken(RT, r);
      if (!all.length && !sh) return '';
      const b = all.filter(w => busy.has(w.id)).length;
      return `<div class="rt-arow" data-r="${r}">${rtWorker(r, 28)}<span class="n"><b>${RAR[r]}</b><small>−${RT.rules.speed.perRBp * r / 100} % времени за участника${b ? ` · в ритуале ${b}` : ''}</small></span><b class="num rt-an">${all.length}</b>
        ${sh ? `<span class="rt-ash" title="Шарды: ${sh} из ${need}">${ic('gear')}<span class="num">${sh}/${need}</span></span><button class="btn sm${sh >= need ? ' go' : ''}" data-a="rtawaken" data-v="${op}:${r}" ${sh >= need && S.wallet.souls >= cost ? '' : 'disabled'}>Пробудить${costTag('souls', cost)}</button>` : '<span></span><span></span>'}</div>`;
    }).join('');
    const body = `<p class="rt-lore">Рабочие — обычные души тех, кто жил на Этериосе. В бой не ходят. Собираются из шардов, пробуждаются душами.</p>
      <div class="rt-alist">${rows || '<p class="faint">Рабочих пока нет.</p>'}</div>
      <p class="reason">Ускорение бригады — сумма по участникам, не больше −${RT.rules.speed.capBp / 100} %. Шарды дают сундуки рабочих: Событие и крафтовые боссы.</p>
      ${TM(`Пробуждение — ${RT.rules.awaken.soulsPerPct} душ за процент ускорения: ${[1, 2, 3, 4, 5, 6, 7].map(r => RTE.awaken(RT, r)).join(' / ')}. Комплект — ${need} шардов (lootboxes.js, assume.workerShards). Шарды — в S.zp.extra, как у сундуков. Уровней у рабочих нет — растёт только редкость (docs/content/ритуалы.md).`, 'p', 'reason')}`;
    return sheet(`Артель · ${R.artel.length}`, body);
  },
  /* сбор: итог выдан до анимации; песочные часы переворачиваются, награда поднимается по одной, потом — сводка */
  rtgot() {
    const R = S.rituals, x = R && R.last;
    if (!x) return '';
    const t = R.fx ? Math.max(0, Date.now() - R.fx) : RT_VIEW.end, skip = t >= RT_VIEW.end;
    const items = Object.entries(x.items).sort((a, b) => b[1] - a[1]), more = items.length - RT_VIEW.items;
    /* задержки — от начала показа: перерисовка посреди анимации её не рвёт */
    const inner = x.cur.map(([k, n]) => `<img src="${curImg(k)}" alt="${CUR[k].n}"><b class="num">${fmt(n)}</b>`)
      .concat(items.slice(0, RT_VIEW.items).map(([id, n]) => `${itWell(id, { stat: true, size: 34 })}<b class="num">×${fmt(n)}</b>`))
      .concat(more > 0 ? [`<span class="chip">и ещё ${more}</span>`] : []);
    const cells = inner.map((h, i) => `<span class="rt-gi" style="animation-delay:${RT_VIEW.first + i * RT_VIEW.step - t}ms">${h}</span>`).join('');
    const scene = `<button class="rt-fx${skip ? ' done' : ''}" data-r="${x.r}" data-a="rtfx" aria-label="Показать итог">
        <span class="rt-glass" style="animation-delay:${-t}ms">${RT_GLASS}</span>
        <span class="rt-gl" style="animation-delay:${RT_VIEW.flip - t}ms"></span>
        <span class="rt-gg">${cells}</span>
      </button>`;
    const n = items.reduce((a, [, q]) => a + q, 0);
    const body = `${scene}<p class="muted rt-sum">${x.kind === 'hero' ? 'Валюта — в кошельке.' : x.unique ? 'Уникальный ресурс — в запасах.' : `Ресурсы ×${fmt(n)} — в запасах.`} Завершено ритуалов: ${fmt(R.done)}.</p>`;
    return dialog(`«${x.n}»`, body, `${n ? '<button class="btn" data-a="go" data-v="craft:stock">В запасы</button>' : ''}<button class="btn go" data-a="close">Хорошо</button>`, 'rt-dlg');
  },
  /* ступени загрузки: загрузка недели числом и полосой, часы завершённых ритуалов из часов мест, лестница ступеней с сундуками артели;
     одно действие — «Дары»: сундуки взятых ступеней забирают там */
  rtload() {
    if (!S.rituals || !rtOpen()) return '';
    rtSync(); RT_SRV.tick();
    const W = S.rituals.wk, st = rtSteps(); if (!W || !st.length) return sheet('Загрузка недели', '<p class="faint">Ступеней загрузки нет.</p>');
    const load = rtLoad(), got = st.filter(x => x.reached).length, hrs = ms => fmt(Math.floor(ms / RT_HOUR));
    const body = `<div class="row rt-ld-top"><div class="stat"><b class="num">${load} %</b><small>загрузка мест</small></div>
        <div class="stat"><b class="num">${hrs(W.done)} ч</b><small>ритуалов из ${hrs(W.cap)} ч мест</small></div>
        <div class="stat ${got ? 'win' : ''}"><b class="num">${got}</b><small>${plural(got, 'ступень', 'ступени', 'ступеней')} из ${st.length}</small></div></div>
      ${rtLoadBar(st, load, 'lg')}
      ${rtLadderHtml(st, load)}
      <p class="reason">В счёт идут завершённые ритуалы — по времени на карточке. Обновление карточек часов не прибавляет. Сундуки взятых ступеней ждут в «Дарах».</p>
      ${TM(`Мера — EnRitual.load: ${fmt(W.done)} мс завершённых ритуалов / ${fmt(W.cap)} мс мест, неделя ${W.no} — ${RT.rules.ladder.weekH} ч от ${rtHm(W.t0)} дня ${Math.floor(W.t0 / RT_DAY)} на часах ритуалов; новая — со сменой недели расы. Место, открытое посреди недели, считается с часа, когда открылось; взятая ступень остаётся взятой (wk.top). Пороги и сундуки — EN_LOOTBOXES.modes.${rtMode()}; прогон калькулятора, цикл ${ROMAN[S.acc.cycle]}: ${RT.ladder && RT.ladder.load[S.acc.cycle] ? `обычный — ${RT.ladder.load[S.acc.cycle].o} %, увлечённый — ${RT.ladder.load[S.acc.cycle].e} %, без простоя — ${RT.ladder.load[S.acc.cycle].n} %` : 'нет данных'}.`, 'p', 'reason')}`;
    return sheet('Загрузка недели', body, `<span class="g-spacer"></span><button class="btn go" data-a="sheet" data-v="gifts:me">Дары ${ic('chev')}</button>`);
  },
});
/* песочные часы сбора: рамка, две колбы, песок светится цветом редкости */
const RT_GLASS = `<svg viewBox="0 0 64 80" aria-hidden="true"><path class="fr" d="M12 6h40M12 74h40"/><path class="gl" d="M18 8c0 16 12 22 12 32S18 56 18 72h28c0-16-12-22-12-32s12-16 12-32z"/><path class="sa" d="M22 12h20c-1 9-7 14-10 17-3-3-9-8-10-17z"/><path class="sb" d="M21 70c1-7 6-11 11-12 5 1 10 5 11 12z"/></svg>`;

/* ================== действия ================== */
const rtRes = (r, ok) => { if (r.again) return; if (r.refuse) { toast(RT_WHY[r.refuse] ? RT_WHY[r.refuse]() : 'Нельзя'); return; } ok(r); };
Object.assign(ACT, {
  /* старт из листа: номер операции, вкладка, карточка; героев — выбранных в листе */
  rtstart(v) {
    const [op, t, i] = String(v).split(':'), tab = rtTab(t), card = S.rituals[tab][+i];
    const ids = tab === 'hero' && card ? rtPickOf(card) : [];
    rtRes(RT_SRV.start(op, tab, +i, ids), r => { S.overlay = null; toast(`«${r.n}» начат · готово в ${rtHm(r.t1)}`); });
  },
  /* прежнее имя: старт без листа — бригада та, что предложит лист */
  rstart(v) {
    const [t, i] = String(v).split(':'), tab = rtTab(t), card = S.rituals[tab][+i];
    if (!card) return;
    ACT.rtstart(`rt${S.rituals.seq}:${tab}:${i}`);
  },
  /* выбор героя в листе старта: нажатие — в бригаду или из неё; бригада полна — меняется последний */
  rtpick(v) {
    const P = S.rituals.pick; if (!P) return;
    const card = S.rituals.hero.find(x => x.id === P.card); if (!card) return;
    if (P.ids.includes(v)) P.ids = P.ids.filter(id => id !== v);
    else if (P.ids.length < card.crew) P.ids.push(v);
    else P.ids = P.ids.slice(0, card.crew - 1).concat(v);
    render();
  },
  /* сбор: v — номер слота (его читают Входящие и наблюдатель контрактов); op — номер операции, how — 'fx' у кнопки экрана */
  rclaim(v, op, how) {
    const r = RT_SRV.claim(op || `rt${S.rituals.seq}`, +v);
    if (r.again || r.refuse) { if (r.refuse && how === 'fx') toast(RT_WHY[r.refuse]()); return r; }
    if (how !== 'fx') { const c = r.rec.cur.map(([k, n]) => `${CUR[k].n.toLowerCase()} ${fmt(n)}`), n = Object.values(r.rec.items).reduce((a, q) => a + q, 0); toast(`«${r.rec.n}»: ${c.concat(n ? [`ресурсы ×${fmt(n)} — в запасах`] : []).join(', ')}`); }
    return r;
  },
  rtclaim(v) {
    const [op, k] = String(v).split(':');
    const r = ACT.rclaim(k, op, 'fx');
    if (r && r.ok && !r.again) { S.rituals.fx = Date.now(); S.overlay = { t: 'rtgot' }; render(); focusOverlay(); }
  },
  rtfx() { if (S.rituals) { S.rituals.fx = Date.now() - RT_VIEW.end; render(); } },
  rtcancel(v) {
    const [op, k] = String(v).split(':'), x = S.rituals.slots[+k]; if (!x || x.st !== 'run') return;
    S.overlay = { t: 'confirm', title: 'Отменить ритуал', text: `«${x.n}»: осталось ${rtDur(rtLeft(x))}. ${RT.text.cancel}`, ok: 'Отменить ритуал', act: 'rtcanceldo', v: `${op}:${k}`, danger: true };
    render(); focusOverlay();
  },
  rtcanceldo(v) {
    const [op, k] = String(v).split(':');
    rtRes(RT_SRV.cancel(op, +k), r => { S.overlay = null; toast(`«${r.n}» отменён: участники свободны, награды нет`); });
  },
  rtroll(v) {
    const [op, t] = String(v).split(':');
    rtRes(RT_SRV.roll(op, rtTab(t)), () => { S.overlay = null; toast('Новые ритуалы во вкладке'); });
  },
  rtrollpay(v) {
    const R = S.rituals, cap = R.paid >= RT.rules.rolls.paid.length;
    if (cap) return toast(RT_WHY.cap());
    const price = rtCost(R.paid);
    S.overlay = { t: 'confirm', title: 'Обновить ритуалы', text: `Бесплатные роллы на сегодня кончились. Ролл — ${price} Энериума, сегодня можно ещё ${RT.rules.rolls.paid.length - R.paid}. Невзятые карточки вкладки сменятся; уникальный ритуал останется.`, ok: 'Обновить', act: 'rtroll', v, cost: ['enerium', price] };
    render(); focusOverlay();
  },
  rtawaken(v) {
    const [op, r] = String(v).split(':');
    rtRes(RT_SRV.awaken(op, +r), x => { toast(`Рабочий пробуждён · ${RAR[x.r].toLowerCase()}`); render(); });
  },
  /* команда: перемотка часов, новый день, шарды */
  rtdemo(v) {
    const [what, n] = String(v).split(':');
    if (what === 'skip') { const k = RT_SRV.advance(+n); toast(k ? `Прошло ${rtDur(+n)}: готово ${k} — письма во Входящих` : `Прошло ${rtDur(+n)}`); return; }
    if (what === 'day') { S.rituals.now = (S.rituals.day + 1) * RT_DAY + RT_DEMO.at; RT_SRV.tick(); render(); return; }
    if (what === 'shards') { if (!S.zp) return; S.zp.extra = S.zp.extra || {}; const k = rtShardKey(RT_DEMO.give.r); S.zp.extra[k] = (S.zp.extra[k] || 0) + RT_DEMO.give.n; S.overlay = { t: 'rtart' }; render(); }
  },
});

/* ================== Неделя: итоги режима (WEEK_MODES, screens/week.js) ==================
   Строка «Ритуалы»: очки — загрузка недели в процентах, планки — ступени загрузки с сундуками артели; мест нет — время мест у всех одно.
   Взятые ступени этой недели «Дары» дают получить (bag.js, darNow). Прошлая неделя — та, за которую платят «Дары»: взятые ступени
   и загрузка между порогом взятой и следующей */
if (RT && RT.rules.ladder) (window.WEEK_MODES = window.WEEK_MODES || []).push({
  id: RT.rules.ladder.mode, n: 'Ритуалы', icon: RT_VIEW.icon, go: 'rituals', order: RT_VIEW.order, unit: '%',
  now() {
    if (!RTE || !S.rituals || !rtLadOn()) return { lock: 'нет данных' };
    if (!rtOpen()) return { lock: `откроются на ${RT.rules.open.level}-м уровне` };
    rtSync(); RT_SRV.tick();
    const R = S.rituals.slots, ready = R.filter(x => x.st === 'ready').length, run = R.filter(x => x.st === 'run').length;
    return { place: null, points: rtLoad(), planks: rtSteps(), alert: ready ? `Готово ритуалов: ${ready}` : '',
      note: `Загрузка мест за неделю: завершённые ритуалы — по времени на карточке. Сейчас идёт: ${run}, готово: ${ready}` };
  },
  past() {
    if (!RTE || !S.rituals || !rtLadOn()) return { lock: 'нет данных' };
    if (!rtOpen()) return { lock: `откроются на ${RT.rules.open.level}-м уровне` };
    const ats = rtLadRows().map(x => x.at), rows = typeof darRows === 'function' && S.zp ? darRows(S, 'prev').filter(p => p.id === rtMode()) : [];
    const k = Math.min(ats.length, rows.filter(p => p.kind === 'plank').length), lo = k ? ats[k - 1] : 0, hi = k < ats.length ? ats[k] : lo;
    return { place: null, points: lo + Math.floor((hi - lo) * RT_DEMO.past.fracBp / RT.rules.bp),
      rewards: rows.map(p => ({ label: p.label, box: p.box, groups: p.groups.map(g => ({ r: g.r, count: g.count, win: g.win })), st: p.st, cat: p.cat, kind: p.kind })) };
  },
});

/* ================== раздел UI-кита ================== */
function rtKitHtml() {
  if (!RT || !RTE || !S.rituals) return '';
  const c = S.acc.cycle, TW = RT.tabs.work, TH = RT.tabs.hero, R = RT.rules;
  const mk = (tab, r, extra = {}) => Object.assign({ id: `кит-${tab}-${r}`, tab, r, crew: RT.tabs[tab].crew.hi[r - 1], biome: tab === 'work' ? 'b3' : null, unique: false, nm: 0, n: RT.tabs[tab].names[R.bands[r - 1]][0], ms: RT.tabs[tab].ms[r - 1], paid: false }, extra);
  const noop = h => h.replace(/data-a="[^"]*"/g, 'data-a="noop"');
  const cards = [mk('hero', 7), mk('work', 4), mk('work', 7, { unique: true, crew: R.unique.crew, n: TW.uniqueNames[0] })].map((x, i) => noop(rtCardHtml(x, i))).join('');
  const t0 = S.rituals.now;
  const slots = [{ st: 'ready', uid: 'k1', n: 'Долгая смена', kind: 'work', r: 5 }, { st: 'run', uid: 'k2', n: 'Дозор у пролома', kind: 'hero', r: 4, t0: t0 - 3 * RT_HOUR, t1: t0 + RT_HOUR, ms: 4 * RT_HOUR }, { st: 'free' }]
    .map((x, k) => noop(rtSlotHtml(x, k).replace(/data-rt-left="[^"]*"/, ''))).join('');
  const ladder = [1, 2, 3, 4, 5, 6, 7].map(r => `<figure>${ICON('r' + r, 30, RAR[r])}<figcaption>${RAR[r]}<br><b class="num">${rtDur(TW.ms[r - 1])}</b> · <b class="num">${rtDur(TH.ms[r - 1])}</b></figcaption></figure>`).join('');
  const speed = [1, 3, 5, 7].map(r => `<span class="rt-kit-sp">${rtWorker(r, 30)}<b class="num">−${R.speed.perRBp * r / 100} %</b><small>${RTE.awaken(RT, r)} душ</small></span>`).join('');
  const sim = RT.sim && RT.sim[c], sh = (p, k) => sim && sim[p] ? `${sim[p].shareBp[k] / 100} %` : '—';
  /* ступени загрузки: полоса экрана и прогон калькулятора — срединная неделя профилей по циклам */
  const LD = RT.ladder, ldRow = cc => `<tr><td>${ROMAN[cc]}</td>${['o', 'e', 'z', 'p', 'n'].map(p => `<td class="n">${LD.load[cc][p]} % · ${LD.step[cc][p]}</td>`).join('')}<td class="n">${LD.withBoxBp[cc] / 100} %</td></tr>`;
  const ladKit = rtSteps().length ? `<div class="k-air-r"><b>Ступени загрузки</b>${noop(rtLoadHtml())}<small>Полоса под карточками: загрузка недели числом, полоса со ступенями, сундук ближайшей ступени. Лист — ступени с сундуками артели; сундуки взятых — в «Дарах». Ступень платит один раз за неделю.</small>
      ${TM(LD ? `<table class="rk-tab"><tr><th>Цикл</th><th>Обычный</th><th>Увлечённый</th><th>Занятый</th><th>Плательщик</th><th>Без простоя</th><th>С сундуками, золото забегов</th></tr>${Object.keys(LD.load).map(ldRow).join('')}</table><p class="k-note">Прогон калькулятора: загрузка срединной недели и сколько ступеней она берёт. Мера — EN_RITUALS.rules.ladder, счёт — EnRitual.load; пороги и сундуки — EN_LOOTBOXES.modes.${rtMode()}.</p>` : '', 'div')}</div>` : '';
  return `<section class="k-box rt-kit" style="grid-column:1/-1" id="kitRituals"><h3>Ритуалы и рабочие</h3>
    <p class="k-note">Офлайн-доход: поставил — забрал. Слоты общие на две вкладки, карточка — лот дневного пула. Редкость ритуала — длительность: рабочие ${rtDur(TW.ms[0])}–${rtDur(TW.ms[6])}, герои вдвое дольше. Провала нет, награда решена при старте. Души — только у героев.${TM(' §19; данные — design/ui/rituals.js, калькулятор — tools/content-gen/rituals/build.js, черновик — docs/content/ритуалы.md, экран — screens/rituals.js.')}</p>
    <div class="rt-kg">
      <div class="k-air-r"><b>Слоты сверху — одна мысль</b><div class="rt-slots">${slots}</div><small>Готов — «Забрать», идёт — песок и время, свободен — пунктир. Впереди — одна плитка артефакта, а не ряд замков.</small></div>
      <div class="k-air-r"><b>Редкость — это время</b><div class="k-row rt-kit-lad">${ladder}</div><small>Рабочие · герои. Награда за час одна на всех редкостях.</small></div>
    </div>
    <div class="k-air-r"><b>Карточка ритуала</b><div class="rt-kit-cards">${cards}</div><small>Кристалл и время, имя, бригада, награда — одно-два числа, одно действие. У героев главное число — души, золото и дух — значками; у рабочих — базовые и ключи; уникальный — ресурс хозяина.</small></div>
    <div class="rt-kg">
      <div class="k-air-r"><b>Рабочие ускоряют</b><div class="row" style="gap:12px;flex-wrap:wrap">${speed}</div><small>−${R.speed.perRBp / 100} % × редкость за участника, не больше −${R.speed.capBp / 100} %. Пробуждение — души, заметно дешевле героя.</small></div>
      <div class="k-air-r"><b>Сбор</b><div class="rt-kit-fx">${RT_GLASS}</div><small>Часы переворачиваются, награда поднимается по одной, потом — сводка. Итог выдан до анимации; нажатие — сразу итог.</small></div>
    </div>
    ${ladKit}
    ${TM(`<p class="k-note">Прогон калькулятора, цикл ${ROMAN[c]}: ритуалы обычного — ${sh('o', 'gold')} золота, ${sh('o', 'souls')} душ и ${sh('o', 'basics')} базовых его забегов в день; увлечённого — ${sh('e', 'souls')} душ. Плательщик роллами за Энериум почти не выигрывает: выбор, а не время. Сетка: рабочие ${TW.ms.map(rtDur).join(' / ')}; бригада ${TW.crew.lo.map((x, i) => x === TW.crew.hi[i] ? x : x + '–' + TW.crew.hi[i]).join(' / ')}; герои за ${TH.curH || 1} ч — ${TH.cur.map(([k, n]) => CUR[k].n.toLowerCase() + ' ' + n).join(', ')} × цикл; рабочие — ${TW.basics} базовых за полчаса, ключ — с эпической за каждые 2 ч.</p>`)}
  </section>`;
}
let rtKitWatch = false;
function rtKitPaint() {
  if (rtKitWatch || typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.documentElement) return;
  rtKitWatch = true;
  let was = !!KH.team;
  new MutationObserver(() => { if (!!KH.team === was) return; was = !!KH.team; const el = document.getElementById('kitRituals'); if (el) el.outerHTML = rtKitHtml(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: rtKitHtml, paint: rtKitPaint });

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Ритуалы · на ночь', 'Герои — самый долгий ритуал дня: кто пойдёт, до скольки заняты, что придёт', () => {
    S.route = 'rituals'; S.seg.rituals = 'hero';
    const L = S.rituals.hero, i = L.reduce((b, x, k) => !x.taken && (b < 0 || x.ms > L[b].ms) ? k : b, -1);
    S.overlay = i >= 0 ? { t: 'ritual', arg: 'hero:' + i } : null;
  }],
  ['Ритуалы · сбор', 'Готовый ритуал: песочные часы, награда по одной и сводка — итог выдан до анимации', () => {
    S.route = 'rituals'; S.seg.rituals = 'work'; S.overlay = null;
    const k = S.rituals.slots.findIndex(x => x.st === 'ready');
    if (k >= 0) ACT.rtclaim(`rt${S.rituals.seq}:${k}`);
  }],
  ['Ритуалы · пока вас не было', 'Часы вперёд на полдня: готовые ритуалы — письмами во Входящих', () => {
    S.route = 'shelter'; RT_SRV.advance(12 * RT_HOUR); S.overlay = { t: 'inbox' };
  }],
  ['Рабочие · артель', 'Рабочие по редкостям, шарды и пробуждение душами', () => {
    S.route = 'rituals'; S.seg.rituals = 'work'; S.overlay = { t: 'rtart' };
  }],
  ['Ритуалы · ступени загрузки', 'Загрузка мест за неделю, ступени и сундуки артели; сундуки взятых ступеней — в «Дарах»', () => {
    S.route = 'rituals'; S.seg.rituals = 'work'; S.overlay = { t: 'rtload' };
  }],
);
