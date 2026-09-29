/* screens/arena.js — «Неделя → Арена»: Арена, Лига и Оборона (§20 GDD; ADR-0005, ADR-0010, ADR-0014, ADR-0026). Договор — screens/model.js.
   Регистрирует:
   — SCREENS.arena: вкладки «Арена», «Лига», «Оборона» (S.seg.arena: arena, league, def);
   — листы: OV.opp — витрина соперника, состав целиком; OV.arhero — герой соперника; OV.arset — подготовка атаки, он же OV.prep для
     режима отрядов pvp; OV.arres — итог боя Арены; OV.lgopp — матч Лиги: три отряда соперника против трёх своих; OV.lgres — итог матча;
     итоги — со статистикой в том же виде, что итог Эхо: главное на виду, «Подробности боя» свёрнуты — раунды, кто сколько нанёс,
     вылечил и принял, какие способности и ульты сработали; у Лиги — по каждому бою матча;
     OV.ardef — журнал обороны; OV.arrew — награды; OV.arrules — как устроено; OV.arpay — цена обновления списка;
   — режим отрядов pvp — «Атака Арены» (SQ_DATA.modes, screens/heroes.js): атакующий состав, как и оборона, героев не занимает;
   — действия ACT.ar*, ACT.lg*; итоги недели — в реестр WEEK_MODES (screens/week.js): Арена и Лига. «Дары» (screens/bag.js) не платят
     Лиге, пока она закрыта для аккаунта: причину даёт этот файл — ZP_DEMO.gifts.gate.league;
   — раздел UI-кита «Арена и Лига» (KIT_EXTRA), сценарии презентации.
   Своё состояние — S.arena (заводится как S.bag). Поля rating, att, max и opp — прежние: их читают профиль и проверки прототипа.
   Данные и алгоритм — EN_ARENA и EnArena (design/ui/arena.js, собирает tools/content-gen/arena/build.js). Черновик —
   docs/content/арена-и-лига.md.
   Сервер решает, клиент показывает: список, бой, рейтинг, попытки, обновление, сутки и сезон — операции AR_SRV с номером: номер несёт
   кнопка, повтор того же номера ничего не повторяет. Бой — ядро боя на сиде пары составов сезона, раундов — по таблице ядра
   (EB.roundsOf('pvp'), 25 на каждый бой Арены и Лиги): исход и статистика решены до показа, просмотр и «Пропустить» их не меняют
   (§20.1, §36.9). После каждого боя список соперников новый сам — в той же операции, на сиде списка (слово автора 29.09.2026);
   «Обновить» руками — бесплатные за сутки, дальше за Энериум. Служебное — только команде: TM, PL, tmT из index.html.
   Автопроверка — tools/content-gen/screens/check_arena.js. */
