/* screens/heroes.js — «Герои»: коллекция, карточка героя, отряды и «Призыв» (§2.1, §3, §10, §15, §33 GDD; ADR-0019, ADR-0026, ADR-0027).
   Договор — screens/model.js. Регистрирует:
   — SCREENS.heroes: вкладки «Коллекция», «Отряды», «Призыв»;
   — одну анатомию героя: плитку (heroCard — герой аккаунта, rsCard — герой состава), шапку карточки (heroHead, rsHead) и карточку героя
     состава (rsDetail). Редкость — одобренный кристалл r1…r7 (--rico, ADR-0027), доблесть — значки по личному максимуму, рунный предел —
     пять отметок, уровень, класс — значком. На плитке главное, остальное — в карточке;
   — героев аккаунта: hrOwn собирает купленного и пробуждённого героя состава в той же форме, что герои боя прототипа (S.heroes), — H(id)
     в index.html находит и его: карточка, развитие, отряды и бой работают одинаково;
   — отряды: библиотеку пресетов S.squads (§2.1: до десяти, имена, до пяти героев) и один лист выбора отряда на все режимы — OV.prep;
     у каждого режима свой сохранённый выбор. API для экранов режимов — SQ (описан в screens/README.md);
   — «Призыв»: hireView и вкладки «За золото», «За Энериум», «За души». Во вкладке «За души» главное — вход рулетки (rlCol,
     screens/roulette.js; вкладку собирает rsSoulsView в index.html), отряд Эхо недели и каталог праха — входами, списки — в листах
     OV.hrecho и OV.hrdust. Сет донатных героев — лист OV.hrset;
   — действия ACT.sq*, лист имени OV.sqname, раздел UI-кита «Отряды» через KIT_EXTRA, сценарии презентации.
   Своё состояние — S.sq, заводится как S.bag. Сервер решает, клиент показывает: изменение отрядов — операция SQ_SRV с номером, номер
   несёт кнопка, повтор того же номера ничего не меняет. Числа — в блоке данных SQ_DATA, HR_DATA и HR_VIEW. Служебное — только команде:
   TM, PL, tmT из index.html. Автопроверки — tools/content-gen/screens/check_heroes.js и check_squads.js. */
'use strict';

/* ================== данные: числа — здесь, в функциях только алгоритм ================== */
const SQ_DATA = {
  max: 10,          // §2.1: библиотека «Отряды» — до десяти именованных пресетов
  size: 5,          // §2.1: в отряде до пяти героев
  nameMax: 24,      // длина имени отряда, знаков — вид
  /* режимы: n — имя режима, t — заголовок листа, rule — правило строкой; min — сколько героев нужно, exact — ровно столько;
     busy — занятые в забеге: skip — остаются, идут свободные; block — отряд не готов; allow — встают (слепок Арены и Лиги героев
     не занимает, §20.3); teams — отрядов в режиме (Лига, §20.4); hold — где режим хранит выбор (спуск и Эхо — поля S, их читают
     index.html и echo.js) */
  modes: {
    descent: { n: 'Спуск', t: 'Отряд для спуска', min: 1, busy: 'skip', hold: 'prepSquad',
      rule: 'В забег идут свободные герои отряда. Здоровье между этажами не восстанавливается.' },
    echo: { n: 'Эхо', t: 'Отряд для Эхо', min: 5, exact: true, busy: 'block', hold: 'echoSquad',
      rule: 'Ровно пять разных свободных героев. Отряд сохранится для следующих целей и атак.' },
    arena: { n: 'Оборона Арены', t: 'Оборона Арены', min: 5, exact: true, busy: 'allow',
      rule: 'Оборону видят все соперники. Слепок героев не занимает — встают и занятые.' },
    league: { n: 'Лига', t: 'Отряды Лиги', min: 5, exact: true, busy: 'allow', teams: 3,
      rule: 'Три отряда по пять, герой не повторяется. Занятые тоже встают.' },
    clan: { n: 'Клановый босс', t: 'Отряд на Кланового босса', min: 1, busy: 'skip',
      rule: 'Атакуют свободные герои отряда. Контроль на босса не действует — только дебаффы.' },
  },
  /* демо: выбор режимов, которых нет в initialState index.html. Оборона обязательна — назначена сразу (§20.3); Лига и Клановый босс
     ждут первого выбора (§25.1: при первом входе — установка атакующего отряда) */
  demo: { arena: 's1', league: [null, null, null], clan: null },
};
const HR_DATA = {
  /* класс героя состава → класс ядра боя (battle.js, RULES.cls); берётся первый класс героя. Фармящего класса в ядре нет — заглушка */
  cls: { 'танк': 'Танк', 'лекарь': 'Лекарь', 'маг ДД': 'Маг. ДД', 'физ ДД силы': 'Физ. ДД силы', 'физ ДД ловкости': 'Физ. ДД ловкости',
    'контроль (на контроль)': 'Контроль', 'контроль (на дебаффы)': 'Дебаффер', 'контроль': 'Контроль', 'фармер': 'Физ. ДД ловкости' },
  clsStub: 'Физ. ДД ловкости',   // класс ядра, если в составе класс не узнан
  /* характеристик у героев состава нет (§3.5): образец героя прототипа того же класса — [пять характеристик, степени роста СРХ],
     как у героев Эхо (echo.js, heroSt); у физ ДД силы — как у ловкача, сила и ловкость местами. Заглушка до таблиц характеристик */
  st: {
    'Танк': [[128, 54, 72, 246, 62], [2, 3, 3, 1, 3]],
    'Физ. ДД силы': [[245, 54, 128, 72, 62], [1, 3, 2, 3, 3]],
    'Физ. ДД ловкости': [[128, 54, 245, 72, 62], [2, 3, 1, 3, 3]],
    'Маг. ДД': [[72, 246, 54, 62, 128], [3, 1, 3, 3, 2]],
    'Лекарь': [[62, 246, 54, 128, 72], [3, 1, 3, 2, 3]],
    'Контроль': [[62, 246, 54, 128, 72], [3, 1, 3, 2, 3]],
    'Дебаффер': [[62, 246, 54, 128, 72], [3, 1, 3, 2, 3]],
  },
  bmC: 4000,          // §6, слой 0: БМ = C × √(УВС × ЭЗ), C × 100 — та же C, что у бестиария биомов (EN_BIOME_FOES.rules.bmC)
  echoKit: 'эхо:',    // ключ набора героя Эхо в EN_KITS.heroes: наборы героев Эхо — echo-foes.js, в том же виде, что kits.js
};
/* числа вида: цвета стихий для заглушки портрета — те же, что токены --air…--dark в index.html */
const HR_VIEW = {
  el: { 'Воздух': '#dff4e5', 'Земля': '#eb9d40', 'Огонь': '#f0564a', 'Вода': '#5a94f7', 'Время': '#4fdc8b', 'Свет': '#f4e6ae', 'Тьма': '#a986ee', 'без стихии': '#8a9098' },
};

/* ================== помощники ================== */
const hrEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const HR_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const hrFl = (a, b) => Math.floor(a / b);
/* целый квадратный корень — метод Ньютона на целых */
function hrIsqrt(n) { if (n < 2) return n; let x = n, y = hrFl(x + 1, 2); while (y < x) { x = y; y = hrFl(x + hrFl(n, x), 2); } return x; }

/* ================== герои аккаунта ==================
   Герой аккаунта — герой боя прототипа (S.heroes) или купленный и пробуждённый герой состава (S.rs.owned). Для героя состава hrOwn
   собирает героя в форме S.heroes: портрет, класс ядра, характеристики по образцу класса, набор способностей — из kits.js по черновику
   или из echo-foes.js у героя Эхо. Уровень, рунный предел и доблесть — одна правда: запись коллекции S.rs.owned[id]. */
