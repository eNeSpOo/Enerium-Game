/* screens/shelter.js — Убежище (§28.1 GDD): дом Странника в Эндалоре, проводники, текущие дела, следующий шаг и одно главное действие.
   Слово автора 30.09.2026 со снимком Убежища: «Убежище сейчас выглядит как Заглушка, сделай его ААА уровня, добавь декоративные
   элементы в интерфейс общий».
   Сцена — фон комнаты, четыре проводника и слой наковальни со столом от автора (§28.1): Энцо крупно слева, Хранитель знаний справа,
   Кузнец за наковальней, Алхимик у стола. Картинки не перерисовываются — сцену оживляет вид:
   — глубина: задний план (комната, Кузнец и Алхимик, мебель) и передний (Энцо, Хранитель) едут с разной силой — камера медленно плывёт,
     за указателем — параллакс; передний план — фонарь с кристаллом карста, дымка у пола и крупные пылинки не в фокусе;
   — свет: горн мерцает и дышит жаром, угли поднимаются над ним; из окон падают холодные лучи с пылью; колба Алхимика светится,
     над ней поднимается пар; свечи дрожат; клинки Энцо тлеют красным, в руке Хранителя — холодный свет; снизу, из шахты
     «Спуска», поднимается свет карста к главной кнопке;
   — живые проводники: дышат — грудь от пояса, полы от пояса, вес от ступней (одна картинка двумя слоями, только transform); кадр
     фигуры — пояс, вдох, качание — общий с разговором (TK_CAST, screens/talk.js); у того, кто ждёт разговора, — метка над табличкой.
   Интерфейс в материале сцены — кованое железо и старое золото, свет карста снизу (материал разговора, screens/talk.css):
   — дела (ритуал, Эхо, контракт) — вывески на цепях под потолком, у готового дела свет снизу; «Дар дня» и «Пропуск» — медальоны
     справа сверху, «Чат» — медальон слева снизу;
   — таблички проводников — герб роли в медальоне, имя старым золотом, роль — метка;
   — «Следующий шаг» — записка Хранителя знаний: тёмное стекло, кромка старого золота, кованые уголки;
   — «Спуститься» — плита старого золота с кристаллами карста, под ней свет шахты; нажатие — камера уходит вниз, потом «Спуск».
   Отклик на каждое действие: нажатие вдавливает вещь и зажигает её свет, после нажатия — искры в цвете вещи (EnFx, слой рядом с #game:
   перерисовка экрана его не сносит). «Меньше движения» — всё стоит, переход сразу, искр нет.
   Время — часы страницы: фаза всех повторяющихся движений — --t (отрицательная задержка), перерисовка ничего не начинает заново.
   Логика прежняя: дела — ритуалы (S.rituals), Эхо (S.echo), контракт дня (S.contracts.day), Память (S.mem), разговор — ACT.npc
   (screens/talk.js), «Дар дня» и «Пропуск» — psShelterBtns (screens/pass.js), чат — socChatN (screens/social.js).
   Регистрирует: NPCS — проводники (их читают разговор и шахта), SCREENS.shelter, дело шахты «новый разговор» (NAV_TODO), ACT.shdive,
   отклик нажатий, раздел UI-кита «Убежище: сцена и вещи».
   Числа вида — SH_VIEW, геометрия сцены — SH_CAST и SH_ROOM (тысячные доли кадра), арт — SH_ART (tools/art-gen/jobs/shelter.json →
   tools/art-gen/shelter_layers.py → выгрузка export_ui.py в assets/art/shelter/). Пока пути нет в SH_ART.ready — вещь рисует CSS.
   Движение — только transform и opacity. Служебное — только команде: TM из index.html. Автопроверка —
   tools/content-gen/screens/check_shelter.js. */
'use strict';

/* ================== проводники: кто они, что говорят, куда ведут ==================
   Реплики — демо, не канон (§28.2): авторские тексты придут отдельно. isNew — новый разговор (дело шахты) */
const NPCS = {
  enzo: { n: 'Энцо', role: 'Контракты', img: ART('shelter-enzo.png'), isNew: true,
    say: ['Вернулся. Хорошо. Внизу всё ещё ждут — и не любят, когда их заставляют.', 'Контракт — это обещание самому себе. Подпишешь пустой — никто не осудит. Подпишешь полный и не донесёшь — потеряешь всё.'],
    go: ['contracts', 'К контрактам'] },
  smith: { n: 'Кузнец', role: 'Мастерская', img: ART('shelter-smith.png'),
    say: ['Шесть ячеек, дружок, и никакой подсказки, кроме загадок на самих ресурсах.', 'Не угадал — всё в огонь. Угадал — рецепт твой навсегда.'], go: ['craft', 'В мастерскую'] },
  alch: { n: 'Алхимик', role: 'Лавка', img: ART('shelter-alchemist.png'),
    say: ['Лавка обновляется трижды в день. Редкое — редко. Уникальное — почти никогда.'], go: ['craft:shop', 'В лавку'] },
  mage: { n: 'Хранитель знаний', role: 'Память · Летопись', img: ART('shelter-mage.png'), isNew: true,
    say: ['Ты прошёл первый цикл. Кое-что вернулось к тебе — не всё, лишь одно из трёх.', 'Выбирай спокойно. Смотреть бесплатно, закрепить — навсегда, до полного сброса.'],
    go: ['mem', 'Вспомнить'] },
};

