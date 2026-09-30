/* Автопроверка «Странника» — покои в Башне вневремени (design/ui/screens/chambers.js и chambers.css; вид вкладок — wanderer.js и
   wanderer.css, окна — social.css, Летопись — chronicle.css) — без браузера.
   Слово автора 30.09.2026: «Так же надо прорабатывать Окно странника и так же сделать окна в нём ААА уровня, генери графику какую пожелаешь».
   1. Файлы: index.html подключает chambers.css до wanderer.css (у правил раздела вес :where — правило экрана сильнее), chambers.js — после
      social.js и chronicle.js; скрипты компилируются; концы строк — CRLF у всех файлов раздела; классы cb-* из скриптов описаны в стилях;
      ключевые кадры и переходы — только transform и opacity; смешения слоёв нет; у движения есть «меньше движения».
   2. Арт: пути CB_ART.ready и WN_ART.icons есть на диске и в описи выгрузки tools/art-gen/ui-art.json; у каждого артефакта — своя
      вещь реликвария, у каждой темы достижений — медальон, у первенства и тайны — свои; геометрия рамы зеркала, таблички и ниши — целые
      числа внутри рисунка.
   3. Залы: у каждой вкладки «Странника» (Обзор, Память, Артефакты, Достижения, Летопись) — ровно один свой зал; песка и огоньков —
      по CB_VIEW; фаза — от часов страницы: перерисовка не начинает движение заново; прежний маршрут chronicle — зал Летописи.
   4. Окна: у листов и окон раздела и общения — класс cb-win; рейтинг недели — только когда открыт из «Странника».
   5. Вещи вкладок: колонка — ниша с портретом и постамент (опыт, клан, четыре кнопки); «Обзор» — пятёрка на карнизе с табличкой суммы
      мощи и рейтинги табличками со знаком режима; «Память» — зеркало со стеклом и табличкой, пять мест внутри; «Артефакты» — витрины
      с вещью своего артефакта; «Достижения» — медальоны тем, тайна — замок, первенство — венец; окно «одна из трёх» — герб. До выгрузки
      арта — ни одной ссылки на него, вещь рисует CSS.
   6. Отклик: покупка и уровень артефакта, достижение, облик — частицы после операции, которая прошла; повтор и отказ — без частиц.
   7. Вёрстка — расчётом на 932 × 430 и 844 × 390 из чисел CB_VIEW, CB_ART и стилей: колонка вмещает нишу с портретом, имя, уровень
      и постамент; книга пятёрки не уже 80 px; табличка рейтинга не уже 150 px; место Памяти в стекле зеркала — не уже 80 px и вмещает
      осколок, имя в две строки, редкость и «Вспомнить»; витрина реликвария не уже 240 px.
   7б. Каскад — маленький, без браузера: разметка песочницы деревом, стили index.html и всех подключённых файлов по порядку документа,
      победитель — !important, вес селектора, позднее правило. Ряд книг пятёрки помещается в полке и после чужих потолков ряда
      (.sq-slots в book.css — 420 px); таблички заголовков — одна строка, чужой перенос заголовков (.g h2) их не перебивает; у всех
      окон CB_WINS поля шапки, тела и низа отступают от серебряных уголков не меньше чем на 8 px, у листа без низа тело кончается
      над нижним уголком; уголки стоят по --cb-cn и --cb-co.
   8. Режим «Игрок»: служебного нет ни на одной вкладке и ни в одном окне раздела (SERVICE из check_player_view.js).
   9. UI-кит: раздел «Странник: покои и вещи» — пять залов, медальоны тем, вещи реликвария; сценарий «Странник · покои».
   Запуск: node tools/content-gen/screens/check_chambers.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { strip, playerText, SERVICE } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const OWN = ['screens/chambers.js', 'screens/chambers.css', 'screens/wanderer.js', 'screens/wanderer.css', 'screens/social.css', 'screens/chronicle.css'];
const CSS = { cb: read('screens/chambers.css'), wn: read('screens/wanderer.css'), soc: read('screens/social.css'), chr: read('screens/chronicle.css') };
const err = [], rep = [];
const say = m => { if (err.length < 80) err.push(m); }, ok = (m, c) => { if (!c) say(m); };
let drawn = 0;

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const order = scripts.map(s => s.src || ''), links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
ok('index.html: не подключён screens/chambers.css', links.includes('screens/chambers.css'));
ok('index.html: chambers.css подключён не до wanderer.css — правило экрана при равном весе должно быть сильнее', links.indexOf('screens/chambers.css') >= 0 && links.indexOf('screens/chambers.css') < links.indexOf('screens/wanderer.css'));
ok('index.html: не подключён screens/chambers.js', order.includes('screens/chambers.js'));
for (const f of ['screens/social.js', 'screens/chronicle.js', 'screens/wanderer.js']) ok(`index.html: chambers.js не после ${f} — обёртки не встанут`, order.indexOf('screens/chambers.js') > order.indexOf(f));
{
  const crlf = (html.match(/\r\n/g) || []).length, lf = (html.match(/\n/g) || []).length;
  ok(`index.html: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`, crlf === lf);
}
for (const f of OWN) {
  const t = read(f), crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
  ok(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`, crlf === lf);
  if (f.endsWith('.js')) try { new vm.Script(t, { filename: f }); } catch (e) { say(`синтаксис ${f}: ${e.message}`); }
}
/* классы cb-* из скриптов раздела описаны в chambers.css; переменные --cb-* и классы <html> (cb-h, cb-m…) — не классы разметки */
{
  const def = new Set((CSS.cb.match(/\.cb-[a-z0-9-]+/g) || []).map(s => s.slice(1)));
  const root = new Set((CSS.cb + CSS.wn + CSS.soc + CSS.chr).match(/html\.cb-[a-z]+/g).map(s => s.slice(5)));
  for (const f of ['screens/chambers.js', 'screens/wanderer.js']) for (const c of new Set(read(f).match(/(?<![-\w])cb-[a-z0-9-]*[a-z0-9]/g) || []))
    if (!def.has(c) && !root.has(c)) say(`chambers.css: не описан класс ${c} (${f})`);
  const wnDef = new Set((CSS.wn + CSS.cb).match(/\.wn-[a-z0-9-]+/g).map(s => s.slice(1)));
  for (const c of ['wn-mir', 'wn-glass', 'wn-gleam', 'wn-plt', 'wn-idl', 'wn-idp', 'wn-xpl', 'wn-clan', 'wn-ov', 'wn-five', 'wn-shelf', 'wn-wk', 'wn-wkh', 'wn-relic', 'wn-relic-c', 'wn-at', 'wn-arh', 'wn-shut', 'wn-medal', 'wn-crest'])
    ok(`стили раздела: не описан класс ${c}`, wnDef.has(c));
}
/* движение: кадры и переходы — только transform и opacity; смешения слоёв и фильтров на наведении нет; «меньше движения» — есть */
for (const [f, css] of [['chambers.css', CSS.cb], ['wanderer.css', CSS.wn], ['social.css', CSS.soc], ['chronicle.css', CSS.chr]]) {
  const c = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, name, body] of c.matchAll(/@keyframes\s+([a-z0-9-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
    const bad = [...body.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]).filter(p => p !== 'transform' && p !== 'opacity');
    if (bad.length) say(`${f}: @keyframes ${name} двигает ${[...new Set(bad)].join(', ')} — только transform и opacity`);
  }
  const topSplit = v => { const out = ['']; let d = 0; for (const ch of v) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) out.push(''); else out[out.length - 1] += ch; } return out; };
  for (const m of c.matchAll(/transition\s*:\s*([^;}]+)/g)) for (const part of topSplit(m[1])) { const p = part.trim().split(/\s+/)[0].replace('!important', ''); if (!['transform', 'opacity', 'none', 'color', 'filter', 'box-shadow', 'width'].includes(p)) say(`${f}: переход по «${p}»`); }
  if (/mix-blend-mode/.test(c) && f !== 'social.css') say(`${f}: смешение слоёв (mix-blend-mode) — тяжело для телефона`);
  if (/animation:/.test(c) && !/prefers-reduced-motion:\s*reduce/.test(c)) say(`${f}: у движения нет правила «меньше движения»`);
}
/* свои правила раздела: переходы — только transform и opacity (у прежних стилей экрана — как было) */
for (const [f, css] of [['chambers.css', CSS.cb]]) for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/transition\s*:\s*([^;}]+)/g)) {
  const p = m[1].trim().split(/\s+/)[0].replace('!important', ''); if (p !== 'transform' && p !== 'opacity' && p !== 'none') say(`${f}: переход по «${p}» — только transform и opacity`);
}
ok('chambers.css: при «меньше движения» песок и огоньки не спрятаны', /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\.cb-sd,\.cb-mo\{display:none\}/.test(CSS.cb));
ok('chambers.css: у зала нет фаз от часов страницы (--t)', /\.cb-sd,\.cb-mo\{[^}]*animation:[^}]*var\(--t,0ms\)/.test(CSS.cb) && /\.cb-hall-lt\{[^}]*var\(--t,0ms\)/.test(CSS.cb));
if (err.length) done();

