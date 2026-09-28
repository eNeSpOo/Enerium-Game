/* Энериум · прототип «Свет снизу» — «Ремесло → Мастерская» на данных крафта (GDD §12, §36.12, §36.16).
   Подключается после screens/model.js, до boot(). Договор — screens/model.js: запасы только через BAG, найденные рецепты — BAG.known и BAG.learn.
   Экран разделён на подписанные зоны «Инвентарь» и «Крафт» (§12.4); крафт — стол из шести ячеек или книга рецептов.
   Вид — по «Правилам воздуха» UI-кита: на столе и в книге нет лишних подписей, сведения о ресурсе — лист по нажатию:
   на имени ресурса выбранной ячейки и на значках ингредиентов в книге.
   - Ресурс в ячейке из запасов не списан. Списание — при попытке, и со стола уходит всё.
   - Совпадение по вхождению: лишнее сгорает, неудача сжигает всё положенное, верный набор создаёт предмет всегда.
   - Подсказки — по §12, у рецептов от четырёх ингредиентов. Частичное знание рецепта — S.ws.part.
   - Автодокрафт — только по найденным рецептам; невосполнимое списывается лишь с явного согласия (§12.1).
   - Сервер решает: набор проверяет и автодокрафт утверждает WS_SRV. В игре это запросы, а клиент знает только найденные рецепты.
   Состояние экрана — S.ws. Числа — в WS_DATA: демонстрация, не баланс. Автопроверка — tools/content-gen/screens/check_craft.js. */
'use strict';

/* ================== данные экрана: демонстрация, не баланс ================== */
const WS_DATA = {
  cells: 6, cellMax: 100,          // §12: шесть ячеек, до 100 единиц в каждой
  hintFrom: 4, hintMin: 3,         // §12: подсказки — у рецептов от четырёх ингредиентов, верных на столе не меньше трёх
  steps: [-10, -1, 1, 10],         // кнопки количества в выбранной ячейке
  makeCap: 100,                    // сколько раз можно создать за одно подтверждение автодокрафта — потолок прототипа
  depth: 12,                       // глубина разворота цепочки — защита от петли в данных
  /* невосполнимое (§12.1): уникальные, руны, Энериум. Трофеи, находки и Многоликий — открытый вопрос автору
     (docs/content/ресурсы-рецепты-дроп.md, «Открыто», п. 2) */
  special: { tiers: ['unique', 'rune', 'valor'], items: ['energ'] },
  wallet: { energ: 'enerium', rkey: 'keys' },   // выход рецепта, который у игрока — валюта кошелька, а не предмет запасов
  /* вкладки инвентаря — ярусы recipes.js */
  groups: [
    ['all', 'Всё', null],
    ['basic', 'Базовые', ['basic']],
    ['key', 'Ключи', ['key']],
    ['made', 'Изделия', ['part', 'made', 'act', 'call', 'product']],
    ['loot', 'Добыча', ['craftres', 'find', 'trophy', 'unique', 'echo']],
    ['rune', 'Руны', ['rune', 'vshard', 'valor']],
  ],
  /* вид рецепта в книге — kind из recipes.js */
  kinds: [
    ['part', 'Заготовки', ['part']],
    ['made', 'Изделия', ['made']],
    ['act', 'Активации', ['act']],
    ['call', 'Призывы', ['call']],
    ['hero', 'Герои', ['hero']],
    ['rune', 'Руны', ['rune', 'valor']],
    ['product', 'Награды', ['product']],
  ],
  demo: {
    fav: ['r_act_cb1'],                                                   // избранное
    part: { r_call_fb2: { pos: ['u1', 'p_frame', 'p_coal'] } },           // подсказка в книге: три верных из четырёх
    table: [['fang', 2], ['k1_hunt', 1]],                                 // поток «Мастерская»: найденный рецепт на столе
    hint: [['find_cb1', 1], ['p_waxthread', 2], ['cr_mold', 3]],          // поток «подсказки»: три верных из четырёх у рецепта героя
    chain: { learn: ['r_a_cast', 'r_p_lure'], make: 'r_call_fb1' },       // поток «автодокрафт»: цепочка и уникальный ресурс
  },
};

/* ================== сервер решает ==================
   В игре это запросы: рецепты и таблицы наград живут только на сервере (CLAUDE.md, инварианты; §36.16).
   Прототип держит весь набор в recipes.js для проектирования, экран обращается к нему только здесь.
   Клиент получает найденные рецепты и подсказки, на попытку — итог. Спойлеры цикла VI (team) в прототипе не участвуют. */
const wsOrd = new Map(EN_RECIPES.recipes.map((r, i) => [r.id, i]));
const wsSum = r => r.in.reduce((a, [, q]) => a + q, 0);
/* из нескольких совпавших срабатывает самый полный: больше ингредиентов, затем больше единиц, затем порядок данных.
   Иначе рецепт, чей состав входит в другой, закрыл бы его навсегда: Дорожный фонарь — внутри Снадобья от ожогов.
   Правило прототипа, в §12 его нет — вопрос автору. */
const wsSpecific = (a, b) => b.in.length - a.in.length || wsSum(b) - wsSum(a) || wsOrd.get(a.id) - wsOrd.get(b.id);
const WS_SRV = {
  recipes: () => EN_RECIPES.recipes.filter(r => !r.team),
  /* найденный: открыт игроком или известен по правилу данных — рецепт руны доблести известен с первого осколка (known0) */
  isKnown: r => !!r && (BAG.known(r.id) || (!!r.known0 && r.in.some(([id]) => BAG.has(id)))),
  known: () => WS_SRV.recipes().filter(WS_SRV.isKnown),
  /* попытка на столе (§12): какой рецепт сработает и какие подсказки откроются. Ничего не меняет — итог применяет wsAttempt */
  check(cells) {
    const have = new Map(cells.map(c => [c.id, c.q])), pool = WS_SRV.recipes();
    const fit = pool.filter(r => r.in.every(([id, q]) => (have.get(id) || 0) >= q)).sort(wsSpecific)[0];
    if (fit) { const h = wsHero(fit); return h && rsHas(h) ? { refuse: 'owned', r: fit, hero: h } : { made: fit }; }
    const ids = [...have.keys()], hints = [];
    if (ids.length >= WS_DATA.hintMin) for (const r of pool) {
      const ing = r.in.map(([id]) => id);
      if (ing.length < WS_DATA.hintFrom || WS_SRV.isKnown(r) || !ids.every(id => ing.includes(id))) continue;   // все заполненные верны
      const was = S.ws.part[r.id], before = was ? was.pos : [];
      if (before.length === ing.length) continue;                                  // уже открыт без количеств
      const full = ids.length === ing.length;                                     // все ресурсы верны, количество — нет: послабление
      const pos = ing.filter(id => full || before.includes(id) || ids.includes(id));
      const fresh = pos.filter(id => !before.includes(id));
      if (fresh.length) hints.push({ r, pos, fresh, all: pos.length === ing.length, first: !was });
    }
    return { made: null, hints };
  },
  /* автодокрафт (§12.1): сервер сам разворачивает цепочку по найденным рецептам и проверяет согласие на невосполнимое */
  make(rid, n, ok) {
    const r = BAG.recipe(rid);
    if (!r || r.team || !WS_SRV.isKnown(r)) return { refuse: 'unknown' };
    const p = wsPlan(r, n);
    if (p.owned) return { refuse: 'owned', p };
    if (!p.ok) return { refuse: p.stop.length ? 'stop' : 'lack', p };
    if (p.special.length && !ok) return { refuse: 'consent', p };
    return { plan: p };
  },
};
const WS_REFUSE = {
  unknown: 'Автодокрафт работает только по найденным рецептам',
  owned: 'Герой уже в коллекции',
  stop: 'Неизвестный этап: автодокрафт остановлен',
  lack: 'Не хватает ресурсов',
  consent: 'Без согласия особый ресурс не списывается',
};

