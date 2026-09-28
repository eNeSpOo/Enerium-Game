/* screens/wanderer.js — «Странник»: вкладки «Память», «Артефакты» и «Достижения» на данных автора (§2.2, §2.4–§2.8, §14.1, §16, §29, §33.4 GDD;
   ADR-0003, ADR-0014, ADR-0023, ADR-0026, ADR-0027). Договор — screens/model.js. Данные — wanderer.js (window.EN_WANDERER): его собирает
   tools/content-gen/wanderer/build.js из таблиц автора source-data/ и черновика достижений, руками не править.
   Регистрирует: SCREENS.profile — «Обзор» остаётся прежним profileView, три вкладки — отсюда; OV.mem — окно «одна из трёх», OV.memreset —
   полный сброс, листы OV.wnp, wncat, wnart, wnfeat, wnpas, wnfame; действия ACT.wn*; раздел UI-кита «Память Странника» (KIT_EXTRA); сценарии.
   Своё состояние: S.mem — Память (места, тройки, анимация), S.wn — артефакты, достижения, номера операций. S.mem.slots[i].st — как раньше:
   'open', 'set' или 'lock' — его читает Убежище.
   Сервер решает, клиент показывает. Тройка Памяти решена «сервером» WN_SRV до анимации: wnRoll — чистая функция сида места и исключённых
   (§2.6: сначала редкость, затем пассивка по весу внутри неё; на вариант два броска генератора, на тройку — шесть). Сид — заглушка
   серверного сида от места и номера тройки. Переброс, закрепление, сброс, покупка и уровень артефакта, получение достижения — операции
   с номером: повтор того же номера не повторяет ни расход, ни выдачу; устаревшее окно не закрепит заменённый вариант (§2.5).
   Карты тройки выходят по очереди. Чем реже пассивка, тем ярче кристалл, больше живых огоньков и богаче вспышка появления:
   у обычной — тонкое кольцо, у вневременной — полный всплеск (WN_VIEW.fx, частицы EnFx из fx.js). «Пропустить анимацию» помнит
   localStorage (без него всё работает), при prefers-reduced-motion анимации нет. Эффекты пассивок, артефактов и достижений — показ:
   в расчёты прототипа не входят (§2.8). Числа баланса — в данных, демо-состояние — WN_DEMO. Служебное — только команде: TM, PL, tmT.
   Автопроверка — tools/content-gen/screens/check_wanderer.js. */
'use strict';

const WN = window.EN_WANDERER || null;

/* ================== вид: числа вида, не баланса ================== */
const WN_VIEW = {
  stepMs: 520,              // карты тройки выходят по очереди: шаг, мс
  flyMs: 480,               // выход одной карты, мс — та же длительность у CSS .wn-card.in
  landMs: 300,              // от начала выхода карты до вспышки, мс
  tail: 260,                // после последней вспышки — и кнопки оживают, мс
  motes: [0, 0, 0, 2, 3, 5, 7, 10],   // живые огоньки на карте по редкости 1–7 (CSS), у обычной и редкой — нет
  /* частицы появления по редкости 1–7 (EnFx). rings — [радиус в ширинах карты, мс, толщина, задержка мс, цвет: r — редкость, gold — золото,
     light — свет]; sparks, gold, streaks — [сколько, скорость, жизнь мс, размер]; motes — [серий, шаг мс, сколько, скорость, жизнь мс, размер, подъём];
     flash — [масштаб, мс]; shake — [px, мс] */
  fx: [null,
    { rings: [[0.5, 420, 1, 0, 'r']], sparks: [4, 80, 420, 2.2] },                                                                  // обычная — почти ничего
    { rings: [[0.7, 480, 1.3, 0, 'r']], sparks: [10, 130, 560, 3.2] },                                                            // редкая
    { rings: [[0.85, 520, 1.6, 0, 'r']], sparks: [18, 170, 660, 4], streaks: [8, 200, 380, 2] },                                   // уникальная
    { rings: [[0.95, 560, 2, 0, 'r'], [1.4, 720, 1.2, 120, 'light']], sparks: [26, 200, 780, 4.5], streaks: [12, 240, 420, 2.2],
      motes: [3, 150, 5, 50, 1000, 3.5, 90] },                                                                                     // эпическая
    { rings: [[1, 620, 2.2, 0, 'r'], [1.6, 820, 1.4, 120, 'light']], sparks: [34, 230, 920, 5], streaks: [16, 280, 480, 2.4],
      motes: [4, 150, 6, 60, 1200, 4, 110], flash: [1.4, 700] },                                                                     // древняя
    { rings: [[1.1, 700, 2.4, 0, 'r'], [1.9, 920, 1.6, 120, 'gold'], [1.2, 620, 1.2, 260, 'light']], sparks: [42, 260, 1100, 5.5],
      gold: [30, 300, 1100, 5], streaks: [22, 330, 560, 2.6], motes: [5, 150, 7, 70, 1300, 4.5, 130], flash: [1.9, 900], shake: [2, 260] },   // первородная
    { rings: [[1.3, 820, 3, 0, 'r'], [2.4, 1150, 2, 140, 'gold'], [1.2, 700, 1.5, 320, 'light'], [3.2, 1450, 1.2, 480, 'r']],
      sparks: [58, 300, 1500, 6], gold: [48, 340, 1400, 6.5], streaks: [34, 420, 700, 3], motes: [8, 160, 9, 80, 1500, 5, 160],
      flash: [2.5, 1200], shake: [4, 380] },                                                                                         // вневременная — полный всплеск
  ],
};

/* ================== демо-состояние: данные, не код ==================
   Аккаунт прототипа — цикл II, уровень 24 (initialState). Артефакты: уровень по id, 0 — куплен без уровней; нет в списке — не куплен.
   Достижения: got — получены, p — прогресс, где его не считает живое состояние прототипа (WN_LIVE); first — первенства: «@» — твоё. */
const WN_DEMO = {
  art: { a1: 1, a2: 2, a3: 1, a4: 2, a5: 1, a7: 1, a12: 0, a14: 1, a19: 2, a20: 1 },
  ach: {
    got: ['pers01', 'pers02', 'pers06', 'pers09', 'pers23', 'pers27', 'pers33', 'pers38', 'pers46', 'rev01', 'rev02', 'rev06', 'rev09', 'myst03', 'myst16', 'first-recipe-1'],
    p: { pers01: 5, pers04: 2, pers05: 2, pers06: 100, pers07: 640, pers08: 640, pers09: 1000, pers10: 4210, pers11: 4210, pers12: 100, pers13: 312,
      pers14: 11, pers15: 4, pers16: 380, pers17: 122, pers18: 214, pers19: 96, pers20: 58, pers21: 12, pers22: 9, pers23: 1, pers24: 0, pers25: 64,
      pers26: 64, pers30: 412, pers33: 10, pers34: 0, pers37: 38, pers38: 10, pers39: 2, pers40: 50, pers41: 50, pers42: 17, pers43: 41, pers44: 6,
      pers46: 1, pers47: 12, pers49: 17, pers50: 0, rev15: 0, rev17: 0, rev18: 0, rev19: 36, rev20: 1, rev22: 7,
      myst02: 1, myst03: 10, myst09: 23, myst16: 1, myst20: 13 },
    first: { 'first-guard-1': 'Светлый пепел', 'first-valor-1': 'Искатель', 'first-recipe-1': '@', 'first-guard-2': 'Тихий шаг', 'first-recipe-2': '@' },
  },
  give: 1000,               // демо команды: «+Энериум»
  search: 3000,             // демо команды: «вневременная в следующей тройке» — сколько сидов перебрать
};
/* прогресс из живого состояния прототипа — те же числа, что на других экранах */
const WN_LIVE = {
  biomes: s => s.biomes.filter(b => b.state === 'done').length,
  recipes: s => (s.bag && s.bag.known ? s.bag.known.length : 0),
  heroes: s => s.heroes.length + Object.keys((s.rs && s.rs.owned) || {}).length,
  valor: s => s.heroes.filter(h => h.valor > 0).length,
  valorMax: s => s.heroes.filter(h => h.maxV > 0 && h.valor >= h.maxV).length,
  valorSum: s => s.heroes.reduce((a, h) => a + h.valor, 0),
  chapters: s => s.heroes.reduce((a, h) => a + h.valor, 0),   // глава — за каждую доблесть (§30)
  limit: s => s.heroes.filter(h => h.lim > 0).length,
  limit5: s => s.heroes.filter(h => h.lim >= 5).length,
  lvlMax: s => s.heroes.reduce((a, h) => Math.max(a, h.lvl), 0),
  bestiaryBiome: s => (s.foes.length && s.foes.every(f => s.known.includes(f.id)) ? 1 : 0),
};

/* ================== помощники ================== */
const WN_KEY = 'en-wn-skip';   // localStorage: «Пропустить анимацию»
const wnSaved = () => { try { return localStorage.getItem(WN_KEY) === '1'; } catch (_) { return false; } };
const wnReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
const wnSkipOn = () => !!S.mem.skip || wnReduced();
const wnCyc = () => S.mem.cyc || S.acc.cycle;       // цикл аккаунта; демо команды — свой цикл экрана «Странник»
const wnWeek = () => String(S.week.race);           // серверная неделя расы: сброс Памяти — раз в неделю (§2.7)
const WNP = new Map(WN ? WN.passives.map(p => [p.id, p]) : []);
const WNA = new Map(WN ? WN.art.list.map(a => [a.id, a]) : []);
const WNF = new Map(WN ? WN.ach.list.concat(WN.ach.firsts).map(a => [a.id, a]) : []);
const wnP = id => WNP.get(id) || null;
const wnEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wnSum = (l, f) => l.reduce((a, x) => a + f(x), 0);
const wnOp = () => 'wn' + S.wn.seq;                 // номер следующей операции: его несут кнопки
/* доля в миллионных (1 000 000 = 100 %) — строкой процентов: сотые, без округления вверх */
const wnPpm = ppm => { const h = Math.floor(ppm / 100), f = h % 100; return h < 1 ? '< 0,01 %' : `${Math.floor(h / 100)}${f ? ',' + String(f).padStart(2, '0').replace(/0$/, '') : ''} %`; };
const wnForm = (t, v) => (Array.isArray(t) ? plural(v, ...t) : t).replace('{v}', fmt(v));
const wnRarColor = r => { try { return getComputedStyle(document.documentElement).getPropertyValue('--r' + r).trim() || EnFx.COL.gold; } catch (_) { return EnFx.COL.gold; } };

