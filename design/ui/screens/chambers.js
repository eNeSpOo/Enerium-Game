/* screens/chambers.js — «Странник»: покои в Башне вневремени — общий слой вкладок и окон раздела. Только вид: своего состояния нет.
   Слово автора 30.09.2026: «Так же надо прорабатывать Окно странника и так же сделать окна в нём ААА уровня, генери графику какую
   пожелаешь». Тема: игрок знает, что Странник пришёл в себя в покоях Башни вневремени — чёрного обелиска без окон и дверей в Эндалоре
   (дайджест лора, «Что знает игрок в начале»; глава Летописи «Пробуждение»). Раздел «Странник» — эти покои, у каждой вкладки свой зал
   или вещь: «Обзор» — сама комната, ниша с портретом и карниз с пятёркой; «Память» — зеркало, осколки которого — пассивки; «Артефакты» —
   реликварий; «Достижения» — зал трофеев; «Летопись» — зал с аналоем. Материалы общие: полированный чёрный базальт, старое серебро,
   бледное золото, тёмное стекло, свет времени снизу, золотой песок стоит в воздухе — время здесь остановилось. Ремесло — дуб, латунь,
   пергамент; Странник — базальт, серебро, стекло: разделы не спутать.
   Регистрирует:
   — зал вкладки: обёртка SCREENS.profile (после screens/chronicle.js — она уже с «Летописью») кладёт под экран слой .cb-hall — фон
     зала, тень сверху и снизу, свет снизу, песок и огоньки в воздухе. Фаза движения — от часов страницы (--t): перерисовка на каждое
     действие не начинает песок заново;
   — материал окон раздела: класс cb-win у листов и окон «Странника» и общения (CB_WINS); рейтинги недели — когда открыты из
     «Странника» (CB_FROM). Окна и их данные прежние — обёртка дописывает только класс;
   — отклик на действие частицами EnFx (cbBurst): покупка и уровень артефакта, полученное достижение, облик, имя, дружба — после
     операции «сервера», которая прошла (номер операции сдвинулся); повтор и отказ отклика не дают;
   — числа вида (CB_VIEW) и адреса нарисованного (CB_ART) — в переменные <html>: стили берут их оттуда, одна правда;
   — раздел UI-кита «Странник: покои и вещи» и сценарий презентации.
   Иконки артефактов и медальоны достижений — содержимое вкладок: их пути — WN_ART (screens/wanderer.js).
   Арт — tools/art-gen/jobs/wanderer-chambers.json; нарезка и геометрия — tools/art-gen/chambers_layers.py (рама зеркала, чистка,
   полосы), craft_layers.py (уголки, листы), grid_slice.py (артефакты), shelf_layers.py (плитки) → CB_ART: целые числа. Пока пути нет
   в CB_ART.ready, вещь рисует CSS — битых картинок нет. Движение — только transform и opacity; «меньше движения» — без движения.
   Автопроверка — tools/content-gen/screens/check_chambers.js. */
'use strict';

/* ================== вид: числа — здесь, в функциях только алгоритм. Вид, не баланс ==================
   Пары — [932 × 430, 844 × 390]: второе число — когда рабочая область не выше 360 px (та же граница, что @container main
   (max-height: 360px) в стилях) */
const CB_VIEW = {
  sand: 16,          // песчинок в воздухе зала: стоят и едва дрейфуют — время остановилось
  motes: 6,          // огоньков времени у пола зала
  seed: 'Странник · покои',   // рисунок песка — постоянный: один и тот же кадр при каждой перерисовке
  cycle: 1092000,    // фаза песка и дыхания света — часы страницы по модулю этого числа, мс: скачок фазы — раз в 18 минут
  hall: { over: 'over', mem: 'mem', arts: 'arts', ach: 'ach', chron: 'chron' },   // вкладка «Странника» → зал
  id: [220, 200],    // колонка Странника, px ширины
  niche: [226, 196], // ниша с портретом наверху колонки, px высоты; ниже — карниз и постамент с опытом и кнопками
  ava: [96, 84],     // портрет в нише, px
  ledge: [14, 12],   // карниз под нишей и под пятёркой, px
  plate: [30, 28],   // табличка заголовка вкладки, px высоты
  mc: [54, 46],      // угол рамы зеркала Памяти, px: толщина рамы — CB_ART.mirror.frame ‰ угла
  ranks: 3,          // места недели: столбцов (строк — сколько выйдет)
  /* отклик на действие — частицы EnFx: burst — [сколько, скорость, жизнь мс, размер]; ring — радиус кольца, % стороны элемента, и мс;
     col — цвет: gold, spirit или r — редкость того, что получено */
  fb: {
    buy: { burst: [18, 150, 760, 3.4], ring: [120, 520], col: 'gold' },      // артефакт куплен
    up: { burst: [16, 130, 700, 3], ring: [110, 480], col: 'spirit' },       // артефакт на уровень выше
    claim: { burst: [22, 170, 820, 3.6], ring: [130, 560], col: 'r' },       // достижение получено
    look: { burst: [14, 110, 640, 3], ring: [110, 460], col: 'spirit' },     // облик: рамка, портрет, частицы, имя, пол
    friend: { burst: [10, 90, 560, 2.6], col: 'spirit' },                    // дружба: заявка, ответ
  },
};