/* ================== вид: числа — здесь, в функциях только алгоритм. Вид, не баланс ==================
   Пары — [932 × 430, 844 × 390]: второе — когда рабочая область не выше 360 px (та же граница, что @container main (max-height: 360px)) */
const SH_VIEW = {
  seed: 'Убежище · Эндалор',   // рисунок частиц — постоянный: одна и та же картина при каждой перерисовке
  cycle: 3600000,              // фаза движения — часы страницы по модулю этого числа, мс
  embers: 12,                  // углей над горном
  steam: 4,                    // клубов пара над колбой
  dust: 14,                    // пылинок в лучах из окон
  bokeh: 5,                    // крупных пылинок переднего плана — не в фокусе
  motes: 8,                    // огоньков карста, поднимающихся к главной кнопке
  par: { back: 5, front: 11, fx: 18 },     // параллакс за указателем: сдвиг слоя, px на край кадра
  drift: { back: 5, front: 9, fx: 14 },    // дрейф камеры: размах слоя, десятые доли процента
  sign: [48, 44],              // высота вывески дела, px
  cta: [62, 56],               // высота главной кнопки, px
  dive: 420,                   // «Спуститься»: камера уходит вниз столько мс, потом переход
  press: 90,                   // нажатие держит свет вещи не меньше стольких мс
  /* отклик на действие — частицы EnFx: [сколько, скорость, жизнь мс, размер]; ring — радиус кольца, % стороны вещи, и мс; col — цвет */
  fb: {
    cta: { burst: [26, 170, 760, 4], ring: [70, 560], col: 'spirit' },
    sign: { burst: [12, 110, 560, 3], ring: [60, 420], col: 'spirit' },
    npc: { burst: [10, 90, 520, 3], col: 'gold' },
    med: { burst: [10, 100, 520, 3], ring: [80, 380], col: 'gold' },
    note: { burst: [8, 90, 460, 2.6], col: 'gold' },
  },
};

/* кадр фигуры в сцене — тысячные доли кадра сцены: x — левый край, b — низ от нижнего края (минус — ниже кадра), h — высота;
   layer — план: back — за наковальней и столом (едет вместе с комнатой), front — перед ними; tag — табличка: середина по x, верх
   по y; glow — свет в руках: [x, y — ‰ фигуры, размер — % ширины фигуры, тон SH_TONE]; rim — тёплый свет горна по краю фигуры.
   Пропорции картинок — 447 × 820 (assets/art/shelter-*.png); пояс, вдох и качание — из TK_CAST (screens/talk.js), без него — SH_FIG */
const SH_CAST = {
  enzo: { layer: 'front', x: 45, b: -60, h: 860, tag: { x: 170, y: 505 }, glow: [[282, 612, 30, 'blood'], [880, 575, 30, 'blood']] },
  smith: { layer: 'back', x: 405, b: 260, h: 520, tag: { x: 470, y: 405 }, glow: [[872, 232, 26, 'amber']], rim: true },
  alch: { layer: 'back', x: 570, b: 280, h: 520, tag: { x: 668, y: 372 }, glow: [[806, 356, 30, 'time'], [214, 92, 24, 'time']] },
  mage: { layer: 'front', x: 760, b: -40, h: 920, tag: { x: 862, y: 520 }, glow: [[830, 296, 44, 'spirit']] },
};
const SH_FIG = { ar: [447, 820], waist: 45, breath: 10, sway: 7 };   // кадр без строки TK_CAST: пропорции, пояс %, вдох ‰, качание — десятые градуса
/* свет и частицы комнаты — тысячные доли кадра сцены (фон shelter-room.jpg, 1280 × 698) */
const SH_ROOM = {
  forge: { x: 412, y: 402, w: 250, h: 330 },           // жар горна: середина и размер пятна
  embers: { x: 412, y: 418, w: 60 },                   // откуда поднимаются угли: середина и ширина
  rise: [120, 260],                                     // угли поднимаются на столько ‰ высоты кадра — от и до
  beams: [[800, -40, 130, 1150, 26], [890, -40, 100, 1100, 20], [720, -40, 80, 1000, 30], [955, -40, 70, 980, 14]],   // лучи из окон: x, y, ширина, длина, наклон — градусы
  dustBox: { x: 520, y: 40, w: 440, h: 600 },          // где висит пыль в лучах
  flask: { x: 793, y: 540, w: 120 },                    // колба на столе: свет
  steam: { x: 786, y: 438 },                            // откуда поднимается пар
  candles: [[973, 578, 34], [955, 657, 30]],            // свечи: x, y, размер свечения ‰
  lantern: { x: 742, y: 10, h: 262 },                   // фонарь с кристаллом карста на переднем плане: середина, верх, высота
};
/* свет — токены палитры, rgb без альфы */
const SH_TONE = { spirit: '72,229,212', amber: '230,168,75', time: '79,220,139', gold: '221,188,122', blood: '232,60,48' };
/* тексты игрока */
const SH_TEXT = {
  next: 'Следующий шаг', memNow: c => `Место Памяти цикла ${ROMAN[c] || c} открыто`, memWhy: 'Вспомните одну пассивку аккаунта из трёх. Выбор можно перебросить.',
  front: n => `${n} ждёт`, frontNone: 'Путь вниз ждёт', frontWhy: 'Победите босса биома и рунного стража, чтобы открыть путь дальше.', remember: 'Вспомнить', talk: 'Поговорить',
  descend: 'Спуститься', chat: 'Чат', newTalk: 'новый разговор',
  rit: ['Ритуал готов', 'Ритуалы', 'забрать', n => `${n} идёт`, 'слоты свободны'],
  echo: [n => `Эхо · ${n} ${plural(n, 'цель', 'цели', 'целей')}`, s => `одна сгорит через ${dur(s)}`, 'целей нет — призовите в Эхо'],
  ct: [(d, n) => `Контракт ${d}/${n}`, 'Контракт не подписан', s => dur(s), s => 'до конца дня ' + dur(s)],
};

