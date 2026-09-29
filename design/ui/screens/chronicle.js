/* screens/chronicle.js — «Летопись» во вкладке «Странника»: одна книга знаний (§28.3 GDD). Лор — «Боги», «Мир», «Города», «Спуск»,
   «Странник»; справка — «Бестиарий» и «Механики». ADR-0022 (намёки на Странника — с цикла III), ADR-0024 (Эхо — только древние
   цивилизации), ADR-0026 (воздух). Данные — chronicle.js (window.EN_CHRONICLE): его собирает tools/content-gen/lore/build.js
   из tools/content-gen/lore/chapters.js, руками не править. Черновик для автора — docs/content/летопись.md.
   Глава — одна мысль: картинка сверху, над названием — строка места или стихии, главная мысль в две строки, остальное — «ещё»
   (foldLore, правила воздуха). Листают стрелками и точками внизу страницы; закрытая глава — замок и условие, имя — только у богов
   и городов. Новые главы — дело шахты «новые главы Летописи» (NAV_TODO, одна пачка у портрета) и точка у вкладки: открыл книгу —
   дело снято; отметка «новая» у главы и точка у раздела — до прочтения.
   Регистрирует: вкладку «Летопись» у Странника — строка WN_SEG_MORE (screens/wanderer.js) и сегмент chron у SCREENS.profile;
   маршрут chronicle — прежняя Летопись и «В Летопись» из листа врага ведут в ту же вкладку; бестиарий — страницы chronicleView
   из index.html; дело шахты; раздел UI-кита «Летопись» (KIT_EXTRA); сценарии презентации. Карта экранов — ready: cycles у карточки
   «Летопись» (MAP в index.html).
   Сервер решает, клиент показывает: открыта ли глава — CHR_SRV.open по уровню Странника, циклу и открытому биому (его рунный страж
   пройден); условия — в данных. Чтение ничего не выдаёт и не тратит (§28.2), прочитанное перечитывается всегда.
   Картинка главы — AV('lore/…'), только если путь есть в списке выгруженного EN_CHRONICLE.art.ready; до выгрузки — заглушка data:
   в свете карста главы, битой ссылки нет. Движение — только transform и opacity, «меньше движения» — без него.
   Своё состояние — S.chr: seen — прочитанные главы, ack — открытые главы, которые игрок уже видел в книге, all — демо команды
   «все главы». Раздел книги — S.lore.sec (общий с прежним бестиарием), глава раздела — S.seg['chr_' + раздел].
   Служебное — источник и решение исполнителя, демо — только команде: TM, tmT.
   Автопроверка — tools/content-gen/screens/check_chronicle.js. */
'use strict';

const CHRN = window.EN_CHRONICLE || null;

/* ================== демо-состояние: данные, не код ==================
   Демо-аккаунт — цикл II, уровень 24 (initialState): книгу он уже открывал, дела шахты нет; главы цикла II ещё не прочитаны —
   у них отметка «новая». Сценарий «новые главы» снова делает новыми главы, открытые в цикле аккаунта (chrDemoFresh) */
const CHR_DEMO = { unseen: ['ularion', 'stoneheim', 'cradles', 'peoples'] };

/* ================== вид: числа вида, не баланса ================== */
const CHR_VIEW = {
  tone: {   // свет главы — цвета карстов (токены --air … --time) и золото Убежища: [свет, середина, глубина]
    air: ['#dff4e5', '#6f9f86', '#0a100e'], earth: ['#eb9d40', '#7f5320', '#110c07'], fire: ['#f0564a', '#7d2820', '#120807'],
    water: ['#5a94f7', '#2a4784', '#070b13'], time: ['#4fdc8b', '#1f6f45', '#07100b'], gold: ['#ddbc7a', '#7c6a48', '#0f0d09'],
  },
  karst: ['#dff4e5', '#eb9d40', '#f0564a', '#5a94f7', '#4fdc8b'],   // заглушка «Карст»: пять заряженных камней и пустой
  empty: '#8d9296',
  stubW: 1584, stubH: 672,   // заглушка — в пропорциях выгрузки картинок глав (EN_CHRONICLE.art.size)
};

