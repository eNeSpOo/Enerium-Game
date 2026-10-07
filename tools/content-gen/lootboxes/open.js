/* Открытие сундука — алгоритм, общий для сборщика и прототипа. Сборщик вставляет этот файл в design/ui/lootboxes.js как есть.
   Ориентир для серверного ядра на C#, а не код игры: в игре сундук открывает только сервер (GDD §34.1, §36.16).
   Только целые числа. Генератор — mulberry32, как в ядре боя прототипа (design/ui/battle.js); сборщик сверяет, что выход совпадает.
   Порядок обращений к генератору — часть формата: сначала гарантированные записи сундука (sure) по порядку данных, затем предметы —
   на каждый ровно три броска; валюта — без бросков.
     1) редкость предмета — из окна сундука, бросок из 10 000;
     2) линия пула — среди линий, у которых на этой редкости есть записи, бросок из суммы их весов;
     3) запись линии — бросок из суммы весов записей (герой недели, талисман по весу таблицы автора, ресурс).
   Гарантированная запись — двух видов:
     — своей линии на редкости сундука (в данных — id линии): один бросок из суммы весов её записей;
     — из своих линий по окну сундука (в данных — список [линия, вес, с цикла, по цикл]): те же три броска, что у предмета, но линии —
       только свои.
       Так сундук КрафБосса даёт запись своей темы и сильной линии наверняка (ADR-0047, п. 1).
   Гарантия сундука осколков (ADR-0047) — запись вида target: осколки герою-цели недели; кому именно — решает сервер по коллекции
   игрока в миг открытия (цель недели, излишек — следующей цели, собран весь отряд недели — в прах Эха), без бросков.
   Сундук с полем total — всего записей по редкости сундука, с гарантированными: случайных — total минус гарантированные этого цикла.
   Лестница планок режима (ladder) — без генератора: сквозная, по очкам, сразу на все циклы (ADR-0047).
   Талисман со спойлером (третье поле записи — 1) есть в пуле только с цикла «для команды», L.teamFrom, — как ресурсы цикла VI.
   Пересчёт осколков пробуждённого героя в прах — после розыгрыша, по коллекции игрока, без бросков (§15.2): общий прах — у героев
   рулетки; лишние осколки героев Эхо уходят в прах Эха — их делит «сервер» героев Эхо, не этот алгоритм (ADR-0047). */
(function (root) {
'use strict';

function mix32(x) { x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0; }
function seedOf(str) { let h = 0x811C9DC5; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0; return mix32(h); }
function makeRng(seed) {  // mulberry32: roll(n) — целое от 0 до n − 1
  let a = seed >>> 0;
  return n => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) % n; };
}

/* Окно сундука: 'step' и 'wild' — таблицы данных, 'pure' — только своя редкость сундука. */
function windowOf(L, win, r) {
  if (win === 'pure') return [[r, L.bpTotal]];
  const w = L.windows[win];
  if (!w) throw new Error('нет окна ' + win);
  return Array.isArray(w[0][0]) ? w[r - 1] : w;
}

/* Записи линии на редкости x для цикла c и недели Эхо. Каждая запись: { kind, id, q, w }. */
function entriesOf(L, lineId, x, c, week) {
  const ln = L.lines[lineId], P = L.pools;
  switch (ln.kind) {
    case 'shards': return (P.heroes[week] || []).filter(h => h.cyc <= c).map(h => ({ kind: 'shard', id: h.id, q: ln.pack[x - 1], w: 1 }));
    case 'target': return [{ kind: 'target', id: week || '', q: ln.q[x - 1], w: 1 }];   // осколки герою-цели недели: кому — решает сервер при открытии
    case 'rshards': return ((P.roulette || {})[c] || []).map(h => ({ kind: 'shard', id: h.id, q: ln.pack[x - 1], w: 1 }));   // связка осколков героя рулетки цикла сундука, герой — поровну
    case 'runes': {   // руна предела цикла сундука: предел I–V — по весам линии, штук — по редкости записи
      const ids = (P.rune || {})[c] || [];
      return ln.tiers.map((w, k) => (w > 0 && ids[k] ? { kind: 'item', id: ids[k], q: ln.qty[x - 1], w } : null)).filter(Boolean);
    }
    case 'workers': return [{ kind: 'wshard', id: 'w' + x, q: ln.qty[x - 1], w: 1 }];
    case 'tal': return (P.tal[x] || []).filter(t => !t[2] || c >= L.teamFrom).map(t => ({ kind: 'tal', id: t[0], q: 1, w: t[1] }));
    case 'equip': return [{ kind: 'equip', id: 'e' + x, q: 1, w: 1 }];
    case 'cur': return [{ kind: 'cur', id: ln.cur, q: ln.qty[x - 1] * (ln.perCycle ? c : 1), w: 1 }];
    case 'res': {
      const by = ln.by[x - 1];
      if (!by) return [];
      const ids = by[0] === 'basic' ? P.basic : ((P[by[0]] || {})[c] || []);   // пул цикла сундука: ключи ремёсел, ресурсы мест, находки, осколки доблести…
      return ids.map(id => ({ kind: 'item', id, q: by[1], w: 1 }));
    }
    case 'item': {
      const by = ln.by[x - 1];
      return by ? [{ kind: 'item', id: by[0], q: by[1], w: 1 }] : [];
    }
  }
  throw new Error('неизвестный вид линии ' + ln.kind);
}