/* арт: выгруженные пути (design/ui/assets/art/…); пути нет — CSS. Геометрия — px выгрузки, только целые:
   sign и cta — border-image: px — сторона рисунка, slice — срезы [сверху, справа, снизу, слева].
   Чужие выгруженные вещи: гербы ролей — разговора (talk/), пар — частица «Ремесла» (craft/fx-smoke.png); значки медальонов — оболочки (SHL_ART.ico) */
const SH_ART = {
  ready: ['shelter/sign.webp', 'shelter/cta.webp', 'shelter/chain.png', 'shelter/corner.png', 'shelter/flourish.png',
    'shelter/lantern.webp', 'craft/fx-smoke.png'],   // выгрузка 30.09.2026; медальон разговора снят 01.10.2026 — медальоны Убежища в одну нить (shelter.css)
  img: { sign: 'shelter/sign.webp', cta: 'shelter/cta.webp', chain: 'shelter/chain.png', corner: 'shelter/corner.png', flourish: 'shelter/flourish.png',
    lantern: 'shelter/lantern.webp', smoke: 'craft/fx-smoke.png' },
  sign: { px: [749, 188], slice: [23, 116, 29, 116] },
  cta: { px: [727, 244], slice: [28, 150, 29, 150] },
};

/* ================== помощники ================== */
const shArt = p => SH_ART.ready.includes(p);
const shNow = () => { try { return Math.round(performance.now()); } catch (_) { return 0; } };
const shReduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
const shEsc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const shRoot = () => { try { return document.querySelector('.g .sh'); } catch (_) { return null; } };
/* генератор частиц на сиде: целые, одна и та же картина при каждой отрисовке */
function shRng(key) {
  if (window.EnLoot) return EnLoot.makeRng(EnLoot.seedOf(SH_VIEW.seed + ' · ' + key));
  let s = [...String(key)].reduce((h, ch) => (h * 31 + ch.codePointAt(0)) % 2147483647, 7) || 1;
  return n => { s = (s * 48271) % 2147483647; return s % n; };
}
/* кадр фигуры: пропорции картинки, пояс, вдох, качание — общий с разговором (TK_CAST), иначе SH_FIG */
function shFig(k) {
  const c = typeof tkCast === 'function' ? tkCast(k) : null, f = c && c.fig ? c.fig : SH_FIG, ar = (c && c.ar) || SH_FIG.ar;
  return { ar, waist: f.waist != null ? f.waist : SH_FIG.waist, breath: f.breath != null ? f.breath : SH_FIG.breath, sway: f.sway != null ? f.sway : SH_FIG.sway };
}
/* герб роли — картинка разговора, если выгружена (TK_ART); иначе знак TK_SIGIL в медальоне CSS; без talk.js — медальон без знака */
function shCrest(k, cls = '') {
  const c = typeof tkCast === 'function' ? tkCast(k) : null;
  const p = c && c.crest && typeof TK_ART !== 'undefined' ? TK_ART.crest + c.crest + '.png' : '';
  if (p && TK_ART.ready.includes(p)) return `<span class="sh-crest${cls}" aria-hidden="true"><img src="${AV(p)}" alt="" draggable="false"></span>`;
  const sig = c && typeof TK_SIGIL !== 'undefined' ? (TK_SIGIL[c.crest] || TK_SIGIL.guide) : '';
  return `<span class="sh-crest css${cls}" aria-hidden="true">${sig ? `<svg viewBox="0 0 24 24">${sig}</svg>` : ''}</span>`;
}

/* нарисованные вещи — адреса в переменные <html>, флаг у <html> говорит CSS, что рисунок есть (флаги sha-* — не классы элементов).
   Адрес полный: url() из переменной браузер разрешает от файла стилей, где её подставили. Срезы border-image — туда же */
