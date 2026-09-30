/* screens/recipe-book.js — книга рецептов Мастерской на всё окно (GDD §12.4). Слово автора 30.09.2026:
   «цельный рецепт который нашёл игрок, это по сути ровный кусок древнего листа… рецепты которые игрок нашёл но не полностью показываются
   в виде древней бумаги но уже по кусочкам в виде квадратов не ровных и там уже показан ресурс что игрок нашёл… мы как бы собираем по
   крупицам информацию и добавляем к себе в книгу рецептов»; после пробы: «ресурс который получается, должен всегда показываться справа
   с его названием, если конечно игрок его нашёл, если же нет очевидно справа скомканная бумага… давай без мятых»; «саму книгу с обрывками
   мы открываем на всё окно… а не справой стороны, ибо рецепты слишком важны для всей игры в целом».
   Книга:
   — раскрытый гримуар чернёного пергамента на всё окно, поверх шапки и шахты, как книга героя: слой рисуется перед листами overlay, и
     карточка ресурса, автодокрафт и итог открываются над книгой. Раскрывает кнопка «Книга рецептов» над столом Мастерской (ACT.wsview),
     закрывают крестик и Esc; стол под книгой остаётся как был;
   — по верху страниц: слева вкладки «Все», «Создать сейчас», «Обрывки», справа поиск, вид рецепта и «только избранное». Они видны всегда,
     прокручивается только список (§12.4); записи идут по двум страницам разворота, порциями по CR_VIEW.page;
   — найден целиком — полоса древнего листа. Длина — по числу ингредиентов: короткая (1–2), средняя (3–4), длинная (5–6); у каждой своя
     картинка в своих пропорциях, высота у всех одна: неравномерно не тянется ничто. Слева — ингредиенты в рамках предмета с количеством на
     тёмной плашке, справа — итог с названием, между ними стрелка «Создать» — автодокрафт по найденным рецептам (OV.wsmake: количество,
     этапы, согласие на особое, §12.1). Нажатие на лист — то же, на значок — карточка ресурса. Лист, который можно создать сейчас,
     светится по краю бирюзой; не хватает или этап не найден — подпись под стрелкой;
   — найден частично (подсказки §12) — по обрывку на ингредиент: найденный — значок и «×?» (количество игрок угадывает сам, §12),
     ненайденный — пустой обрывок с «?». Справа итог: игрок его нашёл — значок и название, нет — обрывок с «?» без названия. Стрелка —
     «На стол»: открытые позиции ложатся в ячейки стола;
   — не найденные рецепты в книге не показываются: книга — то, что собрано по крупицам; в конце списка — одна строка без чисел.
   Сервер решает: что лежит в книге, отдаёт WS_SRV.book() (screens/craft.js) — только найденное; у обрывка, итог которого игрок не нашёл,
   нет ни названия, ни вида. Числа вида — RB_VIEW, арт и геометрия — RB_ART (tools/art-gen/rbook_layers.py). Свои классы — rb-*;
   метка записи ws-rc — по ней проверки считают записи и порции. Автопроверка — tools/content-gen/screens/check_recipe_book.js. */
'use strict';

/* ================== вид: числа вида, не баланс ================== */
const RB_VIEW = {
  len: [['s', 2], ['m', 4], ['l', 6]],   // лист по числу ингредиентов: до двух — короткий, до четырёх — средний, до шести — длинный
  /* раскладка записи в тысячных долях высоты листа H. Высота у всех листов одна: H = ширина страницы / пропорция длинного листа.
     Поля листа слева и справа, значок, зазор значков, стрелка, место итога — от и до; обрывок по числу ингредиентов (до четырёх, пять,
     шесть) и зазор обрывков; значок в обрывке — тот же, что на листе, но не больше доли fic обрывка, ‰ */
  lay: { padl: 280, padr: 160, ic: 440, gap: 120, go: 860, omin: 1060, omax: 1700, frag4: 680, frag5: 640, frag6: 560, fgap: 70, fic: 800 },
  zoom: 1000,        // ширина книги к ширине окна, ‰: больше тысячи — обложка уходит за край, страницы крупнее
  margin: 6,         // поле окна сверху и снизу, px
  rowGap: 8,         // между записями по вертикали, px
  open: 380,         // книга раскрывается, мс
  hl: 2400,          // запись, на которой книгу раскрыли после удачи, светится, мс
};

