/* Тексты игрока из данных игры — для лестницы спойлеров (lore/ladder.js) и листа «Намёки по циклам» таблиц.
   Каждый текст: { cyc — цикл, с которого игрок его видит (1–6), team — только для команды, owner — чьи данные (где править),
   where — что это, text }. Цикл берётся из самих данных: цикл предмета и рецепта, цикл героя и сета, «с цикла» артефакта и
   достижения, открытие режима; способность — самый ранний цикл её носителя (герой состава, враг Эхо, враг биома, враг
   Мастерской), без носителя — цикл I. Только читает. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..');
const UI = path.join(ROOT, 'design', 'ui');

/* кто правит данные: owner → где исходник */
const OWNERS = {
  recipes: { src: 'tools/content-gen/recipes/c1.js … c6.js, basics.js, global.js', mine: true },
  abilities: { src: 'tools/content-gen/abilities/library.py', mine: true },
  talismans: { src: 'tools/content-gen/talismans/build.js, раздел «ДАННЫЕ»', mine: true },
  echo: { src: 'design/ui/screens/echo.js (ECH) и tools/content-gen/echo/weeks/*.js', mine: true },
  clan: { src: 'tools/content-gen/clan/foes.js', mine: true },
  contracts: { src: 'tools/content-gen/contracts/build.js', mine: true },
  rituals: { src: 'tools/content-gen/rituals/build.js', mine: true },
  event: { src: 'tools/content-gen/event/build.js', mine: true },
  store: { src: 'tools/content-gen/store/build.js', mine: true },
  lootboxes: { src: 'tools/content-gen/lootboxes/build.js', mine: true },
  pass: { src: 'tools/content-gen/pass/build.js', mine: true },
  chronicle: { src: 'tools/content-gen/lore/chapters.js', mine: true },
  roster: { src: 'docs/content/герои/состав-героев.csv, главы, heroes/export_roster.py', mine: true },
  wanderer: { src: 'tools/content-gen/wanderer/build.js (PAS_FIX, ART), achievements.js', mine: true },
  biomes: { src: 'tools/content-gen/biomes/data/*.js', mine: true },
  start: { src: 'tools/content-gen/start/data.js', mine: true },
  cycle: { src: 'tools/content-gen/cycle/data.js (SAY, TEXT) и данные игры, из которых их собирает cycle/build.js', mine: true },
};

function load(name) {
  const ctx = { console: { log() {}, warn() {}, error() {} } }; ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(UI, name + '.js'), 'utf8'), ctx, { filename: name + '.js' });
  return ctx;
}

