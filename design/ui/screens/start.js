/* screens/start.js — режим «Чистый лист» и уровень Странника (GDD §16, §31; ADR-0018, ADR-0019, ADR-0031).
   Слово автора 01.10.2026: «…показать как игра выглядит с чистого листа, то есть продумать моменты в страннике и уровне аккаунта и награды
   в нём за уровень в виде попапа, чтобы ознакомить игрока со всеми механиками на старте за 2 биома…».
   Данные и алгоритм «сервера» уровня — window.EN_START и EnStart (design/ui/start.js, сборщик tools/content-gen/start/build.js): этапы,
   пороги опыта, награды, открытия, слово проводника, ворота разделов и мест отряда. Здесь — показ и «сервер» прототипа.
   Регистрирует:
   — режим аккаунта прототипа: демо (как было) или «Чистый лист» — новый аккаунт с нуля (obFresh): уровень 0, пустой кошелёк и запасы,
     ни одного героя, Мастерская форм — рубеж спуска. Переключатель «Аккаунт» — в панели прототипа (index.html, #devAcc); выбор помнит
     localStorage, без него — демо. initialState в режиме «Чистый лист» отдаёт новый аккаунт: «Сбросить» начинает сценарий заново;
   — «сервер» уровня (OB_SRV): вехи опыта §16 — каждая один раз (EnStart.fact), этапы — из состояния; уровень и награда — одна операция
     с номером (EnStart.claim), повтор номера ничего не выдаёт. Награда — в кошелёк, запасы (BAG), сундуки, осколки и руну обучения;
   — окно уровня (obPopHtml): поверх любого экрана, кроме идущего боя, по одному, очередью; «Уровень N», полученное с анимацией,
     открывшееся голосом проводника и одна кнопка «Попробовать» — к механике (OB_GO). «Позже» — закрыть;
   — лист «Уровень Странника» (OV.level, и у демо-аккаунта): уровень, опыт, следующий этап, таблица уровней 1–10, формула дальше, вехи;
   — ворота: разделы шахты (NAV_OPEN), вкладки «Ремесла» и Призыва, места отряда (obSlotLock — его зовёт screens/heroes.js), путь вниз:
     страж пал — биом пройден, открыт следующий (§8.6); страж леса — цикл II;
   — героя обучения в отряд боя — той же записью, что у прогонов (rsAdd, фикстура отряда демо): бой прототипа и сборщика один;
   — «Следующий шаг» Убежища в режиме «Чистый лист» — этап следующего уровня и кнопка к нему; дела Недели — с её открытием;
   — сценарий презентации, раздел на карте экранов (#obMap) и раздел UI-кита «Окно уровня»;
   — обучение по сценарию (ADR-0040): шаги EN_START.script, «сервер» разрешает только текущий шаг — ворота действий ACT и операций
     (HD_SRV, WS_SRV, GD_SRV, startRun, Лавка LV_SRV, сундуки zpOpen, артефакты WN_SRV); закрытое — с замком и причиной «откроется на N-м
     уровне»; кнопка шага — в итоге забега, на «Спуске», в записке Убежища; добыча забега обучения — из таблицы EN_START.loot; первый
     рецепт — карточкой в окне уровня 6, пометкой Этриона у стола и найденным листом в книге; сундук уровня 3 — с содержимым сценария,
     Лавка — витрина обучения и одна покупка, первый артефакт — свой и до своего уровня (EN_START.tut);
   — пропуск обучения: «Пропустить обучение» в окне уровня, в Убежище и в настройках, подтверждение с итогом (EN_START.skip), одна
     операция OB_SRV.skip с номером; переход I → II — после пропуска и после последнего шага операцией цикла CY_SRV.advance,
     окно — «Событие нового цикла» (screens/cycle.js, ADR-0041) со своим содержимым для цикла II;
   — погружения Подземного леса (ADR-0049, EN_START.dives): перед каждым погружением — урок (obLesPopHtml) тем же окном, что уровень:
     номер погружения, слово проводника и данные игры — приёмы героя, что открыла доблесть, круг стихий, угроза танка, хозяйка леса;
     «Попробовать» — к окну урока; урок открывается снова из записки Убежища и листа уровня. Сид добычи погружения — сервера сценария
     (забег полного пути), дар погружения — в конце забега операцией OB_SRV.gift по номеру забега, повтор ничего не выдаёт; итог забега
     показывает дар.
   Арт окна уровня — OB_ART (п. 4 очереди docs/art-queue.md): рама, медальон, вспышка выдачи, знаки открытий, фонарь опыта, замок раздела;
   без выгрузки — прежний вид средствами CSS.
   Числа вида — OB_VIEW, тексты — OB_TEXT и OB_STEP_T. Движение — только transform и opacity; «меньше движения» — окно сразу, награды стоят.
   Служебное — только команде: TM, PL из index.html. Автопроверка — tools/content-gen/screens/check_start.js. */
'use strict';

/* ================== данные и вид ================== */
const OB_D = window.EN_START || null;
const OB_R = OB_D && window.EnStart ? EnStart.make(OB_D) : null;
/* шаги сценария сверх боя (ADR-0040): сундук уровня с заданным содержимым, витрина и покупка Лавки, первый артефакт — EN_START.tut */
const OB_TU = (OB_D && OB_D.tut) || {};
const OB_VIEW = {
  ring: 46,          // радиус кольца уровня, px вьюбокса 120
  step: 140,         // награды появляются по очереди: шаг, мс
  first: 520,        // первая награда — через столько мс после окна
  maxShow: 6,        // наград строкой — не больше; остальное — «и ещё N»
  holdMs: 0,         // после «Попробовать» следующее окно ждёт смены экрана
  opsMany: 3,        // открытий больше — на узком кадре знак только у главного: иначе список не помещается по высоте
  giftShow: 5,       // дар погружения в итоге забега: предметов значками — не больше; остальное — «и ещё N» (всё — в Запасах)
};
/* арт окна уровня — п. 4 очереди docs/art-queue.md (задание tools/art-gen/jobs/account-level.json), выгрузка assets/art/start/:
   медальон уровня 256 px — под числом вместо кольца опыта; вспышка выдачи 512 px — за медальоном и у каждой награды; рама окна —
   border-image, срез 150 px со всех сторон (уголок с завитками), толщина рамы на листе около 80 px; знаки открытий 256 px — у названий
   открытого, замок закрытого раздела, фонарь опыта. ready — выгруженное: пути нет — прежний вид средствами CSS */
const OB_ART = {
  medal: 'start/medal.webp', burst: 'start/burst.webp', frame: 'start/frame.webp', open: 'start/open-{id}.webp', lock: 'start/open-lock.webp', xp: 'start/open-xp.webp',
  slice: 150,                                                      // срез рамы на листе, px
  icon: { slot2: 'slot', slot3: 'slot', slot4: 'slot', slot5: 'slot' },   // ключ открытия → знак, если знак общий
  ready: ['start/medal.webp', 'start/burst.webp', 'start/frame.webp'].concat(['hire', 'descent', 'dev', 'slot', 'stock', 'shop', 'guard', 'b2', 'craft', 'valor',
    'artifacts', 'limit', 'cycle2', 'echo', 'week', 'souls', 'market', 'memory', 'lock', 'xp'].map(k => `start/open-${k}.webp`)),   // выгрузка 01.10.2026
};
const obArtOn = p => OB_ART.ready.includes(p);
const obOpenArt = k => OB_ART.open.replace('{id}', OB_ART.icon[k] || k);
/* картинка арта или пусто: без выгрузки разметка остаётся прежней */
const obArtImg = (p, cls) => (obArtOn(p) ? `<img class="${cls}" src="${AV(p)}" alt="" decoding="async" draggable="false">` : '');
const OB_TEXT = {
  acc: ['Демо', 'Чистый лист'],
  level: 'Уровень Странника', got: 'Получено', open: 'Открылось', willOpen: 'Откроется', toNext: (n, L) => `до ${L}-го — ${n} опыта`, top: 'опыт набран', tryIt: 'Попробовать', later: 'Позже', more: n => `и ещё ${n}`,
  next: 'Следующий уровень', stage: 'Что сделать', done: 'взято', locked: n => `откроется на ${n}-м уровне Странника`,
  slotLock: n => `Место откроется на ${n}-м уровне`, gift: 'Дар Страннику',
  xpSrc: 'Опыт за вехи', xpNote: 'Опыт даёт только первое достижение вехи; за рецепты опыта нет.',
  formula: 'Дальше каждый уровень просит больше опыта, а дар растёт с уровнем.',
  stepNext: 'Следующий шаг', toDo: 'К делу',
  /* обучение по сценарию и пропуск (ADR-0040) */
  tut: 'Шаг обучения', first: 'Первый рецепт', hintH: 'Пометка Этриона', hintPut: 'Выложить на стол',
  hintNote: 'Положите на стол ровно это — и нажмите «Попробовать».', hintOn: 'На столе — первый рецепт. Нажмите «Попробовать».',
  lockAt: n => `Откроется на ${n}-м уровне Странника`, lockFirst: t => `Сначала — шаг обучения: ${t}`,
  skip: 'Пропустить обучение', skipH: 'Пропустить обучение?', skipGo: 'Пропустить', skipNo: 'Отмена',
  skipLead: 'Сразу в цикл II и первый рейтинг — с тем, что дало бы обучение, пройденное до конца. Вернуться к шагам обучения будет нельзя.',
  skipSquad: 'Отряд', skipWallet: 'Кошелёк', skipRunes: 'Руны', skipStock: 'Запасы', skipOpen: 'Открыто', skipLvl: 'Уровень Странника',
  skipCur: { gold: 'золото', spirit: 'дух', souls: 'души', keys: 'рунные ключи' }, skipAll: n => `всё, что открывают уровни 1–${n}, в том числе:`,
  skipDone: 'Обучение пропущено: цикл II', skipNot: 'Обучение уже пройдено',
  stepDone: 'Обучение пройдено', skipArt: 'артефакт',
  storeLock: 'Лавка Энериума откроется в цикле II',   // слово автора 01.10.2026: «Донатная Лавка во 2 цикле»
  /* погружения Подземного леса и уроки (ADR-0049) */
  dive: (j, n) => `Погружение ${j} из ${n}`, diveGo: j => `Погружение ${j}`, lesson: 'Урок', lesAgain: 'Урок погружения',
  gift: 'Дар погружения', giftNote: 'Лес отдаёт и то, за чем пришлось бы спускаться ещё раз.', giftMore: n => `и ещё ${n}`,
  dives: 'Погружения леса', diveDone: 'пройдено', diveNow: 'следующее',
  valorUp: p => `+${p} % ко всем характеристикам за ступень доблести`,
  elRule: (f, b) => `По следующей стихии круга удар ×${f}, по предыдущей — ×${b}.`, elPair: (a, b, p) => `${a} и ${b} бьют друг друга ×${p}.`,
  elForest: 'Враги леса', elStrong: 'сильнее по', elWeak: 'слабее по', elEven: 'ровно со всеми',
  threat: (k, o) => `Угроза танка ×${k}, у остальных в отряде — ×${o}: враги бьют того, чья угроза выше.`,
  bossRounds: n => `Бой на её этаже — ${n} раундов. Не успел — этаж не взят.`, bossAnon: 'хозяйка леса',
};
/* погружения Подземного леса (ADR-0049): план — EN_START.dives (сборщик tools/content-gen/start/build.js): погружения по порядку — номер
   забега сценария, урок перед погружением, дар после; уроки — данные (data.js, DIVES): проводник, его слово, вид урока и окно. Приёмы
   героев и хозяйки леса, круг стихий, угроза и раунды — из данных игры (kits.js, abilities.js, biome-foes.js, battle.js): после пересборки
   героев (ADR-0050) уроки обновятся сами */
const OB_DV = (OB_D && OB_D.dives) || null;
const obDiveN = () => (OB_DV ? OB_DV.list.length : 0);
const obDive = j => (OB_DV && OB_DV.list[(+j) - 1]) || null;
const obLesOf = j => { const d = obDive(j); return d && OB_DV.lessons[d.lesson] ? OB_DV.lessons[d.lesson] : null; };
const obIsLes = q => typeof q === 'string' && /^d\d+$/.test(q);
/* шаг сценария словами игрока: заголовок и пояснение — для записки Убежища, кнопки «Дальше» и причин замка. Имена — из состава и биомов */
const OB_STEP_T = {
  hire: s => [`Нанять: ${obNm(s.id)}`, 'Место в отряде открыто — герой ждёт в Призыве за золото.', `Нанять: ${obNm(s.id)}`],
  lvl: s => [`Поднять уровни: ${s.to.map(([id, to]) => `${obNm(id)} — ${to}`).join(', ')}`, 'Дух с забегов — в уровни героев.', 'Поднять уровни'],
  chest: () => ['Открыть сундук странника', 'Награда уровня ждёт в Запасах — что внутри, видно на его карточке.', 'Открыть сундук'],
  shop: s => [`Купить в Лавке: ${obItemNm(s.id)} ×${OB_TU.shop ? OB_TU.shop.q : 1}`, 'Алхимик продаёт то, чего этажи не дают.', 'В Лавку'],
  art: s => [`Первый артефакт: ${OB_TU.art ? OB_TU.art.n : s.id}`, 'Души с элит — в постоянную силу аккаунта: купить и поднять до первого уровня.', 'К артефакту'],
  craft: s => [`${OB_TEXT.first}: «${obRecipeName(s.r)}»`, 'Сложите его на столе Мастерской — подсказка уже там.', 'К рецепту'],
  valor: s => [`Доблесть: ${obNm(s.id)}`, 'Руна обучения ждёт своего героя.', `Доблесть: ${obNm(s.id)}`],
  limit: s => [`Рунный предел: ${obNm(s.id)}`, 'Десять рун предела ломают потолок уровня.', `Предел: ${obNm(s.id)}`],
  run: s => (s.d ? [OB_TEXT.dive(s.d, obDiveN()), `${obBiomeNm(s.b)}, урок «${(obLesOf(s.d) || { n: '' }).n}». Отряд готов — дальше вниз.`, OB_TEXT.diveGo(s.d)]
    : [`Забег: ${obBiomeNm(s.b)}`, 'Отряд готов — дальше вниз.', s.no > 1 ? 'Ещё забег' : 'Начать забег']),
  guard: s => ['Рунный страж', 'Вход — за рунные ключи. Страж ждёт за боссом биома.', 'К рунному стражу'],
};
/* куда ведёт «Попробовать» и «К делу»: маршрут и вкладки — из OPEN[ключ].go данных; sel — чья книга: next — следующий герой обучения
   к найму, best — сильнейший, trainee — кому руна обучения, capped — кто упёрся в потолок */
const OB_XPN = { kill: 'Первое убийство нового существа', closure: 'Первое закрытие биома', guard: 'Первый рунный страж', limit: 'Пробитие рунного предела',
  valor: 'Доблесть герою', echo: 'Первая победа над врагом в Эхо', hero: 'Новый герой', cycle: 'Переход на новый цикл' };

/* ================== режим аккаунта ================== */
const OB_KEY = 'en-acc';
const obSaved = () => { try { return localStorage.getItem(OB_KEY) === 'fresh'; } catch (_) { return false; } };
const obSave = on => { try { localStorage.setItem(OB_KEY, on ? 'fresh' : 'demo'); } catch (_) { } };
let OB_MODE = obSaved();
const obOn = () => !!(S && S.ob && S.ob.on);

