/* screens/crafthall.js — «Ремесло»: залы башни и вещи мастера — общий слой окон Мастерской, Запасов, Лавки, Рынка и Перековки.
   Слово автора 30.09.2026: «Само Окно крафта так же сделай дорогим и богатым, как и в целом над всеми окнами в ремесле, чтобы они
   выглядили ааа уровня, сгенерируй для этого всё что надо будет». Тема: знания о рецептах даёт Этрион из своей картотеки в башне,
   герои — книги на полках его библиотеки; Мастерская — место, где эти знания становятся вещью. Поэтому у каждого окна — свой зал
   башни или города: Мастерская — зал картотек и верстаков, Запасы — подклеть с сундуками, Лавка — лавочка в скале, Рынок — ряды
   под навесами, Перековка — кузня. Вещи — те же, что у Библиотеки Этриона: тёмный дуб, старое золото, чернёный пергамент, свет карста снизу.
   Регистрирует:
   — зал окна: SCREENS.craft (обёртка поверх model.js и reforge.js) кладёт под экран слой .cr-hall — фон зала, свет снизу, пыль в луче;
     окно открытия сундука и сцена удачи мастерской берут картину зала из переменных --cr-hall-stock и --cr-hall-work;
   — рамку иконки предмета по виду: атрибут data-fk (crK) у колодца предмета — материал рамки (сырьё, ключ, трофей, изделие, призыв,
     руна, заряженный карст, город); редкость — свет в окне и контур рамки цветом --rc. Иконки ресурсов нарисуют позже сеткой:
     квадратная живопись в край, рамку даёт интерфейс — как у иконок способностей;
   — пометку Этриона (crHint): поле hint ресурса — подсказка-загадка, где его использовать; карточка предмета, ячейка стола, лист товара;
   — выборку для 1000 ресурсов: грани цикл, биом, вид, ремесло, редкость (crFacets, crFacetMatch) и показ порциями (crPage, ACT.crmore);
   — отклик на действие частицами EnFx (crBurst) и раздел UI-кита «Ремесло: залы и вещи мастера».
   Арт — tools/art-gen/jobs/craft-hall.json; нарезка и геометрия — tools/art-gen/craft_layers.py → CR_ART (тысячные доли, только целые).
   Пока пути нет в CR_ART.ready, вещь рисует CSS — битых картинок нет. Числа вида — CR_VIEW. Своё состояние — S.cr.
   Автопроверка — tools/content-gen/screens/check_crafthall.js. */
'use strict';

/* ================== вид: числа — здесь, в функциях только алгоритм. Вид, не баланс ================== */
const CR_VIEW = {
  page: 120,        // клеток запасов и строк списка за один показ; дальше — «Показать ещё» той же порцией
  dust: 14,         // пылинок в луче зала
  embers: 7,        // угольков над горном кузни
  /* сегмент «Ремесла» → зал башни */
  hall: { work: 'work', stock: 'stock', shop: 'shop', market: 'market', reforge: 'forge' },
  /* отклик на действие — частицы EnFx: [сколько, скорость, жизнь мс, размер]; ring — радиус кольца света, % стороны элемента, и мс */
  fb: {
    put: { burst: [14, 110, 560, 3], ring: [120, 420] },     // ресурс лёг в ячейку стола
    take: { burst: [9, 50, 760, 3] },                        // ресурс ушёл со стола
    match: { burst: [18, 140, 760, 4], ring: [140, 620] },   // на столе найденный рецепт
    pick: { burst: [6, 60, 420, 2] },                        // выбор клетки запасов
    buy: { burst: [16, 160, 720, 3], ring: [110, 480] },     // покупка в лавке и на рынке
  },
  seed: 'Ремесло · зал',   // рисунок пыли и угольков — постоянный: один и тот же кадр при каждой перерисовке
  cycle: 1092000,          // фаза пыли, дыхания света и хода колец — часы страницы по модулю этого числа, мс: скачок фазы — раз в 18 минут
};

/* вид предмета → материал рамки иконки: по ярусу (tier). Ярус без строки — рамка сырья, автопроверка называет его */
const CR_KIND = {
  basic: 'res', craftres: 'res', key: 'key', unique: 'boss', trophy: 'boss', find: 'boss',
  part: 'made', made: 'made', product: 'made', hero: 'made',
  act: 'call', call: 'call', echo: 'call',
  rune: 'rune', vshard: 'rune', valor: 'rune',
};
/* вид по семейству (поле fam данных Этриона, 30.09.2026) — сильнее яруса: у города, карста, топлива, кристалла и друзы Энериума ярус
   общий (город — act, карст и топливо — made и product), свою рамку им даёт семейство; руническая пыль — среди рун */