/* ================== «сервер» Памяти ==================
   wnRoll — чистая функция тройки: тот же сид и те же исключённые — та же тройка. Порядок обращений к генератору — часть формата:
   на вариант два броска — редкость (доли mem.rarBp; редкость без допустимых пассивок выпадает из суммы — её доля делится между
   остальными пропорционально) и пассивка по весу внутри редкости. Вариант не повторяется в тройке; исключены закреплённые пассивки
   и прошлая тройка места — рабочее допущение прототипа из §2.6. paid — тройка за Энериум (после платного переброса или полного сброса):
   у пассивок с onlyFree вес 0 — их дают только бесплатные тройки (решение 28.09, ×1,7 §1). */
function wnRoll(seed, excl, paid) {
  const rng = EnLoot.makeRng(seed), used = new Set(excl || []), out = [];
  if (paid) for (const p of WN.passives) if (p.onlyFree) used.add(p.id);
  for (let k = 0; k < WN.mem.offer; k++) {
    const pools = WN.rar.map((_, i) => WN.passives.filter(p => p.r === i + 1 && !used.has(p.id)));
    const bp = WN.mem.rarBp.map((b, i) => (pools[i].length ? b : 0));
    let x = rng(wnSum(bp, b => b)), r = 0;
    while (x >= bp[r]) { x -= bp[r]; r++; }
    const list = pools[r];
    let y = rng(wnSum(list, p => p.w)), j = 0;
    while (y >= list[j].w) { y -= list[j].w; j++; }
    out.push(list[j].id); used.add(list[j].id);
  }
  return out;
}
/* шанс одного варианта при данном пуле: доля редкости × вес / сумма весов допустимых этой редкости (§2.6), в миллионных;
   paid — тройка за Энериум: пассивки onlyFree в ней не выпадают */
function wnChance(p, excl, paid) {
  const used = new Set(excl || []);
  if (paid) for (const q of WN.passives) if (q.onlyFree) used.add(q.id);
  if (used.has(p.id)) return 0;
  const pools = WN.rar.map((_, i) => WN.passives.filter(q => q.r === i + 1 && !used.has(q.id)));
  const sumBp = wnSum(WN.mem.rarBp.map((b, i) => (pools[i].length ? b : 0)), b => b), sumW = wnSum(pools[p.r - 1], q => q.w);
  return Math.floor(WN.mem.rarBp[p.r - 1] * p.w * 1000000 / (sumBp * sumW));
}
const wnPinned = M => M.slots.map(x => x.p).filter(Boolean);
/* пассивки «только бесплатно» и строка о них игроку: в каталоге, в листе пассивки, в подтверждении платного переброса и сброса */
const wnFreeOnly = () => WN.passives.filter(p => p.onlyFree);
const WN_FREE_TXT = 'Выпадает только в бесплатных тройках — в первой тройке места и в бесплатном перебросе. За Энериум её не вызвать.';
const wnFreeNote = () => { const l = wnFreeOnly(); return l.length ? `${l.map(p => `«${p.n}»`).join(', ')} за Энериум не ${l.length > 1 ? 'выпадают' : 'выпадает'}: только в бесплатных тройках — в первой тройке места и в бесплатном перебросе.` : ''; };
const WN_SRV = {
  seed: (i, n, k) => EnLoot.seedOf(`память|${i}|${n}${k ? '|' + k : ''}`),   // заглушка серверного сида: место, номер тройки
  /* тройка с номером n места i; paid — за Энериум. Демо команды — перебрать сиды, пока в тройке не будет вневременной */
  roll(i, n, excl, paid) {
    let k = 0;
    if (S.mem.demoHigh) { while (k < WN_DEMO.search && !wnRoll(WN_SRV.seed(i, n, k), excl, paid).some(id => wnP(id).r === 7)) k++; S.mem.demoHigh = false; }
    const seed = WN_SRV.seed(i, n, k);
    return { i, n, seed, paid: !!paid, ids: wnRoll(seed, excl, paid) };
  },
  /* тройка места: первая — при первом «Вспомнить»; живёт, пока её не заменит переброс или не закрепят вариант. Повторное открытие
     окна — та же тройка, не бесплатный переброс (§2.5). Первая тройка места (n = 0) — бесплатная. Новая тройка с n > 0 бывает только
     после закрепления и полного сброса — она за Энериум */
  offer(i) {
    const M = S.mem, x = M.slots[i];
    if (!x || x.st !== 'open') return { refuse: 'closed' };
    if (M.offer[i]) return { res: M.offer[i] };
    M.offer[i] = WN_SRV.roll(i, x.n, wnPinned(M), x.n > 0);
    return { res: M.offer[i], fresh: true };
  },
  /* переброс тройки n места i: сначала бесплатные, потом 50 Энериума (§2.5). Ответ: { res } — новая тройка; { again, res } — повтор
     того же номера операции, ничего не меняет; { refuse } — отказ без расхода. Устаревшее окно (n не текущая тройка) — отказ */
  reroll(op, i, n) {
    const M = S.mem, V = S.wn.ops;
    if (V[op]) return { again: true, res: V[op] };
    const x = M.slots[i], o = M.offer[i];
    if (!x || x.st !== 'open' || !o) return { refuse: 'closed' };
    if (o.n !== n) return { refuse: 'stale' };
    const free = x.free > 0, cost = free ? 0 : WN.mem.reroll;
    if (S.wallet.enerium < cost) return { refuse: 'enerium', cost };
    if (free) x.free--; else S.wallet.enerium -= cost;
    x.n++;
    M.offer[i] = WN_SRV.roll(i, x.n, wnPinned(M).concat(o.ids), !free);   // платный переброс — тройка за Энериум
    return { res: (V[op] = { op, kind: 'reroll', i, from: n, n: x.n, cost, free, ids: M.offer[i].ids.slice() }) };
  },
  /* закрепление варианта k тройки n: место занято до полного сброса (§2.5, п. 4–5) */
  pin(op, i, n, k) {
    const M = S.mem, V = S.wn.ops;
    if (V[op]) return { again: true, res: V[op] };
    const x = M.slots[i], o = M.offer[i];
    if (!x || x.st === 'set') return { refuse: 'set' };
    if (x.st !== 'open' || !o) return { refuse: 'closed' };
    if (o.n !== n || !o.ids[k]) return { refuse: 'stale' };
    x.p = o.ids[k]; x.n++;                 // следующая тройка места — новая: после сброса выбор идёт заново
    delete M.offer[i];
    return { res: (V[op] = { op, kind: 'pin', i, n, k, id: x.p }) };
  },
  /* полный сброс (§2.7): раз в неделю расы, 100 Энериума; места достигнутых циклов снова открыты, бесплатные перебросы
     не возвращаются — рабочее допущение прототипа. Новые тройки сброшенных мест — за Энериум. Тройка ещё не закреплённого места
     остаётся прежней: сброс не перебрасывает её мимо цены */
  reset(op) {
    const M = S.mem, V = S.wn.ops;
    if (V[op]) return { again: true, res: V[op] };
    if (!wnPinned(M).length) return { refuse: 'empty' };
    if (M.resetWeek === wnWeek()) return { refuse: 'week' };
    if (S.wallet.enerium < WN.mem.reset) return { refuse: 'enerium', cost: WN.mem.reset };
    S.wallet.enerium -= WN.mem.reset;
    const was = wnPinned(M);
    M.slots.forEach(x => { x.p = ''; });
    M.resetWeek = wnWeek();
    return { res: (V[op] = { op, kind: 'reset', was, cost: WN.mem.reset }) };
  },
};

/* ================== «сервер» артефактов и достижений ================== */
const wnCap = a => Math.max(0, Math.min(a.lv, wnCyc() - a.from + 1));   // уровень — не выше цикла: один за цикл (§14.1, правила автора, п. 1)
const wnLv = id => (S.wn.art[id] == null ? -1 : S.wn.art[id]);           // −1 — не куплен
const wnUpCost = a => a.soul * (wnLv(a.id) + 1);                         // цена уровня = база × номер уровня (правила автора, п. 2)
const wnArtOpen = () => S.acc.level >= WN.art.rules.openLevel;            // §16: артефакты — с 4-го уровня Странника
/* прогресс достижения: живое состояние прототипа или демо */
const wnProg = a => (WN_LIVE[a.m] ? WN_LIVE[a.m](S) : S.wn.ach.p[a.id] || 0);
const wnGot = id => !!S.wn.ach.got[id];
const wnReady = a => !wnGot(a.id) && (a.cat === 'first' ? S.wn.ach.first[a.id] === '@' : wnProg(a) >= a.goal);
/* сундук за достижение: строка режима «Достижения» lootboxes.js по категории и циклу игрока (ADR-0023, третий круг) */
function wnChest(a, c) {
  const cat = WN.ach.cats.find(x => x.id === a.cat), M = LBX && LBX.modes.feats;
  if (!cat || !M) return [];
  const row = M.layers.flatMap(l => l.rows).find(r => r.label === cat.label), list = row && row.cyc[c];
  return (list || []).flatMap(x => Array.from({ length: x.count }, () => ({ box: M.box, r: x.r, cyc: c, win: x.win })));
}
Object.assign(WN_SRV, {
  buy(op, id) {
    const V = S.wn.ops; if (V[op]) return { again: true, res: V[op] };
    const a = WNA.get(id); if (!a) return { refuse: 'none' };
    if (!wnArtOpen()) return { refuse: 'level' };
    if (wnCyc() < a.from) return { refuse: 'cycle', c: a.from };
    if (wnLv(id) >= 0) return { refuse: 'own' };
    if (S.wallet.gold < a.gold) return { refuse: 'gold', cost: a.gold };
    S.wallet.gold -= a.gold; S.wn.art[id] = 0;
    return { res: (V[op] = { op, kind: 'buy', id, cost: a.gold }) };
  },
  up(op, id) {
    const V = S.wn.ops; if (V[op]) return { again: true, res: V[op] };
    const a = WNA.get(id); if (!a) return { refuse: 'none' };
    const L = wnLv(id); if (L < 0) return { refuse: 'buy' };
    if (L >= wnCap(a)) return { refuse: L >= a.lv ? 'max' : 'cap', c: a.from + L };
    const cost = wnUpCost(a);
    if (S.wallet.souls < cost) return { refuse: 'souls', cost };
    S.wallet.souls -= cost; S.wn.art[id] = L + 1;
    return { res: (V[op] = { op, kind: 'up', id, lv: L + 1, cost }) };
  },
  /* получение достижения или первенства: сундук — в запасы (BAG.addChest), пассивка начинает действовать */
  claim(op, id) {
    const V = S.wn.ops; if (V[op]) return { again: true, res: V[op] };
    const a = WNF.get(id); if (!a) return { refuse: 'none' };
    if (wnGot(id)) return { refuse: 'got' };
    if (!wnReady(a)) return { refuse: 'goal' };
    const c = wnCyc(), chests = wnChest(a, c).map(x => Object.assign(x, { src: 'Достижения · ' + a.n }));
    S.wn.ach.got[id] = true;
    for (const x of chests) BAG.addChest(x);
    return { res: (V[op] = { op, kind: 'claim', id, c, chests }) };
  },
});
function wnRefuse(r) {
  const k = r.refuse;
  if (k === 'enerium') return `Не хватает Энериума: нужно ${fmt(r.cost)}, есть ${fmt(S.wallet.enerium)}`;
  if (k === 'gold') return `Не хватает золота: нужно ${fmt(r.cost)}, есть ${fmt(S.wallet.gold)}`;
  if (k === 'souls') return `Не хватает душ: нужно ${fmt(r.cost)}, есть ${fmt(S.wallet.souls)}`;
  if (k === 'stale') return 'Тройка уже сменилась — выберите из новой';
  if (k === 'week') return `Сброс уже был на этой неделе. Следующий — через ${dur(S.week.left)}`;
  if (k === 'empty') return 'Сбрасывать нечего: ни одна пассивка не закреплена';
  if (k === 'level') return `Артефакты откроются на ${WN.art.rules.openLevel}-м уровне Странника`;
  if (k === 'cycle' || k === 'cap') return `Следующий уровень — в цикле ${ROMAN[r.c] || r.c}`;
  if (k === 'max') return 'Артефакт на последнем уровне';
  if (k === 'goal') return 'Условие ещё не выполнено';
  return 'Действие недоступно';
}

