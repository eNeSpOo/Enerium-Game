/* screens/library.js — «Библиотека Этриона»: шкаф героев на вкладках «Герои» — коллекция («Мои», «Каталог»), «За золото» и отряды.
   Слово автора 30.09.2026: «У нас очень хорошо прослеживается тема книг, а что если теперь сделать на всех вкладках вместо серой панели
   задний фон а-ля полки древней библиотеки? Идея какая: по сути души нам даёт Этрион, и по сути именно он нам даёт эти знания из своей
   картотеки из башни, и у нас уже герои в виде книг — пусть задний фон показывает, что они условно находятся на полках огромного
   древнего шкафа, каждая на своём ряде. И получается, что в отрядах панель слева — это буквально огромный шкаф, а то, где показан
   отряд, — это по сути полка. Вот снизу пока неудобная панель, её нужно будет продумать». Предложение исполнителя, которое автор видел:
   каждый ряд сетки — на дубовой полке с кронштейнами, задняя стенка шкафа, резные стойки, снизу бирюзовый свет карста, пыль в воздухе;
   «За золото» — тот же шкаф, картотека цикла, цена — латунной табличкой на кромке полки; отряды — слева высокий шкаф, отряд — отсек
   с пятью корешками и табличкой имени и мощи, справа выбранный отряд — одна полка крупным планом; нижняя панель — нижняя полка, где
   свободные герои стоят корешками. «За Энериум» и «За души» — другие залы башни, их шкаф не трогает.
   Регистрирует:
   — lbCase(o) — шкаф: карниз (на нём строка счётчиков, порядка и фильтра — правила воздуха, ADR-0026), резные стойки с ножками
     в свете кристалла, задняя стенка — прокрутка идёт вдоль шкафа, стойки и карниз стоят; лампады на стойках, свет карста снизу, пыль
     в луче (только transform и opacity, при «меньше движения» — без движения);
   — lbShelves(ячейки, o) — ряды книг: каждый ряд стоит на своей полке (доска с коваными кронштейнами, тень под ней). Книг в ряду —
     сколько встаёт в ширину шкафа, не уже o.min (lbCols — как сетка auto-fill); пустые полки дорисовываются до LB_VIEW.rows: видно,
     что это шкаф и место в нём есть;
   — lbTag(…) — латунная табличка на кромке полки: цена «За золото», имя и мощь отряда в отсеке шкафа;
   — долгое нажатие ([data-hold="действие:значение"]) — книга раскрывается; короткое — действие кнопки; правая кнопка мыши и клавиша
     меню — то же, что долгое;
   — lbRise — книга выезжает с нижней полки и встаёт в место отряда: только показ, отряд меняет операция SQ_SRV (screens/heroes.js);
   — раздел UI-кита «Библиотека Этриона».
   Корешок книги (hbSpine) — часть книги: screens/book.js. Экраны — screens/heroes.js (hcGridView, rsGoldView, hrSquadsView).
   Арт — tools/art-gen/jobs/library-shelves.json; бесшовность и нарезка — tools/art-gen/shelf_layers.py → LB_ART (тысячные доли
   рисунка, только целые). Пока пути нет в LB_ART.ready, шкаф рисует CSS. Числа вида — LB_VIEW. Своё состояние — S.lb.
   Автопроверки — tools/content-gen/screens/check_heroes.js (раздел «Библиотека Этриона») и check_squads.js. */
'use strict';

/* ================== вид: числа — здесь, в функциях только алгоритм. Вид, не баланс ==================
   Пары — [932 × 430, 844 × 390]: второе число — когда рабочая область не выше LB_VIEW.low (та же граница, что @container main
   (max-height: 360px) в стилях) */
