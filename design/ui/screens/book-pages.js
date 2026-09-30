/* screens/book-pages.js — страницы раскрытой книги героя: что написано внутри книги. Слово автора 30.09.2026: «хочу чтобы ты продумал UI
   и UX всего внутри карточки героя, чтобы было удобно для игрока, те же способности нужно нажимать чтобы их читать это странно, в общем
   сейчас это просто не нативно и не удобно, тем более у нас изменился интерфейс, мы перешли с заглушек на красивый визуал а внутри
   осталось всё по-старому, не порядок». Вечером того же дня: «В открытой книге героя, не хватает тёмной подложки, ибо текст становиться
   где-то не читаемым или трудно читаемым».
   Книга (screens/book.js) — переплёт, обложка, разворот и анимация; здесь — страницы:
   — тема страницы .pg: правая страница — лист чернёного пергамента, вклеенный в страницу книги (материал карточки «Ремесла»); пишут
     по нему белилами и золотом, рубрика — киноварью, буквицы. Общие токены цвета (--parch, --gold, --iron, --spirit…) на странице —
     белилами и золотом, поэтому чипы, строки и кнопки интерфейса сами ложатся на лист; контраст текста — не ниже 4,5 : 1;
     стили — screens/book-pages.css;
   — закладки вкладок pgTabs: кожаные закладки по верхнему краю правой страницы. Герой аккаунта — «Развитие», «Мощь», «Снаряжение»,
     «Навыки», «Путь» (heroDetail, index.html); книга «до покупки» — «Герой», «Мощь», «Навыки», «Путь» (hcPreBody, screens/heroes.js).
     Смена вкладки — страница проступает (pgBody): время — от нажатия, перерисовка посреди показа его не рвёт;
   — страница «Мощь» pgStats: боевая мощь и из чего она сложена, пять характеристик со степенью роста и прибавкой снаряжения — нажатие
     объясняет характеристику строкой под ними, без окна; атрибуты боя столбцами «Нападение» и «Защита». До покупки — то же по базовым
     характеристикам. Прежний лист «Характеристики» из книги не открывается: тихая строка «Развития» ведёт на эту страницу;
   — листы и окна, которые открываются из книги (предел, доблесть, «Сведения», «Свойства и сравнение», окно снаряжения, «Что изменилось»),
     — тем же пергаментом: листу или окну поверх книги класс темы .pg ставит обёртка overlay ниже, окну снаряжения — своя тема .gw;
     стили — book-pages.css;
   — арт страниц PG_ART (tools/art-gen/jobs/hero-book-pages.json): рамки значков по виду способности, оправа талисмана, кожаные
     закладки и кнопки, чернёный пергамент листа, золотые виньетки; пока пути нет в PG_ART.ready, всё рисует CSS;
   — раздел UI-кита «Страницы книги героя» и сценарии презентации.
   Логика вкладок не здесь: развитие и окно снаряжения — screens/hero-dev.js, места — eqRow и talRow (screens/equipment.js,
   screens/talismans.js), способности — heroKitHtml (index.html), главы — hrPath (screens/heroes.js) и rsChaptersHtml (index.html).
   Сервер решает: страницы только показывают. Числа вида — PG_VIEW. Своё состояние — S.pg.
   Автопроверка — tools/content-gen/screens/check_hero_book.js. */
'use strict';

/* ================== вид: числа — здесь, в функциях только алгоритм. Вид, не баланс ================== */
const PG_VIEW = {
  fade: 220,        // смена вкладки: страница проступает, мс (transform и opacity; «меньше движения» — сразу)
  rise: 5,          // …и поднимается снизу на столько px
  shareMin: 3,      // сегмент полосы долей хода — не уже 3 % полосы: доля ульты в 1 % тоже видна
  stat: 28,         // значок характеристики на странице «Мощь», px
  attr: 18,         // значок атрибута, px
};
/* арт страниц (tools/art-gen/jobs/hero-book-pages.json и hero-book-ink.json, выгрузка ui-art.json → assets/art/pages/). ready —
   выгруженные пути: пока пути нет, вещь рисует CSS. frames — рамки значков (tools/art-gen/craft_layers.py frames: тело рамки — 200 из
   256 px холста): win — прозрачное окно на холсте [слева, сверху, справа, снизу], ‰ холста; over — насколько рамка заходит на то,
   что в окне, ‰ его стороны (у талисмана окно — вокруг медальона). Рамку CSS ставит слоем поверх значка: холст растянут так, чтобы
   окно легло на значок (pgFit). img — закладки, кнопки, лист чернёного пергамента (vel — тот же материал, что карточка «Ремесла»:
   craft/vellum.jpg) и золотые виньетки (gilt-* — чернильные виньетки старым золотом, tools/art-gen/page_layers.py gild: чернила по
   чёрному листу не видны); slice — срезы border-image [сверху, справа, снизу, слева], ‰ высоты и ширины рисунка; wide — ширина полосы
   border-image, px [сверху, справа, снизу, слева] */
