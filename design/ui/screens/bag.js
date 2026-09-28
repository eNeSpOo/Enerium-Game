/* screens/bag.js — «Ремесло → Запасы», сундуки и «Дары путешествия». Договор — screens/model.js: запасы S.bag и BAG,
   найденные рецепты, сундуки S.bag.chests, активации ACTIVATE. Своё состояние — S.zp, заводится так же, как S.bag в model.js.
   Вид — по «Правилам воздуха» UI-кита: одна рамка, одно главное действие, подробности — в листе по нажатию, лор свёрнут.
   Запасы по §14.3: вкладки — ресурсы, руны и ключи, осколки героев, активации, сундуки; артефакты — позже. Над списком —
   поиск и кнопка «Фильтры»: цикл, ремесло, редкость, «не в найденных рецептах» — в листе. Список — одна строка на запись.
   Карточка ресурса: значок, имя, кристалл редкости, количество, одно действие. Загадка свёрнута в две строки;
   «Найденные рецепты» (BAG.knownUses) и «Откуда падает» — листы по нажатию. Пометка «новое» — в списке и в карточке.
   Сундук — карточка §14.4: тип, редкость, количество и «Открыть»; выбор количества и итог — в ней же, итог крупно.
   Состав и шансы — лист по нажатию (EnLoot.resolve). Открытие — EnLoot.roll на сиде сундука. В игре сид выдаёт сервер
   вместе с сундуком, итог открытия — тоже его (§34.1, §36.16). Осколки пробуждённых героев уходят в прах (§15.2) — EnLoot.toDust.
   Открытие — операция с номером (zpOpen, S.zp.ops): выдача до показа, повтор номера ничего не выдаёт; показывает итог окно
   открытия screens/chest-open.js — анимация, пачка, «Пропустить анимацию»; после окна итог остаётся в карточке.
   Талисманы, шарды рабочих и снаряжение — отдельный список S.zp.extra, пока у них нет своих экранов.
   Дары путешествия по §23.1: две категории — личный рейтинг и клановые награды; история полученного — отдельным видом.
   Строка выплаты — режим и планка или место, период, состав и одно действие; основание выплаты — в подсказке строки,
   цикл — в сумме сверху. Строки — lbGiftRows UI-кита на EN_LOOTBOXES.modes (типичная неделя), места — рейтинги недели.
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
  /* «Дары путешествия»: чья неделя — typical из EN_LOOTBOXES.modes: free — обычный игрок, fan — увлечённый.
     Прошлая неделя подсчитана: личные места по режимам (id режима → место); её личные планки уже получены и лежат в истории.
     Места текущей недели — из рейтингов S.ranks. */
  gifts: { who: 'free', prevPlaces: { echo: 212, contract: 41, arena: 95 } },
};
/* числа вида, не баланса */
const ZP_VIEW = {
  fold: 84,   // загадка и лор длиннее стольких знаков — свёрнуты в две строки с «ещё», короче — видны целиком
};

/* ================== справочники экрана ================== */
const ZP_TABS = [['res', 'Ресурсы'], ['rune', 'Руны и ключи'], ['shard', 'Осколки героев'], ['act', 'Активации'], ['chest', 'Сундуки'], ['art', 'Артефакты']];
/* подпись вкладки в строке: коротко, чтобы шесть вкладок и «Дары» уместились в 844 px */
const ZP_TAB_SHORT = { shard: 'Осколки' };
/* ярус предмета → вкладка; всё остальное — ресурсы */
const ZP_TAB_OF = { rune: 'rune', vshard: 'rune', valor: 'rune', act: 'act', call: 'act', echo: 'act' };
/* группы списка — порядок и подписи; у осколков — по источнику героя */
const ZP_GRP = [
  ['basic', 'Базовые · общий пул'], ['key', 'Ключи ремёсел'], ['unique', 'Уникальные'], ['craftres', 'Ресурсы руин'], ['find', 'Находки руин'],
  ['trophy', 'Трофеи'], ['part', 'Заготовки'], ['made', 'Изделия'], ['product', 'Награды мастерской'], ['hero', 'Герои из рецептов'],
  ['wallet', 'Кошелёк'], ['rune', 'Руны предела'], ['vshard', 'Осколки доблести'], ['valor', 'Руны доблести'],
  ['h.echo', 'Отряды Эхо'], ['h.roulette', 'Возрождение душ'],
  ['act', 'Активации крафтовых биомов'], ['call', 'Призывы'], ['echo', 'Добыча Эхо'],
  ['chest', 'Закрытые сундуки'], ['extra', `Из сундуков${TM(' · свои экраны позже')}`],
];
const ZP_GRP_I = Object.fromEntries(ZP_GRP.map(([k], i) => [k, i]));
/* надпись над именем в карточке: ремесло, у предмета без ремесла — короткое имя яруса (полное — в recipes.js) */
const ZP_KIND = {
  unique: 'Уникальный ресурс', find: 'Находка руин', trophy: 'Трофей', act: 'Активация биома', call: 'Призыв босса', echo: 'Добыча Эхо',
  rune: 'Руна предела', vshard: 'Осколок доблести', valor: 'Руна доблести', hero: 'Герой из рецепта', product: 'Награда мастерской',
};
/* фильтры вкладки: цикл, ремесло, редкость, «не в найденных рецептах»; поиск — у всех. Подписи — в листе «Фильтры» */
const ZP_FILT = { res: ['cyc', 'spec', 'r', 'un'], rune: ['cyc', 'r', 'un'], shard: ['cyc', 'r'], act: ['cyc', 'spec', 'r'], chest: ['cyc', 'r'] };
const ZP_FNAME = { cyc: 'Цикл', spec: 'Ремесло', r: 'Редкость' };
/* «Руны и ключи»: рунные ключи и прах — из кошелька */
const ZP_WALLET = ['keys', 'dust'];
const ZP_WALLET_NOTE = {
  keys: 'Вход к рунному стражу. Остаток общий для всех экранов.',
  dust: 'Общий остаток запасов, Возрождения душ и мастерской. Сюда уходят осколки пробуждённых героев.',
};
const ZP_EMPTY = {
  res: 'Запасы пусты: ресурсы приносят биомы, ритуалы и сундуки.',
  rune: 'Рун пока нет: их приносят рунные стражи.',
  shard: 'Осколков нет: они приходят из сундуков Эхо, возрождения душ и каталога праха.',
  act: 'Активаций нет: их создают в мастерской по найденным рецептам.',
  chest: 'Сундуков нет: их приносят Дары путешествия, крафтовые боссы и первые победы.',
};
/* §12.5: до активации карточка не называет будущий биом или врага — имя видно только в режиме «Команда».
   Одна строка: подробности — в подтверждении активации */
