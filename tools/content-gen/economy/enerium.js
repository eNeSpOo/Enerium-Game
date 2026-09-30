/* Энериум бесплатного игрока — калькулятор к docs/content/экономика-энериум.md. Решение автора 30.09.2026 (ADR-0033):
   «Доступны, потому что мы продумаем систему так, что игрок по немногу сможет получать энериум и копить его. Как на героев за энериум,
   так и на рулетку, со временем он сможет на всё накопить». Друза — только по лестнице: 100 Энериума → кристалл, 100 кристаллов → друза.
   Черновик · предложение · ждёт автора. Числа — демонстрация.

   Что считает:
   1. Доход Энериума по источникам — в день и за цикл, у обычного, увлечённого и плательщика при времени обычного (ADR-0031):
      - лист «Дар дня» — design/ui/pass.js, cal: Энериум листа из 30 отметок, отметка — в день входа в игру;
      - бесплатный ряд пропуска — pass.js, rows.free: за сезон, ряд проходят все три профиля (прогон пропуска, econ.pace);
      - контракты эпической редкости и выше — design/ui/contracts.js, econ[цикл][профиль].en: Энериум за неделю по прогону контрактов;
      - Арена, суточный топ-100 — design/ui/arena.js, model.prof: Энериум за неделю по прогону на 5 000 игроках;
      - у плательщика ещё покупки — витрина «Лавки Энериума» (pass.js, store): подписка и пакет раз в BUY.packEvery дней,
        первая покупка пакета ×2 — один раз.
   2. Крафт обычного — модель стока (design/ui/recipes.js, stats.sink): Энериум, который уходит в призывы за день, и возврат — победа над
      призванным врагом (drops.craftBosses, enerium) × призывов в день по смеси стока (tools/content-gen/recipes/common.js, SINK).
      Кристаллы циклов V–VI модель стока растит из зелёных крупиц — в Энериум кошелька их не пересчитываем.
   3. Цели — дни копилки с начала цикла II: первый донатный герой, весь донатный сет цикла, прокрутка «Возрождения душ» и десять,
      платный ряд пропуска, кристалл и друза. У обычного два счёта: копит весь Энериум — и копит, призывая по модели стока.
   4. Законы — LAWS ниже; любое нарушение — ошибка, таблицы не пишутся.

   Читает: design/ui/pass.js, contracts.js, arena.js, recipes.js, roster.js, tools/content-gen/contracts/capacity.json (дни циклов),
   tools/content-gen/recipes/common.js (смесь призывов стока). Своих данных игры не пишет: только таблицы черновика между метками
   «<!-- @таблица имя -->» и «<!-- /таблица имя -->», текст вокруг — ручной. Порядок сборки — после пропуска (шаг 9): читает прогоны
   контрактов, Арены и пропуска. Только целые: доход — сотые Энериума в день.
   Запуск: node tools/content-gen/economy/enerium.js           — посчитать и вписать таблицы;
           node tools/content-gen/economy/enerium.js --check   — только проверить законы и свежесть таблиц;
           node tools/content-gen/economy/enerium.js --print   — таблицы в консоль. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');
const FILES = {
  pass: path.join(UI, 'pass.js'), contracts: path.join(UI, 'contracts.js'), arena: path.join(UI, 'arena.js'),
  recipes: path.join(UI, 'recipes.js'), roster: path.join(UI, 'roster.js'),
  cap: path.join(ROOT, 'tools', 'content-gen', 'contracts', 'capacity.json'),
  doc: path.join(ROOT, 'docs', 'content', 'экономика-энериум.md'),
};
const COMMON = require('../recipes/common.js');

/* ================================ ДАННЫЕ ================================ */

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const CYCLES = [2, 3, 4, 5, 6];   // контракты, Арена и пропуск — с цикла II (§16); цикл I — обучение на часы

/* Профили. login — дней входа в неделю: отметка листа даров берётся в день входа; обычный один день в неделю не играет — как в прогонах
   контрактов и пропуска. ct, ar — профиль прогона контрактов и Арены. craft — модель стока (она у обычного). buy — покупает Энериум */
