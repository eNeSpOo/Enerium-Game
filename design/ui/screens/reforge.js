/* screens/reforge.js — «Ремесло → Перековка» (GDD §22; §19.1, §21, §26). Договор — screens/model.js.
   Отдельное окно рядом с Лавкой и Рынком — слова автора 29.09.2026: «Перековка — отдельное окно, как рынок, лавка и т. д., с выбором
   из 3 режимов: духовные талисманы, снаряжение и рабочие… Цены в золоте». И следом: «игрок должен сам выбирать, какие 10 талисманов,
   рабочих и снаряжение он перекует в редкость выше со случайным ролом».
   Регистрирует: CRAFT_SEGS.reforge и вкладку «Перековка» в шапке «Ремесла» (обёртка SCREENS.craft: список сегментов model.js не
   правится); «сервер» перековки RF_SRV — TL_SRV.forge и EQ_SRV.forge его входы; действия ACT.rf*; кнопку «Перековка рабочих»
   в листе «Артель» (обёртка OV.rtart, screens/rituals.js); раздел UI-кита (KIT_EXTRA); сценарии презентации.
   Правила: N свободных одной редкости → один редкостью выше, итог всегда выше (§22), только внутри своего режима.
   - талисманы: 10 → 1, какой талисман — случай по весам пула редкости, как в сундуке;
   - снаряжение: 10 → 1, слот — случайный, цикл — самый ранний из отмеченных: итог зависит от выбора, и окно это говорит;
   - рабочие: 10 → 1 — слово автора 29.09.2026, как у талисманов и снаряжения (ADR-0031, дополнение; прогон — docs/content/ритуалы.md). Рабочие одной редкости одинаковы (§19.1) —
     итог без случайности.
   Что уйдёт, отмечает игрок: сетка выбранной редкости, отметка нажатием, счётчик «7 / 10», «×» снимает все отметки. Подсказки —
   «Повторы» у талисманов и снаряжения, «Слабые» у снаряжения, «Любые» у рабочих — только дополняют отмеченное до нужного числа.
   Надетое и занятое в ритуале отметить нельзя: клетка приглушена, нажатие говорит почему — строкой под сеткой.
   Цена — золото по циклу: талисманы — база редкости × RF_DATA.talCyc[цикл аккаунта], рабочие — × EN_RITUALS.rules.forge.cyc,
   снаряжение — × цикл итога.
   Сервер решает: перековка — операция с номером (S.rf.srv). На «сервер» уходят режим, редкость и список отмеченного: у талисманов —
   номера (повтор — столько раз, сколько штук), у снаряжения — номера экземпляров, у рабочих — номера рабочих. «Сервер» проверяет,
   что всё это есть у игрока, свободно — не надето и не в ритуале, — одной редкости и ровно N, затем списывает и выдаёт итог одним
   вызовом; повтор номера ничего не меняет. Итог талисмана и снаряжения — генератор на сиде операции. Анимация только показывает
   итог, выданный до неё: на орбите «наковальни» отмеченное стягивается в центр, вспышка цвета новой редкости, итог поднимается.
   Нажатие — сразу итог; «меньше движения» — без анимации. Движение — transform и opacity, моменты — целые мс от начала показа:
   перерисовка посреди анимации её не рвёт.
   Вид — «Правила воздуха»: слева лестница редкостей кристаллами, в центре сетка с отметками, справа наковальня — отмеченное на
   орбите, что выйдет, цена и одно действие. Значки — арт screens/art-icons.js (eqIcon, talIcon), редкость — рамкой и цветом
   --r1…--r7, рабочий — кристалл. Своё состояние — S.rf. Служебное — только команде: TM, PL, tmT.
   Автопроверка — tools/content-gen/screens/check_reforge.js. */
'use strict';

/* ================== данные окна: демонстрация, не баланс ================== */
const RF_DATA = {
  modes: [['tal', 'Талисманы'], ['eq', 'Снаряжение'], ['work', 'Рабочие']],
  /* цена перековки талисманов по циклу аккаунта: база редкости входа — EN_TALISMANS.rules.reforge.gold, × множитель цикла.
     Цикл II — ровно данные талисманов, дальше растёт вместе с доходом золота */
  talCyc: [0, 0, 1, 2, 3, 4, 5],
  demo: { r: 1 },   // сценарии: какую редкость показать и перековать
};
/* вид «наковальни»: размер круга задаёт CSS (--rf-ring), орбита и плитка — целые % от него; моменты — мс от начала показа;
   частицы вспышки по редкости итога 2…7 — [сколько, скорость, жизнь мс, размер]; золото — с эпической, кольцо — с древней */
const RF_FX = {
  orbit: 37, tile: 18,
  step: 45, fly: 360, flash: 600, flashDur: 520, rise: 680, riseDur: 460, end: 1300,
  burst: [null, null, [10, 130, 520, 4], [14, 150, 600, 4], [20, 170, 700, 5], [26, 190, 820, 5], [32, 210, 920, 6], [40, 230, 1040, 6]],
  gold: 4, ringFrom: 5, ringMs: 760,
};
/* редкость словом: итог — «редкий талисман», вход — «десять обычных» */
const RF_TEXT = {
  one: ['', 'обычный', 'редкий', 'уникальный', 'эпический', 'древний', 'первородный', 'вневременной'],
  many: ['', 'обычных', 'редких', 'уникальных', 'эпических', 'древних', 'первородных', 'вневременных'],
};

/* ================== помощники ================== */
const rfCyc = () => (S.acc && S.acc.cycle) || 1;
const rfNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
const rfReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
const rfColor = r => { try { return getComputedStyle(document.documentElement).getPropertyValue('--r' + r).trim() || EnFx.COL.gold; } catch (_) { return '#ddbc7a'; } };
const rfMode = () => (RF_MODES[S.seg.rf] ? S.seg.rf : 'tal');
const rfCap = s => (s ? s[0].toUpperCase() + s.slice(1) : '');
/* доля в базисных пунктах словом, целыми: 200 → «2 %», 250 → «2,5 %» */
const rfPct = bp => { const i = Math.floor(bp / 100), f = bp % 100; return `${i}${f ? ',' + String(f).padStart(2, '0').replace(/0$/, '') : ''} %`; };
const rfHero = id => { const h = id && typeof H === 'function' ? H(id) : null; return h ? h.name : 'другой герой'; };
/* рамка редкости вокруг арта предмета: без арта — прежний значок экрана */
const rfFrame = (r, inner, cls = '') => `<span class="rf-t${cls ? ' ' + cls : ''}" data-r="${r}">${inner}</span>`;

