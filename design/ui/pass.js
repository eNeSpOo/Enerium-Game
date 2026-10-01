/* Боевой пропуск и лист даров — данные прототипа «Свет снизу». Собирает tools/content-gen/pass/build.js из таблицы дел Событий
   (event.js), сундуков (lootboxes.js), Энериума контрактов (contracts.js) и ёмкости дня (capacity.json). Руками не править: пересборка
   затрёт правку. Черновик · предложение · ждёт автора. Числа — демонстрация, только целые; доли — в базисных пунктах (10 000 = 100 %).
   season — сезон, tiers и tierPts — ступени, dayCap — потолок, копится по дням; rate — очков дел на очко пропуска; units и caps — таблица
   дел и дневные потолки Событий как есть; rows.free и rows.paid — клетки двух рядов; sku — товар платного ряда в Лавке Энериума
   (цена — design/ui/store.js, EN_STORE); cal — лист даров;
   art — пути картинок и выгруженные (ready); demo — демо-аккаунт; econ — итоги прогона. Обоснование — docs/content/пропуск-и-награды.md.
   В игре очки, ступени и выдачу решает сервер (§32, §36.16). Ниже данных — алгоритм tools/content-gen/pass/rules.js как есть. */
window.EN_PASS = {"meta":{"builder":"tools/content-gen/pass/build.js","rules":"tools/content-gen/pass/rules.js","eventSha":"c91c6eb26104","lootSha":"4df04dd33be2","sources":["GDD §32","GDD §29","GDD §16","GDD §1.2","GDD §9.3","ADR-0030","design/ui/event.js","design/ui/lootboxes.js","design/ui/contracts.js"]},"bp":10000,"open":{"level":10,"cycle":2},"season":{"id":"autumn","n":"Осенний путь","days":28,"weeks":4},"tiers":30,"tierPts":30,"dayCap":60,"rate":55,"level":{"perLevelBp":1000},"chestBox":"wander","chestBase":[0,1,2,3,4,5,6],"sku":"pass","frame":"pass","units":{"floor":{"n":"Этаж","src":"descent","price":1},"elite":{"n":"Элита","src":"descent","price":1},"boss":{"n":"Босс биома","src":"descent","price":60},"guard":{"n":"Рунный страж","src":"descent","price":40},"echoRound":{"n":"Атака в Эхо","src":"echo","price":9},"ritualHalf":{"n":"Ритуал","src":"rituals","price":10},"contractD":{"n":"Дневной контракт","src":"contracts","price":300},"contractW":{"n":"Недельный контракт","src":"contracts","price":1500},"arenaWin":{"n":"Победа на Арене","src":"arena","price":40},"leagueWin":{"n":"Матч Лиги","src":"arena","price":120,"gate":"league"},"clanAtk":{"n":"Атака клана","src":"clan","price":70},"craftItem":{"n":"Создание","src":"craft","price":3},"recipe":{"n":"Новый рецепт","src":"craft","price":200}},"caps":{"floor":400,"elite":100,"arenaWin":10,"leagueWin":3,"craftItem":20},"sources":[{"id":"descent","n":"Спуск","go":"descent","p":10,"what":"этажи, элиты, боссы и рунные стражи"},{"id":"echo","n":"Эхо","go":"echo","p":18,"what":"атаки по целям недели"},{"id":"rituals","n":"Ритуалы","go":"rituals","p":33,"what":"время завершённых ритуалов"},{"id":"contracts","n":"Контракты","go":"contracts","p":38,"what":"исполненные контракты"},{"id":"arena","n":"Арена и Лига","go":"arena:arena","p":3,"what":"победы"},{"id":"clan","n":"Клан","go":"clan:boss","p":26,"what":"атаки по элитам и боссу клана"},{"id":"craft","n":"Мастерская","go":"craft","p":11,"what":"новые рецепты и созданное"}],"rows":{"free":[[{"k":"gold","b":1250}],[{"k":"spirit","b":5000}],[{"k":"enerium","n":20}],[{"k":"dust","b":25}],[{"k":"chest","off":0,"win":"step"}],[{"k":"gold","b":1250}],[{"k":"enerium","n":25}],[{"k":"enerium","n":20}],[{"k":"dust","b":25}],[{"k":"chest","off":1,"win":"step"}],[{"k":"gold","b":1250}],[{"k":"spirit","b":5000}],[{"k":"enerium","n":25}],[{"k":"dust","b":25}],[{"k":"chest","off":0,"win":"wild"}],[{"k":"gold","b":1250}],[{"k":"enerium","n":25}],[{"k":"enerium","n":25}],[{"k":"dust","b":25}],[{"k":"chest","off":1,"win":"pure"}],[{"k":"gold","b":1250}],[{"k":"spirit","b":5000}],[{"k":"enerium","n":30}],[{"k":"dust","b":25}],[{"k":"chest","off":0,"win":"step"}],[{"k":"gold","b":1250}],[{"k":"enerium","n":25}],[{"k":"enerium","n":30}],[{"k":"dust","b":25}],[{"k":"frame","id":"pass"},{"k":"chest","off":2,"win":"step"}]],"paid":[[{"k":"spirit","b":1500}],[{"k":"gold","b":750}],[{"k":"dust","b":15}],[{"k":"enerium","n":50}],[{"k":"enerium","n":100}],[{"k":"spirit","b":1500}],[{"k":"gold","b":750}],[{"k":"dust","b":15}],[{"k":"enerium","n":50}],[{"k":"chest","off":1,"win":"step"}],[{"k":"spirit","b":1500}],[{"k":"gold","b":750}],[{"k":"dust","b":15}],[{"k":"enerium","n":50}],[{"k":"enerium","n":100}],[{"k":"spirit","b":1500}],[{"k":"gold","b":750}],[{"k":"dust","b":15}],[{"k":"enerium","n":50}],[{"k":"chest","off":1,"win":"step"}],[{"k":"spirit","b":1500}],[{"k":"gold","b":750}],[{"k":"dust","b":15}],[{"k":"enerium","n":50}],[{"k":"enerium","n":100}],[{"k":"spirit","b":1500}],[{"k":"gold","b":750}],[{"k":"dust","b":15}],[{"k":"enerium","n":50}],[{"k":"chest","off":1,"win":"step"},{"k":"enerium","n":300}]]},"cal":{"marks":30,"main":20,"miles":{"7":{"n":"Дар недели","art":"pass/gift-07.jpg"},"14":{"n":"Дар двух недель","art":"pass/gift-14.jpg"},"20":{"n":"Главный дар","art":"pass/gift-20.jpg","main":1},"30":{"n":"Венец листа","art":"pass/gift-30.jpg"}},"list":[[{"k":"gold","b":2300}],[{"k":"spirit","b":5000}],[{"k":"chest","r":1,"win":"wild"}],[{"k":"enerium","n":15}],[{"k":"dust","b":15,"from":2,"alt":{"k":"spirit","b":5000}}],[{"k":"gold","b":2300}],[{"k":"chest","off":0,"win":"step"},{"k":"enerium","n":30}],[{"k":"spirit","b":5000}],[{"k":"chest","r":1,"win":"wild"}],[{"k":"enerium","n":15}],[{"k":"gold","b":2300}],[{"k":"enerium","n":15}],[{"k":"dust","b":15,"from":2,"alt":{"k":"spirit","b":5000}}],[{"k":"chest","off":1,"win":"step"},{"k":"enerium","n":40}],[{"k":"spirit","b":5000}],[{"k":"chest","r":1,"win":"wild"}],[{"k":"gold","b":2300}],[{"k":"enerium","n":20}],[{"k":"dust","b":15,"from":2,"alt":{"k":"spirit","b":5000}}],[{"k":"chest","off":1,"win":"pure"},{"k":"enerium","n":80}],[{"k":"spirit","b":5000}],[{"k":"chest","r":1,"win":"wild"}],[{"k":"gold","b":2300}],[{"k":"enerium","n":15}],[{"k":"enerium","n":20}],[{"k":"dust","b":15,"from":2,"alt":{"k":"spirit","b":5000}}],[{"k":"spirit","b":5000}],[{"k":"chest","r":1,"win":"wild"}],[{"k":"gold","b":2300}],[{"k":"chest","off":1,"win":"step"},{"k":"enerium","n":50}]],"open":1,"forgive":"all"},"art":{"ready":["pass/banner.jpg","pass/gift-07.jpg","pass/gift-14.jpg","pass/gift-20.jpg","pass/gift-30.jpg","pass/crown.jpg","workers/worker.png","dust.png"],"banner":"pass/banner.jpg","crown":"pass/crown.jpg","dust":"dust.png","worker":"workers/worker.png"},"demo":{"day":11,"pts":549,"claimed":15,"paid":0,"cal":{"got":10,"leftMin":432}},"econ":{"pace":{"2":{"o":{"doneBp":10000,"by25Bp":10000,"med":18,"p90":20,"min":15,"tier":30,"pts":900},"e":{"doneBp":10000,"by25Bp":10000,"med":15,"p90":15,"min":15,"tier":30,"pts":900},"z":{"doneBp":0,"by25Bp":0,"med":0,"p90":0,"min":0,"tier":13,"pts":412},"p":{"doneBp":10000,"by25Bp":10000,"med":16,"p90":18,"min":15,"tier":30,"pts":900}},"3":{"o":{"doneBp":10000,"by25Bp":10000,"med":16,"p90":17,"min":15,"tier":30,"pts":900},"e":{"doneBp":10000,"by25Bp":10000,"med":15,"p90":15,"min":15,"tier":30,"pts":900},"z":{"doneBp":0,"by25Bp":0,"med":0,"p90":0,"min":0,"tier":18,"pts":553},"p":{"doneBp":10000,"by25Bp":10000,"med":15,"p90":16,"min":15,"tier":30,"pts":900}},"4":{"o":{"doneBp":10000,"by25Bp":10000,"med":16,"p90":17,"min":15,"tier":30,"pts":900},"e":{"doneBp":10000,"by25Bp":10000,"med":15,"p90":15,"min":15,"tier":30,"pts":900},"z":{"doneBp":0,"by25Bp":0,"med":0,"p90":0,"min":0,"tier":19,"pts":583},"p":{"doneBp":10000,"by25Bp":10000,"med":15,"p90":16,"min":15,"tier":30,"pts":900}},"5":{"o":{"doneBp":10000,"by25Bp":10000,"med":16,"p90":17,"min":15,"tier":30,"pts":900},"e":{"doneBp":10000,"by25Bp":10000,"med":15,"p90":15,"min":15,"tier":30,"pts":900},"z":{"doneBp":0,"by25Bp":0,"med":0,"p90":0,"min":0,"tier":20,"pts":611},"p":{"doneBp":10000,"by25Bp":10000,"med":15,"p90":16,"min":15,"tier":30,"pts":900}},"6":{"o":{"doneBp":10000,"by25Bp":10000,"med":15,"p90":16,"min":15,"tier":30,"pts":900},"e":{"doneBp":10000,"by25Bp":10000,"med":15,"p90":15,"min":15,"tier":30,"pts":900},"z":{"doneBp":0,"by25Bp":0,"med":0,"p90":0,"min":0,"tier":21,"pts":650},"p":{"doneBp":10000,"by25Bp":10000,"med":15,"p90":16,"min":15,"tier":30,"pts":900}}},"x17":{"2":{"10":{"gold":157,"spirit":157,"dust":154,"resGold":117},"30":{"gold":158,"spirit":158,"dust":156,"resGold":117}},"3":{"28":{"gold":157,"spirit":157,"dust":152,"resGold":123},"46":{"gold":158,"spirit":158,"dust":154,"resGold":123}},"4":{"44":{"gold":157,"spirit":157,"dust":148,"resGold":113},"62":{"gold":158,"spirit":158,"dust":149,"resGold":113}},"5":{"60":{"gold":157,"spirit":157,"dust":152,"resGold":133},"78":{"gold":158,"spirit":158,"dust":153,"resGold":133}},"6":{"76":{"gold":158,"spirit":158,"dust":157,"resGold":154},"95":{"gold":158,"spirit":158,"dust":157,"resGold":154}}},"income":{"2":{"gBp":496,"sBp":496,"level":30},"3":{"gBp":323,"sBp":323,"level":46},"4":{"gBp":281,"sBp":281,"level":62},"5":{"gBp":260,"sBp":260,"level":78},"6":{"gBp":249,"sBp":249,"level":95}},"en":{"paid":900,"free":225,"cal":300,"cal28":280,"contracts28":372,"payer":1125},"lvl":{"1":[1,9],"2":[10,30],"3":[28,46],"4":[44,62],"5":[60,78],"6":[76,95]}}};
/* Боевой пропуск и лист даров — алгоритм «сервера», общий для калькулятора и прототипа. Сборщик tools/content-gen/pass/build.js
   вставляет этот файл в design/ui/pass.js как есть. Ориентир для серверного ядра на C#, а не код игры: очки, ступени, награды
   и отметки решает только сервер по подтверждённым делам и операциям с номером (GDD §32, §29, §34.1, §36.16).
   Только целые числа. Множители — базисные пункты: 10 000 = 100 %. Округление — вниз, один раз на операцию.

   Очки пропуска — те же дела, что считает Событие недели, по той же таблице цен, но без акцента недели и силы коллекции:
     сотые очка = ⌊ цена дела × n × 100 / rate ⌋, где rate — очков дел на одно очко пропуска.
   Потолок сезона копится: к дню d (1…days) очков не больше d × dayCap — пропущенный день можно добрать позже. Выше цели
   (ступеней × очков на ступень) очки не идут: путь пройден. Дневные потолки единиц — те же, что у События (§1.2).
   Награда-валюта растёт с уровнем Странника по §16: ⌊ база × (10 000 + уровень × perLevelBp) / 10 000 ⌋. Сундук — редкость
   по циклу аккаунта (chestBase) и сдвиг клетки, в границах 1…7; окно — свойство клетки. Энериум — без роста. */
