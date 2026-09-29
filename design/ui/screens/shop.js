/* screens/shop.js — «Ремесло → Лавка» (GDD §14.2): витрина из десяти товаров на общих запасах. Договор — screens/model.js:
   покупка кладёт предмет в запасы через BAG, валюта — S.wallet.
   Регистрирует: CRAFT_SEGS.shop; листы OV.lvbuy (товар: подробности и подтверждение цены), OV.lvref (обновление за Энериум),
   OV.lvinfo (как устроена лавка); действия ACT.buy и ACT.buydo — прежние имена лавки, их зовут автопроверки прототипа, — ACT.lvref,
   ACT.lvrefdo, ACT.lvinfo; раздел UI-кита «Лавка» (KIT_EXTRA); сценарий презентации. Своё состояние — S.lv, товары — S.shop
   ([предмет, количество, валюта, цена в Энериуме]), купленные места витрины — S.sold: прежние имена, их читают проверки.
   Правила §14.2: десять товаров — восемь за золото, два за Энериум; новые товары раз в 8 часов; раньше — «Обновить»: бесплатно
   несколько раз в день, дальше за Энериум с лимитом. Лавка продаёт ресурсы биомов и редкие, изредка уникальные — по одному. Руны
   пределов не продаёт (ADR-0014). Пул — предметы циклов не выше текущего: пополняется при переходе цикла. Каждый товар — один раз.
   Сервер решает: набор витрины — LV_SRV.roll на сиде витрины (заглушка серверного), покупка и обновление — операции с номером,
   повтор номера ничего не списывает и не выдаёт. Цена за золото — минимальная цена рынка × количество (drops.market), за Энериум —
   LV_DATA.enerium, заглушка.
   Вид — «Правила воздуха»: карточка — значок, имя, цена; подробности и подтверждение цены — в листе товара; остаток кошелька после
   покупки и срок обновления — на виду. Движение — transform и opacity. Числа — LV_DATA. Автопроверка — tools/content-gen/screens/check_shop.js. */
'use strict';

/* ================== данные: демонстрация, не баланс ================== */
const LV_DATA = {
  /* места витрины: сколько, валюта, пул — [ярус, вес, количество в товаре]. §14.2 — десять товаров, часть за золото, часть за Энериум */
  slots: [
    { n: 8, cur: 'gold', pool: [['basic', 60, 20], ['key', 26, 2], ['craftres', 14, 3]] },
    { n: 2, cur: 'enerium', pool: [['find', 90, 1], ['unique', 10, 1]] },
  ],
  uniqueMax: 1,                                                     // §14.2: уникальный ресурс — редко и по одному
  enerium: { find: [20, 30, 40, 50, 60, 70], unique: [30, 45, 60, 75, 90, 105] },   // цена в Энериуме по циклу предмета — заглушка (прежние 30 и 45)
  autoSec: 8 * 3600,                                                // §14.2: новые товары раз в 8 часов
  refresh: { free: 2, paid: [20, 30, 40, 60, 80] },                 // обновлений в день: бесплатных; дальше — цена каждого по порядку, их число — лимит
  demo: { next: 5 * 3600 + 42 * 60, gen: 48 },                       // демо: до новых товаров; номер витрины — та, где видны все ярусы пула
  view: { step: 60, just: 1200 },                                   // вид: шаг появления карточек после обновления; «куплено» светится, мс
};

/* ================== сервер решает ==================
   В игре это запросы: набор витрины, цены и сделки решает сервер (§36.16). Порядок обращений к генератору — часть формата:
   на место — два броска: ярус по весам среди ярусов, где ещё есть товар, затем предмет яруса. Без повторов, уникальных — не больше
   uniqueMax. Места идут по порядку LV_DATA.slots */
const lvNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
const lvOp = () => 'lv' + S.lv.seq;   // номер следующей операции: его несут кнопки «Купить» и «Обновить»
/* цена товара: за золото — минимальная рынка × количество, за Энериум — из данных витрины */
const shopCost = g => g[2] === 'gold' ? ['gold', mkMin(g[0]) * g[1]] : [g[2], g[3] || 0];
const LV_SRV = {
  seed: (gen, cyc) => EB.seedOf(`лавка|${cyc}|${gen}`),   // заглушка серверного сида витрины
  pool: (tier, cyc) => EN_RECIPES.items.filter(it => !it.team && it.tier === tier && (it.pool || it.cyc <= cyc)),
  roll(gen, cyc) {
    const rng = EB.makeRng(LV_SRV.seed(gen, cyc)), out = [], used = new Set();
    let uniq = 0;
    for (const sl of LV_DATA.slots) for (let k = 0; k < sl.n; k++) {
      const opts = sl.pool.map(([t, w, q]) => ({ t, w, q, list: LV_SRV.pool(t, cyc).filter(it => !used.has(it.id)) }))
        .filter(o => o.list.length && (o.t !== 'unique' || uniq < LV_DATA.uniqueMax));
      if (!opts.length) break;
      let x = rng(opts.reduce((a, o) => a + o.w, 0)), j = 0;
      while (x >= opts[j].w) { x -= opts[j].w; j++; }
      const o = opts[j], it = o.list[rng(o.list.length)];
      used.add(it.id); if (o.t === 'unique') uniq++;
      const price = sl.cur === 'gold' ? 0 : (LV_DATA.enerium[o.t] || [])[Math.max(0, it.cyc - 1)] || 0;
      out.push([it.id, o.q, sl.cur, price]);
    }
    return out;
  },
  /* покупка — одна операция с номером: проверка витрины и кошелька, расход, товар в запасы. Ответ: { res }; { again, res } — повтор
     того же номера, ничего не меняет; { refuse } — отказ без расхода. gen — номер витрины, которую видел игрок */
  buy(op, i, gen) {
    const L = S.lv, V = L.ops;
    if (V[op]) return { again: true, res: V[op] };
    if (gen !== L.gen) return { refuse: 'stale' };
    const g = S.shop[i], it = g && BAG.item(g[0]);
    if (!it) return { refuse: 'none' };
    if (S.sold.includes(i)) return { refuse: 'sold' };
    const [c, p] = shopCost(g);
    if (!(p > 0)) return { refuse: 'none' };
    if ((S.wallet[c] || 0) < p) return { refuse: 'money', c, p };
    S.wallet[c] -= p; BAG.add(g[0], g[1]); S.sold.push(i);
    const res = { op, i, gen, id: g[0], q: g[1], c, p };
    L.seq++; L.buys++; V[op] = res;
    return { res };
  },
  /* обновление по просьбе игрока — одна операция с номером: бесплатное, пока есть, дальше — за Энериум по цене дня, до лимита */
  refresh(op, how) {
    const L = S.lv, V = L.ops, R = LV_DATA.refresh;
    if (V[op]) return { again: true, res: V[op] };
    let cost = 0;
    if (how === 'free') { if (L.free < 1) return { refuse: 'free' }; }
    else {
      if (L.free > 0) return { refuse: 'free-left' };
      if (L.paid >= R.paid.length) return { refuse: 'limit' };
      cost = R.paid[L.paid];
      if (S.wallet.enerium < cost) return { refuse: 'money', c: 'enerium', p: cost };
    }
    if (how === 'free') L.free--; else { S.wallet.enerium -= cost; L.paid++; }
    L.gen++; S.shop = LV_SRV.roll(L.gen, S.acc.cycle); S.sold = [];
    const res = { op, how, cost, gen: L.gen };
    L.seq++; V[op] = res;
    return { res };
  },
  /* новые товары по сроку — решает сервер, без просьбы игрока и без номера операции */
  auto() { const L = S.lv; L.gen++; S.shop = LV_SRV.roll(L.gen, S.acc.cycle); S.sold = []; L.next = LV_DATA.autoSec; return { gen: L.gen }; },
};
const LV_REFUSE = {
  stale: 'Товары уже сменились — откройте товар заново',
  none: 'Такого товара нет',
  sold: 'Этот товар уже куплен',
  free: 'Бесплатные обновления на сегодня закончились',
  'free-left': 'Сначала — бесплатные обновления',
  limit: 'Обновления на сегодня закончились',
};
/* валюта в родительном: «не хватает 300 золота», «20 Энериума» */
const LV_CUR_GEN = { gold: 'золота', enerium: 'Энериума', spirit: 'духа', souls: 'душ' };
const lvCurGen = c => LV_CUR_GEN[c] || (CUR[c] ? CUR[c].n : c);
const lvLackTxt = (c, n) => `Не хватает ${fmt(n)} ${lvCurGen(c)}`;

