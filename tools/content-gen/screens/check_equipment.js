/* Автопроверка снаряжения (design/ui/equipment.js, design/ui/screens/equipment.js) и вкладок «Запасов» «Талисманы» и «Снаряжение»
   (design/ui/screens/bag.js) — без браузера.
   1. Файлы: index.html подключает данные equipment.js до основного скрипта, screens/equipment.css и screens/equipment.js — после
      talismans.js (источник героя оборачивается поверх талисманов); вкладка «Снаряжение» зовёт eqRow рядом с talRow; пять характеристик и
      лист «Атрибуты» берут прибавку eqStatAdd; на карте экранов готовы inventory, equipment и equipment-item. Концы строк экрана — CRLF.
   2. Данные свежие: сборщик tools/content-gen/equipment/build.js без ошибок даёт ровно design/ui/equipment.js и таблицы документа;
      63 шаблона, число строк = ступень редкости, все числа целые. Генератор прототипа (EnEquip) и сборщика — один: те же предметы.
   3. Демо-запасы — по EQ_DEMO, каждый предмет по своему шаблону: строк столько, сколько редкость, значения — в диапазонах цикла,
      виды не повторяются. Никто на старте ничего не носит.
   4. «Сервер» EQ_SRV: надеть, заменить, снять, надеть чужой (снимается с прежнего), повтор номера ничего не меняет, отказ ничего не
      меняет; цикл I — закрыто. БМ после каждой смены = база × √(УВС′/УВС × ЭЗ′/ЭЗ) — пересчёт здесь, независимо; всё снято — БМ прежняя.
   5. Бой: без снаряжения источник героя тот же; со снаряжением — характеристики, здоровье и пассивки библиотеки; вторичное свойство
      срабатывает в бою ядра.
   6. Сундук снаряжения: открытие в запасах создаёт предметы на сиде сундука и номере записи — пересчёт здесь; цикл предмета — цикл
      сундука; повтор номера ничего не выдаёт; две свежие сессии дают одно и то же; окно открытия называет созданный предмет.
   7. Перековка §22: 10 свободных одной редкости → 1 редкостью выше, цикл — самый ранний из десяти, золото — ровно цена, итог — генератор
      на сиде операции; меньше 10, нехватка золота, вневременная — отказ без расхода. Ларец снаряжения и ларец талисманов — один предмет
      своей редкости на сиде операции, повтор ничего не выдаёт.
   8. «Запасы»: семь вкладок; «Сундуки» — только сундуки, рисованные корпуса своего вида; «Талисманы» — фильтр «подходит классу» по §26,
      «К герою» ведёт в лист талисманов героя с выбранным талисманом; «Снаряжение» — фильтр слота, карточка — одно действие.
   9. Вид: места в карточке каждого героя, окно снаряжения героя (screens/hero-dev.js) на каждом месте, «Свойства и сравнение», «Кому надеть», перековка, UI-кит,
      сценарии — без исключений, undefined и NaN; режим «Игрок» — без служебных слов (SERVICE из check_player_view.js).
   10. Задание арта tools/art-gen/jobs/equipment.json — девять слотов, не запускалось: картинок снаряжения в art/generated нет.
   Чужой незаконченный файл, на который index.html уже ссылается, пропускается с предупреждением: его проверяют свои проверки.
   Запуск: node tools/content-gen/screens/check_equipment.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [], note = [];
const cnt = { views: 0, player: 0, ops: 0, fights: 0, minted: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  for (const n of note) console.log('предупреждение: ' + n);
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Снаряжение: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; операций ${cnt.ops}, боёв ядром ${cnt.fights}, предметов создано ${cnt.minted}.`);
  console.log('Проверка пройдена: данные свежие и целые, генерация на сиде, места и БМ по §21 и §6, сундук, перековка и ларцы на сервере, вкладки запасов, игроку служебного не видно.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const i = src => scripts.findIndex(s => s.src === src), iMain = scripts.findIndex(s => !s.src && /const EB = window\.EnBattle/.test(s.code));
  if (i('equipment.js') < 0) say('index.html: не подключены данные equipment.js');
  else if (iMain >= 0 && i('equipment.js') > iMain) say('index.html: equipment.js подключён после основного скрипта');
  if (i('screens/equipment.js') < 0) say('index.html: не подключён screens/equipment.js');
  else if (i('screens/equipment.js') < i('screens/talismans.js')) say('index.html: screens/equipment.js подключён раньше talismans.js — источник героя обернётся не поверх талисманов');
  else if (i('screens/equipment.js') < i('screens/bag.js')) say('index.html: screens/equipment.js подключён раньше bag.js');
  if (!/<link rel="stylesheet" href="screens\/equipment\.css">/.test(html)) say('index.html: не подключён screens/equipment.css');
  const hd = html.match(/function heroDetail\(h\)[\s\S]*?\n\}/);
  if (!hd || !/eqRow\(h\)[\s\S]{0,120}talRow\(h\)/.test(hd[0])) say('index.html: вкладка «Снаряжение» (heroDetail) не зовёт eqRow рядом с talRow');
  if (!/const statStrip = [^\n]*eqStatAdd/.test(html)) say('index.html: пять характеристик (statStrip) без прибавки снаряжения');
  if (!/hattr\(o\) \{[\s\S]{0,400}eqStatAdd/.test(html)) say('index.html: лист «Атрибуты» без прибавки снаряжения');
  const card = n => (html.match(new RegExp(`\\{ n: '${n}'[\\s\\S]*?\\},\\r?\\n`)) || [''])[0];
  for (const id of ['equipment', 'equipment-item']) if (!new RegExp(`ready:\\s*\\[[^\\]]*'${id}'`).test(card('Герои'))) say(`карта экранов: ${id} не отмечен готовым у «Героев»`);
  if (!/ready:\s*\[[^\]]*'inventory'/.test(card('Ремесло'))) say('карта экранов: inventory не отмечен готовым у «Ремесла»');
  for (const f of ['screens/equipment.js', 'screens/equipment.css']) {
    const s = read(f), crlf = (s.match(/\r\n/g) || []).length, lf = (s.match(/\n/g) || []).length;
    if (crlf !== lf) say(`${f}: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}`);
  }
  for (const f of ['equipment.js', 'screens/equipment.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
}
if (err.length) done();

/* ================== 2. данные ================== */
const B = require('../equipment/build.js');
const built = B.build();
if (built.err.length) say('сборщик снаряжения: ' + built.err.slice(0, 5).join('; '));
{
  if (read('equipment.js') !== B.render(built.data, built.mintSrc)) say('equipment.js устарел: пересобрать — node tools/content-gen/equipment/build.js');
  if (!fs.existsSync(B.FILES.doc)) say('нет черновика docs/content/снаряжение.md');
  else { const doc = fs.readFileSync(B.FILES.doc, 'utf8'), fresh = B.withTables(doc, built.tables); if (fresh == null) say('снаряжение.md: нет меток таблиц'); else if (fresh !== doc) say('снаряжение.md: таблицы устарели — пересобрать'); }
  const D = built.data;
  if (Object.keys(D.templates).length !== 63) say(`шаблонов ${Object.keys(D.templates).length}, по §21.2 — 63`);
  if (D.rules.slots.length !== 9) say(`слотов ${D.rules.slots.length}, по §21.1 — девять`);
  for (const [k, T] of Object.entries(D.templates)) if (1 + T.chars.n + T.secs.n !== T.r) say(`${k}: строк ${1 + T.chars.n + T.secs.n}, редкость ${T.r}`);
  const walk = (x, where) => { if (typeof x === 'number' && !Number.isInteger(x)) say(`данные: не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, where + '.' + k); };
  walk(D, 'EN_EQUIPMENT');
  const main = { head: 'int', chest: 'end', hands: 'str', legs: 'agi', feet: 'spd' };
  for (const [s, k] of Object.entries(main)) if (D.slots[s].main !== k) say(`§21.1: главная строка слота ${s} — ${D.slots[s].main}, ждали ${k}`);
}
if (err.length) done();

/* ================== песочница ================== */
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
    if (s.src && !fs.existsSync(path.join(UI, s.src))) { if (!note.includes(s.src)) note.push(`index.html ссылается на ${s.src}, файла ещё нет — пропущен`); continue; }
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { if (/equipment|bag|talismans|chest-open|model/.test(s.src || '')) say(`выполнение ${s.src}: ${e.message}`); else note.push(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message} — чужой файл, проверяют свои проверки`); }
  }
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, FLOWS, KH, KIT_EXTRA, H, EB, BAG, LBX, RAR, render, initialState, setTeam, EnLoot: window.EnLoot, EnEquip: window.EnEquip, EQD: window.EN_EQUIPMENT,
    TL: window.EN_TALISMANS, CO_ART: typeof CO_ART !== 'undefined' ? CO_ART : null, EQ_SRV, EQ_DEMO, eqRow, eqStatAdd, eqMulOf, eqWornList, eqItem, eqView, eqKitHtml, heroSt: typeof heroSt === 'function' ? heroSt : null,
    zpEntries, zpView, zpChestGroups, zpOpenOne, zpSeed, zpTalCasket: typeof zpTalCasket === 'function' ? zpTalCasket : null, zpKitHtml: typeof zpKitHtml === 'function' ? zpKitHtml : null,
    tlWhy: typeof tlWhy === 'function' ? tlWhy : null, tlEq: typeof tlEq === 'function' ? tlEq : null, tlPool: typeof tlPool === 'function' ? tlPool : null, TB: typeof TB !== 'undefined' ? TB : null,
    coRun: typeof coRun === 'function' ? coRun : null,
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

