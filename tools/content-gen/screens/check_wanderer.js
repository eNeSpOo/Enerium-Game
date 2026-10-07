/* Автопроверка экрана «Странник» (design/ui/screens/wanderer.js) и его данных (design/ui/wanderer.js) — без браузера.
   1. index.html подключает wanderer.css, данные wanderer.js и экран после model.js; файлы компилируются.
   2. Данные: 146 пассивок Памяти, семь редкостей, вес — по «Настройкам» автора (база редкости × множитель силы), доли редкостей дают
      10 000 б. п.; цены §0 — переброс 50, сброс 100; места — циклы II–VI; «+1 активный биом» — ровно одна пассивка, это № mem.slot (ADR-0014);
      рунный ключ с элит нигде не обещан (ADR-0023, вариант Б); 18 артефактов, уровней не больше циклов, души на все уровни — по правилу автора;
      с «Печатью открытых троп» и пассивкой — семь забегов; вехи начала пути — около 50 / 22 / 22 и первенства по циклам; все числа целые.
   2б. Достижения: входы темпа pace-inputs.json свежие — tools/content-gen/wanderer/pace_inputs.py --check (sets.py, economy.py);
      wanderer.js и таблицы docs/content/достижения.md свежие — сборщик tools/content-gen/wanderer/build.js без ошибок даёт
      ровно их; у каждого — редкость 1–7, день обычного и увлечённого в прогоне (у каждого свой календарь, прогон — до конца цикла VI)
      или за горизонтом, тема, счётчик и пассивка; серии — ступени по порядку, цель растёт, ступень не раньше прошлой; подсказка тайны —
      без имени и чисел; контракты читают те же достижения с бесплатными заменами.
   2в. Законы каталога (tools/content-gen/wanderer/achievements-pace.js, laws) и их мутации: у каждого цикла III–VI свой блок «Серии
      цикла N» с таинственными; сколько достижений обычный берёт за цикл — не меньше нормы; в цикле I и каждый день цикла II — достижение
      у обоих профилей, дальше пауза у обычного не длиннее порога цикла; сумма вида пассивок не выше потолка вех и потолка блока; пассивки
      не боевые и не рейтинговые; цикл VI — только для команды; в блоках, которые видит игрок, нет слов лестницы спойлеров; счётчик блока —
      своего цикла; условий за Энериум нет. Каждую мутацию ловит свой закон.
   3. «Сервер» Памяти: wnRoll — чистая функция; независимый пересчёт тем же генератором (mulberry32, FNV-1a) — те же тройки, ровно шесть
      бросков на тройку; в тройке нет повторов, закреплённых и прошлой тройки; на 40 000 вариантов доли редкостей и весов сходятся с данными;
      сумма шансов каталога — 100 %.
   4. Операции: места по циклам; тройку решает сервер при первом открытии и не меняет при повторном; первый переброс бесплатный, платный —
      только после подтверждения цены, списывается один раз; повтор номера операции ничего не меняет; устаревшее окно не закрепит вариант;
      нехватка Энериума — отказ без расхода; «Вспомнить» закрепляет место, Убежище видит его закреплённым; полный сброс — 100 Энериума,
      раз в неделю, бесплатные перебросы не возвращаются, тройку незакреплённого места сброс не меняет.
   4б. «Право владыки» (onlyFree) — только в бесплатных тройках: в тройках за Энериум (платный переброс, после сброса) его нет ни на одном
      из 60 000 сидов и ни в одной из сотен троек пути «сервера»; в бесплатных — с долей данных; бесплатных троек у места не больше двух;
      игроку — строка в каталоге, в листе пассивки и в подтверждении платного переброса.
   5. Анимация: тройка решена до анимации; карты собираются из осколков по расписанию wnPlan: осколков, кружения и замедления —
      по лестнице редкостей, миг замедления и лучи — с древней, дрожь и свет на окно — с первородной; сколы дают весь значок без щелей;
      сплавление — у каждой карты в свой миг, частицы её редкости, чем реже — тем богаче; до сплавления карту не выбрать; перерисовка
      посреди анимации не сбрасывает её; живые состояния — выбор, притушенные, подъём выбранной. Переброс: сервер отдал новую тройку
      сразу, прежние осколки бьются стеклом, затем собираются новые. «Вспомнить»: закреплено сразу; невыбранные бьются, выбранный
      осколок летит, окно закрывается в пути, место ждёт его пустым и принимает вспышкой; повтор ничего не меняет; закрыли окно раньше —
      осколок всё равно долетает. «Пропустить анимацию», prefers-reduced-motion и закрытие окна — тройка сразу, без боя стекла и полёта;
      без localStorage всё работает.
   5б. Значки-осколки: пути memory/shard-r1…r7.png и shard-empty.png; до выгрузки — ни одной ссылки на картинку, прежний кристалл;
      после — через AV() с версией выгрузки, закреплённое место — своя редкость, открытое и закрытое — пустое стекло.
   5в. CSS: в кадрах анимаций и переходах — только transform и opacity, без смешения слоёв и фильтров на наведении; есть «меньше движения».
   6. Артефакты: покупка золотом, уровень душами — база × номер уровня, не выше цикла; уровень аккаунта для открытия; повтор и нехватка.
   7. Достижения: сундук по строке режима «Достижения» lootboxes.js на цикл получения, в запасы — один раз; таинственные скрыты до получения;
      первенства — только свои.
   7б. Вкладка «Достижения» с воздухом: разделы «Можно получить» и «Ближайшие» (не больше трёх), остальное — по темам; серия — одна
      карточка; полученное свёрнуто одной строкой и раскрывается; на карточке не больше двух чисел, двух меток и одного действия;
      лист — условие, награда и «когда получают»; тайна до выполнения — без условия.
   7в. Живые счётчики: ритуалы, снаряжение, Арена, Лига и планка События на вкладке — те же числа, что на экранах режимов; полученное
      по демо-дню этими числами подтверждено.
   7г. Блоки циклов на вкладке: свой и прошлые циклы раскрыты, будущие — одной строкой «Цикл N» без имён, условий и подсказок; блок
      цикла VI игроку не рисуется вовсе; закрытое не получить, сундук — по циклу получения; на карточке серии блока не больше двух чисел;
      демо-цикл команды не трогает состояние аккаунта. Мутация «замок блоков снят» поймана.
   8. Вид: вкладки, окно, листы и каталог рисуются в режимах «Игрок» и «Команда» без исключений, undefined и NaN; игроку — без служебных слов.
   9. UI-кит: раздел «Память Странника» — карты всех семи редкостей, сцена «Вспомнить», состояния карты и мест, восемь значков,
      лестница сборки; кнопки раздела проигрывают сборку, переброс и «Вспомнить» без исключений; карта экранов отмечает готовое.
      Раздел «Достижения Странника» — карточка серии во всех состояниях, тайна, строка полученного, первенства, семь редкостей.
   Запуск: node tools/content-gen/screens/check_wanderer.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText, teamCount } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const cnt = { views: 0, player: 0, ops: 0, triples: 0, bursts: 0 };
const MISSING = new Set();
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
function done() {
  if (MISSING.size) console.log(`Пропущены подключённые, но ещё не написанные чужие экраны: ${[...MISSING].join(', ')}.`);
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`«Странник»: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; операций ${cnt.ops}, троек пересчитано ${cnt.triples}, вспышек ${cnt.bursts}; мутаций каталога и блоков достижений ${cnt.mut || 0}, поймано ${cnt.caught || 0}.`);
  console.log('Проверка пройдена: тройку решает «сервер» на сиде до анимации, расход один раз, карты собираются из осколков по лестнице редкостей, переброс бьёт стекло, выбранный осколок долетает до места, движение — transform и opacity, артефакты и достижения по правилам, у циклов III–VI свои блоки достижений и их законы держатся, в режиме «Игрок» служебного и закрытых блоков нет.');
  process.exit(0);
}
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const iD = scripts.findIndex(s => s.src === 'wanderer.js'), iM = scripts.findIndex(s => s.src === 'screens/model.js'), iW = scripts.findIndex(s => s.src === 'screens/wanderer.js');
  const iMain = scripts.findIndex(s => !s.src && /function initialState\(/.test(s.code));
  if (iD < 0) say('index.html: не подключены данные wanderer.js');
  else if (iD > iMain) say('index.html: данные wanderer.js подключены после основного скрипта');
  if (iW < 0) say('index.html: не подключён screens/wanderer.js');
  else if (iW < iM) say('index.html: screens/wanderer.js подключён раньше model.js');
  if (!/<link rel="stylesheet" href="screens\/wanderer\.css">/.test(html)) say('index.html: не подключён screens/wanderer.css');
  for (const f of ['wanderer.js', 'screens/wanderer.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
}
if (err.length) done();

/* ================== 2. данные ================== */
const WD = (() => { const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(read('wanderer.js'), ctx, { filename: 'wanderer.js' }); return ctx.window.EN_WANDERER; })();
{
  if (!WD) { say('wanderer.js: нет window.EN_WANDERER'); done(); }
  const P = WD.passives, M = WD.mem;
  if (P.length !== 146) say(`Память: пассивок ${P.length}, §2.8 — 146`);
  if (new Set(P.map(p => p.id)).size !== P.length) say('Память: id пассивок повторяются');
  if (new Set(P.map(p => p.n)).size !== P.length) say('Память: имена пассивок повторяются');
  for (const p of P) {
    if (!(p.r >= 1 && p.r <= 7)) say(`${p.id}: редкость ${p.r}`);
    if (!(p.pow >= 1 && p.pow <= 5)) say(`${p.id}: сила ${p.pow}`);
    const w = Math.floor((M.weight.base[p.r - 1] * M.weight.powPct[p.pow - 1] + 50) / 100);
    if (p.w !== w) say(`${p.id} «${p.n}»: вес ${p.w}, по «Настройкам» — ${w}`);
    if (!p.fam || !p.cat || !p.d) say(`${p.id}: пустое поле`);
    if (/ключа с элит/.test(p.d)) say(`${p.id} «${p.n}»: рунный ключ с элит — против ADR-0023`);
  }
  for (let r = 1; r <= 7; r++) if (!P.some(p => p.r === r)) say(`Память: нет пассивок редкости ${r}`);
  if (M.rarBp.length !== 7 || M.rarBp.reduce((a, b) => a + b, 0) !== 10000) say('Память: доли редкостей не дают 10 000 б. п.');
  if (!eq(M.rarBp, [4500, 2000, 1500, 1000, 600, 300, 100])) say('Память: доли редкостей не как в §2.6');
  if (M.reroll !== 50 || M.reset !== 100) say(`Память: цены §0 — переброс 50 и сброс 100, в данных ${M.reroll} и ${M.reset}`);
  if (!eq(M.places, [2, 3, 4, 5, 6])) say('Память: места — циклы II–VI (§2.4)');
  if (M.offer !== 3) say('Память: в тройке не три варианта');
  const slots = P.filter(p => /активн\S* биом/.test(p.d));
  if (slots.length !== 1 || slots[0].no !== M.slot) say('Память: «+1 активный биом» — ровно одна пассивка, и это mem.slot (ADR-0014)');
  const A = WD.art.list;
  if (A.length !== 18) say(`артефактов ${A.length}, в таблице автора 18`);
  for (const a of A) {
    if (a.lv < 1 || a.lv > 7 - a.from) say(`${a.id} «${a.n}»: уровней ${a.lv} с цикла ${a.from} — больше, чем циклов`);
    if (a.total !== a.soul * a.lv * (a.lv + 1) / 2) say(`${a.id}: души на все уровни не по правилу «база × номер уровня»`);
    if (/(?:ресурс\S*|ключа) с элит(?!ой)/.test(a.d)) say(`${a.id} «${a.n}»: ресурсы или ключ «с элит» — против ADR-0010, ADR-0023`);
  }
  /* артефакт активных биомов (ADR-0054): слот забега даёт только он — без него 0, покупка в обучении открывает один, уровни — с цикла II */
  const walk = A.find(a => a.id === WD.art.rules.trail);
  if (!walk || walk.base + (walk.own || 0) + walk.step * walk.lv + 1 !== 7) say('«Знак открытых троп» и пассивка Памяти: забегов не семь (ADR-0014)');
  if (walk && (walk.base !== 0 || walk.own !== 1)) say('«Знак открытых троп»: без артефакта активного биома нет, покупка открывает один (ADR-0054)');
  if (walk && (walk.open !== 1 || walk.buyFrom !== 1 || walk.from !== 2)) say('«Знак открытых троп»: покупка — в обучении (уровень Странника 1, цикл I), уровни — с цикла II (ADR-0054)');
  if (A.some(a => a !== walk && (a.own || a.open || a.buyFrom))) say('артефакты: покупка сама даёт значение и продаётся раньше срока только у артефакта активных биомов');
  const keys = A.filter(a => /рунного ключа с босса/.test(a.d)).reduce((s, a) => s + a.step * a.lv, 0);
  if (10 + keys !== 25) say(`рунный ключ с босса: 10 % и артефакты дают ${10 + keys} %, по §11 — 25 %`);
  /* «около 50 / 22 / 22» (§29) — каталог начала пути: вехи без блока цикла; блоки «Серии цикла N» считаются отдельно — раздел 2в */
  const L = WD.ach.list, byCat = c => L.filter(a => a.c == null && a.cat === c).length;
  if (byCat('pers') < 45 || byCat('pers') > 55 || byCat('rev') < 18 || byCat('rev') > 26 || byCat('myst') < 18 || byCat('myst') > 26) say('достижения начала пути: не около 50 / 22 / 22 (§29)');
  for (const a of L) { if (!WD.ach.kinds[a.pk]) say(`${a.id}: вид пассивки «${a.pk}»`); if (a.cat === 'myst' && !a.hint) say(`${a.id}: у таинственного нет подсказки`); }
  /* первенства: виды со своего цикла — в цикле I три (вход в цикл и нашествие Эхо — с цикла II), дальше по пять */
  for (let c = 1; c <= 6; c++) { const n = WD.ach.firsts.filter(f => f.c === c).length; if (n !== (c === 1 ? 3 : 5)) say(`первенства цикла ${c}: ${n}`); }
  if (!WD.fixes.length || WD.fixes.some(f => !f.what || !f.why)) say('правки под систему: пусто или без «почему»');
  const nums = []; (function walkNum(x) { if (typeof x === 'number') nums.push(x); else if (x && typeof x === 'object') Object.values(x).forEach(walkNum); })(WD);
  if (nums.some(x => !Number.isInteger(x))) say('wanderer.js: есть нецелые числа');
}

