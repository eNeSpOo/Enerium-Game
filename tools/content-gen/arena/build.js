/* Арена и Лига — сборщик: GDD §20, §1.2, §5, §6, §23, §36; ADR-0005, ADR-0010, ADR-0014, ADR-0026, ADR-0028.
   Черновик · предложение · ждёт автора. Все числа — демонстрация.

   Что делает:
   1. Правила — rules.js (Эло целочисленной таблицей, K, асимметрия защиты, сброс, подбор, попытки, обновления, раунды, дивизионы,
      Энериум топ-100).
   2. Прогон — model.json (node model.js): таблица «рейтинг → место» сервера, лидеры, победы за неделю по профилям, выгода равной
      атаки, ×1,7. Сверяет: пороги планок дают ту же планку обычному и увлечённому, что typical лутбоксов (EN_LOOTBOXES.modes);
      выгода равной атаки — около нуля; плательщик против увлечённого при той же силе — не больше ×1,7 по победам и Энериуму;
      обновления за Энериум не окупаются Энериумом топа.
   3. Демо-сервер: соперники Арены (пять героев) и Лиги (три отряда по пять) из героев состава с наборами способностей — циклы
      по данным, уровни — по рейтингу соперника, доблесть — до личного максимума. Имена — из двух списков, без повторов.
      Сид — «арена-демо»: пересборка даёт те же байты.

   Пишет:
   - design/ui/arena.js — данные (window.EN_ARENA) и алгоритм (window.EnArena из elo.js), руками не править;
   - docs/content/арена-и-лига.md — только таблицы между метками «<!-- @таблица имя -->» и «<!-- /таблица имя -->»; текст — ручной.
   Читает: rules.js, model.json, elo.js, design/ui/lootboxes.js (typical, from, планки), design/ui/roster.js, kits.js, echo-foes.js.
   Любая ошибка — файлы не пишутся.
   Запуск: node tools/content-gen/arena/build.js           — собрать и записать;
           node tools/content-gen/arena/build.js --check   — только проверить, что файлы свежие.
   Из других скриптов: require('./build.js').build() — { data, tables, err, warn } без записи. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = require('./elo.js');
const { RULES } = require('./rules.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  model: path.join(__dirname, 'model.json'),
  elo: path.join(__dirname, 'elo.js'),
  loot: path.join(ROOT, 'design', 'ui', 'lootboxes.js'),
  roster: path.join(ROOT, 'design', 'ui', 'roster.js'),
  kits: path.join(ROOT, 'design', 'ui', 'kits.js'),
  echo: path.join(ROOT, 'design', 'ui', 'echo-foes.js'),
  out: path.join(ROOT, 'design', 'ui', 'arena.js'),
  doc: path.join(ROOT, 'docs', 'content', 'арена-и-лига.md'),
};

/* ================================ ДАННЫЕ ДЕМО-СЕРВЕРА ================================ */
const DEMO = {
  seed: 'арена-демо',
  /* соперники Арены: сколько по циклам, разброс рейтинга; уровень героя — base на рейтинге at, ± perPts рейтинга за уровень
     (прогон ядра: около 30 очков Эло за уровень на 60-м), разброс героя ± spread. Предел — по уровню: до 50 — 0, до 150 — 1 */
  arena: { cyc: [[2, 84], [3, 12]], r: [940, 1680], at: 1315, base: 58, perPts: 30, spread: 7, valorMax: 2, games: [30, 430] },
  league: { cyc: [[2, 30]], r: [880, 1440], at: 1000, base: 52, perPts: 30, spread: 7, valorMax: 2, games: [20, 180] },   // games — боёв у соперника: от и до, для K
  capByLim: [50, 150, 350],   // потолок уровня по пределу (§10.1) — как INV.hero.capByLim прототипа
  names: {
    adj: ['Тихий', 'Северный', 'Лунный', 'Светлый', 'Синий', 'Серый', 'Ночной', 'Пепельный', 'Каменный', 'Янтарный', 'Дальний', 'Старый',
      'Быстрый', 'Глухой', 'Белый', 'Южный', 'Ясный', 'Звёздный', 'Холодный', 'Медный', 'Поздний', 'Верный', 'Упрямый', 'Долгий'],
    noun: ['ветер', 'странник', 'страж', 'пепел', 'шаг', 'огонь', 'ворон', 'караван', 'дозор', 'путник', 'ключ', 'песок', 'клинок', 'туман',
      'берег', 'камень', 'колокол', 'знак', 'мост', 'след', 'рассвет', 'перевал', 'родник', 'маяк', 'щит'],
  },
  me: 'Странник',
  leagueTop: 120,             // лидеры Лиги — ниже лидеров Арены на столько рейтинга: допущение до прогона рейтинга Лиги
};
const RARITY = ['', 'обычная', 'редкая', 'уникальная', 'эпическая', 'древняя', 'первородная', 'вневременная'];

