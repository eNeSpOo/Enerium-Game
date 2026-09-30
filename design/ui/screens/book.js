/* screens/book.js — карточка героя — книга: одна функция на весь прототип, раскрытая книга героя и анимация открытия.
   Выбор автора 30.09.2026 (ADR-0032, раздел «Выбор автора — карточка-книга»): «Мне нравится эта концепция книг, и я хочу, чтобы
   сами книги и означали, по сути, героя с 1 максимальной доблестью, 2, 3, 4, 5. Нажимая на героя, мы и открываем информацию о герое
   как будто в виде книги — информация о нём, от скиллов до прокачки, — это по сути его часть истории, как и сами главы. Замки со
   светящимся бирюзовым цветом в виде рунных пределов — 10 из 10. Красные печати — лишнее»; о закладках: «корешки слишком длинные:
   это всё-таки сетка героев будет… эти карточки будут показываться в разных режимах»; «создаём анимацию открытия книги после нажатия
   на карточку… с генерацией всех артов, что потребуется, и партиклами» — да.
   Регистрирует:
   — hbCard(вид, o) — книгу героя. Ступень книги = личный максимум доблести (hbTier): 1 — простая кожаная, 2 — окованная с застёжкой,
     3 — резной оклад, 4 — кодекс с костью и железом, 5 — гримуар с шипами и светом из обреза страниц. Редкость — кристалл на обложке
     (значки r1…r7) и свет книги (цвета ADR-0027, у обычной свечения почти нет). Рунные пределы — пять навесных замков по правому
     краю: пройденный отперт и светит бирюзой из скважины (всегда бирюзой), следующий на потолке уровня тлеет или пульсирует (только
     у героя этого аккаунта). Взятая доблесть — короткие ленты-закладки из нижнего края: лент столько, каков максимум, взятая — цвета
     редкости со звёздочкой, невзятая — блёклая. Уровень — круг слева сверху, стихия — медальон справа сверху, класс — щит слева снизу,
     мощь — мечи и число справа снизу, имя — на плашке. Размер o.z: l — сетки, m — витрины, s — отряды и списки (только главное:
     редкость, доблесть, пределы, уровень). Стадии знакомства (hrStage, screens/heroes.js): неизвестная душа — силуэт класса и полоса
     осколков; hbBlank — безымянная книга не найденного героя (веер рулетки, отряд недели);
   — раскрытую книгу hbWin: разворот своей ступени, слева — портрет во всю страницу (лупа — OV.hczoom), кружок уровня, медальон
     стихии, щит класса, мощь, табличка с именем, редкостью, классом и расой и стрелки ‹ › к соседнему герою; справа — страница-
     пергамент без шапки: вкладки heroDetail (index.html; развитие и снаряжение — screens/hero-dev.js; страницы, закладки и тема
     чернил — screens/book-pages.js) кожаными закладками по верхнему краю страницы, у книги «до покупки» — «Герой», «Мощь», «Навыки»,
     «Путь» и одно действие, у неизвестной души — только осколки и где их брать. Замки — на переплёте справа, ленты — снизу,
     кристалл — у корешка. Логика вкладок не дублируется;
   — слой книги поверх сетки (обёртка overlay из index.html): коллекция (S.hview mine и rs) и «За золото» (S.rs.gsel) — книга
     раскрывается поверх сетки, из которой её открыли; книга героя отряда (S.sq.book, долгое нажатие на корешок или книгу отряда) —
     поверх отрядов; окно OV.rhero (screens/heroes.js) — та же книга поверх любого экрана;
   — hbSpine(вид, o) — корешок книги: книга на полке боком («Библиотека Этриона», screens/library.js) — нижняя полка отрядов, отсеки
     шкафа отрядов, грань книги в полёте анимации. Материал — ступень книги, редкость — кристалл и ярлык, класс, уровень, имя;
   — анимацию (hbOpenFx, hbTurnFx, ACT.hbclose, ACT.hbskip). Открытие продолжает картину шкафа: книга выдвигается с полки к игроку
     и встаёт корешком (книга с нижней полки — только выдвигается), летит в центр и разворачивается обложкой (3D, rotateY с перспективой;
     толщина — корешок своей ступени), обложка открывается, листы перелистываются; пыль, искры и свет цвета редкости из страниц; книга
     раскрывается в окно героя. Закрытие — книга закрывается и летит обратно на своё место (на нижнюю полку — корешком). ‹ › — лист
     перелистывается. Время — от нажатия (S.hb.anim.t0): разметка рисуется из момента, перерисовка посреди анимации её не рвёт;
     нажатие — сразу итог; «меньше движения» — без полёта и листов, плавная смена. Движутся только transform и opacity. Сервер решает
     до анимации: книга только показывает, состояние меняется сразу;
   — раздел UI-кита «Карточка-книга» (KIT_EXTRA) и сценарии презентации.
   Арт — tools/art-gen/jobs/hero-books.json; геометрия каждой картинки — tools/art-gen/book_layers.py → HB_ART (тысячные доли её
   рамки, только целые); пока путь не в HB_ART.ready, книгу рисует CSS (book.css). Числа вида — HB_VIEW. Своё состояние — S.hb.
   Автопроверка — tools/content-gen/screens/check_heroes.js, раздел «Книга»; страницы разворота — check_hero_book.js. */
'use strict';

/* ================== вид: числа — здесь, в функциях только алгоритм. Вид, не баланс ================== */
const HB_VIEW = {
  tiers: 5,              // ступеней книги: ступень = личный максимум доблести героя
  glow: [6, 34, 40, 46, 54, 60, 66],   // свет книги по редкости r1…r7, %: у обычной почти нет (ADR-0027)
  motes: 5,              // угольков над гримуаром (ступень 5); движутся transform и opacity
  /* окно книги: не шире max, поля по сторонам и сверху-снизу (px); под книгой — полоса лент (rib), справа — выступ замков (lock);
     закрытая книга в полёте — cb % высоты раскрытой; поле (gw × gh) — если размер игры не узнать */
  win: { max: 904, padX: 28, padY: 20, rib: 22, lock: 16, cb: 92, gw: 932, gh: 430 },
  /* открытие, мс: книга выдвигается с полки к игроку и встаёт корешком — pull (подъём lift px, к игроку near px), летит в центр
     и разворачивается обложкой — fly; обложка — cover, листов — leaves, каждый — leaf, шаг — leafStep, первый — через leafAt %
     обложки; страницы проступают — show */
  open: { pull: 300, fly: 540, cover: 520, leaves: 3, leaf: 380, leafStep: 90, leafAt: 66, show: 280, lift: 10, near: 120 },
  /* закрытие, мс: страницы гаснут — hide, обложка закрывается — cover, полёт в сетку — fly */
  close: { hide: 180, cover: 420, fly: 380 },
  turn: 380,             // ‹ ›: лист перелистывается, мс
  fade: 240,             // «меньше движения»: плавная смена, мс
  /* частицы: пыль и искры — сколько; разлёт искр — px */
  fx: { dust: 12, sparks: 10, spread: 90 },
};
/* арт книги (tools/art-gen/jobs/hero-books.json, выгрузка export_ui.py в assets/art/books/). ready — выгруженные пути: пока пути нет,
   книгу рисует CSS. Геометрия — вывод tools/art-gen/book_layers.py, тысячные доли рамки рисунка, только целые:
   covers[ступень] — win — окно под портрет [сверху, справа, снизу, слева], core — тело книги без выступов (шипы, кость, свет обреза);
   spreads[ступень] — l и r — левая и правая страницы [сверху, справа, снизу, слева], g — корешок по ширине, core — тело книги;
     e — полоса обреза внизу правой страницы (торцы листов блока), ‰ её высоты: писать по ней нельзя, поле .hb-rp снизу — над ней
     (снято глазами по рисунку разворота 30.09.2026);
   lock — замок: закрытый и отпертый на одном холсте, тела совпадают; key — скважина закрытого [x, y], glow — свет отпертого;
   ribbon — лента: ratio — ширина к высоте, ‰; notch — вершина выреза «ласточкин хвост» от низа, ‰ ширины ленты;
   star — звёздочка: ratio и контур clip-path — 16 точек [x, y]; spines[ступень] — корешок: ratio — ширина к высоте (толщина книги),
   ‰ (tools/art-gen/shelf_layers.py spines, задание jobs/library-shelves.json); css — геометрия книги без арта */