let hrMemo = { s: null, x: {} };
function hrOwn(id) {
  if (!S || !S.rs || !S.rs.owned || !S.rs.owned[id] || !RSI[id]) return undefined;
  if (hrMemo.s !== S) hrMemo = { s: S, x: {} };   // новая сессия — новые герои
  return hrMemo.x[id] || (hrMemo.x[id] = hrBuild(RSI[id]));
}
const hrCore = h => HR_DATA.cls[String(h.cls || '').split(' / ')[0].trim()] || HR_DATA.cls[(h.cl || [])[0]] || HR_DATA.clsStub;
/* набор способностей: черновик героя в kits.js; у героя Эхо — его набор из echo-foes.js под своим ключом */
function hrDraft(h) {
  const K = window.EN_KITS, d = h.team && h.team.draft;
  if (K && d && K.heroes[d]) return d;
  const X = window.EN_ECHO_FOES, e = X && X.heroes ? X.heroes[h.id] : null;
  if (!K || !e) return null;
  const key = HR_DATA.echoKit + h.id;
  if (!K.heroes[key]) K.heroes[key] = { ultPct: e.ultPct, actPct: e.actPct, rarity: e.rarity, maxV: e.maxV, kit: e.kit };
  return key;
}
/* портрет для боя и строк: выгруженный арт, Безликий или заглушка — инициалы в свете стихии, как .rs-ph */
function hrImg(h) {
  const o = rsOld(h); if (o) return o.img;
  if (RS_ART.has(h.id)) return AV('heroes/' + h.id + '.jpg');
  if (h.src === 'donat') return FACELESS;
  const c = HR_VIEW.el[h.sch] || HR_VIEW.el['без стихии'];
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100"><defs><radialGradient id="g" cx="50%" cy="112%" r="80%"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".62" stop-color="${c}" stop-opacity="0"/></radialGradient><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101418"/><stop offset="1" stop-color="#0a0c0e"/></linearGradient></defs><rect width="80" height="100" fill="url(#b)"/><rect width="80" height="100" fill="url(#g)"/><text x="40" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="30" font-weight="600" fill="${c}" fill-opacity=".8">${hrEsc(rsInit(h.n))}</text></svg>`);
}
/* §6, слой 0: БМ = C × √(УВС × ЭЗ) по карте ядра; целыми, как у бестиария биомов */
function hrBmOf(u) {
  const R = EB.RULES, kl = R.K * u.lvl, cap = R.caps.defPct * 100;
  const mit = k => Math.min(cap, hrFl(u.def[k] * 10000, Math.max(1, kl + u.def[k])));
  const m = hrFl(mit('str') + mit('int'), 2);
  const dps = hrFl(u.atk[u.main] * u.as * (1000000 + u.crit * (u.critDmg - 100)), 100000000);
  const ehp = hrFl(hrFl(u.maxHp * 10000, 10000 - m) * 10000, 10000 - u.eva);
  const C = (window.EN_BIOME_FOES && EN_BIOME_FOES.rules && EN_BIOME_FOES.rules.bmC) || HR_DATA.bmC;
  return hrFl(C * hrIsqrt(dps * ehp), 100);
}
function hrBm(x) {
  try { const u = EB.create({ mode: 'rounds', heroes: [EB.heroSrc(x)], foes: [], seed: 1 }).u[0][0]; return u ? hrBmOf(u) : 0; } catch (_) { return 0; }
}
function hrBuild(h) {
  const id = h.id, core = hrCore(h), T = HR_DATA.st[core] || HR_DATA.st['Танк'];
  const rec = () => S.rs.owned[id] || { lvl: 0, lim: 0, valor: 0 };
  const put = k => v => { const o = S.rs.owned[id]; if (o) o[k] = v; };
  const x = { id, name: h.n, cls: core, clsN: h.cls, el: h.sch, race: h.race, draft: hrDraft(h), r: h.r, cycle: h.c, img: hrImg(h), maxV: h.maxV,
    st: T[0].slice(), gr: T[1].slice(), ab: [], pas: [], ult: null, busy: null, rid: id,
    avers: h.avers && h.avers.race ? { race: h.avers.race, bp: h.avers.bp != null ? h.avers.bp : RS.rules.aversionBp } : null };
  Object.defineProperties(x, {
    lvl: { enumerable: true, get: () => rec().lvl, set: put('lvl') },
    lim: { enumerable: true, get: () => rec().lim, set: put('lim') },
    valor: { enumerable: true, get: () => rec().valor, set: put('valor') },
    cap: { enumerable: true, get: () => INV.hero.capByLim[Math.min(rec().lim, INV.hero.capByLim.length - 1)], set() { } },   // потолок — от предела
  });
  x.bm = hrBm(x);
  return x;
}
/* все герои аккаунта: отряд боя прототипа и купленные; герои сета 1 уже есть в S.heroes (rsOld) */
function hrMine() {
  const own = Object.keys((S.rs && S.rs.owned) || {}).filter(id => RSI[id] && !rsOld(RSI[id])).map(hrOwn).filter(Boolean);
  return S.heroes.concat(own);
}
/* запись состава героя аккаунта: купленный — он сам, герой прототипа — по черновику */
const hrTwin = h => RSI[h.id] || (h.draft ? RS.heroes.find(x => x.team && x.team.draft === h.draft) || null : null);

/* ================== одна анатомия героя: плитка, шапка карточки ==================
   Вид героя — для героя аккаунта (у него name) и героя состава (у него n). Герой состава в коллекции — с прогрессом аккаунта */
function hrV(x) {
  if (!x) return null;
  const isAcc = x.name != null, rh = isAcc ? hrTwin(x) : x, acc = isAcc ? x : rsOld(x) || H(x.id) || null;
  if (acc) return { id: acc.id, rid: rh ? rh.id : null, acc, rh, own: true, n: acc.name, face: RSI[acc.id] ? rsFace(RSI[acc.id]) : `<img src="${acc.img}" alt="">`,
    r: acc.r, cls: acc.clsN || acc.cls, ic: acc.clsN || acc.cls, el: acc.el, race: acc.race, c: acc.cycle, lvl: acc.lvl, cap: acc.cap, lim: acc.lim,
    valor: acc.valor, maxV: acc.maxV, bm: acc.bm, busy: busyNote(acc.id) || '' };
  return { id: rh.id, rid: rh.id, acc: null, rh, own: false, n: rh.n, face: rsFace(rh), r: rh.r, cls: rh.cls, ic: rh.cl[0], el: rh.sch, race: rh.race, c: rh.c,
    lvl: 0, cap: 0, lim: 0, valor: rsV(rh), maxV: rh.maxV, bm: 0, busy: '' };
}
/* плитка: портрет, кристалл редкости, доблесть по личному максимуму и пять отметок рунного предела; внизу — имя, класс значком и уровень.
   o: act, val, sel, dim, note — занятость поверх портрета; bm — боевая мощь (витрины и отряды); mark — отметка «в коллекции» */
function hrTile(v, o = {}) {
  const note = o.note != null ? o.note : v.busy, bm = !!o.bm && v.own;
  const lim = v.own ? `<span class="limits" title="Рунный предел ${v.lim} из 5">${limits(v.lim)}</span>` : '';
  const lvl = v.own ? `<span class="lv" title="Уровень ${v.lvl}"><small>ур.</small><b class="num">${v.lvl}</b></span>` : `<span class="cy">цикл ${ROMAN[v.c]}</span>`;
  const right = bm ? bmHtml(v.bm, 11) : o.mark && v.own ? `<span class="own" title="В коллекции">${ic('check')}</span>` : '';
  const say = `${hrEsc(v.n)}, ${RAR[v.r].toLowerCase()}, ${v.cls}${v.own ? `, уровень ${v.lvl}, рунный предел ${v.lim} из 5` : `, цикл ${ROMAN[v.c]}`}, доблесть ${v.valor} из ${v.maxV}${note ? ', ' + note : ''}`;
  return `<button class="hc${bm ? ' wbm' : ''}${o.sel ? ' sel' : ''}${o.dim ? ' dim' : ''}" data-r="${v.r}" data-a="${o.act || 'hero'}" data-v="${o.val != null ? o.val : v.id}" aria-label="${say}">
    ${v.face}<i class="cr" aria-hidden="true"></i>
    <span class="top"><span class="stars" title="Доблесть ${v.valor} из ${v.maxV}">${stars(v.valor, v.maxV)}</span>${lim}</span>
    ${note ? `<span class="busy">${note}</span>` : ''}
    <span class="bot"><span class="nm">${hrEsc(v.n)}</span><span class="meta"><span class="lw">${CLS(v.ic, 13, v.cls)}${lvl}</span>${right}</span></span>
  </button>`;
}
/* плитка героя аккаунта; боевая мощь по умолчанию — как у витрин (пятёрка сильнейших, оборона); в коллекции её нет */
function heroCard(h, o = {}) { return hrTile(hrV(h), Object.assign({ bm: true }, o)); }
/* плитка героя состава: в коллекции «Все герои» — выбор героя, у купленного — его прогресс и отметка */
function rsCard(h, o = {}) { return hrTile(hrV(h), { act: o.act || 'rssel', val: h.id, sel: o.sel, mark: true }); }
/* справа в шапке: у героя аккаунта — боевая мощь, доблесть «текущая / максимальная», уровень и пять отметок предела (§2.2, §33.2) */
function hrVitals(v) {
  return `<b class="bm" title="Боевая мощь">${ICON('power', 24, 'Боевая мощь')}<span class="num">${fmt(v.bm)}</span></b>
    <span class="hr-vv" title="Доблесть ${v.valor} из ${v.maxV}"><span class="stars lg">${stars(v.valor, v.maxV)}</span><small class="num">${v.valor} / ${v.maxV}</small></span>
    <span class="hr-vl" title="Уровень ${v.lvl} из ${v.cap} · рунный предел ${v.lim} из 5"><small>ур.</small><b class="num">${v.lvl}</b><small class="faint num">/ ${v.cap}</small><span class="limits">${limits(v.lim)}</span></span>`;
}
const hrPot = v => `<span class="hr-vv" title="Личный максимум доблести — ${v.maxV}"><span class="stars lg">${stars(v.valor, v.maxV)}</span><small>доблесть до ${v.maxV}</small></span>`;
/* шапка карточки: портрет, имя, класс значком, стихия и раса, кристалл редкости и цикл; справа — прогресс или своё (цена и кнопка) */
function hrHead(v, aside) {
  const right = aside ? aside + (v.own ? '' : hrPot(v)) : v.own ? hrVitals(v) : hrPot(v);
  return `<div class="hd-top">
    <div class="hd-face" data-r="${v.r}">${v.face}</div>
    <div class="hd-id">
      <div class="hd-name"><h2>${hrEsc(v.n)}</h2></div>
      <div class="hd-line"><span class="hd-cls">${CLS(v.ic, 18)}${v.cls}</span>${el(v.el)}<span>${v.race}</span></div>
      <div class="hd-line">${rar(v.r)}<span class="faint caps">цикл ${ROMAN[v.c]}</span></div>
    </div>
    <div class="hd-bm hr-vit${aside ? ' rs-aside' : ''}">${right}</div>
  </div>`;
}
function heroHead(h) { return hrHead(hrV(h)); }
/* шапка героя состава: v — доблесть для примерки (режим «Команда»); у купленного — его прогресс */
function rsHead(h, v, aside) { const x = hrV(h); if (!x.own) x.valor = Math.min(v || 0, x.maxV); return hrHead(x, aside); }
/* «Путь» героя из состава в карточке аккаунта: главы по доблести и орден — из roster.js (heroDetail в index.html) */
function hrPath(h) {
  const rh = RSI[h.id]; if (!rh) return '';
  return `<div class="hd-cols"><div class="col scroll" data-keep="hrpath:${h.id}">${rsChaptersHtml(rh, h.valor)}</div>
    <div class="col scroll" style="gap:8px"><span class="eyebrow">Орден</span>${rsSetHtml(rh, h.valor)}</div></div>`;
}

/* ================== Коллекция ==================
   «Все герои» — состав игры с фильтрами, «Мои» — герои аккаунта. Карточка рядом: у героя аккаунта — развитие (heroDetail, index.html),
   у героя состава — кто он, воспоминания и орден */
const HR_NODATA = '<section class="scr"><div class="pnl pad"><p class="faint">Нет данных: рядом с index.html должен лежать roster.js.</p></div></section>';
function hrScreen() {
  const seg = S.seg.heroes;
  const meta = { title: 'Герои', seg: { key: 'heroes', items: [['coll', 'Коллекция'], ['squads', 'Отряды'], ['hire', 'Призыв']] } };
  if (seg === 'squads') return { ...meta, html: hrSquadsView() };
  if (seg === 'hire') return { ...meta, html: hireView() };
  return { ...meta, html: S.hview === 'mine' ? hrMineView() : rsCollView() };
}
SCREENS.heroes = hrScreen;
function rsViewTabs(all) {
  const v = S.hview === 'mine' ? 'mine' : 'all', tabs = [['all', 'Все герои', all], ['mine', 'Мои', hrMine().length]];
  return `<div class="tabs" role="tablist" aria-label="Коллекция">${tabs.map(([k, l, n]) => `<button role="tab" aria-selected="${v === k}" data-a="hview" data-v="${k}">${l} · ${n}</button>`).join('')}</div>`;
}
function hrMineView() {
  const mine = hrMine();
  let h = H(S.selHero);
  if (!h || !mine.includes(h)) { h = mine[0]; S.selHero = h.id; }
  const hf = S.hfilter || 'all', sortBM = S.hsort === 'bm', free = mine.filter(x => !busyNote(x.id));
  let list = hf === 'free' ? free : mine;
  if (sortBM) list = [...list].sort((a, b) => b.bm - a.bm);
  const grid = list.map(x => heroCard(x, { sel: x.id === h.id, bm: false })).join('') || '<p class="faint" style="grid-column:1/-1">Все герои заняты</p>';
  return `<section class="scr"><div class="hs">
    <div class="pnl coll">
      ${rsViewTabs(RS.heroes.filter(rsFilter).length)}
      <div class="row hr-bar"><div class="tabs" role="tablist" aria-label="Мои герои"><button role="tab" aria-selected="${hf === 'all'}" data-a="hfilter" data-v="all">Все · ${mine.length}</button><button role="tab" aria-selected="${hf === 'free'}" data-a="hfilter" data-v="free">Свободные · ${free.length}</button></div><span class="g-spacer"></span><button class="iconbtn" data-a="hsort" aria-pressed="${sortBM}" aria-label="Сортировать по боевой мощи" title="По боевой мощи">${ic('sort')}</button></div>
      <div class="coll-grid scroll grow" data-keep="mine">${grid}</div>
      <button class="collpow" data-a="sheet" data-v="coll" title="Рейтинговые пассивки всех героев коллекции"><span><b>Сила коллекции</b></span><span class="chip spirit">+0,05%</span>${ic('chev')}</button>
    </div>
    ${heroDetail(h)}
  </div></section>`;
}
function rsCollView() {
  if (!RS.heroes.length) return HR_NODATA;
  const f = S.rs.f, list = RS.heroes.filter(rsFilter), sel = RSI[S.rs.sel] || list[0] || RS.heroes[0];
  const opt = (v, t, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${t}</option>`;
  const grid = list.map(h => rsCard(h, { sel: h.id === sel.id })).join('') || '<p class="faint" style="grid-column:1/-1">Никого: ослабьте фильтры</p>';
  return `<section class="scr"><div class="hs">
    <div class="pnl coll">
      ${rsViewTabs(list.length)}
      <div class="row rs-filters">
        <select class="rs-sel" data-a="rsf" data-v="cyc" aria-label="Цикл">${opt('', 'Цикл', f.cyc)}${ROMAN.slice(1).map((r, i) => opt(i + 1, 'Цикл ' + r, f.cyc)).join('')}</select>
        <select class="rs-sel" data-a="rsf" data-v="src" aria-label="Источник">${opt('', 'Откуда', f.src)}${RS.sources.map(k => opt(k, RS_SRC_ONE[k], f.src)).join('')}</select>
        <select class="rs-sel" data-a="rsf" data-v="cls" aria-label="Класс">${opt('', 'Класс', f.cls)}${RS.classes.map(k => opt(k, k, f.cls)).join('')}</select>
      </div>
      <div class="coll-grid scroll grow" data-keep="rsgrid:${f.cyc}:${f.src}:${f.cls}">${grid}</div>
    </div>
    ${rsDetail(sel)}
  </div></section>`;
}
/* главное действие карточки героя состава: свой герой — к развитию, иначе — к своему способу получить */
function rsGetHtml(h) {
  const acc = rsOld(h) || (S.rs.owned[h.id] ? H(h.id) : null), own = S.rs.owned[h.id];
  if (acc) return `<button class="btn go sm" data-a="rsmine" data-v="${acc.id}">${ic('up')}Развитие</button>${own ? `<span class="reason">${RS_HOW[own.how] || 'в коллекции'}</span>` : TM(`<span class="reason">В бою прототипа ${acc.name} — на прежнем наборе способностей</span>`)}`;
  const how = {
    gold: `Следующий найм цикла ${ROMAN[h.c]} — ${fmt(rsGold(h.c, rsBought(h.c) + 1))} золота`,
    donat: 'Любой из пятерых за Энериум',
    roulette: 'Осколки — в возрождении душ и за прах',
    echo: 'Осколки — в сундуках Эхо и за прах',
    craft: 'Скрытый рецепт: его находят перебором в Мастерской',
  }[h.src] || '';
  const go = h.src === 'craft' ? '' : `<button class="btn go sm" data-a="rsgo" data-v="${h.id}">${ic('arrow')}${h.src === 'gold' ? 'К найму' : h.src === 'donat' ? 'В витрину' : 'К душам'}</button>`;
  return `${go}${h.c > rsCyc() ? `<span class="chip warn">${ic('lock')}цикл ${ROMAN[h.c]}</span>` : ''}<span class="reason">${how}</span>`;
}
/* карточка героя состава — правила воздуха: лор в две строки, до двух чипов, одно действие; остальное — лист «Подробнее».
   act — своё главное действие (в Призыве оно в шапке), по умолчанию — как получить героя; extra — перед действием (формула цены команде) */