/* ================== помощники ================== */
const wsEmpty = () => Array.from({ length: WS_DATA.cells }, () => null);
function wsFresh() {
  const D = WS_DATA.demo, part = {};
  for (const [id, p] of Object.entries(D.part)) part[id] = { pos: p.pos.slice() };
  return { cells: wsEmpty(), sel: 0, pick: '', view: 'table', inv: { cat: 'all', q: '' }, book: { tab: 'all', kind: '', fav: false, q: '' }, part, fav: D.fav.slice(), last: null };
}
const wsItemOrd = new Map(EN_RECIPES.items.map((it, i) => [it.id, i]));
const wsGroupOf = it => Math.max(0, WS_DATA.groups.findIndex(g => g[2] && g[2].includes(it.tier)));
const wsSpecial = id => { const it = BAG.item(id); return !!it && (WS_DATA.special.tiers.includes(it.tier) || WS_DATA.special.items.includes(id)); };
const wsHero = r => { const it = r ? BAG.item(r.out[0]) : null; return it && it.tier === 'hero' ? RSI[it.heroId] || null : null; };
/* создаётся ли предмет рецептом: в игре — признак предмета, сам рецепт клиенту не приходит */
const wsByRecipe = id => (RX_OUT[id] || []).some(r => !r.team);
const wsCells = () => S.ws.cells.filter(Boolean);
const wsOn = id => { const c = S.ws.cells.find(x => x && x.id === id); return c ? c.q : 0; };
const wsCellMax = id => Math.min(WS_DATA.cellMax, BAG.qty(id));
const wsName = id => { const it = BAG.item(id); return it ? it.n : '—'; };
const wsNames = list => list.map(([id, q]) => `${wsName(id)} ×${fmt(q)}`).join(', ');
const wsTier = it => (EN_RECIPES.tiers[it.tier] || { n: '' }).n;
const wsCanRepeat = () => (S.ws.last || []).some(c => BAG.has(c.id));
/* что со стола сгорит сверх рецепта */
const wsExtra = (cells, r) => cells.map(c => { const x = r.in.find(([id]) => id === c.id); return [c.id, c.q - (x ? x[1] : 0)]; }).filter(([, q]) => q > 0);
/* запасы игрока в порядке ярусов и данных: только через BAG */
const wsStock = () => EN_RECIPES.items.filter(it => !it.team && it.tier !== 'hero' && BAG.qty(it.id) > 0)
  .sort((a, b) => wsGroupOf(a) - wsGroupOf(b) || wsItemOrd.get(a.id) - wsItemOrd.get(b.id));

/* выдача итога: предмет — в запасы, герой — в коллекцию с 0 ур., 0 РП и 0 Добл (ADR-0019), валюта — в кошелёк */
function wsGive(id, q) {
  const it = BAG.item(id); if (!it) return;
  if (it.tier === 'hero') { const h = RSI[it.heroId]; if (h && !rsHas(h)) rsAdd(h, 'craft'); return; }
  const w = WS_DATA.wallet[id]; if (w && w in S.wallet) { S.wallet[w] += q; return; }
  BAG.add(id, q);
}
/* ресурс на стол: нажатием — в выбранную ячейку, если она занята другим — в первую свободную; переносом — в ячейку at */
function wsPut(id, at) {
  const W = S.ws, it = BAG.item(id);
  if (!it || it.team) return false;
  const max = wsCellMax(id);
  if (max < 1) { toast(`${it.n}: в запасах нет`); return false; }
  W.pick = id;
  const ex = W.cells.findIndex(c => c && c.id === id);
  if (at == null) {
    if (ex >= 0) { const c = W.cells[ex]; c.q = Math.min(max, c.q + 1); W.sel = ex; return true; }
    const i = W.cells[W.sel] ? W.cells.findIndex(c => !c) : W.sel;
    if (i < 0) { toast(`Все ${WS_DATA.cells} ячеек заняты`); return false; }
    W.cells[i] = { id, q: 1 }; W.sel = i; return true;
  }
  if (!(at >= 0 && at < WS_DATA.cells)) return false;
  if (ex !== at) { const moved = ex >= 0 ? W.cells[ex] : { id, q: 1 }; if (ex >= 0) W.cells[ex] = W.cells[at]; W.cells[at] = moved; }
  W.sel = at; return true;
}
/* после расхода вне стола ячейки не держат больше, чем есть в запасах */
function wsClamp() { S.ws.cells = S.ws.cells.map(c => { if (!c) return null; const q = Math.min(c.q, wsCellMax(c.id)); return q > 0 ? { id: c.id, q } : null; }); }
function wsSetTable(list) {
  S.ws.cells = wsEmpty();
  list.slice(0, WS_DATA.cells).forEach(([id, q], i) => { const m = wsCellMax(id); if (m > 0) S.ws.cells[i] = { id, q: Math.min(q, m) }; });
  const free = S.ws.cells.findIndex(c => !c);
  S.ws.sel = free < 0 ? 0 : free; S.ws.view = 'table';
}

/* разворот цепочки по найденным рецептам (§12.1, §12.4): сначала запасы, затем остаток уже созданного в этой цепочке, затем новый этап.
   Неизвестный этап — предмет, который создаётся рецептом, но рецепт не найден: автодокрафт останавливается */