const ZP_OPENS = {
  act: 'Призывает крафтовый биом, если есть свободный слот.',
  call: 'Призывает врага в Эхо за предмет и 1 душу.',
};
const ZP_EXTRA_IC = { tal: 'gem', wsh: 'gear', eq: 'shield' };
/* пометки — [игроку, команде]: про экраны, которых в прототипе ещё нет, знает только команда (режим «Игрок / Команда») */
const ZP_EXTRA_NOTE = {
  tal: ['Духовный талисман.', 'Духовный талисман. Своего экрана у талисманов пока нет — до него талисман лежит здесь.'],
  wsh: ['Шарды рабочего: из них собирают рабочего для ритуалов.', 'Шарды рабочего: из них собирают рабочего для ритуалов. Экран рабочих — позже, шарды ждут здесь.'],
  eq: ['Предмет снаряжения.', 'Предмет снаряжения. Экран снаряжения появится позже — до него предмет лежит здесь.'],
};
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
const zpTabOf = it => ZP_TAB_OF[it.tier] || 'res';
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
const zpGrpName = g => { const x = ZP_GRP.find(([k]) => k === g); return x ? x[1] : g.startsWith('h.') ? RS_SRC_ONE[g.slice(2)] || g.slice(2) : g; };
const darChests = n => `${fmt(n)} ${plural(n, 'сундук', 'сундука', 'сундуков')}`;
const darCount = ps => ps.reduce((a, p) => a + p.groups.reduce((b, g) => b + g.count, 0), 0);
const zpFCount = E => ['cyc', 'spec', 'r'].filter(k => E[k]).length + (E.un ? 1 : 0);

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

