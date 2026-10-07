/* Автопроверка карт боя: рамка по типу бойца (design/ui/screens/battle-cards.js и battle-cards.css) — без браузера.
   Слово автора 30.09.2026: на арене боя — рамки по типу врага и одна универсальная карта героя, прямоугольные.
   1. Файлы: index.html подключает battle-cards.css и battle-cards.js; концы строк — CRLF; ширина карты — переменная --cw у .bc и .bc.lead.
   2. Данные BF: у каждого типа своя рамка — свой путь, у героя своя; имена для игрока без служебных слов; геометрия — целые тысячные
      доли: окно внутри рисунка, нарезка не меньше окна (углы и верх с украшением не тянутся), у героя — гнездо метки; выгруженная
      картинка есть, её пропорция — ar; в tools/art-gen/ui-art.json рамка идёт из art/generated, исходник есть.
   3. Тип рамки в каждом режиме — на настоящих боях прототипа: забег по биому 1–4 (рядовые, элита, босс) и рунный страж; Эхо — рядовой,
      элита, босс, Убер, Многоликий, призванные враги всех типов — элита, босс, Убер, Пробуждённый; биом Многоликого по этажам; клан — Голос, Хозяин и свита; Арена и Лига — рамка героя
      с обеих сторон; свои герои — всегда рамка героя. Каждая рамка набора встречается в бою.
   4. Карта с рамкой: класс fr, тип, переменные геометрии, рамка в кадре портрета; у героя — метка: кристалл редкости героя и звёзды по
      личному максимуму, взятые — по доблести; имя, полоса здоровья и щита с числами (hpn, shn — «Бой AAA»), класс, эффекты, цель,
      контроль, «пал» — на месте; ход боя
      (paintCards) идёт без исключений; в легенде знаков — строка о рамке.
   5. Без выгрузки (BF.ready пуст) — карта прежняя: разметка боя та же, что с рамками, за вычетом рамки, метки, класса fr и ранга
      в подсказке; ни следа рамок ни на картах, ни в легенде.
   6. Режим «Игрок»: в бою служебных слов нет (strip и SERVICE из check_player_view.js).
   7. Раскладка расчётом по CSS index.html и battle-cards.css на 932 × 430 и 844 × 390: высота карты с рамкой та же, что без неё; кадр
      портрета не ниже PORTRAIT_MIN; рамка не шире карты больше чем в WIDE раз; метка героя — на рамке.
   8. UI-кит: раздел «Карты боя» рисуется, в нём все рамки — и с выгрузкой, и без неё.
   Вид карт — слова автора 01.10.2026: карты не обрезанные, как нарисован портрет; потом — «сойтись на квадратах» (BF_VIEW, bfPCard, bfSCard):
   9. Переключатель на три вида: по умолчанию — квадрат; bfView меняет вид и помнит выбор, новое состояние его берёт; сценарии
      «Бой · карты-квадраты», «Бой · карты-портреты», «Бой · прежние карты» открывают пять на пять с главным врагом в своём виде;
      в легенде «Знаки» — строка команде с тремя кнопками, игрок её не видит, кнопка «Прежний» возвращает прежний вид.
   10. Те же бои всех режимов (п. 3) в виде «портрет»: поле — pv; карта — pt и тип рамки тот же, что у прежней (bfType); место — из
      BF_VIEW по числу карт стороны (с главным врагом — своя раскладка); рамка .pf с украшением ранга bfp-<тип> и углами bfk-<тип>;
      всё прежнее на карте — эффекты, класс, цель, контроль, «пал», имя, здоровье и щит, шансы, метка героя; портрет — файл
      464 × 576; ход боя идёт; режим «Игрок» чист; вернули прежний вид — разметка карт та же, что до портрета.
   11. Данные и рамки-портреты: места BF_VIEW целы; у каждого типа — украшение в BF_SPRITE, цвета в CSS, угловые — где обещаны,
      градиенты определены; лестница опасности (TIERS — лестница типов автора 06.10.2026, ADR-0054: порядок — RULES.ladder ядра, Хозяин стихии — вершина) —
      каждая ступень тяжелее прежней: уголки, свет, кромки, дыхание;
      анимации — только opacity и transform, при «меньше движения» свет не дышит.
   12. Раскладка вида «портрет» расчётом по CSS на 932 × 430 и 844 × 390, все раскладки по числу карт и с главным врагом: карты — в поле
      и не наезжают друг на друга, украшение — в полосе над рамкой; очередь раунда и лента — между отрядами, на картах не лежат;
      кадр — пропорция портрета 464 : 576, картинка вписана (contain); эффекты, класс, «×N», контроль, «пал», украшение и кристалл —
      вне зоны лица FACE; все портреты боя в assets/art — 464 × 576.
   13. UI-кит: одна сцена в трёх видах на обоих экранах, рамки квадрата и портрета, состояния карты, срез портретов.
   14. Те же бои всех режимов (п. 3) в виде «квадрат»: поле — sv; карта — sq, место — из SLOT (прежняя расстановка колонками), рамка
      ранга, всё прежнее на карте; срез портрета — по лицу из BF_FACES (правило BF_SQ.head и BF_SQ.chin); строки имени и ряды шансов —
      по имени и числу шансов; лицо карты не под полосой сведений на обоих экранах; ход боя идёт; режим «Игрок» чист; вернули прежний
      вид — разметка карт та же.
   15. Данные квадрата: запись в BF_FACES у каждого портрета боя и ни одной лишней; на каждом портрете лицо целиком в квадрате, выше
      полосы сведений, вне столбцов эффектов и ниже украшения ранга — у героя на обычной карте, у врага и на главной (исключения —
      FACE_BIG, FACE_EDGE); имя любого бойца встаёт в две строки на обоих экранах; числа BF_SQ — те же, что в CSS.
   16. Раскладка квадрата расчётом по CSS на 932 × 430 и 844 × 390, все раскладки SLOT с главным врагом и без: карты в поле, в колонке
      не наезжают, колонки не наезжают, середина поля (лента, очередь, легенда) свободна; эффекты и «×N» встают над полосой.
   Везде: без исключений, undefined, NaN и [object.
   Запуск: node tools/content-gen/screens/check_battle_cards.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');

/* ================== ДАННЫЕ ПРОВЕРКИ ================== */
const TYPES = ['hero', 'o', 'e', 'b', 'echo', 'voice', 'rune', 'uber', 'awakened', 'many', 'host'];   // набор рамок 30.09.2026, порядок — лестница типов автора 06.10.2026 (ADR-0054)
const ECHO_MAIN = { m: 'many' };                                                    // главный враг Эхо по типу цели → рамка
const ECHO_RANK = { o: 'o', e: 'e', b: 'echo', uber: 'uber', awakened: 'awakened' };   // остальные в Эхо — по рангу карты из данных (крафтового типа нет)
const PORTRAIT_MIN = 36;   // кадр портрета под рамкой не ниже, px
const WIDE = 1.45;         // рамка с украшением не шире карты больше чем во столько раз
const SIZES = [['932 × 430', 'lg'], ['844 × 390', 'sm']];
/* вид «портрет» */
const TIERS = [['o'], ['e'], ['b', 'echo', 'voice'], ['rune'], ['uber'], ['awakened', 'many'], ['host']];   // лестница опасности — лестница типов автора 06.10.2026 (ADR-0054)
const TIER_RANK = ['o', 'e', 'b', 'rune', 'uber', 'awakened', 'clan'];   // ранг ядра каждой ступени TIERS: порядок сверяется с RULES.ladder
const FACE = { x: [300, 700], y: [100, 380] };   // зона лица в портрете, тысячные: голова — в верхней трети, по центру (art/style/style.md)
const PORTRAIT = [464, 576];                     // портрет героя и врага, px: пропорция кадра карты-портрета
const ART_DIRS = ['heroes', 'foes', 'echo', 'clan'];   // портреты боя в assets/art
const QUEUE_N = 10;                              // очередь раунда пять на пять — значков
const FEED_MIN = 300;                            // лента между нижними рядами не уже, px
const EFFECTS_COL = 3;                           // эффектов в столбике у края до второго столбика
/* вид «квадрат» */
const VIEWS = ['square', 'portrait', 'old'], VIEW_DEF = 'square';   // слово автора 01.10.2026: «сойтись на квадратах»
const VIEW_FLOWS = { square: 'Бой · карты-квадраты', portrait: 'Бой · карты-портреты', old: 'Бой · прежние карты' };
const SQ_EFF = 2;                                // эффектов в столбике квадрата над полосой — на обоих экранах
const NAME_MIN = 8;                              // кегль имени не мельче, px
const TIGHT_MAX = 40;                            // межбуквенный длинного имени не теснее, сотые px
const SQ_TGT = [20, 15];                         // «×N» на верхнем левом углу рамки: ширина «×3» и высота, px
const TOL = 2;                                   // допуск в расчёте лица, px: контур лица по данным — с запасом
const FACE_BIG = ['echo/nm-07'];                 // лицо во весь портрет: в квадрате выше полосы ему не встать
const FACE_EDGE = ['heroes/c2-53', 'echo/it-12', 'echo/mg-04'];   // лицо у края портрета: полезный эффект или «×N» может лечь на щёку

const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [], cnt = { cards: 0, battles: 0, modes: new Set(), seen: new Set() }, cntP = { cards: 0, battles: 0, seen: new Set(), layouts: 0, files: 0, size: '' },
  cntS = { cards: 0, battles: 0, seen: new Set(), layouts: 0, faces: 0, names: 0, two: 0, size: '' };
