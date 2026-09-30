/* Энериум · прототип «Свет снизу» — «Ремесло → Мастерская» на данных крафта (GDD §12, §36.12, §36.16).
   Подключается после screens/model.js, до boot(). Договор — screens/model.js: запасы только через BAG, найденные рецепты — BAG.known и BAG.learn.
   Экран разделён на подписанные зоны «Инвентарь» и «Крафт» (§12.4); крафт — стол из шести ячеек. Книга рецептов раскрывается на всё окно
   кнопкой «Книга рецептов» над столом — screens/recipe-book.js (слово автора 30.09.2026); стол под книгой остаётся как был.
   Вид — по «Правилам воздуха» UI-кита: на столе и в книге нет лишних подписей, сведения о ресурсе — лист по нажатию:
   на лупе ресурса, на имени ресурса выбранной ячейки и на значках ингредиентов в книге.
   - Ввод ресурса — слова автора 29.09.2026: запасы по пять в ряд, плитки крупнее; нажатие на ресурс — ползунок количества от 0 до
     min(100, сколько есть), подтверждение — ресурс ложится в ячейку (OV.wsqty). Справа сверху на плитке — лупа: карточка ресурса.
     Перенос на ячейку — тот же ползунок для этой ячейки. Количество выбранной ячейки — ползунок под столом.
   - Ресурс в ячейке из запасов не списан. Списание — при попытке, и со стола уходит всё.
   - Совпадение по вхождению: лишнее сгорает, неудача сжигает всё положенное, верный набор создаёт предмет всегда.
   - Подсказки — по §12, у рецептов от четырёх ингредиентов. Частичное знание рецепта — S.ws.part.
   - Автодокрафт — только по найденным рецептам; невосполнимое списывается лишь с явного согласия (§12.1).
   - Сервер решает: попытку и автодокрафт проверяет и проводит WS_SRV — одной операцией с номером, повтор номера ничего не меняет.
     В игре это запросы, а клиент знает только найденные рецепты.
   - Анимация удачи и неудачи только показывает итог, который сервер уже выдал: окно поверх (OV.wsres), круг из шести ячеек вокруг
     центра, как на столе. Удача — нити, втягивание, раскалённое ядро, вспышка, итог поднимается в свете своей редкости; впервые
     найденный рецепт — «новая запись в книге». Неудача — нити рвутся, круг трескается, дым и пепел. Автодокрафт, серия ×N и известный
     рецепт со стола — короткая версия. Пропуск — нажатием на сцену или галочкой, prefers-reduced-motion — сразу итог.
     Движение — transform и opacity, частицы — EnFx (fx.js). Рисунок трещин и дыма — от сида операции, чтобы перерисовка не меняла кадр.
   Состояние экрана — S.ws. Числа — в WS_DATA (демонстрация, не баланс) и WS_FX (вид). Автопроверка — tools/content-gen/screens/check_craft.js. */
'use strict';

/* ================== данные экрана: демонстрация, не баланс ================== */
const WS_DATA = {
  cells: 6, cellMax: 100,          // §12: шесть ячеек, до 100 единиц в каждой
  hintFrom: 4, hintMin: 3,         // §12: подсказки — у рецептов от четырёх ингредиентов, верных на столе не меньше трёх
  pick: { start: 1, step: 1 },     // ввод ресурса: сколько стоит на ползунке, если ресурса ещё нет на столе; шаг кнопок «−» и «+»
  makeCap: 100,                    // сколько раз можно создать за одно подтверждение автодокрафта — потолок прототипа
  depth: 12,                       // глубина разворота цепочки — защита от петли в данных
  /* невосполнимое (§12.1): уникальные, руны, Энериум. Трофеи, находки и Многоликий — открытый вопрос автору
     (docs/content/ресурсы-рецепты-дроп.md, «Открыто», п. 2) */
  special: { tiers: ['unique', 'rune', 'valor'], items: ['energ'] },
  /* валюта кошелька, которая и ресурс мастерской (слово автора 30.09.2026: «Энериум и донатная валюта, и ресурс в мастерской»):
     выход рецепта идёт в кошелёк, вход — в ячейку и в рецепт — берётся из кошелька (wsQty, wsTake) */
  wallet: { energ: 'enerium', rkey: 'keys' },
  /* вкладки инвентаря — ярусы recipes.js */
  groups: [
    ['all', 'Всё', null],
    ['basic', 'Базовые', ['basic']],
    ['key', 'Ключи', ['key']],
    ['made', 'Изделия', ['part', 'made', 'act', 'call', 'product']],
    ['loot', 'Добыча', ['craftres', 'find', 'trophy', 'unique', 'echo']],
    ['rune', 'Руны', ['rune', 'vshard', 'valor']],
  ],
  /* вид рецепта в книге — kind из recipes.js */
  kinds: [
    ['part', 'Заготовки', ['part']],
    ['made', 'Изделия', ['made']],
    ['act', 'Активации', ['act']],
    ['call', 'Призывы', ['call']],
    ['hero', 'Герои', ['hero']],
    ['rune', 'Руны', ['rune', 'valor']],
    ['product', 'Награды', ['product']],
  ],
  demo: {
    fav: ['r_act_cb1'],                                                   // избранное
    /* подсказки в книге — обрывки: у Пускового рычага три верных из пяти, итог не найден; у Заряженного Рубидиума три из четырёх и итог
       найден — игрок держал камень (seen); у Оэлис все четыре ресурса верны, количества нет — «без количеств», героя игрок не встречал */
    part: {
      r_call_fb2: { pos: ['u1', 'p_frame', 'p_coal'] },
      r_kr_ru: { pos: ['k4_ench', 'k4_alch', 'k4_smith'] },
      r_h_c1_22: { pos: ['find_cb1', 'k1_ench', 'p_print', 'a_iron'] },
    },
    seen: ['kr_ru'],                                                      // что игрок уже держал в руках, кроме нынешних запасов
    table: [['fang', 2], ['k1_hunt', 1]],                                 // поток «Мастерская»: найденный рецепт на столе
    hint: [['find_cb1', 1], ['p_waxthread', 2], ['cr_mold', 3]],          // поток «подсказки»: три верных из четырёх у рецепта героя
    chain: { learn: ['r_a_cast', 'r_p_lure'], make: 'r_call_fb1' },       // поток «автодокрафт»: цепочка и уникальный ресурс
    made: [['p_fang', 2], ['plank', 2], ['dye', 1]],                      // поток «удача»: Стрелы егеря — рецепт, которого нет в книге
    fail: [['mushroom', 1], ['salt', 2], ['ash', 1]],                     // поток «неудача»: сочетание без рецепта и без подсказки
    kit: { hero: 'r_h_c1_20', make: 'r_p_frame', n: 10 },                 // UI-кит: проба героя и серии ×N — не выдача
  },
};

/* ================== анимация крафта: числа вида, не баланс ==================
   Моменты — целые мс от начала показа, размеры — px. Три темпа: full — попытка, исход которой игрок не знал; short — известный рецепт
   со стола, автодокрафт, серия ×N; fail — неудача. До расхождения (tug / shiver) полная удача и неудача идут одинаково: нити цвета
   стола, круг тёмный — исход открывается в свой момент */
const WS_FX = {
  geo: {
    circ: 300,                                                                // круг, px
    hex: [[0, -100], [87, -50], [87, 50], [0, 100], [-87, 50], [-87, -50]],   // центры шести мест от центра круга — порядок стола: 0 — верх, по часовой
    ang: [90, 150, 210, 270, 330, 30],                                        // нить от места к центру, градусы
    cell: 50, core: 60, res: 84, card: [80, 104],                             // место, ядро, итог, карточка героя [ш, в]
    rim: [146, 126, 40], runeR: 136, runes: 24,                               // обод, внутренний обод, кольцо ядра; руны — радиус и сколько
    shift: 182, pane: 340, paneX: -8, top: 16,                                // итог: круг уходит влево, лист справа — ширина и левый край от середины; круг ниже середины
  },
  spread: [[0], [0, 3], [0, 2, 4], [1, 2, 4, 5], [0, 1, 2, 4, 5], [0, 1, 2, 3, 4, 5]],   // места ингредиентов автодокрафта и проб — симметрично
  full: { in: 240, inStep: 40, thr: 260, thrDur: 420, thrStep: 70, tug: 720, tugDur: 240, pull: 920, pullDur: 460, pullStep: 60,
    ring: 1340, ringDur: 900, heat: 1240, heatDur: 820, flash: 2060, flashDur: 660, rise: 2100, riseDur: 700, end: 2900 },
  short: { in: 120, inStep: 20, thr: 160, thrDur: 220, thrStep: 30, tug: 0, tugDur: 0, pull: 300, pullDur: 280, pullStep: 25,
    ring: 520, ringDur: 560, heat: 460, heatDur: 320, flash: 780, flashDur: 520, rise: 800, riseDur: 420, end: 1280,
    pulses: 3, pulse: 120, auto: 640 },                                       // серия — удары ядра, не больше pulses; auto — сколько итог держится без листа
  fail: { in: 240, inStep: 40, thr: 260, thrDur: 420, thrStep: 70, shiver: 720, shiverDur: 420, snap: 980, snapDur: 300,
    crack: 1010, crackStep: 55, crackDur: 170, crumble: 1150, crumbleDur: 760, crumbleStep: 55, smokeDur: 1500, end: 2050 },
  /* трещины от обода к центру: начал, ветвей у начала [от, до], отрезков в ветви [от, до], длина отрезка [от, до] px, излом и развилка, градусы */
  crack: { from: 2, branch: [2, 3], seg: [3, 4], len: [14, 24], bend: 32, fork: 28, edge: 12 },
  smoke: { perCell: 2, core: 3, spread: 18, drift: 20, size: [80, 130], lag: 220 },   // клубов у места и в центре; разброс и снос, px; размер, %; разнобой, мс
  /* новая запись в книге — после удачи, от конца полной версии: книга раскрывается, листы, свет, чернила пишут имя рецепта */
  book: { open: 520, flip: 3, flipAt: 280, flipStep: 150, flipDur: 560, light: 360, lightDur: 1200, ink: 860, inkStep: 34, end: 1640 },
  pane: 320, shiftDur: 480, fade: 220,                                        // лист итога, уход круга влево, затухание короткой без листа, мс
  drop: { life: 900 },                                                        // ресурс опускается в гнездо стола, итог встаёт на пьедестал: сколько держится класс движения, мс
  ringMs: 24000,                                                              // кольцо света под пьедесталом: оборот, мс
  /* по редкости итога: ореол, лучи (с эпической), свет по всей сцене при вспышке — %; масштаб вспышки, % */
  halo: [30, 36, 44, 54, 64, 74, 84], rays: [0, 0, 0, 30, 42, 54, 66], sflash: [0, 0, 8, 14, 22, 30, 38], flashScale: [100, 108, 116, 126, 138, 150, 164],
  /* частицы EnFx. Искры, полосы, золото — [сколько, скорость, жизнь мс, размер]; кольца — [радиус в % круга, мс, толщина, задержка мс];
     огоньки — [серий, шаг мс, сколько, скорость, жизнь мс, размер, подъём]; дрожь — [px, мс]. Короткая версия — shortPct % частиц, без дрожи */
  fx: {
    flash: [
      { sparks: [14, 160, 600, 4], streaks: [6, 210, 340, 2] },
      { sparks: [18, 180, 680, 4], streaks: [9, 230, 380, 2] },
      { sparks: [24, 200, 760, 5], streaks: [12, 250, 420, 2], motes: [3, 170, 6, 60, 1100, 3, 110] },
      { sparks: [30, 220, 860, 5], streaks: [16, 280, 460, 2], gold: [12, 210, 860, 4], motes: [4, 170, 7, 64, 1200, 3, 120] },
      { sparks: [38, 240, 1000, 6], streaks: [20, 310, 520, 3], gold: [22, 250, 1000, 5], rings: [[70, 700, 3, 0], [110, 950, 2, 140]], motes: [5, 170, 8, 68, 1300, 4, 140], shake: [3, 300] },
      { sparks: [46, 260, 1200, 6], streaks: [26, 340, 580, 3], gold: [32, 290, 1200, 6], rings: [[76, 760, 3, 0], [120, 1000, 2, 140], [56, 600, 2, 300]], motes: [6, 160, 9, 70, 1400, 4, 150], shake: [4, 360] },
      { sparks: [54, 280, 1400, 7], streaks: [32, 380, 660, 3], gold: [44, 330, 1400, 7], rings: [[82, 820, 3, 0], [130, 1100, 2, 140], [60, 650, 2, 300]], motes: [7, 160, 10, 70, 1500, 4, 160], shake: [5, 400] },
    ],
    shortPct: 55,
    failCol: '#e6a84b', ashCol: ['#8f8577', '#5f574d', '#b2a794'],
    snap: [5, 120, 380, 2], ash: [10, 46, 1100, 3], ember: [4, 60, 800, 2], ay: 220,   // нить рвётся — искры; пепел и угольки от сгоревшего; тяжесть пепла
    book: [4, 180, 6, 44, 1300, 3, 80],                                                  // огоньки над книгой
  },
};

/* ================== сервер решает ==================
   В игре это запросы: рецепты и таблицы наград живут только на сервере (CLAUDE.md, инварианты; §36.16).
   Прототип держит весь набор в recipes.js для проектирования, экран обращается к нему только здесь.
   Клиент получает найденные рецепты и подсказки, на попытку — итог. Спойлеры цикла VI (team) в прототипе не участвуют. */
const wsOrd = new Map(EN_RECIPES.recipes.map((r, i) => [r.id, i]));
const wsSum = r => r.in.reduce((a, [, q]) => a + q, 0);
/* из нескольких совпавших срабатывает самый полный: больше ингредиентов, затем больше единиц, затем порядок данных.
   Иначе рецепт, чей состав входит в другой, закрыл бы его навсегда: Дорожный фонарь — внутри Снадобья от ожогов.
   Правило прототипа, в §12 его нет — вопрос автору. */
const wsSpecific = (a, b) => b.in.length - a.in.length || wsSum(b) - wsSum(a) || wsOrd.get(a.id) - wsOrd.get(b.id);
/* сколько ресурса у игрока для мастерской: запасы и, у валюты кошелька (WS_DATA.wallet), кошелёк. Списание — сначала запасы, затем
   кошелёк; всё внутри одной операции сервера. Сервер и экран мастерской читают количество только так */
