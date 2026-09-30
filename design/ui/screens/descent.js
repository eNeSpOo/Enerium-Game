/* Энериум · прототип «Свет снизу» — окно «Спуск» (screens/descent.js, стили — screens/descent.css).
   Слова автора 30.09.2026: фон биома в окне — место и его обитатели, что по лору ждут отряд, на одном арте; арена — фон боя, а не
   «Спуска»; вместо портретов обитателей — переход в бестиарий; частицы для атмосферы; окно красивее, дороже и удобнее (ADR-0026 — воздух).
   Окно одно на все биомы:
   - фон во всё окно — арт биома (DS_DATA.art: задание tools/art-gen/jobs/descent-backdrops.json, выгрузка tools/art-gen/export_ui.py),
     поверх — частицы биома и тень под интерфейс. Смена биома — плавная: прежний фон гаснет поверх нового. Отрисовка сама замечает,
     что биом другой, — кто бы его ни сменил: нажатие, сценарий, «Ещё забег», обёртка screens/echo.js;
   - слева — путь вниз: циклы и их биомы, нераскрытая глубина — одной строкой; у биома, где идёт забег, — огонёк;
   - сверху — строка места, название, цитата; снизу — состояние (этажи, босс и осада, рунный страж), «Изучено N из M» и «Бестиарий»;
     одно главное действие — «Начать забег», при идущих забегах — «К бою» и «Ещё отряд»; вход к рунному стражу — рядом, цена в ключах.
     Страж ещё за боссом — входа нет, об этом говорит строка состояния;
   - бестиарий биома — лист OV.dsbest: обитатели по полкам (BIOME_UI.shelf) и путь вниз; карточка — OV.foe с возвратом к списку;
     вся книга — Летопись (ACT.lorego). Портретов обитателей в самом окне больше нет.
   Сервер решает, клиент показывает: вход к стражу — GD_SRV (index.html, операция с номером), забег — startRun; здесь только показ.
   Частицы — показ, а не расчёт: раскладка — генератор ядра EB.makeRng на сиде биома (при каждой отрисовке та же), числа — целые,
   в данных DS_FX и DS_KIND; движение — только transform и opacity (CSS); prefers-reduced-motion — частиц нет, фон не плывёт.
   Тексты зала и итога — BIOME_UI (index.html; биомы 2–4 кладёт screens/biomes.js), обитатели — bioFoes (index.html).
   Демо-аккаунт открывает «Спуск» на рубеже спуска — там, где идёт прогресс; выбор игрока дальше помнит S.selBiome.
   Договор разметки для screens/echo.js: руины и биом Многоликого оборачивают SCREENS.descent — вставляют свои узлы перед </nav>
   и свою середину после него: <section …><div class="ds-stage">…</div><div class="ds-ui"><nav>…</nav>середина</div></section>.
   Служебное — только команде: TM, PL, tmT. Подключается после screens/model.js и до screens/echo.js.
   UI-кит — раздел «Окно «Спуск»» (KIT_EXTRA). Автопроверка — tools/content-gen/screens/check_biomes.js. */
'use strict';

