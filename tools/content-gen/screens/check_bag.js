/* Автопроверка экрана «Ремесло → Запасы», сундуков и «Даров путешествия» (design/ui/screens/bag.js) — без браузера.
   1. index.html подключает screens/bag.js и screens/bag.css; концы строк index.html, bag.js и bag.css — только CRLF.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Запасы: семь вкладок — ресурсы, руны и ключи, осколки, призывы, сундуки, талисманы, снаряжение (слова автора 29.09.2026),
      артефактов в запасах нет; все значения фильтров (цикл, ремесло, редкость, вид, класс, слот), «не в рецептах», поиск с вводом
      в поле; карточка каждой записи.
      Видимые записи подходят под фильтры. Нигде нет исключений, undefined, NaN и объектов в разметке.
      «Правила воздуха»: над списком одна строка — поиск и «Фильтры», сами фильтры — в листе; у карточки ресурса одно действие,
      «Найденные рецепты» и «Откуда падает» — листы по нажатию, в листах — те же рецепты и источники без ссылок на ADR и §.
      Шарды рабочих: карточка ведёт «В артель» — «Ритуалы», вкладка «Рабочие», лист «Артель» (screens/rituals.js).
   3а. Сетка (слова автора 29.09.2026): в каждой вкладке записи — клетками 6 столбцов, в клетке только значок и число, без имени;
      пять рядов видно целиком на 932 × 430 и 844 × 390 (расчёт по CSS), шестой — прокрутка; выбор — карточка справа с именем.
      Значки талисманов, снаряжения и осколков героев — арт screens/art-icons.js, редкость — рамкой; у талисмана и предмета —
      переход в окно «Перековка» своим режимом и редкостью. Большие числа — коротко: «124К», «1,2М».
   3б. Осколки героев (ADR-0047): комплект — свой у каждого героя: у героя Эхо — по его циклу из roster.js, у героя рулетки — прежний;
      клетка, подсказка, карточка и полоса — от своего комплекта; прежних 50 герою Эхо мало. Прах Эха — запись кошелька во вкладке
      осколков со своим значком: отдельный ресурс, прах душ остаётся в «Рунах и ключах»; у несобранного героя Эхо — «Влить», когда прах
      Эха есть, и нет «Осколка» за прах душ; у героя рулетки — как прежде. До Эхо и без праха записи нет.
   4. Призывы: без обработчика — «недоступно»; с обработчиком кнопка зовёт ACTIVATE[ярус](id).
   5. Сундуки: во вкладке — только сундуки; каждый демо-сундук открывается по одному и пачкой; итог — крупно в той же карточке —
      сходится с запасами, кошельком, осколками и снаряжением; тот же сундук второй раз не открывается. Состав и шансы — лист по нажатию.
      Все виды × редкости × окна × циклы (× недели у сундуков с неделей) — карточка, лист состава и открытие,
      осколки пробуждённых героев возрождения душ уходят в прах, без флажка «для команды» — ни одного спойлерного имени.
      Новые записи (ADR-0047): гарантированные записи сундука — в карточке строкой «наверняка», в листе состава — блоком
      «Наверняка»; осколки героев Эхо делит цепочка целей недели — что ушло в прах Эха, итог называет строкой «прах Эха ×N»,
      кошелёк праха Эха сходится с итогом; сундуки КрафБоссов и артели — с отметкой темы на плитке.
   6. Дары: прошлая неделя (подсчитана) сходится с типичной EN_LOOTBOXES.week (кроме клановой доли режима со своим журналом — её
      сверяет check_clan.js); эта неделя — только взятые планки по состоянию режима (EN_WEEK.state, ADR-0031, п. 16), незаработанного
      нет; взятая планка Эхо после «Получить» на экране Эхо — «в запасах» (darGot); две категории, история и попап сундуков; одно действие на строку;
      «Получить» по строке и «Получить всё»; ждущее и полученное второй раз не выдаётся; полученное — в истории;
      кнопка «Дары» на экране недели; цикл I — без Даров.
   6а. Лестница планок в «Дарах» (ADR-0047), закон проверен мутацией: личная планка — ступень лестницы режима; набрали порог первой
      планки следующей полосы — она в «Дарах» под подписью с циклом полосы и платит сундуки своей полосы (редкость и число — строки
      полосы, содержимое — цикла игрока), планки своей полосы — свои; «Получить» выдаёт один раз, повтор — ничего, полученная —
      «в запасах» (darGot); клановые ступени контрактов — в клановых наградах, ждут распределения.
   7. Экран не читает прежний демо-инвентарь S.items; сброс состояния и сценарии презентации работают.
   Запуск: node tools/content-gen/screens/check_bag.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { strip, playerText, SERVICE } = require('./check_player_view.js');   // вид игрока: без элементов team-only (режим «Игрок / Команда»)
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const html = fs.readFileSync(path.join(UI, 'index.html'), 'utf8');
const err = [];
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };

/* 1. файлы */
const pureCrlf = (name, s) => {
  const crlf = (s.match(/\r\n/g) || []).length, lf = (s.match(/\n/g) || []).length, cr = (s.match(/\r/g) || []).length;
  if (crlf !== lf || cr !== crlf) say(`${name}: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}, CR ${cr}`);
};
pureCrlf('index.html', html);
for (const f of ['screens/bag.js', 'screens/bag.css']) pureCrlf(f, fs.readFileSync(path.join(UI, f), 'utf8'));
if (!html.includes('<script src="screens/bag.js"></script>')) say('index.html: не подключён screens/bag.js');
if (!html.includes('<link rel="stylesheet" href="screens/bag.css">')) say('index.html: не подключён screens/bag.css');
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
if (err.length) done();

/* 2. песочница: заглушка DOM; обработчики document запоминаются, чтобы проверить ввод в поиск */
const handlers = {};
const stubEl = id => ({ id, innerHTML: '', textContent: '', value: '', style: { setProperty() {} }, dataset: {}, children: [],
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x,
  insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 });
const els = {};
const document = { readyState: 'loading', addEventListener(t, f) { (handlers[t] = handlers[t] || []).push(f); }, getElementById: id => (els[id] = els[id] || stubEl(id)),
  querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
  documentElement: stubEl('html'), activeElement: null, fonts: null };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? fs.readFileSync(path.join(UI, s.src), 'utf8') : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();