/* ================================ СБОРКА ================================ */
const loadJs = (files, names) => { const ctx = { console }; ctx.window = ctx; vm.createContext(ctx); for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }); return names.map(n => ctx[n]); };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pctBp = bp => { const t = Math.floor((bp + 5) / 10), f = t % 10; return ((t - f) / 10) + (f ? ',' + f : '') + ' %'; };
const sec1 = ms => { const t = Math.floor((ms + 50) / 100); return `${Math.floor(t / 10)},${t % 10} с`; };
const plural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; };
const wins = n => `${n} ${plural(n, 'победа', 'победы', 'побед')}`;
const sgn = n => n > 0 ? '+' + fmt(n) : n < 0 ? '−' + fmt(-n) : '0';
const hund = v => { const s = v < 0 ? '−' : '', x = Math.abs(v), f = x % 100; return s + fmt(Math.floor(x / 100)) + (f ? ',' + String(f).padStart(2, '0').replace(/0$/, '') : ''); };

function build() {
  const err = [], warn = [];
  const D = RULES();
  if (!fs.existsSync(FILES.model)) return { err: ['нет model.json — сначала node tools/content-gen/arena/model.js'], warn };
  const MOD = JSON.parse(fs.readFileSync(FILES.model, 'utf8'));
  const [LBX] = loadJs([FILES.loot], ['EN_LOOTBOXES']);
  const [RS, KITS, XF] = loadJs([FILES.roster, FILES.kits, FILES.echo], ['EN_ROSTER', 'EN_KITS', 'EN_ECHO_FOES']);
  if (!LBX || !RS || !KITS) return { err: ['нет lootboxes.js, roster.js или kits.js'], warn };

  /* ---------- правила: таблица Эло ---------- */
  const T = D.elo.table;
  if (T[0] !== 5000 || T.some((v, i) => i && v > T[i - 1])) err.push('таблица Эло: не 50 % в нуле или растёт с разницей');
  if (T[D.elo.scale] !== 909) err.push(`таблица Эло: при разнице ${D.elo.scale} ждали 909 б. п., а там ${T[D.elo.scale]}`);
  for (const m of ['arena', 'league']) {
    const L = LBX.modes[m]; if (!L) { err.push(`EN_LOOTBOXES: нет режима ${m}`); continue; }
    if (L.from !== D[m].from) err.push(`${m}: рейтинг с цикла ${D[m].from}, а сундуки — с цикла ${L.from}`);
  }

  /* ---------- прогон: сдвиг, планки, ×1,7 ---------- */
  const S = MOD.server.find(x => x.shift === D.elo.def.shift);
  if (!S) err.push(`model.json: нет прогона со сдвигом защиты ${D.elo.def.shift} — пересчитать model.js`);
  else {
    if (Math.abs(S.eqGain) > 50) err.push(`выгода равной атаки ${hund(S.eqGain)} рейтинга — закон §20.5 требует около нуля`);
    const need = (m, k) => { const ly = LBX.modes[m].layers.find(l => l.kind === 'plank' && !l.clan); return ly.rows.map(r => D[m].plank * r.x); };
    const planks = (needs, v) => needs.filter(x => v >= x).length;
    const ar = need('arena'), typ = LBX.modes.arena.typical;
    const gotA = { free: planks(ar, S.prof.free.winMed), fan: planks(ar, S.prof.fan.winMed) };
    for (const k of ['free', 'fan']) if (gotA[k] !== typ[k].me) err.push(`Арена: ${k} берёт ${gotA[k]}-ю планку (${S.prof[k].winMed} побед за неделю), а typical лутбоксов — ${typ[k].me}-ю`);
    const lg = need('league'), typL = LBX.modes.league.typical;
    const gotL = { free: planks(lg, MOD.league.prof.free.wins), fan: planks(lg, MOD.league.prof.fan.wins) };
    for (const k of ['free', 'fan']) if (gotL[k] !== typL[k].me) err.push(`Лига: ${k} берёт ${gotL[k]}-ю планку (${MOD.league.prof[k].wins} побед), а typical лутбоксов — ${typL[k].me}-ю`);
    for (const b of S.bands) {
      if (b.payer.wins * 10 > b.fan.wins * 17) err.push(`×1,7: победы плательщика ${hund(b.payer.wins)} против ${hund(b.fan.wins)} при силе ${b.lo}–${b.hi}`);
      /* Энериум — где он заметен: от одного суточного минимума в неделю; ниже — прибавка не больше этого минимума */
      const minEn = D.enerium[D.enerium.length - 1][1] * 100;
      if (b.fan.en >= minEn ? b.payer.en * 10 > b.fan.en * 17 : b.payer.en - b.fan.en > minEn) err.push(`×1,7: Энериум плательщика ${hund(b.payer.en)} против ${hund(b.fan.en)} при силе ${b.lo}–${b.hi}`);
      if (b.payer.en - b.fan.en > b.payer.spent) err.push(`обновления за Энериум окупаются: плательщик потратил ${hund(b.payer.spent)}, топ дал сверху ${hund(b.payer.en - b.fan.en)}`);
    }
  }

  /* ---------- демо-сервер: соперники ---------- */
  const rng = A.makeRng(A.seedOf(DEMO.seed));
  const kitOf = h => { const d = h.team && h.team.draft; return (d && KITS.heroes[d]) || (XF && XF.heroes && XF.heroes[h.id]) ? true : false; };
  const clsOf = h => String(h.cls || '').split(' / ')[0].trim();
  const pool = c => RS.heroes.filter(h => h.c <= c && kitOf(h));
  const names = new Set();
  const nameOf = () => { for (;;) { const n = DEMO.names.adj[rng(DEMO.names.adj.length)] + ' ' + DEMO.names.noun[rng(DEMO.names.noun.length)]; if (!names.has(n)) { names.add(n); return n; } } };
  const lvlOf = (G, r) => Math.max(1, G.base + Math.floor((r - G.at) / G.perPts));
  const limOf = lvl => { let k = 0; while (k < DEMO.capByLim.length - 1 && lvl > DEMO.capByLim[k]) k++; return k; };
  /* отряд: танк, лекарь и трое из остальных; used — кого уже взяли (Лига: герой не повторяется) */
  function team(G, c, r, used) {
    const P = pool(c).filter(h => !used.has(h.id)), by = f => P.filter(h => f(clsOf(h)));
    const t = [], add = h => { if (h && !t.includes(h)) { t.push(h); used.add(h.id); } };
    const tanks = by(k => k === 'танк'), heals = by(k => k === 'лекарь'), rest = by(k => k !== 'танк' && k !== 'лекарь');
    add(tanks[rng(tanks.length)]); add(heals[rng(heals.length)]);
    for (let guard = 0; t.length < 5 && guard < 200; guard++) add(rest[rng(rest.length)]);
    const L = lvlOf(G, r);
    return t.map(h => { const lvl = Math.max(1, L + rng(G.spread * 2 + 1) - G.spread); return [h.id, lvl, limOf(lvl), rng(Math.min(h.maxV, G.valorMax) + 1)]; });
  }
  const rateOf = G => G.r[0] + rng(G.r[1] - G.r[0] + 1);
  const arena = [], league = [];
  let no = 0;
  for (const [c, n] of DEMO.arena.cyc) for (let k = 0; k < n; k++) {
    const r = rateOf(DEMO.arena);
    arena.push({ id: 'a' + String(++no).padStart(3, '0'), n: nameOf(), c, r, g: DEMO.arena.games[0] + rng(DEMO.arena.games[1] - DEMO.arena.games[0]), f: team(DEMO.arena, c, r, new Set()) });
  }
  no = 0;
  for (const [c, n] of DEMO.league.cyc) for (let k = 0; k < n; k++) {
    const r = rateOf(DEMO.league), used = new Set();
    league.push({ id: 'l' + String(++no).padStart(3, '0'), n: nameOf(), c, r, g: DEMO.league.games[0] + rng(DEMO.league.games[1] - DEMO.league.games[0]), t: [0, 1, 2].map(() => team(DEMO.league, c, r, used)) });
  }
  /* проверки демо: герои есть в составе, с набором; в отряде пятеро разных; у Лиги — 15 разных */
  const RSI = Object.fromEntries(RS.heroes.map(h => [h.id, h]));
  const checkTeam = (who, f) => { if (f.length !== 5 || new Set(f.map(x => x[0])).size !== 5) err.push(`${who}: не пять разных героев`); for (const [id, lvl, lim, v] of f) { const h = RSI[id]; if (!h || !kitOf(h)) err.push(`${who}: ${id} — нет в составе или без набора`); else if (v > h.maxV || lvl > DEMO.capByLim[lim]) err.push(`${who}: ${id} — доблесть или уровень выше предела`); } };
  arena.forEach(o => checkTeam(o.n, o.f));
  league.forEach(o => { o.t.forEach((f, i) => checkTeam(`${o.n}, отряд ${i + 1}`, f)); if (new Set(o.t.flat().map(x => x[0])).size !== 15) err.push(`${o.n}: в Лиге герой повторяется`); });

  /* ---------- места и лидеры: прогон ---------- */
  const uniq = T => T.filter(([, p], i, a) => i === 0 || p !== a[i - 1][1]);
  const place = S ? uniq(S.midPlace) : [], placeEnd = S ? uniq(S.endPlace || []) : [];
  const lgScale = x => Math.max(1, Math.floor(x * MOD.meta.sim.league.players / MOD.meta.sim.server.players));
  const leaguePlace = place.map(([r, p]) => [r, lgScale(p)]).filter(([, p], i, a) => i === 0 || p !== a[i - 1][1]);
  const lead = vals => vals.map(v => [nameOf(), v]);
  /* лидеры: рейтинги — прогон; у Лиги — те же рейтинги Арены ниже на сдвиг leagueTop: игроков в Лиге меньше и её рейтинг моложе */
  const top = S ? { arena: { now: lead(S.midTop), past: lead(S.endTop) },
    league: { now: lead(S.midTop.map(v => v - DEMO.leagueTop)), past: lead(S.endTop.map(v => v - DEMO.leagueTop)) } } : null;

  /* ---------- итог прогона для UI-кита и черновика ---------- */
  const model = S ? {
    rounds: MOD.calib.rounds, strength: MOD.calib.strength, puzzle: MOD.calib.puzzle, mirror: MOD.calib.mirror, pool: MOD.calib.pool,
    shifts: MOD.server.map(x => ({ shift: x.shift, eqGain: x.eqGain, drift: x.drift, rho: x.rhoBp, fan: x.prof.fan.r, free: x.prof.free.r })),
    prof: S.prof, bands: S.bands, league: MOD.league, players: MOD.meta.sim.server.players, seasons: MOD.meta.sim.server.seasons,
  } : null;

  const data = {
    meta: { builder: 'tools/content-gen/arena/build.js', model: 'tools/content-gen/arena/model.json', seed: DEMO.seed },
    bp: D.bp, elo: D.elo, arena: D.arena, league: D.league, enerium: D.enerium, season: D.season, server: { players: D.server.players, place, placeEnd, leaguePlace, leaguePlayers: MOD.meta.sim.league.players },
    top, pool: { arena, league }, model,
  };
  const tables = S ? mkTables(D, data, MOD, S) : {};
  return { data, tables, err, warn };
}