const P = load(), T = P.T, D = T.EQD;
const BP = 10000, fl = (a, b) => Math.floor(a / b);
const isqrt = n => { if (n < 2) return n; let x = n, y = fl(x + 1, 2); while (y < x) { x = y; y = fl(x + fl(n, x), 2); } return x; };
const reset = () => { T.S = T.initialState(); T.S.overlay = null; };
const S = () => T.S;
const items = () => Object.values(S().eq.items);
const op = () => `eq${S().eq.seq}`;
/* предмет по своему шаблону: строк — редкость, значения — в диапазоне своего цикла, виды не повторяются */
function valid(it, where) {
  const Tp = D.templates[it.slot + '.' + it.r]; if (!Tp) { say(`${where}: нет шаблона ${it.slot}.${it.r}`); return; }
  if (it.lines.length !== it.r) say(`${where}: строк ${it.lines.length}, редкость ${it.r}`);
  const kinds = it.lines.map(x => x[0]); if (new Set(kinds).size !== kinds.length) say(`${where}: вид строки повторился`);
  if (it.lines[0][0] !== Tp.main[0]) say(`${where}: главная строка ${it.lines[0][0]}, у шаблона ${Tp.main[0]}`);
  const spec = [Tp.main].concat(Tp.chars.pool, Tp.secs.pool.map(x => [x[0], x[2], x[3]]));
  for (const [k, v] of it.lines) { const s = spec.find(x => x[0] === k); if (!s) { say(`${where}: вида ${k} нет в шаблоне`); continue; } const [lo, hi] = T.EnEquip.rangeOf(D, k, s[1], s[2], it.cyc); if (!Number.isInteger(v) || v < lo || v > hi) say(`${where}: ${k} = ${v} вне ${lo}…${hi} на цикле ${it.cyc}`); }
}
/* независимый пересчёт множителя БМ героя от снаряжения — формула §6 по карте бойца, как в сборщике */
const MAIN_I = { str: 0, int: 1, agi: 2, sta: 3 };
function mulOf(h) {
  const worn = T.eqWornList(h.id); if (!worn.length) return BP;
  const add = { st: [0, 0, 0, 0, 0], sec: {} }, mi = MAIN_I[T.EB.RULES.cls[h.cls].main];
  for (const it of worn) for (const [k, v] of it.lines) { const K = D.kinds[k]; if (K.st != null) add.st[K.st] += v; else if (K.to === 'main') add.st[mi] += v; else if (K.to === 'guard') K.st2.forEach(i => { add.st[i] += v; }); else add.sec[k] = (add.sec[k] || 0) + v; }
  /* источник без снаряжения: сам герой с талисманами — снаряжение снимается подменой мест на время расчёта */
  const keep = S().eq.worn[h.id]; S().eq.worn[h.id] = {}; const src = T.EB.heroSrc(h); S().eq.worn[h.id] = keep;
  const unit = s => T.EB.create({ mode: 'rounds', heroes: [s], foes: [], seed: 1 }).u[0][0];
  const R = T.EB.RULES, side = (u, ac, ae) => { const kl = R.K * u.lvl, cap = R.caps.defPct * 100, mit = k => Math.min(cap, fl(u.def[k] * 10000, Math.max(1, kl + u.def[k]))); const m = fl(mit('str') + mit('int'), 2), eva = Math.min(R.buffCaps.evaBp, u.eva + ae * 100); return { off: fl(u.atk[u.main] * u.as * (1000000 + u.crit * (u.critDmg + ac - 100)), 100), def: fl(fl(u.maxHp * 10000, 10000 - m) * 10000, 10000 - eva) }; };
  const a = side(unit(src), 0, 0), b = side(unit(Object.assign({}, src, { st: src.st.map((v, i) => v + add.st[i]), hpPct: (src.hpPct || 100) + (add.sec.hpPct || 0) })), add.sec.critDmg || 0, add.sec.evade || 0);
  let off = fl(b.off * BP, a.off), def = fl(b.def * BP, a.def);
  for (const [k, v] of Object.entries(add.sec)) { const bm = D.kinds[k].bm; if (Array.isArray(bm)) { const x = fl(v * 100 * bm[1], BP); if (bm[0] === 'off') off += x; else def += x; } }
  return isqrt(off * def);
}