/* ================== данные окна: вид, не баланс ================== */
const DS_DATA = {
  /* фон — место биома и его обитатели на одном арте; pos — кадрирование cover: глубина зала, где ждут босс и страж */
  art: { b1: 'descent/b1.jpg', b2: 'descent/b2.jpg', b3: 'descent/b3.jpg', b4: 'descent/b4.jpg' },
  pos: { b1: '62% 50%', b2: '58% 50%', b3: '55% 50%', b4: '62% 50%', any: '60% 50%' },
  /* свет биома без арта — [свет, середина, глубина]: Мастерская — здесь, биомы 2–4 — ui.tone из EN_BIOME_FOES; plain — руина и
     биом без данных боя, янтарь крафтовых биомов */
  tone: { b1: { glow: '#d6f5e3', mid: '#4f8f78', deep: '#0b1412' } },
  plain: { glow: '#e6a84b', mid: '#6b4a24', deep: '#0d0b09' },
  node: { done: 'пройден', front: 'рубеж спуска', lock: 'после рунного стража' },   // строка под биомом на пути вниз
  words: { up: 'стоит', siege: 'осада', wait: 'за боссом', open: 'ждёт' },          // слово состояния босса и стража
  seals: ['Повержен', 'Пройден'],   // босс пал, страж пройден — если у биома нет своих (BIOME_UI.seals)
  shelf: { o: 'Рядовые', e: 'Элита', b: 'Путь вниз' },   // полки бестиария — если у биома нет своих (BIOME_UI.shelf); босс и страж — всегда «Путь вниз»
};
const DS_VIEW = { fadeMs: 700, maxFx: 36, kitFloor: 12 };   // смена фона, мс; частиц на окно — не больше; этаж идущего забега в образце UI-кита

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
const dsLive = id => S.runs.filter(r => !r.over && !r.scene && r.biome === id);
const dsRuin = () => !!(S.ech && S.ech.cb && (S.ech.biomes || []).some(x => x.uid === S.ech.cb));   // выбрана руина screens/echo.js
const dsTone = id => DS_DATA.tone[id] || (window.EN_BIOME_FOES && EN_BIOME_FOES.biomes[id] && EN_BIOME_FOES.biomes[id].ui.tone) || DS_DATA.plain;
const dsSeals = id => (BIOME_UI[id] && BIOME_UI[id].seals) || DS_DATA.seals;
const dsArt = id => (DS_DATA.art[id] ? AV(DS_DATA.art[id]) : '');
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
function dsNode(x, sel) {
  const lock = x.state === 'lock', n = dsLive(x.id).length;
  return `<button class="bnode ${x.state}" data-a="biome" data-v="${x.id}" aria-current="${x.id === sel.id}" ${lock && !KH.team ? 'disabled' : ''}><span>${x.name || 'Не открыт'}<small>${DS_DATA.node[x.state] || ''}</small></span>${n ? `<i class="ds-run" title="${n === 1 ? 'Идёт забег' : 'Идёт забегов: ' + n}"></i>` : ''}</button>`;
}
function dsNav(sel) {
  const rows = [], deep = [];
  for (let c = 1; c < ROMAN.length; c++) {
    const bs = S.biomes.filter(x => x.cyc === c);
    if (!bs.length) { deep.push(c); continue; }
    rows.push(`<div class="cyc${c > S.acc.cycle ? ' dim' : ''}"><b>${ROMAN[c]}</b><div>${bs.map(x => dsNode(x, sel)).join('')}</div></div>`);
  }
  if (deep.length) rows.push(`<div class="cyc dim ds-deep"><b>${ROMAN[deep[0]]}${deep.length > 1 ? '–' + ROMAN[deep[deep.length - 1]] : ''}</b><div><span class="bnode lock"><span>Глубже<small>откроется по пути вниз</small></span></span></div></div>`);
  return `<nav class="ds-nav" aria-label="Путь вниз" data-keep="ds-nav"><span class="eyebrow">Путь вниз</span>${rows.join('')}</nav>`;
}

/* ================== состояние биома ================== */
const dsStep = (cls, icon, val, lbl, tip) => `<div class="ds-st ${cls}" title="${tip}">${ic(icon)}<span><b>${val}</b><small>${lbl}</small></span></div>`;
function dsState(b, B) {
  const id = b.id, g = G(id), n = B.floors.length, seals = dsSeals(id), sg = siegeDone(id);
  const boss = F(B.floors[n - 1].m[0]), guard = F(B.guard.m[0]);
  const bName = boss && known(boss.id) ? boss.name : 'босс биома', gName = guard && known(guard.id) ? guard.name : 'рунный страж';
  const siege = B.siege !== false && !g.killed && g.hp != null && sg > 0;
  const bs = g.killed ? ['down', seals[0].toLowerCase(), 'Босс повержен: биом можно проходить ради добычи']
    : siege ? ['siege', `${DS_DATA.words.siege} ${sg} %`, 'Урон по боссу сохраняется до следующего забега']
    : ['up', DS_DATA.words.up, B.siege === false ? 'Босс ждёт на последнем этаже: победить его нужно за один забег' : 'Босс ждёт на последнем этаже. Урон по нему сохраняется между забегами'];
  const gs = !g.killed ? ['wait', DS_DATA.words.wait, 'Рунный страж ждёт за боссом биома: откроется после победы над ним']
    : b.state === 'done' ? ['done', seals[1].toLowerCase(), 'Рунный страж пропустил дальше. Бой с ним можно повторить']
    : ['open', DS_DATA.words.open, `${guard && known(guard.id) ? guard.name : 'Страж'} ждёт: ${guardCards(id)}, ${EB.RULES.rounds.rune} раундов`];
  return `<div class="ds-state">${dsStep('fl', 'down', n, plural(n, 'этаж', 'этажа', 'этажей'), `${n} ${plural(n, 'этаж', 'этажа', 'этажей')}: на последнем ждёт босс биома`)}${dsStep(bs[0], 'crown', bs[1], bName, bs[2])}${dsStep(gs[0], 'door', gs[1], gName, gs[2])}</div>`;
}
/* вход к рунному стражу: открыт после босса биома; цена — ключи стража (§11), кнопка несёт номер операции входа GD_SRV.
   Демо-вход — команде, в любой момент и без ключей */