const CR_FAM = { city: 'city', karst: 'karst', fuel: 'karst', ener: 'karst', dust: 'rune' };
/* рамки — порядок листа craft-hall.json и подписи для UI-кита */
const CR_FRAMES = [['res', 'Сырьё'], ['key', 'Ключи'], ['boss', 'Добыча боссов и руин'], ['made', 'Изделия'], ['call', 'Призывы'], ['rune', 'Руны'],
  ['karst', 'Карсты и топливо'], ['city', 'Города']];

/* арт (tools/art-gen/jobs/craft-hall.json, выгрузка export_ui.py в assets/art/craft/). ready — выгруженные пути: пока пути нет, вещь
   рисует CSS. Геометрия — вывод tools/art-gen/craft_layers.py, тысячные доли, только целые:
   frame — холст рамки и тело рамки на нём (px исходника), win — окно рамки по видам [сверху, справа, снизу, слева], ‰ тела;
   core.hole — прозрачная середина пьедестала, ‰ радиуса; page — страница гримуара для border-image: срезы [сверху, справа, снизу,
   слева] в px страницы; ratio — ширина к высоте, ‰ */
const CR_ART = {
  ready: ['craft/hall-work.jpg', 'craft/hall-stock.jpg', 'craft/hall-shop.jpg', 'craft/hall-market.jpg', 'craft/hall-forge.jpg',
    'craft/table.webp', 'craft/socket.webp', 'craft/core.webp', 'craft/hearth.webp', 'craft/dais.webp',
    'craft/corner-tl.png', 'craft/corner-tr.png', 'craft/corner-bl.png', 'craft/corner-br.png', 'craft/seal.png', 'craft/cushion.webp',
    'craft/plate.webp', 'craft/counter.webp', 'craft/awning.webp', 'craft/vellum.jpg', 'craft/grimoire.webp', 'craft/grimoire-spread.webp',
    'craft/frame-res.png', 'craft/frame-key.png', 'craft/frame-boss.png', 'craft/frame-made.png', 'craft/frame-call.png', 'craft/frame-rune.png',
    'craft/frame-karst.png', 'craft/frame-city.png',
    'craft/fx-ember.png', 'craft/fx-glint.png', 'craft/fx-shard.png', 'craft/fx-mote.png', 'craft/fx-smoke.png', 'craft/fx-ash.png',   // выгрузка 30.09.2026
    'chests/fx-beam.png', 'chests/fx-ring.png'],   // текстуры света окна сундука (chest-open.js, CO_ART) — луч над столом и кольцо под пьедесталом
  hall: { work: 'craft/hall-work.jpg', stock: 'craft/hall-stock.jpg', shop: 'craft/hall-shop.jpg', market: 'craft/hall-market.jpg', forge: 'craft/hall-forge.jpg' },
  frame: { canon: 256, body: 200 },
  frames: { res: [155, 150, 155, 150], key: [195, 145, 140, 135], boss: [135, 130, 135, 125], made: [135, 135, 140, 135],
    call: [115, 115, 105, 115], rune: [160, 160, 155, 160], karst: [135, 135, 140, 135], city: [190, 130, 145, 130] },
  core: { hole: 281 },
  page: { px: [604, 697], slice: [100, 149, 137, 150] },
  ratio: { dais: 2301, cushion: 1563, plate: 4739, counter: 3636, awning: 4283, seal: 880, corner: 983, spread: 1524 },
  img: {
    table: 'craft/table.webp', socket: 'craft/socket.webp', core: 'craft/core.webp', hearth: 'craft/hearth.webp', dais: 'craft/dais.webp',
    seal: 'craft/seal.png', cushion: 'craft/cushion.webp', plate: 'craft/plate.webp', counter: 'craft/counter.webp', awning: 'craft/awning.webp',
    vellum: 'craft/vellum.jpg', page: 'craft/grimoire.webp', spread: 'craft/grimoire-spread.webp',
    ctl: 'craft/corner-tl.png', ctr: 'craft/corner-tr.png', cbl: 'craft/corner-bl.png', cbr: 'craft/corner-br.png',
    beam: 'chests/fx-beam.png', ring: 'chests/fx-ring.png',
  },
  fx: ['ember', 'glint', 'shard', 'mote', 'smoke', 'ash'],
};

