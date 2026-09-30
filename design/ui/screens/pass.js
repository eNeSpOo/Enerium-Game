/* screens/pass.js — боевой пропуск и дар дня (GDD §32, §29, §16, §1.2; ADR-0026, ADR-0030). Слова автора 29.09.2026: «Продумать
   Боевой пропуск и сделать более красивые и желанные ежедневные награды». Черновик для автора — docs/content/пропуск-и-награды.md.
   Данные — design/ui/pass.js (EN_PASS и алгоритм EnPass): собирает tools/content-gen/pass/build.js, руками не править.
   Регистрирует:
   — вкладку «Энериум» Лавки Энериума (stView): стартовый набор — рунные ключи и души раз за игру, первая покупка ×2 (слово автора
     30.09.2026, ADR-0033), пакеты Энериума и подписка из EN_PASS.store; «сервер» ST_SRV помнит покупку, лист OV.stbuy — что внутри до оплаты;
   — вкладку «Пропуск» Лавки Энериума: обёртка SCREENS.store, вкладку «Облик» рисует storeView в index.html. Сезон «Осенний путь»:
     баннер, ступень и очки, лента из 30 ступеней страницами по десять — два ряда, бесплатный и платный, — и следующая награда крупно;
   — листы: OV.pstier (ступень: обе награды, что внутри, «Забрать»), OV.pspaid (платный ряд: что даёт — до покупки, цена),
     OV.pssrc (откуда очки), OV.psinfo (как устроен пропуск), OV.psgot (получение с анимацией);
   — дар дня — OV.gift: лист даров из 30 отметок, сегодняшняя светится крупно, вехи 7, 14, 20 и 30 — рисунками; «Забрать» — анимация;
   — «сервер» пропуска PS_SRV и листа даров DG_SRV: зачёт дел, «Забрать», «Забрать всё», покупка платного ряда, новые сутки, конец
     сезона — операции с номером; номер несут кнопки, повтор ничего не повторяет, отказ ничего не меняет;
   — дела в очки: обёртка «сервера» Событий (window.EN_EV.srv.credit) — одно дело засчитывается и Событию, и пропуску, каждое своим
     номером. Цены дел — таблица Событий без акцента недели (EN_PASS.units), потолок сезона копится по дням;
   — для других экранов: psShelterBtns() — «Дар дня» и «Пропуск» в Убежище, psGiftRow() — дар дня во Входящих (screens/social.js),
     S.gift.day и S.gift.got — прежние поля колокола; S.look.pass — прогресс рамки «Осенний путь» в «Облике» (screens/wanderer.js);
   — раздел UI-кита «Боевой пропуск и дар дня» (KIT_EXTRA), сценарии презентации.
   Честность: что даёт платный ряд — лист до покупки со всеми наградами; купить можно в любой день сезона — взятые ступени сразу ждут
   «Забрать»; очков и ступеней не продаём; таймеров «успей» нет; незабранное к концу сезона приходит во Входящие.
   Анимация получения — уровень A: движутся только transform и opacity, частицы — EnFx (fx.js), моменты — целые мс от начала показа:
   перерисовка посреди анимации её не рвёт; нажатие — сразу итог; «меньше движения» — без анимации. Итог выдан до показа.
   Арт — AV('pass/…'), только если путь в EN_PASS.art.ready; до выгрузки — заглушки CSS, битых картинок нет.
   Правила воздуха (ADR-0026): одна мысль на экран, на карточке — не больше двух чисел, двух чипов и одного действия; подробности —
   листами. Служебное — только команде: TM, PL, tmT из index.html. Стили — screens/pass.css.
   Автопроверка — tools/content-gen/screens/check_pass.js. */
'use strict';

const PSD = window.EN_PASS || null, PSA = window.EnPass || null;

/* ================== вид: числа показа, не баланс ================== */
const PS_VIEW = {
  page: 10,              // ступеней на странице ленты: страница кончается вехой
  big: 104,              // крупная награда, px
  stack: 3,              // сколько значков в стопке «Ждут вас»
  day: 86400,            // секунд в серверных сутках
  soon: 8,               // команде: «конец сезона» — через столько секунд
};
/* показ получения: моменты — мс от начала; частицы EnFx — [сколько, скорость, жизнь мс, размер] по редкости 1…7 и у валюты */
const PS_FX = {
  step: 380, stepMin: 70, span: 2400, rise: 520, flash: 460, tail: 500,   // шаг между наградами; много наград — шаг короче, весь показ не дольше span
  bursts: 8,                                                               // частицы — у первых восьми наград и у всех с эпической
  burst: [null, [8, 110, 480, 3], [10, 130, 520, 4], [14, 150, 600, 4], [18, 170, 700, 5], [24, 190, 820, 5], [30, 210, 920, 6], [36, 230, 1040, 6]],
  cur: [10, 120, 520, 4], gold: 4, ring: 5, ringMs: 700,
  gift: { pop: 620, end: 1500 },
};
/* команде: «+ забег» — дела одного забега, как у Событий */
const PS_TEAM = { run: { floor: 35, elite: 7, boss: 1 }, en: 600 };
const PS_KIND = { gold: 'Золото', spirit: 'Дух', dust: 'Прах душ', keys: 'Рунные ключи', enerium: 'Энериум' };
const PS_WIN = { step: 'лестница: своя редкость и две ниже', wild: 'шальное окно: от обычной до вневременной', pure: 'чистое окно: всё — своей редкости' };

/* ================== помощники ================== */
const psOk = () => !!(PSD && PSA);
const psAcc = () => ({ level: S.acc.level, cycle: S.acc.cycle });
const psOpen = (s = S) => !!PSD && s.acc.level >= PSD.open.level && s.acc.cycle >= PSD.open.cycle;
const psNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
const psReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
const psNum = n => (typeof zpNum === 'function' ? zpNum(n) : fmt(n));
const psPts = () => Math.floor(S.pass.pts100 / 100);
const psTier = () => PSA.tierOf(PSD, S.pass.pts100);
const psGoal = () => PSD.tiers * PSD.tierPts;
const psLeft = () => Math.max(0, (PSD.season.days - S.pass.day) * PS_VIEW.day + Math.max(0, S.gift.left));
const psFrame = () => (typeof LK_DATA !== 'undefined' ? LK_DATA.frames.find(f => f.id === PSD.frame) : null);
const psArt = p => !!p && PSD.art.ready.includes(p);
const psColor = r => { try { return getComputedStyle(document.documentElement).getPropertyValue('--r' + r).trim() || (window.EnFx ? EnFx.COL.gold : '#ddbc7a'); } catch (_) { return '#ddbc7a'; } };
const psCurCol = k => ({ gold: '#ddbc7a', spirit: '#48e5d4', dust: '#bfa77e', keys: '#ddbc7a', enerium: '#4fdc8b' }[k] || '#ddbc7a');

/* награда словами и значком. x — итог EnPass.resolve: { k, n } | { k: 'chest', box, r, win } | { k: 'frame', id } */
function psName(x) {
  if (x.k === 'chest') return typeof lbBoxName === 'function' && LBX && LBX.boxes[x.box] ? lbBoxName(x.box, x.r, x.win) : 'Сундук странника';
  if (x.k === 'frame') { const f = psFrame(); return `Рамка «${f ? f.n : PSD.season.n}»`; }
  return PS_KIND[x.k] || x.k;
}
const psAmt = x => (x.k === 'chest' || x.k === 'frame' ? '' : psNum(x.n));
const psR = x => (x.k === 'chest' ? x.r : x.k === 'frame' ? (psFrame() || { r: 5 }).r : 0);
/* значок награды: валюта — картинка кошелька, прах — рисунок, если выгружен; сундук — рисованный сундук своего вида; рамка — рамка облика */
function psPic(x) {
  if (x.k === 'chest') return typeof zpChestPic === 'function' ? zpChestPic(x.box) : `<img src="${CHEST}" alt="">`;
  if (x.k === 'frame') {
    const f = psFrame(), p = f && typeof lkArtOf === 'function' ? lkArtOf(f) : '';
    return p && typeof lkArtOn === 'function' && lkArtOn(f) ? `<img src="${AV(p)}" alt="">` : `<i class="ps-ring" style="--fc:${f ? f.c : '#e6a84b'}"></i>`;
  }
  if (x.k === 'dust' && psArt(PSD.art.dust)) return `<img src="${AV(PSD.art.dust)}" alt="">`;
  return `<img src="${curImg(x.k)}" alt="">`;
}
const psLabel = list => list.map(x => `${psName(x)}${x.n != null ? ' ×' + fmt(x.n) : ''}`).join(' и ');
/* сундуки строкой по редкостям: «уникальный ×2, эпический» */
function psChestSum(list) {
  const by = new Map(); for (const x of list) by.set(x.r, (by.get(x.r) || 0) + 1);
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([r, n]) => `${LBX ? LBX.boxRarity[r - 1] : RAR[r]}${n > 1 ? ' ×' + n : ''}`).join(', ');
}