/* ================== разметка ================== */
/* цена товара: значок валюты и число; не хватает — число цветом нехватки */
const lvPrice = (c, p, lack) => `<span class="lv-pr${lack ? ' lack' : ''}"><img src="${curImg(c)}" alt="${CUR[c] ? CUR[c].n : ''}"><b class="num">${fmt(p)}</b></span>`;
/* карточка товара — значок с количеством и кристаллом редкости, имя, цена. Одно действие — вся карточка: лист товара.
   o.kit — образец для UI-кита: без действия; o.sold, o.lack — состояние образца */
function lvCard(g, i, o = {}) {
  const it = BAG.item(g[0]); if (!it) return '';
  const [c, p] = shopCost(g), sold = o.sold != null ? o.sold : S.sold.includes(i);
  const lack = !sold && (o.lack != null ? o.lack : (S.wallet[c] || 0) < p), nm = trEsc(itName(it)), L = S.lv, now = lvNow(), V = LV_DATA.view;
  const vars = [`--i:${i}`];
  if (!o.kit && L.fresh != null) vars.push(`--df:${i * V.step - (now - L.fresh)}ms`);
  const just = !o.kit && sold && L.just && L.just.i === i && L.just.gen === L.gen && now - L.just.t < V.just;
  if (just) vars.push(`--dj:${L.just.t - now}ms`);
  const price = sold ? `<span class="lv-sold">${ic('check')}Куплено</span>` : lvPrice(c, p, lack);
  const inner = `<span class="lv-ic">${itTeam(it) ? ic('lock') : trIcon(it)}<b class="lv-q num">×${fmt(g[1])}</b><i class="lv-cr" aria-hidden="true"></i></span><span class="lv-nm">${nm}</span>${price}`;
  const cls = `lv-card${sold ? ' sold' : ''}${lack ? ' lack' : ''}${just ? ' just' : ''}`;
  if (o.kit) return `<div class="${cls}" data-r="${it.r}">${inner}</div>`;
  const lbl = `${nm}, ${fmt(g[1])} шт., ${sold ? 'куплено' : `${fmt(p)} ${lvCurGen(c)}`}`;
  return `<button class="${cls}" data-r="${it.r}" data-a="buy" data-v="${i}" aria-label="${lbl}" style="${vars.join(';')}">${inner}</button>`;
}
/* «Обновить»: пока есть бесплатные — бесплатно и сколько осталось; дальше — цена в Энериуме; лимит — кнопка недоступна */
function lvRefBtn(o = {}) {
  const L = S.lv, R = LV_DATA.refresh, free = o.free != null ? o.free : L.free, paid = o.paid != null ? o.paid : L.paid, act = o.kit ? '' : ` data-a="lvref" data-v="${lvOp()}"`;
  if (free > 0) return `<button class="btn sm lv-ref"${act}>${ic('swap')}Обновить<span class="lv-free">бесплатно · ${fmt(free)}</span></button>`;
  if (paid < R.paid.length) return `<button class="btn sm lv-ref"${act}>${ic('swap')}Обновить${costTag('enerium', R.paid[paid])}</button>`;
  return `<button class="btn sm lv-ref" disabled title="Обновления на сегодня закончились">${ic('swap')}Обновить</button>`;
}
/* шапка витрины: срок новых товаров, сколько осталось, как устроена лавка, «Обновить» */
function lvHeadHtml(o = {}) {
  const L = S.lv, n = S.shop.length, left = n - S.sold.length;
  return `<div class="lv-head"><span class="lv-time">${ic('hour')}<span>Новые товары через <b class="num"${o.kit ? '' : ' data-cd="shop"'}>${dur(L.next)}</b></span></span>
    <span class="lv-left">${left ? `осталось ${fmt(left)} из ${fmt(n)}` : 'всё раскуплено'}</span><span class="g-spacer"></span>
    <button class="iconbtn lv-info"${o.kit ? '' : ' data-a="lvinfo"'} aria-label="Как устроена лавка" title="Как устроена лавка">${ic('info')}</button>${lvRefBtn(o)}</div>`;
}
function lvView() {
  return `<section class="scr lv">${lvHeadHtml()}<div class="lv-grid">${S.shop.map((g, i) => lvCard(g, i)).join('')}</div></section>`;
}