/* ================== помощники ================== */
const crArt = p => CR_ART.ready.includes(p);
const crKind = it => (it && (CR_FAM[it.fam] || CR_KIND[it.tier])) || 'res';
/* атрибут рамки у колодца предмета: вид — материал рамки, редкость — data-r рядом */
const crK = it => (it ? ` data-fk="${crKind(it)}"` : '');
const crS = () => S.cr || (S.cr = crFresh());
function crFresh() { return { more: {} }; }

/* нарисованные вещи — адреса в переменные <html>, как у шкафа Библиотеки (library.js): класс у <html> говорит CSS, что рисунок есть.
   Адрес полный: url() из переменной браузер разрешает от файла стилей, где её подставили */
(function crArtVars() {
  const R = document.documentElement, st = R && R.style, abs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
  if (!st) return;
  const set = (k, p) => { if (!crArt(p)) return false; try { st.setProperty(k, `url("${abs(p)}")`); } catch (_) { } return true; };
  const all = (list, cls) => { if (list.every(Boolean) && R.classList) R.classList.add(cls); };
  const I = CR_ART.img;
  all(Object.entries(CR_ART.hall).map(([k, p]) => set('--cr-hall-' + k, p)), 'cr-h');
  all(CR_FRAMES.map(([k]) => set('--cr-f-' + k, `craft/frame-${k}.png`)), 'cr-f');
  all([set('--cr-table', I.table), set('--cr-socket', I.socket), set('--cr-core', I.core)], 'cr-t');
  all([set('--cr-hearth', I.hearth)], 'cr-hh');
  all([set('--cr-dais', I.dais)], 'cr-d');
  all([set('--cr-vellum', I.vellum), set('--cr-page', I.page), set('--cr-spread', I.spread)], 'cr-p');
  all([set('--cr-ctl', I.ctl), set('--cr-ctr', I.ctr), set('--cr-cbl', I.cbl), set('--cr-cbr', I.cbr)], 'cr-c');
  all([set('--cr-plate', I.plate)], 'cr-pl');
  all([set('--cr-seal', I.seal)], 'cr-se');
  all([set('--cr-cushion', I.cushion), set('--cr-counter', I.counter)], 'cr-sh');
  all([set('--cr-awning', I.awning)], 'cr-aw');
  all(CR_ART.fx.map(k => set('--cr-fx-' + k, `craft/fx-${k}.png`)), 'cr-x');
  all([set('--cr-beam', I.beam), set('--cr-ring', I.ring)], 'cr-lt');
})();

/* ================== зал окна ==================
   Фон зала, свет карста снизу, пыль в луче; у кузни — угольки над горном. Рисунок пыли — от постоянного сида: одна и та же картина
   при каждой перерисовке. Движение — только transform и opacity, «меньше движения» — без движения */
const crHallCache = {};
const crNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
function crHallHtml(hall) {
  if (!crHallCache[hall]) {
    const rng = EB.makeRng(EB.seedOf(CR_VIEW.seed + ' · ' + hall)), V = CR_VIEW;
    const mote = cls => `<i class="${cls}" style="--x:${rng(100)}%;--y:${20 + rng(70)}%;--s:${6000 + rng(7000)}ms;--d:${-rng(9000)}ms;--dx:${rng(41) - 20}px;--dy:${-30 - rng(60)}px"></i>`;
    const dust = Array.from({ length: V.dust }, () => mote('cr-mt')).join('');
    const fire = hall === 'forge' ? `<span class="cr-emb">${Array.from({ length: V.embers }, () => mote('cr-em')).join('')}</span>` : '';
    crHallCache[hall] = `<i class="cr-hall-bg"></i><i class="cr-hall-lt"></i><span class="cr-dust">${dust}</span>${fire}`;
  }
  /* фаза движения — от часов страницы: экран перерисовывается на каждое действие, а пыль летит дальше, не начинаясь заново */
  return `<div class="cr-hall" data-hall="${hall}" style="--t:${-(crNow() % CR_VIEW.cycle)}ms" aria-hidden="true">${crHallCache[hall]}</div>`;
}
/* «Ремесло»: под каждым окном — свой зал. Обёртка — после reforge.js: его вкладка «Перековка» уже в шапке */
const crCraftBase = SCREENS.craft;
SCREENS.craft = function () {
  const v = crCraftBase.apply(this, arguments);
  if (v && typeof v.html === 'string') v.html = crHallHtml(CR_VIEW.hall[S.seg.craft] || 'work') + v.html;
  return v;
};

