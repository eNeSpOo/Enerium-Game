/* Энериум · прототип «Свет снизу» — окно «Спуск» (screens/descent.js, стили — screens/descent.css).
   Слова автора 30.09.2026: фон биома в окне — место и его обитатели, что по лору ждут отряд, на одном арте; арена — фон боя, а не
   «Спуска»; вместо портретов обитателей — переход в бестиарий; частицы для атмосферы; окно красивее, дороже и удобнее (ADR-0032).
   Слова автора 01.10.2026: «Ну и как ты понимаешь окно спуска тоже в АА уровень перевести, там уже есть красивые картинки но всё
   остальное старое под нынешний UI уже не катит». Картинки биомов остались, остальное — в нынешнем интерфейсе: тонкие нити вместо
   рамок (толщина — SHL_VIEW, screens/shell.js), нарисованные знаки (SHL_ART.ico), воздух, одна главная кнопка, понятные числа.
   Окно одно на все биомы:
   - фон во всё окно — арт биома (DS_DATA.art: задание tools/art-gen/jobs/descent-backdrops.json, выгрузка tools/art-gen/export_ui.py),
     поверх — частицы биома и тень под интерфейс. Смена биома — плавная: прежний фон гаснет поверх нового. Отрисовка сама замечает,
     что биом другой, — кто бы его ни сменил: нажатие, сценарий, «Ещё забег», обёртка screens/echo.js;
   - слева — путь вниз: в шапке — слоты биомов (камни: занято N из M, забеги и руины делят одни слоты); циклы — строкой «Цикл N»,
     биом — медальон с картиной биома, имя и состояние; нераскрытая глубина — одной строкой; у биома, где идёт забег, — огонёк;
   - сверху — строка места, название, цитата и метка состояния биома: рубеж спуска, пройден, закрыт;
   - под названием — путь внутри биома тремя камнями на одной нити: этажи (и где кончился прошлый забег), босс биома (стоит · осада N %
     · повержен; с цикла II — рунный ключ с него и шанс игрока, ADR-0044), рунный страж (за боссом · ждёт — вход за ключи прямо
     в строке · пройден). Страж ещё за боссом — входа нет. Этажи, осада и страж — вариант биома по циклу аккаунта (EB.atCycle,
     screens/biomes.js): окно читает EB.BIOMES при отрисовке;
   - снизу — бестиарий («Изучено N из M» и полоса) и одно главное действие: «Начать забег» с отрядом спуска и его мощью; идут забеги
     в этом биоме — «К бою» и «Ещё отряд»; заняты все слоты биомов — кнопка закрыта и говорит почему;
   - лист «Отряд для спуска» (OV.prep, screens/heroes.js) — в материале окна: картина биома, слоты биомов, та же главная кнопка, на ней —
     мощь тех, кто пойдёт; карты отряда и стихии зала — рядом, без прокрутки (descent.css);
   - бестиарий биома — лист OV.dsbest: обитатели по полкам (BIOME_UI.shelf) и путь вниз; карточка — OV.foe с возвратом к списку;
     вся книга — Летопись (ACT.lorego). Портретов обитателей в самом окне нет.
   Сервер решает, клиент показывает: вход к стражу — GD_SRV (index.html, операция с номером), забег — startRun, слоты — обёртка
   startRun в screens/echo.js; здесь только показ.
   Частицы — показ, а не расчёт: раскладка — генератор ядра EB.makeRng на сиде биома (при каждой отрисовке та же), числа — целые,
   в данных DS_FX и DS_KIND; движение — только transform и opacity (CSS); prefers-reduced-motion — частиц нет, фон не плывёт.
   Тексты зала и итога — BIOME_UI (index.html; биомы 2–4 кладёт screens/biomes.js), обитатели — bioFoes (index.html).
   Демо-аккаунт открывает «Спуск» на рубеже спуска — там, где идёт прогресс; выбор игрока дальше помнит S.selBiome.
   Договор разметки для screens/echo.js: руины и биом Многоликого оборачивают SCREENS.descent — свои узлы ставят сразу под шапкой пути
   (<div class="ds-nav-h">…</div>, внутри — без div): они занимают слоты биомов и видны без прокрутки; свою середину — после </nav>:
   <section …><div class="ds-stage">…</div><div class="ds-ui"><nav>…</nav>середина</div></section>.
   Договор для screens/start.js (обучение): главная кнопка — ровно <button class="btn go big" data-a="sheet" data-v="prep">…</button>,
   обучение подменяет её своей.
   Служебное — только команде: TM, PL, tmT. Подключается после screens/model.js и screens/shell.js, до screens/echo.js.
   UI-кит — раздел «Окно «Спуск»» (KIT_EXTRA). Автопроверка — tools/content-gen/screens/check_biomes.js. */
'use strict';