const HB_ART = {
  ready: ['books/cover-1.webp', 'books/cover-2.webp', 'books/cover-3.webp', 'books/cover-4.webp', 'books/cover-5.webp',
    'books/spread-1.webp', 'books/spread-2.webp', 'books/spread-3.webp', 'books/spread-4.webp', 'books/spread-5.webp',
    'books/lock.png', 'books/lock-open.png', 'books/ribbon.png', 'books/star.png', 'books/endpaper.jpg', 'books/leaf.jpg',   // выгрузка 30.09.2026
    'books/spine-1.png', 'books/spine-2.png', 'books/spine-3.png', 'books/spine-4.png', 'books/spine-5.png'],              // корешки — 30.09.2026, вечер
  cover: t => 'books/cover-' + t + '.webp',
  spread: t => 'books/spread-' + t + '.webp',
  spine: t => 'books/spine-' + t + '.png',
  spines: { 1: { ratio: 284 }, 2: { ratio: 266 }, 3: { ratio: 291 }, 4: { ratio: 272 }, 5: { ratio: 319 } },
  img: { lockOff: 'books/lock.png', lockOn: 'books/lock-open.png', ribbon: 'books/ribbon.png', star: 'books/star.png', endpaper: 'books/endpaper.jpg', leaf: 'books/leaf.jpg' },
  covers: {
    1: { win: [113, 176, 197, 173], core: [1, 3, 1, 1] },
    2: { win: [178, 176, 221, 230], core: [0, 1, 1, 1] },
    3: { win: [114, 180, 276, 233], core: [0, 1, 1, 4] },
    4: { win: [102, 163, 243, 253], core: [0, 3, 25, 36] },
    5: { win: [135, 291, 275, 239], core: [34, 34, 6, 14] },
  },
  spreads: {
    1: { l: [5, 501, 88, 40], r: [5, 41, 80, 507], g: 503, core: [2, 2, 7, 2], e: 40 },
    2: { l: [3, 500, 81, 32], r: [3, 32, 94, 502], g: 501, core: [4, 3, 5, 4], e: 65 },
    3: { l: [29, 543, 113, 46], r: [28, 67, 123, 516], g: 486, core: [11, 33, 43, 2], e: 42 },
    4: { l: [1, 502, 79, 89], r: [1, 89, 84, 503], g: 500, core: [2, 5, 6, 5], e: 60 },
    5: { l: [23, 505, 117, 32], r: [23, 62, 136, 507], g: 501, core: [22, 6, 11, 5], e: 40 },
  },
  lock: { ratio: 817, key: [469, 582], glow: [507, 611] },
  ribbon: { ratio: 300, notch: 463 },
  star: { ratio: 960, clip: [[495, 57], [571, 319], [608, 389], [652, 436], [928, 498], [691, 577], [631, 628], [577, 692], [495, 991], [415, 681],
    [363, 625], [328, 565], [68, 498], [339, 437], [383, 391], [421, 330]] },
  css: { win: [118, 168, 212, 158], core: [0, 0, 0, 0], l: [45, 506, 70, 34], r: [45, 34, 70, 506], g: 500, notch: 350, spine: 280 },
};

/* ================== помощники ================== */
const hbArt = p => HB_ART.ready.includes(p);
const hbNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
const hbReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
/* тысячные доли — в проценты для CSS строкой, без дробей в расчёте: 113 → «11.3%» */
const hbPct = v => `${v < 0 ? '-' : ''}${Math.floor(Math.abs(v) / 10)}.${Math.abs(v) % 10}%`;
/* ступень книги — личный максимум доблести, 1…5 */
const hbTier = v => Math.max(1, Math.min(HB_VIEW.tiers, (v && v.maxV) || 1));
/* стадия героя в книге: у вида героя — своя (hrV), у чужого героя с прогрессом (соперник Арены, профиль) — «в коллекции» */
const hbStage = v => (v.st != null ? v.st : v.own ? 3 : 2);
const hbTop = () => INV.hero.capByLim.length - 1;   // замков — пределов в круге (§10.1)
/* геометрия обложки ступени: рисунок, когда выгружен; иначе CSS */
function hbCoverGeo(t) {
  const p = HB_ART.cover(t);
  return hbArt(p) ? Object.assign({ art: p }, HB_ART.covers[t]) : { art: '', win: HB_ART.css.win, core: HB_ART.css.core };
}
function hbSpreadGeo(t) {
  const p = HB_ART.spread(t);
  return hbArt(p) ? Object.assign({ art: p }, HB_ART.spreads[t]) : { art: '', l: HB_ART.css.l, r: HB_ART.css.r, g: HB_ART.css.g, core: HB_ART.css.core, e: 0 };
}
/* переменные раскладки: окно и тело книги — целые тысячные доли, CSS делит сам */
const hbGeoVars = g => `--wt:${g.win[0]};--wr:${g.win[1]};--wb:${g.win[2]};--wl:${g.win[3]};--ct:${g.core[0]};--cr:${g.core[1]};--cb:${g.core[2]};--cl:${g.core[3]}`;
const hbSpreadVars = g => `--lt:${g.l[0]};--lr:${g.l[1]};--lb:${g.l[2]};--ll:${g.l[3]};--rt:${g.r[0]};--rr:${g.r[1]};--rb:${g.r[2]};--rl:${g.r[3]};--gx:${g.g};--ct:${g.core[0]};--cr:${g.core[1]};--cb:${g.core[2]};--cl:${g.core[3]};--re:${g.e || 0}`;
/* нарисованные замок, лента, звезда, форзац и лист — адреса в переменные <html>, как значки --ico-*; класс у <html> говорит CSS, что
   рисунок есть. Контуры ленты и звезды — clip-path из геометрии: цвет редкости ложится только на ткань и металл (маска-картинка у
   страницы с диска не грузится) */
(function hbArtVars() {
  const R = document.documentElement, st = R && R.style, I = HB_ART.img, abs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
  if (!st) return;
  const set = (k, p, cls) => { if (!hbArt(p)) return; try { st.setProperty(k, `url("${abs(p)}")`); if (cls && R.classList) R.classList.add(cls); } catch (_) { } };
  set('--hb-lock', I.lockOff, 'hb-lk'); set('--hb-lock-on', I.lockOn); set('--hb-ribbon', I.ribbon, 'hb-rn'); set('--hb-star', I.star, 'hb-sr');
  set('--hb-endp', I.endpaper, 'hb-ep'); set('--hb-leaf', I.leaf, 'hb-lf');
  try {
    st.setProperty('--hb-notch', String(hbArt(I.ribbon) ? HB_ART.ribbon.notch : HB_ART.css.notch));
    if (hbArt(I.star)) st.setProperty('--hb-sclip', `polygon(${HB_ART.star.clip.map(([x, y]) => `${hbPct(x)} ${hbPct(y)}`).join(',')})`);
    st.setProperty('--hb-key-x', hbPct(HB_ART.lock.key[0])); st.setProperty('--hb-key-y', hbPct(HB_ART.lock.key[1]));
  } catch (_) { }
})();