/* ================== «сервер»: какие главы открыты ================== */
const CHR_SRV = {
  /* глава открыта: уровень Странника, цикл, биом открыт — его рунный страж позади. Пустое условие — с начала игры */
  open(c, s = S) {
    const o = (c && c.open) || {};
    const bio = id => { const b = (s.biomes || []).find(x => x.id === id); return !!b && b.state !== 'lock'; };
    return !!c && (!o.lv || s.acc.level >= o.lv) && (!o.c || s.acc.cycle >= o.c) && (!o.b || bio(o.b));
  },
  list(s = S) { return CHRN ? CHRN.chapters.filter(c => this.open(c, s)).map(c => c.id) : []; },
};
const CHR_BY = new Map(CHRN ? CHRN.chapters.map(c => [c.id, c]) : []);
const CHR_READY = new Set(CHRN ? CHRN.art.ready : []);
const chrS = () => S.chr || (S.chr = { seen: {}, ack: {}, all: false });
/* что видит глаз: у команды есть демо «все главы»; «сервер» и дела шахты его не видят */
const chrOpen = c => CHR_SRV.open(c) || (!!KH.team && !!chrS().all);
const chrIsNew = c => CHR_SRV.open(c) && !chrS().seen[c.id];
/* дело шахты: открытые главы, которых игрок ещё не видел в книге */
const chrFresh = () => CHR_SRV.list().filter(id => !chrS().ack[id]);
const chrPartOf = sec => (CHRN && CHRN.parts.some(p => p.id === sec) ? sec : CHRN ? CHRN.parts[0].id : 'best');
const chrList = part => (CHRN ? CHRN.chapters.filter(c => c.part === part) : []);
const chrEsc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/* ================== картинка главы: выгруженная или заглушка ==================
   Заглушка — рисунок SVG в свете карста главы: свет идёт снизу, силуэт по смыслу главы. Картинки нет — битой ссылки тоже нет */