/* ================== данные окна: вид, не баланс ================== */
const DS_DATA = {
  /* фон — место биома и его обитатели на одном арте; pos — кадрирование cover: глубина зала, где ждут босс и страж */
  art: { b1: 'descent/b1.jpg', b2: 'descent/b2.jpg', b3: 'descent/b3.jpg', b4: 'descent/b4.jpg' },
  pos: { b1: '62% 50%', b2: '58% 50%', b3: '55% 50%', b4: '62% 50%', any: '60% 50%' },
  /* медальон биома на пути вниз — тот же арт, кадр по месту босса и стража: [x, y] % картинки */
  thumb: { b1: '70% 46%', b2: '62% 50%', b3: '64% 46%', b4: '68% 50%', any: '60% 50%' },
  /* свет биома без арта — [свет, середина, глубина]: Мастерская — здесь, биомы 2–4 — ui.tone из EN_BIOME_FOES; plain — руина и
     биом без данных боя, янтарь крафтовых биомов */
  tone: { b1: { glow: '#d6f5e3', mid: '#4f8f78', deep: '#0b1412' } },
  plain: { glow: '#e6a84b', mid: '#6b4a24', deep: '#0d0b09' },
  node: { done: 'пройден', front: 'рубеж спуска', lock: 'после рунного стража' },   // строка под биомом на пути вниз
  tag: { done: 'Пройден', front: 'Рубеж спуска', lock: 'Закрыт' },                   // метка состояния биома у названия
  words: { up: 'стоит', siege: 'осада', wait: 'за боссом', open: 'ждёт' },          // слово состояния босса и стража
  seals: ['Повержен', 'Пройден'],   // босс пал, страж пройден — если у биома нет своих (BIOME_UI.seals)
  shelf: { o: 'Рядовые', e: 'Элита', b: 'Путь вниз' },   // полки бестиария — если у биома нет своих (BIOME_UI.shelf); босс и страж — всегда «Путь вниз»
  /* знаки окна — нарисованные значки оболочки (SHL_ART.ico, screens/shell.js); без арта — SVG index.html: [значок, SVG] */
  ico: { floors: ['floors', 'down'], boss: ['boss', 'crown'], guard: ['guard', 'door'], best: ['best', 'book'], lock: ['lock', 'lock'] },
};
const DS_VIEW = { fadeMs: 700, maxFx: 36, kitFloor: 12, longName: 20 };   // смена фона, мс; частиц на окно — не больше; этаж идущего забега в образце UI-кита;
                                                                         // имя биома с этого числа знаков — мельче, одной строкой: окно не уезжает вниз

/* частицы биома: [вид, сколько] */
const DS_FX = {
  b1: [['dust', 18], ['shaving', 8]],    // Мастерская: пыль и глиняная стружка
  b2: [['spore', 20], ['mote', 10]],     // Подземный лес: светящиеся споры и пыльца
  b3: [['page', 7], ['ink', 18]],        // Библиотека: страницы и чернильные искры
  b4: [['spark', 20], ['steam', 6]],     // Стоун-Хейм: искры горнов и пар
  plain: [['dust', 14]],
};
/* вид частицы: at — где рождается [x от, до, y от, до], % окна (левее 20 % — путь вниз, там их не видно); s — размер, px;
   d — время полёта, мс; dx, dy — путь, px; r — поворот за полёт, °; o — непрозрачность, %; c — цвет; n — имя для UI-кита */
const DS_KIND = {
  dust: { n: 'пыль', at: [22, 100, 30, 100], s: [2, 4], d: [14000, 24000], dx: [-40, 40], dy: [-150, -70], r: [0, 0], o: [30, 65], c: '#e3d2a8' },
  shaving: { n: 'стружка', at: [30, 100, -5, 50], s: [6, 10], d: [9000, 15000], dx: [-20, 60], dy: [110, 220], r: [180, 720], o: [45, 80], c: '#c98f5a' },
  spore: { n: 'светящиеся споры', at: [22, 100, 25, 100], s: [3, 6], d: [11000, 19000], dx: [-60, 60], dy: [-170, -80], r: [0, 0], o: [45, 90], c: '#bff5d4' },
  mote: { n: 'пыльца', at: [22, 100, 10, 90], s: [2, 3], d: [16000, 26000], dx: [-30, 30], dy: [-70, -25], r: [0, 0], o: [25, 55], c: '#eafff2' },
  page: { n: 'страницы', at: [30, 100, -8, 40], s: [8, 11], d: [12000, 18000], dx: [-70, 50], dy: [150, 260], r: [200, 760], o: [35, 65], c: '#d8ccaa' },
  ink: { n: 'чернильные искры', at: [25, 100, 40, 100], s: [2, 3], d: [6000, 11000], dx: [-24, 24], dy: [-130, -60], r: [0, 0], o: [55, 95], c: '#f2b25a' },
  spark: { n: 'искры', at: [30, 100, 55, 100], s: [2, 3], d: [3500, 7000], dx: [-36, 36], dy: [-220, -120], r: [0, 0], o: [60, 100], c: '#ffae4a' },
  steam: { n: 'пар', at: [30, 100, 50, 95], s: [44, 90], d: [13000, 21000], dx: [-36, 36], dy: [-130, -60], r: [0, 0], o: [6, 14], c: '#efe7da' },
};

/* ================== помощники ================== */
const dsReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
const dsNow = () => { try { return Math.floor(performance.now()); } catch (_) { return 0; } };   // только для показа: смена фона
const dsEsc = x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dsLive = id => S.runs.filter(r => !r.over && !r.scene && r.biome === id);
const dsRuin = () => !!(S.ech && S.ech.cb && (S.ech.biomes || []).some(x => x.uid === S.ech.cb));   // выбрана руина screens/echo.js
const dsTone = id => DS_DATA.tone[id] || (window.EN_BIOME_FOES && EN_BIOME_FOES.biomes[id] && EN_BIOME_FOES.biomes[id].ui.tone) || DS_DATA.plain;
const dsSeals = id => (BIOME_UI[id] && BIOME_UI[id].seals) || DS_DATA.seals;
const dsArt = id => (DS_DATA.art[id] ? AV(DS_DATA.art[id]) : '');
/* адрес для переменной CSS — полный: url() из переменной браузер разрешает от файла стилей, где её подставили (descent.css) */
const dsArtAbs = id => { const a = dsArt(id); if (!a) return ''; try { return new URL(a, document.baseURI).href; } catch (_) { return a; } };
const dsFloors = n => plural(n, 'этаж', 'этажа', 'этажей');
/* знак окна в медальоне: нарисованный значок оболочки, иначе — SVG index.html */
function dsEm(k, cls = '') {
  const [ico, svg] = DS_DATA.ico[k] || [k, k], p = typeof shlIco === 'function' ? shlIco(ico) : '';
  return `<i class="ds-em${cls ? ' ' + cls : ''}" aria-hidden="true">${p ? `<img src="${AV(p)}" alt="" draggable="false">` : ic(svg)}</i>`;
}
/* слоты биомов: забеги и руины делят одни слоты (screens/echo.js, EN_ECHO.bio — по одному на цикл); без Эхо — слотов не показываем */
function dsSlots() {
  const B = window.EN_ECHO && typeof EN_ECHO.bio === 'function' ? EN_ECHO.bio() : null;
  if (!B || !B.cap) return null;
  return { cap: B.cap, used: B.used, full: B.used >= B.cap };
}
const dsSlotsWhy = s => `Слоты биомов: занято ${s.used} из ${s.cap} — забеги и руины делят одни слоты`;
const dsSlotsHtml = s => !s ? '' : `<span class="ds-slots${s.full ? ' full' : ''}" title="${dsSlotsWhy(s)}" aria-label="${dsSlotsWhy(s)}">`
  + `<span class="ds-pips" aria-hidden="true">${Array.from({ length: s.cap }, (_, i) => `<i${i < s.used ? ' class="on"' : ''}></i>`).join('')}</span><span class="num"><b>${Math.min(s.used, s.cap)}</b>/${s.cap}</span></span>`;