/* ================== книга героя: одна функция на весь прототип ==================
   v — вид героя (hrV / hcView, screens/heroes.js; соперника и профиля — свой вид той же формы). o:
   z — размер: l (сетки), m (витрины), s (отряды и списки); act, val — действие; sel — выбрана; dim — тусклая (занят в листе режима);
   note — занятость поверх портрета; gray — чёрно-белая (известный, но не купленный — каталог); shard — [собрано, нужно] — полоса
   осколков; own — отметка «в коллекции» у купленного (витрины); bm — мощь: у своего героя по умолчанию в l, false — без неё;
   foot — своё внизу (цена в лавке праха); rpNext — состояние следующего замка вместо рассчитанного (UI-кит); stage — стадия вместо
   рассчитанной (UI-кит) */
const HB_Z = { l: 1, m: 1, s: 1 };
/* замки пределов: сверху вниз I…V, пройденные отперты и светят бирюзой, следующий на потолке уровня тлеет (wait) или пульсирует (ready) */
const hbLocks = (n, nx) => `<span class="hb-lk" aria-hidden="true">${Array.from({ length: hbTop() }, (_, i) => `<i class="hb-l ${i < n ? 'on' : i === n && nx ? nx : 'off'}"></i>`).join('')}</span>`;
/* ленты доблести: столько, каков личный максимум; взятые — цвета редкости со звёздочкой, остальные — блёклые */
const hbRibs = (valor, maxV) => maxV > 0 ? `<span class="hb-rb" style="--n:${maxV}" aria-hidden="true">${Array.from({ length: maxV }, (_, i) => `<i class="${i < valor ? 'on' : ''}"><s></s><b></b></i>`).join('')}</span>` : '';
/* мощь со значком мечей: коротко на книге (hcNum), полностью в подсказке */
const hbBm = (n, px) => `<span class="hb-bm" title="Боевая мощь ${fmt(n)}">${ICON('power', px, 'Боевая мощь')}<b class="num">${hcNum(n)}</b></span>`;
/* угольки над гримуаром: места и задержки — от номера, без случайности */
const hbMotes = () => `<span class="hb-fx" aria-hidden="true">${Array.from({ length: HB_VIEW.motes }, (_, i) => `<i style="--x:${(i * 37 + 17) % 70 + 15}%;--d:${(i * 610) % 3000}ms;--s:${2200 + (i * 330) % 1400}ms"></i>`).join('')}</span>`;
/* низ обложки: у l — щит класса и мощь (у героя вне коллекции — по базовым статам), у купленного в витрине — отметка; у m и s —
   своё внизу (цена) или мощь, если её просят (витрины); полоса осколков — над плашкой имени */
