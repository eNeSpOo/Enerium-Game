/* screens/heroes.js — «Герои»: коллекция, карточка героя, отряды и «Призыв» (§2.1, §3, §10, §15, §33 GDD; ADR-0019, ADR-0026, ADR-0027).
   Договор — screens/model.js. Регистрирует:
   — SCREENS.heroes: вкладки «Коллекция», «Отряды», «Призыв»;
   — коллекцию по слову автора 30.09.2026 («сетка со всеми героями, которых игрок уже купил… по форме условно 9 на 16, и, нажимая на
     арт, мы уже открываем крупным планом карточку героя: слева портрет… справа информация»): сетка карточек 9 : 16 (hcCard) — герои
     аккаунта, по мощи сильнейшие сверху, сортировка и фильтр значками (лист OV.hcflt); переключатель «Каталог» — все герои состава,
     несобранные чёрно-белые с полосой осколков. Карточка говорит о силе героя сама: кристалл и цвет редкости, доблесть дугой звёзд,
     рунные камни пределов по бокам, класс и стихия значками, уровень и мощь; ступень вида (hcTier: редкость и доблесть) — рамка, свет
     и частицы. Вид ступеней — классы и переменные CSS (heroes.css), рамка картинкой — HC_ART, когда автор выберет стиль;
   — большую карточку героя (hcBig): слева портрет в раме своей ступени — нажатие показывает его крупно (OV.hczoom), справа — имя, мощь,
     доблесть и уровень и вкладки «Развитие», «Снаряжение», «Навыки», «Путь» (heroDetail без шапки, index.html; развитие и окно
     снаряжения — screens/hero-dev.js). Герой состава «до покупки» — та же карточка: «Герой», «Навыки», «Путь» и одно действие внизу —
     цена и «Купить» или как получить; снаряжения, талисманов и прокачки нет. Она же — окно поверх любого экрана (OV.rhero);
   — одну анатомию героя: карточку 9 : 16 (hcCard), плитку (heroCard — герой аккаунта, rsCard — герой состава) для отрядов и витрин,
     шапку (heroHead, rsHead) для листов. Редкость — одобренный кристалл r1…r7 (--rico, ADR-0027), доблесть — значки по личному
     максимуму, рунный предел — пять рунных камней по бокам портрета (знак — screens/hero-dev.js: rpPost, rpNext), уровень, класс — значком;
   — героев аккаунта: hrOwn собирает купленного и пробуждённого героя состава в той же форме, что герои боя прототипа (S.heroes), — H(id)
     в index.html находит и его: карточка, развитие, отряды и бой работают одинаково;
   — отряды: библиотеку пресетов S.squads (§2.1: до десяти, имена, до пяти героев) и один лист выбора отряда на все режимы — OV.prep;
     у каждого режима свой сохранённый выбор. API для экранов режимов — SQ (описан в screens/README.md);
   — «Призыв»: hireView и вкладки «За золото», «За Энериум», «За души». «За золото» — та же сетка карточек 9 : 16 героев каталога цикла,
     нажатие — большая карточка «до покупки» с ценой и «Купить» (покупка — ACT.gbuy, index.html). «За души» — сцена алтаря Возрождения
     душ (hrSoulsView, её зовёт rsSoulsView в index.html; слово автора 29.09.2026 — «дорого-богато»): зеркало душ, перед ним веером герои
     пула и вход рулетки (rlCol, screens/roulette.js); справа два входа — отряд Эхо недели (окно-витрина OV.hrecho: цивилизация, пятеро
     крупными карточками, несобранные чёрно-белые с полосой осколков, неприязнь, откуда осколки, пробуждение за души) и лавка праха
     (окно OV.dust). Лавка праха —
     отдельное окно: витрина героев пула рулетки доступных циклов — стекло осколка с лицом, имя, цена осколка и доля собранного; справа —
     выбранный: осколки за прах (1, 10 или до комплекта) и пробуждение за души; после пробуждения — окно OV.hrwake: трещины заживают,
     герой выходит из стекла в раме. Героев Эхо прахом не собрать (слово автора 29.09.2026): лавка продаёт осколки только героев из
     EN_ROSTER.rules.dustSrc (rsDustable, index.html) и говорит почему; героя Эхо собирают осколки из сундуков Эхо, пробуждают — души
     (окно отряда недели). Покупка осколков и пробуждение — операции SOUL_SRV с номером. Герой, которого собирают, — осколок: стекло
     с его лицом (shardGhost, screens/art-icons.js), в сетках и витрине отряда недели — чёрно-белая карточка с полосой осколков;
   — «За Энериум» — витрина донатного сета (dnView): зал, пятеро Безликих на ступенях цены — дороже герой, выше ступень и ярче свет;
     сет — коллекция: сколько из пяти уже в коллекции и какую ступень сет-бонуса это даёт (лист OV.hrset — ступени наглядно).
     Справа — выбранный герой, что он даёт и одна кнопка покупки с ценой. Честно (§1.2, §32): цена и с чем герой приходит видны
     до покупки, подтверждение OV.dnbuy называет остаток Энериума. Покупка — операция DN_SRV с номером, после неё — окно получения
     героя OV.hrgot: свет снизу, песок времени, рама и имя; нажатие — сразу итог. Арт витрины — DN_ART: пока путь не выгружен,
     зал, раму и эмблемы рисует CSS;
   — действия ACT.hc*, ACT.sq*, ACT.d*, ACT.dn*, ACT.du*, ACT.dustbuy, activate и activatedo, лист имени OV.sqname, разделы UI-кита
     «Карточка героя», «Отряды», «За Энериум» и «За души · лавка праха» через KIT_EXTRA, сценарии.
   Своё состояние — S.hf, S.hgrid, S.sq, S.dn и S.du, заводятся как S.bag. Вид коллекции — S.hview: own — сетка героев аккаунта,
   all — каталог, mine — большая карточка героя аккаунта S.selHero (прежнее имя: так её открывают другие экраны и сценарии), rs — большая
   карточка героя состава S.rs.sel; в «За золото» карточку «до покупки» открывает S.rs.gsel. Сервер решает, клиент показывает: изменение
   отрядов — операция SQ_SRV, покупка за Энериум — DN_SRV, осколки за прах и пробуждение — SOUL_SRV; номер несёт кнопка, повтор того же
   номера ничего не меняет и не списывает. Числа — в блоках данных SQ_DATA, HR_DATA, HR_VIEW, HC_VIEW, DN_VIEW и DU_VIEW, цены героев —
   EN_ROSTER.rules.
   Служебное — только команде: TM, PL, tmT из index.html.
   Автопроверки — tools/content-gen/screens/check_heroes.js и check_squads.js. */
'use strict';

/* ================== данные: числа — здесь, в функциях только алгоритм ================== */
const SQ_DATA = {
  max: 10,          // §2.1: библиотека «Отряды» — до десяти именованных пресетов
  size: 5,          // §2.1: в отряде до пяти героев
  nameMax: 24,      // длина имени отряда, знаков — вид
  /* режимы: n — имя режима, t — заголовок листа, rule — правило строкой; min — сколько героев нужно, exact — ровно столько;
     busy — занятые в забеге: skip — остаются, идут свободные; block — отряд не готов; allow — встают (слепок Арены и Лиги героев
     не занимает, §20.3); teams — отрядов в режиме (Лига, §20.4); hold — где режим хранит выбор (спуск и Эхо — поля S, их читают
     index.html и echo.js) */
  modes: {
    descent: { n: 'Спуск', t: 'Отряд для спуска', min: 1, busy: 'skip', hold: 'prepSquad',
      rule: 'В забег идут свободные герои отряда. Здоровье между этажами не восстанавливается.' },
    echo: { n: 'Эхо', t: 'Отряд для Эхо', min: 5, exact: true, busy: 'block', hold: 'echoSquad',
      rule: 'Ровно пять разных свободных героев. Отряд сохранится для следующих целей и атак.' },
    arena: { n: 'Оборона Арены', t: 'Оборона Арены', min: 5, exact: true, busy: 'allow',
      rule: 'Оборону видят все соперники. Слепок героев не занимает — встают и занятые.' },
    league: { n: 'Лига', t: 'Отряды Лиги', min: 5, exact: true, busy: 'allow', teams: 3,
      rule: 'Три отряда по пять, герой не повторяется. Занятые тоже встают.' },
    clan: { n: 'Клановый босс', t: 'Отряд на Кланового босса', min: 1, busy: 'skip',
      rule: 'Атакуют свободные герои отряда. Контроль на босса не действует — только дебаффы.' },
  },
  /* демо: выбор режимов, которых нет в initialState index.html. Оборона обязательна — назначена сразу (§20.3). Лига у демо открыта с 9-го
     дня цикла II (ADR-0031, п. 17): три отряда — «Отряд I», «Отряд II» и «Лига · III», без повторов героев. Клановый босс ждёт первого
     выбора (§25.1: при первом входе — установка атакующего отряда) */
  demo: { arena: 's1', league: ['s1', 's6', 's7'], clan: null },
};
const HR_DATA = {
  /* класс героя состава → класс ядра боя (battle.js, RULES.cls); берётся первый класс героя. Фармящего класса в ядре нет — заглушка */
  cls: { 'танк': 'Танк', 'лекарь': 'Лекарь', 'маг ДД': 'Маг. ДД', 'физ ДД силы': 'Физ. ДД силы', 'физ ДД ловкости': 'Физ. ДД ловкости',
    'контроль (на контроль)': 'Контроль', 'контроль (на дебаффы)': 'Дебаффер', 'контроль': 'Контроль', 'фармер': 'Физ. ДД ловкости' },
  clsStub: 'Физ. ДД ловкости',   // класс ядра, если в составе класс не узнан
  /* характеристик у героев состава нет (§3.5): образец героя прототипа того же класса — [пять характеристик, степени роста СРХ],
     как у героев Эхо (echo.js, heroSt); у физ ДД силы — как у ловкача, сила и ловкость местами. Заглушка до таблиц характеристик */
  st: {
    'Танк': [[128, 54, 72, 246, 62], [2, 3, 3, 1, 3]],
    'Физ. ДД силы': [[245, 54, 128, 72, 62], [1, 3, 2, 3, 3]],
    'Физ. ДД ловкости': [[128, 54, 245, 72, 62], [2, 3, 1, 3, 3]],
    'Маг. ДД': [[72, 246, 54, 62, 128], [3, 1, 3, 3, 2]],
    'Лекарь': [[62, 246, 54, 128, 72], [3, 1, 3, 2, 3]],
    'Контроль': [[62, 246, 54, 128, 72], [3, 1, 3, 2, 3]],
    'Дебаффер': [[62, 246, 54, 128, 72], [3, 1, 3, 2, 3]],
  },
  bmC: 4000,          // §6, слой 0: БМ = C × √(УВС × ЭЗ), C × 100 — та же C, что у бестиария биомов (EN_BIOME_FOES.rules.bmC)
  echoKit: 'эхо:',    // ключ набора героя Эхо в EN_KITS.heroes: наборы героев Эхо — echo-foes.js, в том же виде, что kits.js
};
/* числа вида: цвета стихий для заглушки портрета — те же, что токены --air…--dark в index.html */
const HR_VIEW = {
  el: { 'Воздух': '#dff4e5', 'Земля': '#eb9d40', 'Огонь': '#f0564a', 'Вода': '#5a94f7', 'Время': '#4fdc8b', 'Свет': '#f4e6ae', 'Тьма': '#a986ee', 'без стихии': '#8a9098' },
};
/* коллекция, большая карточка героя и «За золото» — числа вида, не баланс. Слова автора 30.09.2026: «карточка героя, её иконки
   и информация на ней должна говорить игроку, насколько сильный герой находится перед ним». Ступень вида — сила одним взглядом:
   основа — редкость, каждая взятая доблесть поднимает ступень. Вид ступеней — классы и переменные CSS (heroes.css, [data-t]) */
const HC_VIEW = {
  card: [112, 104],        // сетка: карточка 9 : 16 не уже, px — [932 × 430, 844 × 390]; высота — 16/9 ширины
  gap: 8,                  // между карточками сетки, px
  /* ступень вида: r — по редкости r1…r7, valor — прибавка за взятые доблести 0…5, не выше top. В духе стилей, отмеченных автором
     30.09.2026 («золотая филигрань», «кованое железо»): 1 — тёмное железо с заклёпками, 2 — позолота, листья у гребня и кабошоны цвета
     редкости, 3 — старое золото с крыльями, раскалённые швы, сияние и искры у вершины */
  tier: { r: [1, 1, 2, 2, 3, 3, 3], valor: [0, 1, 1, 2, 2, 2], top: 3 },
  motes: 6,                // искр у вершины карточки высшей ступени; движутся transform и opacity, при «меньше движения» стоят
  arc: 3,                  // дуга доблести: звезда ниже середины на ⌊d² × arc / 4⌋ px, d — шаг от середины
  short: 100000,           // мощь от этого числа — коротко: «128,4К»
  big: [5, 7],             // большая карточка: портрет, ширина : высота; не шире bigMax % карточки
  bigMax: 40,
  echo: 12,                // витрина отряда недели: между карточками, px
  /* UI-кит: три ступени на одном герое — [редкость, доблесть, личный максимум, рунный предел, мощь]; уровень — потолок предела. Вид */
  kit: [[2, 0, 3, 0, 18420], [2, 1, 3, 1, 64210], [2, 3, 3, 5, 728870]],
};
/* рамка карточки картинкой — по ступеням 1…3, когда автор выберет стиль (art/generated/card-concepts, выгрузка export_ui.py в
   assets/art/cards/). ready — выгруженные пути: пока пусто, рамку, уголки, гребень и свет рисует CSS; путь в ready — ступень
   берёт картинку поверх портрета (окно рамки прозрачное), CSS-рамка этой ступени прячется */
const HC_ART = {
  ready: [],
  frame: t => 'cards/frame-t' + t + '.png',
};
/* порядок сетки: «Мои» — по мощи, сильнейшие сверху; каталог — по циклу, как в составе */
const HC_SORT = {
  own: [['bm', 'По мощи'], ['r', 'По редкости'], ['lvl', 'По уровню'], ['valor', 'По доблести']],
  all: [['c', 'По циклу'], ['r', 'По редкости']],
};
/* «За Энериум»: числа вида витрины, не баланс. Цены героев — EN_ROSTER.rules.stub.donatPrice, ступени сета — EN_ROSTER.rules и N сета */
const DN_VIEW = {
  step: [14, 6],        // ступень цены под героем: высота, px — step[0] + место × step[1]: пятый стоит выше всех
  grow: [40, 4],        // высота рамы, % высоты помоста — grow[0] + место × grow[1] (не шире колонки): дороже герой — крупнее рама
  motes: 12,            // песчинок времени над помостом
  ring: [0, 'одна', 'две', 'три'],   // слова для «ступеней у сета» в листе сет-бонуса
  titles: ['Жрец'],     // слова звания перед именем: на табличке под рамой — имя, а не звание
  /* окно получения героя — мс от покупки: трещина света, столп, рама, вспышка, имя, строки, всё на месте */
  got: { crack: 0, pillar: 300, frame: 850, flash: 1400, name: 1600, text: 2000, end: 2500 },
};
/* арт витрины — tools/art-gen/jobs/donat-*.json, выгрузка export_ui.py в assets/art/donat/. ready — выгруженные пути: пока пути
   нет, зал, раму и эмблемы рисует CSS, битых картинок нет. Портреты донатных героев — общий RS_ART (index.html) */
const DN_ART = {
  ready: ['donat/hall.jpg', 'donat/frame.png', 'donat/emblem-d2.png', 'donat/emblem-d3.png', 'donat/emblem-d4.png',
    'donat/emblem-d5.png', 'donat/emblem-d6.png'],   // выгрузка 29.09.2026
  hall: 'donat/hall.jpg',
  frame: 'donat/frame.png',
  emblem: key => 'donat/emblem-' + key + '.png',
};
/* «За души» и лавка праха: числа вида, не баланс. Цена осколка — §15.3 × цикл героя (rsShardPrice), комплект и цена пробуждения —
   EN_ROSTER.rules.stub. Пары — [932 × 430, 844 × 390] */
const DU_VIEW = {
  qty: [1, 10],              // осколков за раз — кнопки; третья — «до комплекта»
  card: [60, 52],            // осколок на карточке витрины, px
  pick: [100, 80],           // осколок выбранного героя, px
  side: 30,                  // осколки отряда Эхо во входе сцены, px: пять в ряд в табличке 212 px
  ask: 64,                   // осколок в подтверждении пробуждения, px
  glass: 176,                // осколок в окне пробуждения, px
  motes: 10,                 // пылинок праха в свете ламп лавки
  /* окно пробуждения — мс от операции: стекло горит, трещины заживают, вспышка, герой в раме, имя, строки, всё на месте */
  wake: { glow: 0, heal: 200, flash: 850, hero: 950, name: 1350, text: 1700, end: 2200 },
};
/* арт лавки праха — tools/art-gen/jobs/souls-altar.json, выгрузка export_ui.py в assets/art/souls/. ready — выгруженные пути: пока
   пути нет, лавку рисует CSS. want — заказанные к выгрузке 29.09.2026. Алтарь «За души» и рама героя души — RL_ART (screens/roulette.js) */
const DU_ART = {
  ready: ['souls/dust-shop.jpg'],   // выгрузка 29.09.2026
  want: ['souls/dust-shop.jpg'],
  shop: 'souls/dust-shop.jpg',
};

/* ================== помощники ================== */
const hrEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const HR_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const hrFl = (a, b) => Math.floor(a / b);

/* ================== герои аккаунта ==================
   Герой аккаунта — герой боя прототипа (S.heroes) или купленный и пробуждённый герой состава (S.rs.owned). Для героя состава hrOwn
   собирает героя в форме S.heroes: портрет, класс ядра, характеристики по образцу класса, набор способностей — из kits.js по id героя
   состава (у героя Эхо — тот же, что в echo-foes.js). Уровень, рунный предел и доблесть — одна правда: запись коллекции S.rs.owned[id]. */
let hrMemo = { s: null, x: {} };
function hrOwn(id) {
  if (!S || !S.rs || !S.rs.owned || !S.rs.owned[id] || !RSI[id]) return undefined;
  if (hrMemo.s !== S) hrMemo = { s: S, x: {} };   // новая сессия — новые герои
  return hrMemo.x[id] || (hrMemo.x[id] = hrBuild(RSI[id]));
}
const hrCore = h => HR_DATA.cls[String(h.cls || '').split(' / ')[0].trim()] || HR_DATA.cls[(h.cl || [])[0]] || HR_DATA.clsStub;
/* набор способностей: набор героя состава в kits.js по его id — у каждого из 360, сжат к личному максимуму (ADR-0031, п. 7);
   запасные пути — черновик героя в kits.js и набор героя Эхо из echo-foes.js под своим ключом */
