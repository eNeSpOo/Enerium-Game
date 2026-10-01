/* screens/cycle.js — «Новый цикл — новая ступень аккаунта» (ADR-0041; GDD §1.1, §2.9, §16, §17.6, §20.5, §28.1, §36.16).
   Договор — screens/model.js. Данные — cycle.js (window.EN_CYCLE и алгоритм EnCycle): их собирает tools/content-gen/cycle/build.js
   из данных игры — руками не править.

   Что делает:
   - «сервер» перехода CY_SRV.advance(op, from) — одна операция с номером (EnCycle.advance): цикл аккаунта; опыт Странника за переход
     (§16, × номер прошлого цикла) и дар уровня, если уровень взят; место Памяти нового цикла (его открывает сам цикл — геттер мест
     в screens/wanderer.js); «Дар пути» в Лавке Энериума (SH_SRV.open, screens/store.js); таблицы рейтингов нового цикла — Эхо,
     контракты, Арена и Лига с начала, Событие начинает счёт само (screens/event.js); итог прошлого цикла — S.cy.hist. Повтор номера —
     прежний ответ, ничего не выдаёт; другой номер на тот же переход — отказ; устаревшее окно — отказ;
   - переход по игре: пал рунный страж второго биома цикла (обёртка endRun) — операция сразу;
   - окно «Событие нового цикла» (§2.9) поверх экрана, по одному, очередью, кроме идущего боя: номер цикла светом его карста, «Сразу» —
     что сервер выдал, «Что открылось» — шесть блоков разметки EN_CYCLE.sections, слово проводника, «Вспомнить» и «Позже».
     Плитка блока открывает лист со всеми пунктами и переходом к механике. Закрытие не теряет выбор: место Памяти ждёт, а окно открыто
     всегда — кнопкой у зеркала Памяти (cyMemBtn) и запиской Хранителя знаний в Убежище (обёртка shNext);
   - рейтинг — «Рейтинг цикла N»: cyRankCycle(t) для листов «Рейтинг» и экранов режимов; итог прошлого цикла — лист OV.cyhist из «Обзора».
   Окно I → II — это же окно, своим содержимым для цикла II (EN_CYCLE.steps[2]): переход I → II выдаёт сценарий обучения
   (screens/start.js, ADR-0040) — после последнего шага или пропуском — той же операцией CY_SRV.advance. Записка Убежища и вход у зеркала
   Памяти — после самого перехода (S.cy.at): у аккаунта, который в цикл не переходил (демо), их нет, а в последних шагах обучения записка — его.
   Числа — в данных; вид — CY_VIEW; тексты окна — EN_CYCLE.text. Служебное — только команде: TM, PL.
   Проверка — tools/content-gen/screens/check_cycle.js (законы перехода, окна и рейтинга, мутации). */
'use strict';

const CYD = window.EN_CYCLE || null;
const CYR = CYD && window.EnCycle ? EnCycle.make(CYD) : null;
const CY_VIEW = {
  /* свет номера цикла — цвет карста бога (дайджест: Нитриум — алый, Паладиум — синий, Энериум — зелёный); цикл без бога — свет духа */
  karst: { 'Элазиум': '#d9f7e8', 'Рубидиум': '#f2a33c', 'Нитриум': '#ff5a45', 'Паладиум': '#4b97ff', 'Энериум': '#42e08f' },
  more: 2,          // на плитке блока: главный пункт и ещё столько строкой
};
const CY_T = CYD ? CYD.text : {};