/* ================================ ТАБЛИЦЫ ЧЕРНОВИКА ================================ */
function mkTables(D, data, MOD, S) {
  const t = {}, row = cells => '| ' + cells.join(' | ') + ' |';
  const head = (h, a) => [row(h), row(h.map((_, i) => a && a[i] ? a[i] : '---'))].join('\n');
  const E = D.elo;
  t.elo = [head(['Разница рейтингов', 'Ожидание сильнего', 'Победа слабого, K 20', 'Поражение слабого, K 20']),
    ...[0, 50, 100, 150, 200, 300, 400].map(d => { const e = A.expect(D, 1000, 1000 + d, 0); return row([String(d), pctBp(A.BP - e), sgn(A.delta(20, A.BP, e)), sgn(A.delta(20, 0, e))]); })].join('\n');
  const eq = A.expect(D, 1000, 1000, E.def.shift), atkW = A.attack(D, { r: 1000, g: 99 }, { r: 1000, g: 99, lost: 0 }, 2), atkL = A.attack(D, { r: 1000, g: 99 }, { r: 1000, g: 99, lost: 0 }, 0);
  t.asym = [head(['Равные, K 20', 'Атакующий', 'Защитник']),
    row(['Ожидание', pctBp(eq), pctBp(A.BP - eq)]),
    row(['Атакующий победил', sgn(atkW.da), `${sgn(atkW.dd)} (не больше ${E.def.lossCap} поражений обороны в сутки)`]),
    row(['Атакующий проиграл', sgn(atkL.da), `${sgn(atkL.dd)} (${pctBp(E.def.winBp)} от ${sgn(atkL.raw)})`])].join('\n');
  t.rounds = [head(['Предел раундов', 'Решила гибель стороны', 'Показ в среднем', 'Раунд на экране', 'Дольше 90 с']),
    ...MOD.calib.rounds.map(x => row([String(x.rounds) + (x.rounds === D.arena.rounds ? ' — принято' : ''), pctBp(x.decBp), `${Math.floor((x.ms + 500) / 1000)} с`, sec1(x.msRound), pctBp(x.overBp)]))].join('\n');
  t.strength = [head(['Уровень отряда', 'Выше на', 'Побед', 'Очков Эло', 'За уровень']),
    ...MOD.calib.strength.map(x => row([String(x.lvl), String(x.gap), pctBp(x.winBp), String(x.pts), String(x.perLvl)]))].join('\n');
  const P = MOD.calib.puzzle;
  t.puzzle = [head(['Выбор отряда', 'Побед']), row(['пресет по умолчанию', pctBp(P.defBp)]), row([`лучший из трёх против этого состава`, pctBp(P.pickBp)]),
    row(['выгода атакующего', `${P.pts} ${plural(P.pts, 'очко', 'очка', 'очков')} Эло`]), row(['зеркальный бой, первая сторона', pctBp(MOD.calib.mirror.attBp)])].join('\n');
  t.shift = [head(['Сдвиг ожидания в пользу атакующего', 'Выгода равной атаки', 'Средний рейтинг к концу сезонов', 'Совпадение рейтинга и силы']),
    ...MOD.server.map(x => row([x.shift === D.elo.def.shift ? `${x.shift} — принято` : x.shift < 0 ? `${sgn(x.shift)} — буквально «+50 защитнику»` : String(x.shift), `${hund(x.eqGain)} рейтинга за атаку`, x.drift.map(fmt).join(' → '), pctBp(x.rhoBp)]))].join('\n');
  const PN = { free: 'обычный', fan: 'увлечённый', payer: 'плательщик' }, SP = MOD.meta.sim.server.prof;
  t.prof = [head(['Профиль', 'Доля', 'Атак за неделю', 'Побед (медиана)', 'Доля побед', 'Энериум топа за неделю', 'Обновлений за Энериум', 'Энериума на обновления']),
    ...Object.entries(S.prof).map(([k, x]) => row([PN[k], pctBp(SP[k].share), hund(x.att), `${hund(x.wins)} (${x.winMed})`, pctBp(x.winBp), hund(x.en), hund(x.refs), hund(x.spent)]))].join('\n');
  const minEn = D.enerium[D.enerium.length - 1][1] * 100;   // Энериум заметен — от одного суточного минимума в неделю
  const ratio = (a, b) => '×' + hund(Math.floor(a * 100 / Math.max(1, b)));
  t.x17 = [head(['Сила, очков над средним', 'Увлечённый: рейтинг, место, побед, Энериум', 'Плательщик: рейтинг, место, побед, Энериум', 'Плательщик потратил', 'Отношение побед / Энериума']),
    ...S.bands.map(b => row([`${b.lo}–${b.hi}`, `${fmt(b.fan.r)}, #${fmt(b.fan.place)}, ${hund(b.fan.wins)}, ${hund(b.fan.en)}`, `${fmt(b.payer.r)}, #${fmt(b.payer.place)}, ${hund(b.payer.wins)}, ${hund(b.payer.en)}`, hund(b.payer.spent),
      `${ratio(b.payer.wins, b.fan.wins)} / ${b.fan.en >= minEn ? ratio(b.payer.en, b.fan.en) : b.payer.en > b.fan.en ? '+' + hund(b.payer.en - b.fan.en) + ' Энериума' : '—'}`]))].join('\n');
  const L = MOD.league;
  t.league = [head(['Лига', 'Значение']), row(['победа в матче, прямой порядок', pctBp(L.straightBp)]), row(['победа в матче, лучшая расстановка', pctBp(L.bestBp)]),
    row(['лучшая расстановка ставит слабейший отряд против их сильнейшего', pctBp(L.sacBp)]),
    ...Object.entries(L.prof).map(([k, x]) => row([`${PN[k]}: матчей и побед за неделю`, `${x.matches} и ${x.wins}`]))].join('\n');
  const pk = m => [1, 2, 4, 8].map(x => D[m].plank * x);
  t.planks = [head(['Режим', 'Планки побед за неделю', 'Обычный', 'Увлечённый']),
    row(['Арена', pk('arena').join(' / '), wins(S.prof.free.winMed), wins(S.prof.fan.winMed)]),
    row(['Лига', pk('league').join(' / '), wins(L.prof.free.wins), wins(L.prof.fan.wins)])].join('\n');
  t.place = [head(['Рейтинг в середине сезона', 'Место на сервере из ' + fmt(D.server.players), 'Энериум за сутки']),
    ...data.server.place.filter(([r]) => r <= 1600 && r >= 900 && r % 100 === 0).map(([r, p]) => row([fmt(r), '#' + fmt(p), String(A.dailyEn(D, p))]))].join('\n');
  t.enerium = [head(['Место на суточном срезе', 'Энериум']), row(['1', '100']), row(['2–10', '50']), row(['11–30', '25']), row(['31–100', '10'])].join('\n');
  const dv = D.league.divisions;
  t.div = [head(['Дивизион', 'Рейтинг Лиги']), ...dv.map((x, i) => row([x.n, i + 1 === dv.length ? `${fmt(x.from)} и выше` : i ? `${fmt(x.from)}–${fmt(dv[i + 1].from - 1)}` : `до ${fmt(dv[i + 1].from - 1)}`]))].join('\n');
  return t;
}

