/* Автопроверка страниц раскрытой книги героя (design/ui/screens/book-pages.js, book-pages.css) — без браузера.
   Слово автора 30.09.2026: «хочу чтобы ты продумал UI и UX всего внутри карточки героя, чтобы было удобно для игрока, те же способности
   нужно нажимать чтобы их читать это странно… мы перешли с заглушек на красивый визуал а внутри осталось всё по-старому, не порядок».
   1. Файлы: index.html подключает book-pages.css после book.css и library.css, book-pages.js — после book.js и library.js; концы строк —
      CRLF; числа вида PG_VIEW — целые; ключевые кадры — только transform и opacity; при «меньше движения» страница не проступает.
   1а. Арт страниц PG_ART: выгруженный путь — файл в assets/art; окна рамок, срезы и полосы — целые; класс у <html> — ровно когда
      выгружен весь рисунок правила html.pg-* (закладки — парой); переменные рисунка ставит pgArtVars; без арта — всё рисует CSS.
   2. Правая страница — лист чернёного пергамента, вклеенный в страницу книги (слово автора 30.09.2026: «В открытой книге героя, не
      хватает тёмной подложки»): слой .hb-rp.pg::before под сведениями — от низа закладок до полосы обреза, текстура — PG_ART.img.vel;
      без шапки (тема .pg). Контраст: каждый цвет текста темы (--pg-ink, --pg-ink2, --pg-ink3, --pg-red, --pg-gold, --pg-teal, --pg-up,
      --pg-down, --amber) к самому светлому тону листа --pg-hi — не ниже 4,5 : 1. Закладки героя аккаунта — «Развитие», «Мощь»,
      «Снаряжение», «Навыки», «Путь», выбранная — одна; из книги не открывается прежний лист «Характеристики»; на страницах своего
      героя нет свёрнутого текста (<details>).
   3. «Развитие»: строка «уровень · предел · доблесть» — числа героя; тихая строка характеристик ведёт на «Мощь»; главная кнопка шага —
      последней в карточке, у правого края, внизу страницы (слово автора 30.09.2026: «кнопка не удобна для большого пальца правой руки»),
      не ниже 44 px, с ценой (раздел 12а — каскадом).
   4. «Мощь»: боевая мощь — BM.hero, основа и слои вещей — BM.parts; пять характеристик — heroSt и прибавка снаряжения, степень роста —
      по h.gr, главная отмечена; строка под ними объясняет главную, нажатие — выбранную; атрибуты «Нападение» и «Защита» — attrList
      карты героя в бою.
   5. «Снаряжение»: над каждой группой — рубрика («Снаряжение», «Талисманы») с мощью от группы; девять мест одной сеткой по порядку
      мест (EQD.rules.slots), четыре места талисманов рядом; пустое место — бледный рисунок своего места, имя места и подсказка
      «нажмите»; надетое — рамка редкости и главное значение; стрелка «есть лучше» — ровно у мест плана «Надеть лучшее» (grPlanOf);
      низ одной строкой — «Все вещи» и главная кнопка с прибавкой мощи, без лучшего — «Лучше в запасах нет» и окно; одна главная
      кнопка; в цикле I — места закрыты с причиной.
   6. «Навыки» — описание видно без нажатия: у каждой способности набора — значок в рамке своего вида (data-k), имя, вид, доблесть
      открытия, доля хода и описание абзацем, не в <details>; закрытая доблестью — приглушена, «откроется на доблести N»; полоса долей
      хода — сегмент на каждую открытую способность и ульту и обычная атака, в сумме 100 %; стили не прячут описание (display:none,
      visibility, line-clamp, нулевая высота, прозрачность). Так же у книги «до покупки» и у героя без набора.
   7. «Путь» — главы читаются в книге: открытые — целиком, каждый абзац, первый с буквицей; закрытые — заголовок и «откроется на
      доблести N», ни слова их текста; орден — в конце.
   8. Книга «до покупки»: «Герой» (история целиком с буквицей, личный максимум), «Мощь» (по базовым характеристикам, на 0 уровне),
      «Навыки», «Путь» и одно действие; неизвестная душа — без закладок и сведений.
   9. Листы и окна, открытые из книги (предел, доблесть, «Сведения»), — класс темы .pg (тот же чернёный пергамент); окно снаряжения —
      тема .gw; карточка «Что изменилось» — .pg; лист не поверх книги — прежний.
   10. Смена вкладки: страница проступает — время от нажатия, после показа класса нет; «меньше движения» — сразу.
   11. Режим «Игрок»: служебного нет (SERVICE из check_player_view.js); режим «Команда» рисуется.
   12. Вёрстка — расчётом размеров на 932 × 430 и 844 × 390: правая страница разворота каждой ступени — поля .hb-rp и полоса обреза
      внизу (торцы листов, HB_ART.spreads[ступень].e: по ней не пишут), закладки над краем; закладки в ширину страницы (героя и «до
      покупки»); «Мощь» — мощь, характеристики, строка и атрибуты; «Снаряжение» — рубрика, три ряда мест и талисманы рядом, низ одной
      строкой; «Навыки» — полоса долей и первая способность с описанием видны сразу, имени способности хватает места; «Путь» и
      «Герой» — первая глава и история начинаются на странице; у книги «до покупки» — низ одной строкой: пояснение и кнопка с ценой.
   12а. Каскад стилей на разметке страниц, на обоих экранах (css_cascade.js — как в браузере: специфичность, порядок, @media,
      @container, var(); сверено с getComputedStyle безголового Chrome): раскладку «Снаряжения» решает только book-pages.css —
      свойства вёрстки, которые задаёт страница, не перебивает ни одно правило других стилей, и никакое чужое правило не трогает
      места через обёртки страницы (.hd-gear, .hb-hd, .hb-rp…); у места высота — по содержимому, ширина — --pg-slot, подпись видна,
      стрелка «есть лучше» — внутри рамки (закладки её не закрывают), рубрика — над сеткой, низ «Снаряжения» — у нижнего края страницы;
      цвет текста на страницах (число характеристики «Мощи», строки превью «Развития», описание способности, текст главы, подписи
      мест, пояснение «до покупки») — из темы и не ниже 4,5 : 1 к листу; «Развитие»: карточка шага — во всю высоту страницы, её низ —
      последним, главная кнопка — последней в нём, у правого края, не ниже 44 px; кнопка с ценой внизу книги «до покупки» не сжимается.
   13. UI-кит «Страницы книги героя» и сценарии презентации рисуются.
   Запуск: node tools/content-gen/screens/check_hero_book.js [--dump] — --dump печатает правую страницу каждой вкладки */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const DUMP = process.argv.includes('--dump');
const err = [], lay = [];
const cnt = { pages: 0, player: 0, abilities: 0, chapters: 0, slots: 0, layout: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Страницы книги героя: страниц ${cnt.pages}, из них глазами игрока ${cnt.player}; способностей с описанием ${cnt.abilities}, глав ${cnt.chapters}, мест ${cnt.slots}; расчётов вёрстки ${cnt.layout}; сверок контраста ${cnt.contrast || 0}.`);
  for (const x of lay) console.log('вёрстка ' + x);
  console.log('Проверка пройдена: страницы книги — белилами и золотом по листу чернёного пергамента, контраст текста не ниже 4,5 : 1; закладки «Развитие», «Мощь», «Снаряжение», «Навыки», «Путь»; главная кнопка шага — внизу справа, не ниже 44 px; описание способности видно без нажатия; характеристики и атрибуты — на странице; места — гнёзда, пустое говорит, что туда кладут; главы читаются целиком; листы поверх книги — тем же чернёным пергаментом; всё помещается на 932 × 430 и 844 × 390.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const JS = read('screens/book-pages.js'), CSS = read('screens/book-pages.css'), BCSS = read('screens/book.css');
{
  const iS = src => scripts.findIndex(s => s.src === src);
  if (iS('screens/book-pages.js') < 0) say('index.html: не подключён screens/book-pages.js');
  else for (const f of ['screens/book.js', 'screens/library.js', 'screens/heroes.js', 'screens/hero-dev.js']) if (iS(f) < 0 || iS(f) > iS('screens/book-pages.js')) say(`index.html: book-pages.js подключён раньше ${f}`);
  const iC = f => html.indexOf(`<link rel="stylesheet" href="${f}">`);
  if (iC('screens/book-pages.css') < 0) say('index.html: не подключён screens/book-pages.css');
  else for (const f of ['screens/book.css', 'screens/library.css', 'screens/hero-dev.css', 'screens/heroes.css']) if (iC(f) < 0 || iC(f) > iC('screens/book-pages.css')) say(`index.html: book-pages.css подключён раньше ${f} — его правила страницы перебьют`);
  for (const [f, t] of [['screens/book-pages.js', JS], ['screens/book-pages.css', CSS]]) {
    const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
    if (crlf !== lf) say(`${f}: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}`);
  }
  try { new vm.Script(JS, { filename: 'screens/book-pages.js' }); } catch (e) { say('screens/book-pages.js: синтаксис — ' + e.message); }
  const view = JS.match(/const PG_VIEW = \{[\s\S]*?\n\};/);
  if (!view) say('book-pages.js: нет блока PG_VIEW');
  else { const f = view[0].replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').match(/\d+\.\d+/g); if (f) say(`book-pages.js: в PG_VIEW дробные числа ${f.join(', ')}`); }
  for (const [, n, b] of CSS.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
    const bad = [...b.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]).filter(p => !['transform', 'opacity'].includes(p));
    if (bad.length) say(`book-pages.css: @keyframes ${n} меняет ${[...new Set(bad)].join(', ')} — только transform и opacity`);
  }
  const rm = (CSS.match(/@media \(prefers-reduced-motion:reduce\)\{([\s\S]*?)\n\}/) || [])[1] || '';
  if (!/\.pg-b\.pg-in\{animation:none\}/.test(rm)) say('book-pages.css: при «меньше движения» страница проступает');
  /* правая страница — поле .hb-rp в странице разворота (book.css, без своей подложки); лист чернёного пергамента под сведениями —
     слой .hb-rp.pg::before в book-pages.css: от низа закладок до полосы обреза, чуть шире поля; текстура — PG_ART.img.vel */
  if (!/\n\.hb-rp\{position:absolute;inset:\d+px \d+px \d+px \d+px;/.test(BCSS) || /\n\.hb-rp\{[^}]*background/.test(BCSS)) say('book.css: правая страница — не поле .hb-rp{inset:…} без своей подложки');
  if (!/\.pg,\.gw\{--pg-ink:/.test(CSS)) say('book-pages.css: нет темы страницы .pg и окна снаряжения .gw');
  const sheet = (CSS.match(/\n\.hb-rp\.pg::before\{([^}]*)\}/) || [])[1] || '';
  if (!/position:absolute/.test(sheet) || !/z-index:-1/.test(sheet) || !/background:[^;]*var\(--pg-page\)/.test(sheet) || !/top:var\(--pg-sh,-?\d+px\)/.test(sheet)) say('book-pages.css: нет листа чернёного пергамента под сведениями (.hb-rp.pg::before: слой под текстом, тон --pg-page, верх — --pg-sh)');
  if (!/\nhtml\.pg-vel \.hb-rp\.pg::before\{[^}]*var\(--pg-vel\)/.test(CSS)) say('book-pages.css: лист без текстуры чернёного пергамента (html.pg-vel … var(--pg-vel))');
  const sh = +((CSS.match(/\n\.hb-rp\.pg:has\(\.pg-tabs\)\{--pg-sh:(\d+)px\}/) || [])[1] || NaN), th = CSS.match(/\.pg-tabs\{[^}]*height:(\d+)px;margin-top:-(\d+)px/);
  if (!th || sh !== +th[1] - +th[2]) say(`book-pages.css: лист начинается не под закладками (--pg-sh ${sh}, закладки кончаются на ${th ? +th[1] - +th[2] : '?'} px)`);
  /* контраст: цвет текста темы к самому светлому тону листа (--pg-hi) — не ниже 4,5 : 1 (WCAG 2.x, относительная яркость) */
  const theme = (CSS.match(/\.pg,\.gw\{(--pg-ink:[\s\S]*?)\}/) || [])[1] || '', tok = k => ((theme.match(new RegExp(`(?:^|;)\\s*${k}:(#[0-9a-f]{6})`, 'i')) || [])[1] || '');
  const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hi = tok('--pg-hi'), page = tok('--pg-page');
  if (!hi || !page || lum(hi) < lum(page)) say('book-pages.css: у темы нет тона листа --pg-page и самого светлого его тона --pg-hi');
  else for (const k of ['--pg-ink', '--pg-ink2', '--pg-ink3', '--pg-red', '--pg-gold', '--pg-teal', '--pg-up', '--pg-down', '--amber']) {
    const c = tok(k); cnt.contrast = (cnt.contrast || 0) + 1;
    if (!c) say(`book-pages.css: у темы нет цвета ${k}`);
    else if (ratio(c, hi) < 4.5) say(`book-pages.css: ${k} ${c} к листу ${hi} — контраст ${ratio(c, hi).toFixed(2)} : 1, ниже 4,5 : 1`);
  }
}
if (err.length) done();

