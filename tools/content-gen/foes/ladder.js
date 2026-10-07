/* Общая лестница врагов игры — ADR-0051, п. 3–5; §6, §7 GDD. Сборщик из данных: своих чисел врагов у него нет.
   Все враги игры одной таблицей и две меры у каждого:
   - боевая мощь — формула §6 со слоем способностей, функция ядра EnBattle.bm: то, что игрок видит на карточке;
   - сила по замеру ядром — сколько атак нужно эталонному отряду, чтобы убить врага один на один: настоящие бои ядра.
   Кто в лестнице: биомы 1–4 — короткие варианты обучения и полные (колода, босс, рунный страж и его свита); Эхо — девять недель,
   циклы II–VI, ступени 1–14 и Многоликий; призванные враги — КрафБоссы — по своему циклу силы; клан — Голос сонма и Хозяин стихии
   первого круга по циклам. Карты — те, что собирает сама игра: ядро (battle.js), биомы (biome-foes.js), экраны Эхо и клана прототипа.

   Замер (MEASURE): эталонный отряд — фикстура tools/content-gen/biomes/sim.js, SQUAD, на одном уровне для всех врагов; враг —
   один, без свиты, со своим здоровьем; атака — бой на раунды его типа (RULES.rounds.by); здоровье врага переходит из атаки в атаку,
   отряд каждый раз свежий — как в Эхо. Мера (rnd100) — раунды боя до гибели врага, сотые: раунд гибели — долей, по ходам героев;
   не убит за cap атак — по снятой доле здоровья. В атаках своего типа — rnd100 / раунды типа: так её показывают таблицы.
   Босс биома и рунный страж меряются ещё и боем, как их встречает игрок (fight100): босс — этаж со свитой и осадой, страж — он и свита
   одним боем, без осады.
   Замер — не данные игры, а её снимок: ladder.json и документ пишутся всегда, и с нарушениями — те встают в документ списком.
   Законы — вердикт: нарушение — код выхода 1 и у сборки, и у --check:
   Л1 — внутри биома рядовой слабее элиты, элита — босса: по обеим мерам, средним по типу; босс слабее рунного стража — боем (fight100);
   Л2 — следующий биом не слабее предыдущего (путь вниз: короткие 1–2, затем 3–4), следующий цикл — не слабее: тип недели Эхо,
        призванный враг и цель клана в цикле c + 1 против цикла c;
   Л3 — порядок типов — лестница автора (RULES.ladder, ADR-0054): тип каждого врага стоит в ней; в неделе Эхо рядовой слабее элиты,
        элита — босса, босс — Убер-босса, ступени идут по типам; призванные одного цикла силы — по ступеням типа; Хозяин стихии
        сильнее Голоса сонма;
   Л4 — лестница врагов Эхо (ADR-0043) — часть общей: каждая ступень каждой недели и каждый призванный враг есть в таблице;
   Л5 — числа целые, у каждого врага обе меры больше нуля.
   Исключения законов — поимённо, с причиной (EXEMPT). Расхождение мер (DIVERGE) — список на пересмотр: враг заметно сильнее
   или слабее своей боевой мощи против врагов того же типа и места — значит, дело в его способностях (ADR-0051, п. 4).
   Выход: tools/content-gen/foes/ladder.json — строки лестницы (их берёт tables/collect.js: лист «Лестница» в Enerium_Враги.xlsx)
   и docs/content/лестница-врагов.md. Пересборка даёт те же байты. Перезапускать после пересчёта врагов: биомы, Эхо, клан.
   Запуск: node tools/content-gen/foes/ladder.js           — сборка и законы;
           node tools/content-gen/foes/ladder.js --check   — законы и свежесть выходов, ничего не пишет;
           node tools/content-gen/foes/ladder.js --mut     — мутации: каждую поломку лестницы ловит свой закон. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const OUT_JSON = path.join(__dirname, 'ladder.json'), OUT_MD = path.join(ROOT, 'docs', 'content', 'лестница-врагов.md');
const CHECK = process.argv.includes('--check'), MUT = process.argv.includes('--mut');

/* ================================ ПРАВИЛА ================================ */
const MEASURE = {
  lvl: 150,          // уровень эталонного отряда: на нём обычный игрок стоит весь цикл II (docs/content/эхо-экономика.md)
  cap: 12,           // не убит за столько атак — мера по снятой доле здоровья
  seeds: 2,          // боёв на врага: мера — среднее
  maxX100: 99999900, // потолок меры, сотые раунда: враг, по которому отряд не снял ничего
};
const DIVERGE = { hiPct: 160, loPct: 62, minGroup: 3 };   // расхождение мер: сила к мощи против середины своей группы — выше hi или ниже lo, %
const CYCLES = [2, 3, 4, 5, 6];                           // рейтинг Эхо и клан — с цикла II
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const TYPE_NAME = { o: 'рядовой', e: 'элита', b: 'босс', rune: 'рунный босс', uber: 'Убер-босс', awakened: 'Пробуждённый', clan: 'клановый босс' };
/* путь вниз для закона «следующий биом не слабее»: вариант биома, которым игрок идёт впервые */
const PATH = [['b1', 1], ['b2', 1], ['b3', 2], ['b4', 2]];
/* исключения законов — поимённо и с причиной; ключ — «закон:кто» */
const EXEMPT = {
  'Л3:many': 'Многоликий по типу Пробуждённый, но бьётся один и убивается сразу: «Сделай чтобы многоликий был без свиты, и тогда его сразу же смогут убивать» (ответ автора 01.10.2026, ADR-0039). Здоровье его подобрано под одну атаку, поэтому и по замеру, и по боевой мощи он ниже Убер-босса своей недели; выше он уровнем, иммунитетом и очками',
  'Л2:many:rnd100': 'здоровье Многоликого подбирается под одну атаку «своего» отряда цикла (ADR-0039): от цикла к циклу его сила по замеру растёт не обязательно',
  /* общий пересчёт 07.10.2026: бой стража обучающего леса тяжелее боя босса не сделать силой стража, не сломав сценарий обучения */
  'Л1:b2@1:страж': 'обучающий Подземный лес — сценарий (ADR-0040, ADR-0049): стена обучения — Матерь стаи под льдом, 1 550 % здоровья, а стража отряд сценария берёт с первого входа на 49–50-м уровне. Бой стража тяжелее боя босса у эталонного отряда только при здоровье стража от 300 % (мера 7,2 раунда против 6,9), а уже при 115 % пятеро с доблестью бойца берут его лишь с 51-го — выше потолка цикла I, ключи сгорают. Полный вариант леса, с цикла II, закон держит: его стража эталонный отряд за бой не берёт',
};