/* ================== листы поверх ================== */
/* строка сделки: цена и остаток кошелька после покупки; не хватает — сколько */
function lvDeal(c, p) {
  const have = S.wallet[c] || 0, lack = have < p;
  return `<dl class="lv-deal"><dt>Цена</dt><dd>${costTag(c, p)}</dd><dt>${lack ? 'Не хватает' : 'Останется'}</dt><dd class="${lack ? 'lack' : ''}">${costTag(c, lack ? p - have : have - p)}</dd></dl>`;
}
Object.assign(OV, {
  /* товар: подробности и подтверждение цены — одним листом. Номер операции и номер витрины несёт кнопка «Купить» */
  lvbuy(o) {
    const i = +o.arg, g = S.shop[i], it = g && BAG.item(g[0]);
    if (!it || o.gen !== S.lv.gen) return sheet('Товар', `<p class="reason">Товары уже сменились. Откройте товар на витрине заново.</p>`, '<button class="btn go" data-a="close">Понятно</button>');
    const [c, p] = shopCost(g), sold = S.sold.includes(i), lack = (S.wallet[c] || 0) < p, hide = itTeam(it);
    const T = EN_RECIPES.tiers[it.tier] || { n: '' }, sp = it.spec ? it.spec.split('+').map(x => EN_RECIPES.specs[x] ? EN_RECIPES.specs[x].n.toLowerCase() : '').filter(Boolean).join(' + ') : '';
    const uses = hide ? [] : BAG.knownUses(it.id).filter(Boolean);
    const head = `<div class="lv-sh"><span class="lv-big" data-r="${it.r}">${hide ? ic('lock') : trIcon(it)}<b class="num">×${fmt(g[1])}</b></span>
      <div class="lv-sc">${rar(it.r)}<b class="lv-sn">${trEsc(itName(it))}</b><span class="lv-st">${T.n}${sp ? ' · ' + sp : ''}</span></div>
      <span class="g-spacer"></span><div class="stat lv-stock"><b>${fmt(BAG.qty(it.id))}</b><small>в запасах</small></div></div>`;
    const lore = hide ? '' : foldLore(trEsc(it.lore));
    const use = uses.length ? `<p class="lv-use"><span class="eyebrow">Нужен в рецептах</span>${uses.map(r => trEsc(r.n)).join(', ')}</p>` : '';
    const deal = sold ? `<p class="reason">Куплено. Новые товары — через ${dur(S.lv.next)}.</p>` : lvDeal(c, p);
    const note = TM(`Операция ${trEsc(String(o.v || '').split(':')[1] || '')}, витрина ${S.lv.gen}: сервер проверит витрину и кошелёк, спишет цену и положит товар в запасы. Повтор номера ничего не делает. Цена ${c === 'gold' ? 'за золото — минимальная рынка × количество' : 'в Энериуме — LV_DATA.enerium, заглушка'}.`, 'p', 'reason');
    const foot = sold ? '<button class="btn go" data-a="close">Закрыть</button>'
      : `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="buydo" data-v="${trEsc(o.v || '')}"${lack ? ' disabled' : ''}>Купить${costTag(c, p)}</button>`;
    return sheet('Товар', `${head}${lore}${use}${deal}${note}`, foot);
  },
  /* обновление за Энериум: цена дня, остаток, сколько ещё можно сегодня */
  lvref(o) {
    const L = S.lv, R = LV_DATA.refresh, cost = R.paid[L.paid];
    if (cost == null) return dialog('Обновить товары', `<p class="reason">${LV_REFUSE.limit}. Новые товары придут через ${dur(L.next)}.</p>`, '<button class="btn go" data-a="close">Понятно</button>');
    const lack = S.wallet.enerium < cost, more = R.paid.length - L.paid - 1;
    const body = `<p class="muted" style="font-size:15px">Все товары сменятся — некупленные уйдут.</p>${lvDeal('enerium', cost)}
      <p class="reason">${more ? `После этого сегодня за Энериум — ещё ${fmt(more)} ${plural(more, 'раз', 'раза', 'раз')}.` : 'Это последнее обновление на сегодня.'}</p>`;
    return dialog('Обновить товары', body, `<button class="btn ghost" data-a="close">Отмена</button><button class="btn go" data-a="lvrefdo" data-v="${trEsc(o.op || '')}"${lack ? ' disabled' : ''}>Обновить${costTag('enerium', cost)}</button>`);
  },
  /* как устроена лавка: правила §14.2 словами игрока; служебное — команде */
  lvinfo() {
    const R = LV_DATA.refresh, n = LV_DATA.slots.reduce((a, s) => a + s.n, 0), by = c => LV_DATA.slots.filter(s => s.cur === c).reduce((a, s) => a + s.n, 0);
    const li = [
      `${fmt(n)} товаров: ${fmt(by('gold'))} за золото, ${fmt(by('enerium'))} за Энериум. Каждый продаётся один раз, покупка сразу в запасах.`,
      `Новые товары приходят раз в ${fmt(Math.floor(LV_DATA.autoSec / 3600))} часов. Раньше — «Обновить»: ${fmt(R.free)} ${plural(R.free, 'раз', 'раза', 'раз')} в день бесплатно, дальше за Энериум — до ${fmt(R.paid.length)} ${plural(R.paid.length, 'раза', 'раз', 'раз')}, каждое дороже.`,
      'Базовые ресурсы, ключи ремёсел и ресурсы руин — за золото, по самой низкой цене рынка. Находки и уникальные ресурсы боссов — за Энериум; уникальный бывает редко и по одному.',
      'С новым циклом в лавке появляются его ресурсы.',
    ];
    const team = TM(`Пул и веса — LV_DATA.slots, витрина — LV_SRV.roll на сиде витрины (заглушка серверного). Руны пределов лавка не продаёт (ADR-0014). Цены в Энериуме — заглушка. Артефакты «+2 товара в пуле лавки» и «+1 бесплатное обновление» — показ, в прототипе не прибавляются (§2.8).`, 'p', 'reason');
    return sheet('Лавка', `<ul class="lv-rules">${li.map(x => `<li>${x}</li>`).join('')}</ul>${team}`);
  },
});