/* ================== песочница ================== */
function load(o = {}) {
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, prepend() {}, remove() {},
      animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, select() {}, clientWidth: 1200, clientHeight: 800 };
    e.querySelector = () => stubEl();
    return e;
  };
  const rootCls = new Set(), rootVars = new Map(), root = stubEl('html');
  root.style = { setProperty: (k, v) => { rootVars.set(k, v); }, removeProperty: k => { rootVars.delete(k); } };
  root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
  const els = {};
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null, baseURI: 'file:///ui/index.html' };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  let now = 0;
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    matchMedia: q => ({ matches: !!o.reduced && /reduce/.test(q), addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => now }, URL };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    if (s.src && !fs.existsSync(path.join(UI, s.src))) continue;
    /* o.noArt — арт страниц ещё не выгружен: PG_ART.ready пуст */
    const code = s.src ? read(s.src) : s.code, src = o.noArt && s.src === 'screens/book-pages.js' ? code.replace(/(\n  ready: )\[[\s\S]*?\],/, '$1[],') : code;
    try { vm.runInContext(src, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, FLOWS, KH, KIT_EXTRA, H, EB, INV, BAG, BM, RS, RSI, render, initialState, setTeam, fmt, ROMAN, RAR, STATS, STAT_HINT, GRADE, ATTR_T,
    heroSt, heroUnit, attrList, heroKit, hrMine, hrBuild, hrBaseBm, hrDraft, hrTwin, rsCyc, rsHas, rsChTitle, pctBp,
    PG_VIEW, PG_ART, pgStats, pgTabs, pgKitHtml, heroDev, grPlanOf, eqStatAdd, eqItem, eqNum, eqPct, EQ_SRV, TL_SRV, TB, tlEq, tlWhy, tlR,
    EQD: window.EN_EQUIPMENT, TL: window.EN_TALISMANS, HB_VIEW, HB_ART,
  })`, ctx);
  return { T, rootCls, rootVars, tick: ms => { now += ms; }, game: () => (els.game ? els.game.innerHTML : '') };
}
const P = load(), T = P.T;

/* ================== 1а. арт страниц PG_ART ==================
   Выгруженный путь — файл в assets/art; окна рамок, срезы и полосы — целые ‰ и px; класс у <html> — ровно когда выгружен весь рисунок
   правила html.pg-* (закладки — парой: обычная и выбранная); переменные рисунка из стилей ставит pgArtVars. Без арта — всё рисует CSS */
{
  const A = T.PG_ART, known = new Set([...Object.keys(A.frames).map(A.frame), ...Object.values(A.img)]);
  for (const p of A.ready) {
    if (!known.has(p)) say(`PG_ART.ready: ${p} — такого рисунка страницы нет (frames, img)`);
    if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`PG_ART.ready: ${p} — файла нет в assets/art, будет битая картинка`);
  }
  for (const [k, f] of Object.entries(A.frames)) {
    const [x0, y0, x1, y1] = f.win || [];
    if (![x0, y0, x1, y1, f.over].every(Number.isInteger) || !(x0 >= 0 && x0 < x1 && x1 <= 1000 && y0 >= 0 && y0 < y1 && y1 <= 1000 && f.over >= 0 && f.over < 500)) say(`PG_ART.frames.${k}: окно рамки или заход — не целые ‰ холста`);
  }
  for (const k of Object.keys(A.slice)) {
    if (!A.wide[k] || A.slice[k].length !== 4 || A.wide[k].length !== 4) say(`PG_ART.slice.${k}: срезов и полос border-image — не по четыре`);
    for (const v of [...A.slice[k], ...(A.wide[k] || [])]) if (!Number.isInteger(v) || v < 0 || v > 1000) say(`PG_ART.slice/wide.${k}: ${v} — не целое`);
  }
  const need = c => c === 'pg-f' ? ['act', 'ult', 'pas', 'react'].map(A.frame) : c === 'pg-ft' ? [A.frame('tal')] : c === 'pg-fc' ? [A.frame('cap')]
    : c === 'pg-tab' ? [A.img.tab, A.img['tab-on']] : A.img[c.slice(3)] ? [A.img[c.slice(3)]] : null;
  const used = [...new Set([...CSS.matchAll(/html\.(pg-[a-z0-9-]+)/g)].map(m => m[1]))];
  if (!used.length) say('book-pages.css: нет правил рисунка html.pg-*');
  for (const c of used) {
    const n = need(c);
    if (!n) say(`book-pages.css: html.${c} — рисунка с таким классом в PG_ART нет`);
    else if (n.every(p => A.ready.includes(p)) !== P.rootCls.has(c)) say(`html.${c}: класс у <html> ${P.rootCls.has(c) ? 'стоит, а рисунок выгружен не весь' : 'не ставится, а рисунок выгружен'}`);
  }
  for (const [, v] of CSS.matchAll(/var\((--pg-(?:fi?-[a-z]+|tab|tab-on|btn2?|vel|gilt-[a-z]+|ink-[a-z]+|[a-z0-9]+-[sw]))\)/g)) if (!P.rootVars.has(v)) say(`book-pages.css: переменной ${v} pgArtVars не ставит`);
  for (const [k, v] of P.rootVars) if (/^--pg-fi-/.test(k) && !/^(-?\d+(\.\d)?% ){3}-?\d+(\.\d)?%$/.test(v)) say(`${k}: поля рамки «${v}» — не четыре доли`);
  const Q = load({ noArt: true });
  const left = [...Q.rootCls].filter(c => c.startsWith('pg-')), urls = [...Q.rootVars].filter(([k, v]) => k.startsWith('--pg-') && /url\(/.test(v)).map(([k]) => k);
  if (left.length || urls.length) say(`без арта страниц у <html> остаются ${[...left, ...urls].join(', ')} — CSS рисовал бы пустые картинки`);
}
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
const count = (s, re) => (s.match(re) || []).length;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
function scan(h, where) {
  cnt.pages++;
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!T.KH.team) {
    cnt.player++;
    const v = strip(h), txt = playerText(h).split('\n').concat(tips(v));
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
  }
  return h;
}
const view = where => { run(where, () => T.render()); return scan(P.game(), where); };
const fresh = () => { T.S = T.initialState(); T.S.overlay = null; T.S.wallet.spirit = 1e9; T.S.hb.anim = null; };
/* правая страница книги: от <div class="hb-rp pg"> до конца её секции */
const pageOf = h => { const i = h.indexOf('<div class="hb-rp pg">'); return i < 0 ? '' : h.slice(i, h.indexOf('</section>', i)); };
const winOf = h => { const i = h.indexOf('<div class="hb-win'); return i < 0 ? '' : h.slice(i); };
const ovOf = h => { const i = h.indexOf('<div class="ov'); return i < 0 ? '' : h.slice(i); };
const book = (hid, tab) => { T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.hgrid = 'own'; T.S.selHero = hid; T.S.seg.hero = tab; T.S.overlay = null; T.S.hb.anim = null; };
const TABS = [['power', 'Развитие'], ['stats', 'Мощь'], ['gear', 'Снаряжение'], ['skills', 'Навыки'], ['path', 'Путь']];
const dump = (t, p) => { if (DUMP) console.log(`\n===== ${t} =====\n` + p.replace(/></g, '>\n<')); };

/* ================== 2–7. страницы героя аккаунта ================== */
function checkTabs(p, key, list, cur, where) {
  const nav = (p.match(/<nav class="pg-tabs"[\s\S]*?<\/nav>/) || [''])[0];
  const got = [...nav.matchAll(/<button class="pg-bmk" role="tab" aria-selected="(true|false)" data-a="seg" data-v="([a-z]+):([a-z]+)"[^>]*>([^<]*)/g)];
  if (got.length !== list.length || got.some((m, i) => m[2] !== key || m[3] !== list[i][0] || m[4] !== list[i][1])) say(`${where}: закладки ${got.map(m => m[4]).join(', ') || 'нет'} — ждали ${list.map(x => x[1]).join(', ')}`);
  const sel = got.filter(m => m[1] === 'true');
  if (sel.length !== 1 || sel[0][3] !== cur) say(`${where}: выбрана закладка ${sel.map(m => m[3]).join(', ') || 'никакая'}, ждали ${cur}`);
}
/* описание способности видно без нажатия: абзац .ab-x в строке способности, не внутри <details> */
function visibleText(p, text) {
  const i = p.indexOf(text); if (i < 0) return false;
  const before = p.slice(0, i), opens = count(before, /<details\b/g), closes = count(before, /<\/details>/g);
  return opens === closes;
}
function checkSkills(p, pseudo, where) {
  const K = T.heroKit(pseudo), L = T.EB.lib();
  if (!K) return;
  if (/<details\b/.test(p)) say(`${where}: на странице «Навыки» свёрнутый текст — описание прячется за нажатием`);
  const rows = [...p.matchAll(/<div class="ab( lock)?" data-k="([a-z]+)"><span class="ab-ic">([\s\S]*?)<\/span><div class="ab-t"><div class="ab-n"><b>([\s\S]*?)<\/b>([\s\S]*?)<\/div>(?:<small class="ab-k">([^<]*)<\/small>)?(?:<p class="ab-x">([\s\S]*?)<\/p>)?<\/div><\/div>/g)];
  const kit = rows.filter(r => r[2] !== 'basic');
  if (kit.length !== K.kit.length) { say(`${where}: способностей на странице ${kit.length}, в наборе ${K.kit.length}`); return; }
  const KIND = { act: 'Активная', ult: 'Ульта', pas: 'Пассивка', react: 'Реакция' };
  K.kit.forEach((x, i) => {
    const r = kit[i], a = L[x.id] || { n: x.id, d: '' }, on = x.v <= pseudo.valor; cnt.abilities++;
    if (r[2] !== x.slot) say(`${where}: «${a.n}» — рамка вида ${r[2]}, ждали ${x.slot}`);
    if (!r[4].includes(esc(a.n)) && !r[4].includes(a.n)) say(`${where}: нет имени «${a.n}»`);
    if (a.d && (r[7] || '') !== a.d) say(`${where}: «${a.n}» — описание не видно на странице (ждали «${a.d.slice(0, 40)}…»)`);
    if (a.d && !visibleText(p, `<p class="ab-x">${a.d}</p>`)) say(`${where}: «${a.n}» — описание внутри свёрнутого блока`);
    const when = !x.v ? 'есть сразу' : on ? `доблесть ${x.v}` : `откроется на доблести ${x.v}`;
    if ((r[6] || '') !== `${KIND[x.slot]} · ${when}`) say(`${where}: «${a.n}» — вид и доблесть «${r[6] || ''}», ждали «${KIND[x.slot]} · ${when}»`);
    if (!!r[1] === on) say(`${where}: «${a.n}» — ${on ? 'открытая приглушена' : 'закрытая не приглушена'}`);
    if (!on && !/<span class="ab-sh lock"[^>]*>[\s\S]*?доблесть \d+<\/span>/.test(r[5])) say(`${where}: «${a.n}» — у закрытой нет «доблесть ${x.v}» вместо доли хода`);
    if (on && !/<span class="ab-sh[^"]*"[^>]*>(?:\d+ %|шанс \d+ %|всегда)<\/span>/.test(r[5])) say(`${where}: «${a.n}» — у открытой нет доли хода, шанса или «всегда»`);
    if (!/<img class="ico ab-art/.test(r[3]) && !/<svg class="i/.test(r[3])) say(`${where}: «${a.n}» — нет значка`);
  });
  if (rows.length !== K.kit.length + 1 || rows[rows.length - 1][2] !== 'basic') say(`${where}: нет строки «Обычная атака» в конце`);
  /* полоса долей хода: сегменты — открытые способности и ульта с долей и обычная атака; в сумме 100 % */
  const bar = (p.match(/<div class="ab-bar" role="img" aria-label="[^"]*">([\s\S]*?)<\/div>/) || [])[1];
  if (!bar) say(`${where}: нет полосы долей хода`);
  else {
    const segs = [...bar.matchAll(/<i class="([aub])"(?: data-el="[^"]*")? style="--w:(-?\d+)"/g)];
    const sum = segs.reduce((a, m) => a + +m[2], 0);
    if (sum !== 10000) say(`${where}: доли хода в сумме ${sum / 100} %, а не 100 %`);
    if (!segs.length || segs[segs.length - 1][1] !== 'b') say(`${where}: полоса долей без обычной атаки в конце`);
    const open = K.kit.filter(x => x.v <= pseudo.valor && (x.slot === 'act' || x.slot === 'ult'));
    if (segs.filter(m => m[1] !== 'b').length > open.length) say(`${where}: в полосе долей больше сегментов, чем открытых способностей и ульт`);
  }
}
function checkPath(p, rh, v, where) {
  if (/<details\b/.test(p)) say(`${where}: на странице «Путь» свёрнутый текст — глава прячется за «ещё»`);
  rh.chT.forEach((_, i) => {
    const no = i + 1, x = rh.ch && rh.ch[i], title = T.rsChTitle(rh, i); cnt.chapters++;
    if (!p.includes(`<b>${title}</b>`)) say(`${where}: нет заголовка главы «${title}»`);
    if (no <= v) {
      if (x && x[1].length) x[1].forEach((par, j) => {
        const s = String(par), want = j ? s : s.replace(/^([«"„(]?)([^\s«"„(])/, '$1<span class="dcap">$2</span>');
        if (!p.includes(`<p class="rs-p">${want}</p>`)) say(`${where}: глава ${no}, абзац ${j + 1} не целиком${j ? '' : ' или без буквицы'}`);
      });
    } else {
      if (!p.includes(`Откроется на доблести ${no}`)) say(`${where}: у закрытой главы ${no} нет «откроется на доблести ${no}»`);
      if (x && x[1].some(par => p.includes(String(par).slice(10, 70)))) say(`${where}: текст закрытой главы ${no} виден — спойлер`);
    }
  });
  if (!/<h3 class="pg-h">Орден<\/h3>/.test(p)) say(`${where}: нет раздела «Орден» в конце`);
}
fresh();
{
  const heroes = T.hrMine();
  if (heroes.length < 10) say(`героев аккаунта ${heroes.length} — демо должно давать больше`);
  for (const h of heroes) for (const [tab, name] of TABS) {
    book(h.id, tab);
    const g = view(`книга · ${h.name} · ${name}`), w = winOf(g), p = pageOf(g);
    if (!p) { say(`книга · ${h.name} · ${name}: нет правой страницы-пергамента (.hb-rp.pg)`); continue; }
    if (h === heroes[0] || h.id === 'h3') dump(`${h.name} · ${name}`, p);
    checkTabs(p, 'hero', TABS, tab, `книга · ${h.name} · ${name}`);
    if (/<header class="hb-h|class="hb-vit"|class="hd-top"/.test(p)) say(`книга · ${h.name}: на правой странице осталась шапка`);
    if (/data-v="hattr:/.test(w)) say(`книга · ${h.name} · ${name}: из книги открывается прежний лист «Характеристики»`);
    if (tab !== 'skills' && tab !== 'path' && /<details\b/.test(p)) say(`книга · ${h.name} · ${name}: свёрнутый текст на странице`);
    if (tab === 'power') {
      const sum = (p.match(/<p class="hdv-sum">([\s\S]*?)<\/p>/) || [])[1] || '', d = T.heroDev(h);
      for (const [v, of] of [[h.lvl, h.cap], [h.lim, d.top], [h.valor, h.maxV]]) if (!sum.includes(`<b class="num">${v}</b><small class="num">/ ${of}</small>`)) say(`книга · ${h.name}: в строке «уровень · предел · доблесть» нет «${v} / ${of}»`);
      if (!/<div class="hdv-quiet" data-a="seg" data-v="hero:stats"/.test(p)) say(`книга · ${h.name}: тихая строка характеристик не ведёт на «Мощь»`);
    }
    if (tab === 'stats') {
      const P2 = T.BM.parts(h), st = T.heroSt(h), add = T.eqStatAdd(h), main = h.gr.indexOf(1);
      if (!p.includes(`<b class="num">${T.fmt(P2.bm)}</b>`) || P2.bm !== T.BM.hero(h)) say(`книга · ${h.name} · «Мощь»: нет боевой мощи ${P2.bm}`);
      if (!p.includes(`основа <b class="num">${T.fmt(P2.base)}</b>`)) say(`книга · ${h.name} · «Мощь»: нет основы мощи ${P2.base}`);
      const cells = [...p.matchAll(/<button class="pgm-s( main)?" data-a="pgst" data-v="(\d)" aria-pressed="(true|false)"[^>]*>([\s\S]*?)<\/button>/g)];
      if (cells.length !== 5) say(`книга · ${h.name} · «Мощь»: характеристик ${cells.length}, ждали пять`);
      cells.forEach((c, i) => {
        if (!c[4].includes(`<b class="num">${st[i] + add[i]}</b>`)) say(`книга · ${h.name} · «Мощь»: ${T.STATS[i]} — нет числа ${st[i] + add[i]}`);
        if (count(c[4], /<i class="on"><\/i>/g) !== 4 - h.gr[i]) say(`книга · ${h.name} · «Мощь»: ${T.STATS[i]} — степень роста не ${4 - h.gr[i]} из 3`);
        if (!!c[1] !== (i === main)) say(`книга · ${h.name} · «Мощь»: главная характеристика отмечена не у ${T.STATS[main]}`);
        if (!c[4].includes(`<small class="pgm-n">${T.STATS[i]}</small>`)) say(`книга · ${h.name} · «Мощь»: у характеристики нет подписи ${T.STATS[i]}`);
      });
      if (!p.includes(`<p class="pgm-x"><b>${T.STATS[main]}</b> — ${T.STAT_HINT[main]}.`)) say(`книга · ${h.name} · «Мощь»: строка под характеристиками не объясняет главную`);
      const u = T.heroUnit(h);
      for (const [k, v] of T.attrList(u)) if (!p.includes(`<span>${T.ATTR_T[k]}</span><b class="num">${v}</b>`)) say(`книга · ${h.name} · «Мощь»: нет атрибута «${T.ATTR_T[k]}» ${v}`);
      if (!/<span class="eyebrow">Нападение<\/span>/.test(p) || !/<span class="eyebrow">Защита<\/span>/.test(p)) say(`книга · ${h.name} · «Мощь»: атрибуты не столбцами «Нападение» и «Защита»`);
    }
    if (tab === 'skills') checkSkills(p, h, `книга · ${h.name} · «Навыки»`);
    if (tab === 'path') { const rh = T.hrTwin(h); if (rh) checkPath(p, rh, h.valor, `книга · ${h.name} · «Путь»`); }
  }
  /* «Мощь»: нажатие на характеристику — строка объясняет её, выбранная — aria-pressed */
  fresh(); book('h1', 'stats');
  run('характеристика', () => T.ACT.pgst('4'));
  let p = pageOf(view('«Мощь» · нажата скорость'));
  if (!p.includes(`<p class="pgm-x"><b>${T.STATS[4]}</b> — ${T.STAT_HINT[4]}.`) || !/data-v="4" aria-pressed="true"/.test(p)) say('«Мощь»: нажатие на характеристику не объяснило её строкой');
  run('характеристика · вне', () => T.ACT.pgst('9')); if (T.S.pg.st !== 4) say('«Мощь»: номер характеристики вне пяти принят');
  /* прибавка снаряжения — у числа характеристики */
  const h1 = T.H('h1'), gl = Object.values(T.S.eq.items).find(it => !it.on && it.slot === 'hands');
  if (gl) {
    run('перчатки', () => T.EQ_SRV.put(`eq${T.S.eq.seq}`, 'h1', gl.uid));
    const add = T.eqStatAdd(h1); p = pageOf(view('«Мощь» · в перчатках'));
    const i = add.findIndex(x => x > 0);
    if (i < 0 || !p.includes(`<small class="eqd num">+${add[i]}</small>`)) say('«Мощь»: прибавка снаряжения не видна у числа характеристики');
    if (!/снаряжение <b class="num">\+/.test(p)) say('«Мощь»: слой снаряжения не назван у мощи');
  }
}

/* ================== 5. «Снаряжение»: места ================== */
fresh();
{
  const h = T.H('h1'), D = T.EQD;
  book('h1', 'gear');
  let p = pageOf(view('«Снаряжение» · всё пусто'));
  const eqRe = /<button class="eq-slot (on|none)( up)?"\s*(?:data-r="(\d)")? data-a="sheet" data-v="eq:([\w-]+):(\w+)"[^>]*title="([^"]*)"><span class="eq-w">([\s\S]*?)<\/span>(<i class="eq-up"[\s\S]*?<\/i>)?<small class="eq-cap[^"]*">([^<]*)<\/small><\/button>/g;
  const plan = T.grPlanOf(h), up = new Set(plan.eq.map(x => x.slot));
  let slots = [...p.matchAll(eqRe)];
  if (slots.length !== 9) say(`«Снаряжение»: мест ${slots.length}, ждали девять`);
  /* рубрики над группами, девять мест одной сеткой по порядку мест, талисманы — своей сеткой; подписей сбоку нет */
  if (!/<div class="eq-row"><p class="pg-rub"><span>Снаряжение<\/span>[\s\S]*?<\/p><div class="eq-slots">/.test(p)) say('«Снаряжение»: над местами нет рубрики «Снаряжение» — или она не перед сеткой');
  if (!/<div class="tl-row"><p class="pg-rub"><span>Талисманы<\/span>[\s\S]*?<\/p><div class="tl-slots">/.test(p)) say('«Снаряжение»: над талисманами нет рубрики «Талисманы» — или она не перед сеткой');
  if (/class="eq-lbl"/.test(p)) say('«Снаряжение»: подпись группы сбоку от мест (eq-lbl) — рубрика должна стоять над сеткой');
  if (slots.map(m => m[5]).join() !== D.rules.slots.join()) say(`«Снаряжение»: места не по порядку EQD.rules.slots — ${slots.map(m => m[5]).join(', ')}`);
  /* низ одной строкой: «Все вещи» и главная кнопка с прибавкой мощи */
  const foot0 = (p.match(/<div class="hdg-f">[\s\S]*?<\/div>/) || [''])[0];
  if (!/<button class="link hdg-all" data-a="dlg" data-v="gear:h1"[^>]*>Все вещи<\/button>/.test(foot0) || !new RegExp(`data-a="gearbest"[^>]*>Надеть лучшее<span class="cost num">▲${T.eqPct(plan.gain).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</span></button>`).test(foot0)) say('«Снаряжение»: внизу нет «Все вещи» и «Надеть лучшее» с прибавкой мощи на кнопке');
  for (const m of slots) {
    cnt.slots++;
    const [, st, u, , , slot, tip, pic, , cap] = m;
    if (st !== 'none') { say(`«Снаряжение»: у героя без вещей место ${slot} не пустое`); continue; }
    if (cap !== D.slots[slot].n) say(`«Снаряжение»: под пустым местом ${slot} — «${cap}», ждали имя места «${D.slots[slot].n}»`);
    if (!pic.includes(`gear/${slot}-1.webp`)) say(`«Снаряжение»: в пустом месте ${slot} нет бледного предмета своего места`);
    if (!/нажмите/.test(decode(tip))) say(`«Снаряжение»: подсказка пустого места ${slot} не говорит, как положить вещь`);
    if (!!u !== up.has(slot)) say(`«Снаряжение»: стрелка «есть лучше» у ${slot} ${u ? 'есть' : 'нет'}, а план «Надеть лучшее» ${up.has(slot) ? 'нашёл' : 'не нашёл'} вещь`);
  }
  /* надетое: рамка редкости, главное значение */
  const it = Object.values(T.S.eq.items).find(x => !x.on);
  run('надеть', () => T.EQ_SRV.put(`eq${T.S.eq.seq}`, 'h1', it.uid));
  p = pageOf(view('«Снаряжение» · надета вещь'));
  slots = [...p.matchAll(eqRe)];
  const on = slots.find(m => m[5] === it.slot);
  if (!on || on[1] !== 'on' || +on[3] !== it.r || on[9] !== T.eqNum(it.lines[0][0], it.lines[0][1]) || !on[7].includes(`gear/${it.slot}-${it.r}.webp`)) say('«Снаряжение»: надетая вещь — не в рамке своей редкости, не своя иконка или не главное значение');
  if (count(p, /class="btn go[ "]/g) !== 1) say(`«Снаряжение»: главных кнопок ${count(p, /class="btn go[ "]/g)}`);
  /* талисманы: четыре места, пустое — «талисман» */
  const tl = [...p.matchAll(/<button class="tl-slot (on|none)( up)?"[^>]*data-v="tal:[\w-]+:(\d)"[^>]*><span class="tl-w">[\s\S]*?<\/span>(?:<i class="eq-up"[\s\S]*?<\/i>)?<b class="tl-cap[^"]*">([^<]*)<\/b><\/button>/g)];
  if (tl.length !== 4) say(`«Снаряжение»: мест талисманов ${tl.length}`);
  const upT = new Set(T.grPlanOf(h).tal.map(x => x.i));
  for (const m of tl) { cnt.slots++; if (m[1] === 'none' && m[4] !== 'талисман') say('«Снаряжение»: под пустым местом талисмана нет «талисман»'); if (!!m[2] !== upT.has(+m[3])) say(`«Снаряжение»: стрелка у места талисмана ${+m[3] + 1} не совпадает с планом`); }
  /* всё лучшее надето — так и сказано, главное действие — окно снаряжения */
  run('лучшее', () => T.ACT.gearbest(`gr${T.S.gear.seq}:h1`)); T.S.overlay = null;
  const pb = pageOf(view('«Снаряжение» · лучшее надето')), fb = (pb.match(/<div class="hdg-f">[\s\S]*?<\/div>/) || [''])[0];
  if (!/<span class="reason">Лучше в запасах нет<\/span>/.test(fb) || !/<button class="btn go sm" data-a="dlg" data-v="gear:h1">Открыть снаряжение<\/button>/.test(fb)) say('«Снаряжение»: без лучшего в запасах низ не говорит этого и не ведёт в окно');
  /* цикл I: места закрыты с причиной */
  T.S.acc.cycle = 1; p = pageOf(view('«Снаряжение» · цикл I'));
  if (!/eq-row shut[\s\S]*Откроется во втором цикле/.test(p) || !/tl-row shut[\s\S]*Откроются во втором цикле/.test(p)) say('«Снаряжение» в цикле I: места не закрыты с причиной');
}

/* ================== 6. «Навыки»: разные доблести, герой без набора, стили ================== */
{
  /* герой с большим набором: все закрыты, кроме первой; все открыты */
  const big = T.RS.heroes.filter(x => { const K = T.heroKit({ draft: T.hrDraft(x) }); return K && K.kit.length >= 5; }).slice(0, 3);
  if (!big.length) say('«Навыки»: в составе нет героя с набором из пяти способностей');
  for (const rh of big) for (const v of [0, rh.maxV]) {
    fresh(); T.S.acc.cycle = 6; T.S.rs.cyc = 6; T.S.rs.shards[rh.id] = T.RS.rules.stub.shards;
    T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'rs'; T.S.rs.sel = rh.id; T.S.seg.rhero = 'skills'; T.S.rs.val = { id: rh.id, v };
    const p = pageOf(view(`до покупки · ${rh.n} · «Навыки» · доблесть ${v}`));
    checkSkills(p, { draft: T.hrDraft(rh), valor: v }, `до покупки · ${rh.n} · доблесть ${v}`);
    if (v === 0) dump(`${rh.n} · «Навыки» · доблесть 0`, p);
  }
  /* герой без набора из распределения (прежняя библиотека ядра): описание тоже сразу видно */
  fresh(); const h = T.S.heroes[0], draft = h.draft; h.draft = 'нет-набора';
  book(h.id, 'skills'); const p = pageOf(view('«Навыки» · герой без набора'));
  h.draft = draft;
  if (/<details\b/.test(p)) say('«Навыки» · герой без набора: описание свёрнуто');
  for (const a of h.ab) if (a.d && !p.includes(`<p class="ab-x">${a.d}</p>`)) say(`«Навыки» · герой без набора: у «${a.n}» описание не видно`);
  for (const x of h.pas) if (!p.includes(`<p class="ab-x">${x.d}</p>`)) say(`«Навыки» · герой без набора: у пассивки «${x.n}» описание не видно`);
  /* стили не прячут описание и строку способности */
  const all = html.replace(/<script[\s\S]*?<\/script>/g, '') + fs.readdirSync(path.join(UI, 'screens')).filter(f => f.endsWith('.css')).map(f => read('screens/' + f)).join('\n');
  const HIDE = /display\s*:\s*none|visibility\s*:\s*hidden|-webkit-line-clamp|(?:^|[;{])\s*(?:max-)?height\s*:\s*0(?:px)?\s*[;}]|opacity\s*:\s*0\s*[;}]|clip-path\s*:\s*inset\(\s*50%/;
  for (const m of all.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), body = m[2];
    if (!/\.ab-x\b|\.ab-t\b|div\.ab\[data-k\]|\.ab-n\b/.test(sel) || /:hover|\.lock\b|\[open\]/.test(sel)) continue;
    if (HIDE.test(body)) say(`стили: «${sel.slice(0, 80)}» прячут описание способности или строку — ${body.match(HIDE)[0]}`);
  }
}

/* ================== 7. «Путь»: главы читаются целиком ================== */
{
  fresh();
  const rh = T.RS.heroes.find(x => x.maxV >= 3 && x.ch && x.ch.filter(c => c && c[1] && c[1].length).length >= 3 && !T.rsHas(x));
  if (!rh) say('«Путь»: в составе нет героя с тремя главами текста');
  else for (const v of [0, 1, rh.maxV]) {
    fresh(); T.S.acc.cycle = 6; T.S.rs.cyc = 6; T.S.rs.shards[rh.id] = T.RS.rules.stub.shards;
    T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'rs'; T.S.rs.sel = rh.id; T.S.seg.rhero = 'path'; T.S.rs.val = { id: rh.id, v };
    const p = pageOf(view(`до покупки · ${rh.n} · «Путь» · доблесть ${v}`));
    checkPath(p, rh, v, `«Путь» · ${rh.n} · доблесть ${v}`);
    if (v === 1) dump(`${rh.n} · «Путь» · доблесть 1`, p);
  }
}

/* ================== 8. книга «до покупки» и неизвестная душа ================== */
{
  fresh();
  const PRE = [['who', 'Герой'], ['stats', 'Мощь'], ['skills', 'Навыки'], ['path', 'Путь']];
  const gold = T.RS.heroes.find(x => x.src === 'gold' && x.c <= T.rsCyc() && !T.rsHas(x));
  for (const [tab, name] of PRE) {
    T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'rs'; T.S.rs.sel = gold.id; T.S.seg.rhero = tab; T.S.overlay = null;
    const g = view(`до покупки · ${gold.n} · ${name}`), p = pageOf(g);
    if (!p) { say(`до покупки · ${name}: нет правой страницы`); continue; }
    checkTabs(p, 'rhero', PRE, tab, `до покупки · ${name}`);
    const foot = (p.match(/<div class="hb-f">[\s\S]*$/) || [''])[0];
    if (count(foot, /class="btn go[ "]/g) !== 1) say(`до покупки · ${name}: внизу не одно действие`);
    if (tab === 'who') {
      if (!p.includes(`<p class="rs-who">${gold.who.replace(/^([«"„(]?)([^\s«"„(])/, '$1<span class="dcap">$2</span>')}</p>`)) say('до покупки · «Герой»: история не целиком или без буквицы');
      if (/<details\b/.test(p)) say('до покупки · «Герой»: история свёрнута');
      if (!p.includes(`<span class="rar" data-r="${gold.r}">`)) say('до покупки · «Герой»: нет редкости в строке над историей');
      dump(`${gold.n} · «Герой»`, p);
    }
    if (tab === 'stats') {
      const hb = T.hrBuild(gold);
      if (!p.includes(`<b class="num">${T.fmt(T.hrBaseBm(gold))}</b>`) || !p.includes('<span>на 0 уровне,</span><span>без вещей</span>')) say('до покупки · «Мощь»: мощь не по базовым характеристикам на 0 уровне');
      T.heroSt(hb).forEach((v, i) => { if (!p.includes(`<b class="num">${v}</b>`)) say(`до покупки · «Мощь»: нет ${T.STATS[i]} ${v}`); });
      dump(`${gold.n} · «Мощь»`, p);
    }
  }
  /* неизвестная душа: без закладок и сведений */
  fresh(); T.S.acc.cycle = 3;
  const soul = T.RS.heroes.find(x => x.src === 'roulette' && x.c <= 3 && !T.rsHas(x));
  T.S.rs.shards[soul.id] = 1; T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'rs'; T.S.rs.sel = soul.id; T.S.overlay = null;
  const p = pageOf(view('неизвестная душа'));
  if (!p.includes('Неизвестная душа') || /class="pg-tabs"|class="ab-x"|class="pgm|class="rs-p"/.test(p)) say('неизвестная душа: на странице закладки или сведения');
}

/* ================== 9. листы и окна поверх книги — тем же пергаментом ================== */
{
  fresh(); book('h2', 'power');
  run('предел', () => T.ACT.limit('h2'));
  let o = ovOf(view('лист предела поверх книги'));
  if (!/^<div class="ov" role="dialog"[^>]*><button class="ov-scrim"[^>]*><\/button>\s*<div class="dlg pg fit /.test(o)) say('лист предела поверх книги: не пергамент (нет класса темы .pg)');
  const d = T.heroDev(T.H('h2'));
  T.S.overlay = null; run('сведения о руне', () => T.ACT.item(d.rune.id));
  o = ovOf(view('«Сведения» поверх книги'));
  if (!/<aside class="sheet pg/.test(o)) say('«Сведения» поверх книги: не пергамент');
  T.S.overlay = null; run('доблесть', () => T.ACT.valor('h2'));
  if (!/<div class="dlg pg fit /.test(ovOf(view('превью доблести поверх книги')))) say('превью доблести поверх книги: не пергамент');
  T.S.overlay = { t: 'gear', arg: 'h2' };
  if (!/<div class="gw" data-hid="h2">/.test(ovOf(view('окно снаряжения поверх книги')))) say('окно снаряжения: нет окна .gw (тема окна — .gw в book-pages.css)');
  /* лист не поверх книги — прежний */
  fresh(); T.S.route = 'craft'; T.S.overlay = null; run('сведения в ремесле', () => T.ACT.item(d.rune.id));
  if (/class="sheet pg/.test(view('«Сведения» в ремесле'))) say('лист «Сведения» не поверх книги получил пергамент книги');
  /* «Что изменилось» после доблести — пергамент */
  fresh(); book('h4', 'power'); const h4 = T.H('h4'), d4 = T.heroDev(h4);
  h4.lim = T.INV.hero.valorAtLim; h4.cap = T.INV.hero.capByLim[h4.lim]; h4.lvl = h4.cap; if (!d4.vrHave) T.BAG.add(d4.vr.id, 1);
  run('доблесть · подтверждение', () => { T.ACT.valor('h4'); T.ACT.valordo(T.S.overlay.v); });
  if (!/<aside class="hdfx-card pg">/.test(view('«Что изменилось»'))) say('карточка «Что изменилось»: не пергамент');
}

/* ================== 10. смена вкладки: страница проступает ================== */
{
  fresh(); book('h1', 'power'); view('до смены вкладки');
  run('смена вкладки', () => T.ACT.seg('hero:stats'));
  let p = pageOf(P.game());
  if (!/<div class="pg-b pg-in" style="--pg-d:-0ms;--pg-t:\d+ms;--pg-y:\d+px">/.test(p)) say('смена вкладки: страница не проступает от нажатия');
  P.tick(T.PG_VIEW.fade + 1); p = pageOf(view('после показа'));
  if (/pg-in/.test(p)) say('смена вкладки: после показа страница всё ещё проступает — перерисовка повторит показ');
  const R = load({ reduced: true }), X = R.T;
  X.S = X.initialState(); X.S.overlay = null; X.S.route = 'heroes'; X.S.seg.heroes = 'coll'; X.S.hview = 'mine'; X.S.selHero = 'h1'; X.S.seg.hero = 'power';
  run('меньше движения', () => X.ACT.seg('hero:gear'));
  if (/pg-in/.test(R.game())) say('«меньше движения»: страница проступает');
}

/* ================== 11. режим «Игрок» и «Команда» ================== */
for (const team of [false, true]) {
  run('режим', () => T.setTeam(team));
  fresh();
  for (const h of T.S.heroes) for (const [tab, name] of TABS) { book(h.id, tab); view(`${team ? 'Команда' : 'Игрок'} · ${h.name} · ${name}`); }
  const rh = T.RS.heroes.find(x => x.src === 'roulette' && x.c <= T.rsCyc());
  T.S.rs.shards[rh.id] = T.RS.rules.stub.shards;
  for (const tab of ['who', 'stats', 'skills', 'path']) { T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'rs'; T.S.rs.sel = rh.id; T.S.seg.rhero = tab; T.S.overlay = null; view(`${team ? 'Команда' : 'Игрок'} · до покупки · ${tab}`); }
}
run('режим «Игрок»', () => T.setTeam(false));

/* ================== 12. вёрстка: расчёт размеров на 932 × 430 и 844 × 390 ==================
   Размеры — из стилей (book.css, book-pages.css, hero-dev.css, index.html), ширина текста — оценка по кеглю: узкий шрифт интерфейса
   и цифры ~0,5 кегля на знак, прописные с разрядкой — ~0,7 кегля, книжный Cormorant ~0,46 кегля. Итог — что каждая область помещается */
{
  const px = (css, re, name) => { const m = css.match(re); if (!m) { say(`вёрстка: не найдено ${name}`); return 0; } return +m[1]; };
  const w = (s, k, caps) => Math.ceil(String(s).length * k * (caps ? 0.7 : 0.5)), wd = (s, k) => Math.ceil(String(s).length * k * 0.46);
  const SCR = [{ n: '932 × 430', W: 932, H: 430, small: false }, { n: '844 × 390', W: 844, H: 390, small: true }];
  const BV = T.HB_VIEW, BA = T.HB_ART;
  const ins = (BCSS.match(/\n\.hb-rp\{[^}]*inset:(\d+)px (\d+)px (\d+)px (\d+)px/) || []).slice(1).map(Number);
  /* поля листа: справа, снизу, слева (book-pages.css, .hb-rp.pg{padding:0 …}); закладки возвращают их себе отрицательными полями */
  const sheetPad = (CSS.match(/\n\.hb-rp\.pg\{padding:0 (\d+)px (\d+)(?:px)? (\d+)px\}/) || []).slice(1).map(Number);
  if (sheetPad.length !== 3) { say('book-pages.css: нет полей листа .hb-rp.pg{padding:0 …px …px …px}'); sheetPad.push(0, 0, 0); }
  const tabsBack = CSS.match(/\n\.hb-rp\.pg \.pg-tabs\{margin-left:-(\d+)px;margin-right:-(\d+)px\}/);
  if (!tabsBack || +tabsBack[1] !== sheetPad[2] || +tabsBack[2] !== sheetPad[0]) say('book-pages.css: закладки не возвращают себе поля листа (.hb-rp.pg .pg-tabs{margin-left:-…;margin-right:-…})');
  /* снизу страница кончается над полосой обреза: bottom:calc(Npx + var(--re) …), --re — HB_ART.spreads[ступень].e, ‰ высоты страницы */
  const reM = BCSS.match(/\n\.hb-rp\{[^}]*bottom:calc\((\d+)px \+ var\(--re,0\) \* 1% \/ 10\)/);
  if (!reM) say('book.css: правая страница снизу не поднята над полосой обреза (.hb-rp{bottom:calc(…px + var(--re,0) * 1% / 10)})');
  else ins[2] = +reM[1];
  for (const t of [1, 2, 3, 4, 5]) { const e = BA.spreads[t].e; if (!Number.isInteger(e) || e < 0 || e > 200) say(`HB_ART.spreads[${t}].e — полоса обреза ${e}: не целые ‰`); }
  const tabsH = px(CSS, /\.pg-tabs\{[^}]*height:(\d+)px;margin-top:-\d+px/, '.pg-tabs height'), tabsUp = px(CSS, /\.pg-tabs\{[^}]*height:\d+px;margin-top:-(\d+)px/, '.pg-tabs margin-top');
  const tabGap = px(CSS, /\.pg-tabs\{[^}]*gap:(\d+)px/, '.pg-tabs gap'), hdGap = px(BCSS, /\.hb-hd \.hd-body\{margin-top:0;gap:(\d+)px\}/, '.hb-hd .hd-body gap');
  const tp = [px(CSS, /padding:0 var\(--pg-tp,(\d+)px\)/, 'закладка --pg-tp'), px(BCSS, /\.g\.sm \.hb-rp\{[^}]*--pg-tp:(\d+)px/, '.g.sm --pg-tp')];
  const tf = [px(CSS, /font:700 var\(--pg-tf,([\d.]+)px\)/, 'закладка --pg-tf'), px(BCSS, /\.g\.sm \.hb-rp\{[^}]*--pg-tf:([\d.]+)px/, '.g.sm --pg-tf')];
  const ic = [px(CSS, /grid-template-columns:var\(--pg-ic,(\d+)px\)/, 'значок способности --pg-ic'), px(BCSS, /\.g\.sm \.hb-rp\{[^}]*--pg-ic:(\d+)px/, '.g.sm --pg-ic')];
  /* поле страницы «Навыки» слева (под кромку и шипы рамки) и отступ значка от текста — у рамок рисунком шире */
  const abl = [px(CSS, /\.ab-page\{[^}]*padding:0 \d+px 0 var\(--pg-abl,(\d+)px\)/, '.ab-page --pg-abl'), px(BCSS, /\.g\.sm \.hb-rp\{[^}]*--pg-abl:(\d+)px/, '.g.sm --pg-abl')];
  const icg = [px(CSS, /html\.pg-f div\.ab\[data-k\]\{column-gap:var\(--pg-icg,(\d+)px\)\}/, 'рамки рисунком --pg-icg'), px(BCSS, /\.g\.sm \.hb-rp\{[^}]*--pg-icg:(\d+)px/, '.g.sm --pg-icg')];
  /* закладки рисунком: полоса рисунка по бокам (PG_ART.wide.tab, на низком экране — --pg-tab-w) и поле --pg-tpa */
  const tabArt = T.PG_ART.ready.includes(T.PG_ART.img.tab), tabSide = [T.PG_ART.wide.tab[1], +((BCSS.match(/\.g\.sm \.hb-rp\{[^}]*--pg-tab-w:\d+px (\d+)px/) || [])[1] || T.PG_ART.wide.tab[1])];
  const tpa = [px(CSS, /padding:0 var\(--pg-tpa,(\d+)px\)/, 'закладка рисунком --pg-tpa'), px(BCSS, /\.g\.sm \.hb-rp\{[^}]*--pg-tpa:(\d+)px/, '.g.sm --pg-tpa')];
  const wr = [px(CSS, /\.pgm-wr\{[^}]*width:var\(--pg-wr,(\d+)px\)/, 'венок мощи --pg-wr'), px(BCSS, /\.g\.sm \.hb-rp\{[^}]*--pg-wr:(\d+)px/, '.g.sm --pg-wr')];
  const si = [px(CSS, /width:var\(--pg-si,(\d+)px\)/, 'значок характеристики --pg-si'), px(BCSS, /\.g\.sm \.hb-rp\{[^}]*--pg-si:(\d+)px/, '.g.sm --pg-si')];
  const hbfGap = px(BCSS, /\.hb-rp\{[^}]*gap:(\d+)px/, '.hb-rp gap'), footBtn = px(BCSS, /\.hb-f \.btn\.big\{min-height:(\d+)px\}/, '.hb-f .btn.big'), footPad = px(BCSS, /\.hb-f\{[^}]*padding-top:(\d+)px/, '.hb-f padding-top');
  /* «Мощь»: числа — переменные страницы и их значения на низком экране (.g.sm .hb-rp) */
  /* переменная страницы на низком экране: своё правило листа (book-pages.css, .g.sm .hb-rp.pg) — поверх book.css (.g.sm .hb-rp) */
  const sm = (v, name) => { const own = CSS.match(new RegExp(`\\.g\\.sm \\.hb-rp\\.pg\\{[^}]*--${v}:([\\d.]+)px`)); return own ? +own[1] : px(BCSS, new RegExp(`\\.g\\.sm \\.hb-rp\\{[^}]*--${v}:([\\d.]+)px`), '.g.sm --' + name); };
  const pgmGap = [px(CSS, /\.pgm\{[^}]*gap:var\(--pg-mg,(\d+)px\)/, '.pgm gap'), sm('pg-mg', 'pg-mg')], bmF = [px(CSS, /\.pgm-bm>b\{[^}]*font:600 var\(--pg-bf,(\d+)px\)/, '.pgm-bm b'), sm('pg-bf', 'pg-bf')];
  const stF = [px(CSS, /\.pgm-s>b\{font:600 var\(--pg-sf,(\d+)px\)/, '.pgm-s b'), sm('pg-sf', 'pg-sf')], aHs = [px(CSS, /\.pgm-a\{[^}]*min-height:var\(--pg-ah,(\d+)px\)/, '.pgm-a'), sm('pg-ah', 'pg-ah')];
  const atPad = [px(CSS, /\.pgm-at\{[^}]*padding-top:var\(--pg-atp,(\d+)px\)/, '.pgm-at --pg-atp'), sm('pg-atp', 'pg-atp')];
  const bmMin = [px(CSS, /\.pgm-bm\{[^}]*min-height:var\(--pg-bmh,(\d+)px\)/, '.pgm-bm --pg-bmh'), sm('pg-bmh', 'pg-bmh')], aIc = [px(CSS, /\.pgm-a>\.ico\{width:var\(--pg-ai,(\d+)px\)/, '.pgm-a .ico --pg-ai'), sm('pg-ai', 'pg-ai')];
  const sPad = (CSS.match(/\.pgm-s\{[^}]*padding:(\d+)px 0 (\d+)px/) || [0, 0, 0]).slice(1).map(Number), srcF = px(CSS, /\.pgm-src\{[^}]*font-size:([\d.]+)px/, '.pgm-src');
  const xF = [px(CSS, /\.pgm-x\{[^}]*font:500 var\(--pg-xf,(\d+)px\)\/[\d.]+/, '.pgm-x --pg-xf'), sm('pg-xf', 'pg-xf')], xL = +((CSS.match(/\.pgm-x\{[^}]*font:500 var\(--pg-xf,\d+px\)\/([\d.]+)/) || [])[1] || 1.3);
  /* «Снаряжение»: место (сторона рамки, подпись под ней), промежутки сеток, рубрика, низ одной строкой */
  const slot = [px(CSS, /--pw:var\(--pg-slot,(\d+)px\)/, 'место --pg-slot'), sm('pg-slot', 'pg-slot')], sg = [px(CSS, /gap:var\(--pg-rg,\d+px\) var\(--pg-sg,(\d+)px\)/, 'сетка мест --pg-sg'), sm('pg-sg', 'pg-sg')];
  const rg = [px(CSS, /gap:var\(--pg-rg,(\d+)px\)/, 'сетка мест --pg-rg'), sm('pg-rg', 'pg-rg')], gg = [px(CSS, /gap:var\(--pg-gv,\d+px\) var\(--pg-gg,(\d+)px\)/, 'группы --pg-gg'), sm('pg-gg', 'pg-gg')];
  const gv = [px(CSS, /gap:var\(--pg-gv,(\d+)px\)/, 'низ и сетки --pg-gv'), sm('pg-gv', 'pg-gv')], rbh = [px(CSS, /min-height:var\(--pg-rbh,(\d+)px\)/, 'рубрика --pg-rbh'), sm('pg-rbh', 'pg-rbh')];
  const capF = px(CSS, /\.pg :is\(\.eq-cap,\.tl-cap\)\{[^}]*font:700 ([\d.]+)px\/([\d.]+)/, 'подпись места'), capL = +((CSS.match(/\.pg :is\(\.eq-cap,\.tl-cap\)\{[^}]*font:700 [\d.]+px\/([\d.]+)/) || [])[1] || 1.2);
  const noneF = px(CSS, /\.pg :is\(\.eq-slot,\.tl-slot\)\.none :is\(\.eq-cap,\.tl-cap\)\{font:italic 500 (\d+)px\/([\d.]+)/, 'подпись пустого места'), noneL = +((CSS.match(/\.pg :is\(\.eq-slot,\.tl-slot\)\.none :is\(\.eq-cap,\.tl-cap\)\{font:italic 500 \d+px\/([\d.]+)/) || [])[1] || 1.1);
  const slotGap = px(CSS, /\.pg :is\(\.eq-slot,\.tl-slot\)\{[^}]*gap:(\d+)px/, 'место: рамка — подпись'), tlRowGap = px(CSS, /\.pg \.tl-row\{--pg-cols:2;gap:(\d+)px/, '.tl-row gap'), tlArtGap = px(CSS, /html\.pg-ft \.pg \.tl-row\{row-gap:(\d+)px\}/, 'оправа: промежуток рядов');
  const gFootPad = [px(CSS, /\.pg \.hdg-f\{[^}]*padding-top:(\d+)px/, '.pg .hdg-f padding-top'), px(CSS, /\.g\.sm \.pg \.hdg-f\{padding-top:(\d+)px\}/, '.g.sm .pg .hdg-f padding-top')], gBtnH = px(CSS, /\.pg \.hdg-f \.btn\{[^}]*min-height:(\d+)px/, '.pg .hdg-f .btn min-height');
  const noneFs = px(CSS, /\.g\.sm \.pg :is\(\.eq-slot,\.tl-slot\)\.none :is\(\.eq-cap,\.tl-cap\)\{font-size:(\d+)px\}/, '.g.sm подпись пустого места');
  if (gBtnH < 44) say(`вёрстка: главная кнопка «Снаряжения» ниже 44 px (${gBtnH})`);
  const abF = px(CSS, /\.ab-x\{[^}]*font:500 (\d+)px/, '.ab-x'), abL = +((CSS.match(/\.ab-x\{[^}]*font:500 \d+px\/([\d.]+)/) || [])[1] || 1.3);
  const nameF = px(CSS, /\.ab-n>b\{[^}]*font:700 (\d+)px/, '.ab-n b'), rsF = px(CSS, /\.pg \.chap \.rs-p\{[^}]*font:500 ([\d.]+)px/, '.pg .chap .rs-p'), whoF = px(CSS, /\.pg \.rs-who\{[^}]*font:500 (\d+)px/, '.pg .rs-who');
  /* способность с самым длинным описанием — на неё считаем строку */
  const L = T.EB.lib(), longest = Object.values(L).reduce((a, x) => (x.d && x.d.length > a.length ? x.d : a), '');
  const longName = Object.values(L).reduce((a, x) => (x.n && x.n.length > a.length ? x.n : a), '');
  for (const X of SCR) {
    cnt.layout++;
    const k = X.small ? 1 : 0;
    const bw = Math.min(BV.win.max, X.W - BV.win.padX) - BV.win.lock, bh = X.H - BV.win.padY - BV.win.rib;
    let pw = 1e9, ph = 1e9;
    for (const t of [1, 2, 3, 4, 5]) { const r = BA.spreads[t].r, rh = Math.floor(bh * (1000 - r[0] - r[2]) / 1000); pw = Math.min(pw, Math.floor(bw * (1000 - r[1] - r[3]) / 1000) - ins[1] - ins[3]); ph = Math.min(ph, rh - ins[0] - ins[2] - Math.ceil(rh * (BA.spreads[t].e || 0) / 1000)); }
    const minPage = X.small ? [284, 259] : [316, 290];
    if (pw < minPage[0] || ph < minPage[1]) say(`вёрстка ${X.n}: правая страница ${pw} × ${ph} — меньше ${minPage[0]} × ${minPage[1]}`);
    /* поля листа чернёного пергамента (.hb-rp.pg{padding}): текст отступает от края листа; закладки — во всю ширину страницы
       (отрицательные поля .pg-tabs), тело вкладки — уже на поля и ниже на нижнее поле */
    const pwT = pw; pw -= sheetPad[0] + sheetPad[2]; ph -= sheetPad[1];
    const bodyH = ph - (tabsH - tabsUp) - hdGap;
    /* закладки: подпись прописными и поля — в ширину страницы (у героя — пять, «до покупки» — четыре и глаз «Команды») */
    /* ширина закладки — подпись и поля: у CSS — --pg-tp, у рисунка — полоса рисунка и --pg-tpa; помещаться должны обе */
    const pad = Math.max(tp[k], tabArt ? tabSide[k] + tpa[k] : 0);
    const tabsW = list => list.reduce((a, l) => a + w(l, tf[k], true) + 2 * pad, 0) + (list.length - 1) * tabGap;
    const own = tabsW(TABS.map(x => x[1])), pre = tabsW(['Герой', 'Мощь', 'Навыки', 'Путь']) + tabGap + 24;
    if (own > pwT) say(`вёрстка ${X.n}: закладки героя ${own} px, а ширина страницы ${pwT} px`);
    if (pre > pwT) say(`вёрстка ${X.n}: закладки «до покупки» ${pre} px, а ширина страницы ${pwT} px`);
    /* «Мощь»: мощь одной строкой (справа — из чего она, не больше двух строк), пять характеристик (значок, число, степень роста,
       подпись), строка объяснения — самая длинная из возможных, атрибуты столбцами. Всё — без прокрутки на обоих экранах */
    const g = pgmGap[k], bmH = Math.max(bmMin[k], wr[k], bmF[k], 2 * Math.ceil(srcF * 1.15) + 1) + 6 + 1;
    const srcW = w('основа 99 999', srcF) + 8 + w('снаряжение +99,9 %', srcF), leftW = wr[k] + 6 + w('999 999', bmF[k]) + 6;
    if (srcW > pw - leftW && Math.max(w('основа 99 999', srcF), w('снаряжение +99,9 %', srcF), w('талисманы +99,9 %', srcF)) > (pw - leftW)) say(`вёрстка ${X.n}: из чего мощь — не помещается справа от числа`);
    const stH = sPad[0] + si[k] + 2 + stF[k] + 2 + 10 + 2 + 9.5 + sPad[1] + 2;
    let why = '';
    /* та же фраза, что pgWhy (book-pages.js): что даёт, главная ли, прибавка снаряжения; «рост за уровень» не пишется (ADR-0037) */
    T.STATS.forEach((_, i) => { for (const main of [true, false]) { const s = `${T.STATS[i]} — ${T.STAT_HINT[i]}${main ? '. Главная: от неё обычная атака' : ''}; снаряжение +999.`; if (s.length > why.length) why = s; } });
    const xLines = Math.ceil(wd(why, xF[k]) / pw), whyH = Math.ceil(xLines * xF[k] * xL);
    if (xLines > 2) say(`вёрстка ${X.n}: строка под характеристиками — ${xLines} строки («${why}»)`);
    const atH = atPad[k] + 1 + 12 + 2 + 4 * (Math.max(aHs[k], aIc[k], Math.ceil(12.5 * 1.2)) + 1) + 3;
    const statsH = bmH + g + stH + g + whyH + g + atH;
    if (statsH > bodyH) say(`вёрстка ${X.n}: «Мощь» ${Math.round(statsH)} px, а места ${bodyH} px`);
    const atW = 2 * (18 + 6 + w('Физ. защита', 12.5) + 6 + w('12 345', 13)) + 14;
    if (atW > pw) say(`вёрстка ${X.n}: атрибуты «Мощи» ${atW} px, а ширина страницы ${pw} px`);
    /* «Снаряжение»: рубрика, три ряда мест 3 × 3 (рамка, подпись), талисманы 2 × 2 рядом; низ одной строкой — «Все вещи» и кнопка
       «Надеть лучшее» с прибавкой мощи; всё — без прокрутки */
    const capH = Math.round(Math.max(capF * capL, (X.small ? noneFs : noneF) * noneL)), gRowH = slot[k] + slotGap + capH;
    const gearH = 2 + rbh[k] + 1 + rg[k] + 3 * gRowH + 2 * rg[k] + gv[k] + gFootPad[k] + 1 + gBtnH;
    if (gearH > bodyH) say(`вёрстка ${X.n}: «Снаряжение» ${gearH} px, а места ${bodyH} px`);
    const tlGap = Math.max(tlRowGap, tlArtGap), tlH = 2 + rbh[k] + 1 + rg[k] + 2 * gRowH + tlGap;
    if (tlH > 3 * gRowH + 2 * rg[k] + rbh[k] + 20 + 2 * 18) say(`вёрстка ${X.n}: талисманы выше мест снаряжения`);
    const gearW = 3 * slot[k] + 2 * sg[k] + gg[k] + 2 * slot[k] + 2 * sg[k];
    if (gearW > pw) say(`вёрстка ${X.n}: сетки мест ${gearW} px, а ширина страницы ${pw} px`);
    /* кнопки и ссылка — прописные узкого шрифта: ~0,62 кегля на знак (сверено с Chrome: 0,57–0,61); кнопка рисунком — полосы по 16 px
       и поле 4 px с каждой стороны, цена — отбивка 10 px, черта и знак */
    const wc = (s, k) => Math.ceil(String(s).length * k * 0.62), btnSide = 2 * (T.PG_ART.wide.btn[1] + 4);
    const footW = wc('Все вещи', 12.5) + 8 + btnSide + wc('Надеть лучшее', 12) + 8 + 13 + w('▲+99,9 %', 12.5);
    if (footW > pw) say(`вёрстка ${X.n}: низ «Снаряжения» ${footW} px, а ширина страницы ${pw} px`);
    if (slot[k] < 40) say(`вёрстка ${X.n}: место снаряжения ${slot[k]} px — меньше 40`);
    /* «Навыки»: полоса долей и первая способность с самым длинным описанием — видны сразу; имени хватает места рядом с долей хода */
    const turnH = 12 + 4 + 9 + 4 + Math.ceil(12 * 1.3) * 2 + 6 + 1;
    const textW = pw - abl[k] - 3 - ic[k] - icg[k];
    const dLines = Math.ceil(wd(longest, abF) / textW), rowH = 7 + Math.ceil(nameF * 1.15) + 1 + 12 + 1 + Math.ceil(dLines * abF * abL) + 7;
    if (turnH + 6 + rowH > bodyH) say(`вёрстка ${X.n}: на «Навыках» полоса долей и первая способность ${turnH + 6 + rowH} px — не видны сразу (места ${bodyH})`);
    const nameRoom = textW - 8 - w('откроется', 11.5) - 14;
    if (wd(longName, nameF) > 2 * nameRoom) say(`вёрстка ${X.n}: имени способности ${nameRoom} px — «${longName}» не помещается и в две строки`);
    if (/\.ab-n>b\{[^}]*(?:white-space:nowrap|text-overflow:ellipsis)/.test(CSS)) say('стили: имя способности режется многоточием — длинное имя должно переноситься');
    /* «Путь»: первая глава — заголовок и начало текста с буквицей */
    const chapH = 2 + Math.ceil(16 * 1.15) + 5 + 3 * Math.ceil(rsF * 1.34);
    if (chapH > bodyH) say(`вёрстка ${X.n}: на «Пути» первая глава не начинается на странице`);
    /* книга «до покупки»: под закладками — страница и низ с действием */
    /* низ «до покупки» одной строкой: кнопка с ценой (не сжимается) и пояснение слева — две строки текста или кнопка, что выше */
    const buyBtnW = Math.max(...[['Купить', '99 999'], ['Пробудить', String(T.RS.rules.stub.activateSouls)], ['Купить', '999']].map(([l, n]) => btnSide + wc(l, 15) + 8 + 13 + 18 + 4 + w(n, 14))), buyTxtW = pw - buyBtnW - 8;
    if (buyTxtW < 90) say(`вёрстка ${X.n}: слева от кнопки «до покупки» ${buyTxtW} px — пояснению не хватает места`);
    const footH = hbfGap + footPad + 1 + Math.max(footBtn, Math.ceil(14 * 1.1) + 2 + Math.ceil(12 * 1.25)), preH = bodyH - footH;
    const whoH = Math.ceil(10.5 * 1.2) + 7 + 2 * Math.ceil(whoF * 1.34);
    if (whoH > preH) say(`вёрстка ${X.n}: на «Герое» до покупки история не начинается на странице (${whoH} из ${preH} px)`);
    if (turnH + 6 + rowH > preH + 40) say(`вёрстка ${X.n}: на «Навыках» до покупки первая способность уходит под низ действия`);
    lay.push(`${X.n}: страница ${pw} × ${ph}, под вкладку ${bodyH} (до покупки ${preH}); закладки ${own} и ${pre} px; «Мощь» ${Math.round(statsH)} px (строка объяснения — ${xLines} стр.), атрибуты ${atW} px; «Снаряжение» ${gearH} × ${gearW} px, низ ${footW} px; «Навыки» — полоса ${turnH} и строка ${rowH} px (описание ${dLines} стр., имени ${nameRoom} px); «Путь» — начало главы ${chapH} px; «Герой» — ${whoH} px`);
  }
}

/* ================== 12а. каскад стилей на разметке страниц ==================
   css_cascade.js решает, чьё правило побеждает у элемента, как браузер. Разметка — вся игра (#game) внутри рамки устройства, у <html>
   — классы арта; экран — 932 × 430 и 844 × 390 (у #game класс sm), контейнер main — рабочая область (.g: --top и --rail) */
{
  const CC = require('./css_cascade.js'), RULES = CC.sheets(UI, html);
  const gv = (re, name) => { const m = html.match(re); if (!m) { say(`каскад: не найдено ${name}`); return 0; } return +m[1]; };
  const G = { top: gv(/\n\.g\{--top:(\d+)px/, '.g --top'), rail: gv(/\n\.g\{--top:\d+px;--rail:(\d+)px/, '.g --rail'), topS: gv(/\n\.g\.sm\{[^}]*--top:(\d+)px/, '.g.sm --top'), railS: gv(/\n\.g\.sm\{[^}]*--rail:(\d+)px/, '.g.sm --rail') };
  const PAGE = 'screens/book-pages.css', WRAP = ['hd-gear', 'hb-hd', 'hd-body', 'hb-rp', 'hb-pg', 'hb-book', 'hb-win', 'pg', 'pg-b'];
  const LAYOUT = ['display', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'aspect-ratio', 'grid-template-columns', 'grid-column-start', 'position', 'top', 'right', 'bottom', 'left', 'overflow-x', 'overflow-y', 'visibility', 'flex-direction', 'flex-shrink'];
  const GEAR = ['hd-gear', 'eq-row', 'tl-row', 'pg-rub', 'eq-slots', 'tl-slots', 'eq-slot', 'tl-slot', 'eq-w', 'tl-w', 'eq-cap', 'tl-cap', 'eq-up', 'hdg-f'];
  const tree = (small, markup) => CC.wrap([['html', { class: [...P.rootCls].join(' '), lang: 'ru' }], ['body', {}], ['div', { class: 'p-device', id: 'device' }], ['div', { class: 'p-device-inner' }], ['div', { class: small ? 'g sm' : 'g', id: 'game', lang: 'ru' }]], markup);
  const SCR2 = [{ n: '932 × 430', w: 932, h: 430, small: false }, { n: '844 × 390', w: 844, h: 390, small: true }];
  const inPage = e => CC.within(e, x => x.cls.has('hb-rp') && x.cls.has('pg'));
  const pxv = v => { const m = String(v || '').trim().match(/^(-?[\d.]+)px$/); return m ? +m[1] : null; };
  const INK = '#efe3c6', INK2 = '#d2c3a1';   // белила и белила второго плана — тема .pg (book-pages.css)
  for (const X of SCR2) {
    const K = () => new CC.Cascade(RULES, { w: X.w, h: X.h, reduced: false, hover: false, containers: { main: [X.w - (X.small ? G.railS : G.rail), X.h - (X.small ? G.topS : G.top)] } });
    /* «Снаряжение»: всё пусто (стрелки «есть лучше») и всё надето */
    fresh(); book('h1', 'gear');
    const states = [['всё пусто', view(`каскад ${X.n} · «Снаряжение»`)]];
    run('лучшее', () => T.ACT.gearbest(`gr${T.S.gear.seq}:h1`)); T.S.overlay = null;
    states.push(['надето лучшее', view(`каскад ${X.n} · «Снаряжение» надето`)]);
    for (const [st, g] of states) {
      const root = tree(X.small, g), C = K(), where = `каскад ${X.n} · «Снаряжение» (${st})`;
      const els = CC.q(root, e => inPage(e) && GEAR.some(c => e.cls.has(c)));
      if (els.length < 20) { say(`${where}: на странице ${els.length} элементов мест — разметка не та`); continue; }
      let foreign = 0, beaten = 0;
      for (const e of els) {
        /* свойства вёрстки, которые задаёт страница (book-pages.css), решает она */
        const own = new Set(C.rulesFor(e, r => r.src === PAGE).flatMap(r => r.decls.map(d => d.p)));
        for (const prop of LAYOUT) {
          const shorts = { top: 'inset', right: 'inset', bottom: 'inset', left: 'inset', 'overflow-x': 'overflow', 'overflow-y': 'overflow', 'flex-shrink': 'flex', 'grid-column-start': 'grid-column' };
          if (!own.has(prop) && !own.has(shorts[prop])) continue;
          const w = C.win(e, prop);
          if (w && w.src !== PAGE && beaten++ < 6) say(`${where}: у .${[...e.cls].join('.')} «${prop}» решает чужое правило ${w.src} «${w.sel}» — ${w.v}`);
        }
        /* чужое правило через обёртки страницы — не трогает места вовсе */
        for (const r of C.rulesFor(e, r => r.src !== PAGE && r.decls.some(d => LAYOUT.includes(d.p) || ['inset', 'overflow', 'flex', 'grid-column'].includes(d.p)))) {
          const wrapped = r.sels.some(s => !s.pe && CC.matchSel(e, s) && s.parts.slice(0, -1).some(pp => pp.comp.cls.some(c => WRAP.includes(c))));
          if (wrapped && foreign++ < 6) say(`${where}: чужое правило ${r.src} «${r.sel}» задаёт вёрстку мест на странице книги`);
        }
      }
      /* значения: место по содержимому и шириной --pg-slot, подпись видна, стрелка внутри рамки, рубрика над сеткой */
      const want = pxv(C.value(CC.q(root, e => e.cls.has('hb-rp'))[0], '--pg-slot')) || (X.small ? 42 : 46);
      for (const e of CC.q(root, e => inPage(e) && (e.cls.has('eq-slot') || e.cls.has('tl-slot')))) {
        const h = C.value(e, 'height'), wv = pxv(C.value(e, 'width')), mh = C.value(e, 'max-height');
        if (h && h !== 'auto') say(`${where}: у места высота ${h} — подпись под рамкой обрежется`);
        if (mh && mh !== 'none') say(`${where}: у места предел высоты ${mh}`);
        if (wv !== want) say(`${where}: ширина места ${wv} px, а --pg-slot ${want} px`);
        const cap = CC.q(e, x => x.cls.has('eq-cap') || x.cls.has('tl-cap'))[0];
        if (!cap || C.value(cap, 'display') === 'none' || C.value(cap, 'visibility') === 'hidden') say(`${where}: подпись места не видна`);
        const up = CC.q(e, x => x.cls.has('eq-up'))[0];
        if (up && (C.value(up, 'position') !== 'absolute' || !(pxv(C.value(up, 'top')) >= 0) || !(pxv(C.value(up, 'right')) >= 0))) say(`${where}: стрелка «есть лучше» выступает из рамки — закладки её закроют`);
        break;
      }
      for (const cls of ['eq-row', 'tl-row']) {
        const row = CC.q(root, e => inPage(e) && e.cls.has(cls))[0];
        if (!row) { say(`${where}: нет .${cls}`); continue; }
        const kids = row.kids.map(k => [...k.cls][0]);
        if (kids[0] !== 'pg-rub' || C.value(row.kids[0], 'grid-column-start') !== '1' || C.value(row, 'display') !== 'grid') say(`${where}: рубрика .${cls} — не первой строкой над сеткой (${kids.join(', ')})`);
      }
    }
    /* цвет текста на листе: из темы страницы (book-pages.css) и не ниже 4,5 : 1 к самому светлому тону листа --pg-hi; полупрозрачный
       цвет кладётся на --pg-hi */
    const hiTone = ((CSS.match(/\.pg,\.gw\{[^}]*--pg-hi:(#[0-9a-f]{6})/i) || [])[1] || '#241d16');
    const rgbOf = v => { const s = String(v || '').trim().toLowerCase(), h = s.match(/^#([0-9a-f]{6})$/); if (h) return [0, 2, 4].map(i => parseInt(h[1].slice(i, i + 2), 16)).concat(1);
      const m = s.match(/^rgba?\(([^)]+)\)$/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const lumOf = c => { const l = c.slice(0, 3).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
    const contrastOf = v => { const c = rgbOf(v), b = rgbOf(hiTone); if (!c || !b) return 0; const mix = c.slice(0, 3).map((x, i) => x * c[3] + b[i] * (1 - c[3])); const x = lumOf(mix), y = lumOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const readable = (C, root, test, what, want) => {
      const els = CC.q(root, e => inPage(e) && test(e)); if (!els.length) { say(`каскад ${X.n} · ${what}: на странице нет таких строк`); return; }
      for (const e of els.slice(0, 6)) {
        const c = String(C.value(e, 'color') || '').toLowerCase(), r = contrastOf(c); cnt.contrast = (cnt.contrast || 0) + 1;
        if (want && c !== want) { say(`каскад ${X.n} · ${what}: цвет ${c || 'без цвета'}, ждали ${want}`); break; }
        if (r < 4.5) { say(`каскад ${X.n} · ${what}: цвет ${c || 'без цвета'} к листу ${hiTone} — ${r.toFixed(2)} : 1, ниже 4,5 : 1`); break; }
      }
    };
    /* «Мощь»: число характеристики — белилами страницы, не цветом наследства */
    fresh(); book('h2', 'stats');
    { const root = tree(X.small, view(`каскад ${X.n} · «Мощь»`)), C = K();
      const b = CC.q(root, e => inPage(e) && e.tag === 'b' && e.parent && e.parent.cls.has('pgm-s'));
      if (b.length !== 5) say(`каскад ${X.n} · «Мощь»: чисел характеристик ${b.length}`);
      for (const e of b) { const c = String(C.value(e, 'color') || '').toLowerCase(), w = C.win(e, 'color'); if (c !== INK || !w || w.src !== PAGE) { say(`каскад ${X.n} · «Мощь»: число характеристики — ${c || 'без цвета'} (${w ? w.src : 'наследство'}), ждали белила ${INK}`); break; } }
      readable(C, root, e => e.cls.has('pgm-x'), '«Мощь», строка под характеристиками');
      readable(C, root, e => e.tag === 'span' && e.parent && e.parent.cls.has('pgm-a'), '«Мощь», имя атрибута'); }
    /* «Развитие»: карточка шага — во всю высоту страницы, её низ — последним; главная кнопка — последней в нём, у правого края
       (под большим пальцем правой руки), не ниже 44 px и с ценой; строки превью и характеристики — читаются */
    fresh(); book('h1', 'power');
    { const root = tree(X.small, view(`каскад ${X.n} · «Развитие»`)), C = K(), where = `каскад ${X.n} · «Развитие»`;
      const card = CC.q(root, e => inPage(e) && e.cls.has('hdv-next'))[0], act = card && card.kids[card.kids.length - 1], go = act && act.kids[act.kids.length - 1];
      if (!card || C.value(card, 'flex-grow') !== '1' || C.value(card, 'display') !== 'flex' || C.value(card, 'flex-direction') !== 'column') say(`${where}: карточка шага — не во всю высоту страницы (flex-grow ${card ? C.value(card, 'flex-grow') : '—'})`);
      if (!act || !act.cls.has('hdv-act') || C.value(act, 'margin-top') !== 'auto') say(`${where}: низ карточки с кнопкой — не последним и не прижат к низу страницы`);
      if (!go || !go.cls.has('hdv-go') || !go.cls.has('go')) say(`${where}: главная кнопка — не последней в низу карточки (у правого края)`);
      else {
        const mh = pxv(C.value(go, 'min-height'));
        if (C.value(go, 'margin-left') !== 'auto') say(`${where}: главная кнопка не прижата к правому краю (margin-left ${C.value(go, 'margin-left')})`);
        if (!(mh >= 44)) say(`${where}: главная кнопка ниже 44 px (min-height ${C.value(go, 'min-height')})`);
        if (C.value(go, 'flex-shrink') !== '0') say(`${where}: главная кнопка сжимается — цену обрежет`);
        if (!CC.q(go, e => e.cls.has('cost')).length) say(`${where}: на главной кнопке нет цены`);
        lay.push(`каскад ${X.n}: «Развитие» — кнопка шага последней в карточке, справа, ${mh} px`);
      }
      readable(C, root, e => e.cls.has('k') && e.parent && e.parent.cls.has('hdv-g'), '«Развитие», подпись строки превью');
      readable(C, root, e => e.tag === 'b' && e.parent && e.parent.cls.has('v') && e.parent.parent && e.parent.parent.cls.has('hdv-g'), '«Развитие», «станет» в превью');
      readable(C, root, e => e.tag === 's' && e.parent && e.parent.cls.has('v'), '«Развитие», «было» в превью');
      readable(C, root, e => e.tag === 'b' && e.parent && e.parent.cls.has('s5'), '«Развитие», характеристика');
      readable(C, root, e => e.cls.has('hdv-sum'), '«Развитие», строка «уровень · предел · доблесть»'); }
    /* «Снаряжение»: низ — у нижнего края страницы, главная кнопка — последней в нём, не ниже 44 px; подписи мест читаются */
    fresh(); book('h1', 'gear');
    { const root = tree(X.small, view(`каскад ${X.n} · «Снаряжение» · низ`)), C = K(), where = `каскад ${X.n} · «Снаряжение»`;
      const gear = CC.q(root, e => inPage(e) && e.cls.has('hd-gear'))[0], foot = gear && CC.q(gear, e => e.cls.has('hdg-f'))[0], btn = foot && foot.kids[foot.kids.length - 1];
      if (!gear || !/1fr\)?$/.test(String(C.value(gear, 'grid-template-rows') || '').trim())) say(`${where}: у сетки мест нет растущего ряда под низ (grid-template-rows ${gear ? C.value(gear, 'grid-template-rows') : '—'})`);
      if (!foot || C.value(foot, 'align-self') !== 'end') say(`${where}: низ с главной кнопкой не прижат к нижнему краю страницы`);
      if (!btn || !btn.cls.has('btn') || !(pxv(C.value(btn, 'min-height')) >= 44)) say(`${where}: главная кнопка низа — не последней или ниже 44 px`);
      readable(C, root, e => e.cls.has('eq-cap'), '«Снаряжение», подпись места'); }
    /* «Навыки» и «Путь»: описание способности и текст главы читаются */
    fresh(); book('h3', 'skills');
    { const root = tree(X.small, view(`каскад ${X.n} · «Навыки»`)), C = K(); readable(C, root, e => e.cls.has('ab-x'), '«Навыки», описание способности'); }
    fresh(); book('h2', 'path');
    { const root = tree(X.small, view(`каскад ${X.n} · «Путь»`)), C = K(); readable(C, root, e => e.cls.has('rs-p'), '«Путь», текст главы'); }
    /* книга «до покупки»: кнопка с ценой не сжимается, пояснение — белилами второго плана */
    fresh(); { const gold = T.RS.heroes.find(x => x.src === 'gold' && x.c <= T.rsCyc() && !T.rsHas(x));
      T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'rs'; T.S.rs.sel = gold.id; T.S.seg.rhero = 'who'; T.S.overlay = null;
      const root = tree(X.small, view(`каскад ${X.n} · до покупки`)), C = K();
      const f = CC.q(root, e => inPage(e) && e.cls.has('hb-f'))[0], btn = f && f.kids.find(k => k.cls.has('btn')), why = f && CC.q(f, e => e.cls.has('reason'))[0], sp = f && f.kids.find(k => k.cls.has('g-spacer'));
      if (!btn) say(`каскад ${X.n} · до покупки: внизу нет кнопки`);
      else if (C.value(btn, 'flex-shrink') !== '0') say(`каскад ${X.n} · до покупки: кнопка с ценой сжимается (flex-shrink ${C.value(btn, 'flex-shrink')}) — цену обрежет`);
      if (sp && C.value(sp, 'display') !== 'none') say(`каскад ${X.n} · до покупки: распорка отнимает место у пояснения`);
      if (!why || String(C.value(why, 'color')).toLowerCase() !== INK2) say(`каскад ${X.n} · до покупки: пояснение не белилами второго плана (${why ? C.value(why, 'color') : 'нет'})`);
      readable(C, root, e => e.cls.has('rs-who'), 'до покупки, история героя'); }
    cnt.layout++;
  }
}

/* ================== 13. UI-кит и сценарии ================== */
{
  const k = T.KIT_EXTRA.find(x => x.html === T.pgKitHtml);
  if (!k) say('UI-кит: раздела «Страницы книги героя» нет в KIT_EXTRA');
  else for (const team of [false, true]) {
    run('режим', () => T.setTeam(team)); fresh();
    const h = run('UI-кит', () => k.html()); cnt.pages++;
    if (typeof h !== 'string' || !/<h3>Страницы книги героя<\/h3>/.test(h) || /undefined|NaN|\[object /.test(h)) { say('UI-кит: раздел «Страницы книги героя» не рисуется'); continue; }
    if (count(h, /<figure class="pgk-f">/g) !== 6) say(`UI-кит: страниц ${count(h, /<figure class="pgk-f">/g)}, ждали пять вкладок героя и «до покупки»`);
    if (count(h, /<figure class="pgk-fr">/g) !== 4) say('UI-кит: рамок значков не четыре — активная, ульта, пассивка, реакция');
    if (/data-a="(?!noop)/.test(h)) say('UI-кит: в разделе живые кнопки — нажатие меняло бы состояние');
    if (!team) scan(h, 'UI-кит');
  }
  run('режим «Игрок»', () => T.setTeam(false));
  for (const name of ['Книга · навыки на странице', 'Книга · мощь героя', 'Книга · снаряжение по местам', 'Книга · главы читаются']) {
    fresh(); const F = T.FLOWS.find(x => x[0] === name); if (!F) { say(`нет сценария «${name}»`); continue; }
    run('сценарий ' + name, () => F[2]()); const p = pageOf(view(`сценарий «${name}»`));
    if (!p) say(`сценарий «${name}»: книга не раскрыта`);
  }
}
done();
