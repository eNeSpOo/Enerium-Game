/* screens/hero-dev.js — развитие героя и одно окно снаряжения (GDD §3.3, §4.1, §10, §21, §26, §33.2; ADR-0016, ADR-0019, ADR-0022,
   ADR-0026, ADR-0027). Договор — screens/model.js. Регистрирует:
   — знак рунных пределов: пять рунных камней, свет поднимается снизу — rpPost, rpRow, rpNext и арт RP_ART; его берут шапка листов
     (hrHead в screens/heroes.js), путь, листы и анимация пробития здесь. На книге героя (screens/book.js) пределы — пять замков по
     правому краю, состояние следующего — тот же rpNext;
   — вкладку «Развитие» карточки героя: hdPower(h), её зовёт heroDetail в index.html. Путь героя — пять отрезков уровня, между ними
     ворота рунных пределов — рунные камни, в конце — звезда доблести. Одна главная вещь — следующий шаг: поднять уровень, пробить
     предел, взять доблесть. Характеристики — тихой строкой, подробности — в листах;
   — низ вкладки «Снаряжение»: hdGearFoot(h) — «Надеть лучшее» или вход в окно снаряжения;
   — heroDev(h): что нужно для предела и доблести из запасов; её читают шахта (navHeroes) и проверки;
   — «сервер» HD_SRV: уровень, предел и доблесть — операции с номером: проверка, расход и итог одним вызовом, итог решён до анимации,
     повтор номера ничего не повторяет;
   — листы: OV.hdlim — «Рунный предел»: сколько нужно, сколько есть, что будет; OV.hdval — «Доблесть»: честное превью — что получит
     герой, что начнётся заново, что сохранится, — и подтверждение; OV.hdfx — анимации пробития предела и доблести с карточкой
     «Что изменилось». Пропуск — нажатием, prefers-reduced-motion — сразу итог; движутся только transform и opacity, частицы — EnFx
     (fx.js) в своём слое рядом с #game;
   — окно «Снаряжение героя» OV.gear: слева — места героя, девять снаряжения и четыре талисмана, справа — запасы: подходящие сверху,
     неподходящие тусклые с причиной. Перетаскивание — pointer events, палец и мышь; нажатие — вещь, подсвеченные места, место.
     Сравнение с надетым — стрелками у строк и мощи. Снять — перетащить в запасы или кнопкой. «Надеть лучшее» — операция GR_SRV
     с номером. Листы OV.tal (talismans.js) и OV.eq (equipment.js) открывают это окно на своём месте;
   — разделы UI-кита «Рунные пределы» и «Развитие героя и снаряжение» через KIT_EXTRA и сценарии презентации.
   Доблесть по §3.3 и ADR-0016 даёт +INV.hero.valorPct % к базовым характеристикам накопительно: источник героя для боя и мощи
   собирает index.html (valorSt, heroSt), здесь — показ. Своё состояние — S.hd и S.gear, заводятся как S.bag. Числа — HD_DATA и HD_VIEW.
   Служебное — только команде: TM, PL, tmT из index.html. Автопроверка — tools/content-gen/screens/check_hero_dev.js. */
'use strict';

/* ================== данные экрана: демонстрация, не баланс ================== */
const HD_DATA = {
  qty: [1, 10, 'max'],   // §33.2: уровни пачкой — сколько за раз; «Макс» — сколько хватает духа, но не выше потолка
  qtyStart: 'max',       // выбор при входе: до потолка, сколько хватает духа — одно нажатие вместо многих
  /* сценарии презентации: кто пробивает предел, кто берёт доблесть и последнюю доблесть, чьё снаряжение открыть; у руны обучения —
     на каком пределе герой цикла I берёт первую доблесть (второй биом) */
  flow: { limit: 'h2', valor: 'h4', last: 'h2', gear: 'h1', train: 1 },
  /* руна обучения — руна первой доблести, её даёт 8-й уровень аккаунта (§16, ADR-0018). Отдельного предмета в recipes.js нет: это руна
     доблести цикла I (ярус valor), и отличает её не имя, а источник — награда уровня аккаунта; сколько таких рун не потрачено, держит
     «сервер» развития (S.hd.train). Её можно применить на любом пределе — первая доблесть героя цикла I учит доблести во втором биоме;
     обычная руна доблести — только на пятом пределе (ADR-0031, п. 2; §10.2). demo — не потрачено у демо-аккаунта: боец отряда уже
     взял ею доблесть (ADR-0031, п. 1) */
  train: { level: 8, cyc: 1, demo: 0 },
};
/* числа вида: время анимаций — мс от начала показа; размеры — px; частицы EnFx — [сколько, скорость, жизнь мс, размер] */
const HD_VIEW = {
  lim: { runeIn: 60, fly: 760, flyStep: 40, mark: 1240, burst: 1280, title: 1500, cap: 1760, done: 2260, radius: 88 },
  val: { rise: 360, land: 1300, burst: 1340, card: 1680, line: 110, done: 2560, star: 22, gap: 6, from: 150 },
  fx: {
    /* ring — кольцо цвета редкости [радиус, мс, толщина]; ring2 — золотое вслед [задержка мс, радиус в % первого, толщина] */
    lim: { sparks: [34, 230, 760, 5], gold: [18, 150, 950, 4], ring: [64, 640, 3], ring2: [120, 67, 2] },
    /* motes — искры, что поднимаются после вспышки: [сколько раз, шаг мс, искр за раз, скорость, жизнь мс, размер, подъём] */
    val: { sparks: [48, 270, 940, 6], gold: [26, 190, 1150, 4], ring: [84, 780, 3], ring2: [120, 67, 2], motes: [6, 90, 5, 70, 900, 3, 80] },
  },
  grow: 700,       // полоса уровня дорастает до нового значения, мс
  flash: 900,      // место, куда только что легла вещь, вспыхивает, мс
  dragPx: 8,       // сдвиг пальца или мыши, после которого нажатие становится перетаскиванием
  eatMs: 400,      // щелчок сразу после броска гасится: он не должен заново выбрать вещь
  cmpLines: 3,     // строк сравнения в карточке окна; все строки — лист «Свойства и сравнение»
};

/* ================== помощники ================== */
const HD_BP = 10000;   // 100 % в базисных пунктах
const hdFl = (a, b) => Math.floor(a / b);
const hdNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
const hdReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
const hdColor = r => { try { return getComputedStyle(document.documentElement).getPropertyValue('--r' + r).trim() || EnFx.COL.gold; } catch (_) { return '#ddbc7a'; } };
const hdEsc = s => trEsc(String(s == null ? '' : s));
const hdCapOf = lim => INV.hero.capByLim[Math.min(Math.max(0, lim), INV.hero.capByLim.length - 1)];
/* «операция:герой:ещё» — у кнопок номер операции есть всегда; сценарии и проверки зовут действие с одним героем или пустым */
function hdArgs(v) { const s = String(v == null ? '' : v); if (!s.includes(':')) return { op: '', hid: s, x: '' }; const [op, hid, x] = s.split(':'); return { op, hid, x: x || '' }; }
const hdHero = hid => H(hid || S.selHero) || null;
const hdOp = () => 'hd' + S.hd.seq;
/* мощь героя в другом состоянии — та же функция BM (index.html) на копии: другой уровень или доблесть, вещи — те же */
const hdBmAt = (h, o) => BM.hero(Object.assign({}, h, o));
/* запись состава героя — главы и орден (roster.js); у героя отряда прототипа — по черновику (hrTwin, screens/heroes.js) */
const hdTwin = h => (typeof hrTwin === 'function' ? hrTwin(h) : RSI[h.id]) || null;
/* заголовок главы n героя из состава; без состава — null */
function hdChapter(h, n) { const rh = hdTwin(h); return rh && rh.chT && rh.chT[n - 1] != null ? rsChTitle(rh, n - 1) : null; }
/* что открывает доблесть v: записи набора героя с этой доблестью (ADR-0016) — активная, пассивка, реакция или ульта */
function hdOpens(h, v) {
  const K = heroKit(h), L = EB.lib(); if (!K) return [];
  return K.kit.filter(x => x.v === v).map(x => ({ id: x.id, slot: x.slot, n: (L[x.id] || { n: x.id }).n, ab: L[x.id] || null }));
}
const HD_SLOT = { act: 'Способность', pas: 'Пассивка', react: 'Реакция', ult: 'Ульта' };
/* последняя доблесть раскрывает героя (ADR-0022): орден из состава или «вне орденов»; Безликий вспоминает себя */
function hdReveal(h) {
  const rh = hdTwin(h); if (!rh) return null;
  return { donat: rh.src === 'donat', orders: ((rh.team && rh.team.sets) || []).map(k => RSS[k]).filter(Boolean).map(s => s.name) };
}
/* главная характеристика героя — первая степень роста (§3.2): её значок у строки «Характеристики» */
const hdMainSt = h => { const i = (h.gr || []).indexOf(1); return i < 0 ? 0 : i; };
/* руна предела медальоном: знак предела, свет — редкость руны */
const hdRune = (it, cls = '') => it ? `<span class="hdv-rn${cls ? ' ' + cls : ''}" data-r="${it.r}" aria-hidden="true"><b>${it.glyph || ''}</b></span>` : '';
/* цена у кнопки: руна предела — медальоном со знаком, руна доблести — значком доблести; число, у нехватки — «есть / нужно» */
const hdCost = (it, n, have) => `<span class="cost">${it && it.tier === 'valor' ? ICON('valor', 18, 'Руна доблести') : hdRune(it, 'sm')}${have != null && have < n ? `${fmt(have)} / ${fmt(n)}` : fmt(n)}</span>`;

/* ================== знак рунных пределов ==================
   Слово автора 29.09.2026: пять чёрточек у уровня — «слабо», пределы — «слева и справа по бокам» героя. Пять рунных камней — вставки
   в раму портрета: I внизу, V вверху, свет поднимается снизу («Свет снизу»). Пройденный предел горит бирюзой карста; следующий на
   потолке уровня тлеет (wait), а когда рун хватает — пульсирует (ready); остальные погасшие. Один язык везде:
   — шапка листов (hrHead, screens/heroes.js) — столбы камней по бокам лица: пять камней делятся между столбами — слева пределы I–III,
     справа IV–V (RP_VIEW.split), без повтора, поэтому камень почти вдвое крупнее (слова автора 29.09.2026: «нынешние индикаторы —
     слабо, показывать слева и справа по бокам»); в шапке — нарисованный камень. Книга героя (screens/book.js) — замки по правому краю,
     те же состояния: пройден, тлеет, пульсирует, погашен;
   — путь развития — ворота пределов I–V камнями, лист предела, превью доблести и «Что изменилось» — строкой из пяти;
   — анимация пробития — погасший камень в центре, руны слетаются, он загорается; внизу — пять камней героя, новый загорается с ним.
   Камень рисует CSS (.rp-s, hero-dev.css): погасший — фон, горящий со светом — слой ::after, пульс меняет только opacity. Картинка —
   SVG-заглушка в стилях; нарисованный камень (tools/art-gen/jobs/rune-limits.json, слои — rune_stones.py) берут крупные камни
   от 18 px (класс p), как только его пути — в RP_ART.ready. Пределов в круге — INV.hero.capByLim, число в код не вписано */
const RP_ART = {
  ready: ['limits/stone-on.png', 'limits/stone-off.png'],   // выгружены 29.09.2026; без пути — SVG-заглушка той же формы
  on: 'limits/stone-on.png',    // горящий: art/generated/limits/rl-stone__nb2.on.png
  off: 'limits/stone-off.png',  // погасший: art/generated/limits/rl-stone__nb2.off.png
};
const rpTop = () => INV.hero.capByLim.length - 1;   // §10.1: пределов в круге — 5
const rpSay = n => `Рунный предел ${n} из ${rpTop()}`;
/* следующий камень героя аккаунта: на потолке уровня — 'wait' (рун не хватает) или 'ready' (можно пробить); иначе '' */
function rpNext(h) {
  if (!h || h.lvl < h.cap || h.lim >= rpTop()) return '';
  const d = heroDev(h);
  return !d.rune ? '' : d.have >= d.need ? 'ready' : 'wait';
}
/* камни I…V: пройдено n, следующий — в состоянии nx; cls — размер: p — крупный, берёт нарисованный камень */
const rpStones = (n, nx = '', cls = '') => Array.from({ length: rpTop() }, (_, k) => `<i class="rp-s ${k < n ? 'on' : k === n && nx ? nx : 'off'}${cls ? ' ' + cls : ''}"></i>`).join('');
/* столбы у портрета делят камни: слева — пределы с первого по split-й, справа — остальные; вид, не баланс */
const RP_VIEW = { split: 3 };
/* камни с from по to − 1: пройдено n, следующий — в состоянии nx; cls — размер (p — нарисованный камень) */
const rpRange = (n, nx, from, to, cls = '') => Array.from({ length: Math.max(0, to - from) }, (_, j) => { const k = from + j; return `<i class="rp-s ${k < n ? 'on' : k === n && nx ? nx : 'off'}${cls ? ' ' + cls : ''}"></i>`; }).join('');
/* столб камней у портрета: kind — t (плитка) или h (шапка карточки), side — l (пределы I…split) или r (остальные); камни снизу вверх */
const rpPost = (n, nx, kind, side) => { const m = Math.min(RP_VIEW.split, rpTop()), cls = kind === 'h' ? 'p' : ''; return `<span class="rp ${kind} ${side}" aria-hidden="true">${side === 'l' ? rpRange(n, nx, 0, m, cls) : rpRange(n, nx, m, rpTop(), cls)}</span>`; };
/* строка из пяти камней — в листах, превью и UI-ките */
const rpRow = (n, nx = '') => `<span class="rp i" role="img" aria-label="${rpSay(n)}" title="${rpSay(n)}">${rpStones(n, nx)}</span>`;
/* нарисованный камень — адреса в переменные <html>, как значки --ico-*; до выгрузки CSS берёт SVG-заглушку */
(function rpArtVars() {
  if (!RP_ART.ready.includes(RP_ART.on) || !RP_ART.ready.includes(RP_ART.off)) return;
  const abs = p => (typeof artAbs === 'function' ? artAbs(p) : AV(p));
  try { const st = document.documentElement.style; st.setProperty('--rp-on-p', `url("${abs(RP_ART.on)}")`); st.setProperty('--rp-off-p', `url("${abs(RP_ART.off)}")`); } catch (_) { }
})();