/* ================== пометка Этриона ==================
   Поле hint ресурса (данные Этриона): подсказка-загадка от его лица — где ресурс использовать. Спойлер цикла VI игроку не показывается */
const crHintText = it => (it && !(typeof itTeam === 'function' ? itTeam(it) : it.team) && typeof it.hint === 'string' ? it.hint.trim() : '');
function crHint(it, o = {}) {
  const t = crHintText(it); if (!t) return '';
  const nm = o.name ? `<span class="cr-hint-n">${trEsc(it.n)}</span>` : '';   // у стола — чей это ресурс: в карточке имя и так в шапке
  return `<div class="cr-hint${o.cls ? ' ' + o.cls : ''}"><i class="cr-seal" aria-hidden="true"></i><div class="cr-hint-t"><b class="cr-hint-h">Пометка Этриона</b>${nm}<p>${trEsc(t)}</p></div></div>`;
}

/* лист «Сведения» (index.html: рынок, ритуалы, развитие героя) — та же карточка предмета: крупная плитка в рамке своего вида,
   пометка Этриона — под загадкой. Обёртка вида: сам лист и его данные прежние */
if (typeof itemCard === 'function') {
  const crItemCardBase = itemCard;
  itemCard = function (id) {
    const h = crItemCardBase(id), it = BAG.item(id); if (!it) return h;
    const note = crHint(it), at = `<span class="tr-big" data-r="${it.r}">`;
    let out = h.includes(at) ? h.replace(at, `<span class="tr-big" data-r="${it.r}"${crK(it)}>`) : h;
    if (note) { const i = out.indexOf('<dl class="kv">'); out = i < 0 ? out + note : out.slice(0, i) + note + out.slice(i); }
    return out;
  };
}

/* ================== выборка для 1000 ресурсов ==================
   Грани: цикл, биом, вид (ярус), ремесло, редкость. Биом: общий пул — «любой биом», крафтовые биомы — «руины»: до активации их имя
   не раскрывается (§12.5 GDD), поэтому все руины — одна грань */
