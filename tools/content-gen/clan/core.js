/* EnClan — алгоритмы клана (§24, §25 GDD), общие для калькулятора tools/content-gen/clan/build.js и прототипа: сборщик вставляет
   этот файл в design/ui/clan.js как есть, после данных EN_CLAN. Числа — только из данных D = EN_CLAN, здесь — алгоритм.
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

/* ---------- древо (§24.2) ---------- */
const lvlRow = (D, L) => D.tree.levels[L - 1] || null;
/* вместимость: база и +1 за каждый десятый уровень */
const capacity = (D, lvl) => D.capacity.base + fl(lvl, D.capacity.every) * D.capacity.add;
/* вехи, уже взятые уровнем: +1 атака КБ, пул элит, скорость резервуара, длительность бонусов */
function milestones(D, lvl) {
  const out = { attack: 0, cap: 0, pool: 0, speed: 0, dur: 0 };
  for (let L = 1; L <= Math.min(lvl, D.tree.levels.length); L++) { const m = lvlRow(D, L).mile; if (m) out[m.k] += m.v; }
  return out;
}
const attacksDay = (D, lvl) => D.boss.attacks.day + milestones(D, lvl).attack;
const walletCap = (D, lvl) => attacksDay(D, lvl) * (1 + D.boss.attacks.carryDays);
const elitePool = (D, lvl) => Math.min(D.boss.poolMax, D.boss.pool + milestones(D, lvl).pool);
const resSpeedBp = (D, lvl) => milestones(D, lvl).speed;
/* выбранные пассивки: picks — индекс выбранной альтернативы по уровням 1…lvl; сумма значений по виду k (и параметру p) */
function picked(D, picks, lvl) {
  const out = [];
  for (let L = 1; L <= lvl; L++) { const row = lvlRow(D, L), i = picks ? picks[L - 1] : null; if (row && i != null && row.alts[i]) out.push(Object.assign({ L }, row.alts[i])); }
  return out;
}
function bonus(D, picks, lvl) {
  const sum = {};
  for (const a of picked(D, picks, lvl)) { const key = a.k + (a.p ? ':' + a.p : ''); sum[key] = (sum[key] || 0) + a.v; }
  return sum;
}
/* раундов в атаке: база режима и «Ещё раунд» из древа */
function rounds(D, g, picks, lvl) { const b = bonus(D, picks, lvl); return D.boss.rounds[g] + (b[g === 'b' ? 'roundB' : 'roundE'] || 0); }

