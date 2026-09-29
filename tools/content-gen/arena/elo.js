/* Арена и Лига — алгоритм, общий для калькулятора и прототипа: Эло, исход боя PvP и его статистика, матч Лиги, подбор соперников,
   новый список после боя, сид боя, ежедневный Энериум, дивизионы (GDD §20, §5, §34, §36; ADR-0005, ADR-0010, ADR-0014).
   Сборщик tools/content-gen/arena/build.js вставляет этот файл в design/ui/arena.js как есть. Ориентир для серверного ядра на C#,
   а не код игры: подбор, бой, исход, рейтинг и награды решает только сервер.
   Только целые числа: рейтинг — целый, ожидание и доли — в базисных пунктах (10 000 = 100 %). Все числа правил — в данных D
   (window.EN_ARENA), здесь только алгоритм.
   Ожидание Эло E = 1 / (1 + 10^((Rб − Rа) / 400)) — не формула в коде, а таблица D.elo.table по разнице рейтингов 0…cap: сборщик
   считает её целочисленным корнем, дальше — крайнее значение. Генератор — mulberry32 на сиде, как в ядре боя и сундуках.
   Порядок обращений к генератору — часть формата: подбор списка — один бросок на место в списке, добор нового списка — тем же
   генератором после первого прохода. Бой — ядро боя (EnBattle), порядок его бросков — формат ядра (§5.9); статистика боя только
   читает события ядра и бросков не добавляет. */
(function (root) {
'use strict';

const BP = 10000;
function mix32(x) { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; }
function seedOf(str) { let h = 0x811C9DC5; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0; return mix32(h); }
function makeRng(seed) {  // mulberry32: roll(n) — целое от 0 до n − 1
  let a = seed >>> 0;
  return n => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) % n; };
}
/* деление целых: к ближайшему (половина — от нуля) и к нулю */
function divRound(a, b) { const s = a < 0 ? -1 : 1, x = Math.abs(a); return s * Math.floor((x * 2 + b) / (b * 2)); }
function divZero(a, b) { const s = a < 0 ? -1 : 1; return s * Math.floor(Math.abs(a) / b); }
/* целый квадратный корень вниз — для разброса в отчётах прогона (шум полос), не для игровых величин */
function isqrt(v) { if (!(v > 0)) return 0; let s = Math.floor(Math.sqrt(v)); while (s * s > v) s--; while ((s + 1) * (s + 1) <= v) s++; return s; }

/* ---------- Эло (§20.5) ---------- */
/* ожидание стороны A против B, б. п.; shift — сдвиг в пользу A: асимметрия защиты, у атакующего */
function expect(D, a, b, shift) {
  const T = D.elo.table, d = b - a - (shift || 0), k = Math.min(Math.abs(d), T.length - 1);
  return d >= 0 ? T[k] : BP - T[k];
}
/* K: первые newGames боёв режима — new, дальше base, с рейтингом выше highFrom — high */
function kOf(D, games, rating) { const K = D.elo.k; return games < K.newGames ? K.new : rating > K.highFrom ? K.high : K.base; }
/* сдвиг рейтинга K × (S − E); S и E — в б. п.; округление к ближайшему целому */
const delta = (K, s, e) => divRound(K * (s - e), BP);
/* исход в полуочках: 2 — победа, 1 — ничья, 0 — поражение; S — в б. п. */
const sOf = half => half * BP / 2;
/* Атака (§20.5). A — атакующий { r, g }, B — защитник { r, g, lost }: lost — поражений обороны за сутки, что уже сняли рейтинг.
   Атакующему — K × (S − E); ожидание считается со сдвигом защиты D.elo.def.shift: атакующий видит соперника целиком и выбирает,
   кого атаковать и кем, поэтому при равной силе побеждает чаще — сдвиг возвращает выгоду равной атаки к нулю.
   Защитнику — зеркальный расчёт своим K: удачная оборона — доля winBp расчётного, поражение снимает рейтинг, только пока за сутки
   их меньше lossCap; ничья снимает, но поражением не считается. Рейтинг — только от исходов (§20.5, §36.13) */
function attack(D, A, B, half) {
  const F = D.elo.def, s = sOf(half), e = expect(D, A.r, B.r, F.shift);
  const da = delta(kOf(D, A.g, A.r), s, e);
  const raw = delta(kOf(D, B.g, B.r), BP - s, BP - e);
  let dd = raw, capped = false;
  if (raw > 0) dd = divRound(raw * F.winBp, BP);
  else if (half === 2 && (B.lost || 0) >= F.lossCap) { dd = 0; capped = true; }
  return { e, da, dd, raw, capped, lost: half === 2 && !capped };
}
/* сезонный сброс: start + (R − start) × resetBp — к старту, целым к нулю */
const reset = (D, r) => D.elo.start + divZero((r - D.elo.start) * D.elo.resetBp, BP);