/* ================== развитие на запасах (§10, ADR-0014) ==================
   Предел — INV.hero.runesPerLimit рун своего предела цикла героя; доблесть — одна руна доблести цикла героя, только на пятом пределе.
   Руну собирают из осколков в мастерской (рецепт — recipes.js). Исключение — руна обучения (HD_DATA.train): на любом пределе.
   step — следующий шаг: уровень, предел, доблесть или путь пройден */
/* руна обучения подходит герою: она есть у аккаунта, герой — её цикла и берёт первую доблесть, личный максимум её допускает */
const hdTrain = h => !!(S && S.hd && S.hd.train > 0) && h.cycle === HD_DATA.train.cyc && h.valor === 0 && h.maxV > 0;
/* какой руной будет доблесть: обычной — на пятом пределе, если она есть; иначе руной обучения, если она подходит */
const hdUseTrain = (h, d) => !!d.train && !(d.open && d.vrHave > 0);
function heroDev(h) {
  const D = INV.hero, top = D.capByLim.length - 1, c = h.cycle;
  const rune = h.lim < top ? limitRune(c, h.lim + 1) : null;
  const vr = cycItems('valor', c)[0] || null, vs = cycItems('vshard', c)[0] || null;
  const rec = vr ? (RX_OUT[vr.id] || []).find(r => !r.team) || null : null, part = rec && vs ? rec.in.find(([id]) => id === vs.id) : null;
  const d = { top, atCap: h.lvl >= h.cap, rune, have: rune ? BAG.qty(rune.id) : 0, need: D.runesPerLimit,
    vr, vrHave: vr ? BAG.qty(vr.id) : 0, vs, vsHave: vs ? BAG.qty(vs.id) : 0, vsNeed: part ? part[1] : 0, rec, open: h.lim >= D.valorAtLim };
  d.step = h.lvl < h.cap ? 'lvl' : h.lim < top ? 'limit' : h.valor < h.maxV ? 'valor' : 'done';
  d.craft = !d.vrHave && !!d.rec && d.vsNeed > 0 && d.vsHave >= d.vsNeed;   // руну доблести можно собрать из осколков
  d.train = hdTrain(h);   // руна обучения подходит: на любом пределе
  return d;
}
/* сколько уровней поднять: выбор «сколько за раз»; «Макс» — сколько хватает духа, но не выше потолка; хотя бы один */
function hdQty(h) {
  const room = Math.max(0, h.cap - h.lvl); if (!room) return 0;
  if (S.qty !== 'max') return Math.min(Math.max(1, +S.qty || 1), room);
  let q = 0, c = 0;
  while (q < room) { const n = lvlCost(h.lvl + q, 1); if (c + n > S.wallet.spirit) break; c += n; q++; }
  return Math.max(1, q);
}
const hdLimCan = h => { const d = heroDev(h); return !!d.rune && d.atCap && d.have >= d.need; };
const hdValCan = h => { const d = heroDev(h); return h.valor < h.maxV && ((d.open && d.vrHave > 0) || hdUseTrain(h, d)); };
/* снимок героя до и после операции — для превью и карточки «Что изменилось» */
const hdSnap = h => ({ valor: h.valor, lvl: h.lvl, lim: h.lim, cap: h.cap, st: heroSt(h), bm: h.bm });

/* ================== «сервер» ==================
   Уровень, предел и доблесть — одним вызовом: проверка, расход из кошелька и запасов, изменение героя, итог. Номер операции несут
   кнопки: повтор того же номера возвращает прежний итог и ничего не меняет. Отказ не записывается. Итог решён до анимации:
   анимация его только показывает. В игре операции и их итог — на сервере */
const HD_SRV = {
  run(op, f) {
    const O = S.hd.srv;
    if (O[op]) return Object.assign({ again: true }, O[op]);
    const r = f();
    if (!r.refuse) { O[op] = r; S.hd.seq++; }
    return r;
  },
  lvl(op, hid, q) {
    return HD_SRV.run(op, () => {
      const h = H(hid); if (!h) return { refuse: 'hero' };
      const room = h.cap - h.lvl; if (room <= 0) return { refuse: 'top' };
      const n = Math.min(Math.max(1, q | 0), room), cost = lvlCost(h.lvl, n);
      if (S.wallet.spirit < cost) return { refuse: 'spirit' };
      const bm0 = h.bm, from = h.lvl;
      S.wallet.spirit -= cost; h.lvl = from + n;
      return { ok: 'lvl', hid: h.id, from, to: h.lvl, cost, bm: [bm0, h.bm] };
    });
  },
  limit(op, hid) {
    return HD_SRV.run(op, () => {
      const h = H(hid); if (!h) return { refuse: 'hero' };
      const d = heroDev(h);
      if (!d.rune) return { refuse: 'done' };
      if (!d.atCap) return { refuse: 'cap' };
      if (d.have < d.need || !BAG.take(d.rune.id, d.need)) return { refuse: 'runes' };
      const was = { lim: h.lim, cap: h.cap };
      h.lim = was.lim + 1; h.cap = hdCapOf(h.lim);
      return { ok: 'limit', hid: h.id, r: h.r, rune: d.rune.id, glyph: d.rune.glyph, need: d.need, lim: [was.lim, h.lim], cap: [was.cap, h.cap] };
    });
  },
  valor(op, hid) {
    return HD_SRV.run(op, () => {
      const h = H(hid); if (!h) return { refuse: 'hero' };
      const d = heroDev(h), tr = hdUseTrain(h, d);   // руна обучения — на любом пределе; на пятом с обычной руной — обычная
      if (h.valor >= h.maxV) return { refuse: 'max' };
      if (!d.open && !tr) return { refuse: 'early' };
      if (tr) S.hd.train--;
      else if (!d.vr || !BAG.take(d.vr.id, 1)) return { refuse: 'rune' };
      const was = hdSnap(h);
      h.keep = was.lim;   // пределы прошлого круга: их РП сила коллекции держит на прежнем круге (collHero, §10.3)
      h.valor = was.valor + 1; h.lvl = 0; h.lim = 0; h.cap = hdCapOf(0);   // §10.2: уровень — в 0, пределы проходятся заново
      const now = hdSnap(h), last = h.valor >= h.maxV;
      return { ok: 'valor', hid: h.id, r: h.r, rune: tr ? '' : d.vr.id, train: tr, was, now, last, maxV: h.maxV,
        opens: hdOpens(h, h.valor).map(x => ({ id: x.id, slot: x.slot, n: x.n })), ch: hdChapter(h, h.valor), reveal: last ? hdReveal(h) : null };
    });
  },
};
const HD_WHY = {
  hero: () => 'Такого героя нет.',
  top: h => `Потолок уровня — ${h.cap}: дальше ведёт рунный предел.`,
  spirit: () => 'Не хватает духа.',
  done: () => 'Все рунные пределы этого круга пройдены.',
  cap: h => `Рунный предел откроется на уровне ${h.cap}.`,
  runes: (h, d) => `Не хватает рун предела: есть ${fmt(d.have)} из ${fmt(d.need)}.`,
  max: () => 'Это личный максимум доблести героя.',
  early: () => `Доблесть откроется после рунного предела ${ROMAN[INV.hero.valorAtLim]}.`,
  rune: () => 'Нет руны доблести: её собирают из осколков.',
};

/* ================== вкладка «Развитие» ==================
   Путь героя: пять отрезков уровня (0–50, 50–150, …, 700–1200), ворота рунных пределов I–V — рунные камни, в конце — звезда доблести.
   Пройденный отрезок светится золотом, пройденный камень горит, текущий отрезок заполнен уровнем; следующий камень — кнопка: что нужно
   и что будет, на потолке уровня он тлеет, а когда рун хватает — пульсирует. Ниже — следующий шаг героя одной карточкой с одним
   действием; характеристики — тихой строкой */
function hdPath(h, d) {
  const caps = INV.hero.capByLim, lv = S.hd.lv && S.hd.lv.hid === h.id && hdNow() - S.hd.lv.t0 < HD_VIEW.grow ? S.hd.lv : null;
  const nx = d.atCap && d.rune ? (d.have >= d.need ? 'ready' : 'wait') : '';   // следующий камень — как на плитке (rpNext)
  const cells = [];
  for (let k = 0; k < d.top; k++) {
    const lo = k ? caps[k - 1] : 0, hi = caps[k], span = Math.max(1, hi - lo);
    const f = k < h.lim ? 100 : k > h.lim ? 0 : Math.min(100, hdFl(Math.max(0, h.lvl - lo) * 100, span));
    const f0 = lv && k === h.lim ? Math.min(100, hdFl(Math.max(0, lv.from - lo) * 100, span)) : f;
    const st = k < h.lim ? 'done' : k === h.lim ? 'cur' : '';
    cells.push(`<span class="hdv-seg${st ? ' ' + st : ''}${f0 !== f ? ' grow' : ''}" style="--f:${f};--f0:${f0}${lv ? `;--el:${hdNow() - lv.t0}` : ''}"><i></i></span>`);
    const g = k + 1, gst = k < h.lim ? 'done' : k === h.lim ? `next${nx ? ' ' + nx : ''}` : 'far';
    const stone = `<i class="rp-s ${k < h.lim ? 'on' : k === h.lim && nx ? nx : 'off'} p"></i>`;
    const tip = k < h.lim ? `Рунный предел ${ROMAN[g]} пройден` : `Рунный предел ${ROMAN[g]} — на уровне ${hi}${k === h.lim && nx === 'ready' ? ' · руны готовы' : ''}`;
    cells.push(k === h.lim
      ? `<button class="hdv-gate ${gst}" data-v="${h.id}" data-a="limit" title="${tip}" aria-label="${tip}">${stone}<small class="num">${hi}</small></button>`
      : `<span class="hdv-gate ${gst}" title="${tip}">${stone}<small class="num">${hi}</small></span>`);
  }
  const vst = h.valor >= h.maxV ? 'max' : d.open || d.train ? 'ready' : 'lock', dot = h.valor < h.maxV && (d.vrHave > 0 || d.craft || d.train);
  const vtip = vst === 'max' ? `Доблесть ${h.valor} из ${h.maxV} — личный максимум` : `Доблесть ${h.valor + 1} из ${h.maxV}${vst === 'ready' ? (d.open ? ' — открыта' : ' — руна обучения: можно на любом пределе') : ` — после рунного предела ${ROMAN[INV.hero.valorAtLim]}`}${dot && d.open ? ' · руна готова или собирается' : ''}`;
  const star = `<button class="hdv-star ${vst}${dot ? ' dot' : ''}" data-v="${h.id}" data-a="valor" title="${vtip}" aria-label="${vtip}">${ICON('valor', 24, 'Доблесть')}<small>${vst === 'max' ? 'максимум' : 'доблесть'}</small></button>`;
  const say = `Путь героя: уровень ${h.lvl} из ${h.cap}, рунный предел ${h.lim} из ${d.top}, доблесть ${h.valor} из ${h.maxV}`;
  return `<div class="hdv-path" role="group" aria-label="${say}"><div class="hdv-track">${cells.join('')}</div>${star}</div>`;
}
/* карточка следующего шага: значок, что будет, под ним — подробность одной строкой; справа — одно действие с ценой */
const hdCard = (k, ico, t, sub, act) => `<div class="hdv-next" data-k="${k}"><span class="hdv-ic">${ico}</span><div class="hdv-tx"><b class="hdv-t">${t}</b><div class="hdv-sub">${sub}</div></div><div class="hdv-act">${act}</div></div>`;
function hdNext(h, d) {
  if (d.step === 'lvl') {
    const q = hdQty(h), to = h.lvl + q, cost = lvlCost(h.lvl, q), can = cost <= S.wallet.spirit, gain = hdBmAt(h, { lvl: to }) - h.bm;
    const qty = `<div class="qty" role="group" aria-label="Сколько уровней за раз">${HD_DATA.qty.map(v => `<button aria-pressed="${S.qty === v}" data-a="qty" data-v="${v}">${v === 'max' ? 'Макс' : '+' + v}</button>`).join('')}</div>`;
    const sub = `${qty}${gain > 0 ? `<span class="chip spirit" title="Боевая мощь вырастет">${ICON('power', 13, 'Боевая мощь')}+${fmt(gain)}</span>` : ''}${can ? '' : '<button class="link" data-a="sheet" data-v="cur:spirit">Где взять дух</button>'}`;
    return hdCard('lvl', ic('up'), `Уровень <span class="num">${h.lvl}</span> → <span class="num">${to}</span>`, sub,
      `<button class="btn go hdv-go" data-v="${hdOp()}:${h.id}:${q}" data-a="lvlup"${can ? '' : ' disabled'}>Поднять${costTag('spirit', cost)}</button>`);
  }
  if (d.step === 'limit') {
    const k = h.lim + 1, cap = hdCapOf(k), can = !!d.rune && d.have >= d.need;
    if (!d.rune) return hdCard('limit', '<i class="rp-s off p"></i>', `Рунный предел ${ROMAN[k]}`, '<span>Руны этого предела пока нет в запасах игры.</span>', `<button class="btn hdv-go" data-v="${h.id}" data-a="limit" disabled>Пробить</button>`);
    const sub = `<span>${cap > h.cap ? `Потолок уровня <span class="num">${h.cap}</span> → <span class="num">${cap}</span>` : 'За ним — доблесть'}</span>${can ? '' : `<button class="link" data-a="item" data-v="${d.rune.id}">Где взять руны</button>`}`;
    /* значок шага — камень этого предела: с рунами горит ровно — таким он станет, без рун тлеет; пульсирует сам камень на пути,
       в шапке и на плитке, здесь светится главная кнопка. Руна — в цене у кнопки */
    return hdCard('limit', `<i class="rp-s ${can ? 'on' : 'wait'} p"></i>`, `Рунный предел ${ROMAN[k]}`, sub,
      `<button class="btn${can ? ' go' : ''} hdv-go" data-v="${h.id}" data-a="limit"${can ? '' : ' disabled'}>Пробить${hdCost(d.rune, d.need, d.have)}</button>`);
  }
  if (d.step === 'valor') {
    const nv = h.valor + 1, t = `Доблесть <span class="num">${nv}</span> из <span class="num">${h.maxV}</span>`;
    if (d.vrHave) return hdCard('valor', ICON('valor', 30, 'Доблесть'), t, `<span>Навсегда +${INV.hero.valorPct} % к характеристикам${hdOpens(h, nv).length ? ' и новая способность' : ''}</span>`,
      `<button class="btn go hdv-go" data-v="${h.id}" data-a="valor">Взять доблесть</button>`);
    const sub = `<span>Руна доблести — из осколков: <span class="num">${fmt(d.vsHave)} / ${fmt(d.vsNeed)}</span></span><button class="link" data-v="${h.id}" data-a="valor">Что даст</button>`;
    return hdCard('valor', ICON('valor', 30, 'Доблесть'), t, sub, d.craft ? `<button class="btn go hdv-go" data-a="valorcraft" data-v="${d.rec.id}">Собрать руну</button>`
      : `<button class="btn go hdv-go" data-a="item" data-v="${d.vs ? d.vs.id : ''}">Где взять осколки</button>`);
  }
  return hdCard('done', ICON('valor', 30, 'Доблесть'), 'Путь пройден', `<span>Доблесть ${h.maxV} из ${h.maxV}, уровень ${h.cap}: герой раскрыт полностью</span>`,
    `<button class="btn hdv-go" data-a="seg" data-v="hero:skills">Навыки</button>`);
}
/* вкладка «Развитие»: путь, следующий шаг, характеристики тихой строкой — значки и числа; нажатие — лист «Характеристики»:
   что даёт каждая, степень роста и атрибуты */