/* арт (tools/art-gen/jobs/wanderer-chambers.json, выгрузка export_ui.py в assets/art/chambers/). ready — выгруженные пути: пока пути
   нет, вещь рисует CSS. Геометрия — вывод tools/art-gen/chambers_layers.py и craft_layers.py, только целые:
   mirror — рама зеркала для border-image: px — сторона рисунка, slice — срез угла, px рисунка; frame — толщина рамы с бархатом до стекла,
   ‰ угла: [верх и низ, бока]. plate — табличка: px и срезы [сверху, справа, снизу, слева], px рисунка. niche — ниша: где внутри
   арки [слева, справа], ‰ ширины, и где начинается проём арки сверху, ‰ высоты. ratio — ширина к высоте, ‰ */
const CB_ART = {
  ready: ['chambers/hall-over.jpg', 'chambers/hall-mem.jpg', 'chambers/hall-arts.jpg', 'chambers/hall-ach.jpg', 'chambers/hall-chron.jpg',
    'chambers/mirror.png', 'chambers/mirror-glass.jpg', 'chambers/niche.jpg', 'chambers/crest.png', 'chambers/plate.webp', 'chambers/ledge.jpg',
    'chambers/basalt.jpg', 'chambers/vellum.jpg', 'chambers/corner-tl.png', 'chambers/corner-tr.png', 'chambers/corner-bl.png', 'chambers/corner-br.png',
    'chambers/fx-sand.png', 'chambers/fx-glint.png', 'chambers/fx-sliver.png', 'chambers/fx-time.png', 'chambers/fx-gold.png', 'chambers/fx-mist.png'],   // выгрузка 30.09.2026
  hall: { over: 'chambers/hall-over.jpg', mem: 'chambers/hall-mem.jpg', arts: 'chambers/hall-arts.jpg', ach: 'chambers/hall-ach.jpg', chron: 'chambers/hall-chron.jpg' },
  img: {
    mirror: 'chambers/mirror.png', glass: 'chambers/mirror-glass.jpg', niche: 'chambers/niche.jpg', crest: 'chambers/crest.png', plate: 'chambers/plate.webp',
    ledge: 'chambers/ledge.jpg', basalt: 'chambers/basalt.jpg', vellum: 'chambers/vellum.jpg',
    ctl: 'chambers/corner-tl.png', ctr: 'chambers/corner-tr.png', cbl: 'chambers/corner-bl.png', cbr: 'chambers/corner-br.png',
  },
  fx: ['sand', 'glint', 'sliver', 'time', 'gold', 'mist'],
  mirror: { px: 387, slice: 156, frame: [667, 708] },
  plate: { px: [692, 77], slice: [12, 53, 11, 53] },
  niche: { px: [384, 688], arch: [180, 820], top: 81 },
  ratio: { crest: 2115, corner: 980, ledge: 12667, glass: 2211 },
};

/* ================== помощники ================== */
const cbArt = p => CB_ART.ready.includes(p);
const cbNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
const cbReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };

/* нарисованные вещи — адреса в переменные <html>, как у залов «Ремесла» (crafthall.js): класс у <html> говорит CSS, что рисунок есть.
   Адрес полный: url() из переменной браузер разрешает от файла стилей, где её подставили. Числа вида — туда же: стили берут их оттуда */