/* доступ к именам скриптов: верхнеуровневые const и let — не свойства window */
const T = vm.runInContext(`({
  get S() { return S; }, set S(v) { S = v; },
  BAG, ACT, OV, SCREENS, CRAFT_SEGS, ACTIVATE, LBX, RSI, RS, RX, KH, FLOWS, EnLoot: window.EnLoot, render, initialState,
  zpEntries, zpView, zpChestGroups, zpOpenOne, zpCard, zpSrc, darRows, darCount, lbGiftRows, lbRowLabel, ZP_DEMO, ZP_FILT, trNorm, trEsc, DAR_CLAN: window.DAR_CLAN || {},
  WEEK: window.EN_WEEK, ECHO: window.EN_ECHO, darGot: typeof darGot === 'function' ? darGot : null,
  zpNum, zpCell, eqIcon: typeof eqIcon === 'function' ? eqIcon : null, talIcon: typeof talIcon === 'function' ? talIcon : null, shardGhost: typeof shardGhost === 'function' ? shardGhost : null,
  fmt, ZP_VIEW, CUR,
})`, ctx);
const BAD = /undefined|NaN|\[object /;
/* служебное глазами игрока — те же слова и шаблоны, что у check_player_view.js; обход там ограничен, здесь — каждая отрисовка
   экрана «Запасы» и его листов. Смотрим рабочую область и лист поверх: шапка и шахта — чужие */
const seenSvc = new Set();
function service(h, where) {
  if (T.KH.team) return;
  const i = h.indexOf('<main'), part = i < 0 ? h : h.slice(i), v = strip(part);
  const txt = playerText(part).split('\n').concat([...v.matchAll(/\s(?:title|placeholder)="([^"]*)"/g)].map(m => m[1]));
  for (const t of txt) for (const [what, re] of SERVICE) {
    const k = what + '|' + t; if (!re.test(t) || seenSvc.has(k)) continue;
    seenSvc.add(k); say(`${where}: игроку видно служебное (${what}) — «${t.slice(0, 100)}»`);
  }
}
const clean = (h, where) => { if (typeof h !== 'string') { say(`${where}: разметка не строка`); return ''; } if (BAD.test(h)) say(`${where}: в разметке undefined, NaN или объект — «${(h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/) || [''])[0]}»`); service(h, where); return h; };
const game = where => clean(els.game ? els.game.innerHTML : '', where);
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: ${e.message}`); return undefined; } };
const reset = () => { T.S = T.initialState(); T.S.route = 'craft'; T.S.seg.craft = 'stock'; };
const stock = (tab, where) => { T.S.route = 'craft'; T.S.seg.craft = 'stock'; T.S.overlay = null; T.S.zp.tab = tab; run(where, () => T.render()); return game(where); };
/* лист поверх запасов: разметка листа — из OV, как её рисует overlay() */
const sheetOf = (t, arg, where) => clean(run(where, () => T.OV[t]({ t, arg })) || '', where);
const snap = () => JSON.parse(JSON.stringify({ wallet: T.S.wallet, items: T.S.bag.items, shards: T.S.rs.shards, extra: T.S.zp.extra, eq: T.S.eq ? Object.keys(T.S.eq.items).length : 0, chests: T.S.bag.chests.length }));
const cnt = { tabs: 0, cards: 0, sheets: 0, filters: 0, open: 0, synth: 0, dust: 0, gifts: 0, claimed: 0 };

/* всё, что может выпасть из сундука, есть в recipes.js и roster.js — иначе оно легло бы в запасы невидимым */
{
  const ids = new Set(Object.keys(T.LBX.items).concat(T.LBX.pools.basic, ...['key', 'unique'].map(k => Object.values(T.LBX.pools[k]).flat())));
  for (const ln of Object.values(T.LBX.lines)) if (ln.kind === 'item') ln.by.filter(Boolean).forEach(b => ids.add(b[0]));
  const miss = [...ids].filter(id => !T.BAG.item(id)), hmiss = Object.values(T.LBX.pools.heroes).flat().filter(h => !T.RSI[h.id]).map(h => h.id);
  if (miss.length) say(`сундуки: предметов нет в recipes.js — ${miss.slice(0, 5).join(', ')}`);
  if (hmiss.length) say(`сундуки: героев пула нет в roster.js — ${hmiss.slice(0, 5).join(', ')}`);
}
/* спойлеры для игрока: талисманы со спойлером в имени, ресурсы цикла VI и записи recipes.js с team. Имя, которое совпадает со своей
   маской «ярус · цикл» (осколок и руна доблести цикла VI — их кладут сундуки КрафБоссов), спойлером не считается: маску игрок видит */
const spoilMask = new Set(T.RX.items.filter(i => i.team && T.RX.tiers[i.tier]).map(i => `${T.RX.tiers[i.tier].n} · цикл ${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][i.cyc]}`));
const spoil = [...new Set(Object.values(T.LBX.talInfo).filter(t => t[2]).map(t => t[0])
  .concat(Object.values(T.LBX.items).filter(i => i.team).map(i => i.n), T.RX.items.filter(i => i.team).map(i => i.n)))].filter(n => !spoilMask.has(n));
const leak = (h, where) => { const l = spoil.filter(n => h.includes(n)); if (l.length) say(`${where}: спойлер без флажка «для команды» — ${l.slice(0, 3).join(', ')}`); };

/* 3. запасы: вкладки, карточки, фильтры, поиск */
reset();
T.KH.team = false;
for (const tab of ['res', 'rune', 'shard', 'call', 'chest', 'tal', 'eq']) {
  const h = stock(tab, `вкладка ${tab}`); cnt.tabs++;
  if (!h.includes('zp-bar')) say(`вкладка ${tab}: нет строки вкладок`);
  const bar = [...h.matchAll(/data-a="zptab" data-v="([^"]+)"/g)].map(m => m[1]).join(',');
  if (bar !== ['res', 'rune', 'shard', 'call', 'chest', 'tal', 'eq'].join(',')) say(`вкладка ${tab}: вкладки запасов — ${bar}`);
  if (/data-v="art"|Артефакты Странника/.test(h)) say(`вкладка ${tab}: артефакты в запасах — им место в «Страннике»`);
  if (tab === 'chest' && T.zpEntries('chest').some(e => e.kind !== 'chest')) say('«Сундуки»: не только сундуки');
  /* воздух: над списком одна строка — поиск и «Фильтры»; выпадающих списков фильтров на экране нет */
  if (!h.includes('id="zpq"') || !h.includes('data-v="zpfilt"')) say(`вкладка ${tab}: над списком нет поиска или кнопки «Фильтры»`);
  if (/<select[^>]*data-a="zpf"/.test(h)) say(`вкладка ${tab}: фильтры снова выпадающими списками на экране — им место в листе`);
  const list = T.zpEntries(tab);
  if (!list.length && tab !== 'chest') say(`вкладка ${tab}: пусто в демо`);
  for (const e of list) {
    run(`${tab} · выбор ${e.key}`, () => T.ACT.zpsel(e.key));
    const g = game(`${tab} · карточка ${e.key}`); cnt.cards++;
    if (!g.includes('zp-card')) say(`${tab} · ${e.key}: нет карточки`);
    if (T.S.zp.sel[tab] !== e.key) say(`${tab} · ${e.key}: выбор не запомнен`);
    if (e.kind === 'item') {
      const card = g.slice(g.indexOf('zp-card')), uses = T.BAG.knownUses(e.id).filter(Boolean), src = e.it.team ? [] : T.zpSrc(e.it);
      /* воздух: у карточки ресурса одно главное действие; рецепты и источники — листы по нажатию */
      const acts = card.slice(card.indexOf('class="acts2"'));
      if ((acts.match(/class="btn go"/g) || []).length !== 1) say(`${tab} · ${e.key}: у карточки не одно главное действие`);
      if (uses.length && !card.includes(`data-v="zpuse:${e.id}"`)) say(`${tab} · ${e.key}: нет строки «Найденные рецепты»`);
      if (!uses.length && tab === 'res' && !card.includes('Ни в одном найденном рецепте')) say(`${tab} · ${e.key}: не сказано, что в найденных рецептах ресурса нет`);
      if (src.length && !card.includes(`data-v="zpsrc:${e.id}"`)) say(`${tab} · ${e.key}: нет строки «Откуда падает»`);
      /* §14.3 «загадка» ресурса — пометка Этриона (поле hint, crHint — screens/crafthall.js); лор — описание без подписи */
      if (!e.it.team && e.it.lore && !card.includes(T.trEsc(e.it.lore))) say(`${tab} · ${e.key}: в карточке нет описания`);
      if (!e.it.team && e.it.hint && typeof T.crHint === 'function' && !card.includes('Пометка Этриона')) say(`${tab} · ${e.key}: в карточке нет пометки Этриона — загадки ресурса`);
      if (card.includes('<b>Загадка</b>')) say(`${tab} · ${e.key}: описание подписано «Загадка» — загадка ресурса теперь пометка Этриона`);
      if (/ADR-|\(§/.test(strip(card))) say(`${tab} · ${e.key}: игроку видна ссылка на ADR или §`);
      const su = sheetOf('zpuse', e.id, `${tab} · ${e.key} · лист рецептов`), ss = sheetOf('zpsrc', e.id, `${tab} · ${e.key} · лист источников`); cnt.sheets += 2;
      for (const r of uses) if (!su.includes(T.trEsc(r.n))) say(`${tab} · ${e.key}: в листе рецептов нет «${r.n}»`);
      for (const s of src) if (!ss.includes(T.trEsc(s))) say(`${tab} · ${e.key}: в листе источников нет «${s}»`);
      if (/ADR-|\(§/.test(strip(su) + strip(ss))) say(`${tab} · ${e.key}: в листе игроку видна ссылка на ADR или §`);
      leak(su + ss, `${tab} · ${e.key} · листы`);
    }
  }
  leak(game(`вкладка ${tab}`), `вкладка ${tab}`);
}
/* 3а. сетка: клетка — значок и число, имя — в карточке; 6 столбцов, пять рядов видно целиком, дальше прокрутка */
reset();
{
  const CSS = fs.readFileSync(path.join(UI, 'screens', 'bag.css'), 'utf8').replace(/\s+/g, ' '), IH = html.replace(/\s+/g, ' ');
  const cssVar = (src, sel, name) => { const m = src.match(new RegExp(sel.replace(/[.[\]()]/g, '\\$&') + '\\{[^}]*?' + name + ':(\\d+)px')); return m ? +m[1] : NaN; };
  if (!/\.zp-grid\{[^}]*grid-template-columns:repeat\(6,var\(--zt\)\)/.test(CSS)) say('bag.css: сетка запасов не в шесть столбцов');
  /* высота сетки по CSS: кадр − шапка − поля экрана − строка вкладок − зазор − рамка и поля панели − поиск − зазор */
  const frames = [['.g', false], ['.g.sm', true]].map(([sel, sm]) => ({ sm, w: cssVar(IH, sel, 'width'), h: cssVar(IH, sel, 'height'), top: cssVar(IH, sel, '--top') }));
  const spM = cssVar(IH, ':root', '--sp-m'), tabH = cssVar(IH, '.tabs button', 'height'), tabPad = 3, bord = 1;
  const invGap = cssVar(IH, '.inv', 'gap'), invPad = cssVar(IH, '.inv', 'padding'), findH = cssVar(IH, '.search', 'height');
  const zt = { false: cssVar(CSS, '.zp-stock', '--zt'), true: +((CSS.match(/@container main \(max-height: 360px\)\{[^@]*?\.zp-stock\{--zt:(\d+)px/) || [])[1]) };
  const zg = { false: cssVar(CSS, '.zp-stock', '--zg'), true: +((CSS.match(/@container main \(max-height: 360px\)\{[^@]*?\.zp-stock\{[^}]*--zg:(\d+)px/) || [])[1]) };
  const nums = [spM, tabH, invGap, invPad, findH, zt.false, zt.true, zg.false, zg.true].concat(...frames.map(f => [f.w, f.h, f.top]));
  if (nums.some(x => !Number.isFinite(x))) say(`сетка запасов: не прочитаны размеры из CSS — ${JSON.stringify(nums)}`);
  else for (const f of frames) {
    const bar = tabH + 2 * tabPad + 2 * bord, list = f.h - f.top - 2 * spM - bar - spM - 2 * bord - 2 * invPad - findH - invGap;
    const t = zt[f.sm], g = zg[f.sm], five = 5 * t + 4 * g, six = 6 * t + 5 * g;
    if (five > list) say(`сетка запасов ${f.w} × ${f.h}: пять рядов (${five} px) не входят в ${list} px`);
    if (six <= list) say(`сетка запасов ${f.w} × ${f.h}: видно шесть рядов — просили пять`);
    if (t < 36) say(`сетка запасов ${f.w} × ${f.h}: клетка ${t} px — мельче зоны нажатия`);
  }
  for (const tab of ['res', 'rune', 'shard', 'call', 'chest', 'tal', 'eq']) {
    const h = stock(tab, `сетка · ${tab}`), W = T.zpView(tab);
    const grid = (h.match(/<div class="zp-grid[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/) || [])[1] || '';
    const cells = (grid.match(/<button class="zp-cell[ "]/g) || []).length;
    if (cells !== W.shown.length) say(`сетка · ${tab}: клеток ${cells}, записей ${W.shown.length}`);
    /* в клетке только значок и число: видимый текст сетки — числа, «/», «К», «М» */
    const txt = playerText(grid.replace(/<span class="(?:hsg-init|rs-ph|gl|res-gl)"[^>]*>[\s\S]*?<\/span>/g, '')).replace(/\s+/g, ' ').trim();   // инициалы вместо лица и знак руны (у иконки сеткой — номер поверх, res-gl) — значок, не имя
    if (/[A-Za-zА-Яа-яЁё]/.test(txt.replace(/[КМ]/g, ''))) say(`сетка · ${tab}: в клетках снова слова — «${txt.slice(0, 80)}»`);
    if (/zp-row|zp-gh/.test(h)) say(`сетка · ${tab}: остались строки или заголовки групп прежнего списка`);
    const e = W.shown[0]; if (!e) continue;
    run('сетка · выбор', () => T.ACT.zpsel(e.key));
    const g = game(`сетка · ${tab} · карточка`);
    if (!g.includes('aria-current="true"')) say(`сетка · ${tab}: выбранная клетка не отмечена`);
    if (!g.includes('class="serif zp-name"')) say(`сетка · ${tab}: у карточки справа нет имени`);
  }
  /* арт значков: талисманы, снаряжение, осколки героев — если выгружен */
  const art = [['tal', 'tal', T.talIcon], ['eq', 'equip', T.eqIcon], ['shard', 'hero', T.shardGhost]];
  for (const [tab, kind, f] of art) {
    const e = T.zpEntries(tab).find(x => x.kind === kind); if (!e) { say(`арт · ${tab}: в демо нет записи вида ${kind}`); continue; }
    const cell = T.zpCell(e, false), probe = !f ? '' : kind === 'tal' ? f('fight', 40) : kind === 'equip' ? f('main', 40) : f(e.h, 1, 2, 40);
    if (probe && !/ art"/.test(cell.match(/class="[^"]*"/)[0] + '"')) say(`арт · ${tab}: арт выгружен, а клетка без него`);
    if (probe && kind === 'hero' && !cell.includes('class="hsg"')) say('арт · осколки: нет призрачного осколка героя');
    if (!new RegExp(`data-r="${e.r}"`).test(cell)) say(`арт · ${tab}: у клетки нет редкости`);
  }
  /* переход в окно перековки из карточек талисмана и предмета */
  for (const [tab, kind] of [['tal', 'tal'], ['eq', 'equip']]) {
    const e = T.zpEntries(tab).find(x => x.kind === kind && x.r < 7); if (!e) continue;
    stock(tab, `перековка · ${tab}`); T.ACT.zpsel(e.key);
    const g = game(`перековка · ${tab} · карточка`);
    if (T.ACT.rfgo && !g.includes(`data-a="rfgo" data-v="${tab === 'tal' ? 'tal' : 'eq'}:${e.r}"`)) say(`перековка · ${tab}: у карточки нет перехода в окно перековки`);
    if (/data-v="(?:zptalforge|eqforge)"/.test(g)) say(`перековка · ${tab}: снова прежний лист перековки`);
  }
  /* большие числа — коротко */
  for (const [n, want] of [[9999, '9'], [12345, '12К'], [1234567, '1,2М']]) { const s = T.zpNum(n); if (!s.startsWith(want)) say(`коротко: ${n} → «${s}», ждали «${want}…»`); }
}
/* лист «Фильтры»: значения каждой вкладки — чипы; нажатие ставит фильтр, повторное — снимает; «Сбросить» чистит всё */
reset();
for (const tab of ['res', 'rune', 'shard', 'call', 'chest', 'tal', 'eq']) {
  T.S.zp.tab = tab;
  const O = T.zpView(tab).O, on = T.ZP_FILT[tab], h = sheetOf('zpfilt', '', `фильтры ${tab}`); cnt.sheets++;
  const want = [].concat(...['cyc', 'spec', 'r', 'cat', 'cls', 'slot'].map(k => on.includes(k) ? O[k].map(v => k + ':' + v) : []));
  for (const v of want) if (!h.includes(`data-a="zpf" data-v="${v}"`)) say(`фильтры ${tab}: нет значения ${v}`);
  if (on.includes('un') !== h.includes('data-a="zpun"')) say(`фильтры ${tab}: «не в найденных рецептах» ${on.includes('un') ? 'пропал' : 'лишний'}`);
  if (!h.includes('data-a="zpclr"')) say(`фильтры ${tab}: нет «Сбросить»`);
  const [k, x] = (want[0] || ':').split(':');
  if (k) {
    run(`фильтры ${tab} · ${want[0]}`, () => T.ACT.zpf(want[0]));
    if (T.S.zp.f[k] !== x) say(`фильтры ${tab}: ${want[0]} не поставился`);
    run(`фильтры ${tab} · ${want[0]} снова`, () => T.ACT.zpf(want[0]));
    if (T.S.zp.f[k] !== '') say(`фильтры ${tab}: повторное ${want[0]} не снял фильтр`);
    run(`фильтры ${tab} · ${want[0]}`, () => T.ACT.zpf(want[0]));
    if (!stock(tab, `фильтры ${tab} · кнопка`).includes('data-v="zpfilt" aria-pressed="true"')) say(`фильтры ${tab}: кнопка «Фильтры» не показывает, что фильтр стоит`);
  }
  if (on.includes('un')) { run(`фильтры ${tab} · un`, () => T.ACT.zpun()); if (!T.S.zp.f.un) say(`фильтры ${tab}: «не в найденных рецептах» не поставился`); }
  run(`фильтры ${tab} · сбросить`, () => T.ACT.zpclr());
  if (['cyc', 'spec', 'r', 'cat', 'cls', 'slot', 'un'].some(k => T.S.zp.f[k])) say(`фильтры ${tab}: «Сбросить» не сбросил`);
}
/* «На стол мастера» из карточки ресурса — действие toCraft; если мастерская подключена (CRAFT_SEGS.work), предмет уходит на её стол */
reset();
{
  const e = T.zpEntries('res')[0];
  stock('res', 'на стол мастера'); T.ACT.zpsel(e.key);
  if (!game('на стол мастера').includes(`data-a="toCraft" data-v="${e.id}"`)) say('карточка ресурса: нет кнопки «На стол мастера»');
  if (T.CRAFT_SEGS.work) {
    run('на стол мастера', () => T.ACT.toCraft(e.id)); game('мастерская после переноса');
    if (T.S.route !== 'craft' || T.S.seg.craft !== 'work') say('«На стол мастера»: не открылась мастерская');
  }
}
/* шарды рабочих: пробуждают их в листе «Артель» ритуалов (screens/rituals.js) — карточка ведёт туда одним действием */
reset();
{
  const k = 'wsh:w2:2'; T.S.zp.extra[k] = (T.S.zp.extra[k] || 0) + 3;
  const e = T.zpEntries('shard').find(x => x.kind === 'extra' && x.xk === 'wsh');
  if (!e) say('шарды рабочих: нет карточки во вкладке «Осколки»');
  else {
    stock('shard', 'шарды рабочих'); run('шарды рабочих · выбор', () => T.ACT.zpsel(e.key));
    const h = game('шарды рабочих · карточка');
    if (/позже/.test(h)) say('шарды рабочих: устаревшая строка «экран рабочих — позже»');
    if (T.OV.rtart) {
      if (!h.includes('data-a="zpartel"')) say('шарды рабочих: нет перехода «В артель»');
      run('«В артель»', () => T.ACT.zpartel()); game('артель после перехода');
      if (T.S.route !== 'rituals' || T.S.seg.rituals !== 'work' || !T.S.overlay || T.S.overlay.t !== 'rtart') say('«В артель»: не открылся лист «Артель» на вкладке «Рабочие» ритуалов');
    }
  }
}
/* осколки героев (ADR-0047): комплект — свой у каждого героя: у героя Эхо — по его циклу (rules.echoSet), у героя рулетки — прежний.
   Клетка — «собрано/нужно», пока запись входит в клетку (ZP_VIEW.frac знаков), иначе — только «собрано»; подсказка клетки, карточка
   и полоса — от комплекта своего героя. Прах Эха — запись кошелька во вкладке осколков: свой ресурс, а не прах душ (тот остаётся
   в «Рунах и ключах»). У несобранного героя Эхо, когда прах Эха есть, — «Влить» (окно количества — screens/heroes.js); общим прахом душ
   его не собрать — кнопки «Осколок» нет; у героя рулетки — «Осколок» за прах душ, как прежде, и «Влить» нет.
   zpShardLaw() — список нарушений: его же зовёт проверка мутацией. Функции экрана закон берёт живыми именами (live): мутация подменяет их */
const live = name => vm.runInContext(name, ctx);
function zpShardLaw() {
  const out = [];
  reset();
  const R = T.RS.rules, setOf = h => (h.src === 'echo' ? R.echoSet[h.c - 1] : R.stub.shards), pctOf = (n, h) => Math.min(100, Math.floor(n * 100 / setOf(h)));
  T.S.acc.cycle = 6; T.S.rs.shards = {};
  const pick = (src, c) => T.RS.heroes.find(h => h.src === src && h.c === c && !T.S.rs.owned[h.id]);
  const e2 = pick('echo', 2), e5 = pick('echo', 5), r2 = pick('roulette', 2), have = 3 * R.stub.shards;
  if (!e2 || !e5 || !r2 || !(setOf(e5) > setOf(e2)) || !(setOf(e2) > setOf(r2))) out.push('осколки: в составе нет героев Эхо циклов II и V с разными комплектами или героя рулетки');
  else {
    const n = Math.floor(setOf(e2) * 2 / 5), nr = Math.floor(setOf(r2) * 3 / 5), give = [[e2, n], [e5, n], [r2, nr]];
    for (const [h, q] of give) T.S.rs.shards[h.id] = q;
    T.S.wallet.edust = have;
    stock('shard', 'осколки · комплект');
    const es = T.zpEntries('shard'), ru = T.zpEntries('rune'), w = es.find(x => x.key === 'w:edust');
    if (!w || w.q !== have || es[0] !== w) out.push('осколки: праха Эха нет во вкладке осколков, остаток не тот или он не первым, рядом с осколками героев');
    if (!ru.some(x => x.key === 'w:dust') || ru.some(x => x.key === 'w:edust') || es.some(x => x.key === 'w:dust')) out.push('осколки: прах душ и прах Эха — не отдельные записи на своих вкладках');
    if (!T.CUR.edust || T.CUR.edust.img === T.CUR.dust.img) out.push('осколки: у праха Эха нет своего значка — его не отличить от праха душ');
    for (const [h, q] of give) {
      const e = es.find(x => x.key === 'h:' + h.id), tag = `осколки · ${h.n}`, N = setOf(h), echo = h.src === 'echo';
      if (!e) { out.push(`${tag}: нет записи во вкладке осколков`); continue; }
      const cell = live('zpCell')(e, false), frac = `${T.fmt(q)}/${T.fmt(N)}`, want = frac.length <= T.ZP_VIEW.frac ? frac : T.zpNum(q);
      if (!cell.includes(`<span class="q">${want}</span>`)) out.push(`${tag}: в клетке не «${want}»`);
      if (!cell.includes(`осколков ${T.fmt(q)} из ${T.fmt(N)}`)) out.push(`${tag}: в подсказке клетки нет «осколков ${q} из ${N}» — комплект не свой`);
      if (cell.includes('class="hsg"') && !new RegExp(`--s:${pctOf(q, h)}[;"]`).test(cell)) out.push(`${tag}: стекло осколка — не ${pctOf(q, h)} % комплекта героя`);
      run(`${tag} · выбор`, () => T.ACT.zpsel(e.key));
      const g = game(`${tag} · карточка`), card = g.slice(g.indexOf('zp-card'));
      if (!card.includes(`${T.fmt(q)}<span class="zp-of">/${T.fmt(N)}</span>`)) out.push(`${tag}: в карточке не «${q}/${N}»`);
      if (!card.includes(`style="--v:${pctOf(q, h)}"`)) out.push(`${tag}: полоса в карточке — не ${pctOf(q, h)} % комплекта героя`);
      if (echo) {
        if (/data-a="dustbuy"/.test(card) || !/Собирается осколками Эхо и прахом Эха: прахом душ этого героя не собрать/.test(card)) out.push(`${tag}: у героя Эхо есть «Осколок» за прах душ или нет честной строки «Собирается осколками Эхо и прахом Эха: прахом душ этого героя не собрать»`);
        if (!card.includes(`data-a="ehpour" data-v="${h.id}"`) || !card.includes(`на руках ${T.fmt(have)}`)) out.push(`${tag}: у несобранного героя Эхо нет «Влить» или остатка праха Эха`);
      } else if (!card.includes(`data-a="dustbuy" data-v="${h.id}"`) || /data-a="ehpour"/.test(card)) out.push(`${tag}: у героя рулетки пропал «Осколок» за прах душ или появился «Влить»`);
      if (!new RegExp(`data-a="activate" data-v="${h.id}"[^>]*disabled`).test(card)) out.push(`${tag}: «Пробудить» доступно без комплекта`);
    }
    /* комплект собран: клетка светится, «Пробудить» открыто, вливать нечего */
    T.S.rs.shards[e2.id] = setOf(e2);
    { const e = T.zpEntries('shard').find(x => x.key === 'h:' + e2.id), cell = live('zpCell')(e, false); run('осколки · комплект собран', () => T.ACT.zpsel(e.key));
      const g = game('осколки · комплект собран'), card = g.slice(g.indexOf('zp-card'));
      if (!/<span class="q full">/.test(cell)) out.push('осколки: собранный комплект героя Эхо в клетке не светится');
      if (new RegExp(`data-a="activate" data-v="${e2.id}"[^>]*disabled`).test(card) || /data-a="ehpour"/.test(card)) out.push('осколки: у героя Эхо с комплектом своего цикла «Пробудить» закрыто или осталось «Влить»'); }
    /* прежнего общего комплекта герою Эхо мало */
    T.S.rs.shards[e5.id] = R.stub.shards;
    { const e = T.zpEntries('shard').find(x => x.key === 'h:' + e5.id); run('осколки · прежний комплект', () => T.ACT.zpsel(e.key));
      const g = game('осколки · прежний комплект'), card = g.slice(g.indexOf('zp-card'));
      if (/<span class="q full">/.test(live('zpCell')(e, false)) || !new RegExp(`data-a="activate" data-v="${e5.id}"[^>]*disabled`).test(card)) out.push(`осколки: герой Эхо цикла V с ${R.stub.shards} осколками считается собранным — его комплект ${setOf(e5)}`); }
    /* праха Эха нет — «Влить» нет; запись кошелька остаётся: Эхо аккаунту открыто */
    T.S.wallet.edust = 0;
    { const e = T.zpEntries('shard').find(x => x.key === 'h:' + e5.id); run('осколки · без праха Эха', () => T.ACT.zpsel(e.key));
      const g = game('осколки · без праха Эха'), card = g.slice(g.indexOf('zp-card'));
      if (/data-a="ehpour"/.test(card) || !card.includes('на руках 0')) out.push('осколки: без праха Эха у героя Эхо есть «Влить» или не назван нулевой остаток');
      if (!T.zpEntries('shard').some(x => x.key === 'w:edust')) out.push('осколки: при нулевом остатке запись праха Эха пропала, хотя Эхо аккаунту открыто'); }
    /* карточка праха Эха: имя, остаток, что это отдельный ресурс, «Подробнее» и путь к героям Эхо */
    T.S.wallet.edust = have;
    { stock('shard', 'осколки · прах Эха'); run('осколки · прах Эха', () => T.ACT.zpsel('w:edust'));
      const g = game('осколки · карточка праха Эха'), card = g.slice(g.indexOf('zp-card'));
      if (!card.includes('Прах Эха') || !card.includes(`<b class="num">${T.fmt(have)}</b>`) || !/Отдельный ресурс/.test(card)) out.push('осколки · прах Эха: в карточке нет имени, остатка или слов «отдельный ресурс»');
      if (!card.includes('data-v="cur:edust"') || (T.ACT.ehcat && !card.includes('data-a="ehcat"'))) out.push('осколки · прах Эха: нет «Подробнее» или пути «К героям Эхо»');
      const sh = sheetOf('cur', 'edust', 'осколки · лист праха Эха'); cnt.sheets++;
      if (!sh.includes('Прах Эха') || !sh.includes(T.fmt(have))) out.push('осколки · лист праха Эха: нет имени или остатка'); }
    /* до Эхо (цикл I) и без праха Эха записи нет; прах появился — запись есть */
    reset(); T.S.acc.cycle = 1; T.S.wallet.edust = 0; T.S.rs.shards = {};
    if (T.zpEntries('shard').some(x => x.key === 'w:edust')) out.push('осколки: прах Эха виден до открытия Эхо и без единицы праха');
    stock('shard', 'осколки · цикл I'); T.S.wallet.edust = 1;
    if (!T.zpEntries('shard').some(x => x.key === 'w:edust')) out.push('осколки: прах Эха на руках, а записи во вкладке осколков нет');
    delete T.S.wallet.edust; stock('shard', 'осколки · кошелёк без поля праха Эха');
  }
  return out;
}
{
  zpShardLaw().forEach(say);
  /* проверка мутацией: ломаем правило вкладки осколков в песочнице — закон обязан упасть; затем слом снят и закон снова чист */
  const MUT = [
    ['комплект героя Эхо во вкладке осколков — прежний общий', `var __zn0 = zpNeed; zpNeed = function () { return RS.rules.stub.shards; };`, `zpNeed = __zn0;`],
    ['полоса в карточке — не от комплекта героя', `var __zc0 = zpCardHero; zpCardHero = function (x) { return __zc0(x).replace(/style="--v:\\d+"/, 'style="--v:100"'); };`, `zpCardHero = __zc0;`],
    ['клетка героя Эхо светится с прежнего общего комплекта', `var __ce0 = zpCell; zpCell = function (x, on) { var h = __ce0(x, on); return x.kind === 'hero' && x.q >= RS.rules.stub.shards ? h.replace('class="q"', 'class="q full"') : h; };`, `zpCell = __ce0;`],
    ['«Влить» в карточке героя Эхо пропал', `var __zc1 = zpCardHero; zpCardHero = function (x) { return __zc1(x).replace(/<button class="btn go ep-btn[\\s\\S]*?<\\/button>/, ''); };`, `zpCardHero = __zc1;`],
    ['герою Эхо в запасах продают «Осколок» за прах душ', `RS.rules.dustSrc.push('echo');`, `RS.rules.dustSrc.pop();`],
    ['прах Эха лежит в «Рунах и ключах», а не у осколков', `ZP_WALLET.push('edust'); ZP_WALLET_SHARD.length = 0;`, `ZP_WALLET.pop(); ZP_WALLET_SHARD.push('edust');`],
    ['запись праха Эха видна до Эхо и без праха', `var __eo0 = zpEchoOpen; zpEchoOpen = function () { return true; };`, `zpEchoOpen = __eo0;`],
    ['у праха Эха значок праха душ', `var __ci0 = CUR.edust.img; CUR.edust.img = CUR.dust.img;`, `CUR.edust.img = __ci0;`],
  ];
  let caught = 0;
  for (const [what, brk, fix] of MUT) {
    const n0 = err.length;   // что сломанный экран наговорит сам — тоже «поймано»
    let got = [];
    try { vm.runInContext(brk, ctx); got = zpShardLaw(); } catch (x) { got = ['исключение ' + x.message]; }
    try { vm.runInContext(fix, ctx); } catch (x) { say(`мутация «${what}»: не снялась — ${x.message}`); }
    got = got.concat(err.splice(n0));
    if (got.length) caught++; else say(`мутация «${what}»: закон вкладки осколков её не поймал`);
    if (process.argv.includes('--mut')) console.log(`мутация «${what}»: ${got.length ? got.slice(0, 2).join(' | ').slice(0, 320) : 'НЕ ПОЙМАНА'}`);
  }
  cnt.mutShard = `${caught} из ${MUT.length}`;
  zpShardLaw().forEach(x => say('осколки после мутаций: ' + x));
}
/* «новое»: демо-предметы из ZP_DEMO.fresh помечены, после выбора — нет */
reset();
{
  const e = T.zpEntries('res').find(x => x.id === 'u2');
  if (!e) say('демо: нет уникального u2 в запасах');
  else {
    stock('res', 'новое');
    if (!game('новое').includes('zp-dot')) say('вкладка «Ресурсы»: нет пометки «новое»');
    T.ACT.zpsel(e.key);
    if (!game('новое · карточка').includes('>новое<')) say('карточка нового предмета: нет пометки «новое»');
    T.ACT.zpsel(T.zpEntries('res')[0].key);
    if (!T.S.zp.seen['i:u2']) say('новое: после выбора предмет не отмечен просмотренным');
  }
}
/* фильтры: все значения по отдельности и вместе с поиском */
reset();
for (const tab of ['res', 'rune', 'shard', 'call', 'chest', 'tal', 'eq']) {
  T.S.zp.tab = tab;
  const O = T.zpView(tab).O;
  const tries = [{}, { un: true }];
  for (const k of ['cat', 'cls', 'slot']) for (const x of O[k]) tries.push({ [k]: x }, { [k]: x, r: O.r[O.r.length - 1] || '' });
  for (const c of O.cyc) tries.push({ cyc: c }, { cyc: c, un: true });
  for (const s of O.spec) tries.push({ spec: s }, { spec: s, cyc: O.cyc[0] || '' });
  for (const r of O.r) tries.push({ r }, { r, spec: O.spec[0] || '' });
  for (const q of ['а', 'клык', 'ЁЛКА', 'руна', 'сундук', 'zzz', '<b>"', ' ключ ']) tries.push({ q });
  for (const t of tries) {
    T.S.zp.f = { cyc: t.cyc || '', spec: t.spec || '', r: t.r || '', un: !!t.un, cat: t.cat || '', cls: t.cls || '', slot: t.slot || '' }; T.S.zp.q = t.q || '';
    const where = `фильтр ${tab} ${JSON.stringify(t)}`;
    const h = stock(tab, where); cnt.filters++;
    if (t.q && t.q.includes('<b>') && h.includes('value="<b>')) say(`${where}: поиск не экранирован`);
    const W = run(where, () => T.zpView(tab)); if (!W) continue;
    for (const e of W.shown) {
      if (W.E.cyc && String(e.cyc) !== W.E.cyc) say(`${where}: ${e.key} не того цикла`);
      if (W.E.spec && !(e.spec || '').split('+').includes(W.E.spec)) say(`${where}: ${e.key} не того ремесла`);
      if (W.E.r && String(e.r) !== W.E.r) say(`${where}: ${e.key} не той редкости`);
      if (W.E.un && (e.kind !== 'item' || T.BAG.knownUses(e.id).length)) say(`${where}: ${e.key} есть в найденном рецепте`);
      if (W.E.q && !T.trNorm(e.name).includes(W.E.q)) say(`${where}: ${e.key} не подходит под поиск`);
      if (W.E.cat && e.cat !== W.E.cat) say(`${where}: ${e.key} не того вида`);
      if (W.E.slot && e.slot !== W.E.slot) say(`${where}: ${e.key} не того слота`);
      if (W.E.cls && !(e.kind === 'tal' && (!e.cls || e.cls.includes(W.E.cls)))) say(`${where}: ${e.key} не подходит классу`);
    }
    if (!W.shown.length && W.all.length && !h.includes('Сбросить фильтры')) say(`${where}: пустой список без «Сбросить фильтры»`);
  }
  T.ACT.zpclr();
  if (T.S.zp.q || T.S.zp.f.cyc || T.S.zp.f.un) say(`${tab}: «Сбросить фильтры» не сбросил`);
}
/* ввод в поле поиска: обработчик input перерисовывает список */
{
  reset(); stock('res', 'поиск');
  const inputs = handlers.input || [];
  if (!inputs.length) say('поиск: нет обработчика ввода');
  for (const f of inputs) run('поиск: ввод', () => f({ target: { id: 'zpq', value: 'клык', selectionStart: 4 } }));
  if (T.S.zp.q !== 'клык') say('поиск: ввод не дошёл до состояния');
  const W = T.zpView('res');
  if (!W.shown.length || W.shown.some(e => !T.trNorm(e.name).includes('клык'))) say('поиск «клык»: список не отфильтрован');
  game('поиск: ввод');
}

