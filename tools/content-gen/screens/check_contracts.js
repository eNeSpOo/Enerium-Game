/* Автопроверка контрактов (design/ui/contracts.js, design/ui/screens/contracts.js) — без браузера.
   1. Файлы: index.html подключает contracts.js до основного скрипта, contracts.css и screens/contracts.js — после model.js; прежнего
      экрана contractsView и его действий в index.html нет; карта экранов отмечает контракты готовыми (поле ready карточки «Контракты»).
   2. Данные свежие: калькулятор tools/content-gen/contracts/build.js без ошибок даёт ровно EN_CONTRACTS и таблицы черновика;
      capacity.json совпадает с калькуляторами экономики (если есть Python). Все числа целые; Энериум — только с эпической;
      душ в наградах нет; выше редкость — не меньше награда; объём растёт с редкостью; каталог покрывает все занятия игры.
   3. Алгоритм пула: тот же сид — тот же пул; на задание ровно два броска генератора — редкость и вид; группы в пуле не повторяются;
      замена меняет только своё место; ставка и награда — по данным.
   4. «Сервер» экрана: замена бесплатная и за Энериум с потолком, отмена, заверение одного контракта из двух, подпись со ставкой,
      прогресс только с подписи, исполнение, выдача один раз (валюта, запасы, сундук, очки), срыв к сроку, пустой контракт;
      повтор операции с тем же номером ничего не меняет, отказ ничего не меняет. Условия игрока: задание клана — только в клане
      (S.clan.in), задание Лиги — только с открытой Лигой по правилу экрана Лиги (15 разных героев, EN_ARENA.league).
   5. Наблюдатель: траты золота и духа, победы Эхо и завершённый ритуал двигают задания; ставка — не трата; до подписи — не в счёт.
   6. Вид: оба сегмента во всех состояниях, все листы, закрытый экран, сценарии, раздел UI-кита — без исключений, undefined и NaN.
      Раскладка (слово автора 29.09.2026): задания строками слева под шапкой статуса, сведения справа — награда, заверение, главное действие.
      Правила воздуха на карточке: не больше двух чисел и одного действия. Режим «Игрок»: служебных слов нет; «Команда» — есть служебное.
   7. Неделя: строка «Контракты» в реестре WEEK_MODES — настоящая, пороги планок и валюта прошлой недели из данных контрактов.
   8. Лестница планок (ADR-0047) — законы Л1–Л4 (ladder_laws.js), проверены мутацией: личные планки контрактов — ступени лестницы
      на все циклы, та же, что даёт EnLoot.ladder для цикла игрока; пороги своей полосы — EN_CONTRACTS.planks, дальше — множителем
      первой планки; в листе «Планки контрактов» видны все пять полос; за верхней планкой своей полосы — планки следующей, без
      перехода в новый цикл, и «Дары» платят сундуки её полосы.
   9. Клановые ступени (§18.1, ADR-0042, ADR-0047): данные — доли и пороги клана модели по циклам (участников × ⌊первая личная
      планка × доля⌋), клан обычных — на первой с запасом не меньше 5 %, клан увлечённых — на второй, во всех циклах, как записано
      в typical контрактов лутбоксов; ключи клановых сундуков — внутри цели «75 % капа рунных стражей»: вычтены из цели наград
      заданий. Экран: лист «Планки контрактов», вкладка «Клан» — три ступени, сундуки каждому; очки клана — сумма очков участников,
      у других циклов — в пересчёте по первым личным планкам, вступивший на этой неделе не в счёте; без клана — «Найти клан»;
      Неделя получает клановые ступени (clanPlanks), «Дары» держат взятую ждущей распределения.
   Запуск: node tools/content-gen/screens/check_contracts.js [--dump] [--mut] [--stale-ok]
   --stale-ok — свежесть данных, таблиц и capacity.json — предупреждением, а не ошибкой: когда соседние калькуляторы в середине
   правок и экран нужно проверить на тех данных, что есть; полный прогон перед коммитом — без флага.
   --mut — какой закон поймал каждую поломку лестницы. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const LL = require('./ladder_laws.js');   // законы лестницы планок (ADR-0047) — общие с проверками Недели и экранов режимов
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const DUMP = process.argv.includes('--dump'), STALE_OK = process.argv.includes('--stale-ok');
const err = [], note = [];
const cnt = { views: 0, player: 0, ops: 0, cards: 0, ladders: 0, mut: '', stale: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
const stale = m => { if (STALE_OK) { note.push(m); cnt.stale++; } else say(m); };   // устаревшие данные: ошибка, с --stale-ok — предупреждение
function done() {
  for (const n of note) console.log('предупреждение: ' + n);
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Контракты: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; строк заданий ${cnt.cards}, раскладок «слева — справа» ${cnt.layouts || 0}; операций ${cnt.ops}. Лестница планок: состояний сверено ${cnt.ladders}, мутаций поймано ${cnt.mut || 'нет'}.`);
  console.log(`Проверка пройдена: ${cnt.stale ? 'данные — как есть, их свежесть не подтверждена (--stale-ok, см. предупреждения)' : 'данные свежие'} и целые, пул решается на сиде, операции не повторяются, прогресс — с подписи, награда — один раз, лестница планок — сразу на все циклы и без замка, клановые ступени — по очкам клана, игроку служебного не видно.`);
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const i = src => scripts.findIndex(s => s.src === src), iMain = scripts.findIndex(s => !s.src && /const EB = window\.EnBattle/.test(s.code));
  if (i('contracts.js') < 0) say('index.html: не подключены данные contracts.js');
  else if (iMain >= 0 && i('contracts.js') > iMain) say('index.html: contracts.js подключён после основного скрипта');
  if (i('screens/contracts.js') < 0) say('index.html: не подключён screens/contracts.js');
  else if (i('screens/contracts.js') < i('screens/model.js')) say('index.html: screens/contracts.js подключён раньше model.js');
  else if (i('screens/wanderer.js') >= 0 && i('screens/contracts.js') < i('screens/wanderer.js')) say('index.html: screens/contracts.js подключён раньше wanderer.js — пул не увидит артефакты и Память');
  if (!/<link rel="stylesheet" href="screens\/contracts\.css">/.test(html)) say('index.html: не подключён screens/contracts.css');
  for (const old of ['function contractsView', 'contracts: contractsView', "data-a=\"treroll\"", 'treroll(v)', 'tsigndo()', "data-a=\"cert\"", '.task{', '.cert{'])
    if (html.includes(old)) say(`index.html: остался прежний код контрактов — «${old}»`);
  const card = html.match(/\{ n: 'Контракты'[\s\S]*?\},\r?\n/);
  if (!card || !/ready:\s*\[[^\]]*'contracts'/.test(card[0])) say('index.html: на карте экранов контракты не отмечены готовыми (ready карточки «Контракты»)');
  for (const f of ['contracts.js', 'screens/contracts.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
}
if (err.length) done();

/* ================== 2. данные ================== */
const B = require('../contracts/build.js');
const built = B.build();
if (built.err.length) say('калькулятор контрактов: ' + built.err.slice(0, 5).join('; '));
const ctxD = { window: {} }; ctxD.window = ctxD; vm.createContext(ctxD); vm.runInContext(read('contracts.js'), ctxD);
const D = ctxD.EN_CONTRACTS, OC = ctxD.EnContracts;
{
  if (!D || !OC) say('contracts.js: нет window.EN_CONTRACTS или window.EnContracts');
  else if (B.render(built.data) !== read('contracts.js')) stale('contracts.js устарел: пересобрать — node tools/content-gen/contracts/build.js');
  const doc = fs.existsSync(B.FILES.doc) ? fs.readFileSync(B.FILES.doc, 'utf8') : null;
  if (!doc) say('нет черновика docs/content/контракты.md');
  else { const fresh = B.withTables(doc, built.tables); if (fresh == null) say('контракты.md: нет меток таблиц'); else if (fresh !== doc) stale('контракты.md: таблицы устарели — пересобрать'); }
  const py = cp.spawnSync('python', [path.join(ROOT, 'tools', 'content-gen', 'contracts', 'capacity.py'), '--check'], { encoding: 'utf8', env: Object.assign({}, process.env, { PYTHONIOENCODING: 'utf-8' }) });
  if (py.error) note.push('Python не найден — свежесть capacity.json не проверена');
  else if (py.status !== 0) stale('capacity.json устарел: ' + (py.stdout || py.stderr || '').trim().split('\n').pop());
}
if (err.length) done();
{
  const walk = (x, where) => { if (typeof x === 'number' && !Number.isInteger(x)) say(`данные: не целое ${x} — ${where}`); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, where + '.' + k); };
  walk(D, 'EN_CONTRACTS');
  if (D.rewKeys.includes('souls')) say('данные: души в награде контракта — горлышко §1.2, их не продают и не раздают');
  for (const t of D.rules.tables) for (const c of D.rules.cycles) {
    const R = D.rew[t][c];
    R.forEach((w, i) => {
      if (w.en && i + 1 < 4) say(`награда ${t}, цикл ${c}, ${D.rar.names[i]}: Энериум ниже эпической`);
      if (i + 1 >= 4 && !w.en) say(`награда ${t}, цикл ${c}, ${D.rar.names[i]}: нет Энериума с эпической`);
      if (i) for (const k of D.rewKeys) if (w[k] < R[i - 1][k]) say(`награда ${t}, цикл ${c}: ${k} на «${D.rar.names[i]}» меньше, чем на «${D.rar.names[i - 1]}»`);
      if (D.stake[t][c][i] !== w.gold * D.rules.cert.stakePct / 100) say(`ставка ${t}, цикл ${c}, ${D.rar.names[i]}: не ${D.rules.cert.stakePct} % золота задания`);
    });
    for (const [k, V] of Object.entries(D.vol[t][c])) {
      let last = 0;
      V.forEach((v, i) => { if (!v) return; if (v <= last) say(`объём ${k}, ${t}, цикл ${c}: не растёт с редкостью`); last = v; const sh = D.share[t][c][k][i][0]; if (t === 'd' && sh > 8000) say(`объём ${k}, день, цикл ${c}: больше 80 % дня обычного`); if (t === 'w' && sh > 55000) say(`объём ${k}, неделя, цикл ${c}: больше 5,5 дня`); });
    }
  }
  /* каталог — все занятия игры, которые называет задача автора: биом, боссы, стражи, мастерская, Эхо, Арена, ритуалы и рабочие, лавка и рынок,
     развитие героев, Возрождение душ, клан, Событие */
  const need = { floors: 'этажи', elites: 'элиты', bosses: 'боссы', guard: 'рунные стражи', craft: 'мастерская', recipe: 'рецепты', echoAtk: 'атаки Эхо', echoPts: 'очки Эхо',
    arena: 'Арена', ritual: 'ритуалы', workers: 'рабочие', shop: 'лавка', market: 'рынок', spirit: 'развитие героев', limit: 'рунные пределы', dust: 'Возрождение душ', clan: 'клан', event: 'Событие' };
  for (const [k, n] of Object.entries(need)) if (!D.kinds[k]) say(`каталог: нет задания на «${n}»`);
  /* донат не нужен: ни одно задание не требует Энериума */
  for (const [k, K] of Object.entries(D.kinds)) if (/Энериум/.test(K.n) || /прокрут/i.test(K.n)) say(`каталог: задание «${K.n}» требует Энериума`);
}
/* лестница планок и клановые ступени в данных (ADR-0047, §18.1, ADR-0042). Лутбоксы — слои планок контрактов и typical: где стоят
   обычный и увлечённый; сборщик контрактов подтверждает typical прогоном во всех циклах */