/* сцена окна: фон, его кадр, свет и частицы — биома или нейтральная (руина, биом без данных) */
function dsStage(id, ruin) {
  if (ruin) return { key: 'ruin', url: '', pos: '', tone: DS_DATA.plain, fx: 'plain' };
  return { key: id, url: dsArt(id), pos: DS_DATA.pos[id] || DS_DATA.pos.any, tone: dsTone(id), fx: DS_FX[id] ? id : 'plain' };
}
const dsBg = (st, cls = '', style = '') => st.url
  ? `<img class="ds-bg${cls}" src="${st.url}" alt="" style="object-position:${st.pos}${style}" decoding="async">`
  : `<i class="ds-bg ds-plain${cls}" style="--tg:${st.tone.glow};--tm:${st.tone.mid};--td:${st.tone.deep}${style}"></i>`;
/* частицы: раскладка — на сиде биома, при каждой отрисовке та же; отрицательная задержка — в окне уже летят, а не рождаются разом */
function dsFx(key) {
  if (dsReduced()) return '';
  const roll = EB.makeRng(EB.seedOf('спуск|частицы|' + key)), pick = ([a, b]) => a + roll(b - a + 1);
  let n = 0, out = '';
  for (const [k, q] of DS_FX[key] || DS_FX.plain) {
    const K = DS_KIND[k];
    for (let i = 0; i < q && n < DS_VIEW.maxFx; i++, n++) {
      const d = pick(K.d);
      out += `<i class="ds-p" data-k="${k}" style="left:${pick([K.at[0], K.at[1]])}%;top:${pick([K.at[2], K.at[3]])}%;--s:${pick(K.s)}px;--c:${K.c};--d:${d}ms;--dl:-${roll(d)}ms;--dx:${pick(K.dx)}px;--dy:${pick(K.dy)}px;--r:${pick(K.r)}deg;--o:${pick(K.o)}%"></i>`;
    }
  }
  return `<div class="ds-fx" data-fx="${key}">${out}</div>`;
}

/* ================== путь вниз ================== */
/* медальон биома: картина биома в одной нити; закрытый — в тени, с замком */
function dsThumb(id, lock) {
  const a = dsArtAbs(id), pos = DS_DATA.thumb[id] || DS_DATA.thumb.any;
  return `<span class="bn-ph"${a ? ` style="--ph:url('${a}');--pp:${pos}"` : ''} aria-hidden="true">${lock ? dsEm('lock', 'lk') : ''}</span>`;
}
function dsNode(x, sel) {
  const lock = x.state === 'lock', n = dsLive(x.id).length;
  return `<button class="bnode ${x.state}" data-a="biome" data-v="${x.id}" aria-current="${x.id === sel.id}" ${lock && !KH.team ? 'disabled' : ''}>${dsThumb(x.id, lock)}`
    + `<span class="bn-t">${x.name || 'Не открыт'}<small>${DS_DATA.node[x.state] || ''}</small></span>${n ? `<i class="ds-run" title="${n === 1 ? 'Идёт забег' : 'Идёт забегов: ' + n}"></i>` : ''}</button>`;
}
function dsNav(sel) {
  const rows = [], deep = [];
  for (let c = 1; c < ROMAN.length; c++) {
    const bs = S.biomes.filter(x => x.cyc === c);
    if (!bs.length) { deep.push(c); continue; }
    rows.push(`<div class="cyc${c > S.acc.cycle ? ' dim' : ''}"><b>${ROMAN[c]}</b><div>${bs.map(x => dsNode(x, sel)).join('')}</div></div>`);
  }
  if (deep.length) rows.push(`<div class="cyc dim ds-deep"><b>${ROMAN[deep[0]]}${deep.length > 1 ? '–' + ROMAN[deep[deep.length - 1]] : ''}</b><div><span class="bnode lock">${dsThumb('', true)}<span class="bn-t">Глубже<small>откроется по пути вниз</small></span></span></div></div>`);
  return `<nav class="ds-nav" aria-label="Путь вниз" data-keep="ds-nav"><div class="ds-nav-h"><span class="eyebrow">Путь вниз</span>${dsSlotsHtml(dsSlots())}</div>${rows.join('')}</nav>`;
}

/* ================== путь внутри биома: этажи, босс, рунный страж ================== */
/* прошлый забег — где он кончился: стена, босс, осада; слова — те же, что у листа отряда (screens/heroes.js, sqInfo) */
function dsLast(L) {
  if (!L) return '';
  if (L.kind === 'boss') return 'прошлый забег — босс повержен';
  if (L.kind === 'siege') return 'прошлый забег — дошёл до босса';
  if (L.wall) return `прошлый забег — стена на ${L.wall}-м`;
  return L.floor ? `прошлый забег — прерван на ${L.floor}-м` : '';
}
/* рунный ключ с босса биома (§11, ADR-0044): с цикла RULES.drop.b.runeKeyFrom — шанс runeKeyBp, отмычки Странника поднимают его не выше
   runeKeyMaxBp; ключей за раз — цикл биома. Шанс игрока — то, что знает о нём «сервер» (lootCtx, index.html), как у добычи этажа.
   В цикле I (обучение) — нет: его добычу задаёт сценарий */