/* фикстура героев обучения — записи отряда боя демо (S.heroes h1…h5): те же, что в прогонах (tools/content-gen/biomes/sim.js, SQUAD) */
const OB_FIX = (() => {
  const out = {}; if (!OB_D) return out;
  let s = null; try { s = initialState(); } catch (_) { return out; }
  for (const x of OB_D.heroes) {
    const r = RSI[x.id], d = r && r.team && r.team.draft, h = d ? (s.heroes || []).find(y => y.draft === d) : null;
    if (h) out[x.id] = h;
  }
  return out;
})();
function obFixOf(id) {
  const t = OB_FIX[id]; if (!t) return null;
  const h = Object.assign({}, t, { st: t.st.slice(), gr: t.gr.slice(), ab: t.ab.map(a => Object.assign({}, a)), pas: t.pas.map(p => Object.assign({}, p)),
    lvl: 0, cap: INV.hero.capByLim[0], lim: 0, valor: 0, busy: null });
  delete h.keep;
  return bmProp(h);
}
/* герой обучения по id состава: в отряде боя — его запись по черновику */
const obHero = id => { const r = RSI[id], d = r && r.team && r.team.draft; return d ? S.heroes.find(h => h.draft === d) || null : null; };

/* новый аккаунт: всё, что видит игрок, — с нуля; разделы, которых он ещё не видит, остаются как есть и откроются уровнем */
function obFresh(s) {
  if (!OB_R) return s;
  /* k — шаг сценария (EN_START.script), ran — пройдено забегов и стражей сценария; les — уроки погружений, что уже встали в очередь окон,
     gift — выданные дары погружений по номеру забега сценария (ADR-0049) */
  s.ob = { on: true, srv: OB_R.fresh(), queue: [], seen: {}, best: {}, guard: {}, hold: '', got: [], k: 0, ran: 0, les: {}, gift: {} };
  s.acc = { level: 0, xp: 0, next: OB_R.need(0) || 1, cycle: OB_D.start.cycle };
  s.wallet = Object.assign({}, OB_D.start.wallet);
  s.heroes = []; s.selHero = '';
  s.rs.owned = {}; s.rs.shards = {}; s.rs.sel = OB_D.heroes[0].id; s.rs.gsel = ''; s.rs.cyc = 0; s.rs.gcyc = 0; s.rs.val = null;
  s.squads = [{ id: 's1', name: 'Отряд I', m: [null, null, null, null, null] }];
  s.selSquad = 's1'; s.prepSquad = 's1'; s.echoSquad = 's1';
  if (s.sq) { s.sq.sel = { arena: 's1', league: [null, null, null], clan: null }; s.sq.ops = {}; s.sq.seq = 1; s.sq.slot = -1; }
  s.biomes = [{ id: 'b1', cyc: 1, name: 'Мастерская форм', state: 'front' }, { id: 'b2', cyc: 1, name: null, state: 'lock' },
    { id: 'b3', cyc: 2, name: null, state: 'lock' }, { id: 'b4', cyc: 2, name: null, state: 'lock' }];
  s.selBiome = 'b1';
  s.known = []; s.siege = {}; s.lastRun = {}; s.runs = []; s.runNo = 0; s.focus = null; s.gd = { seq: 1, ops: {}, lost: {} };
  s.bag = { items: {}, known: [], chests: [], seq: 0 };
  /* Лавка обучения: витрина задана сценарием (EN_START.tut.shop) — первая витрина нового аккаунта, без обновлений до конца обучения */
  if (s.lv && OB_TU.shop) { Object.assign(s.lv, { gen: OB_SHOP_GEN, buys: 0, ops: {}, seq: 1, en: {}, uw: null, fu: 0, paid: 0, just: null }); s.shop = obShopGoods(); s.sold = []; }
  /* мастерская с нуля: ни обрывков, ни избранного, ни «держал в руках» — книга рецептов нового аккаунта пуста (у демо — свои записи) */
  if (s.ws) Object.assign(s.ws, { cells: s.ws.cells.map(() => null), sel: 0, pick: '', view: 'table', part: {}, fav: [], seen: [], last: null, ops: {}, seq: 1, fx: null, drop: null });
  s.inbox = [];
  if (s.hd) { s.hd.train = 0; s.hd.srv = {}; s.hd.seq = 1; }
  if (s.eq) { s.eq.items = {}; s.eq.worn = {}; s.eq.count = 0; }
  if (s.tal) { s.tal.eq = {}; s.tal.loose = {}; }
  if (s.zp) { if (s.zp.extra) s.zp.extra = {}; if (s.zp.seen) s.zp.seen = {}; }
  if (s.wn) { s.wn.art = {}; s.wn.ach = { got: {}, n: {}, first: {} }; }
  if (s.ws) { s.ws.seen = []; s.ws.part = {}; }
  if (typeof psNew === 'function' && s.pass) s.pass = psNew(s, false);
  if (typeof dgNew === 'function' && s.gift) { s.gift = dgNew(false); if (typeof dgSync === 'function') dgSync(s); }
  if (typeof stNew === 'function' && s.store) s.store = stNew(s, false);
  if (s.echo) { s.echo.score = 0; s.echo.place = null; s.echo.sel = 0; s.echo.slots = s.echo.slots.map(() => null); }
  if (s.ech) { s.ech.avail = 1; s.ech.known = {}; s.ech.pending = {}; s.ech.claimed = {}; s.ech.biomes = []; s.ech.cb = null; }
  if (Array.isArray(s.ranks)) s.ranks = s.ranks.map(r => [r[0], null, r[2]]);
  if (s.market) { s.market.mine = []; s.market.ops = {}; }
  if (s.rituals && Array.isArray(s.rituals.slots)) s.rituals.slots = s.rituals.slots.map(() => ({ st: 'free' }));   // ни одного ритуала: Неделя ещё закрыта
  if (s.soc) { s.soc.rel = {}; if (s.soc.chat && s.soc.chat.rooms) for (const [room, list] of Object.entries(s.soc.chat.rooms)) s.soc.chat.seen[room] = list.length; }   // ни друзей, ни заявок, чат прочитан
  if (s.clan && 'in' in s.clan) s.clan.in = false;   // в клане новый игрок не состоит: кланы — с 10-го уровня
  s.seg.craft = 'stock'; s.seg.heroes = 'hire'; s.seg.hire = 'gold'; s.seg.profile = 'over';
  s.route = 'shelter'; s.overlay = null; s.toast = null;
  return s;
}
/* состояние режима: «Чистый лист» — новый аккаунт и сразу первая операция сервера (уровень 1 — «Начало») */
const obInit0 = initialState;
initialState = function () { const s = obInit0(); if (OB_MODE && OB_R) { obFresh(s); obSync(s); } return s; };
/* ворота разделов шахты: в режиме «Чистый лист» — по данным; демо — как было */
const OB_NAV0 = Object.assign({}, NAV_OPEN);
function obGates() {
  for (const k of Object.keys(NAV_OPEN)) delete NAV_OPEN[k];
  Object.assign(NAV_OPEN, obOn() ? OB_D.gates.nav : OB_NAV0);
}
/* сменить аккаунт прототипа: забеги останавливаются, состояние — новое */
function obSwitch(on) {
  OB_MODE = !!on && !!OB_R; obSave(OB_MODE);
  try { if (typeof loop !== 'undefined' && loop) { clearInterval(loop); loop = null; } } catch (_) { }
  S = initialState(); obGates(); obPaintAcc(); render();
}
function obPaintAcc() {
  try { document.querySelectorAll('[data-acc]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.acc === 'fresh') === OB_MODE))); } catch (_) { }
}

/* ================== «сервер» уровня ================== */
const obLvl = () => (S.ob ? S.ob.srv.lvl : S.acc.level);
const obCap = h => INV.hero.capByLim[Math.min(h.lim || 0, INV.hero.capByLim.length - 1)];
/* вехи этапов сервера: этажи, боссы и стражи биомов, найденные рецепты, потолок героев, цикл */
function obStage(s) {
  const boss = {}; for (const [b, g] of Object.entries(s.siege || {})) if (g && g.killed) boss[b] = 1;
  const kill = {}; for (const id of s.known || []) kill[id] = 1;
  return { floor: s.ob.best, boss, guard: s.ob.guard, recipe: (s.bag.known || []).length, cap: (s.heroes || []).some(h => h.lvl >= obCap(h)), cycle: s.acc.cycle, kill };
}
/* вехи опыта §16 — каждая один раз: первые убийства, герои, закрытие биома, стражи, пределы, доблесть, цикл */
function obFacts(s) {
  const M = s.ob.srv, c = s.acc.cycle, f = (k, kind) => OB_R.fact(M, k, kind, c);
  for (const id of s.known || []) f('kill:' + id, 'kill');
  const mine = s === S && typeof hrMine === 'function' ? hrMine() : (s.heroes || []);
  for (const h of mine) {
    const id = (RSI[h.id] ? h.id : (hrTwin(h) || {}).id) || h.id;
    f('hero:' + id, 'hero');
    for (let v = 1; v <= (h.valor || 0); v++) f(`valor:${id}:${v}`, 'valor');
    for (let k = 1; k <= (h.lim || 0); k++) f(`limit:${id}:${h.valor || 0}:${k}`, 'limit');
  }
  for (const [b, g] of Object.entries(s.siege || {})) if (g && g.killed) f('closure:' + b, 'closure');
  for (const b of Object.keys(s.ob.guard)) f('guard:' + b, 'guard');
}
/* награда уровня — в кошелёк, запасы, сундуки, осколки и руну обучения */
function obGive(s, L, r) {
  s.wallet.gold += r.gold; s.wallet.spirit += r.spirit; s.wallet.keys += r.keys;
  /* сундук сценария (EN_START.tut.chest) — та же запись сундука: его содержимое задаёт сценарий, пока идёт обучение (obIsTutChest) */
  if (r.runes) { const rn = limitRune(1, 1); if (rn) s.bag.items[rn.id] = (s.bag.items[rn.id] || 0) + r.runes; }
  if (r.train && s.hd) s.hd.train += r.train;
  for (const [id, n] of r.items) s.bag.items[id] = (s.bag.items[id] || 0) + n;
  if (r.chest) s.bag.chests.push({ id: 'ch' + (++s.bag.seq), box: r.chest.box, r: r.chest.r, cyc: s.acc.cycle, win: 'step', src: `${OB_TEXT.level} · уровень ${L}` });
  for (const [id, n] of r.shards) s.rs.shards[id] = (s.rs.shards[id] || 0) + n;
}
/* операция: уровни, что можно взять сейчас, и их награды. Номер — S.ob.srv.seq; повтор номера — прежний ответ, ничего не выдаёт */
const OB_SRV = {
  claim(op, s = S) {
    const r = OB_R.claim(s.ob.srv, op, obStage(s));
    if (r.res && !r.again) for (const x of r.res.levels) { obGive(s, x.L, x.reward); s.ob.queue.push(x.L); s.ob.got.push(x.L); }
    obAcc(s);
    return r;
  },
  /* дар погружения (ADR-0049) — в конце забега погружения, операцией по номеру забега сценария: золото, дух, души и предметы однообразных
     забегов, которые погружение заменило (EN_START.dives.gifts). Повтор номера — прежний ответ, ничего не выдаёт; забег без дара — отказ */
  gift(no, s = S) {
    const g = OB_DV && OB_DV.gifts ? OB_DV.gifts[no] : null;
    if (!g || !s.ob) return { refuse: 'none' };
    if (s.ob.gift[no]) return { again: true, res: s.ob.gift[no] };
    s.wallet.gold += g[0]; s.wallet.spirit += g[1]; s.wallet.souls += g[2];
    for (const [id, q] of g[3]) s.bag.items[id] = (s.bag.items[id] || 0) + q;
    s.ob.gift[no] = { no, gift: g };
    return { res: s.ob.gift[no] };
  },
  /* пропуск обучения (ADR-0040) — одна операция с номером того же «сервера» аккаунта: всё, что дало бы обучение, пройденное до конца,
     ставится итогом сценария (EN_START.skip) — с любого шага один и тот же. Повтор номера — прежний ответ, ничего не выдаёт;
     обучение уже пройдено — отказ. Энериум, покупки и всё, что не касается обучения, не трогается */
  skip(op, s = S) {
    const r = OB_R.skip(s.ob.srv, op, OB_D.skip, obTutOf(s));
    if (r.res && !r.again) obApplySkip(s, r.res);
    obAcc(s);
    return r;
  },
};
/* итог сценария — в состояние: отряд, кошелёк обучения, запасы, рецепт, сундуки, осколки, бестиарий, путь вниз; цикл II и окно перехода */
function obApplySkip(s, res) {
  const E = OB_D.skip;
  try { if (s === S && typeof loop !== 'undefined' && loop) { clearInterval(loop); loop = null; } } catch (_) { }
  s.runs = []; s.focus = null; s.insp = null;
  s.acc.cycle = E.cycle;
  for (const [k, n] of Object.entries(E.wallet)) s.wallet[k] = n;
  /* герои — записью отряда боя, как при найме обучения (obFixOf); пределы, доблесть и потолок — итог сценария */
  s.heroes = E.heroes.map(([id, lvl, lim, valor, keep]) => {
    const h = obFixOf(id); if (!h) return null;
    h.lvl = lvl; h.lim = lim; h.valor = valor; h.cap = INV.hero.capByLim[Math.min(lim, INV.hero.capByLim.length - 1)];
    if (keep != null) h.keep = keep;
    return h;
  }).filter(Boolean);
  const sq = s.squads[0]; if (sq) sq.m = sq.m.map((_, i) => (s.heroes[i] ? s.heroes[i].id : null));
  s.selHero = s.heroes.length ? s.heroes[0].id : '';
  s.rs.shards = Object.fromEntries(E.shards.map(x => x.slice()));
  s.bag.items = Object.fromEntries(E.items.map(x => x.slice()));
  s.bag.known = E.recipes.slice();
  /* сундуки — закрытые, со своим номером выдачи; сундук сценария открыт шагом обучения. Лавка — витрина обучения с покупкой сценария,
     артефакты — итог сценария (ADR-0040) */
  s.bag.chests = E.chests.map(c => ({ id: 'ch' + c.no, box: c.box, r: c.r, cyc: c.cyc, win: 'step', src: `${OB_TEXT.level} · уровень ${c.L}` }));
  s.bag.seq = E.chestSeq;
  if (s.lv && OB_TU.shop) { Object.assign(s.lv, { gen: OB_SHOP_GEN, buys: E.bought ? 1 : 0, just: null }); s.shop = obShopGoods(); s.sold = E.bought ? [OB_TU.shop.i] : []; }
  if (s.wn) s.wn.art = Object.assign({}, E.art || {});
  if (s.ws) { s.ws.seen = (E.seen || []).slice(); s.ws.part = {}; s.ws.cells = s.ws.cells.map(() => null); }   // что держал в руках — всё, что прошло через запасы обучения
  if (s.hd) s.hd.train = E.train;
  s.known = E.known.slice();
  for (const b of Object.keys(E.boss)) s.siege[b] = { hp: null, max: null, killed: true };
  s.ob.best = Object.assign({}, E.best); s.ob.guard = Object.assign({}, E.guard);
  s.lastRun = JSON.parse(JSON.stringify(E.lastRun)); s.runNo = E.runNo;
  for (const b of Object.keys(E.guard)) {
    const x = s.biomes.find(y => y.id === b), nx = OB_NEXT[b]; if (x) x.state = 'done';
    if (nx) { const n = s.biomes.find(y => y.id === nx[0]); if (n && n.state !== 'done') { n.state = 'front'; n.name = nx[1]; } }
  }
  const fr = s.biomes.find(y => y.state === 'front'); if (fr) s.selBiome = fr.id;
  s.ob.k = OB_SC.length; s.ob.ran = OB_SC.filter(x => x.no).length; s.ob.queue = []; s.ob.hold = '';
  for (let L = res.from + 1; L <= res.to; L++) s.ob.got.push(L);
  obAcc(s);   // уровень аккаунта — до перехода: недельные таблицы цикла I видят 10-й уровень, как в прохождении
  obCycleOpen(s);
}
/* полоса аккаунта: уровень, опыт внутри уровня и до следующего — S.acc, её читают шапка, «Странник» и лист */
function obAcc(s = S) {
  if (!s.ob) return;
  const b = OB_R.bar(s.ob.srv);
  s.acc.level = b.lvl; s.acc.xp = b.xp; s.acc.next = Math.max(1, b.next);
}
/* сверка: вехи из состояния — в опыт; можно взять уровень — операция сервера; шаг сценария сделан — следующий. true — что-то изменилось */
function obSync(s = S) {
  if (!s || !s.ob || !s.ob.on || !OB_R) return false;
  const xp0 = s.ob.srv.xp, lv0 = s.ob.srv.lvl, k0 = s.ob.k;
  obFacts(s);
  if (OB_R.canNext(s.ob.srv, obStage(s))) OB_SRV.claim('ob' + s.ob.srv.seq, s);
  obAcc(s);
  if (s === S) obAdvance();
  if (s === S) obGates();
  const q0 = s.ob.queue.length; obLesQueue(s);
  return s.ob.srv.xp !== xp0 || s.ob.srv.lvl !== lv0 || s.ob.k !== k0 || s.ob.queue.length !== q0;
}
/* урок погружения встаёт в очередь окон, когда шаг сценария — само погружение: после уровней и шагов, что к нему вели (ADR-0049) */
function obLesQueue(s = S) {
  if (!OB_DV || !s || !s.ob || !obTutOf(s)) return;
  const st = obStepOf(s); if (!st || st.k !== 'run' || !st.d || s.ob.les[st.d] || !obLesOf(st.d)) return;
  s.ob.les[st.d] = 1; s.ob.queue.push('d' + st.d);
}

/* ================== обучение по сценарию (ADR-0040) ==================
   Слово автора 01.10.2026: «на обучении нужно полностью исключить самодеятельность… обучение должно быть просчитано каждым действием, и по сути
   предопределено игрой, что выпадет, что давать». Сценарий — EN_START.script: действия канонического игрока по порядку (сборщик
   tools/content-gen/start/build.js сводит их из прогона ядром). Сервер разрешает только текущий шаг: найм своего героя, дух в уровни до
   уровней шага, первый рецепт, доблесть и предел своему герою, забег и страж своего биома. Остальное закрыто — «откроется на N-м уровне»:
   N — уровень, на котором это действие встретится в сценарии, или конец сценария. Отряд собирается сам, бой решает ядро на постоянном сиде
   биома, добыча — из таблицы сценария (EN_START.loot), а не бросками. Обучение идёт, пока не сделан последний шаг; дальше — свобода цикла II.
   Сервер — здесь: обёртки *_SRV и действий ACT. В игре это проверки сервера, клиент показывает замок и причину */
const OB_SC = (OB_D && OB_D.script) || [];
const OB_END_L = OB_SC.length ? OB_SC[OB_SC.length - 1].L : 0;   // уровень Странника, на котором сценарий кончается
let OB_GATE_OFF = false;   // проверка мутацией: ворота сняты — законы обязаны это поймать (tools/content-gen/screens/check_start.js)
let OB_SEED_OFF = false;   // проверка мутацией: сид погружения — свой номер забега, а не сервера сценария (ADR-0049)
const obTutOf = s => !!(s && s.ob && s.ob.on && OB_SC.length && s.ob.k < OB_SC.length);
const obTut = () => !OB_GATE_OFF && obTutOf(S);
const obStepOf = (s = S) => (obTutOf(s) ? OB_SC[s.ob.k] : null);
const obNm = id => (RSI[id] ? RSI[id].n : id);
const obItemNm = id => { const x = BAG.item(id); return x ? itName(x) : id; };
const obRecipeName = r => { const x = BAG.recipe(r); return x ? x.n : r; };
const obBiomeNm = b => { const x = (S.biomes || []).find(y => y.id === b); return (x && x.name) || (EB.BIOMES[b] ? EB.BIOMES[b].name : b); };
/* герой отряда боя → его id в составе: прототип держит героев обучения записью фикстуры (h1…h5), сценарий — id состава (c1-01…) */
const obRid = h => (h ? ((RSI[h.id] ? h.id : (hrTwin(h) || {}).id) || h.id) : '');
const obTo = (s, rid) => { const t = s && s.k === 'lvl' ? s.to.find(x => x[0] === rid) : null; return t ? t[1] : null; };
/* шаг сделан: найм — герой в коллекции; уровни — все герои шага на своих уровнях; рецепт — найден; доблесть и предел — у героя столько,
   сколько велит сценарий к этому шагу; забег и страж — пройдено забегов сценария не меньше номера шага */
function obStepDone(s, st = S) {
  if (!s) return false;
  const h = s.id ? obHero(s.id) : null;
  switch (s.k) {
    case 'hire': return rsHas(RSI[s.id]);
    case 'lvl': return s.to.every(([id, to]) => { const x = obHero(id); return !!x && x.lvl >= to; });
    case 'craft': return BAG.known(s.r);
    case 'valor': return !!h && (h.valor || 0) >= OB_SC.slice(0, st.ob.k + 1).filter(x => x.k === 'valor' && x.id === s.id).length;
    case 'limit': {
      let n = 0; for (let i = 0; i <= st.ob.k; i++) { const x = OB_SC[i]; if (x.id !== s.id) continue; if (x.k === 'valor') n = 0; else if (x.k === 'limit') n++; }
      return !!h && (h.lim || 0) >= n;
    }
    case 'run': case 'guard': return (st.ob.ran || 0) >= s.no;
    case 'chest': return st.ob.srv.lvl >= s.L && !(st.bag.chests || []).some(obIsTutChestRec);
    case 'shop': return !!st.lv && st.lv.gen === OB_SHOP_GEN && (st.sold || []).includes(OB_TU.shop ? OB_TU.shop.i : -1);
    case 'art': return !!st.wn && st.wn.art[s.id] != null && st.wn.art[s.id] >= s.lv;
  }
  return false;
}
/* ---------- сундук, Лавка, артефакт — шаги с заданным итогом (ADR-0040; EN_START.tut) ----------
   Сундук сценария — сундук награды уровня tut.chest.L (своего вида и редкости, цикл I), пока идёт обучение: его содержимое — данные
   сценария, а не бросок. Его разворачивает obChestDef: та же форма, что EnLoot.resolve, и итог script — EnLoot.roll отдаёт его как есть.
   Лавка обучения — первая витрина нового аккаунта (OB_SHOP_GEN): товары — tut.shop.goods, цена в Энериуме — правило Лавки (LV_DATA) */
const OB_SHOP_GEN = 0;
function obShopGoods() {
  return (OB_TU.shop ? OB_TU.shop.goods : []).map(([id, q, cur]) => {
    const it = BAG.item(id), en = cur === 'gold' || typeof LV_DATA === 'undefined' || !it ? 0 : (LV_DATA.enerium[it.tier] || [])[Math.max(0, it.cyc - 1)] || 0;
    return [id, q, cur, en];
  });
}
const obIsTutChestSp = sp => !!OB_TU.chest && !!sp && sp.box === OB_TU.chest.box && sp.r === OB_TU.chest.r && (sp.cyc || 1) === OB_D.start.cycle && (sp.win || 'step') === 'step';
const obIsTutChest = sp => obTutOf(S) && obIsTutChestSp(sp);
const obIsTutChestRec = c => obIsTutChestSp(c);
const obIsTutGroup = key => typeof zpChestGroups === 'function' && zpChestGroups().some(g => g.key === key && obIsTutChestSp(g.cs));
function obChestDef(sp) {
  const C = OB_TU.chest, items = C.items.map(([id, q]) => ({ line: 'res', r: (BAG.item(id) || { r: 1 }).r, kind: 'item', id, q }));
  const x = items.length ? items[0].r : sp.r;
  return { spec: { box: sp.box, r: sp.r, win: 'step', cyc: sp.cyc, week: null }, cur: C.cur.map(a => a.slice()), n: items.length, window: [[x, 10000]],
    byR: { [x]: [{ line: 'res', w: 1, entries: items.map(it => ({ kind: 'item', id: it.id, q: it.q, w: 1 })) }] }, script: items };
}
if (typeof zpDef === 'function') { const zd0 = zpDef; zpDef = function (sp) { return obIsTutChest(sp) ? obChestDef(sp) : zd0.apply(this, arguments); }; }
if (window.EnLoot && typeof EnLoot.roll === 'function') {
  const roll0 = EnLoot.roll;
  EnLoot.roll = function (def) { return def && def.script ? { cur: def.cur.map(a => a.slice()), items: def.script.map(it => Object.assign({}, it)) } : roll0.apply(this, arguments); };
}
/* следующий шаг: пока текущий сделан — дальше. Последний сделан — обучение пройдено: окно перехода в цикл (§2.9) */
function obAdvance() {
  if (!obTutOf(S)) return false;
  const k0 = S.ob.k;
  while (S.ob.k < OB_SC.length && obStepDone(OB_SC[S.ob.k])) S.ob.k++;
  if (S.ob.k >= OB_SC.length && k0 < OB_SC.length) obCycleOpen(S);
  return S.ob.k !== k0;
}
/* замок: действие вида kind (и героя / биома arg) — на каком шаге сценария оно встретится. Позже по уровню — «откроется на N-м уровне»;
   на этом же уровне — «сначала — текущий шаг»; не встретится — с концом сценария */
function obLockWhy(kind, arg) {
  const s = obStepOf(), L = S.ob.srv.lvl, at = OB_SC.slice(S.ob.k).find(x => x.k === kind && (!arg || x.id === arg || x.b === arg || (x.k === 'lvl' && x.to.some(t => t[0] === arg))));
  const n = at ? at.L : OB_END_L;
  return n > L ? OB_TEXT.lockAt(n) : OB_TEXT.lockFirst(s ? OB_STEP_T[s.k](s)[0] : '');
}
const obLock = (kind, arg) => ({ lock: true, why: obLockWhy(kind, arg) });
/* стол — ровно первый рецепт: те же ресурсы в тех же количествах, ничего лишнего */
function obTableIs(cells, r) {
  const x = BAG.recipe(r); if (!x) return false;
  const have = cells.filter(Boolean);
  return have.length === x.in.length && x.in.every(([id, q]) => have.some(c => c.id === id && c.q === q));
}
/* подсказка первого рецепта: уровень подсказки взят, рецепт ещё не найден, обучение идёт */
const OB_HINT = (OB_D && OB_D.hint) || null;
const obHintOn = () => !!OB_HINT && obTut() && S.ob.srv.lvl >= OB_HINT.L && !BAG.known(OB_HINT.r);
function obHintPut() {
  if (!OB_HINT) return;
  wsSetTable(OB_HINT.in.map(x => x.slice()));
  S.ws.view = 'table'; S.ws.sel = 0; S.route = 'craft'; S.seg.craft = 'work'; S.overlay = null;
}

/* ворота действий: null — можно; { lock, why } — закрыто; { go } — вместо действия сценарий ведёт к своему шагу.
   a — имя действия ACT, v — его значение. Просмотр — экраны, листы, вкладки, сведения, выбор ячеек стола — открыт всегда */
const OB_VIEW_ACT = new Set(['noop', 'go', 'seg', 'sheet', 'dlg', 'close', 'toast', 'foe', 'lorefoe', 'lore', 'lorego', 'hero', 'hfilter', 'hsort', 'hero-open',
  'hview', 'rssel', 'rsopen', 'rsmine', 'rsf', 'rsval', 'rsteam', 'rsgo', 'rscyc', 'gcyc', 'gsel', 'ssel', 'sweek', 'rhero', 'item', 'focus', 'minimize',
  'legend', 'insp', 'leave', 'shdive', 'biome', 'dsbook', 'wkrt', 'wscat', 'wsf', 'wsfclr', 'wsput', 'wspick', 'wsqv', 'wsqn', 'wsqdo', 'wscell', 'wsq',
  'wsqset', 'wsclear', 'wsview', 'wsinfo', 'wsrepeat', 'wshints', 'wsbookgo', 'wsbtab', 'wsbkind', 'wsbfav', 'wsfav', 'wsload', 'wsn', 'wsok',
  'wsfxreveal', 'wsfxskip', 'toCraft', 'wsbclr', 'wsbookpart', 'lvinfo', 'zptab', 'zpf', 'zpun', 'zpclr', 'zpsel', 'zpn', 'zpto', 'dartab', 'darbox',
  'darpick', 'echsel', 'echwide', 'echweek', 'echbest', 'echfoe', 'echplank', 'echgo', 'echcb', 'esel', 'coreveal', 'coskip', 'wnmem', 'wnpick', 'wnask',
  'wnskip', 'lkpick', 'lkview', 'lknick', 'lksex', 'talpick', 'eqpick', 'eqwhosel', 'eqgo', 'qty', 'hdskip', 'hdfxok', 'hdread', 'geartab', 'gearfilt',
  'sq', 'sqround', 'sqback', 'sqmode', 'dcyc', 'dsel', 'dnskip', 'hc', 'hcback', 'hcstep', 'hczoom', 'hczx', 'hcf', 'hcclr', 'hcsort', 'duq', 'ducyc',
  'duno', 'hrwskip', 'hbclose', 'hbskip', 'pgst', 'arwatch', 'ardefplay', 'cltc', 'clsf', 'cllf', 'rfsel', 'rfhelp', 'rfclear', 'rfskip', 'crmore', 'mkkind',
  'mkid', 'mkq', 'mkp', 'mkfrom', 'chrall', 'pspage', 'psskip', 'dgskip', 'stskip', 'stad', 'stadstop', 'npc', 'talkmore', 'talkgo', 'talkbye', 'tkskip', 'pprsn',
  'mlopen', 'mlto', 'mlsend', 'chsend', 'chappeal', 'bfview', 'buy']);   // buy — лист товара Лавки: просмотр, покупка — buydo
function obGate(a, v) {
  if (!obTut() || /^ob/.test(a)) return null;
  const s = obStepOf(), V = String(v == null ? '' : v);
  if (a === 'sheet' && /^prep(?::|$)/.test(V)) return V === 'prep' && s.k === 'run' ? { go: 'run' } : obLock('run');   // отряд собирается сам
  if (OB_VIEW_ACT.has(a)) return null;
  switch (a) {
    case 'gbuy': case 'gbuydo': return s.k === 'hire' && V === s.id ? null : obLock('hire', RSI[V] ? V : '');
    case 'lvlup': {
      const h = hdHero(hdArgs(V).hid), rid = obRid(h), to = obTo(s, rid);
      return h && to != null && h.lvl < to ? null : obLock('lvl', rid);
    }
    case 'valor': case 'valordo': case 'limit': case 'limitdo': {
      const k = a.startsWith('valor') ? 'valor' : 'limit', h = hdHero(hdArgs(V).hid), rid = obRid(h);
      return s.k === k && rid === s.id ? null : obLock(k, rid);
    }
    case 'wstry': case 'wstrydo': return s.k !== 'craft' ? obLock('craft') : obTableIs(S.ws.cells, s.r) ? null : { lock: true, why: OB_TEXT.hintNote, go: 'hint' };
    case 'wsmake': return OB_HINT && V === OB_HINT.r && s.k === 'craft' ? { go: 'hint' } : obLock('craft');
    case 'start': case 'again': return s.k === 'run' ? { go: 'run' } : obLock('run');
    case 'guard': case 'guardgo': return V !== 'demo' && s.k === 'guard' ? (selRunBiome() === s.b ? null : { go: 'guard' }) : obLock('guard');
    /* Лавка Энериума — во 2 цикле (слово автора 01.10.2026): в обучении закрыта вся */
    case 'stbuy': case 'stbuydo': case 'stad': case 'stadgo': return { lock: true, why: OB_TEXT.storeLock };
    /* сундук сценария, покупка Лавки, первый артефакт — только на своём шаге и только своё */
    case 'zpopen': return s.k === 'chest' && obIsTutGroup(V) ? null : obLock('chest');
    case 'buydo': { const g = S.shop && S.shop[+V.split(':')[0]]; return s.k === 'shop' && g && g[0] === s.id ? null : obLock('shop', g ? g[0] : ''); }
    case 'wnbuy': case 'wnup': {
      const id = V.split(':')[0], L = typeof wnLv === 'function' ? wnLv(id) : -1;
      return s.k === 'art' && id === s.id && (a === 'wnbuy' ? L < 0 : L >= 0 && L < s.lv) ? null : obLock('art', id);
    }
  }
  return obLock(a);   // всё прочее, что меняет запасы, кошелёк, отряды и героев, — после обучения
}
/* причина замка — строкой сообщения; «перейти» — к своему шагу */
function obBlocked(a, v) {
  const g = obGate(a, v); if (!g) return false;
  if (g.go === 'run') { obRun(); return true; }
  if (g.go === 'guard') { const s = obStepOf(); S.selBiome = s.b; S.prepSquad = 's1'; ACT.guard(gdOp()); return true; }
  if (g.go === 'hint') { obHintPut(); if (g.why) toast(g.why); else render(); return true; }
  toast(g.why);
  return true;
}
/* забег шага: отряд I, биом шага — без выбора отряда */
function obRun() {
  const s = obStepOf(); if (!s || s.k !== 'run') return;
  S.overlay = null; S.selBiome = s.b; S.prepSquad = 's1';
  startRun('s1', s.b);
}
/* все действия — через ворота: обёртка ставится один раз на каждое действие ACT, и на добавленные позже — при перерисовке */
const OB_WRAPPED = typeof Symbol === 'function' ? Symbol('ob') : '__ob';
function obWrapActs() {
  for (const k of Object.keys(ACT)) {
    const f = ACT[k]; if (typeof f !== 'function' || f[OB_WRAPPED] || /^ob/.test(k)) continue;
    const w = function () { if (obTut() && obBlocked(k, arguments[0])) return; return f.apply(this, arguments); };
    w[OB_WRAPPED] = true; ACT[k] = w;
  }
}

/* ---------- «сервер» обучения: те же проверки на самих операциях — в обход экрана шаг не обойти ---------- */
const OB_REFUSE = 'tutorial';
const obRef = why => ({ refuse: OB_REFUSE, why });
if (typeof HD_SRV !== 'undefined') {
  const lvl0 = HD_SRV.lvl, lim0 = HD_SRV.limit, val0 = HD_SRV.valor;
  HD_SRV.lvl = function (op, hid, q) {
    if (!obTut() || S.hd.srv[op]) return lvl0.call(this, op, hid, q);
    const h = H(hid), to = obTo(obStepOf(), obRid(h));
    if (!h || to == null || h.lvl >= to) return obRef(obLockWhy('lvl', obRid(h)));
    const r = lvl0.call(this, op, hid, Math.min(Math.max(1, q | 0), to - h.lvl));   // сервер поднимает не выше уровня шага
    if (r && r.ok) obAdvance();
    return r;
  };
  HD_SRV.limit = function (op, hid) {
    const s = obStepOf(), rid = obRid(H(hid));
    if (obTut() && !S.hd.srv[op] && !(s.k === 'limit' && s.id === rid)) return obRef(obLockWhy('limit', rid));
    const r = lim0.call(this, op, hid); if (r && r.ok) obAdvance(); return r;
  };
  HD_SRV.valor = function (op, hid) {
    const s = obStepOf(), rid = obRid(H(hid));
    if (obTut() && !S.hd.srv[op] && !(s.k === 'valor' && s.id === rid)) return obRef(obLockWhy('valor', rid));
    const r = val0.call(this, op, hid); if (r && r.ok) obAdvance(); return r;
  };
  if (typeof HD_WHY !== 'undefined') HD_WHY[OB_REFUSE] = () => obLockWhy('lvl');
  /* «сколько за раз» у героя шага — не выше уровня шага: превью и цена у кнопки те же, что выдаст сервер */
  if (typeof hdQty === 'function') {
    const q0 = hdQty;
    hdQty = function (h) { const q = q0(h), to = obTut() ? obTo(obStepOf(), obRid(h)) : null; return to == null ? q : Math.max(0, Math.min(q, to - h.lvl)); };
  }
}
if (typeof WS_SRV !== 'undefined') {
  const at0 = WS_SRV.attempt, mk0 = WS_SRV.make;
  WS_SRV.attempt = function (op, cells, consent) {
    if (obTut() && !S.ws.ops[op]) { const s = obStepOf(); if (s.k !== 'craft' || !obTableIs(cells, s.r)) return obRef(s.k === 'craft' ? OB_TEXT.hintNote : obLockWhy('craft')); }
    const r = at0.call(this, op, cells, consent); if (r && r.res && !r.again) obAdvance(); return r;
  };
  WS_SRV.make = function (op, rid, n, ok) { if (obTut() && !S.ws.ops[op]) return obRef(obLockWhy('craft')); return mk0.call(this, op, rid, n, ok); };
  if (typeof WS_REFUSE !== 'undefined') WS_REFUSE[OB_REFUSE] = OB_TEXT.hintNote;
}
if (typeof GD_SRV !== 'undefined') {
  const en0 = GD_SRV.enter;
  GD_SRV.enter = function (op, biome, squadId) {
    const s = obStepOf();
    if (obTut() && !GD().ops[op] && !(s.k === 'guard' && s.b === biome)) return obRef(obLockWhy('guard', biome));
    return en0.call(this, op, biome, squadId);
  };
  if (typeof GD_WHY !== 'undefined') GD_WHY[OB_REFUSE] = r => r.why || obLockWhy('guard');
}
/* забег и страж обучения: только шаг сценария, отрядом I; номер забега сценария — на самом забеге: по нему добыча из таблицы */
{
  const run0 = startRun;
  startRun = function (squadId, biome = 'b1', demoFloor, guard) {
    if (!obTut()) return run0.apply(this, arguments);
    const s = obStepOf();
    if (demoFloor || !(s.k === (guard ? 'guard' : 'run') && s.b === biome)) return toast(obLockWhy(guard ? 'guard' : 'run', biome));
    const no0 = S.runNo;
    run0.call(this, 's1', biome, null, guard);
    const R = S.runNo > no0 ? S.runs.find(x => x.runNo === S.runNo) : null;
    /* сид добычи — сервера сценария (ADR-0049): у погружения — забег полного пути, чью добычу оно даёт; номер забега на экране — свой */
    if (R) { R.ob = s.no; if (s.d) R.d = s.d; if (s.seed && s.seed !== R.runNo && !OB_SEED_OFF) R.lootSeed = EB.seedOf(`${biome}|добыча|${s.seed}`); }
  };
}
/* сундук сценария, Лавка и первый артефакт — шаги сценария с заданным итогом: открыть — только сундук сценария на его шаге, купить —
   только товар шага с витрины обучения, артефакт — только свой и до своего уровня. Обновлять витрину в обучении нельзя: новые товары
   по сроку не приходят — витрина обучения стоит до конца сценария */
if (typeof zpOpen === 'function') {
  const zo0 = zpOpen;
  zpOpen = function (key) {
    if (obTut()) { const s = obStepOf(); if (!(s.k === 'chest' && obIsTutGroup(key))) return toast(obLockWhy('chest')); }
    const r = zo0.apply(this, arguments); if (obOn()) obSync(); return r;
  };
}
if (typeof LV_SRV !== 'undefined') {
  const buy0 = LV_SRV.buy, ref0 = LV_SRV.refresh, auto0 = LV_SRV.auto;
  LV_SRV.buy = function (op, i, gen) {
    if (obTut() && !(S.lv && S.lv.ops && S.lv.ops[op])) {
      const s = obStepOf(), g = S.shop && S.shop[i];
      if (!(s.k === 'shop' && g && g[0] === s.id && gen === OB_SHOP_GEN && S.lv.gen === OB_SHOP_GEN)) return obRef(obLockWhy('shop', g ? g[0] : ''));
    }
    const r = buy0.apply(this, arguments); if (r && r.res && !r.again) obAdvance(); return r;
  };
  LV_SRV.refresh = function (op) { if (obTut() && !(S.lv && S.lv.ops && S.lv.ops[op])) return obRef(obLockWhy('shop', '—')); return ref0.apply(this, arguments); };
  if (typeof auto0 === 'function') LV_SRV.auto = function () { if (obTutOf(S) && S.lv) { S.lv.next = LV_DATA.autoSec; return { gen: S.lv.gen }; } return auto0.apply(this, arguments); };
}
if (typeof LV_REFUSE !== 'undefined') LV_REFUSE[OB_REFUSE] = OB_TEXT.lockAt(OB_END_L);
if (typeof WN_SRV !== 'undefined') for (const m of ['buy', 'up']) {
  const f = WN_SRV[m]; if (typeof f !== 'function') continue;
  WN_SRV[m] = function (op, id) {
    if (obTut() && !(S.wn && S.wn.ops && S.wn.ops[op])) {
      const s = obStepOf(), L = typeof wnLv === 'function' ? wnLv(id) : -1;
      if (!(s.k === 'art' && s.id === id && (m === 'buy' || L < s.lv))) return obRef(obLockWhy('art', id));
    }
    const r = f.apply(this, arguments); if (r && r.res && !r.again) obAdvance(); return r;
  };
}
if (typeof wnRefuse === 'function') { const wr0 = wnRefuse; wnRefuse = function (r) { return r && r.refuse === OB_REFUSE ? r.why : wr0.apply(this, arguments); }; }
/* Лавка Энериума — во 2 цикле (слово автора 01.10.2026: «Донатная Лавка во 2 цикле»): покупки и реклама за Энериум в обучении — отказ
   и на самом «сервере» Лавки; открывается она переходом в цикл II — после последнего шага или пропуском */
if (typeof SH_SRV !== 'undefined') for (const m of ['buy', 'ad']) {
  const f = SH_SRV[m]; if (typeof f !== 'function') continue;
  SH_SRV[m] = function (op) { if (obTut() && !(S.store && S.store.srv && S.store.srv.ops[op])) return obRef(OB_TEXT.storeLock); return f.apply(this, arguments); };
}

/* ---------- добыча обучения — из таблицы сценария (EN_START.loot): что падает на каком этаже — решено данными, не бросками ----------
   Бой по-прежнему решает ядро на сиде биома. Пока идёт floorDone забега обучения, добычу этажа отдаёт таблица: золото, дух и души —
   вместо EB.floorLoot, предметы — вместо lootItems. OB_CHK — проверка: что дали бы ядро и генератор (законы check_start.js) */
let OB_LOOT_R = null, OB_CHK = null;
const obLootRow = (R, floor) => { const L = OB_D && OB_D.loot && OB_D.loot[R.ob - 1]; return (L && L.find(x => x[0] === floor)) || [floor, 0, 0, 0, []]; };
{
  const fl0 = EB.floorLoot;
  EB.floorLoot = function (biome, floor, b, bonus) {
    const R = OB_LOOT_R; if (!R) return fl0.apply(this, arguments);
    const row = obLootRow(R, floor), core = OB_CHK ? fl0.apply(this, arguments) : null;
    if (core) OB_CHK.push({ no: R.ob, floor, core, seed: R.lootSeed, guardWin: !!(R.guard && b.win), biome });
    return { gold: row[1], spirit: row[2], souls: row[3], base: 0, keys: 0, unique: 0, farm: null };
  };
  const li0 = lootItems;
  lootItems = function (biome, floor) {
    const R = OB_LOOT_R; if (!R) return li0.apply(this, arguments);
    const out = {}; for (const [id, n] of obLootRow(R, floor)[4]) out[id] = n;
    const c = OB_CHK && OB_CHK[OB_CHK.length - 1];
    if (c && c.no === R.ob && c.floor === floor) c.items = li0(c.biome, floor, c.core, c.seed, c.guardWin);
    return out;
  };
}

/* ================== путь вниз: страж пал — биом пройден, открыт следующий (§8.6) ================== */
const OB_NEXT = { b1: ['b2', 'Подземный лес'], b2: ['b3', 'Библиотека Улариона'] };
const obEndRun0 = endRun;
endRun = function (R, vis) {
  if (obOn() && R && !R.demo && !R.scene && R.end && R.end.kind === 'guardWin' && !S.ob.guard[R.biome]) {
    S.ob.guard[R.biome] = 1;
    const b = S.biomes.find(x => x.id === R.biome), nx = OB_NEXT[R.biome];
    if (b) b.state = 'done';
    if (nx) { const n = S.biomes.find(x => x.id === nx[0]); if (n) { n.state = 'front'; n.name = nx[1]; } S.selBiome = nx[0]; }
    obFacts(S);   // вехи боя — в цикле, где взяты: страж и его свита — до перехода
    if (R.biome === 'b2') { OB_R.fact(S.ob.srv, 'cycle:' + (S.acc.cycle + 1), 'cycle', S.acc.cycle); S.acc.cycle++; }   // переход — веха цикла, где взят
  }
  if (obOn() && R && R.ob) S.ob.ran = Math.max(S.ob.ran || 0, R.ob);   // забег сценария пройден: шаг сделан
  /* дар погружения — в конце забега погружения, до шагов после него: дух — в уровни, золото — на найм (ADR-0049) */
  if (obOn() && R && R.ob && !R.demo) { const r = OB_SRV.gift(R.ob); if (r.res) R.gift = r.res.gift; }
  if (obOn()) obSync();
  return obEndRun0(R, vis);
};
/* этаж взят — лучший этаж биома; вехи и уровень — сразу, окно ждёт конца боя. Добыча этажа забега обучения — из таблицы сценария */
const obFloorDone0 = floorDone;
floorDone = function (R, vis) {
  if (obOn() && R && !R.demo && !R.scene && !R.guard && R.b && R.b.win) S.ob.best[R.biome] = Math.max(S.ob.best[R.biome] || 0, R.floor);
  OB_LOOT_R = obOn() && R && R.ob ? R : null;
  let r;
  try { r = obFloorDone0(R, vis); } finally { OB_LOOT_R = null; }
  if (obOn()) obSync();
  return r;
};
/* герой обучения — в отряд боя записью фикстуры и в первое открытое место отряда I */
const obRsAdd0 = rsAdd;
rsAdd = function (h, how) {
  if (!obOn() || !h || !OB_FIX[h.id] || how !== 'gold') return obRsAdd0(h, how);
  const x = obFixOf(h.id); if (!x) return obRsAdd0(h, how);
  S.heroes.push(x);
  const s = S.squads[0], i = s ? s.m.findIndex((m, k) => !m && !obSlotLock(k)) : -1;
  if (i >= 0 && typeof SQ_SRV !== 'undefined') SQ_SRV.put(sqOp(), s.id, i, x.id);
  if (!S.selHero) S.selHero = x.id;
  obSync();
};
/* место отряда закрыто: 0 — открыто, иначе — уровень, с которого откроется */
function obSlotLock(i) {
  if (!obOn() || !OB_R) return 0;
  const n = OB_R.slots(obLvl()); if (i < n) return 0;
  const L = OB_D.gates.slots.findIndex(k => k > i); return L < 0 ? 0 : L + 1;
}

/* ================== окно уровня ================== */
/* можно показать: есть очередь, нет листа и окна поверх, не идёт показ боя, после «Попробовать» сменился экран */
function obCanShow() {
  if (!obOn() || !S.ob.queue.length || S.overlay) return false;
  if (S.ob.hold && S.ob.hold === S.route) return false;
  const R = typeof focusRun === 'function' ? focusRun() : null;
  return !(S.route === 'battle' && R && !R.over);
}
const obLv = L => OB_D.levels[L - 1] || null;
/* награда строкой вещей: валюта — картинка и число, руны и ресурсы — иконка предмета, сундук — его картинка, осколки — стекло с лицом */
function obRewardItems(L) {
  const r = OB_R.reward(L), out = [];
  const cur = (k, n) => out.push({ pic: `<img src="${CUR[k].img}" alt="">`, n: '+' + fmt(n), t: CUR[k].n });
  if (r.gold) cur('gold', r.gold);
  if (r.spirit) cur('spirit', r.spirit);
  if (r.keys) cur('keys', r.keys);
  const it = (id, n) => { const x = BAG.item(id); if (x) out.push({ pic: itWell(id, { stat: true, size: 44 }), n: '×' + fmt(n), t: itName(x) }); };
  if (r.runes) { const rn = limitRune(1, 1); if (rn) it(rn.id, r.runes); }
  if (r.train) { const v = cycItems('valor', 1)[0]; out.push({ pic: v ? itWell(v.id, { stat: true, size: 44 }) : ic('star'), n: '×' + r.train, t: 'Руна обучения' }); }
  for (const [id, n] of r.items) it(id, n);
  if (r.chest) out.push({ pic: typeof zpChestPic === 'function' ? zpChestPic(r.chest.box, r.chest.r) : `<img src="${CHEST}" alt="">`, n: '', t: typeof zpBoxName === 'function' ? zpBoxName({ box: r.chest.box, r: r.chest.r, win: 'step' }) : 'Сундук', chest: r.chest.r });
  for (const [id, n] of r.shards) { const h = RSI[id]; if (h) out.push({ pic: typeof shardGhost === 'function' ? shardGhost(h, n, RS.rules.stub.shards, 48) : ic('users'), n: '×' + n, t: hrStage(h) >= 2 ? `Осколки · ${h.n}` : 'Осколки неизвестной души', wide: true }); }
  return out;
}
function obPopHtml() {
  if (!obCanShow()) return '';
  if (obIsLes(S.ob.queue[0])) return obLesPopHtml(S.ob.queue[0]);   // урок погружения (ADR-0049)
  const L = S.ob.queue[0], lv = obLv(L); if (!lv) return '';
  const items = obRewardItems(L), V = OB_VIEW, more = Math.max(0, items.length - V.maxShow);
  const say = lv.say || ['mage', ''], npc = typeof NPCS !== 'undefined' ? NPCS[say[0]] : null, main = OB_D.open[lv.opens[0]];
  const C = 2 * Math.PI * V.ring, dash = Math.round(C);
  const ring = `<svg class="ob-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="ob-r0" cx="60" cy="60" r="${V.ring}"/><circle class="ob-r1" cx="60" cy="60" r="${V.ring}" style="--ob-c:${dash}"/></svg>`;
  const rw = items.slice(0, V.maxShow).map((x, i) => `<li class="ob-rw${x.chest ? ' ch' : ''}${x.wide ? ' wd' : ''}" style="--i:${i}"><span class="ob-pic">${x.pic}</span><b class="num">${x.n}</b><small>${trEsc(x.t)}</small></li>`).join('')
    + (more ? `<li class="ob-rw more" style="--i:${V.maxShow}"><b>${OB_TEXT.more(more)}</b></li>` : '');
  const opens = lv.opens.map((k, i) => `<li${i ? '' : ' class="main"'}>${obArtImg(obOpenArt(k), 'ob-oi')}${trEsc(OB_D.open[k].n)}</li>`).join('');
  const crest = typeof shCrest === 'function' ? shCrest(say[0], ' ob-crest') : '';
  const A = obCardArt();
  const left = S.ob.queue.length > 1 ? `<span class="ob-q" aria-label="Ещё уровней: ${S.ob.queue.length - 1}">+${S.ob.queue.length - 1}</span>` : '';
  /* первый рецепт — подсказкой (ADR-0040): у уровня, который его дарит, — рецепт целиком вместо подписей открытого */
  const rcp = lv.hint && OB_HINT ? `<div class="ob-rcp"><span class="eyebrow">${OB_TEXT.first} · «${trEsc(OB_HINT.n)}»</span>${obRecipeHtml()}</div>` : `<ul class="ob-ops${lv.opens.length > V.opsMany ? ' many' : ''}">${opens}</ul>`;
  const skip = obTut() ? `<button class="link ob-skip" data-a="obskip">${OB_TEXT.skip}</button>` : '';
  return `<div class="ob-pop" role="dialog" aria-modal="true" aria-labelledby="obT" style="--ob-step:${V.step}ms;--ob-first:${V.first}ms">
    <div class="ob-scrim" aria-hidden="true"></div>
    <div class="ob-card${lv.hint ? ' rc' : ''}${A.cls}"${A.style}>
      <i class="ob-glow" aria-hidden="true"></i>
      <div class="ob-hd${A.md ? ' md' : ''}">${A.hd}${ring}<b class="ob-n num">${L}</b>${left}</div>
      <span class="ob-xp num">${obArtImg(OB_ART.xp, 'ob-xpi')}${OB_TEXT.toNext(fmt(OB_R.need(L)), L + 1)}</span>
      <span class="eyebrow ob-ey">${OB_TEXT.level}</span>
      <h2 id="obT" class="ob-t">Уровень ${L} · ${trEsc(lv.n)}</h2>
      <div class="ob-got"><span class="eyebrow">${OB_TEXT.got}</span><ul class="ob-rws">${rw}</ul></div>
      <div class="ob-open">${crest}<div class="ob-say"><span class="eyebrow">${OB_TEXT.open} · ${trEsc(npc ? npc.n : '')}</span><p>${trEsc(say[1])}</p>${rcp}</div></div>
      <div class="ob-act">${skip}<button class="link" data-a="oblater" data-v="${L}">${OB_TEXT.later}</button><button class="btn go" data-a="obtry" data-v="${L}" aria-label="${OB_TEXT.tryIt}: ${trEsc(main ? main.n : '')}">${OB_TEXT.tryIt}</button></div>
    </div></div>`;
}
/* арт окна: рама — классом fr и переменной --ob-fr (border-image), вспышка — bs и --ob-bs (за медальоном и у каждой награды), медальон —
   картинкой под числом. Чего нет в выгрузке, того нет и в разметке: окно остаётся прежним */
/* адрес картинки для переменной CSS — полный: url() в переменной браузер разрешает от файла стилей, где её берут (screens/start.css) */
const obUrl = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
function obCardArt() {
  const fr = obArtOn(OB_ART.frame), bs = obArtOn(OB_ART.burst), md = obArtOn(OB_ART.medal);
  const vars = [fr ? `--ob-fr:url('${obUrl(OB_ART.frame)}')` : '', bs ? `--ob-bs:url('${obUrl(OB_ART.burst)}')` : '', fr ? `--ob-sl:${OB_ART.slice}` : ''].filter(Boolean);
  return { cls: (fr ? ' fr' : '') + (bs ? ' bs' : ''), style: vars.length ? ` style="${vars.join(';')}"` : '', md,
    hd: obArtImg(OB_ART.burst, 'ob-bs') + obArtImg(OB_ART.medal, 'ob-md') };
}
/* рецепт целиком: ресурсы с количеством → итог с названием. Карточка окна уровня и пометка Этриона у стола — одна разметка */
function obRecipeHtml(cls = '') {
  const H = OB_HINT; if (!H) return '';
  const w = (id, q) => { const x = BAG.item(id); return x ? `<span class="ob-rc-w">${itWell(id, { stat: true, size: 44 })}<b class="num">×${fmt(q)}</b><small>${trEsc(itName(x))}</small></span>` : ''; };
  const out = BAG.item(H.out[0]), name = out ? itName(out) : H.n;
  return `<div class="ob-rc${cls}" role="group" aria-label="${OB_TEXT.first}: ${H.in.map(([id, q]) => `${trEsc(itName(BAG.item(id)))} ×${q}`).join(', ')} — ${trEsc(name)}">`
    + H.in.map(([id, q]) => w(id, q)).join('<i class="ob-rc-op" aria-hidden="true">+</i>')
    + `<i class="ob-rc-op eq" aria-hidden="true">${ic('arrow')}</i>`
    + (out ? `<span class="ob-rc-w out">${itWell(H.out[0], { stat: true, size: 44 })}<b>${trEsc(name)}</b></span>` : '') + '</div>';
}
/* ================== урок погружения (ADR-0049) ==================
   Слово автора 02.10.2026: «…с каждым новым погружением, показывает новое окно которое не было доступно, рассказывает про навыки героя,
   систему как и что работает». Окно урока — то же окно уровня: медальон с номером погружения, слово проводника, то, что берётся из данных
   игры, и «Попробовать» — к окну урока. Встаёт перед погружением (obLesQueue), закрывается «Позже»; из записки Убежища открывается снова */
const obX = v => { const a = Math.abs(v), s = a % 100 ? (a / 100).toFixed(2).replace(/0$/, '') : String(a / 100); return s.replace('.', ','); };   // 125 → «1,25», 300 → «3»
/* герой урока — из данных: тот, кому руна обучения, или герой своей роли среди пятерых обучения (EN_START.heroes[].role) — запись
   отряда боя (фикстура прогонов). Замена героя пятёрки — смена данных */
const obLesHeroId = l => (l.kind === 'valor' ? OB_D.train : l.role ? (OB_D.heroes.find(h => h.role === l.role) || {}).id || null : null);
const obLesHero = l => { const id = obLesHeroId(l); return id ? obHero(id) : null; };
const obBossId = b => { const B = EB.BIOMES[b || (OB_DV && OB_DV.b)]; return B && B.floors.length ? B.floors[B.floors.length - 1].m[0] : ''; };
/* строки приёмов набора: значок своего вида, имя со школой, вид и доблесть открытия, описание — те же, что на странице «Навыки» книги.
   K — запись набора героя (kits.js): у героя пассивка или реакция доблести 0 — черта, сочетание названо своими частями (abWhat,
   index.html, ADR-0050); у врага набора K нет — виды как прежде */
function obAbRows(kit, valor, keep, mask, K) {
  const L = EB.lib(), M = mask || (s => s);   // mask — что бестиарий ещё прячет (имя врага в описании приёма) — словами урока
  return kit.filter(x => L[x.id] && (!keep || keep(x))).map(x => {
    const a = Object.assign({}, L[x.id], { d: M(L[x.id].d || '') }), on = x.v <= valor;
    /* имя приёма — своё у врага (as: «Тяжёлая лапа» у хозяйки леса), иначе — библиотеки; вид и доблесть открытия — в строке имени */
    const when = !x.v ? 'есть сразу' : on ? `доблесть ${x.v}` : `откроется на доблести ${x.v}`;
    const what = K && typeof abWhat === 'function' ? abWhat(x, a, K, L, when) : `${AB_KIND[x.slot] || 'Способность'} · ${when}`;
    return abRow({ kind: x.slot, icon: (typeof abArt === 'function' && abArt(a, 32, '', on ? '' : 'off')) || ic(on ? (x.slot === 'ult' ? 'crown' : abIcon(a)) : 'lock'),
      name: `${schoolMark(a.school)}${trEsc(x.as || a.n)}`, chip: `<small class="ab-k ob-le-k${on ? '' : ' lk'}">${what}</small>`, d: trEsc(a.d || ''), lock: !on });
  }).join('');
}
/* строка героя или врага урока: имя и кто он; портрет — в медальоне окна (obLesPic) */
const obLesHead = (name, sub) => `<p class="ob-le-h"><b>${trEsc(name)}</b><small>${sub}</small></p>`;
/* портрет урока в медальоне: герой урока или хозяйка леса; у круга стихий — номер погружения крупно */
function obLesPic(l) {
  if (l.kind === 'boss') {   // облик хозяйки леса — после первой победы, как в бестиарии; до неё — номер погружения
    const id = obBossId(), rec = typeof F === 'function' ? F(id) : null;
    return rec && typeof FA === 'function' && typeof known === 'function' && known(id) ? { img: FA(rec), pos: typeof FPOS === 'function' ? FPOS(rec) : '50% 22%' } : null;
  }
  const h = l.kind === 'elements' ? null : obLesHero(l); return h && h.img ? { img: h.img, pos: '50% 16%' } : null;
}
/* содержимое урока — по виду: приёмы героя, что открыла доблесть, круг стихий против врагов леса, угроза и танк, хозяйка леса */
function obLesBody(l) {
  if (l.kind === 'hero' || l.kind === 'valor' || l.kind === 'threat') {
    const h = obLesHero(l), K = h && typeof heroKit === 'function' ? heroKit(h) : null; if (!h || !K) return '';
    const sub = `${trEsc(h.cls)} · ${trEsc(h.el)} · ${h.lvl} ур.${h.valor ? ` · доблесть ${h.valor}` : ''}`;
    if (l.kind === 'valor') return obLesHead(h.name, `${sub} · ${OB_TEXT.valorUp(EB.RULES.valorPct)}`) + `<div class="rot-list ob-le-ab">${obAbRows(K.kit, h.valor, x => x.v >= 1 && x.v <= h.valor, null, K)}</div>`;
    if (l.kind === 'threat') {
      const C = EB.RULES.cls, thr = (C[h.cls] || {}).thr || EB.RULES.threat.base, other = Math.max(...S.heroes.filter(x => x !== h).map(x => (C[x.cls] || {}).thr || EB.RULES.threat.base), EB.RULES.threat.base);
      return obLesHead(h.name, sub) + `<p class="ob-le-n">${OB_TEXT.threat(obX(thr), obX(other))}</p><div class="rot-list ob-le-ab">${obAbRows(K.kit, h.valor, null, null, K)}</div>`;
    }
    return obLesHead(h.name, sub) + `<div class="rot-list ob-le-ab">${obAbRows(K.kit, h.valor, null, null, K)}</div>`;
  }
  if (l.kind === 'elements') {
    const E = EB.RULES.elem, B = EB.BIOMES[OB_DV.b], chip = el => `<span class="el" data-el="${el}">${trEsc(el)}</span>`, ar = `<i class="ob-el-ar" aria-hidden="true">${ic('arrow')}</i>`;
    const foes = [...new Set(B.floors.flatMap(F => F.m).map(id => (EB.FOES[id] || {}).el).filter(Boolean))];
    const rows = S.heroes.map(h => {
      const st = foes.filter(f => EB.elemMul(h.el, f) > E.base), wk = foes.filter(f => EB.elemMul(h.el, f) < E.base);
      const t = [st.length ? `${OB_TEXT.elStrong} ${st.map(chip).join(' ')}` : '', wk.length ? `${OB_TEXT.elWeak} ${wk.map(chip).join(' ')}` : ''].filter(Boolean).join(' · ') || OB_TEXT.elEven;
      return `<li><img src="${h.img}" alt=""><b>${trEsc(h.name)}</b>${chip(h.el)}<span>${t}</span></li>`;
    }).join('');
    return `<div class="ob-el-c">${E.circle.map(chip).join(ar)}${ar}${chip(E.circle[0])}</div><p class="ob-le-n">${OB_TEXT.elRule(obX(E.fwd), obX(E.back))} ${OB_TEXT.elPair(E.pair[0], E.pair[1], obX(E.pairPct))}</p>
      <p class="ob-le-n">${OB_TEXT.elForest}: ${foes.map(chip).join(' ')}</p><ul class="ob-el-h">${rows}</ul>`;
  }
  if (l.kind === 'boss') {
    /* бестиарий открывает имя, облик и запись сказителя только после первой победы (§7, §33.4); до неё урок говорит то, что отряд видел
       в бою: тип, стихию, раунды и её приёмы — она применяла их при встрече. Пала — имя, портрет и совет сказителя */
    const id = obBossId(), fo = EB.FOES[id], X = window.EN_BIOME_FOES, card = X && X.cards ? X.cards[id] : null; if (!fo || !fo.kit) return '';
    const kn = typeof known === 'function' && known(id), type = card ? card.type || 'Босс биома' : 'Босс биома';
    const mask = kn ? null : s => s.split(fo.name).join(OB_TEXT.bossAnon);   // имя — и в описаниях её приёмов
    return obLesHead(kn ? fo.name : type, `${kn ? trEsc(type) + ' · ' : ''}${trEsc(fo.el)} · ${OB_TEXT.bossRounds(EB.roundsOf ? EB.roundsOf('b') : EB.RULES.rounds.by.b)}`)
      + `<div class="rot-list ob-le-ab">${obAbRows(fo.kit.kit, 0, null, mask)}</div>${kn && card && card.tip ? `<p class="ob-le-q">${trEsc(card.tip)}</p>` : ''}`;
  }
  return '';
}
function obLesPopHtml(q) {
  const j = +String(q).slice(1), l = obLesOf(j); if (!l) return '';
  const say = l.say || ['mage', ''], npc = typeof NPCS !== 'undefined' ? NPCS[say[0]] : null, crest = typeof shCrest === 'function' ? shCrest(say[0], ' ob-crest') : '';
  const A = obCardArt(), n = obDiveN(), V = OB_VIEW, C = 2 * Math.PI * V.ring, pic = obLesPic(l);
  const ring = `<svg class="ob-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="ob-r0" cx="60" cy="60" r="${V.ring}"/><circle class="ob-r1" cx="60" cy="60" r="${V.ring}" style="--ob-c:${Math.round(C)}"/></svg>`;
  const left = S.ob.queue.length > 1 ? `<span class="ob-q" aria-label="Ещё окон: ${S.ob.queue.length - 1}">+${S.ob.queue.length - 1}</span>` : '';
  const skip = obTut() ? `<button class="link ob-skip" data-a="obskip">${OB_TEXT.skip}</button>` : '';
  /* медальон: портрет героя или хозяйки леса в кольце и номер погружения значком; у круга стихий — номер крупно. Под медальоном — «Погружение j из n» */
  const face = pic ? `<img class="ob-le-pt" src="${pic.img}" alt="" style="object-position:${pic.pos}">` : '';
  return `<div class="ob-pop" role="dialog" aria-modal="true" aria-labelledby="obT">
    <div class="ob-scrim" aria-hidden="true"></div>
    <div class="ob-card ob-les ob-les-${l.kind}${A.cls}"${A.style}>
      <i class="ob-glow" aria-hidden="true"></i>
      <div class="ob-hd${A.md ? ' md' : ''}${pic ? ' pt' : ''}">${A.hd}${ring}${face}<b class="ob-n num">${j}</b>${left}<span class="ob-dv num">${OB_TEXT.dive(j, n)}</span></div>
      <span class="eyebrow ob-ey">${trEsc(obBiomeNm(OB_DV.b))}</span>
      <h2 id="obT" class="ob-t">${OB_TEXT.lesson} · ${trEsc(l.n)}</h2>
      <div class="ob-open ob-le-say">${crest}<div class="ob-say"><span class="eyebrow">${OB_TEXT.lesson} · ${trEsc(npc ? npc.n : '')}</span><p>${trEsc(say[1])}</p></div></div>
      <div class="ob-le">${obLesBody(l)}</div>
      <div class="ob-act">${skip}<button class="link" data-a="oblater" data-v="${q}">${OB_TEXT.later}</button><button class="btn go" data-a="obtry" data-v="${q}" aria-label="${OB_TEXT.tryIt}: ${trEsc(l.n)}">${OB_TEXT.tryIt}</button></div>
    </div></div>`;
}
/* «Попробовать» урока — к его окну: книга героя на своей вкладке, бестиарий леса, карточка хозяйки леса (data.js, DIVES.lessons[].go) */
function obGoLesson(l) {
  const g = l.go || {}; S.overlay = null;
  if (g.route === 'heroes') {
    const h = obLesHero(l);
    S.route = 'heroes'; S.seg.heroes = g.heroes || 'coll';
    if (h) { S.hview = 'mine'; S.hgrid = 'own'; S.selHero = h.id; S.seg.hero = g.hero || 'skills'; }
    return;
  }
  S.route = g.route || S.route;
  if (g.biome && EB.BIOMES[g.biome]) S.selBiome = g.biome;
  if (g.sheet) { const [t, a] = g.sheet.split(':'); S.overlay = t === 'foe' ? { t: 'foe', arg: a === 'boss' ? obBossId(g.biome) : a, ds: g.biome } : { t, arg: a }; }
}
/* ================== переход в цикл II: окно «Событие нового цикла» (GDD §2.9, ADR-0041) ==================
   Переход I → II выдаёт сценарий обучения: после последнего шага или пропуском — той же операцией сервера, что переходы II → VI
   (CY_SRV.advance, screens/cycle.js): цикл, место Памяти, «Дар пути», таблицы рейтингов цикла II с начала, окно. Окно — их, со своим
   содержимым для цикла II (EN_CYCLE.steps[2]): первый рейтинг, герои, спуск и ремесло, неделя, Странник, Лавка. Веху опыта перехода
   сценарий уже взял — повтором её не дадут. Повтор номера ничего не выдаёт; второй переход того же цикла — отказ */
function obCycleOpen(s) {
  if (s !== S || typeof CY_SRV === 'undefined' || !S.cy || !S.cy.srv) return null;
  const from = S.cy.srv.cycle;
  if (from !== OB_D.start.cycle) return null;   // аккаунт уже перешёл: окно цикла II выдано раньше
  S.cy.guard[from] = 1;                          // рунный страж второго биома цикла I пал — в прохождении, или его итог дал пропуск
  return CY_SRV.advance('cy' + S.cy.srv.seq, from);
}
/* ================== пропуск обучения: подтверждение (ADR-0040) ==================
   Что получит игрок — итог сценария (EN_START.skip): отряд с уровнями, пределами и доблестью, кошелёк, руны, запасы, сундуки, осколки,
   уровень Странника и всё, что открыли уровни 1–10. Кнопка несёт номер операции: повтор ничего не выдаст */
OV.obskip = function (o) {
  const E = OB_D.skip; if (!E) return '';
  const tier = id => (BAG.item(id) || {}).tier || '';
  const heroes = E.heroes.map(([id, lvl, lim, valor]) => {
    const f = OB_FIX[id], tags = [lim ? `предел ${ROMAN[lim]}` : '', valor ? 'доблесть' : ''].filter(Boolean).join(' · ');
    return `<li class="ob-sk-h">${f ? `<img src="${f.img}" alt="">` : ''}<span class="ob-sk-ht"><b>${trEsc(obNm(id))}</b><small><span class="num">${lvl}</span> ур.${tags ? ' · ' + tags : ''}</small></span></li>`;
  }).join('');
  const cur = ['gold', 'spirit', 'souls', 'keys'].map(k => `<li class="ob-sk-m" title="${CUR[k] ? CUR[k].n : ''}">${money(k, E.wallet[k] || 0)}<small>${OB_TEXT.skipCur[k]}</small></li>`).join('');
  const runes = E.items.filter(([id]) => ['rune', 'vshard', 'valor'].includes(tier(id))).map(([id, n]) => `<li title="${trEsc(itName(BAG.item(id)))}">${itWell(id, { stat: true, size: 30 })}<b class="num">×${fmt(n)}</b><small>${trEsc(itName(BAG.item(id)))}</small></li>`).join('');
  const stock = E.items.filter(([id]) => ['basic', 'key', 'unique', 'part'].includes(tier(id))), sn = stock.reduce((a, [, n]) => a + n, 0);
  const sh = E.shards.map(([id, n]) => { const h = RSI[id]; return `${h && hrStage(h) >= 2 ? `осколки · ${trEsc(h.n)}` : 'осколки неизвестной души'} ×${fmt(n)}`; });
  /* первый артефакт — плиткой в ряду кошелька: реликвия, имя и уровень */
  const arts = Object.entries(E.art || {}).map(([id, lv]) => {
    const nm = trEsc(OB_TU.art && OB_TU.art.id === id ? OB_TU.art.n : id);
    return `<li class="ob-sk-cy ob-sk-art" title="${OB_TEXT.skipArt}: ${nm} · ${ROMAN[lv] || lv}"><span class="ob-sk-ai">${typeof wnRelic === 'function' ? wnRelic(id) : ''}</span><b>«${nm}» · ${ROMAN[lv] || lv}</b><small>${OB_TEXT.skipArt}</small></li>`;
  }).join('');
  const chests = E.chests.map(c => (typeof zpChestPic === 'function' ? zpChestPic(c.box, c.r) : '')).join('');
  const last = OB_D.levels[OB_D.levels.length - 1], opened = `${OB_TEXT.skipAll(OB_D.levels.length)} ${last.opens.map(k => trEsc(OB_D.open[k].n)).join(' · ')}`;
  const body = `<p class="ob-sk-lead">${OB_TEXT.skipLead}</p>
    <ul class="ob-sk-cur"><li class="ob-sk-lv"><b class="num">${E.lvl}</b><small>${OB_TEXT.skipLvl}</small></li>${cur}${arts}</ul>
    <span class="eyebrow">${OB_TEXT.skipSquad}</span><ul class="ob-sk-hs">${heroes}</ul>
    <span class="eyebrow">${OB_TEXT.skipRunes} · ${OB_TEXT.skipStock}</span><div class="ob-sk-row"><ul class="ob-sk-ru">${runes}</ul><p class="ob-sk-st"><span class="ob-sk-ch">${chests}</span><span>Ресурсы и ключи ремёсел — <b class="num">${fmt(stock.length)}</b> ${plural(stock.length, 'вид', 'вида', 'видов')}, <b class="num">${fmt(sn)}</b> шт.; закрытых сундуков — <b class="num">${E.chests.length}</b>; ${sh.join('; ')}</span></p></div>
    <div class="ob-sk-opw"><span class="eyebrow">${OB_TEXT.skipOpen}</span><p class="ob-sk-op">${opened}</p></div>`;
  return dialog(OB_TEXT.skipH, body, `<button class="btn ghost" data-a="close">${OB_TEXT.skipNo}</button><button class="btn go" data-a="obskipdo" data-v="${trEsc(String(o.arg || ''))}">${OB_TEXT.skipGo}</button>`, 'ob-sk wide');
};
const obOverlay0 = overlay;
overlay = function () { return obOverlay0() + obPopHtml(); };
/* «Попробовать» — к механике первого открытия уровня; «Позже» — закрыть. Окно закрывает только то, что показано */
function obDone(L) { if (!S.ob || String(S.ob.queue[0]) !== String(L)) return false; S.ob.queue.shift(); S.ob.seen[L] = 1; return true; }
function obGo(key) {
  const o = OB_D.open[key], g = o && o.go; if (!g) return;
  S.overlay = null;
  if (g.heroes) S.seg.heroes = g.heroes;
  if (g.hire) S.seg.hire = g.hire;
  if (g.craft) S.seg.craft = g.craft;
  if (g.zptab && typeof zpV === 'function') zpV().tab = g.zptab;   // вкладка «Запасов»: сундук уровня — на виду
  if (g.profile) S.seg.profile = g.profile;
  if (g.route === 'heroes' && g.heroes === 'hire' && g.pick === 'next') { const nx = OB_D.heroes.find(x => !rsHas(RSI[x.id])); if (nx) { S.rs.gcyc = RSI[nx.id].c; S.rs.gsel = nx.id; } }
  if (g.route === 'heroes' && g.heroes === 'coll') {
    /* в обучении — герой текущего шага: кому дух, доблесть или предел велит сценарий */
    const s = obStepOf(), lvlT = s && s.k === 'lvl' ? s.to.find(([id, to]) => (obHero(id) || { lvl: to }).lvl < to) : null;
    const stepH = lvlT ? obHero(lvlT[0]) : s && (s.k === 'valor' || s.k === 'limit') ? obHero(s.id) : null;
    const pick = stepH || (g.sel === 'trainee' ? obHero(OB_D.train) : g.sel === 'capped' ? S.heroes.find(h => h.lvl >= obCap(h)) || S.heroes[0] : S.heroes.slice().sort((a, b) => b.lvl - a.lvl)[0]);
    if (pick) { S.hview = 'mine'; S.hgrid = 'own'; S.selHero = pick.id; S.seg.hero = g.hero || 'power'; }
  }
  if (g.route === 'descent') { const b = g.biome === 'front' ? (S.biomes.find(x => x.state === 'front') || {}).id : g.biome; if (b && EB.BIOMES[b]) S.selBiome = b; }
  S.route = g.route;
  if (g.route === 'craft' && g.craft === 'work' && obHintOn()) obHintPut();   // первый рецепт — ресурсы уже на столе
}
/* «Дальше» обучения: текущий шаг сценария. Найм, рецепт, доблесть и предел ведут к своему экрану; дух в уровни, забег и страж в первый раз
   ведут к своей кнопке (научить), дальше делаются сразу (EN_START.script, teach) */
function obDoStep() {
  const s = obStepOf(); if (!s) return render();
  S.overlay = null;
  const book = h => { S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.hgrid = 'own'; S.selHero = h.id; S.seg.hero = 'power'; };
  if (s.k === 'hire') { S.route = 'heroes'; S.seg.heroes = 'hire'; S.seg.hire = 'gold'; if (RSI[s.id]) { S.rs.gcyc = RSI[s.id].c; S.rs.gsel = s.id; } return render(); }
  if (s.k === 'craft') { obHintPut(); return render(); }
  /* сундук — его карточка в Запасах, кнопка «Открыть» светится; Лавка — лист товара шага с ценой; артефакт — его лист в Реликварии */
  if (s.k === 'chest') {
    S.route = 'craft'; S.seg.craft = 'stock';
    if (typeof zpV === 'function') { const V = zpV(), g = zpChestGroups().find(x => obIsTutChestSp(x.cs)); V.tab = 'chest'; if (g) V.sel.chest = g.key; }
    return render();
  }
  if (s.k === 'shop') { S.route = 'craft'; S.seg.craft = 'shop'; const i = OB_TU.shop ? OB_TU.shop.i : -1; return i >= 0 && ACT.buy ? ACT.buy(String(i)) : render(); }
  if (s.k === 'art') { S.route = 'profile'; S.seg.profile = 'arts'; return ACT.sheet('wnart:' + s.id); }
  if (s.k === 'valor' || s.k === 'limit') { const h = obHero(s.id); if (!h) return render(); book(h); return ACT[s.k](h.id); }
  if (s.k === 'lvl') {
    const left = s.to.filter(([id, to]) => (obHero(id) || { lvl: to }).lvl < to);
    if (s.teach) { const h = left.length ? obHero(left[0][0]) : null; if (h) book(h); return render(); }
    const got = [];
    for (const [id, to] of left) { const h = obHero(id); if (!h) continue; const r = HD_SRV.lvl(hdOp(), h.id, to - h.lvl); if (r && r.ok) got.push(`${h.name} — ${r.to}`); }
    return toast(got.length ? `Уровни подняты: ${got.join(', ')}` : OB_STEP_T.lvl(s)[0]);
  }
  if (s.teach) { S.route = 'descent'; S.selBiome = s.b; return render(); }
  if (s.k === 'run') return obRun();
  if (s.k === 'guard') { S.route = 'descent'; S.selBiome = s.b; S.prepSquad = 's1'; return ACT.guard(gdOp()); }
  render();
}
/* кнопка шага: подпись — что сделать; cls — вид кнопки места (big — главная кнопка «Спуска») */
function obCtaHtml(s, cls = '') {
  if (!s) return '';
  const t = OB_STEP_T[s.k](s), ico = { hire: 'users', lvl: 'up', chest: 'key', shop: 'swap', craft: 'spark', valor: 'star', limit: 'gem', art: 'crown', run: 'down', guard: 'door' }[s.k] || 'chev';
  return `<button class="btn go${cls} ob-cta" data-a="obstep" data-v="${S.ob.k}" title="${OB_TEXT.tut}: ${trEsc(t[0])}">${ic(ico)}${trEsc(t[2])}</button>`;
}
Object.assign(ACT, {
  /* «Попробовать» — к механике уровня; на уровне, где сценарий кончается, — к его последним шагам (руны предела остальным) */
  obtry(v) {
    if (obIsLes(v)) { const l = obLesOf(String(v).slice(1)); if (!obDone(v) || !l) return render(); obGoLesson(l); S.ob.hold = S.route; return render(); }   // урок погружения — к его окну
    const lv = obLv(+v); if (!obDone(v)) return render(); if (obTut() && +v >= OB_END_L) { S.ob.hold = ''; return obDoStep(); } obGo(lv.opens[0]); S.ob.hold = S.route; render();
  },
  oblater(v) { obDone(v); render(); },
  /* урок погружения ещё раз — из записки Убежища: окно встаёт первым в очередь */
  oblesson(v) { const j = +v; if (!obLesOf(j)) return render(); S.ob.queue = S.ob.queue.filter(q => q !== 'd' + j); S.ob.queue.unshift('d' + j); S.ob.hold = ''; S.overlay = null; render(); },
  obacc(v) { obSwitch(v === 'fresh'); },
  obgo(v) { obGo(v); render(); },
  /* шаг обучения — «Дальше», «К делу», главная кнопка «Спуска» и итога забега */
  obstep() { obDoStep(); },
  /* первый рецепт — на стол: ресурсы подсказки в ячейки */
  obhint() { obHintPut(); render(); },
  /* пропуск обучения: подтверждение с итогом, затем одна операция сервера с номером. Окно уровня закрывается, очередь — тоже */
  obskip() { if (!obTut()) return toast(OB_TEXT.skipNot); S.ob.hold = ''; open('obskip', 'ob' + S.ob.srv.seq); },
  obskipdo(v) {
    const r = OB_SRV.skip(v || 'ob' + S.ob.srv.seq);
    S.overlay = null;
    if (r.again) return render();
    if (r.refuse) return toast(OB_TEXT.skipNot);
    obGates(); S.route = 'shelter'; toast(OB_TEXT.skipDone);
  },
});
/* после «Попробовать» следующее окно ждёт смены экрана; Esc закрывает окно уровня, как лист */
addEventListener('en-render', () => {
  obWrapActs();   // действия, добавленные после запуска, — тоже через ворота обучения
  if (!obOn()) { if (JSON.stringify(NAV_OPEN) !== JSON.stringify(OB_NAV0)) obGates(); return; }
  if (S.ob.hold && S.ob.hold !== S.route) S.ob.hold = '';
  if (obSync()) render();
  else if (obTut()) obPaintLocks();
});
try {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !obOn() || S.overlay) return;
    if (S.ob.queue.length && obCanShow()) { e.preventDefault(); ACT.oblater(String(S.ob.queue[0])); }
  });
} catch (_) { }