function rsBrief(h, act, extra = '') {
  const chips = rsSrcChip(h) + (h.avers && h.avers.race ? `<span class="chip" title="Неприязнь героя Эхо">${ic('target')}${rsAversShort(h)}</span>` : '');
  return `<div class="hd-sec">
    ${foldLore(h.who)}
    <div class="row hd-facts">${chips}</div>${extra}
    <div class="hd-act">${act == null ? rsGetHtml(h) : act}<button class="link" data-a="rhero" data-v="${h.id}">Подробнее ${ic('chev')}</button></div>
  </div>`;
}
function rsDetail(h) {
  if (!h) return '<div class="pnl hd"><p class="faint">Выберите героя.</p></div>';
  const t = S.seg.rhero || 'who', v = rsV(h);
  const body = t === 'mem' ? `<div class="col scroll grow" style="gap:6px" data-keep="rsmem:${h.id}">${rsValorPick(h, v)}${rsChaptersHtml(h, v)}</div>`
    : t === 'set' ? `<div class="col scroll grow" style="gap:8px" data-keep="rsset:${h.id}">${rsValorPick(h, v)}${rsSetHtml(h, v)}</div>`
    : rsBrief(h);
  const team = `<button class="iconbtn rs-team team-only" data-a="rsteam" aria-pressed="${!!KH.team}" aria-label="Режим «Команда»" title="Режим «Команда»: орден, черновик и заметки видны сразу. Нажать — вернуться к виду игрока">${ic('eye')}</button>`;
  return `<div class="pnl hd">${rsHead(h, v)}<div class="hd-body"><div class="row" style="justify-content:space-between"><div class="tabs" role="tablist" aria-label="Разделы героя">${[['who', 'Герой'], ['mem', 'Воспоминания'], ['set', 'Орден']].map(([k, l]) => `<button role="tab" aria-selected="${t === k}" data-a="seg" data-v="rhero:${k}">${l}</button>`).join('')}</div>${team}</div>${body}</div></div>`;
}

/* ================== Отряды ==================
   Библиотека «Отряды» (§2.1): до десяти именованных пресетов, в каждом до пяти героев аккаунта. Пресет сам героев не занимает: при
   применении проверяются правила режима. Один лист выбора на все режимы (OV.prep), у каждого режима — свой сохранённый выбор */