/* ---- талисманы: свободные — в запасах (TB), надетые — в местах героев (S.tal.eq) ---- */
function rfTalWorn(r) {
  const out = [];
  for (const [hid, eq] of Object.entries((S.tal && S.tal.eq) || {})) (eq || []).forEach((no, slot) => { if (no && tlR(no) === r) out.push({ no, hid, slot }); });
  return out;
}
/* порядок видов в сетке: которых больше — первыми, затем частые по весу пула; копии одного вида — рядом */
const rfTalW = (no, r) => { const f = tlFam(no); return (f && f.w && f.w[r - 1]) || 0; };
const rfTalOrd = r => (a, b) => b.q - a.q || rfTalW(b.no, r) - rfTalW(a.no, r) || a.no - b.no;
const rfTalFree = r => TB.list().filter(x => tlR(x.no) === r).sort(rfTalOrd(r));
/* клетки сетки: key — ключ отметки («номер.копия»; у надетого — «w.герой.место»), x — номер талисмана */
function rfTalUnits(r) {
  const out = [];
  for (const x of rfTalFree(r)) for (let k = 0; k < x.q; k++) out.push({ key: `${x.no}.${k}`, x: x.no, free: true });
  for (const w of rfTalWorn(r)) out.push({ key: `w.${w.hid}.${w.slot}`, x: w.no, free: false, hid: w.hid });
  return out;
}
/* подсказка «Повторы»: от каждого вида остаётся один — надетый или первый в запасах */
function rfTalDup(r) {
  const worn = new Set(rfTalWorn(r).map(w => w.no)), out = [];
  for (const x of rfTalFree(r)) for (let k = worn.has(x.no) ? 0 : 1; k < x.q; k++) out.push(`${x.no}.${k}`);
  return out;
}

/* ---- снаряжение: слабее — ранний цикл, меньшая главная строка ---- */
const rfEqWeakOrd = (a, b) => a.cyc - b.cyc || a.lines[0][1] - b.lines[0][1] || a.n - b.n;
/* клетки сетки: по слотам, внутри — от слабого; надетое — в конце */
function rfEqUnits(r) {
  const slots = EQD.rules.slots, so = it => slots.indexOf(it.slot), all = Object.values(S.eq.items).filter(it => it.r === r);
  const ord = (a, b) => so(a) - so(b) || rfEqWeakOrd(a, b);
  return all.filter(it => !it.on).sort(ord).map(it => ({ key: it.uid, x: it, free: true }))
    .concat(all.filter(it => it.on).sort(ord).map(it => ({ key: it.uid, x: it, free: false, hid: it.on })));
}
/* подсказка «Слабые»: свободные этой редкости от самого слабого */
const rfEqWeak = r => Object.values(S.eq.items).filter(it => it.r === r && !it.on).sort(rfEqWeakOrd).map(it => it.uid);
/* подсказка «Повторы»: в каждом слоте остаётся сильнейший — надетый этой редкости или лучший из свободных */
function rfEqDup(r) {
  const all = Object.values(S.eq.items).filter(it => it.r === r), out = [];
  for (const slot of EQD.rules.slots) {
    const L = all.filter(it => it.slot === slot), free = L.filter(it => !it.on).sort((a, b) => rfEqWeakOrd(b, a));
    out.push(...free.slice(L.some(it => it.on) ? 0 : 1));
  }
  return out.sort(rfEqWeakOrd).map(it => it.uid);
}

/* ---- рабочие: заняты те, кто в идущем ритуале; одной редкости все одинаковы ---- */
const rfRitOf = id => S.rituals.slots.find(x => x.st === 'run' && x.kind === 'work' && x.crew.includes(id)) || null;
function rfWorkUnits(r) {
  const busy = rtBusyW(), L = S.rituals.artel.filter(w => w.r === r);
  return L.filter(w => !busy.has(w.id)).map(w => ({ key: w.id, x: w, free: true }))
    .concat(L.filter(w => busy.has(w.id)).map(w => ({ key: w.id, x: w, free: false })));
}
const rfWorkFree = r => rfWorkUnits(r).filter(u => u.free).map(u => u.key);

/* талисман: арт семейства (talIcon) в рамке редкости; без арта — медальон экрана талисманов */
function rfTalTile(no, big) {
  const f = tlFam(no), r = tlR(no), art = f && typeof talIcon === 'function' && !tlHide(f) ? talIcon(f.cat, big ? 44 : 26, tlName(no)) : '';
  return art ? rfFrame(r, art, big ? 'lg' : '') : tlTile(no, { lg: !!big });
}
/* предмет снаряжения по слоту и редкости: арт слота (eqIcon) в рамке; без арта — прежний значок слота */
function rfEqTile(slot, r, big) {
  const art = typeof eqIcon === 'function' ? eqIcon(slot, big ? 44 : 26, eqSlotName(slot)) : '';
  return rfFrame(r, art || eqGlyph(slot), (big ? 'lg' : '') + (art ? '' : ' glyph'));
}
/* рабочий — фигура артели (wkIcon, screens/art-icons.js) в рамке редкости, в углу кристалл; без арта — кристалл своей редкости */
function rfWorkTile(r, big) {
  const art = typeof wkIcon === 'function' ? wkIcon(big ? 44 : 26, RAR[r] + ' рабочий') : '';
  return art ? rfFrame(r, art + `<i class="rf-wkc">${ICON('r' + r, big ? 16 : 11, '')}</i>`, (big ? 'lg ' : '') + 'wk')
    : rfFrame(r, ICON('r' + r, big ? 40 : 24, RAR[r]), (big ? 'lg ' : '') + 'cr');
}

/* ================== режимы ==================
   ok — данные есть; open — открыт на этом цикле; need — сколько одной редкости; units(r) — клетки сетки: свободные, затем надетые и
   занятые { key, x, free, hid }; idOf(key) — что уходит на «сервер»; d(u) — описание плитки, pic(d, big) — плитка; num(u) — число
   в клетке; line(u) — строка под сеткой о свободной клетке, why(u) — почему клетку нельзя отметить; price(r, keys) — цена в золоте;
   what(r, keys) — что выйдет: строка и пояснение; help — подсказки { имя, пояснение, keys(r) — порядок кандидатов };
   auto(r) — порядок прежних входов без списка; big(res) — итог в центре; gone(res) — что ушло, для анимации;
   got(res) — имя, строка и переход итога; forge(op, r, ids) — «сервер»: проверка, расход, итог */