(function cbRootVars() {
  const R = document.documentElement, st = R && R.style, abs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
  if (!st) return;
  const set = (k, p) => { if (!cbArt(p)) return false; try { st.setProperty(k, `url("${abs(p)}")`); } catch (_) { } return true; };
  const all = (list, cls) => { if (list.every(Boolean) && R.classList) R.classList.add(cls); };
  const I = CB_ART.img;
  all(Object.entries(CB_ART.hall).map(([k, p]) => set('--cb-hall-' + k, p)), 'cb-h');
  all([set('--cb-mirror', I.mirror), set('--cb-glass', I.glass)], 'cb-m');
  all([set('--cb-niche', I.niche)], 'cb-n');
  all([set('--cb-plate', I.plate)], 'cb-p');
  all([set('--cb-ledge', I.ledge)], 'cb-l');
  all([set('--cb-basalt', I.basalt), set('--cb-vellum', I.vellum)], 'cb-t');
  all([set('--cb-ctl', I.ctl), set('--cb-ctr', I.ctr), set('--cb-cbl', I.cbl), set('--cb-cbr', I.cbr)], 'cb-c');
  all([set('--cb-crest', I.crest)], 'cb-cr');
  all(CB_ART.fx.map(k => set('--cb-fx-' + k, `chambers/fx-${k}.png`)), 'cb-x');
  const V = CB_VIEW, M = CB_ART.mirror, P = CB_ART.plate, N = CB_ART.niche, pm = (a, b) => String(Math.round(a * 1000 / b));
  const px = (k, pair) => { st.setProperty(`--cb-${k}0`, pair[0] + 'px'); st.setProperty(`--cb-${k}1`, pair[1] + 'px'); };
  try {
    px('id', V.id); px('niche', V.niche); px('ava', V.ava); px('ledge', V.ledge); px('plate', V.plate); px('mc', V.mc);
    /* рама зеркала: срез угла в px рисунка, толщина рамы — ‰ угла; табличка: срезы в px рисунка и они же — ‰ высоты таблички */
    st.setProperty('--cb-ms', String(M.slice)); st.setProperty('--cb-mfv', String(M.frame[0])); st.setProperty('--cb-mfh', String(M.frame[1]));
    st.setProperty('--cb-ps', P.slice.join(' ')); st.setProperty('--cb-pst', pm(P.slice[0], P.px[1])); st.setProperty('--cb-psr', pm(P.slice[1], P.px[1]));
    st.setProperty('--cb-psb', pm(P.slice[2], P.px[1]));
    /* ниша: высота рисунка к ширине и где сверху начинается проём арки — ‰; внутри арки по ширине — ‰ */
    st.setProperty('--cb-nr', pm(N.px[1], N.px[0])); st.setProperty('--cb-nt', String(N.top)); st.setProperty('--cb-nw', String(N.arch[1] - N.arch[0]));
    st.setProperty('--cb-rk', String(V.ranks)); st.setProperty('--cb-crr', String(CB_ART.ratio.crest));
  } catch (_) { }
})();

/* ================== зал вкладки ==================
   Фон зала, свет времени снизу, песок и огоньки в воздухе. Рисунок песка — от постоянного сида: одна и та же картина при каждой
   перерисовке; движение — только transform и opacity, «меньше движения» — без движения */
const cbHallCache = {};
function cbHallHtml(hall) {
  if (!cbHallCache[hall]) {
    const rng = EnLoot.makeRng(EnLoot.seedOf(CB_VIEW.seed + ' · ' + hall)), V = CB_VIEW;
    const grain = cls => `<i class="${cls}" style="--x:${rng(100)}%;--y:${8 + rng(84)}%;--s:${9000 + rng(9000)}ms;--d:${-rng(12000)}ms;--dx:${rng(25) - 12}px;--dy:${-6 - rng(26)}px"></i>`;
    const sand = Array.from({ length: V.sand }, () => grain('cb-sd')).join('');
    const motes = Array.from({ length: V.motes }, () => grain('cb-mo')).join('');
    cbHallCache[hall] = `<i class="cb-hall-bg"></i><i class="cb-hall-lt"></i><span class="cb-sand">${sand}${motes}</span>`;
  }
  /* фаза движения — от часов страницы: экран перерисовывается на каждое действие, а песок висит дальше, не начинаясь заново */
  return `<div class="cb-hall" data-hall="${hall}" style="--t:${-(cbNow() % CB_VIEW.cycle)}ms" aria-hidden="true">${cbHallCache[hall]}</div>`;
}
/* «Странник»: под каждой вкладкой — свой зал. Обёртка — после chronicle.js: вкладка «Летопись» уже в SCREENS.profile */
const cbProfileBase = SCREENS.profile;
SCREENS.profile = function () {
  const v = cbProfileBase.apply(this, arguments);
  if (v && typeof v.html === 'string') v.html = cbHallHtml(CB_VIEW.hall[S.seg.profile] || 'over') + v.html;
  return v;
};

/* ================== окна раздела: материал покоев ==================
   Лист и окно получают класс cb-win: базальт, серебряные уголки, свет снизу. Окна те же — дописывается только класс */