function dsGuard(id) {
  const B = EB.BIOMES[id], n = B.guard.m.length, gf = F(B.guard.m[0]), who = gf && known(gf.id) ? gf.name : 'Страж', cost = gdCost(id);
  const demo = `<button class="btn sm ghost team-only" data-a="guard" data-v="demo" title="Демо прототипа: сразу к стражу, ${n} ${plural(n, 'карта', 'карты', 'карт')}; босс и стена не меняются, ключи не тратятся">демо-вход</button>`;
  if (!G(id).killed) return demo;
  return `<button class="btn sm" data-a="guard" data-v="${gdOp()}" title="${who} ждёт: ${guardCards(id)}, ${EB.RULES.rounds.rune} раундов, каждая его обычная атака отнимает раунд${cost ? ` · вход — ${cost} ${plural(cost, 'ключ', 'ключа', 'ключей')}` : ''}">${ic('door')}Рунный страж${cost ? costTag('keys', cost) : ''}</button>${demo}`;
}
/* главное действие: одно — «Начать забег»; идут забеги в этом биоме — «К бою» и «Ещё отряд» */
function dsGo(b) {
  const live = dsLive(b.id);
  if (b.state === 'lock' && !KH.team) return `<div class="ds-go"><span class="reason">Откроется после рунного стража</span><div class="row"><button class="btn go big" disabled>${ic('lock')}Начать забег</button></div></div>`;
  if (!live.length) return `<div class="ds-go"><div class="row"><button class="btn go big" data-a="sheet" data-v="prep">${ic('down')}Начать забег</button></div></div>`;
  const R = live[0], what = live.length > 1 ? `Забегов идёт: ${live.length}` : R.guard ? 'Идёт бой со стражем' : `Забег идёт · этаж ${R.floor}`;
  return `<div class="ds-go"><span class="ds-live">${ic('users')}${what}</span><div class="row"><button class="btn" data-a="sheet" data-v="prep">${ic('plus')}Ещё отряд</button><button class="btn go big" data-a="focus" data-v="${R.id}">${ic('eye')}К бою</button></div></div>`;
}
function dsMain(b, swap) {
  const U = BIOME_UI[b.id], B = EB.BIOMES[b.id];
  if (!U || !B || !B.guard) return dsMainPlain(b, swap);
  const fs = bioFoes(b.id), k = fs.filter(f => known(f.id)).length, pct = fs.length ? Math.floor(k * 100 / fs.length) : 0;
  const lock = b.state === 'lock' ? TM(`${ic('lock')}закрыт для игрока · забег команды`, 'span', 'chip warn') : '';
  return `<div class="ds-main${swap ? ' swap' : ''}"${swap ? ` style="--dl:-${swap}ms"` : ''}>
      <header class="ds-head"><span class="eyebrow">${U.eyebrow}</span><h2>${b.name}</h2><p class="quote">${U.quote}</p>${lock}</header>
      <div class="ds-foot">
        <div class="ds-row">${dsState(b, B)}<div class="row ds-gd">${dsGuard(b.id)}</div></div>
        <div class="ds-row ds-acts">
          <div class="ds-know"><div class="ds-know-t"><span>Изучено <b class="num">${k}</b> из ${fs.length}</span>${bar(pct, 'sp')}</div><button class="btn sm ds-best" data-a="sheet" data-v="dsbest:${b.id}" aria-label="Бестиарий: изучено ${k} из ${fs.length}">${ic('book')}Бестиарий</button></div>
          ${dsGo(b)}
        </div>
      </div>
    </div>`;
}
/* биом без данных боя: окно то же, забега нет */
function dsMainPlain(b, swap) {
  const front = b.state === 'front';
  return `<div class="ds-main${swap ? ' swap' : ''}"${swap ? ` style="--dl:-${swap}ms"` : ''}>
      <header class="ds-head"><span class="eyebrow">Цикл ${ROMAN[b.cyc]} · ${front ? 'рубеж спуска' : b.state === 'done' ? 'пройден' : 'не открыт'}</span><h2>${b.name || 'Не открыт'}</h2><p class="quote">${front ? 'Босс биома не побеждён. Рунный страж ждёт после него.' : 'Босс и рунный страж повержены. Биом можно проходить ради добычи.'}</p></header>
      <div class="ds-foot"><div class="ds-row ds-acts"><p class="reason">До первой встречи враги скрыты — имена и способности открывает победа.</p><div class="ds-go">${TM('В прототипе у этого биома нет данных боя', 'span', 'reason')}<div class="row"><button class="btn go big" disabled>${ic('down')}Начать забег</button></div></div></div></div>
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

/* ================== бестиарий биома ================== */
function dsBestBody(id) {
  const b = S.biomes.find(x => x.id === id), U = BIOME_UI[id], fs = bioFoes(id), k = fs.filter(f => known(f.id)).length, seals = dsSeals(id), done = b.state === 'done';
  const row = f => {
    const kn = known(f.id), seal = done && f.g === 'b' ? (f.type === 'Рунный страж' || f.id === 'g1' ? seals[1] : seals[0]) : '';
    return `<button class="ds-bf${kn ? '' : ' unk'}${f.g === 'b' ? ' boss' : f.g === 'e' ? ' elite' : ''}" data-a="foe" data-v="${f.id}"><span class="ds-bf-ph"><img src="${FA(f)}" alt="" style="object-position:${FPOS(f)}" loading="lazy" decoding="async">${kn ? '' : '<i aria-hidden="true">?</i>'}</span><span class="ds-bf-t"><b>${kn ? f.name : 'Не изучен'}</b><small>${f.type}${kn && f.tag ? ' · ' + f.tag : ''}</small></span>${seal ? `<span class="chip gold">${ic('check')}${seal}</span>` : el(f.el, true)}</button>`;
  };
  const grp = (t, list) => list.length ? `<div class="ds-bs-grp"><span class="eyebrow">${t}</span><div class="ds-bs-list">${list.map(row).join('')}</div></div>` : '';
  const shelf = Object.assign({}, DS_DATA.shelf, U.shelf || {}, { b: DS_DATA.shelf.b });
  return `<div class="ds-bs-h"><span class="eyebrow">${b.name} · цикл ${ROMAN[b.cyc]}</span><div class="row ds-bs-k"><span>Изучено <b class="num">${k}</b> из ${fs.length}</span>${bar(fs.length ? Math.floor(k * 100 / fs.length) : 0, 'sp')}</div>
      <p class="reason">До первой победы враг показывает только мощь, здоровье, стихию и тип. Нажмите врага — откроется его карточка.</p></div>
    ${grp(shelf.o, fs.filter(f => f.g === 'o'))}${grp(shelf.e, fs.filter(f => f.g === 'e'))}${grp(shelf.b, fs.filter(f => f.g === 'b'))}`;
}
Object.assign(OV, {
  /* лист «Бестиарий» биома: все обитатели по полкам, изученные — именем, остальные — силуэтом; карточка — по нажатию */
  dsbest(o) {
    const id = BIOME_UI[o.arg] && S.biomes.some(b => b.id === o.arg) ? o.arg : selRunBiome();
    return sheet('Бестиарий', dsBestBody(id), `<button class="link" data-a="dsbook" data-v="${id}">${ic('book')}В Летописи</button>`, true);
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
    ['Спуск · окно биома', 'Фон — место и его обитатели на одном арте, частицы, путь вниз, состояние и одно главное действие; смена биома — плавная', () => { S.route = 'descent'; S.selBiome = dsFront(S); S.overlay = null; }],
    ['Спуск · бестиарий биома', '«Изучено N из M» и лист «Бестиарий»: обитатели по полкам, карточка врага — с возвратом к списку, вся книга — в Летописи', () => { S.route = 'descent'; S.selBiome = dsFront(S); S.overlay = { t: 'dsbest', arg: dsFront(S) }; }]);
}

/* ================== UI-кит · окно «Спуск» ================== */
function dsKitHtml() {
  const bs = S.biomes.filter(b => BIOME_UI[b.id] && EB.BIOMES[b.id] && EB.BIOMES[b.id].guard);
  const fxOf = id => (DS_FX[id] || DS_FX.plain).map(([k, q]) => `${DS_KIND[k].n} · ${q}`).join(', ');
  const cell = b => `<figure class="ds-kit-f"><div class="ds-kit-cell"><div class="g ds-kit-g"><div class="g-main">${dsHtml(b, { kit: true })}</div></div></div>
      <figcaption><b>${b.name}</b><span>частицы: ${fxOf(b.id)}</span>${TM(`<code>${DS_DATA.art[b.id] ? 'assets/art/' + DS_DATA.art[b.id] : 'свет карста — арта нет'}</code>`)}</figcaption></figure>`;
  const open = bs.find(b => G(b.id).killed), cost = open ? gdCost(open.id) : 0;
  const acts = [
    ['Главное действие', `<button class="btn go big" type="button">${ic('down')}Начать забег</button>`],
    ['Идёт забег', `<span class="ds-live">${ic('users')}Забег идёт · этаж ${DS_VIEW.kitFloor}</span><div class="row"><button class="btn" type="button">${ic('plus')}Ещё отряд</button><button class="btn go big" type="button">${ic('eye')}К бою</button></div>`],
    ['Страж открыт', `<button class="btn sm" type="button">${ic('door')}Рунный страж${cost ? costTag('keys', cost) : ''}</button>`],
  ].map(([t, h]) => `<figure><div class="ds-kit-act"><div class="ds-go">${h}</div></div><figcaption>${t}</figcaption></figure>`).join('');
  return `<section class="k-box" style="grid-column:1/-1" id="kitDescent"><h3>Окно «Спуск»</h3>
    <p class="k-note">Фон во всё окно — место биома и его обитатели, что ждут отряд, на одном арте; поверх — частицы биома и тень под интерфейс. Слева — путь вниз по циклам, сверху — строка места, название и цитата, снизу — состояние и одно главное действие. Арена биома — фон боя, в «Спуске» её нет. Смена биома — прежний фон гаснет поверх нового.</p>
    <div class="ds-kit-grid">${bs.map(cell).join('')}</div>
    <div class="k-air-g">
      <div class="k-air-r"><b>Путь вниз</b><small>Циклы и их биомы: золото — пройден, свет духа — рубеж спуска, тёмный — закрыт; закрытый игрок не выбирает. Нераскрытая глубина — одной строкой. Огонёк у биома — там идёт забег. Руины и биом Многоликого встают сюда же.</small></div>
      <div class="k-air-r"><b>Состояние</b><small>Три шага пути: этажи, босс биома (стоит · осада N % · повержен), рунный страж (за боссом · ждёт · пройден). Имя босса и стража — когда они изучены. Вход к стражу — рядом, цена в ключах на кнопке; пока страж за боссом, входа нет.</small></div>
      <div class="k-air-r"><b>Бестиарий</b><small>Вместо портретов в окне — строка «Изучено N из M» и кнопка «Бестиарий»: лист с обитателями по полкам, карточка врага по нажатию, с возвратом к списку; вся книга — в Летописи.</small></div>
      <div class="k-air-r"><b>Одно главное действие</b><div class="ds-kit-acts">${acts}</div><small>«Начать забег» — лист отряда. Идут забеги в этом биоме — «К бою» и «Ещё отряд».</small></div>
      <div class="k-air-r"><b>Частицы</b><small>Мастерская — пыль и стружка, Подземный лес — светящиеся споры и пыльца, Библиотека — страницы и чернильные искры, Стоун-Хейм — искры и пар. Не больше ${DS_VIEW.maxFx} на окно, только transform и opacity, раскладка одна и та же; при «меньше движения» частиц нет и фон не плывёт.</small></div>
    </div>
    ${TM(`<p class="k-note">Код — <code>screens/descent.js</code>, стили — <code>screens/descent.css</code>; данные вида — <code>DS_DATA</code>, <code>DS_FX</code>, <code>DS_KIND</code>. Фоны — задание <code>tools/art-gen/jobs/descent-backdrops.json</code>, выгрузка <code>tools/art-gen/ui-art.json</code> → <code>assets/art/descent/</code>. Вход к стражу — <code>GD_SRV</code> в <code>index.html</code>. Проверка — <code>tools/content-gen/screens/check_biomes.js</code>.</p>`, 'div')}
  </section>`;
}
KIT_EXTRA.push({ html: dsKitHtml });

window.EN_DESCENT = { DS_DATA, DS_FX, DS_KIND, DS_VIEW, dsHtml, dsStage, dsFx, dsBestBody };   // для проверки tools/content-gen/screens/check_biomes.js
