/* Автопроверка «Бой AAA»: сцена, окна в бою, эффекты, ритуал этажа (design/ui/screens/battle-scene.js, design/ui/fx.js) — без браузера.
   Слова автора 01.10.2026: «покажи мне боевую сцену и все попапы в ней на ааа уровне и понятной информацией по бафам, дебафам, скиллам
   шансам, количество хп на хп баре надо, ну и сама боевая система в виде нынешних партиклов не годится, попробуй сделай ААА уровень».
   Законы — на настоящих боях прототипа: биом (рядовые, элита, босс), рунный страж, Эхо (Убер, Многоликий), Арена.
   A. Здоровье числом: у каждой карты на полосе — число здоровья, ровно показанное; щит — отдельным числом, когда он есть; во всех трёх
      видах карт. Значки эффектов на карте — с числом раундов и стаков, рисованный медальон; не встали — «+N» ровно по числу скрытых.
   B. Окно карты: здоровье «N / M» и щит; у врага — иммунитет к контролю по рангу и раунды его типа из таблицы ядра; у изученного —
      каждая способность таблицы шансов строкой с рисованной иконкой (библиотеки; у уникальной — своей из BS_ART.abUnique), шансом ядра
      и тем, что делает, обычная атака — остатком шанса и иконкой своего вида удара; каждый эффект — строкой: значок, имя, что делает, раунды, стаки,
      кто наложил; у неизученного — ни имени, ни способностей; классы окна не задевают сетку и ширину, которые index.html даёт классу.
   C. Эффекты — только transform и opacity: кадры Web Animations сцены EnFx.scene у каждого вида; @keyframes, которые крутят бой
      (index.html, battle-cards.css, battle-scene.css, с учётом каскада); «меньше движения» — снаряды не летят, поле не трясётся, спрайты
      только гаснут, ленты кадров играют на месте; числа, надписи и плашки видны свою длительность (--bs-d сильнее общего правила
      index.html), враги не идут из-за края, а проявляются на местах.
   D. Режим «Игрок»: в бою, в окне карты врага и героя, в легенде «Знаки», на баннере, в итоге этажа и в «Стене» — ни одного служебного слова.
   E. Данные и арт: значок у каждого эффекта, который ядро может наложить, урон и лечение со временем — у каждой школы; что делает
      контроль, дебафф и бафф на карте бойца — словарь эффектов библиотеки (EN_ABILITIES.fx, ADR-0052) с числами эффекта ядра:
      с числами набора строка окна — то же определение, что в описаниях способностей, со своими — они (порог льда, слом строя
      без уклонения); спрайты и ленты
      VFX, рамки-квадраты (тело, венец, целиком), украшения HUD, иконки боя — на диске и в tools/art-gen/ui-art.json с исходником; клетки
      листов jobs/ability-icons-unique.json — ровно таблица BS_ART.abUnique; лента — столько кадров, сколько в данных; фазы ритуала
      RULES.floor.ritual и минимум RULES.floor.minMs — целые мс; взятый этаж с ритуалом кончается не раньше b.t (конец боя по ядру) — и на
      экране, и у свёрнутого забега, время показа идёт ровно тактом (и на последнем такте ритуала), ритуал на экране показан, его «+N» —
      ровно то, что зачислено в кошелёк, с циклом и артефактами игрока. UI-кит: раздел «Бой AAA» рисуется.
   F. Поход на новый этаж (ADR-0048, слова автора 02.10.2026): ожидания с плашкой нет — добыча летит в кошелёк, а остаток этажа — путь:
      отряд переходит дальше и идёт по биому, экран затемняется, в темноте — новая арена того же биома. Правка автора после просмотра:
      «после чёрного экрана показывать ещё движение небольшое якобы мы всё это время шли и уже когда остановились двое врагов как бы
      выходят из-за экрана в левую сторону и бой начинается» — новая арена открывается, пока отряд ещё идёт, после темноты он идёт ещё и
      останавливается; тогда враги нового этажа выходят из-за правого края поля и идут влево, к своим местам, и только потом — бой.
      Законы: фазы идут ровно в этом порядке — доигрыш и добыча, шаг, затемнение, темнота, открытие, шаг после темноты, выход врагов;
      затемнение, темнота, открытие и шаг после темноты — своей длительности из данных, шаг до темноты — весь остаток; после темноты фон
      едет и тормозит до места, отряд шагает до самой остановки; новый этаж рисуется, только когда отряд встал, и его часы стоят до конца
      пути; выходит вся колода этажа, из-за края поля (кадры — только transform, первый — за краем), передняя колонка первой, последняя
      карта встаёт ровно через enterMs; ни один ход нового боя не идёт, пока враги выходят, и первый ход — на том же такте, где они
      встали; класс выхода с карт снимается; у боя со своей сценой выход идёт с начала боя и укладывается в паузу раунда.
      Длительность этажа та же — часы нового боя идут ровно с конца пути, время забега
      прибавляет b.t + gapMs; затемнение, темнота, открытие, шаг после темноты и начало выхода помещаются в переход gapMs; фон едет, отряд
      шагает, павшие уходят — только transform и opacity, при «меньше движения» — тот же порядок без движения, враги проявляются на
      местах; арены этажей — по четыре на биом 1–4, этаж берёт свою по номеру, соседние — разные, на экране боя — арена своего этажа,
      в темноте — арена следующего; готовые арены — на диске и в описи выгрузки.
   Мутации: каждая ломает закон — он обязан упасть.
   Запуск: node tools/content-gen/screens/check_battle_scene.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, playerText } = require('./check_player_view.js');

/* проверочные числа: минимум этажа для пробы ритуала (данные калькулятора фарма могут быть любыми, проба — своим числом), шаг хода
   пробы и предел шагов, мс */
const RITUAL_TEST_MS = 120000, STEP_MS = 50, STEPS_MAX = 4000;
/* «меньше движения»: сведения, которым battle-scene.css возвращает длительность */
const CALM_INFO = ['.fly', '.fly.crit', '.bs-call', '.bs-call.ult', '.bt-banner.bs-ban', '.bs-rflash', '.bs-loot'];
/* поход на новый этаж: живые герои шагают — правило battle-scene.css; фазы пути — по порядку автора (ADR-0048 и правка после просмотра:
   после темноты — ещё шаг, отряд встал — выход врагов); выход врагов — правило карт врага на стороне с классом выхода */
const WALK_SEL = '.bt.bs-march .bt-side.h .bc:not(.dead)';
const FOE_SEL = '.bt-side.f.enter .bc';
const TRIP_ORDER = ['settle', 'march', 'dark', 'black', 'open', 'walk', 'foes'];
/* мест карт на стороне поля — от одной до пяти (SLOT index.html): выход врагов проверяется на каждой колоде */
const FOES_MAX = 5;
/* арены этажей: по стольку на биом, у биомов 1–4 (ADR-0048: нынешняя и три новых) */
const ARENAS_PER_BIOME = 4, ARENA_BIOMES = ['b1', 'b2', 'b3', 'b4'];
/* селектор боя: поле, карты, числа, надписи, плашки, спрайты, значки, рамки */
const BATTLE_SEL = /\.(?:bt(?:-[\w-]+)?|bc|fly|bs-[\w-]+|vx[\w-]*|vf|si2|fxl|sfc?|sfa|bsf|bsi-[\w-]+)(?![\w-])/;

const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const err = [];
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
const cnt = { battles: 0, cards: 0, badges: 0, insp: 0, abs: 0, art: 0, uniq: 0, sts: 0, kinds: 0, frames: 0, kf: 0, trips: 0, tripMs: [], floors: 0, arenaReady: 0, arenaPlan: 0 };
let CNT = null;   // счёт первого прохода — мутации прогоняют законы снова
function done(extra) {
  const c = CNT || cnt;
  if (err.length) { console.log('ОШИБКИ:\n' + err.map(e => '  ✗ ' + e).join('\n')); process.exit(1); }
  console.log(`Бой AAA: боёв ${c.battles}, карт ${c.cards} (в трёх видах), значков ${c.badges}; окон карты ${c.insp}: способностей ${c.abs} (рисованная иконка — у ${c.art}, своя уникальная — у ${c.uniq}), эффектов ${c.sts}; видов эффекта ${c.kinds} — и с «меньше движения», кадров анимации ${c.frames}, анимаций CSS боя ${c.kf}.${extra ? ' ' + extra : ''}`);
  console.log(`Поход на новый этаж: путей ${c.trips} (${c.tripMs.join(', ')}), этажей с ареной по номеру ${c.floors}; арены этажей готовы ${c.arenaReady} из ${c.arenaPlan}${c.arenaReady < c.arenaPlan ? ' — остальные ждут генерации (docs/art-queue.md), этаж берёт готовые' : ''}.`);
  console.log('Проверка пройдена: здоровье числом и щит отдельно, значки эффектов с раундами и стаками; окно карты — способности с иконкой и шансом, эффекты с раундами и тем, кто наложил, иммунитет и раунды типа; эффекты — только transform и opacity, «меньше движения»; режим «Игрок»; значки, спрайты, рамки и HUD на диске; ритуал этажа и поход на новый этаж; мутации пойманы.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const html = read('index.html');
for (const f of ['screens/battle-scene.js', 'screens/battle-scene.css']) {
  if (!fs.existsSync(path.join(UI, f))) { say('нет design/ui/' + f); continue; }
  const t = read(f); if ((t.match(/\r\n/g) || []).length !== (t.match(/\n/g) || []).length) say(`${f}: концы строк не CRLF`);
}
if (!html.includes('<link rel="stylesheet" href="screens/battle-scene.css">')) say('index.html: не подключён screens/battle-scene.css');
{
  const order = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]), at = order.indexOf('screens/battle-scene.js');
  if (at < 0) say('index.html: не подключён screens/battle-scene.js');
  else for (const f of ['fx.js', 'screens/battle-cards.js', 'screens/biomes.js', 'screens/art-icons.js']) if (order.indexOf(f) > at) say(`index.html: screens/battle-scene.js — раньше ${f}: он оборачивает её функции`);
}
if (err.length) done();

/* ================== 2. песочница — как у check_battle_cards.js ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const stubEl = id => {
  const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, remove() {},
    animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
  e.querySelector = () => stubEl();
  return e;
};
const els = {}, store = {};
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
  createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: stubEl('html'), activeElement: null, fonts: null };
const win = { document, console: { log() {}, warn() {}, error() {}, info() {} }, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
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
const T = vm.runInContext(`({ get S() { return S; }, set S(v) { S = v; }, render, initialState, startRun, advance, paintInsp, statusHtml, setTeam, FLOWS, ACT, RS, rsSetWeek, EB, BF,
  bsStatuses, bsHpTxt, bsBanner, bsRoundsOf, bsAbArt, BS_DATA, BS_ART, BS_FRAME, abArt, uName, unitKnown, roundWord, pctBp, fmt, dkey, OV, KIT_EXTRA, legendHtml, FOE_LOOK })`, ctx);
const LIB_IDS = new Set(vm.runInContext('window.EN_ABILITIES', ctx).sets.flatMap(s => s.items.map(x => x.id)));
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const draw = where => { run(where, () => T.render()); return els.game ? els.game.innerHTML : ''; };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CARD = /<div class="bc [^"]*" id="bc(\d)(\d+)"[^>]*>[\s\S]*?<div class="rot"><\/div>\s*<\/div>/g;
const fresh = () => { T.S = T.initialState(); T.S.overlay = null; T.S.runs = []; T.S.insp = null; T.S.legend = false; T.S.bfv = 'square'; T.setTeam(true); T.S.heroes.forEach(h => { h.busy = null; }); };
const lastRun = kind => T.S.runs.filter(r => kind ? r.kind === kind : !r.kind).slice(-1)[0];
const dispOf = (R, u) => R.disp[T.dkey(u)] || { hp: u.hp, sh: u.sh, dead: !u.alive };

/* бои всех видов: биом — рядовые, элита, босс; рунный страж; Эхо — Убер и Многоликий; Арена */
const BATTLES = [];
{
  const EB = T.EB;
  for (const [id, g] of [['b3', 'o'], ['b3', 'e'], ['b3', 'b']]) {
    const B = EB.BIOMES[id], fl = B ? B.floors.findIndex(f => f.g === g) + 1 : 0;
    if (!fl) { say(`нет этажа «${g}» у биома ${id}`); continue; }
    BATTLES.push([`биом ${id} · этаж ${fl} (${g})`, () => { fresh(); T.startRun('s1', id, fl); return lastRun(); }]);
  }
  BATTLES.push(['рунный страж b2', () => { fresh(); T.startRun('s1', 'b2', 0, true); return lastRun(); }]);
  const E = vm.runInContext('window.EN_ECHO', ctx);
  for (const g of ['u', 'm']) BATTLES.push([`Эхо · ${g === 'u' ? 'Убер' : 'Многоликий'}`, () => {
    fresh(); T.rsSetWeek(T.RS.weeks[0].race); T.S.acc.cycle = 3; T.S.route = 'echo'; T.S.wallet.souls = 1e9; E.sync();
    const x = E.target('step', g === 'm' ? E.steps.length + 1 : E.steps.indexOf(g) + 1);
    T.S.echo.slots[0] = x; T.S.echo.sel = 0; T.ACT.echatk(x.uid + ':1'); return lastRun('echo');
  }]);
  BATTLES.push(['Арена', () => { fresh(); const f = T.FLOWS.find(y => y[0] === 'Арена · атака и итог'); f[2](); return lastRun('pvp'); }]);
}
/* эффекты, как их кладёт ядро: урон со временем со стаками и наложившим, бафф и дебаффы с наложившим (вредных больше, чем встаёт, —
   «+N»), контроль, лечение со временем, эффект до конца этажа; щит — числом */