/* ================== арт: tools/art-gen/jobs/recipe-book.json, выгрузка ui-art.json → assets/art/rbook/ ==================
   ready — выгруженные пути: пока пути нет, вещь рисует CSS. px — размер выгрузки (пропорции нарисованного, без искажения);
   page — поле страницы внутри двойной золотой линейки разворота: [слева, сверху, справа, снизу], тысячные доли книги */
const RB_ART = {
  ready: ['rbook/book.webp', 'rbook/strip-s.webp', 'rbook/strip-m.webp', 'rbook/strip-l.webp', 'rbook/frag-1.webp', 'rbook/frag-2.webp',
    'rbook/frag-3.webp', 'rbook/frag-4.webp', 'rbook/frag-5.webp', 'rbook/frag-6.webp', 'rbook/frag-7.webp', 'rbook/frag-8.webp',
    'rbook/frag-9.webp'],   // выгрузка 01.10.2026
  book: { img: 'rbook/book.webp', px: [1997, 821], page: { l: [89, 120, 471, 806], r: [530, 120, 912, 807] } },
  strip: { s: { img: 'rbook/strip-s.webp', px: [636, 186] }, m: { img: 'rbook/strip-m.webp', px: [899, 188] }, l: { img: 'rbook/strip-l.webp', px: [1088, 191] } },
  frag: { n: 9, img: k => 'rbook/frag-' + k + '.webp' },
};
const rbArt = p => RB_ART.ready.includes(p);

/* адреса арта — в переменные <html>, флаг «арт загружен» — класс <html>: rb-bk (книга), rb-pp (листы), rb-fr (обрывки). Флаги — не классы
   элементов (страж — check_heroes.js). Адрес полный: url() из переменной браузер разрешает от файла стилей, где её подставили */
(function rbArtVars() {
  const R = document.documentElement, st = R && R.style, abs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
  if (!st) return;
  const set = (k, p) => { if (!rbArt(p)) return false; try { st.setProperty(k, `url("${abs(p)}")`); } catch (_) { } return true; };
  const all = (list, cls) => { if (list.every(Boolean) && R.classList) R.classList.add(cls); };
  all([set('--rb-book', RB_ART.book.img)], 'rb-bk');
  all(Object.entries(RB_ART.strip).map(([k, x]) => set('--rb-strip-' + k, x.img)), 'rb-pp');
  all(Array.from({ length: RB_ART.frag.n }, (_, i) => set('--rb-frag-' + (i + 1), RB_ART.frag.img(i + 1))), 'rb-fr');
})();

/* ================== помощники ================== */
const rbEsc = s => trEsc(String(s == null ? '' : s));
/* лист по числу ингредиентов: s, m, l */
const rbLen = n => (RB_VIEW.len.find(([, max]) => n <= max) || RB_VIEW.len[RB_VIEW.len.length - 1])[0];
/* какой из нарисованных обрывков — от рецепта и места: постоянно, перерисовка бумагу не меняет */
const rbFragK = (rid, i) => 1 + (EB.seedOf('Книга рецептов · ' + rid + ' · ' + i) % RB_ART.frag.n);
/* путь рецепта, когда у итога их несколько: «Снадобье от ожогов · на бальзаме» → «на бальзаме», «Энериум из жилы» → «из жилы»,
   «Осколки доблести · цикл I · из пыли» → «из пыли». Сличение по началу слова — ради «Осколки» и «Осколок» */