/* ================== состояние: S.pass и S.gift ==================
   S.pass: no — номер сезона; day — день сезона (1…days); pts100 — очки в сотых; by — сотые по источникам; got — забранные клетки
   { free: { ступень: 1 }, paid: {…} }; paid — открыт ли платный ряд; view.page — страница ленты (0 — сама);
   srv — «сервер»: ops — ответы по номерам операций, seq — номер следующей, used — засчитанное сегодня по единицам; fx — идущий показ.
   S.gift: sheet — номер листа; got — отметок взято; today — номер серверных суток; last — сутки последней отметки; left — секунд до
   новых суток; day — отметка, которую можно взять сегодня (got + 1), иначе got: колокол считает got < day; srv, fx — как у пропуска */
function psNew(s, demo) {
  const D = PSD.demo, pts = demo ? D.pts : 0, E = window.EN_EVENT, sh = E && E.econ && E.econ[s.acc.cycle] ? E.econ[s.acc.cycle].share.o : null;
  const by = {};
  if (sh && pts) { let left = pts * 100; const ids = PSD.sources.map(x => x.id); ids.forEach((id, i) => { const v = i === ids.length - 1 ? left : Math.floor(pts * 100 * (sh[id] || 0) / PSD.bp); by[id] = v; left -= v; }); }
  const free = {}; if (demo) for (let t = 1; t <= D.claimed; t++) free[t] = 1;
  return { v: 1, no: 1, day: demo ? D.day : 1, pts100: pts * 100, by, got: { free, paid: {} }, paid: !!(demo && D.paid), view: { page: 0 },
    srv: { ops: {}, seq: 1, used: { n: demo ? D.day : 1, u: {} } }, fx: null };
}
function dgNew(demo) {
  const C = PSD.demo.cal;
  return { v: 1, sheet: 1, got: demo ? C.got : 0, today: 1, last: 0, left: C.leftMin * 60, srv: { ops: {}, seq: 1 }, fx: null, day: 1 };
}
/* поля колокола: отметка сегодня ещё не взята — day = got + 1; взята — day = got */
function dgSync(s = S) {
  const G = s.gift; if (!G || G.v !== 1) return;
  G.day = G.last < G.today ? Math.min(PSD.cal.marks, G.got) + 1 : G.got;
}
/* прогресс рамки «Осенний путь» в «Облике» (screens/wanderer.js): очки и цель сезона */
function psLook(s = S) { if (s.look && s.pass) s.look.pass = { n: PSD.season.n, pts: Math.floor(s.pass.pts100 / 100), goal: PSD.tiers * PSD.tierPts }; }
function psState(s) {
  if (!psOk()) return s;
  s.pass = psNew(s, true);
  s.gift = dgNew(true);
  s.store = stNew();
  dgSync(s); psLook(s);
  return s;
}

/* ================== «сервер» пропуска ==================
   credit(op, unit, n) — дело в очки; claim(op, row, t) — одна клетка; all(op) — все ждущие одной операцией; buy(op) — платный ряд;
   day() — новые сутки сезона; end() — конец сезона: незабранное — во Входящие, новый сезон. Ответ: { res } — сделано;
   { again, res } — повтор номера, ничего не меняет; { refuse } — отказ без изменений */
function psGive(list, src) {
  for (const x of list) {
    if (x.k === 'chest') BAG.addChest({ box: x.box, r: x.r, cyc: S.acc.cycle, win: x.win, src });
    else if (x.k === 'frame') { if (S.look) S.look.got['f:' + x.id] = 1; }
    else S.wallet[x.k] = (S.wallet[x.k] || 0) + x.n;
  }
}
const psCan = (row, t) => t >= 1 && t <= psTier() && !S.pass.got[row][t] && (row === 'free' || S.pass.paid);
function psWaiting() {
  if (!psOk() || !S.pass || !psOpen()) return [];
  const out = [];
  for (let t = 1; t <= psTier(); t++) for (const row of ['free', 'paid']) if (psCan(row, t)) out.push([row, t]);
  return out;
}
const PS_SRV = {
  run(op, f) {
    const P = S.pass, V = P.srv.ops;
    if (!op) return { refuse: 'op' };
    if (V[op]) return { again: true, res: V[op] };
    const r = f(); if (r.refuse) return r;
    V[op] = r.res; P.srv.seq++; psLook();
    return r;
  },
  credit(op, unit, n) {
    if (!psOk() || !S.pass) return { refuse: 'data' };
    const P = S.pass, U = PSD.units[unit];
    if (P.srv.ops[op] != null) return { again: true, res: P.srv.ops[op] };
    if (!U || !(n > 0) || !Number.isInteger(n)) return { refuse: 'unit' };
    if (!psOpen()) return { refuse: 'open' };
    if (U.gate === 'league' && !(typeof leagueOpen === 'function' && leagueOpen(S))) return { refuse: 'gate' };
    if (P.srv.used.n !== P.day) P.srv.used = { n: P.day, u: {} };
    const k = Math.min(n, PSA.room(PSD, unit, P.srv.used.u[unit]));
    const add = PSA.add100(PSD, P.pts100, PSA.pts100(PSD, unit, k), P.day), was = psTier();
    P.srv.ops[op] = { add, n: k }; P.srv.seq++;
    if (k > 0) P.srv.used.u[unit] = (P.srv.used.u[unit] || 0) + k;
    if (add > 0) { P.pts100 += add; P.by[U.src] = (P.by[U.src] || 0) + add; }
    psLook();
    return { res: { add, n: k, tier: psTier() > was ? psTier() : 0 } };
  },
  claim(op, row, t) {
    return this.run(op, () => {
      if (!psOpen()) return { refuse: 'open' };
      if (!PSD.rows[row] || !(t >= 1 && t <= PSD.tiers)) return { refuse: 'none' };
      if (t > psTier()) return { refuse: 'far' };
      if (row === 'paid' && !S.pass.paid) return { refuse: 'paid' };
      if (S.pass.got[row][t]) return { refuse: 'got' };
      const list = PSA.cell(PSD, row, t, psAcc());
      psGive(list, `Пропуск · ступень ${t}`); S.pass.got[row][t] = 1;
      return { res: { op, items: [{ row, t, list }] } };
    });
  },
  all(op) {
    return this.run(op, () => {
      const w = psWaiting(); if (!w.length) return { refuse: 'empty' };
      const items = w.map(([row, t]) => { const list = PSA.cell(PSD, row, t, psAcc()); psGive(list, `Пропуск · ступень ${t}`); S.pass.got[row][t] = 1; return { row, t, list }; });
      return { res: { op, items } };
    });
  },
  buy(op) {
    return this.run(op, () => {
      if (!psOpen()) return { refuse: 'open' };
      if (S.pass.paid) return { refuse: 'bought' };
      if (S.wallet.enerium < PSD.price) return { refuse: 'money', lack: PSD.price - S.wallet.enerium };
      S.wallet.enerium -= PSD.price; S.pass.paid = true;
      return { res: { op, price: PSD.price, wait: psWaiting().filter(([row]) => row === 'paid').length } };
    });
  },
  day() {
    const P = S.pass; if (!P) return;
    if (P.day >= PSD.season.days) return this.end();
    P.day++; P.srv.used = { n: P.day, u: {} };
  },
  /* конец сезона — решает сервер без просьбы игрока: взятые, но не забранные награды — письмом во Входящие; рамка — навсегда */
  end() {
    const P = S.pass; if (!P) return null;
    const rew = {}, chests = [], acc = psAcc();
    let n = 0;
    for (let t = 1; t <= PSA.tierOf(PSD, P.pts100); t++) for (const row of ['free', 'paid']) {
      if (P.got[row][t] || (row === 'paid' && !P.paid)) continue;
      for (const x of PSA.cell(PSD, row, t, acc)) {
        n++;
        if (x.k === 'chest') chests.push({ box: x.box, r: x.r, cyc: S.acc.cycle, win: x.win, src: `Пропуск · ступень ${t}` });
        else if (x.k === 'frame') { if (S.look) S.look.got['f:' + x.id] = 1; }
        else rew[x.k] = (rew[x.k] || 0) + x.n;
      }
    }
    if (n) S.inbox.unshift({ id: `ps-end-${P.no}`, k: 'mail', t: `Сезон «${PSD.season.n}» завершён`, s: 'Награды взятых ступеней, которые вы не забрали', rew: Object.entries(rew), chests });
    const no = P.no + 1;
    S.pass = Object.assign(psNew(S, false), { no });
    psLook();
    return { n };
  },
};
const PS_REFUSE = {
  op: 'Операция без номера', none: 'Такой ступени нет', far: 'Ступень ещё не взята', paid: 'Платный ряд не открыт', got: 'Уже получено',
  empty: 'Забирать пока нечего', open: 'Пропуск ещё закрыт', bought: 'Платный ряд уже открыт', money: 'Не хватает Энериума',
};