function seed(R) {
  const [hs, fs_] = R.b.u, h0 = hs[0], f0 = fs_[0];
  h0.st.push({ k: 'dot', school: 'Огонь', per: 37, coef: 40, stacks: 2, max: 3, left: 2, left0: 3, src: f0, drain: 0, n: 0 });
  h0.st.push({ k: 'guard', left: 1, left0: 2, pow: 2500, by: hs[1] || h0 });
  h0.st.push({ k: 'weak', left: 2, left0: 3, pow: 2000, by: f0 });
  h0.st.push({ k: 'slow', left: 1, left0: 2, pow: 1500, by: f0 });   // третий вредный — за «+N»
  h0.aura = Object.assign({}, h0.aura, { dmgUp: 1500 });
  f0.st.push({ k: 'stun', left: 1, left0: 1, pow: 0, by: h0 });
  f0.st.push({ k: 'mark', left: 3, left0: 3, pow: 2000, by: h0 });
  f0.st.push({ k: 'hot', school: 'Земля', per: 21, coef: 30, stacks: 1, max: 3, left: 2, left0: 3, src: fs_[1] || f0, drain: 0, n: 0 });
  R.disp[T.dkey(h0)] = { hp: Math.floor(h0.maxHp * 2 / 3), sh: Math.floor(h0.maxHp / 5), dead: false };
}
/* враги изучены (on) или нет — окно показывает способности или хранит тайну; возвращает, как было */
function know(R, on) {
  const saved = [];
  for (const u of R.b.u[1]) {
    const Lk = T.FOE_LOOK[u.id];
    saved.push([u, Lk ? Lk.known : null, T.S.known.includes(u.id)]);
    if (Lk) Lk.known = on;
    if (on && !T.S.known.includes(u.id)) T.S.known.push(u.id);
    if (!on) T.S.known = T.S.known.filter(x => x !== u.id);
  }
  return () => { for (const [u, k, had] of saved) { const Lk = T.FOE_LOOK[u.id]; if (Lk) Lk.known = k; T.S.known = T.S.known.filter(x => x !== u.id); if (had) T.S.known.push(u.id); } };
}

/* ================== законы A, B, D — на каждом бою ================== */
const L = {};
L.A = (R, key) => {
  const out = [], b = R.b, sq = {};
  try {
    for (const v of ['square', 'portrait', 'old']) {
      T.S.bfv = v;
      const h = draw(`${key} · ${v}`), cards = [...h.matchAll(CARD)];
      if (cards.length !== b.u[0].length + b.u[1].length) out.push(`${key} · ${v}: карт ${cards.length}, бойцов ${b.u[0].length + b.u[1].length}`);
      for (const m of cards) {
        const u = b.u[+m[1]][+m[2]], d = dispOf(R, u), c = m[0], where = `${key} · ${v} · ${u.name}`;
        if (v === 'square') sq[T.dkey(u)] = c;
        const hn = (c.match(/<b class="hpn">([^<]*)<\/b>/) || [])[1], sn = (c.match(/<b class="shn">([^<]*)<\/b>/) || [])[1];
        const want = T.bsHpTxt(d.dead ? 0 : d.hp), wsh = d.sh > 0 && !d.dead ? T.bsHpTxt(d.sh, true) : '';
        if (hn == null) out.push(`${where}: на полосе нет числа здоровья`);
        else if (hn !== want || !/\d/.test(hn)) out.push(`${where}: на полосе «${hn}», а здоровье ${want}`);
        if (sn == null) out.push(`${where}: на полосе нет места числу щита`);
        else if (sn !== wsh) out.push(`${where}: щит на полосе «${sn}», ждали «${wsh}»`);
        cnt.cards++;
      }
    }
  } finally { T.S.bfv = 'square'; }
  /* значки — столбики карты-квадрата, их рисует paintCards нынешней statusHtml: столько, сколько встаёт, остальные — «+N» */
  for (const u of [b.u[0][0], b.u[1][0]]) {
    const d = dispOf(R, u), all = T.bsStatuses(u, d, b.mode === 'rounds'), cap = T.BS_DATA.cap.square;
    const c = run(`${key} · значки`, () => vm.runInContext('statusHtml', ctx)(u, d, b.mode === 'rounds').join('')) || '';
    if (!sq[T.dkey(u)] || !/class="buffs"/.test(sq[T.dkey(u)]) || !/class="debuffs"/.test(sq[T.dkey(u)])) out.push(`${key} · ${u.name}: на карте-квадрате нет столбиков значков`);
    const shown = c.match(/<span class="si2 (?:good|bad)/g) || [], more = [...c.matchAll(/<span class="si2 more"[^>]*>\+(\d+)</g)].reduce((a, x) => a + +x[1], 0);
    const nG = all.filter(I => I.good).length, nB = all.length - nG;
    if (shown.length !== Math.min(cap, nG) + Math.min(cap, nB)) out.push(`${key} · значки ${u.name}: на карте ${shown.length}, ждали ${Math.min(cap, nG) + Math.min(cap, nB)}`);
    if (more !== Math.max(0, nG - cap) + Math.max(0, nB - cap)) out.push(`${key} · значки ${u.name}: «+N» — ${more}, скрыто ${Math.max(0, nG - cap) + Math.max(0, nB - cap)}`);
    for (const I of all) {
      const at = c.indexOf(`title="${esc(I.name)}:`);
      if (at < 0) continue;   // не встал — за «+N»
      cnt.badges++;
      const badge = c.slice(c.lastIndexOf('<span class="si2', at), c.indexOf('</span>', at) + 7);
      if (!badge.includes(`<span class="si2 ${I.good ? 'good' : 'bad'}`)) out.push(`${key} · значок «${I.name}» у ${u.name}: не в своём столбике — ${I.good ? 'полезный' : 'вредный'}`);
      if (I.left != null && !badge.includes(`<b class="l">${I.left}</b>`)) out.push(`${key} · значок «${I.name}» у ${u.name}: нет числа раундов ${I.left}`);
      if (I.stacks > 1 && !badge.includes(`<b class="k">${I.stacks}</b>`)) out.push(`${key} · значок «${I.name}» у ${u.name}: нет стаков ${I.stacks}`);
      if (!I.icon || !badge.includes(`<img src="${I.icon}"`)) out.push(`${key} · значок «${I.name}» у ${u.name}: нет рисованного медальона`);
    }
  }
  return out;
};
/* строка окна по имени: от начала строки до её конца */
const rowOf = (h, name) => { const at = h.indexOf(`<b>${esc(name)}`); if (at < 0) return ''; const s = h.lastIndexOf('<div class="bsi-r', at), e = h.indexOf('</div></div>', at); return h.slice(s, e < 0 ? undefined : e + 12); };
/* классы, которым index.html сам по себе задаёт сетку или ширину (.g — сетка игры 932 px, .ch — строка 190 px): в окне карты они ломают
   вёрстку — строка эффекта вытягивалась на всю высоту окна. Свои классы окна — с приставкой bsi-, общие детали — из списка */
const LAYOUT_CLS = (() => {
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ''), out = new Set();
  for (const m of css.matchAll(/(?:^|\})\s*\.([\w-]+)\s*\{([^}]*)\}/g)) if (/display:\s*(?:grid|flex)|(?:^|;)\s*width:/.test(m[2])) out.add(m[1]);
  return out;
})();
const WINDOW_SHARED = new Set(['chip', 'iconbtn', 'x', 'bar', 'ico', 'i', 'ivl', 'btn']);
L.B = (R, key) => {
  const out = [], b = R.b;
  const insp = u => {
    T.S.insp = T.dkey(u); els.btInsp = null; run(`${key} · окно`, () => T.paintInsp(R));
    const h = (els.btInsp || {}).innerHTML || '';
    for (const m of h.matchAll(/class="([^"]+)"/g)) for (const c of m[1].split(/\s+/)) if (LAYOUT_CLS.has(c) && !WINDOW_SHARED.has(c)) out.push(`${key} · окно ${u.name}: класс «${c}» — у index.html это сетка или ширина, вёрстка окна ломается`);
    return h;
  };
  const back = know(R, true);
  try {
    for (const sd of [0, 1]) for (const u of b.u[sd]) {
      const h = insp(u), where = `${key} · окно ${sd ? 'врага' : 'героя'} ${u.name}`, d = dispOf(R, u);
      cnt.insp++;
      if (!h.includes(`<b>${T.fmt(Math.max(0, d.dead ? 0 : d.hp))}</b> / ${T.fmt(u.maxHp)}`)) out.push(`${where}: нет здоровья «N / M»`);
      if (d.sh > 0 && !d.dead && !h.includes(`<b>${T.fmt(d.sh)}</b><small>щит</small>`)) out.push(`${where}: нет щита числом`);
      if (sd) {
        const imm = u.rank ? T.EB.RULES.resist[u.rank] || 0 : 0, rn = T.bsRoundsOf(R, u);
        if (!h.includes(`иммунитет к контролю ${T.pctBp(imm)}`)) out.push(`${where}: нет иммунитета к контролю ${T.pctBp(imm)}`);
        if (!rn) out.push(`${where}: у врага нет раундов его типа (ранг «${u.rank}»)`);
        else if (!h.includes(` — бой ${rn} ${T.roundWord(rn)}`)) out.push(`${where}: нет раундов его типа (${rn})`);
      }
      for (const I of d.dead ? [] : T.bsStatuses(u, d, b.mode === 'rounds')) {
        cnt.sts++;
        const r = rowOf(h, I.name);
        if (!r) { out.push(`${where}: нет эффекта «${I.name}»`); continue; }
        if (!I.line || !r.includes(`<p>${esc(I.line)}</p>`)) out.push(`${where}: эффект «${I.name}» — не сказано, что он делает`);
        if (I.left != null && !r.includes(`>${I.left}<small>${T.roundWord(I.left)}</small>`)) out.push(`${where}: эффект «${I.name}» без раундов ${I.left}`);
        if (I.left == null && !r.includes('до конца этажа')) out.push(`${where}: эффект «${I.name}» без срока`);
        if (I.stacks > 1 && !r.includes(`×${I.stacks}`)) out.push(`${where}: эффект «${I.name}» без стаков ×${I.stacks}`);
        if (I.by && I.by !== true && !r.includes(`наложил: ${esc(T.uName(I.by))}`)) out.push(`${where}: эффект «${I.name}» — не сказано, кто наложил`);
        if (!I.icon || !r.includes(`<img src="${I.icon}"`)) out.push(`${where}: эффект «${I.name}» без значка`);
      }
      if (b.mode !== 'rounds') continue;
      for (const ab of u.table || []) {
        cnt.abs++;
        const r = rowOf(h, ab.n);
        if (!r) { out.push(`${where}: нет способности «${ab.n}»`); continue; }
        if (!r.includes(`<em class="bsi-ch" title="Шанс в свой ход">${T.pctBp(ab.ch)}</em>`)) out.push(`${where}: «${ab.n}» без шанса ${T.pctBp(ab.ch)}`);
        const art = T.bsAbArt(ab, 30);   // своя иконка библиотеки, уникальной способности — своя, прочее — той же школы, вида и охвата
        if (!LIB_IDS.has(ab.id)) {   // способность вне библиотеки — уникальная: своя иконка из BS_ART.abUnique
          cnt.uniq++;
          const stem = T.BS_ART.abUnique[ab.id];
          if (!stem) out.push(`${where}: уникальная способность «${ab.n}» (${ab.id}) — нет своей иконки в BS_ART.abUnique`);
          else if (!r.includes(`assets/art/abu/${stem}.webp`)) out.push(`${where}: «${ab.n}» — не своя иконка уникальной способности abu/${stem}`);
        }
        if (!/<span class="bsi-ic">(?:<img |<span class="bsi-vic"><svg )/.test(r)) out.push(`${where}: «${ab.n}» без иконки`);
        else if (art && !r.includes(art)) out.push(`${where}: «${ab.n}» — не рисованная иконка способности`);
        if (art) cnt.art++;
        if (ab.d && !r.includes(`<p>${esc(ab.d)}</p>`)) out.push(`${where}: «${ab.n}» — не сказано, что делает`);
      }
      const rest = 10000 - (u.table || []).reduce((a, ab) => a + ab.ch, 0), basic = rowOf(h, 'Обычная атака');
      if (!basic.includes(`<em class="bsi-ch" title="Шанс в свой ход">${T.pctBp(rest)}</em>`)) out.push(`${where}: обычная атака без остатка шанса ${T.pctBp(rest)}`);
      const kind = u.basicAll ? 'all' : u.rank === 'rune' ? 'rune' : T.EB.fxOf(u, u.main);   // вид обычной атаки — по ядру
      if (!basic.includes(`assets/art/${T.BS_ART.abIcons.basic[kind]}`)) out.push(`${where}: обычная атака без рисованной иконки своего вида «${kind}»`);
    }
  } finally { back(); }
  /* неизученный враг: ни имени, ни способностей — только эффекты на нём */
  const back2 = know(R, false);
  try {
    const u = b.u[1][0], h = insp(u);
    if (T.unitKnown(u)) out.push(`${key}: враг ${u.name} не стал неизученным — проверка тайны не идёт`);
    else if (h.includes(`<b class="bsi-nm">${esc(u.name)}</b>`) || /class="bsi-sec bsi-ab"/.test(h) || (u.table || []).some(ab => h.includes(`<b>${esc(ab.n)}</b>`))) out.push(`${key} · окно неизученного ${u.name}: видны имя или способности`);
  } finally { back2(); T.S.insp = null; }
  return out;
};
L.D = (R, key) => {
  const out = [], check = (what, h) => { const t = playerText(h); for (const [w, re] of SERVICE) { const m = t.match(re); if (m) out.push(`${key} · ${what}: игрок видит «${w}» — «${t.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\n/g, ' ')}»`); } };
  T.setTeam(false);
  try {
    T.S.insp = T.dkey(R.b.u[1][0]); check('бой', draw(key + ' · игрок'));
    run(key, () => T.paintInsp(R)); check('окно врага', (els.btInsp || {}).innerHTML || '');
    T.S.insp = T.dkey(R.b.u[0][0]); run(key, () => T.paintInsp(R)); check('окно героя', (els.btInsp || {}).innerHTML || '');
    check('легенда «Знаки»', T.legendHtml('rounds'));
    const ban0 = R.banner; if (!R.banner) R.banner = [T.uName(R.b.u[1][0]), ''];
    try { check('баннер', vm.runInContext('bsBanner', ctx)(R)); } finally { R.banner = ban0; }
  } finally { T.setTeam(true); T.S.insp = null; }
  return out;
};
const tested = [];
for (const [key, make] of BATTLES) {
  const R = run(key, make);
  if (!R || !R.b) { say(`${key}: бой не начался`); continue; }
  T.S.focus = R.id; T.S.route = 'battle'; T.S.overlay = null; T.S.bfv = 'square';
  seed(R); cnt.battles++; tested.push([key, R, T.S]);
  for (const k of ['A', 'B', 'D']) for (const e of L[k](R, key)) say(`закон ${k}: ${e}`);
}
/* итог этажа и «Стена» глазами игрока: герб победы и стены, ни одного служебного слова */
L.D2 = R => {
  const out = [];
  const runs0 = T.S.runs; T.S.runs = [R];   // итог ищет забег по номеру: номера у свежих состояний повторяются
  T.S.focus = R.id; T.setTeam(false);
  try {
    for (const [kind, crest] of [['boss', 'bs-win'], ['wall', 'bs-wall']]) {
      R.end = kind === 'wall' ? { kind, floor: R.floor, why: 'sand', foes: R.b.u[1].map(u => u.id) } : { kind };
      const h = run(`итог «${kind}»`, () => T.OV.result({ arg: R.id })) || '';
      if (!new RegExp(`<div class="dlg fit bs-res ${crest} `).test(h)) out.push(`итог «${kind}»: окно без класса ${crest}`);
      const k = crest.slice(3), img = T.BS_ART.crest[k];
      if (!h.includes(`<span class="bs-crest ${k}" style="background-image:url('`) || !h.includes(img + (h.includes(img + '?') ? '?' : "')"))) out.push(`итог «${kind}»: нет герба ${img} над окном`);
      const t = playerText(h); for (const [w, re] of SERVICE) if (re.test(t)) out.push(`итог «${kind}»: игрок видит «${w}»`);
    }
  } finally { T.setTeam(true); R.end = null; T.S.runs = runs0; }
  return out;
};
if (tested.length) for (const e of L.D2(tested[0][1])) say(`закон D: ${e}`);