const CB_WINS = ['mem', 'memreset', 'wnp', 'wncat', 'wnart', 'wnfeat', 'wnpas', 'wnfame', 'look', 'lksex', 'friends', 'pp', 'pphero', 'ppreport', 'ppblock',
  'ppunf', 'inbox', 'letter', 'write', 'chat', 'settings', 'level'];
const CB_FROM = ['rank', 'wkmode'];   // окна других разделов: материал покоев — когда открыты из «Странника»
const cbMark = h => (typeof h === 'string' ? h.replace('<aside class="sheet ', '<aside class="sheet cb-win ').replace('<div class="dlg fit ', '<div class="dlg fit cb-win ') : h);
for (const k of CB_WINS) { const base = OV[k]; if (typeof base === 'function') OV[k] = function (o) { return cbMark(base.call(this, o)); }; }
for (const k of CB_FROM) { const base = OV[k]; if (typeof base === 'function') OV[k] = function (o) { const h = base.call(this, o); return S.route === 'profile' ? cbMark(h) : h; }; }

/* ================== отклик на действие: частицы ==================
   Слой рядом с #game — перерисовка экрана его не сносит. Место — элемент по селектору в кадре игры после перерисовки; нет его —
   середина рабочей области */
let CB_FXI = null;
function cbFxI() {
  if (!window.EnFx) return null;
  const g = document.getElementById('game'), p = g && g.parentElement; if (!p || !p.querySelector) return null;
  let L = p.querySelector(':scope > .cb-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'cb-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  if (!CB_FXI || CB_FXI.host !== L) { if (CB_FXI) CB_FXI.destroy(); try { CB_FXI = EnFx.create(L); } catch (_) { CB_FXI = null; } }
  return CB_FXI;
}
const cbColor = k => { try { return getComputedStyle(document.documentElement).getPropertyValue(k).trim() || '#ddbc7a'; } catch (_) { return '#ddbc7a'; } };
/* всплеск у элемента: kind — строка CB_VIEW.fb; sels — селекторы по порядку, первый найденный; r — редкость (цвет r) */
function cbBurst(kind, sels, r) {
  if (cbReduced()) return;
  const P = CB_VIEW.fb[kind]; if (!P) return;
  const go = () => {
    const fx = cbFxI(), g = document.getElementById('game'); if (!fx || !g || !g.querySelector) return;
    let el = null;
    for (const s of [].concat(sels || [], '.g-main')) { try { el = g.querySelector(s); } catch (_) { el = null; } if (el) break; }
    if (!el) return;
    const b = fx.center(el), c = P.col === 'r' ? cbColor('--r' + (r || 5)) : P.col === 'gold' ? EnFx.COL.gold : EnFx.COL.spirit;
    if (P.burst) fx.burst(b.x, b.y, c, ...P.burst, { fade: 'in' });
    if (P.ring) fx.ring(b.x, b.y, c, Math.round(Math.max(b.w, b.h) * P.ring[0] / 200), P.ring[1], 2);
  };
  try { requestAnimationFrame(go); } catch (_) { }
}
/* номер следующей операции «сервера» раздела: сдвинулся — операция прошла (повтор и отказ его не двигают) */
const cbSeq = () => [S.wn && S.wn.seq, S.look && S.look.seq, S.soc && S.soc.seq].join('|');
function cbOnDone(k, f) {
  const base = ACT[k]; if (typeof base !== 'function') return;
  ACT[k] = function (v, t) { const was = cbSeq(); const r = base.call(this, v, t); if (cbSeq() !== was) { try { f(String(v == null ? '' : v)); } catch (_) { } } return r; };
}
const cbId = v => { const i = v.lastIndexOf(':'); return i < 0 ? v : v.slice(0, i); };
cbOnDone('wnbuy', v => cbBurst('buy', [`[data-v="wnart:${cbId(v)}"]`]));
cbOnDone('wnup', v => cbBurst('up', [`[data-v="wnart:${cbId(v)}"]`]));
cbOnDone('wnclaim', v => { const id = cbId(v), a = typeof WNF !== 'undefined' ? WNF.get(id) : null; cbBurst('claim', [`[data-v="wnfeat:${id}"]`, '.wn-gotbar', '.wn-achb'], a && a.r); });
for (const k of ['lkset', 'lknick', 'lksex']) cbOnDone(k, () => cbBurst('look', ['.lk-prev .lk-ava', '.lk-idb']));
cbOnDone('ppdo', v => { if (/^(add|accept)\|/.test(v)) cbBurst('friend', ['.pp-head .lk-ava', '.fr-list']); });

/* ================== UI-кит: раздел «Странник: покои и вещи» ==================
   Залы вкладок, рама зеркала, ниша, табличка, карниз, уголки, медальоны тем, артефакты реликвария, частицы; команде — откуда арт и числа */
function cbKitHtml() {
  const halls = Object.entries(CB_VIEW.hall).map(([tab, h]) => {
    const name = { over: 'Обзор — покои', mem: 'Память — зал зеркала', arts: 'Артефакты — реликварий', ach: 'Достижения — зал трофеев', chron: 'Летопись — зал с аналоем' }[tab];
    return `<figure class="cb-kh"><span class="cb-kh-p" data-hall="${h}"></span><figcaption>${name}</figcaption></figure>`;
  }).join('');
  const W = typeof WN_ART !== 'undefined' ? WN_ART : null;
  const medals = W && WN ? Object.keys(WN.ach.groups).concat('first', 'myst').map(g => `<figure class="cb-km">${wnMedal(g)}<figcaption>${g === 'first' ? 'Первенства' : g === 'myst' ? 'Тайна' : WN.ach.groups[g].n}</figcaption></figure>`).join('') : '';
  const relics = W && WN ? WN.art.list.map(a => `<figure class="cb-kr"><span class="wn-relic">${wnRelic(a.id)}</span><figcaption>${a.n}</figcaption></figure>`).join('')
    + `<figure class="cb-kr"><span class="wn-relic">${wnRelic('lock')}</span><figcaption>ещё не открыт</figcaption></figure>` : '';
  const fx = CB_ART.fx.map(k => `<span class="cb-kx" data-k="${k}"></span>`).join('');
  const ready = CB_ART.ready.filter(cbArt).length;
  const team = TM(`<p class="k-note">Слово автора 30.09.2026 — «окна ААА уровня». Арт — tools/art-gen/jobs/wanderer-chambers.json; рама зеркала — девять частей border-image (tools/art-gen/chambers_layers.py mirror: углы как есть, стороны — бесшовные образцы, низ — отражённый верх, стекло — отдельным слоем); уголки и листы — craft_layers.py; артефакты — grid_slice.py; плитки — shelf_layers.py tile. Выгружено ${ready} путей раздела (CB_ART.ready), иконки артефактов и медальоны — WN_ART (screens/wanderer.js). Числа вида — CB_VIEW → переменные &lt;html&gt; --cb-*: колонка ${CB_VIEW.id.join(' / ')} px, ниша ${CB_VIEW.niche.join(' / ')}, угол рамы ${CB_VIEW.mc.join(' / ')}. Окна раздела — класс cb-win (CB_WINS), рейтинги — когда открыты из «Странника».</p>`, 'div');
  return `<section class="k-box cb-kit" style="grid-column:1/-1" id="kitChambers"><h3>Странник: покои и вещи</h3>
    <p class="k-note">Раздел «Странник» — покои в Башне вневремени, где Странник пришёл в себя. У каждой вкладки свой зал: покои, зал зеркала, реликварий, зал трофеев, зал с аналоем. Материалы общие — чёрный базальт, старое серебро, бледное золото, тёмное стекло; свет времени поднимается снизу, золотой песок стоит в воздухе.</p>
    <div class="cb-khs">${halls}</div>
    <div class="cb-krow">
      <figure class="cb-kn"><span class="cb-kn-p"></span><figcaption>Ниша с портретом — колонка Странника</figcaption></figure>
      <figure class="cb-kmir"><span class="cb-kmir-p"><i class="wn-glass"></i></span><figcaption>Зеркало Памяти: пять мест — осколки в стекле</figcaption></figure>
      <div class="col cb-kparts"><span class="wn-plt">Табличка заголовка</span><i class="cb-kl"></i><span class="cb-kc"><i></i><i></i><i></i><i></i></span><i class="cb-kcr"></i><span class="cb-kxs">${fx}</span></div>
    </div>
    <p class="k-note">Медальоны зала трофеев — тема достижения; первенство — венец, тайна — замок. Редкость — свет и кольцо цвета --r1…--r7.</p>
    <div class="cb-kms">${medals}</div>
    <p class="k-note">Реликварий: каждый артефакт — своя вещь на бархате в нише; ещё не открытый — под покрывалом.</p>
    <div class="cb-krs">${relics}</div>
    ${team}</section>`;
}
KIT_EXTRA.push({ html: cbKitHtml });

/* ================== сценарий презентации ================== */
FLOWS.push(['Странник · покои', 'Раздел «Странник» — покои в Башне вневремени: ниша с портретом, пятёрка на карнизе, места недели; вкладки — зал зеркала, реликварий, зал трофеев, зал с аналоем',
  () => { S.overlay = null; S.route = 'profile'; S.seg.profile = 'over'; }]);
