/* screens/roulette.js — «Герои → Призыв → За души»: рулетка Возрождения душ (§15 GDD, ADR-0019). Договор — screens/model.js.
   Регистрирует: rlCol — вход рулетки в сцене алтаря вкладки «За души», главное вкладки (сцену собирает hrSoulsView, screens/heroes.js);
   OV.rl — окно рулетки с лентой и итогом поверх, OV.rlodds — лист «Шансы»; действия ACT.rl*; сценарий презентации. Своё состояние — S.rl.
   «Дорого-богато» (слово автора 29.09.2026: «рулетка — это тоже для людей, которые донатят»): алтарь душ за вкладкой и окном — зеркало
   душ, из стекла выходят контуры героев; герои пула — веером карточек в раме старого золота перед алтарём; лента идёт сквозь зеркало,
   полный герой — в раме, осколок — стекло с лицом героя (shardGhost, screens/art-icons.js). Честно (§1.2): цена и шанс героя целиком
   видны у входа и в окне, все шансы — лист «Шансы». Арт — RL_ART: пока пути нет, алтарь и раму рисует CSS, битых картинок нет.
   Правила §15: пул прокрутки привязан к циклу — герои рулетки текущего цикла (rsPool; потолок доблести — по циклу, RS.srcInfo.roulette.maxByC,
   ADR-0030, п. 5а: II — 2, III–IV — 3, V–VI — 4). Выпадают осколки
   или, с малым шансом, полный чертёж. Осколки и чертёж героя из коллекции уходят в прах (§15.2, демо-таблица §15.3 — rsDustOf).
   Полный чертёж активируют души: он ложится комплектом осколков, и пробуждает его то же «Пробудить», что в каталоге праха
   (ACT.activate) — герой приходит с 0 ур., 0 РП и 0 Добл, остаток осколков уходит в прах. Так пробуждение и прах сходятся с §15.2.
   Сервер решает, клиент показывает. Итог операции — RL_SRV: проверка кошелька, один расход Энериума, бросок генератора на сиде
   операции (rlRoll, EnLoot.makeRng) и выдача — одним вызовом. Повтор того же номера операции возвращает прежний ответ без расхода
   и без выдачи. В игре сид и итог присылает сервер, здесь сид — заглушка от номера операции.
   Лента только показывает решённый итог: разгон и плавное замедление по кривой rlEase до остановки на выпавшей карточке —
   requestAnimationFrame и transform. Новая лента начинается с соседей прошлой остановки, поэтому идёт без скачка. У ленты свой сид:
   на итог он не влияет. На остановке — частицы EnFx (fx.js) цвета редкости, у полного чертежа вспышка больше и дольше. Слой частиц
   лежит рядом с #game и переживает перерисовку экрана.
   «Пропустить анимацию» — итог сразу; выбор помнит localStorage, без него всё работает. При prefers-reduced-motion анимации нет.
   ×10 и ×100 — сводка: полные чертежи первыми и крупно, осколки по героям с суммой, прах, потрачено. Без пропуска — короткая лента
   на самый ценный итог. Числа — RL_DATA (демонстрация: цена §15.1, шанс полного чертежа, раскладка осколков) и RL_VIEW (вид).
   Служебное — только команде: TM, PL из index.html. Автопроверка — tools/content-gen/screens/check_roulette.js. */
'use strict';

/* ================== данные: всё — демонстрация, не баланс ================== */
const RL_DATA = {
  price: 100,                      // §15.1: прокрутка — 100 Энериума; то же число в EN_ROSTER.rules.spin, автопроверка сверяет
  counts: [1, 10, 100],            // прокруток за операцию — три кнопки
  bp: 10000,                       // 100 % в базисных пунктах
  fullBp: 100,                     // полный чертёж — 1 % за прокрутку: «малый шанс» §15.1; таблиц вероятностей в GDD ещё нет
  shards: [[5, 4500], [10, 3500], [15, 1500], [25, 500]],   // иначе осколки: [сколько, вес в б. п.]; сумма весов — bp
  /* гарантия (решение автора 01.10.2026): каждая every-я прокрутка — q осколков героя, которого игрок выбрал сам. Счётчик — у «сервера»
     и идёт сквозь операции и циклы; броски генератора те же, гарантия заменяет итог своей прокрутки — формат не меняется */
  pity: { every: 10, q: 25 },
  demo: { give: 10000, search: 5000 },   // демо команды: «+Энериум»; «полный чертёж следующим» — сколько сидов перебрать
};
/* числа вида, не баланса */
const RL_VIEW = {
  ctx: 6,                          // карточек по обе стороны остановки: с них начинается следующая лента
  run: 34, ms: [4600, 5400],       // одна прокрутка: карточек до выпавшей и длительность до полной остановки, мс
  runShort: 16, msShort: [2400, 2800],   // ×10 и ×100: короткая лента на самый ценный итог
  accel: 0.08, decay: 1.8,         // кривая rlEase: разгон — доля времени, дальше скорость спадает как (1 − s)^decay
  jitter: 22,                      // остановка — не дальше стольких % ширины карточки от её середины
  fullEach: 7,                     // полный герой в ленте — в среднем каждая седьмая карточка; это вид, шансы — RL_DATA
  tickMs: 140,                     // вздрог метки, когда под ней проходит карточка
  reveal: 650, revealFull: 1500,   // от остановки до окна итога, мс: частицы успевают отыграть
  safety: 1200,                    // запасной таймер остановки сверх длительности, мс: если кадры не идут
  /* частицы EnFx. Кольца — [радиус в ширинах карточки, мс, толщина, задержка, цвет: gold — золото, r — редкость, light — свет];
     искры — [сколько, скорость, жизнь мс, размер]; огоньки — [серий, шаг мс, сколько, скорость, жизнь мс, размер, подъём];
     вспышка — [масштаб, мс]; дрожь — [px, мс] */
  fx: {
    shard: { rings: [[0.9, 560, 2, 0, 'r']], sparks: [28, 210, 800, 5], streaks: [14, 260, 420, 2.5] },
    full: {
      rings: [[1.4, 900, 3, 0, 'gold'], [2.4, 1150, 2, 140, 'r'], [1.1, 700, 1.5, 320, 'light']],
      sparks: [48, 260, 1700, 6], gold: [70, 340, 1500, 7], streaks: [36, 420, 700, 3],
      motes: [7, 170, 10, 70, 1400, 4, 150], flash: [2.2, 1100], shake: [4, 380],
    },
  },
  fan: { deg: 3, lift: 3 },        // веер героев пула у алтаря: поворот и опускание карточки за шаг от середины, градусы и px
  shard: 60,                       // осколок на карточке ленты, px; в итоге одной прокрутки — big
  big: 96,
  motes: 14,                       // огоньков душ, что поднимаются к зеркалу за лентой
};
/* арт Возрождения душ — tools/art-gen/jobs/souls-altar.json, выгрузка export_ui.py в assets/art/souls/. ready — выгруженные пути:
   пока пути нет, алтарь и раму рисует CSS. want — заказанные к выгрузке 29.09.2026. win — окно рамы в долях её рисунка, %:
   сверху, справа, снизу, слева (измерено по альфе рисунка): рама выходит за карточку, гребень — над ней */
