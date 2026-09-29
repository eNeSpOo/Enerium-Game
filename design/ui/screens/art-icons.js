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
   Адреса маски — полные: url() в стилях экранов браузер разрешает от их файла, а не от index.html */
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
  heal: 75,             // трещины гаснут к полному комплекту на столько %: стекло «заживает». Число вида
};
const artReady = p => ART_ICONS.ready.includes(p);
const artAbs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
const artImg = (p, px, alt, cls) => `<img class="ico ${cls || ''}" src="${AV(p)}" width="${px}" height="${px}" alt="${alt || ''}" loading="lazy" decoding="async">`;
const artEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* значок слота снаряжения; '' — арта нет */
function eqIcon(slot, px = 40, alt = '') { const p = ART_ICONS.equip(slot); return artReady(p) ? artImg(p, px, alt, 'eq-ico') : ''; }
/* значок семейства талисмана; '' — арта нет */
function talIcon(fam, px = 40, alt = '') { const p = ART_ICONS.tal(fam); return artReady(p) ? artImg(p, px, alt, 'tal-ico') : ''; }
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
function shardClsSvg(key) {
  const C = SHARD_CLS[key] || SHARD_CLS[ART_ICONS.clsStub];
  return `<svg viewBox="0 0 80 100" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><path class="b" d="${SHARD_BODY.chest}"/><path class="b" d="${SHARD_BODY[C.head]}"/><path class="f" d="M40 30C34 30 30 36 30 44C30 52 34 58 40 58C46 58 50 52 50 44C50 36 46 30 40 30Z"/>${C.item}</svg>`;
}
/* класс героя → ключ силуэта: значок класса clsPng (index.html) понимает и героев состава, и героев отряда прототипа */
const shardCls = h => (typeof clsPng === 'function' && clsPng((h.cl && h.cl[0]) || h.cls)) || ART_ICONS.clsStub;
/* лицо в стекле: портрет героя отряда прототипа или выгруженный портрет состава; нет — силуэт класса (рисунок или SVG) */
function shardFace(h) {
  const old = typeof rsOld === 'function' ? rsOld(h) : null;
  const pic = old ? old.img : typeof RS_ART !== 'undefined' && RS_ART.has(h.id) ? AV('heroes/' + h.id + '.jpg') : '';
  if (pic) return `<span class="hsg-face" style="background-image:url('${pic}')"></span>`;
  const key = shardCls(h), p = ART_ICONS.cls(key);
  return artReady(p) ? `<span class="hsg-face cls" style="background-image:url('${AV(p)}')"></span>` : `<span class="hsg-face svg">${shardClsSvg(key)}</span>`;
}
/* осколок героя. h — герой состава (RSI), got и need — осколков собрано и нужно, px — сторона квадрата (в клетке запасов — 100 %).
   Слои снизу вверх: тёмное стекло и лицо — по маске стекла; трещины и блик (гаснут по доле); кромка. --s — доля собранного, целые % */
function shardGhost(h, got, need, px = 64) {
  if (!h) return '';
  const share = need > 0 ? Math.min(100, Math.floor(got * 100 / need)) : 0, full = need > 0 && got >= need;
  const cr = 100 - Math.floor(share * ART_ICONS.heal / 100);
  const G = ART_ICONS.glass, art = artReady(G.mask) && artReady(G.rim) && artReady(G.cracks);
  const say = artEsc(`${h.n}: осколки ${got} из ${need}`), head = `data-k="${art ? 'art' : 'svg'}"${full ? ' data-full="1"' : ''} style="--px:${px}px;--s:${share};--cr:${cr}" title="${say}" aria-label="${say}"`;
  if (!art) return `<span class="hsg" ${head}><span class="hsg-in">${shardFace(h)}</span>${SHARD_SVG}</span>`;
  const mask = `url('${artAbs(G.mask)}')`;
  return `<span class="hsg" ${head}><span class="hsg-in" style="-webkit-mask-image:${mask};mask-image:${mask}">${shardFace(h)}</span><img class="hsg-cr" src="${AV(G.cracks)}" alt="" loading="lazy" decoding="async"><img class="hsg-rim" src="${AV(G.rim)}" alt="" loading="lazy" decoding="async"></span>`;
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