function dsKey(B) {
  const D = EB.RULES.drop && EB.RULES.drop.b;
  if (!D || !D.runeKeyBp || !(S.acc && S.acc.cycle >= D.runeKeyFrom)) return null;
  const X = typeof lootCtx === 'function' ? lootCtx() : null, art = X && X.art && X.art.runeKeyBp || 0;
  return { n: B.cycle || 1, bp: Math.min(D.runeKeyMaxBp, D.runeKeyBp + art), base: D.runeKeyBp, max: D.runeKeyMaxBp };
}
const dsKeyN = n => (n > 1 ? `${n} ${plural(n, 'рунный ключ', 'рунных ключа', 'рунных ключей')}` : 'рунный ключ');
const dsKeyNote = k => `<span class="ds-key"><img src="${curImg('keys')}" alt="" width="15" height="15">${dsKeyN(k.n)} · шанс ${pctBp(k.bp)}</span>`;
const dsKeyTip = k => `С босса биома каждый раз падает ${dsKeyN(k.n)} с шансом ${pctBp(k.base)}${k.bp > k.base ? `, у вас с отмычками — ${pctBp(k.bp)}` : ''}. Отмычки Странника поднимают шанс до ${pctBp(k.max)}`;
/* камень пути: знак, значение крупно, подпись строкой; note — заметка в той же строке (где кончился прошлый забег, ключ с босса),
   more — под ней (полоса осады) */
const dsStep = (cls, em, val, lbl, tip, more = '', note = '') => `<div class="ds-st ${cls}" title="${dsEsc(tip)}">${dsEm(em)}<span class="ds-st-t"><b>${val}</b><span class="ds-st-l"><small>${lbl}</small>${note ? `<em>${note}</em>` : ''}</span>${more}</span></div>`;
function dsState(b, B) {
  const id = b.id, g = G(id), n = B.floors.length, seals = dsSeals(id), sg = siegeDone(id);
  const boss = F(B.floors[n - 1].m[0]), guard = F(B.guard.m[0]);
  const bName = boss && known(boss.id) ? boss.name : 'босс биома', gName = guard && known(guard.id) ? guard.name : 'рунный страж';
  const siege = B.siege !== false && !g.killed && g.hp != null && sg > 0, last = dsLast(S.lastRun[id]);
  const bs = g.killed ? ['down', seals[0].toLowerCase(), 'Босс повержен: биом можно проходить ради добычи']
    : siege ? ['siege', `${DS_DATA.words.siege} ${sg} %`, 'Урон по боссу сохраняется до следующего забега']
    : ['up', DS_DATA.words.up, B.siege === false ? 'Босс ждёт на последнем этаже: победить его нужно за один забег' : 'Босс ждёт на последнем этаже. Урон по нему сохраняется между забегами'];
  const key = dsKey(B);
  const gs = !g.killed ? ['wait', DS_DATA.words.wait, 'Рунный страж ждёт за боссом биома: откроется после победы над ним']
    : b.state === 'done' ? ['done', seals[1].toLowerCase(), 'Рунный страж пропустил дальше. Бой с ним можно повторить']
    : ['open', DS_DATA.words.open, `${guard && known(guard.id) ? guard.name : 'Страж'} ждёт: ${guardCards(id)}, ${EB.RULES.rounds.rune} раундов`];
  return `<div class="ds-state">`
    + dsStep('fl', 'floors', n, dsFloors(n), `${n} ${dsFloors(n)}: на последнем ждёт босс биома`, '', last)
    + dsStep(bs[0], 'boss', bs[1], bName, key ? `${bs[2]}. ${dsKeyTip(key)}` : bs[2], siege ? bar(sg, 'ds-sg') : '', key ? dsKeyNote(key) : '')
    + `<div class="ds-st ${gs[0]}" title="${dsEsc(gs[2])}">${dsEm('guard')}<span class="ds-st-t"><b>${gs[1]}</b><span class="ds-st-l"><small>${gName}</small></span></span><span class="row ds-gd">${dsGuard(id)}</span></div>`
    + `</div>`;
}
/* вход к рунному стражу — в строке стража: открыт после босса биома; цена — ключи стража (§11), кнопка несёт номер операции входа
   GD_SRV. Демо-вход — команде, в любой момент и без ключей */
function dsGuard(id) {
  const B = EB.BIOMES[id], n = B.guard.m.length, gf = F(B.guard.m[0]), who = gf && known(gf.id) ? gf.name : 'Страж', cost = gdCost(id);
  const demo = `<button class="btn sm ghost team-only" data-a="guard" data-v="demo" title="Демо прототипа: сразу к стражу, ${n} ${plural(n, 'карта', 'карты', 'карт')}; босс и стена не меняются, ключи не тратятся">демо-вход</button>`;
  if (!G(id).killed) return demo;
  const why = `${who} ждёт: ${guardCards(id)}, ${EB.RULES.rounds.rune} раундов, каждая его обычная атака отнимает раунд${cost ? ` · вход — ${cost} ${plural(cost, 'ключ', 'ключа', 'ключей')}` : ''}`;
  return `<button class="btn sm" data-a="guard" data-v="${gdOp()}" title="${dsEsc(why)}" aria-label="Войти к рунному стражу${cost ? `: ${cost} ${plural(cost, 'ключ', 'ключа', 'ключей')}` : ''}">Войти${cost ? costTag('keys', cost) : ''}</button>${demo}`;
}

