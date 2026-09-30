/* screens/shell.js — оболочка игры: кованые кромки шапки и шахты, узел на их стыке, гнёзда картинок разделов, кованый кошелёк,
   колокол-медальон, ромб выбранной вкладки. Слово автора 30.09.2026: «…добавь декоративные элементы в интерфейс общий».
   Материал — общий с Убежищем и разговором: кованое железо, старое золото, свет карста снизу (jobs/shelter.json, jobs/talk.json).
   Только вид: разметку оболочки рисует index.html (topBar, rail, navItem, avaHtml, bellHtml) — здесь её не трогают; стили —
   screens/shell.css кладут украшения фоном и псевдоэлементами, размеры и шаг шахты прежние (их считает check_shell.js).
   Регистрирует: адреса арта и числа вида — в переменные <html> (--shl-*), флаги «арт загружен» — shla-* (не классы элементов);
   раздел UI-кита «Оболочка: кованые кромки».
   Арт — tools/art-gen/jobs/shelter.json (кромка, узел, гнездо, ромб, железо) → shelf_layers.py strip / tile, shelter_layers.py rot,
   craft_layers.py sheet → выгрузка export_ui.py в assets/art/shell/; медальон колокола — разговора (talk/medallion.png).
   Пока пути нет в SHL_ART.ready — украшение рисует CSS или его нет; битых картинок нет.
   Автопроверка — tools/content-gen/screens/check_shelter.js (раздел «Оболочка»). */
'use strict';

/* ================== арт и числа вида ==================
   frame — гнездо картинки раздела: px — сторона выгрузки, win — окно гнезда от и до, px выгрузки: гнездо обнимает картинку раздела */
const SHL_ART = {
  ready: ['shell/edge.png', 'shell/edge-v.png', 'shell/knot.png', 'shell/frame.png', 'shell/diamond.png', 'shell/iron.jpg', 'talk/medallion.png'],   // выгрузка 30.09.2026
  img: { edge: 'shell/edge.png', edgeV: 'shell/edge-v.png', knot: 'shell/knot.png', frame: 'shell/frame.png', diamond: 'shell/diamond.png', iron: 'shell/iron.jpg',
    medal: 'talk/medallion.png' },
  frame: { px: 128, win: [17, 111] },
};
/* числа вида, px: пары — [932 × 430, 844 × 390] */
const SHL_VIEW = {
  edge: [9, 8],       // кованая кромка шапки и шахты — толщина
  knot: [26, 24],     // узел на стыке шапки и шахты
  iron: 240,          // шаг плитки кованого железа
  pic: 40,            // картинка раздела в шахте — сторона (как .g-nav .pic в index.html)
};
const shlArt = p => SHL_ART.ready.includes(p);
/* гнездо обнимает картинку раздела: сторона гнезда — картинка × сторона рисунка / ширина окна */
const shlFrameSide = () => { const F = SHL_ART.frame; return Math.round(SHL_VIEW.pic * F.px / (F.win[1] - F.win[0])); };

(function shlRootVars() {
  const R = document.documentElement, st = R && R.style, abs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
  if (!st) return;
  const I = SHL_ART.img;
  const set = (k, p, flag) => { if (!shlArt(p)) return false; try { st.setProperty(k, `url("${abs(p)}")`); } catch (_) { } if (flag && R.classList) R.classList.add(flag); return true; };
  if (shlArt(I.edge) && shlArt(I.edgeV)) { set('--shl-edge', I.edge); set('--shl-edge-v', I.edgeV, 'shla-edge'); }
  set('--shl-knot', I.knot, 'shla-knot'); set('--shl-frame', I.frame, 'shla-frame'); set('--shl-diamond', I.diamond, 'shla-dia');
  set('--shl-iron', I.iron, 'shla-iron'); set('--shl-medal', I.medal, 'shla-medal');
  try {
    const V = SHL_VIEW, px = (k, pair) => { st.setProperty(`--shl-${k}0`, pair[0] + 'px'); st.setProperty(`--shl-${k}1`, pair[1] + 'px'); };
    px('edge', V.edge); px('knot', V.knot);
    st.setProperty('--shl-iron-s', V.iron + 'px'); st.setProperty('--shl-fs', shlFrameSide() + 'px');
  } catch (_) { }
})();

/* ================== UI-кит: «Оболочка: кованые кромки» ==================
   Живая оболочка — раздел «Оболочка и навигация» (index.html) — уже в новом материале; здесь — вещи по отдельности и правила */
function shlKitHtml() {
  const I = SHL_ART.img, pic = p => shlArt(p) ? `<img src="${AV(p)}" alt="">` : '<i class="shl-kit-none"></i>';
  const cell = (p, cap, cls = '') => `<figure class="shl-kit-f${cls}">${pic(p)}<figcaption>${cap}</figcaption></figure>`;
  return `<section class="k-box" style="grid-column:1/-1" id="kitShellDecor"><h3>Оболочка: кованые кромки</h3>
    <p class="k-note">Шапка, шахта разделов, кошелёк и колокол — из одного материала с Убежищем и разговором: кованое железо, старое золото, свет карста снизу. Украшения лежат по краям: кромка под шапкой и вдоль шахты, узел на их стыке, гнёзда картинок разделов, ромбы на концах кошелька, колокол в медальоне, ромб у выбранной вкладки. Размеры, шаг шахты и зоны нажатия — прежние: экраны читаются, как раньше.</p>
    <div class="shl-kit-row">
      ${cell(I.edge, 'Кромка шапки — повтор по ширине', ' wide')}${cell(I.knot, 'Узел на стыке шапки и шахты')}${cell(I.frame, 'Гнездо картинки раздела')}
      ${cell(I.medal, 'Колокол — медальон')}${cell(I.diamond, 'Ромб: концы кошелька, выбранная вкладка')}
    </div>
    ${TM(`<p class="k-note">Арт — tools/art-gen/jobs/shelter.json: кромка — полоса без шва (shelf_layers.py strip), для шахты — повёрнута (shelter_layers.py rot), узел, гнездо и ромб — лист 3 × 3 (craft_layers.py sheet), железо — плитка (shelf_layers.py tile); медальон — разговора. Пути — SHL_ART.ready, числа — SHL_VIEW → переменные &lt;html&gt; --shl-*: кромка ${SHL_VIEW.edge.join(' / ')} px, узел ${SHL_VIEW.knot.join(' / ')} px, гнездо ${shlFrameSide()} px вокруг картинки ${SHL_VIEW.pic} px. Стили — screens/shell.css: только фоны, тени и псевдоэлементы, размеров оболочки не меняют (проверка — check_shelter.js, раздел «Оболочка»).</p>`, 'div')}
  </section>`;
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: shlKitHtml });
