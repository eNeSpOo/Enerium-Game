/* screens/bag.js — «Ремесло → Запасы», сундуки и «Дары путешествия». Договор — screens/model.js: запасы S.bag и BAG,
   найденные рецепты, сундуки S.bag.chests, призывы ACTIVATE. Своё состояние — S.zp, заводится так же, как S.bag в model.js.
   Вид — по «Правилам воздуха» UI-кита: одна рамка, одно главное действие, подробности — в листе по нажатию, лор свёрнут.
   Запасы по §14.3 и словам автора 29.09.2026 — семь вкладок: ресурсы; руны и ключи; осколки — героев и шарды рабочих; призывы —
   руины, крафтовые боссы, Многоликий («ветка активации — это категория призывов»); сундуки — только сундуки; талисманы — своя
   категория; снаряжение. Артефактов в запасах нет: это умения аккаунта, они живут в «Страннике». Над сеткой — поиск и «Фильтры»:
   цикл, ремесло, редкость, «не в найденных рецептах», у талисманов — вид и «подходит классу», у снаряжения — слот; сами фильтры — в листе.
   Сетка — слова автора 29.09.2026: 6 столбцов, видно 5 рядов, дальше прокрутка; в клетке только значок и число, без имени — всё
   описание в карточке справа по выбору. Значки талисманов, снаряжения и осколков героя — арт screens/art-icons.js, редкость — рамкой.
   Карточка ресурса: значок, имя, кристалл редкости, количество, одно действие. Описание (лор) свёрнуто в две строки, под ним —
   пометка Этриона: загадка §14.3, где вещь пригодится (поле hint, crHint — screens/crafthall.js);
   «Найденные рецепты» (BAG.knownUses) и «Откуда падает» — листы по нажатию. Пометка «новое» — точкой в сетке и в карточке.
   Сундук — карточка §14.4: тип, редкость, количество и «Открыть»; выбор количества и итог — в ней же, итог крупно. Плитка сундука —
   рисованный сундук своего вида: корпус и крышка слоями (CO_ART, screens/chest-open.js); пока слой не выгружен — прежний значок.
   Состав и шансы — лист по нажатию (EnLoot.resolve). Открытие — EnLoot.roll на сиде сундука. В игре сид выдаёт сервер
   вместе с сундуком, итог открытия — тоже его (§34.1, §36.16). Осколки пробуждённых героев уходят в прах (§15.2) — EnLoot.toDust.
   Запись снаряжения создаёт предмет «сервер» снаряжения (EQ_SRV.fromChest, screens/equipment.js): сид сундука и номер записи.
   Открытие — операция с номером (zpOpen, S.zp.ops): выдача до показа, повтор номера ничего не выдаёт; показывает итог окно
   открытия screens/chest-open.js — анимация, пачка, «Пропустить анимацию»; после окна итог остаётся в карточке.
   Где что лежит: талисманы и шарды рабочих — S.zp.extra, ключи «tal:номер:редкость» и «wsh:id:редкость» (их же читает лист талисманов
   screens/talismans.js и лист «Артель» ритуалов screens/rituals.js); снаряжение — S.eq.items экземплярами (screens/equipment.js); ларцы
   крафта — S.bag.items, во вкладке своей категории. Шарды рабочих: карточка — одно действие «В артель», там рабочего пробуждают за души.
   Талисманы: карточка — значок, эффект, привязка к классу, «К герою» — выбор героя и переход в его лист талисманов.
   Снаряжение: карточка — слот, редкость, главная строка, на ком надет; «Свойства и сравнение», «Надеть» с выбором героя.
   «Перековка» у талисмана и предмета — переход в окно «Ремесло → Перековка» (screens/reforge.js) своим режимом и редкостью.
   Дары путешествия по §23.1: две категории — личный рейтинг и клановые награды; история полученного — отдельным видом.
   Строка выплаты — режим и планка или место, период, состав и одно действие; основание выплаты — в подсказке строки,
   цикл — в сумме сверху. Прошлая неделя подсчитана — её строки по lbGiftRows UI-кита (типичная неделя EN_LOOTBOXES.modes);
   эта неделя — только взятые планки из состояния режимов (реестр Недели, EN_WEEK.state; ADR-0031, п. 16), места — рейтинги недели.
   «Получить» переносит закрытые сундуки в запасы (BAG.addChest); открывают их только в запасах.
   Демо-числа — ZP_DEMO, числа вида — ZP_VIEW. Служебное — только команде: TM, PL, tmT из index.html.
   Автопроверка без браузера — tools/content-gen/screens/check_bag.js. */
'use strict';

/* ================== данные демо ================== */
const ZP_DEMO = {
  /* «новое» на старте: предметы запасов, сундуки (номер в DEMO_BAG.chests, с единицы) и герои с осколками, которых игрок ещё не открывал */
  fresh: { items: ['u2', 'find_cb1', 'call_fb1', 'many'], chests: [5, 7], heroes: ['c2-51'] },
  /* осколки героев на старте: отряды Эхо недель дворфов и эльфов, возрождение душ цикла II. В игре — сундуки, прокрутка и каталог праха */
  shards: { 'c2-48': 50, 'c2-51': 38, 'c2-42': 12 },
  /* «Дары путешествия»: прошлая неделя подсчитана — чья она: typical из EN_LOOTBOXES.modes: free — обычный игрок, fan — увлечённый;
     личные места по режимам (id режима → место); её личные планки уже получены и лежат в истории.
     Эта неделя — только взятые планки: их сообщает экран режима (EN_WEEK.state), места — из рейтингов S.ranks.
     gate — режимы, закрытые для аккаунта: id режима → (состояние, неделя «Даров») => причина или ''. Лигу без 15 героев не играли и раньше —
     героев не бывает меньше; Лигу, открытую на этой неделе, не играли на прошлой (демо, 11-й день цикла II: 15-й герой — на 9-й день).
     Причину даёт экран режима (screens/arena.js) */
  gifts: { who: 'free', prevPlaces: { echo: 212, contract: 41, arena: 95 }, gate: {} },
  /* сценарий «Запасы · талисманы»: какой ларец талисманов показать — его создают рецептом в мастерской */
  flow: { talCasket: 'chest_tal5' },
};
/* числа вида, не баланса */
const ZP_VIEW = {
  fold: 84,      // загадка и лор длиннее стольких знаков — свёрнуты в две строки с «ещё», короче — видны целиком
  cellArt: 40,   // арт значка в клетке сетки и в шапке карточки, px: размер картинки, клетку и рамку задаёт bag.css
};

/* ================== справочники экрана ================== */
/* семь вкладок: подпись — коротко, чтобы семь вкладок и «Дары» уместились в 844 px; полное имя — в подсказке */
const ZP_TABS = [['res', 'Ресурсы'], ['rune', 'Руны и ключи'], ['shard', 'Осколки'], ['call', 'Призывы'], ['chest', 'Сундуки'], ['tal', 'Талисманы'], ['eq', 'Снаряжение']];
const ZP_TAB_TIP = { shard: 'Осколки героев и шарды рабочих', call: 'Призывы: руины, крафтовые боссы, Многоликий' };
/* ярус предмета → вкладка; всё остальное — ресурсы. Ветка активации — категория призывов */
const ZP_TAB_OF = { rune: 'rune', vshard: 'rune', valor: 'rune', act: 'call', call: 'call', echo: 'call' };
/* ларцы крафта — во вкладке своей категории; ларцы снаряжения берутся из EN_EQUIPMENT.rules.caskets */
const ZP_CASKET = { chest_tal5: 'tal', chest_tal6: 'tal' };
/* группы — порядок клеток в сетке: подряд лежит похожее; у осколков — по источнику героя, у талисманов — по виду, у снаряжения — по слоту.
   Подписи групп — имена для команды: в сетке заголовков нет, она — только значки и числа */
const ZP_GRP = [
  ['basic', 'Базовые · общий пул'], ['key', 'Ключи ремёсел'], ['unique', 'Уникальные'], ['craftres', 'Ресурсы руин'], ['find', 'Находки руин'],
  ['trophy', 'Трофеи'], ['part', 'Заготовки'], ['made', 'Изделия'], ['product', 'Награды мастерской'], ['hero', 'Герои из рецептов'],
  ['wallet', 'Кошелёк'], ['rune', 'Руны предела'], ['vshard', 'Осколки доблести'], ['valor', 'Руны доблести'],
  ['h.echo', 'Отряды Эхо'], ['h.roulette', 'Возрождение душ'], ['wsh', 'Шарды рабочих'],
  ['act', 'Руины · крафтовые биомы'], ['call', 'Крафтовые боссы'], ['echo', 'Многоликий'],
  ['chest', 'Закрытые сундуки'], ['casket', 'Ларцы мастерской'],
  ['tal.fight', 'Боевые'], ['tal.hunt', 'Охотничьи'], ['tal.farm', 'Добыча'], ['tal.seal', 'Печати'],
  ['eq.head', 'Шлемы'], ['eq.chest', 'Доспехи'], ['eq.hands', 'Перчатки'], ['eq.legs', 'Поножи'], ['eq.feet', 'Сапоги'],
  ['eq.main', 'Оружие'], ['eq.off', 'Щиты'], ['eq.ring', 'Кольца'], ['eq.amulet', 'Амулеты'],
];
const ZP_GRP_I = Object.fromEntries(ZP_GRP.map(([k], i) => [k, i]));
/* надпись над именем в карточке: ремесло, у предмета без ремесла — короткое имя яруса (полное — в recipes.js) */
const ZP_KIND = {
  unique: 'Уникальный ресурс', find: 'Находка руин', trophy: 'Трофей', act: 'Призыв руины', call: 'Призыв босса', echo: 'Призыв Эхо',
  rune: 'Руна предела', vshard: 'Осколок доблести', valor: 'Руна доблести', hero: 'Герой из рецепта', product: 'Награда мастерской',
};
/* фильтры вкладки: цикл, ремесло, редкость, «не в найденных рецептах», вид талисмана, класс, слот; поиск — у всех. Подписи — в листе */
/* для тысячи ресурсов (screens/crafthall.js) — ещё биом и вид (ярус): у ресурсов, рун и ключей, призывов */
const ZP_FILT = { res: ['cyc', 'biome', 'kind', 'spec', 'r', 'un'], rune: ['cyc', 'biome', 'kind', 'r', 'un'], shard: ['cyc', 'r'], call: ['cyc', 'biome', 'kind', 'spec', 'r'], chest: ['cyc', 'r'], tal: ['r', 'cat', 'cls'], eq: ['cyc', 'r', 'slot'] };
const ZP_FNAME = { cyc: 'Цикл', biome: 'Биом', kind: 'Вид', spec: 'Ремесло', r: 'Редкость', cat: 'Вид', cls: 'Подходит классу', slot: 'Слот' };
const ZP_FKEYS = ['cyc', 'biome', 'kind', 'spec', 'r', 'cat', 'cls', 'slot'];
/* «Руны и ключи»: рунные ключи и прах — из кошелька */
const ZP_WALLET = ['keys', 'dust'];
const ZP_WALLET_NOTE = {
  keys: 'Вход к рунному стражу. Остаток общий для всех экранов.',
  dust: 'Общий остаток запасов, Возрождения душ и мастерской. Сюда уходят осколки пробуждённых героев.',
};
const ZP_EMPTY = {
  res: 'Запасы пусты: ресурсы приносят биомы, ритуалы и сундуки.',
  rune: 'Рун пока нет: их приносят рунные стражи.',
  shard: 'Осколков нет: они приходят из сундуков Эхо, возрождения душ, каталога праха и сундуков События.',
  call: 'Призывов нет: их создают в мастерской по найденным рецептам.',
  chest: 'Сундуков нет: их приносят Дары путешествия, крафтовые боссы и первые победы.',
  tal: 'Талисманов нет: их приносят сундуки кланового босса.',
  eq: 'Снаряжения нет: его приносят сундуки Арены и Лиги.',
};
/* §12.5: до активации карточка не называет будущий биом или врага — имя видно только в режиме «Команда».
   Одна строка: подробности — в подтверждении призыва */
