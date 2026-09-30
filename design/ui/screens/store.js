/* screens/store.js — Лавка Энериума: пять стартовых наборов цепочкой, пять наборов Энериума, три выдачи, лимитированные предложения,
   реклама за Энериум; покупка платного ряда пропуска — тем же «сервером» (GDD §32, §1.2, §9.3, §36; ADR-0033, ADR-0034).
   Слово автора 30.09.2026: «Я Вижу это как 5 стартовых наборов, все с х2 и 5 градаций, покупая 1 - открывается 2 ,и т.д.»; «наборы
   малого, среднего, большого, огромного и великого энериума, подписки дающие энериум раз в день, всего 3 штуки, боевой пропуск,
   лимитированные предложения»; «реклама… от 10 в день и смотреть или нет игрок решит сам вместе с попапом»; правило «дорого-богато».
   Черновик для автора — docs/content/монетизация.md. Данные — design/ui/store.js (EN_STORE и алгоритм EnStore): собирает
   tools/content-gen/store/build.js, руками не править.
   Регистрирует:
   — вкладки Лавки Энериума обёрткой SCREENS.store: «Наборы» — стартовая цепочка и предложения, «Энериум» — пять наборов и реклама,
     «Выдача» — три подписки; «Пропуск» рисует screens/pass.js; облик не продаётся — строкой внизу витрины;
   — «сервер» покупок SH_SRV: buy(номер, товар), ad(номер), day() — новые сутки, open(предложение, ключ) — предложение открывает сервер;
     номер несут кнопки, повтор ничего не повторяет, отказ ничего не меняет; сервер помнит покупки — S.store;
   — листы: OV.stbuy — что придёт, до оплаты; OV.stgot — получение; OV.stad — попап рекламы и ролик;
   — для других экранов: stPriceTxt(товар) — цена платформы игрока (пропуск), stAdLink() — строка рекламы в «Даре дня»;
   — раздел UI-кита «Лавка Энериума» (KIT_EXTRA), сценарии презентации.
   Честность: что придёт — до оплаты; «×2» — от настоящего курса; срок предложения — датой, без таймера и торопящих слов; попапов
   у предложений нет; реклама — только по нажатию игрока; облик, очки и попытки не продаются.
   Анимация получения — только transform и opacity, моменты — целые мс от начала показа; нажатие — сразу итог; «меньше движения» —
   без анимации. Арт — AV('store/…'), только если путь в EN_STORE.art.ready; до выгрузки — заглушки CSS.
   Правила воздуха (ADR-0026): карточка — картинка, имя, до двух чисел, до двух чипов и одно действие; витрина стартового набора —
   главный блок вкладки: состав — три значка с числами (что придёт — видно сразу). Стили — screens/store.css.
   Автопроверка — tools/content-gen/screens/check_store.js. */
'use strict';

const STD = window.EN_STORE || null, STA = window.EnStore || null;

/* ================== вид: числа показа, не баланс ================== */
const ST_VIEW = {
  adMs: 3000,                // ролик рекламной сети: в игре — сам ролик сети, здесь — полоса за столько мс
  step: 240, rise: 520, tail: 480,   // получение: шаг между наградами, подъём, хвост — мс
};
const ST_KIND = { keys: 'Рунные ключи', souls: 'Души', enerium: 'Энериум', dust: 'Прах душ' };
const ST_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const ST_WEEKDAY = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const ST_REFUSE = {
  data: 'Лавка недоступна', op: 'Операция без номера', none: 'Такого товара нет', once: 'Этот набор уже куплен: он продаётся раз за игру',
  order: 'Сначала — предыдущая ступень', days: 'Выдача уже оплачена на столько дней вперёд, сколько можно', open: 'Пропуск ещё закрыт', bought: 'Платный ряд уже открыт',
  gone: 'Предложение закрылось', limit: 'Предложение уже куплено', cap: 'На сегодня ролики кончились — завтра снова',
};

