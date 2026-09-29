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
   Значок Памяти — осколок условного зеркала (слова автора 29.09.2026): семь редкостей и пустое место (WN_ART, задание арта
   tools/art-gen/jobs/memory-shards.json). Пока картинка не выгружена, на её месте прежний кристалл CSS — без битой картинки.
   Окно «одна из трёх» — сборка карт из осколков: проступает пустая рамка стекла, осколки значка слетаются к точке удара, у высших
   кружат, замирают на миг и сплавляются; зеркальная вспышка, блик по стеклу, свет редкости. Чем реже пассивка, тем больше осколков,
   кружения и замедления, богаче частицы EnFx из fx.js: у обычной — тонкое кольцо, у вневременной — лучи, золото, свет на всё окно
   и дрожь (WN_VIEW.build, WN_VIEW.fx). Переброс — прежние осколки бьются стеклом, собираются новые. «Вспомнить» — невыбранные
   рассыпаются, выбранный осколок летит в своё место Памяти. Живые состояния карты: наведение, выбор, неактивное. Анимация — только
   transform и opacity, без фильтров в кадре. «Пропустить анимацию» помнит localStorage (без него всё работает), при
   prefers-reduced-motion анимации нет. Эффекты пассивок, артефактов и достижений — показ: в расчёты прототипа не входят (§2.8).
   Числа баланса — в данных, числа вида — WN_VIEW, демо-состояние — WN_DEMO. Служебное — только команде: TM, PL, tmT.
   Автопроверка — tools/content-gen/screens/check_wanderer.js. */
'use strict';

const WN = window.EN_WANDERER || null;

/* ================== вид: числа вида, не баланса ================== */
const WN_VIEW = {
  stepMs: 400,              // карты тройки начинают сборку по очереди: шаг, мс
  inMs: 200,                // проступает пустая рамка стекла, мс
  revealMs: 320,            // после сплавления поднимаются редкость, имя и категория, мс
  tail: 220,                // после последней карты — и кнопки оживают, мс
  breakMs: 380,             // бьются стеклом: прежняя тройка при перебросе, невыбранные при «Вспомнить», мс
  flyMs: 700,               // выбранный осколок летит в своё место Памяти, мс
  landMs: 900,              // место приняло осколок: вспышка и отскок, мс
  pickMs: 260,              // выбор карты: выбранная поднимается, мс
  slow: 40,                 // миг замедления: частицы на слое идут с такой скоростью, %
  cut: [50, 56],            // точка удара, от которой идут сколы: x и y, % значка
  lift: [114, -10],         // «Вспомнить»: осколок поднимается перед полётом — масштаб, %, и сдвиг вверх, px
  arc: 70,                  // высота дуги полёта над прямой, px
  trail: [40, 2, 26, 420, 3.2],       // след полёта: шаг, мс; искр; скорость; жизнь, мс; размер
  motes: [0, 0, 0, 2, 3, 5, 7, 10],   // живые огоньки на карте по редкости 1–7 (CSS), у обычной и редкой — нет
  openMotes: 3,             // огоньки у места, которое можно вспомнить
  /* сборка значка по редкости 1–7: frag — осколков; spread — разлёт, % смещения скола от точки удара; spin — поворот осколка, градусы;
     orbit — кружение вокруг точки удара, градусы; gather — слёт, мс; hold — миг замедления перед сплавлением, мс; near — где осколки
     замирают в замедлении, % разлёта; rays — лучи при сплавлении */
  build: [null,
    { frag: 5, spread: 240, spin: 24, orbit: 0, gather: 420, hold: 0, near: 0, rays: 0 },       // обычная — прямой слёт
    { frag: 5, spread: 260, spin: 30, orbit: 0, gather: 460, hold: 0, near: 0, rays: 0 },       // редкая
    { frag: 6, spread: 290, spin: 40, orbit: 50, gather: 500, hold: 0, near: 0, rays: 0 },      // уникальная — лёгкий поворот
    { frag: 7, spread: 320, spin: 50, orbit: 130, gather: 580, hold: 0, near: 0, rays: 0 },     // эпическая — кружат
    { frag: 7, spread: 340, spin: 60, orbit: 220, gather: 620, hold: 180, near: 14, rays: 1 },  // древняя — кружат, миг замедления, лучи
    { frag: 8, spread: 370, spin: 70, orbit: 300, gather: 700, hold: 240, near: 16, rays: 1 },  // первородная
    { frag: 9, spread: 400, spin: 80, orbit: 400, gather: 800, hold: 340, near: 18, rays: 1 },  // вневременная — больше оборота, долгий миг
  ],
  /* искры слетаются к точке удара вместе с осколками (EnFx), по редкости: [сколько, радиус в ширинах карты, размер] */
  converge: [null, null, null, null, [10, 1.05, 2.6], [14, 1.15, 3], [18, 1.25, 3.2], [26, 1.4, 3.6]],
  /* частицы сплавления по редкости 1–7 (EnFx). rings — [радиус в ширинах карты, мс, толщина, задержка мс, цвет: r — редкость, gold — золото,
     light — свет]; sparks, gold, streaks, glass — [сколько, скорость, жизнь мс, размер], glass — стеклянная пыль; motes — [серий, шаг мс,
     сколько, скорость, жизнь мс, размер, подъём]; flash — [масштаб, мс]; veil — свет на всё окно [яркость %, мс]; shake — [px, мс] */
  fx: [null,
    { rings: [[0.5, 420, 1, 0, 'r']], sparks: [3, 80, 420, 2.2], glass: [3, 110, 520, 3] },                                          // обычная — почти ничего
    { rings: [[0.7, 480, 1.3, 0, 'r']], sparks: [8, 130, 560, 3.2], glass: [5, 140, 600, 3.4] },                                    // редкая
    { rings: [[0.85, 520, 1.6, 0, 'r']], sparks: [14, 170, 660, 4], streaks: [8, 200, 380, 2], glass: [7, 170, 700, 3.8] },         // уникальная
    { rings: [[0.95, 560, 2, 0, 'r'], [1.4, 720, 1.2, 120, 'light']], sparks: [20, 200, 780, 4.5], streaks: [12, 240, 420, 2.2],
      glass: [10, 200, 800, 4.2], motes: [3, 150, 5, 50, 1000, 3.5, 90] },                                                            // эпическая
    { rings: [[1, 620, 2.2, 0, 'r'], [1.6, 820, 1.4, 120, 'light']], sparks: [28, 230, 920, 5], streaks: [16, 280, 480, 2.4],
      glass: [14, 230, 900, 4.6], motes: [4, 150, 6, 60, 1200, 4, 110], flash: [1.4, 700] },                                           // древняя
    { rings: [[1.1, 700, 2.4, 0, 'r'], [1.9, 920, 1.6, 120, 'gold'], [1.2, 620, 1.2, 260, 'light']], sparks: [36, 260, 1100, 5.5],
      gold: [30, 300, 1100, 5], streaks: [22, 330, 560, 2.6], glass: [18, 260, 1000, 5], motes: [5, 150, 7, 70, 1300, 4.5, 130],
      flash: [1.9, 900], veil: [22, 700], shake: [2, 260] },                                                                         // первородная
    { rings: [[1.3, 820, 3, 0, 'r'], [2.4, 1150, 2, 140, 'gold'], [1.2, 700, 1.5, 320, 'light'], [3.2, 1450, 1.2, 480, 'r']],
      sparks: [52, 300, 1500, 6], gold: [48, 340, 1400, 6.5], streaks: [34, 420, 700, 3], glass: [26, 320, 1200, 5.6],
      motes: [8, 160, 9, 80, 1500, 5, 160], flash: [2.5, 1200], veil: [40, 1000], shake: [4, 380] },                                 // вневременная — полный всплеск
  ],
  /* осколки бьются: стеклянная пыль и искры — [сколько, скорость, жизнь мс, размер]; кольцо — [радиус в ширинах карты, мс, толщина] */
  shatter: { glass: [22, 240, 900, 6], sparks: [10, 150, 520, 3], ring: [0.55, 380, 1.4] },
};