const LB_VIEW = {
  low: 360,            // рабочая область не выше, px — компактный кадр
  scr: 12,             // поле экрана .scr (токен --sp-m), px: полку считаем без него
  top: [36, 34],       // карниз шкафа, px: на нём строка счётчиков, порядка и фильтра
  post: [14, 12],      // резные стойки по бокам, px
  pad: 8,              // поле ряда у стойки, px
  gap: 10,             // между книгами на полке, px
  air: 8,              // над книгами ряда — до полки выше, px
  plank: 18,           // доска полки, px: сверху — её верх (на нём стоят книги), ниже — кромка
  sink: 2,             // книга стоит на доске: верх доски выше низа обложки, px
  rows: 2,             // полок в шкафу не меньше: пустые дорисовываются
  cols: [3, 12],       // книг на полке — не меньше и не больше
  bracket: 20,         // кованый кронштейн под доской у стойки, px
  lamp: 20,            // лампада на стойке: ширина, px
  lampAt: 26,          // лампада висит на такой доле высоты шкафа, %
  wall: 360,           // плитка задней стенки на экране, px
  dust: 12,            // пылинок в луче света
  hold: 450,           // долгое нажатие — книга раскрывается, мс
  slop: 8,             // сдвиг пальца, после которого это прокрутка, а не нажатие, px
  rise: 460,           // книга с нижней полки встаёт в место отряда, мс
  /* отряды: слева — высокий шкаф, отряд — отсек; справа — полка отряда крупным планом и нижняя полка корешков */
  sq: {
    case: [220, 196],  // шкаф отрядов, px
    cmp: [74, 70],     // отсек: высота, px
    mini: [42, 38],    // корешок в отсеке: высота, px
    spine: [96, 84],   // корешок на нижней полке: высота, px
    sgap: 3,           // между корешками, px
    fgap: 14,          // между книгами на полке отряда, px
    near: 24,          // доска полки отряда крупным планом, px
    head: [26, 24],    // строка над нижней полкой: сколько героев, выбранное место, px
  },
};
/* арт шкафа (tools/art-gen/jobs/library-shelves.json, выгрузка export_ui.py в assets/art/bookcase/). ready — выгруженные пути: пока пути
   нет, шкаф рисует CSS. Геометрия — вывод tools/art-gen/shelf_layers.py, тысячные доли рисунка, только целые:
   plank.surf — где верх доски переходит в кромку (от верха полосы); cornice.band — тихая полоса карниза [сверху, снизу], на ней строка
   счётчиков; foot — ножка стойки: ширина к высоте и где на ней тело стойки [слева, справа] долями её ширины; bracket, lamp — ширина
   к высоте; css — то же для шкафа без арта */
const LB_ART = {
  ready: ['bookcase/wall.jpg', 'bookcase/plank.png', 'bookcase/cornice.png', 'bookcase/post.png', 'bookcase/post-foot.png', 'bookcase/bracket.png',
    'bookcase/lamp.png'],   // выгрузка 30.09.2026
  img: { wall: 'bookcase/wall.jpg', plank: 'bookcase/plank.png', cornice: 'bookcase/cornice.png', post: 'bookcase/post.png', foot: 'bookcase/post-foot.png',
    bracket: 'bookcase/bracket.png', lamp: 'bookcase/lamp.png' },
  plank: { surf: 186 },
  cornice: { band: [325, 342] },
  foot: { ratio: 959, post: [254, 231] },
  bracket: { ratio: 1049 },
  lamp: { ratio: 391 },
  css: { surf: 250, band: [200, 200] },
};

/* ================== помощники ================== */
const lbArt = p => LB_ART.ready.includes(p);
const lbSurf = () => (lbArt(LB_ART.img.plank) ? LB_ART.plank : LB_ART.css).surf;
const lbBand = () => (lbArt(LB_ART.img.cornice) ? LB_ART.cornice : LB_ART.css).band;
/* нарисованные части шкафа — адреса в переменные <html>, как у книги (book.js): класс у <html> говорит CSS, что рисунок есть.
   Имя флага не должно совпадать с классом элемента: прежний флаг карниза lb-c совпадал с ячейкой полки .lb-c, и её правила ложились на <html> */
