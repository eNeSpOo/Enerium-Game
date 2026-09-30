'use strict';
/* ================== карты боя: рамка по типу бойца ==================
   Слова автора 30.09.2026: «на боевой арене нужны рамки по типу врага и универсальные карточки для наших героев, но они там не в 9 на 16,
   а прямоугольные, так как игра горизонтальная». Решения исполнителя 30.09.2026, ждут взгляда автора:
   - одиннадцать рамок. Герой — одна на всех. Враг — по рангу карты (GDD §5.7: рядовой, элита, босс биома, рунный, убер, забытый,
     клановый) и по режиму боя: в Эхо и биоме Многоликого босс — «босс Эхо», сам Многоликий — своя рамка; в клане цель — «Голос сонма»
     или «Хозяин стихии», свита — рядовой; на Арене и в Лиге с обеих сторон — рамка героя;
   - лестница опасности: рядовой < элита, Голос < босс биома, босс Эхо, Многоликий < рунный страж < Убер < забытый < Хозяин.
     Чем опаснее враг, тем тяжелее и страшнее рамка: кость, шипы, рога, пламя, трещины карста;
   - у героя вместо ступеней книги — метка: кристалл редкости в гнезде рамки и звёзды доблести по верхней планке;
   - с рамкой портрет — окно рамки, имя — на низу портрета, полоса здоровья и щита — на нижней планке, под ней шансы. Высота карты та же,
     что без рамки: верх рамки и её низ портрет отдаёт, место имени портрет забирает (screens/battle-cards.css).
   Арт — tools/art-gen/jobs/battle-frames.json и правка battle-frames-edit.json; окно и нарезка — tools/art-gen/battle_frame.py; выгрузка —
   export_ui.py (ui-art.json) в assets/art/bframes/<тип>.png. ready — выгруженные рамки: без пути карту рисует CSS, как прежде.
   Геометрия — тысячные доли рисунка, только целые: ar — высота рисунка к ширине; win — окно [сверху, справа, снизу, слева], в него
   встаёт портрет; cut — нарезка border-image: углы и верхняя часть с украшением не тянутся, прямые планки между ними браузер тянет по
   высоте карты — одна картинка годится и для 932 × 430, и для 844 × 390; mark — гнездо метки героя [x, y, поперечник по ширине]. */
const BF = {
  ready: ['bframes/hero.png', 'bframes/o.png', 'bframes/e.png', 'bframes/voice.png', 'bframes/b.png', 'bframes/echo.png', 'bframes/many.png',
    'bframes/rune.png', 'bframes/uber.png', 'bframes/forgotten.png', 'bframes/host.png'],   // выгрузка 30.09.2026
  path: t => 'bframes/' + t + '.png',
  rank: { o: 'o', e: 'e', b: 'b', rune: 'rune', uber: 'uber', forgotten: 'forgotten', clan: 'host' },   // ранг карты ядра → рамка
  echo: { b: 'echo' },                   // Эхо и биом Многоликого: босс ранга b — «босс Эхо»
  echoMain: { m: 'many' },               // главный враг Эхо по типу цели: Многоликий
  clanMain: { e: 'voice', b: 'host' },   // цель клана по типу: Голос сонма и Хозяин стихии; свита — по рангу, рядовой
  /* порядок — лестница опасности; n — имя для игрока в подсказке карты; where — где рамка стоит (UI-кит); kit — портрет для UI-кита */
  types: {
    hero: { n: '', where: 'все герои: свой отряд; на Арене и в Лиге — и соперник', kit: 'heroes/h1.jpg',
      ar: 794, win: [116, 92, 147, 95], cut: [176, 101, 344, 104], mark: [500, 72, 110] },
    o: { n: 'Рядовой', where: 'рядовые биомов и Эхо, свита клана', kit: 'foes/o1.jpg', ar: 712, win: [100, 44, 65, 42], cut: [176, 54, 146, 52] },
    e: { n: 'Элита', where: 'элиты биомов и Эхо, четыре элиты рунного стража', kit: 'foes/e1.jpg', ar: 750, win: [165, 82, 56, 82], cut: [275, 92, 147, 92] },
    voice: { n: 'Голос сонма', where: 'клан: цель-элита', kit: 'clan/fire-elite.jpg', ar: 747, win: [188, 81, 55, 81], cut: [204, 91, 72, 91] },
    b: { n: 'Босс биома', where: 'босс последнего этажа биома', kit: 'foes/b1.jpg', ar: 731, win: [241, 135, 53, 133], cut: [362, 144, 123, 142] },
    echo: { n: 'Босс Эхо', where: 'Эхо и биом Многоликого: боссы лестницы и их защитники-боссы', kit: 'echo/ik-11.jpg', ar: 847, win: [215, 99, 87, 100], cut: [355, 109, 108, 110] },
    many: { n: 'Многоликий', where: 'Эхо: пятнадцатая ступень', kit: 'echo/ik-15.jpg', ar: 731, win: [236, 127, 95, 128], cut: [308, 136, 112, 137] },
    rune: { n: 'Рунный страж', where: 'страж после биома', kit: 'foes/g1.jpg', ar: 781, win: [240, 91, 82, 92], cut: [256, 101, 99, 102] },
    uber: { n: 'Убер-босс', where: 'Эхо: Убер-босс недели', kit: 'echo/ik-14.jpg', ar: 753, win: [270, 130, 95, 130], cut: [404, 139, 121, 139] },
    forgotten: { n: 'Забытый босс', where: 'Эхо: крафтовый босс', kit: 'echo/nm-12.jpg', ar: 750, win: [261, 144, 88, 143], cut: [440, 153, 104, 152] },
    host: { n: 'Хозяин стихии', where: 'клан: клановый босс', kit: 'clan/fire-boss.jpg', ar: 809, win: [341, 107, 65, 107], cut: [357, 117, 81, 117] },
  },
};
const bfEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bfPct = v => `${Math.floor(v / 10)}.${v % 10}%`;   // тысячные доли рисунка → проценты для border-image-slice, только целые
const bfReady = t => !!BF.types[t] && BF.ready.includes(BF.path(t));