/* ================== действия ================== */
Object.assign(ACT, {
  /* товар на витрине → лист товара; номер операции и витрины — в кнопке «Купить» */
  buy(v) {
    const i = +v, g = S.shop[i]; if (!g || !BAG.item(g[0])) return;
    S.overlay = { t: 'lvbuy', arg: String(i), act: 'buydo', v: `${i}:${lvOp()}:${S.lv.gen}`, gen: S.lv.gen };
    render(); focusOverlay();
  },
  /* покупка — только операцией с номером: «место:номер:витрина». Повтор номера ничего не меняет */
  buydo(v) {
    const [a, op, b] = String(v || '').split(':'), i = Number(a), gen = Number(b);
    if (!op || !Number.isInteger(i) || !Number.isInteger(gen)) return;
    const x = LV_SRV.buy(op, i, gen);
    if (x.again) return;
    if (x.refuse) return toast(x.refuse === 'money' ? lvLackTxt(x.c, x.p - (S.wallet[x.c] || 0)) : LV_REFUSE[x.refuse] || LV_REFUSE.none);
    S.overlay = null; S.lv.just = { i, gen, t: lvNow() };
    toast(`Куплено: ${itName(BAG.item(x.res.id))} ×${fmt(x.res.q)} — в запасах`);
  },
  /* «Обновить»: бесплатное — сразу; за Энериум — подтверждение цены */
  lvref(v) {
    const L = S.lv, op = v || lvOp();
    if (L.free > 0) {
      const x = LV_SRV.refresh(op, 'free'); if (x.again) return;
      if (x.refuse) return toast(LV_REFUSE[x.refuse]);
      S.lv.fresh = lvNow(); S.overlay = null;
      return toast(`Товары обновлены · бесплатно ещё ${fmt(S.lv.free)}`);
    }
    if (L.paid >= LV_DATA.refresh.paid.length) return toast(LV_REFUSE.limit);
    open('lvref', '', { op });
  },
  lvrefdo(v) {
    const o = S.overlay; if (!o || o.t !== 'lvref') return;
    const x = LV_SRV.refresh(v || o.op, 'paid');
    if (x.again) return;
    if (x.refuse) return toast(x.refuse === 'money' ? lvLackTxt('enerium', x.p - S.wallet.enerium) : LV_REFUSE[x.refuse]);
    S.lv.fresh = lvNow(); S.overlay = null;
    toast('Товары обновлены');
  },
  lvinfo() { open('lvinfo'); },
});

/* ================== UI-кит: раздел «Лавка» ==================
   Анатомия карточки и её состояния, шапка витрины и «Обновить» во всех состояниях; команде — пул витрины и правило броска */