/* ================== песочница: прототип по порядку скриптов, заглушка DOM, часы — управляемые ================== */
function sandbox(o = {}) {
  let clock = 0; const raf = [];
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, prepend() {}, remove() {},
      animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
    e.querySelector = () => stubEl();
    return e;
  };
  const rootCls = new Set(), root = stubEl('html'), rootVars = {};
  root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
  root.style = { setProperty: (k, v) => { rootVars[k] = v; } };
  const els = {};
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
    createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: root, activeElement: null, fonts: null, baseURI: 'file:///ui/' };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1, URL,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: q => ({ matches: !!o.reduced && /prefers-reduced-motion/.test(q), addEventListener() {}, addListener() {} }),
    requestAnimationFrame: f => { raf.push(f); return raf.length; }, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => clock } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    if (s.src && !fs.existsSync(path.join(UI, s.src))) continue;   // экран другой задачи ещё не написан
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; }, ACT, OV, SCREENS, KH, KIT_EXTRA, FLOWS, render, initialState, setTeam, AV,
    CB_VIEW, CB_ART, CB_WINS, CB_FROM, cbHallHtml, cbKitHtml, WN_ART, WN: window.EN_WANDERER, wnMedal, wnRelic,
  })`, ctx);
  T.tick = ms => { clock += ms; }; T.now = () => clock; T.raf = raf; T.rootCls = rootCls; T.rootVars = rootVars; T.game = () => (els.game ? els.game.innerHTML : '');
  return T;
}
const T = sandbox();
if (err.length) done();
const fresh = () => { T.S = T.initialState(); T.S.overlay = null; T.S.route = 'profile'; T.S.seg.profile = 'over'; };
function look(label, h) {
  drawn++;
  if (typeof h !== 'string' || !h) { say(label + ': пустая разметка'); return ''; }
  const bad = h.match(/undefined|NaN|\[object /);
  if (bad) say(`${label}: в разметке «${bad[0]}» — …${h.slice(Math.max(0, bad.index - 80), bad.index + 30).replace(/\s+/g, ' ')}…`);
  return h;
}
const seen = new Set();
function service(label, h) {
  if (T.KH.team) return;
  const v = strip(h), txt = playerText(h).split('\n').concat([...v.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => m[1]));
  for (const t of txt) for (const [what, re] of SERVICE) {
    const k = what + '|' + t; if (!re.test(t) || seen.has(k)) continue;
    seen.add(k); say(`${label}: игроку видно служебное (${what}) — «${t.slice(0, 100)}»`);
  }
}
const view = label => { try { T.render(); } catch (e) { say(`${label}: исключение — ${e.message}`); return ''; } const h = look(label, T.game()); service(label, h); return h; };
function run(label, f) { try { f(); } catch (e) { say(`${label}: исключение — ${e.message}\n    ${(e.stack || '').split('\n').slice(1, 3).join('\n    ')}`); } }
const W = T.WN;

/* ================== 2. арт ================== */
run('арт', () => {
  const ART = path.join(UI, 'assets', 'art'), spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'ui-art.json'), 'utf8'));
  for (const p of T.CB_ART.ready.concat(T.WN_ART.icons)) {
    ok(`арт: выгрузки нет на диске — ${p}`, fs.existsSync(path.join(ART, p)));
    ok(`арт: пути нет в описи tools/art-gen/ui-art.json — ${p}`, !!spec.items[p]);
  }
  for (const [k, p] of Object.entries(T.CB_ART.hall)) ok(`зал ${k}: картинки нет в CB_ART.ready`, T.CB_ART.ready.includes(p));
  for (const [k, p] of Object.entries(T.CB_ART.img)) ok(`вещь ${k}: картинки нет в CB_ART.ready`, T.CB_ART.ready.includes(p));
  for (const a of W.art.list) ok(`артефакт ${a.id} «${a.n}»: нет вещи реликвария`, T.WN_ART.icons.includes(T.WN_ART.relic.replace('{id}', a.id)));
  ok('реликварий: нет вещи под покрывалом (артефакты ещё не открыты)', T.WN_ART.icons.includes(T.WN_ART.relic.replace('{id}', 'lock')));
  for (const g of Object.keys(W.ach.groups).concat('first', 'myst')) ok(`зал трофеев: нет медальона «${g}»`, T.WN_ART.icons.includes(T.WN_ART.medal.replace('{g}', g)));
  /* геометрия: целые числа внутри рисунка */
  const M = T.CB_ART.mirror, P = T.CB_ART.plate, N = T.CB_ART.niche;
  const ints = x => (Array.isArray(x) ? x : [x]).every(Number.isInteger);
  ok('рама зеркала: срез угла — не целое или не меньше половины рисунка', ints(M.slice) && M.slice * 2 < M.px);
  ok('рама зеркала: толщина рамы — не целые ‰ угла', ints(M.frame) && M.frame.every(v => v > 0 && v < 1000));
  ok('табличка: срезы — не целые или не внутри рисунка', ints(P.slice) && ints(P.px) && P.slice[0] + P.slice[2] < P.px[1] && P.slice[1] + P.slice[3] < P.px[0]);
  ok('ниша: проём арки — не целые ‰ или не внутри', ints(N.arch) && ints(N.top) && N.arch[0] > 0 && N.arch[1] < 1000 && N.arch[0] < N.arch[1] && N.top > 0 && N.top < 500);
  /* размер рисунка рамы и таблички в описи — тот, что в геометрии */
  const mi = spec.items['chambers/mirror.png'], pi = spec.items['chambers/plate.webp'];
  ok(`рама зеркала: в описи ${mi && mi.size}, в CB_ART ${M.px}`, !!mi && mi.size[0] === M.px && mi.size[1] === M.px);
  ok(`табличка: в описи ${pi && pi.size}, в CB_ART ${P.px}`, !!pi && pi.size[0] === P.px[0] && pi.size[1] === P.px[1]);
  /* числа вида — в переменных <html>: стили берут их оттуда */
  for (const k of ['--cb-id0', '--cb-id1', '--cb-ava0', '--cb-mc0', '--cb-ms', '--cb-mfv', '--cb-mfh', '--cb-ps', '--cb-pst', '--cb-psr', '--cb-psb', '--cb-nr', '--cb-nt', '--cb-nw', '--cb-rk'])
    ok(`переменная ${k} не стоит у <html>`, T.rootVars[k] != null && T.rootVars[k] !== '');
  ok(`--cb-id0: ${T.rootVars['--cb-id0']}, в CB_VIEW ${T.CB_VIEW.id[0]}`, T.rootVars['--cb-id0'] === T.CB_VIEW.id[0] + 'px');
  for (const c of ['cb-h', 'cb-m', 'cb-n', 'cb-p', 'cb-l', 'cb-t', 'cb-c', 'cb-cr', 'cb-x']) ok(`класс <html> ${c} не стоит — рисунок выгружен`, T.rootCls.has(c));
  /* стили берут числа из переменных, а не свои */
  ok('wanderer.css: колонка — не из --cb-idw', /\.pf\.wn-pf\{grid-template-columns:var\(--cb-idw/.test(CSS.wn));
  ok('wanderer.css: рама зеркала — не border-image по CB_ART.mirror', /html\.cb-m \.wn-mir\{[^}]*border-image:var\(--cb-mirror\) var\(--cb-ms\) \/ var\(--cb-mcw/.test(CSS.wn));
  ok('chambers.css: табличка — не border-image по CB_ART.plate', /html\.cb-p \.wn-plt\{[^}]*border-image:var\(--cb-plate\) var\(--cb-ps\) fill/.test(CSS.cb));
  ok('wanderer.css: ниша колонки — не рисунок CB_ART.niche', /html\.cb-n \.wn-pf>\.idc\{background:var\(--cb-niche\)/.test(CSS.wn));
  for (const k of Object.keys(T.CB_ART.hall)) ok(`chambers.css: у зала ${k} нет фона`, CSS.cb.includes(`.cb-hall[data-hall="${k}"] .cb-hall-bg{background:var(--cb-hall-${k})`));
});

/* ================== 3. залы ================== */
run('залы', () => {
  /* у каждой вкладки свой зал — своим списком проверки: покои, зал зеркала, реликварий, зал трофеев, зал Летописи */
  const HALLS = { over: 'over', mem: 'mem', arts: 'arts', ach: 'ach', chron: 'chron' };
  ok(`вкладки → залы: ${JSON.stringify(T.CB_VIEW.hall)}, ждали ${JSON.stringify(HALLS)}`, JSON.stringify(T.CB_VIEW.hall) === JSON.stringify(HALLS));
  for (const [tab, hall] of Object.entries(HALLS)) {
    fresh(); T.S.seg.profile = tab;
    const h = view(`зал · ${tab}`), halls = [...h.matchAll(/<div class="cb-hall" data-hall="([a-z]+)" style="--t:(-?\d+)ms"/g)];
    ok(`«Странник · ${tab}»: залов ${halls.length}, а нужен один`, halls.length === 1);
    if (halls[0]) ok(`«Странник · ${tab}»: зал ${halls[0][1]}, ждали ${hall}`, halls[0][1] === hall);
    ok(`«Странник · ${tab}»: песка не ${T.CB_VIEW.sand}`, (h.match(/class="cb-sd"/g) || []).length === T.CB_VIEW.sand);
    ok(`«Странник · ${tab}»: огоньков не ${T.CB_VIEW.motes}`, (h.match(/class="cb-mo"/g) || []).length === T.CB_VIEW.motes);
    ok(`«Странник · ${tab}»: зал не первым слоем рабочей области`, /^<div class="cb-hall"/.test(h.slice(h.indexOf('<main')).replace(/^<main[^>]*>/, '')));
  }
  const a = T.cbHallHtml('mem'); T.tick(4321); const b = T.cbHallHtml('mem');
  ok('зал: фаза песка не от часов страницы', /--t:-?\d+ms/.test(a) && a.replace(/--t:-?\d+ms/, '') === b.replace(/--t:-?\d+ms/, '') && a !== b);
  ok('зал: фаза — не по модулю CB_VIEW.cycle', b.includes(`--t:${-(T.now() % T.CB_VIEW.cycle)}ms`));
  fresh(); T.S.route = 'chronicle';
  const h = view('маршрут chronicle');
  ok('прежний маршрут chronicle: не зал Летописи', /<div class="cb-hall" data-hall="chron"/.test(h));
  /* другой раздел — без зала покоев */
  fresh(); T.S.route = 'shelter'; ok('Убежище: под ним зал покоев', !/class="cb-hall"/.test(view('Убежище')));
});

/* ================== 4. окна ================== */
run('окна', () => {
  fresh(); T.S.seg.profile = 'mem';
  const args = { mem: '0', wnp: W.passives[0].id, wnart: W.art.list[0].id, wnfeat: W.ach.list[0].id, pp: 'Тихий ветер|friends', pphero: 'Тихий ветер|0|friends', ppreport: 'Тихий ветер|friends', ppblock: 'Тихий ветер|friends', ppunf: 'Тихий ветер|friends', letter: (T.S.soc && T.S.soc.read[0] || {}).id || '', write: '' };
  /* окна раздела и общения — своим списком проверки: окно, выпавшее из CB_WINS, осталось бы в прежнем виде */
  const WINS = ['mem', 'memreset', 'wnp', 'wncat', 'wnart', 'wnfeat', 'wnpas', 'wnfame', 'look', 'lksex', 'friends', 'pp', 'pphero', 'ppreport', 'ppblock', 'ppunf',
    'inbox', 'letter', 'write', 'chat', 'settings', 'level'];
  for (const k of WINS) ok(`окно ${k}: нет в CB_WINS — останется без материала покоев`, T.CB_WINS.includes(k));
  let n = 0;
  for (const k of WINS) {
    if (typeof T.OV[k] !== 'function') { say(`окно ${k}: нет в OV`); continue; }
    T.S.overlay = { t: k, arg: args[k] != null ? args[k] : '' };
    const h = view(`окно ${k}`), ov = h.slice(h.indexOf('<div class="ov'));
    if (!ov) { say(`окно ${k}: не нарисовано`); continue; }
    ok(`окно ${k}: нет материала покоев (cb-win)`, /class="(?:sheet|dlg fit) cb-win /.test(ov));
    n++;
  }
  ok(`окон раздела с материалом покоев ${n} — мало`, n >= 18);
  for (const k of T.CB_FROM) {
    if (typeof T.OV[k] !== 'function') continue;
    const arg = k === 'rank' ? 'Эхо' : ((T.S.ranks || [])[0] || [''])[0];
    T.S.route = 'profile'; T.S.overlay = { t: k, arg };
    const a = view(`${k} из «Странника»`);
    T.S.route = 'week'; T.S.overlay = { t: k, arg };
    const b = view(`${k} из «Недели»`);
    if (k === 'rank') { ok('рейтинг из «Странника»: нет материала покоев', /cb-win/.test(a.slice(a.indexOf('<div class="ov')))); ok('рейтинг из «Недели»: материал покоев', !/cb-win/.test(b.slice(b.indexOf('<div class="ov')))); }
  }
  T.S.overlay = null;
});

/* ================== 5. вещи вкладок ================== */
run('вещи вкладок', () => {
  fresh();
  let h = view('Обзор');
  const col = h.slice(h.indexOf('<div class="pnl idc">'), h.indexOf('<div class="col wn-ov">'));
  ok('колонка: не ниша с портретом — облик первым', /^<div class="pnl idc"><button class="lk-idb"/.test(col));
  ok('колонка: нет уровня и цикла в нише', /class="wn-idl">уровень <b class="num">\d+<\/b>/.test(col));
  ok('колонка: нет постамента', /<div class="wn-idp">/.test(col));
  const pl = col.slice(col.indexOf('<div class="wn-idp">'));
  ok('постамент: нет опыта песком', /class="lvlbtn"[^>]*data-v="level"[\s\S]*?<div class="bar sand"/.test(pl));
  ok('постамент: не четыре кнопки', (pl.match(/<button class="btn sm[^"]*" data-a="(?:sheet|dlg|go)"/g) || []).length === 4);
  ok('«Обзор»: пятёрка не на карнизе', /<div class="wn-shelf"><div class="sq-slots">/.test(h) && (h.slice(h.indexOf('wn-shelf')).match(/<button class="hb[ "]/g) || []).length >= 5);
  ok('«Обзор»: нет таблички с суммой мощи', /<h2 class="wn-plt">Пятёрка сильнейших<b class="bm sq-bm"/.test(h));
  const rk = (h.match(/<button class="rk"[^>]*><span class="rk-i">/g) || []).length;
  ok(`«Обзор»: у рейтингов нет знака режима — ${rk} из ${T.S.ranks.length}`, rk === T.S.ranks.length);
  ok('«Обзор»: знак режима — не картинка пути', /<span class="rk-i"><img src="[^"]*path-icons\//.test(h));
  T.S.seg.profile = 'mem'; h = view('Память');
  ok('«Память»: нет зеркала со стеклом и бликом', /<div class="wn-mir"><i class="wn-glass" aria-hidden="true"><\/i><i class="wn-gleam" aria-hidden="true"><\/i>/.test(h));
  ok('«Память»: нет таблички на раме', /<h2 class="wn-plt">Память Странника<span class="num">\d \/ \d<\/span><\/h2>/.test(h));
  const mir = h.slice(h.indexOf('<div class="wn-mir">'), h.indexOf('<div class="row wn-mfoot">'));
  ok('«Память»: мест в стекле зеркала не пять', (mir.match(/id="wnSlot\d"/g) || []).length === 5);
  T.S.seg.profile = 'arts'; h = view('Артефакты');
  const cards = h.split('<div class="wn-art').slice(1);
  ok(`«Артефакты»: витрин ${cards.length}, артефактов ${W.art.list.length}`, cards.length === W.art.list.length);
  W.art.list.forEach((a, i) => { const c = cards[i] || ''; if (!c.includes(`src="${T.AV(T.WN_ART.relic.replace('{id}', a.id))}"`)) say(`витрина ${a.id}: не вещь своего артефакта`); });
  ok('«Артефакты»: нет таблички «Реликварий»', /<h2 class="wn-plt">Реликварий<span class="num">\d+ \/ \d+<\/span><\/h2>/.test(h));
  T.S.acc.level = W.art.rules.openLevel - 1; h = view('Артефакты · закрыто');
  ok('реликварий до открытия: нет вещи под покрывалом', /class="col wn-arts wn-shut"><span class="wn-relic"><img src="[^"]*chambers\/art-lock\.webp/.test(h));
  fresh(); T.S.seg.profile = 'ach';
  for (const cat of ['pers', 'rev', 'myst', 'first']) {
    T.S.seg.wnach = cat; h = view(`Достижения · ${cat}`);
    const med = [...h.matchAll(/<span class="wn-fi"><img class="wn-medal" src="[^"]*chambers\/medal-([a-z]+)\.png/g)].map(m => m[1]);
    ok(`«Достижения · ${cat}»: у карточек нет медальонов`, med.length > 0);
    if (cat === 'first') ok('первенства: не венец', med.length && med.every(g => g === 'first'));
    else if (cat === 'myst') ok('тайны: не замок у скрытых', med.includes('myst'));
    else for (const g of med) ok(`«Достижения · ${cat}»: медальон «${g}» — не тема достижений`, !!W.ach.groups[g]);
  }
  fresh(); T.S.seg.profile = 'mem'; T.S.mem.skip = true; T.S.overlay = { t: 'mem', arg: '0' }; h = view('окно «одна из трёх»');
  ok('окно «одна из трёх»: нет герба', /<div class="dlg fit cb-win wn-dlg"><i class="wn-crest" aria-hidden="true"><\/i><div class="dlg-h">/.test(h));
  /* до выгрузки — ни одной ссылки на арт иконок и медальонов: вещь рисует CSS */
  const keep = T.WN_ART.icons.slice(); T.WN_ART.icons.length = 0;
  try {
    T.S.overlay = null; let all = '';
    for (const t of ['arts', 'ach']) { T.S.seg.profile = t; all += view(`до выгрузки · ${t}`); }
    ok('до выгрузки в разметке ссылки на иконки реликвария и медальоны — будет битая картинка', !/chambers\/(?:art|medal)-/.test(all));
    ok('до выгрузки нет вещи CSS в витрине', /<i class="wn-relic-c">/.test(all));
  } finally { T.WN_ART.icons.push(...keep); }
});

/* ================== 6. отклик ================== */
run('отклик', () => {
  fresh(); T.S.seg.profile = 'arts';
  const buy = W.art.list.find(a => (T.S.wn.art[a.id] == null) && a.from <= (T.S.acc.cycle) && T.S.wallet.gold >= a.gold);
  if (!buy) { say('отклик: в демо нечего купить'); return; }
  view('отклик · до');
  T.raf.length = 0; const op = 'wn' + T.S.wn.seq;
  T.ACT.wnbuy(`${buy.id}:${op}`);
  ok('покупка артефакта прошла, а частиц нет', T.raf.length >= 1);
  T.raf.length = 0; T.ACT.wnbuy(`${buy.id}:${op}`);
  ok('повтор покупки дал частицы', T.raf.length === 0);
  T.raf.length = 0; T.S.wallet.gold = 0;
  const next = W.art.list.find(a => T.S.wn.art[a.id] == null && a.from <= T.S.acc.cycle);
  if (next) { T.ACT.wnbuy(`${next.id}:wn${T.S.wn.seq}`); ok('отказ (нет золота) дал частицы', T.raf.length === 0); }
  const R = T.render; T.raf.length = 0;
  fresh(); const L = T.S.look, fr = T.S.look.frame;
  T.ACT.lkset(`frame:${fr}:lk${L.seq}`);   // та же рамка — отказа нет, но и «сервер» не отказал: операция прошла
  ok('облик: смена прошла, а частиц нет', T.raf.length >= 1);
  void R;
});

/* ================== 7. вёрстка ================== */
const LAY = [];   // числа кадров для каскада (7б): ширина правой части, книга пятёрки
run('вёрстка', () => {
  const flat = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
  const IH = flat(html), WN = flat(CSS.wn), CB = flat(CSS.cb);
  const px = (src, re, what) => { const m = src.match(re); if (!m) { say(`вёрстка: в стилях нет ${what}`); return NaN; } return +m[1]; };
  const frames = [{ n: '932 × 430', w: 932, h: 430, top: 46, rail: 78 }, { n: '844 × 390', w: 844, h: 390, top: 44, rail: 72 }];
  ok('вёрстка: кадры игры не 932 × 430 и 844 × 390', /\.g\{--top:46px;--rail:78px;[^}]*width:932px;height:430px/.test(IH) && /\.g\.sm\{width:844px;height:390px;--top:44px;--rail:72px\}/.test(IH));
  const spM = px(IH, /--sp-m:(\d+)px/, 'поля экрана --sp-m'), spS = px(IH, /--sp-s:(\d+)px/, 'шага --sp-s');
  const V = T.CB_VIEW, A = T.CB_ART;
  frames.forEach((F, k) => {
    const main = [F.w - F.rail - 2 * spM, F.h - F.top - 2 * spM];
    const low = F.h - F.top <= 360;   // @container main (max-height: 360px)
    const i = low ? 1 : 0;
    ok(`вёрстка ${F.n}: кадр попал не в свою пару чисел`, i === k);
    /* колонка: ниша (проём арки + портрет + имя + уровень) и постамент (карниз, опыт, клан, две строки кнопок) */
    const idw = V.id[i], nicheTop = Math.round(idw * A.niche.px[1] / A.niche.px[0] * A.niche.top / 1000) + 2;
    const nameH = Math.ceil([20, 18][i] * 1.05), levelH = 19, gap = 3;
    const btnH = px(WN, /\.wn-ibs \.btn\{[^}]*min-height:(\d+)px/, 'высоты кнопок постамента') - (i ? 2 : 0);
    const plinth = V.ledge[i] + 8 + 31 + 6 + 14 + 6 + (2 * btnH + 6) + (i ? 8 : 10);
    const need = nicheTop + V.ava[i] + gap + nameH + gap + levelH + plinth;
    ok(`вёрстка ${F.n}: колонке нужно ${need} px, есть ${main[1]}`, need <= main[1]);
    const inner = Math.floor(idw * (A.niche.arch[1] - A.niche.arch[0]) / 1000);
    ok(`вёрстка ${F.n}: портрет ${V.ava[i]} px шире проёма ниши ${inner} px`, V.ava[i] <= inner);
    const bw2 = (idw - 20 - 6) / 2;
    ok(`вёрстка ${F.n}: кнопка постамента ${bw2.toFixed(0)} px — уже 84`, bw2 >= 84);
    rep.push(`${F.n}: колонка ${idw} px — ниша с портретом ${nicheTop + V.ava[i] + nameH + levelH + 2 * gap} px, постамент ${plinth} px, всего ${need} из ${main[1]}`);
    /* правая часть */
    const rw = main[0] - idw - spM, rh = main[1];
    /* «Обзор»: пятёрка на карнизе и рейтинги 3 × 2 */
    const rkH = px(WN, /\.wn-wk \.rk\{[^}]*min-height:(\d+)px/, 'высоты таблички рейтинга'), rows = Math.ceil(T.S.ranks.length / V.ranks);
    const wk = 16 + 6 + rows * rkH + (rows - 1) * 6;
    const shelf = rh - spS - wk - V.plate[i] - 6, cq = shelf - V.ledge[i];
    const book = Math.min((rw - 16 - 40) / 5, (cq - 10) * 9 / 16);
    ok(`вёрстка ${F.n}: книга пятёрки ${book.toFixed(0)} px — уже 80`, book >= 80);
    const rkw = (rw - 6 * (V.ranks - 1)) / V.ranks;
    ok(`вёрстка ${F.n}: табличка рейтинга ${rkw.toFixed(0)} px — уже 150`, rkw >= 150);
    rep.push(`${F.n}: «Обзор» — книга ${book.toFixed(0)} × ${(book * 16 / 9).toFixed(0)} px на карнизе, табличка рейтинга ${rkw.toFixed(0)} × ${rkH} px`);
    LAY[i] = { n: F.n, rw, book };
    /* «Память»: зеркало — рама по ‰ угла, пять мест в стекле */
    const foot = 32, mh = rh - spS - foot, mb = V.mc[i] * A.mirror.frame[0] / 1000, mhz = V.mc[i] * A.mirror.frame[1] / 1000;
    const glassW = rw - 2 * mhz, glassH = mh - 2 * mb, slotW = (glassW - 8) / 5, slotH = glassH - 12;
    const ico = i ? 50 : 58, openNeed = 12 + ico + 3 + 5 + Math.ceil(2 * [15, 14][i] * 1.08) + 5 + 14 + 5 + 4 + 28;
    ok(`вёрстка ${F.n}: место Памяти ${slotW.toFixed(0)} px — уже 80`, slotW >= 80);
    ok(`вёрстка ${F.n}: открытому месту нужно ${openNeed} px, в стекле ${slotH.toFixed(0)}`, openNeed <= slotH);
    ok(`вёрстка ${F.n}: табличка ${V.plate[i]} px не входит в верхнюю раму ${mb.toFixed(0)} px`, V.plate[i] <= mb + 2);
    rep.push(`${F.n}: «Память» — зеркало ${rw} × ${mh} px, рама ${mb.toFixed(0)} / ${mhz.toFixed(0)}, место ${slotW.toFixed(0)} × ${slotH.toFixed(0)}, открытому нужно ${openNeed}`);
    /* «Артефакты»: две витрины в ряд */
    const cw = (rw - 4 - 10) / 2;
    ok(`вёрстка ${F.n}: витрина реликвария ${cw.toFixed(0)} px — уже 240`, cw >= 240);
    rep.push(`${F.n}: «Артефакты» — витрина ${cw.toFixed(0)} px, текст рядом с вещью ${(cw - 22 - 74).toFixed(0)} px`);
  });
  ok('wanderer.css: витрины реликвария не по две в ряд', /\.wn-arts>\.wn-grid\.three\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(WN));
  ok('wanderer.css: пятёрка — не по ширине пятой части и высоте карниза', /--bw:min\(calc\(\(100cqw - 40px\) \/ 5\),calc\(\(100cqh - 10px\) \* 9 \/ 16\)\)/.test(WN));
  ok('chambers.css: низкий кадр не меняет числа колонки', /@container main \(max-height: 360px\)\{ \.g-main\[data-route="profile"\] \.scr\{--cb-idw:var\(--cb-id1/.test(CB));
});

/* ================== 7б. каскад: чужие правила не ломают вещи раздела ================== */
/* Расчёт вёрстки (7) верит своим стилям, а ломают их чужие правила с тем же элементом: так пятёрка вылезла на колонку (потолок ряда
   книг :where(.sq-slots):has(>.hb) — 420 px из book.css), а табличка «Память Странника» переносилась (.g h2 — text-wrap: balance).
   Здесь — маленький каскад без браузера: разметка из песочницы — деревом, стили index.html и всех подключённых файлов — по порядку
   документа; у свойства побеждает !important, затем вес селектора, затем позднее правило. Правила «меньше движения» не в счёт,
   @container main (max-height: 360px) — только у кадра 844 × 390 */
run('каскад', () => {
  const noCom = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
  const top = (v, sep) => { const out = ['']; let d = 0; for (const ch of v) { if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (ch === sep && !d) out.push(''); else out[out.length - 1] += ch; } return out; };
  /* правила: селектор, объявления, обёртки @ и порядок в документе */
  const RULES = []; let order = 0;
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>|<link rel="stylesheet" href="([^"]+)">/g)) {
    const f = m[2] || 'index.html';
    if (m[2] && (/^https?:/.test(m[2]) || !fs.existsSync(path.join(UI, m[2])))) continue;
    const s = noCom(m[2] ? read(m[2]) : m[1]); const at = []; let buf = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === ';' && buf.trim().startsWith('@')) { buf = ''; continue; }
      if (ch === '{') {
        const pre = buf.trim(); buf = '';
        if (pre.startsWith('@')) { at.push(pre); continue; }
        const j = s.indexOf('}', i), decl = {};
        for (const d of top(s.slice(i + 1, j), ';')) { const c = d.indexOf(':'); if (c > 0) decl[d.slice(0, c).trim().toLowerCase()] = d.slice(c + 1).trim(); }
        if (!at.some(a => /^@(keyframes|font-face)/.test(a))) for (const sel of top(pre, ',')) if (sel.trim()) RULES.push({ f, sel: sel.trim(), decl, at: at.slice(), o: order++ });
        i = j; continue;
      }
      if (ch === '}') { at.pop(); buf = ''; continue; }
      buf += ch;
    }
  }
  ok(`каскад: правил мало (${RULES.length}) — стили не прочитаны`, RULES.length > 500);
  const frameOk = (r, low) => r.at.every(a => !/prefers-reduced-motion|print/.test(a) && (!/@container\s+main\s*\(max-height:\s*360px\)/.test(a) || low));
  /* дерево разметки */
  const tree = h => {
    const root = { tag: '#root', cls: new Set(), attrs: {}, kids: [], up: null }; let cur = root;
    const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'wbr', 'area', 'col', 'embed', 'track']);
    for (const m of h.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?)>/g)) {
      const [, close, t0, rest, self] = m, tag = t0.toLowerCase();
      if (close) { let n = cur; while (n && n.tag !== tag) n = n.up; if (n && n.up) cur = n.up; continue; }
      const attrs = {}; for (const a of rest.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = a[2] == null ? '' : a[2];
      const node = { tag, cls: new Set((attrs.class || '').split(/\s+/).filter(Boolean)), attrs, kids: [], up: cur };
      cur.kids.push(node);
      if (!self && !VOID.has(tag)) cur = node;
    }
    return root;
  };
  const doc = (h, low) => tree(`<html class="${[...T.rootCls].join(' ')}"><body><div id="game" class="g${low ? ' sm' : ''}">${h}</div></body></html>`);
  const find = (n, pred, all = []) => { if (n.tag !== '#root' && pred(n)) all.push(n); for (const k of n.kids) find(k, pred, all); return all; };
  /* селекторы: составные части, совпадение, вес */
  const parts = sel => {
    const out = []; let cur = '', d = 0, pend = null;
    for (const ch of sel.trim()) {
      if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') d--;
      if (!d && /[\s>+~]/.test(ch)) { if (cur) { out.push(cur); cur = ''; pend = ' '; } if (!/\s/.test(ch)) pend = ch; continue; }
      if (pend && out.length) out.push(pend); pend = null; cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  };
  const pseudo = (s, i) => { const m = /^(::?)([a-zA-Z-]+)(\()?/.exec(s.slice(i)); let j = i + m[0].length, arg = null; if (m[3]) { let d = 1, k = j; while (k < s.length && d) { if (s[k] === '(') d++; else if (s[k] === ')') d--; k++; } arg = s.slice(j, k - 1); j = k; } return { el: m[1] === '::' || /^(before|after)$/.test(m[2]), name: m[2], arg, end: j }; };
  const compound = (n, c) => {
    for (let i = 0; i < c.length;) {
      const ch = c[i];
      if (ch === '.' || ch === '#') { const m = /^[.#]([\w-]+)/.exec(c.slice(i)); if (ch === '.' ? !n.cls.has(m[1]) : n.attrs.id !== m[1]) return false; i += m[0].length; }
      else if (ch === '[') { const j = c.indexOf(']', i), m = /^\[([\w-]+)(?:([~^*]?=)"?([^"\]]*)"?)?\]$/.exec(c.slice(i, j + 1)); i = j + 1; if (!m) return false; const v = n.attrs[m[1]]; if (v == null) return false;
        if ((m[2] === '=' && v !== m[3]) || (m[2] === '~=' && !v.split(/\s+/).includes(m[3])) || (m[2] === '^=' && !v.startsWith(m[3])) || (m[2] === '*=' && !v.includes(m[3]))) return false; }
      else if (ch === ':') {
        const p = pseudo(c, i); i = p.end;
        if (p.el) return false;                                            // правило псевдоэлемента — не самого элемента
        if (p.name === 'where' || p.name === 'is') { if (!top(p.arg, ',').some(s => matches(n, s))) return false; }
        else if (p.name === 'not') { if (top(p.arg, ',').some(s => matches(n, s))) return false; }
        else if (p.name === 'has') { if (!top(p.arg, ',').some(s => { const r = s.trim(), kid = r[0] === '>', q = kid ? r.slice(1) : r; const walk = x => x.kids.some(k => matches(k, q) || (!kid && walk(k))); return walk(n); })) return false; }
        else if (p.name === 'last-child') { if (n.up.kids[n.up.kids.length - 1] !== n) return false; }
        else if (p.name === 'first-child') { if (n.up.kids[0] !== n) return false; }
        else if (/^(hover|focus|focus-visible|focus-within|active|checked|disabled|empty|target)$/.test(p.name)) return false;
      }
      else if (/[a-zA-Z]/.test(ch)) { const m = /^[a-zA-Z][\w-]*/.exec(c.slice(i)); if (n.tag !== m[0].toLowerCase()) return false; i += m[0].length; }
      else i++;
    }
    return true;
  };
  const PC = new Map();
  const matches = (n, sel) => {
    let p = PC.get(sel); if (!p) PC.set(sel, (p = parts(sel)));
    if (!p.length || !compound(n, p[p.length - 1])) return false;
    const up = (x, k) => {
      if (k === 0) return true;
      const comb = p[k - 1], c = p[k - 2];
      if (comb === '>') return !!x.up && x.up.tag !== '#root' && compound(x.up, c) && up(x.up, k - 2);
      if (comb === ' ') { for (let u = x.up; u && u.tag !== '#root'; u = u.up) if (compound(u, c) && up(u, k - 2)) return true; return false; }
      const sib = x.up ? x.up.kids : [], at = sib.indexOf(x);
      if (comb === '+') return at > 0 && compound(sib[at - 1], c) && up(sib[at - 1], k - 2);
      for (let j = at - 1; j >= 0; j--) if (compound(sib[j], c) && up(sib[j], k - 2)) return true;
      return false;
    };
    return up(n, p.length - 1);
  };
  const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  const weight = sel => {
    let a = 0, b = 0, c = 0;
    for (let i = 0; i < sel.length;) {
      const ch = sel[i];
      if (ch === '#' || ch === '.') { if (ch === '#') a++; else b++; i++; while (i < sel.length && /[\w-]/.test(sel[i])) i++; }
      else if (ch === '[') { b++; i = sel.indexOf(']', i) + 1; }
      else if (ch === ':') { const p = pseudo(sel, i); i = p.end; if (p.el) c++; else if (p.name === 'where') { /* вес 0 */ } else if (/^(is|not|has)$/.test(p.name)) { const w = top(p.arg, ',').map(s => weight(s.trim().replace(/^[>+~]\s*/, ''))).reduce((x, y) => (cmp(y, x) > 0 ? y : x), [0, 0, 0]); a += w[0]; b += w[1]; c += w[2]; } else b++; }
      else if (/[a-zA-Z]/.test(ch)) { c++; while (i < sel.length && /[\w-]/.test(sel[i])) i++; }
      else i++;
    }
    return [a, b, c];
  };
  /* победитель среди объявлений свойств одной длинной формы (props — синонимы и сокращения) */
  const win = (n, props, low) => {
    let best = null;
    for (const r of RULES) {
      const k = props.find(q => r.decl[q] != null); if (!k || !frameOk(r, low) || !matches(n, r.sel)) continue;
      const raw = r.decl[k], imp = /!important/.test(raw), c = { p: k, v: raw.replace(/\s*!important/, '').trim(), imp, w: weight(r.sel), o: r.o, f: r.f, sel: r.sel };
      if (!best || (c.imp && !best.imp) || (c.imp === best.imp && (cmp(c.w, best.w) > 0 || (cmp(c.w, best.w) === 0 && c.o > best.o)))) best = c;
    }
    return best;
  };
  /* значение в px: var() — от узла вверх (переменная считается там, где объявлена), calc() и min() — арифметикой px */
  const varOf = (n, name, low) => { for (let u = n; u && u.tag !== '#root'; u = u.up) { const w = win(u, [name], low); if (w) return expand(u, w.v, low); } return null; };
  const expand = (n, v, low) => v.replace(/var\((--[\w-]+)(?:,\s*([^)]*))?\)/g, (s, name, dflt) => { const x = varOf(n, name, low); return x != null ? x : (dflt || 'NaN'); });
  const pxOf = (n, v, low) => {
    let e = expand(n, v, low).replace(/calc\(/g, '(');
    e = e.replace(/min\(([^()]*)\)/g, (s, a) => String(Math.min(...a.split(',').map(x => (/%/.test(x) ? Infinity : parseFloat(x))))));
    if (/%/.test(e) || /^(none|auto|max-content|fit-content)$/.test(e.trim())) return Infinity;
    e = e.replace(/(-?[\d.]+)px/g, '$1');
    return /^[\d.\s+\-*/()eInfity]+$/.test(e) ? Function(`return (${e})`)() : NaN;
  };
  /* сторона k (0 — верх, 1 — право, 2 — низ, 3 — лево) из сокращения: padding и border-width — до четырёх значений, border и
     border-bottom — толщина среди стиля и цвета */
  const side = (w, k) => {
    if (!w) return null;
    const t = top(w.v.replace(/\s+/g, ' ').trim(), ' ').filter(Boolean);
    if (/^border(-bottom|-top|-left|-right)?$/.test(w.p)) return t.find(x => /^-?[\d.]+(px)?$|^calc\(|^var\(|^min\(/.test(x)) || '0px';
    if (!/^(padding|border-width)$/.test(w.p)) return w.v;
    return t.length === 1 ? t[0] : t.length === 2 ? t[k % 2] : t.length === 3 ? t[k === 3 ? 1 : k] : t[k];
  };

  /* 1. пятёрка: ряд книг помещается в полке — потолок ряда из чужих правил не меньше ряда */
  const gap = +(CSS.wn.match(/\.wn-shelf>\.sq-slots\{[^}]*gap:(\d+)px/) || [0, NaN])[1];
  ok('каскад: у ряда пятёрки нет своего зазора между книгами', gap > 0);
  LAY.forEach((L, i) => {
    fresh(); const d = doc(view(`каскад · Обзор ${L.n}`), i === 1);
    const row = find(d, n => n.cls.has('sq-slots') && n.up.cls.has('wn-shelf'))[0];
    if (!row) { say(`каскад ${L.n}: на «Обзоре» нет ряда книг на карнизе`); return; }
    const place = L.rw - 16, need = 5 * L.book + 4 * gap;
    const mw = win(row, ['max-width'], i === 1), wd = win(row, ['width', 'inline-size'], i === 1);
    const capM = mw ? pxOf(row, mw.v, i === 1) : Infinity, capW = wd ? pxOf(row, wd.v, i === 1) : Infinity, cap = Math.min(place, capM, capW);
    ok(`каскад ${L.n}: пятёрка ${need.toFixed(0)} px шире своего места ${cap.toFixed(0)} px — ряд вылезет на колонку Странника` +
      (capM < need ? ` (потолок max-width ${mw.v} — ${mw.sel} из ${mw.f})` : '') + (capW < need ? ` (ширина ${wd.v} — ${wd.sel} из ${wd.f})` : ''), need <= cap + 0.5);
    rep.push(`${L.n}: пятёрка — ряд ${need.toFixed(0)} px в полке ${place.toFixed(0)} px, потолок ряда ${Number.isFinite(capM) ? capM + ' px' : 'снят'}`);
  });
  /* 2. таблички заголовков — одна строка: перенос строк у таблички не перебит чужим правилом заголовков */
  for (const t of ['over', 'mem', 'arts']) {
    fresh(); T.S.seg.profile = t;
    for (const [i, low] of [[0, false], [1, true]]) {
      const d = doc(view(`каскад · табличка ${t}`), low);
      const pl = find(d, n => n.cls.has('wn-plt'));
      if (!pl.length) { say(`каскад: во вкладке ${t} нет таблички`); continue; }
      for (const n of pl) {
        const w = win(n, ['white-space', 'text-wrap', 'text-wrap-mode'], low);
        const one = w && (w.p === 'white-space' ? /^(nowrap|pre)$/.test(w.v) : /^nowrap/.test(w.v));
        ok(`каскад ${LAY[i] ? LAY[i].n : ''}: табличка во вкладке ${t} переносит строки — побеждает ${w ? `${w.p}: ${w.v} (${w.sel} из ${w.f})` : 'перенос по умолчанию'}`, one);
      }
    }
  }
  /* 3. окна: поля шапки, тела и низа отступают от серебряных уголков; у листа без низа тело кончается над нижним уголком */
  const args = { mem: '0', wnp: W.passives[0].id, wnart: W.art.list[0].id, wnfeat: W.ach.list[0].id, pp: 'Тихий ветер|friends', pphero: 'Тихий ветер|0|friends', ppreport: 'Тихий ветер|friends', ppblock: 'Тихий ветер|friends', ppunf: 'Тихий ветер|friends', letter: (T.S.soc && T.S.soc.read[0] || {}).id || '', write: '' };
  let wins = 0, minGap = Infinity;
  for (const k of T.CB_WINS) for (const low of [false, true]) {
    fresh(); T.S.seg.profile = 'mem'; T.S.mem.skip = true; T.S.overlay = { t: k, arg: args[k] != null ? args[k] : '' };
    const d = doc(view(`каскад · окно ${k}`), low), w = find(d, n => n.cls.has('cb-win'))[0];
    if (!w) { say(`каскад: окно ${k} без материала покоев`); continue; }
    const dlg = w.cls.has('dlg'), cn = pxOf(w, 'var(--cb-cn)', low), co = pxOf(w, 'var(--cb-co)', low), reach = cn - co;
    ok(`каскад: окно ${k} — размер уголка не задан (--cb-cn ${cn}, --cb-co ${co})`, cn > 0 && co >= 0);
    const rows = w.kids.filter(n => [...n.cls].some(c => /^(sheet|dlg)-[hbf]$/.test(c)));
    ok(`каскад: окно ${k} — нет шапки или тела`, rows.some(n => n.cls.has(dlg ? 'dlg-h' : 'sheet-h')) && rows.some(n => n.cls.has(dlg ? 'dlg-b' : 'sheet-b')));
    for (const r of rows) for (const [sideK, props] of [[3, ['padding', 'padding-left', 'padding-inline', 'padding-inline-start']]].concat(dlg ? [[1, ['padding', 'padding-right', 'padding-inline', 'padding-inline-end']]] : [])) {
      const v = side(win(r, props, low), sideK), pad = v == null ? 0 : pxOf(r, v, low), g = pad - reach;
      minGap = Math.min(minGap, g);
      ok(`каскад: окно ${k} (${low ? '844' : '932'}) — ${[...r.cls][0]} ${sideK === 3 ? 'слева' : 'справа'} ${pad} px, уголок заходит на ${reach} px: зазор ${g} px меньше 8`, g >= 8);
    }
    const last = rows[rows.length - 1];
    if (!dlg && last && last.cls.has('sheet-b')) {
      const bb = side(win(last, ['border', 'border-bottom', 'border-bottom-width', 'border-width'], low), 2), h = bb == null ? 0 : pxOf(last, bb, low);
      ok(`каскад: лист ${k} без низа — тело кончается ${h} px над краем, нижний уголок ${Math.round(cn * 98 / 96)} px: строки уйдут под уголок`, h >= cn * 98 / 96 + 4);
    }
    wins++;
  }
  ok(`каскад: окон проверено ${wins} — мало`, wins >= 2 * 20);
  /* поля считаются от --cb-cn и --cb-co — значит, и уголки стоят по ним: у рамки листа и за край окна на --cb-co */
  const CBF = noCom(CSS.cb).replace(/\s+/g, ' ');
  ok('chambers.css: уголки листа стоят не у рамки или не размером --cb-cn — поля от них не отступят', /html\.cb-c \.sheet\.cb-win::before\{[^}]*inset:0 auto 0 0;[^}]*width:var\(--cb-cn\);[^}]*var\(--cb-ctl\) 0 0\/var\(--cb-cn\) auto no-repeat,var\(--cb-cbl\) 0 100%\/var\(--cb-cn\) auto no-repeat/.test(CBF));
  ok('chambers.css: уголки окна стоят не за краем на --cb-co или не размером --cb-cn — поля от них не отступят', /html\.cb-c \.dlg\.fit\.cb-win::before\{inset:calc\(var\(--cb-co\) \* -1\);[^}]*var\(--cb-ctl\) 0 0\/var\(--cb-cn\) auto no-repeat,var\(--cb-ctr\) 100% 0\/var\(--cb-cn\) auto no-repeat,var\(--cb-cbl\) 0 100%\/var\(--cb-cn\) auto no-repeat,var\(--cb-cbr\) 100% 100%\/var\(--cb-cn\) auto no-repeat/.test(CBF));
  rep.push(`окна: поля от серебряных уголков — не меньше ${minGap} px во всех ${T.CB_WINS.length} окнах на обоих кадрах`);
});

/* ================== 8. режим «Игрок»: вкладки и окна ================== */
run('режим «Игрок»', () => {
  for (const team of [false, true]) {
    T.setTeam(team);
    for (const t of ['over', 'mem', 'arts', 'ach', 'chron']) { fresh(); T.S.seg.profile = t; view(`${team ? 'команда' : 'игрок'} · ${t}`); }
    fresh();
    for (const k of ['settings', 'level', 'look', 'friends', 'inbox', 'chat', 'memreset', 'wncat', 'wnpas', 'wnfame', 'lksex']) { T.S.overlay = { t: k }; view(`${team ? 'команда' : 'игрок'} · окно ${k}`); }
  }
  T.setTeam(false);
});

/* ================== 9. UI-кит и сценарий ================== */
run('UI-кит', () => {
  ok('UI-кит: нет раздела «Странник: покои и вещи»', T.KIT_EXTRA.some(x => x.html === T.cbKitHtml));
  const k = look('UI-кит · покои', T.cbKitHtml());
  ok('UI-кит: не пять залов', (k.match(/class="cb-kh-p" data-hall="/g) || []).length === 5);
  ok('UI-кит: нет медальонов тем', (k.match(/<figure class="cb-km">/g) || []).length === Object.keys(W.ach.groups).length + 2);
  ok('UI-кит: нет вещей реликвария', (k.match(/<figure class="cb-kr">/g) || []).length === W.art.list.length + 1);
  ok('UI-кит: нет зеркала и ниши', k.includes('class="cb-kmir-p"') && k.includes('class="cb-kn-p"'));
  const f = T.FLOWS.find(x => x[0] === 'Странник · покои');
  ok('сценарий «Странник · покои» не заведён', !!f);
  if (f) { fresh(); run('сценарий', () => f[2]()); ok('сценарий «Странник · покои» ведёт не в «Обзор»', T.S.route === 'profile' && T.S.seg.profile === 'over'); view('сценарий «Странник · покои»'); }
});

console.log(`Разметок проверено: ${drawn}.`);
for (const x of rep) console.log('вёрстка · ' + x);
done();

function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log('Проверка пройдена: у каждой вкладки «Странника» свой зал покоев, окна раздела — в материале покоев, вещи вкладок — из своего арта (до выгрузки — CSS), отклик — только на прошедшую операцию, колонка, пятёрка, зеркало и реликварий помещаются на 932 × 430 и 844 × 390, игроку служебного не видно.');
  process.exit(0);
}
