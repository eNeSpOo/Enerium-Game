/* Энериум · прототип «Свет снизу» — «Неделя»: три времени и реестр итогов режимов (screens/week.js).
   Подключается после screens/model.js и до bag.js: bag.js оборачивает SCREENS.week и пишет у кнопки «Дары» число доступных сундуков;
   этот файл пишет то же число сам, поэтому обёртка ничего не меняет.
   Регистрирует: SCREENS.week; листы OV.wkmode (режим на эту или прошлую неделю), OV.wkpast (итог прошлой недели), OV.wkclock (сроки),
   OV.wknext (следующая неделя); OV.rank — «Рейтинг» с любого экрана из того же реестра; действие ACT.wkrt; раздел UI-кита «Неделя»;
   сценарии презентации. Глобал window.WEEK_MODES — реестр итогов режимов, window.EN_WEEK — для проверки check_week.js.
   Три времени — сегменты шапки (S.seg.week): «Прошлая», «Эта неделя», «Следующая».
   - Эта неделя: раса и цивилизация Эхо недели, срок до отсечки, «Дары»; шесть режимов строкой — место, очки, полоса до ближайшей
     планки с её сундуком. Слово автора 29.09.2026: переход в режим был неочевиден — поменяли местами. Строка и её «›» открывают
     сведения (лист: подробности, планки, лидеры); в режим ведёт явная кнопка «Войти» справа в строке и такая же в листе.
     Ритуалы — одной строкой ниже, у них нет рейтинга и листа: строка сама ведёт в ритуалы, справа — то же «Войти».
   - Прошлая: итог — сундуки и Энериум недели; по режимам место и очки, лучший сундук и где он; лидеры и награды — лист; «Дары» — ссылка.
   - Следующая: раса и цивилизация, герои Эхо недели и их неприязнь, стихии нашествия, что готовить.
   Режимы сообщают Неделе своё состояние сами: WEEK_MODES.push({ id, n, icon, go, order, unit, now, past }) — договор в screens/README.md.
   Пока Арена, Лига, Событие, Клановый босс и Контракты не подключены своими экранами, их строки — демо этого файла (demo: true):
   состояние — S и EN_ECHO (echo.js), планки и выплаты — EN_LOOTBOXES, итоги прошлой недели — «Дары» (darRows, bag.js), недостающее — WK.
   Правила воздуха (ADR-0026): одна мысль на экран; на строке — не больше двух чисел, двух чипов и одного действия; подробности — в листах.
   Все числа WK — демонстрация. В игре состояние, места, лидеров и выплаты решает сервер (§36). */