/* ================== состояние ================== */
function cyState(s) {
  s.cy = { srv: CYR ? CYR.fresh(s.acc.cycle) : null, queue: [], seen: {}, guard: {}, hist: {}, at: {} };
  return s;
}
if (CYR) {
  const cyInit0 = initialState;
  initialState = function () { return cyState(cyInit0()); };
  cyState(S);
}
const cyOn = () => !!(CYR && S && S.cy && S.cy.srv);
const cyOp = () => 'cy' + S.cy.srv.seq;
const cyStep = c => (CYR ? CYR.step(+c) : null);
const cyTeam = () => typeof KH !== 'undefined' && !!KH.team;
/* второй биом цикла — его рунный страж открывает следующий цикл (§1.3, §8) */
const cyBiome2 = c => { const C = window.EN_RECIPES && EN_RECIPES.cycles[c - 1]; return C && C.biomes[1] ? C.biomes[1].id : null; };
/* место Памяти цикла c — его номер в местах */
const cyMemAt = c => (S.mem && S.mem.slots ? S.mem.slots.findIndex(x => x.c === c) : -1);
const cyMemOpen = c => { const i = cyMemAt(c); return i >= 0 && S.mem.slots[i].st === 'open'; };

/* ================== «сервер» перехода ================== */
/* места и очки недели в рейтингах цикла, из которого игрок уходит: они остаются в таблице старого цикла (§17.6) */
function cyStand() {
  const pl = n => { const r = (S.ranks || []).find(x => x[0] === n); return r && Number.isInteger(r[1]) ? r[1] : null; };
  const out = [];
  if (S.echo) out.push({ id: 'echo', n: 'Эхо', place: S.echo.score ? S.echo.place : null, points: S.echo.score || 0 });
  if (S.event) out.push({ id: 'event', n: 'Событие', place: pl('Событие'), points: S.event.pts || 0 });
  if (S.contracts) out.push({ id: 'contract', n: 'Контракты', place: pl('Контракты'), points: S.contracts.pts || 0 });
  if (S.arena) out.push({ id: 'arena', n: 'Арена', place: pl('Арена'), points: S.arena.rating || 0 });
  if (S.arena && S.arena.lg) out.push({ id: 'league', n: 'Лига', place: null, points: S.arena.lg.rating || 0 });
  return out;
}
/* опыт Странника (§16): переход L → L + 1 — ⌈√(k2 × L³)⌉, дар — giftGold × (giftStep + L) / giftStep золота на каждом уровне */
function cyNeed(F, L) { const x = F.k2 * L * L * L; let r = Math.floor(Math.sqrt(x)); while (r * r < x) r++; while (r > 0 && (r - 1) * (r - 1) >= x) r--; return r; }
function cyXp(xp, from, to) {
  if (typeof obOn === 'function' && obOn() && typeof OB_R !== 'undefined' && OB_R && S.ob) { OB_R.fact(S.ob.srv, 'cycle:' + to, 'cycle', from); if (typeof obSync === 'function') obSync(); return; }
  const F = window.EN_START && EN_START.formula;
  S.acc.xp += xp;
  while (F && S.acc.level < F.max && S.acc.xp >= S.acc.next) {
    S.acc.xp -= S.acc.next; S.acc.level++;
    S.acc.next = cyNeed(F, S.acc.level);
    S.wallet.gold += Math.floor(F.giftGold * (F.giftStep + S.acc.level) / F.giftStep);
  }
}
/* таблицы нового цикла: очки недели с нуля, рейтинг Арены и Лиги — со старта, соперники — из нового цикла (подбор внутри цикла) */
function cyFreshTables(res) {
  if (S.echo) { S.echo.score = 0; S.echo.place = null; }
  if (S.ech && S.ech.claimed) S.ech.claimed = {};
  if (S.contracts) S.contracts.pts = 0;
  /* Событие: новый счёт цикла — пустой, без демо-недели (EN_EV.fresh(s, true), screens/event.js) */
  if (window.EN_EV && EN_EV.fresh) { S.event = EN_EV.fresh(S, true); if (EN_EV.sync) EN_EV.sync(); }
  if (S.arena) {
    const A = S.arena;
    for (const X of [A, A.lg]) if (X) Object.assign(X, { rating: res.arena, games: 0, wins: 0, hit: {}, rt: {}, lost: 0, opp: [] });
    const U = window.EN_ARENA_UI;
    if (U && U.listFor) { A.opp = U.listFor(S, A, 'arena'); if (A.lg) A.lg.opp = U.listFor(S, A.lg, 'league'); }
  }
  /* места: очки недели с нуля — места нет; Арена и Лига — место рейтинга старта в таблице мест сервера (EN_ARENA_UI.arPlace, lgPlace) */
  const U = window.EN_ARENA_UI, place = { 'Эхо': null, 'Контракты': null };
  if (U && U.arPlace) place['Арена'] = U.arPlace(res.arena);
  if (U && U.lgPlace) place['Лига'] = U.lgPlace(res.arena);
  S.ranks = (S.ranks || []).map(r => r[0] in place ? [r[0], place[r[0]], r[2]] : r);
}
function cyApply(res) {
  /* взятые планки недели в таблице прошлого цикла — сразу в запасы его сундуками (они подтверждены, §23); места ждут подсчёта недели
     в таблице прошлого цикла — на сервере. «Получить» в «Дарах» — та же выдача (darClaim, screens/bag.js) */
  /* только таблица того цикла, из которого игрок уходит: в цикле I недели нет — переход I → II (сценарий обучения, screens/start.js)
     приходит, когда аккаунт уже в цикле II, и чужие планки не забирает */
  if (S.acc.cycle === res.from && typeof darRows === 'function' && typeof darClaim === 'function' && S.zp) {
    const keys = darRows(S).filter(p => p.wk.id === 'now' && p.st === 'ok' && p.kind === 'plank' && p.cat === 'me').map(p => p.key);
    if (keys.length) darClaim(keys);
  }
  S.acc.cycle = res.to;
  /* биомы прошлого цикла пройдены: страж второго пал. Биомов нового цикла в ядре прототипа ещё нет — «Спуск» ведёт «глубже» */
  const C = window.EN_RECIPES && EN_RECIPES.cycles[res.from - 1];
  for (const b of S.biomes || []) if (b.cyc === res.from) { b.state = 'done'; if (!b.name && C) { const x = C.biomes.find(q => q.id === b.id); if (x) b.name = x.n; } }
  cyXp(res.xp, res.from, res.to);
  if (res.offer && typeof SH_SRV !== 'undefined' && S.store) SH_SRV.open(res.offer);
  cyFreshTables(res);
  S.cy.hist[res.from] = res.hist.map(x => Object.assign({}, x));
  S.cy.at[res.to] = { race: S.week ? S.week.race : '', from: res.from };
  if (S.cy.queue.length < CYD.rules.queueMax && !S.cy.queue.includes(res.to)) S.cy.queue.push(res.to);
  if (S.mem) S.mem.cyc = 0;   // демо-цикл «Странника» — снова цикл аккаунта
}
const CY_SRV = {
  advance(op, from) {
    if (!cyOn()) return { refuse: 'data' };
    const r = CYR.advance(S.cy.srv, op, +from, { guard: !!S.cy.guard[+from], standings: cyStand() });
    if (r.res && !r.again) cyApply(r.res);
    return r;
  },
};
/* переход по игре: пал рунный страж второго биома цикла */
if (CYR && typeof endRun === 'function') {
  const cyEndRun0 = endRun;
  endRun = function (R, vis) {
    const out = cyEndRun0(R, vis);
    if (cyOn() && R && !R.demo && !R.scene && R.end && R.end.kind === 'guardWin' && R.biome === cyBiome2(S.acc.cycle)) {
      S.cy.guard[S.acc.cycle] = 1;
      if (cyStep(S.acc.cycle + 1)) CY_SRV.advance(cyOp(), S.acc.cycle);
    }
    return out;
  };
}