(function shRootVars() {
  const R = document.documentElement, st = R && R.style, abs = p => { try { return new URL(AV(p), document.baseURI).href; } catch (_) { return AV(p); } };
  if (!st) return;
  const I = SH_ART.img;
  const set = (k, p, flag) => { if (!shArt(p)) return; try { st.setProperty(k, `url("${abs(p)}")`); } catch (_) { } if (flag && R.classList) R.classList.add(flag); };
  set('--sh-sign', I.sign, 'sha-sign'); set('--sh-cta', I.cta, 'sha-cta'); set('--sh-chain', I.chain, 'sha-chain'); set('--sh-corner', I.corner, 'sha-corner');
  set('--sh-flourish', I.flourish, 'sha-flour');
  set('--sh-smoke', I.smoke, 'sha-fx');
  try {
    const S1 = SH_ART.sign, C1 = SH_ART.cta;
    st.setProperty('--sh-ss', S1.slice.join(' ')); st.setProperty('--sh-sh', String(S1.px[1]));
    S1.slice.forEach((v, i) => st.setProperty('--sh-s' + i, String(v)));
    st.setProperty('--sh-cs', C1.slice.join(' ')); st.setProperty('--sh-ch', String(C1.px[1]));
    C1.slice.forEach((v, i) => st.setProperty('--sh-c' + i, String(v)));
    st.setProperty('--sh-sign0', SH_VIEW.sign[0] + 'px'); st.setProperty('--sh-sign1', SH_VIEW.sign[1] + 'px');
    st.setProperty('--sh-cta0', SH_VIEW.cta[0] + 'px'); st.setProperty('--sh-cta1', SH_VIEW.cta[1] + 'px');
    const P = SH_VIEW.par, D = SH_VIEW.drift;
    st.setProperty('--sh-pb', String(P.back)); st.setProperty('--sh-pf', String(P.front)); st.setProperty('--sh-px', String(P.fx));
    st.setProperty('--sh-db', String(D.back / 10)); st.setProperty('--sh-df', String(D.front / 10)); st.setProperty('--sh-dx', String(D.fx / 10));
  } catch (_) { }
})();

/* ================== сцена ==================
   Проводник: одна картинка двумя слоями — грудь от пояса дышит, полы от пояса качаются, вес — от ступней; свет в руках — поверх */