(function lbArtVars() {
  const R = document.documentElement, st = R && R.style, I = LB_ART.img, abs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
  if (!st) return;
  const set = (k, p, cls) => { if (!lbArt(p)) return; try { st.setProperty(k, `url("${abs(p)}")`); if (R.classList) R.classList.add(cls); } catch (_) { } };
  set('--lb-wall', I.wall, 'lb-w'); set('--lb-plank', I.plank, 'lb-p'); set('--lb-cornice', I.cornice, 'lb-cz'); set('--lb-post', I.post, 'lb-s');
  set('--lb-foot', I.foot, 'lb-f'); set('--lb-bracket', I.bracket, 'lb-b'); set('--lb-lamp', I.lamp, 'lb-l');
})();
/* кадр игры: ширина, шахта, шапка и компактный ли он. В песочнице проверок и до первой отрисовки — кадр 932 × 430 (SHELL_SIZE) */
function lbFrame() {
  const g = typeof $game === 'function' ? $game() : null, sm = !!(g && g.classList && g.classList.contains && g.classList.contains('sm'));
  const f = SHELL_SIZE.frames[sm ? 1 : 0];
  let w = 0, h = 0, rail = 0, top = 0;
  try { w = g.offsetWidth; h = g.offsetHeight; const cs = getComputedStyle(g); rail = parseInt(cs.getPropertyValue('--rail'), 10); top = parseInt(cs.getPropertyValue('--top'), 10); } catch (_) { }
  w = w > 0 ? w : f[0]; h = h > 0 ? h : f[1]; rail = rail > 0 ? rail : f[3]; top = top > 0 ? top : f[2];
  return { w, h, rail, top, i: h - top <= LB_VIEW.low ? 1 : 0 };
}
/* книг на полке: сколько встаёт в ширину шкафа, не уже min (пара [932, 844]) — как сетка auto-fill */
function lbCols(min) {
  const F = lbFrame(), V = LB_VIEW, i = F.i, inner = F.w - F.rail - 2 * V.scr - 2 * V.post[i] - 2 * V.pad;
  return Math.max(V.cols[0], Math.min(V.cols[1], Math.floor((inner + V.gap) / (min[i] + V.gap))));
}
/* числа вида — в переменные шкафа: CSS берёт их отсюда, одна правда */
function lbVars() {
  const V = LB_VIEW, Q = V.sq, band = lbBand();
  return [`--lb-top0:${V.top[0]}px`, `--lb-top1:${V.top[1]}px`, `--lb-pw0:${V.post[0]}px`, `--lb-pw1:${V.post[1]}px`, `--lb-pad:${V.pad}px`, `--lb-gap:${V.gap}px`,
    `--lb-air:${V.air}px`, `--lb-pl:${V.plank}px`, `--lb-sink:${V.sink}px`, `--lb-su:${lbSurf()}`, `--lb-bt:${band[0]}`, `--lb-bb:${band[1]}`, `--lb-br:${V.bracket}px`,
    `--lb-brr:${LB_ART.bracket.ratio}`, `--lb-lw:${V.lamp}px`, `--lb-lr:${LB_ART.lamp.ratio}`, `--lb-la:${V.lampAt}%`, `--lb-wt:${V.wall}px`,
    `--lb-fr:${LB_ART.foot.ratio}`, `--lb-fl:${LB_ART.foot.post[0]}`, `--lb-fp:${LB_ART.foot.post[1]}`,
    `--lb-sqw0:${Q.case[0]}px`, `--lb-sqw1:${Q.case[1]}px`, `--lb-cm0:${Q.cmp[0]}px`, `--lb-cm1:${Q.cmp[1]}px`, `--lb-mn0:${Q.mini[0]}px`, `--lb-mn1:${Q.mini[1]}px`,
    `--lb-sp0:${Q.spine[0]}px`, `--lb-sp1:${Q.spine[1]}px`, `--lb-sg:${Q.sgap}px`, `--lb-fg:${Q.fgap}px`, `--lb-pn:${Q.near}px`, `--lb-lh0:${Q.head[0]}px`, `--lb-lh1:${Q.head[1]}px`,
    `--lb-rt:${V.rise}ms`].join(';');
}

/* ================== шкаф ==================
   Полка — доска: верх (на нём стоят книги) и кромка с железной полосой; кованые кронштейны у стоек; тень на задней стенке — ниже */
const lbPlank = (cls = '') => `<i class="lb-pl${cls ? ' ' + cls : ''}" aria-hidden="true"><i class="lb-br l"></i><i class="lb-br r"></i></i>`;
/* ряды книг на полках: ячейка — книга (и табличка на кромке); o.min — книга не уже, пара [932, 844]; o.rows — полок не меньше;
   o.empty — что сказать на пустой полке (пустой фильтр, закрытый каталог) */