function hrDraft(h) {
  const K = window.EN_KITS, d = h.team && h.team.draft;
  if (K && K.heroes[h.id]) return h.id;
  if (K && d && K.heroes[d]) return d;
  const X = window.EN_ECHO_FOES, e = X && X.heroes ? X.heroes[h.id] : null;
  if (!K || !e) return null;
  const key = HR_DATA.echoKit + h.id;
  if (!K.heroes[key]) K.heroes[key] = { ultPct: e.ultPct, actPct: e.actPct, rarity: e.rarity, maxV: e.maxV, kit: e.kit };
  return key;
}
/* портрет для боя и строк: выгруженный арт, Безликий или заглушка — инициалы в свете стихии, как .rs-ph */
function hrImg(h) {
  const o = rsOld(h); if (o) return o.img;
  if (RS_ART.has(h.id)) return AV('heroes/' + h.id + '.jpg');
  if (h.src === 'donat') return FACELESS;
  const c = HR_VIEW.el[h.sch] || HR_VIEW.el['без стихии'];
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100"><defs><radialGradient id="g" cx="50%" cy="112%" r="80%"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".62" stop-color="${c}" stop-opacity="0"/></radialGradient><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101418"/><stop offset="1" stop-color="#0a0c0e"/></linearGradient></defs><rect width="80" height="100" fill="url(#b)"/><rect width="80" height="100" fill="url(#g)"/><text x="40" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="30" font-weight="600" fill="${c}" fill-opacity=".8">${hrEsc(rsInit(h.n))}</text></svg>`);
}
/* боевая мощь героя аккаунта — общая функция BM (index.html, §6): h.bm — свойство только для чтения (bmProp) */
function hrBuild(h) {
  const id = h.id, core = hrCore(h), T = HR_DATA.st[core] || HR_DATA.st['Танк'];
  const rec = () => S.rs.owned[id] || { lvl: 0, lim: 0, valor: 0 };
  const put = k => v => { const o = S.rs.owned[id]; if (o) o[k] = v; };
  const x = { id, name: h.n, cls: core, clsN: h.cls, el: h.sch, race: h.race, draft: hrDraft(h), r: h.r, cycle: h.c, img: hrImg(h), maxV: h.maxV,
    st: T[0].slice(), gr: T[1].slice(), ab: [], pas: [], ult: null, busy: null, rid: id,
    avers: h.avers && h.avers.race ? { race: h.avers.race, bp: h.avers.bp != null ? h.avers.bp : RS.rules.aversionBp } : null };
  Object.defineProperties(x, {
    lvl: { enumerable: true, get: () => rec().lvl, set: put('lvl') },
    lim: { enumerable: true, get: () => rec().lim, set: put('lim') },
    valor: { enumerable: true, get: () => rec().valor, set: put('valor') },
    keep: { enumerable: true, get: () => rec().keep, set: put('keep') },   // пределы прошлого круга — для силы коллекции (collHero, index.html)
    cap: { enumerable: true, get: () => INV.hero.capByLim[Math.min(rec().lim, INV.hero.capByLim.length - 1)], set() { } },   // потолок — от предела
  });
  return bmProp(x);   // мощь — BM.hero(x): растёт с уровнем, доблестью и вещами
}
/* все герои аккаунта: отряд боя прототипа и купленные; герои сета 1 уже есть в S.heroes (rsOld) */
function hrMine() {
  const own = Object.keys((S.rs && S.rs.owned) || {}).filter(id => RSI[id] && !rsOld(RSI[id])).map(hrOwn).filter(Boolean);
  return S.heroes.concat(own);
}
/* запись состава героя аккаунта: купленный — он сам, герой прототипа — по черновику */
const hrTwin = h => RSI[h.id] || (h.draft ? RS.heroes.find(x => x.team && x.team.draft === h.draft) || null : null);

/* ================== одна анатомия героя: плитка, шапка карточки ==================
   Вид героя — для героя аккаунта (у него name) и героя состава (у него n). Герой состава в коллекции — с прогрессом аккаунта */
function hrV(x) {
  if (!x) return null;
  const isAcc = x.name != null, rh = isAcc ? hrTwin(x) : x, acc = isAcc ? x : rsOld(x) || H(x.id) || null;
  if (acc) return { id: acc.id, rid: rh ? rh.id : null, acc, rh, own: true, n: acc.name, face: RSI[acc.id] ? rsFace(RSI[acc.id]) : `<img src="${acc.img}" alt="">`,
    r: acc.r, cls: acc.clsN || acc.cls, ic: acc.clsN || acc.cls, el: acc.el, race: acc.race, c: acc.cycle, lvl: acc.lvl, cap: acc.cap, lim: acc.lim,
    valor: acc.valor, maxV: acc.maxV, bm: acc.bm, busy: busyNote(acc.id) || '' };
  return { id: rh.id, rid: rh.id, acc: null, rh, own: false, n: rh.n, face: rsFace(rh), r: rh.r, cls: rh.cls, ic: rh.cl[0], el: rh.sch, race: rh.race, c: rh.c,
    lvl: 0, cap: 0, lim: 0, valor: rsV(rh), maxV: rh.maxV, bm: 0, busy: '' };
}
/* рунные пределы героя (знак — screens/hero-dev.js: rpPost, rpNext): пределов в круге — из данных; следующий камень тлеет или пульсирует
   только у героя этого аккаунта — у соперника и чужого профиля запасы не наши */
const hrLimTop = () => INV.hero.capByLim.length - 1;
const hrRpNext = v => (v.acc && typeof rpNext === 'function' ? rpNext(v.acc) : '');
/* плитка: портрет, кристалл редкости, доблесть по личному максимуму; по бокам портрета — пять рунных камней предела, два столба
   делят их — слева I–III, справа IV–V (RP_VIEW.split): пройденные горят, следующий на потолке уровня тлеет или пульсирует; внизу — имя, класс значком и уровень.
   o: act, val, sel, dim, note — занятость поверх портрета; bm — боевая мощь (витрины и отряды); mark — отметка «в коллекции»;
   rpNext — состояние следующего камня вместо рассчитанного (UI-кит) */
function hrTile(v, o = {}) {
  const note = o.note != null ? o.note : v.busy, bm = !!o.bm && v.own;
  const nx = v.own ? (o.rpNext != null ? o.rpNext : hrRpNext(v)) : '';
  const lim = v.own && typeof rpPost === 'function' ? rpPost(v.lim, nx, 't', 'l') + rpPost(v.lim, nx, 't', 'r') : '';
  const lvl = v.own ? `<span class="lv" title="Уровень ${v.lvl}"><small>ур.</small><b class="num">${v.lvl}</b></span>` : `<span class="cy">цикл ${ROMAN[v.c]}</span>`;
  const right = bm ? bmHtml(v.bm, 11) : o.mark && v.own ? `<span class="own" title="В коллекции">${ic('check')}</span>` : '';
  const say = `${hrEsc(v.n)}, ${RAR[v.r].toLowerCase()}, ${v.cls}${v.own ? `, уровень ${v.lvl}, рунный предел ${v.lim} из ${hrLimTop()}${nx === 'ready' ? ' — можно пробить следующий' : ''}` : `, цикл ${ROMAN[v.c]}`}, доблесть ${v.valor} из ${v.maxV}${note ? ', ' + note : ''}`;
  return `<button class="hc${lim ? ' rpp' : ''}${bm ? ' wbm' : ''}${o.sel ? ' sel' : ''}${o.dim ? ' dim' : ''}" data-r="${v.r}" data-a="${o.act || 'hero'}" data-v="${o.val != null ? o.val : v.id}" aria-label="${say}">
    ${v.face}<i class="cr" aria-hidden="true"></i>${lim}
    <span class="top"><span class="stars" title="Доблесть ${v.valor} из ${v.maxV}">${stars(v.valor, v.maxV)}</span></span>
    ${note ? `<span class="busy">${note}</span>` : ''}
    <span class="bot"><span class="nm">${hrEsc(v.n)}</span><span class="meta"><span class="lw">${CLS(v.ic, 13, v.cls)}${lvl}</span>${right}</span></span>
  </button>`;
}
/* плитка героя аккаунта; боевая мощь по умолчанию — как у витрин (пятёрка сильнейших, оборона); в коллекции её нет */
function heroCard(h, o = {}) { return hrTile(hrV(h), Object.assign({ bm: true }, o)); }
/* плитка героя состава: в коллекции «Все герои» — выбор героя, у купленного — его прогресс и отметка */
function rsCard(h, o = {}) { return hrTile(hrV(h), { act: o.act || 'rssel', val: h.id, sel: o.sel, mark: true }); }
/* справа в шапке: у героя аккаунта — боевая мощь, доблесть «текущая / максимальная» и уровень «N / потолок» (§2.2, §33.2);
   рунные пределы — камнями по бокам лица */
function hrVitals(v) {
  return `<b class="bm" title="Боевая мощь">${ICON('power', 24, 'Боевая мощь')}<span class="num">${fmt(v.bm)}</span></b>
    <span class="hr-vv" title="Доблесть ${v.valor} из ${v.maxV}"><span class="stars lg">${stars(v.valor, v.maxV)}</span><small class="num">${v.valor} / ${v.maxV}</small></span>
    <span class="hr-vl" title="Уровень ${v.lvl} из ${v.cap}"><small>ур.</small><b class="num">${v.lvl}</b><small class="faint num">/ ${v.cap}</small></span>`;
}
const hrPot = v => `<span class="hr-vv" title="Личный максимум доблести — ${v.maxV}"><span class="stars lg">${stars(v.valor, v.maxV)}</span><small>доблесть до ${v.maxV}</small></span>`;
/* лицо в шапке; у героя с пределами — между двумя столбами рунных камней, как в раме: пройденные горят, следующий на потолке уровня
   тлеет или пульсирует. v.rpNx — состояние следующего камня вместо рассчитанного (UI-кит) */
function hrFace(v) {
  const face = `<div class="hd-face" data-r="${v.r}">${v.face}</div>`;
  if (!v.own || typeof rpPost !== 'function') return face;
  const nx = v.rpNx != null ? v.rpNx : hrRpNext(v), say = `Рунный предел ${v.lim} из ${hrLimTop()}`;
  return `<div class="hd-rp" role="img" aria-label="${say}" title="${say}">${rpPost(v.lim, nx, 'h', 'l')}${face}${rpPost(v.lim, nx, 'h', 'r')}</div>`;
}
/* шапка карточки: портрет в раме рунных пределов, имя, класс значком, стихия и раса, кристалл редкости и цикл; справа — прогресс
   или своё (цена и кнопка) */
function hrHead(v, aside) {
  const right = aside ? aside + (v.own ? '' : hrPot(v)) : v.own ? hrVitals(v) : hrPot(v);
  return `<div class="hd-top">
    ${hrFace(v)}
    <div class="hd-id">
      <div class="hd-name"><h2>${hrEsc(v.n)}</h2></div>
      <div class="hd-line"><span class="hd-cls">${CLS(v.ic, 18)}${v.cls}</span>${el(v.el)}<span>${v.race}</span></div>
      <div class="hd-line">${rar(v.r)}<span class="faint caps">цикл ${ROMAN[v.c]}</span></div>
    </div>
    <div class="hd-bm hr-vit${aside ? ' rs-aside' : ''}">${right}</div>
  </div>`;
}
function heroHead(h) { return hrHead(hrV(h)); }
/* шапка героя состава: v — доблесть для примерки (режим «Команда»); у купленного — его прогресс */
function rsHead(h, v, aside) { const x = hrV(h); if (!x.own) x.valor = Math.min(v || 0, x.maxV); return hrHead(x, aside); }
/* «Путь» героя аккаунта: главы по доблести и орден — из roster.js; у героя отряда прототипа — его запись в составе (hrTwin).
   Его зовёт heroDetail в index.html, вкладка «Путь» */
function hrPath(h) {
  const rh = hrTwin(h); if (!rh) return '';
  return `<div class="hd-cols"><div class="col scroll" data-keep="hrpath:${h.id}">${rsChaptersHtml(rh, h.valor)}</div>
    <div class="col scroll" style="gap:8px"><span class="eyebrow">Орден</span>${rsSetHtml(rh, h.valor)}</div></div>`;
}

/* ================== Коллекция: сетка карточек 9 : 16 и большая карточка ==================
   Слова автора 30.09.2026: «сетка со всеми героями, которых игрок уже купил… по форме условно 9 на 16, и, нажимая на арт, мы уже
   открываем крупным планом карточку героя: слева портрет, который можем посмотреть, а уже справа информация по герою». «Мои» — герои
   аккаунта, по мощи сильнейшие сверху; «Каталог» — все герои состава: несобранные чёрно-белые, у сборных — полоса осколков. Порядок —
   список, фильтр — лист значков (OV.hcflt): класс, стихия, редкость, цикл, в каталоге — источник */
const HR_NODATA = '<section class="scr"><div class="pnl pad"><p class="faint">Нет данных: рядом с index.html должен лежать roster.js.</p></div></section>';
function hrScreen() {
  const seg = S.seg.heroes;
  const meta = { title: 'Герои', seg: { key: 'heroes', items: [['coll', 'Коллекция'], ['squads', 'Отряды'], ['hire', 'Призыв']] } };
  if (seg === 'squads') return { ...meta, html: hrSquadsView() };
  if (seg === 'hire') return { ...meta, html: hireView() };
  return { ...meta, html: S.hview === 'mine' ? hcOwnView() : S.hview === 'rs' ? hcRsView() : hcGridView() };
}
SCREENS.heroes = hrScreen;

/* ---------- вид героя на карточке ---------- */
const hcRom = c => ROMAN[c] || '';
/* ступень вида: основа — редкость, взятые доблести поднимают (HC_VIEW.tier); не выше top */
function hcTier(v) {
  const T = HC_VIEW.tier, r = Math.max(1, Math.min(T.r.length, v.r || 1)), k = Math.max(0, Math.min(T.valor.length - 1, v.valor || 0));
  return Math.min(T.top, T.r[r - 1] + T.valor[k]);
}
/* путь пройден — лента «максимум»: доблесть на личном максимуме, все пределы круга пройдены, уровень на потолке */
const hcMax = v => !!v.own && v.maxV > 0 && v.valor >= v.maxV && v.lim >= hrLimTop() && v.lvl >= v.cap;
/* мощь на карточке: до HC_VIEW.short — полностью, дальше коротко — «128,4К», «1,2М»; только целые */
function hcNum(n) {
  if (!(n >= HC_VIEW.short)) return fmt(n || 0);
  const [d, s] = n >= 1000000 ? [100000, 'М'] : [100, 'К'], k = Math.floor(n / d);
  return `${fmt(Math.floor(k / 10))}${k % 10 ? ',' + (k % 10) : ''}${s}`;
}
/* вид героя для сетки и карточки — hrV и то, по чему фильтруют: класс в составе и источник */
function hcView(x) {
  const v = hrV(x); if (!v) return null;
  v.key = v.rh && v.rh.cl ? v.rh.cl[0] : String(v.ic || '');
  v.src = v.rh ? v.rh.src : '';
  return v;
}
/* портрет во всю карточку: рисунок героя; у героя без портрета — силуэт его класса, как в стекле осколка (art-icons.js), в свете
   стихии снизу — не инициалы */
function hcFace(v) {
  const o = v.acc && !RSI[v.acc.id] ? v.acc : null, rh = v.rh;
  const pic = o ? o.img : rh && typeof RS_ART !== 'undefined' && RS_ART.has(rh.id) ? AV('heroes/' + rh.id + '.jpg') : '';
  if (pic) return `<img class="hk-img" src="${pic}" alt="" loading="lazy" decoding="async">`;
  const key = typeof shardCls === 'function' ? shardCls(rh || v.acc || {}) : '', p = key && typeof ART_ICONS !== 'undefined' ? ART_ICONS.cls(key) : '';
  const sil = p && typeof artReady === 'function' && artReady(p) ? `<img src="${AV(p)}" alt="" loading="lazy" decoding="async">` : key && typeof shardClsSvg === 'function' ? shardClsSvg(key) : '';
  return `<span class="hk-sil" data-el="${hrEsc(v.el)}">${sil}</span>`;
}
/* доблесть дугой под гребнем: звёзд — личный максимум, горят взятые; середина выше краёв */
function hcStars(v, m) {
  if (!(m > 0)) return '';
  return `<span class="hk-st" title="Доблесть ${v} из ${m}">${Array.from({ length: m }, (_, i) => { const d = 2 * i - (m - 1); return `<i class="${i < v ? 'on' : ''}" style="--y:${Math.floor(d * d * HC_VIEW.arc / 4)}px"></i>`; }).join('')}</span>`;
}
/* сияние и искры у вершины — у высшей ступени: места и задержки — от номера, без случайности; при «меньше движения» стоят (heroes.css) */
const hcMotes = () => `<span class="hk-fx" aria-hidden="true"><b></b>${Array.from({ length: HC_VIEW.motes }, (_, i) => `<i style="--x:${(i * 37 + 9) % 60 + 20}%;--z:${(i * 23) % 40}%;--d:${(i * 530) % 3200}ms;--s:${1800 + (i * 290) % 1400}ms"></i>`).join('')}</span>`;
/* рамка ступени: картинка, когда выгружена (HC_ART.ready); иначе — CSS в духе стилей, отмеченных автором 30.09.2026 («золотая
   филигрань» и «кованое железо»): металл рамки и отделка богатеют со ступенью — тёмное железо с заклёпками; позолота, листья гребня
   и кабошоны цвета редкости; старое золото с крыльями у гребня и раскалёнными швами */
function hcFr(t) {
  const p = HC_ART.frame(t), art = HC_ART.ready.includes(p) ? ' art' : '';
  return `<i class="hk-fr${art}" aria-hidden="true"></i><i class="hk-orn${art}" aria-hidden="true"></i><i class="hk-crest${art}" aria-hidden="true"></i>${art ? `<img class="hk-fa" src="${AV(p)}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : ''}`;
}
/* знаки у вершины — одна раскладка у карточки сетки и портрета большой карточки: гребень — кристалл редкости, под ним — доблесть дугой;
   в кружках: слева — уровень (у героя аккаунта), справа — стихия. Раскладка — блок «раскладка значков» в heroes.css: сменить её — там */
function hcMarks(v, own) {
  return `<i class="hk-cr" aria-hidden="true"></i>${hcStars(v.valor, v.maxV)}${own ? `<span class="hk-lv" title="Уровень ${v.lvl} из ${v.cap}"><b class="num">${v.lvl}</b></span>` : ''}<span class="hk-el">${el(v.el, true)}</span>`;
}
/* полоса осколков под портретом: стекло с лицом, доля, «собрано / нужно»; полный комплект светится */
function hcShard(v, got, need) {
  const p = need > 0 ? Math.min(100, Math.floor(got * 100 / need)) : 0, g = v.rh && typeof shardGhost === 'function' ? shardGhost(v.rh, got, need, 18) : '';
  return `<span class="hk-sh${got >= need ? ' full' : ''}" title="Осколки ${fmt(got)} из ${fmt(need)}">${g}<span class="hk-shb"><i style="--v:${p}"></i></span><small class="num">${fmt(got)}/${fmt(need)}</small></span>`;
}
/* карточка героя 9 : 16 — одна на «Мои», каталог, «За золото» и отряд недели. Портрет во всю карточку; у вершины — гребень с кристаллом
   редкости и доблесть дугой, в кружках — уровень и стихия; по бокам — рунные камни пределов (у героя аккаунта: пройденные горят, следующий
   тлеет или пульсирует); внизу — имя на плашке, класс значком и мощь со значком (у несобранного — полоса осколков или цикл). Ступень вида
   (data-t) — металл рамки, отделка, свет и искры; путь пройден — «максимум».
   o: act, val — действие; gray — не в коллекции: чёрно-белый портрет; shard — [собрано, нужно] — полоса осколков; lock — цикл закрыт;
   sel — выбрана; own — отметка «в коллекции» у купленного (витрины); bm: false — без мощи; note — занятость поверх портрета */
function hcCard(v, o = {}) {
  const t = hcTier(v), own = v.own && !o.gray, mx = own && hcMax(v), nx = own ? hrRpNext(v) : '';
  const posts = own && typeof rpPost === 'function' ? rpPost(v.lim, nx, 't', 'l') + rpPost(v.lim, nx, 't', 'r') : '';
  const note = o.note != null ? o.note : own ? v.busy : '';
  const foot = o.shard ? hcShard(v, o.shard[0], o.shard[1])
    : own && o.bm !== false ? `<span class="hk-bm" title="Боевая мощь ${fmt(v.bm)}">${ICON('power', 13, 'Боевая мощь')}<b class="num">${hcNum(v.bm)}</b></span>`
    : o.own && v.own ? `<span class="hk-in">${ic('check')}в коллекции</span>` : `<span class="hk-cy">цикл ${hcRom(v.c)}</span>`;
  const say = `${v.n}, ${RAR[v.r].toLowerCase()}, ${v.cls}, ${String(v.el).toLowerCase()}${own ? `, уровень ${v.lvl}, рунный предел ${v.lim} из ${hrLimTop()}${nx === 'ready' ? ' — можно пробить следующий' : ''}, мощь ${fmt(v.bm)}` : `, цикл ${hcRom(v.c)}`}, доблесть ${v.valor} из ${v.maxV}${o.shard ? `, осколки ${o.shard[0]} из ${o.shard[1]}` : ''}${o.lock ? ', цикл ещё закрыт' : ''}${note ? ', ' + note : ''}`;
  const cls = ['hk', o.gray ? 'gray' : '', o.lock ? 'lock' : '', o.sel ? 'sel' : '', posts ? 'rpp' : ''].filter(Boolean).join(' ');
  return `<button class="${cls}" data-r="${v.r}" data-t="${t}"${mx ? ' data-max="1"' : ''} data-a="${o.act || 'hc'}" data-v="${o.val != null ? o.val : v.id}"${o.sel ? ' aria-pressed="true"' : ''} aria-label="${hrEsc(say)}">
    <span class="hk-ph">${hcFace(v)}</span>${hcFr(t)}${t >= HC_VIEW.tier.top && !o.gray && !o.lock ? hcMotes() : ''}
    ${hcMarks(v, own)}${posts}
    ${mx ? '<span class="hk-max">максимум</span>' : ''}${note ? `<span class="hk-busy">${note}</span>` : ''}${o.lock ? `<span class="hk-lk" aria-hidden="true">${ic('lock')}</span>` : ''}
    <span class="hk-bot"><b class="hk-nm">${hrEsc(v.n)}</b><span class="hk-row"><span class="hk-cls" title="${hrEsc(v.cls)}">${CLS(v.ic, 14, v.cls)}</span>${foot}</span></span>
  </button>`;
}
const hcGridVars = () => `--hk-w0:${HC_VIEW.card[0]}px;--hk-w1:${HC_VIEW.card[1]}px;--hk-gap:${HC_VIEW.gap}px`;

/* ---------- порядок и фильтр ---------- */
/* сетка сейчас: all — каталог, own — герои аккаунта (карточка помнит, из какой сетки открыта: S.hgrid) */
const hcKind = () => S.hview === 'all' || (S.hview === 'rs' && S.hgrid === 'all') ? 'all' : 'own';
const HC_FK = { own: ['cls', 'el', 'r', 'c'], all: ['cls', 'el', 'r', 'c', 'src'], gold: ['cls', 'el', 'r'] };
function hcPass(v, kind) {
  const f = S.hf, on = k => HC_FK[kind].includes(k) && f[k];
  return (!on('cls') || v.key === f.cls) && (!on('el') || v.el === f.el) && (!on('r') || v.r === f.r) && (!on('c') || v.c === f.c) && (!on('src') || v.src === f.src);
}
const hcFN = kind => HC_FK[kind].filter(k => S.hf[k]).length;
const HC_CMP = {
  bm: (a, b) => b.bm - a.bm, r: (a, b) => b.r - a.r || b.bm - a.bm, lvl: (a, b) => b.lvl - a.lvl || b.bm - a.bm,
  valor: (a, b) => b.valor - a.valor || b.bm - a.bm, c: (a, b) => a.c - b.c,
};
const hcSortOf = kind => { const k = kind === 'all' ? S.hf.sortAll : S.hf.sort, L = HC_SORT[kind]; return L.some(x => x[0] === k) ? k : L[0][0]; };
function hcSorted(list, kind) {
  const cmp = HC_CMP[hcSortOf(kind)], at = new Map(list.map((v, i) => [v, i]));
  return [...list].sort((a, b) => cmp(a, b) || at.get(a) - at.get(b));
}
/* «Мои» — герои аккаунта: отряд прототипа и купленные; ‹ › большой карточки листают этот же список */
const hcOwnList = () => hcSorted(hrMine().map(hcView).filter(v => v && hcPass(v, 'own')), 'own');
/* каталог — весь состав; купленный — вид героя аккаунта */
const hcCatList = () => hcSorted(RS.heroes.map(hcView).filter(v => v && hcPass(v, 'all')), 'all');
const HC_FUN = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/></svg>';
const hcFBtn = (kind, n) => `<button class="iconbtn hk-fb${n ? ' on' : ''}" data-a="sheet" data-v="hcflt:${kind}" aria-label="Фильтр${n ? ': выбрано ' + n : ''}" title="Фильтр">${HC_FUN}${n ? `<b class="num">${n}</b>` : ''}</button>`;
/* строка над сеткой: «Мои» и «Каталог», сила коллекции, порядок и фильтр — компактно (правила воздуха) */
function hcBar(kind, shown, total) {
  const all = kind === 'all', n = hcFN(kind), sort = hcSortOf(kind);
  const tabs = `<div class="tabs hk-tabs" role="tablist" aria-label="Коллекция"><button role="tab" aria-selected="${!all}" data-a="hview" data-v="own">Мои · ${hrMine().length}</button><button role="tab" aria-selected="${all}" data-a="hview" data-v="all">Каталог · ${RS.heroes.length}</button></div>`;
  const pow = all ? '' : `<button class="collpow hk-pow" data-a="sheet" data-v="coll" title="Рейтинговые пассивки всех героев коллекции: РП1 — Событие, все пять — по нажатию"><b>Сила коллекции</b><span class="chip spirit">+${collPct(collRp(1))}</span>${ic('chev')}</button>`;
  const sel = `<select class="rs-sel hk-sort" data-a="hcsort" aria-label="Порядок">${HC_SORT[kind].map(([k, l]) => `<option value="${k}"${k === sort ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  return `<div class="hkh">${tabs}${n ? `<span class="hk-cnt num">${shown} из ${total}</span>` : ''}<span class="g-spacer"></span>${pow}${sel}${hcFBtn(kind, n)}</div>`;
}
const hcEmpty = () => `<div class="hk-empty"><p>Под фильтр никто не подходит</p><button class="btn sm" data-a="hcclr">Сбросить фильтр</button></div>`;
/* сетка: «Мои» — карточки героев аккаунта; каталог — весь состав, несобранные чёрно-белые, у сборных — полоса осколков, закрытый цикл — замок */
function hcGridView() {
  const kind = S.hview === 'all' ? 'all' : 'own';
  if (kind === 'all' && !RS.heroes.length) return HR_NODATA;
  const list = kind === 'all' ? hcCatList() : hcOwnList(), total = kind === 'all' ? RS.heroes.length : hrMine().length, cur = rsCyc(), need = hrNeed();
  const card = v => {
    if (kind !== 'all' || v.own) return hcCard(v);
    const lock = v.c > cur, sh = RS_SHARD.includes(v.src) && !lock ? [S.rs.shards[v.id] || 0, need] : null;
    return hcCard(v, { gray: !(sh && sh[0] >= need), shard: sh, lock });
  };
  return `<section class="scr hk-scr">${hcBar(kind, list.length, total)}
    <div class="hkg scroll" style="${hcGridVars()}" data-keep="hk:${kind}">${list.map(card).join('') || hcEmpty()}</div></section>`;
}

/* ---------- большая карточка ----------
   Слева — портрет в раме своей ступени: нажатие показывает его крупно (OV.hczoom); кристалл, доблесть дугой, рунные камни по бокам,
   «максимум». Справа — шапка: имя, класс и стихия, раса, редкость и цикл; у героя аккаунта — мощь, доблесть и уровень, у героя состава —
   личный максимум доблести. Ниже — вкладки и одно действие. o: back — атрибуты кнопки «Назад», step — ‹ › по сетке, body, foot, src */
function hcBig(v, o = {}) {
  const t = hcTier(v), own = !!v.own, mx = own && hcMax(v), nx = own ? hrRpNext(v) : '', G = HC_VIEW, say = `Рунный предел ${v.lim} из ${hrLimTop()}`;
  const posts = own && typeof rpPost === 'function' ? `<span class="hcb-rp" role="img" aria-label="${say}" title="${say}">${rpPost(v.lim, nx, 'h', 'l')}${rpPost(v.lim, nx, 'h', 'r')}</span>` : '';
  const back = o.back ? `<button class="iconbtn hcb-bk" ${o.back} aria-label="Назад" title="Назад">${ic('back')}</button>` : '';
  const step = o.step ? `<span class="hcb-step"><button class="iconbtn" data-a="hcstep" data-v="-1" aria-label="Предыдущий герой" title="Предыдущий">${ic('chev', 'flip')}</button><button class="iconbtn" data-a="hcstep" data-v="1" aria-label="Следующий герой" title="Следующий">${ic('chev')}</button></span>` : '';
  return `<div class="hcb" style="--hcb-w:${G.big[0]};--hcb-h:${G.big[1]};--hcb-max:${G.bigMax}">
    <div class="hcb-g">
      <div class="hcb-pt" data-r="${v.r}" data-t="${t}"${mx ? ' data-max="1"' : ''}>
        <button class="hcb-ph" data-a="hczoom" data-v="${v.id}" aria-label="${hrEsc(v.n)}: портрет крупно">${hcFace(v)}</button>${hcFr(t)}${t >= G.tier.top ? hcMotes() : ''}
        ${hcMarks(v, own)}${posts}
        ${mx ? '<span class="hk-max">максимум</span>' : ''}${own && v.busy ? `<span class="hk-busy">${v.busy}</span>` : ''}<i class="hcb-zi" aria-hidden="true">${ic('search')}</i>
      </div>
      <div class="hcb-in">
        <header class="hcb-h">${back}<div class="hcb-id"><h2>${hrEsc(v.n)}</h2>
          <div class="hd-line"><span class="hd-cls">${CLS(v.ic, 18)}${v.cls}</span>${el(v.el)}<span>${v.race}</span></div>
          <div class="hd-line">${rar(v.r)}<span class="faint caps">цикл ${hcRom(v.c)}</span>${o.src || ''}</div></div>${step}
          <div class="hd-bm hr-vit${own ? '' : ' rs-aside'}">${own ? hrVitals(v) : hrPot(v)}</div></header>
        ${o.body || ''}${o.foot ? `<div class="hcb-f">${o.foot}</div>` : ''}
      </div>
    </div>
  </div>`;
}
/* большая карточка героя аккаунта: вкладки «Развитие», «Снаряжение», «Навыки», «Путь» — heroDetail без шапки (index.html); одно главное
   действие — следующий шаг во вкладке «Развитие» (screens/hero-dev.js) */
function hcOwnView() {
  const mine = hrMine(); let h = H(S.selHero);
  if (!h || !mine.includes(h)) { h = mine[0]; if (!h) return hcGridView(); S.selHero = h.id; }
  const list = hcOwnList(), many = list.length > 1 || (list.length === 1 && list[0].id !== h.id);
  return `<section class="scr hcb-scr">${hcBig(hcView(h), { back: 'data-a="hcback"', step: many, body: heroDetail(h, { head: false, cls: 'hcb-tabs' }) })}</section>`;
}
/* большая карточка героя состава — «до покупки»: вкладки «Герой» (история-завязка и с чем приходит), «Навыки» (что откроет каждая
   доблесть: набор героя, доли хода), «Путь» (главы и орден). Снаряжения, талисманов и прокачки нет — героя ещё нет в коллекции;
   купленный — та же карточка с его прогрессом. o: back — атрибуты «Назад», foot — одно действие внизу */
function hcPre(rh, o = {}) {
  const v = hcView(rh), val = S.rs.val && S.rs.val.id === rh.id ? rsV(rh) : v.own ? v.valor : 0;
  const t = ['who', 'skills', 'path'].includes(S.seg.rhero) ? S.seg.rhero : 'who';
  const team = `<button class="iconbtn rs-team team-only" data-a="rsteam" aria-pressed="${!!KH.team}" aria-label="Режим «Команда»" title="Режим «Команда»: орден, черновик и заметки видны сразу. Нажать — вернуться к виду игрока">${ic('eye')}</button>`;
  const tabs = `<div class="row hcb-tr"><div class="tabs" role="tablist" aria-label="Разделы героя">${[['who', 'Герой'], ['skills', 'Навыки'], ['path', 'Путь']].map(([k, l]) => `<button role="tab" aria-selected="${t === k}" data-a="seg" data-v="rhero:${k}">${l}</button>`).join('')}</div><span class="g-spacer"></span>${team}</div>`;
  const pseudo = { draft: hrDraft(rh), valor: val }, kit = typeof heroKit === 'function' && heroKit(pseudo) ? heroKitHtml(pseudo) : '<p class="faint">Набора способностей пока нет.</p>';
  const body = t === 'skills' ? `${rsValorPick(rh, val)}${kit}`
    : t === 'path' ? `<div class="hcb-sc scroll" data-keep="hcpath:${rh.id}">${rsValorPick(rh, val)}${rsChaptersHtml(rh, val)}<span class="eyebrow">Орден</span>${rsSetHtml(rh, val)}</div>`
    : `<div class="hcb-sc scroll" data-keep="hcwho:${rh.id}">${rsWhoHtml(rh)}</div>`;
  return hcBig(v, { back: o.back, src: rsSrcChip(rh), body: `<div class="hcb-tb">${tabs}${body}</div>`, foot: o.foot });
}
/* каталог: карточка героя состава на месте сетки; «Назад» — в каталог */
function hcRsView() {
  const rh = RSI[S.rs.sel] || RS.heroes[0]; if (!rh) return HR_NODATA;
  return `<section class="scr hcb-scr">${hcPre(rh, { back: 'data-a="hcback"', foot: hcGetFoot(rh) })}</section>`;
}
/* одно действие карточки героя состава: купленный — к развитию; иначе — к своему способу получить: найм, витрина, души, отряд недели */
function hcGetFoot(rh) {
  const own = S.rs.owned[rh.id];
  if (rsHas(rh)) return `<span class="chip gold">${ic('check')}${own && RS_HOW[own.how] ? RS_HOW[own.how] : 'в коллекции'}</span><span class="g-spacer"></span><button class="btn go" data-a="dngo" data-v="${rh.id}">${ic('up')}К развитию</button>`;
  const cur = rsCyc(), lock = rh.c > cur, need = hrNeed(), n = S.rs.shards[rh.id] || 0, W = rsWeek(), week = !!W && W.squad.includes(rh.id);
  const how = { gold: `Найм за золото: следующий в цикле ${ROMAN[rh.c]} — ${fmt(rsGold(rh.c, rsBought(rh.c) + 1))}`, donat: 'Донатный сет за Энериум: любой из пятерых',
    roulette: 'Осколки — в Возрождении душ и в лавке праха', echo: 'Осколки — только в сундуках Эхо за места недели', craft: 'Скрытый рецепт: его находят перебором в Мастерской' }[rh.src] || '';
  const sh = RS_SHARD.includes(rh.src) && !lock ? `<span class="hcb-shb">${bar(Math.min(100, hrFl(n * 100, need)), n >= need ? 'sp' : '')}<small class="num">${fmt(n)} / ${fmt(need)}</small></span>` : '';
  const go = rh.src === 'craft' ? '' : `<button class="btn go" data-a="rsgo" data-v="${rh.id}">${ic('arrow')}${{ gold: 'К найму', donat: 'В витрину', roulette: 'К душам', echo: week ? 'К отряду недели' : 'К душам' }[rh.src]}</button>`;
  return `<div class="hcb-buy">${lock ? `<span class="chip warn">${ic('lock')}цикл ${ROMAN[rh.c]}</span>` : ''}<span class="reason">${how}</span>${sh}</div><span class="g-spacer"></span>${go}`;
}

/* ================== Отряды ==================
   Библиотека «Отряды» (§2.1): до десяти именованных пресетов, в каждом до пяти героев аккаунта. Пресет сам героев не занимает: при
   применении проверяются правила режима. Один лист выбора на все режимы (OV.prep), у каждого режима — свой сохранённый выбор */
const SQM = SQ_DATA.modes;
const sqFind = id => (id && S.squads.find(s => s.id === id)) || null;
/* пресет по id; удалённого нет — первый в библиотеке: режим, забег и «Ещё забег» не остаются без отряда */
const sq = id => sqFind(id) || S.squads[0];
const sqBM = s => BM.squad(s.m);   // мощь отряда — сумма BM.hero (index.html, §6)
const sqKey = m => SQM[m] ? m : 'descent';   // лист «prep» без режима — спуск
const sqOp = () => 'q' + S.sq.seq;           // номер следующей операции: его несут кнопки
function sqGet(mode) {
  const M = SQM[sqKey(mode)];
  if (M.hold) return S[M.hold];
  const v = S.sq.sel[sqKey(mode)];
  return M.teams ? Array.from({ length: M.teams }, (_, i) => (Array.isArray(v) && v[i]) || null) : v || null;
}
function sqSet(mode, id, i) {
  const k = sqKey(mode), M = SQM[k];
  if (id != null && !sqFind(id)) return false;
  if (M.hold) { if (!id) return false; S[M.hold] = id; return true; }
  if (M.teams) { const v = sqGet(k), j = Math.max(0, Math.min(M.teams - 1, +i || 0)); v[j] = id || null; S.sq.sel[k] = v; return true; }
  S.sq.sel[k] = id || null;
  return true;
}
/* готовность отряда к режиму: ids — герои пресета по порядку, go — кто пойдёт, busy — занятые, why — почему не готов */
function sqReady(mode, s) {
  const M = SQM[sqKey(mode)], ids = s ? s.m.filter(id => id && H(id)) : [];
  const busy = M.busy === 'allow' ? [] : ids.filter(id => busyNote(id));
  const go = M.busy === 'skip' ? ids.filter(id => !busy.includes(id)) : ids;
  let why = '';
  if (!s) why = 'не выбран';
  else if (M.exact && ids.length !== M.min) why = `${ids.length} из ${M.min}`;
  else if (M.busy === 'block' && busy.length) why = `${busy.length} ${plural(busy.length, 'занят', 'заняты', 'заняты')}`;
  else if (go.length < M.min) why = ids.length ? 'все заняты' : 'пусто';
  return { ok: !why, why, ids, go, busy };
}
/* Лига: три отряда по пять, герой не повторяется (§20.4) */
function sqLeague() {
  const M = SQM.league, teams = sqGet('league').map(id => { const s = sqFind(id); return Object.assign({ s }, sqReady('league', s)); });
  const at = {}; teams.forEach((t, i) => t.ids.forEach(id => { (at[id] = at[id] || []).push(i); }));
  const dup = Object.keys(at).filter(id => at[id].length > 1);
  const need = M.teams * M.min, pool = hrMine().length;
  const why = teams.some(t => !t.s) ? 'не все раунды выбраны' : dup.length ? 'герой повторяется' : teams.some(t => !t.ok) ? 'не все отряды полные' : '';
  return { teams, dup, at, need, pool, ok: !why, why };
}
/* где выбран пресет: имена режимов */
function sqUsed(id) {
  return Object.keys(SQM).filter(k => { const v = sqGet(k); return Array.isArray(v) ? v.includes(id) : v === id; }).map(k => SQM[k].n);
}
/* лицо героя в строках и списках: портрет с кристаллом редкости (.rs-av) */
const hrAv = h => `<span class="rs-av" data-r="${h.r}">${RSI[h.id] ? rsFace(RSI[h.id]) : `<img src="${h.img}" alt="">`}</span>`;
const sqFaces = s => s.m.map(id => { const h = id && H(id); return h ? hrAv(h) : '<i></i>'; }).join('');

/* «сервер» библиотеки: изменение отрядов — операция с номером. Проверка и изменение — одним вызовом; повтор того же номера возвращает
   прежний ответ и ничего не меняет; отказ номер не тратит. В игре операцию подтверждает сервер */
const SQ_SRV = {
  run(op, f) {
    const O = S.sq.ops;
    if (!op) return { refuse: 'op' };
    if (O[op]) return { again: true, res: O[op] };
    const res = f() || {};
    if (res.refuse) return res;
    O[op] = res; S.sq.seq++;
    return { res };
  },
  create(op) {
    return SQ_SRV.run(op, () => {
      if (S.squads.length >= SQ_DATA.max) return { refuse: 'max' };
      const n = Math.max(0, ...S.squads.map(s => +(String(s.id).match(/\d+$/) || [0])[0])) + 1, id = 's' + n;
      const names = new Set(S.squads.map(s => s.name));
      let k = 1; while (k < HR_ROMAN.length - 1 && names.has('Отряд ' + HR_ROMAN[k])) k++;
      const name = names.has('Отряд ' + HR_ROMAN[k]) ? 'Отряд ' + (S.squads.length + 1) : 'Отряд ' + HR_ROMAN[k];
      S.squads.push({ id, name, m: Array.from({ length: SQ_DATA.size }, () => null) });
      return { id, name };
    });
  },
  rename(op, id, name) {
    const nm = String(name == null ? '' : name).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, SQ_DATA.nameMax).trim();
    return SQ_SRV.run(op, () => { const s = sqFind(id); if (!s) return { refuse: 'none' }; if (!nm) return { refuse: 'name' }; s.name = nm; return { id, name: nm }; });
  },
  /* удаление: последний пресет не удалить; режимы с этим отрядом берут первый оставшийся, Лига и Клановый босс — ждут выбора */
  remove(op, id) {
    return SQ_SRV.run(op, () => {
      const s = sqFind(id); if (!s) return { refuse: 'none' };
      if (S.squads.length <= 1) return { refuse: 'last' };
      const used = sqUsed(id);
      S.squads = S.squads.filter(x => x !== s);
      const first = S.squads[0].id;
      for (const [k, M] of Object.entries(SQM)) {
        if (M.hold) { if (S[M.hold] === id) S[M.hold] = first; continue; }
        const v = S.sq.sel[k];
        if (Array.isArray(v)) S.sq.sel[k] = v.map(x => x === id ? null : x);
        else if (v === id) S.sq.sel[k] = k === 'arena' ? first : null;   // оборона обязательна (§20.3)
      }
      if (S.selSquad === id) S.selSquad = first;
      return { id, name: s.name, used };
    });
  },
  /* герой в место i: уже в отряде — меняется местами, место занято другим — тот уходит из отряда */
  put(op, id, i, hid) {
    return SQ_SRV.run(op, () => {
      const s = sqFind(id); if (!s || !(i >= 0 && i < SQ_DATA.size)) return { refuse: 'slot' };
      if (!H(hid)) return { refuse: 'hero' };
      const j = s.m.indexOf(hid);
      if (j === i) return { refuse: 'same' };
      if (j >= 0) { s.m[j] = s.m[i]; s.m[i] = hid; return { id, i, hid, swap: j }; }
      const out = s.m[i]; s.m[i] = hid;
      return { id, i, hid, out };
    });
  },
  take(op, id, i) {
    return SQ_SRV.run(op, () => { const s = sqFind(id); if (!s || !s.m[i]) return { refuse: 'slot' }; const hid = s.m[i]; s.m[i] = null; return { id, i, hid }; });
  },
  swap(op, id, i, j) {
    return SQ_SRV.run(op, () => {
      const s = sqFind(id), n = SQ_DATA.size;
      if (!s || !(i >= 0 && i < n && j >= 0 && j < n) || i === j || (!s.m[i] && !s.m[j])) return { refuse: 'slot' };
      [s.m[i], s.m[j]] = [s.m[j], s.m[i]];
      return { id, i, j };
    });
  },
  /* выбор отряда режима; у Лиги — в раунд i */
  pick(op, mode, id, i) {
    return SQ_SRV.run(op, () => sqSet(mode, id, i) ? { mode: sqKey(mode), id, i: +i || 0 } : { refuse: 'none' });
  },
};
const SQ_WHY = { max: `В библиотеке уже ${SQ_DATA.max} отрядов`, last: 'Последний отряд удалить нельзя', name: 'Имя не может быть пустым', none: 'Такого отряда нет',
  hero: 'Такого героя нет в коллекции', slot: 'Нет такого места', same: 'Герой уже на этом месте', op: 'Действие устарело' };
const sqSay = r => { if (r && r.refuse) toast(SQ_WHY[r.refuse] || 'Не вышло'); return !!(r && r.res && !r.again); };

/* API для экранов режимов (описан в screens/README.md): лист выбора, выбор режима, готовность, кто пойдёт */
const SQ = {
  modes: SQM,
  /* выбор режима: id пресета или null; у Лиги — массив из трёх */
  of: mode => sqGet(mode),
  squad: mode => { const v = sqGet(mode); return Array.isArray(v) ? v.map(sqFind) : sqFind(v); },
  /* готовность выбранного (или указанного) отряда; у Лиги — три отряда и повторы */
  ready(mode, id) { const k = sqKey(mode); return SQM[k].teams && id == null ? sqLeague() : sqReady(k, id != null ? sqFind(id) : sqFind(sqGet(k))); },
  /* кто пойдёт: герои выбранного отряда по правилам режима; у Лиги — три списка */
  ids(mode) { const k = sqKey(mode); return SQM[k].teams ? sqLeague().teams.map(t => t.go) : sqReady(k, sqFind(sqGet(k))).go; },
  /* лист выбора поверх текущего экрана; «Изменить» ведёт в библиотеку и возвращает сюда. opts.back — маршрут возврата */
  pick(mode, opts = {}) { const k = sqKey(mode); S.sq.round = 0; open('prep', k, { back: opts.back || S.route }); },
  set: (mode, id, i) => sqSet(mode, id, i),
  pool: () => hrMine().map(h => h.id),
  hero: id => hrV(H(id)),
  busy: id => busyNote(id) || '',
  bm: s => sqBM(s),
  used: id => sqUsed(id),
};

/* ---------- библиотека: список пресетов и редактор ---------- */
function hrSquadsView() {
  const s = sq(S.selSquad); S.selSquad = s.id;
  const op = sqOp(), slot = S.sq.slot, n = s.m.filter(Boolean).length, full = S.squads.length >= SQ_DATA.max;
  const rows = S.squads.map(x => { const u = sqUsed(x.id); return `<button class="preset" data-a="sq" data-v="${x.id}" aria-current="${x.id === s.id}">
      <span class="row"><b>${hrEsc(x.name)}</b><span class="g-spacer"></span>${bmHtml(sqBM(x), 12)}</span>
      <span class="faces">${sqFaces(x)}</span>${u.length ? `<small class="faint">${u.join(' · ')}</small>` : ''}</button>`; }).join('');
  const slots = s.m.map((id, i) => { const h = id && H(id); return h ? heroCard(h, { act: 'sqslot', val: `${op}|${i}`, sel: slot === i, bm: false })
    : `<button class="hc empty${slot === i ? ' sel' : ''}" data-a="sqslot" data-v="${op}|${i}" aria-label="Пустое место ${i + 1}">${ic('plus')}</button>`; }).join('');
  const sel = slot >= 0 && s.m[slot] ? H(s.m[slot]) : null;
  const bar = sel ? `<span class="hr-sqsel"><b>${hrEsc(sel.name)}</b><button class="iconbtn" data-a="sqmv" data-v="${op}|${s.id}|${slot}|-1" aria-label="Сдвинуть влево" ${slot > 0 ? '' : 'disabled'}>${ic('back')}</button><button class="iconbtn" data-a="sqmv" data-v="${op}|${s.id}|${slot}|1" aria-label="Сдвинуть вправо" ${slot < SQ_DATA.size - 1 ? '' : 'disabled'}>${ic('arrow')}</button><button class="btn sm" data-a="sqrem" data-v="${op}|${s.id}|${slot}">${ic('x')}Убрать</button></span>`
    : `<span class="reason">${slot >= 0 ? `Место ${slot + 1}: выберите героя ниже.` : 'Нажмите героя, затем другое место — поменяются местами.'}</span>`;
  const pool = hrMine().filter(h => !s.m.includes(h.id)).sort((a, b) => b.bm - a.bm);
  const prow = h => { const b = busyNote(h.id); return `<button class="rs-row hr-prow" data-r="${h.r}" data-a="sqput" data-v="${op}|${s.id}|${h.id}">${hrAv(h)}<span class="tx"><b>${hrEsc(h.name)}</b><small>${CLS(h.clsN || h.cls, 13)}ур. ${h.lvl} · ${bmHtml(h.bm, 11)}</small></span>${b ? `<span class="chip warn" title="${b}">занят</span>` : ''}</button>`; };
  const F = S.sq.from, from = F ? `<div class="hr-from"><span>Выбор для режима «${SQM[F.mode].n}»</span><span class="g-spacer"></span><button class="link" data-a="sqback">${ic('back')}Назад</button><button class="btn sm go" data-a="sqpick" data-v="${op}|${F.mode}|${s.id}|${S.sq.round}">Выбрать «${hrEsc(s.name)}»</button></div>` : '';
  return `<section class="scr"><div class="sq">
    <div class="pnl pad col">
      <div class="row"><span class="eyebrow">Отряды · ${S.squads.length} / ${SQ_DATA.max}</span></div>
      <div class="col scroll grow hr-pres" data-keep="sqlist">${rows}</div>
      <button class="btn sm" data-a="sqnew" data-v="${op}" ${full ? `disabled title="В библиотеке уже ${SQ_DATA.max} отрядов"` : ''}>${ic('plus')}Новый отряд</button>
    </div>
    <div class="pnl pad col hr-sqed">
      ${from}
      <div class="row hr-sqh"><h2 class="serif gold">${hrEsc(s.name)}</h2><button class="iconbtn" data-a="sheet" data-v="sqname:${s.id}" aria-label="Переименовать отряд" title="Переименовать">${HR_PEN}</button><button class="iconbtn" data-a="sqdel" data-v="${s.id}" aria-label="Удалить отряд" title="Удалить" ${S.squads.length > 1 ? '' : 'disabled'}>${ic('trash')}</button><span class="chip">${n} / ${SQ_DATA.size}</span><span class="g-spacer"></span><b class="bm sq-bm" title="Боевая мощь отряда">${ICON('power', 22, 'Боевая мощь')}<span class="num">${fmt(sqBM(s))}</span></b></div>
      <div class="sq-slots">${slots}</div>
      <div class="row hr-sqbar">${bar}</div>
      <div class="hr"></div>
      <span class="eyebrow">${pool.length ? `Герои · ${pool.length}` : 'Все герои в отряде'}</span>
      <div class="hr-pool scroll grow" data-keep="sqpool">${pool.map(prow).join('')}</div>
    </div>
  </div></section>`;
}
const HR_PEN = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg>';

/* ---------- лист выбора отряда: один на все режимы ---------- */
const sqMark = r => r.ok ? `<i class="ok" aria-hidden="true">${ic('check')}</i>` : `<small>${r.why}</small>`;
const sqChip = (x, on, v, r) => `<button class="p-chip hr-chip${r.ok ? '' : ' warn'}" aria-pressed="${on}" data-a="sqpick" data-v="${v}">${hrEsc(x.name)}${sqMark(r)}</button>`;
const sqGone = n => ['', 'один', 'вдвоём', 'втроём', 'вчетвером'][n] || 'без них';
const sqNames = ids => ids.map(id => H(id).name).join(', ');
/* под отрядом: мощь тех, кто пойдёт, стихии и одна строка о готовности */
function sqInfo(mode, s, r) {
  const bm = BM.squad(r.go), els = [...new Set(r.go.map(id => H(id).el))];
  const hall = mode === 'descent' ? ((BIOME_UI[selRunBiome()] || BIOME_UI.b1).els || []) : els;
  const stat = `<div class="row hr-sqi"><div class="stat"><b class="bm">${ICON('power', 20, 'Боевая мощь')}<span class="num">${fmt(bm)}</span></b><small>боевая мощь</small></div><span class="g-spacer"></span>${hall.length ? `<div class="col" style="gap:4px;align-items:flex-end"><span class="eyebrow">${mode === 'descent' ? 'В зале чаще всего' : 'Стихии отряда'}</span><span class="row" style="gap:4px">${hall.map(e => el(e)).join('')}</span></div>` : ''}</div>`;
  const M = SQM[mode];
  let line = '';
  if (!r.ok) line = `<p class="reason warn">${M.exact ? (r.ids.length !== M.min ? `Нужны ровно ${M.min} героев, в «${hrEsc(s.name)}» — ${r.ids.length}.` : `Заняты: ${sqNames(r.busy)}.`) : r.ids.length ? `Весь «${hrEsc(s.name)}» занят.` : `«${hrEsc(s.name)}» пуст: добавьте героев.`}</p>`;
  else if (r.busy.length) line = `<p class="reason">${sqNames(r.busy)} ${r.busy.length > 1 ? 'заняты' : 'занят'} — отряд пойдёт ${sqGone(r.go.length)}.</p>`;
  else if (mode === 'descent') { const last = S.lastRun[selRunBiome()]; line = `<p class="reason">${TM('Этажи — готовые колоды, сид — сам биом: тот же отряд с той же ротацией пройдёт их так же.')}${last ? ` Прошлый забег: ${last.wall ? 'стена на этаже ' + last.wall : last.kind === 'boss' ? 'босс повержен' : last.kind === 'siege' ? 'дошёл до босса' : 'прерван'}.` : ''}</p>`; }
  return stat + line;
}
function sqSlotsOf(mode, s) {
  const M = SQM[mode];
  return `<div class="sq-slots">${s.m.map(id => { const h = id && H(id); if (!h) return `<div class="hc empty">${ic('plus')}</div>`; const b = busyNote(id) || '';
    return heroCard(h, { act: 'noop', note: M.busy === 'allow' ? '' : b, dim: M.busy !== 'allow' && !!b, bm: false }); }).join('')}</div>`;
}
function sqLeagueSheet() {
  const M = SQM.league, L = sqLeague(), op = sqOp(), cur = Math.max(0, Math.min(M.teams - 1, S.sq.round || 0)), sel = sqGet('league');
  const rounds = L.teams.map((t, i) => `<button class="hr-round" data-a="sqround" data-v="${i}" aria-pressed="${i === cur}"><span class="eyebrow">Раунд ${ROMAN[i + 1]}</span><b>${t.s ? hrEsc(t.s.name) : 'не выбран'}</b><span class="faces">${t.s ? sqFaces(t.s) : ''}</span>${t.s ? sqMark(t) : ''}</button>`).join('');
  const chips = S.squads.map(x => sqChip(x, sel[cur] === x.id, `${op}|league|${x.id}|${cur}`, sqReady('league', x))).join('');
  const dup = L.dup.map(id => `${H(id).name} — в раундах ${L.at[id].map(i => ROMAN[i + 1]).join(' и ')}`);
  const line = L.ok ? '<p class="reason">Три отряда готовы.</p>' : L.pool < L.need ? `<p class="reason warn">Нужно ${L.need} разных героев — в коллекции ${L.pool}.</p>`
    : dup.length ? `<p class="reason warn">Герой не повторяется: ${dup.join('; ')}.</p>` : `<p class="reason warn">${L.teams.map((t, i) => t.ok ? '' : `Раунд ${ROMAN[i + 1]}: ${t.why}`).filter(Boolean).join(' · ')}.</p>`;
  const body = `<p class="reason">${M.rule}</p><div class="hr-rounds">${rounds}</div><span class="eyebrow">Отряд в раунд ${ROMAN[cur + 1]}</span><div class="row hr-chips">${chips}</div>${line}`;
  const id = sel[cur] || S.squads[0].id;
  return sheet(M.t, body, `<button class="link" data-a="sqedit" data-v="league|${id}">${ic('users')}Изменить</button><button class="btn sm" data-a="sqnew" data-v="${op}|league" ${S.squads.length >= SQ_DATA.max ? 'disabled' : ''}>${ic('plus')}Новый</button><button class="btn go" data-a="close">Готово</button>`, true);
}

/* ================== Призыв: три способа получить героя (ADR-0019) ==================
   За золото — сетка карточек 9 : 16 каталога цикла, цена по счёту покупки (ADR-0023); за Энериум — донатный сет цикла, с цикла II
   (ADR-0021); за души — рулетка крупно, отряд Эхо недели и лавка праха — входами (правила воздуха). Цикл I–VI переключается для
   демо — только команде. Открытая карточка «до покупки» занимает всю рабочую область: крупным планом, «Назад» — к сетке */
function hireView() {
  if (!RS.heroes.length) return HR_NODATA;
  const t = S.seg.hire || 'gold', c = rsCyc(), pick = t === 'gold' && S.rs.gsel ? RSI[S.rs.gsel] : null;
  if (pick && pick.src === 'gold') return `<section class="scr hcb-scr">${hcPre(pick, { back: 'data-a="gsel" data-v=""', foot: hcGoldFoot(pick) })}</section>`;
  const tabs = [['gold', 'За золото'], ['donat', 'За Энериум'], ['souls', 'За души']];
  return `<section class="scr">
    <div class="row rs-hbar"><div class="tabs" role="tablist" aria-label="Способ получить героя">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${t === k}" data-a="seg" data-v="hire:${k}">${l}</button>`).join('')}</div>
      <span class="g-spacer"></span><span class="eyebrow team-only">цикл · демо</span>
      <div class="tabs rs-cyc team-only" role="tablist" aria-label="Текущий цикл, демо">${ROMAN.slice(1).map((r, i) => `<button role="tab" aria-selected="${c === i + 1}" data-a="rscyc" data-v="${i + 1}">${r}</button>`).join('')}</div></div>
    ${t === 'donat' ? dnView() : t === 'souls' ? rsSoulsView() : rsGoldView()}
  </section>`;
}
/* за золото — слова автора 30.09.2026: «в призыве за золото то же самое: сетка героев и вся информация по герою до его покупки, чтобы
   игрок понимал, что он покупает». Каталог цикла карточками 9 : 16, «№» — только порядок; купленный — отметка; цена k-й покупки цикла
   растёт линейно — одна строка над сеткой и на кнопке «Купить» в карточке; максимум доблести — 1. Будущий цикл — витрина с замком */
function rsGoldView() {
  const cur = rsCyc(), c = S.rs.gcyc || cur, open = c <= cur, k = rsBought(c) + 1;
  const cat = RS.heroes.filter(h => h.src === 'gold' && h.c === c).sort((a, b) => a.no - b.no);
  const list = cat.map(hcView).filter(v => v && hcPass(v, 'gold'));
  const opts = ROMAN.slice(1).map((r, i) => `<option value="${i + 1}" ${i + 1 === c ? 'selected' : ''}>Каталог цикла ${r}${i + 1 > cur ? ' · закрыт' : ''}</option>`).join('');
  const cards = list.map(v => hcCard(v, { act: 'gsel', val: v.rh ? v.rh.id : v.id, own: true, lock: !open, bm: false })).join('') || hcEmpty();
  return `<div class="hk-hire">
    <div class="hkh"><select class="rs-sel hk-cyc" data-a="gcyc" aria-label="Каталог героев за золото">${opts}</select><span class="chip" title="Нанято героев этого каталога">${k - 1} / ${cat.length}</span>
      <p class="rs-next">${open ? `Следующий найм — ${k}-й в цикле:${money('gold', rsGold(c, k))}` : `${ic('lock')}Каталог откроется в цикле ${ROMAN[c]}`}</p><span class="g-spacer"></span>${hcFBtn('gold', hcFN('gold'))}</div>
    <div class="hkg scroll" style="${hcGridVars()}" data-keep="gold:${c}">${cards}</div>
  </div>`;
}
/* одно действие карточки «до покупки» за золото: цена у кнопки «Купить» (покупка — ACT.gbuy в index.html, подтверждение с ценой
   следующей); не хватает — сколько; будущий цикл — витрина; купленный — к развитию. Формула цены — команде */
function hcGoldFoot(rh) {
  const c = rh.c, k = rsBought(c) + 1, price = rsGold(c, k), G = RS.rules.gold;
  if (rsHas(rh)) return `<span class="chip gold">${ic('check')}в коллекции</span><span class="g-spacer"></span><button class="btn go" data-a="dngo" data-v="${rh.id}">${ic('up')}К развитию</button>`;
  if (c > rsCyc()) return `<span class="chip warn">${ic('lock')}цикл ${ROMAN[c]}</span><span class="reason">Каталог откроется при переходе на цикл ${ROMAN[c]} — пока витрина</span>`;
  const lack = Math.max(0, price - S.wallet.gold);
  const team = TM(`${fmt(G.first)} × ${c} × (1 + ${pctBp(G.stepBp)} × (${k} − 1)) = ${fmt(price)}`, 'span', 'reason num');
  return `<div class="hcb-buy"><b>${k}-я покупка цикла ${ROMAN[c]}</b><span class="reason${lack ? ' warn' : ''}">${lack ? `Не хватает ${fmt(lack)} золота` : 'Придёт с 0 уровнем · следующая покупка дороже'}</span>${team}</div>
    <span class="g-spacer"></span><button class="btn go big hcb-cta" data-a="gbuy" data-v="${rh.id}"${lack ? ' disabled' : ''}>Купить${costTag('gold', price)}</button>`;
}
/* ================== «За Энериум»: витрина донатного сета ==================
   Слова автора 29.09.2026: «сделать интереснее и дорого-богато, это всё-таки окно для донатных игроков… чтобы игрок хотел купить
   героев». Дорого — это свет, материал и крупные формы, а не туча цифр: зал, пятеро Безликих в рамах на ступенях цены (ADR-0021:
   первый дешевле всех, пятый дороже всех — выше ступень, крупнее рама, ярче свет), сет-бонус одной строкой со ступенями (ADR-0022,
   §30), справа — выбранный герой и одна кнопка покупки. Сила донатного героя — в пользе для аккаунта, поэтому сет-бонус на виду.
   В цикле I витрина — обещание: сет цикла II виден, купить нельзя. Сеты будущих циклов — витрина до перехода (§33.1) */
const dnArt = p => DN_ART.ready.includes(p);
const dnSets = () => RS.sets.filter(s => s.kind === 'donat').sort((a, b) => a.cycle - b.cycle);
const dnOp = () => 'dn' + S.dn.seq;                 // номер следующей покупки: его несут кнопка и подтверждение
const dnPrice = h => rsDonatPrice(h);
const dnOpen = s => !!s && s.cycle <= rsCyc();
/* сет на витрине: выбранный, иначе сет текущего цикла, иначе последний открытый, иначе первый (в цикле I — первый) */
function dnSet() {
  const L = dnSets(), cur = rsCyc();
  return L.find(x => x.cycle === S.rs.dcyc) || L.find(x => x.cycle === cur) || L.filter(x => x.cycle <= cur).pop() || L[0] || null;
}
/* имя на табличке: первое слово имени, звание перед именем пропускается («Жрец Бранд» — «Бранд») */
const dnShort = n => String(n).split(/\s+/).find(w => !DN_VIEW.titles.includes(w)) || String(n);
/* эмблема сета: выгруженный рисунок или медальон с цифрой цикла */
function dnEmblem(s, px) {
  const p = DN_ART.emblem(s.key);
  return dnArt(p) ? `<img class="dn-em" src="${AV(p)}" width="${px}" height="${px}" alt="" loading="lazy" decoding="async">`
    : `<span class="dn-em dn-emf" style="--px:${px}px" aria-hidden="true">${ROMAN[s.cycle]}</span>`;
}
/* Безликий или Безликая — по полу героя (sex в roster.js); себя вспомнит на последней доблести */
const dnFaceless = h => h.sex === 'f' ? 'Безликая: лица нет — стёрлось. Себя она вспомнит на последней доблести.' : RS_FACELESS;
/* сет-бонус словами: N ступени — числом, «РБ» — полностью. Без N — общая формулировка */
const dnBonus = (s, n) => cap1(String(s.bonus || '').replace(/N-го/g, n != null ? `${fmt(n)}-го` : 'N-го').replace(/РБ/g, 'рунного босса'));
/* ступени сет-бонуса: сколько их — по сумме доблестей пятерых (ADR-0022, п. 6), условие ступени — §30 из данных: один или трое героев
   с доблестью от tierValor, последняя — все на личных максимумах. have — сколько героев сета уже подходят */
function dnTiers(s) {
  const R = RS.rules, hs = s.members.map(id => RSI[id]).filter(Boolean), val = h => S.rs.owned[h.id] ? S.rs.owned[h.id].valor : 0;
  const withV = hs.filter(h => rsHas(h) && val(h) >= R.tierValor).length, atMax = hs.filter(h => rsHas(h) && val(h) >= h.maxV).length;
  return Array.from({ length: rsTiers(s.sum) }, (_, i) => {
    const need = R.tierNeed[i], all = need == null, want = all ? hs.length : need, have = all ? atMax : withV;
    return { k: i + 1, need: want, all, have: Math.min(have, want), ok: have >= want, n: s.n && s.n[i] != null ? s.n[i] : null };
  });
}
/* песчинки над помостом: места и задержки — от номера, без случайности */
const dnMotes = (n, cls) => `<span class="${cls}" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="--x:${(i * 37 + 11) % 100}%;--d:${(i * 613) % 5000}ms;--s:${5200 + (i * 331) % 2600}ms"></i>`).join('')}</span>`;
/* рама героя: рисунок рамы, когда выгружен, иначе золото CSS с кристаллом в гребне */
function dnFrame(h, cls = '', extra = '') {
  const art = dnArt(DN_ART.frame);
  return `<span class="dn-fr${art ? ' art' : ''}${cls ? ' ' + cls : ''}" data-r="${h.r}"><span class="dn-ph">${rsFace(h)}</span>${art ? `<img class="dn-fi" src="${AV(DN_ART.frame)}" alt="">` : '<i class="dn-crest" aria-hidden="true"></i>'}${extra}</span>`;
}
/* герой на ступени: рама, имя, ступень с ценой; в коллекции — отметка вместо цены */
function dnNiche(h, s, sel, open) {
  const own = rsHas(h), p = dnPrice(h);
  const price = own ? `<span class="dn-pr own">${ic('check')}есть</span>` : `<span class="dn-pr"><img src="${curImg('enerium')}" alt=""><b class="num">${fmt(p)}</b></span>`;
  const say = `${h.n}, ${h.place}-й из ${s.members.length}${own ? ', в коллекции' : `, ${fmt(p)} Энериума`}`;
  return `<button class="dn-ni${h === sel ? ' sel' : ''}${own ? ' own' : ''}${open ? '' : ' shut'}" style="--k:${h.place}" data-a="dsel" data-v="${h.id}" aria-pressed="${h === sel}" aria-label="${hrEsc(say)}">
    ${dnFrame(h, '', own ? `<i class="dn-own" aria-hidden="true">${ic('check')}</i>` : '')}
    <span class="dn-nm">${hrEsc(dnShort(h.n))}</span>
    <span class="dn-pd">${price}</span>
  </button>`;
}
/* сет-бонус строкой: эмблема, эффект первой невзятой (или взятой) ступени, ступени значками; подробности — лист OV.hrset */
function dnBonusPlate(s) {
  const T = dnTiers(s), last = T.filter(t => t.ok).pop(), txt = dnBonus(s, (last || T[0] || {}).n);
  return `<button class="dn-bonus" data-a="sheet" data-v="hrset:${s.key}" aria-label="${hrEsc(`Сет-бонус «${s.name}»: ${txt}. Ступени — подробнее`)}">
    ${dnEmblem(s, 30)}<span class="dn-bt"><span class="eyebrow">Сет-бонус${T.length > 1 ? ' · по ступеням' : ''}</span><b>${txt}</b></span>
    <span class="dn-tp">${T.map(t => `<i class="${t.ok ? 'on' : ''}" title="Ступень ${ROMAN[t.k]}${t.ok ? ' — действует' : ''}">${ROMAN[t.k]}</i>`).join('')}</span>${ic('chev')}</button>`;
}
/* выбранный герой: кто он, что даёт, одно действие. Цена — на кнопке; не хватает Энериума — сказано сколько и где пополнить */
function dnCard(h, s, open) {
  const cur = rsCyc(), from = rsFrom('donat'), own = rsHas(h), p = dnPrice(h), lack = Math.max(0, p - S.wallet.enerium);
  let act;
  if (own) act = `<span class="chip gold">${ic('check')}в коллекции</span><button class="btn go" data-a="dngo" data-v="${h.id}">${ic('up')}К развитию</button>`;
  else if (cur < from) act = `<span class="chip warn">${ic('lock')}с цикла ${ROMAN[from]}</span><small class="reason">Цикл ${ROMAN[cur]} — обучение. Донатные сеты открываются с цикла ${ROMAN[from]}, первый — «${dnSets()[0].name}».</small>`;
  else if (!open) act = `<span class="chip warn">${ic('lock')}цикл ${ROMAN[s.cycle]}</span><small class="reason">Сет откроется при переходе на цикл ${ROMAN[s.cycle]}.</small>`;
  else act = `<button class="btn go big dn-cta" data-a="dbuy" data-v="${dnOp()}|${h.id}"${lack ? ' disabled' : ''}>Купить${costTag('enerium', p)}</button>
      ${lack ? `<span class="reason warn dn-lack">Не хватает ${fmt(lack)} Энериума <button class="link" data-a="go" data-v="store">Лавка ${ic('chev')}</button></span>` : `<small class="reason">${dnFaceless(h)}</small>`}`;
  return `<div class="dn-card" data-r="${h.r}">
    <span class="eyebrow">${h.place}-й из ${s.members.length} · ${h.cls}</span>
    <h2 class="dn-name">${hrEsc(h.n)}</h2>
    <div class="dn-tags">${rar(h.r)}<span class="stars" title="Доблесть до ${h.maxV}">${stars(0, h.maxV)}</span></div>
    ${foldLore(h.who)}
    <button class="link dn-more" data-a="rhero" data-v="${h.id}">Подробнее ${ic('chev')}</button>
    <div class="dn-act">${act}</div>
  </div>`;
}
/* витрина: слева — сет (имя, сеты циклов, пятеро на ступенях, сет-бонус), справа — выбранный герой */
function dnView() {
  const L = dnSets(), s = dnSet();
  if (!s) return '<div class="pnl pad rs-closed"><p class="faint">Донатных сетов нет в данных.</p></div>';
  const cur = rsCyc(), open = dnOpen(s), hs = s.members.map(id => RSI[id]).filter(Boolean);
  const sel = hs.find(h => h.id === S.rs.dsel) || hs.find(h => !rsHas(h)) || hs[0], own = hs.filter(rsHas).length;
  const hall = dnArt(DN_ART.hall);
  const tab = x => { const shut = x.cycle > cur; return `<button role="tab" class="dn-tab" aria-selected="${x === s}" data-a="dcyc" data-v="${x.cycle}" aria-label="${hrEsc(`Сет цикла ${ROMAN[x.cycle]} «${x.name}»${shut ? ', откроется при переходе' : ''}`)}" title="${hrEsc(`Цикл ${ROMAN[x.cycle]} · «${x.name}»`)}">${dnEmblem(x, 26)}${shut ? `<i class="dn-lk">${ic('lock')}</i>` : ''}</button>`; };
  const sub = open ? `Цикл ${ROMAN[s.cycle]} · в коллекции ${own} из ${hs.length}` : `Цикл ${ROMAN[s.cycle]} · витрина до перехода`;
  const G = DN_VIEW, vars = `--s0:${G.step[0]}px;--s1:${G.step[1]}px;--g0:${G.grow[0]};--g1:${G.grow[1]}`;
  return `<div class="dn${hall ? ' art' : ''}" style="${vars}">
    ${hall ? `<img class="dn-hall" src="${AV(DN_ART.hall)}" alt="">` : '<i class="dn-arch" aria-hidden="true"></i>'}
    <div class="dn-l">
      <div class="dn-top">
        <div class="dn-title">${dnEmblem(s, 40)}<span class="col"><h2>«${s.name}»</h2><small>${sub}</small></span></div>
        <div class="dn-tabs" role="tablist" aria-label="Донатные сеты по циклам">${L.map(tab).join('')}</div>
      </div>
      <div class="dn-alt" role="group" aria-label="${hrEsc(`Пятеро «${s.name}»: цена растёт от первого к пятому`)}">${dnMotes(G.motes, 'dn-mo')}${hs.map(h => dnNiche(h, s, sel, open)).join('')}</div>
      ${dnBonusPlate(s)}
    </div>
    ${dnCard(sel, s, open)}
  </div>`;
}