const ctxL = { window: {} }; ctxL.window = ctxL; vm.createContext(ctxL); vm.runInContext(read('lootboxes.js'), ctxL);
const LB = ctxL.EN_LOOTBOXES;
if (built.data) {
  const M = LB.modes.contract, TYP = M.typical || {}, lc = M.layers.find(l => l.kind === 'plank' && l.clan), CL = D.clan, bp = D.rules.bp;
  if (!M.ladder || !lc) say('lootboxes.js: у контрактов нет лестницы планок или слоя клановых планок');
  else if (!CL || !Array.isArray(CL.x) || !CL.needs) say('данные: нет клановых ступеней EN_CONTRACTS.clan (доли x и пороги needs) — §18.1, ADR-0047');
  else {
    if (CL.members !== 25 || CL.activeBp !== 7000) say(`клан модели — ${CL.members} мест, играют ${CL.activeBp / 100} %: у Эхо и Событий — 25 мест и 70 %`);
    if (CL.x.length !== lc.rows.length || CL.x.some((x, i) => !Number.isInteger(x) || x <= 0 || x * lc.rows[0].x !== CL.x[0] * lc.rows[i].x)) say(`клановые ступени: доли ${CL.x} — не первая доля × шаги строк клановых планок лутбоксов (${lc.rows.map(r => r.x)})`);
    for (const c of D.rules.cycles) {
      const p1 = D.planks[c][0], want = CL.x.map(x => CL.members * Math.floor(p1 * x / CL.per)), E = D.econ[c], key = `клановые ступени, цикл ${c}`;
      if (JSON.stringify(CL.needs[c]) !== JSON.stringify(want) || JSON.stringify(OC.clanPlanks(D, CL.members, c)) !== JSON.stringify(want)) say(`${key}: пороги ${CL.needs[c]} — не участников × ⌊первая личная планка × доля⌋ (${want})`);
      /* где стоят кланы: обычных — на первой с запасом не меньше 5 %, увлечённых — на второй; это же — typical контрактов в лутбоксах */
      const stepOf = v => want.filter(n => v >= n).length;
      if (stepOf(E.o.clanPts) !== 1 || E.o.clanStep !== 1 || E.o.clanPts * 100 < want[0] * 105) say(`${key}: клан обычных (${E.o.clanPts} очков недели) — не на первой ступени с запасом 5 %: пороги ${want}`);
      if (stepOf(E.e.clanPts) !== 2 || E.e.clanStep !== 2) say(`${key}: клан увлечённых (${E.e.clanPts} очков недели) — не на второй ступени: пороги ${want}`);
      if (!TYP.free || !TYP.fan || E.o.clanStep !== TYP.free.clan || E.e.clanStep !== TYP.fan.clan) say(`${key}: typical контрактов в лутбоксах (клан: ${TYP.free && TYP.free.clan} / ${TYP.fan && TYP.fan.clan}) не сходится с прогоном (${E.o.clanStep} / ${E.e.clanStep})`);
      /* личные планки: обычный — 4-я, увлечённый — 5-я — typical лутбоксов подтверждён прогоном; считаем по лестнице на все циклы */
      const lad = LL.needs(LB, 'contract', c, p1), own = LL.ownCount(LB, 'contract', c), took = v => lad.filter(n => v >= n).length;
      if (JSON.stringify(lad.slice(0, own)) !== JSON.stringify(D.planks[c])) say(`личные планки, цикл ${c}: пороги своей полосы ${D.planks[c]} — не первая планка × шаги строк лутбоксов (${lad.slice(0, own)})`);
      if (!TYP.free || took(E.o.pts) !== TYP.free.me || took(E.e.pts) !== TYP.fan.me) say(`личные планки, цикл ${c}: обычный берёт ${took(E.o.pts)}-ю, увлечённый — ${took(E.e.pts)}-ю, а typical контрактов в лутбоксах — ${TYP.free && TYP.free.me} / ${TYP.fan && TYP.fan.me}`);
      /* ключи клановых сундуков — внутри цели «75 % капа рунных стражей»: цель наград заданий — кап × 75 % без ключей с боссов и без
         сундуков рейтинга — личных планок и клановых ступеней; итог обычного со всех источников — около 75 % капа */
      const I = built.income[c].o, cap = E.capKeys, all = built.keysGoal[c] + I.boss + I.rating + I.clanKeys, goal = cap * B.TARGET.keysAllBp / bp;
      if (!(I.clanKeys > 0)) say(`${key}: у обычного нет ключей клановых сундуков — клан обычных берёт первую ступень`);
      if (Math.abs(all - goal) > 1) say(`${key}: ключи клановых сундуков не вычтены из цели наград заданий — цель ${Math.round(built.keysGoal[c])} + боссы ${Math.round(I.boss)} + личные планки ${Math.round(I.rating)} + клановые ${Math.round(I.clanKeys)} ≠ ${Math.round(goal)} (75 % капа ${cap})`);
      if (I.keysAll * bp < cap * B.TARGET.keysCoverMin || I.keysAll * bp > cap * (B.TARGET.keysAllBp + B.TARGET.tolBp / 4)) say(`${key}: ключи обычного со всех источников — ${Math.round(I.keysAll)} из капа ${cap}: не около 75 %`);
    }
    /* очки участника другого цикла — в долях первой личной планки его цикла (ADR-0042) */
    const [ca, cb] = [D.rules.cycles[0], D.rules.cycles[1]];
    if (OC.clanPts(D, D.planks[cb][0] * 3, cb, ca) !== D.planks[ca][0] * 3 || OC.clanPts(D, 100, ca, ca) !== 100 || OC.clanPts(D, 100, 99, ca) !== 0) say('алгоритм: очки участника другого цикла — не по первым личным планкам (EnContracts.clanPts)');
  }
}