(function () {
'use strict';
const AD = window.EN_ARENA || null, AE = window.EnArena || null;

/* ================== данные экрана: демонстрация, не баланс ================== */
const AR_DEMO = {
  /* один календарь демо (ADR-0031, п. 17): 11-й день цикла II — вторая неделя цикла; сезон — неделя расы, идёт четвёртый день */
  season: 2, day: 4,
  /* Арена: рейтинг — на 88-м месте сервера середины недели (EN_ARENA.server.demo: сборщик берёт его из таблицы «рейтинг → место»
     прогона — сервер сдвигается с каждым прогоном, место остаётся), боёв всего, побед сезона — три планки */
  rating: null, games: 212, wins: 38,
  att: 20, listNo: 7, paid: 0, freeUsed: 0, // попыток сейчас, номер списка сезона, платных и бесплатных «Обновить» сегодня
  days: [131, 104, 96],                     // места на суточных срезах этого сезона: вчера и раньше
  /* журнал обороны до сегодняшнего входа: [соперник, исход атакующего в полуочках, сдвиг рейтинга, когда] — записи, без повтора боя.
     Два отбитых нападения — письмо «Оборона выстояла» во Входящих */
  log: [['a031', 0, 7, 'ночью'], ['a058', 0, 7, 'ночью'], ['a012', 2, -9, 'вчера']],
  /* прошлая неделя: итог рейтинга (null — на 95-м месте таблицы конца недели, EN_ARENA.server.demo), победы, места суточных срезов —
     Энериум; место недели — из «Даров» */
  past: { rating: null, wins: 44, place: 95, days: [95, 88, 102, 97, 91, 99, 95] },
  /* Лига открыта с 9-го дня цикла II: 15-й герой коллекции пришёл тогда (ADR-0031, п. 17). Три дня матчей — первая планка (две победы);
     прошлой недели у Лиги нет (past: null) */
  league: { rating: 1012, games: 6, wins: 3, att: 4, listNo: 4 },
  defPerDay: 3,                             // команда, «Новые сутки»: сколько нападений на оборону за ночь
  /* сценарий Лиги: коллекция до 15 героев — герои состава циклов I–II с наборами, уровни вокруг отряда демо; три отряда по пять */
  flow: { lvl: 150, spread: 8, names: ['Лига · I', 'Лига · II', 'Лига · III'], wins: 6, att: 6 },
};
/* вид */
const AR_VIEW = {
  near: 500,                                // «наравне» — мощь в пределах ±5 % от своей, б. п.: прогон ядра — +10 уровней ≈ +12 % мощи ≈ 85 % побед
  logRows: 4,                               // записей журнала на экране обороны, остальное — лист
  kit: { r: 1300, g: 99 },                  // UI-кит: пример итога — равные соперники с таким рейтингом и числом боёв
  abMax: 4,                                 // итог, «Подробности боя»: способностей в строке героя — не больше, остальное — «ещё N»
};

const BP = 10000, ROM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
if (!AD || !AE || !window.EnBattle || typeof SQ === 'undefined' || typeof HR_DATA === 'undefined' || typeof BM === 'undefined') {
  SCREENS.arena = () => ({ title: 'Арена', back: 'week', html: '<section class="scr"><div class="pnl pad"><p class="faint">Нет данных Арены.</p></div></section>' });
  return;
}

/* ================== режим отрядов «Атака Арены» ==================
   Атакующий состав выбирают тем же листом, что оборону и Лигу (OV.prep): у атаки свой сохранённый выбор. Как и оборона, он героев
   не занимает (§20.3, §36.10): встают и занятые */
if (typeof SQ_DATA !== 'undefined' && SQ_DATA.modes && !SQ_DATA.modes.pvp) {
  SQ_DATA.modes.pvp = { n: 'Атака Арены', t: 'Атака Арены', min: 5, exact: true, busy: 'allow',
    rule: 'Пятеро разных героев. Соперник видит оборону, а вы — его: выбирайте состав под него. Занятые тоже встают.' };
}

/* ================== помощники ================== */
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sgn = n => n > 0 ? '+' + fmt(n) : n < 0 ? '−' + fmt(-n) : '±0';
const pct1 = bp => { const t = Math.floor((bp + 5) / 10), f = t % 10; return `${(t - f) / 10}${f ? ',' + f : ''} %`; };
const M = kind => kind === 'league' ? AD.league : AD.arena;
const RSX = id => (typeof RSI !== 'undefined' && RSI[id]) || null;
const arOpen = (s = S) => s.acc.cycle >= AD.arena.from;
/* герои аккаунта: S.heroes и купленные — как hrMine (screens/heroes.js); на входе initialState глобального S ещё нет */
const poolN = s => s === S && SQ.pool ? SQ.pool().length : (s.heroes || []).length + Object.keys((s.rs && s.rs.owned) || {}).filter(id => !(s.heroes || []).some(h => h.id === id)).length;
const lgOpen = (s = S) => typeof leagueOpen === 'function' ? leagueOpen(s) : arOpen(s) && s.acc.cycle >= AD.league.from && poolN(s) >= AD.league.heroes;   // одно правило Лиги — index.html
const lgWhy = (s = S) => !arOpen(s) ? `рейтинг — с цикла ${ROM[AD.arena.from]}` : poolN(s) < AD.league.heroes ? `нужно ${AD.league.heroes} героев` : '';
/* прошлая неделя Лиги: её не было, если Лига открылась на этой — итога прошлой недели нет (past пишет только смена сезона) */
const lgPastWhy = (s = S) => lgWhy(s) || (s.arena && s.arena.lg && !s.arena.lg.past ? 'Лига открылась на этой неделе' : '');
const seasonId = (s, A) => `${s.acc.cycle}|${s.week.race}|${A.season}`;
const poolOf = (s, kind) => (kind === 'league' ? AD.pool.league : AD.pool.arena).filter(o => o.c === s.acc.cycle);
const oppById = (kind, id) => (kind === 'league' ? AD.pool.league : AD.pool.arena).find(o => o.id === id) || null;
const rtOf = (A, o) => A.rt[o.id] != null ? A.rt[o.id] : o.r;
const arPlace = r => AE.placeOf(AD.server.place, r);
const lgPlace = r => AE.placeOf(AD.server.leaguePlace, r);
const divOf = r => AD.league.divisions[AE.division(AD, r)];
const ids5 = f => f.map(x => x[0]);

/* герой соперника: герой состава с уровнем, пределом и доблестью соперника — в форме героя боя (как hrBuild, screens/heroes.js).
   id с приставкой: обёртки источника боя (талисманы, снаряжение) не найдут у него вещей аккаунта — витрина соперника правдива */
const OH = new Map();
function oppHero(x) {
  const k = x.join('|'); if (OH.has(k)) return OH.get(k);
  const h = RSX(x[0]); if (!h) return null;
  const core = hrCore(h), T = HR_DATA.st[core] || HR_DATA.st['Танк'];   // как hrBuild: образец класса героя состава
  const o = { id: 'arena:' + h.id, rid: h.id, name: h.n, cls: core, clsN: h.cls, el: h.sch, race: h.race, draft: hrDraft(h),
    r: h.r, cycle: h.c, img: hrImg(h), maxV: h.maxV, st: T[0].slice(), gr: T[1].slice(), ab: [], pas: [], ult: null, busy: null,
    lvl: x[1], lim: x[2], valor: x[3], cap: INV.hero.capByLim[Math.min(x[2], INV.hero.capByLim.length - 1)] };
  bmProp(o);   // мощь — та же BM.hero, что у своих героев: без вещей аккаунта (id с приставкой)
  OH.set(k, o); return o;
}
const oppFace = x => { const h = RSX(x[0]); return h ? `<span class="rs-av" data-r="${h.r}">${rsFace(h)}</span>` : '<i></i>'; };
const teamBm = f => f.reduce((a, x) => { const o = oppHero(x); return a + (o ? o.bm : 0); }, 0);
const oppBm = o => o.f ? teamBm(o.f) : o.t.reduce((a, f) => a + teamBm(f), 0);
/* вид героя соперника для плитки героя (hrTile, screens/heroes.js): уровень, предел, доблесть, мощь — его, а не аккаунта */
const oppView = o => ({ id: o.id, rid: o.rid, acc: null, rh: RSX(o.rid), own: true, n: o.name, face: RSX(o.rid) ? rsFace(RSX(o.rid)) : `<img src="${o.img}" alt="">`,
  r: o.r, cls: o.clsN || o.cls, ic: o.clsN || o.cls, el: o.el, race: o.race, c: o.cycle, lvl: o.lvl, cap: o.cap, lim: o.lim, valor: o.valor, maxV: o.maxV, bm: o.bm, busy: '' });
const oppTile = (o, val) => typeof hrTile === 'function' ? hrTile(oppView(o), { act: 'sheet', val, bm: true })
  : `<button class="hc" data-r="${o.r}" data-a="sheet" data-v="${val}">${oppFace([o.rid])}<span class="bot"><span class="nm">${esc(o.name)}</span></span></button>`;

/* свой отряд: выбранный пресет атаки (pvp), без выбора — оборона */
const mySquad = () => SQ.squad('pvp') || SQ.squad('arena') || S.squads[0];
const myFaces = s => s.m.map(id => { const v = id && SQ.hero(id); return v ? `<span class="rs-av" data-r="${v.r}">${v.face}</span>` : '<i></i>'; }).join('');
/* мощь для сравнения — одна функция §6 у обеих сторон (BM, index.html): свой отряд — со слоями талисманов и снаряжения, соперник — без вещей */
const cmpBm = s => s ? BM.squad(s.m) : 0;
/* оценка силы: мощь соперника против своей — сильнее, наравне, слабее */
function power(their, mine) {
  const d = mine ? Math.floor((their - mine) * BP / mine) : BP;
  return d > AR_VIEW.near ? ['сильнее', 'warn'] : d < -AR_VIEW.near ? ['слабее', 'spirit'] : ['наравне', ''];
}
/* планки побед режима: первая × x строк EN_LOOTBOXES, сундуки — строка своего цикла */
function planks(kind, have) {
  const L = window.EN_LOOTBOXES, ly = L && L.modes[kind] ? L.modes[kind].layers.find(l => l.kind === 'plank' && !l.clan) : null, c = S.acc.cycle;
  return ly ? ly.rows.map((row, i) => ({ k: i + 1, need: M(kind).plank * row.x, pay: row.cyc[c] || [], reached: have >= M(kind).plank * row.x })) : [];
}
/* выплата за место, если неделя кончится сейчас: наименьший «топ-N», куда место входит */
function tierOf(kind, place) {
  const L = window.EN_LOOTBOXES, ly = L && L.modes[kind] ? L.modes[kind].layers.find(l => l.kind === 'place' && !l.clan) : null;
  if (!ly || !place) return null;
  const row = ly.rows.filter(r => r.top && place <= r.top).sort((a, b) => a.top - b.top)[0];
  return row ? { label: row.label, one: ly.one, pay: row.cyc[S.acc.cycle] || [] } : null;
}
const chestName = (pay, box) => pay.map(g => `${g.count > 1 ? g.count + ' × ' : ''}${typeof lbBoxName === 'function' && window.EN_LOOTBOXES ? lbBoxName(box || 'equip', g.r, g.win) : 'Сундук'}`).join(', ');
const chestTok = (pay, tip) => pay.length ? `<span class="well ar-chest" data-r="${pay.reduce((a, g) => Math.max(a, g.r), 0)}" title="${esc(tip)}"><img src="${CHEST}" alt=""></span>` : '';

/* ================== состояние ==================
   S.arena: season, day — сезон и день; rating, games, wins — рейтинг Арены, боёв всего (K), побед сезона; att, max — попытки и их
   предел; opp — список соперников (id); listNo — номер списка сезона; freeUsed, paid — бесплатных и платных «Обновить» за сутки;
   hit — атакованные в сезоне; rt — рейтинг соперников после боёв; lost — поражений обороны за сутки; days — места суточных срезов
   сезона; log — журнал атак и обороны; past — прошлая неделя; lg — то же для Лиги;
   ops, seq — «сервер»: итоги операций по номерам; last — итог последней операции; pick — соперник в подготовке атаки;
   defAuto — оборона назначается из последней атаки, пока игрок не выбрал её сам (§20.3) */
/* новый список на сиде: номер списка сезона — часть сида; мимо атакованных и прежнего списка, не хватило новых — добор из прежних
   (EnArena.pickFresh). fresh — сколько новых лиц: ручное обновление без новых — отказ */
function freshFor(s, A, kind) {
  const P = poolOf(s, kind).map(o => ({ id: o.id, r: rtOf(A, o) }));
  return AE.pickFresh(M(kind), P, A.rating, AE.makeRng(AE.seedOf(`${kind}|список|${seasonId(s, A)}|${A.listNo}`)), Object.keys(A.hit), A.opp || []);
}
const listFor = (s, A, kind) => freshFor(s, A, kind).ids;
function syncRanks(s) {
  if (!s.ranks || !s.arena) return;
  const ra = s.ranks.find(x => x[0] === 'Арена'), rl = s.ranks.find(x => x[0] === 'Лига');
  if (ra) { ra[1] = arOpen(s) ? arPlace(s.arena.rating) : null; ra[2] = arOpen(s) ? 'сезон' : `с цикла ${ROM[AD.arena.from]}`; }
  if (rl) { const on = lgOpen(s); rl[1] = on ? lgPlace(s.arena.lg.rating) : null; rl[2] = on ? 'сезон' : lgWhy(s); }
}
function arState(s) {
  const D = AR_DEMO, G0 = D.league;
  const log = D.log.map(([oid, half, d, when]) => ({ k: 'def', oid, half, d, when, old: true }));
  const acct = AD.server.demo || {}, r0 = D.rating != null ? D.rating : acct.rating != null ? acct.rating : AD.elo.start;
  const pr0 = D.past.rating != null ? D.past.rating : acct.past != null ? acct.past : r0;
  const A = s.arena = { season: D.season, day: D.day, rating: r0, games: D.games, wins: D.wins, att: D.att, max: AD.arena.att.cap,
    opp: [], listNo: D.listNo, freeUsed: D.freeUsed, paid: D.paid, hit: {}, rt: {}, lost: 0, days: D.days.slice(), log,
    past: Object.assign({}, D.past, { rating: pr0, days: D.past.days.slice() }), defAuto: false, defSeen: null, last: null, pick: null, ops: {}, seq: 1,
    lg: { season: D.season, rating: G0.rating, games: G0.games, wins: G0.wins, att: G0.att, max: AD.league.att.cap, opp: [], listNo: G0.listNo,
      freeUsed: 0, paid: 0, hit: {}, rt: {}, lost: 0, log: [], past: null } };
  if (arOpen(s)) { A.opp = listFor(s, A, 'arena'); A.lg.opp = listFor(s, A.lg, 'league'); }
  if (s.sq && s.sq.sel && !s.sq.sel.pvp) s.sq.sel.pvp = s.sq.sel.arena || null;   // атака по умолчанию — тем же отрядом, что оборона
  syncRanks(s);
  return s;
}
const arInitBase = initialState;
initialState = function () { return arState(arInitBase()); };
arState(S);

/* оборона назначается из последней атаки, пока игрок не выбрал её сам: выбор листом обороны снимает автоназначение */
window.addEventListener('en-render', () => {
  const A = S.arena; if (!A || !A.defAuto) return;
  const cur = SQ.of('arena'); if (A.defSeen != null && cur !== A.defSeen) A.defAuto = false;
});

/* ================== «сервер» ==================
   Проверка и итог — одним вызовом. Номер операции несут кнопки: повтор того же номера возвращает прежний итог и ничего не меняет.
   Отказ номер не тратит. В игре операцию подтверждает сервер, сид и рейтинги соперников — тоже его */
const AR_WHY = { closed: `Арена откроется в цикле ${ROM[AD.arena.from]}`, cutoff: 'Приём боёв недели закрыт — итоги скоро', att: 'Попытки кончились. Новые придут завтра',
  gone: 'Этого соперника уже нет в списке', once: 'Этого соперника вы уже атаковали на этой неделе', squad: 'Отряд не готов', lock: 'Лига закрыта',
  limit: 'Обновлений на сегодня больше нет — список и так новый после каждого боя', money: 'Не хватает Энериума', free: 'Бесплатные обновления на сегодня кончились',
  empty: 'Новых соперников в окне подбора нет', op: 'Действие устарело' };
const AR_SRV = {
  run(op, f) {
    const A = S.arena, O = A.ops;
    if (!op) return { refuse: 'op' };
    if (O[op]) return Object.assign({ again: true }, O[op]);
    const r = f() || {};
    if (!r.refuse) { O[op] = r; A.seq++; }
    return r;
  },
  /* бой PvP ядром: свои — сторона героев, соперник — сторона врагов; сид — режим, сезон, раунд матча и пара составов. Раундов — по
     таблице ядра, одной на все режимы: Арена и Лига — EB.roundsOf('pvp'), 25 на каждый бой (слово автора 29.09.2026). Бой идёт до конца
     здесь же, со статистикой (EnArena.pvpRun): исход и статистика — из одного боя, итог и «Пропустить» показывают их, а не просмотр */
  fight(mode, mine, theirs, round, flip) {
    const A = S.arena, my = mine.map(id => EB.heroSrc(H(id))), th = theirs.map(x => EB.heroSrc(oppHero(x)));
    const kMine = AE.teamKey(mine), kTh = AE.teamKey(ids5(theirs)), season = seasonId(S, mode === 'лига' ? A.lg : A);
    const seed = flip ? AE.battleSeed(mode, season, round, kTh, kMine) : AE.battleSeed(mode, season, round, kMine, kTh);
    const rounds = EB.roundsOf('pvp');
    const out = AE.pvpRun(EB, flip ? AE.pvpBattle(EB, th, my, seed, rounds) : AE.pvpBattle(EB, my, th, seed, rounds));   // pvpBattle копирует источники — снимок ниже цел
    return { seed, rounds, res: out.res, st: out.st, mine: mine.slice(), theirs: theirs.map(x => x.slice()), flip: !!flip, a: my, b: th };
  },
  /* после боя список новый сам (refresh.auto): в той же операции, номер списка — следующий, сид — сезон и номер списка. Без auto —
     прежнее правило: атакованный выбывает, список кончился — новый */
  after(X, kind, oid) {
    X.opp = X.opp.filter(x => x !== oid);
    if (!M(kind).refresh.auto && X.opp.length) return false;
    X.listNo++; X.opp = listFor(S, X, kind);
    return true;
  },
  /* атака Арены: попытка, соперник из списка и один раз за сезон, готовый отряд; бой; рейтинг обеим сторонам (§20.5) */
  attack(op, oid, sid) {
    return AR_SRV.run(op, () => {
      const A = S.arena;
      if (!arOpen()) return { refuse: 'closed' };
      if (S.week.left <= 0) return { refuse: 'cutoff' };
      if (A.att <= 0) return { refuse: 'att' };
      if (A.hit[oid]) return { refuse: 'once' };
      if (!A.opp.includes(oid)) return { refuse: 'gone' };
      const r = SQ.ready('pvp', sid); if (!r.ok) return { refuse: 'squad', why: r.why };
      const o = oppById('arena', oid), F = AR_SRV.fight('арена', r.go, o.f, 0), rt0 = rtOf(A, o);
      const e = AE.attack(AD, { r: A.rating, g: A.games }, { r: rt0, g: o.g, lost: 0 }, F.res.half);
      const r0 = A.rating, p0 = arPlace(r0);
      A.rating += e.da; A.games++; A.att--; if (F.res.half === 2) A.wins++;
      A.rt[oid] = rt0 + e.dd; A.hit[oid] = A.seq;
      const fresh = AR_SRV.after(A, 'arena', oid);   // после боя — новые соперники
      if (A.defAuto) { SQ.set('arena', sid); A.defSeen = sid; }
      A.log.unshift({ k: 'atk', oid, half: F.res.half, d: e.da, when: 'сегодня', seed: F.seed });
      syncRanks(S);
      const L = { mode: 'arena', no: A.seq, oid, sid, name: o.n, fights: [F], half: F.res.half, e, r0, r1: A.rating, p0, p1: arPlace(A.rating), wins: A.wins, fresh, rt0 };
      A.last = L;
      return L;
    });
  },
  /* матч Лиги: три отряда по пять против трёх; раунды по порядку, третий — при равном счёте (§20.4) */
  match(op, oid) {
    return AR_SRV.run(op, () => {
      const A = S.arena, G = A.lg;
      if (!lgOpen()) return { refuse: 'lock' };
      if (S.week.left <= 0) return { refuse: 'cutoff' };
      if (G.att <= 0) return { refuse: 'att' };
      if (G.hit[oid]) return { refuse: 'once' };
      if (!G.opp.includes(oid)) return { refuse: 'gone' };
      const R0 = SQ.ready('league'); if (!R0.ok) return { refuse: 'squad', why: R0.why };
      const teams = SQ.ids('league'), o = oppById('league', oid), fights = [], halves = [];
      for (let k = 0; k < AD.league.teams && AE.leagueNext(halves); k++) { const F = AR_SRV.fight('лига', teams[k], o.t[k], k + 1); fights.push(F); halves.push(F.res.half); }
      const sc = AE.leagueScore(halves), rt0 = rtOf(G, o), e = AE.attack(AD, { r: G.rating, g: G.games }, { r: rt0, g: o.g, lost: 0 }, sc.half);
      const r0 = G.rating, p0 = lgPlace(r0);
      G.rating += e.da; G.games++; G.att--; if (sc.half === 2) G.wins++;
      G.rt[oid] = rt0 + e.dd; G.hit[oid] = A.seq;
      const fresh = AR_SRV.after(G, 'league', oid);   // после матча — новые соперники
      G.log.unshift({ k: 'atk', oid, half: sc.half, d: e.da, when: 'сегодня', score: [sc.my, sc.their] });
      syncRanks(S);
      const L = { mode: 'league', no: A.seq, oid, name: o.n, fights, half: sc.half, score: sc, e, r0, r1: G.rating, p0, p1: lgPlace(G.rating), wins: G.wins, rt0, fresh };
      A.last = L;
      return L;
    });
  },
  /* «Обновить» руками: бесплатные за сутки, дальше за Энериум по цене суток до лимита (EnArena.refreshCost). Цену решает сервер:
     paid — согласие игрока платить, без него платное — отказ. Новых лиц в окне нет — отказ, Энериум не списан; атакованные не возвращаются */
  refresh(op, kind, paid) {
    return AR_SRV.run(op, () => {
      const A = kind === 'league' ? S.arena.lg : S.arena, Mk = M(kind);
      if (kind === 'league' ? !lgOpen() : !arOpen()) return { refuse: kind === 'league' ? 'lock' : 'closed' };
      const price = AE.refreshCost(Mk, A.freeUsed || 0, A.paid);
      if (price == null) return { refuse: 'limit' };
      if (price && !paid) return { refuse: 'free' };
      if (price && S.wallet.enerium < price) return { refuse: 'money' };
      A.listNo++;
      const L = freshFor(S, A, kind); if (!L.fresh) { A.listNo--; return { refuse: 'empty' }; }
      if (price) { S.wallet.enerium -= price; A.paid++; } else A.freeUsed = (A.freeUsed || 0) + 1;
      A.opp = L.ids;
      return { kind, free: !price, price, ids: L.ids.slice(), listNo: A.listNo };
    });
  },
  /* сутки (команда): ночные нападения на оборону, суточный срез — Энериум за место, попытки и счётчики — заново (§20.2, §20.3, §20.6) */
  day(op) {
    return AR_SRV.run(op, () => {
      const A = S.arena, G = A.lg; if (!arOpen()) return { refuse: 'closed' };
      const mine = SQ.ids('arena'), out = { def: [], sum: 0, won: 0 };
      if (mine.length === 5) {
        const P = poolOf(S, 'arena').filter(o => !A.hit[o.id]).map(o => ({ id: o.id, r: rtOf(A, o) }));
        const who = AE.pickList(Object.assign({}, AD.arena, { list: AR_DEMO.defPerDay }), P, A.rating, AE.makeRng(AE.seedOf(`арена|оборона|${seasonId(S, A)}|${A.day}`)), []).ids;
        for (const oid of who) {
          const o = oppById('arena', oid), F = AR_SRV.fight('арена', mine, o.f, 0, true), rt0 = rtOf(A, o);
          const e = AE.attack(AD, { r: rt0, g: o.g }, { r: A.rating, g: A.games, lost: A.lost }, F.res.half);
          A.rating += e.dd; A.games++; if (e.lost) A.lost++;
          A.rt[oid] = rt0 + e.da;
          const x = { k: 'def', oid, half: F.res.half, d: e.dd, capped: e.capped, when: `день ${A.day}`, fight: F };
          A.log.unshift(x); out.def.push(x); out.sum += e.dd; if (F.res.half !== 2) out.won++;
        }
      }
      const place = arPlace(A.rating), en = AE.dailyEn(AD, place);
      A.days.push(place);
      const no = A.seq;
      if (out.def.length) S.inbox.unshift({ id: 'ard' + no, k: 'away', t: out.won === out.def.length ? 'Оборона выстояла' : 'Оборону пробили', s: `Нападений ${out.def.length}, отбито ${out.won} · Арена ${sgn(out.sum)}`, rew: [], go: 'arena' });
      if (en) S.inbox.unshift({ id: 'are' + no, k: 'mail', t: 'Суточный срез Арены', s: `Место ${fmt(place)} · Энериум за место`, rew: [['enerium', en]] });
      A.att = AE.attemptsAfter(AD.arena, A.att, 1); G.att = AE.attemptsAfter(AD.league, G.att, 1);
      A.paid = 0; G.paid = 0; A.freeUsed = 0; G.freeUsed = 0; A.lost = 0; A.day = Math.min(AD.season.days, A.day + 1);
      syncRanks(S);
      return Object.assign(out, { place, en, att: A.att });
    });
  },
  /* новый сезон (команда): итог — в прошлую неделю, рейтинг — сброс к старту (§20.5), атакованные и списки — заново */
  season(op) {
    return AR_SRV.run(op, () => {
      const A = S.arena, G = A.lg;
      A.past = { rating: A.rating, wins: A.wins, place: AE.placeOf(AD.server.placeEnd, A.rating), days: A.days.slice() };
      G.past = { rating: G.rating, wins: G.wins, place: lgPlace(G.rating) };
      for (const X of [A, G]) { X.rating = AE.reset(AD, X.rating); X.wins = 0; X.hit = {}; X.rt = {}; X.season++; X.listNo = 1; X.opp = []; X.log = []; X.freeUsed = 0; X.paid = 0; }
      A.days = []; A.day = 1; A.lost = 0;
      if (arOpen()) { A.opp = listFor(S, A, 'arena'); G.opp = listFor(S, G, 'league'); }
      syncRanks(S);
      return { season: A.season, rating: A.rating, league: G.rating };
    });
  },
};
const arOp = () => 'a' + S.arena.seq;
const arSay = r => { if (r && r.refuse) toast(r.refuse === 'squad' && r.why ? `Отряд не готов: ${r.why}` : AR_WHY[r.refuse] || 'Не вышло'); return !!(r && !r.refuse); };

/* ================== просмотр боя ==================
   Тот же бой вторым экземпляром на том же сиде — ядро детерминировано, показ сходится с итогом. Один просмотрщик на все режимы:
   бой Арены — сцена из одного боя, матч Лиги — из двух или трёх подряд, оборона — бой, где соперник атакует ваш слепок */
function looks(F) {
  for (const x of F.theirs) { const h = RSX(x[0]); if (h) FOE_LOOK['arena:' + h.id] = { known: true, face: rsFace(h) }; }
  for (const id of F.mine) { const v = SQ.hero(id); if (v) FOE_LOOK[id] = { known: true, face: v.face }; }
}
/* бой для показа — из снимка источников на момент операции: герои могли вырасти, а бой — тот, что решил исход */
function battleOf(F) {
  const my = F.a || F.mine.map(id => EB.heroSrc(H(id))), th = F.b || F.theirs.map(x => EB.heroSrc(oppHero(x)));
  return F.flip ? AE.pvpBattle(EB, th, my, F.seed, F.rounds) : AE.pvpBattle(EB, my, th, F.seed, F.rounds);
}
function arBg() {
  const W = RS.weeks.find(w => w.gen.toLowerCase() === String(S.week.race).toLowerCase());
  const a = W && window.EN_ECHO && EN_ECHO.arena ? EN_ECHO.arena(W.race) : null;   // арена недели Эхо: сезон — неделя расы
  return a || ARENA;
}
function arNext(R) {
  const F = R.res.fights[R.floor - 1]; looks(F);
  R.b = battleOf(F);
  const who = R.res.mode === 'league' ? `Раунд ${ROM[R.floor]} из ${ROM[R.res.fights.length]}` : R.res.def ? 'Нападение на оборону' : 'Бой';
  R.banner = [who, `${esc(R.res.name)} · ${F.rounds} ${roundWord(F.rounds)}`];
}
function arPlay(L, def) {
  S.runs = S.runs.filter(r => r.kind !== 'pvp');   // просмотр PvP один: прежний уже ничего не решает
  const lg = L.mode === 'league', n = L.fights.length;
  const R = { id: 'r' + (++S.runNo), runNo: S.runNo, kind: 'pvp', squadId: null, squad: [], heroes: [], b: null, res: Object.assign({}, L, { def: !!def }),
    floor: 1, startFloor: 1, demo: false, guard: false, mode: 'rounds', acted: [], fired: null, view: 0, runMs: 0, kills: 0,
    loot: { gold: 0, spirit: 0, souls: 0, items: {} }, newKnown: [], over: false, seen: false, gap: 0, feed: [], disp: {}, curve: [],
    lastActor: null, pending: 0, endAt: null, max0: 0, done: arDone, seed: L.fights[0].seed };
  /* «Пропустить» — в каждом бою: и на Арене, и в любом бою матча Лиги — сразу итог со статистикой (у Лиги — итог матча) */
  R.scene = { title: (lg ? 'Лига · ' : def ? 'Оборона · ' : 'Арена · ') + esc(L.name), short: lg ? 'Лига' : 'Арена', back: 'arena', skip: 'arskip',
    skipTip: lg ? 'Сразу к итогу матча: исход и статистика уже решены' : 'Сразу к итогу: исход и статистика уже решены',
    result: lg ? 'lgres' : 'arres', bg: arBg(), floors: lg && n > 1 ? n : 0,
    sub: r => lg ? `матч · раунд ${ROM[r.floor]} · третий — при равном счёте` : def ? 'на вас напали · бой уже решён' : 'бой уже решён · его можно пропустить',
    badge: r => lg ? `<b>${ROM[r.floor]}</b><span>/ ${ROM[n]}</span>` : `<b>${ic(def ? 'shield' : 'sword')}</b><span>${def ? 'оборона' : 'Арена'}</span>`,
    chip: `<span class="chip">${ic('users')}${esc(L.name)}</span>`,
    ruler: r => lg ? L.fights.map((F, j) => `<i class="${j + 1 < r.floor ? 'past' : ''} ${j + 1 === r.floor ? 'cur' : ''}"></i>`).join('') : '',
    next: arNext };
  arNext(R);
  R.max0 = R.b.maxRounds;
  syncDisp(R);
  S.runs.push(R); S.focus = R.id; S.insp = null; S.overlay = null; S.route = 'battle';
  render(); ensureLoop();
  return R;
}
/* конец боя на экране: у матча — следующий раунд или итог; итог — лист поверх Арены */
function verdictOf(F, def) {
  const h = def ? 2 - F.res.half : F.res.half;
  return h === 2 ? 'победа' : h === 0 ? 'поражение' : 'ничья';
}
function arDone(R, vis) {
  const L = R.res, k = R.floor - 1, F = L.fights[k];
  if (vis) feed(R, `<span class="${(L.def ? 2 - F.res.half : F.res.half) === 2 ? 'sp' : 'gd'}">${L.mode === 'league' ? `Раунд ${ROM[R.floor]}: ` : ''}${verdictOf(F, L.def)}</span> · ${whyOf(F.res, L.def)}`);
  if (k + 1 < L.fights.length) { R.gap = EB.RULES.floor.gapMs; if (vis) camPan(); return; }
  R.over = true;
  if (vis) { R.seen = true; S.route = 'arena'; S.overlay = { t: R.scene.result, arg: R.id }; render(); focusOverlay(); }
  else toast(`${R.scene.short}: ${L.mode === 'league' ? 'матч' : 'бой'} с «${L.name}» — итог в верхней строке`);
}
/* почему так кончилось: гибель стороны или раунды вышли — доли снятого здоровья */
function whyOf(res, def) {
  const mine = def ? res.shB : res.shA, their = def ? res.shA : res.shB;
  if (res.why === 'win') return def ? `ваш отряд пал · раунд ${res.rounds}` : `все противники пали · раунд ${res.rounds}`;
  if (res.why === 'wipe') return def ? `все нападавшие пали · раунд ${res.rounds}` : `ваш отряд пал · раунд ${res.rounds}`;
  return `раунды вышли: вы сняли ${pct1(mine)}, соперник — ${pct1(their)}`;
}

/* ================== итог со статистикой ==================
   Тот же вид, что итог Эхо (screens/echo.js, echres), чтобы игрок видел одно и то же: главное — на виду, «Подробности боя» — свёрнуты
   (классы ech-det, ech-res-kpi, ech-res-t из echo.css). Внутри — раунды и павшие, затем свой отряд и соперник: кто сколько нанёс,
   вылечил и принял, какие способности и ульты сработали. Числа — статистика боя, что решил исход (F.st, EnArena.pvpRun на «сервере»):
   «Пропустить» и конец просмотра показывают одно и то же. В обороне свой отряд — вторая сторона боя (F.flip) */
const mineOf = F => F.flip ? 1 : 0;
function statFace(u) {
  const id = String(u.id), rid = id.indexOf('arena:') === 0 ? id.slice(6) : null;
  if (rid) { const h = RSX(rid); return h ? `<span class="rs-av" data-r="${h.r}">${rsFace(h)}</span>` : '<i></i>'; }
  const v = SQ.hero(id); return v ? `<span class="rs-av" data-r="${v.r}">${v.face}</span>` : '<i></i>';
}
/* сработавшее: ульты — с короной, затем способности и реакции набора по убыванию раз; больше AR_VIEW.abMax — «ещё N» */
function abLine(u) {
  const x = (n, k) => `${esc(n)}${k > 1 ? ` <span class="num">×${k}</span>` : ''}`;
  const all = u.ult.map(([n, k]) => `<b class="ult">${ic('crown')}${x(n, k)}</b>`).concat(u.ab.concat(u.re).sort((a, b) => b[1] - a[1]).map(([n, k]) => x(n, k)));
  if (!all.length) return '<span class="faint">только обычные атаки</span>';
  const more = all.length - AR_VIEW.abMax;
  return all.slice(0, AR_VIEW.abMax).join(' · ') + (more > 0 ? ` · <span class="faint">ещё ${more}</span>` : '');
}
function sideTable(us, title) {
  const rows = us.map(u => `<tr class="${u.alive ? '' : 'fell'}"><td><span class="ech-rf ar-rf"><span class="ar-faces xs">${statFace(u)}</span><b>${esc(u.name)}</b>${u.alive ? '' : '<small>пал</small>'}</span>
      <small class="ar-ab">${abLine(u)}</small></td><td class="num">${fmt(u.dealt)}</td><td class="num">${fmt(u.healed)}</td><td class="num">${fmt(u.taken)}</td></tr>`).join('');
  return `<table class="ech-res-t ar-st"><thead><tr><th>${title}</th><th>урон</th><th>лечение</th><th>принято</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function statsHtml(F) {
  const st = F && F.st; if (!st) return '<p class="faint">Статистики этого боя нет.</p>';
  const m = mineOf(F), mine = st.sides[m], their = st.sides[1 - m], fell = us => us.filter(u => !u.alive).length;
  const kpi = [[`${st.rounds} / ${st.max}`, roundWord(st.max)], [`${fell(their)} / ${their.length}`, 'пало у соперника'], [`${fell(mine)} / ${mine.length}`, 'пало у вас']];
  return `<div class="row ech-res-kpi sm">${kpi.map(([v, s]) => `<div class="stat"><b class="num">${v}</b><small>${s}</small></div>`).join('')}</div>
    ${sideTable(mine, 'Ваш отряд')}${sideTable(their, 'Соперник')}`;
}
/* свёрнутые подробности — как «Подробности боя» итога Эхо; open — развернуть сразу (сценарий презентации, UI-кит) */
const detHtml = (sum, body, open, cls) => `<details class="ech-det ar-det${cls ? ' ' + cls : ''}"${open ? ' open' : ''}><summary>${ic('chev')}${sum}</summary><div class="col">${body}</div></details>`;

/* ================== экран ================== */
const TABS = [['arena', 'Арена'], ['league', 'Лига'], ['def', 'Оборона']];
/* «Обновить»: пока есть бесплатные — просто кнопка, сколько осталось — в подсказке; дальше — цена на кнопке и лист подтверждения;
   на сегодня всё — кнопка гаснет. Список и так новый после каждого боя */
function refreshBtn(kind) {
  const A = kind === 'league' ? S.arena.lg : S.arena, Mk = M(kind), used = A.freeUsed || 0, price = AE.refreshCost(Mk, used, A.paid);
  const after = Mk.refresh.auto ? ` После каждого ${kind === 'league' ? 'матча' : 'боя'} список и так новый.` : '';
  if (price === 0) { const left = Mk.refresh.free - used; return `<button class="btn sm" data-a="arref" data-v="${arOp()}|${kind}|0" title="Бесплатно — ещё ${left} ${plural(left, 'раз', 'раза', 'раз')} сегодня.${after}">${ic('swap')}Обновить</button>`; }
  if (price == null) return `<button class="btn sm" disabled title="Обновлений на сегодня больше нет.${after}">${ic('swap')}Обновить</button>`;
  return `<button class="btn sm" data-a="sheet" data-v="arpay:${kind}" title="Бесплатные на сегодня кончились.${after}">${ic('swap')}Обновить${costTag('enerium', price)}</button>`;
}
/* карточка соперника: лица состава, имя, два числа — рейтинг и мощь, один чип — сила против своего отряда; нажатие — витрина */
function oppCard(kind, oid) {
  const o = oppById(kind, oid), A = kind === 'league' ? S.arena.lg : S.arena; if (!o) return '';
  const my = kind === 'league' ? SQ.squad('league').reduce((a, s) => a + cmpBm(s), 0) : cmpBm(mySquad()), bm = oppBm(o), [pw, cls] = power(bm, my);
  const faces = kind === 'league' ? `<span class="lg-teams">${o.t.map(f => `<span class="ar-faces sm">${f.map(oppFace).join('')}</span>`).join('')}</span>` : `<span class="ar-faces">${o.f.map(oppFace).join('')}</span>`;
  const r = rtOf(A, o), div = kind === 'league' ? divOf(r) : null;
  return `<button class="ar-card" data-a="sheet" data-v="${kind === 'league' ? 'lgopp' : 'opp'}:${oid}" aria-label="${esc(o.n)}: рейтинг ${r}, боевая мощь ${bm}, ${pw} вашего отряда — состав">
    ${faces}<span class="ar-nm">${esc(o.n)}</span>
    <span class="ar-nums"><span class="ar-r"><b class="num">${fmt(r)}</b><small>${div ? 'дивизион ' + div.n : 'рейтинг'}</small></span>${bmHtml(bm, 13)}</span>
    <span class="chip ${cls}">${pw}</span></button>`;
}
function plankStrip(kind, have) {
  const pk = planks(kind, have), nx = pk.find(p => !p.reached), prev = nx ? pk.filter(p => p.need < nx.need).reduce((a, p) => Math.max(a, p.need), 0) : 0;
  const v = nx ? Math.floor((have - prev) * 100 / Math.max(1, nx.need - prev)) : 100;
  const unit = kind === 'league' ? ['победа в матче', 'победы в матчах', 'побед в матчах'] : ['победа', 'победы', 'побед'];
  return `<button class="ar-plank" data-a="sheet" data-v="arrew:${kind}"><span class="ar-pl-t"><b class="num">${fmt(have)}</b> <small>${plural(have, ...unit)} за неделю</small></span>
    ${bar(v, nx ? '' : 'sp')}<span class="ar-pl-n">${nx ? `сундук за <b class="num">${fmt(nx.need)}</b>` : 'все планки взяты'}</span>${nx ? chestTok(nx.pay, `Планка ${nx.k}: ${chestName(nx.pay)}`) : ''}${ic('chev')}</button>`;
}
function arenaTab() {
  const A = S.arena;
  const head = `<div class="ar-top">
      <button class="ar-me" data-a="sheet" data-v="rank:Арена"><b class="num">${fmt(A.rating)}</b><small>рейтинг · место ${fmt(arPlace(A.rating))}</small></button>
      <div class="ar-att"><b class="num">${A.att}<span class="faint"> / ${A.max}</span></b><small>атак · +${AD.arena.att.day} в сутки</small></div>
      <span class="g-spacer"></span>${refreshBtn('arena')}
      <button class="iconbtn" data-a="sheet" data-v="arrules:arena" aria-label="Как устроена Арена" title="Как устроена Арена">${ic('info')}</button></div>`;
  const list = A.opp.length ? `<div class="ar-list">${A.opp.map(id => oppCard('arena', id)).join('')}</div>`
    : `<div class="pnl ar-empty"><p class="muted">Соперников вашего цикла в окне подбора нет.</p><p class="reason">Окно расширяется само, пока не найдутся.</p></div>`;
  return `<section class="scr ar">${head}${list}${plankStrip('arena', A.wins)}</section>`;
}
function leagueTab() {
  const G = S.arena.lg, need = AD.league.heroes, n = poolN(S);
  if (!lgOpen()) {
    return `<section class="scr ar"><div class="pnl lg-lock">
      <span class="eyebrow">Лига · три отряда по пять</span>
      <h2 class="serif">${arOpen() ? `Нужно ${need} разных героев` : `Лига откроется в цикле ${ROM[AD.league.from]}`}</h2>
      <div class="lg-lock-b">${bar(Math.min(100, Math.floor(n * 100 / need)))}</div><p class="faint num">${fmt(n)} из ${need} в коллекции</p>
      <div class="row lg-lock-a"><button class="btn" data-a="sqmode" data-v="league">${ic('users')}Отряды Лиги</button><button class="btn go" data-a="seg" data-v="heroes:hire" data-go="heroes">К призыву</button></div>
      <p class="reason">Герой не повторяется, поэтому Лига — для собравших коллекцию.</p></div></section>`;
  }
  const L = SQ.ready('league'), sel = SQ.squad('league'), d = divOf(G.rating);
  const head = `<div class="ar-top">
      <button class="ar-me" data-a="sheet" data-v="rank:Лига"><b class="num">${fmt(G.rating)}</b><small>рейтинг Лиги · дивизион ${d.n}</small></button>
      <div class="ar-att"><b class="num">${G.att}<span class="faint"> / ${G.max}</span></b><small>матчей · +${AD.league.att.day} в сутки</small></div>
      <span class="g-spacer"></span>${refreshBtn('league')}
      <button class="iconbtn" data-a="sheet" data-v="arrules:league" aria-label="Как устроена Лига" title="Как устроена Лига">${ic('info')}</button></div>`;
  const rounds = sel.map((s, i) => `<div class="lg-round"><span class="eyebrow">Раунд ${ROM[i + 1]}</span><b>${s ? esc(s.name) : 'не выбран'}</b><span class="ar-faces sm">${s ? myFaces(s) : ''}</span></div>`).join('');
  const mine = `<div class="pnl lg-mine">${rounds}<div class="row"><span class="reason ${L.ok ? '' : 'warn'}">${L.ok ? 'Три отряда готовы' : L.why}</span><span class="g-spacer"></span><button class="btn sm" data-a="sqmode" data-v="league">${ic('users')}Отряды</button></div></div>`;
  const list = G.opp.length ? `<div class="ar-list lg">${G.opp.map(id => oppCard('league', id)).join('')}</div>` : `<div class="pnl ar-empty"><p class="muted">Соперников в окне подбора нет.</p></div>`;
  return `<section class="scr ar">${head}<div class="lg-body">${mine}${list}</div>${plankStrip('league', G.wins)}</section>`;
}
function defTab() {
  const A = S.arena, s = SQ.squad('arena') || S.squads[0], r = SQ.ready('arena');
  const slots = s.m.map(id => { const h = id && H(id); return h ? heroCard(h, { act: 'noop' }) : `<div class="hc empty">${ic('plus')}</div>`; }).join('');   // оборона — витрина: плитка с мощью
  const rows = A.log.map((x, i) => [x, i]).filter(([x]) => x.k === 'def').slice(0, AR_VIEW.logRows).map(([x, i]) => defRow(x, i)).join('') || '<p class="faint">Нападений пока не было.</p>';
  return `<section class="scr ar"><div class="ar-def">
    <div class="pnl pad col ar-dsq">
      <div class="row"><h2 class="serif gold">${esc(s.name)}</h2><span class="chip spirit" title="Слепок: герои не заняты, оборона всегда показывает их нынешнюю силу">слепок</span><span class="g-spacer"></span>${bmHtml(cmpBm(s), 14)}<button class="btn sm" data-a="sqmode" data-v="arena">${ic('users')}Сменить</button></div>
      <div class="sq-slots">${slots}</div>
      <p class="reason ${r.ok ? '' : 'warn'}">${r.ok ? 'Соперники видят этот отряд целиком. Героев оборона не занимает.' : `Оборона неполная: ${r.why}. Соперники атакуют тех, кто есть.`}</p></div>
    <div class="pnl pad col ar-log"><div class="row"><span class="eyebrow">Нападения</span><span class="g-spacer"></span>${A.log.some(x => x.k === 'def') ? `<button class="link" data-a="sheet" data-v="ardef">Все ${ic('chev')}</button>` : ''}</div>
      ${rows}
      ${TM(`<div class="row ar-team"><button class="btn sm" data-a="arday" data-v="${arOp()}">Новые сутки</button><button class="btn sm ghost" data-a="arseason" data-v="${arOp()}">Новый сезон</button></div>`)}</div>
  </div></section>`;
}
/* запись обороны: кто напал, отбили или нет, сдвиг рейтинга — одно число и один чип; бой этих суток можно посмотреть */
function defRow(x, i) {
  const o = oppById('arena', x.oid), ok = x.half !== 2;
  return `<div class="ar-lrow"><span class="ar-faces xs">${o ? o.f.slice(0, 3).map(oppFace).join('') : ''}</span><span class="tx"><b>${esc(o ? o.n : 'Соперник')}</b><small>${esc(x.when)}</small></span>
    <span class="chip ${ok ? 'spirit' : 'bad'}">${x.half === 1 ? 'ничья' : ok ? 'отбита' : 'пробита'}</span><b class="num ar-d ${x.d < 0 ? 'neg' : ''}">${sgn(x.d)}</b>
    ${x.fight ? `<button class="iconbtn" data-a="ardefplay" data-v="${i}" aria-label="Смотреть бой" title="Смотреть бой">${ic('eye')}</button>` : ''}</div>`;
}
SCREENS.arena = function () {
  const t = TABS.some(([k]) => k === S.seg.arena) ? S.seg.arena : 'arena';
  const meta = { title: 'Арена', back: 'week', chip: typeof weekChip === 'function' ? weekChip() : '', seg: { key: 'arena', items: TABS } };
  if (!arOpen()) return Object.assign(meta, { html: `<section class="scr ar"><div class="pnl lg-lock"><span class="eyebrow">Арена · Лига · Оборона</span><h2 class="serif">Арена откроется в цикле ${ROM[AD.arena.from]}</h2><p class="reason">Сначала пройдите обучение: Мастерская форм и Подземный лес.</p></div></section>` });
  return Object.assign(meta, { html: t === 'league' ? leagueTab() : t === 'def' ? defTab() : arenaTab() });
};

/* ================== листы ================== */
/* витрина соперника: состав целиком — пять героев, класс, стихия, уровень, доблесть и её максимум, предел; ротация — лист героя.
   Рейтинг за победу и поражение — до атаки. Каждого соперника атакуют один раз: бой этой пары составов недели всегда один */
function oppOf(arg) {
  const A = S.arena, v = String(arg || '');
  return /^\d+$/.test(v) && A.opp[+v] ? A.opp[+v] : v;
}
Object.assign(OV, {
  opp(o) {
    const oid = oppOf(o.arg), x = oppById('arena', oid), A = S.arena;
    if (!x) return sheet('Соперник', '<p class="faint">Соперника больше нет в списке.</p>');
    const r = rtOf(A, x), w = AE.attack(AD, { r: A.rating, g: A.games }, { r, g: x.g, lost: 0 }, 2), l = AE.attack(AD, { r: A.rating, g: A.games }, { r, g: x.g, lost: 0 }, 0);
    const tiles = x.f.map((y, i) => oppTile(oppHero(y), `arhero:arena:${oid}:${i}`)).join('');
    const els = [...new Set(x.f.map(y => (RSX(y[0]) || {}).sch).filter(Boolean))];
    const done = !!A.hit[oid], can = A.opp.includes(oid) && !done;
    const body = `<div class="row ar-oh"><div class="stat"><b class="num">${fmt(r)}</b><small>рейтинг</small></div><div class="stat"><b class="bm">${ICON('power', 20, 'Боевая мощь')}<span class="num">${fmt(oppBm(x))}</span></b><small>боевая мощь</small></div></div>
      <div class="ar-five">${tiles}</div>
      <div class="row ar-els"><span class="eyebrow">Стихии</span>${els.map(e => el(e)).join('')}</div>
      <p class="reason">${done ? 'Этого соперника вы уже атаковали на этой неделе.' : `Победа ${sgn(w.da)} · поражение ${sgn(l.da)}. ${PL('Атаковать можно один раз за неделю.', 'Сид — пара составов на сезон: повтор боя ничего не скажет, поэтому один соперник — одна атака.')}`}${TM(` Ожидание ${pct1(w.e)} со сдвигом защиты ${AD.elo.def.shift}, K ${AE.kOf(AD, A.games, A.rating)}.`)}</p>`;
    return sheet(esc(x.n), body, `<span class="faint ar-f">атак ${A.att} / ${A.max}</span><button class="btn go" data-a="arprep" data-v="${oid}" ${can && A.att > 0 ? '' : 'disabled'}>${ic('sword')}Выбрать отряд</button>`, true);
  },
  /* герой соперника: класс, стихия, раса, уровень и потолок, доблесть, предел, мощь; способности с долей хода — как в бою */
  arhero(o) {
    const [kind, oid, i, t] = String(o.arg).split(':'), x = oppById(kind, oid), f = x ? (kind === 'league' ? x.t[+t || 0] : x.f) : null, y = f && f[+i];
    const h = y && oppHero(y); if (!h) return sheet('Герой', '<p class="faint">Нет данных.</p>');
    let abs = '';
    try {
      const u = EB.create({ mode: 'rounds', heroes: [EB.heroSrc(h)], foes: [], seed: 1 }).u[0][0], rest = BP - u.table.reduce((a, ab) => a + ab.ch, 0);
      abs = u.table.map(ab => `<div class="srow"><span class="n">${esc(ab.n)}${ab.ult ? ' · ульта' : ''}</span><span class="v">${pctBp(ab.ch)}</span><span></span></div>`).join('') + `<div class="srow"><span class="n">Обычная атака</span><span class="v">${pctBp(rest)}</span><span></span></div>`;
    } catch (_) { abs = ''; }
    const back = kind === 'league' ? `lgopp:${oid}` : `opp:${oid}`;
    const body = `<div class="ar-hh">${oppTile(h, back)}<div class="col" style="gap:6px"><b class="serif ar-hn">${esc(h.name)}</b>
        <span class="row" style="gap:6px;flex-wrap:wrap">${CLS(h.clsN, 16)}<span>${esc(h.clsN)}</span>${el(h.el)}<span class="faint">${esc(h.race || '')}</span></span>
        <span class="faint">ур. ${h.lvl} из ${h.cap} · доблесть ${h.valor} из ${h.maxV}</span>${typeof rpRow === 'function' ? rpRow(h.lim) : `<span class="faint">предел ${h.lim} из 5</span>`}${bmHtml(h.bm, 14)}</div></div>
      <span class="eyebrow">В бою · доля хода</span><div class="stats">${abs || '<p class="faint">Бьёт обычной атакой.</p>'}</div>
      <p class="reason">Снаряжения нет.</p>`;
    return sheet(esc(x.n), body, `<button class="btn" data-a="sheet" data-v="${back}">${ic('back')}К составу</button>`);
  },
  /* подготовка атаки: соперник против своего отряда, пресеты — чипами, «Изменить» и «Новый» — библиотека с возвратом сюда */
  arset(o) {
    const A = S.arena, oid = A.pick, x = oid && oppById('arena', oid);
    if (!x) return sheet('Атака Арены', '<p class="faint">Сначала выберите соперника в списке Арены.</p>', '<button class="btn go" data-a="close">Готово</button>');
    const op = typeof sqOp === 'function' ? sqOp() : 'q' + S.sq.seq, cur = SQ.of('pvp'), s = SQ.squad('pvp') || mySquad(), r = SQ.ready('pvp', s.id);
    const chips = S.squads.map(q => { const rr = SQ.ready('pvp', q.id); return `<button class="p-chip hr-chip${rr.ok ? '' : ' warn'}" aria-pressed="${q.id === (cur || s.id)}" data-a="sqpick" data-v="${op}|pvp|${q.id}">${esc(q.name)}${rr.ok ? `<i class="ok" aria-hidden="true">${ic('check')}</i>` : `<small>${rr.why}</small>`}</button>`; }).join('');
    const bmT = oppBm(x), bmM = cmpBm(s), [pw, cls] = power(bmT, bmM);
    const body = `<div class="ar-vs">
        <div class="ar-side"><span class="eyebrow">${esc(x.n)}</span><span class="ar-faces">${x.f.map(oppFace).join('')}</span>${bmHtml(bmT, 14)}</div>
        <span class="chip ${cls}">${pw}</span>
        <div class="ar-side"><span class="eyebrow">${esc(s.name)}</span><span class="ar-faces">${myFaces(s)}</span>${bmHtml(bmM, 14)}</div></div>
      <div class="row hr-chips">${chips}</div>
      <p class="reason ${r.ok ? '' : 'warn'}">${r.ok ? 'Исход решится в момент атаки: бой можно смотреть или пропустить — итог тот же.' : `«${esc(s.name)}»: ${r.why}. Нужны пятеро разных героев.`}</p>`;
    return sheet('Атака · ' + esc(x.n), body, `<button class="link" data-a="sqedit" data-v="pvp|${s.id}">${ic('users')}Изменить</button><button class="btn sm" data-a="sqnew" data-v="${op}|pvp" ${S.squads.length >= SQ_DATA.max ? 'disabled' : ''}>${ic('plus')}Новый</button>
      <span class="g-spacer"></span><button class="btn go" data-a="aratk" data-v="${arOp()}|${oid}|${s.id}" ${r.ok && A.att > 0 ? '' : 'disabled'}>${ic('sword')}В бой</button>`, true);
  },
  /* итог боя Арены — тот же вид, что итог Эхо: на виду исход, сдвиг рейтинга крупно, рейтинг и место, почему так кончилось, путь к
     планке; «Подробности боя» свёрнуты — раунды, павшие, кто сколько нанёс, вылечил и принял, сработавшие способности и ульты.
     Открывают «Пропустить» и конец просмотра — итог решён в момент атаки. После боя список уже новый: «К новым соперникам» */
  arres(o) {
    const R = runById(o.arg), L = R ? R.res : S.arena.last; if (!L || L.mode !== 'arena') return sheet('Итог', '<p class="faint">Итога нет.</p>');
    const F = L.fights[0], det = detHtml('Подробности боя', statsHtml(F), !!o.open);
    /* нападение на оборону: исход глазами защитника и сдвиг рейтинга из журнала */
    if (L.def) {
      const h = 2 - L.half, ttl = h === 2 ? 'Оборона выстояла' : h === 0 ? 'Оборону пробили' : 'Ничья';
      return sheet(ttl + ' · ' + esc(L.name), `<div class="ar-res ${h === 2 ? 'win' : h === 0 ? 'lose' : ''}"><b class="num">${sgn(L.d || 0)}</b><small>рейтинг Арены</small></div>
        <p class="reason">${cap1(whyOf(F.res, true))}.</p>${det}`, `<span class="g-spacer"></span><button class="btn go" data-a="seg" data-v="arena:def" data-go="arena">К обороне</button>`);
    }
    const ttl = L.half === 2 ? 'Победа' : L.half === 0 ? 'Поражение' : 'Ничья';
    const pk = planks('arena', L.wins), nx = pk.find(p => !p.reached);
    const body = `<div class="ar-res ${L.half === 2 ? 'win' : L.half === 0 ? 'lose' : ''}"><b class="num">${sgn(L.e.da)}</b><small>рейтинг ${fmt(L.r1)} · место ${fmt(L.p1)}</small></div>
      <p class="reason">${cap1(whyOf(F.res))}.</p>
      <div class="ar-pl-s"><span>${fmt(L.wins)} ${plural(L.wins, 'победа', 'победы', 'побед')} за неделю</span>${nx ? `<span class="faint">сундук за ${fmt(nx.need)}</span>` : '<span class="faint">все планки взяты</span>'}</div>
      ${det}
      ${TM(`<p class="reason">Ожидание ${pct1(L.e.e)}, K ${AE.kOf(AD, S.arena.games - 1, L.r0)}; соперник ${sgn(L.e.dd)}. Сид ${String(F.seed >>> 0)}.</p>`)}`;
    return sheet(ttl + ' · ' + esc(L.name), body, `${R && !R.seen ? '' : `<button class="btn" data-a="arwatch" data-v="${R ? R.id : 'last'}">${ic('eye')}Смотреть бой</button>`}<span class="g-spacer"></span><button class="btn go" data-a="close">${L.fresh ? 'К новым соперникам' : 'К соперникам'}</button>`);
  },
  /* матч Лиги: три отряда соперника по раундам против трёх своих — у каждого раунда оценка силы; третий — при равном счёте */
  lgopp(o) {
    const G = S.arena.lg, oid = String(o.arg), x = oppById('league', oid);
    if (!x) return sheet('Соперник', '<p class="faint">Соперника больше нет в списке.</p>');
    const sel = SQ.squad('league'), L = SQ.ready('league'), r = rtOf(G, x);
    const rows = x.t.map((f, i) => { const s = sel[i], mine = cmpBm(s), [pw, cls] = power(teamBm(f), mine);
      return `<div class="lg-row"><span class="eyebrow">Раунд ${ROM[i + 1]}</span><span class="ar-faces">${f.map((y, j) => `<button class="ar-fb" data-a="sheet" data-v="arhero:league:${oid}:${j}:${i}" aria-label="${esc((RSX(y[0]) || {}).n || '')}">${oppFace(y)}</button>`).join('')}</span>
        <span class="chip ${cls}">${pw}</span><span class="ar-faces">${s ? myFaces(s) : ''}</span><b class="lg-my">${s ? esc(s.name) : 'не выбран'}</b></div>`; }).join('');
    const w = AE.attack(AD, { r: G.rating, g: G.games }, { r, g: x.g, lost: 0 }, 2), l = AE.attack(AD, { r: G.rating, g: G.games }, { r, g: x.g, lost: 0 }, 0);
    const can = G.opp.includes(oid) && !G.hit[oid] && L.ok && G.att > 0;
    const body = `<div class="row ar-oh"><div class="stat"><b class="num">${fmt(r)}</b><small>рейтинг Лиги · дивизион ${divOf(r).n}</small></div><div class="stat"><b class="bm">${ICON('power', 20, 'Боевая мощь')}<span class="num">${fmt(oppBm(x))}</span></b><small>боевая мощь</small></div></div>
      <div class="lg-board">${rows}</div>
      <p class="reason ${L.ok ? '' : 'warn'}">${L.ok ? `Победа ${sgn(w.da)} · поражение ${sgn(l.da)}. Третий раунд — только при 1:1: отдать слабый раунд — тоже решение.` : L.why + '.'}</p>`;
    return sheet(esc(x.n), body, `<button class="link" data-a="sqmode" data-v="league">${ic('users')}Расставить отряды</button><span class="g-spacer"></span><span class="faint ar-f">матчей ${G.att} / ${G.max}</span><button class="btn go" data-a="lgplay" data-v="${arOp()}|${oid}" ${can ? '' : 'disabled'}>${ic('sword')}Сыграть матч</button>`, true);
  },
  /* итог матча Лиги: на виду счёт крупно и сдвиг рейтинга Лиги; ниже — строка на каждый бой матча: исход и почему так кончилось,
     нажатие раскрывает его статистику — тот же блок, что «Подробности боя» Арены. open — номер боя, раскрытого сразу (с единицы) */
  lgres(o) {
    const R = runById(o.arg), L = R ? R.res : S.arena.last; if (!L || L.mode !== 'league') return sheet('Итог', '<p class="faint">Итога нет.</p>');
    const ttl = L.half === 2 ? 'Победа' : L.half === 0 ? 'Поражение' : 'Ничья', sc = L.score, half = n => `${Math.floor(n / 2)}${n % 2 ? '½' : ''}`;
    const bouts = L.fights.map((F, i) => detHtml(`<b>Раунд ${ROM[i + 1]} · ${verdictOf(F)}</b><small>${esc(whyOf(F.res))}</small>`, statsHtml(F), +o.open === i + 1,
      `lg-bout ${F.res.half === 2 ? 'win' : F.res.half === 0 ? 'lose' : ''}`)).join('');
    const body = `<div class="ar-res ${L.half === 2 ? 'win' : L.half === 0 ? 'lose' : ''}"><b class="num">${half(sc.my)} : ${half(sc.their)}</b><small>рейтинг Лиги ${fmt(L.r1)} (${sgn(L.e.da)})</small></div>
      <div class="col lg-bouts">${bouts}</div>${sc.need3 ? '' : `<p class="reason">Третий раунд не понадобился.</p>`}`;
    return sheet(ttl + ' · ' + esc(L.name), body, `${R && !R.seen ? '' : `<button class="btn" data-a="arwatch" data-v="${R ? R.id : 'last'}">${ic('eye')}Смотреть матч</button>`}<span class="g-spacer"></span><button class="btn go" data-a="close">${L.fresh ? 'К новым соперникам' : 'К Лиге'}</button>`);
  },
  /* журнал обороны: все нападения недели */
  ardef() {
    const rows = S.arena.log.map((x, i) => x.k === 'def' ? defRow(x, i) : '').join('');
    return sheet('Нападения на оборону', `<div class="col ar-loglist">${rows || '<p class="faint">Нападений пока не было.</p>'}</div>
      <p class="reason">Отбитое нападение даёт половину рейтинга. Поражения обороны снимают рейтинг не больше ${AD.elo.def.lossCap} раз за сутки.</p>`);
  },
  /* награды: планки побед недели — сундуки в «Дарах»; место в конце недели; у Арены — Энериум за место каждые сутки */
  arrew(o) {
    const kind = o.arg === 'league' ? 'league' : 'arena', A = kind === 'league' ? S.arena.lg : S.arena, pk = planks(kind, A.wins);
    const place = kind === 'league' ? lgPlace(A.rating) : arPlace(A.rating), tier = tierOf(kind, place);
    const rows = pk.map(p => `<div class="ar-pk ${p.reached ? 'got' : ''}">${chestTok(p.pay, chestName(p.pay))}<span class="tx"><b>${fmt(p.need)} ${plural(p.need, 'победа', 'победы', 'побед')}</b><small>${esc(chestName(p.pay))}</small></span>${p.reached ? `<span class="chip spirit">${ic('check')}взята</span>` : ''}</div>`).join('');
    const en = kind === 'arena' ? `<span class="eyebrow">Энериум каждые сутки</span><div class="stats">${AD.enerium.map(([top, n], i) => `<div class="srow"><span class="n">${i ? `места ${AD.enerium[i - 1][0] + 1}–${top}` : 'место 1'}</span><span class="v">${money('enerium', n)}</span><span></span></div>`).join('')}</div>
      <p class="reason">Раз в сутки — срез рейтинга сервера. Сейчас место ${fmt(place)}: ${AE.dailyEn(AD, place) ? `${AE.dailyEn(AD, place)} Энериума` : 'вне сотни'}.</p>` : '';
    return sheet(kind === 'league' ? 'Награды Лиги' : 'Награды Арены', `<span class="eyebrow">Победы недели</span><div class="col ar-pks">${rows}</div>
      ${tier ? `<p class="reason">Если неделя кончится сейчас: ${esc(tier.label)} — ${esc(chestName(tier.pay))}.</p>` : ''}${en}`, `<button class="btn go" data-a="sheet" data-v="gifts">Дары путешествия</button>`);
  },
  /* как устроено: пять строк правил; команде — Эло и асимметрия */
  arrules(o) {
    const lg = o.arg === 'league', E = AD.elo, Mk = M(lg ? 'league' : 'arena'), R0 = Mk.refresh;
    const list = `После каждого ${lg ? 'матча' : 'боя'} список соперников новый. «Обновить» — ${R0.free} ${plural(R0.free, 'раз', 'раза', 'раз')} в сутки бесплатно, дальше за Энериум: он не даёт ни попыток, ни рейтинга.`;
    const pts = lg ? ['Три отряда по пять, герой не повторяется. Все три отряда соперника видны.', 'Раунд I — ваш первый отряд против первого соперника, и так далее. Третий раунд — только при 1:1. Отдать слабый раунд, чтобы выиграть два других, — законный ход.', 'Матч можно не смотреть: «Пропустить» — сразу итог и статистика каждого боя.', `Матчей — ${AD.league.att.day} в сутки, копятся до ${AD.league.att.cap}. ${list}`, 'Дивизион — ступень рейтинга Лиги.']
      : ['Соперника видно целиком до атаки: решение — до боя, бой лишь проверяет ответ.', 'Бой с этим составом против вашего всегда пойдёт одинаково — поэтому каждого соперника атакуют один раз за неделю. Смотреть его не обязательно: «Пропустить» — сразу итог и статистика.', `Раунды вышли — побеждает тот, кто снял бо́льшую долю здоровья противника.`, `Атак — ${AD.arena.att.day} в сутки, копятся до ${AD.arena.att.cap}. ${list}`, 'Рейтинг — только от побед и поражений. В начале недели он сжимается к среднему.'];
    const team = TM(`<p class="reason">Эло: E по таблице разницы рейтингов; K ${E.k.new} — первые ${E.k.newGames} боёв, ${E.k.base}, ${E.k.high} выше ${E.k.highFrom}. Ожидание атакующего — со сдвигом ${E.def.shift} в его пользу: он видит соперника и выбирает. Удачная оборона — ${pct1(E.def.winBp)} расчётного, поражений обороны в сутки снимают рейтинг не больше ${E.def.lossCap}. Сброс недели — к ${E.start} наполовину. Раундов боя — ${EB.roundsOf('pvp')}, таблица ядра. Сид — пара составов на сезон. Список — на сиде сезона и номера списка; платные обновления — ${R0.price.join(', ')}.</p>`);
    return sheet(lg ? 'Как устроена Лига' : 'Как устроена Арена', `<ul class="ar-rules">${pts.map(p => `<li>${p}</li>`).join('')}</ul>${team}`);
  },
  /* цена обновления за Энериум — подтверждение: сколько стоит и что останется. Бесплатное подтверждения не просит */
  arpay(o) {
    const kind = o.arg === 'league' ? 'league' : 'arena', A = kind === 'league' ? S.arena.lg : S.arena, price = AE.refreshCost(M(kind), A.freeUsed || 0, A.paid);
    const after = M(kind).refresh.auto ? ` После каждого ${kind === 'league' ? 'матча' : 'боя'} список и так новый.` : '';
    if (price == null) return dialog('Обновить список', `<p class="reason">Обновлений на сегодня больше нет.${after}</p>`, '<button class="btn go" data-a="close">Понятно</button>');
    if (price === 0) return dialog('Обновить список', `<p>Новые соперники — бесплатно.</p><p class="reason">${after.trim()}</p>`, `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="arref" data-v="${arOp()}|${kind}|0">Обновить</button>`);
    const ok = S.wallet.enerium >= price;
    return dialog('Обновить список', `<p>Новые соперники — за ${money('enerium', price)}. Останется ${fmt(Math.max(0, S.wallet.enerium - price))}.</p><p class="reason">Бесплатные на сегодня кончились.${after} Попыток и рейтинга Энериум не даёт.</p>`,
      `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="arref" data-v="${arOp()}|${kind}|1" ${ok ? '' : 'disabled'}>Обновить${costTag('enerium', price)}</button>`);
  },
});
/* лист выбора отряда атаки — это подготовка атаки: у OV.prep для режима pvp свой вид */
const prepBase = OV.prep;
if (typeof prepBase === 'function') OV.prep = function (o) { return o && o.arg === 'pvp' ? OV.arset(o) : prepBase.call(this, o); };

/* ================== действия ================== */
const run1 = (R, r, f) => { if (r.refuse) return arSay(r); if (r.again) return render(); f(r); };
Object.assign(ACT, {
  /* из витрины — подготовка атаки: общий лист отрядов режима pvp, возврат сюда */
  arprep(v) { const A = S.arena; if (!A.opp.includes(v) || A.hit[v]) return toast(AR_WHY.gone); A.pick = v; SQ.pick('pvp', { back: 'arena' }); },
  aratk(v) {
    const [op, oid, sid] = String(v).split('|'), r = AR_SRV.attack(op, oid, sid);
    if (r.refuse) return arSay(r);
    if (r.again) { S.overlay = null; return render(); }
    S.arena.pick = null;
    arPlay(r);
  },
  lgplay(v) {
    const [op, oid] = String(v).split('|'), r = AR_SRV.match(op, oid);
    if (r.refuse) return arSay(r);
    if (r.again) { S.overlay = null; return render(); }
    arPlay(r);
  },
  /* «Пропустить» — в любом бою Арены, обороны и матча Лиги: итог уже решён, сразу лист итога со статистикой (у Лиги — итог матча) */
  arskip(v) {
    const R = runById(v) || focusRun(); if (!R || R.kind !== 'pvp') return;
    R.over = true; R.seen = true; S.focus = R.id; S.insp = null; S.route = 'arena'; S.overlay = { t: R.scene.result, arg: R.id };
    render(); focusOverlay();
  },
  /* посмотреть бой из итога: тот же бой тем же сидом — просмотр ничего не меняет */
  arwatch(v) { const R = runById(v), L = R ? R.res : S.arena.last; if (!L || !L.fights) return; arPlay(L, !!L.def); },
  ardefplay(v) { const x = S.arena.log[+v]; if (!x || !x.fight) return; const o = oppById('arena', x.oid); arPlay({ mode: 'arena', no: 0, name: o ? o.n : 'Соперник', fights: [x.fight], half: x.half, d: x.d, def: true }, true); },
  arref(v) {
    const [op, kind, paid] = String(v).split('|'), r = AR_SRV.refresh(op, kind, paid === '1');
    S.overlay = null;
    if (r.refuse) return arSay(r);
    if (r.again) return render();
    toast(r.free ? 'Список обновлён' : `Список обновлён · ${r.price} Энериума`);
  },
  arday(v) { const r = AR_SRV.day(v); if (r.refuse) return arSay(r); if (r.again) return render(); toast(`Сутки прошли: место ${fmt(r.place)}${r.en ? `, Энериум ${r.en} — во Входящих` : ''}`); },
  arseason(v) { const r = AR_SRV.season(v); if (r.refuse) return arSay(r); if (r.again) return render(); toast(`Новый сезон: рейтинг ${fmt(r.rating)}`); },
});

/* ================== неделя: итоги в реестр WEEK_MODES (screens/week.js) ==================
   Арена: место и рейтинг, планки побед недели, лидеры, выплата за место, если неделя кончится сейчас. Прошлая — место и выплаты из
   «Даров» (darRows, screens/bag.js), рейтинг конца недели, Энериум суточных срезов. Лига — так же; закрыта — причина */
const darPrev = id => typeof darRows === 'function' && S.zp ? darRows(S, 'prev').filter(p => p.id === id) : [];
const pastRows = rows => rows.map(p => ({ label: p.label, box: p.box, groups: p.groups.map(g => ({ r: g.r, count: g.count, win: g.win })), st: p.st, cat: p.cat, kind: p.kind }));
const WINS = ['победа', 'победы', 'побед'];
(window.WEEK_MODES = window.WEEK_MODES || []).push({
  id: 'arena', n: 'Арена', icon: 3, go: 'arena:arena', order: 50, unit: 'рейтинг',
  now() {
    if (!arOpen()) return { lock: `рейтинг — с цикла ${ROM[AD.arena.from]}` };
    const A = S.arena, place = arPlace(A.rating), en = AE.dailyEn(AD, place);
    return { place, points: A.rating, have: A.wins, planks: planks('arena', A.wins), plankUnit: WINS, top: AD.top.arena.now.map(x => x.slice()), tier: tierOf('arena', place),
      note: en ? `Сейчас место ${fmt(place)}: ${en} Энериума на суточном срезе` : 'Энериум — топ-100 на суточном срезе' };
  },
  past() {
    if (!arOpen()) return { lock: `рейтинг — с цикла ${ROM[AD.arena.from]}` };
    const P = S.arena.past, rows = darPrev('arena'), pl = rows.find(p => p.kind === 'place' && p.place), days = P.days || [];
    const en = days.reduce((a, p) => a + AE.dailyEn(AD, p), 0), inTop = days.filter(p => AE.dailyEn(AD, p) > 0).length;
    return { place: pl ? pl.place : P.place, points: P.rating, top: AD.top.arena.past.map(x => x.slice()), rewards: pastRows(rows), cur: en ? [['enerium', en]] : [],
      note: `Энериум — за места на суточных срезах: в топ-100 — ${inTop} ${plural(inTop, 'день', 'дня', 'дней')} из ${days.length}` };
  },
});
(window.WEEK_MODES = window.WEEK_MODES || []).push({
  id: 'league', n: 'Лига', icon: 3, go: 'arena:league', order: 60, unit: 'рейтинг',
  now() {
    const why = lgWhy(); if (why) return { lock: why };
    const G = S.arena.lg, place = lgPlace(G.rating);
    return { place, points: G.rating, have: G.wins, planks: planks('league', G.wins), plankUnit: ['победа в матче', 'победы в матчах', 'побед в матчах'], top: AD.top.league.now.map(x => x.slice()),
      tier: tierOf('league', place), note: `Дивизион ${divOf(G.rating).n}` };
  },
  past() {
    const why = lgPastWhy(); if (why) return { lock: why };
    const G = S.arena.lg, P = G.past || { rating: AD.elo.start, place: null }, rows = darPrev('league'), pl = rows.find(p => p.kind === 'place' && p.place);
    return { place: pl ? pl.place : P.place, points: P.rating, top: AD.top.league.past.map(x => x.slice()), rewards: pastRows(rows) };
  },
});
/* «Дары» не платят режиму, закрытому для аккаунта: Лигу без 15 героев не играли ни на этой неделе, ни на прошлой — героев не бывает меньше;
   Лига, открытая на этой неделе, за прошлую не платит (wk — неделя «Даров») */
if (typeof ZP_DEMO !== 'undefined' && ZP_DEMO.gifts) (ZP_DEMO.gifts.gate = ZP_DEMO.gifts.gate || {}).league = (s, wk) => wk && wk.id === 'prev' ? lgPastWhy(s) : lgWhy(s);

/* ================== раздел UI-кита ================== */
/* пример итога со статистикой: оборона демо-аккаунта против первого соперника списка — настоящий бой ядром на сиде, без операции:
   состояние не меняется. Один раз на пару составов */
let arKitF = null;
function kitFight() {
  const mine = SQ.ids('arena'), oid = S.arena.opp[0], o = oid && oppById('arena', oid);
  if (!o || mine.length !== 5) return null;
  const key = mine.join() + '|' + oid + '|' + seasonId(S, S.arena);
  if (!arKitF || arKitF.key !== key) arKitF = { key, name: o.n, F: AR_SRV.fight('арена', mine, o.f, 0) };
  return arKitF;
}
function arKitStats() {
  const K = kitFight(); if (!K) return '<p class="faint">Нужны пятеро в обороне и соперник в списке.</p>';
  const F = K.F, h = F.res.half, K0 = AR_VIEW.kit, d = AE.attack(AD, { r: K0.r, g: K0.g }, { r: K0.r, g: K0.g, lost: 0 }, h).da;
  return `<div class="col ar-kit-res"><b class="serif">${h === 2 ? 'Победа' : h === 0 ? 'Поражение' : 'Ничья'} · ${esc(K.name)}</b>
    <div class="ar-res ${h === 2 ? 'win' : h === 0 ? 'lose' : ''}"><b class="num">${sgn(d)}</b><small>рейтинг · место</small></div>
    <p class="reason">${cap1(whyOf(F.res))}.</p>${detHtml('Подробности боя', statsHtml(F), true)}</div>`;
}
function arKitHtml() {
  const A = S.arena, ids = A.opp.slice(0, 3), E = AD.elo, Mo = AD.model, RF = AD.arena.refresh;
  const cards = ids.map(id => oppCard('arena', id).replace(/data-a="[^"]*"/g, 'data-a="noop"')).join('');
  const res = (half, d) => `<div class="ar-res ${half === 2 ? 'win' : half === 0 ? 'lose' : ''}"><b class="num">${sgn(d)}</b><small>${half === 2 ? 'победа' : half === 0 ? 'поражение' : 'ничья'}</small></div>`;
  const K0 = AR_VIEW.kit, one = half => AE.attack(AD, { r: K0.r, g: K0.g }, { r: K0.r, g: K0.g, lost: 0 }, half), w = one(2), l = one(0), d0 = one(1);
  const divs = AD.league.divisions.map((x, i, a) => `<span class="chip">${x.n} · ${i + 1 === a.length ? `от ${fmt(x.from)}` : i ? `${fmt(x.from)}–${fmt(a[i + 1].from - 1)}` : `до ${fmt(a[i + 1].from - 1)}`}</span>`).join('');
  const en = AD.enerium.map(([top, n], i) => `<span class="chip">${i ? `${AD.enerium[i - 1][0] + 1}–${top}` : '1'} · ${n}</span>`).join('');
  const h2 = x => fmt(Math.floor(x / 100)) + (x % 100 ? ',' + String(x % 100).padStart(2, '0') : '');   // сотые прогона → «1,77»
  const prof = Mo ? Object.entries(Mo.prof).map(([k, x]) => `<tr><td>${{ free: 'обычный', fan: 'увлечённый', payer: 'плательщик' }[k]}</td><td class="n">${Math.floor(x.att / 100)}</td><td class="n">${x.winMed}</td><td class="n">${pct1(x.winBp)}</td><td class="n">${h2(x.en)}</td><td class="n">${h2(x.spent)}</td></tr>`).join('') : '';
  const hund = v => (v < 0 ? '−' : v > 0 ? '+' : '') + h2(Math.abs(v));   // сотые → «−0,03»
  const sh = Mo ? Mo.shifts.map(x => `<tr><td>${x.shift === E.def.shift ? `<b>${x.shift}</b>` : x.shift < 0 ? '−' + -x.shift : x.shift}</td><td class="n">${hund(x.eqGain)}</td><td class="n">${x.drift.map(fmt).join(' → ')}</td></tr>`).join('') : '';
  /* автообновление: тот же сервер — список живёт до конца (прежнее правило) и новый после каждого боя */
  const C0 = Mo && Mo.cmp, PNm = { free: 'обычный', fan: 'увлечённый', payer: 'плательщик' };
  const [was, now] = C0 ? (C0.auto ? [Mo.prof, C0.prof] : [C0.prof, Mo.prof]) : [null, null];
  const au = C0 ? Object.keys(Mo.prof).map(k => `<tr><td>${PNm[k]}</td><td class="n">${h2(was[k].wins)} → ${h2(now[k].wins)}</td><td class="n">${pct1(was[k].winBp)} → ${pct1(now[k].winBp)}</td><td class="n">${h2((now[k].frees || 0) + now[k].refs)}</td><td class="n">${h2(now[k].spent)}</td></tr>`).join('') : '';
  return `<section class="k-box ar-kit" style="grid-column:1/-1" id="kitArena"><h3>Арена и Лига</h3>
    <p class="k-note">Асинхронное PvP: состав соперника виден целиком до атаки, бой решён в момент нажатия и только проверяет ответ. Каждого соперника атакуют один раз за неделю — бой этой пары составов всегда один. Вкладки — Арена, Лига, Оборона.${TM(' §20, ADR-0010. Данные и алгоритм — design/ui/arena.js (tools/content-gen/arena/build.js), черновик — docs/content/арена-и-лига.md, экран — screens/arena.js.')}</p>
    <div class="ar-kg">
      <div class="k-air-r"><b>Карточка соперника</b><div class="ar-list kit">${cards}</div><small>Лица состава, имя, два числа — рейтинг и боевая мощь, один чип — сила против вашего отряда. Нажатие — витрина: состав целиком, ротации, «Выбрать отряд».</small></div>
      <div class="k-air-r"><b>Итог боя</b><div class="row" style="gap:var(--sp-m)">${res(2, w.da)}${res(0, l.da)}${res(1, d0.da)}</div><small>Сдвиг рейтинга крупно, под ним — рейтинг и место. Раунды вышли — побеждает снявший бо́льшую долю здоровья противника.</small></div>
    </div>
    <div class="ar-kg">
      <div class="k-air-r"><b>Итог со статистикой · «Пропустить»</b>${arKitStats()}<small>Тот же вид, что итог Эхо: главное — на виду, «Подробности боя» свёрнуты. Внутри — раунды и павшие, кто сколько нанёс, вылечил и принял, сработавшие способности, ульты — с короной. «Пропустить» есть в каждом бою Арены и Лиги и сразу открывает этот итог: бой решён в момент атаки. У Лиги — строка на каждый бой матча, нажатие раскрывает его статистику.</small></div>
      <div class="k-air-r"><b>Список соперников</b><div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip spirit">${ic('swap')}после боя — новые трое</span><span class="chip">«Обновить» · ${RF.free} в сутки бесплатно</span><span class="chip">дальше ${RF.price.join(' · ')} Энериума</span></div>
        <small>После каждого боя Арены и каждого матча Лиги список новый сам: атакованные и прежние трое — мимо, не хватило новых — добор из прежних. Кнопка итога — «К новым соперникам». «Обновить» руками нужно редко; сколько осталось бесплатных — в подсказке кнопки, дальше цена — на кнопке.${TM(' Список меняет сама операция боя, на сиде сезона и номера списка: повтор номера — тот же список.')}</small></div>
    </div>
    <div class="ar-kg">
      <div class="k-air-r"><b>Лига · дивизионы</b><div class="row" style="gap:6px;flex-wrap:wrap">${divs}</div><small>Три отряда по пять, герой не повторяется. Раунд I — первый против первого; третий — при 1:1.</small></div>
      <div class="k-air-r"><b>Энериум · суточный срез, топ-100</b><div class="row" style="gap:6px;flex-wrap:wrap">${en}</div><small>Место на сервере — раз в сутки. Сундуки — за планки побед и место в конце недели, в «Дарах».</small></div>
    </div>
    ${Mo ? TM(`<div class="ar-kg">
      <div class="k-air-r"><b>Прогон: ${fmt(Mo.players)} игроков × ${Mo.seasons} сезона</b><table class="p-table ar-kt"><thead><tr><th>Профиль</th><th>Атак</th><th>Побед</th><th>Доля</th><th>Энериум</th><th>На обновления</th></tr></thead><tbody>${prof}</tbody></table>
        <small>Планки ${[1, 2, 4, 8].map(x => AD.arena.plank * x).join(' / ')} побед: обычный — третья, увлечённый — четвёртая. Плательщик при той же силе — не больше ×1,7 по победам и Энериуму, обновления не окупаются.</small></div>
      <div class="k-air-r"><b>Сдвиг защиты: выгода равной атаки</b><table class="p-table ar-kt"><thead><tr><th>Сдвиг</th><th>За атаку</th><th>Средний рейтинг по сезонам</th></tr></thead><tbody>${sh}</tbody></table>
        <small>Выбор отряда под соперника — +${Mo.puzzle.pts} ${plural(Mo.puzzle.pts, 'очко', 'очка', 'очков')} Эло. Сдвиг ${E.def.shift} в пользу атакующего возвращает выгоду равной атаки к нулю; буквальное «+50 защитнику» — рост рейтинга от числа атак. Предел — ${EB.roundsOf('pvp')} раундов, таблица ядра: гибель стороны решает ${pct1((Mo.rounds.find(x => x.rounds === EB.roundsOf('pvp')) || { decBp: 0 }).decBp)} боёв.</small></div>
    </div>
    ${C0 ? `<div class="ar-kg">
      <div class="k-air-r"><b>Автообновление списка: прогон</b><table class="p-table ar-kt"><thead><tr><th>Профиль</th><th>Побед за неделю</th><th>Доля побед</th><th>Обновлений руками</th><th>Энериума</th></tr></thead><tbody>${au}</tbody></table>
        <small>Слева — список живёт до конца, справа — новый после каждого боя. Лучший из новой тройки каждый раз — побед больше у всех, а рейтинг сервера выше: выбор соперника — выгода атакующего сверх Эло, недельный сброс её держит. Планки те же: обычный — третья, увлечённый — четвёртая. Руками обновляют реже; платные — ${RF.price.join(', ')}.</small></div>
    </div>` : ''}`) : ''}
  </section>`;
}
let arKitWatch = false;
function arKitPaint() {
  if (arKitWatch || typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.documentElement) return;
  arKitWatch = true;
  let was = !!KH.team;
  new MutationObserver(() => { if (!!KH.team === was) return; was = !!KH.team; const e = document.getElementById('kitArena'); if (e) e.outerHTML = arKitHtml(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: arKitHtml, paint: arKitPaint });
/* карта экранов: «Арена», «Витрина соперника», «Подготовка PvP», «Оборонительный отряд», «Лига» — поле ready карточки «Арена» в MAP (index.html) */

/* ================== сценарии презентации ================== */
/* Лига для показа: коллекция до 15 героев — герои состава с наборами, уровни вокруг отряда; три отряда по пять без повторов */
function lgDemo() {
  const need = AD.league.heroes, F = AR_DEMO.flow;
  if (poolN(S) < need) {
    const rng = AE.makeRng(AE.seedOf('лига|сценарий'));
    const cand = RS.heroes.filter(h => h.c <= S.acc.cycle && !H(h.id) && !(typeof rsOld === 'function' && rsOld(h)) && (typeof hrDraft !== 'function' || hrDraft(h)));
    while (poolN(S) < need && cand.length) {
      const h = cand.splice(rng(cand.length), 1)[0];
      const lvl = Math.max(1, F.lvl + rng(F.spread * 2 + 1) - F.spread), lim = INV.hero.capByLim.findIndex(c => lvl <= c);
      S.rs.owned[h.id] = { lvl, lim: Math.max(0, lim), valor: 0, how: 'gold' };
    }
  }
  const all = SQ.pool().slice(0, need), ids = [];
  for (let i = 0; i < AD.league.teams; i++) {
    const m = all.slice(i * 5, i * 5 + 5), name = F.names[i];
    let s = S.squads.find(x => x.name === name);
    if (!s) { const r = SQ_SRV.create('q' + S.sq.seq); if (r.refuse) break; s = S.squads.find(x => x.id === r.res.id); s.name = name; }
    s.m = m.concat(Array(5 - m.length).fill(null));
    ids.push(s.id);
  }
  ids.forEach((id, i) => SQ.set('league', id, i));
  const G = S.arena.lg; G.wins = Math.max(G.wins, F.wins); G.att = Math.max(G.att, F.att);
  if (!G.opp.length) G.opp = listFor(S, G, 'league');
  syncRanks(S);
}
FLOWS.push(
  ['Арена · соперник целиком', 'Три соперника карточками: лица, рейтинг и мощь. Витрина — состав целиком, ротации, рейтинг за победу и поражение',
    () => { S.route = 'arena'; S.seg.arena = 'arena'; S.overlay = S.arena.opp[0] ? { t: 'opp', arg: S.arena.opp[0] } : null; }],
  ['Арена · атака и итог', 'Подготовка: соперник против своего отряда, пресеты чипами. «В бой» — бой решён сразу, просмотр можно пропустить; итог — сдвиг рейтинга и место, список соперников уже новый',
    () => { S.route = 'arena'; S.seg.arena = 'arena'; S.overlay = null; const id = S.arena.opp[0]; if (!id) return; S.arena.pick = id; ACT.aratk(`${arOp()}|${id}|${(mySquad() || {}).id}`); }],
  ['Арена · пропуск и статистика', '«Пропустить» — сразу итог: сдвиг рейтинга и место на виду, «Подробности боя» — раунды, кто сколько нанёс, вылечил и принял, сработавшие способности и ульты',
    () => { S.route = 'arena'; S.seg.arena = 'arena'; S.overlay = null; const id = S.arena.opp[0]; if (!id) return; S.arena.pick = id; ACT.aratk(`${arOp()}|${id}|${(mySquad() || {}).id}`); arFlowSkip(); }],
  ['Арена · оборона', 'Слепок обороны с мощью, журнал нападений: отбита или пробита, сдвиг рейтинга',
    () => { S.route = 'arena'; S.seg.arena = 'def'; S.overlay = null; }],
  ['Лига · матч', 'Коллекция на 15 героев, три отряда по пять: раунд I — первый против первого, третий — при 1:1. Матч — два или три боя подряд',
    () => { lgDemo(); S.route = 'arena'; S.seg.arena = 'league'; S.overlay = S.arena.lg.opp[0] ? { t: 'lgopp', arg: S.arena.lg.opp[0] } : null; }],
  ['Лига · итог матча', '«Пропустить» в любом бою матча — сразу итог: счёт и рейтинг на виду, строка на каждый бой, нажатие раскрывает его статистику',
    () => { lgDemo(); S.route = 'arena'; S.seg.arena = 'league'; S.overlay = null; const id = S.arena.lg.opp[0]; if (!id) return; ACT.lgplay(`${arOp()}|${id}`); arFlowSkip(); }],
);
/* сценарии: бой только начался — «Пропустить», итог с раскрытой статистикой (у Лиги — первый бой матча) */
function arFlowSkip() {
  const R = S.runs.find(r => r.kind === 'pvp' && !r.over); if (!R) return;
  ACT.arskip(R.id);
  if (S.overlay) { S.overlay.open = 1; render(); }
}

/* для автопроверки tools/content-gen/screens/check_arena.js и консоли */
window.EN_ARENA_UI = { SRV: AR_SRV, DEMO: AR_DEMO, VIEW: AR_VIEW, oppHero, oppBm, teamBm, oppCard, planks, tierOf, arPlace, lgPlace, lgOpen, lgWhy, arOpen, poolN, listFor, freshFor, lgDemo, arPlay, mySquad, power, seasonId,
  statsHtml, kitFight };
})();
