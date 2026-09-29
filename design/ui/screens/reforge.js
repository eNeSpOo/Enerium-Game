/* screens/reforge.js — «Ремесло → Перековка» (GDD §22; §19.1, §21, §26). Договор — screens/model.js.
   Отдельное окно рядом с Лавкой и Рынком — слова автора 29.09.2026: «Перековка — отдельное окно, как рынок, лавка и т. д., с выбором
   из 3 режимов: духовные талисманы, снаряжение и рабочие… Цены в золоте». Прежде перековка талисманов и снаряжения жила листами
   screens/talismans.js и screens/equipment.js — она перенесена сюда целиком: вид, «сервер» и сценарии.
   Регистрирует: CRAFT_SEGS.reforge и вкладку «Перековка» в шапке «Ремесла» (обёртка SCREENS.craft: список сегментов model.js не
   правится); «сервер» перековки RF_SRV — TL_SRV.forge и EQ_SRV.forge теперь его входы; действия ACT.rf*; кнопку «Перековка рабочих»
   в листе «Артель» (обёртка OV.rtart, screens/rituals.js); раздел UI-кита (KIT_EXTRA); сценарии презентации.
   Правила: N свободных одной редкости → один редкостью выше, итог всегда выше (§22), только внутри своего режима.
   - талисманы: 10 → 1, какой талисман — случай по весам пула редкости, как в сундуке; какие десять — сначала повторы;
   - снаряжение: 10 → 1, слот — случайный, цикл — самый ранний из десяти; какие десять — сначала самые слабые;
   - рабочие: 3 → 1 (docs/content/ритуалы.md). Специализаций нет, рабочие одной редкости одинаковы — итог без случайности.
   Надетое и занятое в ритуале не перековывается. Цена — золото по циклу: талисманы — база редкости × RF_DATA.talCyc[цикл аккаунта],
   рабочие — × EN_RITUALS.rules.forge.cyc, снаряжение — × цикл итога.
   Сервер решает: перековка — операция с номером (S.rf.srv): проверка, расход и итог одним вызовом, повтор номера ничего не меняет;
   итог талисмана и снаряжения — генератор на сиде операции. Анимация только показывает итог, выданный до неё: на орбите «наковальни»
   N предметов стягиваются в центр, вспышка цвета новой редкости, итог поднимается. Нажатие — сразу итог; «меньше движения» — без
   анимации. Движение — transform и opacity, моменты — целые мс от начала показа: перерисовка посреди анимации её не рвёт.
   Вид — «Правила воздуха»: слева лестница редкостей — сколько есть и сколько нужно, справа наковальня — что уйдёт, что выйдет, цена
   и одно действие. Значки — арт screens/art-icons.js (eqIcon, talIcon), редкость — рамкой и цветом --r1…--r7, рабочий — кристалл.
   Своё состояние — S.rf. Служебное — только команде: TM, PL, tmT. Автопроверка — tools/content-gen/screens/check_reforge.js. */
'use strict';

/* ================== данные окна: демонстрация, не баланс ================== */
const RF_DATA = {
  modes: [['tal', 'Талисманы'], ['eq', 'Снаряжение'], ['work', 'Рабочие']],
  /* цена перековки талисманов по циклу аккаунта: база редкости входа — EN_TALISMANS.rules.reforge.gold, × множитель цикла.
     Цикл II — ровно данные талисманов, дальше растёт вместе с доходом золота */
  talCyc: [0, 0, 1, 2, 3, 4, 5],
  demo: { r: 1 },   // сценарии: какую редкость показать и перековать
};
/* вид «наковальни»: размеры — px; моменты — мс от начала показа; частицы вспышки по редкости итога 2…7 — [сколько, скорость, жизнь мс,
   размер]; золото — с эпической, кольцо — с древней */