/* ================== рейтинг цикла ================== */
/* цикл таблицы рейтинга: эта неделя — цикл аккаунта; прошлая — цикл, из которого игрок ушёл, если переход был на этой неделе */
function cyRankCycle(t) {
  const c = S.acc.cycle, at = S.cy && S.cy.at[c];
  return t === 'past' && at && S.week && at.race === S.week.race ? at.from : c;
}
const cyRankName = t => `Рейтинг цикла ${ROMAN[cyRankCycle(t)]}`;
/* итог прошлых циклов — лист из «Обзора» Странника */
function cyHistBtn() {
  const H = S.cy ? Object.keys(S.cy.hist).map(Number).sort((a, b) => b - a) : [];
  return H.length ? `<button class="link cy-histb" data-a="sheet" data-v="cyhist">Итог цикла ${ROMAN[H[0]]} ${ic('chev')}</button>` : '';
}

/* ================== окно «Событие нового цикла» ================== */
const cyEsc = s => (typeof trEsc === 'function' ? trEsc(s) : String(s));
function cyItems(c, sec) { const st = cyStep(c); return st ? st.open.filter(x => (!sec || x.sec === sec) && (!x.team || cyTeam())) : []; }
function cyTile(c, s) {
  const xs = cyItems(c, s.k).filter(x => !x.team);
  if (!xs.length) return '';
  const main = xs.find(x => x.main) || xs[0], rest = xs.filter(x => x !== main);
  return `<button class="cy-tile" data-a="sheet" data-v="cysec:${c}:${s.k}" aria-label="${cyEsc(s.n)}: ${cyEsc(main.n)}">
      <span class="cy-th">${ic(s.ic)}<b>${cyEsc(s.n)}</b>${rest.length ? `<span class="cy-tn num">+${rest.length}</span>` : ''}</span>
      <b class="cy-tm">${cyEsc(main.n)}</b>
      <small class="cy-ts">${rest.slice(0, CY_VIEW.more).map(x => cyEsc(x.n)).join(' · ')}</small></button>`;
}
function cyTeamNote(st) {
  const K = st.climb; if (!K) return '';
  const RM = k => ROMAN[k] || k;
  return TM(`<p class="reason cy-team">Подъём (climb.py): обычный — ${K.days.o} дн. (коридор ${K.corridor[0]}–${K.corridor[1]}), увлечённый — ${K.days.e}, плательщик — ${K.days.p}. Приходит героями цикла ${RM(K.came && K.came[0])} на ${K.came ? K.came[1] : '—'}-м; ${K.wall ? `стена — ${K.wall}-й этаж` : 'стена — осада босса'}${K.wallBoss ? `, босс — ${K.wallBoss}-й день` : ''}; путь — ${K.way}${K.way === 'новая ступень' ? ` (герои цикла ${RM(K.wayK)})` : ''}. Враги цикла — ${K.kX.A} % кривой §3.3.</p>`);
}
function cyWin(c, mode) {
  const st = cyStep(c); if (!st) return '';
  const pop = mode === 'pop', k = CY_VIEW.karst[st.karst] && !st.team ? CY_VIEW.karst[st.karst] : 'var(--spirit)';
  const say = st.say || ['mage', ''], npc = typeof NPCS !== 'undefined' ? NPCS[say[0]] : null;
  const crest = typeof shCrest === 'function' ? shCrest(say[0], ' cy-crest') : '';
  const mem = cyMemOpen(c);
  const later = pop ? `<button class="link" data-a="cylater" data-v="${c}">${CY_T.later}</button>` : `<button class="link" data-a="close">${CY_T.later}</button>`;
  const main = mem ? `<button class="btn go" data-a="cymem" data-v="${c}">${ic('star')}${CY_T.remember}</button>`
    : `<button class="btn go" data-a="cygo" data-v="${c}:rating">${ic('flag')}${CY_T.toRating}</button>`;
  const got = st.got.map((g, i) => `<li class="cy-g" style="--i:${i}">${cyEsc(g.n)}</li>`).join('');
  const tiles = CYD.sections.map(s => cyTile(c, s)).join('');
  const x = !pop ? `<button class="iconbtn x cy-x" data-a="close" aria-label="Закрыть">${ic('x')}</button>` : '';
  return `<div class="cy-pop${pop ? ' pop' : ''}" role="dialog" aria-modal="true" aria-labelledby="cyT${c}" style="--cy-k:${k}">
    <div class="cy-scrim"${pop ? '' : ' data-a="close"'} aria-hidden="true"></div>
    <div class="cy-card">
      <i class="cy-glow" aria-hidden="true"></i>${x}
      <div class="cy-side">
        <span class="eyebrow cy-ey">${CY_T.eyebrow}</span>
        <b class="cy-num" aria-hidden="true">${st.roman}</b>
        <h2 id="cyT${c}" class="cy-t">${cyEsc(st.title)}</h2>
        <p class="cy-lead">${cyEsc(st.lead)}</p>
        <div class="cy-got"><span class="eyebrow">${CY_T.got}</span><ul class="cy-gl">${got}</ul></div>
      </div>
      <div class="cy-main">
        <span class="eyebrow">${CY_T.open}</span>
        <div class="cy-grid">${tiles}</div>
        <div class="cy-say">${crest}<p><span class="eyebrow">${cyEsc(npc ? npc.n : '')}</span>${cyEsc(say[1])}</p></div>
        ${cyTeamNote(st)}
        <div class="cy-act">${later}${main}</div>
      </div>
    </div></div>`;
}
/* окно очередью: есть в очереди, нет листа поверх, не идёт показ боя */
function cyCanPop() {
  if (!cyOn() || !S.cy.queue.length || S.overlay) return false;
  const R = typeof focusRun === 'function' ? focusRun() : null;
  return !(S.route === 'battle' && R && !R.over);
}
function cyPopHtml() { return cyCanPop() ? cyWin(S.cy.queue[0], 'pop') : ''; }
if (CYR) {
  const cyOverlay0 = overlay;
  overlay = function () { return cyOverlay0() + cyPopHtml(); };
}
function cyDone(c) { if (!S.cy.queue.length || S.cy.queue[0] !== +c) return false; S.cy.queue.shift(); S.cy.seen[c] = 1; return true; }
/* переход к механике пункта: маршрут и вкладки, как у «Попробовать» окна уровня */
function cyGo(g, c) {
  if (!g) return;
  S.overlay = null;
  if (g.heroes) S.seg.heroes = g.heroes;
  if (g.hire) S.seg.hire = g.hire;
  if (g.gcyc && S.rs) S.rs.gcyc = g.gcyc;
  if (g.hero) S.seg.hero = g.hero;
  if (g.craft) S.seg.craft = g.craft;
  if (g.profile) S.seg.profile = g.profile;
  if (g.store) S.seg.store = g.store;
  if (g.route === 'descent') { const b = (S.biomes || []).find(x => x.state === 'front'); if (b && window.EnBattle && EnBattle.BIOMES[b.id]) S.selBiome = b.id; }
  S.route = g.route;
}
if (CYR) Object.assign(ACT, {
  cylater(v) { cyDone(v); render(); },
  cymem(v) {
    const c = +v, i = cyMemAt(c);
    cyDone(c); S.overlay = null; S.route = 'profile'; S.seg.profile = 'mem';
    if (i >= 0 && cyMemOpen(c) && typeof ACT.wnmem === 'function') return ACT.wnmem(String(i));
    render();
  },
  cygo(v) {
    const [c, k] = String(v).split(':'), x = cyItems(+c).find(it => it.k === k) || cyItems(+c, k)[0];
    cyDone(c); cyGo(x && x.go, +c); render();
  },
  /* демо команды: рунный страж второго биома цикла пал — переход по игре */
  cydemo(v) {
    const from = +v || S.acc.cycle; S.cy.guard[from] = 1;
    const r = CY_SRV.advance(cyOp(), from);
    if (r.refuse) toast(r.refuse === 'top' ? 'Циклов дальше нет.' : 'Переход не принят: ' + r.refuse);
    render();
  },
});

