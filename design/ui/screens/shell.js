/* screens/shell.js — оболочка игры: тонкие линии шапки и шахты, ромб на их стыке, рамки кнопок одной нитью, нарисованные значки
   кнопок, портрет Странника — внутри своей ячейки.
   Слова автора 01.10.2026 со снимками оболочки: «Линии общего интерфейся слишком толстые что-ли, то есть они прям зибирают много воздуха,
   рамки тоже толстые, иконка странника вылезает на интерфейс и сами кнопки слабые, в общем». Прежние кованые кромки 9 px, узел 26 px,
   гнёзда-медальоны разделов и колокол в медальоне (30.09.2026) сняты: линия — одна нить старого золота, рамка — одна нить вокруг
   картинки, на стыке — маленький ромб.
   Кнопки — сильнее: значок нарисован (колокол Входящих, «Дар дня», «Пропуск», «Чат», замок закрытого раздела) и читается с 20 px;
   у каждой кнопки свои состояния — обычная, с делами (бейдж и нить ярче), выбранная (нить света духа и свет снизу), закрытая (серая
   нить, замок и уровень открытия).
   Разметку оболочки рисует index.html (topBar, rail, navItem, avaHtml, bellHtml); размеры и толщины там же, числа — SHL_VIEW здесь:
   shlRootVars кладёт их в переменные <html> (--shl-*), index.html и CSS берут только их. Стили — screens/shell.css: фоны, цвета, тени,
   border-image и украшения-псевдоэлементы, вёрстку оболочки они не меняют (check_shelter.js). Медальоны Убежища — screens/shelter.css
   на тех же числах и значках.
   Арт — tools/art-gen/jobs/shell-descent.json (лист значков 3 × 3, craft_layers.py sheet) и jobs/shelter.json (ромб, железо) → выгрузка
   export_ui.py в assets/art/shell/. Пока пути нет в SHL_ART.ready — значок рисует SVG index.html, ромб — CSS; битых картинок нет.
   Флаги «арт загружен» у <html> — shla-* (не классы элементов). Раздел UI-кита — «Оболочка: линии и кнопки».
   Автопроверки — tools/content-gen/screens/check_shell.js (толщины из данных, портрет в ячейке, состояния кнопок) и check_shelter.js. */
'use strict';

/* ================== арт ==================
   ico — нарисованные значки кнопок: имя → путь; descent.js берёт отсюда свои знаки (бестиарий, этажи, босс, страж) */
const SHL_ART = {
  ready: ['shell/diamond.png', 'shell/iron.jpg', 'shell/ico-bell.png', 'shell/ico-gift.png', 'shell/ico-pass.png', 'shell/ico-chat.png',
    'shell/ico-lock.png', 'shell/ico-best.png', 'shell/ico-floors.png', 'shell/ico-boss.png', 'shell/ico-guard.png'],   // ромб и железо — 30.09.2026, значки — 01.10.2026
  img: { diamond: 'shell/diamond.png', iron: 'shell/iron.jpg' },
  ico: { bell: 'shell/ico-bell.png', gift: 'shell/ico-gift.png', pass: 'shell/ico-pass.png', chat: 'shell/ico-chat.png', lock: 'shell/ico-lock.png',
    best: 'shell/ico-best.png', floors: 'shell/ico-floors.png', boss: 'shell/ico-boss.png', guard: 'shell/ico-guard.png' },
  diamond: [35, 45],   // рисунок ромба, px выгрузки: высота ромба на стыке — от его ширины
};
/* ================== числа вида, px: пары — [932 × 430, 844 × 390] ==================
   Толщины линий и рамок — только отсюда (слово автора: «Линии… слишком толстые… рамки тоже толстые»); check_shell.js сверяет каскад
   с этими числами и держит их тонкими */
const SHL_VIEW = {
  line: [1, 1],         // линии оболочки: шов под шапкой, кромка шахты и ячейки портрета — толщина
  frame: [1, 1],        // рамки кнопок: картинка раздела, колокол, медальоны Убежища — толщина нити
  stud: [8, 7],         // ромб старого золота на стыке шапки и шахты — ширина; высота — по рисунку ромба
  ava: [34, 32],        // кольцо портрета Странника — сторона: с уровнем и бейджем оно целиком в своей ячейке
  bell: [34, 32],       // колокол Входящих — сторона
  glyph: [24, 22],      // нарисованный значок в кнопке шапки — сторона
  gap: 3,               // зазор между картинкой раздела и её нитью
  iron: 240,            // шаг плитки кованого железа
  pic: 40,              // картинка раздела в шахте — сторона (как .g-nav .pic в index.html)
};
const shlArt = p => SHL_ART.ready.includes(p);
const shlIco = k => (SHL_ART.ico[k] && shlArt(SHL_ART.ico[k]) ? SHL_ART.ico[k] : '');   // путь значка, если выгружен; иначе ''
const shlStudH = w => Math.round(w * SHL_ART.diamond[1] / SHL_ART.diamond[0]);
const SHL_OWN = ['bell', 'gift', 'pass', 'chat', 'lock'];   // значки кнопок оболочки и Убежища: флаг — только когда выгружены все

