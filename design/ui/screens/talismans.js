/* screens/talismans.js — «Герои → Снаряжение»: духовные талисманы героя (§26 GDD). Договор — screens/model.js.
   Регистрирует: talRow — ряд из четырёх мест в карточке героя (его зовёт heroDetail в index.html, вкладка «Снаряжение»); OV.tal — открывает
   одно окно «Снаряжение героя» (grWin, screens/hero-dev.js) на месте талисмана: места героя слева, запасы справа, перетаскивание и нажатие;
   действия ACT.tal*; tlMulOf — множитель мощи для любого набора; раздел UI-кита через KIT_EXTRA; сценарий презентации. На карте
   экранов окно отмечено готовым полем ready карточки «Герои» (MAP в index.html). Своё состояние — S.tal, заводится как S.bag.
   Данные — EN_TALISMANS (design/ui/talismans.js, собирает tools/content-gen/talismans/build.js): линейки, значения по редкостям,
   привязка к классу, как эффект ложится в ядро боя и в БМ. Черновик — docs/content/талисманы.md.
   Запасы талисманов — там же, куда их кладёт открытие сундука (screens/bag.js): S.zp.extra, ключ «tal:номер:редкость». Их показывает
   своя вкладка «Запасы → Талисманы» (bag.js): карточки, фильтр «подходит классу», «К герою» — переход сюда, в лист OV.tal с выбранным.
   Правила §26 и таблицы автора: четыре места; до древней редкости талисман носит только свой класс, с древней — любой; одна линейка —
   одно место на героя; спасение от смерти — одно на героя. Перековка §22 — своё окно «Ремесло → Перековка» (screens/reforge.js).
   Сервер решает, клиент показывает: надеть и снять — операции TL_SRV с номером: проверка и итог одним вызовом, повтор того же
   номера ничего не повторяет. TL_SRV.forge — вход в «сервер» перековки RF_SRV (screens/reforge.js).
   Бой: источник героя для боя — герой и его талисманы. EB.heroSrc обёрнут здесь: талисманы, чей эффект есть в ядре прототипа, ложатся
   в набор героя записями библиотеки (EB.addLib) — как пассивки и реакции (ADR-0017); «Бич» — расовая прибавка героя; «Беглое слово» —
   доля способностей набора. Ядро боя не правится. Идущий забег досчитывается с тем набором, с которым начался.
   БМ (§6, слой 2): множитель талисманов √(УВС × ЭЗ), целыми, — слой общей функции BM (index.html, BM_LAYERS). h.bm не хранится:
   его считает BM.hero от уровня, доблести и вещей героя.
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
/* талисман — огранённый медальон цвета редкости; внутри — иконка линейки (talIcon, screens/art-icons.js): вещь-памятка на шнурке
   с лунным камнем, свет камня — вид талисмана. Без иконки — арт семейства, без него — значок эффекта; спойлер — замок */
const tlTile = (no, o = {}) => {
  const f = tlFam(no), art = f && !tlHide(f) && typeof talIcon === 'function' ? talIcon(f.cat, o.lg ? 48 : 32, '', tlFid(no)) : '';
  return `<span class="tl-t${o.lg ? ' lg' : ''}${art ? ' art' : ''}" data-r="${tlR(no)}" aria-hidden="true">${!f || tlHide(f) ? ic('lock') : art || tlIco(f, o.lg ? 24 : 17)}</span>`;
};

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
const tlWornRO = hid => ((S.tal && S.tal.eq[hid]) || []).filter(Boolean);   // без записи в S.tal: мощь спрашивают и у соперников Арены
/* множитель БМ героя от талисманов, б. п.: √(УВС × ЭЗ) — стороны складывают доли значений линеек. tlSidesOf и tlMulOf — для любого
   набора номеров: окно снаряжения (screens/hero-dev.js) примеряет талисман, не надевая его */