function shNpc(k) {
  const n = NPCS[k], c = SH_CAST[k]; if (!n || !c) return '';
  const f = shFig(k), r = shRng('npc · ' + k);
  const vars = [`--x:${c.x}`, `--b:${c.b}`, `--h:${c.h}`, `--ar:${f.ar[0]}/${f.ar[1]}`, `--waist:${f.waist}%`, `--breath:${(1000 + f.breath) / 1000}`,
    `--sway:${f.sway / 10}deg`, `--d:-${r(9000)}ms`].join(';');
  const glow = (c.glow || []).map(([x, y, s, t]) => `<i class="sh-gl" style="--gx:${x};--gy:${y};--gs:${s};--gc:${SH_TONE[t] || SH_TONE.gold};--gd:-${r(4000)}ms"></i>`).join('');
  const why = shEsc(`${n.n}, ${n.role.toLowerCase()}${n.isNew ? ': ' + SH_TEXT.newTalk : ''}`);
  return `<button class="sh-npc${n.isNew ? ' new' : ''}" data-k="${k}" data-a="npc" data-v="${k}" aria-label="${why}" style="${vars}">`
    + `<span class="sh-body"><img class="sh-up" src="${n.img}" alt="" draggable="false"><img class="sh-lo" src="${n.img}" alt="" draggable="false">`
    + `${c.rim ? `<img class="sh-rim" src="${n.img}" alt="" draggable="false">` : ''}</span>${glow}</button>`;
}
/* табличка проводника: герб роли, имя старым золотом, роль — метка; ждёт разговора — метка над табличкой */
function shTag(k) {
  const n = NPCS[k], c = SH_CAST[k]; if (!n || !c) return '';
  const why = shEsc(`${n.n}, ${n.role.toLowerCase()}${n.isNew ? ': ' + SH_TEXT.newTalk : ''}`);
  return `<button class="sh-tag ${c.layer}${n.isNew ? ' new' : ''}" data-a="npc" data-v="${k}" aria-label="${why}" title="${why}" style="--tx:${c.tag.x};--ty:${c.tag.y}">`
    + `${shCrest(k)}<span class="sh-nm"><b>${shEsc(n.n)}</b><small>${shEsc(n.role)}</small></span>${n.isNew ? '<i class="sh-new" aria-hidden="true"></i>' : ''}</button>`;
}
/* свет и частицы комнаты — постоянный рисунок (сид), фаза — от часов страницы */
const shCache = {};
function shRoomFx() {
  if (shCache.room) return shCache.room;
  const V = SH_VIEW, R = SH_ROOM, rng = shRng('комната');
  const beams = R.beams.map(([x, y, w, l, a], i) => `<i class="sh-beam" style="--x:${x};--y:${y};--w:${w};--l:${l};--a:${a}deg;--d:-${rng(9000) + i * 1700}ms"></i>`).join('');
  const embers = Array.from({ length: V.embers }, () => { const dur = 2200 + rng(2600);
    return `<i class="sh-em" style="--x:${R.embers.x - R.embers.w / 2 + rng(R.embers.w)};--y:${R.embers.y};--rise:${R.rise[0] + rng(R.rise[1] - R.rise[0])};--dx:${rng(70) - 20};--s:${5 + rng(5)};--dur:${dur}ms;--d:-${rng(dur)}ms"></i>`; }).join('');
  const steam = Array.from({ length: V.steam }, (_, i) => { const dur = 5200 + rng(3200);
    return `<i class="sh-sm" style="--x:${R.steam.x + rng(24) - 12};--y:${R.steam.y};--rise:${150 + rng(90)};--dx:${rng(50) - 10};--s:${46 + rng(30)};--dur:${dur}ms;--d:-${Math.round(dur * i / V.steam) + rng(600)}ms"></i>`; }).join('');
  const B = R.dustBox, dust = Array.from({ length: V.dust }, () => { const dur = 9000 + rng(8000);
    return `<i class="sh-du" style="--x:${B.x + rng(B.w)};--y:${B.y + rng(B.h)};--dx:${rng(41) - 20};--dy:${-8 - rng(30)};--s:${2 + rng(2)};--dur:${dur}ms;--d:-${rng(dur)}ms"></i>`; }).join('');
  const candles = R.candles.map(([x, y, s], i) => `<i class="sh-cn" style="--x:${x};--y:${y};--s:${s};--d:-${rng(1400) + i * 430}ms"></i>`).join('');
  shCache.room = `<i class="sh-forge" style="--x:${R.forge.x};--y:${R.forge.y};--w:${R.forge.w};--h:${R.forge.h}"></i><i class="sh-floor" style="--x:${R.forge.x};--y:${R.forge.y}"></i>`
    + `<span class="sh-beams">${beams}</span><span class="sh-emb">${embers}</span><span class="sh-dust">${dust}</span>`
    + `<i class="sh-flask" style="--x:${R.flask.x};--y:${R.flask.y};--w:${R.flask.w}"></i><span class="sh-steam">${steam}</span>${candles}`;
  return shCache.room;
}
/* передний план: крупные пылинки не в фокусе и дымка у пола; огоньки карста поднимаются к главной кнопке */
function shFrontFx() {
  if (shCache.front) return shCache.front;
  const V = SH_VIEW, rng = shRng('передний план');
  const bokeh = Array.from({ length: V.bokeh }, () => { const dur = 14000 + rng(10000);
    return `<i class="sh-bk" style="--x:${40 + rng(920)};--y:${120 + rng(700)};--s:${10 + rng(14)};--dx:${rng(61) - 30};--dy:${-10 - rng(30)};--dur:${dur}ms;--d:-${rng(dur)}ms"></i>`; }).join('');
  const L = SH_ROOM.lantern, lan = shArt(SH_ART.img.lantern) ? `<span class="sh-lan" style="--x:${L.x};--y:${L.y};--h:${L.h}"><i class="sh-lan-gl"></i><img src="${AV(SH_ART.img.lantern)}" alt="" draggable="false"></span>` : '';
  shCache.front = `<i class="sh-haze a"></i><i class="sh-haze b"></i>${lan}${bokeh}`;
  return shCache.front;
}
function shMotes() {
  if (shCache.motes) return shCache.motes;
  const rng = shRng('шахта');
  shCache.motes = Array.from({ length: SH_VIEW.motes }, () => { const dur = 2600 + rng(2600);
    return `<i style="--x:${8 + rng(84)}%;--s:${2 + rng(2)}px;--rise:${40 + rng(50)}px;--dx:${rng(21) - 10}px;--dur:${dur}ms;--d:-${rng(dur)}ms"></i>`; }).join('');
  return shCache.motes;
}

/* ================== дела: вывески на цепях ==================
   [маршрут, путевая иконка, заголовок, строка, светится] — логика прежняя: готовый ритуал, цели Эхо, контракт дня */
