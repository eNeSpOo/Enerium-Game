/* Автопроверка разговора с проводником Убежища (design/ui/screens/talk.js и talk.css, §28.2 GDD) — без браузера.
   1. Файлы: index.html подключает screens/talk.css и screens/talk.js; файлы компилируются; концы строк talk.js и talk.css — CRLF;
      прежнего диалога в index.html нет — ни talkView, ни стилей .talk, ни действий npc, talkmore, talkgo: окно и действия
      регистрирует talk.js; focusOverlay ведёт к первому ответу; карта экранов отмечает разговор готовым (ready: npc-dialog).
   2. Каждый проводник NPCS: ACT.npc открывает окно и снимает «новый разговор»; окно рисуется без исключений, undefined и NaN:
      корень — role=dialog и aria-modal, имя и роль на табличке с гербом, фигура — картинка проводника двумя слоями (грудь и полы),
      реплика — целиком для чтения с экрана и по буквам для глаз; ответы по порядку: «Расскажи больше», пока есть реплики, переход
      к заданию — главный, «Вернуться в Убежище» — последний и вторичный; номера 1…N — в медальонах и в data-k.
   3. Реплики листаются: «Расскажи больше» ведёт до последней, на ней кнопки нет; ромбы — по реплике, горит текущая; нажатие
      на последней ничего не меняет.
   4. Печать: у каждой буквы отметка --t, отметки растут, на знаках — паузы, реплика печатается не дольше потолка; нажатие
      (tkskip) — реплика целиком: класс typed, букв нет; время вышло — тоже целиком; следующая реплика печатается снова.
      Клавиши: Enter и пробел во время печати — целиком, после — не перехватываются; цифры — ответы; Esc — в Убежище.
   5. Переходы: talkgo ведёт к заданию проводника — маршрут, сегмент или окно Памяти; чужой переход не выполняется; talkbye —
      в Убежище без окна. Уход в песочнице — сразу (элемента сцены нет), в браузере — через TK_VIEW.out.
   6. «Меньше движения»: при prefers-reduced-motion — класс still, реплика целиком без букв, печати нет; CSS выключает анимации
      сцены и держит частицы видимыми на их пути.
   7. Игрок: на всех репликах всех проводников нет служебных слов (SERVICE из check_player_view.js); команде — метка «демо-реплика».
   8. CSS: в кадрах и переходах — только transform и opacity; вход и уход есть. Вёрстка расчётом на 932 × 430 и 844 × 390:
      ответ — не ниже 44 px, три ответа и реплика в три строки помещаются, самая длинная демо-реплика — без прокрутки; фигура
      в своей колонке, верх фигуры в верхней части кадра (картинки проводников читаются здесь же — PNG разбирается zlib), пояс
      между верхом и ногами, ноги за нижним краем; табличка с самым длинным именем и ролью уже колонки.
   9. Арт: каждый путь TK_ART.ready лежит в assets/art и есть в tools/art-gen/ui-art.json; без выгрузки — ни одной ссылки
      на talk/: медальоны, гербы и уголки — CSS и SVG.
  10. UI-кит: раздел «Диалог проводника» (KIT_EXTRA) рисуется в обоих режимах, paint не падает; сценарии «Разговор …»
      выполняются и рисуют окно.
   Запуск: node tools/content-gen/screens/check_talk.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, lines: 0, keys: 0, moves: 0 };
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Разговор: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; реплик ${cnt.lines}, клавиш ${cnt.keys}, переходов ${cnt.moves}.`);
  console.log('Проверка пройдена: у каждого проводника окно во весь экран — сцена, фигура в два слоя, реплика по буквам с пропуском, ответы-медальоны в порядке §28.2, переходы и уход; без движения — сразу целиком; игроку — без служебного; вёрстка на 932 × 430 и 844 × 390; арт выгружен или заменён CSS.');
  process.exit(0);
}

/* ================== ДАННЫЕ ПРОВЕРКИ ================== */
const FRAMES = [[932, 430], [844, 390]];   // экраны прототипа, px
const TOUCH = 44;                           // зона нажатия ответа — не меньше, px
const MIN_LINES = 3;                        // реплика в три строки помещается без прокрутки
const CHAR_EM_D = 0.5;                      // ширина буквы Cormorant Garamond 500 в em — с запасом для кириллицы
const CHAR_EM_U = 0.62;                     // ширина буквы метки PT Sans Narrow Bold заглавными в em — как в check_shell.js
const HEAD_MAX = 16;                        // верх фигуры проводника (голова, у Алхимика — посох) — не ниже стольких % высоты кадра
const ANIM_PROPS = ['transform', 'opacity'];
const MORE = 'Расскажи больше', BYE = 'Вернуться в Убежище';

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const main = scripts.find(s => !s.src && /function initialState\(/.test(s.code)) || { code: '' };
{
  const iMain = scripts.findIndex(s => !s.src && /function initialState\(/.test(s.code)), iT = scripts.findIndex(s => s.src === 'screens/talk.js');
  if (iT < 0) say('index.html: не подключён screens/talk.js');
  else if (iT < iMain) say('index.html: screens/talk.js подключён раньше основного скрипта');
  if (!/<link rel="stylesheet" href="screens\/talk\.css">/.test(html)) say('index.html: не подключён screens/talk.css');
  for (const f of ['screens/talk.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
  for (const f of ['screens/talk.js', 'screens/talk.css']) {
    const b = fs.readFileSync(path.join(UI, f)).toString('latin1'), crlf = (b.match(/\r\n/g) || []).length, lf = (b.match(/\n/g) || []).length;
    if (crlf !== lf) say(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`);
  }
  if (/\btalkView\b/.test(html)) say('index.html: остался прежний talkView — окно рисует screens/talk.js');
  if (/(^|[}\s])\.talk[\s{.]/m.test((html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '')) say('index.html: остались стили .talk — они в screens/talk.css');
  if (/^\s*(?:npc|talkmore|talkgo)\s*\(/m.test(main.code)) say('index.html: в ACT остались npc, talkmore или talkgo — их регистрирует screens/talk.js');
  if (!/function focusOverlay\(\)[^\n]*\.g \.tk-a/.test(main.code)) say('index.html: focusOverlay не ведёт к первому ответу разговора (.tk-a)');
  const card = main.code.match(/\{ n: 'Убежище'[\s\S]*?\}/);
  if (!card || !/ready:\s*\[[^\]]*'npc-dialog'/.test(card[0])) say('карта экранов: у «Убежища» разговор (npc-dialog) не отмечен готовым');
}
if (err.length) done();

/* ================== песочница ==================
   часы — свои: NOW двигает проверка; reduced — prefers-reduced-motion; ready — какие пути арта считать выгруженными */
function load(o = {}) {
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, prepend() {}, remove() {},
      animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), getClientRects: () => [1], scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
    e.querySelector = () => stubEl();
    return e;
  };
  const rootCls = new Set(), root = stubEl('html');
  root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
  const els = {}, clock = { now: 100000 }, keys = [];
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), baseURI: 'file:///ui/index.html',
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener(t, f, c) { if (t === 'keydown') keys.push({ f, capture: !!c }); }, removeEventListener() {}, dispatchEvent() {},
    matchMedia: q => ({ matches: !!o.reduced && /reduced-motion/.test(q), addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => clock.now }, URL };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; }, ACT, OV, SCREENS, NPCS, KH, KIT_EXTRA, FLOWS, render, initialState, setTeam, AV, ART, PATH,
    TK: typeof TK_VIEW !== 'undefined' ? { VIEW: TK_VIEW, CAST: TK_CAST, DEF: TK_DEF, TONE: TK_TONE, TEXT: TK_TEXT, ART: TK_ART, plan: tkPlan, answers: tkAnswers,
      typing: tkTyping, keyAct: tkKeyAct, key: tkKey, cast: tkCast, html: tkHtml } : null,
  })`, ctx);
  if (T.TK && o.ready) T.TK.ART.ready.splice(0, T.TK.ART.ready.length, ...o.ready);
  return { T, els, ctx, clock, keys, game: () => (els.game ? els.game.innerHTML : '') };
}
const A = load();
if (err.length) done();
const { T } = A;
if (!T.TK) { say('screens/talk.js: нет TK_VIEW, TK_CAST, tkPlan и других — файл не выполнился'); done(); }
if (typeof T.OV.npc !== 'function') say('screens/talk.js: окно OV.npc не зарегистрировано');
for (const a of ['npc', 'talkmore', 'talkgo', 'talkbye', 'tkskip']) if (typeof T.ACT[a] !== 'function') say(`screens/talk.js: нет действия ACT.${a}`);
if (!A.keys.some(k => k.capture)) say('screens/talk.js: клавиши не слушаются на фазе перехвата — общий Esc закрыл бы окно без ухода');
if (err.length) done();

const BAD = /.{0,60}(?:undefined|NaN|\[object ).{0,40}/;
const esc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const reset = X => { X.T.S = X.T.initialState(); X.T.S.overlay = null; X.T.S.route = 'shelter'; };
const draw = (X, where) => { run(where, () => X.T.render()); cnt.views++; const h = X.game(); const m = h.match(BAD); if (m) say(`${where}: в разметке undefined, NaN или [object — «${m[0]}»`); return h; };
const talkOf = h => { const i = h.indexOf('<div class="tk'); return i < 0 ? '' : h.slice(i); };
const answersOf = h => [...h.matchAll(/<button class="tk-a ([^"]*)" data-a="([^"]*)"(?: data-v="([^"]*)")? data-k="(\d)"[^>]*>([\s\S]*?)<\/button>/g)]
  .map(m => ({ cls: m[1], a: m[2], v: m[3] || '', k: m[4], medal: /<span class="tk-k[^"]*"[^>]*>(?:<img [^>]*>)?<b>(\d)<\/b><\/span>/.exec(m[5]), t: (/<span class="tk-t">([^<]*)<\/span>/.exec(m[5]) || [])[1] }));
const glyphsOf = h => [...h.matchAll(/<i style="--t:(\d+)">([^<]*)<\/i>/g)].map(m => ({ t: +m[1], c: m[2] }));
const service = (where, h) => {
  cnt.player++;
  const t = playerText(h), tips = [...strip(h).matchAll(/\s(?:title|placeholder)="([^"]*)"/g)].map(m => m[1]).join('\n');
  for (const [what, re] of SERVICE) { const m = (t + '\n' + tips).match(re); if (m) say(`${where}: игроку видно служебное — ${what}: «${m[0]}»`); }
};
const keys = Object.keys(T.NPCS);
if (keys.length < 4) say(`NPCS: проводников ${keys.length}, ждали не меньше четырёх — Энцо, Кузнец, Алхимик, Хранитель знаний`);
for (const k of keys) if (!T.TK.CAST[k]) say(`TK_CAST: у проводника «${T.NPCS[k].n}» нет кадра и герба — рисуется по умолчанию`);

/* ================== 2–5. каждый проводник ================== */
function expectAnswers(where, h, n, i) {
  const got = answersOf(h), last = i >= n.say.length - 1;
  const want = (last ? [] : [{ a: 'talkmore', t: MORE, cls: 'more' }]).concat(n.go ? [{ a: 'talkgo', t: n.go[1], v: n.go[0], cls: 'go' }] : [], [{ a: 'talkbye', t: BYE, cls: 'back' }]);
  if (got.length !== want.length) { say(`${where}: ответов ${got.length}, ждали ${want.length}`); return got; }
  want.forEach((w, j) => {
    const g = got[j], num = String(j + 1);
    if (g.a !== w.a || g.t !== esc(w.t)) say(`${where}: ответ ${num} — «${g.t}» (${g.a}), ждали «${w.t}» (${w.a})`);
    if (w.v != null && g.v !== esc(w.v)) say(`${where}: переход ответа ${num} — «${g.v}», ждали «${w.v}»`);
    if (!g.cls.split(' ').includes(w.cls)) say(`${where}: у ответа ${num} нет класса ${w.cls}`);
    if (g.k !== num || !g.medal || g.medal[1] !== num) say(`${where}: номер ответа ${num} — data-k ${g.k}, в медальоне ${g.medal ? g.medal[1] : 'нет'}`);
  });
  if (n.go && !/<img class="tk-p" src="[^"]+path-\d\d\.jpg"/.test(h)) say(`${where}: у главного ответа нет значка пути`);
  return got;
}
for (const k of keys) {
  const n = T.NPCS[k], X = A, where = `«${n.n}»`;
  reset(X); T.setTeam(false);
  n.isNew = true;
  run(where + ' · открыть', () => T.ACT.npc(k));
  const o = T.S.overlay;
  if (!o || o.t !== 'npc' || o.arg !== k || o.i !== 0) { say(`${where}: ACT.npc не открыл разговор`); continue; }
  if (n.isNew) say(`${where}: «новый разговор» не снят — дело шахты осталось`);
  if (!Number.isInteger(o.at) || !Number.isInteger(o.lineAt) || o.lineAt - o.at !== T.TK.VIEW.firstLine) say(`${where}: отметки входа и печати — ${o.at}, ${o.lineAt}`);
  let h = talkOf(draw(X, where));
  if (!h) { say(`${where}: окно не нарисовано`); continue; }
  if (!/^<div class="tk[^"]*" role="dialog" aria-modal="true" aria-labelledby="tkName" data-a="tkskip" data-npc="/.test(h)) say(`${where}: корень окна — не модальный диалог с пропуском печати по нажатию`);
  if (!h.includes(`<b id="tkName">${esc(n.n)}</b><small>${esc(n.role)}</small>`)) say(`${where}: на табличке нет имени и роли`);
  if (!/<div class="tk-plate"><span class="tk-crest[^"]*"/.test(h)) say(`${where}: у таблички нет герба`);
  if (!h.includes(`<img class="tk-up" src="${n.img}"`) || !h.includes(`<img class="tk-lo" src="${n.img}"`)) say(`${where}: фигура не в два слоя — грудь и полы`);
  if (!/class="tk-room" src="[^"]*shelter-room\.jpg"/.test(h)) say(`${where}: за спиной не Убежище`);
  if ((h.match(/class="tk-orn (?:tl|tr|bl|br)"/g) || []).length !== 4) say(`${where}: у рамки реплики не четыре уголка`);
  if ((h.match(/<i style="--x:/g) || []).length + (h.match(/<i class="sp" style="--x:/g) || []).length !== T.TK.VIEW.dust + T.TK.VIEW.sparks) say(`${where}: частиц не ${T.TK.VIEW.dust + T.TK.VIEW.sparks}`);
  if (!/--tone:\d+,\d+,\d+;/.test(h)) say(`${where}: нет тона света`);
  if (!/class="[^"]*team-only[^"]*tk-tm"|class="team-only chip tk-tm"/.test(h)) say(`${where}: нет метки команды «демо-реплика»`);
  /* реплики по порядку */
  for (let i = 0; i < n.say.length; i++) {
    const w = `${where} · реплика ${i + 1}`;
    if (i) {
      A.clock.now += 50;
      run(w + ' · дальше', () => T.ACT.talkmore());
      if (T.S.overlay.i !== i || T.S.overlay.lineAt !== A.clock.now || T.S.overlay.typed != null) say(`${w}: «Расскажи больше» не перелистнул — i ${T.S.overlay.i}, печать с ${T.S.overlay.lineAt}`);
      h = talkOf(draw(X, w));
    }
    cnt.lines++;
    const line = n.say[i];
    if (!h.includes(`<span class="sr">${esc(line)}</span>`)) say(`${w}: реплика не целиком для чтения с экрана`);
    const g = glyphsOf(h);
    if (g.map(x => x.c).join('') !== esc(line.replace(/ /g, ''))) say(`${w}: буквы не складываются в реплику`);
    if (g.some((x, j) => j && x.t <= g[j - 1].t)) say(`${w}: отметки букв не растут`);
    const pl = T.TK.plan(line);
    if (pl.total > Math.max(T.TK.VIEW.typeMax, pl.step * [...line].length * 2) + T.TK.VIEW.glyph + 400) say(`${w}: печать ${pl.total} мс — дольше потолка`);
    const dot = [...line].findIndex((c, j) => c === '.' && [...line][j + 1] === ' ');
    if (dot >= 0) { const gi = [...line].slice(0, dot + 1).filter(c => c !== ' ').length - 1; if (g[gi + 1] && g[gi + 1].t - g[gi].t < pl.step * 2) say(`${w}: после точки нет паузы`); }
    if (!/class="tk-gl"/.test(h) || /^<div class="tk[^"]*\btyped\b/.test(h)) say(`${w}: печать не идёт с начала реплики`);
    const pg = (h.match(/<span class="tk-pg"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || '';
    if (n.say.length > 1) {
      const dots = pg.match(/<i[ >][^>]*>/g) || [];
      if (dots.length !== n.say.length || (pg.match(/class="on"/g) || []).length !== 1 || !/class="on"/.test(dots[i] || '') || dots.slice(0, i).some(d => !/class="was"/.test(d))) say(`${w}: ромбы реплик не на месте`);
    } else if (pg) say(`${w}: ромбы у проводника с одной репликой`);
    expectAnswers(w, h, n, i);
    service(w, h);
  }
  const last = T.S.overlay.i;
  run(where + ' · дальше на последней', () => T.ACT.talkmore());
  if (T.S.overlay.i !== last) say(`${where}: «Расскажи больше» на последней реплике перелистнул дальше`);

  /* печать: пропуск нажатием, время, клавиши */
  reset(X); run(where + ' · открыть заново', () => T.ACT.npc(k));
  const o2 = T.S.overlay;
  if (!T.TK.typing(o2)) say(`${where}: сразу после входа печать не идёт`);
  const ka = x => { cnt.keys++; return run(`${where} · клавиша ${x}`, () => T.TK.keyAct(x, T.S.overlay)); };
  const e1 = ka('Enter'), e2 = ka(' ');
  if (!e1 || e1.a !== 'tkskip' || !e2 || e2.a !== 'tkskip') say(`${where}: Enter и пробел во время печати не показывают реплику целиком`);
  const an = T.TK.answers(k, o2);
  an.forEach(a => { const x = ka(a.key); if (!x || x.a !== a.act || x.v !== a.v) say(`${where}: цифра ${a.key} — не «${a.t}»`); });
  if (ka(String(an.length + 1))) say(`${where}: лишняя цифра ${an.length + 1} что-то делает`);
  const es = ka('Escape'); if (!es || es.a !== 'talkbye') say(`${where}: Esc — не в Убежище`);
  run(where + ' · пропуск', () => T.ACT.tkskip());
  if (T.S.overlay.typed !== 0) say(`${where}: нажатие не показало реплику целиком`);
  h = talkOf(draw(X, where + ' · после пропуска'));
  if (!/^<div class="tk[^"]*\btyped\b/.test(h) || /class="tk-gl"/.test(h) || !h.includes(`<p class="tk-say" aria-live="polite">${esc(n.say[0])}</p>`)) say(`${where}: после пропуска реплика не целиком`);
  if (/class="tk-more"/.test(h)) say(`${where}: после пропуска остался знак «дальше печать»`);
  if (T.TK.typing(T.S.overlay) || ka('Enter')) say(`${where}: после пропуска Enter всё ещё перехватывается`);
  if (n.say.length > 1) {
    run(where + ' · дальше после пропуска', () => T.ACT.talkmore());
    h = talkOf(draw(X, where + ' · вторая реплика'));
    if (!/class="tk-gl"/.test(h) || !T.TK.typing(T.S.overlay)) say(`${where}: следующая реплика не печатается заново`);
  }
  reset(X); run(where + ' · время', () => T.ACT.npc(k));
  A.clock.now = T.S.overlay.lineAt + T.TK.plan(n.say[0]).total + 1;
  h = talkOf(draw(X, where + ' · печать закончилась'));
  if (T.TK.typing(T.S.overlay) || !/^<div class="tk[^"]*\btyped\b/.test(h)) say(`${where}: время печати вышло, а реплика не целиком`);
  if (!/--left:0ms/.test(h)) say(`${where}: после печати осталось время печати`);

  /* переходы */
  reset(X); run(where + ' · к заданию', () => T.ACT.npc(k));
  run(where + ' · чужой переход', () => T.ACT.talkgo('echo'));
  if (!T.S.overlay || T.S.overlay.t !== 'npc' || T.S.route !== 'shelter') say(`${where}: чужой переход выполнился`);
  if (n.go) {
    const [to] = n.go, [r, sg] = to.split(':');
    run(where + ' · ' + to, () => T.ACT.talkgo(to));
    cnt.moves++;
    if (to === 'mem') { if (!T.S.overlay || T.S.overlay.t !== 'mem') say(`${where}: «${n.go[1]}» не открыл окно Памяти`); if (typeof T.OV.mem !== 'function') say('OV.mem не зарегистрирован — окно Памяти (screens/wanderer.js)'); }
    else {
      if (T.S.route !== r || T.S.overlay) say(`${where}: «${n.go[1]}» ведёт на «${T.S.route}», окно ${T.S.overlay ? 'осталось' : 'закрыто'}; ждали «${r}» без окна`);
      if (sg && T.S.seg[r] !== sg) say(`${where}: «${n.go[1]}» не выбрал сегмент «${sg}»`);
      if (!T.SCREENS[r]) say(`${where}: маршрута «${r}» нет`);
    }
    draw(X, where + ' · после перехода');
  }
  reset(X); run(where + ' · в Убежище', () => T.ACT.npc(k));
  run(where + ' · вернуться', () => T.ACT.talkbye());
  cnt.moves++;
  if (T.S.overlay || T.S.route !== 'shelter') say(`${where}: «${BYE}» не закрыл разговор`);

  /* команда: метка «демо-реплика» видна */
  reset(X); T.setTeam(true); run(where + ' · команда', () => T.ACT.npc(k));
  h = talkOf(draw(X, where + ' · команда'));
  if (!/team-only[^"]*tk-tm">демо-реплика</.test(h)) say(`${where}: в режиме «Команда» нет метки «демо-реплика»`);
  T.setTeam(false);
}

/* ================== 6. без движения ================== */
{
  const R = load({ reduced: true });
  for (const k of Object.keys(R.T.NPCS)) {
    reset(R); run(`без движения · ${k}`, () => R.T.ACT.npc(k));
    const h = talkOf(draw(R, `без движения · ${k}`));
    if (!/^<div class="tk still typed\b/.test(h)) say(`без движения · ${k}: нет классов still и typed`);
    if (/class="tk-gl"|class="tk-more"|class="tk-sheen"/.test(h)) say(`без движения · ${k}: реплика печатается или блестит`);
    if (R.T.TK.typing(R.T.S.overlay) || R.T.TK.keyAct('Enter', R.T.S.overlay)) say(`без движения · ${k}: печать идёт`);
    run(`без движения · ${k} · уход`, () => R.T.ACT.talkbye());
    if (R.T.S.overlay) say(`без движения · ${k}: уход не сразу`);
  }
}

/* ================== 8. CSS: кадры и вёрстка расчётом ================== */
const css = read('screens/talk.css'), flat = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '');
{
  for (const m of flat.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g))
    for (const d of m[2].matchAll(/([a-z-]+)\s*:/g)) if (!ANIM_PROPS.includes(d[1])) say(`talk.css: кадр ${m[1]} меняет ${d[1]} — только transform и opacity`);
  /* переходы: запятые внутри cubic-bezier() — не разделители; !important — не свойство */
  for (const m of flat.matchAll(/transition\s*:\s*([^;}]+)/g)) for (const part of m[1].replace(/\([^)]*\)/g, '').replace(/!important/g, '').split(',')) { const p = part.trim().split(/\s+/)[0]; if (p !== 'none' && !ANIM_PROPS.includes(p)) say(`talk.css: переход по ${p} — только transform и opacity`); }
  for (const [what, re] of [['вход сцены', /\.tk-bg\{[^}]*animation:tkFade/], ['вход проводника', /\.tk-who\{[^}]*animation:tkWho/], ['вход реплики', /\.tk-box\{[^}]*animation:tkRise/],
    ['вход ответов', /\.tk-a\{[^}]*animation:tkSlide/], ['дыхание', /\.tk-up\{[^}]*animation:tkBreath/], ['полы', /\.tk-lo\{[^}]*animation:tkSway/], ['печать', /\.tk-gl i\{[^}]*animation:tkGlyph/],
    ['уход', /\.tk\.out \.tk-who\{animation:tkWhoOut/], ['без движения', /\.tk\.still \*[^{]*\{animation:none!important/],
    ['prefers-reduced-motion', /@media \(prefers-reduced-motion:reduce\)\{\.tk \*[^{]*\{animation:none!important/], ['пропуск печати', /\.tk\.typed \.tk-gl i\{animation:none;opacity:1\}/]])
    if (!re.test(flat)) say(`talk.css: нет правила — ${what}`);
}
/* правило целиком: основное или из @container для низкого экрана */
const rule = (sel, src = flat) => { const m = src.match(new RegExp('(?:^|[};])' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')); return m ? m[1] : ''; };
const low = (flat.match(/@container tk \(max-height:(\d+)px\)\{((?:[^{}]*\{[^{}]*\})*)\}/) || []);
const lowH = +low[1] || 0, lowCss = low[2] || '';
const px = (body, prop) => { const m = body.match(new RegExp(`(?:^|;)${prop}:(-?\\d+(?:\\.\\d+)?)px`)); return m ? +m[1] : NaN; };
const pct = (body, prop) => { const m = body.match(new RegExp(`(?:^|;)${prop}:(-?\\d+(?:\\.\\d+)?)%`)); return m ? +m[1] : NaN; };
const pad = body => { const m = body.match(/(?:^|;)padding:(\d+)px (\d+)px (\d+)px (\d+)px/); return m ? m.slice(1).map(Number) : [NaN, NaN, NaN, NaN]; };
const font = body => { const m = body.match(/font:\d+ (\d+(?:\.\d+)?)px\/(\d+(?:\.\d+)?)/); return m ? [+m[1], +m[2]] : [NaN, NaN]; };
function layout(H) {
  const small = lowH && H <= lowH, pick = (sel, get) => { const v = small ? get(rule(sel, lowCss)) : NaN; return Array.isArray(v) ? (v.some(x => !Number.isNaN(x)) ? v : get(rule(sel))) : Number.isNaN(v) ? get(rule(sel)) : v; };
  const side = pick('.tk-side', pad), sideGap = pick('.tk-side', b => px(b, 'gap')), box = pick('.tk-box', pad);
  const f0 = font(rule('.tk-say')), fs = small && px(rule('.tk-say', lowCss), 'font-size') || f0[0], lh = small && +((rule('.tk-say', lowCss).match(/line-height:(\d+(?:\.\d+)?)/) || [])[1]) || f0[1];
  const foot = px(rule('.tk-foot'), 'min-height') + px(rule('.tk-foot'), 'margin-top'), aH = px(rule('.tk-a'), 'min-height'), aGap = px(rule('.tk-ans'), 'gap');
  const sideW = pct(rule('.tk-side'), 'width'), whoW = pct(rule('.tk-who'), 'width'), scrollPad = px(rule('.tk-scroll'), 'padding-right') || 0;
  const crest = pick('.tk-crest', b => px(b, 'width')), crestM = pick('.tk-crest', b => px(b, 'margin-right')), nm = pad(rule('.tk-nm')), nmF = small && px(rule('.tk-nm b', lowCss), 'font-size') || font(rule('.tk-nm b'))[0];
  const roleF = font(rule('.tk-nm small'))[0], roleTrack = +((rule('.tk-nm small').match(/letter-spacing:(\.?\d+(?:\.\d+)?)em/) || [])[1]);
  return { side, sideGap, box, fs, lh, foot, aH, aGap, sideW, whoW, scrollPad, crest, crestM, nm, nmF, roleF, roleTrack };
}
/* перенос по словам: сколько строк займёт реплика при ширине в столько букв */
const wrapLines = (line, perLine) => { let n = 1, cur = 0; for (const w of line.split(' ')) { const l = [...w].length; if (cur && cur + 1 + l > perLine) { n++; cur = l; } else cur += (cur ? 1 : 0) + l; } return n; };
/* PNG: разбор zlib — высота головы и низ фигуры по альфе */
function pngAlphaRows(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.toString('latin1', 1, 4) !== 'PNG') return null;
    let o = 8, W = 0, Hh = 0, depth = 0, type = 0, inter = 0; const idat = [];
    while (o < b.length) {
      const len = b.readUInt32BE(o), tp = b.toString('latin1', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
      if (tp === 'IHDR') { W = d.readUInt32BE(0); Hh = d.readUInt32BE(4); depth = d[8]; type = d[9]; inter = d[12]; }
      else if (tp === 'IDAT') idat.push(d);
      else if (tp === 'IEND') break;
      o += 12 + len;
    }
    if (depth !== 8 || type !== 6 || inter) return null;
    const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = 4, stride = W * bpp, out = Buffer.alloc(Hh * stride);
    for (let y = 0; y < Hh; y++) {
      const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = out.subarray(y * stride, (y + 1) * stride), up = y ? out.subarray((y - 1) * stride, y * stride) : null;
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? row[x - bpp] : 0, u = up ? up[x] : 0, c = up && x >= bpp ? up[x - bpp] : 0;
        let v = src[x];
        if (f === 1) v += a; else if (f === 2) v += u; else if (f === 3) v += (a + u) >> 1;
        else if (f === 4) { const p = a + u - c, pa = Math.abs(p - a), pb = Math.abs(p - u), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? u : c; }
        row[x] = v & 255;
      }
    }
    let top = -1, bot = -1;
    for (let y = 0; y < Hh && top < 0; y++) for (let x = 0; x < W; x++) if (out[y * stride + x * 4 + 3] > 32) { top = y; break; }
    for (let y = Hh - 1; y >= 0 && bot < 0; y--) for (let x = 0; x < W; x++) if (out[y * stride + x * 4 + 3] > 32) { bot = y; break; }
    return { W, H: Hh, top: top / Hh * 100, bot: (bot + 1) / Hh * 100 };
  } catch (_) { return null; }
}
{
  const lines = Object.values(T.NPCS).flatMap(n => n.say), longest = lines.reduce((a, x) => (x.length > a.length ? x : a), '');
  const names = Object.values(T.NPCS);
  for (const [W, H] of FRAMES) {
    const L = layout(H), where = `вёрстка ${W} × ${H}`;
    const nums = { 'поля колонки': L.side, 'шаг колонки': L.sideGap, 'поля реплики': L.box, 'шрифт реплики': [L.fs, L.lh], 'низ реплики': L.foot, 'ответ': L.aH, 'шаг ответов': L.aGap,
      'ширина колонки': L.sideW, 'колонка фигуры': L.whoW, 'герб': [L.crest, L.crestM], 'табличка': L.nm, 'имя': L.nmF, 'роль': [L.roleF, L.roleTrack] };
    const miss = Object.entries(nums).filter(([, v]) => [].concat(v).some(x => !Number.isFinite(x))).map(([n]) => n);
    if (miss.length) { say(`${where}: не нашёл в talk.css — ${miss.join(', ')}`); continue; }
    if (L.aH < TOUCH) say(`${where}: ответ ${L.aH} px — ниже ${TOUCH}`);
    const N = 3, ansH = N * L.aH + (N - 1) * L.aGap, lineH = L.fs * L.lh;
    const boxMax = H - L.side[0] - L.side[2] - L.sideGap - ansH, textMax = boxMax - L.box[0] - L.box[2] - L.foot, fit = Math.floor(textMax / lineH);
    if (fit < MIN_LINES) say(`${where}: реплике остаётся ${Math.round(textMax)} px — меньше ${MIN_LINES} строк по ${lineH.toFixed(1)}`);
    const textW = W * L.sideW / 100 - L.side[1] - L.side[3] - L.box[1] - L.box[3] - L.scrollPad, perLine = Math.floor(textW / (L.fs * CHAR_EM_D));
    const need = wrapLines(longest, perLine);
    if (need > fit) say(`${where}: самая длинная реплика — ${need} строк при ${perLine} буквах в строке, помещается ${fit}: прокрутка`);
    const colW = W * L.whoW / 100, heads = [];
    for (const [k, n] of Object.entries(T.NPCS)) {
      const c = T.TK.cast(k), ar = c.ar || T.TK.VIEW.ar, figH = c.fig.h * H / 100, figW = figH * ar[0] / ar[1];
      if (figW > colW + 1) say(`${where}: «${n.n}» шире своей колонки — ${Math.round(figW)} из ${Math.round(colW)} px`);
      const file = n.img && n.img.includes('/art/') ? path.join(UI, 'assets', 'art', n.img.split('/art/')[1].split('?')[0]) : '';
      const P = file ? pngAlphaRows(file) : null;
      if (!P) { say(`${where}: «${n.n}» — картинку ${n.img} не прочитать`); continue; }
      const topPct = 100 + c.fig.y - c.fig.h, head = topPct + P.top * c.fig.h / 100, feet = topPct + P.bot * c.fig.h / 100;
      heads.push(`${n.n} ${head.toFixed(1).replace('.', ',')} %`);
      if (head < 0 || head > HEAD_MAX) say(`${where}: верх фигуры «${n.n}» на ${head.toFixed(1)} % высоты кадра — нужно 0–${HEAD_MAX} %`);
      if (feet < 100) say(`${where}: «${n.n}» стоит в кадре целиком — низ на ${feet.toFixed(1)} %, ждали кадр «по колено»`);
      if (c.fig.waist <= P.top || c.fig.waist >= P.bot) say(`${where}: пояс «${n.n}» (${c.fig.waist} %) не между головой и ногами`);
    }
    for (const n of names) {
      const nameW = [...n.n].length * L.nmF * CHAR_EM_D, roleW = [...n.role].length * L.roleF * (CHAR_EM_U + L.roleTrack);
      const plate = (L.crest + L.crestM) + L.nm[3] + Math.max(nameW, roleW) + L.nm[1];
      if (plate > colW) say(`${where}: табличка «${n.n} · ${n.role}» около ${Math.round(plate)} px — шире колонки ${Math.round(colW)}`);
    }
    console.log(`${where}: ответы ${ansH} px, реплике ${Math.round(textMax)} px — ${fit} строк по ${perLine} букв, самой длинной нужно ${need}; колонка фигуры ${Math.round(colW)} px; верх фигуры — ${heads.join(', ')} кадра.`);
  }
}

/* ================== 9. арт ================== */
{
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'ui-art.json'), 'utf8'));
  for (const p of T.TK.ART.ready) {
    if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`арт: ${p} в TK_ART.ready, а файла в design/ui/assets/art нет`);
    if (!spec.items[p]) say(`арт: ${p} нет в tools/art-gen/ui-art.json`);
  }
  const want = Object.keys(T.NPCS).map(k => T.TK.cast(k).crest).filter(Boolean).map(c => T.TK.ART.crest + c + '.png').concat([T.TK.ART.medal, T.TK.ART.corner]);
  const missing = want.filter(p => !T.TK.ART.ready.includes(p));
  if (missing.length) console.log(`заметка: без картинки — ${missing.join(', ')}: рисуют CSS и SVG`);
  reset(A); run('арт · открыть', () => T.ACT.npc(Object.keys(T.NPCS)[0]));
  const h = talkOf(draw(A, 'арт · с выгрузкой'));
  if (T.TK.ART.ready.includes(T.TK.ART.medal) && !h.includes(`src="${T.AV(T.TK.ART.medal)}"`)) say('арт: медальон выгружен, а ответы рисуют CSS');
  if (T.TK.ART.ready.includes(T.TK.ART.corner) && (h.match(new RegExp(`<img class="tk-orn (?:tl|tr|bl|br)" src="${T.AV(T.TK.ART.corner).replace(/[.?]/g, '\\$&')}"`, 'g')) || []).length !== 4) say('арт: уголок выгружен, а рамка — SVG');
  const B = load({ ready: [] });
  for (const k of Object.keys(B.T.NPCS)) {
    reset(B); run(`арт · без выгрузки · ${k}`, () => B.T.ACT.npc(k));
    const hb = talkOf(draw(B, `арт · без выгрузки · ${k}`));
    if (/src="[^"]*talk\//.test(hb)) say(`арт · без выгрузки · ${k}: ссылка на talk/ — битая картинка`);
    if (!/<span class="tk-k css"/.test(hb) || !/<span class="tk-crest css"[^>]*><svg viewBox/.test(hb) || (hb.match(/<svg class="tk-orn (?:tl|tr|bl|br)"/g) || []).length !== 4) say(`арт · без выгрузки · ${k}: нет запасных медальонов, герба или уголков`);
  }
}

/* ================== 10. UI-кит и сценарии ================== */
{
  const K = (T.KIT_EXTRA || []).find(x => { try { return /<h3>Диалог проводника<\/h3>/.test(x.html()); } catch (_) { return false; } });
  if (!K) say('UI-кит: нет раздела «Диалог проводника» в KIT_EXTRA');
  else for (const team of [false, true]) {
    T.setTeam(team);
    const h = run('UI-кит · раздел', () => K.html()) || '';
    const m = h.match(BAD); if (m) say(`UI-кит${team ? ' · команда' : ''}: в разметке undefined, NaN или [object — «${m[0]}»`);
    if (!/id="tkKitDev"><div class="tk peek\b/.test(h)) say('UI-кит: нет живой сцены разговора');
    if ((h.match(/<figure style="--tone:/g) || []).length !== Object.keys(T.NPCS).length) say('UI-кит: гербы не у всех проводников');
    if ((h.match(/class="tk-a [^"]*"/g) || []).length < 5 + 2) say('UI-кит: показаны не все состояния ответа');
    if (/ data-a="/.test((h.match(/id="tkKitDev">([\s\S]*?)<\/section>\s*<\/div>/) || [])[1] || '')) say('UI-кит: сцена раздела зовёт действия игры (data-a)');
    run('UI-кит · paint', () => K.paint && K.paint());
  }
  T.setTeam(false);
  const flows = (T.FLOWS || []).filter(f => /^Разговор/.test(f[0]));
  if (flows.length < 3) say(`сценарии: «Разговор …» — ${flows.length}, ждали не меньше трёх`);
  for (const [name, , f] of flows) {
    reset(A); run('сценарий ' + name, () => f());
    const h = talkOf(draw(A, 'сценарий ' + name));
    if (!h) say(`сценарий «${name}»: окно разговора не нарисовано`);
    else service('сценарий ' + name, h);
  }
}

done();