/* ================== 2б. достижения: свежесть, темп, серии, потолки, кривая ================== */
{
  /* входы темпа из калькуляторов экономики — свежие: pace_inputs.py --check (как capacity.py у контрактов) */
  const py = require('child_process').spawnSync('python', [path.join(__dirname, '..', 'wanderer', 'pace_inputs.py'), '--check'], { encoding: 'utf8', env: Object.assign({}, process.env, { PYTHONIOENCODING: 'utf-8' }) });
  if (py.error) console.log('Python не найден — свежесть pace-inputs.json не проверена.');
  else if (py.status !== 0) say('pace-inputs.json устарел: ' + (py.stdout || py.stderr || '').trim().split('\n').pop());
  const B = require('../wanderer/build.js'), R = B.build();
  if (R.err.length) say('сборщик Странника: ' + R.err.slice(0, 5).join('; '));
  else {
    if (R.js !== read('wanderer.js')) say('wanderer.js устарел: пересобрать — node tools/content-gen/wanderer/build.js');
    if (R.doc == null) say('нет черновика docs/content/достижения.md с метками таблиц');
    else if (R.doc !== fs.readFileSync(B.FILES.doc, 'utf8')) say('docs/content/достижения.md: таблицы устарели — пересобрать');
  }
  const A = WD.ach, P = A.pace, byS = {};
  if (!P || P.start.length !== 7 || P.start.some((d, c) => c > 1 && d <= P.start[c - 1])) say('темп: первые дни циклов не по порядку');
  if (!P || !Array.isArray(P.startE) || P.startE.length !== 7 || !(P.horizon > P.start[6]) || !(P.horizonE > P.startE[6])) say('темп: нет календаря увлечённого или прогон не доходит до конца цикла VI');
  for (const a of A.list) {
    if (!(a.r >= 1 && a.r <= 7)) say(`${a.id}: редкость ${a.r}`);
    for (const [x, H] of [[a.at.o, P.horizon], [a.at.e, P.horizonE]]) if (x != null && (!Number.isInteger(x) || x < 0 || x > H)) say(`${a.id}: день получения вне прогона`);
    if (a.cat !== 'myst' && !A.metrics[a.m]) say(`${a.id}: счётчик «${a.m}» не описан`);
    if (!A.groups[a.g]) say(`${a.id}: тема «${a.g}»`);
    if (!Number.isInteger(a.v) || a.v < 1) say(`${a.id}: величина пассивки`);
    (byS[a.s] = byS[a.s] || []).push(a);
  }
  for (const [s, l] of Object.entries(byS)) {
    l.sort((x, y) => x.k - y.k);
    l.forEach((a, i) => {
      if (a.k !== i + 1 || a.ks !== l.length) say(`серия ${s}: ступени не по порядку`);
      if (i && (a.goal <= l[i - 1].goal || a.m !== l[i - 1].m)) say(`серия ${s}: цель не растёт или счётчик другой`);
      if (i && a.at.o != null && (l[i - 1].at.o == null || a.at.o < l[i - 1].at.o)) say(`серия ${s}: ступень ${a.k} у обычного раньше прошлой`);
    });
  }
  for (const a of A.list.filter(x => x.cat === 'myst')) if (!a.hint || a.hint.toLowerCase().includes(a.n.toLowerCase()) || /\d/.test(a.hint)) say(`${a.id}: подсказка выдаёт имя или число`);
  const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('contracts.js'), ctx);
  const want = A.list.filter(a => a.pk === 'reroll').map(a => ({ id: a.id, n: a.n, v: a.v }));
  if (!ctx.EN_CONTRACTS || JSON.stringify(ctx.EN_CONTRACTS.rules.rer.ach) !== JSON.stringify(want)) say('contracts.js: достижения с бесплатными заменами не совпадают с каталогом');
  for (const [m, v] of Object.entries(A.demo.n)) if (!Number.isInteger(v) || v < 0) say(`демо-счётчик ${m}: ${v}`);
  for (let c = 1; c <= 6; c++) { const D = (A.demoBy || {})[c];
    if (!D || !Number.isInteger(D.day) || Object.values(D.n).some(v => !Number.isInteger(v) || v < 0)) say(`демо-цикл ${c}: нет дня или счётчиков обычного`); }
}

/* ================== 2в. законы каталога и мутации ==================
   Законы — tools/content-gen/wanderer/achievements-pace.js, laws: считаются по собранным данным экрана, их же держит сборщик.
   Б1 — у каждого цикла III–VI свой блок с сериями и таинственными; Б2 — сколько достижений обычный берёт за цикл; Б3 — кривая: каждый день
   циклов I–II и пауза не длиннее порога цикла; Б4 — потолки видов у вех и на блок; Б5 — пассивки не боевые и не рейтинговые; Б6 — цикл VI —
   только для команды; Б7 — в блоках, которые видит игрок, нет слов лестницы спойлеров; Б8 — счётчик блока — своего цикла; Б9 — условий,
   которые покупает Энериум, нет. Мутация ломает данные — её обязан поймать названный закон; после мутаций законы снова чисты. */
{
  const AP = require('../wanderer/achievements-pace.js'), LAD = require('../lore/ladder.js');
  const spoil = t => LAD.scan(t).map(h => h.hit);
  const run = D => AP.laws(D, spoil).err;
  for (const e of run(WD.ach)) say(`закон ${e.k}: ${e.m}`);
  const B = WD.ach.blocks, own = c => x => x.c === c;
  if (!B || !eq(B.cycles, [3, 4, 5, 6]) || !eq(B.team, [6])) say('блоки циклов: не III–VI или цикл для команды — не VI');
  /* блок считает только своё: счётчик достижения блока — своего цикла; гибкие ступени серии идут по дням и по целям */
  for (const a of WD.ach.list) if (a.c != null && a.cat !== 'myst' && (WD.ach.metrics[a.m] || {}).c !== a.c) say(`${a.id}: счётчик блока не своего цикла`);
  const pickBlk = (c, f = () => true) => D => D.list.find(a => a.c === c && !a.est && a.at.o != null && f(a));
  const MUT = [
    ['Б1', 'у цикла V нет блока', D => { D.list = D.list.filter(a => a.c !== 5); }],
    ['Б1', 'в блоке III осталось две тайны', D => { let n = 0; D.list = D.list.filter(a => !(a.c === 3 && a.cat === 'myst' && n++ < 3)); }],
    ['Б1', 'блок цикла, которого нет в списке блоков', D => { D.blocks.cycles = [3, 4, 5]; }],
    ['Б2', 'из цикла IV убраны гибкие ступени', D => { D.list = D.list.filter(a => !(a.c === 4 && !a.est && /-(cb|run|rec|circ|step|eq|tal|val|aw)-/.test(a.id))); }],
    ['Б2', 'планка цикла VI поднята выше каталога', D => { D.blocks.need[6] = 400; }],
    ['Б3', 'ступень цикла VI уехала на сорок дней', D => { const l = D.list.filter(a => a.c === 6 && !a.est && a.at.o != null).sort((x, y) => x.at.o - y.at.o), a = l[Math.floor(l.length / 2)]; a.at.o += 40; }],
    ['Б3', 'порог паузы цикла IV — неделя', D => { D.pace.curve.pause[4] = 7; }],
    ['Б3', 'в первый день цикла V нет достижения', D => { D.list = D.list.filter(a => a.at.o !== D.pace.start[5]); }],
    ['Б3', 'день цикла II без достижения', D => { D.list = D.list.filter(a => a.est || a.at.o !== 9); }],
    ['Б4', 'золото блока — +3 %', D => { const a = D.list.find(x => x.c != null && x.pk === 'gold') || pickBlk(5)(D); a.pk = 'gold'; a.v = 3; }],
    ['Б4', 'потолок шанса на блок — 6', D => { D.kinds.base.blk = 6; }],
    ['Б4', 'веха начала пути сверх потолка вида', D => { const a = D.list.find(x => x.c == null && x.pk === 'gold'); a.v += 1; }],
    ['Б5', 'боевая пассивка', D => { D.kinds.summon.t = '+{v} % урона по призванным врагам'; }],
    ['Б5', 'рейтинговая пассивка', D => { D.kinds.cal.t = '+{v} % очков Эхо за неделю'; }],
    ['Б5', 'пассивка неизвестного вида', D => { pickBlk(4)(D).pk = 'power'; }],
    ['Б6', 'достижение цикла VI без пометки «для команды»', D => { delete D.list.find(own(6)).team; }],
    ['Б6', 'пометка «для команды» в блоке IV', D => { D.list.find(own(4)).team = 1; }],
    ['Б7', 'слово лестницы спойлеров в имени блока IV', D => { pickBlk(4)(D).n = 'Печать цикла'; }],
    ['Б7', 'прямое раскрытие в подсказке тайны блока V', D => { D.list.find(a => a.c === 5 && a.est).hint = 'Оболочка помнит.'; }],
    ['Б8', 'достижение блока IV на счётчике цикла V', D => { const a = pickBlk(4)(D); a.m = a.m.replace(/4$/, '5'); }],
    ['Б8', 'веха начала пути на счётчике блока', D => { D.list.find(a => a.c == null && !a.est).m = 'cb4'; }],
    ['Б9', 'условие покупается за Энериум', D => { pickBlk(4)(D).d = 'Купить за Энериум 10 прокруток'; }],
  ];
  let caught = 0;
  for (const [k, what, brk] of MUT) {
    const D = JSON.parse(JSON.stringify(WD.ach));
    try { brk(D); } catch (e) { say(`мутация «${what}»: не применилась — ${e.message}`); continue; }
    const got = run(D);
    if (got.some(e => e.k === k)) caught++; else say(`мутация «${what}»: закон ${k} её не поймал${got.length ? ` (сработали ${[...new Set(got.map(e => e.k))].join(', ')})` : ''}`);
  }
  for (const e of run(WD.ach)) say(`закон ${e.k} после мутаций: ${e.m}`);
  cnt.mut = MUT.length; cnt.caught = caught;
}

