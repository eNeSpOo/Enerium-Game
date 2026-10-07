'use strict';
/* ================== значки предметов: снаряжение, семейства талисманов, осколок героя ==================
   Арт 29.09.2026 по слову автора, ждёт его взгляда. Задания — tools/art-gen/jobs/equipment.json, talisman-families.json,
   souls-altar.json; выгрузка — tools/art-gen/export_ui.py (ui-art.json) в assets/art/equip, talismans, shards.
   - снаряжение — один значок на слот: head, chest, hands, legs, feet, main, off, ring, amulet. Редкость рисует интерфейс рамкой
     и цветом --r1…--r7, сам предмет нейтральный;
   - талисманы — один значок на семейство: fight, hunt, farm, seal (EN_TALISMANS.rules.cats);
   - осколок героя — по образцу автора 29.09.2026: кусок стекла на чёрном, кромка — бирюзовое стекло со сколами, внутри ясно виден
     призрачный портрет героя по грудь холодным монохромом, поверх — трещины и блик. Герой в осколке узнаётся, а не угадывается:
     лицо видно всегда. Доля собранного — не яркость лица: свет кромки растёт, трещины гаснут — стекло «заживает»; полный комплект —
     кромка горит и дышит. Нет портрета — в стекле силуэт класса героя, а не инициалы.
   ready — выгруженные пути, want — заказанные к выгрузке. Нет пути в ready — осколок рисует SVG (тот же силуэт стекла, кромка,
   трещины и силуэт класса): битых картинок нет. Значки снаряжения и талисманов без пути отдают '', вызывающий рисует свою заглушку.
   Лицо в стекле обрезает clip-path по обводу маски (SHARD_PTS), а не mask-image картинкой: маску-картинку браузер грузит по правилам
   CORS, у страницы с диска (file://) она не грузится, и незагруженная маска прячет лицо целиком — так в стекле пропадали лица (30.09.2026) */
const ART_ICONS = {
  ready: ['equip/head.png', 'equip/chest.png', 'equip/hands.png', 'equip/legs.png', 'equip/feet.png', 'equip/main.png',
    'equip/off.png', 'equip/ring.png', 'equip/amulet.png', 'talismans/fight.png', 'talismans/hunt.png', 'talismans/farm.png',
    'talismans/seal.png', 'shards/glass-mask.png', 'shards/glass-rim.png', 'shards/glass-cracks.png', 'shards/cls-tank.jpg',
    'shards/cls-healer.jpg', 'shards/cls-mage.jpg', 'shards/cls-str.jpg', 'shards/cls-agi.jpg', 'shards/cls-control.jpg',
    'shards/cls-farmer.jpg', 'workers/worker.png'],   // выгрузка 29.09.2026
  /* заказано к выгрузке: после export_ui.py путь переходит в ready. Всё заказанное 29.09.2026 выгружено */
  want: [],
  equip: slot => 'equip/' + slot + '.png',
  tal: fam => 'talismans/' + fam + '.png',
  /* рабочий артели — одна фигура на всех (jobs/pass.json): редкость рисует интерфейс рамкой и кристаллом */
  worker: 'workers/worker.png',
  /* стекло осколка — одна картинка тремя слоями (tools/art-gen/shard_layers.py), совпадают пиксель в пиксель: где лежит лицо,
     кромка со сколами, трещины и блик поверх лица */
  glass: { mask: 'shards/glass-mask.png', rim: 'shards/glass-rim.png', cracks: 'shards/glass-cracks.png' },
  /* лицо героя без портрета — силуэт его класса; ключ — значок класса (clsPng, index.html): cls-tank, cls-healer… */
  cls: key => 'shards/' + key + '.jpg',
  clsStub: 'cls-str',   // класс не узнан — силуэт бойца
  /* кадр силуэта класса в окне книги и на странице портрета (hcFace, screens/heroes.js): box — где на рисунке вся фигура с оружием
     и знаком класса (лук, цепи, кирка, чаша, посох, меч, щит) — [слева, сверху, справа, снизу], тысячные доли рисунка; ratio — ширина
     рисунка к высоте, ‰ (выгрузка 464 × 576). Окно вписывает этот кадр целиком, не рисунок: фигура не обрезается ни в высоком окне
     обложки, ни на широкой странице (замечание автора 30.09.2026: «заглушка Лучницы… обрезана»). Числа вида */
  clsFit: {
    ratio: 806,
    box: { 'cls-agi': [190, 31, 832, 972], 'cls-control': [47, 87, 948, 1000], 'cls-farmer': [82, 146, 905, 1000], 'cls-healer': [78, 83, 884, 1000],
      'cls-mage': [125, 69, 940, 1000], 'cls-str': [26, 52, 948, 1000], 'cls-tank': [9, 104, 1000, 1000] },
  },
  heal: 75,             // трещины гаснут к полному комплекту на столько %: стекло «заживает». Число вида
};
const artReady = p => ART_ICONS.ready.includes(p);
const artAbs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
const artImg = (p, px, alt, cls) => `<img class="ico ${cls || ''}" src="${AV(p)}" width="${px}" height="${px}" alt="${alt || ''}" loading="lazy" decoding="async">`;
const artEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ================== иконки сеткой: способности, линейки талисманов, снаряжение по редкости ==================
   Слово автора 30.09.2026: «Мне нравятся стиль и сами иконки делай всю библиотеку всех скилов, а после тогда в таком же стиле сделай
   сетку для духовных талисманов, снаряжений». Листы — tools/art-gen/jobs/spell-icons-*.json, talisman-icons.json, equip-icons.json;
   нарезка — grid_slice.py; опись выгрузки — tools/art-gen/ui-icons.json (собирает ui_icons.py), 256 px WebP в assets/art/spells, tal, gear.
   Живопись в край клетки: рамку даёт интерфейс. grid — какие наборы выгружены целиком: у каждой способности библиотеки, линейки
   талисмана и шаблона снаряжения есть файл (ui_icons.py и check_icons.js). Набора нет в grid — помощники отдают прежнее.
   - способность — по id библиотеки: «Огонь.dmg.all» → spells/fire-dmg-all.webp; нет id (враги прежнего набора) — '';
   - талисман — по ключу линейки EN_TALISMANS.fams. Окна, которые знают только семейство и имя (запасы, перековка), получают иконку
     линейки по имени в alt; без имени — прежний значок семейства;
   - снаряжение — по слоту и редкости; редкость не передана — иконка обычной, самой простой вещи слота. Мельче 24 px живопись не
     читается: там вызывающий оставляет контур слота или вектор (eqPic, screens/equipment.js) */
