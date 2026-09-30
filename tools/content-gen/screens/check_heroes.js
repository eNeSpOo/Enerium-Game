/* Автопроверка экрана «Герои» (design/ui/screens/heroes.js) и карточки-книги (screens/book.js) — без браузера.
   Карточка героя — книга (выбор автора 30.09.2026, ADR-0032): ступень книги — личный максимум доблести, редкость — кристалл и свет,
   рунные пределы — замки по правому краю, взятая доблесть — короткие ленты-закладки; нажатие — книга летит в центр и раскрывается.
   1. index.html подключает heroes.css, book.css, library.css, heroes.js, book.js и library.js после model.js; файлы компилируются,
      концы строк — CRLF. Прежнего
      кода нет: карточки 9 : 16 с гребнем и рамкой ступени (hcCard, hcMarks, hcFr, HC_ART, .hk-fr), большой карточки (hcBig, .hcb-g),
      плитки 4 : 5 (.hc .cr), колонок «За души», прежних sq, sqBM и листа prep в index.html. Кадры book.css — только transform
      и opacity; при «меньше движения» — без полёта и листов.
   2. Книга — одна анатомия (hbCard): ступень data-t = максимум доблести 1…5, редкость data-r и кристалл, стадия data-s; у героя
      аккаунта — круг уровня, пять замков (пройденные отперты, следующий на потолке тлеет или пульсирует), мощь BM.hero; лент ровно
      максимум доблести, взятые — цвета редкости; стихия — медальон, класс — щит (размер l), имя — на плашке. У героя вне коллекции —
      ни уровня, ни замков, мощь по базовым статам (BM на герое без записи коллекции). Неизвестная душа — силуэт класса вместо
      портрета, даже выгруженного. Гримуар — угольки; путь пройден — data-max.
   2а. «Мои» — все 16 героев аккаунта демо, по мощи сильнейшие сверху; порядок, фильтр значками, счётчик «в коллекции N из M»; лист
      фильтра.
   2б. Стадии знакомства (решение автора 30.09.2026): hrStage сверен с независимым правилом по всем 360 героям и циклам. Каталог —
      только найденные (стадии 1–3), счётчик «найдено N из M»; «За золото» будущего цикла — без героев; донатный сет будущего цикла —
      без героев; веер рулетки и отряд недели — ненайденные безымянными книгами; лавка праха — только найденные; книга не найденного
      не открывается ни из каталога, ни окном; у неизвестной души книга без сведений — только осколки и где их брать; рецепт героя
      кладёт комплект осколков, а не героя; стекло осколка неизвестной души — силуэт, не портрет; сервер праха не продаёт первый
      осколок.
   2в. Замки рунных пределов: на книге в сетке, мелкой книге отрядов и на переплёте раскрытой книги следующий на потолке уровня тлеет,
      с рунами — пульсирует; у чужого героя — только отпертые и закрытые.
   2г. Силуэт класса в окне (замечание автора 30.09.2026 о Лучнице): кадр фигуры с оружием (ART_ICONS.clsFit) у всех семи силуэтов,
      целые доли, ratio — как у рисунка; моделью формулы .hk-fit>img.fit фигура целиком внутри поля и окна — обложки каждой ступени
      и размера, страницы портрета на обоих экранах, крупного плана; поле не под кругами, плашкой имени и знаками страницы.
   3. Раскрытая книга героя аккаунта — нажатие на книгу: слой поверх сетки, разворот своей ступени; слева — портрет (лупа — OV.hczoom,
      закрытие возвращает прежнее окно), уровень, стихия, класс, мощь и имя; справа — вкладки «Развитие», «Снаряжение», «Навыки», «Путь»
      из heroDetail; замки на переплёте, ленты снизу; ‹ › — соседний герой той же сетки; закрытие — к сетке.
   3а. Книга «до покупки» (каталог, окно поверх экрана): «Герой», «Навыки», «Путь», ни развития, ни снаряжения; одно действие по
      источнику; поверх лавки праха и витрины отряда недели «Назад» возвращает в них.
   4. Купленный герой состава — герой аккаунта: запись коллекции 0 ур., 0 РП, 0 Добл; H(id); книга в «Моих» и раскрытая книга на всех
      вкладках; уровень за дух пишется в запись коллекции; у героя Эхо — набор из echo-foes.js.
   4б. Боевая мощь — одна функция BM (§6): независимый пересчёт у героев, после уровня и со слоями вещей; одно число на книге,
      в раскрытой книге, «Пятёрке сильнейших», отрядах и листе выбора отряда; соперник Арены, цель Эхо, цель клана — та же формула.
   5. «За золото» — сетка книг каталога цикла; раскрытая книга «до покупки» с ценой и «Купить»; покупка ACT.gbuy; нехватка — сколько.
   5а. «За души»: сцена алтаря — вход рулетки веером книг, вход отряда Эхо недели, лавка праха окном.
   5б. Витрина отряда недели — окно: пятеро крупными книгами по стадиям; «Пробудить» у собранного — подтверждение в окне, операция
      с номером, окно пробуждения с возвратом.
   5в. Лавка праха — книги найденных героев, цена осколка; операции SOUL_SRV; дыра праха закрыта (героев Эхо прахом не собрать).
   5г. Стекло осколка: без маски-картинки; портрет — у собранного комплекта, у неизвестной души — силуэт класса.
   5д. «За Энериум» — книги сета на ступенях цены, покупка DN_SRV; сила коллекции — одна функция collRp.
   6. Режим «Игрок»: служебного нет (SERVICE из check_player_view.js), нет undefined и NaN; режим «Команда» рисуется.
   7. Вёрстка — расчётом на 932 × 430 и 844 × 390: книги на полках шкафа — «Мои» и «За золото» (книга не уже HC_VIEW.card и
      HC_VIEW.gold, в ряду не меньше пяти, видно больше одной полки, lbCols считает то же число книг на полке, что и расчёт; табличка
      цены помещается под книгой; ленты свисают с кромки полки, не ниже неё), знаки обложки не налезают, раскрытая книга (страницы
      разворота каждой ступени — правой хватает на девять мест снаряжения), витрина отряда недели.
   8. Анимация — по часам песочницы: открытие — время от нажатия: книга выдвигается с полки к игроку корешком (объём книги: обложка,
      обрез, корешок своей ступени), летит в центр и разворачивается обложкой, дальше — как прежде; полёт от места карточки (на полке
      книги в это время нет), шаги по
      порядку, в конце показ снят; от корешка нижней полки — книга стоит корешком, масштаб по высоте корешка; закрытие на нижнюю
      полку — к корешку; нажатие посреди — сразу итог; ‹ › — перелистывание; «меньше движения» — без полёта и листов; закрытие без
      живой книги — сразу.
   9. Арт книги: пути HB_ART.ready есть на диске (и корешки пяти ступеней); геометрия — целые тысячные доли, окно внутри рамки,
      страницы по разные стороны корешка; без выгруженного арта книга и корешок рисуются CSS, битых картинок нет.
   10. UI-кит «Карточка-книга»: пять ступеней, семь редкостей, замки, ленты, стадии, размеры, раскрытые книги, раскадровка; карта
      экранов — коллекция, книга, воспоминания, орден, сила коллекции, витрина до покупки — готовы.
   11. «Библиотека Этриона» (слово автора 30.09.2026: «пусть задний фон показывает, что они условно находятся на полках огромного
      древнего шкафа, каждая на своём ряде»): «Мои», каталог и «За золото» — шкаф: карниз со строкой счётчиков, порядка и фильтра,
      стойки, лампады, свет снизу, пыль в луче (LB_VIEW.dust пылинок); книги — рядами по lbCols, у каждого ряда своя полка
      с кронштейнами, ряды полные, кроме последнего, полок не меньше LB_VIEW.rows; пустой фильтр — строка на полке и «Сбросить»;
      «За золото» — у каждой книги латунная табличка на кромке: цена следующего найма, нехватка — тусклая, купленный — «в коллекции»;
      будущий цикл — без книг. Арт шкафа — пути LB_ART.ready на диске, адреса и классы у <html>, геометрия целая; без арта — CSS.
      UI-кит «Библиотека Этриона» в обоих режимах; в режиме «Игрок» служебного нет.
   Запуск: node tools/content-gen/screens/check_heroes.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, cards: 0, tiles: 0, bigs: 0, cycles: 0, bm: 0, stage: 0, anim: 0, lay: [] };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`«Герои»: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; книг проверено ${cnt.cards}, книг на полке отряда ${cnt.tiles}, раскрытых книг ${cnt.bigs}, циклов «Призыва» ${cnt.cycles}; стадий знакомства сверено ${cnt.stage}; моментов анимации ${cnt.anim}; мощь сверена с формулой §6 ${cnt.bm} раз.`);
  for (const x of cnt.lay) console.log('вёрстка ' + x);
  console.log('Проверка пройдена: карточка героя — книга: ступень — максимум доблести, кристалл и свет — редкость, замки — рунные пределы, ленты — взятая доблесть; стадии знакомства — не найденных не видно, неизвестная душа — силуэт и закрытые сведения; «Мои» и каталог, порядок и фильтр — на полках шкафа Библиотеки Этриона, у каждого ряда своя полка; «За золото» — цена латунной табличкой на кромке; раскрытая книга — портрет и вкладки развития, «до покупки» — без прокачки и снаряжения; анимация открытия по времени — книга выдвигается с полки корешком и разворачивается обложкой, от корешка нижней полки — корешком, пропуск, «меньше движения»; отряд недели, лавка праха и «За Энериум» — книгами; вёрстка 932 × 430 и 844 × 390; в режиме «Игрок» служебного нет.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const main = scripts.filter(s => !s.src).map(s => s.code).join('\n');
const JS = read('screens/heroes.js'), CSS = read('screens/heroes.css'), BJS = read('screens/book.js'), BCSS = read('screens/book.css');
const LJS = read('screens/library.js'), LCSS = read('screens/library.css');
{
  const iM = scripts.findIndex(s => s.src === 'screens/model.js'), iH = scripts.findIndex(s => s.src === 'screens/heroes.js'), iB = scripts.findIndex(s => s.src === 'screens/book.js');
  const iL = scripts.findIndex(s => s.src === 'screens/library.js');
  if (iH < 0) say('index.html: не подключён screens/heroes.js');
  else if (iH < iM) say('index.html: heroes.js подключён раньше model.js');
  if (iB < 0) say('index.html: не подключён screens/book.js — книги героя нет');
  else if (iB < iH) say('index.html: book.js подключён раньше heroes.js — ему нужен вид героя из heroes.js');
  if (iL < 0) say('index.html: не подключён screens/library.js — шкафа героев нет');
  else if (iL < iB) say('index.html: library.js подключён раньше book.js — ему нужны книга и корешок');
  for (const f of ['heroes', 'book', 'library']) if (!new RegExp(`<link rel="stylesheet" href="screens/${f}\\.css">`).test(html)) say(`index.html: не подключён screens/${f}.css`);
  if (html.indexOf('href="screens/library.css"') < html.indexOf('href="screens/book.css"')) say('index.html: library.css подключён раньше book.css — полка не перекроет книгу');
  for (const [f, t] of [['screens/heroes.js', JS], ['screens/book.js', BJS], ['screens/library.js', LJS]]) { try { new vm.Script(t, { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); } }
  for (const [f, t] of [['screens/heroes.js', JS], ['screens/heroes.css', CSS], ['screens/book.js', BJS], ['screens/book.css', BCSS], ['screens/library.js', LJS], ['screens/library.css', LCSS]]) {
    const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
    if (crlf !== lf) say(`${f}: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}`);
  }
  /* прежнего кода в index.html нет: он переехал в heroes.js или заменён */
  const OLD = [[/function heroes\(\)/, 'экран heroes()'], [/function heroCard\(/, 'прежняя плитка heroCard'], [/function rsCard\(/, 'прежняя плитка rsCard'],
    [/function squadsView\(/, 'прежние отряды squadsView'], [/function rsRouletteCol\(|function rsEchoCol\(|function rsDustCol\(/, 'колонки «За души»'],
    [/const sq = id =>|const sqBM =/, 'прежние sq, sqBM'], [/\n  prep\(o\) \{/, 'прежний лист prep'], [/\n\.hc\{/, 'стили .hc в index.html'],
    [/\n  (?:psq|esq|sqadd|sqnew)\(/, 'прежние действия отрядов'], [/\n  spin\(\) \{/, 'прежняя прокрутка «по очереди»'],
    [/\n  (?:dustbuy|activate|activatedo)\(v\) \{/, 'прежние осколок за прах и пробуждение без номера операции']];
  for (const [re, what] of OLD) if (re.test(main) || (what.startsWith('стили') && re.test(html))) say(`index.html: остался ${what}`);
  /* прежней карточки нет: гребень, рамка ступени по редкости, большая карточка, плитка 4 : 5 */
  for (const [re, what] of [[/function hcCard\(|function hcMarks\(|function hcFr\(|function hcStars\(|function hcMotes\(|function hcTier\(/, 'карточка 9 : 16 с гребнем и рамкой (hcCard, hcMarks, hcFr, hcTier)'],
    [/const HC_ART\b|HC_VIEW\.tier/, 'рамка карточки HC_ART и ступень по редкости HC_VIEW.tier'], [/function hcBig\(|function hcOwnView\(|function hcRsView\(/, 'большая карточка hcBig'],
    [/function hrMineView\(|function rsCollView\(|function rsDetail\(|function rsGoldCard\(|function hrShardRow\(/, 'коллекция до сетки 9 : 16']]) if (re.test(JS)) say(`heroes.js: остался прежний код — ${what}`);
  for (const [re, what] of [[/\.hk-fr\b|\.hk-crest\b|\.hk-orn\b/, 'рамка прежней карточки (.hk-fr, .hk-crest)'], [/\.hcb-g\b|\.hcb-pt\b/, 'большая карточка (.hcb-g, .hcb-pt)'], [/\n\.hc \.cr\{/, 'плитка 4 : 5 (.hc .cr)']]) if (re.test(CSS)) say(`heroes.css: остались стили — ${what}`);
  const souls = main.match(/function rsSoulsView\(\)[\s\S]*?\n\}/);
  if (!souls || !/hrSoulsView\(\)/.test(souls[0])) say('index.html: «За души» (rsSoulsView) не собирает сцену алтаря hrSoulsView');
  if (!/function hrSoulsView\(\)[\s\S]*?rlCol\(\)[\s\S]*?hrSoulsSide\(\)/.test(JS)) say('heroes.js: сцена алтаря hrSoulsView не собирает вход рулетки rlCol и входы hrSoulsSide');
  if (!/\.rs-av::after\{[^}]*var\(--rico\)/.test(CSS)) say('heroes.css: у лица в строке нет кристалла редкости --rico');
  if (!/\.hb-bk>\.hb-cr\{[^}]*var\(--rico\)/.test(BCSS)) say('book.css: у книги нет кристалла редкости --rico');
  if (!/\.hb-bk\{[^}]*aspect-ratio:9\/16/.test(BCSS)) say('book.css: обложка книги — не 9 : 16');
  /* «Навыки» задают две колонки прямо в разметке (heroKitHtml) — на странице книги их перебивает только !important */
  if (/class="hd-cols" style="grid-template-columns:[^" ]+ [^"]+"/.test(html) &&!/\.hb-hd \.hd-cols\{grid-template-columns:minmax\(0,1fr\)!important\}/.test(BCSS))
    say('book.css: «Навыки» на странице книги в две колонки — имя способности наезжает на долю хода');
  /* раскрытая книга берёт вкладки героя из heroDetail без шапки — одна правда вкладок */
  if (!/function heroDetail\(h, o = \{\}\)[\s\S]*?\n\}/.test(main) || !/o\.head === false \? '' : heroHead\(h\)/.test((main.match(/function heroDetail\(h, o = \{\}\)[\s\S]*?\n\}/) || [''])[0])) say('index.html: heroDetail не умеет без шапки (o.head === false) — книге нечего взять');
  if (!/heroDetail\(h, \{ head: false/.test(BJS)) say('book.js: раскрытая книга не берёт вкладки героя из heroDetail');
  /* анимации книги — только transform и opacity; при «меньше движения» — без полёта и листов */
  for (const [f, t] of [['heroes.css', CSS], ['book.css', BCSS], ['library.css', LCSS]]) for (const [, n, b] of t.matchAll(/@keyframes\s+((?:hk|hb|lb)-[\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
    const bad = [...b.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]).filter(p => !['transform', 'opacity'].includes(p));
    if (bad.length) say(`${f}: @keyframes ${n} меняет ${[...new Set(bad)].join(', ')} — только transform и opacity`);
  }
  if (!/@media \(prefers-reduced-motion:reduce\)\{[^}]*\.hb-win \.hb-anim,\.hb-win \.hb-skip\{display:none\}/.test(BCSS)) say('book.css: при «меньше движения» полёт и листы книги не прячутся');
  if (!/\.hb-win\.fade \.hb-stage,\.hb-win\.fade \.hb-scrim\{animation-duration:var\(--t-fade\)!important\}/.test(BCSS)) say('book.css: при «меньше движения» нет плавной смены (перебить общее правило !important)');
  if (!/\.hb-fx i\{animation:none/.test(BCSS)) say('book.css: при «меньше движения» угольки гримуара не стоят');
  /* шкаф: пыль и свет лампад при «меньше движения» стоят, книга с нижней полки встаёт плавной сменой; корешок без перехода */
  const lrm = (LCSS.match(/@media \(prefers-reduced-motion:reduce\)\{([\s\S]*?)\n\}/) || [])[1] || '';
  if (!/\.lb-dust i\{animation:none/.test(lrm) || !/\.lb-lamp::before\{animation:none\}/.test(lrm) || !/\.lb-slot\.rise>\.hb\{animation-name:lb-fade\}/.test(lrm)) say('library.css: при «меньше движения» пыль, лампады или книга, встающая на место, движутся');
  if (!/\.hb-win\.in \.hb-r1\{animation:hb-pull/.test(BCSS) || !/\.hb-win\.in \.hb-r2\{animation:hb-face/.test(BCSS)) say('book.css: при открытии книга не выдвигается с полки корешком и не разворачивается обложкой');
  if (/mask(?:-image)?:\s*url\(/.test(LCSS)) say('library.css: маска-картинка — у страницы с диска она не грузится');
  for (const t of ['2', '3', '4', '5']) if (!new RegExp(`\\[data-t="${t}"\\]\\{--hb-mat:`).test(BCSS)) say(`book.css: без арта нет вида книги ступени ${t}`);
  if (/mask(?:-image)?:\s*url\(/.test(BCSS) || /mask-image/.test(BJS)) say('book: маска-картинка — у страницы с диска она не грузится; цвет редкости — наложением по контуру clip-path');
}
if (err.length) done();

/* ================== песочница ==================
   o.clock — свои часы: performance.now и setTimeout по очереди задач, tick(мс) двигает время; o.reduced — «меньше движения» */
function load(o = {}) {
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, prepend() {}, remove() {},
      animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, select() {}, clientWidth: 1200, clientHeight: 800 };
    e.querySelector = () => stubEl();
    return e;
  };
  const rootCls = new Set(), root = stubEl('html'), rootVars = {};
  root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
  root.style = { setProperty: (k, v) => { rootVars[k] = v; } };
  const els = {};
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null, baseURI: 'file:///ui/index.html' };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const clock = { now: 0, q: [], id: 0 }, lis = {};   // lis — слушатели окна: событие en-render проверка зовёт сама
  const timers = o.clock ? { setTimeout: (f, ms) => { const id = ++clock.id; clock.q.push({ id, at: clock.now + Math.max(0, +ms || 0), f }); return id; }, clearTimeout: id => { clock.q = clock.q.filter(t => t.id !== id); } }
    : { setTimeout: () => 0, clearTimeout() {} };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener: (t, f) => { (lis[t] = lis[t] || []).push(f); }, removeEventListener() {}, dispatchEvent() {}, matchMedia: q => ({ matches: !!o.reduced && /prefers-reduced-motion/.test(q), addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, ...timers, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => clock.now }, URL };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, SCREENS, FLOWS, KH, RS, RSI, EB, INV, H, SQ, MAP, BAG, render, initialState, setTeam, rsPool, rsCyc, rsHas, rsFrom, rsWeek, rsGold, rsBought, fmt, RAR, ROMAN,
    heroCard, rsCard, heroHead, rsHead, hrV, hrMine, hrOwn, hrDustCat, rsRow, heroDetail, rsSetWeek, sq, HR_DATA, hrStage, hrBaseBm,
    hrTile, hrHead, RP_VIEW: typeof RP_VIEW !== 'undefined' ? RP_VIEW : null, heroDev: typeof heroDev === 'function' ? heroDev : null, rpNext: typeof rpNext === 'function' ? rpNext : null,
    HC_VIEW, HC_SORT, hcNum, hcView, hcOwnList, hcCatList, hcMax, heroKit, hrDraft,
    HB_VIEW, HB_ART, HB_KIT, hbCard, hbBlank, hbWin, hbTier, hbKitHtml, hbTimes, hbFlight, hbOpenFx, hbTurnFx, hbLayer, hbRsBook,
    rsDustable, rsDustOf, rsTiers, dnSets, dnSet, DN_SRV, DN_ART, zpCardHero: typeof zpCardHero === 'function' ? zpCardHero : null,
    ART_ICONS: typeof ART_ICONS !== 'undefined' ? ART_ICONS : null, shardGhost: typeof shardGhost === 'function' ? shardGhost : null, hcFace,
    shardCls: typeof shardCls === 'function' ? shardCls : null, shardClsSvg: typeof shardClsSvg === 'function' ? shardClsSvg : null,
    DU_ART: typeof DU_ART !== 'undefined' ? DU_ART : null, DU_VIEW: typeof DU_VIEW !== 'undefined' ? DU_VIEW : null, SOUL_SRV: typeof SOUL_SRV !== 'undefined' ? SOUL_SRV : null,
    RS_ART: typeof RS_ART !== 'undefined' ? RS_ART : null, rsShardPrice, duCat: typeof duCat === 'function' ? duCat : null, hrSoulsView: typeof hrSoulsView === 'function' ? hrSoulsView : null, KIT_EXTRA,
    BM: typeof BM !== 'undefined' ? BM : null, BM_SRC0: typeof BM_SRC0 !== 'undefined' ? BM_SRC0 : null, bmInit0: typeof bmInit0 === 'function' ? bmInit0 : null,
    BF: window.EN_BIOME_FOES || null, CLAN: window.EN_CLAN || null, EC: window.EnClan || null, AD: window.EN_ARENA || null, ARU: window.EN_ARENA_UI || null, ECHO: window.EN_ECHO || null,
    TB: typeof TB !== 'undefined' ? TB : null, TL_SRV: typeof TL_SRV !== 'undefined' ? TL_SRV : null, tlMul: typeof tlMul === 'function' ? tlMul : null, tlWhy: typeof tlWhy === 'function' ? tlWhy : null,
    EQ_SRV: typeof EQ_SRV !== 'undefined' ? EQ_SRV : null, eqMulOf: typeof eqMulOf === 'function' ? eqMulOf : null, eqWornList: typeof eqWornList === 'function' ? eqWornList : null,
    collRp, collHero, collPct, collRule, EV: window.EN_EV || null, wsGive: typeof wsGive === 'function' ? wsGive : null, RX: typeof EN_RECIPES !== 'undefined' ? EN_RECIPES : null, hrBuild,
    LB_VIEW, LB_ART, lbCols, lbFrame, lbVars, lbKitHtml, hbSpine, hbSpineR, hbIsSpine, SHELL_SIZE, hbTimes, curImg,
  })`, ctx);
  const tick = ms => {
    const end = clock.now + ms;
    for (;;) {
      clock.q.sort((a, b) => a.at - b.at || a.id - b.id);
      const t = clock.q[0]; if (!t || t.at > end) break;
      clock.q.shift(); clock.now = t.at;
      try { t.f(); } catch (e) { say(`таймер: исключение — ${e.message}`); }
    }
    clock.now = end;
  };
  return { T, els, doc: document, rootCls, rootVars, clock, tick, listeners: t => lis[t] || [], game: () => (els.game ? els.game.innerHTML : '') };
}
const P = load(), T = P.T;
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
/* разметка без исключений, undefined и NaN; в режиме «Игрок» — без служебных слов в тексте и подсказках */
function scan(h, where, TT = T) {
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!TT.KH.team) {
    cnt.player++;
    const v = strip(h), txt = playerText(h).split('\n').concat(tips(v));
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
  }
  return h;
}
/* часы этой песочницы стоят: показ анимации снимаем перед отрисовкой — разметка книги без полёта (анимация — раздел 8, свои часы) */
const calm = () => { if (T.S.hb) T.S.hb.anim = null; };
function view(where) { cnt.views++; calm(); run(where, () => T.render()); return scan(P.game(), where); }
const fresh = () => { T.S = T.initialState(); T.S.overlay = null; };
/* книги — кнопки .hb; безымянные — .hb.blank; раскрытая книга — слой .hb-win (без частей анимации) */
const booksOf = h => [...h.matchAll(/<button class="hb[ "][\s\S]*?<\/button>/g)].map(m => m[0]);
const cardsOf = h => booksOf(h).filter(b => !/^<button class="hb blank/.test(b));
const cardOf = (h, id) => cardsOf(h).find(c => c.includes(`data-v="${id}"`)) || '';
const winOf = h => { const i = h.indexOf('<div class="hb-win'); if (i < 0) return ''; const s = h.slice(i), a = s.indexOf('<div class="hb-anim'); return a < 0 ? s : s.slice(0, a); };
const ovOf = h => { const i = h.indexOf('<div class="ov'); return i < 0 ? '' : h.slice(i); };
const count = (s, re) => (s.match(re) || []).length;
const TOP = () => T.INV.hero.capByLim.length - 1;
const nxOf = h => (h && T.rpNext ? T.rpNext(h) : '');
const need = () => T.RS.rules.stub.shards;
const tierOf = maxV => Math.max(1, Math.min(5, maxV || 1));
const shortBM = n => { if (n < T.HC_VIEW.short) return T.fmt(n); const [d, s] = n >= 1000000 ? [100000, 'М'] : [100, 'К'], k = Math.floor(n / d); return `${T.fmt(Math.floor(k / 10))}${k % 10 ? ',' + (k % 10) : ''}${s}`; };
/* замки: состояния I…V сверху вниз — on, off, wait, ready */
const locksOf = t => { const m = t.match(/<span class="hb-lk" aria-hidden="true">([\s\S]*?)<\/span>/); return m ? [...m[1].matchAll(/<i class="hb-l (on|off|wait|ready)"><\/i>/g)].map(x => x[1]) : null; };
function checkLocks(t, where, lim, nx) {
  const L = locksOf(t), want = Array.from({ length: TOP() }, (_, k) => k < lim ? 'on' : k === lim && nx ? nx : 'off');
  if (!L) { say(`${where}: нет замков рунных пределов`); return; }
  if (L.join(' ') !== want.join(' ')) say(`${where}: замки «${L.join(' ')}», ждали «${want.join(' ')}»`);
  if (/class="rp-s/.test(t)) say(`${where}: на книге остались рунные камни — пределы теперь замки`);
}
const ribsOf = t => { const m = t.match(/<span class="hb-rb" style="--n:(\d+)" aria-hidden="true">([\s\S]*?)<\/span>/); return m ? { n: +m[1], all: count(m[2], /<i class="(?:on|)"><s><\/s><b><\/b><\/i>/g), on: count(m[2], /<i class="on">/g) } : { n: 0, all: 0, on: 0 }; };

/* ================== 2. книга — одна анатомия ================== */
/* x: r, valor, maxV, own, lim, lvl, cap, bm, nx, el, gray, soul, shard [n, need], img (id портрета) или sil, z */
function checkBook(t, where, x) {
  cnt.cards++;
  if (!t) { say(`${where}: нет книги`); return; }
  const z = x.z || 'l', tier = tierOf(x.maxV), st = x.own ? 3 : x.soul ? 1 : 2;
  if (!t.includes(`data-r="${x.r}"`)) say(`${where}: у книги нет редкости data-r="${x.r}"`);
  if (!t.includes(`data-t="${tier}"`)) say(`${where}: книга не ${tier}-й ступени (максимум доблести ${x.maxV})`);
  if (!t.includes(`data-s="${st}"`)) say(`${where}: стадия книги не ${st}`);
  if (!t.includes(`data-z="${z}"`)) say(`${where}: размер книги не ${z}`);
  if (!/<i class="hb-cr" aria-hidden="true"><\/i>/.test(t)) say(`${where}: нет кристалла редкости`);
  const R = ribsOf(t), taken = x.own && !x.gray ? x.valor : 0;
  if ((x.maxV || 0) !== R.all || R.n !== (x.maxV || 0) || R.on !== taken) say(`${where}: лент ${R.all} (взятых ${R.on}), ждали ${x.maxV || 0} (взятых ${taken})`);
  if (z === 'l' && !/icons\/cls-[a-z]+\.png/.test(t)) say(`${where}: нет щита класса`);
  if (z !== 's' && x.el && !t.includes(`<span class="hb-el"><span class="el bare" data-el="${x.el}"`)) say(`${where}: нет стихии «${x.el}» медальоном`);
  if (z === 's' && /class="hb-(?:el|nm|cls)"/.test(t)) say(`${where}: у мелкой книги лишнее — стихия, имя или класс (только главное)`);
  if (/class="rs-ph"|class="hsg-init"/.test(t)) say(`${where}: инициалы вместо портрета`);
  if (x.img && !x.soul && !t.includes(`heroes/${x.img}.jpg`)) say(`${where}: портрет — не рисунок героя ${x.img}`);
  if (x.soul && /heroes\/[\w-]+\.jpg/.test(t.replace(/<span class="hsg[\s\S]*?<\/span><\/span>/g, ''))) say(`${where}: у неизвестной души виден портрет — должен быть силуэт класса`);
  if ((x.sil || x.soul) && !/class="hk-sil"/.test(t)) say(`${where}: нет силуэта класса`);
  const own = x.own && !x.gray;
  if (own) {
    checkLocks(t, where, x.lim, x.nx || '');
    if (!new RegExp(`<span class="hb-lv(?: w4)?" title="Уровень ${x.lvl} из ${x.cap}"><b class="num">${x.lvl}</b></span>`).test(t)) say(`${where}: нет уровня ${x.lvl} в круге`);
    if (x.bm != null && !t.includes(`<b class="num">${shortBM(x.bm)}</b>`)) say(`${where}: мощь на книге не ${shortBM(x.bm)} (BM.hero ${x.bm})`);
    const mx = x.maxV > 0 && x.valor >= x.maxV && x.lim >= TOP() && x.lvl >= x.cap;
    if (mx !== / data-max="1"/.test(t)) say(`${where}: отметка «путь пройден» ${mx ? 'не стоит у пройденного пути' : 'стоит раньше времени'}`);
  } else {
    if (locksOf(t)) say(`${where}: у героя вне коллекции — замки пределов, а пределов у него нет`);
    if (/class="hb-lv/.test(t)) say(`${where}: у героя вне коллекции — уровень`);
    if (z === 'l' && x.bm != null && !t.includes(`<b class="num">${shortBM(x.bm)}</b>`)) say(`${where}: у героя вне коллекции нет мощи по базовым статам ${shortBM(x.bm)}`);
  }
  if (!!x.gray !== /^<button class="hb[^"]* gray/.test(t)) say(`${where}: ${x.gray ? 'известный, но не купленный — не чёрно-белый' : 'чёрно-белый без причины'}`);
  if (!!x.soul !== /^<button class="hb[^"]* soul/.test(t)) say(`${where}: ${x.soul ? 'неизвестная душа — без своего вида' : 'вид неизвестной души у найденного'}`);
  if (x.shard) {
    const m = t.match(/<span class="hk-sh( full)?" title="Осколки (\d+) из (\d+)">([\s\S]*?)<\/small><\/span>/);
    if (!m || +m[2] !== x.shard[0] || +m[3] !== x.shard[1]) say(`${where}: полоса осколков не ${x.shard[0]} из ${x.shard[1]}`);
    else { if (!m[4].includes('class="hsg"')) say(`${where}: в полосе осколков нет стекла`); if (!!m[1] !== x.shard[0] >= x.shard[1]) say(`${where}: полный комплект не светится`); }
  } else if (/class="hk-sh/.test(t)) say(`${where}: полоса осколков у героя без осколков`);
  const fx = /class="hb-fx"/.test(t), wantFx = tier >= 5 && !x.gray;
  if (fx !== wantFx) say(`${where}: угольки гримуара ${wantFx ? 'пропали' : 'не у гримуара или у чёрно-белого'}`);
}
const accX = h => ({ r: h.r, valor: h.valor, maxV: h.maxV, own: true, lim: h.lim, lvl: h.lvl, cap: h.cap, bm: T.BM.hero(h), nx: nxOf(h), el: h.el });
const rsX = (h, o = {}) => Object.assign({ r: h.r, valor: 0, maxV: h.maxV, own: false, el: h.sch, bm: T.hrBaseBm(h), soul: T.hrStage(h) === 1 }, o);

/* ================== 2а. «Мои» — купленные герои, порядок и фильтр ================== */
const collView = (tag, o = {}) => { T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.overlay = null; T.S.hview = o.all ? 'all' : 'own'; calm(); return view(tag); };
const gridOf = h => { const i = h.indexOf('<div class="hkg'); if (i < 0) return ''; const s = h.slice(i), j = s.indexOf('<div class="hb-win'); return j < 0 ? s : s.slice(0, j); };
const idsOf = h => cardsOf(gridOf(h)).map(c => (c.match(/data-v="([^"]+)"/) || [])[1]);
fresh();
{
  const mine = T.hrMine();
  if (mine.length !== 16) say(`коллекция: у демо героев аккаунта ${mine.length}, по демо-аккаунту (ADR-0031, п. 17) — 16`);
  const h = collView('коллекция · мои'), ids = idsOf(h);
  if (ids.length !== mine.length) say(`«Мои»: книг ${ids.length}, героев аккаунта ${mine.length}`);
  if (/<button class="hc[ "]/.test(gridOf(h))) say('«Мои»: в сетке остались плитки 4 : 5 вместо книг');
  if (/<div class="hb-win/.test(h)) say('«Мои»: книга раскрыта без нажатия');
  if (!h.includes(`в коллекции ${T.fmt(mine.length)} из ${T.fmt(T.RS.heroes.length)}`)) say('«Мои»: нет счётчика масштаба «в коллекции N из M» (решение автора 30.09.2026)');
  for (const x of mine) {
    const img = !T.RSI[x.id] ? null : T.RS_ART && T.RS_ART.has(x.id) ? x.id : null;
    checkBook(cardOf(h, x.id), `«Мои» · ${x.name}`, Object.assign(accX(x), img ? { img } : !T.RSI[x.id] ? {} : { sil: true }));
    if (!cardOf(h, x.id).includes(`data-a="hc" data-v="${x.id}"`)) say(`«Мои» · ${x.name}: нажатие на книгу её не открывает`);
    if (!T.hrV(x).rh) say(`«Мои» · ${x.name}: нет записи в составе`);
  }
  /* по мощи, сильнейшие сверху — по умолчанию */
  const byBm = mine.slice().sort((a, b) => T.BM.hero(b) - T.BM.hero(a)).map(x => x.id);
  if (ids.join() !== byBm.join()) say(`«Мои»: порядок не по мощи — ${ids.slice(0, 4).join(', ')}…, ждали ${byBm.slice(0, 4).join(', ')}…`);
  if (T.S.hf.sort !== 'bm' || T.HC_SORT.own[0][0] !== 'bm') say('«Мои»: порядок по умолчанию — не по мощи');
  if (!h.includes('<option value="bm" selected>')) say('«Мои»: в списке порядка не выбрано «По мощи»');
  for (const [k, f] of [['r', x => x.r], ['lvl', x => x.lvl], ['valor', x => x.valor]]) {
    T.S.hf.sort = k;
    const got = idsOf(collView(`«Мои» · порядок ${k}`)), want = mine.slice().sort((a, b) => f(b) - f(a) || T.BM.hero(b) - T.BM.hero(a)).map(x => x.id);
    if (got.join() !== want.join()) say(`«Мои»: порядок «${k}» — ${got.slice(0, 4).join(', ')}…, ждали ${want.slice(0, 4).join(', ')}…`);
  }
  T.S.hf.sort = 'bm';
  const twin = x => T.hrV(x).rh;
  const tries = [['cls', 'танк', x => twin(x).cl[0] === 'танк'], ['el', 'Огонь', x => x.el === 'Огонь'], ['r', 2, x => x.r === 2], ['c', 2, x => x.cycle === 2]];
  for (const [k, v, f] of tries) {
    run(`фильтр ${k}`, () => T.ACT.hcf(`${k}:${v}`));
    const g = collView(`«Мои» · фильтр ${k}`), got = idsOf(g), want = mine.filter(f).sort((a, b) => T.BM.hero(b) - T.BM.hero(a)).map(x => x.id);
    if (got.join() !== want.join()) say(`«Мои» · фильтр ${k}=${v}: книги ${got.join(', ') || 'нет'}, ждали ${want.join(', ') || 'нет'}`);
    if (!g.includes(`${want.length} из ${mine.length}`)) say(`«Мои» · фильтр ${k}: нет счётчика «${want.length} из ${mine.length}»`);
    if (!/class="iconbtn hk-fb on"[^>]*>[\s\S]*?<b class="num">1<\/b>/.test(g)) say(`«Мои» · фильтр ${k}: у кнопки фильтра нет числа выбранного`);
    run(`фильтр ${k} · снять`, () => T.ACT.hcf(`${k}:${v}`));
    if (T.S.hf[k]) say(`«Мои» · фильтр ${k}: повторное нажатие не сняло фильтр`);
  }
  run('фильтр · пусто', () => { T.ACT.hcf('cls:фармер'); T.ACT.hcf('el:Тьма'); });
  { const g = collView('«Мои» · никого'); if (idsOf(g).length || !g.includes('data-a="hcclr"')) say('«Мои»: фильтр без героев — нет пустой строки со «Сбросить»'); }
  run('фильтр · сброс', () => T.ACT.hcclr());
  if (['cls', 'el', 'r', 'c', 'src'].some(k => T.S.hf[k])) say('«Мои»: «Сбросить» не снял все фильтры');
  T.S.overlay = { t: 'hcflt', arg: 'own' };
  { const o = ovOf(view('лист фильтра')); for (const g of ['Класс', 'Стихия', 'Редкость', 'Цикл']) if (!o.includes(`<span class="eyebrow">${g}</span>`)) say(`лист фильтра: нет группы «${g}»`);
    if (count(o, /data-a="hcf" data-v="cls:/g) !== T.RS.classes.length || count(o, /data-a="hcf" data-v="r:/g) !== 7) say('лист фильтра: не все классы или редкости');
    if (!/icons\/cls-[a-z]+\.png/.test(o) || !/class="hkf-cr" data-r="7"/.test(o) || !/class="el bare"/.test(o)) say('лист фильтра: класс, редкость и стихия — не значками');
    if (o.includes('data-v="src:')) say('лист фильтра «Моих»: группа «Откуда» — она только у каталога');
    if (!o.includes(`Подходит героев: <b class="num">${mine.length}</b>`)) say('лист фильтра: не сказано, сколько героев подходит'); }
  T.S.overlay = null;
}

/* ================== 2б. стадии знакомства с героем ==================
   Независимое правило (решение автора 30.09.2026 и поправка): в коллекции — 3; будущий цикл — 0; за золото и донатные — 2; иначе по
   осколкам в запасах: комплект — 2, хоть один — 1, ни одного — 0. Рецепт стадию не меняет */
const stageOf = (h, S) => { if (T.rsHas(h)) return 3; if (h.c > T.rsCyc()) return 0; if (h.src === 'gold' || h.src === 'donat') return 2; const n = S.rs.shards[h.id] || 0; return n >= need() ? 2 : n > 0 ? 1 : 0; };
{
  for (let c = 1; c <= 6; c++) {
    fresh(); T.S.acc.cycle = c;
    const R = T.RS.heroes; let bad = 0;
    for (const h of R) { cnt.stage++; if (T.hrStage(h) !== stageOf(h, T.S) && ++bad <= 3) say(`стадии · цикл ${c} · ${h.n}: ${T.hrStage(h)}, по правилу ${stageOf(h, T.S)}`); }
    const found = R.filter(h => stageOf(h, T.S) >= 1), h = collView(`каталог · цикл ${c}`, { all: true }), ids = idsOf(h), shown = new Set(ids);
    if (ids.length !== found.length) say(`каталог · цикл ${c}: книг ${ids.length}, найденных героев ${found.length}`);
    const ghost = R.find(x => !stageOf(x, T.S) && shown.has(T.hrV(x).id));
    if (ghost) say(`каталог · цикл ${c}: виден не найденный ${ghost.n} — его показывать нельзя`);
    if (!h.includes(`найдено ${T.fmt(found.length)} из ${T.fmt(R.length)}`) || !h.includes(`>Каталог · ${found.length}<`)) say(`каталог · цикл ${c}: нет счётчика «найдено ${found.length} из ${R.length}»`);
    const cyc = ids.map(id => (T.H(id) ? T.H(id).cycle : T.RSI[id].c)); if (cyc.some((x, i) => i && x < cyc[i - 1])) say(`каталог · цикл ${c}: не по циклу`);
  }
  /* книги каталога по стадиям: неизвестная душа — силуэт и полоса осколков, известный — чёрно-белый, комплект — в цвете */
  fresh(); T.S.acc.cycle = 3;
  const rl = T.RS.heroes.filter(h => h.src === 'roulette' && h.c <= 3), N = need();
  const a = rl.find(h => T.RS_ART && T.RS_ART.has(h.id) && !T.rsHas(h)), b = rl.find(h => h !== a && !T.rsHas(h));
  T.S.rs.shards = {}; T.S.rs.shards[a.id] = 7; T.S.rs.shards[b.id] = N;
  const g = collView('каталог · стадии', { all: true }), gold = T.RS.heroes.find(h => h.src === 'gold' && h.c <= 3 && !T.rsHas(h));
  checkBook(cardOf(g, a.id), 'каталог · неизвестная душа', rsX(a, { soul: true, shard: [7, N] }));
  checkBook(cardOf(g, b.id), 'каталог · комплект осколков', rsX(b, { soul: false, shard: [N, N], img: T.RS_ART.has(b.id) ? b.id : null }));
  checkBook(cardOf(g, gold.id), 'каталог · известный за золото', rsX(gold, { gray: true, img: T.RS_ART.has(gold.id) ? gold.id : null, sil: !T.RS_ART.has(gold.id) }));
  if (cardOf(g, rl.find(h => h !== a && h !== b && !T.rsHas(h)).id)) say('каталог: виден герой рулетки без единого осколка');
  /* нажатие: найденный — книга поверх каталога, не найденный — ничего; «Назад» — в каталог */
  run('каталог · нажатие', () => T.ACT.hc(a.id));
  if (T.S.hview !== 'rs' || T.S.rs.sel !== a.id) say('каталог: нажатие на неизвестную душу не открыло её книгу');
  let w = winOf(view('каталог · книга неизвестной души'));
  if (!w || !w.includes('Неизвестная душа') || /data-v="rhero:(?:who|skills|path)"/.test(w) || /class="rot-list"|class="chaps"|class="quote|class="lore/.test(w)) say('неизвестная душа: в книге видны сведения — история, навыки или путь');
  if (!w.includes(`${T.fmt(7)} / ${T.fmt(N)}`) || !w.includes('Возрождении душ')) say('неизвестная душа: в книге нет осколков «собрано / нужно» или где их брать');
  if (/data-a="hczoom"/.test(w) || /heroes\/[\w-]+\.jpg/.test(w.replace(/<span class="hsg[\s\S]*?<\/span><\/span>/g, ''))) say('неизвестная душа: в книге виден портрет или его можно открыть крупно');
  if (!w.includes(`data-a="rsgo" data-v="${a.id}"`)) say('неизвестная душа: нет пути туда, где берут осколки');
  run('каталог · назад', () => T.ACT.hcback()); if (T.S.hview !== 'all') say('каталог: «Назад» из книги не вернул в каталог');
  const z0 = rl.find(h => !T.rsHas(h) && !T.S.rs.shards[h.id]);
  run('каталог · не найден', () => T.ACT.hc(z0.id)); if (T.S.hview === 'rs' && T.S.rs.sel === z0.id) say('каталог: книга не найденного героя открылась');
  run('не найден · окно', () => T.ACT.rhero(z0.id)); if (T.S.overlay && T.S.overlay.t === 'rhero') say('книга не найденного героя открылась окном');
  T.S.overlay = { t: 'rhero', arg: z0.id }; if (ovOf(view('не найден · окно силой'))) say('окно книги не найденного героя нарисовано');
  T.S.overlay = null;
  run('каталог · свой', () => T.ACT.hc('h2')); if (T.S.hview !== 'mine' || T.S.selHero !== 'h2' || T.S.hgrid !== 'all') say('каталог: нажатие на своего не открыло его книгу поверх каталога');
  run('каталог · назад 2', () => T.ACT.hcback()); if (T.S.hview !== 'all') say('каталог: «Назад» из книги своего не вернул в каталог');
  /* фильтр «Откуда» — только в каталоге */
  run('каталог · Эхо', () => T.ACT.hcf('src:roulette'));
  const gr = collView('каталог · рулетка', { all: true }), gotR = idsOf(gr), wantR = T.RS.heroes.filter(x => x.src === 'roulette' && stageOf(x, T.S) >= 1).map(x => T.hrV(x).id);
  if (gotR.slice().sort().join() !== wantR.slice().sort().join()) say(`каталог · «Откуда: рулетка»: книг ${gotR.length}, найденных героев рулетки ${wantR.length}`);
  T.S.overlay = { t: 'hcflt', arg: 'all' }; if (!ovOf(view('лист фильтра каталога')).includes('data-v="src:echo"')) say('лист фильтра каталога: нет группы «Откуда»');
  T.S.overlay = null; run('каталог · сброс', () => T.ACT.hcclr());
  /* рецепт крафтового героя кладёт комплект осколков, а не героя (поправка автора 30.09.2026): найденный рецепт стадию не меняет,
     выданный комплект — «известен», дальше пробуждение за души; у пробуждённого осколки — в прах */
  if (!T.wsGive || !T.RX) say('рецепт героя: нет выдачи итога мастерской (wsGive) или данных рецептов');
  else {
    fresh();
    const it = T.RX.items.find(i => i.tier === 'hero' && T.RSI[i.heroId] && !T.rsHas(T.RSI[i.heroId]) && T.RSI[i.heroId].c <= T.rsCyc());
    if (!it) say('рецепт героя: в данных рецептов нет героя вне коллекции');
    else {
      const h = T.RSI[it.heroId]; delete T.S.rs.shards[h.id];
      if (T.hrStage(h) !== 0) say(`рецепт героя: ${h.n} до выдачи — стадия ${T.hrStage(h)}, ждали «не найден»`);
      run('рецепт героя', () => T.wsGive(it.id, 1));
      if (T.rsHas(h)) say(`рецепт героя: ${h.n} сразу в коллекции — ждали комплект осколков`);
      if ((T.S.rs.shards[h.id] || 0) !== need() || T.hrStage(h) !== 2) say(`рецепт героя: осколков ${T.S.rs.shards[h.id] || 0}, стадия ${T.hrStage(h)} — ждали комплект ${need()} и «известен»`);
      const own = T.hrMine().map(x => T.RSI[x.id] || null).find(Boolean) || T.RS.heroes.find(x => T.rsHas(x) && T.RSI[x.id]), d0 = T.S.wallet.dust;
      const oi = own && T.RX.items.find(i => i.tier === 'hero' && i.heroId === own.id);
      if (oi) { run('рецепт героя · уже в коллекции', () => T.wsGive(oi.id, 1)); if (T.S.wallet.dust !== d0 + need() * T.rsDustOf(own)) say('рецепт героя: у пробуждённого осколки не ушли в прах'); }
    }
  }
  /* сервер праха не продаёт первый осколок: героя сначала находят в Возрождении душ */
  fresh(); T.S.acc.cycle = 3; T.S.rs.shards = {}; T.S.wallet.dust = 1e6;
  const r0 = T.RS.heroes.find(h => h.src === 'roulette' && h.c <= 3 && !T.rsHas(h)), rr = T.SOUL_SRV.buy('du' + T.S.du.seq, r0.id, 1);
  if (rr.refuse !== 'unknown' || T.S.rs.shards[r0.id]) say(`лавка праха: первый осколок не найденного героя продан (${JSON.stringify(rr).slice(0, 80)})`);
}

/* ================== 2г. силуэт класса в окне: фигура целиком ==================
   Замечание автора 30.09.2026: «заглушка Лучницы получилась не очень удачная — она обрезана». Силуэт класса (у неизвестной души и героя
   без портрета) вписан кадром фигуры с оружием (ART_ICONS.clsFit) в поле окна (.hk-fit): обложка каждой ступени и размера, страница
   портрета раскрытой книги, крупный план. Поле — окно без полос --st, --sb, --sx, где знаки, плашки и рама; модель — формула
   .hk-fit>img.fit из heroes.css: масштаб по меньшему, кадр посередине, низ кадра — на нижней границе поля. Проверка: кадр внутри поля
   и внутри окна (не под рамой), поле не под кругами, плашкой имени и знаками страницы */
{
  const A = T.ART_ICONS, F = A && A.clsFit;
  const jpgSize = f => { const b = fs.readFileSync(f); for (let i = 2; i < b.length - 9;) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + len; } return null; };
  const byKey = new Map();
  for (const h of T.RS.heroes) { const k = T.shardCls ? T.shardCls(h) : ''; if (k && !byKey.has(k)) byKey.set(k, h); }
  const keys = [...byKey.keys()];
  if (!F || !Number.isInteger(F.ratio) || !F.box) say('силуэт: нет кадра фигуры ART_ICONS.clsFit');
  else if (keys.length < 7) say(`силуэт: классов в составе ${keys.length} — ждали семь силуэтов`);
  else {
    for (const k of keys) {
      const b = F.box[k], p = path.join(UI, 'assets', 'art', A.cls(k)), sz = fs.existsSync(p) ? jpgSize(p) : null;
      if (!b) { say(`силуэт ${k}: нет кадра фигуры в ART_ICONS.clsFit`); continue; }
      if (b.some(v => !Number.isInteger(v) || v < 0 || v > 1000) || b[0] >= b[2] || b[1] >= b[3]) say(`силуэт ${k}: кадр ${b.join(', ')} — не целые тысячные доли рисунка`);
      if (!sz) say(`силуэт ${k}: нет рисунка ${A.cls(k)}`);
      else if (Math.abs(Math.round(sz[0] * 1000 / sz[1]) - F.ratio) > 1) say(`силуэт ${k}: рисунок ${sz[0]} × ${sz[1]}, а ratio в данных ${F.ratio}`);
      /* hcFace кладёт кадр в поле; SVG без выгрузки — «вписать», не «заполнить» */
      const f = T.hcFace(Object.assign(T.hrV(byKey.get(k)), { st: 1 }));
      if (!f.includes(`<span class="hk-fit"><img class="fit" style="--bx:${b[0]};--by:${b[1]};--bw:${b[2] - b[0]};--bh:${b[3] - b[1]};--ir:${F.ratio}"`)) say(`силуэт ${k}: в окне книги рисунок не вписан кадром фигуры в поле`);
      if (T.shardClsSvg && !T.shardClsSvg(k, true).includes('preserveAspectRatio="xMidYMax meet"')) say(`силуэт ${k}: SVG без выгрузки заполняет окно и обрезает фигуру`);
    }
    /* формула в стилях — та же, что в модели ниже */
    const fitCss = (CSS.match(/\.hk-fit>img\.fit\{[^}]*\}/) || [''])[0];
    if (!/\.hk-fit\{position:absolute;top:var\(--st,0px\);bottom:var\(--sb,0px\);left:var\(--sx,0px\);right:var\(--sx,0px\);[^}]*container-type:size/.test(CSS)
      || !fitCss.includes('left:50%;bottom:0;') || !fitCss.includes('height:min(calc(100cqh * 1000 / var(--bh)),calc(100cqw * 1000000 / (var(--bw) * var(--ir))))')
      || !fitCss.includes('transform:translate(calc(-1% * (var(--bx) + var(--bw) / 2) / 10),calc(1% * (1000 - var(--by) - var(--bh)) / 10))')) say('силуэт: в heroes.css нет поля .hk-fit или формулы вписывания кадра — модель проверки с ними не сходится');
    /* поля окон: обложка — в долях ширины книги (cqw контейнера .hb-bk), страница портрета и крупный план — в px */
    const ins = (t, sel, u) => { const m = t.match(new RegExp(sel.replace(/[.[\]"=>]/g, x => '\\' + x) + `\\{--st:(\\d+)${u};--sb:(\\d+)${u}(?:;--sx:(\\d+)${u})?\\}`)); return m ? [+m[1], +m[2], m[3] != null ? +m[3] : null] : null; };
    const pl = ins(BCSS, '.hb-ph .hk-sil', 'cqw'), ps = ins(BCSS, '.hb[data-z="s"] .hb-ph .hk-sil', 'cqw'), pp = ins(BCSS, '.hb-por .hk-sil', 'px'), pz = ins(CSS, '.hcz-ph .hk-sil', 'px');
    if (/\.hk-sil\{[^}]*container-type/.test(CSS)) say('силуэт: .hk-sil — контейнер, поле обложки в долях ширины книги (cqw) считается не от книги');
    if (!pl || !ps || !pp || !pz || pl[2] == null || pp[2] == null || pz[2] == null) say('силуэт: у окон нет поля силуэта (--st, --sb, --sx): обложка, мелкая книга, страница портрета, крупный план');
    else {
      if (ps[2] == null) ps[2] = pl[2];
      /* модель: поле W × H (px) → прямоугольник фигуры в координатах окна (сдвиг поля ox, oy) */
      const fitRect = (W, H, ox, oy, b) => {
        const bw = b[2] - b[0], bh = b[3] - b[1], ih = Math.min(H * 1000 / bh, W * 1e6 / (bw * F.ratio)), iw = ih * F.ratio / 1000;
        const left = W / 2 - (b[0] + bw / 2) / 1000 * iw, top = H + (1000 - b[3]) / 1000 * ih - ih;
        return { x0: ox + left + b[0] / 1000 * iw, x1: ox + left + b[2] / 1000 * iw, y0: oy + top + b[1] / 1000 * ih, y1: oy + top + b[3] / 1000 * ih, fh: bh / 1000 * ih };
      };
      const inside = (r, x0, y0, x1, y1) => r.x0 >= x0 - .5 && r.x1 <= x1 + .5 && r.y0 >= y0 - .5 && r.y1 <= y1 + .5;
      const cssN2 = (t, re, d) => { const m = t.match(re); return m ? +m[1] : d; };
      const lvW = cssN2(BCSS, /\.hb-bk>\.hb-lv\{[^}]*width:(\d+)cqw/, 24), elW = cssN2(BCSS, /\.hb-bk>\.hb-el\{[^}]*width:(\d+)cqw/, 21);
      const lvWs = cssN2(BCSS, /\.hb\[data-z="s"\] \.hb-bk>\.hb-lv\{width:(\d+)cqw/, 32), lvWm = cssN2(BCSS, /\.hb\[data-z="m"\] \.hb-bk>\.hb-lv\{width:(\d+)cqw/, 26);
      const nmH = cssN2(BCSS, /\.hb-bk>\.hb-nm\{[^}]*height:(\d+)cqw/, 12);
      let worst = 100, n = 0;
      /* обложка книги шириной 100 (cqw): окно ступени (арт и CSS); .hb-ph заходит под раму на 1,5 ширины и 1 % высоты с каждой стороны */
      for (const [tn, g] of [['CSS', T.HB_ART.css]].concat([1, 2, 3, 4, 5].map(t => [`ступень ${t}`, T.HB_ART.covers[t]]))) for (const [z, P] of [['l', pl], ['m', pl], ['s', ps]]) {
        const Wb = 100, Hb = Wb * 16 / 9, [wt, wr, wb, wl] = g.win.map(v => v / 10), W = Wb * (100 - wl - wr + 3) / 100, H = Hb * (100 - wt - wb + 2) / 100;
        const win = { x0: 1.5, y0: Hb / 100, x1: W - 1.5, y1: H - Hb / 100 };
        /* круги у верхних углов окна заходят вниз на 0,6 (у мелкой — 0,7) своей ширины; плашка имени — над нижней кромкой окна */
        const circ = z === 's' ? .7 * lvWs : .6 * Math.max(z === 'm' ? lvWm : lvW, elW), plateTop = (wb - 3.6) * Hb / 100 + nmH - (wb - 1) * Hb / 100;
        if (P[0] < win.y0 + circ - .2) say(`силуэт · обложка ${tn} (${z}): поле сверху ${P[0]} — фигура под кругом уровня или стихии (нужно ${(win.y0 + circ).toFixed(1)})`);
        if (z !== 's' && P[1] < plateTop - .2) say(`силуэт · обложка ${tn} (${z}): поле снизу ${P[1]} — фигура под плашкой имени (нужно ${plateTop.toFixed(1)})`);
        if (P[2] < win.x0 - .1) say(`силуэт · обложка ${tn} (${z}): поле по бокам ${P[2]} — фигура под рамой`);
        for (const k of keys) {
          const r = fitRect(W - 2 * P[2], H - P[0] - P[1], P[2], P[0], F.box[k]); n++; worst = Math.min(worst, r.fh * 100 / (win.y1 - win.y0));
          if (!inside(r, P[2], P[0], W - P[2], H - P[1]) || !inside(r, win.x0, win.y0, win.x1, win.y1)) say(`силуэт ${k} · обложка ${tn} (${z}): фигура выходит за окно`);
        }
      }
      /* страница портрета: левая страница разворота каждой ступени на обоих экранах, рамка .hb-por — поля 3,5 % 4 % 3,5 % 5,5 % */
      const BV = T.HB_VIEW.win;
      for (const [W0, H0] of [[932, 430], [844, 390]]) for (const t of [1, 2, 3, 4, 5]) {
        const g = T.HB_ART.spreads[t], bw = Math.min(BV.max, W0 - BV.padX) - BV.lock, bh = H0 - BV.padY - BV.rib;
        const pw = bw * (1000 - g.l[1] - g.l[3]) / 1000, ph = bh * (1000 - g.l[0] - g.l[2]) / 1000, W = pw * .905, H = ph * .93;
        /* знаки страницы: уровень 52 px сверху, щит класса 44 px снизу (1,5 % от края) — от края страницы; рамка отступает на 3,5 % */
        if (pp[0] < 52 - ph * .035) say(`силуэт · страница ${t} (${W0} × ${H0}): поле сверху ${pp[0]} px — фигура под кругом уровня`);
        if (pp[1] < ph * .015 + 44 - ph * .035) say(`силуэт · страница ${t} (${W0} × ${H0}): поле снизу ${pp[1]} px — фигура под щитом класса и именем`);
        for (const k of keys) {
          const r = fitRect(W - 2 * pp[2], H - pp[0] - pp[1], pp[2], pp[0], F.box[k]); n++;
          if (!inside(r, pp[2], pp[0], W - pp[2], H - pp[1]) || r.fh < H * .5) say(`силуэт ${k} · страница ${t} (${W0} × ${H0}): фигура выходит за рамку или мелкая`);
        }
      }
      /* крупный план: 4 : 5 во всю высоту без 32 px; кристалл 10 + 40 px сверху, имя снизу */
      for (const H0 of [430, 390]) {
        const H = H0 - 32, W = H * 4 / 5;
        if (pz[0] < 50) say(`силуэт · крупный план (${H0}): поле сверху ${pz[0]} px — фигура под кристаллом`);
        for (const k of keys) { const r = fitRect(W - 2 * pz[2], H - pz[0] - pz[1], pz[2], pz[0], F.box[k]); n++; if (!inside(r, pz[2], pz[0], W - pz[2], H - pz[1])) say(`силуэт ${k} · крупный план: фигура выходит за кадр`); }
      }
      cnt.lay.push(`силуэты классов: ${keys.length} кадров в ${n} окнах — фигура целиком; в окне обложки фигура не ниже ${worst.toFixed(0)} % его высоты`);
    }
  }
}

/* ================== 2в. замки рунных пределов: книга, мелкая книга, чужой герой ================== */
{
  fresh();
  const h2 = T.H('h2'), d2 = T.heroDev(h2);   // 150 из 150, руны предела II в запасах (демо — 11-й день цикла II)
  if (!(h2.lvl >= h2.cap) || !d2.rune || d2.have < d2.need) say('пределы: у героя h2 в демо не потолок уровня или мало рун — сценарий «можно пробить» не проверить');
  let g = collView('пределы · можно пробить');
  checkLocks(cardOf(g, 'h2'), 'пределы · можно пробить · книга', h2.lim, 'ready');
  if (!/можно пробить следующий/.test((cardOf(g, 'h2').match(/aria-label="([^"]*)"/) || [])[1] || '')) say('пределы: подпись книги не говорит, что предел можно пробить');
  T.S.hview = 'mine'; T.S.selHero = 'h2'; T.S.seg.hero = 'power'; calm(); g = winOf(view('пределы · раскрытая книга'));
  checkLocks(g.slice(g.indexOf('<span class="hb-lks"')), 'пределы · переплёт раскрытой книги', h2.lim, 'ready');
  if (!/<span class="hb-lks" role="img" aria-label="Рунный предел 1 из 5"/.test(g)) say('пределы: у замков раскрытой книги нет подписи «Рунный предел N из 5»');
  T.BAG.take(d2.rune.id, T.BAG.qty(d2.rune.id) - (d2.need - 1));
  checkLocks(cardOf(collView('пределы · мало рун'), 'h2'), 'пределы · мало рун · книга', h2.lim, 'wait');
  checkLocks(T.hrTile(T.hrV(h2), { act: 'noop' }), 'пределы · мало рун · мелкая книга', h2.lim, 'wait');
  const h1 = T.H('h1'); if (h1.lvl >= h1.cap) say('пределы: h1 в демо на потолке — сценарий «уровень растёт» не проверить');
  checkLocks(cardOf(collView('пределы · уровень растёт'), 'h1'), 'пределы · уровень растёт · книга', h1.lim, '');
  /* чужой герой: та же книга без запасов аккаунта — ни тлеющего, ни пульсирующего */
  fresh(); const vx = Object.assign(T.hrV(T.H('h2')), { acc: null, lim: 2 });
  checkLocks(T.hrTile(vx, { act: 'noop', bm: true }), 'пределы · чужой герой · мелкая книга', 2, '');
  checkLocks(T.hbCard(vx, { z: 'l', act: 'noop' }), 'пределы · чужой герой · книга', 2, '');
  checkLocks(T.hrTile(T.hrV(T.H('h1')), { act: 'noop', rpNext: 'ready' }), 'пределы · UI-кит', T.H('h1').lim, 'ready');
  T.S.route = 'heroes'; T.S.seg.heroes = 'squads'; T.S.selSquad = 's1';
  { const k0 = cnt.tiles;
    for (const t of cardsOf(view('отряды · полка отряда'))) {
      if (!/data-z="m"/.test(t)) continue;
      cnt.tiles++;
      if (!/<i class="hb-cr" aria-hidden="true"><\/i>/.test(t)) say('отряды: у книги на полке отряда нет кристалла редкости');
      if (!locksOf(t)) say('отряды: у книги героя на полке отряда нет замков пределов');
      if (/class="hb-cls"/.test(t)) say('отряды: у книги на полке отряда лишнее — щит класса (он только у крупной книги)');
    }
    if (cnt.tiles - k0 !== T.sq('s1').m.filter(Boolean).length) say('отряды: на полке отряда не все его герои книгами'); }
}

/* ================== 3. раскрытая книга героя аккаунта ================== */
const vitOf = w => (w.match(/<span class="hb-vit">([\s\S]*?)<\/span><\/header>/) || [])[1] || '';
const leftOf = w => { const i = w.indexOf('<section class="hb-pg l"'); return i < 0 ? '' : w.slice(i, w.indexOf('</section>', i)); };
fresh();
{
  for (const x of T.hrMine()) {
    T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'own';
    run('открыть', () => T.ACT.hc(x.id)); calm();
    if (T.S.hview !== 'mine' || T.S.selHero !== x.id) { say(`книга · ${x.name}: нажатие на книгу её не открыло`); continue; }
    for (const tab of ['power', 'gear', 'skills', 'path']) {
      T.S.seg.hero = tab; const h = view(`книга · ${x.name} · ${tab}`), w = winOf(h); cnt.bigs++;
      if (!w) { say(`книга · ${x.name}: не раскрыта`); break; }
      if (!gridOf(h)) say(`книга · ${x.name}: под книгой нет сетки, из которой её открыли`);
      if (/<div class="hd-top">/.test(w)) say(`книга · ${x.name}: осталась прежняя шапка с маленьким лицом`);
      if (count(w, /data-a="seg" data-v="hero:(?:power|gear|skills|path)"/g) !== 4) say(`книга · ${x.name}: не четыре вкладки`);
      if (tab === 'power' && (!w.includes('class="hdv-path"') || !w.includes('class="hdv-next"'))) say(`книга · ${x.name}: во вкладке «Развитие» нет пути или следующего шага`);
      if (tab === 'gear' && count(w, /class="eq-slot[ "]/g) !== 9) say(`книга · ${x.name}: во вкладке «Снаряжение» не девять мест`);
      if (tab === 'skills' && !/class="rot-list"/.test(w)) say(`книга · ${x.name}: во вкладке «Навыки» нет способностей`);
      if (tab === 'path') { const rh = T.hrV(x).rh, ch = rh && (rh.ch && rh.ch[0] ? rh.ch[0][0] : rh.chT[0]); if (!ch || !w.includes(ch)) say(`книга · ${x.name}: во вкладке «Путь» нет его главы`); }
      if (tab !== 'power') continue;
      /* разворот своей ступени: левая страница — портрет и знаки, переплёт — замки, снизу — ленты; справа — имя, класс, стихия, раса,
         редкость; уровень и доблесть тихой строкой */
      const t = tierOf(x.maxV), L = leftOf(w), bm = T.BM.hero(x), vit = vitOf(w);
      if (!w.includes(`data-t="${t}"`) || !w.includes(`data-r="${x.r}"`)) say(`книга · ${x.name}: разворот не своей ступени или без редкости`);
      if (!L.includes(`data-a="hczoom" data-v="${x.id}"`)) say(`книга · ${x.name}: портрет не открывается крупно`);
      if (!L.includes(`<b class="num">${x.lvl}</b>`) || !L.includes(`<b class="num">${T.fmt(bm)}</b>`) || !/icons\/cls-[a-z]+\.png/.test(L) || !L.includes('class="hb-el"') || !L.includes(`<b class="hb-nm">${x.name}</b>`)) say(`книга · ${x.name}: на странице портрета нет уровня, мощи BM.hero ${bm}, класса, стихии или имени`);
      checkLocks(w.slice(w.indexOf('<span class="hb-lks"')), `книга · ${x.name} · переплёт`, x.lim, nxOf(x));
      const R = ribsOf(w.slice(w.indexOf('</section>', w.indexOf('<section class="hb-pg r"'))));
      if (R.all !== x.maxV || R.on !== x.valor) say(`книга · ${x.name}: лент ${R.all} (взятых ${R.on}), ждали ${x.maxV} (${x.valor})`);
      if (!w.includes(`<h2>${x.name}</h2>`) || !w.includes(`<span class="rar" data-r="${x.r}">`)) say(`книга · ${x.name}: в шапке страницы нет имени или редкости`);
      if (!vit.includes(`<b class="num">${x.lvl}</b><small class="num">/ ${x.cap}</small>`) || !vit.includes(`<b class="num">${x.valor}</b><small class="num">/ ${x.maxV}</small>`)) say(`книга · ${x.name}: нет уровня «${x.lvl} / ${x.cap}» или доблести «${x.valor} / ${x.maxV}»`);
      if (!w.includes('data-a="hbclose" data-v="grid"')) say(`книга · ${x.name}: закрытие не ведёт к сетке`);
    }
  }
  /* ‹ › — соседний герой той же сетки и порядка; закрытие — к сетке */
  fresh(); collView('листать'); run('открыть', () => T.ACT.hc(T.hcOwnList()[0].id));
  const L = T.hcOwnList().map(v => v.id);
  run('следующий', () => T.ACT.hcstep('1')); if (T.S.selHero !== L[1]) say('книга: «›» не открыл следующего героя сетки');
  if (!T.S.hb.anim || T.S.hb.anim.kind !== 'turn' || T.S.hb.anim.dir !== 1) say('книга: «›» без перелистывания листа');
  run('предыдущий', () => T.ACT.hcstep('-1')); run('предыдущий', () => T.ACT.hcstep('-1')); if (T.S.selHero !== L[L.length - 1]) say('книга: «‹» с первого героя не ушёл к последнему');
  run('закрыть', () => T.ACT.hbclose('grid')); if (T.S.hview !== 'own' || T.S.hb.anim) say('книга: закрытие без живой книги не вернуло к сетке «Мои» сразу');
  /* портрет крупно: рисунок целиком; закрытие возвращает прежнее окно */
  run('крупно', () => { T.ACT.hc('h2'); T.ACT.hczoom('h2'); });
  let o = ovOf(view('портрет крупно'));
  if (!T.S.overlay || T.S.overlay.t !== 'hczoom' || !/^<div class="ov hcz-ov"/.test(o) || !o.includes('heroes/h2.jpg') || !/<figure class="hcz" data-r="1" data-t="\d"/.test(o)) say('портрет крупно: нет окна с портретом героя');
  run('крупно · закрыть', () => T.ACT.hczx()); if (T.S.overlay || T.S.hview !== 'mine') say('портрет крупно: закрытие не вернуло к книге');
  const ro = T.RS.heroes.find(x => x.src === 'roulette' && T.RS_ART && T.RS_ART.has(x.id) && !T.rsHas(x));
  T.S.rs.shards[ro.id] = need();
  run('крупно из окна', () => { T.ACT.rhero(ro.id); T.ACT.hczoom(ro.id); T.ACT.hczx(); });
  if (!T.S.overlay || T.S.overlay.t !== 'rhero' || T.S.overlay.arg !== ro.id) say('портрет крупно: из книги поверх экрана закрытие не вернуло её');
  T.S.overlay = null;
}

/* ================== 3а. книга героя состава «до покупки» ================== */
function checkPre(w, x, where) {
  cnt.bigs++;
  if (!w) { say(`${where}: нет книги`); return; }
  const L = leftOf(w);
  if (!w.includes(`data-r="${x.r}"`) || !/<i class="hb-cr" aria-hidden="true">/.test(w)) say(`${where}: книга без редкости`);
  if (/<span class="hb-lks"/.test(w)) say(`${where}: у героя вне коллекции — замки пределов`);
  if (/class="hb-lv/.test(L)) say(`${where}: у героя вне коллекции — уровень`);
  if (!L.includes(`<b class="num">${T.fmt(T.hrBaseBm(x))}</b>`)) say(`${where}: нет мощи по базовым статам ${T.hrBaseBm(x)}`);
  if (!w.includes(`<h2>${x.n}</h2>`) || !w.includes(`<span class="rar" data-r="${x.r}">`) || !w.includes(`data-el="${x.sch}"`) || !/icons\/cls-[a-z]+\.png/.test(w)) say(`${where}: нет имени, редкости, стихии или класса`);
  if (!w.includes(`доблесть до <b class="num">${x.maxV}</b>`)) say(`${where}: нет личного максимума доблести`);
  for (const bad of ['data-a="lvlup"', 'data-a="limit"', 'data-a="gearbest"', 'class="eq-slot', 'class="hdv-path"', 'data-a="seg" data-v="hero:']) if (w.includes(bad)) say(`${where}: у героя до покупки — прокачка или снаряжение (${bad})`);
  if (count(w, /data-a="seg" data-v="rhero:(?:who|skills|path)"/g) !== 3) say(`${where}: не три вкладки «Герой», «Навыки», «Путь»`);
}
fresh();
{
  const ro = T.RS.heroes.find(x => x.src === 'roulette' && !T.rsHas(x) && x.maxV > 1 && x.c <= T.rsCyc()) || T.RS.heroes.find(x => x.src === 'roulette' && !T.rsHas(x) && x.c <= T.rsCyc());
  T.S.rs.shards[ro.id] = need();
  T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'all'; run('до покупки', () => T.ACT.hc(ro.id)); calm();
  for (const tab of ['who', 'skills', 'path']) {
    T.S.seg.rhero = tab; const w = winOf(view(`до покупки · ${ro.n} · ${tab}`));
    checkPre(w, ro, `до покупки · ${tab}`);
    if (tab === 'who' && (!w.includes('0 ур. · 0 РП · 0 Добл') || !/class="quote|class="lore/.test(w))) say('до покупки · «Герой»: нет истории или «с чем приходит»');
    if (tab === 'skills') {
      const K = T.heroKit({ draft: T.hrDraft(ro) });
      if (!K) say('до покупки · «Навыки»: у героя нет набора');
      else for (const k of K.kit.filter(y => y.v > 0)) if (!w.includes(`>доблесть ${k.v}</span>`)) { say(`до покупки · «Навыки»: не сказано, что способность откроется на доблести ${k.v}`); break; }
    }
    if (tab === 'path' && !w.includes(ro.chT[0])) say('до покупки · «Путь»: нет глав');
  }
  const w = winOf(view('до покупки · действие'));
  if (!new RegExp(`data-a="activate" data-v="du\\d+\\|${ro.id}"`).test(w)) say('до покупки: у героя с комплектом осколков нет «Пробудить» с номером операции');
  /* поверх любого экрана: окно .ov с книгой; из лавки праха «Назад» возвращает в лавку */
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.rs.shards[ro.id] = 3; T.S.overlay = { t: 'dust' };
  run('лавка · книга', () => T.ACT.rhero(ro.id)); calm();
  let o = ovOf(view('книга поверх лавки'));
  if (!/^<div class="ov hb-ov"><div class="hb-win/.test(o)) say('книга поверх экрана: не окно с раскрытой книгой');
  if (!o.includes('data-a="hbclose" data-v="ov:dust"')) say('книга поверх лавки: «Назад» не возвращает в лавку');
  run('книга · назад в лавку', () => T.ACT.hbclose('ov:dust')); if (!T.S.overlay || T.S.overlay.t !== 'dust') say('книга поверх лавки: закрытие не вернуло лавку');
  /* купленный герой в окне поверх — его прогресс и «К развитию» */
  const own = T.RSI['c1-06']; T.S.overlay = null; run('свой поверх', () => T.ACT.rhero(own.id)); calm(); o = ovOf(view('свой герой поверх'));
  if (!o.includes(`data-a="dngo" data-v="${own.id}"`) || !/<span class="hb-lks"/.test(o)) say('свой герой поверх экрана: нет замков его пределов или «К развитию»');
  run('к развитию', () => T.ACT.dngo(own.id)); if (T.S.hview !== 'mine' || T.S.overlay) say('«К развитию»: не книга героя');
}

/* ================== 4. купленный герой — герой аккаунта ================== */
fresh();
{
  const x = T.RS.heroes.find(h => h.src === 'gold' && h.c === 2 && !T.rsHas(h));
  T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'gold';
  run('найм', () => T.ACT.gbuy(x.id)); run('найм · подтверждение', () => T.ACT.gbuydo(x.id));
  if (JSON.stringify(T.S.rs.owned[x.id]) !== JSON.stringify({ lvl: 0, lim: 0, valor: 0, how: 'gold' })) say(`найм: запись коллекции ${JSON.stringify(T.S.rs.owned[x.id])} — ждали 0 ур., 0 РП, 0 Добл`);
  const h = T.H(x.id);
  if (!h) say('найм: H(id) не находит купленного героя');
  else {
    if (h.name !== x.n || !Array.isArray(h.st) || h.st.length !== 5 || !h.gr || !T.EB.RULES.cls[h.cls]) say('купленный герой: не в форме героя аккаунта (имя, характеристики, класс ядра)');
    if (!Number.isInteger(h.bm) || h.bm <= 0) say(`купленный герой: БМ ${h.bm} — не целое положительное`);
    if (h !== T.H(x.id)) say('купленный герой: H(id) каждый раз даёт новый объект');
    if (!T.hrMine().includes(h)) say('купленный герой: его нет в «Моих»');
    checkBook(cardOf(collView('купленный · книга'), x.id), 'купленный · книга', Object.assign(accX(h), { lvl: 0, lim: 0, valor: 0 }));
    T.S.hview = 'mine'; T.S.selHero = x.id; calm();
    for (const tab of ['power', 'gear', 'skills', 'path']) {
      T.S.seg.hero = tab; const g = view(`купленный · ${tab}`);
      if (tab === 'power' && (!g.includes('data-a="limit"') || !/class="hdv-next"/.test(g))) say('купленный герой: во вкладке «Развитие» нет пути с воротами предела или следующего шага');
      if (tab === 'gear' && (g.match(/class="eq-slot[ "]/g) || []).length !== 9) say('купленный герой: во вкладке «Снаряжение» не девять мест');
      if (tab === 'path' && !g.includes(T.RSI[x.id].chT[0])) say('купленный герой: во вкладке «Путь» нет его главы');
    }
    { const rh = T.RSI[x.id], ch1 = rh.ch && rh.ch[0] ? rh.ch[0][0] : rh.chT[0];
      T.S.overlay = null; run('купленный · превью доблести', () => T.ACT.valor(x.id));
      if (!view('купленный · превью доблести').includes(`«${ch1}»`)) say(`купленный герой: превью доблести не называет его главу «${ch1}»`);
      T.S.overlay = null; }
    T.S.seg.hero = 'power';
    const sp0 = T.S.wallet.spirit, bm0 = h.bm;
    T.S.qty = 5; run('купленный · уровень', () => T.ACT.lvlup());
    if (T.S.rs.owned[x.id].lvl !== 5 || h.lvl !== 5) say(`купленный герой: уровень не записан в коллекцию — ${T.S.rs.owned[x.id].lvl}`);
    if (!(T.S.wallet.spirit < sp0)) say('купленный герой: уровень поднялся без духа');
    if (!(h.bm >= bm0)) say('купленный герой: БМ упала после уровня');
    const src = T.EB.heroSrc(h); if (!src || src.lvl !== 5 || src.name !== x.n) say('купленный герой: источник боя не из героя аккаунта');
  }
  const e = T.RS.heroes.find(y => y.src === 'echo');
  T.S.rs.owned[e.id] = { lvl: 0, lim: 0, valor: 0, how: 'souls' };
  const he = T.H(e.id), src = he && T.EB.heroSrc(he);
  if (!he || !src || !src.kit || !Array.isArray(src.kit.kit)) say('герой Эхо: нет набора способностей из echo-foes.js');
  if (he && (!he.avers || he.avers.race !== e.avers.race)) say('герой Эхо: нет расовой неприязни');
  T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.selHero = e.id; T.S.seg.hero = 'skills'; view('герой Эхо · навыки');
}

/* ================== 4б. боевая мощь — одна функция §6 на все экраны ================== */
{
  const B = T.BM, fl = (a, b) => Math.floor(a / b), BP = 10000;
  const isqrt = n => { if (n < 2) return n; let x = n, y = fl(x + 1, 2); while (y < x) { x = y; y = fl(x + fl(n, x), 2); } return x; };
  const C = T.BF && T.BF.rules ? T.BF.rules.bmC : 0;
  const f0 = u => { cnt.bm++; const R = T.EB.RULES, kl = R.K * u.lvl, cap = R.caps.defPct * 100, mit = k => Math.min(cap, fl(u.def[k] * BP, Math.max(1, kl + u.def[k]))), m = fl(mit('str') + mit('int'), 2);
    return fl(C * isqrt(fl(u.atk[u.main] * u.as * (1000000 + u.crit * (u.critDmg - 100)), 100000000) * fl(fl(u.maxHp * BP, BP - m) * BP, BP - u.eva)), 100); };
  const heroU = src => T.EB.create({ mode: 'rounds', heroes: [src], foes: [], seed: 1 }).u[0][0];
  const foeU = src => T.EB.create({ mode: 'rounds', heroes: [], foes: [src], seed: 1 }).u[1][0];
  const num = n => `<span class="num">${T.fmt(n)}</span>`;
  if (!B || !T.BM_SRC0) say('БМ: нет общей функции BM (index.html)');
  else run('БМ · одна функция', () => {
    fresh();
    const raw = T.bmInit0 ? T.bmInit0() : null;
    if (!raw || raw.heroes.some(h => Object.prototype.hasOwnProperty.call(h, 'bm'))) say('БМ: в initialState у героев лежит число bm — его надо считать');
    for (const h of T.S.heroes) {
      const d = Object.getOwnPropertyDescriptor(h, 'bm'), want = f0(heroU(T.BM_SRC0(h)));
      if (!d || !d.get || 'value' in d) say(`БМ · ${h.name}: bm — не свойство только для чтения`);
      if (h.bm !== want || B.hero(h) !== want) say(`БМ · ${h.name}: ${h.bm}, по формуле §6 — ${want}`);
    }
    if (!C || C !== T.HR_DATA.bmC || (T.CLAN && C !== T.CLAN.boss.bmC)) say('БМ: косметическая C у героев, бестиария и клана — разная');
    /* мощь героя вне коллекции — по базовым статам: та же формула на герое 0 ур. без вещей */
    for (const g0 of [T.RS.heroes.find(h => h.src === 'gold' && !T.rsHas(h)), T.RS.heroes.find(h => h.src === 'echo' && !T.rsHas(h)), T.RS.heroes.find(h => h.src === 'donat' && !T.rsHas(h))]) {
      const v = T.hrBaseBm(g0), w = f0(heroU(T.BM_SRC0(T.hrBuild(g0))));
      if (!Number.isInteger(v) || v <= 0 || v !== w) say(`БМ · ${g0.n}: мощь вне коллекции ${v}, по формуле §6 на 0 ур. без вещей — ${w}`);
      if (T.hrV(g0).bm !== v) say(`БМ · ${g0.n}: на книге вне коллекции не мощь по базовым статам`);
    }
    const cg = collView('БМ · коллекция');
    for (const h of T.hrMine()) if (!cardOf(cg, h.id).includes(`<b class="num">${shortBM(B.hero(h))}</b>`)) say(`коллекция · ${h.name}: на книге не BM.hero`);
    T.S.route = 'profile'; T.S.seg.profile = 'over';
    const top = T.hrMine().slice().sort((a, b) => B.hero(b) - B.hero(a)).slice(0, 5), pf = view('Странник · пятёрка сильнейших');
    if (!pf.includes(num(B.squad(top.map(h => h.id))))) say('«Пятёрка сильнейших»: сумма — не BM.squad');
    for (const h of top) { const t = cardsOf(pf).find(y => y.includes(`data-v="${h.id}"`)); if (!t || !t.includes(`<b class="num">${shortBM(B.hero(h))}</b>`)) say(`«Пятёрка сильнейших» · ${h.name}: на книге не BM.hero`); }
    T.S.route = 'heroes'; T.S.seg.heroes = 'squads';
    for (const s of T.S.squads) {
      T.S.selSquad = s.id; const g = view(`отряды · ${s.name}`), sum = s.m.filter(Boolean).reduce((a, id) => a + B.hero(T.H(id)), 0);
      if (B.squad(s.m) !== sum || !g.includes(num(sum))) say(`отряды · ${s.name}: мощь отряда ${B.squad(s.m)}, сумма героев ${sum}`);
    }
    T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'own'; T.S.overlay = { t: 'prep', arg: 'echo' };
    { const g = view('лист отряда · Эхо'), r = T.SQ.ready('echo'); if (!g.includes(num(B.squad(r.go)))) say('лист выбора отряда: мощь — не BM.squad'); }
    T.S.overlay = null;
    { const h = T.H('h2'), b0 = h.bm; h.lvl += 10; const w = f0(heroU(T.BM_SRC0(h))); if (!(h.bm > b0) || h.bm !== w) say(`БМ: после уровня ${h.bm}, по формуле ${w}`); }
    if (T.TB && T.TL_SRV && T.EQ_SRV && T.tlMul && T.eqMulOf) {
      fresh(); const h = T.H('h1');
      let no = null;
      for (const x of T.TB.list()) {
        if (T.tlWhy(h, x.no, 0) || !T.TL_SRV.put('tl' + T.S.tal.seq, 'h1', 0, x.no).ok) continue;
        if (T.tlMul('h1') !== BP) { no = x.no; break; }
        T.TL_SRV.out('tl' + T.S.tal.seq, 'h1', 0);
      }
      const it = Object.values(T.S.eq.items).find(x => !x.on);
      const r = it ? T.EQ_SRV.put('eq' + T.S.eq.seq, 'h1', it.uid) : null;
      if (!no || !r || !r.ok) say('БМ · слои: не удалось надеть талисман и снаряжение');
      else {
        const Pp = B.parts(h), base = f0(heroU(T.BM_SRC0(h))), tm = T.tlMul('h1'), em = T.eqMulOf(h, T.eqWornList('h1')), want = fl(fl(base * tm, BP) * em, BP);
        if (Pp.base !== base || Pp.mul.tal !== tm || Pp.mul.eq !== em || h.bm !== want) say(`БМ · слои: ${h.bm} (база ${Pp.base} × ${Pp.mul.tal} × ${Pp.mul.eq}), ждали ${want} (${base} × ${tm} × ${em})`);
        T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.selHero = 'h1'; T.S.seg.hero = 'power'; calm();
        if (!leftOf(winOf(view('книга · со слоями'))).includes(`<b class="num">${T.fmt(want)}</b>`)) say('раскрытая книга: мощь со слоями — не BM.hero');
      }
    }
    fresh();
    if (T.AD && T.ARU) {
      const o = T.AD.pool.arena.find(x => x.id === T.S.arena.opp[0]) || T.AD.pool.arena[0], hs = o.f.map(T.ARU.oppHero);
      for (const h of hs) if (h.bm !== B.hero(h) || h.bm !== f0(heroU(T.BM_SRC0(h)))) say(`Арена · ${h.name}: мощь соперника ${h.bm}, по формуле ${f0(heroU(T.BM_SRC0(h)))}`);
      if (T.ARU.oppBm(o) !== hs.reduce((a, h) => a + B.hero(h), 0)) say('Арена: мощь состава соперника — не сумма BM.hero');
    }
    if (T.ECHO) for (let st = 1; st <= T.ECHO.steps.length; st++) {
      const x = T.ECHO.target('step', st), F = T.ECHO.fight(x, T.sq(T.S.echoSquad).m.filter(Boolean), 1), w = f0(foeU(F.o.main));
      if (x.bm !== w || x.bm !== B.unit(foeU(F.o.main))) say(`Эхо · ступень ${st}: мощь цели ${x.bm}, по формуле карты ${w}`);
    }
    if (T.CLAN && T.EC && T.S.clan && T.S.clan.boss) {
      T.SQ.set('clan', T.S.squads[0].id); T.S.route = 'clan'; T.S.seg.clan = 'boss';
      const g = view('клан · босс');
      for (const x of T.S.clan.boss.targets) {
        const src = T.EC.card(T.CLAN, { g: x.g, uid: x.uid, cls: x.cls, el: x.el, race: x.race, k: x.k }), w = f0(foeU(src));
        if (B.unit(foeU(src)) !== w || T.EC.cardBm(T.CLAN, src) !== w) say(`клан · ${x.uid}: мощь цели ${B.unit(foeU(src))}, у калькулятора клана ${T.EC.cardBm(T.CLAN, src)}, по формуле ${w}`);
        if (!x.dead && !x.burned && !g.includes(num(w))) say(`клан · ${x.uid}: на карточке цели не BM.unit`);
      }
      if (!g.includes(num(B.squad(T.SQ.squad('clan').m)))) say('клан · босс: не видно мощи отряда атаки');
    }
  });
  fresh();
}

/* ================== 5. «Призыв → За золото» — сетка книг и книга «до покупки» ================== */
for (const team of [false, true]) {
  run('режим', () => T.setTeam(team));
  for (let c = 1; c <= 6; c++) {
    fresh(); T.S.acc.cycle = c; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'gold';
    const tag = `«За золото» · цикл ${c}${team ? ' [команда]' : ''}`, g = view(tag), cat = T.RS.heroes.filter(h => h.src === 'gold' && h.c === c).sort((a, b) => a.no - b.no);
    const ids = cardsOf(g).map(t => (t.match(/data-v="([^"]+)"/) || [])[1]);
    if (ids.join() !== cat.map(h => h.id).join()) say(`${tag}: книги ${ids.length} не по «№» каталога (${cat.length})`);
    const k = T.rsBought(c) + 1;
    if (!g.includes(`Следующий найм — ${k}-й в цикле:`) || !g.includes(`<b class="num">${T.fmt(T.rsGold(c, k))}</b>`)) say(`${tag}: нет строки «Следующий найм» с ценой ${T.rsGold(c, k)}`);
    for (const h of cat.slice(0, 6)) {
      const t = cardOf(g, h.id), v = T.hrV(h), own = T.rsHas(h);
      if (!t.includes(`data-a="gsel" data-v="${h.id}"`)) say(`${tag} · ${h.n}: нажатие не открывает книгу «до покупки»`);
      if (own !== /class="hb-in"/.test(t)) say(`${tag} · ${h.n}: отметка «в коллекции» ${own ? 'пропала' : 'у некупленного'}`);
      if (!own) checkBook(t, `${tag} · ${h.n}`, rsX(h, { img: T.RS_ART.has(h.id) ? h.id : null, sil: !T.RS_ART.has(h.id) }));
      else if (v.acc) checkBook(t, `${tag} · ${h.n}`, Object.assign(accX(v.acc), { bm: null }));
    }
    if (count(g, /<button class="hb[ "][^>]*>/g) !== cat.length) say(`${tag}: книг ${count(g, /<button class="hb[ "][^>]*>/g)}, героев каталога ${cat.length}`);
    cnt.cycles++;
  }
}
run('режим «Игрок»', () => T.setTeam(false));
{
  fresh(); T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'gold';
  const x = T.RS.heroes.find(h => h.src === 'gold' && h.c === 2 && !T.rsHas(h)), k = T.rsBought(2) + 1, price = T.rsGold(2, k);
  run('золото · книга', () => T.ACT.gsel(x.id)); calm();
  for (const tab of ['who', 'skills', 'path']) { T.S.seg.rhero = tab; checkPre(winOf(view(`«За золото» · до покупки · ${tab}`)), x, `«За золото» · до покупки · ${tab}`); }
  T.S.seg.rhero = 'who';
  let g = view('«За золото» · до покупки'), w = winOf(g);
  if (!new RegExp(`data-a="gbuy" data-v="${x.id}">Купить<span class="cost"><img[^>]*>${T.fmt(price)}</span>`).test(w)) say(`«За золото» · до покупки: нет «Купить» с ценой ${price}`);
  if (!w.includes(`${k}-я покупка цикла II`)) say('«За золото» · до покупки: не сказано, какая это покупка цикла');
  if (!/rs-hbar/.test(g) || !gridOf(g)) say('«За золото» · до покупки: книга не поверх сетки, из которой её открыли');
  if (!w.includes('data-a="hbclose" data-v="gold"')) say('«За золото» · до покупки: закрытие не ведёт к сетке');
  const g0 = T.S.wallet.gold; T.S.wallet.gold = price - 7; w = winOf(view('«За золото» · нет золота'));
  if (!new RegExp(`data-a="gbuy" data-v="${x.id}" disabled`).test(w) || !w.includes(`Не хватает ${T.fmt(7)} золота`)) say('«За золото» · до покупки: при нехватке кнопка активна или не сказано сколько');
  T.S.wallet.gold = g0;
  run('золото · купить', () => T.ACT.gbuy(x.id)); if (!T.S.overlay || T.S.overlay.t !== 'confirm') say('«За золото»: «Купить» без подтверждения');
  run('золото · подтвердить', () => T.ACT.gbuydo(x.id));
  if (T.S.wallet.gold !== g0 - price || JSON.stringify(T.S.rs.owned[x.id]) !== JSON.stringify({ lvl: 0, lim: 0, valor: 0, how: 'gold' })) say(`«За золото»: списано ${g0 - T.S.wallet.gold} при цене ${price} или запись не 0/0/0`);
  w = winOf(view('«За золото» · куплен'));
  if (!w.includes(`data-a="dngo" data-v="${x.id}"`) || /data-a="gbuy"/.test(w)) say('«За золото»: после покупки у книги нет «К развитию» или осталась покупка');
  run('золото · закрыть', () => T.ACT.hbclose('gold')); if (T.S.rs.gsel) say('«За золото»: закрытие не вернуло к сетке');
  if (!cardOf(view('«За золото» · сетка после'), x.id).includes('class="hb-in"')) say('«За золото»: у купленного в сетке нет отметки «в коллекции»');
  /* будущий цикл — героев не видно (стадия 0), сказано, когда откроется; книга будущего не открывается */
  T.S.rs.gcyc = 4; const z = T.RS.heroes.find(h => h.src === 'gold' && h.c === 4);
  const gz = view('«За золото» · будущий цикл'); if (cardsOf(gz).length || !gz.includes('откроется при переходе на цикл IV')) say('«За золото» · будущий цикл: видны герои или не сказано, когда откроется');
  run('будущий · книга', () => T.ACT.gsel(z.id)); calm(); if (winOf(view('«За золото» · будущий · книга'))) say('«За золото» · будущий цикл: книга героя будущего цикла открылась');
}

/* ================== 5а. «За души»: сцена алтаря ================== */
function souls(c, team) {
  fresh(); T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.rs.cyc = c;
  const tag = `«За души» · цикл ${c}${team ? ' [команда]' : ''}`, h = view(tag), pool = T.rsPool(), open = c >= T.rsFrom('roulette');
  const body = h.slice(h.indexOf('<div class="hr-souls'));
  if (!/class="pnl rl-entry[ "]/.test(body)) say(`${tag}: нет входа рулетки`);
  if (!/class="rl-scn[ "]/.test(body)) say(`${tag}: нет сцены алтаря`);
  if (open && count(body, /<span class="rl-ef"/g) !== pool.length) say(`${tag}: книг веера ${count(body, /<span class="rl-ef"/g)}, героев пула ${pool.length}`);
  if (open) { const fan = body.slice(body.indexOf('<div class="rl-faces'), body.indexOf('<div class="rl-ef-f')), blank = count(fan, /<button class="hb blank/g), found = pool.filter(x => T.hrStage(x) >= 1).length;
    if (blank !== pool.length - found || count(fan, /<button class="hb[ "]/g) !== pool.length) say(`${tag}: в веере безымянных ${blank}, не найденных героев пула ${pool.length - found}`);
    for (const x of pool) if (!T.hrStage(x) && fan.includes(`data-v="${x.id}"`)) say(`${tag}: в веере виден не найденный ${x.n}`); }
  if (open && pool.length && !body.includes('data-a="dlg" data-v="rl"')) say(`${tag}: нет «К рулетке»`);
  if (!body.includes('data-a="sheet" data-v="hrecho"')) say(`${tag}: нет входа отряда Эхо недели`);
  if (!body.includes('data-a="dlg" data-v="dust"')) say(`${tag}: нет входа лавки праха`);
  if (/class="rs-row|rs-col/.test(body)) say(`${tag}: во вкладке остались списки — им место в окнах`);
  const lines = playerText(body).split('\n').length, btns = count(body, /<button/g);
  if (lines > 24) say(`${tag}: строк текста ${lines} — тесно`);
  if (btns > pool.length + 6) say(`${tag}: кнопок ${btns} — тесно`);
  const W = T.rsWeek(), eb = body.slice(body.indexOf('data-v="hrecho"')), eIn = eb.slice(0, eb.indexOf('</button>'));
  const want = (W ? W.squad : []).filter(id => T.RSI[id] && !T.rsHas(T.RSI[id])).length;
  if (count(eIn, /class="hsg"/g) !== want) say(`${tag}: во входе отряда Эхо осколков ${count(eIn, /class="hsg"/g)}, героев недели не в коллекции ${want}`);
  for (const id of (W ? W.squad : [])) { const x = T.RSI[id]; if (x && !T.rsHas(x) && (T.S.rs.shards[id] || 0) < need() && eIn.includes(`heroes/${id}.jpg`)) say(`${tag}: во входе отряда Эхо у неизвестной души ${x.n} виден портрет`); }
  if (!/<img class="hr-ebg" src="[^"]*arena-echo-/.test(eIn)) say(`${tag}: у входа отряда Эхо нет арены цивилизации недели`);
  T.S.overlay = { t: 'hrecho' }; if (!/^<div class="ov he-ov/.test(ovOf(view(`${tag} · витрина отряда недели`)))) say(`${tag}: витрина отряда недели не открылась окном`);
  T.S.overlay = { t: 'dust' }; if (!/^<div class="ov du-ov/.test(ovOf(view(`${tag} · окно лавки`)))) say(`${tag}: окно лавки праха не открылось`);
  T.S.overlay = null;
  cnt.cycles++;
}
for (const team of [false, true]) { run('режим', () => T.setTeam(team)); for (let c = 1; c <= 6; c++) souls(c, team); }
run('режим «Игрок»', () => T.setTeam(false));

/* ================== 5б. витрина отряда недели ================== */
{
  for (let c = 2; c <= 6; c++) {
    fresh(); T.S.acc.cycle = c; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.overlay = { t: 'hrecho' };
    const W = T.rsWeek(), sq5 = W.squad.map(id => T.RSI[id]).filter(Boolean), N = need(), tag = `витрина отряда недели · цикл ${c}`, o = ovOf(view(tag));
    if (!/^<div class="ov he-ov/.test(o) || /class="sheet/.test(o)) { say(`${tag}: не окно-витрина`); continue; }
    if (!o.includes(`<h2>${W.civ}</h2>`) || !o.includes(W.raid)) say(`${tag}: нет цивилизации и нашествия недели`);
    if (!/<img class="he-bg" src="[^"]*arena-echo-/.test(o)) say(`${tag}: за окном не арена цивилизации недели`);
    const av = sq5.find(h => h.avers && h.avers.race); if (av && !/class="chip he-av"/.test(o)) say(`${tag}: не видно неприязни`);
    if (!/только из сундуков Эхо за места недели/.test(o) || !o.includes('data-a="go" data-v="echo"')) say(`${tag}: не сказано, откуда осколки, или нет пути в Эхо`);
    const books = booksOf(o);
    if (books.length !== sq5.length) say(`${tag}: книг ${books.length}, героев недели ${sq5.length}`);
    for (const h of sq5) {
      const t = books.find(x => x.includes(`data-a="ssel" data-v="${h.id}"`)), own = T.rsHas(h), n = T.S.rs.shards[h.id] || 0, st = T.hrStage(h);
      if (!t) { say(`${tag}: нет книги ${h.n}`); continue; }
      if (!st) { if (!/^<button class="hb blank/.test(t) || t.includes(h.n) || /data-r="/.test(t)) say(`${tag}: не найденный ${h.n} — не безымянная книга`); if (h.c > c && !/ lock/.test(t.slice(0, 40))) say(`${tag}: у героя будущего цикла нет замка`); continue; }
      checkBook(t, `${tag} · ${h.n}`, own ? Object.assign(accX(T.H(h.id)), { bm: null }) : rsX(h, { shard: [n, N], img: st === 2 && T.RS_ART.has(h.id) ? h.id : null, bm: null }));
    }
    if (!/class="he-sel"/.test(o)) say(`${tag}: нет выбранного героя с действием`);
  }
  fresh(); T.S.acc.cycle = 3; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls';
  const W = T.rsWeek(), N = need(), x = W.squad.map(id => T.RSI[id]).find(h => h && h.c <= 3 && !T.rsHas(h));
  T.S.rs.shards[x.id] = N + 2; T.S.wallet.souls = 1e6; T.S.overlay = { t: 'hrecho' };
  run('витрина · выбор', () => T.ACT.ssel(x.id));
  let o = ovOf(view('витрина · собран'));
  const t = cardsOf(o).find(y => y.includes(`data-v="${x.id}"`)) || '';
  if (/ gray/.test(t.slice(0, 40)) || !/class="hk-sh full"/.test(t)) say('витрина: собранный комплект не в цвете или полоса не горит');
  const m = o.match(new RegExp(`data-a="activate" data-v="(du\\d+)\\|${x.id}"`));
  if (!m) say('витрина: у собранного нет «Пробудить» с номером операции');
  else {
    run('витрина · пробудить', () => T.ACT.activate(`${m[1]}|${x.id}`));
    if (!T.S.overlay || T.S.overlay.t !== 'hrecho' || !T.S.du.ask) say('витрина: подтверждение пробуждения — не в том же окне');
    o = ovOf(view('витрина · подтверждение'));
    if (!o.includes(`data-a="activatedo" data-v="${m[1]}|${x.id}"`)) say('витрина: в подтверждении нет номера операции');
    const s0 = T.S.wallet.souls; run('витрина · пробуждение', () => T.ACT.activatedo(`${m[1]}|${x.id}`));
    if (!T.rsHas(x) || T.S.wallet.souls !== s0 - T.RS.rules.stub.activateSouls) say('витрина: пробуждение не привело героя или цена не та');
    if (!T.S.overlay || T.S.overlay.t !== 'hrwake' || T.S.overlay.back !== 'hrecho') say('витрина: после пробуждения нет окна пробуждения с возвратом в витрину');
    if (!ovOf(view('витрина · окно пробуждения')).includes('data-a="dlg" data-v="hrecho"')) say('окно пробуждения: нет «К отряду недели»');
    const s1 = T.S.wallet.souls; run('витрина · повтор', () => T.ACT.activatedo(`${m[1]}|${x.id}`)); if (T.S.wallet.souls !== s1) say('витрина: повтор номера списал души ещё раз');
    T.S.overlay = { t: 'hrecho' }; o = ovOf(view('витрина · пробуждён'));
    const t2 = cardsOf(o).find(y => y.includes(`data-v="${x.id}"`)) || '';
    if (/ gray/.test(t2.slice(0, 40)) || /class="hk-sh/.test(t2)) say('витрина: пробуждённый — чёрно-белый или с полосой осколков');
  }
  T.S.overlay = { t: 'hrecho' }; const y = W.squad.map(id => T.RSI[id]).find(h => h && !T.rsHas(h) && h.c <= 3);
  if (y) {
    T.S.rs.shards[y.id] = Math.max(1, T.S.rs.shards[y.id] || 0);
    run('витрина · книга', () => T.ACT.rhero(y.id));
    if (!ovOf(view('витрина · книга героя')).includes('data-a="hbclose" data-v="ov:hrecho"')) say('книга из витрины: «Назад» не возвращает в витрину');
    T.S.overlay = null; run('к отряду недели', () => T.ACT.rsgo(y.id));
    if (!T.S.overlay || T.S.overlay.t !== 'hrecho') say('«К отряду недели»: не открыл витрину');
  }
}

/* ================== 5в. лавка праха: окно и операции SOUL_SRV ================== */
{
  fresh(); T.S.acc.cycle = 2;
  T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls';
  T.S.rs.shards = {};
  const all = T.RS.heroes.filter(h => T.rsDustable(h) && h.c <= 2 && !T.rsHas(h));
  for (const h of all.slice(0, 4)) T.S.rs.shards[h.id] = 1;   // найдены — по осколку из Возрождения душ
  const N = need(), cat = T.hrDustCat(), x = cat[0], y = cat[1], p = T.rsShardPrice(x);
  if (cat.length !== 4 || all.slice(4).some(h => cat.includes(h))) say(`лавка: героев ${cat.length}, найденных ${4} — в лавке не найденные`);
  T.S.overlay = { t: 'dust' };
  let o = ovOf(view('лавка'));
  const books = cardsOf(o).filter(b => /data-a="ssel"/.test(b));
  if (books.length !== cat.length) say(`лавка: книг ${books.length}, героев в лавке ${cat.length}`);
  for (const b of books) {
    const id = (b.match(/data-v="([^"]+)"/) || [])[1], h = T.RSI[id]; if (!h) { say(`лавка: книга неизвестного героя ${id}`); continue; }
    if (!b.includes('class="hsg"')) say(`лавка: у ${h.n} на книге нет стекла осколка`);
    if (!b.includes(`>${T.fmt(T.rsShardPrice(h))}</span>`)) say(`лавка: у ${h.n} на книге нет цены осколка ${T.rsShardPrice(h)}`);
    if (!b.includes(`${T.fmt(T.S.rs.shards[h.id] || 0)}/${T.fmt(N)}`)) say(`лавка: у ${h.n} на книге нет доли собранного`);
    checkBook(b, `лавка · ${h.n}`, rsX(h, { z: 'm', shard: [T.S.rs.shards[h.id] || 0, N], bm: null }));
  }
  if (!/Героев Эхо здесь нет/.test(o)) say('лавка: не объяснено, почему в ней нет героев Эхо');
  if (!o.includes(T.fmt(T.S.wallet.dust))) say('лавка: не виден прах на руках');
  const buyRe = id => new RegExp(`data-a="dustbuy" data-v="(du\\d+)\\|${id}\\|(\\d+)"([^>]*)>`);
  T.S.du.q = 1; run('лавка · выбор', () => T.ACT.ssel(x.id));
  o = ovOf(view('лавка · выбран'));
  let m = o.match(buyRe(x.id));
  if (!m || m[2] !== '1' || !o.includes(`×1<span class="cost">`)) say('лавка: у выбранного нет «Осколки ×1» с номером операции и ценой');
  T.S.wallet.dust = 1e6;
  if (m) {
    const d0 = T.S.wallet.dust;
    run('лавка · осколок', () => T.ACT.dustbuy(`${m[1]}|${x.id}|1`));
    if ((T.S.rs.shards[x.id] || 0) !== 2 || T.S.wallet.dust !== d0 - p) say(`лавка: осколков ${T.S.rs.shards[x.id] || 0}, списано ${d0 - T.S.wallet.dust}, ждали 2 и ${p}`);
    if (!T.S.overlay || T.S.overlay.t !== 'dust') say('лавка: после покупки окно закрылось');
    run('лавка · повтор номера', () => T.ACT.dustbuy(`${m[1]}|${x.id}|1`));
    if ((T.S.rs.shards[x.id] || 0) !== 2 || T.S.wallet.dust !== d0 - p) say('лавка: повтор номера купил ещё раз');
    if (!T.SOUL_SRV.buy(m[1], x.id, 1).again) say('лавка: повтор номера — не «повтор»');
  }
  T.S.du.q = 10; o = ovOf(view('лавка · ×10')); m = o.match(buyRe(x.id));
  if (!m || m[2] !== '10') say('лавка: «10» не ведёт к «Осколки ×10»');
  else { const s0 = T.S.rs.shards[x.id], d1 = T.S.wallet.dust; run('лавка · ×10', () => T.ACT.dustbuy(`${m[1]}|${x.id}|10`)); if (T.S.rs.shards[x.id] !== s0 + 10 || T.S.wallet.dust !== d1 - 10 * p) say('лавка: ×10 — не десять осколков за десять цен'); }
  T.S.du.q = 0; o = ovOf(view('лавка · до комплекта')); m = o.match(buyRe(x.id));
  const left = N - T.S.rs.shards[x.id];
  if (!m || +m[2] !== left) say(`лавка: «до ${N}» не ведёт к ×${left}`);
  else { run('лавка · до комплекта', () => T.ACT.dustbuy(`${m[1]}|${x.id}|${left}`)); if (T.S.rs.shards[x.id] !== N) say('лавка: «до комплекта» не собрал комплект'); }
  o = ovOf(view('лавка · комплект'));
  if (buyRe(x.id).test(o) || !new RegExp(`data-a="activate" data-v="du\\d+\\|${x.id}"`).test(o)) say('лавка: при собранном комплекте нет «Пробудить» или осталась покупка');
  { const d2 = T.S.wallet.dust, r = T.SOUL_SRV.buy('du' + T.S.du.seq, x.id, 1); if (r.refuse !== 'full' || T.S.wallet.dust !== d2) say('лавка: сверх комплекта — не отказ или расход'); }
  { const r = T.SOUL_SRV.buy('du' + T.S.du.seq, y.id, 1.5); if (r.refuse !== 'qty') say('лавка: дробное число осколков — не отказ'); }
  T.S.wallet.dust = 0; T.S.du.q = 1; run('лавка · другой', () => T.ACT.ssel(y.id)); o = ovOf(view('лавка · нет праха')); m = o.match(buyRe(y.id));
  if (!m || !/disabled/.test(m[3]) || !o.includes(`Не хватает ${T.fmt(T.rsShardPrice(y))} праха`)) say('лавка: при нехватке праха кнопка активна или не сказано сколько');
  { const r = T.SOUL_SRV.buy('du' + T.S.du.seq, y.id, 1); if (r.refuse !== 'dust' || (T.S.rs.shards[y.id] || 0) !== 1) say('лавка: без праха — не отказ или выдача'); }
  T.S.rs.ssel = x.id; T.S.rs.shards[x.id] = N + 3; T.S.wallet.souls = 1e6; T.S.wallet.dust = 0;
  o = ovOf(view('лавка · пробудить'));
  const wm = o.match(new RegExp(`data-a="activate" data-v="(du\\d+)\\|${x.id}"`));
  if (!wm) say('лавка: нет «Пробудить» с номером операции');
  else {
    run('лавка · «Пробудить»', () => T.ACT.activate(`${wm[1]}|${x.id}`));
    if (!T.S.overlay || T.S.overlay.t !== 'dust' || !T.S.du.ask) say('лавка: подтверждение пробуждения — не в окне лавки');
    o = ovOf(view('лавка · подтверждение'));
    if (!o.includes(`data-a="activatedo" data-v="${wm[1]}|${x.id}"`) || !o.includes('0 уровнем') || !o.includes(`+${T.fmt(3 * T.rsDustOf(x))}`)) say('лавка: в подтверждении нет номера операции, «с чем приходит» или праха за лишние осколки');
    const s0 = T.S.wallet.souls, d3 = T.S.wallet.dust;
    run('лавка · пробуждение', () => T.ACT.activatedo(`${wm[1]}|${x.id}`));
    const own = T.S.rs.owned[x.id];
    if (!own || own.lvl || own.lim || own.valor || !T.H(x.id)) say('лавка: пробуждённый не пришёл в коллекцию с 0 ур., 0 РП и 0 Добл');
    if (T.S.wallet.souls !== s0 - T.RS.rules.stub.activateSouls || T.S.wallet.dust !== d3 + 3 * T.rsDustOf(x) || T.S.rs.shards[x.id]) say('лавка: пробуждение — не та цена, не тот прах за лишние или осколки остались');
    if (!T.S.overlay || T.S.overlay.t !== 'hrwake' || T.S.overlay.back !== 'dust') say('лавка: после пробуждения нет окна пробуждения с возвратом в лавку');
    const g = ovOf(view('окно пробуждения'));
    if (!g.includes(x.n) || !/^<div class="ov hr-wake/.test(g) || !/--t0:-\d+ms/.test(g) || !g.includes('data-a="dlg" data-v="dust"') || !g.includes(`data-a="dngo" data-v="${x.id}"`)) say('окно пробуждения: нет имени, времени сцены, «В лавку» или «К развитию»');
    if (!/class="hsg"/.test(g) || !/class="rl-fr"|class="rl-frc"/.test(g)) say('окно пробуждения: нет стекла осколка или рамы героя');
    run('окно пробуждения · сразу итог', () => T.ACT.hrwskip());
    if (!/^<div class="ov hr-wake done"/.test(ovOf(view('окно пробуждения · итог')))) say('окно пробуждения: нажатие не ведёт сразу к итогу');
    const s1 = T.S.wallet.souls;
    run('пробуждение · повтор номера', () => T.ACT.activatedo(`${wm[1]}|${x.id}`));
    if (T.S.wallet.souls !== s1) say('пробуждение: повтор номера списал души ещё раз');
    if (!T.SOUL_SRV.wake(wm[1], x.id).again) say('пробуждение: повтор номера — не «повтор»');
  }
  { const z = cat[2] || y; T.S.rs.shards[z.id] = N - 1; T.S.wallet.souls = 1e6; const s2 = T.S.wallet.souls;
    const r1 = T.SOUL_SRV.wake('du' + T.S.du.seq, z.id); T.S.rs.shards[z.id] = N; T.S.wallet.souls = 0; const r2 = T.SOUL_SRV.wake('du' + T.S.du.seq, z.id);
    if (r1.refuse !== 'shards' || r2.refuse !== 'souls' || T.rsHas(z) || T.S.rs.shards[z.id] !== N) say(`пробуждение: отказы ${r1.refuse}, ${r2.refuse} — или выдача при отказе`);
    T.S.wallet.souls = s2; }
  { const w = cat[3] || y; T.S.wallet.dust = 1e6; const s0 = T.S.rs.shards[w.id] || 0, seq = T.S.du.seq; run('лавка · старый вызов', () => T.ACT.dustbuy(w.id)); if ((T.S.rs.shards[w.id] || 0) !== s0 + 1 || !T.S.du.ops['du' + seq]) say('лавка: старый вызов ACT.dustbuy(герой) — не один осколок операцией с номером'); }
}
{
  const R = T.RS.rules, src = R && R.dustSrc;
  if (!Array.isArray(src) || !src.length) say('прах: в данных нет правила rules.dustSrc — чьи осколки продаёт каталог праха');
  else { if (src.includes('echo')) say('прах: rules.dustSrc разрешает героев Эхо — дыра в обход Эхо'); if (src.some(k => !T.RS.sources.includes(k))) say(`прах: в rules.dustSrc неизвестный источник — ${src.join(', ')}`); }
  for (const h of T.RS.heroes) if (T.rsDustable(h) !== !!(src && src.includes(h.src))) { say(`прах: rsDustable(${h.id}) расходится с rules.dustSrc`); break; }
  for (let c = 1; c <= 6; c++) {
    fresh(); T.S.rs.cyc = c; for (const h of T.RS.heroes) if (h.c <= c && !T.rsHas(h) && (h.src === 'echo' || h.src === 'roulette')) T.S.rs.shards[h.id] = 1;
    const cat = T.hrDustCat(), bad = cat.filter(h => !T.rsDustable(h) || h.src === 'echo');
    if (bad.length) say(`каталог праха · цикл ${c}: в нём герои Эхо — ${bad.slice(0, 3).map(h => h.n).join(', ')}`);
    T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.overlay = { t: 'dust' };
    const o = ovOf(view(`лавка праха · цикл ${c}`));
    if (T.RS.heroes.some(h => h.src === 'echo' && new RegExp(`data-a="(?:ssel|dustbuy|activate)" data-v="(?:du\\d+\\|)?${h.id}[|"]`).test(o))) say(`лавка праха · цикл ${c}: в витрине герои Эхо`);
    if (!/Героев Эхо здесь нет/.test(o)) say(`лавка праха · цикл ${c}: не объяснено, почему в ней нет героев Эхо`);
    if (cat.length && (o.match(/class="hsg"/g) || []).length < cat.length) say(`лавка праха · цикл ${c}: не у каждого собираемого героя стекло осколка`);
  }
  fresh(); T.S.acc.cycle = 6;
  const e = T.RS.heroes.find(h => h.src === 'echo' && h.c <= 6 && !T.rsHas(h));
  T.S.wallet.dust = 1e6; T.S.rs.shards[e.id] = 3; const d0 = T.S.wallet.dust, s0 = T.S.rs.shards[e.id];
  run('прах · осколок героя Эхо', () => T.ACT.dustbuy(e.id));
  if (T.S.wallet.dust !== d0 || (T.S.rs.shards[e.id] || 0) !== s0) say(`прах: ACT.dustbuy продал осколок героя Эхо ${e.n}`);
  if (!T.S.toast || !/Эхо/.test(T.S.toast.t)) say('прах: отказ по герою Эхо не объяснён игроку');
  fresh(); T.S.acc.cycle = 6; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'souls'; T.S.overlay = { t: 'hrecho' };
  const o = ovOf(view('витрина · без праха'));
  if (/data-a="dustbuy"/.test(o) || /data-v="hrdust"/.test(o)) say('витрина отряда недели: в ней прах — осколки героев Эхо за прах');
  if (typeof T.zpCardHero === 'function') {
    fresh(); T.S.acc.cycle = 6;
    const y = T.RS.heroes.find(h => h.src === 'echo' && h.c <= 6 && !T.rsHas(h)), r0 = T.RS.heroes.find(h => h.src === 'roulette' && h.c <= 6 && !T.rsHas(h));
    const cardE = run('запасы · осколки героя Эхо', () => T.zpCardHero({ h: y, q: 7, key: 'hero:' + y.id })) || '';
    const cardR = run('запасы · осколки героя рулетки', () => T.zpCardHero({ h: r0, q: 7, key: 'hero:' + r0.id })) || '';
    if (/data-a="dustbuy"/.test(cardE)) say('запасы: у героя Эхо есть «Осколок» за прах');
    if (!/только из сундуков Эхо/.test(cardE) || !cardE.includes(`data-a="activate" data-v="${y.id}"`)) say('запасы: у героя Эхо нет объяснения или «Пробудить»');
    if (!cardR.includes(`data-a="dustbuy" data-v="${r0.id}"`)) say('запасы: у героя рулетки пропал «Осколок» за прах');
  }
}

/* ================== 5г. осколок героя: стекло с лицом собранного, силуэт у неизвестной души, без маски-картинки ================== */
{
  const A = T.ART_ICONS, sg = T.shardGhost, art = p => fs.existsSync(path.join(UI, 'assets', 'art', p));
  if (!A || !sg) say('осколок: нет ART_ICONS или shardGhost (screens/art-icons.js)');
  else {
    for (const p of A.ready) if (!art(p)) say(`арт значков: ${p} в ART_ICONS.ready, а файла нет`);
    const G = Object.values(A.glass), gotG = G.filter(p => A.ready.includes(p)).length;
    if (gotG && gotG !== G.length) say('осколок: выгружены не все слои стекла — маска, кромка и трещины ложатся только вместе');
    for (const p of G) if (!A.ready.includes(p) && !A.want.includes(p)) say(`осколок: слой ${p} ни в ready, ни в want`);
    if (!Number.isInteger(A.heal) || A.heal < 0 || A.heal > 100) say('осколок: ART_ICONS.heal — не целая доля 0…100');
    const withArt = T.RS.heroes.find(h => h.src === 'roulette' && T.RS_ART && T.RS_ART.has(h.id) && !T.rsHas(h));
    const noArt = T.RS.heroes.find(h => h.src === 'roulette' && T.RS_ART && !T.RS_ART.has(h.id)) || T.RS.heroes.find(h => h.src !== 'donat' && T.RS_ART && !T.RS_ART.has(h.id) && !T.rsHas(h));
    fresh();
    for (const [h, got] of [[withArt, 0], [withArt, 20], [withArt, 50], [withArt, 60], [noArt, 7]]) {
      if (!h) { say('осколок: в составе нет героя рулетки с портретом или без'); break; }
      const x = sg(h, got, 50, 64) || '', tag = `осколок ${h.n} ${got}/50`;
      if (!/^<span class="hsg"/.test(x)) { say(`${tag}: не стекло осколка`); continue; }
      /* стадии знакомства: пока комплекта нет — неизвестная душа, в стекле силуэт класса; собран — портрет */
      if (h === withArt && got >= 50 && !x.includes(`heroes/${h.id}.jpg`)) say(`${tag}: у собранного комплекта в стекле не портрет героя`);
      if (h === withArt && got < 50 && x.includes(`heroes/${h.id}.jpg`)) say(`${tag}: у неизвестной души в стекле портрет — должен быть силуэт класса`);
      if ((h === noArt || got < 50) && !/class="hsg-face (?:cls|svg)"/.test(x)) say(`${tag}: нет силуэта класса`);
      if (/hsg-init|>\s*[А-ЯЁA-Z]{1,2}\s*</.test(x)) say(`${tag}: в стекле инициалы вместо лица`);
      if (/class="hsg-face[^"]*"[^>]*opacity/.test(x)) say(`${tag}: лицо гаснет с долей — оно должно быть видно всегда`);
      if (/mask-image:\s*url\(|mask:\s*url\(/.test(x)) say(`${tag}: лицо в стекле — под маской-картинкой: у страницы с диска она не грузится, лица нет`);
      const s = +((x.match(/--s:(\d+)/) || [])[1]), cr = +((x.match(/--cr:(\d+)/) || [])[1]), want = Math.min(100, Math.floor(got * 100 / 50));
      if (s !== want) say(`${tag}: доля --s ${s}, ждали ${want}`);
      if (cr !== 100 - Math.floor(want * A.heal / 100)) say(`${tag}: трещины --cr ${cr}, ждали ${100 - Math.floor(want * A.heal / 100)}`);
      if ((got >= 50) !== / data-full="1"/.test(x)) say(`${tag}: полный комплект ${got >= 50 ? 'не отмечен' : 'отмечен раньше времени'}`);
      for (const p of A.want.filter(q => !A.ready.includes(q))) if (x.includes(p)) say(`${tag}: в разметке невыгруженный ${p}`);
    }
    const AC = read('screens/art-icons.css');
    if (!/\.hsg\[data-k="art"\] \.hsg-in\{clip-path:polygon\(/.test(AC)) say('art-icons.css: лицо в стекле-рисунке не обрезано по обводу маски (clip-path)');
    if (/mask-image:url\(/.test(AC) || /mask-image:\$\{/.test(read('screens/art-icons.js'))) say('art-icons: осталась маска-картинка — у страницы с диска лицо пропадает');
    const faces = new Map();
    for (const c of T.RS.classes) {
      const h = T.RS.heroes.find(q => q.cl && q.cl[0] === c && !(T.RS_ART && T.RS_ART.has(q.id)) && q.src !== 'donat'); if (!h) continue;
      const f = ((sg(h, 0, 50, 64) || '').match(/<span class="hsg-face[\s\S]*?<\/span>(?=<\/span>)/) || [''])[0];
      if (faces.has(f)) say(`осколок: у классов «${faces.get(f)}» и «${c}» один силуэт`);
      faces.set(f, c);
    }
  }
  if (T.DU_ART) for (const p of T.DU_ART.ready) if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`арт лавки: ${p} в DU_ART.ready, а файла нет`);
  if (T.RS_ART) for (const id of T.RS_ART) if (!fs.existsSync(path.join(UI, 'assets', 'art', 'heroes', id + '.jpg'))) say(`портрет ${id} в RS_ART, а файла нет`);
  fresh();
  for (const title of ['«За души» · алтарь и лавка праха', 'Осколок героя']) {
    const k = T.KIT_EXTRA.find(x => { try { return x.html().includes(`<h3>${title}</h3>`); } catch (_) { return false; } });
    if (!k) { say(`UI-кит: нет раздела «${title}»`); continue; }
    const h = run(`UI-кит · ${title}`, () => k.html()) || '';
    const bad = h.match(/.{0,40}(?:undefined|NaN|\[object ).{0,40}/);
    if (bad) say(`UI-кит · ${title}: в разметке undefined, NaN или [object — «${bad[0]}»`);
    if (!/class="hsg"/.test(h)) say(`UI-кит · ${title}: нет осколка героя`);
  }
}

/* ================== 5д. «За Энериум»: книги сета на ступенях цены ================== */
const priceOf = h => T.RS.rules.stub.donatPrice[h.place - 1];
const niches = h => [...h.matchAll(/<div class="dn-ni[^"]*" style="--k:(\d)">([\s\S]*?)<\/div>/g)].map(m => ({ k: +m[1], id: (m[2].match(/data-v="([^"]+)"/) || [])[1], html: m[0] }));
for (const team of [false, true]) {
  run('режим', () => T.setTeam(team));
  for (let c = 1; c <= 6; c++) {
    fresh(); T.S.acc.cycle = c; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'donat';
    const tag = `«За Энериум» · цикл ${c}${team ? ' [команда]' : ''}`, h = view(tag), sets = T.dnSets(), s = T.dnSet(), open = s.cycle <= c && c >= T.rsFrom('donat');
    const N = niches(h);
    if (!open) {
      if (N.length || cardsOf(h).length) say(`${tag}: сет будущего цикла — видны его герои (стадия 0)`);
      if (!h.includes(`Герои сета станут известны в цикле ${T.ROMAN[s.cycle]}`)) say(`${tag}: не сказано, когда станут известны герои сета`);
      if (/data-a="dbuy"/.test(h)) say(`${tag}: сет закрыт, а купить можно`);
      cnt.cycles++; continue;
    }
    if (N.length !== s.members.length) { say(`${tag}: героев на ступенях ${N.length}, в сете ${s.members.length}`); continue; }
    N.forEach((n, i) => { const x = T.RSI[n.id]; if (!x || x.dset !== s.key || n.k !== x.place || x.place !== i + 1) say(`${tag}: ступень ${i + 1} — не ${i + 1}-й герой сета`); else if (!T.rsHas(x) && !n.html.includes(`<b class="num">${T.fmt(priceOf(x))}</b>`)) say(`${tag}: у ${x.n} на ступени нет цены ${priceOf(x)}`); if (!/<button class="hb[ "][^>]*data-a="dsel"/.test(n.html)) say(`${tag}: на ступени не книга героя`); });
    for (let i = 1; i < N.length; i++) if (priceOf(T.RSI[N[i].id]) <= priceOf(T.RSI[N[i - 1].id])) say(`${tag}: цена не растёт от первого к пятому`);
    if (sets.some(x => !h.includes(`data-a="dcyc" data-v="${x.cycle}"`))) say(`${tag}: не у всех донатных сетов есть вход`);
    if (!h.includes(`data-a="sheet" data-v="hrset:${s.key}"`)) say(`${tag}: нет сет-бонуса строкой`);
    const buy = h.match(/data-a="dbuy" data-v="(dn\d+)\|([^"]+)"/);
    if (!buy) say(`${tag}: нет кнопки покупки с номером операции`);
    if (buy && !h.includes(`Купить<span class="cost">`)) say(`${tag}: на кнопке покупки нет цены`);
    const txt = playerText(h.slice(h.indexOf('<div class="dn'))), nums = (txt.match(/\d[\d\s ]*/g) || []).filter(x => x.trim()).length;
    if (!team && nums > 22) say(`${tag}: на витрине ${nums} чисел — тесно`);
    T.S.overlay = { t: 'hrset', arg: s.key };
    const o = ovOf(view(`${tag} · сет-бонус`)), st = (o.match(/class="dn-st[ "]/g) || []).length, tiers = T.rsTiers(s.sum);
    if (st !== tiers) say(`${tag} · сет-бонус: ступеней ${st}, по сумме доблестей ${s.sum} — ${tiers}`);
    if (s.members.some(id => !o.includes(`data-a="dsel" data-v="${id}"`))) say(`${tag} · сет-бонус: нет пятерых сета`);
    T.S.overlay = null;
    cnt.cycles++;
  }
}
run('режим «Игрок»', () => T.setTeam(false));
{
  fresh(); T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'donat';
  const s = T.dnSet(), x = T.RSI[s.members[0]], p = priceOf(x);
  T.S.wallet.enerium = p + 5;
  run('покупка · выбрать первого', () => T.ACT.dsel(x.id));
  const m2 = view('покупка · первый выбран').match(/data-a="dbuy" data-v="(dn\d+)\|([^"]+)"/);
  if (!m2 || m2[2] !== x.id) say('покупка: у выбранного героя нет своей кнопки «Купить»');
  else {
    const op = m2[1];
    run('покупка · подтверждение', () => T.ACT.dbuy(`${op}|${x.id}`));
    const o = ovOf(view('покупка · окно подтверждения'));
    if (!o.includes(`data-a="dbuydo" data-v="${op}|${x.id}"`) || !o.includes('0 уровнем') || !o.includes(`останется ${T.fmt(5)}`)) say('покупка: подтверждение без номера, без «с чем приходит» или без остатка Энериума');
    const e0 = T.S.wallet.enerium;
    run('покупка · купить', () => T.ACT.dbuydo(`${op}|${x.id}`));
    if (T.S.wallet.enerium !== e0 - p) say(`покупка: списано ${e0 - T.S.wallet.enerium}, цена ${p}`);
    if (JSON.stringify(T.S.rs.owned[x.id]) !== JSON.stringify({ lvl: 0, lim: 0, valor: 0, how: 'donat' })) say(`покупка: запись коллекции ${JSON.stringify(T.S.rs.owned[x.id])}`);
    if (!T.S.overlay || T.S.overlay.t !== 'hrgot') say('покупка: нет окна получения героя');
    const e1 = T.S.wallet.enerium; run('покупка · повтор номера', () => T.ACT.dbuydo(`${op}|${x.id}`));
    if (T.S.wallet.enerium !== e1) say('покупка: повтор номера списал Энериум ещё раз');
    run('к развитию', () => T.ACT.dngo(x.id));
    if (T.S.route !== 'heroes' || T.S.seg.heroes !== 'coll' || T.S.hview !== 'mine' || !T.H(T.S.selHero)) say('«К развитию»: не ведёт в книгу купленного героя');
  }
  /* донатный герой из книги каталога — «Купить» за Энериум прямо в книге (решение автора 30.09.2026) */
  fresh(); T.S.acc.cycle = 2; const y = T.RSI[T.dnSet().members[1]]; T.S.wallet.enerium = 1e6;
  T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'all'; run('книга доната', () => T.ACT.hc(y.id)); calm();
  if (!new RegExp(`data-a="dbuy" data-v="dn\\d+\\|${y.id}"`).test(winOf(view('книга донатного героя')))) say('книга донатного героя: нет «Купить» за Энериум с номером операции');
}
{
  const A = T.DN_ART, known = [A.hall, A.frame].concat(T.dnSets().map(s => A.emblem(s.key)));
  for (const p of A.ready) { if (!known.includes(p)) say(`арт витрины: неизвестный путь ${p}`); if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`арт витрины: ${p} в DN_ART.ready, а файла нет`); }
}
for (const [n, , f] of T.FLOWS.filter(x => /Энериум|отряд|Коллекция|Каталог|[Кк]нига|золото/i.test(x[0]))) { fresh(); run('сценарий ' + n, () => f()); view(`сценарий «${n}»`); }

/* ================== 5е. Сила коллекции (§10.3, ADR-0031, п. 18): одна функция collRp на все экраны ================== */
run('сила коллекции', () => {
  const X = { collHero: T.collHero, collPct: T.collPct, R: T.collRule(), EV: T.EV, top: T.INV.hero.capByLim.length - 1 }, R = X.R;
  if (!R) { say('сила коллекции: нет правила EN_EVENT.rp1'); return; }
  const hero = o => Object.assign({ r: 2, c: 3, lim: 0, valor: 0 }, o), unit = R.perBp * 2 * 3;
  const want = [[{}, 1, 0], [{ lim: 1 }, 1, unit], [{ lim: 1 }, 2, 0], [{ valor: 1 }, 1, unit], [{ valor: 1, lim: 1 }, 1, unit * 2], [{ valor: 2, lim: 3 }, 5, unit * 2],
    [{ valor: 2, lim: 3 }, 3, unit * 4], [{ valor: 1, keep: 1 }, 1, unit], [{ valor: 1, keep: 1 }, 2, 0], [{ valor: R.maxValor + 3, lim: X.top }, 1, unit * 2 ** R.maxValor]];
  for (const [o, k, w] of want) { const v = X.collHero(hero(o), k); if (v !== w || !Number.isInteger(v)) say(`сила коллекции: герой ${JSON.stringify(o)}, РП${k} — ${v}, ждали ${w}`); }
  fresh();
  const rp = [1, 2, 3, 4, 5].map(k => T.collRp(k));
  if (rp.some(v => !Number.isInteger(v) || v < 0 || v > R.capBp)) say(`сила коллекции: не целые или выше потолка — ${rp.join(', ')}`);
  const sum = [1, 2, 3, 4, 5].map(k => Math.min(R.capBp, T.hrMine().reduce((a, h) => a + X.collHero(h, k), 0)));
  if (sum.join() !== rp.join()) say(`сила коллекции: сумма по героям коллекции ${sum.join(', ')}, collRp — ${rp.join(', ')}`);
  const h = collView('сила коллекции · кнопка'), chip = (h.match(/class="collpow[^"]*"[\s\S]*?<span class="chip spirit">([^<]*)<\/span>/) || [])[1];
  if (chip !== '+' + X.collPct(rp[0])) say(`сила коллекции: на кнопке «${chip}», РП1 — +${X.collPct(rp[0])}`);
  T.S.overlay = { t: 'coll' }; const sh = ovOf(view('сила коллекции · лист')), vs = [...sh.matchAll(/<span class="v">([^<]*)<\/span>/g)].map(m => m[1]);
  if (vs.join('|') !== rp.map(v => '+' + X.collPct(v)).join('|')) say(`сила коллекции: в листе «${vs.join(' ')}», collRp — ${rp.map(X.collPct).join(' ')}`);
  if (X.EV && X.EV.rp1() !== rp[0]) say(`сила коллекции: Событие считает РП1 ${X.EV.rp1()}, collRp — ${rp[0]}`);
});

/* ================== 6. режим «Команда»: сетки и книги рисуются ================== */
run('режим «Команда»', () => T.setTeam(true));
fresh(); collView('коллекция [команда]'); collView('каталог [команда]', { all: true });
T.S.hview = 'mine'; T.S.selHero = 'h2'; view('книга героя [команда]');
{ const rh = T.RS.heroes.find(h => T.hrStage(h) === 2); T.S.hview = 'rs'; T.S.rs.sel = rh.id; T.S.seg.rhero = 'path'; view('книга героя состава [команда]'); }
run('режим «Игрок»', () => T.setTeam(false));

/* ================== 7. вёрстка — расчётом на 932 × 430 и 844 × 390 ==================
   Размеры — из стилей (index.html, heroes.css, book.css, library.css) и данных вида (HC_VIEW, HB_VIEW, HB_ART, LB_VIEW): рабочая область —
   телефон без шапки и шахты, поля экрана --sp-m; книги стоят на полках шкафа («Библиотека Этриона»): ширина полки — рабочая область без
   стоек и полей ряда, книг на полке — как lbCols, ряд — воздух, обложка и доска полки (книга стоит на доске, ленты свисают с кромки);
   окно книги — во всю игру (HB_VIEW.win) */
{
  const V = T.HC_VIEW, BV = T.HB_VIEW, spM = +((html.match(/--sp-m:(\d+)px/) || [])[1] || 12), spS = +((html.match(/--sp-s:(\d+)px/) || [])[1] || 8);
  const cssN = (t, re, what, d) => { const m = t.match(re); if (!m) { say(`вёрстка: в стилях нет ${what}`); return d; } return +m[1]; };
  const LV = T.LB_VIEW, tabsH = cssN(html, /\n\.tabs button\{[^}]*height:(\d+)px/, 'высоты вкладок', 30) + 2 * cssN(html, /\n\.tabs\{[^}]*padding:(\d+)px/, 'поля вкладок', 3) + 2;
  const ribH = cssN(BCSS, /\.hb-rb\{[^}]*height:(\d+)cqw/, 'высоты полосы лент', 14), ribM = cssN(BCSS, /\.hb-rb\{[^}]*margin-top:-(\d+)cqw/, 'захода лент под обложку', 5);
  /* полка в стилях — из переменных шкафа (LB_VIEW через lbVars), не свои числа */
  if (!/\.lb-bks\{[^}]*grid-template-columns:repeat\(var\(--n,\d+\),minmax\(0,1fr\)\);column-gap:var\(--lb-gap\)/.test(LCSS)) say('вёрстка: ряд на полке — не сетка из --n книг с промежутком --lb-gap');
  if (!/\.lb-row\{[^}]*padding:var\(--lb-air\) var\(--lb-pad\) 0\}/.test(LCSS)) say('вёрстка: у ряда нет воздуха над книгами и полей у стоек из LB_VIEW');
  if (!/\.lb-pl\{[^}]*height:var\(--lb-pl\);margin:calc\(-1 \* var\(--lb-sink\)\)/.test(LCSS)) say('вёрстка: доска полки — не из LB_VIEW (высота --lb-pl, книга стоит на доске --lb-sink)');
  if (!/\.lb-c>\.hb>\.hb-rb,\.lb-slot>\.hb>\.hb-rb\{position:absolute;left:0;right:0;top:100%\}/.test(LCSS)) say('вёрстка: на полке ленты доблести занимают место в ряду, а не свисают с кромки');
  { const q = LCSS.match(/@container main \(max-height: (\d+)px\)\{ \.lb-case\{--lb-top:var\(--lb-top1/); if (!q || +q[1] !== LV.low) say(`вёрстка: граница компактного шкафа в стилях ${q ? q[1] : 'нет'}, в LB_VIEW.low — ${LV.low}`); }
  const bookH = w => w * 16 / 9 + w * (ribH - ribM) / 100;   // обложка 9 : 16 и выглядывающие ленты (витрины без полки)
  const rowH = w => LV.air + w * 16 / 9 - LV.sink + LV.plank;   // ряд на полке: воздух, обложка, доска (ленты свисают с кромки)
  /* знаки обложки — по book.css и геометрии каждой ступени (арт и CSS): кристалл посреди верхней полосы, круги уровня и стихии у углов
     окна, замки в правой полосе, плашка имени на нижней кромке окна, низ (класс и мощь) под ней, полоса осколков над ней. Проценты:
     по ширине — от ширины книги, по высоте — от высоты обложки (177,78 % ширины) */
  const Hc = 1600 / 9, pct = cq => cq * 100 / Hc;   // cqw — в проценты высоты обложки
  const crW = cssN(BCSS, /\.hb-bk>\.hb-cr\{[^}]*width:(\d+)cqw/, 'кристалла', 15), lvW = cssN(BCSS, /\.hb-bk>\.hb-lv\{[^}]*width:(\d+)cqw/, 'круга уровня', 24);
  const elW = cssN(BCSS, /\.hb-bk>\.hb-el\{[^}]*width:(\d+)cqw/, 'медальона стихии', 21), lkW = cssN(BCSS, /\.hb-bk>\.hb-lk\{[^}]*width:(\d+)cqw/, 'столбца замков', 12);
  const lkT = cssN(BCSS, /\.hb-bk>\.hb-lk\{[^}]*top:calc\(var\(--wt\) \* 1% \/ 10 \+ (\d+)%\)/, 'верха столбца замков', 11), lkB = cssN(BCSS, /\.hb-bk>\.hb-lk\{[^}]*bottom:calc\(var\(--wb\) \* 1% \/ 10 \+ (\d+)%\)/, 'низа столбца замков', 4);
  const nmM = cssN(BCSS, /\.hb-bk>\.hb-nm\{[^}]*left:min\(calc\(var\(--wl\) \* 1% \/ 10 - 2%\),(\d+)%\)/, 'плашки имени шире узкого окна', 12), nmH = cssN(BCSS, /\.hb-bk>\.hb-nm\{[^}]*height:(\d+)cqw/, 'высоты плашки имени', 12);
  const ftH = cssN(BCSS, /\.hb-bk>\.hb-ft\{[^}]*height:(\d+)cqw/, 'высоты низа обложки', 16), rbW = +((BCSS.match(/\.hb-rb i\{[^}]*width:([\d.]+)cqw/) || [])[1] || 7.5), rbG = +((BCSS.match(/\.hb-rb\{[^}]*gap:([\d.]+)cqw/) || [])[1] || 3);
  const lvF = cssN(BCSS, /\.hb-bk>\.hb-lv b\{font:700 (\d+)cqw/, 'цифр уровня', 9), lvF4 = cssN(BCSS, /\.hb-bk>\.hb-lv\.w4 b\{font-size:(\d+)cqw/, 'цифр уровня в четыре знака', 7);
  const lockH = 5 * pct(lkW * 1000 / T.HB_ART.lock.ratio);
  const geos = [['CSS', T.HB_ART.css]].concat([1, 2, 3, 4, 5].map(t => [`ступень ${t}`, T.HB_ART.covers[t]]));
  let nameMin = 100;
  for (const [n, g] of geos) {
    const [wt, wr, wb, wl] = g.win.map(x => x / 10), [ct, cr, cb, cl] = g.core.map(x => x / 10);
    const plateBot = wb - 3.6, plateTop = plateBot + pct(nmH), footTop = cb + 2.4 + pct(ftH), shBot = wb + 4.6;
    if (footTop > plateBot - 1) say(`вёрстка · ${n}: строка класса и мощи налезает на плашку имени`);
    if (shBot < plateTop + .5) say(`вёрстка · ${n}: полоса осколков налезает на плашку имени`);
    const lkTop = wt + lkT, lkBot = 100 - (wb + lkB);
    if (lkBot - lkTop < lockH) say(`вёрстка · ${n}: пять замков не помещаются в правую полосу (${(lkBot - lkTop).toFixed(1)} % при нужных ${lockH.toFixed(1)} %)`);
    if (wr < lkW) say(`вёрстка · ${n}: правая полоса ${wr} % — замки (${lkW} % ширины) на портрете`);
    const plateR = Math.min(wr - 2, nmM); if (100 - (wb + lkB) > 100 - plateTop && 100 - plateR > 100 - wr / 2 - lkW / 2) say(`вёрстка · ${n}: нижний замок на плашке имени`);
    if (wl - lvW * .4 < 0 || wr - elW * .4 < 0) say(`вёрстка · ${n}: круг уровня или медальон стихии выходят за книгу`);
    if (wl + lvW * .6 > 50 - crW / 2 || 100 - wr - elW * .6 < 50 + crW / 2) say(`вёрстка · ${n}: круг уровня или медальон стихии налезают на кристалл`);
    if ((wt + ct) / 2 - pct(crW) / 2 < 0) say(`вёрстка · ${n}: кристалл выходит за верх книги`);
    if (100 - cl - cr < 5 * rbW + 4 * rbG) say(`вёрстка · ${n}: пять лент шире книги`);
    nameMin = Math.min(nameMin, 100 - Math.min(wl - 2, nmM) - plateR - 6);
  }
  if (3 * lvF * .55 > lvW - 2 || 4 * lvF4 * .55 > lvW - 2) say('вёрстка: цифры уровня не входят в круг');
  /* книг на полке: как lbCols — в песочнице кадр 932 × 430, а 844 × 390 — подменой кадра игры */
  const colsJs = [], game = P.els.game || P.doc.getElementById('game'), keepG = { w: game.offsetWidth, h: game.offsetHeight, cl: game.classList };
  for (const [W, Hh, sm] of [[932, 430, false], [844, 390, true]]) {
    Object.assign(game, { offsetWidth: W, offsetHeight: Hh, classList: Object.assign({}, keepG.cl, { contains: c => sm && c === 'sm' }) });
    colsJs.push([run('lbCols', () => T.lbCols(V.card)), run('lbCols · золото', () => T.lbCols(V.gold))]);
  }
  Object.assign(game, { offsetWidth: keepG.w, offsetHeight: keepG.h, classList: keepG.cl });
  for (const [k, X] of [{ n: '932 × 430', W: 932, H: 430, top: 46, rail: 78 }, { n: '844 × 390', W: 844, H: 390, top: 44, rail: 72 }].entries()) {
    const inW = X.W - X.rail - 2 * spM, inH = X.H - X.top - 2 * spM, i = X.H - X.top <= LV.low ? 1 : 0;
    if (i !== k) say(`вёрстка ${X.n}: компактный кадр по LB_VIEW.low — не тот`);
    /* книги на полках: «Мои» — шкаф во всю область, «За золото» — под вкладками Призыва */
    const books = inW - 2 * LV.post[i] - 2 * LV.pad, fit = min => Math.max(LV.cols[0], Math.min(LV.cols[1], Math.floor((books + LV.gap) / (min + LV.gap))));
    const shelf = (nm, min, body, jsN) => {
      const cols = fit(min), cw = (books - (cols - 1) * LV.gap) / cols, rows = body / rowH(cw);
      if (jsN !== cols) say(`вёрстка ${X.n} · ${nm}: lbCols ставит на полку ${jsN} книг, расчёт — ${cols}`);
      if (cols < 5) say(`вёрстка ${X.n} · ${nm}: на полке ${cols} книг — мало`);
      if (cw < min) say(`вёрстка ${X.n} · ${nm}: книга ${cw.toFixed(0)} px — уже ${min}`);
      if (rows < 1.15) say(`вёрстка ${X.n} · ${nm}: видно ${rows.toFixed(2)} полки — следующую не видно, листать неочевидно`);
      const nameW = cw * nameMin / 100; if (nameW < 60) say(`вёрстка ${X.n} · ${nm}: на имя в самой узкой плашке ${nameW.toFixed(0)} px`);
      const lock = cw * lkW / 100; if (lock < 9) say(`вёрстка ${X.n} · ${nm}: замок ${lock.toFixed(1)} px — не читается`);
      const hang = cw * (ribH - ribM) / 100; if (hang > LV.plank - LV.sink) say(`вёрстка ${X.n} · ${nm}: ленты свисают ниже доски полки (${hang.toFixed(0)} px при кромке ${LV.plank - LV.sink})`);
      return { cols, cw, rows };
    };
    const mine = shelf('«Мои»', V.card[k], inH - LV.top[i], colsJs[k][0]);
    const gold = shelf('«За золото»', V.gold[k], inH - tabsH - spM - LV.top[i], colsJs[k][1]);
    /* табличка цены под книгой: монета, число, поля и заклёпки */
    const maxPrice = T.rsGold(6, 40), tagW = 11 + 4 + T.fmt(maxPrice).length * 6.2 + 12 + 2 * 7;
    if (tagW > gold.cw) say(`вёрстка ${X.n}: табличка цены ${tagW.toFixed(0)} px шире книги ${gold.cw.toFixed(0)} px`);
    const cw = mine.cw, ch = bookH(cw), lock = cw * lkW / 100, nameW = cw * nameMin / 100, cols = mine.cols, rows = mine.rows;
    /* раскрытая книга: окно во всю игру, разворот каждой ступени — правой странице хватает на девять мест снаряжения (по 26 px) */
    const sw = Math.min(BV.win.max, X.W - BV.win.padX), sh = X.H - BV.win.padY, bw = sw - BV.win.lock, bh = sh - BV.win.rib;
    let minR = 1e9, minRH = 1e9, minL = 1e9;
    for (const t of [1, 2, 3, 4, 5]) {
      const g = T.HB_ART.spreads[t], rw = bw * (1000 - g.r[1] - g.r[3]) / 1000, rhh = bh * (1000 - g.r[0] - g.r[2]) / 1000, lw = bw * (1000 - g.l[1] - g.l[3]) / 1000;
      const content = rw * .93 - 20;   // вкладыш: поля 3 % и 4 %, отступы 10 + 10
      minR = Math.min(minR, content); minRH = Math.min(minRH, rhh * .94 - 16); minL = Math.min(minL, lw);
      if (g.l[3] >= g.g || g.r[3] < g.g - 60 || 1000 - g.l[1] > g.r[3] + 60) say(`вёрстка · разворот ${t}: страницы не по разные стороны корешка`);
    }
    if (minR < 9 * 26 + 8 * 3) say(`вёрстка ${X.n}: на правой странице ${minR.toFixed(0)} px — девяти мест снаряжения тесно`);
    if (minRH < 230) say(`вёрстка ${X.n}: правая страница ${minRH.toFixed(0)} px в высоту — вкладке тесно`);
    if (minL < 300) say(`вёрстка ${X.n}: левая страница ${minL.toFixed(0)} px — портрету мало`);
    const cbh = Math.floor(bh * BV.win.cb / 100), cbw = Math.floor(cbh * 9 / 16);
    if (cbw > bw / 2) say(`вёрстка ${X.n}: закрытая книга в полёте шире половины разворота`);
    /* витрина отряда недели: пять книг в ряд — по ширине и высоте ряда */
    const wW = Math.min(904, X.W - 28), wH = X.H - 20, headW = k ? 60 : 68, footW = 44, stage = wH - headW - footW - 2 * spS - spM, rowW = wW - 2 * spM;
    const ew = Math.min((rowW - 4 * V.echo) / 5, (stage - 14) * 9 / 17);
    if (ew < 110) say(`вёрстка ${X.n}: книга витрины отряда недели ${ew.toFixed(0)} px — мелко`);
    cnt.lay.push(`${X.n}: «Мои» — ${cols} на полке, книга ${cw.toFixed(0)} × ${ch.toFixed(0)}, видно ${rows.toFixed(2)} полки, замок ${lock.toFixed(1)} px, имя не уже ${nameW.toFixed(0)} px; «За золото» — ${gold.cols} на полке, книга ${gold.cw.toFixed(0)}, видно ${gold.rows.toFixed(2)} полки; раскрытая книга ${bw} × ${bh}, правая страница — не меньше ${minR.toFixed(0)} × ${minRH.toFixed(0)}, левая — не меньше ${minL.toFixed(0)}, закрытая книга в полёте ${cbw} × ${cbh}; витрина отряда недели — книга ${ew.toFixed(0)} px`);
  }
  /* отряды — шкаф и полки: вёрстка расчётом — check_squads.js, раздел 9 */
}

/* ================== 8. анимация — по часам песочницы ================== */
{
  const Q = load({ clock: true }), TT = Q.T;
  const fr = () => { TT.S = TT.initialState(); TT.S.overlay = null; TT.S.route = 'heroes'; TT.S.seg.heroes = 'coll'; TT.S.hview = 'own'; };
  const g = () => { run('отрисовка', () => TT.render()); return scan(Q.game(), 'анимация', TT); };
  const num2 = (s, k) => +((s.match(new RegExp(`${k}:(-?\\d+)(?:ms|px)?(?:;|")`)) || [])[1]);
  /* поле игры — 932 × 430 без масштаба рамки; нажатая книга — на своём месте в сетке: полёт начинается оттуда */
  const G = TT.HB_VIEW.win, gw = 932, gh = 430;
  Object.assign(Q.doc.getElementById('game'), { offsetWidth: gw, offsetHeight: gh, getBoundingClientRect: () => ({ left: 0, top: 0, right: gw, bottom: gh, width: gw, height: gh }) });
  const rect = { left: 120, top: 90, width: 131, height: 233 };
  const fakeBtn = r => ({ querySelector: () => ({ getBoundingClientRect: () => r }), getBoundingClientRect: () => r });
  fr();
  run('открытие', () => TT.ACT.hc('h2', fakeBtn(rect)));
  const A = TT.S.hb.anim, Tm = TT.hbTimes('in'), O = TT.HB_VIEW.open;
  if (!A || A.kind !== 'in' || A.id !== 'h2' || A.t0 !== Q.clock.now) say('анимация: нажатие на книгу не начало открытие от этого момента');
  else {
    cnt.anim++;
    /* моменты: полёт, обложка, листы по порядку, страницы проступают, конец — целые и растут */
    const beats = [0, Tm.fly0, Tm.cover0, ...Tm.leaf, Tm.show, Tm.end];
    if (beats.some(x => !Number.isInteger(x)) || !(O.pull > 0) || Tm.fly0 !== O.pull || Tm.cover0 !== O.pull + O.fly || Tm.leaf.length !== O.leaves || Tm.leaf.some((x, i) => i && x - Tm.leaf[i - 1] !== O.leafStep) || !(Tm.show < Tm.end) || Tm.end < Tm.cover1) say(`анимация: моменты открытия не по порядку — ${beats.join(', ')} (сначала книга выдвигается с полки, потом летит)`);
    if (Tm.end > 2000) say(`анимация: открытие ${Tm.end} мс — дольше двух секунд («короткая»)`);
    /* полёт: от места карточки к корешку разворота; масштаб — ширина карточки к ширине закрытой книги, ‰ */
    const sw = Math.min(G.max, gw - G.padX), sh = gh - G.padY, bw = sw - G.lock, bh = sh - G.rib, bx = Math.floor((gw - sw) / 2), by = Math.floor((gh - sh) / 2);
    const tier = tierOf(TT.H('h2').maxV), gut = TT.HB_ART.spreads[tier].g, cbh = Math.floor(bh * G.cb / 100), cbw = Math.floor(cbh * 9 / 16), cbx = Math.floor(bw * gut / 1000), cby = Math.floor((bh - cbh) / 2);
    const th = Math.floor(cbh * TT.hbSpineR(tier) / 1000);   // толщина книги — корешок её ступени
    const want = { cbx, cby, cbw, cbh, fx: rect.left - bx - cbx, fy: rect.top - by - cby, fs: Math.floor(rect.width * 1000 / cbw) };
    for (const [k, v] of Object.entries(want)) if (A.g[k] !== v) say(`анимация: полёт ${k} = ${A.g[k]}, ждали ${v}`);
    let h = g(), w = h.slice(h.indexOf('<div class="hb-win'));
    if (!/^<button class="hb[^"]* away"/.test(cardOf(gridOf(h), 'h2'))) say('анимация: книга в полёте осталась и на своём месте на полке — две книги');
    if (!/^<div class="hb-win in"/.test(w) || !w.includes('<div class="hb-anim"') || !w.includes('<div class="hb-fly"')) say('анимация: в начале нет открытия — полёта закрытой книги');
    if (count(w, /<i class="hb-leaf" style="--d-leaf:/g) !== O.leaves) say(`анимация: листов ${count(w, /<i class="hb-leaf" style/g)}, ждали ${O.leaves}`);
    if (count(w, /<span class="hb-dust">/g) !== 1 || count(w.slice(w.indexOf('<span class="hb-dust">')), /<i style="--x:/g) < TT.HB_VIEW.fx.dust || !w.includes('<i class="hb-burst"') || !w.includes('<i class="hb-shine"')) say('анимация: нет пыли, вспышки или света из страниц');
    if (!w.includes('data-a="hbskip"')) say('анимация: нельзя пропустить нажатием');
    if (num2(w, '--d-cv') !== Tm.cover0 || num2(w, '--d-show') !== Tm.show || num2(w, '--d-pull') !== 0 || num2(w, '--d-fly') !== Tm.fly0) say('анимация: задержки шагов не от начала показа');
    if (!new RegExp(`left:${cbx}px;top:${cby}px;width:${cbw}px;height:${cbh}px;--fx:${want.fx}px;--fy:${want.fy}px;--fs:${want.fs};--th:${th}px;--r0:0deg`).test(w)) say('анимация: закрытая книга не на корешке разворота, полёт не от места карточки или книга без толщины своей ступени');
    /* объём книги: выдвигается с полки корешком (r1), разворачивается обложкой (r2); корешок — своей ступени и редкости */
    if (!/<div class="hb-fly"[^>]*><div class="hb-r1"><div class="hb-r2">/.test(w) || !new RegExp(`<span class="hb-spn"><span class="hs[^"]*" data-z="l" data-t="${tier}" data-r="${TT.H('h2').r}"`).test(w)) say('анимация: у книги в полёте нет объёма — выдвижения корешком и разворота обложкой, или корешок не её');
    /* перерисовка посреди — продолжение с того же места */
    Q.tick(Tm.cover0 + 100); h = g(); w = h.slice(h.indexOf('<div class="hb-win')); cnt.anim++;
    if (num2(w, '--d-cv') !== -100 || num2(w, '--d-pull') !== -(Tm.cover0 + 100) || num2(w, '--d-fly') !== Tm.fly0 - (Tm.cover0 + 100)) say(`анимация: перерисовка посреди — не с того же места (--d-cv ${num2(w, '--d-cv')})`);
    Q.tick(Tm.end - Tm.cover0 - 100 + 1); cnt.anim++;
    if (TT.S.hb.anim) say('анимация: в конце открытия показ не снят');
    h = g(); if (!/<div class="hb-win" data-r/.test(h) || /hb-anim|data-a="hbskip"/.test(h)) say('анимация: после открытия книга не раскрыта спокойно');
    if (/ away"/.test(cardOf(gridOf(h), 'h2'))) say('анимация: после открытия книга не вернулась на своё место на полке');
  }
  /* нажатие посреди — сразу итог */
  fr(); run('открытие 2', () => TT.ACT.hc('h2', fakeBtn(rect))); Q.tick(200); run('пропуск', () => TT.ACT.hbskip()); cnt.anim++;
  if (TT.S.hb.anim || /hb-anim/.test(g())) say('анимация: нажатие посреди не показало итог сразу');
  if (TT.S.hview !== 'mine' || TT.S.selHero !== 'h2') say('анимация: пропуск поменял состояние книги');
  /* ‹ › — лист перелистывается, в конце снят */
  run('листать', () => TT.ACT.hcstep('1')); cnt.anim++;
  { const a = TT.S.hb.anim, w = g(); if (!a || a.kind !== 'turn' || !/<div class="hb-win turn"/.test(w) || !/<i class="hb-leaf turn"/.test(w)) say('анимация: ‹ › без перелистывания'); Q.tick(TT.HB_VIEW.turn + 1); if (TT.S.hb.anim) say('анимация: перелистывание не снято в конце'); }
  run('листать назад', () => TT.ACT.hcstep('-1')); if (!/<i class="hb-leaf turn back"/.test(g())) say('анимация: «‹» листает не назад'); Q.tick(TT.HB_VIEW.turn + 1);
  /* закрытие без живой книги на экране — сразу, анимация не висит */
  run('закрыть', () => TT.ACT.hbclose('grid')); cnt.anim++;
  if (TT.S.hview !== 'own' || TT.S.hb.anim) say('анимация: закрытие без живой книги — не сразу');
  /* место карточки неизвестно — книга проступает на месте, без полёта из угла */
  fr(); run('без места', () => TT.ACT.hc('h2')); { const a = TT.S.hb.anim; if (!a || !a.g || a.g.fx !== 0 || a.g.fs >= 1000) say('анимация: без места карточки полёт не из центра'); }
  Q.tick(Tm.end + 1);
  /* от корешка нижней полки отрядов (удержание): книга стоит к игроку корешком — масштаб по высоте корешка, корешок на своём месте;
     выдвигается с полки, разворачивается обложкой и раскрывается поверх отрядов; закрытие на нижнюю полку — к корешку */
  fr(); TT.S.seg.heroes = 'squads'; TT.S.selSquad = 's2';
  { const s2 = TT.sq('s2'), x = TT.hrMine().find(y => !s2.m.includes(y.id)), sr = { left: 310, top: 318, width: 27, height: 96 };
    const spine = { classList: { contains: c => c === 'hs' }, querySelector: () => null, getBoundingClientRect: () => sr };
    run('корешок · удержание', () => TT.ACT.sqbook(x.id, spine)); cnt.anim++;
    const a = TT.S.hb.anim, t = tierOf(x.maxV), cbh = Math.floor((gh - G.padY - G.rib) * G.cb / 100), cbw = Math.floor(cbh * 9 / 16), th = Math.floor(cbh * TT.hbSpineR(t) / 1000);
    const sw = Math.min(G.max, gw - G.padX), bw = sw - G.lock, bh = gh - G.padY - G.rib, bx = Math.floor((gw - sw) / 2), by = Math.floor((gh - (gh - G.padY)) / 2);
    const cbx = Math.floor(bw * TT.HB_ART.spreads[t].g / 1000), cby = Math.floor((bh - cbh) / 2), fs = Math.floor(sr.height * 1000 / cbh);
    const want = { sp: 1, th, fs, fx: sr.left - bx - cbx - Math.floor((cbw - th) * fs / 2000), fy: sr.top - by - cby };
    if (TT.S.sq.book !== x.id || !a || a.kind !== 'in' || a.id !== x.id) say('анимация · корешок: удержание не раскрыло книгу героя с открытием');
    else for (const [k, v] of Object.entries(want)) if (a.g[k] !== v) say(`анимация · корешок: ${k} = ${a.g[k]}, ждали ${v}`);
    const w = g(); if (!/--r0:90deg/.test(w) || !w.includes('data-a="hbclose" data-v="sq"')) say('анимация · корешок: книга не стоит корешком в начале или закрытие не к отрядам');
    Q.tick(Tm.end + 1);
    TT.S.hb.anim = { id: x.id, kind: 'out', t0: Q.clock.now, T: TT.hbTimes('out'), g: TT.hbFlight({ x: sr.left, y: sr.top, w: sr.width, h: sr.height }, x.id, true), then: 'sq' };
    const wo = g(); if (!/<div class="hb-win out"/.test(wo) || !/--r1:90deg/.test(wo)) say('анимация · корешок: закрытие на нижнюю полку не к корешку');
    TT.S.hb.anim = null; run('корешок · закрыть', () => TT.ACT.hbclose('sq'));
    if (TT.S.sq.book) say('анимация · корешок: закрытие не вернуло к отрядам'); }
  /* книга героя состава поверх любого экрана и «За золото» — та же анимация */
  fr(); TT.S.seg.heroes = 'hire'; TT.S.seg.hire = 'gold';
  { const x = TT.RS.heroes.find(h => h.src === 'gold' && h.c <= TT.rsCyc() && !TT.rsHas(h)); run('золото · открытие', () => TT.ACT.gsel(x.id, fakeBtn(rect))); cnt.anim++;
    const a = TT.S.hb.anim; if (!a || a.kind !== 'in' || a.id !== x.id || !/<div class="hb-win in"/.test(g())) say('анимация: книга «За золото» раскрылась без анимации');
    Q.tick(Tm.end + 1); if (TT.S.hb.anim) say('анимация: у книги «За золото» показ не снят'); }
  /* ушли с книги не закрытием (другой экран) — показ забыт */
  fr(); run('уход', () => { TT.ACT.hc('h2', fakeBtn(rect)); TT.S.route = 'profile'; }); g(); cnt.anim++;
  run('уход · событие', () => { for (const f of Q.listeners('en-render')) f(); });
  if (TT.S.hb.anim) say('анимация: ушли с книги — показ не забыт');
  Q.tick(Tm.end + 1);
  /* «меньше движения» — без полёта и листов, плавная смена */
  const R = load({ clock: true, reduced: true }), TR = R.T;
  TR.S = TR.initialState(); TR.S.overlay = null; TR.S.route = 'heroes'; TR.S.seg.heroes = 'coll'; TR.S.hview = 'own';
  run('меньше движения', () => TR.ACT.hc('h2', fakeBtn(rect))); cnt.anim++;
  { const a = TR.S.hb.anim; run('отрисовка', () => TR.render()); const w = R.game();
    if (!a || a.kind !== 'fade' || a.g) say('меньше движения: открытие с полётом');
    if (!/<div class="hb-win fade"/.test(w) || /hb-anim|hb-leaf|hb-fly/.test(w)) say('меньше движения: в разметке полёт или листы');
    R.tick(TR.HB_VIEW.fade + 1); if (TR.S.hb.anim) say('меньше движения: плавная смена не снята в конце'); }
  /* рецепт анимации в данных: целые мс, короткая */
  for (const [k, v] of Object.entries(TT.HB_VIEW.open).concat(Object.entries(TT.HB_VIEW.close))) if (!Number.isInteger(v) || v < 0) say(`анимация: HB_VIEW ${k} = ${v} — не целое`);
}

/* ================== 9. арт книги ================== */
{
  const A = T.HB_ART, art = p => fs.existsSync(path.join(UI, 'assets', 'art', p));
  const known = [1, 2, 3, 4, 5].flatMap(t => [A.cover(t), A.spread(t), A.spine(t)]).concat(Object.values(A.img));
  for (const p of A.ready) { if (!known.includes(p)) say(`арт книги: неизвестный путь ${p}`); if (!art(p)) say(`арт книги: ${p} в HB_ART.ready, а файла нет`); }
  const int = (v, what) => { if (!Number.isInteger(v) || v < 0 || v > 1000) say(`арт книги: ${what} = ${v} — не целая тысячная доля`); };
  for (const t of [1, 2, 3, 4, 5]) {
    const c = A.covers[t], s = A.spreads[t];
    if (!c || !s) { say(`арт книги: нет геометрии ступени ${t}`); continue; }
    c.win.concat(c.core).forEach((v, i) => int(v, `обложка ${t}, ${i}`)); s.l.concat(s.r, s.core, [s.g]).forEach((v, i) => int(v, `разворот ${t}, ${i}`));
    if (c.win[0] + c.win[2] > 600 || c.win[1] + c.win[3] > 600) say(`арт книги: окно обложки ${t} меньше половины книги`);
    if (c.win[0] <= c.core[0] || c.win[1] <= c.core[1] || c.win[2] <= c.core[2] || c.win[3] <= c.core[3]) say(`арт книги: окно обложки ${t} не внутри тела книги`);
  }
  int(A.lock.key[0], 'скважина x'); int(A.lock.key[1], 'скважина y'); int(A.ribbon.notch, 'вырез ленты'); A.star.clip.flat().forEach(v => int(v, 'контур звезды'));
  for (const t of [1, 2, 3, 4, 5]) { const r = A.spines[t] && A.spines[t].ratio; int(r, `корешок ${t}`); if (!(r > 150 && r < 500)) say(`арт книги: корешок ${t} — толщина ${r} ‰ высоты, не книга`); }
  int(A.css.spine, 'корешок без арта');
  /* выгруженное — в переменные <html> и классы: замок, лента, звезда, форзац, лист; контур звезды — clip-path */
  for (const [k, cls] of [['--hb-lock', 'hb-lk'], ['--hb-ribbon', 'hb-rn'], ['--hb-star', 'hb-sr'], ['--hb-endp', 'hb-ep'], ['--hb-leaf', 'hb-lf']]) if (!P.rootVars[k] || !P.rootCls.has(cls)) say(`арт книги: ${k} не в переменных <html> или нет класса ${cls}`);
  if (!/^polygon\(/.test(P.rootVars['--hb-sclip'] || '')) say('арт книги: контур звезды не в clip-path');
  /* без выгруженного — CSS: ни одного пути books/ в разметке */
  fresh(); const keep = A.ready.slice(); A.ready.length = 0;
  T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.selHero = 'h2'; calm();
  const h = view('книга без арта');
  if (/assets\/art\/books\//.test(h)) say('без арта: в разметке пути невыгруженного арта книги — будут битые картинки');
  if (!/<i class="hb-cvc"/.test(h) || !/<i class="hb-spc"/.test(h)) say('без арта: обложку и разворот не рисует CSS');
  T.S.route = 'heroes'; T.S.seg.heroes = 'squads'; T.S.selSquad = 's2';
  { const hs = view('корешки без арта'); if (/assets\/art\/books\//.test(hs)) say('без арта: у корешков пути невыгруженного арта — будут битые картинки');
    if (!/<button class="hs[^"]*"[\s\S]*?<i class="hs-c" aria-hidden="true"><\/i>/.test(hs) || !hs.includes(`style="--sr:${A.css.spine}"`)) say('без арта: корешок не рисует CSS или толщина не CSS'); }
  T.S.seg.heroes = 'coll';
  A.ready.push(...keep);
  const h2 = view('книга с артом');
  if (!/<img class="hb-cva" src="[^"]*books\/cover-\d\.webp/.test(h2) || !/<img class="hb-spa" src="[^"]*books\/spread-\d\.webp/.test(h2)) say('с артом: книга не берёт обложку и разворот рисунком');
  T.S.seg.heroes = 'squads'; { const hs = view('корешки с артом'); if (!/<img class="hs-a" src="[^"]*books\/spine-\d\.png/.test(hs)) say('с артом: корешок не берёт рисунок своей ступени'); } T.S.seg.heroes = 'coll';
}

/* ================== 10. UI-кит «Карточка-книга» и карта экранов ================== */
{
  fresh();
  const k = T.KIT_EXTRA.find(x => x.html === T.hbKitHtml);
  if (!k) say('UI-кит: нет раздела «Карточка-книга»');
  else for (const team of [false, true]) {
    run('режим', () => T.setTeam(team)); fresh();
    const h = run('UI-кит · книга', () => k.html()) || ''; cnt.views++;
    if (!/<h3>Карточка-книга<\/h3>/.test(h)) { say('UI-кит: раздел «Карточка-книга» не рисуется'); continue; }
    const bad = h.match(/.{0,40}(?:undefined|NaN|\[object ).{0,40}/); if (bad) say(`UI-кит · книга: undefined, NaN или [object — «${bad[0]}»`);
    const tiers = [...h.matchAll(/<figure class="hbk-f"[^>]*><button class="hb[^"]*" data-z="l" data-t="(\d)"/g)].map(m => m[1]).slice(0, 5);
    if (tiers.join() !== '1,2,3,4,5') say(`UI-кит: пять ступеней книги — ${tiers.join(', ')}, ждали 1…5`);
    if (count(h, /data-z="m" data-t="3" data-r="\d"/g) < 7) say('UI-кит: не семь редкостей');
    for (const s of ['off', 'wait', 'ready', 'on']) if (!h.includes(`<i class="hb-l ${s}"></i>`)) say(`UI-кит: нет замка «${s}»`);
    if (!/<button class="hb blank/.test(h) || !/<button class="hb[^"]* soul/.test(h) || !/<button class="hb[^"]* gray/.test(h)) say('UI-кит: нет стадий — не найден, неизвестная душа, известный');
    if (!/data-z="s"/.test(h) || !/data-z="m"/.test(h)) say('UI-кит: нет размеров книги');
    if (count(h, /<div class="hb-win/g) < 3) say('UI-кит: нет раскрытых книг — своего героя, «до покупки», неизвестной души');
    if (!/<ol class="hbk-beats">/.test(h)) say('UI-кит: нет раскадровки анимации');
    if (!team) scan(h, 'UI-кит · книга');
  }
  run('режим «Игрок»', () => T.setTeam(false));
  const heroes = html.match(/\{ n: 'Герои'[\s\S]*?\},\r?\n/);
  for (const id of ['heroes', 'hero', 'hero-story', 'orders', 'collection-passives', 'hire-preview', 'recruitment']) if (!heroes || !new RegExp(`ready:\\s*\\[[^\\]]*'${id}'`).test(heroes[0])) say(`карта экранов: ${id} не отмечен готовым у «Героев»`);
}

/* ================== 11. «Библиотека Этриона»: книги на полках шкафа ================== */
{
  const LV = T.LB_VIEW, LA = T.LB_ART;
  /* шкаф: карниз со строкой, стойки, лампады, свет снизу, пыль; ряды — по lbCols, у каждого ряда полка с кронштейнами */
  const caseOf = (h, where) => {
    const at = h.indexOf('<div class="lb-case');
    if (at < 0) { say(`${where}: нет шкафа`); return ''; }
    const c = h.slice(at);
    if (!/<div class="lb-top"><i class="lb-cn" aria-hidden="true"><\/i><div class="hkh">/.test(c)) say(`${where}: на карнизе нет строки счётчиков, порядка и фильтра`);
    for (const k of ['<i class="lb-post l"', '<i class="lb-post r"', '<i class="lb-lamp l"', '<i class="lb-lamp r"', '<i class="lb-glow"']) if (!c.includes(k)) say(`${where}: нет части шкафа ${k}`);
    const dust = c.match(/<span class="lb-dust" aria-hidden="true">([\s\S]*?)<\/span>/);
    if (!dust || count(dust[1], /<i style="--x:\d+%;--y:\d+%;--dx:-?\d+px;--dy:-?\d+px;--d:-?\d+ms;--s:\d+ms"><\/i>/g) !== LV.dust) say(`${where}: пыли в луче не ${LV.dust} пылинок`);
    return c;
  };
  const shelvesOf = (h, where, ids, n) => {
    const g = gridOf(h), m = g.match(/<div class="hkg lb-shv scroll" style="--n:(\d+)"/);
    if (!m || +m[1] !== n) say(`${where}: на полке ${m ? m[1] : '—'} книг, lbCols — ${n}`);
    const rows = g.split('<div class="lb-row').slice(1), want = Math.max(LV.rows, Math.ceil(ids.length / n));
    if (rows.length !== want) say(`${where}: полок ${rows.length}, ждали ${want}`);
    let seen = [];
    rows.forEach((r, i) => {
      const got = cardsOf(r).map(c => (c.match(/data-v="([^"]+)"/) || [])[1]), full = Math.min(n, Math.max(0, ids.length - i * n));
      if (got.length !== full) say(`${where}: на полке ${i + 1} книг ${got.length}, ждали ${full} — ряды полные, кроме последнего`);
      if (count(r, /<i class="lb-pl" aria-hidden="true"><i class="lb-br l"><\/i><i class="lb-br r"><\/i><\/i>/g) !== 1) say(`${where}: у ряда ${i + 1} нет своей полки с кронштейнами`);
      seen = seen.concat(got);
    });
    if (seen.join() !== ids.join()) say(`${where}: порядок книг по полкам не тот`);
    return rows;
  };
  fresh();
  { const h = collView('шкаф · «Мои»'), ids = T.hcOwnList().map(v => v.id); caseOf(h, 'шкаф · «Мои»'); shelvesOf(h, 'шкаф · «Мои»', ids, T.lbCols(T.HC_VIEW.card)); }
  { const n = T.lbCols(T.HC_VIEW.card), mine = T.hrMine(), by = [['el', x => x.el], ['c', x => x.cycle], ['cls', x => (T.hrV(x).rh ? T.hrV(x).rh.cl[0] : '')], ['r', x => x.r]];
    const pick = by.map(([k, f]) => [k, [...new Set(mine.map(f))].find(v => { const q = mine.filter(x => f(x) === v).length; return q >= 1 && q < n; })]).find(([, v]) => v != null);
    if (!pick) say('шкаф: в демо нет фильтра на один неполный ряд — пустую полку не проверить'); else run('шкаф · фильтр', () => T.ACT.hcf(`${pick[0]}:${pick[1]}`)); }
  { const h = collView('шкаф · «Мои» · один'), ids = T.hcOwnList().map(v => v.id); if (ids.length > T.lbCols(T.HC_VIEW.card)) say('шкаф: фильтр для проверки пустой полки — не один ряд');
    const rows = shelvesOf(h, 'шкаф · «Мои» · фильтр', ids, T.lbCols(T.HC_VIEW.card)); if (!rows.slice(1).every(r => /^ empty"/.test(r) && r.includes('<i class="lb-ph"></i>'))) say('шкаф: пустые полки не дорисованы в высоту книги'); }
  run('шкаф · пусто', () => { T.ACT.hcclr(); T.ACT.hcf('cls:фармер'); T.ACT.hcf('el:Тьма'); });
  { const h = collView('шкаф · никого'); if (!/<div class="lb-row say">[\s\S]*?data-a="hcclr"/.test(gridOf(h))) say('шкаф: пустой фильтр — нет строки на полке со «Сбросить»'); }
  run('шкаф · сброс', () => T.ACT.hcclr());
  { const h = collView('шкаф · каталог', { all: true }), ids = T.hcCatList().map(v => v.id); caseOf(h, 'шкаф · каталог'); shelvesOf(h, 'шкаф · каталог', ids, T.lbCols(T.HC_VIEW.card)); }
  /* «За золото»: у каждой книги табличка на кромке — цена следующего найма (нехватка — тусклая), купленный — «в коллекции» */
  for (const c of [1, 2, 3]) {
    fresh(); T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'gold'; T.S.rs.gcyc = c;
    const where = `шкаф · «За золото» · цикл ${c}`, h = view(where), cat = T.RS.heroes.filter(x => x.src === 'gold' && x.c === c).sort((a, b) => a.no - b.no);
    caseOf(h, where);
    if (c > T.rsCyc()) { if (cardsOf(gridOf(h)).length || !/<div class="lb-row say">[\s\S]*?откроется при переходе на цикл/.test(gridOf(h))) say(`${where}: будущий цикл — книги видны или не сказано, когда откроется`); continue; }
    shelvesOf(h, where, cat.map(x => x.id), T.lbCols(T.HC_VIEW.gold));
    const k = T.rsBought(c) + 1, price = T.fmt(T.rsGold(c, k)), lack = T.S.wallet.gold < T.rsGold(c, k);
    const cells = [...gridOf(h).matchAll(/<div class="lb-c">(<button class="hb[\s\S]*?<\/button>)(<span class="lb-tag[\s\S]*?<\/span>)?<\/div>/g)];
    if (cells.length !== cat.length) say(`${where}: ячеек с книгой ${cells.length}, героев картотеки ${cat.length}`);
    for (const [, book, tag] of cells) {
      const id = (book.match(/data-v="([^"]+)"/) || [])[1], x = T.RSI[id];
      if (!tag) { say(`${where} · ${x ? x.n : id}: нет таблички на кромке полки`); continue; }
      if (T.rsHas(x)) { if (!tag.includes('lb-tag own') || !tag.includes('в коллекции')) say(`${where} · ${x.n}: у купленного на табличке не «в коллекции»`); }
      else if (!tag.includes(`<b class="num">${price}</b>`) || !tag.includes('gold') || /lb-tag lack/.test(tag) !== lack) say(`${where} · ${x.n}: на табличке не цена следующего найма ${price} или нехватка не видна`);
    }
  }
  { fresh(); T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = 'gold'; T.S.wallet.gold = 0;
    const h = view('шкаф · «За золото» · без золота'); if (!/<span class="lb-tag lack" title="Не хватает [^"]+ золота">/.test(h)) say('шкаф · «За золото»: нехватка золота — табличка не тусклая или не сказано, сколько не хватает'); }
  /* арт шкафа: пути на диске, адреса и классы у <html>, геометрия целая; без арта — CSS */
  const art = p => fs.existsSync(path.join(UI, 'assets', 'art', p));
  for (const p of LA.ready) { if (!Object.values(LA.img).includes(p)) say(`арт шкафа: неизвестный путь ${p}`); if (!art(p)) say(`арт шкафа: ${p} в LB_ART.ready, а файла нет`); }
  for (const [k, cls, p] of [['--lb-wall', 'lb-w', LA.img.wall], ['--lb-plank', 'lb-p', LA.img.plank], ['--lb-cornice', 'lb-c', LA.img.cornice], ['--lb-post', 'lb-s', LA.img.post], ['--lb-foot', 'lb-f', LA.img.foot], ['--lb-bracket', 'lb-b', LA.img.bracket], ['--lb-lamp', 'lb-l', LA.img.lamp]])
    if (LA.ready.includes(p) && (!P.rootVars[k] || !P.rootCls.has(cls))) say(`арт шкафа: ${k} не в переменных <html> или нет класса ${cls}`);
  for (const v of [LA.plank.surf, ...LA.cornice.band, LA.foot.ratio, ...LA.foot.post, LA.bracket.ratio, LA.lamp.ratio, LA.css.surf, ...LA.css.band]) if (!Number.isInteger(v) || v < 0 || v > 5000) say(`арт шкафа: геометрия ${v} — не целая доля`);
  for (const [k, v] of Object.entries(LV)) if (typeof v === 'number' && !Number.isInteger(v)) say(`шкаф: LB_VIEW.${k} = ${v} — не целое`);
  { const keep = LA.ready.slice(); LA.ready.length = 0; if (!T.lbVars().includes(`--lb-su:${LA.css.surf}`)) say('шкаф без арта: доска полки не по CSS'); LA.ready.push(...keep); if (!T.lbVars().includes(`--lb-su:${LA.plank.surf}`)) say('шкаф с артом: верх доски не по рисунку'); }
  /* UI-кит «Библиотека Этриона»: в обоих режимах, в режиме «Игрок» служебного нет */
  const k = T.KIT_EXTRA.find(x => x.html === T.lbKitHtml);
  if (!k) say('UI-кит: нет раздела «Библиотека Этриона»');
  else for (const team of [false, true]) {
    run('режим', () => T.setTeam(team)); fresh();
    const h = run('UI-кит · шкаф', () => k.html()) || ''; cnt.views++;
    if (!/<h3>Библиотека Этриона<\/h3>/.test(h)) { say('UI-кит: раздел «Библиотека Этриона» не рисуется'); continue; }
    const bad = h.match(/.{0,40}(?:undefined|NaN|\[object ).{0,40}/); if (bad) say(`UI-кит · шкаф: undefined, NaN или [object — «${bad[0]}»`);
    if (count(h, /<div class="lb-case/g) < 2 || !/<span class="lb-tag/.test(h)) say('UI-кит · шкаф: нет шкафа с полками или полки «За золото» с табличками');
    for (const t of [1, 2, 3, 4, 5]) if (!new RegExp(`<span class="hs[^"]*" data-z="l" data-t="${t}"`).test(h)) say(`UI-кит · шкаф: нет корешка ${t}-й ступени`);
    for (let r = 1; r <= 7; r++) if (!new RegExp(`<span class="hs[^"]*" data-z="l" data-t="3" data-r="${r}"`).test(h)) say(`UI-кит · шкаф: нет корешка редкости ${r}`);
    if (!/<span class="hs dim"/.test(h) || !/data-z="s"/.test(h)) say('UI-кит · шкаф: нет занятого корешка или корешков отсека');
    if (/data-a="(?!noop)/.test(h) || /data-hold=/.test(h)) say('UI-кит · шкаф: в разделе живые кнопки');
    if (!team) scan(h, 'UI-кит · шкаф');
  }
  run('режим «Игрок»', () => T.setTeam(false));
}
done();