const RF_FX = {
  ring: 216, orbit: 82, tile: 38, core: 64,
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
/* рамка редкости вокруг арта предмета: без арта — прежний значок экрана */
const rfFrame = (r, inner, cls = '') => `<span class="rf-t${cls ? ' ' + cls : ''}" data-r="${r}">${inner}</span>`;
/* что уйдёт в талисманах: сначала повторы, затем самые частые по весу; [номер, штук] — не больше need */
function rfTalTake(r) {
  const need = TL.rules.reforge.need, list = TB.list().filter(x => tlR(x.no) === r).sort((a, b) => b.q - a.q || tlFam(b.no).w[r - 1] - tlFam(a.no).w[r - 1] || a.no - b.no);
  const out = []; let left = need;
  for (const x of list) { if (!left) break; const n = Math.min(x.q, left); out.push([x.no, n]); left -= n; }
  return out;
}
/* десять на перековку талисманов; null — не набирается. Имя прежнее: его зовут автопроверки талисманов */
function tlForgePick(r) { const out = rfTalTake(r); return out.reduce((a, x) => a + x[1], 0) >= TL.rules.reforge.need ? out : null; }
/* снаряжение: свободные этой редкости, сначала самые слабые — ранний цикл, меньшая главная строка */
const rfEqWeak = (a, b) => a.cyc - b.cyc || a.lines[0][1] - b.lines[0][1] || a.n - b.n;
const rfEqTake = r => eqFree().filter(it => it.r === r).sort(rfEqWeak).slice(0, EQD.rules.reforge.need);
function eqForgePick(r) { const L = rfEqTake(r); return L.length >= EQD.rules.reforge.need ? L : null; }
/* рабочие: свободные — не в идущем ритуале; все одной редкости одинаковы, берутся по порядку артели */
const rfWorkFree = r => { const busy = rtBusyW(); return S.rituals.artel.filter(w => w.r === r && !busy.has(w.id)); };

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
/* рабочий — кристалл своей редкости */
const rfWorkTile = (r, big) => rfFrame(r, ICON('r' + r, big ? 40 : 24, RAR[r]), (big ? 'lg ' : '') + 'cr');

/* ================== режимы ==================
   ok — данные есть; open — открыт на этом цикле; need — сколько одной редкости; have(r) — сколько свободных; list(r) — что уйдёт
   (для орбиты); price(r) — цена в золоте сейчас; tile(x) — плитка орбиты; big(res) — итог в центре; gone(res) — что ушло, для анимации;
   what(r) — что выйдет, одной строкой; got(res) — имя, строка и переход итога; forge(op, r) — «сервер»: проверка, расход, итог */
const RF_MODES = {
  tal: {
    title: 'Перековка талисманов', noun: 'талисман',
    ok: () => typeof TL !== 'undefined' && !!TL && typeof TB !== 'undefined',
    open: () => tlOpen(),
    lock: () => TL_WHY.lock(),
    need: () => TL.rules.reforge.need,
    have: r => TB.list().filter(x => tlR(x.no) === r).reduce((a, x) => a + x.q, 0),
    list: r => rfTalTake(r).flatMap(([no, n]) => Array.from({ length: n }, () => no)),
    price: r => TL.rules.reforge.gold[r - 1] * (RF_DATA.talCyc[rfCyc()] || 0),
    tile: no => rfTalTile(no),
    big: res => rfTalTile(res.got, true),
    gone: res => res.took.flatMap(([no, n]) => Array.from({ length: n }, () => no)),
    what: () => 'Какой талисман выйдет — решает случай, как в сундуке.',
    got: res => ({ name: tlName(res.got), sub: tlFx(res.got), go: `<button class="link" data-a="sheet" data-v="zptalwho:${res.got}">${ic('users')}К герою</button>` }),
    forge(op, r) {
      if (!tlOpen()) return { refuse: 'lock' };
      if (r >= 7) return { refuse: 'top' };
      const took = tlForgePick(r);
      if (!took) return { refuse: 'few' };
      const gold = RF_MODES.tal.price(r);
      if (!gold) return { refuse: 'lock' };
      if (S.wallet.gold < gold) return { refuse: 'gold' };
      const pool = tlPool(r + 1), W = pool.reduce((a, x) => a + x[1], 0);
      if (!W) return { refuse: 'top' };
      let k = EnLoot.makeRng(EnLoot.seedOf('перековка|' + op))(W), got = pool[0][0];
      for (const [no, w] of pool) { if (k < w) { got = no; break; } k -= w; }
      for (const [no, n] of took) TB.take(no, n);
      S.wallet.gold -= gold; TB.add(got);
      return { ok: 'forge', mode: 'tal', r, took, got, gold };
    },
  },
  eq: {
    title: 'Перековка снаряжения', noun: 'предмет',
    ok: () => typeof EQD !== 'undefined' && !!EQD && !!S.eq,
    open: () => eqOpen(),
    lock: () => EQ_WHY.lock(),
    need: () => EQD.rules.reforge.need,
    have: r => eqFree().filter(it => it.r === r).length,
    list: r => rfEqTake(r),
    /* цикл итога — самый ранний из десяти; пока их меньше — самый ранний из тех, что есть */
    cyc: r => { const L = rfEqTake(r); return L.length ? Math.min(...L.map(it => it.cyc)) : rfCyc(); },
    price: r => EQD.rules.reforge.gold[r - 1] * RF_MODES.eq.cyc(r),
    tile: it => rfEqTile(it.slot, it.r),
    big: res => { const it = eqItem(res.got); return it ? rfEqTile(it.slot, it.r, true) : rfFrame(res.r + 1, eqGlyph('main'), 'lg glyph'); },
    gone: res => (res.slots || []).map(slot => ({ slot, r: res.r })),
    what: r => `Слот выпадет случайно, цикл — самый ранний из десяти: ${ROMAN[RF_MODES.eq.cyc(r)] || ''}.`,
    got: res => { const it = eqItem(res.got); return it ? { name: `${eqSlotName(it.slot)} · цикл ${ROMAN[it.cyc]}`, sub: eqMainTxt(it), go: `<button class="link" data-a="sheet" data-v="eqitem:${it.uid}">${ic('info')}Свойства</button>` } : { name: 'Снаряжение', sub: '', go: '' }; },
    forge(op, r) {
      if (!eqOpen()) return { refuse: 'lock' };
      if (r >= 7) return { refuse: 'top' };
      const took = eqForgePick(r);
      if (!took) return { refuse: 'few' };
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
    title: 'Перековка рабочих', noun: 'рабочий',
    ok: () => typeof RT !== 'undefined' && !!RT && !!RT.rules.forge && !!S.rituals,
    open: () => rtOpen(),
    lock: () => RT_WHY.closed(),
    need: () => RT.rules.forge.need,
    have: r => rfWorkFree(r).length,
    list: r => rfWorkFree(r).slice(0, RT.rules.forge.need).map(w => w.r),
    price: r => RT.rules.forge.gold[r - 1] * (RT.rules.forge.cyc[rfCyc()] || 0),
    tile: r => rfWorkTile(r),
    big: res => rfWorkTile(res.r + 1, true),
    gone: res => res.took.map(() => res.r),
    what: r => `Рабочий ${RF_TEXT.one[r + 1]} ускоряет ритуал на ${RT.rules.speed.perRBp * (r + 1) / 100} % за участника.`,
    got: res => ({ name: `Рабочий · ${RF_TEXT.one[res.r + 1]}`, sub: `−${RT.rules.speed.perRBp * (res.r + 1) / 100} % времени ритуала за участника`, go: `<button class="link" data-a="zpartel">${ic('users')}Артель</button>` }),
    forge(op, r) {
      if (!rtOpen()) return { refuse: 'lock' };
      if (r >= 7) return { refuse: 'top' };
      const F = RT.rules.forge, took = rfWorkFree(r).slice(0, F.need);
      if (took.length < F.need) return { refuse: 'few' };
      const gold = RF_MODES.work.price(r);
      if (!gold) return { refuse: 'lock' };
      if (S.wallet.gold < gold) return { refuse: 'gold' };
      const R = S.rituals, ids = took.map(w => w.id), id = 'wf-' + op;
      R.artel = R.artel.filter(w => !ids.includes(w.id));
      R.artel.push({ id, r: r + 1 });
      S.wallet.gold -= gold;
      return { ok: 'forge', mode: 'work', r, took: ids, got: id, gold };
    },
  },
};
const RF_WHY = {
  none: () => 'Перековать нечего.',
  lock: m => RF_MODES[m].lock(),
  few: m => `Нужно ${RF_MODES[m].need()} свободных одной редкости.`,
  gold: () => 'Не хватает золота.',
  top: () => 'Вневременные не перековываются: выше редкости нет.',
};
const rfOk = m => { const M = RF_MODES[m]; try { return !!M && M.ok(); } catch (_) { return false; } };
const rfCan = m => rfOk(m) && RF_MODES[m].open() && [1, 2, 3, 4, 5, 6].some(r => RF_MODES[m].have(r) >= RF_MODES[m].need());
/* выбранная редкость режима: выбор игрока или первая, где хватает, иначе первая, где что-то есть */
function rfSel(m) {
  const M = RF_MODES[m], v = S.rf.sel[m];
  if (v >= 1 && v <= 6) return v;
  const R = [1, 2, 3, 4, 5, 6];
  return R.find(r => M.have(r) >= M.need()) || R.find(r => M.have(r) > 0) || 1;
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
  forge(mode, op, r) {
    if (!rfOk(mode)) return { refuse: 'none' };
    return RF_SRV.run(String(op), () => RF_MODES[mode].forge(String(op), +r));
  },
};
/* прежние входы: перековку талисманов и снаряжения зовут по старым именам — «сервер» один */
if (typeof TL_SRV !== 'undefined') TL_SRV.forge = (op, r) => RF_SRV.forge('tal', op, r);
if (typeof EQ_SRV !== 'undefined') EQ_SRV.forge = (op, r) => RF_SRV.forge('eq', op, r);

/* ================== вид ================== */
/* орбита наковальни: n мест по кругу от верха, по часовой — целые px от центра */
function rfOrbit(n) {
  const out = [], R = RF_FX.orbit;
  for (let i = 0; i < n; i++) { const a = (-90 + Math.round(i * 360 / n)) * Math.PI / 180; out.push([Math.round(Math.cos(a) * R), Math.round(Math.sin(a) * R)]); }
  return out;
}
/* лестница редкостей: сколько свободных и сколько нужно; хватает — светится, выбранная — подсвечена */
function rfStepHtml(m, r, sel, act = 'rfsel') {
  const M = RF_MODES[m], n = M.have(r), need = M.need();
  return `<button class="rf-step${n >= need ? ' ok' : ''}" data-r="${r}" data-a="${act}" data-v="${m}:${r}" aria-pressed="${sel === r}" title="${RAR[r]} → ${RAR[r + 1].toLowerCase()}: ${n} из ${need}">
    <span class="rf-cr" data-r="${r}">${ICON('r' + r, 18, RAR[r])}</span>${ic('arrow')}<span class="rf-cr" data-r="${r + 1}">${ICON('r' + (r + 1), 18, RAR[r + 1])}</span>
    <span class="rf-sn">${RAR[r]}</span><b class="num rf-sq">${fmt(n)}<small>/${need}</small></b></button>`;
}
function rfLadder(m) {
  const sel = rfSel(m);
  return `<div class="pnl rf-lad" role="group" aria-label="Какую редкость перековать">${[1, 2, 3, 4, 5, 6].map(r => rfStepHtml(m, r, sel)).join('')}</div>`;
}
/* круг наковальни. fx — идущий показ: на орбите то, что ушло, стягивается в центр; вспышка; итог поднимается. e — мс от начала показа */
function rfRingHtml(m, r, list, fx, show, e) {
  const G = RF_FX, M = RF_MODES[m], c = G.ring / 2, h = G.tile / 2, d = t => `${Math.round(t - e)}ms`;
  const src = fx ? fx.gone : list, pos = rfOrbit(M.need());
  const tiles = pos.map(([x, y], i) => {
    const at = `left:${c + x - h}px;top:${c + y - h}px`, it = src[i];
    if (it == null) return `<span class="rf-it none" style="${at}"></span>`;
    return fx ? `<span class="rf-it rf-fly" style="${at};--tx:${-x}px;--ty:${-y}px;--dt:${d(i * G.step)};--tt:${G.fly}ms">${M.tile(it)}</span>`
      : `<span class="rf-it" style="${at}">${M.tile(it)}</span>`;
  }).join('');
  const R1 = r + 1;
  const core = fx
    ? `<span class="rf-core rf-go" data-r="${R1}" style="--dt:${d(G.flash)};--tt:${G.flashDur}ms"><b>?</b></span><i class="rf-fl" data-r="${R1}" style="--dt:${d(G.flash)};--tt:${G.flashDur}ms"></i><span class="rf-res rf-up" data-r="${R1}" style="--dt:${d(G.rise)};--tt:${G.riseDur}ms">${M.big(fx.res)}</span>`
    : show ? `<span class="rf-res" data-r="${R1}">${M.big(show)}</span>` : `<span class="rf-core" data-r="${R1}"><b>?</b></span>`;
  const tap = fx ? '<button class="rf-tap" data-a="rfskip" aria-label="Сразу к итогу" tabindex="-1"></button>' : '';
  return `<div class="rf-ring${fx ? ' rf-anim' : ''}" data-r="${R1}"${fx ? ` data-rfrun="${fx.id}"` : ''} style="width:${G.ring}px;height:${G.ring}px"><i class="rf-disc"></i>${tiles}${core}${tap}</div>`;
}
/* наковальня: круг слева, справа — что выйдет, итог прошлой перековки, цена и одно действие */
function rfAnvil(m) {
  const M = RF_MODES[m], r = rfSel(m), need = M.need(), have = M.have(r), price = M.price(r), list = M.list(r);
  const F = S.rf.fx, fx = F && F.mode === m && F.r === r ? F : null;
  const show = !fx && S.rf.show && S.rf.show.mode === m && S.rf.show.r === r ? S.rf.show.res : null;
  const op = `rf${S.rf.seq}`, rich = S.wallet.gold >= price, can = have >= need && rich && price > 0;
  const why = have < need ? `Нужно ещё ${need - have}` : !rich ? 'Не хватает золота' : '';
  /* рабочие: после перековки артели может не хватить на полную бригаду долгого ритуала — предупредить, но не запрещать */
  const crew = m === 'work' ? RT.rules.unique.crew : 0, left = m === 'work' ? S.rituals.artel.length - need + 1 : 0;
  const warn = m === 'work' && have >= need && left < crew ? `<p class="reason warn rf-warn">В артели останется ${left}: долгим ритуалам нужна бригада до ${crew}.</p>` : '';
  const g = show ? M.got(show) : null;
  const got = g ? `<div class="rf-got" data-r="${r + 1}"><span class="eyebrow">Вышло</span><b class="serif">${trEsc(g.name)}</b>${g.sub ? `<small>${g.sub}</small>` : ''}${g.go || ''}</div>` : '';
  const side = `<div class="rf-side"><span class="eyebrow">${M.title}</span>
      <h3 class="serif rf-h">${need} ${RF_TEXT.many[r]} → ${RF_TEXT.one[r + 1]} ${M.noun}</h3>
      <p class="rf-p">${M.what(r)}</p>${got}${warn}
      <div class="rf-foot">${why ? `<span class="rf-why">${why}</span>` : ''}<button class="btn go rf-btn" data-a="rfforge" data-v="${op}:${m}:${r}"${can ? '' : ' disabled'}>Перековать${costTag('gold', price)}</button></div>
      ${TM(`Операция ${op}: проверка, расход и итог — одним вызовом RF_SRV, повтор номера ничего не меняет. ${m === 'work' ? 'Итог без случайности: рабочие одной редкости одинаковы.' : 'Итог — генератор на сиде операции.'} Цена — ${m === 'eq' ? `${fmt(EQD.rules.reforge.gold[r - 1])} × цикл итога` : m === 'tal' ? `${fmt(TL.rules.reforge.gold[r - 1])} × ${RF_DATA.talCyc[rfCyc()] || 0} за цикл ${ROMAN[rfCyc()]}` : `${fmt(RT.rules.forge.gold[r - 1])} × ${RT.rules.forge.cyc[rfCyc()] || 0} за цикл ${ROMAN[rfCyc()]}`}.`, 'p', 'reason')}</div>`;
  const e = fx ? Math.max(0, rfNow() - fx.t0) : 0;
  return `<div class="pnl rf-anv" data-r="${r + 1}">${rfRingHtml(m, r, list, fx, show, e)}${side}</div>`;
}
function rfView() {
  const m = rfMode(), M = RF_MODES[m];
  const tabs = RF_DATA.modes.map(([k, l]) => `<button role="tab" aria-selected="${m === k}" data-a="seg" data-v="rf:${k}">${l}${rfCan(k) ? '<span class="dot" title="Можно перековать"></span>' : ''}</button>`).join('');
  const lock = t => `<div class="pnl rf-lock"><span class="rf-lk">${ic('lock')}</span><p>${t}</p></div>`;
  const body = !rfOk(m) ? lock('Перековать пока нечего.') : !M.open() ? lock(M.lock()) : `<div class="rf-main">${rfLadder(m)}${rfAnvil(m)}</div>`;
  return `<section class="scr rf"><div class="row rf-bar"><div class="tabs" role="tablist" aria-label="Что перековать">${tabs}</div></div>${body}</section>`;
}

/* ================== показ итога ================== */
let rfFxSeq = 0, RF_FXI = null;
function rfFxStart(m, r, res) {
  if (rfReduced()) { S.rf.fx = null; render(); return; }
  const fx = { id: ++rfFxSeq, mode: m, r, res, gone: RF_MODES[m].gone(res), t0: rfNow() };
  S.rf.fx = fx; render();
  setTimeout(() => { if (S.rf.fx === fx) rfBurst(fx); }, RF_FX.flash);
  setTimeout(() => { if (S.rf.fx === fx) { S.rf.fx = null; render(); } }, RF_FX.end);
}
/* частицы вспышки — слой рядом с #game: перерисовка экрана его не сносит */
function rfBurst(fx) {
  if (!window.EnFx) return;
  const g = document.getElementById('game'), p = g && g.parentElement; if (!p || !p.querySelector) return;
  let L = p.querySelector(':scope > .rf-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'rf-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  if (!RF_FXI || RF_FXI.host !== L) { if (RF_FXI) RF_FXI.destroy(); RF_FXI = EnFx.create(L); }
  const el = g.querySelector(`[data-rfrun="${fx.id}"] .rf-go`); if (!el) return;
  const R1 = fx.r + 1, P = RF_FX.burst[R1], b = RF_FXI.center(el), col = rfColor(R1);
  if (P) RF_FXI.burst(b.x, b.y, col, ...P);
  if (P && R1 >= RF_FX.gold) RF_FXI.burst(b.x, b.y, EnFx.COL.gold, ...P);
  if (R1 >= RF_FX.ringFrom) RF_FXI.ring(b.x, b.y, col, RF_FX.ring / 2, RF_FX.ringMs, 2);
}

/* ================== действия ================== */
Object.assign(ACT, {
  rfsel(v) { const [m, r] = String(v).split(':'); if (!RF_MODES[m]) return; S.rf.sel[m] = Math.min(6, Math.max(1, +r || 1)); S.rf.show = null; render(); },
  /* «Перековать»: v — «операция:режим:редкость». Итог выдан до показа, повтор номера ничего не меняет */
  rfforge(v) {
    const [op, m, r] = String(v).split(':'), res = RF_SRV.forge(m, op, +r);
    if (res.again) return;
    if (res.refuse) { toast(RF_WHY[res.refuse](m)); return; }
    S.rf.last[m] = res; S.rf.show = { mode: m, r: +r, res }; S.rf.sel[m] = +r;
    rfFxStart(m, +r, res);
  },
  /* нажатие на круг посреди показа — сразу итог */
  rfskip() { if (S.rf.fx) { S.rf.fx = null; render(); } },
  /* в окно перековки из других экранов: «режим» или «режим:редкость» */
  rfgo(v) {
    const [m, r] = String(v).split(':');
    S.overlay = null; S.route = 'craft'; S.seg.craft = 'reforge';
    if (RF_MODES[m]) { S.seg.rf = m; if (+r >= 1 && +r <= 6) S.rf.sel[m] = +r; }
    S.rf.show = null; render();
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
  const m = 'tal', ok = rfOk(m) && rfOk('eq') && rfOk('work');
  if (!ok) return '';
  const noop = h => h.replace(/data-a="[^"]*"/g, 'data-a="noop"');
  const steps = [1, 2, 3].map(r => noop(rfStepHtml(m, r, 1))).join('');
  const list = RF_MODES.tal.list(1);
  const fake = { id: 'kit', mode: m, r: 1, res: { r: 1, got: list[0], took: [] }, gone: list };
  const idle = rfRingHtml(m, 1, list, null, null, 0);
  const frames = [[RF_FX.step * 3, 'стягиваются в центр'], [RF_FX.flash + 120, 'вспышка цвета новой редкости'], [RF_FX.end, 'итог поднимается']]
    .map(([at, t], i) => `<figure class="rf-still"><div class="rf-frame">${noop(rfRingHtml(m, 1, list, Object.assign({}, fake, { id: 'kit' + i }), null, at))}</div><figcaption><b>${i + 1}</b> — ${t}</figcaption></figure>`).join('');
  const work = rfRingHtml('work', 1, [1, 1, 1], null, null, 0);
  const price = (mm, r, c) => mm === 'tal' ? TL.rules.reforge.gold[r - 1] * (RF_DATA.talCyc[c] || 0) : mm === 'work' ? RT.rules.forge.gold[r - 1] * (RT.rules.forge.cyc[c] || 0) : EQD.rules.reforge.gold[r - 1] * c;
  const cyc = [2, 3, 4, 5, 6];
  const tab = `<table class="p-table rf-kt"><thead><tr><th>Вход</th>${RF_DATA.modes.map(([k, l]) => `<th>${l} · ${RF_MODES[k].need()} → 1</th>`).join('')}</tr></thead><tbody>${[1, 2, 3, 4, 5, 6].map(r => `<tr><td>${ICON('r' + r, 14, RAR[r])}${RAR[r]}</td>${RF_DATA.modes.map(([k]) => `<td class="n">${cyc.map(c => fmt(price(k, r, c))).join(' / ')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const F = RT.forge || {}, sim = `<table class="p-table rf-kt"><thead><tr><th>Цикл</th><th>Артель обычного: без → с</th><th>Лучшая пятёрка</th><th>Артель увлечённого: без → с</th></tr></thead><tbody>${Object.keys(F).map(c => { const o = F[c].o, e = F[c].e; return `<tr><td>${ROMAN[c]}</td><td class="n">${Math.round(o.artel[0] / 100)} → ${Math.round(o.artel[1] / 100)}</td><td class="n">−${o.t5[0] / 100} % → −${o.t5[1] / 100} %</td><td class="n">${Math.round(e.artel[0] / 100)} → ${Math.round(e.artel[1] / 100)}</td></tr>`; }).join('')}</tbody></table>`;
  return `<section class="k-box rf-kit" style="grid-column:1/-1" id="kitReforge"><h3>Перековка</h3>
    <p class="k-note">Своё окно в «Ремесле», рядом с Лавкой и Рынком: талисманы, снаряжение, рабочие. Несколько одной редкости сплавляются в один редкостью выше — итог всегда выше. Слева лестница: сколько есть и сколько нужно. Справа наковальня: что уйдёт, что выйдет, цена в золоте и одно действие.${TM(' §22, слова автора 29.09.2026. Экран — screens/reforge.js, «сервер» — RF_SRV; правила — EN_TALISMANS.rules.reforge, EN_EQUIPMENT.rules.reforge, EN_RITUALS.rules.forge; цена талисманов по циклу — RF_DATA.talCyc.')}</p>
    <div class="rf-kg">
      <div class="k-air-r"><b>Лестница редкостей</b><div class="rf-kl">${steps}</div><small>Хватает — число светится; выбранная ступень — подсвечена.</small></div>
      <div class="k-air-r"><b>Наковальня · талисманы</b><div class="rf-kr">${noop(idle)}</div><small>Десять на орбите, в центре — редкость итога. Какой выйдет — случай.</small></div>
      <div class="k-air-r"><b>Рабочие · три → один</b><div class="rf-kr">${noop(work)}</div><small>Рабочий — кристалл редкости. Итог без случайности.</small></div>
    </div>
    <p class="k-note">Показ итога — около ${Math.floor(RF_FX.end / 1000)},${Math.floor(RF_FX.end % 1000 / 100)} с: предметы стягиваются в центр, вспышка цвета новой редкости, итог поднимается. Итог выдан до анимации; нажатие на круг — сразу итог.</p>
    <div class="rf-board">${frames}</div>
    ${TM(`<div class="rf-kg"><div class="k-air-r"><b>Цена в золоте · циклы II / III / IV / V / VI</b>${tab}<small>Талисманы и рабочие — база × цикл аккаунта; снаряжение — × цикл итога.</small></div><div class="k-air-r"><b>Рабочие · прогон калькулятора</b>${sim}<small>Избыток не копится: артель держится у двух бригад, лучшая пятёрка идёт к капу.</small></div></div>`, 'div')}
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
FLOWS.push(
  ['Перековка · талисманы', 'Своё окно в «Ремесле»: лестница редкостей, десять на наковальне, цена в золоте по циклу и одно действие',
    () => { S.route = 'craft'; S.seg.craft = 'reforge'; S.seg.rf = 'tal'; S.rf.sel.tal = RF_DATA.demo.r; S.rf.show = null; S.overlay = null; }],
  ['Перековка · итог', 'Десять обычных талисманов — в один редкий: итог выдан до анимации, десять стягиваются в центр, вспышка, итог поднимается',
    () => {
      S.route = 'craft'; S.seg.craft = 'reforge'; S.seg.rf = 'tal'; S.overlay = null;
      const r = RF_DATA.demo.r, res = RF_SRV.forge('tal', `rf${S.rf.seq}`, r);
      if (res.ok) { S.rf.last.tal = res; S.rf.show = { mode: 'tal', r, res }; S.rf.sel.tal = r; rfFxStart('tal', r, res); }
    }],
  ['Перековка · рабочие', 'Лишние рабочие — три одной редкости в одного редкостью выше; из листа «Артель» — кнопка сюда',
    () => { S.route = 'craft'; S.seg.craft = 'reforge'; S.seg.rf = 'work'; S.rf.sel.work = RF_DATA.demo.r; S.rf.show = null; S.overlay = null; }],
);
/* S.rf: srv — итоги операций по номерам; seq — номер следующей; sel — выбранная редкость режима (0 — сама); last — итог последней
   перековки режима; show — итог в центре наковальни, пока игрок не выбрал другую ступень; fx — идущий показ */
function rfState(s) { s.rf = { srv: {}, seq: 1, sel: { tal: 0, eq: 0, work: 0 }, last: { tal: null, eq: null, work: null }, show: null, fx: null }; return s; }
const rfInitBase = initialState;
initialState = function () { return rfState(rfInitBase()); };
rfState(S);