Object.assign(ART_ICONS, {
  grid: { spells: true, tal: true, gear: true, res: true },   // выгрузка 30.09.2026
  slug: { 'Огонь': 'fire', 'Земля': 'earth', 'Воздух': 'air', 'Тьма': 'dark', 'Вода': 'water', 'Свет': 'light', 'Время': 'time',
    'Без школы': 'none', 'фарм': 'farm', 'Сочетания': 'combo', 'враг': 'foe' },   // набор → латиница имени файла; то же в tools/art-gen/ui_icons.py; «Сочетания» — ADR-0050, «враг» — черты врагов, ADR-0051
  spell: id => { const s = String(id || '').split('.'), k = ART_ICONS.slug[s[0]]; return k && s.length > 1 ? 'spells/' + k + '-' + s.slice(1).join('-') + '.webp' : ''; },
  spellHidden: 'spells/ability-hidden.webp',      // «способность скрыта» — неизвестная душа: закрытая книга в тумане
  talLine: key => 'tal/' + key + '.webp',
  talHidden: 'tal/hidden.webp',                   // линейка скрыта (спойлер): амулет в тумане
  gear: (slot, r) => 'gear/' + slot + '-' + r + '.webp',
});
/* ================== иконки ресурсов сеткой ==================
   Слово автора: «Иконки по ресурсам начинай генерировать только тогда, когда придёт с отчётом Этрион». Иконка есть у каждого предмета
   recipes.js, кроме предметов с готовой картинкой (it.img — она главнее) и героев (fam hero — у них портреты): res/<id>.webp.
   Листы — tools/art-gen/jobs/res-icons-*.json, собирает res_jobs.py из поля art Этриона. Рамка — одна на все предметы (art-icons.css,
   «Рамка предмета»; слово автора 30.09.2026), вид ею не различается, редкость — свет кромки и окна; иконка ложится ровно в окно рамки.
   «Ресурс скрыт» — закрытый предмет (спойлер цикла VI) вместо замка */
Object.assign(ART_ICONS, { res: id => 'res/' + id + '.webp', resHidden: 'res/hidden.webp' });
const resDrawn = it => !!it && !!it.id && !it.img && it.fam !== 'hero';
/* иконка предмета; '' — у предмета своя картинка, он герой или выгрузки нет: вызывающий (trIcon, index.html) рисует прежнее */
function resArt(it, px = 48, alt = '') { return ART_ICONS.grid.res && resDrawn(it) ? artImg(ART_ICONS.res(it.id), px, alt, 'res-art') : ''; }
/* закрытый предмет: вместо замка — свёрток в тумане */
function resHideIco(px = 48, alt = '') { return ART_ICONS.grid.res ? artImg(ART_ICONS.resHidden, px, alt, 'res-art hid') : ic('lock'); }

