'use strict';
/* ================== Бой AAA: сцена, сведения карты, эффекты, баннеры, ритуал этажа ==================
   Слова автора 01.10.2026: «Ну и пришло время сделать экран боёвки так же в формате ААА, апишку я оплатил, хочу посмотреть как ты это
   всё реализуешь». «У нас сейчас уже есть иконки способностей, покажи мне боевую сцену и все попапы в ней на ааа уровне и понятной
   информацией по бафам, дебафам, скиллам шансам, количество хп на хп баре надо, ну и сама боевая система в виде нынешних партиклов не
   годится, попробуй сделай ААА уровень и сгенери то, что нужно».
   Что здесь — слой показа поверх боя index.html; бой, числа и исходы решает ядро (battle.js), этот файл их только показывает:
   1. Значки эффектов — рисованные медальоны (assets/art/st, BS_DATA.st): число раундов и стаков на значке, кольцо тает с длительностью;
      имя и что делает — из библиотеки (EN_ABILITIES.sets[].eff), числа — из эффекта ядра (pow, per, stacks, left).
   2. Карта: здоровье числом на нижней плите рамки, щит — отдельным числом синим (hpNum в index.html, bsHpTxt здесь); чья очередь —
      свет карты и очередь раунда; рисованная квадратная рамка ранга — тело и венец (BS_FRAME).
   3. Сведения карты по нажатию: портрет в рамке ранга, тип врага и его раунды, иммунитет к контролю, здоровье и щит числом,
      характеристики, способности с иконкой, шансом и описанием, эффекты — что делают, сколько раундов осталось, стаки, кто наложил.
   4. Числа урона и лечения — крупно, крит — золотом с «крит», лечение — зелёным, щит — синим.
   5. Эффекты — сцена EnFx.scene (fx.js): снаряд и разрыв своей школы, удар, массовая волна, ульта со своим окном, значок наложенного
      эффекта, гибель flipbook-лентой. Только transform и opacity; «меньше движения» — без полётов и тряски.
   6. Баннеры: этаж, элита, босс биома, рунный страж, Эхо, «Раунд N», последний раунд, осада — плашка одного вида (BS_ART.plaque).
   7. Ритуал этажа (ADR-0044): враги выходят, падают, добыча летит в кошелёк, переход. Длительности — данные RULES.floor ядра: minMs —
      минимум этажа (его подбирает калькулятор фарма, время ритуала держит screens/biomes.js), ritual — фазы показа.
   8. Итог этажа и забега, окно «Стена» — герб победы или стены над окном (BS_ART.crest), тот же язык.
   9. Легенда «Знаки» — по новому виду: плита здоровья, значки эффектов, шансы, очередь, иммунитет, числа.
   Числа вида — в BS_DATA; в функциях только алгоритм. Проверка — tools/content-gen/screens/check_battle_scene.js. */

/* ================== данные вида ================== */
const BS_DATA = {
  /* значок эффекта: ключ эффекта ядра → картинка assets/art/st/<имя>.webp (jobs/battle-status-icons.json); урон и лечение со временем —
     dot-<школа> и hot-<школа>; «класс» и «Без школы» — steel */
  st: {
    silence: 'st-fire-ctrl', mark: 'st-fire-debuff', dmgUp: 'st-fire-buff', paralyze: 'st-earth-ctrl', pierce: 'st-earth-debuff', guard: 'st-earth-buff',
    knock: 'st-air-ctrl', miss: 'st-air-debuff', evade: 'st-air-buff', terror: 'st-dark-ctrl', weak: 'st-dark-debuff', lifesteal: 'st-dark-buff',
    freeze: 'st-water-ctrl', slow: 'st-water-debuff', healTaken: 'st-water-buff', blind: 'st-light-ctrl', rend: 'st-light-debuff', defUp: 'st-light-buff',
    stop: 'st-time-ctrl', chanceDown: 'st-time-debuff', chanceUp: 'st-time-buff', stun: 'st-steel-ctrl', break: 'st-steel-debuff', critUp: 'st-steel-buff',
    shield: 'st-shield', iceblock: 'st-iceblock', immune: 'st-immune', taunt: 'st-taunt', doom: 'st-doom', nameless: 'st-nameless', trophy: 'st-trophy', greed: 'st-greed',
  },
  school: { 'Огонь': 'fire', 'Земля': 'earth', 'Воздух': 'air', 'Тьма': 'dark', 'Вода': 'water', 'Свет': 'light', 'Время': 'time', 'класс': 'steel', 'Без школы': 'steel' },
  /* особые эффекты — вне пяти эффектов школ: [имя, что делает, полезный ли] */
  special: {
    iceblock: ['Ледяной панцирь', 'урон не проходит, носитель пропускает ход', true],
    doom: ['Отложенный удар', 'спадёт — по носителю ударит наложивший', false],
    nameless: ['Срезанное имя', 'пассивки, реакции и спасение от смерти молчат', false],
    trophy: ['Метка трофея', 'павший даёт больше добычи', false],
    greed: ['Жадный взгляд', 'павшие враги дают больше добычи', true],
  },
  aura: { dmgUp: ['Жар до конца этажа', '+{v} % урона'], evade: ['Уклон до конца этажа', '+{v} % уклонения'], lifesteal: ['Вампиризм до конца этажа', '{v} % урона лечит'] },
  /* значков на карте с каждой стороны, дальше — «+N»: квадрат, портрет, прежний вид */
  cap: { square: 2, portrait: 4, old: 3 },
  /* щит числом сокращается от этой величины: «12 тыс.» */
  shortFrom: 10000,
  /* здоровье на плите — красное ниже этой доли, % */
  lowPct: 30,
  /* числа урона и лечения: сколько разом на поле, длительность (мс при скорости ×1), разброс по карте, px */
  fly: { max: 22, ms: 1050, crit: 1350, spread: 6 },
  /* надпись способности над кастующим: длительность, мс */
  callout: { ms: 1100, ult: 1700, room: 24 },   // room — надпись не выше поля боя на столько px: HUD свободен
  /* окно ульты: длительность, мс */
  ult: { ms: 1250 },
  /* рунных ключей летит к кошельку не больше стольких — больше видно числом на плашке добычи */
  keyFly: 3,
  /* плашка перехода — доля паузы между этажами, % */
  transitPct: 80,
  /* медальон раунда на последних раундах — предупреждение: столько раундов до конца */
  lastRounds: 1,
  /* сведения карты: угроза — сколько противников показывать; портрет в рамке ранга, px */
  threatTop: 3,
  inspFace: 60,
};
/* арт: рамки-квадраты (тело, венец, рамка целиком для окна сведений и баннера), значки эффектов, украшения HUD — выгрузка 01.10.2026,
   tools/art-gen/ui-art.json; нет файла — CSS-рамка прежняя */
const BS_ART = {
  frames: ['hero', 'o', 'e', 'b', 'echo', 'voice', 'rune', 'uber', 'host', 'forgotten', 'many'],
  plaque: 'bhud/plaque.png', round: 'bhud/round.png', panel: 'bhud/panel.png', crest: { win: 'bhud/victory.webp', wall: 'bhud/defeat.webp' },
  /* иконки боя вне библиотеки способностей (jobs/battle-ability-icons.json): обычная атака по виду удара ядра (EB.fxOf), по всем, удар
     стража, отнимающий раунд; своя способность без вида в библиотеке — по ключу «школа.вид.охват» */
  abIcons: {
    basic: { melee: 'bab/basic-melee.webp', arrow: 'bab/basic-arrow.webp', magic: 'bab/basic-magic.webp', all: 'bab/basic-all.webp', rune: 'bab/basic-rune.webp' },
    own: { 'Без школы.revive.one': 'bab/none-revive-one.webp' },
  },
  /* иконки уникальных способностей — всё, чего нет в библиотеке: Убер-боссы девяти недель, Забытый, Многоликий, боссы, элита и стражи
     биомов (jobs/ability-icons-unique.json, клетки [id, имя файла]); id способности ядра → assets/art/abu/<имя>.webp */
  abUnique: {
    'Эхо.Люди.act1': 'echo-people-act1', 'Эхо.Люди.act2': 'echo-people-act2', 'Эхо.Люди.pas': 'echo-people-pas', 'Эхо.Люди.ult1': 'echo-people-ult1',
    'Эхо.Люди.ult2': 'echo-people-ult2', 'Эхо.Дворфы.act1': 'echo-dwarfs-act1', 'Эхо.Дворфы.act2': 'echo-dwarfs-act2',
    'Эхо.Дворфы.react': 'echo-dwarfs-react', 'Эхо.Дворфы.ult1': 'echo-dwarfs-ult1', 'Эхо.Дворфы.ult2': 'echo-dwarfs-ult2',
    'Эхо.Эльфы.act': 'echo-elves-act', 'Эхо.Эльфы.pas': 'echo-elves-pas', 'Эхо.Эльфы.react': 'echo-elves-react', 'Эхо.Эльфы.ult1': 'echo-elves-ult1',
    'Эхо.Эльфы.ult2': 'echo-elves-ult2', 'Эхо.Звери.act1': 'echo-beasts-act1', 'Эхо.Звери.act2': 'echo-beasts-act2',
    'Эхо.Звери.react': 'echo-beasts-react', 'Эхо.Звери.ult1': 'echo-beasts-ult1', 'Эхо.Звери.ult2': 'echo-beasts-ult2',
    'Эхо.Саганы.act': 'echo-sagans-act', 'Эхо.Саганы.pas': 'echo-sagans-pas', 'Эхо.Саганы.react': 'echo-sagans-react',
    'Эхо.Саганы.ult1': 'echo-sagans-ult1', 'Эхо.Саганы.ult2': 'echo-sagans-ult2', 'Эхо.Аппараты.act': 'echo-machines-act',
    'Эхо.Аппараты.pas1': 'echo-machines-pas1', 'Эхо.Аппараты.pas2': 'echo-machines-pas2', 'Эхо.Аппараты.ult1': 'echo-machines-ult1',
    'Эхо.Аппараты.ult2': 'echo-machines-ult2', 'Эхо.Искажённые.act1': 'echo-twisted-act1', 'Эхо.Искажённые.act2': 'echo-twisted-act2',
    'Эхо.Искажённые.react': 'echo-twisted-react', 'Эхо.Искажённые.ult1': 'echo-twisted-ult1', 'Эхо.Искажённые.ult2': 'echo-twisted-ult2',
    'Эхо.Нежить.act1': 'echo-undead-act1', 'Эхо.Нежить.act2': 'echo-undead-act2', 'Эхо.Нежить.react': 'echo-undead-react',
    'Эхо.Нежить.ult1': 'echo-undead-ult1', 'Эхо.Нежить.ult2': 'echo-undead-ult2',
    'Эхо.Забытые.act1': 'echo-forgotten-act1', 'Эхо.Забытые.act2': 'echo-forgotten-act2', 'Эхо.Забытые.pas': 'echo-forgotten-pas',
    'Эхо.Забытые.ult1': 'echo-forgotten-ult1', 'Эхо.Забытые.ult2': 'echo-forgotten-ult2', 'Эхо.Многоликий.act1': 'echo-many-act1',
    'Эхо.Многоликий.act2': 'echo-many-act2', 'Эхо.Многоликий.pas': 'echo-many-pas', 'Эхо.Многоликий.react': 'echo-many-react',
    'Эхо.Многоликий.ult1': 'echo-many-ult1', 'Эхо.Многоликий.ult2': 'echo-many-ult2', 'Спуск.b2b1.pas': 'b2b1-pas', 'Спуск.b2b1.ult': 'b2b1-ult',
    'Спуск.b2e2.act': 'b2e2-act', 'Спуск.b2e6.act': 'b2e6-act', 'Спуск.b3b1.pas': 'b3b1-pas', 'Спуск.b3b1.ult': 'b3b1-ult',
    'Спуск.b3e6.act': 'b3e6-act', 'Спуск.b3e6.ctrl': 'b3e6-ctrl', 'Спуск.b3g1.act': 'b3g1-act', 'Спуск.b4b1.pas': 'b4b1-pas',
    'Спуск.b4e6.act': 'b4e6-act', 'Спуск.b4g1.act': 'b4g1-act',
  },
};
/* геометрия рисованной квадратной рамки — tools/art-gen/frame_square.py: тело — нарезка border-image [верх, право, низ, лево] в тысячных
   тела; венец — пропорция ширины к высоте в тысячных (ar) и ширина к телу (rel); рамка целиком (окно сведений) — окно и нарезка battle_frame.py */
