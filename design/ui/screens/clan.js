/* screens/clan.js — «Неделя → Клан»: паспорт с резервуаром, клановый босс, участники, древо; без клана — поиск (§24, §25 GDD).
   Подключается после screens/model.js и данных design/ui/clan.js: EN_CLAN и алгоритмы EnClan собирает tools/content-gen/clan/build.js
   из калькуляторов экономики и ядра боя, руками не править. Черновик для автора — docs/content/клан.md.
   Регистрирует: SCREENS.clan — вкладки сегментами шапки S.seg.clan: pass — паспорт и резервуар, boss — клановый босс, mem — участники,
   tree — древо; без клана — поиск клана (пустое состояние). Листы OV.cl*, действия ACT.cl*; итоги недели — реестр WEEK_MODES
   (id clan, screens/week.js); раздел UI-кита «Клан» через KIT_EXTRA; сценарии презентации.
   Своё состояние — S.clan (заводится как S.bag): S.clan.n читают профиль и Неделя, S.clan.boss.att — наблюдатель контрактов
   (атаки по врагам клана — задание контракта). Очки контрактов игрока в резервуар — S.contracts.clan (screens/contracts.js).
   Сервер решает (§36.16): CL_SRV — операции с номером: атака, пассивка древа, сброс древа, раздача, роли, заявки, исключение,
   паспорт, вход, заявка, выход, создание. Номер несёт кнопка, повтор ничего не повторяет. Исход атаки — бой ядром (battle.js)
   на сиде атаки, решён до показа: просмотр и «Пропустить» итог не меняют. Элиты круга — стихия и класс на сиде круга (EnClan.roll).
   Подсчёт недели — место, пул сундуков и половина по вкладу — тоже сервер.
   Правила воздуха (ADR-0026): на карточке — не больше двух чисел, двух чипов и одного действия; подробности — в листах; значки — ICON.
   Служебное — только команде: TM, PL, tmT из index.html. Все числа CL — демонстрация, не баланс. */