const SQM = SQ_DATA.modes;
const sqFind = id => (id && S.squads.find(s => s.id === id)) || null;
/* пресет по id; удалённого нет — первый в библиотеке: режим, забег и «Ещё забег» не остаются без отряда */
const sq = id => sqFind(id) || S.squads[0];
const sqBM = s => s.m.filter(Boolean).reduce((a, id) => { const h = H(id); return a + (h ? h.bm : 0); }, 0);
const sqKey = m => SQM[m] ? m : 'descent';   // лист «prep» без режима — спуск
const sqOp = () => 'q' + S.sq.seq;           // номер следующей операции: его несут кнопки
function sqGet(mode) {
  const M = SQM[sqKey(mode)];
  if (M.hold) return S[M.hold];
  const v = S.sq.sel[sqKey(mode)];
  return M.teams ? Array.from({ length: M.teams }, (_, i) => (Array.isArray(v) && v[i]) || null) : v || null;
}
function sqSet(mode, id, i) {
  const k = sqKey(mode), M = SQM[k];
  if (id != null && !sqFind(id)) return false;
  if (M.hold) { if (!id) return false; S[M.hold] = id; return true; }
  if (M.teams) { const v = sqGet(k), j = Math.max(0, Math.min(M.teams - 1, +i || 0)); v[j] = id || null; S.sq.sel[k] = v; return true; }
  S.sq.sel[k] = id || null;
  return true;
}
/* готовность отряда к режиму: ids — герои пресета по порядку, go — кто пойдёт, busy — занятые, why — почему не готов */
function sqReady(mode, s) {
  const M = SQM[sqKey(mode)], ids = s ? s.m.filter(id => id && H(id)) : [];
  const busy = M.busy === 'allow' ? [] : ids.filter(id => busyNote(id));
  const go = M.busy === 'skip' ? ids.filter(id => !busy.includes(id)) : ids;
  let why = '';
  if (!s) why = 'не выбран';
  else if (M.exact && ids.length !== M.min) why = `${ids.length} из ${M.min}`;
  else if (M.busy === 'block' && busy.length) why = `${busy.length} ${plural(busy.length, 'занят', 'заняты', 'заняты')}`;
  else if (go.length < M.min) why = ids.length ? 'все заняты' : 'пусто';
  return { ok: !why, why, ids, go, busy };
}
/* Лига: три отряда по пять, герой не повторяется (§20.4) */
function sqLeague() {
  const M = SQM.league, teams = sqGet('league').map(id => { const s = sqFind(id); return Object.assign({ s }, sqReady('league', s)); });
  const at = {}; teams.forEach((t, i) => t.ids.forEach(id => { (at[id] = at[id] || []).push(i); }));
  const dup = Object.keys(at).filter(id => at[id].length > 1);
  const need = M.teams * M.min, pool = hrMine().length;
  const why = teams.some(t => !t.s) ? 'не все раунды выбраны' : dup.length ? 'герой повторяется' : teams.some(t => !t.ok) ? 'не все отряды полные' : '';
  return { teams, dup, at, need, pool, ok: !why, why };
}
/* где выбран пресет: имена режимов */
function sqUsed(id) {
  return Object.keys(SQM).filter(k => { const v = sqGet(k); return Array.isArray(v) ? v.includes(id) : v === id; }).map(k => SQM[k].n);
}
/* лицо героя в строках и списках: портрет с кристаллом редкости (.rs-av) */
const hrAv = h => `<span class="rs-av" data-r="${h.r}">${RSI[h.id] ? rsFace(RSI[h.id]) : `<img src="${h.img}" alt="">`}</span>`;
const sqFaces = s => s.m.map(id => { const h = id && H(id); return h ? hrAv(h) : '<i></i>'; }).join('');

/* «сервер» библиотеки: изменение отрядов — операция с номером. Проверка и изменение — одним вызовом; повтор того же номера возвращает
   прежний ответ и ничего не меняет; отказ номер не тратит. В игре операцию подтверждает сервер */
const SQ_SRV = {
  run(op, f) {
    const O = S.sq.ops;
    if (!op) return { refuse: 'op' };
    if (O[op]) return { again: true, res: O[op] };
    const res = f() || {};
    if (res.refuse) return res;
    O[op] = res; S.sq.seq++;
    return { res };
  },
  create(op) {
    return SQ_SRV.run(op, () => {
      if (S.squads.length >= SQ_DATA.max) return { refuse: 'max' };
      const n = Math.max(0, ...S.squads.map(s => +(String(s.id).match(/\d+$/) || [0])[0])) + 1, id = 's' + n;
      const names = new Set(S.squads.map(s => s.name));
      let k = 1; while (k < HR_ROMAN.length - 1 && names.has('Отряд ' + HR_ROMAN[k])) k++;
      const name = names.has('Отряд ' + HR_ROMAN[k]) ? 'Отряд ' + (S.squads.length + 1) : 'Отряд ' + HR_ROMAN[k];
      S.squads.push({ id, name, m: Array.from({ length: SQ_DATA.size }, () => null) });
      return { id, name };
    });
  },
  rename(op, id, name) {
    const nm = String(name == null ? '' : name).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, SQ_DATA.nameMax).trim();
    return SQ_SRV.run(op, () => { const s = sqFind(id); if (!s) return { refuse: 'none' }; if (!nm) return { refuse: 'name' }; s.name = nm; return { id, name: nm }; });
  },
  /* удаление: последний пресет не удалить; режимы с этим отрядом берут первый оставшийся, Лига и Клановый босс — ждут выбора */
  remove(op, id) {
    return SQ_SRV.run(op, () => {
      const s = sqFind(id); if (!s) return { refuse: 'none' };
      if (S.squads.length <= 1) return { refuse: 'last' };
      const used = sqUsed(id);
      S.squads = S.squads.filter(x => x !== s);
      const first = S.squads[0].id;
      for (const [k, M] of Object.entries(SQM)) {
        if (M.hold) { if (S[M.hold] === id) S[M.hold] = first; continue; }
        const v = S.sq.sel[k];
        if (Array.isArray(v)) S.sq.sel[k] = v.map(x => x === id ? null : x);
        else if (v === id) S.sq.sel[k] = k === 'arena' ? first : null;   // оборона обязательна (§20.3)
      }
      if (S.selSquad === id) S.selSquad = first;
      return { id, name: s.name, used };
    });
  },
  /* герой в место i: уже в отряде — меняется местами, место занято другим — тот уходит из отряда */
  put(op, id, i, hid) {
    return SQ_SRV.run(op, () => {
      const s = sqFind(id); if (!s || !(i >= 0 && i < SQ_DATA.size)) return { refuse: 'slot' };
      if (!H(hid)) return { refuse: 'hero' };
      const j = s.m.indexOf(hid);
      if (j === i) return { refuse: 'same' };
      if (j >= 0) { s.m[j] = s.m[i]; s.m[i] = hid; return { id, i, hid, swap: j }; }
      const out = s.m[i]; s.m[i] = hid;
      return { id, i, hid, out };
    });
  },
  take(op, id, i) {
    return SQ_SRV.run(op, () => { const s = sqFind(id); if (!s || !s.m[i]) return { refuse: 'slot' }; const hid = s.m[i]; s.m[i] = null; return { id, i, hid }; });
  },
  swap(op, id, i, j) {
    return SQ_SRV.run(op, () => {
      const s = sqFind(id), n = SQ_DATA.size;
      if (!s || !(i >= 0 && i < n && j >= 0 && j < n) || i === j || (!s.m[i] && !s.m[j])) return { refuse: 'slot' };
      [s.m[i], s.m[j]] = [s.m[j], s.m[i]];
      return { id, i, j };
    });
  },
  /* выбор отряда режима; у Лиги — в раунд i */
  pick(op, mode, id, i) {
    return SQ_SRV.run(op, () => sqSet(mode, id, i) ? { mode: sqKey(mode), id, i: +i || 0 } : { refuse: 'none' });
  },
};
const SQ_WHY = { max: `В библиотеке уже ${SQ_DATA.max} отрядов`, last: 'Последний отряд удалить нельзя', name: 'Имя не может быть пустым', none: 'Такого отряда нет',
  hero: 'Такого героя нет в коллекции', slot: 'Нет такого места', same: 'Герой уже на этом месте', op: 'Действие устарело' };
const sqSay = r => { if (r && r.refuse) toast(SQ_WHY[r.refuse] || 'Не вышло'); return !!(r && r.res && !r.again); };

/* API для экранов режимов (описан в screens/README.md): лист выбора, выбор режима, готовность, кто пойдёт */
const SQ = {
  modes: SQM,
  /* выбор режима: id пресета или null; у Лиги — массив из трёх */
  of: mode => sqGet(mode),
  squad: mode => { const v = sqGet(mode); return Array.isArray(v) ? v.map(sqFind) : sqFind(v); },
  /* готовность выбранного (или указанного) отряда; у Лиги — три отряда и повторы */
  ready(mode, id) { const k = sqKey(mode); return SQM[k].teams && id == null ? sqLeague() : sqReady(k, id != null ? sqFind(id) : sqFind(sqGet(k))); },
  /* кто пойдёт: герои выбранного отряда по правилам режима; у Лиги — три списка */
  ids(mode) { const k = sqKey(mode); return SQM[k].teams ? sqLeague().teams.map(t => t.go) : sqReady(k, sqFind(sqGet(k))).go; },
  /* лист выбора поверх текущего экрана; «Изменить» ведёт в библиотеку и возвращает сюда. opts.back — маршрут возврата */
  pick(mode, opts = {}) { const k = sqKey(mode); S.sq.round = 0; open('prep', k, { back: opts.back || S.route }); },
  set: (mode, id, i) => sqSet(mode, id, i),
  pool: () => hrMine().map(h => h.id),
  hero: id => hrV(H(id)),
  busy: id => busyNote(id) || '',
  bm: s => sqBM(s),
  used: id => sqUsed(id),
};