/* ================== «За души»: сцена алтаря ==================
   Слово автора 29.09.2026: «рулетка — это тоже для людей, которые донатят… красиво и дорого-богато». Сцена — одна рама: алтарь душ
   (RL_ART.altar или CSS), перед зеркалом — вход рулетки веером героев пула (rlCol), справа — два входа: отряд Эхо недели (окно-витрина
   OV.hrecho) и лавка праха (окно OV.dust). В лавке — только герои из rules.dustSrc (rsDustable): героев Эхо прахом не собрать, их
   осколки — сундуки Эхо, пробуждение — души */
const hrDustCat = () => RS.heroes.filter(h => rsDustable(h) && h.c <= rsCyc() && !rsHas(h));
/* арена цивилизации недели — рисунок Эхо (screens/echo.js отдаёт свои данные как EN_ECHO.data: ECH живёт внутри его обёртки);
   нет рисунка — пусто, фон рисует CSS */
function hrEchoArt(race) {
  const E = window.EN_ECHO && window.EN_ECHO.data, a = E && E.art && E.art[race];
  return a && a.arena ? AV(a.arena) : '';
}
const hrNeed = () => RS.rules.stub.shards;
/* герой, которого собирают из осколков, — осколок: стекло с его лицом, доля собранного — светом кромки и заживающими трещинами
   (shardGhost, screens/art-icons.js); собранный и пробуждённый — портрет: null, строка берёт портрет */
