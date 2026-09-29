/* screens/equipment.js — снаряжение героя (GDD §21, §22, §6). Договор — screens/model.js.
   Регистрирует: eqRow(h) — девять мест в карточке героя, рядом с талисманами (его зовёт heroDetail в index.html, вкладка «Снаряжение»);
   eqStatAdd(h) — прибавка к пяти характеристикам (карточка героя и лист «Атрибуты»); OV.eq — открывает одно окно «Снаряжение героя»
   (grWin, screens/hero-dev.js) на месте слота: места героя слева, запасы справа, перетаскивание и нажатие, сравнение со стрелками;
   OV.eqitem — «Свойства и сравнение» (карта экранов: equipment-item);
   OV.eqwho — кому надеть; ACT.eq*; eqView(it) — предмет в окне открытия сундука (screens/chest-open.js). Перековка — своё окно
   «Ремесло → Перековка» (screens/reforge.js): EQ_SRV.forge — вход в его «сервер» RF_SRV;
   EQ_SRV.fromChest — предмет из сундука, его зовёт открытие в screens/bag.js; раздел UI-кита (KIT_EXTRA); сценарии презентации.
   Своё состояние — S.eq, заводится как S.bag. Данные и алгоритм — EN_EQUIPMENT и EnEquip (design/ui/equipment.js, собирает
   tools/content-gen/equipment/build.js). Черновик — docs/content/снаряжение.md. Запасы снаряжения — «Ремесло → Запасы → Снаряжение».
   Сервер решает, клиент показывает. Предмет создаёт EQ_SRV на сиде: сундук — сид сундука и номер записи, перековка и ларец — сид
   операции. Надеть, снять и открыть ларец — операции с номером: проверка и итог одним вызовом, повтор номера ничего не повторяет.
   Бой: источник героя — герой, его талисманы и снаряжение. EB.heroSrc обёрнут здесь, поверх талисманов: характеристики — в st, здоровье —
   множитель hpPct, вторичные свойства — пассивки библиотеки (EB.addLib), по записи на вид с суммой значений. Ядро боя не правится.
   Идущий забег досчитывается с тем набором, с которым начался.
   БМ (§6, слой 2): БМ × √(УВС′/УВС × ЭЗ′/ЭЗ) по карте бойца без снаряжения и с ним; урон крита — в УВС, уклонение — в ЭЗ, остальные
   вторичные — долей значения, как боевые талисманы. Целыми. Это слой общей функции BM (index.html, BM_LAYERS): h.bm не хранится,
   его считает BM.hero от уровня, доблести, талисманов и снаряжения героя.
   Служебное — только команде: TM, PL, tmT из index.html. Автопроверка — tools/content-gen/screens/check_equipment.js. */
'use strict';

/* ================== данные экрана: демонстрация, не баланс ================== */
const EQ_DEMO = {
  /* запасы на старте: [слот, редкость, цикл, штук] — цикл II, первые недели Арены и Лиги (docs/content/снаряжение.md, «Экономика»):
     одиннадцать обычных — на перековку, редкие и уникальные, одно эпическое оружие */
  stock: [['hands', 1, 2, 3], ['head', 1, 2, 2], ['feet', 1, 2, 2], ['chest', 1, 2, 2], ['legs', 1, 2, 1], ['ring', 1, 2, 1],
    ['main', 2, 2, 1], ['off', 2, 2, 1], ['hands', 2, 2, 1], ['amulet', 2, 2, 1], ['legs', 2, 2, 1],
    ['chest', 3, 2, 1], ['ring', 3, 2, 1], ['main', 4, 2, 1]],
  fresh: [13],                        // «новое» на старте — номера строк stock: эпическое оружие
  /* сценарий презентации: кому надеть — по слотам лучшее из запасов; какой слот открыть и какой предмет сравнить */
  flow: { hero: 'h1', slots: ['head', 'chest', 'hands', 'legs', 'feet', 'off', 'ring', 'amulet'], open: 'main', casket: 'chest_eq4' },
};
/* знаки вида: контуры слотов — заглушки, пока нет арта слота (eqIcon, screens/art-icons.js; задание — tools/art-gen/jobs/equipment.json) */
const EQ_VIEW = {
  glyph: {
    head: '<path d="M4.5 16v-3.5a7.5 7.5 0 0 1 15 0V16z"/><path d="M4.5 16h15M9.5 16v3.5h5V16M12 5v6"/>',
    chest: '<path d="M8 3.5 4.5 6l1.5 5-1 9h14l-1-9 1.5-5L16 3.5l-2 2h-4z"/><path d="M12 5.5V20M8.5 11h7"/>',
    hands: '<path d="M8 21v-4.5L5.5 12V8a1.4 1.4 0 0 1 2.8 0v3V5.5a1.4 1.4 0 0 1 2.8 0V11V4.8a1.4 1.4 0 0 1 2.8 0V11V6.5a1.4 1.4 0 0 1 2.8 0V14l-2 2.5V21z"/>',
    legs: '<path d="M7 3.5h10l-1 7.5-1.2 9.5h-2.3l-.5-8h-.4l-.5 8H8.8L7.8 11z"/><path d="M7.4 7.5h9.2"/>',
    feet: '<path d="M8 3.5h6V13l5 3.3V20H6l.8-6.5z"/><path d="M8 8h6M6.6 17h12.4"/>',
    main: '<path d="M19.5 4.5l-9 9M19.5 4.5H15M19.5 4.5V9M10.5 13.5l-3 3M5.5 14.5l4 4M4 20l2.5-2.5"/>',
    off: '<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/><path d="M12 6.5v11M8 10.5h8"/>',
    ring: '<circle cx="12" cy="14.5" r="5.5"/><path d="M9.6 6.2 12 3.5l2.4 2.7L12 9z"/>',
    amulet: '<path d="M5 3.5c1.4 4.6 4.6 6.8 7 6.8s5.6-2.2 7-6.8"/><path d="M12 10.3l3.4 4.6L12 20.5l-3.4-5.6z"/>',
  },
};

