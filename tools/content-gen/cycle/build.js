/* Новый цикл — новая ступень аккаунта (ADR-0041): сборка данных окна «Событие нового цикла» (§2.9) и правил перехода.
   Черновик · предложение · ждёт автора. Слово автора — в data.js.

   Что делает:
   1. Читает данные игры прототипа design/ui/*.js и собирает для каждого перехода I → II … V → VI, что меняется: рейтинг цикла, герои
      (кривая силы ядра, за золото, рулетка, Эхо, донатный сет, рецепты), Спуск и ремесло (биомы, стражи, ключи, забеги разом, рецепты,
      места, рынок), Неделя (Эхо, контракты, Событие, Арена и Лига, ритуалы, сундуки, снаряжение, талисманы), Странник (Память,
      артефакты, Летопись, достижение, первенства, опыт, прах), Лавка («Дар пути»). Чисел в этом файле нет: каждое — из данных игры.
   2. Берёт подъём по циклам у калькулятора climb.py (climb.json): длина цикла, стена прихода, путь — для команды.
   3. Законы (ошибка — файлы не пишутся): у каждого перехода есть пункт в каждом блоке разметки; есть рейтинг цикла и место Памяти;
      кривая ядра (RULES.cycleX10) — та же, что у калькуляторов (economy.py, POWER_X10) и снаряжения (cycMul); герои и враги цикла
      сильнее прошлого: база кривой, уровни врагов Эхо по ступеням и цены атак растут; опыт перехода — из сценария старта (§16);
      тексты игрока — без служебных слов и без имён цикла VI (ADR-0038); числа — целые; climb.json свежий и в коридорах.
   4. Пишет design/ui/cycle.js — window.EN_CYCLE и алгоритм rules.js как есть — и таблицы docs/content/переход-цикла.md между метками.

   Запуск: node tools/content-gen/cycle/build.js          — собрать;
           node tools/content-gen/cycle/build.js --check  — только законы и свежесть файлов;
           node tools/content-gen/cycle/build.js --print  — напечатать таблицы. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');
const FILES = {
  data: path.join(__dirname, 'data.js'),
  rules: path.join(__dirname, 'rules.js'),
  climb: path.join(__dirname, 'climb.json'),
  out: path.join(UI, 'cycle.js'),
  doc: path.join(ROOT, 'docs', 'content', 'переход-цикла.md'),
  economy: path.join(ROOT, 'tools', 'content-gen', 'economy', 'economy.py'),
};
const D = require(FILES.data);
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
/* служебные слова в текстах игрока — как в проверке check_player_view.js */
const SERVICE = /ADR|§|GDD|демо(?!н)|заглушк|черновик|прототип|для команды|баланс|толковани|допущени|калькулятор/i;