const RF_MODES = {
  tal: {
    title: 'Перековка талисманов', noun: 'талисман', nouns: 'талисманов',
    ok: () => typeof TL !== 'undefined' && !!TL && typeof TB !== 'undefined',
    open: () => tlOpen(),
    lock: () => TL_WHY.lock(),
    need: () => TL.rules.reforge.need,
    units: r => rfTalUnits(r),
    idOf: key => +String(key).split('.')[0],
    d: u => u.x,
    pic: (no, big) => rfTalTile(no, big),
    num: u => tlShort(u.x),
    line: u => `${tlName(u.x)} · ${tlFx(u.x)}`,
    why: u => `${tlName(u.x)}: носит ${rfHero(u.hid)} — сначала снимите.`,
    price: r => TL.rules.reforge.gold[r - 1] * (RF_DATA.talCyc[rfCyc()] || 0),
    what: r => ({ t: `Случайный ${RF_TEXT.one[r + 1]} талисман`, s: `Любой из ${RF_TEXT.many[r + 1]} — как в сундуке.` }),
    help: { dup: { n: 'Повторы', t: 'Отметить повторы: от каждого талисмана останется один', keys: r => rfTalDup(r) } },
    auto: r => rfTalUnits(r).filter(u => u.free).map(u => u.key),
    big: res => rfTalTile(res.got, true),
    gone: res => res.took.flatMap(([no, n]) => Array.from({ length: n }, () => no)),
    got: res => ({ name: tlName(res.got), sub: tlFx(res.got), go: `<button class="link" data-a="sheet" data-v="zptalwho:${res.got}">${ic('users')}К герою</button>` }),
    forge(op, r, ids) {
      if (!tlOpen()) return { refuse: 'lock' };
      if (r >= 7) return { refuse: 'top' };
      if (!(r >= 1)) return { refuse: 'bad' };
      if (ids.length !== TL.rules.reforge.need) return { refuse: 'few' };
      const n = new Map();
      for (const x of ids) {
        const no = Number(x);
        if (!Number.isInteger(no) || !tlOk(no)) return { refuse: 'bad' };
        if (tlR(no) !== r) return { refuse: 'mix' };
        n.set(no, (n.get(no) || 0) + 1);
      }
      const worn = new Set(rfTalWorn(r).map(w => w.no));
      for (const [no, k] of n) if (TB.qty(no) < k) return { refuse: worn.has(no) ? 'busy' : 'bad' };
      const gold = RF_MODES.tal.price(r);
      if (!gold) return { refuse: 'lock' };
      if (S.wallet.gold < gold) return { refuse: 'gold' };
      const pool = tlPool(r + 1), W = pool.reduce((a, x) => a + x[1], 0);
      if (!W) return { refuse: 'top' };
      let k = EnLoot.makeRng(EnLoot.seedOf('перековка|' + op))(W), got = pool[0][0];
      for (const [no, w] of pool) { if (k < w) { got = no; break; } k -= w; }
      const took = [...n];
      for (const [no, q] of took) TB.take(no, q);
      S.wallet.gold -= gold; TB.add(got);
      return { ok: 'forge', mode: 'tal', r, took, got, gold };
    },
  },
  eq: {
    title: 'Перековка снаряжения', noun: 'предмет', nouns: 'предметов',
    ok: () => typeof EQD !== 'undefined' && !!EQD && !!S.eq,
    open: () => eqOpen(),
    lock: () => EQ_WHY.lock(),
    need: () => EQD.rules.reforge.need,
    units: r => rfEqUnits(r),
    idOf: key => String(key),
    d: u => ({ slot: u.x.slot, r: u.x.r }),
    pic: (d, big) => rfEqTile(d.slot, d.r, big),
    num: u => eqNum(u.x.lines[0][0], u.x.lines[0][1]),
    line: u => `${eqSlotName(u.x.slot)} · цикл ${ROMAN[u.x.cyc]} · ${eqMainTxt(u.x)}`,
    why: u => `${eqSlotName(u.x.slot)}: носит ${rfHero(u.hid)} — сначала снимите.`,
    /* цикл итога — самый ранний из отмеченных; пока ничего не отмечено — самый ранний из свободных этой редкости */
    cycOf(r, keys) {
      const U = RF_MODES.eq.units(r), by = new Map(U.map(u => [u.key, u])), L = (keys || []).map(k => by.get(k)).filter(Boolean);
      const src = L.length ? L : U.filter(u => u.free);
      return src.length ? Math.min(...src.map(u => u.x.cyc)) : rfCyc();
    },
    price: (r, keys) => EQD.rules.reforge.gold[r - 1] * RF_MODES.eq.cycOf(r, keys),
    what: (r, keys) => ({ t: `Случайный ${RF_TEXT.one[r + 1]} предмет · цикл ${ROMAN[RF_MODES.eq.cycOf(r, keys)] || ''}`, s: 'Слот — любой; цикл — самый ранний из отмеченных.' }),
    help: {
      weak: { n: 'Слабые', t: 'Отметить самые слабые: ранний цикл, меньшая главная строка', keys: r => rfEqWeak(r) },
      dup: { n: 'Повторы', t: 'Отметить повторы: в каждом слоте останется сильнейший', keys: r => rfEqDup(r) },
    },
    auto: r => rfEqWeak(r),
    big: res => { const it = eqItem(res.got); return it ? rfEqTile(it.slot, it.r, true) : rfFrame(res.r + 1, eqGlyph('main'), 'lg glyph'); },
    gone: res => (res.slots || []).map(slot => ({ slot, r: res.r })),
    got: res => { const it = eqItem(res.got); return it ? { name: `${eqSlotName(it.slot)} · цикл ${ROMAN[it.cyc]}`, sub: eqMainTxt(it), go: `<button class="link" data-a="sheet" data-v="eqitem:${it.uid}">${ic('info')}Свойства</button>` } : { name: 'Снаряжение', sub: '', go: '' }; },
    forge(op, r, ids) {
      if (!eqOpen()) return { refuse: 'lock' };
      if (r >= 7) return { refuse: 'top' };
      if (!(r >= 1)) return { refuse: 'bad' };
      if (ids.length !== EQD.rules.reforge.need) return { refuse: 'few' };
      if (new Set(ids.map(String)).size !== ids.length) return { refuse: 'bad' };
      const took = [];
      for (const uid of ids) {
        const it = eqItem(String(uid));
        if (!it) return { refuse: 'bad' };
        if (it.on) return { refuse: 'busy' };
        if (it.r !== r) return { refuse: 'mix' };
        took.push(it);
      }
      const cyc = Math.min(...took.map(it => it.cyc)), gold = EQD.rules.reforge.gold[r - 1] * cyc;
      if (S.wallet.gold < gold) return { refuse: 'gold' };
      const slots = took.map(it => it.slot);
      for (const it of took) delete S.eq.items[it.uid];
      S.wallet.gold -= gold;
      const got = eqAdd(S, eqMint({ r: r + 1, cyc }, EnEquip.seedOf('перековка-снаряжения|' + op)), 'Перековка');
      return { ok: 'forge', mode: 'eq', r, took: took.map(it => it.uid), slots, got: got.uid, gold, cyc };
    },
  },
  work: {
    title: 'Перековка рабочих', noun: 'рабочий', nouns: 'рабочих',
    ok: () => typeof RT !== 'undefined' && !!RT && !!RT.rules.forge && !!S.rituals,
    open: () => rtOpen(),
    lock: () => RT_WHY.closed(),
    need: () => RT.rules.forge.need,
    units: r => rfWorkUnits(r),
    idOf: key => String(key),
    d: u => u.x.r,
    pic: (r, big) => rfWorkTile(r, big),
    num: () => '',
    line: u => `${rfCap(RF_TEXT.one[u.x.r])} рабочий · −${rfPct(RT.rules.speed.perRBp * u.x.r)} времени ритуала за участника`,
    why: u => { const x = rfRitOf(u.key); return x ? `В ритуале «${x.n}» до ${rtHm(x.t1)} — освободится сам.` : 'Рабочий занят в ритуале.'; },
    price: r => RT.rules.forge.gold[r - 1] * (RT.rules.forge.cyc[rfCyc()] || 0),
    /* после перековки артели может не хватить на полную бригаду долгого ритуала — предупредить, но не запрещать */
    what(r, keys) {
      const need = RT.rules.forge.need, crew = RT.rules.unique.crew, left = S.rituals.artel.length - need + 1;
      const warn = (keys || []).length >= need && left < crew;
      return { t: `${rfCap(RF_TEXT.one[r + 1])} рабочий`, s: warn ? `В артели останется ${left}: долгим ритуалам нужна бригада до ${crew}.` : `−${rfPct(RT.rules.speed.perRBp * (r + 1))} времени ритуала за участника. Все такие одинаковы.`, warn };
    },
    help: { any: { n: 'Любые', t: 'Отметить любых свободных: рабочие одной редкости одинаковы', keys: r => rfWorkFree(r) } },
    auto: r => rfWorkFree(r),
    big: res => rfWorkTile(res.r + 1, true),
    gone: res => res.took.map(() => res.r),
    got: res => ({ name: `${rfCap(RF_TEXT.one[res.r + 1])} рабочий`, sub: `−${rfPct(RT.rules.speed.perRBp * (res.r + 1))} времени ритуала за участника`, go: `<button class="link" data-a="zpartel">${ic('users')}Артель</button>` }),
    forge(op, r, ids) {
      if (!rtOpen()) return { refuse: 'lock' };
      if (r >= 7) return { refuse: 'top' };
      if (!(r >= 1)) return { refuse: 'bad' };
      const F = RT.rules.forge, R = S.rituals, set = new Set(ids.map(String)), busy = rtBusyW();
      if (ids.length !== F.need) return { refuse: 'few' };
      if (set.size !== ids.length) return { refuse: 'bad' };
      for (const id of set) {
        const w = R.artel.find(x => x.id === id);
        if (!w) return { refuse: 'bad' };
        if (busy.has(id)) return { refuse: 'busy' };
        if (w.r !== r) return { refuse: 'mix' };
      }
      const gold = RF_MODES.work.price(r);
      if (!gold) return { refuse: 'lock' };
      if (S.wallet.gold < gold) return { refuse: 'gold' };
      const id = 'wf-' + op;
      R.artel = R.artel.filter(w => !set.has(w.id));
      R.artel.push({ id, r: r + 1 });
      S.wallet.gold -= gold;
      return { ok: 'forge', mode: 'work', r, took: [...set], got: id, gold };
    },
  },
};
const RF_WHY = {
  none: () => 'Перековать нечего.',
  lock: m => RF_MODES[m].lock(),
  few: m => `Отметьте ровно ${RF_MODES[m].need()} одной редкости.`,
  bad: () => 'Отмеченного уже нет в запасах.',
  busy: () => 'Надетое и занятое в ритуале не перековывается.',
  mix: () => 'Отметьте предметы одной редкости.',
  gold: () => 'Не хватает золота.',
  top: () => 'Вневременные не перековываются: выше редкости нет.',
};
const rfOk = m => { const M = RF_MODES[m]; try { return !!M && M.ok(); } catch (_) { return false; } };
const rfHave = (m, r) => RF_MODES[m].units(r).filter(u => u.free).length;
const rfCan = m => rfOk(m) && RF_MODES[m].open() && [1, 2, 3, 4, 5, 6].some(r => rfHave(m, r) >= RF_MODES[m].need());
/* выбранная редкость режима: выбор игрока, редкость начатых отметок или первая, где хватает, иначе первая, где что-то есть */
function rfSel(m) {
  const v = S.rf.sel[m], P = S.rf.pick[m];
  if (v >= 1 && v <= 6) return v;
  if (P && P.r >= 1 && P.r <= 6) return P.r;
  const R = [1, 2, 3, 4, 5, 6], need = RF_MODES[m].need();
  return R.find(r => rfHave(m, r) >= need) || R.find(r => rfHave(m, r) > 0) || 1;
}
/* отмеченное игроком: только то, что сейчас свободно этой редкости, не больше нужного. Надели или сплавили — отметка уходит сама */
function rfPicked(m, r) {
  const P = S.rf.pick[m], M = RF_MODES[m];
  if (!P || P.r !== r) return [];
  const ok = new Set(M.units(r).filter(u => u.free).map(u => u.key));
  return P.keys.filter(k => ok.has(k)).slice(0, M.need());
}
/* что добавит подсказка: её кандидаты, которых ещё нет среди отмеченных, — до нужного числа */
function rfHelpAdd(m, r, k, keys) {
  const M = RF_MODES[m], H0 = M.help[k], left = M.need() - keys.length;
  if (!H0 || left <= 0) return [];
  const have = new Set(keys);
  return H0.keys(r).filter(x => !have.has(x)).slice(0, left);
}