/* ================== помощники ================== */
const EQD = window.EN_EQUIPMENT || null;
const EQB = 10000;   // 100 % в базисных пунктах
const eqFl = (a, b) => Math.floor(a / b);
function eqIsqrt(n) { if (n < 2) return n; let x = n, y = eqFl(x + 1, 2); while (y < x) { x = y; y = eqFl(x + eqFl(n, x), 2); } return x; }
const eqOpen = () => !!EQD && S.acc.cycle >= EQD.rules.openCycle;
const eqSlotName = slot => EQD && EQD.slots[slot] ? EQD.slots[slot].n : 'Снаряжение';
const eqItem = uid => (S.eq && S.eq.items[uid]) || null;
const eqKind = k => EQD.kinds[k] || { n: k, ico: 'ic:gem' };
const eqWornList = hid => { const w = S.eq && S.eq.worn[hid]; return w ? Object.values(w).map(eqItem).filter(Boolean) : []; };
const eqHeroes = () => (typeof hrMine === 'function' ? hrMine() : S.heroes);
const eqOwner = it => (it && it.on ? H(it.on) : null);
/* индекс главной характеристики героя: строка «Урон» оружия идёт в неё (§5.2) */
const eqMainIdx = h => ({ str: 0, int: 1, agi: 2, sta: 3 })[((EB.RULES.cls[h && h.cls] || {}).main) || 'str'];
function eqAddOf(h, list) { const acc = { st: [0, 0, 0, 0, 0], sec: {} }; for (const it of list || eqWornList(h.id)) EnEquip.addOf(EQD, it, eqMainIdx(h), acc); return acc; }
/* прибавка к пяти характеристикам героя — карточка героя и лист «Атрибуты» (index.html) */
const eqStatAdd = h => (EQD && S.eq && h ? eqAddOf(h).st : [0, 0, 0, 0, 0]);
/* строка предмета: значок, имя вида, значение; у «Урона» — главная характеристика героя, если он известен */
function eqIco(k, px, h) {
  if (k === 'dmg') return ICON(h && eqMainIdx(h) === 1 ? 'matk' : 'patk', px, 'Урон');
  const [t, n] = String(eqKind(k).ico).split(':');
  return t === 'icon' ? ICON(n, px, eqKind(k).n) : ic(n);
}
const eqKindName = (k, h) => k === 'dmg' && h ? `Урон · ${STATS[eqMainIdx(h)].toLowerCase()}` : eqKind(k).n;
const eqNum = (k, v) => eqKind(k).unit ? `+${v} %` : `+${v}`;
const eqMainTxt = (it, h) => `${eqKindName(it.lines[0][0], h)} ${eqNum(it.lines[0][0], it.lines[0][1])}`;
const eqPct = bp => { const s = bp < 0 ? '−' : '+', a = Math.abs(bp), i = eqFl(a, 100), f = eqFl(a % 100, 10); return `${s}${i}${f ? ',' + f : ''} %`; };
const eqGlyph = slot => `<svg class="i eq-g" viewBox="0 0 24 24" aria-hidden="true">${EQ_VIEW.glyph[slot] || EQ_VIEW.glyph.main}</svg>`;
/* плитка предмета: значок слота, кромка и свет — редкость (ADR-0027). Заглушка CSS до арта */
/* значок слота: арт (eqIcon, screens/art-icons.js) — предмет нейтральный, редкость рисует рамка; нет арта — контур-заглушка */
const eqPic = (slot, px = 32) => (typeof eqIcon === 'function' ? eqIcon(slot, px, '') : '') || eqGlyph(slot);
const eqTile = (it, o = {}) => `<span class="eq-t${o.lg ? ' lg' : ''}" data-r="${it.r}" aria-hidden="true">${eqPic(it.slot, o.lg ? 48 : 32)}</span>`;
const eqCr = (r, px = 16) => `<span class="zp-cr" data-r="${r}" title="${RAR[r]}">${ICON('r' + r, px, RAR[r])}</span>`;
/* порядок в списках: редкость выше, главная строка больше, цикл новее, раньше пришёл */
const eqSort = (a, b) => b.r - a.r || b.lines[0][1] - a.lines[0][1] || b.cyc - a.cyc || a.n - b.n;

