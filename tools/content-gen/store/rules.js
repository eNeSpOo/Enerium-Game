/* Лавка Энериума — алгоритм «сервера» покупок, общий для калькулятора и прототипа. Сборщик tools/content-gen/store/build.js
   вставляет этот файл в design/ui/store.js как есть. Ориентир для серверного ядра на C#, а не код игры: что продаётся, по какой цене,
   что придёт и можно ли купить — решает только сервер по данным витрины и своей памяти о покупках (GDD §32, §34.1, §36.16).
   Только целые числа. Цена — в рублях или в центах доллара, по ступени; доли — базисные пункты: 10 000 = 100 %.

   Платёж проводит платформа — RuStore, App Store, Google Play; сервер получает квитанцию с номером операции, проверяет её у платформы
   и выдаёт товар один раз. Повтор номера ничего не выдаёт, отказ ничего не меняет.

   ×2 — два правила (ADR-0054, п. 1):
     разовые наборы — удвоение получает только самая первая покупка разового набора, набор выбирает игрок; один раз на игру;
     комплекты Энериума — удвоение у каждого комплекта своё, но один раз на комплект.

   Память сервера об игроке — st:
     region — платёжная область игрока: ru — рубли, us — доллары; решает платформа, игрок её не выбирает;
     bought — { товар: сколько раз куплен } — разовые наборы, комплекты Энериума, выдача, предложения; пропуск — 'pass:<номер сезона>';
     x2 — { once } — использованное удвоение разовых наборов: id набора, которому оно досталось; пусто — удвоение ещё ждёт.
          У комплекта Энериума своей записи нет: его удвоение использовано, как только комплект куплен хоть раз (bought);
     subs — { выдача: сколько дней ещё придёт письмом, кроме сегодняшнего }; subDay — { выдача: сутки, когда пришла последняя порция };
     offers — [{ id, left, n }] — открытые игроку предложения: сколько секунд им жить и сколько раз куплено в это открытие;
     ads — { day, n } — серверные сутки и сколько роликов засчитано в них. */
(function (root) {
'use strict';

const BP = 10000;

/* товар по id: { kind: 'chain' | 'pack' | 'sub' | 'pass' | 'offer', ...описание }. chain — разовый набор: имя вида и ключа данных
   прежнее, от «цепочки» стартовых наборов; step — его номер по величине с 1, порядок покупки он не задаёт */
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

/* разовые наборы, которые ещё продаются: id некупленных, по величине. Порядок покупки — любой, каждый набор — раз за игру */
const onceLeft = (D, st) => D.chain.steps.filter(s => !count(st, s.id)).map(s => s.id);

/* удвоение разовых наборов ещё ждёт? Его получает только самая первая покупка разового набора — один раз на игру.
   Использовано, если сервер записал, какому набору оно досталось (st.x2.once), или если хоть один разовый набор уже куплен:
   вторая проверка страхует первую — самая первая покупка уже была, даже если запись потеряна */
function onceX2(D, st) {
  if (st && st.x2 && st.x2.once) return false;
  return !D.chain.steps.some(s => count(st, s.id));
}

/* множитель покупки сейчас. Разовый набор — x, пока удвоение разовых наборов ждёт; комплект Энериума — firstX, пока этот комплект
   не куплен ни разу; у остальных товаров и после использованного удвоения — 1 */
function mult(D, st, id) {
  const P = product(D, id); if (!P) return 1;
  if (P.kind === 'chain') return onceX2(D, st) ? D.chain.x : 1;
  if (P.kind === 'pack') return count(st, id) ? 1 : (P.firstX || 1);
  return 1;
}

/* Энериум комплекта: n — с прибавкой bonusBp, first — он же с удвоением первой покупки */
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

/* что придёт за покупку сейчас: [[вид, сколько]]. Разовый набор — состав, у самой первой покупки разового набора — весь состав × x.
   Комплект Энериума — база с прибавкой bonusBp, первая покупка этого комплекта — × firstX. Выдача — порция сегодняшних суток, если
   сегодня её ещё не было. Предложение — как есть. Пропуск — платный ряд сезона: награды — на его ступенях. day — серверные сутки */
function gets(D, st, id, day) {
  const P = product(D, id); if (!P) return [];
  if (P.kind === 'chain') { const x = mult(D, st, id); return P.get.map(([k, n]) => [k, n * x]); }
  if (P.kind === 'pack') return [['enerium', packEn(D, id).n * mult(D, st, id)]];
  if (P.kind === 'sub') return subAdd(D, st, id, day).now;
  if (P.kind === 'offer') return P.get.map(x => x.slice());
  return [];
}

/* открытое игроку предложение: запись st.offers или null */
const offerOf = (st, id) => ((st && st.offers) || []).find(o => o.id === id && o.left > 0) || null;

/* можно ли купить: null — можно, иначе код отказа. ctx — что знает сервер вне Лавки: day — серверные сутки, pass — { open, no, paid }.
   Разовый набор — раз за игру, в любом порядке: замка «сначала предыдущий» нет */
function refuse(D, st, id, ctx) {
  const P = product(D, id); if (!P) return 'none';
  if (P.kind === 'chain') return count(st, id) ? 'once' : null;
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

const api = { BP, product, price, count, onceLeft, onceX2, mult, packEn, subAdd, gets, offerOf, refuse, adLeft, offerLife };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (root) root.EnStore = api;
})(typeof window !== 'undefined' ? window : null);