function hrGhost(h, px) {
  if (!h || rsHas(h) || typeof shardGhost !== 'function') return null;
  return shardGhost(h, S.rs.shards[h.id] || 0, hrNeed(), px) || null;
}
/* витрина отряда недели — выбранный герой одной строкой: имя, редкость и доблесть, осколки; одно действие — пробудить за души (комплект
   собран), к развитию (в коллекции) или карточка героя. Пробуждение — подтверждение в том же окне (duAsk), операция SOUL_SRV.wake */
function heSel(h) {
  if (!h) return '';
  const need = hrNeed(), n = S.rs.shards[h.id] || 0, own = rsHas(h), lock = h.c > rsCyc(), souls = RS.rules.stub.activateSouls, lack = Math.max(0, souls - S.wallet.souls);
  const sub = own ? 'в коллекции' : lock ? `откроется в цикле ${ROMAN[h.c]}` : n >= need ? `осколков ${fmt(n)} / ${fmt(need)} — можно пробудить` : `осколков ${fmt(n)} / ${fmt(need)}`;
  const act = own ? `<button class="btn go" data-a="dngo" data-v="${h.id}">${ic('up')}К развитию</button>`
    : n >= need && !lock ? `<button class="btn" data-a="rhero" data-v="${h.id}">Карточка</button><button class="btn go he-cta" data-a="activate" data-v="${duOp()}|${h.id}"${lack ? ` disabled title="Не хватает ${fmt(lack)} душ"` : ''}>Пробудить${costTag('souls', souls)}</button>`
    : `<button class="btn go" data-a="rhero" data-v="${h.id}">Карточка героя</button>`;
  return `<div class="he-sel" data-r="${h.r}"><span class="he-sn"><b>${hrEsc(h.n)}</b><small>${rar(h.r)}<span>доблесть до ${h.maxV} · ${sub}</span></small></span>${act}</div>`;
}
let heWas = false;   // витрина была открыта в прошлой отрисовке: при выборе героя она не всплывает заново
window.addEventListener('en-render', () => { heWas = !!(S.overlay && S.overlay.t === 'hrecho'); });
/* сцена «За души» — её зовёт rsSoulsView (index.html): алтарь, огоньки душ, вход рулетки и два входа справа */
function hrSoulsView() {
  const art = typeof RL_ART !== 'undefined' && RL_ART.ready.includes(RL_ART.altar);
  const scene = typeof rlScene === 'function' ? rlScene('hr-scn') : '', motes = typeof rlMotes === 'function' ? rlMotes(RL_VIEW.motes) : '';
  return `<div class="hr-souls${art ? ' art' : ''}">${scene}${motes}${typeof rlCol === 'function' ? rlCol() : ''}${hrSoulsSide()}</div>`;
}
/* справа в сцене — два входа. Отряд Эхо недели компактно: цивилизация и пять осколков по циклам II–VI (будущие — тусклые), фон — арена
   недели. Лавка праха: прах на руках, сколько героев в лавке и сколько можно пробудить, фон — лавка */