function hbFoot(v, o, z, own) {
  const cls = z === 'l' ? `<span class="hb-cls" title="${hrEsc(v.cls)}">${CLS(v.ic, 16, v.cls)}</span>` : '';
  const right = o.foot != null ? o.foot : o.own && own ? `<span class="hb-in">${ic('check')}в коллекции</span>`
    : o.bm !== false && (z === 'l' || o.bm) ? hbBm(v.bm, 12) : '';
  return cls || right ? `<span class="hb-ft">${cls}<span class="g-spacer"></span>${right}</span>` : '';
}
/* обложка — книга без кнопки: карточка и закрытая книга в полёте анимации */
function hbCover(v, o = {}) {
  const z = HB_Z[o.z] ? o.z : 'l', st = o.stage != null ? o.stage : hbStage(v), t = hbTier(v), g = hbCoverGeo(t), own = st === 3 && !o.gray;
  const nx = own ? (o.rpNext != null ? o.rpNext : hrRpNext(v)) : '';
  const note = o.note != null ? o.note : own ? v.busy || '' : '';
  const lv = own ? `<span class="hb-lv${String(v.lvl).length > 3 ? ' w4' : ''}" title="Уровень ${v.lvl} из ${v.cap}"><b class="num">${v.lvl}</b></span>` : '';
  const elm = z !== 's' && v.el ? `<span class="hb-el">${el(v.el, true)}</span>` : '';
  const nm = z !== 's' ? `<b class="hb-nm">${hrEsc(v.n)}</b>` : '';
  const sh = o.shard && z !== 's' ? hcShard(Object.assign({}, v, { st }), o.shard[0], o.shard[1]) : '';
  const cover = g.art ? `<img class="hb-cva" src="${AV(g.art)}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : '<i class="hb-cvc" aria-hidden="true"></i>';
  return `<span class="hb-bk" style="${hbGeoVars(g)};--hb-g:${HB_VIEW.glow[(v.r || 1) - 1] || 0}"><i class="hb-gl" aria-hidden="true"></i><span class="hb-ph">${hcFace(Object.assign({}, v, { st }))}</span>${cover}${t >= HB_VIEW.tiers && !o.gray && !o.lock ? hbMotes() : ''}
    <i class="hb-cr" aria-hidden="true"></i>${lv}${elm}${own ? hbLocks(v.lim, nx) : ''}${sh ? `<span class="hb-shw">${sh}</span>` : ''}${nm}${z === 's' && !o.bm ? '' : hbFoot(v, o, z, own)}${note ? `<span class="hb-busy">${note}</span>` : ''}</span>`;
}
/* книгу сняли с полки — она в полёте анимации (открытие или закрытие): на своём месте её нет, пока не вернётся */
function hbAway(id) {
  const A = typeof S !== 'undefined' && S && S.hb && S.hb.anim;
  return !!(A && A.id === id && (A.kind === 'in' || A.kind === 'out') && hbAnimFor(id));
}
/* книга-кнопка: обложка и ленты доблести под ней */
function hbCard(v, o = {}) {
  if (!v) return '';
  const z = HB_Z[o.z] ? o.z : 'l', st = o.stage != null ? o.stage : hbStage(v), t = hbTier(v), own = st === 3 && !o.gray;
  const nx = own ? (o.rpNext != null ? o.rpNext : hrRpNext(v)) : '', note = o.note != null ? o.note : own ? v.busy || '' : '';
  const mx = own && typeof hcMax === 'function' && hcMax(v), away = hbAway(v.id);
  const say = `${v.n}, ${RAR[v.r].toLowerCase()}, ${v.cls}, ${String(v.el).toLowerCase()}, книга ${t}-й ступени${st === 1 ? ', неизвестная душа' : ''}${own ? `, уровень ${v.lvl}, рунный предел ${v.lim} из ${hbTop()}${nx === 'ready' ? ' — можно пробить следующий' : ''}, мощь ${fmt(v.bm)}` : `, мощь по базовым статам ${fmt(v.bm)}`}, доблесть ${own ? v.valor : 0} из ${v.maxV}${o.shard ? `, осколки ${o.shard[0]} из ${o.shard[1]}` : ''}${note ? ', ' + note : ''}`;
  const cls = ['hb', o.gray ? 'gray' : '', st === 1 ? 'soul' : '', o.sel ? 'sel' : '', o.dim ? 'dim' : '', away ? 'away' : ''].filter(Boolean).join(' ');
  return `<button class="${cls}" data-z="${z}" data-t="${t}" data-r="${v.r}" data-s="${st}"${mx ? ' data-max="1"' : ''} data-a="${o.act || 'hc'}" data-v="${o.val != null ? o.val : v.id}"${o.sel ? ' aria-pressed="true"' : ''} aria-label="${hrEsc(say)}">${hbCover(v, Object.assign({}, o, { z, stage: st }))}${hbRibs(own ? v.valor : 0, v.maxV)}</button>`;
}
/* безымянная книга не найденного героя (веер рулетки, отряд недели): ни ступени, ни редкости, ни имени; lock — герой будущего цикла */
function hbBlank(o = {}) {
  const z = HB_Z[o.z] ? o.z : 'l';
  return `<button class="hb blank${o.sel ? ' sel' : ''}${o.lock ? ' lock' : ''}" data-z="${z}" data-t="1" data-s="0" data-a="${o.act || 'noop'}" data-v="${hrEsc(o.val || '')}"${o.sel ? ' aria-pressed="true"' : ''} aria-label="${hrEsc(o.say || 'Неизвестная душа')}" title="${hrEsc(o.say || 'Неизвестная душа')}">
    <span class="hb-bk" style="${hbGeoVars({ win: HB_ART.css.win, core: HB_ART.css.core })}"><span class="hb-ph"><i class="hb-q" aria-hidden="true">${o.lock ? ic('lock') : '?'}</i></span><i class="hb-cvc" aria-hidden="true"></i></span></button>`;
}

/* ================== корешок книги ==================
   Книга на полке боком — «Библиотека Этриона» (screens/library.js): нижняя полка отрядов (свободные герои), отсеки шкафа отрядов, грань
   книги в полёте анимации (книга выдвигается с полки корешком). Материал — ступень книги, как обложка (HB_ART.spine); редкость —
   кристалл и ярлык её цвета; класс — значок; уровень — табличка внизу (у героя аккаунта); имя — вдоль ярлыка, снизу вверх. Толщина
   книги — ширина корешка к высоте (HB_ART.spines, ‰). Пока корешка нет в HB_ART.ready, материал рисует CSS (.hs-c) */
const hbSpineR = t => (hbArt(HB_ART.spine(t)) && HB_ART.spines[t] ? HB_ART.spines[t].ratio : HB_ART.css.spine);
const hbShort = n => String(n == null ? '' : n).trim().split(/\s+/)[0];
/* лицо корешка: материал, кристалл, ярлык с именем; у полного (z = l) — ещё класс и уровень */
function hbSpineFace(v, z, own) {
  const p = HB_ART.spine(hbTier(v)), full = z !== 's';
  return `${hbArt(p) ? `<img class="hs-a" src="${AV(p)}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : '<i class="hs-c" aria-hidden="true"></i>'}<i class="hs-cr" aria-hidden="true"></i>`
    + `<span class="hs-l" aria-hidden="true">${full ? `<b>${hrEsc(hbShort(v.n))}</b>` : ''}</span>`
    + (full ? `<span class="hs-k" aria-hidden="true">${CLS(v.ic, 16, '')}</span>${own ? `<b class="hs-v num" aria-hidden="true">${v.lvl}</b>` : ''}` : '');
}
/* корешок-кнопка или знак. o: z — l (полка: всё), s (отсек шкафа: материал, кристалл и ярлык); tag — span (внутри другой кнопки
   и в полёте), иначе кнопка; act, val — нажатие; hold — долгое нажатие «действие:значение» (книга раскрывается); dim, note — занят;
   sel — выбран; say — что сделает нажатие, для подписи; stage — стадия вместо рассчитанной (UI-кит) */
function hbSpine(v, o = {}) {
  if (!v) return '';
  const z = o.z === 's' ? 's' : 'l', t = hbTier(v), st = o.stage != null ? o.stage : hbStage(v), own = st === 3;
  const note = o.note != null ? o.note : own ? v.busy || '' : '', dim = o.dim != null ? !!o.dim : !!note;
  const say = `${v.n}, ${String(RAR[v.r] || '').toLowerCase()}, ${v.cls}${own ? `, уровень ${v.lvl}` : ''}${note ? ', ' + note : ''}${o.say ? '. ' + o.say : ''}`;
  const cls = ['hs', dim ? 'dim' : '', o.sel ? 'sel' : '', o.tag !== 'span' && hbAway(v.id) ? 'away' : ''].filter(Boolean).join(' ');
  const attrs = `class="${cls}" data-z="${z}" data-t="${t}" data-r="${v.r}" data-s="${st}" data-id="${hrEsc(v.id)}" style="--sr:${hbSpineR(t)}"`;
  const face = hbSpineFace(v, z, own);
  if (o.tag === 'span') return z === 's' ? `<span ${attrs} aria-hidden="true">${face}</span>` : `<span ${attrs} role="img" aria-label="${hrEsc(say)}" title="${hrEsc(say)}">${face}</span>`;
  return `<button ${attrs} data-a="${o.act || 'noop'}" data-v="${hrEsc(o.val != null ? o.val : v.id)}"${o.hold ? ` data-hold="${hrEsc(o.hold)}"` : ''} aria-label="${hrEsc(say)}" title="${hrEsc(say)}">${face}</button>`;
}

/* ================== раскрытая книга ==================
   Слово автора: «нажимая на героя, мы и открываем информацию о герое как будто в виде книги». Разворот своей ступени; слева — портрет
   во всю страницу, справа — сведения; замки — на переплёте, ленты — снизу, кристалл — у корешка. o: close — куда закрывается
   (hbclose: grid — к сетке коллекции, gold — к сетке «За золото», ov — закрыть окно, ov:имя — вернуться в окно); head, body, foot */
/* левая страница — кто герой: портрет во всю страницу (лупа — крупно), круг уровня, медальон стихии, щит класса, мощь; табличка —
   имя и под ним редкость, класс и раса (прежде это повторяла шапка правой страницы — теперь правая страница целиком под сведения).
   o.step — «‹ ›» по краям портрета: соседний герой той же сетки */
function hbLeft(v, st, o = {}) {
  const soul = st === 1, own = st === 3;
  const por = soul ? `<span class="hb-por soul" role="img" aria-label="Неизвестная душа: портрет откроется, когда осколки соберутся">${hcFace(v)}</span>`
    : `<button class="hb-por" data-a="hczoom" data-v="${v.id}" aria-label="${hrEsc(v.n)}: портрет крупно">${hcFace(v)}<i class="hb-zi" aria-hidden="true">${ic('search')}</i></button>`;
  const step = o.step ? `<button class="hb-stp l" data-a="hcstep" data-v="-1" aria-label="Предыдущий герой" title="Предыдущий герой">${ic('chev', 'flip')}</button><button class="hb-stp r" data-a="hcstep" data-v="1" aria-label="Следующий герой" title="Следующий герой">${ic('chev')}</button>` : '';
  return `${por}${own ? `<span class="hb-lv" title="Уровень ${v.lvl} из ${v.cap}"><b class="num">${v.lvl}</b></span>` : ''}
    <span class="hb-el" title="Стихия: ${hrEsc(v.el)}">${el(v.el, true)}</span>
    <span class="hb-cls" title="${hrEsc(v.cls)}">${CLS(v.ic, 22, v.cls)}</span>
    <span class="hb-bm" title="Боевая мощь${own ? '' : ' по базовым статам'}">${ICON('power', 20, 'Боевая мощь')}<b class="num">${fmt(v.bm)}</b></span>
    <span class="hb-plate"><b class="hb-pn">${hrEsc(v.n)}</b><small class="hb-pm">${rar(v.r)}<span>${hrEsc(v.cls)}</span><span>${hrEsc(v.race)}</span></small></span>${step}`;
}
/* сама книга: окно с разворотом; анимация — если идёт у этого героя. Правая страница — тема .pg (screens/book-pages.js): сведения
   чернилами по пергаменту, закладки вкладок по верхнему краю; o.body — страница, o.foot — одно действие внизу, o.step — «‹ ›» */
function hbWin(v, o = {}) {
  const st = hbStage(v), t = hbTier(v), G = hbSpreadGeo(t), own = st === 3, W = HB_VIEW.win, close = `data-a="hbclose" data-v="${o.close || 'grid'}"`;
  const A = hbAnimFor(v.id), e = A ? Math.max(0, hbNow() - A.t0) : 0, kind = A ? A.kind : '';
  const nx = own ? hrRpNext(v) : '', say = `${v.n} — книга героя`;
  const vars = `--hb-mw:${W.max}px;--hb-px:${W.padX}px;--hb-py:${W.padY}px;--hb-lkw:${W.lock}px;--hb-rbh:${W.rib}px;--hb-g:${HB_VIEW.glow[(v.r || 1) - 1] || 0}`;
  return `<div class="hb-win${kind ? ' ' + kind : ''}" data-r="${v.r}" data-t="${t}" data-s="${st}" style="${vars}${A ? ';' + hbAnimVars(A, e) : ''}">
    <button class="hb-scrim" ${close} aria-label="Закрыть книгу" tabindex="-1"></button>
    <div class="hb-stage"><div class="hb-book" role="dialog" aria-modal="true" aria-label="${hrEsc(say)}" style="${hbSpreadVars(G)}">
      <i class="hb-aura" aria-hidden="true"></i>
      ${G.art ? `<img class="hb-spa" src="${AV(G.art)}" alt="" aria-hidden="true" decoding="async">` : '<i class="hb-spc" aria-hidden="true"></i>'}
      <section class="hb-pg l" aria-label="Портрет">${hbLeft(v, st, { step: o.step })}</section>
      <section class="hb-pg r" aria-label="Сведения о герое"><div class="hb-rp pg">${o.body || ''}${o.foot ? `<div class="hb-f">${o.foot}</div>` : ''}</div></section>
      <i class="hb-cr" aria-hidden="true"></i>
      ${own ? `<span class="hb-lks" role="img" aria-label="Рунный предел ${v.lim} из ${hbTop()}" title="Рунный предел ${v.lim} из ${hbTop()}">${hbLocks(v.lim, nx)}</span>` : ''}
      ${hbRibs(own ? v.valor : 0, v.maxV)}
      <button class="iconbtn x hb-x" ${close} aria-label="Закрыть книгу" title="Закрыть">${ic('x')}</button>
      ${A ? hbFx(v, A, e) : ''}
    </div></div>
    ${A ? `<button class="hb-skip" data-a="hbskip" aria-label="Показать сразу" tabindex="-1"></button>` : ''}
  </div>`;
}
/* книга героя аккаунта: вкладки «Развитие», «Мощь», «Снаряжение», «Навыки», «Путь» — heroDetail без шапки (index.html); ‹ › — по сетке */
function hbOwnWin() {
  const mine = hrMine(); let h = H(S.selHero);
  if (!h || !mine.includes(h)) { h = mine[0]; if (!h) return ''; S.selHero = h.id; }
  const list = hcOwnList(), many = list.length > 1 || (list.length === 1 && list[0].id !== h.id), v = hcView(h);
  return hbWin(v, { close: 'grid', step: many, body: heroDetail(h, { head: false, cls: 'hb-hd' }) });
}
/* книга героя состава: неизвестная душа — только осколки и где их брать; известный — «до покупки» и одно действие; купленный — его
   прогресс и «К развитию». close — куда закрывается; foot — своё действие («За золото») */
function hbRsBook(rh, o = {}) {
  const v = hcView(rh); if (!v || !v.st) return '';
  if (v.st === 1) return hbWin(v, { close: o.close, body: hcSoulBody(rh), foot: hcSoulFoot(rh) });
  return hbWin(v, { close: o.close, body: hcPreBody(rh), foot: o.foot || hcGetFoot(rh) });
}
/* книга героя отряда — долгое нажатие на корешок нижней полки или книгу полки отряда (screens/heroes.js, ACT.sqbook): те же вкладки,
   что у книги коллекции, без «‹ ›»; закрытие — к отрядам */
function hbSqWin() {
  const h = H(S.sq.book); if (!h) { S.sq.book = ''; return ''; }
  return hbWin(hcView(h), { close: 'sq', body: heroDetail(h, { head: false, cls: 'hb-hd' }) });
}
/* слой поверх экрана: книга коллекции и «За золото» лежит поверх сетки, из которой её открыли, книга отряда — поверх отрядов */
function hbLayer() {
  if (typeof S === 'undefined' || !S || S.route !== 'heroes' || !RS.heroes) return '';
  if (S.seg.heroes === 'squads' && S.sq && S.sq.book) return hbSqWin();
  if (S.seg.heroes === 'coll' && S.hview === 'mine') return hbOwnWin();
  if (S.seg.heroes === 'coll' && S.hview === 'rs') { const rh = RSI[S.rs.sel]; return rh ? hbRsBook(rh, { close: 'grid' }) : ''; }
  if (S.seg.heroes === 'hire' && (S.seg.hire || 'gold') === 'gold' && S.rs.gsel) {
    const rh = RSI[S.rs.gsel]; return rh && rh.src === 'gold' && rh.c <= rsCyc() ? hbRsBook(rh, { close: 'gold', foot: hcGoldFoot(rh) }) : '';
  }
  return '';
}
/* какая книга открыта сейчас: id героя или '' */
function hbShown() {
  if (S.overlay && S.overlay.t === 'rhero') return S.overlay.arg || '';
  if (!S || S.route !== 'heroes') return '';
  if (S.seg.heroes === 'squads') return (S.sq && S.sq.book) || '';
  if (S.seg.heroes === 'coll' && S.hview === 'mine') return S.selHero || '';
  if (S.seg.heroes === 'coll' && S.hview === 'rs') return S.rs.sel || '';
  if (S.seg.heroes === 'hire' && (S.seg.hire || 'gold') === 'gold' && S.rs.gsel) return S.rs.gsel;
  return '';
}
const hbOverlay0 = overlay;
overlay = function () { return hbLayer() + hbOverlay0(); };

/* ================== анимация ==================
   S.hb.anim — один показ: id героя, kind — in (открытие), out (закрытие), turn (‹ ›), fade («меньше движения»); t0 — начало, мс;
   g — геометрия полёта в px книги: закрытая книга (cbx, cby, cbw, cbh), откуда летит карточка (fx, fy — сдвиг, fs — масштаб ‰),
   толщина книги th (корешок её ступени, px) и sp — полёт начинается (у закрытия — кончается) корешком: книга с нижней полки отрядов;
   dir — куда листать; then — что сделать в конце закрытия. Разметка рисуется из момента e = сейчас − t0 (задержки = момент − e).
   Открытие продолжает картину шкафа («Библиотека Этриона», screens/library.js): книга выдвигается с полки к игроку и встаёт корешком
   (pull), летит в центр и разворачивается обложкой (fly), обложка открывается, листы перелистываются, страницы проступают */
function hbTimes(kind) {
  const O = HB_VIEW.open, C = HB_VIEW.close;
  if (kind === 'in') {
    const fly0 = O.pull, cover0 = O.pull + O.fly, cover1 = cover0 + O.cover, leaf = Array.from({ length: O.leaves }, (_, i) => cover0 + Math.floor(O.cover * O.leafAt / 100) + i * O.leafStep);
    const leafEnd = leaf.length ? leaf[leaf.length - 1] + O.leaf : cover1, show = leafEnd - Math.floor(O.show / 2);
    return { kind, pull: O.pull, fly0, fly: O.fly, cover0, cover1, leaf, leafEnd, show, end: Math.max(cover1, show + O.show) };
  }
  if (kind === 'out') { const cover0 = Math.floor(C.hide * 2 / 3), cover1 = cover0 + C.cover; return { kind, hide: C.hide, cover0, cover1, fly0: cover1, end: cover1 + C.fly }; }
  if (kind === 'turn') return { kind, end: HB_VIEW.turn };
  return { kind: 'fade', end: HB_VIEW.fade };
}
/* место карточки на экране игры, px игры (без масштаба рамки); нет — null */
function hbRect(t) {
  try {
    const b = t && t.querySelector ? t.querySelector('.hb-bk') || t : null, g = $game();
    if (!b || !b.getBoundingClientRect || !g || !g.getBoundingClientRect || !g.offsetWidth) return null;
    const r = b.getBoundingClientRect(), q = g.getBoundingClientRect(), k = q.width / g.offsetWidth;
    if (!(r.width > 0) || !(k > 0)) return null;
    return { x: Math.round((r.left - q.left) / k), y: Math.round((r.top - q.top) / k), w: Math.round(r.width / k), h: Math.round(r.height / k) };
  } catch (_) { return null; }
}
/* геометрия полёта: окно и книга — по тем же правилам, что CSS (HB_VIEW.win); закрытая книга стоит корешком на корешке разворота.
   Толщина книги — корешок её ступени (HB_ART.spines). sp — полёт от корешка на полке: книга стоит к игроку корешком, масштаб — по
   высоте корешка, корешок — на своём месте */
function hbFlight(F, id, sp) {
  const W = HB_VIEW.win, g = typeof $game === 'function' ? $game() : null, gw = (g && g.offsetWidth) || W.gw, gh = (g && g.offsetHeight) || W.gh;
  const sw = Math.min(W.max, gw - W.padX), sh = gh - W.padY, bw = sw - W.lock, bh = sh - W.rib, bx = Math.floor((gw - sw) / 2), by = Math.floor((gh - sh) / 2);
  const x = H(id) || RSI[id], v = x ? hcView(x) : null, t = v ? hbTier(v) : 1, G = hbSpreadGeo(t);
  const cbh = Math.floor(bh * W.cb / 100), cbw = Math.floor(cbh * 9 / 16), cbx = Math.floor(bw * G.g / 1000), cby = Math.floor((bh - cbh) / 2);
  const o = { cbx, cby, cbw, cbh, th: Math.floor(cbh * hbSpineR(t) / 1000), sp: 0 };
  if (F && F.w > 0 && sp) { const fs = Math.floor(F.h * 1000 / cbh); Object.assign(o, { fx: F.x - bx - cbx - Math.floor((cbw - o.th) * fs / 2000), fy: F.y - by - cby, fs, card: 1, sp: 1 }); }
  else if (F && F.w > 0) Object.assign(o, { fx: F.x - bx - cbx, fy: F.y - by - cby, fs: Math.floor(F.w * 1000 / cbw), card: 1 });
  else Object.assign(o, { fx: 0, fy: Math.floor(cbh / 10), fs: 640, card: 0 });   // места карточки нет — книга проступает на месте
  return o;
}
/* нажали корешок на полке (нижняя полка отрядов), а не книгу */
const hbIsSpine = t => !!(t && t.classList && t.classList.contains && t.classList.contains('hs'));
let hbTm = 0;
function hbStop() { if (hbTm) { clearTimeout(hbTm); hbTm = 0; } }
function hbPlay(A) {
  hbStop();
  S.hb.anim = A;
  hbTm = setTimeout(() => { hbTm = 0; if (S.hb.anim !== A) return; S.hb.anim = null; if (A.then) hbThen(A.then); render(); if (A.kind !== 'out') hbFocus(); }, A.T.end);
}
/* открытие: нажатая книга летит в центр и раскрывается; «меньше движения» — плавная смена. Состояние экрана меняет действие само */
function hbOpenFx(t, id) {
  if (!S.hb || !id) return;
  const rm = hbReduced(), kind = rm ? 'fade' : 'in', A = { id, kind, t0: hbNow(), T: hbTimes(kind) };
  if (!rm) A.g = hbFlight(hbRect(t), id, hbIsSpine(t));
  hbPlay(A);
  hbFocus();
}
/* ‹ ›: лист перелистывается вперёд или назад */
function hbTurnFx(id, dir) {
  if (!S.hb || !id) return;
  const rm = hbReduced(), kind = rm ? 'fade' : 'turn';
  hbPlay({ id, kind, t0: hbNow(), T: hbTimes(kind), dir: dir < 0 ? -1 : 1 });
}
/* закрытие: что сделать — к сетке коллекции, к сетке «За золото», закрыть окно или вернуться в окно, из которого открыли */
function hbThen(to) {
  const k = String(to || 'grid');
  if (k === 'gold') { S.rs.gsel = ''; return; }
  if (k === 'ov') { S.overlay = null; return; }
  if (k === 'sq') { if (S.sq) S.sq.book = ''; return; }
  if (k.startsWith('ov:')) { const b = k.slice(3); S.overlay = b ? { t: b } : null; if (b === 'hrecho' || b === 'dust') S.du.ask = null; return; }
  S.hview = S.hgrid === 'all' ? 'all' : 'own';
}
/* место книги этого героя под книгой — туда она летит при закрытии: книга сетки, книга на полке отряда или корешок на нижней полке */
function hbHome(id) {
  try {
    const m = document.getElementById('gmain'); if (!m || !m.querySelector) return null;
    return m.querySelector(`.hb[data-v="${id}"]`) || m.querySelector(`.lb-slot[data-hold="sqbook:${id}"]`) || m.querySelector(`.hs[data-id="${id}"]`);
  } catch (_) { return null; }
}
/* книга на экране — есть ли у неё живой DOM: в песочнице проверок его нет, закрытие — сразу */
function hbLive() { try { return !!(document.querySelector && document.querySelector('.hb-win .hb-book')); } catch (_) { return false; } }
function hbFocus() { try { requestAnimationFrame(() => { const x = document.querySelector('.g .hb-win .hb-x'); if (x) x.focus({ preventScroll: true }); }); } catch (_) { } }
/* показ этого героя: анимация идёт у той книги, что открыта; закончилась — не рисуется */
function hbAnimFor(id) {
  const A = S.hb && S.hb.anim;
  if (!A || A.id !== id) return null;
  if (hbNow() - A.t0 >= A.T.end) return null;
  return A;
}
/* переменные времени: задержка шага = его момент − e; длительности — из HB_VIEW */
function hbAnimVars(A, e) {
  const T = A.T, d = ms => `${ms - e}ms`, O = HB_VIEW.open, C = HB_VIEW.close;
  if (A.kind === 'in') return `--d-pull:${d(0)};--t-pull:${T.pull}ms;--d-fly:${d(T.fly0)};--t-fly:${T.fly}ms;--t-go:${T.fly0 + T.fly}ms;--d-cv:${d(T.cover0)};--t-cv:${O.cover}ms;--t-leaf:${O.leaf}ms;--d-show:${d(T.show)};--t-show:${O.show}ms;--d-end:${d(T.end)}`;
  if (A.kind === 'out') return `--d-hide:${d(0)};--t-hide:${C.hide}ms;--d-cv:${d(T.cover0)};--t-cv:${C.cover}ms;--d-fly:${d(T.fly0)};--t-fly:${C.fly}ms;--d-end:${d(T.end)}`;
  if (A.kind === 'turn') return `--d-turn:${d(0)};--t-turn:${HB_VIEW.turn}ms`;
  return `--d-fade:${d(0)};--t-fade:${HB_VIEW.fade}ms`;
}
/* частицы и детали анимации: закрытая книга в полёте — объём: обложка, обрез страниц и корешок своей ступени. Книга выдвигается с полки
   к игроку и встаёт корешком (у корешка с нижней полки — только выдвигается), в полёте разворачивается обложкой, обложка открывается
   (форзац на изнанке); листы, свет из страниц, пыль, искры. Места и задержки — от номера, без случайности; движутся transform и opacity */
function hbFx(v, A, e) {
  const T = A.T, d = ms => `${ms - e}ms`, F = HB_VIEW.fx, O = HB_VIEW.open;
  if (A.kind === 'fade') return '';
  if (A.kind === 'turn') return `<i class="hb-leaf turn${A.dir < 0 ? ' back' : ''}" aria-hidden="true"></i>`;
  const g = A.g || hbFlight(null, v.id), turn = g.sp ? 90 : 0;
  const fly = `<div class="hb-fly" style="left:${g.cbx}px;top:${g.cby}px;width:${g.cbw}px;height:${g.cbh}px;--fx:${g.fx}px;--fy:${g.fy}px;--fs:${g.fs};--th:${g.th}px;--r0:${turn}deg;--r1:${turn}deg;--lift:${-O.lift}px;--near:${O.near}px"><div class="hb-r1"><div class="hb-r2">
      <i class="hb-edge" aria-hidden="true"></i><div class="hb-cv3"><span class="hb-cvf">${hbCover(v, { z: 'l' })}</span><span class="hb-cvb" aria-hidden="true"></span></div>
      <span class="hb-spn">${hbSpine(v, { tag: 'span', dim: false })}</span></div></div></div>`;
  if (A.kind === 'out') return `<div class="hb-anim" aria-hidden="true">${fly}</div>`;
  const leaves = T.leaf.map((t, i) => `<i class="hb-leaf" style="--d-leaf:${d(t)};--i:${i}"></i>`).join('');
  const dust = Array.from({ length: F.dust }, (_, i) => `<i style="--x:${(i * 29 + 7) % 100}%;--y:${60 + (i * 17) % 35}%;--dx:${((i * 41) % 60) - 30}px;--dy:${-40 - (i * 23) % 70}px;--d:${d(T.cover0 + (i * 97) % 600)};--s:${900 + (i * 131) % 700}ms"></i>`).join('');
  const sparks = Array.from({ length: F.sparks }, (_, i) => { const a = (i * 360 / F.sparks + 17 * i) % 360, r = F.spread - (i * 13) % 40, x = Math.round(r * Math.cos(a * Math.PI / 180)), y = Math.round(r * Math.sin(a * Math.PI / 180)) - 30;
    return `<i style="--dx:${x}px;--dy:${y}px;--d:${d(T.cover0 + 80 + (i * 37) % 160)}"></i>`; }).join('');
  return `<div class="hb-anim" aria-hidden="true">${fly}${leaves}<i class="hb-burst" style="--d-burst:${d(T.cover0)}"></i><i class="hb-shine" style="--d-shine:${d(T.cover0 + 120)}"></i>
    <span class="hb-dust">${dust}</span><span class="hb-spk">${sparks}</span></div>`;
}

/* ================== действия ================== */
Object.assign(ACT, {
  /* закрыть книгу: книга закрывается и летит обратно в сетку, затем — куда вела кнопка (hbThen). Без живой книги на экране (песочница
     проверок) и при «меньше движения» — сразу */
  hbclose(v) {
    const to = v || 'grid', id = hbShown();
    if (!id || hbReduced() || !hbLive()) { S.hb.anim = null; hbStop(); hbThen(to); render(); return; }
    if (S.hb.anim && S.hb.anim.kind === 'out') return;
    const A = { id, kind: 'out', t0: hbNow(), T: hbTimes('out'), then: to }, home = to === 'grid' || to === 'gold' || to === 'sq' ? hbHome(id) : null;
    A.g = hbFlight(home ? hbRect(home) : null, id, hbIsSpine(home));
    hbPlay(A); render();
  },
  /* нажатие посреди анимации — сразу итог: открытие — книга раскрыта, закрытие — книга закрыта */
  hbskip() {
    const A = S.hb && S.hb.anim; hbStop(); S.hb.anim = null;
    if (A && A.then) hbThen(A.then);
    render(); if (A && A.kind !== 'out') hbFocus();
  },
});
/* книга героя из «Пятёрки сильнейших» и других экранов (index.html: hero-open) — тоже летит из своей плитки */
{
  const ho0 = ACT['hero-open'];
  if (ho0) ACT['hero-open'] = (v, t, e) => { if (H(v)) hbOpenFx(t, H(v).id); return ho0(v, t, e); };
}
/* клавиши: Esc — закрыть книгу (когда поверх неё нет листа), ← → — соседний герой в книге своего героя */
document.addEventListener('keydown', e => {
  if (!S || S.overlay || !hbShown()) return;
  if (e.key === 'Escape') { e.preventDefault(); ACT.hbclose(S.seg.heroes === 'hire' ? 'gold' : S.seg.heroes === 'squads' ? 'sq' : 'grid'); }
  else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && S.route === 'heroes' && S.seg.heroes === 'coll' && S.hview === 'mine') {
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    e.preventDefault(); ACT.hcstep(e.key === 'ArrowLeft' ? '-1' : '1');
  }
});
/* ушли с книги не закрытием — показ забыт */
window.addEventListener('en-render', () => { if (S && S.hb && S.hb.anim && !hbShown()) { hbStop(); S.hb.anim = null; } });