const PROF = {
  o: { n: 'обычный', login: 6, ct: 'o', ar: 'free', craft: true },
  e: { n: 'увлечённый', login: 7, ct: 'e', ar: 'fan' },
  p: { n: 'плательщик', login: 6, ct: 'p', ar: 'payer', buy: true },
};

/* Покупки плательщика — витрина «Лавки Энериума» (pass.js, store): подписка «Ежедневная выдача» — каждый день; пакет pack — раз
   в packEvery дней, первая покупка ×2 — один раз за игру. Это образ «плательщика» для целей Энериума, а не потолок покупок:
   объём покупки Энериума не ограничен (§1.2), потолок ×1,7 держат души и дневные капы */
const BUY = { sub: true, pack: 'big', packEvery: 28 };

/* Цели Энериума. cost — функция данных игры; perCycle — цель повторяется каждый цикл (донатный сет открывается с каждым циклом, ADR-0021) */
const GOALS = [
  { id: 'hero1', n: 'Первый донатный герой цикла', cost: X => X.donat[0], perCycle: true },
  { id: 'heroSet', n: 'Весь донатный сет цикла — пятеро', cost: X => X.donat.reduce((a, v) => a + v, 0), perCycle: true },
  { id: 'spin', n: 'Прокрутка «Возрождения душ»', cost: X => X.spin },
  { id: 'spin10', n: 'Десять прокруток «Возрождения душ»', cost: X => X.spin * 10 },
  { id: 'pass', n: 'Платный ряд пропуска на сезон', cost: X => X.passPrice },
  { id: 'crystal', n: 'Кристалл Энериума — призыв цикла V', cost: X => X.step },
  { id: 'drusa', n: 'Друза Энериума — пробуждённый призыв V–VI', cost: X => X.step * X.step },
];

/* Законы ручейка. Дни — с начала цикла II, обычный копит весь бесплатный Энериум */
const LAWS = {
  hero1Days: 7,       // первого донатного героя цикла II обычный берёт за первую неделю цикла: «по немногу», но с первых дней
  spinDays: 4,        // прокрутка «Возрождения душ» — не реже раза в четыре дня
  heroSetDays: 70,    // весь донатный сет — за два-три цикла: «со временем он сможет на всё накопить»
  drusaDays: 365,     // друза — за год копилки: самая дорогая вещь лестницы остаётся целью, а не подарком
  x17: 170,           // плательщик при том же времени добывает игрой не больше ×1,7 Энериума обычного (§1.2): покупки — отдельно
  thirdMaxBp: 5000,   // бесплатный Энериум обычного — не больше половины Энериума плательщика вместе с покупками (§9.3: «порядка трети»)
  horizon: 1100,      // дней счёта целей: горизонт, за которым цель считается недостижимой
};

/* ================================ РАСЧЁТ ================================ */

const loadJs = (file, name) => { const c = { window: {} }; c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync(file, 'utf8'), c); return c[name]; };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const d100 = x => { const s = x < 0 ? '−' : '', a = Math.abs(x), i = Math.floor(a / 100), f = a % 100; return s + fmt(i) + (f ? ',' + String(f).padStart(2, '0').replace(/0$/, '') : ''); };
const ratio = (a, b) => b ? (Math.floor(a * 100 / b) / 100).toFixed(2).replace('.', ',') : '—';

