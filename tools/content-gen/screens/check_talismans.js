/* Автопроверка духовных талисманов (design/ui/talismans.js, design/ui/screens/talismans.js) — без браузера.
   1. Файлы: index.html подключает talismans.js до основного скрипта, talismans.css и screens/talismans.js — после model.js;
      вкладка «Снаряжение» карточки героя зовёт talRow; карта экранов отмечает окно talismans готовым (поле ready карточки «Герои»).
   2. Данные свежие: сборщик tools/content-gen/talismans/build.js без ошибок даёт ровно EN_TALISMANS. Все числа целые;
      359 талисманов, у каждого — линейка, редкость и вес; номера, редкости и веса совпадают с пулом сундуков (lootboxes.js).
      Запись для ядра понятна ядру: вид пассивки и триггер реакции есть в design/ui/battle.js, поле значения — в записи.
   3. Места и правила §26: четыре места у каждого героя отряда; до древней — только свой класс, с древней — любой; одна линейка —
      одно место; спасение от смерти — одно на героя; надетый уходит из запасов, снятый и заменённый — возвращаются; повтор операции
      с тем же номером ничего не меняет; отказ ничего не меняет.
   4. БМ: после каждой смены БМ героя = база × √(УВС × ЭЗ) по долям линеек — пересчёт здесь, независимо; всё снято — БМ ровно прежняя.
      БМ не хранится: h.bm только читается, его считает общая функция BM (index.html); вырос уровень — выросла база, множитель тот же.
   5. Бой: без талисманов источник героя тот же; с талисманами — записи ядра в наборе, расовая прибавка, доля способностей;
      в бою прототипа срабатывают щит «Сердца Кароксорра», «Щит павшего знаменосца», фарм «Сосуда шёпотов» в добыче этажа.
   6. Перековка: 10 одной редкости → 1 редкостью выше, золото списано один раз, итог — генератор на сиде операции (две свежие
      сессии дают одно и то же), повтор ничего не меняет; меньше 10, нехватка золота, вневременная — отказ без расхода.
   7. Вид: ряд мест во вкладке «Снаряжение» и одно окно снаряжения героя (screens/hero-dev.js) на каждом герое и месте талисмана,
      выбранный талисман с «Надеть», сценарий презентации, раздел UI-кита — без исключений, undefined и NaN. Режим «Игрок»: служебных слов нет (SERVICE из check_player_view.js), спойлерная линейка
      не называется; режим «Команда» — пометки о ядре и БМ на месте.
   Чужой незаконченный файл, на который index.html уже ссылается, пропускается с предупреждением: его проверяют свои проверки.
   Запуск: node tools/content-gen/screens/check_talismans.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [], note = [];
const cnt = { views: 0, player: 0, ops: 0, fights: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  for (const n of note) console.log('предупреждение: ' + n);
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Талисманы: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; операций ${cnt.ops}, боёв ядром ${cnt.fights}.`);
  console.log('Проверка пройдена: данные свежие и целые, правила мест §26 держатся, БМ сходится, эффекты доходят до ядра боя, перековка решается на сиде, игроку служебного не видно.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const i = src => scripts.findIndex(s => s.src === src), iMain = scripts.findIndex(s => !s.src && /const EB = window\.EnBattle/.test(s.code));
  if (i('talismans.js') < 0) say('index.html: не подключены данные talismans.js');
  else if (iMain >= 0 && i('talismans.js') > iMain) say('index.html: talismans.js подключён после основного скрипта');
  if (i('screens/talismans.js') < 0) say('index.html: не подключён screens/talismans.js');
  else if (i('screens/talismans.js') < i('screens/model.js')) say('index.html: screens/talismans.js подключён раньше model.js');
  if (!/<link rel="stylesheet" href="screens\/talismans\.css">/.test(html)) say('index.html: не подключён screens/talismans.css');
  const hd = html.match(/function heroDetail\(h\)[\s\S]*?\n\}/);
  if (!hd || !/talRow\(h\)/.test(hd[0])) say('index.html: вкладка «Сила» (heroDetail) не зовёт talRow');
  const heroes = html.match(/\{ n: 'Герои'[\s\S]*?\},\r?\n/);
  if (!heroes || !/ready:\s*\[[^\]]*'talismans'/.test(heroes[0])) say('index.html: на карте экранов окно talismans не отмечено готовым (ready карточки «Герои»)');
  for (const f of ['talismans.js', 'screens/talismans.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
}
if (err.length) done();

/* ================== 2. данные ================== */
const B = require('../talismans/build.js');
const built = B.build();
if (built.err.length) say('сборщик талисманов: ' + built.err.slice(0, 5).join('; '));
{
  const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('talismans.js'), ctx);
  const D = ctx.EN_TALISMANS;
  if (!D) say('talismans.js: нет window.EN_TALISMANS');
  else if (JSON.stringify(D) !== JSON.stringify(built.data)) say('talismans.js устарел: пересобрать — node tools/content-gen/talismans/build.js');
  const docPath = B.FILES.doc;
  if (!fs.existsSync(docPath)) say('нет черновика docs/content/талисманы.md');
  else { const doc = fs.readFileSync(docPath, 'utf8'); const fresh = B.withTables(doc, built.tables); if (fresh == null) say('талисманы.md: нет меток таблиц'); else if (fresh !== doc) say('талисманы.md: таблицы устарели — пересобрать'); }
}
if (err.length) done();