/* ================== анимация появления тройки ==================
   Тройка уже решена: анимация только показывает её. Карта k выходит через k × stepMs, вспышка — в момент приземления.
   Перерисовка посреди анимации не сбрасывает её: карта берёт отрицательную задержку CSS по прошедшему времени. Слой частиц .wn-fxl —
   рядом с #game: перерисовка экрана его не сносит. */
let wnFxI = null, wnTimers = [];
const wnAnimKey = o => o ? o.i + ':' + o.n : '';
const wnShown = o => !o || wnSkipOn() || S.mem.shown[wnAnimKey(o)];
const wnElapsed = () => (S.mem.anim && S.mem.anim.t0 ? performance.now() - S.mem.anim.t0 : 0);
const wnAnimEnd = () => (WN.mem.offer - 1) * WN_VIEW.stepMs + WN_VIEW.flyMs + WN_VIEW.tail;
const wnAnimating = o => !!o && !wnShown(o) && !!S.mem.anim && S.mem.anim.key === wnAnimKey(o);
function wnFx() {
  if (!window.EnFx) return null;
  const g = document.getElementById('game'), p = g && g.parentElement;
  if (!p || !p.querySelector) return null;
  let L = p.querySelector(':scope > .wn-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'wn-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  if (!wnFxI || wnFxI.host !== L) { if (wnFxI) wnFxI.destroy(); try { wnFxI = EnFx.create(L); } catch (_) { wnFxI = null; } }
  return wnFxI;
}
function wnFlash(host, b, color, scale, ms) {
  const d = document.createElement('div'); d.className = 'wn-flash';
  d.style.left = b.x + 'px'; d.style.top = b.y + 'px'; d.style.setProperty('--c', color);
  host.appendChild(d);
  const a = d.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, transform: `translate(-50%,-50%) scale(${scale})`, offset: 0.2 },
    { opacity: 0, transform: `translate(-50%,-50%) scale(${scale * 1.4})` }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  a.onfinish = () => d.remove();
}
/* вспышка редкости r у элемента el: чем реже — тем больше колец, искр, огоньков, вспышка и дрожь */
function wnBurst(fx, el, r) {
  const P = WN_VIEW.fx[r]; if (!fx || !el || !P) return;
  const C = EnFx.COL, b = fx.center(el), c = wnRarColor(r), col = k => (k === 'gold' ? C.gold : k === 'light' ? C.steel : c);
  for (const [k, ms, w, d, cc] of P.rings) setTimeout(() => fx.ring(b.x, b.y, col(cc), b.w * k, ms, w), d);
  if (P.flash) wnFlash(fx.host, b, c, ...P.flash);
  fx.burst(b.x, b.y, c, ...P.sparks);
  if (P.gold) fx.burst(b.x, b.y, C.gold, ...P.gold);
  if (P.streaks) fx.burst(b.x, b.y, C.steel, ...P.streaks, { shape: 'streak', w: 1.4 });
  if (P.motes) {
    const [n, step, k, sp, life, size, up] = P.motes;
    for (let i = 0; i < n; i++) setTimeout(() => fx.burst(b.x, b.y + b.h / 4, i % 2 ? C.gold : c, k, sp, life, size, { ay: -up, drag: 1.2, fade: 'in' }), i * step);
  }
  if (P.shake) fx.shake(...P.shake);
}
function wnStop() { wnTimers.forEach(t => clearTimeout(t)); wnTimers = []; }
/* конец анимации: тройка показана — повторное открытие окна её не проигрывает */
function wnAnimDone(key) {
  const A = S.mem.anim; if (!A || A.key !== key) return;
  wnStop(); S.mem.shown[key] = true; S.mem.anim = null;
  render();
}
/* после каждой перерисовки: новая тройка — старт анимации; окно закрыли — тройка считается показанной; закреплено — вспышка у места */
function wnSync() {
  if (!S.mem || !WN) return;
  const M = S.mem, A = M.anim, open = S.overlay && S.overlay.t === 'mem';
  if (!open) { M.still = false; M.ask = ''; }
  if (A && !open) { wnStop(); M.shown[A.key] = true; M.anim = null; }
  if (A && open && !A.t0) {
    A.t0 = performance.now() || 1;
    const fx = wnFx();
    for (let k = 0; k < A.rs.length; k++) wnTimers.push(setTimeout(() => { try { wnBurst(fx, document.getElementById('wnCard' + k), A.rs[k]); } catch (_) { } }, k * WN_VIEW.stepMs + WN_VIEW.landMs));
    wnTimers.push(setTimeout(() => wnAnimDone(A.key), wnAnimEnd()));
  }
  if (M.pinFx != null) {
    const i = M.pinFx, x = M.slots[i], p = x && wnP(x.p); M.pinFx = null;
    if (p && !wnSkipOn()) setTimeout(() => { try { wnBurst(wnFx(), document.getElementById('wnSlot' + i), p.r); } catch (_) { } }, 60);
  }
  if (M.qFocus) {
    M.qFocus = false;
    const e = document.getElementById('wnq');
    if (e && e.focus) { e.focus(); try { e.setSelectionRange(M.qPos, M.qPos); } catch (_) { } }
  }
}
window.addEventListener('en-render', wnSync);
/* поиск по каталогу: список фильтруется при вводе (§2.8, «Убрано из игры игрока»: кнопок «Найти» нет) */
document.addEventListener('input', e => {
  const t = e.target; if (!t || t.id !== 'wnq') return;
  S.mem.q = t.value; S.mem.qPos = t.selectionStart; S.mem.qFocus = true; render();
});

