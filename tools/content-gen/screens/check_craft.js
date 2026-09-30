/* Автопроверка экрана «Ремесло → Мастерская» прототипа — без браузера.
   Экран — design/ui/screens/craft.js и craft.css, договор — screens/model.js, правила — GDD §12, §36.12, §36.16.
   1. craft.js и craft.css подключены в index.html после model.js; craft.js компилируется; концы строк своих файлов — CRLF.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Экран и его листы рисуются во всех состояниях: пустой стол, найденный рецепт, лишнее, неудача, подсказки
      (появление, новая позиция, послабление по количеству), случайное открытие, герой из рецепта, книга на всё окно (подробно — check_recipe_book.js: вкладки, вид,
      избранное, поиск), автодокрафт (остановка на неизвестном этапе, согласие на невосполнимое, количество), сведения о ресурсе.
      В разметке — ни исключений, ни undefined, NaN, [object; ни полей «для команды»: обоснований рецептов, спойлеров цикла VI,
      будущих биомов и боссов (§12.5); в режиме «Игрок» — ни одного служебного слова из check_player_view.js.
      «Правила воздуха»: у стола и книги нет лишних подписей, сведения о ресурсе — лист по нажатию.
   4. Запасы меняются как положено: попытка списывает весь стол, неудача ничего не создаёт, повторное нажатие не повторяет расход,
      особый ресурс без согласия не списывается; рецепт героя кладёт в запасы комплект его осколков — героя пробуждают души (стадии
      знакомства, решение автора 30.09.2026), он придёт с 0 ур., 0 РП и 0 Добл.
   5. Все классы ws-* из craft.js описаны в craft.css; ни в одном теге нет второго style или class.
   5а. Ввод ресурса (слова автора 29.09.2026): запасы — по пять в ряд, плитки крупнее прежних 48 px; у каждой плитки справа сверху
      лупа — карточка ресурса; нажатие — ползунок от 0 до min(100, запас), подтверждение кладёт ресурс в ячейку ровно в выбранном
      количестве; ресурс на столе — ползунок на его количестве, 0 — убрать; перенос на ячейку и «На стол» из карточки и других
      экранов — тот же ползунок; полный стол — отказ без ползунка; количество выбранной ячейки — ползунок под столом.
   6. Анимация удачи и неудачи: итог выдан сервером до анимации одной операцией с номером, повтор номера ничего не меняет;
      полная версия — новый рецепт с книгой и герой; короткая — известный рецепт, автодокрафт, серия; короткая без листа закрывается
      строкой; неудача — нити рвутся, трещины, пепел, что сгорело, подсказка только положенная; нажатие на сцену и галочка — сразу итог,
      «меньше движения» — без анимации; таймеры показа — в свои моменты; моменты и задержки — целые мс; трещины и дым — от сида
      операции; места круга совпадают со столом; раздел UI-кита — пробы и раскадровка, проба — не выдача; ключевые кадры — только
      transform и opacity.
   Запуск: node tools/content-gen/screens/check_craft.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { strip, playerText, SERVICE } = require('./check_player_view.js');   // вид игрока: без элементов team-only, служебные слова
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const html = fs.readFileSync(path.join(UI, 'index.html'), 'utf8');
const JS = fs.readFileSync(path.join(UI, 'screens', 'craft.js'), 'utf8');
const CSS = fs.readFileSync(path.join(UI, 'screens', 'craft.css'), 'utf8');
const err = [], warn = [];
let drawn = 0;

/* 1. файлы */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const order = scripts.map(s => s.src || '');
if (!html.includes('href="screens/craft.css"')) err.push('index.html: не подключён screens/craft.css');
if (order.indexOf('screens/craft.js') < 0) err.push('index.html: не подключён screens/craft.js');
else if (order.indexOf('screens/craft.js') < order.indexOf('screens/model.js')) err.push('index.html: craft.js подключён раньше model.js');
try { new vm.Script(JS, { filename: 'craft.js' }); } catch (e) { err.push('синтаксис craft.js: ' + e.message); }
for (const [f, t] of [['craft.js', JS], ['craft.css', CSS]]) {
  const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
  if (crlf !== lf) err.push(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`);
}
/* 5. классы */
const defined = new Set((CSS.match(/\.ws-[a-z0-9-]+/g) || []).map(s => s.slice(1)));
for (const c of new Set(JS.match(/\bws-[a-z0-9-]+/g) || [])) if (!defined.has(c)) err.push(`craft.css: не описан класс ${c}`);
if (err.length) done();

/* 2. песочница */
const stubEl = id => ({ id, innerHTML: '', textContent: '', value: '', style: { setProperty() {} }, dataset: {}, children: [],
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x,
  insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 });
const els = {};
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
  createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: stubEl('html'), activeElement: null, fonts: null };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? fs.readFileSync(path.join(UI, s.src), 'utf8') : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { (/^screens\/(?!craft|model)/.test(s.src || '') ? warn : err).push(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
vm.runInContext(`globalThis.__ws = {
  get S() { return S; }, reset() { S = initialState(); S.route = 'craft'; S.seg.craft = 'work'; },
  html() { render(); return document.getElementById('game').innerHTML; },
  ACT, BAG, WS_DATA, WS_SRV, RSI, rsHas, wsHeroNeed, FLOWS, EN_RECIPES, wsPut, wsSetTable, wsToCraft, wsPick, wsPutQ, wsRangeLive, wsCellMax,
  wsQty, wsStock, wsPlan,
  WS_FX, WS_KIT, wsCracks, wsKitHtml, wsKitPlay, wsKitAct, wsKitBoardHtml, KIT_EXTRA,
  kitStage() { return document.getElementById('wsKitStage').innerHTML; },
};`, ctx);
const W = win.__ws, R = W.EN_RECIPES, A = W.ACT;

/* что игрок видеть не должен: спойлеры цикла VI, обоснования рецептов, будущий биом и босс активаций (§12.5).
   Строка, которая сама встречается в названиях и загадках игрока, не считается утечкой */
const legit = R.items.filter(i => !i.team).map(i => i.n + '\n' + i.lore).concat(R.recipes.filter(r => !r.team).map(r => r.n)).join('\n');
const leaks = [
  ...R.items.filter(i => i.team).map(i => ['спойлер цикла VI', i.n]),
  ...R.recipes.filter(r => r.team).map(r => ['спойлер цикла VI', r.n]),
  ...R.recipes.map(r => ['обоснование рецепта (для команды)', r.why.slice(0, 40)]),
  ...R.items.filter(i => i.opens).map(i => ['что откроет предмет (§12.5)', i.opens]),
  ...R.items.filter(i => i.opensLore).map(i => ['что откроет предмет (§12.5)', i.opensLore.slice(0, 40)]),
  ...R.places.map(p => ['крафтовый биом до активации (§12.5)', p.n]),
  ...R.places.map(p => ['крафтовый босс до призыва (§12.5)', p.boss.n]),
].filter(([, s]) => s && !legit.includes(s));

/* служебное глазами игрока — слова и шаблоны check_player_view.js; обход там ограничен, здесь — каждое состояние мастерской.
   Смотрим рабочую область и лист поверх: шапка и шахта — чужие */
const seenSvc = new Set();
function service(label, h) {
  const i = h.indexOf('<main'), part = i < 0 ? h : h.slice(i), v = strip(part);
  const txt = playerText(part).split('\n').concat([...v.matchAll(/\s(?:title|placeholder)="([^"]*)"/g)].map(m => m[1]));
  for (const t of txt) for (const [what, re] of SERVICE) {
    const k = what + '|' + t; if (!re.test(t) || seenSvc.has(k)) continue;
    seenSvc.add(k); err.push(`${label}: игроку видно служебное (${what}) — «${t.slice(0, 100)}»`);
  }
}
function look(label, h) {
  drawn++;
  if (typeof h !== 'string' || !h) { err.push(label + ': пустая разметка'); return ''; }
  const bad = h.match(/undefined|NaN|\[object /);
  if (bad) err.push(`${label}: в разметке «${bad[0]}» — …${h.slice(Math.max(0, bad.index - 90), bad.index + 30).replace(/\s+/g, ' ')}…`);
  const dup = h.match(/<[a-z]+\b[^>]*?\s(style|class)="[^"]*"[^>]*?\s\1="/);   // второй style или class в теге браузер молча отбросит
  if (dup) err.push(`${label}: в теге дважды ${dup[1]} — ${dup[0].slice(0, 120)}`);
  for (const [why, s] of leaks) if (h.includes(s)) err.push(`${label}: ${why} — «${s}»`);
  service(label, h);
  return h;
}
const view = label => look(label, W.html());
function scene(label, f) {
  try { f(); }
  catch (e) { err.push(`${label}: исключение — ${e.message}\n    ${(e.stack || '').split('\n').slice(1, 4).join('\n    ')}`); }
}
const eq = (label, a, b) => { if (a !== b) err.push(`${label}: ожидалось ${JSON.stringify(b)}, получено ${JSON.stringify(a)}`); };
const ok = (label, c) => { if (!c) err.push(label); };
const q = id => W.BAG.qty(id);
const snap = ids => Object.fromEntries(ids.map(id => [id, q(id)]));
const rows = h => (h.match(/class="ws-rc[ "]/g) || []).length;
const cellsTxt = () => W.S.ws.cells.filter(Boolean).map(c => c.id + '×' + c.q).join(',');
const setQ = (id, n) => { const i = W.S.ws.cells.findIndex(c => c && c.id === id); A.wscell(String(i)); A.wsqset('', { value: String(n) }); };
const disabled = (h, a) => new RegExp(`data-a="${a}"[^>]*\\sdisabled`).test(h);

/* 3–4. состояния */
scene('данные экрана', () => {
  const D = W.WS_DATA, T = R.tiers;
  D.special.tiers.forEach(t => ok(`особый ярус «${t}» есть в recipes.js`, !!T[t]));
  D.special.items.concat(Object.keys(D.wallet)).forEach(id => ok(`предмет «${id}» есть в recipes.js`, !!W.BAG.item(id)));
  R.items.filter(i => !i.team && i.tier !== 'hero').forEach(i => ok(`ярус «${i.tier}» не попал ни в одну вкладку инвентаря`, D.groups.some(g => g[2] && g[2].includes(i.tier))));
  R.recipes.filter(r => !r.team).forEach(r => ok(`вид рецепта «${r.kind}» не попал в фильтр книги`, D.kinds.some(k => k[2].includes(r.kind))));
  for (const [rid, p] of Object.entries(D.demo.part)) {
    const r = W.BAG.recipe(rid);
    ok(`демо-подсказка ${rid}: рецепта нет`, !!r);
    if (r) {
      ok(`демо-подсказка ${rid}: позиции не из рецепта`, p.pos.every(id => r.in.some(([x]) => x === id)));
      ok(`демо-подсказка ${rid}: меньше ${D.hintMin} позиций или рецепт короче ${D.hintFrom}`, p.pos.length >= D.hintMin && r.in.length >= D.hintFrom);
    }
  }
  D.demo.fav.forEach(id => ok(`демо-избранное ${id}: рецепта нет`, !!W.BAG.recipe(id)));
  D.demo.table.concat(D.demo.hint).forEach(([id]) => ok(`демо-стол: предмета ${id} нет`, !!W.BAG.item(id)));
  D.demo.chain.learn.concat(D.demo.chain.make).forEach(id => ok(`демо-цепочка: рецепта ${id} нет`, !!W.BAG.recipe(id)));
  W.reset();
  const v = W.WS_SRV.check(D.demo.hint.map(([id, n]) => ({ id, q: n })));
  ok('демо-подсказка стола не должна создавать предмет', !v.made);
  ok('демо-подсказка стола должна открывать подсказку', !!(v.hints && v.hints.length));
});

scene('пустой стол', () => {
  W.reset();
  const h = view('пустой стол');
  ok('пустой стол: нет зоны «Инвентарь»', h.includes('<h2>Инвентарь</h2>'));
  ok('пустой стол: нет зоны «Крафт»', h.includes('<h2>Крафт</h2>'));
  eq('пустой стол: ячеек', (h.match(/data-wscell="/g) || []).length, W.WS_DATA.cells);
  ok('пустой стол: нет подсказки «порядок не важен»', h.includes('порядок не важен'));
  ok('пустой стол: «Попробовать» должна быть недоступна', disabled(h, 'wstry'));
  /* воздух: у инвентаря нет строки-подсказки под сеткой, у пустой ячейки — подписи; сведения — по нажатию */
  ok('пустой стол: под инвентарём снова строка-подсказка', !/Нажмите ресурс|Можно и перетащить/.test(h));
  ok('пустой стол: у пустой ячейки снова подпись', !/Ячейка \d+ пуста/.test(h));
  /* запасы мастерской — предметы запасов и валюта-ресурс из кошелька (WS_DATA.wallet: Энериум, рунный ключ) */
  const walletQ = id => { const w = W.WS_DATA.wallet[id]; return w && w in W.S.wallet ? W.S.wallet[w] : 0; };
  const stock = R.items.filter(i => !i.team && i.tier !== 'hero' && q(i.id) + walletQ(i.id) > 0);
  for (const id of Object.keys(W.WS_DATA.wallet)) if (walletQ(id) > 0) ok(`инвентарь: нет «${id}» из кошелька`, stock.some(i => i.id === id));
  for (const [k, , tiers] of W.WS_DATA.groups) {
    A.wscat(k);
    eq(`инвентарь · ${k}: ресурсов`, (view('инвентарь · ' + k).match(/data-wsdrag="/g) || []).length, stock.filter(i => !tiers || tiers.includes(i.tier)).length);
  }
  A.wscat('all');
  W.S.ws.inv.q = 'клык'; ok('поиск по запасам «клык»', view('поиск по запасам').includes('title="Клык"'));
  W.S.ws.inv.q = 'нет такого'; ok('поиск по запасам: пусто', view('поиск: пусто').includes('Ничего не найдено'));
  W.S.ws.inv.q = '';
  A.wsinfo('resin'); view('сведения из инвентаря');
});

scene('найденный рецепт на столе', () => {
  W.reset();
  A.wscell('0'); A.wsput('fang'); A.wsput('fang'); A.wsput('k1_hunt');
  eq('клык ×2 в ячейке 1, ключ охоты — в свободной', cellsTxt(), 'fang×2,k1_hunt×1');
  A.wsq('10'); eq('не больше, чем в запасах', W.S.ws.cells[1].q, q('k1_hunt'));
  let h = view('найденный рецепт на столе');
  ok('нет «Совпадает с рецептом «Точёный клык»»', h.includes('Совпадает с рецептом «Точёный клык»'));
  ok('кнопка — «Создать»', />Создать<\/button>/.test(h));
  ok('имя ресурса в выбранной ячейке — не кнопка сведений', h.includes('class="ws-qn" data-a="wsinfo" data-v="k1_hunt"'));
  A.wscell('0'); A.wsq('max'); eq('«Макс» — всё, что есть', W.S.ws.cells[0].q, Math.min(W.WS_DATA.cellMax, q('fang')));
  ok('лишнее: нет «лишнее сгорит»', view('лишнее на столе').includes('лишнее сгорит'));
  A.wsq('-10'); eq('минимум — 1', W.S.ws.cells[0].q, 1);
  A.wsqset('', { value: '500' }); eq('ввод сверх запасов', W.S.ws.cells[0].q, Math.min(W.WS_DATA.cellMax, q('fang')));
  A.wsqset('', { value: '2' }); eq('ввод числа', W.S.ws.cells[0].q, 2);
  const b = snap(['fang', 'k1_hunt', 'p_fang']);
  A.wstry();
  /* чистый найденный рецепт — без подтверждения, сразу короткая анимация без листа; итог выдан до неё */
  const fx = W.S.ws.fx;
  ok('чистое совпадение — без подтверждения, сразу короткая анимация', !!W.S.overlay && W.S.overlay.t === 'wsres' && !!fx && fx.tempo === 'short' && fx.auto && fx.phase === 'anim');
  eq('клык списан', q('fang'), b.fang - 2); eq('ключ списан', q('k1_hunt'), b.k1_hunt - 1); eq('заготовка создана', q('p_fang'), b.p_fang + 1);
  ok('стол очищен', W.S.ws.cells.every(c => !c));
  h = view('короткая анимация');
  ok('короткая без листа: нет листа итога', !h.includes('ws-fx-pn')); ok('короткая: круг и итог', h.includes('ws-fx-short') && h.includes('ws-fx-res'));
  A.wsfxreveal();
  ok('нажатие на сцену: короткая без листа закрывается', !W.S.overlay && !W.S.ws.fx);
  ok('тост «Создано»', !!W.S.toast && /Создано/.test(W.S.toast.t));
  eq('пропуск не выдаёт второй раз', q('p_fang'), b.p_fang + 1);
  view('после создания');
});

scene('лишнее сгорает', () => {
  W.reset();
  ['spring', 'thread', 'k1_eng', 'resin'].forEach(id => A.wsput(id));
  const b = snap(['spring', 'thread', 'k1_eng', 'resin', 'p_frame']);
  A.wstry(); eq('с лишним — подтверждение', W.S.overlay && W.S.overlay.t, 'wstry');
  ok('подтверждение: нет «Лишнее сгорит»', view('подтверждение с лишним').includes('Лишнее сгорит'));
  A.wstrydo();
  eq('каркас создан', q('p_frame'), b.p_frame + 1); eq('смола сгорела', q('resin'), b.resin - 1); eq('пружина', q('spring'), b.spring - 1);
  eq('итог', W.S.overlay && W.S.overlay.t, 'wsres');
  ok('итог: нет «Лишнее сгорело»', view('итог с лишним').includes('Лишнее сгорело'));
  A.wstrydo(); eq('повторное нажатие не повторяет расход', q('spring'), b.spring - 1);
  A.close();
});

scene('неудача', () => {
  W.reset();
  A.wsput('mushroom'); A.wsput('salt'); A.wsput('salt');
  const b = snap(['mushroom', 'salt']);
  A.wstry(); eq('неизвестное — подтверждение', W.S.overlay && W.S.overlay.t, 'wstry');
  ok('нет «Сочетание неизвестно»', view('подтверждение неизвестного').includes('Сочетание неизвестно'));
  A.wstrydo();
  eq('гриб сгорел', q('mushroom'), b.mushroom - 1); eq('соль сгорела', q('salt'), b.salt - 2);
  eq('итог — неудача', W.S.overlay && W.S.overlay.res && W.S.overlay.res.kind, 'fail');
  const h = view('итог неудачи');
  /* неудача честно: что сгорело по §12; подсказки нет — нет и строки о ней */
  ok('нет «Сгорело всё положенное»', h.includes('Сгорело всё положенное')); ok('подсказки не положено — а строка есть', !h.includes('class="ws-hint"'));
  ok('нет «Повторить набор»', h.includes('data-a="wsrepeat"'));
  ok('неудача: нет трещин', (h.match(/class="ws-fx-ck"/g) || []).length > 0); eq('неудача: предметов на круге', (h.match(/class="ws-fx-it"/g) || []).length, 2);
  eq('неудача: нити рвутся надвое', (h.match(/class="ws-fx-t1"/g) || []).length, 2);
  A.wsrepeat(); eq('повтор набора', cellsTxt(), 'mushroom×1,salt×2');
  view('повтор набора');
});

scene('подсказки и герой', () => {
  W.reset();
  const rid = 'r_h_c1_20';
  W.wsSetTable(W.WS_DATA.demo.hint); view('подсказка: стол');
  A.wstry(); A.wstrydo();
  const p = W.S.ws.part[rid];
  ok('подсказка: рецепт героя не появился в книге', !!p);
  eq('подсказка: открыто позиций', p && p.pos.length, 3);
  ok('итог: нет «появился в книге»', view('подсказка: итог').includes('появился в книге'));
  A.wshints();
  let h = view('книга: подсказки');
  /* героя игрок не встречал — итог обрывка безымянен (слово автора 30.09.2026: справа «скомканная бумага»), видны обрывки: верно 3 из 4 */
  ok('книга: у обрывка с ненайденным итогом видно имя «Оррин Напев»', !h.includes('Оррин Напев')); ok('книга: нет обрывков «верно 3 из 4»', h.includes('верно 3 из 4'));
  /* послабление: все ресурсы верны, количество — нет */
  W.BAG.add('find_cb1', 1); W.BAG.add('cr_mold', 3); W.BAG.add('p_waxthread', 2); W.BAG.add('p_print', 1);
  A.wsload(rid); eq('на стол — открытые позиции по одной', cellsTxt(), 'find_cb1×1,p_waxthread×1,cr_mold×1');
  setQ('p_waxthread', 2); setQ('cr_mold', 3); A.wscell('3'); A.wsput('p_print');
  A.wstry(); A.wstrydo();
  eq('послабление: открыты все позиции', W.S.ws.part[rid] && W.S.ws.part[rid].pos.length, 4);
  ok('итог: нет «без количеств»', view('послабление: итог').includes('без количеств'));
  A.wshints(); ok('книга: нет «без количеств»', view('книга: без количеств').includes('без количеств'));
  /* верный набор создаёт героя всегда */
  W.BAG.add('find_cb1', 2); W.BAG.add('cr_mold', 3); W.BAG.add('p_waxthread', 2); W.BAG.add('p_print', 1);
  W.wsSetTable([['find_cb1', 2], ['p_waxthread', 2], ['cr_mold', 3], ['p_print', 1]]);
  A.wstry(); A.wstrydo();
  const hero = W.RSI['c1-20'];
  ok('комплект осколков героя в запасах', !!hero && !W.rsHas(hero) && (W.S.rs.shards['c1-20'] || 0) === W.wsHeroNeed());
  eq('герой не пришёл сразу — его пробуждают души', JSON.stringify(W.S.rs.owned['c1-20'] || null), 'null');
  ok('рецепт героя найден', W.BAG.known(rid)); ok('подсказка снята', !W.S.ws.part[rid]); eq('герой не лёг в запасы', q('h_c1_20'), 0);
  h = view('герой создан');
  ok('итог: нет «0 ур. · 0 РП · 0 Добл»', h.includes('0 ур. · 0 РП · 0 Добл')); ok('итог: нет карточки героя', h.includes('data-a="rhero"'));
  ok('итог героя — лицо в свете редкости, полная версия', h.includes('class="ws-fx-hero"') && W.S.ws.fx && W.S.ws.fx.tempo === 'full');
  /* повтор героя */
  A.close(); A.wsview('book'); A.wsbtab('all');
  ok('книга: нет «осколки собраны»', view('книга: осколки героя собраны').includes('осколки собраны'));
  A.wsmake(rid); ok('автодокрафт героя с собранными осколками недоступен', disabled(view('автодокрафт: осколки героя собраны'), 'wsmakedo'));
  W.BAG.add('find_cb1', 2); W.BAG.add('cr_mold', 3); W.BAG.add('p_waxthread', 2); W.BAG.add('p_print', 1);
  const b = snap(['find_cb1']);
  A.wsmakedo(); eq('повтор героя ничего не списывает', q('find_cb1'), b.find_cb1);
  A.close();
  W.wsSetTable([['find_cb1', 2], ['p_waxthread', 2], ['cr_mold', 3], ['p_print', 1]]);
  h = view('стол: осколки героя собраны');
  ok('стол: нет «уже хватает»', h.includes('уже хватает')); ok('стол: попытка недоступна', disabled(h, 'wstry'));
  A.wstry(); eq('стол: ничего не списано', q('find_cb1'), b.find_cb1);
});

scene('подсказки: новая позиция', () => {
  W.reset();
  const rid = 'r_h_c1_18';
  ['tr_fb2', 'a_pick', 'a_bag'].forEach(id => W.BAG.add(id, 10)); W.BAG.add('cr_prop', 20); W.BAG.add('k1_eng', 5);
  W.wsSetTable([['cr_prop', 1], ['k1_eng', 1], ['a_bag', 1]]); A.wstry(); A.wstrydo();
  eq('три верных — рецепт в книге', W.S.ws.part[rid] && W.S.ws.part[rid].pos.length, 3);
  W.wsSetTable([['cr_prop', 1], ['k1_eng', 1], ['a_bag', 1], ['tr_fb2', 1]]); A.wstry(); A.wstrydo();
  eq('ещё один верный — позиция', W.S.ws.part[rid] && W.S.ws.part[rid].pos.length, 4);
  ok('итог: нет «открыта позиция»', view('новая позиция').includes('открыта позиция'));
  W.wsSetTable([['cr_prop', 1], ['k1_eng', 1], ['a_bag', 1], ['tr_fb2', 1], ['salt', 1]]); A.wstry(); A.wstrydo();
  eq('с неверным ресурсом подсказки нет', W.S.ws.part[rid] && W.S.ws.part[rid].pos.length, 4);
  ok('стол: известные позиции на столе', (W.wsSetTable([['cr_prop', 1], ['k1_eng', 1], ['a_bag', 1], ['tr_fb2', 1]]), view('стол: известные позиции')).includes('все открытые позиции'));
  W.wsSetTable([['tr_fb2', 1], ['a_pick', 1], ['cr_prop', 6], ['a_bag', 1], ['k1_eng', 2]]); A.wstry(); A.wstrydo();
  ok('Ойвин Должник — комплект осколков', !W.rsHas(W.RSI['c1-18']) && (W.S.rs.shards['c1-18'] || 0) >= W.wsHeroNeed());
  view('Ойвин создан');
});

scene('случайное открытие', () => {
  W.reset();
  W.BAG.add('p_brew', 5); W.BAG.add('p_ward', 5);
  const b = snap(['a_remedy', 'a_lamp', 'resin']);
  W.wsSetTable([['p_brew', 2], ['p_ward', 1], ['resin', 1]]); A.wstry(); A.wstrydo();
  eq('самый полный — снадобье', q('a_remedy'), b.a_remedy + 1); eq('фонарь не создан', q('a_lamp'), b.a_lamp);
  ok('снадобье найдено', W.BAG.known('r_a_remedy')); ok('фонарь не найден', !W.BAG.known('r_a_lamp'));
  ok('итог: нет «Новый рецепт»', view('случайное открытие').includes('Новый рецепт'));
  W.wsSetTable([['p_brew', 1], ['p_ward', 1], ['resin', 1]]); A.wstry(); A.wstrydo();
  eq('фонарь создан', q('a_lamp'), b.a_lamp + 1); eq('смола сгорела как лишнее', q('resin'), b.resin - 2);
  W.wsSetTable([['p_brew', 2], ['p_ward', 1], ['resin', 1]]);
  ok('стол узнаёт самый полный из найденных', view('оба найдены').includes('Совпадает с рецептом «Снадобье от ожогов»'));
});

scene('автодокрафт: этапы и согласие', () => {
  W.reset();
  A.wsview('book');
  ok('книга: «Слепок ловчего» — неизвестный этап', /data-st="stop" data-rid="r_call_fb1"[\s\S]*?этап не найден/.test(view('книга')));
  A.wsmake('r_call_fb1');
  let h = view('автодокрафт: неизвестный этап');
  ok('нет «Этап не найден»', h.includes('Этап не найден')); ok('остановленный автодокрафт недоступен', disabled(h, 'wsmakedo'));
  const b0 = snap(['call_fb1', 'u2']);
  A.wsmakedo(); eq('остановка ничего не списывает', q('u2'), b0.u2);
  W.BAG.learn('r_a_cast'); W.BAG.learn('r_p_lure');
  h = view('автодокрафт: нужен уникальный');
  ok('нет согласия на уникальный', h.includes('data-a="wsok"')); ok('без согласия недоступно', disabled(h, 'wsmakedo'));
  ok('нет этапа «Глиняный слепок»', h.includes('Глиняный слепок'));
  A.wsmakedo(); eq('без согласия уникальный не списан', q('u2'), b0.u2);
  /* Энериум в каждом призыве врага (recipes.js, r_call_fb1: 5) — из кошелька: он и валюта, и ресурс мастерской (слово автора 30.09.2026) */
  const w0 = W.S.wallet.enerium;
  ok('в демо-кошельке не хватает Энериума на призыв', w0 >= 5);
  const ids =['call_fb1', 'u2', 'find_cb1', 'bone', 'k2_hunt', 'resin', 'sand', 'k1_alch', 'k1_ench', 'p_frame', 'a_cast', 'p_clay', 'p_print', 'p_lure', 'energ'], b = snap(ids);
  A.wsok('', { checked: true });
  ok('с согласием доступно', !disabled(view('автодокрафт: согласие дано'), 'wsmakedo'));
  A.wsmakedo();
  eq('призыв создан', q('call_fb1'), b.call_fb1 + 1); eq('уникальный списан', q('u2'), b.u2 - 1); eq('находка списана', q('find_cb1'), b.find_cb1 - 1);
  eq('кость', q('bone'), b.bone - 2); eq('смола', q('resin'), b.resin - 3); eq('песок', q('sand'), b.sand - 5); eq('каркас — из запасов', q('p_frame'), b.p_frame - 1);
  eq('Энериум призыва списан из кошелька', W.S.wallet.enerium, w0 - 5); eq('Энериум не появился в запасах', q('energ'), b.energ);
  eq('промежуточные этапы не остались в запасах', q('a_cast') + q('p_clay') + q('p_print') + q('p_lure'), b.a_cast + b.p_clay + b.p_print + b.p_lure);
  eq('итог автодокрафта', W.S.overlay && W.S.overlay.res && W.S.overlay.res.kind, 'make');
  view('итог автодокрафта');
  A.wsmakedo(); eq('повторное нажатие не повторяет расход', q('call_fb1'), b.call_fb1 + 1); eq('повтор не списывает Энериум второй раз', W.S.wallet.enerium, w0 - 5);
  A.close(); A.wsview('book');
  ok('книга: уникального больше нет — «не хватает»', /data-st="lack" data-rid="r_call_fb1"[\s\S]*?не хватает/.test(view('книга после автодокрафта')));
});

scene('автодокрафт: количество', () => {
  W.reset();
  const b = snap(['p_frame', 'k1_eng']);
  A.wsmake('r_p_frame'); A.wsn('max'); eq('«Макс» — по ключам', W.S.overlay.n, b.k1_eng);
  A.wsn('1'); let h = view('больше, чем можно');
  ok('нет «Не хватает»', h.includes('Не хватает')); ok('сверх запасов недоступно', disabled(h, 'wsmakedo'));
  A.wsn('-1'); view('столько, сколько можно'); A.wsmakedo();
  eq('создано столько, сколько задано', q('p_frame'), b.p_frame + b.k1_eng);
  A.close(); A.wsmake('r_act_cb1'); view('автодокрафт: активация');
  A.close(); A.wsview('book');
  ok('руна доблести известна с первого осколка', view('книга: руна доблести').includes('Руна доблести · цикл I'));
  /* осколков нет: не хватает — или этап не найден, когда у осколка есть рецепт (из рунической пыли, recipes.js r_vs1_dust) */
  A.wsmake('r_vr1'); const hv = view('автодокрафт: руна доблести');
  ok('руна доблести: не хватает осколков', hv.includes('Не хватает') || hv.includes('Этап не найден'));
  A.wsmake('r_a_iron'); ok('ненайденный рецепт не раскрывает состав', !view('автодокрафт: не найден').includes('Этапы'));
});

/* слово автора 30.09.2026: «Энериум и донатная валюта, и ресурс в мастерской» — в ячейку и в рецепт он идёт из кошелька; остаток —
   запасы и кошелёк, списание — сначала запасы, затем кошелёк, одной операцией; повтор номера ничего не меняет */
scene('Энериум из кошелька', () => {
  W.reset();
  const bag0 = q('energ'); if (bag0) W.BAG.take('energ', bag0);
  ok('в демо-запасах мало соли для проверки', q('salt') >= 3);
  W.S.wallet.enerium = 7;
  eq('остаток мастерской — запасы и кошелёк', W.wsQty('energ'), 7);
  ok('Энериума из кошелька нет в запасах мастерской', W.wsStock().some(it => it.id === 'energ'));
  eq('в ячейку — не больше, чем в кошельке', W.wsCellMax('energ'), Math.min(W.WS_DATA.cellMax, 7));
  W.wsPutQ('energ', 5);
  ok('у Энериума на столе нет подписи «в кошельке»', view('стол: Энериум из кошелька').includes('в кошельке 7'));
  const salt = q('salt');
  let v = W.WS_SRV.attempt('tw1', [{ id: 'energ', q: 5, pos: 0 }, { id: 'salt', q: 1, pos: 1 }], true);
  ok('попытка с Энериумом из кошелька не проведена', !!v.res);
  eq('Энериум списан из кошелька', W.S.wallet.enerium, 2); eq('соль списана из запасов', q('salt'), salt - 1);
  v = W.WS_SRV.attempt('tw1', [{ id: 'energ', q: 5, pos: 0 }, { id: 'salt', q: 1, pos: 1 }], true);
  ok('повтор номера — не «again»', !!v.again); eq('повтор номера не списал Энериум', W.S.wallet.enerium, 2);
  v = W.WS_SRV.attempt('tw2', [{ id: 'energ', q: 5, pos: 0 }], true);
  eq('без Энериума — отказ «не хватает»', v.refuse, 'lack'); eq('отказ ничего не списал', W.S.wallet.enerium, 2);
  W.BAG.add('energ', 3); W.S.wallet.enerium = 10;
  v = W.WS_SRV.attempt('tw3', [{ id: 'energ', q: 5, pos: 0 }, { id: 'salt', q: 1, pos: 1 }], true);
  eq('сначала списаны запасы', q('energ'), 0); eq('остаток — из кошелька', W.S.wallet.enerium, 8);
  W.S.wallet.enerium = 0;
  const p = W.wsPlan(W.BAG.recipe('r_call_fb1'), 1);
  ok('автодокрафт: Энериум — «неизвестный этап»', !p.stop.includes('energ'));
  ok('автодокрафт: нехватки Энериума не видно', p.lack.some(([id]) => id === 'energ'));
});

scene('сведения о ресурсах', () => {
  W.reset();
  for (const it of R.items.filter(i => !i.team && q(i.id) > 0)) { A.wsinfo(it.id); look('сведения · ' + it.id, W.html()); }
  A.wsinfo('u2'); ok('уникальный — особый ресурс', W.html().includes('расход только с согласия'));
  A.wsput('u2'); ok('«На стол» из сведений закрывает лист', !W.S.overlay); ok('уникальный на столе', W.S.ws.cells.some(c => c && c.id === 'u2'));
});

scene('особый ресурс на столе', () => {
  W.reset();
  W.wsSetTable([['fang', 2], ['k1_hunt', 1], ['u1', 1]]);
  const b = snap(['u1', 'p_fang']);
  A.wstry(); eq('подтверждение', W.S.overlay && W.S.overlay.t, 'wstry');
  const h = view('особый на столе');
  ok('нет согласия', h.includes('data-a="wsok"')); ok('без согласия недоступно', disabled(h, 'wstrydo'));
  A.wstrydo(); eq('без согласия уникальный не списан', q('u1'), b.u1);
  A.wsok('', { checked: true }); A.wstrydo();
  eq('клык создан', q('p_fang'), b.p_fang + 1); eq('уникальный сгорел как лишнее', q('u1'), b.u1 - 1);
  view('особый сгорел');
});

scene('не хватает в запасах', () => {
  W.reset();
  W.wsSetTable([['fang', 6], ['k1_hunt', 1]]); W.BAG.take('fang', 3);
  const h = view('запасы изменились');
  ok('нет «Не хватает:»', h.includes('Не хватает:')); ok('попытка недоступна', disabled(h, 'wstry'));
  const b = snap(['fang']); A.wstry(); eq('ничего не списано', q('fang'), b.fang);
});

scene('книга рецептов', () => {
  W.reset();
  A.wsview('book');
  const known = W.WS_SRV.known().length, parts = Object.keys(W.S.ws.part).length;
  let h = view('книга');
  eq('книга: строк', rows(h), known + parts); ok('книга: вкладка «Все»', h.includes(`Все · ${known + parts}`));
  /* воздух: у строки книги одно состояние, особый ресурс — ромб на значке; значки ингредиентов — кнопки сведений */
  ok('книга: снова чип «особое» рядом с состоянием', !h.includes('особое</span>'));
  ok('книга: значки ингредиентов — не кнопки сведений', /class="ws-rc[ "][\s\S]*?<button class="well[^"]*" data-r="\d" data-a="wsinfo"/.test(h));
  A.wsinfo('fang'); ok('сведения из книги: лист не открылся', !!W.S.overlay && W.S.overlay.t === 'wsitem'); view('сведения из книги'); A.close();
  for (const t of ['all', 'can', 'hint']) { A.wsbtab(t); view('книга · ' + t); }
  A.wsbtab('hint'); eq('подсказки: строк', rows(view('книга · подсказки')), parts);
  A.wsbtab('all');
  for (const k of [''].concat(W.WS_DATA.kinds.map(x => x[0]))) { A.wsbkind('', { value: k }); view('книга · вид ' + (k || 'все')); }
  A.wsbkind('', { value: 'part' }); eq('книга · заготовки', rows(view('книга · заготовки')), W.WS_SRV.known().filter(r => r.kind === 'part').length);
  A.wsbkind('', { value: '' });
  A.wsfav('r_p_fang'); A.wsbfav(); eq('книга · избранное', rows(view('книга · избранное')), W.S.ws.fav.length); A.wsbfav();
  A.wsfav('r_p_fang'); ok('избранное снимается', !W.S.ws.fav.includes('r_p_fang'));
  W.S.ws.book.q = 'клык'; eq('поиск «клык»', rows(view('книга · поиск')), 1);
  W.S.ws.book.q = 'нет такого'; ok('поиск: пусто', view('книга · поиск пусто').includes('Ничего не найдено'));
  W.S.ws.book.q = '';
  W.S.ws.part = {}; A.wsbtab('hint'); ok('без подсказок книга объясняет правило', view('книга · подсказок нет').includes('Обрывков пока нет'));
  W.reset(); A.wsview('book'); A.wsload('r_call_fb2');
  eq('подсказка на стол: есть в запасах — легло', cellsTxt(), 'u1×1,p_frame×1'); eq('вид — стол', W.S.ws.view, 'table');
  view('подсказка на столе');
});

scene('перенос и полный стол', () => {
  W.reset();
  W.wsPut('fang', 3); eq('перенос в ячейку 4', W.S.ws.cells[3] && W.S.ws.cells[3].id, 'fang');
  W.wsPut('salt', 0); W.wsPut('fang', 0); eq('перенос на занятую — обмен', [W.S.ws.cells[0].id, W.S.ws.cells[3].id].join(','), 'fang,salt');
  W.reset();
  ['resin', 'mushroom', 'acid', 'ash', 'salt', 'vial'].forEach(id => A.wsput(id)); A.wsput('sand');
  ok('седьмой ресурс не лёг', !W.S.ws.cells.some(c => c && c.id === 'sand'));
  ok('тост про занятые ячейки', !!W.S.toast && /заняты/.test(W.S.toast.t));
  A.wscell('2'); A.wsq('x'); eq('убрать из ячейки', W.S.ws.cells[2], null);
  view('полный стол'); A.wsclear(); ok('стол очищен', W.S.ws.cells.every(c => !c));
});

scene('на стол из других экранов', () => {
  W.reset(); W.S.route = 'shelter';
  if (W.ACT.toCraft !== W.wsToCraft) { warn.push('ACT.toCraft переопределён другим экраном — проверка пропущена'); return; }
  A.toCraft('resin'); eq('маршрут', W.S.route, 'craft');
  ok('«На стол мастера»: мастерская открылась с ползунком', !!W.S.overlay && W.S.overlay.t === 'wsqty' && W.S.overlay.arg === 'resin');
  view('на стол из запасов: ползунок');
  A.wsqdo(); ok('смола на столе после ползунка', W.S.ws.cells.some(c => c && c.id === 'resin'));
  view('на стол из запасов');
  A.toCraft('cinder'); view('прежний предмет прототипа');
});

/* 5а. ввод ресурса: плитки по пять в ряд с лупой, ползунок количества, ячейка */
scene('ввод ресурса: плитки и лупа', () => {
  W.reset();
  const h = view('запасы мастерской'), inv = h.slice(h.indexOf('ws-grid'), h.indexOf('ws-craft'));
  const tiles = (inv.match(/class="ws-tile[ "]/g) || []).length, lens = (inv.match(/class="ws-lens" data-a="wsinfo"/g) || []).length, picks = (inv.match(/data-a="wspick"/g) || []).length;
  ok('плиток в запасах нет', tiles > 0);
  eq('у каждой плитки — лупа карточки', lens, tiles); eq('у каждой плитки — нажатие на ползунок', picks, tiles);
  ok('лупа — справа сверху плитки, после её кнопки', /<div class="ws-tile[^"]*" data-r="\d"><button class="well[\s\S]*?<\/button><button class="ws-lens"/.test(inv));
  ok('в плитке снова прежнее «положить без ползунка»', !/data-a="wsput"/.test(inv));
  /* пять в ряд, крупнее прежних 48 px: сетка — пять равных столбцов, плитка — квадрат во всю ширину столбца */
  const flat = CSS.replace(/\s+/g, ' ');
  ok('craft.css: запасы мастерской не по пять в ряд', /\.ws-grid\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/.test(flat));
  ok('craft.css: плитка не квадратная во всю ширину столбца', /\.ws-tile\{[^}]*aspect-ratio:1\/1/.test(flat) && /\.ws-tile>\.well\{[^}]*inset:0/.test(flat));
  /* ширина плитки на экранах 932 × 430 и 844 × 390: панель «Инвентарь» — доля 1 из 2,1 рабочей области, поля и зазоры — из CSS */
  const gap = +((flat.match(/\.ws-grid\{[^}]*gap:(\d+)px/) || [])[1] || 0), padIn = 10 + 1, padCompact = 8 + 1;
  for (const [w, rail, compact] of [[932, 78, false], [844, 72, true]]) {
    const main = w - rail - 2 * 12, panel = Math.floor((main - 10) * 10 / 21), inner = panel - 2 * (compact ? padCompact : padIn) - 6 - 6;
    const tile = Math.floor((inner - 4 * (compact ? 6 : gap)) / 5);
    ok(`${w}: плитка ${tile} px — не крупнее прежних 48`, tile > 48);
  }
  /* лупа открывает карточку, «На стол» в карточке — тот же ползунок */
  const id = W.S.ws.cells[0] ? W.S.ws.cells[0].id : 'fang';
  A.wsinfo(id); eq('лупа — карточка ресурса', W.S.overlay && W.S.overlay.t, 'wsitem');
  ok('«На стол» в карточке — ползунок', /data-a="wspick" data-v="[^"]+"/.test(view('карточка ресурса')));
  A.wspick(id); eq('«На стол» из карточки — ползунок', W.S.overlay && W.S.overlay.t, 'wsqty');
});

scene('ввод ресурса: ползунок', () => {
  W.reset();
  const range = h => { const m = h.match(/<input class="ws-range" id="wsQv" type="range" min="(\d+)" max="(\d+)" step="1" value="(\d+)"/); return m ? m.slice(1).map(Number) : null; };
  /* запас меньше 100 — до запаса; ресурса нет на столе — стоит на одной */
  const few = 'fang', n = q(few);
  A.wspick(few); let h = view('ползунок: запас меньше 100');
  let r = range(h);
  ok('ползунка нет', !!r);
  if (r) { eq('ползунок от 0', r[0], 0); eq('ползунок до запаса', r[1], Math.min(W.WS_DATA.cellMax, n)); eq('ползунок сразу на одной', r[2], Math.min(n, W.WS_DATA.pick.start)); }
  ok('кнопка «В ячейку · N»', /id="wsQvGo" data-a="wsqdo">В ячейку · 1</.test(h));
  A.wsqv('', { value: String(n) }); eq('ползунок до конца', W.S.overlay.v, n);
  A.wsqv('', { value: '999' }); eq('ползунок не выше запаса', W.S.overlay.v, n);
  A.wsqn('-1'); eq('«−» — на шаг меньше', W.S.overlay.v, n - W.WS_DATA.pick.step);
  A.wsqv('', { value: '0' }); h = view('ползунок на нуле');
  ok('на нуле нового ресурса «В ячейку» недоступна', /id="wsQvGo" data-a="wsqdo" disabled/.test(h));
  A.wsqdo(); ok('на нуле ничего не легло', !W.S.ws.cells.some(c => c && c.id === few)); eq('на нуле лист не закрылся', W.S.overlay && W.S.overlay.t, 'wsqty');
  A.wsqv('', { value: '4' }); A.wsqdo();
  eq('легло ровно выбранное', cellsTxt(), 'fang×4'); ok('лист закрылся', !W.S.overlay); eq('в выбранную пустую ячейку', W.S.ws.cells[0] && W.S.ws.cells[0].id, few);
  /* живой ввод: пока тянут — число и кнопка меняются без перерисовки */
  A.wspick('salt'); W.wsRangeLive({ id: 'wsQv', value: '7', min: '0', max: '18', style: { setProperty() {} } });
  eq('живой ввод меняет число ползунка', W.S.overlay.v, 7); A.wsqdo(); eq('живой ввод — ячейка', W.S.ws.cells[1] && W.S.ws.cells[1].q, 7);
  /* запас больше 100 — ползунок до 100 */
  W.BAG.add('sand', 150);
  A.wspick('sand'); r = range(view('ползунок: запас больше 100'));
  ok('ползунок до 100 при запасе больше 100', !!r && r[1] === W.WS_DATA.cellMax);
  A.close();
  /* ресурс на столе: ползунок на его количестве, кнопка «Готово», ноль — убрать со стола */
  A.wspick('fang'); r = range(h = view('ползунок: ресурс на столе'));
  ok('ползунок стоит на количестве со стола', !!r && r[2] === 4); ok('кнопка «Готово · 4»', /id="wsQvGo" data-a="wsqdo">Готово · 4</.test(h));
  A.wsqv('', { value: '2' }); A.wsqdo(); eq('на столе — новое количество', W.S.ws.cells[0] && W.S.ws.cells[0].q, 2);
  A.wspick('fang'); A.wsqv('', { value: '0' }); h = view('ползунок: убрать со стола');
  ok('на нуле — «Убрать со стола»', /id="wsQvGo" data-a="wsqdo">Убрать со стола</.test(h));
  A.wsqdo(); ok('ноль убрал со стола', !W.S.ws.cells.some(c => c && c.id === 'fang'));
  /* перенос на ячейку — ползунок для этой ячейки */
  W.reset(); W.wsPutQ('salt', 3); W.wsPick('fang', 4); eq('перенос — ползунок', W.S.overlay && W.S.overlay.t, 'wsqty'); eq('перенос помнит ячейку', W.S.overlay.at, 4);
  A.wsqv('', { value: '5' }); A.wsqdo(); eq('перенос — в свою ячейку и ровно выбранное', W.S.ws.cells[4] && `${W.S.ws.cells[4].id}×${W.S.ws.cells[4].q}`, 'fang×5');
  /* полный стол: новый ресурс — отказ без ползунка */
  W.reset(); ['resin', 'mushroom', 'acid', 'ash', 'salt', 'vial'].forEach(x => W.wsPutQ(x, 1));
  A.wspick('sand'); ok('полный стол: без ползунка', !W.S.overlay); ok('полный стол: строка про занятые ячейки', !!W.S.toast && /заняты/.test(W.S.toast.t));
  A.wspick('salt'); eq('полный стол: ресурс со стола — ползунок', W.S.overlay && W.S.overlay.t, 'wsqty'); A.close();
  /* количество выбранной ячейки — ползунок под столом: от 1 до min(100, запас) */
  A.wscell('4'); h = view('ползунок ячейки');
  const c = h.match(/<input class="ws-range" id="wsQc" type="range" min="(\d+)" max="(\d+)" step="1" value="(\d+)"/);
  ok('под столом нет ползунка ячейки', !!c);
  if (c) { eq('ползунок ячейки от 1', +c[1], 1); eq('ползунок ячейки до запаса', +c[2], W.wsCellMax('salt')); }
  A.wsqset('', { value: '9' }); eq('ползунок ячейки меняет количество', W.S.ws.cells[4].q, Math.min(9, W.wsCellMax('salt')));
  W.wsRangeLive({ id: 'wsQc', value: '3', min: '1', max: '18', style: { setProperty() {} } }); eq('живой ввод ячейки', W.S.ws.cells[4].q, 3);
});

scene('потоки презентации', () => {
  for (const nm of ['Мастерская', 'Мастерская · удача', 'Мастерская · неудача', 'Мастерская · подсказки', 'Мастерская · автодокрафт']) {
    const f = W.FLOWS.find(x => x[0] === nm);
    if (!f) { err.push(`нет потока «${nm}»`); continue; }
    W.reset(); f[2]();
    const h = view('поток · ' + nm);
    if (nm === 'Мастерская') ok('поток «Мастерская»: найденный рецепт на столе', h.includes('Совпадает с рецептом'));
    if (nm === 'Мастерская · удача') ok('поток «удача»: полная анимация и новая запись', !!W.S.ws.fx && W.S.ws.fx.tempo === 'full' && W.S.ws.fx.isNew && h.includes('ws-fx-bk'));
    if (nm === 'Мастерская · неудача') ok('поток «неудача»: анимация неудачи', !!W.S.ws.fx && W.S.ws.fx.kind === 'fail' && h.includes('ws-fx-ck'));
    if (nm === 'Мастерская · автодокрафт') ok('поток автодокрафта: согласие на уникальный', h.includes('data-a="wsok"'));
  }
});

/* 6. анимация крафта: исход решает сервер до анимации, темпы, пропуск нажатием и галочкой, «меньше движения», повтор номера,
   таймеры показа, трещины от сида, UI-кит, стили — только transform и opacity */
const timers = [];
const fakeTimers = on => { timers.length = 0; win.setTimeout = on ? (f, ms) => { timers.push({ f, ms: ms | 0 }); return timers.length; } : () => 0; };
const flush = () => { timers.splice(0).sort((a, b) => a.ms - b.ms).forEach(t => { try { t.f(); } catch (e) { err.push('таймер показа: ' + e.message); } }); };
const styleNums = h => [...h.matchAll(/--(?:dt|dk|dp|da|d0|dx|tt|tp|tsh|tpn|tfd):(-?[\d.]+)ms/g)].map(m => m[1]);
const madeIds = ['p_fang', 'plank', 'dye', 'a_arrow'];

scene('анимация: удача и новая запись', () => {
  W.reset();
  const D = W.WS_DATA.demo, F = W.WS_FX;
  W.wsSetTable(D.made);
  const b = snap(madeIds);
  A.wstry(); eq('неизвестное сочетание — подтверждение', W.S.overlay && W.S.overlay.t, 'wstry');
  const op = W.S.overlay.op;
  ok('номер операции у подтверждения', /^ws\d+$/.test(op || '') && view('подтверждение').includes(`data-a="wstrydo" data-v="${op}"`));
  A.wstrydo();
  const R = W.S.ws.fx;
  ok('удача: полная версия, новая запись', !!R && R.kind === 'made' && R.tempo === 'full' && R.isNew);
  /* итог решает сервер до анимации: запасы и книга изменились в миг нажатия, анимация их не трогает */
  eq('стрелы созданы до анимации', q('a_arrow'), b.a_arrow + 1); eq('заготовки списаны до анимации', q('p_fang'), b.p_fang - 2);
  ok('рецепт в книге до анимации', W.BAG.known('r_a_arrow'));
  let h = view('удача: анимация');
  ok('удача: книга и чернила', h.includes('ws-fx-full') && h.includes('ws-fx-new') && h.includes('class="ws-fx-bk"') && h.includes('ws-fx-ink'));
  eq('удача: нитей', (h.match(/class="ws-fx-th"/g) || []).length, 3); eq('удача: предметов', (h.match(/class="ws-fx-it"/g) || []).length, 3);
  ok('удача: ядро раскаляется и вспыхивает', h.includes('ws-fx-heat') && h.includes('ws-fx-fl'));
  ok('удача: итог поднимается в цвете редкости', /class="ws-fx-res ws-in" data-r="\d"/.test(h));
  ok('удача: нажатие на сцену — к итогу', h.includes('data-a="wsfxreveal"'));
  ok('лист итога во время анимации неактивен', /class="ws-fx-pn"[^>]*\sinert/.test(h));
  ok('нет «Новая запись в книге»', h.includes('Новая запись в книге'));
  /* моменты — целые мс; задержки в разметке — целые */
  const T = R.T, all = [].concat(...Object.values(T).map(v => Array.isArray(v) ? v : [v]));
  ok('моменты показа — целые мс', all.every(Number.isInteger));
  eq('конец с книгой', T.end, F.full.end + F.book.end);
  ok('задержки в разметке — целые мс', styleNums(h).length > 20 && styleNums(h).every(s => /^-?\d+$/.test(s)));
  /* повтор номера операции ничего не меняет */
  const s1 = JSON.stringify(snap(madeIds));
  const again = W.WS_SRV.attempt(op, [{ id: 'p_fang', q: 2, pos: 0 }, { id: 'plank', q: 2, pos: 1 }, { id: 'dye', q: 1, pos: 2 }], false);
  ok('повтор номера — прежний ответ', !!again.again && again.res === R.res);
  A.wstrydo(op);
  eq('повтор не списывает и не выдаёт', JSON.stringify(snap(madeIds)), s1);
  /* итог: мимолётного нет, лист активен, «В книгу» */
  A.wsfxreveal();
  eq('нажатие на сцену — итог', R.phase, 'res');
  eq('пропуск не меняет итог', JSON.stringify(snap(madeIds)), s1);
  h = view('удача: итог');
  ok('итог: без мимолётного', h.includes('ws-fx-done') && !h.includes('class="ws-fx-th"') && !h.includes('class="ws-fx-it"') && !h.includes('wsfxreveal'));
  ok('итог: лист активен', !/class="ws-fx-pn"[^>]*\sinert/.test(h));
  ok('итог: «В книгу»', h.includes('data-a="wsbookgo" data-v="r_a_arrow"'));
  A.wsbookgo('r_a_arrow');
  eq('«В книгу» — книга', W.S.ws.view, 'book'); eq('«В книгу» — строка нового рецепта', rows(view('книга: новая запись')), 1);
});

scene('анимация: таймеры показа', () => {
  W.reset(); fakeTimers(true);
  W.wsSetTable(W.WS_DATA.demo.made); A.wstry(); A.wstrydo();
  const R = W.S.ws.fx, T = R.T, P = W.WS_FX.full, at = timers.map(t => t.ms);
  ok('таймер вспышки', at.includes(T.flash)); ok('таймер огоньков', at.includes(T.rise + P.riseDur));
  ok('таймер книги', at.includes(T.book + W.WS_FX.book.light)); ok('таймер итога', at.includes(T.end));
  flush();
  eq('после таймеров — итог', R.phase, 'res'); ok('окно итога открыто', !!W.S.overlay && W.S.overlay.t === 'wsres');
  view('итог по таймеру');
  /* короткая без листа закрывается сама и говорит строкой */
  A.close(); W.wsSetTable(W.WS_DATA.demo.table); timers.length = 0; A.wstry();
  const Q = W.S.ws.fx;
  ok('короткая: таймер закрытия', !!Q && Q.auto && timers.some(t => t.ms === Q.T.close));
  flush();
  ok('короткая закрылась сама', !W.S.overlay && !W.S.ws.fx); ok('короткая: строка «Создано»', !!W.S.toast && /Создано/.test(W.S.toast.t));
  /* неудача: разрыв нитей, пепел у каждого предмета, итог */
  W.wsSetTable(W.WS_DATA.demo.fail); timers.length = 0; A.wstry(); A.wstrydo();
  const N = W.S.ws.fx;
  ok('неудача: таймер разрыва', timers.some(t => t.ms === N.T.snap));
  eq('неудача: таймеров пепла', N.T.crumble.filter(ms => timers.some(t => t.ms === ms)).length, N.cells.length);
  flush(); eq('неудача: итог по таймеру', N.phase, 'res');
  fakeTimers(false);
});

scene('анимация: пропуск и «меньше движения»', () => {
  W.reset();
  W.S.ws.skip = true;
  W.wsSetTable(W.WS_DATA.demo.fail); A.wstry(); A.wstrydo();
  eq('«Пропустить анимацию» — сразу итог', W.S.ws.fx && W.S.ws.fx.phase, 'res');
  ok('галочка стоит', /data-a="wsfxskip" checked/.test(view('пропуск: итог')));
  A.close(); W.wsSetTable(W.WS_DATA.demo.table); A.wstry();
  ok('пропуск: короткая без листа — сразу строкой', !W.S.overlay && !!W.S.toast && /Создано/.test(W.S.toast.t));
  W.S.ws.skip = false;
  /* галочка посреди анимации — итог сразу, выбор запомнен */
  W.wsSetTable(W.WS_DATA.demo.fail); A.wstry(); A.wstrydo();
  const R = W.S.ws.fx; eq('без пропуска — анимация', R && R.phase, 'anim');
  A.wsfxskip('', { checked: true }); eq('галочка посреди анимации — итог', R.phase, 'res'); ok('выбор запомнен', W.S.ws.skip === true);
  A.wsfxskip('', { checked: false });
  /* «меньше движения» в системе: анимации нет, галочка недоступна */
  const mm = win.matchMedia;
  win.matchMedia = qq => ({ matches: /reduce/.test(qq), addEventListener() {}, addListener() {} });
  A.close(); W.wsSetTable(W.WS_DATA.demo.fail); A.wstry(); A.wstrydo();
  eq('«меньше движения» — сразу итог', W.S.ws.fx && W.S.ws.fx.phase, 'res');
  ok('«меньше движения»: галочка недоступна', /data-a="wsfxskip" checked disabled/.test(view('меньше движения')));
  win.matchMedia = mm;
});

scene('анимация: автодокрафт и серия — короткая', () => {
  W.reset();
  A.wsmake('r_p_frame'); A.wsn('max'); const n = W.S.overlay.n;
  const b = snap(['p_frame']);
  A.wsmakedo();
  const R = W.S.ws.fx;
  eq('автодокрафт выдан до анимации', q('p_frame'), b.p_frame + n);
  ok('автодокрафт: короткая с листом', !!R && R.kind === 'make' && R.tempo === 'short' && !R.auto);
  const h = view('автодокрафт: анимация');
  ok('автодокрафт: «Автодокрафт ×N» в шапке', n === 1 || h.includes('Автодокрафт ×' + n));
  ok('серия: удары ядра', n < 2 || /class="ws-fx-thump"[^>]*--n:\d/.test(h));
  ok('автодокрафт: «Списано» — в подробностях', /<details class="ws-fx-det"><summary>Списано/.test(h));
  eq('автодокрафт: ингредиентов на круге', (h.match(/class="ws-fx-it"/g) || []).length, W.BAG.recipe('r_p_frame').in.length);
  ok('короткая короче полной', R.T.end < W.WS_FX.full.end);
  A.wsmakedo(); eq('повторное нажатие не повторяет автодокрафт', q('p_frame'), b.p_frame + n);
});

scene('анимация: трещины и дым — от сида операции', () => {
  const G = W.WS_FX.geo, c = G.circ / 2;
  const s1 = W.wsCracks(W.WS_SRV.seed('ws7')), s2 = W.wsCracks(W.WS_SRV.seed('ws7')), s3 = W.wsCracks(W.WS_SRV.seed('ws8'));
  ok('та же операция — те же трещины', JSON.stringify(s1) === JSON.stringify(s2)); ok('другая операция — другие трещины', JSON.stringify(s1) !== JSON.stringify(s3));
  ok('трещины есть', s1.length >= W.WS_FX.crack.from);
  ok('трещины в круге', s1.every(x => (x.x - c) ** 2 + (x.y - c) ** 2 <= c * c));
  ok('трещины — целые px и градусы', s1.every(x => [x.x, x.y, x.a, x.l].every(Number.isInteger)));
  /* места круга совпадают со столом: шесть мест, нить смотрит в центр */
  eq('мест на круге', G.hex.length, W.WS_DATA.cells);
  G.hex.forEach(([x, y], i) => { const a = (Math.round(Math.atan2(-y, -x) * 180 / Math.PI) + 360) % 360; ok(`нить места ${i} смотрит в центр: ${G.ang[i]}° против ${a}°`, Math.abs(((G.ang[i] - a + 540) % 360) - 180) <= 1); });
  /* раскладка итога помещается в кадр телефона 932 × 430 и 844 × 390: круг слева, лист справа, не заходят друг на друга и под шапку */
  const top = 44;   // шапка окна: подпись, галочка, крестик
  for (const [w, h] of [[932, 430], [844, 390]]) {
    const cx = w / 2 - G.shift, cy = h / 2 + G.top, pl = w / 2 + G.paneX, pr = pl + Math.min(G.pane, w / 2 - 24);
    ok(`${w}×${h}: круг в кадре`, cx - c >= 0 && cy - c >= top && cy + c <= h);
    ok(`${w}×${h}: лист в кадре`, pr <= w - 8);
    ok(`${w}×${h}: круг и лист не заходят друг на друга`, cx + c + 8 <= pl);
    ok(`${w}×${h}: круг в середине до итога`, h / 2 + G.top - c >= top);
  }
  const cellR = Math.max(...G.hex.map(([x, y]) => Math.round(Math.sqrt(x * x + y * y)))) + G.cell / 2;
  ok('места внутри круга', cellR <= c);
});

scene('UI-кит: крафт — удача и неудача', () => {
  W.reset();
  const before = JSON.stringify({ bag: W.S.bag, wallet: W.S.wallet, part: W.S.ws.part, owned: W.S.rs.owned });
  ok('раздел в KIT_EXTRA', W.KIT_EXTRA.some(x => x.html === W.wsKitHtml));
  ok('раздел UI-кита есть', look('UI-кит · раздел', W.wsKitHtml()).includes('Крафт: удача и неудача'));
  for (const k of ['made', 'new', 'hero', 'make', 'fail', 'hint']) { W.wsKitPlay(k); look('UI-кит · проба ' + k, W.kitStage()); }
  ok('проба героя — лицо', (W.wsKitPlay('hero'), W.kitStage()).includes('ws-fx-hero'));
  ok('проба с подсказкой — подсказка', (W.wsKitPlay('hint'), W.kitStage()).includes('появился в книге'));
  for (let r = 1; r <= 7; r++) { W.wsKitAct('r:' + r); const hh = look('UI-кит · редкость ' + r, W.kitStage()); ok(`проба редкости ${r} — в её цвете`, hh.includes(`data-r="${r}"`)); }
  const inKit = W.KIT_EXTRA.find(x => x.html && x.html.name === 'wsInKitHtml');
  ok('UI-кит: нет раздела «Мастерская: ввод ресурса»', !!inKit);
  if (inKit) { const kh = look('UI-кит · ввод ресурса', inKit.html()); ok('UI-кит · ввод ресурса: нет лупы и ползунка', kh.includes('class="ws-lens"') && kh.includes('class="ws-range"')); ok('UI-кит · ввод ресурса: нажатия живые', !/data-a="(?:wspick|wsinfo)"/.test(kh)); }
  const board = look('UI-кит · раскадровка', W.wsKitBoardHtml());
  eq('раскадровка: кадров', (board.match(/class="ws-still"/g) || []).length, 8);
  eq('проба — не выдача', JSON.stringify({ bag: W.S.bag, wallet: W.S.wallet, part: W.S.ws.part, owned: W.S.rs.owned }), before);
});

scene('стили анимации: только transform и opacity', () => {
  const kf = [...CSS.matchAll(/@keyframes\s+(ws-[a-z0-9-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
  ok('ключевые кадры анимации найдены', kf.length >= 20);
  for (const [, name, body] of kf) {
    const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]).filter(p => p !== 'offset');
    const bad = props.filter(p => p !== 'transform' && p !== 'opacity');
    if (bad.length) err.push(`@keyframes ${name}: анимирует не только transform и opacity — ${[...new Set(bad)].join(', ')}`);
  }
  const used = new Set([...CSS.matchAll(/animation:\s*(ws-[a-z0-9-]+)/g)].map(m => m[1])), defined = new Set(kf.map(m => m[1]));
  for (const u of used) if (!defined.has(u)) err.push(`craft.css: анимация ${u} без ключевых кадров`);
  ok('«меньше движения» выключает анимацию сцены', /@media \(prefers-reduced-motion:reduce\)\{[^}]*\.ws-fx,\.ws-fx \*/.test(CSS.replace(/\s+/g, ' ').replace(/\{ /g, '{')));
  ok('итог без анимации — правило ws-fx-done', CSS.includes('.ws-fx-done .ws-fx-sc *'));
});

console.log(`Разметок проверено: ${drawn}. Состояния: пустой стол, найденный рецепт, лишнее, неудача, подсказки (появление, позиция, послабление), случайное открытие, герои из рецептов, книга, автодокрафт, сведения, перенос, потоки; анимация — удача и новая запись, неудача, короткая, серия, пропуск, «меньше движения», таймеры, трещины от сида, UI-кит.`);
done();

function done() {
  if (warn.length) console.log('Предупреждения:\n' + warn.join('\n'));
  if (err.length) { console.log('ОШИБКИ:\n' + err.slice(0, 40).join('\n') + (err.length > 40 ? `\n… и ещё ${err.length - 40}` : '')); process.exit(1); }
  console.log('Проверка пройдена: экран «Мастерская» рисуется во всех состояниях без исключений, запасы меняются по правилам §12.');
  process.exit(0);
}