/* ================== состояние ================== */
function hbState(s) { s.hb = { anim: null }; return s; }
const hbInitBase = initialState;
initialState = function () { return hbState(hbInitBase()); };
hbState(S);

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Книга героя · открытие', 'Нажатие на книгу на полке: книга выдвигается к игроку корешком, летит в центр и разворачивается обложкой, обложка открывается, листы перелистываются, свет редкости из страниц — и книга раскрыта',
    () => { S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.hgrid = 'own'; S.selHero = 'h2'; S.seg.hero = 'power'; S.overlay = null; hbOpenFx(null, 'h2'); }],
  ['Книга · неизвестная душа', 'Найден осколок героя: книга своей ступени с силуэтом класса и полосой осколков; раскрытая — без сведений, только осколки и где их брать',
    () => {
      S.route = 'heroes'; S.seg.heroes = 'coll'; S.overlay = null;
      const h = RS.heroes.find(x => x.src === 'roulette' && x.c <= rsCyc() && !rsHas(x)); if (!h) return;
      S.rs.shards[h.id] = Math.max(1, Math.min(S.rs.shards[h.id] || 0, hrNeed() - 1)); S.hgrid = 'all'; S.hview = 'rs'; S.rs.sel = h.id; S.seg.rhero = 'who';
    }],
);