function hdPower(h) {
  const d = heroDev(h);
  return `<div class="hdv" data-step="${d.step}">${hdPath(h, d)}${hdNext(h, d)}
    <div class="hdv-quiet" data-a="sheet" data-v="hattr:${h.id}" title="Характеристики и атрибуты">${statStrip(h)}<button class="iconbtn hdv-more" data-a="sheet" data-v="hattr:${h.id}" aria-label="Характеристики и атрибуты">${ic('info')}</button></div></div>`;
}

/* ================== лист «Рунный предел» ================== */
function hdLimSheet(o) {
  const h = H(o.arg), D0 = INV.hero; if (!h) return '';
  const d = heroDev(h);
  if (!d.rune) return dialog('Рунные пределы', `<div class="hdl-who">${rpRow(h.lim)}</div><p class="muted hdv-lead">Все пять рунных пределов этого круга пройдены.${h.valor < h.maxV ? ' Дальше — доблесть.' : ''}</p>`, '<button class="btn" data-a="close">Понятно</button>', 'hdv-dlg');
  const k = h.lim + 1, cap = hdCapOf(k), can = d.atCap && d.have >= d.need;
  /* главное — камень этого предела: погасший, на потолке тлеет, с рунами пульсирует; рядом с именем — пять камней героя, какие
     уже горят: пульсирует один камень, крупный */
  const nx = can ? 'ready' : d.atCap ? 'wait' : '';
  const body = `<div class="hdl"><span class="hdl-st"><i class="rp-s ${nx || 'off'} p"></i></span>
      <div class="col" style="gap:4px;min-width:0"><span class="hdl-who"><span class="eyebrow">${hdEsc(h.name)}</span>${rpRow(h.lim)}</span>
        <b class="hdl-t">${cap > h.cap ? `Потолок уровня <span class="num">${h.cap}</span> → <span class="num">${cap}</span>` : 'Путь к доблести'}</b>
        <small class="faint">${cap > h.cap ? 'Без рун герой не растёт выше потолка.' : 'Последний предел круга: за ним — доблесть.'}</small></div></div>
    <dl class="kv hdl-kv"><dt>Нужно</dt><dd><button class="link" data-a="item" data-v="${d.rune.id}">${hdEsc(itName(d.rune))}</button> × ${fmt(d.need)}</dd><dt>В запасах</dt><dd class="${d.have >= d.need ? '' : 'warn'}">${fmt(d.have)}</dd></dl>
    ${!d.atCap ? `<p class="reason">Сначала уровень ${h.cap}: осталось ${fmt(h.cap - h.lvl)}.</p>` : d.have < d.need ? `<p class="reason warn">Не хватает ${fmt(d.need - d.have)}.</p>` : ''}
    ${TM(`§10.1: предел — ${D0.runesPerLimit} рун своего предела цикла героя, потолки ${D0.capByLim.join(' / ')}; доблесть — на пределе ${ROMAN[D0.valorAtLim]} (ADR-0014). Итог решает HD_SRV.limit с номером операции.`, 'p', 'reason')}`;
  const foot = can && o.v ? `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="limitdo" data-v="${o.v}">Пробить${hdCost(d.rune, d.need)}</button>`
    : `${d.have < d.need ? `<button class="btn ghost" data-a="item" data-v="${d.rune.id}">Где взять</button>` : ''}<button class="btn" data-a="close">Понятно</button>`;
  return dialog(`Рунный предел ${ROMAN[k]}`, body, foot, 'hdv-dlg');
}

/* ================== лист «Доблесть»: честное превью (§10.4, §33.2) ==================
   До подтверждения игрок видит: что получит герой — доблесть, +30 % к характеристикам, способность, главу, на последней — раскрытие;
   что начнётся заново — уровень, рунные пределы и мощь сейчас; что сохранится. Цена — у кнопки. Недоступно — причина и путь к руне */
function hdPreview(h) {
  const v = h.valor, nv = v + 1, rh = hdTwin(h);
  return { v, nv, lvl: h.lvl, lim: h.lim, st0: heroSt(h), st1: valorSt(h.st, nv), opens: hdOpens(h, nv), ch: hdChapter(h, nv), last: nv >= h.maxV,
    donat: !!rh && rh.src === 'donat', bm0: h.bm, bm1: hdBmAt(h, { valor: nv, lvl: 0 }), bmSame: hdBmAt(h, { valor: nv }) };
}
/* строка превью и карточки «Что изменилось»: значок, что, было → стало; под ней — подробность */
function hdRow(ico, k, was, now, note, cls = '') {
  return `<div class="hdv-r${cls ? ' ' + cls : ''}"><span class="ic">${ico}</span><span class="k">${k}</span><span class="v">${was != null && was !== '' ? `<s>${was}</s><i class="to" aria-hidden="true">${ic('arrow')}</i>` : ''}<b>${now}</b></span>${note ? `<span class="nt">${note}</span>` : ''}</div>`;
}
/* пять характеристик мелко: значок, новое число и прибавка */
const hdStMini = (a, b) => `<span class="hdv-st">${b.map((x, i) => `<span title="${STATS[i]}: ${a[i]} → ${x}">${ICON(STAT_IC[i], 14, STATS[i])}<b class="num">${x}</b>${x > a[i] ? `<i class="num">+${x - a[i]}</i>` : ''}</span>`).join('')}</span>`;
/* значок открытой способности: иконка сеткой (abArt, screens/art-icons.js), без неё — прежний вектор */
const hdAbIco = x => (x.ab && typeof abArt === 'function' && abArt(x.ab, 24)) || ic(x.slot === 'ult' ? 'crown' : x.ab ? abIcon(x.ab) : 'spark');
/* цена руной обучения у кнопки: тот же значок доблести, подпись — руна обучения */
const hdTrainCost = () => `<span class="cost">${ICON('valor', 18, 'Руна обучения')}1</span>`;
function hdValBody(h, P, train) {
  const gain = [hdRow(ICON('valor', 18, 'Доблесть'), 'Доблесть', String(P.v), `${P.nv} из ${h.maxV}`),
    hdRow(ICON(STAT_IC[hdMainSt(h)], 18, 'Характеристики'), 'Характеристики', '', `+${INV.hero.valorPct} %`, hdStMini(P.st0, P.st1))]
    .concat(P.opens.map(x => hdRow(hdAbIco(x), HD_SLOT[x.slot] || 'Способность', '', `«${hdEsc(x.n)}»`)))
    .concat(P.ch != null ? [hdRow(ic('book'), `Глава ${ROMAN[P.nv]}`, '', `«${hdEsc(P.ch)}»`)] : [])
    .concat(P.last ? [P.donat ? hdRow(ic('eye'), 'Память', '', 'вспомнит, кем был') : hdRow(ic('flag'), 'Орден', '', 'раскроет последняя глава')] : []);
  const loss = [hdRow(ic('up'), 'Уровень', String(P.lvl), '0'),
    hdRow(ic('gem'), 'Рунный предел', rpRow(P.lim), rpRow(0)),
    hdRow(ICON('power', 18, 'Боевая мощь'), 'Мощь', fmt(P.bm0), fmt(P.bm1), `на уровне ${P.lvl} станет ${fmt(P.bmSame)}`)];
  const lead = P.last ? `Последняя доблесть: ${hdEsc(h.name)} раскроется полностью. Уровень и рунные пределы начнутся заново.`
    : `${hdEsc(h.name)} навсегда станет сильнее. Уровень и рунные пределы начнутся заново.`;
  return `<p class="hdv-lead">${lead}</p>${train ? `<p class="rs-line">${ICON('valor', 18, '')}Руна обучения: можно на любом пределе</p>` : ''}
    <div class="hdv-pv"><section class="gain"><span class="eyebrow">Получит</span>${gain.join('')}</section>
      <section class="loss"><span class="eyebrow">Начнёт заново</span>${loss.join('')}<p class="hdv-keep">Останутся снаряжение, талисманы и сила коллекции: пройденные заново пределы усилят её вдвое.</p></section></div>
    ${TM(`§10.2, §10.4, §3.3, ADR-0016: +${INV.hero.valorPct} % к базовым характеристикам за ступень, накопительно, целыми — valorSt; способность — запись набора с доблестью ${P.nv}; мощь — BM на копии героя. Итог решает HD_SRV.valor с номером операции, анимация его только показывает.`, 'p', 'reason')}`;
}
function hdValSheet(o) {
  const h = H(o.arg); if (!h) return '';
  const d = heroDev(h);
  if (h.valor >= h.maxV) return dialog('Доблесть', `<p class="hdv-lead">Это личный максимум героя: доблесть ${h.valor} из ${h.maxV}. Больше ступеней у ${hdEsc(h.name)} нет.</p>`, '<button class="btn" data-a="close">Понятно</button>', 'hdv-dlg');
  const P = hdPreview(h), tr = hdUseTrain(h, d), can = h.valor < h.maxV && ((d.open && d.vrHave > 0) || tr) && !!o.v;
  const why = !d.open ? `Откроется после рунного предела ${ROMAN[INV.hero.valorAtLim]}.` : !d.vrHave ? `Нужна руна доблести: осколков ${fmt(d.vsHave)} из ${fmt(d.vsNeed)}.` : '';
  const get = d.vrHave || tr ? '' : d.craft ? `<button class="btn ghost" data-a="valorcraft" data-v="${d.rec.id}">Собрать руну</button>` : d.vs ? `<button class="btn ghost" data-a="item" data-v="${d.vs.id}">Где взять</button>` : '';
  const foot = can ? `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="valordo" data-v="${o.v}">Взять доблесть${tr ? hdTrainCost() : hdCost(d.vr, 1)}</button>`
    : `<span class="reason hdv-why">${why}</span>${get}<button class="btn" data-a="close">Понятно</button>`;
  return dialog(`Доблесть ${P.nv} из ${h.maxV}`, hdValBody(h, P, tr), foot, 'hdv-dlg wide');
}

/* ================== анимации уровня A: пробитие предела и доблесть ==================
   Итог уже решён сервером (S.hd.srv), анимация его только показывает. Время — CSS от начала показа: задержки --d… отсчитаны от него,
   --el — сколько прошло, поэтому перерисовка экрана посреди анимации её не рвёт. Нажатие на сцену — сразу итог; prefers-reduced-motion —
   итог без движения. Частицы — EnFx в слое .hdv-fxl рядом с #game: перерисовка экрана его не сносит */