/* ================== лист «Уровень Странника» ================== */
function obStageText(L) { const lv = obLv(L); return lv ? lv.why : ''; }
/* этап следующего уровня: сколько сделано — для листа и записки */
function obProgress(L) {
  const lv = obLv(L); if (!lv || !lv.stage || !S.ob) return '';
  const st = lv.stage.all || lv.stage.any || [lv.stage], F = obStage(S), out = [];
  for (const x of st) if (x.k === 'floor') out.push(`этаж ${Math.min(x.n, (F.floor[x.b] || 0))} из ${x.n}`);
  return out.join(' · ');
}
function obRewardText(L) {
  const r = OB_R.reward(L), out = [`${fmt(r.gold)} золота`];
  if (r.spirit) out.push(`${fmt(r.spirit)} духа`); if (r.keys) out.push(`${r.keys} ${plural(r.keys, 'рунный ключ', 'рунных ключа', 'рунных ключей')}`);
  if (r.runes) out.push(`${r.runes} рун предела`); if (r.train) out.push('руна обучения');
  for (const [id, n] of r.items) { const x = BAG.item(id); out.push(`${x ? itName(x) : id} ×${n}`); }
  if (r.chest) out.push('сундук странника');
  for (const [id, n] of r.shards) out.push(`осколки героя ×${n}`);
  return out.join(', ');
}
function obLevelSheet() {
  const lvl = S.acc.level, xp = S.acc.xp, next = S.acc.next, c = S.acc.cycle, on = obOn();
  const nL = lvl + 1, nlv = obLv(nL), prog = on ? obProgress(nL) : '';
  const head = `<div class="row ob-sh-h"><div class="stat"><b class="ob-sh-n">${lvl}</b><small>уровень</small></div><div class="col grow" style="gap:4px">${bar(xp / Math.max(1, next) * 100, 'sand')}<span class="faint num" style="font-size:12.5px">${fmt(xp)} / ${fmt(next)} опыта</span></div></div>`;
  const nx = nlv ? `<div class="pnl pad ob-sh-nx"><span class="eyebrow">${OB_TEXT.next} · ${nL} · ${trEsc(nlv.n)}</span>
      <p><b>${OB_TEXT.stage}:</b> ${trEsc(nlv.why)}${prog ? ` · <span class="num">${prog}</span>` : ''}</p>
      <p class="faint">${OB_TEXT.willOpen}: ${nlv.opens.map(k => trEsc(OB_D.open[k].n)).join(', ')}.</p></div>`
    : `<div class="pnl pad ob-sh-nx"><span class="eyebrow">${OB_TEXT.next} · ${nL}</span><p>${OB_TEXT.gift}: ${fmt(OB_R.gift(nL))} золота.</p></div>`;
  const rows = OB_D.levels.map(l => {
    const st = l.L <= lvl ? 'got' : l.L === nL ? 'next' : 'wait';
    return `<div class="ob-lr ${st}"><b class="num">${l.L}</b><div class="col" style="gap:2px;min-width:0"><span class="ob-lr-n">${trEsc(l.n)}<small> · ${trEsc(l.why)}</small></span>
      <small class="ob-lr-o">${l.opens.map(k => trEsc(OB_D.open[k].n)).join(' · ')}</small><small class="ob-lr-r">${obRewardText(l.L)}</small></div>
      <span class="ob-lr-s">${st === 'got' ? ic('check') + OB_TEXT.done : st === 'next' ? `${fmt(OB_R.thr(l.L))} опыта` : `${fmt(OB_R.thr(l.L))}`}</span></div>`;
  }).join('');
  const src = Object.entries(OB_D.xp).map(([k, v]) => `<div class="srow"><span class="n">${OB_XPN[k] || k}</span><span class="v">${fmt(v * c)}</span><span></span></div>`).join('');
  /* погружения леса (ADR-0049): урок каждого погружения; пройденные — со своей глубиной, следующее — подсвечено; урок — открыть ещё раз */
  const cur = on ? obStepOf() : null;
  const dvRows = OB_DV ? OB_DV.list.map(d => {
    const l = OB_DV.lessons[d.lesson] || { n: '' }, st = on && S.ob && (S.ob.ran || 0) >= d.no ? 'got' : cur && cur.d === d.j ? 'next' : 'wait';
    const s2 = st === 'got' ? `${ic('check')}${d.win ? OB_TEXT.diveDone : `${OB_TEXT.diveDone} · ${d.wall}-й этаж`}` : st === 'next' ? OB_TEXT.diveNow : '';
    return `<div class="ob-lr ${st}"><b class="num">${d.j}</b><div class="col" style="gap:2px;min-width:0"><span class="ob-lr-n">${trEsc(l.n)}</span></div>${on && st !== 'wait' ? `<button class="link ob-lr-s" data-a="oblesson" data-v="${d.j}">${s2}</button>` : `<span class="ob-lr-s">${s2}</span>`}</div>`;
  }).join('') : '';
  const dives = dvRows ? `<span class="eyebrow">${OB_TEXT.dives} · ${OB_TEXT.lesson.toLowerCase()} перед каждым</span><div class="col ob-lt">${dvRows}</div>` : '';
  const body = `${head}${nx}<span class="eyebrow">Уровни 1–10 · цикл I</span><div class="col ob-lt" data-keep="oblt">${rows}</div>${dives}
    <p class="reason">${OB_TEXT.formula}</p>${TM('<p class="reason">§16: переход L → L+1 — ⌈100 × L^1,5⌉ опыта, «Дар Страннику» — 6 500 × (1 + L × 0,1) золота.</p>')}
    <span class="eyebrow">${OB_TEXT.xpSrc} · цикл ${ROMAN[c]} (×${c})</span><div class="col" style="gap:2px">${src}</div>
    <p class="reason">${OB_TEXT.xpNote}</p>${TM(`<p class="reason">EN_START: пороги ${OB_D.levels.map(l => l.xp).join(' / ')}; уровень — EnStart.claim с номером. Сценарий — docs/content/старт-с-чистого-листа.md.</p>`)}`;
  return sheet(OB_TEXT.level, body, '', true);
}
/* лист — в материале покоев Странника, как прежний (screens/chambers.js, cbMark): окно раздела «Странник» */
if (OB_R) OV.level = () => (typeof cbMark === 'function' ? cbMark(obLevelSheet()) : obLevelSheet());