/* ================== низ окна: бестиарий и одно главное действие ================== */
/* отряд спуска под главной кнопкой: имя и мощь тех, кто пойдёт (занятые остаются — правило режима, screens/heroes.js) */
function dsSquad() {
  if (typeof sq !== 'function' || typeof sqReady !== 'function' || typeof BM === 'undefined') return '';
  const s = sq(S.prepSquad); if (!s) return '';
  const r = sqReady('descent', s), bm = r.go.length ? BM.squad(r.go) : 0;
  return `<span class="ds-sq" title="Отряд спуска: ${dsEsc(s.name)} · боевая мощь тех, кто пойдёт"><b>${dsEsc(s.name)}</b>${r.go.length ? `${ICON('power', 15, 'Боевая мощь')}<span class="num">${fmt(bm)}</span>` : '<span>весь занят</span>'}</span>`;
}
/* главное действие — одно: «Начать забег» (лист отряда); идут забеги в этом биоме — «К бою» и «Ещё отряд»; слоты биомов заняты —
   кнопка закрыта и говорит почему (забег не начнётся: обёртка startRun, screens/echo.js) */
function dsGo(b) {
  const live = dsLive(b.id), sl = dsSlots(), full = !!(sl && sl.full);
  if (b.state === 'lock' && !KH.team) return `<div class="ds-go"><span class="reason">Откроется после рунного стража</span><button class="btn go big" disabled>${ic('lock')}Начать забег</button></div>`;
  if (!live.length) {
    if (full) return `<div class="ds-go"><span class="reason warn">${dsSlotsWhy(sl)}</span><button class="btn go big" disabled>${ic('down')}Начать забег</button></div>`;
    return `<div class="ds-go">${dsSquad()}<button class="btn go big" data-a="sheet" data-v="prep">${ic('down')}Начать забег</button></div>`;
  }
  const R = live[0], what = live.length > 1 ? `Забегов идёт: ${live.length}` : R.guard ? 'Идёт бой со стражем' : `Забег идёт · этаж ${R.floor}`;
  return `<div class="ds-go"><span class="ds-live">${ic('users')}${what}</span><div class="row"><button class="btn" data-a="sheet" data-v="prep"${full ? ` disabled title="${dsSlotsWhy(sl)}"` : ''}>${ic('plus')}Ещё отряд</button><button class="btn go big" data-a="focus" data-v="${R.id}">${ic('eye')}К бою</button></div></div>`;
}
function dsBest(b) {
  const fs = bioFoes(b.id), k = fs.filter(f => known(f.id)).length, pct = fs.length ? Math.floor(k * 100 / fs.length) : 0;
  return `<button class="ds-best" data-a="sheet" data-v="dsbest:${b.id}" aria-label="Бестиарий: изучено ${k} из ${fs.length}">${dsEm('best')}`
    + `<span class="ds-best-t"><b>Бестиарий</b><span>Изучено <b class="num">${k}</b> из ${fs.length}</span>${bar(pct, 'sp')}</span></button>`;
}
const dsTag = b => DS_DATA.tag[b.state] ? `<span class="ds-tag ${b.state}">${DS_DATA.tag[b.state]}</span>` : '';
const dsLong = n => (String(n).length >= DS_VIEW.longName ? ' class="long"' : '');   // длинное имя биома — мельче, одной строкой
function dsMain(b, swap) {
  const U = BIOME_UI[b.id], B = EB.BIOMES[b.id];
  if (!U || !B || !B.guard) return dsMainPlain(b, swap);
  const lock = b.state === 'lock' ? TM(`${ic('lock')}закрыт для игрока · забег команды`, 'span', 'chip warn') : '';
  return `<div class="ds-main${swap ? ' swap' : ''}"${swap ? ` style="--dl:-${swap}ms"` : ''}>
      <header class="ds-head"><span class="eyebrow">${U.eyebrow}</span><h2${dsLong(b.name)}>${b.name}</h2><p class="quote">${U.quote}</p><div class="ds-tags">${dsTag(b)}${lock}</div></header>
      ${dsState(b, B)}
      <div class="ds-acts">${dsBest(b)}${dsGo(b)}</div>
    </div>`;
}
/* биом без данных боя: окно то же, забега нет */
function dsMainPlain(b, swap) {
  const front = b.state === 'front';
  return `<div class="ds-main${swap ? ' swap' : ''}"${swap ? ` style="--dl:-${swap}ms"` : ''}>
      <header class="ds-head"><span class="eyebrow">Цикл ${ROMAN[b.cyc]} · ${front ? 'рубеж спуска' : b.state === 'done' ? 'пройден' : 'не открыт'}</span><h2${dsLong(b.name || '')}>${b.name || 'Не открыт'}</h2><p class="quote">${front ? 'Босс биома не побеждён. Рунный страж ждёт после него.' : 'Босс и рунный страж повержены. Биом можно проходить ради добычи.'}</p><div class="ds-tags">${dsTag(b)}</div></header>
      <div class="ds-acts"><p class="reason">До первой встречи враги скрыты — имена и способности открывает победа.</p><div class="ds-go">${TM('В прототипе у этого биома нет данных боя', 'span', 'reason')}<button class="btn go big" disabled>${ic('down')}Начать забег</button></div></div>
    </div>`;
}