/* тип рамки: герой — всегда «hero», на Арене и в Лиге — обе стороны; враг — по рангу карты ядра и режиму боя.
   Главный враг Эхо и клана — первая карта боя с целью (b.echo.main, EB.targetBattle), его тип — b.echo.g */
function bfType(R, u) {
  if (!u.side || (R && R.kind === 'pvp')) return 'hero';
  const E = R && R.b && R.b.echo, main = !!E && E.main === u, kind = R && R.kind;
  if (kind === 'clan') return (main && BF.clanMain[E.g]) || BF.rank[u.rank] || 'o';
  if (kind === 'echo' || kind === 'many') return (main && BF.echoMain[E.g]) || BF.echo[u.rank] || BF.rank[u.rank] || 'o';
  return BF.rank[u.rank] || 'o';
}
/* герой карты: редкость, доблесть и личный максимум — герой аккаунта, герой состава (Эхо) или соперник Арены (id «arena:…») */
function bfHero(u) {
  const id = String(u.id || '').replace(/^arena:/, '');
  const h = (typeof H === 'function' && H(id)) || (typeof RSI !== 'undefined' && RSI[id]) || null;
  if (!h || !h.r) return null;
  const max = Math.max(0, h.maxV | 0), v = Math.min(max, Math.max(0, (u.valor != null ? u.valor : h.valor) | 0));
  return { r: h.r, v, max };
}
/* метка героя: кристалл редкости в гнезде рамки, звёзды доблести — сколько личный максимум, взятые горят */
function bfMark(u) {
  const h = bfHero(u); if (!h) return '';
  const say = `${typeof RAR !== 'undefined' ? RAR[h.r] : ''}${h.max ? ` · доблесть ${h.v} из ${h.max}` : ''}`;
  return `<span class="bf-mk" data-r="${h.r}" title="${bfEsc(say)}"><b></b>${h.max ? `<span class="bf-st">${Array.from({ length: h.max }, (_, i) => `<i class="${i < h.v ? 'on' : ''}"></i>`).join('')}</span>` : ''}</span>`;
}
/* рамка карты боя: класс и переменные карты, рамка в кадре портрета, метка героя и имя ранга для подсказки.
   Рамка не выгружена — null: карта прежняя. R — забег или бой со сценой; без него (UI-кит) тип задаёт opt.t */
function bfCard(R, u, opt) {
  const t = (opt && opt.t) || bfType(R, u);
  if (!bfReady(t)) return null;
  const T = BF.types[t], [wt, wr, wb, wl] = T.win, [ct, cr, cb, cl] = T.cut, m = T.mark || [0, 0, 0];
  return {
    t,
    cls: ' fr',
    data: ` data-bf="${t}"`,
    style: `;--bf-ar:${T.ar};--bf-wt:${wt};--bf-wr:${wr};--bf-wb:${wb};--bf-wl:${wl};--bf-ct:${ct};--bf-cr:${cr};--bf-cb:${cb};--bf-cl:${cl};--bf-mx:${m[0]};--bf-my:${m[1]};--bf-md:${m[2]}`,
    face: `<i class="bf" style="border-image-source:url('${AV(BF.path(t))}');border-image-slice:${bfPct(ct)} ${bfPct(cr)} ${bfPct(cb)} ${bfPct(cl)}" aria-hidden="true"></i>`,
    mark: t === 'hero' && T.mark ? bfMark(u) : '',
    tip: T.n ? ' · ' + T.n : '',
  };
}
/* легенда знаков боя (кнопка «Знаки»): строка о рамке — когда рамки выгружены; образцы — низ и верх лестницы, рядовой и босс биома:
   столбец образцов в легенде — не шире прежних (52 px) */