/* ================================ ДАННЫЕ ИГРЫ ================================ */
function load() {
  const ctx = { console: { log() {}, warn() {}, error() {} } }; ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['battle', 'recipes', 'roster', 'echo-rules', 'wanderer', 'contracts', 'event', 'arena', 'rituals', 'lootboxes', 'talismans',
    'equipment', 'store', 'chronicle', 'start', 'pass']) vm.runInContext(fs.readFileSync(path.join(UI, f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  return {
    EB: ctx.EnBattle, R: ctx.EN_RECIPES, RO: ctx.EN_ROSTER, ER: ctx.EN_ECHO_RULES, W: ctx.EN_WANDERER, CT: ctx.EN_CONTRACTS, EV: ctx.EN_EVENT,
    AR: ctx.EN_ARENA, RI: ctx.EN_RITUALS, LB: ctx.EN_LOOTBOXES, TL: ctx.EN_TALISMANS, EQ: ctx.EN_EQUIPMENT, ST: ctx.EN_STORE, CH: ctx.EN_CHRONICLE,
    SS: ctx.EN_START, PS: ctx.EN_PASS,
  };
}

/* ================================ СБОРКА ================================ */
const fmt = n => Number(n).toLocaleString('ru-RU').replace(/ /g, ' ');
/* множитель ×10 → «×1,6»; ×100 → «×2,6» */
const x10 = v => `×${Math.floor(v / 10)}${v % 10 ? ',' + (v % 10) : ''}`;
const x100 = v => { const t = Math.floor(v / 10); return x10(t); };
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
const ORD = ['', 'первый', 'второй', 'третий', 'четвёртый', 'пятый', 'шестой', 'седьмой'];

function stepOf(G, c, climb) {
  const { EB, R, RO, ER, W, CT, EV, AR, RI, LB, EQ, ST, CH, SS, PS } = G;
  const rc = ROMAN[c], rp = ROMAN[c - 1], cyc = R.cycles[c - 1], team = !!cyc.team;
  /* первый рейтинг — цикл II (RULES.first): прошлый цикл — обучение, рейтинга и недели в нём нет — сравнивать не с чем */
  const first = c === D.RULES.first;
  const curve = EB.RULES.cycleX10;
  const it = [];
  const add = (sec, k, n, d, extra) => it.push(Object.assign({ sec, k, n, d: d || '' }, extra || {}));

  /* --- рейтинг --- */
  const p1 = ER.plank1[String(c)], ev1 = EV.planks[String(c)][0], ct1 = CT.planks[String(c)][0];
  add('rating', 'rating', `Рейтинг цикла ${rc}`, `Эхо, Событие, контракты, Арена и Лига — среди игроков цикла ${rc}. ${first ? `Первый рейтинг: цикл ${rp} — обучение, без рейтинга.` : `Итог цикла ${rp} — в профиле.`}`, { go: { route: 'week' }, main: true });
  add('rating', 'planks', first ? 'Планки недели' : 'Планки недели выше', `первая: Эхо — ${fmt(p1)} очков, Событие — ${fmt(ev1)}, контракты — ${fmt(ct1)}`, { go: { route: 'week' } });
  const firsts = W.ach.firsts.filter(f => f.c === c);
  add('rating', 'firsts', `Первенства сервера цикла ${rc}: ${firsts.length}`, 'кто первым на сервере возьмёт рубежи нового цикла', { go: { route: 'profile', profile: 'ach' } });

  /* --- герои --- */
  const hs = RO.heroes.filter(h => h.c === c), by = s => hs.filter(h => h.src === s), mv = s => RO.rules.maxV[s] && RO.rules.maxV[s][c - 1];
  add('heroes', 'curve', `Герои цикла ${rc}: база ${x10(curve[c - 1])}`, `на том же уровне сильнее героев цикла ${rp} (${x10(curve[c - 2])}); враги цикла — тоже`, { main: true, num: curve[c - 1] });
  const gold1 = RO.rules.gold.first * c;
  add('heroes', 'gold', `За золото — ${by('gold').length} ${plural(by('gold').length, 'герой', 'героя', 'героев')}`, `первый — ${fmt(gold1)} золота, каждый следующий дороже на ${RO.rules.gold.stepBp / 100} %`,
    { go: { route: 'heroes', heroes: 'hire', hire: 'gold', gcyc: c } });
  if (by('roulette').length) add('heroes', 'roulette', `Возрождение душ — ${by('roulette').length} ${plural(by('roulette').length, 'новый герой', 'новых героя', 'новых героев')}`, `доблесть до ${mv('roulette')}`, { go: { route: 'heroes', heroes: 'hire', hire: 'souls' } });
  if (by('echo').length) add('heroes', 'echo', `Герои Эхо цикла ${rc}`, `по одному на расу недели — в сундуках Эхо; доблесть до ${mv('echo')}`, { go: { route: 'echo' } });
  const ds = RO.sets.find(s => s.kind === 'donat' && s.cycle === c);
  if (ds) add('heroes', 'donat', `Донатный сет «${ds.name}»`, `пятеро Безликих за Энериум; доблесть до ${mv('donat')}`, { go: { route: 'heroes', heroes: 'hire', hire: 'donat' }, team });
  if (by('craft').length) add('heroes', 'craftHeroes', `Герои из рецептов — ${by('craft').length}`, 'скрытые рецепты цикла', { team });

  /* --- спуск и ремесло --- */
  const gd = R.drops.guardians.filter(g => g.cyc === c), slots = R.drops.activeSlots.byCycle[c - 1];
  if (team) add('descent', 'biomes', D.TEXT.descentTeam, `вход к стражам — ${gd.map(g => g.entryKeys).join(' и ')} рунных ключей`, { go: { route: 'descent', biome: 'front' }, main: true });
  else add('descent', 'biomes', cyc.biomes.map(b => b.n).join(' · '), `стражи ${gd.map(g => g.name).join(' и ')}; вход — ${gd.map(g => g.entryKeys).join(' и ')} рунных ключей`, { go: { route: 'descent', biome: 'front' }, main: true });
  add('descent', 'slots', `Забегов разом — ${slots}`, `${ORD[slots]} отряд идёт вниз одновременно с остальными`, { num: slots });
  const st = R.stats.byCycle[c - 1], pl = R.places.filter(p => p.cyc === c), ruins = pl.filter(p => p.kind === 'ruin').length, city = pl.find(p => p.kind === 'city');
  add('descent', 'recipes', `Рецепты цикла — ${st.recipes}`, team ? `предметов — ${st.items}` : `${ruins} ${plural(ruins, 'руина', 'руины', 'руин')} и город «${city.n}»; предметов — ${st.items}`, { go: { route: 'craft', craft: 'work' }, team });
  add('descent', 'market', `Рынок и Лавка: цены ${x10(c * 10)}`, `базовый ресурс — от ${R.drops.market.basic[c - 1]} золота; в Лавке — ресурсы новых биомов`, { go: { route: 'craft', craft: 'shop' } });

  /* --- неделя --- */
  const rs = ER.roundSouls[c - 1], rnd = ER.types, pts1 = ER.cycles[String(c)][0].points, pts0 = ER.cycles[String(c - 1)] ? ER.cycles[String(c - 1)][0].points : 0;
  add('week', 'echo', `Эхо: атака — от ${fmt(rnd.o.rounds * rs)} до ${fmt(rnd.m.rounds * rs)} душ`, pts0 ? `враги сильнее, очки выше: первая ступень — ${fmt(pts1)} вместо ${fmt(pts0)}` : `души — в очки недели: первая ступень — ${fmt(pts1)} очков`, { go: { route: 'echo' }, main: true });
  const nk = Object.entries(CT.kinds).filter(([, v]) => v.from === c).map(([, v]) => v.n);
  if (first) add('week', 'contracts', 'Контракты', `${nk.length} ${plural(nk.length, 'вид', 'вида', 'видов')} заданий на день и неделю; первая планка — ${fmt(ct1)} очков`, { go: { route: 'contracts' } });
  else if (nk.length) add('week', 'contracts', `Новый вид контракта: «${nk.join('», «')}»`, `задания и награды контрактов выше; первая планка — ${fmt(ct1)} очков`, { go: { route: 'contracts' } });
  else add('week', 'contracts', `Контракты цикла ${rc}`, `объём и награды заданий выше; первая планка — ${fmt(ct1)} очков`, { go: { route: 'contracts' } });
  const arC = AR.pool.arena.filter(o => o.c === c).length;
  add('week', 'arena', 'Арена и Лига', `соперники — игроки цикла ${rc}; рейтинг — с ${fmt(AR.elo.start)}`, { go: { route: 'arena' }, demoRivals: arC });
  const cur = RI.tabs.hero.cur, curH = RI.tabs.hero.curH;
  add('week', 'rituals', first ? 'Ритуалы героев' : `Ритуалы героев: награды ${x10(c * 10)}`, `за ${curH} ч — ${cur.map(([k, v]) => `${fmt(v * c)} ${{ gold: 'золота', spirit: 'духа', souls: 'душ' }[k]}`).join(', ')}`, { go: { route: 'rituals' } });
  const chestR = LB.modes.echo.layers[0].rows[0].cyc[String(c)][0].r, rowP = LB.modes.echo.layers[0].rows[0].cyc[String(c - 1)], chestR0 = rowP ? rowP[0].r : chestR;
  if (rowP) add('week', 'chests', 'Сундуки недели — редкость выше', `первая планка Эхо — сундук редкости «${LB.rarity[chestR - 1]}», был «${LB.rarity[chestR0 - 1]}»`);
  else add('week', 'chests', 'Сундуки недели', `за планки и места: первая планка Эхо — сундук редкости «${LB.rarity[chestR - 1]}»`);
  add('week', 'equipment', `Снаряжение цикла: ${x100(EQ.rules.cycMul[c - 1])}`, `основные строки вещей цикла ${rc}; вещи цикла ${rp} — ${x100(EQ.rules.cycMul[c - 2])}`, { go: { route: 'heroes', heroes: 'coll', hero: 'gear' } });
  const talFrom = Math.min(...Object.entries(LB.summon.ev.ruin).filter(([, v]) => v.tal).map(([k]) => +k));   // сундук призыва: талисманы — с цикла силы
  if (c === talFrom) add('week', 'talismans', 'Талисманы в сундуках призыва', `призванные враги цикла силы ${rc} и выше`);

  /* --- Странник --- */
  add('wanderer', 'memory', `Место Памяти цикла ${rc}`, 'одна пассивка аккаунта из трёх; выбор ждёт, пока не вспомнишь', { go: { route: 'profile', profile: 'mem' }, main: true });
  const newArt = W.art.list.filter(a => a.from === c), lvArt = W.art.list.filter(a => a.from < c && a.lv >= c - a.from + 1).length;
  add('wanderer', 'artifacts', 'Артефакты: уровень выше', `ещё один уровень у ${lvArt} ${plural(lvArt, 'артефакта', 'артефактов', 'артефактов')}` + (newArt.length ? `; новые — ${newArt.map(a => `«${a.n}»`).join(', ')}` : ''), { go: { route: 'profile', profile: 'arts' } });
  const chap = CH.chapters.filter(x => x.open && x.open.c === c).map(x => x.n);
  if (chap.length) add('wanderer', 'chronicle', `Летопись: ${chap.join(', ')}`, `${chap.length} ${plural(chap.length, 'новая глава', 'новые главы', 'новых глав')} — мир и боги, что ждут ниже`, { go: { route: 'profile', profile: 'chron' } });
  add('wanderer', 'chapter', 'Глава Странника', 'страница памяти Странника — текст и ролик автора (§2.9, §38.4: раскрытие не придумываем)', { team: true });
  const xp = SS.xp.cycle * (c - 1);
  add('wanderer', 'xp', `+${fmt(xp)} опыта Странника`, `переход в цикл — ${fmt(SS.xp.cycle)} × номер прошлого цикла`, { num: xp });
  const feat = W.ach.list.find(a => a.m === 'cycle' && a.goal === c);
  if (feat) add('wanderer', 'feat', `Достижение «${feat.n}»`, 'пассивка аккаунта и сундук странника', { go: { route: 'profile', profile: 'ach' } });
  const d1 = RO.rules.dust[0][0];
  add('wanderer', 'dust', `Прах героев цикла: ${x10(c * 10)}`, `осколок героя цикла ${rc} — от ${d1 * c} праха`);

  /* --- Лавка --- */
  const of = ST.offers.list.find(o => o.of === 'path' && o.cycle === c), K = ST.offers.kinds.path, tier = of && ST.tiers[of.tier];
  if (of) add('store', 'offer', `${K.n} · ${Math.floor(K.life / 3600)} ч`, `${fmt(of.get[0][1])} Энериума за ${fmt(tier.rub)} ₽ — один раз за цикл`, { go: { route: 'store', store: 'start' }, main: true });
  const chB = PS.chestBase[c - 1];
  add('store', 'pass', 'Пропуск и Дар дня', `сундуки странника — от редкости «${LB.rarity[chB]}»`, { go: { route: 'store', store: 'pass' } });

  /* «сразу» — что сервер выдаёт операцией перехода */
  const got = [{ k: 'xp', n: `+${fmt(xp)} опыта` }, { k: 'memory', n: `место Памяти ${rc}` }, { k: 'slots', n: `забегов разом — ${slots}` }];
  if (of) got.push({ k: 'offer', n: `${K.n} · ${Math.floor(K.life / 3600)} ч` });

  /* подъём по циклам — калькулятор climb.py, только команде */
  const reg = climb.profiles[0], fan = climb.profiles[1], pay = climb.profiles[2], pk = reg.picks[String(c)] || {}, wl = reg.walls[String(c)] || {};
  const team2 = {
    days: { o: reg.len[String(c)], e: fan.len[String(c)], p: pay.len[String(c)] },
    corridor: climb.corridor[String(c)], kX: climb.kX[String(c)], need: climb.need[String(c)] ? climb.need[String(c)].w : null,
    came: pk.from || null, way: pk.way || null, wayK: pk.k || null, wall: wl.wall || null, wallBoss: wl.boss || null,
  };
  const say = D.SAY[c];
  return {
    c, from: c - 1, roman: rc, team, god: team ? null : cyc.god, el: cyc.el, karst: cyc.karst,
    title: team ? `Цикл ${rc}` : `Цикл ${rc} · ${cyc.god}`,
    lead: team ? 'Последний цикл спуска.' : (cyc.about.split('. ')[0] + '.'),
    say, got, open: it, offer: of ? { id: of.id, n: K.n, life: K.life, enerium: of.get[0][1], rub: tier.rub, usd: tier.usd } : null,
    climb: climb.kX[String(c)] ? team2 : null,   // подъём калькулятор climb.py считает с цикла III; цикл II — модель экономики (economy.py)
  };
}

function build() {
  const G = load(), err = [];
  if (!G.EB.RULES.cycleX10) err.push('ядро: нет RULES.cycleX10 — кривой силы героя (ADR-0041)');
  const climb = JSON.parse(fs.readFileSync(FILES.climb, 'utf8'));
  const steps = {};
  for (let c = D.RULES.from; c <= D.RULES.last; c++) steps[c] = stepOf(G, c, climb);
  const data = {
    meta: { builder: 'tools/content-gen/cycle/build.js', rules: 'tools/content-gen/cycle/rules.js', climb: 'tools/content-gen/cycle/climb.py',
      sources: ['GDD §1', 'GDD §2.9', 'GDD §3.3', 'GDD §16', 'GDD §17.6', 'GDD §20.5', 'ADR-0041'], doc: 'docs/content/переход-цикла.md' },
    rules: Object.assign({}, D.RULES, { xp: G.SS.xp.cycle, arenaStart: G.AR.elo.start }),
    curve: G.EB.RULES.cycleX10.slice(),
    sections: D.SECTIONS, text: Object.assign({}, D.TEXT, { again: null }),
    steps,
  };
  laws(G, data, climb, err);
  return { data, err, climb };
}

/* ================================ ЗАКОНЫ ================================ */
function laws(G, data, climb, err) {
  const curve = data.curve;
  /* кривая одна: ядро = калькуляторы = снаряжение */
  const econ = fs.readFileSync(FILES.economy, 'utf8').match(/^POWER_X10 = \[([^\]]+)\]/m);
  const pe = econ ? econ[1].split(',').map(s => +s.trim()) : null;
  if (!pe || pe.join() !== curve.join()) err.push(`кривая силы: ядро ${curve.join('/')} ≠ economy.py POWER_X10 ${pe && pe.join('/')}`);
  const eq = G.EQ.rules.cycMul.map(v => v / 10);
  if (eq.join() !== curve.join()) err.push(`кривая силы: ядро ${curve.join('/')} ≠ снаряжение cycMul ${G.EQ.rules.cycMul.join('/')}`);
  for (let c = 2; c < curve.length; c++) if (!(curve[c] > curve[c - 1])) err.push(`кривая силы: цикл ${ROMAN[c + 1]} не сильнее цикла ${ROMAN[c]}`);
  /* враги Эхо цикла N+1 сильнее: уровень каждой ступени выше, атака дороже, очки выше */
  for (let c = 3; c <= 6; c++) {
    const a = G.ER.cycles[String(c - 1)], b = G.ER.cycles[String(c)];
    b.forEach((x, i) => { if (!(x.foeLvl > a[i].foeLvl)) err.push(`Эхо: ступень ${x.step} цикла ${ROMAN[c]} не сильнее цикла ${ROMAN[c - 1]}`); if (!(x.points > a[i].points)) err.push(`Эхо: очки ступени ${x.step} цикла ${ROMAN[c]} не выше`); });
    if (!(G.ER.roundSouls[c - 1] > G.ER.roundSouls[c - 2])) err.push(`Эхо: цена раунда цикла ${ROMAN[c]} не выше`);
  }
  for (const [c, s] of Object.entries(data.steps)) {
    const where = `переход в цикл ${s.roman}`;
    for (const sec of data.sections) if (!s.open.some(x => x.sec === sec.k && !x.team)) err.push(`${where}: в блоке «${sec.n}» нет пункта для игрока`);
    if (!s.open.some(x => x.k === 'rating' && /Рейтинг цикла/.test(x.n))) err.push(`${where}: нет рейтинга цикла`);
    if (!s.open.some(x => x.k === 'memory')) err.push(`${where}: нет места Памяти`);
    for (const x of s.open) {
      if (!data.sections.some(q => q.k === x.sec)) err.push(`${where}: пункт ${x.k} — блока ${x.sec} нет в разметке`);
      if (!x.team) for (const t of [x.n, x.d]) if (SERVICE.test(t)) err.push(`${where}: служебное слово игроку — «${t}»`);
      if (/undefined|NaN|\[object/.test(x.n + x.d)) err.push(`${where}: битый текст — «${x.n} · ${x.d}»`);
    }
    for (const t of [s.title, s.lead, s.say && s.say[1]]) if (t && SERVICE.test(t)) err.push(`${where}: служебное слово игроку — «${t}»`);
    /* цикл VI — только для команды (ADR-0038): имён бога и биомов в текстах игрока нет */
    if (s.team) {
      const secret = [].concat(G.R.cycles[+c - 1].god, G.R.cycles[+c - 1].biomes.flatMap(b => [b.n, b.boss, b.guard])).filter(Boolean);
      const shown = [s.title, s.lead, s.say && s.say[1]].concat(s.open.filter(x => !x.team).flatMap(x => [x.n, x.d])).join(' | ');
      for (const w of secret) if (shown.includes(w)) err.push(`${where}: игроку видно «${w}» — цикл VI только для команды`);
    }
    if (!s.say || !s.say[1]) err.push(`${where}: нет слова проводника`);
    for (const x of s.open) if (x.num != null && !Number.isInteger(x.num)) err.push(`${where}: не целое число у ${x.k}`);
  }
  /* опыт перехода — §16 из сценария старта */
  if (data.rules.xp !== G.SS.xp.cycle) err.push('опыт перехода не из EN_START.xp.cycle');
  /* подъём: коридоры калькулятора держатся */
  for (const v of climb.verdict) if (!v.ok) err.push(`подъём по циклам: ${v.what} — ${v.got}, цель ${v.goal}`);
}

/* ================================ ВЫВОД ================================ */
function render(data) {
  const head = `/* Новый цикл — новая ступень аккаунта (ADR-0041): окно «Событие нового цикла» (§2.9) и правила перехода — данные прототипа «Свет снизу».
   Собирает tools/content-gen/cycle/build.js из данных игры (design/ui/*.js) и калькулятора подъёма climb.py — руками не править:
   пересборка затрёт правку. Черновик · предложение · ждёт автора. Числа — демонстрация, только целые.
   window.EN_CYCLE: rules — правила перехода (первый рейтинг — цикл II, переход — рунный страж второго биома, опыт × номер старого
   цикла, старт рейтинга Арены), curve — кривая силы ядра, sections — блоки окна (общие с окном I → II), steps[цикл] — переход в цикл:
   title, lead, say — слово проводника, got — что сервер выдаёт сразу, open — что открылось (sec — блок, n, d, go — куда ведёт,
   team — только для команды), offer — «Дар пути», climb — подъём для команды (дни, путь, стена, ручка силы).
   Переход выдаёт сервер одной операцией с номером: повтор ничего не выдаёт (§36.16). Ниже данных — алгоритм
   tools/content-gen/cycle/rules.js как есть. */
`;
  return head + 'window.EN_CYCLE = ' + JSON.stringify(data) + ';\n' + fs.readFileSync(FILES.rules, 'utf8');
}

function tables(data, climb) {
  const T = (h, rows) => ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|'].concat(rows.map(r => '| ' + r.join(' | ') + ' |')).join('\n');
  const out = {};
  const sec = Object.fromEntries(data.sections.map(s => [s.k, s.n]));
  out.steps = Object.values(data.steps).map(s => `**${s.title}** — ${s.lead}\n\n` + T(['Блок', 'Что', 'Подробно', 'Видит'],
    s.open.map(x => [sec[x.sec], x.n, x.d, x.team ? 'команда' : 'игрок']))).join('\n\n');
  out.got = T(['Переход', 'Сразу — операцией сервера'], Object.values(data.steps).map(s => [`${ROMAN[s.from]} → ${s.roman}`, s.got.map(g => g.n).join('; ')]));
  out.climb = climb.md;
  return out;
}

function writeDoc(t) {
  let s = fs.readFileSync(FILES.doc, 'utf8');
  for (const [k, v] of Object.entries(t)) {
    const re = new RegExp(`(<!-- @таблица ${k} [^\\n]*-->\\n)[\\s\\S]*?(\\n<!-- @конец ${k} -->)`);
    if (!re.test(s)) throw new Error(`переход-цикла.md: нет меток таблицы ${k}`);
    s = s.replace(re, (m, a, b) => a + '\n' + v + '\n' + b);
  }
  return s;
}

function main() {
  const check = process.argv.includes('--check'), print = process.argv.includes('--print');
  const { data, err, climb } = build();
  const t = tables(data, climb);
  if (print) { console.log(Object.values(t).join('\n\n')); }
  if (err.length) { console.log('ОШИБКИ:\n' + err.map(e => '  ' + e).join('\n')); process.exit(1); }
  const js = render(data);
  const doc = writeDoc(t);
  if (check) {
    const stale = [];
    if (!fs.existsSync(FILES.out) || fs.readFileSync(FILES.out, 'utf8') !== js) stale.push('design/ui/cycle.js');
    if (fs.readFileSync(FILES.doc, 'utf8') !== doc) stale.push('docs/content/переход-цикла.md');
    if (stale.length) { console.log(`Устарели: ${stale.join(', ')} — пересобрать: node tools/content-gen/cycle/build.js`); process.exit(1); }
    console.log(`Свежие: cycle.js и таблицы переход-цикла.md; переходов ${Object.keys(data.steps).length}, законы держатся.`);
    return;
  }
  fs.writeFileSync(FILES.out, js);
  fs.writeFileSync(FILES.doc, doc);
  console.log(`Собрано: design/ui/cycle.js — переходов ${Object.keys(data.steps).length}, пунктов ${Object.values(data.steps).reduce((a, s) => a + s.open.length, 0)}; таблицы — docs/content/переход-цикла.md.`);
}

if (require.main === module) main();
module.exports = { build, load };