function wsPlan(r, n) {
  const by = {};
  WS_SRV.known().forEach(k => { if (!by[k.out[0]]) by[k.out[0]] = k; });
  const left = {}, spend = {}, made = {}, lack = {}, stop = [], steps = [];
  const want = (id, q, d) => {
    const s = id in left ? left[id] : BAG.qty(id), a = Math.min(s, q);
    if (a) { left[id] = s - a; spend[id] = (spend[id] || 0) + a; q -= a; }
    const m = made[id] || 0, b = Math.min(m, q);
    if (b) { made[id] = m - b; q -= b; }
    if (!q) return;
    const p = by[id];
    if (!p || d > WS_DATA.depth) { if (wsByRecipe(id)) { if (!stop.includes(id)) stop.push(id); } else lack[id] = (lack[id] || 0) + q; return; }
    const t = Math.ceil(q / p.out[1]);
    p.in.forEach(([x, k]) => want(x, k * t, d + 1));
    steps.push([p, t]);
    made[id] = (made[id] || 0) + t * p.out[1] - q;
  };
  r.in.forEach(([x, k]) => want(x, k * n, 1));
  const st = [];
  steps.forEach(([p, t]) => { const e = st.find(x => x.r === p); if (e) e.t += t; else st.push({ r: p, t }); });
  const sp = Object.entries(spend), hero = wsHero(r);
  return { r, n, out: r.out[1] * n, spend: sp, steps: st, stop, lack: Object.entries(lack), extra: Object.entries(made).filter(([, q]) => q > 0),
    special: sp.filter(([id]) => wsSpecial(id)), hero, owned: !!hero && rsHas(hero), ok: !stop.length && !Object.keys(lack).length };
}
/* сколько раз можно создать сейчас */
function wsMaxN(r) {
  const cap = wsHero(r) ? 1 : WS_DATA.makeCap;
  let n = 0;
  while (n < cap && wsPlan(r, n + 1).ok) n++;
  return n;
}
/* что видит клиент на столе: совпадение только с найденными рецептами — исход всё равно решает сервер */
function wsGuess() {
  const cells = wsCells();
  const lack = cells.filter(c => c.q > BAG.qty(c.id)), special = cells.filter(c => wsSpecial(c.id));
  if (!cells.length) return { st: 'empty', lack, special, extra: [] };
  const have = new Map(cells.map(c => [c.id, c.q]));
  const fit = WS_SRV.known().filter(r => r.in.every(([id, q]) => (have.get(id) || 0) >= q)).sort(wsSpecific)[0];
  if (!fit) return { st: 'unknown', lack, special, extra: [] };
  const h = wsHero(fit);
  return { st: 'known', r: fit, lack, special, extra: wsExtra(cells, fit), owned: !!h && rsHas(h) };
}
/* подсказка, чьи открытые позиции все лежат на столе */
function wsTrail() {
  const on = new Set(wsCells().map(c => c.id));
  for (const [id, p] of Object.entries(S.ws.part)) {
    const r = BAG.recipe(id);
    if (r && !WS_SRV.isKnown(r) && p.pos.length < r.in.length && p.pos.every(x => on.has(x))) return { r, n: p.pos.length };
  }
  return null;
}
/* попытка со стола: сервер решает, итог — в демо-состояние */
function wsAttempt(consent) {
  const cells = wsCells().map(c => ({ id: c.id, q: c.q }));
  if (!cells.length) return close();
  if (!cells.every(c => BAG.has(c.id, c.q))) { S.overlay = null; return toast('Не хватает в запасах — поправьте стол'); }
  if (!consent && cells.some(c => wsSpecial(c.id))) return toast(WS_REFUSE.consent);
  const v = WS_SRV.check(cells);
  if (v.refuse) { S.overlay = null; return toast(`${v.hero.n} уже в коллекции.${TM(' Что даёт повтор рецепта героя, не решено — заглушка прототипа')}`); }
  const isNew = !!v.made && !WS_SRV.isKnown(v.made);
  cells.forEach(c => BAG.take(c.id, c.q));   // со стола уходит всё: рецепт расходует своё, лишнее и неудача сгорают
  S.ws.last = cells; S.ws.cells = wsEmpty(); S.ws.sel = 0;
  if (v.made) {
    const r = v.made, burn = wsExtra(cells, r), h = wsHero(r);
    BAG.learn(r.id); delete S.ws.part[r.id];
    wsGive(r.out[0], r.out[1]);
    if (!isNew && !burn.length && !h) { S.overlay = null; return toast(`Создано: ${wsName(r.out[0])} ×${r.out[1]}`); }
    S.overlay = { t: 'wsres', res: { kind: 'made', rid: r.id, out: r.out[1], isNew, burn, hero: h ? h.id : '' } };
  } else {
    v.hints.forEach(x => { S.ws.part[x.r.id] = { pos: x.pos }; });
    S.overlay = { t: 'wsres', res: { kind: 'fail', burn: cells.map(c => [c.id, c.q]), hints: v.hints.map(x => ({ rid: x.r.id, fresh: x.fresh, all: x.all, first: x.first, n: x.pos.length })) } };
  }
  render(); focusOverlay();
}

/* ================== разметка ================== */
/* колодец предмета recipes.js: иконка ремесла или яруса из «Древа рецептов» (trIcon), кромка — редкость, ромб — особый ресурс */
function wsWell(it, o = {}) {
  if (!it) return '';
  const sp = wsSpecial(it.id), tag = o.stat ? 'span' : 'button';
  const cls = ['well', o.sel ? 'sel' : '', sp ? 'ws-sp' : '', o.cls || ''].filter(Boolean).join(' ');
  const lbl = `${trEsc(it.n)}${typeof o.q === 'number' ? ', ' + o.q + ' шт.' : ''}${o.on ? ', на столе ' + o.on : ''}${sp ? ', особый ресурс' : ''}`;
  const act = o.stat ? '' : ` data-a="${o.act || 'wsinfo'}" data-v="${o.v != null ? o.v : it.id}"${o.drag ? ` draggable="true" data-wsdrag="${it.id}"` : ''} aria-label="${lbl}"`;
  const q = o.q == null ? '' : `<span class="q">${typeof o.q === 'number' ? fmt(o.q) : o.q}</span>`;
  return `<${tag} class="${cls}" data-r="${it.r}"${act}${o.attr || ''} title="${trEsc(it.n)}"${o.size ? ` style="--s:${o.size}px"` : ''}>${trIcon(it)}${q}${o.on ? `<span class="ws-on">${fmt(o.on)}</span>` : ''}</${tag}>`;
}
const wsList = list => `<div class="ws-sum">${list.map(([id, q]) => { const it = BAG.item(id); return it ? `<span class="ws-need${wsSpecial(id) ? ' sp' : ''}">${wsWell(it, { stat: true, q })}<span class="col"><b>${trEsc(it.n)}</b><small class="faint">${wsTier(it)}</small></span></span>` : ''; }).join('')}</div>`;
const wsNeedHtml = ([id, q]) => { const it = BAG.item(id); return it ? `<span class="ws-need${wsSpecial(id) ? ' sp' : ''}">${wsWell(it, { stat: true, q })}<span class="col"><b>${trEsc(it.n)}</b><small class="faint num">есть ${fmt(BAG.qty(id))}${wsSpecial(id) ? ' · особый' : ''}</small></span></span>` : ''; };
const wsIng = (r, t) => `<span class="ws-ing">${r.in.map(([id, q]) => wsWell(BAG.item(id), { stat: true, q: q * t })).join('')}</span>`;
const wsStepHtml = (r, t, fin) => `<li${fin ? ' class="fin"' : ''}>${wsWell(BAG.item(r.out[0]), { stat: true, size: 28 })}<b>${trEsc(r.n)}</b><span class="num faint">×${fmt(t)}</span>${wsIng(r, t)}</li>`;