function lbShelves(cells, o = {}) {
  const n = o.n || lbCols(o.min || HC_VIEW.card), rows = [];
  for (let i = 0; i < cells.length; i += n) rows.push(cells.slice(i, i + n));
  const want = o.rows != null ? o.rows : LB_VIEW.rows;
  if (!rows.length && o.empty) rows.push(null);
  while (rows.length < want) rows.push([]);
  const row = r => r === null ? `<div class="lb-row say"><div class="lb-bks"><div class="lb-c wide">${o.empty}</div><div class="lb-c"><i class="lb-ph"></i></div></div>${lbPlank()}</div>`
    : `<div class="lb-row${r.length ? '' : ' empty'}"><div class="lb-bks">${r.length ? r.map(c => `<div class="lb-c">${c}</div>`).join('') : '<div class="lb-c"><i class="lb-ph"></i></div>'}</div>${lbPlank()}</div>`;
  return { n, html: rows.map(row).join('') };
}
/* латунная табличка на кромке полки: цена, имя и мощь отряда */
const lbTag = (html, cls = '', title = '') => `<span class="lb-tag${cls ? ' ' + cls : ''}"${title ? ` title="${hrEsc(title)}"` : ''}>${html}</span>`;
/* пыль в луче: места и задержки — от номера, без случайности; движутся transform и opacity */
const lbDust = () => `<span class="lb-dust" aria-hidden="true">${Array.from({ length: LB_VIEW.dust }, (_, i) => `<i style="--x:${(i * 37 + 11) % 100}%;--y:${(i * 53 + 23) % 90}%;--dx:${(i * 29) % 34 - 17}px;--dy:${-18 - (i * 31) % 40}px;--d:${-((i * 733) % 9000)}ms;--s:${7000 + (i * 419) % 5000}ms"></i>`).join('')}</span>`;
/* шкаф: o.cls — свой класс (hk-case, hk-hire, tall, near); o.top — строка на карнизе; o.body — что внутри между стойками (прокрутка
   рядов или своё); o.lamps — лампады на стойках (по умолчанию — да) */
function lbCase(o = {}) {
  const lamps = o.lamps === false ? '' : '<i class="lb-lamp l" aria-hidden="true"></i><i class="lb-lamp r" aria-hidden="true"></i>';
  return `<div class="lb-case${o.cls ? ' ' + o.cls : ''}" style="${lbVars()}">
    <div class="lb-top"><i class="lb-cn" aria-hidden="true"></i>${o.top || ''}</div>
    <div class="lb-body">${o.body || ''}<i class="lb-post l" aria-hidden="true"></i><i class="lb-post r" aria-hidden="true"></i>${lamps}<i class="lb-glow" aria-hidden="true"></i>${lbDust()}</div>
  </div>`;
}

/* ================== книга встаёт в место отряда ==================
   Нажатие на корешок нижней полки: операция SQ_SRV уже поставила героя (heroes.js, ACT.sqput) — здесь только показ. Время — от нажатия
   (S.lb.rise.t0): перерисовка посреди не рвёт показ; откуда — место корешка в кадре игры, куда — место книги после отрисовки (en-render) */
const lbNow = () => (typeof hbNow === 'function' ? hbNow() : 0);
function lbRise(i, hid, t) {
  if (!S.lb) return;
  const r = t && typeof hbRect === 'function' ? hbRect(t) : null;
  S.lb.rise = { i, hid, t0: lbNow(), from: r && r.w > 0 ? r : null };
}
/* место отряда сейчас встаёт: класс и задержка (момент − прошло) или '' */
function lbRiseOf(i, hid) {
  const R = S.lb && S.lb.rise;
  if (!R || R.i !== i || R.hid !== hid) return '';
  const e = lbNow() - R.t0;
  return e >= 0 && e < LB_VIEW.rise ? { d: -e } : '';
}
window.addEventListener('en-render', () => {
  const R = S && S.lb && S.lb.rise; if (!R || !R.from) return;
  try {
    const el = document.querySelector('.g .lb-slot.rise'), b = el && el.querySelector('.hb'), to = b && typeof hbRect === 'function' ? hbRect(b) : null;
    if (!el || !to || !(to.w > 0)) return;
    el.style.setProperty('--lb-dx', `${R.from.x + Math.floor(R.from.w / 2) - to.x - Math.floor(to.w / 2)}px`);
    el.style.setProperty('--lb-dy', `${R.from.y + Math.floor(R.from.h / 2) - to.y - Math.floor(to.h / 2)}px`);
    el.style.setProperty('--lb-sc', String(Math.max(1, Math.floor(R.from.h * 1000 / to.h))));   // ‰: корешок ниже книги
  } catch (_) { }
});

