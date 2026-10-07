/* Энериум бесплатного игрока — калькулятор к docs/content/экономика-энериум.md. Решение автора 30.09.2026 (ADR-0033):
   «Доступны, потому что мы продумаем систему так, что игрок по немногу сможет получать энериум и копить его. Как на героев за энериум,
   так и на рулетку, со временем он сможет на всё накопить». Друза — только по лестнице: 100 Энериума → кристалл, 100 кристаллов → друза.
   Слово автора 30.09.2026, ночь (ответ на ADR-0034): «Я думал от 25 - 50 + -, + реклама за просмотр которой тоже будет даться энериум,
   на её не много, от 10 в день»; «Боевой пропуск делать за деньги»; сегменты — «не донатеров от 100р на средних от 500+ и на 2500+».
   Слово автора 02.10.2026 (ADR-0047): «1 рубль = 1 Энериум» — курс витрины вдвое ниже прежнего; ручеёк бесплатного игрока и цены
   за Энериум не меняются, покупки дают вдвое меньше Энериума за те же рубли. Слово автора 06.10.2026 (ADR-0054): ×2 разовых
   наборов — только самой первой покупке, набор выбирает игрок; у комплекта Энериума ×2 — раз на комплект. Числа — демонстрация.

   Что считает:
   1. Доход Энериума по источникам — в день и за цикл, у обычного, увлечённого и плательщика при времени обычного (ADR-0031):
      - лист «Дар дня» — design/ui/pass.js, cal: Энериум листа из 30 отметок, отметка — в день входа в игру;
      - бесплатный ряд пропуска — pass.js, rows.free: за сезон, ряд проходят все три профиля (прогон пропуска, econ.pace);
      - контракты эпической редкости и выше — design/ui/contracts.js, econ[цикл][профиль].en: Энериум за неделю по прогону контрактов;
      - Арена, суточный топ-100 — design/ui/arena.js, model.prof: Энериум за неделю по прогону на 5 000 игроках;
      - реклама по желанию — design/ui/store.js, ads: сверх ручейка, у того, кто смотрит;
      - покупки — сегменты автора (SEGS): выдача, платный ряд пропуска за деньги, комплекты Энериума, разовые наборы — витрина
        design/ui/store.js.
   2. Крафт обычного — модель стока (design/ui/recipes.js, stats.sink): Энериум, который уходит в призывы за день, и возврат — победа над
      призванным врагом (drops.craftBosses, enerium) × призывов в день по смеси стока (tools/content-gen/recipes/common.js, SINK).
      Кристаллы циклов V–VI модель стока растит из зелёных крупиц — в Энериум кошелька их не пересчитываем.
   3. Цели — дни копилки с начала цикла II: первый донатный герой, весь донатный сет цикла, прокрутка «Возрождения душ» и десять,
      кристалл и друза. У обычного — с рекламой и без, с призывами крафта; у плательщика — по сегментам автора.
   4. «Порядка трети» (§9.3): доля бесплатного Энериума обычного в Энериуме плательщика-мерки (THIRD) — пропуск и ежедневная выдача.
   5. Законы — LAWS ниже; любое нарушение — ошибка, таблицы не пишутся.

   Читает: design/ui/pass.js, store.js, contracts.js, arena.js, recipes.js, roster.js, tools/content-gen/contracts/capacity.json (дни
   циклов), tools/content-gen/recipes/common.js (смесь призывов стока). Своих данных игры не пишет: только таблицы черновиков между метками
   «<!-- @таблица имя -->» и «<!-- /таблица имя -->» — docs/content/экономика-энериум.md и таблицу segments в docs/content/монетизация.md;
   текст вокруг — ручной. Порядок сборки — после пропуска и Лавки (шаг 9). Только целые: доход — сотые Энериума в день.
   Запуск: node tools/content-gen/economy/enerium.js           — посчитать и вписать таблицы;
           node tools/content-gen/economy/enerium.js --check   — только проверить законы и свежесть таблиц;
           node tools/content-gen/economy/enerium.js --print   — таблицы в консоль;
           node tools/content-gen/economy/enerium.js --json    — ручеёк игрой по профилям и циклам (сотые в день) и цены донатных героев:
                                                                 вход калькулятора подъёма (cycle/climb.py — донатный сет за накопленный Энериум). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');
const FILES = {
  pass: path.join(UI, 'pass.js'), store: path.join(UI, 'store.js'), contracts: path.join(UI, 'contracts.js'), arena: path.join(UI, 'arena.js'),
  recipes: path.join(UI, 'recipes.js'), roster: path.join(UI, 'roster.js'),
  cap: path.join(ROOT, 'tools', 'content-gen', 'contracts', 'capacity.json'),
  doc: path.join(ROOT, 'docs', 'content', 'экономика-энериум.md'),
  money: path.join(ROOT, 'docs', 'content', 'монетизация.md'),
};
const COMMON = require('../recipes/common.js');

/* ================================ ДАННЫЕ ================================ */

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const CYCLES = [2, 3, 4, 5, 6];   // контракты, Арена и пропуск — с цикла II (§16); цикл I — обучение на часы