function shActs() {
  const R = S.rituals && S.rituals.slots ? S.rituals.slots : [], ready = R.filter(s => s.st === 'ready').length, run = R.filter(s => s.st === 'run').length;
  const live = S.echo.slots.filter(Boolean), soon = live.reduce((m, s) => Math.min(m, s.left), Infinity);
  const ct = S.contracts && S.contracts.day, T = SH_TEXT;
  const acts = [
    ['rituals', 33, ready ? T.rit[0] : T.rit[1], ready ? T.rit[2] : run ? T.rit[3](run) : T.rit[4], !!ready],
    ['echo', 18, T.echo[0](live.length), live.length ? T.echo[1](soon) : T.echo[2], false],
  ];
  if (ct) acts.push(['contracts', 38, ct.signed ? T.ct[0](ct.tasks.filter(t => t.p >= t.goal).length, ct.tasks.length) : T.ct[1], ct.signed ? T.ct[2](ct.left) : T.ct[3](ct.left), !ct.signed]);
  const rng = shRng('вывески');
  return acts.map(([r, p, t, s, hot]) => `<button class="sh-sign${hot ? ' hot' : ''}" data-a="go" data-v="${r}" aria-label="${shEsc(t + ': ' + s)}" style="--d:-${rng(7000)}ms">`
    + `<span class="sh-sw"><i class="sh-ch l"></i><i class="sh-ch r"></i><span class="sh-plate"><span class="sh-ic"><img src="${PATH(p)}" alt="" draggable="false"></span>`
    + `<span class="sh-tx"><b>${t}</b><small>${s}</small></span></span></span></button>`).join('');
}
/* «Чат» — медальон слева снизу; «Дар дня» и «Пропуск» — медальоны справа сверху (screens/pass.js рисует их кнопки) */
function shChat() {
  const n = typeof socChatN === 'function' ? socChatN() : 0;
  return `<button class="sh-md" data-a="sheet" data-v="chat" aria-label="${SH_TEXT.chat}${n ? `: ${n} ${plural(n, 'непрочитанное', 'непрочитанных', 'непрочитанных')}` : ''}">${ic('chat')}<span class="sh-md-t">${SH_TEXT.chat}</span>${n ? bdgN(n) : ''}</button>`;
}
function shMeds() { return typeof psShelterBtns === 'function' ? psShelterBtns() : '<button class="btn sm" data-a="dlg" data-v="gift">Дар дня</button>'; }
/* «Следующий шаг» — записка Хранителя знаний: место Памяти открыто — «Вспомнить», иначе — рубеж спуска */
function shNext() {
  const m = S.mem && S.mem.slots && S.mem.slots[0], memOpen = !!m && m.st === 'open', T = SH_TEXT;
  const front = (S.biomes || []).find(b => b.state === 'front');
  const h = memOpen ? T.memNow(m.c) : front && front.name ? T.front(front.name) : T.frontNone;
  const p = memOpen ? T.memWhy : T.frontWhy;
  const orn = ['tl', 'tr', 'bl', 'br'].map(c => `<i class="sh-orn ${c}" aria-hidden="true"></i>`).join('');
  return `<div class="sh-next">${orn}${shCrest('mage', ' sh-next-cr')}<div class="sh-next-b">
      <span class="eyebrow">${T.next} · ${NPCS.mage ? NPCS.mage.n : ''}</span>
      <h2>${h}</h2><p>${p}</p>
      <div class="sh-next-a">${memOpen ? `<button class="btn sm" data-a="dlg" data-v="mem">${T.remember}</button>` : ''}<button class="link" data-a="npc" data-v="mage">${T.talk} ${ic('chev')}</button></div>
    </div></div>`;
}
/* «Спуститься» — туда, где сейчас выбран биом «Спуска» */
function shCta() {
  const b = (S.biomes || []).find(x => x.id === S.selBiome), sub = b && b.name ? b.name : '';
  return `<button class="sh-cta" data-a="shdive" data-v="descent" aria-label="${SH_TEXT.descend}${sub ? ': ' + shEsc(sub) : ''}">`
    + `<span class="sh-cta-l" aria-hidden="true"></span><span class="sh-cta-t"><b>${SH_TEXT.descend}</b>${sub ? `<small>${shEsc(sub)}</small>` : ''}</span>`
    + `<i class="sh-cta-sh" aria-hidden="true"><i></i></i></button>`;
}

/* ================== экран ================== */
function shelterView() {
  const t = -(shNow() % SH_VIEW.cycle), keys = Object.keys(NPCS).filter(k => SH_CAST[k]);
  const back = keys.filter(k => SH_CAST[k].layer === 'back'), front = keys.filter(k => SH_CAST[k].layer !== 'back');
  const html = `<section class="scr flush sh" style="--t:${t}ms;--mx:${SH_PTR.x.toFixed(3)};--my:${SH_PTR.y.toFixed(3)}">
    <div class="sh-scene">
      <div class="sh-st sh-stage">
        <div class="sh-lay back"><div class="sh-dr">
          <img class="sh-room" src="${ART('shelter-room.jpg')}" alt="" draggable="false">${shRoomFx()}
          ${back.map(shNpc).join('')}
          <img class="sh-furn" src="${ART('shelter-furniture.png')}" alt="" draggable="false">
        </div></div>
        <div class="sh-lay front"><div class="sh-dr">${front.map(shNpc).join('')}</div></div>
      </div>
      <i class="sh-shade" aria-hidden="true"></i>
      <div class="sh-st sh-fx" aria-hidden="true"><div class="sh-lay fx"><div class="sh-dr">${shFrontFx()}</div></div></div>
      <div class="sh-st sh-tags"><div class="sh-lay back"><div class="sh-dr">${back.map(shTag).join('')}</div></div><div class="sh-lay front"><div class="sh-dr">${front.map(shTag).join('')}</div></div></div>
      <div class="sh-portal" aria-hidden="true"><i class="sh-well"></i><span class="sh-mt">${shMotes()}</span></div>
    </div>
    <div class="sh-ui">
      <div class="sh-top"><div class="sh-acts">${shActs()}</div><div class="sh-meds">${shMeds()}</div></div>
      <div class="sh-bot">${shChat()}${shNext()}${shCta()}</div>
    </div>
  </section>`;
  return { title: 'Убежище', sub: 'Эндалор', html };
}
SCREENS.shelter = shelterView;

