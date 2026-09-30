/* Автопроверка карт боя: рамка по типу бойца (design/ui/screens/battle-cards.js и battle-cards.css) — без браузера.
   Слово автора 30.09.2026: на арене боя — рамки по типу врага и одна универсальная карта героя, прямоугольные.
   1. Файлы: index.html подключает battle-cards.css и battle-cards.js; концы строк — CRLF; ширина карты — переменная --cw у .bc и .bc.lead.
   2. Данные BF: у каждого типа своя рамка — свой путь, у героя своя; имена для игрока без служебных слов; геометрия — целые тысячные
      доли: окно внутри рисунка, нарезка не меньше окна (углы и верх с украшением не тянутся), у героя — гнездо метки; выгруженная
      картинка есть, её пропорция — ar; в tools/art-gen/ui-art.json рамка идёт из art/generated, исходник есть.
   3. Тип рамки в каждом режиме — на настоящих боях прототипа: забег по биому 1–4 (рядовые, элита, босс) и рунный страж; Эхо — рядовой,
      элита, босс, Убер, Многоликий, крафтовый босс; биом Многоликого по этажам; клан — Голос, Хозяин и свита; Арена и Лига — рамка героя
      с обеих сторон; свои герои — всегда рамка героя. Каждая рамка набора встречается в бою.
   4. Карта с рамкой: класс fr, тип, переменные геометрии, рамка в кадре портрета; у героя — метка: кристалл редкости героя и звёзды по
      личному максимуму, взятые — по доблести; имя, полоса здоровья и щита, класс, эффекты, цель, контроль, «пал» — на месте; ход боя
      (paintCards) идёт без исключений; в легенде знаков — строка о рамке.
   5. Без выгрузки (BF.ready пуст) — карта прежняя: разметка боя та же, что с рамками, за вычетом рамки, метки, класса fr и ранга
      в подсказке; ни следа рамок ни на картах, ни в легенде.
   6. Режим «Игрок»: в бою служебных слов нет (strip и SERVICE из check_player_view.js).
   7. Раскладка расчётом по CSS index.html и battle-cards.css на 932 × 430 и 844 × 390: высота карты с рамкой та же, что без неё; кадр
      портрета не ниже PORTRAIT_MIN; рамка не шире карты больше чем в WIDE раз; метка героя — на рамке.
   8. UI-кит: раздел «Карты боя» рисуется, в нём все рамки — и с выгрузкой, и без неё.
   Везде: без исключений, undefined, NaN и [object.
   Запуск: node tools/content-gen/screens/check_battle_cards.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');

/* ================== ДАННЫЕ ПРОВЕРКИ ================== */
const TYPES = ['hero', 'o', 'e', 'voice', 'b', 'echo', 'many', 'rune', 'uber', 'forgotten', 'host'];   // набор рамок — решение 30.09.2026
const ECHO_G = { o: 'o', e: 'e', b: 'echo', u: 'uber', m: 'many', craft: 'forgotten' };               // главный враг Эхо по типу цели → рамка
const PORTRAIT_MIN = 36;   // кадр портрета под рамкой не ниже, px
const WIDE = 1.45;         // рамка с украшением не шире карты больше чем во столько раз
const SIZES = [['932 × 430', 'lg'], ['844 × 390', 'sm']];