/* ================== песочница ==================
   Скрипты прототипа по порядку, как в браузере, с заглушкой DOM; boot() не запускается. Часы и таймеры — свои: время двигает проверка.
   storage — 'throw' (localStorage недоступен) или Map; reduced — prefers-reduced-motion. EnFx заменён записью вызовов */
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
  const game = stubEl('game'); game.parentElement = stubEl('inner'); els.game = game;
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const S0 = o.storage;
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const localStorage = S0 instanceof Map ? { getItem: k => (S0.has(k) ? S0.get(k) : null), setItem: (k, v) => { S0.set(k, String(v)); }, removeItem: k => { S0.delete(k); } }
    : { getItem: noStore, setItem: noStore, removeItem: noStore };
  const clock = { now: 0, q: [] };
  const setTimeout = (f, ms) => { clock.q.push({ at: clock.now + (ms || 0), f }); return clock.q.length; };
  const clearTimeout = id => { const t = clock.q[id - 1]; if (t) t.f = null; };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} }, localStorage,
    innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1, addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    matchMedia: q => ({ matches: !!o.reduced && /prefers-reduced-motion/.test(q), addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '#ffffff' }), CustomEvent: function CustomEvent() {}, performance: { now: () => clock.now } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    /* чужой экран, который подключён, но ещё не написан (параллельная работа), — пропуск с пометкой; свои файлы обязательны */
    if (s.src && /^screens\//.test(s.src) && !/wanderer/.test(s.src) && !fs.existsSync(path.join(UI, s.src))) { MISSING.add(s.src); continue; }
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  /* частицы: запись вызовов вместо холста */
  const fxLog = [];
  win.EnFx.create = host => { const rec = k => (...a) => fxLog.push({ k, a, t: clock.now }); return { host, center: () => ({ x: 10, y: 10, w: 150, h: 170 }), ring: rec('ring'), burst: rec('burst'), shake: rec('shake'), destroy() {} }; };
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, SCREENS, FLOWS, KH, KIT_EXTRA, MAP, BAG, LBX, render, initialState, setTeam, fmt, EnLoot: window.EnLoot, doc: document,
    WN, WN_VIEW, WN_DEMO, WN_SRV, WN_ART, wnRoll, wnChance, wnSync, wnBurst, wnShatter, wnPlan, wnCuts, wnCard, wnSpeed, wnChest, wnProg, wnReady, wnCap, wnLv, wnCyc,
    wnMemTab, wnArtTab, wnAchTab, wnSeries, wnWhen, wnLocked, wnGot, WN_ACH_VIEW, evPlanks: window.evPlanks || null,
    evPastK: window.EN_EV && window.EnEvent && window.EN_EVENT ? () => window.EnEvent.reached(window.EnEvent.planks(window.EN_EVENT, S.acc.cycle), window.EN_EV.past().pts || 0) : null,
  })`, ctx);
  const advance = ms => {
    const end = clock.now + ms;
    for (;;) {
      const due = clock.q.map((t, i) => ({ t, i })).filter(x => x.t.f && x.t.at <= end).sort((a, b) => a.t.at - b.t.at || a.i - b.i)[0];
      if (!due) break;
      clock.now = Math.max(clock.now, due.t.at); const f = due.t.f; due.t.f = null;
      run('таймер', f);
    }
    clock.now = end;
  };
  return { T, ctx, els, rootCls, fxLog, clock, advance, game: () => els.game.innerHTML };
}
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
/* разметка: без исключений, undefined и NaN; в режиме «Игрок» — без служебных слов */
function view(P, where) {
  cnt.views++;
  run(where, () => P.T.render());
  const h = P.game();
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!P.T.KH.team) {
    cnt.player++;
    const txt = playerText(h).split('\n').concat(tips(strip(h)));
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
  }
  return h;
}
const fresh = (P, o = {}) => { const T = P.T; T.S = T.initialState(); T.S.overlay = null; T.S.route = 'profile'; T.S.seg.profile = 'mem'; T.S.acc.cycle = o.cyc || 2; if (o.skip != null) T.S.mem.skip = o.skip; P.fxLog.length = 0; };
const op = T => 'wn' + T.S.wn.seq;          // номер операции, как на кнопке: его несут действия ACT
let uopN = 0; const uop = () => 'проверка-' + (++uopN);   // свой номер для прямых вызовов «сервера»
const snap = T => JSON.parse(JSON.stringify({ en: T.S.wallet.enerium, gold: T.S.wallet.gold, souls: T.S.wallet.souls, mem: T.S.mem.slots.map(x => [x.p, x.free, x.n]), art: T.S.wn.art, got: T.S.wn.ach.got, chests: T.S.bag.chests.length }));

/* ================== 3. «сервер» Памяти: чистая функция и независимый пересчёт ================== */
const P0 = load();
const W = P0.T.WN;
/* независимый генератор: FNV-1a + mix32 для сида, mulberry32 для бросков — как в lootboxes.js и battle.js */
const mix32 = x => { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; };
const seedOf = s => { let h = 0x811C9DC5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0; return mix32(h); };
function rngOf(seed) { let a = seed >>> 0, calls = 0; const f = n => { calls++; a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) % n; }; f.calls = () => calls; return f; }
function roll2(seed, excl, paid) {
  const rng = rngOf(seed), used = new Set(excl), out = [];
  if (paid) WD.passives.filter(p => p.onlyFree).forEach(p => used.add(p.id));   // тройка за Энериум: у «только бесплатно» вес 0
  for (let k = 0; k < 3; k++) {
    const byR = [1, 2, 3, 4, 5, 6, 7].map(r => WD.passives.filter(p => p.r === r && !used.has(p.id)));
    const bp = WD.mem.rarBp.map((b, i) => (byR[i].length ? b : 0));
    let x = rng(bp.reduce((a, b) => a + b, 0)), r = 0; while (x >= bp[r]) { x -= bp[r]; r++; }
    const l = byR[r]; let y = rng(l.reduce((a, p) => a + p.w, 0)), j = 0; while (y >= l[j].w) { y -= l[j].w; j++; }
    out.push(l[j].id); used.add(l[j].id);
  }
  return { ids: out, calls: rng.calls() };
}
{
  const T = P0.T;
  if (T.WN_SRV.seed(0, 0) !== seedOf('память|0|0')) say('сид места: не FNV-1a от «память|место|номер»');
  const ids = WD.passives.map(p => p.id);
  for (let s = 0; s < 600; s++) {
    const excl = Array.from({ length: s % 8 }, (_, k) => ids[(s * 13 + k * 29) % ids.length]), seed = seedOf('проверка|' + s), paid = s % 2 === 1;
    const a = T.wnRoll(seed, excl, paid), b = T.wnRoll(seed, excl, paid), c = roll2(seed, excl, paid);
    cnt.triples++;
    if (!eq(a, b)) { say(`wnRoll не чистая: сид ${s}`); break; }
    if (!eq(a, c.ids)) { say(`wnRoll расходится с независимым пересчётом: сид ${s} — ${a} против ${c.ids}`); break; }
    if (c.calls !== 6) say(`тройка: бросков ${c.calls}, формат — шесть`);
    if (new Set(a).size !== 3) say(`тройка ${s}: варианты повторяются`);
    if (a.some(id => excl.includes(id))) say(`тройка ${s}: в ней исключённая пассивка`);
  }
  /* доли: первый вариант тройки из полного пула — редкость по долям §2.6, внутри — по весу */
  const N = 40000, byR = [0, 0, 0, 0, 0, 0, 0, 0], byP = {};
  for (let s = 0; s < N; s++) { const id = T.wnRoll(seedOf('доли|' + s), [])[0], p = WD.passives.find(q => q.id === id); byR[p.r]++; byP[id] = (byP[id] || 0) + 1; }
  for (let r = 1; r <= 7; r++) {
    const pr = WD.mem.rarBp[r - 1] / 10000, exp = N * pr, sd = Math.sqrt(N * pr * (1 - pr));
    if (Math.abs(byR[r] - exp) > 5 * sd) say(`доли редкостей: ${r} — ${byR[r]} из ${N}, ожидалось ${Math.round(exp)}`);
  }
  const common = WD.passives.filter(p => p.r === 1), sw = common.reduce((a, p) => a + p.w, 0);
  for (const p of common) { const pr = p.w / sw * 0.45, exp = N * pr, sd = Math.sqrt(N * pr * (1 - pr)); if (Math.abs((byP[p.id] || 0) - exp) > 5 * sd) say(`вес внутри редкости: ${p.n} — ${byP[p.id] || 0}, ожидалось ${Math.round(exp)}`); }
  const total = WD.passives.reduce((a, p) => a + T.wnChance(p, []), 0);
  if (Math.abs(total - 1000000) > WD.passives.length) say(`сумма шансов каталога — ${total} миллионных, а не 100 %`);
  const pinned = [WD.passives[0].id, WD.passives[140].id];
  if (T.wnChance(WD.passives[0], pinned) !== 0) say('шанс закреплённой пассивки не ноль');
}

/* ================== 4. операции Памяти ================== */
{
  const P = load(), T = P.T;
  fresh(P, { cyc: 1 });
  if (T.S.mem.slots.some(x => x.st === 'open')) say('цикл I: место Памяти открыто, а цикл I — обучение (§2.4)');
  fresh(P, { cyc: 2 });
  if (!eq(T.S.mem.slots.map(x => x.st), ['open', 'lock', 'lock', 'lock', 'lock'])) say(`цикл II: места ${T.S.mem.slots.map(x => x.st)}`);
  T.S.mem.cyc = 4;
  if (T.S.mem.slots.filter(x => x.st === 'open').length !== 3) say('демо-цикл IV: открытых мест не три');
  T.S.mem.cyc = 0; T.S.route = 'shelter';
  if (!view(P, 'Убежище · место открыто').includes('Место Памяти цикла II открыто')) say('Убежище не видит открытое место Памяти');
  /* первое открытие: тройку решает сервер; повторное — та же тройка */
  fresh(P, { skip: true });
  const b0 = snap(T);
  run('Вспомнить', () => T.ACT.wnmem('0'));
  const o0 = T.S.mem.offer[0];
  if (!o0 || o0.ids.length !== 3) { say('окно: тройки нет'); done(); }
  if (!eq(o0.ids, roll2(seedOf('память|0|0'), []).ids)) say('первая тройка не та, что решает сид места');
  run('закрыть', () => T.ACT.close()); run('открыть снова', () => T.ACT.wnmem('0'));
  if (!eq(T.S.mem.offer[0], o0) || T.S.wallet.enerium !== b0.en || T.S.mem.slots[0].free !== 1) say('повторное открытие окна сменило тройку или списало переброс (§2.5)');
  /* бесплатный переброс */
  const v1 = `0:${o0.n}:${op(T)}`;
  run('переброс', () => T.ACT.wnroll(v1)); cnt.ops++;
  const o1 = T.S.mem.offer[0];
  if (T.S.wallet.enerium !== b0.en) say('бесплатный переброс списал Энериум');
  if (T.S.mem.slots[0].free !== 0) say('бесплатный переброс не израсходован');
  if (!o1 || o1.n !== o0.n + 1 || !eq(o1.ids, roll2(seedOf('память|0|1'), o0.ids).ids)) say('переброс: новая тройка не по сиду места и номеру');
  if (o1.ids.some(id => o0.ids.includes(id))) say('переброс: в новой тройке есть варианты прошлой');
  run('повтор', () => T.ACT.wnrollok(v1));
  if (T.S.mem.offer[0] !== o1) say('повтор номера операции перебросил снова');
  /* платный: сначала подтверждение цены */
  const v2 = `0:${o1.n}:${op(T)}`;
  run('платный переброс', () => T.ACT.wnroll(v2));
  if (T.S.mem.ask !== 'roll' || T.S.wallet.enerium !== b0.en || T.S.mem.offer[0] !== o1) say('платный переброс без подтверждения цены');
  if (!view(P, 'подтверждение переброса').includes('Перебросить тройку?')) say('подтверждение переброса не нарисовано');
  run('отмена', () => T.ACT.wnask());
  if (T.S.mem.ask || T.S.wallet.enerium !== b0.en) say('отмена подтверждения что-то изменила');
  run('платный переброс', () => T.ACT.wnroll(v2)); run('подтвердить', () => T.ACT.wnrollok(v2)); cnt.ops++;
  if (T.S.wallet.enerium !== b0.en - W.mem.reroll) say(`платный переброс: списано ${b0.en - T.S.wallet.enerium}, а не ${W.mem.reroll}`);
  const o2 = T.S.mem.offer[0];
  run('повтор', () => T.ACT.wnrollok(v2));
  if (T.S.wallet.enerium !== b0.en - W.mem.reroll || T.S.mem.offer[0] !== o2) say('повтор платного переброса списал второй раз');
  /* устаревшее окно не закрепит заменённый вариант */
  const s1 = snap(T);
  run('устаревшее окно', () => T.ACT.wnpin(`0:${o1.n}:0:${op(T)}`));
  if (!eq(snap(T), s1)) say('устаревшее окно закрепило вариант');
  /* нехватка Энериума */
  T.S.wallet.enerium = 10;
  const s2 = snap(T), rr = T.WN_SRV.reroll(uop(), 0, o2.n);
  if (rr.refuse !== 'enerium' || !eq(snap(T), s2)) say('нехватка Энериума: не отказ или был расход');
  view(P, 'окно · не хватает Энериума');
  T.S.wallet.enerium = 1000;
  /* «Вспомнить» */
  T.S.mem.pick = 2;
  const vp = `0:${o2.n}:2:${op(T)}`;
  run('Вспомнить', () => T.ACT.wnpin(vp)); cnt.ops++;
  if (T.S.mem.slots[0].p !== o2.ids[2] || T.S.mem.slots[0].st !== 'set') say('«Вспомнить» не закрепил выделенный вариант');
  if (T.S.overlay) say('после «Вспомнить» окно не закрылось');
  const s3 = snap(T);
  run('повтор «Вспомнить»', () => T.ACT.wnpin(vp));
  if (!eq(snap(T), s3)) say('повтор «Вспомнить» что-то изменил');
  if (T.WN_SRV.pin(uop(), 0, o2.n + 1, 0).refuse !== 'set') say('закреплённое место выбирается снова без сброса');
  T.S.route = 'shelter';
  if (view(P, 'Убежище · место закреплено').includes('Место Памяти цикла II открыто')) say('Убежище не видит, что место закреплено');
  /* полный сброс: 100 Энериума, раз в неделю, перебросы не возвращаются */
  const en = T.S.wallet.enerium, vr = op(T);
  run('сброс', () => T.ACT.wnreset(vr)); cnt.ops++;
  if (T.S.wallet.enerium !== en - W.mem.reset) say(`сброс: списано ${en - T.S.wallet.enerium}, а не ${W.mem.reset}`);
  if (T.S.mem.slots[0].p || T.S.mem.slots[0].st !== 'open') say('сброс не открыл место заново');
  if (T.S.mem.slots[0].free !== 0) say('сброс вернул бесплатный переброс — прототип их не возвращает');
  run('повтор сброса', () => T.ACT.wnreset(vr));
  if (T.S.wallet.enerium !== en - W.mem.reset) say('повтор сброса списал второй раз');
  run('Вспомнить снова', () => T.ACT.wnmem('0'));
  const o3 = T.S.mem.offer[0];
  if (!o3 || o3.n <= o2.n) say('после сброса тройка не новая');
  /* бесплатная или за Энериум: первая тройка места и бесплатный переброс — бесплатные; платный переброс и тройка после сброса — за Энериум */
  if (o0.paid || o1.paid || !o2.paid || !o3 || !o3.paid) say(`тройки: бесплатная ли — ${[o0, o1, o2, o3].map(o => o && (o.paid ? 'за Энериум' : 'бесплатная'))}, ждали: бесплатная, бесплатная, за Энериум, за Энериум`);
  if (o3 && !eq(o3.ids, roll2(o3.seed, [], true).ids)) say('тройка после сброса не по сиду места и номеру или не без «только бесплатно»');
  T.S.mem.slots[0].p = o3.ids[0]; delete T.S.mem.offer[0];
  if (T.WN_SRV.reset(uop()).refuse !== 'week') say('второй сброс за неделю не отклонён (§2.7)');
  T.S.mem.resetWeek = ''; T.S.wallet.enerium = 99;
  if (T.WN_SRV.reset(uop()).refuse !== 'enerium') say('сброс без 100 Энериума не отклонён');
  /* сброс не перебрасывает тройку незакреплённого места мимо цены */
  fresh(P, { cyc: 3, skip: true }); T.S.wallet.enerium = 10000;
  run('тройка места II', () => T.ACT.wnmem('0')); const k0 = T.S.mem.offer[0];
  run('Вспомнить место II', () => T.ACT.wnpin(`0:${k0.n}:0:${op(T)}`));
  run('тройка места III', () => T.ACT.wnmem('1')); const k1 = T.S.mem.offer[1];
  run('сброс', () => T.ACT.wnreset(op(T)));
  if (T.S.mem.offer[1] !== k1) say('полный сброс сменил тройку незакреплённого места — это переброс мимо цены');
}

/* ================== 4б. «Право владыки» — только в бесплатных тройках (решение 28.09, ×1,7 §1) ==================
   У пассивок onlyFree вес 0 в тройке за Энериум: после платного переброса и после полного сброса. Бесплатные тройки — первая тройка
   места и бесплатный переброс: там она выпадает со своей долей. Бесплатных троек у места за всю игру — не больше двух */
{
  const P = load(), T = P.T;
  const OF = WD.passives.filter(p => p.onlyFree), slot = WD.passives.find(p => p.no === WD.mem.slot);
  if (!OF.length || !slot || !slot.onlyFree) say('«Право владыки» (+1 забег) не помечено «только бесплатно» в данных');
  const isOF = id => OF.some(p => p.id === id);
  /* чистая функция: за Энериум — ни на одном сиде из 60 000, в бесплатных — с долей данных */
  let bad = 0;
  for (let s = 0; s < 60000; s++) if (T.wnRoll(seedOf('за Энериум|' + s), [], true).some(isOF)) bad++;
  if (bad) say(`тройка за Энериум: «только бесплатно» выпала ${bad} раз из 60 000`);
  const N = 200000; let hit = 0;
  for (let s = 0; s < N; s++) if (T.wnRoll(seedOf('бесплатно|' + s), [], false)[0] === slot.id) hit++;
  const r7 = WD.passives.filter(p => p.r === slot.r), pr = WD.mem.rarBp[slot.r - 1] / 10000 * slot.w / r7.reduce((a, p) => a + p.w, 0);
  const exp = N * pr, sd = Math.sqrt(N * pr * (1 - pr));
  if (!hit || Math.abs(hit - exp) > 5 * sd) say(`бесплатная тройка: «${slot.n}» ${hit} раз из ${N}, ожидалось ${Math.round(exp)}`);
  if (T.wnChance(slot, [], true) !== 0 || T.wnChance(slot, [], false) <= 0) say('шанс «только бесплатно»: за Энериум не ноль или бесплатно ноль');
  /* путь «сервера»: 400 платных перебросов и 150 кругов «Вспомнить — сброс» — ни одной такой пассивки, бесплатных троек не больше двух */
  fresh(P, { skip: true }); T.S.wallet.enerium = 1e9;
  const seen = [];
  run('первая тройка', () => T.ACT.wnmem('0')); seen.push(T.S.mem.offer[0]);
  for (let k = 0; k < 400; k++) { const o = T.S.mem.offer[0], r = T.WN_SRV.reroll(uop(), 0, o.n); if (!r.res) { say('платный переброс отказан: ' + r.refuse); break; } seen.push(T.S.mem.offer[0]); }
  for (let k = 0; k < 150; k++) {
    const o = T.S.mem.offer[0];
    T.WN_SRV.pin(uop(), 0, o.n, 0); T.S.mem.resetWeek = '';
    if (!T.WN_SRV.reset(uop()).res) { say('сброс отказан'); break; }
    T.WN_SRV.offer(0); seen.push(T.S.mem.offer[0]);
    if (k % 3 === 0) { const r = T.WN_SRV.reroll(uop(), 0, T.S.mem.offer[0].n); if (r.res) seen.push(T.S.mem.offer[0]); }
  }
  const free = seen.filter(o => !o.paid), paidHit = seen.filter(o => o.paid && o.ids.some(isOF)).length;
  if (paidHit) say(`путь сервера: «только бесплатно» в ${paidHit} тройках за Энериум`);
  if (free.length > 2) say(`у места ${free.length} бесплатных троек — больше двух: первая и бесплатный переброс`);
  cnt.triples += seen.length;
  /* игроку видно: каталог, лист пассивки, подтверждение платного переброса */
  T.S.route = 'profile'; T.S.seg.profile = 'mem'; T.S.seg.wnrar = String(slot.r); T.S.overlay = { t: 'wncat' };
  if (!playerText(view(P, 'каталог · вневременные')).includes('За Энериум её не вызвать')) say('каталог: у «только бесплатно» нет строки для игрока');
  T.S.overlay = { t: 'wnp', arg: slot.id };
  if (!playerText(view(P, 'лист · Право владыки')).includes('За Энериум её не вызвать')) say('лист пассивки: нет строки «за Энериум не вызвать»');
  T.S.overlay = { t: 'mem', arg: '0' }; T.S.mem.ask = 'roll';
  if (!/за Энериум не выпада(?:ет|ют)/.test(playerText(view(P, 'подтверждение · за Энериум')))) say('подтверждение платного переброса: нет строки о «только бесплатно»');
}

/* ================== 5. анимация: тройка решена до неё; сборка из осколков, бой стекла, полёт в место; частицы по редкости ================== */
const cardOf = (h, k) => { const m = h.match(new RegExp(`<(button|div) class="wn-card[^"]*" data-r="\\d" id="wnCard${k}"[\\s\\S]*?</\\1>`)); return m ? m[0] : ''; };
const clsOf = h => Object.fromEntries([...h.matchAll(/class="(wn-card[^"]*)" data-r="\d" id="wnCard(\d)"/g)].map(m => [m[2], m[1].split(/\s+/)]));
const dlOf = h => [...h.matchAll(/id="wnCard(\d)"[^>]*style="--dl:(-?\d+)ms[;"]/g)].map(m => [+m[1], +m[2]]);
const rOf = id => WD.passives.find(p => p.id === id).r;
/* открыть окно места 0 и запустить сборку в миг 1: t0 анимации = часы, таймеры — от них же */
function openAnim(P, where) { run('Вспомнить', () => P.T.ACT.wnmem('0')); const h = view(P, where); P.advance(1); run('en-render', () => P.T.wnSync()); return h; }
{
  const P = load(), T = P.T, V = T.WN_VIEW, B = V.build;
  /* лестница сборки: чем реже, тем больше осколков, кружения, слёта и замедления; миг замедления и лучи — с древней */
  for (let r = 2; r <= 7; r++) for (const f of ['frag', 'spread', 'orbit', 'gather', 'hold']) if (B[r][f] < B[r - 1][f]) say(`сборка: у редкости ${r} ${f} меньше, чем у ${r - 1}`);
  if (B[1].orbit || B[1].hold || B[1].rays) say('обычная: кружение, замедление или лучи — должен быть прямой слёт');
  for (let r = 1; r <= 7; r++) {
    if (!!B[r].hold !== r >= 5 || !!B[r].near !== r >= 5 || !!B[r].rays !== r >= 5) say(`редкость ${r}: миг замедления и лучи — с древней`);
    if (Object.values(B[r]).some(x => !Number.isInteger(x))) say(`сборка ${r}: не целые числа`);
  }
  if (B[7].orbit < 360 || B[7].hold <= B[6].hold) say('вневременная: меньше полного оборота или замедление не дольше первородной');
  if (!V.fx[7].veil || !V.fx[6].veil || V.fx[5].veil || !V.fx[6].shake || V.fx[5].shake) say('свет на всё окно и дрожь — с первородной');
  /* сколы: клинья от точки удара дают весь значок без щелей, целые проценты в квадрате 0–100 */
  const area2 = pts => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0));
  for (let K = 3; K <= 12; K++) for (const hh of [0, 1, -1, 0x2545f491, 123456789, seedOf('сколы'), seedOf('ещё')]) {
    const c = T.wnCuts(K, hh), s = c.reduce((a, pts) => a + area2(pts), 0);
    if (c.length !== K || s !== 20000) { say(`сколы ${K} / ${hh}: клиньев ${c.length}, двойная площадь ${s} вместо 20000 — не весь значок`); break; }
    if (c.some(pts => pts.some(([x, y]) => !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 100 || y < 0 || y > 100))) say('сколы: не целые проценты или за краем значка');
  }
  /* карта каждой редкости в сборке: осколков — по лестнице, лучи сплавления — с древней; при бое стекла — осколки прежней редкости */
  for (let r = 1; r <= 7; r++) {
    const p = WD.passives.find(q => q.r === r), c = T.wnCard(p, { a: { dl: 0, bk: 0, h: seedOf('карта|' + r), old: { r: 8 - r } } });
    if ((c.match(/class="wn-fr"/g) || []).length !== B[r].frag || (c.match(/class="wn-db"/g) || []).length !== B[8 - r].frag) say(`карта редкости ${r}: осколков не по лестнице сборки`);
    if (!!B[r].rays !== /class="wn-bray"/.test(c) || !new RegExp(`--land:${V.inMs + B[r].gather + B[r].hold}ms`).test(c)) say(`карта редкости ${r}: лучи или миг сплавления не по лестнице`);
    if (/undefined|NaN/.test(c)) say(`карта редкости ${r}: undefined или NaN в разметке сборки`);
  }
  /* открытие: сборка по расписанию wnPlan */
  fresh(P, { skip: false });
  let h = openAnim(P, 'окно · сборка начата');
  const o = T.S.mem.offer[0], A = T.S.mem.anim, rs = o.ids.map(rOf), plan = T.wnPlan(rs, 0);
  if (!A) { say('анимация не началась'); done(); }
  if (!eq(A.rs, rs)) say('анимация показывает не ту тройку, что решил сервер');
  if (!eq(A.plan, plan) || A.lead || A.old) say('расписание открытия не из wnPlan или с боем прежней тройки');
  if (!A.t0) say('анимация не взяла время старта');
  const dl = dlOf(h).map(x => x[1]);
  if (!eq(dl, plan.start) || !(dl[0] < dl[1] && dl[1] < dl[2])) say(`карты начинают сборку не по очереди: ${dl}, по расписанию ${plan.start}`);
  for (let k = 0; k < 3; k++) {
    const c = cardOf(h, k), r = rs[k], n = (c.match(/class="wn-fr"/g) || []).length;
    if (n !== B[r].frag) say(`карта ${k}: осколков ${n}, у редкости ${r} — ${B[r].frag}`);
    if (!/class="wn-whole"/.test(c) || !/class="wn-core"/.test(c) || !/class="wn-mfl"/.test(c) || !/class="wn-gl"/.test(c) || !/class="wn-lit"/.test(c)) say(`карта ${k}: нет слоя сборки`);
    if (!!B[r].rays !== /class="wn-bray"/.test(c)) say(`карта ${k}: лучи сплавления не по редкости`);
    const land = (c.match(/--land:(\d+)ms/) || [])[1];
    if (+land !== plan.land[k] - plan.start[k]) say(`карта ${k}: сплавление ${land} мс, по расписанию ${plan.land[k] - plan.start[k]}`);
    if (/\bwn-db\b/.test(c) || /\bre\b/.test(clsOf(h)[k].join(' '))) say(`карта ${k}: бой стекла при первом открытии`);
  }
  if (!/data-a="wnpin"[^>]*disabled/.test(h) || !/data-a="wnroll"[^>]*disabled/.test(h)) say('пока карты собираются, «Вспомнить» или «Перебросить» доступны');
  const again = view(P, 'окно · та же разметка');
  if (dlOf(again).map(x => x[1]).join() !== plan.start.map(s => s - (P.clock.now - A.t0)).join()) say('перерисовка без хода времени сдвинула сборку');
  /* выбрать карту, пока она не сплавилась, нельзя */
  const pick0 = T.S.mem.pick;
  run('выбор до сплавления', () => T.ACT.wnpick('2'));
  if (T.S.mem.pick !== pick0) say('карту выбрали до того, как её осколки сплавились');
  /* посреди сборки второй карты: перерисовка не начинает анимацию заново — отрицательная задержка по прошедшему времени */
  const mid = Math.floor((plan.start[1] + plan.done[1]) / 2);
  P.fxLog.length = 0;
  P.advance(mid - 1);
  h = view(P, 'окно · посреди сборки');
  const el = P.clock.now - A.t0, cls = clsOf(h), dl2 = Object.fromEntries(dlOf(h));
  for (let k = 0; k < 3; k++) {
    const live = el < plan.done[k];
    if (!cls[k] || cls[k].includes('in') !== live) say(`посреди сборки: карта ${k} ${live ? 'не собирается' : 'всё ещё собирается'} — ${cls[k]}`);
    if (live && dl2[k] !== plan.start[k] - el) say(`посреди сборки: карта ${k} с задержкой ${dl2[k]}, а не ${plan.start[k] - el} — анимация начата заново`);
  }
  run('en-render', () => T.wnSync());
  P.advance(plan.end + 20 - el);
  /* сплавление — у каждой карты в свой миг: частицы её редкости; слёт искр — с эпической; дрожь — только у первородной и выше */
  const at = t => P.fxLog.filter(x => x.t === A.t0 + t);
  for (let k = 0; k < 3; k++) {
    const r = rs[k], hits = at(plan.land[k]).filter(x => x.k === 'burst');
    if (hits.length < 2) say(`карта ${k}: нет частиц сплавления в миг ${plan.land[k]}`);
    if (V.converge[r] && at(plan.start[k] + V.inMs).filter(x => x.k === 'burst').length !== V.converge[r][0]) say(`карта ${k}: искры не слетаются к точке удара`);
  }
  cnt.bursts += P.fxLog.filter(x => x.k === 'burst').length;
  const shakes = P.fxLog.filter(x => x.k === 'shake').map(x => x.t - A.t0), wantShake = rs.map((r, k) => (V.fx[r].shake ? plan.land[k] : -1)).filter(x => x >= 0);
  if (!eq(shakes, wantShake)) say(`дрожь: ${shakes}, ждали ${wantShake} — только у первородной и вневременной`);
  if (T.S.mem.anim || !T.S.mem.shown[o.i + ':' + o.n]) say('анимация не закончилась');
  h = view(P, 'окно · тройка показана');
  if (/class="wn-card[^"]*\bin\b/.test(h) || /data-a="wnpin"[^>]*disabled/.test(h)) say('после сборки карты не на месте или «Вспомнить» недоступно');
  if (/class="wn-fr"|class="wn-core"|class="wn-mfl"/.test(h)) say('после сборки в разметке остались осколки и слои сборки');
  /* живые состояния: выбранная — кольцо, остальные притушены; только что выбранная поднимается */
  let c2 = clsOf(h), pk = T.S.mem.pick;
  if (!c2[pk].includes('on') || [0, 1, 2].some(k => k !== pk && !c2[k].includes('dim'))) say(`состояния карт: выбранная ${pk} без кольца или остальные не притушены — ${JSON.stringify(c2)}`);
  const other = (pk + 1) % 3;
  run('выбор', () => T.ACT.wnpick(String(other)));
  h = view(P, 'окно · только что выбрана');
  c2 = clsOf(h);
  if (T.S.mem.pick !== other || !c2[other].includes('on') || !c2[other].includes('pk') || !new RegExp(`id="wnCard${other}"[^>]*--pk:-?\\d+ms`).test(h)) say('выбор: карта не выделилась или не поднялась');
  P.advance(V.pickMs + 10);
  if (clsOf(view(P, 'окно · выбрана давно'))[other].includes('pk')) say('подъём выбранной не закончился');
  /* богаче с редкостью: по каждой редкости — число частиц сплавления */
  const calls = [];
  const fxRec = { host: { appendChild() {} }, center: () => ({ x: 0, y: 0, w: 100, h: 100 }), ring: () => P.fxLog.push({ k: 'ring' }), burst: (x, y, c, n) => P.fxLog.push({ k: 'burst', n }), shake: () => P.fxLog.push({ k: 'shake' }) };
  for (let r = 1; r <= 7; r++) {
    P.fxLog.length = 0; run('вспышка ' + r, () => T.wnBurst(fxRec, {}, r)); P.advance(3000);
    calls.push({ r, n: P.fxLog.filter(x => x.k === 'burst').reduce((a, x) => a + x.n, 0), rings: P.fxLog.filter(x => x.k === 'ring').length, shake: P.fxLog.some(x => x.k === 'shake') });
  }
  for (let i = 1; i < 7; i++) if (calls[i].n <= calls[i - 1].n || calls[i].rings < calls[i - 1].rings) say(`частицы: редкость ${i + 1} не богаче ${i} — ${calls[i].n} против ${calls[i - 1].n}`);
  if (T.WN_VIEW.fx[1].flash || T.WN_VIEW.fx[1].shake || calls[0].n > 6) say('у обычной — вспышка, дрожь или много искр: должно быть почти ничего');
  if (!T.WN_VIEW.fx[7].flash || !T.WN_VIEW.fx[7].shake || !calls[6].shake) say('у вневременной нет полного всплеска: вспышки и дрожи');

  /* переброс: новая тройка — от сервера сразу; показ — прежние осколки бьются стеклом, на их месте собираются новые */
  fresh(P, { skip: false });
  openAnim(P, 'окно · перед перебросом'); P.advance(5000);
  const oA = T.S.mem.offer[0];
  run('переброс', () => T.ACT.wnroll(`0:${oA.n}:${op(T)}`)); cnt.ops++;
  const oB = T.S.mem.offer[0], R = T.S.mem.anim;
  if (!oB || oB.n !== oA.n + 1) say('переброс с анимацией: сервер не выдал новую тройку сразу');
  if (!R || !eq(R.old, oA.ids) || R.lead !== V.breakMs || !eq(R.plan, T.wnPlan(oB.ids.map(rOf), V.breakMs))) say('переброс: прежняя тройка не бьётся перед сборкой новой');
  h = view(P, 'окно · переброс');
  for (let k = 0; k < 3; k++) {
    const c = cardOf(h, k), rOld = rOf(oA.ids[k]), n = (c.match(/class="wn-db"/g) || []).length;
    if (!clsOf(h)[k].includes('re') || n !== B[rOld].frag || !new RegExp(`class="wn-lit old" data-r="${rOld}"`).test(c) || !/--bk:-?\d+ms/.test(c)) say(`переброс: карта ${k} — нет осколков прежней редкости ${rOld} или её света`);
  }
  if (T.S.mem.brk) say('переброс: прежняя тройка осталась в состоянии после начала сборки');
  P.fxLog.length = 0; P.advance(1); run('en-render', () => T.wnSync()); P.advance(1);
  if (P.fxLog.filter(x => x.k === 'ring').length < 3) say('переброс: прежние осколки не бьются стеклом (кольца)');
  P.advance(R.plan.end + 20);
  if (T.S.mem.anim || /class="wn-db"/.test(view(P, 'окно · после переброса'))) say('переброс: сборка не закончилась или остался бой стекла');

  /* «Вспомнить»: сервер закрепляет сразу; показ — невыбранные бьются, выбранный осколок летит в место, окно гаснет в пути, место принимает */
  fresh(P, { skip: false });
  openAnim(P, 'окно · перед выбором'); P.advance(5000);
  const oC = T.S.mem.offer[0]; T.S.mem.pick = 1;
  const vp = `0:${oC.n}:1:${op(T)}`;
  run('Вспомнить', () => T.ACT.wnpin(vp)); cnt.ops++;
  const L = T.S.mem.leave;
  if (T.S.mem.slots[0].p !== oC.ids[1] || T.S.mem.slots[0].st !== 'set') say('«Вспомнить» с анимацией: сервер не закрепил сразу');
  if (!L || L.k !== 1 || !eq(L.ids, oC.ids) || !T.S.overlay || T.S.overlay.t !== 'mem') say('«Вспомнить» с анимацией: нет показа выбора или окно закрылось сразу');
  h = view(P, 'окно · выбор улетает');
  const lc = clsOf(h);
  if (!lc[1] || !lc[1].includes('go') || ![0, 2].every(k => lc[k] && lc[k].includes('brk') && (cardOf(h, k).match(/class="wn-db"/g) || []).length === B[rOf(oC.ids[k])].frag)) say(`выбор: невыбранные не бьются или выбранная не отдала осколок — ${JSON.stringify(lc)}`);
  if (/data-a="wnpin"|data-a="wnroll"|data-a="wnpick"|<button class="ov-scrim" data-a="close"/.test(h)) say('выбор: в окне ухода можно снова выбрать, перебросить или закрыть фоном');
  if (!/class="wn-slot set wait" id="wnSlot0"/.test(h)) say('место не ждёт осколок: закреплённое видно раньше, чем он долетел');
  const s1 = snap(T);
  run('повтор «Вспомнить»', () => T.ACT.wnpin(vp));
  if (!eq(snap(T), s1) || T.S.mem.leave !== L) say('повтор «Вспомнить» во время полёта что-то изменил');
  P.fxLog.length = 0; P.advance(1); run('en-render', () => T.wnSync());
  if (!L.t0 || P.fxLog.filter(x => x.k === 'ring').length !== 2) say('выбор: невыбранные не бьются стеклом');
  P.advance(V.breakMs);
  if (T.S.overlay || !T.S.mem.leave || T.S.mem.leave.phase !== 'fly') say('окно не закрылось, когда осколок в пути');
  h = view(P, 'место ждёт осколок');
  if (!/class="wn-slot set wait" id="wnSlot0"/.test(h)) say('в пути: место не ждёт осколок');
  P.fxLog.length = 0; P.advance(V.flyMs + 1);
  if (T.S.mem.leave || !T.S.mem.land || T.S.mem.land.i !== 0) say('осколок не сел в место');
  if (P.fxLog.filter(x => x.k === 'burst' && x.a[3] === V.trail[1]).length < 3) say('полёт: нет следа искр');
  if (!P.fxLog.some(x => x.k === 'burst' && x.t === P.clock.now - 1)) say('место приняло осколок без частиц');
  if (!T.S.toast || !/Вспомнено/.test(T.S.toast.t)) say('нет сообщения «Вспомнено»');
  h = view(P, 'место приняло осколок');
  if (!/class="wn-slot set land" id="wnSlot0"[^>]*style="--dl:-?\d+ms"/.test(h)) say('место не вспыхнуло, приняв осколок');
  P.advance(V.landMs + 10);
  if (T.S.mem.land || /wn-slot set land/.test(view(P, 'место после вспышки'))) say('вспышка места не закончилась');
  /* закрыли окно, пока невыбранные бьются: закреплено, осколок всё равно долетает */
  fresh(P, { skip: false });
  openAnim(P, 'окно'); P.advance(5000);
  const oD = T.S.mem.offer[0];
  run('Вспомнить', () => T.ACT.wnpin(`0:${oD.n}:0:${op(T)}`)); view(P, 'окно · выбор'); P.advance(1); run('en-render', () => T.wnSync());
  P.advance(100); run('закрыть', () => T.ACT.close()); run('en-render', () => T.wnSync());
  if (!T.S.mem.leave || T.S.mem.leave.phase !== 'fly') say('окно закрыли посреди выбора — осколок не полетел');
  P.advance(V.breakMs + V.flyMs + 10);
  if (T.S.mem.leave || T.S.mem.slots[0].p !== oD.ids[0] || T.S.overlay) say('окно закрыли посреди выбора — место не приняло осколок или окно открылось снова');

  /* закрыли посреди сборки — тройка считается показанной */
  fresh(P, { skip: false });
  run('Вспомнить', () => T.ACT.wnmem('0')); view(P, 'окно'); run('en-render', () => T.wnSync());
  run('закрыть', () => T.ACT.close()); run('en-render', () => T.wnSync());
  if (T.S.mem.anim) say('окно закрыли посреди анимации — анимация осталась');
  run('открыть снова', () => T.ACT.wnmem('0'));
  if (T.S.mem.anim) say('повторное открытие проиграло ту же тройку заново');
  /* пропуск: галочка посреди анимации — тройка сразу; localStorage помнит, без него работает; с пропуском — ни боя стекла, ни полёта */
  const store = new Map(), P2 = load({ storage: store }), T2 = P2.T;
  fresh(P2, { skip: false });
  run('Вспомнить', () => T2.ACT.wnmem('0')); run('en-render', () => T2.wnSync());
  run('пропустить', () => T2.ACT.wnskip('', { checked: true }));
  if (T2.S.mem.anim || store.get('en-wn-skip') !== '1') say('«Пропустить анимацию» посреди анимации: тройка не сразу или выбор не запомнен');
  const oS = T2.S.mem.offer[0];
  run('переброс с пропуском', () => T2.ACT.wnroll(`0:${oS.n}:${op(T2)}`));
  if (T2.S.mem.brk || T2.S.mem.anim || /class="wn-card[^"]*\bin\b/.test(view(P2, 'окно · переброс с пропуском'))) say('с пропуском переброс всё равно показывает бой стекла или сборку');
  run('Вспомнить с пропуском', () => T2.ACT.wnpin(`0:${T2.S.mem.offer[0].n}:0:${op(T2)}`));
  if (T2.S.mem.leave || T2.S.overlay) say('с пропуском «Вспомнить» показывает полёт или окно не закрылось сразу');
  const P3 = load({ storage: store });
  if (!P3.T.S.mem.skip) say('«Пропустить анимацию» не прочитано из localStorage');
  const P4 = load({ reduced: true }), T4 = P4.T;
  fresh(P4, { skip: false });
  run('Вспомнить', () => T4.ACT.wnmem('0'));
  const h4 = view(P4, 'окно · меньше движения');
  if (T4.S.mem.anim || /class="wn-card[^"]*\bin\b/.test(h4) || !/data-a="wnskip"[^>]*checked[^>]*disabled/.test(h4)) say('prefers-reduced-motion: анимация есть или галочка не заблокирована');
  /* миг замедления: пока осколки вневременной замерли перед сплавлением, частицы на слое идут медленнее; после сборки — как обычно */
  fresh(P, { skip: false }); T.S.mem.demoHigh = true;
  openAnim(P, 'окно · вневременная');
  const H = T.S.mem.anim, k7 = H ? H.rs.indexOf(7) : -1;
  if (k7 < 0) say('демо «вневременная в следующей тройке»: в сборке её нет');
  else {
    P.advance(H.t0 + H.plan.land[k7] - B[7].hold + 10 - P.clock.now);
    if (T.wnSpeed() !== V.slow / 100) say(`миг замедления: скорость частиц ${T.wnSpeed()}, а не ${V.slow / 100}`);
    P.advance(H.plan.end + 20);
    if (T.wnSpeed() !== 1) say('после сборки частицы остались замедленными');
  }
  /* демо команды: вневременная в следующей тройке */
  fresh(P, { skip: true }); T.S.mem.demoHigh = true;
  run('Вспомнить', () => T.ACT.wnmem('0'));
  if (!T.S.mem.offer[0].ids.some(id => WD.passives.find(p => p.id === id).r === 7)) say('демо «вневременная в следующей тройке» не сработало');
}