/* Сундук, развёрнутый для розыгрыша: spec = { box, r, win, cyc, week }. Линии без записей на редкости пропускаются. */
function resolve(L, spec) {
  const B = L.boxes[spec.box];
  if (!B) throw new Error('нет сундука ' + spec.box);
  const c = spec.cyc, r = spec.r, win = spec.win || 'step';
  const cur = Object.keys(B.cur).map(k => [k, B.cur[k][r - 1]]).filter(x => x[1] > 0);
  const window = windowOf(L, win, r), byR = {};
  for (const [x] of window) {
    byR[x] = [];
    for (const [lineId, w, from, to] of B.lines) {   // линия сундука: вес, с какого цикла и по какой — вес линии может меняться с циклом
      if (c < (from || L.lines[lineId].from || 1) || (to && c > to)) continue;
      const entries = entriesOf(L, lineId, x, c, spec.week);
      if (entries.length) byR[x].push({ line: lineId, w, entries });
    }
  }
  /* гарантированные записи: [линия, сколько, с какого цикла] — на редкости самого сундука, вне окна;
     [[[линия, вес], …], сколько, с какого цикла] — из своих линий по окну сундука: редкость, линия и запись — как у предмета */
  const sure = [];
  for (const [what, n, from] of B.sure || []) {
    if (Array.isArray(what)) {
      if (c < (from || 1)) continue;
      const own = {}; let any = false;
      for (const [x] of window) {
        own[x] = [];
        for (const [lineId, w, lf, lt] of what) {   // своя линия: вес, с какого цикла и по какой
          if (c < (lf || L.lines[lineId].from || 1) || (lt && c > lt)) continue;
          const entries = entriesOf(L, lineId, x, c, spec.week);
          if (entries.length) { own[x].push({ line: lineId, w, entries }); any = true; }
        }
      }
      if (any) for (let i = 0; i < n; i++) sure.push({ set: what.map(v => v[0]), byR: own });
      continue;
    }
    if (c < (from || L.lines[what].from || 1)) continue;
    const entries = entriesOf(L, what, r, c, spec.week);
    if (entries.length) for (let i = 0; i < n; i++) sure.push({ line: what, r, entries });
  }
  /* случайных записей: у сундука с total — всего записей минус гарантированные этого цикла, иначе — items */
  const n = B.total ? Math.max(0, B.total[r - 1] - sure.length) : B.items[r - 1];
  return { spec: { box: spec.box, r, win, cyc: c, week: spec.week || null }, cur, n, window, byR, sure };
}

function pick(list, roll, weightOf) {
  for (const x of list) { const w = weightOf(x); if (roll < w) return x; roll -= w; }
  throw new Error('бросок вне суммы весов');
}

/* Розыгрыш развёрнутого сундука по сиду сервера. trace — необязательный массив: в него ложатся три броска каждого предмета
   и суммы, из которых они брошены, — для показа пробного открытия: trace[i] — броски предмета i; броски гарантированных записей —
   в trace.sure, по порядку записей. На порядок обращений к генератору trace не влияет. */
function roll(def, seed, trace) {
  const rng = makeRng(seed), items = [], sure = [], bpSum = def.window.reduce((a, x) => a + x[1], 0);
  const tsure = trace ? (trace.sure = []) : null;
  /* гарантированные записи — первыми, по порядку данных */
  for (const g of def.sure || []) {
    if (g.byR) {   // из своих линий по окну сундука: редкость, линия, запись — три броска
      const a = rng(bpSum), x = pick(def.window, a, v => v[1])[0], lines = g.byR[x];
      if (!lines || !lines.length) throw new Error('у гарантированной записи пустая редкость ' + x + ' в окне');
      const W = lines.reduce((s, l) => s + l.w, 0), b = rng(W), ln = pick(lines, b, l => l.w);
      const E = ln.entries.reduce((s, v) => s + v.w, 0), c = rng(E), e = pick(ln.entries, c, v => v.w);
      sure.push({ line: ln.line, r: x, kind: e.kind, id: e.id, q: e.q, sure: 1 });
      if (tsure) tsure.push({ rolls: [a, b, c], of: [bpSum, W, E], sure: 1 });
      continue;
    }
    /* своей линии на редкости сундука: один бросок */
    const E = g.entries.reduce((s, v) => s + v.w, 0), c = rng(E), e = pick(g.entries, c, v => v.w);
    sure.push({ line: g.line, r: g.r, kind: e.kind, id: e.id, q: e.q, sure: 1 });
    if (tsure) tsure.push({ rolls: [c], of: [E], sure: 1 });
  }
  for (let i = 0; i < def.n; i++) {
    const a = rng(bpSum), x = pick(def.window, a, v => v[1])[0];
    const lines = def.byR[x];
    if (!lines || !lines.length) throw new Error('пустая редкость ' + x + ' в окне');
    const W = lines.reduce((s, l) => s + l.w, 0), b = rng(W), ln = pick(lines, b, l => l.w);
    const E = ln.entries.reduce((s, v) => s + v.w, 0), c = rng(E), e = pick(ln.entries, c, v => v.w);
    items.push({ line: ln.line, r: x, kind: e.kind, id: e.id, q: e.q });
    if (trace) trace.push({ rolls: [a, b, c], of: [bpSum, W, E] });
  }
  return { cur: def.cur.map(x => x.slice()), items, sure };
}