const PG_ART = {
  ready: ['pages/frame-act.png', 'pages/frame-ult.png', 'pages/frame-pas.png', 'pages/frame-react.png', 'pages/frame-tal.png', 'pages/frame-cap.png',
    'pages/tab.webp', 'pages/tab-on.webp', 'pages/btn.webp', 'pages/btn2.webp',   // выгрузка 30.09.2026
    'craft/vellum.jpg', 'pages/gilt-head.png', 'pages/gilt-div.png', 'pages/gilt-tail.png', 'pages/gilt-wreath.png'],   // тёмная подложка — 01.10.2026
  frame: k => 'pages/frame-' + k + '.png',
  frames: {
    act: { win: [223, 215, 777, 785], over: 60 }, ult: { win: [242, 273, 750, 793], over: 60 }, pas: { win: [223, 227, 777, 781], over: 60 },
    react: { win: [234, 223, 758, 773], over: 60 }, tal: { win: [293, 246, 707, 805], over: 170 }, cap: { win: [223, 219, 777, 785], over: 40 },
  },
  img: { tab: 'pages/tab.webp', 'tab-on': 'pages/tab-on.webp', btn: 'pages/btn.webp', btn2: 'pages/btn2.webp', vel: 'craft/vellum.jpg',
    'gilt-head': 'pages/gilt-head.png', 'gilt-div': 'pages/gilt-div.png', 'gilt-tail': 'pages/gilt-tail.png', 'gilt-wreath': 'pages/gilt-wreath.png' },
  slice: { tab: [340, 120, 0, 120], btn: [260, 230, 260, 230], btn2: [260, 230, 260, 230] },
  wide: { tab: [8, 7, 0, 7], btn: [9, 16, 9, 16], btn2: [9, 16, 9, 16] },
};

/* ================== помощники ================== */
const pgArt = p => PG_ART.ready.includes(p);
const pgNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
const pgReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
/* б. п. → «+4,8 %»: целыми, без округления вверх */
const pgPct = bp => { const s = bp < 0 ? '−' : '+', a = Math.abs(bp), i = Math.floor(a / 100), f = Math.floor(a % 100 / 10); return `${s}${i}${f ? ',' + f : ''} %`; };
/* рамка слоем поверх значка: холст растянут так, чтобы окно рамки легло на значок и зашло на его край на over ‰ стороны; по высоте —
   тот же масштаб, окно — по середине. Итог — поля слоя [сверху, справа, снизу, слева] в % стороны значка (отрицательные: слой шире) */
function pgFit(f) {
  const [x0, y0, x1, y1] = f.win, o = f.over, c = (1000 - 2 * o) * 1000 / (x1 - x0);   // холст к стороне значка, ‰
  const left = x0 * c / 1000 - o, top = y0 * c / 1000 - (1000 - (y1 - y0) * c / 1000) / 2;
  const right = c - 1000 - left, bottom = c - 1000 - top;
  return [top, right, bottom, left].map(v => `${-Math.round(v) / 10}%`).join(' ');
}
/* нарисованные рамки, закладки, кнопки, лист и виньетки — адреса в переменные <html>, как у книги и шкафа; класс у <html> говорит CSS,
   что рисунок есть: pg-f — рамки способностей, pg-ft — оправа талисмана, pg-fc — буквица, pg-<имя> — закладки, кнопки, лист (pg-vel)
   и золотые виньетки (pg-gilt-*); имя флага не совпадает ни с одним классом элемента (ADR-0035, п. 16). Срезы
   border-image — переменные --pg-<имя>-s (срезы) и --pg-<имя>-w (ширина полосы). Адрес полный: url() из переменной браузер разрешает от
   файла стилей, где её подставили */