/* ================================ ВЫВОД ================================ */
function render(data) {
  const elo = fs.readFileSync(FILES.elo, 'utf8').replace(/\r\n/g, '\n');
  const head = `/* Арена и Лига — данные прототипа «Свет снизу». Собирает tools/content-gen/arena/build.js из правил (rules.js), прогона
   (model.json) и демо-сервера. Руками не править: пересборка затрёт правку.
   Черновик · предложение · ждёт автора. Числа — демонстрация, только целые; доли — в базисных пунктах (10 000 = 100 %).
   elo — Эло: таблица ожидания по разнице рейтингов, K, асимметрия защиты, сезонный сброс; arena, league — подбор, попытки,
   обновления, предел раундов, порог первой планки побед, дивизионы Лиги; enerium — Энериум за место на суточном срезе;
   server — «рейтинг → место» сервера из прогона; top — лидеры; pool — соперники демо-сервера: [герой, уровень, предел, доблесть];
   model — итог прогона для UI-кита. Обоснование и таблицы — docs/content/арена-и-лига.md. В игре подбор, бой, рейтинг и награды
   решает сервер (§20, §34.1, §36.16). Ниже данных — алгоритм tools/content-gen/arena/elo.js как есть. */\n`;
  return head + 'window.EN_ARENA = ' + JSON.stringify(data) + ';\n' + elo;
}
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/arena/build.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) continue;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { build, render, withTables, markA, markB, FILES, DEMO };