/* иконка способности по записи библиотеки или ядра (у записи есть id); '' — иконки нет */
function abArt(ab, px = 32, alt = '', cls = '') {
  const p = ART_ICONS.grid.spells && ab && ab.id ? ART_ICONS.spell(ab.id) : '';
  return p ? artImg(p, px, alt, ('ab-art ' + cls).trim()) : '';
}
/* значок способности для строки и плитки: иконка сеткой, иначе прежний вектор (abIcon, index.html) */
function abIco(ab, px = 32, alt = '') { return abArt(ab, px, alt) || ic(ab && typeof abIcon === 'function' ? abIcon(ab) : 'spark'); }
/* «способность скрыта»: неизвестная душа и закрытое доблестью — пока не узнаны */
function abHiddenArt(px = 32, alt = '') { return ART_ICONS.grid.spells ? artImg(ART_ICONS.spellHidden, px, alt, 'ab-art hid') : ic('lock'); }

/* линейка талисмана по имени — для окон, которые передают семейство и имя (tlName) */
let TAL_BY_NAME = null;
function talLineOf(fam, alt) {
  const T = window.EN_TALISMANS; if (!T) return '';
  if (T.fams[fam]) return fam;                                  // передан сам ключ линейки
  if (!alt) return '';
  if (!TAL_BY_NAME) { TAL_BY_NAME = new Map(); for (const k in T.fams) TAL_BY_NAME.set(T.fams[k].n, k); }
  const k = TAL_BY_NAME.get(String(alt));
  return k && (!fam || T.fams[k].cat === fam) ? k : '';
}
/* предмет снаряжения: слот и редкость; первым может прийти шаблон «слот.редкость» или сам предмет { slot, r } */
function eqSlotR(slot, r) {
  if (slot && typeof slot === 'object') return [slot.slot, slot.r];
  const s = String(slot || ''), i = s.indexOf('.');
  return i > 0 ? [s.slice(0, i), +s.slice(i + 1)] : [s, r];
}

/* значок снаряжения: иконка сеткой по слоту и редкости; без выгрузки — прежний значок слота; '' — арта нет.
   r — редкость 1…7; не передана — обычная */
function eqIcon(slot, px = 40, alt = '', r = 0) {
  const [s, rr] = eqSlotR(slot, r);
  if (ART_ICONS.grid.gear && s) return artImg(ART_ICONS.gear(s, rr >= 1 && rr <= 7 ? rr : 1), px, alt, 'eq-ico eq-grid');
  const p = ART_ICONS.equip(s); return artReady(p) ? artImg(p, px, alt, 'eq-ico') : '';
}
/* значок талисмана: иконка линейки (line — ключ EN_TALISMANS.fams, или fam — сам ключ, или имя линейки в alt);
   линейка не узнана — прежний значок семейства fam; '' — арта нет */
function talIcon(fam, px = 40, alt = '', line = '') {
  const key = line || talLineOf(fam, alt);
  if (ART_ICONS.grid.tal && key) return artImg(ART_ICONS.talLine(key), px, alt, 'tal-ico tal-grid');
  const p = ART_ICONS.tal(fam); return artReady(p) ? artImg(p, px, alt, 'tal-ico') : '';
}
/* фигура рабочего артели: ритуалы, перековка, шарды рабочего в запасах и сундуках; '' — арта нет */
function wkIcon(px = 40, alt = '') { const p = ART_ICONS.worker; return artReady(p) ? artImg(p, px, alt, 'wk-ico') : ''; }