const ZP_OPENS = {
  act: 'Призывает крафтовый биом, если есть свободный слот.',
  call: 'Призывает врага в Эхо за предмет и 1 душу.',
};
/* значки записей «из сундуков» — их берёт и окно открытия сундука (screens/chest-open.js) */
const ZP_EXTRA_IC = { tal: 'gem', wsh: 'gear', eq: 'shield' };
const ZP_EXTRA_NOTE = {
  wsh: ['Шарды рабочего: из них собирают рабочего для ритуалов. Пробуждают его в артели — за души.', 'Шарды рабочего: из них собирают рабочего для ритуалов. Шарды лежат здесь, в S.zp.extra; пробуждают рабочего в листе «Артель» ритуалов (screens/rituals.js, OV.rtart) — за души.'],
};
/* переход записи «из сундуков» к месту, где её тратят: подпись кнопки, действие, значок и лист, без которого перехода нет */
const ZP_EXTRA_GO = { wsh: { n: 'В артель', a: 'zpartel', ic: 'users', ov: 'rtart' } };
/* две категории Даров (§23.1); история полученного — вид 'hist', не категория */
const DAR_TABS = [['me', 'Личный рейтинг'], ['clan', 'Клановые награды']];
const DAR_NOTE = {
  me: ['', 'Планки платят за накопленное и подтверждаются сразу, места — после подсчёта недели. «Получить» переносит закрытые сундуки в запасы: открывают их только там.'],
  clan: ['Клановые сундуки делят по вкладу и по решению главы; журнал раздачи виден всем.', 'Клановые сундуки выдаются на каждого участника в общий пул клана: половину делит сервер по вкладу, половину — глава, журнал раздачи виден всем. Открывают сундуки в запасах.'],
};
/* воронка кнопки «Фильтры»: в наборе значков index.html её нет */
const ZP_FUNNEL = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V18l-3 2v-7.5z"/></svg>';

/* ================== помощники ================== */
const zpV = () => S.zp || zpState(S).zp;
const zpEQ = () => (typeof EQD !== 'undefined' && EQD) || null;
const zpTL = () => (typeof TL !== 'undefined' && TL) || null;
/* новый ярус с обработчиком призыва (ACTIVATE) — тоже во вкладку призывов: так встанут города-биомы и призыв врагов из данных Этриона */
const zpTabOf = it => ZP_CASKET[it.id] || (zpEQ() && zpEQ().rules.caskets[it.id] ? 'eq' : '') || ZP_TAB_OF[it.tier] || (typeof ACTIVATE === 'object' && typeof ACTIVATE[it.tier] === 'function' ? 'call' : '') || 'res';
const zpIsCasket = it => zpTabOf(it) === 'tal' || zpTabOf(it) === 'eq';
/* строка для игрока: без ссылок на ADR и §, без пометок заглушки */
const zpClean = s => String(s == null ? '' : s).replace(/\s*\((?:ADR|§)[^)]*\)/g, '').replace(/,?\s*(?:число\s+)?—\s*заглушка/g, '').trim();
/* откуда падает — без предложений, которые ещё ждут автора */
const zpSrc = it => (it.src || []).filter(s => !/предложени/.test(s)).map(zpClean).filter(Boolean);
/* спойлер цикла VI (team) игроку не называется */
const zpName = it => it.team ? `${(RX.tiers[it.tier] || { n: 'Предмет' }).n} · цикл ${ROMAN[it.cyc]}` : it.n;
const zpSpec = s => s ? s.split('+').map(x => RX.specs[x] ? RX.specs[x].n : x).join(' + ') : '';
const zpCurName = k => (LBX && LBX.currencies[k]) || (CUR[k] ? CUR[k].n : k);
const zpNeed = () => RS.rules ? RS.rules.stub.shards : 0;
const zpKnown = id => BAG.knownUses(id).filter(Boolean);
const zpChestKey = c => [c.box, c.r, c.cyc, c.win || 'step', c.box === 'shards' ? c.week || '' : ''].join(':');
const zpBoxName = sp => LBX && LBX.boxes[sp.box] ? lbBoxName(sp.box, sp.r, sp.win) : 'Сундук';
const zpWeekGen = race => { const w = (RS.weeks || []).find(x => x.race === race); return w ? w.gen : String(race || '').toLowerCase(); };
const darChests = n => `${fmt(n)} ${plural(n, 'сундук', 'сундука', 'сундуков')}`;
const darCount = ps => ps.reduce((a, p) => a + p.groups.reduce((b, g) => b + g.count, 0), 0);
const zpFCount = E => ZP_FKEYS.filter(k => E[k]).length + (E.un ? 1 : 0);
const zpFNone = () => ({ cyc: '', biome: '', kind: '', spec: '', r: '', un: false, cat: '', cls: '', slot: '' });
const zpHeroes = () => (typeof hrMine === 'function' ? hrMine() : S.heroes);

/* развёрнутый сундук для показа и розыгрыша; нет данных или вида — null */
function zpDef(sp) {
  if (!LBX || !window.EnLoot || !LBX.boxes[sp.box]) return null;
  try { return EnLoot.resolve(LBX, { box: sp.box, r: sp.r, win: sp.win || 'step', cyc: sp.cyc, week: sp.box === 'shards' ? sp.week || null : null }); }
  catch (_) { return null; }
}
/* сид сундука: у выданного Дарами — свой, у прочих — от id; в игре его присылает сервер */
const zpSeed = c => c.seed != null ? c.seed >>> 0 : EnLoot.seedOf('сундук|' + c.id);
function zpExtraName(kind, id, r) {
  if (kind === 'tal') { const t = LBX && LBX.talInfo[id]; return t && !t[2] ? `${t[0]} · ${t[1].toLowerCase()}` : 'Духовный талисман'; }
  return `${kind === 'wsh' ? 'Шарды рабочего' : 'Предмет снаряжения'} · ${(RAR[r] || '').toLowerCase()}`;
}
const zpExtraKey = it => it.kind === 'tal' ? `tal:${it.id}:${it.r}` : it.kind === 'wshard' ? `wsh:${it.id}:${it.r}` : `eq:${it.id}:${it.r}`;
/* рисованный сундук своего вида: корпус и крышка слоями по рамке CO_ART (screens/chest-open.js) — закрытый сундук с эмблемой вида.
   Выгружен только корпус — корпус; ничего — прежний значок CHEST. Проценты — раскладка слоёв, вид, не баланс */
function zpChestPic(box) {
  const A = typeof CO_ART !== 'undefined' ? CO_ART : null, g = A && A.chests[box], ok = p => !!A && A.ready.includes(p);
  const b = `chests/${box}-body.png`, l = `chests/${box}-lid.png`;
  if (!g || !ok(b)) return `<img src="${CHEST}" alt="">`;
  const [fx, fy, fw, fh] = g.frame, pc = (a, z) => `${Math.round(a * 1000 / z) / 10}%`;
  const pos = ([x, y, w, h]) => `left:${pc(x - fx, fw)};top:${pc(y - fy, fh)};width:${pc(w, fw)};height:${pc(h, fh)}`;
  return `<span class="zp-cp" style="aspect-ratio:${fw}/${fh}"><img src="${AV(b)}" alt="" style="${pos(g.body)}">${ok(l) ? `<img src="${AV(l)}" alt="" style="${pos(g.lid)}">` : ''}</span>`;
}
const zpChestDrawn = box => typeof CO_ART !== 'undefined' && !!CO_ART.chests[box] && CO_ART.ready.includes(`chests/${box}-body.png`);
/* значок вида на плитке — только у прежнего значка: у рисованного сундука эмблема вида на крышке */
const zpChestIco = box => `${zpChestPic(box)}${zpChestDrawn(box) ? '' : `<span class="zp-k">${ic(LB_IC[box] || 'gem')}</span>`}`;

/* ================== записи вкладок ================== */
function zpItems(tab) {
  const out = [];
  for (const [id, q] of Object.entries(S.bag.items)) {
    const it = BAG.item(id);
    if (!it || !(q > 0) || zpTabOf(it) !== tab) continue;
    out.push({ key: 'i:' + id, kind: 'item', id, it, q, name: zpName(it), r: it.r, cyc: it.pool ? 'pool' : it.cyc, spec: it.spec || '', grp: zpIsCasket(it) ? 'casket' : it.tier, un: !zpKnown(id).length,
      biome: typeof crBiomeOf === 'function' ? crBiomeOf(it) : '', tier: it.tier });
  }
  return out;
}
function zpHeroes0() {
  const out = [];
  for (const [id, n] of Object.entries(S.rs.shards)) { const h = RSI[id]; if (h && n > 0) out.push({ key: 'h:' + id, kind: 'hero', h, q: n, name: h.n, r: h.r, cyc: h.c, grp: 'h.' + h.src }); }
  return out;
}
function zpChestGroups() {
  const m = new Map();
  for (const c of S.bag.chests) {
    const k = zpChestKey(c);
    if (!m.has(k)) {
      const spec = { box: c.box, r: c.r, cyc: c.cyc, win: c.win || 'step', week: c.box === 'shards' ? c.week || null : null };
      m.set(k, { key: 'g:' + k, kind: 'chest', cs: spec, list: [], name: zpBoxName(spec), r: c.r, cyc: c.cyc, grp: 'chest' });
    }
    m.get(k).list.push(c);
  }
  return [...m.values()].map(g => Object.assign(g, { q: g.list.length }));
}
/* «из сундуков» по виду: талисманы — «tal», шарды рабочих — «wsh» */
function zpExtras(xk) {
  return Object.entries(zpV().extra).filter(([k, q]) => q > 0 && k.startsWith(xk + ':')).map(([k, q]) => {
    const [, id, r] = k.split(':');
    return { key: 'x:' + k, kind: 'extra', xk, id, q, r: +r, name: zpExtraName(xk, id, +r), grp: xk };
  });
}
/* талисманы: медальон, имя, вид; подходит ли классу — правило §26: до древней — классы линейки, с древней — любой */
function zpTals() {
  const T = zpTL(); if (!T) return [];
  return zpExtras('tal').filter(e => tlOk(+e.id)).map(e => {
    const no = +e.id, f = tlFam(no);
    return Object.assign(e, { kind: 'tal', no, name: tlName(no), cat: f.cat, grp: 'tal.' + f.cat, cls: f.cls && e.r < T.rules.freeFrom ? f.cls : null });
  });
}
/* снаряжение: экземпляры S.eq.items — слот, редкость, цикл, главная строка, на ком надет */
function zpEquip() {
  if (!zpEQ() || !S.eq) return [];
  return Object.values(S.eq.items).map(it => ({ key: 'q:' + it.uid, kind: 'equip', uid: it.uid, it, q: 1, name: eqSlotName(it.slot), r: it.r, cyc: it.cyc, slot: it.slot, grp: 'eq.' + it.slot, main: it.lines[0][1] }));
}
function zpEntries(tab) {
  const list = tab === 'res' || tab === 'call' ? zpItems(tab)
    : tab === 'rune' ? ZP_WALLET.map((k, i) => ({ key: 'w:' + k, kind: 'wallet', k, q: S.wallet[k] || 0, name: zpCurName(k), grp: 'wallet', ord: i })).concat(zpItems('rune'))
      : tab === 'shard' ? zpHeroes0().concat(zpExtras('wsh'))
        : tab === 'chest' ? zpChestGroups()
          : tab === 'tal' ? zpItems('tal').concat(zpTals())
            : tab === 'eq' ? zpItems('eq').concat(zpEquip()) : [];
  const so = RX.specOrder || Object.keys(RX.specs);
  const gi = e => e.grp in ZP_GRP_I ? ZP_GRP_I[e.grp] : ZP_GRP.length;
  const ci = e => e.cyc === 'pool' ? 0 : +e.cyc || 0;
  const si = e => { const i = so.indexOf((e.spec || '').split('+')[0]); return i < 0 ? so.length : i; };
  /* талисманы и снаряжение — редкие сверху; остальное — как раньше: цикл, ремесло, редкость по возрастанию */
  const top = tab === 'tal' || tab === 'eq';
  return list.sort((a, b) => gi(a) - gi(b) || (top ? (b.r || 0) - (a.r || 0) || (b.main || 0) - (a.main || 0) || ci(b) - ci(a)
    : ci(a) - ci(b) || si(a) - si(b) || (a.r || 0) - (b.r || 0)) || (a.ord || 0) - (b.ord || 0) || a.name.localeCompare(b.name, 'ru') || a.key.localeCompare(b.key));
}

/* «новое» — то, что игрок ещё не открывал */
function zpIsNew(e) {
  const s = zpV().seen;
  return e.kind === 'item' ? !s['i:' + e.id] : e.kind === 'hero' ? !s['h:' + e.h.id] : e.kind === 'chest' ? e.list.some(c => !s['c:' + c.id]) : e.kind === 'wallet' ? false : !s[e.key];
}
const zpIsNewShown = e => zpIsNew(e) || zpV().pick === e.key;
function zpSeen(e) {
  const s = zpV().seen;
  if (e.kind === 'item') s['i:' + e.id] = 1; else if (e.kind === 'hero') s['h:' + e.h.id] = 1;
  else if (e.kind === 'chest') e.list.forEach(c => { s['c:' + c.id] = 1; }); else if (e.kind !== 'wallet') s[e.key] = 1;
}