const BS_FRAME = {
  body: { hero: [62, 72, 233, 57], o: [56, 54, 261, 54], e: [63, 68, 165, 68], b: [64, 72, 176, 72], echo: [91, 96, 185, 96], voice: [85, 110, 169, 66],
    rune: [124, 124, 124, 124], uber: [97, 106, 201, 106], host: [33, 42, 202, 38], forgotten: [28, 34, 251, 34], many: [81, 76, 184, 76] },
  crest: { hero: [9083, 1032], o: [10289, 1017], e: [5750, 1147], b: [4398, 1369], echo: [4404, 1087], voice: [5255, 1040], rune: [5169, 1089],
    uber: [3774, 1244], host: [3085, 1455], forgotten: [4139, 1564], many: [6110, 1016] },
  full: { hero: [95, 108, 245, 111], o: [92, 57, 250, 54], e: [158, 117, 143, 117], b: [221, 178, 150, 187], echo: [198, 122, 163, 122], voice: [167, 107, 148, 88],
    rune: [185, 148, 124, 150], uber: [245, 177, 165, 177], host: [282, 181, 147, 174], forgotten: [236, 196, 191, 197], many: [154, 76, 168, 77] },
  /* венец над картой: высота, px при --sk 1 (на 932 × 430; на 844 × 390 — × sm), заходит на портрет, px; не шире карты в rel тысячных */
  crestH: 14, crestIn: 4, sm: 86, maxRel: 1060,
};

/* ================== помощники ================== */
const bsEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bsArt = p => (typeof AV === 'function' ? AV(p) : 'assets/art/' + p);
const bsStUrl = k => (BS_DATA.st[k] ? bsArt('st/' + BS_DATA.st[k] + '.webp') : '');
const bsSch = s => BS_DATA.school[s] || 'steel';
const bsP = bp => Math.round((bp || 0) / 100);   // б. п. → целые проценты
/* здоровье и щит числом: щит от BS_DATA.shortFrom — тысячами */
function bsHpTxt(n, short) {
  const v = Math.max(0, Math.round(n || 0));
  return short && v >= BS_DATA.shortFrom ? fmt(Math.round(v / 1000)) + ' тыс.' : fmt(v);
}
/* ритуал этажа: фазы показа — RULES.floor.ritual ядра; минимум этажа (RULES.floor.minMs) — у ядра, его подбирает калькулятор фарма */
const bsRit = () => EB.RULES.floor.ritual;
const bsMinMs = kind => { const m = EB.RULES.floor && EB.RULES.floor.minMs; return m && Number.isInteger(m[kind]) ? m[kind] : null; };
const bsCalm = () => { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } };
/* длительность анимации сведений (числа, надписи, плашки): и в стиле, и в --bs-d — при «меньше движения» общее правило index.html гасит все
   анимации мгновенно, battle-scene.css возвращает сведениям их длительность из --bs-d: число и баннер видны, только без движения */
const bsDur = (e, ms) => { const v = Math.round(ms) + 'ms'; e.style.animationDuration = v; e.style.setProperty('--bs-d', v); };

/* ================== 1. эффекты: имя и что делают — из библиотеки, числа — из ядра ================== */
let BS_EFF = null;
function bsEff() {
  if (BS_EFF) return BS_EFF;
  BS_EFF = {};
  const A = window.EN_ABILITIES;
  if (!A) return BS_EFF;
  for (const s of A.sets) {
    if (!s.eff) continue;
    for (const k of ['ctrl', 'debuff', 'buff']) {
      const it = s.items.find(x => x.k === k && x.data && x.data.st);
      if (it && s.eff[k]) BS_EFF[it.data.st] = { school: s.n, kind: k, name: s.eff[k][0], desc: s.eff[k][1] };
    }
    for (const k of ['dot', 'hot']) if (s.eff[k]) BS_EFF[k + '-' + s.n] = { school: s.n, kind: k, name: s.eff[k][0], desc: s.eff[k][1] };
  }
  return BS_EFF;
}
const bsCap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
/* что делает эффект с его числами: сила pow — б. п., у трофея и жадности — проценты добычи */
function bsStLine(x, E, rounds) {
  const p = bsP(x.pow), per = rounds ? 'в начале каждого хода' : 'в каждую атаку';
  switch (x.k) {
    case 'dot': return `${fmt(x.per * x.stacks)} урона ${per}${x.max > 1 ? ` · стаков ${x.stacks} из ${x.max}` : ''}`;
    case 'hot': return `+${fmt(x.per * x.stacks)} здоровья ${per}${x.max > 1 ? ` · стаков ${x.stacks} из ${x.max}` : ''}`;
    case 'weak': return `−${p} % урона`;
    case 'mark': return `+${p} % получаемого урона`;
    case 'pierce': return `−${p} % физической защиты`;
    case 'rend': return `−${p} % магической защиты`;
    case 'slow': return `−${p} % скорости: ходит позже`;
    case 'miss': return `+${p} % промахов`;
    case 'chanceDown': return `шансы способностей и ульты −${p} %`;
    case 'chanceUp': return `шансы способностей и ульты +${p} %`;
    case 'break': return `−${p} % крит. урона${x.evadeDown ? `, −${bsP(x.evadeDown)} % уклонения` : ''}`;
    case 'dmgUp': return `+${p} % урона`;
    case 'guard': return `−${p} % получаемого урона`;
    case 'evade': return `+${p} % уклонения`;
    case 'lifesteal': return `${p} % урона лечит носителя`;
    case 'healTaken': return `+${p} % получаемого лечения`;
    case 'defUp': return `+${p} % физической и магической защиты`;
    case 'critUp': return `+${p} % шанса крита`;
    case 'trophy': return `+${x.pow} % добычи при гибели`;
    case 'greed': return `павшие враги дают +${x.pow} % добычи`;
    case 'freeze': return `не действует; лёд спадает от удара больше ${x.breakPct || 10} % здоровья`;
  }
  return E ? E.desc : '';
}
/* один эффект карты для показа: значок, имя, полезный ли, контроль ли, строка, раунды, стаки, кто наложил */
function bsSt(x, u, rounds) {
  const L = bsEff(), sc = x.school === 'класс' ? 'Без школы' : x.school;
  const E = x.k === 'dot' || x.k === 'hot' ? L[x.k + '-' + sc] : L[x.k], SP = BS_DATA.special[x.k];
  const good = x.k === 'hot' || (SP ? SP[2] : (EB.GOOD_ST || []).includes(x.k));
  const icon = x.k === 'dot' || x.k === 'hot' ? (BS_DATA.st[x.k + '-' + bsSch(sc)] || bsArtKey(x.k, sc)) : BS_DATA.st[x.k];
  const name = E ? bsCap(E.name) : SP ? SP[0] : (ST_ICON[x.k] ? ST_ICON[x.k][1].split(':')[0] : x.k);
  const by = x.by || x.src || null;
  return { key: x.k, icon: icon ? bsArt('st/' + icon + '.webp') : '', vec: ST_ICON[x.k] ? ST_ICON[x.k][0] : x.k === 'dot' ? (DOT_ICON[x.school] || 'flame') : 'heal',
    name, school: E ? E.school : null, kind: E ? E.kind : x.k === 'dot' ? 'dot' : x.k === 'hot' ? 'hot' : SP ? 'special' : null, good, ctl: CTL.includes(x.k) || x.k === 'nameless',
    line: bsStLine(x, E, rounds), left: x.left, left0: x.left0 || x.left, stacks: x.stacks || 1, max: x.max || 1, by };
}
const bsArtKey = (k, sc) => `st-${bsSch(sc)}-${k}`;
/* эффекты карты в порядке показа: вредные — контроль, урон со временем, дебаффы; полезные — лечение со временем, баффы, эффекты до конца
   этажа. Щит — числом на плите здоровья, не значком */