let crBiomeNames = null;
function crBiomeName(b) {
  if (b === 'pool') return 'Любой биом';
  if (b === 'ruin') return 'Руины';
  if (!crBiomeNames) { crBiomeNames = {}; for (const c of EN_RECIPES.cycles || []) for (const x of c.biomes || []) crBiomeNames[x.id] = x.n; }
  return crBiomeNames[b] || b;
}
const crBiomeOf = it => (it.pool ? 'pool' : /^cb/.test(it.b || '') ? 'ruin' : it.b || '');
const crSpecOf = it => (it.spec || '').split('+')[0];
function crFacetOf(it) { return { cyc: it.pool ? 'pool' : String(it.cyc || ''), biome: crBiomeOf(it), kind: it.tier || '', spec: crSpecOf(it), r: String(it.r || '') }; }
/* значения граней в списке — только те, что есть; порядок: цикл, биом по номеру, вид по порядку ярусов, ремесло по порядку данных */
function crFacets(items) {
  const F = { cyc: new Set(), biome: new Set(), kind: new Set(), spec: new Set(), r: new Set() };
  for (const it of items) { const f = crFacetOf(it); for (const k in F) if (f[k]) F[k].add(f[k]); }
  const tiers = Object.keys(EN_RECIPES.tiers || {}), specs = EN_RECIPES.specOrder || Object.keys(EN_RECIPES.specs || {});
  const bn = b => b === 'pool' ? -1 : b === 'ruin' ? 99 : +String(b).replace(/\D/g, '') || 50;
  return {
    cyc: [...F.cyc].sort((a, b) => (a === 'pool' ? 0 : +a) - (b === 'pool' ? 0 : +b)),
    biome: [...F.biome].sort((a, b) => bn(a) - bn(b)),
    kind: [...F.kind].sort((a, b) => tiers.indexOf(a) - tiers.indexOf(b)),
    spec: specs.filter(s => F.spec.has(s)),
    r: [...F.r].sort((a, b) => a - b),
  };
}
function crFacetMatch(it, F) {
  const f = crFacetOf(it);
  return (!F.cyc || f.cyc === F.cyc) && (!F.biome || f.biome === F.biome) && (!F.kind || f.kind === F.kind) && (!F.spec || (it.spec || '').split('+').includes(F.spec)) && (!F.r || f.r === F.r);
}
const CR_FACET_N = { cyc: 'Цикл', biome: 'Биом', kind: 'Вид', spec: 'Ремесло', r: 'Редкость' };
function crFacetLabel(k, v) {
  if (k === 'cyc') return v === 'pool' ? 'Общий пул' : 'Цикл ' + (ROMAN[+v] || v);
  if (k === 'biome') return crBiomeName(v);
  if (k === 'kind') return (EN_RECIPES.tiers[v] || { n: v }).n;
  if (k === 'spec') return `${ic((EN_RECIPES.specs[v] || {}).icon || 'gem')}${(EN_RECIPES.specs[v] || { n: v }).n}`;
  if (k === 'r') return `${ICON('r' + v, 16)}${RAR[+v] || v}`;
  return v;
}
/* лист граней: чипы по каждой грани; act — действие экрана, значение — «грань:значение», пустое значение — «все» */
function crFacetSheet(facets, cur, act, keys) {
  return keys.filter(k => facets[k] && facets[k].length > 1).map(k => `<span class="eyebrow">${CR_FACET_N[k]}</span><div class="cr-fcs">`
    + `<button class="chip cr-fc" data-a="${act}" data-v="${k}:" aria-pressed="${!cur[k]}">Все</button>`
    + facets[k].map(v => `<button class="chip cr-fc" data-a="${act}" data-v="${k}:${trEsc(v)}" aria-pressed="${cur[k] === v}"${k === 'r' ? ` data-r="${v}"` : ''}>${crFacetLabel(k, v)}</button>`).join('')
    + '</div>').join('');
}
/* показ порциями: key — список (экран и вкладка); новые порции — «Показать ещё» */
function crPage(list, key) {
  const n = Math.max(CR_VIEW.page, crS().more[key] || 0);
  return { shown: list.length > n ? list.slice(0, n) : list, rest: Math.max(0, list.length - n) };
}
const crMoreHtml = (key, rest, cls = '') => rest > 0
  ? `<button class="cr-more${cls ? ' ' + cls : ''}" data-a="crmore" data-v="${trEsc(key)}">Показать ещё · ${fmt(Math.min(rest, CR_VIEW.page))}<small>осталось ${fmt(rest)}</small></button>` : '';

/* ================== отклик на действие: частицы ==================
   Слой рядом с #game — перерисовка экрана его не сносит. Место — элемент по селектору в кадре игры после перерисовки */