/* ================== ворота вкладок ================== */
const obLockIc = () => (obArtOn(OB_ART.lock) ? obArtImg(OB_ART.lock, 'ob-lka') : ic('lock'));   // замок закрытого раздела — знак арта, без него — значок
const obLockHtml = (name, n) => `<section class="scr"><div class="pnl pad ob-lock">${obLockIc()}<b class="serif">${trEsc(name)}</b><p>${OB_TEXT.locked(n)}</p></div></section>`;
/* «Ремесло»: закрытые вкладки — замок у подписи и окно-замок */
const OB_CRAFT_N = { work: 'Мастерская', stock: 'Запасы', shop: 'Лавка', market: 'Рынок', reforge: 'Перековка' };
if (typeof SCREENS !== 'undefined' && SCREENS.craft) {
  const scr0 = SCREENS.craft;
  SCREENS.craft = () => {
    const m = scr0(); if (!obOn() || !m || !m.seg) return m;
    const lv = obLvl(), at = k => OB_R.opensAt('seg', 'craft:' + k);
    m.seg = Object.assign({}, m.seg, { items: m.seg.items.map(([k, l, b]) => at(k) > lv ? [k, `${ic('lock')}${l}`, b] : [k, l, b]) });
    const cur = S.seg.craft; if (at(cur) > lv) m.html = obLockHtml(OB_CRAFT_N[cur] || cur, at(cur));
    return m;
  };
}
/* Призыв «За души» — с открытием Возрождения душ */
if (typeof hireView === 'function') {
  const hire0 = hireView;
  hireView = function () {
    const h = hire0(); if (!obOn()) return h;
    const n = OB_R.opensAt('hire', 'souls'); if (obLvl() >= n) return h;
    const x = h.replace('>За души</button>', `>${ic('lock')}За души</button>`);
    if (S.seg.hire !== 'souls') return x;
    const i = x.indexOf('</div></div>');
    return i < 0 ? obLockHtml('Возрождение душ', n) : x.slice(0, i + 12) + `<div class="pnl pad ob-lock">${obLockIc()}<b class="serif">Возрождение душ</b><p>${OB_TEXT.locked(n)}</p></div></section>`;
  };
}