/* ================== осколок героя ================== */
/* стекло без выгрузки: силуэт выгруженного стекла в долях кадра (обвод его маски), кромка, блик и трещины — SVG. Трещины гаснут по --cr */
const SHARD_PTS = '50,5 64,19 78,27 76,48 71,54 74,61 72,80 50,95 29,80 22,30';
const SHARD_SVG = `<svg class="hsg-sv" viewBox="0 0 100 100" aria-hidden="true"><path class="g" d="M29 26 L46 12 L50 15 L32 36 Z"/><path class="c" d="M64 19 L57 32 L60 41 M57 32 L50 36 M22 44 L33 47 L38 55 M71 79 L61 70 L58 60"/><polygon class="r" points="${SHARD_PTS}"/><polygon class="h" points="${SHARD_PTS}"/></svg>`;
/* силуэт класса без выгрузки: бюст тенью, светлый контур и знак класса — щит, чаша, посох, меч, лук, оковы, кирка. Кадр 80 × 100 */
const SHARD_BODY = { hood: 'M40 17C27 17 21 29 21 41C21 53 26 62 32 67L48 67C54 62 59 53 59 41C59 29 53 17 40 17Z', helm: 'M28 22H52L53 57C53 62 48 66 40 66C32 66 27 62 27 57Z',
  chest: 'M7 100C9 82 20 70 40 67C60 70 71 82 73 100Z' };
const SHARD_CLS = {
  'cls-tank': { head: 'helm', item: '<path class="k" d="M31 40H49"/><path class="i" d="M42 62H74V77C74 88 66 95 58 100C50 95 42 88 42 77Z"/>' },
  'cls-healer': { head: 'hood', item: '<path class="i" d="M29 71H51C51 80 46 85 40 85C34 85 29 80 29 71ZM40 85V93M32 95H48"/><circle class="l" cx="40" cy="64" r="3"/>' },
  'cls-mage': { head: 'hood', item: '<path class="k" d="M63 22V100"/><path class="l" d="M63 5L69 14L63 24L57 14Z"/>' },
  'cls-str': { head: 'helm', item: '<path class="k w" d="M14 98L56 14"/><path class="k" d="M20 74L34 82"/>' },
  'cls-agi': { head: 'hood', item: '<path class="k" d="M57 22Q78 60 57 98"/><path class="k t" d="M57 22V98"/>' },
  'cls-control': { head: 'hood', item: '<path class="k" d="M10 70Q20 58 28 70T46 70T64 70"/><circle class="i" cx="12" cy="84" r="5"/><circle class="i" cx="66" cy="84" r="5"/>' },
  'cls-farmer': { head: 'hood', item: '<path class="k w" d="M16 98L58 36"/><path class="k" d="M42 28Q58 30 70 46"/><path class="i" d="M50 78H70V96H50Z"/>' },
};
/* meet — вписать кадр целиком (окно книги: лук и оружие не обрезаются); без него — заполнить кадр (стекло осколка) */
function shardClsSvg(key, meet) {
  const C = SHARD_CLS[key] || SHARD_CLS[ART_ICONS.clsStub];
  return `<svg viewBox="0 0 80 100" preserveAspectRatio="${meet ? 'xMidYMax meet' : 'xMidYMin slice'}" aria-hidden="true"><path class="b" d="${SHARD_BODY.chest}"/><path class="b" d="${SHARD_BODY[C.head]}"/><path class="f" d="M40 30C34 30 30 36 30 44C30 52 34 58 40 58C46 58 50 52 50 44C50 36 46 30 40 30Z"/>${C.item}</svg>`;
}
/* класс героя → ключ силуэта: значок класса clsPng (index.html) понимает и героев состава, и героев отряда прототипа */
const shardCls = h => (typeof clsPng === 'function' && clsPng((h.cl && h.cl[0]) || h.cls)) || ART_ICONS.clsStub;
/* лицо в стекле: портрет героя отряда прототипа или выгруженный портрет состава; нет — силуэт класса (рисунок или SVG). Пока осколков
   не хватает на героя и его нет в коллекции, он неизвестная душа (стадии знакомства, решение автора 30.09.2026): в стекле — силуэт
   класса, даже если портрет выгружен; known — комплект собран или герой пробуждён */
function shardFace(h, known = true) {
  const old = typeof rsOld === 'function' ? rsOld(h) : null;
  const pic = old ? old.img : known && typeof RS_ART !== 'undefined' && RS_ART.has(h.id) ? AV('heroes/' + h.id + '.jpg') : '';
  if (pic) return `<span class="hsg-face" style="background-image:url('${pic}')"></span>`;
  const key = shardCls(h), p = ART_ICONS.cls(key);
  return artReady(p) ? `<span class="hsg-face cls" style="background-image:url('${AV(p)}')"></span>` : `<span class="hsg-face svg">${shardClsSvg(key)}</span>`;
}
/* осколок героя. h — герой состава (RSI), got и need — осколков собрано и нужно, px — сторона квадрата (в клетке запасов — 100 %).
   Слои снизу вверх: тёмное стекло и лицо — по обводу стекла (clip-path, art-icons.css); трещины и блик (гаснут по доле); кромка.
   --s — доля собранного, целые %. Маски-картинки нет: у страницы с диска она не грузится и прячет лицо (см. шапку файла) */
