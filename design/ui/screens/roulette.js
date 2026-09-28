/* screens/roulette.js — «Герои → Призыв → За души»: рулетка Возрождения душ (§15 GDD, ADR-0019). Договор — screens/model.js.
   Регистрирует: rlCol — колонку рулетки во вкладке «За души» (её зовёт rsSoulsView в index.html); OV.rl — окно рулетки с лентой
   и итогом поверх, OV.rlodds — лист «Шансы»; действия ACT.rl*; сценарий презентации. Своё состояние — S.rl, заводится как S.bag.
   Правила §15: пул прокрутки привязан к циклу — герои рулетки текущего цикла (rsPool; у них доблесть 2–3, ADR-0019). Выпадают осколки
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
const RL_SRV = {
  seed: (op, k) => EnLoot.seedOf(`возрождение|${op}|${k}`),   // заглушка серверного сида: от номера операции
  /* операция: проверка, расход и выдача — одним вызовом. Ответ: { res } — итог; { again, res } — повтор, ничего не меняет;
     { refuse } — отказ без расхода. Выдача: осколки — S.rs.shards, герой из коллекции — прах в кошелёк (§15.2) */
  spin(op, n) {
    const V = S.rl.srv;
    if (V.ops[op]) return { again: true, res: V.ops[op] };
    if (!RL_DATA.counts.includes(n)) return { refuse: 'count' };
    const pool = rsPool(), cost = rlCost(n);
    if (!pool.length) return { refuse: 'pool' };
    if (S.wallet.enerium < cost) return { refuse: 'enerium', cost };
    let k = 0;   // демо команды: перебрать сиды, пока первая прокрутка не даст полный чертёж
    if (S.rl.demoFull) { while (k < RL_DATA.demo.search && !rlRoll(pool, RL_SRV.seed(op, k), 1)[0].full) k++; S.rl.demoFull = false; }
    const seed = RL_SRV.seed(op, k), res = { op, n, c: rsCyc(), cost, seed, list: [], dust: 0 };
    S.wallet.enerium -= cost;
    for (const x of rlRoll(pool, seed, n)) {
      const h = RSI[x.id], g = { id: x.id, full: x.full, q: x.q, dust: 0 };
      if (rsHas(h)) { g.dust = x.q * rsDustOf(h); res.dust += g.dust; }     // герой уже в коллекции — осколки и чертёж в прах
      else S.rs.shards[x.id] = (S.rs.shards[x.id] || 0) + x.q;            // до пробуждения копятся; остаток — в прах при пробуждении
      res.list.push(g);
    }
    S.wallet.dust += res.dust;
    V.ops[op] = res;
    return { res };
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
  const add = (m, g) => { const x = m.get(g.id) || { id: g.id, bp: 0, q: 0, dust: 0 }; if (g.full) x.bp++; else x.q += g.q; x.dust += g.dust; m.set(g.id, x); };
  for (const g of R.list) { if (g.full) add(full, g); if (g.dust) add(dust, g); else if (!g.full) add(shards, g); }
  const by = (a, b) => RSI[b.id].r - RSI[a.id].r || b.bp - a.bp || b.q - a.q || RSI[a.id].n.localeCompare(RSI[b.id].n, 'ru');
  return { full: [...full.values()].sort(by), shards: [...shards.values()].sort(by), dust: [...dust.values()].sort(by) };
}
/* одна строка об итоге: в колонке — «прошлая прокрутка», во всплывающем сообщении — когда окно закрыли посреди ленты */
function rlSay(R, lead) {
  if (R.n === 1) { const g = R.list[0], h = RSI[g.id]; return `${lead}: <b>${h.n}</b> · ${g.full ? 'полный чертёж' : 'осколки ×' + g.q}${g.dust ? ' → прах' : ''}`; }
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
  cards.push({ id: best.id, full: best.full, q: best.q });
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
/* колонка рулетки во вкладке «За души»: пул цикла с осколками, прошлая прокрутка, «Шансы» и одно действие — «К рулетке» */
function rlTag(h) {
  if (rsHas(h)) return `<span class="chip gold">${ic('check')}есть</span>`;
  const n = S.rs.shards[h.id] || 0, need = rlNeed();
  return n >= need ? '<span class="chip spirit">готов</span>' : `<span class="faint num">${fmt(n)}/${fmt(need)}</span>`;
}
function rlCol() {
  const cur = rsCyc(), from = rsFrom('roulette'), I = RS.srcInfo.roulette;
  const head = `<div class="rs-colh"><span class="eyebrow">Возрождение душ</span><b>Рулетка · цикл ${ROMAN[cur]}</b><small class="faint">${I ? `доблесть ${I.maxV[0]}–${I.maxV[1]} · ` : ''}осколки или полный чертёж</small></div>`;
  if (cur < from) return `<div class="pnl rs-col">${head}<p class="rs-line">${ic('lock')}Откроется с цикла ${ROMAN[from]}.</p></div>`;
  const pool = rsPool(), R = S.rl.srv.ops[S.rl.last];
  const rows = pool.map(h => rsRow(h, { act: 'ssel', sel: S.rs.ssel === h.id, sub: rsSub(h, `${RAR[h.r]} · доблесть до ${h.maxV}`), right: rlTag(h) })).join('') || '<p class="faint">В пуле этого цикла героев нет.</p>';
  return `<div class="pnl rs-col">${head}
    <div class="rs-list scroll grow" data-keep="roul:${cur}">${rows}</div>
    <div class="rs-colf">${R ? `<p class="reason">${rlSay(R, R.n === 1 ? 'Прошлая прокрутка' : 'Прошлая')}</p>` : ''}<div class="row rl-cf"><button class="link" data-a="sheet" data-v="rlodds">Шансы ${ic('chev')}</button><span class="g-spacer"></span><button class="btn go sm" data-a="dlg" data-v="rl"${pool.length ? '' : ' disabled'}>К рулетке</button></div></div>
  </div>`;
}
/* карточка ленты: полный герой — лицо во всю карточку, золотая рамка и «Герой»; осколки — лицо поменьше и «×N».
   Кристалл редкости рисует CSS из [data-r]: картинки не догружаются посреди прокрутки */
function rlCard(x, cls) {
  const h = RSI[x.id]; if (!h) return '<span class="rl-card"></span>';
  return x.full
    ? `<span class="rl-card full${cls}" data-r="${h.r}" title="${h.n} · герой"><span class="rl-face">${rsFace(h)}</span><i class="rl-cr"></i><i class="rl-lbl">Герой</i></span>`
    : `<span class="rl-card shard${cls}" data-r="${h.r}" title="${h.n} · осколки ×${x.q}"><i class="rl-cr"></i><span class="rl-sf">${rsFace(h)}</span><b class="rl-q">×${x.q}</b></span>`;
}
function rlStage(F) {
  const done = !!F.op && (S.rl.anim !== F.op || !!(rlAnim && rlAnim.landed));   // лента стоит на выпавшей карточке
  const cards = F.cards.map((x, i) => rlCard(x, i !== F.T ? '' : done ? ' won' : F.op ? '' : ' on')).join('');
  return `<div class="rl-stage" aria-hidden="true"><div class="rl-win" id="rlWin"><div class="rl-track" id="rlTrack">${cards}</div></div><i class="rl-mark${done ? ' hit' : ''}" id="rlMark"></i></div>`;
}
/* цена, три кнопки прокрутки и галочка; нехватка — кнопка неактивна, причина — строкой под кнопками */
function rlCtl(spin) {
  const D = RL_DATA, bal = S.wallet.enerium, op = rlNext(), red = rlReduced(), lack = D.counts.find(n => bal < rlCost(n));
  const btn = (n, i) => { const c = rlCost(n), no = bal < c; return `<button class="btn${i ? '' : ' go'}" data-a="rlspin" data-v="${n}:${op}"${no || spin ? ' disabled' : ''}${no ? ` title="Не хватает Энериума: нужно ${fmt(c)}, есть ${fmt(bal)}"` : ''}>${i ? '×' + n : 'Крутить'}${costTag('enerium', c)}</button>`; };
  const why = spin || !lack ? '' : `Не хватает Энериума на ${lack === D.counts[0] ? 'прокрутку' : '×' + lack}: нужно ${fmt(rlCost(lack))}, есть ${fmt(bal)}`;
  const team = TM(`<span>Шансы — демонстрация: полный чертёж ${rlPct(D.fullBp)}, иначе осколки ${D.shards.map(([q, w]) => `×${q} — ${rlPct(rlShare(w))}`).join(', ')}; герой — поровну из пула цикла. Итог решает сервер, сид — заглушка.</span>
    <button class="link" data-a="rlgive">Демо: +${fmt(D.demo.give)} Энериума</button><button class="link" data-a="rlfull" aria-pressed="${!!S.rl.demoFull}">Демо: полный чертёж следующим${S.rl.demoFull ? ' · включено' : ''}</button>`, 'div', 'rl-team');
  return `<div class="rl-ctl"><div class="rl-go">
      <p class="rl-price">Прокрутка — ${money('enerium', D.price)}<span class="faint">· есть ${fmt(bal)}</span></p>
      <div class="rl-btns">${D.counts.map(btn).join('')}</div>
      ${why ? `<p class="reason warn">${why}</p>` : ''}</div>
    <label class="rl-skip"${red ? ' title="В системе включено «меньше движения»"' : ''}><input type="checkbox" data-a="rlskip"${rlSkipOn() ? ' checked' : ''}${red ? ' disabled' : ''}><span>Пропустить анимацию</span></label>
  </div>${team}`;
}
/* пробуждение из итога: чертёж или собранный комплект — тем же «Пробудить», что в каталоге праха */
function rlWake(h) {
  if (rsHas(h)) return `<span class="chip gold">${ic('check')}в коллекции</span>`;
  if ((S.rs.shards[h.id] || 0) < rlNeed()) return '';
  return `<button class="btn sm go" data-a="activate" data-v="${h.id}">Пробудить${costTag('souls', RS.rules.stub.activateSouls)}</button>`;
}
const rlBig = (h, full, q, k) => `<span class="rl-big${full ? ' full' : ''}" data-r="${h.r}">${rsFace(h)}${full ? '<i class="rl-lbl">Герой</i>' : `<b class="rl-q">×${q}</b>`}${k > 1 ? `<b class="rl-k">×${k}</b>` : ''}</span>`;
function rlOne(g) {
  const h = RSI[g.id], need = rlNeed(), n = S.rs.shards[g.id] || 0, own = rsHas(h);
  const line = g.dust ? `Уже в коллекции: ${g.full ? 'чертёж' : 'осколки ×' + g.q} → прах ${money('dust', g.dust)}`
    : g.full ? (own ? 'Герой уже пробуждён.' : 'Герой целиком — пробудите его душами.')
      : !own && n >= need ? `Осколков ${fmt(n)} — можно пробудить` : `Собрано осколков ${fmt(n)} / ${fmt(need)}`;
  return `<div class="rl-one">${rlBig(h, g.full, g.q)}<div class="rl-one-tx"><span class="eyebrow">${g.full ? 'Полный чертёж' : 'Осколки героя'}</span><b class="rl-nm">${h.n}</b>${rar(h.r)}<p class="rl-line">${line}</p>${g.dust ? '' : rlWake(h)}</div></div>`;
}
/* сводка ×10 и ×100: полные чертежи — первыми и крупно, осколки — по героям с суммой, прах — с тем, что в него ушло */
function rlMany(R) {
  const G = rlGroups(R), need = rlNeed(), bp = G.full.reduce((a, x) => a + x.bp, 0), q = G.shards.reduce((a, x) => a + x.q, 0);
  const fulls = G.full.length ? `<span class="eyebrow">Полные чертежи · ${fmt(bp)}</span><div class="rl-fulls">${G.full.map((x, i) => { const h = RSI[x.id];
    return `<div class="rl-fc" style="--i:${i}">${rlBig(h, true, 0, x.bp)}<b class="rl-nm">${h.n}</b>${rar(h.r)}${x.dust ? `<small class="rl-line">в прах ${money('dust', x.dust)}</small>` : rlWake(h)}</div>`; }).join('')}</div>` : '';
  const shards = G.shards.length ? `<span class="eyebrow">Осколки · ${fmt(q)}</span><div class="rl-grp">${G.shards.map(x => { const h = RSI[x.id], n = S.rs.shards[x.id] || 0;
    return `<div class="rl-gr" data-r="${h.r}"><span class="rs-av">${rsFace(h)}</span><span class="tx"><b>${h.n}</b><small>${n >= need ? `готов к пробуждению · ${fmt(n)}` : `собрано ${fmt(n)} / ${fmt(need)}`}</small></span><b class="rl-plus">+${fmt(x.q)}</b></div>`; }).join('')}</div>` : '';
  const dust = R.dust ? `<span class="eyebrow">В прах</span><p class="rl-dust">${money('dust', R.dust)}<span>${G.dust.map(x => `${RSI[x.id].n}: ${[x.bp ? 'чертёж' + (x.bp > 1 ? ' ×' + x.bp : '') : '', x.q ? 'осколки ×' + fmt(x.q) : ''].filter(Boolean).join(', ')}`).join(' · ')}</span></p>` : '';
  return fulls + shards + dust;
}
/* окно итога поверх рулетки: «Ещё раз», «×10», «×100» и «Закрыть» */
function rlRes(R) {
  const one = R.n === 1, still = rlWas.res === R.op ? ' still' : '', bal = S.wallet.enerium, op = rlNext(), t = one ? 'Итог прокрутки' : `Итог · ×${R.n}`;
  const btn = (n, i) => { const c = rlCost(n), no = bal < c; return `<button class="btn sm${i ? '' : ' go'}" data-a="rlspin" data-v="${n}:${op}"${no ? ` disabled title="Не хватает Энериума: нужно ${fmt(c)}, есть ${fmt(bal)}"` : ''}>${i ? '×' + n : 'Ещё раз'}${costTag('enerium', c)}</button>`; };
  return `<button class="rl-scrim2${still}" data-a="rlhide" aria-label="Закрыть итог" tabindex="-1"></button>
    <section class="rl-res${one ? '' : ' wide'}${still}" role="dialog" aria-label="${t}">
      <div class="rl-res-h"><h3>${t}</h3>${one ? '' : `<span class="rl-spent">Потрачено ${money('enerium', R.cost)}</span>`}</div>
      <div class="rl-res-b scroll">${one ? rlOne(R.list[0]) : rlMany(R)}</div>
      <div class="rl-res-f">${RL_DATA.counts.map(btn).join('')}<button class="btn sm ghost rl-close" data-a="rlhide">Закрыть</button></div>
    </section>`;
}

/* ================== листы ================== */
Object.assign(OV, {
  /* окно рулетки (правила воздуха): лента, цена, три кнопки прокрутки и галочка; итог — окном поверх.
     Пока лента крутится, фон окно не закрывает: закрыть можно крестиком, итог тогда придёт сообщением */
  rl() {
    const cur = rsCyc(), from = rsFrom('roulette'), F = rlFilm(), spin = !!S.rl.anim, R = S.rl.show ? S.rl.srv.ops[S.rl.show] : null;
    const body = F ? rlStage(F) + rlCtl(spin) : `<p class="rs-line">${ic('lock')}${cur < from ? `Возрождение душ откроется с цикла ${ROMAN[from]}.` : 'В пуле этого цикла героев нет.'}</p>`;
    return `<div class="ov rl-ov${rlWas.ov ? ' still' : ''}" role="dialog" aria-modal="true" aria-label="Возрождение душ">${spin ? '<div class="ov-scrim"></div>' : '<button class="ov-scrim" data-a="close" aria-label="Закрыть" tabindex="-1"></button>'}
      <div class="dlg rl-dlg"><div class="dlg-h"><div class="rl-hd"><span class="eyebrow">Возрождение душ</span><h2>Рулетка · цикл ${ROMAN[cur]}</h2></div><button class="iconbtn x" data-a="close" aria-label="Закрыть">${ic('x')}</button></div>
        <div class="dlg-b rl-b">${body}</div></div>
      ${R ? rlRes(R) : ''}</div>`;
  },
  /* шансы одной прокрутки — подробности в листе по нажатию; пометка «демонстрация» — только команде */
  rlodds() {
    const D = RL_DATA, pool = rsPool();
    const odds = `<span class="eyebrow">Одна прокрутка</span><dl class="kv rl-kv"><dt>Полный чертёж</dt><dd>${rlPct(D.fullBp)}</dd></dl>
      <span class="eyebrow">Иначе — осколки</span><dl class="kv rl-kv">${D.shards.map(([q, w]) => `<dt>×${q}</dt><dd>${rlPct(rlShare(w))}</dd>`).join('')}</dl>`;
    const who = pool.length ? `<span class="eyebrow">Герои цикла ${ROMAN[rsCyc()]}</span><p class="rl-p">Герой — любой из ${pool.length}, поровну.</p>` : '';
    const body = `${odds}${who}<p class="reason">Полный чертёж — герой целиком: его пробуждают души. Осколки и чертёж героя, который уже в коллекции, уходят в прах.</p>
      ${TM(`Шансы — демонстрация, не баланс: таблиц вероятностей в §15.1 ещё нет, числа — RL_DATA. Герой — поровну из пула цикла — толкование прототипа. Чертёж ложится комплектом из ${fmt(rlNeed())} осколков (заглушка roster.js): пробуждение и прах по §15.2 сходятся.`, 'p', 'reason')}`;
    return sheet('Шансы', body, pool.length ? '<button class="btn go" data-a="dlg" data-v="rl">К рулетке</button>' : '');
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
   S.rl: srv — «сервер» (ответы по номерам операций); seq — номер следующей операции; last — последняя операция; anim — чья лента
   крутится; show — чей итог открыт; film — лента на экране; skip — «Пропустить анимацию» из localStorage; demoFull — демо команды */
function rlState(s) {
  s.rl = { srv: { ops: {} }, seq: 1, last: '', anim: '', show: '', film: null, skip: rlSaved(), demoFull: false };
  return s;
}
const rlInitBase = initialState;
initialState = function () { return rlState(rlInitBase()); };
rlState(S);

/* ================== UI-кит ==================
   Раздел «Возрождение душ · рулетка»: карточки ленты на героях цикла II, шансы и числа вида — из RL_DATA и RL_VIEW */
KIT_EXTRA.push({
  html: () => {
    const pool = RS.heroes.filter(h => h.src === 'roulette' && h.c === 2);
    if (pool.length < 4) return '';
    const cards = [[0, 5], [1, 15], [2, 0], [3, 25]].map(([i, q]) => rlCard(q ? { id: pool[i].id, q } : { id: pool[i].id, full: true }, '')).join('');
    const odds = RL_DATA.shards.map(([q, w]) => `×${q} — ${rlPct(rlShare(w))}`).join(', ');
    return `<section class="k-box" style="grid-column:1/-1"><h3>Возрождение душ · рулетка</h3>
      <div class="k-demo row" style="gap:8px;justify-content:center;flex-wrap:wrap">${cards}</div>
      <p class="k-note">Лента: полный герой — лицо во всю карточку, золотая рамка и «Герой»; осколки — лицо поменьше и «×N». Кристалл — редкость героя. Итог решает «сервер» на сиде до анимации: лента разгоняется и ${RL_VIEW.ms[0] / 1000}–${RL_VIEW.ms[1] / 1000} с тормозит ровно на выпавшей карточке. Частицы — цвета редкости; у полного героя золотая вспышка, три кольца и дрожь.</p>
      <p class="k-note">×10 и ×100 — короткая лента на самом ценном итоге, затем сводка: полные герои первыми, осколки по героям, прах, расход. «Пропустить анимацию» — маленькое окошко с галочкой, выбор запоминается; при системном «меньше движения» анимации нет. Полный чертёж пробуждают души (§15.1).</p>
      <p class="k-note">Шансы — демонстрация: полный чертёж ${rlPct(RL_DATA.fullBp)}, иначе осколки ${odds}. Золотые карточки ленты — оформление, а не шанс. Окно — сценарий «Возрождение душ · рулетка».</p></section>`;
  },
});