function hrSoulsSide() {
  const cur = rsCyc(), from = rsFrom('echo'), W = rsWeek(), squad = W ? W.squad.map(id => RSI[id]).filter(Boolean) : [];
  const cat = hrDustCat(), need = hrNeed(), ready = cat.filter(h => (S.rs.shards[h.id] || 0) >= need).length, dfrom = rsFrom('roulette');
  const bg = src => src ? `<img class="hr-ebg" src="${src}" alt="" loading="lazy" decoding="async">` : '';
  const eArt = W ? hrEchoArt(W.race) : '';
  const dArt = DU_ART.ready.includes(DU_ART.shop) ? AV(DU_ART.shop) : '';
  const face = h => { const on = h.c <= cur, g = hrGhost(h, DU_VIEW.side); return g ? `<span class="hr-sgf${on ? '' : ' off'}">${g}</span>` : `<span class="rs-av" data-r="${h.r}">${rsFace(h)}</span>`; };
  const echo = `<button class="hr-entry hr-echo" data-a="sheet" data-v="hrecho" aria-label="Эхо: отряд недели">${bg(eArt)}
      <span class="eyebrow">Эхо · отряд недели</span><b>${W && W.civ ? W.civ : 'Отряд недели'}</b>
      <span class="hr-ef">${squad.map(face).join('')}</span>
      <small>${cur < from ? `Откроется с цикла ${ROMAN[from]}` : 'Осколки — только в сундуках Эхо'}</small><span class="hr-go">${ic('chev')}</span></button>`;
  const dust = `<button class="hr-entry hr-dust" data-a="dlg" data-v="dust" aria-label="Лавка праха">${bg(dArt)}
      <span class="eyebrow">Лавка праха</span><b>${money('dust', S.wallet.dust)}</b>
      <small>${cat.length ? `${cat.length} ${plural(cat.length, 'герой', 'героя', 'героев')} · осколки за прах` : cur < dfrom ? `Откроется с цикла ${ROMAN[dfrom]}` : 'Все герои собраны'}</small>
      ${ready ? `<span class="chip spirit">${ic('check')}можно пробудить: ${ready}</span>` : ''}<span class="hr-go">${ic('chev')}</span></button>`;
  return `<div class="hr-side">${echo}${dust}</div>`;
}

/* ================== лавка праха: отдельное окно ==================
   Слова автора 29.09.2026: «магазин праха так же сделать можно отдельным окном». Витрина героев пула рулетки доступных циклов (§15.1):
   стекло осколка с лицом, имя, цена осколка (§15.3 × цикл героя) и доля собранного; сверху — циклы, когда их больше одного. Справа —
   выбранный: осколки за прах — 1, 10 или до комплекта — и, когда комплект собран, пробуждение за души с подтверждением в том же окне.
   Героев Эхо здесь нет, и сказано почему. Решает SOUL_SRV: операция с номером, повтор ничего не списывает и не выдаёт */