const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [], cnt = { cards: 0, battles: 0, modes: new Set(), seen: new Set() };
const fail = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
const done = () => {
  if (err.length) { console.log('ОШИБКИ:\n' + err.map(e => '  ✗ ' + e).join('\n')); process.exit(1); }
  console.log(`Карты боя: рамок ${TYPES.length}, боёв ${cnt.battles}, карт ${cnt.cards}; режимы — ${[...cnt.modes].join(', ')}; рамки в бою — ${[...cnt.seen].join(', ')}.`);
  console.log('Проверка пройдена: набор и данные рамок, тип по режиму и рангу, карта с рамкой и без, раскладка на двух экранах, режим «Игрок», UI-кит.');
  process.exit(0);
};
const BAD = /.{0,60}(?:undefined|NaN|\[object ).{0,40}/;
const scan = (key, h) => { const m = String(h).match(BAD); if (m) fail(`${key}: в разметке undefined, NaN или [object — «${m[0].replace(/\s+/g, ' ')}»`); return h; };

/* ================== 1. файлы ================== */
{
  const crlf = (html.match(/\r\n/g) || []).length, lf = (html.match(/\n/g) || []).length;
  if (crlf !== lf) fail(`index.html: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}`);
  if (!html.includes('<link rel="stylesheet" href="screens/battle-cards.css">')) fail('index.html: не подключён screens/battle-cards.css');
  if (!html.includes('<script src="screens/battle-cards.js"></script>')) fail('index.html: не подключён screens/battle-cards.js');
  for (const f of ['screens/battle-cards.js', 'screens/battle-cards.css']) {
    const t = read(f); if ((t.match(/\r\n/g) || []).length !== (t.match(/\n/g) || []).length) fail(`${f}: концы строк не CRLF`);
  }
}
/* CSS: правило по селектору и число свойства */
const css = html + '\n' + read('screens/battle-cards.css');
const rule = sel => { const m = css.match(new RegExp('(?:^|\\})' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}', 'm')); return m ? m[1] : ''; };   // селектор целиком: с начала строки или после }
const px = (sel, prop) => { const m = rule(sel).match(new RegExp('(?:^|;)\\s*' + prop + ':\\s*(-?\\d+(?:\\.\\d+)?)px')); return m ? +m[1] : NaN; };
{
  if (!/--cw:74px/.test(rule('.bc')) || !/width:var\(--cw\)/.test(rule('.bc'))) fail('CSS: у .bc нет ширины карты переменной --cw');
  if (!/--cw:84px/.test(rule('.bc.lead'))) fail('CSS: у .bc.lead нет --cw');
}

/* ================== песочница ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const stubEl = id => {
  const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, remove() {},
    animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
  e.querySelector = () => stubEl();
  return e;
};
const els = {};
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
  createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: stubEl('html'), activeElement: null, fonts: null };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { fail(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
const T = vm.runInContext(`({ get S() { return S; }, set S(v) { S = v; }, BF, bfType, bfCard, bfHero, ACT, FLOWS, KIT_EXTRA, H, RSI, RX, render, initialState, startRun,
  advance, paintCards, rsSetWeek, BAG, ACTIVATE, SQ, setTeam, EB })`, ctx);
const run = (where, f) => { try { return f(); } catch (e) { fail(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const draw = where => { run(where, () => T.render()); return scan(where, els.game ? els.game.innerHTML : ''); };
const BF = T.BF;

/* ================== 2. данные рамок ================== */
{
  const keys = Object.keys(BF.types);
  if (keys.join() !== TYPES.join()) fail(`BF.types: набор ${keys.join(', ')}, ждали ${TYPES.join(', ')}`);
  const paths = keys.map(t => BF.path(t));
  if (new Set(paths).size !== paths.length) fail('BF: у двух типов одна картинка рамки');
  if (!BF.types.hero || !BF.types.hero.mark) fail('BF: у героя нет рамки с гнездом метки');
  const art = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'ui-art.json'), 'utf8'));
  const names = new Set();
  for (const t of keys) {
    const X = BF.types[t], key = `рамка ${t}`;
    if (t !== 'hero') {
      if (!X.n) fail(`${key}: нет имени для игрока`);
      if (names.has(X.n)) fail(`${key}: имя «${X.n}» у двух рамок`); names.add(X.n);
      for (const [what, re] of SERVICE) if (re.test(X.n)) fail(`${key}: в имени служебное (${what}) — «${X.n}»`);
    }
    const nums = [X.ar].concat(X.win, X.cut, X.mark || []);
    if (nums.some(v => !Number.isInteger(v))) fail(`${key}: геометрия — не целые тысячные`);
    if (X.win.length !== 4 || X.cut.length !== 4) fail(`${key}: окно и нарезка — по четыре стороны`);
    if (X.win[1] + X.win[3] >= 1000 || X.win[0] + X.win[2] >= 1000 || X.win.some(v => v < 0)) fail(`${key}: окно не внутри рисунка`);
    if (X.cut.some((v, i) => v < X.win[i])) fail(`${key}: нарезка ${X.cut} уже окна ${X.win} — край окна попал бы в тянущуюся середину`);
    if (X.cut[0] + X.cut[2] >= 1000 || X.cut[1] + X.cut[3] >= 1000) fail(`${key}: нарезка перекрывает рисунок`);
    if (!X.kit || !fs.existsSync(path.join(UI, 'assets', 'art', X.kit))) fail(`${key}: нет портрета для UI-кита — ${X.kit}`);
    const p = BF.path(t), file = path.join(UI, 'assets', 'art', p);
    if (!BF.ready.includes(p)) continue;
    if (!fs.existsSync(file)) { fail(`${key}: в BF.ready, но нет файла ${p}`); continue; }
    const b = fs.readFileSync(file), w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    if (b.toString('latin1', 1, 4) !== 'PNG' || b[25] !== 6) fail(`${key}: ${p} — не PNG с альфой`);
    if (Math.abs(Math.round(h * 1000 / w) - X.ar) > 2) fail(`${key}: пропорция выгрузки ${h * 1000 / w | 0}‰, в данных ${X.ar}‰`);
    const src = art.items[p];
    if (!src || !src.from || !fs.existsSync(path.join(ROOT, 'art', 'generated', src.from))) fail(`${key}: в tools/art-gen/ui-art.json нет исходника ${p} или его файла`);
  }
  for (const r of ['o', 'e', 'b', 'rune', 'uber', 'forgotten', 'clan']) if (!BF.types[BF.rank[r]]) fail(`BF.rank: у ранга ${r} нет рамки`);
}