/* ================== «сервер» листа даров ==================
   claim(op) — сегодняшняя отметка: одна в серверные сутки; newDay() — новые сутки: отметка снова ждёт, после 30-й — новый лист.
   Пропуск не сбрасывает лист: отметка ждёт следующего входа */
const DG_SRV = {
  claim(op) {
    const G = S.gift, V = G.srv.ops;
    if (!op) return { refuse: 'op' };
    if (V[op]) return { again: true, res: V[op] };
    if (G.last >= G.today) return { refuse: 'today' };
    if (G.got >= PSD.cal.marks) { G.sheet++; G.got = 0; }
    const m = G.got + 1, list = PSA.mark(PSD, m, psAcc());
    psGive(list, `Дар дня · отметка ${m}`);
    G.got = m; G.last = G.today;
    const res = { op, m, sheet: G.sheet, list };
    V[op] = res; G.srv.seq++; dgSync();
    return { res };
  },
  newDay() {
    const G = S.gift; G.today++; G.left = PS_VIEW.day;
    if (G.got >= PSD.cal.marks && G.last < G.today) { G.sheet++; G.got = 0; }
    dgSync();
  },
};

/* новые серверные сутки: лист даров и день сезона */
function psNewDay() { DG_SRV.newDay(); if (S.pass) PS_SRV.day(); }

/* ================== «сервер» Лавки Энериума: стартовый набор ==================
   Слово автора 30.09.2026 (ADR-0033): рунные ключи и души продаются только стартовым набором — раз за игру, первая покупка ×2.
   Платёж проводит платформа, выдачу решает сервер: buy(op) — операция с номером; повтор номера ничего не повторяет, вторая покупка —
   отказ, отказ ничего не меняет. Сервер помнит покупку: S.store.starter. Состав и множитель — EN_PASS.store.starter */
function stNew() { return { v: 1, starter: null, srv: { ops: {}, seq: 1 } }; }
const ST_SRV = {
  buy(op) {
    const T = S.store;
    if (!psOk() || !PSD.store || !T) return { refuse: 'data' };
    if (!op) return { refuse: 'op' };
    if (T.srv.ops[op]) return { again: true, res: T.srv.ops[op] };
    if (T.starter) return { refuse: 'bought' };
    const D = PSD.store.starter, res = { op, keys: D.keys * D.x, souls: D.souls * D.x };
    S.wallet.keys = (S.wallet.keys || 0) + res.keys;
    S.wallet.souls = (S.wallet.souls || 0) + res.souls;
    T.starter = { op }; T.srv.ops[op] = res; T.srv.seq++;
    return { res };
  },
};
const ST_REFUSE = { data: 'Лавка недоступна', op: 'Операция без номера', bought: 'Стартовый набор уже куплен: он продаётся раз за игру' };

/* ================== дела в очки: обёртка «сервера» Событий ==================
   Наблюдатель Событий (screens/event.js) превращает дела в операции с номером — те же операции засчитываются пропуску своим номером.
   Номер Событий живёт неделю, поэтому у пропуска к нему прибавлен номер недели */
if (window.EN_EV && EN_EV.srv && typeof EN_EV.srv.credit === 'function' && !EN_EV.srv.psWrapped) {
  const evCredit0 = EN_EV.srv.credit;
  EN_EV.srv.credit = function (op, unit, n) {
    const r = evCredit0.apply(this, arguments);
    try { if (S && S.pass) PS_SRV.credit(`ev:${S.event ? S.event.weekNo : 0}:${op}`, unit, n); } catch (_) { }
    return r;
  };
  EN_EV.srv.psWrapped = true;
}

/* ================== экран «Пропуск» ================== */
/* клетка ленты: значок награды, одно число; состояние — got (забрано), ready (ждёт), lock (платный ряд закрыт), far (не взята) */
function psCellState(row, t) {
  const got = !!S.pass.got[row][t], on = t <= psTier();
  if (got) return 'got';
  if (row === 'paid' && !S.pass.paid) return on ? 'lock on' : 'lock';
  return on ? 'ready' : 'far';
}
function psCell(row, t, o = {}) {
  const list = PSA.cell(PSD, row, t, psAcc()), x = list[0], st = o.st || psCellState(row, t);
  const extra = list.length > 1 ? `<span class="ps-plus">+${list.length - 1}</span>` : '';
  const mark = st === 'got' ? `<span class="ps-ck">${ic('check')}</span>` : st.startsWith('lock') ? `<span class="ps-lk">${ic('lock')}</span>` : st === 'ready' ? '<i class="dot ps-dot"></i>' : '';
  const amt = psAmt(x), lbl = `${row === 'free' ? 'Бесплатный' : 'Платный'} ряд, ступень ${t}: ${psLabel(list)}${st === 'got' ? ', получено' : st === 'ready' ? ', можно забрать' : st.startsWith('lock') ? ', платный ряд закрыт' : ''}`;
  const inner = `<span class="ps-ci" data-r="${psR(x) || ''}">${psPic(x)}${extra}</span>${amt ? `<small class="num">${amt}</small>` : '<small class="ps-rr">' + (x.k === 'chest' ? ICON('r' + x.r, 12, RAR[x.r]) : '&nbsp;') + '</small>'}${mark}`;
  if (o.kit) return `<span class="ps-c ${st}">${inner}</span>`;
  return `<button class="ps-c ${st}" data-a="sheet" data-v="pstier:${t}" aria-label="${trEsc(lbl)}" title="${trEsc(psLabel(list))}">${inner}</button>`;
}
/* страница ленты: по умолчанию — где первая ждущая награда, иначе — где следующая ступень */
function psPage() {
  const P = S.pass, n = Math.ceil(PSD.tiers / PS_VIEW.page);
  if (P.view.page >= 1 && P.view.page <= n) return P.view.page;
  const w = psWaiting()[0], t = w ? w[1] : Math.min(PSD.tiers, psTier() + 1);
  return Math.max(1, Math.ceil(t / PS_VIEW.page));
}
function psRibbon() {
  const pg = psPage(), n = Math.ceil(PSD.tiers / PS_VIEW.page), from = (pg - 1) * PS_VIEW.page + 1, to = Math.min(PSD.tiers, pg * PS_VIEW.page), nx = psTier() + 1;
  const W = psWaiting();
  const tabs = Array.from({ length: n }, (_, i) => { const a = i * PS_VIEW.page + 1, b = Math.min(PSD.tiers, (i + 1) * PS_VIEW.page), dot = W.some(([, t]) => t >= a && t <= b);
    return `<button role="tab" aria-selected="${pg === i + 1}" data-a="pspage" data-v="${i + 1}">${a}–${b}${dot ? '<span class="bdg" aria-hidden="true"></span><span class="sr">, ждут награды</span>' : ''}</button>`; }).join('');
  const cols = [];
  for (let t = from; t <= to; t++) {
    const mile = t % PS_VIEW.page === 0 || t === PSD.tiers;
    cols.push(`<div class="ps-t${t <= psTier() ? ' on' : ''}${t === nx ? ' cur' : ''}${mile ? ' mile' : ''}"><span class="ps-tn num">${t}</span>${psCell('free', t)}${psCell('paid', t)}</div>`);
  }
  const buy = S.pass.paid ? `<span class="chip spirit ps-open">${ic('check')}открыт</span>`
    : `<button class="ps-buy" data-a="sheet" data-v="pspaid" aria-label="Платный ряд: что даёт и цена">${ic('lock')}<span>${costTag('enerium', PSD.price)}</span></button>`;
  return `<div class="pnl ps-rib"><div class="ps-rh"><span class="eyebrow">Ступени</span><div class="tabs ps-pg" role="tablist" aria-label="Страницы ступеней">${tabs}</div></div>
    <div class="ps-grid"><div class="ps-lab"><span class="ps-tn">&nbsp;</span><span class="ps-rl">Бесплатный</span><span class="ps-rl paid">Платный${buy}</span></div>${cols.join('')}</div></div>`;
}
/* следующая награда крупно: ждут — «Забрать всё»; нет — следующая ступень бесплатного ряда; путь пройден — рамка сезона */
function psNext(o = {}) {
  const W = o.w || psWaiting(), t = psTier(), op = 'ps' + S.pass.srv.seq, st = o.st || (W.length ? 'wait' : t >= PSD.tiers ? 'done' : 'next');
  if (st === 'wait') {
    const pics = W.slice(0, PS_VIEW.stack).map(([row, tt]) => { const x = PSA.cell(PSD, row, tt, psAcc())[0]; return `<span class="ps-sk" data-r="${psR(x) || ''}">${psPic(x)}</span>`; }).join('');
    return `<div class="pnl ps-next wait"><span class="eyebrow">Ждут вас</span><div class="ps-stack">${pics}</div>
      <b class="serif ps-nt">${W.length} ${plural(W.length, 'награда', 'награды', 'наград')}</b><small class="ps-ns">${W.some(([row]) => row === 'paid') ? 'с обоих рядов' : 'бесплатного ряда'}</small>
      <button class="btn go ps-all"${o.kit ? '' : ` data-a="psall" data-v="${op}"`}>Забрать всё</button></div>`;
  }
  if (st === 'done') {
    const f = psFrame();
    return `<div class="pnl ps-next done"><span class="eyebrow">Путь пройден</span><span class="ps-big" data-r="${f ? f.r : 5}">${psPic({ k: 'frame', id: PSD.frame })}</span>
      <b class="serif ps-nt">${f ? `«${trEsc(f.n)}»` : 'Рамка сезона'}</b><small class="ps-ns">рамка — ваша, в «Облике»</small></div>`;
  }
  const nx = Math.min(PSD.tiers, t + 1), x = PSA.cell(PSD, 'free', nx, psAcc())[0], need = nx * PSD.tierPts - psPts();
  const big = nx === PSD.tiers && psArt(PSD.art.crown) ? `<img src="${AV(PSD.art.crown)}" alt="">` : psPic(x);
  return `<div class="pnl ps-next"><span class="eyebrow">Ступень ${nx}</span><span class="ps-big" data-r="${psR(x) || ''}">${big}</span>
    <b class="serif ps-nt">${trEsc(psName(x))}${x.n != null ? ` <span class="num">×${psNum(x.n)}</span>` : ''}</b><small class="ps-ns">через <b class="num">${fmt(need)}</b> ${plural(need, 'очко', 'очка', 'очков')}</small>
    <button class="link ps-src"${o.kit ? '' : ' data-a="sheet" data-v="pssrc"'}>Откуда очки ${ic('chev')}</button></div>`;
}
/* баннер: сезон, срок, ступень и очки; нажатие на очки — «Откуда очки», «?» — как устроен пропуск. lock — пропуск закрыт: без очков */
function psBanner(lock) {
  const t = psTier(), pts = psPts(), cur = t * PSD.tierPts, done = t >= PSD.tiers, pct = done ? 100 : Math.floor((pts - cur) * 100 / PSD.tierPts);
  const art = psArt(PSD.art.banner) ? `<img class="ps-art" src="${AV(PSD.art.banner)}" alt="">` : '<i class="ps-art stub" aria-hidden="true"></i>';
  const left = cur + PSD.tierPts - pts, why = done ? 'путь пройден' : `ещё ${fmt(left)} ${plural(left, 'очко', 'очка', 'очков')} до ${t + 1}-й`;
  const pill = lock ? '' : `<button class="ps-pts" data-a="sheet" data-v="pssrc" aria-label="Ступень ${t} из ${PSD.tiers}, ${why}: откуда очки"><span class="ps-lv"><b class="num">${t}</b><small>из ${PSD.tiers}</small></span><span class="ps-pb">${bar(pct, done ? 'sp' : '')}<small>${why}</small></span></button>`;
  return `<div class="ps-ban">${art}<div class="ps-id"><span class="eyebrow">Сезон пропуска</span><b class="serif">${trEsc(PSD.season.n)}</b><small>до конца сезона <span class="num" data-cd="pass">${dur(psLeft())}</span></small></div>
    ${pill}<button class="iconbtn ps-q" data-a="sheet" data-v="psinfo" aria-label="Как устроен пропуск" title="Как устроен пропуск">${ic('info')}</button></div>`;
}
function psTeam() {
  const n = S.pass.srv.seq;
  return TM(`<div class="row ps-team"><span class="eyebrow">Команда</span><button class="btn sm" data-a="psteam" data-v="run:${n}">+ забег</button><button class="btn sm" data-a="psteam" data-v="day">новые сутки</button><button class="btn sm" data-a="psteam" data-v="en">+${PS_TEAM.en} Энериума</button><button class="btn sm" data-a="psteam" data-v="end">конец сезона</button>
    <span class="faint ps-tnote">EN_PASS: день ${S.pass.day} из ${PSD.season.days}, очков ${fmt(psPts())} из ${fmt(psGoal())}, потолок к сегодня ${fmt(PSA.capTo(PSD, S.pass.day) / 100)}; журнал — ${Object.keys(S.pass.srv.ops).length} операций; сезон № ${S.pass.no}.</span></div>`, 'div');
}
function psView() {
  if (!psOk()) return '<section class="scr"><div class="pnl pad"><p class="faint">Нет данных пропуска: рядом с index.html должен лежать pass.js.</p></div></section>';
  if (!psOpen()) {
    const f = psFrame();
    return `<section class="scr ps">${psBanner(true)}<div class="pnl ps-lock"><span class="ps-big" data-r="${f ? f.r : 5}">${psPic({ k: 'frame', id: PSD.frame })}</span><div class="col"><b class="serif">Пропуск откроется на ${PSD.open.level}-м уровне Странника</b>
      <p class="reason">Вместе с «Неделей»: забеги, Эхо, контракты и ритуалы начнут приносить очки. Последняя ступень сезона — рамка «${trEsc(f ? f.n : PSD.season.n)}».</p></div></div></section>`;
  }
  return `<section class="scr ps">${psBanner()}<div class="ps-main">${psNext()}${psRibbon()}</div>${psTeam()}</section>`;
}