/* ================== песочница ==================
   Скрипты прототипа — по порядку, как в браузере, с заглушкой DOM; boot() не запускается; localStorage недоступен */
function load() {
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, prepend() {}, remove() {},
      animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
    e.querySelector = () => stubEl();
    return e;
  };
  const rootCls = new Set(), root = stubEl('html');
  root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
  const els = {};
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    if (s.src && !fs.existsSync(path.join(UI, s.src))) { if (!/talismans/.test(s.src)) { if (!note.includes(s.src)) note.push(`index.html ссылается на ${s.src}, файла ещё нет — пропущен`); continue; } }
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, FLOWS, KH, MAP, KIT_EXTRA, H, EB, render, initialState, setTeam, EnLoot: window.EnLoot, TL: window.EN_TALISMANS,
    E: window.EN_ECHO || null, rsSetWeek: typeof rsSetWeek === 'function' ? rsSetWeek : null,
    TB, TL_SRV, TL_DEMO, tlEq, tlMul, tlSides, tlWhy, tlSrc, tlLibOf, tlPool, tlForgePick, talRow, tlKitHtml, BM: typeof BM !== 'undefined' ? BM : null,
  })`, ctx);
  return { T, els, rootCls, game: () => (els.game ? els.game.innerHTML : '') };
}
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
function scan(P, h, where) {
  cnt.views++;
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!P.T.KH.team) {
    cnt.player++;
    const v = strip(h), txt = playerText(h).split('\n').concat(tips(v));
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
  }
  return h;
}
const view = (P, where) => { run(where, () => P.T.render()); return scan(P, P.game(), where); };

const P = load(), T = P.T, TL = T.TL;
const BP = 10000, fl = (a, b) => Math.floor(a / b);
const isqrt = n => { if (n < 2) return n; let x = n, y = fl(x + 1, 2); while (y < x) { x = y; y = fl(x + fl(n, x), 2); } return x; };
const reset = () => { T.S = T.initialState(); T.S.overlay = null; };

/* ---------- 2. числа целые, пул совпадает с сундуками, запись ядра понятна ядру ---------- */
{
  const walk = (x, where) => { if (typeof x === 'number' && !Number.isInteger(x)) say(`данные: не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, where + '.' + k); };
  walk(TL, 'EN_TALISMANS');
  const n = Object.keys(TL.items).length; if (n !== 359) say(`данные: талисманов ${n}, в таблице автора — 359`);
  for (const [no, [id, r]] of Object.entries(TL.items)) {
    const f = TL.fams[id]; if (!f) { say(`№${no}: нет линейки ${id}`); continue; }
    if (f.no[r - 1] !== +no || !(f.w[r - 1] > 0)) say(`№${no}: линейка ${id} не знает его редкость ${r} или вес`);
    if ((f.v[r - 1] == null) !== !/\{v\}/.test(f.fx) && f.v[r - 1] == null) say(`№${no}: в эффекте {v}, а значения нет`);
  }
  const LB = vm.runInContext('window.EN_LOOTBOXES', vm.createContext((() => { const c = { console }; c.window = c; vm.runInContext(read('lootboxes.js'), vm.createContext(c)); return c; })()));
  for (const [r, list] of Object.entries(LB.pools.tal)) for (const [no, w, team] of list) {
    const it = TL.items[no]; if (!it || it[1] !== +r || TL.fams[it[0]].w[+r - 1] !== w) { say(`сундуки: №${no} (редкость ${r}, вес ${w}) не совпадает с талисманами`); continue; }
    if (!!team !== !!TL.fams[it[0]].team) say(`сундуки: №${no} в пуле ${team ? 'только с цикла VI' : 'всегда'}, а у талисманов — ${TL.fams[it[0]].team ? 'с цикла VI' : 'всегда'}: пересобрать lootboxes/build.js`);
  }
  /* имя, вид и пометка «для команды» в сундуках — те же, что у талисманов: сборщик лутбоксов берёт их из talismans.js */
  for (const [no, t] of Object.entries(LB.talInfo)) {
    const it = TL.items[no], f = it && TL.fams[it[0]]; if (!f) { say(`сундуки: талисмана №${no} нет у талисманов`); continue; }
    if (t[0] !== f.n || t[1] !== TL.rules.cats[f.cat] || !!t[2] !== !!f.team) say(`сундуки: №${no} — «${t[0]} · ${t[1]}»${t[2] ? ', для команды' : ''}; у талисманов — «${f.n} · ${TL.rules.cats[f.cat]}»${f.team ? ', для команды' : ''}: пересобрать lootboxes/build.js`);
  }
  const core = read('battle.js');
  const pas = new Set([...core.matchAll(/(?:pasOf|libPas)\(\w+, '(\w+)'\)|p\.pas === '(\w+)'/g)].map(m => m[1] || m[2]));
  const trig = new Set([...core.matchAll(/reacts\(\w+, '(\w+)'\)/g)].map(m => m[1]));
  const farm = ['gold', 'spirit', 'souls', 'uniqueAdd', 'baseResMul', 'keyCh', 'doubleCh', 'resCapAdd'];
  for (const [id, f] of Object.entries(TL.fams)) {
    const L = f.lib; if (!L) { if (!TL.rules.needs[f.need]) say(`${id}: примитив «${f.need}» не описан`); continue; }
    if (L.src) { if (!['avers', 'actPct'].includes(L.src)) say(`${id}: источник ${L.src} ядру неизвестен`); continue; }
    if (L.k === 'passive' && !pas.has(L.data.pas)) say(`${id}: вида пассивки «${L.data.pas}» в ядре нет`);
    if (L.k === 'reaction' && !trig.has(L.trig)) say(`${id}: триггера реакции «${L.trig}» в ядре нет`);
    if (L.k === 'farm' && !farm.includes(String(L.vKey).split('.')[0])) say(`${id}: поля фарма «${L.vKey}» ядро не складывает`);
    for (const no of f.no) if (no) { const e = T.tlLibOf(no); if (!e || !T.EB.lib()['tal.' + no]) say(`№${no}: запись ядра не зарегистрирована`); }
  }
}