(function pgArtVars() {
  const R = document.documentElement, st = R && R.style, abs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
  if (!st) return;
  const set = (k, p) => { if (!pgArt(p)) return false; try { st.setProperty(k, `url("${abs(p)}")`); } catch (_) { } return true; };
  const all = (list, cls) => { if (list.length && list.every(Boolean) && R.classList) R.classList.add(cls); };
  const frame = k => { const ok = set('--pg-f-' + k, PG_ART.frame(k)); if (ok) try { st.setProperty('--pg-fi-' + k, pgFit(PG_ART.frames[k])); } catch (_) { } return ok; };
  all(['act', 'ult', 'pas', 'react'].map(frame), 'pg-f');
  all([frame('tal')], 'pg-ft');
  all([frame('cap')], 'pg-fc');
  /* закладки — парой: без рисунка выбранной её не отличить от соседних, тогда обе рисует CSS */
  const pair = { tab: 'tab-on' }, second = new Set(Object.values(pair));
  for (const [k, p] of Object.entries(PG_ART.img)) if (!second.has(k)) all([set('--pg-' + k, p)].concat(pair[k] ? [set('--pg-' + pair[k], PG_ART.img[pair[k]])] : []), 'pg-' + k);
  const pct = v => `${Math.floor(v / 10)}.${v % 10}%`;
  for (const k of Object.keys(PG_ART.slice)) try {
    st.setProperty(`--pg-${k}-s`, PG_ART.slice[k].map(v => v ? pct(v) : '0').join(' '));
    st.setProperty(`--pg-${k}-w`, PG_ART.wide[k].map(v => v + 'px').join(' '));
  } catch (_) { }
})();

/* ================== закладки вкладок ==================
   Кожаные закладки по верхнему краю правой страницы: выбранная выше и светлее, её низ сливается со страницей. items — [ключ, подпись,
   точка]; точка — подсказка, почему на закладке огонёк (в запасах есть лучше). key — сегмент состояния (hero, rhero): нажатие — та же
   ACT.seg, что у прежних вкладок. extra — своё в конце строки (глаз «Команды») */
function pgTabs(items, cur, key, o = {}) {
  const tab = ([k, l, dot]) => `<button class="pg-bmk" role="tab" aria-selected="${cur === k}" data-a="seg" data-v="${key}:${k}"${dot ? ` title="${hrEsc(l + ': ' + dot)}"` : ''}>${l}${dot ? '<i class="tdot" aria-hidden="true"></i>' : ''}</button>`;
  return `<nav class="pg-tabs" role="tablist" aria-label="${hrEsc(o.label || 'Разделы книги')}">${items.map(tab).join('')}${o.extra || ''}</nav>`;
}
/* тело вкладки: страница проступает, если вкладку только что сменили (S.pg.at — ключ и время нажатия); задержка отрицательная —
   перерисовка посреди показа продолжает его, а не начинает заново */
function pgBody(html, key) {
  const A = S.pg && S.pg.at, e = A && A.k === key ? pgNow() - A.t0 : -1, go = e >= 0 && e < PG_VIEW.fade && !pgReduced();
  return `<div class="pg-b${go ? ' pg-in' : ''}"${go ? ` style="--pg-d:-${e}ms;--pg-t:${PG_VIEW.fade}ms;--pg-y:${PG_VIEW.rise}px"` : ''}>${html}</div>`;
}

/* ================== «Мощь»: из чего сила героя ==================
   Слово автора 30.09.2026: характеристики и атрибуты — на странице книги, а не в отдельном листе. §33.2: пять характеристик со степенью
   роста и подсказкой «что даёт», здоровье, атакующие и защитные атрибуты; §33.1 — то же до покупки. Числа — те же, что в бою и в мощи:
   heroSt (с доблестью), eqStatAdd (снаряжение), heroUnit и attrList (карта ядра), BM.parts (слои мощи). o.pre — герой вне коллекции:
   0 уровень, без вещей */