/* ================== Убежище: следующий шаг и дела ================== */
/* следующий шаг — шаг сценария обучения: что сделать и одна кнопка к нему (ADR-0040). Этап следующего уровня — строкой ниже */
function obNextStep() {
  const s = obStepOf(); if (!s) return null;
  const t = OB_STEP_T[s.k](s);
  return { h: t[0], p: t[1], d: s.k === 'run' && s.d && obLesOf(s.d) ? s.d : 0 };
}
if (typeof shNext === 'function') {
  const shNext0 = shNext;
  shNext = function () {
    if (!obOn() || !obTut()) return shNext0();
    const x = obNextStep(); if (!x) return shNext0();
    const orn = ['tl', 'tr', 'bl', 'br'].map(c => `<i class="sh-orn ${c}" aria-hidden="true"></i>`).join('');
    return `<div class="sh-next">${orn}${typeof shCrest === 'function' ? shCrest('mage', ' sh-next-cr') : ''}<div class="sh-next-b">
      <span class="eyebrow">${OB_TEXT.tut}</span><button class="link ob-skip" data-a="obskip">${OB_TEXT.skip}</button>
      <h2>${trEsc(x.h)}</h2><p>${trEsc(x.p)}</p>
      <div class="sh-next-a"><button class="btn sm go" data-a="obstep" data-v="${S.ob.k}">${OB_TEXT.toDo}</button>${x.d ? `<button class="link" data-a="oblesson" data-v="${x.d}">${OB_TEXT.lesAgain} ${ic('chev')}</button>` : `<button class="link" data-a="sheet" data-v="level">${OB_TEXT.level} ${ic('chev')}</button>`}</div>
    </div></div>`;
  };
}
if (typeof shActs === 'function') {
  const shActs0 = shActs;
  shActs = function () { return obOn() && obLvl() < OB_R.opensAt('nav', 'week') ? '' : shActs0(); };
}

