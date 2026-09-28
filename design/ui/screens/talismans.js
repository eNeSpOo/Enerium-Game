/* screens/talismans.js — «Герои → Сила»: духовные талисманы героя (§26 GDD). Договор — screens/model.js.
   Регистрирует: talRow — ряд из четырёх мест в карточке героя (его зовёт heroDetail в index.html, вкладка «Сила»); OV.tal — лист
   «Духовные талисманы»: места, сумма бонусов, запасы, перековка; действия ACT.tal*; раздел UI-кита через KIT_EXTRA; сценарий презентации. На карте
   экранов окно отмечено готовым полем ready карточки «Герои» (MAP в index.html). Своё состояние — S.tal, заводится как S.bag.
   Данные — EN_TALISMANS (design/ui/talismans.js, собирает tools/content-gen/talismans/build.js): линейки, значения по редкостям,
   привязка к классу, как эффект ложится в ядро боя и в БМ. Черновик — docs/content/талисманы.md.
   Запасы талисманов — там же, куда их кладёт открытие сундука (screens/bag.js): S.zp.extra, ключ «tal:номер:редкость».
   Правила §26 и таблицы автора: четыре места; до древней редкости талисман носит только свой класс, с древней — любой; одна линейка —
   одно место на героя; спасение от смерти — одно на героя; перековка §22: 10 одной редкости → 1 случайный редкостью выше.
   Сервер решает, клиент показывает: надеть, снять и перековать — операции TL_SRV с номером: проверка и итог одним вызовом, повтор того же
   номера ничего не повторяет. Перековка бросает генератор на сиде операции (EnLoot.makeRng); в игре сид и итог присылает сервер.
   Бой: источник героя для боя — герой и его талисманы. EB.heroSrc обёрнут здесь: талисманы, чей эффект есть в ядре прототипа, ложатся
   в набор героя записями библиотеки (EB.addLib) — как пассивки и реакции (ADR-0017); «Бич» — расовая прибавка героя; «Беглое слово» —
   доля способностей набора. Ядро боя не правится. Идущий забег досчитывается с тем набором, с которым начался.
   БМ (§6, слой 2): БМ героя × √(УВС × ЭЗ) талисманов, целыми. h.bm — витрина: при смене талисманов она пересчитывается от своей базы.
   Служебное — только команде: TM, PL, tmT из index.html. Автопроверка — tools/content-gen/screens/check_talismans.js. */
'use strict';

/* ================== данные экрана: демонстрация, не баланс ================== */
const TL_DEMO = {
  /* запасы на старте: [номер талисмана таблицы автора, штук]. Цикл II, первые недели кланов — и несколько редких, чтобы показать правила:
     привязку к классу (лекарь, танк, физ ДД, маг ДД), свободную древнюю, печать, спасение, охоту, добычу и повторы для перековки */
  stock: [[92, 1], [96, 1], [86, 1], [89, 1], [57, 1], [31, 1], [15, 2], [44, 1], [71, 1], [170, 1], [165, 1], [206, 1], [355, 2], [113, 1],
    [183, 1], [169, 1], [376, 3], [386, 2], [163, 1], [326, 1], [341, 1]],
  /* сценарий презентации: кому и что надеть — по местам */
  flow: { hero: 'h1', put: [86, 170, 15, 355] },
};
/* числа вида */
const TL_VIEW = { list: 60 };   // строк в списке запасов не больше: остальное — поиском по вкладкам