/* ---------- 3. места и правила §26 ---------- */
reset();
const S = () => T.S, hero = id => T.H(id);
const byFam = (id, r) => TL.fams[id].no[r - 1];
const put = (hid, slot, no) => { cnt.ops++; return T.TL_SRV.put(`tl${S().tal.seq}`, hid, slot, no); };
const out = (hid, slot) => { cnt.ops++; return T.TL_SRV.out(`tl${S().tal.seq}`, hid, slot); };
{
  for (const h of S().heroes) { const eq = T.tlEq(h.id); if (eq.length !== 4 || eq.some(Boolean)) say(`${h.name}: на старте не четыре пустых места`); }
  for (const [no, n] of T.TL_DEMO.stock) { if (T.TB.qty(no) < n) say(`демо-запасы: №${no} — ${T.TB.qty(no)} из ${n}`); if (TL.fams[TL.items[no][0]].team) say(`демо-запасы: №${no} — спойлерная линейка`); if (!S().zp.seen['x:tal:' + no + ':' + TL.items[no][1]]) say(`демо-запасы: №${no} помечен новым`); }
  const tank = hero('h1'), heal = hero('h4'), agi = hero('h2'), mage = hero('h3');
  const tears1 = byFam('tears', 1), tears5 = byFam('tears', 5), heart2 = byFam('heart', 2), dance1 = byFam('dance', 1), eye3 = byFam('eye', 3);
  const q0 = T.TB.qty(tears1);
  let r = put('h1', 0, tears1); if (r.refuse !== 'cls') say(`обычные «Слёзы Виала» на танка: ждали отказ по классу, получили ${JSON.stringify(r)}`);
  if (T.TB.qty(tears1) !== q0 || T.tlEq('h1')[0]) say('отказ по классу что-то изменил');
  r = put('h4', 0, tears1); if (!r.ok) say(`обычные «Слёзы Виала» на лекаря: отказ ${r.refuse}`);
  if (T.TB.qty(tears1) !== q0 - 1 || T.tlEq('h4')[0] !== tears1) say('надетый талисман не ушёл из запасов');
  const op = `tl${S().tal.seq - 1}`, again = T.TL_SRV.put(op, 'h4', 1, tears5); if (!again.again || T.tlEq('h4')[1]) say('повтор операции с тем же номером что-то изменил');
  r = put('h4', 1, tears5); if (r.refuse !== 'fam') say(`вторые «Слёзы Виала» на того же героя: ждали отказ «одна линейка», получили ${JSON.stringify(r)}`);
  r = put('h1', 1, tears5); if (!r.ok) say(`древние «Слёзы Виала» на танка — с древней привязки нет, а отказ ${r.refuse}`);
  r = put('h2', 0, dance1); if (!r.ok) say(`«Пляска клинка» на физ ДД ловкости: отказ ${r.refuse}`);
  T.TB.add(dance1); r = put('h3', 0, dance1); if (r.refuse !== 'cls') say(`«Пляска клинка» на мага: ждали отказ, получили ${JSON.stringify(r)}`);
  r = put('h3', 0, eye3); if (!r.ok) say(`«Око Рэдмунда» на маг ДД: отказ ${r.refuse}`);
  T.TB.add(eye3); r = put('h2', 1, eye3); if (r.refuse !== 'cls') say(`«Око Рэдмунда» уникальное на физ ДД: ждали отказ, получили ${JSON.stringify(r)}`);
  /* замена возвращает прежний в запасы */
  const h0 = T.TB.qty(heart2);
  r = put('h1', 1, heart2); if (!r.ok || r.prev !== tears5 || T.TB.qty(tears5) !== 1 || T.TB.qty(heart2) !== h0 - 1) say('замена: прежний талисман не вернулся в запасы');
  r = out('h1', 1); if (!r.ok || T.TB.qty(heart2) !== h0 || T.tlEq('h1')[1]) say('снятый талисман не вернулся в запасы');
  /* спасение — одно на героя */
  const ember = byFam('ember', 6), archon = byFam('archon', 7); T.TB.add(archon);
  r = put('h1', 2, ember); if (!r.ok) say(`«Уголёк этерния»: отказ ${r.refuse}`);
  r = put('h1', 3, archon); if (r.refuse !== 'grp') say(`второе спасение на того же героя: ждали отказ «одно на героя», получили ${JSON.stringify(r)}`);
  r = put('h1', 2, archon); if (!r.ok) say(`спасение в то же место — замена, а отказ ${r.refuse}`);
  r = put('h1', 0, 999999); if (!r.refuse) say('несуществующий талисман надет');
  /* талисманы открываются во втором цикле */
  const c0 = S().acc.cycle; S().acc.cycle = 1; r = put('h5', 0, byFam('frost', 1)); if (r.refuse !== 'lock') say(`цикл I: ждали отказ «с кланами», получили ${JSON.stringify(r)}`); S().acc.cycle = c0;
}

