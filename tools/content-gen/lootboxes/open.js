/* Открытие сундука — алгоритм, общий для сборщика и прототипа. Сборщик вставляет этот файл в design/ui/lootboxes.js как есть.
   Ориентир для серверного ядра на C#, а не код игры: в игре сундук открывает только сервер (GDD §34.1, §36.16).
   Только целые числа. Генератор — mulberry32, как в ядре боя прототипа (design/ui/battle.js); сборщик сверяет, что выход совпадает.
   Порядок обращений к генератору — часть формата: на каждый предмет ровно три броска, валюта — без бросков.
     1) редкость предмета — из окна сундука, бросок из 10 000;
     2) линия пула — среди линий, у которых на этой редкости есть записи, бросок из суммы их весов;
     3) запись линии — бросок из суммы весов записей (герой недели, талисман по весу таблицы автора, ресурс).
   Талисман со спойлером (третье поле записи — 1) есть в пуле только с цикла «для команды», L.teamFrom, — как ресурсы цикла VI.
   Пересчёт осколков пробуждённого героя в прах — после розыгрыша, по коллекции игрока, без бросков (§15.2). */
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
    case 'workers': return [{ kind: 'wshard', id: 'w' + x, q: ln.qty[x - 1], w: 1 }];
    case 'tal': return (P.tal[x] || []).filter(t => !t[2] || c >= L.teamFrom).map(t => ({ kind: 'tal', id: t[0], q: 1, w: t[1] }));
    case 'equip': return [{ kind: 'equip', id: 'e' + x, q: 1, w: 1 }];
    case 'cur': return [{ kind: 'cur', id: ln.cur, q: ln.qty[x - 1] * (ln.perCycle ? c : 1), w: 1 }];
    case 'res': {
      const by = ln.by[x - 1];
      if (!by) return [];
      const ids = by[0] === 'basic' ? P.basic : (P[by[0]][c] || []);
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
    for (const [lineId, w, from] of B.lines) {
      if (c < (from || L.lines[lineId].from || 1)) continue;
      const entries = entriesOf(L, lineId, x, c, spec.week);
      if (entries.length) byR[x].push({ line: lineId, w, entries });
    }
  }
  return { spec: { box: spec.box, r, win, cyc: c, week: spec.week || null }, cur, n: B.items[r - 1], window, byR };
}

function pick(list, roll, weightOf) {
  for (const x of list) { const w = weightOf(x); if (roll < w) return x; roll -= w; }
  throw new Error('бросок вне суммы весов');
}

/* Розыгрыш развёрнутого сундука по сиду сервера. trace — необязательный массив: в него ложатся три броска каждого предмета
   и суммы, из которых они брошены, — для показа пробного открытия. На порядок обращений к генератору trace не влияет. */
function roll(def, seed, trace) {
  const rng = makeRng(seed), items = [];
  const bpSum = def.window.reduce((a, x) => a + x[1], 0);
  for (let i = 0; i < def.n; i++) {
    const a = rng(bpSum), x = pick(def.window, a, v => v[1])[0];
    const lines = def.byR[x];
    if (!lines || !lines.length) throw new Error('пустая редкость ' + x + ' в окне');
    const W = lines.reduce((s, l) => s + l.w, 0), b = rng(W), ln = pick(lines, b, l => l.w);
    const E = ln.entries.reduce((s, v) => s + v.w, 0), c = rng(E), e = pick(ln.entries, c, v => v.w);
    items.push({ line: ln.line, r: x, kind: e.kind, id: e.id, q: e.q });
    if (trace) trace.push({ rolls: [a, b, c], of: [bpSum, W, E] });
  }
  return { cur: def.cur.map(x => x.slice()), items };
}

/* Пересчёт осколков пробуждённых героев в прах (§15.2, демо-таблица §15.3): прах за осколок — по редкости героя × его цикл. */
function toDust(L, result, awakened) {
  let dust = 0;
  const heroes = {}; for (const w of Object.keys(L.pools.heroes)) for (const h of L.pools.heroes[w]) heroes[h.id] = h;
  const items = result.items.map(it => {
    if (it.kind !== 'shard' || !awakened || !awakened[it.id]) return it;
    const h = heroes[it.id], d = it.q * L.dust.perShard[h.r - 1] * h.cyc;
    dust += d;
    return Object.assign({}, it, { dust: d });
  });
  return { cur: result.cur, items, dust };
}

root.EnLoot = { mix32, seedOf, makeRng, windowOf, entriesOf, resolve, roll, toDust };
})(typeof window !== 'undefined' ? window : globalThis);
