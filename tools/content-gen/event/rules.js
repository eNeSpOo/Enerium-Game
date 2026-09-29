/* Событие недели — алгоритм «сервера», общий для калькулятора и прототипа. Сборщик tools/content-gen/event/build.js вставляет
   этот файл в design/ui/event.js как есть. Ориентир для серверного ядра на C#, а не код игры: очки, планки и места решает
   только сервер по подтверждённым делам (GDD §27, §34.1, §36.16).
   Только целые числа. Проценты и множители — базисные пункты: 10 000 = 100 %. Округление — вниз, один раз на операцию.

   Очки за дело: цена единицы × количество × акцент недели × сила коллекции (РП1, §10.3):
     очки = ⌊ цена × n × акцент × (10 000 + РП1) / 10 000² ⌋, где акцент — 15 000 у занятия недели, иначе 10 000.
   Сила коллекции — то же правило, что collRp прототипа (index.html, §10.3; ADR-0031, п. 18): за героя — 5 б. п. × редкость × цикл
   героя × круг; круг — 2^доблесть, если предел k нового круга пройден; не пройденный заново предел держит прошлый круг — 2^(доблесть − 1),
   если был пройден до доблести; иначе 0. Сумма — не выше потолка. Дневные потолки единиц одинаковы для всех (§1.2).
   Планки личные: пороги цикла из данных, соседние — ×2 (лутбоксы). Клановые: планка k — сумма по участникам клана первого личного
   порога его цикла × clanX[k] / 100 (ADR-0031, п. 12: третья — ×1,5 второй).
   Место: линейно между опорами «место → очки» своего цикла; выше первой опоры — место 1. */
(function (root) {
'use strict';

const BP = 10000;

/* акцент недели: у занятия недели — множитель из данных, у остальных — 10 000 */
function accentBp(D, race, unit) {
  const W = D.weeks[race];
  return W && W.accent.units.includes(unit) ? W.accent.bp : BP;
}

/* вклад героя в РП k, б. п. — правило collHero прототипа (index.html): предел РП k — lim + k − 1; keep — пределы прошлого круга
   (после обычной доблести — все, rp1.limits; после руны обучения — сколько было, §16) */
function rpHero(D, h, k) {
  const R = D.rp1;
  if (!h) return 0;
  const need = R.lim + (k || 1) - 1, v = Math.max(0, Math.min(R.maxValor, h.valor || 0));
  const keep = Number.isInteger(h.keep) ? h.keep : R.limits;
  const circle = (h.lim || 0) >= need ? Math.pow(2, v) : v > 0 && keep >= need ? Math.pow(2, v - 1) : 0;
  return R.perBp * (h.r || 0) * (h.c || h.cycle || 0) * circle;
}
/* сила коллекции РП k в б. п. (по умолчанию РП1 — Событие): heroes — [{ r, c, lim, valor, keep }], сумма не выше потолка */
function rp1Bp(D, heroes, k) {
  return Math.min(D.rp1.capBp, (heroes || []).reduce((a, h) => a + rpHero(D, h, k || 1), 0));
}

/* очки за операцию: unit — единица из D.units, n — количество, o = { race, rp1 } */
function pts(D, unit, n, o) {
  const U = D.units[unit];
  if (!U || !(n > 0)) return 0;
  const a = accentBp(D, o && o.race, unit), b = BP + Math.max(0, (o && o.rp1) || 0);
  return Math.floor(U.price * n * a * b / (BP * BP));
}

/* сколько единиц дела можно засчитать сегодня: дневной потолок минус уже засчитанное */
function room(D, unit, usedToday) {
  const cap = D.caps[unit];
  return cap == null ? Infinity : Math.max(0, cap - (usedToday || 0));
}

/* пороги личных планок цикла; до первого цикла События — пусто */
const planks = (D, c) => (D.planks[c] || []).slice();

/* клановые планки по составу: cycles — циклы участников клана; каждый приносит первый личный порог своего цикла × clanX / 100 */
function clanPlanks(D, cycles) {
  return D.clanX.map(x => cycles.reduce((a, c) => a + Math.floor(((D.planks[c] || [])[0] || 0) * x / 100), 0));
}

/* сколько порогов взято */
const reached = (needs, have) => needs.filter(x => have >= x).length;

/* место по очкам: опоры [[место, очки], …] по возрастанию места и убыванию очков */
function place(anchors, v) {
  if (!anchors.length) return null;
  if (v >= anchors[0][1]) return anchors[0][0];
  for (let i = 1; i < anchors.length; i++) {
    const [p0, v0] = anchors[i - 1], [p1, v1] = anchors[i];
    if (v >= v1) return p0 + Math.floor((p1 - p0) * (v0 - v) / (v0 - v1));
  }
  const [pl, vl] = anchors[anchors.length - 1];
  return v > 0 ? pl + Math.floor(pl * (vl - v) / vl) : null;
}

/* очки опоры места: обратное к place — сколько очков у места p */
function pointsAt(anchors, p) {
  if (!anchors.length) return 0;
  if (p <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    const [p0, v0] = anchors[i - 1], [p1, v1] = anchors[i];
    if (p <= p1) return v0 - Math.floor((v0 - v1) * (p - p0) / (p1 - p0));
  }
  return anchors[anchors.length - 1][1];
}

/* опоры рейтинга цикла в очках: доли пятой личной планки (или клановой суммы) в б. п. */
const anchorsOf = (rows, base) => rows.map(([p, bp]) => [p, Math.floor(base * bp / BP)]);

const api = { BP, accentBp, rpHero, rp1Bp, pts, room, planks, clanPlanks, reached, place, pointsAt, anchorsOf };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (root) root.EnEvent = api;
})(typeof window !== 'undefined' ? window : null);