/* ================== листы ================== */
function psBlock(row, t) {
  const list = PSA.cell(PSD, row, t, psAcc()), st = psCellState(row, t), op = 'ps' + S.pass.srv.seq;
  const info = list.map(x => {
    const B = x.k === 'chest' && LBX ? LBX.boxes[x.box] : null;
    const sub = x.k === 'chest' ? `внутри: ресурсы и прах душ · предметов: ${B ? B.items[x.r - 1] : 1}; ${PS_WIN[x.win] || ''}`
      : x.k === 'frame' ? 'рамка облика навсегда — носить в «Облике» Странника' : x.k === 'enerium' || x.k === 'keys' ? 'в кошелёк' : 'в кошелёк · растёт с уровнем Странника';
    return `<div class="ps-bi"><span class="ps-big sm" data-r="${psR(x) || ''}">${psPic(x)}</span><div class="col" style="gap:2px"><b>${trEsc(psName(x))}${x.n != null ? ` <span class="num gold">×${fmt(x.n)}</span>` : ''}</b><small class="faint">${sub}</small></div></div>`;
  }).join('');
  const act = st === 'got' ? `<span class="chip spirit">${ic('check')}получено</span>`
    : st === 'ready' ? `<button class="btn go sm" data-a="psclaim" data-v="${op}:${row}:${t}">Забрать</button>`
    : st.startsWith('lock') ? `<button class="link" data-a="sheet" data-v="pspaid">Платный ряд ${ic('chev')}</button>` : '';
  return `<div class="ps-blk ${row}"><div class="row"><span class="eyebrow">${row === 'free' ? 'Бесплатный ряд' : 'Платный ряд'}</span><span class="g-spacer"></span>${act}</div>${info}</div>`;
}
/* шаг показа: много наград — короче, весь показ не дольше PS_FX.span */
const psStep = n => Math.max(PS_FX.stepMin, Math.min(PS_FX.step, Math.floor(PS_FX.span / Math.max(1, n))));
const psCount = R => R.items.reduce((a, it) => a + it.list.length, 0);
/* итог получения: список в том порядке, как выдано; сундуки — в запасах */
function psGotItems(R, fx) {
  const e = fx && !fx.done ? Math.max(0, psNow() - fx.t0) : 0, d = t => `${Math.round(t - e)}ms`, step = psStep(psCount(R));
  let i = 0;
  return R.items.map(it => it.list.map(x => {
    const k = i++, at = k * step;
    const anim = fx && !fx.done ? ` style="--dt:${d(at)};--tt:${PS_FX.rise}ms;--df:${d(at + 80)};--tf:${PS_FX.flash}ms"` : '';
    return `<div class="ps-gi" data-psfx="${fx ? fx.id : 0}:${k}" data-r="${psR(x) || ''}"${anim}><i class="ps-gf" aria-hidden="true"></i><span class="ps-big sm" data-r="${psR(x) || ''}">${psPic(x)}</span><div class="col" style="gap:1px"><b>${trEsc(psName(x))}${x.n != null ? ` <span class="num gold">×${fmt(x.n)}</span>` : ''}</b><small class="faint">${it.t ? `ступень ${it.t}${it.row === 'paid' ? ' · платный ряд' : ''}` : ''}</small></div></div>`;
  }).join('')).join('');
}
Object.assign(OV, {
  /* стартовый набор: всё, что внутри, до оплаты; раз за игру — сервер помнит покупку */
  stbuy(o) {
    if (!psOk() || !PSD.store || !S.store) return '';
    const T = PSD.store.starter, got = !!S.store.starter, op = (o && o.arg) || 'st' + S.store.srv.seq;
    const li = [
      `Рунные ключи — ${fmt(T.keys)}, души — ${fmt(T.souls)}. Первая покупка ×${T.x}: вы получите ${fmt(T.keys * T.x)} и ${fmt(T.souls * T.x)}.`,
      'Раз за игру: второй раз набор не продаётся.',
      'Больше рунные ключи и души за деньги не продаются — только игрой: боссы биомов, контракты, сундуки.',
    ];
    const foot = got ? `<span class="chip spirit">${ic('check')}набор получен</span><span class="g-spacer"></span><button class="btn" data-a="close">Закрыть</button>`
      : `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="stbuydo" data-v="${op}">Купить · ${fmt(T.rub)} ₽</button>`;
    return sheet(T.n, `<p class="muted ps-lead">Ключи к рунным стражам и души для Эхо и пробуждений — на первые шаги пути.</p>
      <div class="row ps-stq">${costTag('keys', T.keys * T.x)}${costTag('souls', T.souls * T.x)}</div><ul class="ps-li">${li.map(x => `<li>${x}</li>`).join('')}</ul>
      ${TM('<p class="reason">Прототип: окно оплаты платформы не вызывается, «сервер» выдаёт набор сразу. ST_SRV.buy — операция с номером: повтор ничего не выдаёт, вторая покупка — отказ. Состав — EN_PASS.store.starter.</p>')}`, foot);
  },
  /* ступень: обе награды, что внутри, «Забрать»; платный ряд закрыт — ссылка на его лист */
  pstier(o) {
    if (!psOk() || !S.pass) return '';
    const t = Math.max(1, Math.min(PSD.tiers, +o.arg || 1)), on = t <= psTier(), need = t * PSD.tierPts - psPts();
    const head = `<div class="row ps-sth"><span class="chip ${on ? 'spirit' : ''}">${on ? `${ic('check')}ступень взята` : `нужно ещё ${fmt(need)} ${plural(need, 'очко', 'очка', 'очков')}`}</span>${t % PS_VIEW.page === 0 ? '<span class="chip gold">веха</span>' : ''}</div>`;
    const nav = `<button class="iconbtn" data-a="sheet" data-v="pstier:${Math.max(1, t - 1)}" aria-label="Предыдущая ступень"${t > 1 ? '' : ' disabled'}>${ic('back')}</button><button class="iconbtn ps-fw" data-a="sheet" data-v="pstier:${Math.min(PSD.tiers, t + 1)}" aria-label="Следующая ступень"${t < PSD.tiers ? '' : ' disabled'}>${ic('back')}</button>`;
    return sheet(`Ступень ${t}`, `${head}${psBlock('free', t)}${psBlock('paid', t)}${TM(`<p class="reason">Клетки — EN_PASS.rows, итог — EnPass.cell на уровне ${S.acc.level} и цикле ${ROMAN[S.acc.cycle]}; «Забрать» — PS_SRV.claim с номером, повтор ничего не выдаёт.</p>`)}`, `${nav}<span class="g-spacer"></span><button class="btn" data-a="close">Закрыть</button>`);
  },
  /* платный ряд: всё, что он даёт, — до покупки; цена и что останется; купить можно в любой день сезона */
  pspaid() {
    if (!psOk() || !S.pass) return '';
    const tot = {}, chests = [];
    for (let t = 1; t <= PSD.tiers; t++) for (const x of PSA.cell(PSD, 'paid', t, psAcc())) { if (x.k === 'chest') chests.push(x); else tot[x.k] = (tot[x.k] || 0) + x.n; }
    const cells = Object.entries(tot).filter(([k]) => k !== 'enerium').map(([k, n]) => `<div class="ps-pt"><span class="ps-big sm">${psPic({ k })}</span><b class="num">${psNum(n)}</b><small>${PS_KIND[k]}</small></div>`)
      .concat(chests.length ? [`<div class="ps-pt"><span class="ps-big sm" data-r="${chests[chests.length - 1].r}">${psPic(chests[0])}</span><b class="num">×${chests.length}</b><small>${psChestSum(chests)}</small></div>`] : [])
      .concat(tot.enerium ? [`<div class="ps-pt en"><span class="ps-big sm">${psPic({ k: 'enerium' })}</span><b class="num">${fmt(tot.enerium)}</b><small>Энериум назад</small></div>`] : []).join('');
    const got = S.pass.paid, have = S.wallet.enerium, lack = Math.max(0, PSD.price - have), will = [];
    for (let t = 1; t <= psTier(); t++) if (!S.pass.got.paid[t]) will.push(t);
    const li = [
      'Очков не прибавляет: ступени берутся только делами.',
      got ? 'Открыт на весь сезон.' : will.length ? `Взятые ступени — сразу: ${will.length} ${plural(will.length, 'награда ждёт', 'награды ждут', 'наград ждут')} «Забрать». Остальные — по пути.` : 'Награды — по мере пути, со ступенями бесплатного ряда.',
      'Облика и героев здесь нет: рамка сезона — у бесплатного ряда.',
      `Цена одна на весь сезон — ${fmt(PSD.price)} Энериума; Энериум можно добыть и в игре.`,
    ];
    const deal = got ? '' : `<dl class="lv-deal"><dt>Цена</dt><dd>${costTag('enerium', PSD.price)}</dd><dt>${lack ? 'Не хватает' : 'Останется'}</dt><dd class="${lack ? 'lack' : ''}">${costTag('enerium', lack || have - PSD.price)}</dd></dl>`;
    const op = 'ps' + S.pass.srv.seq;
    const foot = got ? `<span class="chip spirit">${ic('check')}платный ряд открыт</span><span class="g-spacer"></span><button class="btn" data-a="close">Закрыть</button>`
      : lack ? `<button class="btn ghost" data-a="close">Отмена</button><span class="g-spacer"></span><button class="btn" data-a="go" data-v="store:en">Лавка Энериума</button>`
      : `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="psbuy" data-v="${op}">Открыть${costTag('enerium', PSD.price)}</button>`;
    return sheet('Платный ряд', `<p class="muted ps-lead">Ещё немного наград на тех же ступенях и Энериум назад. Бесплатный ряд остаётся вашим целиком.</p>
      <div class="ps-pg2">${cells}</div><ul class="ps-li">${li.map(x => `<li>${x}</li>`).join('')}</ul>${deal}
      ${TM(`<p class="reason">Всего за сезон на уровне ${S.acc.level}, цикл ${ROMAN[S.acc.cycle]}. ×1,7 по каждому виду — таблица «×1,7» черновика: платный ряд даёт 60 % бесплатного ряда по валюте и три сундука без чистого окна; Энериум — возврат ${fmt(PSD.econ.en.refund)} из ${fmt(PSD.price)}. Покупка — PS_SRV.buy с номером: повтор не списывает.</p>`)}`, foot);
  },
  /* откуда очки: дела по источникам этого сезона; потолок копится */
  pssrc() {
    if (!psOk() || !S.pass) return '';
    const room = Math.floor(Math.max(0, PSA.capTo(PSD, S.pass.day) - S.pass.pts100) / 100), done = psTier() >= PSD.tiers;
    const rows = PSD.sources.map(x => { const v = Math.floor((S.pass.by[x.id] || 0) / 100);
      return `<div class="ev-row ps-sr"><button class="ev-main" data-a="go" data-v="${x.go}" aria-label="${trEsc(`${x.n}: ${v} ${plural(v, 'очко', 'очка', 'очков')} за сезон — перейти`)}"><img class="ev-pic" src="${PATH(x.p)}" alt=""><span class="ev-tx"><b>${x.n}</b><small>${x.what}</small></span><b class="num ev-v">${v ? fmt(v) : '—'}</b></button></div>`; }).join('');
    const line = done ? 'Путь сезона пройден.' : room ? `Сегодня можно набрать ещё ${fmt(room)} ${plural(room, 'очко', 'очка', 'очков')}.` : `Запас на сегодня набран — завтра прибавится ещё ${fmt(PSD.dayCap)}.`;
    return sheet('Откуда очки', `<p class="muted ps-lead">Очки дают дела — те же, что считает Событие недели. Больше всего — спуск и Эхо.</p><div class="ev-rows ps-rows">${rows}</div>
      <p class="reason">${line} За день — до ${fmt(PSD.dayCap)} очков; пропущенный день не сгорает — запас копится с начала сезона.</p><p class="reason">Очки и ступени не продаются.</p>
      ${TM(`<p class="reason">Очки дел — таблица цен Событий (EN_PASS.units) без акцента недели, ${PSD.rate} очков дел = 1 очко пропуска; дневные потолки единиц — как у Событий; потолок сезона — день × ${PSD.dayCap}. Засчитывает PS_SRV.credit — обёртка EN_EV.srv.credit, номер операции свой.</p>`)}`);
  },
  /* как устроен пропуск — правила словами игрока */
  psinfo() {
    if (!psOk()) return '';
    const f = psFrame(), li = [
      `Сезон «${trEsc(PSD.season.n)}» идёт ${PSD.season.days} дней, до конца — ${dur(psLeft())}.`,
      `${PSD.tiers} ступеней по ${PSD.tierPts} очков. Очки приносят дела: забеги, Эхо, ритуалы, контракты, Арена, клан, мастерская.`,
      `За день — до ${PSD.dayCap} очков. Пропущенный день не сгорает: запас копится, его можно добрать позже.`,
      `Бесплатный ряд — у всех. Последняя ступень — рамка «${trEsc(f ? f.n : PSD.season.n)}».`,
      `Платный ряд — ещё немного наград и Энериум назад. Открыть можно в любой день сезона: награды взятых ступеней сразу ждут «Забрать».`,
      'Награды-валюта растут с уровнем Странника, сундуки — с циклом.',
      'Не забрали до конца сезона — награды придут во Входящие.',
    ];
    return sheet('Пропуск', `<ul class="ps-li">${li.map(x => `<li>${x}</li>`).join('')}</ul>${TM('<p class="reason">§32: два ряда, сезон, прогресс только активностью. Числа — EN_PASS, обоснование и прогон — docs/content/пропуск-и-награды.md.</p>')}`);
  },
  /* получение: награды поднимаются по одной; нажатие — сразу итог */
  psgot() {
    const fx = S.pass && S.pass.fx; if (!fx) return '';
    const R = fx.res, n = R.items.reduce((a, it) => a + it.list.length, 0), chests = R.items.some(it => it.list.some(x => x.k === 'chest'));
    const tap = !fx.done ? '<button class="ps-tap" data-a="psskip" aria-label="Сразу итог" tabindex="-1"></button>' : '';
    return dialog('Награды пропуска', `<div class="ps-got${fx.done ? '' : ' anim'}" data-psrun="${fx.id}">${psGotItems(R, fx)}${tap}</div>${chests ? '<p class="reason">Сундуки — в запасах: открыть в «Ремесле».</p>' : ''}`,
      `<span class="faint">${n} ${plural(n, 'награда', 'награды', 'наград')}</span><span class="g-spacer"></span><button class="btn go" data-a="close">Готово</button>`, 'ps-dlg');
  },
  /* дар дня: сегодняшняя отметка крупно, лист из 30 отметок, вехи рисунками */
  gift() {
    if (!psOk() || !S.gift) return dialog('Дар дня', '<p class="faint">Нет данных листа даров: рядом с index.html должен лежать pass.js.</p>');
    const G = S.gift, can = G.last < G.today, m = can ? (G.got >= PSD.cal.marks ? 1 : G.got + 1) : G.got, fx = G.fx;
    const list = PSA.mark(PSD, Math.max(1, m), psAcc()), x = list[0], M = PSA.mile(PSD, m), op = 'dg' + G.srv.seq;
    const art = M && psArt(M.art) ? `<img class="dg-art" src="${AV(M.art)}" alt="">` : `<span class="ps-big dg-pic" data-r="${psR(x) || ''}">${psPic(x)}</span>`;
    const e = fx ? Math.max(0, psNow() - fx.t0) : 0;
    const anim = fx ? ` style="--dt:${-e}ms;--tt:${PS_FX.gift.pop}ms"` : '';
    const btn = can ? `<button class="btn go dg-get" data-a="giftget" data-v="${op}">Забрать</button>`
      : `<span class="chip spirit">${ic('check')}получено</span><small class="faint dg-cd">следующая — через <span class="num" data-cd="gift">${dur(G.left)}</span></small>`;
    const today = `<div class="dg-today${M ? ' mile' : ''}${M && M.main ? ' main' : ''}${fx ? ' anim' : ''}${!can ? ' got' : ''}" data-dgrun="${fx ? fx.id : 0}"${anim}>
      <span class="eyebrow">отметка ${m} из ${PSD.cal.marks}</span><div class="dg-stage"><i class="dg-glow" aria-hidden="true"></i>${art}</div>
      ${M ? `<b class="serif dg-mn">${trEsc(M.n)}</b><small class="dg-ml">${trEsc(psLabel(list))}</small>` : `<b class="serif dg-name">${trEsc(psLabel(list))}</b>`}${btn}
      ${fx ? '<button class="ps-tap" data-a="dgskip" aria-label="Сразу итог" tabindex="-1"></button>' : ''}</div>`;
    const cells = Array.from({ length: PSD.cal.marks }, (_, i) => dgCell(i + 1, can ? m : 0)).join('');
    return dialog('Дар дня', `<div class="dg">${today}<div class="dg-r"><div class="dg-grid" role="list" aria-label="Лист даров">${cells}</div>${dgMiles(m, can)}</div></div>
      <p class="reason">Лист не сгорает: пропущенный день ничего не отнимает. Награды растут с уровнем Странника.</p>
      ${TM(`<p class="reason">§29: главный приз — на 20-й отметке; прощаем все пропуски — предложение автору. Лист ${G.sheet}, сутки ${G.today}; «Забрать» — DG_SRV.claim с номером, повтор ничего не выдаёт. Демо: <button class="link" data-a="psteam" data-v="day">новые сутки</button></p>`)}`, '', 'wide dg-dlg');
  },
});
/* вехи крупно — строкой под листом: рисунок, имя и когда. m — сегодняшняя отметка (can — ещё не взята) или последняя взятая;
   «через N» — сколько отметок после сегодняшней */