function wsView() {
  return `<section class="scr"><div class="ws">${wsInvHtml()}${wsCraftHtml()}</div></section>`;
}
/* зона «Инвентарь»: запасы по ярусам и поиск. Нажатие или перенос кладёт ресурс в выбранную ячейку; сведения — на столе, по имени */
function wsInvHtml() {
  const W = S.ws, q = trNorm(W.inv.q.trim()), g = WS_DATA.groups.find(x => x[0] === W.inv.cat) || WS_DATA.groups[0];
  const list = wsStock().filter(it => (!g[2] || g[2].includes(it.tier)) && (!q || trNorm(it.n).includes(q)));
  const tabs = WS_DATA.groups.map(([k, l]) => `<button role="tab" aria-selected="${g[0] === k}" data-a="wscat" data-v="${k}">${l}</button>`).join('');
  const wells = list.map(it => wsWell(it, { act: 'wsput', q: BAG.qty(it.id), on: wsOn(it.id), drag: true, sel: W.pick === it.id })).join('');
  return `<div class="pnl ws-inv">
    <div class="pnl-h"><h2>Инвентарь</h2><label class="search grow">${ic('search')}<input id="wsInvQ" type="search" placeholder="Поиск по запасам" value="${trEsc(W.inv.q)}" autocomplete="off" aria-label="Поиск по запасам"></label></div>
    <div class="tabs" role="tablist" aria-label="Запасы по ярусам">${tabs}</div>
    <div class="ws-grid scroll grow" data-keep="wsinv:${g[0]}">${wells || '<p class="faint ws-none">Ничего не найдено</p>'}</div>
  </div>`;
}
/* зона «Крафт»: стол или книга рецептов */
function wsCraftHtml() {
  const book = S.ws.view === 'book', n = WS_SRV.known().length + wsParts().length;
  const tabs = `<div class="tabs" role="tablist" aria-label="Крафт"><button role="tab" aria-selected="${!book}" data-a="wsview" data-v="table">Стол</button><button role="tab" aria-selected="${book}" data-a="wsview" data-v="book">${ic('book')}Книга · ${n}</button></div>`;
  return `<div class="pnl ws-craft"><div class="pnl-h"><h2>Крафт</h2><span class="g-spacer"></span>${tabs}</div>${book ? wsBookHtml() : wsTableHtml()}</div>`;
}
function wsCellHtml(c, i) {
  const sel = S.ws.sel === i, it = c ? BAG.item(c.id) : null, attr = ` data-wscell="${i}" aria-pressed="${sel}"`;
  if (!it) return `<button class="well empty ws-cell${sel ? ' sel' : ''}" data-a="wscell" data-v="${i}"${attr} aria-label="Ячейка ${i + 1}, пустая">${ic('plus')}</button>`;
  return wsWell(it, { act: 'wscell', v: i, q: c.q, sel, cls: 'ws-cell' + (c.q > BAG.qty(c.id) ? ' ws-lack' : ''), attr });
}
function wsTableHtml() {
  const g = wsGuess(), out = g.st === 'known' ? BAG.item(g.r.out[0]) : null;
  const core = out ? `<span class="well ws-core known" data-r="${out.r}" title="${trEsc(out.n)}">${trIcon(out)}</span>` : '<span class="well ws-core"><span>?</span></span>';
  return `<div class="ws-hex"><div class="ws-hex-in">${S.ws.cells.map(wsCellHtml).join('')}${core}</div></div>${wsQtyHtml()}${wsFootHtml(g)}`;
}
/* количество в выбранной ячейке: до 100 и не больше, чем в запасах. Имя ресурса — кнопка сведений; пустая ячейка — пустая строка */
function wsQtyHtml() {
  const W = S.ws, c = W.cells[W.sel], it = c ? BAG.item(c.id) : null;
  if (!it) return '<div class="ws-qty"></div>';
  const max = wsCellMax(c.id), b = (v, l, dis, lbl) => `<button class="ws-qb" data-a="wsq" data-v="${v}"${dis ? ' disabled' : ''} aria-label="${lbl}">${l}</button>`;
  const minus = WS_DATA.steps.filter(s => s < 0).map(s => b(s, '−' + -s, c.q <= 1, 'Меньше на ' + -s)).join('');
  const plus = WS_DATA.steps.filter(s => s > 0).map(s => b(s, '+' + s, c.q >= max, 'Больше на ' + s)).join('');
  return `<div class="ws-qty"><button class="ws-qn" data-a="wsinfo" data-v="${it.id}" title="Сведения: ${trEsc(it.n)} · в запасах ${fmt(BAG.qty(c.id))}"><span>${trEsc(it.n)}</span>${ic('info')}</button>${minus}<input class="ws-qin num" type="number" inputmode="numeric" min="1" max="${Math.max(1, max)}" value="${c.q}" data-a="wsqset" aria-label="Количество в ячейке ${W.sel + 1}">${plus}${b('max', 'Макс', c.q >= max, 'Сколько можно')}${b('x', ic('x'), false, 'Убрать из ячейки')}</div>`;
}
function wsFootHtml(g) {
  const any = g.st !== 'empty';
  let st, cls = g.st;
  if (!any) st = 'Положите ресурсы в ячейки — порядок не важен.';
  else if (g.lack.length) { cls = 'bad'; st = 'Не хватает в запасах: ' + trEsc(wsNames(g.lack.map(c => [c.id, c.q - BAG.qty(c.id)]))); }
  else if (g.st === 'known') st = g.owned ? `«${trEsc(g.r.n)}»: ${trEsc(wsHero(g.r).n)} уже в коллекции` : `Совпадает с рецептом «${trEsc(g.r.n)}»${g.extra.length ? ' · лишнее сгорит: ' + trEsc(wsNames(g.extra)) : ''}`;
  else { const t = wsTrail(); st = t ? `На столе все открытые позиции «${trEsc(t.r.n)}»: ${t.n} из ${t.r.in.length}. Остальное — угадать.` : 'Сочетание неизвестно. При неудаче сгорит всё положенное.'; }
  const go = any && !g.lack.length && !g.owned;
  return `<div class="ws-foot"><p class="ws-st ${cls}" role="status">${st}</p><button class="btn ghost sm" data-a="wsclear"${any ? '' : ' disabled'}>Очистить</button><button class="btn go" data-a="wstry"${go ? '' : ' disabled'}>${g.st === 'known' ? 'Создать' : 'Попробовать'}</button></div>`;
}