function bsStatuses(u, d, rounds) {
  const out = [];
  for (const x of u.st || []) if (x.k === 'dot' || x.k === 'hot' || ST_ICON[x.k] || BS_DATA.special[x.k]) out.push(bsSt(x, u, rounds));
  if (u.aura) for (const k in BS_DATA.aura) if (u.aura[k]) {
    const A = BS_DATA.aura[k];
    out.push({ key: 'aura-' + k, icon: bsStUrl(k), vec: (AURA_TXT[k] || ['up'])[0], name: A[0], kind: 'aura', good: true, ctl: false, line: A[1].replace('{v}', bsP(u.aura[k])), left: null, left0: null, stacks: 1, max: 1, by: u });
  }
  const rank = I => I.good ? (I.kind === 'hot' ? 0 : I.kind === 'aura' ? 2 : 1) : I.ctl ? 0 : I.key === 'dot' ? 1 : 2;
  return out.sort((a, b) => rank(a) - rank(b) || (b.stacks || 1) - (a.stacks || 1));
}
/* значок эффекта на карте: медальон, кольцо длительности, раунды внизу справа, стаки вверху справа */
function bsSi(I) {
  const p = I.left0 ? Math.max(8, Math.round(I.left * 100 / I.left0)) : 100;
  const say = `${I.name}: ${I.line}${I.left != null ? ` · ещё ${I.left} ${roundWord(I.left)}` : ' · до конца этажа'}`;
  return `<span class="si2 ${I.good ? 'good' : 'bad'}${I.ctl ? ' ctl' : ''}" style="--p:${p}" title="${bsEsc(say)}">${I.icon ? `<img src="${I.icon}" alt="" decoding="async">` : ic(I.vec)}${I.left != null ? `<b class="l">${I.left}</b>` : ''}${I.stacks > 1 ? `<b class="k">${I.stacks}</b>` : ''}</span>`;
}
/* значки на карте — прежний договор statusHtml(карта, показ, раунды) → [полезные, вредные]; лишние — «+N» */
statusHtml = function (u, d, rounds) {
  const all = bsStatuses(u, d, rounds), cap = BS_DATA.cap[typeof bfView === 'function' ? bfView() : 'square'] || 2;
  const side = arr => arr.slice(0, cap).map(bsSi).join('') + (arr.length > cap ? `<span class="si2 more" title="${bsEsc(arr.slice(cap).map(I => I.name).join(', '))}">+${arr.length - cap}</span>` : '');
  return [side(all.filter(I => I.good)), side(all.filter(I => !I.good))];
};

/* ================== 2. карта: здоровье числом, щит, чья очередь, рисованная рамка ================== */
const bsPaintCards0 = paintCards;
paintCards = function (R) {
  bsPaintCards0(R);
  const b = R && R.b; if (!b) return;
  const now = R.acted && R.acted.length && !b.over ? R.acted[R.acted.length - 1] : null;
  for (const sd of [0, 1]) b.u[sd].forEach((u, i) => {
    const el = document.getElementById('bc' + sd + i); if (!el || !el.querySelector) return;
    const d = R.disp[dkey(u)] || { hp: u.hp, sh: u.sh, dead: !u.alive };
    const hn = el.querySelector('.hpn'), sn = el.querySelector('.shn');
    if (hn) { const t = bsHpTxt(d.dead ? 0 : d.hp); if (hn.textContent !== t) hn.textContent = t; }
    if (sn) { const t = d.sh > 0 && !d.dead ? bsHpTxt(d.sh, true) : ''; if (sn.textContent !== t) sn.textContent = t; }
    el.classList.toggle('low', !d.dead && d.hp * 100 < u.maxHp * BS_DATA.lowPct);
    el.classList.toggle('turn', !d.dead && u === now && R.view < (R.turnUntil || 0));
  });
};
/* рисованная квадратная рамка ранга: тело — border-image поверх портрета, венец — над картой; CSS-рамка остаётся под ней для света
   состояний (цель, удар, выбор) и как запас, если арта нет */
const bsReady = t => BS_ART.frames.includes(t);
function bsFrameHtml(t) {
  const B = BS_FRAME.body[t], C = BS_FRAME.crest[t];
  const sl = B.map((v, i) => `${(v / 10).toFixed(1)}%`).join(' ');
  return `<i class="sf" style="border-image-source:url('${bsArt('bframes-sq/' + t + '.png')}');border-image-slice:${sl}" aria-hidden="true"></i>`
    + (C ? `<i class="sfc" style="--car:${C[0]};--crel:${Math.min(C[1], BS_FRAME.maxRel)};background-image:url('${bsArt('bframes-sq/' + t + '-crest.png')}')" aria-hidden="true"></i>` : '');
}
const bsBfCard0 = bfCard;
bfCard = function (R, u, opt) {
  const fr = bsBfCard0(R, u, opt);
  if (fr && fr.cls === ' sq' && bsReady(fr.t)) { fr.cls += ' sfa'; fr.face += bsFrameHtml(fr.t); }
  return fr;
};
/* рамка целиком — для окна сведений и баннера: окно рамки ложится на портрет, венец и плита — вокруг */
function bsFullFrame(t, face, px) {
  if (!bsReady(t)) return `<span class="bsf plain" style="--px:${px}px">${face}</span>`;
  const [wt, wr, wb, wl] = BS_FRAME.full[t];
  return `<span class="bsf" style="--px:${px}px;--wt:${wt};--wr:${wr};--wb:${wb};--wl:${wl}">${face}<i style="background-image:url('${bsArt('bframes-sq/' + t + '-full.png')}')"></i></span>`;
}

/* ================== 3. HUD: медальон раунда, очередь, последний раунд ================== */
const bsPaintHud0 = paintHud;
paintHud = function (R) {
  bsPaintHud0(R);
  bsLegendCover();
  const n = document.getElementById('btRoundN'), b = R && R.b;
  if (n && b) {
    const t = String(Math.max(1, b.round));
    if (n.textContent !== t) n.textContent = t;
    const box = document.getElementById('btClockBox');
    if (box) box.classList.toggle('last', b.mode === 'rounds' && b.round > 0 && b.maxRounds - b.round < BS_DATA.lastRounds);
  }
};

/* легенда «Знаки» открыта — баннер, «Раунд N», плашки этажа и надпись ульты над ней не рисуются (battle-scene.css, .bs-leg) */
function bsLegendCover() { const bt = document.getElementById('bt'); if (bt && bt.classList) bt.classList.toggle('bs-leg', !!S.legend); }
window.addEventListener('en-render', bsLegendCover);
/* баннер этажа снимается раньше срока, когда его место занимает плашка: «Раунд N», «Этаж взят» */
function bsDropBanner(R) {
  if (R) R.banner = null;
  const x = document.querySelector('.bt-banner'); if (x) x.remove();
}
/* иммунитет к контролю — в строке боя, если сцена его ещё не назвала (страж биома): у самого стойкого живого врага, по рангу */
function bsImmChip(R, chip) {
  if (!R || !R.b || /иммунитет/.test(chip || '')) return '';
  const m = Math.max(0, ...R.b.u[1].filter(u => u.alive).map(u => (u.rank && EB.RULES.resist[u.rank]) || 0));
  return m ? `<span class="chip" title="Иммунитет к контролю по рангу: такая доля контроля не ложится"><img class="ico" src="${bsStUrl('immune')}" width="14" height="14" alt=""><span class="bs-long">иммунитет </span>${pctBp(m)}</span>` : '';
}

/* ================== 4. сведения карты по нажатию ================== */
/* ключ раундов в таблице ядра по рангу карты: тип врага → его раунды (RULES.rounds.by) */
const BS_RANK_ROUNDS = { o: 'o', e: 'e', b: 'b', rune: 'rune', uber: 'uber', forgotten: 'forgotten', clan: 'clan' };
function bsTypeOf(R, u) {
  const t = typeof bfType === 'function' ? bfType(R, u) : (u.side ? 'o' : 'hero');
  const T = typeof BF !== 'undefined' && BF.types[t];
  return { t, name: u.side && T && T.n ? T.n : 'Герой' };
}
function bsRoundsOf(R, u) {
  if (!u.side) return null;
  const E = R.b && R.b.echo, main = E && E.main === u;
  const key = main && E.g === 'm' ? 'many' : R.kind === 'pvp' ? 'pvp' : BS_RANK_ROUNDS[u.rank];   // Арена и Лига — свой ключ таблицы
  return key ? EB.roundsOf(key) : null;
}
let BS_LIBIDS = null;
const bsLibIds = () => { if (!BS_LIBIDS) { BS_LIBIDS = new Set(); for (const s of (window.EN_ABILITIES || { sets: [] }).sets) for (const x of s.items) BS_LIBIDS.add(x.id); } return BS_LIBIDS; };
/* иконка способности: обычная атака — своя по виду удара; уникальная способность (Убер, Забытый, Многоликий, боссы, элита и стражи
   биомов) — своя иконка BS_ART.abUnique; способность библиотеки — по id (abArt, screens/art-icons.js); прочее вне библиотеки — иконка
   библиотеки той же школы, вида и охвата, нет такой — своя иконка вида (BS_ART.abIcons.own), иначе вектор */