/* Esc — «Позже» у окна очередью (как у окна уровня) */
try { document.addEventListener('keydown', e => { if (e.key === 'Escape' && cyCanPop()) { e.preventDefault(); ACT.cylater(String(S.cy.queue[0])); } }); } catch (_) { }

/* ================== листы ================== */
if (CYR) Object.assign(OV, {
  cycle(o) { return cyWin(+o.arg || S.acc.cycle, 'sheet'); },
  /* блок окна целиком: каждый пункт, что он значит, и переход к механике */
  cysec(o) {
    const [c, k] = String(o.arg).split(':'), st = cyStep(c), sec = CYD.sections.find(s => s.k === k);
    if (!st || !sec) return '';
    const rows = cyItems(c, k).map(x => `<div class="cy-row${x.team ? ' team-only' : ''}"><div class="col"><b>${cyEsc(x.n)}</b><small>${cyEsc(x.d)}</small></div>${x.go ? `<button class="btn sm" data-a="cygo" data-v="${c}:${x.k}">Перейти ${ic('chev')}</button>` : ''}</div>`).join('');
    return sheet(`${sec.n} · цикл ${st.roman}`, `<div class="col cy-rows">${rows}</div>`, `<button class="link" data-a="sheet" data-v="cycle:${c}">${ic('back')}${cyEsc(CY_T.open)}</button>`);
  },
  cyhist() {
    const H = Object.keys(S.cy.hist).map(Number).sort((a, b) => b - a);
    const body = H.map(c => `<span class="eyebrow">Цикл ${ROMAN[c]} · неделя перехода</span><div class="col cy-hist">${S.cy.hist[c].map(x => `<div class="rkrow"><b class="serif">${x.place ? '#' + fmt(x.place) : '—'}</b><span>${cyEsc(x.n)}</span><span class="num">${fmt(x.points)}</span><span></span></div>`).join('')}</div>`).join('')
      + '<p class="reason">Очки недели перехода остаются в таблице прошлого цикла: её награды придут после подсчёта недели.</p>';
    return sheet('Итог прошлых циклов', body);
  },
});