/* ================== запасы ================== */
/* новый предмет в запасах: номер экземпляра — от сида, второй такой же номер получает суффикс */
function eqAdd(s, it, src) {
  let uid = 'q' + (it.seed >>> 0).toString(36);
  while (s.eq.items[uid]) uid += 'x';
  s.eq.items[uid] = Object.assign(it, { uid, on: '', src: src || '', n: ++s.eq.count });
  return s.eq.items[uid];
}
const eqMint = (spec, seed) => Object.assign(EnEquip.mint(EQD, spec, seed >>> 0), { seed: seed >>> 0 });
const eqFree = () => Object.values(S.eq.items).filter(it => !it.on);

/* ================== «сервер» ==================
   Надеть, снять, открыть ларец — одним вызовом: проверка, изменение запасов и мест, итог. Номер операции несут кнопки:
   повтор того же номера возвращает прежний итог и ничего не меняет. Отказ не записывается — следующая попытка идёт с тем же номером.
   Предмет из сундука создаётся внутри операции открытия (zpOpen, screens/bag.js): сид сундука и номер записи в его итоге.
   Перековка — «сервер» окна «Ремесло → Перековка» (RF_SRV, screens/reforge.js); EQ_SRV.forge он ставит своим входом */
const EQ_SRV = {
  run(op, f) {
    const O = S.eq.srv;
    if (O[op]) return Object.assign({ again: true }, O[op]);
    const r = f();
    if (!r.refuse) { O[op] = r; S.eq.seq++; }
    return r;
  },
  fromChest(seed, i, r, cyc, src) {
    if (!EQD) return null;
    return eqAdd(S, eqMint({ r, cyc }, EnEquip.seedOf(['снаряжение', seed >>> 0, i].join('|'))), src);
  },
  put(op, hid, uid) {
    return EQ_SRV.run(op, () => {
      const h = H(hid), it = eqItem(uid);
      if (!h) return { refuse: 'hero' };
      if (!it) return { refuse: 'none' };
      if (!eqOpen()) return { refuse: 'lock' };
      if (it.on === hid) return { refuse: 'same' };
      const from = it.on, w = S.eq.worn[hid] || (S.eq.worn[hid] = {}), prev = w[it.slot] || '';
      if (from && S.eq.worn[from]) delete S.eq.worn[from][it.slot];
      if (prev && S.eq.items[prev]) S.eq.items[prev].on = '';
      w[it.slot] = uid; it.on = hid;   // мощь обоих героев пересчитает BM по новому набору
      return { ok: 'put', hid, uid, slot: it.slot, prev, from };
    });
  },
  out(op, hid, slot) {
    return EQ_SRV.run(op, () => {
      const h = H(hid), w = S.eq.worn[hid], uid = w && w[slot];
      if (!h || !uid) return { refuse: 'none' };
      delete w[slot]; if (S.eq.items[uid]) S.eq.items[uid].on = '';
      return { ok: 'out', hid, uid, slot };
    });
  },
  /* ларец крафта: один предмет своей редкости, слот случайный, цикл — цикл рецепта */
  casket(op, id) {
    return EQ_SRV.run(op, () => {
      const r = EQD.rules.caskets[id], x = BAG.item(id);
      if (!r || !x || !BAG.has(id)) return { refuse: 'none' };
      if (!eqOpen()) return { refuse: 'lock' };
      BAG.take(id);
      const got = eqAdd(S, eqMint({ r, cyc: x.cyc }, EnEquip.seedOf('ларец-снаряжения|' + op)), x.n);
      return { ok: 'casket', id, got: got.uid };
    });
  },
};
const EQ_WHY = {
  hero: () => 'Такого героя нет.',
  none: () => 'Этого предмета нет в запасах.',
  lock: () => 'Снаряжение откроется во втором цикле — вместе с Ареной.',
  same: () => 'Этот предмет уже на герое.',
};

/* ================== бой: источник героя со снаряжением ================== */
/* пассивка библиотеки для вторичного свойства: одна запись на вид и значение, регистрируется при первой нужде */
function eqLib(k, v) {
  const id = `eq.${k}.${v}`, K = eqKind(k);
  if (!EB.lib()[id]) EB.addLib([{ id, n: K.n, d: String(K.fx || K.n).replace('{v}', v), set: 'Снаряжение', t: 'pas', k: 'passive', tier: 'one', trig: null, data: Object.assign({}, K.core, { pct: v }) }]);
  return id;
}
function eqSrc(src, h) {
  if (!EQD || !S || !S.eq || !h) return src;
  const worn = eqWornList(h.id); if (!worn.length) return src;
  const add = eqAddOf(h, worn), out = Object.assign({}, src, { st: src.st.map((v, i) => v + add.st[i]) });
  if (add.sec.hpPct) out.hpPct = (src.hpPct || 100) + add.sec.hpPct;
  const libs = Object.entries(add.sec).filter(([k]) => eqKind(k).core && eqKind(k).core.pas).map(([k, v]) => eqLib(k, v));
  if (src.kit && libs.length) out.kit = Object.assign({}, src.kit, { kit: src.kit.kit.concat(libs.map(id => ({ id, slot: 'pas' }))) });
  return out;
}
let eqPrev = null;
if (EQD && window.EnBattle) { eqPrev = EB.heroSrc; EB.heroSrc = h => eqSrc(eqPrev(h), h); }