const RL_ART = {
  ready: ['souls/altar.jpg', 'souls/frame.png'],   // выгрузка 29.09.2026
  want: ['souls/altar.jpg', 'souls/frame.png'],
  altar: 'souls/altar.jpg',
  frame: 'souls/frame.png',
  win: [137, 62, 50, 62],          // десятые доли процента: 13,7 / 6,2 / 5,0 / 6,2 — только целые
};

/* ================== помощники ================== */
const RL_KEY = 'en-rl-skip';   // localStorage: «Пропустить анимацию»
const rlSaved = () => { try { return localStorage.getItem(RL_KEY) === '1'; } catch (_) { return false; } };
const rlReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
const rlSkipOn = () => !!S.rl.skip || rlReduced();
const rlNeed = () => RS.rules ? RS.rules.stub.shards : 0;   // комплект осколков героя — заглушка roster.js; им же ложится полный чертёж
const rlNext = () => 'rl' + S.rl.seq;                       // номер следующей операции: его несут кнопки прокрутки
const rlCost = n => RL_DATA.price * n;
const rlSumW = list => list.reduce((a, x) => a + x[1], 0);
const rlShare = w => Math.floor(w * RL_DATA.bp / rlSumW(RL_DATA.shards));   // доля числа осколков среди осколков, б. п.
const rlPct = bp => { const i = Math.floor(bp / 100), f = bp % 100; return `${i}${f ? ',' + String(f).padStart(2, '0').replace(/0$/, '') : ''} %`; };
function rlPick(list, k) { for (const [q, w] of list) { if (k < w) return q; k -= w; } throw new Error('бросок вне суммы весов'); }
/* a ценнее b: полный чертёж, затем редкость героя, затем число осколков */
function rlBetter(a, b) {
  if (a.full !== b.full) return a.full;
  const ra = RSI[a.id].r, rb = RSI[b.id].r;
  return ra !== rb ? ra > rb : a.q > b.q;
}
const rlBest = list => list.reduce((b, g) => rlBetter(g, b) ? g : b);

/* ================== «сервер» ==================
   rlRoll — чистая функция итога: тот же пул, сид и число прокруток — тот же итог. Порядок обращений к генератору — часть формата:
   на прокрутку ровно три броска — герой пула (поровну), полный ли чертёж (из RL_DATA.bp), число осколков (по весам RL_DATA.shards).
   У полного чертежа третий бросок тоже делается, чтобы формат не зависел от исхода. Чертёж — комплект осколков героя. */
function rlRoll(pool, seed, n) {
  const D = RL_DATA, rng = EnLoot.makeRng(seed), W = rlSumW(D.shards), need = rlNeed(), out = [];
  for (let i = 0; i < n; i++) {
    const h = pool[rng(pool.length)], full = rng(D.bp) < D.fullBp, q = rlPick(D.shards, rng(W));
    out.push({ id: h.id, full, q: full ? need : q });
  }
  return out;
}
/* герой гарантии: выбранный игроком, если он в пуле цикла, не в коллекции и осколков ему ещё не хватает; иначе — из таких же тот,
   у кого осколков больше (затем — выше редкость, затем — порядок пула). Всем хватает — выбранный или первый не из коллекции: лишнее
   уйдёт в прах при пробуждении; все в коллекции — первый в пуле, осколки сразу в прах (§15.2) */
const rlWants = h => !rsHas(h) && (S.rs.shards[h.id] || 0) < rlNeed();
function rlPityHero(pool, pick = S.rl.srv.pick) {
  const p = pool.find(h => h.id === pick);
  if (p && rlWants(p)) return p;
  const by = (a, b) => (S.rs.shards[b.id] || 0) - (S.rs.shards[a.id] || 0) || RSI[b.id].r - RSI[a.id].r;
  return pool.filter(rlWants).sort(by)[0] || (p && !rsHas(p) ? p : pool.find(h => !rsHas(h))) || pool[0] || null;
}
const rlPityLeft = () => RL_DATA.pity.every - S.rl.srv.pity;   // прокруток до гарантии: 1 — следующая
const RL_SRV = {
  seed: (op, k) => EnLoot.seedOf(`возрождение|${op}|${k}`),   // заглушка серверного сида: от номера операции
  /* операция: проверка, расход и выдача — одним вызовом. Ответ: { res } — итог; { again, res } — повтор, ничего не меняет;
     { refuse } — отказ без расхода. Выдача: осколки — S.rs.shards, герой из коллекции — прах в кошелёк (§15.2).
     Гарантия: счётчик V.pity растёт на каждую прокрутку; на every-й итог прокрутки — q осколков героя гарантии (rlPityHero на запасах
     этого мига), счётчик — в ноль. Итог гарантии помечен pity */
  spin(op, n) {
    const V = S.rl.srv, P = RL_DATA.pity;
    if (V.ops[op]) return { again: true, res: V.ops[op] };
    if (!RL_DATA.counts.includes(n)) return { refuse: 'count' };
    const pool = rsPool(), cost = rlCost(n);
    if (!pool.length) return { refuse: 'pool' };
    if (S.wallet.enerium < cost) return { refuse: 'enerium', cost };
    let k = 0;   // демо команды: перебрать сиды, пока первая прокрутка не даст полный чертёж
    if (S.rl.demoFull) { while (k < RL_DATA.demo.search && !rlRoll(pool, RL_SRV.seed(op, k), 1)[0].full) k++; S.rl.demoFull = false; }
    const seed = RL_SRV.seed(op, k), res = { op, n, c: rsCyc(), cost, seed, list: [], dust: 0, pityAt: V.pity };
    S.wallet.enerium -= cost;
    for (let x of rlRoll(pool, seed, n)) {
      if (++V.pity >= P.every) { V.pity = 0; const ph = rlPityHero(pool); if (ph) x = { id: ph.id, full: false, q: P.q, pity: true }; }
      const h = RSI[x.id], g = { id: x.id, full: x.full, q: x.q, dust: 0 };
      if (x.pity) g.pity = true;
      if (rsHas(h)) { g.dust = x.q * rsDustOf(h); res.dust += g.dust; }     // герой уже в коллекции — осколки и чертёж в прах
      else S.rs.shards[x.id] = (S.rs.shards[x.id] || 0) + x.q;            // до пробуждения копятся; остаток — в прах при пробуждении
      res.list.push(g);
    }
    S.wallet.dust += res.dust;
    V.ops[op] = res;
    return { res };
  },
  /* выбор героя гарантии — настройка, не выдача: тот же выбор дважды ничего не меняет. Только герой пула цикла не из коллекции */
  choose(id) {
    const h = rsPool().find(x => x.id === id);
    if (!h) return { refuse: 'pool' };
    if (rsHas(h)) return { refuse: 'own' };
    S.rl.srv.pick = id;
    return { ok: true };
  },
};
function rlRefuse(r) {
  if (r.refuse === 'enerium') return `Не хватает Энериума: нужно ${fmt(r.cost)}, есть ${fmt(S.wallet.enerium)}`;
  if (r.refuse === 'pool') return `Возрождение душ откроется с цикла ${ROMAN[rsFrom('roulette')]}`;
  return `Крутить можно только ${RL_DATA.counts.map(n => '×' + n).join(', ')}`;
}