/* ---------- 2б. генератор прототипа = генератор сборщика ---------- */
{
  const mctx = {}; mctx.window = mctx; vm.createContext(mctx); vm.runInContext(built.mintSrc, mctx);
  for (let k = 0; k < 300; k++) {
    const slot = k % 3 ? D.rules.slots[k % 9] : null, spec = { slot, r: 1 + k % 7, cyc: 2 + k % 5 }, seed = T.EnEquip.seedOf('сверка|' + k);
    if (JSON.stringify(T.EnEquip.mint(D, spec, seed)) !== JSON.stringify(mctx.EnEquip.mint(built.data, spec, seed))) { say(`генератор прототипа и сборщика разошлись на сиде ${k}`); break; }
  }
  if (T.EnLoot.seedOf('x') !== T.EnEquip.seedOf('x')) say('сид снаряжения считается не так, как у сундуков');
}

/* ---------- 3. демо-запасы ---------- */
reset();
{
  const want = T.EQ_DEMO.stock.reduce((a, x) => a + x[3], 0);
  if (items().length !== want) say(`демо-запасы: предметов ${items().length}, в EQ_DEMO ${want}`);
  for (const it of items()) { valid(it, `демо ${it.uid}`); if (it.on) say(`демо: ${it.uid} на старте надет`); }
  for (const h of S().heroes) if (T.eqWornList(h.id).length) say(`${h.name}: на старте что-то надето`);
  if (items().filter(it => it.r === 1).length < D.rules.reforge.need) say('демо: обычных меньше, чем нужно на перековку');
}