/* ================== книга рецептов (§12.4) ==================
   Плотный список: найденные рецепты и подсказки. Поиск, вид, избранное и вкладки видны всегда, прокручивается только список */
const wsParts = () => Object.keys(S.ws.part).map(id => ({ r: BAG.recipe(id), part: S.ws.part[id] })).filter(x => x.r && !x.r.team && !WS_SRV.isKnown(x.r));
function wsBookRows() {
  const fav = id => S.ws.fav.includes(id) ? 0 : 1;
  return WS_SRV.known().map(r => ({ r, plan: wsPlan(r, 1) })).concat(wsParts())
    .sort((a, b) => fav(a.r.id) - fav(b.r.id) || (a.part ? 1 : 0) - (b.part ? 1 : 0) || wsOrd.get(a.r.id) - wsOrd.get(b.r.id));
}
/* поиск — по названию рецепта, результату и известным ингредиентам */
function wsBookHit(x, q) {
  if (!q) return true;
  const ids = x.r.in.map(([id]) => id).filter(id => !x.part || x.part.pos.includes(id));
  return [x.r.n, wsName(x.r.out[0])].concat(ids.map(wsName)).some(s => trNorm(s).includes(q));
}
/* строка книги: избранное, название и одно состояние, компактный состав, одно действие. Особый ресурс — ромб на значке,
   значки ингредиентов и результата — кнопки сведений */
function wsRowHtml(x) {
  const r = x.r, out = BAG.item(r.out[0]), fav = S.ws.fav.includes(r.id);
  const star = `<button class="ws-star" data-a="wsfav" data-v="${r.id}" aria-pressed="${fav}" aria-label="${fav ? 'Убрать из избранного' : 'В избранное'}: ${trEsc(r.n)}">${ic('star')}</button>`;
  const outW = `<span class="arr">${ic('arrow')}</span>${wsWell(out, { q: r.out[1] > 1 ? r.out[1] : null })}`;
  if (x.part) {
    const shown = r.in.map(([id]) => id).filter(id => x.part.pos.includes(id)), hid = r.in.length - shown.length;
    const ing = shown.map(id => wsWell(BAG.item(id), { q: '?' })).join('') + '<span class="well empty" title="Позиция не открыта">?</span>'.repeat(hid);
    const chip = `<span class="chip spirit">${ic('eye')}${hid ? `верно ${shown.length} из ${r.in.length}` : 'без количеств'}</span>`;
    return `<div class="ws-rc part">${star}<div class="ws-rc-m"><div class="ws-rc-t"><b>${trEsc(r.n)}</b>${chip}</div><div class="ws-ing">${ing}${outW}</div></div><button class="btn sm" data-a="wsload" data-v="${r.id}">На стол</button></div>`;
  }
  const p = x.plan, k = p.steps.length;
  const state = p.owned ? `<span class="chip gold">${ic('check')}в коллекции</span>`
    : p.ok ? `<span class="chip spirit">${ic('check')}${k ? `через ${k} ${plural(k, 'этап', 'этапа', 'этапов')}` : 'можно создать'}</span>`
    : p.stop.length ? `<span class="chip warn">${ic('lock')}неизвестный этап</span>` : '<span class="chip">не хватает</span>';
  const ing = r.in.map(([id, q]) => wsWell(BAG.item(id), { q, cls: BAG.qty(id) < q ? 'ws-short' : '' })).join('');
  return `<div class="ws-rc">${star}<div class="ws-rc-m"><div class="ws-rc-t"><b>${trEsc(r.n)}</b>${state}</div><div class="ws-ing">${ing}${outW}</div></div><button class="btn sm go" data-a="wsmake" data-v="${r.id}"${p.owned ? ' disabled' : ''}>Создать</button></div>`;
}
function wsBookHtml() {
  const B = S.ws.book, q = trNorm(B.q.trim()), rows = wsBookRows(), K = WS_DATA.kinds.find(k => k[0] === B.kind);
  const base = rows.filter(x => (!B.fav || S.ws.fav.includes(x.r.id)) && (!K || K[2].includes(x.r.kind)) && wsBookHit(x, q));
  const tabs = [['all', 'Все', base], ['can', 'Создать сейчас', base.filter(x => x.plan && x.plan.ok && !x.plan.owned)], ['hint', 'Подсказки', base.filter(x => x.part)]];
  const cur = tabs.find(t => t[0] === B.tab) || tabs[0];
  const opts = '<option value="">Все виды</option>' + WS_DATA.kinds.filter(k => k[0] === B.kind || rows.some(x => k[2].includes(x.r.kind)))
    .map(k => `<option value="${k[0]}"${k[0] === B.kind ? ' selected' : ''}>${k[1]}</option>`).join('');
  const empty = cur[0] === 'hint' && !rows.some(x => x.part)
    ? `<p class="reason">Подсказок пока нет. Они появляются, когда на столе не меньше ${WS_DATA.hintMin} верных ресурсов рецепта от ${WS_DATA.hintFrom} ингредиентов.</p>`
    : '<p class="faint ws-none">Ничего не найдено</p>';
  return `<div class="ws-bh"><label class="search grow">${ic('search')}<input id="wsBookQ" type="search" placeholder="Рецепт или ресурс" value="${trEsc(B.q)}" autocomplete="off" aria-label="Поиск по книге рецептов"></label><select class="rs-sel" data-a="wsbkind" aria-label="Вид рецепта">${opts}</select><button class="iconbtn ws-favt" data-a="wsbfav" aria-pressed="${B.fav}" aria-label="Только избранное" title="Только избранное">${ic('star')}</button></div>
    <div class="tabs" role="tablist" aria-label="Книга рецептов">${tabs.map(([k, l, list]) => `<button role="tab" aria-selected="${cur[0] === k}" data-a="wsbtab" data-v="${k}">${l} · ${list.length}</button>`).join('')}</div>
    <div class="ws-list scroll grow" data-keep="wsbook:${cur[0]}">${cur[2].map(wsRowHtml).join('') || empty}</div>`;
}

