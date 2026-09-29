/* Боевой пропуск и лист даров — алгоритм «сервера», общий для калькулятора и прототипа. Сборщик tools/content-gen/pass/build.js
   вставляет этот файл в design/ui/pass.js как есть. Ориентир для серверного ядра на C#, а не код игры: очки, ступени, награды
   и отметки решает только сервер по подтверждённым делам и операциям с номером (GDD §32, §29, §34.1, §36.16).
   Только целые числа. Множители — базисные пункты: 10 000 = 100 %. Округление — вниз, один раз на операцию.

   Очки пропуска — те же дела, что считает Событие недели, по той же таблице цен, но без акцента недели и силы коллекции:
     сотые очка = ⌊ цена дела × n × 100 / rate ⌋, где rate — очков дел на одно очко пропуска.
   Потолок сезона копится: к дню d (1…days) очков не больше d × dayCap — пропущенный день можно добрать позже. Выше цели
   (ступеней × очков на ступень) очки не идут: путь пройден. Дневные потолки единиц — те же, что у События (§1.2).
   Награда-валюта растёт с уровнем Странника по §16: ⌊ база × (10 000 + уровень × perLevelBp) / 10 000 ⌋. Сундук — редкость
   по циклу аккаунта (chestBase) и сдвиг клетки, в границах 1…7; окно — свойство клетки. Ключи и Энериум — без роста. */
(function (root) {
'use strict';

const BP = 10000;

/* §16: Награда = База × (1 + Уровень × 0,1) — множитель уровня в данных (level.perLevelBp) */
const scale = (D, base, level) => Math.floor(base * (BP + Math.max(0, level | 0) * D.level.perLevelBp) / BP);

/* редкость сундука клетки: своя (r) или база цикла + сдвиг (off), в границах 1…7 */
function chestR(D, cycle, x) {
  if (x.r) return Math.max(1, Math.min(7, x.r));
  const c = Math.max(1, Math.min(D.chestBase.length - 1, cycle | 0));
  return Math.max(1, Math.min(7, D.chestBase[c] + (x.off || 0)));
}

/* одна награда на уровне и цикле аккаунта o = { level, cycle }:
   { k, n } — валюта кошелька; { k: 'chest', box, r, win } — закрытый сундук в запасы; { k: 'frame', id } — рамка облика.
   Запись с from и alt: до цикла from выдаётся alt (прах душ — со второго цикла) */
function resolve(D, x, o) {
  if (x.from && x.alt && (o.cycle | 0) < x.from) return resolve(D, x.alt, o);
  if (x.k === 'chest') return { k: 'chest', box: D.chestBox, r: chestR(D, o.cycle, x), win: x.win || 'step' };
  if (x.k === 'frame') return { k: 'frame', id: x.id };
  return { k: x.k, n: x.b != null ? scale(D, x.b, o.level) : x.n };
}

/* клетка ряда row ('free' | 'paid') на ступени t (1…tiers) */
const cell = (D, row, t, o) => ((D.rows[row] || [])[t - 1] || []).map(x => resolve(D, x, o));

/* очки дела в сотых очка пропуска */
function pts100(D, unit, n) {
  const U = D.units[unit];
  return U && n > 0 ? Math.floor(U.price * n * 100 / D.rate) : 0;
}

/* сколько единиц дела засчитать сегодня: дневной потолок единицы минус уже засчитанное */
function room(D, unit, usedToday) {
  const cap = D.caps[unit];
  return cap == null ? Infinity : Math.max(0, cap - (usedToday || 0));
}

/* цель сезона и потолок к дню d, в сотых */
const goal100 = D => D.tiers * D.tierPts * 100;
const capTo = (D, day) => Math.max(0, Math.min(D.season.days, day | 0)) * D.dayCap * 100;

/* сколько сотых прибавить: не выше потолка к дню и цели */
const add100 = (D, have100, want100, day) => Math.max(0, Math.min(want100, capTo(D, day) - have100, goal100(D) - have100));

/* ступень по очкам */
const tierOf = (D, have100) => Math.min(D.tiers, Math.floor(have100 / (D.tierPts * 100)));

/* лист даров: награда отметки m (1…marks) */
const mark = (D, m, o) => ((D.cal.list || [])[m - 1] || []).map(x => resolve(D, x, o));

/* веха листа: { n, art } или null */
const mile = (D, m) => (D.cal.miles || {})[m] || null;

const api = { BP, scale, chestR, resolve, cell, pts100, room, goal100, capTo, add100, tierOf, mark, mile };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (root) root.EnPass = api;
})(typeof window !== 'undefined' ? window : null);