const wsWal = id => { const w = WS_DATA.wallet[id]; return w && S.wallet && w in S.wallet ? w : ''; };
const wsQty = id => BAG.qty(id) + (wsWal(id) ? Math.max(0, S.wallet[wsWal(id)] || 0) : 0);
const wsHas = (id, q = 1) => wsQty(id) >= q;
/* подпись остатка: у валюты-ресурса без запасов — «в кошельке N», у остального — «есть N» */
const wsHave = id => (wsWal(id) && !BAG.qty(id) ? 'в кошельке ' : 'есть ') + fmt(wsQty(id));
function wsTake(id, q) {
  const b = Math.min(BAG.qty(id), q), w = wsWal(id);
  if (b) BAG.take(id, b);
  if (q > b && w) S.wallet[w] -= q - b;
}
const WS_SRV = {
  recipes: () => EN_RECIPES.recipes.filter(r => !r.team),
  /* сид операции — заглушка серверного: исход крафта случайности не имеет (§12), по сиду рисуются только трещины и дым неудачи */
  seed: op => EB.seedOf('мастерская|' + op),
  /* найденный: открыт игроком или известен по правилу данных — рецепт руны доблести известен с первого осколка (known0) */
  isKnown: r => !!r && (BAG.known(r.id) || (!!r.known0 && r.in.some(([id]) => BAG.has(id)))),
  known: () => WS_SRV.recipes().filter(WS_SRV.isKnown),
  /* найденный игроком предмет (слово автора 30.09.2026: итог справа с названием — «если конечно игрок его нашёл, если же нет очевидно
     справа скомканная бумага»). Нашёл — держал его в руках: сейчас в запасах или кошельке, он прошёл через мастерскую или стоит в найденном
     рецепте; герой — в коллекции или его осколки у игрока. Что игрок держал, сервер помнит (S.ws.seen) */
  seen(id) {
    const it = BAG.item(id); if (!it || it.team) return false;
    if (it.tier === 'hero') { const h = RSI[it.heroId]; return !!h && (rsHas(h) || (S.rs.shards[h.id] || 0) > 0); }
    return S.ws.seen.includes(id) || wsQty(id) > 0 || WS_SRV.known().some(r => r.out[0] === id || r.in.some(([x]) => x === id));
  },
  /* книга рецептов глазами клиента — только собранное игроком. Найден целиком — рецепт. Найден частично (подсказки §12) — позиции по порядку
     рецепта: открытая — предмет и количество, если оно известно (q; по §12 количество игрок угадывает сам, подсказка его не открывает),
     закрытая — null; итог, его название и вид — только если игрок нашёл предмет итога, иначе их нет в ответе. Не найденных рецептов нет */
  book() {
    const whole = WS_SRV.known().map(r => ({ id: r.id, whole: true, r }));
    const part = Object.entries(S.ws.part).map(([id, p]) => {
      const r = BAG.recipe(id);
      if (!r || r.team || WS_SRV.isKnown(r)) return null;
      const out = WS_SRV.seen(r.out[0]) ? r.out[0] : '';
      const slots = r.in.map(([x]) => p.pos.includes(x) ? { id: x, q: (p.q && p.q[x]) || 0 } : null);
      return { id, whole: false, slots, open: p.pos.length, all: p.pos.length >= r.in.length, out, name: out ? r.n : '', kind: out ? r.kind : '' };
    }).filter(Boolean);
    return whole.concat(part);
  },
  /* запомнить найденное: предметы, что прошли через руки игрока */
  see(ids) { for (const id of ids) if (BAG.item(id) && !S.ws.seen.includes(id)) S.ws.seen.push(id); },
  /* попытка на столе (§12): какой рецепт сработает и какие подсказки откроются. Ничего не меняет — итог проводит attempt */
  check(cells) {
    const have = new Map(cells.map(c => [c.id, c.q])), pool = WS_SRV.recipes();
    const fit = pool.filter(r => r.in.every(([id, q]) => (have.get(id) || 0) >= q)).sort(wsSpecific)[0];
    if (fit) { const h = wsHero(fit); return wsHeroDone(h) ? { refuse: 'owned', r: fit, hero: h } : { made: fit }; }
    const ids = [...have.keys()], hints = [];
    if (ids.length >= WS_DATA.hintMin) for (const r of pool) {
      const ing = r.in.map(([id]) => id);
      if (ing.length < WS_DATA.hintFrom || WS_SRV.isKnown(r) || !ids.every(id => ing.includes(id))) continue;   // все заполненные верны
      const was = S.ws.part[r.id], before = was ? was.pos : [];
      if (before.length === ing.length) continue;                                  // уже открыт без количеств
      const full = ids.length === ing.length;                                     // все ресурсы верны, количество — нет: послабление
      const pos = ing.filter(id => full || before.includes(id) || ids.includes(id));
      const fresh = pos.filter(id => !before.includes(id));
      if (fresh.length) hints.push({ r, pos, fresh, all: pos.length === ing.length, first: !was });
    }
    return { made: null, hints };
  },
  /* попытка со стола — одна операция с номером: проверка, расход всего стола, выдача, подсказки. Ответ: { res } — итог;
     { again, res } — повтор того же номера, ничего не меняет; { refuse } — отказ без расхода. cells — [{ id, q, pos }], pos — ячейка стола */
  attempt(op, cells, consent) {
    const V = S.ws.ops;
    if (V[op]) return { again: true, res: V[op] };
    if (!cells.length) return { refuse: 'empty' };
    if (!cells.every(c => wsHas(c.id, c.q))) return { refuse: 'lack' };
    if (!consent && cells.some(c => wsSpecial(c.id))) return { refuse: 'consent' };
    const v = WS_SRV.check(cells);
    if (v.refuse) return { refuse: 'owned', hero: v.hero };
    const isNew = !!v.made && !WS_SRV.isKnown(v.made), put = cells.map(c => [c.id, c.q, c.pos]);
    WS_SRV.see(cells.map(c => c.id));
    cells.forEach(c => wsTake(c.id, c.q));   // со стола уходит всё: рецепт расходует своё, лишнее и неудача сгорают
    let res;
    if (v.made) {
      const r = v.made, h = wsHero(r);
      BAG.learn(r.id); delete S.ws.part[r.id];
      wsGive(r.out[0], r.out[1]);
      res = { op, kind: 'made', rid: r.id, out: r.out[1], isNew, burn: wsExtra(cells, r), hero: h ? h.id : '', cells: put, seed: WS_SRV.seed(op) };
    } else {
      v.hints.forEach(x => { S.ws.part[x.r.id] = { pos: x.pos }; });
      res = { op, kind: 'fail', burn: cells.map(c => [c.id, c.q]), hints: v.hints.map(x => ({ rid: x.r.id, fresh: x.fresh, all: x.all, first: x.first, n: x.pos.length })),
        cells: put, seed: WS_SRV.seed(op) };
    }
    S.ws.seq++; V[op] = res;
    return { res };
  },
  /* автодокрафт (§12.1) — одна операция с номером: сервер сам разворачивает цепочку по найденным рецептам, проверяет согласие на
     невосполнимое, списывает и выдаёт. Ответ — как у attempt */
  make(op, rid, n, ok) {
    const V = S.ws.ops;
    if (V[op]) return { again: true, res: V[op] };
    const r = BAG.recipe(rid);
    if (!r || r.team || !WS_SRV.isKnown(r)) return { refuse: 'unknown' };
    const p = wsPlan(r, n);
    if (p.owned) return { refuse: 'owned', p };
    if (!p.ok) return { refuse: p.stop.length ? 'stop' : 'lack', p };
    if (p.special.length && !ok) return { refuse: 'consent', p };
    if (!p.spend.every(([id, q]) => wsHas(id, q))) return { refuse: 'changed', p };
    WS_SRV.see(p.spend.map(([id]) => id).concat(p.steps.map(s => s.r.out[0])));
    p.spend.forEach(([id, q]) => wsTake(id, q));
    p.extra.forEach(([id, q]) => wsGive(id, q));
    wsGive(r.out[0], p.out);
    BAG.learn(r.id);
    const res = { op, kind: 'make', rid: r.id, n: p.n, out: p.out, steps: p.steps.length, spend: p.spend, hero: p.hero ? p.hero.id : '', seed: WS_SRV.seed(op) };
    S.ws.seq++; V[op] = res;
    return { res };
  },
};
const WS_REFUSE = {
  unknown: 'Автодокрафт работает только по найденным рецептам',
  owned: 'Герой уже в коллекции или его осколков хватает',
  stop: 'Неизвестный этап: автодокрафт остановлен',
  lack: 'Не хватает ресурсов',
  consent: 'Без согласия особый ресурс не списывается',
  changed: 'Запасы изменились — пересчитайте',
};

/* ================== помощники ================== */
const wsEmpty = () => Array.from({ length: WS_DATA.cells }, () => null);
const WS_SKIP_KEY = 'en-craft-skip';   // localStorage: «Пропустить анимацию» мастерской — свой выбор, не общий с сундуками и рулеткой
const wsSkipSaved = () => { try { return localStorage.getItem(WS_SKIP_KEY) === '1'; } catch (_) { return false; } };
/* S.ws.book — книга рецептов (screens/recipe-book.js): вкладка, вид, только избранное, поиск; t0 — когда раскрыта, мс; hl — новая запись,
   на которой книга раскрыта после удачи. S.ws.seen — предметы, что игрок держал в руках (WS_SRV.seen): демо — запасы и WS_DATA.demo.seen */
function wsFresh() {
  const D = WS_DATA.demo, part = {};
  for (const [id, p] of Object.entries(D.part)) part[id] = { pos: p.pos.slice() };
  return { cells: wsEmpty(), sel: 0, pick: '', view: 'table', inv: { cat: 'all', q: '', f: {} }, book: { tab: 'all', kind: '', fav: false, q: '', t0: 0, hl: '' }, part, fav: D.fav.slice(), last: null,
    ops: {}, seq: 1, fx: null, skip: wsSkipSaved(), drop: null, seen: Object.keys(DEMO_BAG.items).concat(D.seen) };
}
const wsOp = () => 'ws' + S.ws.seq;   // номер следующей операции: его несут кнопки «Попробовать», «Создать» и подтверждения
const wsItemOrd = new Map(EN_RECIPES.items.map((it, i) => [it.id, i]));
const wsGroupOf = it => Math.max(0, WS_DATA.groups.findIndex(g => g[2] && g[2].includes(it.tier)));
const wsSpecial = id => { const it = BAG.item(id); return !!it && (WS_DATA.special.tiers.includes(it.tier) || WS_DATA.special.items.includes(id)); };
const wsHero = r => { const it = r ? BAG.item(r.out[0]) : null; return it && it.tier === 'hero' ? RSI[it.heroId] || null : null; };
/* рецепт героя кладёт в запасы комплект его осколков (стадии знакомства, решение автора 30.09.2026: «важна суть появления осколка
   в инвентаре… если осколков хватает на полного героя, он уже входит во 2 стадию»); дальше — пробуждение за души, как у всех.
   Повтор не нужен, пока герой в коллекции или комплект лежит в запасах */
const wsHeroNeed = () => (RS.rules ? RS.rules.stub.shards : 0);
const wsHeroDone = h => !!h && (rsHas(h) || (S.rs.shards[h.id] || 0) >= wsHeroNeed());
const wsHeroWhy = h => rsHas(h) ? `${h.n} уже в коллекции` : `Осколков героя ${h.n} уже хватает — пробудите его за души`;
/* создаётся ли предмет рецептом: в игре — признак предмета, сам рецепт клиенту не приходит */
const wsByRecipe = id => (RX_OUT[id] || []).some(r => !r.team);
const wsCells = () => S.ws.cells.filter(Boolean);
const wsOn = id => { const c = S.ws.cells.find(x => x && x.id === id); return c ? c.q : 0; };
const wsCellMax = id => Math.min(WS_DATA.cellMax, wsQty(id));
const wsName = id => { const it = BAG.item(id); return it ? it.n : '—'; };
const wsNames = list => list.map(([id, q]) => `${wsName(id)} ×${fmt(q)}`).join(', ');
const wsTier = it => (EN_RECIPES.tiers[it.tier] || { n: '' }).n;
const wsCanRepeat = () => (S.ws.last || []).some(c => wsHas(c.id));
/* что со стола сгорит сверх рецепта */
const wsExtra = (cells, r) => cells.map(c => { const x = r.in.find(([id]) => id === c.id); return [c.id, c.q - (x ? x[1] : 0)]; }).filter(([, q]) => q > 0);
/* запасы игрока в порядке ярусов и данных: через BAG, валюта-ресурс — ещё и из кошелька (wsQty) */
const wsStock = () => EN_RECIPES.items.filter(it => !it.team && it.tier !== 'hero' && wsQty(it.id) > 0)
  .sort((a, b) => wsGroupOf(a) - wsGroupOf(b) || wsItemOrd.get(a.id) - wsItemOrd.get(b.id));

/* выдача итога: предмет — в запасы, герой — комплект его осколков в запасы (пробуждение — за души, придёт с 0 ур., 0 РП и 0 Добл,
   ADR-0019), валюта — в кошелёк */
function wsGive(id, q) {
  const it = BAG.item(id); if (!it) return;
  WS_SRV.see([id]);
  if (it.tier === 'hero') {   // комплект осколков героя; у пробуждённого осколки — в прах (§15.2)
    const h = RSI[it.heroId]; if (!h) return;
    const n = wsHeroNeed() * q;
    if (rsHas(h)) S.wallet.dust += n * rsDustOf(h); else S.rs.shards[h.id] = (S.rs.shards[h.id] || 0) + n;
    return;
  }
  const w = WS_DATA.wallet[id]; if (w && w in S.wallet) { S.wallet[w] += q; return; }
  BAG.add(id, q);
}
/* ресурс на стол: нажатием — в выбранную ячейку, если она занята другим — в первую свободную; переносом — в ячейку at */
function wsPut(id, at) {
  const W = S.ws, it = BAG.item(id);
  if (!it || it.team) return false;
  const max = wsCellMax(id);
  if (max < 1) { toast(`${it.n}: в запасах нет`); return false; }
  W.pick = id;
  const ex = W.cells.findIndex(c => c && c.id === id);
  if (at == null) {
    if (ex >= 0) { const c = W.cells[ex]; c.q = Math.min(max, c.q + 1); W.sel = ex; return true; }
    const i = W.cells[W.sel] ? W.cells.findIndex(c => !c) : W.sel;
    if (i < 0) { toast(`Все ${WS_DATA.cells} ячеек заняты`); return false; }
    W.cells[i] = { id, q: 1 }; W.sel = i; return true;
  }
  if (!(at >= 0 && at < WS_DATA.cells)) return false;
  if (ex !== at) { const moved = ex >= 0 ? W.cells[ex] : { id, q: 1 }; if (ex >= 0) W.cells[ex] = W.cells[at]; W.cells[at] = moved; }
  W.sel = at; return true;
}
/* после расхода вне стола ячейки не держат больше, чем есть в запасах */
function wsClamp() { S.ws.cells = S.ws.cells.map(c => { if (!c) return null; const q = Math.min(c.q, wsCellMax(c.id)); return q > 0 ? { id: c.id, q } : null; }); }
function wsSetTable(list) {
  S.ws.cells = wsEmpty();
  list.slice(0, WS_DATA.cells).forEach(([id, q], i) => { const m = wsCellMax(id); if (m > 0) S.ws.cells[i] = { id, q: Math.min(q, m) }; });
  const free = S.ws.cells.findIndex(c => !c);
  S.ws.sel = free < 0 ? 0 : free; S.ws.view = 'table';
}
/* куда ляжет ресурс без переноса: его ячейка, если он уже на столе; иначе выбранная, если пуста, иначе первая свободная; -1 — некуда */
function wsSlotFor(id) {
  const W = S.ws, ex = W.cells.findIndex(c => c && c.id === id);
  return ex >= 0 ? ex : !W.cells[W.sel] ? W.sel : W.cells.findIndex(c => !c);
}
/* ресурс на стол ровно в количестве q (0 — убрать со стола): q не больше, чем можно в ячейку. at — ячейка переноса */
function wsPutQ(id, q, at) {
  const W = S.ws, n = Math.max(0, Math.min(wsCellMax(id), Math.floor(q) || 0)), ex = W.cells.findIndex(c => c && c.id === id);
  if (!n) { if (ex >= 0) { W.cells[ex] = null; W.sel = ex; } return ex >= 0; }
  if (at != null && at >= 0 && at < WS_DATA.cells) {
    if (ex !== at) { const moved = ex >= 0 ? W.cells[ex] : { id, q: n }; if (ex >= 0) W.cells[ex] = W.cells[at]; W.cells[at] = moved; }
    W.cells[at].q = n; W.sel = at; W.pick = id; return true;
  }
  const i = wsSlotFor(id);
  if (i < 0) { toast(`Все ${WS_DATA.cells} ячеек заняты`); return false; }
  if (W.cells[i] && W.cells[i].id === id) W.cells[i].q = n; else W.cells[i] = { id, q: n };
  W.sel = i; W.pick = id; return true;
}
/* отклик стола (только вид): ресурс лёг в гнездо — опускается и вспыхивает искрами цвета стола; ушёл — пепел; сложился найденный
   рецепт — кольцо света у пьедестала цветом редкости итога. Запасы и стол это не меняет */