/* Лестница планок режима — одна, сквозная, по очкам, сразу на все циклы (слова автора 02.10.2026, ADR-0047; решение координатора: замка
   «ступени следующего цикла открывает переход» нет). Полосы — циклы II–VI: в полосе — строки слоя планок, сундуки — своей полосы.
   Игрок цикла c видит лестницу целиком: полосы ниже своей пройдены и не платят, своя — ступени 1…n, за её верхней ступенью сразу идут
   ступени следующих полос — по очкам, без перехода: следующие ступени держат сила отряда и души.
   Порог ступени — множитель первой планки цикла игрока (её считает калькулятор режима): в своей полосе — x строки, первая ступень
   следующей полосы — × next от верхней ступени прошлой, дальше — по шагам строк. У слоя с порогами в своих единицах (at: загрузка
   мест, круги босса) множителей нет: ступени — только своей полосы, порог — at. За верхней ступенью последней полосы — потолок (cap).
   Возвращает ступени игрока цикла c по порядку: { k — номер с единицы, band — полоса (цикл), i — ступень в полосе с единицы,
   x — множитель первой планки цикла c или null, at — порог в своих единицах или null, pay — сундуки, cap — потолок лестницы }. */
function ladder(L, modeId, c) {
  const M = L.modes && L.modes[modeId], R = M && M.ladder, ly = R ? M.layers.find(l => l.id === R.layer) : null, out = [];
  if (!ly || !ly.rows.length) return out;
  const last = M.ladder.bands[M.ladder.bands.length - 1], top = ly.rows[ly.rows.length - 1];
  let mul = 1;
  for (let band = Math.max(c, M.from); band <= last; band++) {
    ly.rows.forEach((row, j) => { const pay = row.cyc[band] || []; if (pay.length) out.push({ k: out.length + 1, band, i: j + 1, x: row.x != null ? row.x * mul : null, at: row.at != null ? row.at : null, pay, cap: false }); });
    if (!R.next || top.x == null) break;   // ступеней следующей полосы очками не взять: порог — в своих единицах
    mul *= top.x * R.next;
  }
  if (R.cap && R.next && top.x != null && out.length) out.push({ k: out.length + 1, band: last, i: ly.rows.length + 1, x: mul, at: null, pay: R.cap, cap: true });
  return out;
}

/* Пересчёт осколков пробуждённых героев в прах (§15.2, демо-таблица §15.3): прах за осколок — по редкости героя × его цикл.
   awakened — чьи осколки пересчитать: { id героя: true }; героев Эхо сюда передают только для показа прежнего правила — их лишние
   осколки делит «сервер» героев Эхо: цели недели, дальше — прах Эха (ADR-0047). Гарантированные записи (sure) — тем же правилом. */
function toDust(L, result, awakened) {
  let dust = 0;
  const heroes = {}; for (const w of Object.keys(L.pools.heroes)) for (const h of L.pools.heroes[w]) heroes[h.id] = h;
  for (const c of Object.keys(L.pools.roulette || {})) for (const h of L.pools.roulette[c]) heroes[h.id] = h;
  const conv = it => {
    if (it.kind !== 'shard' || !awakened || !awakened[it.id] || !heroes[it.id]) return it;
    const h = heroes[it.id], d = it.q * L.dust.perShard[h.r - 1] * h.cyc;
    dust += d;
    return Object.assign({}, it, { dust: d });
  };
  const sure = (result.sure || []).map(conv), items = result.items.map(conv);
  return { cur: result.cur, items, sure, dust };
}

root.EnLoot = { mix32, seedOf, makeRng, windowOf, entriesOf, resolve, roll, ladder, toDust };
})(typeof window !== 'undefined' ? window : globalThis);