/* ================== фильтры ================== */
function zpOpts(all, tab) {
  const cyc = new Set(), spec = new Set(), r = new Set(), cat = new Set(), slot = new Set(), biome = new Set(), kind = new Set();
  for (const e of all) {
    if (e.cyc != null) cyc.add(String(e.cyc)); if (e.spec) e.spec.split('+').forEach(x => spec.add(x)); if (e.r) r.add(String(e.r));
    if (e.cat) cat.add(e.cat); if (e.slot) slot.add(e.slot); if (e.biome) biome.add(e.biome); if (e.tier) kind.add(e.tier);
  }
  const bn = b => b === 'pool' ? -1 : b === 'ruin' ? 99 : +String(b).replace(/\D/g, '') || 50, tiers = Object.keys(RX.tiers || {});
  const T = zpTL(), E = zpEQ();
  return {
    cyc: [...cyc].sort((a, b) => (a === 'pool' ? 0 : +a) - (b === 'pool' ? 0 : +b)),
    spec: (RX.specOrder || Object.keys(RX.specs)).filter(x => spec.has(x)),
    r: [...r].sort((a, b) => a - b),
    cat: T ? Object.keys(T.rules.cats).filter(x => cat.has(x)) : [],
    cls: T && tab === 'tal' && all.some(e => e.kind === 'tal') ? Object.keys(T.rules.classes) : [],
    slot: E ? E.rules.slots.filter(x => slot.has(x)) : [],
    biome: [...biome].sort((a, b) => bn(a) - bn(b)),
    kind: [...kind].sort((a, b) => tiers.indexOf(a) - tiers.indexOf(b)),
  };
}
/* действующие фильтры: неприменимые к вкладке и отсутствующие в её списке значения не действуют */
function zpEff(tab, O) {
  const V = zpV(), f = V.f, on = ZP_FILT[tab] || [], pick = k => on.includes(k) && O[k].includes(f[k]) ? f[k] : '';
  return { cyc: pick('cyc'), biome: pick('biome'), kind: pick('kind'), spec: pick('spec'), r: pick('r'), cat: pick('cat'), cls: pick('cls'), slot: pick('slot'), un: on.includes('un') && !!f.un, q: trNorm(V.q.trim()) };
}
function zpMatch(e, E) {
  if (E.q && !trNorm(e.name).includes(E.q)) return false;
  if (E.cyc && String(e.cyc) !== E.cyc) return false;
  if (E.biome && e.biome !== E.biome) return false;
  if (E.kind && e.tier !== E.kind) return false;
  if (E.spec && !(e.spec || '').split('+').includes(E.spec)) return false;
  if (E.r && String(e.r) !== E.r) return false;
  if (E.un && !(e.kind === 'item' && e.un)) return false;
  if (E.cat && e.cat !== E.cat) return false;
  if (E.slot && e.slot !== E.slot) return false;
  if (E.cls && !(e.kind === 'tal' && (!e.cls || e.cls.includes(E.cls)))) return false;   // до древней — класс линейки, с древней — любой
  return true;
}
/* выбранная запись вкладки; у открытого до конца сундука карточка с итогом остаётся */
function zpPick(tab, shown) {
  const V = zpV(), k = V.sel[tab];
  let e = shown.find(x => x.key === k);
  if (!e && tab === 'chest' && V.last && V.last.key === k) e = { key: k, kind: 'chest', cs: V.last.cs, list: [], q: 0, name: zpBoxName(V.last.cs), r: V.last.cs.r, cyc: V.last.cs.cyc, grp: 'chest' };
  return e || shown[0] || null;
}

/* ================== общие части разметки ================== */
/* плитка предмета: без рамки, редкость — нижняя кромка; o.lg — крупная, o.face — портрет героя, o.q — число в углу, o.dot — «новое» */
const zpTile = (inner, r, o = {}) => `<span class="zp-ic${o.lg ? ' lg' : ''}${o.face ? ' face' : ''}${o.cls ? ' ' + o.cls : ''}"${r ? ` data-r="${r}"` : ''}${o.fk || ''}>${inner}${o.q ? `<span class="q">${o.q}</span>` : ''}${o.dot ? '<span class="dot zp-dot" title="Новое"></span>' : ''}</span>`;
/* кристалл редкости (ADR-0027) — одобренный значок r1…r7 */
const zpCr = (r, px = 18) => r ? `<span class="zp-cr" data-r="${r}" title="${RAR[r]}">${ICON('r' + r, px, RAR[r])}</span>` : '';
const zpNewChip = e => zpIsNewShown(e) ? '<span class="chip spirit">новое</span>' : '';
/* лор и загадка: длинные — две строки и «ещё», короткие — целиком */
function zpLore(html, label = '') {
  if (!html) return '';
  const t = `${label ? `<b>${label}</b>` : ''}${html}`;
  return String(html).replace(/<[^>]*>/g, '').length > ZP_VIEW.fold
    ? `<details class="zp-lore"><summary><span class="zp-lt">${t}</span><span class="zp-more">ещё</span></summary></details>`
    : `<p class="zp-lt">${t}</p>`;
}
/* строка-ссылка на лист подробностей */
const zpLink = (v, label, right = '') => `<button class="zp-link" data-a="sheet" data-v="${trEsc(v)}"><span>${label}</span>${right}${ic('chev')}</button>`;
/* шапка карточки: плитка, надпись сверху, имя с кристаллом, количество справа */
function zpHead({ tile, eb = '', name, cr = '', q = null, ql = '', e = null }) {
  const chip = e ? zpNewChip(e) : '';
  return `<div class="zp-head">${tile}<div class="zp-ht">${eb || chip ? `<span class="zp-eb"><span class="eyebrow">${eb}</span>${chip}</span>` : ''}<span class="zp-nm"><b class="serif zp-name">${name}</b>${cr}</span></div>${q == null ? '' : `<div class="zp-q"><b class="num">${q}</b>${ql ? `<small>${ql}</small>` : ''}</div>`}</div>`;
}
/* закрытый предмет (спойлер цикла VI) — «ресурс скрыт», свёрток в тумане (resHideIco, screens/art-icons.js); без неё — замок */
const zpHideIco = () => typeof resHideIco === 'function' ? resHideIco() : ic('lock');
/* плитка предмета — в рамке своего вида (crK, screens/crafthall.js) */
const zpItemTile =(it, o = {}) => zpTile(it.team ? zpHideIco() : trIcon(it), it.r, Object.assign({ fk: typeof crK === 'function' ? crK(it) : '' }, o));
const zpItemEb = it => zpIsCasket(it) ? 'Ларец мастерской' : zpSpec(it.spec) || ZP_KIND[it.tier] || (RX.tiers[it.tier] || { n: 'Предмет' }).n;
/* цикл и неделя сундука — одной строкой: сундуки одного вида из разных циклов и недель различаются только ими */
const zpChestWhen = sp => `цикл ${ROMAN[sp.cyc] || sp.cyc}${sp.box === 'shards' && sp.week ? ' · неделя ' + zpWeekGen(sp.week) : ''}`;

/* ================== список ================== */
function zpIcon(e) {
  if (e.kind === 'item') return e.it.team ? zpHideIco() : trIcon(e.it);
  if (e.kind === 'wallet') return `<img src="${CUR[e.k].img}" alt="">`;
  if (e.kind === 'hero') return rsFace(e.h);
  if (e.kind === 'chest') return zpChestIco(e.cs.box);
  if (e.kind === 'equip') return eqGlyph(e.slot);
  return ic(ZP_EXTRA_IC[e.xk] || 'gem');
}
/* подсказка строки: ремесло и цикл, источник — в строке их нет */
function zpSub(e) {
  if (e.kind === 'item') { const it = e.it; return `${zpSpec(it.spec) || (RX.tiers[it.tier] || { n: '' }).n} · ${it.pool ? 'общий пул' : 'цикл ' + ROMAN[it.cyc]}`; }
  if (e.kind === 'wallet') return 'кошелёк · общий остаток';
  if (e.kind === 'hero') return `${RAR[e.h.r]} · ${RS_SRC_ONE[e.h.src] || ''} · цикл ${ROMAN[e.h.c]}`;
  if (e.kind === 'chest') { const sp = e.cs, c = e.list[0]; return `цикл ${ROMAN[sp.cyc] || sp.cyc}${sp.week ? ' · неделя ' + zpWeekGen(sp.week) : ''}${c && c.src ? ' · ' + zpClean(c.src) : ''}`; }
  if (e.kind === 'tal') return `${RAR[e.r]} · ${tlFx(e.no)}`;
  if (e.kind === 'equip') { const o = eqOwner(e.it); return `${RAR[e.r]} · цикл ${ROMAN[e.cyc]} · ${eqMainTxt(e.it)}${o ? ' · на герое ' + o.name : ''}`; }
  return `из сундуков · ${(RAR[e.r] || '').toLowerCase()}`;
}
/* число на клетке: до 10 000 — как есть, дальше коротко — «124К», «1,2М»; только целые */
function zpNum(q) {
  if (q < 10000) return fmt(q);
  if (q < 1000000) return Math.floor(q / 1000) + 'К';
  return `${Math.floor(q / 1000000)},${Math.floor(q / 100000) % 10}М`;
}
/* арт значка (screens/art-icons.js): талисман — семейство, снаряжение — слот, осколки героя — призрачный осколок зеркала с лицом.
   Редкость рисует рамка клетки цветом --r1…--r7. Арта нет — '' и прежний значок */
function zpArt(e, px) {
  if (e.kind === 'tal') { const f = tlFam(e.no); return f && !tlHide(f) && typeof talIcon === 'function' ? talIcon(f.cat, px, e.name) : ''; }
  if (e.kind === 'equip') return typeof eqIcon === 'function' ? eqIcon(e.slot, px, e.name, e.r) : '';   // иконка слота своей редкости (art-icons.js)
  if (e.kind === 'hero') return typeof shardGhost === 'function' ? shardGhost(e.h, e.q, zpNeed(), px) : '';
  if (e.kind === 'extra') return zpExtraArt(e.xk, e.id, px);
  return '';
}
/* находка из сундука: талисман — арт семейства по имени категории (LBX.talInfo, спойлер — без арта), шарды рабочего — фигура артели */
function zpExtraArt(xk, id, px) {
  if (xk === 'wsh') return typeof wkIcon === 'function' ? wkIcon(px, '') : '';
  if (xk !== 'tal' || typeof talIcon !== 'function' || !window.EN_TALISMANS) return '';
  const t = LBX && LBX.talInfo[id], cats = EN_TALISMANS.rules.cats, cat = t && !t[2] ? Object.keys(cats).find(k => cats[k] === t[1]) : '';
  return cat ? talIcon(cat, px, t[0]) : '';   // имя в подписи — talIcon находит по нему линейку
}
/* клетка сетки — только значок и число (слова автора 29.09.2026): имя, редкость словом и всё описание — в карточке справа.
   Осколки героя — «собрано/нужно», снаряжение — без числа, на герое — метка; «новое» — точка */
function zpCell(e, on) {
  const hero = e.kind === 'hero', need = zpNeed(), art = zpArt(e, ZP_VIEW.cellArt);
  const q = hero ? `${fmt(e.q)}/${need}` : e.kind === 'equip' ? '' : zpNum(e.q);
  const inner = art || (e.kind === 'tal' ? tlTile(e.no) : zpIcon(e));
  const kind = e.kind === 'chest' ? ' chest' : e.kind === 'equip' ? ' eq' : e.kind === 'tal' ? ' tal' : hero ? (art ? ' ghost' : ' face') : '';
  const worn = e.kind === 'equip' && eqOwner(e.it) ? `<span class="zp-worn" title="На герое">${ic('users')}</span>` : '';
  const fk = e.kind === 'item' && typeof crK === 'function' ? crK(e.it) : '';
  return `<button class="zp-cell${kind}${art ? ' art' : ''}"${e.r ? ` data-r="${e.r}"` : ''}${fk} data-a="zpsel" data-v="${trEsc(e.key)}" aria-current="${!!on}" aria-label="${trEsc(e.name)}${q ? ', ' + q : ''}" title="${trEsc(e.name + ' — ' + zpSub(e))}">${inner}${q ? `<span class="q${hero && e.q >= need ? ' full' : ''}">${q}</span>` : ''}${worn}${zpIsNew(e) ? '<span class="dot zp-dot" title="Новое"></span>' : ''}</button>`;
}
/* над сеткой одна строка: поиск и «Фильтры» — сами фильтры в листе. Сетка — 6 столбцов, видно 5 рядов, дальше прокрутка */
function zpListPanel(tab, all, shown, sel, E) {
  const V = zpV(), n = zpFCount(E);
  const find = `<label class="search grow">${ic('search')}<input id="zpq" type="search" placeholder="Поиск по запасам" value="${trEsc(V.q)}" autocomplete="off" aria-label="Поиск по запасам"></label>`;
  const fb = (ZP_FILT[tab] || []).length ? `<button class="btn sm zp-fb" data-a="sheet" data-v="zpfilt" aria-pressed="${!!n}">${ZP_FUNNEL}Фильтры${n ? `<b class="num">${n}</b>` : ''}</button>` : '';
  /* тысяча ресурсов — порциями (crPage): последняя клетка — «+N», ещё порция; в клетке, как у всех, только число */
  const P = typeof crPage === 'function' ? crPage(shown, 'zp:' + tab) : { shown, rest: 0 }, per = typeof CR_VIEW === 'object' ? CR_VIEW.page : P.rest;
  const more = P.rest ? `<button class="zp-plus" data-a="crmore" data-v="zp:${tab}" title="Показать ещё ${fmt(Math.min(P.rest, per))} из ${fmt(P.rest)}" aria-label="Показать ещё ${fmt(Math.min(P.rest, per))}"><b class="num">+${zpNum(Math.min(P.rest, per))}</b></button>` : '';
  const body = !shown.length ? `<div class="zp-empty">${all.length ? '<p class="faint">Ничего не найдено.</p><button class="btn sm" data-a="zpclr">Сбросить фильтры</button>' : `<p class="faint">${ZP_EMPTY[tab]}</p>`}</div>`
    : P.shown.map(e => zpCell(e, sel && e.key === sel.key)).join('') + more;
  const keep = trEsc(['zpl', tab, ZP_FKEYS.map(k => E[k]).join(','), E.un ? 1 : 0, E.q].join(':'));
  return `<div class="pnl inv zp-inv">
    <div class="row zp-find">${find}${fb}</div>
    <div class="zp-grid scroll grow" data-keep="${keep}">${body}</div>
  </div>`;
}