/* ================== листы поверх ================== */
Object.assign(OV, {
  /* сведения о ресурсе: ярус, загадка-подсказка к рецептам (§12), запасы, найденные рецепты. Будущий биом и босс не раскрываются (§12.5) */
  wsitem(o) {
    const it = BAG.item(o.arg); if (!it || it.team) return '';
    const sp = it.spec ? it.spec.split('+').map(s => EN_RECIPES.specs[s] ? EN_RECIPES.specs[s].n.toLowerCase() : '').filter(Boolean).join(' + ') : '';
    const uses = WS_SRV.known().filter(r => r.in.some(([id]) => id === it.id));
    const trails = wsParts().filter(x => x.part.pos.includes(it.id)), on = wsOn(it.id);
    const body = `<div class="ws-o">
      <div class="row" style="gap:12px">${wsWell(it, { stat: true, size: 64 })}<div class="col" style="gap:4px;min-width:0"><span class="eyebrow">${wsTier(it)}${sp ? ' · ' + sp : ''}</span><b class="serif" style="font-size:22px;line-height:1.05">${trEsc(it.n)}</b><span class="ws-rar" data-r="${it.r}">${ICON('r' + it.r, 16)}${RAR[it.r]}</span></div><span class="g-spacer"></span><div class="stat" style="align-items:flex-end"><b>${fmt(BAG.qty(it.id))}</b><small>в запасах</small></div></div>
      <p class="quote"><b>Загадка</b>${trEsc(it.lore)}</p>
      <dl class="kv"><dt>Цикл</dt><dd>${it.pool ? 'общий пул' : ROMAN[it.cyc] || '—'}</dd><dt>На столе</dt><dd>${on ? fmt(on) : 'нет'}</dd>${wsSpecial(it.id) ? '<dt>Особый ресурс</dt><dd class="gold">расход только с согласия</dd>' : ''}</dl>
      <span class="eyebrow">Найденные рецепты</span>${uses.length ? `<div class="tr-use">${uses.map(r => `<button class="chip" data-a="wsmake" data-v="${r.id}">${trEsc(r.n)}</button>`).join('')}</div>` : '<p class="faint" style="font-size:12.5px">Пока ни одного. Рецепты ищут на столе, загадка подсказывает дорогу.</p>'}
      ${trails.length ? `<span class="eyebrow">Подсказки</span><div class="tr-use">${trails.map(x => `<span class="chip spirit">${trEsc(x.r.n)}</span>`).join('')}</div>` : ''}
    </div>`;
    return sheet('Сведения', body, `<button class="btn go" data-a="wsput" data-v="${it.id}"${wsCellMax(it.id) ? '' : ' disabled'}>${ic('plus')}На стол</button>`);
  },
  /* подтверждение попытки: со стола уйдёт всё; особый ресурс — только с согласия */
  wstry(o) {
    const cells = wsCells(), g = wsGuess(), sp = g.special;
    const guess = g.st === 'known'
      ? `<p class="muted" style="font-size:14px">Совпадает с найденным рецептом «${trEsc(g.r.n)}»: он создаст ${trEsc(wsName(g.r.out[0]))} ×${g.r.out[1]}.${g.extra.length ? ' Лишнее сгорит: ' + trEsc(wsNames(g.extra)) + '.' : ''}</p>`
      : `<p class="reason warn">Сочетание неизвестно. При неудаче сгорит всё положенное. Верное сочетание создаёт предмет всегда.</p><p class="reason">Подсказка бывает у рецептов от ${WS_DATA.hintFrom} ингредиентов: если все положенные ресурсы верны и их не меньше ${WS_DATA.hintMin}, рецепт появится в книге.</p>`;
    const cert = sp.length ? `<label class="cert"><input type="checkbox" data-a="wsok"${o.ok ? ' checked' : ''}><span><b>Разрешить расход: ${trEsc(wsNames(sp.map(c => [c.id, c.q])))}</b><small>Особый ресурс не восполнить. Без согласия он не списывается.</small></span></label>` : '';
    const body = `<div class="ws-o"><span class="eyebrow">Со стола уйдёт всё</span>${wsList(cells.map(c => [c.id, c.q]))}${guess}${cert}</div>`;
    const ok = g.st === 'known' ? 'Создать' : 'Попробовать';
    return dialog(g.st === 'known' ? 'Создать со стола' : 'Попробовать сочетание', body, `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="wstrydo"${sp.length && !o.ok ? ' disabled' : ''}>${ok}</button>`);
  },
  /* автодокрафт: количество, этапы по найденным рецептам, суммарный расход, согласие на невосполнимое (§12.1, §12.4) */
  wsmake(o) {
    const r = BAG.recipe(o.arg); if (!r || r.team) return '';
    /* состав ненайденного рецепта клиент не знает — и не показывает */
    if (!WS_SRV.isKnown(r)) return dialog('Создать', '<p class="reason warn">Рецепт ещё не найден: автодокрафт работает только по найденным. Рецепты ищут на столе.</p>', '<button class="btn go" data-a="close">Понятно</button>');
    const n = Math.max(1, o.n || 1), p = wsPlan(r, n), out = BAG.item(r.out[0]);
    const cap = p.hero ? 1 : WS_DATA.makeCap, max = wsMaxN(r);
    const step = `<div class="ws-n" role="group" aria-label="Сколько раз создать"><button class="ws-qb" data-a="wsn" data-v="-1"${n <= 1 ? ' disabled' : ''} aria-label="Меньше">−</button><b class="num">${n}</b><button class="ws-qb" data-a="wsn" data-v="1"${n >= cap ? ' disabled' : ''} aria-label="Больше">+</button><button class="ws-qb" data-a="wsn" data-v="max"${max > 1 ? '' : ' disabled'}>Макс${max > 1 ? ' · ' + max : ''}</button></div>`;
    const top = `<div class="ws-mk">${wsWell(out, { stat: true, size: 52 })}<div class="col" style="gap:3px;min-width:0"><span class="eyebrow">${wsTier(out)}</span><b class="serif" style="font-size:20px;line-height:1.05">${trEsc(out.n)}</b><small class="faint">выйдет ×${fmt(p.out)}${p.hero ? ' · придёт с 0 ур., 0 РП и 0 Добл' : ''}</small></div><span class="g-spacer"></span>${step}</div>`;
    const stages = p.steps.map(s => wsStepHtml(s.r, s.t, false)).join('')
      + p.stop.map(id => `<li class="unk">${ic('lock')}<b>${trEsc(wsName(id))}</b><span>рецепт не найден</span></li>`).join('')
      + wsStepHtml(r, n, true);
    const warn = [];
    if (p.owned) warn.push(`<p class="reason warn">${trEsc(p.hero.n)} уже в коллекции.${TM(' Что даёт повтор рецепта героя, не решено — заглушка прототипа.')}</p>`);
    if (p.stop.length) warn.push(`<p class="reason warn">Этап не найден: ${p.stop.map(id => '«' + trEsc(wsName(id)) + '»').join(', ')}. Автодокрафт остановлен — рецепт этапа ищут на столе.</p>`);
    if (p.lack.length) warn.push(`<p class="reason warn">Не хватает: ${trEsc(wsNames(p.lack))}.</p>`);
    const extra = p.extra.length ? `<p class="reason">Останется в запасах: ${trEsc(wsNames(p.extra))}.</p>` : '';
    const cert = p.special.length ? `<label class="cert${p.ok ? '' : ' off'}"><input type="checkbox" data-a="wsok"${o.ok ? ' checked' : ''}${p.ok ? '' : ' disabled'}><span><b>Разрешить расход: ${trEsc(wsNames(p.special))}</b><small>Особый ресурс не восполнить. Без согласия он не списывается.</small></span></label>` : '';
    const can = p.ok && !p.owned && (!p.special.length || !!o.ok);
    const body = `<div class="ws-o">${top}<span class="eyebrow">Этапы · по найденным рецептам</span><ol class="ws-steps">${stages}</ol>
      <span class="eyebrow">Суммарный расход</span>${p.spend.length ? `<div class="ws-sum">${p.spend.map(wsNeedHtml).join('')}</div>` : '<p class="faint" style="font-size:12.5px">Из запасов — ничего.</p>'}${extra}${warn.join('')}${cert}</div>`;
    return dialog('Создать · ' + trEsc(r.n), body, `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="wsmakedo"${can ? '' : ' disabled'}>Создать${n > 1 ? ' ×' + n : ''}</button>`, 'wide');
  },
  /* итог операции: создано, новый рецепт, герой в коллекции; неудача — что сгорело и какие подсказки открылись */
  wsres(o) {
    const x = o.res || {};
    if (x.kind === 'fail') {
      const hints = (x.hints || []).map(h => {
        const r = BAG.recipe(h.rid); if (!r) return '';
        const txt = h.all ? 'все ресурсы верны, количество — нет: рецепт открыт без количеств'
          : h.first ? `появился в книге: верно ${h.n} из ${r.in.length}` : `открыта позиция «${trEsc(h.fresh.map(wsName).join('», «'))}»: верно ${h.n} из ${r.in.length}`;
        return `<div class="ws-hint">${ic('eye')}<span><b>«${trEsc(r.n)}»</b> — ${txt}</span></div>`;
      }).join('');
      const body = `<div class="ws-o"><p class="muted" style="font-size:14px">Сочетание не сработало — всё положенное сгорело.</p>${wsList(x.burn || [])}
        ${hints ? '<span class="eyebrow">Подсказки</span>' + hints : `<p class="reason">Подсказки нет. Она бывает у рецептов от ${WS_DATA.hintFrom} ингредиентов, когда все положенные ресурсы верны и их не меньше ${WS_DATA.hintMin}.</p>`}</div>`;
      return dialog('Неудача', body, `${wsCanRepeat() ? '<button class="btn ghost" data-a="wsrepeat">Повторить набор</button>' : ''}${hints ? '<button class="btn" data-a="wshints">К подсказкам</button>' : ''}<button class="btn go" data-a="close">Готово</button>`);
    }
    const r = BAG.recipe(x.rid), out = r ? BAG.item(r.out[0]) : null; if (!out) return '';
    const h = x.hero ? RSI[x.hero] : null, lines = [];
    if (x.isNew) lines.push(`<p class="reason">Рецепт «${trEsc(r.n)}» теперь в книге: оттуда его можно создать сразу, с разворотом цепочки.</p>`);
    if (h) lines.push(`<p class="muted" style="font-size:14px">${trEsc(h.n)} в коллекции: 0 ур. · 0 РП · 0 Добл.</p>`);
    if (x.kind === 'make') lines.push(`<span class="eyebrow">Списано${x.steps ? ' · этапов ' + x.steps : ''}</span>${wsList(x.spend || [])}`);
    if (x.burn && x.burn.length) lines.push(`<span class="eyebrow">Лишнее сгорело</span>${wsList(x.burn)}`);
    const head = `<div class="ws-res">${wsWell(out, { stat: true, size: 64 })}<div class="col" style="gap:4px;min-width:0"><span class="eyebrow">${x.isNew ? 'Новый рецепт найден' : wsTier(out)}</span><b class="serif" style="font-size:24px;line-height:1.05">${trEsc(out.n)}</b><span class="faint num">×${fmt(x.out)}</span></div></div>`;
    const foot = `${h ? `<button class="link" data-a="rhero" data-v="${h.id}">${ic('users')}Карточка героя</button>` : ''}${x.kind === 'made' && wsCanRepeat() ? '<button class="btn ghost" data-a="wsrepeat">Повторить набор</button>' : ''}<button class="btn go" data-a="close">Готово</button>`;
    return dialog(x.kind === 'make' ? 'Автодокрафт' : x.isNew ? 'Новый рецепт' : 'Создано', `<div class="ws-o">${head}${lines.join('')}</div>`, foot);
  },
});