/* ================== «сервер» ==================
   Перековка — одним вызовом: проверка, расход, итог. Номер операции несёт кнопка «Перековать»: повтор номера возвращает прежний итог и
   ничего не меняет. Отказ не записывается — следующая попытка идёт с тем же номером. В игре сид и итог присылает сервер */
const RF_SRV = {
  run(op, f) {
    const O = S.rf.srv;
    if (O[op]) return Object.assign({ again: true }, O[op]);
    const r = f();
    if (!r.refuse) { O[op] = r; S.rf.seq++; }
    return r;
  },
  /* mode — режим; op — номер операции; r — редкость входа; ids — что отметил игрок: у талисманов — номера, повтор — столько раз,
     сколько штук; у снаряжения — номера экземпляров; у рабочих — номера рабочих */
  forge(mode, op, r, ids) {
    if (!rfOk(mode)) return { refuse: 'none' };
    const list = Array.isArray(ids) ? ids.slice() : [];
    return RF_SRV.run(String(op), () => RF_MODES[mode].forge(String(op), +r, list));
  },
};
/* прежние входы — автопроверки талисманов и снаряжения: без списка отмечается то, что отметили бы подсказки по порядку сетки
   (у талисманов — повторы и частые, у снаряжения — самые слабые), и на «сервер» всё равно уходит список */
const rfAutoIds = (m, r) => { const M = RF_MODES[m]; try { return M.auto(r).slice(0, M.need()).map(M.idOf); } catch (_) { return []; } };
if (typeof TL_SRV !== 'undefined') TL_SRV.forge = (op, r, ids) => RF_SRV.forge('tal', op, r, ids || rfAutoIds('tal', +r));
if (typeof EQ_SRV !== 'undefined') EQ_SRV.forge = (op, r, ids) => RF_SRV.forge('eq', op, r, ids || rfAutoIds('eq', +r));
/* десять талисманов по порядку подсказок — [номер, штук]; null — не набирается. Имя прежнее: его зовут автопроверки талисманов */
function tlForgePick(r) {
  const ids = rfAutoIds('tal', r);
  if (ids.length < TL.rules.reforge.need) return null;
  const n = new Map(); for (const no of ids) n.set(no, (n.get(no) || 0) + 1);
  return [...n];
}

