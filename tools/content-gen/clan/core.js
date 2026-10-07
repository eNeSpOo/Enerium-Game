/* EnClan — алгоритмы клана (§24, §25 GDD; ADR-0042 — клан и разные циклы), общие для калькулятора tools/content-gen/clan/build.js
   и прототипа: сборщик вставляет этот файл в design/ui/clan.js как есть, после данных EN_CLAN. Числа — только из данных D = EN_CLAN,
   здесь — алгоритм.
   Только целые: доли — в базисных пунктах (10 000 = 100 %), большие произведения — BigInt. Случайность — генератор ядра боя
   (EnBattle.makeRng на сиде EnBattle.seedOf): в игре сид выдаёт сервер. Ядро боя подключено раньше — battle.js. */
(function (root) {
'use strict';
const fl = (a, b) => Math.floor(a / b);
const EB = () => root.EnBattle;

/* ---------- резервуар (§24.3) ---------- */
/* целый корень степени q: наибольшее r, у которого r^q ≤ x (x — BigInt) */
function iroot(x, q) {
  if (x < 2n) return x;
  const Q = BigInt(q);
  let lo = 1n, hi = 1n;
  while (hi ** Q <= x) hi *= 2n;
  while (lo + 1n < hi) { const m = (lo + hi) / 2n; if (m ** Q <= x) lo = m; else hi = m; }
  return lo;
}
/* сколько очков контрактов нужно резервуару на n-е очко навыков: floor(База × n^(p/q)); показатель — дробь [p, q] в данных */
function need(D, n) {
  const [p, q] = D.res.exp;
  return Number(iroot(BigInt(D.res.base) ** BigInt(q) * BigInt(n) ** BigInt(p), q));
}

/* ---------- древо (§24.2; слово автора 29.09.2026) ----------
   Уровень клана — потраченные очки навыков. Вехи — от уровня и после сброса остаются: каждый 5-й уровень — +1 атака по врагам клана
   в день, каждый 10-й — +1 место. Пассивки и вилки — от выбора главы (picks): сброс древа снимает их, уровень остаётся */
const lvlRow = (D, L) => D.tree.levels[L - 1] || null;
/* вехи, уже взятые уровнем: { attack, cap } — сумма вех уровней 1…lvl */
function milestones(D, lvl) {
  const out = Object.fromEntries(Object.keys(D.tree.mileName).map(k => [k, 0]));
  for (let L = 1; L <= Math.min(lvl, D.tree.levels.length); L++) for (const m of lvlRow(D, L).mile || []) out[m.k] += m.v;
  return out;
}
/* вместимость: база и вехи мест */
const capacity = (D, lvl) => D.capacity.base + milestones(D, lvl).cap * D.capacity.add;
/* выбранные пассивки: picks — индекс выбранной альтернативы по уровням 1…lvl */
function picked(D, picks, lvl) {
  const out = [];
  for (let L = 1; L <= Math.min(lvl, D.tree.levels.length); L++) { const row = lvlRow(D, L), i = picks ? picks[L - 1] : null; if (row && i != null && row.alts[i]) out.push(Object.assign({ L }, row.alts[i])); }
  return out;
}
/* сумма значений по виду k (и параметру p): ключ «k» или «k:p» */
function bonus(D, picks, lvl) {
  const sum = {};
  for (const a of picked(D, picks, lvl)) { const key = a.k + (a.p ? ':' + a.p : ''); sum[key] = (sum[key] || 0) + a.v; }
  return sum;
}
/* сумма выбранного по действию в бою клана: t — вид действия из D.tree.kinds[k].fx */
function fxSum(D, picks, lvl, t) {
  let v = 0;
  for (const a of picked(D, picks, lvl)) { const F = D.tree.kinds[a.k].fx; if (F && F.t === t) v += a.v; }
  return v;
}
const attacksDay = (D, lvl) => D.boss.attacks.day + milestones(D, lvl).attack;
/* кошелёк атак: дневная норма и ещё carryDays норм — копить для босса; вилка «Запас атак» — ещё норма */
const walletCap = (D, lvl, picks) => attacksDay(D, lvl) * (1 + D.boss.attacks.carryDays + fxSum(D, picks, lvl, 'carry'));
/* элит в круге: база и вилка «Шире круг», не выше потолка */
const elitePool = (D, lvl, picks) => Math.min(D.boss.poolMax, D.boss.pool + fxSum(D, picks, lvl, 'pool'));
/* резервуар быстрее, б. п.: ключ ветки «Клан» — в процентах */
const resSpeedBp = (D, lvl, picks) => fxSum(D, picks, lvl, 'speed') * fl(D.bp, 100);
/* раундов в атаке: таблица ядра и вилка «Долгий бой» — только у элиты, не выше потолка */
function rounds(D, g, picks, lvl) { return D.boss.rounds[g] + (g === 'e' ? Math.min(D.tree.caps.kbRound, fxSum(D, picks, lvl, 'rounds')) : 0); }
/* класс героя по каноническому списку: у прототипа бывают прежние имена — «Хилер», «Дебаффер» */
const clsOf = (D, c) => D.tree.clsAlias[c] || c;
/* стихия героя сильнее стихии цели — по таблице ядра (§3.1): круг четырёх и пара Свет — Тьма */
const edge = (a, d) => EB().elemMul ? EB().elemMul(a, d) > EB().RULES.elem.base : false;
/* прибавки древа к одной атаке клана: g — 'e' элита со свитой или 'b' босс. Сервер кладёт их в карты при сборке боя: урон — aura.dmgUp,
   вампиризм — aura.lifesteal, крит — critDmg, щиты — пассивка shieldUp, здоровье — hpPct карты героя, свита — hpPct приспешников.
   Все значения — целые проценты из данных; вид действия — fx у вида пассивки */
function fightMods(D, picks, lvl, g) {
  const M = { dmg: 0, cls: {}, el: {}, edge: 0, hp: 0, hpCls: {}, shield: 0, crit: 0, leech: 0, retinue: 0 };
  for (const a of picked(D, picks, lvl)) {
    const F = D.tree.kinds[a.k].fx; if (!F || (F.on && F.on !== g)) continue;
    if (F.t === 'dmg') { if (F.edge) M.edge += a.v; else if (F.by === 'cls') M.cls[a.p] = (M.cls[a.p] || 0) + a.v; else if (F.by === 'el') M.el[a.p] = (M.el[a.p] || 0) + a.v; else M.dmg += a.v; }
    else if (F.t === 'hp') { if (F.by === 'cls') M.hpCls[a.p] = (M.hpCls[a.p] || 0) + a.v; else M.hp += a.v; }
    else if (F.t === 'shield') M.shield += a.v;
    else if (F.t === 'crit') M.crit += a.v;
    else if (F.t === 'leech') M.leech += a.v;
    else if (F.t === 'retinue' && g === 'e') M.retinue += a.v;
  }
  M.retinue = Math.min(M.retinue, D.tree.caps.kbRetinue);
  return M;
}
/* прибавка урона героя в этом бою, %: общая, класса, стихии и «сильная стихия» против стихии цели */
const heroDmg = (D, M, u, el) => M.dmg + (M.cls[clsOf(D, u.cls)] || 0) + (M.el[u.el] || 0) + (M.edge && edge(u.el, el) ? M.edge : 0);
const heroHp = (D, M, h) => M.hp + (M.hpCls[clsOf(D, h.cls)] || 0);
const hasMods = M => !!M && Object.values(M).some(v => typeof v === 'number' ? v : Object.keys(v).length);

/* ---------- клан и разные циклы (ADR-0042) ----------
   Вклад участника засчитывается в долях нормы своего цикла: у каждого режима норма цикла — его первая личная планка (D.norm[режим][цикл]).
   Клановые суммы — резервуар, клановые планки, места клана — складывают вклады в одних единицах: в очках базового цикла D.norm.base
   или в очках цикла того, кто смотрит. Клановый босс нормирует сам бой: атакующий бьёт копию цели в силе своего цикла,
   урон засчитывается долей её здоровья (D.boss.bar). Очки врага от цикла не зависят */
/* цикл в пределах данных: ниже первого — первый, выше последнего — последний */
const cycOf = (D, c) => { const L = D.cycles; return L.includes(c) ? c : c < L[0] ? L[0] : L[L.length - 1]; };
/* очки режима mode из цикла from в очки цикла to: × норма to / норма from, вниз; без нормы режима — как есть */
function toCycle(D, mode, pts, from, to) {
  const N = D.norm[mode]; if (!N) return pts;
  const a = N[cycOf(D, from)], b = N[cycOf(D, to)];
  return a === b ? pts : Number(BigInt(Math.max(0, pts)) * BigInt(b) / BigInt(a));
}
/* засчитано клану: очки режима в очках базового цикла */
const counted = (D, mode, pts, c) => toCycle(D, mode, pts, c, D.norm.base);
/* клановая сумма в очках цикла to: members — [{ c, pts }], каждый — в пересчёте из своего цикла */
const clanSum = (D, mode, members, to) => members.reduce((a, m) => a + toCycle(D, mode, m.pts || 0, m.c, to), 0);

/* ---------- клановый босс (§25) ---------- */
/* сила врагов круга: 12 + уровень, × xBp за круг — «статы элит и КБ × X» (§25.2, главная ручка режима). c — цикл атакующего:
   круг 1 его копии — byCyc[c] (сила базового круга × норма цикла c / норма базового цикла); без цикла — базовый */
function circlePow(D, k, c) { const C = D.boss.circle; let v = c && C.byCyc ? C.byCyc[cycOf(D, c)] : C.pow1; for (let i = 1; i < k; i++) v = fl(v * C.xBp, D.bp); return v; }
const circleLvl = (D, k, c) => circlePow(D, k, c) - D.boss.circle.lvlDiv;
/* общий счёт цели — доля её здоровья, D.boss.bar частей. Копия цикла c с максимумом maxHp входит в атаку с остатком hpIn; после боя
   доля left' такова, что жива копия — жива и цель, пала копия — пала цель. Целые, произведения — BigInt */
const B_ = x => BigInt(Math.max(0, x));
const ceilDiv = (a, b) => (a + b - 1n) / b;
function hpIn(D, left, maxHp) { return left <= 0 ? 0 : Number(ceilDiv(B_(maxHp) * B_(left), B_(D.boss.bar))); }
function leftAfter(D, left, maxHp, hpOut) {
  if (hpOut <= 0 || left <= 0) return 0;
  const v = Number(ceilDiv(B_(hpOut) * B_(D.boss.bar), B_(Math.max(1, maxHp))));
  return Math.min(left, Math.max(1, v));
}
/* сколько долей сняла атака: остаток до боя минус остаток после */
const shareOff = (D, left, maxHp, hpOut) => left - leftAfter(D, left, maxHp, hpOut);
/* очки врага круга: элита платит меньше КБ, очки растут с кругом (§25.3) */
function points(D, k, g) { const P = D.boss.points; let v = g === 'b' ? P.boss : P.elite; for (let i = 1; i < k; i++) v = fl(v * P.yBp, D.bp); return v; }
/* ---------- сонмы стихий (слово автора 29.09.2026; данные — D.boss.host из tools/content-gen/clan/foes.js) ----------
   Семь стихий, в сонме восемь фигур: Голос (элита, маг ДД) и Хозяин (клановый босс, маг ДД), Щит и Лекарь — на обоих этажах, двое Пут —
   у Голоса, Клинок и Стрела — у Хозяина. Фигура — id «<стихия>-<роль>»: у каждой стихии один Голос и один Хозяин */
const HO = D => D.boss.host;
const leadRole = g => g === 'b' ? 'boss' : 'elite';
/* фигура сонма по стихии и роли: { id, el, role, n, look, tip } или null */
function fig(D, el, role) { const h = HO(D).hosts.find(x => x.el === el); return h ? HO(D).figs[h.id + '-' + role] || null : null; }
/* элиты круга: стихии — чистый случай из семи (§25.2, п. 2), без повторов в круге — у стихии один Голос; сид — от сервера.
   Порядок обращений к генератору: одно на элиту — индекс среди ещё не выпавших стихий */
function roll(D, key, n) {
  const r = EB().makeRng(EB().seedOf(key)), els = D.lists.els.slice(), out = [];
  for (let i = 0; i < n && els.length; i++) out.push({ el: els.splice(r(els.length), 1)[0] });
  return out;
}
/* набор цели из общей библиотеки: школа — стихия, приёмы — по роли (Голос или Хозяин), число и доли хода — по рангу (ADR-0016) */
function kit(D, g, el) {
  const B = D.boss, R = g === 'b' ? B.rank.b : B.rank.e, K = g === 'b' ? B.kinds.b : B.kinds.e;
  const acts = K.filter(k => !k.startsWith('ult.')).slice(0, R.acts), ults = K.filter(k => k.startsWith('ult.')).slice(0, R.ults);
  return { rank: R.core, actPct: R.share[0], ultPct: R.share[1], kit: acts.map(k => ({ v: 0, slot: 'act', id: el + '.' + k })).concat(ults.map(k => ({ v: 0, slot: 'ult', id: el + '.' + k }))) };
}
/* Хозяин недели расы (§25.4 — таблица контента): { el, civ, why } — стихия, цивилизация Эхо недели и почему он встаёт */
const bossOf = (D, race) => D.boss.weeks[race] || D.boss.weeks[Object.keys(D.boss.weeks)[0]];
/* карта цели для ядра: o — { g: 'e' | 'b', uid, el, k — круг, c — цикл атакующего, name }; Голос или Хозяин стихии el; раса — сонмов;
   сила — копия круга k в цикле c (ADR-0042); здоровье — maxHp ядра этой копии */
function card(D, o) {
  const B = D.boss, g = o.g, role = leadRole(g), f = fig(D, o.el, role);
  const src = { key: 'клан:' + o.uid + '#0', id: 'клан:' + o.uid, name: o.name || (f ? f.n : ''), cls: HO(D).roles[role].cls, el: o.el, lvl: circleLvl(D, o.k, o.c),
    st: HO(D).tpl[role].slice(), hpPct: B.hp[g], rank: g === 'b' ? B.rank.b.core : B.rank.e.core, race: HO(D).race, fig: f ? f.id : '', kit: kit(D, g, o.el) };
  src.maxHp = EB().foeMaxHp(src);
  return src;
}

/* свита этажа (слово автора 29.09.2026: «он и 4 свиты»): у Голоса — Щит, Лекарь и двое Пут, у Хозяина — Щит, Лекарь, Клинок и Стрела,
   все — стихии цели. Характеристики — рядовые Мастерской того же класса, набор — одна способность школы своей стихии (ранг рядовой, ADR-0016).
   src — карта цели (card) */
function retinue(D, src) {
  const H = HO(D), g = src.rank === D.boss.rank.b.core ? 'b' : 'e', floor = H.floors[g], R = H.rank;
  if (!floor) return [];
  return floor.map((role, j) => {
    const f = fig(D, src.el, role), X = H.roles[role];
    return { key: src.id + '#' + (j + 1), id: src.id + ':' + (j + 1), name: f ? f.n : X.n, cls: X.cls, el: src.el, lvl: src.lvl, st: H.tpl[role].slice(), hpPct: H.hp[role],
      rank: R.core, race: H.race, fig: f ? f.id : '', kit: { rank: R.core, actPct: R.share[0], ultPct: R.share[1], kit: [{ v: 0, slot: 'act', id: src.el + '.' + X.kind }] } };
  });
}
/* бой одной атаки клана: цель — первая карта, её здоровье копится между атаками; свита цели — свежая; бой кончается, когда цель пала.
   src — карта цели с hp и maxHp цели, если она уже ранена: остаток — её максимум в этой атаке (осада ядра, RULES.siege).
   M — прибавки древа (fightMods): здоровье героев и свиты — в картах до боя, урон, вампиризм, крит и щиты — в единицах ядра после сборки */
function battle(D, heroes, src, seed, maxRounds, M) {
  const on = hasMods(M), g = src.rank === D.boss.rank.b.core ? 'b' : 'e';
  const hs = on ? heroes.map(h => { const x = heroHp(D, M, h); return x ? Object.assign({}, h, { hpPct: fl((h.hpPct || 100) * (100 + x), 100) }) : h; }) : heroes;
  let guards = retinue(D, src);
  if (on && M.retinue) guards = guards.map(u => Object.assign({}, u, { hpPct: Math.max(1, fl(u.hpPct * (100 - M.retinue), 100)) }));
  const b = EB().targetBattle(hs, { seed, g, main: src, guards, maxRounds, endOnMain: true });
  if (on) for (const u of b.u[0]) {
    const d = heroDmg(D, M, u, src.el);
    if (d) u.aura.dmgUp += d * fl(D.bp, 100);
    if (M.leech) u.aura.lifesteal += M.leech * fl(D.bp, 100);
    if (M.crit) u.critDmg += M.crit;
    if (M.shield) u.lpas.push({ pas: 'shieldUp', pct: M.shield, id: 'клан:щиты' });
  }
  return b;
}

/* ---------- очки и вклад ---------- */
/* целая доля по весам: сумма ровно total; остаток — наибольшим дробным остаткам, при равенстве — большему весу, затем порядку */
function share(total, w) {
  const W = w.map(x => BigInt(Math.max(0, x))), sum = W.reduce((a, x) => a + x, 0n), T = BigInt(Math.max(0, total));
  if (!sum || !T) return w.map(() => 0);
  const base = W.map(x => x * T / sum), rem = W.map((x, i) => ({ i, r: x * T % sum }));
  let left = Number(T - base.reduce((a, x) => a + x, 0n));
  rem.sort((a, b) => (b.r > a.r ? 1 : b.r < a.r ? -1 : 0) || (W[b.i] > W[a.i] ? 1 : W[b.i] < W[a.i] ? -1 : 0) || a.i - b.i);
  const out = base.map(Number);
  for (let j = 0; j < left; j++) out[rem[j].i]++;
  return out;
}
/* выплата за павшего врага (§25.3): очки врага по снятому здоровью; бонуса за добивание нет; кто ушёл из клана до смерти врага — очки
   клану не приносит (анти-прыгун), его доля сгорает для клана, личные очки остаются ему. dmg — { участник: снято } */
function payout(total, dmg) {
  const ids = Object.keys(dmg).filter(id => dmg[id] > 0), got = share(total, ids.map(id => dmg[id]));
  return Object.fromEntries(ids.map((id, i) => [id, got[i]]));
}

/* ---------- ступени кланового босса (ADR-0047): личные — по личным очкам недели, клановые — по кругам недели ----------
   Данные — D.boss.ladder: plank1 — первая личная ступень в личных очках недели на своей копии цели, одна на все циклы (очки врага от
   цикла не зависят, ADR-0042); circles — пороги клановых ступеней: сколько кругов клан взял за неделю. Множители личных ступеней
   и сундуки ступеней — строки режима «Клановый босс» в lootboxes.js: их ведёт сборщик сундуков */
/* сколько кругов клан взял за неделю: круг взят, когда пал его Хозяин; circle — номер круга, что стоит сейчас */
const circlesDone = circle => Math.max(0, circle - 1);
/* порог личной ступени с множителем x */
const myNeed = (D, x) => D.boss.ladder.plank1 * x;
/* сколько личных ступеней взято: xs — множители ступеней по возрастанию */
function myStep(D, xs, pts) { let k = 0; for (const x of xs) if (pts >= myNeed(D, x)) k++; return k; }
/* сколько клановых ступеней взято кругами done */
function clanStep(D, done) { let k = 0; for (const at of D.boss.ladder.circles) if (done >= at) k++; return k; }

/* ---------- награды: клановые ступени и место клана → пул раздачи (§24.4, §23) ---------- */
/* строка мест кланов lootboxes.js: наименьший «топ-N», куда место входит; у клана вне топа строки места нет — ему платят клановые ступени */
function tier(L, place, pts) {
  const M = L && L.modes.clan, ly = M ? M.layers.find(x => x.kind === 'place' && x.clan) : null;
  if (!ly || !place || !(pts > 0)) return null;
  return ly.rows.filter(r => r.top && place <= r.top).sort((a, b) => a.top - b.top)[0] || null;
}
/* строки клановых ступеней lootboxes.js, взятые кругами недели done: слой клановых планок режима, порог at — кругов */
function circleRows(L, done) {
  const M = L && L.modes.clan, ly = M ? M.layers.find(x => x.kind === 'plank' && x.clan) : null;
  return ly ? ly.rows.filter(r => r.at != null && done >= r.at) : [];
}
/* ступень сундука раздачи: редкость = цикл получателя − 1 + ступень; клан из разных циклов делит одни места, а не одни предметы */
const stepsOf = (row, c) => (row.cyc[c] || []).map(g => ({ step: g.r - (c - 1), count: g.count, win: g.win }));
const rOf = (step, c) => Math.max(1, Math.min(7, c - 1 + step));
/* пул клана: на каждого участника — сундуки строки места и строк клановых ступеней, взятых кругами недели done; по ступеням сундука.
   row — строка места или null, steps — сколько клановых ступеней вошло в пул */
function pool(L, place, pts, members, c, done) {
  const row = tier(L, place, pts), taken = circleRows(L, done || 0), by = new Map();
  for (const r of (row ? [row] : []).concat(taken)) for (const g of stepsOf(r, c)) { const k = g.step + ':' + g.win, x = by.get(k); if (x) x.count += g.count * members; else by.set(k, { step: g.step, win: g.win, count: g.count * members }); }
  return { row, steps: taken.length, groups: [...by.values()].sort((a, b) => b.step - a.step) };
}
/* половина пула — сервер по вкладу, половина — глава (§24.4): по каждой ступени; нечётный сундук — главе */
function halves(D, groups) { return groups.map(g => ({ step: g.step, win: g.win, count: g.count, server: fl(g.count * D.rewards.splitBp, D.bp), head: g.count - fl(g.count * D.rewards.splitBp, D.bp) })); }
/* вклад участника за неделю (§24.4): доля в резервуаре и доля в очках КБ по весам данных, б. п. × 10 000 */
function contrib(D, members) {
  const R = D.rewards.contrib, res = members.reduce((a, m) => a + (m.res || 0), 0), boss = members.reduce((a, m) => a + (m.boss || 0), 0);
  return members.map(m => (res ? fl((m.res || 0) * R.resBp * D.bp, res) : 0) + (boss ? fl((m.boss || 0) * R.bossBp * D.bp, boss) : 0));
}
/* серверная половина: по каждой ступени — доли по вкладу */
function serverSplit(D, groups, members) {
  const w = contrib(D, members);
  return halves(D, groups).map(g => ({ step: g.step, win: g.win, got: share(g.server, w) }));
}

/* ---------- боевая мощь (§6), как у бестиария биомов: функция ядра со слоем 1 — вкладом способностей (ADR-0051) ---------- */
function isqrt(n) { if (n < 2) return n; let x = Math.floor(Math.sqrt(n)); while (x * x > n) x--; while ((x + 1) * (x + 1) <= n) x++; return x; }
function bm(D, u) { return EB().bm(u, D.boss.bmC); }
/* мощь карты врага: единица ядра той же карты */
function cardBm(D, src) { const b = EB().create({ mode: 'rounds', seed: 1, heroes: [], foes: [src] }); return bm(D, b.u[1][0]); }

root.EnClan = { iroot, need, capacity, milestones, attacksDay, walletCap, elitePool, resSpeedBp, picked, bonus, fxSum, rounds, clsOf, edge, fightMods, heroDmg, heroHp,
  cycOf, toCycle, counted, clanSum, hpIn, leftAfter, shareOff,
  circlePow, circleLvl, points, fig, roll, kit, bossOf, card, retinue, battle, share, payout,
  circlesDone, myNeed, myStep, clanStep, tier, circleRows, stepsOf, rOf, pool, halves, contrib, serverSplit, bm, cardBm };
})(typeof window !== 'undefined' ? window : globalThis);