/* ---------- 4. БМ ---------- */
{
  reset();
  const h = hero('h1'), base = h.bm, cls = [byFam('heart', 2), byFam('banner', 2), byFam('frost', 1), byFam('vessel', 1)];
  const want = () => {
    let off = 0, def = 0;
    for (const no of T.tlEq('h1').filter(Boolean)) { const f = TL.fams[TL.items[no][0]], v = f.v[TL.items[no][1] - 1] || 0; if (!f.bm) continue;
      for (const b of Array.isArray(f.bm[0]) ? f.bm : [f.bm]) { const a = b[1] === 'fix' ? b[2] : fl(v * 100 * b[1], BP); if (b[0] === 'off') off += a; else def += a; } }
    return fl(base * isqrt((BP + off) * (BP + def)), BP);
  };
  cls.forEach((no, i) => { const r = put('h1', i, no); if (!r.ok) say(`БМ: не надет №${no} — ${r.refuse}`); if (h.bm !== want()) say(`БМ после №${no}: ${h.bm}, ждали ${want()}`); });
  if (h.bm <= base) say('БМ: боевые талисманы не подняли БМ');
  [3, 2, 1, 0].forEach(i => out('h1', i));
  if (h.bm !== base) say(`БМ: всё снято — ${h.bm}, а было ${base}`);
  /* мощь не хранится — её считает общая функция BM (index.html): h.bm только читается. Уровень вырос, пока талисман надет: база — формула
     на новом уровне, множитель талисманов тот же; снятие отдаёт ровно новую базу */
  const d = Object.getOwnPropertyDescriptor(h, 'bm');
  if (!d || !d.get || d.set || 'value' in d) say('БМ: h.bm — не свойство только для чтения, а число в состоянии');
  if (!T.BM) say('БМ: нет общей функции BM');
  else {
    put('h1', 0, byFam('heart', 2)); const mul = T.tlMul('h1'), b0 = T.BM.parts(h).base; h.lvl += 5;
    const P = T.BM.parts(h);
    if (P.base <= b0) say(`БМ: уровень вырос, а база не выросла — ${b0} → ${P.base}`);
    if (P.mul.tal !== mul || h.bm !== fl(P.base * mul, BP)) say(`БМ: после роста уровня — ${h.bm}, ждали ${fl(P.base * mul, BP)} (база ${P.base} × ${mul})`);
    out('h1', 0);
    if (h.bm !== P.base) say(`БМ: после роста уровня и снятия — ${h.bm}, ждали базу ${P.base}`);
  }
}