function wsFeel(before) {
  const W = S.ws, now = wsNow(), fx = typeof crBurst === 'function';
  W.cells.forEach((c, i) => {
    const b = before[i];
    if (c && (!b || b.id !== c.id)) { W.drop = { i, id: c.id, t: now }; if (fx) crBurst(`[data-wscell="${i}"]`, 'put'); }
    else if (!c && b && fx) crBurst(`[data-wscell="${i}"]`, 'take', '#9a8f80');
  });
  const was = wsGuessOf(before), g = wsGuess();
  if (g.st === 'known' && (!was || was.r !== g.r)) {
    W.match = { rid: g.r.id, t: now };
    if (fx) { const out = BAG.item(g.r.out[0]); crBurst('.ws-hex-in .ws-core', 'match', out && typeof crColor === 'function' ? crColor(out.r) : undefined); }
  }
}
const wsCellsCopy = () => S.ws.cells.map(c => c && { id: c.id, q: c.q });
/* найденный рецепт для прежнего набора стола — сравнить, сложился ли новый */
function wsGuessOf(cells) {
  const have = new Map(cells.filter(Boolean).map(c => [c.id, c.q]));
  const r = have.size ? WS_SRV.known().filter(x => x.in.every(([id, q]) => (have.get(id) || 0) >= q)).sort(wsSpecific)[0] : null;
  return r ? { r } : null;
}
/* нажатие на ресурс: ползунок количества от 0 до min(100, запас), потом — ячейка (слова автора 29.09.2026). at — ячейка переноса */
function wsPick(id, at) {
  const it = BAG.item(id);
  if (!it || it.team) return false;
  if (wsCellMax(id) < 1) { toast(`${it.n}: в запасах нет`); return false; }
  const on = wsOn(id), to = at != null ? at : wsSlotFor(id);
  if (to < 0) { toast(`Все ${WS_DATA.cells} ячеек заняты`); return false; }
  S.ws.pick = id;
  open('wsqty', id, { v: on || Math.min(wsCellMax(id), WS_DATA.pick.start), at: at != null ? at : null });
  return true;
}
/* доля ползунка для подсветки дорожки, целые проценты */
const wsPct = (v, lo, hi) => Math.floor(Math.max(0, v - lo) * 100 / Math.max(1, hi - lo));
/* кнопка ползунка: новый ресурс — «В ячейку · N»; уже на столе — «Готово · N», на нуле — «Убрать со стола»; ноль и не на столе — недоступна */
const wsQGoTxt = (on, v) => !v ? (on ? 'Убрать со стола' : 'В ячейку') : `${on ? 'Готово' : 'В ячейку'} · ${fmt(v)}`;
const wsQGo = (on, v) => `<button class="btn go" id="wsQvGo" data-a="wsqdo"${!v && !on ? ' disabled' : ''}>${wsQGoTxt(on, v)}</button>`;
/* ползунок тянут — число, дорожка и кнопка меняются сразу, без перерисовки экрана; отпустили — перерисовка (change → действие) */
function wsRangeLive(t) {
  const v = Math.floor(Number(t.value)) || 0, lo = Math.floor(Number(t.min)) || 0, hi = Math.floor(Number(t.max)) || 1;
  try { t.style.setProperty('--p', wsPct(v, lo, hi) + '%'); } catch (_) { }
  const n = document.getElementById(t.id + 'N'); if (n) n.textContent = fmt(v);
  if (t.id === 'wsQv') {
    const o = S.overlay; if (!o || o.t !== 'wsqty') return;
    o.v = v;
    const b = document.getElementById('wsQvGo'), on = wsOn(o.arg);
    if (b) { b.textContent = wsQGoTxt(on, v); b.disabled = !v && !on; }
    return;
  }
  const W = S.ws, c = W.cells[W.sel];
  if (c && v >= 1) { c.q = Math.min(v, wsCellMax(c.id)); const q = document.querySelector && document.querySelector(`#game [data-wscell="${W.sel}"] .q`); if (q) q.textContent = fmt(c.q); }
}
/* после перерисовки фокус остаётся на ползунке: клавиши-стрелки двигают его дальше */
function wsRefocus(id) { try { const x = document.getElementById(id); if (x && x.focus) x.focus({ preventScroll: true }); } catch (_) { } }

/* разворот цепочки по найденным рецептам (§12.1, §12.4): сначала запасы, затем остаток уже созданного в этой цепочке, затем новый этап.
   Неизвестный этап — предмет, который создаётся рецептом, но рецепт не найден: автодокрафт останавливается */
function wsPlan(r, n) {
  const by = {};
  WS_SRV.known().forEach(k => { if (!by[k.out[0]]) by[k.out[0]] = k; });
  const left = {}, spend = {}, made = {}, lack = {}, stop = [], steps = [];
  const want = (id, q, d) => {
    const s = id in left ? left[id] : wsQty(id), a = Math.min(s, q);
    if (a) { left[id] = s - a; spend[id] = (spend[id] || 0) + a; q -= a; }
    const m = made[id] || 0, b = Math.min(m, q);
    if (b) { made[id] = m - b; q -= b; }
    if (!q) return;
    const p = by[id];
    /* валюта кошелька (Энериум, рунный ключ) — «не хватает», а не «неизвестный этап»: её копят, рецепт жилы — не единственный путь */
    if (!p || d > WS_DATA.depth) { if (wsByRecipe(id) && !wsWal(id)) { if (!stop.includes(id)) stop.push(id); } else lack[id] = (lack[id] || 0) + q; return; }
    const t = Math.ceil(q / p.out[1]);
    p.in.forEach(([x, k]) => want(x, k * t, d + 1));
    steps.push([p, t]);
    made[id] = (made[id] || 0) + t * p.out[1] - q;
  };
  r.in.forEach(([x, k]) => want(x, k * n, 1));
  const st = [];
  steps.forEach(([p, t]) => { const e = st.find(x => x.r === p); if (e) e.t += t; else st.push({ r: p, t }); });
  const sp = Object.entries(spend), hero = wsHero(r);
  return { r, n, out: r.out[1] * n, spend: sp, steps: st, stop, lack: Object.entries(lack), extra: Object.entries(made).filter(([, q]) => q > 0),
    special: sp.filter(([id]) => wsSpecial(id)), hero, owned: wsHeroDone(hero), ok: !stop.length && !Object.keys(lack).length };
}
/* сколько раз можно создать сейчас */
function wsMaxN(r) {
  const cap = wsHero(r) ? 1 : WS_DATA.makeCap;
  let n = 0;
  while (n < cap && wsPlan(r, n + 1).ok) n++;
  return n;
}
/* что видит клиент на столе: совпадение только с найденными рецептами — исход всё равно решает сервер */
function wsGuess() {
  const cells = wsCells();
  const lack = cells.filter(c => c.q > wsQty(c.id)), special = cells.filter(c => wsSpecial(c.id));
  if (!cells.length) return { st: 'empty', lack, special, extra: [] };
  const have = new Map(cells.map(c => [c.id, c.q]));
  const fit = WS_SRV.known().filter(r => r.in.every(([id, q]) => (have.get(id) || 0) >= q)).sort(wsSpecific)[0];
  if (!fit) return { st: 'unknown', lack, special, extra: [] };
  const h = wsHero(fit);
  return { st: 'known', r: fit, lack, special, extra: wsExtra(cells, fit), owned: wsHeroDone(h) };
}
/* подсказка, чьи открытые позиции все лежат на столе */
function wsTrail() {
  const on = new Set(wsCells().map(c => c.id));
  for (const [id, p] of Object.entries(S.ws.part)) {
    const r = BAG.recipe(id);
    if (r && !WS_SRV.isKnown(r) && p.pos.length < r.in.length && p.pos.every(x => on.has(x))) return { r, n: p.pos.length };
  }
  return null;
}
/* попытка со стола: сервер решает и выдаёт одной операцией, затем анимация показывает итог. Повтор номера ничего не меняет */
function wsAttempt(consent, op) {
  const cells = S.ws.cells.map((c, i) => c && { id: c.id, q: c.q, pos: i }).filter(Boolean);
  if (!cells.length) return close();
  const v = WS_SRV.attempt(op || wsOp(), cells, consent);
  if (v.again) return;
  if (v.refuse === 'lack') { S.overlay = null; return toast('Не хватает в запасах — поправьте стол'); }
  if (v.refuse === 'consent') return toast(WS_REFUSE.consent);
  if (v.refuse === 'owned') { S.overlay = null; return toast(`${wsHeroWhy(v.hero)}.${TM(' Что даёт повтор рецепта героя, не решено — заглушка прототипа')}`); }
  if (v.refuse) return;
  S.ws.last = cells.map(c => ({ id: c.id, q: c.q })); S.ws.cells = wsEmpty(); S.ws.sel = 0;
  wsFxStart(v.res);
}

/* ================== разметка ================== */
/* колодец предмета recipes.js: иконка ремесла или яруса из «Древа рецептов» (trIcon), кромка — редкость, ромб — особый ресурс */
function wsWell(it, o = {}) {
  if (!it) return '';
  const sp = !o.plain && wsSpecial(it.id), tag = o.stat ? 'span' : 'button';
  const cls = ['well', o.sel ? 'sel' : '', sp ? 'ws-sp' : '', o.cls || ''].filter(Boolean).join(' ');
  const lbl = `${trEsc(it.n)}${typeof o.q === 'number' ? ', ' + o.q + ' шт.' : ''}${o.on ? ', на столе ' + o.on : ''}${sp ? ', особый ресурс' : ''}`;
  const act = o.stat ? '' : ` data-a="${o.act || 'wsinfo'}" data-v="${o.v != null ? o.v : it.id}"${o.drag ? ` draggable="true" data-wsdrag="${it.id}"` : ''} aria-label="${lbl}"`;
  const q = o.q == null ? '' : `<span class="q">${typeof o.q === 'number' ? fmt(o.q) : o.q}</span>`;
  /* рамка по виду предмета (crK, screens/crafthall.js): материал — вид, свет — редкость */
  const k = typeof crK === 'function' ? crK(it) : '';
  return `<${tag} class="${cls}" data-r="${it.r}"${act}${o.attr || ''} title="${trEsc(it.n)}"${o.size ? ` style="--s:${o.size}px"` : ''}${k}>${trIcon(it)}${q}${o.on ? `<span class="ws-on">${fmt(o.on)}</span>` : ''}${o.note ? '<i class="ws-nt" aria-hidden="true"></i>' : ''}</${tag}>`;
}
const wsList = list => `<div class="ws-sum">${list.map(([id, q]) => { const it = BAG.item(id); return it ? `<span class="ws-need${wsSpecial(id) ? ' sp' : ''}">${wsWell(it, { stat: true, q })}<span class="col"><b>${trEsc(it.n)}</b><small class="faint">${wsTier(it)}</small></span></span>` : ''; }).join('')}</div>`;
const wsNeedHtml = ([id, q]) => { const it = BAG.item(id); return it ? `<span class="ws-need${wsSpecial(id) ? ' sp' : ''}">${wsWell(it, { stat: true, q })}<span class="col"><b>${trEsc(it.n)}</b><small class="faint num">${wsHave(id)}${wsSpecial(id) ? ' · особый' : ''}</small></span></span>` : ''; };
const wsIng = (r, t) => `<span class="ws-ing">${r.in.map(([id, q]) => wsWell(BAG.item(id), { stat: true, q: q * t })).join('')}</span>`;
const wsStepHtml = (r, t, fin) => `<li${fin ? ' class="fin"' : ''}>${wsWell(BAG.item(r.out[0]), { stat: true, size: 28 })}<b>${trEsc(r.n)}</b><span class="num faint">×${fmt(t)}</span>${wsIng(r, t)}</li>`;

function wsView() {
  return `<section class="scr"><div class="ws">${wsInvHtml()}${wsCraftHtml()}</div></section>`;
}
/* плитка запасов: значок и количество; справа сверху — лупа карточки ресурса. Нажатие — ползунок количества, перенос — на ячейку.
   На столе — свет плитки и число на столе слева сверху; особый ресурс — ромб слева снизу */
function wsTile(it, o = {}) {
  const q = o.q != null ? o.q : wsQty(it.id), on = o.on != null ? o.on : wsOn(it.id), sp = wsSpecial(it.id), sel = !o.kit && S.ws.pick === it.id;
  const lbl = `${trEsc(it.n)}, ${q} шт.${on ? ', на столе ' + on : ''}${sp ? ', особый ресурс' : ''}`;
  const a = x => o.kit ? 'noop' : x, k = typeof crK === 'function' ? crK(it) : '';
  return `<div class="ws-tile${on ? ' on' : ''}" data-r="${it.r}"><button class="well${sp ? ' ws-sp' : ''}${sel ? ' sel' : ''}" data-r="${it.r}" data-a="${a('wspick')}" data-v="${it.id}"${o.kit ? '' : ` draggable="true" data-wsdrag="${it.id}"`} aria-label="${lbl}" title="${trEsc(it.n)}"${k}>${trIcon(it)}<span class="q">${fmt(q)}</span>${on ? `<span class="ws-on">${fmt(on)}</span>` : ''}</button><button class="ws-lens" data-a="${a('wsinfo')}" data-v="${it.id}" aria-label="Карточка ресурса: ${trEsc(it.n)}" title="Карточка ресурса">${ic('search')}</button></div>`;
}
/* выборка запасов для 1000 ресурсов (screens/crafthall.js): вкладка — группа ярусов, поиск по имени, грани в листе «Фильтры» —
   цикл, биом, вид, ремесло, редкость. Действуют только значения, которые есть в списке вкладки */
const WS_FACETS = ['cyc', 'biome', 'kind', 'spec', 'r'];
function wsInvView() {
  const W = S.ws, q = trNorm(W.inv.q.trim()), g = WS_DATA.groups.find(x => x[0] === W.inv.cat) || WS_DATA.groups[0];
  const base = wsStock().filter(it => !g[2] || g[2].includes(it.tier));
  const F = typeof crFacets === 'function' ? crFacets(base) : null, f = W.inv.f || {}, E = {};
  if (F) for (const k of WS_FACETS) E[k] = F[k].includes(f[k]) ? f[k] : '';
  const list = base.filter(it => (!q || trNorm(it.n).includes(q)) && (!F || crFacetMatch(it, E)));
  return { g, base, F, E, list, n: WS_FACETS.filter(k => E[k]).length };
}
/* зона «Инвентарь» — шкаф картотеки: запасы по группам, поиск и «Фильтры», по пять в ряд, порциями. Нажатие — ползунок количества,
   потом ячейка; лупа — карточка ресурса */
function wsInvHtml() {
  const W = S.ws, V = wsInvView(), g = V.g;
  const tabs = WS_DATA.groups.map(([k, l]) => `<button role="tab" aria-selected="${g[0] === k}" data-a="wscat" data-v="${k}">${l}</button>`).join('');
  const key = `wsinv:${g[0]}`, P = typeof crPage === 'function' ? crPage(V.list, key) : { shown: V.list, rest: 0 };
  const wells = P.shown.map(it => wsTile(it)).join('') + (typeof crMoreHtml === 'function' ? crMoreHtml(key, P.rest, 'ws-more') : '');
  const fb = V.F && WS_FACETS.some(k => V.F[k].length > 1)
    ? `<button class="iconbtn ws-fb" data-a="sheet" data-v="wsfilt" aria-pressed="${!!V.n}" aria-label="Фильтры${V.n ? ': ' + V.n : ''}" title="Фильтры: цикл, биом, вид, ремесло, редкость">${WS_FUNNEL}${V.n ? `<b class="num">${V.n}</b>` : ''}</button>` : '';
  const none = V.base.length && V.n ? '<div class="ws-none"><p class="faint">Ничего не найдено</p><button class="btn sm" data-a="wsfclr">Сбросить фильтры</button></div>' : '<p class="faint ws-none">Ничего не найдено</p>';
  return `<div class="pnl ws-inv">
    <div class="pnl-h"><h2>Инвентарь</h2><label class="search grow">${ic('search')}<input id="wsInvQ" type="search" placeholder="Поиск по запасам" value="${trEsc(W.inv.q)}" autocomplete="off" aria-label="Поиск по запасам"></label>${fb}</div>
    <div class="tabs" role="tablist" aria-label="Запасы по ярусам">${tabs}</div>
    <div class="ws-grid scroll grow" data-keep="${key}">${wells || none}</div>
  </div>`;
}
/* воронка кнопки «Фильтры»: в наборе значков index.html её нет — та же, что у «Запасов» */
const WS_FUNNEL = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V18l-3 2v-7.5z"/></svg>';
/* зона «Крафт»: стол; над ним — кнопка «Книга рецептов»: книга раскрывается на всё окно (screens/recipe-book.js), число — записей в ней */
function wsCraftHtml() {
  const n = WS_SRV.book().length;
  const bk = `<button class="ws-bkbtn" data-a="wsview" data-v="book" aria-label="Книга рецептов, записей: ${fmt(n)}" title="Книга рецептов">${ic('book')}<span>Книга рецептов</span><b class="num">${fmt(n)}</b></button>`;
  return `<div class="pnl ws-craft"><div class="pnl-h"><h2>Крафт</h2><span class="g-spacer"></span>${bk}</div>${wsTableHtml()}</div>`;
}
/* ячейка стола — гнездо в бронзовом кольце: пустая — «+», с ресурсом — предмет в рамке своего вида. Только что положенный ресурс
   опускается в гнездо (--dd — момент от начала, мс: перерисовка не рвёт движение); у ресурса, чья пометка Этриона сейчас у стола, —
   печать в углу: так видно, о каком гнезде записка */