/* ================== действия ================== */
Object.assign(ACT, {
  wscat(v) { S.ws.inv.cat = v; render(); },
  wsput(v) { if (S.overlay) S.overlay = null; if (wsPut(v)) S.ws.view = 'table'; render(); },
  wscell(v) { const i = +v; if (!(i >= 0 && i < WS_DATA.cells)) return; S.ws.sel = i; const c = S.ws.cells[i]; if (c) S.ws.pick = c.id; render(); },
  wsq(v) {
    const W = S.ws, c = W.cells[W.sel]; if (!c) return;
    if (v === 'x') W.cells[W.sel] = null;
    else { const max = wsCellMax(c.id); c.q = v === 'max' ? max : Math.max(1, Math.min(max, c.q + (+v || 0))); if (c.q < 1) W.cells[W.sel] = null; }
    render();
  },
  wsqset(v, t) {
    const W = S.ws, c = W.cells[W.sel], n = Math.floor(Number(t && t.value));
    if (c && Number.isFinite(n)) { c.q = Math.max(1, Math.min(wsCellMax(c.id), n)); if (c.q < 1) W.cells[W.sel] = null; }
    render();
  },
  wsclear() { S.ws.cells = wsEmpty(); S.ws.sel = 0; render(); },
  wsview(v) { S.ws.view = v === 'book' ? 'book' : 'table'; render(); },
  wsinfo(v) { if (BAG.item(v)) open('wsitem', v); },
  wstry() {
    const g = wsGuess(); if (g.st === 'empty') return;
    if (g.lack.length) return toast('Не хватает в запасах: ' + wsNames(g.lack.map(c => [c.id, c.q - BAG.qty(c.id)])));
    if (g.owned) return toast(`${wsHero(g.r).n} уже в коллекции`);
    if (g.st === 'known' && !g.extra.length && !g.special.length) return wsAttempt(false);   // чистый найденный рецепт — без лишнего вопроса
    open('wstry', '', { ok: false });
  },
  wstrydo() { const o = S.overlay; if (!o || o.t !== 'wstry') return; wsAttempt(!!o.ok); },   // повторное нажатие не повторяет расход
  wsrepeat() {
    const L = S.ws.last || [];
    wsSetTable(L.map(c => [c.id, c.q]));
    S.overlay = null; render();
  },
  wshints() { S.ws.view = 'book'; S.ws.book.tab = 'hint'; S.overlay = null; render(); },
  wsbtab(v) { S.ws.book.tab = v; render(); },
  wsbkind(v, t) { S.ws.book.kind = t ? t.value : ''; render(); },
  wsbfav() { S.ws.book.fav = !S.ws.book.fav; render(); },
  wsfav(v) { const f = S.ws.fav, i = f.indexOf(v); if (i >= 0) f.splice(i, 1); else f.push(v); render(); },
  /* подсказку — на стол: открытые позиции по одной штуке, выбрана следующая пустая ячейка */
  wsload(v) {
    const r = BAG.recipe(v), p = S.ws.part[v]; if (!r || !p) return;
    const ids = r.in.map(([id]) => id).filter(id => p.pos.includes(id));
    wsSetTable(ids.filter(id => BAG.has(id)).map(id => [id, 1]));
    const miss = ids.filter(id => !BAG.has(id));
    if (miss.length) toast('Нет в запасах: ' + miss.map(wsName).join(', ')); else render();
  },
  wsmake(v) { if (BAG.recipe(v)) open('wsmake', v, { n: 1, ok: false }); },
  wsn(v) {
    const o = S.overlay, r = o && o.t === 'wsmake' ? BAG.recipe(o.arg) : null; if (!r) return;
    const cap = wsHero(r) ? 1 : WS_DATA.makeCap;
    o.n = v === 'max' ? Math.max(1, wsMaxN(r)) : Math.max(1, Math.min(cap, (o.n || 1) + (+v || 0)));
    render();
  },
  wsok(v, t) { if (!S.overlay) return; S.overlay.ok = !!(t && t.checked); render(); },
  wsmakedo() {
    const o = S.overlay; if (!o || o.t !== 'wsmake') return;   // повторное нажатие не повторяет расход и выдачу
    const v = WS_SRV.make(o.arg, o.n || 1, !!o.ok);            // сервер решает
    if (v.refuse) return toast(WS_REFUSE[v.refuse]);
    const p = v.plan;
    if (!p.spend.every(([id, q]) => BAG.has(id, q))) return toast('Запасы изменились — пересчитайте');
    p.spend.forEach(([id, q]) => BAG.take(id, q));
    p.extra.forEach(([id, q]) => wsGive(id, q));
    wsGive(p.r.out[0], p.out);
    BAG.learn(p.r.id); wsClamp();
    S.overlay = { t: 'wsres', res: { kind: 'make', rid: p.r.id, out: p.out, steps: p.steps.length, spend: p.spend, hero: p.hero ? p.hero.id : '' } };
    render(); focusOverlay();
  },
});
/* «На стол мастера» из других экранов: предмет запасов ложится на стол этой мастерской, прежние предметы прототипа — по-старому */
const wsToCraftBase = ACT.toCraft;
function wsToCraft(v, t, e) {
  if (!BAG.item(v)) return wsToCraftBase ? wsToCraftBase(v, t, e) : undefined;
  S.route = 'craft'; S.seg.craft = 'work'; S.ws.view = 'table'; S.overlay = null;
  wsPut(v); render();
}
ACT.toCraft = wsToCraft;

