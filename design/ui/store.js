/* Лавка Энериума — данные прототипа «Свет снизу». Собирает tools/content-gen/store/build.js: сетка цен, пять стартовых наборов
   цепочкой, пять наборов Энериума, три выдачи, платный ряд пропуска, лимитированные предложения, реклама за Энериум. Руками не править:
   пересборка затрёт правку. Черновик · предложение · ждёт автора. Числа — демонстрация, только целые; цены — рубли и центы доллара.
   tiers — ступени цен; chain — стартовые наборы (get — до удвоения, x — удвоение); packs, subs, pass, offers, ads — витрина;
   art — пути картинок и выгруженные (ready); demo — демо-аккаунт; econ — итоги расчёта. Обоснование — docs/content/монетизация.md.
   В игре что продаётся, по какой цене и что придёт, решает сервер: платёж проводит платформа, сервер проверяет квитанцию и выдаёт товар
   один раз (§32, §36.16). Ниже данных — алгоритм tools/content-gen/store/rules.js как есть. */
window.EN_STORE = {"meta":{"builder":"tools/content-gen/store/build.js","rules":"tools/content-gen/store/rules.js","sources":["GDD §32","GDD §1.2","GDD §9.3","GDD §36","ADR-0034","design/ui/pass.js","design/ui/contracts.js","tools/content-gen/contracts/capacity.json"]},"bp":10000,"regions":{"ru":{"n":"Россия","cur":"rub"},"us":{"n":"Запад","cur":"usd"}},"tiers":{"r99":{"rub":99,"usd":99},"r159":{"rub":159,"usd":199},"r249":{"rub":249,"usd":299},"r349":{"rub":349,"usd":399},"r399":{"rub":399,"usd":499},"r499":{"rub":499,"usd":599},"r749":{"rub":749,"usd":899},"r999":{"rub":999,"usd":1199},"r2490":{"rub":2490,"usd":2999},"r4990":{"rub":4990,"usd":5999}},"chain":{"id":"start","n":"Стартовые наборы","x":2,"steps":[{"id":"start1","n":"Котомка странника","tier":"r99","get":[["keys",5],["souls",150],["enerium",150]]},{"id":"start2","n":"Дорожный ларец","tier":"r249","get":[["keys",10],["souls",300],["enerium",500]]},{"id":"start3","n":"Окованный ларец","tier":"r499","get":[["keys",15],["souls",450],["enerium",1000]]},{"id":"start4","n":"Реликварий","tier":"r999","get":[["keys",20],["souls",600],["enerium",2000]]},{"id":"start5","n":"Сокровищница","tier":"r2490","get":[["keys",30],["souls",1200],["enerium",5000]]}]},"segments":[{"id":"s","n":"не донатеры","from":100,"step":1},{"id":"m","n":"средние","from":500,"step":3},{"id":"l","n":"крупные","from":2500,"step":5}],"packs":[{"id":"en1","n":"Малый набор Энериума","tier":"r249","en":500,"bonusBp":0,"firstX":2},{"id":"en2","n":"Средний набор Энериума","tier":"r499","en":1000,"bonusBp":1000,"firstX":2},{"id":"en3","n":"Большой набор Энериума","tier":"r999","en":2000,"bonusBp":2000,"firstX":2},{"id":"en4","n":"Огромный набор Энериума","tier":"r2490","en":5000,"bonusBp":3000,"firstX":2},{"id":"en5","n":"Великий набор Энериума","tier":"r4990","en":10000,"bonusBp":4000,"firstX":2}],"subs":[{"id":"sub1","n":"Малая выдача","tier":"r159","daily":20,"days":30,"maxDays":90},{"id":"sub2","n":"Ежедневная выдача","tier":"r349","daily":45,"days":30,"maxDays":90},{"id":"sub3","n":"Великая выдача","tier":"r749","daily":100,"days":30,"maxDays":90}],"pass":{"id":"pass","n":"Платный ряд пропуска","tier":"r399"},"offers":{"kinds":{"path":{"n":"Дар пути","when":"cycle","life":259200,"limit":1,"what":"открывается с новым циклом аккаунта, раз за цикл"},"week":{"n":"Лавка недели","when":"week","life":"week","limit":1,"what":"открывается с неделей расы, до недельной отсечки"},"fest":{"n":"Праздничный дар","when":"date","life":604800,"limit":2,"what":"открывается в праздник календаря сервера"}},"list":[{"id":"path2","of":"path","cycle":2,"tier":"r249","get":[["enerium",1000]]},{"id":"path3","of":"path","cycle":3,"tier":"r499","get":[["enerium",2000]]},{"id":"path4","of":"path","cycle":4,"tier":"r499","get":[["enerium",2000]]},{"id":"path5","of":"path","cycle":5,"tier":"r999","get":[["enerium",4000]]},{"id":"path6","of":"path","cycle":6,"tier":"r999","get":[["enerium",4000]]},{"id":"week","of":"week","tier":"r499","get":[["enerium",1500]]},{"id":"fest","of":"fest","tier":"r999","get":[["enerium",3000]]}],"maxActive":3},"ads":{"perView":5,"dayCap":2,"sec":30},"demo":{"region":"ru","offers":["week"]},"art":{"ready":["store/start-1.png","store/start-2.png","store/start-3.png","store/start-4.png","store/start-5.png","store/pass-seal.png","store/pack-1.png","store/pack-2.png","store/pack-3.png","store/pack-4.png","store/pack-5.png","store/ad.png","store/sub-1.png","store/sub-2.png","store/sub-3.png","store/offer-path.png","store/offer-week.png","store/offer-fest.png","store/hall.jpg"],"map":{"start1":"store/start-1.png","start2":"store/start-2.png","start3":"store/start-3.png","start4":"store/start-4.png","start5":"store/start-5.png","seal":"store/pass-seal.png","en1":"store/pack-1.png","en2":"store/pack-2.png","en3":"store/pack-3.png","en4":"store/pack-4.png","en5":"store/pack-5.png","ad":"store/ad.png","sub1":"store/sub-1.png","sub2":"store/sub-2.png","sub3":"store/sub-3.png","path":"store/offer-path.png","week":"store/offer-week.png","fest":"store/offer-fest.png","hall":"store/hall.jpg"}},"econ":{"base":{"en":500,"rub":249,"usd":299},"chain":{"keys":160,"souls":5400,"enerium":17300,"rub":4336,"usd":5195,"keysDays100":695,"soulsDays100":680,"x17":{"keys":149,"souls":148}},"income":{"keysDay":23,"soulsDay":794,"c2Days":14},"passEn":900,"adsDay":10}};
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
