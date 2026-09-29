/* Автопроверка «Летописи» в «Страннике» (design/ui/screens/chronicle.js) и её данных (design/ui/chronicle.js) — без браузера.
   1. Файлы: index.html подключает screens/chronicle.css, данные chronicle.js до основного скрипта и экран после screens/wanderer.js;
      файлы компилируются; концы строк экрана и стилей — CRLF; данные и черновик свежие — сборщик tools/content-gen/lore/build.js --check.
   2. Данные: разделы книги — лор и справка, бестиарий — раздел; пять городов свода и пятеро богов — по главе, у каждого своя картинка
      из задания арта tools/art-gen/jobs/chronicle.json, «Пятеро» — полосы из картинок богов; ни одна глава не ждёт цикла VI;
      с начала игры открыто не больше START_MAX глав.
   3. Спойлеры — по разделу дайджеста «Нельзя показывать раннему игроку» (tools/content-gen/lore/spoilers.js: каждое слово списка
      есть в дайджесте, в таблице §38 или в своде): ни в одном тексте игрока, ни в разметке режима «Игрок» на всех главах; Эуклида нет
      нигде в данных — даже в пометках команды; в промтах арта — ни Эуклида, ни матери, ни печати. Ложный след «мир создали
      Энтериалы» держится в главе «Пятеро».
   4. «Сервер»: CHR_SRV.open — чистая функция уровня, цикла и биома: состояние не меняет; на старте игры, в демо и в каждом цикле I–V
      открыто ровно то, что разрешают условия данных, — пересчёт здесь, независимо.
   5. Экран: вкладка «Летопись» у Странника вслед за «Обзором», «Памятью», «Артефактами» и «Достижениями»; каждый раздел и каждая
      глава рисуются в режимах «Игрок» и «Команда» без исключений, undefined и NaN; игроку — без служебных слов (SERVICE из
      check_player_view.js); открытая глава — картинка сверху, строка места, название, мысль в две строки и «ещё», если есть абзацы;
      закрытая — условие, ни мысли, ни абзацев, имя — только у богов и городов; листание — стрелки и по точке на главу раздела;
      прежний маршрут chronicle и «В Летопись» из листа врага ведут во вкладку, бестиарий — раздел книги с прежней сеткой.
   6. Картинки: пока путь не в списке выгруженного — ни одной ссылки на lore/, заглушка data:; выгруженный путь — AV('lore/…')
      с версией выгрузки; «Пятеро» — пять полос.
   7. Новые главы: дело шахты — строка NAV_TODO раздела «Странник», одна пачка; точка у вкладки; в демо-состоянии дела нет;
      открылись главы — дело и точка есть, бейдж портрета — места Памяти плюс одно дело; открыл книгу — дело снято; отметка
      «новая» у главы и точка у раздела — до прочтения; новая игра — главы старта ждут игрока одним делом.
   8. CSS: в кадрах анимаций и переходах — только transform и opacity; есть «меньше движения».
   9. UI-кит: раздел «Летопись» рисуется в обоих режимах; карта экранов отмечает готовой «Летопись» (ready: cycles); сценарии
      презентации «Летопись · …» выполняются.
   Запуск: node tools/content-gen/screens/check_chronicle.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), { spawnSync } = require('child_process');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const SP = require('../lore/spoilers.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, chapters: 0, states: 0 };
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Летопись: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; глав проверено ${cnt.chapters}, состояний «сервера» ${cnt.states}.`);
  console.log('Проверка пройдена: одна книга во вкладке «Странника», главы открывает «сервер» по уровню, циклу и стражам, закрытая глава — только условие, спойлеров дайджеста нет ни в данных, ни в разметке игрока, картинки — выгруженные или заглушки без битых ссылок, новые главы — одно дело у портрета и точка у вкладки.');
  process.exit(0);
}

/* ================== ДАННЫЕ ПРОВЕРКИ ================== */
const CITIES = ['Эндалор', 'Элайзис', 'Стоун-Хейм', 'Норден-Вильд', 'Лайтен-Гард'];   // пять городов свода, «Карта Этериоса»
const GODS = ['Виал', 'Уларион', 'Кэрон', 'Армонт', 'Рэдмунд'];                      // пятеро Энтериалов
const TABS = ['over', 'mem', 'arts', 'ach', 'chron'];                                // вкладки «Странника»: «Летопись» — вслед за прежними четырьмя
const START_MAX = 6;                                                                  // глав с начала игры: первый визит без перегруза
const ANIM_PROPS = ['transform', 'opacity'];

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const iD = scripts.findIndex(s => s.src === 'chronicle.js'), iMain = scripts.findIndex(s => !s.src && /function initialState\(/.test(s.code));
  const iW = scripts.findIndex(s => s.src === 'screens/wanderer.js'), iC = scripts.findIndex(s => s.src === 'screens/chronicle.js');
  if (iD < 0) say('index.html: не подключены данные chronicle.js');
  else if (iD > iMain) say('index.html: данные chronicle.js подключены после основного скрипта');
  if (iC < 0) say('index.html: не подключён screens/chronicle.js');
  else if (iC < iW) say('index.html: screens/chronicle.js подключён раньше screens/wanderer.js — вкладке некуда встать');
  if (!/<link rel="stylesheet" href="screens\/chronicle\.css">/.test(html)) say('index.html: не подключён screens/chronicle.css');
  for (const f of ['chronicle.js', 'screens/chronicle.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
  for (const f of ['screens/chronicle.js', 'screens/chronicle.css']) {
    const b = fs.readFileSync(path.join(UI, f)), crlf = (b.toString('latin1').match(/\r\n/g) || []).length, lf = (b.toString('latin1').match(/\n/g) || []).length;
    if (crlf !== lf) say(`${f}: концы строк не CRLF — CRLF ${crlf}, LF ${lf}`);
  }
  const b = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'content-gen', 'lore', 'build.js'), '--check'], { encoding: 'utf8' });
  if (b.status !== 0) say('сборка Летописи: ' + (b.stdout || b.stderr || '').trim().replace(/\s+/g, ' ').slice(0, 400));
}
if (err.length) done();