const PG_ATK = u => [u && u.main === 'int' ? 'matk' : 'patk', 'crit', 'critdmg'];
const PG_DEF = ['hp', 'def-phys', 'def-mag', 'eva'];
/* строка под характеристиками: что даёт, главная ли, сколько даёт снаряжение — одна фраза в две строки страницы. «Рост за уровень» здесь
   не пишем: в ядре уровень растит атрибуты общим множителем (§3.3, battle.js mkUnit), характеристики растит доблесть (valorSt);
   СРХ задаёт главную (§5). Расхождение с §3.2 — вопрос автору, ADR-0037 */
const pgWhy = (i, g, main, add) => `<b>${STATS[i]}</b> — ${STAT_HINT[i]}${main ? '. Главная: от неё обычная атака' : ''}${add ? `; снаряжение +${add}` : ''}.`;
function pgStats(h, o = {}) {
  if (!h) return '';
  const P = BM.parts(h), st = heroSt(h), add = !o.pre && typeof eqStatAdd === 'function' ? eqStatAdd(h) : [0, 0, 0, 0, 0];
  const main = (h.gr || []).indexOf(1), pick = S.pg ? S.pg.st : null, sel = Number.isInteger(pick) && pick >= 0 && pick < STATS.length ? pick : Math.max(0, main);
  /* мощь: основа и слои вещей — только те, что есть */
  const lay = [['eq', 'снаряжение'], ['tal', 'талисманы']].filter(([k]) => P.mul[k] && P.mul[k] !== 10000).map(([k, n]) => `<span>${n} <b class="num">${pgPct(P.mul[k] - 10000)}</b></span>`);
  const src = o.pre ? '<span>на 0 уровне,</span><span>без вещей</span>' : `<span>основа <b class="num">${fmt(P.base)}</b></span>${lay.join('')}`;
  const bm = `<div class="pgm-bm" title="Боевая мощь ${fmt(P.bm)}"><span class="pgm-wr">${ICON('power', 22, 'Боевая мощь')}</span><b class="num">${fmt(P.bm)}</b><span class="pgm-src">${src}</span></div>`;
  /* пять характеристик: значок, число (с прибавкой снаряжения), степень роста; главная — с первой степенью роста */
  const cell = (v, i) => {
    const say = `${STATS[i]} ${v + add[i]}: ${STAT_HINT[i]}${i === main ? ', главная' : ''}`;
    return `<button class="pgm-s${i === main ? ' main' : ''}" data-a="pgst" data-v="${i}" aria-pressed="${i === sel}" aria-label="${hrEsc(say)}" title="${hrEsc(say)}">${ICON(STAT_IC[i], PG_VIEW.stat, STATS[i])}<b class="num">${v + add[i]}</b>${add[i] ? `<small class="eqd num">+${add[i]}</small>` : ''}<span class="grade" aria-hidden="true">${[1, 2, 3].map(g => `<i class="${4 - h.gr[i] >= g ? 'on' : ''}"></i>`).join('')}</span><small class="pgm-n">${STATS[i]}</small></button>`;
  };
  const why = `<p class="pgm-x">${pgWhy(sel, h.gr[sel], sel === main, add[sel])}</p>`;
  /* атрибуты боя: столбцами «Нападение» и «Защита» (§33.2) — те же числа, что у карты героя в бою */
  const u = typeof heroUnit === 'function' ? heroUnit(h) : null, A = u ? Object.fromEntries(attrList(u)) : null;
  const col = (t, keys) => `<div class="pgm-c"><span class="eyebrow">${t}</span>${keys.map(k => `<div class="pgm-a">${ICON(k, PG_VIEW.attr, ATTR_T[k])}<span>${ATTR_T[k]}</span><b class="num">${A[k]}</b></div>`).join('')}</div>`;
  const at = A ? `<div class="pgm-at">${col('Нападение', PG_ATK(u))}${col('Защита', PG_DEF)}</div>` : '';
  return `<div class="pgm scroll" data-keep="pgm:${h.id}">${bm}<div class="pgm-st" role="group" aria-label="Характеристики">${st.map(cell).join('')}</div>${why}${at}
    ${TM('<p class="reason">§3.2, §33.2: характеристики — heroSt (доблесть +30 % за ступень), прибавка снаряжения — eqStatAdd; атрибуты — карта ядра героя (heroUnit, attrList); мощь — BM.parts: основа × талисманы × снаряжение.</p>')}</div>`;
}