function rbAlt(r, out) {
  if (!out || r.n === out.n) return '';
  const own = out.n.split(' · '), stem = s => s.slice(0, 5).toLowerCase();
  return r.n.split(' · ').map(s => {
    if (own.includes(s)) return '';
    const b = own.find(o => s.startsWith(o + ' '));
    if (b) return s.slice(b.length + 1);
    return own.some(o => stem(o) === stem(s)) ? '' : s;
  }).filter(Boolean).join(' · ');
}
/* стрелка чернилами: от ингредиентов к итогу */
const RB_ARROW = '<svg class="rb-arw" viewBox="0 0 48 24" aria-hidden="true" focusable="false"><path d="M3 12.6c9.5-.9 19.5-1 32.5-.4"/><path d="M28.5 4.2c4.2 3.1 8.4 5.6 14.5 7.9-6.1 2.1-10.3 4.7-14.5 8.1"/></svg>';
/* лицо героя в рамке предмета (art-icons.css: itf, face — портрет ровно в окне рамки): рецепт героя (§15, стадии знакомства) —
   карточка героя по нажатию */
const rbHero = (h, a) => `<button class="well itf face rb-ic rb-hero" data-r="${h.r}" data-a="${a ? 'rhero' : 'noop'}" data-v="${h.id}" aria-label="${rbEsc(h.n)}" title="${rbEsc(h.n)}">${rsFace(h)}</button>`;
/* значок в книге: рамка предмета (wsWell → crK), количество — тёмная плашка «×N» (знак — стилями), нажатие — карточка ресурса */
const rbWell = (it, q, o = {}) => wsWell(it, { q, cls: 'rb-ic' + (o.cls ? ' ' + o.cls : ''), act: o.kit ? 'noop' : 'wsinfo' });