function bsAbArt(ab, px) {
  if (typeof abArt !== 'function' || !ab) return '';
  const I = BS_ART.abIcons, img = p => typeof artImg === 'function' ? artImg(p, px, '', 'ab-art') : '';
  if (ab.basic) return I.basic[ab.basic] ? img(I.basic[ab.basic]) : '';
  if (ab.id && BS_ART.abUnique[ab.id]) return img('abu/' + BS_ART.abUnique[ab.id] + '.webp');   // своя иконка уникальной способности
  const L = bsLibIds();
  if (ab.id && L.has(ab.id)) return abArt(ab, px, '');
  const sc = !ab.school || ab.school === 'класс' ? 'Без школы' : ab.school, id = ab.ult ? `${sc}.ult.${ab.kind}` : `${sc}.${ab.kind}.${ab.tier}`;
  return L.has(id) ? abArt({ id }, px, '') : I.own[id] ? img(I.own[id]) : '';
}
const bsKindName = k => (window.EN_ABILITIES && EN_ABILITIES.kinds && EN_ABILITIES.kinds[k]) || '';
const bsTierName = t => (window.EN_ABILITIES && EN_ABILITIES.tiers && EN_ABILITIES.tiers[t]) || '';
function bsAbRow(ab, ch, on, opt = {}) {
  const icon = bsAbArt(ab, 30) || `<span class="bsi-vic">${ic(ab.ult ? 'crown' : typeof abIcon === 'function' ? abIcon(ab) : 'spark')}</span>`;
  const what = [ab.ult ? 'Ульта' : bsKindName(ab.kind), bsTierName(ab.tier), ab.school && ab.school !== 'класс' ? ab.school : ''].filter(Boolean).join(' · ');
  return `<div class="bsi-r${ab.ult ? ' u' : ''}${on ? ' on' : ''}"><span class="bsi-ic">${icon}</span><div class="bsi-tx"><b>${bsEsc(ab.n)}</b>${what ? `<small>${bsEsc(what)}</small>` : ''}${ab.d ? `<p>${bsEsc(ab.d)}</p>` : ''}</div>${ch != null ? `<em class="bsi-ch" title="Шанс в свой ход">${ch}</em>` : opt.tag ? `<em class="bsi-tag">${opt.tag}</em>` : ''}</div>`;
}
function bsStRow(I) {
  const by = I.by ? (I.by === true ? '' : uName(I.by)) : '';
  const left = I.left != null ? `${I.left}<small>${roundWord(I.left)}</small>` : `<small>до конца этажа</small>`;
  return `<div class="bsi-r e ${I.good ? 'bsi-gd' : 'bsi-bd'}"><span class="bsi-ic">${I.icon ? `<img src="${I.icon}" alt="" decoding="async">` : ic(I.vec)}</span><div class="bsi-tx"><b>${bsEsc(I.name)}${I.stacks > 1 ? ` <i class="bsi-k">×${I.stacks}</i>` : ''}</b><p>${bsEsc(I.line)}</p>${by ? `<small class="by">наложил: ${bsEsc(by)}</small>` : ''}</div><em class="bsi-lf">${left}</em></div>`;
}
/* окно закрывает сторону поля: числа, надписи и плашки над ней прячутся — и те, что уже летят (battle-scene.css, .bs-cov0 и .bs-cov1) */
function bsCover(side) {
  const bt = document.getElementById('bt'); if (!bt || !bt.classList) return;
  bt.classList.toggle('bs-cov0', side === 0); bt.classList.toggle('bs-cov1', side === 1);
}
paintInsp = function (R) {
  const box = document.getElementById('btInsp'); if (!box) return;
  if (!S.insp || !R || !R.b) { box.hidden = true; box.__h = ''; bsCover(-1); return; }
  const [sd, i] = S.insp.split(':').map(Number), u = R.b.u[sd] && R.b.u[sd][i];
  if (!u) { box.hidden = true; bsCover(-1); return; }
  box.hidden = false;
  box.classList.add('bs-insp');
  box.classList.toggle('on-l', sd === 1); box.classList.toggle('on-r', sd === 0); box.classList.toggle('unk', !unitKnown(u));
  bsCover(1 - sd);
  const h = bsInspHtml(R, u);
  if (box.__h !== h) { box.innerHTML = h; box.__h = h; }
};
function bsInspHtml(R, u) {
  const b = R.b, rounds = b.mode === 'rounds', d = R.disp[dkey(u)] || { hp: u.hp, sh: u.sh, dead: !u.alive };
  const kn = unitKnown(u), T = bsTypeOf(R, u), close = `<button class="iconbtn x" data-a="insp" data-v="${dkey(u)}" aria-label="Закрыть">${ic('x')}</button>`;
  const face = bsFullFrame(T.t, unitFace(u, true), BS_DATA.inspFace);
  const hpPct = Math.max(0, Math.min(100, d.hp * 100 / u.maxHp)), shPct = Math.min(100, d.sh * 100 / u.maxHp);
  const hpBar = `<div class="bsi-hp"><div class="bar hp lg" style="--v:${hpPct}"><span class="sh" style="left:0;width:${shPct}%"></span><i></i></div><span class="n">${ICON('hp', 15, 'Здоровье')}<b>${fmt(Math.max(0, d.dead ? 0 : d.hp))}</b> / ${fmt(u.maxHp)}</span>${d.sh > 0 && !d.dead ? `<span class="shp">${ic('shield')}<b>${fmt(d.sh)}</b><small>щит</small></span>` : ''}</div>`;
  const imm = u.side && u.rank ? EB.RULES.resist[u.rank] || 0 : 0, rn = bsRoundsOf(R, u);
  const chips = [
    u.side ? `<span class="chip ${imm ? 'warn' : ''}" title="Иммунитет к контролю по рангу: такая доля контроля не ложится"><img class="ico" src="${bsStUrl('immune')}" width="14" height="14" alt="">иммунитет к контролю ${pctBp(imm)}</span>` : '',
    rn ? `<span class="chip" title="Раундов в бою с таким врагом — таблица раундов по типу">${ic('hour')}${R.kind === 'pvp' ? 'арена' : T.name.toLowerCase()} — бой ${rn} ${roundWord(rn)}</span>` : '',
    u.max0 && u.max0 > u.maxHp ? `<span class="chip gold" title="Осада: враг пришёл с остатком здоровья прошлых попыток — это его максимум сейчас">осада · было ${fmt(u.max0)}</span>` : '',
    d.dead ? '<span class="chip warn">пал</span>' : '',
  ];
  const trait = [u.rank === 'rune' && rounds ? 'обычная атака отнимает у боя раунд' : '', u.basicAll ? `обычная атака — по всем, по ${u.basicAll} %` : '',
    u.avers ? `неприязнь: +${pctBp(u.avers.bp)} урона по расе «${bsEsc(u.avers.race)}»` : ''].filter(Boolean).map(t => `<span class="chip">${t}</span>`);
  const at = kn ? attrList(u).filter(([k]) => k !== 'hp').map(([k, x]) => icoNum(k, x, ATTR_T[k], 15)).join('') : '';
  const side = chips.concat(trait).filter(Boolean).join('');
  /* левая колонка — кто это: портрет в рамке ранга, имя, здоровье и щит числом, характеристики, иммунитет и раунды типа */
  const head = `<header class="bsi-h">${face}<div class="bsi-id"><small class="bsi-rk">${bsEsc(T.name)}${kn ? ' · ' + bsEsc(u.cls) : ''}</small><b class="bsi-nm">${kn ? bsEsc(u.name) : 'Неизвестный противник'}</b><span class="bsi-sub">${kn ? `${CLS(u.cls, 14, u.cls)}${bsEsc(u.el)}${u.side && u.race ? ' · ' + bsEsc(u.race) : ''} · ур. ${u.lvl}` : 'имя и способности откроет первая победа'}</span></div></header>`;
  let foot = '';
  if (kn) {
    const opp = R.b.u[1 - u.side], j = targetOf(R.b, u);
    const th = opp.map((v, k) => [v, u.th[k]]).filter(([v]) => v.alive).sort((x, y) => y[1] - x[1]).slice(0, BS_DATA.threatTop).map(([v, t]) => `<span>${bsEsc(uName(v))} <b class="num">${fmt(t)}</b></span>`).join('');
    foot = `<section class="bsi-sec bsi-th"><h4>Угроза</h4><p><span>Цель: <b>${!d.dead && j >= 0 ? bsEsc(uName(opp[j])) : '—'}</b></span>${th}</p></section>`;
  }
  const left = `<div class="bsi-l">${head}${hpBar}${at ? `<div class="bsi-at">${at}</div>` : ''}${side ? `<div class="bsi-chips">${side}</div>` : ''}</div>`;
  /* правая колонка — что на нём сейчас и что он умеет: эффекты (есть — первыми), способности с шансом, пассивки и реакции, угроза */
  const sts = bsStatuses(u, d, rounds).filter(I => !d.dead);
  const stBox = sts.length ? `<section class="bsi-sec bsi-ef"><h4>Эффекты · ${sts.length}</h4>${sts.map(bsStRow).join('')}</section>` : '<section class="bsi-sec bsi-ef none"><h4>Эффекты · нет</h4></section>';
  if (!kn) return `${left}<div class="bsi-main">${stBox}</div>${close}`;
  let abs = '';
  if (rounds) {
    const fired = R.fired && R.fired.key === dkey(u) && R.view < R.fired.until ? R.fired.n : null;
    const rest = 10000 - (u.table || []).reduce((a, ab) => a + ab.ch, 0);
    abs = (u.table || []).map(ab => bsAbRow(ab, pctBp(ab.ch), fired === ab.n)).join('')
      + bsAbRow({ n: 'Обычная атака', d: u.basicAll ? `По всем противникам, по ${u.basicAll} % главной характеристики` : 'По цели угрозы — 100 % главной характеристики', kind: 'dmg',
        basic: u.basicAll ? 'all' : u.rank === 'rune' ? 'rune' : EB.fxOf(u, u.main) }, pctBp(rest), false);
  } else {
    abs = (u.abs || []).map(ab => bsAbRow(ab, null, false, { tag: `${ab.price} ${atkWord(ab.price)}` })).join('') + (u.ult ? bsAbRow(Object.assign({ ult: true }, u.ult), null, false, { tag: 'ульта' }) : '');
  }
  const pas = (u.lpas || []).map(p => bsAbRow(Object.assign({}, p, { kind: p.kind }), null, false,
    { tag: (p.kind === 'reaction' ? 'реакция' + (p.chR ? ' · ' + pctBp(p.chR) : '') : 'пассивка') + (u.usedBiome && u.usedBiome.includes(p.id) ? ' · сработала' : '') })).join('');
  const abBox = `<section class="bsi-sec bsi-ab"><h4>${rounds ? 'Способности · шанс в свой ход' : 'Способности'}</h4>${abs}${pas ? `<h4 class="sub">Пассивки и реакции</h4>${pas}` : ''}</section>`;
  return `${left}<div class="bsi-main">${sts.length ? stBox + abBox : abBox + stBox}${foot}</div>${close}`;
}