/* ---------- бой (§20.2, ADR-0010) ---------- */
/* PvP ядром: атакующие — сторона героев, защитники — сторона врагов. Ядро урезает здоровье врагов в модели раундов, а у героев-
   защитников его нет: здоровье каждого — как у героя (пробный бой той же картой). Порядок карт на бой не влияет (§5.1): обе стороны
   идут по ключу героя. Ключи защитников — с приставкой, чтобы не совпасть с атакующими */
function pvpBattle(EB, A, B, seed, rounds) {
  const copy = xs => xs.map(s => Object.assign({}, s));
  const probe = EB.create({ mode: 'rounds', heroes: copy(B), foes: [], seed: 1 }), hp = {};
  for (const u of probe.u[0]) hp[u.key] = u.maxHp;
  const foes = copy(B).sort((x, y) => x.key < y.key ? -1 : x.key > y.key ? 1 : 0)
    .map(s => Object.assign(s, { maxHp: hp[s.key], hp: null, lead: false, key: 'b:' + s.key }));
  return EB.create({ mode: 'rounds', heroes: copy(A), foes, seed: seed >>> 0, maxRounds: rounds });
}
/* итог: пали все враги — победа, все свои — поражение; вышли раунды — у кого больше снятая доля здоровья противника (б. п.),
   равные доли — ничья. Доля снятого, а не оставшегося: иначе два танка и три лекаря выигрывают по таймеру, ничего не делая (§20.2) */
function pvpResult(b) {
  const sum = (us, f) => us.reduce((a, u) => a + f(u), 0), hp = u => u.alive ? u.hp : 0;
  const mA = sum(b.u[0], u => u.maxHp), mB = sum(b.u[1], u => u.maxHp), hA = sum(b.u[0], hp), hB = sum(b.u[1], hp);
  const shA = mB ? Math.floor((mB - hB) * BP / mB) : 0, shB = mA ? Math.floor((mA - hA) * BP / mA) : 0;   // shA — снял атакующий
  const half = b.why === 'win' ? 2 : b.why === 'wipe' ? 0 : shA > shB ? 2 : shA < shB ? 0 : 1;
  return { half, why: b.why, rounds: b.round, max: b.maxRounds, shA, shB, t: b.t, fallA: b.u[0].filter(u => !u.alive).length, fallB: b.u[1].filter(u => !u.alive).length };
}
/* Бой до конца со статистикой — ради «Пропустить» и итога (§20.1, §36.9). Те же шаги ядра подряд, что в EB.run: исход и порядок
   бросков генератора — те же, статистика только читает события ядра (cast — способность или ульта, react — реакция набора).
   По каждой карте обеих сторон: нанесено, вылечено, принято (вместе со щитом), здоровье в конце, пала ли; сработавшие способности,
   ульты и реакции — [имя, раз] по убыванию раз. Итог { res — исход pvpResult, st — раунды, почему кончился и стороны }. Только целые */
function pvpRun(EB, b) {
  const tally = new Map(), none = () => ({ ab: new Map(), ult: new Map(), re: new Map() });
  const bump = (u, kind, n) => { let t = tally.get(u); if (!t) tally.set(u, t = none()); t[kind].set(n, (t[kind].get(n) || 0) + 1); };
  while (!b.over) {
    const a = EB.step(b); if (!a) break;
    for (const e of a.ev) if (e.s && e.n) { if (e.k === 'cast') bump(e.s, e.ult ? 'ult' : 'ab', e.n); else if (e.k === 'react') bump(e.s, 're', e.n); }
  }
  const list = m => [...m].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  const side = us => us.map(u => {
    const t = tally.get(u) || none();
    return { key: u.key, id: u.id, name: u.name, dealt: u.dealt, healed: u.healed, taken: u.taken, hp: u.alive ? u.hp : 0, maxHp: u.maxHp, alive: u.alive,
      ab: list(t.ab), ult: list(t.ult), re: list(t.re) };
  });
  return { res: pvpResult(b), st: { rounds: b.round, max: b.maxRounds, why: b.why, sides: [side(b.u[0]), side(b.u[1])] } };
}
/* ключ состава — герои по id, порядок не важен; сид боя — сезон, режим, раунд матча и пара составов (§20.1): та же пара в сезоне —
   тот же бой, повторная атака информации не несёт */
const teamKey = ids => ids.slice().sort().join(',');
const battleSeed = (mode, season, round, keyA, keyB) => seedOf([mode, season, round || 0, keyA, keyB].join('|'));

/* ---------- Лига (§20.4) ---------- */
/* матч: исходы раундов в полуочках за игрока; третий раунд — только при равном счёте после двух. Итог — полуочки матча:
   2:0 и 2:1 — победа, равный счёт — ничья матча (S = 0,5) */