function build() {
  const err = [], warn = [];
  const PS = loadJs(FILES.pass, 'EN_PASS'), CT = loadJs(FILES.contracts, 'EN_CONTRACTS'), AR = loadJs(FILES.arena, 'EN_ARENA');
  const RX = loadJs(FILES.recipes, 'EN_RECIPES'), RS = loadJs(FILES.roster, 'EN_ROSTER');
  const CAP = JSON.parse(fs.readFileSync(FILES.cap, 'utf8'));
  if (!PS || !CT || !AR || !RX || !RS) return { err: ['нет данных: pass.js, contracts.js, arena.js, recipes.js или roster.js'], warn };
  if (!PS.store) return { err: ['pass.js: нет витрины store — пересобрать tools/content-gen/pass/build.js'], warn };

  /* --- дни циклов: II и III — прогон ёмкости, IV–VI — как III (как у ритуалов и модели стока) --- */
  const days = {};
  for (const c of CYCLES) days[c] = CAP.cycleDays[String(c)] || CAP.cycleDays[String(Math.min(c, 3))];
  const cycleAt = d => { let s = 0; for (const c of CYCLES) { s += days[c]; if (d <= s) return c; } return CYCLES[CYCLES.length - 1]; };

  /* --- источники: сотые Энериума в день --- */
  const enOf = list => list.reduce((a, cell) => a + cell.filter(x => x.k === 'enerium').reduce((b, x) => b + x.n, 0), 0);
  const calSheet = enOf(PS.cal.list), freeRow = enOf(PS.rows.free), paidRow = enOf(PS.rows.paid);
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
    /* возврат × 100 в день: призывов в день × доля вида × Энериум за победу; смесь — крафтовые боссы руин, эхо боссов, города */
    const back = Math.floor(s.summonsX100 * (MIX.craft * avg(['ruin']) + MIX.memory * avg(['memory']) + MIX.city * avg(['city'])) / 10000);
    craft[c] = { spend: s.enerDirectX100, back, crystals: s.ener2X100 };
  }

  /* --- покупки плательщика --- */
  const ST = PS.store, pack = ST.packs.find(x => x.id === BUY.pack);
  if (!pack) err.push(`витрина: нет пакета ${BUY.pack}`);
  const subDay = BUY.sub && ST.sub ? ST.sub.en : 0;
  const buyAt = d => subDay + (pack && (d - 1) % BUY.packEvery === 0 ? pack.en * (d === 1 ? pack.firstX : 1) : 0);   // Энериум покупок в день d
  const buyAvg = subDay * 100 + (pack ? Math.floor(pack.en * 100 / BUY.packEvery) : 0);

  /* --- цели: дни копилки с начала цикла II --- */
  const X = { donat: RS.rules.stub.donatPrice, spin: RS.rules.spin, passPrice: PS.price, step: RX.drops.ener ? RX.drops.ener.step : COMMON.ENER.step };
  const incomeAt = (pid, d, withCraft) => {
    const c = cycleAt(d), s = src[pid][c];
    let x = s.play;
    if (withCraft) x += craft[c].back - craft[c].spend;
    return x;
  };
  /* sub — только подписка «Ежедневная выдача» сверх Энериума игрой, без пакетов: «лёгкий» плательщик */
  function daysTo(pid, cost, withCraft, sub) {
    let bank = 0;
    for (let d = 1; d <= LAWS.horizon; d++) {
      bank += incomeAt(pid, d, withCraft) + (sub ? subDay * 100 : PROF[pid].buy ? buyAt(d) * 100 : 0);
      if (bank >= cost * 100) return d;
    }
    return null;
  }
  const goals = GOALS.map(g => {
    const cost = g.cost(X);
    return { id: g.id, n: g.n, cost, perCycle: !!g.perCycle, o: daysTo('o', cost, false), oc: daysTo('o', cost, true), e: daysTo('e', cost, false), ps: daysTo('p', cost, false, true), p: daysTo('p', cost, false) };
  });

  /* --- законы --- */
  const G = Object.fromEntries(goals.map(g => [g.id, g]));
  const late = (g, lim, what) => { if (g.o == null || g.o > lim) err.push(`${what}: обычный копит ${g.o == null ? 'дольше горизонта' : g.o + ' дн.'} — больше ${lim}`); };
  late(G.hero1, LAWS.hero1Days, 'первый донатный герой');
  late(G.spin, LAWS.spinDays, 'прокрутка «Возрождения душ»');
  late(G.heroSet, LAWS.heroSetDays, 'весь донатный сет');
  late(G.drusa, LAWS.drusaDays, 'друза Энериума');
  for (const g of goals) {
    if (g.p == null || g.o == null || g.p >= g.o) err.push(`цель «${g.n}»: плательщик не быстрее обычного (${g.p} против ${g.o} дн.) — донат теряет смысл`);
    if (g.ps == null || g.ps > g.o) err.push(`цель «${g.n}»: плательщик с подпиской медленнее обычного`);
    if (g.e != null && g.o != null && g.e > g.o) err.push(`цель «${g.n}»: увлечённый медленнее обычного`);
  }
  const x17 = {};
  for (const c of CYCLES) {
    const o = src.o[c].play, p = src.p[c].play;
    x17[c] = { play: Math.floor(p * 100 / o), all: Math.floor((p + buyAvg) * 100 / o), share: Math.floor(o * 10000 / (p + buyAvg)) };
    if (p * 100 > o * LAWS.x17) err.push(`цикл ${ROMAN[c]}: плательщик добывает игрой ×${ratio(p, o)} Энериума обычного — больше ×1,7`);
    if (x17[c].share > LAWS.thirdMaxBp) err.push(`цикл ${ROMAN[c]}: бесплатный Энериум обычного — ${Math.round(x17[c].share / 100)} % Энериума плательщика с покупками, больше ${LAWS.thirdMaxBp / 100} %`);
  }
  const walk = (x, where) => { if (typeof x === 'number' && !Number.isInteger(x)) err.push(`не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, where + '.' + k); };
  walk({ src, craft, goals, x17 }, 'расчёт');

  /* ================================ ТАБЛИЦЫ ================================ */
  const TBL = {};
  const head = cols => ['| ' + cols.join(' | ') + ' |', '| ' + cols.map(() => '---').join(' | ') + ' |'];
  const cells = xs => '| ' + xs.join(' | ') + ' |';
  const dd = n => n == null ? `дольше ${fmt(LAWS.horizon)}` : String(n);
  let T;

  // источники: что и сколько
  T = head(['Источник', 'Сколько Энериума', 'Где в данных']);
  T.push(cells(['Лист «Дар дня»', `${fmt(calSheet)} за лист из ${PS.cal.marks} отметок, отметка — в день входа`, '`tools/content-gen/pass/build.js`, `CAL`']));
  T.push(cells(['Бесплатный ряд пропуска', `${fmt(freeRow)} за сезон ${PS.season.days} дней`, '`tools/content-gen/pass/build.js`, `FREE`']));
  const ctEn = t => CT.rew[t][CYCLES[0]].map(x => x.en).filter(Boolean).join(' / ');
  T.push(cells(['Контракты эпической редкости и выше', `за задание от эпического до вневременного: дневное — ${ctEn('d')}, недельное — ${ctEn('w')}; сколько в неделю — прогон контрактов`, '`tools/content-gen/contracts/build.js`, `TARGET.en`']));
  T.push(cells(['Арена, суточный топ-100', `${AR.enerium.map(([top, n]) => `${top === 1 ? '1-е' : 'до ' + top + '-го'} — ${n}`).join(', ')} в сутки`, '`tools/content-gen/arena/rules.js`, `enerium`']));
  T.push(cells(['Победа над призванным врагом', 'возврат части Энериума призыва: крафтовый босс — 5 × цикл, эхо босса биома — 10 × цикл', '`tools/content-gen/recipes/common.js`, `CRAFT`']));
  T.push(cells(['Покупки плательщика', `подписка — ${fmt(subDay)} в день; «${pack ? pack.n : '—'}» — ${pack ? fmt(pack.en) : '—'} раз в ${BUY.packEvery} дней, первая покупка ×${pack ? pack.firstX : 1}`, '`tools/content-gen/pass/build.js`, `STORE`; `BUY` калькулятора']));
  TBL.sources = T.join('\n');

  // доход в день по циклам
  T = head(['Цикл', 'Профиль', 'Дар дня', 'Пропуск', 'Контракты', 'Арена', 'Игрой в день', 'Покупки в день', 'Крафт: призывы / возврат']);
  for (const c of CYCLES) for (const pid of Object.keys(PROF)) {
    const s = src[pid][c], P = PROF[pid];
    T.push(cells([pid === 'o' ? ROMAN[c] : '', P.n, d100(s.cal), d100(s.pass), d100(s.ct), d100(s.ar), `**${d100(s.play)}**`, P.buy ? d100(buyAvg) : '—',
      P.craft ? `${craft[c].spend ? '−' + d100(craft[c].spend) : '0'} / +${d100(craft[c].back)}${craft[c].crystals ? ` · кристаллов ${d100(craft[c].crystals)} — из крупиц` : ''}` : '—']));
  }
  TBL.day = T.join('\n');

  // за цикл
  T = head(['Цикл', 'Дней', 'Обычный', 'Обычный с призывами крафта', 'Увлечённый', 'Плательщик: игрой / с покупками']);
  let cum = { o: 0, oc: 0, e: 0, p: 0, pb: 0 };
  for (const c of CYCLES) {
    const n = days[c], o = src.o[c].play * n, oc = (src.o[c].play + craft[c].back - craft[c].spend) * n, e = src.e[c].play * n, p = src.p[c].play * n, pb = p + buyAvg * n;
    cum = { o: cum.o + o, oc: cum.oc + oc, e: cum.e + e, p: cum.p + p, pb: cum.pb + pb };
    T.push(cells([ROMAN[c], String(n), fmt(Math.floor(o / 100)), fmt(Math.floor(oc / 100)), fmt(Math.floor(e / 100)), `${fmt(Math.floor(p / 100))} / ${fmt(Math.floor(pb / 100))}`]));
  }
  T.push(cells(['II–VI', String(CYCLES.reduce((a, c) => a + days[c], 0)), `**${fmt(Math.floor(cum.o / 100))}**`, fmt(Math.floor(cum.oc / 100)), fmt(Math.floor(cum.e / 100)), `${fmt(Math.floor(cum.p / 100))} / ${fmt(Math.floor(cum.pb / 100))}`]));
  TBL.cycle = T.join('\n');

  // цели
  T = head(['Цель', 'Энериума', 'Обычный, дней', 'Обычный с призывами крафта', 'Увлечённый', 'Плательщик: подписка', 'Плательщик: подписка и пакет']);
  for (const g of goals) T.push(cells([g.n + (g.perCycle ? ' *' : ''), fmt(g.cost), `**${dd(g.o)}**`, dd(g.oc), dd(g.e), dd(g.ps), dd(g.p)]));
  TBL.goals = T.join('\n');

  // призывы крафта: Энериум лестницы в рецептах призывов по циклам (recipes.js; кристалл — step Энериума, друза — step кристаллов)
  {
    const E = RX.drops.ener, ids = [E.t1, E.t2, E.t3], val = [1, E.step, E.step * E.step];
    const calls = RX.recipes.filter(r => { const it = RX.items.find(i => i.id === r.out[0]); return it && it.tier === 'call'; });
    T = head(['Цикл', 'Призывов', 'Энериум', 'Кристаллов', 'Друз', 'Призыв крафтового босса и эха: до, в Энериуме · дней', 'Пробуждённый: до, в Энериуме · дней']);
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
    T.push(cells(['Платный ряд пропуска', `${fmt(PS.price)}, возвращает ${fmt(paidRow)}`, 'раз в сезон', '`tools/content-gen/pass/build.js`, `RULES.price`']));
    T.push(cells(['Замена задания контракта', fmt(rer.price), `${rer.paidCap} в день — до ${fmt(rer.price * rer.paidCap)}`, '`tools/content-gen/contracts/build.js`, `RULES.rer`']));
    T.push(cells(['«Обновить» Арены и Лиги', ref.price.map(fmt).join(' / '), `${ref.price.length} в сутки — до ${fmt(sum(ref.price))}`, '`tools/content-gen/arena/rules.js`']));
    T.push(cells(['Роллы ритуалов', rolls.map(fmt).join(' / '), `${rolls.length} в день — до ${fmt(sum(rolls))}`, '`tools/content-gen/rituals/build.js`, `RULES.rolls`']));
    T.push(cells(['Переброс Памяти / полный сброс', `${fmt(WN.mem.reroll)} / ${fmt(WN.mem.reset)}`, '—', '`tools/content-gen/wanderer/build.js`']));
    T.push(cells(['Сброс древа клана', fmt(CL.tree.reset.price), `раз в неделю`, '`tools/content-gen/clan/build.js`, `reset`']));
    TBL.spend = T.join('\n');
  }

  // ×1,7 и доля бесплатного
  T = head(['Цикл', 'Плательщик / обычный: игрой', 'Плательщик с покупками / обычный', 'Бесплатный обычного — доля Энериума плательщика']);
  for (const c of CYCLES) T.push(cells([ROMAN[c], `×${ratio(x17[c].play, 100)}`, `×${ratio(x17[c].all, 100)}`, `${Math.round(x17[c].share / 100)} %`]));
  TBL.x17 = T.join('\n');

  // законы
  T = head(['Закон', 'Порог', 'Сейчас']);
  T.push(cells(['Первый донатный герой цикла II — обычный', `не дольше ${LAWS.hero1Days} дней`, `${dd(G.hero1.o)} дн.`]));
  T.push(cells(['Прокрутка «Возрождения душ» — обычный', `не реже раза в ${LAWS.spinDays} дня`, `${dd(G.spin.o)} дн.`]));
  T.push(cells(['Весь донатный сет — обычный', `не дольше ${LAWS.heroSetDays} дней`, `${dd(G.heroSet.o)} дн.`]));
  T.push(cells(['Друза Энериума — обычный', `не дольше ${LAWS.drusaDays} дней`, `${dd(G.drusa.o)} дн.`]));
  T.push(cells(['Плательщик быстрее обычного', 'на каждой цели', goals.every(g => g.p != null && g.o != null && g.p < g.o) ? 'да' : 'нет']));
  T.push(cells(['Плательщик игрой — не больше ×1,7 обычного', '×1,7', `до ×${ratio(Math.max(...CYCLES.map(c => x17[c].play)), 100)}`]));
  T.push(cells(['Бесплатный обычного — не больше половины Энериума плательщика', `${LAWS.thirdMaxBp / 100} %`, `до ${Math.round(Math.max(...CYCLES.map(c => x17[c].share)) / 100)} %`]));
  TBL.laws = T.join('\n');

  return { err, warn, tables: TBL, src, craft, goals, x17, days, buyAvg, calSheet, freeRow, paidRow };
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

module.exports = { build, withTables, markA, markB, FILES, PROF, BUY, GOALS, LAWS };

if (require.main === module) {
  const R = build();
  for (const w of R.warn) console.log('предупреждение: ' + w);
  if (process.argv.includes('--print')) {
    if (R.err.length) console.log('ОШИБКИ:\n' + R.err.join('\n'));
    for (const [k, t] of Object.entries(R.tables || {})) console.log(`\n### ${k}\n\n${t}`);
    process.exit(R.err.length ? 1 : 0);
  }
  if (R.err.length) { console.log('ОШИБКИ:\n' + R.err.join('\n')); process.exit(1); }
  const docOld = fs.existsSync(FILES.doc) ? fs.readFileSync(FILES.doc, 'utf8') : null;
  const docNew = docOld ? withTables(docOld, R.tables) : null;
  if (!docNew) { console.log(`ОШИБКИ:\nв ${path.relative(ROOT, FILES.doc)} нет меток таблиц`); process.exit(1); }
  if (process.argv.includes('--check')) {
    const ok = docNew === docOld;
    console.log(ok ? 'Свежие: таблицы docs/content/экономика-энериум.md совпадают с расчётом; законы ручейка держатся.' : 'Устарели: docs/content/экономика-энериум.md — пересчитать.');
    process.exit(ok ? 0 : 1);
  }
  fs.writeFileSync(FILES.doc, docNew);
  const o = R.src.o[2], g = Object.fromEntries(R.goals.map(x => [x.id, x]));
  console.log(`Энериум обычного в цикле II — ${d100(o.play)} в день; первый донатный герой — ${g.hero1.o}-й день, весь сет — ${g.heroSet.o}-й, друза — ${g.drusa.o}-й.`);
}