/* 4. активации */
{
  reset();
  const prev = { ...T.ACTIVATE };
  for (const k of Object.keys(T.ACTIVATE)) delete T.ACTIVATE[k];
  const act = T.zpEntries('call');
  if (!act.length) say('призывы: в демо нет предметов ярусов act, call, echo');
  for (const e of act) {
    stock('call', 'призывы'); T.ACT.zpsel(e.key);
    if (!game(`активация ${e.id}`).includes('недоступно')) say(`активация ${e.id}: без обработчика нет пометки «недоступно»`);
  }
  const calls = [];
  for (const tier of ['act', 'call', 'echo']) T.ACTIVATE[tier] = id => calls.push(tier + ':' + id);
  for (const e of act) {
    T.ACT.zpsel(e.key);
    if (!game(`активация ${e.id} с обработчиком`).includes('data-a="zpact"')) say(`активация ${e.id}: с обработчиком нет кнопки`);
    run(`активация ${e.id}`, () => T.ACT.zpact(e.id));
  }
  const want = act.map(e => e.it.tier + ':' + e.id);
  if (JSON.stringify(calls) !== JSON.stringify(want)) say(`активации: вызваны ${calls.join(', ')}, ждали ${want.join(', ')}`);
  run('активация чужого предмета', () => T.ACT.zpact('нет-такого'));
  if (calls.length !== want.length) say('активация: предмет не из запасов вызвал обработчик');
  for (const k of Object.keys(T.ACTIVATE)) delete T.ACTIVATE[k];
  Object.assign(T.ACTIVATE, prev);
}