let hdTimers = [], hdFxI = null;
function hdFxLayer() {
  if (!window.EnFx) return null;
  const g = document.getElementById('game'), p = g && g.parentElement;
  if (!p || !p.querySelector) return null;
  let L = p.querySelector(':scope > .hdv-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'hdv-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  if (!hdFxI || hdFxI.host !== L) { if (hdFxI) hdFxI.destroy(); try { hdFxI = EnFx.create(L); } catch (_) { hdFxI = null; } }
  return hdFxI;
}
function hdStop() { for (const t of hdTimers) clearTimeout(t); hdTimers = []; }
/* вспышка частиц у элемента сцены: цвет — редкость героя, золото и искры */
function hdBurst(sel, P, r) {
  const fx = hdFxLayer(), el = document.querySelector(sel); if (!fx || !el) return;
  const b = fx.center(el), c = hdColor(r), C = EnFx.COL;
  fx.ring(b.x, b.y, c, ...P.ring);
  const [d2, k2, w2] = P.ring2; setTimeout(() => fx.ring(b.x, b.y, C.gold, hdFl(P.ring[0] * k2, 100), P.ring[1], w2), d2);
  fx.burst(b.x, b.y, c, ...P.sparks);
  fx.burst(b.x, b.y, C.gold, ...P.gold, { shape: 'streak', w: 1.4 });
  if (P.motes) { const [n, step, k, sp, life, size, up] = P.motes; for (let i = 0; i < n; i++) setTimeout(() => fx.burst(b.x, b.y, i % 2 ? C.gold : c, k, sp, life, size, { ay: -up, drag: 1.2, fade: 'in' }), i * step); }
}
function hdPlay(op, r) {
  hdStop();
  const reduced = hdReduced();
  S.hd.fx = { op, t0: hdNow(), skip: reduced };
  S.overlay = { t: 'hdfx', arg: op };
  render();
  if (reduced) return;
  if (r.ok === 'limit') hdTimers.push(setTimeout(() => hdBurst('.g .hdfx-mark', HD_VIEW.fx.lim, r.r), HD_VIEW.lim.burst));
  else hdTimers.push(setTimeout(() => hdBurst('.g .hdfx-stars i.new', HD_VIEW.fx.val, r.r), HD_VIEW.val.burst));
}
const hdFxDone = () => { const F = S.hd.fx, r = F && S.hd.srv[F.op]; if (!F || !r) return true; return F.skip || hdNow() - F.t0 >= (r.ok === 'limit' ? HD_VIEW.lim.done : HD_VIEW.val.done); };
/* пробитие предела: в центре — погасший рунный камень; руны кольцом появляются, вспыхивают и слетаются в него, камень загорается;
   под ним — пять камней героя, новый загорается вместе с ним; потолок уровня — новый */
function hdFxLim(r, el, done, h) {
  const V = HD_VIEW.lim, n = r.need;
  const runes = Array.from({ length: n }, (_, i) => `<i style="--a:${hdFl(360 * i, n)}deg;--d:${i * V.runeIn};--df:${V.fly + i * V.flyStep}"><b>${r.glyph}</b></i>`).join('');
  const row = Array.from({ length: rpTop() }, (_, k) => `<i class="rp-s ${k < r.lim[1] ? 'on' : 'off'}${k === r.lim[1] - 1 ? ' new' : ''}"></i>`).join('');
  const up = r.cap[1] > r.cap[0];
  return `<div class="ov hdfx hdfx-lim${done ? ' done' : ''}" data-r="${r.r}" role="dialog" aria-modal="true" aria-label="Рунный предел ${r.glyph} пройден" style="--el:${el};--rr:${V.radius}px;--dm:${V.mark};--dt:${V.title};--dc:${V.cap};--dd:${V.done}">
    <button class="hdfx-skip" data-a="hdskip" aria-label="Пропустить анимацию" tabindex="-1"></button>
    <div class="hdfx-stage" aria-hidden="true"><span class="hdfx-halo"></span><span class="hdfx-mark"><i class="rp-s on p"></i></span><span class="hdfx-runes">${runes}</span><span class="hdfx-row">${row}</span></div>
    <div class="hdfx-txt"><span class="eyebrow">${hdEsc(h ? h.name : '')}</span><b class="hdfx-t">Рунный предел ${r.glyph}</b>
      <span class="hdfx-cap">${up ? `Потолок уровня <s class="num">${r.cap[0]}</s> <b class="num">${r.cap[1]}</b>` : '<b>Путь к доблести открыт</b>'}</span>
      <button class="btn go hdfx-ok" data-a="hdfxok">Дальше</button></div></div>`;
}
/* строки «Что изменилось»: по строке на изменение, было → стало */
function hdChanges(r, h) {
  const pct = INV.hero.valorPct, rows = [hdRow(ICON('valor', 18, 'Доблесть'), 'Доблесть', String(r.was.valor), `${r.now.valor} из ${r.maxV}`, '', 'up'),
    hdRow(ICON(STAT_IC[h ? hdMainSt(h) : 0], 18, 'Характеристики'), 'Характеристики', '', `+${pct} %`, hdStMini(r.was.st, r.now.st), 'up')];
  for (const x of r.opens) rows.push(hdRow(hdAbIco({ slot: x.slot, ab: EB.lib()[x.id] }), HD_SLOT[x.slot] || 'Способность', '', `«${hdEsc(x.n)}»`, '', 'up'));
  if (r.ch != null) rows.push(hdRow(ic('book'), `Глава ${ROMAN[r.now.valor]}`, '', `«${hdEsc(r.ch)}»`, '', 'up'));
  if (r.reveal) rows.push(r.reveal.donat ? hdRow(ic('eye'), 'Память', '', 'вернулась', '', 'up')
    : hdRow(ic('flag'), 'Орден', '', r.reveal.orders.length ? r.reveal.orders.map(n => `«${hdEsc(n)}»`).join(', ') : 'вне орденов', '', 'up'));
  rows.push(hdRow(ic('up'), 'Уровень', String(r.was.lvl), '0'), hdRow(ic('gem'), 'Рунный предел', rpRow(r.was.lim), rpRow(0)),
    hdRow(ICON('power', 18, 'Боевая мощь'), 'Мощь', fmt(r.was.bm), fmt(r.now.bm), 'вырастет с уровнем'));
  return rows;
}
/* доблесть: свет редкости героя, значок доблести взлетает и встаёт на место, карточка «Что изменилось» — по строке */
function hdFxVal(r, el, done, h) {
  const V = HD_VIEW.val, k = r.now.valor - 1, sx = hdFl((2 * k - (r.maxV - 1)) * (V.star + V.gap), 2);
  const stars = Array.from({ length: r.maxV }, (_, i) => `<i class="${i < k ? 'on' : i === k ? 'on new' : ''}"></i>`).join('');
  const rows = hdChanges(r, h).map((x, i) => `<li style="--k:${i}">${x}</li>`).join('');
  return `<div class="ov hdfx hdfx-val${done ? ' done' : ''}" data-r="${r.r}" role="dialog" aria-modal="true" aria-label="Доблесть ${r.now.valor}: что изменилось" style="--el:${el};--sx:${sx}px;--sf:${V.from}px;--dr:${V.rise};--dl:${V.land};--dcard:${V.card};--dline:${V.line};--dd:${V.done};--st:${V.star}px;--sg:${V.gap}px">
    <button class="hdfx-skip" data-a="hdskip" aria-label="Пропустить анимацию" tabindex="-1"></button>
    <div class="hdfx-stage" aria-hidden="true"><span class="hdfx-light"></span><span class="hdfx-face"><img src="${h ? h.img : ''}" alt=""></span>
      <span class="hdfx-stars">${stars}</span><span class="hdfx-rise">${ICON('valor', 40, '')}</span></div>
    <aside class="hdfx-card"><span class="eyebrow">${hdEsc(h ? h.name : '')} · что изменилось</span><ul>${rows}</ul>
      <div class="hdfx-f">${r.ch != null ? '<button class="link" data-a="hdread">Читать главу</button>' : ''}<span class="g-spacer"></span><button class="btn go hdfx-ok" data-a="hdfxok">Готово</button></div></aside></div>`;
}
function hdFxSheet(o) {
  const F = S.hd.fx, r = F && S.hd.srv[o.arg]; if (!F || !r || F.op !== o.arg) return '';
  const h = H(r.hid), el = F.skip ? 0 : Math.max(0, hdNow() - F.t0);   // итог (.done) — без анимаций, время не нужно
  return r.ok === 'limit' ? hdFxLim(r, el, F.skip, h) : hdFxVal(r, el, F.skip, h);
}
Object.assign(OV, { hdlim: hdLimSheet, hdval: hdValSheet, hdfx: hdFxSheet });

/* ================== действия развития ================== */
Object.assign(ACT, {
  qty(v) { S.qty = v === 'max' ? 'max' : Math.max(1, +v || 1); render(); },
  /* уровень: v — «операция:герой:сколько»; без номера — выбор «сколько за раз» у выбранного героя */
  lvlup(v) {
    const a = hdArgs(v), h = hdHero(a.hid); if (!h) return;
    const r = HD_SRV.lvl(a.op || hdOp(), h.id, a.x ? +a.x : hdQty(h));
    if (r.again) return;
    if (r.refuse) return toast(HD_WHY[r.refuse](h));
    S.hd.lv = { hid: h.id, from: r.from, to: r.to, t0: hdNow() };   // полоса уровня дорастает до нового
    toast(`${h.name}: уровень ${r.to}`);
  },
  /* предел: ворота на пути и кнопка «Пробить» открывают лист — сколько нужно, сколько есть, что будет; подтверждение несёт номер */
  limit(v) {
    const h = hdHero(hdArgs(v).hid); if (!h) return;
    S.overlay = Object.assign({ t: 'hdlim', arg: h.id }, hdLimCan(h) ? { act: 'limitdo', v: `${hdOp()}:${h.id}` } : {});
    render(); focusOverlay();
  },
  limitdo(v) {
    const a = hdArgs(v), h = hdHero(a.hid); if (!h) return close();
    const op = a.op || hdOp(), r = HD_SRV.limit(op, h.id);
    if (r.again) return close();
    if (r.refuse) { toast(HD_WHY[r.refuse](h, heroDev(h))); return close(); }
    hdPlay(op, r);
  },
  /* доблесть: звезда на пути и кнопка шага открывают превью; подтвердить можно только на пятом пределе и с руной */
  valor(v) {
    const h = hdHero(hdArgs(v).hid); if (!h) return;
    S.overlay = Object.assign({ t: 'hdval', arg: h.id }, hdValCan(h) ? { act: 'valordo', v: `${hdOp()}:${h.id}` } : {});
    render(); focusOverlay();
  },
  valordo(v) {
    const a = hdArgs(v), h = hdHero(a.hid); if (!h) return close();
    const op = a.op || hdOp(), r = HD_SRV.valor(op, h.id);
    if (r.again) return close();
    if (r.refuse) { toast(HD_WHY[r.refuse](h)); return close(); }
    hdPlay(op, r);
  },
  /* руна доблести из осколков — автодокрафт мастерской (screens/craft.js), рецепт известен с первого осколка */
  valorcraft(v) { if (typeof ACT.wsmake === 'function' && BAG.recipe(v)) ACT.wsmake(v); else { S.seg.craft = 'work'; go('craft'); } },
  hdskip() { if (!S.hd.fx) return; hdStop(); S.hd.fx.skip = true; render(); },
  /* «Дальше» и «Готово»: пока анимация идёт — сразу итог, после — закрыть */
  hdfxok() { if (!hdFxDone()) return ACT.hdskip(); hdStop(); S.hd.fx = null; close(); },
  hdread() {
    if (!hdFxDone()) return ACT.hdskip();
    const r = S.hd.fx && S.hd.srv[S.hd.fx.op]; hdStop(); S.hd.fx = null; S.overlay = null;
    if (r) { S.selHero = r.hid; S.seg.hero = 'path'; }
    render();
  },
});

/* ================== окно «Снаряжение героя» ==================
   Одно окно на снаряжение и талисманы. Слева — места героя: пять брони, два оружия, два украшения и четыре талисмана; внизу — карточка
   выбранного: сравнение с надетым и одно действие. Справа — запасы, вкладки «Снаряжение» и «Талисманы»: лучшие для героя сверху,
   неподходящие тусклые, причина — в подсказке и в карточке. Выбранная вещь подсвечивает места, куда её можно положить. Операции —
   EQ_SRV и TL_SRV с номером (equipment.js, talismans.js), «Надеть лучшее» — GR_SRV. Состояние окна — S.gear: герой, вкладка, место;
   выбор — S.eq.pick и S.tal.pick, как у прежних листов */
const grEqOn = () => typeof eqOpen === 'function' && eqOpen();
const grTalOn = () => typeof tlOpen === 'function' && !!TL && tlOpen();
const grHero = () => H(S.gear.hid) || H(S.selHero) || null;
const grKey = (k, s) => `${k}:${s}`;
/* значок вещи — арт слота снаряжения или семейства талисмана (eqIcon, talIcon — screens/art-icons.js); сам значок нейтральный,
   редкость — рамкой и светом --r1…--r7 (ADR-0027). Арта нет — прежняя заглушка: контур слота или медальон со значком эффекта */
const grEqPic = (slot, px, r = 0) => typeof eqPic === 'function' ? eqPic(slot, px, r) : eqGlyph(slot);
const grEqT = it => eqTile(it, { lg: true });   // крупный рисунок, размер плитки задают стили окна
const grTalT = no => tlTile(no, { lg: true });
/* множитель мощи слоя талисманов для набора номеров — та же формула, что у надетых (tlMulOf, talismans.js) */
const grTalGain = (h, nos) => { const m0 = tlMul(h.id), m1 = tlMulOf(nos); return hdFl((m1 - m0) * HD_BP, m0); };
/* прибавка мощи героя, если положить талисман в место i вместо нынешнего, б. п. */
const grTalGainAt = (h, no, i) => { const eq = tlEq(h.id).slice(); eq[i] = no; return grTalGain(h, eq.filter(Boolean)); };
/* мощь героя после замены слоя — точно, как её посчитает BM: база × талисманы × снаряжение */
function grBmWith(h, o) {
  const P = BM.parts(h), tal = o.tal != null ? o.tal : P.mul.tal || HD_BP, eq = o.eq != null ? o.eq : P.mul.eq || HD_BP;
  let v = P.base; for (const x of [tal, eq]) v = hdFl(v * x, HD_BP);
  return v;
}
/* куда талисман ляжет: выбранное место, если можно; иначе первое пустое подходящее; иначе первое подходящее; why — почему никуда */
function grTalTarget(h, no) {
  const eq = tlEq(h.id), f = S.gear.focus.startsWith('tal:') ? +S.gear.focus.slice(4) : -1;
  if (f >= 0 && !tlWhy(h, no, f)) return { i: f, why: '' };
  const free = eq.findIndex((x, i) => !x && !tlWhy(h, no, i)); if (free >= 0) return { i: free, why: '' };
  const any = eq.findIndex((x, i) => !tlWhy(h, no, i)); if (any >= 0) return { i: any, why: '' };
  return { i: f >= 0 ? f : 0, why: tlWhy(h, no, f >= 0 ? f : 0) || 'none' };
}
/* выбранное в окне: вещь вкладки и место, куда она ляжет */
function grPick(h) {
  if (S.gear.tab === 'eq') {
    const it = grEqOn() && S.eq.pick ? eqItem(S.eq.pick) : null;
    if (!it || it.on === h.id) return null;
    return { k: 'eq', it, key: grKey('eq', it.slot), why: '' };
  }
  const no = grTalOn() && S.tal.pick && TB.qty(S.tal.pick) ? S.tal.pick : null; if (!no) return null;
  const t = grTalTarget(h, no);
  return { k: 'tal', no, key: grKey('tal', t.i), i: t.i, why: t.why };
}
/* можно ли положить выбранное в это место: '' — можно, иначе причина */
function grFit(h, P, key) {
  if (!P) return 'none';
  if (P.k === 'eq') return key === grKey('eq', P.it.slot) ? '' : 'slot';
  if (!key.startsWith('tal:')) return 'slot';
  return tlWhy(h, P.no, +key.slice(4));
}
/* лучшее из свободных запасов: снаряжение — где прибавка мощи, талисманы — в пустые места, где прибавка мощи; чужое не берётся */
function grPlan(h) {
  const out = { eq: [], tal: [], gain: 0 };
  if (!h) return out;
  if (grEqOn()) {
    let worn = eqWornList(h.id), m0 = eqMulOf(h, worn);
    for (const slot of EQD.rules.slots) {
      let best = null, g0 = 0;
      for (const it of eqFree()) if (it.slot === slot) { const m = eqMulOf(h, worn.filter(x => x.slot !== slot).concat(it)), g = hdFl((m - m0) * HD_BP, m0); if (g > g0) { g0 = g; best = it; } }
      if (best) { worn = worn.filter(x => x.slot !== slot).concat(best); const m1 = eqMulOf(h, worn); out.eq.push({ slot, uid: best.uid, g: g0 }); out.gain += hdFl((m1 - m0) * HD_BP, m0); m0 = m1; }
    }
  }
  if (grTalOn()) {
    const eq = tlEq(h.id).slice(), left = {};
    for (const x of TB.list()) left[x.no] = x.q;
    for (let i = 0; i < eq.length; i++) {
      if (eq[i]) continue;
      let best = null, g0 = 0;
      for (const no of Object.keys(left).map(Number)) {
        if (!left[no] || tlWhy(h, no, i)) continue;
        const f = tlFam(no); if (eq.some(x => x && (tlFid(x) === tlFid(no) || (f.grp && tlFam(x).grp === f.grp)))) continue;
        const next = eq.slice(); next[i] = no; const g = grTalGain(h, next.filter(Boolean)) - grTalGain(h, eq.filter(Boolean));
        if (g > g0) { g0 = g; best = no; }
      }
      if (best) { eq[i] = best; left[best]--; out.tal.push({ i, no: best, g: g0 }); out.gain += g0; }
    }
  }
  return out;
}
let grMemo = { k: '', v: null };
/* план лучшего запоминается по отпечатку всего, от чего он зависит: вещи, запасы, уровень и доблесть героя */
function grPlanOf(h) {
  if (!h) return grPlan(null);
  const k = [h.id, h.lvl, h.valor, JSON.stringify(S.eq.worn[h.id] || {}), Object.values(S.eq.items).filter(x => !x.on).map(x => x.uid).join(','), tlEq(h.id).join(','), TB.list().map(x => x.no + '*' + x.q).join(',')].join('|');
  if (grMemo.k !== k) grMemo = { k, v: grPlan(h) };
  return grMemo.v;
}
/* «Надеть лучшее» — одна операция с номером: сервер выбирает по той же мерке и надевает; повтор номера ничего не меняет */
const GR_SRV = {
  best(op, hid) {
    const O = S.gear.srv;
    if (O[op]) return Object.assign({ again: true }, O[op]);
    const h = H(hid); if (!h) return { refuse: 'hero' };
    const P = grPlan(h); if (!P.eq.length && !P.tal.length) return { refuse: 'none' };
    const done = [];
    for (const x of P.eq) { const r = EQ_SRV.put(`${op}.${x.slot}`, h.id, x.uid); if (r.ok) done.push(grKey('eq', x.slot)); }
    for (const x of P.tal) { const r = TL_SRV.put(`${op}.t${x.i}`, h.id, x.i, x.no); if (r.ok) done.push(grKey('tal', x.i)); }
    const res = { ok: 'best', hid: h.id, done, gain: P.gain };
    O[op] = res; S.gear.seq++;
    return res;
  },
};
const GR_WHY = { hero: () => 'Такого героя нет.', none: () => 'Лучше надетого в запасах нет.', slot: it => `Место этой вещи — «${eqSlotName(it.slot)}».` };

/* ---------- вид окна ---------- */
const grFlashOn = key => !!S.gear.flash && S.gear.flash.keys.includes(key) && hdNow() - S.gear.flash.t0 < HD_VIEW.flash;
function grEqSlot(h, slot, P) {
  const key = grKey('eq', slot), uid = (S.eq.worn[h.id] || {})[slot], it = uid ? eqItem(uid) : null, fit = P ? grFit(h, P, key) : null;
  const st = [it ? 'on' : '', P ? (fit ? 'dim' : 'ok') : '', S.gear.focus === key ? 'sel' : '', grFlashOn(key) ? 'got' : ''].filter(Boolean).join(' ');
  const say = it ? `${eqSlotName(slot)} · ${RAR[it.r].toLowerCase()}: ${eqMainTxt(it, h)}` : `${eqSlotName(slot)}: пусто`;
  return `<button class="gw-slot eq${st ? ' ' + st : ''}"${it ? ` data-r="${it.r}"` : ''} data-a="gearslot" data-v="${key}" data-gslot="${key}"${it ? ` data-gdrag="slot:${key}"` : ''} title="${hdEsc(say)}" aria-label="${hdEsc(say)}"><span class="gw-pic">${grEqPic(slot, 40, it ? it.r : 0)}</span>${it ? `<small class="num">${eqNum(it.lines[0][0], it.lines[0][1])}</small>` : ''}</button>`;
}
function grTalSlot(h, i, P) {
  const key = grKey('tal', i), no = tlEq(h.id)[i], fit = P ? grFit(h, P, key) : null;
  const st = [no ? 'on' : '', P ? (fit ? 'no' : 'ok') : '', P && P.key === key && !fit ? 'tgt' : '', S.gear.focus === key ? 'sel' : '', grFlashOn(key) ? 'got' : ''].filter(Boolean).join(' ');
  const say = no ? `${tlName(no)} · ${RAR[tlR(no)].toLowerCase()}: ${tlFx(no)}` : `Место талисмана ${i + 1}: пусто`;
  const tip = P && P.k === 'tal' && fit && fit !== 'slot' ? TL_WHY[fit](P.no) : say;
  return `<button class="gw-slot tal${st ? ' ' + st : ''}"${no ? ` data-r="${tlR(no)}"` : ''} data-a="gearslot" data-v="${key}" data-gslot="${key}"${no ? ` data-gdrag="slot:${key}"` : ''} title="${hdEsc(tip)}" aria-label="${hdEsc(say)}">${no ? `${grTalT(no)}<small class="num">${tlShort(no)}</small>` : ic('plus')}</button>`;
}
/* плитка запасов: значок, главное значение; снаряжение лучше надетого — стрелка вверх, на другом герое — его лицо;
   талисман своего класса до древней — значок класса, чужого — тусклый; сколько штук — в углу */
function grEqTile(h, it, P, m0) {
  const g = eqGain(h, it, m0), o = eqOwner(it), cur = !!P && P.k === 'eq' && P.it.uid === it.uid;
  const tip = `${eqSlotName(it.slot)} · ${RAR[it.r].toLowerCase()} · ${eqMainTxt(it, h)}${o ? ` · на герое ${o.name}` : ''} · мощь ${eqPct(g)}`;
  return `<button class="gw-it${cur ? ' cur' : ''}${g < 0 ? ' low' : ''}" data-r="${it.r}" data-a="gearpick" data-v="eq:${it.uid}" data-gdrag="eq:${it.uid}" title="${hdEsc(tip)}" aria-label="${hdEsc(tip)}">${grEqT(it)}<small class="num">${eqNum(it.lines[0][0], it.lines[0][1])}</small>${g > 0 ? `<i class="gw-up" aria-hidden="true">${ic('up')}</i>` : ''}${o ? `<span class="gw-own">${typeof hrAv === 'function' ? hrAv(o) : ''}</span>` : ''}</button>`;
}
/* пригоден ли талисман герою хоть в одно место: '' — да, иначе причина первого места */
const grTalWhy = (h, no) => { const eq = tlEq(h.id); return eq.some((_, i) => !tlWhy(h, no, i)) ? '' : tlWhy(h, no, 0); };
function grTalTile(h, x, P) {
  const why = grTalWhy(h, x.no), f = tlFam(x.no), bound = !!f.cls && tlR(x.no) < TL.rules.freeFrom, mine = bound && f.cls.includes(tlCls(h.cls));
  const cur = !!P && P.k === 'tal' && P.no === x.no;
  const tip = `${tlName(x.no)} · ${RAR[tlR(x.no)].toLowerCase()}: ${tlFx(x.no)}${why ? ' · ' + TL_WHY[why](x.no) : ''}`;
  return `<button class="gw-it tal${why ? ' off' : ''}${cur ? ' cur' : ''}" data-r="${tlR(x.no)}" data-a="gearpick" data-v="tal:${x.no}" data-gdrag="tal:${x.no}" title="${hdEsc(tip)}" aria-label="${hdEsc(tip)}">${grTalT(x.no)}<small class="num">${tlShort(x.no)}</small>${bound ? `<span class="gw-cls${mine ? '' : ' no'}" title="${hdEsc(`До древней редкости — только ${tlOr(f.cls.map(tlClsName))}`)}">${CLS(tlClsName(f.cls[0]), 12, '')}</span>` : ''}${x.q > 1 ? `<span class="gw-q num">×${x.q}</span>` : ''}</button>`;
}
/* строки сравнения: главная и изменившиеся, не больше HD_VIEW.cmpLines; значок, вид, новое значение и разница стрелкой */
function grLines(it, h, vs) {
  const other = vs ? Object.fromEntries(vs.lines.map(([k, v]) => [k, v])) : {}, rows = [];
  it.lines.forEach(([k, v], i) => { const d = v - (other[k] || 0); if (i && vs && !d) return; rows.push(`<div class="gw-ln${i ? '' : ' main'}"><span class="k">${eqIco(k, 14, h)}${eqKindName(k, h)}</span><b class="num">${eqNum(k, v)}</b>${vs ? `<span class="gw-d${d > 0 ? ' up' : d < 0 ? ' down' : ''}">${d ? (d > 0 ? '▲' : '▼') + Math.abs(d) : '='}</span>` : ''}</div>`); });
  if (vs) for (const [k, v] of vs.lines) if (!it.lines.some(x => x[0] === k)) rows.push(`<div class="gw-ln lost"><span class="k">${eqIco(k, 14, h)}${eqKindName(k, h)}</span><b class="num">—</b><span class="gw-d down">▼${v}</span></div>`);
  const more = rows.length > HD_VIEW.cmpLines ? rows.length - HD_VIEW.cmpLines : 0;
  return `<div class="gw-lns">${rows.slice(0, HD_VIEW.cmpLines).join('')}</div>${more ? `<button class="link gw-more" data-a="sheet" data-v="eqitem:${it.uid}">ещё ${more} ${ic('chev')}</button>` : ''}`;
}
/* прибавка мощи чипом со стрелкой: в карточке — процент, в шапке — число */
const grDelta = bp => `<span class="chip gw-bmd${bp > 0 ? ' up' : bp < 0 ? ' down' : ''}" title="Боевая мощь">${ICON('power', 13, 'Боевая мощь')}${bp > 0 ? '▲' + eqPct(bp) : bp < 0 ? '▼' + eqPct(bp) : '='}</span>`;
/* карточка слева внизу: выбранная вещь против надетой, надетая в выбранном месте или подсказка и сумма бонусов */
function grCard(h, P) {
  const opE = `eq${S.eq.seq}`, opT = `tl${S.tal.seq}`;
  if (P && P.k === 'eq') {
    const it = P.it, cur = eqItem((S.eq.worn[h.id] || {})[it.slot]), g = eqGain(h, it), from = eqOwner(it);
    return `<div class="gw-card" data-r="${it.r}"><div class="gw-ch">${grEqT(it)}<span class="tx"><b>${eqSlotName(it.slot)}</b>${eqCr(it.r, 14)}<small>${cur ? `вместо ${RAR[cur.r].toLowerCase()}` : 'место пусто'}</small></span>${grDelta(g)}</div>
      ${grLines(it, h, cur)}<div class="gw-cf">${from ? `<span class="reason">Снимется с героя ${hdEsc(from.name)}.</span>` : ''}<span class="g-spacer"></span><button class="btn go sm" data-a="eqput" data-v="${opE}:${h.id}:${it.uid}">${cur ? 'Заменить' : 'Надеть'}</button></div></div>`;
  }
  if (P && P.k === 'tal') {
    const no = P.no, f = tlFam(no), r = tlR(no), cur = tlEq(h.id)[P.i], g = P.why ? 0 : grTalGainAt(h, no, P.i);
    const bind = !f.cls ? 'Подходит любому герою.' : r >= TL.rules.freeFrom ? 'Древняя черта: подходит любому герою.' : `До древней редкости — только ${tlOr(f.cls.map(tlClsName))}.`;
    const bm = P.why ? '' : !f.bm ? '<span class="reason">В мощь не входит: действует в своём деле.</span>' : grDelta(g);
    return `<div class="gw-card" data-r="${r}"><div class="gw-ch">${grTalT(no)}<span class="tx"><b>${tlName(no)}</b>${eqCr(r, 14)}<small>${cur ? `вместо «${tlName(cur)}»` : `место ${P.i + 1}`}</small></span>${f.bm ? bm : ''}</div>
      <p class="gw-fx">${tlFx(no)}</p><p class="gw-bind${P.why === 'cls' ? ' warn' : ''}">${f.cls && r < TL.rules.freeFrom ? CLS(tlClsName(f.cls[0]), 13, '') : ''}${P.why && P.why !== 'cls' ? TL_WHY[P.why](no) : bind}</p>${tlHide(f) ? '' : TM(`${tlCore(f)} ${f.bm ? 'В БМ входит.' : 'В БМ не входит.'}`, 'p', 'reason')}
      <div class="gw-cf">${f.bm ? '' : bm}<span class="g-spacer"></span><button class="btn go sm" data-a="talput" data-v="${opT}:${h.id}:${P.i}:${no}"${P.why ? ' disabled' : ''}>${cur ? 'Заменить' : 'Надеть'}</button></div></div>`;
  }
  const fk = S.gear.focus, [k, s] = fk.split(':');
  if (k === 'eq') {
    const it = eqItem((S.eq.worn[h.id] || {})[s]);
    if (it) return `<div class="gw-card" data-r="${it.r}"><div class="gw-ch">${grEqT(it)}<span class="tx"><b>${eqSlotName(s)}</b>${eqCr(it.r, 14)}<small>надет · цикл ${ROMAN[it.cyc]}</small></span></div>${grLines(it, h, null)}
      <div class="gw-cf"><button class="link" data-a="sheet" data-v="eqitem:${it.uid}">Свойства ${ic('chev')}</button><span class="g-spacer"></span><button class="btn sm" data-a="eqout" data-v="${opE}:${h.id}:${s}">Снять</button></div></div>`;
    return `<div class="gw-card empty"><p class="reason">${eqSlotName(s)}: пусто. Подходящие вещи — справа, лучшие сверху.</p></div>`;
  }
  if (k === 'tal') {
    const no = tlEq(h.id)[+s];
    if (no) return `<div class="gw-card" data-r="${tlR(no)}"><div class="gw-ch">${grTalT(no)}<span class="tx"><b>${tlName(no)}</b>${eqCr(tlR(no), 14)}<small>надет · место ${+s + 1}</small></span></div><p class="gw-fx">${tlFx(no)}</p>
      <div class="gw-cf"><span class="g-spacer"></span><button class="btn sm" data-a="talout" data-v="${opT}:${h.id}:${s}">Снять</button></div></div>`;
    return `<div class="gw-card empty"><p class="reason">Место талисмана ${+s + 1}: пусто. Своего класса и древние — сверху.</p></div>`;
  }
  const worn = grEqOn() ? eqWornList(h.id) : [];
  return `<div class="gw-card empty"><p class="reason">Перетащите вещь на место героя — или нажмите вещь, затем подсвеченное место.</p>${worn.length && typeof eqSum === 'function' ? eqSum(h) : ''}</div>`;
}
/* шапка окна: переключение героя, лицо и имя, мощь — с прибавкой выбранного, «Надеть лучшее», крестик */
function grHead(h, P) {
  let bm1 = null;
  if (P && P.k === 'eq') { const now = eqWornList(h.id); bm1 = grBmWith(h, { eq: eqMulOf(h, now.filter(x => x.slot !== P.it.slot).concat(P.it)) }); }
  else if (P && P.k === 'tal' && !P.why) { const eq = tlEq(h.id).slice(); eq[P.i] = P.no; bm1 = grBmWith(h, { tal: tlMulOf(eq.filter(Boolean)) }); }
  const d = bm1 == null ? 0 : bm1 - h.bm, plan = grPlanOf(h), many = typeof eqHeroes === 'function' && eqHeroes().length > 1;
  const face = typeof hrAv === 'function' ? hrAv(h) : `<img src="${h.img}" alt="">`;
  return `<header class="gw-h">${many ? `<button class="iconbtn" data-a="gearhero" data-v="-1" aria-label="Предыдущий герой">${ic('chev', 'flip')}</button>` : ''}
    <span class="gw-av">${face}</span><span class="gw-id"><b>${hdEsc(h.name)}</b><small>${CLS(h.cls, 13, '')}${hdEsc(h.clsN || h.cls)}</small></span>
    ${many ? `<button class="iconbtn" data-a="gearhero" data-v="1" aria-label="Следующий герой">${ic('chev')}</button>` : ''}<span class="g-spacer"></span>
    <span class="gw-bm" title="Боевая мощь">${ICON('power', 18, 'Боевая мощь')}<b class="num">${fmt(h.bm)}</b>${d ? `<i class="num ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'}${fmt(Math.abs(d))}</i>` : ''}</span>
    ${plan.gain > 0 ? `<button class="btn sm gw-best" data-a="gearbest" data-v="gr${S.gear.seq}:${h.id}" title="Надеть лучшее из свободных запасов">${ic('spark')}Лучшее</button>` : ''}
    <button class="iconbtn x" data-a="close" aria-label="Закрыть">${ic('x')}</button></header>`;
}
/* места героя: подписи групп и мощь от вещей; закрытое — причина одной строкой */
function grLeft(h, P) {
  const parts = BM.parts(h), me = parts.mul.eq || HD_BP, mt = parts.mul.tal || HD_BP, S9 = grEqOn() ? EQD.rules.slots : [];
  const grp = g => S9.filter(s => EQD.slots[s].grp === g).map(s => grEqSlot(h, s, P)).join('');
  const eqHtml = grEqOn() ? `<div class="gw-eq"><div class="gw-row">${grp('armor')}</div><div class="gw-row">${grp('weapon')}<i class="gw-gap"></i>${grp('jewel')}</div></div>`
    : `<p class="reason">${ic('lock')} Снаряжение откроется во втором цикле — вместе с Ареной.</p>`;
  const talHtml = grTalOn() ? `<div class="gw-row gw-tals">${tlEq(h.id).map((_, i) => grTalSlot(h, i, P)).join('')}</div>`
    : `<p class="reason">${ic('lock')} Талисманы откроются во втором цикле — вместе с кланами.</p>`;
  const chip = m => m !== HD_BP ? `<span class="chip${m > HD_BP ? ' spirit' : ''}" title="Боевая мощь от вещей">${ICON('power', 12, 'Боевая мощь')}${eqPct(m - HD_BP)}</span>` : '';
  const busy = busyNote(h.id) ? '<p class="reason gw-busy">Герой в забеге: новый набор — со следующего боя.</p>' : '';
  return `<section class="gw-hero" data-gdrop="hero"><div class="gw-grp"><span class="eyebrow">Снаряжение</span>${chip(me)}</div>${eqHtml}
    <div class="gw-grp"><span class="eyebrow">Талисманы</span>${chip(mt)}</div>${talHtml}${busy}${grCard(h, P)}</section>`;
}
/* запасы справа: вкладки, фильтр выбранного места, плитки — лучшие для героя сверху */
function grRight(h, P) {
  const tab = S.gear.tab, fk = S.gear.focus, [fkk, fs] = fk.split(':');
  const eqN = grEqOn() ? Object.values(S.eq.items).filter(it => it.on !== h.id).length : 0, talN = grTalOn() ? TB.list().reduce((a, x) => a + x.q, 0) : 0;
  const tabs = `<div class="tabs" role="tablist" aria-label="Запасы">${[['eq', 'Снаряжение', eqN], ['tal', 'Талисманы', talN]].map(([k, l, n]) => `<button role="tab" aria-selected="${tab === k}" data-a="geartab" data-v="${k}">${l} · ${n}</button>`).join('')}</div>`;
  const filt = tab === 'eq' && fkk === 'eq' ? `<button class="chip gw-filt" data-a="gearfilt" title="Показать всё снаряжение">${grEqPic(fs, 16)}${eqSlotName(fs)} ${ic('x')}</button>` : '';
  let tiles = '', empty = '';
  if (tab === 'eq') {
    if (!grEqOn()) empty = 'Снаряжение откроется во втором цикле — вместе с Ареной.';
    else {
      const m0 = eqMulOf(h, eqWornList(h.id));
      const list = Object.values(S.eq.items).filter(it => it.on !== h.id && (fkk !== 'eq' || it.slot === fs)).map(it => ({ it, g: eqGain(h, it, m0) }))
        .sort((a, b) => b.g - a.g || (a.it.on ? 1 : 0) - (b.it.on ? 1 : 0) || b.it.r - a.it.r || b.it.lines[0][1] - a.it.lines[0][1] || a.it.n - b.it.n);
      tiles = list.map(x => grEqTile(h, x.it, P, m0)).join('');
      if (!list.length) empty = fkk === 'eq' ? `Для места «${eqSlotName(fs)}» в запасах ничего нет. Снаряжение приносят сундуки Арены и Лиги.` : 'Запасы снаряжения пусты: его приносят сундуки Арены и Лиги.';
    }
  } else if (!grTalOn()) empty = 'Талисманы откроются во втором цикле — вместе с кланами.';
  else {
    const list = TB.list().map(x => ({ x, why: grTalWhy(h, x.no) })).sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0) || tlR(b.x.no) - tlR(a.x.no) || tlName(a.x.no).localeCompare(tlName(b.x.no), 'ru') || a.x.no - b.x.no);
    tiles = list.map(y => grTalTile(h, y.x, P)).join('');
    if (!list.length) empty = 'Запасы талисманов пусты: они приходят в сундуках за кланового босса.';
  }
  const hint = P ? (P.k === 'tal' && P.why ? 'Этому герою не подходит — причина в карточке слева.' : 'Нажмите подсвеченное место или перетащите вещь туда.') : 'Перетащите вещь на место героя. Снять — перетащить сюда.';
  return `<section class="gw-stock" data-gdrop="stock"><div class="gw-top">${tabs}${filt}</div>
    <div class="gw-grid scroll" data-keep="gear:${tab}:${fk}">${tiles || `<p class="reason">${empty}</p>`}</div><p class="gw-hint">${hint}</p></section>`;
}
/* выбор при открытии: прежние листы OV.tal и OV.eq открывают окно на своём месте; выбранное сохраняется, только если оно для этого
   места (pickFor), как в прежних листах — так «К герою» из «Запасов» приходит с выбранным талисманом */
function grInit(o, kind) {
  if (o.gi) return;
  o.gi = 1;
  const [hid, s] = String(o.arg || '').split(':'), h = H(hid) || H(S.selHero);
  S.gear.hid = h ? h.id : ''; S.gear.enter = true;
  if (h) S.selHero = h.id;
  if (kind === 'tal') {
    const i = Math.max(0, Math.min(TL ? TL.rules.slots - 1 : 3, +s || 0));
    S.gear.tab = 'tal'; S.gear.focus = grKey('tal', i);
    if (S.tal.pickFor !== `${S.gear.hid}:${i}`) S.tal.pick = null;
  } else if (kind === 'eq') {
    const slot = EQD && EQD.rules.slots.includes(s) ? s : '';
    S.gear.tab = 'eq'; S.gear.focus = slot ? grKey('eq', slot) : '';
    if (!slot || S.eq.pickFor !== `${S.gear.hid}:${slot}`) S.eq.pick = null;
  } else { S.gear.focus = ''; S.eq.pick = null; S.tal.pick = null; S.gear.tab = s === 'tal' ? 'tal' : 'eq'; }
}
function grWin(o, kind) {
  grInit(o, kind);
  const h = grHero(); if (!h) return '';
  const P = grPick(h), first = S.gear.enter; S.gear.enter = false;
  return `<div class="ov gw-ov${first ? ' in' : ''}" role="dialog" aria-modal="true" aria-label="Снаряжение героя: ${hdEsc(h.name)}"><button class="ov-scrim" data-a="close" aria-label="Закрыть" tabindex="-1"></button>
    <div class="gw" data-hid="${h.id}">${grHead(h, P)}<div class="gw-b">${grLeft(h, P)}${grRight(h, P)}</div></div></div>`;
}
OV.gear = o => grWin(o, 'gear');
/* низ вкладки «Снаряжение»: лучшее в запасах — одним действием; иначе — вход в окно */
function hdGearFoot(h) {
  if (!grEqOn() && !grTalOn()) return '';
  const P = grPlanOf(h);
  return `<div class="hdg-f">${P.gain > 0 ? `<span class="reason">В запасах есть лучше: мощь ${grDelta(P.gain)}</span><span class="g-spacer"></span><button class="link" data-a="dlg" data-v="gear:${h.id}">Открыть</button><button class="btn go sm" data-a="gearbest" data-v="gr${S.gear.seq}:${h.id}">${ic('spark')}Надеть лучшее</button>`
    : `<span class="reason">Перетащите вещи на места героя — или нажмите вещь, затем место.</span><span class="g-spacer"></span><button class="btn go sm" data-a="dlg" data-v="gear:${h.id}">Открыть снаряжение</button>`}</div>`;
}
/* точка на вкладке «Снаряжение»: в свободных запасах есть лучше надетого */
const hdGearDot = h => grPlanOf(h).gain > 0;

/* ---------- действия окна ---------- */
function grPutKey(h, P, key) {
  if (P.k === 'eq') { const op = `eq${S.eq.seq}`; S.gear.flash = { keys: [key], t0: hdNow() }; return ACT.eqput(`${op}:${h.id}:${P.it.uid}`); }
  const i = +key.slice(4), why = tlWhy(h, P.no, i);
  if (why) return toast(TL_WHY[why](P.no));
  S.gear.flash = { keys: [key], t0: hdNow() };
  return ACT.talput(`tl${S.tal.seq}:${h.id}:${i}:${P.no}`);
}
Object.assign(ACT, {
  /* вещь из запасов: выбрать или снять выбор; снаряжение подсвечивает своё место, талисман — подходящие места */
  gearpick(v) {
    const h = grHero(); if (!h) return;
    const [k, id] = String(v).split(':');
    if (k === 'eq') { S.eq.pick = S.eq.pick === id ? null : id; const it = eqItem(id); if (S.eq.pick && it) { S.gear.focus = grKey('eq', it.slot); S.eq.pickFor = `${h.id}:${it.slot}`; } }
    else { const no = +id; S.tal.pick = S.tal.pick === no ? null : no; if (S.tal.pick) { const t = grTalTarget(h, no); S.tal.pickFor = `${h.id}:${t.i}`; } }
    render();
  },
  /* место: есть выбор и сюда можно — положить; иначе — выбрать место: запасы покажут подходящее, карточка — надетое и «Снять» */
  gearslot(v) {
    const h = grHero(); if (!h) return;
    const P = grPick(h), [k] = String(v).split(':');
    if (P && P.k === k && !grFit(h, P, v)) return grPutKey(h, P, v);
    if (P && P.k === 'tal' && k === 'tal') { const why = grFit(h, P, v); if (why && why !== 'slot') return toast(TL_WHY[why](P.no)); }
    S.gear.focus = v; S.gear.tab = k === 'tal' ? 'tal' : 'eq';
    if (k === 'eq') S.eq.pick = null;
    render();
  },
  geartab(v) { S.gear.tab = v === 'tal' ? 'tal' : 'eq'; if (!S.gear.focus.startsWith(S.gear.tab)) S.gear.focus = ''; render(); },
  gearfilt() { S.gear.focus = ''; render(); },
  /* соседний герой аккаунта — не закрывая окна */
  gearhero(v) {
    const list = typeof eqHeroes === 'function' ? eqHeroes() : S.heroes, i = list.findIndex(x => x.id === S.gear.hid); if (!list.length) return;
    const n = list[((i < 0 ? 0 : i) + (+v || 1) + list.length) % list.length];
    S.gear.hid = n.id; S.selHero = n.id; S.eq.pick = null; S.tal.pick = null; S.gear.focus = ''; render();
  },
  /* «Надеть лучшее»: v — «операция:герой» */
  gearbest(v) {
    const { op, hid } = hdArgs(v), h = H(hid) || grHero(); if (!h) return;
    const r = GR_SRV.best(op || `gr${S.gear.seq}`, h.id);
    if (r.again) return;
    if (r.refuse) return toast(GR_WHY[r.refuse]());
    S.eq.pick = null; S.tal.pick = null; S.gear.flash = { keys: r.done, t0: hdNow() };
    toast(`${h.name}: надето лучшее — ${r.done.length} ${plural(r.done.length, 'вещь', 'вещи', 'вещей')}, мощь ${eqPct(r.gain)}`);
  },
});

/* ---------- перетаскивание: pointer events, палец и мышь ----------
   Источник — плитка запасов (data-gdrag="eq:…" или "tal:…") или надетое место ("slot:…"). Цель — место героя (data-gslot) или запасы
   (data-gdrop="stock") — снять. Пальцем в запасах перетаскивание начинается движением вбок: вверх и вниз список прокручивается
   (touch-action: pan-y). Бросок зовёт те же действия, что и нажатия: операции с номером, решает «сервер». Призрак — в #game,
   координаты — с поправкой на масштаб устройства */
let GR_D = null, grEat = -1;   // grEat — время броска: щелчок сразу после него гасится
function grTargets(h, src) {
  const out = {}, [a, b, c] = src.split(':');
  if (a === 'eq') { const it = eqItem(b); if (it) out[grKey('eq', it.slot)] = ''; }
  else if (a === 'tal') tlEq(h.id).forEach((_, i) => { out[grKey('tal', i)] = tlWhy(h, +b, i); });
  else if (a === 'slot' && b === 'tal') tlEq(h.id).forEach((_, i) => { if (String(i) !== c) out[grKey('tal', i)] = 'none'; });
  return out;
}
function grXY(x, y) {
  const g = document.getElementById('game'); if (!g) return [x, y];
  const r = g.getBoundingClientRect(), sc = r.width / (g.offsetWidth || r.width || 1) || 1;
  return [(x - r.left) / sc, (y - r.top) / sc];
}
function grStart(D) {
  D.on = true;
  const g = document.getElementById('game'), h = grHero(); if (!g || !h) return;
  const gh = document.createElement('div'); gh.className = 'gw-ghost'; gh.setAttribute('aria-hidden', 'true');
  if (D.el.dataset.r) gh.dataset.r = D.el.dataset.r;
  gh.innerHTML = D.el.innerHTML; g.appendChild(gh); D.ghost = gh;
  D.el.classList.add('drag');
  D.ok = grTargets(h, D.src);
  document.querySelectorAll('.gw [data-gslot]').forEach(s => { const w = D.ok[s.dataset.gslot]; if (w === '') s.classList.add('drop-ok'); else if (w) s.classList.add('drop-no'); });
  if (D.src.startsWith('slot:')) { const st = document.querySelector('.gw-stock'); if (st) st.classList.add('drop-ok'); }
}
/* куда бросили: место героя, левая колонка целиком (вещь ляжет в своё место) или запасы */
function grHit(x, y) {
  const el = document.elementFromPoint(x, y); if (!el || !el.closest) return null;
  return el.closest('.gw [data-gslot]') || el.closest('.gw [data-gdrop]');
}
function grMove(e) {
  const D = GR_D; if (!D || e.pointerId !== D.id) return;
  const dx = e.clientX - D.x0, dy = e.clientY - D.y0;
  if (!D.on) {
    if (Math.abs(dx) + Math.abs(dy) < HD_VIEW.dragPx) return;
    if (D.touch && D.stock && Math.abs(dy) > Math.abs(dx)) return grEnd();   // палец повёл список вверх-вниз — это прокрутка
    grStart(D);
  }
  if (e.cancelable) e.preventDefault();
  const [x, y] = grXY(e.clientX, e.clientY);
  if (D.ghost) D.ghost.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(1.08)`;
  const t = grHit(e.clientX, e.clientY);
  if (t !== D.over) { if (D.over) D.over.classList.remove('drop-over'); D.over = t; if (t) t.classList.add('drop-over'); }
}
function grDrop(src, t) {
  const h = grHero(); if (!h || !t) return;
  const [a, b, c] = src.split(':');
  if (t.dataset.gdrop === 'stock') {
    if (a !== 'slot') return;
    if (b === 'eq') return ACT.eqout(`eq${S.eq.seq}:${h.id}:${c}`);
    return ACT.talout(`tl${S.tal.seq}:${h.id}:${c}`);
  }
  let key = t.dataset.gslot;
  if (!key && t.dataset.gdrop === 'hero') {   // мимо места, но на героя: снаряжение — в своё место, талисман — в первое подходящее
    if (a === 'eq') { const it = eqItem(b); key = it ? grKey('eq', it.slot) : ''; }
    else if (a === 'tal') { const tt = grTalTarget(h, +b); if (tt.why) return toast(TL_WHY[tt.why](+b)); key = grKey('tal', tt.i); }
  }
  if (!key) return;
  if (a === 'eq') { const it = eqItem(b); if (!it) return; if (key !== grKey('eq', it.slot)) return toast(GR_WHY.slot(it)); S.gear.tab = 'eq'; return grPutKey(h, { k: 'eq', it }, key); }
  if (a === 'tal') { S.gear.tab = 'tal'; return grPutKey(h, { k: 'tal', no: +b }, key); }
}
function grEnd() {
  const D = GR_D; GR_D = null;
  window.removeEventListener('pointermove', grMove);
  window.removeEventListener('pointerup', grUp);
  window.removeEventListener('pointercancel', grEnd);
  if (!D) return;
  if (D.ghost) D.ghost.remove();
  if (D.over) D.over.classList.remove('drop-over');
  if (D.el) D.el.classList.remove('drag');
  document.querySelectorAll('.gw .drop-ok, .gw .drop-no').forEach(x => x.classList.remove('drop-ok', 'drop-no'));
}
function grUp(e) {
  const D = GR_D; if (!D || e.pointerId !== D.id) return;
  const on = D.on, src = D.src, t = on ? grHit(e.clientX, e.clientY) : null;
  grEnd();
  if (!on) return;   // нажатие без движения — обычный щелчок: его ловит bindGame
  grEat = hdNow();
  grDrop(src, t);
}
function grDown(e) {
  if (e.button != null && e.button > 0) return;
  if (GR_D) grEnd();   // прежнее нажатие не закончилось (отпустили за окном) — сбросить
  const t = e.target && e.target.closest ? e.target.closest('[data-gdrag]') : null;
  if (!t || !t.closest('.gw')) return;
  GR_D = { el: t, src: t.dataset.gdrag, x0: e.clientX, y0: e.clientY, id: e.pointerId, touch: e.pointerType !== 'mouse', stock: !!t.closest('.gw-stock'), on: false, ghost: null, over: null, ok: {} };
  if (!GR_D.touch) try { t.setPointerCapture(e.pointerId); } catch (_) { }   // мышь: отпустили за окном — отпускание всё равно придёт
  window.addEventListener('pointermove', grMove, { passive: false });
  window.addEventListener('pointerup', grUp);
  window.addEventListener('pointercancel', grEnd);
}
/* один раз на #game: нажатие начинает перетаскивание, щелчок сразу после броска гасится до bindGame */
function grBind() {
  const g = document.getElementById('game'); if (!g || !g.addEventListener || !g.dataset || g.dataset.grBound) return;
  g.dataset.grBound = '1';
  g.addEventListener('pointerdown', grDown);
  g.addEventListener('click', e => { if (grEat >= 0 && hdNow() - grEat < HD_VIEW.eatMs) { grEat = -1; e.stopPropagation(); e.preventDefault(); } }, true);
}
window.addEventListener('en-render', grBind);

/* ================== раздел UI-кита ================== */
/* герой-образец для кита: копия героя отряда в нужном состоянии, без записи в S */
const hdKitHero = (id, o) => { const h = H(id) || S.heroes[0]; const x = Object.assign({}, h, o); x.cap = hdCapOf(x.lim); return bmProp(x); };
/* кадр анимации для раскадровки: та же разметка, что в игре, время остановлено на t мс */
function hdKitFrame(kind, t) {
  const h = H(HD_DATA.flow.limit) || S.heroes[0];
  if (kind === 'limit') {
    const r = { ok: 'limit', hid: h.id, r: h.r, glyph: 'II', need: INV.hero.runesPerLimit, lim: [1, 2], cap: [hdCapOf(1), hdCapOf(2)] };
    return hdFxLim(r, t, false, h);
  }
  const was = { valor: 1, lvl: hdCapOf(INV.hero.capByLim.length - 1), lim: INV.hero.capByLim.length - 1, st: valorSt(h.st, 1), bm: hdBmAt(h, { valor: 1, lvl: hdCapOf(5) }) };
  const now = { valor: 2, lvl: 0, lim: 0, st: valorSt(h.st, 2), bm: hdBmAt(h, { valor: 2, lvl: 0 }) };
  const r = { ok: 'valor', hid: h.id, r: h.r, was, now, maxV: h.maxV, last: false, opens: hdOpens(h, 2).map(x => ({ id: x.id, slot: x.slot, n: x.n })), ch: hdChapter(h, 2), reveal: null };
  return hdFxVal(r, t, false, h);
}
function hdKitHtml() {
  const id = HD_DATA.flow.limit, base = H(id) || S.heroes[0]; if (!base) return '';
  const top = INV.hero.capByLim.length - 1, maxL = hdCapOf(top);
  /* четыре состояния пути; у «Доблесть открыта» руна считается готовой — чтобы показать главную кнопку шага */
  const states = [['Уровень растёт', { lvl: 38, lim: 0, valor: 1 }], ['Предел ждёт рун', { lvl: hdCapOf(1), lim: 1, valor: 1 }], ['Доблесть открыта', { lvl: maxL, lim: top, valor: 1 }, { vrHave: 1, craft: false }], ['Путь пройден', { lvl: maxL, lim: top, valor: base.maxV }]];
  const paths = states.map(([t, o, dx]) => { const h = hdKitHero(id, o), d = Object.assign(heroDev(h), dx || {}); return `<div class="k-air-r hdk-st"><b>${t}</b><div class="hdv hdk">${hdPath(h, d)}${hdNext(h, d)}</div></div>`; }).join('');
  const pv = (() => { const h = hdKitHero(HD_DATA.flow.valor, { lvl: maxL, lim: top }); return `<div class="dlg-b hdk-pv">${hdValBody(h, hdPreview(h))}</div>`; })();
  const frames = (kind, list) => `<div class="hdk-frames">${list.map(([t, cap]) => `<figure><div class="hdk-fr"><div class="g hdk-g">${hdKitFrame(kind, t)}</div></div><figcaption>${cap}</figcaption></figure>`).join('')}</div>`;
  const L = HD_VIEW.lim, V = HD_VIEW.val;
  const gh = H(HD_DATA.flow.gear) || base;
  const slotsDemo = grEqOn() ? `<div class="gw-row">${EQD.rules.slots.slice(0, 5).map(s => grEqSlot(gh, s, null)).join('')}</div>` : '';
  const tilesDemo = grTalOn() ? `<div class="gw-grid hdk-tiles">${TB.list().slice(0, 6).map(x => grTalTile(gh, x, null)).join('')}</div>` : '';
  return `<section class="k-box hdk" style="grid-column:1/-1" id="kitHeroDev"><h3>Развитие героя и снаряжение</h3>
    <p class="k-note">Одна главная вещь — следующий шаг героя: поднять уровень, пробить рунный предел, взять доблесть. Путь — пять отрезков уровня, ворота пределов и звезда доблести в конце. Цена — у кнопки, подробности — в листах. До доблести — честное превью: что получит герой, что начнётся заново, что сохранится.${TM(' §10, §3.3, §33.2; ADR-0016, ADR-0019, ADR-0026. Экран — screens/hero-dev.js: вкладка «Развитие» (hdPower), листы OV.hdlim, OV.hdval, анимации OV.hdfx, окно OV.gear. Доблесть даёт +INV.hero.valorPct % к базовым характеристикам — valorSt в index.html, источник героя для боя и мощи.')}</p>
    <div class="hdk-g4">${paths}</div>
    <div class="k-air-r"><b>Доблесть · честное превью</b>${pv}<small>Строка — одно изменение: было → стало. Цена и подтверждение — в подвале листа; недоступно — причина и путь к руне.</small></div>
    <div class="k-air-r"><b>Пробитие предела · раскадровка</b>${frames('limit', [[L.fly - 200, 'Руны кольцом'], [L.mark + 180, 'Отметка загорается'], [L.done + 200, 'Новый потолок']])}<small>Руны появляются по одной, вспыхивают и слетаются в отметку предела; вспышка частиц — цвет редкости героя; потолок уровня — новым числом. Нажатие — сразу итог.</small></div>
    <div class="k-air-r"><b>Доблесть · раскадровка</b>${frames('valor', [[V.rise + 420, 'Значок взлетает'], [V.land + 150, 'Встаёт на место'], [V.done + 400, 'Что изменилось']])}<small>Свет редкости героя, значок доблести взлетает и встаёт на своё место, затем карточка — по строке на изменение, стрелкой «было → стало».</small></div>
    <div class="k-air-r hdk-gear"><b>Окно снаряжения</b><div class="hdk-gw">${slotsDemo}${tilesDemo}</div><small>Слева — места героя: девять снаряжения и четыре талисмана. Справа — запасы: лучшие для героя сверху, чужого класса — тусклые, значок класса — в углу. Перетащить на место — надеть, из места в запасы — снять; нажатием — вещь, затем подсвеченное место. «Лучшее» надевает сильнейшее из свободного.</small></div>
    ${TM('<p class="k-note">Операции — с номером: уровень, предел, доблесть (HD_SRV), надеть и снять (EQ_SRV, TL_SRV), «лучшее» (GR_SRV). Итог решён до анимации, повтор номера ничего не повторяет. Движение — transform и opacity, частицы — EnFx; prefers-reduced-motion — итог без движения.</p>')}
  </section>`;
}
/* раздел UI-кита «Рунные пределы»: камень в четырёх состояниях и четырёх размерах, плитки, шапка, путь, строка. Герои — копии героев
   отряда в нужном состоянии, без записи в S; состояние следующего камня задано явно, а не запасами */
function rpKitHtml() {
  const hs = S.heroes; if (!hs.length) return '';
  const caps = INV.hero.capByLim, top = rpTop(), at = k => ({ lim: k, lvl: caps[Math.min(k, top)] });
  const ST = [['off', 'не пройден'], ['wait', 'на потолке уровня, рун мало'], ['ready', 'можно пробить'], ['on', 'пройден']];
  const SZ = ['t', 'h', 'g', 'b'];
  const stones = ST.map(([s, t]) => `<figure class="rpk-st"><span class="rpk-sz">${SZ.map(z => `<span class="rpk-${z}"><i class="rp-s ${s}${z === 'g' || z === 'b' ? ' p' : ''}"></i></span>`).join('')}</span><figcaption>${t}</figcaption></figure>`).join('');
  const kid = i => hs[Math.min(i, hs.length - 1)].id;
  const tiles = [[kid(0), { lvl: 42, lim: 0 }, '', 'Пределов нет'], [kid(1), at(1), 'ready', 'Один пройден, второй можно пробить'],
    [kid(2), at(3), 'wait', 'Три пройдено, четвёртый ждёт рун'], [kid(3), at(top), '', 'Все пять: путь к доблести']]
    .map(([id, o, nx, t]) => `<figure class="rpk-tile">${heroCard(hdKitHero(id, o), { act: 'noop', bm: false, rpNext: nx })}<figcaption>${t}</figcaption></figure>`).join('');
  const hh = hdKitHero(kid(2), at(2)), hv = typeof hrV === 'function' ? Object.assign(hrV(hh), { rpNx: 'ready' }) : null;
  const head = hv && typeof hrHead === 'function' ? `<div class="pnl hd rpk-hd">${hrHead(hv)}</div>` : '';
  const ph = hdKitHero(kid(2), at(2)), pd = Object.assign(heroDev(ph), { atCap: true }); pd.have = pd.need;
  const nArt = [RP_ART.on, RP_ART.off].filter(p => RP_ART.ready.includes(p)).length;
  return `<section class="k-box rpk" style="grid-column:1/-1" id="kitRuneLimits"><h3>Рунные пределы</h3>
    <p class="k-note">Рунные пределы героя. На книге героя — пять навесных замков по правому краю: пройденный отперт и светит бирюзой, следующий на потолке уровня тлеет, а когда рун хватает — пульсирует. В шапке листов — рунные камни у лица, на пути развития камни — ворота пределов. Доблесть гасит все пять: пределы проходятся заново.${TM(` Слово автора 30.09.2026: «Замки со светящимся бирюзовым цветом в виде рунных пределов — 10 из 10». §10.1: пять пределов на уровнях ${caps.slice(0, top).join(' / ')}; число замков и камней — INV.hero.capByLim. Замки — hbLocks в screens/book.js; камни — rpPost, rpRow, rpNext здесь; шапка — hrHead в screens/heroes.js.`)}</p>
    <div class="k-air-r"><b>Камень</b><div class="rpk-sts">${stones}</div><small>Размеры — плитка, шапка карточки, путь развития, лист предела. Пульс — смена погасшего и горящего, движется только прозрачность.</small></div>
    <div class="k-air-r"><b>Книга героя</b><div class="rpk-tiles">${tiles}</div><small>Мелкая книга, как в отряде: пять замков столбцом по правому краю, сверху вниз — пределы I…V. Пройденный отперт и светит бирюзой; следующий на потолке уровня тлеет или пульсирует.</small></div>
    <div class="k-air-r"><b>Шапка карточки и путь</b><div class="rpk-duo">${head}<div class="hdv hdk rpk-path">${hdPath(ph, pd)}</div></div><small>В шапке — столбы камней у лица. На пути — ворота пределов: пройденные горят, следующий — кнопка с уровнем, на котором он стоит.</small></div>
    <div class="k-air-r"><b>Строка</b><div class="rpk-row">${[0, 2, top].map(n => rpRow(n)).join('')}</div><small>В листе предела, в превью доблести и в «Что изменилось» — пять камней строкой: было → стало.</small></div>
    ${TM(`<p class="k-note">Картинка: SVG-заглушка в hero-dev.css — плитка и шапка всегда на ней, чётче в мелком. Нарисованный камень — tools/art-gen/jobs/rune-limits.json, горящий, $0,07; погасший выведен из него — tools/art-gen/rune_stones.py, силуэт один. Выгружено ${nArt} из 2 (RP_ART.ready): после выгрузки крупные камни от 18 px берут картинку.</p>`)}
  </section>`;
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: rpKitHtml });
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: hdKitHtml });

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Развитие · пробитие предела', 'Уровень упёрся в потолок, руны в запасах: лист предела, затем руны вспыхивают и слетаются в отметку, потолок — новый',
    () => {
      const h = H(HD_DATA.flow.limit); if (!h) return;
      S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.seg.hero = 'power'; S.selHero = h.id; S.overlay = null;
      h.lvl = h.cap; const d = heroDev(h); if (d.rune && d.have < d.need) BAG.add(d.rune.id, d.need - d.have);
      ACT.limitdo(`${hdOp()}:${h.id}`);
    }],
  ['Развитие · что даст доблесть', 'Честное превью до подтверждения: что получит герой, что начнётся заново, что сохранится; цена — у кнопки',
    () => {
      const h = H(HD_DATA.flow.valor); if (!h) return;
      S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.seg.hero = 'power'; S.selHero = h.id;
      h.lim = INV.hero.valorAtLim; h.cap = hdCapOf(h.lim); h.lvl = h.cap;
      const d = heroDev(h); if (d.vr && !d.vrHave) BAG.add(d.vr.id, 1);
      ACT.valor(h.id);
    }],
  ['Развитие · руна обучения', 'Руна первой доблести с 8-го уровня Странника: герой цикла I берёт доблесть на любом пределе — во втором биоме',
    () => {
      /* аккаунт в начале второго биома: руна обучения не потрачена, золотой герой цикла I с первым пределом */
      const x = RS.heroes.find(r => r.src === 'gold' && r.c === HD_DATA.train.cyc && r.maxV > 0 && !rsHas(r)); if (!x) return;
      S.rs.owned[x.id] = { lvl: hdCapOf(HD_DATA.flow.train), lim: HD_DATA.flow.train, valor: 0, how: 'gold' }; S.hd.train = 1;
      S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.seg.hero = 'power'; S.selHero = x.id; S.overlay = null;
      ACT.valor(x.id);
    }],
  ['Развитие · последняя доблесть', 'Значок доблести взлетает и встаёт на место, свет редкости героя; «Что изменилось» — по строке, орден раскрыт',
    () => {
      const h = H(HD_DATA.flow.last); if (!h) return;
      S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.seg.hero = 'power'; S.selHero = h.id; S.overlay = null;
      h.valor = h.maxV - 1; h.lim = INV.hero.valorAtLim; h.cap = hdCapOf(h.lim); h.lvl = h.cap;
      const d = heroDev(h); if (d.vr && !d.vrHave) BAG.add(d.vr.id, 1);
      ACT.valordo(`${hdOp()}:${h.id}`);
    }],
  ['Снаряжение и талисманы · одно окно', 'Слева места героя, справа запасы: перетащить на место или нажать вещь и место; сравнение стрелками, «Надеть лучшее»',
    () => {
      const h = H(HD_DATA.flow.gear); if (!h) return;
      S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.seg.hero = 'gear'; S.selHero = h.id;
      S.overlay = { t: 'gear', arg: h.id };
      render();
      const best = grEqOn() ? Object.values(S.eq.items).filter(it => !it.on).map(it => ({ it, g: eqGain(h, it) })).sort((a, b) => b.g - a.g)[0] : null;
      if (best) { S.gear.tab = 'eq'; S.eq.pick = best.it.uid; S.gear.focus = grKey('eq', best.it.slot); }
    }],
);

/* ================== состояние ==================
   S.hd: srv — итоги операций развития по номерам, seq — номер следующей, fx — идущая анимация (номер операции, начало, пропуск),
   lv — последний подъём уровня для полосы. S.gear: hid — герой окна, tab — вкладка запасов, focus — выбранное место, srv и seq —
   операции «Надеть лучшее», flash — места, куда только что легли вещи, enter — окно только что открылось */
function hdState(s) {
  /* train — сколько рун обучения у аккаунта: 8-й уровень их выдал (§16), у демо-аккаунта руна уже потрачена (HD_DATA.train.demo) */
  s.hd = { srv: {}, seq: 1, fx: null, lv: null, train: s.acc.level >= HD_DATA.train.level ? HD_DATA.train.demo : 0 };
  s.qty = HD_DATA.qtyStart;
  s.gear = { hid: '', tab: 'eq', focus: '', srv: {}, seq: 1, flash: null, enter: false };
  return s;
}
const hdInitBase = initialState;
initialState = function () { return hdState(hdInitBase()); };
hdState(S);