/* ================== 5. числа урона и лечения ================== */
/* окно сведений закрывает другую сторону поля: её числа и надписи не рисуем — они легли бы поверх окна */
const bsCovered = u => !!S.insp && +S.insp.split(':')[0] !== u.side;
flyAt = function (R, u, txt, cls, dy = 0) {
  const bt = document.getElementById('bt'), el = document.getElementById('bc' + u.side + u.i); if (!bt || !el || bsCovered(u)) return;
  const F = BS_DATA.fly;
  if (bt.querySelectorAll('.fly').length > F.max) return;
  const br = bt.getBoundingClientRect(), r = el.getBoundingClientRect(), sc = br.width / bt.clientWidth || 1;
  R.flyN = (R.flyN + 1) % 5;
  const crit = /\bcrit\b/.test(cls), num = /^[+−-]?[\d\s ]+/.test(txt) && !/abil|ult|info|miss/.test(cls);
  const e = document.createElement('span');
  e.className = 'fly ' + cls + (num ? ' num' : '') + ' s' + u.side;
  e.innerHTML = crit ? `<small>крит</small><b>${bsEsc(txt)}</b>` : `<b>${bsEsc(txt)}</b>`;
  const x = (r.left - br.left + r.width / 2) / sc + (R.flyN - 2) * F.spread, y = (r.top - br.top + r.height * .32) / sc + dy - R.flyN * 3;
  e.style.left = x + 'px'; e.style.top = y + 'px';
  const ms = (crit ? F.crit : F.ms) / devSpeed;
  bsDur(e, ms);
  bt.appendChild(e); setTimeout(() => e.remove(), ms + 60);
};

/* ================== 6. эффекты: сцена EnFx.scene и ход действия ================== */
fxFor = function () {
  const host = document.getElementById('btField'); if (!host) return null;
  if (!fxInst || fxInst.host !== host) { fxInst && fxInst.destroy(); fxInst = (EnFx.scene || EnFx.create)(host, { speed: () => devSpeed }); }
  return fxInst;
};
/* надпись способности над кастующим: иконка, имя и шанс; у ульты — крупно посреди поля с затемнением */
function bsCallout(R, u, ab, ch, ult) {
  const bt = document.getElementById('bt'), el = document.getElementById('bc' + u.side + u.i); if (!bt || !el || (ult ? !!S.insp : bsCovered(u))) return;
  const br = bt.getBoundingClientRect(), r = el.getBoundingClientRect(), sc = br.width / bt.clientWidth || 1;
  const icon = bsAbArt(ab, ult ? 44 : 22) || ic(ult ? 'crown' : typeof abIcon === 'function' ? abIcon(ab) : 'spark');
  const e = document.createElement('div');
  e.className = 'bs-call' + (ult ? ' ult' : '') + (u.side ? ' foe' : '') + ' s' + u.side;
  e.style.setProperty('--sc', SCHOOL_C[ab.school] || 'var(--gold)');
  e.innerHTML = ult ? `<span class="bsc-ic">${icon}</span><span class="bsc-tx"><small>${u.side ? 'Ульта врага' : 'Ульта'} · ${bsEsc(uName(u))}</small><b>${bsEsc(ab.n)}</b>${ch ? `<em>шанс ${pctBp(ch)}</em>` : ''}</span>`
    : `<span class="bsc-ic">${icon}</span><b>${bsEsc(ab.n)}</b>${ch ? `<em>${pctBp(ch)}</em>` : ''}`;
  const fld = document.getElementById('btField'), top = fld ? (fld.getBoundingClientRect().top - br.top) / sc + BS_DATA.callout.room : 0;
  if (!ult) { e.style.left = ((r.left - br.left + r.width / 2) / sc) + 'px'; e.style.top = Math.max(top, (r.top - br.top) / sc - 4) + 'px'; }
  const ms = (ult ? BS_DATA.callout.ult : BS_DATA.callout.ms) / devSpeed;
  bsDur(e, ms);
  bt.appendChild(e); setTimeout(() => e.remove(), ms + 60);
}
/* вспышка по портрету: белая при ударе, золотая при крите, зелёная при лечении — слой .fxl, только opacity */
function bsFlash(u, kind) {
  const el = document.getElementById('bc' + u.side + u.i), f = el && el.querySelector && el.querySelector('.fxl'); if (!f) return;
  f.className = 'fxl ' + kind; void f.offsetWidth; f.classList.add('go');
}
/* значок эффекта, который только что лёг: картинка медальона летит в свой столбик */
function bsStIcon(fx, R, e) {
  const t = e.t, el = document.getElementById('bc' + t.side + t.i); if (!el || !fx.icon) return;
  const x = (t.st || []).find(s => s.k === e.st && (e.st !== 'dot' && e.st !== 'hot' || s.school === e.school));
  const I = x ? bsSt(x, t, true) : null;
  if (I && I.icon) fx.icon(I.icon, el, I.good ? -1 : 1);
}
playAction = function (R, a) {
  const fx = fxFor(); if (!fx || !a.s) { syncDisp(R); paintCards(R); return; }
  const T = ms => ms / devSpeed, el = u => u && document.getElementById('bc' + u.side + u.i);
  const idx = a.ev.findIndex(e => e.k === 'swing' || e.k === 'cast' || e.k === 'skip');
  const pre = idx < 0 ? a.ev : a.ev.slice(0, idx), main = idx < 0 ? [] : a.ev.slice(idx);
  R.turnUntil = R.view + a.dur;
  const side = e => {
    if (e.k === 'react') { flyAt(R, e.s, e.n, 'abil', -26); feed(R, `<b>${uName(e.s)}</b> · <span class="gd">${e.n}</span>${e.t && e.t !== e.s ? ' → ' + uName(e.t) : ''}`); }
    else if (e.k === 'survive') { flyAt(R, e.t, 'на волоске', 'info'); el(e.t) && fx.revive && fx.revive(el(e.t)); }
    else if (e.k === 'revive') { flyAt(R, e.t, 'встал', 'heal'); el(e.t) && fx.revive && fx.revive(el(e.t)); feed(R, `<b>${uName(e.s)}</b> · <span class="sp">поднял</span> → ${uName(e.t)}`); }
    else if (e.k === 'steal') flyAt(R, e.t, e.st === 'shield' ? 'щит забран' : 'бафф забран', 'info');
    else if (e.k === 'doom') { flyAt(R, e.t, 'отложенный удар', 'info', -26); feed(R, `<b>${uName(e.s)}</b> · <span class="gd">отложенный удар</span> → ${uName(e.t)}`); }
    else if (e.k === 'unhurt') flyAt(R, e.t, 'лёд', 'info');
    else if (e.k === 'unstatus') flyAt(R, e.t, e.st === 'freeze' ? 'лёд спал' : 'очнулся', 'info');
    else if (e.k === 'cut') {   // РБ отнимает раунд (ADR-0020): надпись над стражем, строка ленты и вспышка часов
      flyAt(R, e.s, `−${EB.RULES.rounds.runeCut} раунд`, 'info', -26); feed(R, `<b>${uName(e.s)}</b> · обычная атака · <span class="gd">время скоротечно</span> · раундов в бою: ${e.n}`);
      const ck = document.getElementById('btClockBox'); if (ck) { ck.classList.remove('cut'); void ck.offsetWidth; ck.classList.add('cut'); }
    }
  };
  const die = e => { const t = el(e.t); if (t) { fx.death(t); t.classList.add('falling'); } feed(R, `<span class="bd">✝</span> <b>${uName(e.t)}</b>`); };
  // 1. урон и лечение со временем — в начале хода носителя
  for (const e of pre) {
    applyEv(R, e);
    if (e.k === 'dot' && el(e.t)) { fx.dot(el(e.t), e.school); flyAt(R, e.t, fmt(e.v), 'dmg small'); bsFlash(e.t, 'hit'); }
    else if (e.k === 'heal' && e.v > 0 && el(e.t)) { fx.hot(el(e.t)); flyAt(R, e.t, '+' + fmt(e.v), 'heal small'); }
    else if (e.k === 'die') die(e);
    else side(e);
  }
  const actor = el(a.s);
  if (!main.length || !actor) { if (!R.pending) syncDisp(R); paintCards(R); return; }
  const skill = a.kind === 'cast' || a.kind === 'mass' || a.kind === 'ult';
  pulse(a.s, 'act', T(a.dur * .6));
  if (skill) pulse(a.s, a.kind === 'ult' ? 'casting ult' : 'casting', T(a.kind === 'ult' ? 800 : 500));
  const sw = main.find(e => e.k === 'swing'), cs = main.find(e => e.k === 'cast');
  const aimAt = sw ? sw.t : cs && !cs.mass && cs.t.length && cs.t[0].side !== a.s.side ? cs.t[0] : null;
  if (aimAt) pulse(aimAt, 'struck', T(a.dur * .6));
  R.pending++;
  let hitDone = false;
  const impact = () => {
    if (hitDone) return; hitDone = true; R.pending--;
    for (const e of main) {
      applyEv(R, e);
      switch (e.k) {
        case 'hit':
          flyAt(R, e.t, fmt(e.v), e.crit ? 'crit' : e.t.side === 0 ? 'dmg' : 'foe');
          bsFlash(e.t, e.crit ? 'crit' : 'hit'); pulse(e.t, skill || e.crit ? 'shake' : 'hit', T(skill || e.crit ? 380 : 160));
          if (e.crit && el(e.t)) fx.crit(el(e.t));
          break;
        case 'miss': el(e.t) && fx.miss(el(e.t), e.t.side); flyAt(R, e.t, 'промах', 'miss'); break;
        case 'heal': if (!e.quiet && e.v > 0) { flyAt(R, e.t, '+' + fmt(e.v), e.crit ? 'heal crit-h' : 'heal'); bsFlash(e.t, 'heal'); } break;
        case 'shield': flyAt(R, e.t, '+' + fmt(e.v), 'shield'); break;
        case 'status': if (el(e.t)) {
          if (e.st === 'dot') fx.dot(el(e.t), e.school); else if (e.st === 'hot') fx.hot(el(e.t), e.school);
          else if (CTL.includes(e.st)) fx.ctrl(el(e.t), e.st); else if ((EB.GOOD_ST || []).includes(e.st)) fx.buff(el(e.t)); else fx.debuff(el(e.t), e.st);
          bsStIcon(fx, R, e);
        } break;
        case 'resist': el(e.t) && fx.resist(el(e.t), e.st); flyAt(R, e.t, 'иммунитет', 'info imm'); break;
        case 'dispel': el(e.t) && fx.dispel(el(e.t)); break;
        case 'unstatus': case 'react': case 'survive': case 'unhurt': case 'cut': case 'revive': case 'steal': case 'doom': side(e); break;
        case 'die': die(e); break;
      }
    }
    if (!R.pending) syncDisp(R);
    paintCards(R);
  };
  setTimeout(impact, T(a.dur * .9));   // страховка: к концу действия его итог показан всегда
  if (a.kind === 'skip') { fx.ctrl(actor, a.st || 'stun'); flyAt(R, a.s, SKIP_TXT[a.st] || 'оглушён', 'info'); impact(); return; }
  const sch = a.school || a.s.el;
  if (a.kind === 'attack' && a.all) {   // обычная атака по всем — приём Убер-босса (ADR-0025): волна по всему отряду
    const tEl = main.filter(e => e.k === 'swing').map(e => el(e.t)).filter(Boolean);
    feed(R, `<b>${uName(a.s)}</b> · <span class="gd">обычная атака по всем</span>`);
    if (!tEl.length) return impact();
    fx.wave(actor, tEl, null, i => { if (i === tEl.length - 1) impact(); }, a.s.el);
    return;
  }
  if (a.kind === 'attack') {
    const t = sw && el(sw.t);
    if (!t) return impact();
    if (a.fx === 'arrow') fx.arrow(actor, t, null, impact);
    else if (a.fx === 'magic') fx.bolt(actor, t, null, impact, false, a.s.el, EnFx.VFX_ART.basic);
    else fx.slash(t, null, impact, false);
    return;
  }
  const ab = a.ab, tEl = (cs ? cs.t : []).map(el).filter(Boolean);
  bsCallout(R, a.s, ab, a.round ? a.ch : 0, a.kind === 'ult');
  const chTxt = a.round && a.ch ? ' · ' + pctBp(a.ch) : '';
  feed(R, `<b>${uName(a.s)}</b> · <span class="${a.kind === 'ult' ? 'sp' : 'gd'}">${ab.n}</span>${chTxt}${a.kind === 'ult' ? ' · ульта' : ''}${targetsText(a.s, cs)}`);
  const last = i => i === tEl.length - 1 ? impact : null;
  const big = a.kind === 'ult';
  const go = () => {
    if (!tEl.length) return impact();
    switch (ab.kind) {
      case 'dmg': case 'farm':
        if (tEl.length > 1) fx.wave(actor, tEl, null, i => { if (i === tEl.length - 1) impact(); }, sch);
        else if (a.fx === 'arrow') fx.arrow(actor, tEl[0], null, impact);
        else if (a.fx === 'magic') fx.bolt(actor, tEl[0], null, impact, true, sch);
        else fx.slash(tEl[0], null, impact, true, sch);
        if (ab.drain) setTimeout(() => fx.drain(tEl[0], actor), T(520));
        break;
      case 'heal': case 'hot': tEl.forEach((t, i) => fx.heal(t, last(i), sch)); break;
      case 'shield': tEl.forEach((t, i) => fx.shield(t, last(i))); break;
      case 'revive': tEl.forEach((t, i) => { fx.revive(t); if (last(i)) setTimeout(impact, T(300)); }); break;
      case 'taunt': fx.taunt(actor, R.b.u[1 - a.s.side].filter(u => u.alive).map(el).filter(Boolean)); setTimeout(impact, T(480)); break;
      case 'buff': tEl.forEach((t, i) => { fx.buff(t); if (last(i)) setTimeout(impact, T(260)); }); break;
      default:
        if (tEl.length > 1) fx.wave(actor, tEl, null, i => { if (i === tEl.length - 1) impact(); }, sch);
        else fx.bolt(actor, tEl[0], null, impact, big, sch);
    }
  };
  if (a.kind === 'ult') { fx.ult(actor, null, sch); setTimeout(go, T(650)); } else go();
};