(function (root) {
'use strict';

const BP = 10000;

/* §16: Награда = База × (1 + Уровень × 0,1) — множитель уровня в данных (level.perLevelBp) */
const scale = (D, base, level) => Math.floor(base * (BP + Math.max(0, level | 0) * D.level.perLevelBp) / BP);

/* редкость сундука клетки: своя (r) или база цикла + сдвиг (off), в границах 1…7 */
function chestR(D, cycle, x) {
  if (x.r) return Math.max(1, Math.min(7, x.r));
  const c = Math.max(1, Math.min(D.chestBase.length - 1, cycle | 0));
  return Math.max(1, Math.min(7, D.chestBase[c] + (x.off || 0)));
}

/* одна награда на уровне и цикле аккаунта o = { level, cycle }:
   { k, n } — валюта кошелька; { k: 'chest', box, r, win } — закрытый сундук в запасы; { k: 'frame', id } — рамка облика.
   Запись с from и alt: до цикла from выдаётся alt (прах душ — со второго цикла) */
function resolve(D, x, o) {
  if (x.from && x.alt && (o.cycle | 0) < x.from) return resolve(D, x.alt, o);
  if (x.k === 'chest') return { k: 'chest', box: D.chestBox, r: chestR(D, o.cycle, x), win: x.win || 'step' };
  if (x.k === 'frame') return { k: 'frame', id: x.id };
  return { k: x.k, n: x.b != null ? scale(D, x.b, o.level) : x.n };
}

/* клетка ряда row ('free' | 'paid') на ступени t (1…tiers) */
const cell = (D, row, t, o) => ((D.rows[row] || [])[t - 1] || []).map(x => resolve(D, x, o));

/* очки дела в сотых очка пропуска */
function pts100(D, unit, n) {
  const U = D.units[unit];
  return U && n > 0 ? Math.floor(U.price * n * 100 / D.rate) : 0;
}

/* сколько единиц дела засчитать сегодня: дневной потолок единицы минус уже засчитанное */
function room(D, unit, usedToday) {
  const cap = D.caps[unit];
  return cap == null ? Infinity : Math.max(0, cap - (usedToday || 0));
}

/* цель сезона и потолок к дню d, в сотых */
const goal100 = D => D.tiers * D.tierPts * 100;
const capTo = (D, day) => Math.max(0, Math.min(D.season.days, day | 0)) * D.dayCap * 100;

/* сколько сотых прибавить: не выше потолка к дню и цели */
const add100 = (D, have100, want100, day) => Math.max(0, Math.min(want100, capTo(D, day) - have100, goal100(D) - have100));

/* ступень по очкам */
const tierOf = (D, have100) => Math.min(D.tiers, Math.floor(have100 / (D.tierPts * 100)));

/* лист даров: награда отметки m (1…marks) */
const mark = (D, m, o) => ((D.cal.list || [])[m - 1] || []).map(x => resolve(D, x, o));

/* веха листа: { n, art } или null */
const mile = (D, m) => (D.cal.miles || {})[m] || null;

const api = { BP, scale, chestR, resolve, cell, pts100, room, goal100, capTo, add100, tierOf, mark, mile };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (root) root.EnPass = api;
})(typeof window !== 'undefined' ? window : null);