/* ================== обучение на экранах: кнопка шага, подсказка рецепта, замки (ADR-0040) ================== */
/* итог забега: «Сменить отряд» — нет (отряд собирается сам), «Ещё забег» — шаг обучения; совет «меняйте состав» — шаг словами */
/* дар погружения в итоге забега (ADR-0049): золото, дух, души и ключи ремёсел значками, остальное — счётом; всё уже в запасах */
function obGiftHtml(g) {
  const tier = id => (BAG.item(id) || {}).tier || '', rank = { key: 0, unique: 1, basic: 2 };
  const items = g[3].slice().sort((a, b) => (rank[tier(a[0])] ?? 3) - (rank[tier(b[0])] ?? 3) || b[1] - a[1]), show = items.slice(0, OB_VIEW.giftShow), more = items.length - show.length;
  return `<div class="ob-gift"><span class="eyebrow">${OB_TEXT.gift}</span><div class="row ob-gift-r">${g[0] ? money('gold', g[0]) : ''}${g[1] ? money('spirit', g[1]) : ''}${g[2] ? money('souls', g[2]) : ''}${lootHtml(Object.fromEntries(show))}${more ? `<small class="ob-gift-m">${OB_TEXT.giftMore(more)}</small>` : ''}</div><p class="reason">${OB_TEXT.giftNote}</p></div>`;
}
if (OV.result) {
  const res0 = OV.result;
  OV.result = function (o) {
    let h = res0(o); if (!h) return h;
    const R = runById(o.arg) || focusRun();
    if (R && R.gift && obOn()) {   // погружение: «Погружение N из M» над итогом и дар — над добычей этажей, на виду без прокрутки
      h = h.replace('<div class="dlg-b">', `<div class="dlg-b"><span class="eyebrow ob-dive-ey">${OB_TEXT.dive(R.d || 0, obDiveN())}</span>`);
      const loot = '<span class="eyebrow">Добыча · в запасах</span>';
      if (h.includes(loot)) h = h.replace(loot, obGiftHtml(R.gift) + loot);
      else { const at = h.lastIndexOf('</div><div class="dlg-f">'); if (at > 0) h = h.slice(0, at) + obGiftHtml(R.gift) + h.slice(at); }
    } else if (R && R.d && obOn()) h = h.replace('<div class="dlg-b">', `<div class="dlg-b"><span class="eyebrow ob-dive-ey">${OB_TEXT.dive(R.d, obDiveN())}</span>`);
    if (!obTut()) return h;
    const s = obStepOf();
    h = h.replace(/<button class="btn" data-a="resquad"[^>]*>[\s\S]*?<\/button>/, '').replace(/<button class="btn go" data-a="again"[^>]*>[\s\S]*?<\/button>/, obCtaHtml(s));
    return h.replace('Тот же отряд пройдёт биом так же — меняйте состав или стихии.', `${OB_TEXT.tut}: ${trEsc(OB_STEP_T[s.k](s)[0])}.`);
  };
}
/* настройки: «Пропустить обучение» — пока оно идёт */
if (OV.settings) {
  const set0 = OV.settings;
  OV.settings = function (o) {
    const h = set0(o); if (!obTut()) return h;
    const row = `<div class="setrow ob-setrow"><span>Обучение</span><button class="btn sm" data-a="obskip">${OB_TEXT.skip}</button></div>`;
    const at = h.indexOf('<div class="setrow"><span>Промокод');
    return at < 0 ? h : h.slice(0, at) + row + h.slice(at);
  };
}
/* «Спуск»: главная кнопка — шаг обучения, если шаг — не забег этого биома */
if (typeof SCREENS !== 'undefined' && SCREENS.descent) {
  const ds0 = SCREENS.descent;
  SCREENS.descent = function () {
    const m = ds0.apply(this, arguments); if (!m || !m.html || !obTut()) return m;
    const s = obStepOf(); if (s.k === 'run' && s.b === S.selBiome) return m;
    return Object.assign({}, m, { html: m.html.replace(/<button class="btn go big" data-a="sheet" data-v="prep">[\s\S]*?<\/button>/, obCtaHtml(s, ' big')) });
  };
}
/* Мастерская: пока первый рецепт не найден — пометка Этриона с рецептом целиком у стола и подсветка ячеек; стол с рецептом — «Попробовать» */
if (typeof wsTableHtml === 'function') {
  const tb0 = wsTableHtml;
  wsTableHtml = function () {
    let h = tb0(); if (!obHintOn()) return h;
    const on = obTableIs(S.ws.cells, OB_HINT.r), ids = new Set(OB_HINT.in.map(x => x[0])), hl = new Set();
    S.ws.cells.forEach((c, i) => { if (c && ids.has(c.id)) hl.add(i); });
    if (!hl.size) { let n = OB_HINT.in.length; S.ws.cells.forEach((c, i) => { if (!c && n > 0) { hl.add(i); n--; } }); }
    const note = `<div class="cr-hint ws-note ob-hint"><i class="cr-seal" aria-hidden="true"></i><div class="cr-hint-t"><b class="cr-hint-h">${OB_TEXT.hintH}</b><span class="cr-hint-n">${OB_TEXT.first}</span>${obRecipeHtml(' sm')}${on ? '' : `<p>${OB_TEXT.hintNote}</p><button class="btn sm go ob-hint-go" data-a="obhint">${OB_TEXT.hintPut}</button>`}</div></div>`;
    h = h.replace(/<div class="cr-hint ws-note[^"]*">[\s\S]*?<\/div><\/div>/, '').replace(/<div class="ws-hex(?: noted)?">/, `<div class="ws-hex noted ob-hx">${note}`);
    h = h.replace(/(<(?:button|span) class=")([^"]*\bws-cell\b[^"]*)("[^>]*data-wscell="(\d)")/g, (m, a, cls, rest, i) => (hl.has(+i) ? a + cls + ' ob-hl' + rest : m));
    if (on) h = h.replace(/(<p class="ws-st[^"]*" role="status">)[\s\S]*?(<\/p>)/, `$1${OB_TEXT.hintOn}$2`);
    return h;
  };
}
/* книга рецептов: первый рецепт — найденный лист, пока не сложен (стрелка ведёт к столу: ворота «wsmake» → подсказка на стол) */
if (typeof WS_SRV !== 'undefined') {
  const bk0 = WS_SRV.book;
  WS_SRV.book = function () {
    const b = bk0.apply(this, arguments); if (!obHintOn() || b.some(x => x.id === OB_HINT.r)) return b;
    const r = BAG.recipe(OB_HINT.r);
    return r ? [{ id: r.id, whole: true, r, hint: true }].concat(b) : b;
  };
}
/* замки и следующий шаг на экране: после каждой отрисовки кнопки, чьё действие закрыто, — с замком и причиной; кнопка шага светится.
   Решают ворота obGate — те же, что у самих действий */
function obPaintLocks() {
  try {
    const g = document.getElementById('game'); if (!g || !g.querySelectorAll) return;
    const s = obStepOf(); if (!s) return;
    /* указатель: карточка героя шага в Призыве и в коллекции — к ней ведёт шаг */
    const ids = s.k === 'lvl' ? s.to.filter(([id, to]) => (obHero(id) || { lvl: to }).lvl < to).map(x => x[0]) : s.k === 'valor' || s.k === 'limit' ? [s.id] : [];
    const ptr = (a, v) => (s.k === 'hire' ? a === 'gsel' && v === s.id
      : s.k === 'chest' ? (a === 'zpsel' || a === 'zptab') && (obIsTutGroup(v) || (a === 'zptab' && v === 'chest'))
      : s.k === 'shop' ? a === 'buy' && !!S.shop[+v] && S.shop[+v][0] === s.id
      : s.k === 'art' ? (a === 'sheet' && v === 'wnart:' + s.id) || (a === 'seg' && v === 'profile:arts')
      : (a === 'hero-open' || a === 'hero') && ids.includes(obRid(H(v))));
    g.querySelectorAll('[data-a]').forEach(el => {
      const a = el.getAttribute('data-a'), v = el.getAttribute('data-v'); if (!a || /^ob/.test(a)) return;
      const r = obGate(a, v);
      if (r && r.lock && !r.go) {
        el.classList.add('ob-lk'); el.setAttribute('aria-disabled', 'true'); el.setAttribute('title', r.why);
        if (el.tagName === 'BUTTON' && (el.textContent || '').trim() && !el.querySelector('.ob-lki')) el.insertAdjacentHTML('afterbegin', ic('lock', 'ob-lki'));
      } else if ((!r && !OB_VIEW_ACT.has(a)) || (r && r.go && !r.lock) || ptr(a, v)) el.classList.add('ob-nx');
    });
  } catch (_) { }
}

/* ================== презентация: сценарий, карта экранов, UI-кит ================== */
/* сценарий — разовый показ нового аккаунта: режим аккаунта не меняет, «Сбросить» вернёт прежний; насовсем — переключатель «Аккаунт» */
function obShow() {
  if (!OB_R) return;
  try { if (typeof loop !== 'undefined' && loop) { clearInterval(loop); loop = null; } } catch (_) { }
  const s = obFresh(obInit0()); obSync(s); S = s; obGates();
}
if (typeof FLOWS !== 'undefined' && OB_R) FLOWS.push(['Старт с чистого листа', 'Новый аккаунт: уровень 1, окно уровня, закрытые разделы шахты; путь — до цикла II. Насовсем — «Аккаунт: Чистый лист»', () => { obShow(); }]);
if (typeof MAP !== 'undefined') { const w = MAP.find(m => m.n === 'Странник'); if (w && w.ready && !w.ready.includes('account-level')) w.ready.push('account-level'); }
function obMapHtml() {
  if (!OB_D) return '';
  const rows = OB_D.levels.map(l => `<tr><td class="num">${l.L}</td><td><b>${trEsc(l.n)}</b><br><small>${trEsc(l.why)}</small></td><td>${l.opens.map(k => trEsc(OB_D.open[k].n)).join('<br>')}</td><td>${obRewardText(l.L)}</td><td class="num">${fmt(l.xp)}</td></tr>`).join('');
  const P = OB_D.path || {}, m = P.min || {};
  return `<h2>Старт с чистого листа</h2>
    <p class="p-lead">Новый игрок за два биома цикла I знакомится со всеми механиками старта. Уровень Странника берётся, когда выполнен этап и набран опыт; каждый уровень — окно поверх экрана: «Уровень N», полученное, открывшееся голосом проводника и «Попробовать». Включить — «Аккаунт: Чистый лист» в панели прототипа.</p>
    <div class="p-kpis"><div class="p-kpi"><span class="n">${Math.round((m.b1 || 0) / 60)}<i>мин</i></span><small>боя в Мастерской форм: три забега и страж</small></div><div class="p-kpi"><span class="n">${obDiveN()}<i>погружений</i></span><small>в Подземный лес, ${Math.round((m.b2 || 0) / 60)} мин боя: перед каждым — урок, после — дар погружения; ещё трое героев, доблесть и предел</small></div><div class="p-kpi"><span class="n">10</span><small>уровней сценария; дальше — формула §16</small></div></div>
    <div class="ob-map-w"><table class="ob-map"><thead><tr><th>Ур.</th><th>Этап</th><th>Открывается</th><th>Награда</th><th>Порог</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="p-note">Данные — design/ui/start.js (сборщик tools/content-gen/start/build.js), обоснование — docs/content/старт-с-чистого-листа.md.</p>`;
}
if (typeof renderMap === 'function') {
  const map0 = renderMap;
  renderMap = function () { map0(); try { const box = document.getElementById('obMap'); if (box) box.innerHTML = obMapHtml(); } catch (_) { } };
}
/* UI-кит — образцы на героях демо (S.heroes[0], [1], [3]). У нового аккаунта героев ещё нет: кит рисуется по демо-состоянию, живое
   возвращается. Без этого запуск в «Чистом листе» обрывался на ките, и панель прототипа оставалась без обработчиков */
if (typeof renderKit === 'function') {
  const kit0 = renderKit;
  renderKit = function () {
    if (!OB_MODE || (S && S.heroes && S.heroes.length > 3)) return kit0();
    const keep = S; S = obInit0();
    try { return kit0(); } finally { S = keep; }
  };
}
/* UI-кит: окно уровня — образец на уровне 3 */
function obKitHtml() {
  if (!OB_D) return '';
  const lv = obLv(3), items = obRewardItems(3), A = obCardArt();
  return `<section class="k-box" style="grid-column:1/-1" id="kitLevel"><h3>Окно уровня</h3>
    <p class="k-note">Поверх любого экрана, кроме идущего боя; по одному, очередью. «Уровень N» на медальоне, полученное — вещи выезжают по очереди и вспыхивают, открывшееся — голосом проводника со знаками открытий, одна кнопка «Попробовать» ведёт к механике. Рама, медальон, вспышка и знаки — арт assets/art/start/; без него — прежний вид средствами CSS. Уровень и награду выдаёт сервер одной операцией с номером.</p>
    <div class="ob-kit"><div class="ob-card still${A.cls}"${A.style}><div class="ob-hd${A.md ? ' md' : ''}">${A.hd}<svg class="ob-ring" viewBox="0 0 120 120"><circle class="ob-r0" cx="60" cy="60" r="${OB_VIEW.ring}"/><circle class="ob-r1" cx="60" cy="60" r="${OB_VIEW.ring}"/></svg><b class="ob-n num">3</b></div>
      <span class="eyebrow ob-ey">${OB_TEXT.level}</span><h2 class="ob-t">Уровень 3 · ${trEsc(lv.n)}</h2>
      <div class="ob-got"><span class="eyebrow">${OB_TEXT.got}</span><ul class="ob-rws">${items.map((x, i) => `<li class="ob-rw" style="--i:${i}"><span class="ob-pic">${x.pic}</span><b class="num">${x.n}</b><small>${trEsc(x.t)}</small></li>`).join('')}</ul></div>
      <div class="ob-open"><div class="ob-say"><span class="eyebrow">${OB_TEXT.open}</span><p>${trEsc(lv.say[1])}</p></div></div>
      <div class="ob-act"><button class="link" tabindex="-1">${OB_TEXT.later}</button><button class="btn go" tabindex="-1">${OB_TEXT.tryIt}</button></div></div></div>
  </section>`;
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: obKitHtml });

/* ================== запуск ================== */
(function obBoot() {
  try {
    const box = document.getElementById('devAcc');
    if (box && box.addEventListener) box.addEventListener('click', e => { const b = e.target.closest('[data-acc]'); if (b) obSwitch(b.dataset.acc === 'fresh'); });
  } catch (_) { }
  if (OB_MODE && OB_R) { S = initialState(); }
  obWrapActs(); obGates(); obPaintAcc();
})();