/* дело шахты — новый разговор проводника (NAV_TODO: одно дело — одна кнопка, которая ждёт игрока) */
NAV_TODO.push(['shelter', q => plural(q, 'новый разговор', 'новых разговора', 'новых разговоров'), () => Object.values(NPCS).filter(n => n.isNew).length]);

/* ================== отклик на действие ==================
   Нажатие — вещь вдавливается и зажигает свой свет (класс is-press, пока палец на ней); после нажатия — искры в цвете вещи.
   Слой частиц — рядом с #game: перерисовка экрана его не сносит, искры играют уже над новым экраном */
let SH_FXI = null;
function shFxI() {
  if (!window.EnFx) return null;
  const g = document.getElementById('game'), p = g && g.parentElement; if (!p || !p.querySelector) return null;
  let L = p.querySelector(':scope > .sh-fxl');
  if (!L) { L = document.createElement('div'); L.className = 'sh-fxl'; L.setAttribute('aria-hidden', 'true'); p.appendChild(L); }
  if (!SH_FXI || SH_FXI.host !== L) { if (SH_FXI) SH_FXI.destroy(); try { SH_FXI = EnFx.create(L); } catch (_) { SH_FXI = null; } }
  return SH_FXI;
}
const shColor = c => c === 'gold' ? '#ddbc7a' : c === 'amber' ? '#e6a84b' : '#48e5d4';
function shBurst(kind, el) {
  const P = SH_VIEW.fb[kind]; if (!P || !el || shReduced()) return;
  const fx = shFxI(); if (!fx) return;
  let b; try { b = fx.center(el); } catch (_) { return; }
  const c = shColor(P.col);
  if (P.burst) fx.burst(b.x, b.y, c, ...P.burst, { fade: 'in' });
  if (P.ring) fx.ring(b.x, b.y, c, Math.round(Math.max(b.w, b.h) * P.ring[0] / 200), P.ring[1], 2);
}
const SH_KIND = [['.sh-cta', 'cta'], ['.sh-sign', 'sign'], ['.sh-npc', 'npc'], ['.sh-tag', 'npc'], ['.sh-md', 'med'], ['.ps-sb', 'med'], ['.sh-next', 'note']];
function shKindOf(t) { for (const [s, k] of SH_KIND) { try { if (t.matches(s) || t.closest(s)) return k; } catch (_) { } } return ''; }
let shPressed = null;
function shPress(e) {
  const t = e.target && e.target.closest ? e.target.closest('.sh [data-a]') : null;
  if (!t || t.disabled) return;
  shPressed = t; t.classList.add('is-press');
}
function shRelease() { const t = shPressed; shPressed = null; if (t) setTimeout(() => t.classList && t.classList.remove('is-press'), SH_VIEW.press); }
function shTap(e) {
  const t = e.target && e.target.closest ? e.target.closest('.sh [data-a]') : null;
  if (!t || t.disabled || t.dataset.a === 'shdive') return;   // главная кнопка — свой переход (ACT.shdive)
  shBurst(shKindOf(t), t);
}
/* ================== «Спуститься»: камера уходит вниз, свет шахты поднимается, потом «Спуск» ==================
   Второе нажатие во время ухода ничего не повторяет; «меньше движения» и песочница без сцены — переход сразу */
let shDiving = false;
function shDive(v) {
  const to = v || 'descent', el = shRoot();
  if (!el || !el.classList || shReduced()) { ACT.go(to); return; }
  if (shDiving) return;
  shDiving = true; el.classList.add('dive');
  shBurst('cta', el.querySelector('.sh-cta'));
  setTimeout(() => { shDiving = false; if (S.route === 'shelter') ACT.go(to); }, SH_VIEW.dive);
}
Object.assign(ACT, { shdive: v => shDive(v) });

/* ================== параллакс за указателем ==================
   Указатель над сценой сдвигает планы с разной силой (SH_VIEW.par); значения живут между перерисовками */
const SH_PTR = { x: 0, y: 0, raf: 0 };
function shPaintPtr() {
  SH_PTR.raf = 0;
  const el = shRoot(); if (!el || !el.style) return;
  el.style.setProperty('--mx', SH_PTR.x.toFixed(3)); el.style.setProperty('--my', SH_PTR.y.toFixed(3));
}
function shMove(e) {
  if (shReduced() || !e || e.pointerType === 'touch') return;
  const el = shRoot(); if (!el || !el.getBoundingClientRect) return;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
  SH_PTR.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
  SH_PTR.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
  if (!SH_PTR.raf) { try { SH_PTR.raf = requestAnimationFrame(shPaintPtr); } catch (_) { shPaintPtr(); } }
}
function shLeave() { SH_PTR.x = 0; SH_PTR.y = 0; shPaintPtr(); }
(function shBind() {
  const g = document.getElementById('game'); if (!g || !g.addEventListener) return;
  g.addEventListener('pointerdown', shPress, true);
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) g.addEventListener(t, shRelease, true);
  g.addEventListener('click', shTap, true);            // раньше обработчика игры: он перерисует экран, а место вещи нужно до того
  g.addEventListener('pointermove', shMove);
  g.addEventListener('pointerleave', shLeave);
  if (window.addEventListener) window.addEventListener('en-render', () => { if (S.route === 'shelter') shPaintPtr(); });
})();