/* ================== 5б. значки-осколки: пути, до и после выгрузки ==================
   До выгрузки — ни одной ссылки на картинки осколков (нет битой картинки), на месте — прежний кристалл CSS. После — осколки по путям
   memory/shard-r1…r7.png и shard-empty.png через AV(): с версией выгрузки; закрытое и открытое место — пустое стекло, закреплённое — своя редкость */
{
  const P = load(), T = P.T, A = T.WN_ART;
  const want = [1, 2, 3, 4, 5, 6, 7].map(r => `memory/shard-r${r}.png`).concat('memory/shard-empty.png');
  if (!eq([1, 2, 3, 4, 5, 6, 7].map(r => A.shard.replace('{r}', r)).concat(A.empty), want)) say('пути осколков не memory/shard-r1…r7.png и shard-empty.png');
  if (A.ready.some(p => !want.includes(p))) say(`в списке выгруженных — чужой путь: ${A.ready}`);
  fresh(P, { cyc: 4, skip: true });
  const pin = () => { run('тройка', () => T.ACT.wnmem('0')); const o = T.S.mem.offer[0]; run('Вспомнить', () => T.ACT.wnpin(`0:${o.n}:0:${op(T)}`)); return rOf(o.ids[0]); };
  const r0 = pin();
  const saved = A.ready.slice();
  A.ready.length = 0;
  let h = view(P, 'Память · до выгрузки');
  T.S.overlay = { t: 'wncat' }; h += view(P, 'каталог · до выгрузки'); T.S.overlay = null;
  if (/memory\/shard-/.test(h)) say('до выгрузки в разметке ссылки на картинки осколков — будет битая картинка');
  if (!/class="wn-gem /.test(h)) say('до выгрузки нет прежнего кристалла');
  A.ready.push(...want);
  h = view(P, 'Память · после выгрузки');
  const srcs = [...h.matchAll(/src="([^"]*memory\/shard-[^"]*)"/g)].map(m => m[1]);
  if (!srcs.length || srcs.some(s => !/\?v=\w+/.test(s))) say('картинки осколков не через AV(): без версии выгрузки');
  const slotImg = i => { const m = h.match(new RegExp(`id="wnSlot${i}"[\\s\\S]*?src="[^"]*(memory/shard-[\\w-]+\\.png)`)); return m && m[1]; };
  if (slotImg(0) !== `memory/shard-r${r0}.png`) say(`закреплённое место — не осколок своей редкости: ${slotImg(0)}`);
  if (slotImg(1) !== 'memory/shard-empty.png' || slotImg(4) !== 'memory/shard-empty.png') say('открытое или закрытое место — не пустое стекло');
  if (/class="wn-gem /.test(h)) say('после выгрузки остался прежний кристалл');
  T.S.overlay = { t: 'wncat' };
  if (!/memory\/shard-r7\.png/.test(view(P, 'каталог · после выгрузки'))) say('каталог: нет осколков');
  A.ready.length = 0; A.ready.push(...saved);
}

/* ================== 5в. CSS: движение — только transform и opacity ==================
   В кадрах анимаций и переходах экрана — только transform и opacity: без фильтров и смешения слоёв (телефон) */
{
  const css = read('screens/wanderer.css');
  const blocks = [];
  for (let i = css.indexOf('@keyframes'); i >= 0; i = css.indexOf('@keyframes', i + 1)) {
    const open = css.indexOf('{', i); let d = 0, j = open;
    for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}' && --d === 0) break; }
    blocks.push({ name: css.slice(i + 10, open).trim(), body: css.slice(open + 1, j) });
  }
  if (blocks.length < 10) say(`wanderer.css: кадров анимаций ${blocks.length} — не разобраны`);
  for (const b of blocks) {
    const props = [...b.body.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]).filter(p => p !== 'var');
    const bad = props.filter(p => p !== 'transform' && p !== 'opacity');
    if (bad.length) say(`@keyframes ${b.name}: анимирует ${[...new Set(bad)]} — только transform и opacity`);
  }
  const topSplit = v => { const out = ['']; let d = 0; for (const ch of v) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) out.push(''); else out[out.length - 1] += ch; } return out; };
  for (const m of css.matchAll(/transition\s*:\s*([^;}]+)/g)) for (const part of topSplit(m[1])) { const p = part.trim().split(/\s+/)[0].replace('!important', ''); if (p !== 'transform' && p !== 'opacity' && p !== 'none') say(`wanderer.css: переход по «${p}» — только transform и opacity`); }
  if (/mix-blend-mode/.test(css)) say('wanderer.css: смешение слоёв (mix-blend-mode) — тяжело для телефона');
  if (/:hover[^{]*\{[^}]*filter/.test(css)) say('wanderer.css: фильтр на наведении');
  if (!/@media \(prefers-reduced-motion:reduce\)/.test(css)) say('wanderer.css: нет правил «меньше движения»');
}

