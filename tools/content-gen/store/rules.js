/* Лавка Энериума — алгоритм «сервера» покупок, общий для калькулятора и прототипа. Сборщик tools/content-gen/store/build.js
   вставляет этот файл в design/ui/store.js как есть. Ориентир для серверного ядра на C#, а не код игры: что продаётся, по какой цене,
   что придёт и можно ли купить — решает только сервер по данным витрины и своей памяти о покупках (GDD §32, §34.1, §36.16).
   Только целые числа. Цена — в рублях или в центах доллара, по ступени; доли — базисные пункты: 10 000 = 100 %.

   Платёж проводит платформа — RuStore, App Store, Google Play; сервер получает квитанцию с номером операции, проверяет её у платформы
   и выдаёт товар один раз. Повтор номера ничего не выдаёт, отказ ничего не меняет.

   Память сервера об игроке — st:
     region — платёжная область игрока: ru — рубли, us — доллары; решает платформа, игрок её не выбирает;
     bought — { товар: сколько раз куплен } — стартовые наборы, наборы Энериума, выдача, предложения; пропуск — 'pass:<номер сезона>';
     subs — { выдача: сколько дней ещё придёт письмом, кроме сегодняшнего }; subDay — { выдача: сутки, когда пришла последняя порция };
     offers — [{ id, left, n }] — открытые игроку предложения: сколько секунд им жить и сколько раз куплено в это открытие;
     ads — { day, n } — серверные сутки и сколько роликов засчитано в них. */
(function (root) {
'use strict';

const BP = 10000;

/* товар по id: { kind: 'chain' | 'pack' | 'sub' | 'pass' | 'offer', ...описание }; у стартового набора — ещё step, номер ступени с 1 */
function product(D, id) {
  const i = D.chain.steps.findIndex(s => s.id === id);
  if (i >= 0) return Object.assign({ kind: 'chain', step: i + 1 }, D.chain.steps[i]);
  const p = D.packs.find(x => x.id === id); if (p) return Object.assign({ kind: 'pack' }, p);
  const s = D.subs.find(x => x.id === id); if (s) return Object.assign({ kind: 'sub' }, s);
  if (D.pass && D.pass.id === id) return Object.assign({ kind: 'pass' }, D.pass);
  const o = D.offers.list.find(x => x.id === id); if (o) return Object.assign({ kind: 'offer' }, o);
  return null;
}

/* ступень цены товара в области: { cur: 'rub' | 'usd', n } — рубли или центы */
function price(D, id, region) {
  const P = product(D, id); if (!P) return null;
  const T = D.tiers[P.tier]; if (!T) return null;
  return region === 'us' ? { cur: 'usd', n: T.usd } : { cur: 'rub', n: T.rub };
}

const count = (st, id) => (st && st.bought && st.bought[id]) || 0;

/* стартовая цепочка: какая ступень продаётся сейчас (номер с 1) или 0 — цепочка собрана. Купил ступень — открылась следующая */
function chainAt(D, st) {
  for (let i = 0; i < D.chain.steps.length; i++) if (!count(st, D.chain.steps[i].id)) return i + 1;
  return 0;
}

/* Энериум набора без первой покупки и с ней */
function packEn(D, id) {
  const P = D.packs.find(x => x.id === id); if (!P) return null;
  const n = Math.floor(P.en * (BP + (P.bonusBp || 0)) / BP);
  return { n, first: n * (P.firstX || 1) };
}

/* выдача при покупке в сутки day: now — что придёт сразу, days — сколько дней прибавится письмами. Сегодня порции ещё не было —
   она приходит сразу, остальные days − 1 — письмами; была — прибавляются все days */
function subAdd(D, st, id, day) {
  const P = D.subs.find(x => x.id === id); if (!P) return null;
  const today = !!(st && st.subDay && st.subDay[id] === day);
  return today ? { now: [], days: P.days } : { now: [['enerium', P.daily]], days: P.days - 1 };
}

/* что придёт за покупку сейчас: [[вид, сколько]]. Стартовый набор — всегда ×x цепочки: он продаётся раз за игру, покупка всегда первая.
   Набор Энериума — база с прибавкой bonusBp, первая покупка этого набора — × firstX. Выдача — порция сегодняшних суток, если сегодня её ещё не было.
   Предложение — как есть. Пропуск — платный ряд сезона: награды — на его ступенях. day — серверные сутки */
function gets(D, st, id, day) {
  const P = product(D, id); if (!P) return [];
  if (P.kind === 'chain') return P.get.map(([k, n]) => [k, n * D.chain.x]);
  if (P.kind === 'pack') { const e = packEn(D, id); return [['enerium', count(st, id) ? e.n : e.first]]; }
  if (P.kind === 'sub') return subAdd(D, st, id, day).now;
  if (P.kind === 'offer') return P.get.map(x => x.slice());
  return [];
}

/* открытое игроку предложение: запись st.offers или null */
const offerOf = (st, id) => ((st && st.offers) || []).find(o => o.id === id && o.left > 0) || null;

/* можно ли купить: null — можно, иначе код отказа. ctx — что знает сервер вне Лавки: day — серверные сутки, pass — { open, no, paid } */
function refuse(D, st, id, ctx) {
  const P = product(D, id); if (!P) return 'none';
  if (P.kind === 'chain') {
    if (count(st, id)) return 'once';
    return chainAt(D, st) === P.step ? null : 'order';
  }
  if (P.kind === 'sub') {
    const left = (st && st.subs && st.subs[id]) || 0;
    return left + subAdd(D, st, id, ctx && ctx.day).days > P.maxDays ? 'days' : null;
  }
  if (P.kind === 'pass') {
    const pass = (ctx && ctx.pass) || null;
    if (!pass || !pass.open) return 'open';
    return pass.paid || count(st, 'pass:' + pass.no) ? 'bought' : null;
  }
  if (P.kind === 'offer') {
    const O = offerOf(st, id); if (!O) return 'gone';
    const K = D.offers.kinds[P.of];
    return K && (O.n || 0) >= K.limit ? 'limit' : null;
  }
  return null;
}

/* реклама: сколько роликов ещё засчитает сервер в сутки day */
const adLeft = (D, st, day) => Math.max(0, D.ads.dayCap - (st && st.ads && st.ads.day === day ? st.ads.n : 0));

/* сколько секунд живёт предложение вида kind: своё число или до недельной отсечки (weekLeft — секунд до неё) */
function offerLife(D, kind, weekLeft) {
  const K = D.offers.kinds[kind]; if (!K) return 0;
  return K.life === 'week' ? Math.max(0, weekLeft | 0) : K.life;
}

const api = { BP, product, price, count, chainAt, packEn, subAdd, gets, offerOf, refuse, adLeft, offerLife };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (root) root.EnStore = api;
})(typeof window !== 'undefined' ? window : null);