/* ---------- 4. «сервер» и БМ ---------- */
reset();
{
  const h = T.H('h1'), base = h.bm, h2 = T.H('h4');
  const bySlot = s => items().filter(it => it.slot === s && !it.on).sort((a, b) => b.r - a.r)[0];
  const check = where => { const want = fl(base * mulOf(h), BP); if (h.bm !== want) say(`БМ ${where}: ${h.bm}, ждали ${want}`); };
  const put = (hid, uid) => { cnt.ops++; return T.EQ_SRV.put(op(), hid, uid); };
  const out = (hid, slot) => { cnt.ops++; return T.EQ_SRV.out(op(), hid, slot); };
  for (const s of D.rules.slots) { const it = bySlot(s); if (!it) continue; const r = put('h1', it.uid); if (!r.ok) say(`надеть ${s}: отказ ${r.refuse}`); if (it.on !== 'h1' || S().eq.worn.h1[s] !== it.uid) say(`надеть ${s}: место не занято`); check('после ' + s); }
  if (h.bm <= base) say('БМ: снаряжение не подняло боевую мощь');
  /* повтор номера */
  const o1 = `eq${S().eq.seq - 1}`, snap = JSON.stringify(S().eq.worn), again = T.EQ_SRV.put(o1, 'h1', bySlot('main') ? bySlot('main').uid : 'x');
  if (!again.again || JSON.stringify(S().eq.worn) !== snap) say('повтор операции с тем же номером что-то изменил');
  /* замена: прежний — в запасы */
  const cur = T.eqItem(S().eq.worn.h1.chest), alt = items().find(it => it.slot === 'chest' && !it.on);
  if (cur && alt) { const r = put('h1', alt.uid); if (!r.ok || r.prev !== cur.uid || cur.on || alt.on !== 'h1') say('замена: прежний предмет не вернулся в запасы'); check('после замены'); }
  /* чужой: надеть на другого героя — снимается с прежнего */
  const moved = T.eqItem(S().eq.worn.h1.head);
  if (moved) { const r = put('h4', moved.uid); if (!r.ok || r.from !== 'h1' || S().eq.worn.h1.head || moved.on !== 'h4') say('надеть чужой: не снялся с прежнего героя'); check('после того, как шлем ушёл'); if (h2.bm <= 0) say('БМ второго героя'); }
  /* отказы ничего не меняют */
  const s0 = JSON.stringify([S().eq.worn, items().map(x => x.on)]);
  let r = put('h1', 'нет-такого'); if (r.refuse !== 'none') say(`несуществующий предмет: ${JSON.stringify(r)}`);
  r = put('h4', moved ? moved.uid : 'x'); if (moved && r.refuse !== 'same') say(`тот же предмет тому же герою: ${JSON.stringify(r)}`);
  r = put('нет-героя', items()[0].uid); if (r.refuse !== 'hero') say(`несуществующий герой: ${JSON.stringify(r)}`);
  const c0 = S().acc.cycle; S().acc.cycle = 1; r = put('h1', items().find(it => !it.on).uid); if (r.refuse !== 'lock') say(`цикл I: ждали «откроется во втором цикле», получили ${JSON.stringify(r)}`); S().acc.cycle = c0;
  if (JSON.stringify([S().eq.worn, items().map(x => x.on)]) !== s0) say('отказ что-то изменил');
  /* снять всё — БМ ровно прежняя */
  for (const s of Object.keys(S().eq.worn.h1)) { const rr = out('h1', s); if (!rr.ok) say(`снять ${s}: ${rr.refuse}`); }
  if (h.bm !== base) say(`БМ: всё снято — ${h.bm}, а было ${base}`);
  r = out('h1', 'head'); if (r.refuse !== 'none') say('снять пустое место: не отказ');
  /* прибавка характеристик — в карточку и лист «Атрибуты» */
  const it = bySlot('hands'); put('h1', it.uid);
  const add = T.eqStatAdd(h), want = [0, 0, 0, 0, 0];
  for (const [k, v] of it.lines) if (D.kinds[k].st != null) want[D.kinds[k].st] += v;
  if (JSON.stringify(add) !== JSON.stringify(want)) say(`прибавка характеристик перчаток: ${add.join(', ')}, ждали ${want.join(', ')}`);
  T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.seg.hero = 'power'; T.S.selHero = 'h1'; T.S.overlay = null;   // характеристики — тихой строкой во вкладке «Развитие»
  const g = view(P, 'карточка с перчатками');
  const st0 = T.heroSt ? T.heroSt(h)[0] : h.st[0];   // с доблестью: +INV.hero.valorPct % за ступень (index.html, valorSt)
  if (want[0] && !g.includes(`<b class="num">${st0 + want[0]}</b>`)) say('карточка героя: сила без прибавки снаряжения');
  T.S.overlay = { t: 'hattr', arg: 'h1' }; if (want[0] && !view(P, 'лист «Атрибуты»').includes(`+${want[0]}</small>`)) say('лист «Атрибуты»: нет прибавки снаряжения'); T.S.overlay = null;
}