/* ---------- библиотека: список пресетов и редактор ---------- */
function hrSquadsView() {
  const s = sq(S.selSquad); S.selSquad = s.id;
  const op = sqOp(), slot = S.sq.slot, n = s.m.filter(Boolean).length, full = S.squads.length >= SQ_DATA.max;
  const rows = S.squads.map(x => { const u = sqUsed(x.id); return `<button class="preset" data-a="sq" data-v="${x.id}" aria-current="${x.id === s.id}">
      <span class="row"><b>${hrEsc(x.name)}</b><span class="g-spacer"></span>${bmHtml(sqBM(x), 12)}</span>
      <span class="faces">${sqFaces(x)}</span>${u.length ? `<small class="faint">${u.join(' · ')}</small>` : ''}</button>`; }).join('');
  const slots = s.m.map((id, i) => { const h = id && H(id); return h ? heroCard(h, { act: 'sqslot', val: `${op}|${i}`, sel: slot === i, bm: false })
    : `<button class="hc empty${slot === i ? ' sel' : ''}" data-a="sqslot" data-v="${op}|${i}" aria-label="Пустое место ${i + 1}">${ic('plus')}</button>`; }).join('');
  const sel = slot >= 0 && s.m[slot] ? H(s.m[slot]) : null;
  const bar = sel ? `<span class="hr-sqsel"><b>${hrEsc(sel.name)}</b><button class="iconbtn" data-a="sqmv" data-v="${op}|${s.id}|${slot}|-1" aria-label="Сдвинуть влево" ${slot > 0 ? '' : 'disabled'}>${ic('back')}</button><button class="iconbtn" data-a="sqmv" data-v="${op}|${s.id}|${slot}|1" aria-label="Сдвинуть вправо" ${slot < SQ_DATA.size - 1 ? '' : 'disabled'}>${ic('arrow')}</button><button class="btn sm" data-a="sqrem" data-v="${op}|${s.id}|${slot}">${ic('x')}Убрать</button></span>`
    : `<span class="reason">${slot >= 0 ? `Место ${slot + 1}: выберите героя ниже.` : 'Нажмите героя, затем другое место — поменяются местами.'}</span>`;
  const pool = hrMine().filter(h => !s.m.includes(h.id)).sort((a, b) => b.bm - a.bm);
  const prow = h => { const b = busyNote(h.id); return `<button class="rs-row hr-prow" data-r="${h.r}" data-a="sqput" data-v="${op}|${s.id}|${h.id}">${hrAv(h)}<span class="tx"><b>${hrEsc(h.name)}</b><small>${CLS(h.clsN || h.cls, 13)}ур. ${h.lvl} · ${bmHtml(h.bm, 11)}</small></span>${b ? `<span class="chip warn" title="${b}">занят</span>` : ''}</button>`; };
  const F = S.sq.from, from = F ? `<div class="hr-from"><span>Выбор для режима «${SQM[F.mode].n}»</span><span class="g-spacer"></span><button class="link" data-a="sqback">${ic('back')}Назад</button><button class="btn sm go" data-a="sqpick" data-v="${op}|${F.mode}|${s.id}|${S.sq.round}">Выбрать «${hrEsc(s.name)}»</button></div>` : '';
  return `<section class="scr"><div class="sq">
    <div class="pnl pad col">
      <div class="row"><span class="eyebrow">Отряды · ${S.squads.length} / ${SQ_DATA.max}</span></div>
      <div class="col scroll grow hr-pres" data-keep="sqlist">${rows}</div>
      <button class="btn sm" data-a="sqnew" data-v="${op}" ${full ? `disabled title="В библиотеке уже ${SQ_DATA.max} отрядов"` : ''}>${ic('plus')}Новый отряд</button>
    </div>
    <div class="pnl pad col hr-sqed">
      ${from}
      <div class="row hr-sqh"><h2 class="serif gold">${hrEsc(s.name)}</h2><button class="iconbtn" data-a="sheet" data-v="sqname:${s.id}" aria-label="Переименовать отряд" title="Переименовать">${HR_PEN}</button><button class="iconbtn" data-a="sqdel" data-v="${s.id}" aria-label="Удалить отряд" title="Удалить" ${S.squads.length > 1 ? '' : 'disabled'}>${ic('trash')}</button><span class="chip">${n} / ${SQ_DATA.size}</span><span class="g-spacer"></span><b class="bm sq-bm" title="Боевая мощь отряда">${ICON('power', 22, 'Боевая мощь')}<span class="num">${fmt(sqBM(s))}</span></b></div>
      <div class="sq-slots">${slots}</div>
      <div class="row hr-sqbar">${bar}</div>
      <div class="hr"></div>
      <span class="eyebrow">${pool.length ? `Герои · ${pool.length}` : 'Все герои в отряде'}</span>
      <div class="hr-pool scroll grow" data-keep="sqpool">${pool.map(prow).join('')}</div>
    </div>
  </div></section>`;
}
const HR_PEN = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg>';

/* ---------- лист выбора отряда: один на все режимы ---------- */
const sqMark = r => r.ok ? `<i class="ok" aria-hidden="true">${ic('check')}</i>` : `<small>${r.why}</small>`;
const sqChip = (x, on, v, r) => `<button class="p-chip hr-chip${r.ok ? '' : ' warn'}" aria-pressed="${on}" data-a="sqpick" data-v="${v}">${hrEsc(x.name)}${sqMark(r)}</button>`;
const sqGone = n => ['', 'один', 'вдвоём', 'втроём', 'вчетвером'][n] || 'без них';
const sqNames = ids => ids.map(id => H(id).name).join(', ');
/* под отрядом: мощь тех, кто пойдёт, стихии и одна строка о готовности */
function sqInfo(mode, s, r) {
  const bm = r.go.reduce((a, id) => a + H(id).bm, 0), els = [...new Set(r.go.map(id => H(id).el))];
  const hall = mode === 'descent' ? ((BIOME_UI[selRunBiome()] || BIOME_UI.b1).els || []) : els;
  const stat = `<div class="row hr-sqi"><div class="stat"><b class="bm">${ICON('power', 20, 'Боевая мощь')}<span class="num">${fmt(bm)}</span></b><small>боевая мощь</small></div><span class="g-spacer"></span>${hall.length ? `<div class="col" style="gap:4px;align-items:flex-end"><span class="eyebrow">${mode === 'descent' ? 'В зале чаще всего' : 'Стихии отряда'}</span><span class="row" style="gap:4px">${hall.map(e => el(e)).join('')}</span></div>` : ''}</div>`;
  const M = SQM[mode];
  let line = '';
  if (!r.ok) line = `<p class="reason warn">${M.exact ? (r.ids.length !== M.min ? `Нужны ровно ${M.min} героев, в «${hrEsc(s.name)}» — ${r.ids.length}.` : `Заняты: ${sqNames(r.busy)}.`) : r.ids.length ? `Весь «${hrEsc(s.name)}» занят.` : `«${hrEsc(s.name)}» пуст: добавьте героев.`}</p>`;
  else if (r.busy.length) line = `<p class="reason">${sqNames(r.busy)} ${r.busy.length > 1 ? 'заняты' : 'занят'} — отряд пойдёт ${sqGone(r.go.length)}.</p>`;
  else if (mode === 'descent') { const last = S.lastRun[selRunBiome()]; line = `<p class="reason">${TM('Этажи — готовые колоды, сид — сам биом: тот же отряд с той же ротацией пройдёт их так же.')}${last ? ` Прошлый забег: ${last.wall ? 'стена на этаже ' + last.wall : last.kind === 'boss' ? 'босс повержен' : last.kind === 'siege' ? 'дошёл до босса' : 'прерван'}.` : ''}</p>`; }
  return stat + line;
}
function sqSlotsOf(mode, s) {
  const M = SQM[mode];
  return `<div class="sq-slots">${s.m.map(id => { const h = id && H(id); if (!h) return `<div class="hc empty">${ic('plus')}</div>`; const b = busyNote(id) || '';
    return heroCard(h, { act: 'noop', note: M.busy === 'allow' ? '' : b, dim: M.busy !== 'allow' && !!b, bm: false }); }).join('')}</div>`;
}
function sqLeagueSheet() {
  const M = SQM.league, L = sqLeague(), op = sqOp(), cur = Math.max(0, Math.min(M.teams - 1, S.sq.round || 0)), sel = sqGet('league');
  const rounds = L.teams.map((t, i) => `<button class="hr-round" data-a="sqround" data-v="${i}" aria-pressed="${i === cur}"><span class="eyebrow">Раунд ${ROMAN[i + 1]}</span><b>${t.s ? hrEsc(t.s.name) : 'не выбран'}</b><span class="faces">${t.s ? sqFaces(t.s) : ''}</span>${t.s ? sqMark(t) : ''}</button>`).join('');
  const chips = S.squads.map(x => sqChip(x, sel[cur] === x.id, `${op}|league|${x.id}|${cur}`, sqReady('league', x))).join('');
  const dup = L.dup.map(id => `${H(id).name} — в раундах ${L.at[id].map(i => ROMAN[i + 1]).join(' и ')}`);
  const line = L.ok ? '<p class="reason">Три отряда готовы.</p>' : L.pool < L.need ? `<p class="reason warn">Нужно ${L.need} разных героев — в коллекции ${L.pool}.</p>`
    : dup.length ? `<p class="reason warn">Герой не повторяется: ${dup.join('; ')}.</p>` : `<p class="reason warn">${L.teams.map((t, i) => t.ok ? '' : `Раунд ${ROMAN[i + 1]}: ${t.why}`).filter(Boolean).join(' · ')}.</p>`;
  const body = `<p class="reason">${M.rule}</p><div class="hr-rounds">${rounds}</div><span class="eyebrow">Отряд в раунд ${ROMAN[cur + 1]}</span><div class="row hr-chips">${chips}</div>${line}`;
  const id = sel[cur] || S.squads[0].id;
  return sheet(M.t, body, `<button class="link" data-a="sqedit" data-v="league|${id}">${ic('users')}Изменить</button><button class="btn sm" data-a="sqnew" data-v="${op}|league" ${S.squads.length >= SQ_DATA.max ? 'disabled' : ''}>${ic('plus')}Новый</button><button class="btn go" data-a="close">Готово</button>`, true);
}