function dgMiles(m, can) {
  const G = S.gift;
  return `<div class="dg-miles">${Object.keys(PSD.cal.miles).map(Number).map(k => {
    const M = PSD.cal.miles[k], x = PSA.mark(PSD, k, psAcc())[0], got = k <= G.got && !(can && G.got >= PSD.cal.marks), left = k - m;
    const when = got ? 'получен' : can && k === m ? 'сегодня' : `через ${left} ${plural(left, 'отметку', 'отметки', 'отметок')}`;
    const pic = psArt(M.art) ? `<img src="${AV(M.art)}" alt="">` : psPic(x);
    return `<div class="dg-m${M.main ? ' main' : ''}${got ? ' got' : ''}${can && k === m ? ' now' : ''}" data-r="${psR(x) || ''}" title="${trEsc(`${M.n}, отметка ${k}: ${psLabel(PSA.mark(PSD, k, psAcc()))}`)}"><span class="dg-mp">${pic}${M.main ? `<span class="dg-cr">${ic('crown')}</span>` : ''}</span><b>${trEsc(M.n)}</b><small class="${got ? 'spirit' : 'faint'}">${when}</small></div>`;
  }).join('')}</div>`;
}
/* клетка листа даров: взята, сегодня, впереди; веха — рисунок или значок в золотой рамке, главный дар — корона */
function dgCell(k, now, o = {}) {
  const G = S.gift, got = o.got != null ? o.got : k <= G.got && !(now && G.got >= PSD.cal.marks), M = PSA.mile(PSD, k), list = PSA.mark(PSD, k, psAcc()), x = list[0];
  const st = o.st || (got ? 'got' : k === now ? 'now' : 'later');
  const pic = M && psArt(M.art) ? `<img class="dg-mimg" src="${AV(M.art)}" alt="">` : psPic(x);
  const lbl = `Отметка ${k}${M ? ' · ' + M.n : ''}: ${psLabel(list)}${st === 'got' ? ', получено' : st === 'now' ? ', сегодня' : ''}`;
  return `<span class="dg-c ${st}${M ? ' mile' : ''}${M && M.main ? ' main' : ''}" role="listitem" data-r="${psR(x) || ''}" aria-label="${trEsc(lbl)}" title="${trEsc(lbl)}"><small class="num">${k}</small><span class="dg-ci">${pic}</span>${M && M.main ? `<span class="dg-cr">${ic('crown')}</span>` : ''}${st === 'got' ? `<span class="ps-ck">${ic('check')}</span>` : ''}</span>`;
}