/* ---------- 5. бой ---------- */
reset();
{
  const h = T.H('h2'), s0 = JSON.stringify(T.EB.heroSrc(h));
  const test = { slot: 'ring', r: 7, cyc: 2, lines: [['critDmg', 12], ['lifesteal', 5], ['armorPen', 10], ['hpPct', 8], ['evade', 3], ['dmgLow', 9], ['physReduce', 4]], seed: 1, uid: 'тест', on: '', src: 'проверка', n: 999 };
  S().eq.items['тест'] = test;
  const r = T.EQ_SRV.put(op(), 'h2', 'тест'); cnt.ops++; if (!r.ok) say(`бой: тестовое кольцо не надето — ${r.refuse}`);
  const src = T.EB.heroSrc(h), ids = src.kit ? src.kit.kit.map(x => x.id) : [];
  if (src.hpPct !== 108) say(`бой: здоровье +8 % не дошло до источника — ${src.hpPct}`);
  for (const k of ['critDmg', 'lifesteal', 'armorPen', 'evade', 'dmgLow', 'physReduce']) {
    const v = test.lines.find(x => x[0] === k)[1], id = `eq.${k}.${v}`, L = T.EB.lib()[id];
    if (!ids.includes(id)) say(`бой: ${k} не в наборе героя`);
    if (!L || L.pas !== D.kinds[k].core.pas || L.pct !== v) say(`бой: запись ядра ${id} — ${JSON.stringify(L)}`);
  }
  const u = T.EB.create({ mode: 'rounds', heroes: [src], foes: [], seed: 1 }).u[0][0];
  const u0 = T.EB.create({ mode: 'rounds', heroes: [JSON.parse(s0)], foes: [], seed: 1 }).u[0][0];
  if (u.critDmg !== u0.critDmg + 12) say(`бой: урон крита ${u0.critDmg} → ${u.critDmg}, ждали +12`);
  if (u.maxHp <= u0.maxHp) say('бой: здоровье карты не выросло');
  /* вампиризм срабатывает в бою ядра: отряд I, этажи обучающего биома */
  const squad = () => S().squads.find(s => s.id === 's1').m.filter(Boolean).map(id => T.EB.heroSrc(T.H(id)));
  let hs = squad(), cov = {};
  for (let f = 1; f <= 15 && !cov['eq.lifesteal.5']; f++) { const b = T.EB.run(T.EB.floorBattle(hs, 'b1', f, null, 'rounds')); cnt.fights++; for (const [k, v] of Object.entries(b.cov)) cov[k] = (cov[k] || 0) + v; if (!b.win) break; hs = T.EB.carry(hs, b); }
  if (!cov['eq.lifesteal.5'] && !cov['eq.armorPen.10']) say('бой: вторичные свойства снаряжения ни разу не сработали в бою ядра');
  T.EQ_SRV.out(op(), 'h2', 'ring'); cnt.ops++;
  if (JSON.stringify(T.EB.heroSrc(h)) !== s0) say('бой: без снаряжения источник героя не тот же');
}

/* ---------- 6. сундук снаряжения ---------- */
function openEquip(Q, where) {
  const TT = Q.T; TT.S = TT.initialState(); TT.S.overlay = null;
  TT.BAG.addChest({ box: 'equip', r: 4, cyc: 3, win: 'step', src: 'проверка', seed: TT.EnLoot.seedOf('сундук снаряжения проверки') });
  const g = TT.zpChestGroups().find(x => x.list.some(c => c.src === 'проверка')), c = g.list.find(x => x.src === 'проверка');
  const before = Object.keys(TT.S.eq.items).length;
  TT.S.route = 'craft'; TT.S.seg.craft = 'stock'; TT.S.zp.tab = 'chest';
  run(where, () => TT.ACT.zpsel(g.key));
  const o = 'zo' + TT.S.zp.op; run(where, () => TT.ACT.zpopen(g.key, { dataset: { op: o, n: '1' } }));
  const L = TT.S.zp.last, got = Object.values(TT.S.eq.items).filter(it => it.src === 'проверка');
  return { TT, c, g, L, got, before, o };
}
{
  const A = openEquip(P, 'сундук снаряжения'), TT = A.TT;
  if (!A.L || !A.L.sum.n) say('сундук снаряжения: не открылся');
  else {
    const res = TT.EnLoot.roll(TT.zpDef ? TT.zpDef(A.c) : TT.EnLoot.resolve(TT.LBX, { box: 'equip', r: 4, win: 'step', cyc: 3 }), TT.zpSeed(A.c));
    const eqs = res.items.map((it, i) => [it, i]).filter(([it]) => it.kind === 'equip');
    if (A.got.length !== eqs.length) say(`сундук: записей снаряжения ${eqs.length}, создано ${A.got.length}`);
    for (const [it, i] of eqs) {
      const want = TT.EnEquip.mint(D, { r: it.r, cyc: 3 }, TT.EnEquip.seedOf(['снаряжение', TT.zpSeed(A.c), i].join('|')));
      const have = A.got.find(x => x.seed === TT.EnEquip.seedOf(['снаряжение', TT.zpSeed(A.c), i].join('|')));
      if (!have || have.slot !== want.slot || have.r !== it.r || have.cyc !== 3 || JSON.stringify(have.lines) !== JSON.stringify(want.lines)) say(`сундук: запись ${i} — не тот предмет, что даёт генератор на сиде сундука и номере записи`);
      else { valid(have, `сундук ${have.uid}`); cnt.minted++; }
    }
    if (Object.keys(A.L.sum.eq || {}).length !== A.got.length) say('сундук: итог не называет созданные предметы');
    /* повтор номера */
    const n0 = Object.keys(TT.S.eq.items).length; run('повтор', () => TT.ACT.zpopen(A.g.key, { dataset: { op: A.o, n: '1' } }));
    if (Object.keys(TT.S.eq.items).length !== n0) say('сундук: повтор номера выдал снаряжение');
    /* окно открытия называет предмет */
    if (TT.coRun && A.got.length) { const R = run('показ', () => TT.coRun(A.L, 'game', {})); const names = R ? R.items.filter(x => x.kind === 'equip').map(x => x.name) : []; if (!names.length || names.some(nm => !A.got.some(it => nm.startsWith(D.slots[it.slot].n)))) say(`окно открытия: снаряжение не названо слотом — ${names.join(', ')}`); }
    /* две свежие сессии */
    const Q = load(), B2 = openEquip(Q, 'сундук · вторая сессия');
    if (JSON.stringify(B2.got.map(x => [x.slot, x.r, x.cyc, x.lines])) !== JSON.stringify(A.got.map(x => [x.slot, x.r, x.cyc, x.lines]))) say('сундук: две свежие сессии дали разное');
    /* карточка запасов видит новый предмет */
    TT.S.zp.tab = 'eq'; const W = TT.zpView('eq'); if (A.got.some(it => !W.all.some(e => e.uid === it.uid))) say('вкладка «Снаряжение»: предмета из сундука нет');
  }
}