/* ================== UI-кит: «Убежище: сцена и вещи» ==================
   Вещи сцены в состояниях — вывеска дела (обычная и готовая), табличка проводника, медальон, записка, главная кнопка
   (покой, наведение, нажатие); ниже — как устроена сцена. Команде — откуда арт и числа */
function shKitHtml() {
  const sign = (hot, t, s, p, cls = '') => `<div class="sh-kit-c"><button class="sh-sign${hot ? ' hot' : ''}${cls}" tabindex="-1" style="--d:0ms"><span class="sh-sw"><i class="sh-ch l"></i><i class="sh-ch r"></i><span class="sh-plate"><span class="sh-ic"><img src="${PATH(p)}" alt=""></span><span class="sh-tx"><b>${t}</b><small>${s}</small></span></span></span></button></div>`;
  const cta = cls => `<div class="sh-kit-c"><button class="sh-cta${cls}" tabindex="-1"><span class="sh-cta-l"></span><span class="sh-cta-t"><b>${SH_TEXT.descend}</b><small>Библиотека Улариона</small></span><i class="sh-cta-sh"><i></i></i></button></div>`;
  const tags = Object.keys(NPCS).filter(k => SH_CAST[k]).map(k => `<div class="sh-kit-c">${shTag(k).replace('<button class="sh-tag', '<button tabindex="-1" class="sh-tag')}</div>`).join('');
  const ready = SH_ART.ready.length;
  return `<section class="k-box sh-kit" style="grid-column:1/-1" id="kitShelter"><h3>Убежище: сцена и вещи</h3>
    <p class="k-note">Убежище — дом Странника в Эндалоре: комната, четыре проводника, наковальня и стол. Сцену оживляет вид: планы едут с разной силой, горн мерцает, над ним поднимаются угли, из окон падают лучи с пылью, над колбой — пар, проводники дышат. Интерфейс — в материале сцены: кованое железо, старое золото, свет карста снизу.</p>
    <div class="sh-kit-w">
      <div class="sh-kit-row"><span class="eyebrow">Дела — вывески на цепях</span>${sign(true, 'Ритуал готов', 'забрать', 33)}${sign(false, 'Эхо · 2 цели', 'одна сгорит через 1 д 20 ч', 18)}${sign(false, 'Контракт 2/3', '4 ч 12 мин', 38, ' is-press')}</div>
      <div class="sh-kit-row"><span class="eyebrow">Таблички проводников</span>${tags}</div>
      <div class="sh-kit-row"><span class="eyebrow">Медальоны</span><div class="sh-kit-c">${shChat()}</div><div class="sh-kit-c sh-meds">${shMeds()}</div></div>
      <div class="sh-kit-row"><span class="eyebrow">Главная кнопка: покой · наведение · нажатие</span>${cta('')}${cta(' is-hover')}${cta(' is-press')}</div>
      <div class="sh-kit-row sh-kit-next">${shNext()}</div>
    </div>
    <div class="k-air-g">
      <div class="k-air-r"><b>Глубина</b><small>Задний план — комната, Кузнец и Алхимик за наковальней и столом; передний — Энцо и Хранитель знаний. Камера медленно плывёт, за указателем планы сдвигаются с разной силой. Спереди — фонарь с кристаллом карста, дымка у пола и крупные пылинки не в фокусе.</small></div>
      <div class="k-air-r"><b>Свет</b><small>Горн мерцает и дышит жаром, угли поднимаются над ним. Из окон падают холодные лучи с пылью. Колба светится, над ней пар, свечи дрожат. Клинки Энцо тлеют, в руке Хранителя — холодный свет. Снизу, к главной кнопке, поднимается свет шахты.</small></div>
      <div class="k-air-r"><b>Проводники</b><small>Дышат: грудь и полы — от пояса, вес — от ступней. Наведение — кромка света по силуэту. Тот, кто ждёт разговора, — с меткой над табличкой.</small></div>
      <div class="k-air-r"><b>Отклик</b><small>Нажатие вдавливает вещь и зажигает её свет, после — искры в цвете вещи. «Спуститься» — камера уходит вниз, свет шахты поднимается, потом «Спуск». «Меньше движения» — всё стоит, переход сразу.</small></div>
    </div>
    ${TM(`<p class="k-note">Слово автора 30.09.2026 — «Убежище … ААА уровня». Арт — tools/art-gen/jobs/shelter.json → shelter_layers.py (вывеска без ушек, тон золота, кромка без сиреневого) → ui-art.json → assets/art/shelter/; выгружено путей: ${ready} (SH_ART.ready); гербы ролей — разговора (talk/), пар — частица «Ремесла» (craft/fx-smoke.png), значки медальонов «Дар дня», «Пропуск» и «Чат» — оболочки (SHL_ART.ico, медальон в одну нить, 01.10.2026). Числа вида — SH_VIEW, кадр сцены — SH_CAST и SH_ROOM (‰ кадра), пояс и вдох проводников — TK_CAST. Проверка — check_shelter.js.</p>`, 'div')}
  </section>`;
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: shKitHtml });
