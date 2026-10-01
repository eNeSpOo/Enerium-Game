/* Автопроверка экрана «Неделя → Эхо» прототипа «Свет снизу» (design/ui/screens/echo.js) — без браузера.
   1. model.js и echo.js компилируются; index.html подключает их после основного скрипта и подключает echo.css;
      данные экрана полны: у каждой из девяти недель — цивилизация и 14 врагов со стихией и классом.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
      Соседние экраны (craft.js, bag.js) пишут параллельно: их ошибки — предупреждения; ошибки остальных скриптов — провал.
   3. Девять недель × шесть циклов: экран, листы недели, бестиария и сведений о каждом враге; призыв за одну душу с выбором
      из вариантов и повтором без второго расхода; у каждого варианта крупно цена одной атаки из правил Эхо — раньше мощи, чисел
      на варианте два; та же цена — в слоте и в «Сведениях» цели; атаки до победы на каждой из 14 ступеней — каждая атака бой ядром (ADR-0025):
      цена один раз, повтор того же номера атаки ничего не списывает, здоровье цели — из итога боя, «Пропустить» открывает итог;
      после первой атаки цели оставляем 1 здоровья — шкала Эхо растёт ×3 за цикл, а отряд прототипа нет; победа — очки, бестиарий,
      рост лестницы до Убер-босса; Многоликий выпадает при призыве с шансом manySummonBp, победа над ним даёт ресурс «Многоликий» своей недели;
      цель с вышедшим сроком уходит; планки недели → сундуки осколков в запасах, один раз.
   4. Активации из запасов на каждой неделе и цикле: все призванные враги (ACTIVATE.call; тип по силе — ADR-0039), биом Многоликого (ACTIVATE.echo) —
      в слот биомов без душ, забег по 14 ступеням с одной попыткой и очками за взятые этажи, все руины (ACTIVATE.act).
      Лист подтверждения не называет будущего врага и руину; недоступная активация ничего не списывает;
      повтор подтверждения не списывает второй раз; победа над призванным врагом — трофей, ключи, валюта и сундук по модели
      призванных врагов (EN_LOOTBOXES.summon): вид, редкость, окно, цикл пула, неделя у Лика недели, сид от боя; повтор атаки второго
      сундука не даёт; итог боя показывает сундук с «Шансы» и «Открыть», «Открыть» — в запасах окном сундука, повтор не выдаёт;
      «Сведения» о предмете призыва, лист «Состав и шансы» и бестиарий показывают сундук за победу, имени врага до призыва нет;
      победа над КрафБоссом приносит очки рейтинга по общей лестнице — правило summon.types[g].points цикла силы врага (ADR-0043), одни
      и те же в любом цикле игрока, в обучении — без очков;
      руина видна в «Спуске»; слоты биомов общие с забегами — сверх них не встать ни руине, ни забегу.
   Везде: без исключений, без undefined, NaN и [object; до первой победы имя врага не видно — и в просмотре боя, который её принёс;
   тема недели «для команды» не видна. На карточке цели отряд атаки на виду: мощь, «Сменить», неполный отряд помечен на месте.
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
  const out = { errors: [], screens: 0, sheets: 0, kills: 0, offers: 0, calls: 0, many: 0, ruins: 0, chests: 0, ests: 0, craftPts: {} };
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
      const res = R.res.res, fx = E.foe(x.fid, x), hb = draw();
      if (res.main.hp0 !== hp0 || (S.echo.slots[i] === x ? x.hp !== res.main.hp : !res.killed)) fail(`${key}: здоровье цели не из итога боя`);
      scan(key + ' · бой', hb);
      if (R.res.first && !fx.named && hb.includes(fx.n)) fail(key + ': просмотр первой победы называет врага до итога');
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
  /* отряд атаки на виду (§17.2, слово автора): на карточке цели — «Сменить» и мощь отряда; неполный отряд помечен на месте */
  S.route = 'echo'; S.overlay = null; S.echo.sel = S.echo.slots.findIndex(Boolean); h = draw();
  if (!h.includes('class="ech-vs"') || !h.includes('data-a="sheet" data-v="prep:echo"') || !h.includes(`<b class="num">${fmt(sqBM(sq(S.echoSquad)))}</b>`)) fail('цель: не видно отряда атаки, его мощи или «Сменить»');
  const part = S.squads.find(s => s.m.filter(Boolean).length < D.squad); S.echoSquad = part.id; h = draw();
  if (!h.includes(`${part.m.filter(Boolean).length} из ${D.squad}</span>`) || !h.includes('ech-sf empty')) fail('цель: неполный отряд не помечен на месте');
  ACT.echatk();
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
      if (c >= FROM && !h.includes('class="ech-plank')) fail(key + ': нет планок недели');
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
      /* цена одной атаки — главное число выбора цели (слово автора): крупно у каждого варианта и раньше мощи; число — правила Эхо,
         раунды × цена раунда цикла (echo-rules.js, ADR-0025), без них — прежняя сетка §17.5. Чисел на варианте два: цена и мощь */
      for (const st of p.offers) {
        const g = st > TOP ? 'm' : E.stepFoe(E.fidOf(w.race, st)).g, cost = E.cost({ step: st, g, cyc: c });
        const row = h.split('class="ech-offer"').find(y => y.includes(`data-v="2:${st}"`)) || '', R = window.EN_ECHO_RULES;
        const rule = RULED && R.cycles[String(c)] ? R.cycles[String(c)].find(r => r.step === st) : null;
        if (!Number.isInteger(cost) || cost < 1) fail(`${key}: цена атаки ступени ${st} — ${cost}`);
        else if (rule && rule.souls !== cost) fail(`${key}: цена атаки ступени ${st} — ${cost}, а в правилах Эхо — ${rule.souls}`);
        const ci = row.indexOf('class="ech-cost"'), pi = row.indexOf('Боевая мощь цели');
        if (ci < 0 || !row.includes(`<b class="num">${fmt(cost)}</b><small>за атаку</small>`)) fail(`${key}: у варианта ${st} не видно цены одной атаки ${cost}`);
        else if (pi >= 0 && pi < ci) fail(`${key}: у варианта ${st} мощь стоит раньше цены атаки`);
        if ((row.match(/class="ech-n"/g) || []).length > 1) fail(`${key}: у варианта ${st} больше двух чисел`);
      }
      /* босс и Убер живут час: «Выбрать» сперва открывает лист с честной оценкой (ADR-0031, п. 8); оценка — целые, кошелёк и цель
         не меняются, исход словами не раскрыт; оценка на цели призыва и на цели в слоте — одна: номер цели и сид первой атаки те же */
      const pickEst = (k, st) => {
        const g = st > TOP ? 'm' : E.stepFoe(E.fidOf(w.race, st)).g;
        if (!E.short({ g })) { ACT.echpick('2:' + st); return null; }
        const w0 = S.wallet.souls, g0 = E.ghost('step', st), e0 = E.est(g0); out.ests++;
        ACT.echpick('2:' + st);
        if (!S.overlay || S.overlay.t !== 'echest' || S.echo.slots[2]) fail(`${k}: у ${g === 'u' ? 'Убера' : 'босса'} нет листа оценки до выбора`);
        const hs = draw(); out.sheets++; scan(k + ' · оценка до выбора', hs);
        if (e0 && e0.atks) {
          for (const q of ['dmg', 'atks', 'cost', 'souls', 'have']) if (!Number.isInteger(e0[q]) || e0[q] < 0) fail(`${k}: оценка ${q} — ${e0[q]}`);
          if (e0.souls !== e0.atks * e0.cost || e0.atks !== Math.floor((g0.hp + e0.dmg - 1) / e0.dmg)) fail(`${k}: оценка не ⌈здоровье / урон⌉ × цена — ${JSON.stringify(e0)}`);
          if (!hs.includes(`На убийство нужно около ${fmt(e0.atks)} `) || !hs.includes(`около ${fmt(e0.souls)} `) || !hs.includes(`у вас ${fmt(e0.have)}.`)) fail(`${k}: в листе оценки нет «около N атак — около M душ, у вас K»`);
          if ((e0.have < e0.souls) !== hs.includes('может уйти')) fail(`${k}: предупреждение «цель может уйти» не по оценке и душам`);
        } else if (e0 && !hs.includes('оценки нет')) fail(`${k}: урона нет, а лист не говорит «оценки нет»`);
        if (/победите|не победить|проиграете|выиграете/i.test(hs)) fail(`${k}: оценка раскрывает исход словами`);
        if (S.wallet.souls !== w0) fail(`${k}: лист оценки списал души`);
        ACT.echpick(`2:${st}:ok`);
        const xs = S.echo.slots[2]; if (xs && e0 && JSON.stringify(E.est(xs)) !== JSON.stringify(e0)) fail(`${k}: оценка до выбора ${JSON.stringify(e0)}, у цели в слоте ${JSON.stringify(E.est(xs))}`);
        return e0;
      };
      /* всегда — первый босс и Убер недели: лист оценки до выбора; при нехватке душ — предупреждение, при достатке — без него */
      for (const stB of [D.ladder.slice(0, 2).reduce((a, [, n]) => a + n, 1), TOP]) {
        clearEcho(); S.ech.avail = TOP; S.ech.pending[2] = { offers: [stB] }; S.wallet.souls = 0;
        const e0 = pickEst(`${key} · ступень ${stB}`, stB);
        if (!S.echo.slots[2] || S.echo.slots[2].step !== stB) fail(`${key}: после «Выбрать» в листе оценки ступень ${stB} не встала в слот`);
        if (e0 && e0.atks) {   // новая цель — новый номер и сид: оценка — своя
          clearEcho(); S.ech.pending[2] = { offers: [stB] }; const e1 = E.est(E.ghost('step', stB));
          if (e1 && e1.atks) { S.wallet.souls = e1.souls; ACT.echpick('2:' + stB); if (draw().includes('может уйти')) fail(`${key}: душ хватает на оценку, а лист пугает уходом цели`); S.overlay = null; }
        }
      }
      clearEcho(); S.ech.avail = 1 + (c * 2) % TOP; S.wallet.souls = 1e9; S.ech.pending[2] = p; ACT.echsel('2');
      pickEst(key, p.offers[p.offers.length - 1]);
      const x = S.echo.slots[2];
      if (!x || x.step !== p.offers[p.offers.length - 1] || S.ech.pending[2]) fail(key + ': выбор не занял слот');
      else if (x.left !== D.lifeH[x.g] * D.hour || x.hp !== x.max) fail(key + ': у новой цели не тот срок или здоровье');
      h = draw(); scan(key + ' · цель', h);
      /* та же цена — в слоте рядом с именем и в «Сведениях» цели */
      if (x) {
        const cost = E.cost(x), sl = h.split('class="eslot').find(y => y.includes('data-v="2"')) || '';
        if (!sl.includes('class="ech-sc"') || !sl.includes(`<b class="num">${fmt(cost)}</b>`)) fail(`${key}: в слоте не видно цены одной атаки ${cost}`);
        const snapX = JSON.stringify([x.hp, x.atk, x.used || null, S.wallet.souls, S.ech.last, S.echo.score]);
        S.overlay = { t: 'echfoe', arg: x.fid }; const hf = draw(); S.overlay = null;
        if (!hf.includes(`<span>Цена атаки</span><b>${fmt(cost)} `)) fail(`${key}: в «Сведениях» цели нет цены атаки ${cost}`);
        if (E.short(x) !== /На убийство нужно около|оценки нет|Оценку даст/.test(hf)) fail(`${key}: оценка в «Сведениях» ${E.short(x) ? 'нет у цели на час' : 'у цели не на час'}`);
        if (JSON.stringify([x.hp, x.atk, x.used || null, S.wallet.souls, S.ech.last, S.echo.score]) !== snapX) fail(`${key}: оценка изменила цель, кошелёк или очки`);
      }
      S.ech.wide = false; clearEcho(); ACT.echsum('0'); if (!S.ech.pending[0] || S.ech.pending[0].offers.length !== D.offer.base) fail(key + ': без артефакта вариантов не ' + D.offer.base); S.ech.wide = true;

      /* каждая ступень до победы: очки, бестиарий, рост лестницы до Убер-босса; Многоликий — не ступень лестницы, выпадает при призыве,
         победа над Многоликим (вершина недели, бой с лицами недели — ADR-0039) даёт ресурс «Многоликий» (ADR-0025) */
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

      /* призванные враги из запасов: тип по силе — из recipes.js (ADR-0039) */
      for (const fb of RX.drops.craftBosses) {
        clearEcho();
        const it = BAG.item(fb.call); BAG.add(it.id, 1);
        const q0 = BAG.qty(it.id), s0 = S.wallet.souls, k2 = `${key} · ${it.id}`;
        ACTIVATE.call(it.id);
        if (!S.overlay || S.overlay.t !== 'echact') { fail(k2 + ': нет листа подтверждения'); continue; }
        h = draw(); out.sheets++; scan(k2 + ' · подтверждение', h);
        if (h.includes(fb.name) || (it.opens && h.includes(it.opens))) fail(k2 + ': лист подтверждения раскрывает врага');
        /* призванный враг живёт час: оценка — до призыва, на той цели, какую даст призыв; кошелёк не трогает */
        const avail = !(it.team && c < 6) && E.checks('call', it).every(y => y.ok);
        if (avail !== /На убийство нужно около|оценки нет|Оценку даст/.test(h)) fail(`${k2}: оценка до призыва ${avail ? 'не показана' : 'показана у недоступного'}`);
        const gCraft = avail ? E.est(E.ghost('craft', fb)) : null;
        if (gCraft && gCraft.atks && (!Number.isInteger(gCraft.souls) || gCraft.souls !== gCraft.atks * gCraft.cost)) fail(`${k2}: оценка не целая — ${JSON.stringify(gCraft)}`);
        if (S.wallet.souls !== s0 || BAG.qty(it.id) !== q0) fail(k2 + ': лист с оценкой списал');
        if (it.team && c < 6 && h.includes(it.n)) fail(k2 + ': предмет «для команды» назван до цикла VI');
        const op = S.overlay.op;
        ACT.echactdo(op);
        if (it.cyc > c) { if (BAG.qty(it.id) !== q0 || S.wallet.souls !== s0 || S.echo.slots.some(Boolean)) fail(k2 + ': недоступная активация списала'); continue; }
        ACT.echactdo(op);
        if (BAG.qty(it.id) !== q0 - 1 || S.wallet.souls !== s0 - XE.summonSouls) fail(`${k2}: списано ${q0 - BAG.qty(it.id)} предметов и ${s0 - S.wallet.souls} душ`);
        const i = S.echo.slots.findIndex(Boolean), x = S.echo.slots[i];
        if (!x || x.fid !== fb.id || x.kind !== 'craft') { fail(k2 + ': босс не встал в слот'); continue; }
        if (x.g !== fb.g || !['e', 'b', 'u', 'f'].includes(x.g)) fail(`${k2}: тип цели «${x.g}», а в recipes.js — «${fb.g}»`);
        if (!S.overlay || S.overlay.t !== 'echgot') fail(k2 + ': нет листа «призван»');
        h = draw(); scan(k2 + ' · призван', h);
        if (!S.ech.known[fb.id] && h.includes(fb.name)) fail(k2 + ': имя босса видно до первой победы');
        S.overlay = null; h = draw(); scan(k2 + ' · в слоте', h); out.calls++;
        /* «Сведения» о предмете призыва (OV.item): «За победу» — сундук и шансы, без имени врага (§12.5); «для команды» — без сведений.
           Имя врага ищем в своём блоке: описание и пометка Этриона — данные recipes.js, их сбой — предупреждение соседу */
        S.overlay = { t: 'item', arg: it.id }; h = draw();
        if (/undefined|NaN|\[object /.test(h)) fail(k2 + ': «Сведения» о предмете — undefined, NaN или [object');
        const hidden = !!(it.team && c < 6), rule0 = E.chest(fb, x.race, c), rw = hidden ? '' : E.reward(fb, w.race, c);   // лист берёт неделю аккаунта
        if (rw && (rw.includes(fb.name) || (it.opens && rw.includes(it.opens)))) fail(k2 + ': «За победу» раскрывает врага');
        const leak = why => { out.leak = out.leak || {}; (out.leak[it.id] = out.leak[it.id] || {})[why] = 1; };
        if (!hidden && (h.includes(fb.name) || (it.opens && h.includes(it.opens)))) leak('имя врага в «Сведениях» до призыва');
        if (!hidden && /(^|[^а-яё])мать([^а-яё]|$)/i.test(h)) leak('«мать» в тексте');
        if (!hidden && rule0 && (!rw || !h.includes(rw) || !h.includes('За победу') || !h.includes(LBX.boxes[rule0.box].n) || !h.includes('data-a="echbox"'))) fail(k2 + ': в «Сведениях» о предмете нет сундука за победу');
        if (hidden && h.includes('За победу')) fail(k2 + ': предмет «для команды» показывает сундук до цикла VI');
        /* «Шансы» — лист «Состав и шансы»: окно редкостей и доли линий, без имени врага, ничего не выдаёт */
        if (rule0 && !hidden) {
          const chs = S.bag.chests.length; ACT.echbox(`boss:${fb.id}:${x.race}`); h = draw(); scan(k2 + ' · шансы сундука', h);
          if (!S.overlay || S.overlay.t !== 'echbox' || !h.includes('Состав и шансы') || !/\d+(,\d)? %/.test(h)) fail(k2 + ': лист «Состав и шансы» пустой');
          if (h.includes(fb.name)) fail(k2 + ': лист шансов называет врага');
          if (S.bag.chests.length !== chs) fail(k2 + ': просмотр шансов выдал сундук');
        }
        S.overlay = null; S.echo.sel = i; S.route = 'echo';
        const ch0 = S.bag.chests.length, tr0 = fb.trophy ? BAG.qty(fb.trophy) : 0, gold0 = S.wallet.gold, sh0 = JSON.stringify(S.rs.shards), dust0 = S.wallet.dust;
        const sc0 = S.echo.score;
        if (!kill(k2, i)) continue;
        /* КрафБосс приносит очки рейтинга (слово автора 01.10.2026, ADR-0043): по месту в общей лестнице — правило summon.types[g].points
           цикла силы врага; цикл игрока их не умножает — у одного врага одни очки в любом цикле игрока; в обучении очков нет */
        const pc = fb.cyc + (fb.powerCycleStep || 0), R0 = window.EN_ECHO_RULES, rp = R0 && R0.summon && R0.summon.types[fb.g] && R0.summon.types[fb.g].points;
        const want = c < FROM ? 0 : rp ? rp[String(pc)] : E.craftPts(fb.g, pc), gotPts = S.echo.score - sc0;
        if (gotPts !== want) fail(`${k2}: КрафБосс дал ${gotPts} очков, а по общей лестнице — ${want} (ADR-0043)`);
        if (c >= FROM && !(gotPts > 0)) fail(`${k2}: КрафБосс без очков рейтинга (ADR-0043)`);
        if (c >= FROM) { const seen = out.craftPts[fb.id] = out.craftPts[fb.id] || new Set(); seen.add(gotPts); }
        if (fb.trophy && BAG.qty(fb.trophy) !== tr0 + fb.trophies) fail(k2 + ': нет трофея');
        if (fb.gold && S.wallet.gold !== gold0 + fb.gold) fail(k2 + ': золото не зачислено');
        /* сундук за победу — по модели призванных врагов (EN_LOOTBOXES.summon): вид, редкость, окно, цикл пула, неделя у Лика, сид от боя */
        const rule = E.chest(fb, x.race, c), got = S.bag.chests.slice(ch0);
        if (!LBX.summon || !LBX.summon.bosses[fb.id]) fail(k2 + ': у призванного врага нет сундука в EN_LOOTBOXES.summon');
        if (!rule) { if (got.length) fail(k2 + ': сундук без правила модели'); }
        else {
          if (got.length !== rule.n) fail(`${k2}: сундуков ${got.length}, по модели — ${rule.n}`);
          for (const ch of got) {
            if (ch.box !== rule.box || ch.r !== rule.r || (ch.win || 'step') !== rule.win || ch.cyc !== rule.cyc || (rule.box === 'shards' && ch.week !== x.race)) fail(`${k2}: сундук ${ch.box}/${ch.r}/${ch.win}/${ch.cyc} — не по модели ${rule.box}/${rule.r}/${rule.win}/${rule.cyc}`);
            if (!Number.isInteger(ch.seed)) fail(k2 + ': у сундука нет сида от боя');
            try { EnLoot.resolve(LBX, ch); } catch (x2) { fail(k2 + ': сундук не открывается — ' + x2.message); }
            out.chests++;
          }
          /* Лик недели — сундуком осколков своей недели: прямых осколков и праха нет */
          if ((fb.heroShardsWeekBp || fb.heroShardsWeek) && (sh0 !== JSON.stringify(S.rs.shards) || S.wallet.dust !== dust0)) fail(k2 + ': Лик недели заплатил осколками мимо сундука');
        }
        /* повтор номера последней атаки — второго сундука нет */
        ACT.echatk(x.uid + ':' + x.atk); if (S.bag.chests.length !== ch0 + got.length) fail(k2 + ': повтор атаки выдал второй сундук');
        h = draw(); scan(k2 + ' · победа', h);
        if (!h.includes(fb.name)) fail(k2 + ': итог победы не назвал босса');
        if (rule && (!h.includes('data-a="echopenbox"') || !h.includes(LBX.boxes[rule.box].n))) fail(k2 + ': итог победы не показывает сундук и «Открыть»');
        /* бестиарий: побеждённый призванный враг — «За победу» с сундуком */
        if (rule) { ACT.echfoe(fb.id); h = draw(); scan(k2 + ' · бестиарий', h); if (!h.includes('За победу') || !h.includes('data-a="echbox"')) fail(k2 + ': бестиарий не показывает сундук за победу'); }
        /* «Открыть» из итога — в запасах окном сундука: этот сундук открыт, вкладка «Сундуки», повтор не выдаёт */
        if (rule && got.length && w === RS.weeks[0]) {
          S.overlay = { t: 'echres', arg: (S.runs.find(r => r.kind === 'echo') || {}).id }; const id0 = got[0].id, n0 = S.bag.chests.length;
          ACT.echopenbox(id0);
          if (BAG.chest(id0) || S.bag.chests.length !== n0 - 1) fail(k2 + ': «Открыть» не открыло сундук этой победы');
          if (S.route !== 'craft' || zpV().tab !== 'chest' || !S.overlay || S.overlay.t !== 'co') fail(k2 + ': «Открыть» — не в запасах окном сундука');
          scan(k2 + ' · окно сундука', draw());
          const w0 = JSON.stringify(S.wallet); ACT.echopenbox(id0);
          if (S.bag.chests.length !== n0 - 1 || JSON.stringify(S.wallet) !== w0) fail(k2 + ': повтор «Открыть» выдал второй раз');
          out.opened = (out.opened || 0) + 1;
        }
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
  /* цикл игрока очки КрафБосса не умножает (ADR-0043): победа над одним и тем же врагом в любом цикле игрока — одни очки */
  for (const [id, seen] of Object.entries(out.craftPts)) if (seen.size !== 1) fail(`КрафБосс ${id}: очки меняются с циклом игрока — ${[...seen].join(' / ')}`);
  out.craftPts = Object.keys(out.craftPts).length;
  return out;
}
const t0 = Date.now();
let res;
try { res = vm.runInContext('(' + suite.toString() + ')()', ctx); } catch (e) { err.push('сценарии: ' + (e.stack || e.message)); done(); }
err.push(...res.errors);
/* данные recipes.js (сосед): описание или пометка Этриона у предмета призыва называют врага до призыва (§12.5) — предупреждение */
if (res.leak) for (const [id, why] of Object.entries(res.leak)) warn.push(`recipes.js, ${id}: ${Object.keys(why).join('; ')} — правка текста предмета у сборщика рецептов`);
/* портреты врагов крафта Этриона (ECH.craftArt, tools/art-gen/jobs/craft-bosses.json): у каждого — выгруженный файл и портрет в облике;
   пробуждённый без своего — портрет своего босса; эхо боссов биомов 1–4 — портреты боссов биомов; прочие крафтовые — заглушка без картинки */
{
  let A = null;
  try {
    A = vm.runInContext(`(() => {
      const E = window.EN_ECHO, C = E.data.craftArt || {}, ids = RX.drops.craftBosses.map(b => b.id), has = new Set(ids);
      const pic = id => E.faceArt(E.foe(id)) || '';
      return { art: Object.entries(C).map(([id, p]) => [id, p, has.has(id), pic(id)]),
        aw: Object.keys(C).filter(id => has.has(id + '_aw')).map(id => [id, C[id], pic(id + '_aw')]),
        none: ids.filter(id => id !== 'lik' && !C[id] && !C[id.replace(/_aw$/, '')]).map(id => [id, pic(id)]) };
    })()`, ctx);
  } catch (e) { err.push('портреты призванных врагов: ' + e.message); }
  if (A) {
    for (const [id, p, has, h] of A.art) {
      if (!has) err.push(`ECH.craftArt.${id}: такого призванного врага нет в recipes.js`);
      if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) err.push(`ECH.craftArt.${id}: нет файла assets/art/${p}`);
      if (!h.includes(p + '?v=')) err.push(`ECH.craftArt.${id}: портрет не показан в облике врага`);
    }
    for (const [id, p, h] of A.aw) if (!h.includes(p + '?v=')) err.push(`${id}_aw: пробуждённый не показывает портрет своего босса`);
    for (const [id, h] of A.none) if (h) err.push(`${id}: картинка без портрета в ECH.craftArt`);
    console.log(`Портреты врагов крафта: ${A.art.length} (пробуждённых — по портрету своего босса: ${A.aw.length}), без портрета — ${A.none.length}.`);
  }
}
console.log(`Эхо проверено за ${Math.round((Date.now() - t0) / 1000)} с: экранов ${res.screens}, листов ${res.sheets}, вариантов призыва ${res.offers}, побед ${res.kills}, призванных врагов ${res.calls}, Многоликих ${res.many}, руин ${res.ruins}, сундуков ${res.chests}, открыто из итога ${res.opened || 0}, оценок до призыва ${res.ests}, КрафБоссов с очками по общей лестнице ${res.craftPts}.`);
done();

function done() {
  if (warn.length) console.log('Предупреждения (соседние экраны):\n' + warn.join('\n'));
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log('Проверка пройдена: девять недель, шесть циклов, призыв, атака, победа и три активации — без исключений, undefined и NaN.');
  process.exit(0);
}