/* ---------- 7. перековка и ларцы ---------- */
{
  const session = () => { reset(); const ones = items().filter(it => it.r === 1 && !it.on), g0 = S().wallet.gold, o = op(); const res = T.EQ_SRV.forge(o, 1); cnt.ops++; return { res, o, ones, g0 }; };
  const A = session();
  if (!A.res.ok) say(`перековка: отказ ${A.res.refuse}`);
  else {
    const got = T.eqItem(A.res.got), cyc = Math.min(...A.ones.slice().sort((a, b) => a.cyc - b.cyc || a.lines[0][1] - b.lines[0][1] || a.n - b.n).slice(0, 10).map(x => x.cyc));
    if (!got || got.r !== 2) say(`перековка: ждали редкий, получили ${JSON.stringify(got)}`);
    if (items().filter(it => it.r === 1 && !it.on).length !== A.ones.length - 10) say('перековка: ушло не десять обычных');
    if (S().wallet.gold !== A.g0 - D.rules.reforge.gold[0] * cyc) say('перековка: золото списано не ровно ценой');
    const want = T.EnEquip.mint(D, { r: 2, cyc }, T.EnEquip.seedOf('перековка-снаряжения|' + A.o));
    if (got && (got.slot !== want.slot || JSON.stringify(got.lines) !== JSON.stringify(want.lines) || got.cyc !== cyc)) say('перековка: итог не совпал с генератором на сиде операции');
    if (got) valid(got, 'перековка');
    const g1 = S().wallet.gold, rep = T.EQ_SRV.forge(A.o, 1); if (!rep.again || S().wallet.gold !== g1) say('перековка: повтор операции что-то изменил');
    const B2 = session(); if (B2.res.got !== A.res.got) say('перековка: две свежие сессии с одним номером дали разное');
  }
  reset(); S().wallet.gold = 0; let r = T.EQ_SRV.forge(op(), 1); if (r.refuse !== 'gold') say(`перековка без золота: ${JSON.stringify(r)}`);
  reset(); r = T.EQ_SRV.forge(op(), 3); if (r.refuse !== 'few') say(`перековка при нехватке: ${JSON.stringify(r)}`);
  reset(); r = T.EQ_SRV.forge(op(), 7); if (r.refuse !== 'top') say(`перековка вневременных: ${JSON.stringify(r)}`);
  /* надетые не перековываются */
  reset(); const ones = items().filter(it => it.r === 1);
  for (const it of ones.slice(0, ones.length - 9)) { const hh = S().heroes.find(x => !(S().eq.worn[x.id] || {})[it.slot]); T.EQ_SRV.put(op(), hh.id, it.uid); }
  if (items().filter(it => it.r === 1 && !it.on).length !== 9) say('перековка: подготовка — свободных обычных не девять');
  r = T.EQ_SRV.forge(op(), 1); if (r.refuse !== 'few') say(`перековка: в десять попали надетые — ${JSON.stringify(r)}`);
  /* ларец снаряжения */
  reset();
  for (const [id, rr] of Object.entries(D.rules.caskets)) {
    T.BAG.add(id, 1); const q0 = T.BAG.qty(id), n0 = items().length, o = op(), res = T.EQ_SRV.casket(o, id); cnt.ops++;
    const x = T.BAG.item(id);
    if (!res.ok) { say(`ларец ${id}: отказ ${res.refuse}`); continue; }
    const got = T.eqItem(res.got), want = T.EnEquip.mint(D, { r: rr, cyc: x.cyc }, T.EnEquip.seedOf('ларец-снаряжения|' + o));
    if (!got || got.r !== rr || got.cyc !== x.cyc || JSON.stringify(got.lines) !== JSON.stringify(want.lines)) say(`ларец ${id}: не тот предмет`);
    if (T.BAG.qty(id) !== q0 - 1 || items().length !== n0 + 1) say(`ларец ${id}: расход или выдача не те`);
    const again = T.EQ_SRV.casket(o, id); if (!again.again || items().length !== n0 + 1) say(`ларец ${id}: повтор номера выдал снова`);
  }
  /* ларец талисманов */
  if (T.zpTalCasket && T.TB) for (const id of ['chest_tal5', 'chest_tal6']) {
    reset(); if (!T.BAG.item(id)) continue;
    T.BAG.add(id, 1); const x = T.BAG.item(id), o = 'zc' + (S().zp.cop || 1), res = T.zpTalCasket(o, id);
    if (!res.ok) { say(`ларец талисманов ${id}: отказ ${res.refuse}`); continue; }
    const pool = T.tlPool(x.r), W = pool.reduce((a, p) => a + p[1], 0); let k = T.EnLoot.makeRng(T.EnLoot.seedOf('ларец-талисманов|' + o))(W), want = null;
    for (const [no, w] of pool) { if (k < w) { want = no; break; } k -= w; }
    if (res.got !== want || !T.TB.qty(want)) say(`ларец талисманов ${id}: итог ${res.got}, генератор на сиде операции — ${want}`);
    const again = T.zpTalCasket(o, id); if (!again.again) say(`ларец талисманов ${id}: повтор номера выдал снова`);
  }
}

