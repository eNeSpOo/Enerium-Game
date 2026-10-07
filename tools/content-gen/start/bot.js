/* Канонический игрок сценария «Старт с чистого листа» — одна политика на два мира: прогон ядром в сборщике (world-sim.js) и прототип
   в проверке (tools/content-gen/screens/check_start.js). Мир даёт снимок состояния и операции; политика решает, что делать дальше.
   Если оба мира идут одним путём — один и тот же бой одного ядра, одни уровни, одни награды, — сценарий проходится и в прототипе.

   Политика (data.js, BOT) — как играл бы человек, который слушает проводника:
   1. забрать уровни (операция сервера) и закрыть окна уровня;
   2. нанять следующего героя обучения, если есть место в отряде и золото;
   3. найти первый рецепт, как только его ресурсы лежат в запасах и Мастерская открыта;
   4. руну обучения — сразу, бойцу урона пары;
   5. пробить предел первому, кто упёрся в потолок, если рун хватает;
   6. дух — в уровни: первым качается самый низкий, пока хватает духа и не упёрлись в потолок;
   7. босс биома пал, страж ещё нет, ключи есть и отряд не тот, что уже проиграл стражу, — к стражу; иначе — забег.
   Шаги сценария сверх боя (D.tut, ADR-0040) — сразу, как только открыты и по карману: сундук уровня (2а — после найма), покупка Лавки
   (2б), артефакт активных биомов (2в — после найма первого героя, до первого забега: без него спуска нет, ADR-0054), первый артефакт —
   купить и поднять до своего уровня (5а — после найма и предела, до духа).
   Каждое действие пишется в журнал (log) по порядку: из него сборщик собирает сценарий обучения (ADR-0040) — шаги, которые прототип
   разрешает игроку по одному. Дух в уровни — запись 'lvl' на каждый поднятый уровень: подряд идущие сборщик сводит в один шаг.
   Мир W: st() — снимок; claim() — уровни и награды, окна закрыты; hire(id), levelUp(id), valor(id), limit(id), craft(cells, рецепт),
   open() — сундук сценария, buy(предмет) — покупка Лавки, art(артефакт, уровень), trail(артефакт) — покупка артефакта активных биомов,
   run(биом), guard(биом) — операции; entry(биом) —
   ключей за вход к стражу; levelCost(n) — дух за уровень n.
   Снимок: { lvl, cycle, slots, gold, spirit, souls, keys, train, runes, heroes: [{ id, lvl, cap, lim, valor, maxV }], front, boss, guard,
   recipe, craft, stock, shop, arts — открыты ли Запасы, Лавка, артефакты; chest — сундук сценария в запасах; bought — покупка Лавки;
   art — { артефакт: уровень }; has(id, n) }. Только целые. */
'use strict';