/* ================== входы: Память и Убежище ================== */
/* у зеркала Памяти — окно цикла аккаунта всегда под рукой (§2.9: постоянный доступ в Памяти) */
function cyMemBtn() {
  const c = S.acc.cycle;
  return cyOn() && cyStep(c) && S.cy.at[c] ? `<button class="btn sm cy-memb" data-a="sheet" data-v="cycle:${c}" aria-label="Цикл ${ROMAN[c]} · что открылось">${ic('spark')}Цикл ${ROMAN[c]}<span class="cy-mbx"> · что открылось</span></button>` : '';
}
/* Убежище: записка Хранителя знаний — новый цикл и его место Памяти (§28.1: заметный вход); иначе — прежний следующий шаг */
if (CYR && typeof shNext === 'function') {
  const cyNext0 = shNext;
  shNext = function () {
    const c = S.acc.cycle, st = cyStep(c);
    if (!cyOn() || !st || !S.cy.at[c] || (!cyMemOpen(c) && S.cy.seen[c] && !S.cy.queue.includes(c))) return cyNext0();
    const orn = ['tl', 'tr', 'bl', 'br'].map(q => `<i class="sh-orn ${q}" aria-hidden="true"></i>`).join('');
    const mem = cyMemOpen(c), T = typeof SH_TEXT !== 'undefined' ? SH_TEXT : {};
    const p = mem ? `Место Памяти цикла ${st.roman} открыто. Рейтинг — среди игроков цикла ${st.roman}.` : `Рейтинг — среди игроков цикла ${st.roman}. Что изменилось — в окне цикла.`;
    return `<div class="sh-next cy-next">${orn}${typeof shCrest === 'function' ? shCrest('mage', ' sh-next-cr') : ''}<div class="sh-next-b">
        <span class="eyebrow">${T.next || 'Следующий шаг'} · ${NPCS && NPCS.mage ? NPCS.mage.n : ''}</span>
        <h2>${cyEsc(st.title)}</h2><p>${p}</p>
        <div class="sh-next-a">${mem ? `<button class="btn sm" data-a="cymem" data-v="${c}">${CY_T.remember}</button>` : ''}<button class="link" data-a="sheet" data-v="cycle:${c}">Что открылось ${ic('chev')}</button></div>
      </div></div>`;
  };
}