/* ================== записи ================== */
/* книга глазами игрока: ответ сервера, у найденного целиком — план автодокрафта на один раз */
function rbAll() {
  return WS_SRV.book().map(x => x.whole ? Object.assign(x, { plan: wsPlan(x.r, 1), kind: x.r.kind, name: (BAG.item(x.r.out[0]) || x.r).n }) : x);
}
/* поиск — по названию итога и рецепта, известным ингредиентам; у обрывка без найденного итога — только по открытым позициям */
function rbHit(x, q) {
  if (!q) return true;
  const ids = x.whole ? x.r.in.map(([id]) => id) : x.slots.filter(Boolean).map(s => s.id);
  const names = (x.whole ? [x.r.n, x.name] : x.name ? [x.name, wsName(x.out)] : []).concat(ids.map(wsName));
  return names.some(s => trNorm(s).includes(q));
}
/* выборка книги: вкладка, вид, избранное, поиск. Порядок — избранное, найденные целиком, обрывки; дальше — порядок данных */
function rbView() {
  const B = S.ws.book, q = trNorm(String(B.q || '').trim()), rows = rbAll(), K = WS_DATA.kinds.find(k => k[0] === B.kind);
  const fav = x => (S.ws.fav.includes(x.id) ? 0 : 1);
  rows.sort((a, b) => fav(a) - fav(b) || (a.whole ? 0 : 1) - (b.whole ? 0 : 1) || wsOrd.get(a.id) - wsOrd.get(b.id));
  const base = rows.filter(x => (!B.fav || S.ws.fav.includes(x.id)) && (!K || (x.kind && K[2].includes(x.kind))) && rbHit(x, q));
  const tabs = [['all', 'Все', base], ['can', 'Создать сейчас', base.filter(x => x.whole && x.plan.ok && !x.plan.owned)], ['hint', 'Обрывки', base.filter(x => !x.whole)]];
  const cur = tabs.find(t => t[0] === B.tab) || tabs[0];
  return { B, q, rows, K, tabs, cur, filtered: !!(q || B.fav || K) };
}
/* звезда избранного — в верхнем углу записи */
function rbStar(id, name, kit) {
  const on = S.ws.fav.includes(id);
  return `<button class="rb-star" data-a="${kit ? 'noop' : 'wsfav'}" data-v="${id}" aria-pressed="${on}" aria-label="${on ? 'Убрать из избранного' : 'В избранное'}${name ? ': ' + rbEsc(name) : ''}" title="${on ? 'В избранном' : 'В избранное'}">${ic('star')}</button>`;
}
/* свечение записи, на которой книгу раскрыли после удачи: время — от раскрытия книги, перерисовка его не рвёт */
const rbHl = id => (S.ws.book.hl === id ? ` data-hl style="--hd:${Math.round((S.ws.book.t0 || 0) - wsNow())}ms"` : '');
/* найден целиком: полоса листа своей длины. Состояние — data-st: ok можно создать, lack не хватает, stop этап не найден, own герой уже есть */
function rbWholeHtml(x, o = {}) {
  const r = x.r, p = x.plan, out = BAG.item(r.out[0]), hero = wsHero(r), name = out ? out.n : r.n, alt = rbAlt(r, out);
  const st = p.owned ? 'own' : p.ok ? 'ok' : p.stop.length ? 'stop' : 'lack', k = p.steps.length;
  const cap = { own: hero && rsHas(hero) ? 'в коллекции' : 'осколки собраны', ok: 'создать', stop: 'этап не найден', lack: 'не хватает' }[st];
  const why = st === 'ok' ? (k ? `Создать через ${k} ${plural(k, 'этап', 'этапа', 'этапов')}` : 'Создать') : st === 'stop' ? 'Неизвестный этап — автодокрафт остановится' : st === 'lack' ? 'Не хватает ресурсов' : cap;
  const act = o.kit ? 'noop' : 'wsmake', off = p.owned ? ' disabled' : '';
  const ing = r.in.map(([id, q]) => rbWell(BAG.item(id), q, { cls: !o.kit && wsQty(id) < q ? 'ws-short' : '', kit: o.kit })).join('');
  const res = hero ? rbHero(hero, !o.kit) : rbWell(out, r.out[1] > 1 ? r.out[1] : null, { kit: o.kit });
  return `<div class="ws-rc rb-e rb-w" data-len="${rbLen(r.in.length)}" data-st="${st}" data-rid="${r.id}"${o.kit ? '' : rbHl(r.id)}>`
    + `<button class="rb-hit" data-a="${act}" data-v="${r.id}" tabindex="-1" aria-hidden="true"${off}></button>`
    + `<span class="rb-in">${ing}</span>`
    + `<button class="rb-go" data-a="${act}" data-v="${r.id}" aria-label="${rbEsc(why)}: ${rbEsc(name)}" title="${rbEsc(why)}"${off}>${RB_ARROW}<small>${cap}</small></button>`
    + `<span class="rb-out">${res}<b class="rb-nm">${rbEsc(name)}</b></span>${alt ? `<small class="rb-alt" title="${rbEsc(r.n)}">${rbEsc(alt)}</small>` : ''}`
    + `${rbStar(r.id, name, o.kit)}</div>`;
}
/* найден частично: обрывок на ингредиент — открытый со значком и «×?», закрытый — пустой с «?»; итог — найден игроком или обрывок с «?» */
function rbPartHtml(x, o = {}) {
  const n = x.slots.length, out = x.out ? BAG.item(x.out) : null, hero = out && out.tier === 'hero' ? RSI[out.heroId] || null : null;
  const frag = (i, inner, q) => `<span class="rb-f${q ? ' rb-f-q' : ''}" data-k="${rbFragK(x.id, i)}"${q ? ' aria-hidden="true"' : ''}>${inner}</span>`;
  const qm = '<b class="rb-qm">?</b>';
  const fr = x.slots.map((s, i) => s ? frag(i, rbWell(BAG.item(s.id), s.q || '?', { kit: o.kit })) : frag(i, qm, true)).join('');
  const res = out ? frag(n, hero ? rbHero(hero, !o.kit) : rbWell(out, null, { kit: o.kit })) + `<b class="rb-nm">${rbEsc(x.name)}</b>` : frag(n, qm, true);
  const lbl = `Обрывки рецепта${x.name ? ' «' + rbEsc(x.name) + '»' : ''}: ${x.all ? 'все ресурсы верны, без количеств' : `верно ${x.open} из ${n}`}`;
  return `<div class="ws-rc rb-e rb-p" data-st="part" data-rid="${x.id}" data-n="${n}"${x.all ? ' data-all' : ''} role="group" aria-label="${lbl}"${o.kit ? '' : rbHl(x.id)}>`
    + `<span class="rb-in">${fr}</span>`
    + `<button class="rb-go" data-a="${o.kit ? 'noop' : 'wsload'}" data-v="${x.id}" aria-label="На стол: открытые позиции" title="Открытые позиции — на стол">${RB_ARROW}<small>на стол</small></button>`
    + `<span class="rb-out">${res}</span>${rbStar(x.id, x.name, o.kit)}</div>`;
}
const rbEntryHtml = (x, o) => (x.whole ? rbWholeHtml(x, o) : rbPartHtml(x, o));
/* пусто: книга новая, обрывков нет, сейчас ничего не собрать, поиск или фильтр ничего не нашли */
function rbEmptyHtml(V) {
  const t = V.cur[0];
  if (V.filtered) return '<div class="rb-none"><p>Ничего не найдено</p><button class="rb-clr" data-a="wsbclr">Сбросить поиск и фильтры</button></div>';
  if (t === 'hint') return `<p class="rb-none">Обрывков пока нет. Они появляются, когда на столе не меньше ${WS_DATA.hintMin} верных ресурсов рецепта от ${WS_DATA.hintFrom} ингредиентов.</p>`;
  if (!V.rows.length) return '<p class="rb-none">Книга пуста. Рецепты находят на столе: верное сочетание создаёт предмет всегда, а подсказки собирают рецепт по обрывкам.</p>';
  if (t === 'can') return '<p class="rb-none">Сейчас ничего не собрать: ресурсов не хватает.</p>';
  return '<p class="rb-none">Ничего не найдено</p>';
}
/* список порциями (crPage): 500 рецептов разом не рисуются. В конце «Всех» без фильтров — строка без чисел: остальное ещё не найдено */
function rbListHtml(V) {
  const key = 'wsbook:' + V.cur[0], list = V.cur[2];
  if (!list.length) return rbEmptyHtml(V);
  const P = typeof crPage === 'function' ? crPage(list, key) : { shown: list, rest: 0 };
  const more = typeof crMoreHtml === 'function' ? crMoreHtml(key, P.rest, 'rb-more') : '';
  const end = !P.rest && V.cur[0] === 'all' && !V.filtered ? '<p class="rb-end">Дальше — чистые страницы: остальные рецепты ещё предстоит найти на столе.</p>' : '';
  return P.shown.map(x => rbEntryHtml(x)).join('') + more + end;
}
/* шапка страниц: слева вкладки, справа поиск, вид и «только избранное» */
function rbHeadHtml(V) {
  const B = V.B;
  const tabs = V.tabs.map(([k, l, list]) => `<button role="tab" aria-selected="${V.cur[0] === k}" data-a="wsbtab" data-v="${k}">${l} · ${fmt(list.length)}</button>`).join('');
  const opts = '<option value="">Все виды</option>' + WS_DATA.kinds.filter(k => k[0] === B.kind || V.rows.some(x => x.kind && k[2].includes(x.kind)))
    .map(k => `<option value="${k[0]}"${k[0] === B.kind ? ' selected' : ''}>${k[1]}</option>`).join('');
  return `<div class="rb-h"><div class="rb-tabs" role="tablist" aria-label="Книга рецептов">${tabs}</div>`
    + `<div class="rb-tools"><label class="rb-q">${ic('search')}<input id="wsBookQ" type="search" placeholder="Рецепт или ресурс" value="${rbEsc(B.q)}" autocomplete="off" aria-label="Поиск по книге рецептов"></label>`
    + `<select class="rb-kind" data-a="wsbkind" aria-label="Вид рецепта">${opts}</select>`
    + `<button class="rb-favt" data-a="wsbfav" aria-pressed="${!!B.fav}" aria-label="Только избранное" title="Только избранное">${ic('star')}</button></div></div>`;
}
/* переменные геометрии: книга, страницы, листы и раскладка записи — из RB_ART и RB_VIEW */
function rbVars() {
  const A = RB_ART, V = RB_VIEW, P = A.book.page, pl = P.l[0], pr = P.r[2], gl = P.l[2], gr = P.r[0];
  const v = [`--rb-bw:${A.book.px[0]}`, `--rb-bh:${A.book.px[1]}`, `--rb-zoom:${V.zoom}`, `--rb-m:${V.margin}px`, `--rb-rg:${V.rowGap}px`,
    `--rb-pl:${pl}`, `--rb-pt:${Math.max(P.l[1], P.r[1])}`, `--rb-pr:${pr}`, `--rb-pb:${Math.min(P.l[3], P.r[3])}`,
    `--rb-g:${Math.round((gr - gl) * 1000 / (pr - pl))}`, `--rb-open:${V.open}ms`, `--rb-hlt:${V.hl}ms`];
  for (const [k, s] of Object.entries(A.strip)) v.push(`--rb-${k}w:${s.px[0]}`, `--rb-${k}h:${s.px[1]}`);
  for (const [k, n] of Object.entries(V.lay)) v.push(`--rb-${k}:${n}`);
  return v.join(';');
}
/* книга целиком: подложка, разворот, табличка, страницы — шапка и список, крестик. Раскрытие идёт от S.ws.book.t0: перерисовка посреди
   анимации её не рвёт */
