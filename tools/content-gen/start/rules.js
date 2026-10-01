/* Уровень Странника — алгоритм «сервера», общий для сборщика и прототипа. Сборщик tools/content-gen/start/build.js вставляет этот файл
   в design/ui/start.js как есть. Ориентир для серверного ядра на C#, а не код игры: опыт, уровень и награду решает только сервер
   по подтверждённым вехам (GDD §16, §16.1, §34, §36).
   Только целые числа.

   Память сервера об игроке — M:
     facts — { ключ вехи: опыт, начисленный за неё } — каждая веха один раз: kill:<враг>, hero:<герой>, closure:<биом>, guard:<биом>,
       limit:<герой>:<доблесть>:<предел>, valor:<герой>:<доблесть>, echo:<враг>, cycle:<номер>;
     xp — опыт всего, от нуля; lvl — уровень (0 — аккаунт только создан, уровень 1 выдаёт первая операция); ops — { номер операции: ответ }; seq — номер следующей операции.
   Вехи этапов (F) сервер знает сам: этажи, боссы и стражи биомов, найденные рецепты, потолок уровня героев, цикл.
   claim(M, op, F) — одна операция: все уровни, что можно взять сейчас, с наградами. Повтор того же номера возвращает прежний ответ
   и ничего не выдаёт; без новых уровней номер не тратится.
   skip(M, op, E, live) — пропуск обучения (ADR-0040): одна операция с номером переводит аккаунт в итог сценария E (EN_START.skip) —
   уровень, опыт и вехи такие же, как у прошедшего обучение самого. Итог один с любого шага: пропуск ставит его, а не прибавляет.
   live — обучение ещё идёт (решает сервер по своему шагу сценария); иначе — отказ. Повтор номера — прежний ответ, ничего не меняет. */
(function (root) {
'use strict';

function make(D) {
  const N = D.levels.length;   // уровней сценария; дальше — формула §16
  /* ⌈√x⌉ целыми */
  function isqrtCeil(x) {
    if (x <= 0) return 0;
    let r = Math.floor(Math.sqrt(x));
    while (r * r > x) r--;
    while (r * r < x) r++;
    return r;
  }
  /* опыт на переход L → L+1: сценарий — разница порогов таблицы, дальше — ⌈100 × L^1,5⌉ = ⌈√(k2 × L³)⌉ (§16) */
  function need(L) {
    if (L < 1) return 0;
    if (L < N) return D.levels[L].xp - D.levels[L - 1].xp;
    return isqrtCeil(D.formula.k2 * L * L * L);
  }
  /* опыт всего, с которого берётся уровень L */
  function thr(L) {
    if (L <= 1) return 0;
    if (L <= N) return D.levels[L - 1].xp;
    let t = D.levels[N - 1].xp;
    for (let k = N; k < L; k++) t += need(k);
    return t;
  }
  /* «Дар Страннику» (§16): база × (1 + уровень × 0,1) золота, целыми вниз */
  const gift = L => Math.floor(D.formula.giftGold * (D.formula.giftStep + L) / D.formula.giftStep);
  /* награда уровня: дар и сверх него — награда сценария */
  function reward(L) {
    const x = (L >= 1 && L <= N && D.levels[L - 1].reward) || {};
    return { gold: gift(L) + (x.gold || 0), spirit: x.spirit || 0, keys: x.keys || 0, runes: x.runes || 0, train: x.train || 0,
      items: (x.items || []).map(a => a.slice()), chest: x.chest ? Object.assign({}, x.chest) : null, shards: (x.shards || []).map(a => a.slice()) };
  }
  /* опыт вехи: §16 × номер цикла, в котором веха взята */
  const xpOf = (kind, cycle) => (D.xp[kind] || 0) * Math.max(1, cycle | 0);
  /* веха — один раз: опыт начисляется только новой */
  function fact(M, key, kind, cycle) {
    if (M.facts[key] != null) return 0;
    const v = xpOf(kind, cycle);
    M.facts[key] = v; M.xp += v;
    return v;
  }
  /* этап уровня выполнен: F — вехи этапов сервера */
  function stageOk(s, F) {
    if (!s) return true;
    if (s.all) return s.all.every(x => stageOk(x, F));
    if (s.any) return s.any.some(x => stageOk(x, F));
    switch (s.k) {
      case 'floor': return ((F.floor || {})[s.b] || 0) >= s.n;
      case 'boss': return !!(F.boss || {})[s.b];
      case 'guard': return !!(F.guard || {})[s.b];
      case 'recipe': return (F.recipe || 0) >= s.n;
      case 'cap': return !!F.cap;
      case 'cycle': return (F.cycle || 1) >= s.n;
      case 'kill': return !!(F.kill || {})[s.id];
    }
    return false;
  }
  /* можно ли взять уровень L + 1: опыт, а в сценарии — ещё и этап */
  function canNext(M, F) {
    const L = M.lvl + 1;
    if (L <= N) return M.xp >= thr(L) && stageOk(D.levels[L - 1].stage, F);
    return M.xp >= thr(L) && L <= D.formula.max;
  }
  /* операция: все уровни, что можно взять сейчас, с наградами по порядку */
  function claim(M, op, F) {
    if (!op) return { refuse: 'op' };
    if (M.ops[op]) return { again: true, res: M.ops[op] };
    const got = [];
    while (canNext(M, F)) { M.lvl++; got.push({ L: M.lvl, reward: reward(M.lvl) }); }
    if (!got.length) return { refuse: 'none' };
    const res = { op, from: got[0].L - 1, to: M.lvl, levels: got };
    M.ops[op] = res; M.seq++;
    return { res };
  }
  /* пропуск обучения: аккаунт — в итог сценария одной операцией; вехи — те же, что у прошедшего сам, поэтому повторно опыта не дадут */
  function skip(M, op, E, live) {
    if (!op) return { refuse: 'op' };
    if (M.ops[op]) return { again: true, res: M.ops[op] };
    if (!live || !E) return { refuse: 'done' };
    const from = M.lvl;
    M.facts = Object.assign({}, E.facts); M.xp = E.xp; M.lvl = E.lvl;
    const res = { op, kind: 'skip', from, to: E.lvl };
    M.ops[op] = res; M.seq++;
    return { res };
  }
  /* мест в отряде на уровне L: таблица сценария, дальше — все пять */
  const slots = L => D.gates.slots[Math.max(0, Math.min(D.gates.slots.length, L) - 1)];
  /* с какого уровня открыто: kind — nav, seg, hire; нет записи — открыто с 1-го */
  const opensAt = (kind, key) => ((D.gates[kind] || {})[key]) || 1;
  /* опыт внутри уровня и до следующего: для полосы и листа */
  const bar = M => ({ lvl: M.lvl, xp: M.xp - thr(M.lvl), next: need(M.lvl), total: M.xp });
  const fresh = () => ({ facts: {}, xp: 0, lvl: 0, ops: {}, seq: 1 });   // аккаунт с нуля: первая операция выдаёт уровень 1 — «Начало»
  return { N, need, thr, gift, reward, xpOf, fact, stageOk, canNext, claim, skip, slots, opensAt, bar, fresh, isqrtCeil };
}

const api = { make };
root.EnStart = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