/* ---------- 5. бой ---------- */
{
  reset();
  const h = hero('h1'), s0 = T.EB.heroSrc(h), s0j = JSON.stringify(s0);
  if (!s0 || JSON.stringify(T.tlSrc(s0, h)) !== s0j) say('бой: без талисманов источник героя меняется');
  const heart = byFam('heart', 2), banner = byFam('banner', 2), vessel = byFam('vessel', 1), bane = byFam('bane_beast', 2);
  [heart, banner, vessel, bane].forEach((no, i) => { const r = put('h1', i, no); if (!r.ok) say(`бой: не надет №${no} — ${r.refuse}`); });
  const src = T.EB.heroSrc(h), ids = src.kit ? src.kit.kit.map(x => x.id) : [];
  for (const no of [heart, banner, vessel]) if (!ids.includes('tal.' + no)) say(`бой: №${no} не в наборе героя`);
  if (!src.avers || src.avers.race !== 'Звери' || src.avers.bp !== TL.fams.bane_beast.v[1] * 100) say(`бой: «Бич Зверей» не дал расовую прибавку — ${JSON.stringify(src.avers)}`);
  const L = T.EB.lib(), eh = L['tal.' + heart];
  if (!eh || eh.kind !== 'reaction' || eh.trig !== 'hit' || eh.shieldPct !== 3 || eh.ch !== TL.fams.heart.v[1] * 100) say(`бой: запись «Сердца Кароксорра» — ${JSON.stringify(eh)}`);
  /* забег: отряд I, этажи обучающего биома — пока танк не получит щит от «Сердца» и «Знаменосец» не смягчит первый удар */
  const squad = () => S().squads.find(s => s.id === 's1').m.filter(Boolean).map(id => T.EB.heroSrc(hero(id)));
  let hs = squad(), cov = {}, farm = null;
  for (let fl1 = 1; fl1 <= 15; fl1++) {
    const b = T.EB.run(T.EB.floorBattle(hs, 'b1', fl1, null, 'rounds')); cnt.fights++;
    for (const [k, v] of Object.entries(b.cov)) cov[k] = (cov[k] || 0) + v;
    if (b.win && !farm) { const Lt = T.EB.floorLoot('b1', fl1, b); farm = Lt.farm; }
    if (!b.win) break;
    hs = T.EB.carry(hs, b);
    if (cov['tal.' + heart] && cov['tal.' + banner]) break;
  }
  if (!cov['tal.' + banner]) say('бой: «Щит павшего знаменосца» не сработал ни разу');
  /* щит «Сердца»: в обучении по танку попадают редко — вневременное «Сердце», 10 %, на этажах образца цикла II, пока не сработает */
  if (!cov['tal.' + heart]) {
    const top = byFam('heart', 7); T.TB.add(top); out('h1', 0); const r7 = put('h1', 0, top); if (!r7.ok) say(`бой: вневременное «Сердце» не надето — ${r7.refuse}`);
    const hs2 = squad(), B2 = T.EB.BIOMES.c2, n = B2 ? B2.floors.length : 0;
    for (let f = 1; f <= n && !cov['tal.' + top]; f++) { const b = T.EB.run(T.EB.floorBattle(hs2, 'c2', f, null, 'rounds')); cnt.fights++; if (b.cov['tal.' + top]) cov['tal.' + top] = b.cov['tal.' + top]; }
    if (!cov['tal.' + top]) say('бой: «Сердце Кароксорра» не дало щита ни в одном бою');
  }
  if (!farm || farm.spiritPct !== TL.fams.vessel.v[0]) say(`бой: «Сосуд шёпотов» не прибавил духа в добыче этажа — ${farm && farm.spiritPct}`);
  /* доля способностей: «Беглое слово» */
  reset();
  const fw = byFam('firstword', 6); T.TB.add(fw);
  const k0 = T.EB.heroSrc(hero('h2')).kit.actPct, r = put('h2', 0, fw), k1 = T.EB.heroSrc(hero('h2')).kit.actPct;
  if (!r.ok || k1 !== fl(k0 * (100 + TL.fams.firstword.v[5]), 100)) say(`бой: «Беглое слово» — доля способностей ${k0} → ${k1}`);
  /* Эхо: «Бич» расы недели доходит до боя Эхо (screens/echo.js, heroesOf) у героя без своей неприязни; своя неприязнь героя Эхо — важнее */
  if (!T.E || !T.rsSetWeek) say('Эхо: нет window.EN_ECHO или rsSetWeek — бой Эхо не проверить');
  else {
    const race = 'Звери', E = T.E, bane = byFam('bane_beast', 2), bp = TL.fams.bane_beast.v[1] * 100;
    reset(); run('Эхо: неделя', () => { T.rsSetWeek(race); T.S.acc.cycle = 2; T.S.route = 'echo'; E.sync(); });
    const ids = S().squads.find(s => s.id === S().echoSquad).m.filter(Boolean);
    const fight = st => run(`Эхо: бой ступени ${st}`, () => E.fight(E.target('step', st), ids, 1));
    const avOf = F => (F && F.heroes.find(h => h.key === 'h1') || {}).avers || null;
    if (avOf(fight(1))) say('Эхо: у героя без «Бича» и без своей неприязни в бою есть расовая прибавка');
    const rb = put('h1', 0, bane); if (!rb.ok) say(`Эхо: «Бич Зверей» не надет — ${rb.refuse}`);
    let hits = 0;
    for (let st = 1; st <= 5 && !hits; st++) {
      const F = fight(st), a = avOf(F); if (!F) break;
      if (!a || a.race !== race || a.bp !== bp) { say(`Эхо: «Бич Зверей» не дошёл до боя ступени ${st} — ${JSON.stringify(a)}`); break; }
      if ([F.o.main].concat(F.o.guards).some(u => u.race !== race)) { say(`Эхо: враги ступени ${st} не расы недели`); break; }
      const b = T.EB.echoBattle(F.heroes, F.o); cnt.fights++;
      while (!b.over) { const rec = T.EB.step(b); for (const e of (rec && rec.ev) || []) if (e.k === 'hit' && e.av && e.s && e.s.key === 'h1') hits++; }
    }
    if (!hits) say('Эхо: удары героя с «Бичом Зверей» по зверям не получили расовую прибавку');
    T.H('h1').avers = { race: 'Люди', bp: 2000 };
    const own = avOf(fight(1)); if (!own || own.race !== 'Люди') say(`Эхо: своя неприязнь героя уступила «Бичу» — ${JSON.stringify(own)}`);
    delete T.H('h1').avers;
  }
}