/* Профили. login — дней входа в неделю: отметка листа даров берётся в день входа; обычный один день в неделю не играет — как в прогонах
   контрактов и пропуска. ct, ar — профиль прогона контрактов и Арены. craft — модель стока (она у обычного) */
const PROF = {
  o: { n: 'обычный', login: 6, ct: 'o', ar: 'free', craft: true },
  e: { n: 'увлечённый', login: 7, ct: 'e', ar: 'fan' },
  p: { n: 'плательщик', login: 6, ct: 'p', ar: 'payer' },
};

/* Сегменты автора — «не донатеров от 100р на средних от 500+ и на 2500+». Время обычного, игрой — как плательщик (p). Что покупает:
   subs — выдача (каждые 30 дней, пока идёт), pass — платный ряд пропуска каждый сезон, packs — [комплект Энериума, раз в сколько
   дней], первая покупка комплекта ×2 — один раз на комплект; chain — сколько разовых наборов берёт в первый день цикла II, с первого
   по N-й. Удвоение разовых наборов — одно, самой первой покупке (ADR-0054): игрок выбирает сам, расчёт берёт лучший для него случай —
   первым куплен самый большой из взятых. Это образы для расчёта, а не потолок: объём покупки Энериума не ограничен (§1.2), ×1,7
   прогресса держат души и дневные капы */
const SEGS = {
  s: { n: 'от 100 ₽', subs: ['sub1'], pass: false, packs: [], chain: 1 },
  m: { n: 'от 500 ₽', subs: ['sub1'], pass: true, packs: [], chain: 3 },
  l: { n: 'от 2 500 ₽', subs: ['sub3'], pass: true, packs: [['en4', 28]], chain: 5 },
};
/* Мерка «порядка трети» (§9.3) — решение координатора по ADR-0047, п. 3: плательщик с пропуском и ежедневной выдачей. С ним сверяется
   доля бесплатного Энериума обычного. Разовых наборов и комплектов мерка не берёт: это ровный месячный платёж. rub — расход в месяц,
   как он записан в решении и в §9.3: цена пропуска или выдачи разошлась с ним — закон падает, текст правится вместе с данными */
const THIRD = { n: 'пропуск и ежедневная выдача', subs: ['sub2'], pass: true, packs: [], chain: 0, rub: 748 };

/* Цели Энериума. cost — функция данных игры; perCycle — цель повторяется каждый цикл (донатный сет открывается с каждым циклом, ADR-0021).
   Платный ряд пропуска больше не цель ручейка: он продаётся за деньги (слово автора 30.09.2026) */
const GOALS = [
  { id: 'hero1', n: 'Первый донатный герой цикла', cost: X => X.donat[0], perCycle: true },
  { id: 'heroSet', n: 'Весь донатный сет цикла — пятеро', cost: X => X.donat.reduce((a, v) => a + v, 0), perCycle: true },
  { id: 'spin', n: 'Прокрутка «Возрождения душ»', cost: X => X.spin },
  { id: 'spin10', n: 'Десять прокруток «Возрождения душ»', cost: X => X.spin * 10 },
  { id: 'crystal', n: 'Кристалл Энериума — призыв цикла V', cost: X => X.step },
  { id: 'drusa', n: 'Друза Энериума — пробуждённый призыв V–VI', cost: X => X.step * X.step },
];

/* Законы ручейка. Дни — с начала цикла II, обычный копит весь бесплатный Энериум, без рекламы */
const LAWS = {
  hero1Days: 7,       // первого донатного героя цикла II обычный берёт за первую неделю цикла: «по немногу», но с первых дней
  spinDays: 4,        // прокрутка «Возрождения душ» — не реже раза в четыре дня
  heroSetDays: 70,    // весь донатный сет — за два-три цикла: «со временем он сможет на всё накопить»
  drusaDays: 365,     // друза — за год копилки: самая дорогая вещь лестницы остаётся целью, а не подарком
  dayRange: [25, 50], // обычный игрой в день, каждый цикл II–VI — слово автора: «от 25 - 50 + -»; реклама — сверху
  x17: 170,           // плательщик при том же времени добывает игрой не больше ×1,7 Энериума обычного (§1.2): покупки — отдельно
  thirdMaxBp: 5000,   // бесплатный Энериум обычного — не больше половины Энериума плательщика-мерки с покупками (§9.3: «порядка трети»)
  horizon: 1100,      // дней счёта целей: горизонт, за которым цель считается недостижимой
};

/* ================================ РАСЧЁТ ================================ */

const loadJs = (file, name) => { const c = { window: {} }; c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync(file, 'utf8'), c); return c[name]; };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const d100 = x => { const s = x < 0 ? '−' : '', a = Math.abs(x), i = Math.floor(a / 100), f = a % 100; return s + fmt(i) + (f ? ',' + String(f).padStart(2, '0').replace(/0$/, '') : ''); };
const ratio = (a, b) => b ? (Math.floor(a * 100 / b) / 100).toFixed(2).replace('.', ',') : '—';
const usd = c => `$${Math.floor(c / 100)},${String(c % 100).padStart(2, '0')}`;