/* ================== БМ ==================
   Множитель БМ героя от снаряжения, б. п.: √(УВС′/УВС × ЭЗ′/ЭЗ). Карта бойца — без снаряжения и с его характеристиками и здоровьем;
   урон крита и уклонение — в формулу, остальные вторичные — долей значения. Стороны карты — как BM.unit (index.html) */
function eqUnit(src) { try { return EB.create({ mode: 'rounds', heroes: [src], foes: [], seed: 1 }).u[0][0] || null; } catch (_) { return null; } }
function eqSides(u, addCrit, addEva) {
  const R = EB.RULES, kl = R.K * u.lvl, cap = R.caps.defPct * 100;
  const mit = k => Math.min(cap, eqFl(u.def[k] * 10000, Math.max(1, kl + u.def[k])));
  const m = eqFl(mit('str') + mit('int'), 2), eva = Math.min(R.buffCaps.evaBp, u.eva + addEva * 100);
  return { off: eqFl(u.atk[u.main] * u.as * (1000000 + u.crit * (u.critDmg + addCrit - 100)), 100), def: eqFl(eqFl(u.maxHp * 10000, 10000 - m) * 10000, 10000 - eva) };
}
function eqMulOf(h, list) {
  if (!list.length || !window.EnBattle) return EQB;
  const src = eqPrev ? eqPrev(h) : EB.heroSrc(h), add = eqAddOf(h, list);
  const u0 = eqUnit(src), u1 = eqUnit(Object.assign({}, src, { st: src.st.map((v, i) => v + add.st[i]), hpPct: (src.hpPct || 100) + (add.sec.hpPct || 0) }));
  if (!u0 || !u1) return EQB;
  const a = eqSides(u0, 0, 0), b = eqSides(u1, add.sec.critDmg || 0, add.sec.evade || 0);
  let off = eqFl(b.off * EQB, Math.max(1, a.off)), def = eqFl(b.def * EQB, Math.max(1, a.def));
  for (const [k, v] of Object.entries(add.sec)) { const bm = eqKind(k).bm; if (Array.isArray(bm)) { const x = eqFl(v * 100 * bm[1], EQB); if (bm[0] === 'off') off += x; else def += x; } }
  return eqIsqrt(off * def);
}
/* слой БМ «снаряжение» общей функции BM (index.html), поверх талисманов: отпечаток — надетые предметы, множитель — eqMulOf */
if (EQD && typeof BM_LAYERS !== 'undefined') BM_LAYERS.push({ id: 'eq', key: h => eqWornList(h.id).map(it => it.uid).join(','), mul: h => eqMulOf(h, eqWornList(h.id)) });
/* прибавка БМ героя, если надеть предмет вместо нынешнего в его слоте, б. п.; m0 — множитель нынешнего набора, если уже посчитан */
function eqGain(h, it, m0) {
  const now = eqWornList(h.id), next = now.filter(x => x.slot !== it.slot).concat(it);
  const a = m0 || eqMulOf(h, now), b = eqMulOf(h, next);
  return eqFl((b - a) * EQB, a);
}

/* ================== вид ================== */
/* место в карточке героя: значок слота (арт — eqPic), у надетого — кромка и свет редкости; пустое — бледный
   значок. Нажатие открывает окно «Снаряжение героя» на этом месте */