/* ================== карточки ================== */
function zpCardItem(e) {
  const it = e.it, act = zpTabOf(it) === 'call', box = zpIsCasket(it), uses = zpKnown(it.id), src = it.team ? [] : zpSrc(it);
  const lore = it.team ? '<p class="reason">Сведения откроются в своём цикле.</p>' : zpLore(trEsc(it.lore)) + (typeof crHint === 'function' ? crHint(it) : '');
  const opens = it.opens ? `<p class="zp-p">${ZP_OPENS[it.tier === 'act' ? 'act' : 'call']}${KH.team ? ` <span class="faint">Для команды: «${trEsc(it.opens)}».</span>` : ''}</p>` : '';
  /* призыв и ларец применяют из запасов: строка рецептов у них — только если они входят в найденный рецепт */
  const use = uses.length ? zpLink('zpuse:' + it.id, 'Найденные рецепты', `<b class="num">${uses.length}</b>`) : act || box ? '' : '<p class="zp-none">Ни в одном найденном рецепте</p>';
  const links = use + (src.length ? zpLink('zpsrc:' + it.id, 'Откуда падает') : '');
  const fn = act && typeof ACTIVATE[it.tier] === 'function';
  const acts = box ? zpCasketBtn(it)
    : !act ? `<button class="btn go" data-a="toCraft" data-v="${it.id}" title="Положить на стол мастерской">${ic('arrow')}На стол мастера</button>`
      : fn ? `<button class="btn go" data-a="zpact" data-v="${it.id}">Призвать</button>`
        : `<span class="chip warn" title="${tmT('Призыв пока недоступен', 'Обработчик призыва ещё не подключён')}">недоступно</span><button class="btn go" disabled>Призвать</button>`;
  return `<div class="pnl icard fit zp-card">
    ${zpHead({ tile: zpItemTile(it, { lg: true }), eb: zpItemEb(it), name: trEsc(zpName(it)), cr: zpCr(it.r), q: fmt(e.q), ql: 'в запасах', e })}
    <div class="col scroll grow zp-body" data-keep="zpc:${trEsc(e.key)}">${lore}${opens}${links ? `<div class="zp-links">${links}</div>` : ''}</div>
    <div class="acts2">${acts}</div>
  </div>`;
}
/* ларец мастерской: «Открыть» — один предмет своей редкости; номер операции несёт кнопка */
function zpCasketBtn(it) {
  if (zpTabOf(it) === 'eq') return typeof EQ_SRV !== 'undefined' ? `<button class="btn go" data-a="eqcasket" data-v="eq${S.eq.seq}:${it.id}" ${eqOpen() ? '' : 'disabled'}>Открыть</button>` : '';
  const V = zpV();
  return zpTL() ? `<button class="btn go" data-a="zptalcasket" data-v="zc${V.cop || 1}:${it.id}" ${tlOpen() ? '' : 'disabled'}>Открыть</button>` : '';
}
function zpCardWallet(e) {
  const c = CUR[e.k], dust = e.k === 'dust';
  return `<div class="pnl icard fit zp-card">
    ${zpHead({ tile: zpTile(`<img src="${c.img}" alt="">`, 0, { lg: true }), eb: 'Кошелёк · лимита нет', name: trEsc(e.name), q: fmt(e.q), ql: 'на руках' })}
    <div class="col zp-body"><p class="zp-p">${ZP_WALLET_NOTE[e.k] || ''}</p></div>
    <div class="acts2"><button class="btn ghost" data-a="sheet" data-v="cur:${e.k}">Подробнее</button>${dust ? `<button class="btn go" data-a="go" data-v="heroes:hire" data-seg="hire:souls">${ic('arrow')}Каталог праха</button>` : ''}</div>
  </div>`;
}
function zpCardHero(e) {
  const h = e.h, need = zpNeed(), n = e.q, has = rsHas(h), open = h.c <= rsCyc(), souls = RS.rules.stub.activateSouls;
  /* число осколков — в шапке, готовность — на кнопке «Пробудить»; строка нужна только пробуждённому */
  /* героев Эхо прахом не собрать (rsDustable, index.html): кнопки «Осколок» нет, строка объясняет почему */
  const dust = typeof rsDustable !== 'function' || rsDustable(h);
  const st = has ? '<p class="zp-p">Герой уже пробуждён: новые осколки уходят в прах.</p>' : dust ? '' : '<p class="zp-p">Осколки — только из сундуков Эхо: прахом этого героя не собрать.</p>';
  const name = `<button class="zp-hn" data-a="rhero" data-v="${h.id}" aria-label="Карточка героя: ${trEsc(h.n)}">${trEsc(h.n)}${ic('chev')}</button>`;
  const acts = has ? `<button class="btn go" data-a="rhero" data-v="${h.id}">Карточка героя</button>`
    : `${dust ? `<button class="btn sm" data-a="dustbuy" data-v="${h.id}"${open ? '' : ' disabled'}>Осколок${costTag('dust', rsShardPrice(h))}</button>` : ''}<button class="btn go" data-a="activate" data-v="${h.id}"${n >= need ? '' : ' disabled'}>Пробудить${costTag('souls', souls)}</button>`;
  const ghost = zpArt(e, ZP_VIEW.cellArt);
  return `<div class="pnl icard fit zp-card zp-hero">
    ${zpHead({ tile: ghost ? zpTile(ghost, h.r, { lg: true, cls: 'art ghost' }) : zpTile(rsFace(h), h.r, { lg: true, face: true }), eb: `${RS_SRC_ONE[h.src] || ''} · цикл ${ROMAN[h.c]}`, name, cr: zpCr(h.r), q: `${fmt(n)}<span class="zp-of">/${need}</span>`, ql: 'осколков', e })}
    <div class="col scroll grow zp-body" data-keep="zpc:${trEsc(e.key)}">${bar(Math.min(100, Math.floor(n * 100 / (need || 1))), n >= need ? 'sp' : '')}${st}${zpLore(trEsc(h.who || ''))}</div>
    <div class="acts2">${acts}</div>
  </div>`;
}
function zpCardExtra(e) {
  const g = ZP_EXTRA_GO[e.xk], go = g && typeof OV !== 'undefined' && OV[g.ov] ? g : null;
  return `<div class="pnl icard fit zp-card">
    ${zpHead({ tile: zpExtraArt(e.xk, e.id, ZP_VIEW.cellArt) ? zpTile(zpExtraArt(e.xk, e.id, ZP_VIEW.cellArt), e.r, { lg: true, cls: 'art' }) : zpTile(ic(ZP_EXTRA_IC[e.xk] || 'gem'), e.r, { lg: true }), eb: 'Из сундуков', name: trEsc(e.name), cr: zpCr(e.r), q: fmt(e.q), ql: 'в запасах', e })}
    <div class="col zp-body">${ZP_EXTRA_NOTE[e.xk] ? PL(...ZP_EXTRA_NOTE[e.xk], 'p', 'zp-p') : ''}</div>
    ${go ? `<div class="acts2"><button class="btn go" data-a="${go.a}">${ic(go.ic)}${go.n}</button></div>` : ''}
  </div>`;
}
/* строка-переход в окно «Ремесло → Перековка» (screens/reforge.js) своим режимом и редкостью */
const zpForge = (m, r) => typeof ACT.rfgo === 'function' ? `<button class="zp-link" data-a="rfgo" data-v="${m}:${Math.min(6, r)}"><span>Перековка</span>${ic('chev')}</button>` : '';
/* талисман (§26): арт семейства в рамке редкости, вид, имя, эффект и привязка; «К герою» — выбор героя и его лист талисманов */
function zpCardTal(e) {
  const T = zpTL(), no = e.no, f = tlFam(no), r = e.r, hide = tlHide(f), art = zpArt(e, ZP_VIEW.cellArt);
  const bind = hide ? '' : !f.cls ? 'Носит любой герой.' : r >= T.rules.freeFrom ? 'Древняя черта: носит любой герой.' : `До древней редкости носит только ${tlOr(f.cls.map(tlClsName))}.`;
  const tile = art ? zpTile(art, r, { lg: true, cls: 'art' }) : `<span class="zp-ic lg bare" data-r="${r}">${tlTile(no, { lg: true })}</span>`;
  return `<div class="pnl icard fit zp-card zp-tal">
    ${zpHead({ tile, eb: T.rules.cats[f.cat], name: trEsc(tlName(no)), cr: zpCr(r), q: fmt(e.q), ql: 'в запасах', e })}
    <div class="col scroll grow zp-body" data-keep="zpc:${trEsc(e.key)}"><p class="zp-p zp-eff">${tlFx(no)}</p>${bind ? `<p class="reason">${bind}</p>` : ''}
      ${r < 7 && zpForge('tal', r) ? `<div class="zp-links">${zpForge('tal', r)}</div>` : ''}</div>
    <div class="acts2"><button class="btn go" data-a="sheet" data-v="zptalwho:${no}" ${tlOpen() ? '' : 'disabled'}>${ic('users')}К герою</button></div>
  </div>`;
}
/* предмет снаряжения (§21): слот, цикл, редкость, главная строка, на ком надет; подробности и сравнение — лист */
function zpCardEq(e) {
  const it = e.it, o = eqOwner(it), k = it.lines[0][0], old = it.cyc < S.acc.cycle;
  const chips = `<div class="row zp-chips">${o ? `<span class="chip">${ic('users')}${trEsc(o.name)}</span>` : '<span class="chip">свободен</span>'}${old ? '<span class="chip warn">прошлый цикл</span>' : ''}</div>`;
  const acts = o ? `<button class="btn go" data-a="eqgo" data-v="${o.id}:${it.slot}">${ic('users')}К герою</button>` : `<button class="btn go" data-a="sheet" data-v="eqwho:${it.uid}" ${eqOpen() ? '' : 'disabled'}>Надеть</button>`;
  const art = zpArt(e, ZP_VIEW.cellArt), tile = art ? zpTile(art, it.r, { lg: true, cls: 'art' }) : zpTile(eqGlyph(it.slot), it.r, { lg: true, cls: 'eq' });
  return `<div class="pnl icard fit zp-card zp-eq">
    ${zpHead({ tile, eb: `Снаряжение · цикл ${ROMAN[it.cyc]}`, name: eqSlotName(it.slot), cr: zpCr(it.r), q: `${eqIco(k, 20, o)}${eqNum(k, it.lines[0][1])}`, ql: eqKind(k).n.toLowerCase(), e })}
    <div class="col scroll grow zp-body" data-keep="zpc:${trEsc(e.key)}">${chips}
      <div class="zp-links">${zpLink('eqitem:' + it.uid, 'Свойства и сравнение', `<b class="num">${it.lines.length}</b>`)}${it.r < 7 ? zpForge('eq', it.r) : ''}</div></div>
    <div class="acts2">${acts}</div>
  </div>`;
}

