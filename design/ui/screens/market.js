/* screens/market.js — «Ремесло → Рынок» (GDD §13): торговые ряды подземного города. Вид — зал «Рынок» (screens/crafthall.js):
   лоты лежат на досках рядов под полосатым навесом, у каждого — предмет в рамке своего вида, имя, количество, цена и одно действие.
   «Сервер» рынка — прежний, в index.html: ACT.mkbuy / mkbuydo, mksell / mkselldo, mkcancel, mkcash и помощники mkPick, mkUnit, mkFee,
   mkFree; здесь — только вид (CRAFT_SEGS.market вместо прежнего marketView). Лот забирает предмет из BAG сразу, покупка кладёт в BAG;
   цены — EN_RECIPES.drops.market; в игре цены, лоты и сделки решает сервер (§36.16).
   Для тысячи ресурсов: поиск по имени, вид лота, показ порциями (crPage); в форме лота предметы запасов — группами по виду.
   Своё состояние — S.cr.mk. Автопроверки — tools/content-gen/screens/check_all.js (рынок) и check_crafthall.js. */
'use strict';

/* ================== вид ================== */
const MK_VIEW = { page: 'mk:buy' };   // ключ порций списка лотов
const mkS = () => { const C = crS(); return C.mk || (C.mk = { kind: '' }); };
/* колодец лота: предмет в рамке своего вида; нажатие — сведения о предмете (лист «Сведения» index.html) */
function mkIc(id, q) {
  const it = BAG.item(id); if (!it) return '';
  const nm = trEsc(itName(it));
  return `<button class="well mk-ic" data-r="${it.r}"${crK(it)} data-a="item" data-v="${id}" title="${nm}" aria-label="${nm}${q != null ? ', ' + q + ' шт.' : ''}">${itTeam(it) ? ic('lock') : trIcon(it)}</button>`;
}
/* строка лота — доска ряда: предмет, имя и редкость, сколько, цена лота и за штуку, одно действие */
function mkLotHtml(x) {
  const it = BAG.item(x.id); if (!it) return '';
  const u = mkUnit(x.id, x.pct), lack = (S.wallet.gold || 0) < u * x.q;
  return `<div class="mk-lot" data-r="${it.r}">${mkIc(x.id, x.q)}<span class="mk-nm"><b>${trEsc(itName(it))}</b><span class="row">${rar(it.r)}<small class="faint num">в запасах ${fmt(BAG.qty(x.id))}</small></span></span>`
    + `<span class="mk-q num">×${fmt(x.q)}</span><span class="mk-pr${lack ? ' lack' : ''}">${money('gold', u * x.q)}<small class="faint num">${fmt(u)} за шт.</small></span>`
    + `<button class="btn sm go" data-a="mkbuy" data-v="${x.uid}">Купить</button></div>`;
}
/* свой лот: на рынке — «Снять», продан — выручка и «Забрать» */
function mkMineHtml(x) {
  const it = BAG.item(x.id); if (!it) return '';
  const u = mkUnit(x.id, x.pct), tot = u * x.q, f = mkFee(tot), sold = x.st === 'sold';
  return `<div class="mk-lot mine${sold ? ' sold' : ''}" data-r="${it.r}">${mkIc(x.id, x.q)}<span class="mk-nm"><b>${trEsc(itName(it))}</b><small class="${sold ? 'gold' : 'faint'}">${sold ? `продан · выручка ${fmt(tot - f)}` : `на рынке · ${fmt(u)} за шт.`}</small></span>`
    + `<span class="mk-q num">×${fmt(x.q)}</span><span class="mk-pr">${money('gold', tot)}</span>`
    + (sold ? `<button class="btn sm go" data-a="mkcash" data-v="${x.uid}">Забрать</button>` : `<button class="btn sm ghost" data-a="mkcancel" data-v="${x.uid}">Снять</button>`) + '</div>';
}
/* предметы формы лота — группами по виду (ярусу): тысяча ресурсов в одном списке читается по группам */
function mkOptions(list, cur) {
  const by = new Map();
  for (const it of list) { if (!by.has(it.tier)) by.set(it.tier, []); by.get(it.tier).push(it); }
  const tiers = Object.keys(RX.tiers || {});
  return [...by.entries()].sort((a, b) => tiers.indexOf(a[0]) - tiers.indexOf(b[0]))
    .map(([t, its]) => `<optgroup label="${trEsc((RX.tiers[t] || { n: t }).n)}">${its.map(x => `<option value="${x.id}"${x.id === cur ? ' selected' : ''}>${trEsc(itName(x))} · ${fmt(mkFree(x.id))}</option>`).join('')}</optgroup>`).join('');
}
function mkView() {
  const t = S.seg.market === 'mine' ? 'mine' : 'buy', M = S.market, q = trNorm(M.q.trim()), K = mkS();
  const kinds = [...new Set(M.lots.map(x => (BAG.item(x.id) || {}).tier).filter(Boolean))];
  const kind = kinds.includes(K.kind) ? K.kind : '';
  const opts = kinds.length > 1 ? `<select class="rs-sel mk-kind" data-a="mkkind" aria-label="Вид лота"><option value="">Все виды</option>${kinds.map(k => `<option value="${k}"${k === kind ? ' selected' : ''}>${trEsc((RX.tiers[k] || { n: k }).n)}</option>`).join('')}</select>` : '';
  const head = `<div class="row mk-bar"><div class="tabs" role="tablist"><button role="tab" aria-selected="${t === 'buy'}" data-a="seg" data-v="market:buy">Купить · ${M.lots.length}</button><button role="tab" aria-selected="${t === 'mine'}" data-a="seg" data-v="market:mine">Мои лоты · ${M.mine.length}</button></div>
      ${t === 'buy' ? `<label class="search grow mk-find">${ic('search')}<input id="mkq" type="search" placeholder="Название предмета" value="${trEsc(M.q)}" autocomplete="off" aria-label="Поиск лотов"></label>${opts}` : '<span class="g-spacer"></span>'}<span class="mk-note">Имена продавцов скрыты · комиссия ${mkFeePct()}% с выручки</span></div>`;
  if (t === 'buy') {
    const lots = M.lots.filter(x => { const it = BAG.item(x.id); return it && (!q || trNorm(itName(it)).includes(q)) && (!kind || it.tier === kind); });
    const P = crPage(lots, MK_VIEW.page);
    const rows = P.shown.map(mkLotHtml).join('') + crMoreHtml(MK_VIEW.page, P.rest, 'mk-more');
    return `<section class="scr mk">${head}<div class="mk-stall"><i class="mk-aw" aria-hidden="true"></i><div class="mk-lots scroll grow" data-keep="mk:buy:${trEsc(kind)}">${rows || `<p class="faint mk-empty">${M.lots.length ? 'Ничего не найдено.' : 'Лотов нет.'}</p>`}</div></div></section>`;
  }
  const P = mkPick(), it = P.id ? BAG.item(P.id) : null, total = P.unit * P.n, fee = mkFee(total);
  const form = it ? `<div class="pnl mk-form"><span class="eyebrow">Выставить лот</span>
      <div class="mk-pick">${mkIc(P.id)}<select class="rs-sel" data-a="mkid" aria-label="Предмет из запасов">${mkOptions(P.list, P.id)}</select></div>
      <div class="mk-row"><span class="eyebrow">количество</span><div class="qty" role="group" aria-label="Сколько выставить">${INV.market.qtySteps.map(s => `<button data-a="mkq" data-v="${s}" ${(s < 0 ? P.n <= 1 : P.n >= P.have) ? 'disabled' : ''}>${s > 0 ? '+' + s : '−' + -s}</button>`).join('')}<button data-a="mkq" data-v="max" aria-pressed="${P.n === P.have}">все</button></div><b class="num">${fmt(P.n)}</b></div>
      <div class="mk-row"><span class="eyebrow">цена</span><div class="qty" role="group" aria-label="Цена за штуку">${INV.market.pricePct.map(p => `<button data-a="mkp" data-v="${p}" aria-pressed="${p === P.pct}">${mkPctTxt(p)}</button>`).join('')}</div></div>
      <dl class="mk-sum"><dt>За штуку</dt><dd>${fmt(P.unit)} · мин. ${fmt(mkMin(P.id))}</dd><dt>Лот</dt><dd>${fmt(total)}</dd><dt>Комиссия ${mkFeePct()}%</dt><dd>−${fmt(fee)}</dd><dt>Выручка</dt><dd class="mk-rev">${fmt(total - fee)}</dd></dl>
      <button class="btn go" data-a="mksell">Выставить · ${fmt(P.n)} шт.</button>
      <p class="reason">Предмет уходит из запасов сразу. Снятый лот возвращается в запасы.</p>${P.bound ? `<p class="reason">Ещё ${fmt(P.bound)} шт. куплены в лавке за Энериум — не продаются.</p>` : ''}</div>`
    : '<div class="pnl mk-form"><span class="eyebrow">Выставить лот</span><p class="faint">В запасах нет того, что продают на рынке: базовые, ключи, уникальные, добыча руин и трофеи.</p></div>';
  const mine = M.mine.map(mkMineHtml).join('');
  return `<section class="scr mk">${head}<div class="mk-mine">${form}<div class="mk-stall"><i class="mk-aw" aria-hidden="true"></i><div class="mk-lots scroll grow" data-keep="mk:mine">${mine || '<p class="faint mk-empty">Своих лотов нет.</p>'}</div></div></div></section>`;
}

/* ================== действия ================== */
Object.assign(ACT, {
  /* вид лота: список за ним меняется сразу */
  mkkind(v, t) { mkS().kind = t ? t.value : String(v || ''); render(); },
});

/* ================== регистрация ================== */
CRAFT_SEGS.market = mkView;