/* ================== итог по героям ================== */
/* сводка операции: полные чертежи, осколки героев не в коллекции, прах — по героям. bp — чертежей, q — осколков без чертежей */
function rlGroups(R) {
  const full = new Map(), shards = new Map(), dust = new Map();
  const add = (m, g) => { const x = m.get(g.id) || { id: g.id, bp: 0, q: 0, dust: 0, pity: 0 }; if (g.full) x.bp++; else x.q += g.q; x.dust += g.dust; if (g.pity) x.pity++; m.set(g.id, x); };
  for (const g of R.list) { if (g.full) add(full, g); if (g.dust) add(dust, g); else if (!g.full) add(shards, g); }
  const by = (a, b) => RSI[b.id].r - RSI[a.id].r || b.bp - a.bp || b.q - a.q || RSI[a.id].n.localeCompare(RSI[b.id].n, 'ru');
  return { full: [...full.values()].sort(by), shards: [...shards.values()].sort(by), dust: [...dust.values()].sort(by) };
}
/* одна строка об итоге: в колонке — «прошлая прокрутка», во всплывающем сообщении — когда окно закрыли посреди ленты */
function rlSay(R, lead) {
  if (R.n === 1) { const g = R.list[0], h = RSI[g.id]; return `${lead}: <b>${h.n}</b> · ${g.full ? 'полный чертёж' : 'осколки ×' + g.q}${g.pity ? ' · гарантия' : ''}${g.dust ? ' → прах' : ''}`; }
  const G = rlGroups(R), bp = G.full.reduce((a, x) => a + x.bp, 0), q = G.shards.reduce((a, x) => a + x.q, 0);
  return `${lead} ×${R.n}: осколков ${fmt(q)}${bp ? ` · чертежей ${fmt(bp)}` : ''}${R.dust ? ` · прах +${fmt(R.dust)}` : ''}`;
}

/* ================== лента ==================
   Лента — вид, не расчёт: её карточки — свой генератор на номере операции, выпавшая карточка — итог сервера.
   film = { op, c, cards: [{ id, full, q }], from, fromJit, T, jit, ms }: карточка from — под меткой на старте (там остановилась
   прошлая лента), T — выпавшая; jit — сдвиг остановки в % ширины карточки. Без операции — лента покоя пула цикла. */
function rlFiller(pool, rng) {
  const h = pool[rng(pool.length)], full = rng(RL_VIEW.fullEach) === 0, q = rlPick(RL_DATA.shards, rng(rlSumW(RL_DATA.shards)));
  return { id: h.id, full, q: full ? rlNeed() : q };
}
function rlIdle() {
  const pool = rsPool(); if (!pool.length) return null;
  const V = RL_VIEW, rng = EnLoot.makeRng(EnLoot.seedOf('лента|' + rsCyc()));
  return { op: '', c: rsCyc(), cards: Array.from({ length: 2 * V.ctx + 1 }, () => rlFiller(pool, rng)), from: V.ctx, fromJit: 0, T: V.ctx, jit: 0, ms: 0 };
}
/* лента на экране: своя операция или лента покоя; у другого цикла — лента покоя его пула */
function rlFilm() {
  const F = S.rl.film;
  if (F && (F.c === rsCyc() || (!!F.op && S.rl.anim === F.op))) return F;
  return (S.rl.film = rlIdle());
}
/* лента операции: соседи прошлой остановки, разгон, выпавшая карточка — самый ценный итог, хвост */
function rlFilmOf(res, prev) {
  const V = RL_VIEW, one = res.n === 1, pool = rsPool(), rng = EnLoot.makeRng(EnLoot.seedOf('лента|' + res.op)), fill = () => rlFiller(pool, rng);
  const cards = prev ? prev.cards.slice(prev.T - V.ctx, prev.T + V.ctx + 1) : Array.from({ length: 2 * V.ctx + 1 }, fill);
  const from = V.ctx, T = from + (one ? V.run : V.runShort), best = rlBest(res.list), [m0, m1] = one ? V.ms : V.msShort;
  while (cards.length < T) cards.push(fill());
  cards.push({ id: best.id, full: best.full, q: best.q, pity: !!best.pity });
  for (let i = 0; i < V.ctx; i++) cards.push(fill());
  return { op: res.op, c: res.c, cards, from, fromJit: prev ? prev.jit : 0, T, jit: rng(2 * V.jitter + 1) - V.jitter, ms: m0 + rng(m1 - m0 + 1) };
}
/* кривая: разгон за долю accel — скорость растёт плавно, дальше спадает как (1 − s)^decay до нуля ровно в конце. Скорость
   непрерывна, в конце и скорость, и ускорение — ноль: лента дотягивает до карточки без рывка */
function rlEase(u) {
  const a = RL_VIEW.accel, k = RL_VIEW.decay, v = 1 / (a / 2 + (1 - a) / (k + 1));
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  if (u < a) { const y = u / a; return v * a * (y * y * y - y * y * y * y / 2); }
  const s = (u - a) / (1 - a);
  return v * (a / 2 + (1 - a) * (1 - Math.pow(1 - s, k + 1)) / (k + 1));
}