function wsCellHtml(c, i, noteId) {
  const sel = S.ws.sel === i, it = c ? BAG.item(c.id) : null, D = S.ws.drop, now = wsNow();
  const drop = !!(D && D.i === i && c && D.id === c.id && now - D.t < WS_FX.drop.life);
  const attr = ` data-wscell="${i}" aria-pressed="${sel}"${drop ? ` style="--dd:${D.t - now}ms"` : ''}`;
  if (!it) return `<button class="well empty ws-cell${sel ? ' sel' : ''}" data-a="wscell" data-v="${i}"${attr} aria-label="Ячейка ${i + 1}, пустая">${ic('plus')}</button>`;
  const note = !!noteId && noteId === c.id;
  return wsWell(it, { act: 'wscell', v: i, q: c.q, sel, note, cls: 'ws-cell' + (c.q > wsQty(c.id) ? ' ws-lack' : '') + (drop ? ' ws-drop' : ''), attr });
}
/* желоба стола: от гнезда к пьедесталу; у занятого гнезда желоб светится цветом стола, у найденного рецепта — цветом редкости итога */
function wsGrooves(r) {
  const G = WS_FX.geo;
  return S.ws.cells.map((c, i) => `<i class="ws-gr${c ? ' on' : ''}" style="--a:${G.ang[i] + 180}deg"${c && r ? ` data-r="${r}"` : ''}></i>`).join('');
}
/* стол — круг мастерской: базальтовый диск в бронзовом ободе, шесть гнёзд по кругу, в середине — пьедестал результата.
   Найденный рецепт — итог на пьедестале, кольцо света под ним цветом редкости. Слева от стола — пометка Этриона ресурса выбранной ячейки */
function wsTableHtml() {
  const g = wsGuess(), out = g.st === 'known' ? BAG.item(g.r.out[0]) : null, r = out ? out.r : 0;
  /* итог встаёт на пьедестал только в миг, когда рецепт сложился (--dm — момент от начала, мс); кольцо идёт по часам страницы */
  const now = wsNow(), M = S.ws.match, fresh = !!(out && M && M.rid === g.r.id && now - M.t < WS_FX.drop.life);
  const core = out ? `<span class="well ws-core known${fresh ? ' fresh' : ''}" data-r="${out.r}"${typeof crK === 'function' ? crK(out) : ''} title="${trEsc(out.n)}"${fresh ? ` style="--dm:${M.t - now}ms"` : ''}>${trIcon(out)}</span>` : '<span class="well ws-core"><span>?</span></span>';
  /* пометка у стола: ресурс выбранной ячейки; у пустой ячейки — последний взятый со стола или первый на столе — стол не прыгает при выборе */
  const c = S.ws.cells[S.ws.sel], on = S.ws.cells.filter(Boolean), last = on.find(x => x.id === S.ws.pick) || on[0];
  const it = c ? BAG.item(c.id) : last ? BAG.item(last.id) : null;
  const note = it && typeof crHint === 'function' ? crHint(it, { cls: 'ws-note' + (wsNoteLast === it.id ? ' shown' : ''), name: true }) : '';
  wsNoteLast = note ? it.id : '';
  const cells = S.ws.cells.map((x, i) => wsCellHtml(x, i, wsNoteLast)).join('');
  return `<div class="ws-hex${note ? ' noted' : ''}">${note}<div class="ws-hex-in${out ? ' match' : ''}"${r ? ` data-r="${r}"` : ''} style="--rt:${-(now % WS_FX.ringMs)}ms"><i class="ws-disc"></i><i class="ws-rg"></i>${wsGrooves(r)}${cells}${core}</div></div>${wsQtyHtml()}${wsFootHtml(g)}`;
}
/* пометка у стола появляется, когда её ресурс только выбран; при следующих перерисовках — уже на месте */
let wsNoteLast = '';
/* количество в выбранной ячейке: ползунок от 1 до min(100, запас), число и «убрать». Имя ресурса — кнопка карточки; пустая ячейка —
   пустая строка, которая держит высоту */
function wsQtyHtml() {
  const W = S.ws, c = W.cells[W.sel], it = c ? BAG.item(c.id) : null;
  if (!it) return '<div class="ws-qty"></div>';
  const max = Math.max(1, wsCellMax(c.id)), v = Math.max(1, Math.min(max, c.q));
  return `<div class="ws-qty"><button class="ws-qn" data-a="wsinfo" data-v="${it.id}" title="Карточка: ${trEsc(it.n)} · ${wsHave(c.id)}"><span>${trEsc(it.n)}</span>${ic('search')}</button><input class="ws-range" id="wsQc" type="range" min="1" max="${max}" step="1" value="${v}" data-a="wsqset" style="--p:${wsPct(v, 1, max)}%" aria-label="Количество в ячейке ${W.sel + 1}: от 1 до ${max}"><b class="num ws-qv" id="wsQcN">${fmt(v)}</b><button class="ws-qb" data-a="wsq" data-v="x" aria-label="Убрать из ячейки">${ic('x')}</button></div>`;
}
function wsFootHtml(g) {
  const any = g.st !== 'empty';
  let st, cls = g.st;
  if (!any) st = 'Положите ресурсы в ячейки — порядок не важен.';
  else if (g.lack.length) { cls = 'bad'; st = 'Не хватает: ' + trEsc(wsNames(g.lack.map(c => [c.id, c.q - wsQty(c.id)]))); }
  else if (g.st === 'known') st = g.owned ? `«${trEsc(g.r.n)}»: ${trEsc(wsHeroWhy(wsHero(g.r)))}` : `Совпадает с рецептом «${trEsc(g.r.n)}»${g.extra.length ? ' · лишнее сгорит: ' + trEsc(wsNames(g.extra)) : ''}`;
  else {
    const t = wsTrail(), nm = t ? wsPartName(t.r) : '';   // итог обрывка не найден — без имени
    st = t ? `На столе все открытые позиции ${nm ? `«${trEsc(nm)}»` : 'обрывка рецепта'}: ${t.n} из ${t.r.in.length}. Остальное — угадать.` : 'Сочетание неизвестно. При неудаче сгорит всё положенное.';
  }
  const go = any && !g.lack.length && !g.owned;
  return `<div class="ws-foot"><p class="ws-st ${cls}" role="status">${st}</p><button class="btn ghost sm" data-a="wsclear"${any ? '' : ' disabled'}>Очистить</button><button class="btn go" data-a="wstry" data-v="${wsOp()}"${go ? '' : ' disabled'}>${g.st === 'known' ? 'Создать' : 'Попробовать'}</button></div>`;
}

/* ================== книга рецептов (§12.4) — screens/recipe-book.js ==================
   Здесь — то, что нужно столу, итогу попытки и карточке ресурса. Обрывок рецепта, итог которого игрок не нашёл, безымянен везде: его
   названия нет ни в книге, ни у стола, ни в итоге, ни в карточке (WS_SRV.book, слово автора 30.09.2026) */
/* подсказки — записи книги, найденные частично: [{ r, part }] */
const wsParts = () => Object.keys(S.ws.part).map(id => ({ r: BAG.recipe(id), part: S.ws.part[id] })).filter(x => x.r && !x.r.team && !WS_SRV.isKnown(x.r));
/* имя обрывка для игрока: итог найден — название рецепта, нет — пусто */
const wsPartName = r => (r && WS_SRV.seen(r.out[0]) ? r.n : '');

/* ================== анимация крафта: показ итога ==================
   R — один показ: host — 'game' (окно поверх игры) или 'kit' (сцена раздела UI-кита); phase — 'anim' или 'res' (итог); tempo — full,
   short или fail; cells — предметы на своих местах круга; T — моменты от начала, мс. Итог уже выдан сервером: показ его не меняет,
   закрыть окно, пропустить анимацию или нажать на сцену — итог тот же.
   Анимация — CSS по времени: задержки (--dt, --dp, --da) отсчитаны от начала показа минус прошедшее, поэтому перерисовка экрана посреди
   анимации её не рвёт. Базовый стиль элемента — его конечное состояние; до своего момента элемент стоит в первом кадре. В итоге (res)
   мимолётного — нитей, предметов, жара, дыма — в разметке нет, остальное стоит на местах без анимации */
const wsReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
const wsFxSkipOn = () => !!(S.ws && S.ws.skip) || wsReduced();
const wsNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
/* цвет редкости — из токенов --r1…--r7 (ADR-0027) */
const wsColor = r => { try { return getComputedStyle(document.documentElement).getPropertyValue('--r' + r).trim() || EnFx.COL.gold; } catch (_) { return '#ddbc7a'; } };
let wsFxSeq = 0;
/* места предметов на круге: со стола — свои ячейки, у автодокрафта — ингредиенты рецепта симметрично, на всю серию */
function wsFxCells(res, r) {
  if (res.kind !== 'make') return (res.cells || []).filter(c => c[2] >= 0 && c[2] < WS_DATA.cells).map(([id, q, pos]) => ({ id, q, pos }));
  const list = r ? r.in.slice(0, WS_DATA.cells) : [], at = WS_FX.spread[list.length - 1] || [];
  return list.map(([id, q], i) => ({ id, q: q * (res.n || 1), pos: at[i] }));
}
function wsFxRun(res, host, o = {}) {
  const r = res.rid ? BAG.recipe(res.rid) : null, out = r ? BAG.item(r.out[0]) : null, fail = res.kind === 'fail';
  const hero = res.hero ? RSI[res.hero] || null : null, isNew = !fail && res.kind !== 'make' && !!res.isNew;
  const R = { id: ++wsFxSeq, host, res, kind: res.kind, tempo: fail ? 'fail' : isNew ? 'full' : 'short', rec: r, out, hero, isNew,
    r: fail ? 0 : Math.min(7, Math.max(1, o.r || (out ? out.r : 1))), q: fail ? 0 : res.out || 1, n: res.kind === 'make' ? res.n || 1 : 1,
    cells: wsFxCells(res, r), trial: !!o.trial, phase: 'anim', t0: wsNow(), tr: null, timers: [] };
  /* короткая без листа: известный рецепт со стола без лишнего, не герой — итог держится и окно закрывается само, строкой */
  R.auto = !R.trial && res.kind === 'made' && !isNew && !(res.burn || []).length && !hero;
  R.T = wsFxTimes(R);
  if (fail) { R.cracks = wsCracks(res.seed || WS_SRV.seed(res.op || 'проба')); R.smoke = wsSmoke(R, res.seed || WS_SRV.seed(res.op || 'проба')); }
  return R;
}
/* моменты показа от начала, мс: у каждого предмета свои — нить, втягивание или распад; дальше круг, жар, вспышка, итог */
function wsFxTimes(R) {
  const P = WS_FX[R.tempo], B = WS_FX.book, fail = R.kind === 'fail', T = { in: [], thr: [], pull: [], crumble: [] };
  R.cells.forEach((c, i) => {
    T.in.push(P.in + i * P.inStep); T.thr.push(P.thr + i * P.thrStep);
    if (fail) T.crumble.push(P.crumble + i * P.crumbleStep); else T.pull.push(P.pull + i * P.pullStep);
  });
  if (fail) return Object.assign(T, { shiver: P.shiver, snap: P.snap, crack: P.crack, pane: P.end, end: P.end });
  Object.assign(T, { tug: P.tug, ring: P.ring, heat: P.heat, flash: P.flash, rise: P.rise, pane: P.end, end: P.end, book: P.end });
  if (R.isNew) T.end = P.end + B.end;
  if (R.auto) T.close = P.end + P.auto;
  return T;
}
/* трещины неудачи: от обода внутрь круга, ветвями с изломом. Рисунок — от сида операции: та же операция — те же трещины */
const wsRad = a => a * Math.PI / 180;
function wsCracks(seed) {
  const G = WS_FX.geo, C = WS_FX.crack, rng = EB.makeRng(seed), c = G.circ / 2, lim = c - C.edge / 2, out = [];
  const pick = ([a, b]) => a + rng(b - a + 1);
  for (let k = 0; k < C.from; k++) {
    const a0 = rng(360), sx = c + Math.round(Math.cos(wsRad(a0)) * (c - C.edge)), sy = c + Math.round(Math.sin(wsRad(a0)) * (c - C.edge)), nb = pick(C.branch);
    for (let b = 0; b < nb; b++) {
      let x = sx, y = sy, a = (a0 + 180 + rng(2 * C.fork + 1) - C.fork + 360) % 360;
      const ns = pick(C.seg);
      for (let j = 0; j < ns; j++) {
        const l = pick(C.len), nx = x + Math.round(Math.cos(wsRad(a)) * l), ny = y + Math.round(Math.sin(wsRad(a)) * l);
        if ((nx - c) * (nx - c) + (ny - c) * (ny - c) > lim * lim) break;
        out.push({ x, y, a, l, j, k });
        x = nx; y = ny; a = (a + rng(2 * C.bend + 1) - C.bend + 360) % 360;
      }
    }
  }
  return out;
}
/* дым неудачи: клубы у каждого сгоревшего места и в центре — место, снос, размер и разнобой от сида операции */
function wsSmoke(R, seed) {
  const G = WS_FX.geo, M = WS_FX.smoke, rng = EB.makeRng((seed ^ 0x534D4F4B) >>> 0), c = G.circ / 2, out = [];
  const jit = v => rng(2 * v + 1) - v, size = () => M.size[0] + rng(M.size[1] - M.size[0] + 1);
  R.cells.forEach((cell, i) => {
    const [hx, hy] = G.hex[cell.pos];
    for (let k = 0; k < M.perCell; k++) out.push({ x: c + hx + jit(M.spread), y: c + hy + jit(M.spread), sx: jit(M.drift), s: size(), t: R.T.crumble[i] + rng(M.lag) });
  });
  for (let k = 0; k < M.core; k++) out.push({ x: c + jit(M.spread), y: c + jit(M.spread), sx: jit(M.drift), s: size(), t: R.T.crack + rng(M.lag) });
  return out;
}
/* круг Мастерской: обод, руны, шестиугольник мест, кольцо ядра. Руны — постоянный сид, круг всегда один и тот же */
let wsRuneCache = '';
function wsRuneSvg() {
  if (wsRuneCache) return wsRuneCache;
  const G = WS_FX.geo, c = G.circ / 2, rng = EB.makeRng(EB.seedOf('Мастерская форм · круг')), step = Math.floor(360 / G.runes);
  const P = [[-3, -6], [3, -6], [-3, 0], [3, 0], [-3, 6], [3, 6], [0, -6], [0, 6]];   // узлы знака
  let g = '';
  for (let k = 0; k < G.runes; k++) {
    let d = 'M0 -6V6';
    for (let s = 1 + rng(2); s > 0; s--) { const a = P[rng(P.length)], b = P[rng(P.length)]; if (a !== b) d += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`; }
    g += `<path transform="rotate(${k * step} ${c} ${c}) translate(${c} ${c - G.runeR})" d="${d}"/>`;
  }
  const hex = G.hex.map(([x, y], i) => `${i ? 'L' : 'M'}${c + x} ${c + y}`).join('') + 'Z', [r1, r2, r3] = G.rim;
  wsRuneCache = `<svg viewBox="0 0 ${G.circ} ${G.circ}" aria-hidden="true" focusable="false"><circle cx="${c}" cy="${c}" r="${r1}"/><circle class="d" cx="${c}" cy="${c}" r="${r2}"/><path class="h" d="${hex}"/><circle cx="${c}" cy="${c}" r="${r3}"/><g class="g">${g}</g></svg>`;
  return wsRuneCache;
}
const wsSty = list => { const s = list.filter(Boolean).join(';'); return s ? ` style="${s}"` : ''; };
/* круг сцены. e — мс от начала показа: все задержки — момент минус e */
function wsFxCircleHtml(R, e) {
  const G = WS_FX.geo, T = R.T, P = WS_FX[R.tempo], anim = R.phase === 'anim', fail = R.kind === 'fail', c = G.circ / 2;
  const d = t => `${Math.round(t - e)}ms`, h = [];
  /* кольцо рун: медленный ход всегда; удача — рывок и вспышка свечения в цвете редкости; неудача — свечение мерцает, круг вздрагивает и тускнеет */
  const sg = anim ? (fail ? ['ws-fx-sg ws-qk', wsSty([`--dt:${d(T.crack)}`])] : ['ws-fx-sg ws-up', wsSty([`--dt:${d(T.ring)}`, `--tt:${P.ringDur}ms`])]) : ['ws-fx-sg' + (fail ? '' : ' ws-up'), ''];
  const rs = fail && anim ? ` class="ws-fx-rs ws-dim"${wsSty([`--dt:${d(T.crack)}`])}` : ` class="ws-fx-rs${fail ? ' ws-dim' : ''}"`;
  const gl = anim ? (fail ? ` class="ws-fx-rgl ws-fk"${wsSty([`--dt:${d(T.snap - WS_FX.fail.snapDur)}`, `--tt:${WS_FX.fail.snapDur * 2}ms`])}` : ` class="ws-fx-rgl ws-fl"${wsSty([`--dt:${d(T.ring)}`, `--tt:${P.ringDur}ms`])}`)
    : ` class="ws-fx-rgl${fail ? ' ws-fk' : ' ws-fl'}"`;
  h.push('<i class="ws-fx-disc"></i>');
  h.push(`<div class="ws-fx-spin"><div class="${sg[0]}"${sg[1]}><span${rs}>${wsRuneSvg()}</span><span${gl}>${wsRuneSvg()}</span></div></div>`);
  /* удача: ореол и лучи за итогом — с его подъёма */
  if (!fail) {
    const up = anim ? wsSty([`--dt:${d(T.rise)}`]) : '';
    h.push(`<div class="ws-fx-halo${anim ? ' ws-in' : ''}"${up}><i></i></div>`);
    if (WS_FX.rays[R.r - 1]) h.push(`<div class="ws-fx-ry${anim ? ' ws-in' : ''}"${up}><i></i></div>`);
  }
  /* неудача: трещины от обода к центру; в итоге — нарисованы */
  if (fail) {
    const cs = (R.cracks || []).map(s => `<i class="ws-fx-ck" style="left:${s.x}px;top:${s.y}px;width:${s.l}px;transform:rotate(${s.a}deg)"><i${anim ? wsSty([`--dt:${d(T.crack + (s.j + s.k * 2) * P.crackStep)}`]) : ''}></i></i>`).join('');
    h.push(`<div class="ws-fx-cks"${anim ? wsSty([`--tt:${P.crackDur}ms`]) : ''}>${cs}</div>`);
  }
  /* нити: от места к центру. Удача — стягиваются к центру вместе с предметом; неудача — рвутся посередине, половины хлещут назад */
  if (anim) R.cells.forEach((cell, i) => {
    const [hx, hy] = G.hex[cell.pos], len = Math.round(Math.sqrt(hx * hx + hy * hy));
    const draw = wsSty([`--dt:${d(T.thr[i])}`, `--tt:${P.thrDur}ms`]);
    const inner = fail
      ? `<i class="ws-fx-t1"${wsSty([`--dt:${d(T.snap)}`, `--tt:${P.snapDur}ms`, `--dk:${d(T.shiver)}`])}></i><i class="ws-fx-t2"${wsSty([`--dt:${d(T.snap)}`, `--tt:${P.snapDur}ms`, `--dk:${d(T.shiver)}`])}></i><i class="ws-fx-tk"></i>`
      : `<i class="ws-fx-tb"${wsSty([`--dt:${d(T.pull[i])}`, `--tt:${P.pullDur}ms`])}></i>`;
    h.push(`<i class="ws-fx-th" data-i="${i}" style="left:${c + hx}px;top:${c + hy}px;width:${len}px;transform:rotate(${G.ang[cell.pos]}deg)"><i class="ws-fx-ta"${draw}>${inner}</i></i>`);
  });
  /* ядро: «?» попытки или значок известного итога; удача — сгорает во вспышке, неудача — тускнеет с трещиной */
  const coreIn = R.tempo === 'short' && R.out ? trIcon(R.out) : '<b>?</b>';
  if (fail) h.push(`<div class="ws-fx-core ws-dm"${anim ? wsSty([`--dt:${d(T.crack)}`]) : ''}>${coreIn}<i class="ws-fx-cx">${ic('crack')}</i></div>`);
  else if (anim) h.push(`<div class="ws-fx-core ws-go"${wsSty([`--dt:${d(T.flash)}`])}${R.tempo === 'short' && R.out ? ` data-r="${R.out.r}"` : ''}>${coreIn}</div>`);
  /* удача: раскалённое ядро растёт; у серии — удары по числу созданий; во вспышке жар гаснет */
  if (!fail && anim) {
    const pulses = R.n > 1 ? Math.min(R.n, WS_FX.short.pulses) : 0;
    const b = pulses ? `<b class="ws-fx-thump"${wsSty([`--dt:${d(T.heat)}`, `--n:${pulses}`, `--tp:${WS_FX.short.pulse}ms`])}></b>` : '<b></b>';
    h.push(`<div class="ws-fx-heat"${wsSty([`--dt:${d(T.heat)}`, `--tt:${P.heatDur}ms`])}><i${wsSty([`--dt:${d(T.flash)}`])}>${b}</i></div>`);
    h.push(`<i class="ws-fx-fl"${wsSty([`--dt:${d(T.flash)}`, `--tt:${P.flashDur}ms`, `--fs:${WS_FX.flashScale[R.r - 1]}`])}></i>`);
  }
  /* итог поднимается из центра в свете своей редкости: колодец предмета или лицо героя */
  if (!fail) {
    const [cw, ch] = R.hero ? G.card : [G.res, G.res], up = anim ? [`--dt:${d(T.rise)}`, `--tt:${P.riseDur}ms`] : [];
    const body = R.hero ? `<span class="ws-fx-hero" data-r="${R.r}">${rsFace(R.hero)}</span>`
      : R.out ? wsWell(R.out, { stat: true, plain: true, size: G.res, q: R.q > 1 ? '×' + fmt(R.q) : null }) : '';
    h.push(`<div class="ws-fx-res${anim ? ' ws-in' : ''}" data-r="${R.r}"${wsSty([`width:${cw}px`, `height:${ch}px`, `margin:${-ch / 2}px 0 0 ${-cw / 2}px`].concat(up))}>${body}</div>`);
  }
  /* предметы на своих местах: появляются; удача — вздрагивают к центру и втягиваются; неудача — дрожат, покрываются пеплом и осыпаются */
  if (anim) R.cells.forEach((cell, i) => {
    const it = BAG.item(cell.id); if (!it) return;
    const [hx, hy] = G.hex[cell.pos], half = G.cell / 2;
    const ip = fail ? ['ws-fx-ip ws-dn', [`--dt:${d(T.crumble[i])}`, `--tt:${P.crumbleDur}ms`]] : ['ws-fx-ip ws-pl', [`--dt:${d(T.pull[i])}`, `--tt:${P.pullDur}ms`]];
    const iq = fail ? ['ws-fx-iq ws-sv', [`--dt:${d(T.shiver)}`, `--tt:${P.shiverDur}ms`]] : P.tugDur ? ['ws-fx-iq ws-tg', [`--dt:${d(T.tug)}`, `--tt:${P.tugDur}ms`]] : ['ws-fx-iq', []];
    const ash = fail ? `<i class="ws-fx-ash"${wsSty([`--dt:${d(T.crumble[i])}`])}></i>` : '';
    h.push(`<div class="ws-fx-it" data-i="${i}" style="left:${c + hx - half}px;top:${c + hy - half}px;width:${G.cell}px;height:${G.cell}px;--dt:${d(T.in[i])}"><div class="${ip[0]}" style="--tx:${-hx}px;--ty:${-hy}px;${ip[1].join(';')}"><div class="${iq[0]}"${wsSty(iq[1])}>${wsWell(it, { stat: true, q: cell.q, size: G.cell })}${ash}</div></div></div>`);
  });
  /* неудача: дым от сгоревшего и из центра */
  if (fail && anim) h.push((R.smoke || []).map(s => `<i class="ws-fx-sm" style="left:${s.x}px;top:${s.y}px;--sx:${s.sx}px;--sz:${s.s};--dt:${d(s.t)};--tt:${P.smokeDur}ms"></i>`).join(''));
  h.push('<i class="ws-fx-mid"></i>');
  return `<div class="ws-fx-c" style="width:${G.circ}px;height:${G.circ}px;margin:${-c}px 0 0 ${-c}px"><div class="ws-fx-sc">${h.join('')}</div></div>`;
}
/* книга рецептов в листе итога: раскрывается, листы, свет снизу вверх, чернила пишут имя рецепта по букве */
function wsFxBookHtml(R, e) {
  const B = WS_FX.book, T = R.T, anim = R.phase === 'anim', d = t => `${Math.round(t - e)}ms`, at = t => (anim ? wsSty([`--dt:${d(T.book + t)}`]) : '');
  const flips = Array.from({ length: B.flip }, (_, k) => `<i class="ws-fx-pf"${anim ? wsSty([`--dt:${d(T.book + B.flipAt + k * B.flipStep)}`, `--tt:${B.flipDur}ms`]) : ''}></i>`).join('');
  const name = R.rec ? R.rec.n : R.out ? R.out.n : '';
  const ink = [...name].map((ch, k) => `<span${anim ? wsSty([`--dt:${d(T.book + B.ink + k * B.inkStep)}`]) : ''}>${ch === ' ' ? ' ' : trEsc(ch)}</span>`).join('');
  return `<div class="ws-fx-bk"><i class="ws-fx-bl"${anim ? wsSty([`--dt:${d(T.book + B.light)}`, `--tt:${B.lightDur}ms`]) : ''}></i>
    <div class="ws-fx-bb"${at(0)}><i class="ws-fx-pgl"${at(0)}></i><i class="ws-fx-pgr"></i>${flips}</div>
    <b class="ws-fx-ink" aria-label="${trEsc(name)}">${ink}</b></div>`;
}
/* строка предметов итога: колодцы с количеством, имя — в подсказке */
const wsFxWells = list => `<div class="ws-fx-ws">${(list || []).map(([id, q]) => { const it = BAG.item(id); return it ? wsWell(it, { stat: true, q, size: 34 }) : ''; }).join('')}</div>`;
/* подсказка в итоге: итог рецепта игрок нашёл — с названием, нет — «обрывки рецепта» без имени (как в книге) */
function wsFxHints(list) {
  return (list || []).map(x => {
    const r = BAG.recipe(x.rid); if (!r) return '';
    const txt = x.all ? 'все ресурсы верны, количество — нет: рецепт открыт без количеств'
      : x.first ? `появился в книге: верно ${x.n} из ${r.in.length}` : `открыта позиция «${trEsc(x.fresh.map(wsName).join('», «'))}»: верно ${x.n} из ${r.in.length}`;
    const nm = wsPartName(r);
    return `<div class="ws-hint">${ic('eye')}<span>${nm ? `<b>«${trEsc(nm)}»</b> — ${txt}` : `<b>Обрывки рецепта</b> — ${txt}`}</span></div>`;
  }).join('');
}
/* лист итога справа от круга: одна мысль — что вышло; что сгорело и подсказка — если положена по §12; одно главное действие */
function wsFxPaneHtml(R, e) {
  const res = R.res, anim = R.phase === 'anim', rows = [], acts = [], game = !R.trial;
  let eb, nm, q = '';
  if (R.kind === 'fail') {
    eb = 'Попытка'; nm = 'Не вышло';
    rows.push(`<div class="ws-fx-row"><span class="ws-fx-sub">Сгорело всё положенное</span>${wsFxWells(res.burn)}</div>`);
    const hints = wsFxHints(res.hints);
    if (hints) rows.push(hints);
    if (game && wsCanRepeat()) acts.push('<button class="btn sm ghost" data-a="wsrepeat">Повторить набор</button>');
    if (game && hints) acts.push('<button class="btn sm" data-a="wshints">К подсказкам</button>');
  } else {
    const out = R.out;
    nm = trEsc(out ? out.n : '—');
    if (!R.hero && (R.q > 1 || R.kind === 'make')) q = `<b class="ws-fx-q num">×${fmt(R.q)}</b>`;
    if (R.kind === 'make') {
      eb = `Автодокрафт${res.steps ? ' · этапов ' + res.steps : ''}`;
      if ((res.spend || []).length) rows.push(`<details class="ws-fx-det"><summary>Списано · ${fmt(res.spend.length)} ${plural(res.spend.length, 'вид', 'вида', 'видов')}</summary>${wsFxWells(res.spend)}</details>`);
    } else if (R.isNew) {
      eb = 'Новая запись в книге';
      rows.push(`<p class="ws-fx-line">Новый рецепт: дальше его можно создать из книги, со всей цепочкой.</p>`);
    } else eb = out ? wsTier(out) : '';
    if (R.hero) rows.push(`<p class="ws-fx-line">${trEsc(R.hero.n)}: комплект осколков в запасах — героя пробуждают души, придёт с 0 ур. · 0 РП · 0 Добл.</p>`);
    if ((res.burn || []).length) rows.push(`<div class="ws-fx-row"><span class="ws-fx-sub">Лишнее сгорело</span>${wsFxWells(res.burn)}</div>`);
    if (game && R.hero) acts.push(`<button class="link" data-a="rhero" data-v="${R.hero.id}">${ic('users')}Книга героя</button>`);
    if (game && R.isNew && R.rec) acts.push(`<button class="btn sm ghost" data-a="wsbookgo" data-v="${R.rec.id}">${ic('book')}В книгу</button>`);
    else if (game && R.kind === 'made' && wsCanRepeat()) acts.push('<button class="btn sm ghost" data-a="wsrepeat">Повторить набор</button>');
  }
  acts.push(`<button class="btn go ws-fx-main" data-a="close">${R.trial ? 'Закрыть' : 'Готово'}</button>`);
  const note = TM(R.trial ? 'Проба — не выдача: запасы и книга не меняются. Итог — тот же показ, что в мастерской.'
    : `Итог выдан до анимации одной операцией ${trEsc(res.op || '')}: сервер проверил стол, списал и выдал. Анимация только показывает — пропуск и закрытие итог не меняют, повтор номера ничего не делает. Числа вида — WS_FX.`, 'p', 'reason');
  return `<section class="ws-fx-pn" aria-label="Итог"${anim ? ' inert' : ''}>${R.isNew ? wsFxBookHtml(R, e) : ''}
    <div class="ws-fx-ph"><span class="ws-fx-eb">${eb}</span><div class="ws-fx-tl"><h3 class="ws-fx-nm">${nm}</h3>${q}</div></div>
    ${rows.length || note ? `<div class="ws-fx-pb">${rows.join('')}${note}</div>` : ''}<div class="ws-fx-acts">${acts.join('')}</div></section>`;
}
/* шапка окна: что идёт, маленькое окно с галочкой «Пропустить анимацию» и крестик */
function wsFxTopHtml(R) {
  const red = wsReduced(), lbl = R.kind === 'make' ? `Автодокрафт${R.n > 1 ? ' ×' + fmt(R.n) : ''}` : R.tempo === 'short' ? 'Мастерская' : 'Попытка';
  return `<div class="ws-fx-top"><span class="ws-fx-eb">${R.trial ? 'Проба · ' : ''}${lbl}</span>
    <label class="ws-skip"${red ? ' title="В системе включено «меньше движения»"' : ''}><input type="checkbox" data-a="wsfxskip"${wsFxSkipOn() ? ' checked' : ''}${red ? ' disabled' : ''}><span>Пропустить анимацию</span></label>
    <button class="iconbtn x ws-fx-x" data-a="close" aria-label="Закрыть">${ic('x')}</button></div>`;
}
/* сцена целиком. e — мс от начала показа */
function wsFxStageHtml(R, e) {
  e = Math.max(0, Math.round(e || 0));
  const T = R.T, anim = R.phase === 'anim', tr = (R.tr == null ? R.t0 : R.tr) - R.t0, G = WS_FX.geo;
  const dp = (anim ? T.pane : Math.min(T.pane, tr)) - e, da = (anim ? T.end : Math.min(T.end, tr)) - e;
  const vars = [`--d0:${-e}ms`, `--dp:${dp}ms`, `--da:${da}ms`, `--tsh:${WS_FX.shiftDur}ms`, `--tpn:${WS_FX.pane}ms`, `--shift:${-G.shift}px`, `--pw:${G.pane}px`, `--px:${G.paneX}px`, `--top:${G.top}px`];
  if (R.r) vars.push(`--ha:${WS_FX.halo[R.r - 1]}`, `--ra:${WS_FX.rays[R.r - 1]}`, `--sf:${WS_FX.sflash[R.r - 1]}`);
  if (R.auto && anim) vars.push(`--dx:${T.close - WS_FX.fade - e}ms`, `--tfd:${WS_FX.fade}ms`);
  const cls = ['ws-fx', { full: 'ws-fx-full', short: 'ws-fx-short', fail: 'ws-fx-fail' }[R.tempo], anim ? 'ws-fx-anim' : 'ws-fx-done', R.auto ? 'ws-fx-auto' : '', R.isNew ? 'ws-fx-new' : ''].filter(Boolean).join(' ');
  const sfl = anim && R.kind !== 'fail' && WS_FX.sflash[R.r - 1] ? `<i class="ws-fx-sfl"${wsSty([`--dt:${Math.round(T.flash - e)}ms`, `--tt:${WS_FX[R.tempo].flashDur}ms`])}></i>` : '';
  return `<div class="${cls}" data-k="${R.kind}" data-wsrun="${R.id}"${R.r ? ` data-r="${R.r}"` : ''} style="${vars.join(';')}">
    <div class="ws-fx-bg"></div>${sfl}${wsFxCircleHtml(R, e)}${R.auto ? '' : wsFxPaneHtml(R, e)}
    ${anim ? '<button class="ws-fx-tap" data-a="wsfxreveal" aria-label="Сразу к итогу" tabindex="-1"></button>' : ''}${wsFxTopHtml(R)}</div>`;
}

/* ================== показ: запуск, таймеры, итог ================== */
const wsFxCur = host => host === 'kit' ? WS_KIT.run : S.ws ? S.ws.fx : null;
const wsFxLive = R => !!R && R.phase === 'anim' && wsFxCur(R.host) === R;
const wsFxOn = R => !!R && wsFxCur(R.host) === R;
function wsFxStop(R) { if (!R) return; for (const t of R.timers) clearTimeout(t); R.timers = []; }
function wsFxPaint(R) { if (R.host === 'kit') wsKitPaint(); else render(); }
/* итог сервера → показ в окне поверх игры. При «Пропустить анимацию» и «меньше движения» — сразу итог, короткая без листа — строкой */
function wsFxStart(res) {
  wsClamp();
  wsFxStop(S.ws.fx);
  const R = wsFxRun(res, 'game');
  S.ws.fx = R; S.overlay = { t: 'wsres', res };
  if (wsFxSkipOn()) {
    if (R.auto) { S.ws.fx = null; S.overlay = null; return toast(wsFxSay(R)); }
    R.phase = 'res'; R.tr = R.t0;
  } else wsFxSchedule(R);
  render();
  if (R.phase === 'res') wsFxFocus(R); else focusOverlay();
}
/* таймеры одного показа: частицы вспышки, огоньки, разрыв нитей, пепел, итог. Каждый проверяет, что показ ещё идёт */
function wsFxSchedule(R) {
  const T = R.T, P = WS_FX[R.tempo], at = (ms, f) => { R.timers.push(setTimeout(() => { if (wsFxLive(R)) { try { f(); } catch (_) { } } }, Math.max(0, ms))); };
  if (R.kind === 'fail') {
    at(T.snap, () => wsBurstSnap(R));
    R.cells.forEach((c, i) => at(T.crumble[i], () => wsBurstAsh(R, i)));
  } else {
    at(T.flash, () => wsBurstFlash(R));
    at(T.rise + P.riseDur, () => wsBurstMotes(R));
    if (R.isNew) at(T.book + WS_FX.book.light, () => wsBurstBook(R));
  }
  if (R.auto) at(T.close, () => wsFxDone(R)); else at(T.end, () => wsFxReveal(R));
}
function wsFxFocus(R) {
  if (R.host !== 'game') return;
  try { requestAnimationFrame(() => { const b = document.querySelector('#game .ws-fx-pn .ws-fx-main'); if (b) b.focus({ preventScroll: true }); }); } catch (_) { }
}
/* итог: после анимации, по нажатию на сцену, галочкой посреди анимации. Короткая без листа — закрывается строкой */
function wsFxReveal(R) {
  if (!wsFxLive(R)) return;
  if (R.auto) return wsFxDone(R);
  wsFxStop(R); R.phase = 'res'; R.tr = wsNow();
  wsFxPaint(R); wsFxFocus(R);
}
const wsFxSay = R => R.kind === 'fail' ? 'Не вышло — всё положенное сгорело' : `Создано: ${R.out ? R.out.n : '—'} ×${fmt(R.q)} — в запасах`;
function wsFxDone(R) {
  wsFxStop(R);
  if (R.host === 'kit') { WS_KIT.run = null; wsKitPaint(); return; }
  if (S.ws.fx === R) S.ws.fx = null;
  if (S.overlay && S.overlay.t === 'wsres' && S.overlay.res === R.res) S.overlay = null;
  toast(wsFxSay(R));
}
/* после каждой перерисовки: окно закрыли — показ остановлен; закрыли посреди анимации — итог приходит строкой */
function wsFxSync() {
  const R = S.ws && S.ws.fx; if (!R) return;
  if (S.overlay && S.overlay.t === 'wsres' && S.overlay.res === R.res) return;
  wsFxStop(R); S.ws.fx = null;
  if (R.phase === 'anim') setTimeout(() => toast(wsFxSay(R)), 0);
}
window.addEventListener('en-render', wsFxSync);
/* «Пропустить анимацию»: выбор помнит localStorage, без него всё работает; галочка посреди анимации — итог сразу */
function wsFxSetSkip(on, host) {
  S.ws.skip = !!on;
  try { localStorage.setItem(WS_SKIP_KEY, S.ws.skip ? '1' : '0'); } catch (_) { }
  const R = wsFxCur(host);
  if (S.ws.skip && wsFxLive(R)) { if (R.host === 'kit' && R.auto) return wsFxDone(R); return wsFxReveal(R); }
  if (host === 'kit') wsKitPaint(); else render();
}
/* показ для overlay: текущий или — если окно открыто без показа — итог без анимации, один на это окно */
function wsFxFor(o) {
  const cur = S.ws.fx;
  if (cur && cur.res === o.res) return cur;
  if (!o.res || !o.res.kind) return null;
  const R = wsFxRun(o.res, 'game'); R.phase = 'res'; R.tr = R.t0; R.auto = false;
  S.ws.fx = R;
  return R;
}

/* ================== частицы: слой рядом с #game — перерисовка экрана его не сносит; у UI-кита — свой слой в сцене ================== */
const WS_FXI = { game: null, kit: null };
function wsFxLayer(host) {
  if (host === 'kit') { const k = document.getElementById('wsKit'); return k && k.querySelector ? k.querySelector(':scope > .ws-fxl') : null; }
  const g = document.getElementById('game'), p = g && g.parentElement;
  if (!p || !p.querySelector) return null;
  let L = p.querySelector(':scope > .ws-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'ws-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  return L;
}
function wsFxI(host) {
  if (!window.EnFx) return null;
  const L = wsFxLayer(host); if (!L) return null;
  let I = WS_FXI[host];
  if (!I || I.host !== L) { if (I) I.destroy(); I = WS_FXI[host] = EnFx.create(L); }
  return I;
}
const wsFxEl = (R, sel) => { const root = document.getElementById(R.host === 'kit' ? 'wsKit' : 'game'); return root && root.querySelector ? root.querySelector(`[data-wsrun="${R.id}"] ${sel}`) : null; };
const wsCut = (a, k) => a ? [Math.max(1, Math.floor(a[0] * k / 100))].concat(a.slice(1)) : a;
/* вспышка удачи: искры цвета редкости, полосы света, с эпической — золото, с древней — кольца и лёгкая дрожь; короткая — меньше и без дрожи */
function wsBurstFlash(R) {
  const fx = wsFxI(R.host), el = wsFxEl(R, '.ws-fx-mid'); if (!fx || !el) return;
  const F = WS_FX.fx, P = F.flash[R.r - 1] || F.flash[0], k = R.tempo === 'short' ? F.shortPct : 100, C = EnFx.COL, b = fx.center(el), col = wsColor(R.r);
  fx.burst(b.x, b.y, col, ...wsCut(P.sparks, k));
  fx.burst(b.x, b.y, C.steel, ...wsCut(P.streaks, k), { shape: 'streak', w: 1.4 });
  if (P.gold) fx.burst(b.x, b.y, C.gold, ...wsCut(P.gold, k));
  const rad = WS_FX.geo.circ / 2;
  for (const [pr, ms, th, dl] of P.rings || []) setTimeout(() => { if (wsFxOn(R)) fx.ring(b.x, b.y, col, Math.floor(rad * pr / 100), ms, th); }, dl);
  if (P.shake && R.tempo !== 'short') fx.shake(...P.shake);
}
/* итог поднялся: огоньки его редкости и золото медленно всплывают */
function wsBurstMotes(R) {
  const fx = wsFxI(R.host), el = wsFxEl(R, '.ws-fx-mid'), P = WS_FX.fx.flash[R.r - 1]; if (!fx || !el || !P || !P.motes) return;
  const [n, step, k, sp, life, size, up] = P.motes, b = fx.center(el), col = wsColor(R.r), C = EnFx.COL;
  for (let i = 0; i < n; i++) setTimeout(() => { if (wsFxOn(R)) fx.burst(b.x, b.y, i % 2 ? C.gold : col, k, sp, life, size, { ay: -up, drag: 1, fade: 'in' }); }, i * step);
}
/* нити рвутся: искры в месте разрыва */
function wsBurstSnap(R) {
  const fx = wsFxI(R.host); if (!fx) return;
  const F = WS_FX.fx;
  R.cells.forEach((c, i) => { const el = wsFxEl(R, `.ws-fx-th[data-i="${i}"] .ws-fx-tk`); if (el) { const b = fx.center(el); fx.burst(b.x, b.y, F.failCol, ...F.snap, { shape: 'streak', w: 1.1 }); } });
}
/* предмет сгорел: пепел осыпается, угольки гаснут вверх */
function wsBurstAsh(R, i) {
  const fx = wsFxI(R.host), el = wsFxEl(R, `.ws-fx-it[data-i="${i}"]`); if (!fx || !el) return;
  const F = WS_FX.fx, b = fx.center(el);
  fx.burst(b.x, b.y, F.ashCol[i % F.ashCol.length], ...F.ash, { shape: 'shard', blend: 'normal', vr: 5, ay: F.ay, rot: 0 });
  fx.burst(b.x, b.y, F.failCol, ...F.ember, { ay: -Math.floor(F.ay / 3), fade: 'in' });
}
/* новая запись: над книгой всплывают золотые огоньки */
function wsBurstBook(R) {
  const fx = wsFxI(R.host), el = wsFxEl(R, '.ws-fx-bb'); if (!fx || !el) return;
  const [n, step, k, sp, life, size, up] = WS_FX.fx.book, b = fx.center(el), C = EnFx.COL;
  for (let i = 0; i < n; i++) setTimeout(() => { if (wsFxOn(R)) fx.burst(b.x, b.y, i % 2 ? C.gold : C.steel, k, sp, life, size, { ay: -up, drag: 1, fade: 'in' }); }, i * step);
}

/* ================== листы поверх ================== */
Object.assign(OV, {
  /* фильтры запасов мастерской: цикл, биом, вид, ремесло, редкость — список за листом меняется сразу */
  wsfilt() {
    const V = wsInvView();
    const body = V.F && typeof crFacetSheet === 'function' ? crFacetSheet(V.F, V.E, 'wsf', WS_FACETS) : '';
    return sheet('Фильтры', body || '<p class="faint">У этой группы фильтров нет.</p>',
      `<button class="link" data-a="wsfclr">Сбросить</button><button class="btn go" data-a="close">Показать · ${fmt(V.list.length)}</button>`);
  },
  /* сведения о ресурсе: ярус, описание и пометка Этриона — загадка, где ресурс пригодится (§12, поле hint), запасы, найденные рецепты.
     Будущий биом и босс не раскрываются (§12.5) */
  wsitem(o) {
    const it = BAG.item(o.arg); if (!it || it.team) return '';
    const sp = it.spec ? it.spec.split('+').map(s => EN_RECIPES.specs[s] ? EN_RECIPES.specs[s].n.toLowerCase() : '').filter(Boolean).join(' + ') : '';
    const uses = WS_SRV.known().filter(r => r.in.some(([id]) => id === it.id));
    const trails = wsParts().filter(x => x.part.pos.includes(it.id)), on = wsOn(it.id);
    const body = `<div class="ws-o">
      <div class="row" style="gap:12px">${wsWell(it, { stat: true, size: 64 })}<div class="col" style="gap:4px;min-width:0"><span class="eyebrow">${wsTier(it)}${sp ? ' · ' + sp : ''}</span><b class="serif" style="font-size:22px;line-height:1.05">${trEsc(it.n)}</b><span class="ws-rar" data-r="${it.r}">${ICON('r' + it.r, 16)}${RAR[it.r]}</span></div><span class="g-spacer"></span><div class="stat" style="align-items:flex-end"><b>${fmt(wsQty(it.id))}</b><small>${wsWal(it.id) && !BAG.qty(it.id) ? 'в кошельке' : 'в запасах'}</small></div></div>
      <p class="quote">${trEsc(it.lore)}</p>${typeof crHint === 'function' ? crHint(it) : ''}
      <dl class="kv"><dt>Цикл</dt><dd>${it.pool ? 'общий пул' : ROMAN[it.cyc] || '—'}</dd><dt>На столе</dt><dd>${on ? fmt(on) : 'нет'}</dd>${wsSpecial(it.id) ? '<dt>Особый ресурс</dt><dd class="gold">расход только с согласия</dd>' : ''}</dl>
      <span class="eyebrow">Найденные рецепты</span>${uses.length ? `<div class="tr-use">${uses.map(r => `<button class="chip" data-a="wsmake" data-v="${r.id}">${trEsc(r.n)}</button>`).join('')}</div>` : '<p class="faint" style="font-size:12.5px">Пока ни одного. Рецепты ищут на столе, загадка подсказывает дорогу.</p>'}
      ${trails.length ? `<span class="eyebrow">Обрывки рецептов</span><div class="tr-use">${trails.map(x => { const nm = wsPartName(x.r); return `<button class="chip spirit" data-a="wsbookpart" data-v="${x.r.id}">${nm ? trEsc(nm) : 'Итог не найден'} · ${x.part.pos.length} из ${x.r.in.length}</button>`; }).join('')}</div>` : ''}
    </div>`;
    return sheet('Карточка ресурса', body, `<button class="btn go" data-a="wspick" data-v="${it.id}"${wsCellMax(it.id) ? '' : ' disabled'}>${ic('plus')}На стол</button>`);
  },
  /* ввод ресурса: ползунок от 0 до min(100, запас) — сколько положить; подтверждение кладёт в ячейку. Ресурс уже на столе — ползунок
     стоит на его количестве, 0 — убрать со стола. Особый ресурс — строкой: расход только с согласия при попытке */
  wsqty(o) {
    const it = BAG.item(o.arg); if (!it || it.team) return '';
    const max = wsCellMax(it.id), on = wsOn(it.id), v = Math.max(0, Math.min(max, o.v == null ? 0 : o.v)), step = WS_DATA.pick.step;
    const body = `<div class="ws-o ws-qd">
      <div class="ws-qh">${wsWell(it, { stat: true, size: 52 })}<div class="col" style="gap:3px;min-width:0"><span class="eyebrow">${wsTier(it)}</span><b class="serif ws-qt">${trEsc(it.n)}</b><small class="faint num">${wsHave(it.id)}${on ? ' · на столе ' + fmt(on) : ''}</small></div><b class="num ws-qbig" id="wsQvN">${fmt(v)}</b></div>
      <div class="ws-qs"><button class="ws-qb" data-a="wsqn" data-v="${-step}"${v <= 0 ? ' disabled' : ''} aria-label="Меньше">${ic('minus')}</button><input class="ws-range" id="wsQv" type="range" min="0" max="${max}" step="1" value="${v}" data-a="wsqv" style="--p:${wsPct(v, 0, max)}%" aria-label="Сколько положить: от 0 до ${max}"><button class="ws-qb" data-a="wsqn" data-v="${step}"${v >= max ? ' disabled' : ''} aria-label="Больше">${ic('plus')}</button></div>
      <div class="ws-qe num"><span>0</span><span>${fmt(max)}</span></div>
      ${wsSpecial(it.id) ? '<p class="reason">Особый ресурс: при попытке спишется только с вашего согласия.</p>' : ''}</div>`;
    return dialog('Сколько положить', body, `<button class="btn ghost" data-a="close">Отмена</button>${wsQGo(on, v)}`, 'ws-qdlg');
  },
  /* подтверждение попытки: со стола уйдёт всё; особый ресурс — только с согласия. Номер операции несёт кнопка */
  wstry(o) {
    const cells = wsCells(), g = wsGuess(), sp = g.special;
    const guess = g.st === 'known'
      ? `<p class="muted" style="font-size:14px">Совпадает с найденным рецептом «${trEsc(g.r.n)}»: он создаст ${trEsc(wsName(g.r.out[0]))} ×${g.r.out[1]}.${g.extra.length ? ' Лишнее сгорит: ' + trEsc(wsNames(g.extra)) + '.' : ''}</p>`
      : `<p class="reason warn">Сочетание неизвестно. При неудаче сгорит всё положенное. Верное сочетание создаёт предмет всегда.</p><p class="reason">Подсказка бывает у рецептов от ${WS_DATA.hintFrom} ингредиентов: если все положенные ресурсы верны и их не меньше ${WS_DATA.hintMin}, рецепт появится в книге.</p>`;
    const cert = sp.length ? `<label class="cert"><input type="checkbox" data-a="wsok"${o.ok ? ' checked' : ''}><span><b>Разрешить расход: ${trEsc(wsNames(sp.map(c => [c.id, c.q])))}</b><small>Особый ресурс не восполнить. Без согласия он не списывается.</small></span></label>` : '';
    const body = `<div class="ws-o"><span class="eyebrow">Со стола уйдёт всё</span>${wsList(cells.map(c => [c.id, c.q]))}${guess}${cert}</div>`;
    const ok = g.st === 'known' ? 'Создать' : 'Попробовать';
    return dialog(g.st === 'known' ? 'Создать со стола' : 'Попробовать сочетание', body, `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="wstrydo" data-v="${o.op || ''}"${sp.length && !o.ok ? ' disabled' : ''}>${ok}</button>`);
  },
  /* автодокрафт: количество, этапы по найденным рецептам, суммарный расход, согласие на невосполнимое (§12.1, §12.4) */
  wsmake(o) {
    const r = BAG.recipe(o.arg); if (!r || r.team) return '';
    /* состав ненайденного рецепта клиент не знает — и не показывает */
    if (!WS_SRV.isKnown(r)) return dialog('Создать', '<p class="reason warn">Рецепт ещё не найден: автодокрафт работает только по найденным. Рецепты ищут на столе.</p>', '<button class="btn go" data-a="close">Понятно</button>');
    const n = Math.max(1, o.n || 1), p = wsPlan(r, n), out = BAG.item(r.out[0]);
    const cap = p.hero ? 1 : WS_DATA.makeCap, max = wsMaxN(r);
    const step = `<div class="ws-n" role="group" aria-label="Сколько раз создать"><button class="ws-qb" data-a="wsn" data-v="-1"${n <= 1 ? ' disabled' : ''} aria-label="Меньше">−</button><b class="num">${n}</b><button class="ws-qb" data-a="wsn" data-v="1"${n >= cap ? ' disabled' : ''} aria-label="Больше">+</button><button class="ws-qb" data-a="wsn" data-v="max"${max > 1 ? '' : ' disabled'}>Макс${max > 1 ? ' · ' + max : ''}</button></div>`;
    const top = `<div class="ws-mk">${wsWell(out, { stat: true, size: 52 })}<div class="col" style="gap:3px;min-width:0"><span class="eyebrow">${wsTier(out)}</span><b class="serif" style="font-size:20px;line-height:1.05">${trEsc(out.n)}</b><small class="faint">выйдет ×${fmt(p.out)}${p.hero ? ' · комплект осколков героя, пробуждение — за души' : ''}</small></div><span class="g-spacer"></span>${step}</div>`;
    const stages = p.steps.map(s => wsStepHtml(s.r, s.t, false)).join('')
      + p.stop.map(id => `<li class="unk">${ic('lock')}<b>${trEsc(wsName(id))}</b><span>рецепт не найден</span></li>`).join('')
      + wsStepHtml(r, n, true);
    const warn = [];
    if (p.owned) warn.push(`<p class="reason warn">${trEsc(wsHeroWhy(p.hero))}.${TM(' Что даёт повтор рецепта героя, не решено — заглушка прототипа.')}</p>`);
    if (p.stop.length) warn.push(`<p class="reason warn">Этап не найден: ${p.stop.map(id => '«' + trEsc(wsName(id)) + '»').join(', ')}. Автодокрафт остановлен — рецепт этапа ищут на столе.</p>`);
    if (p.lack.length) warn.push(`<p class="reason warn">Не хватает: ${trEsc(wsNames(p.lack))}.</p>`);
    const extra = p.extra.length ? `<p class="reason">Останется в запасах: ${trEsc(wsNames(p.extra))}.</p>` : '';
    const cert = p.special.length ? `<label class="cert${p.ok ? '' : ' off'}"><input type="checkbox" data-a="wsok"${o.ok ? ' checked' : ''}${p.ok ? '' : ' disabled'}><span><b>Разрешить расход: ${trEsc(wsNames(p.special))}</b><small>Особый ресурс не восполнить. Без согласия он не списывается.</small></span></label>` : '';
    const can = p.ok && !p.owned && (!p.special.length || !!o.ok);
    const body = `<div class="ws-o">${top}<span class="eyebrow">Этапы · по найденным рецептам</span><ol class="ws-steps">${stages}</ol>
      <span class="eyebrow">Суммарный расход</span>${p.spend.length ? `<div class="ws-sum">${p.spend.map(wsNeedHtml).join('')}</div>` : '<p class="faint" style="font-size:12.5px">Из запасов — ничего.</p>'}${extra}${warn.join('')}${cert}</div>`;
    return dialog('Создать · ' + trEsc(r.n), body, `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="wsmakedo" data-v="${o.op || ''}"${can ? '' : ' disabled'}>Создать${n > 1 ? ' ×' + n : ''}</button>`, 'wide');
  },
  /* итог операции — окно анимации: удача, новая запись, неудача, автодокрафт; после анимации — лист итога справа от круга */
  wsres(o) {
    const R = wsFxFor(o); if (!R) return '';
    const aria = R.kind === 'fail' ? 'Неудача' : R.isNew ? 'Новый рецепт' : R.kind === 'make' ? 'Автодокрафт' : 'Создано';
    return `<div class="ov ws-fxov" role="dialog" aria-modal="true" aria-label="${aria}">${wsFxStageHtml(R, wsNow() - R.t0)}</div>`;
  },
});

/* книга рецептов раскрывается (screens/recipe-book.js): момент — для анимации раскрытия; всё, что сейчас в запасах, сервер запоминает как
   найденное (WS_SRV.seen) — когда оно уйдёт, итог обрывка не станет снова безымянным. Уже раскрытая книга не начинает анимацию заново */
function wsBookOpen() {
  if (S.ws.view !== 'book') { S.ws.book.t0 = wsNow(); S.ws.book.hl = ''; WS_SRV.see(wsStock().map(it => it.id)); }
  S.ws.view = 'book';
}
/* ================== действия ================== */
Object.assign(ACT, {
  wscat(v) { S.ws.inv.cat = v; render(); },
  /* грань выборки запасов: «грань:значение», пустое значение — все */
  wsf(v) { const s = String(v || ''), i = s.indexOf(':'), k = s.slice(0, i), x = s.slice(i + 1); if (!WS_FACETS.includes(k)) return; const f = S.ws.inv.f || (S.ws.inv.f = {}); if (x) f[k] = x; else delete f[k]; render(); },
  wsfclr() { S.ws.inv.f = {}; S.ws.inv.q = ''; render(); },
  /* без ползунка: одна штука или +1 к своей ячейке — для сценариев и подсказок; плитка запасов зовёт wspick */
  wsput(v) { const b = wsCellsCopy(); if (S.overlay) S.overlay = null; if (wsPut(v)) S.ws.view = 'table'; wsFeel(b); render(); },
  /* нажатие на ресурс — ползунок количества; из карточки ресурса — тот же ползунок */
  wspick(v) { if (S.overlay) S.overlay = null; if (!wsPick(v)) render(); },
  /* ползунок отпустили: v — значение с поля */
  wsqv(v, t) {
    const o = S.overlay; if (!o || o.t !== 'wsqty') return;
    o.v = Math.max(0, Math.min(wsCellMax(o.arg), Math.floor(Number(t && t.value)) || 0));
    render(); wsRefocus('wsQv');
  },
  wsqn(v) {
    const o = S.overlay; if (!o || o.t !== 'wsqty') return;
    o.v = Math.max(0, Math.min(wsCellMax(o.arg), (o.v || 0) + (Math.floor(Number(v)) || 0)));
    render();
  },
  /* подтверждение ползунка: ресурс ложится в ячейку ровно в выбранном количестве; 0 — убрать со стола */
  wsqdo() {
    const o = S.overlay; if (!o || o.t !== 'wsqty') return;
    const id = o.arg, v = o.v || 0, on = wsOn(id), b = wsCellsCopy();
    if (!v && !on) return;
    S.overlay = null;
    if (wsPutQ(id, v, o.at)) S.ws.view = 'table';
    wsFeel(b); render();
  },
  wscell(v) { const i = +v; if (!(i >= 0 && i < WS_DATA.cells)) return; S.ws.sel = i; const c = S.ws.cells[i]; if (c) S.ws.pick = c.id; render(); },
  wsq(v) {
    const W = S.ws, c = W.cells[W.sel], b = wsCellsCopy(); if (!c) return;
    if (v === 'x') W.cells[W.sel] = null;
    else { const max = wsCellMax(c.id); c.q = v === 'max' ? max : Math.max(1, Math.min(max, c.q + (+v || 0))); if (c.q < 1) W.cells[W.sel] = null; }
    wsFeel(b); render();
  },
  wsqset(v, t) {
    const W = S.ws, c = W.cells[W.sel], n = Math.floor(Number(t && t.value));
    if (c && Number.isFinite(n)) { c.q = Math.max(1, Math.min(wsCellMax(c.id), n)); if (c.q < 1) W.cells[W.sel] = null; }
    render(); wsRefocus('wsQc');
  },
  wsclear() { const b = wsCellsCopy(); S.ws.cells = wsEmpty(); S.ws.sel = 0; wsFeel(b); render(); },
  /* книга рецептов — на всё окно (screens/recipe-book.js, wsBookOpen), стол под ней остаётся */
  wsview(v) { if (v === 'book') wsBookOpen(); else S.ws.view = 'table'; render(); },
  wsinfo(v) { if (BAG.item(v)) open('wsitem', v); },
  /* «Попробовать» / «Создать» стола: номер операции несёт кнопка */
  wstry(v) {
    const g = wsGuess(); if (g.st === 'empty') return;
    if (g.lack.length) return toast('Не хватает: ' + wsNames(g.lack.map(c => [c.id, c.q - wsQty(c.id)])));
    if (g.owned) return toast(wsHeroWhy(wsHero(g.r)));
    const op = v || wsOp();
    if (g.st === 'known' && !g.extra.length && !g.special.length) return wsAttempt(false, op);   // чистый найденный рецепт — без лишнего вопроса
    open('wstry', '', { ok: false, op });
  },
  wstrydo(v) { const o = S.overlay; if (!o || o.t !== 'wstry') return; wsAttempt(!!o.ok, v || o.op); },   // повторное нажатие не повторяет расход
  wsrepeat() {
    const L = S.ws.last || [], b = wsCellsCopy();
    wsSetTable(L.map(c => [c.id, c.q]));
    S.overlay = null; wsFeel(b); render();
  },
  wshints() { wsBookOpen(); Object.assign(S.ws.book, { tab: 'hint', kind: '', fav: false, q: '' }); S.overlay = null; render(); },
  /* новая запись: книга открыта на этом рецепте — поиск по его имени */
  wsbookgo(v) { const r = BAG.recipe(v); S.overlay = null; wsBookOpen(); Object.assign(S.ws.book, { tab: 'all', kind: '', fav: false, q: r ? r.n : '', hl: r ? r.id : '' }); render(); },
  wsbtab(v) { S.ws.book.tab = v; render(); },
  wsbkind(v, t) { S.ws.book.kind = t ? t.value : ''; render(); },
  wsbfav() { S.ws.book.fav = !S.ws.book.fav; render(); },
  wsfav(v) { const f = S.ws.fav, i = f.indexOf(v); if (i >= 0) f.splice(i, 1); else f.push(v); render(); },
  /* подсказку — на стол: открытые позиции по одной штуке, выбрана следующая пустая ячейка */
  wsload(v) {
    const r = BAG.recipe(v), p = S.ws.part[v], b = wsCellsCopy(); if (!r || !p) return;
    const ids = r.in.map(([id]) => id).filter(id => p.pos.includes(id));
    wsSetTable(ids.filter(id => wsHas(id)).map(id => [id, 1])); wsFeel(b);
    const miss = ids.filter(id => !wsHas(id));
    if (miss.length) toast('Нет в запасах: ' + miss.map(wsName).join(', ')); else render();
  },
  wsmake(v) { if (BAG.recipe(v)) open('wsmake', v, { n: 1, ok: false, op: wsOp() }); },
  wsn(v) {
    const o = S.overlay, r = o && o.t === 'wsmake' ? BAG.recipe(o.arg) : null; if (!r) return;
    const cap = wsHero(r) ? 1 : WS_DATA.makeCap;
    o.n = v === 'max' ? Math.max(1, wsMaxN(r)) : Math.max(1, Math.min(cap, (o.n || 1) + (+v || 0)));
    render();
  },
  wsok(v, t) { if (!S.overlay) return; S.overlay.ok = !!(t && t.checked); render(); },
  /* автодокрафт: сервер проводит одной операцией с номером, повторное нажатие не повторяет расход и выдачу */
  wsmakedo(v) {
    const o = S.overlay; if (!o || o.t !== 'wsmake') return;
    const x = WS_SRV.make(v || o.op || wsOp(), o.arg, o.n || 1, !!o.ok);
    if (x.again) return;
    if (x.refuse) return toast(WS_REFUSE[x.refuse]);
    wsFxStart(x.res);
  },
  wsfxreveal() { const R = S.ws.fx; if (wsFxLive(R)) wsFxReveal(R); },   // нажатие на сцену посреди анимации — итог сразу
  wsfxskip(v, t) { wsFxSetSkip(!!(t && t.checked), 'game'); },
});
/* «На стол мастера» из других экранов: мастерская открывается с ползунком количества этого ресурса — как нажатие на него в запасах;
   прежние предметы прототипа — по-старому */
const wsToCraftBase = ACT.toCraft;
function wsToCraft(v, t, e) {
  if (!BAG.item(v)) return wsToCraftBase ? wsToCraftBase(v, t, e) : undefined;
  S.route = 'craft'; S.seg.craft = 'work'; S.ws.view = 'table'; S.overlay = null;
  if (!wsPick(v)) render();
}
ACT.toCraft = wsToCraft;

/* ================== UI-кит: раздел «Крафт: удача и неудача» ==================
   Своя сцена в разделе: пробы тем же показом, что в мастерской; проба — не выдача (S не меняется). Под сценой — раскадровка:
   та же сцена, остановленная в свои моменты */
const WS_KIT = { run: null, r: 3, n: 0, last: 'made' };
const WS_KIT_CASES = [['made', 'Удача'], ['new', 'Новая запись'], ['hero', 'Герой'], ['make', 'Серия ×' + WS_DATA.demo.kit.n], ['fail', 'Неудача'], ['hint', 'С подсказкой']];
/* рецепт пробы редкости r: первый в данных с итогом этой редкости, иначе ближайшей — тогда редкость пробы только вид */
function wsKitRecipe(r) {
  let best = null, dist = 99;
  for (const x of EN_RECIPES.recipes) {
    const it = x.team || x.kind === 'hero' ? null : BAG.item(x.out[0]);
    if (!it || it.team) continue;
    const dd = Math.abs(it.r - r); if (dd < dist) { dist = dd; best = x; } if (!dd) break;
  }
  return best;
}
const wsKitCells = list => { const at = WS_FX.spread[Math.min(list.length, WS_DATA.cells) - 1] || []; return list.slice(0, WS_DATA.cells).map(([id, q], i) => [id, q, at[i]]); };
/* итог пробы — тем же видом, что у сервера, без выдачи */
function wsKitRes(kind) {
  const D = WS_DATA.demo, K = D.kit;
  if (kind === 'fail' || kind === 'hint') {
    const list = kind === 'fail' ? D.fail : D.hint, r = BAG.recipe(K.hero);
    const hints = kind === 'hint' && r ? [{ rid: r.id, fresh: list.map(([id]) => id), all: false, first: true, n: list.length }] : [];
    return { op: 'проба-' + kind, kind: 'fail', burn: list.map(([id, q]) => [id, q]), hints, cells: wsKitCells(list) };
  }
  if (kind === 'hero') {
    const r = BAG.recipe(K.hero), it = r && BAG.item(r.out[0]);
    return { op: 'проба-герой', kind: 'made', rid: r.id, out: 1, isNew: true, burn: [], hero: it ? it.heroId : '', cells: wsKitCells(r.in) };
  }
  if (kind === 'make') {
    const r = BAG.recipe(K.make);
    return { op: 'проба-серия', kind: 'make', rid: r.id, n: K.n, out: r.out[1] * K.n, steps: 0, spend: r.in.map(([id, q]) => [id, q * K.n]), hero: '' };
  }
  const r = wsKitRecipe(WS_KIT.r);
  return { op: 'проба-' + kind, kind: 'made', rid: r.id, out: r.out[1], isNew: kind === 'new', burn: [], hero: '', cells: wsKitCells(r.in) };
}
function wsKitRun(kind, still) {
  const res = wsKitRes(kind), R = wsFxRun(res, 'kit', { trial: true, r: kind === 'hero' || kind === 'fail' || kind === 'hint' ? 0 : WS_KIT.r });
  if (still) { R.phase = 'res'; R.tr = R.t0; }
  return R;
}
function wsKitPlay(kind) {
  wsFxStop(WS_KIT.run);
  WS_KIT.last = kind;
  const R = wsKitRun(kind, wsFxSkipOn());
  WS_KIT.run = R;
  if (R.phase === 'anim') wsFxSchedule(R);
  wsKitPaint();
}
function wsKitPaint() {
  const el = document.getElementById('wsKitStage'); if (!el) return;
  const R = WS_KIT.run || wsKitRun(WS_KIT.last, true);
  el.innerHTML = wsFxStageHtml(R, wsNow() - R.t0);
}
/* раскадровка: удача, новая запись и неудача в свои моменты — анимации на паузе, кадр стоит ровно в своём моменте */
function wsKitBoardHtml() {
  const frames = [];
  const add = (kind, n, txt, at) => { const R = wsKitRun(kind, at == null); R.id = ++wsFxSeq; frames.push([n, txt, R, at == null ? R.T.end + 2000 : at(R.T)]); };
  const F = WS_FX.full, L = WS_FX.fail;
  add('new', '1 · Нити', 'от каждой ячейки к центру — цвет стола, исход ещё не виден', () => F.thr + F.thrDur);
  add('new', '2 · Втягивание', 'предметы вздрагивают и уходят в центр, круг вспыхивает', () => F.ring + 160);
  add('new', '3 · Вспышка', 'раскалённое ядро, итог поднимается в свете редкости', () => F.rise + 260);
  add('new', '4 · Запись в книге', 'впервые найденный рецепт: книга, листы, свет, чернила', T => T.book + WS_FX.book.ink + 300);
  add('fail', '1 · Разрыв', 'предметы дрожат, нити рвутся посередине', () => L.snap + 90);
  add('fail', '2 · Трещины', 'круг трескается от обода к центру и тускнеет', () => L.crack + 330);
  add('fail', '3 · Пепел', 'предметы осыпаются, дым поднимается', () => L.crumble + 520);
  add('fail', '4 · Итог', 'что сгорело и подсказка, если положена');
  return frames.map(([n, txt, R, at]) => `<figure class="ws-still"><div class="ws-frame" aria-hidden="true"><div class="ws-fst">${wsFxStageHtml(R, at)}</div></div><figcaption><b>${n}</b> — ${txt}</figcaption></figure>`).join('');
}
function wsKitBoardPaint() { const el = document.getElementById('wsKitBoard'); if (el) el.innerHTML = wsKitBoardHtml(); }
function wsKitTabs() {
  const box = document.getElementById('wsKitCtl'); if (!box || !box.querySelectorAll) return;
  box.querySelectorAll('[data-wk^="r:"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wk === 'r:' + WS_KIT.r)));
  box.querySelectorAll('[data-wk^="play:"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wk === 'play:' + WS_KIT.last)));
}
function wsKitAct(v) {
  const s = String(v), i = s.indexOf(':'), a = s.slice(0, i), x = s.slice(i + 1);
  if (a === 'r') { WS_KIT.r = Math.min(7, Math.max(1, +x || 1)); wsKitTabs(); wsKitBoardPaint(); wsKitPlay(['made', 'new', 'make'].includes(WS_KIT.last) ? WS_KIT.last : 'made'); return; }
  if (a === 'play' && WS_KIT_CASES.some(c => c[0] === x)) { wsKitPlay(x); wsKitTabs(); }
}
/* нажатия раздела: data-wk — пробы и редкость; data-a внутри сцены раздела — крестик, нажатие на сцену и галочка */
function wsKitBind() {
  const k = document.getElementById('kitGrid');
  if (!k || !k.addEventListener || !k.dataset || k.dataset.wsBound) return;
  k.dataset.wsBound = '1';
  k.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target.closest('[data-wk],[data-a]') : null;
    if (!t || !k.contains(t)) return;
    if (t.dataset.wk) { e.preventDefault(); wsKitAct(t.dataset.wk); return; }
    if (!t.closest('#wsKit')) return;   // data-a других разделов — не наши
    if (t.dataset.a === 'close') { wsFxStop(WS_KIT.run); WS_KIT.run = null; wsKitPaint(); }
    else if (t.dataset.a === 'wsfxreveal' && wsFxLive(WS_KIT.run)) wsFxReveal(WS_KIT.run);
  });
  k.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.a === 'wsfxskip' && t.closest && t.closest('#wsKit')) wsFxSetSkip(t.checked, 'kit'); });
}
function wsKitHtml() {
  const plays = WS_KIT_CASES.map(([k, n]) => `<button class="btn sm" data-wk="play:${k}" aria-pressed="${WS_KIT.last === k}">${n}</button>`).join('');
  const rars = [1, 2, 3, 4, 5, 6, 7].map(r => `<button class="btn sm ws-kb" data-r="${r}" data-wk="r:${r}" aria-pressed="${WS_KIT.r === r}">${ICON('r' + r, 16, RAR[r])}${RAR[r]}</button>`).join('');
  const F = WS_FX.full, SH = WS_FX.short, L = WS_FX.fail;
  const team = TM(`<table class="p-table ws-ktab"><tr><th>Темп</th><th>Когда</th><th>Нити</th><th>Исход</th><th>Итог</th></tr>
      <tr><td>Полная удача</td><td>исход не был известен: новый рецепт, герой</td><td class="n">${F.thr} мс</td><td class="n">вспышка ${F.flash} мс</td><td class="n">${F.end} мс, с книгой ${F.end + WS_FX.book.end} мс</td></tr>
      <tr><td>Короткая</td><td>известный рецепт со стола, автодокрафт, серия ×N</td><td class="n">${SH.thr} мс</td><td class="n">вспышка ${SH.flash} мс</td><td class="n">${SH.end} мс; без листа — закрытие через ${SH.auto} мс</td></tr>
      <tr><td>Неудача</td><td>рецепта нет</td><td class="n">${L.thr} мс</td><td class="n">разрыв ${L.snap} мс</td><td class="n">${L.end} мс</td></tr></table>
    <p class="k-note">Итог решает сервер до анимации: <code>WS_SRV.attempt</code> и <code>WS_SRV.make</code> — одна операция с номером, повтор номера ничего не меняет. Случайности в исходе нет (§12): верный набор создаёт предмет всегда. Сид операции рисует только трещины и дым — перерисовка не меняет кадр. Числа вида — <code>WS_FX</code> в <code>screens/craft.js</code>, частицы — EnFx.</p>`, 'div');
  return `<section class="k-box ws-kbox" style="grid-column:1/-1"><h3>Крафт: удача и неудача</h3>
    <p class="k-note">Шесть ячеек вокруг центра, как на столе мастерской. До момента истины удача и неудача идут одинаково: нити цвета стола тянутся к центру. Удача — предметы втягиваются, круг вспыхивает цветом редкости, ядро раскаляется, вспышка — итог поднимается в своём свете. Впервые найденный рецепт — книга раскрывается и записывает его. Неудача — предметы дрожат, нити рвутся, круг трескается, предметы осыпаются пеплом; итог честно называет, что сгорело, и подсказку, если она положена. Известный рецепт, автодокрафт и серия — короткая версия. Нажатие на сцену — сразу итог. Проба — не выдача; редкость пробы — вид.</p>
    <div class="ws-kctl" id="wsKitCtl"><div class="ws-kr">${plays}</div><div class="ws-kr">${rars}</div></div>
    <div class="ws-kit" id="wsKit"><div class="ws-kst" id="wsKitStage"></div><div class="ws-fxl" aria-hidden="true"></div></div>
    <p class="k-note">Раскадровка — та же сцена, остановленная в свои моменты; частицы рисуются поверх сцены и в кадре не видны.</p>
    <div class="ws-board" id="wsKitBoard"></div>${team}</section>`;
}
KIT_EXTRA.push({ html: wsKitHtml, paint: () => { wsKitBind(); wsKitTabs(); wsKitPaint(); wsKitBoardPaint(); } });
/* раздел «Мастерская: ввод ресурса» — плитки запасов и ползунок количества, те же классы, что на экране; нажатий в разделе нет */
function wsInKitHtml() {
  const pick = [WS_DATA.demo.table[0][0], WS_DATA.demo.table[1][0], 'u1'].map(id => BAG.item(id)).filter(Boolean);
  if (pick.length < 3) return '';
  const tiles = [wsTile(pick[0], { kit: true, q: 14 }), wsTile(pick[1], { kit: true, q: 3, on: 2 }), wsTile(pick[2], { kit: true, q: 1 })]
    .map((t, i) => `<figure class="ws-kt">${t}<figcaption>${['в запасах', 'на столе — свет и число слева', 'особый — ромб'][i]}</figcaption></figure>`).join('');
  const it = pick[0], max = 14, v = 4;
  const slider = `<div class="ws-kq"><div class="ws-qh">${wsWell(it, { stat: true, size: 44 })}<div class="col" style="gap:3px;min-width:0"><span class="eyebrow">${wsTier(it)}</span><b class="serif ws-qt">${trEsc(it.n)}</b></div><b class="num ws-qbig">${v}</b></div>
    <div class="ws-qs"><span class="ws-qb">${ic('minus')}</span><input class="ws-range" type="range" min="0" max="${max}" value="${v}" tabindex="-1" aria-label="Образец ползунка" style="--p:${wsPct(v, 0, max)}%"><span class="ws-qb">${ic('plus')}</span></div>
    <div class="ws-qe num"><span>0</span><span>${max}</span></div><span class="btn go">В ячейку · ${v}</span></div>`;
  return `<section class="k-box" style="grid-column:1/-1" id="kitCraftIn"><h3>Мастерская: ввод ресурса</h3>
    <p class="k-note">Запасы — по пять в ряд, плитки крупнее. Справа сверху — лупа: карточка ресурса. Нажатие — ползунок от 0 до ста или до запаса, если его меньше; подтверждение кладёт ресурс в ячейку.${TM(' Слова автора 29.09.2026. Экран — screens/craft.js: плитка wsTile, ползунок OV.wsqty, ячейка — wsPutQ.')}</p>
    <div class="ws-kin">${tiles}${slider}</div></section>`;
}
KIT_EXTRA.push({ html: wsInKitHtml });

/* ================== регистрация, состояние, ввод ================== */
CRAFT_SEGS.work = wsView;
if (!RS_HOW.craft) RS_HOW.craft = 'создан в мастерской';
/* состояние: у текущей сессии и у сброса — одна и та же мастерская */
const wsInitBase = initialState;
initialState = function () { const s = wsInitBase(); s.ws = wsFresh(); return s; };
S.ws = wsFresh();

/* поиск: поле не теряет фокус при перерисовке; ползунки количества — число и дорожка меняются сразу, без перерисовки */
document.addEventListener('input', e => {
  const t = e.target; if (!t) return;
  if (t.id === 'wsQv' || t.id === 'wsQc') { wsRangeLive(t); return; }
  if (t.id !== 'wsInvQ' && t.id !== 'wsBookQ') return;
  if (t.id === 'wsInvQ') S.ws.inv.q = t.value; else S.ws.book.q = t.value;
  const pos = t.selectionStart; render();
  const n = document.getElementById(t.id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) { } }
});
/* перенос ресурса из инвентаря в ячейку стола (§12.4): ползунок количества — для этой ячейки */
document.addEventListener('dragstart', e => {
  const w = e.target && e.target.closest && e.target.closest('[data-wsdrag]'); if (!w || !e.dataTransfer) return;
  e.dataTransfer.setData('text/plain', w.dataset.wsdrag); e.dataTransfer.effectAllowed = 'copy';
});
document.addEventListener('dragover', e => { if (e.target && e.target.closest && e.target.closest('[data-wscell]')) e.preventDefault(); });
document.addEventListener('drop', e => {
  const c = e.target && e.target.closest && e.target.closest('[data-wscell]'); if (!c || !e.dataTransfer) return;
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  if (BAG.item(id)) { S.ws.view = 'table'; wsPick(id, +c.dataset.wscell); }
});

/* потоки презентации: «Мастерская» показывает найденный рецепт на столе, рядом — подсказки, автодокрафт, удача и неудача */
(() => {
  const i = FLOWS.findIndex(f => f[0] === 'Мастерская'); if (i < 0) return;
  const base = FLOWS[i][2], D = WS_DATA.demo;
  FLOWS[i] = ['Мастерская', 'Инвентарь и стол из шести ячеек: на столе найденный рецепт, рядом книга рецептов', () => { base(); wsSetTable(D.table); }];
  FLOWS.splice(i + 1, 0,
    ['Мастерская · удача', 'Сочетание, которого нет в книге: нити, вспышка, итог в свете своей редкости и новая запись в книге', () => { base(); wsSetTable(D.made); wsAttempt(false, wsOp()); }],
    ['Мастерская · неудача', 'Неверное сочетание: нити рвутся, круг трескается, всё положенное сгорает — итог говорит, что именно', () => { base(); wsSetTable(D.fail); wsAttempt(false, wsOp()); }],
    ['Мастерская · подсказки', 'Три верных ресурса из четырёх: после попытки рецепт появится в книге, а ресурсы сгорят', () => { base(); wsSetTable(D.hint); }],
    ['Мастерская · автодокрафт', 'Найдены два рецепта цепочки. Разворот до базовых и согласие на уникальный ресурс', () => {
      base(); D.chain.learn.forEach(id => BAG.learn(id)); S.ws.view = 'book'; S.overlay = { t: 'wsmake', arg: D.chain.make, n: 1, ok: false, op: wsOp() };
    }]);
})();