/* ================== регистрация, состояние, ввод ================== */
CRAFT_SEGS.work = wsView;
if (!RS_HOW.craft) RS_HOW.craft = 'создан в мастерской';
/* состояние: у текущей сессии и у сброса — одна и та же мастерская */
const wsInitBase = initialState;
initialState = function () { const s = wsInitBase(); s.ws = wsFresh(); return s; };
S.ws = wsFresh();

/* поиск: поле не теряет фокус при перерисовке */
document.addEventListener('input', e => {
  const t = e.target; if (!t || (t.id !== 'wsInvQ' && t.id !== 'wsBookQ')) return;
  if (t.id === 'wsInvQ') S.ws.inv.q = t.value; else S.ws.book.q = t.value;
  const pos = t.selectionStart; render();
  const n = document.getElementById(t.id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) { } }
});
/* перенос ресурса из инвентаря в ячейку стола (§12.4) */
document.addEventListener('dragstart', e => {
  const w = e.target && e.target.closest && e.target.closest('[data-wsdrag]'); if (!w || !e.dataTransfer) return;
  e.dataTransfer.setData('text/plain', w.dataset.wsdrag); e.dataTransfer.effectAllowed = 'copy';
});
document.addEventListener('dragover', e => { if (e.target && e.target.closest && e.target.closest('[data-wscell]')) e.preventDefault(); });
document.addEventListener('drop', e => {
  const c = e.target && e.target.closest && e.target.closest('[data-wscell]'); if (!c || !e.dataTransfer) return;
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  if (BAG.item(id) && wsPut(id, +c.dataset.wscell)) { S.ws.view = 'table'; render(); }
});

/* потоки презентации: «Мастерская» показывает найденный рецепт на столе, рядом — подсказки и автодокрафт */
(() => {
  const i = FLOWS.findIndex(f => f[0] === 'Мастерская'); if (i < 0) return;
  const base = FLOWS[i][2], D = WS_DATA.demo;
  FLOWS[i] = ['Мастерская', 'Инвентарь и стол из шести ячеек: на столе найденный рецепт, рядом книга рецептов', () => { base(); wsSetTable(D.table); }];
  FLOWS.splice(i + 1, 0,
    ['Мастерская · подсказки', 'Три верных ресурса из четырёх: после попытки рецепт появится в книге, а ресурсы сгорят', () => { base(); wsSetTable(D.hint); }],
    ['Мастерская · автодокрафт', 'Демо: найдены два рецепта цепочки. Разворот до базовых и согласие на уникальный ресурс', () => {
      base(); D.chain.learn.forEach(id => BAG.learn(id)); S.ws.view = 'book'; S.overlay = { t: 'wsmake', arg: D.chain.make, n: 1, ok: false };
    }]);
})();