/* ================== песочница ================== */
function load(o = {}) {
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
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), baseURI: 'file:///ui/index.html',
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 }, URL };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
    if (s.src === 'chronicle.js' && o.ready && ctx.EN_CHRONICLE) ctx.EN_CHRONICLE.art.ready = Object.keys(ctx.EN_CHRONICLE.art.table);
  }
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; }, ACT, SCREENS, KH, KIT_EXTRA, NAV_TODO, FLOWS, render, initialState, setTeam, AV, ART_V,
    CHR_SRV: typeof CHR_SRV !== 'undefined' ? CHR_SRV : null, chrFresh: typeof chrFresh !== 'undefined' ? chrFresh : null,
    chrKitHtml: typeof chrKitHtml !== 'undefined' ? chrKitHtml : null, WN_SEG_MORE: typeof WN_SEG_MORE !== 'undefined' ? WN_SEG_MORE : null,
  })`, ctx);
  return { T, els, ctx, game: () => (els.game ? els.game.innerHTML : '') };
}
const A = load();
if (err.length) done();
const { T } = A, D = A.ctx.EN_CHRONICLE;
if (!D) { say('chronicle.js: нет window.EN_CHRONICLE'); done(); }
if (!T.CHR_SRV || !T.chrFresh) { say('screens/chronicle.js: нет «сервера» CHR_SRV или дела chrFresh'); done(); }
const reset = () => { T.S = T.initialState(); T.S.overlay = null; };
const draw = (X, where) => { run(where, () => X.T.render()); cnt.views++; const h = X.game(); if (/undefined|NaN|\[object /.test(h)) say(`${where}: в разметке undefined, NaN или [object`); return h; };
const service = (where, h) => {
  cnt.player++;
  const t = playerText(h), tips = [...strip(h).matchAll(/\s(?:title|placeholder)="([^"]*)"/g)].map(m => m[1]).join('\n');
  for (const [what, re] of SERVICE) { const m = (t + '\n' + tips).match(re); if (m) say(`${where}: игроку видно служебное — ${what}: «${m[0]}»`); }
  return t;
};
const CH = D.chapters, byId = new Map(CH.map(c => [c.id, c]));

/* ================== 2. данные ================== */
{
  const P = D.parts.map(p => p.id);
  for (const id of ['gods', 'world', 'cities', 'descent', 'self', 'best', 'mech']) if (!P.includes(id)) say(`разделы: нет «${id}»`);
  if (!D.parts.find(p => p.id === 'best').ref) say('разделы: бестиарий — не справка');
  const names = part => CH.filter(c => c.part === part).map(c => c.n);
  const cities = names('cities'); if (JSON.stringify(cities) !== JSON.stringify(CITIES)) say(`города: ${cities.join(', ')} — нужны пять городов свода: ${CITIES.join(', ')}`);
  const gods = names('gods').filter(n => n !== 'Пятеро'); if (JSON.stringify(gods) !== JSON.stringify(GODS)) say(`боги: ${gods.join(', ')} — нужны пятеро: ${GODS.join(', ')}`);
  const JOBS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'jobs', 'chronicle.json'), 'utf8'));
  for (const c of CH.filter(x => x.part === 'cities' || (x.part === 'gods' && x.id !== 'five'))) {
    if (!c.art) { say(`${c.n}: нет картинки — город или бог без вида`); continue; }
    const job = 'lore-' + c.art.replace(/^lore\//, '').replace(/\.jpg$/, '');
    if (!JOBS.jobs.some(j => j.id === job)) say(`${c.n}: нет задания арта ${job}`);
    if (!D.art.table[c.art] || !fs.existsSync(path.join(ROOT, 'art', 'generated', D.art.table[c.art]))) say(`${c.n}: в таблице выгрузки нет файла для ${c.art}`);
  }
  const five = byId.get('five');
  if (!five || !five.mosaic || five.mosaic.length !== 5 || five.mosaic.some(id => !byId.get(id) || !byId.get(id).art)) say('«Пятеро»: не пять полос из картинок богов');
  for (const c of CH) if (c.open && c.open.c > 5) say(`${c.n}: ждёт цикла ${c.open.c} — цикл VI спойлер`);
  const start = CH.filter(c => !Object.keys(c.open || {}).length);
  if (start.length > START_MAX) say(`с начала игры открыто ${start.length} глав — больше ${START_MAX}`);
  if (JSON.stringify(D).toLowerCase().includes('эуклид')) say('данные Летописи: Эуклид упомянут — его нет ни в текстах, ни в пометках');
  const [w, h] = D.art.size; if (w * 1344 !== h * 3168) say(`картинки глав: размер выгрузки ${w}×${h} — не пропорции 3168×1344`);
}

/* ================== 3. спойлеры ================== */
{
  for (const m of SP.verify()) say(m);
  const texts = c => [c.n, c.tag, c.lead, c.why].concat(c.more);
  for (const c of CH) for (const t of texts(c)) for (const x of SP.scan(t, c.part)) say(`${c.n}: спойлер «${x.hit}» — ${x.why}`);
  for (const p of D.parts) for (const x of SP.scan(p.n + ' ' + p.d)) say(`раздел ${p.n}: спойлер «${x.hit}» — ${x.why}`);
  const five = byId.get('five');
  if (!five || !/сотворили пятеро энтериалов/i.test(five.lead)) say('ложный след «мир создали Энтериалы» не держится в главе «Пятеро»');
  const JOBS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'jobs', 'chronicle.json'), 'utf8'));
  for (const j of JOBS.jobs) {
    const prompt = [JOBS.style, JOBS.negative, (JOBS.categories[j.category] || {}).frame, j.subject].join('\n');
    const m = prompt.match(SP.PROMPT_BAN); if (m) say(`арт ${j.id}: в промте «${m[0]}»`);
  }
}

/* ================== 4. «сервер» ================== */
{
  const expect = (c, s) => { const o = c.open || {}; const b = o.b ? s.biomes.find(x => x.id === o.b) : null;
    return (!o.lv || s.acc.level >= o.lv) && (!o.c || s.acc.cycle >= o.c) && (!o.b || (!!b && b.state !== 'lock')); };
  const states = [];
  reset();
  { const s = T.initialState(); s.acc.level = 1; s.acc.cycle = 1; s.biomes.forEach((b, i) => { b.state = i ? 'lock' : 'front'; }); states.push(['старт игры', s]); }
  states.push(['демо', T.initialState()]);
  for (let c = 1; c <= 5; c++) { const s = T.initialState(); s.acc.cycle = c; s.acc.level = 10 * c + 5; s.biomes.forEach(b => { b.state = b.cyc <= c ? 'done' : 'lock'; }); states.push([`цикл ${c}`, s]); }
  for (const [name, s] of states) {
    const before = JSON.stringify(s);
    const got = run(`«сервер» · ${name}`, () => T.CHR_SRV.list(s)) || [];
    if (JSON.stringify(s) !== before) say(`«сервер» · ${name}: open меняет состояние`);
    const want = CH.filter(c => expect(c, s)).map(c => c.id);
    if (JSON.stringify(got) !== JSON.stringify(want)) say(`«сервер» · ${name}: открыто ${got.join(', ')}, по условиям — ${want.join(', ')}`);
    cnt.states++;
  }
  const s0 = states[0][1];
  const start = CH.filter(c => expect(c, s0)).map(c => c.n);
  for (const n of ['Пятеро', 'Эндалор', 'Пролом богов', 'Пробуждение']) if (!start.includes(n)) say(`старт игры: закрыта «${n}» — с неё начинается книга`);
  for (const n of GODS.slice(1).concat(CITIES.slice(2))) if (start.includes(n)) say(`старт игры: «${n}» открыт раньше цикла своего бога`);
}

/* ================== 5. экран ================== */
function openBook(X, part, id) { const S = X.T.S; S.overlay = null; S.route = 'profile'; S.seg.profile = 'chron'; S.lore.sec = part; if (id) S.seg['chr_' + part] = id; }
for (const team of [false, true]) {
  const tag = team ? ' [команда]' : '';
  run('режим', () => T.setTeam(team));
  reset(); T.S.route = 'profile'; T.S.seg.profile = 'over';
  let h = draw(A, 'Странник · Обзор' + tag);
  const tabs = [...h.matchAll(/data-a="seg" data-v="profile:(\w+)"/g)].map(m => m[1]);
  if (JSON.stringify(tabs.slice(0, 4)) !== JSON.stringify(TABS.slice(0, 4)) || tabs.indexOf('chron') < 4) say(`Странник${tag}: вкладки ${tabs.join(', ')} — «Летопись» должна стоять вслед за ${TABS.slice(0, 4).join(', ')}`);
  if (!/data-v="profile:chron">Летопись/.test(h)) say(`Странник${tag}: вкладка без подписи «Летопись»`);
  for (const p of D.parts) {
    const list = CH.filter(c => c.part === p.id);
    for (const c of (list.length ? list : [null])) {
      const where = `Летопись · ${p.n}${c ? ' · ' + c.n : ''}${tag}`;
      reset(); openBook(A, p.id, c && c.id);
      h = draw(A, where);
      if (T.S.route !== 'profile' || T.S.seg.profile !== 'chron') say(`${where}: книга ушла со вкладки`);
      if (!team) {
        const t = service(where, h);
        for (const x of SP.scan(t, p.id)) say(`${where}: игроку виден спойлер «${x.hit}» — ${x.why}`);
      }
      if (!/class="pnl chr-toc"/.test(h)) { say(`${where}: нет оглавления книги`); continue; }
      for (const q of D.parts) if (!h.includes(`data-a="lore" data-v="${q.id}"`)) say(`${where}: в оглавлении нет раздела «${q.n}»`);
      if (!c) { if (!/class="bgrid"/.test(h)) say(`${where}: бестиарий без сетки биомов`); continue; }
      cnt.chapters++;
      const page = (h.match(/<article class="pnl chr-page"[\s\S]*?<\/article>/) || [''])[0];
      if (!page) { say(`${where}: нет страницы главы`); continue; }
      if (page.indexOf('chr-fig') < 0 || page.indexOf('chr-fig') > page.indexOf('chr-body')) say(`${where}: картинка не сверху`);
      const dots = (page.match(/class="chr-d[ "]/g) || []).length;
      if (list.length > 1 && (dots !== list.length || !/aria-label="Предыдущая глава"/.test(page) || !/aria-label="Следующая глава"/.test(page))) say(`${where}: листание — точек ${dots} из ${list.length} или нет стрелок`);
      const open = T.CHR_SRV.open(c, T.S) || (team && T.S.chr.all);
      const vis = team ? page : strip(page);
      if (open) {
        if (!vis.includes(`>${c.n}</h2>`)) say(`${where}: нет названия`);
        if (!vis.includes(`<span class="eyebrow">${c.tag}</span>`)) say(`${where}: нет строки места`);
        if (!vis.includes(c.lead)) say(`${where}: нет главной мысли`);
        if (c.more.length && !/<details class="lore">[\s\S]*class="more">ещё</.test(vis)) say(`${where}: абзацы не свёрнуты под «ещё»`);
        if (!/<span class="chr-p clamp">|<p class="chr-p">/.test(vis)) say(`${where}: мысль не в две строки (foldLore)`);
      } else {
        if (!vis.includes(c.why)) say(`${where}: закрытая глава без условия`);
        if (vis.includes(c.lead) || c.more.some(t => vis.includes(t))) say(`${where}: закрытая глава показывает текст`);
        if (!c.named && vis.includes(`>${c.n}</h2>`)) say(`${where}: закрытая глава раскрывает имя`);
        if (!/data-lock="1"/.test(page)) say(`${where}: закрытая глава без замка`);
      }
      /* картинка: у открытой главы с выгруженным артом — сам арт, иначе заглушка; мозаика собирает чужие картинки */
      const ready = (D.art && D.art.ready) || [];
      if (open && c.mosaic) { /* мозаика — картинки других глав: проверены на их страницах */ }
      else if (open && c.art && ready.includes(c.art)) {
        if (!page.includes(`assets/art/${c.art}`)) say(`${where}: выгруженная картинка ${c.art} не показана`);
      } else {
        if (/assets\/art\/lore\//.test(page)) say(`${where}: ссылка на невыгруженную картинку`);
        if (!/src="data:image\/svg\+xml,/.test(page)) say(`${where}: нет заглушки картинки`);
      }
    }
  }
  /* прежний маршрут и «В Летопись» из листа врага */
  reset(); T.S.route = 'chronicle'; h = draw(A, 'маршрут chronicle' + tag);
  if (T.S.route !== 'profile' || T.S.seg.profile !== 'chron' || !/class="pnl chr-toc"/.test(h)) say(`маршрут chronicle${tag}: не ведёт во вкладку «Летопись»`);
  reset(); T.S.route = 'descent'; run('В Летопись', () => T.ACT.lorego('o1')); h = A.game();
  if (T.S.route !== 'profile' || T.S.lore.sec !== 'best' || !/class="bgrid"/.test(h) || !/<h2 class="serif" style="font-size:26px">Безликий образец/.test(h)) say(`«В Летопись» из листа врага${tag}: не бестиарий с этим врагом`);
  /* демо команды: все главы */
  if (team) {
    reset(); openBook(A, 'gods', 'redmund'); run('демо: все главы', () => T.ACT.chrall()); h = draw(A, 'демо: все главы');
    if (!/<h2 class="serif">Рэдмунд<\/h2>/.test(h) || /data-lock="1"/.test(h)) say('демо команды «все главы» не открыло Рэдмунда');
    if (T.CHR_SRV.list().includes('redmund')) say('демо команды открыло главу и «серверу»');
    run('режим «Игрок»', () => T.setTeam(false)); h = draw(A, 'демо: все главы глазами игрока');
    if (!/data-lock="1"/.test(h)) say('демо команды «все главы» видно игроку'); run('режим', () => T.setTeam(true));
  }
}
run('режим «Игрок»', () => T.setTeam(false));

/* ================== 6. картинки ================== */
{
  const B = load({ ready: true });
  if (B.ctx.EN_CHRONICLE) {
    B.T.S = B.T.initialState(); B.T.S.overlay = null;
    openBook(B, 'gods', 'vial'); let h = draw(B, 'выгружено · Виал');
    const url = `assets/art/lore/god-vial.jpg?v=${B.T.ART_V}`;
    if (!h.includes(`src="${url}"`)) say('выгруженная картинка главы — не AV(lore/…) с версией выгрузки');
    openBook(B, 'gods', 'five'); h = draw(B, 'выгружено · Пятеро');
    const mos = (h.match(/<div class="chr-mos">([\s\S]*?)<\/div>/) || ['', ''])[1];
    if ((mos.match(/<img /g) || []).length !== 5 || (mos.match(/assets\/art\/lore\/god-/g) || []).length !== 5) say('«Пятеро»: не пять полос из выгруженных картинок богов');
    openBook(B, 'gods', 'keron'); h = draw(B, 'выгружено · Кэрон закрыт');
    if (/assets\/art\/lore\/god-keron/.test(h)) say('закрытая глава показывает свою картинку — награда раньше времени');
  }
}

/* ================== 7. новые главы ================== */
{
  const row = T.NAV_TODO.find(r => r[0] === 'wanderer' && /Летопис/.test(r[1](1)));
  const badge = h => { const m = h.match(/<button role="tab" aria-selected="(?:true|false)" data-a="seg" data-v="profile:chron">Летопись(<span class="bdg")?/); return m ? !!m[1] : null; };
  const ava = h => { const m = h.match(/<button class="g-ava"[^>]*>([\s\S]*?)<\/button>/); const b = m && m[1].match(/<span class="bdg"[^>]*>([^<]*)<\/span>\s*$/); return b ? b[1] : ''; };
  if (!row) say('шахта: нет строки NAV_TODO «новые главы Летописи» у Странника');
  else if (!row[3]) say('шахта: новые главы — не пачка, а число глав');
  reset(); T.S.route = 'profile'; T.S.seg.profile = 'over';
  let h = draw(A, 'демо · Обзор');
  const mem = T.S.mem.slots.filter(s => s.st === 'open').length;
  if (T.chrFresh().length) say(`демо: у Летописи дело — ${T.chrFresh().join(', ')}; демо-аккаунт книгу уже открывал`);
  if (badge(h)) say('демо: точка у вкладки «Летопись» без новых глав');
  if (ava(h) !== (mem ? String(mem) : '')) say(`демо: бейдж портрета «${ava(h)}», мест Памяти ${mem}`);
  run('сценарий «новые главы»', () => T.ACT.chrfresh());
  h = draw(A, 'новые главы · Обзор');
  const fresh = T.chrFresh();
  if (!fresh.length) say('новые главы: дела нет');
  if (!badge(h)) say('новые главы: нет точки у вкладки «Летопись»');
  if (ava(h) !== String(mem + 1)) say(`новые главы: бейдж портрета «${ava(h)}», а нужно ${mem + 1} — места Памяти и одна пачка`);
  const part = byId.get(fresh[0]).part;
  T.S.seg.profile = 'chron'; T.S.lore.sec = part; delete T.S.seg['chr_' + part];
  h = draw(A, 'новые главы · книга');
  if (T.chrFresh().length) say('открыл книгу — дело не снято');
  if (badge(h)) say('открыл книгу — точка у вкладки осталась');
  const shown = (h.match(/<h2 class="serif">([^<]+)<\/h2>/) || [])[1];
  if (shown !== byId.get(fresh[0]).n) say(`книга открылась не на новой главе: «${shown}», а новая — «${byId.get(fresh[0]).n}»`);
  const unread = fresh.filter(id => !T.S.chr.seen[id]);
  if (unread.length) {
    const p2 = byId.get(unread[0]).part;
    T.S.lore.sec = p2; T.S.seg['chr_' + p2] = CH.find(c => c.part === p2 && c.id !== unread[0]).id;
    h = draw(A, 'новые главы · непрочитанная');
    if (!new RegExp(`data-a="lore" data-v="${p2}"[^>]*>(?:(?!</button>)[\\s\\S])*class="chr-dot"`).test(h)) say('непрочитанная глава: нет точки у раздела');
    if (!new RegExp(`class="chr-d[^"]* new"[^>]*data-v="chr_${p2}:${unread[0]}"`).test(h)) say('непрочитанная глава: точка листания не светится');
  }
  for (const id of fresh) { const c = byId.get(id); T.S.lore.sec = c.part; T.S.seg['chr_' + c.part] = id; draw(A, 'чтение · ' + c.n); }
  T.S.seg.profile = 'chron'; T.S.lore.sec = 'gods'; delete T.S.seg.chr_gods;
  h = draw(A, 'всё прочитано');
  if (/class="chr-dot"/.test(h)) say('всё прочитано — точки у разделов остались');
  /* новая игра: главы старта ждут игрока одним делом */
  { const s = T.initialState(); s.acc.level = 1; s.acc.cycle = 1; s.biomes.forEach((b, i) => { b.state = i ? 'lock' : 'front'; }); s.chr = { seen: {}, ack: {}, all: false }; T.S = s; }
  T.S.route = 'shelter'; h = draw(A, 'новая игра');
  const st = CH.filter(c => !Object.keys(c.open || {}).length).map(c => c.id);
  if (JSON.stringify(T.chrFresh()) !== JSON.stringify(st)) say(`новая игра: дело — ${T.chrFresh().join(', ')}, а главы старта — ${st.join(', ')}`);
  if (row && run('строка дела', () => row[2]({})) !== st.length) say('новая игра: строка дела считает не главы старта');
}