(function shlRootVars() {
  const R = document.documentElement, st = R && R.style, abs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
  if (!st) return;
  const set = (k, p, flag) => { if (!shlArt(p)) return false; try { st.setProperty(k, `url("${abs(p)}")`); } catch (_) { } if (flag && R.classList) R.classList.add(flag); return true; };
  set('--shl-diamond', SHL_ART.img.diamond, 'shla-dia'); set('--shl-iron', SHL_ART.img.iron, 'shla-iron');
  /* значки: одна манера на шапку — либо все нарисованы, либо все SVG index.html */
  if (SHL_OWN.every(k => shlIco(k))) { for (const k of Object.keys(SHL_ART.ico)) set('--shl-ico-' + k, SHL_ART.ico[k]); if (R.classList) R.classList.add('shla-ico'); }
  try {
    const V = SHL_VIEW, px = (k, pair) => { st.setProperty(`--shl-${k}0`, pair[0] + 'px'); st.setProperty(`--shl-${k}1`, pair[1] + 'px'); };
    px('ln', V.line); px('fr', V.frame); px('sw', V.stud); px('sh', V.stud.map(shlStudH)); px('ava', V.ava); px('bell', V.bell); px('gly', V.glyph);
    st.setProperty('--shl-gap', V.gap + 'px'); st.setProperty('--shl-iron-s', V.iron + 'px');
  } catch (_) { }
})();

/* ================== UI-кит: «Оболочка: линии и кнопки» ==================
   Живая оболочка — раздел «Оболочка и навигация» (index.html); здесь — то, из чего она собрана, и состояния кнопок */
function shlKitHtml() {
  const it = k => NAV.find(x => x[0] === k), V = SHL_VIEW, pair = a => a.join(' / ');
  const pic = (p, cap) => `<figure class="shl-kit-f">${shlArt(p) ? `<img src="${AV(p)}" alt="">` : '<i class="shl-kit-none"></i>'}<figcaption>${cap}</figcaption></figure>`;
  const ICO = [['bell', 'Входящие'], ['gift', 'Дар дня'], ['pass', 'Пропуск'], ['chat', 'Чат'], ['lock', 'Закрытый раздел'], ['best', 'Бестиарий'], ['floors', 'Этажи'], ['boss', 'Босс биома'], ['guard', 'Рунный страж']];
  const st = [
    ['Обычная', navItem(it('craft'))],
    ['С делами', navItem(it('craft'), { todo: [{ n: 1, q: 1, t: 'сундук в запасах' }, { n: 1, q: 1, t: 'лот продан' }] })],
    ['Выбранная', navItem(it('heroes'), { cur: true })],
    [`Закрыта до ${NAV_OPEN.week}-го уровня`, navItem(it('week'), { lock: NAV_OPEN.week })],
  ].map(([c, h]) => `<figure><div class="cell">${h}</div><figcaption>${c}</figcaption></figure>`).join('');
  const bell = n => `<button class="g-icon" type="button" tabindex="-1" aria-label="Входящие: ${n}">${ic('bell')}${bdgN(n)}</button>`;
  return `<section class="k-box" style="grid-column:1/-1" id="kitShellDecor"><h3>Оболочка: линии и кнопки</h3>
    <p class="k-note">Линии шапки и шахты — одна нить старого золота, на стыке — маленький ромб; рамка кнопки — одна нить вокруг картинки. Воздух остаётся экрану. Значки кнопок нарисованы и читаются с 20 px; у каждой кнопки свои состояния. Портрет Странника с уровнем и бейджем — целиком в своей ячейке над шахтой.</p>
    <div class="shl-kit-w">
      <div class="shl-kit-row"><span class="eyebrow">Кнопка раздела: обычная · с делами · выбранная · закрытая</span><div class="k-shell-st shl-kit-st">${st}</div></div>
      <div class="shl-kit-row"><span class="eyebrow">Колокол Входящих: писем нет · есть письма</span><div class="shl-kit-bells">${bell(0)}${bell(3)}</div></div>
      <div class="shl-kit-row"><span class="eyebrow">Значки кнопок</span>${ICO.map(([k, c]) => pic(SHL_ART.ico[k], c)).join('')}</div>
      <div class="shl-kit-row"><span class="eyebrow">Линия и стык</span><div class="shl-kit-joint" aria-hidden="true"></div></div>
    </div>
    <div class="k-air-g">
      <div class="k-air-r"><b>Толщины — из данных</b><small>Линия ${pair(V.line)} px, нить рамки ${pair(V.frame)} px на 932 × 430 и 844 × 390. Ромб на стыке — ${pair(V.stud)} px. Больше нигде толщину не задают: CSS берёт её переменными.</small></div>
      <div class="k-air-r"><b>Состояния</b><small>Обычная — картинка приглушена, нить тихая. С делами — бейдж с числом, нить ярче. Выбранная — картинка в цвете, нить света духа, свет снизу и язычок у края. Закрытая — серая нить, замок и уровень открытия.</small></div>
      <div class="k-air-r"><b>Портрет Странника</b><small>Кольцо ${pair(V.ava)} px, уровень и бейдж — внутри ячейки над шахтой, не заходят на линию шапки. Колокол — ${pair(V.bell)} px, с полем справа: бейдж не уходит в скруглённый угол экрана.</small></div>
    </div>
    ${TM(`<p class="k-note">Слова автора 01.10.2026 — «линии… слишком толстые… рамки тоже толстые, иконка странника вылезает на интерфейс и сами кнопки слабые». Значки — tools/art-gen/jobs/shell-descent.json (лист 3 × 3, craft_layers.py sheet) → ui-art.json → assets/art/shell/ico-*.png; ромб и железо — jobs/shelter.json. Пути — SHL_ART.ready, числа — SHL_VIEW → переменные &lt;html&gt; --shl-*; стили — screens/shell.css. Проверки — check_shell.js (толщины, портрет, состояния) и check_shelter.js (shell.css вёрстку не меняет).</p>`, 'div')}
  </section>`;
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: shlKitHtml });

window.EN_SHELL = { SHL_ART, SHL_VIEW, SHL_OWN, shlIco, shlStudH };   // для проверок (check_shell.js) и экранов (descent.js)