/* возможное содержимое сундука — лист «Состав и шансы» в запасах и попап Даров */
function zpLineSum(l, x) {
  const k = LBX.lines[l.line].kind, n = l.entries.length;
  if (k === 'tal') return `${n} ${plural(n, 'талисман', 'талисмана', 'талисманов')} этой редкости`;
  if (k === 'equip') return 'слот — случайный из девяти';
  return lbLineSum(l, x);
}
function zpInfo(sp, def) {
  if (!def) return '<p class="faint zp-p">Состав этого сундука неизвестен.</p>';
  const sum = def.window.reduce((a, x) => a + x[1], 0);
  const win = `<div class="lb-win">${def.window.map(([x, bp]) => `<span data-r="${x}" style="flex:${bp}" title="${RAR[x]} · ${lbPct(bp, sum)}"><b>${RAR[x]}</b>${lbPct(bp, sum)}</span>`).join('')}</div>`;
  const rows = def.window.map(([x, bp]) => {
    const W = def.byR[x].reduce((a, l) => a + l.w, 0);
    return `<tr><th>${rar(x)}<small>${lbPct(bp, sum)} предметов</small></th><td>${def.byR[x].map(l => `<span class="lb-ln"><b>${LBX.lines[l.line].n.replace(' — заглушка', '')}</b> · ${lbPct(l.w, W)}<small>${zpLineSum(l, x)}</small></span>`).join('')}</td></tr>`;
  }).join('');
  let heroes = '';
  if (sp.box === 'shards') {
    const ids = [...new Set(Object.values(def.byR).flatMap(ls => ls.filter(l => LBX.lines[l.line].kind === 'shards').flatMap(l => l.entries.map(x => x.id))))];
    heroes = `<span class="eyebrow">Герои недели в пуле · ${ids.length}</span>${ids.length ? `<div class="tr-use">${ids.map(id => { const h = RSI[id]; return `<span class="chip wr">${trEsc(h ? h.n : LBX.heroInfo[id] ? LBX.heroInfo[id].n : id)}${h ? ' · ' + RAR[h.r].toLowerCase() : ''}</span>`; }).join('')}</div>` : '<p class="faint zp-p">В этом цикле героев недели в пуле нет.</p>'}`;
  }
  return `<span class="eyebrow">Гарантированно</span><div class="row zp-cur">${def.cur.map(([k, a]) => money(k, a)).join('') || '<span class="faint">—</span>'}</div>
    <span class="eyebrow">${def.n} ${plural(def.n, 'предмет', 'предмета', 'предметов')} · редкость каждого</span>${win}
    <span class="eyebrow">Возможное содержимое</span><table class="rk-tab lb-tab">${rows}</table>${heroes}
    <p class="reason team-only">Просмотр состава — не выдача.</p>`;
}
/* итог открытия — крупно: сколько открыто, валюта, плитки полученного */
function zpResHtml(L) {
  const s = L.sum;
  const tile = (inner, r, q, name, o = {}) => `<div class="zp-rl${o.dust ? ' zp-dust' : ''}" title="${o.tip || name}">${zpTile(inner, r, { lg: true, face: !!o.face, q, cls: o.cls, fk: o.fk })}<small>${name}</small></div>`;
  const cur = Object.entries(s.cur).map(([k, a]) => `<span class="zp-rc" title="${zpCurName(k)}"><img src="${curImg(k)}" alt="${zpCurName(k)}"><b class="num">+${fmt(a)}</b></span>`).join('');
  const tiles = [
    ...Object.entries(s.items).map(([id, q]) => { const it = BAG.item(id); return it ? tile(it.team ? zpHideIco() : trIcon(it), it.r, '×' + fmt(q), trEsc(zpName(it)), { fk: typeof crK === 'function' ? crK(it) : '' }) : ''; }),
    ...Object.entries(s.shards).map(([id, q]) => { const h = RSI[id], g = h && typeof shardGhost === 'function' ? shardGhost(h, S.rs.shards[id] || 0, zpNeed(), ZP_VIEW.cellArt) : ''; return h ? tile(g || rsFace(h), h.r, '×' + fmt(q), trEsc(h.n), { face: !g, cls: g ? 'art ghost' : '', tip: `Осколки героя: ${trEsc(h.n)} ×${fmt(q)}` }) : ''; }),
    ...Object.entries(s.dust).map(([id, d]) => { const h = RSI[id]; return h ? tile(rsFace(h), h.r, '+' + fmt(d), `${trEsc(h.n)} → прах`, { face: true, dust: true, tip: `${trEsc(h.n)} уже пробуждён: осколки ×${fmt(s.dustQ[id])} → прах +${fmt(d)}` }) : ''; }),
    ...Object.entries(s.extra).map(([k, q]) => { const [xk, id, r] = k.split(':'), a = zpExtraArt(xk, id, ZP_VIEW.cellArt); return tile(a || ic(ZP_EXTRA_IC[xk] || 'gem'), +r, '×' + fmt(q), trEsc(zpExtraName(xk, id, +r)), { cls: a ? 'art' : '' }); }),
    ...Object.keys(s.eq || {}).map(uid => { const it = typeof eqItem === 'function' ? eqItem(uid) : null; const art = it && typeof eqIcon === 'function' ? eqIcon(it.slot, ZP_VIEW.cellArt, '', it.r) : ''; return it ? tile(art || eqGlyph(it.slot), it.r, '', eqSlotName(it.slot), { cls: art ? 'art' : 'eq', tip: `${eqSlotName(it.slot)} · ${RAR[it.r].toLowerCase()}: ${eqMainTxt(it)}` }) : ''; }),
  ].join('');
  return `<div class="zp-res">
    <div class="zp-rh"><b class="serif">Открыто: ${darChests(s.n)}</b><span class="chip spirit">${ic('check')}в запасах</span></div>
    ${cur ? `<div class="zp-rcs">${cur}</div>` : ''}${tiles ? `<div class="zp-rg">${tiles}</div>` : ''}
  </div>`;
}
function zpCardChest(e) {
  const V = zpV(), sp = e.cs, def = zpDef(sp), last = V.last && V.last.key === e.key ? V.last : null;
  const count = e.q, n = Math.max(1, Math.min(V.n || 1, count || 1)), B = LBX && LBX.boxes[sp.box];
  const name = B ? B.n + (sp.win && sp.win !== 'step' && LBX.winNames[sp.win] ? ' · ' + LBX.winNames[sp.win] : '') : 'Сундук';
  const eb = cap1(zpChestWhen(sp));   // редкость — кристалл у имени
  const inside = !def ? '<p class="reason warn">Состав этого сундука неизвестен — открыть его нельзя.</p>'
    : `<div class="zp-in"><span class="eyebrow">Внутри</span><div class="row zp-cur">${def.cur.map(([k, a]) => money(k, a)).join('')}<span class="zp-p">+ ${def.n} ${plural(def.n, 'предмет', 'предмета', 'предметов')}</span><span class="zp-crs" title="Редкость предметов">${def.window.map(([x]) => zpCr(x, 15)).join('')}</span></div></div>`;
  const step = count > 1 ? `<div class="qty zp-n" role="group" aria-label="Сколько открыть"><button data-a="zpn" data-v="-1" aria-label="Меньше" ${n <= 1 ? 'disabled' : ''}>−</button><span class="num">${n}</span><button data-a="zpn" data-v="1" aria-label="Больше" ${n >= count ? 'disabled' : ''}>+</button><button data-a="zpn" data-v="max" aria-pressed="${n === count}">все</button></div>` : '';
  const ctl = !def ? '' : count ? `<div class="zp-open">${step}<button class="btn go" data-a="zpopen" data-v="${trEsc(e.key)}" data-op="zo${V.op || 1}">Открыть${n > 1 ? ' ' + n : ''}</button></div>`
    : '<p class="faint zp-p">Сундуков этого вида больше нет.</p>';
  return `<div class="pnl icard fit zp-card">
    ${zpHead({ tile: zpTile(zpIcon(e), sp.r, { lg: true, cls: 'chest' }), eb, name, cr: zpCr(sp.r), q: count ? '×' + fmt(count) : null, ql: 'в запасах', e })}
    <div class="col scroll grow zp-body" data-keep="zpc:${trEsc(e.key)}:${last ? last.no : 0}">${last ? zpResHtml(last) : inside}${def ? `<div class="zp-links">${zpLink('zpbox:' + e.key, 'Состав и шансы')}</div>` : ''}</div>
    ${ctl ? `<div class="zp-foot">${ctl}</div>` : ''}
  </div>`;
}
const ZP_NONE = { chest: 'Сундуков в запасах нет.', tal: 'Талисманов в запасах нет.', eq: 'Снаряжения в запасах нет.' };
function zpCard(e, tab) {
  if (!e) return `<div class="pnl icard fit zp-card"><p class="faint">${ZP_NONE[tab] || 'Выберите запись слева.'}</p></div>`;
  return e.kind === 'item' ? zpCardItem(e) : e.kind === 'wallet' ? zpCardWallet(e) : e.kind === 'hero' ? zpCardHero(e) : e.kind === 'chest' ? zpCardChest(e)
    : e.kind === 'tal' ? zpCardTal(e) : e.kind === 'equip' ? zpCardEq(e) : zpCardExtra(e);
}

/* ================== экран «Ремесло → Запасы» ================== */
function zpBar() {
  const V = zpV(), avail = darCount(darRows(S).filter(p => p.st === 'ok'));
  const tabs = ZP_TABS.map(([k, l]) => {
    const all = zpEntries(k), n = k === 'chest' ? all.reduce((a, e) => a + (e.kind === 'chest' ? e.q : 0), 0) : all.length;
    return `<button role="tab" aria-selected="${V.tab === k}" data-a="zptab" data-v="${k}" title="${ZP_TAB_TIP[k] || l}: ${fmt(n)}">${l}${k === 'chest' && n ? ' · ' + fmt(n) : ''}${all.some(zpIsNew) ? '<span class="dot" title="Есть новое"></span>' : ''}</button>`;
  }).join('');
  return `<div class="row zp-bar"><div class="tabs" role="tablist" aria-label="Запасы">${tabs}</div><span class="g-spacer"></span><button class="btn sm zp-gb" data-a="sheet" data-v="gifts">${zpChestPic('wander')}Дары${avail ? `<b class="num">${fmt(avail)}</b>` : ''}</button></div>`;
}
/* вкладка целиком: все записи, фильтры, видимые записи и выбранная — одна выборка для экрана и действий */
function zpView(tab) {
  const all = zpEntries(tab), O = zpOpts(all, tab), E = zpEff(tab, O), shown = all.filter(e => zpMatch(e, E));
  return { all, O, E, shown, sel: zpPick(tab, shown) };
}
CRAFT_SEGS.stock = function () {
  const V = zpV(); if (!ZP_TABS.some(([k]) => k === V.tab)) V.tab = 'res';
  const tab = V.tab, W = zpView(tab);
  return `<section class="scr">${zpBar()}<div class="stock zp-stock">${zpListPanel(tab, W.all, W.shown, W.sel, W.E)}${zpCard(W.sel, tab)}</div></section>`;
};