/* ================== 3–4. тип рамки по режимам, карта с рамкой ================== */
const CARD = /<div class="bc [^"]*" id="bc(\d)(\d+)"[^>]*>[\s\S]*?<div class="rot"><\/div>\s*<\/div>/g;
function cardsOf(h) { return [...h.matchAll(CARD)].map(m => ({ side: +m[1], i: +m[2], html: m[0] })); }
/* бой на экране: у каждой карты — рамка своего типа и всё, что было на карте */
function checkBattle(key, R, want) {
  if (!R || !R.b) { fail(`${key}: боя нет`); return; }
  T.S.focus = R.id; T.S.route = 'battle'; T.S.overlay = null;
  const h = draw(key); cnt.battles++; cnt.modes.add(key.split(' · ')[0]);
  const cards = cardsOf(h);
  if (cards.length !== R.b.u[0].length + R.b.u[1].length) fail(`${key}: карт ${cards.length}, бойцов ${R.b.u[0].length + R.b.u[1].length}`);
  for (const c of cards) {
    const u = R.b.u[c.side][c.i], t = T.bfType(R, u), exp = want(u, c.side);
    cnt.cards++; cnt.seen.add(t);
    const where = `${key} · ${c.side ? 'враг' : 'герой'} ${u.name}`;
    if (exp && t !== exp) fail(`${where}: рамка «${t}», ждали «${exp}»`);
    if (!c.html.includes(` data-bf="${t}"`) || !/class="bc [^"]*\bfr"/.test(c.html)) fail(`${where}: у карты нет рамки своего типа`);
    if (!c.html.includes(`<i class="bf" style="border-image-source:url('assets/art/${BF.path(t)}`)) fail(`${where}: в кадре нет рамки ${BF.path(t)}`);
    for (const v of ['--bf-ar', '--bf-wt', '--bf-wr', '--bf-wb', '--bf-wl', '--bf-ct', '--bf-cr', '--bf-cb', '--bf-cl']) if (!c.html.includes(v + ':')) fail(`${where}: нет ${v}`);
    for (const part of ['class="buffs"', 'class="debuffs"', 'class="cls"', 'class="tgt"', 'class="ctl"', 'class="nm"', 'class="bar hp"', 'class="sh"', 'class="rot"']) if (!c.html.includes(part)) fail(`${where}: нет ${part}`);
    if (!c.side && !c.html.includes('class="fell"')) fail(`${where}: у героя нет «пал»`);
    if (t === 'hero') {
      const hh = T.bfHero(u), mk = c.html.match(/<span class="bf-mk" data-r="(\d)"[^>]*><b><\/b>(?:<span class="bf-st">([\s\S]*?)<\/span>)?<\/span>/);
      if (!hh) fail(`${where}: у героя нет редкости и доблести`);
      else if (!mk) fail(`${where}: нет метки героя`);
      else {
        const on = (mk[2] || '').match(/<i class="on">/g) || [], all = (mk[2] || '').match(/<i /g) || [];
        if (+mk[1] !== hh.r || all.length !== hh.max || on.length !== hh.v) fail(`${where}: метка ${mk[1]} · ${on.length} из ${all.length}, у героя ${hh.r} · ${hh.v} из ${hh.max}`);
      }
    } else if (c.html.includes('bf-mk')) fail(`${where}: метка героя на карте врага`);
  }
  if (!h.includes('Рамка — ранг врага')) fail(`${key}: в легенде знаков нет строки о рамке`);
  run(key + ' · ход боя', () => T.paintCards(R));
  playerView(key, h);
  plainView(key, R, h);
}
/* 6. глазами игрока — без служебного */
function playerView(key, h) {
  T.setTeam(false);
  const g = draw(key + ' · игрок'), t = playerText(g);
  for (const [what, re] of SERVICE) { const m = t.match(re); if (m) fail(`${key}: игрок видит служебное (${what}) — «${t.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\n/g, ' ')}»`); }
  if (/data-bf=/.test(strip(g)) !== /data-bf=/.test(h)) fail(`${key}: в режиме «Игрок» рамки другие`);
}
/* 5. без выгрузки — прежняя карта: разметка та же за вычетом рамки */
function plainView(key, R, h) {
  const ready = BF.ready; BF.ready = [];
  try {
    const g = draw(key + ' · без рамок');
    if (/data-bf=|class="bf"|bf-mk|bf-lg|--bf-|\bfr"|Рамка — ранг врага/.test(g)) fail(`${key}: без выгрузки на карте или в легенде следы рамки`);
    const wipe = s => s.replace(/ fr"/g, '"').replace(/ data-bf="\w+"/g, '').replace(/;--bf-[\w-]+:\d+/g, '').replace(/<i class="bf" [^>]*><\/i>/g, '')
      .replace(/<span class="bf-mk"[^>]*><b><\/b>(?:<span class="bf-st">(?:<i class="(?:on)?"><\/i>)*<\/span>)?<\/span>/g, '')
      .replace(/ · (?:Рядовой|Элита|Голос сонма|Босс биома|Босс Эхо|Многоликий|Рунный страж|Убер-босс|Забытый босс|Хозяин стихии)(?=[ :])/g, '');
    const a = cardsOf(wipe(h)).map(c => c.html).join('\n'), b = cardsOf(g).map(c => c.html).join('\n');
    if (a !== b) { const i = [...a].findIndex((ch, j) => ch !== b[j]); fail(`${key}: без выгрузки карта не прежняя — «${a.slice(Math.max(0, i - 60), i + 40)}» против «${b.slice(Math.max(0, i - 60), i + 40)}»`); }
  } finally { BF.ready = ready; T.setTeam(true); }
}

const fresh = () => { T.S = T.initialState(); T.S.overlay = null; T.S.runs = []; T.setTeam(true); };
const lastRun = kind => T.S.runs.filter(r => kind ? r.kind === kind : !r.kind).slice(-1)[0];

/* забег по биомам 1–4: первый этаж каждого вида и рунный страж */
for (const id of Object.keys(T.EB.BIOMES).filter(b => /^b\d$/.test(b))) {
  const B = T.EB.BIOMES[id];
  const picks = ['o', 'e', 'b'].map(g => B.floors.findIndex(f => f.g === g) + 1).filter(f => f > 0);
  for (const fl of picks) {
    fresh(); T.S.heroes.forEach(h => { h.busy = null; });
    run(`${id} · этаж ${fl}`, () => T.startRun('s1', id, fl));
    const R = lastRun();
    const g = B.floors[fl - 1].g;
    checkBattle(`Биом · ${id} · этаж ${fl} (${g})`, R, (u, sd) => !sd ? 'hero' : u.lead ? g : 'o');
  }
  if (B.guard) {
    fresh();
    run(`${id} · страж`, () => T.startRun('s1', id, 0, true));
    checkBattle(`Рунный страж · ${id}`, lastRun(), (u, sd) => !sd ? 'hero' : u.lead ? 'rune' : 'e');
  }
}

/* Эхо: цель каждого типа и крафтовый босс; атака — как у игрока */
{
  const E = vm.runInContext('window.EN_ECHO', ctx), STEPS = E.steps, TOP = STEPS.length;
  const W = vm.runInContext('RS.weeks', ctx)[0], c = 3;
  const targets = [];
  for (const g of ['o', 'e', 'b', 'u']) targets.push(['step', STEPS.indexOf(g) + 1]);
  targets.push(['step', TOP + 1]);
  for (const fb of T.RX.drops.craftBosses.slice(0, 1)) targets.push(['craft', fb]);
  for (const [kind, x0] of targets) {
    fresh(); T.rsSetWeek(W.race); T.S.acc.cycle = c; T.S.route = 'echo'; T.S.wallet.souls = 1e9; E.sync();
    const x = run('Эхо · цель', () => E.target(kind, x0)); if (!x) continue;
    T.S.echo.slots[0] = x; T.S.echo.sel = 0;
    run('Эхо · атака', () => T.ACT.echatk(x.uid + ':1'));
    const R = lastRun('echo'), guards = { o: 'o', e: 'e', b: 'echo', uber: 'uber', forgotten: 'forgotten' };
    checkBattle(`Эхо · ${kind === 'craft' ? 'крафтовый босс' : x.g === 'm' ? 'Многоликий' : 'ступень ' + x.step}`, R,
      (u, sd) => !sd ? 'hero' : u.lead ? ECHO_G[x.g] : guards[u.rank] || 'o');
  }
  /* биом Многоликого: этажи по порядку — рамка главного врага по его типу */
  fresh(); T.rsSetWeek(W.race); T.S.acc.cycle = c; T.S.wallet.souls = 1e9; E.sync();
  T.S.heroes.forEach(h => { h.lvl = Math.max(h.lvl, 3 * E.lvl(TOP, c)); });
  T.S.ech.biomes = []; T.S.ech.manyWk = {}; T.BAG.add('many', 1);
  run('биом Многоликого', () => { T.ACTIVATE.echo('many'); if (T.S.overlay && T.S.overlay.op) T.ACT.echactdo(T.S.overlay.op); });
  const mb = T.S.ech.biomes.find(b => b.many);
  if (!mb) fail('биом Многоликого: не открылся');
  else {
    run('биом Многоликого · забег', () => T.ACT.echmany(mb.uid));
    const R = lastRun('many'), seen = new Set();
    for (let n = 0; R && !R.over && n < 400; n++) {
      if (R.b && !seen.has(R.floor)) {
        seen.add(R.floor);
        const g = STEPS[R.floor - 1], main = { o: 'o', e: 'e', b: 'echo', u: 'uber' }[g];
        checkBattle(`Биом Многоликого · этаж ${R.floor}`, R, (u, sd) => !sd ? 'hero' : u.lead ? main : null);
        if (seen.size >= 4 && [...seen].some(f => STEPS[f - 1] === 'b')) break;
      }
      T.S.route = 'descent';   // бой идёт не на экране: эффектам боя нужен настоящий DOM
      run('биом Многоликого · ход', () => T.advance(R, 2000));
    }
    if (seen.size < 2) fail(`биом Многоликого: проверено этажей ${seen.size}`);
  }
}

/* клан: Голос сонма, потом Хозяин стихии — свита у обоих рядовые */
{
  fresh(); T.S.seg.clan = 'boss'; T.SQ.set('clan', 's1');
  const C = () => T.S.clan;
  const x = C().boss.targets.find(t => !t.dead && !t.burned && t.g === 'e');
  if (!x) fail('клан: нет живой элиты круга');
  else {
    run('клан · атака элиты', () => T.ACT.clatk(`${x.uid}:${C().boss.n + 1}`));
    checkBattle('Клан · Голос сонма', lastRun('clan'), (u, sd) => !sd ? 'hero' : u.lead ? 'voice' : 'o');
    for (let j = 0; j < 4 && !C().boss.targets.some(t => t.g === 'b' && !t.dead); j++) {
      const t = C().boss.targets.find(y => !y.dead && !y.burned && y.g === 'e'); if (!t) break;
      t.hp = 1;
      for (let a = 0; a < 10 && !t.dead; a++) { run('клан · добить элиту', () => T.ACT.clatk(`${t.uid}:${C().boss.n + 1}`)); const Rr = lastRun('clan'); if (Rr && !Rr.over) run('клан · итог', () => T.ACT.clskip(Rr.id)); T.S.overlay = null; }
    }
    const bs = C().boss.targets.find(t => t.g === 'b' && !t.dead);
    if (!bs) fail('клан: Хозяин не встал после трёх элит');
    else {
      run('клан · атака Хозяина', () => T.ACT.clatk(`${bs.uid}:${C().boss.n + 1}`));
      checkBattle('Клан · Хозяин стихии', lastRun('clan'), (u, sd) => !sd ? 'hero' : u.lead ? 'host' : 'o');
    }
  }
}

/* Арена и Лига: герои против героев — рамка героя с обеих сторон */
for (const name of ['Арена · атака и итог', 'Лига · итог матча']) {   // Лига: сценарий начинает матч и пропускает к итогу — бой на арене тот же
  fresh();
  const f = T.FLOWS.find(y => y[0] === name);
  if (!f) { fail(`нет сценария «${name}»`); continue; }
  run(name, () => f[2]());
  const R = lastRun('pvp');
  checkBattle(name.split(' · ')[0] + ' · ' + name.split(' · ')[1], R, () => 'hero');
}
for (const t of TYPES) if (!cnt.seen.has(t)) fail(`рамка «${t}» ни разу не встала в бою`);

/* ================== 7. раскладка расчётом по CSS ================== */
{
  const bt = rule('.bt'), sm = (css.match(/@container main \(max-height: 360px\)\{\s*\.bt\{([^}]*)\}/) || [])[1] || '';
  const val = (r, v) => { const m = r.match(new RegExp(v + ':(\\d+)px')); return m ? +m[1] : NaN; };
  const size = { lg: { rowh: val(bt, '--rowh'), fh: val(bt, '--fh') }, sm: { rowh: val(sm, '--rowh'), fh: val(sm, '--fh') } };
  const gap = px('.bc', 'gap'), nm = +((rule('.bc .nm').match(/font:\s*\d+\s+(\d+)px\/1\b/) || [])[1]), bar = px('.bc .bar', 'height'), rot = px('.rot', 'height');
  const plain = gap + nm + gap + bar + gap + rot;   // карта без рамки: кадр + это
  const fr = rule('.bc.fr .face'), free = +((fr.match(/var\(--fh\) \+ (\d+)px/) || [])[1]), lo = +((rule('.bc.fr').match(/max\((\d+)px/) || [])[1]);
  const barUp = -px('.bc.fr>.bar', 'margin-top');   // полоса поднята на нижнюю планку
  if ([size.lg.rowh, size.lg.fh, size.sm.rowh, size.sm.fh, gap, nm, bar, rot, free, lo, barUp].some(v => !Number.isFinite(v))) fail('CSS: не прочитаны размеры карты — правила переименованы?');
  else {
    // с рамкой: верх T, кадр F, max(lo, B), зазор, шансы. Кадр F = fh + free − T − max(lo, B): высота карты должна быть прежней
    if (free + gap + rot !== plain) fail(`CSS: кадр с рамкой выше прежнего на ${free} px, а имя и полоса занимали ${plain - gap - rot} px — высота карты разная`);
    if (barUp - gap !== 1 || lo !== bar - 1) fail(`CSS: полоса здоровья заходит на портрет не на 1 px (подъём ${barUp}, низ ${lo})`);
    for (const t of TYPES) {
      const X = BF.types[t], [wt, wr, wb, wl] = X.win;
      for (const [lead, cw] of [[false, 74], [true, 84]]) for (const [label, k] of SIZES) {
        const fh = lead ? size[k].rowh - 30 : size[k].fh, W = cw * 1000 / (1000 - wl - wr), Tp = W * X.ar * wt / 1e6, Bp = W * X.ar * wb / 1e6;
        const F = fh + free - Tp - Math.max(lo, Bp), where = `раскладка · ${t} · ${lead ? 'главная' : 'карта'} · ${label}`;
        if (F < PORTRAIT_MIN) fail(`${where}: кадр портрета ${F.toFixed(1)} px, меньше ${PORTRAIT_MIN}`);
        if (W > cw * WIDE) fail(`${where}: рамка ${W.toFixed(0)} px шире карты ${cw} больше чем в ${WIDE} раза`);
        const cut = W * X.ar * (X.cut[0] + X.cut[2]) / 1e6;
        if (cut > Tp + F + Bp) fail(`${where}: углы нарезки (${cut.toFixed(1)} px) выше рамки (${(Tp + F + Bp).toFixed(1)} px)`);
        if (X.mark && (X.mark[0] < wl || X.mark[0] > 1000 - wr || X.mark[1] * 1000 > 1000 * wt + 200)) fail(`${where}: гнездо метки не на верхней планке`);
      }
    }
  }
}

/* ================== 8. UI-кит ================== */
{
  const kit = T.KIT_EXTRA.find(x => { try { return String(x.html()).includes('Карты боя'); } catch (_) { return false; } });
  if (!kit) fail('UI-кит: нет раздела «Карты боя»');
  else {
    const h = scan('UI-кит', run('UI-кит', () => kit.html()) || '');
    for (const t of TYPES) if (!h.includes(` data-bf="${t}"`)) fail(`UI-кит: нет рамки «${t}»`);
    const ready = BF.ready; BF.ready = [];
    try { const g = scan('UI-кит без выгрузки', run('UI-кит без выгрузки', () => kit.html()) || ''); if (/data-bf=|class="bf"/.test(g)) fail('UI-кит: без выгрузки остались рамки'); if (!g.includes('без рамки карту рисует CSS')) fail('UI-кит: без выгрузки не сказано, что карту рисует CSS'); }
    finally { BF.ready = ready; }
  }
}
done();