/* ---------- 6. перековка ---------- */
{
  const session = () => {
    reset();
    const commons = T.TB.list().filter(x => TL.items[x.no][1] === 1).reduce((a, x) => a + x.q, 0), gold0 = S().wallet.gold;
    const op = `tl${S().tal.seq}`, res = T.TL_SRV.forge(op, 1); cnt.ops++;
    return { res, op, commons, gold0 };
  };
  const A = session();
  if (A.commons < 10) say(`перековка: в демо-запасах обычных ${A.commons} — меньше 10`);
  else {
    const R = A.res, after = T.TB.list().filter(x => TL.items[x.no][1] === 1).reduce((a, x) => a + x.q, 0);
    if (!R.ok || TL.items[R.got][1] !== 2) say(`перековка: ждали редкий, получили ${JSON.stringify(R)}`);
    if (after !== A.commons - 10) say(`перековка: обычных было ${A.commons}, стало ${after}`);
    if (S().wallet.gold !== A.gold0 - TL.rules.reforge.gold[0]) say('перековка: золото списано не ровно ценой');
    const pool = T.tlPool(2), W = pool.reduce((a, x) => a + x[1], 0); let k = T.EnLoot.makeRng(T.EnLoot.seedOf('перековка|' + A.op))(W), got = null;
    for (const [no, w] of pool) { if (k < w) { got = no; break; } k -= w; }
    if (got !== R.got) say(`перековка: итог ${R.got} не совпал с генератором на сиде операции — ${got}`);
    const g1 = S().wallet.gold, rep = T.TL_SRV.forge(A.op, 1); if (!rep.again || S().wallet.gold !== g1) say('перековка: повтор операции что-то изменил');
    const B2 = session(); if (B2.res.got !== R.got) say('перековка: две свежие сессии с одним номером операции дали разное');
    reset(); S().wallet.gold = 0; const gRes = T.TL_SRV.forge(`tl${S().tal.seq}`, 1); if (gRes.refuse !== 'gold') say(`перековка без золота: ${JSON.stringify(gRes)}`);
    reset(); const rRes = T.TL_SRV.forge(`tl${S().tal.seq}`, 3); if (rRes.refuse !== 'few') say(`перековка при нехватке: ${JSON.stringify(rRes)}`);
    reset(); const tRes = T.TL_SRV.forge(`tl${S().tal.seq}`, 7); if (tRes.refuse !== 'top') say(`перековка вневременных: ${JSON.stringify(tRes)}`);
  }
}