/* ================== 6. артефакты ================== */
{
  const P = load(), T = P.T;
  fresh(P); T.S.seg.profile = 'arts';
  const a = id => WD.art.list.find(x => x.id === id);
  const v = id => `${id}:${op(T)}`;
  if (T.WN_SRV.up(uop(), 'a1').refuse !== 'cap') say('артефакт на потолке цикла поднимается выше');
  let s = snap(T), vu = v('a3');
  run('улучшить', () => T.ACT.wnup(vu)); cnt.ops++;
  if (T.S.wn.art.a3 !== 2 || T.S.wallet.souls !== s.souls - a('a3').soul * 2) say('уровень артефакта: не база × номер уровня');
  s = snap(T); run('повтор', () => T.ACT.wnup(vu));
  if (!eq(snap(T), s)) say('повтор улучшения списал второй раз');
  s = snap(T); const vb = v('a6');
  run('купить', () => T.ACT.wnbuy(vb)); cnt.ops++;
  if (T.S.wn.art.a6 !== 0 || T.S.wallet.gold !== s.gold - a('a6').gold) say('покупка артефакта: не золото или не уровень 0');
  run('повтор', () => T.ACT.wnbuy(vb));
  if (T.S.wallet.gold !== s.gold - a('a6').gold) say('повтор покупки списал второй раз');
  if (T.WN_SRV.buy(uop(), 'a9').refuse !== 'cycle') say('артефакт цикла III куплен в цикле II');
  T.S.mem.cyc = 3;
  if (T.WN_SRV.buy(uop(), 'a9').res === undefined) say('артефакт цикла III не куплен в цикле III');
  if (T.wnCap(a('a2')) !== 3) say('потолок уровня в цикле III для артефакта цикла I — не III');
  T.S.acc.level = 3;
  if (T.WN_SRV.buy(uop(), 'a18').refuse !== 'level') say('артефакты открыты раньше своего уровня Странника (EN_WANDERER.art.rules.openLevel — сценарий «Старт с чистого листа»)');
  T.S.acc.level = 24; T.S.wallet.gold = 10;
  s = snap(T);
  if (T.WN_SRV.buy(uop(), 'a18').refuse !== 'gold' || !eq(snap(T), s)) say('нехватка золота: не отказ или расход');
  T.S.wallet.souls = 0;
  if (T.WN_SRV.up(uop(), 'a2').refuse !== 'souls') say('нехватка душ: не отказ');
}

