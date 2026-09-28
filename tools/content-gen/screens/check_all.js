/* Автопроверка прототипа «Свет снизу» целиком: у игрока один инвентарь — S.bag через BAG (design/ui/screens/model.js). Без браузера.
   1. index.html — концы строк только CRLF; встроенные скрипты и screens/*.js компилируются; каждый screens/*.js подключён.
   2. В коде прототипа нет обращений к прежнему инвентарю S.items, initialState() его не заводит.
   3. Скрипты выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   4. Все маршруты SCREENS и все сегменты каждого экрана рисуются: переключатели seg, hview, zptab и wsview берутся из самой разметки.
      Нигде нет исключений, undefined, NaN и [object.
   5. Основные действия меняют S.bag и кошелёк по правилам:
      — развитие героя: руны предела и руна доблести своего цикла — из запасов; нехватка и повтор ничего не списывают;
      — забег: базовые общего пула по срабатываниям ядра (от 1 до номера биома), ключи биома с элит, уникальный с босса, руны стража;
        запасы и кошелёк прибавились ровно на добычу итога;
      — лавка и рынок: покупка кладёт в запасы, лот забирает из запасов, снятый возвращает, выручка — без комиссии; повтор не повторяет;
      — ритуалы и Входящие: награда по редкости из EN_RECIPES.drops.rituals; письмо о ритуале и сам ритуал закрываются вместе;
      — сундук: письмо кладёт его через BAG.addChest, «Запасы» открывают, итог сходится с запасами и кошельком; второй раз не открыть.
   6. Листы поверх: сведения о каждом предмете recipes.js (спойлеры цикла VI — только «для команды»), ритуалы, Входящие, итог забега,
      подтверждения, Событие; все сценарии презентации.
   Запуск: node tools/content-gen/screens/check_all.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
const cnt = { routes: 0, views: 0, sheets: 0, items: 0, flows: 0, floors: 0, buys: 0, rituals: 0 };

/* 1. файлы */
{
  const crlf = (html.match(/\r\n/g) || []).length, lf = (html.match(/\n/g) || []).length, cr = (html.match(/\r/g) || []).length;
  if (crlf !== lf || cr !== crlf) say(`index.html: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}, CR ${cr}`);
}
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const screenFiles = fs.readdirSync(path.join(UI, 'screens')).filter(f => f.endsWith('.js')).map(f => 'screens/' + f);
for (const f of screenFiles) {
  try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
  if (!scripts.some(s => s.src === f)) say(`index.html: не подключён ${f}`);
}
for (const s of scripts) if (!s.src) { try { new vm.Script(s.code, { filename: 'index.html' }); } catch (e) { say('синтаксис встроенного скрипта: ' + e.message); } }