/* ================== анимация: requestAnimationFrame и transform ================== */
let rlAnim = null, rlRaf = 0, rlWas = { ov: false, res: '' }, rlFxI = null;
function rlEls() {
  const win = document.getElementById('rlWin'), track = document.getElementById('rlTrack');
  if (!win || !track || !track.children || track.children.length < 2) return null;
  return { win, track, mark: document.getElementById('rlMark'), cards: track.children };
}
/* мерка ленты: ширина окна, левый край и шаг карточек; положение — сдвиг дорожки, при котором карточка i под меткой */
function rlMeasure(E) {
  const c0 = E.cards[0], c1 = E.cards[1];
  return { W: E.win.clientWidth, left: c0.offsetLeft, step: c1.offsetLeft - c0.offsetLeft, cw: c0.offsetWidth };
}
const rlX = (M, i, jit) => M.W / 2 - (M.left + i * M.step + M.cw / 2 + jit * M.cw / 100);
const rlPlace = (E, x) => { E.track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`; };
function rlTick(m) { if (m && m.animate) m.animate([{ transform: 'scaleX(2.4)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 0.9 }], { duration: RL_VIEW.tickMs, easing: 'ease-out' }); }
/* кадр ленты в момент now: мерка снимается заново, если разметку перерисовали; карточка под меткой подсвечена. true — лента дошла */
function rlStep(now) {
  const A = rlAnim, F = S.rl.film, E = rlEls();
  if (!A || !F || F.op !== A.op || !E) return false;
  if (A.track !== E.track) { const M = rlMeasure(E); Object.assign(A, { track: E.track, M, x0: rlX(M, F.from, F.fromJit), x1: rlX(M, F.T, F.jit), cur: -1 }); }
  if (!A.t0) A.t0 = now;
  const u = Math.min(1, (now - A.t0) / A.ms), x = A.x0 + (A.x1 - A.x0) * rlEase(u), M = A.M;
  rlPlace(E, x);
  const i = Math.round((M.W / 2 - x - M.left - M.cw / 2) / M.step);
  if (i !== A.cur) { const a = E.cards[A.cur], b = E.cards[i]; if (a) a.classList.remove('on'); if (b) b.classList.add('on'); if (A.cur >= 0) rlTick(E.mark); A.cur = i; }
  return u >= 1;
}
function rlFrame(now) {
  rlRaf = 0;
  const A = rlAnim; if (!A || A.landed) return;
  if (!S.overlay || S.overlay.t !== 'rl') { rlAbort(); return; }
  if (rlStep(now)) rlLand(A.op); else rlRaf = requestAnimationFrame(rlFrame);
}
function rlStart(res) {
  const F = S.rl.film, x = F.cards[F.T];
  if (rlRaf) { cancelAnimationFrame(rlRaf); rlRaf = 0; }
  rlAnim = { op: res.op, ms: F.ms, t0: 0, landed: false, track: null, cur: -1, full: x.full, r: RSI[x.id].r };
  S.rl.anim = res.op;
  setTimeout(() => rlLand(res.op), F.ms + RL_VIEW.safety);   // кадры не идут (вкладка скрыта) — остановка всё равно наступит
}
/* остановка: лента ровно на выпавшей карточке, подсветка, частицы; окно итога — после паузы */
function rlLand(op) {
  const A = rlAnim; if (!A || A.op !== op || A.landed) return;
  A.landed = true;
  if (rlRaf) { cancelAnimationFrame(rlRaf); rlRaf = 0; }
  const E = rlEls(), F = S.rl.film;
  if (E && F && F.op === op) {
    rlPlace(E, rlX(rlMeasure(E), F.T, F.jit));
    for (const c of E.cards) c.classList.remove('on');
    const card = E.cards[F.T];
    if (card) { card.classList.add('won', 'hit'); try { rlBurst(card, A.full, A.r); } catch (_) { } }
    if (E.mark) E.mark.classList.add('hit');
  }
  setTimeout(() => rlReveal(op), A.full ? RL_VIEW.revealFull : RL_VIEW.reveal);
}
/* окно итога: после остановки, сразу при «Пропустить анимацию» или если галочку поставили посреди ленты */
function rlReveal(op) {
  if (!op || S.rl.anim !== op) return;   // окно закрыли или итог уже открыт
  if (rlRaf) { cancelAnimationFrame(rlRaf); rlRaf = 0; }
  rlAnim = null; S.rl.anim = ''; S.rl.show = op;
  render(); rlFocusRes();
}
/* окно закрыли посреди ленты: итог уже выдан — называем его во всплывающем сообщении */
function rlAbort() {
  if (rlRaf) { cancelAnimationFrame(rlRaf); rlRaf = 0; }
  rlAnim = null;
  const op = S.rl.anim; if (!op) return;
  S.rl.anim = '';
  const R = S.rl.srv.ops[op];
  if (R) setTimeout(() => toast(rlSay(R, 'Возрождение душ')), 0);
}
const rlFocusRes = () => requestAnimationFrame(() => { const b = document.querySelector('.g .rl-res .rl-close'); if (b) b.focus({ preventScroll: true }); });
/* после каждой перерисовки: дорожка встаёт на место — идущая лента в свой момент времени, стоящая — на выпавшей карточке */
function rlSync() {
  if (!S.rl) return;
  if (!S.overlay || S.overlay.t !== 'rl') { if (rlAnim || S.rl.anim) rlAbort(); S.rl.show = ''; return; }
  const F = S.rl.film, E = rlEls(); if (!F || !E) return;
  const A = rlAnim;
  if (A && A.op === F.op && !A.landed) { A.track = null; rlStep(performance.now()); if (!rlRaf) rlRaf = requestAnimationFrame(rlFrame); return; }
  rlPlace(E, rlX(rlMeasure(E), F.T, F.jit));
}
window.addEventListener('en-render', () => { rlSync(); rlWas = { ov: !!S.overlay && S.overlay.t === 'rl', res: S.rl ? S.rl.show : '' }; });
window.addEventListener('resize', () => { if (rlAnim) rlAnim.track = null; if (!rlAnim || rlAnim.landed) rlSync(); });

/* ================== частицы на остановке ==================
   Слой .rl-fxl — рядом с #game, а не внутри: перерисовка экрана его не сносит, вспышка доигрывает и под окном итога */
function rlFx() {
  if (!window.EnFx) return null;
  const g = document.getElementById('game'), p = g && g.parentElement;
  if (!p || !p.querySelector) return null;
  let L = p.querySelector(':scope > .rl-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'rl-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  if (!rlFxI || rlFxI.host !== L) { if (rlFxI) rlFxI.destroy(); rlFxI = EnFx.create(L); }
  return rlFxI;
}
/* цвет редкости — из токенов --r1…--r7 (ADR-0027) */
const rlColor = r => { try { return getComputedStyle(document.documentElement).getPropertyValue('--r' + r).trim() || EnFx.COL.gold; } catch (_) { return EnFx.COL.gold; } };
function rlFlash(host, b, color, scale, ms) {
  const d = document.createElement('div'); d.className = 'rl-flash';
  d.style.left = b.x + 'px'; d.style.top = b.y + 'px'; d.style.setProperty('--c', color);
  host.appendChild(d);
  const a = d.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, transform: `translate(-50%,-50%) scale(${scale})`, offset: 0.22 },
    { opacity: 0, transform: `translate(-50%,-50%) scale(${scale * 1.35})` }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  a.onfinish = () => d.remove();
}
function rlBurst(card, full, r) {
  const fx = rlFx(); if (!fx) return;
  const P = RL_VIEW.fx[full ? 'full' : 'shard'], C = EnFx.COL, b = fx.center(card), c = rlColor(r);
  const col = k => k === 'gold' ? C.gold : k === 'light' ? C.steel : c;
  for (const [k, ms, w, d, cc] of P.rings) setTimeout(() => fx.ring(b.x, b.y, col(cc), b.w * k, ms, w), d);
  if (P.flash) rlFlash(fx.host, b, full ? C.gold : c, ...P.flash);
  fx.burst(b.x, b.y, c, ...P.sparks);
  if (P.gold) fx.burst(b.x, b.y, C.gold, ...P.gold);
  fx.burst(b.x, b.y, C.steel, ...P.streaks, { shape: 'streak', w: 1.4 });
  if (P.motes) {
    const [n, step, k, sp, life, size, up] = P.motes;
    for (let i = 0; i < n; i++) setTimeout(() => fx.burst(b.x, b.y + b.h / 4, i % 2 ? C.gold : c, k, sp, life, size, { ay: -up, drag: 1.2, fade: 'in' }), i * step);
  }
  if (P.shake) fx.shake(...P.shake);
}

/* ================== вид ================== */
const rlArt = p => RL_ART.ready.includes(p);
/* рама героя души выходит за карточку: отступы — окно рамы (RL_ART.win) в долях карточки, сотые доли процента, только целые */
function rlFrVars() {
  const [t, r, b, l] = RL_ART.win, w = 1000 - r - l, hh = 1000 - t - b;
  const p = (x, d) => { const v = Math.floor(x * 10000 / d); return `-${Math.floor(v / 100)}.${String(v % 100).padStart(2, '0')}%`; };
  return `--fr-t:${p(t, hh)};--fr-r:${p(r, w)};--fr-b:${p(b, hh)};--fr-l:${p(l, w)}`;
}
/* рама: рисунок старого золота с каплей души в гребне; пока не выгружен — золото CSS */
const rlFr = () => rlArt(RL_ART.frame) ? `<img class="rl-fr" src="${AV(RL_ART.frame)}" alt="" loading="lazy" decoding="async">` : '<i class="rl-frc" aria-hidden="true"></i>';
/* алтарь душ за вкладкой и окном: рисунок или CSS — зеркало светом, колонны, свет снизу */
const rlScene = cls => rlArt(RL_ART.altar) ? `<img class="rl-scn ${cls}" src="${AV(RL_ART.altar)}" alt="" decoding="async">` : `<i class="rl-scn ${cls} css" aria-hidden="true"></i>`;
/* огоньки душ поднимаются к зеркалу: места и задержки — от номера, без случайности */
const rlMotes = n => `<span class="rl-mo" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="--x:${(i * 41 + 7) % 100}%;--d:${(i * 577) % 4800}ms;--s:${4600 + (i * 353) % 2400}ms"></i>`).join('')}</span>`;
/* честная строка (§1.2): цена прокрутки и шанс героя целиком — у входа и в окне; все шансы — лист «Шансы» */
const rlPriceTxt = () => `<span class="rl-hp">Прокрутка — ${money('enerium', RL_DATA.price)}</span>`;
const rlChanceTxt = () => `<span class="rl-hp">герой целиком — <b class="num">${rlPct(RL_DATA.fullBp)}</b></span>`;
const rlHonest = () => rlPriceTxt() + rlChanceTxt();
/* гарантия: через сколько прокруток и чей герой; «Выбрать» — лист героев пула. Не найденный герой — «неизвестная душа»: лица не видно */
function rlPityTxt() {
  const pool = rsPool(); if (!pool.length) return '';
  const h = rlPityHero(pool), left = rlPityLeft(), P = RL_DATA.pity;
  const who = !h ? '' : typeof hrStage === 'function' && !hrStage(h) ? 'неизвестная душа' : h.n;
  const when = left === 1 ? 'следующая прокрутка' : `через ${left} ${plural(left, 'прокрутку', 'прокрутки', 'прокруток')}`;
  return `<span class="rl-pity">${ic('star')}Гарантия — ${when}: ${who ? `<b>${who}</b> ` : ''}<b class="num">×${P.q}</b><button class="link" data-a="sheet" data-v="rlpick">Выбрать</button></span>`;
}
/* гарантия у входа — коротко, под циклом: веер героев закрыл бы длинную строку; полная строка и выбор героя — в окне и в листе «Гарантия» */
const rlPityShort = () => { const l = rlPityLeft(), P = RL_DATA.pity; return `<small class="rl-eg" title="Гарантия: каждая ${P.every}-я прокрутка — ×${P.q} осколков выбранного героя">${ic('star')}${l === 1 ? 'гарантия — следующая' : `гарантия через ${l}`}</small>`; };
/* потолок доблести героев пула — по циклу (RS.srcInfo.roulette.maxByC, ADR-0030, п. 5а): «доблесть до 2» или «доблесть 3–4» */
function rlValor(c) {
  const I = RS.srcInfo && RS.srcInfo.roulette; if (!I) return '';
  const M = (I.maxByC && I.maxByC[c]) || I.maxV; if (!M) return '';
  return M[0] === M[1] ? `доблесть до ${M[0]}` : `доблесть ${M[0]}–${M[1]}`;
}
/* осколок героя — стекло с лицом (shardGhost, screens/art-icons.js); got — собрано: в ленте осколок свежий, с трещинами */
const rlShard = (h, px, got = 0) => typeof shardGhost === 'function' ? shardGhost(h, got, rlNeed(), px) : rsFace(h);
/* вход в сцене алтаря — одна главная вещь вкладки (правила воздуха): имя, цикл и доблесть героев пула; герои пула — веером книг
   перед зеркалом (hbCard, screens/book.js), отметка — в коллекции или осколков хватает на пробуждение; прошлая прокрутка, цена и шанс
   героя целиком, «К рулетке» и «Шансы». Книга открывает героя — летит в центр и раскрывается. Не найденный герой пула (стадии
   знакомства, решение автора 30.09.2026) — закрытая книга своей ступени с «?» (слово автора того же дня: «это всё-таки тоже книга,
   только со знаком вопроса»): пул честно виден числом, герой — нет. Веер — от середины: --d — шаг
   от середины (вдвое, чтобы целый), --a — его модуль */
function rlMark(h) {
  if (rsHas(h)) return `<i class="rl-em own" title="В коллекции">${ic('check')}</i>`;
  return (S.rs.shards[h.id] || 0) >= rlNeed() ? '<i class="rl-em ready" title="Осколков хватает на пробуждение"></i>' : '';
}
function rlCol() {
  const cur = rsCyc(), from = rsFrom('roulette'), V = rlValor(cur);
  const head = `<div class="rl-eh"><span class="eyebrow">Возрождение душ</span><h2>Рулетка</h2><small>цикл ${ROMAN[cur]}${V ? ' · ' + V : ''}</small>${cur >= from && rsPool().length ? rlPityShort() : ''}</div>`;
  if (cur < from) return `<div class="pnl rl-entry shut">${head}<div class="rl-ef-f"><p class="rs-line">${ic('lock')}Откроется с цикла ${ROMAN[from]}.</p></div></div>`;
  const pool = rsPool(), n = pool.length, R = S.rl.srv.ops[S.rl.last], F = RL_VIEW.fan;
  const faces = pool.map((h, i) => {
    const d = 2 * i - (n - 1), a = Math.abs(d), st = typeof hrStage === 'function' ? hrStage(h) : 2;
    const book = st && typeof hbCard === 'function' ? hbCard(hcView(h), { z: 's', act: 'rhero', val: h.id, bm: false })
      : typeof hbBlank === 'function' ? hbBlank({ z: 's', t: h.maxV, say: 'Неизвестная душа: её осколок — в Возрождении душ' }) : '';
    return `<span class="rl-ef" style="--d:${d};--a:${a};--z:${2 * n - a}">${book}${st ? rlMark(h) : ''}</span>`;
  }).join('');
  return `<div class="pnl rl-entry" style="${rlFrVars()};--fd:${F.deg / 2}deg;--fl:${F.lift / 2}px">${head}
    <div class="rl-faces" style="--n:${Math.max(2, n)}">${faces || '<p class="faint">В пуле этого цикла героев нет.</p>'}</div>
    <div class="rl-ef-f">${R ? `<p class="rl-last">${rlSay(R, R.n === 1 ? 'Прошлая прокрутка' : 'Прошлая')}</p>` : ''}
      <p class="rl-hon">${rlHonest()}<button class="link" data-a="sheet" data-v="rlodds">Шансы ${ic('chev')}</button></p>
      <button class="btn go big rl-cta" data-a="dlg" data-v="rl"${n ? '' : ' disabled'}>К рулетке</button></div>
  </div>`;
}
/* карточка ленты: полный герой — лицо во всю карточку в раме и «Герой»; осколки — стекло с лицом героя и «×N».
   Кристалл редкости рисует CSS из [data-r]: картинки не догружаются посреди прокрутки */
function rlCard(x, cls) {
  const h = RSI[x.id]; if (!h) return '<span class="rl-card"></span>';
  return x.full
    ? `<span class="rl-card full${cls}" data-r="${h.r}" title="${h.n} · герой"><span class="rl-face">${rsFace(h)}</span>${rlFr()}<i class="rl-cr"></i><i class="rl-lbl">Герой</i></span>`
    : `<span class="rl-card shard${x.pity ? ' pity' : ''}${cls}" data-r="${h.r}" title="${h.n} · осколки ×${x.q}${x.pity ? ' · гарантия' : ''}"><i class="rl-cr"></i><span class="rl-sf">${rlShard(h, RL_VIEW.shard)}</span><b class="rl-q">×${x.q}</b>${x.pity ? '<i class="rl-lbl">Гарантия</i>' : ''}</span>`;
}
/* лента сквозь зеркало: окно ленты — стекло над светом зеркала, метка — золото */
function rlStage(F) {
  const done = !!F.op && (S.rl.anim !== F.op || !!(rlAnim && rlAnim.landed));   // лента стоит на выпавшей карточке
  const cards = F.cards.map((x, i) => rlCard(x, i !== F.T ? '' : done ? ' won' : F.op ? '' : ' on')).join('');
  return `<div class="rl-stage" aria-hidden="true"><i class="rl-halo"></i><div class="rl-win" id="rlWin"><div class="rl-track" id="rlTrack">${cards}</div></div><i class="rl-mark${done ? ' hit' : ''}" id="rlMark"></i></div>`;
}
/* цена и шанс героя целиком, три кнопки прокрутки и галочка; нехватка — кнопка неактивна, причина — строкой под кнопками.
   «Шансы» — лист; пока лента крутится, ссылки нет: окно не уходит с ленты */
function rlCtl(spin) {
  const D = RL_DATA, bal = S.wallet.enerium, op = rlNext(), red = rlReduced(), lack = D.counts.find(n => bal < rlCost(n));
  const btn = (n, i) => { const c = rlCost(n), no = bal < c; return `<button class="btn${i ? '' : ' go'}" data-a="rlspin" data-v="${n}:${op}"${no || spin ? ' disabled' : ''}${no ? ` title="Не хватает Энериума: нужно ${fmt(c)}, есть ${fmt(bal)}"` : ''}>${i ? '×' + n : 'Крутить'}${costTag('enerium', c)}</button>`; };
  const why = spin || !lack ? '' : `Не хватает Энериума на ${lack === D.counts[0] ? 'прокрутку' : '×' + lack}: нужно ${fmt(rlCost(lack))}, есть ${fmt(bal)}`;
  const team = TM(`<span>Шансы — демонстрация: полный чертёж ${rlPct(D.fullBp)}, иначе осколки ${D.shards.map(([q, w]) => `×${q} — ${rlPct(rlShare(w))}`).join(', ')}; герой — поровну из пула цикла. Итог решает сервер, сид — заглушка.</span>
    <button class="link" data-a="rlgive">Демо: +${fmt(D.demo.give)} Энериума</button><button class="link" data-a="rlfull" aria-pressed="${!!S.rl.demoFull}">Демо: полный чертёж следующим${S.rl.demoFull ? ' · включено' : ''}</button>`, 'div', 'rl-team');
  return `<div class="rl-ctl"><div class="rl-go">
      <p class="rl-price">${rlPriceTxt()}<span class="faint">· есть ${fmt(bal)}</span>${rlChanceTxt()}${spin ? '' : `<button class="link" data-a="sheet" data-v="rlodds">Шансы ${ic('chev')}</button>`}</p>
      ${spin ? '' : `<p class="rl-pl">${rlPityTxt()}</p>`}
      <div class="rl-btns">${D.counts.map(btn).join('')}</div>
      ${why ? `<p class="reason warn">${why}</p>` : ''}</div>
    <label class="rl-skip"${red ? ' title="В системе включено «меньше движения»"' : ''}><input type="checkbox" data-a="rlskip"${rlSkipOn() ? ' checked' : ''}${red ? ' disabled' : ''}><span>Пропустить анимацию</span></label>
  </div>${team}`;
}
/* пробуждение из итога: чертёж или собранный комплект — тем же «Пробудить», что в лавке праха */
function rlWake(h) {
  if (rsHas(h)) return `<span class="chip gold">${ic('check')}в коллекции</span>`;
  if ((S.rs.shards[h.id] || 0) < rlNeed()) return '';
  return `<button class="btn sm go" data-a="activate" data-v="${h.id}">Пробудить${costTag('souls', RS.rules.stub.activateSouls)}</button>`;
}
/* итог крупно: полный герой — в раме; осколки — стекло с лицом и долей собранного; герой из коллекции — лицо, осколки ушли в прах */
const rlBig = (h, full, q, k) => full
  ? `<span class="rl-big full" data-r="${h.r}"><span class="rl-face">${rsFace(h)}</span>${rlFr()}<i class="rl-lbl">Герой</i>${k > 1 ? `<b class="rl-k">×${k}</b>` : ''}</span>`
  : rsHas(h) ? `<span class="rl-big dust" data-r="${h.r}"><span class="rl-face">${rsFace(h)}</span><b class="rl-q">×${q}</b></span>`
    : `<span class="rl-big shard" data-r="${h.r}">${rlShard(h, RL_VIEW.big, S.rs.shards[h.id] || 0)}<b class="rl-q">×${q}</b></span>`;
function rlOne(g) {
  const h = RSI[g.id], need = rlNeed(), n = S.rs.shards[g.id] || 0, own = rsHas(h);
  const line = g.dust ? `Уже в коллекции: ${g.full ? 'чертёж' : 'осколки ×' + g.q} → прах ${money('dust', g.dust)}`
    : g.full ? (own ? 'Герой уже пробуждён.' : 'Герой целиком — пробудите его душами.')
      : !own && n >= need ? `Осколков ${fmt(n)} — можно пробудить` : `Собрано осколков ${fmt(n)} / ${fmt(need)}`;
  return `<div class="rl-one">${rlBig(h, g.full, g.q)}<div class="rl-one-tx"><span class="eyebrow">${g.pity ? 'Гарантия · осколки героя' : g.full ? 'Полный чертёж' : 'Осколки героя'}</span><b class="rl-nm">${h.n}</b>${rar(h.r)}<p class="rl-line">${line}</p>${g.dust ? '' : rlWake(h)}</div></div>`;
}
/* сводка ×10 и ×100: полные чертежи — первыми и крупно, осколки — по героям с суммой и стеклом с долей собранного, прах — с тем,
   что в него ушло */
function rlMany(R) {
  const G = rlGroups(R), need = rlNeed(), bp = G.full.reduce((a, x) => a + x.bp, 0), q = G.shards.reduce((a, x) => a + x.q, 0);
  const fulls = G.full.length ? `<span class="eyebrow">Полные чертежи · ${fmt(bp)}</span><div class="rl-fulls">${G.full.map((x, i) => { const h = RSI[x.id];
    return `<div class="rl-fc" style="--i:${i}">${rlBig(h, true, 0, x.bp)}<b class="rl-nm">${h.n}</b>${rar(h.r)}${x.dust ? `<small class="rl-line">в прах ${money('dust', x.dust)}</small>` : rlWake(h)}</div>`; }).join('')}</div>` : '';
  const shards = G.shards.length ? `<span class="eyebrow">Осколки · ${fmt(q)}</span><div class="rl-grp">${G.shards.map(x => { const h = RSI[x.id], n = S.rs.shards[x.id] || 0;
    return `<div class="rl-gr" data-r="${h.r}"><span class="rl-gs">${rlShard(h, 34, n)}</span><span class="tx"><b>${h.n}</b><small>${n >= need ? `готов к пробуждению · ${fmt(n)}` : `собрано ${fmt(n)} / ${fmt(need)}`}${x.pity ? ` · гарантия${x.pity > 1 ? ' ×' + x.pity : ''}` : ''}</small></span><b class="rl-plus">+${fmt(x.q)}</b></div>`; }).join('')}</div>` : '';
  const dust = R.dust ? `<span class="eyebrow">В прах</span><p class="rl-dust">${money('dust', R.dust)}<span>${G.dust.map(x => `${RSI[x.id].n}: ${[x.bp ? 'чертёж' + (x.bp > 1 ? ' ×' + x.bp : '') : '', x.q ? 'осколки ×' + fmt(x.q) : ''].filter(Boolean).join(', ')}`).join(' · ')}</span></p>` : '';
  return fulls + shards + dust;
}
/* окно итога поверх рулетки: «Ещё раз», «×10», «×100» и «Закрыть» */
function rlRes(R) {
  const one = R.n === 1, still = rlWas.res === R.op ? ' still' : '', bal = S.wallet.enerium, op = rlNext(), t = one ? 'Итог прокрутки' : `Итог · ×${R.n}`;
  const btn = (n, i) => { const c = rlCost(n), no = bal < c; return `<button class="btn sm${i ? '' : ' go'}" data-a="rlspin" data-v="${n}:${op}"${no ? ` disabled title="Не хватает Энериума: нужно ${fmt(c)}, есть ${fmt(bal)}"` : ''}>${i ? '×' + n : 'Ещё раз'}${costTag('enerium', c)}</button>`; };
  return `<button class="rl-scrim2${still}" data-a="rlhide" aria-label="Закрыть итог" tabindex="-1"></button>
    <section class="rl-res${one ? '' : ' wide'}${still}" role="dialog" aria-label="${t}" style="${rlFrVars()}">
      <div class="rl-res-h"><h3>${t}</h3>${one ? '' : `<span class="rl-spent">Потрачено ${money('enerium', R.cost)}</span>`}</div>
      <div class="rl-res-b scroll">${one ? rlOne(R.list[0]) : rlMany(R)}</div>
      <div class="rl-res-f">${RL_DATA.counts.map(btn).join('')}<button class="btn sm ghost rl-close" data-a="rlhide">Закрыть</button></div>
    </section>`;
}

/* ================== листы ================== */
Object.assign(OV, {
  /* окно рулетки (правила воздуха): алтарь душ за окном, лента сквозь зеркало, цена и шанс героя целиком, три кнопки прокрутки
     и галочка; итог — окном поверх. Пока лента крутится, фон окно не закрывает: закрыть можно крестиком, итог тогда придёт сообщением */
  rl() {
    const cur = rsCyc(), from = rsFrom('roulette'), F = rlFilm(), spin = !!S.rl.anim, R = S.rl.show ? S.rl.srv.ops[S.rl.show] : null;
    const body = F ? rlStage(F) + rlCtl(spin) : `<p class="rs-line">${ic('lock')}${cur < from ? `Возрождение душ откроется с цикла ${ROMAN[from]}.` : 'В пуле этого цикла героев нет.'}</p>`;
    return `<div class="ov rl-ov${rlWas.ov ? ' still' : ''}" role="dialog" aria-modal="true" aria-label="Возрождение душ">${spin ? '<div class="ov-scrim"></div>' : '<button class="ov-scrim" data-a="close" aria-label="Закрыть" tabindex="-1"></button>'}
      <div class="dlg rl-dlg${rlArt(RL_ART.altar) ? ' art' : ''}" style="${rlFrVars()}">${rlScene('rl-dscn')}${rlMotes(RL_VIEW.motes)}
        <div class="dlg-h"><div class="rl-hd"><span class="eyebrow">Возрождение душ</span><h2>Рулетка · цикл ${ROMAN[cur]}</h2></div><button class="iconbtn x" data-a="close" aria-label="Закрыть">${ic('x')}</button></div>
        <div class="dlg-b rl-b">${body}</div></div>
      ${R ? rlRes(R) : ''}</div>`;
  },
  /* шансы одной прокрутки — подробности в листе по нажатию; герои пула — лицами; пометка «демонстрация» — только команде */
  rlodds() {
    const D = RL_DATA, pool = rsPool();
    const odds = `<span class="eyebrow">Одна прокрутка · ${money('enerium', D.price)}</span><dl class="kv rl-kv"><dt>Полный чертёж — герой целиком</dt><dd>${rlPct(D.fullBp)}</dd></dl>
      <span class="eyebrow">Иначе — осколки</span><dl class="kv rl-kv">${D.shards.map(([q, w]) => `<dt>×${q}</dt><dd>${rlPct(rlShare(w))}</dd>`).join('')}</dl>
      <span class="eyebrow">Гарантия</span><p class="rl-p">Каждая ${D.pity.every}-я прокрутка — ×${D.pity.q} осколков героя, которого вы выбрали. Следующая — ${rlPityLeft() === 1 ? 'на ближайшей прокрутке' : `через ${rlPityLeft()} ${plural(rlPityLeft(), 'прокрутку', 'прокрутки', 'прокруток')}`}.</p>`;
    const who = pool.length ? `<span class="eyebrow">Герои цикла ${ROMAN[rsCyc()]}</span><p class="rl-p">Герой — любой из ${pool.length}, поровну.</p><div class="rl-oface">${pool.map(h => `<span class="rs-av" data-r="${h.r}" title="${h.n}">${rsFace(h)}</span>`).join('')}</div>` : '';
    const body = `${odds}${who}<p class="reason">Полный чертёж — герой целиком: его пробуждают души. Осколки и чертёж героя, который уже в коллекции, уходят в прах.</p>
      ${TM(`Шансы — демонстрация, не баланс: таблиц вероятностей в §15.1 ещё нет, числа — RL_DATA. Герой — поровну из пула цикла — толкование прототипа. Чертёж ложится комплектом из ${fmt(rlNeed())} осколков (заглушка roster.js): пробуждение и прах по §15.2 сходятся.`, 'p', 'reason')}`;
    return sheet('Шансы', body, pool.length ? '<button class="btn go" data-a="dlg" data-v="rl">К рулетке</button>' : '');
  },
  /* герой гарантии: герои пула цикла; в коллекции и уже собранные — неактивны с причиной; не найденный — «Неизвестная душа» без лица */
  rlpick() {
    const pool = rsPool(), cur = rlPityHero(pool), need = rlNeed(), P = RL_DATA.pity;
    const rows = pool.map(h => {
      const st = typeof hrStage === 'function' ? hrStage(h) : 2, n = S.rs.shards[h.id] || 0, own = rsHas(h), done = !own && n >= need, on = !!cur && cur.id === h.id;
      const why = own ? 'в коллекции' : done ? 'осколков хватает — пробудите' : `собрано ${fmt(n)} / ${fmt(need)}`;
      return `<button class="rl-pk${on ? ' on' : ''}" data-r="${h.r}" data-a="rlpick" data-v="${h.id}"${own || done ? ' disabled' : ''} aria-pressed="${on}"><span class="rs-av">${st ? rsFace(h) : '<i class="rl-pk-q">?</i>'}</span><span class="tx"><b>${st ? h.n : 'Неизвестная душа'}</b><small>${why}</small></span>${on ? ic('check') : ''}</button>`;
    }).join('');
    const body = `<p class="rl-p">Каждая ${P.every}-я прокрутка — ×${P.q} осколков героя, которого вы выберете. Не выбрали или он уже собран — гарантия уйдёт тому, у кого осколков больше.</p>
      <div class="rl-pks">${rows || '<p class="faint">В пуле этого цикла героев нет.</p>'}</div>`;
    return sheet('Гарантия', body, '<button class="btn go" data-a="dlg" data-v="rl">К рулетке</button>');
  },
});

/* ================== действия ================== */
Object.assign(ACT, {
  /* прокрутка: v — «число:номер операции». Номер несут кнопки: повтор нажатия с тем же номером операцию не повторит */
  rlspin(v) {
    const [a, op] = String(v).split(':'), n = +a;
    if (rlAnim && !rlAnim.landed) return;   // лента ещё крутится
    const r = RL_SRV.spin(op, n);
    if (r.again) return;                    // повтор: ни расхода, ни выдачи
    if (r.refuse) { toast(rlRefuse(r)); return; }
    S.rl.seq++; S.rl.last = op; S.rl.show = '';
    S.rl.film = rlFilmOf(r.res, rlFilm());
    S.overlay = { t: 'rl', arg: '' };
    if (rlSkipOn()) { S.rl.anim = ''; S.rl.show = op; render(); rlFocusRes(); return; }
    rlStart(r.res); render();
  },
  rlhide() { S.rl.show = ''; render(); },
  /* выбор героя гарантии — настройка «сервера»: повтор того же выбора ничего не меняет */
  rlpick(v) {
    const r = RL_SRV.choose(String(v));
    if (r.refuse) { toast(r.refuse === 'own' ? 'Этот герой уже в коллекции' : 'Этого героя нет в пуле цикла'); return; }
    const h = RSI[v], st = typeof hrStage === 'function' ? hrStage(h) : 2;
    toast(`Гарантия — ${st ? h.n : 'неизвестная душа'}`); render();
  },
  /* «Пропустить анимацию»: выбор помнит localStorage; галочка посреди ленты — итог сразу */
  rlskip(v, t) {
    S.rl.skip = !!(t && t.checked);
    try { localStorage.setItem(RL_KEY, S.rl.skip ? '1' : '0'); } catch (_) { }
    if (S.rl.skip && S.rl.anim) { rlReveal(S.rl.anim); return; }
    render();
  },
  /* демо команды */
  rlgive() { S.wallet.enerium += RL_DATA.demo.give; toast(`Демо: +${fmt(RL_DATA.demo.give)} Энериума`); },
  rlfull() { S.rl.demoFull = !S.rl.demoFull; toast(S.rl.demoFull ? 'Демо: следующая прокрутка — полный чертёж' : 'Демо: шансы как обычно'); },
});

/* ================== сценарий презентации ================== */
FLOWS.push(
  ['Возрождение душ · рулетка', 'Лента полных героев и осколков, остановка на выпавшей карточке, частицы и итог; ×10 и ×100 — сводка. «Пропустить анимацию» — сразу итог. Энериума в сценарии — на все три кнопки',
    () => {
      S.route = 'heroes'; S.seg.heroes = 'hire'; S.seg.hire = 'souls';
      if (rsCyc() < rsFrom('roulette')) S.rs.cyc = rsFrom('roulette');
      S.wallet.enerium = Math.max(S.wallet.enerium, RL_DATA.counts.reduce((a, n) => a + rlCost(n), 0));
      S.rl.show = ''; S.overlay = { t: 'rl', arg: '' };
    }],
);

/* ================== состояние ==================
   S.rl: srv — «сервер» (ответы по номерам операций, pity — прокруток с прошлой гарантии, pick — выбранный герой гарантии); seq — номер следующей операции; last — последняя операция; anim — чья лента
   крутится; show — чей итог открыт; film — лента на экране; skip — «Пропустить анимацию» из localStorage; demoFull — демо команды */
function rlState(s) {
  s.rl = { srv: { ops: {}, pity: 0, pick: '' }, seq: 1, last: '', anim: '', show: '', film: null, skip: rlSaved(), demoFull: false };
  return s;
}
const rlInitBase = initialState;
initialState = function () { return rlState(rlInitBase()); };
rlState(S);

/* ================== UI-кит ==================
   Раздел «Возрождение душ · рулетка»: вход в сцене алтаря, карточки ленты на героях цикла II, шансы и числа вида — из RL_DATA и RL_VIEW,
   арт — RL_ART: что выгружено */
KIT_EXTRA.push({
  html: () => {
    const pool = RS.heroes.filter(h => h.src === 'roulette' && h.c === 2);
    if (pool.length < 4) return '';
    const cards = [[0, 5], [1, 15], [2, 0], [3, 25]].map(([i, q]) => rlCard(q ? { id: pool[i].id, q } : { id: pool[i].id, full: true }, '')).join('');
    const odds = RL_DATA.shards.map(([q, w]) => `×${q} — ${rlPct(rlShare(w))}`).join(', ');
    const got = RL_ART.want.filter(rlArt).length;
    return `<section class="k-box" style="grid-column:1/-1"><h3>Возрождение душ · рулетка</h3>
      <div class="k-demo row rl-kit" style="${rlFrVars()}">${cards}</div>
      <p class="k-note">${TM('Слова автора: «рулетка — это тоже для людей, которые донатят… дорого-богато». ')}Дорого — свет, материал и крупные формы: за вкладкой «За души» и за окном — алтарь душ, зеркало, из стекла выходят контуры героев. Герои пула — веером карточек в раме старого золота перед зеркалом (RL_VIEW.fan), лента в окне идёт сквозь зеркало. Полный герой — лицо в раме и «Герой»; осколки — стекло с лицом героя и «×N» (shardGhost). Кристалл — редкость героя.</p>
      <p class="k-note">Честно (§1.2): у входа и в окне — цена прокрутки и шанс героя целиком, все шансы — лист «Шансы». Итог решает «сервер» на сиде до анимации: лента разгоняется и ${RL_VIEW.ms[0] / 1000}–${RL_VIEW.ms[1] / 1000} с тормозит ровно на выпавшей карточке. Частицы — цвета редкости; у полного героя золотая вспышка, три кольца и дрожь. ×10 и ×100 — короткая лента на самом ценном итоге, затем сводка: полные герои первыми, осколки по героям — стеклом с долей собранного, прах, расход. «Пропустить анимацию» запоминается; при системном «меньше движения» анимации нет.</p>
      <p class="k-note">Шансы — демонстрация: полный чертёж ${rlPct(RL_DATA.fullBp)}, иначе осколки ${odds}. Золотые карточки ленты — оформление, а не шанс. Арт — <code>tools/art-gen/jobs/souls-altar.json</code>: алтарь и рама, выгружено ${got} из ${RL_ART.want.length} (<code>RL_ART.ready</code>); пока пути нет, алтарь и раму рисует CSS. Окно — сценарий «Возрождение душ · рулетка».</p></section>`;
  },
});
