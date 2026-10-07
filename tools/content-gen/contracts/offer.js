/* Контракты — алгоритм пула заданий и награды, общий для калькулятора и прототипа. Сборщик вставляет этот файл
   в design/ui/contracts.js как есть. Ориентир для серверного ядра на C#, а не код игры: в игре состав пула, замену задания,
   исход и выдачу решает только сервер (GDD §18, §34.1, §36.16).
   Только целые числа. Генератор — mulberry32 на сиде, как в ядре боя и сундуках прототипа.
   Порядок обращений к генератору — часть формата: на каждое задание ровно два броска —
     1) редкость — из суммы весов редкостей (10 000);
     2) вид задания — из суммы весов видов, доступных на этой редкости.
   Вид доступен, если: открыт в цикле игрока, у него есть объём на этой редкости в этой таблице, его группа ещё не занята
   другим заданием пула, и сервер подтвердил условие игрока (ok). Нет доступных на выпавшей редкости — берётся ближайшая
   редкость ниже, без лишних бросков. Каждое место пула бросается на своём сиде: сид игрока, таблица, период, место, номер броска.
   Замена задания — тот же бросок с номером на единицу больше. */
(function (root) {
'use strict';

function mix32(x) { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; }
function seedOf(str) { let h = 0x811C9DC5; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0; return mix32(h); }
function makeRng(seed) {  // mulberry32: roll(n) — целое от 0 до n − 1
  let a = seed >>> 0;
  return n => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) % n; };
}
const pick = (ws, a) => { let i = 0; while (i < ws.length - 1 && a >= ws[i]) { a -= ws[i]; i++; } return i; };

/* сид броска: сид игрока, таблица ('d' — день, 'w' — неделя), период, место пула, номер броска */
const taskSeed = (spec, slot, n) => seedOf(`контракт|${spec.seed}|${spec.t}|${spec.period}|${slot}|${n}`);

/* виды, доступные на редкости r: spec = { t, c, seed, period, ok }; busy — занятые группы */
function eligible(D, spec, r, busy) {
  const V = D.vol[spec.t][spec.c] || {}, out = [];
  for (const k of D.order) {
    const K = D.kinds[k], v = V[k] ? V[k][r - 1] : 0;
    if (!v || busy.has(K.grp)) continue;
    if (spec.ok && !spec.ok(k, v)) continue;
    out.push(k);
  }
  return out;
}

/* одно задание: два броска. null — ни одного доступного вида ни на какой редкости */
function rollTask(D, spec, slot, n, busy) {
  const rng = makeRng(taskSeed(spec, slot, n)), W = D.rar.wBp;
  const r0 = 1 + pick(W, rng(W.reduce((a, x) => a + x, 0)));
  let r = r0, list = eligible(D, spec, r, busy);
  while (!list.length && r > 1) { r--; list = eligible(D, spec, r, busy); }
  const ws = list.map(k => D.kinds[k].w), sum = ws.reduce((a, x) => a + x, 0);
  const b = rng(Math.max(1, sum));
  if (!list.length) return null;
  const kind = list[pick(ws, b)];
  return { kind, r, rolled: r0, goal: D.vol[spec.t][spec.c][kind][r - 1], pts: D.rules.points[r - 1], slot, n, p: 0 };
}

/* пул периода: size мест, каждое на своём сиде; группа занятого места выпадает из следующих */
function offer(D, spec, size) {
  const tasks = [], busy = new Set();
  for (let slot = 0; slot < size; slot++) {
    const x = rollTask(D, spec, slot, 0, busy);
    if (x) { tasks.push(x); busy.add(D.kinds[x.kind].grp); }
  }
  return tasks;
}

/* замена задания i: то же место, номер броска на единицу больше; группа прежнего задания свободна */
function reroll(D, spec, tasks, i) {
  const busy = new Set(tasks.filter((_, j) => j !== i).map(x => D.kinds[x.kind].grp)), old = tasks[i];
  return rollTask(D, spec, old.slot, old.n + 1, busy);
}

/* награда за полное выполнение: сумма наград заданий по их редкости; недельный — ещё сундук редкости самого редкого задания.
   mul — множитель заверения (§18.5: ×2 на награды, не на очки) */
function reward(D, t, c, tasks, mul = 1) {
  const R = D.rew[t][c], out = { keys: 0, gold: 0, spirit: 0, base: 0, ckeys: 0, uniq: 0, en: 0, chest: null };
  let top = 0;
  for (const x of tasks) {
    const w = R[x.r - 1];
    for (const k of D.rewKeys) out[k] += w[k];
    if (x.r > top) top = x.r;
  }
  if (D.chest && D.chest.t.includes(t) && top) out.chest = { box: D.chest.box, r: top, win: D.chest.win, n: 1 };
  if (mul !== 1) { for (const k of D.rewKeys) out[k] *= mul; if (out.chest) out.chest.n *= mul; }
  return out;
}

/* ставка заверения: сумма ставок заданий по редкости, скидка — в базисных пунктах */
function stake(D, t, c, tasks, discBp = 0) {
  const S = D.stake[t][c];
  const sum = tasks.reduce((a, x) => a + S[x.r - 1], 0);
  return sum * (D.rules.bp - discBp) / D.rules.bp | 0;
}

/* очки контракта: сумма очков заданий (§18.5) */
const points = (D, tasks) => tasks.reduce((a, x) => a + D.rules.points[x.r - 1], 0);

/* самое редкое задание пула — «редкость контракта» для цвета и сундука */
const topRarity = tasks => tasks.reduce((a, x) => Math.max(a, x.r), 0);

/* клановые ступени рейтинга контрактов (§18.1, ADR-0042, ADR-0047): клан складывает очки контрактов участников по долям первой личной
   планки их цикла, все — в очках цикла to, того, кто смотрит. Ступень k — участников × ⌊первая личная планка цикла to × x[k] / per⌋:
   как у клановых планок Эхо и Событий. n — участников в счёте клана; нет данных — пусто */
function clanPlanks(D, n, to) {
  const p = (D.planks[to] || [])[0] || 0, C = D.clan;
  return C && p ? C.x.map(x => n * Math.floor(p * x / C.per)) : [];
}
/* очки участника цикла from — в очках цикла to, по первым личным планкам: взяли одинаково планок — принесли клану поровну (ADR-0042) */
function clanPts(D, pts, from, to) {
  const a = (D.planks[from] || [])[0] || 0, b = (D.planks[to] || [])[0] || 0;
  return a && b ? Math.floor(pts * b / a) : 0;
}

/* какие именно ресурсы: n штук из списка на сиде выдачи — по броску на штуку */
function pickItems(seedStr, n, list) {
  const out = {};
  if (!list.length) return out;
  const rng = makeRng(seedOf(seedStr));
  for (let i = 0; i < n; i++) { const id = list[rng(list.length)]; out[id] = (out[id] || 0) + 1; }
  return out;
}

const api = { mix32, seedOf, makeRng, taskSeed, eligible, rollTask, offer, reroll, reward, stake, points, topRarity, pickItems, clanPlanks, clanPts };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (root) root.EnContracts = api;
})(typeof window !== 'undefined' ? window : null);