/* ================== 7. баннеры: этаж, элита, босс, страж, Эхо, «Раунд N» ================== */
/* вид баннера по колоде и главному врагу: этаж рядовых, элита, босс биома, рунный страж, бой со сценой — по рамке главного */
function bsBannerKind(R) {
  const lead = R.b && R.b.u[1][0];
  if (R.guard) return 'rune';
  if (R.kind === 'pvp') return 'pvp';
  if (lead && lead.lead) return typeof bfType === 'function' ? bfType(R, lead) : lead.rank || 'e';
  return 'floor';
}
function bsBanner(R) {
  const [t0, sub0] = R.banner || ['', ''], k = bsBannerKind(R), lead = R.b && R.b.u[1][0], isLead = !!(lead && lead.lead) && k !== 'floor' && k !== 'pvp';
  const imm = isLead && lead.rank ? EB.RULES.resist[lead.rank] || 0 : 0, mx = R.b ? R.b.maxRounds : 0;
  const tn = (typeof BF !== 'undefined' && BF.types[k] && BF.types[k].n) || '';
  /* забег по биому: над именем — вид врага и этаж, имя — главный враг; бой со сценой (Эхо, клан, Арена) — его собственная надпись */
  let eyebrow, title, sub;
  if (!R.scene && isLead) {
    const B = EB.BIOMES[R.biome] || {}, sg = !R.guard && lead.rank === 'b' && B.siege !== false && G(R.biome).hp != null && !R.demo ? `осада: снято ${siegeDone(R.biome)} %` : '';
    eyebrow = R.guard ? tn : `${tn} · этаж ${R.floor}`; title = uName(lead);
    sub = R.guard ? `${guardCards(R.biome)}${R.mode === 'rounds' ? ' · обычная атака стража отнимает раунд' : ''}` : [sg, R.demo ? TM('демо-прыжок') : ''].filter(Boolean).join(' · ');
  }
  else if (!R.scene) { eyebrow = 'Спуск'; title = t0; sub = sub0; }
  else { eyebrow = k === 'pvp' ? 'Арена' : tn; title = t0; sub = sub0; }
  const face = isLead ? bsFullFrame(k, unitFace(lead, true), 52) : '';
  const facts = [mx && !/раунд/.test(sub || '') ? `${mx} ${roundWord(mx)}` : '', imm ? `иммунитет к контролю ${pctBp(imm)}` : ''].filter(Boolean).map(t => `<i>${t}</i>`).join('');
  return `<div class="bt-banner bs-ban k-${k}${face ? ' has-face' : ''}">${face}<span class="pl" style="background-image:url('${bsArt(BS_ART.plaque)}')"><small>${bsEsc(eyebrow)}</small><b>${title}</b>${sub ? `<span class="sub">${sub}</span>` : ''}${facts ? `<span class="facts">${facts}</span>` : ''}</span></div>`;
}
roundFlash = function (n) {
  const bt = document.getElementById('bt'); if (!bt || S.insp || S.legend) return;
  const R = focusRun(), mx = R && R.b ? R.b.maxRounds : 0, last = mx && mx - n < BS_DATA.lastRounds;
  bsDropBanner(R);
  const e = document.createElement('div');
  e.className = 'bs-rflash' + (last ? ' last' : '');
  e.style.backgroundImage = `url('${bsArt(BS_ART.plaque)}')`;
  e.innerHTML = `<small>${last ? 'Последний раунд' : 'Раунд'}</small><b>${n}</b>${mx ? `<em>из ${mx}</em>` : ''}`;
  const ms = EB.RULES.rounds.gapMs / devSpeed;
  bsDur(e, ms);
  bt.appendChild(e); setTimeout(() => e.remove(), ms + 50);
};

/* ================== 8. ритуал этажа: выход врагов, падение, добыча в кошелёк, переход ==================
   ADR-0044: взятый этаж не короче своего ритуала — ядро дотягивает время боя b.t до RULES.floor.minMs (ritualMs — добавка), время
   ритуала держит screens/biomes.js: пока он идёт, хода боя нет, конец этажа (floorDone) — не раньше b.t, и на экране, и у свёрнутого
   забега. Здесь — что видно: враги выходят по очереди (RULES.floor.ritual.enterMs в advance index.html), после последнего удара —
   «Этаж взят», добыча летит в кошелёк, песок тает до конца этажа, затем плашка перехода. Фазы показа — RULES.floor.ritual */
const BS_RUN = { skipMagnet: false };
/* выход: шаг между картами врагов — из данных (--bs-step для .bt-side.f.enter, battle-scene.css); на первой отрисовке нового этажа
   у каждого врага — облако пыли, у главного — лучи, по очереди через stepMs */
window.addEventListener('en-render', () => {
  const R = typeof focusRun === 'function' ? focusRun() : null;
  if (!R || !R.b || S.route !== 'battle') return;
  const bt = document.getElementById('bt'), Q = bsRit();
  if (bt && bt.style) bt.style.setProperty('--bs-step', Q.stepMs + 'ms');
  if (!R.enter || R.__enterFx === R.b) return;
  R.__enterFx = R.b;
  const fx = fxFor(); if (!fx || bsCalm()) return;
  R.b.u[1].forEach((u, i) => setTimeout(() => {
    const el = document.getElementById('bc1' + i); if (!el || !fx.flip) return;
    const b = fx.center(el);
    fx.flip('puff', { x: b.x, y: b.y + b.h * .35, w: b.w, h: b.h }, 1500, 700);
    if (u.lead) fx.pop('rays', b, 1900, 900, { s0: .3, s1: 1.1, op: .8 });
  }, (Q.stepMs * i + Q.enterMs * .25) / devSpeed));
});
/* «Этаж взят»: плашка, добыча над павшими и в кошелёк, песок до спуска — до b.t, конца этажа по ядру */
function bsRitual(R) {
  const b = R.b, bt = document.getElementById('bt'), Q = bsRit(); if (!bt) return;
  const left = Math.max(0, b.t - R.view) / devSpeed;
  bsDropBanner(R);   // пока идёт ритуал, ход боя стоит — баннер этажа сам не снимется (advance index.html)
  const e = document.createElement('div'); e.className = 'bs-taken';
  e.innerHTML = `<span class="pl" style="background-image:url('${bsArt(BS_ART.plaque)}')"><small>Этаж ${R.guard ? 'стража' : R.floor}</small><b>Этаж взят</b><span class="sand"><i style="animation-duration:${Math.round(left)}ms;--bs-d:${Math.round(left)}ms"></i></span></span>`;
  bsDur(e, left + 300);
  bt.appendChild(e); setTimeout(() => e.remove(), left + 400);
  if (R.guard || R.scene) return;
  /* та же добыча, что зачислит floorDone: ядро, свой поток генератора, цикл и артефакты игрока (lootCtx) — «+N» сходится с кошельком */
  const fl = R.floor, got = EB.floorLoot(R.biome, fl, b, typeof lootCtx === 'function' ? lootCtx() : null);
  R.bsLoot = got;   // что показано в ритуале — проверка сверяет с тем, что зачислил floorDone
  setTimeout(() => { if (R.floor === fl && !R.over) { bsLootFly(got); R.bsLootShown = fl; } }, Q.takenMs / devSpeed);
}
/* что летит из добычи этажа: валюта кошелька и рунный ключ (с босса биома, с цикла II — ADR-0044) */
const BS_LOOT = ['gold', 'spirit', 'souls', 'runeKeys'];
const bsLootImg = k => CUR[k === 'runeKeys' ? 'keys' : k].img;
/* добыча летит в кошелёк: вспышка над врагами, плашка «+N», монеты к кошельку — прежний полёт index.html; рунный ключ — к кошельку,
   своего места в шапке у него нет */