function eqSlotBtn(h, slot, uid, sel) {
  const it = uid ? eqItem(uid) : null, t = it ? `${eqSlotName(slot)} · ${RAR[it.r].toLowerCase()}: ${eqMainTxt(it, h)}` : `${eqSlotName(slot)}: пусто`;
  return `<button class="eq-slot${it ? ' on' : ''}${sel ? ' sel' : ''}" ${it ? `data-r="${it.r}"` : ''} data-a="sheet" data-v="eq:${h.id}:${slot}" aria-label="${trEsc(t)}" title="${trEsc(t)}">${eqPic(slot, 32)}</button>`;
}
/* девять мест во вкладке «Снаряжение» карточки героя, рядом с талисманами: зовёт heroDetail в index.html */
function eqRow(h) {
  if (!EQD || !S.eq || !h) return '';
  if (!eqOpen()) return `<div class="eq-row"><span class="eyebrow">Снаряжение</span><p class="reason">${ic('lock')} Откроется во втором цикле — вместе с Ареной.</p></div>`;
  const P = BM.parts(h), m = P.mul.eq || EQB, d = m - EQB, w = S.eq.worn[h.id] || {};
  const chip = d ? `<span class="chip spirit" title="${tmT('Боевая мощь от снаряжения', `Боевая мощь от снаряжения: база ${fmt(P.base)} × ${eqFl(m, EQB)},${String(m % EQB).padStart(4, '0')}`)}">${ICON('power', 13, 'Боевая мощь')}${eqPct(d)}</span>` : '';
  return `<div class="eq-row"><div class="row"><span class="eyebrow">Снаряжение</span><span class="g-spacer"></span>${chip}</div>
    <div class="eq-slots">${EQD.rules.slots.map(s => eqSlotBtn(h, s, w[s])).join('')}</div></div>`;
}
/* строки предмета: значок, вид, значение; против другого предмета — разница */
function eqLines(it, h, vs) {
  const other = vs ? Object.fromEntries(vs.lines.map(([k, v]) => [k, v])) : null;
  const rows = it.lines.map(([k, v], i) => {
    const d = other ? v - (other[k] || 0) : 0;
    return `<div class="eq-ln${i ? '' : ' main'}"><span class="k">${eqIco(k, 16, h)}${eqKindName(k, h)}</span><b class="num">${eqNum(k, v)}</b>${other ? `<span class="eq-d${d > 0 ? ' up' : d < 0 ? ' down' : ''}">${d ? (d > 0 ? '+' : '−') + Math.abs(d) : '='}</span>` : ''}</div>`;
  });
  if (other) for (const [k, v] of vs.lines) if (!it.lines.some(x => x[0] === k)) rows.push(`<div class="eq-ln lost"><span class="k">${eqIco(k, 16, h)}${eqKindName(k, h)}</span><b class="num">—</b><span class="eq-d down">−${v}</span></div>`);
  return `<div class="eq-lns">${rows.join('')}</div>`;
}
/* шапка предмета: плитка, слот и цикл, имя с кристаллом, на ком надет */
function eqHead(it, lead) {
  const o = eqOwner(it), old = it.cyc < S.acc.cycle;
  return `<div class="eq-ch">${eqTile(it, { lg: true })}<span class="col" style="gap:4px;min-width:0"><span class="eyebrow">${lead || `Цикл ${ROMAN[it.cyc]}`}</span>
    <span class="row" style="gap:6px"><b class="serif">${eqSlotName(it.slot)}</b>${eqCr(it.r)}</span>
    <span class="row" style="gap:6px">${o ? `<span class="chip">${ic('users')}${trEsc(o.name)}</span>` : '<span class="chip">свободен</span>'}${old ? '<span class="chip warn">прошлый цикл</span>' : ''}</span></span></div>`;
}
/* сумма бонусов героя: характеристики и вторичные свойства всех надетых — окно снаряжения, когда ничего не выбрано */
function eqSum(h) {
  const worn = eqWornList(h.id); if (!worn.length) return '<p class="reason">Места пусты. Нажмите место, затем предмет из запасов.</p>';
  const add = eqAddOf(h, worn), rows = [];
  add.st.forEach((v, i) => { if (v) rows.push(`<span class="eq-s">${ICON(STAT_IC[i], 16, STATS[i])}<b class="num">+${v}</b></span>`); });
  for (const [k, v] of Object.entries(add.sec)) rows.push(`<span class="eq-s" title="${trEsc(eqKind(k).n)}">${eqIco(k, 16, h)}<b class="num">+${v} %</b></span>`);
  return `<div class="eq-sum">${rows.join('')}</div>`;
}