/* 2. прежний инвентарь: ни одного обращения к S.items в коде прототипа */
const code = [['index.html', scripts.filter(s => !s.src).map(s => s.code).join('\n')]].concat(scripts.filter(s => s.src).map(s => [s.src, read(s.src)]));
for (const [f, c] of code) {
  const m = c.match(/\bS\s*\.\s*items\b|\bS\s*\[\s*['"]items['"]\s*\]/g);
  if (m) say(`${f}: обращений к S.items — ${m.length}`);
}
if (err.length) done();

/* 3. песочница: у элемента querySelector отдаёт заглушку — экран боя рисует карты по ней */
const stubEl = id => {
  const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, remove() {},
    animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
  e.querySelector = () => stubEl();
  return e;
};
const els = {}, handlers = {};
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
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();

/* доступ к именам скриптов: верхнеуровневые const и let — не свойства window */
const T = vm.runInContext(`({
  get S() { return S; }, set S(v) { S = v; },
  BAG, ACT, OV, SCREENS, ACTIVATE, INV, RX, EB, LBX, KH, FLOWS, render, initialState, startRun, advance,
  heroDev, lootItems, ritSpec, shopCost, mkMin, mkUnit, mkFee, mkPick, poolItems, biomeItems, cycItems, evPlanks,
  zpChestGroups: typeof zpChestGroups === 'function' ? zpChestGroups : null, zpOpenOne: typeof zpOpenOne === 'function' ? zpOpenOne : null,
})`, ctx);

const BAD = /.{0,60}(?:undefined|NaN|\[object ).{0,40}/;
const clean = (h, where) => {
  if (typeof h !== 'string') { say(`${where}: разметка не строка`); return ''; }
  const m = h.match(BAD); if (m) say(`${where}: в разметке undefined, NaN или [object — «${m[0].replace(/\s+/g, ' ')}»`);
  return h;
};
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const draw = where => { run(where, () => T.render()); cnt.views++; return clean(els.game ? els.game.innerHTML : '', where); };
const reset = () => { T.S = T.initialState(); T.S.overlay = null; };
const snap = () => JSON.parse(JSON.stringify({ wallet: T.S.wallet, items: T.S.bag.items, chests: T.S.bag.chests.length }));
const diff = (a, b) => { const out = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (b[k] || 0) - (a[k] || 0); if (d) out[k] = d; } return out; };
const norm = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
const eqMap = (where, got, want) => { if (norm(got) !== norm(want)) say(`${where}: получено ${norm(got)}, ждали ${norm(want)}`); };
const sum = o => Object.values(o).reduce((a, x) => a + x, 0);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* 2. initialState не заводит S.items */
reset();
if ('items' in T.S) say('initialState(): остался прежний инвентарь S.items');
if (!T.S.bag || !T.S.bag.items) say('initialState(): нет запасов S.bag');

/* 4. маршруты и сегменты: обход переключателей из разметки */
const SW = /data-a="(seg|hview|zptab|wsview)" data-v="([^"]*)"/g;
function visit(route) {
  const seen = new Set(), queue = [null];
  while (queue.length && seen.size < 300) {
    const a = queue.shift();
    T.S.route = route; T.S.overlay = null;
    if (a) run(`${route} · ${a.join(' ')}`, () => T.ACT[a[0]](a[1]));
    T.S.route = route; T.S.overlay = null;
    const h = draw(`${route}${a ? ' · ' + a.join(' ') : ''}`);
    for (const m of h.matchAll(SW)) { const k = m[1] + ' ' + m[2]; if (!seen.has(k)) { seen.add(k); queue.push([m[1], m[2]]); } }
  }
  cnt.routes++;
}
reset();
for (const route of Object.keys(T.SCREENS)) {
  if (route === 'battle') { run('бой: старт забега', () => T.startRun('s1', 'b1')); if (!T.S.runs.length) say('бой: забег не начался'); }
  visit(route);
  if (route === 'battle') T.S.runs = [];
}
/* «Мои герои»: развитие каждого героя прототипа */
reset();
T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.seg.hero = 'power';
for (const h of T.S.heroes) { T.S.selHero = h.id; const g = draw(`развитие · ${h.name}`); if (!g.includes('data-a="limit"') && h.lim < T.INV.hero.capByLim.length - 1) say(`развитие · ${h.name}: нет шага предела`); }

/* 5а. развитие героя на запасах */
reset();
{
  const h = T.S.heroes.find(x => x.lvl >= x.cap && x.lim === 0 && x.valor < x.maxV) || T.S.heroes[0], D = T.INV.hero;
  T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.seg.hero = 'power'; T.S.selHero = h.id;
  const d = T.heroDev(h);
  if (!d.rune || d.rune.tier !== 'rune' || d.rune.cyc !== h.cycle) say(`развитие: руна предела не своего цикла — ${d.rune && d.rune.id}`);
  if (!d.vr || d.vr.tier !== 'valor' || d.vr.cyc !== h.cycle || !d.vs || d.vs.tier !== 'vshard' || d.vs.cyc !== h.cycle) say('развитие: руна или осколки доблести не своего цикла');
  if (!(d.vsNeed > 0) || !d.rec) say('развитие: нет рецепта руны доблести в recipes.js');
  if (d.need !== D.runesPerLimit) say('развитие: число рун предела не из INV.hero');
  /* нехватка */
  const extra = T.BAG.qty(d.rune.id) - (d.need - 1); if (extra > 0) T.BAG.take(d.rune.id, extra);
  let g = draw('развитие · мало рун');
  if (!/data-a="limit" disabled/.test(g)) say('развитие: при нехватке рун «Пробить» доступна');
  let s0 = snap();
  run('развитие · нехватка', () => { T.ACT.limit(); T.ACT.limitdo(h.id); });
  if (!same(snap(), s0) || h.lim !== 0) say('развитие: при нехватке рун что-то списалось');
  /* пробитие предела */
  T.S.overlay = null; T.BAG.add(d.rune.id, d.need - T.BAG.qty(d.rune.id)); s0 = snap();
  g = draw('развитие · руны есть');
  if (!/data-a="limit"\s*>/.test(g)) say('развитие: руны есть, а «Пробить» недоступна');
  run('развитие · пробить', () => T.ACT.limit());
  if (!T.S.overlay || T.S.overlay.act !== 'limitdo') say('развитие: нет подтверждения предела'); else draw('развитие · подтверждение предела');
  const v = T.S.overlay ? T.S.overlay.v : h.id;
  run('развитие · пробить подтверждено', () => T.ACT.limitdo(v));
  let s1 = snap();
  eqMap('развитие · расход на предел', diff(s0.items, s1.items), { [d.rune.id]: -d.need });
  if (!same(s0.wallet, s1.wallet)) say('развитие: предел тронул кошелёк');
  if (h.lim !== 1 || h.cap !== D.capByLim[1]) say(`развитие: после предела lim ${h.lim}, потолок ${h.cap}`);
  T.BAG.add(d.rune.id, d.need * 2); s1 = snap();
  run('развитие · повтор предела', () => T.ACT.limitdo(v));
  if (!same(snap(), s1) || h.lim !== 1) say('развитие: повтор подтверждения пробил предел второй раз');
  /* доблесть: не на пятом пределе — нельзя; руна собирается из осколков в мастерской; на пятом пределе — списывается одна руна */
  h.lvl = h.cap;
  const vr0 = T.BAG.qty(d.vr.id); if (vr0) T.BAG.take(d.vr.id, vr0);
  T.BAG.add(d.vs.id, d.vsNeed);
  g = draw('развитие · осколков хватает');
  if (!g.includes(`data-a="valorcraft" data-v="${d.rec.id}"`)) say('развитие: при осколках на руну нет «Собрать руну»');
  s0 = snap();
  run('развитие · собрать руну', () => T.ACT.valorcraft(d.rec.id));
  if (T.ACT.wsmake) {
    if (!T.S.overlay || T.S.overlay.t !== 'wsmake') say('развитие: «Собрать руну» не открыла автодокрафт мастерской');
    else { draw('развитие · автодокрафт руны'); run('развитие · руна создана', () => T.ACT.wsmakedo()); }
    eqMap('развитие · руна из осколков', diff(s0.items, snap().items), { [d.vs.id]: -d.vsNeed, [d.vr.id]: 1 });
  } else T.BAG.add(d.vr.id, 1);
  T.S.overlay = null; T.S.route = 'heroes';
  g = draw('развитие · руна есть, предел не пятый');
  if (!/data-a="valor" disabled/.test(g)) say('развитие: доблесть доступна не на пятом пределе');
  const val0 = h.valor;
  s0 = snap(); run('развитие · доблесть рано', () => { T.ACT.valor(); T.ACT.valordo(h.id); });
  if (!same(snap(), s0) || h.valor !== val0) say('развитие: доблесть до пятого предела что-то списала');
  T.S.overlay = null; h.lim = D.valorAtLim; h.cap = D.capByLim[h.lim]; h.lvl = h.cap;
  run('развитие · доблесть', () => T.ACT.valor());
  if (!T.S.overlay || T.S.overlay.act !== 'valordo') say('развитие: нет подтверждения доблести'); else draw('развитие · подтверждение доблести');
  s0 = snap(); run('развитие · доблесть подтверждена', () => T.ACT.valordo(h.id));
  eqMap('развитие · расход на доблесть', diff(s0.items, snap().items), { [d.vr.id]: -1 });
  if (h.valor !== val0 + 1 || h.lvl !== 0 || h.lim !== 0 || h.cap !== D.capByLim[0]) say(`развитие: после доблести ${h.valor}/${h.lvl}/${h.lim}/${h.cap}`);
  T.BAG.add(d.vr.id, 1); s1 = snap();
  run('развитие · повтор доблести', () => T.ACT.valordo(h.id));
  if (!same(snap(), s1) || h.valor !== val0 + 1) say('развитие: повтор подтверждения дал доблесть второй раз');
  draw('развитие · после доблести');
}

/* 5б. добыча забега */
const pool = new Set(T.poolItems().map(i => i.id));
const drop = b => T.RX.drops.enemies.find(e => e.biome === b);
function checkFloor(where, biome, got, items, guardWin) {
  const D = drop(biome), max = D ? D.basicsPerTriggerMax : 1, keys = new Set(T.biomeItems('key', biome).map(i => i.id)), un = new Set(T.biomeItems('unique', biome).map(i => i.id));
  let nb = 0, nk = 0, nu = 0, nr = 0;
  for (const [id, n] of Object.entries(items)) {
    const it = T.BAG.item(id);
    if (!it) { say(`${where}: предмета ${id} нет в recipes.js`); continue; }
    if (pool.has(id)) nb += n; else if (keys.has(id)) nk += n; else if (un.has(id)) nu += n;
    else if (guardWin && ['rune', 'vshard'].includes(it.tier)) nr += n;
    else say(`${where}: лишний предмет ${id}`);
  }
  if (nb < (got.base || 0) || nb > (got.base || 0) * max) say(`${where}: базовых ${nb} при срабатываниях ${got.base}, за срабатывание 1–${max}`);
  if (nk !== (got.keys || 0)) say(`${where}: ключей ${nk}, ядро дало ${got.keys}`);
  if (nu !== (got.unique || 0)) say(`${where}: уникальных ${nu}, ядро дало ${got.unique}`);
  return nr;
}
{
  /* срабатывание, ключи с элит и уникальный решает ядро по RULES.drop — числа должны совпадать с EN_RECIPES.drops */
  const D1 = drop('b1'), RD = T.EB.RULES.drop;
  if (!D1) say('добыча: нет b1 в EN_RECIPES.drops.enemies');
  else {
    if (RD.basePerFloorBp !== D1.basePerFloorBp) say(`добыча: шанс базового в ядре ${RD.basePerFloorBp}, в drops ${D1.basePerFloorBp}`);
    if (RD.e.keys !== D1.elite.specKeys) say(`добыча: ключей с элиты в ядре ${RD.e.keys}, в drops ${D1.elite.specKeys}`);
    if (RD.b.uniqueBp !== D1.boss.uniqueBp) say(`добыча: шанс уникального в ядре ${RD.b.uniqueBp}, в drops ${D1.boss.uniqueBp}`);
  }
  /* сами броски: правила ADR-0023 и сид */
  const seed = T.EB.seedOf('проверка добычи');
  const a = T.lootItems('b1', 3, { base: 5, keys: 3, unique: 1 }, seed, false);
  checkFloor('добыча b1', 'b1', { base: 5, keys: 3, unique: 1 }, a, false);
  if (!same(a, T.lootItems('b1', 3, { base: 5, keys: 3, unique: 1 }, seed, false))) say('добыча: один сид дал разную добычу');
  const b3 = T.lootItems('b3', 7, { base: 60 }, seed, false), nb3 = sum(b3);
  checkFloor('добыча b3', 'b3', { base: 60 }, b3, false);
  if (nb3 <= 60) say('добыча b3: за 60 срабатываний ни разу не выпало больше одного базового — «от 1 до номера биома» не работает');
  const G = T.RX.drops.guardians.find(g => g.biome === 'b1' && g.kind === 'limits');
  if (!G) say('добыча: нет стража пределов b1 в drops.guardians');
  else for (let k = 0; k < 40; k++) {
    const r = T.lootItems('b1', 16, {}, seed + k, true), ids = Object.keys(r);
    if (sum(r) !== G.runesPerKill || ids.some(id => { const it = T.BAG.item(id); return !it || it.tier !== 'rune' || it.cyc !== G.cyc; })) { say(`добыча стража: ${JSON.stringify(r)}`); break; }
  }
  const V = T.RX.drops.guardians.find(g => g.biome === 'b2' && g.kind === 'valor');
  if (V) for (let k = 0; k < 40; k++) {
    const r = T.lootItems('b2', 26, {}, seed + k, true), n = sum(r), ok = [0].concat(V.shardsBp.map(x => x[0]));
    if (!ok.includes(n) || Object.keys(r).some(id => T.BAG.item(id).tier !== 'vshard')) { say(`добыча стража доблести: ${JSON.stringify(r)}`); break; }
  }
  /* забег целиком: ядро идёт до конца без показа; что решило ядро на каждом этаже — перехват floorLoot */
  for (const guard of [false, true]) {
    reset();
    const log = [], base = T.EB.floorLoot;
    T.EB.floorLoot = function (...x) { const L = base.apply(this, x); log.push({ floor: x[1], got: JSON.parse(JSON.stringify(L)) }); return L; };
    const s0 = snap(), where = guard ? 'забег стража' : 'забег';
    T.S.route = 'descent';
    run(where + ' · старт', () => T.startRun('s1', 'b1', null, guard));
    const R = T.S.runs[T.S.runs.length - 1];
    if (!R) { say(where + ': не начался'); T.EB.floorLoot = base; continue; }
    T.S.route = 'descent';
    for (let n = 0; !R.over && n < 20000; n++) run(where + ' · ход', () => T.advance(R, 60000));
    T.EB.floorLoot = base;
    if (!R.over) { say(where + ': не закончился'); continue; }
    const s1 = snap(), win = R.end && R.end.kind === 'guardWin';
    const want = {}; let runes = 0;
    for (const x of log) {
      const it = T.lootItems('b1', x.floor, x.got, R.lootSeed, guard && win);
      runes += checkFloor(`${where} · этаж ${x.floor}`, 'b1', x.got, it, guard && win);
      for (const [id, q] of Object.entries(it)) want[id] = (want[id] || 0) + q;
      cnt.floors++;
    }
    const G2 = T.RX.drops.guardians.find(g => g.biome === 'b1');
    if (guard && win && runes !== G2.runesPerKill) say(`${where}: рун за победу ${runes}, в данных ${G2.runesPerKill}`);
    if (guard && !win && runes) say(`${where}: руны без победы над стражем`);
    eqMap(`${where}: добыча в итоге`, R.loot.items, want);
    eqMap(`${where}: запасы`, diff(s0.items, s1.items), R.loot.items);
    eqMap(`${where}: кошелёк`, diff(s0.wallet, s1.wallet), Object.fromEntries(['gold', 'spirit', 'souls'].map(k => [k, R.loot[k]]).filter(([, q]) => q)));
    if (!guard && !sum(R.loot.items)) say(`${where}: забег по Мастерской форм не принёс ни одного ресурса`);
    T.S.overlay = { t: 'result', arg: R.id };
    const g = draw(where + ' · итог');
    if (!g.includes('Добыча')) say(where + ': в итоге нет добычи');
    for (const id of Object.keys(R.loot.items)) if (!g.includes(`data-v="${id}"`)) say(`${where}: в итоге не показан ${id}`);
  }
}

/* 5в. лавка */
reset();
{
  T.S.route = 'craft'; T.S.seg.craft = 'shop'; draw('лавка');
  if (T.S.shop.length !== 10) say(`лавка: товаров ${T.S.shop.length}, по §14.2 — десять`);
  for (let i = 0; i < T.S.shop.length; i++) {
    const g = T.S.shop[i], it = T.BAG.item(g[0]), where = `лавка · ${g[0]}`;
    if (!it) { say(`${where}: нет в recipes.js`); continue; }
    if (['rune', 'vshard', 'valor'].includes(it.tier)) say(`${where}: лавка продаёт руны (ADR-0014)`);
    const [c, p] = T.shopCost(g);
    if (!(p > 0)) { say(`${where}: нет цены`); continue; }
    if (c === 'gold' && p !== T.mkMin(g[0]) * g[1]) say(`${where}: цена ${p} — не минимальная рынка × количество`);
    const s0 = snap();
    run(where, () => T.ACT.buy(String(i)));
    if (!T.S.overlay || T.S.overlay.act !== 'buydo') { say(`${where}: нет подтверждения`); continue; }
    draw(where + ' · подтверждение');
    run(where, () => T.ACT.buydo(T.S.overlay.v));
    const s1 = snap();
    eqMap(`${where}: кошелёк`, diff(s0.wallet, s1.wallet), { [c]: -p });
    eqMap(`${where}: запасы`, diff(s0.items, s1.items), { [g[0]]: g[1] });
    run(where + ' · повтор', () => T.ACT.buydo(String(i)));
    if (!same(snap(), s1)) say(`${where}: повтор подтверждения купил второй раз`);
    cnt.buys++;
  }
  draw('лавка · всё куплено');
  reset(); T.S.wallet.gold = 0; T.S.wallet.enerium = 0;
  const s0 = snap(); run('лавка без денег', () => T.ACT.buydo('0'));
  if (!same(snap(), s0) || T.S.sold.length) say('лавка: без денег товар куплен');
}

/* 5г. рынок */
reset();
{
  T.S.route = 'craft'; T.S.seg.craft = 'market';
  for (const t of ['buy', 'mine']) { T.S.seg.market = t; draw('рынок · ' + t); }
  T.S.seg.market = 'buy';
  T.S.market.q = 'кость'; let g = draw('рынок · поиск');
  if ((g.match(/data-a="mkbuy"/g) || []).length !== T.S.market.lots.filter(x => T.BAG.item(x.id).n.toLowerCase().includes('кость')).length) say('рынок: поиск не отфильтровал лоты');
  T.S.market.q = '';
  for (const x of T.S.market.lots.slice()) {
    const u = T.mkUnit(x.id, x.pct), where = `рынок · купить ${x.id}`;
    if (!(u >= T.mkMin(x.id)) || !(u > 0)) say(`${where}: цена ${u} ниже минимальной ${T.mkMin(x.id)}`);
    const s0 = snap();
    run(where, () => T.ACT.mkbuy(x.uid)); draw(where + ' · подтверждение');
    run(where, () => T.ACT.mkbuydo(x.uid));
    const s1 = snap();
    eqMap(`${where}: кошелёк`, diff(s0.wallet, s1.wallet), { gold: -u * x.q });
    eqMap(`${where}: запасы`, diff(s0.items, s1.items), { [x.id]: x.q });
    run(where + ' · повтор', () => T.ACT.mkbuydo(x.uid));
    if (!same(snap(), s1)) say(`${where}: повтор купил второй раз`);
    cnt.buys++;
  }
  if (T.S.market.lots.length) say('рынок: купленные лоты не ушли');
  /* свой лот: предмет уходит из запасов, снятый возвращается */
  T.S.seg.market = 'mine';
  const P0 = T.mkPick(), id = P0.id;
  if (!id) say('рынок: в демо-запасах нечего продать');
  else {
    run('рынок · выбор', () => T.ACT.mkid('', { value: id }));
    run('рынок · количество', () => { T.ACT.mkq('1'); T.ACT.mkq('1'); });
    const pct = T.INV.market.pricePct[T.INV.market.pricePct.length - 1];
    run('рынок · цена', () => T.ACT.mkp(String(pct)));
    const P = T.mkPick(), n = P.n;
    if (n !== Math.min(3, T.BAG.qty(id)) || P.pct !== pct) say(`рынок: выбрано ${n} по ${P.pct}%`);
    draw('рынок · форма');
    run('рынок · выставить', () => T.ACT.mksell());
    if (!T.S.overlay || T.S.overlay.act !== 'mkselldo') say('рынок: нет подтверждения лота');
    else {
      draw('рынок · подтверждение лота');
      const v = T.S.overlay.v, s0 = snap(), lots0 = T.S.market.mine.length;
      run('рынок · выставлено', () => T.ACT.mkselldo(v));
      const s1 = snap(), lot = T.S.market.mine[T.S.market.mine.length - 1];
      eqMap('рынок · лот из запасов', diff(s0.items, s1.items), { [id]: -n });
      if (!same(s0.wallet, s1.wallet)) say('рынок: выставление тронуло кошелёк');
      if (T.S.market.mine.length !== lots0 + 1 || lot.id !== id || lot.q !== n || lot.pct !== pct || lot.st !== 'wait') say('рынок: лот не записан');
      run('рынок · повтор выставления', () => T.ACT.mkselldo(v));
      if (!same(snap(), s1) || T.S.market.mine.length !== lots0 + 1) say('рынок: повтор выставил второй раз');
      draw('рынок · лот выставлен');
      run('рынок · снять', () => T.ACT.mkcancel(lot.uid));
      eqMap('рынок · снятый лот', diff(s1.items, snap().items), { [id]: n });
      const s2 = snap(); run('рынок · повтор снятия', () => T.ACT.mkcancel(lot.uid));
      if (!same(snap(), s2)) say('рынок: повтор снятия вернул второй раз');
    }
  }
  const sold = T.S.market.mine.find(x => x.st === 'sold');
  if (!sold) say('рынок: в демо нет проданного лота');
  else {
    const tot = T.mkUnit(sold.id, sold.pct) * sold.q, fee = Math.floor(tot * T.RX.drops.market.commissionPct / 100), s0 = snap();
    run('рынок · выручка', () => T.ACT.mkcash(sold.uid));
    eqMap('рынок · выручка', diff(s0.wallet, snap().wallet), { gold: tot - fee });
    if (!same(s0.items, snap().items)) say('рынок: выручка тронула запасы');
    const s1 = snap(); run('рынок · повтор выручки', () => T.ACT.mkcash(sold.uid));
    if (!same(snap(), s1)) say('рынок: выручку забрали дважды');
  }
  draw('рынок · после сделок');
}

/* 5д. ритуалы и Входящие */
const Wr = () => T.RX.drops.rituals.workers;
function claimSlot(where, i, expect) {
  const s = T.S.rituals.slots[i], s0 = snap();
  run(where, () => T.ACT.rclaim(String(i)));
  const s1 = snap(), di = diff(s0.items, s1.items), dw = diff(s0.wallet, s1.wallet);
  if (T.S.rituals.slots[i].st !== 'free') say(`${where}: слот не освободился`);
  if (T.S.inbox.some(m => m.rit === s.uid)) say(`${where}: письмо о ритуале осталось во Входящих`);
  expect(di, dw, s);
  run(where + ' · повтор', () => T.ACT.rclaim(String(i)));
  if (!same(snap(), s1)) say(`${where}: повтор выдал второй раз`);
  cnt.rituals++;
}
const byTier = (di, set) => Object.entries(di).filter(([id]) => set.has(id)).reduce((a, [, q]) => a + q, 0);
reset();
{
  T.S.route = 'rituals';
  for (const tab of ['work', 'hero']) {
    T.S.seg.rituals = tab; T.S.overlay = null; draw('ритуалы · ' + tab);
    (tab === 'work' ? T.S.rituals.work : T.S.rituals.hero).forEach((x, i) => { T.S.overlay = { t: 'ritual', arg: `${tab}:${i}` }; draw(`лист ритуала ${tab}:${i}`); cnt.sheets++; });
  }
  T.S.overlay = null;
  /* готовый ритуал демо: базовые общего пула по редкости */
  const r0 = T.S.rituals.slots.findIndex(s => s.st === 'ready');
  if (r0 < 0) say('ритуалы: в демо нет готового ритуала');
  else claimSlot('ритуалы · готовый', r0, (di, dw, s) => {
    if (sum(di) !== Wr().basics[s.r - 1] + Wr().keys[s.r - 1] || byTier(di, pool) !== Wr().basics[s.r - 1]) say(`ритуалы · готовый: ресурсов ${JSON.stringify(di)}`);
    if (Object.keys(dw).length) say('ритуалы · готовый: рабочие дали валюту');
  });
  /* каждый ритуал пула: старт, срок по данным, выдача по редкости */
  for (const tab of ['work', 'hero']) {
    const list = tab === 'work' ? T.S.rituals.work : T.S.rituals.hero;
    list.forEach((x, i) => {
      const where = `ритуал ${tab} · ${x.n}`, sp = T.ritSpec(x, tab);
      T.S.rituals.slots = T.S.rituals.slots.map(s => s.st === 'free' ? s : { st: 'free' });
      run(where + ' · старт', () => T.ACT.rstart(`${tab}:${i}`));
      const k = T.S.rituals.slots.findIndex(s => s.st === 'run');
      if (k < 0) { say(where + ': не начался'); return; }
      const s = T.S.rituals.slots[k];
      const min = tab === 'hero' ? T.RX.drops.rituals.heroes.minutes[x.r - 1] : x.unique ? Wr().unique.minutes : Wr().minutes[x.r - 1];
      if (s.left !== min * 60 || sp.min !== min) say(`${where}: срок ${s.left} с, по данным ${min} мин`);
      T.S.route = 'rituals'; draw(where + ' · идёт');
      s.st = 'ready'; s.left = 0;
      claimSlot(where, k, (di, dw) => {
        if (tab === 'hero') {
          const C = T.RX.drops.rituals.heroes.byCycle.find(b => b.cyc === T.S.acc.cycle);
          eqMap(where + ': кошелёк', dw, Object.fromEntries([['gold', C.gold[x.r - 1]], ['spirit', C.spirit[x.r - 1]], ['souls', C.souls[x.r - 1]]].filter(([, q]) => q)));
          if (Object.keys(di).length) say(where + ': герои принесли ресурсы');
        } else if (x.unique) {
          eqMap(where + ': уникальный', di, { [T.biomeItems('unique', x.biome)[0].id]: Wr().unique.uniques });
        } else {
          const keys = new Set(T.biomeItems('key', x.biome).map(it => it.id));
          if (byTier(di, pool) !== Wr().basics[x.r - 1] || byTier(di, keys) !== Wr().keys[x.r - 1] || sum(di) !== Wr().basics[x.r - 1] + Wr().keys[x.r - 1]) say(`${where}: ресурсов ${JSON.stringify(di)}`);
          if (Object.keys(dw).length) say(where + ': рабочие дали валюту');
        }
      });
    });
  }
  /* нет свободного слота — ритуал не начинается */
  T.S.rituals.slots = T.S.rituals.slots.map((s, i) => ({ st: 'run', uid: 'x' + i, n: 'занят', kind: 'work', r: 1, ppl: 1, biome: 'b1', cyc: 2, left: 60 }));
  const busy = JSON.stringify(T.S.rituals.slots); run('ритуалы · слотов нет', () => T.ACT.rstart('work:0'));
  if (JSON.stringify(T.S.rituals.slots) !== busy) say('ритуалы: начался без свободного слота');
  T.S.route = 'rituals'; draw('ритуалы · все слоты заняты');
}
reset();
{
  T.S.route = 'shelter'; T.S.overlay = { t: 'inbox' }; let g = draw('Входящие'); cnt.sheets++;
  if (!g.includes('data-a="claimall"')) say('Входящие: нет «Забрать всё»');
  for (const m of T.S.inbox.slice()) {
    const where = 'Входящие · ' + m.id, rit = m.rit ? T.S.rituals.slots.find(s => s.uid === m.rit && s.st === 'ready') : null, s0 = snap();
    const has = (m.rew || []).length || (m.chests || []).length || rit;
    if (!has) continue;
    run(where, () => T.ACT.claim(m.id));
    const s1 = snap(), di = diff(s0.items, s1.items), dw = diff(s0.wallet, s1.wallet);
    if (T.S.inbox.some(x => x.id === m.id)) say(where + ': письмо осталось');
    if (rit) {
      if (T.S.rituals.slots.some(s => s.uid === rit.uid)) say(where + ': ритуал не закрылся вместе с письмом');
      if (sum(di) !== Wr().basics[rit.r - 1] + Wr().keys[rit.r - 1]) say(`${where}: награда ритуала ${JSON.stringify(di)}`);
    } else {
      const wi = {}, ww = {};
      for (const [id, q] of m.rew || []) (T.BAG.item(id) ? wi : ww)[id] = ((T.BAG.item(id) ? wi : ww)[id] || 0) + q;
      eqMap(where + ': запасы', di, wi); eqMap(where + ': кошелёк', dw, ww);
    }
    if (s1.chests - s0.chests !== (m.chests || []).length) say(`${where}: сундуков +${s1.chests - s0.chests}, в письме ${(m.chests || []).length}`);
    run(where + ' · повтор', () => T.ACT.claim(m.id));
    if (!same(snap(), s1)) say(where + ': повтор выдал второй раз');
  }
  T.S.overlay = { t: 'inbox' }; g = draw('Входящие · всё забрано');
  if (g.includes('data-a="claimall"')) say('Входящие: после выдачи осталось «Забрать всё»');
  /* письмо о ритуале, если ритуал уже забран на своём экране, не выдаёт второй раз */
  reset();
  const m1 = T.S.inbox.find(m => m.rit);
  if (m1) {
    const i = T.S.rituals.slots.findIndex(s => s.uid === m1.rit);
    run('ритуал на экране', () => T.ACT.rclaim(String(i)));
    const s0 = snap(); run('письмо о забранном ритуале', () => T.ACT.claim(m1.id));
    if (!same(snap(), s0)) say('Входящие: письмо о забранном ритуале выдало награду второй раз');
  }
  /* «Забрать всё» */
  reset(); const s0 = snap();
  run('Входящие · забрать всё', () => T.ACT.claimall());
  if (T.S.inbox.some(m => (m.rew || []).length || (m.chests || []).length || m.rit)) say('Входящие: «Забрать всё» оставило награды');
  if (same(snap(), s0)) say('Входящие: «Забрать всё» ничего не выдало');
}

/* 5е. сундук: письмо → BAG.addChest → «Запасы» открывают */
reset();
{
  const m = T.S.inbox.find(x => (x.chests || []).length);
  if (!m) say('сундук: в демо нет письма с сундуком');
  else if (!T.zpChestGroups || !T.zpOpenOne) say('сундук: экран «Запасы» не подключён');
  else {
    const src = m.chests[0].src;
    run('сундук · письмо', () => T.ACT.claim(m.id));
    const g = T.zpChestGroups().find(x => x.list.some(c => c.src === src)), c = g && g.list.find(x => x.src === src);
    if (!c) say('сундук: из письма не лёг в запасы');
    else {
      T.S.route = 'craft'; T.S.seg.craft = 'stock'; T.S.zp.tab = 'chest';
      run('сундук · выбор', () => T.ACT.zpsel(g.key)); draw('сундук · карточка');
      const s0 = snap(), shards0 = JSON.stringify(T.S.rs.shards);
      const sm = { n: 0, cur: {}, items: {}, shards: {}, dust: {}, dustQ: {}, extra: {} };
      if (!run('сундук · открыть', () => T.zpOpenOne(c, sm))) say('сундук: не открылся');
      const s1 = snap();
      const dust = sum(sm.dust), wantW = { ...sm.cur }; if (dust) wantW.dust = (wantW.dust || 0) + dust;
      eqMap('сундук · кошелёк', diff(s0.wallet, s1.wallet), Object.fromEntries(Object.entries(wantW).filter(([, q]) => q)));
      eqMap('сундук · запасы', diff(s0.items, s1.items), sm.items);
      if (s0.chests - s1.chests !== 1) say('сундук: не ушёл из запасов');
      if (run('сундук · повтор', () => T.zpOpenOne(c, sm))) say('сундук: открылся второй раз');
      if (!Object.keys(sm.shards).length && JSON.stringify(T.S.rs.shards) !== shards0) say('сундук: осколки изменились без итога');
      draw('сундук · после открытия');
    }
  }
}

/* 6. листы поверх и сценарии */
reset();
{
  T.S.route = 'craft'; T.S.seg.craft = 'shop';
  /* спойлер — имя предмета цикла VI. Не спойлер: имя, которое само встречается в названиях и загадках игрока,
     и общее имя «ярус · цикл VI» — под ним прячут любой предмет цикла VI */
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'], legit = T.RX.items.filter(i => !i.team).map(i => i.n + '\n' + i.lore).join('\n');
  const generic = it => it.n === `${(T.RX.tiers[it.tier] || { n: 'Предмет' }).n} · цикл ${ROMAN[it.cyc]}`;
  const team = T.RX.items.filter(i => i.team && !generic(i) && !legit.includes(i.n)).map(i => i.n);
  for (const flag of [false, true]) {
    T.KH.team = flag;
    for (const it of T.RX.items) {
      T.S.overlay = { t: 'item', arg: it.id };
      const g = draw(`сведения · ${it.id}${flag ? ' · для команды' : ''}`); cnt.items++;
      if (!g.includes('Сведения')) say(`сведения · ${it.id}: лист не открылся`);
      if (!flag && it.team && !generic(it) && g.includes(it.n)) say(`сведения · ${it.id}: спойлер цикла VI без флажка «для команды»`);
      if (!flag && !it.team) { const leak = team.filter(n => g.includes(n)); if (leak.length) say(`сведения · ${it.id}: спойлер — ${leak[0]}`); }
    }
  }
  T.KH.team = false;
  T.S.overlay = { t: 'item', arg: 'нет-такого' }; draw('сведения · нет предмета');
  /* действия листа: «Продать» ведёт на рынок, «На стол мастера» — в мастерскую, «Активировать» — в обработчик запасов */
  run('сведения · продать', () => T.ACT.mkfrom('resin'));
  if (T.S.route !== 'craft' || T.S.seg.craft !== 'market' || T.S.seg.market !== 'mine' || T.S.market.sel.id !== 'resin') say('сведения: «Продать» не открыло свой лот на рынке');
  draw('сведения · продать');
  if (T.ACT.toCraft) { run('сведения · на стол', () => T.ACT.toCraft('resin')); if (T.S.route !== 'craft' || T.S.seg.craft !== 'work') say('сведения: «На стол мастера» не открыло мастерскую'); }
  const act = T.RX.items.find(i => typeof T.ACTIVATE[i.tier] === 'function' && T.BAG.has(i.id));
  if (act) { T.S.overlay = { t: 'item', arg: act.id }; if (!draw('сведения · активация').includes(`data-a="itact" data-v="${act.id}"`)) say('сведения: нет «Активировать»'); run('сведения · активировать', () => T.ACT.itact(act.id)); if (!T.S.overlay || T.S.overlay.t !== 'echact') say('сведения: «Активировать» не открыло подтверждение запасов'); draw('сведения · подтверждение активации'); }
  /* Событие: планки с сундуками режима, получение — в Дарах */
  T.S.overlay = null; T.S.route = 'event'; const g = draw('Событие');
  const P = T.evPlanks();
  if (P.length !== T.S.event.ms.length || (g.match(/data-v="gifts:me"/g) || []).length < P.length) say('Событие: планки не ведут в Дары');
  if (T.S.acc.cycle >= T.LBX.modes.event.from && P.some(p => !p.pay.length)) say('Событие: у планки нет сундука из EN_LOOTBOXES.modes.event');
  T.S.overlay = { t: 'gifts', arg: 'me' }; draw('Событие → Дары');
  /* сценарии презентации */
  for (const [t, , f] of T.FLOWS) { reset(); run('сценарий ' + t, () => f()); draw('сценарий ' + t); cnt.flows++; T.S.runs = []; }
}
if ('items' in T.S) say('после всех действий появился S.items');

console.log(`Прототип целиком: маршрутов ${cnt.routes}, отрисовок ${cnt.views}, листов ${cnt.sheets}, сведений о предметах ${cnt.items}, сценариев ${cnt.flows}. Этажей с добычей ${cnt.floors}, покупок ${cnt.buys}, выдач ритуалов ${cnt.rituals}.`);
done();

function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log('Проверка пройдена: один инвентарь — S.bag через BAG; экраны, сегменты и основные действия — без исключений, undefined и NaN.');
  process.exit(0);
}