/* ================== вид ================== */
/* орбита наковальни: n мест по кругу от верха, по часовой. Целые %: левый и верхний край плитки — от круга, путь к центру — от плитки */
function rfOrbit(n) {
  const G = RF_FX, h = Math.floor(G.tile / 2), out = [];
  for (let i = 0; i < n; i++) {
    const a = (-90 + Math.round(i * 360 / n)) * Math.PI / 180, x = Math.round(Math.cos(a) * G.orbit), y = Math.round(Math.sin(a) * G.orbit);
    out.push([50 + x - h, 50 + y - h, Math.round(-x * 100 / G.tile), Math.round(-y * 100 / G.tile)]);
  }
  return out;
}
/* лестница редкостей: кристалл и сколько свободных; хватает — число светится, выбранная — подсвечена */
function rfStepHtml(m, r, sel, act = 'rfsel') {
  const n = rfHave(m, r), need = RF_MODES[m].need(), t = `${RAR[r]}: свободных ${n}, нужно ${need}`;
  return `<button class="rf-step${n >= need ? ' ok' : ''}" data-r="${r}" data-a="${act}" data-v="${m}:${r}" aria-pressed="${sel === r}" aria-label="${t}" title="${t}">
    <span class="rf-cr" data-r="${r}">${ICON('r' + r, 22, RAR[r])}</span><b class="num rf-sq">${fmt(n)}</b></button>`;
}
function rfLadder(m, sel) {
  return `<div class="pnl rf-lad" role="group" aria-label="Какую редкость перековать">${[1, 2, 3, 4, 5, 6].map(r => rfStepHtml(m, r, sel)).join('')}</div>`;
}
/* клетка сетки: значок и одно число; отмеченная — галочка, надетая и занятая — приглушена со значком, нажатие объясняет */
function rfCell(m, r, u, on, cyc, cur) {
  const M = RF_MODES[m], n = M.num(u), lock = !u.free, label = trEsc(lock ? M.why(u) : M.line(u));
  const badge = lock ? `<span class="rf-lb">${ic(m === 'work' ? 'hour' : 'users')}</span>` : on ? `<span class="rf-ck">${ic('check')}</span>` : '';
  return `<button class="rf-cell${lock ? ' lock' : ''}" data-r="${r}" data-a="rfpick" data-v="${m}:${r}:${trEsc(u.key)}" aria-pressed="${!!on}"${lock ? ' aria-disabled="true"' : ''}${cur ? ' aria-current="true"' : ''} aria-label="${label}" title="${label}">${M.pic(M.d(u))}${cyc ? `<span class="rf-cy">${ROMAN[u.x.cyc]}</span>` : ''}${n ? `<span class="rf-q">${n}</span>` : ''}${badge}</button>`;
}
/* шапка сетки: счётчик «7 / 10», подсказки, «×» — снять все отметки */
function rfPickHead(m, r, keys) {
  const M = RF_MODES[m], need = M.need(), n = keys.length;
  const helps = Object.entries(M.help).map(([k, x]) => `<button class="btn sm rf-hb" data-a="rfhelp" data-v="${m}:${r}:${k}" title="${x.t}"${rfHelpAdd(m, r, k, keys).length ? '' : ' disabled'}>${x.n}</button>`).join('');
  return `<div class="rf-ph"><span class="rf-cnt${n >= need ? ' full' : ''}" aria-label="Отмечено ${n} из ${need}"><b class="num">${n}</b><small>/${need}</small></span><span class="rf-cl">${RF_TEXT.many[r]}</span><span class="rf-sp"></span>${helps}<button class="btn sm rf-hb" data-a="rfclear" data-v="${m}" aria-label="Снять все отметки" title="Снять все отметки"${n ? '' : ' disabled'}>${ic('x')}</button></div>`;
}
/* строка под сеткой: последняя нажатая клетка — что это или почему её нельзя отметить; пока ничего не отмечено — как отмечать */
function rfFocusHtml(m, r, keys) {
  const F = S.rf.focus, M = RF_MODES[m];
  if (F && F.m === m && F.r === r) {
    const u = M.units(r).find(x => x.key === F.key);
    if (u) return `<p class="rf-fo${u.free ? '' : ' warn'}">${trEsc(u.free ? M.line(u) : M.why(u))}</p>`;
  }
  return `<p class="rf-fo">${keys.length ? '' : 'Нажмите, чтобы отметить; ещё раз — снять.'}</p>`;
}
function rfPicker(m, r, keys) {
  const M = RF_MODES[m], U = M.units(r), on = new Set(keys), F = S.rf.focus;
  const cyc = m === 'eq' && new Set(U.map(u => u.x.cyc)).size > 1, cur = F && F.m === m && F.r === r ? F.key : '';
  const grid = U.length ? U.map(u => rfCell(m, r, u, on.has(u.key), cyc, u.key === cur)).join('') : `<p class="rf-empty">${rfCap(RF_TEXT.many[r])} ${M.nouns} нет.</p>`;
  return `<div class="pnl rf-pick">${rfPickHead(m, r, keys)}<div class="rf-grid scroll" data-keep="rf:${m}:${r}" role="group" aria-label="Что перековать">${grid}</div>${rfFocusHtml(m, r, keys)}</div>`;
}
/* круг наковальни. items — отмеченное { key, d }: на орбите, нажатие снимает отметку. fx — идущий показ: ушедшее стягивается в центр;
   вспышка; итог поднимается. e — мс от начала показа */