/* ================== листы ================== */
Object.assign(OV, {
  /* «Снаряжение» героя — одно окно со снаряжением и талисманами (grWin, screens/hero-dev.js): места героя слева, запасы справа,
     перетаскивание и нажатие, сравнение со стрелками. Лист открывает его на своём месте; выбранный предмет (S.eq.pick) сохраняется,
     если он выбран для этого места (S.eq.pickFor) */
  eq(o) { return EQD && S.eq && typeof grWin === 'function' ? grWin(o, 'eq') : ''; },
  /* «Свойства и сравнение» (карта экранов: equipment-item): все строки; против предмета выбранного героя в том же слоте */
  eqitem(o) {
    if (!EQD || !S.eq) return '';
    const it = eqItem(String(o.arg || '')); if (!it) return sheet('Свойства и сравнение', '<p class="faint">Этого предмета больше нет в запасах.</p>');
    const heroes = eqHeroes(), who = H(S.eq.who) || eqOwner(it) || H(S.selHero) || heroes[0];
    const cur = who ? eqItem((S.eq.worn[who.id] || {})[it.slot]) : null, vs = cur && cur.uid !== it.uid ? cur : null;
    const chips = heroes.map(x => `<button class="eq-hc${who && x.id === who.id ? ' on' : ''}" data-a="eqwhosel" data-v="${x.id}" aria-pressed="${!!who && x.id === who.id}" title="${trEsc(x.name)}">${typeof hrAv === 'function' ? hrAv(x) : `<img src="${x.img}" alt="">`}</button>`).join('');
    const g = who && it.on !== who.id ? eqGain(who, it) : 0;
    const body = `${eqHead(it)}${eqLines(it, who, vs)}
      <span class="eyebrow">Сравнить на герое</span><div class="eq-hcs">${chips}</div>
      ${who ? `<p class="reason">${vs ? `Против надетого: «${eqSlotName(vs.slot)} · ${RAR[vs.r].toLowerCase()}». ` : it.on === who.id ? 'Надет на этого героя. ' : 'Место свободно. '}${it.on === who.id ? '' : `${ICON('power', 14, 'Боевая мощь')} Боевая мощь ${trEsc(who.name)}: ${eqPct(g)}.`}</p>` : ''}
      ${it.cyc < S.acc.cycle ? '<p class="reason">Предмет прошлого цикла: новые герои и новое снаряжение сильнее.</p>' : ''}
      ${TM(`Шаблон ${it.slot}.${it.r}, цикл ${it.cyc}, откуда: ${trEsc(it.src || '—')}. Строки — диапазоны шаблона × множитель цикла.`, 'p', 'reason')}`;
    const op = `eq${S.eq.seq}`;
    const foot = !who ? '' : it.on === who.id ? `<button class="btn" data-a="eqout" data-v="${op}:${who.id}:${it.slot}">Снять</button>`
      : `<button class="btn go" data-a="eqput" data-v="${op}:${who.id}:${it.uid}">Надеть · ${trEsc(who.name.split(' ')[0])}</button>`;
    return sheet('Свойства и сравнение', body, foot, true);
  },
  /* кому надеть: герои аккаунта, у каждого — нынешний предмет слота и прибавка БМ; нажатие надевает */
  eqwho(o) {
    if (!EQD || !S.eq) return '';
    const it = eqItem(String(o.arg || '')); if (!it) return sheet('Кому надеть', '<p class="faint">Этого предмета больше нет в запасах.</p>');
    const op = `eq${S.eq.seq}`;
    const rows = eqHeroes().map(h => ({ h, g: it.on === h.id ? null : eqGain(h, it) })).sort((a, b) => (b.g == null ? -1e9 : b.g) - (a.g == null ? -1e9 : a.g));
    const list = rows.map(({ h, g }) => {
      const cur = eqItem((S.eq.worn[h.id] || {})[it.slot]), on = g == null, busy = busyNote(h.id);
      return `<button class="eq-who" data-a="eqput" data-v="${op}:${h.id}:${it.uid}" ${on ? 'disabled' : ''} title="${trEsc(h.name + (busy ? ' · ' + busy : ''))}">
        ${typeof hrAv === 'function' ? hrAv(h) : `<img src="${h.img}" alt="">`}<span class="tx"><b>${trEsc(h.name)}</b><small>${CLS(h.cls, 12)}${h.cls}${busy ? ' · в забеге' : ''}</small></span>
        ${cur ? eqTile(cur) : `<span class="eq-t none">${eqGlyph(it.slot)}</span>`}${on ? '<span class="chip">надет</span>' : `<span class="chip${g > 0 ? ' spirit' : ''}">${ICON('power', 12, 'Боевая мощь')}${eqPct(g)}</span>`}</button>`;
    }).join('');
    const body = `${eqHead(it)}<p class="reason">Нажмите героя — предмет наденется. ${it.on ? 'С прежнего героя он снимется.' : ''}</p><div class="eq-whos">${list}</div>`;
    return sheet('Кому надеть', body, `<button class="link" data-a="sheet" data-v="eqitem:${it.uid}">${ic('info')}Свойства и сравнение</button>`, true);
  },
});

/* ================== действия ================== */
Object.assign(ACT, {
  eqpick(v) { S.eq.pick = S.eq.pick === v ? null : v; render(); },
  /* надеть: v — «операция:герой:предмет» */
  eqput(v) {
    const [op, hid, uid] = String(v).split(':'), r = EQ_SRV.put(op, hid, uid);
    if (r.again) return;
    if (r.refuse) { toast(EQ_WHY[r.refuse]()); return; }
    S.eq.pick = null; toast(`${eqSlotName(r.slot)} — на герое ${H(r.hid).name}`);
  },
  eqout(v) {
    const [op, hid, slot] = String(v).split(':'), r = EQ_SRV.out(op, hid, slot);
    if (r.again) return;
    if (r.refuse) { toast(EQ_WHY[r.refuse]()); return; }
    toast(`${eqSlotName(r.slot)} — в запасах`);
  },
  /* ларец крафта: v — «операция:id предмета» */
  eqcasket(v) {
    const [op, id] = String(v).split(':'), res = EQ_SRV.casket(op, id);
    if (res.again) return;
    if (res.refuse) { toast(EQ_WHY[res.refuse]()); return; }
    const it = eqItem(res.got);
    if (typeof zpV === 'function') { zpV().sel.eq = 'q:' + res.got; zpV().seen['q:' + res.got] = 0; }
    toast(`Из ларца: ${eqSlotName(it.slot)} · ${RAR[it.r].toLowerCase()}`);
  },
  eqwhosel(v) { S.eq.who = v; render(); },
  /* к герою: карточка героя, вкладка «Снаряжение», окно снаряжения на месте предмета */
  eqgo(v) {
    const [hid, slot] = String(v).split(':'); if (!H(hid)) return;
    S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.seg.hero = 'gear'; S.selHero = hid;
    S.overlay = { t: 'eq', arg: `${hid}:${slot || ''}` }; render();
  },
});