function rbBookHtml() {
  const V = rbView(), e = Math.max(0, wsNow() - (S.ws.book.t0 || 0)), d0 = -Math.min(e, RB_VIEW.open * 4);
  return `<div class="rb" style="${rbVars()};--rb-d0:${d0}ms"><i class="rb-scrim" aria-hidden="true"></i>`
    + `<section class="rb-book" role="dialog" aria-label="Книга рецептов"><i class="rb-sp" aria-hidden="true"></i><b class="rb-title" aria-hidden="true">Книга рецептов</b>`
    + `<div class="rb-pg">${rbHeadHtml(V)}<div class="rb-list" data-keep="wsbook:${V.cur[0]}">${rbListHtml(V)}</div></div></section>`
    + `<button class="rb-x" data-a="wsview" data-v="table" aria-label="Закрыть книгу" title="Закрыть книгу">${ic('x')}</button></div>`;
}
/* книга раскрыта — на экране Мастерской, «Ремесло → Мастерская» */
const rbShown = () => typeof S !== 'undefined' && !!S && S.route === 'craft' && S.seg && S.seg.craft === 'work' && !!S.ws && S.ws.view === 'book';
const rbLayer = () => (rbShown() ? rbBookHtml() : '');
/* слой книги — перед листами: карточка ресурса, автодокрафт и итог открываются над книгой */
{
  const rbOverlay0 = overlay;
  overlay = function () { return rbLayer() + rbOverlay0(); };
}