/* ================== 8. CSS ================== */
{
  const css = read('screens/chronicle.css');
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g))
    for (const d of m[2].matchAll(/([a-z-]+)\s*:/g)) if (!ANIM_PROPS.includes(d[1])) say(`chronicle.css: кадр ${m[1]} меняет ${d[1]} — только transform и opacity`);
  for (const m of css.matchAll(/transition\s*:\s*([^;}]+)/g)) for (const part of m[1].split(',')) { const p = part.trim().split(/\s+/)[0]; if (p !== 'none' && !ANIM_PROPS.includes(p)) say(`chronicle.css: переход по ${p} — только transform и opacity`); }
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)) say('chronicle.css: нет «меньше движения»');
}

/* ================== 9. UI-кит, карта экранов, сценарии ================== */
{
  for (const team of [false, true]) {
    run('режим', () => T.setTeam(team));
    reset();
    const k = run('UI-кит · Летопись', () => T.chrKitHtml());
    if (!k || !/<h3>Летопись<\/h3>/.test(k)) say('UI-кит: раздел «Летопись» не рисуется');
    else if (/undefined|NaN|\[object /.test(k)) say('UI-кит · Летопись: undefined, NaN или [object');
    if (!T.KIT_EXTRA.some(x => x.html === T.chrKitHtml)) say('UI-кит: раздел «Летопись» не в KIT_EXTRA');
  }
  run('режим «Игрок»', () => T.setTeam(false));
  const card = html.match(/\{ n: 'Летопись'[\s\S]*?\},/);
  if (!card || !/ready:\s*\[[^\]]*'cycles'/.test(card[0])) say('карта экранов: «Летопись» (cycles) не отмечена готовой');
  const fl = T.FLOWS.filter(x => /^Летопись · /.test(x[0]));
  if (fl.length < 3) say(`сценарии презентации «Летопись · …»: ${fl.length}`);
  for (const [t, , f] of fl) { reset(); run('сценарий ' + t, () => f()); const h = draw(A, `сценарий «${t}»`); service(`сценарий «${t}»`, h); }
}

done();
