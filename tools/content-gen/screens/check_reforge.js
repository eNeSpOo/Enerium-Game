/* Автопроверка окна «Ремесло → Перековка» (design/ui/screens/reforge.js и reforge.css) — без браузера.
   1. index.html подключает reforge.css и reforge.js — после экранов талисманов, снаряжения и ритуалов; концы строк своих файлов — CRLF;
      reforge.js компилируется; все классы rf-* описаны в reforge.css; ключевые кадры двигают только transform и opacity,
      «меньше движения» анимацию выключает.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Вкладка «Перековка» в шапке «Ремесла» — после Лавки и Рынка, на всех сегментах. Три режима × шесть ступеней рисуются без
      исключений, undefined, NaN и [object, без второго style или class в теге; в режиме «Игрок» — ни одного служебного слова;
      закрытые режимы объясняют условие. Карта экранов: reforge готов, описание называет окно.
   4. «Сервер»: перековка каждого режима — операция с номером: расход ровно по правилу, итог на ступень выше, повтор номера ничего
      не меняет; талисман — генератор на сиде операции по весам пула, снаряжение — EnEquip.mint на сиде операции, цикл — самый
      ранний из десяти; рабочие — три одной редкости в одного выше, занятые в ритуале не берутся. Цена — золото по циклу: талисманы и
      рабочие — база × множитель цикла аккаунта, снаряжение — × цикл итога; в цикле II цена талисманов — ровно данные. Отказы:
      не хватает, нет золота, вневременные, закрыто. Прежние входы TL_SRV.forge и EQ_SRV.forge ведут в тот же «сервер».
   5. Перековка ушла из листов героя: у листа талисманов нет вкладки «Перековка», листов eqforge и zptalforge нет; из «Запасов»
      и из листа «Артель» — переходы в окно.
   6. Показ итога: итог выдан до анимации, моменты — целые мс, нажатие — сразу итог, «меньше движения» — без анимации.
   7. Раздел UI-кита в KIT_EXTRA и сценарии презентации рисуются.
   Запуск: node tools/content-gen/screens/check_reforge.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { strip, playerText, SERVICE } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html'), JS = read('screens/reforge.js'), CSS = read('screens/reforge.css');
const err = [], warn = [], cnt = { views: 0, player: 0, ops: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
const done = () => {
  if (warn.length) console.log('Предупреждения:\n' + warn.join('\n'));
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Перековка: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; операций ${cnt.ops}. Шапка «Ремесла» с пятью вкладками — до ${cnt.head932} px из 932 и до ${cnt.head844} из 844.`);
  console.log('Проверка пройдена: окно «Перековка» в «Ремесле», три режима, операции с номером и итог на сиде, цена по циклу, показ итога, игроку служебного не видно.');
  process.exit(0);
};

/* ---------- 1. файлы ---------- */
{
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
  const order = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>/g)].map(m => m[1] || '');
  if (!links.includes('screens/reforge.css')) say('index.html: не подключён screens/reforge.css');
  const i = order.indexOf('screens/reforge.js');
  if (i < 0) say('index.html: не подключён screens/reforge.js');
  for (const f of ['screens/model.js', 'screens/bag.js', 'screens/talismans.js', 'screens/equipment.js', 'screens/rituals.js']) if (i >= 0 && order.indexOf(f) > i) say(`index.html: reforge.js подключён раньше ${f}`);
  for (const [f, t] of [['reforge.js', JS], ['reforge.css', CSS]]) { const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length; if (crlf !== lf) say(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`); }
  try { new vm.Script(JS, { filename: 'reforge.js' }); } catch (e) { say('синтаксис reforge.js: ' + e.message); }
  const defined = new Set((CSS.match(/\.rf-[a-z0-9-]+/g) || []).map(s => s.slice(1)));
  for (const c of new Set(JS.match(/\brf-[a-z0-9-]+/g) || [])) if (!defined.has(c)) say(`reforge.css: не описан класс ${c}`);
  const kf = [...CSS.matchAll(/@keyframes\s+(rf-[a-z0-9-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
  if (kf.length < 4) say('reforge.css: ключевых кадров показа меньше четырёх');
  for (const [, name, body] of kf) {
    const bad = [...body.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]).filter(p => p !== 'transform' && p !== 'opacity');
    if (bad.length) say(`@keyframes ${name}: анимирует не только transform и opacity — ${[...new Set(bad)].join(', ')}`);
  }
  if (!/@media \(prefers-reduced-motion:reduce\)\{\s*\.rf-anim \*/.test(CSS)) say('reforge.css: «меньше движения» не выключает анимацию показа');
}
if (err.length) done();

/* ---------- 2. песочница ---------- */
const handlers = {};
const stubEl = id => ({ id, innerHTML: '', textContent: '', value: '', style: { setProperty() {} }, dataset: {}, children: [],
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x,
  insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 });
const els = {};
const document = { readyState: 'loading', addEventListener(t, f) { (handlers[t] = handlers[t] || []).push(f); }, getElementById: id => (els[id] = els[id] || stubEl(id)),
  querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
  documentElement: stubEl('html'), activeElement: null, fonts: null };
let reduced = false;
const timers = [];
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: q => ({ matches: /reduce/.test(q) ? reduced : false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: (f, ms) => { timers.push({ f, ms: ms | 0 }); return timers.length; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
for (const s of scripts) {
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
const T = vm.runInContext(`({
  get S() { return S; }, set S(v) { S = v; },
  ACT, OV, SCREENS, CRAFT_SEGS, FLOWS, KIT_EXTRA, KH, MAP, render, initialState, setTeam, H, EnLoot: window.EnLoot, EnEquip: window.EnEquip,
  TL: window.EN_TALISMANS, EQD: window.EN_EQUIPMENT, RT: window.EN_RITUALS, RF_SRV, RF_MODES, RF_DATA, RF_FX, TL_SRV, EQ_SRV, TB, tlPool, tlR, eqItem, eqFree, rtBusyW,
  rfKitHtml, rfSel, rfOrbit, zpEntries,
})`, ctx);
const S = () => T.S;
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message}\n    ${(e.stack || '').split('\n').slice(1, 3).join('\n    ')}`); return undefined; } };
const game = () => (els.game ? els.game.innerHTML : '');
/* разметка: без исключений, undefined, NaN и [object, без второго style или class; глазами игрока — без служебного */
const seen = new Set();
function scan(h, where) {
  cnt.views++;
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  const dup = h.match(/<[a-z]+\b[^>]*?\s(style|class)="[^"]*"[^>]*?\s\1="/);
  if (dup) say(`${where}: в теге дважды ${dup[1]} — ${dup[0].slice(0, 120)}`);
  if (!T.KH.team) {
    cnt.player++;
    const i = h.indexOf('<main'), part = i < 0 ? h : h.slice(i), v = strip(part);
    const txt = playerText(part).split('\n').concat([...v.matchAll(/\s(?:title|placeholder)="([^"]*)"/g)].map(m => m[1]));
    for (const t of txt) for (const [what, re] of SERVICE) { const k = what + '|' + t; if (re.test(t) && !seen.has(k)) { seen.add(k); say(`${where}: игроку видно служебное (${what}) — «${t.slice(0, 100)}»`); } }
  }
  return h;
}
const view = where => { run(where, () => T.render()); return scan(game(), where); };
const reset = () => { T.S = T.initialState(); T.S.overlay = null; T.S.route = 'craft'; T.S.seg.craft = 'reforge'; };
const open = (m, r) => { T.S.route = 'craft'; T.S.seg.craft = 'reforge'; T.S.seg.rf = m; T.S.overlay = null; if (r) T.S.rf.sel[m] = r; };
const snap = () => JSON.stringify({ w: S().wallet, x: S().zp && S().zp.extra, eq: Object.keys(S().eq.items).sort(), a: S().rituals.artel });
const op = () => `rf${S().rf.seq}`;
run('режим «Игрок»', () => T.setTeam(false));