/* ================== долгое нажатие ==================
   [data-hold="действие:значение"]: удержание LB_VIEW.hold мс — действие (книга раскрывается), щелчок после него не срабатывает; сдвиг
   дальше LB_VIEW.slop — это прокрутка полки, не нажатие. Правая кнопка мыши и клавиша меню — сразу то же действие */
(function lbHold() {
  if (typeof document === 'undefined' || !document.addEventListener) return;
  let tm = 0, el = null, x0 = 0, y0 = 0, done = false;
  const stop = () => { if (tm) clearTimeout(tm); tm = 0; el = null; };
  const fire = b => { const s = String(b.getAttribute('data-hold') || ''), k = s.indexOf(':'), f = ACT[k < 0 ? s : s.slice(0, k)]; if (f) f(k < 0 ? '' : s.slice(k + 1), b); };
  const at = e => (e.target && e.target.closest ? e.target.closest('[data-hold]') : null);
  document.addEventListener('pointerdown', e => {
    done = false; stop();
    const b = at(e); if (!b || (e.button != null && e.button !== 0) || b.disabled) return;
    el = b; x0 = e.clientX; y0 = e.clientY;
    tm = setTimeout(() => { tm = 0; const t = el; el = null; if (!t || !t.isConnected) return; done = true; fire(t); }, LB_VIEW.hold);
  }, true);
  document.addEventListener('pointermove', e => { if (el && Math.max(Math.abs(e.clientX - x0), Math.abs(e.clientY - y0)) > LB_VIEW.slop) stop(); }, true);
  for (const k of ['pointerup', 'pointercancel', 'scroll']) document.addEventListener(k, stop, true);
  document.addEventListener('click', e => { if (!done) return; done = false; e.preventDefault(); e.stopPropagation(); }, true);
  document.addEventListener('contextmenu', e => { const b = at(e); if (!b) return; e.preventDefault(); if (done) return; stop(); done = true; fire(b); }, true);
})();

/* ================== ширина шкафа изменилась — книг на полке другое число ==================
   Кадр игры сменил размер (932 ↔ 844, телефон): если на полке встаёт другое число книг — перерисовка. Без ResizeObserver — ничего */