/* ================== помощники ================== */
const TL = window.EN_TALISMANS || null;
const TLB = 10000;   // 100 % в базисных пунктах
const tlFl = (a, b) => Math.floor(a / b);
const tlOk = no => !!(TL && TL.items[no]);
const tlFam = no => tlOk(no) ? TL.fams[TL.items[no][0]] : null;
const tlFid = no => tlOk(no) ? TL.items[no][0] : '';
const tlR = no => tlOk(no) ? TL.items[no][1] : 1;
const tlV = no => { const f = tlFam(no); return f ? f.v[tlR(no) - 1] : null; };
const tlHide = f => !!(f && f.team && !KH.team);                          // спойлер: игроку не называется
const tlOpen = () => S.acc.cycle >= TL.rules.openCycle;                   // талисманы — с кланами, со второго цикла
const tlCls = c => TL.rules.clsKey[String(c || '').toLowerCase().split(/\s*[/(]/)[0].replace(/\./g, '').replace(/\s+/g, ' ').trim()] || '';
const tlClsName = k => TL.rules.classes[k] || k;
/* «лекарь», «маг ДД или физ ДД силы», «маг ДД, физ ДД силы или физ ДД ловкости» */
const tlOr = list => list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} или ${list[list.length - 1]}`;
const tlName = no => { const f = tlFam(no); return !f ? 'Духовный талисман' : tlHide(f) ? 'Духовный талисман' : f.n; };
const tlNum = v => String(v);
const tlFx = no => { const f = tlFam(no); if (!f) return ''; if (tlHide(f)) return 'Откроется позже.'; const v = tlV(no); return f.fx.replace('{v}', v == null ? '' : tlNum(v)); };
/* короткое значение под значком места: «+8 %», «3 %», «+1», «✓» */
const tlShort = no => {
  const f = tlFam(no), v = tlV(no); if (!f || tlHide(f)) return '';
  if (v == null) return '✓';
  const m = f.fx.match(/([+−]?)\{v\}(\s?%)?/); return m ? `${m[1]}${v}${m[2] ? ' %' : ''}` : String(v);
};
/* множитель в б. п. — «1,0480» целыми */
const tlX = bp => `${tlFl(bp, TLB)},${String(bp % TLB).padStart(4, '0')}`;
const tlPct = bp => { const s = bp < 0 ? '−' : '+', a = Math.abs(bp), i = tlFl(a, 100), f = tlFl(a % 100, 10); return `${s}${i}${f ? ',' + f : ''} %`; };
function tlIsqrt(n) { if (n < 2) return n; let x = n, y = tlFl(x + 1, 2); while (y < x) { x = y; y = tlFl(x + tlFl(n, x), 2); } return x; }
/* значок эффекта: ICON, валюта, вектор, ресурс */
function tlIco(f, px) {
  const i = f.ico.indexOf(':'), k = i < 0 ? 'icon' : f.ico.slice(0, i), v = i < 0 ? f.ico : f.ico.slice(i + 1);
  if (k === 'icon') return ICON(v, px, '');
  if (k === 'cur') return `<img class="ico" src="${curImg(v)}" width="${px}" height="${px}" alt="" style="object-fit:contain">`;
  if (k === 'res') { const it = BAG.item(v); return it ? trIcon(it) : ic('gem'); }
  return ic(v);
}
/* талисман — огранённый медальон цвета редкости, внутри — значок эффекта. Заглушка до арта */
const tlTile = (no, o = {}) => { const f = tlFam(no); return `<span class="tl-t${o.lg ? ' lg' : ''}" data-r="${tlR(no)}" aria-hidden="true">${!f || tlHide(f) ? ic('lock') : tlIco(f, o.lg ? 24 : 17)}</span>`; };

/* ================== запасы, места и БМ ================== */
const TB = {
  store: () => S.zp && S.zp.extra ? S.zp.extra : S.tal.loose,
  key: no => `tal:${no}:${tlR(no)}`,
  qty: no => TB.store()[TB.key(no)] || 0,
  add(no, n = 1) { const s = TB.store(), k = TB.key(no); s[k] = (s[k] || 0) + n; },
  take(no, n = 1) { const s = TB.store(), k = TB.key(no), q = s[k] || 0; if (q < n) return false; if (q === n) delete s[k]; else s[k] = q - n; return true; },
  list: () => Object.entries(TB.store()).filter(([k, q]) => k.startsWith('tal:') && q > 0).map(([k, q]) => ({ no: +k.split(':')[1], q })).filter(x => tlOk(x.no)),
};
const tlEq = hid => (S.tal.eq[hid] = S.tal.eq[hid] || Array(TL.rules.slots).fill(null));
const tlWorn = hid => tlEq(hid).filter(Boolean);
/* множитель БМ героя от талисманов, б. п.: √(УВС × ЭЗ) — стороны складывают доли значений линеек */
function tlSides(hid) {
  let off = 0, def = 0;
  for (const no of tlWorn(hid)) {
    const f = tlFam(no); if (!f || !f.bm) continue;
    const v = tlV(no) || 0;
    for (const b of Array.isArray(f.bm[0]) ? f.bm : [f.bm]) { const add = b[1] === 'fix' ? b[2] : tlFl(v * 100 * b[1], TLB); if (b[0] === 'off') off += add; else def += add; }
  }
  return { off, def };
}
const tlMul = hid => { const { off, def } = tlSides(hid); return tlIsqrt(Math.max(1, TLB + off) * Math.max(1, TLB + def)); };
/* витрина БМ: база — БМ без талисманов; если БМ поменяли снаружи (уровень, доблесть), база берётся заново из текущей */
function tlBm(h) {
  const B = S.tal.bm[h.id] || (S.tal.bm[h.id] = { base: h.bm, mul: TLB, shown: h.bm });
  if (B.shown !== h.bm) { B.base = tlFl(h.bm * TLB, B.mul); B.shown = h.bm; }
  const m = tlMul(h.id); B.mul = m; h.bm = tlFl(B.base * m, TLB); B.shown = h.bm;
  return B;
}
/* почему талисман нельзя надеть в это место; '' — можно */
function tlWhy(h, no, slot) {
  const f = tlFam(no); if (!f) return 'none';
  if (!tlOpen()) return 'lock';
  const r = tlR(no), eq = tlEq(h.id);
  if (f.cls && r < TL.rules.freeFrom && !f.cls.includes(tlCls(h.cls))) return 'cls';
  if (eq.some((x, i) => x && i !== slot && tlFid(x) === tlFid(no))) return 'fam';
  if (f.grp && eq.some((x, i) => x && i !== slot && tlFam(x).grp === f.grp)) return 'grp';
  if (f.grp === 'save' && tlKitSave(h)) return 'grp';
  return '';
}
/* своё спасение от смерти в наборе героя — реакция «смертельный удар» библиотеки, открыта она доблестью или ещё нет */
const tlKitSave = h => { const K = h.draft && window.EN_KITS && EN_KITS.heroes[h.draft], L = EB.lib(); return !!K && K.kit.some(x => x.slot === 'react' && L[x.id] && L[x.id].trig === 'lethal'); };
const TL_WHY = {
  none: () => 'Этого талисмана нет в запасах.',
  lock: () => 'Талисманы откроются во втором цикле — вместе с кланами.',
  cls: no => `До древней редкости его носит только ${tlOr(tlFam(no).cls.map(tlClsName))}. С древней — любой герой.`,
  fam: () => 'Такой талисман на герое уже есть: одинаковые не складываются.',
  grp: () => 'Спасение от смерти у героя уже есть: второе не сработает.',
  gold: () => 'Не хватает золота.',
  few: () => `Нужно ${TL.rules.reforge.need} талисманов одной редкости в запасах.`,
  top: () => 'Вневременные не перековываются: выше редкости нет.',
};

/* ================== «сервер» ==================
   Надеть, снять, перековать — одним вызовом: проверка, изменение запасов и мест, итог. Номер операции несут кнопки: повтор того же номера
   возвращает прежний итог и ничего не меняет. Отказ не записывается — следующая попытка идёт с тем же номером. */
const TL_SRV = {
  run(op, f) {
    const O = S.tal.srv;
    if (O[op]) return Object.assign({ again: true }, O[op]);
    const r = f();
    if (!r.refuse) { O[op] = r; S.tal.seq++; }
    return r;
  },
  put(op, hid, slot, no) {
    return TL_SRV.run(op, () => {
      const h = H(hid); if (!h || !(slot >= 0 && slot < TL.rules.slots)) return { refuse: 'none' };
      if (!TB.qty(no)) return { refuse: 'none' };
      const why = tlWhy(h, no, slot); if (why) return { refuse: why, no };
      const eq = tlEq(hid), prev = eq[slot];
      TB.take(no); if (prev) TB.add(prev);
      eq[slot] = no; tlBm(h);
      return { ok: 'put', hid, slot, no, prev };
    });
  },
  out(op, hid, slot) {
    return TL_SRV.run(op, () => {
      const h = H(hid), eq = h ? tlEq(hid) : null, no = eq && eq[slot];
      if (!no) return { refuse: 'none' };
      eq[slot] = null; TB.add(no); tlBm(h);
      return { ok: 'out', hid, slot, no };
    });
  },
  /* перековка §22: 10 талисманов редкости r из запасов → 1 случайный редкостью выше, по весам пула (правило 5 автора).
     Какие десять — сначала повторы; в игре их выбирает игрок */
  forge(op, r) {
    return TL_SRV.run(op, () => {
      if (!tlOpen()) return { refuse: 'lock' };
      if (r >= 7) return { refuse: 'top' };
      const R = TL.rules.reforge, took = tlForgePick(r);
      if (!took) return { refuse: 'few' };
      const gold = R.gold[r - 1];
      if (S.wallet.gold < gold) return { refuse: 'gold' };
      const pool = tlPool(r + 1), W = pool.reduce((a, x) => a + x[1], 0);
      if (!W) return { refuse: 'top' };
      let k = EnLoot.makeRng(EnLoot.seedOf('перековка|' + op))(W), got = pool[0][0];
      for (const [no, w] of pool) { if (k < w) { got = no; break; } k -= w; }
      for (const [no, n] of took) TB.take(no, n);
      S.wallet.gold -= gold; TB.add(got);
      return { ok: 'forge', r, took, got, gold };
    });
  },
};
/* пул редкости: [номер, вес] — спойлерные линейки только с цикла «для команды», как в сундуках */
const tlPool = r => Object.entries(TL.items).filter(([no, [id, x]]) => x === r && (!TL.fams[id].team || S.acc.cycle >= TL.fams[id].team)).map(([no, [id]]) => [+no, TL.fams[id].w[r - 1]]);
/* десять на перековку: сначала повторы, затем самые частые по весу; null — не набирается */
function tlForgePick(r) {
  const need = TL.rules.reforge.need, list = TB.list().filter(x => tlR(x.no) === r).sort((a, b) => b.q - a.q || tlFam(b.no).w[r - 1] - tlFam(a.no).w[r - 1] || a.no - b.no);
  const out = []; let left = need;
  for (const x of list) { if (!left) break; const n = Math.min(x.q, left); out.push([x.no, n]); left -= n; }
  return left ? null : out;
}

/* ================== бой: источник героя с талисманами ==================
   Запись библиотеки для талисмана с эффектом в ядре: значение редкости — в поле vKey, × vMul. Регистрируются один раз при загрузке */
function tlLibOf(no) {
  const f = tlFam(no), L = f && f.lib; if (!L || L.src) return null;
  const data = JSON.parse(JSON.stringify(L.data || {})), v = tlV(no);
  if (L.vKey && v != null) { const p = L.vKey.split('.'); let o = data; for (let i = 0; i < p.length - 1; i++) o = o[p[i]] = o[p[i]] || {}; o[p[p.length - 1]] = v * (L.vMul || 1); }
  return { id: 'tal.' + no, n: f.n, d: tlFx(no), set: 'Талисман', t: L.t, k: L.k, tier: 'one', trig: L.trig, data };
}
function tlSrc(src, h) {
  const eq = S && S.tal && S.tal.eq && S.tal.eq[h.id];
  if (!eq || !eq.some(Boolean)) return src;
  const out = Object.assign({}, src), add = [];
  let avers = null, act = 0;
  for (const no of eq) {
    if (!no) continue;
    const L = tlFam(no).lib, v = tlV(no); if (!L) continue;
    if (L.src === 'avers') { const bp = v * (L.vMul || 1); if (!src.avers && (!avers || avers.bp < bp)) avers = { race: L.race, bp }; continue; }   // одна раса на героя: сильнейший «Бич»
    if (L.src === 'actPct') { act += v; continue; }
    add.push({ id: 'tal.' + no, slot: L.t === 'react' ? 'react' : 'pas' });
  }
  if (avers) out.avers = avers;
  if (src.kit && (add.length || act)) out.kit = Object.assign({}, src.kit, { kit: src.kit.kit.concat(add), actPct: act ? tlFl(src.kit.actPct * (100 + act), 100) : src.kit.actPct });
  return out;
}
if (TL && window.EnBattle) {
  EB.addLib(Object.keys(TL.items).map(tlLibOf).filter(Boolean));
  const tlSrc0 = EB.heroSrc;
  EB.heroSrc = h => tlSrc(tlSrc0(h), h);
}
/* в бою прототипа: работает ли эффект — команде */
const tlCore = f => f.lib ? 'В бою прототипа действует.' : `В бою прототипа пока не действует: нужен примитив ядра «${f.need}» — ${TL.rules.needs[f.need]}.`;

/* ================== вид ================== */
/* место в карточке героя: медальон и короткое значение; пустое — плюс */
function tlSlotBtn(h, i, no, sel) {
  const t = no ? `${tlName(no)} · ${RAR[tlR(no)].toLowerCase()}: ${tlFx(no)}` : `Место ${i + 1}: пусто`;
  return `<button class="tl-slot${no ? ' on' : ''}${sel ? ' sel' : ''}" ${no ? `data-r="${tlR(no)}"` : ''} data-a="sheet" data-v="tal:${h.id}:${i}" aria-label="${trEsc(t)}" title="${trEsc(t)}">${no ? `${tlTile(no)}<b class="num">${tlShort(no)}</b>` : ic('plus')}</button>`;
}
/* ряд из четырёх мест во вкладке «Сила»: зовёт heroDetail в index.html */
function talRow(h) {
  if (!TL || !S.tal) return '';
  if (!tlOpen()) return `<div class="tl-row"><span class="eyebrow">Духовные талисманы</span><p class="reason">${ic('lock')} Откроются во втором цикле — вместе с кланами.</p></div>`;
  tlBm(h);
  const B = S.tal.bm[h.id], d = B.mul - TLB;
  const chip = tlWorn(h.id).length ? `<span class="chip${d > 0 ? ' spirit' : ''}" title="${tmT('Боевая мощь от талисманов', `Боевая мощь от талисманов: база ${fmt(B.base)} × ${tlX(B.mul)}`)}">${ICON('power', 13, 'Боевая мощь')}${tlPct(d)}</span>` : '';
  return `<div class="tl-row"><div class="row"><span class="eyebrow">Духовные талисманы</span><span class="g-spacer"></span>${chip}</div>
    <div class="tl-slots">${tlEq(h.id).map((no, i) => tlSlotBtn(h, i, no)).join('')}</div></div>`;
}
/* строка эффекта со значком — сумма бонусов, карточка талисмана */
const tlFxRow = no => `<div class="tl-fx">${tlTile(no)}<span><b>${tlName(no)}</b><small>${tlFx(no)}</small></span></div>`;
/* строка запасов: медальон, имя и эффект, кристалл редкости и сколько штук; нельзя надеть — приглушена, причина в подсказке */
function tlLi(h, slot, x, cur) {
  const why = tlWhy(h, x.no, slot), f = tlFam(x.no);
  const tip = why ? TL_WHY[why](x.no) : tlFx(x.no);
  return `<button class="tl-li${why ? ' off' : ''}" data-r="${tlR(x.no)}" data-a="talpick" data-v="${x.no}" aria-current="${cur === x.no}" title="${trEsc(tip)}">
    ${tlTile(x.no)}<span class="tx"><b>${tlName(x.no)}</b><small>${tlFx(x.no)}</small></span>
    <span class="rt">${rar(tlR(x.no))}${x.q > 1 ? `<span class="num faint">×${x.q}</span>` : ''}${why === 'cls' ? `<span class="chip" title="${trEsc(TL_WHY.cls(x.no))}">${CLS(tlClsName(f.cls[0]), 12)}</span>` : ''}</span></button>`;
}
/* карточка талисмана: крупно, эффект, привязка, лор в две строки; служебное — команде */
function tlCard(no, h, lead) {
  const f = tlFam(no), r = tlR(no), hide = tlHide(f);
  const bind = !f.cls ? 'Носит любой герой.' : r >= TL.rules.freeFrom ? `Древняя черта приживается у любой души: носит любой герой, а не только ${tlOr(f.cls.map(tlClsName))}.` : `До древней редкости носит только ${tlOr(f.cls.map(tlClsName))}.`;
  const team = hide ? '' : TM(`${tlCore(f)}${f.note ? ' ' + f.note : ''} У автора: «${trEsc(f.old)}»${f.was ? `, имя «${trEsc(f.was)}»` : ''}. Линейка ${tlFid(no)}, № ${no}, вес ${f.w[r - 1]}. ${f.bm ? 'В БМ входит.' : 'В БМ не входит.'} Числа — демонстрация.`, 'p', 'reason');
  return `<div class="tl-card" data-r="${r}">
    <div class="tl-ch">${tlTile(no, { lg: true })}<span class="col" style="gap:4px"><span class="eyebrow">${lead}</span><b class="serif">${tlName(no)}</b><span class="row">${rar(r)}<span class="chip">${TL.rules.cats[f.cat]}</span></span></span></div>
    <p class="tl-eff">${tlFx(no)}</p>
    ${hide ? '' : `<p class="reason">${bind}</p>${foldLore(f.d, 'quote')}`}${team}</div>`;
}
/* сумма бонусов героя: эффекты надетых и боевая мощь */
function tlSum(h) {
  const worn = tlWorn(h.id); if (!worn.length) return '<p class="reason">Места пусты. Нажмите место, затем талисман из запасов.</p>';
  const B = S.tal.bm[h.id] || tlBm(h), { off, def } = tlSides(h.id);
  return `<div class="tl-sum">${worn.map(tlFxRow).join('')}</div>
    <p class="reason">${ICON('power', 14, 'Боевая мощь')} Боевая мощь ${tlPct(B.mul - TLB)} — ${fmt(h.bm)}.${TM(` Формула §6, слой 2: база ${fmt(B.base)} × √(УВС ${tlX(TLB + off)} × ЭЗ ${tlX(TLB + def)}) = ${fmt(h.bm)}. Охота, добыча и печати в БМ не входят.`)}</p>`;
}
/* список запасов на вкладке: «Подходят» — можно надеть в это место; «Все» — с причинами */
function tlListHtml(h, slot, tab) {
  const all = TB.list().sort((a, b) => tlR(b.no) - tlR(a.no) || tlName(a.no).localeCompare(tlName(b.no), 'ru') || a.no - b.no);
  const fit = all.filter(x => !tlWhy(h, x.no, slot)), list = (tab === 'all' ? all : fit).slice(0, TL_VIEW.list);
  if (!all.length) return '<p class="reason">Запасы пусты: талисманы приходят в сундуках за кланового босса.</p>';
  if (!list.length) return `<p class="reason">Сюда подходящих нет. На вкладке «Все» — почему.</p>`;
  return `<div class="tl-list">${list.map(x => tlLi(h, slot, x, S.tal.pick)).join('')}</div>`;
}
/* перековка: по редкостям — сколько в запасах и чем заплатить; итог прошлой — сверху */
function tlForgeHtml() {
  const R = TL.rules.reforge, L = S.tal.last, rows = [];
  for (let r = 1; r < 7; r++) {
    const n = TB.list().filter(x => tlR(x.no) === r).reduce((a, x) => a + x.q, 0), can = n >= R.need && S.wallet.gold >= R.gold[r - 1];
    rows.push(`<div class="tl-fr" data-r="${r}"><span class="tl-t" data-r="${r}">${ic('gem')}</span><span class="tx"><b>${RAR[r]} → ${RAR[r + 1].toLowerCase()}</b><small>${fmt(n)} в запасах · нужно ${R.need}</small></span>
      <button class="btn sm${can ? ' go' : ''}" data-a="talforge" data-v="tl${S.tal.seq}:${r}" ${n >= R.need ? '' : 'disabled'}>Перековать${costTag('gold', R.gold[r - 1])}</button></div>`);
  }
  const last = L ? `<div class="tl-got">${tlTile(L.got, { lg: true })}<span class="col" style="gap:4px"><span class="eyebrow">Перековка дала</span><b class="serif">${tlName(L.got)}</b><small class="faint">${tlFx(L.got)}</small></span></div>` : '';
  return `${last}<p class="reason">${R.need} талисманов одной редкости сплавляются в один редкостью выше. Какой выйдет — решает случай.</p><div class="tl-forge">${rows.join('')}</div>
    ${TM('Правило §22: 10 → 1, результат всегда выше. Цена — золото, удваивается с редкостью: сток золота (ADR-0022, п. 4). Какие десять — сначала повторы; в игре их выбирает игрок. Итог — генератор на сиде операции, пул и веса — как у сундуков.', 'p', 'reason')}`;
}
/* ================== лист «Духовные талисманы» ================== */
Object.assign(OV, {
  tal(o) {
    if (!TL) return '';
    const [hid, s] = String(o.arg || '').split(':'), h = H(hid) || H(S.selHero); if (!h) return '';
    const slot = Math.max(0, Math.min(TL.rules.slots - 1, +s || 0)), eq = tlEq(h.id), cur = eq[slot], tab = S.seg.tal || 'fit';
    if (S.tal.pickFor !== `${h.id}:${slot}`) { S.tal.pick = null; S.tal.pickFor = `${h.id}:${slot}`; }
    const pick = S.tal.pick && TB.qty(S.tal.pick) ? S.tal.pick : null;
    tlBm(h);
    const slots = `<div class="tl-slots in">${eq.map((no, i) => tlSlotBtn(h, i, no, i === slot)).join('')}</div>`;
    const top = `<div class="tl-hero"><img src="${h.img}" alt=""><span class="col" style="gap:3px"><b>${h.name}</b><span class="row faint">${CLS(h.cls, 14)}${h.cls}</span></span><span class="g-spacer"></span>${bmHtml(h.bm, 16)}</div>`;
    const busy = busyNote(h.id) ? PL('<p class="reason">Герой в забеге: новый набор — со следующего боя.</p>', '<p class="reason">Герой в забеге: идущий забег досчитывается с тем набором, с которым начался (сервер считает забег при старте, §5.6). Новый набор — со следующего боя.</p>') : '';
    const card = pick ? tlCard(pick, h, 'Выбран') : cur ? tlCard(cur, h, `Место ${slot + 1} · надет`) : '';
    const tabs = [['fit', 'Подходят'], ['all', 'Все'], ['forge', 'Перековка']];
    const body = `${top}${slots}${busy}
      <details class="tl-sumd"${tlWorn(h.id).length ? ' open' : ''}><summary><span class="eyebrow">Сумма бонусов</span></summary>${tlSum(h)}</details>
      ${card}
      <div class="tabs" role="tablist" aria-label="Запасы талисманов">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" data-a="seg" data-v="tal:${k}">${l}</button>`).join('')}</div>
      ${tab === 'forge' ? tlForgeHtml() : tlListHtml(h, slot, tab)}
      ${foldLore(['Духовный талисман хранит черту чужой души: как она била, берегла, выживала. Надетый, он отдаёт эту черту герою.', 'Слабая черта приживается только у родственной души — до древней редкости талисман носит свой класс. Древняя сильнее души носителя и приживается у любого. Больше четырёх чужих черт душа героя не удержит.'], 'reason')}
      ${TM('Места — §26: четыре, до древней — привязка к классу, с древней — свободно. Одна линейка — одно место (правило 1 автора), спасение от смерти — одно на героя. Запасы — S.zp.extra, как у сундуков. Демо-запасы — TL_DEMO.', 'p', 'reason')}`;
    const why = pick ? tlWhy(h, pick, slot) : '';
    const op = `tl${S.tal.seq}`;
    const foot = pick ? `${why ? `<span class="reason warn">${TL_WHY[why](pick)}</span>` : ''}<button class="btn go" data-a="talput" data-v="${op}:${h.id}:${slot}:${pick}" ${why ? 'disabled' : ''}>${cur ? 'Заменить' : 'Надеть'}</button>`
      : cur ? `<button class="btn" data-a="talout" data-v="${op}:${h.id}:${slot}">Снять</button>` : '<span class="reason">Выберите талисман из запасов.</span>';
    return sheet(`Духовные талисманы`, body, foot, true);
  },
});

/* ================== действия ================== */
Object.assign(ACT, {
  talpick(v) { S.tal.pick = +v || null; render(); },
  /* надеть: v — «операция:герой:место:талисман» */
  talput(v) {
    const [op, hid, slot, no] = String(v).split(':'), r = TL_SRV.put(op, hid, +slot, +no);
    if (r.again) return;
    if (r.refuse) { toast(TL_WHY[r.refuse](+no)); return; }
    S.tal.pick = null; toast(`${tlName(r.no)} — на герое`);
  },
  talout(v) {
    const [op, hid, slot] = String(v).split(':'), r = TL_SRV.out(op, hid, +slot);
    if (r.again) return;
    if (r.refuse) { toast(TL_WHY[r.refuse]()); return; }
    toast(`${tlName(r.no)} — в запасах`);
  },
  talforge(v) {
    const [op, r] = String(v).split(':'), res = TL_SRV.forge(op, +r);
    if (res.again) return;
    if (res.refuse) { toast(TL_WHY[res.refuse]()); return; }
    S.tal.last = res; toast(`Перековка: ${tlName(res.got)} · ${RAR[tlR(res.got)].toLowerCase()}`);
  },
});

/* ================== раздел UI-кита ================== */
function tlKitHtml() {
  if (!TL) return '';
  const R = TL.rules, show = id => TL.fams[id], nosOf = id => show(id).no;
  const ladder = nosOf('tears').map((no, i) => no ? `<figure>${tlTile(no, { lg: true })}<figcaption>${RAR[i + 1]}<br><b class="num">${tlShort(no)}</b></figcaption></figure>` : '').join('');
  const demoH = { id: 'kit', name: 'Гарт Нишевой', cls: 'Танк' };
  const demoEq = [nosOf('heart')[1], nosOf('banner')[1], nosOf('frost')[0], null];
  const slotsDemo = `<div class="tl-slots">${demoEq.map((no, i) => `<span class="tl-slot${no ? ' on' : ''}${i === 0 ? ' sel' : ''}" ${no ? `data-r="${tlR(no)}"` : ''}>${no ? `${tlTile(no)}<b class="num">${tlShort(no)}</b>` : ic('plus')}</span>`).join('')}</div>`;
  const cnt = TL.counts, cats = ['fight', 'hunt', 'farm', 'seal'];
  const pool = `<table class="p-table tl-kt"><thead><tr><th>Редкость</th><th>Всего</th>${cats.map(c => `<th>${R.cats[c]}</th>`).join('')}<th class="team-only">В бою прототипа</th></tr></thead><tbody>${[1, 2, 3, 4, 5, 6, 7].map(r => `<tr><td>${rar(r)}</td><td class="n">${cnt[r].n}</td>${cats.map(c => `<td class="n">${cnt[r][c]}</td>`).join('')}<td class="n team-only">${cnt[r].core}</td></tr>`).join('')}</tbody></table>`;
  const sum = a => a.reduce((x, y) => x + y, 0), dec = x => String(Math.round(x * 10 / TL.econ.x) / 10).replace('.', ',');
  const econ = `<table class="p-table tl-kt"><thead><tr><th>Цикл</th><th>Недель</th><th>В неделю</th><th>К концу цикла</th><th>Древних и выше</th></tr></thead><tbody>${TL.econ.rows.map(x => `<tr><td>${ROMAN[x.c]}</td><td class="n">${x.weeks}</td><td class="n">${dec(sum(x.free.week))} / ${dec(sum(x.fan.week))}</td><td class="n">${dec(sum(x.free.cum))} / ${dec(sum(x.fan.cum))}</td><td class="n">${dec(sum(x.free.cum.slice(4)))} / ${dec(sum(x.fan.cum.slice(4)))}</td></tr>`).join('')}</tbody></table>`;
  const famRow = id => { const f = TL.fams[id]; if (f.type === 'collector' || tlHide(f)) return ''; const first = f.no.find(Boolean);
    return `<div class="tl-kf"><span class="tl-kn">${tlTile(first)}<span><b>${f.n}</b><small>${f.fx.replace('{v}', 'N')}</small></span></span><span class="tl-kv">${f.no.map((no, i) => `<i data-r="${i + 1}" class="${no ? '' : 'no'}">${no ? (f.v[i] == null ? '✓' : f.v[i]) : '·'}</i>`).join('')}</span><span class="tl-kc">${f.cls ? f.cls.map(c => CLS(R.classes[c], 14, R.classes[c])).join('') : ''}${TM(f.lib ? '<span class="chip spirit">в бою</span>' : `<span class="chip">${f.need}</span>`)}</span></div>`; };
  const cat = c => `<details class="tl-kd"><summary><b>${R.cats[c]}</b><small class="faint"> · ${Object.values(TL.fams).filter(f => f.cat === c).length} линеек</small></summary>${Object.keys(TL.fams).filter(id => TL.fams[id].cat === c).map(famRow).join('')}${c === 'farm' ? `<p class="k-note">И ещё ${Object.values(TL.fams).filter(f => f.type === 'collector').length} знаков сборщика — по одному на базовый ресурс: «Когда падает базовый ресурс, этот выпадает на 25 % чаще».</p>` : ''}</details>`;
  return `<section class="k-box tl-kit" style="grid-column:1/-1" id="kitTal"><h3>Духовные талисманы</h3>
    <p class="k-note">Четыре места на героя. До древней редкости талисман носит только свой класс, с древней — любой герой. Одна линейка — одно место. ${R.reforge.need} одной редкости перековываются в один редкостью выше. Значок в медальоне — что делает талисман, цвет — редкость.${TM(' §26, таблица автора, черновик docs/content/талисманы.md. Данные — design/ui/talismans.js, сборщик tools/content-gen/talismans/build.js. Экран — screens/talismans.js: ряд мест во вкладке «Сила», лист OV.tal. Медальон — заглушка CSS до арта.')}</p>
    <div class="tl-kg">
      <div class="k-air-r"><b>Редкость — сила одной линейки</b><div class="k-row tl-lad">${ladder}</div><small>«Слёзы Виала»: лечение героя +N %. Чем выше редкость, тем ярче свет изнутри.</small></div>
      <div class="k-air-r"><b>Места в карточке героя</b>${slotsDemo}<small>Надетое — медальон и короткое значение; пустое — плюс; выбранное место — подсвечено. Нажатие открывает лист: места, сумма бонусов, запасы, перековка.</small></div>
      <div class="k-air-r"><b>Строка запасов</b><div class="tl-list">${[nosOf('tears')[4], nosOf('tears')[0], nosOf('dance')[0]].map(no => `<span class="tl-li${no === nosOf('dance')[0] ? ' off' : ''}" data-r="${tlR(no)}">${tlTile(no)}<span class="tx"><b>${tlName(no)}</b><small>${tlFx(no)}</small></span><span class="rt">${rar(tlR(no))}</span></span>`).join('')}</div><small>Нельзя надеть — строка приглушена, причина — в подсказке и под кнопкой.</small></div>
    </div>
    <div class="tl-kg">
      <div class="k-air-r"><b>Пул по редкостям</b>${pool}<small>У каждой редкости свой пул: те же линейки крупнее и свои уникальные — охота за редкостью и за линейкой.</small></div>
      <div class="k-air-r team-only"><b>Сколько приходит · обычный / увлечённый</b>${econ}<small>Сундуки кланового босса, с цикла IV — и крафтовых боссов. Отряд — 20 мест.</small></div>
    </div>
    <div class="tl-kcat">${cats.map(cat).join('')}</div>
    ${TM(`<p class="k-note">В ядре прототипа действуют ${Object.values(cnt).reduce((a, x) => a + x.core, 0)} талисманов из ${Object.values(cnt).reduce((a, x) => a + x.n, 0)}: пассивки и реакции библиотеки, расовая прибавка и доля способностей. Остальным нужны примитивы ядра: ${Object.keys(R.needs).join(', ')} — их делает ядро на C#.</p>`)}
  </section>`;
}
/* перерисовка раздела при смене режима «Игрок / Команда»: спойлерные линейки игроку не рисуются вовсе, а не прячутся */
let tlKitWatch = false;
function tlKitPaint() {
  if (tlKitWatch || typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.documentElement) return;
  tlKitWatch = true;
  let was = !!KH.team;
  new MutationObserver(() => { if (!!KH.team === was) return; was = !!KH.team; const el = document.getElementById('kitTal'); if (el) el.outerHTML = tlKitHtml(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: tlKitHtml, paint: tlKitPaint });
/* карта экранов: окно «Духовные талисманы» готово — поле ready карточки «Герои» в MAP (index.html) */

/* ================== сценарий презентации ================== */
FLOWS.push(
  ['Духовные талисманы', 'Четыре места у героя, привязка к классу до древней, сумма бонусов и боевая мощь, перековка 10 → 1',
    () => {
      S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.seg.hero = 'power';
      const F = TL_DEMO.flow, h = H(F.hero); if (!h || !TL) return;
      S.selHero = h.id;
      F.put.forEach((no, i) => { if (!tlEq(h.id)[i] && TB.qty(no)) TL_SRV.put(`tl${S.tal.seq}`, h.id, i, no); });
      S.seg.tal = 'fit'; S.overlay = { t: 'tal', arg: `${h.id}:0` };
    }],
);

/* ================== состояние ==================
   S.tal: eq — места героев (номер талисмана или null); srv — итоги операций по номерам; seq — номер следующей; pick — выбранный в листе;
   bm — база БМ героя без талисманов; last — итог последней перековки; loose — запасы, если нет S.zp (без screens/bag.js).
   Демо-запасы кладутся туда же, куда сундуки, и не помечаются новыми */
function tlState(s) {
  s.tal = { eq: {}, srv: {}, seq: 1, pick: null, pickFor: '', bm: {}, last: null, loose: {} };
  if (!TL) return s;
  const store = s.zp && s.zp.extra ? s.zp.extra : s.tal.loose;
  for (const [no, n] of TL_DEMO.stock) if (TL.items[no]) {
    const k = `tal:${no}:${TL.items[no][1]}`; store[k] = (store[k] || 0) + n;
    if (s.zp && s.zp.seen) s.zp.seen['x:' + k] = 1;
  }
  return s;
}
const tlInitBase = initialState;
initialState = function () { return tlState(tlInitBase()); };
tlState(S);