/* 5. сундуки: сверка итога с запасами, кошельком и осколками */
const sumCheck = (before, after, sum, where) => {
  const dust = Object.values(sum.dust).reduce((a, x) => a + x, 0);
  for (const k of new Set([...Object.keys(before.wallet), ...Object.keys(after.wallet)])) {
    /* прах душ — за осколки пробуждённых героев возрождения душ; прах Эха — осколки героев Эхо, которым не нашлось цели (sum.edust) */
    const d = (after.wallet[k] || 0) - (before.wallet[k] || 0), want = (sum.cur[k] || 0) + (k === 'dust' ? dust : 0) + (k === 'edust' ? sum.edust || 0 : 0);
    if (d !== want) say(`${where}: кошелёк ${k} изменился на ${d}, итог говорит ${want}`);
  }
  for (const id of new Set([...Object.keys(before.items), ...Object.keys(after.items)])) {
    const d = (after.items[id] || 0) - (before.items[id] || 0);
    if (d !== (sum.items[id] || 0)) say(`${where}: запас ${id} изменился на ${d}, итог говорит ${sum.items[id] || 0}`);
  }
  for (const id of new Set([...Object.keys(before.shards), ...Object.keys(after.shards)])) {
    const d = (after.shards[id] || 0) - (before.shards[id] || 0);
    if (d !== (sum.shards[id] || 0)) say(`${where}: осколки ${id} изменились на ${d}, итог говорит ${sum.shards[id] || 0}`);
  }
  for (const k of new Set([...Object.keys(before.extra), ...Object.keys(after.extra)])) {
    const d = (after.extra[k] || 0) - (before.extra[k] || 0);
    if (d !== (sum.extra[k] || 0)) say(`${where}: «из сундуков» ${k} изменилось на ${d}, итог говорит ${sum.extra[k] || 0}`);
  }
  /* снаряжение — предметами в запасах снаряжения: сколько создано, столько и назвал итог; каждый — во вкладке «Снаряжение» */
  const eqN = Object.keys(sum.eq || {}).length;
  if (after.eq - before.eq !== eqN) say(`${where}: снаряжения прибавилось ${after.eq - before.eq}, итог говорит ${eqN}`);
  for (const uid of Object.keys(sum.eq || {})) if (!T.zpEntries('eq').some(e => e.uid === uid)) say(`${where}: предмета ${uid} нет во вкладке «Снаряжение»`);
  if (before.chests - after.chests !== sum.n) say(`${where}: сундуков стало меньше на ${before.chests - after.chests}, открыто ${sum.n}`);
};
function openGroup(key, n, where) {
  T.S.route = 'craft'; T.S.seg.craft = 'stock'; T.S.overlay = null;
  T.S.zp.tab = 'chest'; run(where, () => T.ACT.zpsel(key));
  game(where + ' · карточка');
  if (n === 'max') run(where, () => T.ACT.zpn('max')); else for (let i = 1; i < n; i++) run(where, () => T.ACT.zpn('1'));
  const before = snap(), g = T.zpChestGroups().find(x => x.key === key), ids = g ? g.list.map(c => c.id) : [];
  const want = g ? (n === 'max' ? g.q : Math.min(n, g.q)) : 0;
  run(where, () => T.ACT.zpopen(key));
  const after = snap(), L = T.S.zp.last;
  if (!L || L.key !== key) { say(`${where}: нет итога открытия`); return []; }
  if (L.sum.n !== want) say(`${where}: открыто ${L.sum.n}, ждали ${want}`);
  sumCheck(before, after, L.sum, where);
  const h = game(where + ' · итог');
  /* итог — крупно в той же карточке (§14.4), состав и шансы — лист по нажатию */
  if (!h.includes('class="zp-res"') || !h.includes('Открыто: ')) say(`${where}: итог не в карточке`);
  if (!h.includes(`data-v="zpbox:${key}"`)) say(`${where}: после открытия нет «Состав и шансы»`);
  const box = sheetOf('zpbox', key, where + ' · состав'); cnt.sheets++;
  if (!box.includes('Возможное содержимое')) say(`${where}: в листе состава нет возможного содержимого`);
  /* пометка прототипа «в игре итог решает сервер» — команде; игроку — «каждый сундук открывается один раз» */
  if (!box.includes('решает сервер') || strip(box).includes('решает сервер')) say(`${where}: пометка «в игре итог решает сервер» — не только для команды`);
  if (!strip(box).includes('открывается один раз')) say(`${where}: игроку не видно «каждый сундук открывается один раз»`);
  cnt.open += L.sum.n;
  return ids.slice(0, want);
}
reset();
{
  const groups = T.zpChestGroups();
  if (groups.length < 5) say(`сундуки демо: групп ${groups.length}`);
  const first = groups[0], taken = first.list[0];
  const opened = openGroup(first.key, 1, `демо ${first.key} · один`);
  /* повтор: тот же сундук — ни через открытие, ни подложенный обратно в запасы */
  const before = snap(), sum = { n: 0, cur: {}, items: {}, shards: {}, dust: {}, dustQ: {}, extra: {} };
  if (run('повтор открытия', () => T.zpOpenOne(taken, sum))) say('повтор: открытый сундук открылся снова');
  T.S.bag.chests.push(taken);
  if (run('повтор подложенного', () => T.zpOpenOne(taken, sum))) say('повтор: подложенный обратно сундук открылся снова');
  T.S.bag.chests = T.S.bag.chests.filter(c => c !== taken);
  if (JSON.stringify(before) !== JSON.stringify(snap())) say('повтор: открытие уже открытого сундука что-то выдало');
  if (!opened.every(id => T.S.zp.opened[id])) say('открытые сундуки не записаны');
  for (const g of T.zpChestGroups()) openGroup(g.key, 'max', `демо ${g.key} · все`);
  if (T.S.bag.chests.length) say(`демо: неоткрытых сундуков осталось ${T.S.bag.chests.length}`);
  stock('chest', 'после открытия всех');
  for (const tab of ['res', 'rune', 'shard', 'call', 'chest', 'tal', 'eq']) for (const e of T.zpEntries(tab)) { T.S.zp.tab = tab; T.ACT.zpsel(e.key); game(`после открытия · ${e.key}`); }
}
/* все виды × редкости × окна × циклы (× недели у сундуков с неделей): половина героев недель и героев возрождения душ пробуждена —
   осколки героев возрождения душ уходят в прах, осколки героев Эхо — цели недели или в прах Эха */
