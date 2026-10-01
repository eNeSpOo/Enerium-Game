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
   7. Темп — главные утверждения прогона: пара первого биома и четверо не берут босса биома 2, первая полная пачка на 50-м (доблесть бойца — руна обучения)
      берёт и босса, и стража; биомы 3–4 — стена на 150-м, всё пройдено на 525-м; прогон темпа pace.json сделан на этих данных.
   Прототип (index.html и screens/*.js в песочнице, как check_echo_battle.js):
   8. Окно «Спуск» (screens/descent.js) на каждом биоме и в обоих режимах: фон — арт своего биома (место и обитатели), а не арена;
      сетки портретов обитателей нет — строка «Изучено N из M» и кнопка «Бестиарий»; путь вниз по циклам — закрытый биом игрок
      не выбирает, команда — может; состояние: этажи, босс, рунный страж; одно главное действие; идущий забег — «К бою» и «Ещё отряд»;
      частицы — свои у каждого биома, целые, не больше потолка, при «меньше движения» их нет; CSS — только transform и opacity;
      смена биома — прежний фон гаснет поверх нового; демо открывает «Спуск» на рубеже.
      Бестиарий — лист OV.dsbest: 14 обитателей своего биома по полкам, неизученные без имени, карточка — с возвратом к списку,
      «В Летописи» — книга на враге этого биома. Фоны выгружены и стоят в tools/art-gen/ui-art.json.
   8б. «Спуск» на уровне AAA (слова автора 01.10.2026) — законы descent_laws.js, каждый проверен мутацией: путь вниз со слотами биомов
      и медальонами биомов; путь внутри биома тремя камнями, вход к стражу — в его строке; метка состояния; одна главная кнопка с отрядом
      и мощью, заняты слоты — закрыта с причиной; лист «Отряд для спуска» в материале окна; толщины нитей и рамок — из данных (SHL_VIEW);
      состояния различимы; окно помещается на 932 × 430 и 844 × 390.
   9. Арт: портрет и арена — выгруженный файл из списка готовых или заглушка data:, битых адресов нет; без готовности — заглушка.
   10. Забег и бой — на арене и с врагами своего биома; итог забега — тексты своего биома, после стража биома 2 — слово Этриона.
   11. Рунный страж: у пройденного биома 2 вход открыт, у рубежа 3 — после босса, демо-вход — всегда; удар стража отнимает раунд.
   12. Бестиарий по биомам: Летопись группирует врагов по биомам, закрытый — только команде; у кого нет записи сказителя —
       облик без совета старика; числа карточек — ядро на этаже первой встречи.
   13. Демо-аккаунт: 1–2 пройдены, 3 — рубеж, 4 закрыт; у биома 4 есть имя. Сценарии презентации — быстрый бой и страж каждого биома.
   14. Режим «Игрок»: на экранах биомов нет служебных слов (strip и SERVICE из check_player_view.js); разделы UI-кита
       «Биомы спуска» и «Окно «Спуск»» рисуются.
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
  console.log(`Биомы 2–4: боёв ядра ${out.battles}, забегов прототипа ${out.runs}, отрисовок ${out.views}, уникальных способностей сработало ${out.uniques}; законы фарма поймали поломок ${out.mut || '—'}.`);
  if (out.ds) console.log(`«Спуск» AAA: законов сверено ${out.ds.laws}, мутаций поймано ${out.ds.mut}; ${(out.dsNote || []).join('; ')}.`);
  console.log('Проверка пройдена: данные и ядро биомов 2–4, темп, «Спуск», арены и портреты, забег, страж, бестиарий и сценарии — без исключений, undefined и NaN; фарм старых биомов — ритуал этажа, полные биомы 1–2 с цикла II, рунный ключ с каждого босса, уникальный реже, артефакты в добыче.');
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
      /* босс биома с осадой берётся за несколько забегов (ADR-0031: у биома 4 — около 20 на 350-м): добычу этажа босса проверяем в последней
         попытке осады — босс приходит с десятой долей здоровья */
      const sg = f === B.floors.length && B.siege !== false ? Math.max(1, Math.floor(EB.floorBattle(hs, id, f, null, 'rounds').u[1][0].maxHp / 10)) : null;
      const b = EB.run(EB.floorBattle(hs, id, f, sg, 'rounds')); out.battles++;
      const b2 = EB.run(EB.floorBattle(hs.slice().reverse(), id, f, sg, 'rounds')); out.battles++;
      // раунды этажа — таблица ядра по старшему врагу колоды (слово автора 29.09.2026): рядовые 5, элита 10, босс 20
      if (b.maxRounds !== EB.RULES.rounds.by[B.floors[f - 1].g]) fail(`${id} · этаж ${f}: раундов ${b.maxRounds}, по таблице ядра — ${EB.RULES.rounds.by[B.floors[f - 1].g]}`);
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
    /* осада (слово автора 29.09.2026): босс приходит с остатком здоровья — остаток и есть его максимум в забеге, прежний — max0 */
    if (B.siege !== false) {
      const last = B.floors.length, full = EB.floorBattle(hs, id, last, null, 'rounds').u[1][0], left = Math.floor(full.maxHp / 3);
      const sg = EB.floorBattle(hs, id, last, left, 'rounds').u[1][0];
      if (sg.hp !== left || sg.maxHp !== left || sg.max0 !== full.maxHp) fail(`${id}: босс в осаде — ${sg.hp} / ${sg.maxHp} (прежний ${sg.max0}), а остаток ${left} из ${full.maxHp}`);
    }
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
  /* полная пачка — реальный отряд (ADR-0031, п. 1): у бойца урона доблесть от руны обучения, она приходит во втором биоме (уровень 7
     Странника, сценарий «Старт с чистого листа»); пара и четверо — без неё, строже */
  const full = PACK.map(h => S0.hero(h, 50, S0.SQUAD.find(x => x.id === h).valor));
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

/* ================== 15. фарм старых биомов (ADR-0044) — законы ядра ==================
   Каждый закон — функция (tag) → список нарушений: её же зовёт проверка мутацией (раздел 16).
   Р — ритуал этажа: время взятого этажа ядра — max(бой, минимум своего вида), проигранного — бой; сверхсильный отряд проходит всё,
       и у этажа с одним врагом ритуал добавляет время — удар насмерть не короче ритуала.
   В — варианты: короткие биомы 1–2 — только в цикле I; с цикла II — полные (35 этажей, 12 элит, осада, страж — рунный и четыре элиты,
       здоровье без поправок обучения); id биома один, вариант ставит atCycle, variantOf — та же запись.
   К — рунный ключ с каждого босса биома с шансом: с цикла II, частота — шанс ядра (тот же, что в recipes.js), ключей — цикл биома;
       отмычки Странника поднимают шанс ровно до потолка, выше потолка — нет; с элит и в цикле I — никогда.
   У — уникальный босса в старом биоме реже: доля обычного шанса меньше 100 %, частота в старом — доля от частоты в своём.
   А — артефакты Странника в добыче: у каждого артефакта с примитивом добычи ядро его знает; золото, дух, души с босса, верхняя граница
       базовых, шансы рунного ключа и уникального — сдвигаются ровно на прибавку. */
globalThis.window = globalThis; require(path.join(UI, 'wanderer.js'));
const WNA = globalThis.EN_WANDERER && globalThis.EN_WANDERER.art;
const FARM_N = 4000;   // бросков на частоту: при 10 % три сигмы — около 1,4 п. п.
const strongSq = (k, L) => S0.SQUAD.map(h => EB.heroSrcValor(Object.assign({}, h, { lvl: L, valor: h.valor, cycle: k })));
/* бой с павшим боссом последнего этажа — без героев (без фарм-пассивок): только добыча ядра */
function bossDown(id) {
  const B = EB.BIOMES[id], b = EB.create({ mode: 'rounds', seed: 1, heroes: [], foes: EB.floorFoes(id, B.floors.length, null) });
  b.win = true; b.over = true; for (const u of b.u[1]) { u.alive = false; u.hp = 0; }
  return b;
}
/* частота: сколько раз из FARM_N бросков сработало, б. п.; этаж — сид потока добычи (за последним этажом биома — свой сид на каждый бросок) */
function freqBp(id, b, X0, key) {
  let hit = 0, sum = 0; const off = EB.BIOMES[id].floors.length + 1000;
  for (let i = 0; i < FARM_N; i++) { const L = EB.floorLoot(id, off + i, b, X0); if (L[key] > 0) { hit++; sum += L[key]; } }
  return { bp: Math.floor(hit * 10000 / FARM_N), per: hit ? sum / hit : 0 };
}
function lawRitual(tag) {
  const o = [], F = EB.RULES.floor, was = EB.cycleAt();
  for (const k of ['minMs', 'tutMs']) {
    const X = F[k];
    if (!X || ['o', 'e', 'b', 'guard'].some(g => !Number.isInteger(X[g]) || X[g] <= 0)) return [`${tag}: RULES.floor.${k} — нет целого минимума по видам o, e, b, guard`];
  }
  try {
    for (const c of [1, 2]) {
      EB.atCycle(c);
      for (const id of ['b1', 'b2', 'b3']) {
        /* минимум этажа — ritualOf ядра: короткий вариант обучения (цикл I) — tutMs, прежний ритуал; полные варианты и прочие биомы — minMs */
        const B = EB.BIOMES[id], M = EB.ritualOf(B), want = B.full && B.variant === 'tut' ? F.tutMs : F.minMs;
        if (M !== want) o.push(`${tag}: ${id} · цикл ${c}: ритуал этажа — ${JSON.stringify(M)}, а по варианту «${B.variant || 'один'}» — ${JSON.stringify(want)}`);
        if (c === 1 && id !== 'b3' && M !== F.tutMs) o.push(`${tag}: ${id} · цикл I: в обучении ритуал не прежний (RULES.floor.tutMs)`);
        if (c > 1 && M !== F.minMs) o.push(`${tag}: ${id} · цикл ${c}: ритуал этажа не RULES.floor.minMs`);
        let cur = strongSq(6, 1200), padded = 0;
        for (let f = 1; f <= B.floors.length; f++) {
          const g = B.floors[f - 1].g, b = EB.run(EB.floorBattle(cur, id, f, null, 'rounds'));
          if (!b.win) { o.push(`${tag}: ${id} · цикл ${c}: сверхсильный отряд не взял ${f}-й этаж`); break; }
          if (b.t !== Math.max(b.fightMs, M[g]) || b.ritualMs !== b.t - b.fightMs) { o.push(`${tag}: ${id} · цикл ${c} · ${f}-й этаж (${g}): бой ${b.fightMs}, этаж ${b.t}, минимум ${M[g]}`); break; }
          if (b.ritualMs > 0) padded++;
          cur = EB.carry(cur, b);
        }
        if (!padded) o.push(`${tag}: ${id} · цикл ${c}: ни один этаж удара насмерть не дотянут до ритуала`);
        const gb = EB.run(EB.guardBattle(strongSq(6, 1200), id, 'rounds'));
        if (!gb.win || gb.t !== Math.max(gb.fightMs, M.guard)) o.push(`${tag}: ${id} · цикл ${c} · страж: бой ${gb.fightMs}, время ${gb.t}, минимум ${M.guard}`);
      }
      /* проигранный этаж — время боя, ритуала нет */
      const lost = EB.run(EB.floorBattle(S0.SQUAD.map(h => S0.hero(h.id, 1, 0)), 'b3', 35, null, 'rounds'));
      if (lost.win || lost.t !== lost.fightMs || lost.ritualMs) o.push(`${tag}: проигранный этаж дотянут до ритуала — бой ${lost.fightMs}, время ${lost.t}`);
    }
  } finally { EB.atCycle(was); }
  return o;
}
function lawVariant(tag) {
  const o = [], was = EB.cycleAt(), keys = Object.keys(EB.BIOMES).join();
  const tut = { b1: EB.FLOORS_TUTOR, b2: X.biomes.b2.core.floors };
  try {
    for (const c of [1, 2, 3, 6]) {
      EB.atCycle(c);
      for (const id of ['b1', 'b2']) {
        const B = EB.BIOMES[id], V = EB.variantOf(id, c), full = B.full;
        if (!full) { o.push(`${tag}: у ${id} нет полного варианта`); continue; }
        if (V.floors !== B.floors || V.variant !== B.variant) o.push(`${tag}: ${id} · цикл ${c}: variantOf и atCycle дают разное`);
        if (c === 1) {
          if (B.variant !== 'tut' || JSON.stringify(B.floors) !== JSON.stringify(tut[id]) || B.siege !== false) o.push(`${tag}: ${id} в цикле I — не короткий обучающий (${B.floors.length} этажей, осада ${B.siege})`);
          continue;
        }
        const el = B.floors.reduce((a, F) => a + F.m.filter(m => EB.FOES[m].rank === 'e').length, 0);
        if (B.variant !== 'full' || B.floors.length !== EB.FLOORS.length || el !== 12 || B.siege !== true) o.push(`${tag}: ${id} в цикле ${c} — не полный: ${B.floors.length} этажей, ${el} элит, осада ${B.siege}`);
        if (B.floors.some(F => F.m.length > 5) || B.floors[B.floors.length - 1].g !== 'b') o.push(`${tag}: ${id} в цикле ${c}: колода полного варианта — больше пяти врагов или босс не последним`);
        if (B.guard.m.length !== 5 || EB.FOES[B.guard.m[0]].rank !== 'rune' || B.guard.m.slice(1).some(m => EB.FOES[m].rank !== 'e')) o.push(`${tag}: ${id} в цикле ${c}: страж — не рунный босс и четыре элиты`);
        if (B.foeHpPct || B.bossHpPct || !(B.guardHpPct > (B.tut.guardHpPct || 0))) o.push(`${tag}: ${id} в цикле ${c}: силы обучения — враги ${B.foeHpPct}, босс ${B.bossHpPct}, страж ${B.guardHpPct}`);
      }
    }
    if (Object.keys(EB.BIOMES).join() !== keys) o.push(`${tag}: переключение варианта завело новый id биома`);
  } finally { EB.atCycle(was); }
  return o;
}
function lawRuneKey(tag) {
  const o = [], D = EB.RULES.drop.b, was = EB.cycleAt();
  try {
    EB.atCycle(2);
    for (const id of ['b1', 'b2', 'b3', 'b4']) {
      const e = RX.drops.enemies.find(x => x.biome === id);
      if (!e || e.boss.runeKeyBp !== D.runeKeyBp) o.push(`${tag}: ${id}: шанс рунного ключа ядра ${D.runeKeyBp} б. п., в recipes.js — ${e && e.boss.runeKeyBp}`);
    }
    const lock = WNA ? EB.lootArt(WNA.list.filter(a => a.loot === 'runeKeyPp').map(a => ({ loot: a.loot, step: a.step, lv: a.lv }))) : {};
    if (D.runeKeyBp + (lock.runeKeyBp || 0) !== D.runeKeyMaxBp) o.push(`${tag}: шанс ${D.runeKeyBp} б. п. и все отмычки (${lock.runeKeyBp || 0}) — не потолок ${D.runeKeyMaxBp} (§11: 10 % → 25 %)`);
    const tol = 250;
    for (const id of ['b1', 'b3']) {
      const b = bossDown(id), B = EB.BIOMES[id];
      const none = [freqBp(id, b, 0, 'runeKeys'), freqBp(id, b, { cyc: 1 }, 'runeKeys')];
      if (none.some(x => x.bp)) o.push(`${tag}: ${id}: рунный ключ в цикле I или без цикла игрока — ${none.map(x => x.bp).join(' / ')} б. п.`);
      const base = freqBp(id, b, { cyc: 2 }, 'runeKeys');
      if (Math.abs(base.bp - D.runeKeyBp) > tol || base.per !== B.cycle) o.push(`${tag}: ${id}: с цикла II ключ — ${base.bp} б. п. по ${base.per}, а шанс ${D.runeKeyBp}, ключей — цикл биома ${B.cycle}`);
      const lk = freqBp(id, b, { cyc: 2, art: lock }, 'runeKeys');
      if (Math.abs(lk.bp - Math.min(D.runeKeyMaxBp, D.runeKeyBp + (lock.runeKeyBp || 0))) > tol || lk.bp <= base.bp + tol) o.push(`${tag}: ${id}: отмычки не подняли шанс — ${base.bp} → ${lk.bp} б. п.`);
      const over = freqBp(id, b, { cyc: 2, art: { runeKeyBp: 9000 } }, 'runeKeys');
      if (over.bp > D.runeKeyMaxBp + tol) o.push(`${tag}: ${id}: шанс выше потолка — ${over.bp} б. п. при потолке ${D.runeKeyMaxBp}`);
    }
    /* с элит — никогда: этаж элиты, павшие — элиты */
    const B1 = EB.BIOMES.b1, ef = B1.floors.findIndex(F => F.g === 'e') + 1, be = EB.create({ mode: 'rounds', seed: 1, heroes: [], foes: EB.floorFoes('b1', ef, null) });
    be.win = true; for (const u of be.u[1]) { u.alive = false; u.hp = 0; }
    if (freqBp('b1', be, { cyc: 2, art: lock }, 'runeKeys').bp) o.push(`${tag}: рунный ключ падает с элиты`);
  } finally { EB.atCycle(was); }
  return o;
}
function lawUnique(tag) {
  const o = [], D = EB.RULES.drop.b, was = EB.cycleAt(), tol = 120;
  if (!(D.uniqueOldPct > 0 && D.uniqueOldPct < 100)) o.push(`${tag}: доля уникального в старом биоме ${D.uniqueOldPct} % — не «ниже обычного»`);
  try {
    EB.atCycle(3);
    for (const [id, own, old] of [['b1', 1, 2], ['b3', 2, 3]]) {
      const b = bossDown(id), a = freqBp(id, b, { cyc: own }, 'unique').bp, z = freqBp(id, b, { cyc: old }, 'unique').bp;
      const want = Math.floor(D.uniqueBp * D.uniqueOldPct / 100);
      if (Math.abs(a - D.uniqueBp) > tol || Math.abs(z - want) > tol || z >= a) o.push(`${tag}: ${id}: уникальный в своём цикле ${a} б. п., в старом ${z}, а нужно ${D.uniqueBp} и ${want}`);
    }
  } finally { EB.atCycle(was); }
  return o;
}
function lawArt(tag) {
  const o = [], T = EB.RULES.drop.art;
  if (!WNA) return [`${tag}: нет design/ui/wanderer.js — артефактов Странника`];
  const withLoot = WNA.list.filter(a => a.loot);
  for (const a of withLoot) if (!T[a.loot]) o.push(`${tag}: артефакт «${a.n}»: примитив добычи «${a.loot}» ядру незнаком`);
  if (withLoot.length < 7) o.push(`${tag}: артефактов с примитивом добычи ${withLoot.length} — кошель, сосуд, чаша, отмычки, чутьё, ларцы потерялись`);
  const was = EB.cycleAt();
  try {
    EB.atCycle(2);
    const b = bossDown('b1'), off = EB.BIOMES.b1.floors.length + 7, x0 = EB.floorLoot('b1', off, b, { cyc: 2 });
    const lv = { goldPct: ['a4', 6], spiritPct: ['a5', 6], bossSouls: ['a6', 5], baseMaxE: ['a3', 6] };
    const A = EB.lootArt(withLoot.map(a => ({ loot: a.loot, step: a.step, lv: a.lv })));
    const x1 = EB.floorLoot('b1', off, b, { cyc: 2, art: A });
    const step = id => (WNA.list.find(a => a.id === id) || {});
    const g = step('a4'), s = step('a5'), c = step('a6'), e = step('a3');
    if (x1.gold !== Math.floor(x0.gold * (100 + g.step * g.lv) / 100)) o.push(`${tag}: «${g.n}» на ${g.lv}-м: золото ${x0.gold} → ${x1.gold}`);
    if (x1.spirit !== Math.floor(x0.spirit * (100 + s.step * s.lv) / 100)) o.push(`${tag}: «${s.n}» на ${s.lv}-м: дух ${x0.spirit} → ${x1.spirit}`);
    if (x1.souls !== x0.souls + c.step * c.lv) o.push(`${tag}: «${c.n}» на ${c.lv}-м: души с босса ${x0.souls} → ${x1.souls}`);
    if (x1.baseMax !== EB.BIOMES.b1.n + e.step * e.lv) o.push(`${tag}: «${e.n}» на ${e.lv}-м: верхняя граница базовых ${x1.baseMax}`);
    const u0 = freqBp('b1', b, { cyc: 1 }, 'unique').bp, u1 = freqBp('b1', b, { cyc: 1, art: EB.lootArt([{ loot: 'uniquePp', step: 3, lv: 3 }]) }, 'unique').bp;
    if (u1 < u0 + 600) o.push(`${tag}: «Чутьё старьёвщика» не подняло шанс уникального — ${u0} → ${u1} б. п.`);
    void lv;
  } finally { EB.atCycle(was); }
  return o;
}
const FARM_LAWS = [['ритуал', lawRitual], ['варианты', lawVariant], ['рунный ключ', lawRuneKey], ['уникальный', lawUnique], ['артефакты', lawArt]];
try {
  for (const [, law] of FARM_LAWS) for (const e of law('фарм')) fail(e);
  if (!X.farm || X.farm.sig !== X.rules.sig) fail('фарм: в biome-foes.js нет калькулятора фарма на этих данных — python tools/content-gen/biomes/farm.py, затем build.js');
  else for (const v of X.farm.verdict || []) if (!v.ok) fail(`фарм: «${v.what}» — ${v.got}, цель — ${v.goal}`);
  if (X.farm && ['o', 'e', 'b', 'guard'].some(k => X.farm.minMs[k] !== EB.RULES.floor.minMs[k])) fail(`фарм: ритуал ядра ${JSON.stringify(EB.RULES.floor.minMs)}, калькулятор считал ${JSON.stringify(X.farm.minMs)}`);
} catch (e) { fail('фарм: исключение — ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }

/* ================== 16. проверка мутацией: законы фарма ловят поломки ================== */
const MUT = [];
function mutant(name, apply, revert, law) {
  let found = [];
  try { apply(); found = law('мутация') || []; } catch (e) { found = ['исключение: ' + e.message]; } finally { try { revert(); } catch (_) { } }
  MUT.push([name, found.length > 0]);
  if (process.argv.includes('--mut')) console.log(`мутация «${name}»: ${found.length ? found.slice(0, 2).join(' | ').slice(0, 300) : 'НЕ ПОЙМАНА'}`);
}
{
  const R = EB.RULES, fb0 = EB.floorBattle, mm0 = Object.assign({}, R.floor.minMs), d0 = Object.assign({}, R.drop.b), art0 = R.drop.art, from0 = EB.BIOMES.b1.full.from;
  mutant('ритуал не соблюдён — этаж короче минимума', () => { EB.floorBattle = (...a) => { const b = fb0(...a); b.minMs = 0; return b; }; }, () => { EB.floorBattle = fb0; }, lawRitual);
  mutant('ритуал рядовых — ноль', () => { R.floor.minMs.o = 0; }, () => { Object.assign(R.floor.minMs, mm0); }, lawRitual);
  mutant('короткий биом 1 и в цикле II', () => { EB.BIOMES.b1.full.from = 7; }, () => { EB.BIOMES.b1.full.from = from0; }, lawVariant);
  mutant('рунный ключ и в цикле I', () => { R.drop.b.runeKeyFrom = 1; }, () => { Object.assign(R.drop.b, d0); }, lawRuneKey);
  mutant('рунный ключ без шанса', () => { R.drop.b.runeKeyBp = 0; }, () => { Object.assign(R.drop.b, d0); }, lawRuneKey);
  mutant('отмычки не работают', () => { R.drop.art = Object.assign({}, art0, { runeKeyPp: ['nothing', 100] }); }, () => { R.drop.art = art0; }, lawRuneKey);
  mutant('потолок шанса снят', () => { R.drop.b.runeKeyMaxBp = 10000; }, () => { Object.assign(R.drop.b, d0); }, lawRuneKey);
  mutant('уникальный в старом биоме — как в своём', () => { R.drop.b.uniqueOldPct = 100; }, () => { Object.assign(R.drop.b, d0); }, lawUnique);
  mutant('уникальный в старом биоме — чаще', () => { R.drop.b.uniqueOldPct = 150; }, () => { Object.assign(R.drop.b, d0); }, lawUnique);
  mutant('артефакты не в добыче', () => { R.drop.art = {}; }, () => { R.drop.art = art0; }, lawArt);
  const caught = MUT.filter(m => m[1]).length;
  for (const [n, ok] of MUT) if (!ok) fail(`проверка мутацией: поломку «${n}» законы фарма не поймали`);
  out.mut = `${caught} из ${MUT.length}`;
}

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
/* <html>: флаги «арт загружен» и переменные (--shl-*, --sh-*) — их читает каскад законов «Спуска» (descent_laws.js) */
const rootCls = new Set(), rootVars = {}, rootEl = stubEl('html');
rootEl.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
rootEl.style = { setProperty: (k, v) => { rootVars[k] = v; } };
const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)), querySelector: () => null, querySelectorAll: () => [],
  createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'), documentElement: rootEl, activeElement: null, fonts: null, baseURI: 'file:///ui/index.html' };
const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 }, URL };
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
  BU: window.EN_BIOMES_UI, X: window.EN_BIOME_FOES, RX, gdCost, gdSame, DS: window.EN_DESCENT, bioFoes, known, lootCtx,
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
  if (!T.G('b1').killed || !T.G('b2').killed || T.G('b3').killed) fail('демо: у пройденных биомов 1–2 босс не пал или у рубежа 3 — уже пал');
  const kn = id => T.S.known.includes(id);
  if (Object.keys(PX.cards).filter(f => PX.cards[f].biome === 'b2').some(f => !kn(f))) fail('демо: не все враги пройденного биома 2 изучены');
  if (Object.keys(PX.cards).filter(f => PX.cards[f].biome === 'b4').some(kn)) fail('демо: враги закрытого биома 4 уже изучены');
  if (kn('b3b1') || kn('b3g1') || !kn('b3o1')) fail('демо: на рубеже 3 босс и страж должны быть неизвестны, первые рядовые — изучены');
  if (T.S.foes.filter(f => !f.biome).length !== 14) fail('демо: карточки Мастерской пропали или задвоились');
  if (T.S.foes.length !== 14 * 4) fail(`демо: карточек бестиария ${T.S.foes.length}, нужно 56`);
  for (const f of T.S.foes.filter(x => !x.biome)) if (PX.workshop[f.id] && (f.hp !== PX.workshop[f.id].hp || f.bm !== PX.workshop[f.id].bm)) fail(`бестиарий: у ${f.id} Мастерской числа не из ядра`);

  /* 8. окно «Спуск» (screens/descent.js) на каждом биоме, игроку и команде */
  const DS = T.DS;
  if (!DS) fail('окно «Спуск»: нет screens/descent.js (window.EN_DESCENT)');
  else {
    if (T.initialState().selBiome !== 'b3') fail(`демо: «Спуск» открывается не на рубеже, а на ${T.initialState().selBiome}`);
    const fxOf = h => { const m = h.match(/<div class="ds-fx" data-fx="([^"]+)">([\s\S]*?)<\/div>/); return m ? { key: m[1], ps: [...m[2].matchAll(/<i class="ds-p" data-k="([^"]+)" style="([^"]*)"><\/i>/g)] } : null; };
    for (const team of [false, true]) {
      T.setTeam(team);
      for (const id of ['b1', 'b2', 'b3', 'b4']) {
        reset(); T.S.route = 'descent'; T.S.selBiome = id;
        const key = `Спуск · ${id} · ${team ? 'команда' : 'игрок'}`, h = draw(key);
        if (!team) serviceIn(key, h);
        if (!h.startsWith('<') || !/<section class="scr flush ds" data-biome="/.test(h)) fail(`${key}: окно не нарисовано`);
        /* путь вниз: все биомы демо, закрытый — игроку выключен */
        for (const b of T.S.biomes) if (!new RegExp(`<button class="bnode ${b.state}" data-a="biome" data-v="${b.id}" aria-current="${b.id === id}"`).test(h)) fail(`${key}: на пути вниз нет узла ${b.id} или выбран не тот`);
        const nav = h.match(/<button class="bnode[^"]*" data-a="biome" data-v="b4"[^>]*>/);
        if (!nav) fail(`${key}: нет узла биома 4`);
        else if (team === /disabled/.test(nav[0])) fail(`${key}: узел закрытого биома 4 ${team ? 'закрыт для команды' : 'открыт игроку'}`);
        if (!/<div class="cyc dim ds-deep"><b>III–VI<\/b>/.test(h)) fail(`${key}: нераскрытая глубина — не одной строкой III–VI`);
        /* фон — арт своего биома, не арена */
        const art = DS.DS_DATA.art[id];
        if (!art || !h.includes(`<img class="ds-bg" src="${T.AV(art)}"`)) fail(`${key}: фон окна — не арт своего биома`);
        if (h.includes(T.ARENAS[id] || 'arena-')) fail(`${key}: в окне «Спуск» арена биома — ей место в бою`);
        /* обитатели: портретов в окне нет — строка «Изучено» и кнопка «Бестиарий» */
        const mine = T.bioFoes(id), k = mine.filter(f => T.known(f.id)).length;
        if (/data-a="foe"/.test(h) || /class="fig[ "]/.test(h) || /shelf/.test(h) || /\/foes\//.test(h)) fail(`${key}: в окне осталась сетка портретов обитателей`);
        if (!h.includes(`Изучено <b class="num">${k}</b> из ${mine.length}`)) fail(`${key}: нет строки «Изучено ${k} из ${mine.length}»`);
        if (!h.includes(`<button class="ds-best" data-a="sheet" data-v="dsbest:${id}" aria-label="Бестиарий: изучено ${k} из ${mine.length}">`)) fail(`${key}: нет кнопки «Бестиарий» с «изучено ${k} из ${mine.length}»`);
        /* состояние: этажи, босс, рунный страж */
        const B = T.EB.BIOMES[id], g = T.G(id);
        if (!h.includes(`<b>${B.floors.length}</b>`)) fail(`${key}: нет числа этажей`);
        if (!/class="ds-st (?:up|siege|down)"/.test(h) || !/class="ds-st (?:wait|open|done)"/.test(h)) fail(`${key}: нет состояния босса или стража`);
        if (g.killed !== /class="ds-st down"/.test(h)) fail(`${key}: босс ${g.killed ? 'пал' : 'стоит'}, а в состоянии — иначе`);
        /* главное действие: одно; закрытый биом — только команде; демо-вход к стражу — только команде */
        const open = id !== 'b4' || team;
        if (open !== /<button class="btn go big" data-a="sheet" data-v="prep">/.test(h)) fail(`${key}: «Начать забег» ${open ? 'нет' : 'доступно игроку в закрытом биоме'}`);
        if ((h.match(/class="btn go/g) || []).length !== 1) fail(`${key}: главных действий не одно`);
        if (!/<button class="btn sm ghost team-only" data-a="guard" data-v="demo"/.test(h)) fail(`${key}: демо-вход к стражу не только команде`);
        if (g.killed !== /<button class="btn sm" data-a="guard" data-v="gd\d+"/.test(h)) fail(`${key}: вход к стражу ${g.killed ? 'закрыт после босса' : 'открыт до босса'}`);
        if (id === 'b4' && !/class="team-only chip warn"/.test(h)) fail(`${key}: у закрытого биома нет пометки команде`);
        /* частицы своего биома: виды из DS_FX, не больше потолка, числа целые */
        const fx = fxOf(h), want = (DS.DS_FX[id] || []).map(x => x[0]).sort().join();
        if (!fx || fx.key !== id || !fx.ps.length || fx.ps.length > DS.DS_VIEW.maxFx) fail(`${key}: частицы — ${fx ? fx.key + ' · ' + fx.ps.length : 'нет'}`);
        else {
          if ([...new Set(fx.ps.map(m => m[1]))].sort().join() !== want) fail(`${key}: виды частиц ${[...new Set(fx.ps.map(m => m[1]))].join(', ')}, у биома — ${want}`);
          if (fx.ps.some(m => /\d\.\d/.test(m[2]))) fail(`${key}: у частиц не целые числа`);
        }
      }
    }
    T.setTeam(false);
    /* одни и те же частицы при каждой отрисовке: раскладка — на сиде биома */
    reset(); T.S.route = 'descent'; T.S.selBiome = 'b2';
    { const a = draw('Спуск · частицы · 1'), b = draw('Спуск · частицы · 2'); if (JSON.stringify(fxOf(a)) !== JSON.stringify(fxOf(b))) fail('частицы: раскладка меняется от отрисовки к отрисовке'); }
    /* «меньше движения» — частиц нет */
    {
      const mm = ctx.matchMedia; ctx.matchMedia = q => ({ matches: /reduce/.test(q), addEventListener() {}, addListener() {} });
      const h = draw('Спуск · меньше движения');
      if (/class="ds-p"/.test(h)) fail('частицы: при prefers-reduced-motion они есть');
      if (!/<img class="ds-bg" src=/.test(h)) fail('меньше движения: пропал фон');
      ctx.matchMedia = mm;
    }
    /* CSS окна: движется только transform и opacity; «меньше движения» гасит частицы и дрейф фона */
    {
      const css = read('screens/descent.css').replace(/\r?\n/g, ' ');
      for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
        const props = [...m[2].matchAll(/([a-z-]+)\s*:/g)].map(x => x[1]).filter(p => p !== 'transform' && p !== 'opacity');
        if (props.length) fail(`descent.css: @keyframes ${m[1]} двигает не только transform и opacity — ${props.join(', ')}`);
      }
      const rm = (css.match(/@media \(prefers-reduced-motion:reduce\)\{(.*?)\}\s*\}/) || [])[1] || '';
      if (!/\.ds-fx[^{]*\{display:none\}/.test(rm) || !/\.ds-bg[^{]*\{animation:none/.test(rm)) fail('descent.css: при «меньше движения» частицы или дрейф фона не выключены');
      if (html.indexOf('href="screens/descent.css"') < 0 || html.indexOf('href="screens/descent.css"') > html.indexOf('href="screens/echo.css"')) fail('index.html: descent.css не подключён или грузится после echo.css');
      if (html.indexOf('src="screens/descent.js"') < 0 || html.indexOf('src="screens/descent.js"') > html.indexOf('src="screens/echo.js"')) fail('index.html: descent.js не подключён или грузится после echo.js');
      if (/function descent\(|figBtn|shelf-figs|decorateActivation/.test(html)) fail('index.html: остался прежний «Спуск»');
    }
    /* смена биома: прежний фон гаснет поверх нового */
    reset(); T.S.route = 'descent'; T.S.selBiome = 'b1'; draw('Спуск · смена · b1');
    T.ACT.biome('b2');
    { const h = draw('Спуск · смена · b2');
      if (!h.includes(`<img class="ds-bg" src="${T.AV(DS.DS_DATA.art.b2)}"`) || !h.includes(`<img class="ds-bg out" src="${T.AV(DS.DS_DATA.art.b1)}"`)) fail('смена биома: прежний фон не гаснет поверх нового');
      if (!/class="ds-main swap"/.test(h)) fail('смена биома: название не входит заново'); }
    /* идущий забег: «К бою» и «Ещё отряд», огонёк у биома на пути вниз */
    reset(); T.S.route = 'descent'; T.S.selBiome = 'b2'; T.S.prepSquad = 's1'; T.ACT.start();
    {
      const R = T.S.runs[T.S.runs.length - 1]; T.S.route = 'descent'; T.S.overlay = null;
      const h = draw('Спуск · идёт забег');
      if (!R || !h.includes(`data-a="focus" data-v="${R.id}"`) || !h.includes('Ещё отряд</button>')) fail('идущий забег: нет «К бою» или «Ещё отряд»');
      if (!/data-v="b2"[^>]*>(?:(?!<\/button>)[\s\S])*class="ds-run"/.test(h)) fail('идущий забег: нет огонька у биома на пути вниз');
      if (/<button class="btn go big" data-a="sheet" data-v="prep">/.test(h)) fail('идущий забег: главным осталось «Начать забег», а не «К бою»');
      T.S.runs = [];
    }
    /* бестиарий биома: лист, 14 обитателей своего биома, неизученные — без имени, карточка — с возвратом, «В Летописи» */
    for (const team of [false, true]) {
      T.setTeam(team);
      for (const id of ['b1', 'b2', 'b3', 'b4']) {
        reset(); T.S.route = 'descent'; T.S.selBiome = id; T.S.overlay = { t: 'dsbest', arg: id };
        const key = `Бестиарий · ${id} · ${team ? 'команда' : 'игрок'}`, h = draw(key);
        if (!team) serviceIn(key, h);
        const mine = T.bioFoes(id), got = [...h.matchAll(/<button class="ds-bf[^"]*" data-a="foe" data-v="([^"]+)"/g)].map(m => m[1]);
        if (got.length !== 14 || mine.length !== 14 || got.some(f => !mine.some(x => x.id === f))) fail(`${key}: в листе ${got.length} врагов, чужие: ${got.filter(f => !mine.some(x => x.id === f)).join(', ')}`);
        for (const f of mine) {
          const url = T.FA(f), kn = T.known(f.id);
          if (!(url.startsWith('data:image/svg+xml,') || READY.has(`foes/${f.id}.jpg`) && url === T.AV(`foes/${f.id}.jpg`) || !f.biome)) fail(`${key}: у ${f.id} адрес портрета «${url.slice(0, 60)}» — не выгруженный и не заглушка`);
          if (!kn && h.includes(`<b>${f.name}</b>`)) fail(`${key}: неизученный ${f.id} назван по имени`);
          if (kn && !h.includes(`<b>${f.name}</b>`)) fail(`${key}: изученный ${f.id} без имени`);
        }
        for (const t of [(T.BIOME_UI[id].shelf || {}).o, (T.BIOME_UI[id].shelf || {}).e, 'Путь вниз']) if (!t || !h.includes(`<span class="eyebrow">${t}</span>`)) fail(`${key}: нет полки «${t}»`);
        if (!h.includes(`data-a="dsbook" data-v="${id}"`)) fail(`${key}: нет перехода в Летопись`);
      }
    }
    T.setTeam(false);
    reset(); T.S.route = 'descent'; T.S.selBiome = 'b2'; T.S.overlay = { t: 'dsbest', arg: 'b2' };
    T.ACT.foe('b2o1');
    { const h = draw('Бестиарий · карточка');
      if (!T.S.overlay || T.S.overlay.t !== 'foe' || T.S.overlay.ds !== 'b2' || !/data-a="sheet" data-v="dsbest:b2"><svg[\s\S]*?<\/svg>Все обитатели/.test(h)) fail('бестиарий: у карточки врага нет возврата к списку'); }
    T.S.overlay = null; T.ACT.foe('b2o1');
    if (draw('лист врага без бестиария').includes('Все обитатели')) fail('лист врага не из бестиария: лишний возврат к списку');
    reset(); T.S.route = 'descent'; T.S.selBiome = 'b3'; T.S.overlay = { t: 'dsbest', arg: 'b3' };
    T.ACT.dsbook('b3');
    { const h = draw('бестиарий → Летопись'), f = T.F(T.S.lore && T.S.lore.foe);
      if (T.S.route !== 'profile' || !T.S.lore || T.S.lore.sec !== 'best' || !f || f.biome !== 'b3' || !T.known(f.id) || !h.includes('Библиотека Улариона · цикл')) fail(`бестиарий → Летопись: ${T.S.route}, ${JSON.stringify(T.S.lore)}`); }
    /* фоны выгружены и стоят в ui-art.json */
    const uiArt = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'ui-art.json'), 'utf8'));
    for (const [id, p] of Object.entries(DS.DS_DATA.art)) {
      if (!uiArt.items[p]) fail(`фон ${id}: ${p} нет в tools/art-gen/ui-art.json`);
      if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) fail(`фон ${id}: ${p} не выгружен`);
    }
    /* 8б. «Спуск» на уровне AAA — законы и проверка мутацией (descent_laws.js) */
    out.dsNote = [];
    out.ds = require('./descent_laws.js')({ T, ctx, UI, html, fail, draw, reset, rootVars, rootCls, note: out.dsNote });
  }
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
      /* слово Этриона — конец обучения (ADR-0018): только у короткого леса цикла I; демо — цикл II, полный лес, слова нет (ADR-0044) */
      if (kind === 'guardWin' && h.includes('Виал — это только начало')) fail(`${key}: слово Этриона в цикле ${T.S.acc.cycle} — оно только в цикле I`);
      if (kind === 'guardWin' && id === 'b2') {
        const cv = R.curve; R.curve = [];   // этажи забега — полного леса: короткий их не знает
        T.S.acc.cycle = 1; const h1 = draw(`${key} · итог стража · цикл I`); T.S.acc.cycle = 2; R.curve = cv;
        if (!h1.includes('Виал — это только начало')) fail('итог стража биома 2 в цикле I: нет слова Этриона (ADR-0018)');
        draw(`${key} · снова цикл II`);
      }
    }
  }

  /* 11. рунный страж со «Спуска» */
  reset(); T.S.route = 'descent'; T.S.selBiome = 'b2'; T.S.prepSquad = 's1';
  let h = draw('Спуск · b2 · страж');
  if (!/<button class="btn sm" data-a="guard" data-v="gd\d+"/.test(h)) fail('страж биома 2: у пройденного биома вход закрыт');
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
  if (/data-a="guard" data-v="gd\d+"/.test(h) || !/class="ds-st wait"/.test(h)) fail('страж биома 3: вход открыт до босса или состояние не говорит, что страж за боссом');
  T.ACT.guard(''); if (T.S.runs.length) fail('страж биома 3: впустил до босса');
  let k0 = T.S.wallet.keys;
  T.ACT.guard('demo'); R = T.S.runs[T.S.runs.length - 1];
  if (!R || !R.guard || R.biome !== 'b3' || R.b.u[1][0].id !== 'b3g1') fail('страж биома 3: демо-вход не начал бой с Провидцем');
  if (T.S.wallet.keys !== k0) fail('страж биома 3: демо-вход потратил ключи');

  /* 11б. вход к стражу за ключи и повтор проигранного боя (§11; ADR-0031, п. 14; ADR-0014 — сиды постоянны): цена — entryKeys стража
     у кнопки; проигранный бой того же отряда тех же героев — до оплаты лист-предупреждение, «Всё равно войти» остаётся; ключи
     списывает только подтверждённый вход, операция с номером — повтор ничего не списывает; другой уровень — другой бой */
  {
    reset(); T.S.route = 'descent'; T.S.selBiome = 'b2'; T.S.prepSquad = 's1'; T.S.heroes.forEach(h => { h.lvl = 1; });
    const cost = (T.RX.drops.guardians.find(g => g.biome === 'b2') || {}).entryKeys, live = () => T.S.runs.filter(r => !r.over && r.guard).length;
    if (!Number.isInteger(cost) || cost < 1 || T.gdCost('b2') !== cost) fail(`вход к стражу: цена ${T.gdCost('b2')}, у стража в данных ${cost}`);
    h = draw('Спуск · b2 · страж за ключи');
    const btn = (h.match(/<button class="btn sm" data-a="guard" data-v="(gd\d+)"[^>]*>[\s\S]*?<\/button>/) || []);
    if (!btn[0] || !btn[0].includes('class="cost"') || !btn[0].includes(`>${cost}</span>`)) fail('вход к стражу: у кнопки нет номера операции или цены в ключах');
    k0 = T.S.wallet.keys; T.ACT.guard(btn[1] || '');
    R = T.S.runs[T.S.runs.length - 1];
    if (!R || !R.guard || T.S.wallet.keys !== k0 - cost) fail(`вход к стражу: ключей ${k0} → ${T.S.wallet.keys}, цена ${cost}`);
    T.S.route = 'descent'; if (R) play(R, 'страж · слабый отряд');
    if (!R || !R.end || R.end.kind !== 'guardLose') fail(`вход к стражу: отряд первого уровня не проиграл — ${R && R.end && R.end.kind}`);
    else {
      if (!T.gdSame('b2', 's1')) fail('вход к стражу: проигранный бой не запомнен');
      const k1 = T.S.wallet.keys; T.S.overlay = null; T.S.route = 'descent';
      T.ACT.guard('');
      const O = T.S.overlay;
      if (!O || O.act !== 'guardgo' || !/^gd\d+$/.test(O.v || '')) fail('повтор боя со стражем: нет листа-предупреждения с номером входа');
      if (T.S.wallet.keys !== k1 || live()) fail('повтор боя со стражем: ключи списаны или бой начат до подтверждения');
      const g = draw('повтор боя со стражем · лист');
      if (!g.includes('Этот бой уже был: тот же отряд — тот же исход. Поднимите уровень или смените отряд') || !/data-a="guardgo"[^>]*>Всё равно войти/.test(g)) fail('повтор боя со стражем: в листе нет слов о том же исходе или «Всё равно войти»');
      if (O) {
        T.ACT.guardgo(O.v);
        if (T.S.wallet.keys !== k1 - cost || live() !== 1) fail(`«Всё равно войти»: ключей ${k1} → ${T.S.wallet.keys}, боёв со стражем ${live()}`);
        const k2 = T.S.wallet.keys; T.ACT.guardgo(O.v);
        if (T.S.wallet.keys !== k2 || live() !== 1) fail('«Всё равно войти»: повтор номера списал ключи или начал бой');
      }
      T.S.runs = []; T.S.heroes[0].lvl = 2; T.S.overlay = null;
      if (T.gdSame('b2', 's1')) fail('вход к стражу: другой уровень героя — тот же бой');
      const k3 = T.S.wallet.keys; T.ACT.guard('');
      if (T.S.overlay || T.S.wallet.keys !== k3 - cost || live() !== 1) fail('вход к стражу: после подъёма уровня снова предупреждение или ключи не те');
    }
    /* ключей мало — отказ без расхода */
    reset(); T.S.route = 'descent'; T.S.selBiome = 'b2'; T.S.prepSquad = 's1'; T.S.wallet.keys = cost - 1;
    T.ACT.guard('');
    if (T.S.runs.length || T.S.wallet.keys !== cost - 1) fail('вход к стражу: без ключей бой начат или ключи ушли');
  }

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

  /* 17. фарм старых биомов в прототипе (ADR-0044): вариант по циклу аккаунта, сценарий «Фарм старого биома», цикл и артефакты в добыче */
  const lawProto = tag => {
    const o = [];
    reset(); T.S.route = 'descent'; T.S.selBiome = 'b1'; draw(`${tag} · демо`);
    if (T.EB.BIOMES.b1.variant !== 'full' || T.EB.BIOMES.b2.variant !== 'full') o.push(`${tag}: демо — цикл ${T.S.acc.cycle}, а биомы 1–2 — ${T.EB.BIOMES.b1.variant} / ${T.EB.BIOMES.b2.variant}`);
    const ctxII = T.lootCtx();
    if (!ctxII || ctxII.cyc !== T.S.acc.cycle || !ctxII.art) o.push(`${tag}: добыча в цикле II зовёт ядро без цикла и артефактов игрока`);
    T.S.acc.cycle = 1; draw(`${tag} · цикл I`);
    if (T.EB.BIOMES.b1.variant !== 'tut' || T.EB.BIOMES.b1.floors.length !== T.EB.FLOORS_TUTOR.length) o.push(`${tag}: цикл I — а биом 1 не короткий`);
    if (T.lootCtx() !== null) o.push(`${tag}: в цикле I добыча зовёт ядро с прибавками — а её задаёт сценарий обучения`);
    T.S.acc.cycle = 2; draw(`${tag} · снова цикл II`);
    /* сценарий: сильный отряд бьёт с одного удара, этаж всё равно идёт свой ритуал */
    const fl = T.FLOWS.find(x => x[0] === 'Фарм старого биома · удар насмерть');
    if (!fl) { o.push(`${tag}: нет сценария «Фарм старого биома · удар насмерть»`); return o; }
    reset(); fl[2]();
    const R = T.S.runs[T.S.runs.length - 1], FF = T.BU.FARM_FLOW;
    if (!R || R.biome !== FF.biome || R.heroes.some(h => h.cyc !== FF.cyc || h.lvl !== FF.lvl)) { o.push(`${tag}: сценарий начал не тот забег`); return o; }
    const b0 = R.b, M = T.EB.RULES.floor.minMs;
    T.EB.run(b0);
    if (!(b0.win && b0.fightMs < M.o && b0.t === M.o)) o.push(`${tag}: первый этаж сценария — бой ${b0.fightMs}, этаж ${b0.t}, ритуал ${M.o}: не удар насмерть или ритуал не доигран`);
    const k0 = T.S.wallet.keys; T.S.route = 'descent';
    R.b = T.EB.floorBattle(R.heroes, R.biome, R.floor, null, R.mode); R.view = 0; R.endAt = null;   // тот же этаж с начала — показом
    play(R, `${tag} · сценарий`);
    const B = T.EB.BIOMES.b1, bound = B.floors.reduce((a, F) => a + M[F.g], 0) + (B.floors.length - 1) * T.EB.RULES.floor.gapMs;
    if (!R.end || R.end.kind !== 'boss' || R.curve.length !== B.floors.length) o.push(`${tag}: сильный отряд не взял полную Мастерскую за забег — ${R.end && R.end.kind}, этажей ${R.curve.length}`);
    if (R.runMs < bound) o.push(`${tag}: забег ударами насмерть — ${R.runMs} мс, короче ритуалов всех этажей (${bound})`);
    if (T.S.wallet.keys - k0 !== (R.loot.keys || 0)) o.push(`${tag}: рунные ключи забега ${R.loot.keys || 0}, а в кошельке +${T.S.wallet.keys - k0}`);
    return o;
  };
  for (const e of lawProto('фарм · прототип')) fail(e);
  {
    const at0 = T.EB.atCycle;
    mutant('прототип не выбирает вариант по циклу', () => { T.EB.atCycle = () => 1; }, () => { T.EB.atCycle = at0; T.EB.atCycle(T.S.acc.cycle); }, lawProto);
    const caught = MUT.filter(m => m[1]).length;
    if (!MUT[MUT.length - 1][1]) fail('проверка мутацией: поломку «прототип не выбирает вариант по циклу» законы фарма не поймали');
    out.mut = `${caught} из ${MUT.length}`;
  }

  /* 14. разделы UI-кита: «Биомы спуска» и окно «Спуск» на каждом биоме */
  try {
    T.renderKit(); const k = els.kitGrid ? els.kitGrid.innerHTML : ''; scan('UI-кит', k);
    if (!k.includes('Биомы спуска') || BIO.some(id => !k.includes(PX.biomes[id].core.name))) fail('UI-кит: нет раздела «Биомы спуска» или биома в нём');
    const kd = (k.match(/<section class="k-box"[^>]*id="kitDescent">([\s\S]*?)<\/section>\s*(?=<section|$)/) || [])[1] || '';
    if (!kd.includes('Окно «Спуск»') || (kd.match(/<div class="g ds-kit-g">/g) || []).length !== 4) fail('UI-кит: нет раздела «Окно «Спуск»» или окна на каждом из четырёх биомов');
    if (T.DS) for (const id of ['b1', 'b2', 'b3', 'b4']) if (!kd.includes(`<img class="ds-bg" src="${T.AV(T.DS.DS_DATA.art[id])}"`)) fail(`UI-кит: в окне «Спуск» нет фона ${id}`);
  } catch (e) { fail('UI-кит: ' + e.message); }
} catch (e) { fail('прототип: исключение — ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
done();
