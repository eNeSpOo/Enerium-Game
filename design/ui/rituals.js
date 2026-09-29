/* Ритуалы и рабочие — данные прототипа «Свет снизу» (GDD §19). Собирает tools/content-gen/rituals/build.js из калькуляторов
   экономики (capacity.json), сундуков, рецептов и таблиц Странника. Руками не править: пересборка затрёт правку.
   Черновик · предложение · ждёт автора. Числа — демонстрация, только целые; шансы — в базисных пунктах (10 000 = 100 %),
   время — в миллисекундах. rules — слоты, роллы, карточки, веса редкостей, ускорение рабочих, уникальный ритуал, пробуждение;
   tabs — вкладки: длительность по редкостям, бригада, награда за единицу времени, имена карточек; biomes — вес «перевеса к свежим»;
   art — артефакты ритуалов из wanderer.js; sim — прогон калькулятора: доход дня в сотых и доли от забегов обычного.
   Обоснование и таблицы — docs/content/ритуалы.md. В игре пул, старт, исход и выдачу решает сервер (§19, §36.16):
   клиент получает карточки и итог. Ниже данных — алгоритм tools/content-gen/rituals/pool.js как есть. */
window.EN_RITUALS = {"meta":{"builder":"tools/content-gen/rituals/build.js","draft":"docs/content/ритуалы.md","algorithm":"tools/content-gen/rituals/pool.js"},"rules":{"bp":10000,"hourMs":3600000,"open":{"level":10,"cycle":2},"slots":{"base":1,"art":"a14","step":2,"cap":7},"rolls":{"free":3,"art":"a15","step":1,"paid":[10,20,30,40,50]},"cards":{"base":3,"art":"a16","step":1},"rarW":[1200,1200,1300,1400,1500,1600,1800],"bands":[0,0,1,1,2,2,2],"speed":{"perRBp":200,"capBp":5000},"unique":{"chanceBp":100,"max":1,"r":7,"crew":5,"qty":1,"freeOnly":true},"awaken":{"soulsPerPct":25},"starter":[5,0,0,0,0,0,0],"shardsPer":10,"forge":{"need":3,"gold":[1000,2000,4000,8000,16000,32000],"cyc":[0,0,1,2,3,4,5]}},"tabs":{"work":{"n":"Рабочие","unitMs":1800000,"ms":[1800000,3600000,5400000,7200000,10800000,14400000,21600000],"crew":{"lo":[1,1,2,2,3,3,4],"hi":[1,2,2,3,3,4,5]},"basics":2,"keys":{"from":4,"per":4},"names":[["Короткая выборка","Сбор у входа","Просев песка","Мелкий разбор"],["Разбор завалов","Выборка из трещин","Тихая выработка","Сбор у стены"],["Долгая смена","Ночная артель","Глубокая выработка","Спуск за светом","Счёт камней","Выгребка до дна"]],"uniqueNames":["Следы погребённого","По следу хозяина","Там, где пал хозяин","Остывший трон"]},"hero":{"n":"Герои","unitMs":3600000,"ms":[3600000,7200000,10800000,14400000,21600000,28800000,43200000],"crew":{"lo":[1,1,2,2,3,3,4],"hi":[1,2,2,3,3,4,5]},"curH":10,"cur":[["gold",750],["spirit",1500],["souls",18]],"names":[["Малый дозор","Слово у порога","Счёт песка","Смена караула"],["Дозор у пролома","Проводы вниз","Тихий караул","Свеча у часов"],["Долгая дорога","Бдение до рассвета","Вахта над проломом","Ночь у часов","Долгие проводы"]],"uniqueNames":[]}},"text":{"work":"Рабочие спускаются в уже открытый биом и выносят то, что там лежит.","hero":"Герои несут службу наверху, в Эндалоре, и возвращаются с золотом, духом и душами.","unique":"Рабочие идут по следу хозяина биома: его уникальный ресурс — наверняка.","law":"Провала нет: награда решена при старте и придёт, когда досыплется песок.","busy":"Участники заняты до конца: забеги, Эхо и клан их не получат. Арена и Лига — получат.","cancel":"Отмена освобождает участников сразу, но награды не будет, а ритуал из пула пропадёт."},"biomes":{"b1":{"n":1,"w":1,"cyc":1,"team":false},"b2":{"n":2,"w":2,"cyc":1,"team":false},"b3":{"n":3,"w":3,"cyc":2,"team":false},"b4":{"n":4,"w":4,"cyc":2,"team":false},"b5":{"n":5,"w":5,"cyc":3,"team":false},"b6":{"n":6,"w":6,"cyc":3,"team":false},"b7":{"n":7,"w":7,"cyc":4,"team":false},"b8":{"n":8,"w":8,"cyc":4,"team":false},"b9":{"n":9,"w":9,"cyc":5,"team":false},"b10":{"n":10,"w":10,"cyc":5,"team":false},"b11":{"n":11,"w":11,"cyc":6,"team":true},"b12":{"n":12,"w":12,"cyc":6,"team":true}},"art":{"slots":{"id":"a14","n":"Караванный шатёр","d":"+2 слота ритуалов","step":2,"lv":3,"from":2,"gold":30000,"soul":500,"max":"1 → 7"},"rolls":{"id":"a15","n":"Дорожная карта","d":"+1 бесплатный ролл пула ритуалов","step":1,"lv":3,"from":2,"gold":10000,"soul":250,"max":"3 → 6"},"cards":{"id":"a16","n":"Вторая тропа","d":"+1 вариант при ролле ритуала","step":1,"lv":2,"from":3,"gold":35000,"soul":700,"max":"+2"}},"memory":[{"id":"p21","n":"Духова доля","d":"Дух из героических ритуалов +5%","r":1},{"id":"p22","n":"Золотая доля","d":"Золото из героических ритуалов +5%","r":1},{"id":"p38","n":"Знакомая артель","d":"Ускорение ритуала от редкости рабочих +5% (относительно)","r":1},{"id":"p40","n":"Подгоняющий шёпот","d":"Все ритуалы короче на 1%","r":1},{"id":"p47","n":"Щедрый час","d":"1% шанс двойной валюты с героического ритуала","r":1},{"id":"p49","n":"Дешёвые руки","d":"Цена активации рабочего душами −5%","r":1},{"id":"p72","n":"Полная доля","d":"Золото из героических ритуалов +10%","r":2},{"id":"p73","n":"Щедрая доля","d":"Дух из героических ритуалов +10%","r":2},{"id":"p85","n":"Сработанная артель","d":"Ускорение ритуала от редкости рабочих +10% (относительно)","r":2},{"id":"p88","n":"Скорый сговор","d":"Все ритуалы короче на 3%","r":2},{"id":"p93","n":"Артельная скидка","d":"Цена активации рабочего душами −10%","r":2},{"id":"p94","n":"Второй заход","d":"+1 бесплатный ролл пула ритуалов в день","r":2},{"id":"p95","n":"Добрый час","d":"3% шанс двойной валюты с героического ритуала","r":2},{"id":"p98","n":"Старшина артели","d":"Цена активации рабочего душами −15%","r":3},{"id":"p118","n":"Быстрый караван","d":"Все ритуалы короче на 5%","r":3},{"id":"p119","n":"Душевная доля","d":"Души из героических ритуалов +5%","r":3},{"id":"p134","n":"Звёздный час","d":"5% шанс двойной валюты с героического ритуала","r":3},{"id":"p145","n":"Караванный сговор","d":"+1 слот ритуалов","r":4},{"id":"p151","n":"Гильдия теней","d":"Цена активации рабочего душами −25%","r":4},{"id":"p152","n":"Третий заход","d":"+2 бесплатных ролла пула ритуалов в день","r":4},{"id":"p162","n":"Ветер в спину","d":"Все ритуалы короче на 10%","r":4},{"id":"p164","n":"Обильная доля","d":"Души из героических ритуалов +10%","r":4},{"id":"p169","n":"Старшины каравана","d":"+2 слота ритуалов","r":5},{"id":"p193","n":"Караван Этриона","d":"+3 слота ритуалов и все ритуалы короче на 10%","r":6}],"heroAwaken":800,"sim":{"2":{"o":{"gold":491696,"spirit":983393,"souls":11584,"basics":3608,"keys":436,"uniq":6,"rituals":594,"shareBp":{"gold":1172,"spirit":1172,"souls":1156,"basics":1533}},"e":{"gold":467232,"spirit":934464,"souls":10910,"basics":5425,"keys":588,"uniq":11,"rituals":955,"shareBp":{"gold":363,"spirit":363,"souls":342,"basics":832}},"z":{"gold":433304,"spirit":866607,"souls":10193,"basics":3669,"keys":443,"uniq":5,"rituals":579,"shareBp":{"gold":6194,"spirit":6194,"souls":6104,"basics":9350}},"p":{"gold":506964,"spirit":1013929,"souls":11949,"basics":3880,"keys":481,"uniq":6,"rituals":591,"shareBp":{"gold":1208,"spirit":1208,"souls":1193,"basics":1648}}},"3":{"o":{"gold":1454732,"spirit":2909464,"souls":34568,"basics":3654,"keys":442,"uniq":6,"rituals":981,"shareBp":{"gold":1380,"spirit":1380,"souls":1234,"basics":1035}},"e":{"gold":1376339,"spirit":2752679,"souls":32556,"basics":5948,"keys":627,"uniq":9,"rituals":1547,"shareBp":{"gold":419,"spirit":419,"souls":361,"basics":567}},"z":{"gold":921071,"spirit":1842143,"souls":21868,"basics":7228,"keys":863,"uniq":10,"rituals":980,"shareBp":{"gold":5240,"spirit":5240,"souls":4681,"basics":12279}},"p":{"gold":1535536,"spirit":3071071,"souls":36521,"basics":4072,"keys":507,"uniq":5,"rituals":992,"shareBp":{"gold":1456,"spirit":1456,"souls":1303,"basics":1153}}},"4":{"o":{"gold":2490476,"spirit":4980952,"souls":59321,"basics":7148,"keys":864,"uniq":10,"rituals":1390,"shareBp":{"gold":1329,"spirit":1329,"souls":1134,"basics":1518}},"e":{"gold":2241786,"spirit":4483571,"souls":53065,"basics":10663,"keys":1156,"uniq":14,"rituals":2136,"shareBp":{"gold":383,"spirit":383,"souls":315,"basics":762}},"z":{"gold":1552976,"spirit":3105952,"souls":36954,"basics":11620,"keys":1389,"uniq":15,"rituals":1372,"shareBp":{"gold":4970,"spirit":4970,"souls":4238,"basics":14805}},"p":{"gold":2575238,"spirit":5150476,"souls":61361,"basics":7885,"keys":983,"uniq":13,"rituals":1392,"shareBp":{"gold":1374,"spirit":1374,"souls":1173,"basics":1675}}},"5":{"o":{"gold":3135714,"spirit":6271429,"souls":75257,"basics":7048,"keys":849,"uniq":11,"rituals":1389,"shareBp":{"gold":1071,"spirit":1071,"souls":895,"basics":1198}},"e":{"gold":2899851,"spirit":5799702,"souls":69596,"basics":11367,"keys":1262,"uniq":11,"rituals":2202,"shareBp":{"gold":317,"spirit":317,"souls":257,"basics":650}},"z":{"gold":2217262,"spirit":4434524,"souls":53214,"basics":10172,"keys":1218,"uniq":11,"rituals":1377,"shareBp":{"gold":4541,"spirit":4541,"souls":3797,"basics":10368}},"p":{"gold":3211607,"spirit":6423214,"souls":77079,"basics":8076,"keys":1008,"uniq":6,"rituals":1394,"shareBp":{"gold":1096,"spirit":1096,"souls":917,"basics":1372}}},"6":{"o":{"gold":3756250,"spirit":7512500,"souls":89615,"basics":6888,"keys":827,"uniq":10,"rituals":1390,"shareBp":{"gold":891,"spirit":891,"souls":727,"basics":975}},"e":{"gold":3565893,"spirit":7131786,"souls":84952,"basics":11383,"keys":1263,"uniq":15,"rituals":2206,"shareBp":{"gold":271,"spirit":271,"souls":214,"basics":542}},"z":{"gold":3034464,"spirit":6068929,"souls":72359,"basics":8852,"keys":1063,"uniq":11,"rituals":1379,"shareBp":{"gold":4316,"spirit":4316,"souls":3520,"basics":7519}},"p":{"gold":3873750,"spirit":7747500,"souls":92429,"basics":8034,"keys":1003,"uniq":13,"rituals":1391,"shareBp":{"gold":918,"spirit":918,"souls":750,"basics":1138}}}},"forge":{"2":{"o":{"artel":[1100,1100],"t5":[1000,1000],"speed":[761,761],"forges":0,"gold":0},"e":{"artel":[1800,1200],"t5":[1800,2200],"speed":[1096,1155],"forges":300,"gold":21429}},"3":{"o":{"artel":[2200,1200],"t5":[2200,2200],"speed":[1399,1531],"forges":500,"gold":47619},"e":{"artel":[3800,1267],"t5":[3200,3200],"speed":[1827,1857],"forges":967,"gold":146032}},"4":{"o":{"artel":[3500,1400],"t5":[3200,3200],"speed":[1860,2048],"forges":550,"gold":128571},"e":{"artel":[5900,1500],"t5":[3600,4000],"speed":[2180,2459],"forges":900,"gold":371429}},"5":{"o":{"artel":[4800,1217],"t5":[3800,4000],"speed":[2505,2705],"forges":692,"gold":412698},"e":{"artel":[8300,1500],"t5":[4600,5000],"speed":[2782,3051],"forges":1200,"gold":1180952}},"6":{"o":{"artel":[6100,1350],"t5":[4800,5000],"speed":[3118,3293],"forges":575,"gold":809524},"e":{"artel":[10500,1500],"t5":[5000,5000],"speed":[3418,3632],"forges":1100,"gold":2857143}}}};
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