function rfRingHtml(m, r, items, fx, show, e) {
  const G = RF_FX, M = RF_MODES[m], d = t => `${Math.round(t - e)}ms`, pos = rfOrbit(M.need()), sz = `width:${G.tile}%;height:${G.tile}%`;
  const tiles = pos.map(([x, y, tx, ty], i) => {
    const at = `left:${x}%;top:${y}%;${sz}`;
    if (fx) { const it = fx.gone[i]; return it == null ? `<span class="rf-it none" style="${at}"></span>` : `<span class="rf-it rf-fly" style="${at};--tx:${tx}%;--ty:${ty}%;--dt:${d(i * G.step)};--tt:${G.fly}ms">${M.pic(it)}</span>`; }
    const it = items[i];
    if (!it) return `<span class="rf-it none" style="${at}"></span>`;
    return it.key != null ? `<button class="rf-it" style="${at}" data-a="rfpick" data-v="${m}:${r}:${trEsc(it.key)}" aria-label="Снять отметку" title="Снять отметку">${M.pic(it.d)}</button>`
      : `<span class="rf-it" style="${at}">${M.pic(it.d)}</span>`;
  }).join('');
  const R1 = r + 1;
  const core = fx
    ? `<span class="rf-core rf-go" data-r="${R1}" style="--dt:${d(G.flash)};--tt:${G.flashDur}ms"><b>?</b></span><i class="rf-fl" data-r="${R1}" style="--dt:${d(G.flash)};--tt:${G.flashDur}ms"></i><span class="rf-res rf-up" data-r="${R1}" style="--dt:${d(G.rise)};--tt:${G.riseDur}ms">${M.big(fx.res)}</span>`
    : show ? `<span class="rf-res" data-r="${R1}">${M.big(show)}</span>` : `<span class="rf-core" data-r="${R1}"><b>?</b></span>`;
  const tap = fx ? '<button class="rf-tap" data-a="rfskip" aria-label="Сразу к итогу" tabindex="-1"></button>' : '';
  return `<div class="rf-ring${fx ? ' rf-anim' : ''}" data-r="${R1}"${fx ? ` data-rfrun="${fx.id}"` : ''}><i class="rf-disc"></i>${tiles}${core}${tap}</div>`;
}
/* наковальня: круг с отмеченным и строка «что выйдет» рядом, под ними — одно действие с ценой. После перековки строка — «Вышло» */
function rfAnvil(m, r, keys) {
  const M = RF_MODES[m], need = M.need(), price = M.price(r, keys);
  const F = S.rf.fx, fx = F && F.mode === m && F.r === r ? F : null;
  const show = !fx && S.rf.show && S.rf.show.mode === m && S.rf.show.r === r ? S.rf.show.res : null;
  const op = `rf${S.rf.seq}`, rich = S.wallet.gold >= price, full = keys.length === need, can = full && rich && price > 0;
  const U = new Map(M.units(r).map(u => [u.key, u])), items = keys.filter(k => U.has(k)).map(k => ({ key: k, d: M.d(U.get(k)) }));
  const g = show ? M.got(show) : null, w = g ? null : M.what(r, keys);
  const out = g
    ? `<div class="rf-out" data-r="${r + 1}"><span class="eyebrow">Вышло</span><b class="serif">${trEsc(g.name)}</b>${g.sub ? `<small>${trEsc(g.sub)}</small>` : ''}${g.go || ''}</div>`
    : `<div class="rf-out" data-r="${r + 1}"><span class="eyebrow">Выйдет</span><b class="serif">${w.t}</b><small${w.warn ? ' class="warn"' : ''}>${w.s}</small></div>`;
  const why = !full ? `Отметьте ещё ${need - keys.length}` : !rich ? 'Не хватает золота' : '';
  const btn = `<button class="btn go rf-btn${full && !rich ? ' poor' : ''}" data-a="rfforge" data-v="${op}:${m}:${r}"${can ? '' : ' disabled'}${why ? ` title="${why}"` : ''}>Перековать${costTag('gold', price)}</button>`;
  const cost = m === 'eq' ? `${fmt(EQD.rules.reforge.gold[r - 1])} × цикл итога` : m === 'tal' ? `${fmt(TL.rules.reforge.gold[r - 1])} × ${RF_DATA.talCyc[rfCyc()] || 0}, цикл ${ROMAN[rfCyc()]}` : `${fmt(RT.rules.forge.gold[r - 1])} × ${RT.rules.forge.cyc[rfCyc()] || 0}, цикл ${ROMAN[rfCyc()]}`;
  const note = TM(`${op} → RF_SRV: список отмеченного; повтор номера ничего не меняет. ${m === 'work' ? 'Итог без случайности.' : 'Итог — сид операции.'} Цена — ${cost}.`, 'p', 'reason rf-tm');
  const e = fx ? Math.max(0, rfNow() - fx.t0) : 0;
  return `<div class="pnl rf-anv" data-r="${r + 1}"><div class="rf-top">${rfRingHtml(m, r, items, fx, show, e)}${out}</div>${full && !rich ? '<p class="rf-why">Не хватает золота</p>' : ''}${btn}${note}</div>`;
}
function rfView() {
  const m = rfMode(), M = RF_MODES[m];
  const tabs = RF_DATA.modes.map(([k, l]) => `<button role="tab" aria-selected="${m === k}" data-a="seg" data-v="rf:${k}">${l}${rfCan(k) ? '<span class="dot" title="Можно перековать"></span>' : ''}</button>`).join('');
  const lock = t => `<div class="pnl rf-lock"><span class="rf-lk">${ic('lock')}</span><p>${t}</p></div>`;
  let body;
  if (!rfOk(m)) body = lock('Перековать пока нечего.');
  else if (!M.open()) body = lock(M.lock());
  else { const r = rfSel(m), keys = rfPicked(m, r); body = `<div class="rf-main">${rfLadder(m, r)}${rfPicker(m, r, keys)}${rfAnvil(m, r, keys)}</div>`; }
  return `<section class="scr rf"><div class="row rf-bar"><div class="tabs" role="tablist" aria-label="Что перековать">${tabs}</div></div>${body}</section>`;
}

