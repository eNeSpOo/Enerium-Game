'use strict';
/* ================== значки предметов: снаряжение, семейства талисманов, осколок героя ==================
   Арт 29.09.2026 по слову автора, ждёт его взгляда. Задания — tools/art-gen/jobs/equipment.json, talisman-families.json,
   hero-shard.json; выгрузка — tools/art-gen/export_ui.py (ui-art.json) в assets/art/equip, talismans, shards.
   - снаряжение — один значок на слот: head, chest, hands, legs, feet, main, off, ring, amulet. Редкость рисует интерфейс рамкой
     и цветом --r1…--r7, сам предмет нейтральный;
   - талисманы — один значок на семейство: fight, hunt, farm, seal (EN_TALISMANS.rules.cats);
   - осколок героя — призрачный кусок зеркала: внутрь маской кладётся лицо собираемого героя, яркость — доля собранного.
   ready — выгруженные пути. Нет пути — функции отдают '', и вызывающий рисует свою заглушку: битых картинок нет.
   Адреса маски и лица — полные: url() в стилях экранов браузер разрешает от их файла, а не от index.html */
const ART_ICONS = {
  ready: ['equip/head.png', 'equip/chest.png', 'equip/hands.png', 'equip/legs.png', 'equip/feet.png', 'equip/main.png',
    'equip/off.png', 'equip/ring.png', 'equip/amulet.png', 'talismans/fight.png', 'talismans/hunt.png', 'talismans/farm.png',
    'talismans/seal.png', 'shards/ghost-frame.png', 'shards/ghost-mask.png'],   // выгрузка 29.09.2026
  equip: slot => 'equip/' + slot + '.png',
  tal: fam => 'talismans/' + fam + '.png',
  frame: 'shards/ghost-frame.png',
  mask: 'shards/ghost-mask.png',
  ghostMin: 12,    // лицо в осколке видно хоть чуть-чуть и без осколков, % непрозрачности
};
const artReady = p => ART_ICONS.ready.includes(p);
const artAbs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
const artImg = (p, px, alt, cls) => `<img class="ico ${cls || ''}" src="${AV(p)}" width="${px}" height="${px}" alt="${alt || ''}" loading="lazy" decoding="async">`;

/* значок слота снаряжения; '' — арта нет */
function eqIcon(slot, px = 40, alt = '') { const p = ART_ICONS.equip(slot); return artReady(p) ? artImg(p, px, alt, 'eq-ico') : ''; }
/* значок семейства талисмана; '' — арта нет */
function talIcon(fam, px = 40, alt = '') { const p = ART_ICONS.tal(fam); return artReady(p) ? artImg(p, px, alt, 'tal-ico') : ''; }

/* призрачный осколок героя. h — герой состава (RSI), got и need — осколков собрано и нужно; '' — арта нет.
   Слои снизу вверх: тёмное стекло по маске, лицо героя в том же слое (без цвета, «экран», яркость — доля собранного), рамка */
function shardGhost(h, got, need, px = 64) {
  if (!h || !artReady(ART_ICONS.frame) || !artReady(ART_ICONS.mask)) return '';
  const old = typeof rsOld === 'function' ? rsOld(h) : null;
  const face = old ? old.img : typeof RS_ART !== 'undefined' && RS_ART.has(h.id) ? AV('heroes/' + h.id + '.jpg') : '';
  const share = need > 0 ? Math.min(100, Math.floor(got * 100 / need)) : 0;
  const op = ART_ICONS.ghostMin + Math.floor(share * (100 - ART_ICONS.ghostMin) / 100);   // целые проценты
  const mask = `url('${artAbs(ART_ICONS.mask)}')`;
  const faceHtml = face
    ? `<span class="hsg-face" style="background-image:url('${face}');opacity:${op / 100}"></span>`
    : `<span class="hsg-init" style="opacity:${op / 100}">${typeof rsInit === 'function' ? rsInit(h.n) : ''}</span>`;
  return `<span class="hsg" data-r="${h.r}" style="--px:${px}px" title="${h.n} · осколки ${got} из ${need}" aria-label="${h.n}: осколки ${got} из ${need}">
    <span class="hsg-in" style="-webkit-mask-image:${mask};mask-image:${mask}">${faceHtml}</span>
    <img class="hsg-fr" src="${AV(ART_ICONS.frame)}" alt="" loading="lazy" decoding="async"></span>`;
}