function bsLootFly(got) {
  const side = document.querySelector('.bt-side.f'), fx = fxFor();
  if (!got || !BS_LOOT.some(k => got[k] > 0)) return;
  if (side && fx && !bsCalm()) { const b = fx.center(side); fx.pop('rays', { x: b.x, y: b.y, w: 90, h: 90 }, 1600, bsRit().lootMs, { s0: .3, s1: 1.2, op: .7 }); }
  const bt = document.getElementById('bt');
  if (bt) {
    const e = document.createElement('div'); e.className = 'bs-loot';
    e.innerHTML = BS_LOOT.filter(k => got[k] > 0).map(k => `<span class="${k}"><img src="${bsLootImg(k)}" alt="">+${fmt(got[k])}${k === 'runeKeys' ? ` <small>${got[k] === 1 ? 'рунный ключ' : 'рунных ключа'}</small>` : ''}</span>`).join('');
    const ms = bsRit().lootMs * 2 / devSpeed;
    bsDur(e, ms);
    bt.appendChild(e); setTimeout(() => e.remove(), ms + 60);
  }
  bsMagnet0(got);
  if (got.runeKeys > 0) bsKeyFly(got.runeKeys);
}
/* рунный ключ летит к кошельку и гаснет — как монеты магнита: transform и opacity; «меньше движения» — только вспышка на месте */
function bsKeyFly(n) {
  const from = document.querySelector('.bt-side.f'), to = document.querySelector('.g-wallet'); if (!from || !to) return;
  const fr = from.getBoundingClientRect(), tr = to.getBoundingClientRect(), calm = bsCalm();
  for (let i = 0; i < Math.min(n, BS_DATA.keyFly); i++) {
    const el = document.createElement('img'); el.src = bsLootImg('runeKeys'); el.alt = ''; el.className = 'coin-fly bs-key';
    const x0 = fr.left + fr.width / 2 + i * 12, y0 = fr.top + fr.height * .4;
    el.style.left = x0 + 'px'; el.style.top = y0 + 'px'; document.body.appendChild(el);
    const dx = tr.left + tr.width / 2 - x0, dy = tr.top + tr.height / 2 - y0;
    el.animate(calm ? [{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 0 }]
      : [{ transform: 'translate(0,0) scale(.6)', opacity: 0 }, { transform: 'translate(0,-18px) scale(1.25)', opacity: 1, offset: .25 }, { transform: `translate(${dx}px,${dy}px) scale(.7)`, opacity: 0 }],
    { duration: bsRit().lootMs * 2 / devSpeed, delay: i * 120, easing: 'cubic-bezier(.5,0,.9,.45)', fill: 'forwards' }).onfinish = () => el.remove();
  }
}
const bsMagnet0 = magnet;
magnet = function (got) {
  if (BS_RUN.skipMagnet) { for (const k of ['gold', 'spirit', 'souls']) if (got && got[k] > 0) bumpCur(k); return; }   // добыча уже прилетела в ритуале — только числа кошелька (у ключа числа в шапке нет)
  bsLootFly(got);
};
/* после последнего удара взятого этажа с ритуалом — «Этаж взят» и добыча */
const bsAdvance0 = advance;
advance = function (R, ms) {
  bsAdvance0(R, ms);
  const b = R.b;
  if (b && b.over && b.win && b.ritualMs > 0 && R.bsRit !== b && !R.over) { R.bsRit = b; if (visible(R)) bsRitual(R); }
};
/* конец этажа (его время — screens/biomes.js): добыча, уже прилетевшая в ритуале, второй раз не летит; переход — плашка «Этаж N пройден»
   на долю паузы между этажами */
const bsFloorDone0 = floorDone;
floorDone = function (R, vis) {
  const fl = R.floor;
  BS_RUN.skipMagnet = R.bsLootShown === fl;
  try { bsFloorDone0(R, vis); } finally { BS_RUN.skipMagnet = false; }
  if (!vis || !(R.gap > 0) || S.insp || S.legend) return;
  const bt = document.getElementById('bt'); if (!bt) return;
  const e = document.createElement('div'); e.className = 'bs-transit';
  e.style.backgroundImage = `url('${bsArt(BS_ART.plaque)}')`;
  e.innerHTML = `<small>Этаж ${fl} пройден</small><b>Спуск ниже</b>`;
  const ms2 = EB.RULES.floor.gapMs * BS_DATA.transitPct / 100 / devSpeed;
  bsDur(e, ms2);
  bt.appendChild(e); setTimeout(() => e.remove(), ms2 + 60);
};

/* ================== 9. итог этажа и забега, окно «Стена» — герб над окном ================== */
const BS_RES = { boss: 'win', guardWin: 'win', siege: 'wall', wall: 'wall', guardLose: 'wall', abort: '' };
const bsResult0 = OV.result;
OV.result = function (o) {
  const html = bsResult0.call(this, o), R = runById(o.arg) || focusRun();
  const k = R && R.end ? BS_RES[R.end.kind] : '';
  if (!html || k == null) return html;
  const crest = k ? `<span class="bs-crest ${k}" style="background-image:url('${bsArt(BS_ART.crest[k])}')" aria-hidden="true"></span>` : '';
  return html.replace('<div class="dlg fit ', `<div class="dlg fit bs-res${k ? ' bs-' + k : ''} `).replace('<div class="dlg-h">', crest + '<div class="dlg-h">');
};

/* ================== 10. легенда «Знаки» — новый вид ================== */
const bsLegend0 = legendHtml;
legendHtml = function (mode) {
  const h = bsLegend0(mode);
  if (mode !== 'rounds') return h;
  const ex = I => bsSi(I);
  const dot = { key: 'dot', icon: bsArt('st/st-fire-dot.webp'), vec: 'flame', name: 'Горение', good: false, ctl: false, line: 'урон в начале хода', left: 2, left0: 3, stacks: 3 };
  const buff = { key: 'guard', icon: bsArt('st/st-earth-buff.webp'), vec: 'shield', name: 'Каменная кожа', good: true, ctl: false, line: '−25 % получаемого урона', left: 1, left0: 2, stacks: 1 };
  const ctl = { key: 'stun', icon: bsArt('st/st-steel-ctrl.webp'), vec: 'chain', name: 'Оглушение', good: false, ctl: true, line: 'пропускает ход', left: 1, left0: 1, stacks: 1 };
  const plate = `<span class="bs-lg-hp"><span class="bar hp" style="--v:72"><span class="sh" style="left:0;width:18%"></span><b class="hpn">4 063</b><b class="shn">850</b><i></i></span></span>`;
  const ours = `<span class="h">Карта</span>
    <span class="ex">${plate}</span><span>Здоровье — числом на плите рамки, синее число — щит: он тратится первым.</span>
    <span class="ex"><span class="rot"><span class="ch" style="--sc:var(--earth)">${ic('target')}<b>20</b></span><span class="ch on" style="--sc:var(--earth)">${ic('crack')}<b>20</b></span><span class="ch u" style="--sc:var(--gold)">${ic('crown')}<b>8</b></span></span></span><span>Шанс способности в свой ход, %. Сработавшая светится, над картой — её значок и имя.</span>
    <span class="ex"><span class="bt-queue static"><i class="done"></i><i class="now"></i><i class="f"></i><i></i></span></span><span>Очередь раунда: золото — ходит, его карта светится; бледные — сходили.</span>
    <span class="ex"><span class="bs-lg-rnd">3</span></span><span>Раунд из стольких, сколько даёт тип врага. После последнего — «Время скоротечно…»: этаж не взят.</span>
    <span class="ex"><span class="frame"></span></span><span>В карту целятся противники, ×N — сколько.</span>
    <span class="h">Эффекты</span>
    <span class="ex">${ex(buff)}</span><span>Слева — полезные. Внизу справа — сколько раундов осталось, кольцо тает вместе с ними.</span>
    <span class="ex">${ex(dot)}</span><span>Справа — вредные. Вверху справа — стаки. Что делает эффект и кто наложил — нажатием на карту.</span>
    <span class="ex">${ex(ctl)}</span><span>Контроль — ещё и знак на верхней планке: карта пропускает ход или слабеет.</span>
    <span class="ex"><img class="ico" src="${bsStUrl('immune')}" width="22" height="22" alt=""></span><span>Иммунитет к контролю — у сильных врагов по рангу: «иммунитет» над картой — контроль не лёг.</span>
    <span class="h">Числа</span>
    <span class="ex bs-lg-num"><b class="bsn-d">1 240</b><b class="bsn-c">крит 2 980</b></span><span>Урон — крупно, крит — золотом и с «крит».</span>
    <span class="ex bs-lg-num"><b class="bsn-g">+860</b><b class="bsn-s">+400</b></span><span>Лечение — зелёным, щит — синим.</span>`;
  return h.replace(/<span class="h">Карта · раунды<\/span>[\s\S]*?(?=<span class="h">Рамка<\/span>|$)/, ours);
};

