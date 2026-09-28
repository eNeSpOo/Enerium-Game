/* Автопроверка экрана «Ремесло → Запасы», сундуков и «Даров путешествия» (design/ui/screens/bag.js) — без браузера.
   1. index.html подключает screens/bag.js и screens/bag.css; концы строк index.html, bag.js и bag.css — только CRLF.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Запасы: все вкладки, все значения фильтров (цикл, ремесло, редкость), «не в рецептах», поиск с вводом в поле; карточка каждой записи.
      Видимые записи подходят под фильтры. Нигде нет исключений, undefined, NaN и объектов в разметке.
      «Правила воздуха»: над списком одна строка — поиск и «Фильтры», сами фильтры — в листе; у карточки ресурса одно действие,
      «Найденные рецепты» и «Откуда падает» — листы по нажатию, в листах — те же рецепты и источники без ссылок на ADR и §.
   4. Активации: без обработчика — «недоступно»; с обработчиком кнопка зовёт ACTIVATE[ярус](id).
   5. Сундуки: каждый демо-сундук открывается по одному и пачкой; итог — крупно в той же карточке — сходится с запасами,
      кошельком и осколками; тот же сундук второй раз не открывается. Состав и шансы — лист по нажатию.
      Все виды × редкости × окна × циклы (× недели у осколков) — карточка, лист состава и открытие,
      осколки пробуждённых героев уходят в прах, без флажка «для команды» — ни одного спойлерного имени.
   6. Дары: типичная неделя сходится с EN_LOOTBOXES.week; две категории, история и попап сундуков; одно действие на строку;
      «Получить» по строке и «Получить всё»; ждущее и полученное второй раз не выдаётся; полученное — в истории;
      кнопка «Дары» на экране недели; цикл I — без Даров.
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
  zpEntries, zpView, zpChestGroups, zpOpenOne, zpCard, zpSrc, darRows, darCount, lbGiftRows, ZP_DEMO, ZP_FILT, trNorm, trEsc,
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
const snap = () => JSON.parse(JSON.stringify({ wallet: T.S.wallet, items: T.S.bag.items, shards: T.S.rs.shards, extra: T.S.zp.extra, chests: T.S.bag.chests.length }));
const cnt = { tabs: 0, cards: 0, sheets: 0, filters: 0, open: 0, synth: 0, dust: 0, gifts: 0, claimed: 0 };

/* всё, что может выпасть из сундука, есть в recipes.js и roster.js — иначе оно легло бы в запасы невидимым */
{
  const ids = new Set(Object.keys(T.LBX.items).concat(T.LBX.pools.basic, ...['key', 'unique'].map(k => Object.values(T.LBX.pools[k]).flat())));
  for (const ln of Object.values(T.LBX.lines)) if (ln.kind === 'item') ln.by.filter(Boolean).forEach(b => ids.add(b[0]));
  const miss = [...ids].filter(id => !T.BAG.item(id)), hmiss = Object.values(T.LBX.pools.heroes).flat().filter(h => !T.RSI[h.id]).map(h => h.id);
  if (miss.length) say(`сундуки: предметов нет в recipes.js — ${miss.slice(0, 5).join(', ')}`);
  if (hmiss.length) say(`сундуки: героев пула нет в roster.js — ${hmiss.slice(0, 5).join(', ')}`);
}
/* спойлеры для игрока: талисманы со спойлером в имени, ресурсы цикла VI и записи recipes.js с team */
const spoil = [...new Set(Object.values(T.LBX.talInfo).filter(t => t[2]).map(t => t[0])
  .concat(Object.values(T.LBX.items).filter(i => i.team).map(i => i.n), T.RX.items.filter(i => i.team).map(i => i.n)))];
const leak = (h, where) => { const l = spoil.filter(n => h.includes(n)); if (l.length) say(`${where}: спойлер без флажка «для команды» — ${l.slice(0, 3).join(', ')}`); };