/* ================== окно ================== */
/* разметка окна для биома b: o.stage — сцена, o.fade — прежняя сцена гаснет поверх ({ st, gone }), o.kit — превью UI-кита */
function dsHtml(b, o = {}) {
  const st = o.stage || dsStage(b.id, false), fade = o.fade || null;
  const stage = `<div class="ds-stage" aria-hidden="true">${dsBg(st)}${fade ? dsBg(fade.st, ' out', `;--dl:-${fade.gone}ms`) : ''}${dsFx(st.fx)}<i class="ds-veil"></i></div>`;
  return `<section class="scr flush ds" data-biome="${st.key}" style="--fade:${DS_VIEW.fadeMs}ms">${stage}<div class="ds-ui">${dsNav(b)}${dsMain(b, fade ? fade.gone || 1 : 0)}</div></section>`;
}
/* смена сцены: отрисовка помнит прошлую сцену окна; сменилась — прежняя гаснет поверх новой, пока не выйдет время смены */
const DS_T = { st: null, from: null, pre: false };
/* фоны биомов — заранее, один раз за открытие прототипа: смена биома не ждёт загрузки картинки */
function dsPreload() {
  if (DS_T.pre || typeof Image !== 'function') return;
  DS_T.pre = true;
  for (const p of Object.values(DS_DATA.art)) { const i = new Image(); i.decoding = 'async'; i.src = AV(p); }
}
function dsScreen() {
  dsPreload();
  const b = S.biomes.find(x => x.id === S.selBiome) || S.biomes[0], st = dsStage(b.id, dsRuin()), t = dsNow();
  if (DS_T.st && DS_T.st.key !== st.key) DS_T.from = { st: DS_T.st, t };
  DS_T.st = st;
  const f = DS_T.from;
  if (f && (t - f.t >= DS_VIEW.fadeMs || f.st.key === st.key)) DS_T.from = null;
  const fade = DS_T.from ? { st: DS_T.from.st, gone: t - DS_T.from.t } : null;
  return { title: 'Спуск', sub: 'цикл ' + ROMAN[S.acc.cycle], html: dsHtml(b, { stage: st, fade }) };
}
SCREENS.descent = dsScreen;

/* ================== лист «Отряд для спуска» в материале окна ==================
   Лист один на все режимы — OV.prep (screens/heroes.js; Арена оборачивает его своим): здесь, обёрткой overlay(), лист спуска
   получает картину биома, строку места, слоты биомов у главной кнопки и мощь отряда второй строкой в самой кнопке (на 844 × 390 тело
   листа прокручивается — мощь всё равно видна); заняты все слоты — «Начать забег» закрыта и говорит почему. Логика листа и операции — прежние */
function dsPrepDress(h) {
  if (!h || h.indexOf('<aside class="sheet') < 0) return h;
  const id = typeof selRunBiome === 'function' ? selRunBiome() : S.selBiome, b = S.biomes.find(x => x.id === id), a = dsArtAbs(id), sl = dsSlots();
  let out = h.replace(/<aside class="sheet([^"]*)">/, (m, c) => `<aside class="sheet${c} ds-sheet"${a ? ` style="--ph:url('${a}');--pp:${DS_DATA.pos[id] || DS_DATA.pos.any}"` : ''}>`)
    .replace('<div class="sheet-h"><h2>', `<div class="sheet-h"><div class="ds-sh-t"><span class="eyebrow">${b ? `${dsEsc(b.name)} · ${DS_DATA.node[b.state] || ''}` : 'Спуск'}</span><h2>`)
    .replace(/<\/h2>(<button class="iconbtn x")/, '</h2></div>$1');
  if (sl) {
    out = out.replace('<div class="sheet-f">', `<div class="sheet-f">${dsSlotsHtml(sl)}`);
    if (sl.full) out = out.replace(/<button class="btn go" data-a="start"[^>]*>/, m => m.replace('data-a="start"', `data-a="start" disabled title="${dsSlotsWhy(sl)}"`));
  }
  /* мощь тех, кто пойдёт, — второй строкой главной кнопки */
  const s = typeof sq === 'function' ? sq(S.prepSquad) : null, r = s && typeof sqReady === 'function' ? sqReady('descent', s) : null;
  if (r && r.go.length && typeof BM !== 'undefined') {
    const bm = BM.squad(r.go);
    out = out.replace(/(<button class="btn go" data-a="start"[^>]*>)([\s\S]*?)Начать забег<\/button>/, (m, open, ico) => `${open}${ico}<span class="ds-cta-t">Начать забег<small>${ICON('power', 13, 'Боевая мощь')}<span class="num">${fmt(bm)}</span></small></span></button>`);
  }
  return out;
}
{
  const dsOverlay0 = overlay;
  overlay = function () {
    const h = dsOverlay0.apply(this, arguments), o = S.overlay;
    return o && o.t === 'prep' && typeof sqKey === 'function' && sqKey(o.arg) === 'descent' ? dsPrepDress(h) : h;
  };
}

/* ================== бестиарий биома ================== */
function dsBestBody(id) {
  const b = S.biomes.find(x => x.id === id), U = BIOME_UI[id], fs = bioFoes(id), k = fs.filter(f => known(f.id)).length, seals = dsSeals(id), done = b.state === 'done';
  const row = f => {
    const kn = known(f.id), seal = done && f.g === 'b' ? (f.type === 'Рунный страж' || f.id === 'g1' ? seals[1] : seals[0]) : '';
    return `<button class="ds-bf${kn ? '' : ' unk'}${f.g === 'b' ? ' boss' : f.g === 'e' ? ' elite' : ''}" data-a="foe" data-v="${f.id}"><span class="ds-bf-ph"><img src="${FA(f)}" alt="" style="object-position:${FPOS(f)}" loading="lazy" decoding="async">${kn ? '' : '<i aria-hidden="true">?</i>'}</span><span class="ds-bf-t"><b>${kn ? f.name : 'Не изучен'}</b><small>${f.type}${kn && f.tag ? ' · ' + f.tag : ''}</small></span>${seal ? `<span class="chip gold">${ic('check')}${seal}</span>` : el(f.el, true)}</button>`;
  };
  const grp = (t, list) => list.length ? `<div class="ds-bs-grp"><span class="eyebrow">${t}</span><div class="ds-bs-list">${list.map(row).join('')}</div></div>` : '';
  const shelf = Object.assign({}, DS_DATA.shelf, U.shelf || {}, { b: DS_DATA.shelf.b });
  return `<div class="ds-bs-h"><span class="eyebrow">${b.name} · цикл ${ROMAN[b.cyc]}</span><div class="row ds-bs-k">${dsEm('best')}<span>Изучено <b class="num">${k}</b> из ${fs.length}</span>${bar(fs.length ? Math.floor(k * 100 / fs.length) : 0, 'sp')}</div>
      <p class="reason">До первой победы враг показывает только мощь, здоровье, стихию и тип. Нажмите врага — откроется его карточка.</p></div>
    ${grp(shelf.o, fs.filter(f => f.g === 'o'))}${grp(shelf.e, fs.filter(f => f.g === 'e'))}${grp(shelf.b, fs.filter(f => f.g === 'b'))}`;
}
Object.assign(OV, {
  /* лист «Бестиарий» биома: все обитатели по полкам, изученные — именем, остальные — силуэтом; карточка — по нажатию */
  dsbest(o) {
    const id = BIOME_UI[o.arg] && S.biomes.some(b => b.id === o.arg) ? o.arg : selRunBiome(), a = dsArtAbs(id);
    return sheet('Бестиарий', dsBestBody(id), `<button class="link" data-a="dsbook" data-v="${id}">${ic('book')}В Летописи</button>`, true)
      .replace(/<aside class="sheet([^"]*)">/, (m, c) => `<aside class="sheet${c} ds-sheet"${a ? ` style="--ph:url('${a}');--pp:${DS_DATA.pos[id] || DS_DATA.pos.any}"` : ''}>`);
  },
});
/* карточка врага из бестиария биома: внизу — возврат к списку обитателей */
{
  const dsFoeBase = OV.foe;
  OV.foe = function (o) {
    const h = dsFoeBase.call(this, o);
    return o && o.ds && BIOME_UI[o.ds] ? h.replace('<div class="sheet-f">', `<div class="sheet-f"><button class="link" data-a="sheet" data-v="dsbest:${o.ds}">${ic('back')}Все обитатели</button>`) : h;
  };
}