/* ================== сценарии ================== */
/* демо: аккаунт в конце цикла N — страж второго биома пал, переход по игре; Память цикла не тронута */
function cyDemoTo(to) {
  S = initialState();
  S.route = 'shelter'; S.overlay = null;
  /* аккаунт уже в этом цикле (демо — цикл II): переход в него не повторить — окно этого цикла просто встаёт */
  if (to <= S.acc.cycle) { S.cy.queue = [to]; return; }
  for (let c = S.acc.cycle; c < to; c++) { S.cy.guard[c] = 1; CY_SRV.advance(cyOp(), c); }
  /* окна прошлых переходов уже видены: в очереди — последнее */
  S.cy.queue = S.cy.queue.filter(c => c === to); for (let c = 3; c < to; c++) S.cy.seen[c] = 1;
}
if (CYR && typeof FLOWS !== 'undefined') {
  FLOWS.push(['Новый цикл · переход в III', 'Рунный страж второго биома пал — окно «Событие нового цикла»: рейтинг цикла III, герои, Спуск и ремесло, Неделя, Странник, Лавка; «Вспомнить» и «Позже»', () => { cyDemoTo(3); }]);
  FLOWS.push(['Рейтинг цикла III', 'После перехода: рейтинг недели — среди игроков цикла III, очки с нуля; итог цикла II — в «Обзоре» Странника', () => { cyDemoTo(3); S.cy.queue = []; S.cy.seen[3] = 1; S.route = 'week'; S.overlay = { t: 'rank', arg: 'Эхо' }; }]);
  FLOWS.push(['Новый цикл · переход в VI', 'Последний переход: для игрока без имён бога и биомов цикла VI — только для команды', () => { cyDemoTo(6); }]);
}

