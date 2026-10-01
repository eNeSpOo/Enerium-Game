/* Переход в новый цикл — алгоритм «сервера» (ADR-0041, §2.9, §16, §17.6, §20.5, §36.16). Один на сборщик (tools/content-gen/cycle/build.js)
   и прототип: сборщик кладёт этот файл как есть в design/ui/cycle.js после данных. Только целые числа, без случайности.

   Состояние сервера M = { cycle, ops, seq, done, hist }:
   - cycle — цикл аккаунта; done[цикл] — номер операции, которой аккаунт вошёл в этот цикл;
   - ops[номер] — ответ операции: повтор того же номера отдаёт прежний ответ и ничего не выдаёт;
   - hist[цикл] — итог рейтингов цикла, из которого игрок ушёл: места и очки недели перехода. Таблица старого цикла их не теряет.

   advance(M, op, from, facts) — переход from → from + 1. facts — что знает сервер: guard — пал рунный страж второго биома цикла from,
   standings — места и очки недели в рейтингах цикла from. Отказы: op — нет номера; stale — окно устарело (аккаунт уже не в цикле from);
   top — циклов больше нет; done — в этот цикл аккаунт уже вошёл другой операцией; guard — страж ещё стоит.
   Ответ: { from, to, xp — опыт Странника за переход (§16: × номер старого цикла), memory — место Памяти, что стало «можно вспомнить»,
   offer — предложение Лавки, что открылось (ADR-0036, «Дар пути»), ratings — режимы, где начинается таблица нового цикла, arena — старт
   рейтинга Арены и Лиги в новом цикле, hist — итог старого цикла }. */
(function (root) {
  'use strict';
  function make(D) {
    const R = D.rules;
    const fresh = cycle => ({ cycle: cycle || R.first, ops: {}, seq: 1, done: {}, hist: {} });
    function advance(M, op, from, facts) {
      if (!op) return { refuse: 'op' };
      if (M.ops[op]) return { again: true, res: M.ops[op] };
      if (from !== M.cycle) return { refuse: 'stale' };
      const to = from + 1, step = D.steps[to];
      if (to > R.last || !step) return { refuse: 'top' };
      if (M.done[to]) return { refuse: 'done' };
      if (!facts || !facts.guard) return { refuse: 'guard' };
      const hist = (facts.standings || []).map(x => ({ id: x.id, n: x.n, place: x.place == null ? null : x.place | 0, points: x.points | 0 }));
      const res = { from, to, xp: R.xp * from, memory: to, offer: step.offer ? step.offer.id : null, ratings: R.ratings.slice(), arena: R.arenaStart, hist };
      M.ops[op] = res; M.seq++; M.done[to] = op; M.cycle = to; M.hist[from] = hist;
      return { res };
    }
    /* что открылось на переходе в цикл c — пункты окна по блокам разметки; team — только для команды */
    const step = c => D.steps[c] || null;
    const items = (c, team) => { const s = step(c); return s ? s.open.filter(x => team || !x.team) : []; };
    return { fresh, advance, step, items };
  }
  root.EnCycle = { make };
})(typeof window !== 'undefined' ? window : globalThis);
if (typeof module !== 'undefined') module.exports = (typeof window !== 'undefined' ? window : globalThis).EnCycle;