/* ================== действия ================== */
Object.assign(ACT, {
  /* выбор биома на пути вниз; закрытый игрок не нажмёт — кнопка выключена. screens/echo.js оборачивает: снимает выбор руины */
  biome(v) { if (!S.biomes.some(b => b.id === v)) return; S.selBiome = v; render(); },
  /* карточка врага; из листа «Бестиарий» — с возвратом к списку */
  foe(v) { const o = S.overlay; if (o && o.t === 'dsbest') return open('foe', v, { ds: o.arg }); open('foe', v); },
  /* вся книга: Летопись, раздел «Бестиарий», на враге этого биома — изученном, если такой есть */
  dsbook(v) { const fs = bioFoes(v), f = fs.find(x => known(x.id)) || fs[0]; if (f) ACT.lorego(f.id); },
});

/* ================== состояние демо: «Спуск» открыт на рубеже; у пройденного биома босс пал ==================
   Пройденный биом — босс и рунный страж позади: окно показывает «повержен» и «пройден», вход к стражу открыт (биомы 2–4 ставит
   и screens/biomes.js). Прежде у пройденной Мастерской босс «стоял», а страж был «за боссом» */
const dsFront = s => { const f = (s.biomes || []).find(b => b.state === 'front'); return f ? f.id : s.selBiome; };
const dsDone = s => { for (const b of s.biomes || []) if (b.state === 'done' && !(s.siege[b.id] && s.siege[b.id].killed)) s.siege[b.id] = { hp: null, max: null, killed: true }; return s; };
{
  const dsInitBase = initialState;
  initialState = function () { const s = dsDone(dsInitBase()); s.selBiome = dsFront(s); return s; };
  dsDone(S); S.selBiome = dsFront(S);
}

/* ================== сценарии презентации ================== */
{
  const at = FLOWS.findIndex(x => x[0].startsWith('Забег по Мастерской'));
  FLOWS.splice(at < 0 ? FLOWS.length : at, 0,
    ['Спуск · окно биома', 'Фон — место и его обитатели на одном арте, частицы, путь вниз со слотами биомов, путь внутри биома и одно главное действие; смена биома — плавная', () => { S.route = 'descent'; S.selBiome = dsFront(S); S.overlay = null; }],
    ['Спуск · бестиарий биома', '«Изучено N из M» и лист «Бестиарий»: обитатели по полкам, карточка врага — с возвратом к списку, вся книга — в Летописи', () => { S.route = 'descent'; S.selBiome = dsFront(S); S.overlay = { t: 'dsbest', arg: dsFront(S) }; }],
    ['Спуск · отряд для спуска', 'Лист «Отряд для спуска» в материале окна: картина биома, слоты биомов, отряд и его мощь, одна главная кнопка', () => { S.route = 'descent'; S.selBiome = dsFront(S); S.overlay = { t: 'prep', arg: '' }; }]);
}