/* ================== UI-кит: раздел «Карточка-книга» ==================
   Пять ступеней на одном герое, семь редкостей, замки пределов в четырёх состояниях, ленты доблести, стадии знакомства, размеры,
   раскрытая книга своего героя, «до покупки» и неизвестной души, раскадровка анимации; команде — что откуда */
KIT_EXTRA.push({ html: hbKitHtml });
function hbKitHtml() {
  if (!RS.heroes.length || !RS.rules) return '';
  const noop = h => h.replace(/data-a="[^"]*"/g, 'data-a="noop"'), cap = INV.hero.capByLim, need = hrNeed();
  const rh = RS.heroes.find(h => h.src === 'roulette' && typeof RS_ART !== 'undefined' && RS_ART.has(h.id)) || RS.heroes[0], base = hcView(rh);
  const mk = o => Object.assign({}, base, { own: true, st: 3, acc: null, busy: '', lvl: cap[o.lim || 0], cap: cap[o.lim || 0], lim: 0, valor: 0, maxV: 1, r: base.r, bm: 0 }, o);
  const fig = (card, say, w) => `<figure class="hbk-f"${w ? ` style="width:${w}px"` : ''}>${card}<figcaption>${say}</figcaption></figure>`;
  const K = HB_KIT;
  const tiers = K.tiers.map(([maxV, valor, lim, r, bm]) => fig(hbCard(mk({ maxV, valor, lim, r, lvl: cap[lim], cap: cap[lim], bm }), { z: 'l', act: 'noop' }), `<b>Ступень ${maxV}</b>${HB_KIT.names[maxV - 1]} · доблесть ${valor} из ${maxV}`, 128)).join('');
  const rars = RAR.slice(1).map((n, i) => fig(hbCard(mk({ r: i + 1, maxV: 3, valor: 2, lim: 3, lvl: cap[3], cap: cap[3], bm: K.bm }), { z: 'm', act: 'noop' }), n, 92)).join('');
  const locks = [['off', 'не пройден'], ['wait', 'на потолке уровня — рун не хватает'], ['ready', 'можно пробить'], ['on', 'пройден — отперт']]
    .map(([s, t]) => `<figure class="hbk-l"><span class="hb-lk solo"><i class="hb-l ${s}"></i></span><figcaption>${t}</figcaption></figure>`).join('');
  const ribs = [[0, 3], [1, 3], [3, 3], [2, 5], [5, 5]].map(([v, m]) => fig(`<span class="hbk-rb" data-r="4">${hbRibs(v, m)}</span>`, `${v} из ${m}`, 92)).join('');
  const soulH = RS.heroes.find(h => RS_SHARD.includes(h.src) && typeof RS_ART !== 'undefined' && RS_ART.has(h.id)) || rh, gold = RS.heroes.find(h => h.src === 'gold' && h.c === rsCyc()) || RS.heroes.find(h => h.src === 'gold');
  const sv = Object.assign(hcView(soulH), { st: 1 }), kv = Object.assign(hcView(gold), { st: 2 }), fv = Object.assign(hcView(soulH), { st: 2 }), mine = hcOwnList()[0];
  const stages = [fig(hbBlank({ z: 'l', say: 'Не найден' }), '<b>Не найден</b>только в веере рулетки и отряде недели — безымянной книгой; в каталоге не виден', 128),
    fig(hbCard(sv, { z: 'l', act: 'noop', shard: [Math.floor(need * 2 / 5), need] }), '<b>Неизвестная душа</b>есть осколок: силуэт класса, имя, класс, редкость, мощь по базовым статам', 128),
    fig(hbCard(fv, { z: 'l', act: 'noop', shard: [need, need] }), '<b>Известен</b>комплект осколков — в цвете, «Пробудить»', 128),
    fig(hbCard(kv, { z: 'l', act: 'noop', gray: true }), '<b>Известен</b>герой за золото — чёрно-белый до найма', 128),
    mine ? fig(hbCard(mine, { z: 'l', act: 'noop' }), '<b>В коллекции</b>уровень, замки, ленты, мощь', 128) : ''].join('');
  const sizes = mine ? [['l', 128, 'l — сетки'], ['m', 96, 'm — витрины'], ['s', 70, 's — отряды и списки']].map(([z, w, t]) => fig(hbCard(mine, { z, act: 'noop' }), t, w)).join('') : '';
  const h2 = H('h2') || S.heroes[0], v2 = h2 && hcView(h2);
  const own = v2 ? noop(hbWin(v2, { close: 'grid', step: true, body: heroDetail(h2, { head: false, cls: 'hb-hd' }) })) : '';
  const pre = gold ? noop(hbRsBook(gold, { close: 'gold', foot: hcGoldFoot(gold) })) : '';
  const soulBook = noop(hbWin(sv, { close: 'ov', body: hcSoulBody(soulH), foot: hcSoulFoot(soulH) }));
  const O = HB_VIEW.open, T = hbTimes('in');
  const beats = [['0', 'нажатие: книга выдвигается с полки к игроку и встаёт корешком'], [`${T.fly0}`, 'летит в центр и разворачивается обложкой'], [`${T.cover0}`, 'долетела: обложка открывается, свет из страниц, пыль и искры'], [`${T.leaf[0]}`, 'листы перелистываются'], [`${T.show}`, 'страницы проступают'], [`${T.end}`, 'книга раскрыта']];
  return `<section class="k-box hbk" style="grid-column:1/-1" id="kitBook"><h3>Карточка-книга</h3>
    <p class="k-note">Карточка героя — книга. Вид книги — личный максимум доблести: от простой кожаной книги до гримуара с шипами и светом из обреза страниц. Редкость — кристалл на обложке и свет книги (у обычной света почти нет). Рунные пределы — пять навесных замков по правому краю: пройденный отперт и светит бирюзой. Взятая доблесть — короткие ленты-закладки из нижнего края, цвета редкости со звёздочкой; невзятая — блёклая. Уровень — круг слева сверху, стихия — справа сверху, класс — щит слева снизу, мощь — справа снизу, имя — на плашке.</p>
    <div class="hbk-row">${tiers}</div>
    <p class="k-note">Семь редкостей: кристалл и свет книги.</p>
    <div class="hbk-row">${rars}</div>
    <div class="hbk-row"><div class="hbk-col"><p class="k-note">Замок рунного предела — четыре состояния; тлеет и пульсирует только у своего героя.</p><div class="hbk-row">${locks}</div></div>
      <div class="hbk-col"><p class="k-note">Ленты доблести: сколько лент — таков максимум.</p><div class="hbk-row">${ribs}</div></div></div>
    <p class="k-note">Стадии знакомства с героем: не найденного не видно — только счётчик «в коллекции N из M», «найдено N из M»; неизвестная душа — книга с силуэтом класса, сведения закрыты; известный — книга «до покупки»; в коллекции — полная книга.</p>
    <div class="hbk-row">${stages}</div>
    <p class="k-note">Размер — от крупной в сетке до мелкой в отрядах и списках: у мелкой только главное — редкость, доблесть, пределы, уровень.</p>
    <div class="hbk-row">${sizes}</div>
    <p class="k-note">Нажатие — книга выдвигается с полки к игроку корешком, летит в центр и разворачивается обложкой, обложка открывается, листы перелистываются, из страниц — свет цвета редкости, пыль и искры; книга раскрывается в окно героя. Слева — портрет во всю страницу (лупа — крупно) и табличка с именем; справа — пергамент, по верхнему краю кожаные закладки «Развитие», «Мощь», «Снаряжение», «Навыки», «Путь»; замки — на переплёте, ленты — снизу. Закрытие — книга закрывается и возвращается в сетку. Нажатие посреди — сразу итог; «меньше движения» — без полёта и листов, плавная смена.</p>
    <ol class="hbk-beats">${beats.map(([t, s]) => `<li><b class="num">${t} мс</b>${s}</li>`).join('')}</ol>
    <div class="hbk-win">${own}</div>
    <div class="hbk-win">${pre}</div>
    <div class="hbk-win">${soulBook}</div>
    ${TM(`<p class="k-note">Книга — выбор автора 30.09.2026 (ADR-0032), стадии знакомства — его решение того же дня. Арт — tools/art-gen/jobs/hero-books.json (обложки пяти ступеней с прозрачным окном, развороты, замок закрытый и отпертый, лента и звёздочка — нейтральные, цвет редкости даёт CSS по контуру clip-path; изнанка обложки и лист), геометрия — tools/art-gen/book_layers.py → HB_ART (окно, тело книги, страницы, корешок, скважина, контуры). Выгружено ${HB_ART.ready.length} путей (HB_ART.ready); без пути книгу рисует CSS. Ступень — hbTier (максимум доблести), свет — HB_VIEW.glow, время — HB_VIEW.open / close / turn: открытие ${T.end} мс (с полки ${O.pull}, полёт ${O.fly}, обложка ${O.cover}, листов ${O.leaves} по ${O.leaf}).</p>`)}
  </section>`;
}
/* UI-кит: пять ступеней на одном герое — [максимум доблести, взятая доблесть, пределы, редкость, мощь]; имена ступеней; мощь у редкостей */
const HB_KIT = {
  tiers: [[1, 0, 1, 1, 1240], [2, 1, 2, 2, 8420], [3, 2, 3, 3, 48350], [4, 3, 4, 4, 210600], [5, 5, 5, 7, 912780]],
  names: ['простая кожаная', 'окованная', 'резной оклад', 'кодекс с костью', 'гримуар'],
  bm: 64210,
};