function play(W, D, opt = {}) {
  const B = D.bot, order = D.heroes.map(h => h.id), log = [], steps = [], TUT = D.tut || {};
  const lastLoss = {};
  const say = (kind, x) => { const s = W.st(); log.push(Object.assign({ kind, lvl: s.lvl, ms: W.ms() }, x || {})); };
  /* уровни с прошлого раза: [{ L, ms }] — посреди забега их берёт мир, миг — его время */
  const claim = () => { const got = W.claim(); for (const x of got) log.push({ kind: 'level', L: x.L, lvl: x.L, ms: x.ms }); return got.length; };
  const price = k => W.price(k);
  /* шаги 1–6 — пока что-то меняется: уровень, взятый посреди этих дел, может дать место, золото, руну или рецепт */
  function manage() {
    for (let guard = 0; guard < 50; guard++) {
      let acted = false, fresh = false;   // fresh — уровень Странника взят посреди этих дел: он мог открыть место в отряде
      claim();
      let s = W.st();
      /* 2. найм */
      for (;;) {
        s = W.st();
        const k = s.heroes.length; if (k >= order.length || k >= s.slots) break;
        if (s.gold < price(k + 1)) break;
        if (!W.hire(order[k])) break;
        say('hire', { id: order[k] }); claim(); acted = true;
      }
      /* 2а. сундук сценария — как только он в запасах */
      s = W.st();
      if (TUT.chest && s.stock && s.chest && W.open()) { say('chest', { no: TUT.chest.no }); if (claim()) fresh = true; acted = true; }
      /* 2б. Лавка — покупка сценария, как только Лавка открыта и золота хватает */
      s = W.st();
      if (TUT.shop && s.shop && !s.bought && s.gold >= TUT.shop.cost && W.buy(TUT.shop.buy)) { say('shop', { id: TUT.shop.buy }); if (claim()) fresh = true; acted = true; }
      /* 2в. артефакт активных биомов — как только есть герой и золото: до первого забега */
      s = W.st();
      if (TUT.trail && s.art[TUT.trail.id] == null && s.heroes.length && s.gold >= TUT.trail.gold && W.trail(TUT.trail.id)) { say('trail', { id: TUT.trail.id }); if (claim()) fresh = true; acted = true; }
      /* 3. первый рецепт */
      s = W.st();
      if (s.craft && !s.recipe && B.recipe.cells.every(([id, q]) => s.has(id, q)) && W.craft(B.recipe.cells, B.recipe.r)) { say('recipe', { r: B.recipe.r }); if (claim()) fresh = true; acted = true; }
      /* 4. руна обучения */
      s = W.st();
      if (s.train > 0) { const h = s.heroes.find(x => x.id === D.train && x.valor === 0 && x.maxV > 0); if (h && W.valor(h.id)) { say('valor', { id: h.id }); if (claim()) fresh = true; acted = true; } }
      /* 5. предел */
      for (;;) {
        s = W.st();
        const h = s.heroes.find(x => x.lvl >= x.cap && x.lim === 0);
        if (!h || s.runes < B.runesPerLimit) break;
        if (!W.limit(h.id)) break;
        say('limit', { id: h.id }); if (claim()) fresh = true; acted = true;
      }
      /* 5а. первый артефакт — как только артефакты открыты, а золота и душ хватает */
      s = W.st();
      if (TUT.art && s.arts && s.art[TUT.art.id] == null && s.gold >= TUT.art.gold && s.souls >= TUT.art.souls && W.art(TUT.art.id, TUT.art.lv)) {
        say('art', { id: TUT.art.id, lv: TUT.art.lv }); if (claim()) fresh = true; acted = true;
      }
      /* найм — раньше духа (порядок 2 → 6): уровень, взятый посреди этих дел, мог открыть место в отряде — сначала нанять героя, и только
         потом делить дух между всеми. Иначе дух уходит прежним героям, а новичок догоняет их забегами — и отряд зависит от того,
         пришёл ли дух одним даром погружения или по забегу (ADR-0049, ADR-0050) */
      if (fresh) continue;
      /* 6. дух — в уровни, первым самый низкий; при равных — по порядку найма */
      for (;;) {
        s = W.st();
        const c = s.heroes.filter(h => h.lvl < h.cap).sort((a, b) => a.lvl - b.lvl || order.indexOf(a.id) - order.indexOf(b.id));
        if (!c.length) break;
        const h = c[0];
        if (s.spirit < W.levelCost(h.lvl + 1)) break;
        if (!W.levelUp(h.id)) break;
        say('lvl', { id: h.id, to: h.lvl + 1 });
        acted = true;
      }
      if (claim()) acted = true;
      if (!acted) return;
    }
  }
  let i = 0;
  for (; i < (opt.max || B.maxSteps); i++) {
    manage();
    let s = W.st();
    if (s.cycle >= 2) break;
    /* 7. страж или забег */
    const b = s.front, sig = s.heroes.map(h => `${h.id}:${h.lvl}:${h.valor}:${h.lim}`).join(',');
    if (s.boss[b] && !s.guard[b] && s.keys >= W.entry(b) && lastLoss[b] !== sig) {
      const r = W.guard(b);
      steps.push({ i, kind: 'guard', b, win: !!r.win, ms: r.ms, lvls: s.heroes.map(h => h.lvl) });
      say('guard', { b, win: !!r.win });
      if (!r.win) lastLoss[b] = sig;
      continue;
    }
    if (!s.heroes.length) break;   // без героев не спуститься: сценарий сломан
    if (TUT.trail && s.art[TUT.trail.id] == null) break;   // без артефакта активных биомов забега нет: сценарий сломан
    const r = W.run(b);
    steps.push({ i, kind: 'run', b, wall: r.wall, win: !!r.win, ms: r.ms, spirit: r.spirit || 0, lvls: s.heroes.map(h => h.lvl), ids: s.heroes.map(h => h.id) });
    say('run', { b, wall: r.wall, win: !!r.win });
  }
  claim();
  return { log, steps, done: W.st().cycle >= 2, iters: i };
}

module.exports = { play };