const bfLegend0 = legendHtml;
legendHtml = mode => {
  const show = ['o', 'b'].filter(bfReady);
  if (!show.length) return bfLegend0(mode);
  return bfLegend0(mode) + `<span class="h">Рамка</span><span class="ex bf-lg">${show.map(t => `<img src="${AV(BF.path(t))}" alt="" loading="lazy" decoding="async">`).join('')}</span><span>Рамка — ранг врага: чем он опаснее, тем тяжелее и страшнее рамка. У героев рамка одна: кристалл в гнезде — редкость, звёзды — доблесть.</span>`;
};

/* ================== UI-кит: карты боя ==================
   Все рамки рядом на одной карте: портрет, имя, полоса здоровья и щита, класс, эффекты, шансы — как в бою; обычная карта на 932 × 430
   и главная на 844 × 390. Рамки нет в ready — карта прежняя, CSS */
function bfKitCard(t, o) {
  const T = BF.types[t], fr = bfCard(null, { side: t === 'hero' ? 0 : 1, id: 'h1', valor: 1 }, { t }) || { cls: '', data: '', style: '', face: '', mark: '', tip: '' };
  const hero = t === 'hero', img = AV(T.kit), el = hero ? 'Земля' : o.el || 'Земля', cls = hero ? 'Танк' : o.cls || 'Физ. ДД силы';
  const good = o.fx ? si('shield', '', 100, 'good', '') : '', bad = o.fx ? si('flame', 2, 60, 'bad', '', 'var(--fire)') : '';
  const chips = `<span class="ch" style="--sc:var(--earth)">${ic('sword')}<b>20</b></span><span class="ch u" style="--sc:var(--gold)">${ic('crown')}<b>5</b></span>`;
  return `<div class="bf-kc" style="--fh:${o.fh}px;--rowh:${o.rowh}px"><div class="bc ${hero ? '' : 'foe'} ${o.lead ? 'lead' : ''}${fr.cls}"${fr.data} data-el="${el}" style="--k:0;--r:0${fr.style}" title="${bfEsc((hero ? 'Герой' : T.n) + ' · ' + cls)}">
    <div class="face"><img src="${img}" alt="" style="object-position:50% ${hero ? 18 : 8}%">${fr.face}<div class="buffs">${good}</div><div class="debuffs">${bad}</div><span class="cls">${CLS(cls, 18, cls)}</span><span class="tgt"></span><span class="ctl"></span></div>
    ${fr.mark}<span class="nm">${hero ? (typeof H === 'function' && H('h1') ? H('h1').name : 'Герой') : T.n}</span>
    ${bar(o.hp, 'hp', `<span class="sh" style="left:0;width:${o.sh}%"></span>`)}
    <div class="rot">${chips}</div></div></div>`;
}
KIT_EXTRA.push({
  html: () => {
    const keys = Object.keys(BF.types), got = keys.filter(bfReady).length;
    const row = (o, list) => `<div class="k-demo bf-kit">${list.map(t => `<figure>${bfKitCard(t, o)}<figcaption><b>${t === 'hero' ? 'Герой' : BF.types[t].n}</b><small>${bfEsc(BF.types[t].where)}</small></figcaption></figure>`).join('')}</div>`;
    const heavy = keys.filter(t => !['hero', 'o', 'e'].includes(t));
    return `<section class="k-box" style="grid-column:1/-1"><h3>Карты боя · рамки по типу бойца · ${keys.length}</h3>
      ${row({ fh: 62, rowh: 100, hp: 72, sh: 16, fx: true }, keys)}
      <p class="k-note">Обычная карта, 932 × 430. Слева направо — лестница опасности: чем опаснее враг, тем тяжелее и страшнее рамка. Герой — одна рамка на всех: в гнезде — кристалл редкости, по верхней планке — звёзды доблести (личный максимум, взятые горят).</p>
      ${row({ fh: 56, rowh: 86, hp: 46, sh: 0, lead: true }, heavy)}
      <p class="k-note">Главная карта на низком экране, 844 × 390: верх рамки не тянется, прямые планки тянутся по высоте карты — одна картинка на оба экрана.</p>
      <p class="k-note">Тип рамки — <code>bfType(забег, карта)</code>: ранг карты ядра (<code>BF.rank</code>), в Эхо и биоме Многоликого босс — «Босс Эхо» (<code>BF.echo</code>), Многоликий — по типу цели (<code>BF.echoMain</code>); в клане цель — Голос или Хозяин (<code>BF.clanMain</code>), свита — рядовой; Арена и Лига — герои с обеих сторон. Карта с рамкой: портрет — окно рамки, имя — на низу портрета, полоса здоровья и щита — на нижней планке, под ней шансы; высота карты та же, что без рамки. Арт — <code>tools/art-gen/jobs/battle-frames.json</code>, окно и нарезка border-image — <code>tools/art-gen/battle_frame.py</code>, геометрия — <code>BF.types</code> в <code>screens/battle-cards.js</code>. Выгружено ${got} из ${keys.length} (<code>BF.ready</code>)${got < keys.length ? '; без рамки карту рисует CSS, как прежде' : ''}.</p></section>`;
  },
});