/* ================== Призыв: три способа получить героя (ADR-0019) ==================
   За золото — каталог цикла, цена по счёту покупки (ADR-0023); за Энериум — донатный сет цикла, с цикла II (ADR-0021); за души —
   рулетка крупно, отряд Эхо недели и каталог праха — входами (правила воздуха). Цикл I–VI переключается для демо — только команде */
function hireView() {
  if (!RS.heroes.length) return HR_NODATA;
  const t = S.seg.hire || 'gold', c = rsCyc();
  const tabs = [['gold', 'За золото'], ['donat', 'За Энериум'], ['souls', 'За души']];
  return `<section class="scr">
    <div class="row rs-hbar"><div class="tabs" role="tablist" aria-label="Способ получить героя">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${t === k}" data-a="seg" data-v="hire:${k}">${l}</button>`).join('')}</div>
      <span class="g-spacer"></span><span class="eyebrow team-only">цикл · демо</span>
      <div class="tabs rs-cyc team-only" role="tablist" aria-label="Текущий цикл, демо">${ROMAN.slice(1).map((r, i) => `<button role="tab" aria-selected="${c === i + 1}" data-a="rscyc" data-v="${i + 1}">${r}</button>`).join('')}</div></div>
    ${t === 'donat' ? rsDonatView() : t === 'souls' ? rsSoulsView() : rsGoldView()}
  </section>`;
}
/* за золото: каталог цикла, «№» — только порядок; цена k-й покупки цикла растёт линейно, максимум доблести — 1 */
function rsGoldView() {
  const cur = rsCyc(), c = S.rs.gcyc || cur, open = c <= cur, k = rsBought(c) + 1;
  const cat = RS.heroes.filter(h => h.src === 'gold' && h.c === c).sort((a, b) => a.no - b.no);
  const sel = cat.find(h => h.id === S.rs.gsel) || cat.find(h => !rsHas(h)) || cat[0];
  const opts = ROMAN.slice(1).map((r, i) => `<option value="${i + 1}" ${i + 1 === c ? 'selected' : ''}>Каталог цикла ${r}${i + 1 > cur ? ' · закрыт' : ''}</option>`).join('');
  const rows = cat.map(h => rsRow(h, { act: 'gsel', sel: sel && h.id === sel.id, sub: rsSub(h, `${h.cls}${h.tut ? ' · <span class="rs-tut">обучение</span>' : ''}`), right: rsHas(h) ? `<span class="chip gold">${ic('check')}есть</span>` : `<span class="faint num">№${h.no}</span>` })).join('');
  return `<div class="hs rs-hs">
    <div class="pnl coll">
      <div class="row"><select class="rs-sel grow" data-a="gcyc" aria-label="Каталог героев за золото">${opts}</select><span class="chip" title="Нанято героев этого каталога">${k - 1} / ${cat.length}</span></div>
      <p class="rs-next">${open ? `Следующий найм — ${k}-й в цикле:${money('gold', rsGold(c, k))}` : `${ic('lock')}Каталог откроется в цикле ${ROMAN[c]}`}</p>
      <div class="rs-list scroll grow" data-keep="gcat:${c}">${rows}</div>
    </div>
    ${sel ? rsGoldCard(sel, c, k, open) : '<div class="pnl hd"></div>'}
  </div>`;
}
/* карточка найма: шапка с ценой на кнопке, лор в две строки, остальное — в листе «Подробнее»; формула цены — команде */
function rsGoldCard(h, c, k, open) {
  const g = RS.rules.gold, price = rsGold(c, k);
  const aside = rsHas(h) ? `<span class="chip gold">${ic('check')}в коллекции</span><button class="link" data-a="rsopen" data-v="${h.id}">Открыть ${ic('chev')}</button>`
    : open ? `<button class="btn go" data-a="gbuy" data-v="${h.id}">Нанять${costTag('gold', price)}</button><small class="faint">${k}-й найм цикла ${ROMAN[c]}</small>`
    : `<span class="chip warn">${ic('lock')}цикл ${ROMAN[c]}</span><small class="faint">витрина до перехода</small>`;
  const next = Array.from({ length: g.preview }, (_, i) => k + i).map(n => `<div class="srow"><span class="n">${n}-я покупка цикла ${ROMAN[c]}</span><span class="v">${fmt(rsGold(c, n))}</span><span></span></div>`).join('');
  const team = `<div class="col team-only" style="gap:6px">
      <span class="eyebrow">Цена — по счёту покупки</span>
      <p class="reason num">${fmt(g.first)} × ${c} × (1 + ${pctBp(g.stepBp)} × (${k} − 1)) = ${fmt(price)}</p>
      <div class="stats">${next}</div>
      <p class="reason">№ в каталоге — только порядок. Цена растёт с каждой покупкой в цикле, и всех героев цикла к его концу не выкупить.</p>
    </div>`;
  return `<div class="pnl hd">${rsHead(h, 0, aside)}
    <div class="hd-body">${rsBrief(h, '<span class="reason">Цена растёт с каждым наймом в цикле</span>', team)}</div></div>`;
}
/* за Энериум: донатный сет цикла — пятеро Безликих, любой из пяти, цена растёт от первого к пятому; в цикле I — обучение.
   Сет-бонус и ступени — лист «Сет» по нажатию: в списке только пятеро */
function rsDonatView() {
  const cur = rsCyc(), from = rsFrom('donat'), sets = RS.sets.filter(s => s.kind === 'donat').sort((a, b) => a.cycle - b.cycle);
  if (!sets.length) return '<div class="pnl pad rs-closed"><p class="faint">Донатных сетов нет в данных.</p></div>';
  if (cur < from) return `<div class="pnl rs-closed fit"><span class="eyebrow">Цикл ${ROMAN[cur]} · обучение</span><h2>Донатных сетов в цикле ${ROMAN[cur]} нет</h2>
    <p class="muted">С цикла ${ROMAN[from]} каждый новый цикл открывает донатный сет — пятерых Безликих. Первый — «${sets[0].name}».</p>
    <p class="reason">Первый из пятерых дешевле всех. Сила донатных героев — в пользе для аккаунта, а не в бою.</p></div>`;
  const s = sets.find(x => x.cycle === (S.rs.dcyc || cur)) || sets.filter(x => x.cycle <= cur).pop() || sets[0], open = s.cycle <= cur;
  const sel = RSI[s.members.find(id => id === S.rs.dsel) || s.members.find(id => !rsHas(RSI[id])) || s.members[0]];
  const opts = sets.map(x => `<option value="${x.cycle}" ${x === s ? 'selected' : ''}>Сет цикла ${ROMAN[x.cycle]} · «${x.name}»${x.cycle > cur ? ' · закрыт' : ''}</option>`).join('');
  const rows = s.members.map(id => { const h = RSI[id]; return rsRow(h, { act: 'dsel', sel: h === sel, sub: rsSub(h, `${h.place}-й · ${h.cls}`), right: rsHas(h) ? `<span class="chip gold">${ic('check')}есть</span>` : money('enerium', rsDonatPrice(h)) }); }).join('');
  const n = rsTiers(s.sum);
  return `<div class="hs rs-hs">
    <div class="pnl coll">
      <select class="rs-sel" data-a="dcyc" aria-label="Донатный сет">${opts}</select>
      <p class="rs-next">Цена растёт от первого к пятому<span class="chip warn team-only" title="Цен героев за Энериум в источниках нет — заглушка прототипа">цены — заглушка</span></p>
      <div class="rs-list scroll grow" data-keep="dset:${s.cycle}">${rows}</div>
      <button class="hr-setb" data-a="sheet" data-v="hrset:${s.key}"><span class="col" style="gap:2px;min-width:0"><span class="eyebrow">Сет-бонус</span><b>«${s.name}» · ${n ? n + ' ' + plural(n, 'ступень', 'ступени', 'ступеней') : 'ступеней нет'}</b></span>${ic('chev')}</button>
    </div>
    ${rsDonatCard(sel, s, open)}
  </div>`;
}
function rsDonatCard(h, s, open) {
  const price = rsDonatPrice(h);
  const aside = rsHas(h) ? `<span class="chip gold">${ic('check')}в коллекции</span><button class="link" data-a="rsopen" data-v="${h.id}">Открыть ${ic('chev')}</button>`
    : open ? `<button class="btn go" data-a="dbuy" data-v="${h.id}">Купить${costTag('enerium', price)}</button><small class="faint">${h.place}-й из ${s.members.length}${TM(' · заглушка')}</small>`
    : `<span class="chip warn">${ic('lock')}цикл ${ROMAN[s.cycle]}</span><small class="faint">откроется при переходе</small>`;
  return `<div class="pnl hd">${rsHead(h, 0, aside)}
    <div class="hd-body">${rsBrief(h, '')}</div></div>`;
}
/* за души: справа от рулетки — два входа: отряд Эхо недели и каталог праха; их списки — листы OV.hrecho и OV.hrdust */
const hrDustCat = () => RS.heroes.filter(h => RS_SHARD.includes(h.src) && h.c <= rsCyc() && !rsHas(h));
function hrSoulsSide() {
  const cur = rsCyc(), from = rsFrom('echo'), W = rsWeek(), squad = W ? W.squad.map(id => RSI[id]).filter(Boolean) : [];
  const cat = hrDustCat(), need = RS.rules.stub.shards, ready = cat.filter(h => (S.rs.shards[h.id] || 0) >= need).length;
  const echo = `<button class="pnl hr-entry" data-a="sheet" data-v="hrecho" aria-label="Эхо: отряд недели">
      <span class="eyebrow">Эхо · отряд недели</span><b>${W && W.civ ? W.civ : 'Отряд недели'}</b>
      <span class="hr-ef">${squad.map(h => `<span class="rs-av${h.c <= cur ? '' : ' off'}" data-r="${h.r}">${rsFace(h)}</span>`).join('')}</span>
      <small class="faint">${cur < from ? `Откроется с цикла ${ROMAN[from]}` : 'Осколки — в сундуках Эхо и за прах'}</small><span class="hr-go">${ic('chev')}</span></button>`;
  const dust = `<button class="pnl hr-entry" data-a="sheet" data-v="hrdust" aria-label="Каталог праха">
      <span class="eyebrow">Каталог праха</span><b>${money('dust', S.wallet.dust)}</b>
      <small class="faint">${cat.length ? `${cat.length} ${plural(cat.length, 'герой', 'героя', 'героев')} · осколки за прах` : cur < from ? `Откроется с цикла ${ROMAN[from]}` : 'Все герои собраны'}</small>
      ${ready ? `<span class="chip spirit">${ic('check')}можно пробудить: ${ready}</span>` : ''}<span class="hr-go">${ic('chev')}</span></button>`;
  return `<div class="hr-side">${echo}${dust}</div>`;
}

/* ================== листы ================== */
Object.assign(OV, {
  /* выбор отряда для режима (§2.1, §17.2): пресеты библиотеки чипами, состав выбранного, одна строка о готовности.
     Выбор сохраняется сразу, у каждого режима свой; «Изменить» — библиотека с возвратом сюда */
  prep(o) {
    const mode = sqKey(o.arg), M = SQM[mode];
    if (M.teams) return sqLeagueSheet();
    const op = sqOp(), cur = sqFind(sqGet(mode)), s = cur || S.squads[0], r = sqReady(mode, s);
    const chips = S.squads.map(x => sqChip(x, !!cur && x.id === cur.id, `${op}|${mode}|${x.id}`, sqReady(mode, x))).join('');
    const body = `<p class="reason">${M.rule}</p><div class="row hr-chips">${chips}</div>${cur ? sqSlotsOf(mode, s) + sqInfo(mode, s, r) : '<p class="reason warn">Отряд ещё не выбран: нажмите отряд выше.</p>'}`;
    const main = mode === 'descent' ? `<button class="btn go" data-a="start" ${r.ok ? '' : 'disabled'}>${ic('down')}Начать забег</button>` : `<button class="btn go" data-a="close">Готово</button>`;
    return sheet(M.t, body, `<button class="link" data-a="sqedit" data-v="${mode}|${s.id}">${ic('users')}Изменить</button><button class="btn sm" data-a="sqnew" data-v="${op}|${mode}" ${S.squads.length >= SQ_DATA.max ? 'disabled' : ''}>${ic('plus')}Новый</button>${main}`, true);
  },
  /* имя отряда: поле и «Сохранить»; черновик имени переживает перерисовку */
  sqname(o) {
    const s = sqFind(o.arg); if (!s) return '';
    const v = S.sq.name && S.sq.name.id === s.id ? S.sq.name.v : s.name;
    return dialog('Имя отряда', `<label class="search hr-name"><input id="sqName" type="text" maxlength="${SQ_DATA.nameMax}" value="${hrEsc(v)}" autocomplete="off" spellcheck="false" aria-label="Имя отряда"></label><p class="reason">До ${SQ_DATA.nameMax} знаков. Имя видно только вам.</p>`,
      `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="sqrendo" data-v="${sqOp()}|${s.id}">Сохранить</button>`);
  },
  /* отряд Эхо недели: цивилизация, пятеро по циклам с осколками, неприязнь; осколки — сундуки Эхо и прах */
  hrecho() {
    const cur = rsCyc(), from = rsFrom('echo'), W = rsWeek(), squad = W ? W.squad.map(id => RSI[id]).filter(Boolean) : [];
    const to = squad.length ? squad[squad.length - 1].c : from, av = squad.find(h => h.avers && h.avers.race);
    const rows = squad.map(h => { const on = h.c <= cur; return rsRow(h, { act: 'rhero', dim: !on, sub: rsSub(h, on ? `цикл ${ROMAN[h.c]} · доблесть до ${h.maxV}` : `откроется в цикле ${ROMAN[h.c]}`), right: on ? rsShardTag(h) : ic('lock') }); }).join('');
    const wsel = `<select class="rs-sel team-only" data-a="sweek" aria-label="Неделя расы, демо">${RS.weeks.map(w => `<option value="${w.race}" ${w === W ? 'selected' : ''}>Неделя ${w.gen}</option>`).join('')}</select>`;
    const body = `${W && W.civ ? `<div class="col" style="gap:3px"><b class="serif hr-civ">${W.civ}</b><small class="faint">нашествие «${W.raid}» · по герою за цикл, ${ROMAN[from]}–${ROMAN[to]}</small></div>` : `<small class="faint">по герою за цикл, ${ROMAN[from]}–${ROMAN[to]}</small>`}
      ${cur < from ? `<p class="rs-line">${ic('lock')}Эхо откроется с цикла ${ROMAN[from]}.</p>` : ''}
      ${av ? `<p class="rs-line">${ic('target')}Неприязнь: ${rsAversShort(av)}</p>` : ''}
      <div class="rs-list">${rows}</div>
      <p class="reason">Осколки — в сундуках Эхо за места и за прах.</p>${wsel}`;
    return sheet('Отряд недели', body, `<button class="btn" data-a="sheet" data-v="hrdust">Каталог праха</button><button class="btn go" data-a="sheet" data-v="gifts">Дары путешествия</button>`, true);
  },
  /* каталог праха: герои рулетки и Эхо доступных циклов, осколок за прах (§15.3), собранного пробуждают души (§15.2) */
  hrdust() {
    const R = RS.rules, need = R.stub.shards, cat = hrDustCat(), sel = cat.find(h => h.id === S.rs.ssel) || null;
    const rows = cat.map(h => rsRow(h, { act: 'ssel', sel: !!sel && sel.id === h.id, sub: rsSub(h, `${RS_SRC_ONE[h.src]} · осколок ${fmt(rsShardPrice(h))} праха`), right: rsShardTag(h) })).join('')
      || `<p class="faint">${rsCyc() < rsFrom('roulette') ? `Каталог откроется с цикла ${ROMAN[rsFrom('roulette')]}.` : 'Все герои доступных циклов собраны.'}</p>`;
    let pick = '<p class="reason">Выберите героя — осколки за прах.</p>', foot = '';
    if (sel) {
      const n = S.rs.shards[sel.id] || 0;
      pick = `<div class="hr-dsel"><div class="row"><b class="serif">${sel.n}</b><span class="g-spacer"></span><button class="link" data-a="rhero" data-v="${sel.id}">Карточка ${ic('chev')}</button></div>${bar(Math.min(100, hrFl(n * 100, need)))}<small class="faint num">осколков ${n} / ${need}${TM(' · число — заглушка')}</small></div>`;
      foot = `<button class="btn" data-a="dustbuy" data-v="${sel.id}">Осколок${costTag('dust', rsShardPrice(sel))}</button><button class="btn go" data-a="activate" data-v="${sel.id}" ${n >= need ? '' : 'disabled'}>Пробудить${costTag('souls', R.stub.activateSouls)}</button>`;
    }
    return sheet('Каталог праха', `<div class="row hr-dh">${money('dust', S.wallet.dust)}<span class="faint">цена осколка — по редкости и циклу героя</span></div>${pick}<div class="rs-list">${rows}</div>`, foot, true);
  },
  /* сет донатных героев: участники, бонус и ступени — по нажатию, а не в списке */
  hrset(o) {
    const s = RSS[o.arg]; if (!s) return '';
    return sheet(`«${s.name}»`, rsSetBox(s, null, { pick: id => `data-a="dsel" data-v="${id}"` }), '', true);
  },
});

/* ================== действия ================== */
const sqParse = v => String(v || '').split('|');
/* куда вернуться из библиотеки: маршрут, поверх которого открыт лист режима */
const sqBackOf = () => (S.overlay && S.overlay.back) || S.route;
Object.assign(ACT, {
  /* библиотека: выбор пресета — вид, не операция */
  sq(v) { if (!sqFind(v)) return; S.selSquad = v; S.sq.slot = -1; render(); },
  /* новый отряд: номер операции на кнопке; из листа режима — библиотека с возвратом. Сразу — окно имени */
  sqnew(v) {
    const [op, mode] = sqParse(v), r = SQ_SRV.create(op);
    if (r.refuse) return sqSay(r);
    const id = r.res.id;
    if (mode && SQM[mode]) S.sq.from = { mode, back: sqBackOf() };
    S.selSquad = id; S.sq.slot = -1; S.sq.name = null; S.seg.heroes = 'squads'; S.route = 'heroes';
    open('sqname', id); sqFocusName();
  },
  sqrendo(v) {
    const [op, id] = sqParse(v), inp = document.getElementById('sqName');
    const r = SQ_SRV.rename(op, id, inp ? inp.value : S.sq.name && S.sq.name.id === id ? S.sq.name.v : '');
    if (r.refuse) return sqSay(r);
    S.sq.name = null; S.overlay = null;
    if (r.again) return render();
    toast(`Отряд «${hrEsc(r.res.name)}»`);
  },
  sqdel(v) {
    const s = sqFind(v); if (!s) return;
    if (S.squads.length <= 1) return toast(SQ_WHY.last);
    const used = sqUsed(v);
    S.overlay = { t: 'confirm', title: 'Удалить отряд', text: `«${hrEsc(s.name)}» пропадёт из библиотеки. Герои останутся в коллекции.`, warn: used.length ? `Выбран для: ${used.join(', ')}. Там его заменит «${hrEsc((S.squads.find(x => x !== s) || s).name)}» или режим попросит выбрать заново.` : '', ok: 'Удалить', act: 'sqdeldo', v: `${sqOp()}|${v}`, danger: true };
    render(); focusOverlay();
  },
  sqdeldo(v) {
    const [op, id] = sqParse(v), r = SQ_SRV.remove(op, id);
    S.overlay = null;
    if (r.refuse) return sqSay(r);
    if (r.again) return render();
    S.sq.slot = -1; toast(`Отряд «${hrEsc(r.res.name)}» удалён`);
  },
  /* место в отряде: первое нажатие выбирает, второе на другом месте — меняет местами (операция с номером) */
  sqslot(v) {
    const [op, a] = sqParse(v), i = +a, s = sq(S.selSquad), j = S.sq.slot;
    if (!(i >= 0 && i < SQ_DATA.size)) return;
    if (j < 0 || j === i || (!s.m[i] && !s.m[j])) { S.sq.slot = j === i ? -1 : i; return render(); }
    const r = SQ_SRV.swap(op, s.id, j, i);
    S.sq.slot = -1; sqSay(r); render();
  },
  /* герой в отряд: в выбранное место или в первое свободное; отряд полон и место не выбрано — просьба выбрать */
  sqput(v) {
    const [op, id, hid] = sqParse(v), s = sqFind(id); if (!s) return;
    const i = S.sq.slot >= 0 ? S.sq.slot : s.m.indexOf(null);
    if (i < 0) return toast('В отряде уже пятеро: нажмите, кого заменить');
    const r = SQ_SRV.put(op, id, i, hid);
    S.sq.slot = -1; sqSay(r); render();
  },
  sqrem(v) { const [op, id, i] = sqParse(v), r = SQ_SRV.take(op, id, +i); S.sq.slot = -1; sqSay(r); render(); },
  sqmv(v) {
    const [op, id, a, d] = sqParse(v), i = +a, j = i + (+d), r = SQ_SRV.swap(op, id, i, j);
    if (r.res && !r.again) S.sq.slot = j;
    sqSay(r); render();
  },
  /* выбор отряда режима: «номер|режим|отряд|раунд». Из библиотеки — выбрать и вернуться в режим */
  sqpick(v) {
    const [op, mode, id, i] = sqParse(v), r = SQ_SRV.pick(op, mode, id, i);
    if (r.refuse) return sqSay(r);
    const M = SQM[sqKey(mode)];
    if (M.teams && r.res && !r.again) { const sel = sqGet('league'), nx = sel.findIndex(x => !x); S.sq.round = nx >= 0 ? nx : +i || 0; }
    if (S.sq.from && S.route === 'heroes' && S.seg.heroes === 'squads') return ACT.sqback();
    render();
  },
  sqround(v) { S.sq.round = Math.max(0, Math.min(SQM.league.teams - 1, +v || 0)); render(); },
  /* «Изменить» в листе режима: библиотека с этим отрядом и возвратом в режим */
  sqedit(v) {
    const [mode, id] = sqParse(v);
    S.sq.from = { mode: sqKey(mode), back: sqBackOf() };
    if (sqFind(id)) S.selSquad = id;
    S.sq.slot = -1; S.seg.heroes = 'squads'; go('heroes');
  },
  sqback() {
    const F = S.sq.from; S.sq.from = null;
    if (!F) return render();
    S.route = F.back || 'heroes';
    open('prep', F.mode, { back: S.route });
  },
  /* лист выбора с экрана режима: data-a="sqmode" data-v="режим" */
  sqmode(v) { SQ.pick(v); },
  /* «Изменить отряд» из подтверждения Эхо (screens/echo.js) — тот же лист */
  echoprep() { S.overlay = null; SQ.pick('echo'); },
});
/* окно имени: фокус и выделение; черновик — в S.sq.name, чтобы перерисовка его не стёрла; Enter — «Сохранить» */
function sqFocusName() {
  requestAnimationFrame(() => { const i = document.getElementById('sqName'); if (i) { i.focus(); try { i.select(); } catch (_) { } } });
}
document.addEventListener('input', e => { const t = e.target; if (t && t.id === 'sqName' && S.overlay && S.overlay.t === 'sqname') S.sq.name = { id: S.overlay.arg, v: t.value }; });
/* ушли из библиотеки не через «Назад» и не «Выбрать» — выбор для режима забыт: строка режима в библиотеке больше не висит */
window.addEventListener('en-render', () => { if (S.sq && S.sq.from && !(S.route === 'heroes' && S.seg.heroes === 'squads')) S.sq.from = null; });
document.addEventListener('keydown', e => {
  const t = e.target; if (!t || t.id !== 'sqName' || e.key !== 'Enter') return;
  e.preventDefault(); const b = document.querySelector('.g [data-a="sqrendo"]'); if (b) b.click();
});

/* ================== состояние ==================
   S.sq: seq и ops — «сервер» библиотеки; sel — выбор режимов, у которых нет своего поля (оборона Арены, Лига, Клановый босс);
   slot — выбранное место в редакторе, round — раунд Лиги в листе, from — из какого режима пришли в библиотеку и куда вернуться,
   name — черновик имени. Маршрут возврата листа — поле back его слоя (S.overlay.back): лист открыт поверх экрана режима */
function sqState(s) {
  const D = SQ_DATA.demo;
  s.sq = { seq: 1, ops: {}, sel: { arena: D.arena, league: D.league.slice(), clan: D.clan }, slot: -1, round: 0, from: null, name: null };
  return s;
}
const sqInitBase = initialState;
initialState = function () { return sqState(sqInitBase()); };
sqState(S);

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Отряды · библиотека', 'До десяти отрядов: создать, назвать, собрать до пяти героев и переставить; где какой отряд выбран',
    () => { S.route = 'heroes'; S.seg.heroes = 'squads'; S.selSquad = 's2'; S.sq.slot = -1; S.overlay = null; }],
  ['Отряд для режима · один лист', 'Спуск, Эхо, оборона Арены, Лига и Клановый босс — один лист выбора, у каждого режима свой сохранённый отряд',
    () => { S.route = 'echo'; S.overlay = { t: 'prep', arg: 'echo', back: 'echo' }; }],
  ['Лига · три отряда', 'Три отряда по пять, герой не повторяется: повторы и нехватка героев видны до боя',
    () => { S.route = 'arena'; S.seg.arena = 'league'; S.sq.round = 0; S.overlay = { t: 'prep', arg: 'league', back: 'arena' }; }],
);

/* ================== UI-кит ==================
   Раздел «Отряды»: анатомия плитки героя, пресеты библиотеки, правила режимов и API листа выбора */
KIT_EXTRA.push({
  html: () => {
    const h = S.heroes[0], h2 = S.heroes[2], cat = RS.heroes.find(x => x.src === 'roulette' && x.c === 2) || RS.heroes[0];
    const tiles = `${heroCard(h, { act: 'noop', bm: false })}${heroCard(h2, { act: 'noop', sel: true, bm: true })}${rsCard(cat, { act: 'noop' })}${heroCard(S.heroes[3], { act: 'noop', note: 'Забег · Мастерская', dim: true, bm: false })}`;
    const rule = M => `${M.exact ? 'ровно ' + M.min : 'от ' + M.min + ' до ' + SQ_DATA.size}${M.teams ? ` × ${M.teams}, без повторов` : ''}`;
    const busy = { skip: 'идут свободные', block: 'занятый — не готов', allow: 'встают и занятые' };
    const rows = Object.entries(SQM).map(([k, M]) => `<tr><td><b>${M.n}</b><small>${k}</small></td><td>${rule(M)}</td><td>${busy[M.busy]}</td><td><code>${M.hold ? 'S.' + M.hold : 'S.sq.sel.' + k}</code></td></tr>`).join('');
    const pres = S.squads.map(x => `<span class="chip">${hrEsc(x.name)} · ${x.m.filter(Boolean).length}</span>`).join('');
    return `<section class="k-box" style="grid-column:1/-1"><h3>Отряды и плитка героя</h3>
      <div class="k-demo" style="display:grid;grid-template-columns:repeat(4,minmax(0,110px));gap:8px">${tiles}</div>
      <p class="k-note">Плитка героя — одна на все экраны: кристалл — редкость (значки r1…r7, ADR-0027); значков доблести столько, сколько доблестей у героя, светятся взятые; под ними — пять отметок рунного предела; внизу — имя, класс значком и уровень. Боевая мощь — у витрин и в отряде, в коллекции её нет. У героя состава, которого нет в коллекции, вместо уровня — цикл. Занятость — поверх портрета.</p>
      <div class="k-row">${pres}</div>
      <p class="k-note">Библиотека «Отряды» (§2.1): до ${SQ_DATA.max} пресетов с именами, в каждом до ${SQ_DATA.size} героев; пресет героев не занимает. Создать, переименовать, удалить, собрать и переставить — операции с номером: повтор ничего не меняет. Один лист выбора на все режимы — <code>OV.prep</code>, у каждого режима свой выбор:</p>
      <table class="rk-tab"><tr><th>Режим</th><th>Героев</th><th>Занятые</th><th>Где выбор</th></tr>${rows}</table>
      <p class="k-note">API для экранов режимов: <code>SQ.pick(режим, { back })</code> — лист выбора, <code>SQ.of(режим)</code> — выбранный отряд (у Лиги — три), <code>SQ.ready(режим)</code> — готовность и причина, <code>SQ.ids(режим)</code> — кто пойдёт, <code>SQ.set</code>, <code>SQ.pool</code>, <code>SQ.hero</code>. Подробно — <code>design/ui/screens/README.md</code>.</p></section>`;
  },
});
