/* Автопроверка экрана «Неделя → Эхо» прототипа «Свет снизу» (design/ui/screens/echo.js) — без браузера.
   1. model.js и echo.js компилируются; index.html подключает их после основного скрипта и подключает echo.css;
      данные экрана полны: у каждой из девяти недель — цивилизация и 14 врагов со стихией и классом.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
      Соседние экраны (craft.js, bag.js) пишут параллельно: их ошибки — предупреждения; ошибки остальных скриптов — провал.
   3. Девять недель × шесть циклов: экран, листы недели, бестиария и сведений о каждом враге; призыв за одну душу с выбором
      из вариантов и повтором без второго расхода; атаки до победы на каждой из 14 ступеней — каждая атака бой ядром (ADR-0025):
      цена один раз, повтор того же номера атаки ничего не списывает, здоровье цели — из итога боя, «Пропустить» открывает итог;
      после первой атаки цели оставляем 1 здоровья — шкала Эхо растёт ×3 за цикл, а отряд прототипа нет; победа — очки, бестиарий,
      рост лестницы до Убер-босса; Многоликий выпадает при призыве с шансом manySummonBp, победа над ним даёт ресурс «Многоликий» своей недели;
      цель с вышедшим сроком уходит; планки недели → сундуки осколков в запасах, один раз.
   4. Активации из запасов на каждой неделе и цикле: все крафтовые боссы (ACTIVATE.call), биом Многоликого (ACTIVATE.echo) —
      в слот биомов без душ, забег по 14 ступеням с одной попыткой и очками за взятые этажи, все руины (ACTIVATE.act).
      Лист подтверждения не называет будущего врага и руину; недоступная активация ничего не списывает;
      повтор подтверждения не списывает второй раз; победа над крафтовым боссом — трофей, ключи, валюта, сундук или осколки;
      руина видна в «Спуске»; слоты биомов общие с забегами — сверх них не встать ни руине, ни забегу.
   Везде: без исключений, без undefined, NaN и [object; до первой победы имя врага не видно; тема недели «для команды» не видна.
   Запуск: node tools/content-gen/screens/check_echo.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const html = fs.readFileSync(path.join(UI, 'index.html'), 'utf8');
const err = [], warn = [];
const NEIGHBOURS = ['screens/craft.js', 'screens/bag.js'];   // пишутся параллельно — их сбой не валит проверку Эхо

/* 1. файлы и порядок подключения */
for (const f of ['screens/model.js', 'screens/echo.js']) {
  try { new vm.Script(fs.readFileSync(path.join(UI, f), 'utf8'), { filename: f }); } catch (e) { err.push(`${f}: синтаксис — ${e.message}`); }
}
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const order = scripts.map(s => s.src || 'inline'), iMain = order.lastIndexOf('inline'), iModel = order.indexOf('screens/model.js'), iEcho = order.indexOf('screens/echo.js');
if (iModel < 0 || iEcho < 0) err.push('index.html: не подключены screens/model.js или screens/echo.js');
else if (!(iMain < iModel && iModel < iEcho)) err.push('index.html: нужен порядок «основной скрипт → model.js → echo.js»');
if (!html.includes('href="screens/echo.css"')) err.push('index.html: не подключён screens/echo.css');
for (const s of scripts) if (!s.src) { try { new vm.Script(s.code, { filename: 'index.html' }); } catch (e) { err.push('синтаксис встроенного скрипта: ' + e.message); } }
if (err.length) done();