/* ================== закон C: эффекты — только transform и opacity ================== */
const ALLOWED = new Set(['transform', 'opacity', 'offset', 'easing', 'composite']);
const fxSrc = read('fx.js');
/* сцена EnFx.scene из исходника fx.js — в своей песочнице: элементы пишут кадры каждой анимации */
function lawFx(src) {
  const out = [];
  for (const calm of [false, true]) {
    const frames = [];
    const mk = (w, h, x, y) => ({ style: {}, className: '', isConnected: true, children: [], parentElement: null, src: '', alt: '',
      appendChild(c) { this.children.push(c); c.parentElement = this; return c; }, remove() { this.isConnected = false; },
      getBoundingClientRect: () => ({ left: x, top: y, width: w, height: h, right: x + w, bottom: y + h }), clientWidth: w, clientHeight: h,
      animate(kf) { frames.push({ el: this, kf }); return {}; } });
    const box = vm.createContext({ document: { createElement: () => mk(0, 0, 0, 0) }, setTimeout: f => { f(); return 0; }, AV: p => 'assets/art/' + p, matchMedia: () => ({ matches: calm }) });
    box.window = box;
    try { vm.runInContext(src, box, { filename: 'fx.js' }); } catch (e) { out.push(`fx.js: исключение при загрузке — ${e.message}`); return out; }
    const Fx = box.EnFx;
    if (!Fx || typeof Fx.scene !== 'function') { out.push('fx.js: нет EnFx.scene'); return out; }
    const host = mk(800, 300, 0, 0), parent = mk(900, 400, 0, 0); host.parentElement = parent;
    const fx = Fx.scene(host, { speed: () => 1 }), a = mk(80, 99, 100, 100), b = mk(80, 99, 600, 120), c = mk(80, 99, 620, 20);
    const calls = { slash: () => fx.slash(b, null, null, true, 'Огонь'), arrow: () => fx.arrow(a, b), bolt: () => fx.bolt(a, b, null, null, true, 'Тьма'), wave: () => fx.wave(b, [a, c], null, null, 'Воздух'),
      heal: () => fx.heal(a), hot: () => fx.hot(a), shield: () => fx.shield(a), taunt: () => fx.taunt(a, [b, c]), dot: () => fx.dot(b, 'Огонь'), debuff: () => fx.debuff(b), ctrl: () => fx.ctrl(b, 'stun'),
      drain: () => fx.drain(b, a), dispel: () => fx.dispel(a), ult: () => fx.ult(a, null, 'Огонь'), crit: () => fx.crit(b), miss: () => fx.miss(b, 1), resist: () => fx.resist(b), death: () => fx.death(b),
      buff: () => fx.buff(a), revive: () => fx.revive(a), icon: () => fx.icon('assets/art/st/st-fire-dot.webp', b, 1), flip: () => fx.flip('boom', fx.center(b), 2000, 600) };
    for (const [k, f] of Object.entries(calls)) {
      const n0 = frames.length;
      try { f(); } catch (e) { out.push(`эффект «${k}»: исключение — ${e.message}`); continue; }
      if (!calm) cnt.kinds++;
      if (frames.length === n0 && !(calm && k === 'drain')) out.push(`${calm ? '«меньше движения»: ' : ''}эффект «${k}» не рисует ни кадра`);
    }
    for (const F of frames) {
      if (!calm) cnt.frames++;
      for (const k of F.kf) for (const p of Object.keys(k)) if (!ALLOWED.has(p)) out.push(`${calm ? '«меньше движения»: ' : ''}кадр анимации двигает «${p}» — только transform и opacity`);
      if (!calm) continue;
      const strip = F.el.parentElement && /\bvf\b/.test(F.el.parentElement.className || '');   // лента кадров: шаг кадра — на месте
      if (F.el === parent || F.el === host) out.push('«меньше движения»: поле трясётся');
      else if (!strip && F.kf.some(k => k.transform)) out.push(`«меньше движения»: спрайт «${F.el.className}» движется — ${F.kf.map(k => k.transform).filter(Boolean)[0]}`);
    }
    if (!calm) for (const k of Fx.KINDS || []) if (!Array.isArray(k) || k.length !== 3 || !k[1] || !k[2]) out.push('EnFx.KINDS: вид без имени или описания');
  }
  return out;
}
/* CSS боя: каскад index.html → battle-cards.css → battle-scene.css; «меньше движения» — отдельным слоем поверх */
function cssSheets(sceneCss) {
  const style = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  return [style, read('screens/battle-cards.css'), sceneCss].map(s => s.replace(/\/\*[\s\S]*?\*\//g, ''));
}
function splitCalm(css) {
  let normal = '', calm = '', i = 0; const re = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g; let m;
  while ((m = re.exec(css))) {
    normal += css.slice(i, m.index);
    let d = 1, j = re.lastIndex;
    for (; j < css.length && d; j++) { if (css[j] === '{') d++; else if (css[j] === '}') d--; }
    calm += css.slice(re.lastIndex, j - 1) + '\n'; i = j; re.lastIndex = j;
  }
  return [normal + css.slice(i), calm];
}
function lawCss(sceneCss) {
  const out = [], kf = {}, norm = {}, calm = {}, calmDur = {};
  const KF = /@keyframes ([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g;
  const take = (css, map, dur) => {
    for (const m of css.replace(KF, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      const body = m[2], a = body.match(/(?:^|;)\s*animation(?:-name)?\s*:\s*([^;!]+)/), du = body.match(/(?:^|;)\s*animation-duration\s*:\s*([^;]+)/);
      for (const s of m[1].split(',').map(x => x.trim()).filter(Boolean)) {
        if (a) map[s] = a[1].trim().split(/[\s,]+/).filter(n => n === 'none' || kf[n]);
        if (du && dur) dur[s] = du[1].trim();
      }
    }
  };
  const sheets = cssSheets(sceneCss).map(splitCalm);
  for (const [n, c] of sheets) for (const src of [n, c]) for (const m of src.matchAll(KF)) kf[m[1]] = [...new Set([...m[2].matchAll(/([\w-]+)\s*:/g)].map(x => x[1]))];
  for (const [n] of sheets) take(n, norm);
  Object.assign(calm, norm);
  for (const [, c] of sheets) take(c, calm, calmDur);
  const seen = new Set();
  for (const [layer, map] of [['', norm], ['«меньше движения»: ', calm]]) for (const [s, names] of Object.entries(map)) {
    if (!BATTLE_SEL.test(s)) continue;
    for (const n of names) {
      if (n === 'none') continue;
      if (!layer && !seen.has(n)) { seen.add(n); cnt.kf++; }
      const bad = kf[n].filter(p => p !== 'opacity' && p !== 'transform');
      if (bad.length) out.push(`${layer}${s} — анимация ${n} крутит ${bad.join(', ')}: только transform и opacity`);
      if (layer && kf[n].includes('transform') && CALM_INFO.includes(s)) out.push(`${layer}${s} движется (${n}) — сведения только гаснут`);
    }
  }
  for (const s of CALM_INFO) if (!/^var\(--bs-d\b[^)]*\)\s*!important$/.test(calmDur[s] || '')) out.push(`«меньше движения»: у ${s} нет длительности var(--bs-d) !important — общее правило index.html погасит его мгновенно`);
  /* выход врагов нового этажа (правка автора): карты выходят из-за правого края поля и идут влево, к своим местам — кадры только
     transform, первый — за краем (--bs-x: колонка карты, её ширина и запас), последний — на месте; шаг между картами, длительность
     и пройденная часть выхода — из данных (--bs-*). «Меньше движения» — карты проявляются на местах: кадры только opacity, последний
     виден, длительность возвращает --bs-foe (общее правило index.html гасит анимации мгновенно) */
  {
    const [sceneNorm] = sheets[2];
    const frames = n => { const m = sceneNorm.match(new RegExp('@keyframes ' + n + '\\s*\\{((?:[^{}]*\\{[^{}]*\\})*)\\s*\\}')); return m ? [...m[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(x => [x[1].trim(), x[2].trim()]) : []; };
    const rule = (sceneNorm.replace(KF, '').match(/\.bt-side\.f\.enter \.bc\{([^{}]*)\}/) || [])[1] || '';
    const fIn = frames('foeIn'), first = fIn[0] || ['', ''], last = fIn[fIn.length - 1] || ['', ''];
    if ((norm[FOE_SEL] || []).join() !== 'foeIn') out.push(`выход врагов: у ${FOE_SEL} анимация «${(norm[FOE_SEL] || []).join()}», ждали foeIn`);
    if ((kf.foeIn || []).join() !== 'transform') out.push(`выход врагов: кадры foeIn крутят ${(kf.foeIn || []).join(', ') || 'ничего'} — карты выходят из-за края, а не проявляются: только transform`);
    if (!/^(?:0%|from)$/.test(first[0]) || !first[1].includes('translate(var(--bs-x)')) out.push(`выход врагов: первый кадр foeIn — «${first.join(' ')}», а карта начинает за правым краем поля: translate(var(--bs-x), …)`);
    if (!/^(?:100%|to)$/.test(last[0]) || !/transform:translate\(0,0\)$/.test(last[1])) out.push(`выход врагов: последний кадр foeIn — «${last.join(' ')}», а карта встаёт на своё место`);
    if (!/\.bt-side\.f \.bc\{--bs-x:calc\(var\(--k\) \* var\(--colw\) \+ 100% \+ \d+px\)\}/.test(sceneNorm)) out.push('выход врагов: --bs-x — не «колонка карты, её ширина и запас»: карта начинает не за краем поля');
    for (const v of ['var(--bs-foe', 'var(--bs-step', 'var(--bs-at', 'var(--bs-o0', '(1 - var(--k)) * var(--bs-col']) if (!rule.includes(v)) out.push(`выход врагов: в правиле ${FOE_SEL} нет «${v}» — шаг, длительность и очередь не из данных`);
    if ((calm[FOE_SEL] || []).join() !== 'bsFoeShow') out.push(`«меньше движения»: выход врагов — анимация «${(calm[FOE_SEL] || []).join()}», ждали bsFoeShow: карты проявляются на местах`);
    const fShow = frames('bsFoeShow'), end = fShow[fShow.length - 1] || ['', ''];
    if ((kf.bsFoeShow || []).join() !== 'opacity' || !/^(?:100%|to)$/.test(end[0]) || end[1] !== 'opacity:1') out.push('«меньше движения»: кадры bsFoeShow — не «только opacity, в конце карта видна»: враги двигались бы или остались скрыты');
    if (!/^var\(--bs-foe\b[^)]*\)\s*!important$/.test(calmDur[FOE_SEL] || '')) out.push(`«меньше движения»: у ${FOE_SEL} нет длительности var(--bs-foe) !important — общее правило index.html покажет врагов разом`);
  }
  /* поход на новый этаж: живые герои шагают; при «меньше движения» — стоят (ADR-0048: тот же порядок без движения) */
  if (!(norm[WALK_SEL] || []).includes('walk')) out.push(`поход: отряд не шагает — у ${WALK_SEL} нет анимации walk`);
  if ((calm[WALK_SEL] || []).join() !== 'none') out.push(`«меньше движения»: отряд шагает в походе — у ${WALK_SEL} не animation:none`);
  /* завеса затемнения — над полем боя, под шапкой и линейкой этажей; нажатия проходят сквозь неё */
  {
    const zOf = (css, sel) => { const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')); const z = m && m[1].match(/z-index:\s*(\d+)/); return z ? +z[1] : null; };
    const style = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
    const veil = sceneCss.match(/\.bs-veil\{([^}]*)\}/), zv = zOf(sceneCss, '.bs-veil'), zf = zOf(style, '.bt-field'), zh = zOf(style, '.bt-hud');
    if (!veil) out.push('поход: нет завесы затемнения .bs-veil');
    else {
      if (!/pointer-events:\s*none/.test(veil[1])) out.push('поход: завеса затемнения ловит нажатия — нужен pointer-events:none');
      if (zv == null || zf == null || zh == null || !(zv > zf && zv < zh)) out.push(`поход: завеса затемнения (z-index ${zv}) — не над полем боя (${zf}) и не под шапкой (${zh})`);
    }
  }
  /* окно карты закрывают атрибутом hidden: правило с display у .bt-insp.bs-insp сильнее .bt-insp[hidden] из index.html — нужно своё */
  if (/\.bt-insp\.bs-insp\{[^}]*display\s*:/.test(sceneCss) && !/\.bt-insp\.bs-insp\[hidden\]\{display:none\}/.test(sceneCss)) out.push('окно карты: закрытое остаётся на экране — нет .bt-insp.bs-insp[hidden]{display:none}');
  return out;
}
const sceneCss = read('screens/battle-scene.css');
L.C = () => lawFx(fxSrc).concat(lawCss(sceneCss));
for (const e of L.C()) say(`закон C: ${e}`);

/* ================== закон E: данные, арт, ритуал ================== */
const ART = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'ui-art.json'), 'utf8')).items;
const onDisk = p => fs.existsSync(path.join(UI, 'assets', 'art', p));
const inSpec = p => !!ART[p] && fs.existsSync(path.join(ROOT, 'art', 'generated', typeof ART[p] === 'string' ? ART[p] : ART[p].from));
/* ход забега через первый этаж рядовых — до первого хода следующего этажа: свёрнутый или на экране — конец этажа не раньше b.t, ритуал на
   экране показан; на экране — цикл II и все артефакты Странника с добычей на пределе: «+N» ритуала — ровно то, что floorDone зачислил в
   кошелёк. Закон F — поход на новый этаж, на экране: фазы пути на каждом такте, кадры анимаций пути (фон, павшие, завеса) с фазой, на
   которой они начались, классы #bt и то, что в него ложится; новый этаж — когда нарисован и что на экране в этот миг, когда пошли его
   часы, когда встали враги и когда сделан первый ход; calm — то же при «меньше движения». Арены на время пробы — все задуманные
   готовы: смена арены видна и без выгрузки новых */
const ANIM_KEYS = new Set(['transform', 'opacity', 'offset', 'easing', 'composite']);
function ritualRun(vis, calm, noRit) {
  const out = [], EB = T.EB, F = EB.RULES.floor, mm0 = F.minMs, A = T.BS_ART, ready0 = A.arenaReady, media0 = win.matchMedia;
  const what = (vis ? (calm ? 'на экране при «меньше движения»' : 'на экране') : 'свёрнутый') + (noRit ? ', бой длиннее минимума' : ''), fn = n => vm.runInContext(n, ctx);
  /* #bt пробы: фон, павшие и завеса пишут свои кадры анимаций и фазу пути, на которой те начались; классы #bt и снятый с врагов класс
     выхода — в запись; всё, что ложится в #bt, — в список */
  const bt = document.getElementById('bt'), q0 = bt.querySelector, a0 = bt.appendChild, tg0 = bt.classList.toggle, rec = [], recEls = {}, added = [], cls = {};
  let R = null, tick = 0, enterCut = null;
  const mkRec = sel => { const e = stubEl(sel); e.animate = (kf, o) => { rec.push({ sel, kf, o: o || {}, ph: fn('bsTripPhase')(R) }); return {}; }; e.querySelector = () => null; return e; };
  const foeSide = stubEl('.bt-side.f.enter'); foeSide.classList.remove = c => { if (c === 'enter' && enterCut == null) enterCut = tick; };
  F.minMs = Object.assign({}, mm0, { o: noRit ? 0 : RITUAL_TEST_MS });   // без ритуала: бой длиннее минимума — путь = доигрыш удара и переход
  if (vis) A.arenaReady = Object.values(A.arenas).flat();
  if (calm) win.matchMedia = () => ({ matches: true, addEventListener() {}, addListener() {} });
  try {
    fresh();
    if (vis) {
      T.S.acc.cycle = 2; T.S.wn = T.S.wn || {}; T.S.wn.art = T.S.wn.art || {};
      for (const a of vm.runInContext('window.EN_WANDERER', ctx).art.list) if (a.loot) T.S.wn.art[a.id] = a.lv;
    }
    vm.runInContext('typeof syncCycle === "function" && syncCycle()', ctx);   // вариант биома по циклу — как перед стартом забега
    const B = EB.BIOMES.b1, fl = B.floors.findIndex(f => f.g === 'o') + 1;
    run('ритуал · старт', () => T.startRun('s1', 'b1', fl));
    R = lastRun();
    if (!R || !R.b) return [`ритуал ${what}: забег не начался`];
    if (vis) { T.S.focus = R.id; T.S.route = 'battle'; } else T.S.route = 'descent';
    bt.__bsTrip = null;
    /* сторона врагов с классом выхода есть на экране только у нового этажа, пока класс не снят */
    bt.querySelector = sel => sel === FOE_SEL.split(' ')[0] ? (R.floor !== fl && enterCut == null ? foeSide : null)
      : /^\.(?:bt-bgs|bt-side\.f|bs-veil)$/.test(sel) ? (recEls[sel] = recEls[sel] || mkRec(sel)) : q0.call(bt, sel);
    bt.appendChild = x => { added.push(String(x && x.className || '')); return x; };
    bt.classList.toggle = (c, on) => { cls[c] = !!on; };
    const b = R.b, bgsOf = h => (h.match(/<div class="bt-bgs">([\s\S]*?)<\/div>/) || [])[1] || '';
    const cur = fn('bsArenaUrl')('b1', fl), want = fn('bsArenaUrl')('b1', fl + 1);
    if (vis && !bgsOf(draw('поход · этаж ' + fl)).includes(`src="${cur}"`)) out.push(`поход: экран этажа ${fl} — не на арене своего этажа (${cur})`);
    let early = false, shown = null, step = 0, t0 = null, doneAt = null, next = null, runMs = null, tot = null, totBad = false, sp0 = null;
    let drawnAt = null, drawn = null, enterOff = null, actAt = null, actEarly = false;
    const phases = [], walkBy = {};
    for (let n = 0; n < STEPS_MAX && !R.over; n++) {
      const v0 = R.view, gap0 = R.gap > 0;
      tick = n;
      run(`ритуал ${what} · ход`, () => fn('advance')(R, STEP_MS));   // нынешний advance: мутации подменяют глобальный
      const p = vis && next == null ? fn('bsTripPhase')(R) : null;
      if (R.floor === fl) {
        if (!gap0 && R.view - v0 !== STEP_MS && !step) step = R.view - v0;   // время показа идёт ровно тактом — и на последнем такте ритуала
        if (b.over && t0 == null) t0 = n;
        if (b.over && b.win && b.ritualMs > 0 && shown == null) shown = R.bsRit === b;
        if (b.over && R.view < b.t && R.gap > 0) early = true;
        if (R.gap > 0 && doneAt == null) { doneAt = n; runMs = R.runMs; }
      } else {
        /* новый этаж нарисован: что на экране в этот миг, на какой фазе пути, стоят ли часы его боя и с какого места идёт выход врагов */
        if (drawnAt == null) {
          const C = vis ? fn('bsTripClock')(R) : null;
          drawnAt = n;
          drawn = { before: phases[phases.length - 1], ph: p, held: !!(C && C.held), html: vis && els.game ? els.game.innerHTML : '', at: fn('bsEnterAt')(R), enter: !!R.enter };
        }
        if (next == null && R.view > 0) next = n - 1;   // часы нового боя пошли: путь кончился тактом раньше
        else if (next != null && R.view - v0 !== STEP_MS && !step) step = R.view - v0;
        if (R.enter && R.acted.length) actEarly = true;   // ход боя, пока враги ещё выходят
        if (!R.enter && enterOff == null) enterOff = n;
        if (R.acted.length && actAt == null) actAt = n;
        if (actAt != null && enterOff != null) break;   // враги встали и первый ход сделан
      }
      if (vis && next == null) {
        const C = fn('bsTripClock')(R);
        if (C) { if (tot == null) { tot = C.total; sp0 = fn('bsTripSpans')(C); } else if (C.total !== tot) totBad = true; }
        if (p || R.floor === fl) phases.push(p);   // путь кончился — у нового этажа фазы нет: его часы пойдут со следующего такта
        if (p && R.floor === fl) walkBy[p] = !!cls['bs-march'];
      }
    }
    if (!b.over || !b.win) out.push(`ритуал ${what}: этаж ${fl} Мастерской не взят — проверить нечем`);
    else if (!noRit && !(b.ritualMs > 0)) out.push(`ритуал ${what}: ядро не дотянуло этаж до минимума — ritualMs ${b.ritualMs}`);
    else if (noRit && b.ritualMs > 0) out.push(`ритуал ${what}: у пробы без минимума ядро добавило ритуал ${b.ritualMs} мс`);
    else if (early) out.push(`ритуал ${what}: этаж кончился раньше конца боя по ядру (b.t ${b.t} мс)`);
    else if (doneAt == null) out.push(`ритуал ${what}: этаж не кончился за ${STEPS_MAX * STEP_MS} мс`);
    else if (next == null) out.push(`ритуал ${what}: бой нового этажа не начался за ${STEPS_MAX * STEP_MS} мс`);
    if (vis && b.ritualMs > 0 && !shown) out.push('ритуал на экране: добыча не показана — advance не позвал bsRitual');
    if (step) out.push(`ритуал ${what}: за такт ${STEP_MS} мс время показа прибавило ${step} мс`);
    /* стена фарма (ADR-0044): этаж с переходом прибавляет к забегу ровно b.t + gapMs — поход её не меняет */
    if (runMs != null && runMs !== b.t + F.gapMs) out.push(`ритуал ${what}: этаж прибавил забегу ${runMs} мс, а ядро — b.t + gapMs = ${b.t + F.gapMs}`);
    if (vis && b.ritualMs > 0 && shown) {
      const G = R.bsLoot || {}, Lt = R.loot, pairs = [['gold', G.gold, Lt.gold], ['spirit', G.spirit, Lt.spirit], ['souls', G.souls, Lt.souls], ['рунный ключ', G.runeKeys || 0, Lt.keys || 0]];
      for (const [k, a, z] of pairs) if (a !== z) out.push(`ритуал на экране: «+N» добычи (${k} ${a}) не сходится с кошельком (${z}) — артефакты и цикл игрока (lootCtx)`);
      if (!vm.runInContext('lootCtx()', ctx)) out.push('ритуал на экране: у пробы нет прибавок цикла и артефактов — сверять нечего');
    }
    /* ================== закон F: поход на новый этаж ================== */
    /* выход врагов и первый ход — и на экране, и у свёрнутого забега: пока враги выходят, ходов боя нет; встали они на том же такте, на
       котором сделан первый ход, — бой начинается, когда враги встали */
    if (next != null) {
      if (!drawn || !drawn.enter) out.push(`выход врагов ${what}: у нового этажа выхода врагов нет`);
      else if (actEarly) out.push(`выход врагов ${what}: ход боя сделан, пока враги ещё выходят`);
      else if (actAt == null || enterOff == null) out.push(`выход врагов ${what}: ${actAt == null ? 'первого хода боя' : 'конца выхода'} не дождались`);
      else if (actAt !== enterOff) out.push(`выход врагов ${what}: враги встали на такте ${enterOff}, первый ход — на такте ${actAt}: бой начинается не тогда, когда они встали`);
    }
    if (vis && next != null && t0 != null) {
      const Q = F.ritual, lead = Math.max(0, Q.enterMs - EB.RULES.rounds.gapMs);
      const seq = phases.slice(t0), order = seq.filter((p, i) => p !== seq[i - 1]), len = k => seq.filter(p => p === k).length * STEP_MS;
      if (tot == null) out.push(`поход ${what}: часов пути нет — путь не начался`);
      else {
        if (totBad) out.push(`поход ${what}: длина пути меняется по ходу`);
        /* длительность этажа та же: часы нового боя идут ровно с конца пути — хотя этаж нарисован раньше, когда отряд встал */
        const real = (next - t0) * STEP_MS;
        if (real < tot || real - tot >= STEP_MS) out.push(`поход ${what}: часы нового этажа пошли через ${real} мс после конца боя, а путь — ${tot} мс: длительность этажа изменилась`);
        if (order.join() !== TRIP_ORDER.join()) out.push(`поход ${what}: фазы ${order.map(p => p || '—').join(' → ')}, ждали ${TRIP_ORDER.join(' → ')}`);
        for (const [k, ms] of [['dark', Q.darkMs], ['black', Q.blackMs], ['open', Q.openMs], ['walk', Q.walkMs], ['foes', lead]]) if (Math.abs(len(k) - ms) > STEP_MS) out.push(`поход ${what}: фаза «${k}» идёт ${len(k)} мс, в данных ${ms}`);
        const march = sp0 ? sp0[1][2] - sp0[1][1] : 0;
        if (!(len('march') > 0)) out.push(`поход ${what}: отряд не идёт дальше — шага нет`);
        else if (Math.abs(len('march') - march) > 2 * STEP_MS) out.push(`поход ${what}: шаг идёт ${len('march')} мс, а остаток пути — ${march}`);
        if (!CNT && !calm) { cnt.trips++; cnt.tripMs.push(`${noRit ? 'бой длиннее минимума' : 'рядовые с ритуалом'}: путь ${tot} мс, шаг до темноты ${len('march')}, после темноты ${len('open') + len('walk')}, выход врагов ${Q.enterMs}`); }
      }
      /* отряд встал — новый этаж на экране: до него шёл шаг после темноты, часы боя стоят до конца пути, выход врагов идёт с начала,
         выходит вся колода этажа — на арене этого этажа; встали враги через enterMs, и класс выхода с их карт снят на том же такте */
      if (!drawn) out.push(`поход ${what}: новый этаж не нарисован`);
      else {
        if (drawn.before !== 'walk' || drawn.ph !== 'foes') out.push(`поход ${what}: новый этаж нарисован на переходе фаз «${drawn.before || '—'}» → «${drawn.ph || '—'}», а враги выходят, когда отряд встал: walk → foes`);
        if (!drawn.held) out.push(`поход ${what}: новый этаж нарисован, а часы его боя не стоят до конца пути`);
        if (drawn.at == null || drawn.at < 0 || drawn.at > STEP_MS) out.push(`поход ${what}: на первом кадре нового этажа выход врагов идёт с ${drawn.at} мс — не с начала`);
        const deck = B.floors[fl].m.length, cards = (drawn.html.match(/<div class="bc foe /g) || []).length;
        if (!drawn.html.includes('<div class="bt-side f enter">')) out.push(`поход ${what}: враги нового этажа уже стоят на местах — класса выхода нет`);
        if (cards !== deck) out.push(`поход ${what}: в колоде этажа ${fl + 1} врагов ${deck}, а выходит ${cards}`);
        if (!bgsOf(drawn.html).includes(`src="${want}"`)) out.push(`поход ${what}: враги выходят не на арене своего этажа (${want})`);
        const went = enterOff != null ? (enterOff - drawnAt) * STEP_MS + (drawn.at || 0) : null;
        if (went == null || Math.abs(went - Q.enterMs) > STEP_MS) out.push(`поход ${what}: выход врагов шёл ${went == null ? '—' : went} мс, в данных ${Q.enterMs}`);
        if (enterCut == null || enterCut !== enterOff) out.push(`поход ${what}: класс выхода с карт врагов ${enterCut == null ? 'не снят' : `снят на такте ${enterCut}, а встали они на такте ${enterOff}`} — его анимация сильнее удара, каста и гибели карты`);
      }
      /* ожидания нет — ни «Этаж взят» с песком, ни «Спуск ниже»; добыча летит в кошелёк */
      if (added.some(c => /\bbs-(?:taken|transit)\b/.test(c))) out.push(`поход ${what}: вернулась плашка ожидания — ${added.filter(c => /\bbs-(?:taken|transit)\b/.test(c)).join(', ')}`);
      if (!added.some(c => /\bbs-loot\b/.test(c))) out.push(`поход ${what}: добыча этажа не летит в кошелёк — нет плашки «+N»`);
      /* кадры: только transform и opacity; до темноты фон едет и павшие уходят; после темноты фон едет по новой арене — с открытия завесы —
         и тормозит до места: конец круга петли, последний отрезок — кривая остановки; при «меньше движения» — ничто не движется;
         завеса — затемнение, затем новая арена */
      const kfs = sel => rec.filter(x => x.sel === sel).map(x => x.kf), moved = x => x.kf.some(k => k.transform != null);
      const bgs = (...ph) => rec.filter(x => x.sel === '.bt-bgs' && ph.includes(x.ph) && moved(x));
      for (const x of rec) for (const k of x.kf) for (const p of Object.keys(k)) if (!ANIM_KEYS.has(p)) out.push(`поход ${what}: кадр ${x.sel} двигает «${p}» — только transform и opacity`);
      if (calm) {
        const m = rec.filter(moved); if (m.length) out.push(`«меньше движения»: в походе движется ${[...new Set(m.map(x => x.sel))].join(', ')}`);
        const on = Object.keys(walkBy).filter(k => walkBy[k]); if (on.length) out.push(`«меньше движения»: отряд шагает в походе — на фазах ${on.join(', ')}`);
      } else {
        if (!bgs('march', 'dark').length) out.push(`поход ${what}: фон не едет — отряд не переходит дальше`);
        if (!kfs('.bt-side.f').some(kf => kf.some(k => k.transform != null))) out.push(`поход ${what}: павшие не уходят со своей комнатой`);
        const arr = bgs('black', 'open', 'walk')[0];
        if (!arr) out.push(`поход ${what}: после темноты фон стоит — отряд не идёт по новой арене`);
        else {
          const k = arr.kf, rest = 'translateX(-200.00%)';
          if (arr.ph === 'walk') out.push(`поход ${what}: фон поехал только после открытия — новая арена открывается, пока отряд ещё идёт`);
          if (arr.o.duration !== Q.openMs + Q.walkMs) out.push(`поход ${what}: шаг по новой арене идёт ${arr.o.duration} мс, в данных открытие и шаг после темноты — ${Q.openMs + Q.walkMs}`);
          if (k.length < 3 || k[k.length - 1].transform !== rest || k[0].transform === rest) out.push(`поход ${what}: шаг по новой арене — ${k.map(x => x.transform).join(' → ')}: фон должен приехать на своё место ${rest}`);
          else if (k[k.length - 2].easing !== T.BS_DATA.tripStop) out.push(`поход ${what}: фон встаёт рывком — последний отрезок идёт «${k[k.length - 2].easing}», а не кривой остановки BS_DATA.tripStop`);
        }
        for (const k of ['march', 'dark', 'open', 'walk']) if (!walkBy[k]) out.push(`поход ${what}: на фазе «${k}» отряд не шагает — класса bs-march нет`);
        if (walkBy.settle) out.push(`поход ${what}: отряд шагает, пока доигрывается последний удар`);
      }
      if (!kfs('.bt-side.f').some(kf => kf[kf.length - 1].opacity === 0)) out.push(`поход ${what}: павшие не гаснут`);
      const veil = kfs('.bs-veil').map(kf => `${kf[0].opacity}→${kf[kf.length - 1].opacity}`).join(', ');
      if (veil !== '0→1, 1→0') out.push(`поход ${what}: завеса ${veil || 'не двигалась'} — ждали затемнение 0→1, затем новую арену 1→0`);
      /* арена: в темноте — арена следующего этажа, новый этаж — на ней же */
      if (want === cur) out.push(`поход ${what}: у этажей ${fl} и ${fl + 1} одна арена — смены нет`);
      if (!((recEls['.bt-bgs'] || {}).innerHTML || '').includes(`src="${want}"`)) out.push(`поход ${what}: в темноте не арена следующего этажа (${want})`);
      if (!bgsOf(draw('поход · этаж ' + (fl + 1))).includes(`src="${want}"`)) out.push(`поход ${what}: экран этажа ${fl + 1} — не на арене своего этажа (${want})`);
    }
  } finally {
    F.minMs = mm0; A.arenaReady = ready0; win.matchMedia = media0; bt.querySelector = q0; bt.appendChild = a0; bt.classList.toggle = tg0; bt.__bsTrip = null;
  }
  return out;
}
L.E = () => {
  const out = [], D = T.BS_DATA, EB = T.EB, A = vm.runInContext('window.EN_ABILITIES', ctx);
  const keys = new Set(['stun', 'silence', 'stop', 'paralyze', 'freeze', 'terror', 'knock', 'blind', 'nameless', 'iceblock', 'doom', 'trophy', 'greed', 'shield', 'immune']);
  for (const s of A.sets) for (const x of s.items) if (x.data && x.data.st) keys.add(x.data.st);
  for (const k of EB.GOOD_ST || []) keys.add(k);
  for (const k of keys) {
    if (!D.st[k]) { out.push(`значок эффекта «${k}»: нет в BS_DATA.st`); continue; }
    const p = 'st/' + D.st[k] + '.webp';
    if (!onDisk(p)) out.push(`значок эффекта «${k}»: нет файла ${p}`); else if (!inSpec(p)) out.push(`значок эффекта «${k}»: нет в ui-art.json или нет исходника`);
  }
  for (const s of A.sets) if (s.eff) for (const kind of ['dot', 'hot']) if (s.eff[kind]) {
    const p = `st/st-${D.school[s.n] || 'steel'}-${kind}.webp`;
    if (!onDisk(p) || !inSpec(p)) out.push(`${kind} школы «${s.n}»: нет значка ${p}`);
  }
  /* одно объяснение эффекта на игру (ADR-0052): что делает контроль, дебафф и бафф на карте бойца — словарь эффектов библиотеки
     (EN_ABILITIES.fx) с числами эффекта ядра. С числами набора строка окна — то самое определение, что стоит в описаниях способностей;
     со своими числами — они: порог льда под «Крепким льдом», слом строя без уклонения — без слов об уклонении */
  const FXD = A.fx || {}, line = st => { const I = (T.bsStatuses({ st: [Object.assign({ left: 2, left0: 2 }, st)], aura: null }, { hp: 1, sh: 0, dead: false }, true) || [])[0]; return I ? I.line : null; };
  let nFx = 0;
  for (const [k, F] of Object.entries(FXD)) if (F.t) {
    nFx++;
    const B = F.base || {}, got = run(`эффект «${F.n}»`, () => line({ k, pow: B.pow || 0, breakPct: B.breakPct || 0, evadeDown: B.evadeDown || 0 }));
    if (got !== F.def) out.push(`эффект «${F.n}» (${k}): окно карты говорит «${got}», а описания способностей — «${F.def}»`);
    if (/[{}\[\]]/.test(got || '')) out.push(`эффект «${F.n}» (${k}): в строке окна остался знак шаблона — «${got}»`);
  }
  if (nFx < 24) out.push(`словарь эффектов библиотеки (EN_ABILITIES.fx): объяснений контроля, дебаффа и баффа ${nFx}, а эффектов наборов 24`);
  const ice = run('порог льда', () => line({ k: 'freeze', pow: 0, breakPct: 25 })), brk = run('слом строя', () => line({ k: 'break', pow: 2500, evadeDown: 0 }));
  if (!/25/.test(ice || '') || /10/.test(ice || '')) out.push(`заморозка со своим порогом удара: окно карты говорит «${ice}» — порог не из эффекта ядра`);
  if (/уклонени/.test(brk || '') || !/25/.test(brk || '')) out.push(`слом строя без уклонения: окно карты говорит «${brk}»`);
  const V = vm.runInContext('EnFx.VFX_ART', ctx);
  for (const k of V.ready) { const p = 'vfx/' + k + '.webp'; if (!onDisk(p) || !inSpec(p)) out.push(`спрайт эффекта ${p}: нет на диске или в ui-art.json`); }
  for (const [k, n] of Object.entries(V.strips)) {
    const it = ART['vfx/' + k + '-strip.webp'], sz = it && it.size;
    if (!V.ready.includes(k + '-strip')) out.push(`лента «${k}»: нет в VFX_ART.ready`);
    if (!sz || sz[0] !== sz[1] * n) out.push(`лента flipbook «${k}»: ${sz ? sz.join(' × ') : 'нет в ui-art.json'}, а кадров в данных ${n}`);
  }
  for (const s of new Set(Object.values(V.school))) for (const p of ['proj', 'hit', 'tick']) if (!V.ready.includes(p + '-' + s)) out.push(`школа ${s}: нет спрайта ${p}-${s}`);
  for (const t of T.BS_ART.frames) {
    if (!T.BF.types[t]) out.push(`рамка-квадрат ${t}: такого типа нет в BF.types`);
    for (const p of [`bframes-sq/${t}.png`, `bframes-sq/${t}-crest.png`, `bframes-sq/${t}-full.png`]) if (!onDisk(p) || !inSpec(p)) out.push(`рамка-квадрат ${t}: нет ${p} на диске или в ui-art.json`);
    for (const [nm, g] of [['тело', T.BS_FRAME.body[t]], ['целиком', T.BS_FRAME.full[t]]]) if (!g || g.length !== 4 || g.some(v => !Number.isInteger(v) || v < 0 || v >= 500)) out.push(`рамка-квадрат ${t} (${nm}): геометрия — не четыре целые тысячные`);
  }
  for (const p of [T.BS_ART.plaque, T.BS_ART.round, T.BS_ART.panel, T.BS_ART.crest.win, T.BS_ART.crest.wall]) if (!onDisk(p) || !inSpec(p)) out.push(`украшение боя ${p}: нет на диске или в ui-art.json`);
  for (const p of Object.values(T.BS_ART.abIcons.basic).concat(Object.values(T.BS_ART.abIcons.own))) if (!onDisk(p) || !inSpec(p)) out.push(`иконка боя ${p}: нет на диске или в ui-art.json`);
  /* иконки уникальных способностей: каждая клетка листов задания — в таблице BS_ART.abUnique, на диске и в описи; лишних в таблице нет */
  const AJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'jobs', 'ability-icons-unique.json'), 'utf8'));
  const cells = AJ.jobs.flatMap(j => j.cells).filter(c => c[0] !== 'spare');
  for (const [id, stem] of cells) {
    if (T.BS_ART.abUnique[id] !== stem) out.push(`уникальная способность ${id}: в BS_ART.abUnique «${T.BS_ART.abUnique[id]}», в задании «${stem}»`);
    const p = `abu/${stem}.webp`; if (!onDisk(p) || !inSpec(p)) out.push(`иконка уникальной способности ${p}: нет на диске или в ui-art.json`);
    if (LIB_IDS.has(id)) out.push(`уникальная способность ${id} — на деле из библиотеки: у неё своя иконка`);
  }
  for (const id of Object.keys(T.BS_ART.abUnique)) if (!cells.some(c => c[0] === id)) out.push(`BS_ART.abUnique: ${id} — нет в задании ability-icons-unique.json`);
  for (const k of ['melee', 'arrow', 'magic']) if (!T.BS_ART.abIcons.basic[k]) out.push(`обычная атака вида «${k}» (RULES.cls, fx): нет иконки в BS_ART.abIcons.basic`);
  const F = EB.RULES.floor;
  if (!F.minMs || ['o', 'e', 'b', 'guard'].some(k => !Number.isInteger(F.minMs[k]) || F.minMs[k] < 0)) out.push('RULES.floor.minMs: не целые мс по виду этажа');
  const RK = ['enterMs', 'stepMs', 'fallMs', 'takenMs', 'lootMs', 'roomMs', 'darkMs', 'blackMs', 'openMs', 'walkMs'];
  if (!F.ritual || RK.some(k => !Number.isInteger(F.ritual[k]) || F.ritual[k] <= 0)) out.push('RULES.floor.ritual: фазы показа — не целые мс');
  else {
    /* затемнение, темнота, открытие, шаг после темноты и начало выхода врагов — в переходе gapMs: конец этажа (добыча, осада) — до
       затемнения, и при бое длиннее минимума тоже. Выход начинается за enterMs − rounds.gapMs до начала этажа: кончается к первому ходу */
    const Q = F.ritual, lead = Math.max(0, Q.enterMs - EB.RULES.rounds.gapMs), tail = Q.darkMs + Q.blackMs + Q.openMs + Q.walkMs + lead;
    if (tail > F.gapMs) out.push(`поход: затемнение, темнота, открытие, шаг после темноты и начало выхода врагов — ${tail} мс, длиннее перехода gapMs ${F.gapMs}`);
    if (vm.runInContext('bsLead', ctx)({ mode: 'rounds' }) !== lead) out.push(`выход врагов: начинается за ${vm.runInContext('bsLead', ctx)({ mode: 'rounds' })} мс до начала этажа, а до первого хода боя — enterMs − rounds.gapMs = ${lead}`);
    /* сколько идёт выход — до первого хода боя: у забега по биому — весь enterMs (он начинается до начала этажа); у боя со своей
       сценой выход идёт с начала боя и укладывается в паузу раунда; прежняя модель темпа первого хода не ждёт — весь enterMs */
    const enterMsOf = vm.runInContext('bsEnterMs', ctx), short = Math.min(Q.enterMs, EB.RULES.rounds.gapMs);
    for (const [who, R, want] of [['забег по биому', { mode: 'rounds', b: { mode: 'rounds' } }, Q.enterMs], ['бой со своей сценой', { scene: {}, b: { mode: 'rounds' } }, short],
      ['прежняя модель темпа', { mode: 'tempo', b: { mode: 'tempo' } }, Q.enterMs]]) if (enterMsOf(R) !== want) out.push(`выход врагов · ${who}: идёт ${enterMsOf(R)} мс, а до первого хода боя — ${want}`);
    /* выход врагов на каждой колоде — от одной до пяти карт, и весь, и уложенный в паузу раунда: выходят все, передняя колонка — раньше
       задней, шаг между картами — из данных, последняя карта встаёт ровно в конце выхода */
    const foeIn = vm.runInContext('bsFoeIn', ctx), SLOT = vm.runInContext('SLOT', ctx);
    for (const total of [...new Set([Q.enterMs, short])]) for (let n = 1; n <= FOES_MAX; n++) {
      const I = foeIn(n, total), slots = SLOT[n] || [], tag = `${n} за ${total} мс`;
      if (slots.length !== n || !I || I.at.length !== n) { out.push(`выход врагов: у колоды в ${n} карт мест ${slots.length}, выходит ${I ? I.at.length : 0}`); continue; }
      if (!Number.isInteger(I.foeMs) || I.foeMs <= 0 || I.at.some(t => !Number.isInteger(t) || t < 0) || Math.min(...I.at) !== 0) out.push(`выход врагов (${tag}): времена — не целые мс от нуля: карта идёт ${I.foeMs}, трогаются в ${I.at.join(', ')}`);
      else if (Math.max(...I.at) + I.foeMs !== total) out.push(`выход врагов (${tag}): последняя карта встаёт через ${Math.max(...I.at) + I.foeMs} мс: к первому ходу боя враги не встали`);
      const front = slots.map((s, i) => s[0] ? I.at[i] : -1).filter(t => t >= 0), back = slots.map((s, i) => s[0] ? -1 : I.at[i]).filter(t => t >= 0);
      if (front.length && back.length && Math.max(...front) >= Math.min(...back)) out.push(`выход врагов (${tag}): задняя колонка трогается не позже передней — ${back.join(', ')} против ${front.join(', ')}`);
      if (I.stepMs !== Q.stepMs) out.push(`выход врагов (${tag}): шаг между картами ${I.stepMs} мс, в данных stepMs ${Q.stepMs}`);
    }
    if (foeIn(FOES_MAX).foeMs !== foeIn(FOES_MAX, Q.enterMs).foeMs) out.push('выход врагов: без названной длительности выход идёт не enterMs');
  }
  /* закон F, данные: арены этажей биомов 1–4 — по четыре, первая — нынешняя арена биома; готовые — на диске и в описи, выгруженные — в
     arenaReady; этаж берёт свою по номеру, соседние этажи — разные, при каждом вызове — та же (пробуем со всеми задуманными готовыми) */
  {
    const AR = T.BS_ART.arenas || {}, RD = T.BS_ART.arenaReady || [], all = Object.values(AR).flat();
    for (const id of ARENA_BIOMES) {
      const list = AR[id], base = id === 'b1' ? 'arena-workshop.jpg' : `arena-${id}.jpg`;
      if (!EB.BIOMES[id]) out.push(`арены этажей: биома ${id} нет в ядре`);
      if (!list) { out.push(`арены этажей: у биома ${id} нет списка в BS_ART.arenas`); continue; }
      if (list.length !== ARENAS_PER_BIOME || new Set(list).size !== list.length) out.push(`арены этажей ${id}: ${list.length}, ждали ${ARENAS_PER_BIOME} разных`);
      if (list[0] !== base) out.push(`арены этажей ${id}: первая — ${list[0]}, а нынешняя арена биома — ${base}`);
    }
    for (const p of RD) {
      if (!all.includes(p)) out.push(`BS_ART.arenaReady: ${p} — нет в BS_ART.arenas`);
      if (!onDisk(p) || !inSpec(p)) out.push(`арена этажа ${p}: в arenaReady, но нет на диске или в ui-art.json с исходником`);
    }
    for (const p of all) if (!RD.includes(p) && onDisk(p) && inSpec(p)) out.push(`арена этажа ${p} выгружена, но её нет в BS_ART.arenaReady — этаж её не берёт`);
    if (!CNT) { cnt.arenaPlan = all.length; cnt.arenaReady = all.filter(p => RD.includes(p)).length; }
    const of = vm.runInContext('bsArenaOf', ctx);
    /* этажей у биома — у самого длинного его варианта: короткий обучения и полный с цикла II (ADR-0044) */
    const floorsOf = id => { const B = EB.BIOMES[id] || {}; return Math.max((B.floors || []).length, ((B.full || {}).floors || []).length); };
    T.BS_ART.arenaReady = all;
    try {
      for (const id of Object.keys(AR)) for (let f = 1; f < floorsOf(id); f++) {
        const a = of(id, f), z = of(id, f + 1);
        if (!a || !z || a === z) { out.push(`арены этажей ${id}: этажи ${f} и ${f + 1} — ${a && a === z ? 'одна арена ' + a : 'без арены'}`); break; }
        if (of(id, f) !== a) { out.push(`арены этажей ${id}: этаж ${f} берёт то одну арену, то другую`); break; }
        if (!CNT) cnt.floors++;
      }
      if (of('b1', 1) !== AR.b1[0]) out.push('арены этажей: первый этаж и страж — не на первой арене биома');
    } finally { T.BS_ART.arenaReady = RD; }
  }
  return out.concat(ritualRun(false), ritualRun(true), ritualRun(true, true), ritualRun(true, false, true));
};
for (const e of L.E()) say(`закон E: ${e}`);
{
  const kit = T.KIT_EXTRA.find(x => { try { return String(x.html()).includes('Бой AAA'); } catch (_) { return false; } });
  if (!kit) say('UI-кит: нет раздела «Бой AAA»');
  else { const h = run('UI-кит', () => kit.html()) || ''; const m = h.match(/.{0,50}(?:undefined|NaN|\[object ).{0,30}/); if (m) say(`UI-кит «Бой AAA»: в разметке undefined, NaN или [object — «${m[0]}»`); }
}
if (err.length) done();

/* ================== мутации: ломаем — закон обязан упасть ================== */
CNT = Object.assign({}, cnt);
const [K0, R0, S0] = tested.find(([k]) => /Убер/.test(k)) || tested[0];   // бой Убер-босса: в нём и способности библиотеки, и уникальные
const [K1, R1, S1] = tested.find(([k]) => /\(e\)/.test(k)) || tested[0];    // итог этажа и «Стена» — у забега по биому
/* закон — в том состоянии, где бой начался: закон E и мутации заводят свежие состояния */
const lawOn = k => {
  if (k === 'C') return L.C(); if (k === 'E') return L.E();
  const [Kx, Rx, Sx] = k === 'D2' ? [K1, R1, S1] : [K0, R0, S0];
  T.S = Sx; T.S.focus = Rx.id; T.S.route = 'battle'; T.S.overlay = null;
  return k === 'D2' ? L.D2(Rx) : L[k](Rx, Kx);
};
const MUT = [
  ['A', 'на полосе — не то здоровье', 'bsHpTxt__ = bsHpTxt; bsHpTxt = (n, s) => s ? bsHpTxt__(n, s) : bsHpTxt__(n + 1);', 'bsHpTxt = bsHpTxt__;'],
  ['A', 'щит на полосе пропал', 'bsHpTxt__ = bsHpTxt; bsHpTxt = (n, s) => s ? \'\' : bsHpTxt__(n);', 'bsHpTxt = bsHpTxt__;'],
  ['A', 'значок без числа раундов', 'bsSi__ = bsSi; bsSi = I => bsSi__(Object.assign({}, I, { left: null }));', 'bsSi = bsSi__;'],
  ['A', 'значок — вектор вместо медальона', 'bsSi__ = bsSi; bsSi = I => bsSi__(Object.assign({}, I, { icon: \'\' }));', 'bsSi = bsSi__;'],
  ['A', '«+N» врёт', 'statusHtml__ = statusHtml; statusHtml = (u, d, r) => statusHtml__(u, d, r).map(s => s.replace(/>\\+(\\d+)</, (m, n) => \'>+\' + (+n + 1) + \'<\'));', 'statusHtml = statusHtml__;'],
  ['B', 'способность без шанса', 'bsAbRow__ = bsAbRow; bsAbRow = (ab, ch, on, o) => bsAbRow__(ab, null, on, o);', 'bsAbRow = bsAbRow__;'],
  ['B', 'способность без иконки', 'bsAbRow__ = bsAbRow; bsAbRow = (ab, ch, on, o) => bsAbRow__(ab, ch, on, o).replace(/<span class="bsi-ic">[\\s\\S]*?<\\/span><div class="bsi-tx">/, \'<span class="bsi-ic"></span><div class="bsi-tx">\');', 'bsAbRow = bsAbRow__;'],
  ['B', 'эффект без раундов', 'bsStRow__ = bsStRow; bsStRow = I => bsStRow__(Object.assign({}, I, { left: I.left == null ? null : I.left + 1 }));', 'bsStRow = bsStRow__;'],
  ['B', 'не сказано, кто наложил', 'bsStRow__ = bsStRow; bsStRow = I => bsStRow__(Object.assign({}, I, { by: null }));', 'bsStRow = bsStRow__;'],
  ['B', 'строка эффекта с классом сетки игры', 'bsStRow__ = bsStRow; bsStRow = I => bsStRow__(I).replace(\'bsi-r e \', \'bsi-r e g \');', 'bsStRow = bsStRow__;'],
  ['B', 'у врага нет раундов его типа', 'bsRoundsOf__ = bsRoundsOf; bsRoundsOf = () => null;', 'bsRoundsOf = bsRoundsOf__;'],
  ['B', 'уникальная способность — иконка библиотеки вместо своей', 'bsAbArt__ = bsAbArt; bsAbArt = (ab, px) => bsAbArt__(Object.assign({}, ab, { id: null }), px);', 'bsAbArt = bsAbArt__;'],
  ['E', 'у уникальной способности нет своей иконки', 'BS_ART.abUnique__ = BS_ART.abUnique; BS_ART.abUnique = {};', 'BS_ART.abUnique = BS_ART.abUnique__; delete BS_ART.abUnique__;'],
  ['B', 'обычная атака — вектор вместо рисованной', 'BS_ART.abIcons.basic__ = BS_ART.abIcons.basic; BS_ART.abIcons.basic = {};', 'BS_ART.abIcons.basic = BS_ART.abIcons.basic__; delete BS_ART.abIcons.basic__;'],
  ['B', 'неизученный раскрыт', 'bsInspHtml__ = bsInspHtml; bsInspHtml = (R, u) => bsInspHtml__(R, u).replace(\'Неизвестный противник\', bsEsc(u.name));', 'bsInspHtml = bsInspHtml__;'],
  ['D', 'на баннере — служебное слово', 'bsBanner__ = bsBanner; bsBanner = R => bsBanner__(R).replace(\'</b>\', \' демо</b>\');', 'bsBanner = bsBanner__;'],
  ['D2', 'итог без герба', 'BS_RES.boss__ = BS_RES.boss; BS_RES.boss = \'\';', 'BS_RES.boss = BS_RES.boss__; delete BS_RES.boss__;'],
  ['E', 'у эффекта нет значка', 'BS_DATA.st.weak__ = BS_DATA.st.weak; delete BS_DATA.st.weak;', 'BS_DATA.st.weak = BS_DATA.st.weak__; delete BS_DATA.st.weak__;'],
  ['E', 'лента — не столько кадров, сколько в данных', 'EnFx.VFX_ART.strips.boom -= 1;', 'EnFx.VFX_ART.strips.boom += 1;'],
  ['E', 'конец этажа не ждёт конца боя по ядру', 'floorDone__ = floorDone; floorDone = function (R, vis) { const b = R.b, t = b ? b.t : 0; if (b) b.t = Math.min(b.t, R.view); try { return floorDone__(R, vis); } finally { if (b) b.t = t; } };', 'floorDone = floorDone__;'],
  ['E', 'ритуал на экране не показан', 'advance__ = advance; advance = bsAdvance0;', 'advance = advance__;'],
  ['E', 'последний такт ритуала прибавляет время дважды', 'advance__ = advance; advance = function (R, ms) { const b = R.b; if (b && b.over && b.ritualMs > 0 && !(R.gap > 0) && R.view < b.t && R.view + ms >= b.t) R.view += ms; return advance__(R, ms); };', 'advance = advance__;'],
  ['E', 'добыча ритуала — без цикла и артефактов игрока', `bsRitual__ = bsRitual; bsRitual = ${(read('screens/battle-scene.js').replace(/\r\n/g, '\n').match(/function bsRitual\(R\) \{\n[\s\S]*?\n\}\n/) || [''])[0]
    .replace("typeof lootCtx === 'function' ? lootCtx() : null", 'null').replace('function bsRitual(R)', 'function (R)') || 'bsRitual'};`, 'bsRitual = bsRitual__;'],
  /* закон F — поход на новый этаж */
  ['E', 'путь удлиняет этаж', 'floorDone__ = floorDone; floorDone = function (R, vis) { const r = floorDone__(R, vis); if (R.gap > 0) R.gap += 500; return r; };', 'floorDone = floorDone__;'],
  ['E', 'новая арена раньше затемнения', 'bsTripSpans__ = bsTripSpans; bsTripSpans = T => { const s = bsTripSpans__(T); return [s[0], s[1], s[4], s[3], s[2], s[5], s[6]]; };', 'bsTripSpans = bsTripSpans__;'],
  /* правка автора: после темноты — ещё движение, отряд встал — враги выходят из-за края, затем бой */
  ['E', 'после темноты отряд стоит — движения нет', 'bsTripKf__ = bsTripKf; bsTripKf = (calm, bw) => Object.assign(bsTripKf__(calm, bw), { arrive: null });', 'bsTripKf = bsTripKf__;'],
  ['E', 'после темноты фон встаёт рывком — без торможения', 'bsTripKf__ = bsTripKf; bsTripKf = (calm, bw) => { const K = bsTripKf__(calm, bw); if (K.arrive) K.arrive = K.arrive.map(k => Object.assign({}, k, { easing: \'linear\' })); return K; };', 'bsTripKf = bsTripKf__;'],
  ['E', 'шага после темноты нет в пути', 'bsTripSpans__ = bsTripSpans; bsTripSpans = T => { const s = bsTripSpans__(T); return [s[0], s[1], s[2], s[3], [\'open\', s[4][1], s[5][2]], [\'walk\', s[5][2], s[5][2]], s[6]]; };', 'bsTripSpans = bsTripSpans__;'],
  ['E', 'шаг после темноты не помещается в переход', 'EB.RULES.floor.ritual.walkMs__ = EB.RULES.floor.ritual.walkMs; EB.RULES.floor.ritual.walkMs = EB.RULES.floor.gapMs;', 'EB.RULES.floor.ritual.walkMs = EB.RULES.floor.ritual.walkMs__; delete EB.RULES.floor.ritual.walkMs__;'],
  ['E', 'враги выходят, пока отряд ещё идёт', 'bsLead__ = bsLead; bsLead = R => bsLead__(R) + (bsLead__(R) ? EB.RULES.floor.ritual.walkMs : 0);', 'bsLead = bsLead__;'],
  ['E', 'бой начинается, пока враги ещё выходят', 'bsLead__ = bsLead; bsLead = () => 0;', 'bsLead = bsLead__;'],
  ['E', 'часы нового боя идут, пока враги выходят, — этаж короче', 'bsFoesOut__ = bsFoesOut; bsFoesOut = (R, T, hold) => { bsFoesOut__(R, T, hold); R.bsHold = 0; };', 'bsFoesOut = bsFoesOut__;'],
  ['E', 'класс выхода с карт врагов не снимается', 'bsEnterEnd__ = bsEnterEnd; bsEnterEnd = R => { if (R.enter && bsEnterAt(R) >= bsEnterMs(R)) R.enter = false; };', 'bsEnterEnd = bsEnterEnd__;'],
  ['E', 'выход врагов не кончается к первому ходу', 'bsEnterEnd__ = bsEnterEnd; bsEnterEnd = () => {};', 'bsEnterEnd = bsEnterEnd__;'],
  ['E', 'последний враг встаёт позже первого хода', 'bsFoeIn__ = bsFoeIn; bsFoeIn = (n, total) => Object.assign(bsFoeIn__(n, total), { foeMs: bsRit().enterMs });', 'bsFoeIn = bsFoeIn__;'],
  ['E', 'у боя со своей сценой враги выходят дольше паузы до первого хода', 'bsEnterMs__ = bsEnterMs; bsEnterMs = () => bsRit().enterMs;', 'bsEnterMs = bsEnterMs__;'],
  ['E', 'задняя колонка врагов выходит раньше передней', 'bsFoeOrder__ = bsFoeOrder; bsFoeOrder = ([k, r]) => k * BS_DATA.foeIn.col + r;', 'bsFoeOrder = bsFoeOrder__;'],
  ['E', 'выход врагов длиннее пути до первого хода', 'EB.RULES.floor.ritual.enterMs__ = EB.RULES.floor.ritual.enterMs; EB.RULES.floor.ritual.enterMs += EB.RULES.floor.gapMs;', 'EB.RULES.floor.ritual.enterMs = EB.RULES.floor.ritual.enterMs__; delete EB.RULES.floor.ritual.enterMs__;'],
  ['E', 'затемнения нет', 'EB.RULES.floor.ritual.darkMs__ = EB.RULES.floor.ritual.darkMs; EB.RULES.floor.ritual.darkMs = 0;', 'EB.RULES.floor.ritual.darkMs = EB.RULES.floor.ritual.darkMs__; delete EB.RULES.floor.ritual.darkMs__;'],
  ['E', 'затемнение длиннее перехода', 'EB.RULES.floor.ritual.darkMs__ = EB.RULES.floor.ritual.darkMs; EB.RULES.floor.ritual.darkMs = EB.RULES.floor.gapMs;', 'EB.RULES.floor.ritual.darkMs = EB.RULES.floor.ritual.darkMs__; delete EB.RULES.floor.ritual.darkMs__;'],
  ['E', 'арена этажа не меняется', 'bsArenaOf__ = bsArenaOf; bsArenaOf = (b, f) => bsArenaOf__(b, 1);', 'bsArenaOf = bsArenaOf__;'],
  ['E', 'в темноте — прежняя арена', 'bsTripPaint__ = bsTrip; bsTrip = function (R) { const f = R.floor; R.floor = f - 1; try { return bsTripPaint__(R); } finally { R.floor = f; } };', 'bsTrip = bsTripPaint__;'],
  ['E', 'фон стоит — отряд не идёт дальше', 'bsTripKf__ = bsTripKf; bsTripKf = (calm, bw) => Object.assign(bsTripKf__(calm, bw), { march: null });', 'bsTripKf = bsTripKf__;'],
  ['E', 'при «меньше движения» фон едет', 'bsTripKf__ = bsTripKf; bsTripKf = (calm, bw) => bsTripKf__(false, bw);', 'bsTripKf = bsTripKf__;'],
  ['E', 'плашка ожидания вернулась', `bsRitual__ = bsRitual; bsRitual = function (R) { const e = document.createElement('div'); e.className = 'bs-taken'; document.getElementById('bt').appendChild(e); return bsRitual__(R); };`, 'bsRitual = bsRitual__;'],
  ['E', 'добыча этажа не летит', 'bsLootFly__ = bsLootFly; bsLootFly = () => {};', 'bsLootFly = bsLootFly__;'],
];
let caught = 0;
for (const [k, what, brk, fix] of MUT) {
  try { vm.runInContext(brk, ctx); } catch (e) { say(`мутация «${what}»: не применилась — ${e.message}`); continue; }
  let got = [];
  try { got = lawOn(k); } catch (e) { got = ['исключение ' + e.message]; }
  try { vm.runInContext(fix, ctx); } catch (e) { say(`мутация «${what}»: не снялась — ${e.message}`); }
  if (got.length) caught++; else say(`мутация «${what}»: закон ${k} её не поймал`);
}
/* эффекты — мутации исходника fx.js и battle-scene.css */
const FXMUT = [
  ['кадр сцены двигает left', () => lawFx(fxSrc.replace("[{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.2)', opacity: .9, offset: .25 }, { transform: 'scale(3.4)', opacity: 0 }]", "[{ left: '0px', opacity: 0 }, { left: '9px', opacity: .9, offset: .25 }, { left: '20px', opacity: 0 }]"))],
  ['снаряд летит и при «меньше движения»', () => lawFx(fxSrc.replace('if (calm() || !has(k)) { later(Math.min(ms, 160), hit); return; }', 'if (!has(k)) { later(Math.min(ms, 160), hit); return; }'))],
  ['поле трясётся и при «меньше движения»', () => lawFx(fxSrc.replace('if (calm() || dead) return;', 'if (dead) return;'))],
  ['анимация CSS боя крутит фильтр', () => lawCss(sceneCss.replace('@keyframes bsCutPulse{0%,100%{transform:scale(1)}20%{transform:scale(1.08)}}', '@keyframes bsCutPulse{0%,100%{filter:none}20%{filter:brightness(1.4)}}'))],
  ['прежняя анимация удара — свойства rotate и translate', () => lawCss(sceneCss.replace(/@keyframes cshake\{(?:[^{}]*\{[^{}]*\})*\}/, ''))],
  ['надпись «Раунд N» гаснет мгновенно при «меньше движения»', () => lawCss(sceneCss.replace(',.bs-rflash,.bs-loot{animation-duration:var(--bs-d,1s)!important}', ',.bs-loot{animation-duration:var(--bs-d,1s)!important}'))],
  ['отряд шагает в походе и при «меньше движения»', () => lawCss(sceneCss.replace('  .bt.bs-march .bt-side.h .bc:not(.dead){animation:none}', ''))],
  ['отряд не шагает в походе', () => lawCss(sceneCss.replace('.bt.bs-march .bt-side.h .bc:not(.dead){animation:walk .42s ease-in-out infinite alternate}', ''))],
  ['завеса затемнения — над шапкой', () => lawCss(sceneCss.replace(/(\.bs-veil\{[^}]*z-index:)3/, '$16'))],
  ['враги прячутся при выходе при «меньше движения»', () => lawCss(sceneCss.replace('.bt-side.f.enter .bc{animation-name:bsFoeShow;', '.bt-side.f.enter .bc{animation-name:bsFade;'))],
  ['при «меньше движения» враги идут из-за края', () => lawCss(sceneCss.replace(/  \.bt-side\.f\.enter \.bc\{animation-name:bsFoeShow;[^}]*\}/, ''))],
  ['при «меньше движения» враги встают разом — длительность выхода не возвращена', () => lawCss(sceneCss.replace('animation-name:bsFoeShow;animation-duration:var(--bs-foe)!important', 'animation-name:bsFoeShow'))],
  ['враги проявляются на месте, а не выходят из-за края', () => lawCss(sceneCss.replace(/@keyframes foeIn\{(?:[^{}]*\{[^{}]*\})*\}/, '@keyframes foeIn{0%{transform:translateY(14px) scale(.92);opacity:0}60%{opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}'))],
  ['враги выходят не из-за края поля — без своей колонки и ширины', () => lawCss(sceneCss.replace(/--bs-x:calc\(var\(--k\) \* var\(--colw\) \+ 100% \+ \d+px\)/, '--bs-x:120px'))],
  ['шаг между картами врагов — числом в стиле, а не из данных', () => lawCss(sceneCss.replace('* var(--bs-step) - var(--bs-at,0ms))', '* 90ms)'))],
  ['закрытое окно карты остаётся на экране', () => lawCss(sceneCss.replace('.bt-insp.bs-insp[hidden]{display:none}', ''))],
];
for (const [what, f] of FXMUT) {
  let got = [];
  try { got = f(); } catch (e) { got = ['исключение ' + e.message]; }
  if (got.length) caught++; else say(`мутация «${what}»: закон C её не поймал`);
}
/* мутации сняты — законы снова чисты */
for (const k of ['A', 'B', 'D', 'C']) for (const e of lawOn(k)) say(`закон ${k} после мутаций: ${e}`);
done(`Мутаций ${MUT.length + FXMUT.length}, поймано ${caught}.`);