/* ================== 3. алгоритм пула ================== */
{
  const spec = (seed, t = 'd', c = 2) => ({ t, c, seed, period: 'проверка-1' });
  const a = OC.offer(D, spec('А'), 5), b = OC.offer(D, spec('А'), 5), z = OC.offer(D, spec('Б'), 5);
  if (JSON.stringify(a) !== JSON.stringify(b)) say('пул: тот же сид — разный пул');
  if (JSON.stringify(a) === JSON.stringify(z)) say('пул: разные сиды — одинаковый пул');
  for (const c of D.rules.cycles) for (const t of D.rules.tables) for (let s = 0; s < 40; s++) {
    const P = OC.offer(D, spec('сид ' + s, t, c), 12), g = P.map(x => D.kinds[x.kind].grp);
    if (new Set(g).size !== g.length) say(`пул ${t}, цикл ${c}: группа повторилась — ${g.join(', ')}`);
    for (const x of P) { if (x.goal !== D.vol[t][c][x.kind][x.r - 1] || !x.goal) say(`пул ${t}, цикл ${c}: объём ${x.kind} не из данных`); if (x.pts !== D.rules.points[x.r - 1]) say('пул: очки не по редкости'); }
  }
  /* ровно два броска: редкость, затем вид — сверка с генератором напрямую */
  const sp = spec('два броска'), x = OC.offer(D, sp, 1)[0], rng = OC.makeRng(OC.taskSeed(sp, 0, 0)), W = D.rar.wBp;
  let a1 = rng(W.reduce((s, w) => s + w, 0)), r = 1; while (a1 >= W[r - 1]) { a1 -= W[r - 1]; r++; }
  const list = OC.eligible(D, sp, r, new Set()), ws = list.map(k => D.kinds[k].w); let b1 = rng(ws.reduce((s, w) => s + w, 0)), j = 0; while (b1 >= ws[j]) { b1 -= ws[j]; j++; }
  if (!x || x.r !== r || x.kind !== list[j]) say(`пул: броски не совпали с форматом — ждали ${list[j]} на редкости ${r}, вышло ${x && x.kind} на ${x && x.r}`);
  const P = OC.offer(D, spec('замена'), 5), y = OC.reroll(D, spec('замена'), P, 2);
  if (!y || y.slot !== P[2].slot || y.n !== P[2].n + 1) say('замена: не то место или не следующий бросок');
  const P2 = P.slice(); if (y) P2[2] = y; if (P2.some((q, k) => k !== 2 && q !== P[k])) say('замена тронула другие места');
  if (y && P2.filter((q, k) => k !== 2).some(q => D.kinds[q.kind].grp === D.kinds[y.kind].grp)) say('замена дала группу, которая уже есть в пуле');
  const pool = OC.reward(D, 'w', 3, P, 2), one = OC.reward(D, 'w', 3, P, 1);
  if (pool.keys !== one.keys * 2 || !pool.chest || pool.chest.n !== 2) say('заверение: награда недельного не ×2 или сундук не удвоен');
  if (OC.reward(D, 'd', 3, P, 1).chest) say('дневной контракт дал сундук: сундук — только недельному');
}
if (err.length) done();

/* ================== песочница ==================
   Скрипты прототипа — по порядку, как в браузере, с заглушкой DOM; boot() не запускается; localStorage недоступен */