/* ================== показ получения ================== */
let psFxSeq = 0, PS_FXI = null;
function psFxLayer() {
  if (!window.EnFx) return null;
  const g = document.getElementById('game'), p = g && g.parentElement; if (!p || !p.querySelector) return null;
  let L = p.querySelector(':scope > .ps-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'ps-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  if (!PS_FXI || PS_FXI.host !== L) { if (PS_FXI) PS_FXI.destroy(); try { PS_FXI = EnFx.create(L); } catch (_) { PS_FXI = null; } }
  return PS_FXI ? { fx: PS_FXI, g } : null;
}
function psBurst(sel, x) {
  const A = psFxLayer(); if (!A) return;
  const el = A.g.querySelector(sel); if (!el) return;
  const b = A.fx.center(el), r = psR(x), col = r ? psColor(r) : psCurCol(x.k), P = r ? PS_FX.burst[r] : PS_FX.cur;
  if (P) A.fx.burst(b.x, b.y, col, ...P);
  if (r >= PS_FX.gold && P) A.fx.burst(b.x, b.y, EnFx.COL.gold, ...P);
  if (r >= PS_FX.ring) A.fx.ring(b.x, b.y, col, Math.max(24, b.w * 0.9), PS_FX.ringMs, 2);
}
/* показ пропуска: лист psgot, награды по одной; частицы — у первых наград и у всех с эпической */
function psShow(res) {
  const fx = { id: ++psFxSeq, t0: psNow(), res, done: psReduced() };
  S.pass.fx = fx; S.overlay = { t: 'psgot' }; render();
  if (fx.done) return;
  const step = psStep(psCount(res));
  let k = 0;
  for (const it of res.items) for (const x of it.list) {
    const i = k++;
    if (i >= PS_FX.bursts && psR(x) < PS_FX.gold) continue;
    setTimeout(() => { if (S.pass.fx === fx && !fx.done) psBurst(`[data-psfx="${fx.id}:${i}"] .ps-big`, x); }, i * step + PS_FX.flash);
  }
  setTimeout(() => { if (S.pass.fx === fx && !fx.done) { fx.done = true; if (S.overlay && S.overlay.t === 'psgot') render(); } }, k * step + PS_FX.rise + PS_FX.tail);
}
/* показ дара дня: в карточке «Сегодня» — вспышка, частицы, отметка */
function dgShow(res) {
  const G = S.gift;
  if (psReduced()) { G.fx = null; render(); return; }
  const fx = { id: ++psFxSeq, t0: psNow(), res };
  G.fx = fx; render();
  setTimeout(() => { if (G.fx === fx) psBurst(`[data-dgrun="${fx.id}"] .dg-stage`, res.list[0]); }, PS_FX.gift.pop / 2);
  setTimeout(() => { if (G.fx === fx) { G.fx = null; if (S.overlay && S.overlay.t === 'gift') render(); } }, PS_FX.gift.end);
}

/* ================== действия ================== */
Object.assign(ACT, {
  pspage(v) { const n = +v; if (!S.pass || !(n >= 1)) return; S.pass.view.page = n; render(); },
  /* «Забрать» одной клетки: «номер:ряд:ступень» */
  psclaim(v) {
    const [op, row, t] = String(v || '').split(':'), x = PS_SRV.claim(op, row, +t);
    if (x.again) return;
    if (x.refuse) return toast(PS_REFUSE[x.refuse] || PS_REFUSE.none);
    psShow(x.res);
  },
  psall(v) {
    const x = PS_SRV.all(v);
    if (x.again) return;
    if (x.refuse) return toast(PS_REFUSE[x.refuse] || PS_REFUSE.empty);
    S.pass.view.page = 0; psShow(x.res);
  },
  psbuy(v) {
    const x = PS_SRV.buy(v);
    if (x.again) return;
    if (x.refuse) return toast(x.refuse === 'money' ? `Не хватает ${fmt(x.lack)} Энериума` : PS_REFUSE[x.refuse]);
    S.overlay = null;
    toast(x.res.wait ? `Платный ряд открыт — ${x.res.wait} ${plural(x.res.wait, 'награда ждёт', 'награды ждут', 'наград ждут')}` : 'Платный ряд открыт', curImg('enerium'));
  },
  psskip() { const fx = S.pass && S.pass.fx; if (fx) { fx.done = true; render(); } },
  /* стартовый набор: лист до оплаты, затем операция с номером */
  stbuy(v) { S.overlay = { t: 'stbuy', arg: v }; render(); },
  stbuydo(v) {
    const x = ST_SRV.buy(v);
    if (x.again) return;
    if (x.refuse) return toast(ST_REFUSE[x.refuse] || ST_REFUSE.op);
    S.overlay = null;
    toast(`Стартовый набор: рунные ключи +${fmt(x.res.keys)}, души +${fmt(x.res.souls)}`, curImg('keys'));
  },
  giftget(v) {
    const x = DG_SRV.claim(v);
    if (x.again) return;
    if (x.refuse) return toast(x.refuse === 'today' ? 'Сегодняшний дар уже получен' : 'Операция без номера');
    S.overlay = { t: 'gift' };
    dgShow(x.res);
  },
  dgskip() { if (S.gift && S.gift.fx) { S.gift.fx = null; render(); } },
  /* команде: демо «+ забег», новые сутки, Энериум, конец сезона */
  psteam(v) {
    const [k, n] = String(v || '').split(':');
    if (k === 'run') { for (const [u, q] of Object.entries(PS_TEAM.run)) PS_SRV.credit(`команда:${n}:${u}`, u, q); }
    else if (k === 'day') psNewDay();
    else if (k === 'en') S.wallet.enerium += PS_TEAM.en;
    else if (k === 'end') { const r = PS_SRV.end(); toast(r && r.n ? `Сезон завершён: ${r.n} ${plural(r.n, 'награда', 'награды', 'наград')} — во Входящих` : 'Сезон завершён'); return; }
    render();
  },
});

/* ================== Лавка Энериума: вкладка «Пропуск» ================== */
const psStore0 = SCREENS.store;
SCREENS.store = function () {
  const m = psStore0.apply(this, arguments);
  if (m && m.seg) m.seg = Object.assign({}, m.seg, { items: m.seg.items.map(([k, l]) => (k === 'pass' ? [k, l, psWaiting().length > 0] : [k, l])) });
  if (S.seg.store === 'en' && psOk() && PSD.store) return Object.assign({}, m, { html: `<section class="scr">${stView()}</section>` });
  if (S.seg.store !== 'pass') return m;
  return Object.assign({}, m, { html: psView() });
};
/* вкладка «Энериум»: стартовый набор крупно — раз за игру, ×2 первой покупки; ниже — пакеты Энериума и подписка (EN_PASS.store).
   Рубли — вид витрины прототипа: платёж проводит платформа. Карточка — значок, имя, не больше двух чисел и одно действие */
function stView() {
  const ST = PSD.store, T = ST.starter, got = !!(S.store && S.store.starter), op = 'st' + (S.store ? S.store.srv.seq : 1);
  /* зал доната — материалы витрины сетов (screens/heroes.js, DN_ART): чёрный мрамор, старое золото, свет Энериума снизу */
  const hall = typeof DN_ART !== 'undefined' && typeof dnArt === 'function' && dnArt(DN_ART.hall);
  const starter = `<div class="rcard ps-st${got ? ' got' : ''}" data-r="6">${got ? '' : `<i class="st-x2" aria-hidden="true">×${T.x}</i>`}
      <span class="eyebrow">${got ? 'Получено' : `Раз за игру · первая покупка ×${T.x}`}</span><b>${T.n}</b>
      <div class="row ps-stq">${costTag('keys', T.keys * T.x)}${costTag('souls', T.souls * T.x)}</div>
      <small class="muted">Рунные ключи и души за деньги — только в этом наборе.</small>
      ${got ? `<span class="chip spirit ps-stb">${ic('check')}куплено</span>` : `<button class="btn go sm ps-stb" data-a="stbuy" data-v="${op}">${fmt(T.rub)} ₽</button>`}</div>`;
  const pack = p => `<div class="rcard st-pk" data-r="${p.firstX ? 6 : 3}"><span class="st-ped" aria-hidden="true"><img class="st-cr" src="${ART('enerium.png')}" alt=""></span><b>${p.n}</b><small class="muted num">${fmt(p.en)} Энериума${p.firstX ? ` · первая покупка ×${p.firstX}` : ' в день'}</small><button class="btn go sm st-buy" data-a="toast" data-v="${tmT('Покупка пока недоступна', 'Покупка в прототипе не выполняется')}">${fmt(p.rub)} ₽${p.days ? ` / ${p.days} дней` : ''}</button></div>`;
  return `<div class="st-hall${hall ? ' art' : ''}">${hall ? `<img class="st-bg" src="${AV(DN_ART.hall)}" alt="">` : ''}
    <div class="ps-store">${starter}<div class="rcards grow">${ST.packs.map(pack).join('')}${pack(ST.sub)}</div></div>
    <p class="reason">За деньги — только больше возможностей отработать прогресс. Рунные ключи и души — только стартовым набором, раз за игру. Попытки и рейтинг не продаются.</p></div>`;
}

/* ================== для других экранов ================== */
/* Убежище: «Дар дня» светится, пока сегодняшняя отметка ждёт; «Пропуск» — точка, если ждут награды */
function psShelterBtns() {
  if (!psOk() || !S.gift || !S.pass) return `<button class="btn sm" data-a="dlg" data-v="gift">Дар дня</button>`;
  const g = S.gift.got < S.gift.day, w = psWaiting().length;
  return `<button class="btn sm ps-sb${g ? ' hot' : ''}" data-a="dlg" data-v="gift" aria-label="Дар дня${g ? ': можно забрать' : ''}">${ic('star')}Дар дня${g ? '<i class="dot" aria-hidden="true"></i>' : ''}</button>`
    + `<button class="btn sm ps-sb" data-a="go" data-v="store:pass" aria-label="Пропуск${w ? ': ждут награды' : ''}">${ic('flag')}Пропуск${w ? '<i class="dot" aria-hidden="true"></i>' : ''}</button>`;
}
/* Входящие, вкладка «Награды»: строка дара дня */
function psGiftRow() {
  if (!psOk() || !S.gift) return '';
  const G = S.gift, can = G.got < G.day, m = can ? G.day : G.got, x = PSA.mark(PSD, Math.max(1, m), psAcc())[0], M = PSA.mile(PSD, m);
  return `<span class="eyebrow">Дар дня</span><button class="mail dg-row" data-a="dlg" data-v="gift"><span class="well" data-r="${psR(x) || ''}" style="--s:34px">${psPic(x)}</span><div class="col" style="gap:2px;min-width:0;flex:1"><b>${M ? `${trEsc(M.n)} · ` : ''}отметка ${m} из ${PSD.cal.marks}</b><small class="faint">главный дар — на ${PSD.cal.main}-й отметке</small></div><span class="chip ${can ? 'spirit' : ''}">${can ? 'можно забрать' : 'получено'}</span></button>`;
}

/* ================== состояние и сутки ================== */
const psInit0 = initialState;
initialState = function () { return psState(psInit0()); };
psState(S);
/* сутки идут каждую секунду: на экране меняются только числа; кончились — сервер открывает новые сутки */
if (typeof setInterval === 'function') setInterval(() => {
  if (!S || !S.gift || S.gift.v !== 1) return;
  if (S.gift.left > 0) S.gift.left--;
  if (S.gift.left <= 0) { psNewDay(); if (S.route === 'shelter' || S.route === 'store' || (S.overlay && S.overlay.t === 'gift')) render(); return; }
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    document.querySelectorAll('[data-cd="gift"]').forEach(e => { e.textContent = dur(S.gift.left); });
    if (S.pass) document.querySelectorAll('[data-cd="pass"]').forEach(e => { e.textContent = dur(psLeft()); });
  }
}, 1000);