function build() {
  const err = [], warn = [];
  const PS = loadJs(FILES.pass, 'EN_PASS'), ST = loadJs(FILES.store, 'EN_STORE'), CT = loadJs(FILES.contracts, 'EN_CONTRACTS'), AR = loadJs(FILES.arena, 'EN_ARENA');
  const RX = loadJs(FILES.recipes, 'EN_RECIPES'), RS = loadJs(FILES.roster, 'EN_ROSTER');
  const CAP = JSON.parse(fs.readFileSync(FILES.cap, 'utf8'));
  if (!PS || !ST || !CT || !AR || !RX || !RS) return { err: ['нет данных: pass.js, store.js, contracts.js, arena.js, recipes.js или roster.js'], warn };

  /* --- дни циклов: II и III — прогон ёмкости, IV–VI — как III (как у ритуалов и модели стока) --- */
  const days = {};
  for (const c of CYCLES) days[c] = CAP.cycleDays[String(c)] || CAP.cycleDays[String(Math.min(c, 3))];
  const cycleAt = d => { let s = 0; for (const c of CYCLES) { s += days[c]; if (d <= s) return c; } return CYCLES[CYCLES.length - 1]; };

  /* --- источники: сотые Энериума в день --- */
  const enOf = list => list.reduce((a, cell) => a + cell.filter(x => x.k === 'enerium').reduce((b, x) => b + x.n, 0), 0);
  const calSheet = enOf(PS.cal.list), freeRow = enOf(PS.rows.free), paidRow = enOf(PS.rows.paid);
  const ads100 = ST.ads.perView * ST.ads.dayCap * 100;
  const src = {};
  for (const [pid, P] of Object.entries(PROF)) {
    src[pid] = {};
    for (const c of CYCLES) {
      const ct = CT.econ[c] && CT.econ[c][P.ct], ar = AR.model.prof[P.ar];
      if (!ct || ct.en == null) { err.push(`contracts.js: нет Энериума прогона — цикл ${ROMAN[c]}, профиль ${P.ct}`); continue; }
      if (!ar || ar.en == null) { err.push(`arena.js: нет Энериума топа — профиль ${P.ar}`); continue; }
      const s = {
        cal: Math.floor(calSheet * P.login * 100 / (7 * PS.cal.marks)),
        pass: Math.floor(freeRow * 100 / PS.season.days),
        ct: Math.floor(ct.en * 100 / 7),
        ar: Math.floor(ar.en / 7),
      };
      s.play = s.cal + s.pass + s.ct + s.ar;
      src[pid][c] = s;
    }
  }
  if (err.length) return { err, warn };

  /* --- крафт обычного: расход призывов и возврат победы (модель стока) --- */
  const MIX = COMMON.SINK.summonMixBp, sink = Object.fromEntries(RX.stats.sink.map(r => [r.cyc, r]));
  const craft = {};
  for (const c of CYCLES) {
    const s = sink[c], bosses = RX.drops.craftBosses.filter(b => b.cyc === c);
    const avg = kinds => { const l = bosses.filter(b => kinds.includes(b.kind)); return l.length ? Math.floor(l.reduce((a, b) => a + b.enerium, 0) / l.length) : 0; };
    const back = Math.floor(s.summonsX100 * (MIX.craft * avg(['ruin']) + MIX.memory * avg(['memory']) + MIX.city * avg(['city'])) / 10000);
    craft[c] = { spend: s.enerDirectX100, back, crystals: s.ener2X100 };
  }

  /* --- покупки сегментов и мерки: Энериум в день d (целые), расход за 4 недели --- */
  const packEn = id => { const p = ST.packs.find(x => x.id === id); return p ? Math.floor(p.en * (10000 + (p.bonusBp || 0)) / 10000) : 0; };
  const setEn = s => (s.get.find(x => x[0] === 'enerium') || [0, 0])[1];
  function buys(who, G) {
    const subs = G.subs.map(id => ST.subs.find(x => x.id === id)).filter(Boolean);
    if (subs.length !== G.subs.length) err.push(`${who}: нет выдачи ${G.subs.join(', ')} в store.js`);
    const packs = G.packs.map(([id, every]) => ({ id, every, P: ST.packs.find(x => x.id === id) })).filter(x => x.P);
    if (packs.length !== G.packs.length) err.push(`${who}: нет набора Энериума в store.js`);
    /* разовые наборы: с первого по N-й, все в первый день цикла II. Удвоение — одно, самой первой покупке: достаётся самому большому
       из взятых (chainTop), остальные приходят как есть */
    const steps = ST.chain.steps.slice(0, G.chain);
    if (steps.length !== G.chain) err.push(`${who}: в store.js меньше ${G.chain} разовых наборов`);
    const chainTop = steps.reduce((a, s) => (!a || setEn(s) > setEn(a) ? s : a), null);
    const chainEn = steps.reduce((a, s) => a + setEn(s), 0) + (chainTop ? setEn(chainTop) * (ST.chain.x - 1) : 0);
    const chainRub = steps.reduce((a, s) => a + ST.tiers[s.tier].rub, 0), chainUsd = steps.reduce((a, s) => a + ST.tiers[s.tier].usd, 0);
    const passDay = G.pass ? Math.floor(paidRow * 100 / PS.season.days) : 0;
    const subDay = subs.reduce((a, s) => a + s.daily, 0);
    /* Энериум покупок в день d: выдача каждый день; платный ряд — средний день сезона; комплект — в день покупки, первая покупка
       комплекта ×2 — один раз; разовые наборы — в день 1 */
    const at = d => subDay * 100 + passDay + packs.reduce((a, x) => a + ((d - 1) % x.every === 0 ? packEn(x.id) * (d === 1 ? x.P.firstX : 1) * 100 : 0), 0) + (d === 1 ? chainEn * 100 : 0);
    const avg = subDay * 100 + passDay + packs.reduce((a, x) => a + Math.floor(packEn(x.id) * 100 / x.every), 0);
    /* расход за 4 недели: выдача — цена за 30 дней в пересчёте на 28 дней не нужна — берём как покупку раз в месяц; пропуск — раз в сезон */
    const tier = id => ST.tiers[id];
    const rub = subs.reduce((a, s) => a + tier(s.tier).rub, 0) + (G.pass ? tier(ST.pass.tier).rub : 0) + packs.reduce((a, x) => a + tier(x.P.tier).rub, 0);
    const usdC = subs.reduce((a, s) => a + tier(s.tier).usd, 0) + (G.pass ? tier(ST.pass.tier).usd : 0) + packs.reduce((a, x) => a + tier(x.P.tier).usd, 0);
    return { n: G.n, at, avg, rub, usd: usdC, chainRub, chainUsd, chainEn, chainTop, subs, packs, pass: G.pass, chain: G.chain };
  }
  const seg = {};
  for (const [sid, G] of Object.entries(SEGS)) seg[sid] = buys(`сегмент ${sid}`, G);
  const third = buys('мерка «порядка трети»', THIRD);
  if (err.length) return { err, warn };
  if (third.rub !== THIRD.rub) err.push(`мерка «порядка трети»: ${THIRD.n} — ${fmt(third.rub)} ₽ в месяц, а в решении (ADR-0047) и в §9.3 — ${fmt(THIRD.rub)} ₽: поправить данные или текст`);

  /* --- цели: дни копилки с начала цикла II --- */
  const X = { donat: RS.rules.stub.donatPrice, spin: RS.rules.spin, step: RX.drops.ener ? RX.drops.ener.step : COMMON.ENER.step };
  const incomeAt = (pid, d, withCraft) => { const c = cycleAt(d), s = src[pid][c]; return s.play + (withCraft ? craft[c].back - craft[c].spend : 0); };
  /* opt: craft — призывы крафта по модели стока; ads — реклама каждый день; buy — покупки сегмента или мерки */
  function daysTo(pid, cost, opt = {}) {
    let bank = 0;
    for (let d = 1; d <= LAWS.horizon; d++) {
      bank += incomeAt(pid, d, opt.craft) + (opt.ads ? ads100 : 0) + (opt.buy ? opt.buy.at(d) : 0);
      if (bank >= cost * 100) return d;
    }
    return null;
  }
  const goals = GOALS.map(g => {
    const cost = g.cost(X);
    return { id: g.id, n: g.n, cost, perCycle: !!g.perCycle, o: daysTo('o', cost), oa: daysTo('o', cost, { ads: true }), oc: daysTo('o', cost, { craft: true }), e: daysTo('e', cost),
      s: daysTo('p', cost, { buy: seg.s }), m: daysTo('p', cost, { buy: seg.m }), l: daysTo('p', cost, { buy: seg.l }), t: daysTo('p', cost, { buy: third }) };
  });

  /* --- законы --- */
  const G = Object.fromEntries(goals.map(g => [g.id, g]));
  const late = (g, lim, what) => { if (g.o == null || g.o > lim) err.push(`${what}: обычный копит ${g.o == null ? 'дольше горизонта' : g.o + ' дн.'} — больше ${lim}`); };
  late(G.hero1, LAWS.hero1Days, 'первый донатный герой');
  late(G.spin, LAWS.spinDays, 'прокрутка «Возрождения душ»');
  late(G.heroSet, LAWS.heroSetDays, 'весь донатный сет');
  late(G.drusa, LAWS.drusaDays, 'друза Энериума');
  for (const c of CYCLES) {
    const o = src.o[c].play;
    if (o < LAWS.dayRange[0] * 100 || o > LAWS.dayRange[1] * 100) err.push(`цикл ${ROMAN[c]}: обычный игрой — ${d100(o)} Энериума в день, вне «${LAWS.dayRange.join('–')}» автора`);
  }
  for (const g of goals) {
    const segs = ['s', 'm', 'l'];
    for (const sid of segs) if (g[sid] == null || g.o == null || g[sid] > g.o) err.push(`цель «${g.n}»: плательщик ${SEGS[sid].n} медленнее обычного (${g[sid]} против ${g.o} дн.)`);
    if (g.m > g.s || g.l > g.m) err.push(`цель «${g.n}»: сегмент крупнее копит медленнее (${g.s} / ${g.m} / ${g.l} дн.)`);
    if (g.s != null && g.o != null && g.s >= g.o && g.cost > 100) err.push(`цель «${g.n}»: плательщик от 100 ₽ не быстрее обычного — донат теряет смысл`);
    if (g.e != null && g.o != null && g.e > g.o) err.push(`цель «${g.n}»: увлечённый медленнее обычного`);
    if (g.oa != null && g.o != null && g.oa > g.o) err.push(`цель «${g.n}»: с рекламой медленнее, чем без неё`);
  }
  /* ×1,7 и «порядка трети». share — доля бесплатного Энериума обычного в Энериуме плательщика-мерки (игрой и покупками): её держит
     закон. shareM — та же доля у сегмента автора «от 500 ₽»: для сведения, закона на неё нет */
  const x17 = {};
  for (const c of CYCLES) {
    const o = src.o[c].play, p = src.p[c].play, mid = third.avg;
    x17[c] = { play: Math.floor(p * 100 / o), all: Math.floor((p + mid) * 100 / o), share: Math.floor(o * 10000 / (p + mid)), shareM: Math.floor(o * 10000 / (p + seg.m.avg)), ads: Math.floor((o + ads100) * 100 / o) };
    if (p * 100 > o * LAWS.x17) err.push(`цикл ${ROMAN[c]}: плательщик добывает игрой ×${ratio(p, o)} Энериума обычного — больше ×1,7`);
    if (x17[c].share > LAWS.thirdMaxBp) err.push(`цикл ${ROMAN[c]}: бесплатный Энериум обычного — ${Math.round(x17[c].share / 100)} % Энериума плательщика-мерки (${THIRD.n}), больше ${LAWS.thirdMaxBp / 100} %`);
  }
  const walk = (x, where) => { if (typeof x === 'number' && !Number.isInteger(x)) err.push(`не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (typeof v !== 'function') walk(v, where + '.' + k); };
  walk({ src, craft, goals, x17 }, 'расчёт');

  /* ================================ ТАБЛИЦЫ ================================ */
  const TBL = {}, MONEY = {};
  const head = cols => ['| ' + cols.join(' | ') + ' |', '| ' + cols.map(() => '---').join(' | ') + ' |'];
  const cells = xs => '| ' + xs.join(' | ') + ' |';
  const dd = n => n == null ? `дольше ${fmt(LAWS.horizon)}` : String(n);
  const low = t => t[0].toLowerCase() + t.slice(1);
  const segBuys = S => [...S.subs.map(s => low(s.n)), ...(S.pass ? ['платный ряд пропуска'] : []), ...S.packs.map(x => `${low(x.P.n)} раз в ${x.every} дней`)].join(', ');
  let T;

  // источники: что и сколько
  T = head(['Источник', 'Сколько Энериума', 'Где в данных']);
  T.push(cells(['Лист «Дар дня»', `${fmt(calSheet)} за лист из ${PS.cal.marks} отметок, отметка — в день входа`, '`tools/content-gen/pass/build.js`, `CAL`']));
  T.push(cells(['Бесплатный ряд пропуска', `${fmt(freeRow)} за сезон ${PS.season.days} дней`, '`tools/content-gen/pass/build.js`, `FREE`']));
  const ctEn = t => CT.rew[t][CYCLES[0]].map(x => x.en).filter(Boolean).join(' / ');
  T.push(cells(['Контракты эпической редкости и выше', `за задание от эпического до вневременного: дневное — ${ctEn('d')}, недельное — ${ctEn('w')}; сколько в неделю — прогон контрактов`, '`tools/content-gen/contracts/build.js`, `TARGET.en`']));
  T.push(cells(['Арена, суточный топ-100', `${AR.enerium.map(([top, n]) => `${top === 1 ? '1-е' : 'до ' + top + '-го'} — ${n}`).join(', ')} в сутки`, '`tools/content-gen/arena/rules.js`, `enerium`']));
  T.push(cells(['Победа над призванным врагом', 'возврат части Энериума призыва: босс руины или города — 5 × цикл, эхо босса биома — 10 × цикл', '`tools/content-gen/recipes/common.js`, `CRAFT`']));
  T.push(cells(['Реклама по желанию', `${ST.ads.perView} за ролик, до ${ST.ads.dayCap} роликов в сутки — до ${ST.ads.perView * ST.ads.dayCap} в день, сверх ручейка`, '`tools/content-gen/store/build.js`, `ADS`']));
  T.push(cells(['Покупки', `сегменты автора: ${Object.values(seg).map(S => `${S.n} — ${segBuys(S)}`).join('; ')}; мерка «порядка трети» — ${segBuys(third)}`, '`tools/content-gen/store/build.js`; `SEGS` и `THIRD` калькулятора']));
  TBL.sources = T.join('\n');

  // доход в день по циклам
  T = head(['Цикл', 'Профиль', 'Дар дня', 'Пропуск', 'Контракты', 'Арена', 'Игрой в день', 'С рекламой', 'Крафт: призывы / возврат']);
  for (const c of CYCLES) for (const pid of Object.keys(PROF)) {
    const s = src[pid][c], P = PROF[pid];
    T.push(cells([pid === 'o' ? ROMAN[c] : '', P.n, d100(s.cal), d100(s.pass), d100(s.ct), d100(s.ar), `**${d100(s.play)}**`, d100(s.play + ads100),
      P.craft ? `${craft[c].spend ? '−' + d100(craft[c].spend) : '0'} / +${d100(craft[c].back)}${craft[c].crystals ? ` · кристаллов ${d100(craft[c].crystals)} — из крупиц` : ''}` : '—']));
  }
  TBL.day = T.join('\n');

  // за цикл
  T = head(['Цикл', 'Дней', 'Обычный', 'Обычный с рекламой', 'Обычный с призывами крафта', 'Увлечённый', 'Плательщик игрой', `Плательщик-мерка с покупками: ${THIRD.n}`]);
  let cum = { o: 0, oa: 0, oc: 0, e: 0, p: 0, pm: 0 };
  for (const c of CYCLES) {
    const n = days[c], o = src.o[c].play * n, oa = (src.o[c].play + ads100) * n, oc = (src.o[c].play + craft[c].back - craft[c].spend) * n, e = src.e[c].play * n, p = src.p[c].play * n, pm = p + third.avg * n;
    cum = { o: cum.o + o, oa: cum.oa + oa, oc: cum.oc + oc, e: cum.e + e, p: cum.p + p, pm: cum.pm + pm };
    T.push(cells([ROMAN[c], String(n), fmt(Math.floor(o / 100)), fmt(Math.floor(oa / 100)), fmt(Math.floor(oc / 100)), fmt(Math.floor(e / 100)), fmt(Math.floor(p / 100)), fmt(Math.floor(pm / 100))]));
  }
  T.push(cells(['II–VI', String(CYCLES.reduce((a, c) => a + days[c], 0)), `**${fmt(Math.floor(cum.o / 100))}**`, fmt(Math.floor(cum.oa / 100)), fmt(Math.floor(cum.oc / 100)), fmt(Math.floor(cum.e / 100)), fmt(Math.floor(cum.p / 100)), fmt(Math.floor(cum.pm / 100))]));
  TBL.cycle = T.join('\n');

  // цели
  T = head(['Цель', 'Энериума', 'Обычный, дней', 'С рекламой', 'С призывами крафта', 'Увлечённый', `Плательщик ${SEGS.s.n}`, `${SEGS.m.n}`, `${SEGS.l.n}`]);
  for (const g of goals) T.push(cells([g.n + (g.perCycle ? ' *' : ''), fmt(g.cost), `**${dd(g.o)}**`, dd(g.oa), dd(g.oc), dd(g.e), dd(g.s), dd(g.m), dd(g.l)]));
  TBL.goals = T.join('\n');

  // призывы крафта: Энериум лестницы в рецептах призывов по циклам (recipes.js; кристалл — step Энериума, друза — step кристаллов)
  {
    const E = RX.drops.ener, ids = [E.t1, E.t2, E.t3], val = [1, E.step, E.step * E.step];
    const calls = RX.recipes.filter(r => { const it = RX.items.find(i => i.id === r.out[0]); return it && it.tier === 'call'; });
    T = head(['Цикл', 'Призывов', 'Энериум', 'Кристаллов', 'Друз', 'Призыв босса руины и эха: до, в Энериуме · дней', 'Пробуждённый: до, в Энериуме · дней']);
    for (let c = 1; c <= 6; c++) {
      const list = calls.filter(r => r.cyc === c);
      if (!list.length) continue;
      const q = (r, k) => (r.in.find(([id]) => id === ids[k]) || [0, 0])[1];
      const span = k => { const v = list.map(r => q(r, k)).filter(Boolean); return v.length ? (Math.min(...v) === Math.max(...v) ? String(Math.min(...v)) : `${Math.min(...v)}–${Math.max(...v)}`) : '—'; };
      const pace = src.o[Math.max(CYCLES[0], c)].play;   // копить с дохода своего цикла; цикл I — как II: обучение на часы
      const top = l => { if (!l.length) return '—'; const v = Math.max(...l.map(r => q(r, 0) * val[0] + q(r, 1) * val[1] + q(r, 2) * val[2])); return `${fmt(v)} · ${Math.ceil(v * 100 / pace)}`; };
      const aw = list.filter(r => r.fam === 'awcall'), usual = list.filter(r => r.fam !== 'awcall');
      T.push(cells([ROMAN[c], String(list.length), span(0), span(1), span(2), top(usual), top(aw)]));
    }
    TBL.calls = T.join('\n');
  }

  // прочие траты Энериума — цены из данных режимов
  {
    const RT = loadJs(path.join(UI, 'rituals.js'), 'EN_RITUALS'), WN = loadJs(path.join(UI, 'wanderer.js'), 'EN_WANDERER'), CL = loadJs(path.join(UI, 'clan.js'), 'EN_CLAN');
    const rer = CT.rules.rer, ref = AR.arena.refresh, rolls = RT.rules.rolls.paid, sum = a => a.reduce((x, y) => x + y, 0);
    T = head(['Трата', 'Цена', 'Потолок', 'Где в данных']);
    T.push(cells(['Донатный герой цикла', X.donat.map(fmt).join(' / '), 'пятеро за цикл', '`tools/content-gen/heroes/export_roster.py`, `stub.donatPrice`']));
    T.push(cells(['Прокрутка «Возрождения душ»', fmt(X.spin), '—', '`export_roster.py`, `spin`']));
    T.push(cells(['Замена задания контракта', fmt(rer.price), `${rer.paidCap} в день — до ${fmt(rer.price * rer.paidCap)}`, '`tools/content-gen/contracts/build.js`, `RULES.rer`']));
    T.push(cells(['«Обновить» Арены и Лиги', ref.price.map(fmt).join(' / '), `${ref.price.length} в сутки — до ${fmt(sum(ref.price))}`, '`tools/content-gen/arena/rules.js`']));
    T.push(cells(['Роллы ритуалов', rolls.map(fmt).join(' / '), `${rolls.length} в день — до ${fmt(sum(rolls))}`, '`tools/content-gen/rituals/build.js`, `RULES.rolls`']));
    T.push(cells(['Переброс Памяти / полный сброс', `${fmt(WN.mem.reroll)} / ${fmt(WN.mem.reset)}`, '—', '`tools/content-gen/wanderer/build.js`']));
    T.push(cells(['Сброс древа клана', fmt(CL.tree.reset.price), `раз в неделю`, '`tools/content-gen/clan/build.js`, `reset`']));
    TBL.spend = T.join('\n');
  }

  // ×1,7 и доля бесплатного
  const pc = bp => `${Math.round(bp / 100)} %`;
  T = head(['Цикл', 'Плательщик / обычный: игрой', `Плательщик-мерка (${THIRD.n}, ${fmt(third.rub)} ₽ в месяц) с покупками / обычный`, 'Бесплатный обычного — доля Энериума плательщика-мерки', `То же у сегмента «${SEGS.m.n}» — для сведения`, 'Обычный с рекламой / без']);
  for (const c of CYCLES) T.push(cells([ROMAN[c], `×${ratio(x17[c].play, 100)}`, `×${ratio(x17[c].all, 100)}`, `**${pc(x17[c].share)}**`, pc(x17[c].shareM), `×${ratio(x17[c].ads, 100)}`]));
  TBL.x17 = T.join('\n');

  // законы
  T = head(['Закон', 'Порог', 'Сейчас']);
  T.push(cells(['Обычный игрой в день, циклы II–VI', `${LAWS.dayRange.join('–')} — слово автора`, `${d100(Math.min(...CYCLES.map(c => src.o[c].play)))}–${d100(Math.max(...CYCLES.map(c => src.o[c].play)))}`]));
  T.push(cells(['Первый донатный герой цикла II — обычный', `не дольше ${LAWS.hero1Days} дней`, `${dd(G.hero1.o)} дн.`]));
  T.push(cells(['Прокрутка «Возрождения душ» — обычный', `не реже раза в ${LAWS.spinDays} дня`, `${dd(G.spin.o)} дн.`]));
  T.push(cells(['Весь донатный сет — обычный', `не дольше ${LAWS.heroSetDays} дней`, `${dd(G.heroSet.o)} дн.`]));
  T.push(cells(['Друза Энериума — обычный', `не дольше ${LAWS.drusaDays} дней`, `${dd(G.drusa.o)} дн.`]));
  T.push(cells(['Каждый сегмент плательщика быстрее обычного, крупнее — не медленнее', 'на каждой цели', goals.every(g => ['s', 'm', 'l'].every(k => g[k] != null && g[k] <= g.o) && g.m <= g.s && g.l <= g.m) ? 'да' : 'нет']));
  T.push(cells(['Плательщик игрой — не больше ×1,7 обычного', '×1,7', `до ×${ratio(Math.max(...CYCLES.map(c => x17[c].play)), 100)}`]));
  T.push(cells([`Мерка «порядка трети» — ${THIRD.n}`, `${fmt(THIRD.rub)} ₽ в месяц — как в §9.3`, `${fmt(third.rub)} ₽ · ${usd(third.usd)}, Энериум покупок — ${d100(third.avg)} в день`]));
  T.push(cells(['Бесплатный обычного — не больше половины Энериума плательщика-мерки', `${LAWS.thirdMaxBp / 100} %`, `${pc(Math.min(...CYCLES.map(c => x17[c].share)))} в цикле ${ROMAN[CYCLES.reduce((a, c) => (x17[c].share < x17[a].share ? c : a), CYCLES[0])]}, до ${pc(Math.max(...CYCLES.map(c => x17[c].share)))}`]));
  TBL.laws = T.join('\n');

  // монетизация: сегменты автора — что покупают и за сколько дней копят
  const onceTxt = S => (S.chain ? `${S.chain > 1 ? 'I–' : ''}${ROMAN[S.chain]}: ${fmt(S.chainRub)} ₽ · ${usd(S.chainUsd)}; ×${ST.chain.x} — набору ${ROMAN[ST.chain.steps.indexOf(S.chainTop) + 1]}; Энериум ${fmt(S.chainEn)}` : '—');
  T = head(['Сегмент', 'Что покупает', 'Расход в месяц: Россия · Запад', 'Разовые наборы — в первый день', 'Энериум покупок в день', 'Первый донатный герой, дней', 'Весь донатный сет', 'Десять прокруток', 'Друза']);
  T.push(cells(['Обычный, без покупок', 'ничего; реклама — по желанию', '—', '—', '—', dd(G.hero1.o), dd(G.heroSet.o), dd(G.spin10.o), dd(G.drusa.o)]));
  for (const sid of ['s', 'm', 'l']) {
    const S = seg[sid];
    T.push(cells([`${S.n}`, segBuys(S), `${fmt(S.rub)} ₽ · ${usd(S.usd)}`, onceTxt(S), d100(S.avg), dd(G.hero1[sid]), dd(G.heroSet[sid]), dd(G.spin10[sid]), dd(G.drusa[sid])]));
  }
  T.push(cells([`Мерка «порядка трети»`, segBuys(third), `${fmt(third.rub)} ₽ · ${usd(third.usd)}`, onceTxt(third), d100(third.avg), dd(G.hero1.t), dd(G.heroSet.t), dd(G.spin10.t), dd(G.drusa.t)]));
  MONEY.segments = T.join('\n');

  return { err, warn, tables: TBL, money: MONEY, src, craft, goals, x17, days, seg, third, calSheet, freeRow, paidRow, ads100, donat: X.donat };
}

/* ================================ ВЫВОД ================================ */
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/economy/enerium.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) return null;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { build, withTables, markA, markB, FILES, PROF, SEGS, THIRD, GOALS, LAWS };

if (require.main === module) {
  const R = build();
  /* --json — ручеёк по профилям и циклам для калькулятора подъёма (cycle/climb.py): сотые Энериума в день игрой и цены донатных героев
     цикла. Законы и таблицы здесь не при чём: подъёму нужны только источники */
  if (process.argv.includes('--json')) {
    if (!R.src) { console.error('ОШИБКИ:\n' + R.err.join('\n')); process.exit(1); }
    const play = {};
    for (const pid of Object.keys(R.src)) { play[pid] = {}; for (const c of Object.keys(R.src[pid])) play[pid][c] = R.src[pid][c].play; }
    process.stdout.write(JSON.stringify({ play, donat: R.donat }));
    process.exit(0);
  }
  for (const w of R.warn) console.log('предупреждение: ' + w);
  if (process.argv.includes('--print')) {
    if (R.err.length) console.log('ОШИБКИ:\n' + R.err.join('\n'));
    for (const [k, t] of Object.entries(Object.assign({}, R.tables || {}, R.money || {}))) console.log(`\n### ${k}\n\n${t}`);
    process.exit(R.err.length ? 1 : 0);
  }
  if (R.err.length) { console.log('ОШИБКИ:\n' + R.err.join('\n')); process.exit(1); }
  const docOld = fs.existsSync(FILES.doc) ? fs.readFileSync(FILES.doc, 'utf8') : null, docNew = docOld ? withTables(docOld, R.tables) : null;
  const monOld = fs.existsSync(FILES.money) ? fs.readFileSync(FILES.money, 'utf8') : null, monNew = monOld ? withTables(monOld, R.money) : null;
  if (!docNew) { console.log(`ОШИБКИ:\nв ${path.relative(ROOT, FILES.doc)} нет меток таблиц`); process.exit(1); }
  if (!monNew) { console.log(`ОШИБКИ:\nв ${path.relative(ROOT, FILES.money)} нет меток таблицы segments`); process.exit(1); }
  if (process.argv.includes('--check')) {
    const ok = docNew === docOld && monNew === monOld;
    console.log(ok ? 'Свежие: таблицы docs/content/экономика-энериум.md и сегменты docs/content/монетизация.md совпадают с расчётом; законы ручейка держатся.' : `Устарели: ${[docNew !== docOld && 'docs/content/экономика-энериум.md', monNew !== monOld && 'docs/content/монетизация.md'].filter(Boolean).join(', ')} — пересчитать.`);
    process.exit(ok ? 0 : 1);
  }
  fs.writeFileSync(FILES.doc, docNew);
  fs.writeFileSync(FILES.money, monNew);
  const o = R.src.o[2], g = Object.fromEntries(R.goals.map(x => [x.id, x]));
  console.log(`Энериум обычного в цикле II — ${d100(o.play)} в день, с рекламой — ${d100(o.play + R.ads100)}; первый донатный герой — ${g.hero1.o}-й день, весь сет — ${g.heroSet.o}-й, друза — ${g.drusa.o}-й.`);
}