/* ---------- 7. вид ---------- */
{
  for (const team of [false, true]) {
    reset(); run('режим', () => T.setTeam(team));
    T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.seg.hero = 'gear';
    for (const h of T.S.heroes) {
      T.S.selHero = h.id; T.S.overlay = null;
      const g = view(P, `${team ? 'Команда' : 'Игрок'} · ${h.name} · Снаряжение`);
      if ((g.match(/class="tl-slot[ "]/g) || []).length !== 4) say(`${h.name}: в карточке не четыре места`);
      /* место открывает одно окно снаряжения героя (screens/hero-dev.js) на этом месте: четыре места талисманов слева, запасы справа */
      for (let i = 0; i < 4; i++) {
        T.S.overlay = { t: 'tal', arg: `${h.id}:${i}` };
        const s = view(P, `${team ? 'Команда' : 'Игрок'} · окно · ${h.name} · место ${i + 1}`);
        if (!/class="gw"/.test(s) || (s.match(/data-gslot="tal:/g) || []).length !== 4 || T.S.gear.focus !== `tal:${i}` || T.S.gear.tab !== 'tal') say(`${h.name}: окно снаряжения не открылось на месте талисмана ${i + 1}`);
      }
      /* выбранный талисман: карточка и кнопка */
      T.S.overlay = { t: 'tal', arg: `${h.id}:0` }; view(P, 'выбор');
      const first = T.TB.list()[0]; if (first) { run('выбор', () => T.ACT.talpick(String(first.no))); const s = view(P, `${h.name} · выбран №${first.no}`); if (!/data-a="talput"/.test(s)) say(`${h.name}: у выбранного нет кнопки «Надеть»`); if (team && !/team-only/.test(s)) say('Команда: в карточке талисмана нет служебного'); }
    }
    /* спойлерная линейка: игроку не называется */
    const fb = byFam('bane_firstborn', 3); T.TB.add(fb); T.S.overlay = { t: 'tal', arg: 'h1:0' };
    const s = view(P, 'спойлер в запасах'); const name = TL.fams.bane_firstborn.n;
    if (!team && playerText(s).includes(name)) say(`игроку видно имя спойлерной линейки «${name}»`);
    if (team && !s.includes(name)) say(`команде не видно имя спойлерной линейки «${name}»`);
    /* сценарий презентации */
    reset(); const F = T.FLOWS.find(x => x[0] === 'Духовные талисманы'); if (!F) say('нет сценария «Духовные талисманы»');
    else { run('сценарий', () => F[2]()); const e = T.tlEq(T.TL_DEMO.flow.hero); if (e.filter(Boolean).length !== 4) say(`сценарий: надето ${e.filter(Boolean).length} из 4`); view(P, 'сценарий «Духовные талисманы»'); }
    /* раздел UI-кита */
    const k = T.KIT_EXTRA.find(x => x.html === T.tlKitHtml); if (!k) say('UI-кит: раздела талисманов нет в KIT_EXTRA');
    else { const h = run('UI-кит', () => k.html()); cnt.views++; if (typeof h !== 'string' || !/Духовные талисманы/.test(h) || /undefined|NaN|\[object /.test(h)) say('UI-кит: раздел талисманов не рисуется'); if (!team && h && h.includes(TL.fams.bane_firstborn.n)) say('UI-кит: без режима «Команда» видно имя спойлерной линейки'); }
  }
  run('режим «Игрок»', () => T.setTeam(false));
}
done();