/* ================== 7. достижения ================== */
{
  const P = load(), T = P.T;
  fresh(P); T.S.seg.profile = 'ach';
  const ready = W.ach.list.filter(a => T.wnReady(a));
  if (!ready.length) say('демо: ни одного достижения к получению');
  const a = ready.find(x => x.cat === 'pers') || ready[0], s = snap(T), vc = `${a.id}:${op(T)}`;
  const want = T.wnChest(a, 2);
  run('получить', () => T.ACT.wnclaim(vc)); cnt.ops++;
  const got = T.S.bag.chests.slice(s.chests);
  if (!T.S.wn.ach.got[a.id]) say('достижение не получено');
  if (got.length !== want.length || !want.length || got.some((c, i) => c.box !== want[i].box || c.r !== want[i].r || c.cyc !== 2 || c.win !== want[i].win)) say('сундук за достижение не по строке «Достижения» lootboxes.js на цикл II');
  const row = T.LBX.modes.feats.layers.flatMap(l => l.rows).find(r => r.label === 'Персональные');
  if (a.cat === 'pers' && (!row || want[0].r !== row.cyc[2][0].r)) say('редкость сундука не из lootboxes.js');
  run('повтор', () => T.ACT.wnclaim(vc));
  if (T.S.bag.chests.length !== got.length + s.chests) say('повтор получения выдал второй сундук');
  const not = W.ach.list.find(x => !T.wnReady(x) && !T.S.wn.ach.got[x.id]);
  const s2 = snap(T);
  if (T.WN_SRV.claim(uop(), not.id).refuse !== 'goal' || !eq(snap(T), s2)) say('невыполненное достижение получено');
  /* таинственные: условие скрыто до получения */
  T.S.seg.wnach = 'myst';
  let h = view(P, 'достижения · таинственные'), txt = playerText(h);
  const hid = W.ach.list.filter(x => x.cat === 'myst' && !T.S.wn.ach.got[x.id] && !T.wnReady(x));
  for (const x of hid) if (txt.includes(x.n) || txt.includes(x.d)) say(`таинственное «${x.id}» видно игроку до получения`);
  const m = hid[0]; T.S.wn.ach.n[m.m] = m.goal;   // сервер отметил находку
  h = view(P, 'достижения · таинственное выполнено');
  if (!playerText(h).includes(m.n)) say('выполненное таинственное не раскрылось');
  /* первенства: только свои; в цикле II — пять */
  T.S.seg.wnach = 'first';
  h = view(P, 'достижения · первенства');
  if ((h.match(/class="wn-first[ "]/g) || []).length !== 5) say('первенств цикла II на экране не пять');
  const mine = W.ach.firsts.find(f => T.S.wn.ach.first[f.id] === '@' && !T.S.wn.ach.got[f.id]), other = W.ach.firsts.find(f => T.S.wn.ach.first[f.id] && T.S.wn.ach.first[f.id] !== '@');
  if (T.WN_SRV.claim(uop(), other.id).refuse !== 'goal') say('чужое первенство можно забрать');
  const n0 = T.S.bag.chests.length;
  run('первенство', () => T.ACT.wnclaim(`${mine.id}:${op(T)}`)); cnt.ops++;
  const fr = T.LBX.modes.feats.layers.flatMap(l => l.rows).find(r => r.label === 'Первенство сервера').cyc[2][0];
  const c = T.S.bag.chests[n0];
  if (!c || c.r !== fr.r || c.win !== fr.win) say('сундук первенства не по строке «Первенство сервера»');
}