reset();
{
  const pool = Object.values(T.LBX.pools.heroes).flat().concat(Object.values(T.LBX.pools.roulette || {}).flat());
  pool.forEach((h, i) => { if (i % 2 === 0 && T.RSI[h.id]) T.S.rs.owned[h.id] = { lvl: 0, lim: 0, valor: 0, how: 'souls' }; });
  const boxes = Object.keys(T.LBX.boxes), wins = Object.keys(T.LBX.winNames);
  /* неделя — у сундука, который её помнит: сундук осколков — все недели Эхо, «Урна имён» — две */
  const weeksOf = box => (!T.LBX.boxes[box].week ? [null] : box === 'shards' ? T.LBX.weeks : [T.LBX.weeks[0], T.LBX.weeks[2]]);
  const coMarkOf = vm.runInContext("typeof coMark === 'function' ? coMark : null", ctx);   // отметка темы сундука — screens/chest-open.js
  let k = 0, edustN = 0, sureN = 0, markN = 0;
  for (const box of boxes) for (let r = 1; r <= 7; r++) for (const win of wins) for (let cyc = 1; cyc <= 6; cyc++) for (const week of weeksOf(box)) {
    const spec = { box, r, cyc, win, src: 'проверка', seed: T.EnLoot.seedOf('проверка-' + (k++)) };
    if (week) spec.week = week;
    T.BAG.addChest(spec);
    const g = T.zpChestGroups().find(x => x.list.some(c => c.src === 'проверка'));
    const where = `${box} · ${r} · ${win} · цикл ${cyc}${week ? ' · ' + week : ''}`;
    T.S.zp.tab = 'chest'; T.S.zp.sel.chest = g.key; T.S.zp.n = 1;
    const card = clean(run(where, () => T.zpCard(T.zpView('chest').sel, 'chest')) || '', where + ' · карточка');
    /* карточка §14.4: тип, редкость, количество и «Открыть»; состав и шансы — лист по нажатию */
    if (!card.includes('data-a="zpopen"') || !card.includes(`data-v="zpbox:${g.key}"`)) say(`${where}: в карточке нет «Открыть» или «Состав и шансы»`);
    if (card.includes('Возможное содержимое')) say(`${where}: состав снова на карточке — ему место в листе`);
    const info = sheetOf('zpbox', g.key, where + ' · состав'); cnt.sheets++;
    if (!info.includes('Возможное содержимое')) say(`${where}: нет возможного содержимого`);
    /* гарантированные записи: карточка — строкой «наверняка», лист состава — блоком «Наверняка»; без них — ни того, ни другого */
    const def0 = T.EnLoot.resolve(T.LBX, { box, r, win, cyc, week: week || null }), sure = (def0.sure || []).length;
    if (card.includes('class="chip gold zp-sch"') !== sure > 0) say(`${where}: строка «наверняка» в карточке ${sure ? 'пропала' : 'лишняя'}`);
    if (info.includes('<table class="rk-tab lb-tab zp-sure">') !== sure > 0) say(`${where}: блок «Наверняка» в листе состава ${sure ? 'пропал' : 'лишний'}`);
    if (sure) { sureN++; if (!new RegExp('Наверняка · ' + sure + ' предмет').test(info)) say(`${where}: лист состава не называет ${sure} гарантированных`); }
    /* сундук с чужим рисунком — с отметкой темы на плитке: сундуки КрафБоссов и артели */
    const mark = coMarkOf ? coMarkOf(box) : null;
    if (!!mark !== /<i class="zp-tm" data-th="/.test(card)) say(`${where}: отметка темы на плитке сундука ${mark ? 'пропала' : 'лишняя'}`);
    if (mark) markN++;
    leak(card + info, where + ' · карточка');
    const before = snap();
    run(where, () => T.ACT.zpopen(g.key));
    const L = T.S.zp.last, after = snap();
    if (!L || L.sum.n !== 1) { say(`${where}: не открылся`); continue; }
    sumCheck(before, after, L.sum, where);
    if (Object.keys(L.sum.dust).length) cnt.dust++;
    const res = clean(run(where, () => T.zpCard(T.zpView('chest').sel, 'chest')) || '', where + ' · итог');
    if (!res.includes('class="zp-res"') || !res.includes('Открыто: ')) say(`${where}: итог не показан`);
    /* что ушло в прах Эха — строкой «прах Эха ×N»; не ушло — строки нет */
    const ed = L.sum.edust || 0;
    if (ed) edustN++;
    if (res.includes('class="zp-edl"') !== ed > 0) say(`${where}: строка праха Эха в итоге ${ed ? 'пропала' : 'лишняя'}`);
    if (ed && !res.includes(`прах Эха ×${T.fmt(ed)}`)) say(`${where}: итог не называет «прах Эха ×${T.fmt(ed)}»`);
    /* гарантированные записи выданы: в журнале итога они первыми и их столько, сколько в сундуке */
    const got = L.sum.log && L.sum.log[0] ? L.sum.log[0].items : [];
    if (got.filter(it => it.sure).length !== sure || got.slice(0, sure).some(it => !it.sure)) say(`${where}: гарантированных записей в итоге не ${sure} или они не первыми`);
    if (got.length !== sure + def0.n) say(`${where}: записей в итоге ${got.length}, в сундуке ${sure + def0.n}`);
    const kinds = ['items', 'shards', 'dust', 'extra', 'eq'].reduce((a, k) => a + Object.keys(L.sum[k] || {}).length, 0), rl = (res.match(/class="zp-rl[ "]/g) || []).length;
    if (rl !== kinds) say(`${where}: в итоге плиток ${rl}, получено видов ${kinds}`);
    const curN = Object.keys(L.sum.cur).length, rc = (res.match(/class="zp-rc"/g) || []).length;
    if (rc !== curN) say(`${where}: в итоге валют ${rc}, получено ${curN}`);
    leak(res, where + ' · итог');
    T.S.bag.chests = T.S.bag.chests.filter(c => c.src !== 'проверка');
    cnt.synth++;
  }
  if (!cnt.dust) say('осколки пробуждённых героев ни разу не ушли в прах');
  if (!edustN) say('осколки героев Эхо ни разу не стали прахом Эха — проверка строки «прах Эха» ничего не сторожит');
  if (!sureN) say('ни у одного сундука нет гарантированных записей — проверка «наверняка» ничего не сторожит');
  if (!markN) say('ни у одного сундука нет отметки темы — проверка отметки ничего не сторожит');
  cnt.edust = edustN; cnt.sure = sureN;
  for (const tab of ['res', 'rune', 'shard', 'call', 'chest', 'tal', 'eq']) { const h = stock(tab, `после всех видов · ${tab}`); leak(h, `после всех видов · ${tab}`); for (const e of T.zpEntries(tab)) { T.ACT.zpsel(e.key); leak(game(`после всех видов · ${e.key}`), `после всех видов · ${e.key}`); } }
}