if (require.main === module) {
  const R = build();
  for (const w of R.warn) console.log('предупреждение: ' + w);
  if (process.argv.includes('--print')) {
    if (R.err.length) console.log('ОШИБКИ:\n' + R.err.join('\n'));
    for (const [k, t] of Object.entries(R.tables || {})) console.log(`\n### ${k}\n\n${t}`);
    process.exit(R.err.length ? 1 : 0);
  }
  if (R.err.length) { console.log('ОШИБКИ:\n' + R.err.join('\n')); process.exit(1); }
  const js = render(R.data);
  const docOld = fs.existsSync(FILES.doc) ? fs.readFileSync(FILES.doc, 'utf8') : null;
  const docNew = docOld ? withTables(docOld, R.tables) : null;
  if (process.argv.includes('--check')) {
    const okJs = fs.existsSync(FILES.out) && fs.readFileSync(FILES.out, 'utf8') === js, okDoc = !docOld || docNew === docOld;
    console.log(okJs && okDoc ? 'Свежие: arena.js и таблицы документа совпадают со сборкой.' : `Устарели: ${[!okJs && 'design/ui/arena.js', !okDoc && 'docs/content/арена-и-лига.md'].filter(Boolean).join(', ')} — пересобрать.`);
    process.exit(okJs && okDoc ? 0 : 1);
  }
  fs.writeFileSync(FILES.out, js);
  if (docNew) fs.writeFileSync(FILES.doc, docNew);
  else console.log('предупреждение: черновика docs/content/арена-и-лига.md нет — таблицы не вставлены');
  console.log(`Собрано: соперников Арены ${R.data.pool.arena.length}, Лиги ${R.data.pool.league.length}; таблица Эло ${R.data.elo.table.length} значений; мест ${R.data.server.place.length} точек.`);
}