function leagueScore(halves) {
  const two = (halves[0] || 0) + (halves[1] || 0), need3 = halves.length >= 2 && two === 2;
  const used = need3 ? halves.slice(0, 3) : halves.slice(0, 2), my = used.reduce((a, h) => a + h, 0), their = used.length * 2 - my;
  return { need3, played: used.length, my, their, half: my > their ? 2 : my < their ? 0 : 1 };
}
/* нужен ли следующий раунд: после первого — всегда, после второго — при равном счёте */
const leagueNext = halves => halves.length < 2 || (halves.length === 2 && halves[0] + halves[1] === 2);

/* ---------- подбор (§20.2) ---------- */
/* список: n соперников внутри окна ±window, недобор — окно шире на step, до maxWindow; внутри окна — по генератору, один бросок
   на место. pool — [{ id, r }], skip — кого не брать: уже атакованы в сезоне или стоят в списке */
function pickList(M, pool, me, rng, skip) {
  const got = [], has = new Set(skip || []);
  let w = M.window;
  for (;;) {
    const cand = pool.filter(x => !has.has(x.id) && Math.abs(x.r - me) <= w);
    while (got.length < M.list && cand.length) { const x = cand.splice(rng(cand.length), 1)[0]; got.push(x.id); has.add(x.id); }
    if (got.length >= M.list || w >= M.maxWindow) break;
    w = Math.min(M.maxWindow, w + M.step);
  }
  return { ids: got, w };
}
/* новый список — после каждого боя (M.refresh.auto, слово автора 29.09.2026) и по «Обновить»: сначала без атакованных и без прежнего
   списка — новые лица; не хватило — добор из прежнего списка, кого ещё не атаковали. Генератор один на оба прохода. fresh — сколько
   в списке новых лиц: ручное обновление без новых лиц — отказ, Энериум не списывается */
function pickFresh(M, pool, me, rng, hit, prev) {
  const was = prev || [], a = pickList(M, pool, me, rng, (hit || []).concat(was));
  if (a.ids.length >= M.list || !was.length) return { ids: a.ids, w: a.w, fresh: a.ids.length };
  const b = pickList(Object.assign({}, M, { list: M.list - a.ids.length }), pool, me, rng, (hit || []).concat(a.ids));
  return { ids: a.ids.concat(b.ids), w: Math.max(a.w, b.w), fresh: a.ids.length };
}
/* цена платного обновления списка: n-е за сутки, с нуля; null — лимит суток исчерпан (Энериум не покупает попытки и рейтинг, §20.6) */
const refreshPrice = (M, n) => n < M.refresh.price.length ? M.refresh.price[n] : null;
/* ручное обновление: 0 — бесплатное, пока за сутки их взято меньше M.refresh.free; дальше — цена n-го платного, null — до завтра */
const refreshCost = (M, freeUsed, paid) => freeUsed < M.refresh.free ? 0 : refreshPrice(M, paid);
/* попытки: суточная прибавка копится до cap (§20.2, §20.4) */
const attemptsAfter = (M, have, days) => Math.min(M.att.cap, have + days * M.att.day);

/* ---------- награды и места (§20.6) ---------- */
/* Энериум за место на суточном срезе рейтинга сервера: первая строка, куда место входит; вне таблицы — 0 */
function dailyEn(D, place) { if (!(place >= 1)) return 0; const r = D.enerium.find(([top]) => place <= top); return r ? r[1] : 0; }
/* место на сервере по рейтингу: таблица [рейтинг, место] по убыванию рейтинга, между точками — целой линией */
function placeOf(T, r) {
  if (!T.length) return null;
  if (r >= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) {
    const [r1, p1] = T[i - 1], [r2, p2] = T[i];
    if (r >= r2) return r1 === r2 ? p2 : p2 - Math.floor((p2 - p1) * (r - r2) / (r1 - r2));
  }
  return T[T.length - 1][1];
}
/* дивизион Лиги: последняя ступень, чей порог не выше рейтинга */
function division(D, r) { const L = D.league.divisions; let k = 0; for (let i = 0; i < L.length; i++) if (r >= L[i].from) k = i; return k; }
/* планки побед: первая × x строки (EN_LOOTBOXES: соседние ×2) */
const plankNeeds = (first, xs) => xs.map(x => first * x);

root.EnArena = { BP, mix32, seedOf, makeRng, divRound, divZero, isqrt, expect, kOf, delta, sOf, attack, reset, pvpBattle, pvpResult, pvpRun, teamKey,
  battleSeed, leagueScore, leagueNext, pickList, pickFresh, refreshPrice, refreshCost, attemptsAfter, dailyEn, placeOf, division, plankNeeds };
if (typeof module !== 'undefined' && module.exports) module.exports = root.EnArena;
})(typeof window !== 'undefined' ? window : globalThis);