function shardGhost(h, got, need, px = 64) {
  if (!h) return '';
  const share = need > 0 ? Math.min(100, Math.floor(got * 100 / need)) : 0, full = need > 0 && got >= need;
  const cr = 100 - Math.floor(share * ART_ICONS.heal / 100);
  const G = ART_ICONS.glass, art = artReady(G.mask) && artReady(G.rim) && artReady(G.cracks);
  const say = artEsc(`${h.n}: осколки ${got} из ${need}`), head = `data-k="${art ? 'art' : 'svg'}"${full ? ' data-full="1"' : ''} style="--px:${px}px;--s:${share};--cr:${cr}" title="${say}" aria-label="${say}"`;
  const known = full || (typeof rsHas === 'function' && rsHas(h));
  if (!art) return `<span class="hsg" ${head}><span class="hsg-in">${shardFace(h, known)}</span>${SHARD_SVG}</span>`;
  return `<span class="hsg" ${head}><span class="hsg-in">${shardFace(h, known)}</span><img class="hsg-cr" src="${AV(G.cracks)}" alt="" loading="lazy" decoding="async"><img class="hsg-rim" src="${AV(G.rim)}" alt="" loading="lazy" decoding="async"></span>`;
}

/* ================== UI-кит: осколок героя ==================
   Доля собранного на одном герое, размеры от строки списка до окна пробуждения, силуэты классов у героев без портрета; что выгружено */
KIT_EXTRA.push({
  html: () => {
    if (typeof RS === 'undefined' || !RS.heroes.length || !RS.rules) return '';
    const need = RS.rules.stub.shards, has = h => typeof RS_ART !== 'undefined' && RS_ART.has(h.id);
    const face = RS.heroes.find(h => h.src === 'roulette' && has(h)) || RS.heroes[0];
    const fig = (h, n, px, cap) => `<figure>${shardGhost(h, n, need, px)}<figcaption>${cap}</figcaption></figure>`;
    const share = [0, Math.floor(need * 2 / 5), need - 1, need].map(n => fig(face, n, 96, `${n} / ${need}`)).join('');
    const sizes = [30, 44, 64, 104, 150].map(px => fig(face, Math.floor(need / 2), px, px + ' px')).join('');
    const byCls = new Map();
    for (const h of RS.heroes) if (!has(h) && h.src !== 'donat' && !(typeof rsOld === 'function' && rsOld(h)) && !byCls.has(shardCls(h))) byCls.set(shardCls(h), h);
    const cls = [...byCls.values()].map(h => fig(h, 0, 64, h.cl[0])).join('');
    const G = Object.values(ART_ICONS.glass), shards = ART_ICONS.want.concat(ART_ICONS.ready).filter(p => p.startsWith('shards/'));
    const got = [...new Set(shards)].filter(artReady).length;
    return `<section class="k-box" style="grid-column:1/-1"><h3>Осколок героя</h3>
      <div class="k-demo k-row hsg-kit">${share}</div>
      <p class="k-note">${face.n}: доля собранного — не яркостью лица. Лицо видно всегда; свет кромки растёт с долей, трещины гаснут к полному комплекту — стекло «заживает» (<code>ART_ICONS.heal</code>); полный комплект — кромка горит и дышит.</p>
      <div class="k-demo k-row hsg-kit">${sizes}</div>
      <p class="k-note">Одна функция на все места — <code>shardGhost(герой, собрано, нужно, px)</code>: «За души», отряд Эхо, лавка праха, «Запасы → Осколки», лента и итог рулетки. Портрет — по грудь, холодным серо-бирюзовым монохромом, края тают в стекло.</p>
      <div class="k-demo k-row hsg-kit">${cls}</div>
      <p class="k-note">Герой без портрета — силуэт своего класса в стекле, а не инициалы: щит, чаша, посох, меч, лук, оковы, кирка. Стекло — одна картинка тремя слоями (<code>tools/art-gen/shard_layers.py</code>): маска лица, кромка со сколами, трещины и блик — у слоёв одна рамка выгрузки. Выгружено ${got} из ${new Set(shards).size} (<code>ART_ICONS.ready</code>, заказ — <code>ART_ICONS.want</code>); ${G.every(artReady) ? 'стекло — рисунок' : 'пока слоёв нет, стекло, кромку, трещины и силуэты рисует SVG — битых картинок нет'}.</p></section>`;
  },
});