(function () {
'use strict';

/* ================== данные экрана: все числа — демонстрация ================== */
const WK = {
  bp: 10000,                                            // 10 000 б. п. = 100 %
  hour: 3600,                                           // секунд в часе
  /* сроки (§1.1, §1.4, §18.6): приём результатов закрывается за час до подсчёта; подсчёт — один серверный час; потом — новая неделя */
  clock: { cutoffH: 1, countH: 1 },
  /* строки режимов: id режима (как в EN_LOOTBOXES.modes), порядок, значок пути PATH, маршрут экрана */
  modes: [['echo', 10, 18, 'echo'], ['event', 20, 21, 'event'], ['contract', 30, 38, 'contracts'], ['clan', 40, 26, 'clan:boss'], ['arena', 50, 3, 'arena:arena'], ['league', 60, 3, 'arena:league']],
  rituals: [33, 'rituals'],                             // ритуалы — не рейтинговый режим: строка под режимами
  leagueHeroes: 15,                                     // §20.4: Лига — для собравших 15 героев
  /* пороги личных планок в экране не хранятся — они в данных режимов (NEEDS ниже): контракты — EN_CONTRACTS.planks, Арена и Лига —
     EN_ARENA.arena.plank и .league.plank, Эхо — echo.js (EN_ECHO.planks), Событие — evPlanks (event.js) */
  /* эта неделя: чего нет в состоянии прототипа. Место — из S.ranks, как в профиле и «Дарах». Запасные числа — те же, что у демо режимов
     (CT_DEMO, AR_DEMO): один календарь демо, 11-й день цикла II (ADR-0031, п. 17) */
  now: {
    contract: { points: 760 },                          // очки выполненных контрактов недели — как прежде в листе «Рейтинг»
    arena: { wins: 38, top: [1832, 1797, 1768] },       // победы сезона — к планкам; рейтинг лидеров (§20.5: старт 1000)
    league: { wins: 3, rating: 1012, top: [1702, 1668, 1641] },
    clan: { points: 38400, mine: 1320, top: [214000, 198500, 187300] },   // очки клана, личный вклад и кланы-лидеры (§25.3)
  },
  /* прошлая неделя: планки и места — из «Даров»; здесь — доля пути от взятой планки к следующей, места без выплаты и лидеры */
  past: {
    frac: { echo: 1900, event: 1900, contract: 1500, arena: 2500, league: 3300 },   // б. п.
    place: { event: 187, league: 240, clan: 3460 },     // места без выплаты: у События и Лиги места — до топ-100, у клана — «все с очками» (CL.past в clan.js)
    arena: { rating: 1231, days: [95, 88, 102, 97, 91, 99, 95], top: [1846, 1812, 1779] },   // места на ежедневных срезах рейтинга
    league: { rating: 1084, top: [1715, 1690, 1652] },
    clan: { points: 5400, mine: 490, top: [231000, 204700, 192100] },   // первая неделя клана демо (CL.past в clan.js)
    contract: { cur: [['gold', 19600], ['spirit', 1200], ['keys', 28], ['enerium', 40]] },   // пул недельного контракта ×2 за заверение (§18.5)
  },
  arenaEnerium: [[1, 100], [10, 50], [30, 25], [100, 10]],   // §20.6: ежедневный Энериум за место — стартовые значения
  /* лидеры режимов с планками — доля порога последней планки, б. п.; имена игроков и кланов — жители сервера прототипа */
  topBp: { now: [11500, 9800, 8600], past: [21000, 17800, 15600] },
  names: ['Тихий ветер', 'Северный странник', 'Собиратель искр', 'Лунный страж', 'Искатель', 'Светлый пепел', 'Тихий шаг', 'Синий огонь', 'Пепельная тропа'],
  clans: ['Северный дозор', 'Серые крылья', 'Тихая гавань', 'Ночной караван', 'Светлый круг'],
  me: 'Странник',
  view: { chest: 24, crystal: 16, els: 3 },             // вид: размер сундука на строке, кристалла, сколько стихий нашествия на экране
};

if (!window.EN_ROSTER || !RS.weeks.length || !LBX) {
  SCREENS.week = () => ({ title: 'Неделя', html: '<section class="scr"><div class="pnl pad"><p class="faint">Нет данных недели.</p></div></section>' });
  return;
}

/* ================== реестр итогов режимов ==================
   Экран режима сообщает Неделе своё состояние и итоги сам, где бы ни стоял его файл:
     (window.WEEK_MODES = window.WEEK_MODES || []).push({ id, n, icon, go, order, unit, now() {…}, past() {…} });
   Строка с тем же id заменяет демо этого файла (demo: true); из двух настоящих остаётся последняя. Договор — screens/README.md. */
const REG = window.WEEK_MODES = window.WEEK_MODES || [];
function modes() {
  const by = new Map();
  for (const m of REG) { if (!m || !m.id || !m.n) continue; const cur = by.get(m.id); if (!cur || cur.demo || !m.demo) by.set(m.id, m); }
  return [...by.values()].sort((a, b) => (a.order || 0) - (b.order || 0));
}
const modeOf = id => modes().find(m => m.id === id) || null;
const modeByName = n => modes().find(m => m.n === n || m.id === n) || null;

/* ================== недели ================== */
/* прошлая, текущая и следующая недели — по кругу рас roster.js; текущая — S.week.race */
function weeks() {
  const W = RS.weeks, n = W.length, i = Math.max(0, W.findIndex(w => trNorm(w.gen) === trNorm(S.week.race)));
  return { prev: W[(i + n - 1) % n], cur: W[i], next: W[(i + 1) % n] };
}
const civOf = race => window.EN_ECHO && EN_ECHO.data && EN_ECHO.data.civ ? EN_ECHO.data.civ[race] || null : null;
const leftS = () => Math.max(0, Math.floor(S.week.left));
const startIn = () => leftS() + (WK.clock.cutoffH + WK.clock.countH) * WK.hour;

/* ================== состояние режима ==================
   Что отдаёт now() или past() — в договоре README; здесь — проверка и приведение: только целые, место от 1, лидеры по убыванию,
   ближайшая планка — первая невзятая. Сбой одного режима не ломает экран: строка пишет «нет данных» */
const int = v => Number.isInteger(v) ? v : null;
function call(m, t) {
  const f = t === 'past' ? m.past : m.now;
  if (typeof f !== 'function') return null;
  try { const r = f.call(m); return r && typeof r === 'object' ? r : null; } catch (e) { if (typeof console !== 'undefined') console.error(e); return null; }
}
/* лидеры и я: мои очки выше чьих-то из тройки — я в тройке на своём месте; иначе — ниже, после «···» */
function board(top, me) {
  const rows = top.map(([n, v]) => ({ place: 0, n, v, me: false }));
  rows.forEach((r, i) => { r.place = i + 1; });
  if (!me) return { rows, me: null, place: null };
  const above = rows.filter(r => r.v > me.v).length;
  if (above < rows.length) {
    rows.splice(above, 0, Object.assign({ place: 0, me: true }, me));
    rows.forEach((r, i) => { r.place = i + 1; });
    rows.length = top.length;
    return { rows, me: null, place: above + 1 };
  }
  const place = Math.max(me.place, rows.length + 1);
  return { rows, me: Object.assign({}, me, { place, me: true }), place, gap: place > rows.length + 1 };
}
function stateOf(m, t) {
  const raw = call(m, t) || { lock: 'нет данных' }, st = { m, t, lock: raw.lock ? String(raw.lock) : '' };
  st.unit = raw.unit || m.unit || ['очко', 'очка', 'очков'];
  st.points = int(raw.points); st.place = int(raw.place) && raw.place > 0 ? raw.place : null;
  st.have = int(raw.have) != null ? raw.have : st.points || 0;
  st.box = raw.box || (LBX.modes[m.id] ? LBX.modes[m.id].box : '');
  st.plankUnit = raw.plankUnit || st.unit;
  st.planks = (Array.isArray(raw.planks) ? raw.planks : []).filter(p => p && int(p.need) != null).map((p, i) => ({ k: p.k || i + 1, need: p.need, pay: Array.isArray(p.pay) ? p.pay : [], reached: p.reached != null ? !!p.reached : st.have >= p.need }));
  /* клановые планки недели, если режим их ведёт: взятые клановые планки этой недели «Дары» показывают ждущими распределения (bag.js) */
  st.clanPlanks = (Array.isArray(raw.clanPlanks) ? raw.clanPlanks : []).filter(p => p && int(p.need) != null).map((p, i) => ({ k: p.k || i + 1, need: p.need, pay: Array.isArray(p.pay) ? p.pay : [], reached: !!p.reached }));
  st.next = raw.next && int(raw.next.need) != null ? Object.assign({ pay: [] }, raw.next) : st.planks.find(p => !p.reached) || null;
  const top = (Array.isArray(raw.top) ? raw.top : []).filter(x => Array.isArray(x) && x[0] && int(x[1]) != null).slice().sort((a, b) => b[1] - a[1]);
  st.meName = raw.me || WK.me;
  st.placeLabel = raw.placeLabel || 'место'; st.meTag = raw.meTag || 'вы'; st.topLabel = raw.topLabel || 'Лидеры';
  st.board = board(top, st.place != null ? { place: st.place, n: st.meName, v: st.points || 0 } : null);
  if (st.board.place) st.place = st.board.place;
  st.mine = int(raw.mine);
  st.tier = raw.tier && Array.isArray(raw.tier.pay) ? raw.tier : null;
  st.rewards = (Array.isArray(raw.rewards) ? raw.rewards : []).filter(r => r && Array.isArray(r.groups));
  st.cur = (Array.isArray(raw.cur) ? raw.cur : []).filter(x => Array.isArray(x) && CUR[x[0]] && int(x[1]) > 0);
  st.alert = raw.alert ? String(raw.alert) : '';
  st.note = raw.note ? String(raw.note) : '';
  return st;
}
const unitOf = (st, n) => Array.isArray(st.unit) ? plural(n || 0, ...st.unit) : st.unit;
const plankUnitOf = (st, n) => Array.isArray(st.plankUnit) ? plural(n || 0, ...st.plankUnit) : st.plankUnit;
/* путь к ближайшей планке: от прошлой планки до неё, в процентах */
function pctTo(st) {
  const nx = st.next; if (!nx) return 100;
  const prev = st.planks.filter(p => p.need < nx.need).reduce((a, p) => Math.max(a, p.need), 0), span = nx.need - prev;
  return span > 0 ? Math.max(0, Math.min(100, Math.floor((st.have - prev) * 100 / span))) : 0;
}
/* сундуки выплаты: «2 × Сундук осколков · обычный, …»; лучшая редкость — цвет */
const payName = (box, pay) => pay.map(g => `${g.count > 1 ? g.count + ' × ' : ''}${LBX.boxes[box] ? lbBoxName(box, g.r, g.win) : 'Сундук'}`).join(', ');
const payTop = pay => pay.reduce((a, g) => Math.max(a, g.r), 0);
const payCount = pay => pay.reduce((a, g) => a + g.count, 0);
/* выплаты одной строкой: одинаковые сундуки — вместе */
const mergePay = pay => { const by = new Map(); pay.forEach(g => { const k = g.r + ':' + g.win, x = by.get(k); if (x) x.count += g.count; else by.set(k, { r: g.r, win: g.win, count: g.count }); }); return [...by.values()].sort((a, b) => b.r - a.r); };
const chestTok = (box, pay, lead) => pay.length ? `<span class="well itf wk-chest" data-r="${payTop(pay)}" style="--s:${WK.view.chest}px" title="${trEsc((lead ? lead + ' · ' : '') + payName(box, pay))}">${chestPic(box, payTop(pay))}</span>` : '';
const allGroups = rs => rs.reduce((a, r) => a.concat(r.groups), []);
const crystals = groups => { const by = {}; groups.forEach(g => { by[g.r] = (by[g.r] || 0) + g.count; }); return Object.keys(by).map(Number).sort((a, b) => b - a).map(r => `<span class="wk-cr" data-r="${r}" title="${RAR[r]}">${ICON('r' + r, WK.view.crystal, RAR[r])}<b class="num">×${fmt(by[r])}</b></span>`).join(''); };
const placeTxt = p => p ? '#' + fmt(p) : '—';

/* ================== демо режимов: пока их экраны не сообщают итоги сами ================== */
const LM = id => LBX.modes[id] || null;
const cyc = () => S.acc.cycle;
const who = () => (typeof ZP_DEMO !== 'undefined' && ZP_DEMO.gifts && ZP_DEMO.gifts.who) || 'free';
const closed = id => { const M = LM(id); return M && cyc() < M.from ? `рейтинг — с цикла ${ROMAN[M.from]}` : ''; };
const rankPlace = n => { const r = (S.ranks || []).find(x => x[0] === n); return r && Number.isInteger(r[1]) ? r[1] : null; };
const lastNeed = pk => pk.length ? pk[pk.length - 1].need : 0;
/* пороги личных планок — из данных режима: контракты — список порогов цикла (EN_CONTRACTS.planks), Арена и Лига — первая планка
   (EN_ARENA.arena.plank, .league.plank), дальше × x строки планки EN_LOOTBOXES. Нет данных — нет планок */
const firstX = kind => { const A = window.EN_ARENA && EN_ARENA[kind]; return A && Number.isInteger(A.plank) ? A.plank : 0; };
const NEEDS = {
  contract: (ly, c) => { const P = (window.EN_CONTRACTS && EN_CONTRACTS.planks && EN_CONTRACTS.planks[c]) || []; return ly.rows.map((_, i) => P[i]).filter(Number.isInteger); },
  arena: ly => firstX('arena') ? ly.rows.map(r => firstX('arena') * r.x) : [],
  league: ly => firstX('league') ? ly.rows.map(r => firstX('league') * r.x) : [],
};
/* личные планки режима: порог из данных, сундуки — строка своего цикла */
function plankRows(id, have) {
  const M = LM(id), ly = M ? M.layers.find(l => l.kind === 'plank' && !l.clan) : null, c = cyc();
  return ly && NEEDS[id] ? NEEDS[id](ly, c).map((need, i) => ({ k: i + 1, need, pay: ly.rows[i].cyc[c] || [], reached: have >= need })) : [];
}
/* место → выплата за место, если неделя кончится сейчас: наименьший «топ-N», куда место входит; у клана вне топа — «все с очками» */
function tierOf(id, place, clan) {
  const M = LM(id), ly = M ? M.layers.find(l => l.kind === 'place' && !!l.clan === !!clan) : null, c = cyc();
  if (!ly || !place) return null;
  const row = ly.rows.filter(r => r.top && place <= r.top).sort((a, b) => a.top - b.top)[0] || ly.rows.find(r => r.top === 0);
  return row ? { label: row.label, one: ly.one, pay: row.cyc[c] || [], clan: !!clan } : null;
}
/* лидеры: имена — по кругу со сдвигом режима, прошлая неделя — со своим сдвигом */
function namesFor(id, t, list) {
  const i = Math.max(0, WK.modes.findIndex(x => x[0] === id)), L = list || WK.names, s = i + i + (t === 'past' ? 1 : 0);
  return WK.topBp[t].map((_, j) => L[(s + j) % L.length]);
}
const topRel = (id, t, scale) => scale ? namesFor(id, t).map((n, j) => [n, Math.floor(scale * WK.topBp[t][j] / WK.bp)]) : [];
const topAbs = (id, t, vals, list) => { const N = namesFor(id, t, list); return (vals || []).map((v, j) => [N[j], v]); };
/* прошлая неделя по «Дарам»: строки выплат прошлой недели этого режима (bag.js), без «Даров» — типичная неделя lootboxes.js */
const prevRows = id => typeof darRows === 'function' && S.zp ? darRows(S, 'prev').filter(p => p.id === id) : [];
const pastRewards = id => prevRows(id).map(p => ({ label: p.label, box: p.box, groups: p.groups.map(g => ({ r: g.r, count: g.count, win: g.win })), st: p.st, cat: p.cat, kind: p.kind }));
function pastPlanks(id) {
  const rows = prevRows(id); if (rows.length) return rows.filter(p => p.kind === 'plank').length;
  const M = LM(id), t = M && M.typical ? M.typical[who()] || {} : {};
  return Number.isInteger(t.me) ? t.me : 0;
}
const pastPlace = id => { const p = prevRows(id).find(x => x.kind === 'place' && x.place); return p ? p.place : WK.past.place[id] || null; };
/* очки прошлой недели: порог взятой планки и доля пути к следующей; все взяты — та же доля сверх последней */
function pastPts(needs, k, frac) {
  if (!needs.length) return 0;
  const lo = k > 0 ? needs[Math.min(k, needs.length) - 1] : 0, hi = k < needs.length ? needs[k] : lo + lo;
  return lo + Math.floor((hi - lo) * frac / WK.bp);
}
const enOf = place => { const r = WK.arenaEnerium.find(([top]) => place <= top); return r ? r[1] : 0; };
const echoPlanks = () => { const E = window.EN_ECHO; if (!E) return []; E.sync(); return E.planks().map(p => ({ k: p.k, need: p.need, pay: p.pay, reached: p.reached })); };
const eventPlanks = () => typeof evPlanks === 'function' ? evPlanks().map(p => ({ k: p.k, need: p.need, pay: p.pay, reached: p.got })) : [];
/* демо-строка: id, имя, единица очков и два ответа */
function demo(id, n, unit, now, past) {
  const d = WK.modes.find(x => x[0] === id) || [id, 0, WK.rituals[0], id];
  REG.push({ id, n, icon: d[2], go: d[3], order: d[1], unit, demo: true, now, past });
}
demo('echo', 'Эхо', ['очко', 'очка', 'очков'],
  () => {
    const lock = closed('echo'); if (lock || !window.EN_ECHO) return { lock: lock || 'нет данных' };
    const pk = echoPlanks(), pts = S.echo.score, place = pts ? S.echo.place : null;
    return { place, points: pts, planks: pk, top: topRel('echo', 'now', lastNeed(pk)), tier: tierOf('echo', place) };
  },
  () => {
    const lock = closed('echo'); if (lock || !window.EN_ECHO) return { lock: lock || 'нет данных' };
    const needs = echoPlanks().map(p => p.need);
    return { place: pastPlace('echo'), points: pastPts(needs, pastPlanks('echo'), WK.past.frac.echo), top: topRel('echo', 'past', needs[needs.length - 1]), rewards: pastRewards('echo') };
  });
demo('event', 'Событие', ['очко', 'очка', 'очков'],
  () => {
    const lock = closed('event'); if (lock) return { lock };
    const pk = eventPlanks(), place = rankPlace('Событие');
    return { place, points: S.event.pts, planks: pk, top: topRel('event', 'now', lastNeed(pk)), tier: tierOf('event', place) };
  },
  () => {
    const lock = closed('event'); if (lock) return { lock };
    const needs = eventPlanks().map(p => p.need);
    return { place: pastPlace('event'), points: pastPts(needs, pastPlanks('event'), WK.past.frac.event), top: topRel('event', 'past', needs[needs.length - 1]), rewards: pastRewards('event') };
  });
demo('contract', 'Контракты', ['очко', 'очка', 'очков'],
  () => {
    const lock = closed('contract'); if (lock) return { lock };
    const pts = WK.now.contract.points, pk = plankRows('contract', pts), place = rankPlace('Контракты');
    return { place, points: pts, planks: pk, top: topRel('contract', 'now', lastNeed(pk)), tier: tierOf('contract', place), alert: S.contracts.day.signed ? '' : 'Дневной контракт не подписан' };
  },
  () => {
    const lock = closed('contract'); if (lock) return { lock };
    const needs = plankRows('contract', 0).map(p => p.need);
    return { place: pastPlace('contract'), points: pastPts(needs, pastPlanks('contract'), WK.past.frac.contract), top: topRel('contract', 'past', needs[needs.length - 1]),
      rewards: pastRewards('contract'), cur: WK.past.contract.cur.map(x => x.slice()) };
  });
/* Клановый босс (§25.3): планок нет — место клана и очки клана; личный вклад — в листе, лидеры — кланы */
const CLAN_T = { placeLabel: 'место клана', meTag: 'ваш клан', topLabel: 'Кланы-лидеры' };
demo('clan', 'Клановый босс', ['очко', 'очка', 'очков'],
  () => {
    const lock = closed('clan'); if (lock) return { lock };
    const D = WK.now.clan, place = rankPlace('Клановый босс');
    return Object.assign({ place, points: D.points, mine: D.mine, me: S.clan.n, top: topAbs('clan', 'now', D.top, WK.clans), tier: tierOf('clan', place, true) }, CLAN_T);
  },
  () => {
    const lock = closed('clan'); if (lock) return { lock };
    const D = WK.past.clan;
    return Object.assign({ place: pastPlace('clan'), points: D.points, mine: D.mine, me: S.clan.n, top: topAbs('clan', 'past', D.top, WK.clans), rewards: pastRewards('clan') }, CLAN_T);
  });
demo('arena', 'Арена', 'рейтинг',
  () => {
    const lock = closed('arena'); if (lock) return { lock };
    const w = WK.now.arena.wins, place = rankPlace('Арена');
    return { place, points: S.arena.rating, have: w, planks: plankRows('arena', w), plankUnit: ['победа', 'победы', 'побед'], top: topAbs('arena', 'now', WK.now.arena.top), tier: tierOf('arena', place) };
  },
  () => {
    const lock = closed('arena'); if (lock) return { lock };
    const D = WK.past.arena, days = D.days.map(enOf), en = days.reduce((a, x) => a + x, 0);
    return { place: pastPlace('arena'), points: D.rating, top: topAbs('arena', 'past', D.top), rewards: pastRewards('arena'), cur: en ? [['enerium', en]] : [],
      note: `Энериум — за места на ежедневных срезах: в топ-100 — ${days.filter(Boolean).length} ${plural(days.filter(Boolean).length, 'день', 'дня', 'дней')} из ${days.length}` };
  });
demo('league', 'Лига', 'рейтинг',
  () => {
    const lock = closed('league'); if (lock) return { lock };
    if (S.heroes.length < WK.leagueHeroes) return { lock: `нужно ${WK.leagueHeroes} героев` };
    const D = WK.now.league;
    return { place: null, points: D.rating, have: D.wins, planks: plankRows('league', D.wins), plankUnit: ['победа', 'победы', 'побед'], top: topAbs('league', 'now', D.top) };
  },
  () => {
    const lock = closed('league'); if (lock) return { lock };
    const D = WK.past.league;
    return { place: pastPlace('league'), points: D.rating, top: topAbs('league', 'past', D.top), rewards: pastRewards('league') };
  });

/* ================== «Дары» ================== */
/* кнопка «Дары»: доступные сундуки и число подтверждённых выплат — так же, как пишет bag.js */
function giftsBtn() {
  const has = typeof darRows === 'function' && typeof darCount === 'function' && S.zp;
  const ok = has ? darRows(S).filter(p => p.st === 'ok') : [], n = has ? darCount(ok) : 0;
  const small = has ? `${fmt(n)} ${plural(n, 'сундук', 'сундука', 'сундуков')}` : 'итоги недель';
  return `<button class="gifts" data-a="sheet" data-v="gifts">${chestPic('wander', typeof ZP_VIEW !== 'undefined' ? ZP_VIEW.giftR : 4)}<span><b>Дары</b><small>${small}</small></span>${ok.length ? `<span class="bdg">${ok.length}</span>` : ''}</button>`;
}

/* ================== экран ================== */
const TIMES = [['past', 'Прошлая'], ['now', 'Эта неделя'], ['next', 'Следующая']];
const seg = () => { const v = S.seg.week; return TIMES.some(([k]) => k === v) ? v : 'now'; };
const pic = m => typeof m.icon === 'number' ? `<img src="${PATH(m.icon)}" alt="">` : m.icon ? ICON(m.icon, 40, '') : '';
/* «Войти» — явный переход в режим: дверь и слово, цвет действия. «›» — сведения, это другое */
const ENTER = 'Войти';
const goBtn = m => `<button class="wk-go" data-a="go" data-v="${m.go}" aria-label="${ENTER} в «${m.n}»" title="${ENTER} в «${m.n}»">${ic('door')}<small>${ENTER}</small></button>`;
/* строка режима. Эта неделя: значок, имя, полоса до ближайшей планки и её сундук; справа место и очки. Строка со «›» — сведения
   (лист), «Войти» — в режим. Прошлая: вместо полосы — лучший сундук недели и где он, «Войти» нет. Два числа, два чипа, строка
   и одно действие (правила воздуха) */
function rowHtml(st) {
  const m = st.m, now = st.t === 'now', lock = st.lock;
  let sub = '';
  if (lock) sub = `<span class="wk-why">${ic('lock')}${lock}</span>`;
  else if (now && st.next) sub = `${bar(pctTo(st))}${chestTok(st.box, st.next.pay || [], `Планка ${st.next.k || ''}`.trim())}`;
  else if (now && st.planks.length) sub = `${bar(100, 'sp')}<span class="wk-why">${ic('check')}все планки</span>`;
  else if (now && st.tier) sub = `<span class="wk-why">${st.placeLabel}</span>${chestTok(st.box, st.tier.pay, st.tier.label)}`;
  else if (!now) {
    const g = mergePay(allGroups(st.rewards)), n = payCount(g), wait = st.rewards.some(r => r.st === 'ok'), got = st.rewards.length && st.rewards.every(r => r.st === 'got');
    sub = n ? `${chestTok(st.box, g, `${fmt(n)} ${plural(n, 'сундук', 'сундука', 'сундуков')}`)}<span class="wk-why ${wait ? 'wait' : ''}">${wait ? 'ждёт в «Дарах»' : got ? 'получено' : 'подсчитано'}</span>` : `<span class="wk-why">без наград</span>`;
  } else sub = `<span class="wk-why">${st.note || 'без планок'}</span>`;
  const nums = lock ? '' : `<span class="wk-nums"><b title="${cap1(st.placeLabel)}">${placeTxt(st.place)}</b><span><b>${st.points != null ? fmt(st.points) : '—'}</b> <small>${unitOf(st, st.points)}</small></span></span>`;
  const label = `${m.n}: ${lock || `${st.place ? 'место ' + st.place : 'без места'}, ${st.points != null ? st.points : 0} ${unitOf(st, st.points)}`} — сведения`;
  return `<div class="wk-row ${lock ? 'lock' : ''}" data-mode="${m.id}">
    <button class="wk-main" data-a="sheet" data-v="wkmode:${m.id}:${st.t}" aria-label="${trEsc(label)}" title="Сведения"><span class="wk-pic">${pic(m)}${now && st.alert ? `<span class="dot" title="${trEsc(st.alert)}"></span>` : ''}</span>
      <span class="wk-tx"><b>${m.n}</b><span class="wk-sub">${sub}</span></span>${nums}<span class="wk-more" aria-hidden="true">${ic('chev')}</span></button>
    ${now && m.go ? goBtn(m) : ''}
  </div>`;
}
/* ритуалы — не рейтинговый режим: одна строка под режимами, с готовыми наградами */
function ritHtml() {
  const R = S.rituals.slots, ready = R.filter(s => s.st === 'ready').length, run = R.filter(s => s.st === 'run').length, free = R.filter(s => s.st === 'free').length;
  const txt = [ready ? `готово: ${ready}` : '', run ? `идёт: ${run}` : '', !ready && !run ? `свободно слотов: ${free}` : ''].filter(Boolean).join(' · ');
  return `<button class="wk-rit${ready ? ' hot' : ''}" data-a="go" data-v="${WK.rituals[1]}" aria-label="${ENTER} в «Ритуалы»: ${txt}"><img src="${PATH(WK.rituals[0])}" alt=""><b>Ритуалы</b><span class="wk-why">${txt}</span><span class="wk-enter">${ic('door')}${ENTER}</span></button>`;
}
function nowHtml() {
  const W = weeks().cur, L = leftS(), rows = modes().map(m => stateOf(m, 'now'));
  const id = typeof OV.echweek === 'function'
    ? `<button class="wk-id" data-a="sheet" data-v="echweek" aria-label="Неделя ${W.gen}: ${trEsc(W.civ)} — отряд, награды, история"><b>Неделя ${W.gen}</b><small>${W.civ}${ic('chev')}</small></button>`
    : `<div class="wk-id"><b>Неделя ${W.gen}</b><small>${W.civ}</small></div>`;
  const clock = `<button class="wk-clock" data-a="sheet" data-v="wkclock" aria-label="Сроки недели"><span class="eyebrow">${L ? 'До отсечки' : 'Подсчёт'}</span><b class="num"${L ? ' data-cd="week"' : ''}>${L ? dur(L) : 'итоги скоро'}</b></button>`;
  const cy = S.acc.cycle >= 2 ? `<span class="chip wk-cyc" title="Места недели — среди игроков вашего цикла">${ic('flag')}Рейтинг цикла ${ROMAN[S.acc.cycle]}</span>` : '';
  return `<div class="pnl wk-top">${id}${cy}${clock}${giftsBtn()}</div>
    <div class="wk-list">${rows.map(rowHtml).join('')}</div>
    ${ritHtml()}`;
}
/* итог прошлой недели: сундуки — все выплаты режимов, Энериум — Арена и контракты; валюты и разбивка — лист */
function pastSum(rows) {
  const g = rows.reduce((a, st) => a.concat(allGroups(st.rewards)), []), cur = {};
  rows.forEach(st => st.cur.forEach(([k, n]) => { cur[k] = (cur[k] || 0) + n; }));
  return { groups: g, chests: payCount(g), cur, wait: rows.reduce((a, st) => a + st.rewards.filter(r => r.st === 'ok').reduce((b, r) => b + payCount(r.groups), 0), 0) };
}
function pastHtml() {
  const W = weeks().prev, rows = modes().map(m => stateOf(m, 'past')), T = pastSum(rows), en = T.cur.enerium || 0;
  const sum = `<button class="wk-sum" data-a="sheet" data-v="wkpast" aria-label="Награды недели ${W.gen}: подробно">
      <span class="wk-kv"><img src="${CHEST}" alt=""><span class="col"><b class="num">${fmt(T.chests)}</b><small>${plural(T.chests, 'сундук', 'сундука', 'сундуков')}</small></span></span>
      <span class="wk-kv"><img src="${curImg('enerium')}" alt=""><span class="col"><b class="num">${fmt(en)}</b><small>Энериума</small></span></span></button>`;
  const dar = `<button class="btn sm wk-dar" data-a="sheet" data-v="gifts:me" aria-label="Дары путешествия${T.wait ? `: ждут ${T.wait}` : ''}">Дары${T.wait ? `<span class="bdg" title="Ждут в «Дарах»">${fmt(T.wait)}</span>` : ''}${ic('chev')}</button>`;
  return `<div class="pnl wk-top"><div class="wk-id"><b>Неделя ${W.gen}</b><small>${W.civ} · итог подсчитан</small></div>${sum}${dar}</div>
    <div class="wk-list">${rows.map(rowHtml).join('')}</div>
    ${demoNote(rows)}`;
}
/* команде: какие строки — демо Недели, какие сообщает экран режима */
function demoNote(rows) {
  const d = rows.filter(st => st.m.demo).map(st => st.m.n);
  return TM(d.length ? `Демо Недели — ${d.join(', ')}: места и выплаты — строки «Даров» (bag.js), очки — от взятой планки, лидеры и Энериум — WK в screens/week.js. Остальные строки сообщают экраны режимов через WEEK_MODES.` : 'Все строки сообщают экраны режимов через WEEK_MODES.', 'p', 'reason');
}
/* лица героев Эхо недели: открытые к циклу, в коллекции — портрет с отметкой; собираемый — осколок-стекло с его лицом
   (shardGhost, screens/art-icons.js): доля собранного — светом кромки */
function faceHtml(h, c) {
  const on = h.c <= c, own = rsHas(h), n = S.rs.shards[h.id] || 0, need = RS.rules.stub.shards;
  const tip = `${trEsc(h.n)}${on ? (own ? ' · в коллекции' : ` · осколков ${n} из ${need}`) : ' · с цикла ' + ROMAN[h.c]}`;
  if (on && !own && typeof shardGhost === 'function') return `<span class="wk-face glass" data-r="${h.r}" title="${tip}">${shardGhost(h, n, need, 60)}</span>`;
  return `<span class="wk-face ${on ? '' : 'lock'}" data-r="${h.r}" title="${tip}">${rsFace(h)}${own ? `<span class="wk-own">${ic('check')}</span>` : on ? `<i style="--v:${Math.min(100, Math.floor(n * 100 / need))}"></i>` : ''}</span>`;
}
/* стихии нашествия: сколько врагов лестницы каждой стихии, по убыванию */
function elCounts(civ) {
  const by = {}; (civ ? civ.foes : []).forEach(f => { by[f[1]] = (by[f[1]] || 0) + 1; });
  return Object.entries(by).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
}
function nextHtml() {
  const W = weeks().next, c = S.acc.cycle, civ = civOf(W.race), squad = W.squad.map(id => RSI[id]).filter(Boolean), av = squad.find(h => h.avers && h.avers.race);
  const els = elCounts(civ).slice(0, WK.view.els);
  return `<div class="pnl wk-top"><div class="wk-id"><b>Неделя ${W.gen}</b><small>${W.civ}</small></div>
      <div class="wk-clock"><span class="eyebrow">Начнётся через</span><b class="num">${dur(startIn())}</b></div></div>
    <div class="wk-next">
      <button class="pnl wk-card" data-a="sheet" data-v="wknext" aria-label="Герои Эхо недели ${W.gen}">
        <span class="eyebrow">Герои Эхо недели</span>
        <span class="wk-faces">${squad.map(h => faceHtml(h, c)).join('')}</span>
        ${av ? `<b class="wk-big">${rsAversShort(av)}</b>` : ''}
        <small class="wk-why">отряд, что отбил нашествие, — в Эхо и у Кланового босса</small>
      </button>
      <div class="pnl wk-card">
        <span class="eyebrow">Нашествие «${W.raid}»</span>
        ${civ ? foldLore(civ.look) : ''}
        <span class="wk-els">${els.map(([e]) => el(e)).join('')}</span>
        <small class="wk-why">стихии врагов нашествия — чаще всего</small>
      </div>
    </div>
    <p class="reason wk-tip">Готовьте героев с неприязнью к расе «${W.race}» и отряд под стихии нашествия. Лестница Эхо, очки и места начнутся заново.</p>`;
}
SCREENS.week = function () {
  const t = seg();
  const html = t === 'past' ? pastHtml() : t === 'next' ? nextHtml() : nowHtml();
  return { title: 'Неделя', seg: { key: 'week', items: TIMES }, html: `<section class="scr wk wk-${t}">${html}</section>` };
};

/* ================== листы ================== */
function statsHtml(st) {
  const cells = [[placeTxt(st.place), st.placeLabel], [st.points != null ? fmt(st.points) : '—', unitOf(st, st.points)]]
    .concat(st.mine != null ? [[fmt(st.mine), 'ваш вклад']] : []);
  return `<div class="row wk-stats">${cells.map(([v, s]) => `<div class="stat"><b class="num">${v}</b><small>${s}</small></div>`).join('')}</div>`;
}
function boardHtml(st) {
  const B = st.board; if (!B.rows.length && !B.me) return '';
  const row = r => `<div class="rkrow ${r.me ? 'me' : ''}"><b class="serif">${fmt(r.place)}</b><span>${trEsc(r.n)}</span><span class="num">${fmt(r.v)}</span>${r.me ? `<span class="chip spirit">${st.meTag}</span>` : '<span></span>'}</div>`;
  return `<span class="eyebrow">${st.topLabel}</span>
    <div class="wk-board">${B.rows.map(row).join('')}${B.gap ? '<div class="wk-gap" aria-hidden="true">···</div>' : ''}${B.me ? row(B.me) : ''}</div>`;
}
function planksHtml(st) {
  if (!st.planks.length) return '';
  const got = st.planks.filter(p => p.reached).length;
  const rows = st.planks.map(p => { const nx = st.next && p.need === st.next.need && !p.reached;
    return `<div class="wk-pk ${p.reached ? 'got' : nx ? 'next' : ''}"><b class="num">${fmt(p.need)}</b><span title="${trEsc(payName(st.box, p.pay))}">${payName(st.box, p.pay) || '—'}</span>${p.reached ? `<span class="chip spirit">${ic('check')}взята</span>` : nx ? `<span class="faint num">ещё ${fmt(p.need - st.have)}</span>` : '<span></span>'}</div>`; }).join('');
  const by = st.plankUnit !== st.unit ? ' ' + plankUnitOf(st, 0) : '';   // планки не по очкам — по победам
  return `<span class="eyebrow">Планки${by} · ${got} из ${st.planks.length}</span><div class="wk-pks">${rows}</div>`;
}
const tierHtml = st => st.tier ? `<p class="rs-line wk-tier">${chestTok(st.box, st.tier.pay, st.tier.label)}<span>Если неделя закончится сейчас: ${(st.tier.one || st.placeLabel).toLowerCase()} — ${st.tier.label}${st.tier.pay.length ? ', ' + payName(st.box, st.tier.pay) : ''}.</span></p>` : '';
const ST_T = { got: 'получено', ok: 'в «Дарах»', wait: 'ждёт подсчёта' };
function rewardsHtml(st) {
  const rows = st.rewards.map(r => `<div class="wk-rw"><span class="well itf" data-r="${payTop(r.groups)}" style="--s:28px">${chestPic(r.box || st.box, payTop(r.groups))}</span><span class="wk-rwt"><b>${trEsc(r.label)}${r.cat === 'clan' ? ' · клан' : ''}</b><small>${trEsc(payName(r.box || st.box, r.groups))}</small></span><span class="chip ${r.st === 'ok' ? 'warn' : ''}">${ST_T[r.st] || r.st}</span></div>`).join('');
  const cur = st.cur.length ? `<div class="wk-cur">${st.cur.map(([k, n]) => money(k, n)).join('')}</div>` : '';
  const N = payCount(allGroups(st.rewards));
  return `<span class="eyebrow">Награды · ${fmt(N)} ${plural(N, 'сундук', 'сундука', 'сундуков')}</span>${rows ? `<div class="wk-rws">${rows}</div>` : '<p class="faint">Сундуков нет.</p>'}${cur}${st.note ? `<p class="reason">${st.note}</p>` : ''}`;
}
Object.assign(OV, {
  /* режим на эту или прошлую неделю: место и очки, планки или награды, лидеры; одно действие — в режим или в «Дары» */
  wkmode(o) {
    const [id, t0] = String(o.arg || '').split(':'), m = modeOf(id); if (!m) return '';
    const t = t0 === 'past' ? 'past' : 'now', W = weeks(), st = stateOf(m, t);
    const title = `${m.n} · ${t === 'now' ? 'эта неделя' : 'неделя ' + W.prev.gen}`;
    const team = TM(m.demo ? 'Демо Недели: состояние — S и данные экранов, недостающее — WK в screens/week.js. Настоящий экран режима заменит строку через WEEK_MODES.' : 'Данные режима — WEEK_MODES.', 'p', 'reason');
    const body = st.lock ? `<p class="rs-line">${ic('lock')}${cap1(st.lock)}.</p>${team}`
      : `${statsHtml(st)}${t === 'now' ? planksHtml(st) + tierHtml(st) : rewardsHtml(st)}${boardHtml(st)}${team}`;
    const cat = st.rewards.some(r => r.cat === 'me') || !st.rewards.length ? 'me' : 'clan';
    const foot = t === 'now' ? (m.go ? `<button class="btn go" data-a="go" data-v="${m.go}">${ic('door')}${ENTER} в «${m.n}»</button>` : '')
      : `<button class="btn" data-a="sheet" data-v="gifts:${cat}">Дары ${ic('chev')}</button>`;
    return sheet(title, body, foot);
  },
  /* итог прошлой недели: сундуки по редкостям, Энериум и валюты, разбивка по режимам */
  wkpast() {
    const W = weeks().prev, rows = modes().map(m => stateOf(m, 'past')), T = pastSum(rows);
    const cur = Object.entries(T.cur).filter(([k, n]) => CUR[k] && n > 0);
    const list = rows.map(st => { const g = allGroups(st.rewards); return `<button class="wk-rw wk-rwb" data-a="sheet" data-v="wkmode:${st.m.id}:past"><span class="wk-pic sm">${pic(st.m)}</span><span class="wk-rwt"><b>${st.m.n}</b><small>${st.lock || (g.length ? `${fmt(payCount(g))} ${plural(payCount(g), 'сундук', 'сундука', 'сундуков')}` : 'без сундуков')}${st.cur.length ? ' · ' + st.cur.map(([k, n]) => `${CUR[k].n} ${fmt(n)}`).join(', ') : ''}</small></span><span class="wk-crs">${crystals(g)}</span></button>`; }).join('');
    const body = `<div class="row wk-stats"><div class="stat"><b class="num">${fmt(T.chests)}</b><small>${plural(T.chests, 'сундук', 'сундука', 'сундуков')}</small></div>${T.wait ? `<div class="stat"><b class="num">${fmt(T.wait)}</b><small>ждут в «Дарах»</small></div>` : ''}</div>
      ${T.groups.length ? `<div class="wk-crs">${crystals(T.groups)}</div>` : ''}
      ${cur.length ? `<span class="eyebrow">Валюта</span><div class="wk-cur">${cur.map(([k, n]) => money(k, n)).join('')}</div>` : ''}
      <span class="eyebrow">По режимам</span><div class="wk-rws">${list}</div>
      <p class="reason">Сундуки получают в «Дарах» и открывают в запасах. Энериум Арены приходит каждый день, валюта контрактов — по исполнении.</p>`;
    return sheet(`Награды недели ${W.gen}`, body, `<button class="btn go" data-a="sheet" data-v="gifts:me">Дары ${ic('chev')}</button>`);
  },
  /* сроки недели (§1.1, §1.4): приём, отсечка, подсчёт и новая неделя — разные понятные состояния */
  wkclock() {
    const W = weeks(), L = leftS(), H = WK.hour, C = WK.clock;
    const cut = C.cutoffH === 1 ? 'за час' : `за ${C.cutoffH} ${plural(C.cutoffH, 'час', 'часа', 'часов')}`, cnt = C.countH === 1 ? 'один серверный час' : `${C.countH} ${plural(C.countH, 'серверный час', 'серверных часа', 'серверных часов')}`;
    const ph = [
      ['Приём результатов', L ? `ещё ${dur(L)}` : 'закрыт', 'очки, планки и места этой недели', !!L],
      ['Отсечка', L ? `через ${dur(L)}` : 'прошла', `приём закрывается ${cut} до подсчёта — одна на всю игру`, false],
      ['Подсчёт', `через ${dur(L + C.cutoffH * H)}`, `${cnt}: места, клановые награды, итоги — в «Дарах»`, !L],
      [`Неделя ${W.next.gen}`, `через ${dur(startIn())}`, 'лестница Эхо, очки и места — заново', false],
    ];
    const body = `<div class="wk-phs">${ph.map(([n, when, d, on]) => `<div class="wk-ph ${on ? 'now' : ''}"><i></i><span><b>${n}</b><small>${d}</small></span><span class="num">${when}</span></div>`).join('')}</div>
      <p class="reason">Эхо, контракты, Арена и Лига, Клановый босс и Событие закрываются вместе. Планки подтверждаются сразу, места — после подсчёта.</p>
      ${TM(`Сроки — WK.clock в screens/week.js: отсечка ${C.cutoffH} ч до подсчёта, подсчёт ${C.countH} ч. S.week.left — до отсечки.`, 'p', 'reason')}`;
    return sheet(`Сроки недели ${W.cur.gen}`, body);
  },
  /* следующая неделя: цивилизация, герои Эхо недели с неприязнью, стихии нашествия */
  wknext() {
    const W = weeks().next, c = S.acc.cycle, civ = civOf(W.race), squad = W.squad.map(id => RSI[id]).filter(Boolean), open = squad.filter(h => h.c <= c), av = squad.find(h => h.avers && h.avers.race);
    const rows = squad.map(h => { const on = h.c <= c; return rsRow(h, { act: 'rhero', dim: !on, sub: on ? h.cls : `с цикла ${ROMAN[h.c]}`, right: on ? rsShardTag(h) : ic('lock') }); }).join('');
    const els = elCounts(civ);
    const body = `<div class="col wk-civ"><b class="serif">${W.civ}</b>${civ ? foldLore(`Нашествие «${W.raid}». ${civ.raid} ${civ.look} Жила на Этериосе задолго до этеров.`) : ''}</div>
      <span class="eyebrow">Герои Эхо недели · открыто ${open.length} из ${squad.length}</span>
      <div class="rs-list">${rows}</div>
      ${av ? `<p class="rs-line">${ic('target')}Неприязнь: ${rsAversShort(av)}</p><p class="reason">Действует везде, где встречаются враги этой расы: в Эхо, у Кланового босса недели и в спуске.</p>` : ''}
      ${els.length ? `<span class="eyebrow">Стихии нашествия</span><div class="wk-els">${els.map(([e, n]) => `<span class="wk-el">${el(e)}<b class="num">×${n}</b></span>`).join('')}</div>` : ''}
      <p class="reason">Лестница Эхо, очки и места начнутся заново — через ${dur(startIn())}.</p>`;
    return sheet(`Неделя ${W.gen}`, body, '', true);
  },
});
/* «Рейтинг» с любого экрана — из того же реестра: эта неделя или прошлая, лидеры и я */
const rankBase = OV.rank;
OV.rank = function (o) {
  const m = modeByName(o.arg); if (!m) return typeof rankBase === 'function' ? rankBase(o) : '';
  const t = o.rt === 'past' ? 'past' : 'now', st = stateOf(m, t), W = weeks();
  /* рейтинг — своего цикла (слово автора 01.10.2026, ADR-0041): лидеры — игроки цикла таблицы; переход на этой неделе — прошлая неделя в таблице прошлого цикла */
  const rc = typeof cyRankCycle === 'function' ? cyRankCycle(t) : S.acc.cycle;
  if (st.topLabel === 'Лидеры') st.topLabel = `Лидеры цикла ${ROMAN[rc]}`;
  const tabs = `<div class="tabs" role="tablist" aria-label="Неделя">${[['now', 'Эта неделя'], ['past', 'Прошлая']].map(([k, l]) => `<button role="tab" aria-selected="${t === k}" data-a="wkrt" data-v="${k}">${l}</button>`).join('')}</div>`;
  const body = st.lock ? `${tabs}<p class="rs-line">${ic('lock')}${cap1(st.lock)}.</p>`
    : `${tabs}${statsHtml(st)}${boardHtml(st)}${t === 'now' ? tierHtml(st) : ''}<p class="reason">Места — среди игроков цикла ${ROMAN[rc]} · неделя ${t === 'now' ? W.cur.gen : W.prev.gen}. ${t === 'now' ? 'Места станут наградой после подсчёта.' : 'Итог подсчитан.'}</p>`;
  return sheet(`Рейтинг цикла ${ROMAN[rc]} · ${m.n}`, body, `<button class="link" data-a="sheet" data-v="wkmode:${m.id}:${t}">Подробнее ${ic('chev')}</button>`);
};

/* ================== действия ================== */
Object.assign(ACT, {
  /* вкладка листа «Рейтинг»: хранится в самом листе — новый лист открывается на этой неделе */
  wkrt(v) { if (S.overlay && S.overlay.t === 'rank') { S.overlay.rt = v === 'past' ? 'past' : 'now'; render(); } },
});

/* ================== состояние: сегмент недели ================== */
const initBase = initialState;
initialState = function () { const s = initBase(); s.seg.week = 'now'; return s; };
if (S.seg && !S.seg.week) S.seg.week = 'now';

/* ================== UI-кит: раздел «Неделя» ================== */
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({
  html: () => {
    const M = modes(), now = M.slice(0, 2).map(m => rowHtml(stateOf(m, 'now'))).join(''), past = M.slice(0, 2).map(m => rowHtml(stateOf(m, 'past'))).join('');
    const reg = M.map(m => `<li><b>${m.n}</b> · <code>${m.id}</code> — ${m.demo ? 'демо Недели' : 'экран режима'}</li>`).join('');
    return `<section class="k-box" style="grid-column:1/-1"><h3>Неделя · три времени</h3>
      <p class="k-note">Сегменты шапки: «Прошлая», «Эта неделя», «Следующая». Эта — раса и цивилизация Эхо, срок до отсечки, «Дары» и шесть режимов строкой; прошлая — итог: сундуки и Энериум, по режимам место и очки; следующая — раса, цивилизация, герои Эхо с неприязнью, стихии нашествия. Подробности, планки, лидеры и награды — листы.</p>
      <div class="k-demo wk-kit"><span class="eyebrow">Эта неделя</span><div class="wk-list">${now}</div><span class="eyebrow">Прошлая</span><div class="wk-list">${past}</div></div>
      <p class="k-note">Строка режима: значок, имя; место и очки — два числа; полоса до ближайшей планки и её сундук цвета редкости — на этой неделе, лучший сундук недели и «получено» или «ждёт в „Дарах“» — на прошлой. Нажатие на строку и её «›» — сведения, лист. Переход в режим — явная кнопка «Войти» с дверью справа в строке и в листе${TM(' — слово автора 29.09.2026: переход был неочевиден')}. У прошлой недели «Войти» нет.</p>
      <p class="k-note">Реестр итогов: <code>(window.WEEK_MODES = window.WEEK_MODES || []).push({ id, n, icon, go, order, unit, now: () =&gt; ({ place, points, planks, next, top }), past: () =&gt; ({ place, points, top, rewards, cur }) })</code>. Строка с тем же <code>id</code> заменяет демо. Договор — <code>design/ui/screens/README.md</code>.</p>
      <ul class="k-note wk-kreg">${reg}</ul></section>`;
  },
});

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Неделя · три времени', 'Эта неделя: раса и цивилизация Эхо, срок до отсечки, шесть режимов строкой — место, очки, полоса до планки', () => { S.route = 'week'; S.seg.week = 'now'; S.overlay = null; }],
  ['Неделя · итог прошлой', 'Сундуки и Энериум недели, по режимам место и очки; награды и лидеры — в листе, ссылка в «Дары»', () => { S.route = 'week'; S.seg.week = 'past'; S.overlay = { t: 'wkpast' }; }],
  ['Неделя · следующая', 'Раса и цивилизация, герои Эхо недели с неприязнью, стихии нашествия', () => { S.route = 'week'; S.seg.week = 'next'; S.overlay = null; }],
);

/* для автопроверки tools/content-gen/screens/check_week.js и консоли */
window.EN_WEEK = { data: WK, modes, state: (id, t) => { const m = modeOf(id); return m ? stateOf(m, t === 'past' ? 'past' : 'now') : null; }, weeks, board, pastSum: () => pastSum(modes().map(m => stateOf(m, 'past'))), enOf, startIn };
})();