(function () {
'use strict';
const D = window.EN_CLAN, EC = window.EnClan, LB = window.EN_LOOTBOXES || null;
if (!D || !EC) {
  SCREENS.clan = () => ({ title: 'Клан', back: 'week', html: '<section class="scr"><div class="pnl pad"><p class="faint">Нет данных клана: рядом с index.html должен лежать clan.js.</p></div></section>' });
  return;
}

/* ================== данные экрана: демонстрация, не баланс ================== */
const CL = {
  /* клан игрока: «Пепельный круг», Средний, 12-й уровень, 18 из 26; игрок — глава и основатель. Команда смотрит и как казначей или участник */
  clan: {
    id: 'pk', n: 'Пепельный круг', emblem: 3, type: 'mid', join: 'apply', req: { level: 10, cycle: 2 },
    note: 'Уважение к участникам. О перерывах предупреждаем заранее.',
    dir: 'Клановый босс и древо',
    goals: { day: 'Все атаки по врагам клана', week: 'Круг 6 до отсечки', month: 'Уровень 15 древа' },
    founded: 6,                           // недель назад
    earned: 13, lvl: 12, resBp: 6200,     // очков навыков заработано и потрачено (уровень): одно ждёт главу; резервуар — доля пути к следующему
    picks: [0, 1, 2, 3, 0, 1, 0, 2, 3, 0, 2, 4],   // выбранная альтернатива уровней 1–12
    no: 7,                                // номер недели клана: сид кругов
  },
  role: 'head',
  /* участники: имя, роль, уровень Странника, цикл, очков в резервуар за неделю, вес урона по врагам, атак осталось сегодня, в сети — часов назад, недель в клане */
  members: [
    ['Странник', 'head', 24, 2, 0, 3, 6, 0, 6],
    ['Тихий ветер', 'treasurer', 41, 3, 640, 14, 1, 0, 6],
    ['Северный странник', 'treasurer', 38, 3, 590, 12, 0, 2, 6],
    ['Собиратель искр', 'member', 33, 2, 520, 10, 3, 1, 5],
    ['Лунный страж', 'member', 31, 2, 480, 9, 6, 5, 5],
    ['Искатель', 'member', 30, 2, 0, 7, 6, 30, 4],
    ['Светлый пепел', 'member', 29, 2, 450, 7, 2, 3, 4],
    ['Тихий шаг', 'member', 28, 2, 410, 6, 4, 8, 4],
    ['Синий огонь', 'member', 27, 2, 380, 6, 0, 1, 3],
    ['Пепельная тропа', 'member', 26, 2, 350, 5, 6, 26, 3],
    ['Ночная ива', 'member', 25, 2, 330, 4, 1, 4, 3],
    ['Ржавый ключ', 'member', 25, 2, 0, 4, 6, 70, 2],
    ['Серая сова', 'member', 23, 2, 300, 3, 3, 6, 2],
    ['Долгий путь', 'member', 22, 2, 280, 3, 5, 12, 2],
    ['Каменный шёпот', 'member', 21, 2, 260, 2, 6, 40, 1],
    ['Янтарная нить', 'member', 20, 2, 240, 2, 2, 2, 1],
    ['Белый ворон', 'member', 19, 2, 200, 1, 0, 9, 1],
    ['Старый колокол', 'member', 17, 2, 150, 1, 6, 20, 0],
  ],
  /* клановый босс: неделя идёт четвёртый день; взяты круги 1–3 и две элиты круга 4, у третьей — остаток здоровья, б. п. */
  boss: { circle: 4, killsIn: 2, leftBp: 900, days: 4,
    spread: [50, 100],                   // урон демо-недели по участникам: вес × (50 + случай до 100)
    onLast: [['m2', 5], ['m3', 3], ['m4', 2]] },   // кто и в какой доле уже бил третью элиту круга
  past: { pts: 12400 },                 // прошлая неделя: очки клана — по весам урона участников
  apps: [['Быстрый лис', 21, 2, 'Играю вечером, босса бью каждый день.'], ['Каменная ива', 33, 3, '']],
  /* журнал: дней назад, вид, текст — события до сессии; новые пишет сервер */
  log: [
    [1, 'tree', 'Глава Странник выбрал «Карст: Земля» на 12-м уровне древа.'],
    [1, 'join', 'В клан вступил Старый колокол.'],
    [3, 'roles', 'Глава Странник назначил Северного странника казначеем.'],
    [5, 'join', 'Из клана вышел Быстрый лис. Его вклад остаётся в журнале.'],
    [6, 'tree', 'Резервуар наполнился: 12-е очко навыков.'],
  ],
  /* место клана по очкам недели: пороги мест кланов сервера — [место, очков] по убыванию очков */
  board: [[1, 900000], [10, 420000], [100, 160000], [1000, 30000], [4000, 1]],
  leaders: { now: [['Северный дозор', 612000], ['Светлый круг', 575000], ['Серые крылья', 498000]], past: [['Светлый круг', 934000], ['Северный дозор', 911000], ['Серые крылья', 842000]] },
  /* поиск: кланы сервера — имя, эмблема, тип, вход, уровень, участников, требования, место прошлой недели, принципы */
  search: [
    { id: 'sd', n: 'Северный дозор', emblem: 1, type: 'hard', join: 'apply', lvl: 31, mem: 27, req: { level: 40, cycle: 4 }, place: 2, note: 'Все атаки — каждый день. Цель — верх рейтинга.' },
    { id: 'sk', n: 'Серые крылья', emblem: 5, type: 'mid', join: 'apply', lvl: 18, mem: 22, req: { level: 25, cycle: 3 }, place: 3, note: 'Контракт и босс каждый день.' },
    { id: 'sv', n: 'Светлый круг', emblem: 2, type: 'hard', join: 'apply', lvl: 24, mem: 27, req: { level: 30, cycle: 3 }, place: 1, note: 'Мест нет — ждём, кто уйдёт.' },
    { id: 'nk', n: 'Ночной караван', emblem: 10, type: 'mid', join: 'apply', lvl: 9, mem: 19, req: { level: 15, cycle: 2 }, place: 2400, note: 'Контракты каждый день, босс — по вечерам.' },
    { id: 'tg', n: 'Тихая гавань', emblem: 8, type: 'chill', join: 'open', lvl: 6, mem: 14, req: { level: 10, cycle: 2 }, place: 3100, note: 'Без обязательств. Новичкам рады.' },
  ],
  names: ['Лесной огонь', 'Сухой лист', 'Медный гвоздь', 'Дальний берег', 'Тонкий лёд', 'Горький мёд', 'Ясный полдень', 'Старая верба', 'Кривой нож', 'Тёплый камень',
    'Серый ручей', 'Ранний снег', 'Хромой пёс', 'Звонкая медь', 'Глухой колодец', 'Лунный мох', 'Вторая свеча', 'Узкий мост', 'Чёрный хлеб', 'Сизый дым',
    'Тихий гром', 'Ржаное поле', 'Поздний гость', 'Косой дождь', 'Длинная тень', 'Белая соль', 'Пустой колчан', 'Рыжая лиса', 'Песчаный вал', 'Кованый обруч'],
  create: { nameMin: 3 },
  day: 86400,                            // секунд в сутках
};
/* вид */
const CL_VIEW = { knot: 18, knotBig: 24, face: 40, list: 12, logShow: 40, planMax: 99 };

/* ================== помощники ================== */
const BP = D.bp;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const roleOf = id => D.roles.find(r => r.id === id) || D.roles[D.roles.length - 1];
const typeOf = id => D.passport.types.find(t => t.id === id) || D.passport.types[0];
const joinOf = id => D.passport.join.find(j => j.id === id) || D.passport.join[0];
const inClan = () => !!(S.clan && S.clan.in);
const meOf = (C = S.clan) => C.members.find(m => m.me) || null;
const can = right => inClan() && roleOf(S.clan.role).rights.includes(right);
const clOp = () => 'c' + S.clOps.seq;
const genOf = r => D.lists.gen[r] || r;
const single = r => D.boss.single[r] || r;
const clsName = c => c === 'Дебаффер' ? 'Контроль' : c;
const initials = n => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const ago = h => h <= 0 ? 'в сети' : h < 24 ? `${h} ч назад` : `${Math.floor(h / 24)} ${plural(Math.floor(h / 24), 'день', 'дня', 'дней')} назад`;
const dayWord = d => d <= 0 ? 'сегодня' : d === 1 ? 'вчера' : `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
const ptsWord = n => plural(n, 'очко', 'очка', 'очков');
const chestWord = n => plural(n, 'сундук', 'сундука', 'сундуков');
const rarName = r => (LB && LB.boxRarity ? LB.boxRarity[r - 1] : RAR[r].toLowerCase());
const boxName = r => `Сундук талисманов · ${rarName(r)}`;
const pointsFree = () => Math.max(0, S.clan.earned - S.clan.picks.filter(x => x != null).length);
/* уровень, чью пассивку глава выбирает следующей: первый невыбранный — после сброса древа это уровни с первого */
const nextPick = () => { const C = S.clan; for (let L = 1; L <= C.earned && L <= D.tree.levels.length; L++) if (C.picks[L - 1] == null) return L; return null; };
const need = n => EC.need(D, n);

/* место клана по очкам недели: пороги CL.board (в игре — рейтинг сервера) */
function placeOf(pts) {
  const B = CL.board; if (!(pts > 0)) return null;
  if (pts >= B[0][1]) return B[0][0];
  for (let i = 1; i < B.length; i++) if (pts >= B[i][1]) return B[i - 1][0] + Math.floor((B[i - 1][1] - pts) * (B[i][0] - B[i - 1][0]) / (B[i - 1][1] - B[i][1]));
  return B[B.length - 1][0];
}
const weekPts = (C = S.clan) => C.members.reduce((a, m) => a + m.boss, 0);

/* ================== эмблема и облик врагов — заглушки до арта (tools/art-gen/jobs/clan.json) ================== */
const EMB = ['M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z', 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  'M4 18l1.5-10 4.5 4 2-6 2 6 4.5-4L20 18z', 'M12 3c.5 3.5 5 5.5 5 10.2A5 5 0 0 1 7 13.2c0-2.6 1.6-4 2.2-6.2.9 1 1.5 2.1 1.7 3.5.8-2.2 1.1-4.7 1.1-7.5z',
  'M12 3.5c3.2 4.2 6 7.3 6 10.6a6 6 0 0 1-12 0c0-3.3 2.8-6.4 6-10.6z', 'M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0', 'M12 3l7 9-7 9-7-9z',
  'M7 3h10M7 21h10M8 3v2.5c0 2 1.6 3.3 4 4.5 2.4-1.2 4-2.5 4-4.5V3M8 21v-2.5c0-2 1.6-3.3 4-4.5 2.4 1.2 4 2.5 4 4.5V21', 'M5 21V4M5 4h11l-2 4 2 4H5',
  'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z', 'M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z', 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z'];
const emblem = (k, cls = '') => `<span class="cl-emb ${cls}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${EMB[((k || 1) - 1) % EMB.length]}"/></svg></span>`;
/* облик врага клана: свет стихии снизу, знак класса после первой победы; до неё — знак вопроса */
function ph(x, cls = '', knownIt) {
  const k = knownIt != null ? knownIt : isKnown(x);
  return `<span class="cl-ph ${cls} ${k ? '' : 'unk'}" data-el="${esc(x.el)}" data-g="${x.g}">${k ? (x.g === 'b' ? ic('crown') : CLS(clsName(x.cls), 30, clsName(x.cls))) : '<b>?</b>'}</span>`;
}
const fidOf = x => x.g === 'b' ? `${x.race}|босс` : `${x.race}|${x.cls}|${x.el}`;
const isKnown = x => !!(S.clan && S.clan.boss && S.clan.boss.known[fidOf(x)]);
const nameOf = (x, knownIt) => { const k = knownIt != null ? knownIt : isKnown(x); return x.g === 'b' ? `Клановый босс · ${x.race}` : k ? `${single(x.race)} · ${clsName(x.cls).toLowerCase()}` : 'Неизученная элита'; };
const rankChip = x => x.g === 'b' ? `<span class="chip gold">${ic('crown')}Клановый босс</span>` : `<span class="chip gold">${ic('gem')}Элита</span>`;

/* ================== состояние ==================
   S.clan: n — имя (профиль, Неделя), in — игрок в клане; паспорт: id, emblem, type, join, req, note, dir, goals, founded;
   earned — очков навыков заработано, lvl — уровень (очков потрачено хоть раз), res — очков в резервуаре к следующему очку, picks — выбор по уровням;
   members — { id, n, role, lvl, cyc, res, boss, atk, seen, weeks, me } — res и boss за неделю; apps — заявки;
   boss — { wk — раса недели, no — номер недели, circle, kills, targets, att — атак игрока, known — бестиарий, n — атак игрока за неделю,
   last — итог последней атаки, mine — личные очки недели }; past — подсчёт прошлой недели: место, пул, половина сервера, план главы;
   log — журнал; hop — очки клану со следующей недели (анти-прыгун); role — роль игрока; seenCt — учтённые очки контрактов;
   srch — поиск: фильтр, заявки, прежний клан. Номера операций «сервера» — S.clOps { seq, ops }: сквозные, через выход и вход в другой клан */
function mkMember(id, row, me) {
  const [n, role, lvl, cyc, res, w, atk, seen, weeks] = row;
  return { id, n, role, lvl, cyc, res, boss: 0, w, atk, seen, weeks, me: !!me };
}
/* цели круга: элиты — стихия и класс на сиде круга; сила — круг */
function circleTargets(C, k) {
  const race = C.boss.wk, got = EC.roll(D, `клан|${C.id}|неделя|${C.boss.no}|круг|${k}`, EC.elitePool(D, C.lvl));
  return got.map((x, i) => target(C, 'e', k, i, x.cls, x.el, race));
}
function target(C, g, k, i, cls, el, race) {
  const uid = `${C.boss.no}-${k}-${g}${i}`, src = EC.card(D, { g, uid, cls, el, race, k });
  return { uid, g, k, cls: g === 'b' ? D.boss.bossCls : cls, el, race, hp: src.maxHp, max: src.maxHp, dmg: {}, dead: false, burned: false, used: [] };
}
/* вклад демо-недели: павшие цели и урон — по весам участников, генератором на сиде клана */
function history(C, rng, upTo, killsIn) {
  const [lo, span] = CL.boss.spread;
  const pay = total => { const got = EC.share(total, C.members.map(m => m.w * (lo + rng(span)))); C.members.forEach((m, j) => { m.boss += got[j]; if (m.me) C.boss.mine += got[j]; }); };
  for (let k = 1; k < upTo; k++) { for (let e = 0; e < D.boss.kills; e++) pay(EC.points(D, k, 'e')); pay(EC.points(D, k, 'b')); }
  for (let e = 0; e < killsIn; e++) pay(EC.points(D, upTo, 'e'));
}
function fresh(s) {
  const d = CL.clan, rng = EB.makeRng(EB.seedOf('клан|демо|' + d.id));
  const C = s.clan = { in: true, id: d.id, n: d.n, emblem: d.emblem, type: d.type, join: d.join, req: Object.assign({}, d.req), note: d.note, dir: d.dir, goals: Object.assign({}, d.goals), founded: d.founded,
    earned: d.earned, lvl: d.lvl, res: 0, picks: d.picks.concat(Array.from({ length: D.tree.levels.length - d.picks.length }, () => null)), resetWk: null,
    members: CL.members.map((r, i) => mkMember('m' + (i + 1), r, i === 0)), apps: CL.apps.map(([n, lvl, cyc, note], i) => ({ id: 'a' + (i + 1), n, lvl, cyc, note })),
    boss: { wk: raceOf(s), no: d.no, circle: CL.boss.circle, kills: CL.boss.killsIn, targets: [], att: 0, known: {}, n: 0, last: null, mine: 0 },
    past: null, log: CL.log.map(([dd, k, t]) => ({ d: dd, k, t })), hop: false, role: CL.role, seenCt: s.contracts ? s.contracts.clan || 0 : 0,
    srch: { f: '', applied: {}, left: null }, day: 0 };
  s.clOps = { seq: 1, ops: {} };   // операции «сервера» клана: номера — сквозные, через выход и вход в другой клан
  C.res = Math.floor(EC.need(D, C.earned + 1) * d.resBp / BP);
  const me = meOf(C); C.boss.att = me.atk;
  history(C, rng, CL.boss.circle, CL.boss.killsIn);
  /* круг 4: две элиты пали, у третьей — остаток здоровья; её урон — у трёх участников */
  C.boss.targets = circleTargets(C, CL.boss.circle);
  C.boss.targets.forEach((x, i) => {
    if (i < CL.boss.killsIn) { x.dead = true; x.hp = 0; C.boss.known[fidOf(x)] = true; return; }
    x.hp = Math.max(1, Math.floor(x.max * CL.boss.leftBp / BP));
    const got = EC.share(x.max - x.hp, CL.boss.onLast.map(([, w]) => w)); CL.boss.onLast.forEach(([id], j) => { x.dmg[id] = got[j]; });
  });
  /* прошлая неделя подсчитана: пул, половина сервера роздана, половина главы ждёт */
  const prevRace = prevOf(C.boss.wk), members = C.members.map(m => ({ id: m.id, n: m.n, cyc: m.cyc, res: m.res, boss: 0 })), got = EC.share(CL.past.pts, C.members.map(m => m.w));
  members.forEach((m, j) => { m.boss = got[j]; });
  C.past = countWeek(C, prevRace, CL.past.pts, members, s.acc.cycle, CL.leaders.past);
  for (const m of C.members) m.w = undefined;
  return s;
}
const raceOf = s => { const W = RS.weeks.find(w => w.gen.toLowerCase() === String(s.week.race).toLowerCase()) || RS.weeks[0]; return W.race; };
const prevOf = race => { const W = RS.weeks, i = Math.max(0, W.findIndex(w => w.race === race)); return W[(i + W.length - 1) % W.length].race; };
/* подсчёт недели (сервер): место по очкам, пул сундуков места на каждого участника, половина — по вкладу сразу */
function countWeek(C, race, pts, members, c, leaders) {
  const place = placeOf(pts), P = EC.pool(LB, place, pts, members.length, Math.max(D.rewards.from, c));
  const H = EC.halves(D, P.groups), srv = EC.serverSplit(D, P.groups, members);
  const me = (C.members.find(x => x.me) || { id: '' }).id;   // участник-игрок: его доля в журнале раздачи — для «Даров»
  return { race, place, pts, me, mine: (members.find(m => m.id === me) || { boss: 0 }).boss, members, row: P.row ? P.row.label : '', groups: H,
    server: srv.map(g => g.got), plan: H.map(() => ({})), done: false, by: '', auto: false, leaders: (leaders || []).map(x => x.slice()) };
}
/* пустое состояние: игрок без клана — поиск; S.clan держит имя для профиля и кошелёк атак для наблюдателя контрактов */
function noClan(s, left) {
  const att = s.clan && s.clan.boss ? s.clan.boss.att : 0, mine = s.clan && s.clan.boss ? s.clan.boss.mine : 0;
  s.clan = { in: false, n: 'Без клана', members: [], apps: [], boss: { att, mine, known: s.clan && s.clan.boss ? s.clan.boss.known : {}, targets: [], n: s.clan && s.clan.boss ? s.clan.boss.n : 0 }, past: s.clan ? s.clan.past : null,
    log: [], srch: { f: '', applied: {}, left: left || null }, role: 'member', picks: [], earned: 0, lvl: 0, res: 0, seenCt: s.contracts ? s.contracts.clan || 0 : 0 };
}
/* новая неделя (сервер): не добитое сгорает, подсчёт, лестница и очки — с нуля (§25) */
function weekEnd(s) {
  const C = s.clan; if (!C.in) return;
  const burn = C.boss.targets.filter(x => !x.dead && !x.burned && Object.keys(x.dmg).length);
  if (burn.length) log(C, 'boss', `Неделя кончилась: не добиты ${burn.map(x => nameOf(x)).join(', ')} — их счёт сгорел.`);
  const pts = weekPts(C), members = C.members.map(m => ({ id: m.id, n: m.n, cyc: m.cyc, res: m.res, boss: m.boss }));
  C.past = countWeek(C, C.boss.wk, pts, members, s.acc.cycle, CL.leaders.now);
  const P = C.past, total = P.groups.reduce((a, g) => a + g.count, 0);
  log(C, 'gifts', P.place ? `Неделя ${genOf(P.race)} подсчитана: место ${fmt(P.place)}, ${fmt(pts)} ${ptsWord(pts)}. Пул — ${fmt(total)} ${chestWord(total)}: половину сервер раздал по вкладу, половина ждёт главу.` : `Неделя ${genOf(P.race)} подсчитана: очков нет — наград нет.`);
  C.boss.no++; C.boss.wk = raceOf(s); C.boss.circle = 1; C.boss.kills = 0; C.boss.n = 0; C.boss.mine = 0; C.boss.last = null; C.hop = false;
  C.members.forEach(m => { m.res = 0; m.boss = 0; });
  C.boss.targets = circleTargets(C, 1);
  refillDay(C, true);
}
/* новый день (сервер): атаки дня — в кошелёк, не больше двух дневных норм (§25.1: копить для КБ) */
function refillDay(C, full) {
  const per = EC.attacksDay(D, C.lvl), cap = EC.walletCap(D, C.lvl);
  C.boss.att = full ? Math.min(cap, Math.max(C.boss.att, per)) : Math.min(cap, C.boss.att + per);
  C.members.forEach(m => { if (!m.me) m.atk = Math.min(cap, m.atk + per); else m.atk = C.boss.att; });
}
/* сверка: неделя расы сменилась — подсчёт; очки контрактов игрока — в резервуар и в его вклад */
function sync() {
  if (!S.clan) fresh(S);
  const C = S.clan;
  if (C.in && C.boss.wk !== raceOf(S)) weekEnd(S);
  const ct = S.contracts ? S.contracts.clan || 0 : 0;
  if (ct !== C.seenCt) {
    const add = ct - C.seenCt; C.seenCt = ct;
    if (C.in && add > 0) { const me = meOf(C); if (me) me.res += add; feed(C, add); }
  }
  if (C.in) { const me = meOf(C); if (me) me.atk = C.boss.att; }
}
/* резервуар: очки контрактов → очки навыков; скорость — веха древа (§24.2) */
function feed(C, add) {
  C.res += Math.floor(add * (BP + EC.resSpeedBp(D, C.lvl)) / BP);
  while (C.earned < D.tree.levels.length && C.res >= need(C.earned + 1)) {
    C.res -= need(C.earned + 1); C.earned++;
    log(C, 'tree', `Резервуар наполнился: ${C.earned}-е очко навыков ждёт главу.`);
  }
  if (C.earned >= D.tree.levels.length) C.res = 0;
}
function log(C, k, t, who) { C.log.unshift({ d: 0, k, t, who: who || '' }); }

/* ================== «сервер» клана ==================
   Операция — проверка и итог одним вызовом; номер несёт кнопка. Повтор того же номера возвращает прежний итог и ничего не меняет,
   отказ номер не тратит. В игре операцию подтверждает сервер по журналу операций */
const CL_SRV = {
  run(op, f) {
    const Q = S.clOps;
    if (!op) return { refuse: 'op' };
    if (Q.ops[op]) return { again: true, res: Q.ops[op] };
    const res = f() || {};
    if (res.refuse) return res;
    Q.ops[op] = res; Q.seq++;
    return { res };
  },
  /* атака: одна атака из кошелька, бой ядром на сиде атаки; урон копится в счёте цели, выплата — в момент смерти (§25.3) */
  attack(op, uid, ids) {
    return CL_SRV.run(op, () => {
      const C = S.clan;
      if (!C.in) return { refuse: 'noclan' };
      const x = C.boss.targets.find(t => t.uid === uid);
      if (!x || x.dead || x.burned) return { refuse: 'gone' };
      if (C.boss.att <= 0) return { refuse: 'att' };
      if (!ids.length) return { refuse: 'squad' };
      C.boss.att--; C.boss.n++;
      const me = meOf(C), n = C.boss.n, F = fightOf(x, ids, n), known0 = isKnown(x), hp0 = x.hp;
      const b = EB.run(battleOf(F)), u = b.u[1][0];
      const removed = Math.max(0, hp0 - u.hp);
      x.hp = u.hp; x.used = u.usedBiome.slice();
      if (removed) x.dmg[me.id] = (x.dmg[me.id] || 0) + removed;
      const L = { uid, n, op, g: x.g, k: x.k, el: x.el, cls: x.cls, race: x.race, known0, hp0, hp: x.hp, max: x.max, removed, kill: false, pay: null, mine: 0, summoned: false, burned: [], circle: 0,
        rounds: b.round, maxRounds: b.maxRounds, why: b.why, heroes: b.u[0].map(h => ({ id: h.id, name: h.name, dealt: h.dealt, healed: h.healed, alive: h.alive })), seed: F.o.seed, F };
      if (x.hp <= 0) kill(C, x, L);
      C.boss.last = L;
      return { L };
    });
  },
  /* пассивка древа: следующий невыбранный уровень, если есть свободное очко (§24.2); выбирает глава */
  pick(op, L, i) {
    return CL_SRV.run(op, () => {
      const C = S.clan, row = D.tree.levels[L - 1];
      if (!can('tree')) return { refuse: 'right' };
      if (!row || nextPick() !== L) return { refuse: 'level' };
      if (!row.alts[i]) return { refuse: 'alt' };
      C.picks[L - 1] = i; if (L > C.lvl) C.lvl = L;
      log(C, 'tree', `Глава ${meOf(C).n} выбрал «${row.alts[i].n}» на ${L}-м уровне древа.`);
      return { L, i };
    });
  },
  /* сброс древа за Энериум: выбор пассивок — заново; уровень, вехи и очки остаются (§24.2); раз в неделю расы */
  reset(op) {
    return CL_SRV.run(op, () => {
      const C = S.clan, R = D.tree.reset;
      if (!can('reset')) return { refuse: 'right' };
      if (C.resetWk === C.boss.no) return { refuse: 'week' };
      if (!C.picks.some(x => x != null)) return { refuse: 'empty' };
      if (S.wallet.enerium < R.price) return { refuse: 'enerium' };
      S.wallet.enerium -= R.price; C.picks = C.picks.map(() => null); C.resetWk = C.boss.no;
      log(C, 'tree', `Глава ${meOf(C).n} сбросил древо за ${R.price} Энериума: ${C.lvl} ${ptsWord(C.lvl)} навыков — на новый выбор.`);
      return { ok: 1 };
    });
  },
  /* раздача половины главы (§24.4): план по ступеням на всех; сумма — ровно половина главы */
  gifts(op) {
    return CL_SRV.run(op, () => {
      const C = S.clan, P = C.past;
      if (!can('gifts')) return { refuse: 'right' };
      if (!P || P.done) return { refuse: 'done' };
      if (!planFull(P)) return { refuse: 'plan' };
      P.done = true; P.by = meOf(C).n;
      const lines = P.members.map(m => [m.n, P.groups.reduce((a, g, gi) => a + (P.plan[gi][m.id] || 0), 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
      const total = P.groups.reduce((a, g) => a + g.head, 0), self = P.groups.reduce((a, g, gi) => a + (P.plan[gi][meOf(C).id] || 0), 0);
      log(C, 'gifts', `${roleOf(C.role).n} ${P.by} раздал ${fmt(total)} ${chestWord(total)} недели ${genOf(P.race)}: ${lines.map(([n, k]) => `${n} ×${k}`).join(', ')}. Себе — ${self}.`);
      return { ok: 1 };
    });
  },
  /* срок раздачи вышел: половину главы раздаёт сервер по вкладу */
  giftsAuto() {
    const C = S.clan, P = C.past; if (!P || P.done) return false;
    const w = EC.contrib(D, P.members);
    P.groups.forEach((g, gi) => { const got = EC.share(g.head, w); P.plan[gi] = Object.fromEntries(P.members.map((m, j) => [m.id, got[j]])); });
    P.done = true; P.auto = true; P.by = 'сервер';
    log(C, 'gifts', `Глава не раздал награды за ${D.rewards.headH} ч — сервер раздал его половину по вкладу.`);
    return true;
  },
  role(op, id, role) {
    return CL_SRV.run(op, () => {
      const C = S.clan, m = C.members.find(x => x.id === id), R = roleOf(role);
      if (!can('roles') || !m || m.me || m.role === 'head' || role === 'head') return { refuse: 'right' };
      if (R.cap && C.members.filter(x => x.role === role).length >= R.cap) return { refuse: 'cap' };
      m.role = role;
      log(C, 'roles', role === 'member' ? `Глава ${meOf(C).n} снял с ${m.n} роль «${roleOf('treasurer').n}».` : `Глава ${meOf(C).n} назначил ${m.n}: «${R.n}».`);
      return { id, role };
    });
  },
  lead(op, id) {
    return CL_SRV.run(op, () => {
      const C = S.clan, m = C.members.find(x => x.id === id), me = meOf(C);
      if (!can('lead') || !m || m.me) return { refuse: 'right' };
      me.role = 'treasurer'; if (C.members.filter(x => x.role === 'treasurer').length > roleOf('treasurer').cap) me.role = 'member';
      m.role = 'head'; C.role = me.role;
      log(C, 'roles', `${me.n} передал главенство: глава — ${m.n}.`);
      return { id };
    });
  },
  /* исключение — только глава и только с причиной; исключённый ничего своего не теряет, запись — в журнал */
  kick(op, id, reason) {
    return CL_SRV.run(op, () => {
      const C = S.clan, m = C.members.find(x => x.id === id);
      if (!can('kick') || !m || m.me || m.role === 'head') return { refuse: 'right' };
      if (!D.kickReasons.includes(reason)) return { refuse: 'reason' };
      C.members = C.members.filter(x => x !== m);
      log(C, 'join', `Глава ${meOf(C).n} исключил ${m.n}. Причина: ${reason.toLowerCase()}. Его вклад и выданные награды остаются за ним.`);
      return { id };
    });
  },
  accept(op, id) {
    return CL_SRV.run(op, () => {
      const C = S.clan, a = C.apps.find(x => x.id === id);
      if (!can('apps') || !a) return { refuse: 'right' };
      if (C.members.length >= EC.capacity(D, C.lvl)) return { refuse: 'full' };
      C.apps = C.apps.filter(x => x !== a);
      C.members.push({ id: 'n' + S.clOps.seq, n: a.n, role: 'member', lvl: a.lvl, cyc: a.cyc, res: 0, boss: 0, atk: EC.attacksDay(D, C.lvl), seen: 0, weeks: 0, me: false });
      log(C, 'join', `${roleOf(C.role).n} ${meOf(C).n} принял заявку: в клане ${a.n}.`);
      return { id };
    });
  },
  decline(op, id) {
    return CL_SRV.run(op, () => {
      const C = S.clan, a = C.apps.find(x => x.id === id);
      if (!can('apps') || !a) return { refuse: 'right' };
      C.apps = C.apps.filter(x => x !== a);
      log(C, 'join', `Заявка ${a.n} отклонена.`);
      return { id };
    });
  },
  passport(op, patch) {
    return CL_SRV.run(op, () => {
      const C = S.clan;
      if (!can('passport') && !can('goals')) return { refuse: 'right' };
      const fields = [];
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'goals') { if (!can('goals')) continue; for (const [g, t] of Object.entries(v)) { const s = clean(t, D.passport.noteMax); if (s && s !== C.goals[g]) { C.goals[g] = s; fields.push('цели'); } } continue; }
        if (!can('passport')) continue;
        if (k === 'type' && D.passport.types.some(t => t.id === v) && v !== C.type) { C.type = v; fields.push('тип'); }
        if (k === 'join' && D.passport.join.some(j => j.id === v) && v !== C.join) { C.join = v; fields.push('вход'); }
        if (k === 'level' && D.passport.req.level.includes(+v) && +v !== C.req.level) { C.req.level = +v; fields.push('требования'); }
        if (k === 'cycle' && D.passport.req.cycle.includes(+v) && +v !== C.req.cycle) { C.req.cycle = +v; fields.push('требования'); }
        if (k === 'emblem' && +v >= 1 && +v <= D.passport.emblems && +v !== C.emblem) { C.emblem = +v; fields.push('эмблема'); }
        if (k === 'note') { const s = clean(v, D.passport.noteMax); if (s && s !== C.note) { C.note = s; fields.push('принципы'); } }
      }
      if (!fields.length) return { refuse: 'same' };
      log(C, 'passport', `${roleOf(C.role).n} ${meOf(C).n} изменил паспорт: ${[...new Set(fields)].join(', ')}.`);
      return { fields };
    });
  },
  /* выход — в любой момент, без штрафа (законы клана); глава передаёт главенство казначею с наибольшим вкладом */
  leave(op) {
    return CL_SRV.run(op, () => {
      const C = S.clan; if (!C.in) return { refuse: 'noclan' };
      const me = meOf(C), others = C.members.filter(m => !m.me);
      let heir = null;
      if (me.role === 'head' && others.length) { heir = others.slice().sort((a, b) => (b.role === 'treasurer') - (a.role === 'treasurer') || (b.res + b.boss) - (a.res + a.boss))[0]; heir.role = 'head'; }
      log(C, 'join', `Из клана вышел ${me.n}.${heir ? ` Глава — ${heir.n}.` : ''} Его вклад остаётся в журнале.`);
      C.members = others;
      const keep = { id: C.id, n: C.n, emblem: C.emblem, type: C.type, join: C.join, lvl: C.lvl, mem: others.length, req: Object.assign({}, C.req), note: C.note, place: C.past ? C.past.place : null, state: C, heir: heir ? heir.n : '' };
      const hop = C.boss.n > 0 || C.hop;
      noClan(S, keep); S.clan.hopFrom = hop;
      return { ok: 1 };
    });
  },
  /* вход в клан из поиска: свободный — сразу; по заявке — заявка. Кто на этой неделе бил врагов другого клана — очки клану со следующей недели */
  join(op, id) {
    return CL_SRV.run(op, () => {
      const C = S.clan; if (C.in) return { refuse: 'inclan' };
      const x = searchList().find(c => c.id === id); if (!x) return { refuse: 'none' };
      const why = joinWhy(x); if (why) return { refuse: 'req', why };
      if (x.join === 'apply' && !(x.state && x.state.id === C.srch.left.id)) { C.srch.applied[id] = true; return { applied: id }; }
      enter(x);
      return { joined: id };
    });
  },
  create(op, name) {
    return CL_SRV.run(op, () => {
      const C = S.clan; if (C.in) return { refuse: 'inclan' };
      const nm = clean(name, D.passport.nameMax);
      if (!nm || nm.length < CL.create.nameMin) return { refuse: 'name' };
      if (searchList().some(c => c.n.toLowerCase() === nm.toLowerCase())) return { refuse: 'taken' };
      const price = createPrice(); if (S.wallet.gold < price) return { refuse: 'gold' };
      S.wallet.gold -= price;
      enter({ id: 'my' + S.clOps.seq, n: nm, emblem: 1 + (S.clOps.seq % D.passport.emblems), type: 'mid', join: 'open', lvl: 0, mem: 0, req: { level: D.open.level, cycle: D.open.cycle }, note: '', founder: true });
      return { created: nm };
    });
  },
};
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max).trim();
const createPrice = () => D.passport.createGoldPerCycle * Math.max(D.open.cycle, S.acc.cycle);
const CL_WHY = { op: 'Действие устарело', noclan: 'Вы не в клане', gone: 'Цели уже нет: пала или сгорела', att: 'Атаки на сегодня кончились', squad: 'В отряде нет свободных героев',
  right: 'Это решает глава клана', level: 'Этот уровень древа сейчас не выбрать', alt: 'Такой пассивки нет', week: 'Древо уже сбрасывали на этой неделе', empty: 'Сбрасывать нечего',
  enerium: 'Не хватает Энериума', done: 'Награды уже розданы', plan: 'Раздайте все сундуки своей половины', cap: 'Мест для этой роли нет', reason: 'Выберите причину',
  full: 'Мест в клане нет', same: 'Ничего не изменилось', inclan: 'Сначала выйдите из клана', none: 'Такого клана нет', req: 'Требования клана не выполнены', name: 'Имя — от трёх знаков',
  taken: 'Такое имя уже занято', gold: 'Не хватает золота' };
const say = r => { if (r && r.refuse) { toast(r.why || CL_WHY[r.refuse] || 'Не вышло'); return false; } return !!(r && r.res && !r.again); };

/* ================== бой клана ================== */
/* карта цели для ядра: здоровье и «раз за жизнь» — между атаками, как у целей Эхо; раунды — режим и древо */
function fightOf(x, ids, n) {
  const C = S.clan, src = EC.card(D, { g: x.g, uid: x.uid, cls: x.cls, el: x.el, race: x.race, k: x.k, name: nameOf(x) });
  src.maxHp = x.max; src.hp = x.hp; src.used = (x.used || []).slice();
  const cap = x.g === 'b' ? D.boss.roundsCap.roundB : D.boss.roundsCap.roundE, base = D.boss.rounds[x.g];
  const maxRounds = Math.min(base + cap, EC.rounds(D, x.g, C.picks, C.lvl));
  return { src, heroes: ids.map(id => EB.heroSrc(H(id))), o: { seed: EB.seedOf(`клан|${C.id}|неделя|${C.boss.no}|${x.uid}|атака|${n}`), maxRounds } };
}
const battleOf = F => EB.create({ heroes: F.heroes, foes: [F.src], seed: F.o.seed, mode: 'rounds', maxRounds: F.o.maxRounds });
/* цель пала: выплата по снятому здоровью (§25.3), бестиарий, круг — дальше */
function kill(C, x, L) {
  x.dead = true; x.hp = 0; L.kill = true;
  const pts = EC.points(D, x.k, x.g), pay = EC.payout(pts, x.dmg), me = meOf(C);
  for (const [id, v] of Object.entries(pay)) { const m = C.members.find(z => z.id === id); if (!m) continue; if (m.me) { C.boss.mine += v; L.mine = v; if (C.hop) continue; } m.boss += v; }
  L.pay = pay; L.pts = pts;
  const fid = fidOf(x); L.first = !C.boss.known[fid]; C.boss.known[fid] = true;
  log(C, 'boss', `Круг ${x.k}: пал${x.g === 'b' ? ' клановый босс' : 'а элита'} «${nameOf(x, true)}» — ${fmt(pts)} ${ptsWord(pts)} по снятому здоровью ${Object.keys(pay).length} ${plural(Object.keys(pay).length, 'участнику', 'участникам', 'участникам')}.`);
  if (x.g === 'e') {
    C.boss.kills++;
    if (C.boss.kills >= D.boss.kills) {   // §25.2: три победы — автопризыв босса; висящие элиты сгорают
      for (const y of C.boss.targets) if (!y.dead && !y.burned) { y.burned = true; L.burned.push(y.uid); }
      const B = EC.bossOf(D, x.race), boss = target(C, 'b', x.k, 0, D.boss.bossCls, B.el, x.race);
      C.boss.targets = C.boss.targets.concat(boss); L.summoned = true;
      log(C, 'boss', `Три элиты пали — призван клановый босс круга ${x.k}.${L.burned.length ? ' Висящие элиты сгорели.' : ''}`);
    }
  } else {
    C.boss.circle = x.k + 1; C.boss.kills = 0; L.circle = C.boss.circle;
    C.boss.targets = circleTargets(C, C.boss.circle);
    log(C, 'boss', `Открыт круг ${C.boss.circle}: враги сильнее, очки — выше.`);
  }
}
/* просмотр: тот же бой вторым экземпляром на том же сиде — ядро детерминировано, показ сходится с итогом */
function play(L) {
  S.runs = S.runs.filter(r => r.kind !== 'clan');
  const F = L.F, b = battleOf(F), x = { g: L.g, cls: L.cls, el: L.el, race: L.race };
  FOE_LOOK[F.src.id] = { known: L.known0, face: ph(x, 'bt', L.known0) };
  const arena = window.EN_ECHO && EN_ECHO.arena ? EN_ECHO.arena(L.race) : null;
  const scene = { title: `Клан · круг ${L.k}`, sub: `атака ${L.n} · ${F.o.maxRounds} ${roundWord(F.o.maxRounds)}`, short: `Клан · ${L.k}`, back: 'clan', skip: 'clskip', result: 'clres', bg: arena || undefined,
    badge: `<b>${ic('shield')}</b><span>Клан</span>`,
    chip: `${rankChip(x)}${L.g === 'b' ? `<span class="chip" title="Иммунитет к контролю по рангу">иммунитет ${pctBp(EB.RULES.resist[D.boss.rank.b.core] || 0)}</span>` : ''}` };
  const R = { id: 'r' + (++S.runNo), runNo: S.runNo, kind: 'clan', scene, seed: F.o.seed, squadId: SQ.of('clan'), squad: [], heroes: F.heroes, b,
    floor: 1, startFloor: 1, demo: false, guard: false, mode: 'rounds', acted: [], fired: null, view: 0, runMs: 0, kills: 0,
    loot: { gold: 0, spirit: 0, souls: 0, items: {} }, newKnown: [], over: false, seen: false, gap: 0, feed: [], disp: {}, curve: [],
    lastActor: null, pending: 0, endAt: null, max0: b.maxRounds, done: clDone, res: L,
    banner: [nameOf(x, L.known0), `${L.g === 'b' ? 'Клановый босс' : 'Элита'} · ${F.o.maxRounds} ${roundWord(F.o.maxRounds)} · здоровье цели сохраняется`] };
  L.run = R.id;
  syncDisp(R);
  S.runs.push(R); S.focus = R.id; S.insp = null; S.overlay = null; S.route = 'battle';
  render(); ensureLoop();
}
function clDone(R, vis) {
  R.over = true;
  if (vis) { R.seen = true; S.route = 'clan'; S.overlay = { t: 'clres', arg: R.id }; render(); focusOverlay(); }
  else toast(`Клан · атака ${R.res.n}: итог — в верхней строке`);
}

/* ================== экран ================== */
const TABS = [['pass', 'Паспорт'], ['boss', 'Босс'], ['mem', 'Участники'], ['tree', 'Древо']];
function tabs() {
  const C = S.clan, free = pointsFree(), gifts = C.past && !C.past.done && can('gifts');
  return TABS.map(([k, n]) => [k, n, k === 'tree' && free && can('tree') ? String(free) : k === 'mem' && ((C.apps.length && can('apps')) || gifts) ? '!' : '']);
}
/* кланы открывает 10-й уровень Странника — начало цикла II (§16): раньше — объяснение, без поиска */
const clOpen = () => S.acc.level >= D.open.level && S.acc.cycle >= D.open.cycle;
const lockHtml = () => `<section class="scr cl-scr"><div class="pnl cl-first"><span class="cl-first-i">${ic('lock')}</span><div class="col"><b class="serif">Кланы — с цикла ${ROMAN[D.open.cycle]}</b>
    <p class="reason">Клан откроется на ${D.open.level}-м уровне Странника, вместе со вторым циклом: древо, клановый босс и награды недели.</p></div></div></section>`;
SCREENS.clan = function () {
  sync();
  if (!clOpen()) return { title: 'Клан', back: 'week', html: lockHtml() };
  if (!inClan()) return { title: 'Клан', back: 'week', html: searchHtml() };
  const t = TABS.some(([k]) => k === S.seg.clan) ? S.seg.clan : 'pass';
  const meta = { title: 'Клан', back: 'week', seg: { key: 'clan', items: tabs() } };
  const body = t === 'boss' ? bossHtml() : t === 'mem' ? memHtml() : t === 'tree' ? treeHtml() : passHtml();
  return Object.assign(meta, { html: `<section class="scr cl-scr" data-tab="${t}">${body}</section>` });
};

/* ---------- паспорт и резервуар ---------- */
function passHtml() {
  const C = S.clan, T = typeOf(C.type), cap = EC.capacity(D, C.lvl), nx = C.earned < D.tree.levels.length ? need(C.earned + 1) : 0, pct = nx ? Math.min(100, Math.floor(C.res * 100 / nx)) : 100;
  const free = pointsFree(), P = C.past, gifts = P && !P.done;
  const id = `<div class="pnl cl-id">
      ${emblem(C.emblem, 'lg')}
      <h2 class="serif gold cl-name">${esc(C.n)}</h2>
      <span class="chip">${T.n}</span>
      <div class="row cl-stats"><div class="stat"><b>${C.lvl}</b><small>уровень</small></div><div class="stat"><b>${C.members.length}<span class="faint">/${cap}</span></b><small>участников</small></div></div>
      <button class="link" data-a="sheet" data-v="clpass">О клане ${ic('chev')}</button>
    </div>`;
  const resv = `<button class="pnl cl-res" data-a="sheet" data-v="clresv" aria-label="Резервуар: ${pct} % до очка навыков">
      <span class="eyebrow">Резервуар</span>
      <span class="cl-res-n"><b class="num">${pct}</b><small>%</small><span>${nx ? 'до очка навыков' : 'древо выросло до конца'}</span></span>
      ${bar(pct, 'sp lg')}
      <small class="faint">${free ? `${ic('spark')}Очков навыков ждёт: ${free}` : 'Наполняют контракты участников: половина их очков'}</small>
    </button>`;
  const note = gifts ? `<button class="cl-call" data-a="sheet" data-v="clgifts">${ic('flag')}<span><b>${can('gifts') ? 'Раздача наград ждёт вас' : 'Награды недели ждут главу'}</b><small>неделя ${genOf(P.race)} · ${fmt(P.groups.reduce((a, g) => a + g.head, 0))} ${chestWord(P.groups.reduce((a, g) => a + g.head, 0))} от главы</small></span>${ic('chev')}</button>`
    : `<p class="cl-goal"><span class="eyebrow">Цель недели</span><span>${esc(C.goals.week)}</span></p>`;
  const foot = `<div class="row cl-foot"><button class="btn" data-a="sheet" data-v="cllog">${ic('book')}Журнал</button><button class="btn" data-a="sheet" data-v="gifts:clan">Награды</button><button class="btn" data-a="sheet" data-v="chat">${ic('chat')}Чат</button><span class="g-spacer"></span>
      <button class="btn go" data-a="seg" data-v="clan:boss">К боссу${C.boss.att ? `<span class="cl-att">${C.boss.att}</span>` : ''}</button></div>`;
  return `<div class="cl-pass">${id}<div class="col cl-pmain">${resv}${note}${foot}</div></div>`;
}

/* ---------- клановый босс ---------- */
function bossHtml() {
  const C = S.clan, B = C.boss, race = B.wk, lvl = C.lvl, per = EC.attacksDay(D, lvl), sq = SQ.of('clan');
  const alive = B.targets.filter(x => !x.dead && !x.burned), boss = alive.find(x => x.g === 'b');
  const headRow = `<div class="row cl-bhead"><span class="eyebrow">Круг ${B.circle} · неделя ${genOf(race)}</span><span class="g-spacer"></span>
      <span class="chip ${B.att ? 'spirit' : ''}" title="Атаки — общий кошелёк на элит и босса; копится ещё одна дневная норма">${ic('sword')}${B.att} / ${per}</span>
      <span class="chip">${ic('hour')}<span class="num" data-cd="week">${dur(S.week.left)}</span></span>
      <button class="btn sm" data-a="sqmode" data-v="clan">${ic('users')}${sq ? `Отряд${bmHtml(SQ.bm(SQ.squad('clan')), 12)}` : 'Выбрать отряд'}</button></div>`;
  let main;
  if (!sq) main = `<div class="pnl cl-first"><span class="cl-first-i">${ic('users')}</span><div class="col"><b class="serif">Отряд для атак клана</b><p class="reason">Выберите отряд один раз — он пойдёт в каждую атаку. Сменить можно в любой момент.</p></div><button class="btn go" data-a="sqmode" data-v="clan">${ic('users')}Выбрать отряд</button></div>`;
  else if (boss) main = `<div class="cl-targets one">${tgtCard(boss, true)}</div>`;
  else main = `<div class="cl-targets">${B.targets.filter(x => x.g === 'e').map(x => tgtCard(x)).join('')}</div>`;
  const place = placeOf(weekPts());
  const foot = `<div class="row cl-bfoot"><button class="cl-mine" data-a="sheet" data-v="clledger"><span class="stat"><b class="num">${fmt(C.boss.mine)}</b><small>ваши очки</small></span><span class="stat"><b class="num">${place ? '#' + fmt(place) : '—'}</b><small>место клана</small></span>${ic('chev')}</button>
      ${C.hop ? `<span class="chip warn" title="Вы били врагов другого клана на этой неделе">очки клану — со следующей недели</span>` : ''}<span class="g-spacer"></span><button class="link" data-a="sheet" data-v="clrules">Как устроен круг ${ic('chev')}</button></div>`;
  return headRow + main + foot;
}
/* мощь цели — та же функция §6, что у героев и врагов биомов (BM.unit, index.html) по карте ядра; калькулятор клана считает её
   своей копией формулы (EnClan.cardBm) с той же C — без BM берём её */
function cardPow(src) {
  if (typeof BM === 'undefined') return EC.cardBm(D, src);
  const u = EB.create({ mode: 'rounds', seed: 1, heroes: [], foes: [src] }).u[1][0];
  return u ? BM.unit(u) : 0;
}
/* карточка цели: облик, имя, ранг и стихия, здоровье полосой; два числа — здоровье и мощь; одно действие — «Атаковать» */
function tgtCard(x, big) {
  const hpP = Math.floor(x.hp * 100 / x.max), bm = cardPow(EC.card(D, { g: x.g, uid: x.uid, cls: x.cls, el: x.el, race: x.race, k: x.k }));
  const st = x.dead ? `<span class="chip">${ic('check')}пала</span>` : x.burned ? '<span class="chip warn">сгорела</span>' : '';
  const act = x.dead || x.burned ? '' : `<button class="btn ${big ? '' : 'sm'} go" data-a="clatk" data-v="${x.uid}:${S.clan.boss.n + 1}" ${S.clan.boss.att ? '' : 'disabled'} title="${tmT('Исход решён при оплате атаки: просмотр можно пропустить', 'Бой ядром на сиде атаки: исход решён при оплате, просмотр можно пропустить')}">${ic('sword')}Атаковать</button>`;
  return `<div class="cl-card ${x.dead ? 'dead' : ''} ${x.burned ? 'burned' : ''} ${big ? 'big' : ''}" data-g="${x.g}" data-el="${esc(x.el)}" data-uid="${x.uid}">
      <button class="cl-card-ph" data-a="sheet" data-v="cltgt:${x.uid}" aria-label="Сведения о цели">${ph(x, big ? 'lg' : '')}</button>
      <div class="cl-card-b">
        <b class="serif cl-card-n">${nameOf(x)}</b>
        <div class="row cl-chips">${x.dead || x.burned ? st : rankChip(x)}${el(x.el)}</div>
        ${bar(hpP, 'hp')}
        <div class="row cl-nums">${icoNum('hp', fmt(x.hp), 'Здоровье')}${bmHtml(bm)}</div>
        ${act}
      </div>
    </div>`;
}

/* ---------- участники ---------- */
function memHtml() {
  const C = S.clan, cap = EC.capacity(D, C.lvl), w = EC.contrib(D, C.members), sum = w.reduce((a, x) => a + x, 0);
  const order = C.members.map((m, i) => ({ m, w: w[i] })).sort((a, b) => (b.m.role === 'head') - (a.m.role === 'head') || (b.m.role === 'treasurer') - (a.m.role === 'treasurer') || b.w - a.w || a.m.n.localeCompare(b.m.n));
  const P = C.past, gifts = P && !P.done && can('gifts');
  const top = `<div class="row cl-mhead"><div class="stat"><b>${C.members.length}<span class="faint">/${cap}</span></b><small>участников</small></div><span class="g-spacer"></span>
      ${can('apps') && C.apps.length ? `<button class="btn sm" data-a="sheet" data-v="clapps">Заявки<span class="bdg">${C.apps.length}</span></button>` : ''}
      ${gifts ? `<button class="btn sm go" data-a="sheet" data-v="clgifts">${ic('flag')}Раздача</button>` : `<button class="btn sm" data-a="sheet" data-v="clgifts">Раздача</button>`}
      <button class="btn sm" data-a="sheet" data-v="cllog">${ic('book')}Журнал</button></div>`;
  const rows = order.map(({ m, w: x }) => `<button class="cl-mrow ${m.me ? 'me' : ''}" data-a="sheet" data-v="clmem:${m.id}">
      <span class="cl-av" data-role="${m.role}">${initials(m.n)}</span>
      <span class="cl-mt"><b>${esc(m.n)}${m.me ? ' · вы' : ''}</b><small>${m.role !== 'member' ? roleOf(m.role).n + ' · ' : ''}${ago(m.seen)}</small></span>
      <span class="cl-mv"><b class="num">${sum ? Math.round(x * 100 / sum) : 0} %</b><small>вклад недели</small></span>
    </button>`).join('');
  return `${top}<div class="col scroll grow cl-mlist" data-keep="clmem">${rows}</div>`;
}

/* ---------- древо ---------- */
function treeHtml() {
  const C = S.clan, free = pointsFree(), nxt = nextPick(), circles = Math.ceil(D.tree.levels.length / 40);
  const cur = S.clan.treeC || Math.min(circles, Math.max(1, Math.ceil(((nxt || C.lvl || 1)) / 40)));
  const lo = (cur - 1) * 40 + 1, hi = Math.min(D.tree.levels.length, cur * 40);
  const rows = [];
  for (let s = lo; s <= hi; s += 10) {
    const Ls = D.tree.levels.slice(s - 1, s + 9), br = D.tree.branches[Ls[0].br], done = Ls.filter(x => C.picks[x.L - 1] != null).length;
    rows.push(`<div class="cl-br"><b class="serif">${br.n}</b><div class="cl-knots">${Ls.map(x => knot(x, nxt)).join('')}</div><small class="faint num">${done} / ${Ls.length}</small></div>`);
  }
  const ctabs = `<div class="tabs cl-ctabs" role="tablist" aria-label="Круг древа">${Array.from({ length: circles }, (_, i) => `<button role="tab" aria-selected="${cur === i + 1}" data-a="cltc" data-v="${i + 1}">${ROMAN[i + 1]}</button>`).join('')}</div>`;
  const head = `<div class="row cl-thead"><div class="stat"><b>${C.lvl}</b><small>уровень</small></div><div class="stat ${free ? 'win' : ''}"><b>${free}</b><small>${plural(free, 'очко', 'очка', 'очков')} навыков</small></div>
      ${ctabs}<span class="g-spacer"></span><button class="btn sm" data-a="sheet" data-v="clbonus">Бонусы клана</button>
      ${can('reset') ? `<button class="btn sm ghost" data-a="dlg" data-v="clreset">${ic('swap')}Сбросить</button>` : ''}</div>`;
  const call = free && nxt && can('tree') ? `<button class="cl-call" data-a="sheet" data-v="cllvl:${nxt}">${ic('spark')}<span><b>Очко навыков: выбрать пассивку ${nxt}-го уровня</b><small>${D.tree.branches[D.tree.levels[nxt - 1].br].n}</small></span>${ic('chev')}</button>`
    : `<p class="reason cl-why">${D.tree.why}</p>`;
  return `${head}<div class="pnl pad cl-tree">${rows.join('')}</div>${call}`;
}
function knot(x, nxt) {
  const C = S.clan, on = C.picks[x.L - 1] != null, now = x.L === nxt && pointsFree() > 0, big = x.pos === 5 || x.pos === 10;
  const title = `Уровень ${x.L}${on ? ' · ' + x.alts[C.picks[x.L - 1]].n : now ? ' · можно выбрать' : x.L <= C.earned ? ' · выбрать заново' : ''}${x.mile ? ' · ' + D.tree.mileName[x.mile.k] : ''}`;
  return `<button class="cl-k ${on ? 'on' : ''} ${now ? 'now' : ''} ${big ? 'big' : ''} ${x.mile ? 'mile' : ''}" data-a="sheet" data-v="cllvl:${x.L}" title="${esc(title)}" aria-label="${esc(title)}">${x.pos === 5 ? ic('sword') : x.pos === 10 ? ic('users') : ''}</button>`;
}

/* ---------- поиск клана: пустое состояние ---------- */
function searchList() {
  const C = S.clan, own = C.srch && C.srch.left ? [C.srch.left] : [];
  return own.concat(CL.search.filter(x => !own.some(o => o.id === x.id)));
}
function joinWhy(x) {
  if (x.mem >= EC.capacity(D, x.lvl)) return 'Мест нет';
  if (S.acc.level < x.req.level) return `Нужен ${x.req.level}-й уровень Странника`;
  if (S.acc.cycle < x.req.cycle) return `Нужен цикл ${ROMAN[x.req.cycle]}`;
  return '';
}
function searchHtml() {
  const C = S.clan, f = C.srch.f, list = searchList().filter(x => !f || x.type === f);
  const fl = `<div class="tabs cl-ftabs" role="tablist" aria-label="Тип клана">${[['', 'Все']].concat(D.passport.types.map(t => [t.id, t.n])).map(([k, n]) => `<button role="tab" aria-selected="${f === k}" data-a="clsf" data-v="${k}">${n}</button>`).join('')}</div>`;
  const rows = list.map(x => {
    const why = joinWhy(x), applied = C.srch.applied[x.id], back = x.state && C.srch.left && x.id === C.srch.left.id;
    const act = back ? `<button class="btn sm go" data-a="cljoin" data-v="${x.id}:${clOp()}">Вернуться</button>` : applied ? '<span class="chip spirit">заявка отправлена</span>'
      : why ? `<span class="chip">${ic('lock')}${why}</span>` : `<button class="btn sm ${x.join === 'open' ? 'go' : ''}" data-a="cljoin" data-v="${x.id}:${clOp()}">${x.join === 'open' ? 'Вступить' : 'Заявка'}</button>`;
    return `<div class="cl-srow"><button class="cl-sinfo" data-a="sheet" data-v="clfind:${x.id}">${emblem(x.emblem)}<span class="cl-mt"><b>${esc(x.n)}</b><small>${typeOf(x.type).n} · ${joinOf(x.join).n.toLowerCase()}</small></span>
      <span class="cl-mv"><b class="num">${x.mem}/${EC.capacity(D, x.lvl)}</b><small>участников</small></span></button>${act}</div>`;
  }).join('');
  return `<section class="scr cl-scr cl-find">
    <div class="pnl cl-fhead"><span class="cl-first-i">${ic('shield')}</span><div class="col"><b class="serif">Клан даёт древо и награды недели</b><p class="reason">Вступите в клан — или соберите свой. Выйти можно в любой момент, без штрафа.</p></div>
      <button class="btn" data-a="dlg" data-v="clnew">${ic('plus')}Создать</button></div>
    <div class="row cl-frow">${fl}${C.hopFrom ? '<span class="chip warn" title="Вы били врагов другого клана на этой неделе">очки новому клану — со следующей недели</span>' : ''}</div>
    <div class="col scroll grow cl-slist" data-keep="clfind">${rows || '<p class="faint">Таких кланов нет.</p>'}</div>
  </section>`;
}
/* вход: клан из поиска становится кланом игрока; состав — жители сервера, лестница — с первого круга недели */
function enter(x) {
  const was = S.clan, hop = !!was.hopFrom;
  if (x.state) {
    const C = S.clan = x.state;
    C.srch = { f: '', applied: {}, left: null }; C.boss.att = was.boss.att; C.hop = false;
    if (!meOf(C)) C.members.push(mkMe(C));
    C.role = meOf(C).role;
    log(C, 'join', `В клан вернулся ${meOf(C).n}.`);
    return;
  }
  const rng = EB.makeRng(EB.seedOf('клан|поиск|' + x.id)), names = CL.names.slice();
  const C = { in: true, id: x.id, n: x.n, emblem: x.emblem, type: x.type, join: x.join, req: Object.assign({}, x.req), note: x.note || '', dir: x.dir || '', goals: { day: x.founder ? '' : 'Атаки каждый день', week: x.founder ? '' : 'Удержать место', month: '' },
    founded: x.founder ? 0 : 1 + rng(20), earned: x.lvl, lvl: x.lvl, res: 0, picks: Array.from({ length: D.tree.levels.length }, (_, i) => i < x.lvl ? rng(D.tree.levels[i].alts.length) : null), resetWk: null,
    members: [], apps: [], boss: { wk: raceOf(S), no: 1, circle: 1, kills: 0, targets: [], att: was.boss.att, known: was.boss.known || {}, n: 0, last: null, mine: 0 },
    past: null, log: [], hop, role: x.founder ? 'head' : 'member', seenCt: S.contracts ? S.contracts.clan || 0 : 0, srch: { f: '', applied: {}, left: null } };
  for (let i = 0; i < x.mem; i++) { const n = names.splice(rng(names.length), 1)[0] || 'Странник ' + (i + 1); C.members.push({ id: 'g' + (i + 1), n, role: i === 0 ? 'head' : i === 1 ? 'treasurer' : 'member', lvl: 15 + rng(30), cyc: 2 + rng(2), res: 0, boss: 0, atk: EC.attacksDay(D, x.lvl), seen: rng(48), weeks: 1 + rng(10), me: false }); }
  C.members.push(mkMe(C)); if (x.founder) C.members[C.members.length - 1].role = 'head';
  C.res = x.founder ? 0 : Math.floor(EC.need(D, C.earned + 1) * rng(BP) / BP);
  C.boss.targets = circleTargets(C, 1);
  S.clan = C;
  log(C, 'join', x.founder ? `Клан «${C.n}» основан. Глава — ${meOf(C).n}.` : `В клан вступил ${meOf(C).n}.${hop ? ' Очки кланового босса он приносит со следующей недели.' : ''}`);
}
const mkMe = C => ({ id: 'me', n: 'Странник', role: 'member', lvl: S.acc.level, cyc: S.acc.cycle, res: 0, boss: 0, atk: C.boss.att, seen: 0, weeks: 0, me: true });

/* ================== листы ================== */
const kv = rows => `<dl class="kv cl-kv">${rows.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
function planFull(P) { return P.groups.every((g, gi) => Object.values(P.plan[gi]).reduce((a, x) => a + x, 0) === g.head); }
Object.assign(OV, {
  /* паспорт: всё о клане; глава правит тип, вход, требования, эмблему и принципы, казначей — цели */
  clpass() {
    sync(); const C = S.clan; if (!C.in) return '';
    const T = typeOf(C.type), edit = can('passport'), goals = can('goals');
    const sel = (a, n, list, cur, fmtv) => `<select class="cl-sel" data-a="${a}" aria-label="${n}">${list.map(v => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${fmtv(v)}</option>`).join('')}</select>`;
    const typeRow = edit ? `<div class="tabs cl-ptabs" role="tablist" aria-label="Тип клана">${D.passport.types.map(t => `<button role="tab" aria-selected="${C.type === t.id}" data-a="clpset" data-v="type:${t.id}:${clOp()}">${t.n}</button>`).join('')}</div>` : `<span class="chip">${T.n}</span>`;
    const joinRow = edit ? `<div class="tabs cl-ptabs" role="tablist" aria-label="Вход">${D.passport.join.map(j => `<button role="tab" aria-selected="${C.join === j.id}" data-a="clpset" data-v="join:${j.id}:${clOp()}">${j.n}</button>`).join('')}</div>` : joinOf(C.join).n;
    const req = edit ? `<span class="row cl-req">${sel('clreql', 'Уровень Странника', D.passport.req.level, C.req.level, v => `уровень ${v}+`)}${sel('clreqc', 'Цикл', D.passport.req.cycle, C.req.cycle, v => `цикл ${ROMAN[v]}+`)}</span>` : `уровень ${C.req.level}+ · цикл ${ROMAN[C.req.cycle]}+`;
    const emb = edit ? `<div class="cl-embs">${Array.from({ length: D.passport.emblems }, (_, i) => `<button class="cl-embb" aria-pressed="${C.emblem === i + 1}" data-a="clpset" data-v="emblem:${i + 1}:${clOp()}" aria-label="Эмблема ${i + 1}">${emblem(i + 1)}</button>`).join('')}</div>` : '';
    const gl = ['day', 'week', 'month'].map(g => [g, { day: 'Цель дня', week: 'Цель недели', month: 'Цель месяца' }[g]]);
    const goalRows = gl.map(([g, n]) => [n, goals ? `<input class="cl-in" type="text" maxlength="${D.passport.noteMax}" value="${esc(C.goals[g])}" data-a="clgoal" data-v="${g}" aria-label="${n}" autocomplete="off">` : esc(C.goals[g]) || '—']);
    const body = `<div class="row cl-phead">${emblem(C.emblem, 'lg')}<div class="col"><b class="serif cl-name">${esc(C.n)}</b><small class="faint">основан ${C.founded ? `${C.founded} ${plural(C.founded, 'неделю', 'недели', 'недель')} назад` : 'на этой неделе'}</small></div></div>
      ${edit ? `<input class="cl-in cl-note" type="text" maxlength="${D.passport.noteMax}" value="${esc(C.note)}" data-a="clnote" aria-label="Принципы" autocomplete="off">` : foldLore(esc(C.note) || '—', 'muted')}
      ${kv([['Тип', typeRow], ['Вход', joinRow], ['Требования', req], ['Направление', esc(C.dir) || '—']].concat(goalRows))}
      ${edit ? `<span class="eyebrow">Эмблема</span>${emb}` : ''}
      <p class="reason">${esc(T.d)}${TM(' Тип — обещание участникам: правил боя и наград он не меняет. Эмблемы — заглушки до арта.')}</p>`;
    return sheet('О клане', body, `<button class="link" data-a="sheet" data-v="clroles">Роли и права ${ic('chev')}</button>`);
  },
  /* роли и права, законы клана */
  clroles() {
    const rows = D.roles.map(r => `<div class="cl-rrow"><b>${r.n}${r.cap ? `<small class="faint"> · до ${r.cap}</small>` : ''}</b><span>${r.rights.length ? r.rights.map(k => D.rights[k]).join('; ') : 'Атаки, контракты, вклад и журнал — как у всех'}</span></div>`).join('');
    return sheet('Роли и права', `${rows}<span class="eyebrow">Законы клана</span><ul class="cl-laws">${D.laws.map(l => `<li>${l}</li>`).join('')}</ul>`);
  },
  /* резервуар: путь к очку навыков, кто наполнял, откуда очки */
  clresv() {
    sync(); const C = S.clan; if (!C.in) return '';
    const nx = C.earned < D.tree.levels.length ? need(C.earned + 1) : 0, pct = nx ? Math.min(100, Math.floor(C.res * 100 / nx)) : 100;
    const week = C.members.reduce((a, m) => a + m.res, 0), days = Math.max(1, CL.boss.days), left = Math.max(0, nx - C.res);
    const eta = week && nx ? Math.max(1, Math.ceil(left * days / week)) : 0;
    const top = C.members.filter(m => m.res > 0).sort((a, b) => b.res - a.res).slice(0, CL_VIEW.list);
    const body = `<div class="row cl-stats"><div class="stat"><b>${pct} %</b><small>до ${C.earned + 1}-го очка</small></div><div class="stat"><b>${eta ? `≈${eta} ${plural(eta, 'день', 'дня', 'дней')}` : '—'}</b><small>в нынешнем темпе</small></div></div>
      ${bar(pct, 'sp lg')}
      <p class="reason">Резервуар наполняют контракты участников: половина очков каждого исполненного. Полный — очко навыков, его тратит глава в древе.</p>
      <span class="eyebrow">Кто наполнял на этой неделе · ${fmt(week)}</span>
      <div class="cl-list">${top.map(m => `<div class="cl-lrow"><span>${esc(m.n)}${m.me ? ' · вы' : ''}</span><b class="num">${fmt(m.res)}</b></div>`).join('') || '<p class="faint">Пока никто.</p>'}</div>
      ${TM(`<p class="reason">Требование n-го очка — ${fmt(D.res.base)} × n^(${D.res.exp[0]}/${D.res.exp[1]}): первое — за пару дней, сотое — к концу второго года активного клана. Сейчас: ${fmt(C.res)} / ${fmt(nx)}. Вехи 55 и 85 ускоряют приток на 10 %.</p>`, 'div')}`;
    return sheet('Резервуар', body, `<button class="btn" data-a="go" data-v="contracts">${ic('flag')}К контрактам</button>`);
  },
  /* цель круга: облик, ранг, стихия, здоровье и мощь; после первой победы — класс и приёмы; очки и мой урон */
  cltgt(o) {
    sync(); const C = S.clan, x = C.boss.targets.find(t => t.uid === o.arg); if (!x) return '';
    const k = isKnown(x), src = EC.card(D, { g: x.g, uid: x.uid, cls: x.cls, el: x.el, race: x.race, k: x.k }), bm = cardPow(src), mine = x.dmg[meOf(C).id] || 0;
    const L = EB.lib(), abil = k ? src.kit.kit.map(e => L[e.id]).filter(Boolean) : [];
    const pts = EC.points(D, x.k, x.g), took = Object.values(x.dmg).reduce((a, v) => a + v, 0), est = took ? Math.floor(pts * mine / Math.max(took, x.max - x.hp)) : 0;
    const rounds = fightOf(x, [], 0).o.maxRounds;
    const body = `<div class="row cl-thd">${ph(x, 'lg')}<div class="col"><div class="row cl-chips">${rankChip(x)}${el(x.el)}${k && x.g === 'e' ? `<span class="chip">${CLS(clsName(x.cls), 14)}${clsName(x.cls)}</span>` : ''}</div>
        <div class="row cl-nums">${icoNum('hp', `${fmt(x.hp)} / ${fmt(x.max)}`, 'Здоровье')}${bmHtml(bm, 16)}</div></div></div>
      ${kv([['Раса', x.race], ['Бой', `${rounds} ${roundWord(rounds)} · один на один`], ['За победу', `${fmt(pts)} ${ptsWord(pts)} — по снятому здоровью`],
        x.g === 'b' ? ['Контроль', 'не действует — только дебаффы'] : ['Сопротивлений', 'нет: решает подбор отряда'], mine ? ['Ваш урон', `${fmt(mine)} · ≈${fmt(est)} ${ptsWord(est)}, когда цель падёт`] : null])}
      ${k ? `<span class="eyebrow">Приёмы</span><div class="cl-abs">${abil.map(a => `<div class="cl-ab"><b>${a.n}</b><small>${a.d}</small></div>`).join('')}</div>` : '<p class="reason">Класс и приёмы откроет первая победа.</p>'}
      ${x.dead || x.burned ? '' : `<p class="reason">Не добьёте до конца недели — счёт сгорит.</p>`}`;
    const foot = x.dead || x.burned ? '' : `<button class="btn go" data-a="clatk" data-v="${x.uid}:${C.boss.n + 1}" ${C.boss.att ? '' : 'disabled'}>${ic('sword')}Атаковать</button>`;
    return sheet(nameOf(x), body, foot);
  },
  /* итог атаки: исход заголовком, здоровье цели с отнятым куском, снято и очки; подробности боя — по нажатию */
  clres(o) {
    const R = runById(o.arg), L = R && R.res; if (!L) return '';
    const C = S.clan, x = C.boss.targets.find(t => t.uid === L.uid), live = !!x && !x.dead && !x.burned, pc = v => Math.floor(Math.max(0, v) * 100 / L.max);
    const WHY = { sand: 'Раунды вышли — урон сохранён', wipe: 'Отряд пал — урон сохранён', time: 'Раунды вышли — урон сохранён' };
    const title = L.kill ? (L.g === 'b' ? 'Клановый босс пал' : 'Элита пала') : 'Урон нанесён';
    const kpi = [[L.removed ? '−' + fmt(L.removed) : '0', 'снято здоровья', '']].concat(L.kill ? [[`+${fmt(L.mine)}`, 'ваши очки', 'win']] : [[`${pc(L.removed)} %`, 'здоровья цели', '']]);
    const marks = (L.first ? `<span class="chip spirit">${ic('book')}новое в бестиарии</span>` : '') + (L.summoned ? `<span class="chip gold">${ic('crown')}призван клановый босс</span>` : '') + (L.circle ? `<span class="chip spirit">${ic('up')}открыт круг ${L.circle}</span>` : '');
    const pay = L.pay ? Object.entries(L.pay).sort((a, b) => b[1] - a[1]).map(([id, v]) => { const m = C.members.find(z => z.id === id); return `<div class="cl-lrow"><span>${m ? esc(m.n) + (m.me ? ' · вы' : '') : 'вышел из клана'}</span><b class="num">+${fmt(v)}</b></div>`; }).join('') : '';
    const heroes = L.heroes.map(h => `<tr class="${h.alive ? '' : 'fell'}"><td>${esc(h.name)}${h.alive ? '' : ' <small>пал</small>'}</td><td class="num">${fmt(h.dealt)}</td><td class="num">${fmt(h.healed)}</td></tr>`).join('');
    const more = `<details class="cl-det"><summary>${ic('chev')}Подробности боя</summary><div class="col">
        <p class="reason">${L.kill ? 'Цель пала' : WHY[L.why] || 'Бой окончен'} · ${L.rounds} / ${L.maxRounds} ${roundWord(L.maxRounds)} · атака ${L.n}${TM(' · бой посчитан целиком при оплате: просмотр и «Пропустить» итог не меняют')}.</p>
        <table class="cl-t"><thead><tr><th>Герой</th><th>урон</th><th>лечение</th></tr></thead><tbody>${heroes}</tbody></table>
        ${pay ? `<span class="eyebrow">Очки по снятому здоровью · ${fmt(L.pts)}</span><div class="cl-list">${pay}</div>` : ''}
      </div></details>`;
    const body = `<div class="row cl-rtop">${ph({ g: L.g, cls: L.cls, el: L.el, race: L.race }, 'sm', L.kill || L.known0)}<div class="col"><b class="serif">${nameOf({ g: L.g, cls: L.cls, el: L.el, race: L.race }, L.kill || L.known0)}</b><small class="faint">круг ${L.k}</small></div></div>
      <div class="col cl-rhp">${bar(pc(L.hp), 'hp lg', `<span class="ghost" style="--g:${pc(L.hp0)}"></span>`)}<div class="row"><span>здоровье цели</span><span class="num">${fmt(L.hp)} / ${fmt(L.max)}</span></div></div>
      <div class="row cl-kpi">${kpi.map(([v, s, w]) => `<div class="stat ${w}"><b class="num">${v}</b><small>${s}</small></div>`).join('')}</div>
      ${marks ? `<div class="row cl-marks">${marks}</div>` : ''}
      ${L.kill ? '' : '<p class="reason">Очки придут, когда цель падёт: по снятому здоровью, без бонуса за добивание.</p>'}
      ${more}`;
    const again = live && C.boss.att ? `<button class="btn go" data-a="clagain" data-v="${x.uid}:${C.boss.n + 1}">${ic('sword')}Атаковать ещё</button>` : '';
    return dialog(title, body, `<button class="btn ghost" data-a="close">К кругу</button>${again}`, 'wide');
  },
  /* вклад и итоги недели: мои очки и урон в пути, клан, лидеры вклада, что сгорит */
  clledger() {
    sync(); const C = S.clan; if (!C.in) return '';
    const me = meOf(C), pts = weekPts(), place = placeOf(pts), pend = C.boss.targets.filter(x => !x.dead && !x.burned && x.dmg[me.id]);
    const top = C.members.slice().sort((a, b) => b.boss - a.boss).slice(0, CL_VIEW.list);
    const body = `<div class="row cl-stats"><div class="stat"><b class="num">${fmt(C.boss.mine)}</b><small>ваши очки</small></div><div class="stat"><b class="num">${fmt(pts)}</b><small>очки клана${place ? ' · #' + fmt(place) : ''}</small></div></div>
      ${pend.length ? `<span class="eyebrow">Ваш урон в пути</span><div class="cl-list">${pend.map(x => `<div class="cl-lrow"><span>${nameOf(x)}</span><b class="num">${fmt(x.dmg[me.id])}</b></div>`).join('')}</div><p class="reason">Очки за него придут, когда цель падёт. Не добьёте до конца недели — счёт сгорит.</p>` : ''}
      <span class="eyebrow">Вклад недели · очки кланового босса</span>
      <div class="cl-list">${top.map(m => `<div class="cl-lrow ${m.me ? 'me' : ''}"><span>${esc(m.n)}</span><b class="num">${fmt(m.boss)}</b></div>`).join('')}</div>
      <p class="reason">${C.hop ? 'На этой неделе вы били врагов другого клана: ваши очки — ваши, клану они пойдут со следующей недели.' : 'Личные очки и их награды от главы не зависят.'}</p>`;
    return sheet('Вклад и итоги', body, `<button class="link" data-a="sheet" data-v="rank:Клановый босс">Рейтинг ${ic('chev')}</button>`);
  },
  clrules() {
    const per = EC.attacksDay(D, S.clan.lvl || 0);
    const rows = [['Атаки', `${per} в день, ещё одна дневная норма копится: общий кошелёк на элит и босса`], ['Круг', `${D.boss.pool} элиты, у каждой стихия — случай из семи, сопротивлений нет`],
      ['Босс', `${D.boss.kills} победы над элитами призывают босса недели; висящие элиты сгорают. Контроль на босса не действует — только дебаффы`],
      ['Очки', 'по снятому здоровью, в момент смерти цели; бонуса за добивание нет. Не добили до конца недели — счёт сгорел'],
      ['Лестница', 'после босса — новый круг: враги сильнее, очки выше. Каждую неделю — с первого круга'],
      ['Переход', 'кто на этой неделе бил врагов другого клана, новому клану приносит очки со следующей недели']];
    return sheet('Как устроен круг', `${kv(rows)}${TM(`<p class="reason">Раунды: элита — ${D.boss.rounds.e}, босс — ${D.boss.rounds.b}; сила круга (12 + уровень) × ${D.boss.circle.xBp / 100} %, очки × ${D.boss.points.yBp / 100} % за круг.</p>`, 'div')}`);
  },
  /* участник: вклад, роль; глава — роль, главенство, исключение с причиной; себе — выход */
  clmem(o) {
    sync(); const C = S.clan, m = C.members.find(x => x.id === o.arg); if (!m) return '';
    const w = EC.contrib(D, C.members), sum = w.reduce((a, x) => a + x, 0), i = C.members.indexOf(m), P = C.past;
    const got = P && P.done ? P.groups.reduce((a, g, gi) => a + (P.server[gi][P.members.findIndex(z => z.id === m.id)] || 0) + (P.plan[gi][m.id] || 0), 0) : null;
    const body = `<div class="row cl-phead"><span class="cl-av lg" data-role="${m.role}">${initials(m.n)}</span><div class="col"><b class="serif cl-name">${esc(m.n)}</b><small class="faint">${roleOf(m.role).n} · уровень ${m.lvl} · цикл ${ROMAN[m.cyc]}</small></div></div>
      ${kv([['Вклад недели', `${sum ? Math.round(w[i] * 100 / sum) : 0} %`], ['Резервуар', `${fmt(m.res)} ${ptsWord(m.res)}`], ['Клановый босс', `${fmt(m.boss)} ${ptsWord(m.boss)}`], ['Атак на сегодня', m.atk], ['В клане', m.weeks ? `${m.weeks} ${plural(m.weeks, 'неделю', 'недели', 'недель')}` : 'с этой недели'], ['В сети', ago(m.seen)],
        got != null ? ['Награды прошлой недели', `${got} ${chestWord(got)}`] : null])}`;
    let foot = '';
    if (m.me) foot = `<button class="btn ghost warn" data-a="dlg" data-v="clleave">Выйти из клана</button>`;
    else if (can('roles') && m.role !== 'head') {
      const tr = m.role === 'treasurer';
      foot = `<button class="btn sm" data-a="clrole" data-v="${m.id}:${tr ? 'member' : 'treasurer'}:${clOp()}">${tr ? 'Снять казначея' : 'Сделать казначеем'}</button>
        <button class="btn sm" data-a="dlg" data-v="cllead:${m.id}">Передать главенство</button><button class="btn sm ghost warn" data-a="dlg" data-v="clkick:${m.id}">Исключить</button>`;
    }
    return sheet(esc(m.n), body, foot);
  },
  /* заявки: принять или отклонить; мест нет — нельзя принять */
  clapps() {
    sync(); const C = S.clan, full = C.members.length >= EC.capacity(D, C.lvl);
    const rows = C.apps.map(a => `<div class="cl-arow"><span class="cl-av">${initials(a.n)}</span><span class="cl-mt"><b>${esc(a.n)}</b><small>уровень ${a.lvl} · цикл ${ROMAN[a.cyc]}${a.note ? ' · ' + esc(a.note) : ''}</small></span>
      <button class="btn sm go" data-a="clacc" data-v="${a.id}:${clOp()}" ${full ? 'disabled' : ''}>Принять</button><button class="btn sm ghost" data-a="cldec" data-v="${a.id}:${clOp()}">Отклонить</button></div>`).join('');
    return sheet('Заявки', `${rows || '<p class="faint">Заявок нет.</p>'}${full ? '<p class="reason warn">Мест в клане нет: сначала вырастет древо — +1 место на каждом десятом уровне.</p>' : ''}`);
  },
  /* раздача наград главы (§24.4): пул недели, половина сервера — по вкладу, половину раздаёт глава; журнал виден всем */
  clgifts() {
    sync(); const C = S.clan, P = C.past; if (!C.in) return '';
    if (!P || !P.groups.length) return sheet('Раздача наград', `<p class="muted">${P ? `Неделя ${genOf(P.race)}: очков нет — наград нет.` : 'Подсчёта ещё не было.'}</p>`);
    const total = P.groups.reduce((a, g) => a + g.count, 0), head = P.groups.reduce((a, g) => a + g.head, 0), ed = !P.done && can('gifts');
    const idx = id => P.members.findIndex(m => m.id === id), myCyc = S.acc.cycle;
    const left = P.groups.map((g, gi) => g.head - Object.values(P.plan[gi]).reduce((a, x) => a + x, 0));
    const wells = P.groups.map(g => `<span class="well" data-r="${EC.rOf(g.step, myCyc)}" style="--s:34px" title="${boxName(EC.rOf(g.step, myCyc))}"><img src="${CHEST}" alt=""><span class="q">${fmt(g.count)}</span></span>`).join('');
    const rows = P.members.map(m => {
      const srv = P.groups.map((g, gi) => P.server[gi][idx(m.id)] || 0), hd = P.groups.map((g, gi) => P.plan[gi][m.id] || 0);
      const step = P.groups.map((g, gi) => ed ? `<span class="cl-step" title="${boxName(EC.rOf(g.step, m.cyc))}"><button class="iconbtn" data-a="clplan" data-v="${gi}:${m.id}:-1" ${hd[gi] ? '' : 'disabled'} aria-label="Меньше">${ic('minus')}</button><b class="num">${hd[gi]}</b><button class="iconbtn" data-a="clplan" data-v="${gi}:${m.id}:1" ${left[gi] > 0 ? '' : 'disabled'} aria-label="Больше">${ic('plus')}</button></span>` : `<b class="num">${hd[gi]}</b>`).join('');
      return `<div class="cl-grow ${C.members.some(x => x.me && x.id === m.id) ? 'me' : ''}"><span class="cl-mt"><b>${esc(m.n)}</b><small>по вкладу: ${srv.reduce((a, x) => a + x, 0)}</small></span>${step}</div>`;
    }).join('');
    const fills = ed ? `<div class="row cl-fills"><button class="btn sm" data-a="clfill" data-v="even">Поровну</button><button class="btn sm" data-a="clfill" data-v="contrib">По вкладу</button><button class="btn sm ghost" data-a="clfill" data-v="zero">Сбросить</button><span class="g-spacer"></span><span class="faint">осталось: <b class="num">${left.reduce((a, x) => a + x, 0)}</b></span></div>` : '';
    const body = `<div class="row cl-gtop">${wells}<div class="col"><b class="serif">${fmt(total)} ${chestWord(total)} талисманов</b><small class="faint">неделя ${genOf(P.race)} · место ${P.place ? fmt(P.place) : '—'}</small></div></div>
      <div class="row cl-stats"><div class="stat"><b>${fmt(total - head)}</b><small>по вкладу · роздано сервером</small></div><div class="stat ${P.done ? '' : 'win'}"><b>${fmt(head)}</b><small>${P.done ? (P.auto ? 'роздано сервером: глава не успел' : `раздал ${esc(P.by)}`) : 'от главы · ждут раздачи'}</small></div></div>
      ${fills}
      <div class="col cl-glist">${rows}</div>
      <p class="reason">Редкость сундука — по циклу получателя. Раздача пишется в журнал и видна всем; не раздано за ${D.rewards.headH} ч — половину главы раздаст сервер по вкладу.${TM(' Дары пока показывают долю типичной недели — связать их с журналом раздачи — задача интеграции.')}</p>`;
    const foot = ed ? `<button class="btn go" data-a="clgive" data-v="${clOp()}" ${planFull(P) ? '' : 'disabled'}>Раздать · ${fmt(head)}</button>` : `<button class="link" data-a="sheet" data-v="cllog">Журнал ${ic('chev')}</button>`;
    return sheet('Раздача наград', body, foot, true);
  },
  /* журнал клана: виден всем, не стирается при выходе */
  cllog() {
    sync(); const C = S.clan; if (!C.in) return '';
    const f = S.clan.logF || '', K = [['', 'Всё'], ['gifts', 'Раздача'], ['tree', 'Древо'], ['join', 'Состав'], ['boss', 'Босс'], ['roles', 'Роли']];
    const IC = { gifts: 'flag', tree: 'spark', join: 'users', boss: 'sword', roles: 'crown', passport: 'book' };
    const list = C.log.filter(e => !f || e.k === f).slice(0, CL_VIEW.logShow);
    const body = `<div class="tabs cl-ltabs" role="tablist" aria-label="Журнал">${K.map(([k, n]) => `<button role="tab" aria-selected="${f === k}" data-a="cllf" data-v="${k}">${n}</button>`).join('')}</div>
      <div class="col cl-log">${list.map(e => `<div class="cl-lg">${ic(IC[e.k] || 'info')}<span>${e.t}</span><small class="faint">${dayWord(e.d)}</small></div>`).join('') || '<p class="faint">Записей нет.</p>'}</div>
      <p class="reason">Журнал видят все участники. Он не стирается, когда кто-то уходит.</p>`;
    return sheet('Журнал клана', body);
  },
  /* уровень древа: веха и альтернативы; выбранная отмечена; следующий уровень со свободным очком выбирает глава */
  cllvl(o) {
    sync(); const C = S.clan, L = +o.arg, x = D.tree.levels[L - 1]; if (!x || !C.in) return '';
    const cur = C.picks[L - 1], nxt = nextPick(), pickable = L === nxt && pointsFree() > 0 && can('tree');
    const rows = x.alts.map((a, i) => `<div class="cl-alt ${cur === i ? 'on' : ''}"><div class="col"><b>${a.n}</b><small>${a.d}</small></div>${cur === i ? `<span class="chip spirit">${ic('check')}выбрано</span>` : pickable ? `<button class="btn sm go" data-a="clpick" data-v="${L}:${i}:${clOp()}">Выбрать</button>` : ''}</div>`).join('');
    const why = cur != null || pickable ? '' : L > C.earned ? 'Уровень откроет очко навыков из резервуара.' : L !== nxt ? `Сначала — уровень ${nxt}.` : 'Выбирает глава клана.';
    const body = `<div class="row cl-stats"><div class="stat"><b>${L}</b><small>уровень</small></div><span class="chip">${D.tree.branches[x.br].n}</span>${x.mile ? `<span class="chip gold">${ic('star')}${D.tree.mileName[x.mile.k]}</span>` : ''}</div>
      <span class="eyebrow">${x.alts.length > 1 ? `Одна из ${x.alts.length}` : 'Пассивка уровня'}</span><div class="col cl-alts">${rows}</div>
      ${why ? `<p class="reason">${why}</p>` : ''}${TM(x.alts.some(a => !a.live) ? '<p class="reason">Кроме раундов у врагов клана бонусы в прототипе — показ: сервер переводит их в прибавки при сборке боя.</p>' : '', 'div')}
      <p class="reason">Клановые бонусы не действуют на Арене и в Лиге.</p>`;
    return sheet(`Древо · уровень ${L}`, body);
  },
  /* бонусы клана: вехи и сумма выбранных пассивок */
  clbonus() {
    sync(); const C = S.clan; if (!C.in) return '';
    const M = EC.milestones(D, C.lvl), got = EC.picked(D, C.picks, C.lvl), by = new Map();
    for (const a of got) { const k = a.k + ':' + a.p, x = by.get(k); if (x) x.v += a.v; else by.set(k, Object.assign({}, a)); }
    const txt = a => `${a.n} · ${a.k === 'resEl' ? '−' : '+'}${a.v}${a.flat ? ' ' + roundWord(a.v) : ' %'}`;
    const miles = [['Атак в день', EC.attacksDay(D, C.lvl)], ['Мест в клане', EC.capacity(D, C.lvl)], ['Элит в круге', EC.elitePool(D, C.lvl)], M.speed ? ['Резервуар', `быстрее на ${M.speed / 100} %`] : null, M.dur ? ['Баффы в бою клана', `+${M.dur} ${roundWord(M.dur)}`] : null];
    const body = `${kv(miles)}<span class="eyebrow">Пассивки · ${got.length}</span><div class="cl-list">${[...by.values()].map(a => `<div class="cl-lrow"><span>${txt(a)}</span></div>`).join('') || '<p class="faint">Пассивок пока нет.</p>'}</div>
      <p class="reason">Бонусы действуют во всех боях, кроме Арены и Лиги.</p>`;
    return sheet('Бонусы клана', body);
  },
  /* сброс древа: цена, раз в неделю; уровень и вехи остаются */
  clreset() {
    sync(); const C = S.clan, R = D.tree.reset, done = C.resetWk === C.boss.no, n = C.picks.filter(x => x != null).length;
    const body = `<p class="muted">Все ${n} ${plural(n, 'пассивка', 'пассивки', 'пассивок')} снимутся — глава выберет их заново, уровень за уровнем. Уровень клана, места и атаки остаются.</p>
      ${done ? '<p class="reason warn">На этой неделе древо уже сбрасывали.</p>' : '<p class="reason">Не чаще раза в неделю.</p>'}`;
    return dialog('Сбросить древо', body, `<button class="btn ghost" data-a="close">Отмена</button><button class="btn warn" data-a="clresetdo" data-v="${clOp()}" ${done || !n ? 'disabled' : ''}>Сбросить${costTag('enerium', R.price)}</button>`);
  },
  cllead(o) {
    const m = S.clan.members.find(x => x.id === o.arg); if (!m) return '';
    return dialog('Передать главенство', `<p class="muted">Главой станет ${esc(m.n)}. Вы станете казначеем, если есть место, иначе — участником. Запись — в журнал.</p>`, `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="clleaddo" data-v="${m.id}:${clOp()}">Передать</button>`);
  },
  /* исключение: причина обязательна, запись — в журнал; исключённый ничего своего не теряет */
  clkick(o) {
    const m = S.clan.members.find(x => x.id === o.arg); if (!m) return '';
    const r = S.clan.kickR || '';
    return dialog('Исключить из клана', `<p class="muted">${esc(m.n)} уйдёт из клана. Герои, запасы, личный рейтинг и уже выданные награды останутся с ним.</p>
      <label class="cl-kr"><span class="eyebrow">Причина — в журнал</span><select class="cl-sel" data-a="clkr" aria-label="Причина">${['<option value="">выберите…</option>'].concat(D.kickReasons.map(x => `<option ${x === r ? 'selected' : ''}>${x}</option>`)).join('')}</select></label>`,
      `<button class="btn ghost" data-a="close">Отмена</button><button class="btn warn" data-a="clkickdo" data-v="${m.id}:${clOp()}" ${r ? '' : 'disabled'}>Исключить</button>`);
  },
  /* выход — в любой момент, без штрафа */
  clleave() {
    const C = S.clan, me = meOf(C), heir = me && me.role === 'head' ? C.members.filter(m => !m.me).sort((a, b) => (b.role === 'treasurer') - (a.role === 'treasurer') || (b.res + b.boss) - (a.res + a.boss))[0] : null;
    return dialog('Выйти из клана', `<p class="muted">Без штрафа и ожидания. Герои, запасы, личный рейтинг и Дары останутся с вами; ваш вклад — в журнале клана.</p>${heir ? `<p class="reason">Главой станет ${esc(heir.n)}.</p>` : ''}${C.boss.n ? '<p class="reason warn">На этой неделе вы уже били врагов клана: новому клану очки пойдут со следующей недели.</p>' : ''}`,
      `<button class="btn ghost" data-a="close">Остаться</button><button class="btn warn" data-a="clleavedo" data-v="${clOp()}">Выйти</button>`);
  },
  /* клан из поиска: паспорт без действий главы */
  clfind(o) {
    const x = searchList().find(c => c.id === o.arg); if (!x) return '';
    const why = joinWhy(x);
    const body = `<div class="row cl-phead">${emblem(x.emblem, 'lg')}<div class="col"><b class="serif cl-name">${esc(x.n)}</b><small class="faint">${typeOf(x.type).n} · ${joinOf(x.join).n.toLowerCase()}</small></div></div>
      ${foldLore(esc(x.note) || '—', 'muted')}
      ${kv([['Уровень', x.lvl], ['Участников', `${x.mem} / ${EC.capacity(D, x.lvl)}`], ['Требования', `уровень ${x.req.level}+ · цикл ${ROMAN[x.req.cycle]}+`], x.place ? ['Место прошлой недели', fmt(x.place)] : null])}
      ${why ? `<p class="reason warn">${why}.</p>` : ''}`;
    const applied = S.clan.srch.applied[x.id];
    return sheet(esc(x.n), body, applied ? '<span class="chip spirit">заявка отправлена</span>' : `<button class="btn go" data-a="cljoin" data-v="${x.id}:${clOp()}" ${why ? 'disabled' : ''}>${x.state ? 'Вернуться' : x.join === 'open' ? 'Вступить' : 'Подать заявку'}</button>`);
  },
  clnew() {
    const v = S.clan.newName || '';
    return dialog('Создать клан', `<label class="search cl-name-in"><input id="clName" type="text" maxlength="${D.passport.nameMax}" value="${esc(v)}" autocomplete="off" spellcheck="false" aria-label="Имя клана" placeholder="Имя клана"></label>
      <p class="reason">От ${CL.create.nameMin} до ${D.passport.nameMax} знаков. Тип, вход и эмблему глава меняет в паспорте.</p>`,
      `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="clnewdo" data-v="${clOp()}">Создать${costTag('gold', createPrice())}</button>`);
  },
});
document.addEventListener('input', e => { const t = e.target; if (t && t.id === 'clName' && S.clan) S.clan.newName = t.value; });

/* ================== действия ================== */
Object.assign(ACT, {
  cltc(v) { S.clan.treeC = +v; render(); },
  clsf(v) { S.clan.srch.f = v; render(); },
  cllf(v) { S.clan.logF = v; S.overlay = { t: 'cllog' }; render(); },
  /* атака: v — «цель:номер атаки»; повтор с тем же номером ничего не списывает. Нет отряда — лист выбора (§25.1: установка при первом входе) */
  clatk(v) {
    sync();
    const [uid, no] = String(v).split(':'), C = S.clan;
    if (+no !== C.boss.n + 1) return;
    if (!SQ.of('clan')) { SQ.pick('clan'); return; }
    const R = SQ.ready('clan');
    if (!R.ok) { S.overlay = { t: 'confirm', title: 'Отряд не готов', text: R.why === 'все заняты' ? 'Все герои отряда заняты. Атакуют только свободные.' : `Отряд для клана: ${R.why}.`, ok: 'Изменить отряд', act: 'sqmode', v: 'clan' }; render(); focusOverlay(); return; }
    const r = CL_SRV.attack('atk:' + C.id + ':' + C.boss.no + ':' + no, uid, R.go);
    if (!say(r)) return;
    play(r.res.L);
  },
  clskip(v) {
    const R = runById(v) || focusRun(); if (!R || R.kind !== 'clan') return;
    R.over = true; R.seen = true; S.focus = R.id; S.insp = null; S.route = 'clan'; S.overlay = { t: 'clres', arg: R.id };
    render(); focusOverlay();
  },
  clagain(v) { S.overlay = null; S.route = 'clan'; S.seg.clan = 'boss'; ACT.clatk(v); },
  clpick(v) { const [L, i, op] = v.split(':'); const r = CL_SRV.pick(op, +L, +i); if (say(r)) { S.overlay = null; toast(`Уровень ${L}: «${D.tree.levels[+L - 1].alts[+i].n}»`); } },
  clresetdo(v) { const r = CL_SRV.reset(v); if (say(r)) { S.overlay = null; toast('Древо сброшено: пассивки выберите заново'); } },
  clplan(v) {
    const [gi, id, d] = v.split(':'), P = S.clan.past; if (!P || P.done || !can('gifts')) return;
    const g = P.groups[+gi], cur = P.plan[+gi][id] || 0, left = g.head - Object.values(P.plan[+gi]).reduce((a, x) => a + x, 0), nv = cur + (+d);
    if (nv < 0 || (+d > 0 && left <= 0) || nv > CL_VIEW.planMax) return;
    P.plan[+gi][id] = nv; render();
  },
  clfill(v) {
    const P = S.clan.past; if (!P || P.done || !can('gifts')) return;
    const w = v === 'contrib' ? EC.contrib(D, P.members) : P.members.map(() => v === 'zero' ? 0 : 1);
    P.groups.forEach((g, gi) => { const got = v === 'zero' ? P.members.map(() => 0) : EC.share(g.head, w); P.plan[gi] = Object.fromEntries(P.members.map((m, j) => [m.id, got[j]])); });
    render();
  },
  clgive(v) { const r = CL_SRV.gifts(v); if (say(r)) { toast('Награды розданы — запись в журнале'); } },
  clrole(v) { const [id, role, op] = v.split(':'); const r = CL_SRV.role(op, id, role); if (say(r)) toast(role === 'member' ? 'Роль снята' : `Назначен: ${roleOf(role).n}`); },
  clleaddo(v) { const [id, op] = v.split(':'); const r = CL_SRV.lead(op, id); if (say(r)) { S.overlay = null; toast('Главенство передано'); } },
  clkr(v, t) { S.clan.kickR = t && t.value || ''; render(); },
  clkickdo(v) { const [id, op] = v.split(':'); const r = CL_SRV.kick(op, id, S.clan.kickR || ''); if (say(r)) { S.clan.kickR = ''; S.overlay = null; toast('Исключён — запись в журнале'); } },
  clacc(v) { const [id, op] = v.split(':'); const r = CL_SRV.accept(op, id); if (say(r)) render(); },
  cldec(v) { const [id, op] = v.split(':'); const r = CL_SRV.decline(op, id); if (say(r)) render(); },
  clpset(v) { const [k, x, op] = v.split(':'); const r = CL_SRV.passport(op, { [k]: x }); if (say(r)) render(); },
  clreql(v, t) { const r = CL_SRV.passport(clOp(), { level: t && t.value }); if (say(r)) render(); },
  clreqc(v, t) { const r = CL_SRV.passport(clOp(), { cycle: t && t.value }); if (say(r)) render(); },
  clgoal(v, t) { const r = CL_SRV.passport(clOp(), { goals: { [v]: t && t.value } }); if (say(r)) render(); },
  clnote(v, t) { const r = CL_SRV.passport(clOp(), { note: t && t.value }); if (say(r)) render(); },
  clleavedo(v) { const r = CL_SRV.leave(v); if (say(r)) { S.overlay = null; S.seg.clan = 'pass'; toast('Вы вышли из клана'); } },
  cljoin(v) {
    const [id, op] = v.split(':'), r = CL_SRV.join(op, id);
    if (!say(r)) return;
    S.overlay = null;
    if (r.res.applied) toast('Заявка отправлена: ответ придёт во Входящие');
    else { S.seg.clan = 'pass'; toast(`Вы в клане «${S.clan.n}»`); }
  },
  clnewdo(v) { const r = CL_SRV.create(v, S.clan.newName || ''); if (say(r)) { S.overlay = null; S.seg.clan = 'pass'; toast(`Клан «${S.clan.n}» основан`); } },
  /* команде: время и роль — переключатели прототипа */
  clday() { sync(); if (!inClan()) return; refillDay(S.clan, false); S.clan.day++; toast('Новый день: атаки в кошельке'); },
  clweek() { sync(); if (!inClan()) return; weekEnd(S); toast('Неделя подсчитана: пул наград — в раздаче'); },
  clauto() { sync(); if (inClan() && CL_SRV.giftsAuto()) toast('Срок вышел: половину главы раздал сервер'); else toast('Раздавать нечего'); },
  clrolev(v) { if (!inClan()) return; S.clan.role = v; const me = meOf(S.clan); if (me) me.role = v === 'head' ? 'head' : v; render(); },
  clacc0() { const C = S.clan; if (C.in) return; const id = Object.keys(C.srch.applied)[0]; const x = id && searchList().find(c => c.id === id); if (!x) return toast('Заявок нет'); enter(x); S.seg.clan = 'pass'; toast(`Заявку приняли: вы в клане «${S.clan.n}»`); },
});

/* команде: переключатели прототипа — роль игрока, новый день, подсчёт недели, срок раздачи */
function teamBar() {
  const C = S.clan;
  return TM(`<div class="row cl-team">${C.in ? `<select class="cl-sel" data-a="clrole0" aria-label="Роль игрока">${D.roles.map(r => `<option value="${r.id}" ${C.role === r.id ? 'selected' : ''}>как ${r.n.toLowerCase()}</option>`).join('')}</select>
    <button class="btn sm" data-a="clday">Новый день</button><button class="btn sm" data-a="clweek">Подсчёт недели</button><button class="btn sm" data-a="clauto">Срок раздачи вышел</button>`
    : `<button class="btn sm" data-a="clacc0">Заявку приняли</button>`}</div>`, 'div');
}
ACT.clrole0 = (v, t) => ACT.clrolev(t && t.value);
const screenBase = SCREENS.clan;
SCREENS.clan = function () { const s = screenBase(); s.html = s.html.replace('</section>', teamBar() + '</section>'); return s; };

/* ================== Неделя: итоги режима (WEEK_MODES, screens/week.js) ==================
   Планок нет (§25.3): место клана и очки клана; личный вклад — в листе; лидеры — кланы. Прошлая неделя — выплаты из «Даров» */
const T_CL = { placeLabel: 'место клана', meTag: 'ваш клан', topLabel: 'Кланы-лидеры' };
(window.WEEK_MODES = window.WEEK_MODES || []).push({
  id: 'clan', n: 'Клановый босс', icon: 26, go: 'clan:boss', order: 40, unit: ['очко', 'очка', 'очков'],
  now() {
    sync();
    const M = LB && LB.modes.clan, c = S.acc.cycle;
    if (M && c < M.from) return { lock: `рейтинг — с цикла ${ROMAN[M.from]}` };
    if (!inClan()) return { lock: 'вы не в клане' };
    const C = S.clan, pts = weekPts(), place = placeOf(pts), row = EC.tier(LB, place, pts), ly = M ? M.layers.find(l => l.kind === 'place' && l.clan) : null;
    return Object.assign({ place, points: pts, mine: C.boss.mine, me: C.n, top: CL.leaders.now.map(x => x.slice()),
      tier: row ? { label: row.label, one: ly ? ly.one : 'Место клана', pay: row.cyc[c] || [] } : null, alert: C.boss.att > 0 ? `Атак на сегодня: ${C.boss.att}` : '' }, T_CL);
  },
  past() {
    sync();
    const M = LB && LB.modes.clan, c = S.acc.cycle;
    if (M && c < M.from) return { lock: `рейтинг — с цикла ${ROMAN[M.from]}` };
    const C = S.clan, P = C.past; if (!P) return { lock: 'подсчёта ещё не было' };
    const rows = typeof darRows === 'function' && S.zp ? darRows(S).filter(p => p.id === 'clan' && p.wk && p.wk.id === 'prev') : [];
    return Object.assign({ place: P.place, points: P.pts, mine: P.mine, me: C.in ? C.n : (C.srch.left ? C.srch.left.n : C.n), top: P.leaders.map(x => x.slice()),
      rewards: rows.map(p => ({ label: p.label, box: p.box, groups: p.groups.map(g => ({ r: g.r, count: g.count, win: g.win })), st: p.st, cat: p.cat, kind: p.kind })),
      note: P.done ? '' : 'Половину клановых сундуков раздаёт глава' }, T_CL);
  },
});

/* ================== «Дары»: клановая доля — из журнала раздачи (§24.4), а не из типичной недели ==================
   screens/bag.js спрашивает DAR_CLAN.clan(состояние, неделя). Прошлая неделя подсчитана: половина сервера по вкладу — сразу; доля главы —
   после раздачи (или сервером по сроку), до неё — ждёт, ориентир — половина главы поровну на участника. Эта неделя — место клана сейчас,
   сундуков на участника, ждёт подсчёта. Без клана и без подсчёта — строк нет. Сундуки — ступени пула в редкость цикла игрока */
if (window.DAR_CLAN) window.DAR_CLAN.clan = (st, wk) => {
  const C = st.clan; if (!C) return null;
  const c = st.acc.cycle, M = LB && LB.modes.clan, ly = M ? M.layers.find(l => l.kind === 'place' && l.clan) : null, one = ly ? ly.one : 'Место клана';
  const pack = (groups, n) => groups.map((g, gi) => ({ r: EC.rOf(g.step, c), win: g.win, count: n(g, gi) })).filter(g => g.count > 0);
  if (wk.id === 'prev') {
    const P = C.past, i = P ? P.members.findIndex(m => m.id === P.me) : -1; if (i < 0) return [];
    const where = `${one}: ${P.row || '—'}`, rows = [];
    const srv = pack(P.groups, (g, gi) => (P.server[gi] || [])[i] || 0);
    if (srv.length) rows.push({ label: `${where} · по вкладу`, groups: srv, st: 'ok', why: `итог недели подсчитан · место ${fmt(P.place)} · половину пула сервер раздал по вкладу` });
    const head = pack(P.groups, (g, gi) => P.done ? (P.plan[gi] || {})[P.me] || 0 : Math.floor(g.head / Math.max(1, P.members.length)));
    if (head.length) rows.push({ label: `${where} · от главы`, groups: head, st: P.done ? 'ok' : 'wait',
      why: P.done ? `${P.auto ? 'срок вышел — половину главы раздал сервер по вкладу' : 'глава раздал свою половину'} · журнал клана`
        : 'ждёт раздачи главой · ориентир — поровну на участника; не успеет к сроку — раздаст сервер по вкладу' });
    return rows;
  }
  if (!C.in) return [];
  const pts = weekPts(C), place = placeOf(pts), row = EC.tier(LB, place, pts); if (!row) return [];
  const g = (row.cyc[c] || []).map(x => ({ r: x.r, win: x.win, count: x.count }));
  return g.length ? [{ label: `${one}: ${row.label}`, groups: g, st: 'wait', why: `ждёт подсчёта недели · сейчас место ${fmt(place)} · половину раздаст сервер по вкладу, половину — глава` }] : [];
};

/* ================== состояние: и у сброса, и у текущей сессии ================== */
const initBase = initialState;
initialState = function () { const s = initBase(); return fresh(s); };
fresh(S);
/* место клана в рейтингах профиля — из подсчёта */
function syncRanks(s) { const r = (s.ranks || []).find(x => x[0] === 'Клановый босс'); if (r && s.clan && s.clan.past) r[1] = s.clan.past.place; }
syncRanks(S);
const initRanks = initialState;
initialState = function () { const s = initRanks(); syncRanks(s); return s; };

/* ================== UI-кит: раздел «Клан» (KIT_EXTRA) ================== */
function clKitHtml() {
  const C = S.clan && S.clan.in ? S.clan : null;
  const race = C ? C.boss.wk : D.lists.races[0], k = C ? C.boss.circle : 1;
  const sample = (g, cls, el, st) => { const x = { uid: 'kit-' + g + cls + el, g, k, cls: g === 'b' ? D.boss.bossCls : cls, el, race, hp: 0, max: 0, dmg: {}, dead: st === 'dead', burned: st === 'burned', used: [] }; const src = EC.card(D, x); x.max = src.maxHp; x.hp = st === 'dead' ? 0 : Math.floor(src.maxHp * (st === 'hit' ? 4 : 10) / 10); return x; };
  const cards = [sample('e', 'Танк', 'Огонь', 'full'), sample('e', 'Лекарь', 'Вода', 'hit'), sample('e', 'Маг. ДД', 'Тьма', 'dead'), sample('e', 'Дебаффер', 'Время', 'burned')];
  const circ = D.calc.circles.map(r => `<tr><td class="num">${r[0]}</td><td class="num">${fmt(r[1])}</td><td class="num">${fmt(r[2])}</td><td class="num">${fmt(r[3])}</td><td class="num">${fmt(r[6])} / ${fmt(r[7])}</td></tr>`).join('');
  const PROF = { o: 'обычный', e: 'увлечённый' };
  const weeks = D.calc.weeks.map(r => `<tr><td>${PROF[r[0]]}, ${ROMAN[r[1]]} · ${r[2]}-я</td><td class="num">${fmt(r[3])}</td><td class="num">${r[5]} × ${r[6]}</td><td class="num">${r[8]}${r[9] ? ' + ' + r[9] : ''}</td><td class="num">${fmt(r[10])}</td></tr>`).join('');
  const ref = D.res.ref.o.map(([n, d]) => `<tr><td class="num">${n}</td><td class="num">${fmt(need(n))}</td><td class="num">${d ? fmt(d) : '—'}</td></tr>`).join('');
  const rights = Object.keys(D.rights).map(k2 => `<tr><td>${D.rights[k2]}</td>${D.roles.map(r => `<td class="c">${r.rights.includes(k2) ? '●' : ''}</td>`).join('')}</tr>`).join('');
  const knots = `<div class="cl-knots static"><span class="cl-k on" title="выбрано"></span><span class="cl-k now" title="можно выбрать"></span><span class="cl-k" title="впереди"></span><span class="cl-k big mile on" title="пятый уровень ветки">${ic('sword')}</span><span class="cl-k big mile" title="десятый уровень ветки">${ic('users')}</span></div>`;
  return `<section class="k-box" style="grid-column:1/-1"><h3>Клан · паспорт, клановый босс, участники, древо</h3>
    <p class="k-note">Экран — <code>screens/clan.js</code>, данные и алгоритмы — <code>clan.js</code> (<code>EN_CLAN</code>, <code>EnClan</code>), сборка — <code>tools/content-gen/clan/build.js</code>, черновик — <code>docs/content/клан.md</code>. Четыре вкладки: паспорт с резервуаром, босс, участники, древо; без клана — поиск. Атака — бой ядром на сиде атаки, итог — до показа; раздача половины наград — лист главы; журнал виден всем. Числа — демонстрация.</p>
    <div class="cl-kg">
      <div class="col"><span class="eyebrow">Карточка цели: полная · ранена · пала · сгорела</span><div class="cl-kit-cards">${cards.map(x => tgtCard(x)).join('')}</div>
        <p class="k-note">Два числа — здоровье и мощь, два чипа — ранг и стихия, одно действие. До первой победы — «Неизученная элита» и знак вопроса; класс и приёмы — в листе после победы. Облик — заглушка: свет стихии снизу.</p></div>
      <div class="col"><span class="eyebrow">Узлы древа</span>${knots}<p class="k-note">Золото — выбрано, свет духа — очко навыков ждёт, крупный узел — веха: пятый уровень ветки — тактика против босса (в первом круге ещё +1 атака), десятый — +1 место. На уровне — одна пассивка из 1–5.</p>
        <span class="eyebrow">Роли и права</span><table class="cl-t k"><thead><tr><th></th>${D.roles.map(r => `<th>${r.n}</th>`).join('')}</tr></thead><tbody>${rights}</tbody></table></div>
      <div class="col"><span class="eyebrow">Резервуар · эталон — полный клан обычных игроков</span><table class="cl-t k"><thead><tr><th>Очко</th><th>Требование</th><th>День</th></tr></thead><tbody>${ref}</tbody></table>
        <p class="k-note">Требование — ${fmt(D.res.base)} × n^(${D.res.exp[0]}/${D.res.exp[1]}): при показателе 3/2 из §24.3 сотое очко пришло бы через 84 года. Цели §24.3 оставлены, показатель подобран калькулятором.</p></div>
      <div class="col"><span class="eyebrow">Круги кланового босса</span><table class="cl-t k"><thead><tr><th>Круг</th><th>Уровень</th><th>Элита</th><th>Босс</th><th>Очки</th></tr></thead><tbody>${circ}</tbody></table>
        <p class="k-note">Сила врагов круга ×${D.boss.circle.xBp / 100} %, очки — так же. Круг 1 — отряд обычного игрока в первый день цикла II: элита падает за ${D.calc.c1.e / 100} атак, босс — за ${D.calc.c1.b / 100}.</p></div>
      <div class="col"><span class="eyebrow">Неделя эталонных кланов</span><table class="cl-t k"><thead><tr><th>Клан</th><th>Сила</th><th>Атаки</th><th>Кругов</th><th>Очков</th></tr></thead><tbody>${weeks}</tbody></table>
        <p class="k-note">Прогон ядром: круги по порядку, пока хватает атак недели. Потолок клана — его сила.</p></div>
      <div class="col"><span class="eyebrow">Законы клана</span><ul class="cl-laws">${D.laws.map(l => `<li>${l}</li>`).join('')}</ul></div>
    </div></section>`;
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: clKitHtml });

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Клан · атака элиты', 'Последняя элита круга: бой ядром, итог и призыв кланового босса', () => {
    sync(); S.route = 'clan'; S.seg.clan = 'boss'; S.overlay = null;
    if (!SQ.of('clan')) SQ.set('clan', S.squads[0].id);
    const x = S.clan.boss.targets.find(t => !t.dead && !t.burned);
    if (x && S.clan.boss.att) ACT.clatk(`${x.uid}:${S.clan.boss.n + 1}`);
  }],
  ['Клан · раздача главы', 'Половина сундуков — по вкладу, половину раздаёт глава; запись — в журнал', () => { sync(); S.route = 'clan'; S.seg.clan = 'mem'; S.overlay = { t: 'clgifts' }; }],
  ['Клан · очко навыков', 'Резервуар дал очко: глава выбирает пассивку следующего уровня древа', () => { sync(); S.route = 'clan'; S.seg.clan = 'tree'; const L = nextPick(); S.overlay = L ? { t: 'cllvl', arg: String(L) } : null; }],
  ['Клан · поиск', 'Без клана: поиск, вход, заявка и свой клан', () => { sync(); if (inClan()) { CL_SRV.leave(clOp()); } S.route = 'clan'; S.overlay = null; }],
);

/* для автопроверки tools/content-gen/screens/check_clan.js и консоли */
window.EN_CLAN_UI = { data: CL, view: CL_VIEW, srv: CL_SRV, sync, fresh, weekEnd, refillDay, placeOf, weekPts, nextPick, pointsFree, fightOf, battleOf, circleTargets, searchList, joinWhy, countWeek, planFull, tgtCard };
})();