/* 2. песочница: у элемента querySelector отдаёт заглушку — экран боя рисует карты по ней */
const stubEl = id => {
  const e = { id, innerHTML: '', textContent: '', value: '', style: { setProperty() {} }, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x,
    insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, remove() {}, animate: () => ({}), clientWidth: 1200, clientHeight: 800 };
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
  try { vm.runInContext(s.src ? fs.readFileSync(path.join(UI, s.src), 'utf8') : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { (NEIGHBOURS.includes(s.src) ? warn : err).push(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();

/* 3–4. сценарии — выполняются внутри песочницы */
function suite() {
  const out = { errors: [], screens: 0, sheets: 0, kills: 0, offers: 0, calls: 0, many: 0, ruins: 0, chests: 0 };
  const E = window.EN_ECHO, D = E.data, TOP = E.steps.length, XE = RX.drops.echo, FROM = LBX.modes.echo.from;
  const fail = m => { if (out.errors.length < 80) out.errors.push(m); };
  const draw = () => { render(); return document.getElementById('game').innerHTML; };
  const TEAM = RS.weeks.map(w => w.team && w.team.theme).filter(Boolean).concat(['Иридиум']);
  const scan = (key, h) => {
    if (/undefined|NaN|\[object /.test(h)) fail(key + ': в разметке undefined, NaN или [object');
    const leak = TEAM.filter(t => h.includes(t)); if (leak.length) fail(key + ': видно поле «для команды» — ' + leak.join(', '));
    if (/(^|[^а-яё])мать([^а-яё]|$)/i.test(h)) fail(key + ': в тексте игрока — «мать»');
  };
  const ipow = (b, e) => { let r = 1; for (let i = 0; i < e; i++) r *= b; return r; };
  const RULED = !!window.EN_ECHO_RULES;   // данные режима подключены: очки и цены — их, иначе прежняя сетка §17.5
  const pts = (st, c) => RULED ? E.pts(st > TOP ? TOP + 1 : st, c) : c < FROM ? 0 : (st > TOP ? D.manyPoints : D.points[st - 1]) * ipow(XE.pointsCycleMul, c - FROM);
  /* отряд прототипа — на уровне верхней ступени цикла: проверяем механику боя Эхо, а не баланс; числа проверки — не баланс */
  const reset = (race, c) => { S = initialState(); rsSetWeek(race); S.acc.cycle = c; S.route = 'echo'; S.overlay = null; S.wallet.souls = 1e9; E.sync(); S.heroes.forEach(h => { h.lvl = Math.max(h.lvl, E.lvl(TOP, c)); }); };
  const clearEcho = () => { S.overlay = null; S.echo.slots = S.echo.slots.map(() => null); S.ech.pending = {}; S.echo.sel = 0; S.route = 'echo'; S.runs = []; };
  /* бьём цель в слоте i до победы. Атака — бой ядром (ADR-0025): цена один раз, повтор того же номера ничего не меняет,
     здоровье цели — из итога боя, «Пропустить» открывает итог. После первой атаки цели оставляем 1 здоровья — проверяем победу */
  const kill = (key, i) => {
    const x = S.echo.slots[i]; S.echo.sel = i; S.route = 'echo'; let n = 0;
    while (S.echo.slots[i] === x && n < 60) {
      const s0 = S.wallet.souls, hp0 = x.hp, cost = E.cost(x), no = x.atk + 1;
      if (!RULED && cost !== XE.oldAttackSouls[D.atk[x.g]]) fail(`${key}: цена атаки ${cost} — не прежняя сетка §17.5`);
      ACT.echatk(x.uid + ':' + no); n++;
      if (S.wallet.souls !== s0 - cost) { fail(`${key}: атака стоила ${s0 - S.wallet.souls}, а не ${cost}`); break; }
      const R = S.runs.find(r => r.kind === 'echo' && !r.over);
      if (!R || S.route !== 'battle' || !R.res) { fail(key + ': атака не открыла бой'); break; }
      const res = R.res.res;
      if (res.main.hp0 !== hp0 || (S.echo.slots[i] === x ? x.hp !== res.main.hp : !res.killed)) fail(`${key}: здоровье цели не из итога боя`);
      scan(key + ' · бой', draw());
      const s1 = S.wallet.souls, sc1 = S.echo.score, a1 = x.atk; ACT.echatk(x.uid + ':' + no);
      if (S.wallet.souls !== s1 || S.echo.score !== sc1 || x.atk !== a1 || S.runs.filter(r => r.kind === 'echo').length !== 1) fail(key + ': повтор атаки списал или начислил второй раз');
      ACT.echskip(R.id);
      if (!S.overlay || S.overlay.t !== 'echres' || S.route !== 'echo' || !R.over) { fail(key + ': «Пропустить» не открыло итог'); break; }
      scan(key + ' · итог атаки ' + n, draw());
      if (S.echo.slots[i] === x) { S.overlay = null; if (x.hp > 1) x.hp = 1; }
    }
    if (S.echo.slots[i] === x) { fail(key + ': цель не пала за ' + n + ' атак'); return false; }
    out.kills++;
    if (!S.overlay || S.overlay.t !== 'echres') fail(key + ': нет итога победы');
    return true;
  };

  /* данные экрана */
  const EL = ['Воздух', 'Земля', 'Огонь', 'Вода', 'Время'], CLS = ['Танк', 'Физ. ДД силы', 'Физ. ДД ловкости', 'Маг. ДД', 'Лекарь', 'Дебаффер'], names = new Set();
  if (TOP !== 14) fail('ступеней лестницы ' + TOP + ', а не 14');
  for (const k of ['points', 'hp', 'bm']) if (D[k].length !== TOP) fail(`данные: ${k} — ${D[k].length} чисел на ${TOP} ступеней`);
  if (D.pickW.length !== TOP) fail(`данные: pickW — ${D.pickW.length} чисел на ${TOP} ступеней`);
  for (const w of RS.weeks) {
    const c = D.civ[w.race];
    if (!c) { fail('нет цивилизации недели ' + w.race); continue; }
    if (!c.look || !c.raid) fail(w.race + ': нет облика или нашествия');
    if (c.foes.length !== TOP) fail(`${w.race}: врагов ${c.foes.length}`);
    c.foes.forEach((f, i) => {
      if (!f[0] || !f[3]) fail(`${w.race}, ступень ${i + 1}: нет имени или облика`);
      if (!EL.includes(f[1])) fail(`${w.race} · ${f[0]}: стихия «${f[1]}»`);
      if (!CLS.includes(f[2])) fail(`${w.race} · ${f[0]}: класс «${f[2]}»`);
      if (names.has(f[0])) fail('имя врага повторяется: ' + f[0]); names.add(f[0]);
    });
  }

  /* стартовое состояние, соседние экраны, сценарий «Неделя → Эхо» */
  S = initialState(); S.route = 'echo';
  let h = draw(); scan('старт', h); out.screens++;
  if (S.echo.slots.filter(Boolean).length !== D.demo.slots.filter(Boolean).length || S.ech.avail !== D.demo.avail) fail('старт: не демо-состояние недели');
  for (const r of ['week', 'shelter', 'descent']) { S.route = r; scan('экран ' + r, draw()); }
  const flow = FLOWS.find(f => f[0] === 'Неделя → Эхо'); if (flow) { flow[2](); scan('сценарий «Неделя → Эхо»', draw()); } else fail('нет сценария «Неделя → Эхо»');
  S.route = 'echo'; S.echoSquad = S.squads.find(s => s.m.filter(Boolean).length < D.squad).id; ACT.echatk();
  if (!S.overlay || S.overlay.title !== 'Отряд не готов') fail('неполный отряд атакует'); scan('отряд не готов', draw());

  for (const w of RS.weeks) for (let c = 1; c <= 6; c++) {
    const key = `${w.race} · цикл ${ROMAN[c]}`;
    try {
      reset(w.race, c);
      if (S.ech.wk !== w.race) fail(key + ': неделя не сменилась');
      h = draw(); out.screens++; scan(key + ' · экран', h);
      if (!h.includes(w.civ)) fail(key + ': на экране нет цивилизации ' + w.civ);
      if (c < FROM && !h.includes('обучение')) fail(key + ': цикл обучения не отмечен');
      for (let st = 1; st <= TOP; st++) { const f = E.stepFoe(E.fidOf(w.race, st)); if (!S.ech.known[f.fid] && h.includes(f.n)) fail(`${key}: имя «${f.n}» видно до первой победы`); }
      for (const t of ['echweek', 'echbest']) { S.overlay = { t }; h = draw(); out.sheets++; scan(`${key} · лист ${t}`, h); }
      S.overlay = { t: 'echweek' }; h = draw();
      for (const id of w.squad) { const hr = RSI[id]; if (!h.includes(hr.n)) fail(`${key}: в отряде недели нет ${hr.n}`); }
      if (c >= FROM && !h.includes('Личная планка')) fail(key + ': нет планок недели');
      for (let st = 1; st <= TOP + 1; st++) {
        const fid = st > TOP ? 'many' : E.fidOf(w.race, st), f = E.foe(fid);
        S.overlay = { t: 'echfoe', arg: fid }; h = draw(); out.sheets++; scan(`${key} · сведения ${st}`, h);
        if (st <= TOP && !S.ech.known[fid] && h.includes(f.n)) fail(`${key}: лист сведений называет неизученного «${f.n}»`);
      }

      /* призыв за одну душу, варианты, повтор без второго расхода, выбор */
      clearEcho(); S.ech.avail = 1 + (c * 2) % TOP;
      const souls0 = S.wallet.souls;
      ACT.echsel('2'); scan(key + ' · пустой слот', draw());
      ACT.echsum('2'); const p = S.ech.pending[2];
      if (!p || !p.offers.length) { fail(key + ': призыв не дал вариантов'); continue; }
      ACT.echsum('2');
      if (S.wallet.souls !== souls0 - XE.summonSouls) fail(`${key}: призыв с повтором стоил ${souls0 - S.wallet.souls}`);
      if (p.offers.length !== Math.min(D.offer.wide, S.ech.avail) || new Set(p.offers).size !== p.offers.length || p.offers.some(st => st < 1 || st > S.ech.avail && st !== TOP + 1)) fail(`${key}: варианты ${p.offers.join(', ')} при открытых 1–${S.ech.avail}`);
      out.offers += p.offers.length;
      h = draw(); scan(key + ' · выбор цели', h);
      ACT.echpick('2:' + p.offers[p.offers.length - 1]);
      const x = S.echo.slots[2];
      if (!x || x.step !== p.offers[p.offers.length - 1] || S.ech.pending[2]) fail(key + ': выбор не занял слот');
      else if (x.left !== D.lifeH[x.g] * D.hour || x.hp !== x.max) fail(key + ': у новой цели не тот срок или здоровье');
      scan(key + ' · цель', draw());
      S.ech.wide = false; clearEcho(); ACT.echsum('0'); if (!S.ech.pending[0] || S.ech.pending[0].offers.length !== D.offer.base) fail(key + ': без артефакта вариантов не ' + D.offer.base); S.ech.wide = true;

      /* каждая ступень до победы: очки, бестиарий, рост лестницы до Убер-босса; Многоликий — не ступень лестницы, выпадает при призыве,
         победа над Многоликим (лёгкий бой один на один) даёт ресурс «Многоликий» (ADR-0025) */
      for (let st = 1; st <= TOP + 1; st++) {
        clearEcho(); S.ech.avail = Math.min(st, TOP);
        const t = E.target('step', st), score0 = S.echo.score, many0 = BAG.qty(XE.uber.item);
        if (st > TOP && (t.kind !== 'many' || t.fid !== 'many')) { fail(`${key}: пятнадцатая ступень — не Многоликий`); continue; }
        S.echo.slots[0] = t; scan(`${key} · ступень ${st}`, draw());
        if (!kill(`${key} · ступень ${st}`, 0)) continue;
        if (!S.ech.known[t.fid]) fail(`${key}: ступень ${st} не открыла запись бестиария`);
        if (S.echo.score - score0 !== pts(st, c)) fail(`${key}: ступень ${st} дала ${S.echo.score - score0} очков вместо ${pts(st, c)}`);
        if (S.ech.avail !== Math.min(st + 1, TOP)) fail(`${key}: после ступени ${st} открыто ${S.ech.avail}`);
        if ((BAG.qty(XE.uber.item) - many0) !== (st > TOP ? XE.uber.count : 0)) fail(`${key}: ступень ${st} — Многоликий ${BAG.qty(XE.uber.item) - many0}`);
        if (st > TOP && (S.ech.manyWk[w.race] || 0) < XE.uber.count) fail(`${key}: Многоликий не привязан к своей неделе`);
        h = draw(); scan(`${key} · победа ${st}`, h);
        if (!h.includes(E.foe(t.fid, t).n)) fail(`${key}: итог победы не назвал врага ступени ${st}`);
      }
      S.overlay = { t: 'echbest' }; scan(key + ' · бестиарий после побед', draw());

      /* срок цели вышел — цель уходит без очков */
      clearEcho(); const e = E.target('step', 1); e.left = 0; S.echo.slots[1] = e; S.echo.sel = 1; const sc = S.echo.score;
      scan(key + ' · срок вышел', draw());
      if (S.echo.slots[1] || S.echo.score !== sc || !S.ech.note) fail(key + ': цель с вышедшим сроком не ушла');

      /* планки недели: сундуки забирают только в «Дарах» (§17.6, §23.1) — кнопка планки открывает Дары и ничего не выдаёт */
      const pk = E.planks();
      if (c < FROM) { if (pk.length) fail(key + ': планки в цикле обучения'); }
      else {
        S.echo.score = pk[pk.length - 1].need; const ch0 = S.bag.chests.length;
        pk.forEach(r => ACT.echplank(String(r.k)));
        if (S.bag.chests.length !== ch0) fail(`${key}: планка выдала сундук мимо «Даров»`);
        if (!S.overlay || S.overlay.t !== 'gifts') fail(`${key}: планка не открыла «Дары»`);
        S.overlay = { t: 'echweek' }; scan(key + ' · планки забраны', draw());
      }

      /* крафтовые боссы из запасов */
      for (const fb of RX.drops.craftBosses) {
        clearEcho();
        const it = BAG.item(fb.call); BAG.add(it.id, 1);
        const q0 = BAG.qty(it.id), s0 = S.wallet.souls, k2 = `${key} · ${it.id}`;
        ACTIVATE.call(it.id);
        if (!S.overlay || S.overlay.t !== 'echact') { fail(k2 + ': нет листа подтверждения'); continue; }
        h = draw(); out.sheets++; scan(k2 + ' · подтверждение', h);
        if (h.includes(fb.name) || (it.opens && h.includes(it.opens))) fail(k2 + ': лист подтверждения раскрывает врага');
        if (it.team && c < 6 && h.includes(it.n)) fail(k2 + ': предмет «для команды» назван до цикла VI');
        const op = S.overlay.op;
        ACT.echactdo(op);
        if (it.cyc > c) { if (BAG.qty(it.id) !== q0 || S.wallet.souls !== s0 || S.echo.slots.some(Boolean)) fail(k2 + ': недоступная активация списала'); continue; }
        ACT.echactdo(op);
        if (BAG.qty(it.id) !== q0 - 1 || S.wallet.souls !== s0 - XE.summonSouls) fail(`${k2}: списано ${q0 - BAG.qty(it.id)} предметов и ${s0 - S.wallet.souls} душ`);
        const i = S.echo.slots.findIndex(Boolean), x = S.echo.slots[i];
        if (!x || x.fid !== fb.id || x.kind !== 'craft') { fail(k2 + ': босс не встал в слот'); continue; }
        if (!S.overlay || S.overlay.t !== 'echgot') fail(k2 + ': нет листа «призван»');
        h = draw(); scan(k2 + ' · призван', h);
        if (!S.ech.known[fb.id] && h.includes(fb.name)) fail(k2 + ': имя босса видно до первой победы');
        S.overlay = null; h = draw(); scan(k2 + ' · в слоте', h); out.calls++;
        const ch0 = S.bag.chests.length, tr0 = fb.trophy ? BAG.qty(fb.trophy) : 0, gold0 = S.wallet.gold, sh0 = JSON.stringify(S.rs.shards), dust0 = S.wallet.dust;
        if (!kill(k2, i)) continue;
        if (fb.trophy && BAG.qty(fb.trophy) !== tr0 + fb.trophies) fail(k2 + ': нет трофея');
        if (fb.gold && S.wallet.gold !== gold0 + fb.gold) fail(k2 + ': золото не зачислено');
        if (fb.workerBoxRarity) {
          const ch = S.bag.chests[S.bag.chests.length - 1];
          if (S.bag.chests.length !== ch0 + 1 || ch.box !== 'craft' || ch.r !== fb.workerBoxRarity) fail(k2 + ': нет сундука крафтового босса');
          else { try { EnLoot.resolve(LBX, ch); } catch (x2) { fail(k2 + ': сундук не открывается — ' + x2.message); } out.chests++; }
        }
        if (fb.heroShardsWeekBp || fb.heroShardsWeek) {   // Лик недели: осколки одного героя недели — ровно likShards цикла (или прах за них)
          const want = E.likShards(c, fb), got = S.ech.last && S.ech.last.loot.find(l => l.k === 'shards');
          const open = (RS.weeks.find(v => v.race === x.race) || w).squad.map(id => RSI[id]).filter(h => h && h.c <= c);
          if (!want) fail(k2 + ': Лик недели платит 0 осколков');
          else if (open.length && (!got || got.n !== want)) fail(`${k2}: Лик недели дал ${got ? got.n : 0} осколков, а по правилам — ${want}`);
          else if (open.length && sh0 === JSON.stringify(S.rs.shards) && S.wallet.dust === dust0) fail(k2 + ': осколки Лика не легли в коллекцию и не ушли в прах');
        }
        h = draw(); scan(k2 + ' · победа', h);
        if (!h.includes(fb.name)) fail(k2 + ': итог победы не назвал босса');
      }

      /* Многоликий из запасов — биом Многоликого своей недели в слот биомов (ADR-0025): души не тратятся, попытка одна,
         очки Эхо — за каждый взятый этаж; этажи — ступени 1–14 */
      clearEcho(); S.ech.biomes = []; S.ech.cb = null; BAG.add('many', 1);
      const qm = BAG.qty('many'), sm = S.wallet.souls, it = BAG.item('many');
      ACTIVATE.echo('many'); h = draw(); scan(key + ' · Многоликий · подтверждение', h);
      ACT.echactdo(S.overlay.op);
      const mb = S.ech.biomes.find(b => b.many);
      if (it.cyc > c) { if (BAG.qty('many') !== qm || S.wallet.souls !== sm || mb) fail(key + ': недоступный Многоликий списан'); }
      else if (!mb || mb.race !== w.race || BAG.qty('many') !== qm - 1 || S.wallet.souls !== sm || S.echo.slots.some(Boolean)) fail(key + ': биом Многоликого не встал в слот биомов или списал души');
      else {
        h = draw(); scan(key + ' · биом Многоликого открыт', h);
        ACT.echgo('descent:' + mb.uid); h = draw(); scan(key + ' · биом Многоликого в «Спуске»', h);
        if (!h.includes('Биом Многоликого') || !h.includes(`data-a="echmany" data-v="${mb.uid}"`)) fail(key + ': биома Многоликого нет в «Спуске»');
        const sc2 = S.echo.score, known0 = Object.keys(S.ech.known).length;
        ACT.echmany(mb.uid);
        const R = S.runs.find(r => r.kind === 'many');
        if (!R || S.ech.biomes.includes(mb) || S.route !== 'battle') fail(key + ': забег по биому Многоликого не начался');
        else {
          scan(key + ' · биом Многоликого · бой', draw());
          if (E.bio().used !== 1) fail(`${key}: забег по биому Многоликого держит ${E.bio().used} слотов биомов`);
          S.route = 'descent';
          for (let n = 0; !R.over && n < 40000; n++) advance(R, 500);
          if (!R.over || !R.end) fail(key + ': забег по биому Многоликого не кончился');
          else {
            const want = R.taken.reduce((a, x) => a + x.pts, 0);
            if (S.echo.score - sc2 !== want || R.pts !== want) fail(`${key}: биом Многоликого дал ${S.echo.score - sc2} очков, а за этажи — ${want}`);
            if (R.taken.some((x, j) => x.step !== j + 1 || x.pts !== E.floorPts(x.step, c))) fail(key + ': очки этажей биома Многоликого не из правил');
            if (R.end.kind === 'clear' ? R.taken.length !== TOP : R.taken.length !== R.end.floor - 1) fail(`${key}: этажей взято ${R.taken.length}, итог «${R.end.kind}» на ${R.end.floor}`);
            if (Object.keys(S.ech.known).length < known0 + R.newKnown.length) fail(key + ': взятые этажи не открыли записи бестиария');
            if (E.bio().used !== 0) fail(key + ': после забега биом Многоликого держит слот');
            ACT.focus(R.id);
            if (!S.overlay || S.overlay.t !== 'echmanyres') fail(key + ': нет итога биома Многоликого'); else scan(key + ' · итог биома Многоликого', draw());
            out.many++;
          }
        }
        S.runs = []; S.overlay = null;
      }

      /* руины из запасов: «Спуск», общие слоты биомов */
      for (const cb of RX.drops.craftBiomes) {
        clearEcho(); S.ech.biomes = []; S.ech.cb = null; S.runs = [];
        const ai = BAG.item(cb.act), k2 = `${key} · ${cb.id}`; BAG.add(ai.id, 1); const q0 = BAG.qty(ai.id);
        ACTIVATE.act(ai.id); h = draw(); out.sheets++; scan(k2 + ' · подтверждение', h);
        if (h.includes(cb.name)) fail(k2 + ': лист подтверждения раскрывает руину');
        ACT.echactdo(S.overlay.op);
        if (ai.cyc > c) { if (BAG.qty(ai.id) !== q0 || S.ech.biomes.length) fail(k2 + ': недоступная руина списана'); continue; }
        if (S.ech.biomes.length !== 1 || BAG.qty(ai.id) !== q0 - 1) { fail(k2 + ': руина не встала в слот биомов'); continue; }
        h = draw(); scan(k2 + ' · руина открыта', h);
        if (!h.includes(cb.name)) fail(k2 + ': после активации руина не названа');
        ACT.echgo('descent:' + S.ech.biomes[0].uid); h = draw(); scan(k2 + ' · Спуск', h);
        if (!h.includes(cb.name) || !h.includes('Забег — позже') || !h.includes('Слоты биомов')) fail(k2 + ': руины нет в «Спуске»');
        out.ruins++;
        const cap = RX.drops.activeSlots.byCycle[c - 1];
        if (E.bio().cap !== cap) fail(`${k2}: слотов биомов ${E.bio().cap}, а в данных цикла — ${cap}`);
        for (let n = 0; E.bio().used < cap && n <= cap; n++) { BAG.add(ai.id, 1); ACTIVATE.act(ai.id); ACT.echactdo(S.overlay.op); S.overlay = null; }
        if (S.ech.biomes.length !== cap) fail(`${k2}: встало руин ${S.ech.biomes.length} при ${cap} слотах`);
        BAG.add(ai.id, 1); const q1 = BAG.qty(ai.id); ACTIVATE.act(ai.id); scan(k2 + ' · слоты заняты', draw()); ACT.echactdo(S.overlay.op);
        if (BAG.qty(ai.id) !== q1 || S.ech.biomes.length !== cap) fail(k2 + ': руина встала сверх слотов биомов');
        S.overlay = null; const r0 = S.runs.length;
        try { startRun(S.prepSquad, 'b1'); } catch (x2) { fail(k2 + ': забег сверх слотов — ' + x2.message); }
        if (S.runs.length !== r0) fail(k2 + ': забег встал сверх слотов биомов');
        S.ech.biomes.slice().forEach(b => ACT.echcbxdo(b.uid));
        if (E.bio().used !== 0 || S.ech.cb) fail(k2 + ': покинутые руины держат слот');
        S.route = 'descent'; scan(k2 + ' · Спуск без руин', draw()); ACT.biome('b1');
        S.runs = [{ id: 'r-check', runNo: 1, biome: 'b1', squad: [], floor: 1, over: false, seen: false }];
        if (cap === 1) { BAG.add(ai.id, 1); const q2 = BAG.qty(ai.id); ACTIVATE.act(ai.id); ACT.echactdo(S.overlay.op); if (BAG.qty(ai.id) !== q2 || S.ech.biomes.length) fail(k2 + ': руина встала поверх забега в единственный слот'); }
        S.runs = []; S.overlay = null;
      }
    } catch (x) { fail(key + ': исключение — ' + (x && x.stack ? x.stack.split('\n').slice(0, 3).join(' | ') : x)); }
  }
  return out;
}
const t0 = Date.now();
let res;
try { res = vm.runInContext('(' + suite.toString() + ')()', ctx); } catch (e) { err.push('сценарии: ' + (e.stack || e.message)); done(); }
err.push(...res.errors);
console.log(`Эхо проверено за ${Math.round((Date.now() - t0) / 1000)} с: экранов ${res.screens}, листов ${res.sheets}, вариантов призыва ${res.offers}, побед ${res.kills}, крафтовых боссов ${res.calls}, Многоликих ${res.many}, руин ${res.ruins}, сундуков ${res.chests}.`);
done();

function done() {
  if (warn.length) console.log('Предупреждения (соседние экраны):\n' + warn.join('\n'));
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log('Проверка пройдена: девять недель, шесть циклов, призыв, атака, победа и три активации — без исключений, undefined и NaN.');
  process.exit(0);
}
