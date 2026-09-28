/* Автопроверка экрана «Ремесло → Мастерская» прототипа — без браузера.
   Экран — design/ui/screens/craft.js и craft.css, договор — screens/model.js, правила — GDD §12, §36.12, §36.16.
   1. craft.js и craft.css подключены в index.html после model.js; craft.js компилируется; концы строк своих файлов — CRLF.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Экран и его листы рисуются во всех состояниях: пустой стол, найденный рецепт, лишнее, неудача, подсказки
      (появление, новая позиция, послабление по количеству), случайное открытие, герой из рецепта, книга (вкладки, вид,
      избранное, поиск), автодокрафт (остановка на неизвестном этапе, согласие на невосполнимое, количество), сведения о ресурсе.
      В разметке — ни исключений, ни undefined, NaN, [object; ни полей «для команды»: обоснований рецептов, спойлеров цикла VI,
      будущих биомов и боссов (§12.5).
   4. Запасы меняются как положено: попытка списывает весь стол, неудача ничего не создаёт, повторное нажатие не повторяет расход,
      особый ресурс без согласия не списывается, герой приходит в коллекцию с 0 ур., 0 РП и 0 Добл.
   5. Все классы ws-* из craft.js описаны в craft.css.
   Запуск: node tools/content-gen/screens/check_craft.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
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
  ACT, BAG, WS_DATA, WS_SRV, RSI, rsHas, FLOWS, EN_RECIPES, wsPut, wsSetTable, wsToCraft,
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

function look(label, h) {
  drawn++;
  if (typeof h !== 'string' || !h) { err.push(label + ': пустая разметка'); return ''; }
  const bad = h.match(/undefined|NaN|\[object /);
  if (bad) err.push(`${label}: в разметке «${bad[0]}» — …${h.slice(Math.max(0, bad.index - 90), bad.index + 30).replace(/\s+/g, ' ')}…`);
  for (const [why, s] of leaks) if (h.includes(s)) err.push(`${label}: ${why} — «${s}»`);
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
  ok('пустой стол: нет подписи «Порядок не важен»', h.includes('Порядок не важен'));
  ok('пустой стол: «Попробовать» должна быть недоступна', disabled(h, 'wstry'));
  const stock = R.items.filter(i => !i.team && q(i.id) > 0);
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
  A.wscell('0'); A.wsq('max'); eq('«Макс» — всё, что есть', W.S.ws.cells[0].q, Math.min(W.WS_DATA.cellMax, q('fang')));
  ok('лишнее: нет «лишнее сгорит»', view('лишнее на столе').includes('лишнее сгорит'));
  A.wsq('-10'); eq('минимум — 1', W.S.ws.cells[0].q, 1);
  A.wsqset('', { value: '500' }); eq('ввод сверх запасов', W.S.ws.cells[0].q, Math.min(W.WS_DATA.cellMax, q('fang')));
  A.wsqset('', { value: '2' }); eq('ввод числа', W.S.ws.cells[0].q, 2);
  const b = snap(['fang', 'k1_hunt', 'p_fang']);
  A.wstry();
  ok('чистое совпадение — без подтверждения', !W.S.overlay);
  eq('клык списан', q('fang'), b.fang - 2); eq('ключ списан', q('k1_hunt'), b.k1_hunt - 1); eq('заготовка создана', q('p_fang'), b.p_fang + 1);
  ok('стол очищен', W.S.ws.cells.every(c => !c));
  ok('тост «Создано»', !!W.S.toast && /Создано/.test(W.S.toast.t));
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
  ok('нет «Подсказки нет»', h.includes('Подсказки нет')); ok('нет «Повторить набор»', h.includes('data-a="wsrepeat"'));
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
  ok('книга: нет подсказки «Оррин Напев»', h.includes('Оррин Напев')); ok('книга: нет «верно 3 из 4»', h.includes('верно 3 из 4'));
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
  ok('герой в коллекции', !!hero && W.rsHas(hero));
  eq('герой пришёл с 0 ур., 0 РП и 0 Добл', JSON.stringify(W.S.rs.owned['c1-20']), JSON.stringify({ lvl: 0, lim: 0, valor: 0, how: 'craft' }));
  ok('рецепт героя найден', W.BAG.known(rid)); ok('подсказка снята', !W.S.ws.part[rid]); eq('герой не лёг в запасы', q('h_c1_20'), 0);
  h = view('герой создан');
  ok('итог: нет «0 ур. · 0 РП · 0 Добл»', h.includes('0 ур. · 0 РП · 0 Добл')); ok('итог: нет карточки героя', h.includes('data-a="rhero"'));
  /* повтор героя */
  A.close(); A.wsview('book'); A.wsbtab('all');
  ok('книга: нет «в коллекции»', view('книга: герой в коллекции').includes('в коллекции'));
  A.wsmake(rid); ok('автодокрафт героя из коллекции недоступен', disabled(view('автодокрафт: герой в коллекции'), 'wsmakedo'));
  W.BAG.add('find_cb1', 2); W.BAG.add('cr_mold', 3); W.BAG.add('p_waxthread', 2); W.BAG.add('p_print', 1);
  const b = snap(['find_cb1']);
  A.wsmakedo(); eq('повтор героя ничего не списывает', q('find_cb1'), b.find_cb1);
  A.close();
  W.wsSetTable([['find_cb1', 2], ['p_waxthread', 2], ['cr_mold', 3], ['p_print', 1]]);
  h = view('стол: герой в коллекции');
  ok('стол: нет «уже в коллекции»', h.includes('уже в коллекции')); ok('стол: попытка недоступна', disabled(h, 'wstry'));
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
  ok('Ойвин Должник в коллекции', W.rsHas(W.RSI['c1-18']));
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
  ok('книга: «Слепок ловчего» — неизвестный этап', /Слепок ловчего<\/b><span class="chip warn">/.test(view('книга')));
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
  const ids = ['call_fb1', 'u2', 'find_cb1', 'bone', 'k2_hunt', 'resin', 'sand', 'k1_alch', 'k1_ench', 'p_frame', 'a_cast', 'p_clay', 'p_print', 'p_lure'], b = snap(ids);
  A.wsok('', { checked: true });
  ok('с согласием доступно', !disabled(view('автодокрафт: согласие дано'), 'wsmakedo'));
  A.wsmakedo();
  eq('призыв создан', q('call_fb1'), b.call_fb1 + 1); eq('уникальный списан', q('u2'), b.u2 - 1); eq('находка списана', q('find_cb1'), b.find_cb1 - 1);
  eq('кость', q('bone'), b.bone - 2); eq('смола', q('resin'), b.resin - 3); eq('песок', q('sand'), b.sand - 5); eq('каркас — из запасов', q('p_frame'), b.p_frame - 1);
  eq('промежуточные этапы не остались в запасах', q('a_cast') + q('p_clay') + q('p_print') + q('p_lure'), b.a_cast + b.p_clay + b.p_print + b.p_lure);
  eq('итог автодокрафта', W.S.overlay && W.S.overlay.res && W.S.overlay.res.kind, 'make');
  view('итог автодокрафта');
  A.wsmakedo(); eq('повторное нажатие не повторяет расход', q('call_fb1'), b.call_fb1 + 1);
  A.close(); A.wsview('book');
  ok('книга: уникального больше нет — «не хватает»', /Слепок ловчего<\/b><span class="chip">не хватает/.test(view('книга после автодокрафта')));
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
  A.wsmake('r_vr1'); ok('руна доблести: не хватает осколков', view('автодокрафт: руна доблести').includes('Не хватает'));
  A.wsmake('r_a_iron'); ok('ненайденный рецепт не раскрывает состав', !view('автодокрафт: не найден').includes('Этапы'));
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
  ok('нет «Не хватает в запасах»', h.includes('Не хватает в запасах')); ok('попытка недоступна', disabled(h, 'wstry'));
  const b = snap(['fang']); A.wstry(); eq('ничего не списано', q('fang'), b.fang);
});