const duOp = () => 'du' + S.du.seq;   // номер следующей операции: его несут кнопки
const duCycs = () => [...new Set(hrDustCat().map(h => h.c))].sort((a, b) => b - a);
/* витрина: выбранный цикл или все; новые циклы первыми, внутри — редкость сверху вниз */
const duCat = () => hrDustCat().filter(h => !S.du.cyc || h.c === S.du.cyc).sort((a, b) => b.c - a.c || b.r - a.r || a.n.localeCompare(b.n, 'ru'));
/* выбранный: нажатый, иначе тот, кого можно пробудить, иначе с большей долей, иначе первый */
function duSel(cat) {
  const has = h => S.rs.shards[h.id] || 0, need = hrNeed();
  return cat.find(h => h.id === S.rs.ssel) || cat.find(h => has(h) >= need) || [...cat].sort((a, b) => has(b) - has(a))[0] || null;
}
/* сколько брать: 1, 10 или до комплекта — не больше, чем осталось до комплекта */
function duQty(h) {
  const left = Math.max(1, hrNeed() - (S.rs.shards[h.id] || 0)), q = S.du.q;
  return Math.min(left, q > 0 ? q : left);
}
/* карточка витрины: стекло с лицом, кристалл редкости, имя; цена осколка и доля собранного — два числа */
function duCard(h, sel) {
  const n = S.rs.shards[h.id] || 0, need = hrNeed(), p = rsShardPrice(h);
  const say = `${h.n}, ${RAR[h.r].toLowerCase()}, цикл ${ROMAN[h.c]}: осколков ${n} из ${need}, осколок — ${fmt(p)} праха`;
  return `<button class="du-c${sel ? ' sel' : ''}${n >= need ? ' full' : ''}" data-r="${h.r}" data-a="ssel" data-v="${h.id}" aria-pressed="${sel}" aria-label="${hrEsc(say)}">
    <i class="du-cr" aria-hidden="true"></i><span class="du-cs">${shardGhost(h, n, need, DU_VIEW.card[0])}</span>
    <span class="du-cn">${hrEsc(h.n)}</span>
    <span class="du-cm"><span class="du-cp"><img src="${curImg('dust')}" alt="">${fmt(p)}</span><span class="du-cq num">${fmt(n)}/${need}</span></span>
  </button>`;
}
/* выбранный герой: осколок крупно на свету, имя, редкость и класс, доля собранного; одно действие — осколки за прах или пробуждение */
function duPick(h) {
  const n = S.rs.shards[h.id] || 0, need = hrNeed(), full = n >= need, p = rsShardPrice(h), q = duQty(h), cost = p * q, souls = RS.rules.stub.activateSouls, op = duOp();
  const lackD = full ? 0 : Math.max(0, cost - S.wallet.dust), lackS = full ? Math.max(0, souls - S.wallet.souls) : 0;
  const qty = full ? '' : `<div class="qty du-qty" role="group" aria-label="Сколько осколков">${DU_VIEW.qty.map(k => `<button aria-pressed="${S.du.q === k}" data-a="duq" data-v="${k}">${k}</button>`).join('')}<button aria-pressed="${S.du.q === 0}" data-a="duq" data-v="0">до ${need}</button></div>`;
  const act = full
    ? `<button class="btn go big du-cta" data-a="activate" data-v="${op}|${h.id}"${lackS ? ' disabled' : ''}>Пробудить${costTag('souls', souls)}</button>`
    : `<button class="btn go du-cta" data-a="dustbuy" data-v="${op}|${h.id}|${q}"${lackD ? ' disabled' : ''}>Осколки ×${q}${costTag('dust', cost)}</button>`;
  const why = full ? (lackS ? `Не хватает ${fmt(lackS)} душ` : 'Комплект собран — героя пробуждают души')
    : lackD ? `Не хватает ${fmt(lackD)} праха` : `Осколок — ${fmt(p)} праха`;
  return `<div class="du-pick" data-r="${h.r}">
    <div class="du-ps">${shardGhost(h, n, need, DU_VIEW.pick[0])}</div>
    <div class="du-pn"><b class="serif">${hrEsc(h.n)}</b><button class="iconbtn" data-a="rhero" data-v="${h.id}" aria-label="Карточка героя" title="Карточка героя">${ic('chev')}</button></div>
    <div class="du-pt">${rar(h.r)}<span>${CLS(h.cl[0], 14)}${hrEsc(String(h.cls).split(' (')[0])}</span></div>
    <div class="du-pb">${bar(Math.min(100, hrFl(n * 100, need)), full ? 'sp' : '')}<small class="num">${fmt(n)} / ${need}</small></div>
    ${qty}
    <div class="du-pa">${act}<small class="reason${lackD || lackS ? ' warn' : ''}">${why}</small></div>
  </div>`;
}
/* подтверждение пробуждения в том же окне: кто, с чем приходит, куда уйдут лишние осколки, цена; кнопка несёт номер операции */
function duAsk() {
  const A = S.du.ask, h = A && RSI[A.id]; if (!h) return '';
  const need = hrNeed(), n = S.rs.shards[h.id] || 0, extra = Math.max(0, n - need);
  return `<button class="du-scrim" data-a="duno" aria-label="Отмена" tabindex="-1"></button>
    <section class="du-ask" role="dialog" aria-label="Пробудить героя">
      <h3>Пробудить героя</h3>
      <div class="du-ah">${shardGhost(h, n, need, DU_VIEW.ask)}<div class="col" style="gap:4px;min-width:0"><b class="serif">${hrEsc(h.n)}</b>${rar(h.r)}</div></div>
      <p>${hrEsc(h.n)} соберётся из ${need} осколков и придёт с 0 уровнем, 0 рунных пределов и 0 доблести.${extra ? ` Лишние осколки — ${extra} — уйдут в прах: +${fmt(extra * rsDustOf(h))}.` : ''}</p>
      ${TM('<p class="reason warn">Число осколков и цена в душах — заглушки: таблица не утверждена (§15.1).</p>')}
      <div class="du-af"><button class="btn ghost" data-a="duno">Отмена</button><button class="btn go" data-a="activatedo" data-v="${A.op}|${h.id}">Пробудить${costTag('souls', RS.rules.stub.activateSouls)}</button></div>
    </section>`;
}
let duWas = false;   // окно было открыто в прошлой отрисовке: при покупке оно не всплывает заново
window.addEventListener('en-render', () => { duWas = !!(S.overlay && S.overlay.t === 'dust'); });
/* пылинки праха в свете ламп: места и задержки — от номера, без случайности */
const duMotes = n => `<span class="du-mo" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="--x:${(i * 29 + 13) % 100}%;--d:${(i * 431) % 5200}ms;--s:${6200 + (i * 277) % 2600}ms"></i>`).join('')}</span>`;

/* ================== листы ================== */
Object.assign(OV, {
  /* выбор отряда для режима (§2.1, §17.2): пресеты библиотеки чипами, состав выбранного, одна строка о готовности.
     Выбор сохраняется сразу, у каждого режима свой; «Изменить» — библиотека с возвратом сюда */
  prep(o) {
    const mode = sqKey(o.arg), M = SQM[mode];
    if (M.teams) return sqLeagueSheet();
    const op = sqOp(), cur = sqFind(sqGet(mode)), s = cur || S.squads[0], r = sqReady(mode, s);
    const chips = S.squads.map(x => sqChip(x, !!cur && x.id === cur.id, `${op}|${mode}|${x.id}`, sqReady(mode, x))).join('');
    const body = `<p class="reason">${M.rule}</p><div class="row hr-chips">${chips}</div>${cur ? sqSlotsOf(mode, s) + sqInfo(mode, s, r) : '<p class="reason warn">Отряд ещё не выбран: нажмите отряд выше.</p>'}`;
    const main = mode === 'descent' ? `<button class="btn go" data-a="start" ${r.ok ? '' : 'disabled'}>${ic('down')}Начать забег</button>` : `<button class="btn go" data-a="close">Готово</button>`;
    return sheet(M.t, body, `<button class="link" data-a="sqedit" data-v="${mode}|${s.id}">${ic('users')}Изменить</button><button class="btn sm" data-a="sqnew" data-v="${op}|${mode}" ${S.squads.length >= SQ_DATA.max ? 'disabled' : ''}>${ic('plus')}Новый</button>${main}`, true);
  },
  /* имя отряда: поле и «Сохранить»; черновик имени переживает перерисовку */
  sqname(o) {
    const s = sqFind(o.arg); if (!s) return '';
    const v = S.sq.name && S.sq.name.id === s.id ? S.sq.name.v : s.name;
    return dialog('Имя отряда', `<label class="search hr-name"><input id="sqName" type="text" maxlength="${SQ_DATA.nameMax}" value="${hrEsc(v)}" autocomplete="off" spellcheck="false" aria-label="Имя отряда"></label><p class="reason">До ${SQ_DATA.nameMax} знаков. Имя видно только вам.</p>`,
      `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="sqrendo" data-v="${sqOp()}|${s.id}">Сохранить</button>`);
  },
  /* отряд Эхо недели — окно-витрина (слова автора 30.09.2026: «с отрядом недели тоже нужно сделать красивое окно, всё-таки этих героев
     будут хотеть все»): за окном — арена цивилизации недели; цивилизация, нашествие и неприязнь; пятеро по циклам II–VI крупными
     карточками 9 : 16 — несобранный чёрно-белый с полосой осколков, собранный комплект и пробуждённый — в цвете, будущий цикл — замок.
     Внизу — откуда осколки (только сундуки Эхо за места недели, прахом нельзя) и выбранный герой с одним действием: «Пробудить» за души —
     подтверждение в том же окне, операция SOUL_SRV с номером */
  hrecho() {
    const cur = rsCyc(), from = rsFrom('echo'), W = rsWeek(), squad = W ? W.squad.map(id => RSI[id]).filter(Boolean) : [], need = hrNeed();
    const has = h => S.rs.shards[h.id] || 0, open = h => h.c <= cur;
    const sel = squad.find(h => h.id === S.rs.ssel) || squad.find(h => open(h) && !rsHas(h) && has(h) >= need) || squad.find(h => open(h) && !rsHas(h)) || squad.find(open) || squad[0] || null;
    const to = squad.length ? squad[squad.length - 1].c : from, av = squad.find(h => h.avers && h.avers.race);
    const art = W ? hrEchoArt(W.race) : '';
    const card = h => { const own = rsHas(h), n = has(h); return hcCard(hcView(h), { act: 'ssel', val: h.id, gray: !own && n < need, shard: own ? null : [n, need], lock: !open(h), sel: h === sel, bm: false }); };
    const wsel = `<select class="rs-sel team-only" data-a="sweek" aria-label="Неделя расы, демо">${RS.weeks.map(w => `<option value="${w.race}" ${w === W ? 'selected' : ''}>Неделя ${w.gen}</option>`).join('')}</select>`;
    const src = cur < from ? `${ic('lock')}<span>Эхо откроется с цикла ${ROMAN[from]}.</span>`
      : `${ic('gem')}<span>Осколки героев Эхо — только из сундуков Эхо за места недели: прахом их не собрать. Собранного пробуждают души.</span><button class="link" data-a="go" data-v="echo">В Эхо ${ic('chev')}</button>`;
    return `<div class="ov he-ov${heWas ? ' still' : ''}" role="dialog" aria-modal="true" aria-label="Эхо: отряд недели"><button class="ov-scrim" data-a="close" aria-label="Закрыть" tabindex="-1"></button>
      <div class="he" style="--he-gap:${HC_VIEW.echo}px">${art ? `<img class="he-bg" src="${art}" alt="" decoding="async">` : '<i class="he-bg css" aria-hidden="true"></i>'}
        <div class="he-h"><div class="he-t"><span class="eyebrow">Эхо · отряд недели</span><h2>${W && W.civ ? W.civ : 'Отряд недели'}</h2><small>${W && W.raid ? `нашествие «${W.raid}» · ` : ''}по герою за цикл, ${ROMAN[from]}–${ROMAN[to]}</small></div>
          ${av ? `<span class="chip he-av" title="Неприязнь героев Эхо — особенность, не способность: действует везде, где встречаются враги этой расы">${ic('target')}${rsAversShort(av)}</span>` : ''}<span class="g-spacer"></span>${wsel}<button class="iconbtn x" data-a="close" aria-label="Закрыть">${ic('x')}</button></div>
        <div class="he-row"><div class="he-cards" role="group" aria-label="Пятеро недели">${squad.map(card).join('')}</div></div>
        <div class="he-f"><p class="he-src">${src}</p>${heSel(sel)}</div>
        ${S.du.ask ? duAsk() : ''}
      </div></div>`;
  },
  /* большая карточка героя состава поверх любого экрана — «до покупки» или с прогрессом купленного: из рулетки, лавки праха, запасов,
     мастерской, Эхо и витрины отряда недели. Окно встаёт на место рабочей области; «Назад» возвращает в окно, из которого открыли (back) */
  rhero(o) {
    const rh = RSI[o.arg]; if (!rh) return '';
    const back = o.back ? `data-a="dlg" data-v="${hrEsc(o.back)}"` : 'data-a="close"';
    return `<div class="ov hc-ov" role="dialog" aria-modal="true" aria-label="${hrEsc(rh.n)}"><button class="ov-scrim" ${back} aria-label="Закрыть" tabindex="-1"></button>
      <div class="hc-win">${hcPre(rh, { back, foot: hcGetFoot(rh) })}</div></div>`;
  },
  /* портрет крупно — по нажатию на портрет большой карточки: рисунок целиком в раме своей ступени; закрытие возвращает прежнее окно */
  hczoom(o) {
    const x = H(o.arg) || RSI[o.arg], v = x && hcView(x); if (!v) return '';
    const t = hcTier(v);
    return `<div class="ov hcz-ov" role="dialog" aria-modal="true" aria-label="${hrEsc(v.n)} — портрет"><button class="ov-scrim" data-a="hczx" aria-label="Закрыть" tabindex="-1"></button>
      <figure class="hcz" data-r="${v.r}" data-t="${t}"><span class="hcz-ph">${hcFace(v)}</span>${hcFr(t)}${t >= HC_VIEW.tier.top ? hcMotes() : ''}<i class="hk-cr" aria-hidden="true"></i>
        <figcaption><b>${hrEsc(v.n)}</b>${rar(v.r)}${hcStars(v.valor, v.maxV)}</figcaption></figure>
      <button class="iconbtn x hcz-x" data-a="hczx" aria-label="Закрыть">${ic('x')}</button></div>`;
  },
  /* фильтр сетки значками: класс, стихия, редкость, цикл, в каталоге — источник; нажатие — выбрать или снять; сколько героев подходит */
  hcflt(o) {
    const kind = HC_FK[o.arg] ? o.arg : 'own', f = S.hf, keys = HC_FK[kind];
    const b = (k, val, lbl, ico) => { const on = f[k] === val; return `<button class="hkf-b${on ? ' on' : ''}" data-a="hcf" data-v="${k}:${val}" aria-pressed="${on}" title="${hrEsc(lbl)}">${ico}<span>${hrEsc(lbl)}</span></button>`; };
    const grp = (k, t, items) => keys.includes(k) ? `<div class="hkf-g"><span class="eyebrow">${t}</span><div class="hkf-r">${items.join('')}</div></div>` : '';
    const n = kind === 'all' ? hcCatList().length : kind === 'gold' ? RS.heroes.filter(h => h.src === 'gold' && h.c === (S.rs.gcyc || rsCyc())).map(hcView).filter(v => v && hcPass(v, 'gold')).length : hcOwnList().length;
    const body = grp('cls', 'Класс', RS.classes.map(k => b('cls', k, cap1(k), CLS(k, 20, ''))))
      + grp('el', 'Стихия', (RS.schools || []).map(e => b('el', e, cap1(e), el(e, true))))
      + grp('r', 'Редкость', RAR.slice(1).map((t, i) => b('r', i + 1, t, `<i class="hkf-cr" data-r="${i + 1}" aria-hidden="true"></i>`)))
      + grp('c', 'Цикл', ROMAN.slice(1).map((r, i) => b('c', i + 1, 'Цикл ' + r, '')))
      + grp('src', 'Откуда', RS.sources.map(k => b('src', k, RS_SRC_ONE[k], '')))
      + `<p class="reason">Подходит героев: <b class="num">${n}</b></p>`;
    return sheet('Фильтр', body, `<button class="btn ghost" data-a="hcclr">Сбросить</button><button class="btn go" data-a="close">Готово</button>`, true);
  },
  /* лавка праха — отдельное окно (§15.1–§15.3): лавка-реликварий за стеклом витрины (DU_ART или CSS), прах на руках, витрина героев
     доступных циклов, выбранный — справа. Героев Эхо здесь нет — и сказано почему, со ссылкой на отряд недели */
  dust() {
    const cur = rsCyc(), from = rsFrom('roulette'), all = hrDustCat(), cyc = duCycs(), V = DU_VIEW;
    if (S.du.cyc && !cyc.includes(S.du.cyc)) S.du.cyc = 0;   // цикла больше нет в витрине (демо-переключатель цикла) — все
    const cat = duCat(), h = duSel(cat), art = DU_ART.ready.includes(DU_ART.shop);
    const vars = `--du-c:${V.card[0]}px;--du-c2:${V.card[1]}px;--du-p:${V.pick[0]}px;--du-p2:${V.pick[1]}px`;
    const tabs = cyc.length > 1 ? `<div class="tabs du-cyc" role="tablist" aria-label="Циклы">${[0].concat(cyc).map(c => `<button role="tab" aria-selected="${S.du.cyc === c}" data-a="ducyc" data-v="${c}">${c ? 'Цикл ' + ROMAN[c] : 'Все'}</button>`).join('')}</div>` : '';
    const empty = cur < from ? `Лавка откроется с цикла ${ROMAN[from]}: в ней — герои Возрождения душ.` : all.length ? '' : 'Все герои доступных циклов собраны.';
    const shelf = empty ? `<div class="du-empty"><p>${empty}</p></div>` : `<div class="du-grid scroll" data-keep="dugrid:${S.du.cyc}">${cat.map(x => duCard(x, x === h)).join('')}</div>`;
    return `<div class="ov du-ov${duWas ? ' still' : ''}" role="dialog" aria-modal="true" aria-label="Лавка праха"><button class="ov-scrim" data-a="close" aria-label="Закрыть" tabindex="-1"></button>
      <div class="du${art ? ' art' : ''}" style="${vars}">${art ? `<img class="du-scn" src="${AV(DU_ART.shop)}" alt="" decoding="async">` : '<i class="du-scn css" aria-hidden="true"></i>'}${duMotes(V.motes)}
        <div class="du-h"><div class="du-t"><span class="eyebrow">Возрождение душ</span><h2>Лавка праха</h2></div>
          <span class="du-bal" title="Прах душ — из повторных осколков героев, которые уже в коллекции">${money('dust', S.wallet.dust)}</span>
          <button class="iconbtn x" data-a="close" aria-label="Закрыть">${ic('x')}</button></div>
        <div class="du-b${h && !empty ? '' : ' one'}"><div class="du-shelf">${tabs}${shelf}</div>${h && !empty ? duPick(h) : ''}</div>
        <p class="du-echo">${ic('lock')}<span>Героев Эхо здесь нет: их осколки — только из сундуков Эхо за места.</span><button class="link" data-a="sheet" data-v="hrecho">Отряд недели ${ic('chev')}</button></p>
        ${S.du.ask ? duAsk() : ''}
      </div></div>`;
  },
  /* пробуждение душами: стекло горит, трещины заживают, вспышка — герой выходит из стекла в раме, имя. Время сцены — от операции
     (S.du.got.at): перерисовка продолжает с того же места; нажатие — сразу итог; «меньше движения» — сразу итог (общее правило) */
  hrwake(o) {
    const R = S.du.ops[o.arg], h = R && R.kind === 'wake' && RSI[R.id]; if (!h) return '';
    const G = DU_VIEW.wake, at = S.du.got && S.du.got.op === R.op ? S.du.got.at : 0, need = hrNeed();
    const t = at ? Math.max(0, Math.min(G.end, Date.now() - at)) : G.end, done = t >= G.end;
    const vars = `--t0:-${t}ms;` + Object.entries(G).map(([k, v]) => `--w-${k}:${v}ms`).join(';') + (typeof rlFrVars === 'function' ? ';' + rlFrVars() : '');
    const back = o.back === 'dust' ? '<button class="btn" data-a="dlg" data-v="dust">В лавку</button>' : o.back === 'hrecho' ? '<button class="btn" data-a="dlg" data-v="hrecho">К отряду недели</button>' : '';
    const woke = h.sex === 'f' ? 'пробуждена' : 'пробуждён';
    return `<div class="ov hr-wake${done ? ' done' : ''}" role="dialog" aria-modal="true" aria-label="${hrEsc(h.n)} — ${woke}" style="${vars}">
      <button class="ov-scrim" data-a="${done ? 'close' : 'hrwskip'}" aria-label="${done ? 'Закрыть' : 'Показать сразу'}" tabindex="-1"></button>
      <div class="hw-s" data-a="${done ? 'noop' : 'hrwskip'}">
        <i class="hw-pillar" aria-hidden="true"></i><i class="hw-ring" aria-hidden="true"></i>${typeof rlMotes === 'function' ? rlMotes(RL_VIEW.motes) : ''}
        <div class="hw-stage"><span class="hw-glass">${shardGhost(h, need, need, DU_VIEW.glass)}</span><span class="hw-hero" data-r="${h.r}"><span class="rl-face">${rsFace(h)}</span>${typeof rlFr === 'function' ? rlFr() : ''}</span></div>
        <div class="hw-say"><span class="eyebrow">${cap1(woke)} душами</span><h2>${hrEsc(h.n)}</h2><p>${rar(h.r)}<span>${hrEsc(h.cls)}</span></p>
          <small class="faint">В коллекции · 0 ур. · доблесть до ${h.maxV}${R.dust ? ` · лишние осколки — в прах: +${fmt(R.dust)}` : ''}</small></div>
      </div>
      <div class="hw-acts">${back || '<button class="btn" data-a="close">Закрыть</button>'}<button class="btn go" data-a="dngo" data-v="${h.id}">${ic('up')}К развитию</button></div>
      <button class="iconbtn x hw-x" data-a="close" aria-label="Закрыть">${ic('x')}</button>
    </div>`;
  },
  /* сет-бонус донатного сета — ступени наглядно (ADR-0022, §30): на каждой ступени — условие фишками героев и эффект; горит взятая.
     Ниже — пятеро сета: в коллекции отмечены, нажатие — герой в витрине */
  hrset(o) {
    const s = RSS[o.arg]; if (!s) return '';
    const T = dnTiers(s), hs = s.members.map(id => RSI[id]).filter(Boolean), own = hs.filter(rsHas).length;
    const pips = t => Array.from({ length: hs.length }, (_, i) => `<i class="${i < t.have ? 'on' : i < t.need ? 'need' : ''}"></i>`).join('');
    const steps = T.map(t => `<div class="dn-st${t.ok ? ' on' : ''}" style="--i:${t.k}">
        <span class="dn-stk">${ROMAN[t.k]}</span>
        <b class="dn-stn">${dnBonus(s, t.n)}</b>
        <span class="dn-cond"><span class="dn-pips" title="${hrEsc(`Подходят ${t.have} из ${t.need}`)}">${pips(t)}</span><small>${t.all ? `все ${hs.length} на максимуме доблести` : `${t.need} ${plural(t.need, 'герой', 'героя', 'героев')} сета с доблестью`}</small>${t.ok ? `<span class="chip spirit">${ic('check')}действует</span>` : ''}</span>
      </div>`).join('');
    const mem = hs.map(h => `<button class="dn-mf${rsHas(h) ? ' own' : ''}" data-a="dsel" data-v="${h.id}" aria-label="${hrEsc(h.n + (rsHas(h) ? ', в коллекции' : ''))}" title="${hrEsc(h.n)}"><span class="rs-av" data-r="${h.r}">${rsFace(h)}</span>${rsHas(h) ? `<i>${ic('check')}</i>` : ''}<small>${hrEsc(dnShort(h.n))}</small></button>`).join('');
    const by = [...RS.rules.tierBySum].sort((a, b) => a[0] - b[0]);
    const sums = by.map(([lo, n], i) => `${by[i + 1] ? `${lo}–${by[i + 1][0] - 1}` : `${lo} и больше`} — ${DN_VIEW.ring[n] || n}`).join(', ');
    const body = `<div class="dn-sh">${dnEmblem(s, 52)}<span class="col"><b class="serif">«${s.name}»</b><small class="faint">донатный сет цикла ${ROMAN[s.cycle]} · в коллекции ${own} из ${hs.length}</small></span></div>
      <div class="dn-steps">${steps}</div>
      <span class="eyebrow">Пятеро сета</span><div class="dn-mems">${mem}</div>
      <p class="reason">Ступеней у сета столько, сколько даёт сумма доблестей пятерых: ${sums}. У «${s.name}» сумма ${s.sum}.</p>`;
    return sheet('Сет-бонус', body, '', true);
  },
  /* подтверждение покупки: кто, что приходит, цена и сколько Энериума останется. Кнопка несёт номер операции */
  dnbuy(o) {
    const [op, id] = String(o.arg || '').split('|'), h = RSI[id]; if (!h || !RSS[h.dset]) return '';
    const s = RSS[h.dset], p = dnPrice(h), left = S.wallet.enerium - p;
    const body = `<div class="dn-cf">${dnFrame(h, 'sm')}<div class="col" style="gap:4px;min-width:0"><b class="serif dn-cfn">${hrEsc(h.n)}</b><small class="faint">${h.place}-й из «${s.name}» · ${h.cls}</small>${rar(h.r)}</div></div>
      <ul class="dn-get">
        <li>${ic('check')}Вневременная редкость, доблесть до ${h.maxV}</li>
        <li>${ic('check')}Приходит с 0 уровнем, 0 рунных пределов и 0 доблести</li>
        <li>${ic('check')}Сет «${s.name}»: сет-бонус растёт с доблестью его героев</li>
      </ul>
      <p class="reason">${left >= 0 ? `После покупки останется ${fmt(left)} Энериума.` : `Не хватает ${fmt(-left)} Энериума.`}</p>
      ${TM(`<p class="reason warn">Цена — заглушка прототипа: цен героев за Энериум в источниках нет. Операция ${op}: повтор ничего не спишет.</p>`)}`;
    return dialog('Купить героя', body, `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="dbuydo" data-v="${op}|${h.id}"${left < 0 ? ' disabled' : ''}>Купить${costTag('enerium', p)}</button>`, 'dn-dlg');
  },
  /* получение героя: трещина света, столп, рама проступает из песка времени, вспышка, имя. Время сцены — от покупки (S.dn.got.at):
     перерисовка продолжает с того же места; нажатие — сразу итог; при «меньше движения» — сразу итог (общее правило index.html) */
  hrgot(o) {
    const R = S.dn.ops[o.arg], h = R && RSI[R.id]; if (!h) return '';
    const s = RSS[h.dset], G = DN_VIEW.got, at = S.dn.got && S.dn.got.op === R.op ? S.dn.got.at : 0;
    const t = at ? Math.max(0, Math.min(G.end, Date.now() - at)) : G.end, done = t >= G.end;
    const vars = `--t0:-${t}ms;` + Object.entries(G).map(([k, v]) => `--g-${k}:${v}ms`).join(';');
    return `<div class="ov dn-got${done ? ' done' : ''}" role="dialog" aria-modal="true" aria-label="${hrEsc(`${h.n} — в коллекции`)}" style="${vars}">
      <button class="ov-scrim" data-a="${done ? 'close' : 'dnskip'}" aria-label="${done ? 'Закрыть' : 'Показать сразу'}" tabindex="-1"></button>
      <div class="dn-gs" data-a="${done ? 'noop' : 'dnskip'}">
        <i class="dn-gcrack" aria-hidden="true"></i><i class="dn-gpillar" aria-hidden="true"></i><i class="dn-gring" aria-hidden="true"></i>
        ${dnMotes(DN_VIEW.motes + DN_VIEW.motes, 'dn-gmo')}
        <div class="dn-ghero">${dnFrame(h, 'big')}</div>
        <div class="dn-gsay">
          <span class="dn-gset">${dnEmblem(s, 26)}«${s.name}» · ${h.place}-й из ${s.members.length}</span>
          <h2>${hrEsc(h.n)}</h2>
          <p>${dnFaceless(h)}</p>
          <small class="faint">В коллекции · ${h.cls} · доблесть до ${h.maxV}</small>
        </div>
      </div>
      <div class="dn-gacts"><button class="btn" data-a="close">В витрину</button><button class="btn go" data-a="dngo" data-v="${h.id}">${ic('up')}К развитию</button></div>
      <button class="iconbtn x dn-gx" data-a="close" aria-label="Закрыть">${ic('x')}</button>
    </div>`;
  },
});

/* ================== «сервер» покупки за Энериум ==================
   Покупка донатного героя — операция с номером (§34, §36): проверка, расход и выдача — одним вызовом. Повтор того же номера
   возвращает прежний ответ и ничего не списывает и не выдаёт; отказ номер не тратит. В игре цену, выдачу и номер подтверждает сервер */
const DN_WHY = {
  none: () => 'Такого героя нет в витрине',
  own: h => `${h.n} уже в коллекции`,
  shut: h => `Сет «${RSS[h.dset].name}» откроется в цикле ${ROMAN[RSS[h.dset].cycle]}`,
  enerium: h => `Не хватает Энериума: нужно ${fmt(dnPrice(h))}, есть ${fmt(S.wallet.enerium)}`,
  op: () => 'Действие устарело',
};
function dnWhy(h) {
  if (!h || h.src !== 'donat' || !RSS[h.dset]) return 'none';
  if (rsHas(h)) return 'own';
  if (!dnOpen(RSS[h.dset])) return 'shut';
  if (S.wallet.enerium < dnPrice(h)) return 'enerium';
  return '';
}
const DN_SRV = {
  buy(op, id) {
    const O = S.dn.ops;
    if (!op) return { refuse: 'op' };
    if (O[op]) return { again: true, res: O[op] };
    const h = RSI[id], why = dnWhy(h);
    if (why) return { refuse: why, id };
    const cost = dnPrice(h);
    S.wallet.enerium -= cost; rsAdd(h, 'donat');   // ADR-0019: герой приходит с 0 ур., 0 РП и 0 Добл
    const res = { op, id: h.id, cost, set: h.dset, place: h.place };
    O[op] = res; S.dn.seq++;
    return { res };
  },
};
const dnSay = r => toast(DN_WHY[r.refuse] ? DN_WHY[r.refuse](RSI[r.id]) : 'Не вышло');

/* ================== «сервер» лавки праха и пробуждения ==================
   Осколки за прах (§15.1, §15.3) и пробуждение душами (§15.2) — операции с номером (§34, §36): проверка, расход и выдача — одним
   вызовом. Повтор того же номера возвращает прежний ответ и ничего не списывает и не выдаёт; отказ номер не тратит. Героев Эхо прахом
   не собрать — правило данных rules.dustSrc (rsDustable). В игре цену, выдачу и номер подтверждает сервер */
const SOUL_WHY = {
  none: () => 'Такого героя нет в лавке',
  echo: () => RS_NODUST,
  own: h => `${h.n} уже в коллекции`,
  cyc: h => `${h.n} откроется в цикле ${ROMAN[h.c]}`,
  full: h => `Осколков ${h.n} хватает — пробудите героя`,
  qty: () => 'Столько осколков не купить',
  dust: (h, r) => `Не хватает праха: нужно ${fmt(r.cost)}, есть ${fmt(S.wallet.dust)}`,
  shards: h => `Осколков ${h.n} пока не хватает на пробуждение`,
  souls: (h, r) => `Не хватает душ: нужно ${fmt(r.cost)}, есть ${fmt(S.wallet.souls)}`,
  op: () => 'Действие устарело',
};
const SOUL_SRV = {
  /* q осколков героя за прах: цена — rsShardPrice × q; не больше, чем осталось до комплекта */
  buy(op, id, q) {
    const O = S.du.ops;
    if (!op) return { refuse: 'op' };
    if (O[op]) return { again: true, res: O[op] };
    const h = RSI[id];
    if (!h) return { refuse: 'none', id };
    if (!rsDustable(h)) return { refuse: 'echo', id };
    if (rsHas(h)) return { refuse: 'own', id };
    if (h.c > rsCyc()) return { refuse: 'cyc', id };
    const need = hrNeed(), have = S.rs.shards[id] || 0;
    if (have >= need) return { refuse: 'full', id };
    if (!Number.isInteger(q) || q < 1 || q > need - have) return { refuse: 'qty', id };
    const cost = rsShardPrice(h) * q;
    if (S.wallet.dust < cost) return { refuse: 'dust', id, cost };
    S.wallet.dust -= cost; S.rs.shards[id] = have + q;
    const res = { op, kind: 'buy', id, q, cost };
    O[op] = res; S.du.seq++;
    return { res };
  },
  /* пробуждение: комплект осколков и души; герой приходит с 0 ур., 0 РП и 0 Добл (ADR-0019), остаток осколков — в прах (§15.2) */
  wake(op, id) {
    const O = S.du.ops;
    if (!op) return { refuse: 'op' };
    if (O[op]) return { again: true, res: O[op] };
    const h = RSI[id], need = hrNeed(), cost = RS.rules.stub.activateSouls;
    if (!h) return { refuse: 'none', id };
    if (rsHas(h)) return { refuse: 'own', id };
    const have = S.rs.shards[id] || 0;
    if (have < need) return { refuse: 'shards', id };
    if (S.wallet.souls < cost) return { refuse: 'souls', id, cost };
    const dust = (have - need) * rsDustOf(h);
    S.wallet.souls -= cost; delete S.rs.shards[id]; S.wallet.dust += dust; rsAdd(h, 'souls');
    const res = { op, kind: 'wake', id, cost, dust };
    O[op] = res; S.du.seq++;
    return { res };
  },
};
const duSay = r => toast(SOUL_WHY[r.refuse] ? SOUL_WHY[r.refuse](RSI[r.id] || {}, r) : 'Не вышло');

/* ================== действия ================== */
const sqParse = v => String(v || '').split('|');
/* куда вернуться из библиотеки: маршрут, поверх которого открыт лист режима */
const sqBackOf = () => (S.overlay && S.overlay.back) || S.route;
Object.assign(ACT, {
  /* библиотека: выбор пресета — вид, не операция */
  sq(v) { if (!sqFind(v)) return; S.selSquad = v; S.sq.slot = -1; render(); },
  /* новый отряд: номер операции на кнопке; из листа режима — библиотека с возвратом. Сразу — окно имени */
  sqnew(v) {
    const [op, mode] = sqParse(v), r = SQ_SRV.create(op);
    if (r.refuse) return sqSay(r);
    const id = r.res.id;
    if (mode && SQM[mode]) S.sq.from = { mode, back: sqBackOf() };
    S.selSquad = id; S.sq.slot = -1; S.sq.name = null; S.seg.heroes = 'squads'; S.route = 'heroes';
    open('sqname', id); sqFocusName();
  },
  sqrendo(v) {
    const [op, id] = sqParse(v), inp = document.getElementById('sqName');
    const r = SQ_SRV.rename(op, id, inp ? inp.value : S.sq.name && S.sq.name.id === id ? S.sq.name.v : '');
    if (r.refuse) return sqSay(r);
    S.sq.name = null; S.overlay = null;
    if (r.again) return render();
    toast(`Отряд «${hrEsc(r.res.name)}»`);
  },
  sqdel(v) {
    const s = sqFind(v); if (!s) return;
    if (S.squads.length <= 1) return toast(SQ_WHY.last);
    const used = sqUsed(v);
    S.overlay = { t: 'confirm', title: 'Удалить отряд', text: `«${hrEsc(s.name)}» пропадёт из библиотеки. Герои останутся в коллекции.`, warn: used.length ? `Выбран для: ${used.join(', ')}. Там его заменит «${hrEsc((S.squads.find(x => x !== s) || s).name)}» или режим попросит выбрать заново.` : '', ok: 'Удалить', act: 'sqdeldo', v: `${sqOp()}|${v}`, danger: true };
    render(); focusOverlay();
  },
  sqdeldo(v) {
    const [op, id] = sqParse(v), r = SQ_SRV.remove(op, id);
    S.overlay = null;
    if (r.refuse) return sqSay(r);
    if (r.again) return render();
    S.sq.slot = -1; toast(`Отряд «${hrEsc(r.res.name)}» удалён`);
  },
  /* место в отряде: первое нажатие выбирает, второе на другом месте — меняет местами (операция с номером) */
  sqslot(v) {
    const [op, a] = sqParse(v), i = +a, s = sq(S.selSquad), j = S.sq.slot;
    if (!(i >= 0 && i < SQ_DATA.size)) return;
    if (j < 0 || j === i || (!s.m[i] && !s.m[j])) { S.sq.slot = j === i ? -1 : i; return render(); }
    const r = SQ_SRV.swap(op, s.id, j, i);
    S.sq.slot = -1; sqSay(r); render();
  },
  /* герой в отряд: в выбранное место или в первое свободное; отряд полон и место не выбрано — просьба выбрать */
  sqput(v) {
    const [op, id, hid] = sqParse(v), s = sqFind(id); if (!s) return;
    const i = S.sq.slot >= 0 ? S.sq.slot : s.m.indexOf(null);
    if (i < 0) return toast('В отряде уже пятеро: нажмите, кого заменить');
    const r = SQ_SRV.put(op, id, i, hid);
    S.sq.slot = -1; sqSay(r); render();
  },
  sqrem(v) { const [op, id, i] = sqParse(v), r = SQ_SRV.take(op, id, +i); S.sq.slot = -1; sqSay(r); render(); },
  sqmv(v) {
    const [op, id, a, d] = sqParse(v), i = +a, j = i + (+d), r = SQ_SRV.swap(op, id, i, j);
    if (r.res && !r.again) S.sq.slot = j;
    sqSay(r); render();
  },
  /* выбор отряда режима: «номер|режим|отряд|раунд». Из библиотеки — выбрать и вернуться в режим */
  sqpick(v) {
    const [op, mode, id, i] = sqParse(v), r = SQ_SRV.pick(op, mode, id, i);
    if (r.refuse) return sqSay(r);
    const M = SQM[sqKey(mode)];
    if (M.teams && r.res && !r.again) { const sel = sqGet('league'), nx = sel.findIndex(x => !x); S.sq.round = nx >= 0 ? nx : +i || 0; }
    if (S.sq.from && S.route === 'heroes' && S.seg.heroes === 'squads') return ACT.sqback();
    render();
  },
  sqround(v) { S.sq.round = Math.max(0, Math.min(SQM.league.teams - 1, +v || 0)); render(); },
  /* «Изменить» в листе режима: библиотека с этим отрядом и возвратом в режим */
  sqedit(v) {
    const [mode, id] = sqParse(v);
    S.sq.from = { mode: sqKey(mode), back: sqBackOf() };
    if (sqFind(id)) S.selSquad = id;
    S.sq.slot = -1; S.seg.heroes = 'squads'; go('heroes');
  },
  sqback() {
    const F = S.sq.from; S.sq.from = null;
    if (!F) return render();
    S.route = F.back || 'heroes';
    open('prep', F.mode, { back: S.route });
  },
  /* лист выбора с экрана режима: data-a="sqmode" data-v="режим" */
  sqmode(v) { SQ.pick(v); },
  /* «Изменить отряд» из подтверждения Эхо (screens/echo.js) — тот же лист */
  echoprep() { S.overlay = null; SQ.pick('echo'); },
});
/* «За Энериум»: выбор сета и героя — вид; покупка — подтверждение и операция DN_SRV; после неё — окно получения героя */
Object.assign(ACT, {
  /* сет цикла: номер цикла — на кнопке сета (у прежнего выпадающего списка — в value) */
  dcyc(v, t) { S.rs.dcyc = +(v || (t && t.value) || 0); S.rs.dsel = ''; render(); },
  /* герой витрины; из листа сет-бонуса — выбрать и вернуться к витрине */
  dsel(v) { if (!RSI[v]) return; S.rs.dsel = v; if (S.overlay && S.overlay.t === 'hrset') S.overlay = null; render(); },
  /* «Купить»: «номер|герой» (старый вызов — просто герой: номер — следующий). Отказ — сразу словами, иначе — подтверждение */
  dbuy(v) {
    const [a, b] = sqParse(v), id = b != null ? b : a, op = b != null ? a : dnOp(), why = dnWhy(RSI[id]);
    if (why) return dnSay({ refuse: why, id });
    S.overlay = { t: 'dnbuy', arg: `${op}|${id}` }; render(); focusOverlay();
  },
  dbuydo(v) {
    const [op, id] = sqParse(v), r = DN_SRV.buy(op, id);
    if (r.refuse) { S.overlay = null; dnSay(r); return; }
    if (r.again) { S.overlay = null; render(); return; }   // повтор той же покупки: ничего не списано и не выдано
    S.rs.dsel = r.res.id; S.dn.got = { op: r.res.op, at: Date.now() };
    S.overlay = { t: 'hrgot', arg: r.res.op }; render(); focusOverlay();
  },
  /* окно получения: нажатие — сразу итог */
  dnskip() { if (S.dn.got) S.dn.got.at = Date.now() - DN_VIEW.got.end; render(); focusOverlay(); },
  /* «К развитию»: большая карточка героя аккаунта, вкладка «Развитие»; «Назад» — к сетке «Мои» */
  dngo(v) {
    const h = RSI[v]; if (!h) return;
    const acc = rsOld(h) || H(h.id);
    S.overlay = null; S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.hgrid = 'own'; S.selHero = acc ? acc.id : v; S.seg.hero = 'power';
    render();
  },
});
/* коллекция и большая карточка: вид — сетка, карточка, крупный портрет, порядок и фильтр; ничего не списывают и не выдают */
const HC_ZERO = { cls: '', el: '', r: 0, c: 0, src: '' };
const hcRsGo0 = ACT.rsgo;
Object.assign(ACT, {
  /* нажатие на арт: герой аккаунта — большая карточка с развитием, герой состава — карточка «до покупки»; сетка запоминается для «Назад» */
  hc(v) {
    const acc = H(v); S.hgrid = S.hview === 'all' ? 'all' : 'own'; S.seg.heroes = 'coll';
    if (acc) { S.selHero = acc.id; S.hview = 'mine'; }
    else if (RSI[v]) { S.rs.sel = v; S.rs.val = null; S.hview = 'rs'; S.seg.rhero = 'who'; }
    else return;
    render();
  },
  hcback() { S.hview = S.hgrid === 'all' ? 'all' : 'own'; render(); },
  /* ‹ › в большой карточке — соседний герой той же сетки, с тем же порядком и фильтром */
  hcstep(v) {
    const list = hcOwnList(); if (!list.length) return;
    const i = list.findIndex(x => x.id === S.selHero), d = +v < 0 ? -1 : 1, n = list.length;
    S.selHero = list[i < 0 ? 0 : ((i + d) % n + n) % n].id; S.hview = 'mine'; render();
  },
  /* портрет крупно поверх; закрытие возвращает окно, из которого открыли (карточка героя состава поверх любого экрана) */
  hczoom(v) { if (!v || !(H(v) || RSI[v])) return; S.overlay = { t: 'hczoom', arg: v, back: S.overlay && S.overlay.t !== 'hczoom' ? S.overlay : null }; render(); focusOverlay(); },
  hczx() { S.overlay = S.overlay && S.overlay.t === 'hczoom' ? S.overlay.back || null : null; render(); },
  /* фильтр: «группа:значение» — выбрать или снять; сброс — всё или одну группу */
  hcf(v) {
    const [k, x] = String(v).split(':'); if (!(k in HC_ZERO)) return;
    const val = typeof HC_ZERO[k] === 'number' ? +x || 0 : x || '';
    S.hf[k] = S.hf[k] === val ? HC_ZERO[k] : val; render();
  },
  hcclr(v) { if (v in HC_ZERO) S.hf[v] = HC_ZERO[v]; else Object.assign(S.hf, HC_ZERO); render(); },
  /* порядок сетки — выпадающий список: «Мои» и каталог помнят свой */
  hcsort(v, t) { const k = hcKind(), x = t && t.value; if (!HC_SORT[k].some(y => y[0] === x)) return; S.hf[k === 'all' ? 'sortAll' : 'sort'] = x; render(); },
  /* «За золото»: карточка «до покупки»; пусто — назад к сетке */
  gsel(v) { S.rs.gsel = RSI[v] ? v : ''; S.seg.rhero = 'who'; S.rs.val = null; render(); },
  /* герой состава из сетов, листов и строк — карточка в каталоге */
  rssel(v) { if (!RSI[v]) return; S.rs.sel = v; S.rs.val = null; S.hgrid = 'all'; S.hview = 'rs'; S.seg.heroes = 'coll'; S.seg.rhero = 'who'; go('heroes'); },
  rsopen(v) { ACT.rssel(v); },
  /* карточка героя состава поверх любого экрана; из лавки праха и витрины отряда недели «Назад» возвращает в них */
  rhero(v) { if (!RSI[v]) return; const t = S.overlay && S.overlay.t, back = t === 'dust' || t === 'hrecho' ? t : ''; S.seg.rhero = 'who'; S.rs.val = null; open('rhero', v, back ? { back } : {}); },
  /* как получить: герой Эхо этой недели — витрина отряда недели; остальные — как прежде (index.html) */
  rsgo(v) {
    const h = RSI[v], W = rsWeek();
    if (h && h.src === 'echo' && W && W.squad.includes(h.id) && h.c <= rsCyc()) { S.route = 'heroes'; S.seg.heroes = 'hire'; S.seg.hire = 'souls'; S.rs.ssel = v; S.du.ask = null; open('hrecho'); return; }
    return hcRsGo0 ? hcRsGo0(v) : undefined;
  },
});
/* лавка праха и пробуждение: вид — выбор, сколько брать, цикл витрины; покупка и пробуждение — операции SOUL_SRV с номером.
   Кнопка несёт «номер|герой|сколько»; старый вызов — просто герой (запасы, итог рулетки): номер — следующий, осколок — один */
const duArgs = v => { const [a, b, c] = sqParse(v); return b == null ? { op: duOp(), id: a, q: 1 } : { op: a, id: b, q: +c || 1 }; };
Object.assign(ACT, {
  duq(v) { S.du.q = Math.max(0, +v || 0); render(); },
  ducyc(v) { S.du.cyc = +v || 0; S.rs.ssel = ''; render(); },
  duno() { S.du.ask = null; render(); },
  dustbuy(v) {
    const { op, id, q } = duArgs(v), r = SOUL_SRV.buy(op, id, q);
    if (r.refuse) return duSay(r);
    if (r.again) return render();   // повтор: ничего не списано и не выдано
    const h = RSI[r.res.id];
    toast(`${h.n}: +${fmt(r.res.q)} ${plural(r.res.q, 'осколок', 'осколка', 'осколков')}`);
  },
  /* «Пробудить»: в лавке праха и витрине отряда недели — подтверждение в том же окне, в остальных местах — общее подтверждение;
     кнопка несёт номер операции */
  activate(v) {
    const { op, id } = duArgs(v), h = RSI[id], need = hrNeed();
    if (!h || rsHas(h) || (S.rs.shards[id] || 0) < need) return;
    if (S.overlay && (S.overlay.t === 'dust' || S.overlay.t === 'hrecho')) { S.du.ask = { op, id }; render(); return; }
    S.overlay = { t: 'confirm', title: 'Пробудить героя', text: `${h.n} соберётся из ${need} осколков и придёт с 0 уровнем, 0 рунных пределов и 0 доблести. Лишние осколки уйдут в прах.`,
      warnTeam: 'Число осколков и цена в душах — заглушки: таблица не утверждена (§15.1).', ok: 'Пробудить', act: 'activatedo', v: `${op}|${id}`, cost: ['souls', RS.rules.stub.activateSouls] };
    render(); focusOverlay();
  },
  /* пробуждение: операция SOUL_SRV, затем окно пробуждения; из лавки и витрины отряда недели — кнопка возврата в них */
  activatedo(v) {
    const { op, id } = duArgs(v), t = S.overlay && S.overlay.t, from = t === 'dust' || t === 'hrecho' ? t : '', r = SOUL_SRV.wake(op, id);
    S.du.ask = null;
    if (r.refuse) { if (!from) S.overlay = null; duSay(r); return; }
    if (r.again) { render(); return; }
    S.du.got = { op: r.res.op, at: Date.now() };
    S.overlay = { t: 'hrwake', arg: r.res.op, back: from }; render(); focusOverlay();
  },
  /* окно пробуждения: нажатие — сразу итог */
  hrwskip() { if (S.du.got) S.du.got.at = Date.now() - DU_VIEW.wake.end; render(); focusOverlay(); },
});
/* окно имени: фокус и выделение; черновик — в S.sq.name, чтобы перерисовка его не стёрла; Enter — «Сохранить» */
function sqFocusName() {
  requestAnimationFrame(() => { const i = document.getElementById('sqName'); if (i) { i.focus(); try { i.select(); } catch (_) { } } });
}
document.addEventListener('input', e => { const t = e.target; if (t && t.id === 'sqName' && S.overlay && S.overlay.t === 'sqname') S.sq.name = { id: S.overlay.arg, v: t.value }; });
/* ушли из библиотеки не через «Назад» и не «Выбрать» — выбор для режима забыт: строка режима в библиотеке больше не висит */
window.addEventListener('en-render', () => { if (S.sq && S.sq.from && !(S.route === 'heroes' && S.seg.heroes === 'squads')) S.sq.from = null; });
document.addEventListener('keydown', e => {
  const t = e.target; if (!t || t.id !== 'sqName' || e.key !== 'Enter') return;
  e.preventDefault(); const b = document.querySelector('.g [data-a="sqrendo"]'); if (b) b.click();
});

/* ================== состояние ==================
   S.sq: seq и ops — «сервер» библиотеки; sel — выбор режимов, у которых нет своего поля (оборона Арены, Лига, Клановый босс);
   slot — выбранное место в редакторе, round — раунд Лиги в листе, from — из какого режима пришли в библиотеку и куда вернуться,
   name — черновик имени. Маршрут возврата листа — поле back его слоя (S.overlay.back): лист открыт поверх экрана режима */
function sqState(s) {
  const D = SQ_DATA.demo;
  s.sq = { seq: 1, ops: {}, sel: { arena: D.arena, league: D.league.slice(), clan: D.clan }, slot: -1, round: 0, from: null, name: null };
  /* S.dn — «сервер» покупок за Энериум: seq — номер следующей, ops — итоги по номерам; got — окно получения: номер и время покупки */
  s.dn = { seq: 1, ops: {}, got: null };
  /* S.du — «сервер» лавки праха и пробуждения (SOUL_SRV): seq, ops; q — сколько брать (0 — до комплекта), cyc — цикл витрины (0 — все),
     ask — подтверждение пробуждения в окне лавки, got — окно пробуждения: номер и время операции */
  s.du = { seq: 1, ops: {}, q: DU_VIEW.qty[0], cyc: 0, ask: null, got: null };
  /* коллекция: S.hview — own (сетка героев аккаунта), all (каталог), mine (большая карточка героя аккаунта S.selHero), rs (карточка героя
     состава S.rs.sel); S.hgrid — из какой сетки открыта карточка; S.hf — порядок и фильтр сетки, у «Моих» и каталога порядок свой */
  s.hview = 'own'; s.hgrid = 'own';
  s.hf = Object.assign({ sort: HC_SORT.own[0][0], sortAll: HC_SORT.all[0][0] }, HC_ZERO);
  return s;
}
const sqInitBase = initialState;
initialState = function () { return sqState(sqInitBase()); };
sqState(S);

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Коллекция · карточки 9 : 16', 'Купленные герои сеткой: портрет во всю карточку, редкость, доблесть дугой, рунные камни, класс и стихия, уровень и мощь; ступень вида — сила героя',
    () => { S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'own'; S.overlay = null; }],
  ['Большая карточка героя', 'Нажатие на арт: слева портрет в раме ступени — крупно по нажатию, справа — мощь, доблесть, уровень и вкладки развития',
    () => { S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.hgrid = 'own'; S.selHero = 'h2'; S.seg.hero = 'power'; S.overlay = null; }],
  ['Каталог · все герои', 'Все герои состава: несобранные чёрно-белые, у сборных — полоса осколков, закрытый цикл — замок; нажатие — карточка «до покупки»',
    () => { S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'all'; S.overlay = null; }],
  ['За золото · до покупки', 'Сетка героев каталога цикла; нажатие — большая карточка: портрет, редкость, класс, стихия, доблесть, навыки по доблести, история, цена и «Купить»',
    () => {
      S.route = 'heroes'; S.seg.heroes = 'hire'; S.seg.hire = 'gold'; S.rs.gcyc = 0; S.overlay = null; S.seg.rhero = 'who';
      const h = RS.heroes.find(x => x.src === 'gold' && x.c === rsCyc() && !rsHas(x)); S.rs.gsel = h ? h.id : '';
    }],
  ['Отряд недели · витрина', 'Цивилизация недели и пятеро крупными карточками: несобранные чёрно-белые с полосой осколков, собранный комплект — в цвете и «Пробудить» за души',
    () => {
      S.route = 'heroes'; S.seg.heroes = 'hire'; S.seg.hire = 'souls'; S.du.ask = null;
      const W = rsWeek(), h = W && W.squad.map(id => RSI[id]).find(x => x && x.c <= rsCyc() && !rsHas(x));
      if (h) { S.rs.shards[h.id] = Math.max(S.rs.shards[h.id] || 0, hrNeed()); S.rs.ssel = h.id; S.wallet.souls = Math.max(S.wallet.souls, RS.rules.stub.activateSouls); }
      S.overlay = { t: 'hrecho' };
    }],
  ['Отряды · библиотека', 'До десяти отрядов: создать, назвать, собрать до пяти героев и переставить; где какой отряд выбран',
    () => { S.route = 'heroes'; S.seg.heroes = 'squads'; S.selSquad = 's2'; S.sq.slot = -1; S.overlay = null; }],
  ['Отряд для режима · один лист', 'Спуск, Эхо, оборона Арены, Лига и Клановый босс — один лист выбора, у каждого режима свой сохранённый отряд',
    () => { S.route = 'echo'; S.overlay = { t: 'prep', arg: 'echo', back: 'echo' }; }],
  ['Лига · три отряда', 'Три отряда по пять, герой не повторяется: повторы и нехватка героев видны до боя',
    () => { S.route = 'arena'; S.seg.arena = 'league'; S.sq.round = 0; S.overlay = { t: 'prep', arg: 'league', back: 'arena' }; }],
  ['За Энериум · витрина', 'Пятеро Безликих на ступенях цены: дороже — выше и ярче; сет-бонус по ступеням; покупка с подтверждением',
    () => { S.route = 'heroes'; S.seg.heroes = 'hire'; S.seg.hire = 'donat'; S.rs.dcyc = 0; S.rs.dsel = ''; S.overlay = null; }],
  ['За Энериум · получение героя', 'Операция с номером: Энериум списан один раз, герой пришёл с 0 ур. — окно получения, свет снизу и имя',
    () => {
      S.route = 'heroes'; S.seg.heroes = 'hire'; S.seg.hire = 'donat'; S.rs.dcyc = 0; S.overlay = null;
      const s = dnSet(), h = s && s.members.map(id => RSI[id]).find(x => x && !dnWhy(x)); if (!h) return;
      const r = DN_SRV.buy(dnOp(), h.id); if (!r.res) return;
      S.rs.dsel = h.id; S.dn.got = { op: r.res.op, at: Date.now() }; S.overlay = { t: 'hrgot', arg: r.res.op };
    }],
  ['За души · отряд Эхо недели', 'Витрина отряда недели: героя Эхо собирают только осколки из сундуков Эхо — прахом нельзя; собранного пробуждают души',
    () => { S.route = 'heroes'; S.seg.heroes = 'hire'; S.seg.hire = 'souls'; S.du.ask = null; S.overlay = { t: 'hrecho' }; }],
  ['За души · алтарь Возрождения', 'Сцена алтаря: зеркало душ, герои пула веером в раме, цена и шанс героя целиком, «К рулетке»; справа — отряд Эхо и лавка праха',
    () => { S.route = 'heroes'; S.seg.heroes = 'hire'; S.seg.hire = 'souls'; S.overlay = null; if (rsCyc() < rsFrom('roulette')) S.rs.cyc = rsFrom('roulette'); }],
  ['Лавка праха', 'Отдельное окно: витрина героев пула — стекло с лицом, цена осколка и доля собранного; осколки за прах — 1, 10 или до комплекта; героев Эхо нет — сказано почему',
    () => {
      S.route = 'heroes'; S.seg.heroes = 'hire'; S.seg.hire = 'souls'; if (rsCyc() < rsFrom('roulette')) S.rs.cyc = rsFrom('roulette');
      S.du.cyc = 0; const cat = duCat(); if (cat[1]) S.rs.shards[cat[1].id] = Math.max(S.rs.shards[cat[1].id] || 0, Math.floor(hrNeed() * 2 / 5));
      S.rs.ssel = cat[1] ? cat[1].id : ''; S.wallet.dust = Math.max(S.wallet.dust, rsShardPrice(cat[1] || cat[0] || { r: 1, c: 1 }) * hrNeed());
      S.du.ask = null; S.overlay = { t: 'dust' };
    }],
  ['Лавка праха · пробуждение', 'Комплект собран: «Пробудить» за души — подтверждение в том же окне, операция с номером; трещины заживают, герой выходит из стекла в раме',
    () => {
      S.route = 'heroes'; S.seg.heroes = 'hire'; S.seg.hire = 'souls'; if (rsCyc() < rsFrom('roulette')) S.rs.cyc = rsFrom('roulette');
      S.du.cyc = 0; const h = duCat()[0]; if (!h) return;
      S.rs.shards[h.id] = Math.max(S.rs.shards[h.id] || 0, hrNeed() + 3); S.rs.ssel = h.id; S.wallet.souls = Math.max(S.wallet.souls, RS.rules.stub.activateSouls);
      S.du.ask = { op: duOp(), id: h.id }; S.overlay = { t: 'dust' };
    }],
);

/* ================== UI-кит ==================
   Раздел «Карточка героя»: три ступени силы на одном герое, состояния в каталоге и витрине отряда недели, большая карточка героя
   аккаунта и «до покупки», витрина отряда недели; команде — как сменить вид после выбора стиля */
KIT_EXTRA.push({ html: hcKitHtml });
function hcKitHtml() {
  if (!RS.heroes.length || !RS.rules) return '';
  const noop = h => h.replace(/data-a="[^"]*"/g, 'data-a="noop"'), cap = INV.hero.capByLim, need = hrNeed(), cur = rsCyc();
  const rh = RS.heroes.find(h => h.src === 'roulette' && typeof RS_ART !== 'undefined' && RS_ART.has(h.id)) || RS.heroes[0], base = hcView(rh);
  const mk = ([r, valor, maxV, lim, bm]) => Object.assign({}, base, { own: true, acc: null, busy: '', r, valor, maxV, lim, lvl: cap[lim], cap: cap[lim], bm });
  const fig = (card, say) => `<figure class="hck-t"><div class="hck-c">${card}</div><figcaption>${say}</figcaption></figure>`;
  const tiers = HC_VIEW.kit.map(x => { const v = mk(x); return fig(hcCard(v, { act: 'noop' }), `<b>Ступень ${hcTier(v)}</b>${RAR[v.r].toLowerCase()} · доблесть ${v.valor} из ${v.maxV}${hcMax(v) ? ' · путь пройден' : ''}`); }).join('');
  const pool = RS.heroes.filter(h => RS_SHARD.includes(h.src) && !rsHas(h)), a = pool.find(h => h.c <= cur) || pool[0], b = pool.find(h => h !== a && h.c <= cur) || a;
  const z = pool.find(h => h.c > cur) || RS.heroes.find(h => h.c > cur), mine = hcOwnList()[0];
  const states = [[mine, {}, 'в коллекции: цвет, уровень и мощь'], [a && hcView(a), { gray: true, shard: [Math.floor(need * 2 / 5), need] }, 'не собран: чёрно-белый, полоса осколков'],
    [b && hcView(b), { shard: [need, need] }, 'комплект собран: в цвете, полоса горит'], [z && hcView(z), { gray: true, lock: true }, 'цикл ещё закрыт: замок']]
    .filter(x => x[0]).map(([v, o, t]) => fig(hcCard(v, Object.assign({ act: 'noop' }, o)), t)).join('');
  const h2 = H('h2') || S.heroes[0], gold = RS.heroes.find(h => h.src === 'gold' && h.c === cur && !rsHas(h)) || RS.heroes.find(h => h.src === 'gold');
  const big = h2 ? noop(hcBig(hcView(h2), { back: 'data-a="noop"', step: true, body: heroDetail(h2, { head: false, cls: 'hcb-tabs' }) })) : '';
  const pre = gold ? noop(hcPre(gold, { back: 'data-a="noop"', foot: hcGoldFoot(gold) })) : '';
  const echo = cur >= rsFrom('echo') ? noop(OV.hrecho()) : '';
  const T = HC_VIEW.tier;
  return `<section class="k-box hck" style="grid-column:1/-1" id="kitHeroCard"><h3>Карточка героя</h3>
    <p class="k-note">Сетка коллекции, каталога, «За золото» и отряда недели — карточки 9 : 16: портрет во всю карточку; у вершины — гребень с кристаллом редкости и доблесть дугой (звёзд — личный максимум), в кружках — уровень и стихия; по бокам — рунные камни пределов; внизу — имя на плашке, класс и мощь. Карточка сама говорит, насколько герой силён: металл рамки и отделка богатеют с редкостью и доблестью — тёмное железо с заклёпками; позолота, листья у гребня и кабошоны цвета редкости; старое золото с крыльями, раскалённые швы, сияние и искры у вершины. Путь пройден — лента «максимум».</p>
    <div class="hck-row">${tiers}</div>
    <p class="k-note">В каталоге и витрине отряда недели — несобранные чёрно-белые, у сборных героев под портретом полоса осколков со стеклом осколка; собранный комплект — в цвете, будущий цикл — замок.</p>
    <div class="hck-row">${states}</div>
    <p class="k-note">Нажатие на карточку — большая карточка крупным планом: слева портрет в раме своей ступени (нажатие — ещё крупнее), справа — имя, мощь, доблесть, уровень и вкладки «Развитие», «Снаряжение», «Навыки», «Путь»; одно главное действие — следующий шаг героя. Герой до покупки — та же карточка: «Герой», «Навыки» — что откроет каждая доблесть, «Путь»; внизу — цена и «Купить».</p>
    <div class="hck-big">${big}</div>
    <div class="hck-big">${pre}</div>
    ${echo ? `<p class="k-note">Отряд недели — окно-витрина: арена цивилизации за окном, пятеро крупными карточками, неприязнь, откуда осколки и «Пробудить» за души у собранного.</p><div class="hck-he">${echo}</div>` : ''}
    ${TM(`<p class="k-note">Как сменить вид после выбора автором (art/generated/card-concepts; отмечены «золотая филигрань» и «кованое железо», раскладку значков выберут из второй партии проб): рамка ступени картинкой — путь в HC_ART.ready (assets/art/cards/frame-t1…t3.png, окно прозрачное), CSS-рамка этой ступени прячется сама; металл, отделка, свет и искры — переменные --hk-metal, --hk-rim, --hk-pin*, --hk-leaf и блоки [data-t] в heroes.css; раскладка значков — один блок «раскладка значков» в heroes.css и разметка hcMarks и hcCard; какая ступень у героя — HC_VIEW.tier: по редкости ${T.r.join(' / ')}, за доблести +${T.valor.join(' / +')}, не выше ${T.top}; размеры сетки и большой карточки — HC_VIEW. Портреты — общий RS_ART; героя без портрета рисует силуэт класса (art-icons.js).</p>`)}
  </section>`;
}

/* Раздел «Отряды»: анатомия плитки героя, пресеты библиотеки, правила режимов и API листа выбора */
KIT_EXTRA.push({
  html: () => {
    const h = S.heroes[0], h2 = S.heroes[2], cat = RS.heroes.find(x => x.src === 'roulette' && x.c === 2) || RS.heroes[0];
    const tiles = `${heroCard(h, { act: 'noop', bm: false })}${heroCard(h2, { act: 'noop', sel: true, bm: true })}${rsCard(cat, { act: 'noop' })}${heroCard(S.heroes[3], { act: 'noop', note: 'Забег · Мастерская', dim: true, bm: false })}`;
    const rule = M => `${M.exact ? 'ровно ' + M.min : 'от ' + M.min + ' до ' + SQ_DATA.size}${M.teams ? ` × ${M.teams}, без повторов` : ''}`;
    const busy = { skip: 'идут свободные', block: 'занятый — не готов', allow: 'встают и занятые' };
    const rows = Object.entries(SQM).map(([k, M]) => `<tr><td><b>${M.n}</b><small>${k}</small></td><td>${rule(M)}</td><td>${busy[M.busy]}</td><td><code>${M.hold ? 'S.' + M.hold : 'S.sq.sel.' + k}</code></td></tr>`).join('');
    const pres = S.squads.map(x => `<span class="chip">${hrEsc(x.name)} · ${x.m.filter(Boolean).length}</span>`).join('');
    return `<section class="k-box" style="grid-column:1/-1"><h3>Отряды и плитка героя</h3>
      <div class="k-demo" style="display:grid;grid-template-columns:repeat(4,minmax(0,110px));gap:8px">${tiles}</div>
      <p class="k-note">Плитка героя — одна на все экраны: кристалл — редкость (значки r1…r7, ADR-0027); значков доблести столько, сколько доблестей у героя, светятся взятые; под ними — пять отметок рунного предела; внизу — имя, класс значком и уровень. Боевая мощь — у витрин и в отряде, в коллекции её нет. У героя состава, которого нет в коллекции, вместо уровня — цикл. Занятость — поверх портрета.</p>
      <div class="k-row">${pres}</div>
      <p class="k-note">Библиотека «Отряды» (§2.1): до ${SQ_DATA.max} пресетов с именами, в каждом до ${SQ_DATA.size} героев; пресет героев не занимает. Создать, переименовать, удалить, собрать и переставить — операции с номером: повтор ничего не меняет. Один лист выбора на все режимы — <code>OV.prep</code>, у каждого режима свой выбор:</p>
      <table class="rk-tab"><tr><th>Режим</th><th>Героев</th><th>Занятые</th><th>Где выбор</th></tr>${rows}</table>
      <p class="k-note">API для экранов режимов: <code>SQ.pick(режим, { back })</code> — лист выбора, <code>SQ.of(режим)</code> — выбранный отряд (у Лиги — три), <code>SQ.ready(режим)</code> — готовность и причина, <code>SQ.ids(режим)</code> — кто пойдёт, <code>SQ.set</code>, <code>SQ.pool</code>, <code>SQ.hero</code>. Подробно — <code>design/ui/screens/README.md</code>.</p></section>`;
  },
});

/* Раздел «За Энериум»: витрина донатного сета — анатомия, правила честной покупки, операция DN_SRV, арт и что выгружено */
KIT_EXTRA.push({
  html: () => {
    const s = dnSet(); if (!s) return '';
    const demo = dnView().replace(/data-a="[^"]*"/g, 'data-a="noop"');
    const need = [DN_ART.hall, DN_ART.frame].concat(dnSets().map(x => DN_ART.emblem(x.key))), got = need.filter(dnArt).length;
    const faces = dnSets().reduce((a, x) => a.concat(x.members), []).filter(id => typeof RS_ART !== 'undefined' && RS_ART.has(id)).length;
    return `<section class="k-box" style="grid-column:1/-1"><h3>«За Энериум» · витрина донатного сета</h3>
      <div class="k-demo dn-kit">${demo}</div>
      <p class="k-note">${TM('Слова автора: «дорого-богато… чтобы игрок хотел купить героев». ')}Дорого — свет, материал и крупные формы, а не числа: зал, пятеро Безликих в рамах на ступенях цены — первый дешевле всех, пятый дороже всех, стоит выше и светится ярче (ADR-0021). Сет — коллекция: «в коллекции N из 5», сет-бонус строкой, его ступени — лист: условие фишками героев и эффект с N ступени (ADR-0022, §30). Справа — выбранный герой и одна кнопка покупки с ценой.</p>
      <p class="k-note">Честно (§1.2, §32): цена видна на ступени и на кнопке; не хватает Энериума — сказано сколько, ссылка в лавку; подтверждение называет, с чем герой приходит (0 ур., 0 РП, 0 Добл) и сколько останется. Покупка — операция <code>DN_SRV.buy(номер, герой)</code>: номер несут кнопка и подтверждение, повтор ничего не списывает и не выдаёт. После покупки — окно получения: трещина света, столп, рама из песка времени, вспышка, имя; нажатие — сразу итог, «меньше движения» — без анимации.</p>
      <p class="k-note">Арт — <code>tools/art-gen/jobs/donat-*.json</code>: зал, рама, пять эмблем, портреты сетов II и III. Выгружено для витрины ${got} из ${need.length} (<code>DN_ART.ready</code>), портретов донатных героев — ${faces} (<code>RS_ART</code>). Пока пути нет, зал, раму и эмблемы рисует CSS — битых картинок нет.</p></section>`;
  },
});

/* Раздел «За души · алтарь и лавка праха»: сцена вкладки и окно лавки вне кадра телефона, правила честной покупки, операции SOUL_SRV,
   что выгружено из арта */
KIT_EXTRA.push({
  html: () => {
    const noop = h => h.replace(/data-a="[^"]*"/g, 'data-a="noop"');
    const open = rsCyc() >= rsFrom('roulette'), scene = noop(hrSoulsView()), shop = open ? noop(OV.dust({})) : '';
    const RA = typeof RL_ART !== 'undefined' ? RL_ART : { want: [], ready: [] }, want = RA.want.concat(DU_ART.want);
    const got = want.filter(p => RA.ready.includes(p) || DU_ART.ready.includes(p)).length, W = rsWeek();
    const faces = (W ? W.squad : []).filter(id => typeof RS_ART !== 'undefined' && RS_ART.has(id)).length;
    return `<section class="k-box" style="grid-column:1/-1"><h3>«За души» · алтарь и лавка праха</h3>
      <div class="k-demo hr-kit">${scene}</div>
      <p class="k-note">${TM('Слова автора: «рулетка — это тоже для людей, которые донатят… красиво и дорого-богато», «магазин праха… отдельным окном». ')}Вкладка — одна рама: алтарь душ, зеркало, из стекла выходят контуры героев. Перед зеркалом — вход рулетки: герои пула веером в раме, цена прокрутки и шанс героя целиком, «К рулетке» и «Шансы» (screens/roulette.js). Справа — два входа: отряд Эхо недели — цивилизация и пять осколков по циклам, будущие тусклые; лавка праха — прах на руках, сколько героев и сколько можно пробудить.</p>
      ${shop ? `<div class="k-demo du-kit">${shop}</div>` : ''}
      <p class="k-note">Лавка праха — отдельное окно: витрина героев пула рулетки доступных циклов — стекло осколка с лицом, имя, цена осколка (§15.3 × цикл героя) и доля собранного; циклы — вкладками, когда их больше одного. Справа — выбранный: осколки за прах — ${DU_VIEW.qty.join(', ')} или до комплекта, — когда комплект собран — «Пробудить» за души с подтверждением в том же окне; после — окно пробуждения: трещины заживают, герой выходит из стекла в раме. Героев Эхо здесь нет (правило данных <code>rules.dustSrc</code>) — сказано почему, ссылка на отряд недели.</p>
      <p class="k-note">Честно (§1.2): цена на карточке и на кнопке, нехватка — сколько; прах берётся только из повторных осколков. Покупка и пробуждение — операции <code>SOUL_SRV.buy(номер, герой, сколько)</code> и <code>SOUL_SRV.wake(номер, герой)</code>: номер несёт кнопка, повтор ничего не списывает и не выдаёт. Герой приходит с 0 ур., 0 РП и 0 Добл, лишние осколки — в прах (§15.2).</p>
      <p class="k-note">Арт — <code>tools/art-gen/jobs/souls-altar.json</code> и <code>heroes-echo-ishkantun.json</code>: алтарь, лавка, рама — выгружено ${got} из ${want.length} (<code>RL_ART.ready</code>, <code>DU_ART.ready</code>); портретов отряда недели — ${faces} из ${W ? W.squad.length : 0} (<code>RS_ART</code>). Пока пути нет, алтарь, лавку и раму рисует CSS — битых картинок нет.</p></section>`;
  },
});