function collect() {
  const out = [];
  const add = (owner, cyc, team, where, text) => {
    if (text == null || text === '') return;
    if (Array.isArray(text)) { text.forEach((t, i) => add(owner, cyc, team, where + '[' + i + ']', t)); return; }
    out.push({ owner, cyc: cyc || 1, team: !!team, where, text: String(text) });
  };

  /* --- ремесло: предметы, рецепты, места, эхо боссов --- */
  const R = load('recipes').EN_RECIPES;
  for (const it of R.items) for (const f of ['n', 'lore', 'hint', 'opensLore']) add('recipes', it.cyc, it.team, `предмет ${it.id} · ${f}`, it[f]);
  for (const r of R.recipes) add('recipes', r.cyc, r.team, `рецепт ${r.id} · n`, r.n);
  for (const c of R.cycles) {
    add('recipes', c.n, c.team, `цикл ${c.roman} · about`, c.about);
    for (const b of c.biomes) for (const f of ['n', 'boss', 'guard']) add('recipes', c.n, c.team, `биом ${b.id} · ${f}`, b[f]);
  }
  for (const p of R.places) {
    for (const f of ['n', 'where', 'lore', 'foes']) add('recipes', p.cyc, p.team, `место ${p.id} · ${f}`, p[f]);
    if (p.boss) for (const f of ['n', 'title', 'lore']) add('recipes', p.cyc, p.team || p.boss.team, `место ${p.id} · boss.${f}`, p.boss[f]);
    const aw = p.boss && p.boss.awake;
    if (aw) for (const f of ['label', 'lore']) add('recipes', aw.cyc || Math.max(p.cyc, 2), p.team || p.boss.team, `место ${p.id} · awake.${f}`, aw[f]);
  }
  for (const m of R.memories) for (const f of ['label', 'lore']) add('recipes', m.cyc, m.team, `эхо босса ${m.id} · ${f}`, m[f]);

  /* --- герои состава, сеты, недели Эхо --- */
  const RO = load('roster').EN_ROSTER;
  for (const h of RO.heroes) {
    add('roster', h.c, false, `герой ${h.id} · n`, h.n);
    add('roster', h.c, false, `герой ${h.id} · who`, h.who);
    (h.ch || []).forEach((c, i) => { add('roster', h.c, false, `герой ${h.id} · глава ${i + 1}`, c[0]); add('roster', h.c, false, `герой ${h.id} · глава ${i + 1} · текст`, c[1]); });
  }
  for (const s of RO.sets) { add('roster', s.cycle, false, `сет ${s.key} · name`, s.name); add('roster', s.cycle, false, `сет ${s.key} · bonus`, s.bonus); }
  for (const w of RO.weeks) { add('roster', 2, false, `неделя ${w.race} · civ`, w.civ); add('roster', 2, false, `неделя ${w.race} · raid`, w.raid); }

  /* --- способности: цикл — самый ранний носитель --- */
  const L = require(path.join(ROOT, 'tools', 'content-gen', 'abilities', 'library.json'));
  const K = require(path.join(ROOT, 'tools', 'content-gen', 'abilities', 'kits.json'));
  const EF = load('echo-foes').EN_ECHO_FOES, BF = load('biome-foes').EN_BIOME_FOES;
  const bioCyc = Object.fromEntries(R.cycles.flatMap(c => c.biomes.map(b => [b.id, c.n])));
  const abCyc = {};
  const seen = (id, c) => { if (id && (abCyc[id] == null || c < abCyc[id])) abCyc[id] = c; };
  for (const h of Object.values(K.roster || {})) for (const s of h.kit || []) seen(s.id, h.cycle);
  for (const f of Object.values(K.foes || {})) for (const s of f.kit || []) seen(s.id, 1);
  for (const f of Object.values(EF.foes)) for (const s of f.kit || []) seen(s.id, 2);
  for (const f of Object.values(BF.foes)) for (const s of (f.kit && f.kit.kit) || []) seen(s.id, bioCyc[f.biome] || 1);
  for (const set of Object.values(L.sets)) for (const k of ['active', 'ult', 'passive', 'reaction']) for (const a of set[k]) {
    add('abilities', abCyc[a.id] || 1, false, `способность ${a.id} · n`, a.n);
    add('abilities', abCyc[a.id] || 1, false, `способность ${a.id} · d`, a.d);
  }
  for (const [k, v] of Object.entries(L.farm)) for (const a of v) { add('abilities', abCyc[a.id] || 1, false, `способность ${a.id} · n`, a.n); add('abilities', abCyc[a.id] || 1, false, `способность ${a.id} · d`, a.d); }

  /* --- талисманы: открыты с цикла II, «для команды» — цикл VI --- */
  const T = load('talismans').EN_TALISMANS, tOpen = T.rules.openCycle || 2;
  for (const [k, f] of Object.entries(T.fams)) for (const x of ['n', 'd', 'fx']) add('talismans', f.team ? 6 : tOpen, !!f.team, `талисман ${k} · ${x}`, f[x]);
  for (const [k, v] of Object.entries(T.rules.cats || {})) add('talismans', tOpen, false, `талисманы · вид ${k}`, v);

  /* --- Странник: Память, артефакты, достижения --- */
  const W = load('wanderer').EN_WANDERER, memFrom = Math.min(...W.mem.places);
  for (const p of W.passives) for (const x of ['n', 'd']) add('wanderer', memFrom, false, `пассивка ${p.id} · ${x}`, p[x]);
  for (const a of W.art.list) for (const x of ['n', 'd', 'what']) add('wanderer', a.from, false, `артефакт ${a.id} · ${x}`, a[x]);
  for (const a of W.ach.list) for (const x of ['n', 'd', 'hint']) add('wanderer', a.from || 1, false, `достижение ${a.id} · ${x}`, a[x]);
  for (const a of W.ach.firsts) for (const x of ['n', 'd', 'title']) add('wanderer', a.c, false, `первенство ${a.id} · ${x}`, a[x]);

  /* --- враги Эхо --- */
  for (const [k, f] of Object.entries(EF.foes)) {
    for (const x of ['name', 'look']) add('echo', 2, false, `враг Эхо ${k} · ${x}`, f[x]);
    for (const s of f.kit || []) add('echo', 2, false, `враг Эхо ${k} · приём ${s.id}`, s.as);
  }
  for (const a of EF.abilities) for (const x of ['n', 'd']) add('echo', 2, false, `способность ${a.id} · ${x}`, a[x]);
  for (const w of EF.weeks) for (const x of ['raid', 'answer']) add('echo', 2, false, `неделя Эхо ${w.race} · ${x}`, w[x]);

  /* --- враги биомов 2–4 --- */
  for (const [k, f] of Object.entries(BF.foes)) {
    add('biomes', bioCyc[f.biome], false, `враг ${k} · name`, f.name);
    for (const s of (f.kit && f.kit.kit) || []) add('biomes', bioCyc[f.biome], false, `враг ${k} · приём ${s.id}`, s.as);
  }
  for (const [k, c] of Object.entries(BF.cards)) for (const x of ['look', 'desc', 'tag']) add('biomes', bioCyc[c.biome], false, `бестиарий ${k} · ${x}`, c[x]);
  for (const a of BF.abilities) { const c = bioCyc[(a.owner || '').slice(0, 2)] || 1; add('biomes', c, false, `способность ${a.id} · n`, a.n); add('biomes', c, false, `способность ${a.id} · d`, a.d); }

  /* --- клан: сонмы стихий --- */
  const CL = load('clan').EN_CLAN, clanFrom = (CL.open && CL.open.cycle) || 2;
  const CF = require(path.join(ROOT, 'tools', 'content-gen', 'clan', 'foes.js'));
  const walk = (o, p, owner, cyc) => { if (typeof o === 'string') add(owner, cyc, false, p, o); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, p + '.' + k, owner, cyc); };
  walk(CF, 'сонмы', 'clan', clanFrom);

  /* --- режимы: контракты, ритуалы, Событие, Лавка, сундуки, пропуск --- */
  const C = load('contracts').EN_CONTRACTS;
  for (const [k, v] of Object.entries(C.kinds)) for (const x of ['n', 'what', 'need']) add('contracts', v.from || 2, false, `контракт ${k} · ${x}`, v[x]);
  const RI = load('rituals').EN_RITUALS, ritFrom = (RI.rules.open && RI.rules.open.cycle) || 2;
  walk(RI.tabs, 'ритуалы', 'rituals', ritFrom); walk(RI.text, 'ритуалы · текст', 'rituals', ritFrom);
  const EV = load('event').EN_EVENT;
  for (const [k, w] of Object.entries(EV.weeks)) for (const x of ['n', 'line']) add('event', EV.from || 2, false, `Событие ${k} · ${x}`, w[x]);
  const S = load('store').EN_STORE;
  walk({ chain: S.chain, packs: S.packs, subs: S.subs, pass: S.pass, offers: S.offers.kinds }, 'Лавка', 'store', 1);
  const LB = load('lootboxes').EN_LOOTBOXES;
  for (const [k, b] of Object.entries(LB.boxes)) add('lootboxes', 1, false, `сундук ${k}`, b.n);
  for (const [k, m] of Object.entries(LB.modes)) add('lootboxes', m.from || 1, false, `источник ${k}`, m.n);
  const P = load('pass').EN_PASS, passFrom = (P.open && P.open.cycle) || 1;
  add('pass', passFrom, false, 'пропуск · сезон', P.season.n);
  for (const [k, m] of Object.entries(P.cal.miles || {})) add('pass', 1, false, `Дар дня · веха ${k}`, m.n);

  /* --- Летопись --- */
  const CH = load('chronicle').EN_CHRONICLE;
  for (const c of CH.chapters) { const cyc = (c.open && c.open.c) || 1; for (const x of ['n', 'lead', 'more']) add('chronicle', cyc, false, `глава ${c.id} · ${x}`, c[x]); }
  for (const p of CH.parts) add('chronicle', 1, false, `раздел ${p.id}`, [p.n, p.d]);

  /* --- старт с чистого листа («Чистый лист») --- */
  const ST = load('start').EN_START;
  for (const [k, o] of Object.entries(ST.open || {})) for (const x of ['n', 'd']) add('start', 1, false, `открытие ${k} · ${x}`, o[x]);
  (ST.levels || []).forEach((l, i) => walk(l, `уровень ${i + 1}`, 'start', 1));

  /* --- новый цикл: окно «Событие нового цикла» (ADR-0041) — игрок видит его с цикла, в который вошёл --- */
  if (fs.existsSync(path.join(UI, 'cycle.js'))) {
    const CY = load('cycle').EN_CYCLE;
    for (const [c, s] of Object.entries(CY.steps || {})) {
      add('cycle', +c, false, `переход в цикл ${s.roman} · окно`, [s.title, s.lead, s.say && s.say[1]]);
      for (const g of s.got || []) add('cycle', +c, false, `переход в цикл ${s.roman} · сразу ${g.k}`, g.n);
      for (const x of s.open || []) add('cycle', +c, !!x.team, `переход в цикл ${s.roman} · ${x.sec}.${x.k}`, [x.n, x.d]);
    }
  }

  return out;
}

/* враги спуска до 11-го биома: без искажённых, нежити и Перворождённых (дайджест) */
function descentRaces() {
  const BF = load('biome-foes').EN_BIOME_FOES, R = load('recipes').EN_RECIPES;
  const bioCyc = Object.fromEntries(R.cycles.flatMap(c => c.biomes.map(b => [b.id, c.n])));
  return Object.entries(BF.foes).map(([k, f]) => ({ owner: 'biomes', cyc: bioCyc[f.biome], biome: f.biome, where: `враг ${k} · раса`, text: f.race || '' }));
}

module.exports = { OWNERS, load, collect, descentRaces };