/* ================== действия ================== */
Object.assign(ACT, {
  /* характеристика на странице «Мощь»: строка под ними объясняет её */
  pgst(v) { const i = +v; if (!Number.isInteger(i) || i < 0 || i >= STATS.length) return; S.pg.st = i; render(); },
});
/* смена вкладки книги — время для проступания страницы; остальное — прежняя ACT.seg */
{
  const seg0 = ACT.seg;
  ACT.seg = function (v, t) {
    const k = String(v || '').split(':')[0];
    if ((k === 'hero' || k === 'rhero') && S.pg) S.pg.at = { k, t0: pgNow() };
    return seg0.call(this, v, t);
  };
}

/* листы и окна поверх раскрытой книги (предел, доблесть, «Сведения», «Свойства и сравнение», «Где взять дух»…) — тем же пергаментом:
   слой книги рисуется первым (hbLayer, screens/book.js), за ним — лист; листу или окну — класс темы .pg (book-pages.css) */
{
  const ov0 = overlay;
  overlay = function () {
    const x = ov0();
    return x.startsWith('<div class="hb-win') ? x.replace(/(<(?:aside|div) class="(?:sheet|dlg))(?=[\s"])/, '$1 pg') : x;
  };
}

/* ================== состояние ================== */
function pgState(s) { s.pg = { st: null, at: null }; return s; }
const pgInitBase = initialState;
initialState = function () { return pgState(pgInitBase()); };
pgState(S);

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Книга · навыки на странице', 'Способности видно сразу: значок в рамке своего вида, имя, вид и доблесть открытия, доля хода и описание; закрытые приглушены; сверху — доли хода',
    () => { S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.hgrid = 'own'; S.selHero = 'h3'; S.seg.hero = 'skills'; S.overlay = null; }],
  ['Книга · мощь героя', 'Характеристики и атрибуты — на странице книги: мощь и из чего она, пять характеристик со степенью роста, нажатие объясняет характеристику',
    () => { S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.hgrid = 'own'; S.selHero = 'h2'; S.seg.hero = 'stats'; S.pg.st = null; S.overlay = null; }],
  ['Книга · снаряжение по местам', 'Места в рамках редкости: пустое показывает, что туда кладут, лучшее в запасах — стрелкой; внизу — «Надеть лучшее»',
    () => { S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.hgrid = 'own'; S.selHero = 'h1'; S.seg.hero = 'gear'; S.overlay = null; }],
  ['Книга · главы читаются', 'Открытые главы — целиком, с буквицей; закрытые — заголовком и доблестью, на которой откроются',
    () => { S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.hgrid = 'own'; S.selHero = 'h2'; S.seg.hero = 'path'; S.overlay = null; }],
);

/* ================== UI-кит: раздел «Страницы книги героя» ==================
   Правая страница книги отдельно, в её размере: каждая вкладка героя аккаунта, книга «до покупки», закладки, рамки значков по виду,
   места снаряжения — пустое, надетое, лучшее в запасах; команде — откуда арт и числа */