/* ================== действия ================== */
Object.assign(ACT, {
  /* «Сбросить поиск и фильтры» — книга снова целиком */
  wsbclr() { Object.assign(S.ws.book, { q: '', kind: '', fav: false }); render(); },
  /* обрывок из карточки ресурса: книга на вкладке «Обрывки», запись светится */
  wsbookpart(v) { if (!S.ws.part[v]) return; S.overlay = null; wsBookOpen(); Object.assign(S.ws.book, { tab: 'hint', kind: '', fav: false, q: '', hl: v }); render(); },
});
/* Esc закрывает книгу, если поверх неё нет листа (лист закрывает свой обработчик index.html) */
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !S.overlay && rbShown()) { e.preventDefault(); S.ws.view = 'table'; render(); } });
/* раскрыли — фокус на крестике, чтобы клавиатура была в книге; запись после удачи — в середину страницы */
let rbFocusT = -1;
window.addEventListener('en-render', () => {
  if (!rbShown() || S.overlay || rbFocusT === S.ws.book.t0) return;
  rbFocusT = S.ws.book.t0;
  try {
    requestAnimationFrame(() => {
      const x = document.querySelector('.g .rb .rb-x'); if (x) x.focus({ preventScroll: true });
      const hl = S.ws.book.hl && document.querySelector(`.g .rb-list [data-rid="${S.ws.book.hl}"]`);
      if (hl && hl.scrollIntoView) hl.scrollIntoView({ block: 'center' });
    });
  } catch (_) { }
});

