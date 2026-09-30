/* Автопроверка книги рецептов Мастерской на всё окно — без браузера.
   Экран — design/ui/screens/recipe-book.js и recipe-book.css; сервер книги — WS_SRV.book и WS_SRV.seen (screens/craft.js); правила — GDD §12.
   Слово автора 30.09.2026: цельный рецепт — ровный лист древней бумаги узкой полосой; найденный частично — неровные квадратные обрывки,
   на них найденный ресурс; итог справа с названием, «если конечно игрок его нашёл, если же нет очевидно справа скомканная бумага»; без
   смятых клочков; книгу «открываем на всё окно… а не справой стороны». Бумагу «слишком высокую, а после сузил» — такого быть не должно.
   1. Файлы: recipe-book.js и recipe-book.css подключены после craft.js и craft.css; синтаксис; концы строк — CRLF; классы rb-* из JS
      описаны в CSS; ключевые кадры — только transform и opacity; «меньше движения» выключает движение; флаги <html> — не классы элементов.
   2. Арт: пути RB_ART.ready — на диске, размер в RB_ART — как у файла. Ничего не тянется неравномерно: ширина листа — высота × px его
      картинки, пропорции элемента — те же px, фон листа и книги — 100 % × 100 % только у элемента с пропорциями рисунка, обрывки — contain.
   3. Раскладка: на каждом листе помещается содержимое его наибольшего числа ингредиентов, обрывков до шести — тоже; на 932 × 430 и
      844 × 390 книга в окне, значок не мельче 24 px, на странице видно не меньше трёх записей; числа — в отчёте.
   4. Состояния: лист по числу ингредиентов; ингредиенты с количеством, стрелка «Создать» и нажатие на лист — автодокрафт, итог с
      названием справа; можно создать, не хватает, этап не найден, герой уже есть; обрывки: найденный — значок и «×?», ненайденный — «?»;
      итог найден — значок и название, нет — «?» без названия; «без количеств»; найденное игроком помнится.
   5. Утечки: название рецепта с ненайденным итогом не видно нигде — ни в книге, ни у стола, ни в итоге попытки, ни в карточке ресурса;
      фильтр вида его не показывает, поиск по названию его не находит.
   6. Действия: вкладки, вид, избранное, поиск, сброс, «На стол», «Создать» — лист автодокрафта над книгой; крестик и Esc; обрывок из
      карточки ресурса; порции; пустая книга; на других экранах слоя нет. Строки игрока — без служебных слов.
   7. UI-кит и сценарий презентации.
   Запуск: node tools/content-gen/screens/check_recipe_book.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { strip, playerText, SERVICE } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html'), JS = read('screens/recipe-book.js'), CSS = read('screens/recipe-book.css');
const err = [], warn = [], rep = [];
let drawn = 0;
const ok = (label, c) => { if (!c) err.push(label); };
const eq = (label, a, b) => { if (a !== b) err.push(`${label}: ожидалось ${JSON.stringify(b)}, получено ${JSON.stringify(a)}`); };
const flat = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
const C = flat(CSS);

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const order = scripts.map(s => s.src || ''), links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
ok('index.html: не подключён screens/recipe-book.js после craft.js', order.indexOf('screens/recipe-book.js') > order.indexOf('screens/craft.js') && order.indexOf('screens/craft.js') >= 0);
ok('index.html: не подключён screens/recipe-book.css после craft.css', links.indexOf('screens/recipe-book.css') > links.indexOf('screens/craft.css') && links.indexOf('screens/craft.css') >= 0);
try { new vm.Script(JS, { filename: 'recipe-book.js' }); } catch (e) { err.push('синтаксис recipe-book.js: ' + e.message); }
for (const [f, t] of [['recipe-book.js', JS], ['recipe-book.css', CSS]]) {
  const crlf = (t.match(/\r\n/g) || []).length, lf = (t.match(/\n/g) || []).length;
  if (crlf !== lf) err.push(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`);
}
const defined = new Set((CSS.match(/\.rb-[a-z0-9-]+/g) || []).map(s => s.slice(1)));
const FLAGS = ['rb-bk', 'rb-pp', 'rb-fr'];
/* классы — не переменные --rb-* и не начала имён ('rb-strip-' + k) */
for (const c of new Set(JS.match(/(?<![-\w])rb-[a-z0-9]+(?:-[a-z0-9]+)*(?![-\w$])/g) || [])) {
  if (FLAGS.includes(c)) continue;      // флаги <html>
  if (!defined.has(c)) err.push(`recipe-book.css: не описан класс ${c}`);
}
/* флаг «арт загружен» у <html> — не класс элемента (урок 30.09.2026, страж — check_heroes.js) */
for (const f of FLAGS) {
  ok(`recipe-book.js: флаг <html> ${f} стоит классом элемента`, !new RegExp(`class="[^"]*\\b${f}\\b`).test(JS));
  ok(`recipe-book.css: стиль ложится на сам <html> — «.${f}» без предка`, !new RegExp(`(^|[},])\\s*\\.${f}\\s*[{,:]`).test(C));
}
/* ключевые кадры — только transform и opacity; «меньше движения» — без движения */
{
  const kf = [...CSS.matchAll(/@keyframes\s+(rb-[a-z0-9-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
  ok('recipe-book.css: ключевые кадры не найдены', kf.length >= 3);
  for (const [, name, body] of kf) {
    const bad = [...body.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]).filter(p => p !== 'transform' && p !== 'opacity');
    if (bad.length) err.push(`@keyframes ${name}: анимирует не только transform и opacity — ${[...new Set(bad)].join(', ')}`);
  }
  const used = new Set([...CSS.matchAll(/animation:\s*(rb-[a-z0-9-]+)/g)].map(m => m[1])), have = new Set(kf.map(m => m[1]));
  for (const u of used) if (!have.has(u)) err.push(`recipe-book.css: анимация ${u} без ключевых кадров`);
  ok('recipe-book.css: «меньше движения» не выключает движение книги', /@media \(prefers-reduced-motion:reduce\)\{ ?\.rb,\.rb \*/.test(C));
}
if (err.length) done();

/* ================== 2. арт: файлы и пропорции ================== */
/* размер WebP по заголовку: VP8X, VP8L, VP8 */
function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const ch = buf.toString('ascii', 12, 16);
  if (ch === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (ch === 'VP8L') { const b = buf.readUInt32LE(21); return [1 + (b & 0x3fff), 1 + ((b >>> 14) & 0x3fff)]; }
  if (ch === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  return null;
}

/* ================== песочница ================== */
const stubEl = id => ({ id, innerHTML: '', textContent: '', value: '', style: { setProperty() {} }, dataset: {}, children: [],
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x,
  insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 });
const els = {}, handlers = {}, rootCls = new Set(), rootVars = {};
const root = stubEl('html');
root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle() {}, contains: c => rootCls.has(c) };
root.style = { setProperty: (k, v) => { rootVars[k] = v; } };
const document = { readyState: 'loading', addEventListener: (t, f) => { (handlers[t] = handlers[t] || []).push(f); }, getElementById: id => (els[id] = els[id] || stubEl(id)),
  querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: root,
  activeElement: null, fonts: null, baseURI: 'http://localhost/' };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1, URL,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { (/^screens\/(?!craft|model|recipe-book)/.test(s.src || '') ? warn : err).push(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
vm.runInContext(`globalThis.__rb = {
  get S() { return S; }, reset() { S = initialState(); S.route = 'craft'; S.seg.craft = 'work'; },
  html() { render(); return document.getElementById('game').innerHTML; },
  ACT, BAG, WS_DATA, WS_SRV, RSI, rsHas, wsHeroNeed, wsSetTable, wsPlan, wsQty, FLOWS, EN_RECIPES, KIT_EXTRA, CR_VIEW,
  RB_VIEW, RB_ART, rbLen, rbAlt, rbKitHtml, rbVars, overlay,
};`, ctx);
const T = win.__rb, A = T.ACT, R = T.EN_RECIPES, V = T.RB_VIEW, ART = T.RB_ART;
const q = id => T.BAG.qty(id);

/* что игрок видеть не должен — как в check_craft.js: спойлеры цикла VI, обоснования рецептов, будущие биомы и боссы (§12.5) */
const legit = R.items.filter(i => !i.team).map(i => i.n + '\n' + i.lore).concat(R.recipes.filter(r => !r.team).map(r => r.n)).join('\n');
const leaks = [
  ...R.items.filter(i => i.team).map(i => ['спойлер цикла VI', i.n]),
  ...R.recipes.filter(r => r.team).map(r => ['спойлер цикла VI', r.n]),
  ...R.recipes.map(r => ['обоснование рецепта (для команды)', r.why.slice(0, 40)]),
  ...R.items.filter(i => i.opens).map(i => ['что откроет предмет (§12.5)', i.opens]),
  ...R.places.map(p => ['крафтовый биом до активации (§12.5)', p.n]),
].filter(([, s]) => s && !legit.includes(s));
const seenSvc = new Set();
function look(label, h) {
  drawn++;
  if (typeof h !== 'string' || !h) { err.push(label + ': пустая разметка'); return ''; }
  const bad = h.match(/undefined|NaN|\[object /);
  if (bad) err.push(`${label}: в разметке «${bad[0]}» — …${h.slice(Math.max(0, bad.index - 90), bad.index + 30).replace(/\s+/g, ' ')}…`);
  const dup = h.match(/<[a-z]+\b[^>]*?\s(style|class)="[^"]*"[^>]*?\s\1="/);
  if (dup) err.push(`${label}: в теге дважды ${dup[1]} — ${dup[0].slice(0, 120)}`);
  for (const [why, s] of leaks) if (h.includes(s)) err.push(`${label}: ${why} — «${s}»`);
  /* строки игрока: только слой книги и лист поверх — шапка и шахта под книгой чужие */
  const i = h.indexOf('<div class="rb"'), part = i < 0 ? h.slice(Math.max(0, h.indexOf('<main'))) : h.slice(i), v = strip(part);
  const txt = playerText(part).split('\n').concat([...v.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => m[1]));
  for (const t of txt) for (const [what, re] of SERVICE) {
    const k = what + '|' + t; if (!re.test(t) || seenSvc.has(k)) continue;
    seenSvc.add(k); err.push(`${label}: игроку видно служебное (${what}) — «${t.slice(0, 100)}»`);
  }
  return h;
}
const view = label => look(label, T.html());
function scene(label, f) {
  try { f(); }
  catch (e) { err.push(`${label}: исключение — ${e.message}\n    ${(e.stack || '').split('\n').slice(1, 4).join('\n    ')}`); }
}
/* записи книги в разметке: data-rid → кусок разметки записи */
function entries(h) {
  const out = {}, re = /<div class="ws-rc rb-e (rb-w|rb-p)"/g, idx = [];
  let m; while ((m = re.exec(h))) idx.push([m.index, m[1]]);
  idx.forEach(([a, k], i) => {
    const seg = h.slice(a, i + 1 < idx.length ? idx[i + 1][0] : h.indexOf('</div></div></section>', a) > 0 ? h.indexOf('</div></div></section>', a) : h.length);
    const rid = (seg.match(/data-rid="([^"]+)"/) || [])[1];
    const part = (a2, b2) => { const x = seg.indexOf(a2); if (x < 0) return ''; const y = b2 ? seg.indexOf(b2, x) : seg.length; return seg.slice(x, y < 0 ? seg.length : y); };
    out[rid] = { kind: k, seg, len: (seg.match(/data-len="([sml])"/) || [])[1], st: (seg.match(/data-st="([a-z]+)"/) || [])[1],
      ing: part('<span class="rb-in">', '<button class="rb-go"'), out: part('<span class="rb-out">', '<button class="rb-star"'), go: part('<button class="rb-go"', '</button>') };
  });
  return out;
}
const bookOpen = () => { T.reset(); A.wsview('book'); };
const wells = s => (s.match(/<button class="well[^"]*" data-r="\d" data-a="wsinfo" data-v="[^"]+"/g) || []).length;
const qs = s => [...s.matchAll(/<span class="q">([^<]*)<\/span>/g)].map(m => m[1]);

/* ================== 2. арт — после песочницы: геометрия из RB_ART ================== */
scene('арт', () => {
  const art = p => path.join(UI, 'assets', 'art', p);
  for (const p of ART.ready) ok(`арт: ${p} в RB_ART.ready, а файла нет`, fs.existsSync(art(p)));
  const want = [[ART.book.img, ART.book.px]].concat(Object.values(ART.strip).map(s => [s.img, s.px]));
  for (const [p, px] of want) {
    if (!ART.ready.includes(p) || !fs.existsSync(art(p))) continue;
    const sz = webpSize(fs.readFileSync(art(p)));
    ok(`арт: ${p} — размер ${sz} не как в RB_ART (${px}): пропорции листа и книги разошлись бы с рисунком`, !!sz && sz[0] === px[0] && sz[1] === px[1]);
  }
  for (let k = 1; k <= ART.frag.n; k++) {
    const p = ART.frag.img(k), sz = fs.existsSync(art(p)) ? webpSize(fs.readFileSync(art(p))) : null;
    ok(`арт: обрывок ${p} не почти квадратный — ${sz}`, !!sz && Math.abs(sz[0] - sz[1]) <= 3);
  }
  /* три длины листа — три разные картинки: короткий короче среднего, средний короче длинного */
  const r = k => ART.strip[k].px[0] * 1000 / ART.strip[k].px[1];
  ok('арт: листы не по длине — короткий, средний, длинный', r('s') < r('m') && r('m') < r('l'));
  ok('арт: не у каждой длины своя картинка', new Set(Object.values(ART.strip).map(s => s.img)).size === 3);
  /* адреса и флаги у <html> — только выгруженному */
  for (const [k, cls, p] of [['--rb-book', 'rb-bk', ART.book.img], ['--rb-strip-l', 'rb-pp', ART.strip.l.img], ['--rb-frag-1', 'rb-fr', ART.frag.img(1)]])
    if (ART.ready.includes(p)) ok(`арт: ${k} не в переменных <html> или нет флага ${cls}`, !!rootVars[k] && rootCls.has(cls));
  /* страницы — внутри книги, левая левее правой, промежуток — корешок */
  const P = ART.book.page;
  ok('арт: поле страниц не внутри книги', [P.l, P.r].every(a => a.every(Number.isInteger) && a[0] < a[2] && a[1] < a[3] && a[0] >= 0 && a[3] <= 1000) && P.l[2] < P.r[0]);
  ok('арт: страницы разной ширины — столбцы разошлись бы со страницами', Math.abs((P.l[2] - P.l[0]) - (P.r[2] - P.r[0])) <= 2);
  /* ничего не тянется неравномерно: ширина и пропорции листа — из px его картинки, фон — во всю запись только у неё; обрывки — contain */
  ok('recipe-book.css: ширина листа не из высоты и px картинки', /\.rb-w\{[^}]*width:calc\(var\(--h\) \* var\(--aw\) \/ var\(--ah\)\)/.test(C));
  ok('recipe-book.css: пропорции листа не из px картинки', /\.rb-w\{[^}]*aspect-ratio:var\(--aw\) \/ var\(--ah\)/.test(C));
  for (const k of ['s', 'm']) ok(`recipe-book.css: лист ${k} — не свои px и картинка`, C.includes(`.rb-w[data-len="${k}"]{--aw:var(--rb-${k}w);--ah:var(--rb-${k}h);--rbp:var(--rb-strip-${k})}`));
  ok('recipe-book.css: длинный лист — не свои px и картинка', /\.rb-w\{--aw:var\(--rb-lw\);--ah:var\(--rb-lh\);--rbp:var\(--rb-strip-l\)/.test(C));
  ok('recipe-book.css: бумага листа — не рисунок во всю запись', /html\.rb-pp \.rb-w::before\{[^}]*background:var\(--rbp\) center\/100% 100% no-repeat/.test(C) && /\.rb-w::before\{[^}]*inset:0/.test(C));
  ok('recipe-book.css: книга — не в пропорциях рисунка', /\.rb-book\{[^}]*aspect-ratio:var\(--rb-bw\) \/ var\(--rb-bh\)/.test(C) && /html\.rb-bk \.rb-sp\{[^}]*var\(--rb-book\) center\/100% 100% no-repeat/.test(C));
  ok('recipe-book.css: обрывок растягивается — нужен contain в квадрате', /html\.rb-fr \.rb-f::before\{[^}]*var\(--rbf\) center\/contain no-repeat/.test(C) && /\.rb-f\{[^}]*aspect-ratio:1 \/ 1/.test(C));
  for (let k = 1; k <= ART.frag.n; k++) ok(`recipe-book.css: обрывок ${k} без картинки`, C.includes(`.rb-f[data-k="${k}"]{--rbf:var(--rb-frag-${k})}`));
  /* переменные геометрии — из RB_ART и RB_VIEW, в стилях — те же имена */
  const vars = T.rbVars();
  for (const [k, s] of Object.entries(ART.strip)) ok(`rbVars: лист ${k} — не px картинки`, vars.includes(`--rb-${k}w:${s.px[0]}`) && vars.includes(`--rb-${k}h:${s.px[1]}`));
  for (const k of Object.keys(V.lay)) { ok(`rbVars: нет --rb-${k}`, vars.includes(`--rb-${k}:${V.lay[k]}`)); ok(`recipe-book.css: раскладка не берёт --rb-${k}`, C.includes(`var(--rb-${k})`)); }
  for (const [k, v] of Object.entries(V)) if (typeof v === 'number') ok(`RB_VIEW.${k} = ${v} — не целое`, Number.isInteger(v));
  for (const [k, v] of Object.entries(V.lay)) ok(`RB_VIEW.lay.${k} = ${v} — не целое`, Number.isInteger(v));
});

/* ================== 3. раскладка: помещается ли, на 932 × 430 и 844 × 390 ================== */
scene('раскладка', () => {
  const L = V.lay, S = ART.strip, ratio = k => S[k].px[0] * 1000 / S[k].px[1];
  const frag = n => (n <= 4 ? L.frag4 : n === 5 ? L.frag5 : L.frag6);
  /* лист: поля, значки, зазоры, стрелка, итог (наименьшее место) — не шире пропорции его картинки, ‰ высоты H */
  for (const [k, max] of V.len) {
    const need = L.padl + max * L.ic + (max - 1) * L.gap + L.go + L.omin + L.padr;
    ok(`раскладка: на листе ${k} не помещается ${max} ингредиентов — нужно ${need}‰ H, лист ${Math.floor(ratio(k))}‰`, need <= ratio(k));
    rep.push(`лист ${k}: ${max} ингр. — ${need}‰ из ${Math.floor(ratio(k))}‰ высоты`);
  }
  ok('раскладка: длины листов не по числу ингредиентов 1–6', V.len.map(x => x[1]).join() === '2,4,6' && ['s', 'm', 'l'].every(k => S[k]));
  /* обрывки до шести и итог — в ширину страницы (столбец = пропорция длинного листа × H) */
  for (let n = 1; n <= 6; n++) {
    const need = n * frag(n) + (n - 1) * L.fgap + L.go + L.omin;
    ok(`раскладка: обрывки ${n} ингредиентов не помещаются — ${need}‰ H, страница ${Math.floor(ratio('l'))}‰`, need <= ratio('l'));
    ok(`раскладка: значок в обрывке на ${n} больше обрывка`, Math.min(L.ic, frag(n) * L.fic / 1000) < frag(n));
  }
  /* книга в окне: высота листа, значок, строки на странице. Шапка страниц, её зазор, поле и гаснущий край списка — из стилей */
  const px = (re, what) => { const m = C.match(re); if (!m) { err.push('раскладка: в стилях нет ' + what); return NaN; } return +m[1]; };
  const head = [px(/\.rb-q\{[^}]*height:(\d+)px/, 'высоты поиска'), px(/@container \(max-height: 400px\)\{[^@]*?\.rb-q,\.rb-kind,\.rb-favt\{height:(\d+)px\}/, 'высоты поиска низкого экрана')];
  const tabH = [px(/\.rb-tabs button\{[^}]*height:(\d+)px/, 'высоты вкладок'), px(/@container \(max-height: 400px\)\{[^@]*?\.rb-tabs button\{height:(\d+)px/, 'высоты вкладок низкого экрана')];
  const hgap = px(/\.rb-pg\{[^}]*gap:(\d+)px/, 'зазора шапки и списка'), pt = px(/\.rb-list\{--pt:(\d+)px/, 'поля списка'), fade = px(/\.rb-list\{[^}]*--fade:(\d+)px/, 'гаснущего края');
  const P = ART.book.page, bw = ART.book.px[0], bh = ART.book.px[1], g = Math.round((P.r[0] - P.l[2]) * 1000 / (P.r[2] - P.l[0]));
  [[932, 430], [844, 390]].forEach(([w, h], k) => {
    const W = Math.min(w * V.zoom / 1000, (h - 2 * V.margin) * bw / bh), H0 = W * bh / bw;
    const cw = (P.r[2] - P.l[0]) / 1000 * W, ch = (Math.min(P.l[3], P.r[3]) - Math.max(P.l[1], P.r[1])) / 1000 * H0;
    const col = (cw - cw * g / 1000) / 2, Hs = col * S.l.px[1] / S.l.px[0], icon = Hs * L.ic / 1000;
    /* видимые записи — до гаснущего края: третья должна быть видна почти целиком */
    const list = ch - Math.max(head[k], tabH[k]) - hgap, rows = (list - pt - fade + V.rowGap) / (Hs + V.rowGap);
    ok(`раскладка ${w}×${h}: книга шире или выше окна`, W <= w * V.zoom / 1000 + .5 && H0 <= h - 2 * V.margin + .5);
    ok(`раскладка ${w}×${h}: значок ${icon.toFixed(1)} px — мельче 24`, icon >= 24);
    ok(`раскладка ${w}×${h}: на странице видно ${rows.toFixed(2)} записи — меньше трёх`, rows >= 2.95);
    rep.push(`${w}×${h}: книга ${W.toFixed(0)}×${H0.toFixed(0)}, страница ${col.toFixed(0)} px, высота листа ${Hs.toFixed(1)} px, значок ${icon.toFixed(1)} px, записей на странице ${rows.toFixed(2)}`);
  });
});

/* ================== 4. состояния ================== */
scene('книга раскрыта на всё окно', () => {
  T.reset();
  let h = view('стол');
  ok('стол: нет кнопки «Книга рецептов»', /<button class="ws-bkbtn" data-a="wsview" data-v="book"[^>]*>[\s\S]*?Книга рецептов/.test(h));
  ok('стол: книга раскрыта без нажатия', !h.includes('<div class="rb"'));
  ok('стол: прежние вкладки «Стол / Книга» остались', !/data-a="wsview" data-v="table"/.test(h));
  A.wsview('book'); h = view('книга');
  const i = h.indexOf('<div class="rb"'), m = h.indexOf('</main>');
  ok('книга: слоя нет', i >= 0);
  ok('книга: слой не поверх окна — внутри рабочей области, а не после неё', i > m && m > 0);
  ok('книга: стол под книгой пропал', h.includes('class="ws-hex'));
  ok('книга: нет крестика', /<button class="rb-x" data-a="wsview" data-v="table"/.test(h));
  ok('книга: нет вкладок, поиска, вида или избранного', h.includes('data-a="wsbtab" data-v="all"') && h.includes('id="wsBookQ"') && h.includes('data-a="wsbkind"') && h.includes('data-a="wsbfav"'));
  ok('книга: вкладка не «Обрывки»', />Обрывки · \d+</.test(h));
  const book = T.WS_SRV.book(), E = entries(h);
  eq('книга: записей', Object.keys(E).length, book.length);
  eq('книга: записей с меткой ws-rc', (h.match(/class="ws-rc[ "]/g) || []).length, book.length);
  ok(`книга: вкладка «Все · ${book.length}»`, h.includes(`Все · ${book.length}`));
  ok('книга: конец списка без строки о ненайденном', h.includes('Дальше — чистые страницы'));
  ok('книга: в конце — число ненайденных рецептов', !/(?:ещё|осталось)[^<]{0,20}\d+[^<]{0,20}рецепт/i.test(h));
  /* на других экранах слоя нет, хотя книга раскрыта */
  T.S.route = 'heroes'; ok('книга: слой виден на другом экране', !view('другой экран').includes('<div class="rb"'));
  T.S.route = 'craft'; T.S.seg.craft = 'stock'; ok('книга: слой виден в «Запасах»', !view('Запасы').includes('<div class="rb"'));
  T.S.seg.craft = 'work'; ok('книга: не вернулась в Мастерскую', view('снова Мастерская').includes('<div class="rb"'));
  /* крестик и Esc */
  A.wsview('table'); ok('крестик: книга не закрылась', T.S.ws.view === 'table' && !view('закрыта').includes('<div class="rb"'));
  A.wsview('book'); const esc = { key: 'Escape', preventDefault() {} };
  (handlers.keydown || []).forEach(f => f(esc)); eq('Esc: книга не закрылась', T.S.ws.view, 'table');
  A.wsview('book'); A.wsinfo('fang'); (handlers.keydown || []).forEach(f => f(esc));
  eq('Esc при листе поверх: книга закрылась вместе с листом', T.S.ws.view, 'book');
});

scene('найден целиком: листы', () => {
  bookOpen();
  const E = entries(view('листы'));
  for (const r of T.WS_SRV.known()) {
    const e = E[r.id]; if (!e) { err.push(`лист ${r.id}: записи нет`); continue; }
    const out = T.BAG.item(r.out[0]);
    eq(`лист ${r.id}: вид записи`, e.kind, 'rb-w');
    eq(`лист ${r.id} (${r.in.length} ингр.): длина`, e.len, T.rbLen(r.in.length));
    eq(`лист ${r.id}: значков ингредиентов`, wells(e.ing), r.in.length);
    eq(`лист ${r.id}: количества на плашках`, qs(e.ing).join(), r.in.map(([, n]) => String(n)).join());
    ok(`лист ${r.id}: итог справа без названия`, e.out.includes(`<b class="rb-nm">${out.n.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')}</b>`));
    ok(`лист ${r.id}: стрелка — не «Создать»`, new RegExp(`data-a="wsmake" data-v="${r.id}"`).test(e.go));
    ok(`лист ${r.id}: нажатие на лист — не «Создать»`, new RegExp(`<button class="rb-hit" data-a="wsmake" data-v="${r.id}"`).test(e.seg));
    ok(`лист ${r.id}: нет звезды избранного`, e.seg.includes('data-a="wsfav"'));
  }
  /* по числу ингредиентов: 1–2 — короткий, 3–4 — средний, 5–6 — длинный */
  for (let n = 1; n <= 6; n++) eq(`длина листа на ${n} ингр.`, T.rbLen(n), n <= 2 ? 's' : n <= 4 ? 'm' : 'l');
  const by = n => R.recipes.find(r => !r.team && r.kind !== 'hero' && r.in.length === n);
  bookOpen(); for (let n = 1; n <= 6; n++) { const r = by(n); if (r) T.BAG.learn(r.id); }
  const E2 = entries(view('листы 1–6'));
  for (let n = 1; n <= 6; n++) { const r = by(n); if (r) eq(`лист на ${n} ингр. (${r.id})`, E2[r.id] && E2[r.id].len, n <= 2 ? 's' : n <= 4 ? 'm' : 'l'); }
});

scene('состояния листа', () => {
  bookOpen();
  let E = entries(view('состояния'));
  const st = id => E[id] && E[id].st;
  eq('Точёный клык: можно создать', st('r_p_fang'), 'ok');
  ok('Точёный клык: подпись не «создать»', /<small>создать<\/small>/.test(E.r_p_fang.go));
  eq('Слепок ловчего: этап не найден', st('r_call_fb1'), 'stop');
  ok('Слепок ловчего: подпись не «этап не найден»', /<small>этап не найден<\/small>/.test(E.r_call_fb1.go));
  /* не хватает: ключа нет — плашка ингредиента красная */
  T.BAG.take('k1_eng', q('k1_eng')); E = entries(view('не хватает'));
  eq('Зажимной каркас без ключа: не хватает', st('r_p_frame'), 'lack');
  ok('Зажимной каркас: у ключа не красная плашка', /<button class="well[^"]*ws-short[^"]*"[^>]*data-v="k1_eng"/.test(E.r_p_frame.ing));
  ok('Зажимной каркас: подпись не «не хватает»', /<small>не хватает<\/small>/.test(E.r_p_frame.go));
  /* герой: осколки собраны — «Создать» недоступно */
  T.reset(); const rid = 'r_h_c1_20';
  T.BAG.add('find_cb1', 2); T.BAG.add('cr_mold', 3); T.BAG.add('p_waxthread', 2); T.BAG.add('p_print', 1);
  T.wsSetTable([['find_cb1', 2], ['p_waxthread', 2], ['cr_mold', 3], ['p_print', 1]]); A.wstry(); A.wstrydo(); A.close();
  A.wsview('book'); E = entries(view('герой — осколки собраны'));
  eq('герой: осколки собраны', st(rid), 'own');
  ok('герой: «Создать» доступно при собранных осколках', / disabled/.test(E[rid].go) && /<button class="rb-hit"[^>]* disabled/.test(E[rid].seg));
  ok('герой: итог — не лицо героя с карточкой', /<button class="well itf face rb-ic rb-hero" data-r="\d" data-a="rhero" data-v="c1-20"/.test(E[rid].out));
  ok('герой: нет имени героя', E[rid].out.includes('Оррин Напев'));
});

scene('найден частично: обрывки', () => {
  bookOpen();
  const h = view('обрывки'), E = entries(h), D = T.WS_DATA.demo;
  for (const [rid, p] of Object.entries(D.part)) {
    const r = T.BAG.recipe(rid), e = E[rid]; if (!e) { err.push(`обрывки ${rid}: записи нет`); continue; }
    const out = T.BAG.item(r.out[0]), found = T.WS_SRV.seen(r.out[0]);
    eq(`обрывки ${rid}: вид записи`, e.kind, 'rb-p');
    eq(`обрывки ${rid}: обрывков ингредиентов`, (e.ing.match(/<span class="rb-f[ "]/g) || []).length, r.in.length);
    eq(`обрывки ${rid}: найденных — значком`, wells(e.ing), p.pos.length);
    eq(`обрывки ${rid}: ненайденных — «?»`, (e.ing.match(/<b class="rb-qm">\?<\/b>/g) || []).length, r.in.length - p.pos.length);
    ok(`обрывки ${rid}: у найденного количество не «×?» — по §12 его угадывают`, qs(e.ing).length === p.pos.length && qs(e.ing).every(x => x === '?'));
    ok(`обрывки ${rid}: стрелка — не «На стол»`, new RegExp(`data-a="wsload" data-v="${rid}"`).test(e.go) && /<small>на стол<\/small>/.test(e.go));
    /* итог: найден — значок и название справа; нет — обрывок с «?», без названия */
    if (found) ok(`обрывки ${rid}: итог найден, а справа нет значка и названия`, e.out.includes(`data-v="${out.id}"`) && e.out.includes(`<b class="rb-nm">${out.n}</b>`));
    else ok(`обрывки ${rid}: итог не найден, а справа не пустой обрывок с «?»`, /<b class="rb-qm">\?<\/b>/.test(e.out) && !e.out.includes('rb-nm') && !/class="well/.test(e.out));
    if (!found) ok(`обрывки ${rid}: видно название ненайденного итога «${r.n}»`, !h.includes(r.n) && !h.includes(out.n));
  }
  for (const id of D.seen) ok(`демо: найденного предмета ${id} нет в recipes.js`, !!T.BAG.item(id));
  ok('демо: нет обрывков и с найденным итогом, и с ненайденным',Object.keys(D.part).some(id => T.WS_SRV.seen(T.BAG.recipe(id).out[0])) && Object.keys(D.part).some(id => !T.WS_SRV.seen(T.BAG.recipe(id).out[0])));
  /* «без количеств»: все ресурсы верны — все обрывки со значком, «×?» */
  const all = Object.entries(D.part).find(([id, p]) => p.pos.length === T.BAG.recipe(id).in.length);
  ok('демо: нет обрывков «без количеств»', !!all);
  if (all) { const e = E[all[0]]; ok('без количеств: нет отметки', / data-all /.test(e.seg) && e.seg.includes('без количеств')); ok('без количеств: остался «?» у ингредиента', !/<b class="rb-qm">/.test(e.ing)); }
  /* найденное помнится: предмет пришёл — итог с названием; ушёл — название осталось */
  const U = Object.keys(D.part).find(id => !T.WS_SRV.seen(T.BAG.recipe(id).out[0])), r = T.BAG.recipe(U), out = T.BAG.item(r.out[0]);
  T.BAG.add(out.id, 1); let e = entries(view('итог пришёл'))[U];
  ok('итог пришёл в запасы — справа нет названия', e.out.includes(`<b class="rb-nm">${out.n}</b>`));
  A.wsview('table'); A.wsview('book'); T.BAG.take(out.id, 1); e = entries(view('итог ушёл'))[U];
  ok('итог ушёл из запасов — название пропало: найденное не помнится', e.out.includes(`<b class="rb-nm">${out.n}</b>`));
  /* герой итога: игрок встретил его (осколок) — лицо и имя */
  bookOpen(); const HR = Object.keys(D.part).find(id => T.BAG.recipe(id).kind === 'hero');
  if (HR) {
    const hid = T.BAG.item(T.BAG.recipe(HR).out[0]).heroId, hero = T.RSI[hid];
    ok(`обрывки героя: имя «${hero.n}» видно до встречи`, !view('герой не встречен').includes(hero.n));
    T.S.rs.shards[hid] = 1; e = entries(view('герой встречен'))[HR];
    ok('обрывки героя: встреченный герой без лица и имени', /class="well itf face rb-ic rb-hero"/.test(e.out) && e.out.includes(hero.n));
  }
});

/* ================== 5. утечки ================== */
scene('название ненайденного итога не видно нигде', () => {
  T.reset();
  const U = 'r_call_fb2', r = T.BAG.recipe(U), nm = r.n;
  ok('демо: итог Пускового рычага уже найден — проверка утечки ничего не проверяет', !T.WS_SRV.seen(r.out[0]));
  /* у стола: открытые позиции на столе — без имени */
  r.in.forEach(([id]) => { if (!q(id)) T.BAG.add(id, 2); });
  A.wsview('book'); A.wsload(U);
  let h = view('стол: открытые позиции обрывка');
  ok('стол: открытых позиций обрывка нет', /На столе все открытые позиции обрывка рецепта/.test(h));
  ok('стол: видно имя ненайденного итога', !h.includes(nm));
  /* карточка ресурса: обрывки — без имени; найденный итог — с именем */
  A.wsinfo('p_frame'); h = view('карточка: обрывок без итога');
  ok('карточка: нет обрывка', /data-a="wsbookpart" data-v="r_call_fb2">Итог не найден · 3 из 5</.test(h));
  ok('карточка: видно имя ненайденного итога', !h.includes(nm));
  A.close(); A.wsinfo('k4_ench'); h = view('карточка: обрывок с найденным итогом');
  ok('карточка: у обрывка с найденным итогом нет имени', /data-a="wsbookpart" data-v="r_kr_ru">Заряженный Рубидиум · 3 из 4</.test(h));
  /* из карточки — книга на «Обрывках», запись светится */
  A.wsbookpart('r_kr_ru');
  ok('обрывок из карточки: книга не на «Обрывках»', T.S.ws.view === 'book' && T.S.ws.book.tab === 'hint' && T.S.ws.book.hl === 'r_kr_ru' && !T.S.overlay);
  ok('обрывок из карточки: запись не светится', /data-rid="r_kr_ru"[^>]*data-n="4" role="group"[^>]* data-hl style="--hd:-?\d+ms"/.test(view('обрывок светится')));
  /* итог попытки: новая подсказка героя, которого игрок не встречал, — «Обрывки рецепта» без имени */
  T.reset(); T.wsSetTable(T.WS_DATA.demo.hint); A.wstry(); A.wstrydo();
  h = view('итог: подсказка без имени');
  ok('итог попытки: нет «Обрывки рецепта»', h.includes('<b>Обрывки рецепта</b> — появился в книге'));
  ok('итог попытки: видно имя героя, которого игрок не встречал', !h.includes('Оррин Напев'));
  /* фильтр вида и поиск: обрывок без найденного итога — ни под видом «Призывы», ни по названию */
  T.reset(); A.wsview('book'); A.wsbkind('', { value: 'call' });
  h = view('вид: призывы'); const E = entries(h);
  ok('вид «Призывы»: показан обрывок, итог которого не найден', !E[U]);
  ok('вид «Призывы»: нет найденного призыва', !!E.r_call_fb1);
  A.wsbkind('', { value: 'made' }); ok('вид «Изделия»: нет обрывка с найденным итогом', !!entries(view('вид: изделия')).r_kr_ru);
  A.wsbkind('', { value: '' }); T.S.ws.book.q = nm.slice(0, 8);
  ok('поиск по имени ненайденного итога нашёл обрывок', !entries(view('поиск: имя')).hasOwnProperty(U));
  T.S.ws.book.q = 'каркас'; const P = entries(view('поиск: открытая позиция'));
  ok('поиск по открытой позиции не нашёл обрывок', !!P[U]); ok('поиск «каркас» не нашёл лист Зажимного каркаса', !!P.r_p_frame);
  T.S.ws.book.q = 'рубидиум'; ok('поиск по найденному итогу не нашёл обрывок', !!entries(view('поиск: найденный итог')).r_kr_ru);
});

/* ================== 6. действия ================== */
scene('вкладки, вид, избранное, поиск', () => {
  bookOpen();
  const book = T.WS_SRV.book(), whole = book.filter(x => x.whole), part = book.filter(x => !x.whole);
  const can = whole.filter(x => { const p = T.wsPlan(x.r, 1); return p.ok && !p.owned; }).length;
  let h = view('вкладки');
  ok(`вкладки: «Создать сейчас · ${can}»`, h.includes(`Создать сейчас · ${can}`)); ok(`вкладки: «Обрывки · ${part.length}»`, h.includes(`Обрывки · ${part.length}`));
  A.wsbtab('can'); let E = entries(view('создать сейчас'));
  eq('«Создать сейчас»: записей', Object.keys(E).length, can); ok('«Создать сейчас»: не только те, что можно создать', Object.values(E).every(e => e.st === 'ok'));
  A.wsbtab('hint'); E = entries(view('обрывки'));
  eq('«Обрывки»: записей', Object.keys(E).length, part.length); ok('«Обрывки»: не только обрывки', Object.values(E).every(e => e.kind === 'rb-p'));
  A.wsbtab('all');
  for (const [k] of T.WS_DATA.kinds) { A.wsbkind('', { value: k }); view('вид ' + k); }
  A.wsbkind('', { value: 'part' }); eq('вид «Заготовки»: записей', Object.keys(entries(view('заготовки'))).length, whole.filter(x => x.r.kind === 'part').length);
  A.wsbkind('', { value: '' });
  /* избранное: звезда, «только избранное», избранное — первым */
  A.wsfav('r_p_fang'); h = view('избранное');
  ok('избранное: звезда не нажата', /data-rid="r_p_fang"[\s\S]*?<button class="rb-star" data-a="wsfav" data-v="r_p_fang" aria-pressed="true"/.test(h));
  A.wsbfav(); E = entries(view('только избранное'));
  eq('только избранное: записей', Object.keys(E).length, T.S.ws.fav.length); A.wsbfav();
  ok('избранное — не первым', entries(view('порядок')).hasOwnProperty(T.S.ws.fav[0]) && view('порядок').indexOf(`data-rid="${T.S.ws.fav[0]}"`) < view('порядок').indexOf('data-rid="r_p_frame"'));
  A.wsfav('r_p_fang'); ok('избранное не снимается', !T.S.ws.fav.includes('r_p_fang'));
  /* поиск: пусто — «Ничего не найдено» и сброс */
  T.S.ws.book.q = 'нет такого'; T.S.ws.book.fav = true; h = view('поиск: пусто');
  ok('поиск: пусто — нет «Ничего не найдено» и сброса', h.includes('Ничего не найдено') && h.includes('data-a="wsbclr"'));
  A.wsbclr(); ok('сброс: поиск, вид и избранное не сброшены', !T.S.ws.book.q && !T.S.ws.book.kind && !T.S.ws.book.fav);
  eq('сброс: записей', Object.keys(entries(view('после сброса'))).length, book.length);
});

scene('действия записей', () => {
  bookOpen();
  /* «Создать» — лист автодокрафта над книгой, книга остаётся */
  A.wsmake('r_p_fang'); let h = view('автодокрафт над книгой');
  eq('«Создать»: лист не автодокрафта', T.S.overlay && T.S.overlay.t, 'wsmake');
  ok('«Создать»: лист не над книгой', h.indexOf('<div class="rb"') >= 0 && h.indexOf('<div class="rb"') < h.indexOf('<div class="ov"'));
  const b = q('p_fang'); A.wsmakedo(); A.close();
  eq('«Создать» из книги: заготовка не создана', q('p_fang'), b + 1); eq('после автодокрафта книга закрылась', T.S.ws.view, 'book');
  /* «На стол»: открытые позиции — в ячейки, книга закрыта */
  A.wsload('r_kr_ru'); eq('«На стол»: книга не закрылась', T.S.ws.view, 'table');
  eq('«На стол»: на столе не открытые позиции', T.S.ws.cells.filter(Boolean).map(c => c.id).sort().join(), ['k4_alch', 'k4_ench', 'k4_smith'].join());
  /* значок — карточка ресурса над книгой */
  A.wsview('book'); A.wsinfo('fang'); eq('значок: не карточка ресурса', T.S.overlay && T.S.overlay.t, 'wsitem');
  ok('карточка: не над книгой', view('карточка над книгой').includes('<div class="rb"'));
  /* после удачи «В книгу» — книга на новой записи, запись светится */
  T.reset(); T.wsSetTable(T.WS_DATA.demo.made); A.wstry(); A.wstrydo(); A.wsfxreveal && A.wsfxreveal();
  A.wsbookgo('r_a_arrow'); h = view('новая запись');
  ok('«В книгу»: книга не на новой записи', T.S.ws.view === 'book' && T.S.ws.book.hl === 'r_a_arrow');
  ok('«В книгу»: новая запись не светится', /data-rid="r_a_arrow" data-hl style="--hd:-?\d+ms"/.test(h));
  /* подсказка из итога — книга на «Обрывках» */
  T.reset(); T.wsSetTable(T.WS_DATA.demo.hint); A.wstry(); A.wstrydo(); A.wshints();
  ok('«В книгу» из подсказки: не «Обрывки»', T.S.ws.view === 'book' && T.S.ws.book.tab === 'hint' && !T.S.overlay);
});

scene('пусто и порции', () => {
  T.reset(); T.S.bag.known = []; T.S.ws.part = {}; T.BAG.take('vs1', q('vs1'));
  A.wsview('book'); ok('пустая книга: нет строки «Книга пуста»', view('пустая книга').includes('Книга пуста'));
  A.wsbtab('hint'); ok('без обрывков: нет правила подсказок', view('без обрывков').includes('Обрывков пока нет'));
  T.reset(); T.S.bag.items = {}; T.S.wallet.enerium = 0; T.S.wallet.keys = 0; A.wsview('book'); A.wsbtab('can');
  ok('ничего не собрать: нет строки', view('ничего не собрать').includes('Сейчас ничего не собрать'));
  /* порции: найдено всё — 120 записей и «Показать ещё» */
  T.reset(); for (const r of R.recipes) if (!r.team) T.BAG.learn(r.id);
  A.wsview('book'); const h = view('все рецепты');
  eq('порции: записей в первой порции', (h.match(/class="ws-rc[ "]/g) || []).length, T.CR_VIEW.page);
  ok('порции: нет «Показать ещё»', /class="cr-more rb-more" data-a="crmore" data-v="wsbook:all"/.test(h));
  ok('порции: строка конца до последней порции', !h.includes('Дальше — чистые страницы'));
});

scene('путь рецепта у итога с несколькими рецептами', () => {
  const alt = (rn, on) => T.rbAlt({ n: rn }, { n: on });
  eq('путь: «на бальзаме»', alt('Снадобье от ожогов · на бальзаме', 'Снадобье от ожогов'), 'на бальзаме');
  eq('путь: «из жилы»', alt('Энериум из жилы', 'Энериум'), 'из жилы');
  eq('путь: «из пыли»', alt('Осколки доблести · цикл I · из пыли', 'Осколок доблести · цикл I'), 'из пыли');
  eq('путь: «из шлюза»', alt('Ларец снаряжения · из шлюза', 'Ларец снаряжения · эпический'), 'из шлюза');
  eq('путь: имя как у итога — пусто', alt('Точёный клык', 'Точёный клык'), '');
  for (const r of R.recipes.filter(x => !x.team)) {
    const out = T.BAG.item(r.out[0]); if (!out || out.n === r.n) continue;
    const a = T.rbAlt(r, out);
    ok(`путь: у «${r.n}» пусто — два рецепта одного итога не отличить`, !!a);
    ok(`путь: у «${r.n}» повторяет имя итога`, !a.includes(out.n));
  }
});

/* ================== 7. UI-кит и сценарий ================== */
scene('UI-кит и сценарий', () => {
  T.reset();
  const before = JSON.stringify({ bag: T.S.bag, part: T.S.ws.part, fav: T.S.ws.fav });
  ok('UI-кит: нет раздела «Книга рецептов: бумага»', T.KIT_EXTRA.some(x => x.html === T.rbKitHtml));
  const k = look('UI-кит · книга', T.rbKitHtml());
  eq('UI-кит: листов', (k.match(/class="ws-rc rb-e rb-w"/g) || []).length, 3);
  ok('UI-кит: не три длины листа', ['s', 'm', 'l'].every(x => k.includes(`data-len="${x}"`)));
  eq('UI-кит: обрывков', (k.match(/class="ws-rc rb-e rb-p"/g) || []).length, 2);
  ok('UI-кит: нажатия живые', [...k.matchAll(/data-a="([^"]+)"/g)].every(m => m[1] === 'noop'));
  eq('UI-кит: проба — не выдача', JSON.stringify({ bag: T.S.bag, part: T.S.ws.part, fav: T.S.ws.fav }), before);
  const f = T.FLOWS.find(x => x[0] === 'Мастерская · книга рецептов');
  ok('сценарий: нет «Мастерская · книга рецептов»', !!f);
  if (f) { T.reset(); T.S.route = 'shelter'; f[2](); ok('сценарий: книга не раскрыта', T.S.route === 'craft' && T.S.ws.view === 'book' && view('сценарий').includes('<div class="rb"')); }
});

console.log(`Разметок проверено: ${drawn}.`);
for (const x of rep) console.log('раскладка · ' + x);
done();

function done() {
  if (warn.length) console.log('Предупреждения:\n' + warn.join('\n'));
  if (err.length) { console.log('ОШИБКИ:\n' + err.slice(0, 40).join('\n') + (err.length > 40 ? `\n… и ещё ${err.length - 40}` : '')); process.exit(1); }
  console.log('Проверка пройдена: книга рецептов раскрывается на всё окно; найденный рецепт — лист древней бумаги своей длины в пропорциях рисунка, найденный частично — обрывки; итог, которого игрок не находил, безымянен везде; действия прежние, операции сервера.');
  process.exit(0);
}