/* ================== записи вкладок ================== */
function zpItems(tab) {
  const out = [];
  for (const [id, q] of Object.entries(S.bag.items)) {
    const it = BAG.item(id);
    if (!it || !(q > 0) || zpTabOf(it) !== tab) continue;
    out.push({ key: 'i:' + id, kind: 'item', id, it, q, name: zpName(it), r: it.r, cyc: it.pool ? 'pool' : it.cyc, spec: it.spec || '', grp: it.tier, un: !zpKnown(id).length });
  }
  return out;
}
function zpHeroes() {
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
function zpExtras() {
  return Object.entries(zpV().extra).filter(([, q]) => q > 0).map(([k, q]) => {
    const [xk, id, r] = k.split(':');
    return { key: 'x:' + k, kind: 'extra', xk, id, q, r: +r, name: zpExtraName(xk, id, +r), grp: 'extra' };
  });
}
function zpEntries(tab) {
  const list = tab === 'res' || tab === 'act' ? zpItems(tab)
    : tab === 'rune' ? ZP_WALLET.map((k, i) => ({ key: 'w:' + k, kind: 'wallet', k, q: S.wallet[k] || 0, name: zpCurName(k), grp: 'wallet', ord: i })).concat(zpItems('rune'))
      : tab === 'shard' ? zpHeroes()
        : tab === 'chest' ? zpChestGroups().concat(zpExtras()) : [];
  const so = RX.specOrder || Object.keys(RX.specs);
  const gi = e => e.grp in ZP_GRP_I ? ZP_GRP_I[e.grp] : ZP_GRP.length;
  const ci = e => e.cyc === 'pool' ? 0 : +e.cyc || 0;
  const si = e => { const i = so.indexOf((e.spec || '').split('+')[0]); return i < 0 ? so.length : i; };
  return list.sort((a, b) => gi(a) - gi(b) || ci(a) - ci(b) || si(a) - si(b) || (a.r || 0) - (b.r || 0) || (a.ord || 0) - (b.ord || 0) || a.name.localeCompare(b.name, 'ru'));
}

/* «новое» — то, что игрок ещё не открывал */
function zpIsNew(e) {
  const s = zpV().seen;
  return e.kind === 'item' ? !s['i:' + e.id] : e.kind === 'hero' ? !s['h:' + e.h.id] : e.kind === 'chest' ? e.list.some(c => !s['c:' + c.id]) : e.kind === 'extra' ? !s[e.key] : false;
}
const zpIsNewShown = e => zpIsNew(e) || zpV().pick === e.key;
function zpSeen(e) {
  const s = zpV().seen;
  if (e.kind === 'item') s['i:' + e.id] = 1; else if (e.kind === 'hero') s['h:' + e.h.id] = 1;
  else if (e.kind === 'chest') e.list.forEach(c => { s['c:' + c.id] = 1; }); else if (e.kind === 'extra') s[e.key] = 1;
}

/* ================== фильтры ================== */
function zpOpts(all) {
  const cyc = new Set(), spec = new Set(), r = new Set();
  for (const e of all) { if (e.cyc != null) cyc.add(String(e.cyc)); if (e.spec) e.spec.split('+').forEach(x => spec.add(x)); if (e.r) r.add(String(e.r)); }
  return {
    cyc: [...cyc].sort((a, b) => (a === 'pool' ? 0 : +a) - (b === 'pool' ? 0 : +b)),
    spec: (RX.specOrder || Object.keys(RX.specs)).filter(x => spec.has(x)),
    r: [...r].sort((a, b) => a - b),
  };
}
/* действующие фильтры: неприменимые к вкладке и отсутствующие в её списке значения не действуют */
function zpEff(tab, O) {
  const V = zpV(), f = V.f, on = ZP_FILT[tab] || [];
  return {
    cyc: on.includes('cyc') && O.cyc.includes(f.cyc) ? f.cyc : '', spec: on.includes('spec') && O.spec.includes(f.spec) ? f.spec : '',
    r: on.includes('r') && O.r.includes(f.r) ? f.r : '', un: on.includes('un') && !!f.un, q: trNorm(V.q.trim()),
  };
}
function zpMatch(e, E) {
  if (E.q && !trNorm(e.name).includes(E.q)) return false;
  if (E.cyc && String(e.cyc) !== E.cyc) return false;
  if (E.spec && !(e.spec || '').split('+').includes(E.spec)) return false;
  if (E.r && String(e.r) !== E.r) return false;
  if (E.un && !(e.kind === 'item' && e.un)) return false;
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
const zpTile = (inner, r, o = {}) => `<span class="zp-ic${o.lg ? ' lg' : ''}${o.face ? ' face' : ''}"${r ? ` data-r="${r}"` : ''}>${inner}${o.q ? `<span class="q">${o.q}</span>` : ''}${o.dot ? '<span class="dot zp-dot" title="Новое"></span>' : ''}</span>`;
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
const zpItemTile = (it, o = {}) => zpTile(it.team ? ic('lock') : trIcon(it), it.r, o);
const zpItemEb = it => zpSpec(it.spec) || ZP_KIND[it.tier] || (RX.tiers[it.tier] || { n: 'Предмет' }).n;
/* цикл и неделя сундука — одной строкой: сундуки одного вида из разных циклов и недель различаются только ими */
const zpChestWhen = sp => `цикл ${ROMAN[sp.cyc] || sp.cyc}${sp.box === 'shards' && sp.week ? ' · неделя ' + zpWeekGen(sp.week) : ''}`;

/* ================== список ================== */
function zpIcon(e) {
  if (e.kind === 'item') return e.it.team ? ic('lock') : trIcon(e.it);
  if (e.kind === 'wallet') return `<img src="${CUR[e.k].img}" alt="">`;
  if (e.kind === 'hero') return rsFace(e.h);
  if (e.kind === 'chest') return `<img src="${CHEST}" alt=""><span class="zp-k">${ic(LB_IC[e.cs.box] || 'gem')}</span>`;
  return ic(ZP_EXTRA_IC[e.xk] || 'gem');
}
/* подсказка строки: ремесло и цикл, источник — в строке их нет */
function zpSub(e) {
  if (e.kind === 'item') { const it = e.it; return `${zpSpec(it.spec) || (RX.tiers[it.tier] || { n: '' }).n} · ${it.pool ? 'общий пул' : 'цикл ' + ROMAN[it.cyc]}`; }
  if (e.kind === 'wallet') return 'кошелёк · общий остаток';
  if (e.kind === 'hero') return `${RAR[e.h.r]} · ${RS_SRC_ONE[e.h.src] || ''} · цикл ${ROMAN[e.h.c]}`;
  if (e.kind === 'chest') { const sp = e.cs, c = e.list[0]; return `цикл ${ROMAN[sp.cyc] || sp.cyc}${sp.week ? ' · неделя ' + zpWeekGen(sp.week) : ''}${c && c.src ? ' · ' + zpClean(c.src) : ''}`; }
  return `из сундуков · ${(RAR[e.r] || '').toLowerCase()}`;
}
/* строка списка — одна линия: плитка, имя, количество; у сундука — ещё цикл и неделя бледным, иначе одинаковые сундуки не различить */
function zpRow(e, on) {
  const hero = e.kind === 'hero', right = hero ? `${fmt(e.q)}/${zpNeed()}` : `×${fmt(e.q)}`;
  const hint = e.kind === 'chest' ? `<small>${zpChestWhen(e.cs)}</small>` : '';
  return `<button class="zp-row" data-a="zpsel" data-v="${trEsc(e.key)}" aria-current="${!!on}" title="${trEsc(e.name + ' — ' + zpSub(e))}">${zpTile(zpIcon(e), e.r, { face: hero, dot: zpIsNew(e) })}<span class="zp-rt"><b>${trEsc(e.name)}</b>${hint}</span><span class="num">${right}</span></button>`;
}
/* над списком одна строка: поиск и «Фильтры» — сами фильтры в листе */
function zpListPanel(tab, all, shown, sel, E) {
  const V = zpV(), n = zpFCount(E);
  const find = `<label class="search grow">${ic('search')}<input id="zpq" type="search" placeholder="Поиск по запасам" value="${trEsc(V.q)}" autocomplete="off" aria-label="Поиск по запасам"></label>`;
  const fb = (ZP_FILT[tab] || []).length ? `<button class="btn sm zp-fb" data-a="sheet" data-v="zpfilt" aria-pressed="${!!n}">${ZP_FUNNEL}Фильтры${n ? `<b class="num">${n}</b>` : ''}</button>` : '';
  let body = '';
  if (!shown.length) body = `<div class="zp-empty">${all.length ? '<p class="faint">Ничего не найдено.</p><button class="btn sm" data-a="zpclr">Сбросить фильтры</button>' : `<p class="faint">${ZP_EMPTY[tab]}</p>`}</div>`;
  else {
    let g = null;
    for (const e of shown) {
      if (e.grp !== g) { g = e.grp; body += `<span class="eyebrow zp-gh">${zpGrpName(g)}<i>${shown.filter(x => x.grp === g).length}</i></span>`; }
      body += zpRow(e, sel && e.key === sel.key);
    }
  }
  const keep = trEsc(['zpl', tab, E.cyc, E.spec, E.r, E.un ? 1 : 0, E.q].join(':'));
  return `<div class="pnl inv zp-inv">
    <div class="row zp-find">${find}${fb}</div>
    <div class="zp-list ${tab === 'shard' || tab === 'chest' ? 'one' : ''} scroll grow" data-keep="${keep}">${body}</div>
  </div>`;
}

/* ================== карточки ================== */
function zpCardItem(e) {
  const it = e.it, act = zpTabOf(it) === 'act', uses = zpKnown(it.id), src = it.team ? [] : zpSrc(it);
  const lore = it.team ? '<p class="reason">Сведения откроются в своём цикле.</p>' : zpLore(trEsc(it.lore), 'Загадка');
  const opens = it.opens ? `<p class="zp-p">${ZP_OPENS[it.tier === 'act' ? 'act' : 'call']}${KH.team ? ` <span class="faint">Для команды: «${trEsc(it.opens)}».</span>` : ''}</p>` : '';
  /* активацию применяют из запасов: строка рецептов у неё — только если она входит в найденный рецепт */
  const use = uses.length ? zpLink('zpuse:' + it.id, 'Найденные рецепты', `<b class="num">${uses.length}</b>`) : act ? '' : '<p class="zp-none">Ни в одном найденном рецепте</p>';
  const links = use + (src.length ? zpLink('zpsrc:' + it.id, 'Откуда падает') : '');
  const fn = act && typeof ACTIVATE[it.tier] === 'function';
  const acts = !act ? `<button class="btn go" data-a="toCraft" data-v="${it.id}" title="Положить на стол мастерской">${ic('arrow')}На стол мастера</button>`
    : fn ? `<button class="btn go" data-a="zpact" data-v="${it.id}">Активировать</button>`
      : `<span class="chip warn" title="${tmT('Активация пока недоступна', 'Обработчик активации ещё не подключён')}">недоступно</span><button class="btn go" disabled>Активировать</button>`;
  return `<div class="pnl icard fit zp-card">
    ${zpHead({ tile: zpItemTile(it, { lg: true }), eb: zpItemEb(it), name: trEsc(zpName(it)), cr: zpCr(it.r), q: fmt(e.q), ql: 'в запасах', e })}
    <div class="col scroll grow zp-body" data-keep="zpc:${trEsc(e.key)}">${lore}${opens}${links ? `<div class="zp-links">${links}</div>` : ''}</div>
    <div class="acts2">${acts}</div>
  </div>`;
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
  const st = has ? '<p class="zp-p">Герой уже пробуждён: новые осколки уходят в прах.</p>' : '';
  const name = `<button class="zp-hn" data-a="rhero" data-v="${h.id}" aria-label="Карточка героя: ${trEsc(h.n)}">${trEsc(h.n)}${ic('chev')}</button>`;
  const acts = has ? `<button class="btn go" data-a="rhero" data-v="${h.id}">Карточка героя</button>`
    : `<button class="btn sm" data-a="dustbuy" data-v="${h.id}"${open ? '' : ' disabled'}>Осколок${costTag('dust', rsShardPrice(h))}</button><button class="btn go" data-a="activate" data-v="${h.id}"${n >= need ? '' : ' disabled'}>Пробудить${costTag('souls', souls)}</button>`;
  return `<div class="pnl icard fit zp-card zp-hero">
    ${zpHead({ tile: zpTile(rsFace(h), h.r, { lg: true, face: true }), eb: `${RS_SRC_ONE[h.src] || ''} · цикл ${ROMAN[h.c]}`, name, cr: zpCr(h.r), q: `${fmt(n)}<span class="zp-of">/${need}</span>`, ql: 'осколков', e })}
    <div class="col scroll grow zp-body" data-keep="zpc:${trEsc(e.key)}">${bar(Math.min(100, Math.floor(n * 100 / (need || 1))), n >= need ? 'sp' : '')}${st}${zpLore(trEsc(h.who || ''))}</div>
    <div class="acts2">${acts}</div>
  </div>`;
}
function zpCardExtra(e) {
  return `<div class="pnl icard fit zp-card">
    ${zpHead({ tile: zpTile(ic(ZP_EXTRA_IC[e.xk] || 'gem'), e.r, { lg: true }), eb: 'Из сундуков', name: trEsc(e.name), cr: zpCr(e.r), q: fmt(e.q), ql: 'в запасах', e })}
    <div class="col zp-body">${ZP_EXTRA_NOTE[e.xk] ? PL(...ZP_EXTRA_NOTE[e.xk], 'p', 'zp-p') : ''}</div>
  </div>`;
}

/* возможное содержимое сундука — лист «Состав и шансы» в запасах и попап Даров */
function zpLineSum(l, x) {
  const k = LBX.lines[l.line].kind, n = l.entries.length;
  if (k === 'tal') return `${n} ${plural(n, 'талисман', 'талисмана', 'талисманов')} этой редкости`;
  if (k === 'equip') return 'слот — случайный';
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
  const tile = (inner, r, q, name, o = {}) => `<div class="zp-rl${o.dust ? ' zp-dust' : ''}" title="${o.tip || name}">${zpTile(inner, r, { lg: true, face: !!o.face, q })}<small>${name}</small></div>`;
  const cur = Object.entries(s.cur).map(([k, a]) => `<span class="zp-rc" title="${zpCurName(k)}"><img src="${curImg(k)}" alt="${zpCurName(k)}"><b class="num">+${fmt(a)}</b></span>`).join('');
  const tiles = [
    ...Object.entries(s.items).map(([id, q]) => { const it = BAG.item(id); return it ? tile(it.team ? ic('lock') : trIcon(it), it.r, '×' + fmt(q), trEsc(zpName(it))) : ''; }),
    ...Object.entries(s.shards).map(([id, q]) => { const h = RSI[id]; return h ? tile(rsFace(h), h.r, '×' + fmt(q), trEsc(h.n), { face: true, tip: `Осколки героя: ${trEsc(h.n)} ×${fmt(q)}` }) : ''; }),
    ...Object.entries(s.dust).map(([id, d]) => { const h = RSI[id]; return h ? tile(rsFace(h), h.r, '+' + fmt(d), `${trEsc(h.n)} → прах`, { face: true, dust: true, tip: `${trEsc(h.n)} уже пробуждён: осколки ×${fmt(s.dustQ[id])} → прах +${fmt(d)}` }) : ''; }),
    ...Object.entries(s.extra).map(([k, q]) => { const [xk, id, r] = k.split(':'); return tile(ic(ZP_EXTRA_IC[xk] || 'gem'), +r, '×' + fmt(q), trEsc(zpExtraName(xk, id, +r))); }),
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
    ${zpHead({ tile: zpTile(zpIcon(e), sp.r, { lg: true }), eb, name, cr: zpCr(sp.r), q: count ? '×' + fmt(count) : null, ql: 'в запасах', e })}
    <div class="col scroll grow zp-body" data-keep="zpc:${trEsc(e.key)}:${last ? last.no : 0}">${last ? zpResHtml(last) : inside}${def ? `<div class="zp-links">${zpLink('zpbox:' + e.key, 'Состав и шансы')}</div>` : ''}</div>
    ${ctl ? `<div class="zp-foot">${ctl}</div>` : ''}
  </div>`;
}
function zpCard(e, tab) {
  if (!e) return `<div class="pnl icard fit zp-card"><p class="faint">${tab === 'chest' ? 'Сундуков в запасах нет.' : 'Выберите запись слева.'}</p></div>`;
  return e.kind === 'item' ? zpCardItem(e) : e.kind === 'wallet' ? zpCardWallet(e) : e.kind === 'hero' ? zpCardHero(e) : e.kind === 'chest' ? zpCardChest(e) : zpCardExtra(e);
}

/* ================== экран «Ремесло → Запасы» ================== */
function zpBar() {
  const V = zpV(), avail = darCount(darRows(S).filter(p => p.st === 'ok'));
  const tabs = ZP_TABS.map(([k, l]) => {
    if (k === 'art') return `<button role="tab" aria-selected="${V.tab === k}" data-a="zptab" data-v="${k}" title="${l}: вкладка появится позже">${l}</button>`;
    const all = zpEntries(k), n = k === 'chest' ? all.reduce((a, e) => a + (e.kind === 'chest' ? e.q : 0), 0) : all.length;
    return `<button role="tab" aria-selected="${V.tab === k}" data-a="zptab" data-v="${k}" title="${l}: ${fmt(n)}">${ZP_TAB_SHORT[k] || l}${k === 'chest' && n ? ' · ' + fmt(n) : ''}${all.some(zpIsNew) ? '<span class="dot" title="Есть новое"></span>' : ''}</button>`;
  }).join('');
  return `<div class="row zp-bar"><div class="tabs" role="tablist" aria-label="Запасы">${tabs}</div><span class="g-spacer"></span><button class="btn sm zp-gb" data-a="sheet" data-v="gifts"><img src="${CHEST}" alt="">Дары${avail ? `<b class="num">${fmt(avail)}</b>` : ''}</button></div>`;
}
const zpLater = () => `<div class="pnl rs-closed fit zp-later"><span class="eyebrow">Артефакты</span><h2>Вкладка появится позже</h2>
  <p class="muted">Артефакты — пассивные умения аккаунта: покупаются за золото, растут за души. Пока они живут в профиле Странника.</p>
  <div class="row"><button class="btn" data-a="seg" data-v="profile:arts" data-go="profile">${ic('arrow')}Артефакты Странника</button></div></div>`;
/* вкладка целиком: все записи, фильтры, видимые записи и выбранная — одна выборка для экрана и действий */
function zpView(tab) {
  const all = zpEntries(tab), O = zpOpts(all), E = zpEff(tab, O), shown = all.filter(e => zpMatch(e, E));
  return { all, O, E, shown, sel: zpPick(tab, shown) };
}
CRAFT_SEGS.stock = function () {
  const tab = zpV().tab;
  if (tab === 'art') return `<section class="scr">${zpBar()}${zpLater()}</section>`;
  const W = zpView(tab);
  return `<section class="scr">${zpBar()}<div class="stock zp-stock">${zpListPanel(tab, W.all, W.shown, W.sel, W.E)}${zpCard(W.sel, tab)}</div></section>`;
};

/* ================== листы подробностей ================== */
const zpMini = it => zpHead({ tile: zpItemTile(it, { lg: true }), eb: zpItemEb(it), name: trEsc(zpName(it)), cr: zpCr(it.r), q: fmt(BAG.qty(it.id)), ql: 'в запасах' });
Object.assign(OV, {
  /* фильтры вкладки: цикл, ремесло, редкость, «не в найденных рецептах» — список за листом меняется сразу */
  zpfilt() {
    const V = zpV(), on = ZP_FILT[V.tab] || [], W = zpView(V.tab), O = W.O, E = W.E;
    const chip = (k, v, label, cur, r) => `<button class="chip zp-fc" data-a="zpf" data-v="${k}:${v}" aria-pressed="${!!cur}"${r ? ` data-r="${r}"` : ''}>${label}</button>`;
    const group = (k, list, label) => on.includes(k) && list.length ? `<span class="eyebrow">${ZP_FNAME[k]}</span><div class="zp-fcs">${chip(k, '', 'Все', !E[k])}${list.map(x => chip(k, x, label(x), E[k] === x, k === 'r' ? x : 0)).join('')}</div>` : '';
    const body = group('cyc', O.cyc, c => c === 'pool' ? 'Общий пул' : 'Цикл ' + ROMAN[c])
      + group('spec', O.spec, s => `${ic(RX.specs[s].icon || 'gem')}${RX.specs[s].n}`)
      + group('r', O.r, r => `${ICON('r' + r, 16)}${RAR[r]}`)
      + (on.includes('un') ? `<span class="eyebrow">Рецепты</span><div class="zp-fcs"><button class="chip zp-fc" data-a="zpun" aria-pressed="${E.un}">${ic('book')}Не в найденных рецептах</button></div>` : '');
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
    return sheet('Найденные рецепты', body, BAG.has(it.id) && zpTabOf(it) !== 'act' ? `<button class="btn go" data-a="toCraft" data-v="${it.id}">${ic('arrow')}На стол мастера</button>` : '');
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
    return sheet('Состав и шансы', `${zpHead({ tile: zpTile(zpIcon({ kind: 'chest', cs: sp }), sp.r, { lg: true }), eb: cap1(eb), name: zpBoxName(sp), cr: zpCr(sp.r) })}
      ${zpInfo(sp, zpDef(sp))}${from}${PL('Каждый сундук открывается один раз.', 'В игре итог открытия решает сервер: сид приходит вместе с сундуком, каждый сундук открывается один раз.', 'p', 'reason')}`, '', true);
  },
});

/* ================== открытие сундуков ================== */
function zpAddCur(k, a, sum) { S.wallet[k] = (S.wallet[k] || 0) + a; sum.cur[k] = (sum.cur[k] || 0) + a; }
/* один сундук: списать, потом выдать — повтор того же сундука ничего не выдаст */
function zpOpenOne(c, sum) {
  const V = zpV();
  if (V.opened[c.id] || !BAG.chest(c.id)) return false;
  const def = zpDef(c); if (!def) return false;
  const res = EnLoot.roll(def, zpSeed(c));
  const awake = {}; res.items.forEach(it => { if (it.kind === 'shard' && RSI[it.id] && rsHas(RSI[it.id])) awake[it.id] = true; });
  const conv = EnLoot.toDust(LBX, res, awake);   // §15.2: осколки пробуждённых — в прах, без бросков
  V.opened[c.id] = 1; BAG.dropChest(c.id);
  for (const [k, a] of conv.cur) zpAddCur(k, a, sum);
  for (const it of conv.items) {
    if (it.kind === 'item') { BAG.add(it.id, it.q); sum.items[it.id] = (sum.items[it.id] || 0) + it.q; }
    else if (it.kind === 'cur') zpAddCur(it.id, it.q, sum);
    else if (it.kind === 'shard') {
      if (it.dust) { S.wallet.dust += it.dust; sum.dust[it.id] = (sum.dust[it.id] || 0) + it.dust; sum.dustQ[it.id] = (sum.dustQ[it.id] || 0) + it.q; }
      else { S.rs.shards[it.id] = (S.rs.shards[it.id] || 0) + it.q; sum.shards[it.id] = (sum.shards[it.id] || 0) + it.q; }
    } else { const k = zpExtraKey(it); V.extra[k] = (V.extra[k] || 0) + it.q; sum.extra[k] = (sum.extra[k] || 0) + it.q; }
  }
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
  const n = Math.max(1, Math.min(want || V.n || 1, g.q)), sum = { n: 0, cur: {}, items: {}, shards: {}, dust: {}, dustQ: {}, extra: {}, log: [] };
  for (const c of g.list.slice(0, n)) zpOpenOne(c, sum);
  if (!sum.n) { toast('Эти сундуки уже открыты'); return; }
  V.last = { key, cs: g.cs, sum, no: (V.last ? V.last.no : 0) + 1, op: op || '' };
  if (op) ops[op] = V.last;
  V.op = (V.op || 1) + 1; V.sel.chest = key; V.n = 1;
  if (typeof coShow === 'function') coShow(V.last);
  else toast(`Открыто: ${darChests(sum.n)} · итог — в карточке`, CHEST);
}

/* ================== Дары путешествия ================== */
/* прошлая и текущая недели по порядку рас в roster.js; раса недели — S.week.race */
function darWeeks(st) {
  const W = RS.weeks || [], n = W.length, cur = trNorm(st.week.race), i = W.findIndex(w => trNorm(w.gen) === cur);
  if (i < 0) return [{ id: 'now', race: '', gen: String(st.week.race).toLowerCase(), counted: false }];
  const p = W[(i + n - 1) % n];
  return [{ id: 'prev', race: p.race, gen: p.gen, counted: true }, { id: 'now', race: W[i].race, gen: W[i].gen, counted: false }];
}
/* строки выплат: по одной на планку или место, с составом по сундукам.
   Планки — lbGiftRows UI-кита (типичная неделя ZP_DEMO.gifts.who), личные места — рейтинги недели. Статус: ok — подтверждено, wait — ждёт, got — получено */
function darRows(st) {
  if (!LBX || !st.zp) return [];
  const c = st.acc.cycle, got = st.zp.gifts.got, out = [], idx = new Map(), mid = {};
  for (const [id, m] of Object.entries(LBX.modes)) mid[m.n] = id;
  /* режим платит в этом цикле: он недельный, открыт и у него есть неделя в EN_LOOTBOXES.week */
  const isOpen = id => { const m = LBX.modes[id]; return !!m && m.weekly && c >= m.from && !!(LBX.week[id] && LBX.week[id][c]); };
  const put = (wk, cat, id, label, g, kind, place) => {
    const key = [wk.race || wk.gen, id, label].join('|');
    let p = idx.get(key);
    if (!p) {
      const m = LBX.modes[id], st2 = got[key] ? 'got' : wk.counted || kind === 'plank' ? 'ok' : 'wait';
      const why = st2 === 'got' ? 'получено · сундуки в запасах'
        : kind === 'plank' ? 'планка достигнута — подтверждено'
          : kind === 'place' ? (wk.counted ? `итог недели подсчитан · место ${fmt(place)}` : `ждёт подсчёта недели · сейчас место ${fmt(place)}`)
            : wk.counted ? 'доля клана назначена' : 'ждёт подсчёта недели и распределения в клане';
      p = { key, wk, cat, id, m, mode: m.n, box: m.box, label, kind, place, c, st: st2, why, basis: zpClean(m.basis), groups: [],
        period: `неделя ${wk.gen}${wk.id === 'now' ? ', текущая' : wk.id === 'prev' ? ', прошлая' : ''}` };
      idx.set(key, p); out.push(p);
    }
    p.groups.push(g);
  };
  const ranks = {}; for (const [n, pl, scope] of st.ranks || []) if (mid[n] && pl && scope !== 'клан') ranks[mid[n]] = pl;
  for (const wk of darWeeks(st)) {
    const T = lbGiftRows(ZP_DEMO.gifts.who, c);
    for (const cat of ['me', 'clan']) for (const x of T[cat]) if (isOpen(mid[x.mode])) put(wk, cat, mid[x.mode], x.label, x.g, x.done ? 'plank' : cat === 'clan' ? 'clan' : 'place');
    const places = wk.id === 'prev' ? ZP_DEMO.gifts.prevPlaces : ranks;
    for (const [id, pl] of Object.entries(places || {})) {
      if (!isOpen(id) || !pl) continue;
      const ly = LBX.modes[id].layers.find(l => l.kind === 'place' && !l.clan); if (!ly) continue;
      const row = ly.rows.filter(r => r.top && pl <= r.top).sort((a, b) => a.top - b.top)[0]; if (!row) continue;
      for (const g of row.cyc[c] || []) put(wk, 'me', id, lbRowLabel(ly, row), g, 'place', pl);
    }
  }
  return out;
}
/* строка выплаты: режим и планка или место, период, состав кристаллами и одно действие; основание и статус — в подсказке */
function darRow(p) {
  const top = Math.max(...p.groups.map(g => g.r));
  const act = p.st === 'ok' ? `<button class="btn sm go" data-a="darget" data-v="${trEsc(p.key)}">Получить</button>`
    : p.st === 'wait' ? '<span class="chip warn">ждёт</span>' : `<span class="chip">${ic('check')}получено</span>`;
  const place = p.kind === 'place' && p.place ? ` · ${p.st === 'wait' ? 'сейчас ' : ''}место ${fmt(p.place)}` : '';
  const cmp = p.groups.map(g => `<span class="dar-g" data-r="${g.r}" title="${trEsc(zpBoxName({ box: p.box, r: g.r, win: g.win }))} ×${g.count}">${ICON('r' + g.r, 16, RAR[g.r])}×${g.count}</span>`).join('');
  return `<div class="dar-row" title="${trEsc(`${p.basis} · ${p.why}`)}"><span class="well" data-r="${top}"><img src="${CHEST}" alt=""><span class="zp-k">${ic(LB_IC[p.box] || 'gem')}</span></span>
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
  const top = `<button class="gifts dar-sum" data-a="darbox" ${N ? '' : 'disabled'}><img src="${CHEST}" alt=""><span><b>${plural(N, 'Доступен', 'Доступно', 'Доступно')} ${darChests(N)}</b><small>${N ? `цикл ${ROMAN[S.acc.cycle]} · состав и шансы` : 'Всё подтверждённое уже в запасах'}</small></span>${N ? ic('chev') : ''}</button>`;
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
  const grid = list.map(x => `<button class="well dar-box ${x === sel ? 'sel' : ''}" data-r="${x.sp.r}" data-a="darpick" data-v="${trEsc(x.k)}" aria-pressed="${x === sel}" aria-label="${zpBoxName(x.sp)}, ${x.n} шт." title="${zpBoxName(x.sp)}"><img src="${CHEST}" alt=""><span class="zp-k">${ic(LB_IC[x.sp.box] || 'gem')}</span><span class="q">${x.n}</span></button>`).join('');
  const info = sel ? `${zpHead({ tile: zpTile(zpIcon({ kind: 'chest', cs: sel.sp }), sel.sp.r, { lg: true }), eb: cap1(zpChestWhen(sel.sp)), name: zpBoxName(sel.sp), cr: zpCr(sel.sp.r), q: '×' + fmt(sel.n), ql: 'к получению' })}${zpInfo(sel.sp, zpDef(sel.sp))}`
    : '<p class="faint">Доступных сундуков нет.</p>';
  return dialog(`${plural(N, 'Доступен', 'Доступно', 'Доступно')} ${darChests(N)}`, `<div class="dar-grid">${grid}</div>${info}`,
    `<span class="faint dar-fnote">Получить — в Дарах, открыть — в запасах</span><button class="btn" data-a="sheet" data-v="gifts">${ic('back')}К Дарам</button>`, 'wide');
};

/* ================== действия ================== */
Object.assign(ACT, {
  zptab(v) { zpV().tab = v; render(); },
  /* фильтр из листа: «ключ:значение»; повторное нажатие снимает, пустое значение — «Все» */
  zpf(v) {
    const V = zpV(), s = String(v), i = s.indexOf(':'), k = s.slice(0, i), x = s.slice(i + 1);
    if (!(k in ZP_FNAME)) return;
    V.f[k] = V.f[k] === x ? '' : x; render();
  },
  zpun() { const V = zpV(); V.f.un = !V.f.un; render(); },
  zpclr() { const V = zpV(); V.f = { cyc: '', spec: '', r: '', un: false }; V.q = ''; render(); },
  zpsel(v) {
    const V = zpV(), tab = V.tab, e = zpEntries(tab).find(x => x.key === v);
    V.sel[tab] = v; V.pick = e && zpIsNew(e) ? v : '';
    if (e) zpSeen(e);
    if (tab === 'chest') { V.n = 1; if (V.last && V.last.key !== v) V.last = null; }   // итог другого сундука не висит в чужой карточке
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
    if (typeof f !== 'function' || !BAG.has(v)) { toast('Активация пока недоступна'); return; }
    f(v); render();
  },
  zpto(v) { S.overlay = null; S.seg.craft = 'stock'; zpV().tab = v || 'chest'; go('craft'); },
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
/* сценарии презентации */
FLOWS.push(
  ['Запасы · сундуки', 'Карточка сундука §14.4: тип, редкость, количество и «Открыть»; состав и шансы — по нажатию, итог — крупно в той же карточке', () => { S.route = 'craft'; S.seg.craft = 'stock'; zpV().tab = 'chest'; S.overlay = null; }],
  ['Дары путешествия', 'Две категории: подтверждённое и ждущее подсчёта, одно действие на строку; попап сундуков', () => { S.route = 'week'; S.overlay = { t: 'gifts', arg: 'me' }; }],
);

/* ================== состояние ==================
   S.zp — вкладка, фильтры, выбор, «новое», выбор количества и итог открытия, открытые сундуки, список «из сундуков» и Дары.
   Осколки героев демо кладутся в S.rs.shards, если там пусто: их видит и «Призыв → За души». */
function zpState(s) {
  const F = ZP_DEMO.fresh, seen = {};
  for (const id of Object.keys(s.bag.items)) if (!F.items.includes(id)) seen['i:' + id] = 1;
  s.bag.chests.forEach((c, i) => { if (!F.chests.includes(i + 1)) seen['c:' + c.id] = 1; });
  if (!Object.keys(s.rs.shards).length) for (const [id, n] of Object.entries(ZP_DEMO.shards)) if (RSI[id]) s.rs.shards[id] = n;
  for (const id of Object.keys(s.rs.shards)) if (!F.heroes.includes(id)) seen['h:' + id] = 1;
  s.zp = { tab: 'res', f: { cyc: '', spec: '', r: '', un: false }, q: '', sel: {}, seen, pick: '', n: 1, last: null, opened: {}, ops: {}, op: 1, extra: {}, gifts: { tab: 'me', cat: 'me', got: {}, seq: 0, box: '' } };
  for (const p of darRows(s)) if (p.wk.id === 'prev' && p.kind === 'plank') s.zp.gifts.got[p.key] = ++s.zp.gifts.seq;   // прошлая неделя: личные планки уже получены
  return s;
}
const zpInitBase = initialState;
initialState = function () { return zpState(zpInitBase()); };
zpState(S);