/* ================================ ПРОТОТИП В ПЕСОЧНИЦЕ ================================ */
function boot() {
  const html = fs.readFileSync(path.join(UI, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, remove() {},
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
  for (const s of scripts) vm.runInContext(s.src ? fs.readFileSync(path.join(UI, s.src), 'utf8') : s.code, ctx, { filename: s.src || 'index.html' });
  return ctx;
}

/* сбор карт — внутри песочницы, функциями самой игры: ядро, экран Эхо (EN_ECHO), экран клана (EN_CLAN_UI, EnClan) */
function collect(MEASURE_, SQUAD_, CYCLES_) {
  const EB = window.EnBattle, RU = EB.RULES, out = [], fl = (a, b) => Math.floor(a / b);
  const heroes = SQUAD_.map(h => EB.heroSrcValor(Object.assign({}, h, { lvl: MEASURE_.lvl })));
  /* мощь и замер одной карты врага: src — источник карты ядра, как у боя */
  function measure(src, rank, key) {
    const one = Object.assign({}, src, { lead: true, hp: null, dead: false });
    const u = EB.create({ mode: 'rounds', seed: 1, heroes: [], foes: [one] }).u[1][0];
    const bm = EB.bm(u), hp0 = u.maxHp, rounds = EB.roundsOf(rank);
    let sum = 0;
    for (let s = 1; s <= MEASURE_.seeds; s++) {
      let hp = hp0, used = 0, dead = false, usedOnce = [];
      for (let a = 1; a <= MEASURE_.cap && !dead; a++) {
        const b = EB.targetBattle(heroes, { seed: EB.seedOf(`лестница|${key}|${s}|${a}`), g: rank, main: Object.assign({}, src, { hp, maxHp: hp0, used: usedOnce }), guards: [], maxRounds: rounds, endOnMain: true });
        const r = fight(b);
        const st = EB.echoStats(b);
        usedOnce = st.main.used; hp = Math.max(0, st.main.hp); dead = st.killed;
        used += dead ? r : rounds * 100;
      }
      sum += dead ? used : hp >= hp0 ? MEASURE_.maxX100 : Math.min(MEASURE_.maxX100, fl(MEASURE_.cap * rounds * 100 * hp0, hp0 - hp));
    }
    return { bm, hp: hp0, lvl: u.lvl, rnd100: fl(sum, MEASURE_.seeds), rounds, kRot: EB.kRot(u), trait: (u.lpas || []).filter(p => p.school === (window.EN_ABILITIES.rules.foeSet)).map(p => p.n).join(', ') };
  }
  /* бой до конца: сколько раундов он шёл, сотые. Раунд, в котором бой кончился, — долей: сколько героев успело сходить из живых */
  function fight(b) {
    let acts = 0, n = 1;
    while (!b.over) {
      const a = EB.step(b); if (!a) continue;
      if (a.kind === 'round') { acts = 0; n = Math.max(1, b.u[0].filter(h => h.alive).length); continue; }
      if (a.s && a.s.side === 0) acts++;
    }
    return Math.max(1, (b.round - 1) * 100 + Math.min(100, fl(acts * 100, n)));
  }
  /* бой, как его встречает игрок, — для босса биома и рунного стража: босс — этаж со свитой и осадой (здоровье босса копится между
     забегами), страж — он и свита одним боем, без осады: не взят за бой — не взят вовсе */
  function staged(id, kind) {
    const B = EB.BIOMES[id], last = B.floors.length;
    let sum = 0;
    for (let s = 1; s <= MEASURE_.seeds; s++) {
      if (kind === 'rune') { const b = EB.guardBattle(heroes, id, 'rounds'); b.rng = EB.makeRng(EB.seedOf(`лестница|страж|${id}|${s}`)); const r = fight(b); sum += b.win ? r : MEASURE_.maxX100; continue; }
      let hp = null, used = 0, dead = false, max = 0;
      for (let a = 1; a <= MEASURE_.cap && !dead; a++) {
        const b = EB.floorBattle(heroes, id, last, B.siege === false ? null : hp, 'rounds'); b.rng = EB.makeRng(EB.seedOf(`лестница|босс|${id}|${s}|${a}`));
        const r = fight(b), m = b.u[1][0]; max = max || m.max0; dead = !m.alive; hp = m.hp; used += dead ? r : b.maxRounds * 100;
        if (B.siege === false && !dead) { used = MEASURE_.maxX100; break; }
      }
      sum += dead ? used : used >= MEASURE_.maxX100 || hp >= max ? MEASURE_.maxX100 : Math.min(MEASURE_.maxX100, fl(MEASURE_.cap * EB.roundsOf('b') * 100 * max, max - hp));
    }
    return fl(sum, MEASURE_.seeds);
  }
  const row = (grp, x, m) => out.push(Object.assign({}, grp, x, m));
  /* ---- биомы 1–4: вариант по циклу игрока; каждая карта — на этаже первой встречи, босс и страж — со своим здоровьем ---- */
  for (const id of Object.keys(EB.BIOMES).filter(b => /^b\d$/.test(b)).sort()) {
    const B0 = EB.BIOMES[id], vars = B0.full ? [[1, 'короткий'], [B0.full.from, 'полный']] : [[B0.cycle, '']];
    for (const [c, vn] of vars) {
      EB.atCycle(c);   // вариант биома — в ядре: бои босса и стража идут по его колоде
      const B = EB.variantOf(id, c), L = B.foeLvl || RU.foeLvl, lvlAt = f => L.base + fl(f * L.perFloor, L.div || 1), first = {};
      B.floors.forEach((F, i) => F.m.forEach((fid, k) => { if (!first[fid]) first[fid] = { floor: i + 1, boss: F.g === 'b' && k === 0 }; }));
      B.guard.m.forEach((fid, k) => { if (!first[fid]) first[fid] = { floor: B.floors.length + 1, guard: k === 0 }; else if (k === 0) first[fid] = { floor: B.floors.length + 1, guard: true }; });
      for (const [fid, at] of Object.entries(first)) {
        const f = EB.FOES[fid], kit = (window.EN_KITS.foes[fid]) || f.kit;
        const hpPct = at.boss ? B.bossHpPct || f.hpPct : at.guard ? B.guardHpPct || f.hpPct : B.foeHpPct ? fl(f.hpPct * B.foeHpPct, 100) : f.hpPct;
        const src = { key: fid, id: fid, name: f.name, cls: f.cls, el: f.el, race: f.race, lvl: lvlAt(at.floor), st: f.st, hpPct, main: f.main, fx: f.fx, rank: f.rank, kit };
        row({ mode: 'Биом', place: `${B0.n}. ${B0.name}${vn ? ' · ' + vn : ''}`, grp: `${id}@${c}`, biome: id, n: B0.n, cyc: c, variant: vn || 'свой' },
          Object.assign({ id: fid, name: f.name, rank: f.rank, where: at.guard ? 'рунный бой' : `этаж ${at.floor}`, race: f.race || '', cls: f.cls }, at.boss || at.guard ? { fight100: staged(id, f.rank) } : {}), measure(src, f.rank, `${id}@${c}|${fid}`));
      }
    }
  }
  EB.atCycle(1);
  /* ---- Эхо: недели × циклы × ступени 1–15 и призванные враги — карты собирает экран Эхо ---- */
  const E = window.EN_ECHO, squadIds = () => sq(S.echoSquad).m.filter(Boolean);
  const reset = (race, c) => { S = initialState(); rsSetWeek(race); S.acc.cycle = c; S.route = 'echo'; S.overlay = null; S.wallet.souls = 1e9; E.sync(); };
  const TOP = E.steps.length, seenCraft = {};
  for (const w of RS.weeks) for (const c of CYCLES_) {
    reset(w.race, c);
    for (let st = 1; st <= TOP + 1; st++) {
      const x = E.target('step', st), F = E.fight(x, squadIds(), 1), m = F.o.main, many = x.kind === 'many';
      row({ mode: 'Эхо', place: `Эхо · ${w.race} · цикл ${c}`, grp: `эхо@${w.race}@${c}`, week: w.race, cyc: c },
        { id: many ? `${w.race}#${TOP + 1}` : `${w.race}#${st}`, name: m.name, rank: m.rank, where: many ? 'Многоликий' : `ступень ${st}`, step: st, race: m.race || '', cls: m.cls, many },
        measure(m, m.rank, `эхо|${w.race}|${c}|${st}`));
    }
    /* призванные враги — раз на врага: его цикл силы от недели не зависит; берём первую неделю, где цикл игрока не ниже цикла врага */
    for (const fb of RX.drops.craftBosses) {
      if (seenCraft[fb.id] || fb.cyc > c) continue;
      const pc = fb.cyc + (fb.powerCycleStep || 0);
      if (c !== Math.max(CYCLES_[0], Math.min(CYCLES_[CYCLES_.length - 1], fb.cyc))) continue;
      seenCraft[fb.id] = 1;
      const x = E.target('craft', fb), F = E.fight(x, squadIds(), 1), m = F.o.main;
      row({ mode: 'Призыв', place: `Призыв · цикл силы ${pc}`, grp: `призыв@${pc}`, cyc: pc },
        { id: fb.id, name: fb.name, rank: m.rank, where: fb.kind, race: m.race || fb.race || '', cls: m.cls, summon: fb.g }, measure(m, m.rank, `призыв|${fb.id}`));
    }
  }
  /* ---- клан: Голос сонма и Хозяин стихии первого круга — копия цели в силе цикла (ADR-0042), по стихиям ---- */
  const EC = window.EnClan, D = window.EN_CLAN;
  if (EC && D && EC.card) {
    const els = Object.keys((D.hosts || D.sonms || {})).length ? Object.keys(D.hosts || D.sonms) : RU.elem.circle.concat(RU.elem.pair, ['Время']);
    for (const c of CYCLES_) for (const el of els) for (const g of ['e', 'b']) {
      let src; try { src = EC.card(D, { g, uid: `лестница-${g}-${el}`, el, k: 1, c }); } catch (_) { src = null; }
      if (!src) continue;
      row({ mode: 'Клан', place: `Клан · цикл ${c}`, grp: `клан@${c}`, cyc: c },
        { id: `клан-${g}-${el}`, name: src.name, rank: src.rank, where: `круг 1 · ${el}`, race: src.race || '', cls: src.cls }, measure(src, src.rank, `клан|${c}|${el}|${g}`));
    }
  }
  return JSON.stringify(out);
}

/* ================================ ЗАКОНЫ ================================ */
const avg = xs => (xs.length ? Math.floor(xs.reduce((a, x) => a + x, 0) / xs.length) : 0);
const med = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const MN = { bm: 'боевая мощь', rnd100: 'сила по замеру', fight100: 'сила боя по замеру' };
function laws(rows, LADDER) {
  const bad = [], by = k => rows.reduce((m, r) => { (m[r[k]] = m[r[k]] || []).push(r); return m; }, {});
  const G = by('grp'), M = ['bm', 'rnd100'];
  const of = (rs, t, k) => avg(rs.filter(r => r.rank === t).map(r => r[k]));
  const free = (law, who, k) => !!EXEMPT[`${law}:${who}:${k}`] || !!EXEMPT[`${law}:${who}`];
  /* Л5 */
  for (const r of rows) for (const k of ['bm', 'rnd100', 'hp', 'lvl']) if (!Number.isInteger(r[k]) || r[k] <= 0) bad.push(`Л5: ${r.place} · ${r.name}: ${k} = ${r[k]}`);
  /* Л3: тип на лестнице */
  for (const r of rows) if (!LADDER.includes(r.rank)) bad.push(`Л3: ${r.place} · ${r.name}: типа «${r.rank}» нет в лестнице автора`);
  /* Л1: внутри биома. Рядовой, элита, босс — карта против карты, средним по типу, обе меры. Босс и страж — боем, как их встречает
     игрок: босс — этаж со свитой и осадой, страж — он и свита одним боем (fight100) */
  for (const [g, rs] of Object.entries(G)) {
    if (rs[0].mode !== 'Биом') continue;
    for (const [lo, hi] of [['o', 'e'], ['e', 'b']]) for (const k of M) {
      const a = of(rs, lo, k), b = of(rs, hi, k);
      if (a && b && !(b > a) && !free('Л1', g, k)) bad.push(`Л1: ${rs[0].place}: ${TYPE_NAME[hi]} (${b}) не сильнее, чем ${TYPE_NAME[lo]} (${a}), — ${MN[k]}`);
    }
    const boss = rs.find(r => r.rank === 'b'), guard = rs.find(r => r.rank === 'rune');
    if (!boss || !guard || !Number.isInteger(boss.fight100) || !Number.isInteger(guard.fight100)) bad.push(`Л1: ${rs[0].place}: нет замера боя босса или стража`);
    else if (!(guard.fight100 > boss.fight100) && !free('Л1', g, 'страж')) bad.push(`Л1: ${rs[0].place}: бой рунного стража (${guard.fight100}) не тяжелее боя босса (${boss.fight100}) — ${MN.fight100}`);
  }
  /* Л2: следующий биом пути вниз не слабее — тип против того же типа: рядовой и элита — картой, босс и страж — боем и мощью карты */
  for (let i = 1; i < PATH.length; i++) {
    const a = G[`${PATH[i - 1][0]}@${PATH[i - 1][1]}`], b = G[`${PATH[i][0]}@${PATH[i][1]}`];
    if (!a || !b) { bad.push(`Л2: нет биома пути вниз — ${PATH[i - 1][0]} или ${PATH[i][0]}`); continue; }
    for (const t of ['o', 'e']) for (const k of M) { const lo = of(a, t, k), hi = of(b, t, k); if (!(hi >= lo)) bad.push(`Л2: ${b[0].place}: ${TYPE_NAME[t]} (${hi}) слабее, чем в «${a[0].place}» (${lo}), — ${MN[k]}`); }
    for (const t of ['b', 'rune']) for (const k of ['bm', 'fight100']) { const lo = of(a, t, k), hi = of(b, t, k); if (!(hi >= lo)) bad.push(`Л2: ${b[0].place}: ${TYPE_NAME[t]} (${hi}) слабее, чем в «${a[0].place}» (${lo}), — ${MN[k]}`); }
  }
  /* Л2 и Л3 по Эхо — средним по типу в неделе и цикле: типы идут по лестнице автора, цикл к циклу — не слабее.
     Многоликий — исключение по замеру (EXEMPT): его мощь сверяется, сила по замеру — нет */
  const echo = rows.filter(r => r.mode === 'Эхо'), W = echo.reduce((m, r) => { ((m[r.week] = m[r.week] || {})[r.cyc] = m[r.week][r.cyc] || []).push(r); return m; }, {});
  const ET = ['o', 'e', 'b', 'uber'];
  for (const [wk, C] of Object.entries(W)) {
    const cs = Object.keys(C).map(Number).sort((a, b) => a - b);
    for (const c of cs) {
      const rs = C[c].filter(r => !r.many), steps = C[c].slice().sort((a, b) => a.step - b.step);
      for (let i = 1; i < steps.length; i++) if (LADDER.indexOf(steps[i].rank) < LADDER.indexOf(steps[i - 1].rank)) bad.push(`Л3: Эхо · ${wk} · цикл ${c}: ступень ${steps[i].step} по типу ниже ступени ${steps[i - 1].step}`);
      for (let i = 1; i < ET.length; i++) for (const k of M) { const lo = of(rs, ET[i - 1], k), hi = of(rs, ET[i], k); if (!(hi > lo)) bad.push(`Л3: Эхо · ${wk} · цикл ${c}: ${TYPE_NAME[ET[i]]} (${hi}) не сильнее, чем ${TYPE_NAME[ET[i - 1]]} (${lo}), — ${MN[k]}`); }
      const many = C[c].find(r => r.many), uber = C[c].find(r => r.rank === 'uber');
      if (many && uber) for (const k of M) if (!(many[k] >= uber[k]) && !free('Л3', 'many', k)) bad.push(`Л3: Эхо · ${wk} · цикл ${c}: Многоликий (${many[k]}) слабее Убер-босса (${uber[k]}) — ${MN[k]}`);
    }
    for (let i = 1; i < cs.length; i++) {
      for (const t of ET) for (const k of M) { const lo = of(C[cs[i - 1]].filter(r => !r.many), t, k), hi = of(C[cs[i]].filter(r => !r.many), t, k); if (!(hi >= lo)) bad.push(`Л2: Эхо · ${wk}: ${TYPE_NAME[t]} в цикле ${cs[i]} (${hi}) слабее, чем в цикле ${cs[i - 1]} (${lo}), — ${MN[k]}`); }
      const a = C[cs[i - 1]].find(r => r.many), b = C[cs[i]].find(r => r.many);
      if (a && b) for (const k of M) if (!(b[k] >= a[k]) && !free('Л2', 'many', k)) bad.push(`Л2: Эхо · ${wk}: Многоликий цикла ${cs[i]} (${b[k]}) слабее цикла ${cs[i - 1]} (${a[k]}) — ${MN[k]}`);
    }
  }
  /* Л3 и Л2 по призванным: в одном цикле силы — по ступеням типа; цикл силы к циклу — не слабее, тип против того же типа */
  const sm = rows.filter(r => r.mode === 'Призыв'), P = sm.reduce((m, r) => { (m[r.cyc] = m[r.cyc] || []).push(r); return m; }, {});
  const pcs = Object.keys(P).map(Number).sort((a, b) => a - b);
  for (const pc of pcs) { let prev = null; for (const t of LADDER) { if (!P[pc].some(r => r.rank === t)) continue; if (prev) for (const k of M) { const lo = of(P[pc], prev, k), hi = of(P[pc], t, k); if (!(hi >= lo) && !free('Л3', `призыв@${pc}`, k)) bad.push(`Л3: призванные цикла силы ${pc}: ${TYPE_NAME[t]} (${hi}) слабее, чем ${TYPE_NAME[prev]} (${lo}), — ${MN[k]}`); } prev = t; } }
  for (let i = 1; i < pcs.length; i++) for (const t of LADDER) { if (!P[pcs[i - 1]].some(r => r.rank === t) || !P[pcs[i]].some(r => r.rank === t)) continue; for (const k of M) { const lo = of(P[pcs[i - 1]], t, k), hi = of(P[pcs[i]], t, k); if (!(hi >= lo)) bad.push(`Л2: призванные: ${TYPE_NAME[t]} цикла силы ${pcs[i]} (${hi}) слабее цикла ${pcs[i - 1]} (${lo}) — ${MN[k]}`); } }
  /* Л2 и Л3 по клану: цикл к циклу, Хозяин против Голоса */
  const cl = rows.filter(r => r.mode === 'Клан'), K = cl.reduce((m, r) => { (m[r.cyc] = m[r.cyc] || []).push(r); return m; }, {});
  const kcs = Object.keys(K).map(Number).sort((a, b) => a - b);
  for (const c of kcs) for (const k of M) { const e = of(K[c], 'e', k), b = of(K[c], 'clan', k); if (e && b && !(b > e)) bad.push(`Л3: клан · цикл ${c}: Хозяин стихии (${b}) не сильнее Голоса сонма (${e}) — ${MN[k]}`); }
  for (let i = 1; i < kcs.length; i++) for (const t of ['e', 'clan']) for (const k of M) { const a = of(K[kcs[i - 1]], t, k), b = of(K[kcs[i]], t, k); if (a && b && !(b >= a)) bad.push(`Л2: клан: ${TYPE_NAME[t]} цикла ${kcs[i]} (${b}) слабее цикла ${kcs[i - 1]} (${a}) — ${MN[k]}`); }
  return bad;
}
/* Л4: лестница врагов Эхо — часть общей */
function echoPart(rows, weeks, top, craft) {
  const bad = [], have = new Set(rows.map(r => `${r.mode}|${r.id}|${r.cyc}`));
  for (const w of weeks) for (const c of CYCLES) for (let st = 1; st <= top + 1; st++) if (!have.has(`Эхо|${w}#${st}|${c}`)) bad.push(`Л4: в лестнице нет ступени ${st} недели «${w}» цикла ${c}`);
  for (const fb of craft) if (!rows.some(r => r.mode === 'Призыв' && r.id === fb.id)) bad.push(`Л4: в лестнице нет призванного врага ${fb.id} «${fb.name}»`);
  return bad;
}
/* расхождение мер: сила по замеру к квадрату мощи против середины врагов того же типа и места */
function diverge(rows) {
  const G = rows.reduce((m, r) => { (m[r.grp + '|' + r.rank] = m[r.grp + '|' + r.rank] || []).push(r); return m; }, {}), out = [];
  for (const rs of Object.values(G)) {
    if (rs.length < DIVERGE.minGroup) continue;
    const idx = r => r.rnd100 * 1e9 / (r.bm * r.bm), m = med(rs.map(idx));
    for (const r of rs) { const p = Math.floor(idx(r) * 100 / (m || 1)); if (p >= DIVERGE.hiPct || p <= DIVERGE.loPct) out.push(Object.assign({ pct: p }, r)); }
  }
  return out.sort((a, b) => Math.abs(Math.log(b.pct / 100)) - Math.abs(Math.log(a.pct / 100)) || (a.place + a.name < b.place + b.name ? -1 : 1));
}

/* ================================ ВЫВОД ================================ */
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const rnd = v => (v >= MEASURE.maxX100 ? 'не взять' : (v / 100).toFixed(1).replace('.', ',').replace(/,0$/, ''));
const atk = (v, rounds) => (v >= MEASURE.maxX100 ? 'не взять' : (v / (100 * rounds)).toFixed(2).replace('.', ','));
function doc(rows, div, LADDER, R, bad) {
  const T = (head, body) => ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|', ...body.map(r => '| ' + r.join(' | ') + ' |')].join('\n');
  const both = (rs, t) => `${rnd(avg(rs.map(r => r.rnd100)))} · ${atk(avg(rs.map(r => r.rnd100)), R.rounds[t])}`;
  const L = [];
  L.push('# Лестница врагов', '');
  L.push('**Собрано `tools/content-gen/foes/ladder.js` из данных игры — руками не править.** Решение — ADR-0051, п. 3–5; правило — §7 GDD. Числа — те, что сейчас в данных: после пересчёта врагов лестницу пересобирают.', '');
  L.push(`Все враги игры — ${fmt(rows.length)} карт — и две меры у каждого:`, '');
  L.push('- **боевая мощь** — формула §6 со слоем способностей: то, что игрок видит на карточке;');
  L.push(`- **сила по замеру** — сколько боя нужно эталонному отряду, чтобы убить врага один на один. Отряд — фикстура \`tools/content-gen/biomes/sim.js\` на ${MEASURE.lvl}-м уровне; враг — без свиты; атака — бой на раунды его типа; здоровье врага переходит из атаки в атаку, отряд каждый раз свежий. В таблицах — «раундов · атак»: раунды боя до гибели врага и те же раунды в атаках его типа. «Не взять» — отряд не снял ничего.`, '');
  L.push('Законы сборки Л1–Л5 сверяют силу в раундах: атака у старшего типа длиннее, и в атаках разница между типами сжимается.', '');
  L.push('## Лестница типов', '');
  L.push(T(['Ступень', 'Тип', 'Раундов в атаке', 'Иммунитет к контролю', 'Врагов в лестнице', 'Мощь: от — до', 'Замер, раундов: от — до'], LADDER.map((t, i) => {
    const rs = rows.filter(r => r.rank === t), b = rs.map(r => r.bm), a = rs.map(r => r.rnd100);
    return [i + 1, TYPE_NAME[t], R.rounds[t], `${R.resist[t] / 100} %`, rs.length, rs.length ? `${fmt(Math.min(...b))} — ${fmt(Math.max(...b))}` : '—', rs.length ? `${rnd(Math.min(...a))} — ${rnd(Math.max(...a))}` : '—'];
  })), '');
  L.push('Порядок типов — слова автора 06.10.2026 (ADR-0054), числа — `RULES.ladder`, `RULES.rounds.by` и `RULES.resist` ядра.', '');
  L.push('## Биомы', '');
  const biomes = [...new Set(rows.filter(r => r.mode === 'Биом').map(r => r.grp))];
  L.push(T(['Биом', 'Цикл игрока', 'Тип', 'Врагов', 'Уровень', 'Мощь, среднее', 'Замер карты: раундов · атак', 'Замер боя, раундов'], biomes.flatMap(g => ['o', 'e', 'b', 'rune'].map(t => {
    const rs = rows.filter(r => r.grp === g && r.rank === t); if (!rs.length) return null;
    const lv = rs.map(r => r.lvl);
    return [rs[0].place, ROMAN[rs[0].cyc] + (rs[0].variant === 'полный' ? ' и выше' : ''), TYPE_NAME[t], rs.length, Math.min(...lv) === Math.max(...lv) ? lv[0] : `${Math.min(...lv)}–${Math.max(...lv)}`, fmt(avg(rs.map(r => r.bm))), both(rs, t),
      rs[0].fight100 != null ? rnd(rs[0].fight100) : '—'];
  }).filter(Boolean))), '');
  L.push('«Замер боя» — бой, как его встречает игрок: босс — этаж со свитой и осадой, рунный страж — он и свита одним боем, без осады. Закон «босс слабее стража» сверяется боем: по карте страж слабее босса во всех биомах — здоровье босса рассчитано на осаду.', '');
  L.push('## Эхо — типы недели по циклам', '', 'Среднее по девяти неделям и ступеням типа. Многоликий — тип «Пробуждённый»: бьётся один, и здоровье его подобрано под одну атаку «своего» отряда (ADR-0039).', '');
  const echo = rows.filter(r => r.mode === 'Эхо'), ET = [['o', r => !r.many && r.rank === 'o', 'ступени 1–6'], ['e', r => r.rank === 'e', 'ступени 7–10'], ['b', r => r.rank === 'b', 'ступени 11–13'], ['uber', r => r.rank === 'uber', 'ступень 14'], ['awakened', r => r.many, 'Многоликий']];
  L.push(T(['Тип', 'Кто'].concat(CYCLES.flatMap(c => [`${ROMAN[c]}: мощь`, `${ROMAN[c]}: раундов · атак`])), ET.map(([t, f, who]) =>
    [TYPE_NAME[t], who].concat(CYCLES.flatMap(c => { const rs = echo.filter(r => f(r) && r.cyc === c); return [fmt(avg(rs.map(r => r.bm))), both(rs, t)]; })))), '');
  L.push('## Призванные враги — по циклу силы', '');
  const sm = rows.filter(r => r.mode === 'Призыв'), pcs = [...new Set(sm.map(r => r.cyc))].sort((a, b) => a - b);
  L.push(T(['Цикл силы', 'Тип', 'Врагов', 'Мощь, среднее', 'Замер: раундов · атак'], pcs.flatMap(pc => LADDER.map(t => { const rs = sm.filter(r => r.cyc === pc && r.rank === t); return rs.length ? [ROMAN[pc] || pc, TYPE_NAME[t], rs.length, fmt(avg(rs.map(r => r.bm))), both(rs, t)] : null; }).filter(Boolean))), '');
  L.push('## Клан — первый круг по циклам', '');
  const cl = rows.filter(r => r.mode === 'Клан');
  L.push(T(['Цикл', 'Цель', 'Тип', 'Мощь, среднее', 'Замер: раундов · атак'], CYCLES.flatMap(c => ['e', 'clan'].map(t => { const rs = cl.filter(r => r.cyc === c && r.rank === t); return rs.length ? [ROMAN[c], t === 'e' ? 'Голос сонма' : 'Хозяин стихии', TYPE_NAME[t], fmt(avg(rs.map(r => r.bm))), both(rs, t)] : null; }).filter(Boolean))), '');
  L.push('## Где меры расходятся — список на пересмотр', '');
  L.push(`Сила по замеру к боевой мощи — против середины врагов того же типа и места. Выше ${DIVERGE.hiPct} % — враг сильнее своей мощи, ниже ${DIVERGE.loPct} % — слабее: дело в его способностях (ADR-0051, п. 4). Пересматриваются эти враги, а не все. Врагов в списке — ${div.length}.`, '');
  L.push(div.length ? T(['Где', 'Враг', 'Тип · класс', 'Черта', 'Мощь', 'Замер, раундов', 'Сила к мощи'], div.map(r => [r.place, r.name, `${TYPE_NAME[r.rank]} · ${r.cls}`, r.trait || '—', fmt(r.bm), rnd(r.rnd100), `${r.pct} %`])) : 'Расхождений нет.', '');
  L.push('## Нарушения законов', '');
  L.push(bad.length ? `Законы Л1–Л5 сейчас нарушены — ${bad.length}. Это снимок данных: нарушение уходит пересчётом чисел врагов или решением автора, не правкой лестницы.` : 'Законы Л1–Л5 держатся.', '');
  for (const x of bad) L.push(`- ${x}`);
  if (bad.length) L.push('');
  L.push('## Исключения законов', '', 'Закон не снят — исключение названо поимённо и с причиной.', '');
  for (const [k, why] of Object.entries(EXEMPT)) L.push(`- **${k}** — ${why}.`);
  L.push('');
  return L.join('\n');
}

/* ================================ ЗАПУСК ================================ */
function build() {
  const SQUAD = require(path.join(__dirname, '..', 'biomes', 'sim.js')).SQUAD;
  const ctx = boot();
  const rows = JSON.parse(vm.runInContext(`(${collect.toString()})(${JSON.stringify(MEASURE)}, ${JSON.stringify(SQUAD)}, ${JSON.stringify(CYCLES)})`, ctx));
  const R = JSON.parse(vm.runInContext('JSON.stringify({ ladder: EnBattle.RULES.ladder, rounds: Object.fromEntries(EnBattle.RULES.ladder.map(k => [k, EnBattle.roundsOf(k)])), resist: EnBattle.RULES.resist, weeks: RS.weeks.map(w => w.race), top: EN_ECHO.steps.length, craft: RX.drops.craftBosses.map(b => ({ id: b.id, name: b.name })) })', ctx));
  return { rows, R };
}
function main() {
  const { rows, R } = build();
  const bad = laws(rows, R.ladder).concat(echoPart(rows, R.weeks, R.top, R.craft));
  const div = diverge(rows);
  const json = JSON.stringify({ meta: { builder: 'tools/content-gen/foes/ladder.js', measure: MEASURE, diverge: DIVERGE, ladder: R.ladder, rounds: R.rounds, resist: R.resist, typeName: TYPE_NAME },
    rows, diverge: div.map(r => ({ grp: r.grp, id: r.id, cyc: r.cyc, pct: r.pct })), broken: bad }) + '\n';
  const md = doc(rows, div, R.ladder, R, bad);
  if (MUT) return mutate(rows, R);
  const cnt = m => rows.filter(r => r.mode === m).length;
  console.log(`Лестница врагов: ${rows.length} карт — биомы ${cnt('Биом')}, Эхо ${cnt('Эхо')}, призванные ${cnt('Призыв')}, клан ${cnt('Клан')}; расхождений мер — ${div.length}.`);
  if (bad.length) { console.log(`Законы нарушены — ${bad.length}:\n` + bad.slice(0, 40).map(s => '  ✗ ' + s).join('\n') + (bad.length > 40 ? `\n  … и ещё ${bad.length - 40} — весь список в docs/content/лестница-врагов.md` : '')); process.exitCode = 1; }
  if (CHECK) {
    const stale = [[OUT_JSON, json], [OUT_MD, md]].filter(([p, t]) => !fs.existsSync(p) || fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') !== t).map(([p]) => path.relative(ROOT, p).split(path.sep).join('/'));
    if (stale.length) { console.log('Устарели: ' + stale.join(', ') + ' — пересобрать: node tools/content-gen/foes/ladder.js'); process.exitCode = 1; return; }
    console.log('Свежие: ladder.json и лестница-врагов.md совпадают со сборкой' + (bad.length ? '.' : '; законы Л1–Л5 держатся.'));
    return;
  }
  fs.writeFileSync(OUT_JSON, json); fs.writeFileSync(OUT_MD, md);
  console.log('Записано: tools/content-gen/foes/ladder.json, docs/content/лестница-врагов.md' + (bad.length ? ' — с нарушениями законов.' : '; законы Л1–Л5 держатся.'));
}
/* мутации: строки лестницы с одной поломкой — закон обязан её назвать */
function mutate(rows, R) {
  const clone = () => JSON.parse(JSON.stringify(rows)), of = (rs, f) => rs.filter(f);
  const MUTS = [
    ['Л1', 'элита биома слабее рядового', rs => { for (const r of of(rs, r => r.grp === 'b3@2' && r.rank === 'e')) { r.bm = 1; r.rnd100 = 1; } }],
    ['Л1', 'бой рунного стража легче боя босса', rs => { for (const r of of(rs, r => r.grp === 'b4@2' && r.rank === 'rune')) r.fight100 = 1; }],
    ['Л2', 'третий биом слабее второго', rs => { for (const r of of(rs, r => r.grp === 'b3@2')) { r.bm = Math.floor(r.bm / 1000) + 1; r.rnd100 = 1; if (r.fight100) r.fight100 = 1; } }],
    ['Л2', 'рядовые Эхо в цикле IV слабее, чем в цикле III', rs => { for (const r of of(rs, r => r.mode === 'Эхо' && r.cyc === 4 && r.rank === 'o')) r.bm = 1; }],
    ['Л3', 'тип вне лестницы автора', rs => { rs[0].rank = 'forgotten'; }],
    ['Л3', 'боссы недели Эхо слабее элит', rs => { for (const r of of(rs, r => r.mode === 'Эхо' && r.rank === 'b')) { r.bm = 1; r.rnd100 = 1; } }],
    ['Л3', 'призванный Убер слабее призванного босса', rs => { for (const r of of(rs, r => r.mode === 'Призыв' && r.rank === 'uber')) { r.bm = 1; r.rnd100 = 1; } }],
    ['Л3', 'Хозяин стихии слабее Голоса сонма', rs => { for (const r of of(rs, r => r.mode === 'Клан' && r.rank === 'clan')) { r.bm = 1; r.rnd100 = 1; } }],
    ['Л5', 'у врага нет меры', rs => { rs[5].rnd100 = 0; }],
    ['Л5', 'дробная мощь', rs => { rs[7].bm += 0.5; }],
  ];
  let caught = 0; const miss = [];
  for (const [law, what, f] of MUTS) { const rs = clone(); f(rs); if (laws(rs, R.ladder).some(s => s.startsWith(law))) caught++; else miss.push(`«${what}» не поймана законом ${law}`); }
  { const rs = clone().filter(r => !(r.mode === 'Эхо' && r.step === 3 && r.cyc === 2)); if (echoPart(rs, R.weeks, R.top, R.craft).some(s => s.startsWith('Л4'))) caught++; else miss.push('«из лестницы пропала ступень Эхо» не поймана законом Л4'); }
  { const rs = clone().filter(r => r.mode !== 'Призыв'); if (echoPart(rs, R.weeks, R.top, R.craft).some(s => s.startsWith('Л4'))) caught++; else miss.push('«из лестницы пропали призванные враги» не пойманы законом Л4'); }
  console.log(`Проверка мутацией лестницы врагов: поломок ${MUTS.length + 2}, поймано ${caught}.` + (miss.length ? '\n' + miss.map(s => '  ✗ ' + s).join('\n') : ''));
  if (miss.length) process.exitCode = 1;
}
main();