/* ================== UI-кит: «Боевой пропуск и дар дня» ================== */
function psKitHtml() {
  if (!psOk()) return '<section class="k-box"><h3>Боевой пропуск и дар дня</h3><p class="k-note">Нет данных: pass.js.</p></section>';
  const t = 10, cells = [['got', 'забрано'], ['ready', 'ждёт «Забрать»'], ['far', 'ступень впереди'], ['lock on', 'платный ряд закрыт']]
    .map(([st, c]) => `<figure class="ps-kf">${psCell('free', t, { kit: true, st })}<figcaption>${c}</figcaption></figure>`).join('');
  const W = [['free', 13], ['free', 14], ['paid', 10]];
  const nexts = [['wait', 'ждут награды'], ['next', 'следующая ступень'], ['done', 'путь пройден']].map(([st, c]) => `<figure class="ps-kn">${psNext({ kit: true, st, w: W })}<figcaption>${c}</figcaption></figure>`).join('');
  const dg = [[3, 'got', 'взята'], [4, 'now', 'сегодня'], [7, 'later', 'веха'], [20, 'later', 'главный дар'], [11, 'later', 'впереди']]
    .map(([k, st, c]) => `<figure class="ps-kf">${dgCell(k, 0, { st, got: st === 'got' })}<figcaption>${c}</figcaption></figure>`).join('');
  const artRow = [['banner', PSD.art.banner, 'баннер сезона'], ['g7', PSD.cal.miles[7].art, 'дар недели'], ['g14', PSD.cal.miles[14].art, 'две недели'], ['g20', PSD.cal.miles[20].art, 'главный дар'],
    ['g30', PSD.cal.miles[30].art, 'венец листа'], ['crown', PSD.art.crown, 'последняя ступень'], ['worker', PSD.art.worker, 'рабочий'], ['dust', PSD.art.dust, 'прах душ']]
    .map(([k, p, c]) => `<figure class="ps-ka${k === 'banner' ? ' wide' : ''}">${psArt(p) ? `<img src="${AV(p)}" alt="">` : `<i class="ps-art stub" aria-hidden="true"></i>`}<figcaption>${c}${TM(psArt(p) ? '' : ' · не выгружено')}</figcaption></figure>`).join('');
  const board = ['поднимается', 'вспышка и частицы', 'на месте'].map((c, i) => `<figure class="ps-kb"><div class="ps-gi kb${i}"><i class="ps-gf" aria-hidden="true"></i><span class="ps-big sm" data-r="4">${psPic({ k: 'chest', box: PSD.chestBox, r: 4, win: 'step' })}</span></div><figcaption>${c}</figcaption></figure>`).join('');
  const E = PSD.econ, pace = [2, 3, 4, 5, 6].map(c => { const P = E.pace[c]; return `<tr><td>${ROMAN[c]}</td><td class="n">${P.o.med}</td><td class="n">${P.e.med}</td><td class="n">${P.p.med}</td><td class="n">${P.z.tier}</td></tr>`; }).join('');
  const team = TM(`<div class="p-table-wrap"><table class="p-table"><tr><th>Цикл</th><th>Обычный: день</th><th>Увлечённый: день</th><th>Плательщик: день</th><th>Занятый: ступень к концу</th></tr>${pace}</table></div>
    <p class="k-note">Прогон — tools/content-gen/pass/build.js: ${PSD.tiers} ступеней × ${PSD.tierPts} очков, потолок ${PSD.dayCap} в день копится; ×1,7 по каждому виду держится, Энериум: цена ${fmt(PSD.price)}, возврат ${fmt(E.en.refund)}, бесплатный ряд ${fmt(E.en.free)} и лист даров ${fmt(E.en.cal28)} за 4 недели — ручеёк бесплатного игрока (ADR-0033), контракты обычного — ${fmt(E.en.contracts28)}; сроки целей — docs/content/экономика-энериум.md. Рунных ключей в рядах и листе нет. Черновик — docs/content/пропуск-и-награды.md.</p>`, 'div');
  return `<section class="k-box ps-kbox" style="grid-column:1/-1"><h3>Боевой пропуск и дар дня</h3>
    <p class="k-note">Пропуск — лента из ${PSD.tiers} ступеней страницами по десять: два ряда, страница кончается вехой; следующая награда — крупно слева, одно действие — «Забрать всё». Что даёт платный ряд — лист до покупки. Дар дня — отметка в сутки: сегодняшняя крупно и светится, лист не сгорает, вехи 7, 14, 20 и 30 — рисунками. Получение — награды поднимаются по одной, частицы по редкости; только transform и opacity.</p>
    <div class="ps-kit"><div class="k-air-r"><b>Клетка ленты</b><div class="k-row">${cells}</div><small>Значок и одно число; сундук — кристаллом редкости. Отметка — «получено», точка — ждёт, замок — платный ряд.</small></div>
      <div class="k-air-r"><b>Следующая награда</b><div class="k-row ps-knr">${nexts}</div></div>
      <div class="k-air-r"><b>Лист даров</b><div class="k-row">${dg}</div><small>Сегодня — свет снизу; веха — золотая рамка; главный дар — корона.</small></div>
      <div class="k-air-r"><b>Арт</b><div class="k-row ps-kar">${artRow}</div><small>Пока картинка не выгружена — заглушка CSS, битых картинок нет.</small></div>
      <div class="k-air-r"><b>Получение · раскадровка</b><div class="k-row">${board}</div></div></div>${team}</section>`;
}
KIT_EXTRA.push({ html: psKitHtml });

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Пропуск · лента ступеней', 'Сезон «Осенний путь»: баннер, ступень и очки, лента страницами по десять, два ряда; следующая награда крупно', () => { S.overlay = null; S.route = 'store'; S.seg.store = 'pass'; S.pass.view.page = 0; }],
  ['Пропуск · забрать награды', 'Три ступени ждут: «Забрать всё» — награды поднимаются по одной, сундуки — в запасы', () => { S.overlay = null; S.route = 'store'; S.seg.store = 'pass'; ACT.psall('ps' + S.pass.srv.seq); }],
  ['Пропуск · платный ряд', 'Всё, что даёт платный ряд, — до покупки; цена одна на сезон, очков не прибавляет', () => { S.route = 'store'; S.seg.store = 'pass'; S.overlay = { t: 'pspaid' }; }],
  ['Дар дня · забрать', 'Лист даров из 30 отметок: сегодняшняя крупно, «Забрать» — вспышка и частицы', () => { S.route = 'shelter'; S.overlay = { t: 'gift' }; }],
  ['Дар дня · главный дар', 'Двадцатая отметка — главный дар: сундук чистого окна и Энериум', () => { S.route = 'shelter'; S.gift.got = PSD.cal.main - 1; S.gift.last = S.gift.today - 1; dgSync(); S.overlay = { t: 'gift' }; }],
  ['Лавка · стартовый набор', 'Рунные ключи и души за деньги — только этим набором, раз за игру, первая покупка ×2; что внутри — листом до оплаты', () => { S.route = 'store'; S.seg.store = 'en'; S.overlay = S.store ? { t: 'stbuy', arg: 'st' + S.store.srv.seq } : null; }],
);