/* окно открытия сундука (screens/chest-open.js): предмет из сундука — его слот и редкость; без предмета — общий вид */
function eqView(x) {
  const it = x && x.uid ? eqItem(x.uid) : null; if (!it) return null;
  const name = `${eqSlotName(it.slot)} · ${RAR[it.r].toLowerCase()}`;
  return { icon: eqGlyph(it.slot), name, tip: `${name}: ${eqMainTxt(it)}` };
}

/* ================== раздел UI-кита ================== */
function eqKitHtml() {
  if (!EQD) return '';
  const R = EQD.rules, c0 = R.openCycle, h = S.heroes[0];
  const demo = (slot, r, k) => Object.assign(EnEquip.mint(EQD, { slot, r, cyc: c0 }, EnEquip.seedOf(['кит-снаряжения', slot, r, k || 0].join('|'))), { uid: '', on: '' });
  const ex = { head: demo('head', 3), chest: demo('chest', 4), hands: demo('hands', 2), main: demo('main', 5), ring: demo('ring', 6) };
  const slots = `<div class="eq-slots">${R.slots.map((s, i) => { const it = ex[s]; return `<span class="eq-slot${it ? ' on' : ''}${i === 5 ? ' sel' : ''}" ${it ? `data-r="${it.r}"` : ''} title="${eqSlotName(s)}">${eqGlyph(s)}</span>`; }).join('')}</div>`;
  const rg = (slot, r) => { const T = EQD.templates[slot + '.' + r], x = EnEquip.rangeOf(EQD, T.main[0], T.main[1], T.main[2], c0); return x[0] === x[1] ? x[0] : `${x[0]}–${x[1]}`; };
  const ladder = [1, 2, 3, 4, 5, 6, 7].map(r => `<figure><span class="eq-t lg" data-r="${r}">${eqGlyph('main')}</span><figcaption>${RAR[r]}<br><b class="num">${rg('main', r)}</b> · ${r} ${plural(r, 'строка', 'строки', 'строк')}</figcaption></figure>`).join('');
  const card = ex.main ? `<div class="eq-card" data-r="${ex.main.r}">${eqHead(ex.main)}${eqLines(ex.main, h)}</div>` : '';
  const cmp = ex.chest ? `<div class="eq-card" data-r="${ex.chest.r}">${eqHead(ex.chest, 'Сравнить с надетым')}${eqLines(ex.chest, h, demo('chest', 2, 1))}</div>` : '';
  const tpl = `<table class="p-table eq-kt"><thead><tr><th>Слот · главная строка</th>${[1, 2, 3, 4, 5, 6, 7].map(r => `<th>${ICON('r' + r, 14, RAR[r])}</th>`).join('')}</tr></thead><tbody>${R.slots.map(s => `<tr><td>${eqGlyph(s)}${eqSlotName(s)} · ${eqKind(EQD.slots[s].main).n.toLowerCase()}</td>${[1, 2, 3, 4, 5, 6, 7].map(r => `<td class="n">${rg(s, r)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const bm = `<table class="p-table eq-kt"><thead><tr><th>Класс</th>${[1, 2, 3, 4, 5, 6, 7].map(r => `<th>${ICON('r' + r, 14, RAR[r])}</th>`).join('')}</tr></thead><tbody>${EQD.bm.rows.map(x => `<tr><td>${CLS(x.cls, 14)}${x.cls}</td>${x.full.map(v => `<td class="n">${eqPct(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const dec = v => String(Math.round(v * 10 / EQD.econ.x) / 10).replace('.', ',');
  const econ = `<table class="p-table eq-kt"><thead><tr><th>Цикл</th><th>В неделю</th><th>К концу цикла</th><th>Отрядов по ${EQD.econ.squad} мест</th></tr></thead><tbody>${EQD.econ.rows.map(x => `<tr><td>${ROMAN[x.c]}</td><td class="n">${dec(x.free.week.reduce((a, y) => a + y, 0))} / ${dec(x.fan.week.reduce((a, y) => a + y, 0))}</td><td class="n">${dec(x.free.cum.reduce((a, y) => a + y, 0))} / ${dec(x.fan.cum.reduce((a, y) => a + y, 0))}</td><td class="n">${dec(x.free.cum.reduce((a, y) => a + y, 0) / EQD.econ.squad)} / ${dec(x.fan.cum.reduce((a, y) => a + y, 0) / EQD.econ.squad)}</td></tr>`).join('')}</tbody></table>`;
  return `<section class="k-box eq-kit" style="grid-column:1/-1" id="kitEq"><h3>Снаряжение</h3>
    <p class="k-note">Девять слотов героя: пять брони, два оружия, два украшения. Главная строка слота — первая и самая широкая, число строк — ступень редкости. Ограничений по классу нет, предмет — на одном герое за раз. Цвет кромки — редкость.${TM(' §21, §22, черновик docs/content/снаряжение.md. Данные и генерация — design/ui/equipment.js, сборщик tools/content-gen/equipment/build.js. Экран — screens/equipment.js: места во вкладке «Снаряжение», листы OV.eqitem, OV.eqwho; надевают в одном окне с талисманами — OV.eq открывает его (screens/hero-dev.js); перековка — окно screens/reforge.js. В местах и окне — арт слота (screens/art-icons.js), свет — редкость; контур CSS — если арта нет.')}</p>
    <div class="eq-kg">
      <div class="k-air-r"><b>Места в карточке героя</b>${slots}<small>Надетое — значок слота с кромкой редкости, пустое — бледный контур, выбранное — подсвечено. Нажатие открывает лист «Снаряжение».</small></div>
      <div class="k-air-r"><b>Карточка предмета</b>${card}<small>Слот, цикл, редкость, на ком надет; строки — главная первой.</small></div>
      <div class="k-air-r"><b>Сравнение</b>${cmp}<small>Выбранный против надетого: разница по строкам, потерянная строка — красным.</small></div>
    </div>
    <div class="k-air-r"><b>Редкость — сила и число строк · оружие, цикл ${ROMAN[c0]}</b><div class="k-row eq-lad">${ladder}</div><small>Лучшая строка редкости обгоняет худшую следующей на 10–16 %: каждый дроп стоит взгляда.</small></div>
    <div class="eq-kg">
      <div class="k-air-r"><b>Главная строка · 9 × 7 шаблонов, цикл ${ROMAN[c0]}</b>${tpl}<small>Диапазон — центр редкости × множитель цикла × (1 ± ширина).</small></div>
      <div class="k-air-r team-only"><b>Вклад полного комплекта в БМ · эталон цикла I</b>${bm}<small>§6, слой 2. Эпический комплект — около одной доблести.</small></div>
      <div class="k-air-r team-only"><b>Сколько приходит · обычный / увлечённый</b>${econ}<small>Планки Арены и Лиги; места по рейтингу — сверху.</small></div>
    </div>
  </section>`;
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: eqKitHtml });

/* ================== сценарии презентации ================== */
/* надеть демо-герою лучшее из запасов по каждому слоту сценария */
function eqFlowDress() {
  const F = EQ_DEMO.flow, h = H(F.hero); if (!h || !EQD) return null;
  for (const slot of F.slots) {
    if ((S.eq.worn[h.id] || {})[slot]) continue;
    const it = eqFree().filter(x => x.slot === slot).sort(eqSort)[0];
    if (it) EQ_SRV.put(`eq${S.eq.seq}`, h.id, it.uid);
  }
  return h;
}
FLOWS.push(
  ['Снаряжение · герой', 'Девять мест рядом с талисманами, окно снаряжения: выбранный предмет против надетого — стрелки у строк и прибавка боевой мощи',
    () => {
      const h = eqFlowDress(); if (!h) return;
      S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.seg.hero = 'gear'; S.selHero = h.id;
      const slot = EQ_DEMO.flow.open, best = eqFree().filter(x => x.slot === slot).sort(eqSort)[0];
      S.eq.pickFor = `${h.id}:${slot}`; S.eq.pick = best ? best.uid : null;
      S.overlay = { t: 'eq', arg: `${h.id}:${slot}` };
    }],
  ['Снаряжение · сравнение', 'Свойства предмета и сравнение на любом герое: строки с разницей, прибавка боевой мощи, одно действие',
    () => {
      eqFlowDress();
      S.route = 'craft'; S.seg.craft = 'stock'; if (typeof zpV === 'function') zpV().tab = 'eq';
      const it = eqFree().sort(eqSort)[0]; S.eq.who = EQ_DEMO.flow.hero;
      S.overlay = it ? { t: 'eqitem', arg: it.uid } : null;
    }],
  ['Снаряжение · перековка', 'Своё окно «Ремесло → Перековка»: игрок отмечает десять свободных одной редкости, подсказки «Слабые» и «Повторы» помогают; итог — один редкостью выше, слот случайный, цикл — самый ранний из отмеченных',
    () => { S.route = 'craft'; S.seg.craft = 'reforge'; S.seg.rf = 'eq'; S.overlay = null; }],
);

/* ================== состояние ==================
   S.eq: items — предметы по номеру экземпляра: слот, редкость, цикл, строки, on — на ком надет; worn — места героев: герой → слот → номер;
   srv — итоги операций по номерам; seq — номер следующей; count — счётчик пришедших; last — итог последней перековки; pick, pickFor —
   выбранный в листе героя; who — герой сравнения. Мощь героя не хранится — её считает BM. Демо-запасы создаёт тот же генератор на своих сидах */
function eqState(s) {
  s.eq = { items: {}, worn: {}, srv: {}, seq: 1, count: 0, last: null, pick: null, pickFor: '', who: '' };
  if (!EQD || !window.EnEquip) return s;
  EQ_DEMO.stock.forEach(([slot, r, cyc, n], i) => {
    for (let k = 0; k < n; k++) {
      const it = eqAdd(s, eqMint({ slot, r, cyc }, EnEquip.seedOf(['демо-снаряжение', i, k].join('|'))), 'Арена · планка побед');
      if (s.zp && s.zp.seen && !EQ_DEMO.fresh.includes(i)) s.zp.seen['q:' + it.uid] = 1;
    }
  });
  return s;
}
const eqInitBase = initialState;
initialState = function () { return eqState(eqInitBase()); };
eqState(S);