/* 3. запасы: вкладки, карточки, фильтры, поиск */
reset();
T.KH.team = false;
for (const tab of ['res', 'rune', 'shard', 'act', 'chest', 'art']) {
  const h = stock(tab, `вкладка ${tab}`); cnt.tabs++;
  if (!h.includes('zp-bar')) say(`вкладка ${tab}: нет строки вкладок`);
  if (tab === 'art' && !h.includes('позже')) say('вкладка «Артефакты»: нет пометки «позже»');
  if (tab === 'art') continue;
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
      if (!uses.length && tab !== 'act' && !card.includes('Ни в одном найденном рецепте')) say(`${tab} · ${e.key}: не сказано, что в найденных рецептах ресурса нет`);
      if (src.length && !card.includes(`data-v="zpsrc:${e.id}"`)) say(`${tab} · ${e.key}: нет строки «Откуда падает»`);
      if (!e.it.team && e.it.lore && !card.includes('Загадка')) say(`${tab} · ${e.key}: в карточке нет загадки`);
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
/* лист «Фильтры»: значения каждой вкладки — чипы; нажатие ставит фильтр, повторное — снимает; «Сбросить» чистит всё */
reset();
for (const tab of ['res', 'rune', 'shard', 'act', 'chest']) {
  T.S.zp.tab = tab;
  const O = T.zpView(tab).O, on = T.ZP_FILT[tab], h = sheetOf('zpfilt', '', `фильтры ${tab}`); cnt.sheets++;
  const want = [].concat(on.includes('cyc') ? O.cyc.map(v => 'cyc:' + v) : [], on.includes('spec') ? O.spec.map(v => 'spec:' + v) : [], on.includes('r') ? O.r.map(v => 'r:' + v) : []);
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
  if (T.S.zp.f.cyc || T.S.zp.f.spec || T.S.zp.f.r || T.S.zp.f.un) say(`фильтры ${tab}: «Сбросить» не сбросил`);
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
for (const tab of ['res', 'rune', 'shard', 'act', 'chest']) {
  T.S.zp.tab = tab;
  const O = T.zpView(tab).O;
  const tries = [{}, { un: true }];
  for (const c of O.cyc) tries.push({ cyc: c }, { cyc: c, un: true });
  for (const s of O.spec) tries.push({ spec: s }, { spec: s, cyc: O.cyc[0] || '' });
  for (const r of O.r) tries.push({ r }, { r, spec: O.spec[0] || '' });
  for (const q of ['а', 'клык', 'ЁЛКА', 'руна', 'сундук', 'zzz', '<b>"', ' ключ ']) tries.push({ q });
  for (const t of tries) {
    T.S.zp.f = { cyc: t.cyc || '', spec: t.spec || '', r: t.r || '', un: !!t.un }; T.S.zp.q = t.q || '';
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
  const act = T.zpEntries('act');
  if (!act.length) say('активации: в демо нет предметов ярусов act, call, echo');
  for (const e of act) {
    stock('act', 'активации'); T.ACT.zpsel(e.key);
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
    const d = (after.wallet[k] || 0) - (before.wallet[k] || 0), want = (sum.cur[k] || 0) + (k === 'dust' ? dust : 0);
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
  for (const tab of ['res', 'rune', 'shard', 'act', 'chest']) for (const e of T.zpEntries(tab)) { T.S.zp.tab = tab; T.ACT.zpsel(e.key); game(`после открытия · ${e.key}`); }
}
/* все виды × редкости × окна × циклы (× недели): половина героев недели пробуждена — их осколки уходят в прах */
reset();
{
  const pool = Object.values(T.LBX.pools.heroes).flat();
  pool.forEach((h, i) => { if (i % 2 === 0 && T.RSI[h.id]) T.S.rs.owned[h.id] = { lvl: 0, lim: 0, valor: 0, how: 'souls' }; });
  const boxes = Object.keys(T.LBX.boxes), wins = Object.keys(T.LBX.winNames);
  let k = 0;
  for (const box of boxes) for (let r = 1; r <= 7; r++) for (const win of wins) for (let cyc = 1; cyc <= 6; cyc++) for (const week of box === 'shards' ? T.LBX.weeks : [null]) {
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
    leak(card + info, where + ' · карточка');
    const before = snap();
    run(where, () => T.ACT.zpopen(g.key));
    const L = T.S.zp.last, after = snap();
    if (!L || L.sum.n !== 1) { say(`${where}: не открылся`); continue; }
    sumCheck(before, after, L.sum, where);
    if (Object.keys(L.sum.dust).length) cnt.dust++;
    const res = clean(run(where, () => T.zpCard(T.zpView('chest').sel, 'chest')) || '', where + ' · итог');
    if (!res.includes('class="zp-res"') || !res.includes('Открыто: ')) say(`${where}: итог не показан`);
    const kinds = ['items', 'shards', 'dust', 'extra'].reduce((a, k) => a + Object.keys(L.sum[k]).length, 0), rl = (res.match(/class="zp-rl[ "]/g) || []).length;
    if (rl !== kinds) say(`${where}: в итоге плиток ${rl}, получено видов ${kinds}`);
    const curN = Object.keys(L.sum.cur).length, rc = (res.match(/class="zp-rc"/g) || []).length;
    if (rc !== curN) say(`${where}: в итоге валют ${rc}, получено ${curN}`);
    leak(res, where + ' · итог');
    T.S.bag.chests = T.S.bag.chests.filter(c => c.src !== 'проверка');
    cnt.synth++;
  }
  if (!cnt.dust) say('осколки пробуждённых героев ни разу не ушли в прах');
  for (const tab of ['res', 'rune', 'shard', 'act', 'chest']) { const h = stock(tab, `после всех видов · ${tab}`); leak(h, `после всех видов · ${tab}`); for (const e of T.zpEntries(tab)) { T.ACT.zpsel(e.key); leak(game(`после всех видов · ${e.key}`), `после всех видов · ${e.key}`); } }
}

/* 6. Дары путешествия */
reset();
{
  const c = T.S.acc.cycle, who = T.ZP_DEMO.gifts.who;
  const rows = T.darRows(T.S);
  if (!rows.length) say('Дары: нет строк выплат');
  /* типичная неделя (планки и клановые строки) сходится с EN_LOOTBOXES.week */
  const nowT = rows.filter(p => p.wk.id === 'now' && p.kind !== 'place');
  for (const [mid, w] of Object.entries(T.LBX.week)) {
    if (!w[c]) continue;
    const got = T.darCount(nowT.filter(p => p.id === mid)), want = w[c][who].boxes;
    if (got !== want) say(`Дары: ${mid} — сундуков в строках ${got}, в EN_LOOTBOXES.week ${want}`);
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

/* 7. без S.items, сброс и сценарии презентации */
reset();
{
  delete T.S.items;
  for (const tab of ['res', 'rune', 'shard', 'act', 'chest', 'art']) { stock(tab, `без S.items · ${tab}`); if (tab !== 'art') for (const e of T.zpEntries(tab)) { T.ACT.zpsel(e.key); game(`без S.items · ${e.key}`); } }
  for (const g of T.zpChestGroups()) openGroup(g.key, 'max', `без S.items · ${g.key}`);
  T.S.route = 'week'; T.S.overlay = { t: 'gifts', arg: 'me' }; run('без S.items · Дары', () => T.render()); game('без S.items · Дары');
  run('без S.items · получить всё', () => T.ACT.darall('me'));
  T.S.overlay = { t: 'darbox', arg: '' }; run('без S.items · попап', () => T.render()); game('без S.items · попап');
}
reset();
if (!T.S.zp || !T.S.bag || !Object.keys(T.S.rs.shards).length) say('сброс: нет S.zp, S.bag или осколков демо');
for (const [t, , f] of T.FLOWS.filter(([t]) => /Запасы|Дары/.test(t))) { run(`сценарий ${t}`, () => { f(); T.render(); }); game(`сценарий ${t}`); }
if (T.FLOWS.filter(([t]) => /Запасы|Дары/.test(t)).length !== 2) say('сценарии презентации: нет «Запасы · сундуки» и «Дары путешествия»');

console.log(`Запасы: вкладок ${cnt.tabs}, карточек ${cnt.cards}, листов подробностей ${cnt.sheets}, наборов фильтров ${cnt.filters}. Сундуков открыто: демо и Дары ${cnt.open}, всех видов ${cnt.synth}, с переводом осколков в прах ${cnt.dust}. Дары: отрисовок ${cnt.gifts}, получено выплат ${cnt.claimed}.`);
done();

function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log('Проверка пройдена: запасы, фильтры, карточки, сундуки и Дары — без исключений, undefined и NaN.');
  process.exit(0);
}