function load() {
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
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    if (s.src && !fs.existsSync(path.join(UI, s.src))) { if (!note.includes(s.src)) note.push(`index.html ссылается на ${s.src}, файла ещё нет — пропущен`); continue; }
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, FLOWS, KH, MAP, KIT_EXTRA, SCREENS, BAG, render, initialState, setTeam, CT: window.EN_CONTRACTS, CTE: window.EnContracts,
    CT_SRV, CT_DEMO, ctObserve, ctPoolSize, ctFreeRer, ctPool, ctStake, ctKitHtml, ctOpen, WEEK_MODES: window.WEEK_MODES || [],
  })`, ctx);
  return { T, ctx, els, rootCls, game: () => (els.game ? els.game.innerHTML : '') };
}
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
const dumped = new Set();
function scan(P, h, where) {
  cnt.views++;
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!P.T.KH.team) {
    cnt.player++;
    const v = strip(h), txt = playerText(h).split('\n').concat(tips(v));
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
    if (DUMP && !dumped.has(where)) { dumped.add(where); console.log(`\n== ${where}\n` + playerText(h)); }
  }
  return h;
}
const view = (P, where) => { run(where, () => P.T.render()); return scan(P, P.game(), where); };
/* правила воздуха на карточке задания: не больше двух чисел в видимом тексте и одного действия */
function airCards(h, where) {
  let at = 0;
  for (;;) {
    const s = h.indexOf('<div class="ct-card', at); if (s < 0) break;
    const a = h.indexOf('<div class="ct-act">', s), e = h.indexOf('</div>', a); at = e + 6;
    if (a < 0 || e < 0) { say(`${where}: карточка задания без места действия`); break; }
    cnt.cards++;
    const main = h.slice(h.indexOf('>', s) + 1, a), act = h.slice(a, e);
    const text = playerText(main.replace(/\s(?:title|aria-label)="[^"]*"/g, ''));
    const nums = (text.match(/\d[\d\s ]*/g) || []).filter(s => s.trim()).length;
    if (nums > 2) say(`${where}: на карточке больше двух чисел — «${text.replace(/\n/g, ' · ')}»`);
    const acts = (act.match(/<button/g) || []).length;
    if (acts > 1) say(`${where}: на карточке больше одного действия`);
  }
}

const P = load(), T = P.T;
const reset = () => { T.S = T.initialState(); T.S.overlay = null; };
const S = () => T.S, C = () => T.S.contracts;
const op = () => `ct${C().seq}`;
reset();

/* ================== 4. «сервер» ================== */
{
  const Dd = C().day, W = C().week;
  if (Dd.st !== 'draft' || Dd.tasks.length !== T.ctPoolSize()) say(`старт: дневной — ${Dd.st}, заданий ${Dd.tasks.length} при пуле ${T.ctPoolSize()}`);
  if (W.st !== 'signed' || !W.cert || !W.signed) say('старт: недельный демо должен быть подписан и заверен');
  if (C().rer.free !== T.ctFreeRer()) say('старт: бесплатных замен не столько, сколько даёт аккаунт');
  /* пул тот же после сброса: сервер решает на сиде */
  const first = JSON.stringify(Dd.tasks); reset(); if (JSON.stringify(C().day.tasks) !== first) say('сброс: пул дня другой — не на сиде');
  /* замена бесплатная */
  const f0 = C().rer.free, t0 = C().day.tasks[0], o1 = op();
  let r = T.CT_SRV.reroll(o1, 'd', 0); cnt.ops++;
  if (!r.ok || C().rer.free !== f0 - 1 || C().day.tasks[0] === t0) say(`замена: ${JSON.stringify(r)}, бесплатных ${C().rer.free}`);
  const snap = JSON.stringify(C().day.tasks);
  r = T.CT_SRV.reroll(o1, 'd', 0); if (!r.again || JSON.stringify(C().day.tasks) !== snap || C().rer.free !== f0 - 1) say('повтор замены с тем же номером что-то изменил');
  /* платные: Энериум, потолок */
  C().rer.free = 0; const en0 = S().wallet.enerium, cap = T.CT.rules.rer.paidCap, price = T.CT.rules.rer.price;
  for (let k = 0; k < cap; k++) { r = T.CT_SRV.reroll(op(), 'd', 1); cnt.ops++; if (!r.ok) { say(`платная замена ${k + 1}: отказ ${r.refuse}`); break; } }
  if (S().wallet.enerium !== en0 - cap * price || C().rer.paid !== cap) say(`платные замены: Энериума ${S().wallet.enerium} из ${en0 - cap * price}, сделано ${C().rer.paid}`);
  const en1 = S().wallet.enerium; r = T.CT_SRV.reroll(op(), 'd', 1); if (r.refuse !== 'cap' || S().wallet.enerium !== en1) say(`сверх потолка платных замен: ждали отказ, получили ${JSON.stringify(r)}`);
  reset(); C().rer.free = 0; S().wallet.enerium = 2; r = T.CT_SRV.reroll(op(), 'd', 0); if (r.refuse !== 'enerium' || S().wallet.enerium !== 2 || C().rer.paid) say('замена без Энериума: ждали отказ без расхода');
  /* отмена */
  reset(); const n0 = C().day.tasks.length, o2 = op(); r = T.CT_SRV.drop(o2, 'd', 0); cnt.ops++;
  if (!r.ok || C().day.tasks.length !== n0 - 1) say('отмена: задание не ушло');
  r = T.CT_SRV.drop(o2, 'd', 0); if (!r.again || C().day.tasks.length !== n0 - 1) say('повтор отмены что-то изменил');
  /* заверение: один контракт из двух — недельный уже заверен */
  reset(); r = T.CT_SRV.cert(op(), 'd', true); if (r.refuse !== 'other' || C().day.cert) say(`заверение второго контракта: ждали отказ, получили ${JSON.stringify(r)}`);
  S().mem.slots[0].p = T.CT.rules.cert.both; r = T.CT_SRV.cert(op(), 'd', true); cnt.ops++; if (!r.ok || !C().day.cert || C().day.stake !== T.ctStake(S(), C().day)) say(`«Заверенное слово»: заверить второй не вышло — ${JSON.stringify(r)}`);
  /* подпись: ставка уходит один раз, прогресс с нуля */
  const g0 = S().wallet.gold, stake = C().day.stake, o3 = op();
  r = T.CT_SRV.sign(o3, 'd'); cnt.ops++;
  if (!r.ok || C().day.st !== 'signed' || !C().day.signed || S().wallet.gold !== g0 - stake || C().day.tasks.some(x => x.p)) say(`подпись: ${JSON.stringify(r)}, золото ${S().wallet.gold} из ${g0 - stake}`);
  r = T.CT_SRV.sign(o3, 'd'); if (!r.again || S().wallet.gold !== g0 - stake) say('повтор подписи списал ставку ещё раз');
  r = T.CT_SRV.reroll(op(), 'd', 0); if (r.refuse !== 'signed') say('подписанное задание заменилось');
  /* нехватка золота на ставку — отказ без изменений */
  reset(); S().mem.slots[0].p = T.CT.rules.cert.both; T.CT_SRV.cert(op(), 'd', true); S().wallet.gold = 1; r = T.CT_SRV.sign(op(), 'd');
  if (r.refuse !== 'gold' || C().day.st !== 'draft' || S().wallet.gold !== 1) say(`подпись без золота: ждали отказ, получили ${JSON.stringify(r)}`);
  /* исполнение и выдача один раз */
  reset();
  const X = C().day; T.CT_SRV.sign(op(), 'd'); cnt.ops++;
  const pool = T.ctPool(S(), X), w0 = Object.assign({}, S().wallet), items0 = Object.values(S().bag.items).reduce((a, x) => a + x, 0), ch0 = S().bag.chests.length, pts0 = C().pts;
  X.tasks.forEach((x, k) => { if (k) T.CT_SRV.note(x.kind, x.goal); });
  if (X.tasks.length > 1 && X.st !== 'signed') say('контракт исполнен, хотя одно задание не сделано');
  T.CT_SRV.note(X.tasks[0].kind, X.tasks[0].goal);
  if (X.st !== 'done') say('все задания сделаны, а контракт не исполнен');
  const o4 = op(); r = T.CT_SRV.claim(o4, 'd'); cnt.ops++;
  const items1 = Object.values(S().bag.items).reduce((a, x) => a + x, 0);
  if (!r.ok || S().wallet.keys !== w0.keys + pool.keys || S().wallet.gold !== w0.gold + pool.gold || S().wallet.spirit !== w0.spirit + pool.spirit || S().wallet.enerium !== w0.enerium + pool.en) say(`выдача: валюта не сошлась — ${JSON.stringify(r).slice(0, 200)}`);
  if (items1 !== items0 + pool.base + pool.ckeys + pool.uniq) say(`выдача: предметов в запасах +${items1 - items0}, ждали +${pool.base + pool.ckeys + pool.uniq}`);
  if (S().bag.chests.length !== ch0) say('дневной контракт положил сундук');
  if (C().pts !== pts0 + X.pts) say('очки контракта не пришли в рейтинг недели');
  const w1 = JSON.stringify(S().wallet); r = T.CT_SRV.claim(o4, 'd'); if (!r.again || JSON.stringify(S().wallet) !== w1) say('повтор выдачи что-то дал');
  r = T.CT_SRV.claim(op(), 'd'); if (r.refuse !== 'paid' || JSON.stringify(S().wallet) !== w1) say('вторая выдача новым номером что-то дала');
  /* недельный: сундук ×2 за заверение */
  const Wk = C().week; Wk.tasks.forEach(x => T.CT_SRV.note(x.kind, x.goal));
  if (Wk.st !== 'done') say('недельный не исполнен после всех заданий');
  const pw = T.ctPool(S(), Wk), chw = S().bag.chests.length; r = T.CT_SRV.claim(op(), 'w'); cnt.ops++;
  if (!r.ok || S().bag.chests.length !== chw + (pw.chest ? pw.chest.n : 0) || (pw.chest && pw.chest.n !== T.CT.rules.cert.mul)) say('недельный заверенный: сундуков не ×2');
  /* срыв к сроку: ставка сгорела, наград нет */
  reset(); S().mem.slots[0].p = T.CT.rules.cert.both; T.CT_SRV.cert(op(), 'd', true); const g1 = S().wallet.gold; T.CT_SRV.sign(op(), 'd'); cnt.ops++;
  const lost = g1 - S().wallet.gold; C().day.left = 0; T.CT_SRV.expire();
  if (C().day.st !== 'failed') say('срок вышел, а контракт не сорван');
  T.CT_SRV.note(C().day.tasks[0].kind, 1e9); if (C().day.tasks[0].p) say('сорванный контракт получил прогресс');
  r = T.CT_SRV.claim(op(), 'd'); if (r.refuse !== 'notDone' || S().wallet.gold !== g1 - lost) say('сорванный контракт выдал награду или вернул ставку');
  /* прогресс только с подписи */
  reset(); T.CT_SRV.note(C().day.tasks[0].kind, 5); if (C().day.tasks[0].p) say('задание черновика получило прогресс до подписи');
  /* пустой контракт: исполнен сразу, без наград */
  reset(); while (C().day.tasks.length) T.CT_SRV.drop(op(), 'd', 0);
  r = T.CT_SRV.sign(op(), 'd'); if (!r.ok || C().day.st !== 'done') say('пустой контракт не подписался');
  const w2 = JSON.stringify(S().wallet); r = T.CT_SRV.claim(op(), 'd'); if (!r.ok || JSON.stringify(S().wallet) !== w2 || C().pts !== T.CT_DEMO.pts) say('пустой контракт что-то дал');
  /* новый день: новый пул, замены заново */
  reset(); const d0 = JSON.stringify(C().day.tasks); T.CT_SRV.next('d'); if (JSON.stringify(C().day.tasks) === d0 || C().rer.free !== T.ctFreeRer()) say('новый день: пул тот же или замены не обновились');
  /* условие игрока «в клане» (§18.2: вид выдаётся, только если его можно выполнить): S.clan есть и без клана — смотрим S.clan.in.
     Те же 60 дней на том же сиде: без клана задания клана нет ни разу, в клане оно выпадает */
  const clanDays = inClan => {
    reset(); if (!S().clan) return -1;
    S().clan.in = inClan; let n = 0;
    for (let d = 0; d < 60; d++) { T.CT_SRV.next('d'); n += C().day.tasks.filter(x => x.kind === 'clan').length; }
    return n;
  };
  const outN = clanDays(false), inN = clanDays(true);
  if (outN < 0) say('условие «в клане»: нет S.clan — screens/clan.js не подключён');
  else {
    if (outN) say(`условие «в клане»: без клана задание «Атаковать врагов клана» выдано ${outN} раз`);
    if (!inN) say('условие «в клане»: в клане задание «Атаковать врагов клана» не выпало ни разу за 60 дней');
  }
  /* условие «Лига открыта» — то же правило, что на экране Лиги: 15 разных героев из данных Арены (EN_ARENA.league), а не свой порог.
     Коллекция из пятерых — заданий Лиги нет; докупили героев до порога — задания Лиги выпадают */
  const L = vm.runInContext('window.EN_ARENA && EN_ARENA.league', P.ctx);
  /* до порога — купить героев состава (пробуждённые копии героев прототипа не в счёт: коллекция считает разных героев) */
  const leagueDays = full => {
    reset(); S().acc.cycle = Math.max(S().acc.cycle, L.from);
    if (!full) S().rs.owned = {};   // коллекция из пятерых отряда: у демо (11-й день цикла II, ADR-0031, п. 17) героев уже 16
    const pool = () => vm.runInContext('SQ.pool().length', P.ctx);
    if (full) for (const h of vm.runInContext('RS.heroes.filter(h => !rsOld(h))', P.ctx)) { if (pool() >= L.heroes) break; if (!S().rs.owned[h.id]) S().rs.owned[h.id] = { lvl: 0, lim: 0, valor: 0, how: 'gold' }; }
    if ((pool() >= L.heroes) !== full) return -1;
    let n = 0; for (let d = 0; d < 60; d++) { T.CT_SRV.next('d'); n += C().day.tasks.filter(x => x.kind === 'league').length; }
    return n;
  };
  if (!L || !L.heroes) say('условие «Лига открыта»: нет правила EN_ARENA.league');
  else {
    const below = leagueDays(false), above = leagueDays(true);
    if (below < 0 || above < 0) say(`условие «Лига открыта»: не удалось собрать коллекцию ${below < 0 ? 'меньше' : 'из'} ${L.heroes} героев`);
    else {
      if (below) say(`условие «Лига открыта»: без ${L.heroes} героев задание Лиги выдано ${below} раз`);
      if (!above) say(`условие «Лига открыта»: с ${L.heroes} героями задание Лиги не выпало ни разу за 60 дней`);
    }
  }
  reset();
}

/* ================== 5. наблюдатель ================== */
{
  reset();
  const X = C().day, force = (kind, r) => { const v = T.CT.vol.d[2][kind]; const rr = v.findIndex(Boolean) + 1; X.tasks = [{ kind, r: rr, goal: v[rr - 1], p: 0, pts: T.CT.rules.points[rr - 1], slot: 0, n: 0 }]; };
  force('gold'); T.ctObserve();
  S().wallet.gold -= 500; T.ctObserve(); if (X.tasks[0].p) say('наблюдатель: трата до подписи пошла в счёт');
  T.CT_SRV.sign(op(), 'd');
  S().wallet.gold -= 700; T.ctObserve(); if (X.tasks[0].p !== 700) say(`наблюдатель: трата золота после подписи — прогресс ${X.tasks[0].p} вместо 700`);
  reset(); const Y = C().day; Y.tasks = [{ kind: 'spirit', r: 1, goal: 10, p: 0, pts: 10, slot: 0, n: 0 }, { kind: 'echoAtk', r: 1, goal: 3, p: 0, pts: 10, slot: 1, n: 0 }];
  T.CT_SRV.sign(op(), 'd'); T.ctObserve();
  S().wallet.spirit -= 4; if (S().ech) S().ech.last = { kill: true }; T.ctObserve();
  if (Y.tasks[0].p !== 4) say(`наблюдатель: дух — ${Y.tasks[0].p} вместо 4`);
  if (S().ech && Y.tasks[1].p !== 1) say(`наблюдатель: атака Эхо — ${Y.tasks[1].p} вместо 1`);
  /* ритуал: забрали награду — завершён */
  reset(); const Z = C().day; Z.tasks = [{ kind: 'ritual', r: 1, goal: 2, p: 0, pts: 10, slot: 0, n: 0 }]; T.CT_SRV.sign(op(), 'd');
  const i = S().rituals.slots.findIndex(s => s.st === 'ready');
  if (i >= 0) { run('ритуал', () => T.ACT.rclaim(String(i))); if (Z.tasks[0].p !== 1) say('наблюдатель: забранный ритуал не засчитан'); }
  /* ставка — не трата */
  reset(); S().mem.slots[0].p = T.CT.rules.cert.both; const V = C().day; force.call(null, 'gold'); V.tasks = C().day.tasks;
  T.CT_SRV.cert(op(), 'd', true); T.CT_SRV.sign(op(), 'd'); T.ctObserve();
  if (V.tasks[0].p) say('наблюдатель: ставка заверения засчитана как трата золота');
}

/* ================== 6. вид ================== */
/* раскладка — слово автора 29.09.2026: «контракты списком слева и информацией справа были лучшим решением». Слева — шапка статуса
   и задания строками, справа — сведения: награда, заверение и главное действие */
function layout(h, where) {
  if (!T.ctOpen() || /class="[^"]*ct-lock/.test(h)) return;
  const X = T.S.contracts[T.S.seg.contracts === 'week' ? 'week' : 'day'], t = X.t;
  const iL = h.indexOf('<div class="ct-l">'), iS = h.indexOf('<div class="pnl ct-side">');
  if (!h.includes('<div class="ct">') || iL < 0 || iS < 0 || iS < iL) { say(`${where}: не «задания слева, сведения справа»`); return; }
  const left = h.slice(iL, iS), side = h.slice(iS);
  if (!left.includes('class="ct-head"')) say(`${where}: над списком нет шапки статуса`);
  const rows = (left.match(/<div class="ct-card[ "]/g) || []).length;
  if (rows !== X.tasks.length) say(`${where}: строк заданий слева ${rows}, заданий ${X.tasks.length}`);
  if (/<div class="ct-card[ "]/.test(side)) say(`${where}: задания — справа`);
  if (!side.includes(`data-v="cpool:${t}"`)) say(`${where}: справа нет награды`);
  if (X.st === 'draft' && (!side.includes('data-a="ctsign"') || !side.includes(`data-v="ccert:${t}"`))) say(`${where}: справа нет заверения и «Подписать»`);
  if (X.st === 'done' && !side.includes('data-a="ctclaim"')) say(`${where}: справа нет «Получить награду»`);
  if (/class="ct-grid|class="pnl ct-foot/.test(h)) say(`${where}: осталась сетка карточек или низ экрана`);
  cnt.layouts = (cnt.layouts || 0) + 1;
}
const both = f => { for (const team of [false, true]) { reset(); run('режим', () => T.setTeam(team)); f(team ? ' [команда]' : ''); } run('режим', () => T.setTeam(false)); };
both(tag => {
  const draw = (where, prep) => { if (prep) run(where, prep); T.S.route = 'contracts'; const h = view(P, where + tag); if (!tag) { airCards(h, where); if (!T.S.overlay) layout(h, where); } return h; };
  for (const seg of ['day', 'week']) {
    reset(); T.S.seg.contracts = seg; const key = seg, t = seg === 'week' ? 'w' : 'd';
    draw(`${seg} · старт`);
    const X = () => T.S.contracts[key];
    if (X().st === 'draft') {
      for (let i = 0; i < X().tasks.length; i++) { T.S.overlay = { t: 'ctask', arg: `${t}:${i}` }; draw(`${seg} · лист задания ${i}`); }
      for (const o of ['cpool', 'ccert', 'codds']) { T.S.overlay = { t: o, arg: t }; draw(`${seg} · лист ${o}`); }
      T.S.overlay = null; T.S.contracts.rer.free = 0; draw(`${seg} · платная замена`);
      run('подпись', () => T.ACT.ctsign(`${op()}:${t}`)); draw(`${seg} · подтверждение подписи`);
      run('подпись', () => T.ACT.ctsigndo(T.S.overlay.v)); T.S.overlay = null;
    }
    draw(`${seg} · подписан`);
    for (let i = 0; i < X().tasks.length; i++) { T.S.overlay = { t: 'ctask', arg: `${t}:${i}` }; draw(`${seg} · подписан · лист задания ${i}`); }
    T.S.overlay = { t: 'cpool', arg: t }; draw(`${seg} · подписан · награда`); T.S.overlay = null;
    X().tasks.forEach(x => T.CT_SRV.note(x.kind, x.goal)); draw(`${seg} · исполнен`);
    run('выдача', () => T.ACT.ctclaim(`${op()}:${t}`)); draw(`${seg} · итог выдачи`); T.S.overlay = null; draw(`${seg} · награда получена`);
    reset(); T.S.seg.contracts = seg;
    if (X().st === 'draft') T.CT_SRV.sign(op(), t);
    X().left = 0; T.CT_SRV.expire(); draw(`${seg} · сорван`);
    reset(); T.S.seg.contracts = seg; if (X().st !== 'draft') run('новый период', () => T.CT_SRV.next(t));
    X().left = 0; draw(`${seg} · срок вышел без подписи`);
    reset(); T.S.seg.contracts = seg; if (X().st !== 'draft') run('новый период', () => T.CT_SRV.next(t));
    while (X().tasks.length) T.CT_SRV.drop(op(), t, 0); draw(`${seg} · пустой`);
  }
  reset(); T.S.acc.level = 5; draw('закрыт до 10-го уровня'); reset();
  for (const c of T.CT.rules.cycles) { reset(); T.S.acc.cycle = c; T.CT_SRV.next('d'); T.CT_SRV.next('w'); T.S.seg.contracts = 'day'; draw(`цикл ${c} · день`); T.S.seg.contracts = 'week'; draw(`цикл ${c} · неделя`); }
  for (const [n, , f] of T.FLOWS.filter(x => /Контракт/.test(x[0]))) { reset(); run('сценарий ' + n, () => f()); draw(`сценарий «${n}»`); }
  reset(); const k = run('UI-кит', () => T.ctKitHtml()); scan(P, k || '', 'UI-кит · контракты' + tag);
});
if (T.FLOWS.filter(x => /Контракт/.test(x[0])).length < 3) say('сценарии презентации: контрактов меньше трёх');
if (!T.KIT_EXTRA.some(x => x.html === T.ctKitHtml)) say('UI-кит: раздел контрактов не зарегистрирован в KIT_EXTRA');
{
  reset(); run('режим', () => T.setTeam(true)); T.S.route = 'contracts'; run('команда', () => T.render());
  if (!/team-only/.test(P.game())) say('режим «Команда»: на экране контрактов нет служебного');
  run('режим', () => T.setTeam(false));
}

/* ================== 7. неделя ================== */
{
  reset();
  const M = T.WEEK_MODES.filter(m => m && m.id === 'contract' && !m.demo);
  if (!M.length) say('WEEK_MODES: нет настоящей строки «Контракты»');
  else {
    const m = M[M.length - 1], now = run('WEEK_MODES now', () => m.now()), past = run('WEEK_MODES past', () => m.past());
    const cyc = Math.max(2, T.S.acc.cycle), P2 = T.CT.planks[cyc];
    /* личные планки — ступени лестницы на все циклы: пороги своей полосы — данные цикла, дальше — множителем первой планки */
    if (!now || now.points !== T.S.contracts.pts || !now.planks || JSON.stringify(now.planks.filter(p => p.band === cyc && !p.cap).map(p => p.need)) !== JSON.stringify(P2)) say('WEEK_MODES: очки или пороги планок своей полосы — не из контрактов');
    else if (JSON.stringify(now.planks.map(p => p.need)) !== JSON.stringify(LL.needs(LB, 'contract', cyc, P2[0]))) say('WEEK_MODES: пороги лестницы — не первая планка цикла × множитель ступени');
    if (!past || !Array.isArray(past.cur) || !past.cur.length) say('WEEK_MODES: у прошлой недели нет валюты недельного контракта');
    for (let i = 1; i < P2.length; i++) if (P2[i] < P2[i - 1] * 2) say('пороги планок ближе ×2');
    /* прошлая неделя сходится с «Дарами»: место — за которое платят, очки — в пределах оплаченных планок */
    const dar = run('Дары', () => vm.runInContext(`typeof darRows === 'function' ? darRows(S).filter(p => p.id === 'contract' && p.wk && p.wk.id === 'prev') : []`, P.ctx)) || [];
    if (past && dar.length) {
      const pr = dar.find(p => p.kind === 'place' && p.place), k = dar.filter(p => p.kind === 'plank').length;
      if (pr && past.place !== pr.place) say(`WEEK_MODES: место прошлой недели ${past.place}, а «Дары» платят за место ${pr.place}`);
      const got = LL.needs(LB, 'contract', cyc, P2[0]).filter(x => past.points >= x).length;
      if (got !== k) say(`WEEK_MODES: очки прошлой недели ${past.points} берут планок ${got}, а «Дары» платят за ${k}`);
    }
  }
}

/* ================== 8. лестница планок ================== */
const WK = vm.runInContext('window.EN_WEEK', P.ctx), ENL = vm.runInContext('window.EnLoot', P.ctx), LBX = vm.runInContext('window.EN_LOOTBOXES', P.ctx);
const X = vm.runInContext(`({ ctPlanks, ctClan, fmt, lbRowLabel: typeof lbRowLabel === 'function' ? lbRowLabel : null, darRows: typeof darRows === 'function' ? darRows : null })`, P.ctx);
const LAD0 = ENL && ENL.ladder, ROAD_END = ['<p class="reason">', 'class="sheet-f"'];   // чем кончается лестница в листе планок
const ovOf = h => { const i = h.indexOf('<div class="ov'); return i < 0 ? '' : h.slice(i); };
const rewSheet = (tab, where) => { T.S.route = 'contracts'; T.S.overlay = { t: 'ctrew', arg: tab }; return ovOf(view(P, where)); };
/* Л1–Л4 по строке «Контракты» реестра Недели и листу «Планки контрактов» во всех циклах: список нарушений */
function ctLadder() {
  const e = [];
  if (typeof LAD0 !== 'function' || !WK || typeof WK.ladderHtml !== 'function') { e.push('нет EnLoot.ladder или помощника лестницы EN_WEEK — планки контрактов не сверить'); return e; }
  for (const c of T.CT.rules.cycles) {
    reset(); T.S.acc.cycle = c;
    const key = `лестница · цикл ${LL.ROMAN[c]}`, st = WK.state('contract', 'now');
    if (!st || st.lock || st.m.demo) { e.push(`${key}: строка «Контракты» закрыта или демо`); continue; }
    cnt.ladders++;
    LL.stateLaw(LBX, key, st, c, LAD0).forEach(x => e.push(x));
    if (st.planks.filter(p => p.band === c && !p.cap).map(p => p.need).join() !== T.CT.planks[c].join()) e.push(`${key}: пороги своей полосы — не EN_CONTRACTS.planks`);
    if (JSON.stringify(X.ctPlanks(T.S.contracts.pts).map(p => [p.k, p.band, p.need, p.reached])) !== JSON.stringify(st.planks.map(p => [p.k, p.band, p.need, p.reached]))) e.push(`${key}: планки экрана и строки «Недели» разошлись`);
    const h = rewSheet('me', key + ' · лист');
    LL.roadLaw(LBX, key + ' · лист', h, st, c, ROAD_END).forEach(x => e.push(x));
    if (!h.includes('data-v="gifts:me"') || !h.includes('data-v="rank:Контракты"')) e.push(`${key}: из листа планок нет пути в «Дары» или «Рейтинг»`);
  }
  return e;
}
/* за верхней планкой своей полосы — планки следующей, без перехода (Л3, Л4): очков — ровно порог первой планки следующей полосы по
   эталону. В листе следующая полоса раскрыта, «Дары» платят сундуки её полосы под подписью с её циклом.
   ctBeyond() — список нарушений: его же зовёт проверка мутацией */
function ctBeyond() {
  const e = [];
  for (const c of T.CT.rules.cycles) {
    reset(); T.S.acc.cycle = c;
    const key = `за верхней планкой · цикл ${LL.ROMAN[c]}`, ref = LL.ref(LBX, 'contract', c), n = LL.ownCount(LBX, 'contract', c), own = ref[0].band;
    if (ref.length <= n + 1) continue;   // полоса последняя — продолжения нет
    const need = T.CT.planks[c][0] * ref[n].x / ref[0].x;
    T.S.contracts.pts = need;
    const st = WK.state('contract', 'now'), p = st.planks[n];
    LL.stateLaw(LBX, key, st, c, LAD0).forEach(x => e.push(x));
    if (!p || !p.reached || p.band !== own + 1 || p.need !== need) { e.push(`${key}: Л3 — набрано ${need}, а первая планка следующей полосы не взята: ${p ? `порог ${p.need}, полоса ${p.band}` : 'её нет в лестнице'}`); continue; }
    if (!st.next || st.next.k !== n + 2) e.push(`${key}: Л3 — ближайшая планка — не вторая следующей полосы`);
    const h = rewSheet('me', key + ' · лист');
    LL.roadLaw(LBX, key + ' · лист', h, st, c, ROAD_END).forEach(x => e.push(x));
    if (!h.includes(`<div class="wk-ld-band" data-band="${own + 1}">`)) e.push(`${key}: Л4 — полоса, по которой игрок идёт, не раскрыта`);
    if (X.darRows && X.lbRowLabel) {
      const lab = LL.label(LBX, 'contract', p, c, X.lbRowLabel), row = X.darRows(T.S).find(x => x.wk.id === 'now' && x.id === 'contract' && x.label === lab);
      if (!row || !LL.same(row.groups, ref[n].pay) || !lab.includes(`цикл ${LL.ROMAN[own + 1]}`)) e.push(`${key}: в «Дарах» нет строки «${lab}» с сундуками её полосы — ${row ? JSON.stringify(row.groups) : 'строки нет'}`);
    }
  }
  return e;
}
if (!err.length) {
  ctLadder().forEach(say); ctBeyond().forEach(say);
  if (typeof LAD0 === 'function') {
    const MUT = LL.mutations(LAD0);   // замок по циклу вернули; планка следующей полосы платит сундук своей; порог продолжения — не ×next
    let caught = 0;
    for (const [what, f] of MUT) {
      const n0 = err.length;   // что сломанный экран наговорит сам — тоже «поймано», а не ошибка проверки
      ENL.ladder = f;
      let got = [];
      try { got = ctBeyond(); } catch (x) { got = ['исключение ' + x.message]; }
      ENL.ladder = LAD0;
      got = got.concat(err.splice(n0));
      if (got.length) caught++; else say(`мутация «${what}»: законы лестницы её не поймали`);
      if (process.argv.includes('--mut')) console.log(`мутация «${what}»: ${got.length ? got.slice(0, 2).join(' | ').slice(0, 320) : 'НЕ ПОЙМАНА'}`);
    }
    cnt.mut = `${caught} из ${MUT.length}`;
    ctBeyond().forEach(x => say('после мутаций: ' + x));
  }
}

/* ================== 9. клановые ступени на экране ================== */
{
  reset();
  const c = T.S.acc.cycle, CL = T.CT.clan, lc = LBX.modes.contract.layers.find(l => l.kind === 'plank' && l.clan);
  const K = run('ctClan', () => X.ctClan());
  if (!K) say('клановые ступени: у демо-аккаунта в клане нет счёта клана (ctClan)');
  else {
    /* очки клана — мои очки недели и очки участников, вступивших до этой недели: у других циклов — в пересчёте по первым личным планкам;
       очки участника демо — по его вкладу в резервуар (в резервуар идёт доля splitBp) */
    const mem = T.S.clan.members.filter(m => !m.me && m.weeks !== 0), fromRes = r => r > 0 ? Math.floor(r * T.CT.rules.bp / (T.CT.rules.bp - T.CT.rules.splitBp)) : 0;
    const want = T.S.contracts.pts + mem.reduce((a, m) => a + T.CTE.clanPts(T.CT, fromRes(m.resRaw), m.cyc, c), 0);
    if (K.n !== mem.length + 1 || K.pts !== want || K.mine !== T.S.contracts.pts) say(`клановые ступени: в счёте ${K.n} участников и ${K.pts} очков, ждали ${mem.length + 1} и ${want}`);
    if (!T.S.clan.members.some(m => !m.me && m.weeks === 0 && m.resRaw > 0)) note.push('клановые ступени: в клане демо нет вступившего на этой неделе с очками — правило «со следующей недели» не проверено');
    if (!mem.some(m => m.cyc !== c)) note.push('клановые ступени: в клане демо нет участника другого цикла — пересчёт очков не проверен');
    if (JSON.stringify(K.needs) !== JSON.stringify(T.CTE.clanPlanks(T.CT, K.n, c)) || JSON.stringify(K.needs) !== JSON.stringify(CL.x.map(x => K.n * Math.floor(T.CT.planks[c][0] * x / CL.per)))) say(`клановые ступени: пороги ${K.needs} — не участников × ⌊первая личная планка × доля⌋`);
    if (K.rows.length !== lc.rows.length || K.rows.some((r, i) => r.k !== i + 1 || r.need !== K.needs[i] || r.reached !== (K.pts >= K.needs[i]) || !LL.same(r.pay, lc.rows[i].cyc[c]))) say('клановые ступени: строки — не пороги клана с сундуками слоя клановых планок своего цикла');
    /* Неделя получает клановые ступени, «Дары» держат взятую ждущей распределения */
    const st = WK.state('contract', 'now');
    if (JSON.stringify(st.clanPlanks.map(p => [p.k, p.need, p.reached])) !== JSON.stringify(K.rows.map(r => [r.k, r.need, r.reached])) || st.clanHave !== K.pts) say('клановые ступени: Неделя получила не те ступени или не те очки клана (clanPlanks, clanHave)');
    if (X.darRows) {
      const dar = X.darRows(T.S).filter(p => p.wk.id === 'now' && p.id === 'contract' && p.cat === 'clan'), took = K.rows.filter(r => r.reached);
      if (dar.length !== took.length || dar.some(p => p.st !== 'wait') || took.some((r, i) => !LL.same(dar[i] && dar[i].groups, r.pay))) say(`клановые ступени: взято ${took.length}, в клановых наградах «Даров» — ${dar.length}; до распределения — только «ждёт», сундуки — ступени`);
    }
    /* лист: вкладка «Клан» — очки клана и вклад, три ступени, сундуки каждому; из листа — в «Дары» клана */
    for (const team of [false, true]) {
      run('режим', () => T.setTeam(team));
      const h = rewSheet('clan', 'лист планок · клан' + (team ? ' [команда]' : ''));
      const blk = (h.split('<div class="wk-ld clan"')[1] || '').split('class="sheet-f"')[0];
      if ((blk.match(/class="wk-ld-st/g) || []).length !== K.rows.length || (blk.match(/· каждому/g) || []).length !== K.rows.length) say('лист планок · клан: не три ступени с сундуками каждому');
      K.rows.forEach(r => { if (!blk.includes(`data-need="${r.need}"`)) say(`лист планок · клан: нет порога ${r.need}`); });
      if (!h.includes(`<b class="num">${X.fmt(K.pts)}</b>`) || !h.includes(`<b class="num">${X.fmt(K.mine)}</b>`) || !h.includes('data-v="gifts:clan"')) say('лист планок · клан: нет очков клана, своего вклада или пути в «Дары» клана');
      if (!h.includes('aria-selected="true" data-a="sheet" data-v="ctrew:clan"')) say('лист планок · клан: вкладка «Клан» не выбрана');
      if (team && !/team-only/.test(h)) say('лист планок · клан [команда]: нет служебного');
      rewSheet('me', 'лист планок · личные' + (team ? ' [команда]' : ''));
    }
    run('режим', () => T.setTeam(false));
    /* клан взял больше — ступень взята; вне клана — пустое состояние и «Найти клан» */
    reset(); T.S.contracts.pts = K.needs[1];
    const K2 = X.ctClan(); if (!K2 || K2.rows.filter(r => r.reached).length < 2) say('клановые ступени: очки клана выросли до второй ступени, а она не взята');
    reset(); T.S.clan = Object.assign({}, T.S.clan, { in: false });
    if (X.ctClan()) say('клановые ступени: вне клана у игрока есть счёт клана');
    const h0 = rewSheet('clan', 'лист планок · без клана');
    if (!h0.includes('Вы не в клане') || !h0.includes('data-a="go" data-v="clan"')) say('лист планок · без клана: нет пустого состояния и «Найти клан»');
    if (WK.state('contract', 'now').clanPlanks.length) say('клановые ступени: вне клана Неделя получила клановые ступени');
  }
  /* вход к планкам — кнопка очков рейтинга справа: во всех состояниях контракта, оба сегмента */
  for (const seg of ['day', 'week']) for (const st of ['draft', 'signed', 'done', 'paid', 'failed', 'closed']) {
    reset(); T.S.seg.contracts = seg; T.S.route = 'contracts'; T.S.overlay = null;
    const Xc = T.S.contracts[seg]; Xc.st = st; Xc.signed = st !== 'draft';
    if (st === 'paid') Xc.got = { P: T.ctPool(T.S, Xc) || { keys: 0, gold: 0, spirit: 0, base: 0, ckeys: 0, uniq: 0, en: 0, chest: null }, items: {}, chests: [], pts: Xc.pts || 0, half: 0 };
    const h = view(P, `вход к планкам · ${seg} · ${st}`), side = h.slice(h.indexOf('<div class="pnl ct-side">'));
    if (!/<button class="ct-ptsb" data-a="sheet" data-v="ctrew:me"/.test(side)) say(`вход к планкам: в состоянии «${st}» (${seg}) справа нет кнопки очков рейтинга с листом планок`);
  }
  for (const n of ['Контракты · планки недели']) { const fl = T.FLOWS.find(x => x[0] === n); if (!fl) say(`нет сценария «${n}»`); else { reset(); run('сценарий ' + n, () => fl[2]()); const h = view(P, `сценарий «${n}»`); if (!h.includes('class="wk-ld clan"')) say(`сценарий «${n}»: не лист клановых ступеней`); } }
  reset();
}
done();