/* ================== UI-кит: эффекты боя — новый вид ================== */
kitFx = function (kind) {
  const st = document.getElementById('fxStage'); if (!st) return;
  if (!kitFxInst || kitFxInst.host !== st) { kitFxInst && kitFxInst.destroy(); kitFxInst = EnFx.scene(st, { speed: () => 1 }); }
  const f = kitFxInst, h1 = st.querySelector('#kh1'), h2 = st.querySelector('#kh2'), foes = [...st.querySelectorAll('.bc.foe')].sort((a, b) => a.offsetLeft - b.offsetLeft), t = foes[0], kf = st.querySelector('#kf2');
  const sch = ['Огонь', 'Земля', 'Воздух', 'Тьма', 'Вода', 'Свет', 'Время'];
  switch (kind) {
    case 'slash': f.slash(t, null, null, true); break;
    case 'arrow': f.arrow(h2, kf); break;
    case 'bolt': sch.forEach((s, i) => setTimeout(() => f.bolt(h1, foes[i % foes.length], null, null, false, s), i * 420)); break;
    case 'wave': f.wave(kf, [h1, h2], null, null, 'Воздух'); break;
    case 'heal': f.heal(h1); break;
    case 'hot': f.hot(h1); setTimeout(() => f.hot(h1), 500); break;
    case 'shield': f.shield(h1); setTimeout(() => f.shield(h2), 180); break;
    case 'taunt': f.taunt(h1, foes); break;
    case 'dot': sch.concat('класс').forEach((s, i) => setTimeout(() => f.dot(foes[i % foes.length], s), i * 380)); break;
    case 'debuff': f.debuff(t, 'weak'); setTimeout(() => f.icon(bsStUrl('weak'), t, 1), 200); break;
    case 'ctrl': ['stun', 'silence', 'stop', 'freeze', 'terror', 'paralyze'].forEach((k, i) => setTimeout(() => f.ctrl(foes[i % foes.length], k), i * 420)); break;
    case 'drain': f.drain(t, h2); break;
    case 'dispel': f.shield(h1); setTimeout(() => f.dispel(h1), 700); break;
    case 'ult': f.ult(h2, null, 'Тьма'); setTimeout(() => f.wave(h2, foes, null, null, 'Тьма'), 650); break;
    case 'crit': f.slash(t, null, () => f.crit(t), true); break;
    case 'miss': f.miss(kf, 1); break;
    case 'resist': f.resist(t, 'stun'); break;
    case 'death': f.death(kf); break;
    case 'boom': f.flip('boom', f.center(t), 2000, 600); setTimeout(() => f.flip('burst', f.center(kf), 1900, 560), 500); setTimeout(() => f.flip('puff', f.center(foes[2] || t), 1900, 800), 1000); break;
    case 'status': f.icon(bsStUrl('dot-Огонь') || bsArt('st/st-fire-dot.webp'), t, 1); setTimeout(() => f.icon(bsStUrl('guard'), h1, -1), 400); break;
    case 'target': h1.classList.add('aimed'); t.classList.add('struck'); setTimeout(() => t.classList.remove('struck'), 700); setTimeout(() => h1.classList.remove('aimed'), 2600); break;
    case 'cast': h2.classList.remove('casting'); void h2.offsetWidth; h2.classList.add('casting'); setTimeout(() => h2.classList.remove('casting'), 520); setTimeout(() => f.heal(h1), 220); break;
    case 'shake': f.bolt(h1, t, null, () => { t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake'); setTimeout(() => t.classList.remove('shake'), 400); }, true, 'Время'); break;
    case 'hp': f.slash(t, null, null, false); break;
  }
};

/* ================== сценарии презентации: бой каждого вида ================== */
FLOWS.push(['Бой AAA · рядовые', 'Сцена боя нового вида: этаж рядовых, ритуал этажа — враги выходят, падают, добыча летит в кошелёк, переход', () => {
  S.overlay = null; if (typeof bfView === 'function') bfView('square');
  const sq5 = S.squads.find(q => q.m.filter(Boolean).length >= 5 && q.m.filter(Boolean).every(id => !runOf(id) && !(H(id) || {}).busy)) || S.squads[0];
  startRun(sq5.id, 'b3', EB.BIOMES.b3 ? EB.BIOMES.b3.floors.findIndex(f => f.g === 'o' && f.m.length >= 4) + 1 || 1 : 1);
}]);
FLOWS.push(['Бой AAA · сведения карты', 'Нажатие на карту врага: способности с иконкой и шансом, эффекты — что делают, сколько раундов, кто наложил', () => {
  S.overlay = null; if (typeof bfView === 'function') bfView('square');
  const sq5 = S.squads.find(q => q.m.filter(Boolean).length >= 5 && q.m.filter(Boolean).every(id => !runOf(id) && !(H(id) || {}).busy)) || S.squads[0];
  startRun(sq5.id, 'b3', 30); S.insp = '1:0';
}]);

/* ================== UI-кит ================== */
KIT_FILES['battle-scene.js'] = 'Бой AAA: сцена, окна, эффекты';
KIT_EXTRA.push({
  html: () => {
    /* все медальоны: эффекты ядра по ключу и урон и лечение со временем каждой школы */
    const st = Object.entries(BS_DATA.st).concat([...new Set(Object.values(BS_DATA.school))].flatMap(s => [['dot · ' + s, `st-${s}-dot`], ['hot · ' + s, `st-${s}-hot`]]));
    const med = st.map(([k, p]) => `<figure class="bs-k-st"><img src="${bsArt('st/' + p + '.webp')}" alt="" loading="lazy" decoding="async"><figcaption>${bsEsc(k)}</figcaption></figure>`).join('');
    const L = bsEff(), rows = Object.entries(L).map(([k, E]) => `<tr><td>${bsEsc(E.school)}</td><td>${bsEsc(E.kind)}</td><td><b>${bsEsc(bsCap(E.name))}</b></td><td>${bsEsc(E.desc)}</td><td>${bsEsc(k)}</td></tr>`).join('');
    const fr = BS_ART.frames.map(t => `<figure class="bs-k-fr">${bsFullFrame(t, `<img src="${bsArt(BF.types[t].kit)}" alt="">`, 72)}<figcaption><b>${t === 'hero' ? 'Герой' : bsEsc(BF.types[t].n)}</b></figcaption></figure>`).join('');
    const abu = Object.entries(BS_ART.abUnique).map(([id, s]) => `<figure class="bs-k-ab"><img src="${bsArt('abu/' + s + '.webp')}" alt="" loading="lazy" decoding="async"><figcaption>${bsEsc(id)}</figcaption></figure>`).join('')
      + Object.entries(BS_ART.abIcons.basic).map(([k, p]) => `<figure class="bs-k-ab"><img src="${bsArt(p)}" alt="" loading="lazy" decoding="async"><figcaption>обычная атака · ${bsEsc(k)}</figcaption></figure>`).join('');
    const vx = (EnFx.VFX_ART ? EnFx.VFX_ART.ready : []).map(k => `<figure class="bs-k-vx"><span style="background-image:url('${bsArt('vfx/' + k + '.webp')}')"></span><figcaption>${bsEsc(k)}</figcaption></figure>`).join('');
    const Q = bsRit(), KN = { o: 'рядовые', e: 'элита', b: 'босс', guard: 'страж' }, mm = Object.keys(KN).map(k => `${KN[k]} — ${bsMinMs(k) != null ? fmt(bsMinMs(k)) + ' мс' : 'нет данных'}`).join(', ');
    return `<section class="k-box" style="grid-column:1/-1"><h3>Бой AAA · рамки ранга — рисованные</h3>
      <div class="k-demo bs-k-frs">${fr}</div>
      <p class="k-note">Квадратная рамка ранга — генерация 01.10.2026 (tools/art-gen/jobs/battle-frames-square.json). На карте боя — тело рамки нарезкой border-image и венец, вписанный в полосу над картой (tools/art-gen/frame_square.py); целиком — в окне сведений и на баннере главного врага. Нижняя плита — полоса здоровья с числом.</p></section>
    <section class="k-box" style="grid-column:1/-1"><h3>Значки эффектов · ${st.length}</h3>
      <div class="k-demo bs-k-sts">${med}</div>
      <p class="k-note">Медальоны (jobs/battle-status-icons.json): по пять эффектов восьми школ — урон и лечение со временем, контроль, дебафф, бафф — и особые. На карте — 16 px с кольцом длительности, раундами и стаками; в окне сведений — 30 px с именем, действием, остатком раундов и тем, кто наложил. Слева — полезные, справа — вредные, «+N» — сколько не встало.</p>
      <table class="k-tbl bs-k-tbl"><tr><th>Школа</th><th>Вид</th><th>Имя</th><th>Что делает</th><th>Ключ</th></tr>${rows}</table></section>
    <section class="k-box" style="grid-column:1/-1"><h3>Иконки боя вне библиотеки · ${Object.keys(BS_ART.abUnique).length + Object.keys(BS_ART.abIcons.basic).length}</h3>
      <div class="k-demo bs-k-abs">${abu}</div>
      <p class="k-note">Уникальные способности — Убер-боссы девяти недель, Забытый, Многоликий, боссы, элита и стражи биомов (jobs/ability-icons-unique.json), и обычная атака по виду удара (jobs/battle-ability-icons.json): та же манера, что иконки библиотеки. Видны в окне карты изученного врага и над кастующим.</p></section>
    <section class="k-box" style="grid-column:1/-1"><h3>Эффекты боя · рисованные спрайты · ${(EnFx.VFX_ART || { ready: [] }).ready.length}</h3>
      <div class="k-demo bs-k-vxs">${vx}</div>
      <p class="k-note">Спрайты и flipbook-ленты (jobs/battle-vfx.json, tools/art-gen/vfx_layers.py): альфа из яркости, только transform и opacity, при «меньше движения» — без полётов и тряски. Каталог видов и проба на сцене — блок «Бой: карта бойца и эффекты».</p></section>
    <section class="k-box"><h3>Ритуал этажа</h3><p class="k-note">Враги выходят ${fmt(Q.enterMs)} мс, по очереди через ${fmt(Q.stepMs)} мс. После последнего удара — «Этаж взят», через ${fmt(Q.takenMs)} мс добыча летит в кошелёк (${fmt(Q.lootMs)} мс), песок тает до минимума этажа — ${mm}; затем переход ${fmt(EB.RULES.floor.gapMs)} мс. Бой длиннее минимума доигрывает последний удар ${fmt(Q.fallMs)} мс. Свёрнутый забег ждёт тот же минимум. Числа — RULES.floor ядра: minMs подбирает калькулятор фарма (ADR-0044), ritual — фазы показа.</p></section>`;
  },
});