function lvKitHtml() {
  const G = S.shop, gi = G.findIndex(g => g[2] === 'gold'), ei = G.findIndex(g => g[2] === 'enerium');
  const cards = [[gi, {}, 'за золото'], [ei, {}, 'за Энериум'], [gi, { sold: true }, 'куплено'], [ei, { lack: true }, 'не хватает']]
    .filter(([i]) => i >= 0).map(([i, o, t]) => `<figure class="lv-kf">${lvCard(G[i], i, Object.assign({ kit: true }, o))}<figcaption>${t}</figcaption></figure>`).join('');
  const R = LV_DATA.refresh, refs = [[{ free: R.free }, 'бесплатно'], [{ free: 0, paid: 0 }, 'за Энериум'], [{ free: 0, paid: R.paid.length }, 'лимит дня']]
    .map(([o, t]) => `<figure class="lv-kf">${lvRefBtn(Object.assign({ kit: true }, o))}<figcaption>${t}</figcaption></figure>`).join('');
  const cyc = S.acc.cycle, rows = LV_DATA.slots.map(sl => sl.pool.map(([t, w, q]) => {
    const n = LV_SRV.pool(t, cyc).length, tn = (EN_RECIPES.tiers[t] || { n: t }).n;
    const price = sl.cur === 'gold' ? 'мин. рынка × кол-во' : (LV_DATA.enerium[t] || []).join(' / ');
    return `<tr><td>${tn}</td><td class="n">${w}</td><td class="n">${q}</td><td>${sl.cur === 'gold' ? 'золото' : 'Энериум'}</td><td class="n">${n}</td><td>${price}</td></tr>`;
  }).join('')).join('');
  const team = TM(`<div class="p-table-wrap"><table class="p-table"><tr><th>Ярус</th><th>Вес</th><th>В товаре</th><th>Валюта</th><th>В пуле · цикл ${ROMAN[cyc]}</th><th>Цена</th></tr>${rows}</table></div>
    <p class="k-note">Витрина — <code>LV_SRV.roll</code> на сиде витрины: на место два броска — ярус по весам, затем предмет яруса; без повторов, уникальных не больше ${LV_DATA.uniqueMax}. Покупка и обновление — операции с номером, повтор номера ничего не меняет. Числа — <code>LV_DATA</code> в <code>screens/shop.js</code>.</p>`, 'div');
  return `<section class="k-box lv-kbox" style="grid-column:1/-1"><h3>Лавка · витрина из десяти товаров</h3>
    <p class="k-note">Одна мысль — что купить. Карточка: значок с количеством и кристаллом редкости, имя, цена. Подробности и подтверждение цены — лист товара: загадка, где нужен, цена и что останется в кошельке. Над витриной — срок новых товаров, сколько осталось и «Обновить». Купленное гаснет с отметкой, после обновления карточки выходят по одной.</p>
    <div class="lv-kit"><div class="lv-kr">${cards}</div><div class="lv-kr">${refs}</div></div>${team}</section>`;
}
KIT_EXTRA.push({ html: lvKitHtml });

/* ================== регистрация, состояние, срок ================== */
CRAFT_SEGS.shop = lvView;
/* S.lv: gen — номер витрины; next — секунд до новых товаров; free и paid — обновления дня; ops и seq — операции с номером;
   buys — куплено всего; fresh — когда обновили (карточки выходят по одной); just — что куплено только что */
function lvState(s) {
  s.lv = { gen: LV_DATA.demo.gen, next: LV_DATA.demo.next, free: LV_DATA.refresh.free, paid: 0, ops: {}, seq: 1, buys: 0, fresh: null, just: null };
  s.shop = LV_SRV.roll(s.lv.gen, s.acc.cycle); s.sold = [];
  return s;
}
const lvInitBase = initialState;
initialState = function () { return lvState(lvInitBase()); };
lvState(S);
/* срок новых товаров идёт каждую секунду: на экране меняется только число; кончился — сервер кладёт новые товары */
setInterval(() => {
  const L = S.lv; if (!L) return;
  if (L.next > 0) L.next--;
  if (L.next <= 0) { LV_SRV.auto(); L.fresh = lvNow(); if (S.route === 'craft' && S.seg.craft === 'shop' && !S.overlay) render(); return; }
  document.querySelectorAll('[data-cd="shop"]').forEach(e => { e.textContent = dur(L.next); });
}, 1000);

/* ================== сценарий презентации ================== */
FLOWS.push(['Лавка · покупка', 'Витрина из десяти товаров: карточка — значок, имя, цена. Лист товара — подробности, цена и что останется в кошельке', () => {
  S.route = 'craft'; S.seg.craft = 'shop'; S.overlay = null;
  const i = S.shop.findIndex(g => g[2] === 'enerium');
  ACT.buy(String(i >= 0 ? i : 0));
}]);