function tlSidesOf(nos) {
  let off = 0, def = 0;
  for (const no of nos) {
    const f = tlFam(no); if (!f || !f.bm) continue;
    const v = tlV(no) || 0;
    for (const b of Array.isArray(f.bm[0]) ? f.bm : [f.bm]) { const add = b[1] === 'fix' ? b[2] : tlFl(v * 100 * b[1], TLB); if (b[0] === 'off') off += add; else def += add; }
  }
  return { off, def };
}
const tlSides = hid => tlSidesOf(tlWornRO(hid));
const tlMulOf = nos => { const { off, def } = tlSidesOf(nos); return tlIsqrt(Math.max(1, TLB + off) * Math.max(1, TLB + def)); };
const tlMul = hid => tlMulOf(tlWornRO(hid));
/* слой БМ «талисманы» общей функции BM (index.html): отпечаток — надетые номера, множитель — tlMul */
if (typeof BM_LAYERS !== 'undefined') BM_LAYERS.push({ id: 'tal', key: h => tlWornRO(h.id).join(','), mul: h => tlWornRO(h.id).length ? tlMul(h.id) : TLB });
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
};

/* ================== «сервер» ==================
   Надеть и снять — одним вызовом: проверка, изменение запасов и мест, итог. Номер операции несут кнопки: повтор того же номера
   возвращает прежний итог и ничего не меняет. Отказ не записывается — следующая попытка идёт с тем же номером.
   Перековка — «сервер» окна «Ремесло → Перековка» (RF_SRV, screens/reforge.js); TL_SRV.forge он ставит своим входом */
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
      eq[slot] = no;   // мощь героя пересчитает BM по новому набору
      return { ok: 'put', hid, slot, no, prev };
    });
  },
  out(op, hid, slot) {
    return TL_SRV.run(op, () => {
      const h = H(hid), eq = h ? tlEq(hid) : null, no = eq && eq[slot];
      if (!no) return { refuse: 'none' };
      eq[slot] = null; TB.add(no);
      return { ok: 'out', hid, slot, no };
    });
  },
};
/* пул редкости: [номер, вес] — спойлерные линейки только с цикла «для команды», как в сундуках. Его берут перековка и ларцы */
const tlPool = r => Object.entries(TL.items).filter(([no, [id, x]]) => x === r && (!TL.fams[id].team || S.acc.cycle >= TL.fams[id].team)).map(([no, [id]]) => [+no, TL.fams[id].w[r - 1]]);

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
/* место в карточке героя: медальон с артом семейства (tlTile) и короткое значение; пустое — плюс.
   Нажатие открывает окно «Снаряжение героя» на этом месте */
function tlSlotBtn(h, i, no, sel) {
  const t = no ? `${tlName(no)} · ${RAR[tlR(no)].toLowerCase()}: ${tlFx(no)}` : `Место ${i + 1}: пусто`;
  return `<button class="tl-slot${no ? ' on' : ''}${sel ? ' sel' : ''}" ${no ? `data-r="${tlR(no)}"` : ''} data-a="sheet" data-v="tal:${h.id}:${i}" aria-label="${trEsc(t)}" title="${trEsc(t)}">${no ? `${tlTile(no)}<b class="num">${tlShort(no)}</b>` : ic('plus')}</button>`;
}
/* ряд из четырёх мест во вкладке «Снаряжение» карточки героя: зовёт heroDetail в index.html */
function talRow(h) {
  if (!TL || !S.tal) return '';
  if (!tlOpen()) return `<div class="tl-row"><span class="eyebrow">Духовные талисманы</span><p class="reason">${ic('lock')} Откроются во втором цикле — вместе с кланами.</p></div>`;
  const P = BM.parts(h), m = P.mul.tal || TLB, d = m - TLB;
  const chip = tlWorn(h.id).length ? `<span class="chip${d > 0 ? ' spirit' : ''}" title="${tmT('Боевая мощь от талисманов', `Боевая мощь от талисманов: база ${fmt(P.base)} × ${tlX(m)}`)}">${ICON('power', 13, 'Боевая мощь')}${tlPct(d)}</span>` : '';
  return `<div class="tl-row"><div class="row"><span class="eyebrow">Духовные талисманы</span><span class="g-spacer"></span>${chip}</div>
    <div class="tl-slots">${tlEq(h.id).map((no, i) => tlSlotBtn(h, i, no)).join('')}</div></div>`;
}
/* строка эффекта со значком — сумма бонусов, карточка талисмана */
const tlFxRow = no => `<div class="tl-fx">${tlTile(no)}<span><b>${tlName(no)}</b><small>${tlFx(no)}</small></span></div>`;
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
/* ================== лист «Духовные талисманы» ==================
   Надевают талисманы в одном окне со снаряжением — «Снаряжение героя» (grWin, screens/hero-dev.js): места героя слева, запасы справа,
   перетаскивание и нажатие, сравнение со стрелками. Лист открывает это окно на своём месте; выбранный талисман (S.tal.pick) сохраняется,
   если он выбран для этого места (S.tal.pickFor) — так «К герою» из «Запасов» приходит с выбранным */