/* ================== UI-кит: раздел «Новый цикл» ================== */
function cyKitHtml() {
  if (!CYR) return '';
  const rows = Object.values(CYD.steps).map(st => `<tr><td>${ROMAN[st.from]} → ${st.roman}</td><td>${cyEsc(st.title)}</td><td>${st.got.map(g => cyEsc(g.n)).join('; ')}</td><td class="num">${st.open.filter(x => !x.team).length}</td>${TM(`<td class="num">${st.climb ? st.climb.days.o : '—'}</td>`, 'td')}</tr>`).join('');
  return `<section class="k-box" style="grid-column:1/-1" id="kitCycle"><h3>Новый цикл — новая ступень аккаунта</h3>
    <p class="k-note">Переход — одна операция сервера: рунный страж второго биома пал — цикл, опыт, место Памяти, «Дар пути», рейтинги нового цикла с начала. Окно «Событие нового цикла» — поверх экрана, очередью; закрытие не теряет выбор, окно — у зеркала Памяти и в Убежище. Блоки окна общие с окном I → II.</p>
    <table class="cy-kit"><thead><tr><th>Переход</th><th>Окно</th><th>Сразу</th><th>Пунктов</th>${TM('<th>Обычный, дней</th>', 'th')}</tr></thead><tbody>${rows}</tbody></table></section>`;
}
if (CYR && typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: cyKitHtml });

window.EN_CYCLE_UI = { SRV: CY_SRV, win: cyWin, rankCycle: cyRankCycle, memBtn: cyMemBtn, histBtn: cyHistBtn, demoTo: cyDemoTo, stand: cyStand, items: cyItems };