/* ================== 7б. вкладка «Достижения» с воздухом ==================
   Разделы и их порядок, ближайшие, одна карточка на серию, полученное свёрнуто, правила воздуха карточки, лист «когда получают» */
{
  const P = load(), T = P.T;
  fresh(P); T.S.seg.profile = 'ach';
  /* карточки по порядку: от начала карточки до начала следующей — первый лист, который она открывает */
  const cardIds = h => { const st = [...h.matchAll(/<(?:div|button) class="wn-feat/g)].map(x => x.index);
    return st.map((s, k) => (h.slice(s, k + 1 < st.length ? st[k + 1] : h.length).match(/data-v="wnfeat:([^"]+)"/) || [])[1]).filter(Boolean); };
  const secOf = (h, t) => { const i = h.indexOf(`<span class="eyebrow">${t}</span>`); if (i < 0) return null; const j = h.indexOf('</section>', i); return h.slice(i, j); };
  for (const cat of ['pers', 'rev', 'myst']) {
    T.S.seg.wnach = cat; T.S.seg.wngot = '0';
    const h = view(P, `вкладка · ${cat} · полученное свёрнуто`), body = h.slice(h.indexOf('wn-achb'));
    const ids = cardIds(body), series = ids.map(id => W.ach.list.find(a => a.id === id).s);
    if (new Set(series).size !== series.length) say(`вкладка ${cat}: у серии больше одной карточки`);
    const openS = T.wnSeries(cat).filter(x => !x.done);
    if (ids.length !== openS.length) say(`вкладка ${cat}: карточек ${ids.length}, серий в пути ${openS.length}`);
    const near = secOf(body, 'Ближайшие');
    if (cat !== 'myst' && !near) say(`вкладка ${cat}: нет раздела «Ближайшие»`);
    if (near && cardIds(near).length > T.WN_ACH_VIEW.near) say(`вкладка ${cat}: ближайших больше ${T.WN_ACH_VIEW.near}`);
    const ready = openS.filter(x => T.wnReady(x.cur));
    if (ready.length && !secOf(body, 'Можно получить')) say(`вкладка ${cat}: готовые не наверху`);
    if (ready.length && body.indexOf('Можно получить') > body.indexOf('Ближайшие') && body.includes('Ближайшие')) say(`вкладка ${cat}: «Можно получить» ниже «Ближайших»`);
    const got = W.ach.list.filter(a => a.cat === cat && T.S.wn.ach.got[a.id]);
    if (got.length && !/class="wn-gotbar"[^>]*aria-expanded="false"/.test(body)) say(`вкладка ${cat}: полученное не свёрнуто`);
    if (/class="wn-gotr"/.test(body)) say(`вкладка ${cat}: полученное видно, хотя свёрнуто`);
    /* правила воздуха: карточка — не больше двух чисел, двух меток (кристалл редкости, метка), одного действия */
    const starts = [...body.matchAll(/<(?:div|button) class="wn-feat/g)].map(x => x.index);
    starts.forEach((s, k) => {
      const card = body.slice(s, k + 1 < starts.length ? starts[k + 1] : body.indexOf('</section>', s)), t = playerText(card);
      const nums = (t.match(/\d[\d\s ]*/g) || []).filter(x => x.trim()).length;
      const chips = (card.match(/class="(?:chip|rar)[" ]/g) || []).length, acts = (card.match(/<button class="btn/g) || []).length;
      if (nums > 2 || chips > 2 || acts > 1) say(`вкладка ${cat}: карточка ${cardIds(card)[0] || k} — чисел ${nums}, меток ${chips}, действий ${acts}`);
    });
    T.S.seg.wngot = '1';
    const h2 = view(P, `вкладка · ${cat} · полученное раскрыто`);
    if ((h2.match(/class="wn-gotr"/g) || []).length !== got.length) say(`вкладка ${cat}: раскрыто не всё полученное`);
  }
  /* лист: условие, награда, «когда получают»; тайна до выполнения — без условия */
  const a = W.ach.list.find(x => x.cat === 'pers' && x.ks > 1 && !T.S.wn.ach.got[x.id]);
  T.S.overlay = { t: 'wnfeat', arg: a.id };
  let h = view(P, 'лист достижения'), t = playerText(h);
  if (!t.includes(a.d) || !t.includes('Когда получают') || !t.includes(T.wnWhen(a)) || !/class="wn-str/.test(h)) say('лист достижения: нет условия, «когда получают» или ступеней серии');
  const hid = W.ach.list.find(x => x.cat === 'myst' && !T.S.wn.ach.got[x.id] && !T.wnReady(x));
  T.S.overlay = { t: 'wnfeat', arg: hid.id }; t = playerText(view(P, 'лист тайны'));
  if (t.includes(hid.d) || !t.includes(hid.hint)) say('лист тайны: условие видно или нет подсказки');
  T.S.overlay = null;
}

/* ================== 7г. блоки «Серии цикла N» на вкладке ==================
   Свой и прошлые циклы раскрыты, будущие — одной строкой «Цикл N» под замком: без имён, условий и подсказок; блок цикла «для команды»
   игроку не рисуется вовсе — ни на вкладке, ни в листе, ни в служебной справке. Закрытое не получить, открытое — сундук по циклу получения.
   Демо-цикл команды показывает аккаунт обычного игрока на доле этого цикла и не трогает состояние аккаунта.
   Мутация: замок блока снят — утечку обязан поймать закон вкладки */
{
  const BL = WD.ach.blocks, blk = WD.ach.list.filter(a => a.c != null);
  const words = a => [a.d, a.hint, a.n.length >= 10 || a.n.includes(' · ') ? a.n : null].filter(Boolean);
  /* что видно из закрытых блоков при цикле cyc: вкладки всех категорий и листы всех закрытых достижений. Блок «для команды» ищем
     в сырой разметке — его нет и в служебных вставках; остальные — в тексте игрока */
  const leak = (P, cyc, team) => {
    const T = P.T, out = [];
    run('режим', () => T.setTeam(team));
    fresh(P, { cyc }); T.S.seg.profile = 'ach';
    const shut = blk.filter(a => a.c > cyc || (a.team && !team)), tabs = {};
    let raw = '';
    for (const c of ['pers', 'rev', 'myst']) { T.S.seg.wnach = c; T.S.seg.wngot = '1'; T.S.overlay = null; tabs[c] = view(P, `блоки · ${c} · цикл ${cyc}${team ? ' [команда]' : ''}`); raw += '\n' + tabs[c]; }
    for (const a of shut) { T.S.overlay = { t: 'wnfeat', arg: a.id }; raw += '\n' + view(P, `лист закрытого достижения ${a.id} · цикл ${cyc}${team ? ' [команда]' : ''}`); }
    T.S.overlay = null;
    const seen = playerText(raw);
    for (const a of shut) for (const t of words(a)) if ((a.team && !team ? raw : seen).includes(t)) out.push(`${a.id} «${t}»`);
    return { out, tabs, shut };
  };
  const bars = h => (h.match(/class="wn-blkbar"/g) || []).length, cards = (h, c) => (h.match(new RegExp(`data-v="wnfeat:b${c}-`, 'g')) || []).length;
  const has = (cat, c) => blk.some(a => a.cat === cat && a.c === c);
  const P = load(), T = P.T;
  for (const [cyc, team] of [[1, false], [2, false], [4, false], [6, false], [6, true], [2, true]]) {
    const R = leak(P, cyc, team), tag = `цикл ${cyc}${team ? ', команда' : ', игрок'}`;
    if (R.out.length) say(`блоки, ${tag}: видно закрытое — ${R.out.slice(0, 4).join('; ')}`);
    for (const cat of ['pers', 'rev', 'myst']) {
      const want = BL.cycles.filter(c => has(cat, c) && (c > cyc || (BL.team.includes(c) && !team))).length;
      if (bars(R.tabs[cat]) !== want) say(`блоки, ${tag}, вкладка ${cat}: закрытых заголовков «Цикл N» ${bars(R.tabs[cat])}, ждём ${want}`);
      for (const c of BL.cycles) {
        const open = c <= cyc && !(BL.team.includes(c) && !team);
        if (!open && cards(R.tabs[cat], c)) say(`блоки, ${tag}, вкладка ${cat}: карточки закрытого блока цикла ${c}`);
        if (open && c === cyc && has(cat, c) && !cards(R.tabs[cat], c)) say(`блоки, ${tag}, вкладка ${cat}: блок своего цикла не раскрыт`);
      }
    }
  }
  run('режим', () => T.setTeam(false));
  /* сервер: закрытое не получить; в своём цикле — сундук по строке «Достижения» lootboxes.js на цикл получения */
  fresh(P, { cyc: 2 }); T.S.seg.profile = 'ach';
  const a4 = blk.find(a => a.c === 4 && a.cat === 'pers' && a.ks > 1 && a.k === 1);
  T.S.wn.ach.n[a4.m] = a4.goal;
  let s = snap(T);
  if (!T.wnLocked(a4) || T.wnReady(a4) || T.WN_SRV.claim(uop(), a4.id).refuse !== 'goal' || !eq(snap(T), s)) say('блоки: достижение будущего цикла получено раньше своего цикла');
  T.S.acc.cycle = 4;
  if (T.wnLocked(a4) || !T.wnReady(a4)) say('блоки: в своём цикле достижение блока закрыто или счётчик не засчитан');
  const want4 = T.wnChest(a4, 4), n0 = T.S.bag.chests.length;
  run('получить в блоке', () => T.ACT.wnclaim(`${a4.id}:${op(T)}`)); cnt.ops++;
  const got4 = T.S.bag.chests.slice(n0), row4 = T.LBX.modes.feats.layers.flatMap(l => l.rows).find(r => r.label === 'Персональные').cyc[4][0];
  if (!T.S.wn.ach.got[a4.id] || got4.length !== want4.length || !got4.length || got4[0].r !== row4.r || got4[0].cyc !== 4) say('блоки: сундук за достижение блока — не по строке «Достижения» lootboxes.js на цикл получения');
  /* карточка серии блока: имя серии без номера ступени, ступени — отметками; чисел по-прежнему не больше двух */
  T.S.seg.wnach = 'pers'; T.S.seg.wngot = '0';
  {
    const h = view(P, 'блоки · карточки цикла IV'), st = [...h.matchAll(/<(?:div|button) class="wn-feat/g)].map(x => x.index);
    st.forEach((i, k) => { const card = h.slice(i, k + 1 < st.length ? st[k + 1] : h.indexOf('</section>', i)), id = (card.match(/data-v="wnfeat:(b\d-[^"]+)"/) || [])[1]; if (!id) return;
      const nums = (playerText(card).match(/\d[\d\s ]*/g) || []).filter(x => x.trim()).length;
      if (nums > 2) say(`блоки: на карточке ${id} чисел ${nums} — больше двух`); });
    if (!/class="wn-sec wn-blk"><span class="eyebrow">Цикл IV/.test(h)) say('блоки: у раскрытого блока своего цикла нет заголовка «Цикл IV»');
  }
  /* демо-цикл команды (переключатель виден только в режиме «Команда»): свои счётчики и полученное; состояние аккаунта не тронуто;
     назад — снова аккаунт */
  run('режим', () => T.setTeam(true));
  fresh(P, { cyc: 2 }); T.S.seg.profile = 'ach';
  const before = JSON.stringify(T.S.wn.ach);
  run('демо-цикл', () => T.ACT.wncyc('5'));
  const b5 = blk.filter(a => a.c === 5 && !a.est);
  if (!T.S.wn.demo || T.S.wn.demo.c !== 5 || T.wnCyc() !== 5) say('демо-цикл: состояние демо не собрано');
  else {
    if (!b5.some(a => T.wnGot(a.id)) || !b5.some(a => !T.wnGot(a.id) && T.wnProg(a) > 0)) say('демо-цикл V: в блоке нет ни полученного, ни начатого — счётчики обычного не подставлены');
    if (!WD.ach.list.filter(a => a.c == null && !a.est && a.at.o != null && a.at.o < WD.ach.demoBy[5].day).every(a => T.wnGot(a.id))) say('демо-цикл V: вехи начала пути, взятые раньше, не отмечены полученными');
    view(P, 'демо-цикл V · вкладка');
  }
  if (JSON.stringify(T.S.wn.ach) !== before) say('демо-цикл: состояние достижений аккаунта изменилось');
  run('демо-цикл назад', () => T.ACT.wncyc('2'));
  if (T.S.wn.demo || JSON.stringify(T.S.wn.ach) !== before) say('демо-цикл: возврат к циклу аккаунта не вернул его состояние');
  run('режим', () => T.setTeam(false));
  /* мутация: замок блоков снят — закон вкладки обязан увидеть утечку */
  {
    const P2 = load();
    try { vm.runInContext('wnLocked = () => false;', P2.ctx); } catch (e) { say('мутация «замок блоков снят»: не применилась — ' + e.message); }
    const n = err.length, R = leak(P2, 2, false);
    err.length = n;   // ошибки отрисовки мутанта — не ошибки экрана
    cnt.mut = (cnt.mut || 0) + 1;
    if (R.out.length) cnt.caught = (cnt.caught || 0) + 1; else say('мутация «замок блоков снят»: закон вкладки её не поймал');
  }
}

/* ================== 7в. живые счётчики: те же числа, что на экранах ритуалов, снаряжения, Арены и События ================== */
{
  const P = load(), T = P.T;
  fresh(P); T.S.seg.profile = 'ach';
  const S = T.S, cnt = m => T.wnProg({ m });
  const want = {
    rituals: S.rituals ? S.rituals.done : null,
    equip: S.eq ? S.eq.count : null,
    arena: S.arena ? S.arena.wins + (S.arena.past ? S.arena.past.wins : 0) : null,   // побед за всё время прототип не хранит: сезон и прошлый
    league: S.arena && S.arena.lg ? S.arena.lg.wins + (S.arena.lg.past ? S.arena.lg.past.wins : 0) : null,
    /* высшая планка недели: эта неделя или итог прошлой — его платят «Дары» (EN_EV.past) */
    plank: S.event && T.evPlanks ? Math.max(T.evPlanks().filter(x => x.got).length, T.evPastK ? T.evPastK() : 0) : null,
  };
  for (const [m, v] of Object.entries(want)) {
    if (!W.ach.list.some(a => a.m === m)) { say(`7в: счётчика ${m} нет в каталоге`); continue; }
    if (v == null) { if (!MISSING.size) say(`7в: нет состояния экрана для счётчика ${m}`); continue; }
    if (cnt(m) !== v) say(`7в: счётчик ${m} на вкладке — ${cnt(m)}, на экране режима — ${v}`);
  }
  for (const a of W.ach.list) {
    if (a.cat === 'myst' || !S.wn.ach.got[a.id] || want[a.m] == null) continue;
    if (want[a.m] < a.goal) say(`7в: «${a.n}» получено, а на экране режима ${want[a.m]} из ${a.goal}`);
  }
}

/* ================== 8. вид: «Игрок» и «Команда» ================== */
for (const team of [false, true]) {
  const P = load(), T = P.T, tag = team ? ' [команда]' : '';
  run('режим', () => T.setTeam(team));
  const teamSeen = [];
  for (const cyc of [1, 2, 4, 6]) {
    fresh(P, { cyc, skip: true });
    for (const t of ['over', 'mem', 'arts', 'ach']) {
      T.S.route = 'profile'; T.S.seg.profile = t; T.S.overlay = null;
      if (t !== 'ach') { const h = view(P, `Странник · ${t} · цикл ${cyc}${tag}`); if (team) teamSeen.push(teamCount(h)); continue; }
      for (const c of W.ach.cats) for (const g of ['0', '1']) { T.S.seg.wnach = c.id; T.S.seg.wngot = g; view(P, `достижения · ${c.id} · цикл ${cyc}${g === '1' ? ' · полученное раскрыто' : ''}${tag}`); }
    }
    /* окна и листы */
    T.S.route = 'profile'; T.S.seg.profile = 'mem';
    for (const i of ['', '0', '1', '4']) { T.S.overlay = { t: 'mem', arg: i }; view(P, `окно Памяти ${i || 'первое'} · цикл ${cyc}${tag}`); }
    T.S.overlay = { t: 'memreset' }; view(P, `сброс · цикл ${cyc}${tag}`);
    for (let r = 0; r <= 7; r++) { T.S.seg.wnrar = String(r); T.S.overlay = { t: 'wncat' }; view(P, `каталог · ${r}${tag}`); }
    T.S.mem.q = 'руна'; T.S.seg.wnrar = '0'; T.S.overlay = { t: 'wncat' };
    const hq = view(P, `каталог · поиск${tag}`); if (!/wn-row/.test(hq)) say('каталог: поиск «руна» ничего не нашёл'); T.S.mem.q = '';
    for (const p of WD.passives.filter((_, k) => k % 7 === 0)) { T.S.overlay = { t: 'wnp', arg: p.id }; view(P, `пассивка ${p.id}${tag}`); }
    for (const a of WD.art.list) { T.S.overlay = { t: 'wnart', arg: a.id }; view(P, `артефакт ${a.id} · цикл ${cyc}${tag}`); }
    for (const a of WD.ach.list.concat(WD.ach.firsts)) { T.S.overlay = { t: 'wnfeat', arg: a.id }; view(P, `достижение ${a.id}${tag}`); }
    for (const t of ['wnpas', 'wnfame']) { T.S.overlay = { t }; view(P, `лист ${t} · цикл ${cyc}${tag}`); }
  }
  /* окно с анимацией и подтверждением */
  fresh(P, { skip: false });
  T.S.overlay = { t: 'mem', arg: '' }; view(P, `окно · анимация${tag}`);
  T.S.mem.anim = null; T.S.mem.shown = { '0:0': true }; T.S.mem.slots[0].free = 0; T.S.mem.ask = 'roll'; view(P, `окно · подтверждение${tag}`);
  /* сборка, переброс с боем стекла, окно ухода после «Вспомнить», место ждёт и принимает осколок */
  fresh(P, { skip: false });
  run('Вспомнить', () => T.ACT.wnmem('0')); view(P, `окно · сборка${tag}`); P.advance(1); run('en-render', () => T.wnSync()); P.advance(5000);
  run('переброс', () => T.ACT.wnroll(`0:${T.S.mem.offer[0].n}:${op(T)}`)); view(P, `окно · переброс${tag}`); P.advance(1); run('en-render', () => T.wnSync()); P.advance(5000);
  const oo = T.S.mem.offer[0];
  run('Вспомнить', () => T.ACT.wnpin(`0:${oo.n}:0:${op(T)}`)); view(P, `окно ухода${tag}`); P.advance(1); run('en-render', () => T.wnSync());
  P.advance(T.WN_VIEW.breakMs); view(P, `место ждёт осколок${tag}`); P.advance(T.WN_VIEW.flyMs + 1); view(P, `место приняло осколок${tag}`); P.advance(3000);
  /* сценарии «Странника» */
  for (const [t, , f] of T.FLOWS.filter(x => /Памят|Артефакт|Достижени/.test(x[0]))) { fresh(P, { skip: true }); run('сценарий ' + t, () => f()); view(P, `сценарий «${t}»${tag}`); }
  if (team && !teamSeen.some(Boolean)) say('режим «Команда»: на экране «Странник» нет служебного — демо и пояснения не размечены');
}

/* ================== 9. UI-кит и карта экранов ================== */
{
  const P = load(), T = P.T;
  const kit = T.KIT_EXTRA.find(x => { try { return /Память Странника/.test(x.html()); } catch (_) { return false; } });
  if (!kit) say('UI-кит: нет раздела «Память Странника» в KIT_EXTRA');
  else {
    const h = kit.html();
    for (let r = 1; r <= 7; r++) if (!new RegExp(`id="wnKit${r}"`).test(h) || !new RegExp(`class="wn-card[^"]*" data-r="${r}"`).test(h)) say(`UI-кит: нет карты редкости ${r}`);
    if (/undefined|NaN/.test(h)) say('UI-кит: undefined или NaN');
    /* новые состояния: сцена «Вспомнить», наведение, выбор, неактивное, места-осколки, восемь значков, лестница сборки по редкостям */
    if (!/id="wnKitPick"/.test(h) || !/id="wnKitSlot"/.test(h)) say('UI-кит: нет сцены «Вспомнить» с местом Памяти');
    for (const [c, t] of [['hov', 'наведение'], ['on', 'выбрано'], ['dim', 'неактивное']]) if (!new RegExp(`class="wn-card[^"]*\\b${c}\\b`).test(h)) say(`UI-кит: нет состояния карты «${t}»`);
    if (!['lock', 'open', 'set'].every(s => new RegExp(`class="wn-slot ${s}`).test(h))) say('UI-кит: места Памяти не во всех трёх состояниях');
    if ((h.match(/<figure class="wn-kc wn-ki">/g) || []).length !== 8) say('UI-кит: значков-осколков не восемь — семь редкостей и пустое место');
    if ((h.match(/<tr data-r="\d">/g) || []).length !== 7) say('UI-кит: в лестнице сборки не все семь редкостей');
    for (const k of ['all', 'reroll', 'pick', 'back', '1', '7']) if (!h.includes(`data-wnkit="${k}"`)) say(`UI-кит: нет кнопки «${k}»`);
    /* кнопки раздела: сборка редкости, все по очереди, переброс, «Вспомнить», «Сначала» — без исключений и с частицами */
    const box = T.doc.getElementById('wnKit'); let click = null;
    box.addEventListener = (t, f) => { if (t === 'click') click = f; };
    run('UI-кит · paint', () => kit.paint());
    if (!click) say('UI-кит: кнопки раздела не слушаются');
    else for (const k of ['7', 'all', 'reroll', 'pick', 'back', 'pick']) {
      P.fxLog.length = 0;
      run('UI-кит · ' + k, () => click({ target: { closest: () => ({ dataset: { wnkit: k } }) } }));
      P.advance(5000);
      if (k !== 'back' && !P.fxLog.some(x => x.k === 'burst')) say(`UI-кит: «${k}» — без частиц`);
    }
  }
  /* раздел «Достижения Странника»: карточка серии во всех состояниях, тайна, полученное, первенства, семь редкостей */
  const ka = T.KIT_EXTRA.find(x => { try { return /Достижения Странника/.test(x.html()); } catch (_) { return false; } });
  if (!ka) say('UI-кит: нет раздела «Достижения Странника» в KIT_EXTRA');
  else {
    const h = run('UI-кит · достижения', () => ka.html()) || '';
    if (/undefined|NaN/.test(h)) say('UI-кит, достижения: undefined или NaN');
    for (const [re, t] of [[/class="wn-feat hid"/, 'тайна'], [/class="wn-feat ready"/, 'можно получить'], [/class="wn-feat got"/, 'получено'], [/class="wn-feat" data-r/, 'в пути'],
      [/class="wn-steps"/, 'ступени серии'], [/class="wn-gotbar"/, 'полученное свёрнуто'], [/class="wn-gotr"/, 'строка полученного']]) if (!re.test(h)) say(`UI-кит, достижения: нет «${t}»`);
    if ((h.match(/class="wn-first[ "]/g) || []).length !== 4) say('UI-кит, достижения: первенства не во всех четырёх состояниях');
    if ((h.match(/class="wn-krr"/g) || []).length !== 7) say('UI-кит, достижения: не все семь редкостей');
  }
  const m = T.MAP.find(x => x.n === 'Странник');
  if (!m || !m.ready || !['wanderer-passives', 'artifacts', 'achievements', 'server-firsts'].every(id => m.ready.includes(id))) say('карта экранов: «Странник» не отмечен готовым');
  if (!/\.p-old\.ok/.test(html) || !/готово в прототипе/.test(html)) say('карта экранов: нет отметки «готово в прототипе»');
}

done();