/* ---------- 8. «Запасы»: вкладки, сундуки рисунком, талисманы по классу, снаряжение ---------- */
reset();
{
  T.S.route = 'craft'; T.S.seg.craft = 'stock'; T.S.overlay = null;
  const h = view(P, 'запасы');
  const tabs = [...h.matchAll(/data-a="zptab" data-v="([^"]+)"/g)].map(m => m[1]);
  if (tabs.join(',') !== 'res,rune,shard,call,chest,tal,eq') say(`вкладки запасов: ${tabs.join(', ')}`);
  if (/Артефакт/.test(playerText(h))) say('в запасах остались артефакты — они живут в «Страннике»');
  /* сундуки — только сундуки, плитка — рисованный корпус своего вида */
  const ch = T.zpEntries('chest'); if (ch.some(e => e.kind !== 'chest')) say('«Сундуки»: не только сундуки');
  T.S.zp.tab = 'chest'; const hc = view(P, 'сундуки');
  if (T.CO_ART) for (const e of ch) { const body = `chests/${e.cs.box}-body.png`; if (T.CO_ART.ready.includes(body) && !hc.includes(body)) say(`«Сундуки»: у ${e.cs.box} не рисованный корпус`); }
  if (T.CO_ART && T.CO_ART.ready.includes('chests/wander-body.png')) { T.S.overlay = { t: 'gifts', arg: 'me' }; const hg = view(P, 'Дары'); if (!/chests\/[a-z]+-body\.png/.test(hg)) say('Дары: плитки сундуков — прежний значок'); T.S.overlay = null; }
  /* призывы: руины, крафтовые боссы, Многоликий */
  for (const e of T.zpEntries('call')) if (!['act', 'call', 'echo'].includes(e.it.tier)) say(`«Призывы»: ${e.id} яруса ${e.it.tier}`);
  /* талисманы: фильтр «подходит классу» — §26 */
  const TL = T.TL, tals = T.zpEntries('tal').filter(e => e.kind === 'tal');
  if (!tals.length) say('«Талисманы»: пусто в демо');
  for (const cls of Object.keys(TL.rules.classes)) {
    T.S.zp.tab = 'tal'; T.S.zp.f.cls = cls; const W = T.zpView('tal');
    for (const e of tals) { const f = TL.fams[TL.items[e.no][0]], fit = !f.cls || e.r >= TL.rules.freeFrom || f.cls.includes(cls), shown = W.shown.some(x => x.key === e.key); if (fit !== shown) say(`«Талисманы», класс ${cls}: №${e.no} ${fit ? 'подходит, а скрыт' : 'не подходит, а показан'}`); }
    view(P, `талисманы · ${cls}`);
  }
  T.S.zp.f.cls = '';
  /* «К герою»: лист выбора, переход — лист талисманов героя с выбранным талисманом */
  const e0 = tals[0]; T.S.overlay = { t: 'zptalwho', arg: String(e0.no) }; const hw = view(P, 'к герою');
  const hid = (hw.match(/data-a="zptalgo" data-v="([^:"]+):/) || [])[1];
  if (!hid) say('«К герою»: нет героя, которому талисман подходит');
  else { run('к герою', () => T.ACT.zptalgo(`${hid}:${e0.no}`)); if (T.S.route !== 'heroes' || !T.S.overlay || T.S.overlay.t !== 'tal' || T.S.tal.pick !== e0.no || T.S.selHero !== hid) say('«К герою»: не открыт лист талисманов героя с выбранным талисманом'); else if (!/data-a="talput"/.test(view(P, 'лист талисманов после перехода'))) say('«К герою»: в листе нет «Надеть»'); }
  /* снаряжение: фильтр слота, карточка — одно главное действие */
  reset(); T.S.route = 'craft'; T.S.seg.craft = 'stock'; T.S.zp.tab = 'eq';
  for (const s of D.rules.slots) { T.S.zp.f.slot = s; const W = T.zpView('eq'); if (W.shown.some(e => e.kind === 'equip' && e.slot !== s)) say(`«Снаряжение», слот ${s}: показан чужой слот`); }
  T.S.zp.f.slot = '';
  for (const e of T.zpEntries('eq')) {
    run('выбор', () => T.ACT.zpsel(e.key)); const g = view(P, `снаряжение · ${e.key}`), card = g.slice(g.indexOf('zp-card'));
    const acts = card.slice(card.indexOf('class="acts2"'));
    if ((acts.match(/class="btn go"/g) || []).length !== 1) say(`снаряжение · ${e.key}: у карточки не одно главное действие`);
  }
}

