/* Автопроверка Убежища (design/ui/screens/shelter.js и shelter.css, §28.1 GDD) и кованых кромок оболочки (screens/shell.js и
   shell.css) — без браузера. Слово автора 30.09.2026: «Убежище … ААА уровня, добавь декоративные элементы в интерфейс общий».
   1. Файлы: index.html подключает shelter.css, shell.css (последним из стилей), shelter.js и shell.js; shelter.js — раньше talk.js
      (разговор читает NPCS при загрузке); концы строк — CRLF; скрипты компилируются. Прежнего Убежища в index.html нет: ни shelter(),
      ни NPCS, ни npcImg, ни shelterTags, ни стилей .sh-scene, .npc, .npc-tag, .next, .descend, .sh-act; строки «новый разговор»
      в NAV_TODO index.html нет — её добавляет shelter.js; в SCREENS index.html — только запасной вид.
   2. Экран рисуется без исключений, undefined и NaN: четыре проводника — фигура двумя слоями (грудь и полы) в своём плане, табличка
      с гербом, именем и ролью, метка нового разговора — только у isNew; дела — вывески ритуала, Эхо и контракта с прежней логикой
      (готово — «Ритуал готов» и свет, не подписан — «Контракт не подписан» и свет, подписан — «Контракт d/n»; Эхо — ближайший срок);
      «Чат» с числом непрочитанного, «Дар дня» и «Пропуск» (screens/pass.js); следующий шаг — место Памяти или рубеж спуска;
      «Спуститься» — ACT.shdive к «Спуску», подпись — выбранный биом. Частиц — сколько в SH_VIEW, рисунок один и тот же при каждой
      отрисовке; фаза — --t.
   3. Действия: ACT.shdive без сцены (песочница) — сразу «Спуск»; разговор снимает «новый разговор» — дело шахты уходит.
   4. Вёрстка расчётом на 932 × 430 и 844 × 390: верхний ряд (вывески и медальоны) и нижний (чат, записка, кнопка) помещаются
      в ширину рабочей области; таблички проводников — внутри кадра, не наезжают друг на друга, на вывески, медальоны, записку и кнопку;
      зоны нажатия — не меньше 44 px. Каскад стилей (css_cascade.js): размеры вещей Убежища решает shelter.css, чужие правила их
      не перебивают.
   5. Арт: каждый путь SH_ART.ready и SHL_ART.ready лежит в assets/art и есть в tools/art-gen/ui-art.json; геометрия — целые числа
      в пределах рисунка, размеры рисунка на диске совпадают с описью; с артом — переменные и флаги у <html>, без арта — ни одной
      ссылки на shelter/ и shell/, флагов нет, всё рисуется. Флаги — не классы элементов.
   6. Движение: в кадрах shelter.css и shell.css — только transform и opacity; у повторяющихся анимаций фаза от часов страницы (--t);
      «меньше движения» выключает анимации.
   7. Оболочка: shell.css не меняет вёрстку оболочки — у шапки, шахты, кнопок разделов, картинок, подписей, кошелька и колокола
      размеры, отступы и шрифт решает index.html (каскад с shell.css и без него — одно и то же); украшения-псевдоэлементы —
      position: absolute и pointer-events: none; гнездо картинки раздела обнимает картинку и помещается в шахту.
   8. Режим «Игрок»: на Убежище и в разделах UI-кита нет служебных слов; UI-кит — разделы «Убежище: сцена и вещи» и «Оболочка:
      кованые кромки» рисуются в обоих режимах.
   Запуск: node tools/content-gen/screens/check_shelter.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const CC = require('./css_cascade.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, states: 0, boxes: 0, cascade: 0, art: 0, frames: 0 };
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Убежище: отрисовок ${cnt.views}, состояний дел ${cnt.states}, прямоугольников вёрстки ${cnt.boxes}, свойств каскада ${cnt.cascade}, путей арта ${cnt.art}, кадров анимации ${cnt.frames}.`);
  console.log('Проверка пройдена: Убежище в своём файле, прежнего в index.html нет; сцена, проводники, дела, записка и «Спуститься» — с прежней логикой; вёрстка на 932 × 430 и 844 × 390 без наездов; арт выгружен или заменён CSS; движение — transform и opacity; оболочка украшена без перемен в вёрстке; игроку — без служебного.');
  process.exit(0);
}

/* ================== ДАННЫЕ ПРОВЕРКИ ================== */
const FRAMES = [{ n: '932 × 430', w: 932, h: 430, small: false }, { n: '844 × 390', w: 844, h: 390, small: true }];
const TOUCH = 44;                 // зона нажатия — не меньше, px
const EM = { b: 0.5, r: 0.46, caps: 0.66, d: 0.47 };   // ширина буквы в em — с запасом: PT Sans Narrow жирный и обычный, метка заглавными, Cormorant
const GAP = 4;                    // между прямоугольниками вёрстки — не меньше, px
const ANIM = ['transform', 'opacity'];
const TRANS = ['transform', 'translate', 'scale', 'rotate', 'opacity', 'filter', 'box-shadow', 'color'];   // переходы: движение — transform, свет — фильтр и тень
const OLD = [['function shelter(', /\bfunction shelter\(/], ['const NPCS', /\bconst NPCS\b/], ['npcImg', /\bnpcImg\b/], ['shelterTags', /\bshelterTags\b/]];
const OLD_CSS = ['.sh-scene', '.npc', '.npc-tag', '.next', '.descend', '.sh-act', '.sh-toprow', '.sh-bottom', '.sh-place', '.sh-stage'];

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]).filter(h => !/^https?:/.test(h));
const main = scripts.find(s => !s.src && /function initialState\(/.test(s.code)) || { code: '' };
const inline = ((html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '').replace(/\/\*[\s\S]*?\*\//g, '');
{
  const at = f => scripts.findIndex(s => s.src === f), iMain = scripts.indexOf(main);
  for (const f of ['screens/shelter.js', 'screens/shell.js']) { if (at(f) < 0) say(`index.html: не подключён ${f}`); else if (at(f) < iMain) say(`index.html: ${f} подключён раньше основного скрипта`); }
  if (at('screens/talk.js') >= 0 && at('screens/shelter.js') > at('screens/talk.js')) say('index.html: screens/shelter.js подключён после talk.js — разговор читает NPCS при загрузке');
  if (!links.includes('screens/shelter.css')) say('index.html: не подключён screens/shelter.css');
  if (links[links.length - 1] !== 'screens/shell.css') say(`index.html: screens/shell.css — не последний из стилей (последний — ${links[links.length - 1]}): украшения оболочки перебьёт чужое правило`);
  for (const f of ['screens/shelter.js', 'screens/shelter.css', 'screens/shell.js', 'screens/shell.css', 'index.html']) {
    const b = fs.readFileSync(path.join(UI, f)).toString('latin1'), crlf = (b.match(/\r\n/g) || []).length, lf = (b.match(/\n/g) || []).length;
    if (crlf !== lf) say(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`);
  }
  for (const f of ['screens/shelter.js', 'screens/shell.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
  for (const [n, re] of OLD) if (re.test(main.code)) say(`index.html: осталось прежнее Убежище — ${n}`);
  const heads = [...inline.matchAll(/([^{}]+)\{/g)].map(m => m[1]).filter(h => !/^\s*@/.test(h)).flatMap(h => h.split(',').map(s => s.trim()));
  for (const c of OLD_CSS) { const re = new RegExp('(^|\\s)' + c.replace('.', '\\.') + '(?![\\w-])'); const hit = heads.find(s => re.test(s)); if (hit) say(`index.html: остался стиль прежнего Убежища «${hit}» — он в screens/shelter.css`); }
  const todo = main.code.match(/const NAV_TODO = \[([\s\S]*?)\n\];/);
  if (!todo) say('index.html: не найден NAV_TODO'); else if (/\['shelter'/.test(todo[1])) say('index.html: строка «новый разговор» в NAV_TODO — её добавляет screens/shelter.js');
  if (!/const SCREENS = \{ shelter: \(\) => \(\{[^}]*не подключён/.test(main.code)) say('index.html: в SCREENS у Убежища не запасной вид «не подключён»');
}
if (err.length) done();

/* ================== песочница ==================
   ready — какие пути арта считать выгруженными (null — как в файлах); у <html> запоминаются классы и переменные */
function load(o = {}) {
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, remove() {},
      animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), getClientRects: () => [1], scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
    e.querySelector = () => stubEl();
    return e;
  };
  const rootCls = new Set(), rootVars = {}, root = stubEl('html');
  root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
  root.style = { setProperty: (k, v) => { rootVars[k] = v; } };
  const els = {};
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), baseURI: 'file:///ui/index.html',
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: q => ({ matches: !!o.reduced && /reduced-motion/.test(q), addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 123456 }, URL };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    let code = s.src ? read(s.src) : s.code;
    if (o.noArt && (s.src === 'screens/shelter.js' || s.src === 'screens/shell.js')) code = code.replace(/(\n\s*ready: )\[[^\]]*\]/, '$1[]');   // без выгрузки: список путей пуст
    try { vm.runInContext(code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; }, ACT, OV, SCREENS, NPCS, NAV_TODO, KIT_EXTRA, FLOWS, KH, render, initialState, setTeam, AV, ART, PATH, navTodo,
    SH: typeof SH_VIEW !== 'undefined' ? { VIEW: SH_VIEW, CAST: SH_CAST, ROOM: SH_ROOM, ART: SH_ART, TEXT: SH_TEXT, view: shelterView, fig: shFig } : null,
    SHL: typeof SHL_ART !== 'undefined' ? { ART: SHL_ART, VIEW: SHL_VIEW, side: shlFrameSide } : null,
    socChatN: typeof socChatN === 'function' ? socChatN : null,
  })`, ctx);
  return { T, els, rootCls, rootVars, game: () => (els.game ? els.game.innerHTML : '') };
}
const A = load();
if (err.length) done();
const { T } = A;
if (!T.SH) { say('screens/shelter.js: нет SH_VIEW, SH_CAST и других — файл не выполнился'); done(); }
if (!T.SHL) { say('screens/shell.js: нет SHL_ART и SHL_VIEW — файл не выполнился'); done(); }
if (T.SCREENS.shelter !== T.SH.view) say('SCREENS.shelter — не экран screens/shelter.js');
if (typeof T.ACT.shdive !== 'function') say('screens/shelter.js: нет действия ACT.shdive');

const BAD = /.{0,60}(?:undefined|NaN|\[object ).{0,40}/;
const reset = X => { X.T.S = X.T.initialState(); X.T.S.overlay = null; X.T.S.route = 'shelter'; };
const draw = (X, where) => { run(where, () => X.T.render()); cnt.views++; const h = X.game(); const m = h.match(BAD); if (m) say(`${where}: в разметке undefined, NaN или [object — «${m[0]}»`); return h; };
const mainOf = h => { const i = h.indexOf('<main class="g-main"'); return i < 0 ? '' : h.slice(i, h.indexOf('</main>', i)); };
const esc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const V = T.SH.VIEW, CAST = T.SH.CAST, ROOMD = T.SH.ROOM, TX = T.SH.TEXT;
const count = (h, re) => (h.match(re) || []).length;
const layerOf = (h, name) => { const i = h.indexOf(`<div class="sh-lay ${name}">`); if (i < 0) return ''; let d = 0, j = i; for (const m of h.slice(i).matchAll(/<(\/?)div\b/g)) { d += m[1] ? -1 : 1; if (!d) { j = i + m.index; break; } } return h.slice(i, j); };

/* ================== 2. экран ================== */
reset(A);
let h = mainOf(draw(A, 'Убежище'));
{
  if (!/<section class="scr flush sh" style="--t:-?\d+ms;--mx:[-\d.]+;--my:[-\d.]+">/.test(h)) say('Убежище: у экрана нет фазы --t и параллакса --mx, --my');
  const stage = (h.match(/<div class="sh-st sh-stage">[\s\S]*?<i class="sh-shade"/) || [''])[0], back = layerOf(stage, 'back'), front = layerOf(stage, 'front');
  const keys = Object.keys(T.NPCS);
  if (keys.length < 4) say(`NPCS: проводников ${keys.length}, ждали четырёх`);
  for (const k of keys) {
    const n = T.NPCS[k], c = CAST[k], where = `проводник «${n.n}»`;
    if (!c) { say(`${where}: нет кадра в SH_CAST`); continue; }
    const lay = c.layer === 'back' ? back : front;
    const fig = (lay.match(new RegExp(`<button class="sh-npc[^"]*" data-k="${k}" data-a="npc" data-v="${k}"[\\s\\S]*?</button>`)) || [''])[0];
    if (!fig) { say(`${where}: фигуры нет в плане ${c.layer}`); continue; }
    if (!fig.includes(`<img class="sh-up" src="${n.img}"`) || !fig.includes(`<img class="sh-lo" src="${n.img}"`)) say(`${where}: фигура не двумя слоями своей картинки (грудь и полы)`);
    if (c.rim && !fig.includes('class="sh-rim"')) say(`${where}: нет тёплого контрового света горна`);
    if (count(fig, /class="sh-gl"/g) !== (c.glow || []).length) say(`${where}: свет в руках — ${count(fig, /class="sh-gl"/g)}, а в SH_CAST — ${(c.glow || []).length}`);
    const tags = (h.match(/<div class="sh-st sh-tags">[\s\S]*$/) || [''])[0], tl = layerOf(tags, c.layer);
    const tag = (tl.match(new RegExp(`<button class="sh-tag ${c.layer}[^"]*" data-a="npc" data-v="${k}"[\\s\\S]*?</button>`)) || [''])[0];
    if (!tag) { say(`${where}: таблички нет в плане ${c.layer} слоя табличек`); continue; }
    if (!tag.includes(`<b>${esc(n.n)}</b>`) || !tag.includes(`<small>${esc(n.role)}</small>`)) say(`${where}: на табличке нет имени или роли`);
    if (!/class="sh-crest/.test(tag)) say(`${where}: на табличке нет герба роли`);
    if (!!n.isNew !== /class="sh-new"/.test(tag)) say(`${where}: метка нового разговора ${n.isNew ? 'не стоит' : 'стоит без разговора'}`);
    if (!!n.isNew !== new RegExp(`aria-label="[^"]*${TX.newTalk}`).test(tag)) say(`${where}: подпись таблички не говорит о новом разговоре`);
  }
  /* частицы — сколько в SH_VIEW, рисунок один и тот же при каждой отрисовке */
  for (const [cls, k] of [['sh-em', 'embers'], ['sh-sm', 'steam'], ['sh-du', 'dust'], ['sh-bk', 'bokeh']]) if (count(h, new RegExp(`class="${cls}"`, 'g')) !== V[k]) say(`частицы .${cls}: ${count(h, new RegExp(`class="${cls}"`, 'g'))}, а SH_VIEW.${k} — ${V[k]}`);
  const motes = (h.match(/<span class="sh-mt">([\s\S]*?)<\/span>/) || [, ''])[1];
  if (count(motes, /<i /g) !== V.motes) say(`огоньков шахты ${count(motes, /<i /g)}, а SH_VIEW.motes — ${V.motes}`);
  if (count(h, /class="sh-beam"/g) !== ROOMD.beams.length) say(`лучей из окон ${count(h, /class="sh-beam"/g)}, а SH_ROOM.beams — ${ROOMD.beams.length}`);
  const h2 = mainOf(draw(A, 'Убежище ещё раз')), nt = x => x.replace(/--t:-?\d+ms/g, '');
  if (nt(h) !== nt(h2)) say('Убежище: вторая отрисовка — другая разметка: рисунок частиц или задержки не постоянные');
}
/* дела: логика прежняя — ритуалы, Эхо, контракт дня */
function signs(h0) { return [...h0.matchAll(/<button class="sh-sign( hot)?" data-a="go" data-v="([^"]+)"[\s\S]*?<b>([^<]*)<\/b><small>([^<]*)<\/small>/g)].map(m => ({ hot: !!m[1], v: m[2], t: m[3], s: m[4] })); }
{
  const st = where => { cnt.states++; return signs(mainOf(draw(A, where))); };
  reset(A);
  let S0 = st('дела · демо');
  if (S0.map(x => x.v).join() !== 'rituals,echo,contracts') say(`дела: вывески ${S0.map(x => x.v).join(', ')}, ждали ритуалы, Эхо, контракт`);
  const R = T.S.rituals.slots;
  if (R.some(s => s.st === 'ready')) { const r = S0[0]; if (!r || r.t !== TX.rit[0] || r.s !== TX.rit[2] || !r.hot) say(`дела · ритуал готов: «${r && r.t} / ${r && r.s}», свет ${r && r.hot}`); }
  R.forEach(s => { if (s.st === 'ready') s.st = 'run'; });
  S0 = st('дела · ритуалы идут');
  { const r = S0[0], n = R.filter(s => s.st === 'run').length; if (!r || r.t !== TX.rit[1] || r.hot || r.s !== (n ? TX.rit[3](n) : TX.rit[4])) say(`дела · ритуалы идут: «${r && r.t} / ${r && r.s}»`); }
  const live = T.S.echo.slots.filter(Boolean), soon = Math.min(...live.map(s => s.left));
  { const e = S0[1]; if (!e || e.t !== esc(TX.echo[0](live.length)) || e.s !== esc(TX.echo[1](soon))) say(`дела · Эхо: «${e && e.t} / ${e && e.s}», ждали «${TX.echo[0](live.length)} / ${TX.echo[1](soon)}»`); }
  T.S.echo.slots = T.S.echo.slots.map(() => null); S0 = st('дела · целей Эхо нет');
  { const e = S0[1]; if (!e || e.s !== esc(TX.echo[2])) say(`дела · Эхо без целей: «${e && e.s}»`); }
  reset(A);
  const ct = T.S.contracts.day;
  ct.signed = false; S0 = st('дела · контракт не подписан');
  { const c = S0[2]; if (!c || c.t !== TX.ct[1] || !c.hot || c.s !== esc(TX.ct[3](ct.left))) say(`дела · контракт не подписан: «${c && c.t} / ${c && c.s}», свет ${c && c.hot}`); }
  ct.signed = true; S0 = st('дела · контракт подписан');
  { const c = S0[2], d = ct.tasks.filter(t => t.p >= t.goal).length; if (!c || c.t !== TX.ct[0](d, ct.tasks.length) || c.hot) say(`дела · контракт подписан: «${c && c.t}», свет ${c && c.hot}`); }
}
/* медальоны, записка, главная кнопка */
{
  reset(A);
  const g = mainOf(draw(A, 'Убежище · медальоны'));
  const chat = (g.match(/<button class="sh-md" data-a="sheet" data-v="chat">[\s\S]*?<\/button>/) || [''])[0], n = T.socChatN ? T.socChatN() : 0;
  if (!chat) say('Убежище: нет медальона «Чат»');
  else if (n && !chat.includes(`<span class="bdg" aria-hidden="true">${n > 9 ? '9+' : n}</span>`)) say(`Убежище: у «Чата» нет числа непрочитанного ${n}`);
  const meds = (g.match(/<div class="sh-meds">([\s\S]*?)<\/div>/) || [, ''])[1];
  if (!/data-a="dlg" data-v="gift"/.test(meds) || !/data-a="go" data-v="store:pass"/.test(meds)) say('Убежище: в медальонах справа нет «Дар дня» и «Пропуск»');
  const m0 = T.S.mem.slots[0];
  if (m0.st === 'open') { if (!g.includes(esc(TX.memNow(m0.c))) || !/data-a="dlg" data-v="mem"/.test(g)) say('следующий шаг: место Памяти открыто, а записка не зовёт «Вспомнить»'); }
  else say('демо: место Памяти цикла II не открыто — проверка записки неполная');
  if (!/<button class="link" data-a="npc" data-v="mage">/.test(g)) say('следующий шаг: нет «Поговорить» с Хранителем знаний');
  const b = T.S.biomes.find(x => x.id === T.S.selBiome);
  const cta = (g.match(/<button class="sh-cta" data-a="shdive" data-v="descent"[\s\S]*?<\/button>/) || [''])[0];
  if (!cta) say('Убежище: нет главной кнопки «Спуститься» (ACT.shdive → «Спуск»)');
  else { if (!cta.includes(`<b>${TX.descend}</b>`)) say('«Спуститься»: нет надписи'); if (b && b.name && !cta.includes(`<small>${esc(b.name)}</small>`)) say(`«Спуститься»: подпись не выбранный биом «${b.name}»`); }
  if (count(g, /class="btn[^"]*go\b/g)) say('Убежище: кроме «Спуститься» есть ещё главная кнопка .btn.go — главное действие одно');
  /* место Памяти закреплено — записка ведёт к рубежу спуска */
  const P = T.S.mem.slots[0]; try { if (Object.getOwnPropertyDescriptor(P, 'st') && Object.getOwnPropertyDescriptor(P, 'st').get) P.p = 'p1'; else P.st = 'set'; } catch (_) { P.st = 'set'; }
  const g2 = mainOf(draw(A, 'Убежище · Память закреплена')), fr = T.S.biomes.find(x => x.state === 'front');
  if (P.st !== 'open') { if (/data-v="mem"/.test(g2)) say('следующий шаг: место закреплено, а «Вспомнить» осталось'); if (fr && !g2.includes(esc(TX.front(fr.name)))) say(`следующий шаг: нет рубежа спуска «${fr.name}»`); }
}

/* ================== 3. действия ================== */
{
  reset(A);
  run('«Спуститься»', () => T.ACT.shdive('descent'));
  if (T.S.route !== 'descent') say(`«Спуститься»: маршрут ${T.S.route}, а не «Спуск»`);
  reset(A);
  const row = T.NAV_TODO.filter(r => r[0] === 'shelter');
  if (row.length !== 1) say(`NAV_TODO: строк Убежища ${row.length}, ждали одну`);
  const before = run('дело шахты', () => row[0][2]({})), k = Object.keys(T.NPCS).find(x => T.NPCS[x].isNew);
  if (k && typeof T.ACT.npc === 'function') {
    run('разговор', () => T.ACT.npc(k));
    const after = run('дело шахты после разговора', () => row[0][2]({}));
    if (after !== before - 1) say(`разговор с «${T.NPCS[k].n}»: дел шахты ${before} → ${after}, ждали на одно меньше`);
    T.NPCS[k].isNew = true;
  }
}

/* ================== 4. вёрстка расчётом и каскад ================== */
const pxv = v => { const m = String(v || '').trim().match(/^(-?[\d.]+)px$/); return m ? +m[1] : null; };
const G = { top: +(inline.match(/\.g\{--top:(\d+)px/) || [])[1], rail: +(inline.match(/\.g\{--top:\d+px;--rail:(\d+)px/) || [])[1],
  topS: +(inline.match(/\.g\.sm\{[^}]*--top:(\d+)px/) || [])[1], railS: +(inline.match(/\.g\.sm\{[^}]*--rail:(\d+)px/) || [])[1] };
if (Object.values(G).some(v => !Number.isFinite(v))) say('вёрстка: не нашёл --top и --rail у .g и .g.sm в index.html');
const RULES = CC.sheets(UI, html), RULES0 = RULES.filter(r => r.src !== 'screens/shell.css');
const tree = (small, markup, cls) => CC.wrap([['html', { class: [...cls].join(' '), lang: 'ru' }], ['body', {}], ['div', { class: 'p-device', id: 'device' }], ['div', { class: 'p-device-inner' }], ['div', { class: small ? 'g sm' : 'g', id: 'game', lang: 'ru' }]], markup);
const textW = (s, px, em, track = 0) => [...String(s).replace(/&[a-z]+;/g, 'x')].length * px * (em + track);
/* запятые верхнего уровня: внутри cubic-bezier(…) и steps(…) — не разделитель */
const splitTop = v => { const out = []; let d = 0, cur = ''; for (const c of String(v)) { if (c === '(') d++; else if (c === ')') d--; if (c === ',' && !d) { out.push(cur.trim()); cur = ''; } else cur += c; } if (cur.trim()) out.push(cur.trim()); return out; };
const overlap = (a, b) => a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;
reset(A);
const game = draw(A, 'вёрстка');
for (const X of FRAMES) {
  const w = X.w - (X.small ? G.railS : G.rail), hh = X.h - (X.small ? G.topS : G.top), where = `вёрстка ${X.n}`;
  const root = tree(X.small, game, A.rootCls), C = new CC.Cascade(RULES, { w: X.w, h: X.h, reduced: false, hover: false, containers: { main: [w, hh], tk: [w, hh] } });
  const one = sel => CC.q(root, sel)[0];
  const num = (e, p) => (e ? pxv(C.value(e, p)) : null);
  const plate = one(e => e.cls.has('sh-plate')), cta = one(e => e.cls.has('sh-cta')), md = one(e => e.cls.has('sh-md')), next = one(e => e.cls.has('sh-next'));
  const tagEl = one(e => e.cls.has('sh-tag')), sh = one(e => e.cls.has('sh'));
  if (!plate || !cta || !md || !next || !tagEl || !sh) { say(`${where}: в разметке нет вывески, кнопки, медальона, записки или таблички`); continue; }
  /* размеры вещей Убежища решает shelter.css — чужие правила их не перебивают */
  const own = [[plate, ['height']], [cta, ['height', 'min-width']], [md, ['width', 'height']], [next, ['flex-basis']], [tagEl, ['padding-top', 'margin-top']]];
  for (const [e, props] of own) for (const p of props) { cnt.cascade++; const wv = C.win(e, p); if (!wv || wv.src !== 'screens/shelter.css') say(`${where}: у .${[...e.cls].join('.')} «${p}» решает ${wv ? `${wv.src} «${wv.sel}»` : 'никто'}`); }
  const pb = num(sh, '--chl') != null ? num(sh, '--chl') : 12, shs = num(plate, 'height'), ctaH = num(cta, 'height'), ctaMin = num(cta, 'min-width'), mdW = num(md, 'width'), mdH = num(md, 'height');
  const nb = pxv(String(C.value(next, 'flex-basis'))) || 300, chl = pxv(C.value(sh, '--chl')) || 12;
  if (![shs, ctaH, ctaMin, mdW, mdH].every(Number.isFinite)) { say(`${where}: каскад не дал размеров — вывеска ${shs}, кнопка ${ctaH} × ${ctaMin}, медальон ${mdW} × ${mdH}`); continue; }
  for (const [n, v] of [['вывеска дела', shs], ['«Спуститься»', ctaH], ['медальон', Math.min(mdW, mdH)]]) if (v < TOUCH) say(`${where}: ${n} — ${v} px, меньше ${TOUCH}`);
  /* верхний ряд: вывески слева, медальоны справа — в одну строку */
  const pad = X.small ? 10 : 12, bl = shs * T.SH.ART.sign.slice[3] / T.SH.ART.sign.px[1], br = shs * T.SH.ART.sign.slice[1] / T.SH.ART.sign.px[1];
  const sg = signs(mainOf(game)), fs = X.small ? [12.5, 11] : [13, 11.5];
  const worst = [TX.rit[0], TX.echo[0](4), TX.ct[1]].map(t => textW(t, fs[0], EM.b)), worstS = [TX.rit[4], TX.echo[1](86399 + 86400 * 6), TX.ct[3](86399)].map(t => textW(t, fs[1], EM.r));
  const signW = sg.map((x, i) => bl + br + 4 + Math.max(worst[i] || 0, worstS[i] || 0, textW(x.t, fs[0], EM.b), textW(x.s, fs[1], EM.r)));
  const medsW = 2 * mdW + 4, topW = signW.reduce((a, x) => a + x, 0) + (signW.length - 1) * (X.small ? 8 : 10) + 12 + medsW + 2 * pad;
  cnt.boxes += signW.length + 2;
  if (topW > w) say(`${where}: верхний ряд ${Math.round(topW)} px шире рабочей области ${w} px — вывески и медальоны не в одну строку`);
  const boxes = [];
  let x = pad; sg.forEach((s, i) => { boxes.push({ n: `вывеска «${s.t}»`, x, y: 0, w: signW[i], h: chl + shs }); x += signW[i] + (X.small ? 8 : 10); });
  boxes.push({ n: 'медальоны справа', x: w - pad - medsW, y: 6, w: medsW, h: mdH });
  /* нижний ряд: чат, записка, «Спуститься» */
  const cb = ctaH * T.SH.ART.cta.slice[1] / T.SH.ART.cta.px[1], bn = T.S.biomes.find(z => z.id === T.S.selBiome);
  const ctaW = Math.max(ctaMin, Math.max(textW(TX.descend, X.small ? 16 : 17, EM.caps, .16), bn && bn.name ? textW(bn.name, X.small ? 12 : 13, EM.d) : 0) + 2 * cb + 8);
  /* высота записки — поля, метка, заголовок, завиток (кроме низкого экрана), две строки, кнопки — с запасом */
  const noteH = Math.ceil((X.small ? 10 + 9 + 12.6 + 3 + 17 * 1.1 + 3 + 2 * 12 * 1.25 + 3 + 36 : 12 + 10 + 12.6 + 3 + 19 * 1.1 + 12 + 3 + 2 * 12.5 * 1.3 + 3 + 36) * 1.04);
  const noteW = Math.min(nb, w - 2 * pad - mdW - ctaW - 2 * (X.small ? 10 : 12));
  const titleW = textW(TX.memNow(2), X.small ? 17 : 19, EM.d) + (X.small ? 32 + 8 : 38 + 10) + 26;
  if (noteW < titleW) say(`${where}: записке остаётся ${Math.round(noteW)} px, а заголовку нужно ${Math.round(titleW)}`);
  const by = hh - pad;
  boxes.push({ n: 'Чат', x: pad, y: by - mdH, w: mdW, h: mdH }, { n: '«Спуститься»', x: w - pad - ctaW, y: by - ctaH, w: ctaW, h: ctaH },
    { n: 'записка «Следующий шаг»', x: w - pad - ctaW - (X.small ? 10 : 12) - noteW, y: by - noteH, w: noteW, h: noteH });
  if (boxes.slice(-2).reduce((a, b0) => a + b0.w, 0) + mdW + 2 * pad + 2 * (X.small ? 10 : 12) > w) say(`${where}: нижний ряд шире рабочей области`);
  /* таблички проводников: кадр сцены — как .sh-st в shelter.css */
  const SW = Math.max(w, hh * 1408 / 768), SH = SW * 768 / 1408, sl = Math.min(0, w - hh * 1408 / 768) * .5, st = Math.min(0, hh - w * 768 / 1408) * .4;
  const tags = Object.keys(T.NPCS).filter(k => CAST[k]).map(k => {
    const n = T.NPCS[k], c = CAST[k], nm = textW(n.n, X.small ? 16 : 17, EM.d), rl = textW(n.role, 8.5, EM.caps, .18);
    const tw = (X.small ? 31 : 34) - 12 + 20 + 16 + Math.max(nm, rl), th = X.small ? 31 : 34;
    return { n: `табличка «${n.n}»`, x: sl + SW * c.tag.x / 1000 - tw / 2, y: st + SH * c.tag.y / 1000, w: tw, h: th };
  });
  cnt.boxes += tags.length;
  for (const t of tags) {
    if (t.x < 0 || t.x + t.w > w || t.y < 0 || t.y + t.h > hh) say(`${where}: ${t.n} выходит за рабочую область (${Math.round(t.x)}, ${Math.round(t.y)}, ${Math.round(t.w)} × ${t.h})`);
    for (const b0 of boxes) if (overlap(t, b0)) say(`${where}: ${t.n} наезжает на ${b0.n}`);
  }
  for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) if (overlap(tags[i], tags[j])) say(`${where}: ${tags[i].n} наезжает на ${tags[j].n}`);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlap(boxes[i], boxes[j])) say(`${where}: ${boxes[i].n} наезжает на ${boxes[j].n}`);
  /* табличка: зона нажатия — с прозрачным полем до ${TOUCH} px */
  const tp = num(tagEl, 'padding-top'), tH = (X.small ? 31 : 34) + 2 * (tp || 0);
  if (tH < TOUCH) say(`${where}: зона нажатия таблички ${tH} px, меньше ${TOUCH}`);
  console.log(`${where}: верхний ряд ${Math.round(topW)} из ${w} px; записка ${Math.round(noteW)} px, «Спуститься» ${Math.round(ctaW)} × ${ctaH}; таблички — ${tags.map(t => `${Math.round(t.x)}…${Math.round(t.x + t.w)} × ${Math.round(t.y)}`).join(', ')}.`);
}

/* ================== 5. арт ================== */
const uiArt = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'ui-art.json'), 'utf8')).items;
function imgSize(p) {
  const b = fs.readFileSync(p);
  if (b.slice(1, 4).toString() === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') {
    const k = b.slice(12, 16).toString();
    if (k === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (k === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
    if (k === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  }
  if (b[0] === 0xff && b[1] === 0xd8) { let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1], L = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + L; } }
  return null;
}
{
  const I = T.SH.ART, L = T.SHL.ART;
  for (const [who, R] of [['SH_ART', I], ['SHL_ART', L]]) for (const p of R.ready) {
    cnt.art++;
    if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`${who}: ${p} в ready, а файла нет`);
    if (!uiArt[p]) say(`${who}: ${p} нет в tools/art-gen/ui-art.json`);
    if (!Object.values(R.img).includes(p)) say(`${who}: ${p} в ready, а в img его нет`);
  }
  const ints = (n, a) => { for (const v of [].concat(a)) if (!Number.isInteger(v) || v < 0) say(`арт: ${n} — не целое неотрицательное (${v})`); };
  for (const k of ['sign', 'cta']) {
    const G0 = I[k], p = path.join(UI, 'assets', 'art', I.img[k]); ints(`SH_ART.${k}`, G0.px.concat(G0.slice));
    if (G0.slice[0] + G0.slice[2] >= G0.px[1] || G0.slice[1] + G0.slice[3] >= G0.px[0]) say(`SH_ART.${k}: срезы border-image больше рисунка`);
    const sz = fs.existsSync(p) ? imgSize(p) : null; if (sz && (sz[0] !== G0.px[0] || sz[1] !== G0.px[1])) say(`SH_ART.${k}: рисунок на диске ${sz.join(' × ')}, а в описи ${G0.px.join(' × ')}`);
    const u = uiArt[I.img[k]]; if (u && u.size && (u.size[0] !== G0.px[0] || u.size[1] !== G0.px[1])) say(`SH_ART.${k}: ui-art.json выгружает ${u.size.join(' × ')}, а геометрия — для ${G0.px.join(' × ')}`);
  }
  { const F = L.frame, p = path.join(UI, 'assets', 'art', L.img.frame), sz = fs.existsSync(p) ? imgSize(p) : null; ints('SHL_ART.frame', [F.px].concat(F.win));
    if (sz && sz[0] !== F.px) say(`SHL_ART.frame: гнездо на диске ${sz[0]} px, а в описи ${F.px}`);
    const side = T.SHL.side(), win = side * (F.win[1] - F.win[0]) / F.px;
    if (Math.abs(win - T.SHL.VIEW.pic) > 1) say(`гнездо: окно ${win.toFixed(1)} px не обнимает картинку раздела ${T.SHL.VIEW.pic} px`);
    for (const r of [G.rail, G.railS]) if (side > r - 8) say(`гнездо ${side} px не помещается в шахту ${r} px с полями`); }
  /* геометрия сцены — целые тысячные доли */
  for (const [k, c] of Object.entries(CAST)) { ints(`SH_CAST.${k}`, [c.x, c.h, c.tag.x, c.tag.y].concat(...(c.glow || []).map(g => g.slice(0, 3)))); if (!Number.isInteger(c.b)) say(`SH_CAST.${k}.b — не целое`); if (!['back', 'front'].includes(c.layer)) say(`SH_CAST.${k}: план «${c.layer}»`); }
  /* с артом — переменные и флаги у <html> */
  for (const [k, flag] of [['--sh-sign', 'sha-sign'], ['--sh-cta', 'sha-cta'], ['--sh-chain', 'sha-chain'], ['--sh-corner', 'sha-corner'], ['--shl-edge-v', 'shla-edge'], ['--shl-knot', 'shla-knot'], ['--shl-frame', 'shla-frame'], ['--shl-medal', 'shla-medal']])
    if (!A.rootVars[k] || !A.rootCls.has(flag)) say(`арт: ${k} не в переменных <html> или нет флага ${flag}`);
  /* флаги — не классы элементов: правило из одних флагов легло бы на весь документ */
  const flags = [...A.rootCls].filter(c => /^(sha|shla)-/.test(c));
  const css = ['screens/shelter.css', 'screens/shell.css'].map(read).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, head] of css.matchAll(/([^{}]+)\{/g)) for (const s of head.split(',').map(x => x.trim())) {
    if (!s || /^@/.test(s) || /^(html|:root)\b/.test(s) || /[\s>+~]/.test(s.replace(/\([^)]*\)/g, ''))) continue;
    const cls = [...s.matchAll(/\.([\w-]+)/g)].map(m => m[1]); if (cls.length && cls.every(c => flags.includes(c))) say(`стиль «${s}» ложится на сам <html>: его класс — флаг арта`);
  }
  for (const f of flags) if (new RegExp(`class="(?:[^"]*\\s)?${f}(?:\\s[^"]*)?"`).test(game)) say(`флаг арта ${f} совпал с классом элемента в разметке`);
  /* без арта — CSS: ни одной ссылки на выгрузку, флагов нет */
  const B = load({ noArt: true }); reset(B);
  const g0 = draw(B, 'без арта');
  if (/assets\/art\/(shelter|shell)\//.test(g0)) say('без арта: в разметке есть ссылка на shelter/ или shell/');
  if ([...B.rootCls].some(c => /^(sha|shla)-/.test(c))) say(`без арта: у <html> флаги ${[...B.rootCls].filter(c => /^(sha|shla)-/.test(c)).join(', ')}`);
}

/* ================== 6. движение ================== */
{
  for (const f of ['screens/shelter.css', 'screens/shell.css']) {
    const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
    const frames = {};
    for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) frames[m[1]] = m[2];
    for (const [n, body] of Object.entries(frames)) {
      cnt.frames++;
      const bad = [...new Set([...body.matchAll(/([\w-]+)\s*:/g)].map(m => m[1]).filter(p => !ANIM.includes(p)))];
      if (bad.length) say(`${f}: кадры ${n} меняют ${bad.join(', ')} — можно только transform и opacity`);
    }
    for (const r of CC.parseCss(read(f), f)) {
      const d = Object.fromEntries(r.decls.map(x => [x.p, x.v]));
      const an = d.animation || d['animation-name'];
      if (an && !/^none/.test(an)) {
        for (const part of splitTop(an)) { const nm = part.split(/\s+/).find(t => frames[t]) || part.split(/\s+/)[0]; if (!frames[nm] && !/^[\d.]/.test(nm)) say(`${f} «${r.sel}»: нет кадров ${nm}`); }
        if (/infinite/.test(an) && !/var\(--t/.test(an + (d['animation-delay'] || ''))) say(`${f} «${r.sel}»: повторяющаяся анимация без фазы --t — перерисовка начнёт её заново`);
      }
      if (d.transition) for (const part of splitTop(d.transition)) { const p = part.split(/\s+/)[0]; if (!TRANS.includes(p) && p !== 'none') say(`${f} «${r.sel}»: переход «${p}» — движение только transform и opacity, свет — фильтр и тень`); }
    }
    if (f === 'screens/shelter.css' && !/@media\(prefers-reduced-motion:reduce\)\{\.sh\*,[^{]*\{animation:none!important/.test(css.replace(/\s+/g, ''))) say('shelter.css: «меньше движения» не выключает анимации Убежища');
  }
}

/* ================== 7. оболочка: украшения без перемен в вёрстке ================== */
{
  reset(A); A.T.S.route = 'craft';
  const g = draw(A, 'оболочка');
  const SHELL = ['g-top', 'g-rail', 'g-nav', 'nv', 'pic', 'lbl', 'g-ava', 'ring', 'g-wallet', 'g-cur', 'g-plus', 'g-icon', 'g-seg', 'g-title', 'g-back', 'g-main'];
  const LAYOUT = ['display', 'width', 'height', 'min-width', 'min-height', 'max-width', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom',
    'margin-left', 'gap', 'font-size', 'line-height', 'letter-spacing', 'flex-grow', 'flex-shrink', 'flex-basis', 'top', 'left', 'right', 'bottom', 'border-top-width', 'grid-template-columns', 'grid-template-rows'];
  for (const X of FRAMES) {
    const w = X.w - (X.small ? G.railS : G.rail), hh = X.h - (X.small ? G.topS : G.top);
    const env = { w: X.w, h: X.h, reduced: false, hover: false, containers: { main: [w, hh] } };
    const r1 = tree(X.small, g, A.rootCls), r0 = tree(X.small, g, A.rootCls), C1 = new CC.Cascade(RULES, env), C0 = new CC.Cascade(RULES0, env);
    const e1 = CC.q(r1, e => SHELL.some(c => e.cls.has(c))), e0 = CC.q(r0, e => SHELL.some(c => e.cls.has(c)));
    if (e1.length < 20) say(`оболочка ${X.n}: элементов оболочки в разметке ${e1.length} — разметка не та`);
    e1.forEach((e, i) => { for (const p of LAYOUT) { cnt.cascade++; const a = C1.value(e, p), b = C0.value(e0[i], p); if (String(a) !== String(b)) { say(`оболочка ${X.n}: у .${[...e.cls].join('.')} «${p}» с shell.css — ${a}, без него — ${b}`); } } });
  }
  /* сами элементы оболочки: position — только relative (без сдвига), смещений нет; украшения-псевдоэлементы — абсолютные и не ловят нажатия */
  for (const r of CC.parseCss(read('screens/shell.css'), 'screens/shell.css')) {
    const d = Object.fromEntries(r.decls.map(x => [x.p, x.v]));
    if (!r.sels.some(x => x.parts.some(pp => pp.comp.pe))) {
      if (d.position && d.position !== 'relative') say(`shell.css «${r.sel}»: position ${d.position} у элемента оболочки — вёрстка сдвинется`);
      for (const p of ['top', 'left', 'right', 'bottom', 'inset']) if (p in d) say(`shell.css «${r.sel}»: смещение ${p} у элемента оболочки`);
      continue;
    }
    if (!('content' in d)) continue;
    if (d.position !== 'absolute' || d['pointer-events'] !== 'none') say(`shell.css «${r.sel}»: украшение не position: absolute и pointer-events: none`);
  }
  const V2 = T.SHL.VIEW; for (const [k, pair] of [['edge', V2.edge], ['knot', V2.knot]]) for (const v of pair) if (!Number.isInteger(v) || v <= 0 || v > G.topS) say(`SHL_VIEW.${k}: ${v} px — не целое или больше шапки`);
}

/* ================== 8. режим «Игрок» и UI-кит ================== */
{
  const service = (where, h0) => { const t = playerText(h0); for (const [n, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное — ${n}: «${t.slice(Math.max(0, m.index - 30), m.index + 30)}»`); } };
  reset(A); run('режим «Игрок»', () => T.setTeam(false));
  service('Убежище', mainOf(draw(A, 'Убежище · игрок')));
  for (const team of [false, true]) {
    run('режим', () => T.setTeam(team));
    for (const [name, id] of [['Убежище: сцена и вещи', 'kitShelter'], ['Оболочка: кованые кромки', 'kitShellDecor']]) {
      const K = T.KIT_EXTRA.find(x => { try { return x.html().includes(`id="${id}"`); } catch (_) { return false; } });
      if (!K) { say(`UI-кит: нет раздела «${name}»`); continue; }
      const k = run(`UI-кит «${name}»`, () => K.html()) || '';
      const m = k.match(BAD); if (m) say(`UI-кит «${name}»: undefined или NaN — «${m[0]}»`);
      if (!team) service(`UI-кит «${name}»`, strip(k));
    }
  }
  run('режим «Игрок»', () => T.setTeam(false));
}

done();