let CR_FXI = null;
function crFxI() {
  if (!window.EnFx) return null;
  const g = document.getElementById('game'), p = g && g.parentElement; if (!p || !p.querySelector) return null;
  let L = p.querySelector(':scope > .cr-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'cr-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  if (!CR_FXI || CR_FXI.host !== L) { if (CR_FXI) CR_FXI.destroy(); CR_FXI = EnFx.create(L); }
  return CR_FXI;
}
const crReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
const crColor = r => { try { return getComputedStyle(document.documentElement).getPropertyValue('--r' + r).trim() || '#ddbc7a'; } catch (_) { return '#ddbc7a'; } };
/* всплеск у элемента: kind — строка CR_VIEW.fb, col — цвет; после перерисовки, в следующем кадре */
function crBurst(sel, kind, col) {
  if (crReduced()) return;
  const P = CR_VIEW.fb[kind]; if (!P) return;
  const go = () => {
    const fx = crFxI(), g = document.getElementById('game'), el = g && g.querySelector ? g.querySelector(sel) : null; if (!fx || !el) return;
    const b = fx.center(el), c = col || EnFx.COL.spirit;
    if (P.burst) fx.burst(b.x, b.y, c, ...P.burst, kind === 'take' ? { shape: 'shard', blend: 'normal', vr: 5, ay: 160 } : { fade: 'in' });
    if (P.ring) fx.ring(b.x, b.y, c, Math.round(Math.max(b.w, b.h) * P.ring[0] / 200), P.ring[1], 2);
  };
  try { requestAnimationFrame(go); } catch (_) { }
}

/* ================== действия ================== */
Object.assign(ACT, {
  /* «Показать ещё»: следующая порция того же списка */
  crmore(v) { const M = crS().more, k = String(v || ''); if (!k) return; M[k] = Math.max(CR_VIEW.page, M[k] || 0) + CR_VIEW.page; render(); },
});

/* ================== UI-кит: раздел «Ремесло: залы и вещи мастера» ==================
   Залы окон, рамки восьми видов в семи редкостях, пометка Этриона, стол и его вещи, показ порциями. Проба — не выдача */
function crKitSample(kind) {
  return EN_RECIPES.items.find(it => !it.team && crKind(it) === kind) || null;
}
function crKitHtml() {
  const halls = Object.entries(CR_VIEW.hall).map(([seg, h]) => {
    const name = { work: 'Мастерская', stock: 'Запасы', shop: 'Лавка', market: 'Рынок', reforge: 'Перековка' }[seg];
    return `<figure class="cr-kh"><span class="cr-kh-p" data-hall="${h}"></span><figcaption>${name}</figcaption></figure>`;
  }).join('');
  const rows = CR_FRAMES.map(([k, n]) => {
    const it = crKitSample(k);
    const inner = it ? trIcon(it) : ic('gem');
    const cells = [1, 2, 3, 4, 5, 6, 7].map(r => `<span class="well cr-kw" data-fk="${k}" data-r="${r}" title="${n} · ${RAR[r]}">${inner}</span>`).join('');
    return `<div class="cr-kf"><b>${n}</b><div class="cr-kfs">${cells}</div></div>`;
  }).join('');
  /* образец пометки — первый ресурс с полем hint; пока его в данных нет — загадка ресурса тем же видом (текст пометок пишет Этрион) */
  const withHint = EN_RECIPES.items.find(it => !it.team && crHintText(it)), stand = EN_RECIPES.items.find(it => !it.team && it.lore);
  const hint = crHint(withHint || (stand ? { hint: stand.lore, tier: stand.tier } : null));
  const team = TM(`<p class="k-note">Рамка — атрибут data-fk у колодца предмета (crK): вид — материал рамки по ярусу CR_KIND, редкость — свет в окне и контур цветом --rc. Новый ярус данных — строкой в CR_KIND, иначе рамка сырья. Пометка Этриона — поле hint ресурса (crHint)${withHint ? '' : '; в данных его пока нет — образец показывает загадку ресурса'}. Грани выборки — crFacets, порции — crPage (CR_VIEW.page). Арт — CR_ART, задание tools/art-gen/jobs/craft-hall.json, нарезка — tools/art-gen/craft_layers.py.</p>`, 'div');
  return `<section class="k-box cr-kit" style="grid-column:1/-1"><h3>Ремесло: залы и вещи мастера</h3>
    <p class="k-note">У каждого окна «Ремесла» свой зал башни: Мастерская — картотеки и верстаки, Запасы — подклеть с сундуками, Лавка — лавочка в скале, Рынок — ряды под навесами, Перековка — кузня. Свет — карст снизу, в луче — пыль.</p>
    <div class="cr-khs">${halls}</div>
    <p class="k-note">Рамка иконки предмета: вид — материал, редкость — свет в окне и контур. Иконку ресурса рисуют квадратной живописью в край, рамку даёт интерфейс.</p>
    <div class="cr-kfr">${rows}</div>
    <p class="k-note">Пометка Этриона — подсказка-загадка ресурса: в карточке предмета, в ячейке стола и в листе товара.</p>
    <div class="cr-khint">${hint}</div>
    <div class="cr-kt"><span class="cr-kt-t" aria-hidden="true"></span><span class="cr-kt-s" aria-hidden="true"></span><span class="cr-kt-c" aria-hidden="true"></span><span class="cr-kt-h" aria-hidden="true"></span><span class="cr-kt-d" aria-hidden="true"></span></div>
    ${team}</section>`;
}
KIT_EXTRA.push({ html: crKitHtml });

/* ================== состояние ================== */
const crInitBase = initialState;
initialState = function () { const s = crInitBase(); s.cr = crFresh(); return s; };
S.cr = crFresh();
