/* Ритуалы — алгоритм, общий для сборщика и прототипа (GDD §19). Сборщик вставляет этот файл в design/ui/rituals.js как есть.
   Ориентир для серверного ядра на C#, а не код игры: пул, старт, исход и выдачу решает только сервер (§34.1, §36.16).
   Только целые числа, время — целые миллисекунды. Генератор — mulberry32 и тот же хеш строки, что у сундуков (EnLoot);
   сборщик сверяет, что выход совпадает.
   Порядок обращений к генератору — часть формата:
     пул вкладки — один генератор на пул (сид игрока | день | вкладка | номер ролла). На карточку рабочих — пять бросков:
       уникальный ли (из 10 000), редкость (из суммы весов), бригада (из lo…hi своей редкости), биом (из суммы весов открытых), имя;
     на карточку героев — три броска: редкость, бригада, имя.
   Итог старта — свой генератор на сид карточки: по броску на каждый базовый ресурс из общего пула, затем на каждый ключ
   из шести ключей биома, затем на уникальный ресурс хозяина биома. Валюта героев — без бросков. */
(function (root) {
'use strict';

function mix32(x) { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; }
function seedOf(str) { let h = 0x811C9DC5; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0; return mix32(h); }
function makeRng(seed) {  // mulberry32: roll(n) — целое от 0 до n − 1
  let a = seed >>> 0;
  return n => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) % n; };
}

/* индекс по броску из суммы весов */
function pickIdx(ws, roll) {
  for (let i = 0; i < ws.length; i++) { if (roll < ws[i]) return i; roll -= ws[i]; }
  throw new Error('бросок вне суммы весов');
}
const lvOf = x => Math.max(0, x | 0);
const sum = a => a.reduce((s, x) => s + x, 0);

/* сколько: слотов, бесплатных роллов в день, карточек во вкладке — база и шаг за уровень артефакта, у слотов — потолок */
function slots(D, lv) { const R = D.rules.slots; return Math.min(R.cap, R.base + R.step * lvOf(lv)); }
function freeRolls(D, lv) { const R = D.rules.rolls; return R.free + R.step * lvOf(lv); }
function cardsN(D, lv) { const R = D.rules.cards; return R.base + R.step * lvOf(lv); }

/* открытые биомы с весом: перевес к свежим — вес биома из данных (его номер) */
function openW(D, ids) { return ids.filter(id => D.biomes[id]).map(id => [id, D.biomes[id].w]); }

/* Пул вкладки. spec = { seed, day, tab, roll, paid, n, open: [[биом, вес]], uniqueOk }.
   uniqueOk — можно ли уникальный: только в дневном пуле и бесплатных роллах и не больше одного во вкладке (D.rules.unique). */
function pool(D, spec) {
  const T = D.tabs[spec.tab], R = D.rules, rng = makeRng(seedOf([spec.seed, spec.day, spec.tab, spec.roll].join('|')));
  const sumR = sum(R.rarW), open = spec.open || [], sumB = sum(open.map(x => x[1]));
  let uniqLeft = spec.uniqueOk && !spec.paid ? R.unique.max : 0;
  const out = [];
  for (let i = 0; i < spec.n; i++) {
    const u = spec.tab === 'work' ? rng(R.bp) : R.bp;
    const r0 = pickIdx(R.rarW, rng(sumR)) + 1;
    const lo = T.crew.lo[r0 - 1], hi = T.crew.hi[r0 - 1], crew0 = lo + rng(hi - lo + 1);
    let biome = null;
    if (spec.tab === 'work') { const k = rng(Math.max(1, sumB)); biome = open.length ? open[pickIdx(open.map(x => x[1]), k)][0] : null; }
    const unique = spec.tab === 'work' && !!biome && uniqLeft > 0 && u < R.unique.chanceBp;
    if (unique) uniqLeft--;
    const list = unique ? T.uniqueNames : T.names[R.bands[r0 - 1]];
    let nm = rng(list.length);
    for (let k = 0; k < list.length && out.some(c => c.n === list[nm]); k++) nm = (nm + 1) % list.length;   // имена в пуле не повторяются — без бросков
    const r = unique ? R.unique.r : r0;
    out.push({ id: `${spec.tab}-${spec.day}-${spec.roll}-${i}`, tab: spec.tab, r, crew: unique ? R.unique.crew : crew0, biome, unique,
      nm, n: list[nm], ms: unique ? T.ms[R.unique.r - 1] : T.ms[r0 - 1], paid: !!spec.paid });
  }
  return out;
}

/* Награда карточки — количества, без бросков: у героев валюта за единицу времени × цикл аккаунта на старте;
   у рабочих — базовые за единицу, ключи биома — с редкости keys.from, один за keys.per единиц; уникальный ритуал — только уникальный */
function amount(D, card, cyc) {
  const T = D.tabs[card.tab], u = card.ms / T.unitMs;
  if (card.tab === 'hero') return { cur: T.cur.map(([k, per]) => [k, per * u * cyc]), basics: 0, keys: 0, uniq: 0 };
  if (card.unique) return { cur: [], basics: 0, keys: 0, uniq: D.rules.unique.qty };
  return { cur: [], basics: T.basics * u, keys: card.r >= T.keys.from ? Math.floor(u / T.keys.per) : 0, uniq: 0 };
}

/* ускорение бригады рабочих: −perRBp × редкость за участника, суммарно не больше capBp; герои не ускоряют */
function speedBp(D, card, crewR) {
  if (card.tab !== 'work') return 0;
  const S = D.rules.speed;
  return Math.min(S.capBp, sum((crewR || []).map(r => S.perRBp * r)));
}
/* время ритуала с бригадой, мс: сетка кратна 1/10 000 часа, поэтому результат целый */
function time(D, card, crewR) {
  const bp = D.rules.bp;
  return card.ms / bp * (bp - speedBp(D, card, crewR));
}

/* Итог старта на сиде: какие именно ресурсы. lists = { basic: [id], key: [id ключей биома], unique: [id уникального биома] } */
function resolve(D, card, cyc, seed, lists) {
  const A = amount(D, card, cyc), rng = makeRng(seed), items = {};
  const put = (arr, n) => { for (let k = 0; k < n; k++) { if (!arr || !arr.length) throw new Error('пустой список ресурсов'); const id = arr[rng(arr.length)]; items[id] = (items[id] || 0) + 1; } };
  put(lists.basic, A.basics);
  put(lists.key, A.keys);
  put(lists.unique, A.uniq);
  return { cur: A.cur.filter(x => x[1] > 0), items };
}

/* цена пробуждения рабочего в душах: душ за процент ускорения × его процент */
function awaken(D, r) { const W = D.rules.awaken; return W.soulsPerPct * D.rules.speed.perRBp * r / 100; }

root.EnRitual = { seedOf, makeRng, pickIdx, slots, freeRolls, cardsN, openW, pool, amount, speedBp, time, resolve, awaken };
if (typeof module !== 'undefined' && module.exports) module.exports = root.EnRitual;
})(typeof window !== 'undefined' ? window : globalThis);