/* ---------- клановый босс (§25) ---------- */
/* сила врагов круга: 12 + уровень, × xBp за круг — «статы элит и КБ × X» (§25.2, главная ручка режима) */
function circlePow(D, k) { const C = D.boss.circle; let v = C.pow1; for (let i = 1; i < k; i++) v = fl(v * C.xBp, D.bp); return v; }
const circleLvl = (D, k) => circlePow(D, k) - D.boss.circle.lvlDiv;
/* очки врага круга: элита платит меньше КБ, очки растут с кругом (§25.3) */
function points(D, k, g) { const P = D.boss.points; let v = g === 'b' ? P.boss : P.elite; for (let i = 1; i < k; i++) v = fl(v * P.yBp, D.bp); return v; }
/* элиты круга: стихия — чистый рандом из семи (§25.2, п. 2), класс — из шести боевых классов (§36.15); сид — от сервера */
function roll(D, key, n) {
  const r = EB().makeRng(EB().seedOf(key)), B = D.boss;
  return Array.from({ length: n }, () => { const el = D.lists.els[r(D.lists.els.length)]; return { el, cls: B.classes[r(B.classes.length)] }; });
}
/* набор врага из общей библиотеки: школа — стихия врага, приёмы — по классу, число и доли хода — по рангу (ADR-0016) */
function kit(D, g, cls, el) {
  const B = D.boss, R = g === 'b' ? B.rank.b : B.rank.e, K = g === 'b' ? B.kinds.b : B.kinds.e[cls];
  const acts = K.filter(k => !k.startsWith('ult.')).slice(0, R.acts), ults = K.filter(k => k.startsWith('ult.')).slice(0, R.ults);
  return { rank: R.core, actPct: R.share[0], ultPct: R.share[1], kit: acts.map(k => ({ v: 0, slot: 'act', id: el + '.' + k })).concat(ults.map(k => ({ v: 0, slot: 'ult', id: el + '.' + k }))) };
}
/* босс недели расы: стихия и класс — таблица контента (§25.4); пока её нет у автора — заглушка данных */
const bossOf = (D, race) => D.boss.races[race] || D.boss.races[Object.keys(D.boss.races)[0]];
/* карта врага для ядра: o — { g: 'e' | 'b', uid, cls, el, race, k — круг, name }; здоровье — maxHp ядра (EnBattle.foeMaxHp) */
function card(D, o) {
  const B = D.boss, g = o.g, cls = g === 'b' ? B.bossCls : o.cls, tpl = g === 'b' ? B.tpl.b : B.tpl.e[cls];
  const src = { key: 'клан:' + o.uid + '#0', id: 'клан:' + o.uid, name: o.name || '', cls, el: o.el, lvl: circleLvl(D, o.k), st: tpl.slice(),
    hpPct: B.hp[g], rank: g === 'b' ? B.rank.b.core : B.rank.e.core, race: o.race, kit: kit(D, g, cls, o.el) };
  src.maxHp = EB().foeMaxHp(src);
  return src;
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

/* ---------- награды: место клана → пул раздачи (§24.4, §23) ---------- */
/* строка мест кланов lootboxes.js: наименьший «топ-N», куда место входит; у клана вне топа — «все с очками» */
function tier(L, place, pts) {
  const M = L && L.modes.clan, ly = M ? M.layers.find(x => x.kind === 'place' && x.clan) : null;
  if (!ly || !place || !(pts > 0)) return null;
  return ly.rows.filter(r => r.top && place <= r.top).sort((a, b) => a.top - b.top)[0] || ly.rows.find(r => r.top === 0) || null;
}
/* ступень сундука раздачи: редкость = цикл получателя − 1 + ступень; клан из разных циклов делит одни места, а не одни предметы */
const stepsOf = (row, c) => (row.cyc[c] || []).map(g => ({ step: g.r - (c - 1), count: g.count, win: g.win }));
const rOf = (step, c) => Math.max(1, Math.min(7, c - 1 + step));
/* пул клана: на каждого участника — сундуки строки места; по ступеням */
function pool(L, place, pts, members, c) {
  const row = tier(L, place, pts); if (!row) return { row: null, groups: [] };
  const by = new Map();
  for (const g of stepsOf(row, c)) { const k = g.step + ':' + g.win, x = by.get(k); if (x) x.count += g.count * members; else by.set(k, { step: g.step, win: g.win, count: g.count * members }); }
  return { row, groups: [...by.values()].sort((a, b) => b.step - a.step) };
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

/* ---------- боевая мощь (§6, слой 0), как у бестиария биомов ---------- */
function isqrt(n) { if (n < 2) return n; let x = Math.floor(Math.sqrt(n)); while (x * x > n) x--; while ((x + 1) * (x + 1) <= n) x++; return x; }
function bm(D, u) {
  const R = EB().RULES, kl = R.K * u.lvl, cap = R.caps.defPct * 100;
  const mit = k => Math.min(cap, fl(u.def[k] * 10000, kl + u.def[k]));
  const m = fl(mit('str') + mit('int'), 2);
  const dps = fl(u.atk[u.main] * u.as * (1000000 + u.crit * (u.critDmg - 100)), 100000000);
  const ehp = fl(fl(u.maxHp * 10000, 10000 - m) * 10000, 10000 - u.eva);
  return fl(D.boss.bmC * isqrt(dps * ehp), 100);
}
/* мощь карты врага: единица ядра той же карты */
function cardBm(D, src) { const b = EB().create({ mode: 'rounds', seed: 1, heroes: [], foes: [src] }); return bm(D, b.u[1][0]); }

root.EnClan = { iroot, need, capacity, milestones, attacksDay, walletCap, elitePool, resSpeedBp, picked, bonus, rounds,
  circlePow, circleLvl, points, roll, kit, bossOf, card, share, payout, tier, stepsOf, rOf, pool, halves, contrib, serverSplit, bm, cardBm };
})(typeof window !== 'undefined' ? window : globalThis);