/* ================== UI-кит: раздел «Книга рецептов: бумага» ==================
   Три длины листа, обрывки и итог — известный и нет. Те же записи, что в книге, нажатия в разделе нет; проба — не выдача */
function rbKitSample(n) { return EN_RECIPES.recipes.find(r => !r.team && r.kind !== 'hero' && r.in.length === n) || null; }
function rbKitHtml() {
  const whole = [2, 4, 6].map(rbKitSample).filter(Boolean).map(r => rbWholeHtml({ id: r.id, whole: true, r, plan: wsPlan(r, 1) }, { kit: true }));
  const pr = rbKitSample(5);
  const part = pr ? [true, false].map(known => rbPartHtml({ id: pr.id, whole: false, slots: pr.in.map(([id], i) => (i % 2 ? null : { id, q: 0 })), open: 3, all: false,
    out: known ? pr.out[0] : '', name: known ? pr.n : '', kind: known ? pr.kind : '' }, { kit: true })) : [];
  const cells = whole.concat(part).map((h, i) => `<figure class="rb-kf">${h}<figcaption>${['короткий лист — один-два ингредиента', 'средний — три-четыре', 'длинный — пять-шесть', 'обрывки, итог найден', 'обрывки, итог не найден'][i] || ''}</figcaption></figure>`).join('');
  const team = TM(`<p class="k-note">Листы — rbook/strip-s, -m, -l, каждый в своих пропорциях: ширина записи — высота листа × пропорция его картинки, высота у всех одна (RB_VIEW.lay, RB_ART.strip). Обрывки — rbook/frag-1…9, какой — от рецепта и места. Нарезка и геометрия — tools/art-gen/rbook_layers.py, задание — tools/art-gen/jobs/recipe-book.json.</p>`, 'div');
  return `<section class="k-box rb-kit" style="grid-column:1/-1"><h3>Книга рецептов: бумага</h3>
    <p class="k-note">Найден целиком — ровный лист древней бумаги узкой полосой: ингредиенты слева, стрелка «Создать», итог с названием справа. Длина листа — по числу ингредиентов. Найден частично — обрывки: найденный ресурс со значком и «×?», количество игрок угадывает сам; ненайденный — «?». Итог, которого игрок не находил, — обрывок с «?» без названия.</p>
    <div class="rb-kg" style="${rbVars()}">${cells}</div>${team}</section>`;
}
KIT_EXTRA.push({ html: rbKitHtml });

/* ================== сценарий презентации ================== */
(() => {
  const i = FLOWS.findIndex(f => f[0] === 'Мастерская · автодокрафт');
  const flow = ['Мастерская · книга рецептов', 'Книга на всё окно: найденные рецепты — листы древней бумаги трёх длин, найденные частично — обрывки; итог, которого игрок не находил, — обрывок с «?»',
    () => { S.route = 'craft'; S.seg.craft = 'work'; S.overlay = null; S.ws.view = 'table'; wsBookOpen(); Object.assign(S.ws.book, { tab: 'all', kind: '', fav: false, q: '' }); }];
  if (i >= 0) FLOWS.splice(i + 1, 0, flow); else FLOWS.push(flow);
})();