(function lbWatch() {
  if (typeof ResizeObserver !== 'function' || typeof document === 'undefined') return;
  let last = '';
  const sig = () => `${lbCols(HC_VIEW.card)}:${lbCols(HC_VIEW.gold)}`;
  const hook = () => {
    const g = typeof $game === 'function' ? $game() : null; if (!g) return;
    last = sig();
    new ResizeObserver(() => { const k = sig(); if (k === last) return; last = k; if (S && S.route === 'heroes') render(); }).observe(g);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
})();

/* ================== состояние ================== */
function lbState(s) { s.lb = { rise: null }; return s; }
const lbInitBase = initialState;
initialState = function () { return lbState(lbInitBase()); };
lbState(S);

/* ================== UI-кит: раздел «Библиотека Этриона» ==================
   Шкаф с двумя полками, полка «За золото» с табличками, отсек отряда, полка отряда крупным планом, нижняя полка корешков пяти ступеней
   и семи редкостей; что где нажимать; команде — откуда арт и числа */
KIT_EXTRA.push({ html: lbKitHtml });
function lbKitHtml() {
  if (!RS.heroes.length) return '';
  const noop = h => h.replace(/data-a="[^"]*"/g, 'data-a="noop"').replace(/ data-hold="[^"]*"/g, '');
  const mine = hcOwnList(), V = LB_VIEW;
  const books = mine.slice(0, 8).map(v => hbCard(v, { z: 'l', act: 'noop' }));
  const shelf = lbShelves(books, { n: 5, rows: 2 });
  const demo = noop(lbCase({ cls: 'hk-case lbk-case', top: `<div class="hkh"><span class="eyebrow">Мои · ${mine.length}</span></div>`, body: `<div class="hkg lb-shv" style="--n:${shelf.n}">${shelf.html}</div>` }));
  const gold = RS.heroes.filter(h => h.src === 'gold' && h.c === rsCyc()).slice(0, 4).map(hcView).filter(Boolean);
  const k = rsBought(rsCyc()) + 1, price = rsGold(rsCyc(), k);
  const gcells = gold.map(v => hbCard(v, { z: 'l', act: 'noop', own: true }) + (v.own ? lbTag(`${ic('check')}в коллекции`, 'own') : lbTag(`<img src="${curImg('gold')}" alt="">${`<b class="num">${fmt(price)}</b>`}`)));
  const gs = lbShelves(gcells, { n: 4, rows: 1 });
  const gdemo = noop(lbCase({ cls: 'hk-hire gold lbk-gold', lamps: false, top: `<div class="hkh"><span class="eyebrow">Картотека цикла ${ROMAN[rsCyc()]}</span></div>`, body: `<div class="hkg lb-shv" style="--n:${gs.n}">${gs.html}</div>` }));
  const rh = RS.heroes.find(h => h.src === 'roulette' && typeof RS_ART !== 'undefined' && RS_ART.has(h.id)) || RS.heroes[0], base = hcView(rh);
  const mk = o => Object.assign({}, base, { own: true, st: 3, acc: null, busy: '', lvl: 150, cap: 150, lim: 1, valor: 0 }, o);
  const tiers = [1, 2, 3, 4, 5].map(t => hbSpine(mk({ maxV: t, r: t + 1, lvl: [34, 150, 350, 700, 1200][t - 1] }), { tag: 'span' })).join('');
  const rars = [1, 2, 3, 4, 5, 6, 7].map(r => hbSpine(mk({ maxV: 3, r }), { tag: 'span' })).join('');
  const busy = mine[0] ? hbSpine(Object.assign({}, mine[0], { busy: 'Забег · Мастерская' }), { tag: 'span', dim: true }) : '';
  const minis = [1, 2, 3, 4, 5].map(t => hbSpine(mk({ maxV: t, r: t + 2 }), { tag: 'span', z: 's' })).join('');
  const O = HB_VIEW.open;
  return `<section class="k-box lbk" style="grid-column:1/-1" id="kitLibrary"><h3>Библиотека Этриона</h3>
    <p class="k-note">Герои — книги из картотеки Этриона, и стоят они на полках огромного древнего шкафа: каждый ряд — на своей полке. Карниз держит строку счётчиков, порядка и фильтра; стойки и карниз стоят, а прокрутка идёт вдоль шкафа. Свет — снизу, бирюзой карста; лампады на стойках; пыль в луче. Фон тёмный и тихий — он не спорит с книгами.</p>
    <div class="lbk-demo">${demo}</div>
    <p class="k-note">«За золото» — тот же шкаф: картотека цикла, цена найма — латунной табличкой на кромке полки под книгой, у купленного — «в коллекции». «За Энериум» и «За души» — другие залы башни.</p>
    <div class="lbk-demo gold">${gdemo}</div>
    <p class="k-note">Корешок — книга на полке боком: материал — ступень книги (как обложка), кристалл и ярлык — редкость, значок — класс, внизу — уровень, на ярлыке — имя. В отряде — нижняя полка свободных героев корешками: нажатие — книга выезжает и встаёт в выбранное место отряда (или в первое пустое), удержание — книга раскрывается; перестановка — нажать место, потом другое.</p>
    <div class="lbk-row"><div class="lbk-sp">${tiers}</div><div class="lbk-sp">${rars}</div><div class="lbk-sp">${busy}</div><div class="lbk-sp mini">${minis}</div></div>
    <p class="k-note">Слева в отрядах — высокий шкаф: отряд — отсек с пятью маленькими корешками и табличкой имени и мощи на кромке. Справа — выбранный отряд на одной полке крупным планом. Открытие книги продолжает картину: книга выдвигается с полки к игроку корешком, разворачивается обложкой — и раскрывается.</p>
    ${TM(`<p class="k-note">Слово автора 30.09.2026 — шкаф вместо серых панелей. Арт — tools/art-gen/jobs/library-shelves.json (стенка, полка, карниз, стойка и ножка, кронштейн, лампада, корешки пяти ступеней), бесшовность и нарезка — tools/art-gen/shelf_layers.py → LB_ART и HB_ART.spines. Выгружено ${LB_ART.ready.length} путей шкафа (LB_ART.ready) и ${[1, 2, 3, 4, 5].filter(t => hbArt(HB_ART.spine(t))).length} корешков; без пути шкаф и корешок рисует CSS. Книг на полке — lbCols: сколько встаёт в ширину, не уже HC_VIEW.card (коллекция) и HC_VIEW.gold («За золото»); полок не меньше ${V.rows}; удержание — ${V.hold} мс, сдвиг ${V.slop} px — прокрутка; книга встаёт в место отряда за ${V.rise} мс; выдвигается с полки за ${O.pull} мс.</p>`)}
  </section>`;
}
