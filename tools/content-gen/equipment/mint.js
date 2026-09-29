/* Генерация предмета снаряжения — алгоритм, общий для сборщика и прототипа. Сборщик вставляет этот файл в design/ui/equipment.js как есть.
   Ориентир для серверного ядра на C#, а не код игры: в игре предмет создаёт только сервер — при открытии сундука, перековке и
   открытии ларца (GDD §21.2, §22, §34.1, §36.16). Клиент получает готовый предмет: слот, редкость, цикл и строки.
   Только целые числа. Генератор — mulberry32, как у сундуков (design/ui/lootboxes.js) и в ядре боя прототипа.
   Шаблон — слот × редкость, их 63 (§21.2). Строка шаблона: вид, центр на цикле I в сотых долях, ширина в процентах.
   Диапазон строки на цикле c = центр × множитель цикла × (1 ± ширина): плоские строки растут по кривой базы §3.3 (rules.cycMul),
   строки в процентах — по мягкой кривой rules.cycSec. Нижняя граница — не меньше 1.
   Порядок обращений к генератору — часть формата, он не зависит от выпавшего:
     1) слот — бросок из девяти, только если источник слот не задал (сундук, перековка, ларец);
     2) главная строка — бросок значения;
     3) каждая доп. характеристика — бросок вида среди оставшихся, затем бросок значения;
     4) каждое вторичное свойство — бросок вида по весам среди оставшихся, затем бросок значения.
   Бросок делается, даже когда диапазон из одного числа: число бросков у шаблона всегда одно и то же. */
(function (root) {
'use strict';

function mix32(x) { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; }
function seedOf(str) { let h = 0x811C9DC5; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0; return mix32(h); }
function makeRng(seed) {  // mulberry32: roll(n) — целое от 0 до n − 1
  let a = seed >>> 0;
  return n => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) % n; };
}

/* Диапазон строки [нижняя, верхняя] на цикле cyc: центр (сотые, цикл I) × множитель цикла (%) × (100 ± ширина) %. */
function rangeOf(D, kind, c100, w, cyc) {
  const K = D.kinds[kind];
  if (!K) throw new Error('нет вида строки ' + kind);
  const M = D.rules[K.grow === 'sec' ? 'cycSec' : 'cycMul'][cyc - 1];
  if (!M) throw new Error('нет цикла ' + cyc);
  const C = c100 * M;   // десятитысячные доли
  let lo = Math.floor(C * (100 - w) / 1000000), hi = Math.floor(C * (100 + w) / 1000000);
  if (lo < 1) lo = 1;
  if (hi < lo) hi = lo;
  return [lo, hi];
}

/* Число бросков шаблона: для сверки формата. */
function rollsOf(T, slotGiven) { return (slotGiven ? 0 : 1) + 1 + 2 * T.chars.n + 2 * T.secs.n; }

/* Предмет по шаблону: spec = { slot?, r, cyc }; seed — от сервера. Итог — { slot, r, cyc, lines: [[вид, значение], …] },
   главная строка — первая. trace — необязательный массив бросков, на их порядок не влияет. */
function mint(D, spec, seed, trace) {
  const rng = makeRng(seed), roll = n => { const x = rng(n); if (trace) trace.push([x, n]); return x; };
  const S = D.rules.slots;
  const slot = spec.slot || S[roll(S.length)];
  const T = D.templates[slot + '.' + spec.r];
  if (!T) throw new Error('нет шаблона ' + slot + '.' + spec.r);
  const cyc = spec.cyc, lines = [];
  const val = (k, c, w) => { const [lo, hi] = rangeOf(D, k, c, w, cyc); return lo + roll(hi - lo + 1); };
  lines.push([T.main[0], val(T.main[0], T.main[1], T.main[2])]);
  const chars = T.chars.pool.slice();
  for (let i = 0; i < T.chars.n; i++) {
    const [k, c, w] = chars.splice(roll(chars.length), 1)[0];
    lines.push([k, val(k, c, w)]);
  }
  const secs = T.secs.pool.slice();
  for (let i = 0; i < T.secs.n; i++) {
    const W = secs.reduce((a, x) => a + x[1], 0);
    let x = roll(W), j = 0;
    while (x >= secs[j][1]) { x -= secs[j][1]; j++; }
    const [k, , c, w] = secs.splice(j, 1)[0];
    lines.push([k, val(k, c, w)]);
  }
  return { slot, r: spec.r, cyc, lines };
}

/* Прибавка предмета к герою: пять характеристик [Сила, Интеллект, Ловкость, Выносливость, Скорость] и вторичные свойства по видам.
   main — индекс главной характеристики героя (0…3): строка «Урон» идёт в неё; «Защита» — в Силу и Интеллект поровну. */
function addOf(D, item, main, into) {
  const out = into || { st: [0, 0, 0, 0, 0], sec: {} };
  for (const [k, v] of item.lines) {
    const K = D.kinds[k];
    if (K.st != null) out.st[K.st] += v;
    else if (K.to === 'main') out.st[main] += v;
    else if (K.to === 'guard') for (const i of K.st2) out.st[i] += v;
    else out.sec[k] = (out.sec[k] || 0) + v;
  }
  return out;
}

root.EnEquip = { mix32, seedOf, makeRng, rangeOf, rollsOf, mint, addOf };
})(typeof window !== 'undefined' ? window : globalThis);