/* ================== листы подробностей ================== */
const zpMini = it => zpHead({ tile: zpItemTile(it, { lg: true }), eb: zpItemEb(it), name: trEsc(zpName(it)), cr: zpCr(it.r), q: fmt(BAG.qty(it.id)), ql: 'в запасах' });
Object.assign(OV, {
  /* фильтры вкладки — список за листом меняется сразу */
  zpfilt() {
    const V = zpV(), on = ZP_FILT[V.tab] || [], W = zpView(V.tab), O = W.O, E = W.E, T = zpTL(), Q = zpEQ();
    const chip = (k, v, label, cur, r) => `<button class="chip zp-fc" data-a="zpf" data-v="${k}:${v}" aria-pressed="${!!cur}"${r ? ` data-r="${r}"` : ''}>${label}</button>`;
    const group = (k, list, label) => on.includes(k) && list.length ? `<span class="eyebrow">${ZP_FNAME[k]}</span><div class="zp-fcs">${chip(k, '', 'Все', !E[k])}${list.map(x => chip(k, x, label(x), E[k] === x, k === 'r' ? x : 0)).join('')}</div>` : '';
    const body = group('cyc', O.cyc, c => c === 'pool' ? 'Общий пул' : 'Цикл ' + ROMAN[c])
      + group('biome', O.biome, b => typeof crBiomeName === 'function' ? crBiomeName(b) : b)
      + group('kind', O.kind, k => (RX.tiers[k] || { n: k }).n)
      + group('spec', O.spec, s => `${ic(RX.specs[s].icon || 'gem')}${RX.specs[s].n}`)
      + group('r', O.r, r => `${ICON('r' + r, 16)}${RAR[r]}`)
      + group('slot', O.slot, s => `${eqGlyph(s)}${eqSlotName(s)}`)
      + group('cat', O.cat, c => T ? T.rules.cats[c] : c)
      + group('cls', O.cls, c => `${CLS(T.rules.classes[c], 16)}${cap1(T.rules.classes[c])}`)
      + (on.includes('un') ? `<span class="eyebrow">Рецепты</span><div class="zp-fcs"><button class="chip zp-fc" data-a="zpun" aria-pressed="${E.un}">${ic('book')}Не в найденных рецептах</button></div>` : '')
      + (on.includes('cls') && O.cls.length ? '<p class="reason">До древней редкости талисман носит только свой класс, с древней — любой герой.</p>' : '');
    return sheet('Фильтры', body || '<p class="faint">У этой вкладки фильтров нет.</p>',
      `<button class="link" data-a="zpclr">Сбросить</button><button class="btn go" data-a="close">Показать · ${fmt(W.shown.length)}</button>`);
  },
  /* найденные рецепты с этим ресурсом: нажатие — создание в мастерской (автодокрафт), если она подключена */
  zpuse(o) {
    const it = BAG.item(o.arg); if (!it) return '';
    const uses = zpKnown(it.id), mk = typeof ACT.wsmake === 'function';
    const row = r => { const out = BAG.item(r.out[0]), inner = `${out ? zpItemTile(out) : ''}<span>${trEsc(r.n)}</span>`; return mk ? `<button class="zp-link" data-a="wsmake" data-v="${r.id}">${inner}${ic('chev')}</button>` : `<div class="zp-link">${inner}</div>`; };
    const body = `${zpMini(it)}${uses.length ? `<div class="zp-links">${uses.map(row).join('')}</div>` : '<p class="zp-p">Ни в одном найденном рецепте — пока лежит без дела.</p>'}
      <p class="reason">Новые рецепты ищут на столе мастерской — загадка подсказывает дорогу.</p>`;
    return sheet('Найденные рецепты', body, BAG.has(it.id) && !['call', 'tal', 'eq'].includes(zpTabOf(it)) ? `<button class="btn go" data-a="toCraft" data-v="${it.id}">${ic('arrow')}На стол мастера</button>` : '');
  },
  /* откуда падает ресурс */
  zpsrc(o) {
    const it = BAG.item(o.arg); if (!it) return '';
    const src = it.team ? [] : zpSrc(it);
    return sheet('Откуда падает', `${zpMini(it)}${it.team ? '<p class="reason">Сведения откроются в своём цикле.</p>'
      : src.length ? `<ul class="tr-src zp-src">${src.map(s => `<li>${trEsc(s)}</li>`).join('')}</ul>` : '<p class="faint">Источник пока неизвестен.</p>'}`);
  },
  /* состав и шансы сундука (§14.4): просмотр — не выдача */
  zpbox(o) {
    const V = zpV(), key = String(o.arg || '');
    const g = zpChestGroups().find(x => x.key === key) || (V.last && V.last.key === key ? { key, cs: V.last.cs, list: [] } : null);
    if (!g) return sheet('Состав и шансы', '<p class="faint">Такого сундука в запасах нет.</p>');
    const sp = g.cs, src = {};
    g.list.forEach(c => { const k = zpClean(c.src) || 'источник не указан'; src[k] = (src[k] || 0) + 1; });
    const eb = zpChestWhen(sp);
    const from = Object.keys(src).length ? `<span class="eyebrow">Откуда</span><ul class="tr-src">${Object.entries(src).map(([s, k]) => `<li>${trEsc(s)}${k > 1 ? ` · ${k} шт.` : ''}</li>`).join('')}</ul>` : '';
    return sheet('Состав и шансы', `${zpHead({ tile: zpTile(zpIcon({ kind: 'chest', cs: sp }), sp.r, { lg: true, cls: 'chest' }), eb: cap1(eb), name: zpBoxName(sp), cr: zpCr(sp.r) })}
      ${zpInfo(sp, zpDef(sp))}${from}${PL('Каждый сундук открывается один раз.', 'В игре итог открытия решает сервер: сид приходит вместе с сундуком, каждый сундук открывается один раз.', 'p', 'reason')}`, '', true);
  },
  /* талисман — к герою: кому подходит — первыми, остальные приглушены с причиной; нажатие открывает лист талисманов героя */
  zptalwho(o) {
    const no = +o.arg, T = zpTL();
    if (!T || !tlOk(no) || !TB.qty(no)) return sheet('К герою', '<p class="faint">Этого талисмана нет в запасах.</p>');
    const rows = zpHeroes().map(h => { const eq = tlEq(h.id), slot = Math.max(0, eq.indexOf(null)), why = tlWhy(h, no, slot); return { h, slot, why }; })
      .sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0));
    const list = rows.map(({ h, why }) => `<button class="zp-who${why ? ' off' : ''}" data-a="zptalgo" data-v="${h.id}:${no}" ${why ? 'disabled' : ''} title="${trEsc(why ? TL_WHY[why](no) : h.name)}">
      ${typeof hrAv === 'function' ? hrAv(h) : `<img src="${h.img}" alt="">`}<span class="tx"><b>${trEsc(h.name)}</b><small>${CLS(h.cls, 12)}${why ? trEsc(TL_WHY[why](no)) : `${h.cls} · мест занято: ${tlWorn(h.id).length} из ${T.rules.slots}`}</small></span>${why ? '' : ic('chev')}</button>`).join('');
    return sheet('К герою', `<div class="tl-fx">${tlTile(no, { lg: true })}<span><b>${trEsc(tlName(no))}</b><small>${tlFx(no)}</small></span></div>
      <p class="reason">Выберите героя — откроется его лист талисманов с этим талисманом.</p><div class="zp-whos">${list}</div>`);
  },
});

/* ================== открытие сундуков ================== */
function zpAddCur(k, a, sum) { S.wallet[k] = (S.wallet[k] || 0) + a; sum.cur[k] = (sum.cur[k] || 0) + a; }
/* один сундук: списать, потом выдать — повтор того же сундука ничего не выдаст */
function zpOpenOne(c, sum) {
  const V = zpV();
  if (V.opened[c.id] || !BAG.chest(c.id)) return false;
  const def = zpDef(c); if (!def) return false;
  const seed = zpSeed(c), res = EnLoot.roll(def, seed);
  const awake = {}; res.items.forEach(it => { if (it.kind === 'shard' && RSI[it.id] && rsHas(RSI[it.id])) awake[it.id] = true; });
  const conv = EnLoot.toDust(LBX, res, awake);   // §15.2: осколки пробуждённых — в прах, без бросков
  V.opened[c.id] = 1; BAG.dropChest(c.id);
  for (const [k, a] of conv.cur) zpAddCur(k, a, sum);
  conv.items.forEach((it, i) => {
    if (it.kind === 'item') { BAG.add(it.id, it.q); sum.items[it.id] = (sum.items[it.id] || 0) + it.q; }
    else if (it.kind === 'cur') zpAddCur(it.id, it.q, sum);
    else if (it.kind === 'shard') {
      if (it.dust) { S.wallet.dust += it.dust; sum.dust[it.id] = (sum.dust[it.id] || 0) + it.dust; sum.dustQ[it.id] = (sum.dustQ[it.id] || 0) + it.q; }
      else { S.rs.shards[it.id] = (S.rs.shards[it.id] || 0) + it.q; sum.shards[it.id] = (sum.shards[it.id] || 0) + it.q; }
    } else if (it.kind === 'equip' && typeof EQ_SRV !== 'undefined' && zpEQ()) {
      /* предмет снаряжения создаёт сервер: сид сундука и номер записи в итоге — свой поток, розыгрыш сундука не сдвигает.
         Номер экземпляра ложится на запись скрытым полем: итог сундука остаётся тем же, окно открытия находит предмет */
      const x = EQ_SRV.fromChest(seed, i, it.r, c.cyc, zpClean(c.src) || zpBoxName(c));
      Object.defineProperty(it, 'uid', { value: x.uid, enumerable: false, configurable: true });
      const E = sum.eq || (sum.eq = {}); E[x.uid] = 1;
    } else { const k = zpExtraKey(it); V.extra[k] = (V.extra[k] || 0) + it.q; sum.extra[k] = (sum.extra[k] || 0) + it.q; }
  });
  if (sum.log) sum.log.push({ id: c.id, cur: conv.cur, items: conv.items });   // по сундуку, в порядке бросков — для окна открытия
  sum.n++;
  return true;
}
/* открытие — операция с номером (§34.1): номер несут кнопки «Открыть», «Открыть ещё» и «Открыть все»; повтор того же номера
   ничего не выдаёт и не показывает. want — сколько открыть (Infinity — все этого вида), иначе — выбор в карточке.
   Выдача — здесь, до показа; показывает итог окно открытия screens/chest-open.js (coShow): анимация, пропуск, пачка */
function zpOpen(key, op, want) {
  const V = zpV(), ops = V.ops || (V.ops = {}), g = zpChestGroups().find(x => x.key === key);
  if (op && ops[op]) return;
  if (!g || !LBX || !window.EnLoot) return;
  const n = Math.max(1, Math.min(want || V.n || 1, g.q)), sum = { n: 0, cur: {}, items: {}, shards: {}, dust: {}, dustQ: {}, extra: {}, eq: {}, log: [] };
  for (const c of g.list.slice(0, n)) zpOpenOne(c, sum);
  if (!sum.n) { toast('Эти сундуки уже открыты'); return; }
  V.last = { key, cs: g.cs, sum, no: (V.last ? V.last.no : 0) + 1, op: op || '' };
  if (op) ops[op] = V.last;
  V.op = (V.op || 1) + 1; V.sel.chest = key; V.n = 1;
  if (typeof coShow === 'function') coShow(V.last);
  else toast(`Открыто: ${darChests(sum.n)} · итог — в карточке`, CHEST);
}
/* ларец талисманов из мастерской: один талисман своей редкости по весам пула (правило 5 автора) — «сервер» на сиде операции.
   Номер операции несёт кнопка; повтор номера ничего не списывает и не выдаёт */
function zpTalCasket(op, id) {
  const V = zpV(), O = V.cops || (V.cops = {});
  if (O[op]) return Object.assign({ again: true }, O[op]);
  const x = BAG.item(id);
  if (!zpTL() || !x || !BAG.has(id) || ZP_CASKET[id] !== 'tal') return { refuse: 'none' };
  if (!tlOpen()) return { refuse: 'lock' };
  const pool = tlPool(x.r), W = pool.reduce((a, p) => a + p[1], 0);
  if (!W) return { refuse: 'none' };
  let k = EnLoot.makeRng(EnLoot.seedOf('ларец-талисманов|' + op))(W), got = pool[0][0];
  for (const [no, w] of pool) { if (k < w) { got = no; break; } k -= w; }
  BAG.take(id); TB.add(got);
  const r = { ok: 'casket', id, got }; O[op] = r; V.cop = (V.cop || 1) + 1;
  return r;
}

/* ================== Дары путешествия ================== */
/* прошлая и текущая недели по порядку рас в roster.js; раса недели — S.week.race */
function darWeeks(st) {
  const W = RS.weeks || [], n = W.length, cur = trNorm(st.week.race), i = W.findIndex(w => trNorm(w.gen) === cur);
  if (i < 0) return [{ id: 'now', race: '', gen: String(st.week.race).toLowerCase(), counted: false }];
  const p = W[(i + n - 1) % n];
  return [{ id: 'prev', race: p.race, gen: p.gen, counted: true }, { id: 'now', race: W[i].race, gen: W[i].gen, counted: false }];
}
/* строки выплат: по одной на планку или место, с составом по сундукам. Статус: ok — подтверждено, wait — ждёт, got — получено.
   Прошлая неделя подсчитана: планки — lbGiftRows UI-кита (типичная неделя ZP_DEMO.gifts.who), личные места — ZP_DEMO.gifts.prevPlaces.
   Эта неделя — только взятые планки (ADR-0031, п. 16): их сообщает экран режима в реестр Недели (darNow); незаработанной планки в «Дарах»
   нет, «Получить» — только у взятой. Личные места этой недели — рейтинги S.ranks, ждут подсчёта.
   Клановую долю режима, у которого есть свой журнал раздачи, даёт он сам: DAR_CLAN[id](st, wk) — строки { label, groups: [{ r, count, win }],
   st, why } или null. Клановый босс — журнал клана (screens/clan.js): прошлая неделя — половина сервера по вкладу и доля главы,
   эта — место клана сейчас */
const DAR_CLAN = window.DAR_CLAN = window.DAR_CLAN || {};
/* взятые планки этой недели — из состояния режима (EN_WEEK.state, screens/week.js): личные — planks, клановые — clanPlanks; номер
   планки k — строка слоя планок режима в EN_LOOTBOXES. Режим без состояния или закрытый не даёт ничего. Состояние режима — живое (S):
   у заготовки другого состояния (initialState до подмены S) взятых планок этой недели нет */