/* ---------- 3. окно и вкладка ---------- */
reset();
{
  for (const seg of ['work', 'stock', 'shop', 'market', 'reforge']) {
    T.S.seg.craft = seg; const v = run('шапка', () => T.SCREENS.craft());
    const items = v && v.seg ? v.seg.items.map(x => x[0]) : [];
    const i = items.indexOf('reforge');
    if (i < 0) say(`«Ремесло · ${seg}»: в шапке нет вкладки «Перековка»`);
    else if (i < items.indexOf('shop') || i < items.indexOf('market')) say(`«Ремесло · ${seg}»: «Перековка» стоит не после Лавки и Рынка — ${items.join(', ')}`);
    if (items.filter(x => x === 'reforge').length > 1) say(`«Ремесло · ${seg}»: вкладка «Перековка» дважды`);
  }
  /* пять вкладок и кошелёк в шапке помещаются в 932 и 844 px — расчёт по CSS с запасом: буква подписи вкладки — 0,5 em
     Cormorant Garamond, цифра кошелька — 0,52 em PT Sans Narrow; выбранной может быть любая вкладка */
  {
    const IH = html.replace(/\s+/g, ' '), RC = CSS.replace(/\s+/g, ' ');
    const px = (src, re) => { const m = src.match(re); return m ? +m[1] : NaN; };
    const CH = 0.5, DIG = 0.52, SP = 0.25;
    const v = {
      gap: px(IH, /\.g-top\{[^}]*?gap:(\d+)px/), padR: px(IH, /\.g-top\{[^}]*?padding-right:(\d+)px/),
      wGap: px(IH, /\.g-wallet\{[^}]*?gap:(\d+)px/), wPad: px(IH, /\.g-wallet\{[^}]*?padding:0 (\d+)px/), wBord: px(IH, /\.g-wallet\{[^}]*?border:(\d+)px/),
      cGap: px(IH, /\.g-cur\{[^}]*?gap:(\d+)px/), cPad: px(IH, /\.g-cur\{[^}]*?padding:0 (\d+)px/), cFont: px(IH, /\.g-cur\{[^}]*?font:700 (\d+)px/), cImg: px(IH, /\.g-cur img\{[^}]*?width:(\d+)px/),
      plus: px(IH, /\.g-plus\{[^}]*?width:(\d+)px/) - px(IH, /\.g-plus\{[^}]*?margin-left:-(\d+)px/), bell: px(IH, /\.g-icon\{[^}]*?width:(\d+)px/) + px(IH, /\.g-icon\{margin-right:(\d+)px\}/),
      segGap: px(IH, /\.g-seg\{[^}]*?gap:(\d+)px/),
    };
    const frames = [{ n: 932, w: px(IH, /\.g\{[^}]*?width:(\d+)px/), rail: px(IH, /\.g\{[^}]*?--rail:(\d+)px/), f: px(RC, /\.g-seg:has\(>button:nth-child\(5\)\) button\{padding:0 (?:\d+)px;font-size:([\d.]+)px/), fs: px(RC, /\.g-seg:has\(>button:nth-child\(5\)\) button\[aria-selected="true"\]\{font-size:([\d.]+)px/), p: px(RC, /\.g-seg:has\(>button:nth-child\(5\)\) button\{padding:0 (\d+)px/) },
      { n: 844, w: px(IH, /\.g\.sm\{[^}]*?width:(\d+)px/), rail: px(IH, /\.g\.sm\{[^}]*?--rail:(\d+)px/), f: px(RC, /\.g\.sm \.g-seg:has\(>button:nth-child\(5\)\) button\{padding:0 (?:\d+)px;font-size:([\d.]+)px/), fs: px(RC, /\.g\.sm \.g-seg:has\(>button:nth-child\(5\)\) button\[aria-selected="true"\]\{font-size:([\d.]+)px/), p: px(RC, /\.g\.sm \.g-seg:has\(>button:nth-child\(5\)\) button\{padding:0 (\d+)px/) }];
    const bad = Object.entries(v).concat(...frames.map(f => Object.entries(f))).filter(([, x]) => !Number.isFinite(x));
    if (bad.length) say(`шапка «Ремесла»: не прочитаны размеры — ${bad.map(x => x[0]).join(', ')}`);
    else {
      reset();
      const labels = T.SCREENS.craft().seg.items.map(x => x[1]);
      const num = n => { const s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (s.replace(/ /g, '').length * DIG + (s.split(' ').length - 1) * SP) * v.cFont; };
      const wallet = ['gold', 'spirit', 'souls', 'enerium'].reduce((a, k) => a + 2 * v.cPad + v.cImg + v.cGap + num(T.S.wallet[k] || 0), 0) + 3 * v.wGap + 2 * v.wPad + 2 * v.wBord + v.plus;
      for (const f of frames) for (let s = 0; s < labels.length; s++) {
        const seg = labels.reduce((a, l, i) => a + l.length * CH * (i === s ? f.fs : f.f) + 2 * f.p, 0) + (labels.length - 1) * v.segGap;
        const total = f.rail + 4 * v.gap + seg + wallet + v.bell + v.padR;
        cnt['head' + f.n] = Math.max(cnt['head' + f.n] || 0, Math.round(total));
        if (total > f.w) say(`шапка «Ремесла» ${f.n} px, выбрана «${labels[s]}»: около ${Math.round(total)} px — не влезает`);
      }
    }
  }
  const card = T.MAP.find(x => x.n === 'Ремесло');
  if (!card || !(card.ready || []).includes('reforge') || !card.o.includes('reforge')) say('карта экранов: окно «Перековка» не отмечено готовым');
  if (card && !/screens\/reforge\.js/.test(card.d)) say('карта экранов: описание «Ремесла» не называет окно перековки');
}
for (const team of [false, true]) {
  reset(); run('режим', () => T.setTeam(team));
  const tag = team ? 'Команда' : 'Игрок';
  for (const m of ['tal', 'eq', 'work']) {
    open(m); const h = view(`${tag} · ${m}`);
    if (!h.includes('class="scr rf"')) say(`${tag} · ${m}: окно не нарисовалось`);
    if (!h.includes(`data-v="rf:${m}" `) && !h.includes(`data-v="rf:${m}">`)) say(`${tag} · ${m}: нет вкладки режима`);
    if ((h.match(/class="rf-step[ "]/g) || []).length !== 6) say(`${tag} · ${m}: ступеней лестницы не шесть`);
    const need = T.RF_MODES[m].need();
    if ((h.match(/class="rf-it[ "]/g) || []).length !== need) say(`${tag} · ${m}: мест на наковальне не ${need}`);
    if ((h.match(/data-a="rfforge"/g) || []).length !== 1) say(`${tag} · ${m}: у наковальни не одно действие`);
    for (let r = 1; r <= 6; r++) { T.S.rf.sel[m] = r; view(`${tag} · ${m} · ступень ${r}`); }
  }
  run('режим «Игрок»', () => T.setTeam(false));
}
/* закрытые режимы: цикл I — талисманы и снаряжение; ритуалы — с 10-го уровня Странника и цикла II */
{
  reset(); T.S.acc.cycle = 1;
  for (const m of ['tal', 'eq', 'work']) { open(m); const h = view(`цикл I · ${m}`); if (!h.includes('rf-lock') || h.includes('data-a="rfforge"')) say(`цикл I · ${m}: режим не закрыт`); }
  reset(); T.S.acc.level = Math.min(T.S.acc.level, T.RT.rules.open.level - 1);
  open('work'); const h = view('рабочие · уровень ниже'); if (!h.includes('rf-lock')) say('рабочие: до уровня открытия ритуалов режим не закрыт');
}

/* ---------- 4. «сервер» ---------- */
const commons = () => T.TB.list().filter(x => T.tlR(x.no) === 1).reduce((a, x) => a + x.q, 0);
/* талисманы: цена по циклу, генератор на сиде операции, повтор номера */
for (let c = 2; c <= 6; c++) {
  reset(); T.S.acc.cycle = c; T.S.wallet.gold = 10000000;
  const n0 = commons(), g0 = T.S.wallet.gold, o = op(), price = T.TL.rules.reforge.gold[0] * T.RF_DATA.talCyc[c];
  if (n0 < T.TL.rules.reforge.need) { say(`талисманы: обычных в запасах ${n0} — меньше ${T.TL.rules.reforge.need}`); break; }
  const R = run('талисманы · перековка', () => T.RF_SRV.forge('tal', o, 1)); cnt.ops++;
  if (!R || !R.ok) { say(`талисманы, цикл ${c}: отказ ${JSON.stringify(R)}`); continue; }
  if (T.S.wallet.gold !== g0 - price) say(`талисманы, цикл ${c}: золото ${g0 - T.S.wallet.gold}, цена ${price}`);
  if (commons() !== n0 - T.TL.rules.reforge.need) say(`талисманы, цикл ${c}: ушло не ${T.TL.rules.reforge.need} обычных`);
  if (T.tlR(R.got) !== 2) say(`талисманы, цикл ${c}: итог редкости ${T.tlR(R.got)}`);
  const pool = T.tlPool(2), W = pool.reduce((a, x) => a + x[1], 0); let k = T.EnLoot.makeRng(T.EnLoot.seedOf('перековка|' + o))(W), want = null;
  for (const [no, w] of pool) { if (k < w) { want = no; break; } k -= w; }
  if (want !== R.got) say(`талисманы, цикл ${c}: итог ${R.got} не совпал с генератором на сиде операции — ${want}`);
  const s1 = snap(), again = T.RF_SRV.forge('tal', o, 1);
  if (!again.again || snap() !== s1) say(`талисманы, цикл ${c}: повтор номера что-то изменил`);
  if (c === 2 && price !== T.TL.rules.reforge.gold[0]) say('талисманы: в цикле II цена не равна данным талисманов');
}
{
  reset(); T.S.wallet.gold = 0; let r = T.RF_SRV.forge('tal', op(), 1); if (r.refuse !== 'gold') say(`талисманы без золота: ${JSON.stringify(r)}`);
  reset(); r = T.RF_SRV.forge('tal', op(), 5); if (r.refuse !== 'few') say(`талисманы при нехватке: ${JSON.stringify(r)}`);
  reset(); r = T.RF_SRV.forge('tal', op(), 7); if (r.refuse !== 'top') say(`талисманы вневременные: ${JSON.stringify(r)}`);
  reset(); T.S.acc.cycle = 1; r = T.RF_SRV.forge('tal', op(), 1); if (r.refuse !== 'lock') say(`талисманы в цикле I: ${JSON.stringify(r)}`);
  /* прежний вход: TL_SRV.forge — тот же «сервер» и тот же номер */
  reset(); const o = 'tl7', a = T.TL_SRV.forge(o, 1), b = T.RF_SRV.forge('tal', o, 1); cnt.ops += 2;
  if (!a.ok || !b.again || b.got !== a.got) say('талисманы: TL_SRV.forge ведёт не в общий «сервер» перековки');
}
/* снаряжение: десять свободных, цикл — самый ранний, цена × цикл итога, надетые не берутся */
{
  reset(); T.S.wallet.gold = 10000000;
  const free1 = () => T.eqFree().filter(it => it.r === 1);
  const L = free1(), need = T.EQD.rules.reforge.need;
  if (L.length < need) say(`снаряжение: свободных обычных ${L.length} — меньше ${need}`);
  else {
    const o = op(), g0 = T.S.wallet.gold, R = T.RF_SRV.forge('eq', o, 1); cnt.ops++;
    const cyc = Math.min(...L.slice().sort((a, b) => a.cyc - b.cyc || a.lines[0][1] - b.lines[0][1] || a.n - b.n).slice(0, need).map(it => it.cyc));
    const got = R.ok ? T.eqItem(R.got) : null;
    if (!got || got.r !== 2 || got.cyc !== cyc) say(`снаряжение: итог ${JSON.stringify(got && { r: got.r, cyc: got.cyc })}, ждали редкий цикла ${cyc}`);
    if (T.S.wallet.gold !== g0 - T.EQD.rules.reforge.gold[0] * cyc) say('снаряжение: золото не ровно цена × цикл итога');
    if (free1().length !== L.length - need) say('снаряжение: ушло не десять свободных обычных');
    const want = T.EnEquip.mint(T.EQD, { r: 2, cyc }, T.EnEquip.seedOf('перековка-снаряжения|' + o));
    if (got && (got.slot !== want.slot || JSON.stringify(got.lines) !== JSON.stringify(want.lines))) say('снаряжение: итог не совпал с генератором на сиде операции');
    const s1 = snap(), again = T.EQ_SRV.forge(o, 1); if (!again.again || snap() !== s1) say('снаряжение: повтор номера через EQ_SRV.forge что-то изменил');
  }
  /* надетый предмет в десять не попадает: свободных обычных — на один меньше, чем нужно */
  reset(); T.S.wallet.gold = 10000000;
  const h = T.S.heroes[0], all = free1();
  all.slice(0, Math.max(0, all.length - need + 1)).forEach(it => { it.on = h.id; });
  if (free1().length !== need - 1) say(`снаряжение: подготовка — свободных обычных ${free1().length}, ждали ${need - 1}`);
  const r = T.RF_SRV.forge('eq', op(), 1);
  if (r.refuse !== 'few') say(`снаряжение: в десять попали надетые — ${JSON.stringify(r)}`);
  reset(); T.S.wallet.gold = 0; const g = T.RF_SRV.forge('eq', op(), 1); if (g.refuse !== 'gold') say(`снаряжение без золота: ${JSON.stringify(g)}`);
}
/* рабочие: три одной редкости → один выше; занятые не берутся; цена по циклу */
{
  const F = T.RT.rules.forge;
  if (!F || !(F.need >= 2) || !Array.isArray(F.gold) || F.gold.length !== 6 || !Array.isArray(F.cyc)) say('рабочие: нет правила перековки EN_RITUALS.rules.forge');
  else {
    for (const x of F.gold.concat(F.cyc, [F.need])) if (!Number.isInteger(x)) say(`рабочие: не целое число в правиле — ${x}`);
    for (let c = 2; c <= 6; c++) {
      reset(); T.S.acc.cycle = c; T.S.wallet.gold = 10000000;
      const busy = T.rtBusyW(), A = () => T.S.rituals.artel;
      const free = r => A().filter(w => w.r === r && !busy.has(w.id)).length;
      while (free(1) < F.need) A().push({ id: 'проверка' + A().length, r: 1 });
      const n1 = A().filter(w => w.r === 1).length, n2 = A().filter(w => w.r === 2).length, busyIds = [...busy], g0 = T.S.wallet.gold, o = op();
      const R = T.RF_SRV.forge('work', o, 1); cnt.ops++;
      if (!R.ok) { say(`рабочие, цикл ${c}: отказ ${JSON.stringify(R)}`); continue; }
      if (A().filter(w => w.r === 1).length !== n1 - F.need || A().filter(w => w.r === 2).length !== n2 + 1) say(`рабочие, цикл ${c}: не ${F.need} обычных в одного редкого`);
      if (busyIds.some(id => !A().some(w => w.id === id))) say(`рабочие, цикл ${c}: перекован занятый в ритуале`);
      if (T.S.wallet.gold !== g0 - F.gold[0] * F.cyc[c]) say(`рабочие, цикл ${c}: золото ${g0 - T.S.wallet.gold}, цена ${F.gold[0] * F.cyc[c]}`);
      const s1 = snap(), again = T.RF_SRV.forge('work', o, 1); if (!again.again || snap() !== s1) say(`рабочие, цикл ${c}: повтор номера что-то изменил`);
    }
    reset(); T.S.rituals.artel = T.S.rituals.artel.filter(w => w.r !== 3); let r = T.RF_SRV.forge('work', op(), 3); if (r.refuse !== 'few') say(`рабочие при нехватке: ${JSON.stringify(r)}`);
    reset(); T.S.wallet.gold = 0; r = T.RF_SRV.forge('work', op(), 1); if (r.refuse !== 'gold') say(`рабочие без золота: ${JSON.stringify(r)}`);
    reset(); r = T.RF_SRV.forge('work', op(), 7); if (r.refuse !== 'top') say(`рабочие вневременные: ${JSON.stringify(r)}`);
    reset(); T.S.acc.cycle = 1; r = T.RF_SRV.forge('work', op(), 1); if (r.refuse !== 'lock') say(`рабочие в цикле I: ${JSON.stringify(r)}`);
  }
}
/* цены — целые и растут с редкостью и циклом */
{
  const TC = T.RF_DATA.talCyc;
  if (!Array.isArray(TC) || TC.length !== 7 || TC.some(x => !Number.isInteger(x))) say('RF_DATA.talCyc: не семь целых множителей');
  else { if (TC[2] !== 1) say('RF_DATA.talCyc: в цикле II цена талисманов не равна данным'); for (let c = 3; c <= 6; c++) if (TC[c] <= TC[c - 1]) say(`RF_DATA.talCyc: множитель цикла ${c} не растёт`); }
  for (const m of ['tal', 'eq', 'work']) { reset(); for (let r = 1; r <= 6; r++) { const p = T.RF_MODES[m].price(r); if (!Number.isInteger(p) || p <= 0) say(`${m}: цена ступени ${r} — ${p}`); if (r > 1 && p <= T.RF_MODES[m].price(r - 1)) say(`${m}: цена не растёт с редкостью на ступени ${r}`); } }
}

/* ---------- 5. перековка ушла из листов героя, переходы в окно ---------- */
{
  reset();
  if (T.OV.eqforge || T.OV.zptalforge) say('лист перековки снаряжения или талисманов остался — перековка живёт в своём окне');
  if (T.ACT.talforge || T.ACT.eqforge) say('прежние действия talforge или eqforge остались');
  const tal = read('screens/talismans.js'), eq = read('screens/equipment.js');
  if (/function tlForgeHtml|talforge\(|'forge', 'Перековка'/.test(tal)) say('screens/talismans.js: перековка осталась в листе талисманов');
  if (/eqforge\(|function eqForgePick|forge\(op, r\) \{/.test(eq)) say('screens/equipment.js: перековка осталась в снаряжении');
  /* лист талисманов героя — только его разметка: карточку героя рисуют другие экраны */
  const h = T.S.heroes[0];
  T.S.selHero = h.id; T.S.seg.tal = 'fit';
  let s = '';
  try { s = T.OV.tal({ t: 'tal', arg: `${h.id}:0` }) || ''; } catch (e) { warn.push(`лист талисманов героя не рисуется (${e.message}) — вкладка проверена по коду`); }
  if (/data-v="tal:forge"/.test(s)) say('лист талисманов героя: осталась вкладка «Перековка»');
  /* «Запасы»: карточки талисмана и снаряжения ведут в окно своим режимом и редкостью */
  reset(); T.S.seg.craft = 'stock';
  for (const [tab, m, kind] of [['tal', 'tal', 'tal'], ['eq', 'eq', 'equip']]) {
    T.S.zp.tab = tab; const e = T.zpEntries(tab).find(x => x.kind === kind);
    if (!e) { say(`«Запасы · ${tab}»: в демо пусто`); continue; }
    run('запасы', () => T.ACT.zpsel(e.key));
    const g = view(`запасы · ${tab}`);
    const mm = g.match(new RegExp(`data-a="rfgo" data-v="${m}:(\\d)"`));
    if (!mm) { say(`«Запасы · ${tab}»: в карточке нет перехода в окно перековки`); continue; }
    run('переход', () => T.ACT.rfgo(`${m}:${mm[1]}`));
    if (T.S.seg.craft !== 'reforge' || T.S.seg.rf !== m || T.S.rf.sel[m] !== +mm[1]) say(`«Запасы · ${tab}»: переход открыл не окно перековки нужного режима`);
    view(`после перехода · ${m}`);
    T.S.seg.craft = 'stock';
  }
  /* лист «Артель» ритуалов — кнопка «Перековка рабочих» */
  reset(); T.S.route = 'rituals'; T.S.seg.rituals = 'work'; T.S.overlay = { t: 'rtart' };
  const art = view('лист «Артель»');
  if (!art.includes('data-a="rfgo" data-v="work"')) say('лист «Артель»: нет кнопки «Перековка рабочих»');
  run('из артели', () => T.ACT.rfgo('work')); if (T.S.route !== 'craft' || T.S.seg.craft !== 'reforge' || T.S.seg.rf !== 'work' || T.S.overlay) say('лист «Артель»: кнопка не открыла окно перековки рабочих');
}

/* ---------- 6. показ итога ---------- */
{
  reset(); open('tal', 1); T.S.wallet.gold = 10000000; timers.length = 0;
  const n0 = commons(), h0 = view('до перековки'), m = h0.match(/data-a="rfforge" data-v="([^"]+)"/);
  if (!m) say('показ: нет кнопки «Перековать»');
  else {
    run('перековка', () => T.ACT.rfforge(m[1])); cnt.ops++;
    const fx = T.S.rf.fx;
    if (commons() !== n0 - T.TL.rules.reforge.need) say('показ: итог не выдан до анимации');
    if (!fx) say('показ: анимации нет');
    const h = view('показ итога');
    if (!/class="rf-ring rf-anim"/.test(h)) say('показ: круг не в анимации');
    if ((h.match(/class="rf-it rf-fly"/g) || []).length !== T.TL.rules.reforge.need) say('показ: на орбите не все ушедшие');
    const ms = [...h.matchAll(/--(?:dt|tt):(-?[\d.]+)ms/g)].map(x => x[1]);
    if (ms.length < 10 || ms.some(x => !/^-?\d+$/.test(x))) say('показ: моменты в разметке не целые мс');
    if (!h.includes('data-a="rfskip"')) say('показ: нажатие на круг не ведёт к итогу');
    if (!timers.some(t => t.ms === T.RF_FX.end)) say('показ: нет таймера конца показа');
    run('повтор кнопки', () => T.ACT.rfforge(m[1])); if (commons() !== n0 - T.TL.rules.reforge.need) say('показ: повтор кнопки перековал второй раз');
    run('пропуск', () => T.ACT.rfskip());
    const d = view('итог');
    if (T.S.rf.fx || d.includes('rf-anim')) say('показ: нажатие не закончило показ');
    if (!d.includes('class="rf-got"') || !d.includes('class="rf-res"')) say('показ: после показа нет итога в центре и строки «Вышло»');
    const end = timers.find(t => t.ms === T.RF_FX.end); if (end) run('таймер', () => end.f());
  }
  /* «меньше движения» — без анимации, итог сразу */
  reduced = true; reset(); open('eq', 1); T.S.wallet.gold = 10000000;
  const h = view('меньше движения · до'), m2 = h.match(/data-a="rfforge" data-v="([^"]+)"/);
  if (m2) { run('перековка', () => T.ACT.rfforge(m2[1])); cnt.ops++; if (T.S.rf.fx) say('«меньше движения»: анимация идёт'); const d = view('меньше движения · итог'); if (!d.includes('class="rf-got"')) say('«меньше движения»: итог не показан'); }
  reduced = false;
  /* рабочие: предупреждение, если артели не хватит на полную бригаду */
  reset(); open('work', 1); T.S.wallet.gold = 10000000; T.S.rituals.artel = T.S.rituals.artel.filter(w => w.r === 1 || T.rtBusyW().has(w.id)).slice(0, 4);
  while (T.S.rituals.artel.filter(w => w.r === 1 && !T.rtBusyW().has(w.id)).length < T.RT.rules.forge.need) T.S.rituals.artel.push({ id: 'мало' + T.S.rituals.artel.length, r: 1 });
  const w = view('рабочие · мало'); if (T.S.rituals.artel.length - T.RT.rules.forge.need + 1 < T.RT.rules.unique.crew && !w.includes('rf-warn')) say('рабочие: нет предупреждения о бригаде');
}

/* ---------- 7. UI-кит и сценарии ---------- */
for (const team of [false, true]) {
  reset(); run('режим', () => T.setTeam(team));
  const k = T.KIT_EXTRA.find(x => x.html === T.rfKitHtml);
  if (!k) { say('UI-кит: раздела «Перековка» нет в KIT_EXTRA'); break; }
  const h = run('UI-кит', () => k.html());
  if (typeof h !== 'string' || !h.includes('Перековка')) say('UI-кит: раздел «Перековка» не рисуется');
  else { const x = h.match(/.{0,40}(?:undefined|NaN|\[object ).{0,40}/); if (x) say(`UI-кит: в разметке «${x[0]}»`); if (!team) scan(h, 'UI-кит · Перековка'); }
  for (const name of ['Перековка · талисманы', 'Перековка · итог', 'Перековка · рабочие', 'Снаряжение · перековка']) {
    reset(); run('режим', () => T.setTeam(team));
    const F = T.FLOWS.find(x => x[0] === name); if (!F) { say(`нет сценария «${name}»`); continue; }
    run('сценарий ' + name, () => F[2]()); const g = view(`${team ? 'Команда' : 'Игрок'} · сценарий «${name}»`);
    if (!g.includes('class="scr rf"')) say(`сценарий «${name}»: не открыл окно перековки`);
    if (name === 'Снаряжение · перековка' && T.S.seg.rf !== 'eq') say('сценарий «Снаряжение · перековка»: не режим снаряжения');
    if (name === 'Перековка · итог' && !T.S.rf.last.tal) say('сценарий «Перековка · итог»: перековки не было');
  }
}
run('режим «Игрок»', () => T.setTeam(false));
done();