/* ================== значки Памяти: осколки условного зеркала ==================
   Задание арта — tools/art-gen/jobs/memory-shards.json; выгрузка tools/art-gen/export_ui.py → assets/art/memory/: shard-r1.png …
   shard-r7.png и shard-empty.png, 256 × 256. Адрес — AV(путь): с версией выгрузки. Путь берётся, только когда он в ready — это отмечает
   выгрузка; до неё — прежний кристалл CSS, без битой картинки */
const WN_ART = {
  shard: 'memory/shard-r{r}.png',   // осколок редкости r: свет памяти цвета редкости (ADR-0027)
  empty: 'memory/shard-empty.png',  // пустое место: тёмное стекло, памяти ещё нет
  ready: ['memory/shard-r1.png', 'memory/shard-r2.png', 'memory/shard-r3.png', 'memory/shard-r4.png', 'memory/shard-r5.png',
    'memory/shard-r6.png', 'memory/shard-r7.png', 'memory/shard-empty.png'],   // выгруженные пути: выгрузка 29.09.2026
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

/* ================== анимация: сборка, бой стекла, полёт осколка ==================
   Тройка уже решена: анимация только показывает её. Карта k начинает сборку в plan.start[k] и сплавляется в plan.land[k]. Все задержки CSS
   отсчитаны от «сейчас»: перерисовка посреди анимации её не сбрасывает. Слой частиц .wn-fxl — рядом с #game: перерисовка экрана его
   не сносит, в нём же летит выбранный осколок. Таймеры сборки — wnTimers, выбора и полёта — wnLeaveT. */
let wnFxI = null, wnTimers = [], wnLeaveT = [], wnPre = false;
const wnAnimKey = o => o ? o.i + ':' + o.n : '';
const wnShown = o => !o || wnSkipOn() || S.mem.shown[wnAnimKey(o)];
const wnNow = () => { try { return performance.now() || 1; } catch (_) { return 1; } };
const wnElapsed = () => (S.mem.anim && S.mem.anim.t0 ? wnNow() - S.mem.anim.t0 : 0);
const wnAnimating = o => !!o && !wnShown(o) && !!S.mem.anim && S.mem.anim.key === wnAnimKey(o);
/* расписание тройки: rs — редкости карт, lead — сколько бьётся прежняя тройка до первой карты. Целые мс от начала анимации:
   start — рамка проступает, land — осколки сплавились, done — карта собрана, end — кнопки оживают */
function wnPlan(rs, lead = 0) {
  const V = WN_VIEW, P = { start: [], land: [], done: [], end: 0 };
  rs.forEach((r, k) => {
    const B = V.build[r], s = lead + k * V.stepMs, l = s + V.inMs + B.gather + B.hold;
    P.start.push(s); P.land.push(l); P.done.push(l + V.revealMs);
  });
  P.end = Math.max(...P.done) + V.tail;
  return P;
}
/* хеш вида: у каждой карты тройки свой рисунок сколов — детерминированно; генератор «сервера» он не трогает */
const wnViewHash = (key, k) => EnLoot.seedOf('вид памяти|' + key + '|' + k);
/* сколы значка: K клиньев от точки удара WN_VIEW.cut к периметру квадрата 0–100 (периметр — 400 единиц: верх, правый край, низ, левый).
   Клинья вместе дают весь квадрат без щелей. h — хеш вида. Всё — целые проценты */
const wnPer = p => { const q = ((p % 400) + 400) % 400; return q < 100 ? [q, 0] : q < 200 ? [100, q - 100] : q < 300 ? [300 - q, 100] : [0, 400 - q]; };
function wnCuts(K, h) {
  const [cx, cy] = WN_VIEW.cut, at = [];
  for (let i = 0; i < K; i++) at.push(Math.floor(i * 400 / K) + 23 + ((h >>> (i * 3)) & 15) - 8);
  return at.map((a, i) => {
    const b = i + 1 < K ? at[i + 1] : at[0] + 400, pts = [[cx, cy], wnPer(a)];
    for (let c = (Math.floor(a / 100) + 1) * 100; c < b; c += 100) pts.push(wnPer(c));   // углы квадрата между двумя сколами
    pts.push(wnPer(b));
    return pts;
  });
}
/* осколки значка редкости r: клин картинки (clip-path) и путь — куда разлетелся (--fx, --fy, % значка), поворот (--fr) и кружение (--fo).
   cls — wn-fr: слетаются при сборке; wn-db: разлетаются, когда осколок бьётся */
function wnShards(r, h, icon, cls = 'wn-fr') {
  const B = WN_VIEW.build[r], [cx, cy] = WN_VIEW.cut;
  return wnCuts(B.frag, h).map((pts, j) => {
    const n = pts.length, gx = Math.floor(pts.reduce((a, p) => a + p[0], 0) / n), gy = Math.floor(pts.reduce((a, p) => a + p[1], 0) / n);
    const fx = Math.trunc((gx - cx) * B.spread / 100), fy = Math.trunc((gy - cy) * B.spread / 100), fr = (j % 2 ? -1 : 1) * (B.spin + (j * 37 + (h & 31)) % 41);
    return `<span class="${cls}" style="clip-path:polygon(${pts.map(p => p[0] + '% ' + p[1] + '%').join(',')});--fx:${fx};--fy:${fy};--fr:${fr};--fo:${B.orbit}">${icon}</span>`;
  }).join('');
}
function wnFx() {
  if (!window.EnFx) return null;
  const g = document.getElementById('game'), p = g && g.parentElement;
  if (!p || !p.querySelector) return null;
  let L = p.querySelector(':scope > .wn-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'wn-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  if (!wnFxI || wnFxI.host !== L) { if (wnFxI) wnFxI.destroy(); try { wnFxI = EnFx.create(L, { speed: wnSpeed }); } catch (_) { wnFxI = null; } }
  return wnFxI;
}
/* миг замедления: пока осколки древней и выше замерли перед сплавлением, частицы на слое идут медленнее — время будто вязнет */
function wnSpeed() {
  const A = S.mem && S.mem.anim; if (!A || !A.t0 || !A.plan) return 1;
  const V = WN_VIEW, t = wnNow() - A.t0;
  return A.rs.some((r, k) => V.build[r].hold && t >= A.plan.land[k] - V.build[r].hold && t < A.plan.land[k]) ? V.slow / 100 : 1;
}
/* значок внутри карты или места: частицы бьют из него, а размер колец — по карте */
const wnIcoEl = el => (el && el.querySelector ? el.querySelector('.wn-ico') || el : el);
function wnFlash(host, b, color, scale, ms) {
  const d = document.createElement('div'); d.className = 'wn-flash';
  d.style.left = b.x + 'px'; d.style.top = b.y + 'px'; d.style.setProperty('--c', color);
  host.appendChild(d);
  try { d.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, transform: `translate(-50%,-50%) scale(${scale})`, offset: 0.2 },
    { opacity: 0, transform: `translate(-50%,-50%) scale(${scale * 1.4})` }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }); } catch (_) { }
  setTimeout(() => d.remove(), ms + 40);
}
/* свет на всё окно — у первородной и вневременной: вспыхивает и гаснет, только opacity */
function wnVeil(host, color, op, ms) {
  const d = document.createElement('div'); d.className = 'wn-veil'; d.style.setProperty('--c', color);
  host.appendChild(d);
  try { d.animate([{ opacity: 0 }, { opacity: op / 100, offset: 0.16 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' }); } catch (_) { }
  setTimeout(() => d.remove(), ms + 40);
}
/* сплавление редкости r у карты или места el: чем реже — тем больше колец, искр, стекла и огоньков, вспышка, свет на окно и дрожь */
function wnBurst(fx, el, r) {
  const P = WN_VIEW.fx[r]; if (!fx || !el || !P) return;
  const C = EnFx.COL, b = fx.center(wnIcoEl(el)), w = fx.center(el).w, c = wnRarColor(r), col = k => (k === 'gold' ? C.gold : k === 'light' ? C.steel : c);
  for (const [k, ms, th, d, cc] of P.rings) setTimeout(() => fx.ring(b.x, b.y, col(cc), w * k, ms, th), d);
  if (P.flash) wnFlash(fx.host, b, c, ...P.flash);
  if (P.veil) wnVeil(fx.host, c, ...P.veil);
  fx.burst(b.x, b.y, c, ...P.sparks);
  if (P.glass) fx.burst(b.x, b.y, C.steel, ...P.glass, { shape: 'shard', blend: 'normal', vr: 9, ay: 220, drag: 1.6 });
  if (P.gold) fx.burst(b.x, b.y, C.gold, ...P.gold);
  if (P.streaks) fx.burst(b.x, b.y, C.steel, ...P.streaks, { shape: 'streak', w: 1.4 });
  if (P.motes) {
    const [n, step, k, sp, life, size, up] = P.motes;
    for (let i = 0; i < n; i++) setTimeout(() => fx.burst(b.x, b.y + b.h / 4, i % 2 ? C.gold : c, k, sp, life, size, { ay: -up, drag: 1.2, fade: 'in' }), i * step);
  }
  if (P.shake) fx.shake(...P.shake);
}
/* осколок бьётся: стеклянная пыль падает, искры и кольцо цвета его редкости */
function wnShatter(fx, el, r) {
  if (!fx || !el) return;
  const P = WN_VIEW.shatter, b = fx.center(wnIcoEl(el)), w = fx.center(el).w, c = wnRarColor(r);
  fx.burst(b.x, b.y, EnFx.COL.steel, ...P.glass, { shape: 'shard', blend: 'normal', vr: 10, ay: 300, drag: 1.2 });
  fx.burst(b.x, b.y, c, ...P.sparks);
  fx.ring(b.x, b.y, c, w * P.ring[0], P.ring[1], P.ring[2]);
}
/* искры слетаются к точке удара вместе с осколками — у эпической и выше; каждая летит прямо в центр и гаснет в нём */
function wnConverge(fx, el, r) {
  const P = WN_VIEW.converge[r]; if (!fx || !el || !P) return;
  const [n, rad, size] = P, b = fx.center(wnIcoEl(el)), R = fx.center(el).w * rad, ms = WN_VIEW.build[r].gather, v = R * 1000 / ms, c = wnRarColor(r);
  for (let j = 0; j < n; j++) {
    const t = j * 2 * Math.PI / n, cs = Math.cos(t), sn = Math.sin(t);
    fx.burst(b.x + cs * R, b.y + sn * R, j % 3 ? c : '#ffffff', 1, 0, ms, size, { vx: -cs * v, vy: -sn * v, drag: 0, fade: 'in', life: ms, size });
  }
}
/* выбранный осколок: hold мс поднимается на месте карты, затем летит по дуге к месту Памяти; след — искры его редкости.
   a, b — значки карты и места (fx.center). Элемент — в слое частиц, анимация — transform */
function wnGhost(fx, a, b, r, hold) {
  if (!fx || !fx.host || !a || !b) return null;
  const V = WN_VIEW, fly = V.flyMs, total = hold + fly, d = document.createElement('div');
  d.className = 'wn-ghost'; d.setAttribute('data-r', r); d.setAttribute('aria-hidden', 'true');
  d.style.left = Math.round(a.x - a.w / 2) + 'px'; d.style.top = Math.round(a.y - a.h / 2) + 'px'; d.style.width = Math.round(a.w) + 'px'; d.style.height = Math.round(a.h) + 'px';
  d.innerHTML = `<span class="wn-glow"></span><span class="wn-whole">${wnIcon(r)}</span>`;
  fx.host.appendChild(d);
  const s0 = V.lift[0] / 100, y0 = V.lift[1], s1 = (b.w || 1) / (a.w || 1), dx = b.x - a.x, dy = b.y - a.y, cy = Math.min(y0, dy) - V.arc;
  const at = t => { const u = 1 - t; return { x: t * dx, y: u * u * y0 + 2 * u * t * cy + t * t * dy }; };   // дуга: квадратичная кривая
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
  const frames = [{ offset: 0, transform: 'translate(0px,0px) scale(1) rotate(0deg)' }, { offset: hold / total, transform: `translate(0px,${y0}px) scale(${s0}) rotate(0deg)` }];
  for (let j = 1; j <= 8; j++) {
    const t = ease(j / 8), p = at(t), s = s0 + (s1 - s0) * t + 0.12 * Math.sin(Math.PI * t), rot = -9 * Math.sin(Math.PI * t);
    frames.push({ offset: (hold + fly * j / 8) / total, transform: `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) scale(${s.toFixed(3)}) rotate(${rot.toFixed(1)}deg)` });
  }
  try { d.animate(frames, { duration: total, easing: 'linear', fill: 'forwards' }); } catch (_) { }
  const [step, n, sp, life, size] = V.trail, c = wnRarColor(r);
  for (let t = step; t < fly; t += step) setTimeout(() => { const p = at(ease(t / fly)); fx.burst(a.x + p.x, a.y + p.y, c, n, sp, life, size, { fade: 'in' }); }, hold + t);
  setTimeout(() => d.remove(), total + 40);
  return d;
}
/* картинки осколков — заранее, как только они выгружены: осколки сборки не ждут загрузки */
function wnPreload() {
  if (wnPre || !WN_ART.ready.length || typeof Image !== 'function') return;
  wnPre = true;
  for (let r = 0; r <= 7; r++) if (wnArtOn(r)) { const im = new Image(); im.decoding = 'async'; im.src = AV(wnArt(r)); }
}
function wnStop() { wnTimers.forEach(t => clearTimeout(t)); wnTimers = []; }
/* конец анимации: тройка показана — повторное открытие окна её не проигрывает */
function wnAnimDone(key) {
  const A = S.mem.anim; if (!A || A.key !== key) return;
  wnStop(); S.mem.shown[key] = true; S.mem.anim = null;
  render();
}
/* старт сборки: прежняя тройка бьётся (переброс), искры слетаются, у каждой карты — сплавление по её редкости */
function wnPlay(A) {
  A.t0 = wnNow();
  const fx = wnFx(), V = WN_VIEW, card = k => document.getElementById('wnCard' + k);
  const at = (ms, f) => wnTimers.push(setTimeout(() => { try { f(); } catch (_) { } }, ms));
  if (A.old) A.old.forEach((id, k) => at(0, () => wnShatter(fx, card(k), wnP(id).r)));
  A.rs.forEach((r, k) => {
    if (V.converge[r]) at(A.plan.start[k] + V.inMs, () => wnConverge(fx, card(k), r));
    at(A.plan.land[k], () => wnBurst(fx, card(k), r));
  });
  at(A.plan.end, () => wnAnimDone(A.key));
}
/* «Вспомнить»: закрепил уже сервер, дальше — показ. Невыбранные бьются стеклом, выбранный осколок поднимается и летит в своё место;
   окно закрывается, когда он в пути; место принимает его вспышкой своей редкости */
function wnLeaveStart(L) {
  const V = WN_VIEW, fx = wnFx();
  L.t0 = wnNow();
  const card = document.getElementById('wnCard' + L.k), slot = document.getElementById('wnSlot' + L.i);
  const a = fx && card ? fx.center(wnIcoEl(card)) : null, b = fx && slot ? fx.center(wnIcoEl(slot)) : null;
  L.ids.forEach((id, k) => { if (k !== L.k) try { wnShatter(fx, document.getElementById('wnCard' + k), wnP(id).r); } catch (_) { } });
  try { wnGhost(fx, a, b, L.r, V.breakMs); } catch (_) { }
  const at = (ms, f) => wnLeaveT.push(setTimeout(() => { if (S.mem.leave === L) { try { f(); } catch (_) { } } }, ms));
  at(V.breakMs, () => { L.phase = 'fly'; if (S.overlay && S.overlay.t === 'mem') S.overlay = null; render(); });
  at(V.breakMs + V.flyMs, () => wnLand(L));
}
/* осколок сел: место загорается, частицы его редкости, сообщение */
function wnLand(L) {
  const M = S.mem; if (M.leave !== L) return;
  wnLeaveT = [];
  M.leave = null; const land = M.land = { i: L.i, t0: wnNow() };
  toast(`Вспомнено: ${wnP(L.ids[L.k]).n}`);
  try { wnBurst(wnFx(), document.getElementById('wnSlot' + L.i), L.r); } catch (_) { }
  setTimeout(() => { if (S.mem.land === land) S.mem.land = null; }, WN_VIEW.landMs);
}
/* после каждой перерисовки: новая тройка — старт сборки; окно закрыли — тройка считается показанной, а выбранный осколок уже в пути;
   закреплено без анимации — вспышка у места */
function wnSync() {
  if (!S.mem || !WN) return;
  const M = S.mem, A = M.anim, L = M.leave, open = S.overlay && S.overlay.t === 'mem';
  if (!open) { M.still = false; M.ask = ''; }
  if (A && !open) { wnStop(); M.shown[A.key] = true; M.anim = null; }
  if (A && open && !A.t0) wnPlay(A);
  if (L && !L.t0) wnLeaveStart(L);
  if (L && L.phase === 'break' && !open) L.phase = 'fly';
  if (M.pinFx != null) {
    const i = M.pinFx, x = M.slots[i], p = x && wnP(x.p); M.pinFx = null;
    if (p && !wnSkipOn()) setTimeout(() => { try { wnBurst(wnFx(), document.getElementById('wnSlot' + i), p.r); } catch (_) { } }, 60);
  }
  if (S.route === 'profile' || open) wnPreload();
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
/* путь картинки: осколок редкости r, 0 — пустое место; есть ли она уже в прототипе */
const wnArt = r => (r ? WN_ART.shard.replace('{r}', r) : WN_ART.empty);
const wnArtOn = r => WN_ART.ready.includes(wnArt(r));
/* прежний кристалл CSS — значок, пока осколок не выгружен: огранённая капля, свет изнутри — редкость (ADR-0027); у закрытого места — матовый */
const wnGem = (cls = '') => `<span class="wn-gem ${cls}"><span class="wn-crys"></span></span>`;
/* значок Памяти: осколок зеркала редкости r, 0 — пустое место. st — вид прежнего кристалла у пустого места: 'open' или 'lock' */
const wnIcon = (r, st = 'lock') => (wnArtOn(r) ? `<img class="wn-shi" src="${AV(wnArt(r))}" alt="" decoding="async" draggable="false">` : wnGem(r ? '' : st));
/* значок в своей рамке: свет за осколком и сам осколок. cls — размер (xs, sm, md) или место (sl) */
const wnIco = (r, cls = '', st) => `<span class="wn-ico${cls ? ' ' + cls : ''}"${r ? ` data-r="${r}"` : ''} aria-hidden="true"><span class="wn-glow"></span><span class="wn-whole">${wnIcon(r, st)}</span></span>`;
/* живые огоньки: сколько — по редкости или n; места — детерминированно, без случайности в разметке */
const wnMotes = (r, n = WN_VIEW.motes[r] || 0) => (n ? `<span class="wn-motes" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i style="--x:${(k * 37 + 11) % 88 + 6}%;--d:${(k * 430) % 2600}ms;--t:${2200 + (k % 3) * 500}ms"></i>`).join('')}</span>` : '');
/* карта варианта: рамка тёмного стекла; свет редкости — слой .wn-lit; значок, редкость, имя, категория; лучи и огоньки — по редкости.
   o.a — сборка: { dl — начало карты от «сейчас», мс; h — хеш вида; old — { r } прежней карты этого места при перебросе; bk — начало боя
   прежней тройки от «сейчас», мс }. o.brk — карта бьётся: { bk, h }. o.pk — выбрана только что: сколько мс назад, с минусом.
   Все задержки CSS — от «сейчас»: перерисовка посреди анимации её не сбрасывает */
function wnCard(p, o = {}) {
  const V = WN_VIEW, B = V.build[p.r], a = o.a, br = o.brk, icon = wnIcon(p.r);
  const tag = o.btn ? 'button' : 'div', act = o.btn ? ` data-a="wnpick" data-v="${o.k}" aria-pressed="${!!o.sel}"` : '';
  let cls = (o.cls || '') + (o.sel ? ' on' : ''), vars = '', ico, old = '';
  if (a) {
    cls += ' in' + (a.old ? ' re' : '');
    vars = `--dl:${a.dl}ms;--in:${V.inMs}ms;--ga:${B.gather}ms;--ho:${B.hold}ms;--land:${V.inMs + B.gather + B.hold}ms;--rv:${V.revealMs}ms;--near:${B.near}`;
    if (a.old) { vars += `;--bk:${a.bk}ms;--brk:${V.breakMs}ms`; old = `<span class="wn-lit old" data-r="${a.old.r}" aria-hidden="true"></span>`; }
    const deb = a.old ? `<span class="wn-deb" data-r="${a.old.r}">${wnShards(a.old.r, a.h ^ 0x2545f491, wnIcon(a.old.r), 'wn-db')}</span>` : '';
    ico = `<span class="wn-ico" aria-hidden="true">${deb}<span class="wn-glow"></span><span class="wn-frs">${wnShards(p.r, a.h, icon)}</span><span class="wn-whole">${icon}</span><span class="wn-core"></span></span>`;
  } else if (br) {
    cls += ' brk'; vars = `--bk:${br.bk}ms;--brk:${V.breakMs}ms`;
    ico = `<span class="wn-ico" aria-hidden="true"><span class="wn-deb">${wnShards(p.r, br.h, icon, 'wn-db')}</span></span>`;
  } else ico = `<span class="wn-ico" aria-hidden="true"><span class="wn-glow"></span><span class="wn-whole">${icon}</span></span>`;
  if (o.pk != null) { cls += ' pk'; vars += (vars ? ';' : '') + `--pk:${o.pk}ms`; }
  const bray = a && B.rays ? '<span class="wn-bray" aria-hidden="true"></span>' : '', mfl = a ? '<span class="wn-mfl" aria-hidden="true"></span>' : '';
  return `<${tag} class="wn-card${cls}" data-r="${p.r}"${o.id ? ` id="${o.id}"` : ''}${vars ? ` style="${vars}"` : ''}${act} aria-label="${wnEsc(p.n)}, ${RAR[p.r]}">
    ${old}<span class="wn-lit" aria-hidden="true"></span><span class="wn-rays" aria-hidden="true"></span>${bray}${wnMotes(p.r)}${ico}
    ${rar(p.r)}<b class="wn-cn">${p.n}</b><small class="wn-cc">${p.cat}</small>${mfl}<span class="wn-gl" aria-hidden="true"></span></${tag}>`;
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

/* ================== Память: пять мест ==================
   Место — тоже осколок: закрытое — тёмное пустое стекло; можно вспомнить — то же стекло, в нём дышит свет духа; закреплено — осколок
   своей редкости. Пока выбранный осколок летит (S.mem.leave), место ждёт его пустым; село — вспышка и отскок (S.mem.land) */
function wnSlot(x, i) {
  const st = x.st, M = S.mem;
  if (st === 'set') {
    const p = wnP(x.p), wait = !!M.leave && M.leave.i === i, land = !wait && M.land && M.land.i === i ? M.land : null;
    return `<button class="wn-slot set${wait ? ' wait' : land ? ' land' : ''}" id="wnSlot${i}" data-r="${p.r}"${land ? ` style="--dl:${-Math.round(wnNow() - land.t0)}ms"` : ''} data-a="sheet" data-v="wnp:${p.id}" aria-label="${wnEsc(p.n)}, место цикла ${ROMAN[x.c]}">
      <span class="wn-rays" aria-hidden="true"></span>${wnMotes(p.r)}${wnIco(p.r, 'sl')}<b class="wn-sn">${p.n}</b>${rar(p.r)}<small class="faint">цикл ${ROMAN[x.c]}</small>${land ? '<span class="wn-mfl" aria-hidden="true"></span>' : ''}</button>`;
  }
  if (st === 'open') {
    const wait = !!M.offer[i];
    return `<div class="wn-slot open" id="wnSlot${i}">${wnMotes(0, WN_VIEW.openMotes)}${wnIco(0, 'sl', 'open')}<b class="wn-sn">Место цикла ${ROMAN[x.c]}</b><small class="spirit">${wait ? 'тройка ждёт' : 'можно вспомнить'}</small>
      <button class="btn go sm" data-a="wnmem" data-v="${i}">Вспомнить</button></div>`;
  }
  return `<div class="wn-slot lock" id="wnSlot${i}">${wnIco(0, 'sl', 'lock')}<b class="wn-sn faint">Цикл ${ROMAN[x.c]}</b><small class="faint">${ic('lock')}закрыто</small></div>`;
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
  if (x && M.leave && M.leave.i === i) return wnLeaveWindow(M.leave, x);
  if (!x) return dialog('Память Странника', `<p class="muted">Свободных мест Памяти нет. Новое откроется в следующем цикле.</p>`, `<button class="btn" data-a="close">Закрыть</button>`);
  if (x.st === 'set') { const p = wnP(x.p); return dialog(`Место цикла ${ROMAN[x.c]}`, `<p class="muted">Здесь закреплена «${p.n}». Выбрать заново можно после полного сброса.</p>`, `<button class="btn" data-a="close">Закрыть</button>`); }
  if (x.st !== 'open') return dialog(`Место цикла ${ROMAN[x.c]}`, `<p class="muted">Место откроется в цикле ${ROMAN[x.c]}.</p>`, `<button class="btn" data-a="close">Закрыть</button>`);
  const r = WN_SRV.offer(i), off = r.res; if (!off) return '';
  const V = WN_VIEW, key = wnAnimKey(off), anim = !wnShown(off);
  if (anim && (!M.anim || M.anim.key !== key)) {
    wnStop();
    const b = M.brk && M.brk.key === key ? M.brk : null, rs = off.ids.map(id => wnP(id).r), lead = b ? V.breakMs : 0;
    M.anim = { key, t0: 0, rs, lead, old: b ? b.ids : null, plan: wnPlan(rs, lead) };
  }
  M.brk = null;
  if (M.pick >= off.ids.length) M.pick = 0;
  const A = M.anim, busy = wnAnimating(off), el = busy ? Math.round(wnElapsed()) : 0, pk = !busy && M.pickAt ? Math.round(wnNow() - M.pickAt) : -1;
  const cards = off.ids.map((id, k) => {
    const p = wnP(id), live = busy && el < A.plan.done[k];
    const a = live ? { dl: A.plan.start[k] - el, bk: -el, h: wnViewHash(key, k), old: A.old ? { r: wnP(A.old[k]).r } : null } : null;
    return wnCard(p, { btn: true, k, sel: k === M.pick, id: 'wnCard' + k, a, cls: busy || k === M.pick ? '' : ' dim', pk: k === M.pick && pk >= 0 && pk < V.pickMs ? -pk : null });
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
/* окно после «Вспомнить»: выбор уже закреплён сервером. Невыбранные бьются стеклом; выбранная карта отдала осколок — он в слое частиц
   поднимается и летит к месту; окно гаснет и закрывается, когда он в пути. Кнопки ждут, фон окно не закрывает */
function wnLeaveWindow(L, x) {
  const V = WN_VIEW, el = L.t0 ? Math.round(wnNow() - L.t0) : 0, p = wnP(L.ids[L.k]);
  const cards = L.ids.map((id, k) => (k === L.k ? wnCard(wnP(id), { k, id: 'wnCard' + k, sel: true, cls: ' go' })
    : wnCard(wnP(id), { k, id: 'wnCard' + k, brk: { bk: -el, h: wnViewHash(L.i + ':' + L.n, k) } }))).join('');
  return `<div class="ov wn-ov leave" role="dialog" aria-modal="true" aria-label="Место Памяти · цикл ${ROMAN[x.c]}" style="--bk:${-el}ms;--brk:${V.breakMs}ms"><div class="ov-scrim"></div>
    <div class="dlg fit wn-dlg"><div class="dlg-h"><div class="col" style="gap:2px"><span class="eyebrow">Вспомнить одно из трёх</span><h2>Место Памяти · цикл ${ROMAN[x.c]}</h2></div><button class="iconbtn x" data-a="close" aria-label="Закрыть">${ic('x')}</button></div>
      <div class="dlg-b wn-b"><div class="wn-three busy">${cards}</div><div class="wn-det wn-wait" data-r="${p.r}"><p class="faint">«${p.n}» занимает место цикла ${ROMAN[x.c]}…</p></div></div>
      <div class="dlg-f wn-f"><span class="g-spacer"></span><button class="btn go" disabled>Вспомнить</button></div></div></div>`;
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
      ${set.length ? `<div class="wn-was">${set.map(x => { const p = wnP(x.p); return `<span class="wn-wasp" data-r="${p.r}">${wnIco(p.r, 'sm')}<b>${p.n}</b><small>цикл ${ROMAN[x.c]}</small></span>`; }).join('')}</div>` : ''}
      <dl class="kv"><dt>Цена</dt><dd>${money('enerium', cost)}</dd><dt>Есть</dt><dd>${fmt(bal)}</dd><dt>Доступно</dt><dd>раз в неделю расы</dd></dl>
      ${why ? `<p class="reason warn">${why}</p>` : `<p class="reason">Бесплатные перебросы не возвращаются. ${wnFreeNote()}</p>`}`;
    return dialog('Полный сброс Памяти', body, `<button class="btn ghost" data-a="close">Отмена</button><button class="btn warn" data-a="wnreset" data-v="${op}"${why ? ' disabled' : ''}>Сбросить${costTag('enerium', cost)}</button>`);
  },
  /* пассивка: эффект, семейство, вес и шанс из полного пула */
  wnp(o) {
    const p = wnP(o.arg); if (!p) return '';
    const M = S.mem, at = M.slots.findIndex(x => x.p === p.id), excl = wnPinned(M).filter(id => id !== p.id);
    return sheet(p.n, `<div class="wn-ph" data-r="${p.r}">${wnIco(p.r, 'md')}<div class="col" style="gap:4px">${rar(p.r)}<small class="faint">${p.cat}</small></div></div>
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
    const row = p => `<details class="wn-row" data-r="${p.r}"><summary>${wnIco(p.r, 'xs')}<span class="wn-rn"><b>${p.n}</b><small>${p.cat}${p.onlyFree ? ' · только бесплатно' : ''}</small></span><span class="num wn-rc">${wnPpm(wnChance(p, excl))}</span></summary>
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
  wnmem(v) { S.mem.pick = 0; S.mem.pickAt = 0; S.mem.ask = ''; S.mem.still = false; open('mem', String(v)); },
  /* выделить вариант: пока карта не сплавилась или выбор уже улетает — нельзя; выбранная только что поднимается (pickAt) */
  wnpick(v) {
    const A = S.mem.anim, k = +v;
    if (S.mem.leave || (A && A.t0 && A.plan && wnElapsed() < A.plan.land[k])) return;
    if (S.mem.pick !== k) S.mem.pickAt = wnNow();
    S.mem.pick = k; S.mem.still = true; render();
  },
  /* переброс: бесплатный — сразу, платный — подтверждение цены поверх окна (§2.5) */
  wnroll(v) {
    const [i, n, op] = String(v).split(':'), x = S.mem.slots[+i];
    if (!x) return;
    if (x.free > 0) return ACT.wnrollok(v);
    S.mem.ask = 'roll'; S.mem.still = true; render();
  },
  /* новая тройка — от сервера; показ: прежние осколки бьются стеклом (S.mem.brk), на их месте собираются новые */
  wnrollok(v) {
    const [i, n, op] = String(v).split(':'), prev = S.mem.offer[+i];
    S.mem.ask = '';
    const r = WN_SRV.reroll(op, +i, +n);
    if (r.again) { render(); return; }
    wnDo(r, res => {
      S.mem.pick = 0; S.mem.pickAt = 0; S.mem.still = true;
      if (prev && !wnSkipOn()) S.mem.brk = { key: res.i + ':' + res.n, ids: prev.ids.slice() };
      if (res.cost) toast(`Тройка переброшена · −${fmt(res.cost)} Энериума`); else render();
    });
  },
  wnask() { S.mem.ask = ''; S.mem.still = true; render(); },
  /* «Вспомнить»: закрепляет сервер. Показ: невыбранные бьются, выбранный осколок летит в своё место (S.mem.leave), место загорается
     цветом редкости. «Пропустить анимацию» и «меньше движения» — окно закрывается сразу */
  wnpin(v) {
    const [i, n, k, op] = String(v).split(':'), off = S.mem.offer[+i];
    if (S.mem.leave) return;
    wnDo(WN_SRV.pin(op, +i, +n, +k), res => {
      const p = wnP(res.id);
      S.route = 'profile'; S.seg.profile = 'mem';
      if (wnSkipOn() || !off) { S.overlay = null; S.mem.pinFx = res.i; toast(`Вспомнено: ${p.n}`); return; }
      S.mem.leave = { i: res.i, k: res.k, n: res.n, ids: off.ids.slice(), r: p.r, t0: 0, phase: 'break' };
      render();
    });
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
   Те же функции вида, что на экране. Сцена — карты всех семи редкостей: сборка по редкости, «Все по очереди» — от обычной
   к вневременной, «Переброс» — прежние осколки бьются, на их месте собираются новые. Вторая сцена — «Вспомнить»: невыбранные
   рассыпаются, выбранный осколок летит в место Памяти. Состояния карты и мест, значки-осколки и лестница сборки — из WN_VIEW и WN_ART */
let wnKitFxs = {}, wnKitT = [], wnKitN = 0;
const WN_KIT_PICK = [3, 7, 5];   // сцена «Вспомнить»: редкости трёх карт; выбрана средняя — она и летит в место
function wnKitSample(r) { return WN.passives.filter(p => p.r === r).reduce((b, p) => (p.w > b.w ? p : b)); }
/* строка лестницы: как собирается карта этой редкости и чем вспыхивает; справа — когда осколки сплавились */
function wnKitLadder(r) {
  const B = WN_VIEW.build[r], P = WN_VIEW.fx[r], C = WN_VIEW.converge[r], part = [`осколков ${B.frag}`, B.orbit ? `кружат ${B.orbit}°` : 'прямой слёт'];
  if (B.hold) part.push(`миг замедления ${B.hold} мс`);
  if (B.rays) part.push('лучи');
  if (C) part.push(`слетаются искры ${C[0]}`);
  part.push(`колец ${P.rings.length}`, `искр ${P.sparks[0]}`, `стекла ${P.glass[0]}`);
  if (P.gold) part.push(`золота ${P.gold[0]}`);
  if (P.streaks) part.push(`росчерков ${P.streaks[0]}`);
  if (P.motes) part.push(`огоньков ${P.motes[0]} × ${P.motes[2]}`);
  if (P.flash) part.push('вспышка');
  if (P.veil) part.push('свет на всё окно');
  if (P.shake) part.push('дрожь');
  if (WN_VIEW.motes[r]) part.push(`живых огоньков ${WN_VIEW.motes[r]}`);
  if (r >= 6) part.push('лучи на карте');
  return `<tr data-r="${r}"><td>${rar(r)}</td><td>${part.join(' · ')}</td><td class="num">${fmt(WN_VIEW.inMs + B.gather + B.hold)} мс</td></tr>`;
}
/* место Памяти в разделе: 'lock' — закрыто, 'open' — можно вспомнить, 'set' — закреплено осколком редкости r; o.land — только что принято */
function wnKitSlot(st, r, o = {}) {
  const id = o.id ? ` id="${o.id}"` : '';
  if (st === 'lock') return `<div class="wn-slot lock"${id}>${wnIco(0, 'sl', 'lock')}<b class="wn-sn faint">Цикл IV</b><small class="faint">${ic('lock')}закрыто</small></div>`;
  if (st === 'open') return `<div class="wn-slot open"${id}>${wnMotes(0, WN_VIEW.openMotes)}${wnIco(0, 'sl', 'open')}<b class="wn-sn">Место цикла III</b><small class="spirit">можно вспомнить</small><button class="btn go sm" type="button" tabindex="-1">Вспомнить</button></div>`;
  const p = wnKitSample(r);
  return `<div class="wn-slot set${o.land ? ' land' : ''}"${id} data-r="${r}"${o.land ? ' style="--dl:0ms"' : ''}><span class="wn-rays"></span>${wnMotes(r)}${wnIco(r, 'sl')}<b class="wn-sn">${p.n}</b>${rar(r)}<small class="faint">цикл II</small>${o.land ? '<span class="wn-mfl"></span>' : ''}</div>`;
}
/* сцена «Вспомнить»: три карты и открытое место */
const wnKitPickHtml = () => `<div class="wn-three">${WN_KIT_PICK.map((r, k) => wnCard(wnKitSample(r), { id: 'wnKitP' + k, sel: k === 1, cls: k === 1 ? '' : ' dim' })).join('')}</div>
  <div class="wn-kslot">${wnKitSlot('open', 0, { id: 'wnKitSlot' })}</div>`;
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
  html: () => {
    const R7 = [1, 2, 3, 4, 5, 6, 7], ready = [0, ...R7].filter(wnArtOn).length;
    const st = (cls, sel, t) => `<figure class="wn-kc">${wnCard(wnKitSample(4), { cls, sel })}<figcaption>${t}</figcaption></figure>`;
    const icons = [0, ...R7].map(r => `<figure class="wn-kc wn-ki">${wnIco(r, 'md', 'lock')}${wnIco(r, 'xs', 'lock')}<figcaption>${r ? RAR[r] : 'пустое место'}</figcaption></figure>`).join('');
    return `<section class="k-box wn-kit" style="grid-column:1/-1" id="wnKit"><h3>Память Странника · одна из трёх</h3>
    <p class="k-note">Окно «Вспомнить»: карты по очереди собираются из осколков. Проступает пустая рамка стекла, осколки значка слетаются к точке удара и сплавляются — зеркальная вспышка, по стеклу проходит блик, загорается свет редкости (ADR-0027). Чем реже пассивка, тем больше осколков и света: у эпической они кружат; с древней — кружат, на миг замирают и сплавляются с лучами; у первородной свет заливает всё окно; у вневременной — больше оборота, долгий миг, полный всплеск и дрожь. Переброс — прежние осколки бьются стеклом, на их месте собираются новые. «Вспомнить» — невыбранные рассыпаются, выбранный осколок летит в своё место Памяти. Тройку решает сервер до анимации; «Пропустить анимацию» и системное «меньше движения» показывают её сразу. Движение — только transform и opacity, частицы — EnFx.</p>
    <div class="wn-kstage" id="wnKitStage"><div class="wn-krow">${R7.map(r => wnCard(wnKitSample(r), { id: 'wnKit' + r, sel: r === 5 })).join('')}</div></div>
    <div class="k-row"><button class="btn sm go" type="button" data-wnkit="all">Все по очереди</button>${R7.map(r => `<button class="btn sm" type="button" data-wnkit="${r}"><span class="rar" data-r="${r}"></span>${RAR[r]}</button>`).join('')}<button class="btn sm" type="button" data-wnkit="reroll">${ic('swap')}Переброс</button></div>
    <div class="wn-kgrid">
      <div class="col"><span class="eyebrow">«Вспомнить»: выбранный — в своё место, остальные — стеклом</span>
        <div class="wn-kstage wn-kpick" id="wnKitPick"><div class="wn-kprow" id="wnKitPickIn">${wnKitPickHtml()}</div></div>
        <div class="k-row"><button class="btn sm go" type="button" data-wnkit="pick">Вспомнить</button><button class="btn sm ghost" type="button" data-wnkit="back">Сначала</button></div></div>
      <div class="col"><span class="eyebrow">Состояния карты</span><div class="wn-kstates">${st('', false, 'обычное')}${st(' hov', false, 'наведение')}${st('', true, 'выбрано')}${st(' dim', false, 'неактивное')}</div>
        <p class="k-note">Наведение — карта приподнимается, свет за осколком ярче, по стеклу проходит блик. Выбор — бирюзовое кольцо, как везде: выбранная поднимается и время от времени ловит блик. Остальные, пока выбрана другая, притушены. Пока карты собираются, нажать их нельзя.</p></div>
    </div>
    <div class="wn-kgrid">
      <div class="col"><span class="eyebrow">Места Памяти</span><div class="wn-slots wn-kslots">${wnKitSlot('lock')}${wnKitSlot('open')}${wnKitSlot('set', 6)}</div>
        <p class="k-note">Место — тоже осколок. Закрытое — тёмное пустое стекло. Можно вспомнить — то же стекло, в нём дышит свет духа и поднимаются огоньки. Закреплённое — осколок своей редкости; выбранный прилетает, и место принимает его вспышкой и отскоком. Это места с экрана «Странник → Память».</p></div>
      <div class="col"><span class="eyebrow">Значки · осколки условного зеркала</span><div class="wn-kicons">${icons}</div>
        <p class="k-note">Скол стекла с серебряной изнанкой, по краю — трещины, в глубине — свет памяти цвета редкости: чем реже, тем больше света. Пустое место — тёмное стекло без памяти. Задание — <code>tools/art-gen/jobs/memory-shards.json</code>, картинки — <code>assets/art/memory/</code>: в прототипе ${ready} из 8${ready < 8 ? ', до выгрузки на месте осколка — прежний кристалл CSS' : ''}.</p></div>
    </div>
    <div class="col"><span class="eyebrow">Лестница сборки: как собирается карта и чем вспыхивает</span><table class="wn-kfx">${R7.map(wnKitLadder).join('')}</table></div>
    ${wnKitCards()}
    <p class="k-note">Данные — <code>wanderer.js</code>, собирает <code>tools/content-gen/wanderer/build.js</code> из таблиц автора: ${WN.passives.length} пассивок Памяти, ${WN.art.list.length} артефактов; достижения — черновик: ${WN.ach.list.length} ${plural(WN.ach.list.length, 'достижение', 'достижения', 'достижений')} и ${WN.ach.firsts.length} ${plural(WN.ach.firsts.length, 'первенство', 'первенства', 'первенств')}. Экран — <code>screens/wanderer.js</code>, проверка — <code>check_wanderer.js</code>. Правок таблиц под систему — ${WN.fixes.length}:</p>
    <details class="wn-kfix"><summary class="k-note">показать правки</summary><ul>${WN.fixes.map(f => `<li><b>${f.what}</b> — ${f.why}</li>`).join('')}</ul></details>
  </section>`;
  },
  paint: () => {
    const box = document.getElementById('wnKit'); if (!box || !box.addEventListener) return;
    const V = WN_VIEW;
    /* слой частиц сцены — при первом нажатии: странице UI-кита холст до того не нужен */
    const fxOf = id => {
      const host = document.getElementById(id); if (!host || !window.EnFx) return null;
      let I = wnKitFxs[id];
      if (!I || I.host !== host) { if (I) I.destroy(); try { I = wnKitFxs[id] = EnFx.create(host, { speed: () => 1 }); } catch (_) { I = wnKitFxs[id] = null; } }
      return I;
    };
    const at = (ms, f) => wnKitT.push(setTimeout(() => { try { f(); } catch (_) { } }, ms));
    const stop = () => { wnKitT.forEach(t => clearTimeout(t)); wnKitT = []; };
    /* сборка карты редкости r: delay — через сколько мс, old — прежняя редкость (переброс: сначала она бьётся) */
    const build = (r, delay, old) => {
      const id = 'wnKit' + r, el = document.getElementById(id); if (!el) return;
      const B = V.build[r], lead = old ? V.breakMs : 0, land = delay + lead + V.inMs + B.gather + B.hold, card = () => document.getElementById(id);
      el.outerHTML = wnCard(wnKitSample(r), { id, sel: r === 5, a: { dl: delay + lead, bk: delay, h: EnLoot.seedOf('кит памяти|' + (++wnKitN)), old: old ? { r: old } : null } });
      const fx = fxOf('wnKitStage');
      if (old) at(delay, () => wnShatter(fx, card(), old));
      if (V.converge[r]) at(delay + lead + V.inMs, () => wnConverge(fx, card(), r));
      at(land, () => wnBurst(fx, card(), r));
      at(land + V.revealMs + V.tail, () => { const c = card(); if (c) c.outerHTML = wnCard(wnKitSample(r), { id, sel: r === 5 }); });
    };
    /* «Вспомнить»: невыбранные бьются, средняя отдаёт осколок — он летит в место, место его принимает */
    const pick = () => {
      const inn = document.getElementById('wnKitPickIn'); if (!inn) return;
      inn.innerHTML = wnKitPickHtml();
      const fx = fxOf('wnKitPick'), r = WN_KIT_PICK[1], cards = WN_KIT_PICK.map((q, k) => document.getElementById('wnKitP' + k)), slot = document.getElementById('wnKitSlot');
      if (!fx || !cards[1] || !slot) return;
      const a = fx.center(wnIcoEl(cards[1])), b = fx.center(wnIcoEl(slot));
      WN_KIT_PICK.forEach((q, k) => {
        if (k === 1) { cards[k].outerHTML = wnCard(wnKitSample(q), { id: 'wnKitP' + k, sel: true, cls: ' go' }); return; }
        cards[k].outerHTML = wnCard(wnKitSample(q), { id: 'wnKitP' + k, brk: { bk: 0, h: EnLoot.seedOf('кит памяти|' + (++wnKitN)) } });
        wnShatter(fx, document.getElementById('wnKitP' + k), q);
      });
      wnGhost(fx, a, b, r, V.breakMs);
      at(V.breakMs + V.flyMs, () => { const s = document.getElementById('wnKitSlot'); if (s) s.outerHTML = wnKitSlot('set', r, { id: 'wnKitSlot', land: true }); wnBurst(fx, document.getElementById('wnKitSlot'), r); });
    };
    box.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-wnkit]'); if (!b || wnReduced()) return;   // «меньше движения» — сцены стоят
      const k = b.dataset.wnkit; stop();
      if (k === 'all') [1, 2, 3, 4, 5, 6, 7].forEach((r, j) => build(r, j * V.stepMs));
      else if (k === 'reroll') [1, 2, 3, 4, 5, 6, 7].forEach(r => build(r, 0, r));
      else if (k === 'pick') pick();
      else if (k === 'back') { const inn = document.getElementById('wnKitPickIn'); if (inn) inn.innerHTML = wnKitPickHtml(); }
      else build(+k, 0);
    });
  },
});

/* ================== сценарии презентации ================== */
if (WN) FLOWS.push(
  ['Память Странника · одна из трёх', 'Цикл VI: все пять мест — осколки зеркала. Карты собираются из осколков, чем реже пассивка — тем больше кружения, света и частиц. Переброс бьёт стекло, «Вспомнить» отправляет осколок в место, каталог',
    () => { S.route = 'profile'; S.seg.profile = 'mem'; S.mem.cyc = 6; S.mem.pick = 0; S.mem.ask = ''; S.mem.still = false; const i = S.mem.slots.map(x => x.st).lastIndexOf('open'); S.overlay = { t: 'mem', arg: i < 0 ? '' : String(i) }; }],
  ['Артефакты Странника', 'Восемнадцать артефактов из таблицы автора: покупка золотом, уровни душами, не выше одного за цикл',
    () => { S.route = 'profile'; S.seg.profile = 'arts'; S.overlay = null; }],
  ['Достижения и первенства', 'Три категории, пассивки аккаунта и сундук за каждое; таинственные скрыты до получения; первенства сервера по циклам',
    () => { S.route = 'profile'; S.seg.profile = 'ach'; S.seg.wnach = 'pers'; S.overlay = null; }],
);

/* ================== состояние ==================
   S.mem — Память: slots — места (c — цикл, p — id закреплённой пассивки, free — бесплатные перебросы, n — номер следующей тройки,
   st — вычисляется: 'set', 'open' или 'lock'); offer — текущая тройка места от сервера; shown — показанные тройки; anim — идущая сборка
   { key, t0, rs, lead, old, plan }; brk — прежняя тройка, которая бьётся при перебросе; leave — выбор улетает в место { i, k, n, ids, r,
   t0, phase }; land — место приняло осколок { i, t0 }; pick — выделенный вариант, pickAt — когда выделен; ask — подтверждение поверх
   окна; resetWeek — неделя сброса; skip — «Пропустить анимацию»; cyc — демо-цикл экрана; q — поиск по каталогу. S.wn — артефакты
   (уровень по id), достижения (got, p, first), ops — ответы сервера по номерам операций, seq — номер следующей операции. */
function wnMemState() {
  const M = { slots: [], offer: {}, shown: {}, anim: null, brk: null, leave: null, land: null, pick: 0, pickAt: 0, ask: '', still: false, resetWeek: '', skip: wnSaved(), cyc: 0, q: '', qPos: 0, qFocus: false, pinFx: null, demoHigh: false };
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