/* ================== показ итога ================== */
let rfFxSeq = 0, RF_FXI = null;
/* gone — плитки ушедшего в порядке орбиты, как их видел игрок; без него — по итогу «сервера» */
function rfFxStart(m, r, res, gone) {
  if (rfReduced()) { S.rf.fx = null; render(); return; }
  const fx = { id: ++rfFxSeq, mode: m, r, res, gone: gone || RF_MODES[m].gone(res), t0: rfNow() };
  S.rf.fx = fx; render();
  setTimeout(() => { if (S.rf.fx === fx) rfBurst(fx); }, RF_FX.flash);
  setTimeout(() => { if (S.rf.fx === fx) { S.rf.fx = null; render(); } }, RF_FX.end);
}
/* частицы вспышки — слой рядом с #game: перерисовка экрана его не сносит. Радиус кольца — от круга на экране */
function rfBurst(fx) {
  if (!window.EnFx) return;
  const g = document.getElementById('game'), p = g && g.parentElement; if (!p || !p.querySelector) return;
  let L = p.querySelector(':scope > .rf-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'rf-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  if (!RF_FXI || RF_FXI.host !== L) { if (RF_FXI) RF_FXI.destroy(); RF_FXI = EnFx.create(L); }
  const ring = g.querySelector(`[data-rfrun="${fx.id}"]`), el = ring && ring.querySelector('.rf-go'); if (!el) return;
  const R1 = fx.r + 1, P = RF_FX.burst[R1], b = RF_FXI.center(el), col = rfColor(R1), rad = Math.round(ring.getBoundingClientRect().width / 2);
  if (P) RF_FXI.burst(b.x, b.y, col, ...P);
  if (P && R1 >= RF_FX.gold) RF_FXI.burst(b.x, b.y, EnFx.COL.gold, ...P);
  if (R1 >= RF_FX.ringFrom && rad > 0) RF_FXI.ring(b.x, b.y, col, rad, RF_FX.ringMs, 2);
}

/* ================== действия ================== */
Object.assign(ACT, {
  /* ступень лестницы: другая редкость — отметки прежней снимаются, все отмеченные — одной редкости */
  rfsel(v) {
    const [m, r0] = String(v).split(':'), r = Math.min(6, Math.max(1, +r0 || 1));
    if (!RF_MODES[m] || !rfOk(m)) return;
    if (rfSel(m) !== r) S.rf.pick[m] = null;
    S.rf.sel[m] = r; S.rf.show = null; S.rf.focus = null; render();
  },
  /* клетка: v — «режим:редкость:ключ». Свободная — отметить или снять; надетая и занятая — только причина строкой под сеткой */
  rfpick(v) {
    const [m, r0, ...rest] = String(v).split(':'), key = rest.join(':'), r = +r0, M = RF_MODES[m];
    if (!M || !rfOk(m) || !(r >= 1 && r <= 6)) return;
    const u = M.units(r).find(x => x.key === key); if (!u) return;
    if (rfSel(m) !== r) S.rf.pick[m] = null;
    S.rf.sel[m] = r; S.rf.focus = { m, r, key }; S.rf.show = null;
    if (u.free) {
      const keys = rfPicked(m, r), i = keys.indexOf(key);
      if (i >= 0) keys.splice(i, 1);
      else if (keys.length >= M.need()) { toast(`Уже отмечено ${M.need()}. Снимите отметку, чтобы выбрать другое.`); return; }
      else keys.push(key);
      S.rf.pick[m] = { r, keys };
    }
    render();
  },
  /* подсказка: дополняет отмеченное своими кандидатами до нужного числа, отмеченное игроком не трогает */
  rfhelp(v) {
    const [m, r0, k] = String(v).split(':'), r = +r0, M = RF_MODES[m];
    if (!M || !rfOk(m) || !M.help[k] || !(r >= 1 && r <= 6)) return;
    if (rfSel(m) !== r) S.rf.pick[m] = null;
    const keys = rfPicked(m, r), add = rfHelpAdd(m, r, k, keys);
    S.rf.sel[m] = r; S.rf.show = null; S.rf.focus = null;
    if (!add.length) { toast('Подсказке нечего добавить.'); return; }
    S.rf.pick[m] = { r, keys: keys.concat(add) }; render();
  },
  rfclear(v) { const m = String(v); if (!RF_MODES[m]) return; S.rf.pick[m] = null; S.rf.focus = null; render(); },
  /* «Перековать»: v — «операция:режим:редкость», список — отмеченное игроком. Итог выдан до показа, повтор номера ничего не меняет */
  rfforge(v) {
    const [op, m, r0] = String(v).split(':'), r = +r0, M = RF_MODES[m];
    if (!M || !rfOk(m)) return;
    const keys = rfPicked(m, r), U = new Map(M.units(r).map(u => [u.key, u])), gone = keys.map(k => M.d(U.get(k)));
    const res = RF_SRV.forge(m, op, r, keys.map(M.idOf));
    if (res.again) return;
    if (res.refuse) { toast(RF_WHY[res.refuse](m)); return; }
    S.rf.last[m] = res; S.rf.show = { mode: m, r, res }; S.rf.sel[m] = r; S.rf.pick[m] = null; S.rf.focus = null;
    rfFxStart(m, r, res, gone);
  },
  /* нажатие на круг посреди показа — сразу итог */
  rfskip() { if (S.rf.fx) { S.rf.fx = null; render(); } },
  /* в окно перековки из других экранов: «режим» или «режим:редкость» */
  rfgo(v) {
    const [m, r0] = String(v).split(':'), r = +r0;
    S.overlay = null; S.route = 'craft'; S.seg.craft = 'reforge';
    if (RF_MODES[m]) { S.seg.rf = m; if (r >= 1 && r <= 6) { if (rfOk(m) && rfSel(m) !== r) S.rf.pick[m] = null; S.rf.sel[m] = r; } }
    S.rf.show = null; S.rf.focus = null; render();
  },
});

/* ================== вход в окно из листа «Артель» (screens/rituals.js) ================== */
if (typeof OV !== 'undefined' && typeof OV.rtart === 'function') {
  const rfArtBase = OV.rtart;
  OV.rtart = function () {
    const h = rfArtBase.apply(this, arguments);
    if (typeof h !== 'string' || !h || !rfOk('work') || h.includes('data-a="rfgo"')) return h;
    const b = `<button class="btn" data-a="rfgo" data-v="work">${ic('flame')}Перековка рабочих</button>`;
    return h.includes('<div class="sheet-f">') ? h.replace('<div class="sheet-f">', `<div class="sheet-f">${b}`) : h.replace(/<\/aside><\/div>\s*$/, `<div class="sheet-f">${b}</div></aside></div>`);
  };
}

/* ================== раздел UI-кита ================== */
function rfKitHtml() {
  if (!rfOk('tal') || !rfOk('eq') || !rfOk('work')) return '';
  const noop = h => h.replace(/data-a="[^"]*"/g, 'data-a="noop"');
  const m = 'tal', r = 1, M = RF_MODES[m], U = M.units(r).filter(u => u.free), need = M.need();
  if (!U.length) return '';
  const by = new Map(U.map(u => [u.key, u])), keys = M.auto(r), part = keys.slice(0, Math.max(1, need - 3));
  /* клетка в четырёх состояниях: свободна, отмечена, надета, в ритуале */
  const W = RF_MODES.work.units(1)[0], hero = S.heroes[0];
  const cells = [['свободна', rfCell(m, r, U[0], false, false)], ['отмечена', rfCell(m, r, U[Math.min(1, U.length - 1)], true, false)],
    ['надета', rfCell(m, r, Object.assign({}, U[0], { key: 'kit', free: false, hid: hero && hero.id }), false, false)]]
    .concat(W ? [['в ритуале', rfCell('work', 1, Object.assign({}, W, { free: false }), false, false)]] : [])
    .map(([t, h]) => `<figure class="rf-kc">${noop(h)}<figcaption>${t}</figcaption></figure>`).join('');
  const head = noop(rfPickHead(m, r, part));
  const ring = noop(rfRingHtml(m, r, part.map(k => ({ key: k, d: M.d(by.get(k)) })), null, null, 0));
  const work = rfRingHtml('work', 1, [1, 1, 1].map(x => ({ d: x })), null, null, 0);
  const steps = [1, 2, 3].map(x => noop(rfStepHtml(m, x, 1))).join('');
  const gone = keys.slice(0, need).map(k => M.d(by.get(k)));
  const fake = { id: 'kit', mode: m, r, res: { r, got: gone[0], took: [] }, gone };
  const frames = [[RF_FX.step * 3, 'стягиваются в центр'], [RF_FX.flash + 120, 'вспышка цвета новой редкости'], [RF_FX.end, 'итог поднимается']]
    .map(([at, t], i) => `<figure class="rf-still"><div class="rf-frame">${noop(rfRingHtml(m, r, [], Object.assign({}, fake, { id: 'kit' + i }), null, at))}</div><figcaption><b>${i + 1}</b> — ${t}</figcaption></figure>`).join('');
  const price = (mm, rr, c) => mm === 'tal' ? TL.rules.reforge.gold[rr - 1] * (RF_DATA.talCyc[c] || 0) : mm === 'work' ? RT.rules.forge.gold[rr - 1] * (RT.rules.forge.cyc[c] || 0) : EQD.rules.reforge.gold[rr - 1] * c;
  const cyc = [2, 3, 4, 5, 6];
  const tab = `<table class="p-table rf-kt"><thead><tr><th>Вход</th>${RF_DATA.modes.map(([k, l]) => `<th>${l} · ${RF_MODES[k].need()} → 1</th>`).join('')}</tr></thead><tbody>${[1, 2, 3, 4, 5, 6].map(x => `<tr><td>${ICON('r' + x, 14, RAR[x])}${RAR[x]}</td>${RF_DATA.modes.map(([k]) => `<td class="n">${cyc.map(c => fmt(price(k, x, c))).join(' / ')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const F = RT.forge || {}, sim = `<table class="p-table rf-kt"><thead><tr><th>Цикл</th><th>Артель обычного: без → с</th><th>Лучшая пятёрка</th><th>Артель увлечённого: без → с</th></tr></thead><tbody>${Object.keys(F).map(c => { const o = F[c].o, e = F[c].e; return `<tr><td>${ROMAN[c]}</td><td class="n">${Math.round(o.artel[0] / 100)} → ${Math.round(o.artel[1] / 100)}</td><td class="n">−${o.t5[0] / 100} % → −${o.t5[1] / 100} %</td><td class="n">${Math.round(e.artel[0] / 100)} → ${Math.round(e.artel[1] / 100)}</td></tr>`; }).join('')}</tbody></table>`;
  return `<section class="k-box rf-kit" style="grid-column:1/-1" id="kitReforge"><h3>Перековка</h3>
    <p class="k-note">Своё окно в «Ремесле», рядом с Лавкой и Рынком: талисманы, снаряжение, рабочие. Что сплавить, отмечает игрок: ${need} одной редкости — в один редкостью выше, итог всегда выше. Слева — редкость кристаллами, в центре — сетка с отметками и счётчиком, справа — наковальня: отмеченное на орбите, что выйдет, цена в золоте и одно действие.${TM(' §22, слова автора 29.09.2026: «игрок должен сам выбирать». Экран — screens/reforge.js, «сервер» — RF_SRV: получает режим, редкость и список отмеченного, проверяет, что всё есть, свободно и одной редкости. Правила — EN_TALISMANS.rules.reforge, EN_EQUIPMENT.rules.reforge, EN_RITUALS.rules.forge; цена талисманов по циклу — RF_DATA.talCyc.')}</p>
    <div class="rf-kg">
      <div class="k-air-r"><b>Клетка — значок и одно число</b><div class="rf-kcs">${cells}</div><small>Нажатие отмечает, ещё раз — снимает. Надетое и занятое отметить нельзя: строка под сеткой говорит почему. У снаряжения число — главная строка, у талисмана — сила черты.</small></div>
      <div class="k-air-r"><b>Счётчик и подсказки</b><div class="rf-kh">${head}</div><small>«Повторы», «Слабые», «Любые» только дополняют отмеченное до нужного числа — решает игрок. «×» снимает все отметки.</small></div>
      <div class="k-air-r"><b>Лестница редкостей</b><div class="rf-kl">${steps}</div><small>Сколько свободных; хватает — число светится. Другая ступень — отметки снимаются: все одной редкости.</small></div>
    </div>
    <div class="rf-kg">
      <div class="k-air-r"><b>Наковальня · ${part.length} из ${need}</b><div class="rf-kr">${ring}</div><small>Отмеченное — на орбите, нажатие снимает отметку; пустые места — пунктиром. В центре — цвет редкости итога. Что выйдет — строкой рядом; зависит итог от выбора — строка это говорит: у снаряжения цикл итога — самый ранний из отмеченных.</small></div>
      <div class="k-air-r"><b>Рабочие · ${RF_MODES.work.need()} → 1</b><div class="rf-kr">${noop(work)}</div><small>Рабочий — кристалл редкости. Все рабочие одной редкости одинаковы: итог без случайности.</small></div>
    </div>
    <p class="k-note">Показ итога — около ${Math.floor(RF_FX.end / 1000)},${Math.floor(RF_FX.end % 1000 / 100)} с: отмеченное стягивается в центр, вспышка цвета новой редкости, итог поднимается. Итог выдан до анимации; нажатие на круг — сразу итог.</p>
    <div class="rf-board">${frames}</div>
    ${TM(`<div class="rf-kg"><div class="k-air-r"><b>Цена в золоте · циклы II / III / IV / V / VI</b>${tab}<small>Талисманы и рабочие — база × цикл аккаунта; снаряжение — × цикл итога.</small></div><div class="k-air-r"><b>Рабочие · прогон калькулятора, ${RF_MODES.work.need()} → 1</b>${sim}<small>Избыток не копится: артель держится у двух бригад, лучшая пятёрка идёт к капу. При 10 → 1 избыток копится, а перековка почти не идёт — расчёт в docs/content/ритуалы.md.</small></div></div>`, 'div')}
  </section>`;
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: rfKitHtml });

/* ================== регистрация, сценарии, состояние ================== */
CRAFT_SEGS.reforge = rfView;
/* вкладка «Перековка» в шапке «Ремесла» — после Рынка */
const rfCraftBase = SCREENS.craft;
SCREENS.craft = function () {
  const v = rfCraftBase.apply(this, arguments);
  if (!v || !v.seg || v.seg.key !== 'craft' || v.seg.items.some(x => x[0] === 'reforge')) return v;
  return Object.assign({}, v, { seg: Object.assign({}, v.seg, { items: v.seg.items.concat([['reforge', 'Перековка']]) }) });
};
/* сценарий: один обычный талисман — на героя, чтобы в сетке была клетка «надето» с причиной */
function rfFlowWear(r) {
  if (rfTalWorn(r).length || !tlOpen()) return;
  for (const x of TB.list().filter(y => tlR(y.no) === r && y.q === 1)) for (const h of S.heroes) if (TL_SRV.put(`tl${S.tal.seq}`, h.id, TL.rules.slots - 1, x.no).ok) return;
}
/* сценарий: отметить подсказкой, остальное — по порядку сетки, как отметил бы игрок */
function rfFlowPick(m, r, help) {
  const M = RF_MODES[m], keys = rfHelpAdd(m, r, help, []);
  for (const k of M.auto(r)) { if (keys.length >= M.need()) break; if (!keys.includes(k)) keys.push(k); }
  return keys;
}
FLOWS.push(
  ['Перековка · талисманы', 'Своё окно в «Ремесле»: игрок сам отмечает десять одной редкости — подсказка «Повторы» помогает, надетое отметить нельзя; наковальня показывает отмеченное, что выйдет и цену',
    () => {
      const r = RF_DATA.demo.r;
      S.route = 'craft'; S.seg.craft = 'reforge'; S.seg.rf = 'tal'; S.overlay = null; S.rf.show = null; S.rf.sel.tal = r;
      rfFlowWear(r);
      S.rf.pick.tal = { r, keys: rfHelpAdd('tal', r, 'dup', []) }; S.rf.focus = null;
      const w = RF_MODES.tal.units(r).find(u => !u.free); if (w) S.rf.focus = { m: 'tal', r, key: w.key };
    }],
  ['Перековка · итог', 'Десять отмеченных обычных талисманов — в один редкий: итог выдан до анимации, отмеченное стягивается в центр, вспышка, итог поднимается',
    () => {
      S.route = 'craft'; S.seg.craft = 'reforge'; S.seg.rf = 'tal'; S.overlay = null;
      const r = RF_DATA.demo.r, M = RF_MODES.tal, keys = rfFlowPick('tal', r, 'dup'), gone = keys.map(k => M.idOf(k));
      const res = RF_SRV.forge('tal', `rf${S.rf.seq}`, r, keys.map(M.idOf));
      if (res.ok) { S.rf.last.tal = res; S.rf.show = { mode: 'tal', r, res }; S.rf.sel.tal = r; S.rf.pick.tal = null; S.rf.focus = null; rfFxStart('tal', r, res, gone); }
    }],
  ['Перековка · рабочие', 'Лишние рабочие — десять одной редкости в одного редкостью выше: «Любые» отмечает свободных, занятые в ритуале приглушены; из листа «Артель» — кнопка сюда',
    () => {
      const r = RF_DATA.demo.r;
      S.route = 'craft'; S.seg.craft = 'reforge'; S.seg.rf = 'work'; S.overlay = null; S.rf.show = null; S.rf.sel.work = r;
      S.rf.pick.work = { r, keys: rfHelpAdd('work', r, 'any', []) }; S.rf.focus = null;
    }],
);
/* S.rf: srv — итоги операций по номерам; seq — номер следующей; sel — выбранная редкость режима (0 — сама); pick — отмеченное игроком
   { r, keys } по режимам; focus — последняя нажатая клетка { m, r, key }; last — итог последней перековки режима; show — итог
   в центре наковальни, пока игрок не отметил новое; fx — идущий показ */
function rfState(s) {
  s.rf = { srv: {}, seq: 1, sel: { tal: 0, eq: 0, work: 0 }, pick: { tal: null, eq: null, work: null }, focus: null, last: { tal: null, eq: null, work: null }, show: null, fx: null };
  return s;
}
const rfInitBase = initialState;
initialState = function () { return rfState(rfInitBase()); };
rfState(S);