/* ================== вид: общее ================== */
/* кристалл памяти: огранённая капля, свет изнутри — редкость (ADR-0027); у закрытого места — матовый */
const wnGem = (cls = '') => `<span class="wn-gem ${cls}"><span class="wn-crys"></span></span>`;
/* живые огоньки на карте: сколько — по редкости; места — детерминированно, без случайности в разметке */
const wnMotes = r => { const n = WN_VIEW.motes[r] || 0; return n ? `<span class="wn-motes" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i style="--x:${(k * 37 + 11) % 88 + 6}%;--d:${(k * 430) % 2600}ms;--t:${2200 + (k % 3) * 500}ms"></i>`).join('')}</span>` : ''; };
/* карта варианта: кристалл, редкость, имя, категория; свет, лучи и огоньки — по редкости */
function wnCard(p, o = {}) {
  const sel = o.sel ? ' aria-pressed="true"' : o.btn ? ' aria-pressed="false"' : '';
  const tag = o.btn ? 'button' : 'div', act = o.btn ? ` data-a="wnpick" data-v="${o.k}"` : '';
  return `<${tag} class="wn-card${o.cls || ''}" data-r="${p.r}"${o.id ? ` id="${o.id}"` : ''}${o.style ? ` style="${o.style}"` : ''}${act}${sel} aria-label="${wnEsc(p.n)}, ${RAR[p.r]}">
    <span class="wn-rays" aria-hidden="true"></span>${wnMotes(p.r)}${wnGem()}
    ${rar(p.r)}<b class="wn-cn">${p.n}</b><small class="wn-cc">${p.cat}</small></${tag}>`;
}
/* колонка Странника — та же, что у «Обзора»: портрет, уровень, цикл, опыт, клан, облик и настройки. Команде — демо-цикл экрана */
function wnIdCol() {
  const pct = Math.round(S.acc.xp / S.acc.next * 100), c = wnCyc();
  const demo = TM(`<div class="wn-demo"><span>Демо: цикл экрана</span><div class="row">${[1, 2, 3, 4, 5, 6].map(k => `<button class="wn-dc" data-a="wncyc" data-v="${k}" aria-pressed="${k === c}">${ROMAN[k]}</button>`).join('')}</div></div>`);
  return `<div class="pnl idc"><div class="big" style="--p:${pct}"><img src="${ART('wanderer.png')}" alt=""></div><h2 class="serif" style="font-size:26px">Странник</h2>
    <div class="row" style="gap:6px"><span class="chip gold">уровень ${S.acc.level}</span><span class="chip">цикл ${ROMAN[c]}</span></div>
    <button class="lvlbtn" data-a="sheet" data-v="level"><span class="row" style="justify-content:space-between;width:100%"><span class="faint" style="font-size:12px">опыт</span><span class="num" style="font-size:12px">${fmt(S.acc.xp)} / ${fmt(S.acc.next)}</span></span>${bar(pct)}</button>
    <button class="link" data-a="go" data-v="clan">${ic('shield')}${S.clan.n}</button>${demo}
    <div class="row" style="gap:6px;margin-top:auto"><button class="iconbtn" data-a="toast" data-v="Облик: портрет и рамка" aria-label="Облик">${ic('eye')}</button><button class="iconbtn" data-a="toast" data-v="Друзья: 12" aria-label="Друзья">${ic('users')}</button><button class="iconbtn" data-a="dlg" data-v="settings" aria-label="Настройки">${ic('gear')}</button><button class="iconbtn" data-a="go" data-v="chronicle" aria-label="Летопись">${ic('book')}</button></div></div>`;
}

/* ================== Память: пять мест ================== */
function wnSlot(x, i) {
  const st = x.st;
  if (st === 'set') {
    const p = wnP(x.p);
    return `<button class="wn-slot set" id="wnSlot${i}" data-r="${p.r}" data-a="sheet" data-v="wnp:${p.id}" aria-label="${wnEsc(p.n)}, место цикла ${ROMAN[x.c]}">
      <span class="wn-rays" aria-hidden="true"></span>${wnMotes(p.r)}${wnGem()}<b class="wn-sn">${p.n}</b>${rar(p.r)}<small class="faint">цикл ${ROMAN[x.c]}</small></button>`;
  }
  if (st === 'open') {
    const wait = !!S.mem.offer[i];
    return `<div class="wn-slot open" id="wnSlot${i}">${wnGem('open')}<b class="wn-sn">Место цикла ${ROMAN[x.c]}</b><small class="spirit">${wait ? 'тройка ждёт' : 'можно вспомнить'}</small>
      <button class="btn go sm" data-a="wnmem" data-v="${i}">Вспомнить</button></div>`;
  }
  return `<div class="wn-slot lock" id="wnSlot${i}">${wnGem('lock')}<b class="wn-sn faint">Цикл ${ROMAN[x.c]}</b><small class="faint">${ic('lock')}закрыто</small></div>`;
}
function wnMemTab() {
  const M = S.mem, c = wnCyc(), set = wnPinned(M).length, week = M.resetWeek === wnWeek();
  const note = c < WN.mem.places[0] ? `Цикл I — обучение: первое место откроется в цикле ${ROMAN[WN.mem.places[0]]}.`
    : week ? `Сброс уже был на этой неделе. Следующий — через ${dur(S.week.left)}.` : 'Место открывается в каждом новом цикле. Полный сброс — раз в неделю расы.';
  return `<div class="pnl pad col wn-mem">
      <div class="row"><h2 class="serif gold" style="font-size:22px">Память Странника</h2><span class="g-spacer"></span><span class="faint num">${set} / ${WN.mem.places.length}</span></div>
      <div class="wn-slots">${M.slots.map(wnSlot).join('')}</div>
      <div class="row wn-mfoot"><p class="reason">${note}</p><span class="g-spacer"></span>
        <button class="btn sm" data-a="sheet" data-v="wncat">${ic('book')}Каталог</button>
        <button class="btn sm" data-a="dlg" data-v="memreset"${set ? '' : ' disabled'}>Полный сброс${costTag('enerium', WN.mem.reset)}</button></div>
      ${TM(`<p class="reason">Тройка — сначала редкость (${WN.mem.rarBp.map((b, k) => `${RAR[k + 1].toLowerCase()} ${b / 100} %`).join(', ')}), затем пассивка по весу внутри редкости (§2.6). Решает сервер до анимации: сид места и номер тройки. Эффекты — заглушки представления, в расчёты не входят (§2.8). Бесплатный переброс — один на место, демонстрация. Ещё один забег даёт «${wnP('p' + WN.mem.slot).n}» (ADR-0014) — только в бесплатных тройках: за Энериум её вес 0 (решение 28.09, ×1,7 §1).</p>
        <div class="row"><button class="link" data-a="wngive">Демо: +${fmt(WN_DEMO.give)} Энериума</button><button class="link" data-a="wnhigh" aria-pressed="${!!M.demoHigh}">Демо: вневременная в следующей тройке${M.demoHigh ? ' · включено' : ''}</button></div>`)}
    </div>`;
}

/* ================== окно «одна из трёх» ==================
   Три карты, эффект выделенной, «Перебросить» с ценой и «Вспомнить». Платный переброс — подтверждение поверх окна. Пока карты выходят,
   фон окно не закрывает, кнопки ждут. arg — место; пусто — первое открытое */
function wnPlace(o) {
  const M = S.mem, a = o && o.arg !== undefined && o.arg !== '' ? +o.arg : -1;
  if (a >= 0 && M.slots[a]) return a;
  const i = M.slots.findIndex(x => x.st === 'open');
  return i;
}
function wnPickPanel(o, k) {
  const M = S.mem, p = wnP(o.ids[k]); if (!p) return '';
  const same = M.slots.map(x => wnP(x.p)).filter(q => q && q.fam === p.fam);
  return `<div class="wn-det" data-r="${p.r}"><div class="row"><b class="serif wn-dn">${p.n}</b>${rar(p.r)}<span class="g-spacer"></span><small class="faint">${p.cat}</small></div>
    <p class="wn-dd">${p.d}</p>
    ${same.length ? `<p class="reason warn">С «${same.map(q => q.n).join('», «')}» не складывается: в семействе «${p.fam}» действует сильнейшая.</p>` : ''}
    ${TM('<small class="faint">Эффект показан как заглушка: в расчётах прототипа не участвует (§2.8).</small>')}</div>`;
}
function wnAsk(i, o) {
  const cost = WN.mem.reroll, bal = S.wallet.enerium, op = wnOp(), lack = bal < cost;
  return `<button class="wn-askscrim" data-a="wnask" aria-label="Отмена" tabindex="-1"></button>
    <section class="wn-ask" role="dialog" aria-label="Перебросить тройку">
      <h3>Перебросить тройку?</h3>
      <p class="muted">Эти три варианта пропадут, новая тройка выйдет сразу. Закрыть окно можно и так — тройка сохранится.</p>
      <dl class="kv"><dt>Цена</dt><dd>${money('enerium', cost)}</dd><dt>Есть</dt><dd>${fmt(bal)}</dd></dl>
      ${wnFreeNote() ? `<p class="reason">${wnFreeNote()}</p>` : ''}
      ${lack ? `<p class="reason warn">Не хватает Энериума: нужно ${fmt(cost)}, есть ${fmt(bal)}.</p>` : ''}
      <div class="wn-askf"><button class="btn ghost" data-a="wnask">Отмена</button><button class="btn go" data-a="wnrollok" data-v="${i}:${o.n}:${op}"${lack ? ' disabled' : ''}>Перебросить${costTag('enerium', cost)}</button></div>
    </section>`;
}
function wnMemWindow(o) {
  const M = S.mem, i = wnPlace(o), x = M.slots[i];
  if (!x) return dialog('Память Странника', `<p class="muted">Свободных мест Памяти нет. Новое откроется в следующем цикле.</p>`, `<button class="btn" data-a="close">Закрыть</button>`);
  if (x.st === 'set') { const p = wnP(x.p); return dialog(`Место цикла ${ROMAN[x.c]}`, `<p class="muted">Здесь закреплена «${p.n}». Выбрать заново можно после полного сброса.</p>`, `<button class="btn" data-a="close">Закрыть</button>`); }
  if (x.st !== 'open') return dialog(`Место цикла ${ROMAN[x.c]}`, `<p class="muted">Место откроется в цикле ${ROMAN[x.c]}.</p>`, `<button class="btn" data-a="close">Закрыть</button>`);
  const r = WN_SRV.offer(i), off = r.res; if (!off) return '';
  const key = wnAnimKey(off), anim = !wnShown(off);
  if (anim && (!M.anim || M.anim.key !== key)) { wnStop(); M.anim = { key, t0: 0, rs: off.ids.map(id => wnP(id).r) }; }
  if (M.pick >= off.ids.length) M.pick = 0;
  const el = wnElapsed(), V = WN_VIEW, busy = wnAnimating(off);
  const cards = off.ids.map((id, k) => {
    const p = wnP(id), start = k * V.stepMs - el, done = !anim || -start >= V.flyMs;
    return wnCard(p, { btn: true, k, sel: k === M.pick, id: 'wnCard' + k, cls: done ? '' : ' in', style: done ? '' : `--dl:${Math.round(start)}ms` });
  }).join('');
  const free = x.free > 0, cost = WN.mem.reroll, bal = S.wallet.enerium, op = wnOp(), lack = !free && bal < cost;
  const roll = `<button class="btn" data-a="wnroll" data-v="${i}:${off.n}:${op}"${busy || lack ? ' disabled' : ''}${lack ? ` title="Не хватает Энериума: нужно ${fmt(cost)}, есть ${fmt(bal)}"` : ''}>${ic('swap')}Перебросить${free ? `<span class="cost">бесплатно · ${x.free}</span>` : costTag('enerium', cost)}</button>`;
  const red = wnReduced();
  const skip = `<label class="wn-skip"${red ? ' title="В системе включено «меньше движения»"' : ''}><input type="checkbox" data-a="wnskip"${wnSkipOn() ? ' checked' : ''}${red ? ' disabled' : ''}><span>Пропустить анимацию</span></label>`;
  const team = TM(`Тройка № ${off.n} места ${i + 1} ${off.paid ? 'за Энериум — без пассивок «только бесплатно»' : 'бесплатная'}: решена сервером до анимации, сид ${off.seed}, на вариант два броска — редкость, затем вес.`, 'p', 'reason');
  return `<div class="ov wn-ov${M.still ? ' still' : ''}" role="dialog" aria-modal="true" aria-label="Место Памяти · цикл ${ROMAN[x.c]}">${busy ? '<div class="ov-scrim"></div>' : '<button class="ov-scrim" data-a="close" aria-label="Закрыть" tabindex="-1"></button>'}
    <div class="dlg fit wn-dlg"><div class="dlg-h"><div class="col" style="gap:2px"><span class="eyebrow">Вспомнить одно из трёх</span><h2>Место Памяти · цикл ${ROMAN[x.c]}</h2></div><button class="link wn-tocat" data-a="sheet" data-v="wncat"${busy ? ' disabled' : ''}>${ic('book')}Каталог</button><button class="iconbtn x" data-a="close" aria-label="Закрыть">${ic('x')}</button></div>
      <div class="dlg-b wn-b"><div class="wn-three${busy ? ' busy' : ''}">${cards}</div>${busy ? '<div class="wn-det wn-wait"><p class="faint">Память возвращается…</p></div>' : wnPickPanel(off, M.pick)}${team}</div>
      <div class="dlg-f wn-f">${skip}<span class="g-spacer"></span>${roll}<button class="btn go" data-a="wnpin" data-v="${i}:${off.n}:${M.pick}:${op}"${busy ? ' disabled' : ''}>Вспомнить</button></div>
      ${lack ? `<p class="reason warn wn-lack">Не хватает Энериума на переброс: нужно ${fmt(cost)}, есть ${fmt(bal)}.</p>` : ''}</div>
    ${M.ask === 'roll' ? wnAsk(i, off) : ''}</div>`;
}

/* ================== Артефакты ================== */
const wnArtNow = (a, L) => (L <= 0 ? (a.base != null ? `${a.base}${a.unit}` : '—') : a.base != null ? `${a.base + a.step * L}${a.unit}` : `+${a.step * L}${a.unit}`);
function wnArtAct(a) {
  const L = wnLv(a.id), cap = wnCap(a), op = wnOp();
  if (wnCyc() < a.from) return `<span class="chip">${ic('lock')}с цикла ${ROMAN[a.from]}</span>`;
  if (L < 0) return `<button class="btn sm" data-a="wnbuy" data-v="${a.id}:${op}"${S.wallet.gold < a.gold ? ' disabled' : ''}>Купить${costTag('gold', a.gold)}</button>`;
  if (L >= a.lv) return '<span class="chip gold">максимум</span>';
  if (L >= cap) return `<span class="chip" title="Следующий уровень — в цикле ${ROMAN[a.from + L]}">${ic('hour')}${ROMAN[L + 1]} — в цикле ${ROMAN[a.from + L]}</span>`;
  return `<button class="btn sm" data-a="wnup" data-v="${a.id}:${op}"${S.wallet.souls < wnUpCost(a) ? ' disabled' : ''}>Улучшить${costTag('souls', wnUpCost(a))}</button>`;
}
/* карточка артефакта — чистый вид: L — уровень (−1 — не куплен), cap — потолок цикла, lock — цикл ещё не наступил, act — действие */
function wnArtView(a, L, cap, lock, act) {
  const pips = Array.from({ length: a.lv }, (_, k) => `<i class="${k < L ? 'on' : k < cap ? 'can' : ''}"></i>`).join('');
  return `<div class="wn-art${lock ? ' lock' : L < 0 ? ' new' : ''}">
    <button class="wn-an" data-a="sheet" data-v="wnart:${a.id}"><span class="eyebrow">${a.mode}</span><b>${a.n}</b><small class="wn-ad">${a.d}</small></button>
    <div class="row wn-alv"><span class="wn-pips" title="Уровень ${L > 0 ? ROMAN[L] : 0} из ${ROMAN[a.lv]}">${pips}</span><span class="g-spacer"></span><b class="num wn-now" title="${a.what}">${lock || L < 0 ? '' : wnArtNow(a, L)}</b></div>
    <div class="wn-aft">${act}</div></div>`;
}
const wnArtCard = a => wnArtView(a, wnLv(a.id), wnCap(a), wnCyc() < a.from, wnArtAct(a));
function wnArtTab() {
  if (!wnArtOpen()) return `<div class="pnl pad col"><h2 class="serif gold" style="font-size:22px">Артефакты</h2><p class="muted">Артефакты откроются на ${WN.art.rules.openLevel}-м уровне Странника.</p></div>`;
  const L = WN.art.list, own = L.filter(a => wnLv(a.id) >= 0).length;
  return `<div class="col wn-arts">
      <div class="row"><span class="eyebrow">Пассивные умения аккаунта</span><span class="faint num">${own} / ${L.length}</span><span class="g-spacer"></span><span class="reason">Покупка — золотом, уровни — душами, не выше одного за цикл</span></div>
      <div class="wn-grid three scroll grow" data-keep="wnarts">${L.map(wnArtCard).join('')}</div>
      ${TM(`<p class="reason">Таблица автора — 18 артефактов (в правилах — 26). Цена уровня = база × номер уровня; потолок уровня — цикл − цикл открытия + 1. Эффекты — показ, в расчёты не входят. Правки под систему — в листе артефакта.</p>`)}
    </div>`;
}

/* ================== Достижения ================== */
const wnCat = id => WN.ach.cats.find(c => c.id === id) || WN.ach.cats[0];
const wnList = cat => (cat === 'first' ? WN.ach.firsts.filter(f => f.c === wnCyc()) : WN.ach.list.filter(a => a.cat === cat));
const wnHidden = a => a.cat === 'myst' && !wnGot(a.id) && !wnReady(a);   // таинственное: условие и прогресс скрыты до получения (§29)
const wnPas = a => (WN.ach.kinds[a.pk] ? wnForm(WN.ach.kinds[a.pk].t, a.v) : '');
/* карточка достижения — чистый вид: hidden — таинственное до получения, got, ready, p — прогресс, op — номер операции для «Получить» */
function wnFeatView(a, { hidden, got, ready, p, op }) {
  if (hidden) return `<button class="wn-feat hid" data-a="sheet" data-v="wnfeat:${a.id}"><b class="wn-fn">???</b><span class="quote">${a.hint}</span><span class="chip">${ic('lock')}тайна</span></button>`;
  const act = got ? `<span class="chip spirit">${ic('check')}действует</span>` : ready ? `<button class="btn go sm" data-a="wnclaim" data-v="${a.id}:${op}">Получить</button>` : `<span class="num faint">${fmt(p)} / ${fmt(a.goal)}</span>`;
  return `<div class="wn-feat${got ? ' got' : ready ? ' ready' : ''}">
    <button class="wn-fh" data-a="sheet" data-v="wnfeat:${a.id}"><b class="wn-fn">${a.n}</b><small class="wn-fd">${a.d}</small></button>
    ${got ? `<small class="wn-fp">${wnPas(a)}</small>` : bar(p * 100 / a.goal, ready ? 'sp' : '')}
    <div class="row wn-ff">${act}</div></div>`;
}
function wnFeatCard(a) {
  if (a.cat === 'first') return wnFirstRow(a);
  return wnFeatView(a, { hidden: wnHidden(a), got: wnGot(a.id), ready: wnReady(a), p: Math.min(wnProg(a), a.goal), op: wnOp() });
}
/* строка первенства — чистый вид: h — кто первый («@» — ты), got — сундук забран */
function wnFirstView(f, h, got, op) {
  const mine = h === '@';
  const st = mine ? (got ? `<span class="chip gold">${ic('crown')}твоё</span>` : `<button class="btn go sm" data-a="wnclaim" data-v="${f.id}:${op}">Забрать сундук</button>`)
    : h ? `<span class="chip">${ic('flag')}${wnEsc(h)}</span>` : '<span class="chip spirit">свободно</span>';
  return `<div class="wn-first${mine ? ' mine' : h ? ' taken' : ''}"><button class="wn-fh" data-a="sheet" data-v="wnfeat:${f.id}"><b class="wn-fn">${f.n}</b><small class="wn-fd">${f.d}</small></button><div class="row wn-ff">${st}</div></div>`;
}
const wnFirstRow = f => wnFirstView(f, S.wn.ach.first[f.id], wnGot(f.id), wnOp());
function wnAchTab() {
  const cur = wnCat(S.seg.wnach).id, list = wnList(cur), all = WN.ach.list;
  const tab = c => { const l = c.id === 'first' ? WN.ach.firsts.filter(f => f.c <= wnCyc()) : all.filter(a => a.cat === c.id), got = l.filter(a => c.id === 'first' ? S.wn.ach.first[a.id] === '@' : wnGot(a.id)).length;
    return `<button role="tab" aria-selected="${c.id === cur}" data-a="seg" data-v="wnach:${c.id}">${c.n}<span class="wn-tc">${got}/${l.length}</span></button>`; };
  const past = cur === 'first' && wnCyc() > 1 ? `<button class="link" data-a="sheet" data-v="wnfame">Слава прошлых циклов ${ic('chev')}</button>` : '';
  const body = cur === 'first'
    ? `<div class="wn-firsts scroll grow" data-keep="wnach:first">${list.map(wnFirstRow).join('')}</div>`
    : `<div class="wn-grid scroll grow" data-keep="wnach:${cur}">${list.map(wnFeatCard).join('')}</div>`;
  return `<div class="col wn-ach">
      <div class="row"><div class="tabs" role="tablist" aria-label="Достижения">${WN.ach.cats.map(tab).join('')}</div><span class="g-spacer"></span><button class="link" data-a="sheet" data-v="wnpas">Пассивки ${ic('chev')}</button></div>
      <div class="row"><p class="reason">${wnCat(cur).d}${cur === 'first' ? ` · цикл ${ROMAN[wnCyc()]}` : ''}</p><span class="g-spacer"></span>${past}</div>
      ${body}
      ${TM('<p class="reason">Каталог достижений — черновик, таблицы автора нет (§29). Сундук — строка режима «Достижения» в lootboxes.js по циклу получения. Эффекты — показ.</p>')}
    </div>`;
}

/* ================== экран ================== */
const WN_TABS = { mem: wnMemTab, arts: wnArtTab, ach: wnAchTab };
const wnMemBadge = () => (S.mem.slots.some(x => x.st === 'open') ? '!' : '');
const wnAchBadge = () => { const n = WN.ach.list.concat(WN.ach.firsts).filter(a => wnReady(a)).length; return n ? String(n) : ''; };
const wnSeg = () => ({ key: 'profile', items: [['over', 'Обзор'], ['mem', 'Память', wnMemBadge()], ['arts', 'Артефакты'], ['ach', 'Достижения', wnAchBadge()]] });
const wnProfileBase = SCREENS.profile;
SCREENS.profile = () => {
  if (!WN) return wnProfileBase();
  const t = S.seg.profile, f = WN_TABS[t];
  if (!f) return Object.assign(wnProfileBase(), { seg: wnSeg() });
  return { title: 'Странник', seg: wnSeg(), html: `<section class="scr"><div class="pf wn-pf">${wnIdCol()}${f()}</div></section>` };
};

/* ================== листы ================== */
Object.assign(OV, WN ? {
  mem(o) { return wnMemWindow(o); },
  /* полный сброс (§2.7): что пропадёт, цена, доступность по неделе; «Отмена» ничего не меняет */
  memreset() {
    const M = S.mem, set = M.slots.filter(x => x.p), cost = WN.mem.reset, bal = S.wallet.enerium, op = wnOp();
    const why = !set.length ? 'Сбрасывать нечего: ни одна пассивка не закреплена.' : M.resetWeek === wnWeek() ? `Сброс уже был на этой неделе. Следующий — через ${dur(S.week.left)}.`
      : bal < cost ? `Не хватает Энериума: нужно ${fmt(cost)}, есть ${fmt(bal)}.` : '';
    const body = `<p class="muted">Все закреплённые пассивки во всех открытых циклах пропадут. Выбор придётся пройти заново — с места цикла II. Цикл, уровень, герои и сюжет не меняются.</p>
      ${set.length ? `<div class="wn-was">${set.map(x => { const p = wnP(x.p); return `<span class="wn-wasp" data-r="${p.r}">${wnGem()}<b>${p.n}</b><small>цикл ${ROMAN[x.c]}</small></span>`; }).join('')}</div>` : ''}
      <dl class="kv"><dt>Цена</dt><dd>${money('enerium', cost)}</dd><dt>Есть</dt><dd>${fmt(bal)}</dd><dt>Доступно</dt><dd>раз в неделю расы</dd></dl>
      ${why ? `<p class="reason warn">${why}</p>` : `<p class="reason">Бесплатные перебросы не возвращаются. ${wnFreeNote()}</p>`}`;
    return dialog('Полный сброс Памяти', body, `<button class="btn ghost" data-a="close">Отмена</button><button class="btn warn" data-a="wnreset" data-v="${op}"${why ? ' disabled' : ''}>Сбросить${costTag('enerium', cost)}</button>`);
  },
  /* пассивка: эффект, семейство, вес и шанс из полного пула */
  wnp(o) {
    const p = wnP(o.arg); if (!p) return '';
    const M = S.mem, at = M.slots.findIndex(x => x.p === p.id), excl = wnPinned(M).filter(id => id !== p.id);
    return sheet(p.n, `<div class="wn-ph" data-r="${p.r}">${wnGem()}<div class="col" style="gap:4px">${rar(p.r)}<small class="faint">${p.cat}</small></div></div>
      <p class="wn-pd">${p.d}</p>
      <dl class="kv"><dt>Семейство</dt><dd>${p.fam}</dd><dt>Сила</dt><dd>${WN.mem.pow[p.pow - 1]}</dd><dt>Вес в редкости</dt><dd>${fmt(p.w)}</dd><dt>Шанс одного варианта</dt><dd>${wnPpm(wnChance(p, excl))}</dd></dl>
      ${p.onlyFree ? `<p class="reason warn">${WN_FREE_TXT}</p>` : ''}
      <p class="reason">В семействе пассивки не складываются — действует сильнейшая. Разные семейства складываются.</p>
      ${at >= 0 ? `<p class="reason">Закреплена в месте цикла ${ROMAN[M.slots[at].c]} до полного сброса.</p>` : ''}
      ${TM(`<p class="reason">№ ${p.no} таблицы автора. Шанс — для пула без закреплённых: доля редкости × вес / сумма весов (§2.6). Эффект — заглушка представления (§2.8).</p>`)}`);
  },
  /* каталог: все 146 записей — поиск, фильтр редкости, подробности (§2.8) */
  wncat() {
    const M = S.mem, q = String(M.q || '').trim().toLowerCase(), rf = +(S.seg.wnrar || 0), excl = wnPinned(M);
    const hit = p => (!rf || p.r === rf) && (!q || [p.n, p.d, p.cat, p.fam].some(t => t.toLowerCase().includes(q)));
    const groups = [7, 6, 5, 4, 3, 2, 1].map(r => ({ r, l: WN.passives.filter(p => p.r === r && hit(p)) })).filter(g => g.l.length);
    const row = p => `<details class="wn-row" data-r="${p.r}"><summary>${wnGem()}<span class="wn-rn"><b>${p.n}</b><small>${p.cat}${p.onlyFree ? ' · только бесплатно' : ''}</small></span><span class="num wn-rc">${wnPpm(wnChance(p, excl))}</span></summary>
      <p>${p.d}</p>${p.onlyFree ? `<small class="wn-free">${WN_FREE_TXT}</small>` : ''}<small class="faint">${p.fam} · вес ${fmt(p.w)} · сила: ${WN.mem.pow[p.pow - 1]}${M.slots.some(x => x.p === p.id) ? ' · закреплена' : ''}</small></details>`;
    const chips = [0, 1, 2, 3, 4, 5, 6, 7].map(r => `<button class="wn-rf" data-a="seg" data-v="wnrar:${r}" aria-pressed="${r === rf}"${r ? ` data-r="${r}"` : ''}>${r ? `<span class="rar" data-r="${r}"></span>${RAR[r]}` : 'Все'}</button>`).join('');
    const body = `<label class="search wn-q">${ic('search')}<input id="wnq" type="search" value="${wnEsc(M.q || '')}" placeholder="Название или эффект" autocomplete="off" aria-label="Поиск по каталогу"></label>
      <div class="wn-rfs">${chips}</div>
      <p class="reason">Шанс — одного варианта бесплатной тройки, если в пуле всё, кроме закреплённых: сначала редкость, потом вес внутри неё.</p>
      <div class="col wn-cat" data-keep="wncat">${groups.map(g => `<span class="eyebrow wn-gh" data-r="${g.r}">${RAR[g.r]} · ${g.l.length} · ${wnPpm(WN.mem.rarBp[g.r - 1] * 100)}</span>${g.l.map(row).join('')}`).join('') || '<p class="faint">Ничего не нашлось.</p>'}</div>`;
    /* тройка ждёт выбора — вернуться к ней: каталог её не меняет (§2.5) */
    const wait = M.slots.findIndex((x, i) => x.st === 'open' && M.offer[i]);
    return sheet(`Каталог Памяти · ${WN.passives.length}`, body, wait >= 0 ? `<button class="btn go" data-a="wnmem" data-v="${wait}">Вернуться к выбору</button>` : '', true);
  },
  /* артефакт: эффект за уровень, уровни с ценой, потолок цикла; правки под систему — команде */
  wnart(o) {
    const a = WNA.get(o.arg); if (!a) return '';
    const L = wnLv(a.id), cap = wnCap(a), op = wnOp();
    const lv = Array.from({ length: a.lv }, (_, k) => { const n = k + 1, st = n <= L ? 'взят' : n <= cap ? 'доступен' : `цикл ${ROMAN[a.from + k]}`;
      return `<div class="wn-lvr${n <= L ? ' on' : ''}"><b>${ROMAN[n]}</b><span>${wnArtNow(a, n)}</span><span class="faint">${st}</span>${money('souls', a.soul * n)}</div>`; }).join('');
    const act = wnCyc() < a.from ? '' : L < 0 ? `<button class="btn go" data-a="wnbuy" data-v="${a.id}:${op}"${S.wallet.gold < a.gold ? ' disabled' : ''}>Купить${costTag('gold', a.gold)}</button>`
      : L < cap ? `<button class="btn go" data-a="wnup" data-v="${a.id}:${op}"${S.wallet.souls < wnUpCost(a) ? ' disabled' : ''}>Улучшить до ${ROMAN[L + 1]}${costTag('souls', wnUpCost(a))}</button>` : '';
    const why = wnCyc() < a.from ? `Откроется в цикле ${ROMAN[a.from]}.` : L < 0 && S.wallet.gold < a.gold ? `Не хватает золота: нужно ${fmt(a.gold)}, есть ${fmt(S.wallet.gold)}.`
      : L >= 0 && L < cap && S.wallet.souls < wnUpCost(a) ? `Не хватает душ: нужно ${fmt(wnUpCost(a))}, есть ${fmt(S.wallet.souls)}.` : L >= 0 && L >= cap && L < a.lv ? `Следующий уровень — в цикле ${ROMAN[a.from + L]}.` : '';
    return sheet(a.n, `<span class="eyebrow">${a.mode}</span><p class="wn-pd">${a.d} за уровень</p>
      <dl class="kv"><dt>${a.what}</dt><dd>${L > 0 ? wnArtNow(a, L) : a.base != null ? `${a.base}${a.unit}` : '—'}</dd><dt>На последнем уровне</dt><dd>${a.max}</dd><dt>Уровень</dt><dd>${L < 0 ? 'не куплен' : `${L > 0 ? ROMAN[L] : 0} из ${ROMAN[a.lv]}`}</dd><dt>Покупка</dt><dd>${money('gold', a.gold)}</dd></dl>
      ${a.note ? plData(a.note, 'p', 'reason') : ''}
      <span class="eyebrow">Уровни</span><div class="wn-lvs">${lv}</div>
      <p class="reason">За цикл — один уровень: в цикле ${ROMAN[a.from]} доступен первый, дальше — по одному.</p>
      ${why ? `<p class="reason warn">${why}</p>` : ''}
      ${a.fix ? TM(`<p class="reason warn">Правка под систему: ${a.fix}</p>`) : ''}
      ${TM(`<p class="reason">№ ${a.no} таблицы автора. Души на все уровни — ${fmt(a.total)}.</p>`)}`, act);
  },
  /* достижение или первенство: условие, прогресс, пассивка, сундук по циклу; таинственное — подсказка до получения */
  wnfeat(o) {
    const a = WNF.get(o.arg); if (!a) return '';
    const c = wnCyc(), chest = wnChest(a, c).map(x => lbBoxName(x.box, x.r, x.win)).join(', ') || '—', op = wnOp(), got = wnGot(a.id), ready = wnReady(a);
    const foot = ready ? `<button class="btn go" data-a="wnclaim" data-v="${a.id}:${op}">${a.cat === 'first' ? 'Забрать сундук' : 'Получить'}</button>` : '';
    if (a.cat === 'first') {
      const h = S.wn.ach.first[a.id];
      return sheet(a.n, `<p class="wn-pd">${a.d}.</p><dl class="kv"><dt>Кто первый</dt><dd>${h === '@' ? 'ты' : h ? wnEsc(h) : 'пока никто'}</dd><dt>Награда</dt><dd>${chest}</dd><dt>Титул</dt><dd>остаётся навсегда</dd></dl>
        <p class="reason">Каждый цикл приносит новые первенства: слава прошлых остаётся, а в новом цикле первым может стать любой.</p>
        ${TM('<p class="reason">Первенство даёт сундук и титул, пассивки нет — толкование §29, чтобы первые не копили силу.</p>')}`, foot);
    }
    const cat = wnCat(a.cat);
    if (wnHidden(a)) return sheet('Таинственное достижение', `<p class="quote">${a.hint}</p><p class="reason">Условие и пассивка откроются, когда достижение будет получено.</p><dl class="kv"><dt>Награда</dt><dd>${chest}</dd></dl>
      ${TM(`<p class="reason">${a.n}: ${a.d}. Пассивка: ${wnPas(a)}.</p>`)}`);
    const p = Math.min(wnProg(a), a.goal);
    return sheet(a.n, `<span class="eyebrow">${cat.n}</span><p class="wn-pd">${a.d}.</p>
      ${got ? '' : `<div class="col" style="gap:4px">${bar(p * 100 / a.goal, ready ? 'sp' : '')}<span class="num faint" style="font-size:12.5px">${fmt(p)} / ${fmt(a.goal)}</span></div>`}
      <dl class="kv"><dt>Пассивка аккаунта</dt><dd>${wnPas(a)}</dd><dt>Награда</dt><dd>${chest}</dd><dt>Состояние</dt><dd>${got ? 'получено · действует' : ready ? 'можно получить' : 'в пути'}</dd></dl>
      <p class="reason">Пассивки достижений — фарм и экономика, не бой. Одинаковые складываются. Редкость сундука — по циклу, в котором получено.</p>
      ${TM(`<p class="reason">Счётчик сервера — ${a.m}. Эффект — показ, в расчёты прототипа не входит.</p>`)}`, foot);
  },
  /* пассивки аккаунта от достижений: сумма по видам */
  wnpas() {
    const got = WN.ach.list.filter(a => wnGot(a.id)), by = {};
    for (const a of got) (by[a.pk] = by[a.pk] || []).push(a);
    const rows = Object.entries(by).map(([k, l]) => { const K = WN.ach.kinds[k], v = wnSum(l, a => a.v);
      return `<div class="wn-pr"><b>${K.n}</b><span>${wnForm(K.t, v)}</span><small class="faint">${l.map(a => a.n).join(', ')}</small></div>`; }).join('');
    return sheet('Пассивки достижений', `<p class="reason">Каждое полученное достижение навсегда даёт пассивку аккаунта. Одинаковые складываются.</p>${rows || '<p class="faint">Пока ни одного достижения.</p>'}
      <p class="reason">Получено ${got.length} из ${WN.ach.list.length}.</p>${TM('<p class="reason">Эффекты — показ, в расчёты прототипа не входят.</p>')}`);
  },
  /* слава прошлых циклов: кто был первым; твои титулы — золотом */
  wnfame() {
    const c = wnCyc(), rows = [];
    for (let k = c - 1; k >= 1; k--) {
      const l = WN.ach.firsts.filter(f => f.c === k);
      rows.push(`<span class="eyebrow">Цикл ${ROMAN[k]}</span>${l.map(f => { const h = S.wn.ach.first[f.id]; return `<div class="wn-fame${h === '@' ? ' mine' : ''}"><span>${f.n.replace(/ · цикл .+$/, '')}</span><b>${h === '@' ? 'ты' : h ? wnEsc(h) : '—'}</b></div>`; }).join('')}`);
    }
    return sheet('Слава прошлых циклов', rows.join('') || '<p class="faint">Прошлых циклов ещё нет.</p>');
  },
} : {});

/* ================== действия ================== */
function wnDo(r, ok) {
  if (r.again) return false;
  if (r.refuse) { toast(wnRefuse(r)); return false; }
  S.wn.seq++;
  if (ok) ok(r.res);
  return true;
}
Object.assign(ACT, {
  /* «Вспомнить» у места: окно тройки; тройку решает сервер при первом открытии */
  wnmem(v) { S.mem.pick = 0; S.mem.ask = ''; S.mem.still = false; open('mem', String(v)); },
  wnpick(v) { if (S.mem.anim && S.mem.anim.t0 && wnElapsed() < (+v) * WN_VIEW.stepMs + WN_VIEW.landMs) return; S.mem.pick = +v; S.mem.still = true; render(); },
  /* переброс: бесплатный — сразу, платный — подтверждение цены поверх окна (§2.5) */
  wnroll(v) {
    const [i, n, op] = String(v).split(':'), x = S.mem.slots[+i];
    if (!x) return;
    if (x.free > 0) return ACT.wnrollok(v);
    S.mem.ask = 'roll'; S.mem.still = true; render();
  },
  wnrollok(v) {
    const [i, n, op] = String(v).split(':');
    S.mem.ask = '';
    const r = WN_SRV.reroll(op, +i, +n);
    if (r.again) { render(); return; }
    wnDo(r, res => { S.mem.pick = 0; S.mem.still = true; if (res.cost) toast(`Тройка переброшена · −${fmt(res.cost)} Энериума`); else render(); });
  },
  wnask() { S.mem.ask = ''; S.mem.still = true; render(); },
  /* «Вспомнить»: закрепить выделенный вариант; окно закрывается, место загорается цветом редкости */
  wnpin(v) {
    const [i, n, k, op] = String(v).split(':');
    wnDo(WN_SRV.pin(op, +i, +n, +k), res => { const p = wnP(res.id); S.overlay = null; S.mem.pinFx = res.i; S.route = 'profile'; S.seg.profile = 'mem'; toast(`Вспомнено: ${p.n}`); });
  },
  wnreset(v) { wnDo(WN_SRV.reset(v), res => { S.overlay = null; S.mem.pick = 0; toast(`Память сброшена: ${res.was.length} ${plural(res.was.length, 'место открыто', 'места открыты', 'мест открыто')} заново`); }); },
  /* «Пропустить анимацию»: выбор помнит localStorage; галочка посреди анимации — тройка сразу */
  wnskip(v, t) {
    S.mem.skip = !!(t && t.checked);
    try { localStorage.setItem(WN_KEY, S.mem.skip ? '1' : '0'); } catch (_) { }
    if (S.mem.skip && S.mem.anim) { const k = S.mem.anim.key; wnStop(); S.mem.shown[k] = true; S.mem.anim = null; }
    S.mem.still = true; render();
  },
  wnbuy(v) { const [id, op] = String(v).split(':'); wnDo(WN_SRV.buy(op, id), res => toast(`${WNA.get(res.id).n}: куплен · −${fmt(res.cost)} золота`)); },
  wnup(v) { const [id, op] = String(v).split(':'); wnDo(WN_SRV.up(op, id), res => toast(`${WNA.get(res.id).n}: уровень ${ROMAN[res.lv]} · −${fmt(res.cost)} душ`)); },
  wnclaim(v) {
    const i = String(v).lastIndexOf(':'), id = String(v).slice(0, i), op = String(v).slice(i + 1);
    wnDo(WN_SRV.claim(op, id), res => { const a = WNF.get(res.id), c = res.chests[0]; if (S.overlay && S.overlay.t === 'wnfeat') S.overlay = null;
      toast(`${a.n}${c ? ` · ${lbBoxName(c.box, c.r, c.win)} — в запасах` : ''}`, CHEST); });
  },
  /* демо команды */
  wncyc(v) { S.mem.cyc = +v; toast(`Демо: цикл ${ROMAN[+v]} на экране «Странник»`); },
  wngive() { S.wallet.enerium += WN_DEMO.give; toast(`Демо: +${fmt(WN_DEMO.give)} Энериума`); },
  wnhigh() { S.mem.demoHigh = !S.mem.demoHigh; toast(S.mem.demoHigh ? 'Демо: в следующей тройке — вневременная' : 'Демо: тройки как обычно'); },
});

/* ================== UI-кит: «Память Странника» ==================
   Карта выбора всех семи редкостей с живыми огоньками; «Появление» — выход карты и вспышка её редкости, «Все по очереди» — от обычной
   к вневременной. Места Памяти в трёх состояниях. Какие частицы у какой редкости — таблица из WN_VIEW.fx. */
let wnKitFx = null;
function wnKitSample(r) { return WN.passives.filter(p => p.r === r).reduce((b, p) => (p.w > b.w ? p : b)); }
function wnKitFxRow(r) {
  const P = WN_VIEW.fx[r], part = [];
  part.push(`колец ${P.rings.length}`, `искр ${P.sparks[0]}`);
  if (P.gold) part.push(`золота ${P.gold[0]}`);
  if (P.streaks) part.push(`росчерков ${P.streaks[0]}`);
  if (P.motes) part.push(`огоньков ${P.motes[0]} × ${P.motes[2]}`);
  if (P.flash) part.push('вспышка');
  if (P.shake) part.push('дрожь');
  if (WN_VIEW.motes[r]) part.push(`живых огоньков на карте ${WN_VIEW.motes[r]}`);
  if (r >= 6) part.push('лучи');
  return `<tr data-r="${r}"><td>${rar(r)}</td><td>${part.join(' · ')}</td></tr>`;
}
/* карточки артефактов, достижений и первенств во всех состояниях — те же функции вида, что на экране, состояние задано примером */
function wnKitCards() {
  const A = id => WNA.get(id), F = id => WNF.get(id), fig = (h, t) => `<figure class="wn-kc">${h}<figcaption>${t}</figcaption></figure>`;
  const arts = [
    [A('a6'), -1, 1, false, `<button class="btn sm" type="button">Купить${costTag('gold', A('a6').gold)}</button>`, 'не куплен'],
    [A('a3'), 1, 2, false, `<button class="btn sm" type="button">Улучшить${costTag('souls', A('a3').soul * 2)}</button>`, 'можно улучшить'],
    [A('a1'), 1, 1, false, `<span class="chip">${ic('hour')}II — в цикле III</span>`, 'потолок цикла'],
    [A('a19'), 4, 4, false, '<span class="chip gold">максимум</span>', 'последний уровень'],
    [A('a9'), -1, 0, true, `<span class="chip">${ic('lock')}с цикла III</span>`, 'цикл не наступил'],
  ].map(([a, L, cap, lock, act, t]) => fig(wnArtView(a, L, cap, lock, act), t)).join('');
  const feats = [
    [F('pers07'), { p: 640 }, 'в пути'], [F('pers12'), { ready: true, p: 100, op: 'kit' }, 'можно получить'],
    [F('pers01'), { got: true }, 'получено — действует'], [F('myst05'), { hidden: true }, 'таинственное до получения'],
  ].map(([a, st, t]) => fig(wnFeatView(a, st), t)).join('');
  const firsts = [[F('first-valor-2'), '', false, 'свободно'], [F('first-guard-2'), 'Тихий шаг', false, 'взято другим'], [F('first-recipe-2'), '@', false, 'твоё, сундук ждёт'], [F('first-recipe-1'), '@', true, 'твоё — титул']]
    .map(([f, h, got, t]) => fig(wnFirstView(f, h, got, 'kit'), t)).join('');
  return `<span class="eyebrow">Артефакты</span><div class="wn-kcards">${arts}</div>
    <p class="k-note">Карточка — режим, имя, эффект за уровень, отметки уровней (золотые — взяты, в рамке — доступны в этом цикле) и сейчас; одно действие: купить золотом или улучшить душами. Подробности — лист артефакта: уровни с ценой, потолок цикла.</p>
    <span class="eyebrow">Достижения и первенства</span><div class="wn-kcards">${feats}</div><div class="wn-kcards">${firsts}</div>
    <p class="k-note">Достижение — имя, условие в строку, прогресс или пассивка, одно действие «Получить»: сундук странника ложится в запасы, пассивка начинает действовать. Таинственное до получения — только подсказка. Первенство — кто первый на сервере в этом цикле; своё — сундук и титул.</p>`;
}
if (WN) KIT_EXTRA.push({
  html: () => `<section class="k-box wn-kit" style="grid-column:1/-1" id="wnKit"><h3>Память Странника · одна из трёх</h3>
    <p class="k-note">Окно «Вспомнить»: три карты выходят по очереди. Редкость — цвет кромки и кристалла (ADR-0027) и сила света: чем реже пассивка, тем ярче кристалл, больше живых огоньков и богаче вспышка появления — у обычной почти ничего, у вневременной полный всплеск с лучами и дрожью. Выбор — бирюзовое кольцо, как везде. Тройку решает сервер до анимации; «Пропустить анимацию» и системное «меньше движения» показывают её сразу.</p>
    <div class="wn-kstage" id="wnKitStage"><div class="wn-krow">${[1, 2, 3, 4, 5, 6, 7].map(r => wnCard(wnKitSample(r), { id: 'wnKit' + r, sel: r === 5 })).join('')}</div></div>
    <div class="k-row"><button class="btn sm go" type="button" data-wnkit="all">Все по очереди</button>${[1, 2, 3, 4, 5, 6, 7].map(r => `<button class="btn sm" type="button" data-wnkit="${r}"><span class="rar" data-r="${r}"></span>${RAR[r]}</button>`).join('')}</div>
    <div class="wn-kgrid">
      <div class="col"><span class="eyebrow">Места Памяти</span><div class="wn-slots wn-kslots">
        <div class="wn-slot lock">${wnGem('lock')}<b class="wn-sn faint">Цикл IV</b><small class="faint">${ic('lock')}закрыто</small></div>
        <div class="wn-slot open">${wnGem('open')}<b class="wn-sn">Место цикла III</b><small class="spirit">можно вспомнить</small><button class="btn go sm" type="button">Вспомнить</button></div>
        <div class="wn-slot set" data-r="6"><span class="wn-rays"></span>${wnMotes(6)}${wnGem()}<b class="wn-sn">${wnKitSample(6).n}</b>${rar(6)}<small class="faint">цикл II</small></div>
      </div><p class="k-note">Кристалл памяти — огранённая капля: у закрытого места — пустой, матовый; открытое дышит светом духа; закреплённое горит цветом своей редкости. Это места с экрана «Странник → Память».</p></div>
      <div class="col"><span class="eyebrow">Свет и частицы появления</span><table class="wn-kfx">${[1, 2, 3, 4, 5, 6, 7].map(wnKitFxRow).join('')}</table></div>
    </div>
    ${wnKitCards()}
    <p class="k-note">Данные — <code>wanderer.js</code>, собирает <code>tools/content-gen/wanderer/build.js</code> из таблиц автора: ${WN.passives.length} пассивок Памяти, ${WN.art.list.length} артефактов; достижения — черновик: ${WN.ach.list.length} ${plural(WN.ach.list.length, 'достижение', 'достижения', 'достижений')} и ${WN.ach.firsts.length} ${plural(WN.ach.firsts.length, 'первенство', 'первенства', 'первенств')}. Экран — <code>screens/wanderer.js</code>, проверка — <code>check_wanderer.js</code>. Правок таблиц под систему — ${WN.fixes.length}:</p>
    <details class="wn-kfix"><summary class="k-note">показать правки</summary><ul>${WN.fixes.map(f => `<li><b>${f.what}</b> — ${f.why}</li>`).join('')}</ul></details>
  </section>`,
  paint: () => {
    const box = document.getElementById('wnKit'), st = document.getElementById('wnKitStage');
    if (!box || !st || !box.addEventListener) return;
    /* слой частиц — при первом нажатии: странице UI-кита холст до того не нужен */
    const fx = () => {
      if (!wnKitFx || wnKitFx.host !== st) { if (wnKitFx) wnKitFx.destroy(); try { wnKitFx = window.EnFx ? EnFx.create(st, { speed: () => 1 }) : null; } catch (_) { wnKitFx = null; } }
      return wnKitFx;
    };
    const play = r => {
      const c = document.getElementById('wnKit' + r); if (!c) return;
      c.classList.remove('in'); void c.offsetWidth; c.style.setProperty('--dl', '0ms'); c.classList.add('in');
      setTimeout(() => wnBurst(fx(), c, r), WN_VIEW.landMs);
    };
    box.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-wnkit]'); if (!b) return;
      if (b.dataset.wnkit === 'all') [1, 2, 3, 4, 5, 6, 7].forEach((r, k) => setTimeout(() => play(r), k * WN_VIEW.stepMs * 1.6));
      else play(+b.dataset.wnkit);
    });
  },
});

/* ================== сценарии презентации ================== */
if (WN) FLOWS.push(
  ['Память Странника · одна из трёх', 'Цикл VI: все пять мест. Карты выходят по очереди, чем реже пассивка — тем ярче свет и частицы. Переброс с ценой, «Вспомнить», каталог',
    () => { S.route = 'profile'; S.seg.profile = 'mem'; S.mem.cyc = 6; S.mem.pick = 0; S.mem.ask = ''; S.mem.still = false; const i = S.mem.slots.map(x => x.st).lastIndexOf('open'); S.overlay = { t: 'mem', arg: i < 0 ? '' : String(i) }; }],
  ['Артефакты Странника', 'Восемнадцать артефактов из таблицы автора: покупка золотом, уровни душами, не выше одного за цикл',
    () => { S.route = 'profile'; S.seg.profile = 'arts'; S.overlay = null; }],
  ['Достижения и первенства', 'Три категории, пассивки аккаунта и сундук за каждое; таинственные скрыты до получения; первенства сервера по циклам',
    () => { S.route = 'profile'; S.seg.profile = 'ach'; S.seg.wnach = 'pers'; S.overlay = null; }],
);

/* ================== состояние ==================
   S.mem — Память: slots — места (c — цикл, p — id закреплённой пассивки, free — бесплатные перебросы, n — номер следующей тройки,
   st — вычисляется: 'set', 'open' или 'lock'); offer — текущая тройка места от сервера; shown — показанные тройки; anim — идущая анимация;
   pick — выделенный вариант; ask — подтверждение поверх окна; resetWeek — неделя сброса; skip — «Пропустить анимацию»;
   cyc — демо-цикл экрана; q — поиск по каталогу. S.wn — артефакты (уровень по id), достижения (got, p, first), ops — ответы сервера
   по номерам операций, seq — номер следующей операции. */
function wnMemState() {
  const M = { slots: [], offer: {}, shown: {}, anim: null, pick: 0, ask: '', still: false, resetWeek: '', skip: wnSaved(), cyc: 0, q: '', qPos: 0, qFocus: false, pinFx: null, demoHigh: false };
  (WN ? WN.mem.places : [2, 3, 4, 5, 6]).forEach(c => {
    const x = { c, p: '', free: WN ? WN.mem.free : 1, n: 0 };
    Object.defineProperty(x, 'st', { enumerable: true, get: () => (x.p ? 'set' : (M.cyc || S.acc.cycle) >= x.c ? 'open' : 'lock') });
    M.slots.push(x);
  });
  return M;
}
function wnState(s) {
  s.mem = wnMemState();
  s.wn = { art: Object.assign({}, WN_DEMO.art), ach: { got: Object.fromEntries(WN_DEMO.ach.got.map(id => [id, true])), p: Object.assign({}, WN_DEMO.ach.p), first: Object.assign({}, WN_DEMO.ach.first) }, ops: {}, seq: 1 };
  s.seg.wnach = s.seg.wnach || 'pers'; s.seg.wnrar = s.seg.wnrar || '0';
  return s;
}
const wnInitBase = initialState;
initialState = function () { return wnState(wnInitBase()); };
wnState(S);