/* ---------- 9. вид: карточка героя, листы, UI-кит, сценарии ---------- */
for (const team of [false, true]) {
  reset(); run('режим', () => T.setTeam(team));
  const tag = team ? 'Команда' : 'Игрок';
  T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.seg.hero = 'gear';
  for (const h of T.S.heroes) {
    T.S.selHero = h.id; T.S.overlay = null;
    const g = view(P, `${tag} · ${h.name} · Снаряжение`);
    if ((g.match(/class="eq-slot[ "]/g) || []).length !== 9) say(`${h.name}: в карточке не девять мест снаряжения`);
    if ((g.match(/class="tl-slot[ "]/g) || []).length !== 4) say(`${h.name}: в карточке не четыре места талисманов`);
    for (const s of D.rules.slots) { T.S.overlay = { t: 'eq', arg: `${h.id}:${s}` }; const x = view(P, `${tag} · окно · ${h.name} · ${s}`); if (!/class="gw"/.test(x) || T.S.gear.focus !== 'eq:' + s || (x.match(/data-gslot="eq:/g) || []).length !== 9) say(`${h.name} · ${s}: окно снаряжения не открылось на своём месте`); }
    /* выбор и сравнение в окне: выбранный для этого места сохраняется (pickFor), у него — «Надеть» и прибавка мощи */
    const cand = items().find(it => !it.on);
    T.S.eq.pickFor = `${h.id}:${cand.slot}`; T.S.eq.pick = cand.uid; T.S.overlay = { t: 'eq', arg: `${h.id}:${cand.slot}` };
    const x = view(P, `${tag} · выбран · ${h.name}`); if (!/data-a="eqput"/.test(x)) say(`${h.name}: у выбранного нет «Надеть»`); if (!/Боевая мощь/.test(x)) say(`${h.name}: у сравнения нет прибавки боевой мощи`);
  }
  for (const it of items().slice(0, 6)) for (const t of ['eqitem', 'eqwho']) { T.S.overlay = { t, arg: it.uid }; view(P, `${tag} · ${t} · ${it.uid}`); }
  T.S.overlay = { t: 'eqforge', arg: '' }; view(P, `${tag} · перековка`);
  T.S.overlay = { t: 'zptalforge', arg: '' }; view(P, `${tag} · перековка талисманов`);
  T.S.route = 'craft'; T.S.seg.craft = 'stock';
  for (const tab of ['tal', 'eq']) { T.S.overlay = null; T.S.zp.tab = tab; view(P, `${tag} · запасы · ${tab}`); T.S.overlay = { t: 'zpfilt', arg: '' }; view(P, `${tag} · фильтры · ${tab}`); }
  /* UI-кит */
  for (const [nm, f] of [['снаряжение', T.eqKitHtml], ['запасы', T.zpKitHtml]]) {
    const k = T.KIT_EXTRA.find(x => x.html === f); if (!k) { say(`UI-кит: раздела «${nm}» нет в KIT_EXTRA`); continue; }
    const hk = run('UI-кит', () => k.html()); cnt.views++;
    if (typeof hk !== 'string' || /undefined|NaN|\[object /.test(hk)) say(`UI-кит: раздел «${nm}» не рисуется`);
    else if (!team) scan(P, hk, `UI-кит · ${nm}`);
  }
  /* сценарии */
  for (const name of ['Снаряжение · герой', 'Снаряжение · сравнение', 'Снаряжение · перековка', 'Запасы · талисманы', 'Запасы · снаряжение']) {
    reset(); run('режим', () => T.setTeam(team));
    const F = T.FLOWS.find(x => x[0] === name); if (!F) { say(`нет сценария «${name}»`); continue; }
    run('сценарий ' + name, () => F[2]()); view(P, `${tag} · сценарий «${name}»`);
    if (name === 'Снаряжение · герой' && T.eqWornList(T.EQ_DEMO.flow.hero).length < 6) say(`сценарий «${name}»: надето ${T.eqWornList(T.EQ_DEMO.flow.hero).length}`);
  }
}
run('режим «Игрок»', () => T.setTeam(false));

/* ---------- 10. задание арта: девять слотов, не запускалось ---------- */
{
  const f = path.join(ROOT, 'tools', 'art-gen', 'jobs', 'equipment.json');
  if (!fs.existsSync(f)) say('нет задания арта tools/art-gen/jobs/equipment.json');
  else {
    let J = null; try { J = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { say('equipment.json: ' + e.message); }
    if (J) { const ids = J.jobs.map(j => j.id); if (ids.length !== 9 || D.rules.slots.some(s => !ids.includes('eq-' + s))) say(`задание арта: слоты ${ids.join(', ')}`); }
    const gen = path.join(ROOT, 'art', 'generated');
    if (fs.existsSync(path.join(gen, 'equipment-slots')) || (fs.existsSync(gen) && fs.readdirSync(gen).some(x => /^eq-/.test(x)))) note.push('art/generated: картинки снаряжения уже есть — задание запускали');
  }
}
done();