function darNow(st, c, isOpen) {
  const W = window.EN_WEEK, out = [];
  if (st !== S || !W || typeof W.state !== 'function') return out;
  for (const [id, m] of Object.entries(LBX.modes)) {
    const lm = m.layers.find(l => l.kind === 'plank' && !l.clan), lc = m.layers.find(l => l.kind === 'plank' && l.clan);
    if ((!lm && !lc) || !isOpen(id)) continue;
    const s = W.state(id, 'now'); if (!s || s.lock) continue;
    for (const [ly, list, cat] of [[lm, s.planks, 'me'], [lc, s.clanPlanks, 'clan']]) if (ly) for (const p of list || []) {
      const row = p.reached ? ly.rows[p.k - 1] : null; if (!row) continue;
      for (const g of row.cyc[c] || []) out.push({ id, cat, label: lbRowLabel(ly, row), g });
    }
  }
  return out;
}
function darRows(st, only) {   // only — id недели ('prev'): только её строки
  if (!LBX || !st.zp) return [];
  const c = st.acc.cycle, got = st.zp.gifts.got, out = [], idx = new Map(), mid = {};
  for (const [id, m] of Object.entries(LBX.modes)) mid[m.n] = id;
  /* режим платит в этом цикле: он недельный, открыт, у него есть неделя в EN_LOOTBOXES.week и он не закрыт для аккаунта (gifts.gate) */
  const gate = ZP_DEMO.gifts.gate || {}, shut = (id, wk) => typeof gate[id] === 'function' && !!gate[id](st, wk);   // wk — неделя «Даров»: Лига могла открыться на этой
  const isOpen = (id, wk) => { const m = LBX.modes[id]; return !!m && m.weekly && c >= m.from && !!(LBX.week[id] && LBX.week[id][c]) && !shut(id, wk); };
  const put = (wk, cat, id, label, g, kind, place, own) => {
    const key = [wk.race || wk.gen, id, label].join('|');
    let p = idx.get(key);
    if (!p) {
      const m = LBX.modes[id], st2 = got[key] ? 'got' : own ? own.st : wk.counted || kind === 'plank' ? 'ok' : 'wait';
      const why = st2 === 'got' ? 'получено · сундуки в запасах'
        : own ? own.why
          : kind === 'plank' ? 'планка взята — подтверждено'
            : kind === 'place' ? (wk.counted ? `итог недели подсчитан · место ${fmt(place)}` : `ждёт подсчёта недели · сейчас место ${fmt(place)}`)
              : wk.counted ? 'доля клана назначена' : 'клан взял планку — ждёт подсчёта недели и распределения в клане';
      p = { key, wk, cat, id, m, mode: m.n, box: m.box, label, kind, place, c, st: st2, why, basis: zpClean(m.basis), groups: [],
        period: `неделя ${wk.gen}${wk.id === 'now' ? ', текущая' : wk.id === 'prev' ? ', прошлая' : ''}` };
      idx.set(key, p); out.push(p);
    }
    p.groups.push(g);
  };
  const ranks = {}; for (const [n, pl, scope] of st.ranks || []) if (mid[n] && pl && scope !== 'клан') ranks[mid[n]] = pl;
  for (const wk of darWeeks(st)) {
    if (only && wk.id !== only) continue;
    const own = {};
    for (const [id, f] of Object.entries(DAR_CLAN)) if (isOpen(id, wk) && typeof f === 'function') { const r = f(st, wk); if (r) own[id] = r; }
    if (wk.counted) {   // прошлая неделя подсчитана: итог — типичная неделя
      const T = lbGiftRows(ZP_DEMO.gifts.who, c);
      for (const cat of ['me', 'clan']) for (const x of T[cat]) { const id = mid[x.mode]; if (isOpen(id, wk) && !(cat === 'clan' && own[id])) put(wk, cat, id, x.label, x.g, x.done ? 'plank' : cat === 'clan' ? 'clan' : 'place'); }
    } else for (const x of darNow(st, c, id => isOpen(id, wk))) if (!(x.cat === 'clan' && own[x.id])) put(wk, x.cat, x.id, x.label, x.g, x.cat === 'me' ? 'plank' : 'clan');   // эта — только взятое
    for (const [id, rows] of Object.entries(own)) for (const r of rows) for (const g of r.groups) put(wk, 'clan', id, r.label, g, 'clan', null, r);
    const places = wk.id === 'prev' ? ZP_DEMO.gifts.prevPlaces : ranks;
    for (const [id, pl] of Object.entries(places || {})) {
      if (!isOpen(id, wk) || !pl) continue;
      const ly = LBX.modes[id].layers.find(l => l.kind === 'place' && !l.clan); if (!ly) continue;
      const row = ly.rows.filter(r => r.top && pl <= r.top).sort((a, b) => a.top - b.top)[0]; if (!row) continue;
      for (const g of row.cyc[c] || []) put(wk, 'me', id, lbRowLabel(ly, row), g, 'place', pl);
    }
  }
  return out;
}
/* личная планка k режима id на этой неделе уже получена в «Дарах» — экран режима пишет «в запасах», а не «готово» (Эхо) */
function darGot(id, k) {
  if (!LBX || !S || !S.zp) return false;
  const wk = darWeeks(S).find(w => w.id === 'now'), M = LBX.modes[id], ly = M ? M.layers.find(l => l.kind === 'plank' && !l.clan) : null, row = ly ? ly.rows[k - 1] : null;
  return !!(wk && row && S.zp.gifts.got[[wk.race || wk.gen, id, lbRowLabel(ly, row)].join('|')]);
}
/* строка выплаты: режим и планка или место, период, состав кристаллами и одно действие; основание и статус — в подсказке */
function darRow(p) {
  const top = Math.max(...p.groups.map(g => g.r));
  const act = p.st === 'ok' ? `<button class="btn sm go" data-a="darget" data-v="${trEsc(p.key)}">Получить</button>`
    : p.st === 'wait' ? '<span class="chip warn">ждёт</span>' : `<span class="chip">${ic('check')}получено</span>`;
  const place = p.kind === 'place' && p.place ? ` · ${p.st === 'wait' ? 'сейчас ' : ''}место ${fmt(p.place)}` : '';
  const cmp = p.groups.map(g => `<span class="dar-g" data-r="${g.r}" title="${trEsc(zpBoxName({ box: p.box, r: g.r, win: g.win }))} ×${g.count}">${ICON('r' + g.r, 16, RAR[g.r])}×${g.count}</span>`).join('');
  return `<div class="dar-row" title="${trEsc(`${p.basis} · ${p.why}`)}"><span class="well zp-well" data-r="${top}">${zpChestIco(p.box)}</span>
    <span class="dar-tx"><b>${p.mode} · ${trEsc(p.label)}</b><small>${p.period}${place}</small></span><span class="dar-cmp">${cmp}</span>${act}</div>`;
}
/* «Получить»: закрытые сундуки — в запасы; ждущее и уже полученное не выдаётся */
function darClaim(keys) {
  const V = zpV(), G = V.gifts, rows = darRows(S), done = [];
  for (const key of keys) {
    const p = rows.find(x => x.key === key);
    if (!p || p.st !== 'ok' || G.got[key]) continue;
    G.got[key] = ++G.seq;
    p.groups.forEach((g, gi) => {
      for (let k = 0; k < g.count; k++) {
        const sp = { box: p.box, r: g.r, cyc: p.c, win: g.win, src: `${p.mode} · ${p.label} · неделя ${p.wk.gen}`, seed: EnLoot.seedOf(['дары', key, gi, k].join('|')) };
        if (p.box === 'shards') sp.week = p.wk.race;
        BAG.addChest(sp);
      }
    });
    done.push(p);
  }
  if (!done.length) { toast('Нечего получать: выплата уже в запасах или ждёт подсчёта'); return; }
  toast(`${darChests(darCount(done))} → в запасах, вкладка «Сундуки»`, CHEST);
}
const DAR_VIEWS = DAR_TABS.map(([k]) => k).concat('hist');
OV.gifts = function (o = {}) {   // без аргумента — как зовёт автопроверка UI-кита
  const G = zpV().gifts;
  /* открытие: вкладка из аргумента; с экрана клана — клановые награды; без аргумента история не открывается — она вид, не категория */
  if (!o.zp) { o.zp = 1; if (DAR_VIEWS.includes(o.arg)) G.tab = o.arg; else if (S.route === 'clan') G.tab = 'clan'; else if (G.tab === 'hist') G.tab = G.cat || 'me'; if (G.tab !== 'hist') G.cat = G.tab; }
  if (!LBX || !window.EnLoot) return sheet('Дары путешествия', '<p class="faint">Нет данных: рядом с index.html должен лежать lootboxes.js.</p>');
  const rows = darRows(S);
  if (!rows.length) return sheet('Дары путешествия', `<p class="muted">Рейтинговые режимы открываются с цикла II — вместе с ними придут и Дары. Сейчас цикл ${ROMAN[S.acc.cycle]}.</p>`);
  const ok = rows.filter(p => p.st === 'ok'), N = darCount(ok), tab = DAR_VIEWS.includes(G.tab) ? G.tab : 'me', got = rows.filter(p => p.st === 'got');
  const cnt = { me: darCount(ok.filter(p => p.cat === 'me')), clan: darCount(ok.filter(p => p.cat === 'clan')) };
  const top = `<button class="gifts dar-sum" data-a="darbox" ${N ? '' : 'disabled'}>${zpChestPic('wander')}<span><b>${plural(N, 'Доступен', 'Доступно', 'Доступно')} ${darChests(N)}</b><small>${N ? `цикл ${ROMAN[S.acc.cycle]} · состав и шансы` : 'Всё подтверждённое уже в запасах'}</small></span>${N ? ic('chev') : ''}</button>`;
  const tabs = `<div class="tabs" role="tablist" aria-label="Дары путешествия">${DAR_TABS.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" data-a="dartab" data-v="${k}">${l}${cnt[k] ? ' · ' + fmt(cnt[k]) : ''}</button>`).join('')}</div>`;
  const list = ps => `<div class="dar-list">${ps.map(darRow).join('')}</div>`;
  let body;
  if (tab === 'hist') {
    const h = got.slice().sort((a, b) => G.got[b.key] - G.got[a.key]);
    body = `<span class="eyebrow dar-sec">История · ${h.length}</span>${h.length ? list(h) : '<p class="faint">Пока ничего не получено.</p>'}${TM('Полученное не выдаётся второй раз ни здесь, ни на другом экране.', 'p', 'reason')}`;
  } else {
    const mine = rows.filter(p => p.cat === tab), okR = mine.filter(p => p.st === 'ok'), wait = mine.filter(p => p.st === 'wait');
    body = `<span class="eyebrow dar-sec">Подтверждено · ${darChests(darCount(okR))}</span>${okR.length ? list(okR) : '<p class="faint">Всё подтверждённое уже получено.</p>'}
      ${wait.length ? `<span class="eyebrow dar-sec">${tab === 'clan' ? 'Ждёт подсчёта и распределения' : 'Ждёт подсчёта недели'} · ${wait.length}</span>${list(wait)}` : ''}
      ${PL(...DAR_NOTE[tab], 'p', 'reason')}`;
  }
  const foot = tab === 'hist'
    ? `<button class="link" data-a="dartab" data-v="${G.cat || 'me'}">${ic('back')}К наградам</button><button class="btn" data-a="zpto" data-v="chest">Сундуки в запасах</button>`
    : `<button class="link" data-a="dartab" data-v="hist">История${got.length ? ' · ' + fmt(got.length) : ''}</button><button class="link" data-a="zpto" data-v="chest">В запасы</button><button class="btn go" data-a="darall" data-v="${tab}" ${cnt[tab] ? '' : 'disabled'}>Получить всё${cnt[tab] ? ' · ' + fmt(cnt[tab]) : ''}</button>`;
  return sheet('Дары путешествия', `${top}${tabs}${body}`, foot, true);
};
/* попап «Доступно N сундуков»: квадратные иконки разных сундуков, редкость, количество и возможное содержимое — как в запасах */
OV.darbox = function () {
  const V = zpV(), m = new Map();
  for (const p of darRows(S)) if (p.st === 'ok') for (const g of p.groups) {
    const sp = { box: p.box, r: g.r, cyc: p.c, win: g.win, week: p.box === 'shards' ? p.wk.race : null }, k = zpChestKey(sp);
    if (!m.has(k)) m.set(k, { k, sp, n: 0 });
    m.get(k).n += g.count;
  }
  const bi = LBX ? Object.keys(LBX.boxes) : [];
  const list = [...m.values()].sort((a, b) => bi.indexOf(a.sp.box) - bi.indexOf(b.sp.box) || a.sp.r - b.sp.r || String(a.sp.week).localeCompare(String(b.sp.week), 'ru'));
  const N = list.reduce((a, x) => a + x.n, 0), sel = list.find(x => x.k === V.gifts.box) || list[0];
  const grid = list.map(x => `<button class="well dar-box zp-well ${x === sel ? 'sel' : ''}" data-r="${x.sp.r}" data-a="darpick" data-v="${trEsc(x.k)}" aria-pressed="${x === sel}" aria-label="${zpBoxName(x.sp)}, ${x.n} шт." title="${zpBoxName(x.sp)}">${zpChestIco(x.sp.box)}<span class="q">${x.n}</span></button>`).join('');
  const info = sel ? `${zpHead({ tile: zpTile(zpIcon({ kind: 'chest', cs: sel.sp }), sel.sp.r, { lg: true, cls: 'chest' }), eb: cap1(zpChestWhen(sel.sp)), name: zpBoxName(sel.sp), cr: zpCr(sel.sp.r), q: '×' + fmt(sel.n), ql: 'к получению' })}${zpInfo(sel.sp, zpDef(sel.sp))}`
    : '<p class="faint">Доступных сундуков нет.</p>';
  return dialog(`${plural(N, 'Доступен', 'Доступно', 'Доступно')} ${darChests(N)}`, `<div class="dar-grid">${grid}</div>${info}`,
    `<span class="faint dar-fnote">Получить — в Дарах, открыть — в запасах</span><button class="btn" data-a="sheet" data-v="gifts">${ic('back')}К Дарам</button>`, 'wide');
};

/* ================== действия ================== */
Object.assign(ACT, {
  zptab(v) { if (ZP_TABS.some(([k]) => k === v)) zpV().tab = v; render(); },
  /* фильтр из листа: «ключ:значение»; повторное нажатие снимает, пустое значение — «Все» */
  zpf(v) {
    const V = zpV(), s = String(v), i = s.indexOf(':'), k = s.slice(0, i), x = s.slice(i + 1);
    if (!(k in ZP_FNAME)) return;
    V.f[k] = V.f[k] === x ? '' : x; render();
  },
  zpun() { const V = zpV(); V.f.un = !V.f.un; render(); },
  zpclr() { const V = zpV(); V.f = zpFNone(); V.q = ''; render(); },
  zpsel(v) {
    const V = zpV(), tab = V.tab, e = zpEntries(tab).find(x => x.key === v);
    V.sel[tab] = v; V.pick = e && zpIsNew(e) ? v : '';
    if (e) zpSeen(e);
    if (tab === 'chest') { V.n = 1; if (V.last && V.last.key !== v) V.last = null; }   // итог другого сундука не висит в чужой карточке
    /* отклик выбора (только вид): искры цвета редкости у выбранной клетки — screens/crafthall.js */
    if (e && typeof crBurst === 'function') crBurst('.zp-cell[aria-current="true"]', 'pick', e.r && typeof crColor === 'function' ? crColor(e.r) : undefined);
    render();
  },
  zpn(v) {
    const V = zpV(), e = zpView('chest').sel, count = e && e.kind === 'chest' ? e.q : 0;
    if (!count) return;
    V.n = v === 'max' ? count : Math.max(1, Math.min(count, (V.n || 1) + (+v || 0)));
    render();
  },
  /* «Открыть»: v — вид сундука; номер операции и сколько (data-n: число или all) — с кнопки; без кнопки — выбор в карточке */
  zpopen(v, t) { const d = (t && t.dataset) || {}; zpOpen(v, d.op || '', d.n === 'all' ? Infinity : +d.n || 0); },
  zpact(v) {
    const it = BAG.item(v), f = it && ACTIVATE[it.tier];
    if (typeof f !== 'function' || !BAG.has(v)) { toast('Призыв пока недоступен'); return; }
    f(v); render();
  },
  zpto(v) { S.overlay = null; S.seg.craft = 'stock'; zpV().tab = ZP_TABS.some(([k]) => k === v) ? v : 'chest'; go('craft'); },
  /* шарды рабочих — в артель: «Ритуалы», вкладка «Рабочие», лист «Артель» (screens/rituals.js) — там их пробуждают за души */
  zpartel() { if (typeof OV === 'undefined' || !OV.rtart) return; S.seg.rituals = 'work'; S.route = 'rituals'; open('rtart'); },
  /* талисман — к герою: карточка героя, вкладка «Сила», лист талисманов на первом свободном месте, талисман выбран */
  zptalgo(v) {
    const [hid, n] = String(v).split(':'), no = +n, h = H(hid);
    if (!h || !zpTL() || !TB.qty(no)) return;
    const eq = tlEq(h.id), slot = Math.max(0, eq.indexOf(null));
    S.route = 'heroes'; S.seg.heroes = 'coll'; S.hview = 'mine'; S.seg.hero = 'power'; S.selHero = h.id; S.seg.tal = 'fit';
    S.tal.pick = no; S.tal.pickFor = `${h.id}:${slot}`; S.overlay = { t: 'tal', arg: `${h.id}:${slot}` }; render();
  },
  /* ларец талисманов: v — «операция:id предмета» */
  zptalcasket(v) {
    const [op, id] = String(v).split(':'), r = zpTalCasket(op, id);
    if (r.again) return;
    if (r.refuse) { toast(r.refuse === 'lock' ? TL_WHY.lock() : 'Этого ларца нет в запасах.'); return; }
    const V = zpV(), key = 'x:' + TB.key(r.got); V.sel.tal = key; V.seen[key] = 0;
    toast(`Из ларца: ${tlName(r.got)} · ${RAR[tlR(r.got)].toLowerCase()}`);
  },
  dartab(v) { const G = zpV().gifts; if (!DAR_VIEWS.includes(v)) return; G.tab = v; if (v !== 'hist') G.cat = v; render(); },
  darget(v) { darClaim([v]); },
  darall(v) { darClaim(darRows(S).filter(p => p.cat === v && p.st === 'ok').map(p => p.key)); },
  darbox() { open('darbox'); },
  darpick(v) { zpV().gifts.box = v; render(); },
});
/* поиск перерисовывает список при вводе; курсор остаётся в поле */
document.addEventListener('input', e => {
  const t = e.target; if (!t || t.id !== 'zpq') return;
  const pos = t.selectionStart; zpV().q = t.value; render();
  const x = document.getElementById('zpq'); if (x) { x.focus(); try { x.setSelectionRange(pos, pos); } catch (_) { } }
});

/* экран недели: у кнопки «Дары» — доступные сундуки и число подтверждённых выплат вместо прежнего числа */
const zpWeekBase = SCREENS.week;
SCREENS.week = function () {
  const s = zpWeekBase.apply(this, arguments);
  if (!s || typeof s.html !== 'string') return s;
  const ok = darRows(S).filter(p => p.st === 'ok'), n = darCount(ok);
  s.html = s.html.replace(/(<button class="gifts"[^>]*>[\s\S]*?<small>)[^<]*(<\/small><\/span>)(?:<span class="bdg">[^<]*<\/span>)?/,
    (m0, a, b) => `${a}${darChests(n)}${b}${ok.length ? `<span class="bdg">${ok.length}</span>` : ''}`);
  return s;
};

/* ================== раздел UI-кита: вкладки запасов и плитки сундуков ================== */
function zpKitHtml() {
  const tabs = `<div class="tabs" role="tablist">${ZP_TABS.map(([k, l], i) => `<button role="tab" aria-selected="${i === 4}" title="${ZP_TAB_TIP[k] || l}">${l}</button>`).join('')}</div>`;
  const boxes = LBX ? Object.keys(LBX.boxes) : [];
  const chests = `<div class="k-row zp-kch">${boxes.map((b, i) => `<figure><span class="well zp-well" data-r="${(i % 7) + 1}" style="--s:64px">${zpChestIco(b)}</span><figcaption>${typeof CO_KINDS !== 'undefined' && CO_KINDS[b] ? CO_KINDS[b].n : LBX.boxes[b].n}</figcaption></figure>`).join('')}</div>`;
  const drawn = boxes.filter(zpChestDrawn).length;
  /* сетка: по одной клетке каждой вкладки, где есть записи, — только значок и число; нажатия в разделе нет */
  const cells = ZP_TABS.map(([k]) => (S.zp ? zpEntries(k)[0] : null)).filter(Boolean).map(e => zpCell(e, false).replace(/data-a="[^"]*"/, 'data-a="noop"')).join('');
  return `<section class="k-box zp-kit" style="grid-column:1/-1" id="kitStock"><h3>Запасы · семь вкладок</h3>
    <p class="k-note">Ресурсы, руны и ключи, осколки, призывы, сундуки, талисманы, снаряжение. Сундуки — только сундуки; талисманы и снаряжение — свои карточки и перековка; призывы — руины, крафтовые боссы и Многоликий. Артефактов в запасах нет: они живут в «Страннике».${TM(' Слова автора 29.09.2026. §14.3, экран — screens/bag.js.')}</p>
    ${tabs}
    <div class="k-air-r"><b>Сетка — значок и число</b><div class="zp-grid zp-kgrid">${cells}</div><small>Шесть столбцов, видно пять рядов, дальше прокрутка. Имени в клетке нет: имя, редкость словом и всё описание — в карточке справа по выбору. Талисман, предмет и осколки героя — арт в рамке редкости.</small></div>
    <div class="k-air-r"><b>Плитка сундука — рисованный сундук своего вида</b>${chests}<small>Корпус и крышка — слоями по рамке окна открытия; эмблема вида — на крышке. Кромка — редкость.${TM(` Рисунком — ${drawn} из ${boxes.length}, выгрузка — CO_ART.ready (screens/chest-open.js).`)}</small></div>
  </section>`;
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: zpKitHtml });

/* сценарии презентации */
FLOWS.push(
  ['Запасы · сундуки', 'Карточка сундука §14.4: тип, редкость, количество и «Открыть»; состав и шансы — по нажатию, итог — крупно в той же карточке', () => { S.route = 'craft'; S.seg.craft = 'stock'; zpV().tab = 'chest'; S.overlay = null; }],
  ['Дары путешествия', 'Две категории: подтверждённое и ждущее подсчёта, одно действие на строку; попап сундуков', () => { S.route = 'week'; S.overlay = { t: 'gifts', arg: 'me' }; }],
  ['Запасы · талисманы', 'Своя вкладка: медальон, эффект и привязка, фильтр «подходит классу», переход к герою; ларец из мастерской', () => {
    S.route = 'craft'; S.seg.craft = 'stock'; S.overlay = null; const V = zpV(); V.tab = 'tal';
    if (ZP_DEMO.flow.talCasket && !BAG.has(ZP_DEMO.flow.talCasket)) BAG.add(ZP_DEMO.flow.talCasket, 1);
    const e = zpTals().sort((a, b) => b.r - a.r)[0]; if (e) V.sel.tal = e.key;
  }],
  ['Запасы · снаряжение', 'Предметы по слотам: главная строка, на ком надет; «Свойства и сравнение», «Надеть» с выбором героя, перековка, ларец', () => {
    S.route = 'craft'; S.seg.craft = 'stock'; S.overlay = null; const V = zpV(); V.tab = 'eq';
    if (zpEQ() && typeof EQ_DEMO !== 'undefined' && !BAG.has(EQ_DEMO.flow.casket)) BAG.add(EQ_DEMO.flow.casket, 1);
    const e = zpEquip().sort((a, b) => b.r - a.r)[0]; if (e) V.sel.eq = e.key;
  }],
);

/* ================== состояние ==================
   S.zp — вкладка, фильтры, выбор, «новое», выбор количества и итог открытия, открытые сундуки, список «из сундуков», ларцы и Дары.
   Осколки героев демо кладутся в S.rs.shards, если там пусто: их видит и «Призыв → За души». */
function zpState(s) {
  const F = ZP_DEMO.fresh, seen = {};
  for (const id of Object.keys(s.bag.items)) if (!F.items.includes(id)) seen['i:' + id] = 1;
  s.bag.chests.forEach((c, i) => { if (!F.chests.includes(i + 1)) seen['c:' + c.id] = 1; });
  if (!Object.keys(s.rs.shards).length) for (const [id, n] of Object.entries(ZP_DEMO.shards)) if (RSI[id]) s.rs.shards[id] = n;
  for (const id of Object.keys(s.rs.shards)) if (!F.heroes.includes(id)) seen['h:' + id] = 1;
  s.zp = { tab: 'res', f: zpFNone(), q: '', sel: {}, seen, pick: '', n: 1, last: null, opened: {}, ops: {}, op: 1, extra: {}, cops: {}, cop: 1, gifts: { tab: 'me', cat: 'me', got: {}, seq: 0, box: '' } };
  for (const p of darRows(s, 'prev')) if (p.kind === 'plank') s.zp.gifts.got[p.key] = ++s.zp.gifts.seq;   // прошлая неделя: личные планки уже получены
  return s;
}
const zpInitBase = initialState;
initialState = function () { return zpState(zpInitBase()); };
zpState(S);