/* 6. Дары путешествия */
/* лестница планок (ADR-0047) для «Даров» — эталон правила, подпись выплаты и мутации общие с проверками экранов режимов (ladder_laws.js):
   ступени игрока цикла c — своя полоса, за её верхней планкой — следующие полосы (первая — × next от верхней), сундуки — своей полосы */
const LADL = require('./ladder_laws.js'), ROMAN = LADL.ROMAN, darSame = LADL.same;
const darRef = (id, c) => LADL.ref(T.LBX, id, c);
/* подпись выплаты личной планки: своя полоса — как строка слоя, планка следующей полосы называет её цикл, потолок — себя */
const darLabel = (id, ly, p, c) => LADL.label(T.LBX, id, p, c, T.lbRowLabel);
reset();
{
  const c = T.S.acc.cycle, who = T.ZP_DEMO.gifts.who;
  const rows = T.darRows(T.S);
  if (!rows.length) say('Дары: нет строк выплат');
  /* прошлая неделя подсчитана: её планки и клановые строки — типичная неделя, сходится с EN_LOOTBOXES.week; режим, закрытый для аккаунта
     на той неделе (ZP_DEMO.gifts.gate: Лига без 15 героев или открытая только на этой), не платит ничего. Режим со своим журналом раздачи
     (DAR_CLAN: Клановый босс) платит клановую долю по журналу — её сверяет check_clan.js */
  const prevT = rows.filter(p => p.wk.id === 'prev' && p.kind !== 'place'), gate = T.ZP_DEMO.gifts.gate || {};
  for (const [mid, w] of Object.entries(T.LBX.week)) {
    if (!w[c] || T.DAR_CLAN[mid]) continue;
    const shut = typeof gate[mid] === 'function' && !!gate[mid](T.S, { id: 'prev' });
    const got = T.darCount(prevT.filter(p => p.id === mid)), want = shut ? 0 : w[c][who].boxes;
    if (got !== want) say(`Дары: ${mid}, прошлая неделя — сундуков в строках ${got}, в EN_LOOTBOXES.week ${want}`);
  }
  /* эта неделя (ADR-0031, п. 16): личные планки — ровно взятые по состоянию режима (EN_WEEK.state), «Получить» — только у взятой;
     клановые — только взятые кланом и ждут распределения. Незаработанного в «Дарах» нет */
  const nowP = rows.filter(p => p.wk.id === 'now' && (p.kind === 'plank' || (p.kind === 'clan' && !T.DAR_CLAN[p.id])));
  for (const [mid, m] of Object.entries(T.LBX.modes)) {
    if (!m.weekly || !T.LBX.week[mid] || !T.LBX.week[mid][c]) continue;
    const st = T.WEEK.state(mid, 'now'), shut = typeof gate[mid] === 'function' && !!gate[mid](T.S, { id: 'now' });
    const lm = m.layers.find(l => l.kind === 'plank' && !l.clan), lc = m.layers.find(l => l.kind === 'plank' && l.clan);
    for (const [ly, list, cat] of [[lm, st && !st.lock && !shut ? st.planks : [], 'me'], [lc, st && !st.lock && !shut ? st.clanPlanks : [], 'clan']]) {
      if (!ly || (cat === 'clan' && T.DAR_CLAN[mid])) continue;
      /* подпись выплаты: личная планка — ступень лестницы (своя полоса — как строка слоя, иначе называет цикл полосы), клановая — строка слоя */
      const lab = p => cat === 'me' ? darLabel(mid, ly, p, c) : T.lbRowLabel(ly, ly.rows[p.k - 1]);
      const want = list.filter(p => p.reached).map(lab).sort().join(), have = nowP.filter(p => p.id === mid && p.cat === cat).map(p => p.label).sort().join();
      if (want !== have) say(`Дары: ${mid}, эта неделя, ${cat} — в строках «${have}», взято по режиму «${want}»`);
      /* незаработанного в «Дарах» нет: ни одной строки с подписью невзятой планки */
      const not = list.filter(p => !p.reached).map(lab), bad = nowP.filter(p => p.id === mid && p.cat === cat && not.includes(p.label));
      if (bad.length) say(`Дары: ${mid}, ${cat} — выдаётся незаработанная планка «${bad[0].label}»`);
    }
  }
  for (const p of nowP) if (p.kind === 'plank' && p.st !== 'ok' && p.st !== 'got') say(`Дары: взятая планка ${p.key} без «Получить»`);
  for (const p of nowP) if (p.kind === 'clan' && p.st === 'ok') say(`Дары: клановая планка этой недели ${p.key} выдаётся до распределения`);
  /* демо: незаработанная планка Эхо не выдаётся — порог из данных режима (echo-rules.js, plank1 × x сундука); контракты 760 из 1 440 — три планки */
  const echoNeed = k => { const pk = T.ECHO ? T.ECHO.planks() : []; return pk[k - 1] ? pk[k - 1].need : Infinity; };
  for (const k of [1, 2, 3, 4, 5]) if (T.S.echo.score < echoNeed(k) && nowP.some(p => p.id === 'echo' && p.label.endsWith(' ' + k))) say(`Дары: планка Эхо ${k} выдаётся, а очков меньше порога`);
  /* контракты: клан демо взял первую клановую ступень — она в клановых наградах и ждёт распределения, как клановые планки Эхо и Событий */
  {
    const ct = T.WEEK.state('contract', 'now'), took = ct && !ct.lock ? ct.clanPlanks.filter(p => p.reached).length : 0, inDar = nowP.filter(p => p.id === 'contract' && p.cat === 'clan');
    if (ct && !ct.lock && !ct.clanPlanks.length) say('Дары: контракты не сообщили клановые ступени (clanPlanks) — §18.1, ADR-0047');
    if (inDar.length !== took || inDar.some(p => p.st !== 'wait')) say(`Дары: клановых ступеней контрактов взято ${took}, в «Дарах» — ${inDar.length}; до распределения — только «ждёт»`);
  }
  for (const p of rows) {
    if (!p.mode || !p.label || !p.period || !p.basis || !p.groups.length || !p.why) say(`Дары: строка ${p.key} без режима, периода, основания, планки или состава`);
    if (/ADR|§/.test(p.basis)) say(`Дары: в основании ссылка — ${p.basis}`);
  }
  const has = st => rows.some(p => p.st === st);
  if (!has('ok') || !has('wait') || !has('got')) say('Дары: в демо нет подтверждённого, ждущего или полученного');
  if (!rows.some(p => p.cat === 'clan' && p.st === 'ok') || !rows.some(p => p.cat === 'me' && p.st === 'wait')) say('Дары: нет подтверждённой клановой доли или ждущего места');
  const sheet = (where, arg) => { T.S.route = 'week'; T.S.overlay = { t: 'gifts', arg: arg || '' }; run(where, () => T.render()); const h = game(where); cnt.gifts++; leak(h, where); return h; };
  const N = T.darCount(rows.filter(p => p.st === 'ok'));
  for (const tab of ['me', 'clan', 'hist']) {
    T.S.zp.gifts.tab = tab;
    const h = sheet(`Дары · ${tab}`, tab);
    if (!h.includes(`${N} сундук`)) say(`Дары · ${tab}: нет «Доступно ${N} сундуков»`);
    if (tab !== 'hist' && (!h.includes('Подтверждено') || !h.includes('Ждёт подсчёта'))) say(`Дары · ${tab}: подтверждённое и ждущее не разделены`);
    if (/Открыть вс/i.test(h)) say(`Дары · ${tab}: есть «Открыть всё»`);
    /* §23.1 и воздух: две категории, история — не третья; одно действие на строку */
    const cats = (h.match(/role="tab"[^>]*data-a="dartab"/g) || []).length;
    if (cats !== 2) say(`Дары · ${tab}: категорий ${cats}, по §23.1 — две`);
    if (T.S.zp.gifts.tab !== tab) say(`Дары · ${tab}: открылось на «${T.S.zp.gifts.tab}»`);
    if (tab === 'hist' ? !/data-a="dartab" data-v="(?:me|clan)">[\s\S]{0,120}К наградам/.test(h) : !h.includes('data-a="dartab" data-v="hist"')) say(`Дары · ${tab}: нет перехода ${tab === 'hist' ? 'назад к наградам' : 'к истории'}`);
    for (const row of h.split('class="dar-row"').slice(1).map(s => s.split('class="dar-row"')[0])) {
      const acts = (row.slice(0, row.indexOf('</div>')).match(/data-a="/g) || []).length;
      if (acts > 1) { say(`Дары · ${tab}: в строке ${acts} действия`); break; }
    }
  }
  T.S.overlay = { t: 'darbox', arg: '' }; run('попап', () => T.render());
  const pop = game('попап сундуков');
  if (!pop.includes('dar-box') || !pop.includes('Возможное содержимое')) say('попап сундуков: нет иконок или состава');
  for (const k of (pop.match(/data-a="darpick" data-v="([^"]+)"/g) || []).map(s => s.replace(/.*data-v="|"$/g, ''))) { run('попап · выбор', () => T.ACT.darpick(k.replace(/&amp;/g, '&').replace(/&quot;/g, '"'))); game('попап · ' + k); cnt.gifts++; }
  /* клан: с экрана клана лист открывается на клановых наградах */
  T.S.route = 'clan'; T.S.zp.gifts.tab = 'me'; T.S.overlay = { t: 'gifts', arg: '' }; run('Дары с экрана клана', () => T.render()); game('Дары с экрана клана');
  if (T.S.zp.gifts.tab !== 'clan') say('Дары с экрана клана: открылись не на клановых наградах');
  /* «Получить» по строке: сундуки — в запасы, повтор и ждущее не выдаются */
  for (const p of T.darRows(T.S)) {
    const n0 = T.S.bag.chests.length;
    run(`получить ${p.key}`, () => T.ACT.darget(p.key));
    const d = T.S.bag.chests.length - n0, want = p.st === 'ok' ? T.darCount([p]) : 0;
    if (d !== want) say(`получить ${p.key} (${p.st}): сундуков +${d}, ждали +${want}`);
    run(`повтор ${p.key}`, () => T.ACT.darget(p.key));
    if (T.S.bag.chests.length - n0 !== want) say(`повтор ${p.key}: выдал второй раз`);
    if (p.st === 'ok') cnt.claimed++;
  }
  const after = T.darRows(T.S);
  if (after.some(p => p.st === 'ok')) say('Дары: после получения остались подтверждённые');
  /* экран Эхо: взятая и полученная в «Дарах» планка — «в запасах», невзятая — не получена */
  for (const p of T.ECHO ? T.ECHO.planks() : []) if (p.reached !== p.claimed) say(`Дары: планка Эхо ${p.k} — взята ${p.reached}, а на экране Эхо «в запасах» ${p.claimed}`);
  if (after.filter(p => p.st === 'wait').length !== rows.filter(p => p.st === 'wait').length) say('Дары: ждущее изменилось от «Получить»');
  const hist = sheet('Дары · история после получения', 'hist');
  if ((hist.match(/получено<\/span>/g) || []).length !== after.filter(p => p.st === 'got').length) say('Дары: история не совпадает с полученным');
  /* история — вид, не категория: «Дары» без аргумента после истории открываются на наградах */
  sheet('Дары · снова без аргумента');
  if (T.S.zp.gifts.tab === 'hist') say('Дары: открылись на истории, а не на наградах');
  T.S.zp.gifts.tab = 'me'; if (!sheet('Дары · всё получено').includes('Всё подтверждённое уже')) say('Дары: нет пометки «всё получено»');
  T.S.overlay = { t: 'darbox', arg: '' }; run('попап пустой', () => T.render()); if (!game('попап пустой').includes('Доступных сундуков нет')) say('попап: пустое состояние');
  /* выбор количества: «+», «+», «−» — открывается ровно столько */
  {
    const g = T.zpChestGroups().find(x => x.q >= 3);
    if (!g) say('Дары: нет вида сундука хотя бы в трёх экземплярах');
    else {
      T.S.route = 'craft'; T.S.seg.craft = 'stock'; T.S.overlay = null; T.S.zp.tab = 'chest';
      T.ACT.zpsel(g.key); T.ACT.zpn('1'); T.ACT.zpn('1'); T.ACT.zpn('-1');
      if (T.S.zp.n !== 2) say(`выбор количества: после «+ + −» стоит ${T.S.zp.n}`);
      if (!game('выбор количества').includes('Открыть 2')) say('выбор количества: на кнопке не «Открыть 2»');
      T.ACT.zpn('max'); if (T.S.zp.n !== g.q) say(`выбор количества: «все» дал ${T.S.zp.n}, сундуков ${g.q}`);
      T.ACT.zpn('1'); if (T.S.zp.n !== g.q) say('выбор количества: вышел за число сундуков');
      T.ACT.zpn('-1'); T.ACT.zpn('-1');
      const before = T.S.bag.chests.length; T.ACT.zpopen(g.key);
      if (before - T.S.bag.chests.length !== g.q - 2) say(`выбор количества: открыто ${before - T.S.bag.chests.length}, выбрано ${g.q - 2}`);
      cnt.open += before - T.S.bag.chests.length;
    }
  }
  /* сундуки из Даров открываются в запасах */
  for (const g of T.zpChestGroups()) openGroup(g.key, 'max', `из Даров ${g.key}`);
  /* «Получить всё» по категории */
  reset();
  for (const cat of ['me', 'clan']) {
    const ok = T.darRows(T.S).filter(p => p.cat === cat && p.st === 'ok'), n0 = T.S.bag.chests.length;
    run(`получить всё ${cat}`, () => T.ACT.darall(cat));
    if (T.S.bag.chests.length - n0 !== T.darCount(ok)) say(`получить всё ${cat}: сундуков +${T.S.bag.chests.length - n0}, ждали +${T.darCount(ok)}`);
    if (T.darRows(T.S).some(p => p.cat === cat && p.st === 'ok')) say(`получить всё ${cat}: остались подтверждённые`);
  }
  /* кнопка «Дары» на экране недели — доступное число */
  reset();
  T.S.route = 'week'; T.S.overlay = null; run('экран недели', () => T.render());
  const wk = game('экран недели'), n = T.darCount(T.darRows(T.S).filter(p => p.st === 'ok'));
  if (!wk.includes(`<small>${n} сундук`)) say(`экран недели: у «Дары» нет ${n} сундуков`);
  /* цикл I: рейтинговых режимов нет — Даров нет */
  T.S.acc.cycle = 1; T.S.overlay = { t: 'gifts', arg: '' }; run('Дары · цикл I', () => T.render());
  if (!game('Дары · цикл I').includes('с цикла II')) say('Дары · цикл I: нет пометки «с цикла II»');
  T.S.acc.cycle = 2;
}

/* 6а. Лестница планок в «Дарах» (ADR-0047). Лестница режима одна, сквозная, по очкам: за верхней планкой своей полосы сразу идут планки
   следующей — без перехода в новый цикл. Набрали порог первой планки следующей полосы — она взята и платит сундуки своей полосы:
   редкость и число — строки полосы, содержимое — цикла игрока; планки своей полосы платят свои; «Получить» выдаёт один раз.
   Порог — по эталону: первая планка режима × множитель ступени. darLadder() — список нарушений: его же зовёт проверка мутацией */
const DAR_SET = { contract: v => { T.S.contracts.pts = v; }, event: v => { T.S.event.pts = v; }, arena: v => { T.S.arena.wins = v; } };
function darLadder() {
  const e = []; let seen = 0;
  for (const [id, set] of Object.entries(DAR_SET)) {
    reset();
    const c = T.S.acc.cycle, M = T.LBX.modes[id], R = M && M.ladder, st0 = T.WEEK.state(id, 'now');
    if (!R || !st0 || st0.lock || !st0.planks.length) { e.push(`${id}: нет лестницы в данных или режим не сообщил планки`); continue; }
    const ly = M.layers.find(l => l.id === R.layer), ref = darRef(id, c), own = ref[0].band, n = ref.filter(r => r.band === own && !r.cap).length;
    if (ref.length <= n || ref[n].cap) continue;   // полоса последняя — продолжения нет
    const need = st0.planks[0].need * ref[n].x / ref[0].x, label = `${ly.one} ${n + 1} · цикл ${ROMAN[own + 1]}`, where = `лестница · ${id}`;
    if (darSame(ref[n].pay, ref[0].pay)) { e.push(`${where}: сундуки первой планки следующей полосы — те же, что своей: проверке нечего различать`); continue; }
    set(need); seen++;
    const rows = T.darRows(T.S).filter(p => p.wk.id === 'now' && p.id === id && p.kind === 'plank'), p = rows.find(x => x.label === label);
    if (rows.length !== n + 1) e.push(`${where}: набрано ${need} — взято планок ${n + 1}, а строк в «Дарах» ${rows.length}: ${rows.map(x => x.label).join(', ')}`);
    ref.slice(0, n).forEach((r, j) => { const q = rows.find(x => x.label === T.lbRowLabel(ly, ly.rows[j])); if (!q || !darSame(q.groups, r.pay)) e.push(`${where}: планка ${j + 1} своей полосы — в «Дарах» не её сундуки`); });
    if (!p) { e.push(`${where}: взятой планки следующей полосы нет в «Дарах» под подписью «${label}»`); continue; }
    if (p.st !== 'ok') e.push(`${where}: «${label}» взята, а «Получить» нет — ${p.st}`);
    if (!darSame(p.groups, ref[n].pay)) e.push(`${where}: «${label}» платит ${JSON.stringify(p.groups)}, а сундуки её полосы — ${JSON.stringify(ref[n].pay)}`);
    T.S.route = 'week'; T.S.zp.gifts.tab = 'me'; T.S.overlay = { t: 'gifts', arg: 'me' }; run(where, () => T.render());
    const h = game(where); cnt.gifts++;
    if (!h.includes(`<b>${M.n} · ${label}</b>`)) e.push(`${where}: подпись выплаты не называет полосу — «${M.n} · ${label}»`);
    /* «Получить»: сундуки редкости своей полосы и цикла игрока — в запасы, один раз */
    const n0 = T.S.bag.chests.length, want = ref[n].pay.reduce((a, g) => a + g.count, 0);
    run(`${where} · получить`, () => T.ACT.darget(p.key));
    const got = T.S.bag.chests.slice(n0);
    if (got.length !== want || got.some(ch => ch.box !== M.box || ch.cyc !== c || !ref[n].pay.some(g => g.r === ch.r && (g.win || 'step') === (ch.win || 'step')))) e.push(`${where}: «Получить» — сундуков +${got.length} (редкость/цикл: ${got.map(ch => ch.r + '/' + ch.cyc).join(', ')}), ждали ${want} — редкости полосы, цикла игрока ${c}`);
    run(`${where} · повтор`, () => T.ACT.darget(p.key));
    if (T.S.bag.chests.length !== n0 + want) e.push(`${where}: повтор «Получить» выдал планку следующей полосы второй раз`);
    if (T.darGot && (!T.darGot(id, n + 1) || T.darGot(id, n + 2))) e.push(`${where}: «в запасах» (darGot) — не у полученной планки ${n + 1} или у невзятой ${n + 2}`);
    cnt.claimed++;
  }
  if (!seen) e.push('лестница: ни один режим не проверен');
  return e;
}
{
  darLadder().forEach(say);
  /* проверка мутацией: ломаем алгоритм лестницы прототипа (EnLoot.ladder — его зовут «Дары» и помощник Недели) — закон обязан упасть */
  const LAD0 = T.EnLoot.ladder, MUT = LADL.mutations(LAD0);   // замок по циклу вернули; планка следующей полосы платит сундук своей; порог продолжения — не ×next
  let caught = 0;
  for (const [what, f] of MUT) {
    const n0 = err.length;   // что сломанный экран наговорит сам — это тоже «поймано», а не ошибка проверки
    T.EnLoot.ladder = f;
    let got = [];
    try { got = darLadder(); } catch (x) { got = ['исключение ' + x.message]; }
    T.EnLoot.ladder = LAD0;
    got = got.concat(err.splice(n0));
    if (got.length) caught++; else say(`мутация «${what}»: закон лестницы в «Дарах» её не поймал`);
    if (process.argv.includes('--mut')) console.log(`мутация «${what}»: ${got.length ? got.slice(0, 2).join(' | ').slice(0, 320) : 'НЕ ПОЙМАНА'}`);
  }
  cnt.mut = `${caught} из ${MUT.length}`;
  darLadder().forEach(x => say('после мутаций: ' + x));
}

/* 7. без S.items, сброс и сценарии презентации */
reset();
{
  delete T.S.items;
  for (const tab of ['res', 'rune', 'shard', 'call', 'chest', 'tal', 'eq']) { stock(tab, `без S.items · ${tab}`); for (const e of T.zpEntries(tab)) { T.ACT.zpsel(e.key); game(`без S.items · ${e.key}`); } }
  for (const g of T.zpChestGroups()) openGroup(g.key, 'max', `без S.items · ${g.key}`);
  T.S.route = 'week'; T.S.overlay = { t: 'gifts', arg: 'me' }; run('без S.items · Дары', () => T.render()); game('без S.items · Дары');
  run('без S.items · получить всё', () => T.ACT.darall('me'));
  T.S.overlay = { t: 'darbox', arg: '' }; run('без S.items · попап', () => T.render()); game('без S.items · попап');
}
reset();
if (!T.S.zp || !T.S.bag || !Object.keys(T.S.rs.shards).length) say('сброс: нет S.zp, S.bag или осколков демо');
for (const [t, , f] of T.FLOWS.filter(([t]) => /Запасы|Дары/.test(t))) { run(`сценарий ${t}`, () => { f(); T.render(); }); game(`сценарий ${t}`); }
for (const t of ['Запасы · сундуки', 'Дары путешествия', 'Запасы · талисманы', 'Запасы · снаряжение']) if (!T.FLOWS.some(([x]) => x === t)) say(`сценарии презентации: нет «${t}»`);

console.log(`Запасы: вкладок ${cnt.tabs}, карточек ${cnt.cards}, листов подробностей ${cnt.sheets}, наборов фильтров ${cnt.filters}. Сундуков открыто: демо и Дары ${cnt.open}, всех видов ${cnt.synth}, с переводом осколков в прах ${cnt.dust}, с прахом Эха ${cnt.edust || 0}, с гарантированными записями ${cnt.sure || 0}. Дары: отрисовок ${cnt.gifts}, получено выплат ${cnt.claimed}; лестница планок — мутаций поймано ${cnt.mut || 'нет'}; осколки героев и прах Эха — мутаций поймано ${cnt.mutShard || 'нет'}.`);
done();

function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log('Проверка пройдена: запасы, фильтры, карточки, сундуки и Дары — без исключений, undefined и NaN.');
  process.exit(0);
}
