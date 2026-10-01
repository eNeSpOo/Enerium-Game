/* Ритуалы и рабочие — данные прототипа «Свет снизу» (GDD §19). Собирает tools/content-gen/rituals/build.js из калькуляторов
   экономики (capacity.json), сундуков, рецептов и таблиц Странника. Руками не править: пересборка затрёт правку.
   Черновик · предложение · ждёт автора. Числа — демонстрация, только целые; шансы — в базисных пунктах (10 000 = 100 %),
   время — в миллисекундах. rules — слоты, роллы, карточки, веса редкостей, ускорение рабочих, уникальный ритуал, пробуждение;
   tabs — вкладки: длительность по редкостям, бригада, награда за единицу времени, имена карточек; biomes — вес «перевеса к свежим»;
   art — артефакты ритуалов из wanderer.js; sim — прогон калькулятора: доход дня в сотых и доли от забегов обычного.
   Обоснование и таблицы — docs/content/ритуалы.md. В игре пул, старт, исход и выдачу решает сервер (§19, §36.16):
   клиент получает карточки и итог. Ниже данных — алгоритм tools/content-gen/rituals/pool.js как есть. */
window.EN_RITUALS = {"meta":{"builder":"tools/content-gen/rituals/build.js","draft":"docs/content/ритуалы.md","algorithm":"tools/content-gen/rituals/pool.js"},"rules":{"bp":10000,"hourMs":3600000,"open":{"level":10,"cycle":2},"slots":{"base":1,"art":"a14","step":2,"cap":7},"rolls":{"free":3,"art":"a15","step":1,"paid":[10,20,30,40,50]},"cards":{"base":3,"art":"a16","step":1},"rarW":[1200,1200,1300,1400,1500,1600,1800],"bands":[0,0,1,1,2,2,2],"speed":{"perRBp":200,"capBp":5000},"unique":{"chanceBp":100,"max":1,"r":7,"crew":5,"qty":1,"freeOnly":true},"awaken":{"soulsPerPct":25},"starter":[5,0,0,0,0,0,0],"shardsPer":10,"forge":{"need":10,"gold":[1000,2000,4000,8000,16000,32000],"cyc":[0,0,1,2,3,4,5]}},"tabs":{"work":{"n":"Рабочие","unitMs":1800000,"ms":[1800000,3600000,5400000,7200000,10800000,14400000,21600000],"crew":{"lo":[1,1,2,2,3,3,4],"hi":[1,2,2,3,3,4,5]},"basics":2,"keys":{"from":4,"per":4},"names":[["Короткая выборка","Сбор у входа","Просев песка","Мелкий разбор"],["Разбор завалов","Выборка из трещин","Тихая выработка","Сбор у стены"],["Долгая смена","Ночная артель","Глубокая выработка","Спуск за светом","Счёт камней","Выгребка до дна"]],"uniqueNames":["Следы погребённого","По следу хозяина","Там, где пал хозяин","Остывший трон"]},"hero":{"n":"Герои","unitMs":3600000,"ms":[3600000,7200000,10800000,14400000,21600000,28800000,43200000],"crew":{"lo":[1,1,2,2,3,3,4],"hi":[1,2,2,3,3,4,5]},"curH":10,"cur":[["gold",420],["spirit",840],["souls",10]],"names":[["Малый дозор","Слово у порога","Счёт песка","Смена караула"],["Дозор у пролома","Проводы вниз","Тихий караул","Свеча у часов"],["Долгая дорога","Бдение до рассвета","Вахта над проломом","Ночь у часов","Долгие проводы"]],"uniqueNames":[]}},"text":{"work":"Рабочие спускаются в уже открытый биом и выносят то, что там лежит.","hero":"Герои несут службу наверху, в Эндалоре, и возвращаются с золотом, духом и душами.","unique":"Рабочие идут по следу хозяина биома: его уникальный ресурс — наверняка.","law":"Провала нет: награда решена при старте и придёт, когда досыплется песок.","busy":"Участники заняты до конца: забеги, Эхо и клан их не получат. Арена и Лига — получат.","cancel":"Отмена освобождает участников сразу, но награды не будет, а ритуал из пула пропадёт."},"biomes":{"b1":{"n":1,"w":1,"cyc":1,"team":false},"b2":{"n":2,"w":2,"cyc":1,"team":false},"b3":{"n":3,"w":3,"cyc":2,"team":false},"b4":{"n":4,"w":4,"cyc":2,"team":false},"b5":{"n":5,"w":5,"cyc":3,"team":false},"b6":{"n":6,"w":6,"cyc":3,"team":false},"b7":{"n":7,"w":7,"cyc":4,"team":false},"b8":{"n":8,"w":8,"cyc":4,"team":false},"b9":{"n":9,"w":9,"cyc":5,"team":false},"b10":{"n":10,"w":10,"cyc":5,"team":false},"b11":{"n":11,"w":11,"cyc":6,"team":true},"b12":{"n":12,"w":12,"cyc":6,"team":true}},"art":{"slots":{"id":"a14","n":"Караванный шатёр","d":"+2 слота ритуалов","step":2,"lv":3,"from":2,"gold":30000,"soul":500,"max":"1 → 7"},"rolls":{"id":"a15","n":"Дорожная карта","d":"+1 бесплатный ролл пула ритуалов","step":1,"lv":3,"from":2,"gold":10000,"soul":250,"max":"3 → 6"},"cards":{"id":"a16","n":"Вторая тропа","d":"+1 вариант при ролле ритуала","step":1,"lv":2,"from":3,"gold":35000,"soul":700,"max":"+2"}},"memory":[{"id":"p21","n":"Духова доля","d":"Дух из героических ритуалов +5%","r":1},{"id":"p22","n":"Золотая доля","d":"Золото из героических ритуалов +5%","r":1},{"id":"p38","n":"Знакомая артель","d":"Ускорение ритуала от редкости рабочих +5% (относительно)","r":1},{"id":"p40","n":"Подгоняющий шёпот","d":"Все ритуалы короче на 1%","r":1},{"id":"p47","n":"Щедрый час","d":"1% шанс двойной валюты с героического ритуала","r":1},{"id":"p49","n":"Дешёвые руки","d":"Цена активации рабочего душами −5%","r":1},{"id":"p72","n":"Полная доля","d":"Золото из героических ритуалов +10%","r":2},{"id":"p73","n":"Щедрая доля","d":"Дух из героических ритуалов +10%","r":2},{"id":"p85","n":"Сработанная артель","d":"Ускорение ритуала от редкости рабочих +10% (относительно)","r":2},{"id":"p88","n":"Скорый сговор","d":"Все ритуалы короче на 3%","r":2},{"id":"p93","n":"Артельная скидка","d":"Цена активации рабочего душами −10%","r":2},{"id":"p94","n":"Второй заход","d":"+1 бесплатный ролл пула ритуалов в день","r":2},{"id":"p95","n":"Добрый час","d":"3% шанс двойной валюты с героического ритуала","r":2},{"id":"p98","n":"Старшина артели","d":"Цена активации рабочего душами −15%","r":3},{"id":"p118","n":"Быстрый караван","d":"Все ритуалы короче на 5%","r":3},{"id":"p119","n":"Душевная доля","d":"Души из героических ритуалов +5%","r":3},{"id":"p134","n":"Звёздный час","d":"5% шанс двойной валюты с героического ритуала","r":3},{"id":"p145","n":"Караванный сговор","d":"+1 слот ритуалов","r":4},{"id":"p151","n":"Гильдия теней","d":"Цена активации рабочего душами −25%","r":4},{"id":"p152","n":"Третий заход","d":"+2 бесплатных ролла пула ритуалов в день","r":4},{"id":"p162","n":"Ветер в спину","d":"Все ритуалы короче на 10%","r":4},{"id":"p164","n":"Обильная доля","d":"Души из героических ритуалов +10%","r":4},{"id":"p169","n":"Старшины каравана","d":"+2 слота ритуалов","r":5},{"id":"p193","n":"Караван Этриона","d":"+3 слота ритуалов и все ритуалы короче на 10%","r":6}],"heroAwaken":800,"sim":{"2":{"o":{"gold":275350,"spirit":550700,"souls":6556,"basics":3608,"keys":436,"uniq":6,"rituals":594,"shareBp":{"gold":800,"spirit":800,"souls":825,"basics":1953}},"e":{"gold":261650,"spirit":523300,"souls":6230,"basics":5425,"keys":588,"uniq":11,"rituals":955,"shareBp":{"gold":253,"spirit":253,"souls":252,"basics":1064}},"z":{"gold":242650,"spirit":485300,"souls":5777,"basics":3669,"keys":443,"uniq":5,"rituals":579,"shareBp":{"gold":4230,"spirit":4230,"souls":4361,"basics":11916}},"p":{"gold":283900,"spirit":567800,"souls":6760,"basics":3880,"keys":481,"uniq":6,"rituals":591,"shareBp":{"gold":825,"spirit":825,"souls":851,"basics":2101}}},"3":{"o":{"gold":807333,"spirit":1614667,"souls":19222,"basics":3677,"keys":443,"uniq":5,"rituals":982,"shareBp":{"gold":1118,"spirit":1118,"souls":1037,"basics":1239}},"e":{"gold":780652,"spirit":1561303,"souls":18587,"basics":6546,"keys":711,"uniq":6,"rituals":1567,"shareBp":{"gold":412,"spirit":412,"souls":383,"basics":830}},"z":{"gold":512727,"spirit":1025453,"souls":12208,"basics":7397,"keys":885,"uniq":8,"rituals":982,"shareBp":{"gold":4261,"spirit":4261,"souls":3950,"basics":14949}},"p":{"gold":854968,"spirit":1709937,"souls":20356,"basics":4007,"keys":499,"uniq":5,"rituals":989,"shareBp":{"gold":1184,"spirit":1184,"souls":1098,"basics":1350}}},"4":{"o":{"gold":1401790,"spirit":2803580,"souls":33376,"basics":7124,"keys":860,"uniq":9,"rituals":1389,"shareBp":{"gold":1335,"spirit":1335,"souls":1200,"basics":1783}},"e":{"gold":1302772,"spirit":2605543,"souls":31018,"basics":11463,"keys":1272,"uniq":12,"rituals":2208,"shareBp":{"gold":466,"spirit":466,"souls":419,"basics":1077}},"z":{"gold":872327,"spirit":1744655,"souls":20770,"basics":11757,"keys":1407,"uniq":15,"rituals":1377,"shareBp":{"gold":4983,"spirit":4983,"souls":4478,"basics":17653}},"p":{"gold":1441702,"spirit":2883403,"souls":34326,"basics":7970,"keys":995,"uniq":11,"rituals":1393,"shareBp":{"gold":1373,"spirit":1373,"souls":1234,"basics":1995}}},"5":{"o":{"gold":1747503,"spirit":3495005,"souls":41607,"basics":7092,"keys":855,"uniq":10,"rituals":1389,"shareBp":{"gold":1268,"spirit":1268,"souls":1118,"basics":1436}},"e":{"gold":1633238,"spirit":3266475,"souls":38887,"basics":11562,"keys":1287,"uniq":13,"rituals":2210,"shareBp":{"gold":446,"spirit":446,"souls":393,"basics":879}},"z":{"gold":1246096,"spirit":2492191,"souls":29669,"basics":10291,"keys":1234,"uniq":14,"rituals":1377,"shareBp":{"gold":5425,"spirit":5425,"souls":4781,"basics":12496}},"p":{"gold":1802507,"spirit":3605014,"souls":42917,"basics":8001,"keys":999,"uniq":10,"rituals":1393,"shareBp":{"gold":1308,"spirit":1308,"souls":1153,"basics":1620}}},"6":{"o":{"gold":2099896,"spirit":4199792,"souls":49998,"basics":7076,"keys":853,"uniq":10,"rituals":1389,"shareBp":{"gold":1241,"spirit":1241,"souls":1081,"basics":1208}},"e":{"gold":1958216,"spirit":3916432,"souls":46624,"basics":11576,"keys":1290,"uniq":13,"rituals":2209,"shareBp":{"gold":434,"spirit":434,"souls":379,"basics":742}},"z":{"gold":1706846,"spirit":3413692,"souls":40639,"basics":8771,"keys":1051,"uniq":12,"rituals":1377,"shareBp":{"gold":6049,"spirit":6049,"souls":5272,"basics":8985}},"p":{"gold":2164603,"spirit":4329206,"souls":51538,"basics":8002,"keys":999,"uniq":10,"rituals":1394,"shareBp":{"gold":1279,"spirit":1279,"souls":1114,"basics":1366}}}},"forge":{"2":{"o":{"artel":[1100,1100],"t5":[1000,1000],"speed":[761,761],"forges":0,"gold":0},"e":{"artel":[1600,1600],"t5":[1600,1600],"speed":[922,922],"forges":0,"gold":0}},"3":{"o":{"artel":[5700,2100],"t5":[3400,3400],"speed":[2028,2043],"forges":400,"gold":11111},"e":{"artel":[9800,1700],"t5":[4000,4000],"speed":[2289,2292],"forges":900,"gold":35556}},"4":{"o":{"artel":[29000,2900],"t5":[5000,5000],"speed":[3063,3110],"forges":2500,"gold":49432},"e":{"artel":[45200,3800],"t5":[5000,5000],"speed":[3089,3115],"forges":3700,"gold":92045}},"5":{"o":{"artel":[79000,4300],"t5":[5000,5000],"speed":[4063,4100],"forges":5400,"gold":135417},"e":{"artel":[121500,3600],"t5":[5000,5000],"speed":[3720,3815],"forges":8500,"gold":306250}},"6":{"o":{"artel":[139700,4700],"t5":[5000,5000],"speed":[4473,4493],"forges":6700,"gold":363441},"e":{"artel":[213700,7600],"t5":[5000,5000],"speed":[4096,4119],"forges":9800,"gold":634409}}}};
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

/* Награда карточки — количества, без бросков: у героев валюта за curH единиц времени × цикл аккаунта на старте, вниз до целого;
   у рабочих — базовые за единицу, ключи биома — с редкости keys.from, один за keys.per единиц; уникальный ритуал — только уникальный */
function amount(D, card, cyc) {
  const T = D.tabs[card.tab], u = card.ms / T.unitMs;
  if (card.tab === 'hero') return { cur: T.cur.map(([k, per]) => [k, Math.floor(per * u * cyc / (T.curH || 1))]), basics: 0, keys: 0, uniq: 0 };
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