const fail = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
const done = () => {
  if (err.length) { console.log('ОШИБКИ:\n' + err.map(e => '  ✗ ' + e).join('\n')); process.exit(1); }
  console.log(`Карты боя: рамок ${TYPES.length}, боёв ${cnt.battles}, карт ${cnt.cards}; режимы — ${[...cnt.modes].join(', ')}; рамки в бою — ${[...cnt.seen].join(', ')}.`);
  console.log(`Вид «портрет»: боёв ${cntP.battles}, карт ${cntP.cards}, рамок в бою ${cntP.seen.size}; раскладок ${cntP.layouts}, портретов в assets/art ${cntP.files}; ${cntP.size}.`);
  console.log(`Вид «квадрат»: боёв ${cntS.battles}, карт ${cntS.cards}, рамок в бою ${cntS.seen.size}; лиц в данных ${cntS.faces}, имён ${cntS.names} (в две строки на 844 × 390 — ${cntS.two}, мельче обычного — ${cntS.small || 0} случаев, теснее — ${cntS.tight ? [...cntS.tight].join(', ') : 'никого'}); раскладок ${cntS.layouts}; ${cntS.size}.`);
  console.log('Проверка пройдена: набор и данные рамок, тип по режиму и рангу, карта с рамкой и без, раскладка на двух экранах, режим «Игрок», UI-кит; вид «портрет» — карты всех режимов, рамки и лестница, раскладка и зона лица; вид «квадрат» — по умолчанию, карты всех режимов, срез по лицу у каждого портрета, полоса сведений не на лице, имена целиком, раскладка колонками на двух экранах; переключатель на три вида, UI-кит.');
  process.exit(0);
};
const BAD = /.{0,60}(?:undefined|NaN|\[object ).{0,40}/;
const scan = (key, h) => { const m = String(h).match(BAD); if (m) fail(`${key}: в разметке undefined, NaN или [object — «${m[0].replace(/\s+/g, ' ')}»`); return h; };

/* ================== 1. файлы ================== */
{
  const crlf = (html.match(/\r\n/g) || []).length, lf = (html.match(/\n/g) || []).length;
  if (crlf !== lf) fail(`index.html: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}`);
  if (!html.includes('<link rel="stylesheet" href="screens/battle-cards.css">')) fail('index.html: не подключён screens/battle-cards.css');
  if (!html.includes('<script src="screens/battle-cards.js"></script>')) fail('index.html: не подключён screens/battle-cards.js');
  for (const f of ['screens/battle-cards.js', 'screens/battle-cards.css']) {
    const t = read(f); if ((t.match(/\r\n/g) || []).length !== (t.match(/\n/g) || []).length) fail(`${f}: концы строк не CRLF`);
  }
}
/* CSS: правило по селектору и число свойства */
const css = html + '\n' + read('screens/battle-cards.css');
const rule = sel => { const m = css.match(new RegExp('(?:^|\\})' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}', 'm')); return m ? m[1] : ''; };   // селектор целиком: с начала строки или после }
const px = (sel, prop) => { const m = rule(sel).match(new RegExp('(?:^|;)\\s*' + prop + ':\\s*(-?\\d+(?:\\.\\d+)?)px')); return m ? +m[1] : NaN; };
{
  if (!/--cw:74px/.test(rule('.bc')) || !/width:var\(--cw\)/.test(rule('.bc'))) fail('CSS: у .bc нет ширины карты переменной --cw');
  if (!/--cw:84px/.test(rule('.bc.lead'))) fail('CSS: у .bc.lead нет --cw');
}
/* квадрат: размеры из battle-cards.css — сторона портрета на двух экранах, главный, рамка, полоса сведений */
const SQG = (() => {
  const cb = read('screens/battle-cards.css'), n = (re, what) => { const m = cb.match(re); if (!m) fail(`CSS квадрата: не прочитано — ${what}; правило переименовано?`); return m ? +m[1] : NaN; };
  const g = {
    P: { lg: n(/\.bt\.sv\{--sp0:(\d+)px\}/, 'сторона портрета'), sm: n(/@container main \(max-height: 360px\)\{ \.bt\.sv\{--sp0:(\d+)px\} \}/, 'сторона на 844 × 390') },
    lead: n(/\.bc\.sq\.lead\{--sk:([\d.]+);--sp:calc\(var\(--sp0,\d+px\) \* \1\)\}/, 'главный'),
    pfw: n(/\.bc\.sq\{[^}]*--pfw:(\d+)px/, 'планка'), pcr: n(/\.bc\.sq\{[^}]*--pcr:(\d+)px/, 'украшение над рамкой'), shp: n(/\.bc\.sq\{[^}]*--shp:(\d+)px/, 'полоса здоровья'),
    slh: { lg: n(/\.bc\.sq\{[^}]*--slh:(\d+)px/, 'строка имени'), sm: n(/@container main \(max-height: 360px\)\{ \.bc\.sq\{--slh:(\d+)px/, 'строка имени на 844 × 390') },
    sfs: { lg: n(/\.bc\.sq\{[^}]*--sfs:calc\(var\(--nfl,(\d+)\) \* 1px\)/, 'кегль имени'), sm: n(/@container main \(max-height: 360px\)\{ \.bc\.sq\{--slh:\d+px;--sfs:calc\(var\(--nfs,(\d+)\) \* 1px\)/, 'кегль на 844 × 390') },
    chipH: n(/--scc:calc\(var\(--snc\) \* (\d+)px \+ \(var\(--snc\) - 1\) \* \d+px\)/, 'ряд шансов'), chipGap: n(/--scc:calc\(var\(--snc\) \* \d+px \+ \(var\(--snc\) - 1\) \* (\d+)px\)/, 'зазор рядов'),
    band: (cb.match(/--sbt:calc\((\d+)px \+ var\(--scc\) \+ (\d+)px \+ var\(--snl\) \* var\(--slh\) \+ (\d+)px\)/) || []).slice(1).map(Number),
    si: n(/\.bc\.sq \.si\{width:(\d+)px;height:\1px\}/, 'значок эффекта'), siGap: n(/\.bc\.sq \.face>\.buffs,\.bc\.sq \.face>\.debuffs\{flex-direction:column;justify-content:flex-start;gap:(\d+)px/, 'зазор эффектов'),
    nmPad: n(/\.bc\.sq>\.nm\{position:absolute;z-index:2;left:calc\(var\(--pfw\) \+ (\d+)px\)/, 'поле имени'),
    rotR: n(/\.bc\.sq>\.rot\{position:absolute;z-index:2;left:calc\(var\(--pfw\) \+ \d+px\);right:calc\(var\(--pfw\) \+ (\d+)px\)/, 'место знака класса'),
    rotL: n(/\.bc\.sq>\.rot\{position:absolute;z-index:2;left:calc\(var\(--pfw\) \+ (\d+)px\)/, 'поле шансов'),
    rotGap: n(/\.bc\.sq>\.rot\{[^}]*\bgap:(\d+)px/, 'зазор шансов'),
    chipW: n(/\.bc\.sq>\.rot \.ch\{width:(\d+)px;/, 'ширина шанса'),
    tgtOff: n(/\.bc\.sq \.face>\.tgt\{left:calc\(-1 \* var\(--pfw\) - (\d+)px\);top:calc\(-1 \* var\(--pfw\) - \1px\);bottom:auto/, '«×N» на углу рамки'),
    manyTop: n(/\.bc\.sq\.many \.face>\.buffs\{top:(\d+)px/, 'полезные под «×N»'),
  };
  if (g.band.length !== 3) fail('CSS квадрата: не прочитана высота полосы сведений (--sbt)');
  if (!/\.bt\.sv \.bc\{top:calc\(var\(--r\) \/ 2 \* \(100% - var\(--sch\)\)\)\}/.test(cb)) fail('CSS квадрата: место карты не из --r (прежняя расстановка)');
  if (!/--sch:calc\(var\(--pcr\) \* var\(--sk\) \+ var\(--pfw\) \+ var\(--sp\) \+ var\(--shp\)\)/.test(cb)) fail('CSS квадрата: высота карты --sch не из украшения, планки, портрета и полосы здоровья');
  return g;
})();
/* полоса сведений квадрата над низом портрета, px: шансы в cr рядов, имя в nl строк */
const sqBand = (sz, nl, cr) => SQG.band[0] + cr * SQG.chipH + (cr - 1) * SQG.chipGap + SQG.band[1] + nl * SQG.slh[sz] + SQG.band[2];
/* срез портрета — правило вида, посчитанное здесь заново: запас над макушкой BF_SQ.head, подбородок не ниже BF_SQ.chin, макушка в кадре */
const sqCrop = (F, Q) => { const [w, h] = PORTRAIT, run = h - w; return Math.round(Math.min(run * 1000, Math.max(0, F[0] * h - Q.head * w, Math.min(F[1] * h - Q.chin * w, F[0] * h))) / run); };
/* имя — заново, как у браузера: куски — слова и части до дефиса; кегль — первый из списка, при котором встаёт в rows строк и ни один кусок
   не шире строки; иначе — последний кегль и межбуквенный tight. Ответ — { f, n, t } */
function nameFit(name, sz, lead, Q) {
  const room = SQG.P[sz] * (lead ? Q.lead : 100) - (2 * Q.pad + 2) * 100, gl = c => { for (const [w, cs] of Object.entries(Q.glyph)) if (cs.includes(c)) return +w; return Q.glyph0; };
  const chunks = String(name).split(/\s+/).filter(Boolean).flatMap((w, i) => w.split(/(?<=-)/).map((c, j) => [c, i > 0 && j === 0]));
  const lines = (fz, ls) => {
    const W = c => [...c].reduce((a, ch) => a + gl(ch) * fz / 10 + ls, 0);
    let n = 1, cur = 0;
    for (const [c, sp] of chunks) { const cw = W(c); if (cw > room) return Infinity; const add = (sp ? W(' ') : 0) + cw; if (!cur) cur = cw; else if (cur + add <= room) cur += add; else { n++; cur = cw; } }
    return n;
  };
  for (const fz of Q.font[sz]) { const n = lines(fz, 0); if (n <= Q.rows) return { f: fz, n, t: 0 }; }
  const last = Q.font[sz][Q.font[sz].length - 1];
  return { f: last, n: Math.min(Q.rows, lines(last, Q.tight)), t: Q.tight, fit: lines(last, Q.tight) <= Q.rows };
}
/* рядов шансов — заново, по CSS: ряд — портрет без полей ряда, шанс — своей ширины, зазор; больше двух рядов не бывает */
const chipRows = (n, sz, lead) => { const P = SQG.P[sz] * (lead ? SQG.lead : 1), per = Math.max(1, Math.floor((P - SQG.rotL - SQG.rotR + SQG.rotGap) / (SQG.chipW + SQG.rotGap))); return Math.min(2, Math.max(1, Math.ceil(n / per))); };
/* лицо в квадрате стороной P, px: верх (макушка), подбородок, края — контур шириной 3/4 высоты лица */
function sqFace(F, P, Q) {
  const [w, h] = PORTRAIT, y = sqCrop(F, Q) * (h - w) / 1000, k = P / w, hw = (F[1] - F[0]) * h / 1000 * 3 / 8;
  return { top: (F[0] * h / 1000 - y) * k, chin: (F[1] * h / 1000 - y) * k, l: (F[2] * w / 1000 - hw) * k, r: (F[2] * w / 1000 + hw) * k };
}

/* ================== песочница ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const stubEl = id => {
  const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, remove() {},
    animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
  e.querySelector = () => stubEl();
  return e;
};
const els = {}, store = {};
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
  createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: stubEl('html'), activeElement: null, fonts: null };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { fail(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
const T = vm.runInContext(`({ get S() { return S; }, set S(v) { S = v; }, BF, bfType, bfCard, bfHero, ACT, FLOWS, KIT_EXTRA, H, RSI, RX, render, initialState, startRun,
  advance, paintCards, rsSetWeek, BAG, ACTIVATE, SQ, setTeam, EB, bfView, BF_VIEW, BF_SPRITE, SHELL_SIZE, BF_SQ, BF_FACES, bfLines, bfName, bfWrap, bfChipRows, bfTextW, SLOT, BF_KIT, RS,
  get foes() { return S.foes; } })`, ctx);
const run = (where, f) => { try { return f(); } catch (e) { fail(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const draw = where => { run(where, () => T.render()); return scan(where, els.game ? els.game.innerHTML : ''); };
const BF = T.BF;

/* ================== 2. данные рамок ================== */
{
  const keys = Object.keys(BF.types);
  if (keys.join() !== TYPES.join()) fail(`BF.types: набор ${keys.join(', ')}, ждали ${TYPES.join(', ')}`);
  const paths = keys.map(t => BF.path(t));
  if (new Set(paths).size !== paths.length) fail('BF: у двух типов одна картинка рамки');
  if (!BF.types.hero || !BF.types.hero.mark) fail('BF: у героя нет рамки с гнездом метки');
  const art = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'ui-art.json'), 'utf8'));
  const names = new Set();
  for (const t of keys) {
    const X = BF.types[t], key = `рамка ${t}`;
    if (!X || typeof X !== 'object' || !Array.isArray(X.win) || !Array.isArray(X.cut)) { fail(`${key}: не рамка — нет окна и нарезки`); continue; }
    if (t !== 'hero') {
      if (!X.n) fail(`${key}: нет имени для игрока`);
      if (names.has(X.n)) fail(`${key}: имя «${X.n}» у двух рамок`); names.add(X.n);
      for (const [what, re] of SERVICE) if (re.test(X.n)) fail(`${key}: в имени служебное (${what}) — «${X.n}»`);
    }
    const nums = [X.ar].concat(X.win, X.cut, X.mark || []);
    if (nums.some(v => !Number.isInteger(v))) fail(`${key}: геометрия — не целые тысячные`);
    if (X.win.length !== 4 || X.cut.length !== 4) fail(`${key}: окно и нарезка — по четыре стороны`);
    if (X.win[1] + X.win[3] >= 1000 || X.win[0] + X.win[2] >= 1000 || X.win.some(v => v < 0)) fail(`${key}: окно не внутри рисунка`);
    if (X.cut.some((v, i) => v < X.win[i])) fail(`${key}: нарезка ${X.cut} уже окна ${X.win} — край окна попал бы в тянущуюся середину`);
    if (X.cut[0] + X.cut[2] >= 1000 || X.cut[1] + X.cut[3] >= 1000) fail(`${key}: нарезка перекрывает рисунок`);
    if (!X.kit || !fs.existsSync(path.join(UI, 'assets', 'art', X.kit))) fail(`${key}: нет портрета для UI-кита — ${X.kit}`);
    const p = BF.path(t), file = path.join(UI, 'assets', 'art', p);
    if (!BF.ready.includes(p)) continue;
    if (!fs.existsSync(file)) { fail(`${key}: в BF.ready, но нет файла ${p}`); continue; }
    const b = fs.readFileSync(file), w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    if (b.toString('latin1', 1, 4) !== 'PNG' || b[25] !== 6) fail(`${key}: ${p} — не PNG с альфой`);
    if (Math.abs(Math.round(h * 1000 / w) - X.ar) > 2) fail(`${key}: пропорция выгрузки ${h * 1000 / w | 0}‰, в данных ${X.ar}‰`);
    const src = art.items[p];
    if (!src || !src.from || !fs.existsSync(path.join(ROOT, 'art', 'generated', src.from))) fail(`${key}: в tools/art-gen/ui-art.json нет исходника ${p} или его файла`);
  }
  for (const r of ['o', 'e', 'b', 'rune', 'uber', 'awakened', 'clan']) if (!BF.types[BF.rank[r]]) fail(`BF.rank: у ранга ${r} нет рамки`);
}

/* ================== 3–4. тип рамки по режимам, карта с рамкой ================== */
const CARD = /<div class="bc [^"]*" id="bc(\d)(\d+)"[^>]*>[\s\S]*?<div class="rot"><\/div>\s*<\/div>/g;
function cardsOf(h) { return [...h.matchAll(CARD)].map(m => ({ side: +m[1], i: +m[2], html: m[0] })); }
/* бой на экране: у каждой карты — рамка своего типа и всё, что было на карте */
function checkBattle(key, R, want) {
  if (!R || !R.b) { fail(`${key}: боя нет`); return; }
  T.S.focus = R.id; T.S.route = 'battle'; T.S.overlay = null;
  const h = draw(key); cnt.battles++; cnt.modes.add(key.split(' · ')[0]);
  const cards = cardsOf(h);
  if (cards.length !== R.b.u[0].length + R.b.u[1].length) fail(`${key}: карт ${cards.length}, бойцов ${R.b.u[0].length + R.b.u[1].length}`);
  for (const c of cards) {
    const u = R.b.u[c.side][c.i], t = T.bfType(R, u), exp = want(u, c.side);
    cnt.cards++; cnt.seen.add(t);
    const where = `${key} · ${c.side ? 'враг' : 'герой'} ${u.name}`;
    if (exp && t !== exp) fail(`${where}: рамка «${t}», ждали «${exp}»`);
    if (!c.html.includes(` data-bf="${t}"`) || !/class="bc [^"]*\bfr"/.test(c.html)) fail(`${where}: у карты нет рамки своего типа`);
    if (!c.html.includes(`<i class="bf" style="border-image-source:url('assets/art/${BF.path(t)}`)) fail(`${where}: в кадре нет рамки ${BF.path(t)}`);
    for (const v of ['--bf-ar', '--bf-wt', '--bf-wr', '--bf-wb', '--bf-wl', '--bf-ct', '--bf-cr', '--bf-cb', '--bf-cl']) if (!c.html.includes(v + ':')) fail(`${where}: нет ${v}`);
    for (const part of ['class="buffs"', 'class="debuffs"', 'class="cls"', 'class="tgt"', 'class="ctl"', 'class="nm"', 'class="bar hp"', 'class="sh"', 'class="hpn"', 'class="shn"', 'class="rot"']) if (!c.html.includes(part)) fail(`${where}: нет ${part}`);
    if (!c.side && !c.html.includes('class="fell"')) fail(`${where}: у героя нет «пал»`);
    if (t === 'hero') markOk(where, c, u);
    else if (c.html.includes('bf-mk')) fail(`${where}: метка героя на карте врага`);
  }
  if (!h.includes('Рамка — ранг врага')) fail(`${key}: в легенде знаков нет строки о рамке`);
  run(key + ' · ход боя', () => T.paintCards(R));
  playerView(key, h);
  plainView(key, R, h);
  portraitView(key, R, h);
  squareView(key, R, h);
}
/* метка героя: кристалл редкости героя и звёзды по личному максимуму, взятые — по доблести */
function markOk(where, c, u) {
  const hh = T.bfHero(u), mk = c.html.match(/<span class="bf-mk" data-r="(\d)"[^>]*><b><\/b>(?:<span class="bf-st">([\s\S]*?)<\/span>)?<\/span>/);
  if (!hh) fail(`${where}: у героя нет редкости и доблести`);
  else if (!mk) fail(`${where}: нет метки героя`);
  else {
    const on = (mk[2] || '').match(/<i class="on">/g) || [], all = (mk[2] || '').match(/<i /g) || [];
    if (+mk[1] !== hh.r || all.length !== hh.max || on.length !== hh.v) fail(`${where}: метка ${mk[1]} · ${on.length} из ${all.length}, у героя ${hh.r} · ${hh.v} из ${hh.max}`);
  }
}
/* размер картинки: PNG и JPEG по заголовку, без библиотек */
const IMG = new Map();
function imgSize(file) {
  if (IMG.has(file)) return IMG.get(file);
  let r = null;
  try {
    const b = fs.readFileSync(file);
    if (b.toString('latin1', 1, 4) === 'PNG') r = [b.readUInt32BE(16), b.readUInt32BE(20)];
    else if (b[0] === 0xFF && b[1] === 0xD8) for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) { r = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; break; }
      i += 2 + b.readUInt16BE(i + 2);
    }
  } catch (_) { r = null; }
  IMG.set(file, r); return r;
}
/* портрет карты — файл в пропорции PORTRAIT: кадр карты-портрета его не обрезает */
function portraitFile(where, src) {
  if (/^data:/.test(src)) return;
  const sz = imgSize(path.join(UI, src.split('?')[0]));
  if (!sz) fail(`${where}: нет файла портрета ${src}`);
  else if (Math.abs(sz[1] * PORTRAIT[0] - sz[0] * PORTRAIT[1]) > sz[0] * PORTRAIT[1] / 200) fail(`${where}: портрет ${src} — ${sz[0]} × ${sz[1]}, не ${PORTRAIT[0]} : ${PORTRAIT[1]} — кадр карты его обрежет или оставит поля`);
}
/* 10. та же сцена в виде «портрет»: место, рамка CSS, всё прежнее на карте; потом прежний вид — разметка карт та же, что до */
function portraitView(key, R, h0) {
  const before = cardsOf(h0).map(c => c.html).join('\n'), BV = T.BF_VIEW;
  T.S.bfv = 'portrait';
  try {
    const h = draw(key + ' · портрет'); cntP.battles++;
    if (!h.includes('<div class="bt pv" id="bt">')) fail(`${key} · портрет: у поля боя нет класса pv`);
    if (/data-bf=|class="bf"|\bfr"/.test(h)) fail(`${key} · портрет: на картах следы рамок-картинок прежнего вида`);
    const cards = cardsOf(h);
    if (cards.length !== R.b.u[0].length + R.b.u[1].length) fail(`${key} · портрет: карт ${cards.length}, бойцов ${R.b.u[0].length + R.b.u[1].length}`);
    for (const c of cards) {
      const team = R.b.u[c.side], u = team[c.i], t = T.bfType(R, u), lead = !!team[0].lead, at = ((lead ? BV.lead : BV.slot)[team.length] || [])[c.i];
      const where = `${key} · портрет · ${c.side ? 'враг' : 'герой'} ${u.name}`, w = BV.crest[t];
      cntP.cards++; cntP.seen.add(t);
      if (!/class="bc [^"]*\bpt"/.test(c.html) || !c.html.includes(` data-pf="${t}"`)) fail(`${where}: нет карты-портрета с рамкой «${t}»`);
      if (!at || !c.html.includes(`;--px:${at[0]};--py:${at[1]}"`)) fail(`${where}: место не из BF_VIEW (${lead ? 'с главным врагом' : 'два ряда'}, карт ${team.length}, №${c.i})`);
      if (!!u.lead !== /class="bc [^"]*\blead\b/.test(c.html)) fail(`${where}: главный враг и класс lead не совпадают`);
      if (!c.html.includes(`<i class="pf" aria-hidden="true"><svg class="pc" style="--pcw:${w}" viewBox="0 0 ${w} 14" aria-hidden="true"><use href="#bfp-${t}"></use></svg>`)) fail(`${where}: нет рамки .pf с украшением ранга bfp-${t}`);
      if (BV.corner.includes(t) !== c.html.includes(`<use href="#bfk-${t}">`)) fail(`${where}: угловые украшения не по BF_VIEW.corner`);
      for (const part of ['class="buffs"', 'class="debuffs"', 'class="cls"', 'class="tgt"', 'class="ctl"', 'class="nm"', 'class="bar hp"', 'class="sh"', 'class="hpn"', 'class="shn"', 'class="rot"']) if (!c.html.includes(part)) fail(`${where}: нет ${part}`);
      if (!c.side && !c.html.includes('class="fell"')) fail(`${where}: у героя нет «пал»`);
      if (t === 'hero') markOk(where, c, u); else if (c.html.includes('bf-mk')) fail(`${where}: метка героя на карте врага`);
      const src = (c.html.match(/<div class="face"><img src="([^"]+)"/) || [])[1];
      if (src) portraitFile(where, src);
    }
    run(key + ' · портрет · ход боя', () => T.paintCards(R));
    if (!h.includes('Рамка — ранг врага') || !h.includes('<span class="bf-pm" data-pf="o">') || !h.includes('<span class="bf-pm" data-pf="b">')) fail(`${key} · портрет: в легенде знаков нет строки о рамке с образцами-портретами`);
    playerView(key + ' · портрет', h);
  } finally { T.S.bfv = 'old'; T.setTeam(true); }
  const after = cardsOf(draw(key + ' · снова прежний')).map(c => c.html).join('\n');
  if (after !== before) { const i = [...before].findIndex((ch, j) => ch !== after[j]); fail(`${key}: после портретного вида прежние карты другие — «${before.slice(Math.max(0, i - 50), i + 40)}» против «${after.slice(Math.max(0, i - 50), i + 40)}»`); }
}
/* 14. та же сцена в виде «квадрат»: прежние места, рамка CSS, срез по лицу, полоса сведений не на лице; потом прежний вид — разметка та же */
function squareView(key, R, h0) {
  const before = cardsOf(h0).map(c => c.html).join('\n'), BV = T.BF_VIEW, Q = T.BF_SQ;
  T.S.bfv = 'square';
  try {
    const h = draw(key + ' · квадрат'); cntS.battles++;
    if (!h.includes('<div class="bt sv" id="bt">')) fail(`${key} · квадрат: у поля боя нет класса sv`);
    if (/data-bf=|class="bf"|\bfr"|\bpt"/.test(h)) fail(`${key} · квадрат: на картах следы других видов`);
    const cards = cardsOf(h);
    if (cards.length !== R.b.u[0].length + R.b.u[1].length) fail(`${key} · квадрат: карт ${cards.length}, бойцов ${R.b.u[0].length + R.b.u[1].length}`);
    for (const c of cards) {
      const team = R.b.u[c.side], u = team[c.i], t = T.bfType(R, u), at = (T.SLOT[team.length] || [])[c.i];
      const where = `${key} · квадрат · ${c.side ? 'враг' : 'герой'} ${u.name}`, w = BV.crest[t];
      cntS.cards++; cntS.seen.add(t);
      if (!/class="bc [^"]*\bsq(?: sfa)?"/.test(c.html) || !c.html.includes(` data-pf="${t}"`)) fail(`${where}: нет карты-квадрата с рамкой «${t}»`);
      if (!at || !c.html.includes(`style="--k:${at[0]};--r:${at[1]};--fy:`)) fail(`${where}: место не прежнее — не из SLOT (карт ${team.length}, №${c.i})`);
      if (!!u.lead !== /class="bc [^"]*\blead\b/.test(c.html)) fail(`${where}: главный враг и класс lead не совпадают`);
      if (!c.html.includes(`<i class="pf" aria-hidden="true"><svg class="pc" style="--pcw:${w}" viewBox="0 0 ${w} 14" aria-hidden="true"><use href="#bfp-${t}"></use></svg>`)) fail(`${where}: нет рамки .pf с украшением ранга bfp-${t}`);
      if (BV.corner.includes(t) !== c.html.includes(`<use href="#bfk-${t}">`)) fail(`${where}: угловые украшения не по BF_VIEW.corner`);
      for (const part of ['class="buffs"', 'class="debuffs"', 'class="cls"', 'class="tgt"', 'class="ctl"', 'class="nm"', 'class="bar hp"', 'class="sh"', 'class="hpn"', 'class="shn"', 'class="rot"']) if (!c.html.includes(part)) fail(`${where}: нет ${part}`);
      if (!c.side && !c.html.includes('class="fell"')) fail(`${where}: у героя нет «пал»`);
      if (t === 'hero') markOk(where, c, u); else if (c.html.includes('bf-mk')) fail(`${where}: метка героя на карте врага`);
      const m = c.html.match(/;--fy:(\d+);--nll:(\d);--nls:(\d);--nfl:(\d+);--nfs:(\d+);--ntl:(-?\d+);--nts:(-?\d+);--crl:(\d);--crs:(\d)"/);
      if (!m) { fail(`${where}: нет среза и полосы сведений (--fy, --nll, --nls, --nfl, --nfs, --ntl, --nts, --crl, --crs)`); continue; }
      const nt = [+m[6], +m[7]]; m.splice(4, 4);   // кегль и межбуквенный сверяются ниже вместе со строками
      const name = ((c.html.match(/<span class="nm">([^<]*)<\/span>/) || [])[1] || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const chips = R.b.mode === 'rounds' ? (u.table || []).length : 1, lead = !!u.lead;
      const fz = (c.html.match(/;--nfl:(\d+);--nfs:(\d+);/) || []).slice(1).map(Number);
      for (const [sz, nl, cr, f, t] of [['lg', +m[2], +m[4], fz[0], nt[0]], ['sm', +m[3], +m[5], fz[1], nt[1]]]) {
        const want = nameFit(name, sz, lead, Q);
        if (nl !== want.n || f !== want.f || t !== want.t || cr !== chipRows(chips, sz, lead)) fail(`${where}: имя ${nl} стр. кеглем ${f} (${t}) и рядов шансов ${cr} на ${sz} — не по имени «${name}» и ${chips} шансам (ждали ${want.n} стр. кеглем ${want.f} (${want.t}), рядов ${chipRows(chips, sz, lead)})`);
      }
      const src = (c.html.match(/<div class="face">(?:<span[^>]*>)?<img src="([^"]+)"/) || [])[1];
      if (!src || /^data:/.test(src)) continue;
      const pk = src.match(/art\/(heroes|foes|echo|clan)\/([\w-]+)\.(?:jpe?g|png)/);
      if (!pk) { fail(`${where}: портрет не из папок боя — ${src}`); continue; }
      const id = pk[1] + '/' + pk[2], F = (T.BF_FACES[pk[1]] || {})[pk[2]];
      if (!F) { fail(`${where}: у портрета ${id} нет лица в BF_FACES`); continue; }
      if (+m[1] !== sqCrop(F, Q)) fail(`${where}: срез ${m[1]} ‰ — не по лицу ${id} (ждали ${sqCrop(F, Q)})`);
      if (FACE_BIG.includes(id)) continue;
      for (const [sz, nl, cr] of [['lg', +m[2], +m[4]], ['sm', +m[3], +m[5]]]) {
        const P = SQG.P[sz] * (lead ? SQG.lead : 1), g = sqFace(F, P, Q), band = sqBand(sz, nl, cr);
        if (g.chin > P - band - 1 + TOL) fail(`${where}: на ${sz === 'lg' ? '932 × 430' : '844 × 390'} подбородок ${id} (${g.chin.toFixed(1)} px) под полосой сведений — верх полосы ${(P - band).toFixed(1)} px`);
      }
    }
    run(key + ' · квадрат · ход боя', () => T.paintCards(R));
    if (!h.includes('Рамка — ранг врага') || !h.includes('<span class="bf-pm sq" data-pf="o">') || !h.includes('<span class="bf-pm sq" data-pf="b">')) fail(`${key} · квадрат: в легенде знаков нет строки о рамке с образцами-квадратами`);
    playerView(key + ' · квадрат', h);
  } finally { T.S.bfv = 'old'; T.setTeam(true); }
  const after = cardsOf(draw(key + ' · снова прежний')).map(c => c.html).join('\n');
  if (after !== before) { const i = [...before].findIndex((ch, j) => ch !== after[j]); fail(`${key}: после квадрата прежние карты другие — «${before.slice(Math.max(0, i - 50), i + 40)}» против «${after.slice(Math.max(0, i - 50), i + 40)}»`); }
}
/* 6. глазами игрока — без служебного */
function playerView(key, h) {
  T.setTeam(false);
  const g = draw(key + ' · игрок'), t = playerText(g);
  for (const [what, re] of SERVICE) { const m = t.match(re); if (m) fail(`${key}: игрок видит служебное (${what}) — «${t.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\n/g, ' ')}»`); }
  if (/data-bf=/.test(strip(g)) !== /data-bf=/.test(h)) fail(`${key}: в режиме «Игрок» рамки другие`);
}
/* 5. без выгрузки — прежняя карта: разметка та же за вычетом рамки */
function plainView(key, R, h) {
  const ready = BF.ready; BF.ready = [];
  try {
    const g = draw(key + ' · без рамок');
    if (/data-bf=|class="bf"|bf-mk|bf-lg|--bf-|\bfr"|Рамка — ранг врага/.test(g)) fail(`${key}: без выгрузки на карте или в легенде следы рамки`);
    const wipe = s => s.replace(/ fr"/g, '"').replace(/ data-bf="\w+"/g, '').replace(/;--bf-[\w-]+:\d+/g, '').replace(/<i class="bf" [^>]*><\/i>/g, '')
      .replace(/<span class="bf-mk"[^>]*><b><\/b>(?:<span class="bf-st">(?:<i class="(?:on)?"><\/i>)*<\/span>)?<\/span>/g, '')
      .replace(/ · (?:Рядовой|Элита|Голос сонма|Босс биома|Босс Эхо|Многоликий|Рунный страж|Убер-босс|Пробуждённый|Хозяин стихии)(?=[ :])/g, '');
    const a = cardsOf(wipe(h)).map(c => c.html).join('\n'), b = cardsOf(g).map(c => c.html).join('\n');
    if (a !== b) { const i = [...a].findIndex((ch, j) => ch !== b[j]); fail(`${key}: без выгрузки карта не прежняя — «${a.slice(Math.max(0, i - 60), i + 40)}» против «${b.slice(Math.max(0, i - 60), i + 40)}»`); }
  } finally { BF.ready = ready; T.setTeam(true); }
}

const fresh = () => { T.S = T.initialState(); T.S.bfv = 'old'; T.S.overlay = null; T.S.runs = []; T.setTeam(true); };   // разделы 3–8 — прежний вид
const lastRun = kind => T.S.runs.filter(r => kind ? r.kind === kind : !r.kind).slice(-1)[0];

/* забег по биомам 1–4: первый этаж каждого вида и рунный страж */
for (const id of Object.keys(T.EB.BIOMES).filter(b => /^b\d$/.test(b))) {
  const B = T.EB.BIOMES[id];
  const picks = ['o', 'e', 'b'].map(g => B.floors.findIndex(f => f.g === g) + 1).filter(f => f > 0);
  for (const fl of picks) {
    fresh(); T.S.heroes.forEach(h => { h.busy = null; });
    run(`${id} · этаж ${fl}`, () => T.startRun('s1', id, fl));
    const R = lastRun();
    const g = B.floors[fl - 1].g;
    checkBattle(`Биом · ${id} · этаж ${fl} (${g})`, R, (u, sd) => !sd ? 'hero' : u.lead ? g : 'o');
  }
  if (B.guard) {
    fresh();
    run(`${id} · страж`, () => T.startRun('s1', id, 0, true));
    checkBattle(`Рунный страж · ${id}`, lastRun(), (u, sd) => !sd ? 'hero' : u.lead ? 'rune' : 'e');
  }
}

/* Эхо: цель каждого типа и призванный враг каждого типа по силе — элита, босс, Убер, Пробуждённый (ADR-0039); атака — как у игрока */
{
  const E = vm.runInContext('window.EN_ECHO', ctx), STEPS = E.steps, TOP = STEPS.length;
  const W = vm.runInContext('RS.weeks', ctx)[0], c = 3;
  const targets = [];
  for (const g of ['o', 'e', 'b', 'u']) targets.push(['step', STEPS.indexOf(g) + 1]);
  targets.push(['step', TOP + 1]);
  for (const g of ['e', 'b', 'u', 'a']) { const fb = T.RX.drops.craftBosses.find(b => b.g === g && !b.team); if (fb) targets.push(['craft', fb]); else fail(`призванного врага типа «${g}» нет в recipes.js`); }
  for (const [kind, x0] of targets) {
    fresh(); T.rsSetWeek(W.race); T.S.acc.cycle = c; T.S.route = 'echo'; T.S.wallet.souls = 1e9; E.sync();
    const x = run('Эхо · цель', () => E.target(kind, x0)); if (!x) continue;
    T.S.echo.slots[0] = x; T.S.echo.sel = 0;
    run('Эхо · атака', () => T.ACT.echatk(x.uid + ':1'));
    const R = lastRun('echo'), guards = { o: 'o', e: 'e', b: 'echo', uber: 'uber', awakened: 'awakened' };
    checkBattle(`Эхо · ${kind === 'craft' ? 'призыв из рецепта · ' + x.g : x.g === 'm' ? 'Многоликий' : 'ступень ' + x.step}`, R,
      (u, sd) => !sd ? 'hero' : u.lead ? ECHO_MAIN[x.g] || ECHO_RANK[u.rank] : guards[u.rank] || 'o');
  }
  /* биом Многоликого: этажи по порядку — рамка главного врага по его типу */
  fresh(); T.rsSetWeek(W.race); T.S.acc.cycle = c; T.S.wallet.souls = 1e9; E.sync();
  T.S.heroes.forEach(h => { h.lvl = Math.max(h.lvl, 3 * E.lvl(TOP, c)); });
  T.S.ech.biomes = []; T.S.ech.manyWk = {}; T.BAG.add('many', 1);
  run('биом Многоликого', () => { T.ACTIVATE.echo('many'); if (T.S.overlay && T.S.overlay.op) T.ACT.echactdo(T.S.overlay.op); });
  const mb = T.S.ech.biomes.find(b => b.many);
  if (!mb) fail('биом Многоликого: не открылся');
  else {
    run('биом Многоликого · забег', () => T.ACT.echmany(mb.uid));
    const R = lastRun('many'), seen = new Set();
    for (let n = 0; R && !R.over && n < 400; n++) {
      if (R.b && !seen.has(R.floor)) {
        seen.add(R.floor);
        const g = STEPS[R.floor - 1], main = { o: 'o', e: 'e', b: 'echo', u: 'uber' }[g];
        checkBattle(`Биом Многоликого · этаж ${R.floor}`, R, (u, sd) => !sd ? 'hero' : u.lead ? main : null);
        if (seen.size >= 4 && [...seen].some(f => STEPS[f - 1] === 'b')) break;
      }
      T.S.route = 'descent';   // бой идёт не на экране: эффектам боя нужен настоящий DOM
      run('биом Многоликого · ход', () => T.advance(R, 2000));
    }
    if (seen.size < 2) fail(`биом Многоликого: проверено этажей ${seen.size}`);
  }
}

/* клан: Голос сонма, потом Хозяин стихии — свита у обоих рядовые */
{
  fresh(); T.S.seg.clan = 'boss'; T.SQ.set('clan', 's1');
  const C = () => T.S.clan;
  const x = C().boss.targets.find(t => !t.dead && !t.burned && t.g === 'e');
  if (!x) fail('клан: нет живой элиты круга');
  else {
    run('клан · атака элиты', () => T.ACT.clatk(`${x.uid}:${C().boss.n + 1}`));
    checkBattle('Клан · Голос сонма', lastRun('clan'), (u, sd) => !sd ? 'hero' : u.lead ? 'voice' : 'o');
    for (let j = 0; j < 4 && !C().boss.targets.some(t => t.g === 'b' && !t.dead); j++) {
      const t = C().boss.targets.find(y => !y.dead && !y.burned && y.g === 'e'); if (!t) break;
      t.hp = 1;
      for (let a = 0; a < 10 && !t.dead; a++) { run('клан · добить элиту', () => T.ACT.clatk(`${t.uid}:${C().boss.n + 1}`)); const Rr = lastRun('clan'); if (Rr && !Rr.over) run('клан · итог', () => T.ACT.clskip(Rr.id)); T.S.overlay = null; }
    }
    const bs = C().boss.targets.find(t => t.g === 'b' && !t.dead);
    if (!bs) fail('клан: Хозяин не встал после трёх элит');
    else {
      run('клан · атака Хозяина', () => T.ACT.clatk(`${bs.uid}:${C().boss.n + 1}`));
      checkBattle('Клан · Хозяин стихии', lastRun('clan'), (u, sd) => !sd ? 'hero' : u.lead ? 'host' : 'o');
    }
  }
}

/* Арена и Лига: герои против героев — рамка героя с обеих сторон */
for (const name of ['Арена · атака и итог', 'Лига · итог матча']) {   // Лига: сценарий начинает матч и пропускает к итогу — бой на арене тот же
  fresh();
  const f = T.FLOWS.find(y => y[0] === name);
  if (!f) { fail(`нет сценария «${name}»`); continue; }
  run(name, () => f[2]());
  const R = lastRun('pvp');
  checkBattle(name.split(' · ')[0] + ' · ' + name.split(' · ')[1], R, () => 'hero');
}
for (const t of TYPES) if (!cnt.seen.has(t)) fail(`рамка «${t}» ни разу не встала в бою`);

/* ================== 7. раскладка расчётом по CSS ================== */
{
  const bt = rule('.bt'), sm = (css.match(/@container main \(max-height: 360px\)\{\s*\.bt\{([^}]*)\}/) || [])[1] || '';
  const val = (r, v) => { const m = r.match(new RegExp(v + ':(\\d+)px')); return m ? +m[1] : NaN; };
  const size = { lg: { rowh: val(bt, '--rowh'), fh: val(bt, '--fh') }, sm: { rowh: val(sm, '--rowh'), fh: val(sm, '--fh') } };
  const gap = px('.bc', 'gap'), nm = +((rule('.bc .nm').match(/font:\s*\d+\s+(\d+)px\/1\b/) || [])[1]), bar = px('.bc .bar', 'height'), rot = px('.rot', 'height');
  const plain = gap + nm + gap + bar + gap + rot;   // карта без рамки: кадр + это
  const fr = rule('.bc.fr .face'), free = +((fr.match(/var\(--fh\) \+ (\d+)px/) || [])[1]), lo = +((rule('.bc.fr').match(/max\((\d+)px/) || [])[1]);
  const barUp = -px('.bc.fr>.bar', 'margin-top');   // полоса поднята на нижнюю планку
  if ([size.lg.rowh, size.lg.fh, size.sm.rowh, size.sm.fh, gap, nm, bar, rot, free, lo, barUp].some(v => !Number.isFinite(v))) fail('CSS: не прочитаны размеры карты — правила переименованы?');
  else {
    // с рамкой: верх T, кадр F, max(lo, B), зазор, шансы. Кадр F = fh + free − T − max(lo, B): высота карты должна быть прежней
    if (free + gap + rot !== plain) fail(`CSS: кадр с рамкой выше прежнего на ${free} px, а имя и полоса занимали ${plain - gap - rot} px — высота карты разная`);
    if (barUp - gap !== 1 || lo !== bar - 1) fail(`CSS: полоса здоровья заходит на портрет не на 1 px (подъём ${barUp}, низ ${lo})`);
    for (const t of TYPES) {
      const X = BF.types[t], [wt, wr, wb, wl] = X.win;
      for (const [lead, cw] of [[false, 74], [true, 84]]) for (const [label, k] of SIZES) {
        const fh = lead ? size[k].rowh - 30 : size[k].fh, W = cw * 1000 / (1000 - wl - wr), Tp = W * X.ar * wt / 1e6, Bp = W * X.ar * wb / 1e6;
        const F = fh + free - Tp - Math.max(lo, Bp), where = `раскладка · ${t} · ${lead ? 'главная' : 'карта'} · ${label}`;
        if (F < PORTRAIT_MIN) fail(`${where}: кадр портрета ${F.toFixed(1)} px, меньше ${PORTRAIT_MIN}`);
        if (W > cw * WIDE) fail(`${where}: рамка ${W.toFixed(0)} px шире карты ${cw} больше чем в ${WIDE} раза`);
        const cut = W * X.ar * (X.cut[0] + X.cut[2]) / 1e6;
        if (cut > Tp + F + Bp) fail(`${where}: углы нарезки (${cut.toFixed(1)} px) выше рамки (${(Tp + F + Bp).toFixed(1)} px)`);
        if (X.mark && (X.mark[0] < wl || X.mark[0] > 1000 - wr || X.mark[1] * 1000 > 1000 * wt + 200)) fail(`${where}: гнездо метки не на верхней планке`);
      }
    }
  }
}

/* ================== 8. UI-кит ================== */
{
  const kit = T.KIT_EXTRA.find(x => { try { return String(x.html()).includes('Карты боя'); } catch (_) { return false; } });
  if (!kit) fail('UI-кит: нет раздела «Карты боя»');
  else {
    const h = scan('UI-кит', run('UI-кит', () => kit.html()) || '');
    for (const t of TYPES) if (!h.includes(` data-bf="${t}"`)) fail(`UI-кит: нет рамки «${t}»`);
    const ready = BF.ready; BF.ready = [];
    try { const g = scan('UI-кит без выгрузки', run('UI-кит без выгрузки', () => kit.html()) || ''); if (/data-bf=|class="bf"/.test(g)) fail('UI-кит: без выгрузки остались рамки'); if (!g.includes('без рамки карту рисует CSS')) fail('UI-кит: без выгрузки не сказано, что карту рисует CSS'); }
    finally { BF.ready = ready; }
  }
}

/* ================== 9. вид карт: переключатель на три вида, сценарии, легенда ================== */
{
  const BV = T.BF_VIEW;
  if (Object.keys(BV.names).sort().join() !== VIEWS.slice().sort().join()) fail(`вид карт: виды ${Object.keys(BV.names).join(', ')}, ждали ${VIEWS.join(', ')}`);
  delete store[BV.key]; T.S = T.initialState();
  if (BV.def !== VIEW_DEF || T.S.bfv !== VIEW_DEF || T.bfView() !== VIEW_DEF) fail(`вид карт: по умолчанию «${T.S.bfv}», ждали «${VIEW_DEF}» — слово автора «сойтись на квадратах»`);
  store[BV.key] = 'square';
  for (const v of VIEWS) {
    run('вид карт · ' + v, () => T.bfView(v));
    if (store[BV.key] !== v || T.S.bfv !== v) fail(`вид карт: выбор «${v}» не запомнен`);
    if (run('вид карт · новое состояние', () => T.initialState().bfv) !== v) fail(`вид карт: новое состояние не берёт запомненный «${v}»`);
  }
  store[BV.key] = 'что-то'; if (run('вид карт · чужое значение', () => T.initialState().bfv) !== VIEW_DEF) fail('вид карт: незнакомое значение в браузере — не вид по умолчанию');
  const cls = { square: 'bt sv', portrait: 'bt pv', old: 'bt' };
  for (const v of VIEWS) {
    fresh();
    const n = VIEW_FLOWS[v], fl = T.FLOWS.find(x => x[0] === n);
    if (!fl) { fail(`нет сценария «${n}»`); continue; }
    run(`сценарий «${n}»`, () => fl[2]());
    const R = T.S.runs.find(r => r.id === T.S.focus && !r.over);
    if (T.S.bfv !== v || !R || !R.b || T.S.route !== 'battle') { fail(`сценарий «${n}»: бой в виде «${v}» не открылся`); continue; }
    const h = draw(`сценарий «${n}»`);
    if (!h.includes(`<div class="${cls[v]}" id="bt">`) || cardsOf(h).length !== 10 || !R.b.u[1][0].lead) fail(`сценарий «${n}»: не пять на пять с главным врагом в виде «${v}»`);
    if (v !== 'square') continue;
    T.S.legend = true;
    const g = draw('легенда «Знаки» · команда'), row = g.match(/<span class="h team-only">Вид карт<\/span><span class="ex team-only bf-vw">([\s\S]*?)<\/span>/);
    if (!row || VIEWS.some(k => !row[1].includes(`data-a="bfview" data-v="${k}" aria-pressed="${k === 'square'}"`))) fail('легенда «Знаки»: нет переключателя на три вида команде');
    T.setTeam(false);
    if (/Вид карт|Прежний —|Квадрат —/.test(playerText(draw('легенда «Знаки» · игрок')))) fail('легенда «Знаки»: игрок видит переключатель вида карт');
    T.setTeam(true);
    run('легенда «Знаки» · «Прежний»', () => T.ACT.bfview('old'));
    if (T.S.bfv !== 'old' || /<div class="bt (?:pv|sv)"/.test(els.game.innerHTML) || !/class="bc [^"]*\bfr"/.test(els.game.innerHTML)) fail('легенда «Знаки»: кнопка «Прежний» не вернула прежний вид');
  }
  T.S.bfv = 'old'; store[BV.key] = 'old'; T.S.legend = false;
}

/* ================== 11. данные и рамки-портреты, лестница опасности ================== */
const cssB = read('screens/battle-cards.css');
const rules = [...cssB.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].split(',').map(x => x.trim()), body: m[2] }));
const hasRule = (sel, re) => rules.some(r => r.sel.includes(sel) && re.test(r.body));
{
  const BV = T.BF_VIEW, SP = T.BF_SPRITE;
  for (const [name, set] of [['slot', BV.slot], ['lead', BV.lead]]) for (let n = 1; n <= 5; n++) {
    const L = set[n];
    if (!L || L.length !== n) { fail(`BF_VIEW.${name}[${n}]: мест не ${n}`); continue; }
    if (new Set(L.map(p => p.join())).size !== n) fail(`BF_VIEW.${name}[${n}]: два места совпадают`);
    if (L.some(([x, y]) => !(x >= 0 && x <= 2) || ![0, .5, 1].includes(y))) fail(`BF_VIEW.${name}[${n}]: место вне трёх колонок и двух рядов`);
    if (name === 'lead' && L[0].join() !== '2,0.5') fail(`BF_VIEW.lead[${n}]: главный враг не у края к героям и не по центру высоты`);
  }
  for (const t of TYPES) {
    const w = BV.crest[t];
    if (!Number.isInteger(w) || w < 8 || w > 48) fail(`рамка-портрет ${t}: ширина украшения ${w}`);
    if (!SP.includes(`<symbol id="bfp-${t}" viewBox="0 0 ${w} 14">`)) fail(`рамка-портрет ${t}: в BF_SPRITE нет украшения bfp-${t} шириной ${w}`);
    if (BV.corner.includes(t) !== SP.includes(`<symbol id="bfk-${t}" viewBox="0 0 10 9">`)) fail(`рамка-портрет ${t}: угловое украшение bfk-${t} не по BF_VIEW.corner`);
    if (!hasRule(`[data-pf="${t}"]`, /--f1:#[0-9a-f]{6};--f2:#[0-9a-f]{6}/)) fail(`рамка-портрет ${t}: в CSS нет цветов металла --f1 и --f2`);
  }
  if (BV.corner.some(t => !TYPES.includes(t))) fail('BF_VIEW.corner: тип вне набора');
  const used = new Set([...SP.matchAll(/url\(#([\w-]+)\)/g)].map(m => m[1])), def = new Set([...SP.matchAll(/<(?:linear|radial)Gradient id="([\w-]+)"/g)].map(m => m[1]));
  for (const g of used) if (!def.has(g)) fail(`BF_SPRITE: градиент ${g} не определён`);
  /* лестница: вес рамки — уголки, свет, кромки (каждая — тёмный зазор и светлая линия), дыхание; при равном весе — сила света */
  const fx = t => { const r = rules.find(x => x.sel.includes(`[data-pf="${t}"]`) && /--fx:/.test(x.body)); return r ? r.body.split('--fx:')[1].split(/;(?![^(]*\))/)[0] : ''; };
  const shadows = t => fx(t).split(/,(?![^(]*\))/).map(x => x.trim()).filter(Boolean).map(x => x.split(/\s+/).filter(v => /^-?[\d.]+(px)?$/.test(v)).map(parseFloat));
  const weight = t => {
    const sh = shadows(t), blur = Math.max(0, ...sh.map(v => v[2] || 0));
    const rings = Math.floor(sh.filter(v => !v[0] && !v[1] && !v[2] && v[3] >= 2).length / 2), breath = hasRule(`[data-pf="${t}"] .pf::after`, /animation:pfBreath/);
    const brackets = hasRule(`[data-pf="${t}"] .pf::before`, /opacity:1/);
    return [(BV.corner.includes(t) ? 1 : 0) + (brackets ? 1 : 0) + (blur ? 1 : 0) + rings + (breath ? 1 : 0), blur];
  };
  const cmp = (a, b) => a[0] - b[0] || a[1] - b[1];
  for (let i = 1; i < TIERS.length; i++) {
    const lo = TIERS[i - 1].map(weight).sort(cmp).pop(), hi = TIERS[i].map(weight).sort(cmp)[0];
    if (!(cmp(hi, lo) > 0)) fail(`лестница опасности: ${TIERS[i].join(', ')} (${hi}) не тяжелее ${TIERS[i - 1].join(', ')} (${lo})`);
  }
  if (weight('o')[0] !== 0) fail('рамка-портрет рядового: украшена — рядовой должен быть голым железом');
  /* лестница рамок — лестница типов ядра: ступени TIERS идут в порядке RULES.ladder, рамка ранга стоит на своей ступени */
  { const LAD = T.EB.RULES.ladder;
    if (LAD.join() !== TIER_RANK.join()) fail(`лестница опасности: ступени проверки ${TIER_RANK.join(' < ')}, а лестница типов ядра RULES.ladder — ${LAD.join(' < ')}`);
    LAD.forEach((r, i) => { const fr = T.BF.rank[r]; if (!TIERS[i] || !TIERS[i].includes(fr)) fail(`лестница опасности: рамка «${fr}» ранга ${r} стоит не на ступени ${i + 1}`); }); }
  /* прежний вид: рамки-картинки 30.09 рисовались под лестницу с Хозяином стихии на вершине — она и действует; костыля-света у рамок нет */
  if (/\.bc\.fr\[data-bf="[\w-]+"\] \.face>\.bf\{filter:/.test(cssB)) fail('прежний вид: у рамки-картинки остался свет по контуру — костыль лестницы 01.10.2026');
  /* анимации — только opacity и transform; «меньше движения» — свет ровный */
  for (const m of cssB.matchAll(/@keyframes ([\w-]+)\{((?:[^{}]*\{[^{}]*\})*)\}/g)) {
    const props = [...m[2].matchAll(/([\w-]+)\s*:/g)].map(x => x[1]);
    if (props.some(p => !['opacity', 'transform'].includes(p))) fail(`battle-cards.css: анимация ${m[1]} двигает не только opacity и transform — ${props.join(', ')}`);
  }
  if (!/@media \(prefers-reduced-motion:reduce\)\{\s*\[data-pf\] \.pf::after\{animation:none\}\s*\}/.test(cssB)) fail('battle-cards.css: при «меньше движения» свет рамки дышит');
}

/* ================== 12. раскладка вида «портрет» расчётом по CSS ================== */
{
  const num = (re, what) => { const m = cssB.match(re); if (!m) fail(`CSS вида «портрет»: не прочитано — ${what}; правило переименовано?`); return m ? m.slice(1).map(Number) : null; };
  const pv = num(/\.bt\.pv\{--pw0:(\d+)px;--pcol:calc\(var\(--pw0\) \+ (\d+)px\)\}/, 'ширина портрета и шаг карты');
  const pvs = num(/@container main \(max-height: 360px\)\{ \.bt\.pv\{--pw0:(\d+)px\} \}/, 'ширина портрета на 844 × 390');
  const card = num(/\.bc\.pt\{--pw:var\(--pw0,\d+px\);--pfw:(\d+)px;--pcr:(\d+)px;--pk:1;--ph:calc\(var\(--pw\) \* (\d+) \/ (\d+)\);[^}]*--pch:calc\(var\(--ph\) \+ var\(--pcr\) \+ 2 \* var\(--pfw\) \+ (\d+)px\)/, 'карта-портрет');
  const lead = num(/\.bc\.pt\.lead\{--pk:([\d.]+);--pw:calc\(var\(--pw0,\d+px\) \* var\(--pk\)\);--pfw:(\d+)px;--pcr:(\d+)px\}/, 'главная карта');
  const q = num(/\.bt\.pv \.bt-queue\{left:calc\(([\d.]+) \* var\(--pcol\) \+ var\(--pw0\) \+ (\d+)px\);right:calc\(\1 \* var\(--pcol\) \+ var\(--pw0\) \+ \2px\)\}/, 'место очереди раунда');
  const fd = num(/\.bt\.pv \.bt-feed\{left:calc\(([\d.]+) \* var\(--pcol\) \+ var\(--pw0\) \+ (\d+)px\);right:calc\(\1 \* var\(--pcol\) \+ var\(--pw0\) \+ \2px\)\}/, 'место ленты');
  const lines = /\.bt\.pv \.bt-feed p:nth-last-child\(n\+3\)\{display:none\}/.test(cssB) ? 2 : 4;
  const fit = rule('.bc.pt .face>img'), effects = rule('.bc.pt .face>.buffs,.bc.pt .face>.debuffs'), ctl = rule('.bc.pt .ctl'), fell = rule('.bc.pt .fell');
  if (!/object-fit:contain/.test(fit) || !/height:100%/.test(fit)) fail('CSS вида «портрет»: картинка не вписана в кадр целиком (object-fit: contain)');
  if (!/flex-direction:column/.test(effects)) fail('CSS вида «портрет»: эффекты не столбиком по краям портрета');
  const ctlPad = +((ctl.match(/padding-bottom:calc\(var\(--ph\) \* ([\d.]+)\)/) || [])[1]), fellBot = +((fell.match(/bottom:(\d+)%/) || [])[1]);
  /* index.html: поле боя, отступ отрядов, лента, очередь, знаки на портрете */
  const fld = rule('.bt-field'), ftop = +((fld.match(/top:(\d+)px/) || [])[1]), fbot = +((fld.match(/bottom:(\d+)px/) || [])[1]);
  const sideL = px('.bt-side.h', 'left'), sideR = px('.bt-side.f', 'right');
  const feedP = rule('.bt-feed p'), fz = +((feedP.match(/font-size:([\d.]+)px/) || [])[1]), lh = +((feedP.match(/line-height:([\d.]+)/) || [])[1]), fpad = +((feedP.match(/padding:(\d+)px/) || [])[1]);
  const feedGap = px('.bt-feed', 'gap'), feedBot = px('.bt-feed', 'bottom'), qTop = px('.bt-queue', 'top'), qGap = px('.bt-queue', 'gap'), qi = px('.bt-queue i', 'width');
  const eff = rule('.bc .buffs,.bc .debuffs'), effTop = +((eff.match(/top:(\d+)px/) || [])[1]), effGap = +((eff.match(/gap:(\d+)px/) || [])[1]), effIn = px('.bc .buffs', 'left'), si = px('.si', 'width');
  const clsR = rule('.bc .cls'), clsB = +((clsR.match(/bottom:(\d+)px/) || [])[1]), clsI = px('.bc .cls .ico', 'width'), tgtB = px('.bc .tgt', 'bottom'), tgtH = px('.bc .tgt', 'height');
  const mkD = +((rule('.bc.pt>.bf-mk').match(/--d:(\d+)px/) || [])[1]), ctlI = px('.bc .ctl .i', 'width'), fellR = rule('.bc .fell'), fellH = +((fellR.match(/font:\s*\d+\s+(\d+)px\/1\b/) || [])[1]) + 2 * +((fellR.match(/padding:(\d+)px/) || [])[1]);
  const vals = [pv && pv[0], pv && pv[1], pvs && pvs[0], card && card[0], lead && lead[0], q && q[0], fd && fd[0], ftop, fbot, sideL, sideR, fz, lh, fpad, feedGap, feedBot, qTop, qGap, qi, effTop, effGap, effIn, si, clsB, clsI, tgtB, tgtH, ctlI, fellH, ctlPad, fellBot, mkD];
  if (!pv || !pvs || !card || !lead || !q || !fd || vals.some(v => !Number.isFinite(v))) fail('CSS вида «портрет»: не прочитаны размеры — правила переименованы?');
  else {
    const [pfw, pcr, arH, arW, info] = card, [lk, lpfw, lpcr] = lead, gapc = pv[1], pw0 = { lg: pv[0], sm: pvs[0] };
    if (arH !== PORTRAIT[1] || arW !== PORTRAIT[0]) fail(`CSS вида «портрет»: кадр ${arW} : ${arH}, а портрет ${PORTRAIT[0]} : ${PORTRAIT[1]}`);
    /* под портретом: планка, 1, здоровье, 2, имя, 2, шансы — столько же, сколько в --pch */
    const under = 1 + px('.bc.pt>.bar', 'height') + 2 + +((rule('.bc .nm').match(/font:\s*\d+\s+(\d+)px\/1\b/) || [])[1]) + 2 + px('.rot', 'height');
    if (under !== info) fail(`CSS вида «портрет»: под рамкой ${under} px, а в --pch заложено ${info}`);
    const box = (sz, ld) => { const k = ld ? lk : 1, pw = pw0[sz] * k, ph = pw * PORTRAIT[1] / PORTRAIT[0], fw = ld ? lpfw : pfw, cr = ld ? lpcr : pcr; return { k, pw, ph, w: pw + 2 * fw, h: ph + cr + 2 * fw + info, fw, cr }; };
    const said = [];
    for (const [label, sz] of SIZES) {
      const fr = T.SHELL_SIZE.frames.find(x => String(x[0]) === label.split(' ')[0]);
      if (!fr) { fail(`SHELL_SIZE: нет экрана ${label}`); continue; }
      const W = fr[0] - fr[3], H = fr[1] - fr[2] - ftop - fbot, pcol = pw0[sz] + gapc;
      const B = box(sz, false), BL = box(sz, true);
      said.push(`${label}: портрет ${Math.round(B.pw)} × ${Math.round(B.ph)}, главный ${Math.round(BL.pw)} × ${Math.round(BL.ph)}, поле ${W} × ${H}`);
      /* украшение — в полосе над рамкой: 6 px на обычной, × --pk у главной; карты — с выступом углов и кромки 3 px */
      for (const X of [B, BL]) if (6 * X.k > X.cr + 0.5) fail(`раскладка ${label}: украшение выше полосы над рамкой (${6 * X.k} > ${X.cr})`);
      const rects = (n, ld, foe) => ((ld ? T.BF_VIEW.lead : T.BF_VIEW.slot)[n] || []).map(([x, y], i) => {
        const C = ld && !i ? BL : B, from = (foe ? sideR : sideL) + x * pcol, x0 = foe ? W - from - C.w : from, y0 = y * (H - C.h);
        return { x0: x0 - 3, x1: x0 + C.w + 3, y0, y1: y0 + C.h, C };
      });
      const cross = (a, b) => a.x0 < b.x1 - 0.01 && b.x0 < a.x1 - 0.01 && a.y0 < b.y1 - 0.01 && b.y0 < a.y1 - 0.01;
      const qL = q[0] * pcol + pw0[sz] + q[1], fL = fd[0] * pcol + pw0[sz] + fd[1];
      const qZone = { x0: qL, x1: W - qL, y0: 0, y1: qTop + qi + 2 }, fH = feedBot + lines * (fz * lh + 2 * fpad) + (lines - 1) * feedGap, fZone = { x0: fL, x1: W - fL, y0: H - fH, y1: H };
      if (qZone.x1 - qZone.x0 < QUEUE_N * qi + (QUEUE_N - 1) * qGap) fail(`раскладка ${label}: очередь раунда ${QUEUE_N} значков не помещается между отрядами (${Math.round(qZone.x1 - qZone.x0)} px)`);
      if (fZone.x1 - fZone.x0 < FEED_MIN) fail(`раскладка ${label}: лента уже ${FEED_MIN} px — ${Math.round(fZone.x1 - fZone.x0)}`);
      for (let n = 1; n <= 5; n++) for (const [ld, foe] of [[false, false], [false, true], [true, true]]) {
        const R = rects(n, ld, foe), where = `раскладка ${label} · ${foe ? 'враги' : 'герои'} · ${n}${ld ? ' с главным' : ''}`;
        cntP.layouts++;
        for (const r of R) {
          if (r.x0 + 3 < -0.01 || r.x1 - 3 > W + 0.01 || r.y0 < -0.01 || r.y1 > H + 0.01) fail(`${where}: карта вне поля (${Math.round(r.x0 + 3)}…${Math.round(r.x1 - 3)} × ${Math.round(r.y0)}…${Math.round(r.y1)}, поле ${W} × ${H})`);
          if (cross(r, qZone)) fail(`${where}: карта лежит на очереди раунда`);
          if (cross(r, fZone)) fail(`${where}: карта лежит на ленте`);
        }
        R.forEach((a, i) => R.forEach((b, j) => { if (i < j && cross(a, b)) fail(`${where}: карты ${i} и ${j} наезжают друг на друга`); }));
        if (foe) for (let m = 1; m <= 5; m++) { const Hs = rects(m, false, false); if (Hs.some(a => R.some(b => cross(a, b)))) fail(`${where}: наезжает на героев (${m})`); }
      }
      /* зона лица: эффекты, класс, «×N», контроль, «пал», украшение и кристалл — мимо */
      for (const [nm, X] of [['обычная', B], ['главная', BL]]) {
        const fx0 = X.pw * FACE.x[0] / 1000, fy0 = X.ph * FACE.y[0] / 1000, fy1 = X.ph * FACE.y[1] / 1000, where = `зона лица ${label} · ${nm}`;
        if (effIn + si > fx0 + 0.01) fail(`${where}: столбик эффектов заходит на лицо (${effIn + si} > ${fx0.toFixed(1)} px)`);
        if (effTop + EFFECTS_COL * si + (EFFECTS_COL - 1) * effGap > X.ph - Math.max(clsB + clsI, tgtB + tgtH) + 0.01) fail(`${where}: ${EFFECTS_COL} эффекта в столбике достают до нижних углов`);
        if (X.ph * (1 - ctlPad) - ctlI < fy1 - 0.01) fail(`${where}: знак контроля на лице`);
        if (X.ph * (1 - fellBot / 100) - fellH < fy1 - 0.01) fail(`${where}: «пал» на лице`);
        if (X.ph - Math.max(clsB + clsI, tgtB + tgtH) < fy1 - 0.01) fail(`${where}: класс или «×N» на лице`);
        if ((14 - 6) * X.k - X.fw > fy0 + 0.01) fail(`${where}: украшение ранга заходит на лицо`);   // рисунок высотой 14 × k: над рамкой 6 × k, ниже — планка и край портрета
        if (nm === 'обычная' && mkD / 2 - X.fw / 2 > fy0 + 0.01) fail(`${where}: кристалл героя заходит на лицо`);
      }
    }
    cntP.size = said.join('; ');
  }
  /* все портреты боя — в пропорции кадра */
  for (const d of ART_DIRS) {
    const dir = path.join(UI, 'assets', 'art', d);
    for (const file of fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => /\.(jpe?g|png)$/i.test(x)) : []) { cntP.files++; portraitFile(`портрет ${d}/${file}`, `assets/art/${d}/${file}`); }
  }
  if (!cntP.files) fail('портреты боя: в assets/art нет ни одного');
}

/* ================== 13. UI-кит: вид карт — три вида рядом ================== */
{
  const kit = T.KIT_EXTRA.find(x => { try { return String(x.html()).includes('Карты боя · вид'); } catch (_) { return false; } });
  if (!kit) fail('UI-кит: нет раздела «Карты боя · вид: прежний, портрет и квадрат»');
  else {
    const h = scan('UI-кит · вид', run('UI-кит · вид', () => kit.html()) || '');
    const n = re => (h.match(re) || []).length, old = n(/<div class="bt bf-stg">/g), por = n(/<div class="bt pv bf-stg">/g), sqr = n(/<div class="bt sv bf-stg">/g);
    if (old !== 2 || por !== 2 || sqr !== 2) fail(`UI-кит · вид: сцен прежнего вида ${old}, портрета ${por}, квадрата ${sqr} — ждали по две (932 × 430 и 844 × 390)`);
    const stages = h.split('<div class="bf-sco"').slice(1).map(x => x.split('<span class="bf-stl">')[0]);
    for (const st of stages) {
      const v = st.includes('class="bt pv bf-stg"') ? 'pt' : st.includes('class="bt sv bf-stg"') ? 'sq' : 'fr', cards = (st.match(/<div class="bc /g) || []).length;
      if (cards !== 10) fail(`UI-кит · вид: в сцене ${v} карт ${cards}, не пять на пять`);
      if (v === 'fr' ? /data-pf=/.test(st) : !new RegExp(`class="bc [^"]*\\b${v}(?: sfa)?"`).test(st) || /data-bf=/.test(st)) fail('UI-кит · вид: в сцене карты чужого вида');
      if (/ id="bc\d/.test(st)) fail('UI-кит · вид: у карт сцены id боя — совпадут с картами прототипа');
    }
    for (const v of ['sq', 'pt']) {
      for (const t of TYPES) if (!new RegExp(`class="bc [^"]*\\b${v}(?: sfa)?" data-pf="${t}"`).test(h)) fail(`UI-кит · вид: нет рамки «${t}» вида ${v}`);
      for (const st of ['aimed many', 'ctl-on', 'shielded', 'unk', 'dead', 'sel']) if (!new RegExp(`class="bc [^"]*${st}[^"]*\\b${v}(?: sfa)?"`).test(h)) fail(`UI-кит · вид: нет состояния «${st}» вида ${v}`);
    }
    const faces = n(/<span class="bf-fc" style="--fy:\d+">/g);
    if (faces !== 2 * T.BF_KIT.faces) fail(`UI-кит · срез портретов: лиц ${faces}, ждали ${2 * T.BF_KIT.faces}`);
  }
}

/* ================== 15. данные квадрата: лицо каждого портрета, имена, числа вида ================== */
{
  const Q = T.BF_SQ, FD = T.BF_FACES, P0 = SQG.P;
  /* числа вида — те же, что в CSS */
  if (Q.size.lg !== P0.lg || Q.size.sm !== P0.sm) fail(`BF_SQ.size ${Q.size.lg} / ${Q.size.sm} — не как в CSS ${P0.lg} / ${P0.sm}`);
  if (Q.lead !== Math.round(SQG.lead * 100)) fail(`BF_SQ.lead ${Q.lead} — не как в CSS ${SQG.lead}`);
  if (Q.font.lg[0] !== SQG.sfs.lg || Q.font.sm[0] !== SQG.sfs.sm) fail('BF_SQ.font — обычный кегль имени не как в CSS');
  for (const sz of ['lg', 'sm']) if (!Q.font[sz].every((v, i, a) => Number.isInteger(v) && (!i || v < a[i - 1])) || Q.font[sz][Q.font[sz].length - 1] < NAME_MIN) fail(`BF_SQ.font.${sz}: кегли не по убыванию или мельче ${NAME_MIN} px`);
  if (Q.pad !== SQG.nmPad || Q.pad + Q.chip.room !== SQG.rotR) fail(`BF_SQ.pad и chip.room (${Q.pad} + ${Q.chip.room}) — не поля имени и шансов из CSS (${SQG.nmPad}, ${SQG.rotR})`);
  if (Q.img.join() !== PORTRAIT.join()) fail('BF_SQ.img — не портрет боя');
  if (!(Q.head > 0 && Q.chin > Q.head && Q.chin < 1000)) fail('BF_SQ.head и BF_SQ.chin — не доли стороны квадрата');
  if (Q.chip.w !== SQG.chipW || Q.chip.gap !== SQG.rotGap || Q.pad !== SQG.rotL) fail(`BF_SQ.chip ${Q.chip.w} / ${Q.chip.gap} и поле ${Q.pad} — не как в CSS: шанс ${SQG.chipW}, зазор ${SQG.rotGap}, поле ${SQG.rotL}`);
  for (const [label, sz] of SIZES) { const P = SQG.P[sz], top = P - sqBand(sz, 2, 1); if (Q.chin * P / 1000 > top - 1 + 0.01) fail(`BF_SQ.chin ${Q.chin} ‰: на ${label} подбородок по правилу (${(Q.chin * P / 1000).toFixed(1)} px) ниже полосы с именем в две строки (${top} px)`); }
  if (!(Q.tight < 0 && Q.tight >= -TIGHT_MAX)) fail(`BF_SQ.tight ${Q.tight} — теснее ${TIGHT_MAX / 100} px или не теснее`);
  if (!/letter-spacing:var\(--sls\)/.test(rule('.bc.sq>.nm')) || !/--sls:calc\(var\(--ntl,0\) \* \.01px\)/.test(read('screens/battle-cards.css'))) fail('CSS квадрата: межбуквенный имени не из --ntl и --nts');
  /* лица: запись у каждого портрета боя, ни одной лишней, числа целые и в портрете */
  const files = new Set();
  for (const d of ART_DIRS) { const dir = path.join(UI, 'assets', 'art', d); for (const x of fs.existsSync(dir) ? fs.readdirSync(dir).filter(y => /\.(jpe?g|png)$/i.test(y)) : []) files.add(d + '/' + x.replace(/\.\w+$/, '')); }
  for (const id of files) if (!(FD[id.split('/')[0]] || {})[id.split('/')[1]]) fail(`BF_FACES: нет лица портрета ${id}`);
  for (const [d, map] of Object.entries(FD)) for (const [k, F] of Object.entries(map)) {
    const id = d + '/' + k; cntS.faces++;
    if (!files.has(id)) fail(`BF_FACES: лицо ${id}, а портрета нет`);
    if (!Array.isArray(F) || F.length !== 3 || F.some(v => !Number.isInteger(v)) || !(F[0] >= 0 && F[0] < F[1] && F[1] <= 1000 && F[2] >= 0 && F[2] <= 1000)) { fail(`BF_FACES ${id}: не [макушка < подбородок, середина] в тысячных — ${F}`); continue; }
    /* лицо в квадрате: герой — обычная карта; враг — и главная */
    for (const lead of d === 'heroes' ? [false] : [false, true]) for (const [label, sz] of SIZES) {
      const P = P0[sz] * (lead ? SQG.lead : 1), g = sqFace(F, P, Q), where = `лицо ${id} · ${label}${lead ? ' · главный' : ''}`;
      if (g.top < -0.5 || g.chin > P + 0.5) fail(`${where}: лицо не целиком в квадрате (${g.top.toFixed(1)}…${g.chin.toFixed(1)} из ${P})`);
      if (FACE_BIG.includes(id)) continue;
      const band = sqBand(sz, 1, 1), k = lead ? SQG.lead : 1, crest = 8 * k - SQG.pfw;   // украшение: рисунок 14 × k, над рамкой 6 × k, планка — дальше в портрет
      if (g.chin > P - band - 1 + TOL) fail(`${where}: подбородок (${g.chin.toFixed(1)} px) под полосой сведений (${(P - band).toFixed(1)} px)`);
      if (g.top < crest - TOL) fail(`${where}: макушка (${g.top.toFixed(1)} px) под украшением ранга (${crest.toFixed(1)} px)`);
      const col = 3 + SQ_EFF * SQG.si + (SQ_EFF - 1) * SQG.siGap, tx = SQ_TGT[0] - SQG.pfw - SQG.tgtOff, ty = SQ_TGT[1] - SQG.pfw - SQG.tgtOff;
      if (!FACE_EDGE.includes(id) && g.top < col && (g.l < 3 + SQG.si - TOL || g.r > P - 3 - SQG.si + TOL)) fail(`${where}: лицо (${g.l.toFixed(1)}…${g.r.toFixed(1)} px) заходит под столбцы эффектов`);
      if (!FACE_EDGE.includes(id) && g.top < ty && g.l < tx - TOL) fail(`${where}: «×N» на углу ложится на лицо (${g.l.toFixed(1)} < ${tx} px)`);
    }
  }
  for (const id of FACE_BIG.concat(FACE_EDGE)) if (!files.has(id)) fail(`исключение ${id}: портрета нет — убрать из проверки`);
  /* имена: любое — целиком, не больше двух строк на обоих экранах и у главного; перенос — по словам; слово не шире строки */
  const names = new Set(['Не изучен']);
  for (const h of T.S.heroes || []) names.add(h.name);
  for (const h of (T.RS && T.RS.heroes) || []) names.add(h.n);
  for (const x of T.foes || []) names.add(x.name);
  const EF = vm.runInContext('window.EN_ECHO_FOES', ctx); for (const x of Object.values((EF && EF.foes) || {})) names.add(x.name);
  for (const nm of names) {
    if (!nm) continue; cntS.names++;
    for (const [label, sz] of SIZES) for (const lead of [false, true]) {
      const room = (P0[sz] * (lead ? Q.lead : 100)) - (2 * Q.pad + 2) * 100, fs = Q.font[sz], f = fs[fs.length - 1];
      if (T.bfWrap(nm, f, room, Q.tight) > Q.rows) fail(`имя «${nm}» на ${label}${lead ? ' у главного' : ''} не встаёт в ${Q.rows} строки даже кеглем ${f} теснее`);
      for (const w of nm.split(/\s+/).flatMap(x => x.split(/(?<=-)/))) if (T.bfTextW(w) * f / 10 + Q.tight * [...w].length > room) fail(`имя «${nm}» на ${label}: «${w}» шире строки`);
      const r = T.bfName(nm, sz, lead), want = nameFit(nm, sz, lead, Q);
      if (r.f !== want.f || r.n !== want.n || r.t !== want.t) fail(`имя «${nm}» на ${label}${lead ? ' у главного' : ''}: bfName — ${r.n} стр. кеглем ${r.f} (${r.t}), по расчёту ${want.n} стр. кеглем ${want.f} (${want.t})`);
      if (sz === 'sm' && !lead && r.n > 1) cntS.two++;
      if (r.f !== fs[0]) cntS.small = (cntS.small || 0) + 1;
      if (r.t) (cntS.tight = cntS.tight || new Set()).add(nm);
    }
  }
}

/* ================== 16. раскладка квадрата расчётом по CSS ================== */
{
  const fld = rule('.bt-field'), ftop = +((fld.match(/top:(\d+)px/) || [])[1]), fbot = +((fld.match(/bottom:(\d+)px/) || [])[1]);
  const bt = rule('.bt'), sm = (css.match(/@container main \(max-height: 360px\)\{\s*\.bt\{([^}]*)\}/) || [])[1] || '';
  const colw = { lg: +((bt.match(/--colw:(\d+)px/) || [])[1]), sm: +((sm.match(/--colw:(\d+)px/) || [])[1]) };
  const sideL = px('.bt-side.h', 'left'), mid = +((rule('.bt-feed').match(/left:calc\(var\(--colw\) \+ (\d+)px\)/) || [])[1]);
  if ([ftop, fbot, colw.lg, colw.sm, sideL, mid, SQG.pfw, SQG.pcr, SQG.shp, SQG.si, SQG.tgtOff, SQG.manyTop].some(v => !Number.isFinite(v))) fail('CSS квадрата: не прочитаны размеры поля и колонок');
  else {
    const said = [];
    for (const [label, sz] of SIZES) {
      const fr = T.SHELL_SIZE.frames.find(x => String(x[0]) === label.split(' ')[0]);
      if (!fr) { fail(`SHELL_SIZE: нет экрана ${label}`); continue; }
      const H = fr[1] - fr[2] - ftop - fbot, cw = colw[sz];
      const card = lead => { const k = lead ? SQG.lead : 1, P = SQG.P[sz] * k; return { P, w: P + 2 * SQG.pfw, h: SQG.pcr * k + SQG.pfw + P + SQG.shp }; };
      const C = card(false), L = card(true);
      said.push(`${label}: карта ${C.w} × ${C.h}, портрет ${C.P}; главный ${Math.round(L.P * 10) / 10}; поле ${H}`);
      for (let n = 1; n <= 5; n++) for (const lead of [false, true]) {
        const where = `раскладка квадрата ${label} · ${n}${lead ? ' с главным' : ''}`;
        cntS.layouts++;
        const R = (T.SLOT[n] || []).map(([k, r], i) => { const X = lead && !i ? L : C, y0 = r / 2 * (H - X.h); return { k, x0: k * cw, x1: k * cw + X.w, y0, y1: y0 + X.h }; });
        if (R.length !== n) { fail(`${where}: в SLOT мест не ${n}`); continue; }
        for (const r of R) {
          if (r.y0 < -0.01 || r.y1 > H + 0.01) fail(`${where}: карта вне поля по высоте (${r.y0.toFixed(1)}…${r.y1.toFixed(1)} из ${H})`);
          if (sideL + r.x1 > cw + mid + 0.01) fail(`${where}: карта заходит в середину поля — к ленте, очереди и легенде (${(sideL + r.x1).toFixed(1)} > ${cw + mid})`);
        }
        R.forEach((a, i) => R.forEach((b, j) => {
          if (i >= j) return;
          if (a.k === b.k && a.y0 < b.y1 - 0.01 && b.y0 < a.y1 - 0.01) fail(`${where}: карты ${i} и ${j} в колонке наезжают друг на друга`);
          if (a.k !== b.k && a.x0 < b.x1 - 0.01 && b.x0 < a.x1 - 0.01 && a.y0 < b.y1 - 0.01 && b.y0 < a.y1 - 0.01) fail(`${where}: колонки наезжают`);
        }));
      }
      /* над полосой (имя в строку, шансы в ряд): «×N» и полезные — слева, вредные — справа; два эффекта в столбике встают */
      for (const X of [C, L]) {
        const free = X.P - sqBand(sz, 1, 1);
        if (SQ_TGT[1] - SQG.pfw - SQG.tgtOff > SQG.manyTop - 1) fail(`${label}: полезные под «×N» наезжают на него`);
        if (SQG.manyTop + SQG.si > free + 0.01) fail(`${label}: «×N» и полезный эффект под ним не встают над полосой (${free.toFixed(1)} px)`);
        if (3 + SQ_EFF * SQG.si + (SQ_EFF - 1) * SQG.siGap > free + 0.01) fail(`${label}: ${SQ_EFF} эффекта в столбике не встают над полосой (${free.toFixed(1)} px)`);
      }
      if (C.w > cw - 2) fail(`${label}: карта ${C.w} px шире шага колонки ${cw} — колонки сольются`);
      if (C.P <= (sz === 'lg' ? 62 : 48)) fail(`${label}: портрет ${C.P} px не крупнее прежнего кадра`);
    }
    cntS.size = said.join('; ');
  }
}
done();