scene('книга рецептов', () => {
  W.reset();
  A.wsview('book');
  const known = W.WS_SRV.known().length, parts = Object.keys(W.S.ws.part).length;
  let h = view('книга');
  eq('книга: строк', rows(h), known + parts); ok('книга: вкладка «Все»', h.includes(`Все · ${known + parts}`));
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
  W.S.ws.part = {}; A.wsbtab('hint'); ok('без подсказок книга объясняет правило', view('книга · подсказок нет').includes('Подсказок пока нет'));
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
  A.toCraft('resin'); eq('маршрут', W.S.route, 'craft'); ok('смола на столе', W.S.ws.cells.some(c => c && c.id === 'resin'));
  view('на стол из запасов');
  A.toCraft('cinder'); view('прежний предмет прототипа');
});

scene('потоки презентации', () => {
  for (const nm of ['Мастерская', 'Мастерская · подсказки', 'Мастерская · автодокрафт']) {
    const f = W.FLOWS.find(x => x[0] === nm);
    if (!f) { err.push(`нет потока «${nm}»`); continue; }
    W.reset(); f[2]();
    const h = view('поток · ' + nm);
    if (nm === 'Мастерская') ok('поток «Мастерская»: найденный рецепт на столе', h.includes('Совпадает с рецептом'));
    if (nm === 'Мастерская · автодокрафт') ok('поток автодокрафта: согласие на уникальный', h.includes('data-a="wsok"'));
  }
});

console.log(`Разметок проверено: ${drawn}. Состояния: пустой стол, найденный рецепт, лишнее, неудача, подсказки (появление, позиция, послабление), случайное открытие, герои из рецептов, книга, автодокрафт, сведения, перенос, потоки.`);
done();

function done() {
  if (warn.length) console.log('Предупреждения:\n' + warn.join('\n'));
  if (err.length) { console.log('ОШИБКИ:\n' + err.slice(0, 40).join('\n') + (err.length > 40 ? `\n… и ещё ${err.length - 40}` : '')); process.exit(1); }
  console.log('Проверка пройдена: экран «Мастерская» рисуется во всех состояниях без исключений, запасы меняются по правилам §12.');
  process.exit(0);
}