/* ================== помощники ================== */
const stOk = () => !!(STD && STA);
const stRegion = () => (S.store && S.store.region) || (STD ? STD.demo.region : 'ru');
const stDay = () => (S.gift ? S.gift.today : 1);
const stCtx = () => ({ day: stDay(), pass: S.pass ? { open: typeof psOpen === 'function' && psOpen(), no: S.pass.no, paid: S.pass.paid } : null });
const stNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
const stReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
/* цена словами: рубли — «249 ₽», центы — «$2,99» */
function stMoney(p) {
  if (!p) return '';
  return p.cur === 'usd' ? `$${Math.floor(p.n / 100)},${String(p.n % 100).padStart(2, '0')}` : `${fmt(p.n)} ₽`;
}
const stPriceTxt = id => (stOk() ? stMoney(STA.price(STD, id, stRegion())) : '');
/* арт: путь выгрузки по ключу EN_STORE.art.map, только если выгружен */
const stArt = key => { const p = STD && STD.art.map[key]; return p && STD.art.ready.includes(p) ? AV(p) : ''; };
const stPic = (key, cls = '') => { const s = stArt(key); return s ? `<img class="st-pic${cls ? ' ' + cls : ''}" src="${s}" alt="">` : `<i class="st-pic stub${cls ? ' ' + cls : ''}" aria-hidden="true"></i>`; };
const stIco = k => `<img class="st-ico" src="${curImg(k)}" alt="">`;
const stGets = id => STA.gets(STD, S.store, id, stDay());
const stWhy = id => STA.refuse(STD, S.store, id, stCtx());
const stOp = () => 'st' + S.store.srv.seq;
const stEn = list => list.filter(([k]) => k === 'enerium').reduce((a, [, n]) => a + n, 0);
/* срок предложения — датой по серверу, без таймера: «до сб, 20:00» */
function stUntil(left) {
  const d = new Date(Date.now() + Math.max(0, left) * 1000);
  return `до ${ST_WEEKDAY[d.getDay()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
const stOfferName = o => { const K = STD.offers.kinds[o.of]; return `${K.n}${o.cycle ? ` · цикл ${ROMAN[o.cycle]}` : ''}`; };

/* ================== состояние: S.store ==================
   region — платёжная область (ru — рубли, us — доллары; решает платформа, команда переключает для показа); bought — сколько раз куплен
   товар; subs — дней выдачи впереди; subDay — сутки последней порции; offers — открытые предложения [{ id, left, n }]; opened — ключи
   открытий, чтобы сервер не открывал одно дважды; ads — { day, n }; srv — ответы по номерам операций; fx — идущий показ; play — ролик */
function stNew(s, demo) {
  const D = STD.demo, offers = [], opened = {};
  if (demo) for (const id of D.offers) {
    const o = STD.offers.list.find(x => x.id === id), left = o ? STA.offerLife(STD, o.of, s.week ? s.week.left : 0) : 0;
    if (left > 0) { offers.push({ id, left, n: 0 }); opened[stOpenKey(o, s)] = 1; }
  }
  return { v: 2, region: D.region, bought: {}, subs: {}, subDay: {}, offers, opened, ads: { day: s.gift ? s.gift.today : 1, n: 0 }, srv: { ops: {}, seq: 1 }, fx: null, play: null };
}
/* ключ открытия: «Дар пути» — раз за цикл (свой id), «Лавка недели» — раз в серверную неделю, праздник — раз за праздник */
function stOpenKey(o, s = S) {
  if (o.of === 'week') return `week:${s.event ? s.event.weekNo : 0}`;
  return o.id;
}
function stState(s) { if (stOk()) s.store = stNew(s, true); return s; }

/* ================== «сервер» Лавки ==================
   buy(op, id) — покупка: платёж проводит платформа, сервер проверяет квитанцию с этим номером и выдаёт товар один раз; ad(op) — ролик
   досмотрен: награду засчитывает сервер по подтверждению рекламной сети; day() — новые серверные сутки: письма выдачи; open(id) —
   предложение открывает сервер. Ответ: { res } — сделано; { again, res } — повтор номера, ничего не меняет; { refuse } — отказ */
const SH_SRV = {
  buy(op, id) {
    const T = S.store;
    if (!stOk() || !T) return { refuse: 'data' };
    if (!op) return { refuse: 'op' };
    if (T.srv.ops[op]) return { again: true, res: T.srv.ops[op] };
    const P = STA.product(STD, id); if (!P) return { refuse: 'none' };
    const day = stDay(), why = STA.refuse(STD, T, id, stCtx()); if (why) return { refuse: why };
    const got = STA.gets(STD, T, id, day), price = STA.price(STD, id, T.region);
    if (P.kind === 'sub') { const A = STA.subAdd(STD, T, id, day); T.subs[id] = (T.subs[id] || 0) + A.days; T.subDay[id] = day; }
    if (P.kind === 'offer') { const O = STA.offerOf(T, id); O.n = (O.n || 0) + 1; }
    if (P.kind === 'pass') { S.pass.paid = true; T.bought['pass:' + S.pass.no] = 1; }
    else T.bought[id] = (T.bought[id] || 0) + 1;
    for (const [k, n] of got) S.wallet[k] = (S.wallet[k] || 0) + n;
    const res = { op, id, kind: P.kind, got, price };
    T.srv.ops[op] = res; T.srv.seq++;
    return { res };
  },
  ad(op) {
    const T = S.store;
    if (!stOk() || !T) return { refuse: 'data' };
    if (!op) return { refuse: 'op' };
    if (T.srv.ops[op]) return { again: true, res: T.srv.ops[op] };
    const day = stDay();
    if (STA.adLeft(STD, T, day) <= 0) return { refuse: 'cap' };
    T.ads = T.ads.day === day ? { day, n: T.ads.n + 1 } : { day, n: 1 };
    S.wallet.enerium = (S.wallet.enerium || 0) + STD.ads.perView;
    const res = { op, got: [['enerium', STD.ads.perView]], left: STA.adLeft(STD, T, day) };
    T.srv.ops[op] = res; T.srv.seq++;
    return { res };
  },
  /* новые серверные сутки — сервер без просьбы игрока: у каждой выдачи с днями впереди — письмо с порцией во Входящие */
  day() {
    const T = S.store; if (!stOk() || !T) return 0;
    const day = stDay(); let n = 0;
    for (const s of STD.subs) {
      const left = T.subs[s.id] || 0; if (left <= 0) continue;
      T.subs[s.id] = left - 1; T.subDay[s.id] = day; n++;
      S.inbox.unshift({ id: `st-${s.id}-${day}`, k: 'mail', t: s.n, s: left - 1 ? `Энериум дня · впереди ещё ${left - 1} ${plural(left - 1, 'день', 'дня', 'дней')}` : 'Энериум дня · последний день выдачи', rew: [['enerium', s.daily]] });
    }
    return n;
  },
  /* предложение открывает сервер: новый цикл, неделя расы, праздник. Одно открытие — один раз; открытых — не больше maxActive */
  open(id) {
    const T = S.store, o = stOk() && STD.offers.list.find(x => x.id === id); if (!T || !o) return null;
    const key = stOpenKey(o); if (T.opened[key]) return null;
    const left = STA.offerLife(STD, o.of, S.week ? S.week.left : 0); if (left <= 0) return null;
    T.opened[key] = 1;
    T.offers = T.offers.filter(x => x.left > 0).slice(-(STD.offers.maxActive - 1)).concat([{ id, left, n: 0 }]);
    return { id, left };
  },
};

/* ================== витрина: «Наборы» ================== */
/* ступень цепочки крупно: арт, имя, что придёт ×2 и цена; купил — открылась следующая; все пять — «собраны» */
function stChainShow(o = {}) {
  const C = STD.chain, n = C.steps.length, at = o.at != null ? o.at : STA.chainAt(STD, S.store), done = !at;
  const s = C.steps[(done ? n : at) - 1], got = s.get.map(([k, v]) => [k, v * C.x]), op = o.kit ? '' : stOp();
  const pic = `<span class="st-ped big">${stPic(s.id, 'lg')}</span>`;
  const items = got.map(([k, v]) => `<span class="st-it" data-k="${k}">${stIco(k)}<b class="num">${fmt(v)}</b><small>${ST_KIND[k]}</small></span>`).join('');
  const act = done ? `<span class="chip spirit st-done">${ic('check')}все пять собраны</span>`
    : `<button class="btn go st-buy"${o.kit ? '' : ` data-a="stbuy" data-v="${s.id}"`}>${stPriceTxt(s.id)}</button>`;
  return `<div class="st-show${done ? ' done' : ''}"${o.kit ? '' : ` data-st="${s.id}"`}>${done ? '' : `<i class="st-x2" aria-hidden="true">×${C.x}</i>`}
    <div class="st-sh-l">${pic}</div>
    <div class="st-sh-r"><span class="eyebrow">${done ? 'Стартовые наборы' : `Стартовый набор · ${ST_ROMAN[at]} из ${ST_ROMAN[n]} · раз за игру`}</span>
      <b class="st-nm">«${trEsc(s.n)}»</b><div class="st-its">${items}</div>
      <small class="st-sub">${done ? 'Рунные ключи и души дальше — только игрой: боссы биомов, контракты, сундуки.' : `Всё уже ×${C.x}: покупка ступени — всегда первая. ${at < n ? `Купите — откроется «${trEsc(C.steps[at].n)}».` : 'Это последняя ступень цепочки.'}`}</small>
      ${act}</div></div>`;
}
/* лесенка из пяти ступеней: куплена — отметка, текущая — свет, впереди — замок; нажатие — лист ступени */
function stRungs(o = {}) {
  const C = STD.chain, at = o.at != null ? o.at : STA.chainAt(STD, S.store);
  return `<div class="st-rungs" role="list" aria-label="Стартовые наборы">${C.steps.map((s, i) => {
    const k = i + 1, st = STA.count(S.store, s.id) || (o.at != null && (!at || k < at)) ? 'got' : k === at ? 'cur' : 'lock';
    const lbl = `Ступень ${ST_ROMAN[k]} — «${s.n}», ${stPriceTxt(s.id)}${st === 'got' ? ', куплена' : st === 'cur' ? ', продаётся' : ', откроется после предыдущей'}`;
    return `<button class="st-rung ${st}" role="listitem"${o.kit ? '' : ` data-a="stbuy" data-v="${s.id}"`} aria-label="${trEsc(lbl)}" title="${trEsc(lbl)}"><span class="st-rp">${stPic(s.id, 'sm')}${st === 'got' ? `<span class="st-rk">${ic('check')}</span>` : st === 'lock' ? `<span class="st-rk lk">${ic('lock')}</span>` : ''}</span><b class="st-rn">${ST_ROMAN[k]}</b><small class="num">${stPriceTxt(s.id)}</small></button>`;
  }).join('')}</div>`;
}
/* предложение: арт, имя, Энериум, «до …» и цена; купленное — отметка */
function stOfferCard(O, o = {}) {
  const P = STA.product(STD, O.id), K = STD.offers.kinds[P.of], en = stEn(P.get), why = o.kit ? null : stWhy(O.id);
  const act = why === 'limit' ? `<span class="chip spirit">${ic('check')}куплено</span>` : `<button class="btn go sm st-buy"${o.kit ? '' : ` data-a="stbuy" data-v="${O.id}"`}>${stPriceTxt(O.id)}</button>`;
  return `<div class="st-of" data-of="${P.of}"><span class="st-ped">${stPic(P.of)}</span><div class="col st-ofb"><span class="eyebrow">${trEsc(K.n)}</span>
    <b class="st-ofn">${stIco('enerium')}<span class="num">${fmt(en)}</span></b><small class="st-until">${stUntil(O.left)}</small></div>${act}</div>`;
}
function stOffersHtml() {
  const L = (S.store.offers || []).filter(o => o.left > 0);
  const body = L.length ? L.map(O => stOfferCard(O)).join('')
    : `<p class="reason st-none">Сейчас предложений нет. Они приходят с новым циклом, неделей расы и праздниками — и ждут здесь, в Лавке.</p>`;
  return `<div class="st-offers"><span class="eyebrow">Предложения</span>${body}</div>`;
}
function stStartView() {
  return `<div class="st-start"><div class="st-main">${stChainShow()}${stRungs()}</div>${stOffersHtml()}</div>`;
}

/* ================== витрина: «Энериум» ================== */
function stPackCard(p, o = {}) {
  const e = STA.packEn(STD, p.id), first = o.first != null ? o.first : !STA.count(S.store, p.id), n = first ? e.first : e.n, i = STD.packs.indexOf(p);
  return `<div class="st-pk${first ? ' first' : ''}" data-i="${i + 1}">${first ? `<i class="st-x2 sm" aria-hidden="true">×${p.firstX}</i>` : ''}
    <span class="st-ped">${stPic(p.id)}</span><b class="st-pn">${trEsc(p.n.replace(' набор Энериума', ''))}</b>
    <span class="st-pa">${stIco('enerium')}<b class="num">${fmt(n)}</b></span>
    ${p.bonusBp ? `<span class="chip gold st-bonus">+${Math.floor(p.bonusBp / 100)} %</span>` : '<span class="st-bonus none" aria-hidden="true"></span>'}
    <button class="btn go sm st-buy"${o.kit ? '' : ` data-a="stbuy" data-v="${p.id}"`} aria-label="${trEsc(`${p.n}: ${fmt(n)} Энериума${first ? ', первая покупка ×' + p.firstX : ''} — ${stPriceTxt(p.id)}`)}">${stPriceTxt(p.id)}</button></div>`;
}
/* строка рекламы: награда за ролик, сколько осталось сегодня, «Смотреть» — попап */
function stAdStrip(o = {}) {
  const left = o.left != null ? o.left : STA.adLeft(STD, S.store, stDay()), cap = STD.ads.dayCap;
  return `<div class="st-ad">${stPic('ad', 'ad')}<div class="col st-adb"><b>Энериум за рекламу</b><small>Ролик до ${STD.ads.sec} секунд — +${STD.ads.perView} Энериума. Сегодня — ${left} из ${cap}.</small></div>
    ${left ? `<button class="btn st-adgo"${o.kit ? '' : ' data-a="stad"'}>Смотреть</button>` : '<span class="chip">на сегодня всё</span>'}</div>`;
}
function stEnView() {
  return `<div class="st-en"><div class="st-packs">${STD.packs.map(p => stPackCard(p)).join('')}</div>${stAdStrip()}</div>`;
}

/* ================== витрина: «Выдача» ================== */
function stSubCard(s, o = {}) {
  const left = o.left != null ? o.left : (S.store.subs[s.id] || 0), on = left > 0 || (!o.kit && S.store.subDay[s.id] === stDay()), why = o.kit ? null : stWhy(s.id), i = STD.subs.indexOf(s);
  const act = why === 'days' ? `<span class="chip">оплачено на ${s.maxDays} дней</span>`
    : `<button class="btn go sm st-buy"${o.kit ? '' : ` data-a="stbuy" data-v="${s.id}"`}>${on ? 'Продлить · ' : ''}${stPriceTxt(s.id)}</button>`;
  return `<div class="st-sb${on ? ' on' : ''}" data-i="${i + 1}"><span class="st-ped">${stPic(s.id)}</span><b class="st-pn">${trEsc(s.n)}</b>
    <span class="st-pa">${stIco('enerium')}<b class="num">${fmt(s.daily)}</b><small>в сутки</small></span>
    <small class="st-sbl">${on ? `${ic('check')}идёт · впереди ${left} ${plural(left, 'день', 'дня', 'дней')}` : `${s.days} дней, письмом во Входящие`}</small>${act}</div>`;
}
function stSubsView() {
  return `<div class="st-subs">${STD.subs.map(s => stSubCard(s)).join('')}</div>
    <p class="reason st-rule">Выдача приходит раз в сутки письмом во Входящие и не сгорает. Сама не продлевается.</p>`;
}

/* зал доната — «дорого-богато»: фон — зал Лавки (store/hall.jpg), без него — свет CSS; внизу — строка честности */
function stHall(body, tab) {
  const bg = stArt('hall');
  return `<div class="st-hall${bg ? ' art' : ''}" data-tab="${tab}">${bg ? `<img class="st-bg" src="${bg}" alt="">` : ''}${body}
    <p class="reason st-note">За деньги — только больше возможностей. Рунные ключи и души — только в стартовых наборах. Облик не продаётся — его зарабатывают: <button class="link" data-a="sheet" data-v="look">Облик ${ic('chev')}</button></p>
    ${stTeam()}</div>`;
}
function stTeam() {
  const T = S.store;
  return TM(`<div class="row st-team"><span class="eyebrow">Команда</span><button class="btn sm" data-a="stteam" data-v="region">${T.region === 'us' ? 'цены: Запад' : 'цены: Россия'}</button><button class="btn sm" data-a="stteam" data-v="path">новый цикл</button><button class="btn sm" data-a="stteam" data-v="fest">праздник</button><button class="btn sm" data-a="stteam" data-v="day">новые сутки</button><button class="btn sm" data-a="stteam" data-v="reset">сбросить покупки</button>
    <span class="faint st-tnote">EN_STORE: куплено ${Object.values(T.bought).reduce((a, x) => a + x, 0)}, выдача — ${Object.entries(T.subs).filter(([, x]) => x > 0).map(([k, x]) => `${k} ${x}`).join(', ') || 'нет'}, реклама — ${T.ads.day === stDay() ? T.ads.n : 0} из ${STD.ads.dayCap}; журнал — ${Object.keys(T.srv.ops).length} операций. Оплата — окно платформы; здесь «сервер» выдаёт сразу.</span></div>`, 'div');
}

/* ================== листы ================== */
function stGotRows(list, o = {}) {
  return list.map(([k, n], i) => `<div class="st-gi"${o.anim ? ` style="--dt:${o.anim(i)}ms;--tt:${ST_VIEW.rise}ms"` : ''}><span class="st-gw">${stIco(k)}</span><b>${ST_KIND[k] || k}</b><b class="num gold">×${fmt(n)}</b></div>`).join('');
}
Object.assign(OV, {
  /* что придёт — до оплаты: всё, что получит игрок, условия и цена платформы игрока */
  stbuy(o) {
    if (!stOk() || !S.store) return '';
    const id = o && o.arg, P = STA.product(STD, id);
    if (!P) return '';
    if (P.kind === 'pass') return typeof OV.pspaid === 'function' ? OV.pspaid() : '';
    const why = stWhy(id), got = stGets(id), op = stOp(), C = STD.chain;
    let title = P.n, art = id, li = [];
    if (P.kind === 'chain') {
      title = `«${P.n}»`;
      li = [`Стартовый набор ${ST_ROMAN[P.step]} из ${ST_ROMAN[C.steps.length]} — раз за игру. Покупка всегда первая, поэтому всё ×${C.x}: без удвоения было бы ${P.get.map(([k, n]) => `${k === 'enerium' ? ST_KIND[k] : ST_KIND[k].toLowerCase()} ${fmt(n)}`).join(', ')}.`,
        P.step < C.steps.length ? `После покупки откроется следующая ступень — «${C.steps[P.step].n}».` : 'Это последняя ступень цепочки.',
        'Рунные ключи и души за деньги — только в стартовых наборах. Дальше — игрой: боссы биомов, контракты, сундуки.'];
    } else if (P.kind === 'pack') {
      const e = STA.packEn(STD, id), first = !STA.count(S.store, id);
      li = [first ? `Первая покупка этого набора — ×${P.firstX}: ${fmt(e.first)} вместо ${fmt(e.n)}.` : `Первая покупка ×${P.firstX} уже была: дальше — ${fmt(e.n)} за покупку.`,
        P.bonusBp ? `Прибавка набора — +${Math.floor(P.bonusBp / 100)} % к Энериуму.` : 'Малый набор — базовый курс Лавки.', 'Покупать можно сколько угодно.'];
    } else if (P.kind === 'sub') {
      const A = STA.subAdd(STD, S.store, id, stDay()), left = S.store.subs[id] || 0;
      li = [A.now.length ? `Сегодня — ${fmt(P.daily)} Энериума сразу, дальше ${A.days} ${plural(A.days, 'день', 'дня', 'дней')} — по ${fmt(P.daily)} письмом во Входящие.` : `Выдача идёт: прибавится ${A.days} ${plural(A.days, 'день', 'дня', 'дней')} к ${left} впереди.`,
        'Письмо не сгорает: пропущенный день ничего не отнимает.', `Сама не продлевается. Вперёд — не больше ${P.maxDays} дней.`];
    } else if (P.kind === 'offer') {
      const K = STD.offers.kinds[P.of], O = STA.offerOf(S.store, id);
      title = stOfferName(P); art = P.of;
      /* выгода — от настоящего курса: малый набор Энериума в той же области оплаты, без первой покупки */
      const B = STD.econ.base, cur = stRegion() === 'us' ? 'usd' : 'rub', pr = STA.price(STD, id, stRegion()).n, k10 = Math.round(stEn(P.get) * B[cur] * 10 / (B.en * pr));
      li = [`${K.what[0].toUpperCase() + K.what.slice(1)}.`, O ? `Открыто ${stUntil(O.left)} по серверу.` : 'Закрыто.', `Курс — ×${Math.floor(k10 / 10)}${k10 % 10 ? ',' + (k10 % 10) : ''} к малому набору Энериума.`, `Купить можно ${K.limit} ${plural(K.limit, 'раз', 'раза', 'раз')} за открытие.`];
    }
    const body = `<div class="st-shd"><span class="st-ped">${stPic(art)}</span><div class="st-gl">${got.length ? stGotRows(got) : '<p class="reason">Сегодняшняя порция уже пришла.</p>'}</div></div>
      <ul class="ps-li">${li.map(x => `<li>${trEsc(x)}</li>`).join('')}</ul>
      ${TM(`<p class="reason">Прототип: окно оплаты платформы не вызывается, «сервер» выдаёт товар сразу. SH_SRV.buy — операция с номером: повтор ничего не выдаёт, отказ ничего не меняет. Цена — ступень ${P.tier}: ${stMoney(STA.price(STD, id, 'ru'))} · ${stMoney(STA.price(STD, id, 'us'))}.</p>`)}`;
    const foot = why ? `<span class="chip">${ST_REFUSE[why] || ''}</span><span class="g-spacer"></span><button class="btn" data-a="close">Закрыть</button>`
      : `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="stbuydo" data-v="${op}|${id}">Купить · ${stPriceTxt(id)}</button>`;
    return sheet(trEsc(title), body, foot);
  },
  /* получение: награды поднимаются по одной; нажатие — сразу итог */
  stgot() {
    const fx = S.store && S.store.fx; if (!fx) return '';
    const R = fx.res, e = fx.done ? 0 : Math.max(0, stNow() - fx.t0);
    const rows = stGotRows(R.got, fx.done ? {} : { anim: i => i * ST_VIEW.step - e });
    const P = STA.product(STD, R.id), sub = P && P.kind === 'sub' ? 'Дальше — письмом во Входящие, раз в сутки.' : P && P.kind === 'chain' && STA.chainAt(STD, S.store) ? `Открылась следующая ступень — «${trEsc(STD.chain.steps[STA.chainAt(STD, S.store) - 1].n)}».` : '';
    const art = P ? (P.kind === 'offer' ? P.of : R.id) : '', head = art ? `<div class="st-gothd"${fx.done ? '' : ` style="--dt:${-e}ms;--tt:${ST_VIEW.rise}ms"`}><span class="st-ped">${stPic(art)}</span></div>` : '';
    return dialog(P ? trEsc(P.kind === 'offer' ? stOfferName(P) : P.kind === 'chain' ? `«${P.n}»` : P.n) : 'Покупка', `<div class="st-got${fx.done ? '' : ' anim'}">${head}${rows}${fx.done ? '' : '<button class="ps-tap" data-a="stskip" aria-label="Сразу итог" tabindex="-1"></button>'}</div>`,
      `${sub ? `<small class="st-gotnote">${sub}</small>` : ''}<span class="g-spacer"></span><button class="btn go" data-a="close">Готово</button>`, 'st-dlg');
  },
  /* попап рекламы: спросить; ролик — досмотреть; награда — от сервера. Попап открывает только игрок */
  stad() {
    if (!stOk() || !S.store) return '';
    const T = S.store, left = STA.adLeft(STD, T, stDay()), A = STD.ads, P = T.play;
    if (P && P.done) return dialog('Энериум за рекламу', `<div class="st-adp">${stPic('ad', 'ad')}<b class="st-adw">${stIco('enerium')}<span class="num">+${fmt(A.perView)}</span></b><p class="muted">Ролик досмотрен — Энериум в кошельке. Сегодня осталось ${left} из ${A.dayCap}.</p></div>`,
      `<span class="g-spacer"></span><button class="btn go" data-a="close">Готово</button>`, 'st-dlg');
    if (P) {
      const e = Math.max(0, stNow() - P.t0);
      return dialog('Ролик', `<div class="st-adp play"><span class="st-reel" aria-hidden="true">${stPic('ad', 'ad')}</span><p class="muted">Идёт ролик рекламной сети. Досмотрите до конца — и сервер засчитает награду.</p>
        <div class="st-bar"><i style="--dt:${-e}ms;--tt:${ST_VIEW.adMs}ms"></i></div></div>`,
        `<button class="btn ghost" data-a="stadstop">Закрыть без награды</button>`, 'st-dlg');
    }
    if (!left) return dialog('Энериум за рекламу', `<div class="st-adp">${stPic('ad', 'ad')}<p class="muted">На сегодня ролики кончились. Завтра — снова ${A.dayCap}.</p></div>`,
      `<span class="g-spacer"></span><button class="btn" data-a="close">Закрыть</button>`, 'st-dlg');
    return dialog('Энериум за рекламу', `<div class="st-adp">${stPic('ad', 'ad')}<b class="st-adw">${stIco('enerium')}<span class="num">+${fmt(A.perView)}</span></b>
      <p class="muted">Короткий ролик — до ${A.sec} секунд. Досмотрите — и получите ${A.perView} Энериума. Сегодня осталось ${left} из ${A.dayCap}.</p>
      <p class="reason">Смотреть или нет — решаете вы. «Не сейчас» ничего не меняет.</p>${TM('<p class="reason">Награду засчитывает сервер по подтверждению рекламной сети: SH_SRV.ad — операция с номером, дневной потолок — EN_STORE.ads.dayCap.</p>')}</div>`,
      `<button class="btn ghost" data-a="close">Не сейчас</button><button class="btn go" data-a="stadgo" data-v="ad${T.srv.seq}">Смотреть</button>`, 'st-dlg');
  },
});

/* строка рекламы в «Даре дня» (screens/pass.js): открывает попап; кончились ролики — молчит */
function stAdLink() {
  if (!stOk() || !S.store) return '';
  const left = STA.adLeft(STD, S.store, stDay());
  return left ? `<button class="link st-adlink" data-a="stad">${ic('star')}Энериум за рекламу — ${left} из ${STD.ads.dayCap} сегодня</button>` : '';
}

/* ================== показ получения ================== */
function stShow(res) {
  const fx = { id: res.op, t0: stNow(), res, done: stReduced() };
  S.store.fx = fx; S.overlay = { t: 'stgot' }; render();
  if (fx.done) return;
  const k = res.got.length;
  setTimeout(() => { if (S.store.fx === fx && !fx.done) { fx.done = true; if (S.overlay && S.overlay.t === 'stgot') render(); } }, k * ST_VIEW.step + ST_VIEW.rise + ST_VIEW.tail);
}

/* ================== действия ================== */
Object.assign(ACT, {
  stbuy(v) { S.overlay = { t: 'stbuy', arg: v }; render(); },
  stbuydo(v) {
    const [op, id] = String(v || '').split('|'), x = SH_SRV.buy(op, id);
    if (x.again) return;
    if (x.refuse === 'days') { const P = STA.product(STD, id); return toast(`Выдача уже оплачена на ${P.maxDays} дней вперёд — больше нельзя`); }
    if (x.refuse) return toast(ST_REFUSE[x.refuse] || ST_REFUSE.op);
    if (!x.res.got.length) { S.overlay = null; toast(`${STA.product(STD, id).n}: дни прибавлены`, curImg('enerium')); return; }
    stShow(x.res);
  },
  stskip() { const fx = S.store && S.store.fx; if (fx) { fx.done = true; render(); } },
  stad() { S.store.play = null; S.overlay = { t: 'stad' }; render(); },
  /* ролик: в игре — плеер рекламной сети; досмотрен — сервер засчитывает награду по её подтверждению */
  stadgo(v) {
    const T = S.store; if (!T || T.play) return;
    if (STA.adLeft(STD, T, stDay()) <= 0) return toast(ST_REFUSE.cap);
    const play = { op: v, t0: stNow(), done: false };
    T.play = play; render();
    setTimeout(() => {
      if (T.play !== play) return;
      /* ролик закрыли раньше конца — крестиком или Esc: награды нет, как у «Закрыть без награды» */
      if (!S.overlay || S.overlay.t !== 'stad') { T.play = null; return; }
      const x = SH_SRV.ad(play.op);
      if (x.refuse) { T.play = null; if (S.overlay && S.overlay.t === 'stad') S.overlay = null; render(); return toast(ST_REFUSE[x.refuse] || ST_REFUSE.cap); }
      play.done = true; if (S.overlay && S.overlay.t === 'stad') render();
    }, stReduced() ? 0 : ST_VIEW.adMs);
  },
  stadstop() { if (S.store) S.store.play = null; S.overlay = null; render(); toast('Ролик закрыт — награды нет, попытка не сгорела'); },
  /* команде: область цен, предложения, новые сутки, сброс */
  stteam(v) {
    const T = S.store; if (!T) return;
    if (v === 'region') T.region = T.region === 'us' ? 'ru' : 'us';
    else if (v === 'path') { const id = `path${Math.min(6, Math.max(2, S.acc.cycle))}`; delete T.opened[id]; T.offers = T.offers.filter(o => o.id !== id); SH_SRV.open(id); }
    else if (v === 'fest') { delete T.opened.fest; T.offers = T.offers.filter(o => o.id !== 'fest'); SH_SRV.open('fest'); }
    else if (v === 'day') { if (typeof psNewDay === 'function') psNewDay(); else SH_SRV.day(); }
    else if (v === 'reset') { const r = T.region; S.store = stNew(S, true); S.store.region = r; }
    render();
  },
});

/* ================== Лавка Энериума: вкладки ================== */
const stStore0 = SCREENS.store;
SCREENS.store = function () {
  const m = stStore0.apply(this, arguments);
  if (!stOk() || !S.store || !m || !m.seg) return m;
  const pass = m.seg.items.find(([k]) => k === 'pass'), newOffer = S.store.offers.some(o => o.left > 0 && !STA.refuse(STD, S.store, o.id, stCtx()));
  const items = [['start', 'Наборы', newOffer], ['en', 'Энериум'], ['subs', 'Выдача'], pass || ['pass', 'Пропуск']];
  const seg = Object.assign({}, m.seg, { items }), t = S.seg.store;
  if (t === 'start') return Object.assign({}, m, { seg, html: `<section class="scr">${stHall(stStartView(), 'start')}</section>` });
  if (t === 'en') return Object.assign({}, m, { seg, html: `<section class="scr">${stHall(stEnView(), 'en')}</section>` });
  if (t === 'subs') return Object.assign({}, m, { seg, html: `<section class="scr">${stHall(stSubsView(), 'subs')}</section>` });
  return Object.assign({}, m, { seg });
};

/* ================== состояние и сутки ================== */
const stInit0 = initialState;
initialState = function () { return stState(stInit0()); };
stState(S);
/* новые серверные сутки: письма выдачи — вслед за листом даров и днём сезона (DG_SRV.newDay в screens/pass.js) */
if (typeof DG_SRV !== 'undefined' && DG_SRV && !DG_SRV.stWrapped) {
  const dgNewDay0 = DG_SRV.newDay;
  DG_SRV.newDay = function () { const r = dgNewDay0.apply(this, arguments); try { SH_SRV.day(); } catch (_) { } return r; };
  DG_SRV.stWrapped = true;
}
/* срок предложений идёт каждую секунду: на экране меняется только дата конца, когда сервер закрывает предложение */
if (typeof setInterval === 'function') setInterval(() => {
  const T = S && S.store; if (!T || T.v !== 2 || !T.offers.length) return;
  let gone = false;
  for (const o of T.offers) if (o.left > 0) { o.left--; if (o.left <= 0) gone = true; }
  if (gone) { T.offers = T.offers.filter(o => o.left > 0); if (S.route === 'store') render(); }
}, 1000);

/* ================== UI-кит: «Лавка Энериума» ================== */
function stKitHtml() {
  if (!stOk() || !S.store) return '<section class="k-box"><h3>Лавка Энериума</h3><p class="k-note">Нет данных: store.js.</p></section>';
  const fig = (h, c, cls = '') => `<figure class="st-kf${cls ? ' ' + cls : ''}">${h}<figcaption>${c}</figcaption></figure>`;
  const chain = [fig(stChainShow({ kit: true, at: 3 }), 'ступень III продаётся', 'wide'), fig(stChainShow({ kit: true, at: 0 }), 'все пять собраны', 'wide')].join('');
  const rungs = fig(stRungs({ kit: true, at: 3 }), 'лесенка: куплены, продаётся, впереди', 'wide');
  const packs = [fig(stPackCard(STD.packs[1], { kit: true, first: true }), 'первая покупка ×2'), fig(stPackCard(STD.packs[1], { kit: true, first: false }), 'после первой')].join('');
  const subs = [fig(stSubCard(STD.subs[0], { kit: true, left: 0 }), 'выдача не идёт'), fig(stSubCard(STD.subs[0], { kit: true, left: 12 }), 'идёт, 12 дней впереди')].join('');
  const offer = fig(stOfferCard({ id: 'week', left: 3 * 86400, n: 0 }, { kit: true }), 'предложение недели');
  const ad = [fig(stAdStrip({ kit: true, left: 2 }), 'ролики есть', 'wide'), fig(stAdStrip({ kit: true, left: 0 }), 'на сегодня всё', 'wide')].join('');
  const E = STD.econ, team = TM(`<p class="k-note">Сборщик — tools/content-gen/store/build.js: цепочка ${fmt(E.chain.rub)} ₽ — ключи ${E.chain.keys}, души ${fmt(E.chain.souls)}, Энериум ${fmt(E.chain.enerium)}; к концу цикла II плательщик ×${(E.chain.x17.keys / 100).toFixed(2).replace('.', ',')} по ключам и ×${(E.chain.x17.souls / 100).toFixed(2).replace('.', ',')} по душам. Базовый курс — ${fmt(E.base.en)} Энериума за ${fmt(E.base.rub)} ₽. Реклама — до ${E.adsDay} в день. Черновик — docs/content/монетизация.md.</p>`, 'div');
  return `<section class="k-box st-kbox" style="grid-column:1/-1"><h3>Лавка Энериума</h3>
    <p class="k-note">Пять стартовых наборов цепочкой — все ×2, каждый раз за игру, купил один — открылся следующий; пять наборов Энериума — больше набор, не хуже курс, первая покупка ×2; три выдачи — Энериум раз в сутки письмом; предложения — датой, без таймера; реклама — только по нажатию игрока, попап спрашивает. Что придёт — листом до оплаты.</p>
    <div class="st-kit"><div class="k-air-r"><b>Стартовый набор</b><div class="k-row">${chain}</div></div>
      <div class="k-air-r"><b>Лесенка</b><div class="k-row">${rungs}</div></div>
      <div class="k-air-r"><b>Набор Энериума</b><div class="k-row">${packs}</div></div>
      <div class="k-air-r"><b>Выдача</b><div class="k-row">${subs}</div></div>
      <div class="k-air-r"><b>Предложение</b><div class="k-row">${offer}</div></div>
      <div class="k-air-r"><b>Реклама</b><div class="k-row">${ad}</div></div></div>${team}</section>`;
}
KIT_EXTRA.push({ html: stKitHtml });

/* ================== сценарии презентации ================== */
FLOWS.push(
  ['Лавка · стартовые наборы', 'Пять наборов цепочкой: ступень крупно, всё ×2, раз за игру; купил — открылась следующая', () => { S.overlay = null; S.route = 'store'; S.seg.store = 'start'; }],
  ['Лавка · стартовый набор — что внутри', 'Лист до оплаты: ключи, души и Энериум уже ×2, что откроется следом, цена платформы', () => { S.route = 'store'; S.seg.store = 'start'; const at = STA.chainAt(STD, S.store); S.overlay = { t: 'stbuy', arg: STD.chain.steps[(at || STD.chain.steps.length) - 1].id }; }],
  ['Лавка · наборы Энериума', 'Малый, средний, большой, огромный, великий: больше набор — больше прибавка, первая покупка ×2', () => { S.overlay = null; S.route = 'store'; S.seg.store = 'en'; }],
  ['Лавка · выдача', 'Три выдачи: Энериум раз в сутки письмом, не сгорает, сама не продлевается', () => { S.overlay = null; S.route = 'store'; S.seg.store = 'subs'; }],
  ['Лавка · предложение недели', 'Лимитированное — курс первой покупки снова, ненадолго: срок датой, без таймера', () => { S.route = 'store'; S.seg.store = 'start'; const o = S.store.offers.find(x => x.left > 0); S.overlay = o ? { t: 'stbuy', arg: o.id } : null; }],
  ['Лавка · реклама за Энериум', 'Попап спрашивает: ролик до 30 секунд — +5 Энериума, два в сутки; «Не сейчас» ничего не меняет', () => { S.route = 'store'; S.seg.store = 'en'; S.store.play = null; S.overlay = { t: 'stad' }; }],
);