/* ================== UI-кит · окно «Спуск» ================== */
function dsKitHtml() {
  const bs = S.biomes.filter(b => BIOME_UI[b.id] && EB.BIOMES[b.id] && EB.BIOMES[b.id].guard);
  const fxOf = id => (DS_FX[id] || DS_FX.plain).map(([k, q]) => `${DS_KIND[k].n} · ${q}`).join(', ');
  const cell = b => `<figure class="ds-kit-f"><div class="ds-kit-cell"><div class="g ds-kit-g"><div class="g-main">${dsHtml(b, { kit: true })}</div></div></div>
      <figcaption><b>${b.name}</b><span>частицы: ${fxOf(b.id)}</span>${TM(`<code>${DS_DATA.art[b.id] ? 'assets/art/' + DS_DATA.art[b.id] : 'свет карста — арта нет'}</code>`)}</figcaption></figure>`;
  const open = bs.find(b => G(b.id).killed), cost = open ? gdCost(open.id) : 0;
  const acts = [
    ['Главное действие', `<span class="ds-sq"><b>Отряд I</b>${ICON('power', 15, 'Боевая мощь')}<span class="num">${fmt(345760)}</span></span><button class="btn go big" type="button">${ic('down')}Начать забег</button>`],
    ['Идёт забег', `<span class="ds-live">${ic('users')}Забег идёт · этаж ${DS_VIEW.kitFloor}</span><div class="row"><button class="btn" type="button">${ic('plus')}Ещё отряд</button><button class="btn go big" type="button">${ic('eye')}К бою</button></div>`],
    ['Слоты биомов заняты', `<span class="reason warn">${dsSlotsWhy({ used: 2, cap: 2 })}</span><button class="btn go big" type="button" disabled>${ic('down')}Начать забег</button>`],
  ].map(([t, h]) => `<figure><div class="ds-kit-act"><div class="ds-go">${h}</div></div><figcaption>${t}</figcaption></figure>`).join('');
  const D0 = EB.RULES.drop && EB.RULES.drop.b, kk = D0 && D0.runeKeyBp ? dsKeyNote({ n: 2, bp: D0.runeKeyBp }) : '';
  const steps = [['fl', 'floors', '35', 'этажей', 'прошлый забег — стена на 27-м'], ['up', 'boss', 'стоит', 'босс биома', kk], ['siege', 'boss', 'осада 42 %', 'босс биома', bar(42, 'ds-sg')],
    ['down', 'boss', 'повержен', 'Первый набросок', ''], ['wait', 'guard', 'за боссом', 'рунный страж', ''], ['open', 'guard', 'ждёт', 'рунный страж', `<span class="row ds-gd"><button class="btn sm" type="button">Войти${cost ? costTag('keys', cost) : ''}</button></span>`], ['done', 'guard', 'пройден', 'Мастер', '']]
    .map(([c, k, v, l, m]) => `<div class="ds-st ${c}">${dsEm(k)}<span class="ds-st-t"><b>${v}</b><span class="ds-st-l"><small>${l}</small>${(c === 'fl' || c === 'up') && m ? `<em>${m}</em>` : ''}</span>${c === 'siege' ? m : ''}</span>${c === 'open' ? m : ''}</div>`).join('');
  const nodes = bs.map(b => dsNode(b, bs.find(x => x.state === 'front') || bs[0])).join('');
  return `<section class="k-box" style="grid-column:1/-1" id="kitDescent"><h3>Окно «Спуск»</h3>
    <p class="k-note">Фон во всё окно — место биома и его обитатели, что ждут отряд, на одном арте; поверх — частицы биома и тень под интерфейс. Слева — путь вниз со слотами биомов, сверху — строка места, название, цитата и метка состояния, под ними — путь внутри биома: этажи, босс, рунный страж. Снизу — бестиарий и одно главное действие. Линии и рамки — одна нить, знаки нарисованы.</p>
    <div class="ds-kit-grid">${bs.map(cell).join('')}</div>
    <div class="k-air-g">
      <div class="k-air-r"><b>Путь вниз</b><div class="ds-kit-nav">${nodes}${dsSlotsHtml({ used: 1, cap: 2, full: false })}</div><small>Биом — медальон с картиной биома: золото — пройден, свет духа — рубеж спуска, тень и замок — закрыт; закрытый игрок не выбирает. Нераскрытая глубина — одной строкой. Огонёк — там идёт забег. В шапке — слоты биомов: занято из скольких; забеги и руины делят одни слоты. Руины — сразу под шапкой, их видно без прокрутки; путь длиннее окна — внизу затухание.</small></div>
      <div class="k-air-r"><b>Путь внутри биома</b><div class="ds-kit-st">${steps}</div><small>Этажи и где кончился прошлый забег; босс биома — стоит · осада N % · повержен, с цикла II — рунный ключ с него и шанс (с отмычками Странника — выше); рунный страж — за боссом · ждёт · пройден. Имена — когда изучены. Вход к стражу — в его строке, цена в ключах на кнопке; пока страж за боссом, входа нет.</small></div>
      <div class="k-air-r"><b>Бестиарий</b><div class="ds-kit-act">${bs[0] ? dsBest(bs[0]) : ''}</div><small>Вместо портретов в окне — «Изучено N из M»: лист с обитателями по полкам, карточка врага по нажатию, с возвратом к списку; вся книга — в Летописи.</small></div>
      <div class="k-air-r"><b>Одно главное действие</b><div class="ds-kit-acts">${acts}</div><small>«Начать забег» — с отрядом спуска и его мощью, открывает лист отряда в материале окна. Идут забеги в этом биоме — «К бою» и «Ещё отряд». Заняты все слоты биомов — кнопка закрыта и говорит почему.</small></div>
      <div class="k-air-r"><b>Частицы</b><small>Мастерская — пыль и стружка, Подземный лес — светящиеся споры и пыльца, Библиотека — страницы и чернильные искры, Стоун-Хейм — искры и пар. Не больше ${DS_VIEW.maxFx} на окно, только transform и opacity, раскладка одна и та же; при «меньше движения» частиц нет и фон не плывёт.</small></div>
    </div>
    ${TM(`<p class="k-note">Код — <code>screens/descent.js</code>, стили — <code>screens/descent.css</code>; данные вида — <code>DS_DATA</code>, <code>DS_FX</code>, <code>DS_KIND</code>; знаки — <code>SHL_ART.ico</code> (<code>screens/shell.js</code>, задание <code>tools/art-gen/jobs/shell-descent.json</code>), толщина нитей — <code>SHL_VIEW</code>. Фоны — задание <code>tools/art-gen/jobs/descent-backdrops.json</code>, выгрузка <code>tools/art-gen/ui-art.json</code> → <code>assets/art/descent/</code>. Вход к стражу — <code>GD_SRV</code> в <code>index.html</code>, слоты — <code>EN_ECHO.bio</code>. Проверка — <code>tools/content-gen/screens/check_biomes.js</code>.</p>`, 'div')}
  </section>`;
}
KIT_EXTRA.push({ html: dsKitHtml });

window.EN_DESCENT = { DS_DATA, DS_FX, DS_KIND, DS_VIEW, dsHtml, dsStage, dsFx, dsBestBody, dsSlots, dsPrepDress, dsKey };   // для проверки tools/content-gen/screens/check_biomes.js