Object.assign(OV, {
  tal(o) { return TL && typeof grWin === 'function' ? grWin(o, 'tal') : ''; },
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
  const cat = c => `<details class="tl-kd"><summary><b>${R.cats[c]}</b><small class="faint"> · ${Object.values(TL.fams).filter(f => f.cat === c).length} линеек</small></summary>${Object.keys(TL.fams).filter(id => TL.fams[id].cat === c).map(famRow).join('')}${c === 'farm' ? `<p class="k-note">И ещё ${Object.values(TL.fams).filter(f => f.type === 'collector').length} знаков сборщика — по одному на базовый ресурс: «Когда падает базовый ресурс, этот выпадает на 25 % чаще». Знак — деревянный жетон с привязанной вещью ресурса.</p><div class="tl-kmarks">${Object.keys(TL.fams).filter(id => TL.fams[id].type === 'collector').map(id => `<span class="tl-t art" data-r="1" title="${TL.fams[id].n}">${typeof talIcon === 'function' ? talIcon('farm', 36, TL.fams[id].n, id) : ''}</span>`).join('')}</div>` : ''}</details>`;
  return `<section class="k-box tl-kit" style="grid-column:1/-1" id="kitTal"><h3>Духовные талисманы</h3>
    <p class="k-note">Четыре места на героя. До древней редкости талисман носит только свой класс, с древней — любой герой. Одна линейка — одно место. ${R.reforge.need} одной редкости перековываются в один редкостью выше. В медальоне — иконка линейки: вещь-памятка чужой души на шнурке, в ней лунный камень с пойманной чертой; свет камня — вид талисмана (боевые — алый, охотничьи — лунное серебро, добыча — золото, печати — бирюза), цвет медальона — редкость.${TM(' §26, таблица автора, черновик docs/content/талисманы.md. Данные — design/ui/talismans.js, сборщик tools/content-gen/talismans/build.js. Экран — screens/talismans.js: ряд мест во вкладке «Снаряжение»; надевают в одном окне со снаряжением — OV.tal открывает его (screens/hero-dev.js). Иконки — 118 линеек сеткой (tools/art-gen/jobs/talisman-icons.json), помощник talIcon (screens/art-icons.js); нет иконки — арт семейства, нет и его — медальон CSS.')}</p>
    <div class="tl-kg">
      <div class="k-air-r"><b>Редкость — сила одной линейки</b><div class="k-row tl-lad">${ladder}</div><small>«Слёзы Виала»: лечение героя +N %. Чем выше редкость, тем ярче свет изнутри.</small></div>
      <div class="k-air-r"><b>Места в карточке героя</b>${slotsDemo}<small>Надетое — медальон и короткое значение; пустое — плюс; выбранное место — подсвечено. Нажатие открывает лист: места, сумма бонусов, запасы. Перековка — своё окно в «Ремесле».</small></div>
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
  ['Духовные талисманы', 'Четыре места у героя в окне снаряжения: привязка к классу до древней — значком класса, боевая мощь — стрелкой',
    () => {
      S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.seg.hero = 'gear';
      const F = TL_DEMO.flow, h = H(F.hero); if (!h || !TL) return;
      S.selHero = h.id;
      F.put.forEach((no, i) => { if (!tlEq(h.id)[i] && TB.qty(no)) TL_SRV.put(`tl${S.tal.seq}`, h.id, i, no); });
      S.overlay = { t: 'tal', arg: `${h.id}:0` };
    }],
);

/* ================== состояние ==================
   S.tal: eq — места героев (номер талисмана или null); srv — итоги операций по номерам; seq — номер следующей; pick — выбранный в листе;
   last — итог последней перековки; loose — запасы, если нет S.zp (без screens/bag.js). Мощь героя не хранится — её считает BM.
   Демо-запасы кладутся туда же, куда сундуки, и не помечаются новыми */
function tlState(s) {
  s.tal = { eq: {}, srv: {}, seq: 1, pick: null, pickFor: '', last: null, loose: {} };
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