KIT_EXTRA.push({ html: pgKitHtml });
function pgKitHtml() {
  const h = H('h3') || S.heroes[0]; if (!h || typeof heroDetail !== 'function') return '';
  const noop = x => x.replace(/data-a="[^"]*"/g, 'data-a="noop"');
  const seg0 = S.seg.hero, page = t => { S.seg.hero = t; const x = noop(heroDetail(h, { head: false, cls: 'hb-hd' })); return x; };
  const tabs = [['power', 'Развитие'], ['stats', 'Мощь'], ['gear', 'Снаряжение'], ['skills', 'Навыки'], ['path', 'Путь']];
  const pages = tabs.map(([k, l]) => `<figure class="pgk-f"><div class="pgk-p"><div class="hb-rp pg">${page(k)}</div></div><figcaption><b>${l}</b>${PG_KIT[k]}</figcaption></figure>`).join('');
  S.seg.hero = seg0;
  const rh = RS.heroes.find(x => x.src === 'gold' && x.c === rsCyc() && !rsHas(x)) || RS.heroes.find(x => x.src === 'gold');
  const pre = rh && typeof hcPreBody === 'function' ? (() => { const s0 = S.seg.rhero; S.seg.rhero = 'skills'; const x = noop(hcPreBody(rh)); S.seg.rhero = s0; return `<figure class="pgk-f"><div class="pgk-p"><div class="hb-rp pg">${x}<div class="hb-f">${noop(hcGoldFoot(rh))}</div></div></div><figcaption><b>До покупки</b>${PG_KIT.pre}</figcaption></figure>`; })() : '';
  const kinds = [['act', 'Активная'], ['ult', 'Ульта'], ['pas', 'Пассивка'], ['react', 'Реакция']];
  const lib = EB.lib(), ab = id => lib[id] || null, ids = { act: 'Огонь.dmg.grp', ult: 'Огонь.ult.dmg', pas: 'Огонь.pas.1', react: 'Огонь.react.1' };
  const icon = k => { const a = ab(ids[k]) || Object.values(lib).find(x => x.t === k) || null; return (a && typeof abArt === 'function' && abArt(a, 40)) || ic('spark'); };
  const frames = kinds.map(([k, n]) => `<figure class="pgk-fr"><span class="pg ab" data-k="${k}"><span class="ab-ic">${icon(k)}</span></span><figcaption>${n}</figcaption></figure>`).join('');
  return `<section class="k-box pgk" style="grid-column:1/-1" id="kitPages"><h3>Страницы книги героя</h3>
    <p class="k-note">Внутри книги — тот же язык, что снаружи: правая страница — лист чернёного пергамента, вклеенный в страницу книги (материал карточки «Ремесла»), сведения — белилами и золотом, рубрики — киноварью, главы — с буквицей; кнопки — кожа и латунь, главная — с кристаллом карста; вкладки — кожаные закладки над листом. Контраст текста — не ниже 4,5 : 1. Одно главное действие на вкладке — внизу справа, под большим пальцем; главное видно сразу, без нажатий.</p>
    <div class="pgk-row">${pages}${pre}</div>
    <p class="k-note">Рамка значка способности — её вид: активная — железо, ульта — старое золото, пассивка — круг, реакция — ржавая кромка. Закрытая доблестью — приглушена, с замком.</p>
    <div class="pgk-row">${frames}</div>
    ${TM(`<p class="k-note">Слово автора 30.09.2026 — «внутри осталось всё по-старому, не порядок». Страницы — screens/book-pages.js и book-pages.css; вкладки героя — heroDetail (index.html), «до покупки» — hcPreBody (screens/heroes.js); «Навыки» — heroKitHtml и abRow (index.html), «Путь» — hrPath и rsChaptersHtml, места — eqRow и talRow, «Развитие» — hdPower. Арт — tools/art-gen/jobs/hero-book-pages.json, выгружено ${PG_ART.ready.length} путей (PG_ART.ready); без пути рисует CSS. Проверка — tools/content-gen/screens/check_hero_book.js.</p>`)}
  </section>`;
}
/* подписи страниц в UI-ките */
const PG_KIT = {
  power: 'путь уровня с воротами пределов и звездой доблести; карточка шага — что станет с героем: мощь и атрибуты «было → станет» (числа ядра), характеристики тихой строкой (ведёт на «Мощь»); внизу — «сколько за раз» и главная кнопка с ценой справа',
  stats: 'мощь и из чего она, пять характеристик со степенью роста; нажатие объясняет характеристику строкой; атрибуты «Нападение» и «Защита»',
  gear: 'места — гнёзда в листе: надетое — в рамке со светом редкости, пустое — бледный силуэт и имя места, лучшее в запасах — стрелка; внизу справа — «Надеть лучшее»',
  skills: 'доли хода полосой; способности — значок в рамке вида, имя, вид и доблесть, доля хода и описание сразу; закрытые приглушены',
  path: 'открытые главы — целиком, с буквицей; закрытые — заголовком и доблестью; орден — в конце',
  pre: 'до покупки — «Герой», «Мощь», «Навыки», «Путь» и одно действие внизу: купить или пробудить',
};