const chrStubs = {};
function chrStub(kind, tone) {
  const k = kind + '|' + tone; if (chrStubs[k]) return chrStubs[k];
  const [g, m, d] = CHR_VIEW.tone[tone] || CHR_VIEW.tone.gold, W = CHR_VIEW.stubW, H = CHR_VIEW.stubH, cx = W / 2;
  const sil = s => `<g fill="url(#s)" stroke="${g}" stroke-opacity=".32" stroke-width="3" stroke-linejoin="round">${s}</g>`;
  const glow = (x, y, r, c = g, o = 0.9) => `<circle cx="${x}" cy="${y}" r="${r * 3}" fill="${c}" opacity="${(o * 0.14).toFixed(3)}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${o}"/>`;
  const hood = (x, s) => `<path transform="translate(${x} ${Math.round(H * (1 - s))}) scale(${s})" d="M0 118c-46 0-80 38-80 88 0 30 12 55 32 71-70 20-122 70-136 150l-40 245h448l-40-245c-14-80-66-130-136-150 20-16 32-41 32-71 0-50-34-88-80-88z"/>`;
  const crystal = (x, y, s, c, lit) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-70l34 22v70L0 44l-34-22v-70z" fill="${c}" fill-opacity="${lit ? 0.85 : 0.5}" stroke="${lit ? '#fff' : '#c9cdd0'}" stroke-opacity="${lit ? 0.5 : 0.25}" stroke-width="3"/>${lit ? glow(x, y, 16 * s, c, 0.5) : ''}`;
  const towers = [[190, 70, 150, 1], [270, 50, 110, 0], [330, 90, 190, 1], [430, 60, 130, 0], [500, 80, 230, 1], [590, 60, 150, 0], [660, 100, 170, 1],
    [770, 44, 330, 2], [826, 100, 180, 1], [936, 70, 140, 0], [1016, 80, 210, 1], [1106, 60, 120, 0], [1176, 90, 170, 1], [1276, 60, 130, 0], [1346, 70, 160, 1]];
  const town = towers.map(([x, w, h, r]) => r === 2 ? `<path d="M${x} 470V${470 - h}l${w / 2} -40 ${w / 2} 40V470z"/>`
    : `<path d="M${x} 470V${470 - h}${r ? `l${w / 2} -${Math.round(w * 0.6)} ${w / 2} ${Math.round(w * 0.6)}` : `h${w}`}V470z"/>`).join('');
  const S_ = {
    god: sil(hood(cx, 1.05) + `<path d="M${cx + 250} 120V672" stroke-width="12" stroke="${g}" stroke-opacity=".5"/>`) + glow(cx + 250, 118, 14),
    five: sil([-2, -1, 0, 1, 2].map(i => hood(cx + i * 250, 0.62)).join('')) + [-2, -1, 0, 1, 2].map(i => glow(cx + i * 250, 640, 10, CHR_VIEW.karst[i + 2], 0.8)).join(''),
    city: sil(`<path d="M150 470h1284l-120 60H270z"/>${town}`) + [300, 540, 800, 1060, 1300].map(x => glow(x, 520, 8)).join(''),
    hourglass: sil(`<path d="M${cx - 150} 90h300v24c0 110-100 150-120 222 20 72 120 112 120 222v24H${cx - 150}v-24c0-110 100-150 120-222-20-72-120-112-120-222z"/>`)
      + `<path d="M${cx - 92} 560q92-70 184 0z" fill="${g}" opacity=".85"/><path d="M${cx} 340v200" stroke="${g}" stroke-width="4" opacity=".7"/>`,
    karst: CHR_VIEW.karst.map((c, i) => crystal(cx - 500 + i * 200, 380, 1.6, c, true)).join('') + crystal(cx + 500, 380, 1.6, CHR_VIEW.empty, false),
    lights: [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return glow(Math.round(cx + Math.cos(a) * 190), Math.round(336 + Math.sin(a) * 170), 22, CHR_VIEW.karst[i], 0.95); }).join(''),
    cradle: sil(`<path d="M${cx - 220} 330q220 170 440 0v26q-220 190-440 0z"/><path d="M${cx - 60} 450h120l40 222H${cx - 100}z"/>`) + glow(cx, 300, 26),
    stair: sil([0, 1, 2, 3, 4, 5].map(i => `<path d="M${cx - 520 + i * 70} ${250 + i * 70}h${1040 - i * 140}v70H${cx - 520 + i * 70}z"/>`).join('')) + glow(cx, 672, 60),
    peoples: sil(`<path d="M300 520c20-90 110-150 210-140 60-60 150-50 170 10l40 10-30 30c10 60-20 100-60 120v90H300z"/><circle cx="${cx}" cy="380" r="120"/><path d="M1130 300l40-20 30 40 50 0 30-40 40 20-10 50 40 30-10 50-50 10-20 50-50-10-40 30-40-30-50 10-20-50-50-10-10-50 40-30z"/>`) + glow(cx, 380, 40),
    ruins: sil(`<path d="M360 672V260h90v412z"/><path d="M1134 672V300h90v372z"/><path d="M360 260q170-150 340-30l-30 40q-130-90-220 20z"/><path d="M640 672V430h300v242z"/>`) + glow(cx, 640, 30),
    chasm: sil(`<path d="M0 300h640l110 372H0z"/><path d="M1584 300H944l-110 372h750z"/>`) + `<path d="M640 300l110 372h84l110-372z" fill="${g}" opacity=".16"/>` + glow(cx, 660, 34),
    portal: sil(`<path d="M${cx - 190} 640V300a190 190 0 0 1 380 0v340h-60V300a130 130 0 0 0-260 0v340z"/><path d="M${cx - 420} 640h840v32H${cx - 420}z"/>`)
      + `<path d="M${cx - 130} 640V300a130 130 0 0 1 260 0v340z" fill="${g}" opacity=".35"/>`,
    gate: sil(`<path d="M420 672V140h110v532z"/><path d="M1054 672V140h110v532z"/><path d="M380 140h824v50H380z"/>${hood(cx, 0.72)}`) + glow(cx, 660, 30),
    tower: sil(`<path d="M${cx - 60} 90l60-70 60 70 30 582H${cx - 90}z"/>`) + glow(cx, 672, 50),
    rings: [230, 170, 110].map((r, i) => `<circle cx="${cx}" cy="336" r="${r}" fill="none" stroke="${g}" stroke-opacity="${0.25 + i * 0.2}" stroke-width="${6 - i}"/>`).join('') + glow(cx, 336, 18),
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>`
    + `<radialGradient id="l" cx="50%" cy="100%" r="75%"><stop offset="0" stop-color="${g}" stop-opacity=".42"/><stop offset=".5" stop-color="${m}" stop-opacity=".16"/><stop offset="1" stop-color="${d}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2227"/><stop offset="1" stop-color="#090b0d"/></linearGradient></defs>`
    + `<rect width="${W}" height="${H}" fill="${d}"/><rect width="${W}" height="${H}" fill="url(#l)"/>${S_[kind] || S_.rings}</svg>`;
  return (chrStubs[k] = 'data:image/svg+xml,' + encodeURIComponent(svg));
}
/* кадр главы: выгруженная картинка с фокусом fy — или заглушка; «Пятеро» — пять полос из картинок богов */
const chrImg = (c, alt) => `<img src="${c.art && CHR_READY.has(c.art) ? AV(c.art) : chrStub(c.stub, c.tone)}" alt="${alt}" style="object-position:50% ${c.fy}%" decoding="async" draggable="false">`;
function chrFig(c, open) {
  if (open && c.mosaic) return `<div class="chr-mos">${c.mosaic.map(id => CHR_BY.get(id)).filter(Boolean).map(x => chrImg(x, '')).join('')}</div>`;
  return chrImg(open ? c : Object.assign({}, c, { art: null }), open && c.art && CHR_READY.has(c.art) ? chrEsc(c.n) : '');
}

/* ================== страница главы ==================
   peek — только показать (UI-кит): ни прочтения, ни отметок, кнопки не листают; all — показать открытой, что бы ни решил «сервер» */
const chrLabel = (c, open = chrOpen(c)) => (open ? c.n + (chrIsNew(c) ? ', новая' : '') : `${c.named ? c.n : 'Закрытая глава'}: ${c.why.charAt(0).toLowerCase()}${c.why.slice(1)}`);
function chrPageHtml(c, list, o = {}) {
  const isOpen = x => !!o.all || chrOpen(x);
  const open = isOpen(c), fresh = !o.peek && chrIsNew(c), i = list.indexOf(c), prev = list[i - 1], next = list[i + 1], part = c.part;
  const go = x => `data-a="${o.peek ? 'noop' : 'seg'}" data-v="chr_${part}:${x.id}"`;
  const body = open
    ? `<span class="eyebrow">${c.tag}</span><h2 class="serif">${c.n}</h2>${foldLore([c.lead].concat(c.more), 'chr-p')}
      ${TM(`<p class="chr-team"><b>Источник.</b> ${c.src}<br><b>Решение.</b> ${c.note}${c.why ? `<br><b>Открытие.</b> ${c.why}` : '<br><b>Открытие.</b> с начала игры'}</p>`, 'div')}`
    : `<span class="eyebrow">${ic('lock')}закрыто</span><h2 class="serif">${c.named ? c.n : 'Закрытая глава'}</h2><p class="chr-why">${c.why}.</p>`;
  const dots = list.map(x => { const lb = chrEsc(chrLabel(x, isOpen(x))); return `<button class="chr-d${x === c ? ' on' : ''}${isOpen(x) ? '' : ' lk'}${!o.peek && x !== c && chrIsNew(x) ? ' new' : ''}" ${go(x)} aria-label="${lb}" title="${lb}"${x === c ? ' aria-current="true"' : ''}></button>`; }).join('');
  const nav = list.length > 1 ? `<nav class="chr-nav" aria-label="Главы раздела">
      <button class="chr-arr pv" ${go(prev || c)} aria-label="Предыдущая глава"${prev ? '' : ' disabled'}>${ic('chev')}</button>
      <div class="chr-dots">${dots}</div><small class="num chr-pg">${i + 1} / ${list.length}</small>
      <button class="chr-arr" ${go(next || c)} aria-label="Следующая глава"${next ? '' : ' disabled'}>${ic('chev')}</button></nav>` : '';
  return `<article class="pnl chr-page" data-tone="${c.tone}"${open ? '' : ' data-lock="1"'} aria-label="${chrEsc(open || c.named ? c.n : 'Закрытая глава')}">
    <figure class="chr-fig">${chrFig(c, open)}${open ? '' : `<span class="chr-lk" aria-hidden="true">${ic('lock')}</span>`}${fresh ? '<span class="chip spirit chr-newtag">новая глава</span>' : ''}</figure>
    <div class="chr-body">${body}</div>${nav}</article>`;
}

/* ================== книга ================== */
/* бестиарий — страницы прежней Летописи (chronicleView в index.html): сетка биомов и карточка врага */
const chrBest = () => (typeof chronicleView === 'function' ? chronicleView() : { pages: '', count: '' });
function chrToc(cur, best) {
  const row = p => {
    const list = chrList(p.id), fresh = list.some(chrIsNew);
    const cnt = p.id === 'best' ? best.count || '' : `${list.filter(chrOpen).length}/${list.length}`;
    return `<button class="chr-tp" data-a="lore" data-v="${p.id}" aria-current="${p.id === cur}" title="${chrEsc(p.d)}"><span>${p.n}</span>${fresh ? '<i class="chr-dot" aria-hidden="true"></i><span class="sr">, есть новые главы</span>' : ''}<small class="num">${cnt}</small></button>`;
  };
  const demo = TM(`<div class="chr-demo"><button class="link" data-a="chrall" aria-pressed="${!!chrS().all}">Демо: все главы${chrS().all ? ' · включено' : ''}</button><button class="link" data-a="chrfresh">Демо: главы цикла снова новые</button></div>`, 'div');
  return `<nav class="pnl chr-toc" aria-label="Разделы Летописи" data-keep="chr-toc">${CHRN.parts.filter(p => !p.ref).map(row).join('')}<hr class="chr-hr">${CHRN.parts.filter(p => p.ref).map(row).join('')}${demo}</nav>`;
}
/* книга во вкладке: открыл — дело шахты снято (ack), показанная глава прочитана (seen) — до отрисовки шапки и шахты */
function chrBook() {
  const st = chrS(), part = chrPartOf(S.lore && S.lore.sec);
  if (S.lore) S.lore.sec = part;
  for (const id of CHR_SRV.list()) st.ack[id] = 1;
  const best = chrBest();
  let page;
  if (part === 'best') page = `<div class="pnl book chr-best">${best.pages || ''}</div>`;
  else {
    const list = chrList(part), pick = CHR_BY.get(S.seg['chr_' + part]);
    const c = (pick && pick.part === part ? pick : null) || list.find(chrIsNew) || list.find(chrOpen) || list[0];
    page = chrPageHtml(c, list);
    if (CHR_SRV.open(c)) st.seen[c.id] = 1;
  }
  return `<section class="scr"><div class="chr">${chrToc(part, best)}${page}</div></section>`;
}

/* ================== вкладка у Странника и прежний маршрут ================== */
if (CHRN) {
  if (typeof WN_SEG_MORE !== 'undefined') WN_SEG_MORE.push(['chron', 'Летопись', () => (chrFresh().length ? '1' : '')]);
  const chrProfileBase = SCREENS.profile;
  const chrSeg = () => (typeof wnSeg === 'function' ? wnSeg() : chrProfileBase().seg);
  SCREENS.profile = () => {
    if (S.seg.profile !== 'chron') return chrProfileBase();
    const html = chrBook();   // сначала книга: она снимает дело — точка вкладки и бейдж портрета уже без него
    return { title: 'Странник', seg: chrSeg(), html };
  };
  /* прежняя Летопись: кнопка-книга у портрета и «В Летопись» из листа врага — та же вкладка */
  SCREENS.chronicle = () => { S.route = 'profile'; S.seg.profile = 'chron'; return SCREENS.profile(); };
  NAV_TODO.push(['wanderer', q => plural(q, 'новая глава Летописи', 'новые главы Летописи', 'новых глав Летописи'), () => chrFresh().length, true]);
}

/* ================== действия — только демо команды ================== */
Object.assign(ACT, CHRN ? {
  chrall() { chrS().all = !chrS().all; render(); },
  /* главы цикла аккаунта снова новые: дело у портрета и точка у вкладки — видно с «Обзора» */
  chrfresh() { chrDemoFresh(); S.route = 'profile'; S.seg.profile = 'over'; render(); },
} : {});
function chrDemoFresh() {
  const st = chrS();
  for (const c of CHRN.chapters) if (c.open && c.open.c === S.acc.cycle && CHR_SRV.open(c)) { delete st.seen[c.id]; delete st.ack[c.id]; }
}

/* ================== состояние ================== */
function chrState(s) {
  s.chr = { seen: {}, ack: {}, all: false };
  for (const id of CHR_SRV.list(s)) { s.chr.ack[id] = 1; if (!CHR_DEMO.unseen.includes(id)) s.chr.seen[id] = 1; }
  s.lore = Object.assign({ foe: 'o1' }, s.lore || {}, { sec: CHRN ? CHRN.parts[0].id : 'best' });
  return s;
}
if (CHRN) {
  const chrInitBase = initialState;
  initialState = function () { return chrState(chrInitBase()); };
  chrState(S);
}

/* ================== UI-кит: раздел «Летопись» ================== */
function chrKitHtml() {
  if (!CHRN) return '';
  const on = CHRN.chapters.find(c => c.id === 'stoneheim') || CHRN.chapters[0], lock = CHRN.chapters.find(c => c.id === 'keron') || CHRN.chapters[1];
  const peek = (c, all) => chrPageHtml(c, chrList(c.part), { peek: true, all });
  const stubs = [...new Set(CHRN.chapters.map(c => c.stub + '|' + c.tone))];
  const kinds = stubs.map(k => { const [s, t] = k.split('|'); return `<figure><img src="${chrStub(s, t)}" alt=""><figcaption>${s} · ${t}</figcaption></figure>`; }).join('');
  const rows = CHRN.chapters.map(c => `<tr><td>${CHRN.parts.find(p => p.id === c.part).n}</td><td>${c.n}</td><td>${c.why || 'с начала игры'}</td><td>${c.art ? (CHR_READY.has(c.art) ? 'выгружена' : 'ждёт выгрузки') + ` · ${c.art}` : c.mosaic ? 'полосы богов' : 'заглушка ' + c.stub}</td></tr>`).join('');
  const ready = CHRN.chapters.filter(c => c.art && CHR_READY.has(c.art)).length, arts = CHRN.chapters.filter(c => c.art).length;
  return `<section class="k-box chr-kit" style="grid-column:1/-1" id="kitChronicle"><h3>Летопись</h3>
    <p class="k-note">Одна книга знаний во вкладке «Странника»: лор — боги, мир, города, Спуск, Странник; справка — бестиарий и механики. Глава — одна мысль: картинка сверху, строка места, название, мысль в две строки, остальное — «ещё». Листают стрелками и точками. Закрытая глава — замок и условие; имя видно только у богов и городов. Новая глава — одно дело у портрета и точка у вкладки, пока книгу не открыли.</p>
    <div class="chr-kg">
      <div class="k-air-r"><b>Открытая глава</b><div class="chr-kit-page">${peek(on, true)}</div><small>Картинка сверху режет середину кадра 21:9, фокус — поле главы. «Ещё» раскрывает до трёх коротких абзацев: картинка уступает место тексту.</small></div>
      <div class="k-air-r"><b>Закрытая глава</b><div class="chr-kit-page">${peek(lock, false)}</div><small>Вместо текста — условие открытия. Решает «сервер»: уровень Странника, цикл, пройденный рунный страж.</small></div>
    </div>
    <div class="k-air-r"><b>Заглушки до выгрузки картинок — ${stubs.length}</b><div class="chr-kit-stubs">${kinds}</div><small>Рисунок в свете карста главы, свет снизу; битой картинки нет. Картинки глав — ${ready} из ${arts} выгружено.</small></div>
    ${TM(`<table class="p-table chr-kt"><thead><tr><th>Раздел</th><th>Глава</th><th>Когда открывается</th><th>Картинка</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="k-note">Данные — <code>chronicle.js</code>, сборка — <code>tools/content-gen/lore/build.js</code>, черновик — <code>docs/content/летопись.md</code>, задание арта — <code>tools/art-gen/jobs/chronicle.json</code>. Проверка — <code>tools/content-gen/screens/check_chronicle.js</code>.</p>`, 'div')}
  </section>`;
}
/* перерисовка раздела при смене режима «Игрок / Команда» */
let chrKitWatch = false;
function chrKitPaint() {
  if (chrKitWatch || typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.documentElement) return;
  chrKitWatch = true;
  let was = !!KH.team;
  new MutationObserver(() => { if (!!KH.team === was) return; was = !!KH.team; const el = document.getElementById('kitChronicle'); if (el) el.outerHTML = chrKitHtml(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
if (CHRN && typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: chrKitHtml, paint: chrKitPaint });

/* ================== сценарии презентации ================== */
if (CHRN) FLOWS.push(
  ['Летопись · новые главы', 'Открылись главы цикла: точка у вкладки «Летопись» и одно дело у портрета; открыл книгу — дело снято', () => { S.overlay = null; chrDemoFresh(); S.route = 'profile'; S.seg.profile = 'over'; }],
  ['Летопись · город', 'Стоун-Хейм: картинка сверху, мысль в две строки, остальное — по «ещё»', () => { S.overlay = null; S.route = 'profile'; S.seg.profile = 'chron'; S.lore.sec = 'cities'; S.seg.chr_cities = 'stoneheim'; }],
  ['Летопись · бог', 'Уларион в свете своего карста: вера этеров, без намёков', () => { S.overlay = null; S.route = 'profile'; S.seg.profile = 'chron'; S.lore.sec = 'gods'; S.seg.chr_gods = 'ularion'; }],
  ['Летопись · закрытая глава', 'Кэрон откроется в цикле III: замок и условие вместо текста', () => { S.overlay = null; S.route = 'profile'; S.seg.profile = 'chron'; S.lore.sec = 'gods'; S.seg.chr_gods = 'keron'; }],
);
