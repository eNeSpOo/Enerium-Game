/* Автопроверка биомов 2–4 (ADR-0010, ADR-0011, ADR-0014, ADR-0016, ADR-0018, ADR-0020) в ядре и в прототипе — без браузера.
   Ядро и данные (design/ui/battle.js, biome-foes.js; сборщик tools/content-gen/biomes/build.js):
   1. biome-foes.js сам регистрирует биомы: EB.BIOMES b2–b4, карты в EB.FOES, уникальные способности в библиотеке ядра.
   2. Состав врага по рангу (ADR-0016): рядовой — 1, элита — 2 без ульты, босс — 3 с ультой, рунный — 4 с ультой; приёмы — своей
      стихии или уникальные своего биома; классы знакомы ядру; характеристики — целые.
   3. Колоды: босс — только на последнем этаже; этажей и элит — как в черновике добычи (recipes.js); свита стража — рунный босс
      и четыре элиты; у биома 2 на этаже не больше четырёх врагов, осады нет; у биомов 3–4 — осада.
   4. Добыча ядра — ставки recipes.js: золото и дух × dropPct биома, души — номер биома; рунный страж — своя ставка.
   5. Бой детерминирован: тот же сид — тот же итог, порядок героев не влияет; здоровье, щиты и добыча — целые.
   6. Каждая уникальная способность срабатывает в бою: активные и ульты — в ленте, пассивки — счётчиком ядра.
   7. Темп — главные утверждения прогона: пара первого биома и четверо не берут босса биома 2, первая полная пачка на 50-м
      берёт и босса, и стража; биомы 3–4 — стена на 150-м, всё пройдено на 525-м; прогон темпа pace.json сделан на этих данных.
   Прототип (index.html и screens/*.js в песочнице, как check_echo_battle.js):
   8. «Спуск»: у каждого биома своя шапка-арена, свои 14 обитателей, босс и страж; закрытый биом игрок не выбирает, команда — может.
   9. Арт: портрет и арена — выгруженный файл из списка готовых или заглушка data:, битых адресов нет; без готовности — заглушка.
   10. Забег и бой — на арене и с врагами своего биома; итог забега — тексты своего биома, после стража биома 2 — слово Этриона.
   11. Рунный страж: у пройденного биома 2 вход открыт, у рубежа 3 — после босса, демо-вход — всегда; удар стража отнимает раунд.
   12. Бестиарий по биомам: Летопись группирует врагов по биомам, закрытый — только команде; у кого нет записи сказителя —
       облик без совета старика; числа карточек — ядро на этаже первой встречи.
   13. Демо-аккаунт: 1–2 пройдены, 3 — рубеж, 4 закрыт; у биома 4 есть имя. Сценарии презентации — быстрый бой и страж каждого биома.
   14. Режим «Игрок»: на экранах биомов нет служебных слов (strip и SERVICE из check_player_view.js); раздел UI-кита рисуется.
   Везде: без исключений, без undefined, NaN и [object. Числа проверки — не баланс.
   Запуск: node tools/content-gen/screens/check_biomes.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const err = [], out = { battles: 0, runs: 0, views: 0, uniques: 0 };
const fail = m => { if (err.length < 80) err.push(m); };
const done = () => {
  if (err.length) { console.log('ОШИБКИ:\n' + err.map(e => '  ✗ ' + e).join('\n')); process.exit(1); }
  console.log(`Биомы 2–4: боёв ядра ${out.battles}, забегов прототипа ${out.runs}, отрисовок ${out.views}, уникальных способностей сработало ${out.uniques}.`);
  console.log('Проверка пройдена: данные и ядро биомов 2–4, темп, «Спуск», арены и портреты, забег, страж, бестиарий и сценарии — без исключений, undefined и NaN.');
  process.exit(0);
};
const scan = (key, h) => { const m = String(h).match(/.{0,50}(?:undefined|NaN|\[object ).{0,30}/); if (m) fail(`${key}: в разметке undefined, NaN или [object — «${m[0]}»`); return h; };
const intsOf = (key, x) => { const bad = []; const walk = (v, p) => { if (typeof v === 'number' && !Number.isInteger(v)) bad.push(p + '=' + v); else if (v && typeof v === 'object') for (const k in v) walk(v[k], p + '.' + k); }; walk(x, ''); if (bad.length) fail(`${key}: не целые числа — ${bad.slice(0, 4).join(', ')}`); };
const serviceIn = (key, h) => { const t = playerText(h); for (const [what, re] of SERVICE) { const m = t.match(re); if (m) fail(`${key}: игрок видит служебное (${what}) — «${t.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\n/g, ' ')}»`); } };

/* ================== ядро и данные ================== */
const S0 = require(path.join(ROOT, 'tools', 'content-gen', 'biomes', 'sim.js'));
const EB = S0.EB, X = S0.X, L = EB.lib(), RX = (() => { const c = { window: {} }; c.window = c; vm.createContext(c); vm.runInContext(read('recipes.js'), c); return c.EN_RECIPES; })();
const BIO = ['b2', 'b3', 'b4'];
const RANKS = { o: [1, 0], e: [2, 0], b: [3, 1], rune: [4, 1] };
try {
  /* 1–3. регистрация, состав, колоды */
  for (const id of BIO) {
    const B = EB.BIOMES[id], D = RX.drops.enemies.find(e => e.biome === id);
    if (!B) { fail(`${id}: биома нет в ядре — biome-foes.js не зарегистрировал`); continue; }
    if (B.name !== X.biomes[id].core.name || B.seed !== EB.seedOf(B.name)) fail(`${id}: имя или сид биома`);
    const ids = Object.keys(X.foes).filter(f => X.foes[f].biome === id), fl = B.floors, last = fl.length;
    if (ids.length !== 14) fail(`${id}: врагов ${ids.length}, нужно 14`);
    for (const f of ids) {
      const F = EB.FOES[f], k = F && F.kit;
      if (!F) { fail(`${f}: карты нет в ядре`); continue; }
      if (!EB.RULES.cls[F.cls]) fail(`${f}: класс «${F.cls}» не знаком ядру`);
      if (F.st.length !== 5 || F.st.some(v => !Number.isInteger(v) || v <= 0) || !Number.isInteger(F.hpPct)) fail(`${f}: характеристики ${F.st} / ${F.hpPct}`);
      const [n, u] = RANKS[F.rank] || [];
      if (!k || k.kit.length !== n || k.kit.filter(x => x.slot === 'ult').length !== u) fail(`${f}: набор не по рангу «${F.rank}» (ADR-0016)`);
      for (const x of (k ? k.kit : [])) {
        const a = L[x.id];
        if (!a) { fail(`${f}: ядро не знает «${x.id}»`); continue; }
        if (!x.id.startsWith('Спуск.' + id) && a.school !== F.el) fail(`${f}: «${x.id}» — не школа стихии врага ${F.el}`);
      }
      if (!X.cards[f] || !Number.isInteger(X.cards[f].hp) || !Number.isInteger(X.cards[f].bm) || X.cards[f].hp <= 0) fail(`${f}: карточка бестиария без чисел ядра`);
    }
    if (fl[last - 1].g !== 'b' || fl.slice(0, -1).some(x => x.g === 'b') || fl[last - 1].m[0] !== id + 'b1') fail(`${id}: босс не на последнем этаже или не первым`);
    const elites = fl.reduce((a, x) => a + x.m.filter(m => EB.FOES[m].rank === 'e').length, 0);
    if (!D || D.floors !== last || D.elites !== elites) fail(`${id}: этажей ${last} и элит ${elites} — не как в recipes.js (${D && D.floors}, ${D && D.elites})`);
    if (fl.some(x => x.m.length > (id === 'b2' ? 4 : 5))) fail(`${id}: на этаже больше врагов, чем можно`);
    if (fl.some(x => x.g === 'e' && EB.FOES[x.m[0]].rank !== 'e')) fail(`${id}: у элитного этажа лидер не элита`);
    if (B.guard.m.length !== 5 || EB.FOES[B.guard.m[0]].rank !== 'rune' || B.guard.m.slice(1).some(m => EB.FOES[m].rank !== 'e')) fail(`${id}: свита стража — не рунный босс и четыре элиты (ADR-0010)`);
    if ((id === 'b2') !== (B.siege === false)) fail(`${id}: осада — только с цикла II (ADR-0018)`);
    /* 4. добыча: ставки recipes.js × dropPct, души — номер биома */
    const R = EB.RULES.drop, M = B.dropPct;
    if (D) {
      const want = { o: D.ordinary, e: D.elite, b: D.boss, rune: D.guard };
      for (const r of ['o', 'e', 'b', 'rune']) {
        const d = R[r]; if (Math.floor(d.spirit * M / 100) !== want[r].spirit || Math.floor(d.gold * M / 100) !== want[r].gold) fail(`${id}: ставка ${r} × ${M} % — ${Math.floor(d.gold * M / 100)} / ${Math.floor(d.spirit * M / 100)}, в recipes.js — ${want[r].gold} / ${want[r].spirit}`);
      }
      if (R.e.soulsPerBiome * B.n !== D.elite.souls || R.b.soulsPerBiome * B.n !== D.boss.souls) fail(`${id}: души элиты и босса — не номер биома (ADR-0011)`);
    }
  }
  for (const u of X.abilities) if (!L[u.id] || L[u.id].n !== u.n) fail(`уникальная «${u.id}» не в библиотеке ядра`);

  /* 4б. добыча взятого этажа — по рангам павших; 5. детерминизм, порядок героев, целые */
  const pack = L0 => S0.SQUAD.map(h => S0.hero(h.id, L0, h.valor));
  for (const id of BIO) {
    const B = EB.BIOMES[id], hs = pack(700);
    for (const f of [1, B.floors.length]) {
      const b = EB.run(EB.floorBattle(hs, id, f, null, 'rounds')); out.battles++;
      const b2 = EB.run(EB.floorBattle(hs.slice().reverse(), id, f, null, 'rounds')); out.battles++;
      if (b.win !== b2.win || b.round !== b2.round || b.u[1].map(u => u.hp).join() !== b2.u[1].map(u => u.hp).join()) fail(`${id} · этаж ${f}: порядок героев изменил бой`);
      for (const side of [0, 1]) for (const u of b.u[side]) if (!Number.isInteger(u.hp) || !Number.isInteger(u.sh)) fail(`${id} · этаж ${f}: не целое здоровье у ${u.name}`);
      if (!b.win) { fail(`${id} · этаж ${f}: отряд на 700-м не взял этаж`); continue; }
      const got = EB.floorLoot(id, f, b, 0); intsOf(`${id} · добыча ${f}`, got);
      const D = RX.drops.enemies.find(e => e.biome === id), cnt = r => b.u[1].filter(u => u.rank === r).length;
      const wantS = cnt('o') * D.ordinary.spirit + cnt('e') * D.elite.spirit + cnt('b') * D.boss.spirit, wantG = cnt('o') * D.ordinary.gold + cnt('e') * D.elite.gold + cnt('b') * D.boss.gold;
      if (got.spirit !== wantS || got.gold !== wantG) fail(`${id} · этаж ${f}: дух и золото ${got.spirit} / ${got.gold}, по recipes.js — ${wantS} / ${wantG}`);
      if (got.souls !== cnt('e') * D.elite.souls + cnt('b') * D.boss.souls) fail(`${id} · этаж ${f}: души ${got.souls}`);
    }
    const g1 = EB.run(EB.guardBattle(hs, id, 'rounds')), g2 = EB.run(EB.guardBattle(hs, id, 'rounds')); out.battles += 2;
    if (g1.win !== g2.win || g1.round !== g2.round) fail(`${id}: бой со стражем не детерминирован`);
    if (g1.maxRounds > EB.RULES.rounds.rune) fail(`${id}: у стража больше ${EB.RULES.rounds.rune} раундов`);
  }

  /* 6. уникальные способности срабатывают: владелец против отряда, сиды по кругу */
  for (const u of X.abilities) {
    const owner = EB.FOES[u.owner], B = EB.BIOMES[owner.biome], hit = { n: 0 };
    for (let seed = 1; seed <= 60 && !hit.n; seed++) {
      const allies = B.guard.m.slice(1).filter(m => m !== u.owner).slice(0, 3).map((m, k) => ({ key: m + '#a' + k, id: m, name: EB.FOES[m].name, cls: EB.FOES[m].cls, el: EB.FOES[m].el, lvl: 60, st: EB.FOES[m].st, hpPct: 200, rank: EB.FOES[m].rank, kit: EB.FOES[m].kit }));
      const me = { key: u.owner + '#0', id: u.owner, name: owner.name, cls: owner.cls, el: owner.el, lvl: 60, st: owner.st, hpPct: 400, rank: owner.rank, main: owner.main, kit: owner.kit, lead: true };
      const heroes = pack(95).map(h => Object.assign(h, { hp: null }));
      const b = EB.create({ mode: 'rounds', seed: seed * 7919, heroes, foes: [me].concat(allies) }); out.battles++;
      // щиты и баффы у героев — чтобы «забрать эффекты» было что забрать
      for (const h of b.u[0]) h.sh = 50;
      while (!b.over) { const a = EB.step(b); if (a && a.ev) for (const e of a.ev) if ((e.k === 'cast' && e.n === u.n) || (e.k === 'react' && e.id === u.id)) hit.n++; }
      if (b.cov[u.id]) hit.n++;
    }
    if (!hit.n) fail(`уникальная «${u.n}» (${u.owner}) не сработала ни в одном бою`); else out.uniques++;
  }

  /* 7. темп: главные утверждения */
  const camp = (ids, L0, b, val) => S0.campaign(ids.map(h => S0.hero(h, L0, val)), b, 1);
  const PAIR = ['h1', 'h2'], PACK = ['h1', 'h2', 'h3', 'h4', 'h5'];
  if (camp(PAIR, 50, 'b2', 0).runs) fail('темп: пара героев первого биома на 50-м берёт босса биома 2 — полная пачка не нужна (ADR-0018)');
  for (const q of [['h1', 'h2', 'h3', 'h4'], ['h1', 'h2', 'h3', 'h5']]) if (camp(q, 50, 'b2', 0).runs) fail(`темп: четверо (${q.join(', ')}) на 50-м берут босса биома 2`);
  const full = PACK.map(h => S0.hero(h, 50, 0));
  if (!S0.campaign(full, 'b2', 1).runs || !S0.guardWin(full, 'b2').win) fail('темп: первая полная пачка на 50-м не берёт босса или стража биома 2');
  for (const id of ['b3', 'b4']) {
    const at150 = S0.SQUAD.map(h => S0.hero(h.id, 150, h.valor)), at525 = S0.SQUAD.map(h => S0.hero(h.id, 525, h.valor));
    if (S0.campaign(at150, id, 60).reach) fail(`темп: ${id} — отряд на 150-м доходит до босса: первая неделя цикла II без стены`);
    if (!S0.campaign(at525, id, 60).runs || !S0.guardWin(at525, id).win) fail(`темп: ${id} — отряд на 525-м не берёт босса или стража`);
  }
  out.battles += 40;
  if (!X.pace || X.pace.sig !== X.rules.sig) fail('темп: в biome-foes.js нет прогона темпа на этих данных — python tools/content-gen/biomes/pace.py, затем build.js');
  else for (const v of X.pace.verdict || []) if (!v.ok) fail(`темп: «${v.what}» — ${v.got}, цель — ${v.goal}`);
} catch (e) { fail('ядро: исключение — ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }

/* ================== прототип в песочнице ================== */
const html = read('index.html');
if (!html.includes('<script src="biome-foes.js"></script>') || !html.includes('<script src="screens/biomes.js"></script>')) fail('index.html не подключает biome-foes.js или screens/biomes.js');
if (html.indexOf('src="biome-foes.js"') < html.indexOf('src="abilities.js"') || html.indexOf('src="biome-foes.js"') < html.indexOf('src="battle.js"')) fail('biome-foes.js грузится раньше ядра или библиотеки');
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const stubEl = id => {
  const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, prepend() {}, remove() {},
    animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
  e.querySelector = () => stubEl();
  return e;
};
const els = {};
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
  createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: stubEl('html'), activeElement: null, fonts: null };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
win.window = win; win.self = win;
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { fail(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
const T = vm.runInContext(`({
  get S() { return S; }, set S(v) { S = v; },
  ACT, OV, SCREENS, FLOWS, KH, EB, render, initialState, startRun, advance, runById, F, FA, G, BIOME_UI, ARENAS, KIT_EXTRA, renderKit, setTeam, AV,
  BU: window.EN_BIOMES_UI, X: window.EN_BIOME_FOES,
})`, ctx);
const draw = key => { out.views++; T.render(); return scan(key, els.game ? els.game.innerHTML : ''); };
const reset = () => { T.S = T.initialState(); T.S.overlay = null; T.S.wallet.souls = 1e9; };
const play = (R, key) => { let n = 0; while (!R.over && n++ < 40000) T.advance(R, 500); if (!R.over) fail(`${key}: забег не кончился`); out.runs++; };
try {
  const PX = T.X, READY = T.BU.READY;
  /* 13. демо-аккаунт */
  reset();
  const st = id => T.S.biomes.find(b => b.id === id);
  if (!st('b1') || st('b1').state !== 'done' || st('b2').state !== 'done' || st('b3').state !== 'front' || st('b4').state !== 'lock') fail('демо: биомы 1–2 пройдены, 3 — рубеж, 4 закрыт — не так');
  if (!st('b4').name) fail('демо: у биома 4 нет имени');
  if (!T.G('b2').killed || T.G('b3').killed) fail('демо: у пройденного биома 2 босс не пал или у рубежа 3 — уже пал');
  const kn = id => T.S.known.includes(id);
  if (Object.keys(PX.cards).filter(f => PX.cards[f].biome === 'b2').some(f => !kn(f))) fail('демо: не все враги пройденного биома 2 изучены');
  if (Object.keys(PX.cards).filter(f => PX.cards[f].biome === 'b4').some(kn)) fail('демо: враги закрытого биома 4 уже изучены');
  if (kn('b3b1') || kn('b3g1') || !kn('b3o1')) fail('демо: на рубеже 3 босс и страж должны быть неизвестны, первые рядовые — изучены');
  if (T.S.foes.filter(f => !f.biome).length !== 14) fail('демо: карточки Мастерской пропали или задвоились');
  if (T.S.foes.length !== 14 * 4) fail(`демо: карточек бестиария ${T.S.foes.length}, нужно 56`);
  for (const f of T.S.foes.filter(x => !x.biome)) if (PX.workshop[f.id] && (f.hp !== PX.workshop[f.id].hp || f.bm !== PX.workshop[f.id].bm)) fail(`бестиарий: у ${f.id} Мастерской числа не из ядра`);

  /* 8–9. «Спуск» каждого биома; арт — выгруженный или заглушка */
  for (const team of [false, true]) {
    T.setTeam(team);
    for (const id of ['b1', 'b2', 'b3', 'b4']) {
      reset(); T.S.route = 'descent'; T.S.selBiome = id;
      const key = `Спуск · ${id} · ${team ? 'команда' : 'игрок'}`, h = draw(key);
      if (!team) serviceIn(key, h);
      const nav = h.match(new RegExp(`<button class="bnode[^"]*" data-a="biome" data-v="b4"[^>]*>`));
      if (!nav) fail(`${key}: нет узла биома 4`);
      else if (team === /disabled/.test(nav[0])) fail(`${key}: узел закрытого биома 4 ${team ? 'закрыт для команды' : 'открыт игроку'}`);
      if (!h.includes(`src="${T.ARENAS[id] || ''}"`)) fail(`${key}: шапка — не арена своего биома`);
      const figs = [...h.matchAll(/data-a="foe" data-v="([^"]+)"/g)].map(m => m[1]);
      const mine = T.S.foes.filter(f => (f.biome || 'b1') === id).map(f => f.id);
      if (figs.length !== 14 || figs.some(f => !mine.includes(f))) fail(`${key}: на полках ${figs.length} врагов, чужие: ${figs.filter(f => !mine.includes(f)).join(', ')}`);
      if (!/data-a="guard"/.test(h) || !/data-a="sheet" data-v="prep"/.test(h)) fail(`${key}: нет входа к стражу или «Начать забег»`);
      if (id === 'b4' && !/class="team-only chip warn"/.test(h)) fail(`${key}: у закрытого биома нет пометки команде`);
      for (const f of figs) {   // карточка врага: лист, картинка — файл из готовых или заглушка
        const c = T.F(f), url = T.FA(c);
        if (!(url.startsWith('data:image/svg+xml,') || READY.has(`foes/${f}.jpg`) && url === T.AV(`foes/${f}.jpg`) || !c.biome)) fail(`${key}: у ${f} адрес портрета «${url.slice(0, 60)}» — не выгруженный и не заглушка`);
      }
    }
  }
  T.setTeam(false);
  for (const id of ['b2', 'b3', 'b4']) {
    const a = T.ARENAS[id];
    if (!(a.startsWith('data:image/svg+xml,') && !READY.has(`arena-${id}.jpg`) || READY.has(`arena-${id}.jpg`) && a === T.AV(`arena-${id}.jpg`))) fail(`${id}: арена — не выгруженная и не заглушка`);
  }
  {   // без готовности — заглушка: портрет и арена
    const f = 'b3o1', had = READY.has(`foes/${f}.jpg`); READY.delete(`foes/${f}.jpg`);
    const c = T.BU.cardOf(f); if (!c.art.startsWith('data:image/svg+xml,')) fail('арт: без готовности портрет — не заглушка');
    if (!/viewBox="0 0 464 576"/.test(decodeURIComponent(c.art))) fail('арт: заглушка портрета не 464×576');
    if (!/viewBox="0 0 1688 716"/.test(decodeURIComponent(T.BU.stubArena('b3')))) fail('арт: заглушка арены не 1688×716');
    if (had) READY.add(`foes/${f}.jpg`);
  }

  /* 10. забег и бой — на арене и с врагами своего биома; итог — тексты своего биома */
  for (const id of ['b2', 'b3', 'b4']) {
    reset(); T.S.route = 'descent'; T.S.selBiome = id; T.S.prepSquad = 's1';
    T.ACT.start();
    const R = T.S.runs[T.S.runs.length - 1], key = `забег · ${id}`;
    if (!R || R.biome !== id || T.S.route !== 'battle') { fail(`${key}: «Начать забег» не начал забег в своём биоме`); continue; }
    let h = draw(key + ' · бой');
    if (!h.includes(`src="${T.ARENAS[id]}"`)) fail(`${key}: фон боя — не арена биома`);
    if (R.b.u[1].some(u => !u.id.startsWith(id))) fail(`${key}: в бою чужие враги`);
    serviceIn(key + ' · бой', h);
    T.S.route = 'descent'; play(R, key);
    T.S.overlay = { t: 'result', arg: R.id }; h = draw(key + ' · итог'); serviceIn(key + ' · итог', h);
    if (T.S.lastRun[id] == null) fail(`${key}: итог не записан в прошлый забег биома`);
    // тексты своего биома в итоге босса и стража
    for (const [kind, want] of [['boss', T.BIOME_UI[id].boss[0]], ['guardWin', T.BIOME_UI[id].guardWin[0]], ['guardLose', T.BIOME_UI[id].guardLose]]) {
      R.end = { kind, why: 'sand', rounds: 20 }; T.S.overlay = { t: 'result', arg: R.id };
      h = draw(`${key} · итог ${kind}`);
      if (!h.includes(want)) fail(`${key}: в итоге «${kind}» нет «${want}»`);
      if (kind === 'guardWin' && id === 'b2' && !h.includes('Виал — это только начало')) fail('итог стража биома 2: нет слова Этриона (ADR-0018)');
      if (kind === 'guardWin' && id !== 'b2' && h.includes('Виал — это только начало')) fail(`${key}: слово Этриона не на своём биоме`);
    }
  }

  /* 11. рунный страж со «Спуска» */
  reset(); T.S.route = 'descent'; T.S.selBiome = 'b2'; T.S.prepSquad = 's1';
  let h = draw('Спуск · b2 · страж');
  if (/data-a="guard" disabled/.test(h)) fail('страж биома 2: у пройденного биома вход закрыт');
  T.ACT.guard('');
  let R = T.S.runs[T.S.runs.length - 1];
  if (!R || !R.guard || R.biome !== 'b2') fail('страж биома 2: вход не начал бой со стражем своего биома');
  else {
    if (R.b.u[1][0].id !== 'b2g1' || R.b.u[1].length !== 5) fail('страж биома 2: не Отголосок Виала и четыре элиты');
    h = draw('страж биома 2 · бой'); if (!h.includes('удар стража') || !h.includes(`/ ${T.EB.RULES.rounds.rune}`)) fail('страж биома 2: не видно, что удар стража отнимает раунд');
    T.S.route = 'descent'; play(R, 'страж биома 2');
  }
  reset(); T.S.route = 'descent'; T.S.selBiome = 'b3';
  h = draw('Спуск · b3 · страж');
  if (!/data-a="guard"[^>]*disabled/.test(h)) fail('страж биома 3: вход открыт до босса');
  T.ACT.guard(''); if (T.S.runs.length) fail('страж биома 3: впустил до босса');
  T.ACT.guard('demo'); R = T.S.runs[T.S.runs.length - 1];
  if (!R || !R.guard || R.biome !== 'b3' || R.b.u[1][0].id !== 'b3g1') fail('страж биома 3: демо-вход не начал бой с Провидцем');

  /* 12. бестиарий по биомам */
  for (const team of [false, true]) {
    T.setTeam(team); reset(); T.S.route = 'chronicle'; T.S.lore = { sec: 'best', foe: 'b2o1' };
    h = draw(`Летопись · ${team ? 'команда' : 'игрок'}`);
    for (const id of ['b1', 'b2', 'b3', 'b4']) {
      const nm = T.S.biomes.find(b => b.id === id).name, seen = h.includes(`<span class="eyebrow">${nm} · цикл`);
      if (seen !== (id !== 'b4' || team)) fail(`Летопись: раздел «${nm}» ${seen ? 'виден' : 'не виден'} ${team ? 'команде' : 'игроку'}`);
    }
    if (!team) serviceIn('Летопись', h);
  }
  T.setTeam(false);
  for (const f of ['b2o2', 'b2o1', 'b3b1', 'b4g1']) {
    reset(); T.S.known.push(f); T.S.route = 'descent'; T.S.selBiome = PX.cards[f].biome; T.S.overlay = { t: 'foe', arg: f };
    h = draw(`лист врага ${f}`); serviceIn(`лист врага ${f}`, h);
    const tip = PX.cards[f].tip;
    if (tip && !h.includes(tip)) fail(`лист ${f}: нет совета старика из записи сказителя`);
    if (!tip && h.includes('Совет старика')) fail(`лист ${f}: совет старика без записи сказителя`);
    if (!h.includes(PX.foes[f].name)) fail(`лист ${f}: нет имени`);
  }
  reset(); T.S.route = 'descent'; T.S.selBiome = 'b4'; T.S.overlay = { t: 'foe', arg: 'b4b1' };
  h = draw('лист неизвестного врага'); if (h.includes('Глава города') || !h.includes('Неизвестный противник')) fail('лист неизвестного врага раскрывает имя');

  /* 13. сценарии презентации */
  for (const id of ['b2', 'b3', 'b4']) {
    const nm = PX.biomes[id].core.name;
    for (const [suffix, guard] of [['быстрый бой', false], ['рунный страж', true]]) {
      const fl = T.FLOWS.find(x => x[0] === `${nm} · ${suffix}`);
      if (!fl) { fail(`сценарий «${nm} · ${suffix}» не найден`); continue; }
      reset(); fl[2]();
      R = T.S.runs[T.S.runs.length - 1];
      if (!R || R.biome !== id || !!R.guard !== guard || (!guard && R.floor !== PX.biomes[id].ui.demoFloor)) fail(`сценарий «${fl[0]}» начал не тот бой`);
      else { draw(`сценарий ${fl[0]}`); T.S.route = 'descent'; play(R, `сценарий ${fl[0]}`); }
    }
  }
  if (!T.FLOWS.find(x => x[0].startsWith('Рунный страж')).toString().length) fail('сценарий стража Мастерской пропал');

  /* 14. раздел UI-кита */
  try { T.renderKit(); const k = els.kitGrid ? els.kitGrid.innerHTML : ''; scan('UI-кит', k); if (!k.includes('Биомы спуска') || BIO.some(id => !k.includes(PX.biomes[id].core.name))) fail('UI-кит: нет раздела «Биомы спуска» или биома в нём'); } catch (e) { fail('UI-кит: ' + e.message); }
} catch (e) { fail('прототип: исключение — ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
done();
