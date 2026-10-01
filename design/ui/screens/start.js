/* screens/start.js — режим «Чистый лист» и уровень Странника (GDD §16, §31; ADR-0018, ADR-0019, ADR-0031).
   Слово автора 01.10.2026: «…показать как игра выглядит с чистого листа, то есть продумать моменты в страннике и уровне аккаунта и награды
   в нём за уровень в виде попапа, чтобы ознакомить игрока со всеми механиками на старте за 2 биома…».
   Данные и алгоритм «сервера» уровня — window.EN_START и EnStart (design/ui/start.js, сборщик tools/content-gen/start/build.js): этапы,
   пороги опыта, награды, открытия, слово проводника, ворота разделов и мест отряда. Здесь — показ и «сервер» прототипа.
   Регистрирует:
   — режим аккаунта прототипа: демо (как было) или «Чистый лист» — новый аккаунт с нуля (obFresh): уровень 0, пустой кошелёк и запасы,
     ни одного героя, Мастерская форм — рубеж спуска. Переключатель «Аккаунт» — в панели прототипа (index.html, #devAcc); выбор помнит
     localStorage, без него — демо. initialState в режиме «Чистый лист» отдаёт новый аккаунт: «Сбросить» начинает сценарий заново;
   — «сервер» уровня (OB_SRV): вехи опыта §16 — каждая один раз (EnStart.fact), этапы — из состояния; уровень и награда — одна операция
     с номером (EnStart.claim), повтор номера ничего не выдаёт. Награда — в кошелёк, запасы (BAG), сундуки, осколки и руну обучения;
   — окно уровня (obPopHtml): поверх любого экрана, кроме идущего боя, по одному, очередью; «Уровень N», полученное с анимацией,
     открывшееся голосом проводника и одна кнопка «Попробовать» — к механике (OB_GO). «Позже» — закрыть;
   — лист «Уровень Странника» (OV.level, и у демо-аккаунта): уровень, опыт, следующий этап, таблица уровней 1–10, формула дальше, вехи;
   — ворота: разделы шахты (NAV_OPEN), вкладки «Ремесла» и Призыва, места отряда (obSlotLock — его зовёт screens/heroes.js), путь вниз:
     страж пал — биом пройден, открыт следующий (§8.6); страж леса — цикл II;
   — героя обучения в отряд боя — той же записью, что у прогонов (rsAdd, фикстура отряда демо): бой прототипа и сборщика один;
   — «Следующий шаг» Убежища в режиме «Чистый лист» — этап следующего уровня и кнопка к нему; дела Недели — с её открытием;
   — сценарий презентации, раздел на карте экранов (#obMap) и раздел UI-кита «Окно уровня».
   Числа вида — OB_VIEW, тексты — OB_TEXT. Движение — только transform и opacity; «меньше движения» — окно сразу, награды стоят.
   Служебное — только команде: TM, PL из index.html. Автопроверка — tools/content-gen/screens/check_start.js. */
'use strict';

/* ================== данные и вид ================== */
const OB_D = window.EN_START || null;
const OB_R = OB_D && window.EnStart ? EnStart.make(OB_D) : null;
const OB_VIEW = {
  ring: 46,          // радиус кольца уровня, px вьюбокса 120
  step: 140,         // награды появляются по очереди: шаг, мс
  first: 520,        // первая награда — через столько мс после окна
  maxShow: 6,        // наград строкой — не больше; остальное — «и ещё N»
  holdMs: 0,         // после «Попробовать» следующее окно ждёт смены экрана
};
const OB_TEXT = {
  acc: ['Демо', 'Чистый лист'],
  level: 'Уровень Странника', got: 'Получено', open: 'Открылось', willOpen: 'Откроется', toNext: (n, L) => `до ${L}-го — ${n} опыта`, top: 'опыт набран', tryIt: 'Попробовать', later: 'Позже', more: n => `и ещё ${n}`,
  next: 'Следующий уровень', stage: 'Что сделать', done: 'взято', locked: n => `откроется на ${n}-м уровне Странника`,
  slotLock: n => `Место откроется на ${n}-м уровне`, gift: 'Дар Страннику',
  xpSrc: 'Опыт за вехи', xpNote: 'Опыт даёт только первое достижение вехи; за рецепты опыта нет.',
  formula: 'Дальше каждый уровень просит больше опыта, а дар растёт с уровнем.',
  stepNext: 'Следующий шаг', toDo: 'К делу',
};
/* куда ведёт «Попробовать» и «К делу»: маршрут и вкладки — из OPEN[ключ].go данных; sel — чья книга: next — следующий герой обучения
   к найму, best — сильнейший, trainee — кому руна обучения, capped — кто упёрся в потолок */
const OB_XPN = { kill: 'Первое убийство нового существа', closure: 'Первое закрытие биома', guard: 'Первый рунный страж', limit: 'Пробитие рунного предела',
  valor: 'Доблесть герою', echo: 'Первая победа над врагом в Эхо', hero: 'Новый герой', cycle: 'Переход на новый цикл' };

/* ================== режим аккаунта ================== */
const OB_KEY = 'en-acc';
const obSaved = () => { try { return localStorage.getItem(OB_KEY) === 'fresh'; } catch (_) { return false; } };
const obSave = on => { try { localStorage.setItem(OB_KEY, on ? 'fresh' : 'demo'); } catch (_) { } };
let OB_MODE = obSaved();
const obOn = () => !!(S && S.ob && S.ob.on);

/* фикстура героев обучения — записи отряда боя демо (S.heroes h1…h5): те же, что в прогонах (tools/content-gen/biomes/sim.js, SQUAD) */
const OB_FIX = (() => {
  const out = {}; if (!OB_D) return out;
  let s = null; try { s = initialState(); } catch (_) { return out; }
  for (const x of OB_D.heroes) {
    const r = RSI[x.id], d = r && r.team && r.team.draft, h = d ? (s.heroes || []).find(y => y.draft === d) : null;
    if (h) out[x.id] = h;
  }
  return out;
})();
function obFixOf(id) {
  const t = OB_FIX[id]; if (!t) return null;
  const h = Object.assign({}, t, { st: t.st.slice(), gr: t.gr.slice(), ab: t.ab.map(a => Object.assign({}, a)), pas: t.pas.map(p => Object.assign({}, p)),
    lvl: 0, cap: INV.hero.capByLim[0], lim: 0, valor: 0, busy: null });
  delete h.keep;
  return bmProp(h);
}
/* герой обучения по id состава: в отряде боя — его запись по черновику */
const obHero = id => { const r = RSI[id], d = r && r.team && r.team.draft; return d ? S.heroes.find(h => h.draft === d) || null : null; };

/* новый аккаунт: всё, что видит игрок, — с нуля; разделы, которых он ещё не видит, остаются как есть и откроются уровнем */
function obFresh(s) {
  if (!OB_R) return s;
  s.ob = { on: true, srv: OB_R.fresh(), queue: [], seen: {}, best: {}, guard: {}, hold: '', got: [] };
  s.acc = { level: 0, xp: 0, next: OB_R.need(0) || 1, cycle: OB_D.start.cycle };
  s.wallet = Object.assign({}, OB_D.start.wallet);
  s.heroes = []; s.selHero = '';
  s.rs.owned = {}; s.rs.shards = {}; s.rs.sel = OB_D.heroes[0].id; s.rs.gsel = ''; s.rs.cyc = 0; s.rs.gcyc = 0; s.rs.val = null;
  s.squads = [{ id: 's1', name: 'Отряд I', m: [null, null, null, null, null] }];
  s.selSquad = 's1'; s.prepSquad = 's1'; s.echoSquad = 's1';
  if (s.sq) { s.sq.sel = { arena: 's1', league: [null, null, null], clan: null }; s.sq.ops = {}; s.sq.seq = 1; s.sq.slot = -1; }
  s.biomes = [{ id: 'b1', cyc: 1, name: 'Мастерская форм', state: 'front' }, { id: 'b2', cyc: 1, name: null, state: 'lock' },
    { id: 'b3', cyc: 2, name: null, state: 'lock' }, { id: 'b4', cyc: 2, name: null, state: 'lock' }];
  s.selBiome = 'b1';
  s.known = []; s.siege = {}; s.lastRun = {}; s.runs = []; s.runNo = 0; s.focus = null; s.gd = { seq: 1, ops: {}, lost: {} };
  s.bag = { items: {}, known: [], chests: [], seq: 0 };
  s.inbox = [];
  if (s.hd) { s.hd.train = 0; s.hd.srv = {}; s.hd.seq = 1; }
  if (s.eq) { s.eq.items = {}; s.eq.worn = {}; s.eq.count = 0; }
  if (s.tal) { s.tal.eq = {}; s.tal.loose = {}; }
  if (s.zp) { if (s.zp.extra) s.zp.extra = {}; if (s.zp.seen) s.zp.seen = {}; }
  if (s.wn) { s.wn.art = {}; s.wn.ach = { got: {}, n: {}, first: {} }; }
  if (s.ws) { s.ws.seen = []; s.ws.part = {}; }
  if (typeof psNew === 'function' && s.pass) s.pass = psNew(s, false);
  if (typeof dgNew === 'function' && s.gift) { s.gift = dgNew(false); if (typeof dgSync === 'function') dgSync(s); }
  if (typeof stNew === 'function' && s.store) s.store = stNew(s, false);
  if (s.echo) { s.echo.score = 0; s.echo.place = null; s.echo.sel = 0; s.echo.slots = s.echo.slots.map(() => null); }
  if (s.ech) { s.ech.avail = 1; s.ech.known = {}; s.ech.pending = {}; s.ech.claimed = {}; s.ech.biomes = []; s.ech.cb = null; }
  if (Array.isArray(s.ranks)) s.ranks = s.ranks.map(r => [r[0], null, r[2]]);
  if (s.market) { s.market.mine = []; s.market.ops = {}; }
  if (s.rituals && Array.isArray(s.rituals.slots)) s.rituals.slots = s.rituals.slots.map(() => ({ st: 'free' }));   // ни одного ритуала: Неделя ещё закрыта
  if (s.soc) { s.soc.rel = {}; if (s.soc.chat && s.soc.chat.rooms) for (const [room, list] of Object.entries(s.soc.chat.rooms)) s.soc.chat.seen[room] = list.length; }   // ни друзей, ни заявок, чат прочитан
  if (s.clan && 'in' in s.clan) s.clan.in = false;   // в клане новый игрок не состоит: кланы — с 10-го уровня
  s.seg.craft = 'stock'; s.seg.heroes = 'hire'; s.seg.hire = 'gold'; s.seg.profile = 'over';
  s.route = 'shelter'; s.overlay = null; s.toast = null;
  return s;
}
/* состояние режима: «Чистый лист» — новый аккаунт и сразу первая операция сервера (уровень 1 — «Начало») */
const obInit0 = initialState;
initialState = function () { const s = obInit0(); if (OB_MODE && OB_R) { obFresh(s); obSync(s); } return s; };
/* ворота разделов шахты: в режиме «Чистый лист» — по данным; демо — как было */
const OB_NAV0 = Object.assign({}, NAV_OPEN);
function obGates() {
  for (const k of Object.keys(NAV_OPEN)) delete NAV_OPEN[k];
  Object.assign(NAV_OPEN, obOn() ? OB_D.gates.nav : OB_NAV0);
}
/* сменить аккаунт прототипа: забеги останавливаются, состояние — новое */
function obSwitch(on) {
  OB_MODE = !!on && !!OB_R; obSave(OB_MODE);
  try { if (typeof loop !== 'undefined' && loop) { clearInterval(loop); loop = null; } } catch (_) { }
  S = initialState(); obGates(); obPaintAcc(); render();
}
function obPaintAcc() {
  try { document.querySelectorAll('[data-acc]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.acc === 'fresh') === OB_MODE))); } catch (_) { }
}

/* ================== «сервер» уровня ================== */
const obLvl = () => (S.ob ? S.ob.srv.lvl : S.acc.level);
const obCap = h => INV.hero.capByLim[Math.min(h.lim || 0, INV.hero.capByLim.length - 1)];
/* вехи этапов сервера: этажи, боссы и стражи биомов, найденные рецепты, потолок героев, цикл */
function obStage(s) {
  const boss = {}; for (const [b, g] of Object.entries(s.siege || {})) if (g && g.killed) boss[b] = 1;
  const kill = {}; for (const id of s.known || []) kill[id] = 1;
  return { floor: s.ob.best, boss, guard: s.ob.guard, recipe: (s.bag.known || []).length, cap: (s.heroes || []).some(h => h.lvl >= obCap(h)), cycle: s.acc.cycle, kill };
}
/* вехи опыта §16 — каждая один раз: первые убийства, герои, закрытие биома, стражи, пределы, доблесть, цикл */
function obFacts(s) {
  const M = s.ob.srv, c = s.acc.cycle, f = (k, kind) => OB_R.fact(M, k, kind, c);
  for (const id of s.known || []) f('kill:' + id, 'kill');
  const mine = s === S && typeof hrMine === 'function' ? hrMine() : (s.heroes || []);
  for (const h of mine) {
    const id = (RSI[h.id] ? h.id : (hrTwin(h) || {}).id) || h.id;
    f('hero:' + id, 'hero');
    for (let v = 1; v <= (h.valor || 0); v++) f(`valor:${id}:${v}`, 'valor');
    for (let k = 1; k <= (h.lim || 0); k++) f(`limit:${id}:${h.valor || 0}:${k}`, 'limit');
  }
  for (const [b, g] of Object.entries(s.siege || {})) if (g && g.killed) f('closure:' + b, 'closure');
  for (const b of Object.keys(s.ob.guard)) f('guard:' + b, 'guard');
}
/* награда уровня — в кошелёк, запасы, сундуки, осколки и руну обучения */
function obGive(s, L, r) {
  s.wallet.gold += r.gold; s.wallet.spirit += r.spirit; s.wallet.keys += r.keys;
  if (r.runes) { const rn = limitRune(1, 1); if (rn) s.bag.items[rn.id] = (s.bag.items[rn.id] || 0) + r.runes; }
  if (r.train && s.hd) s.hd.train += r.train;
  for (const [id, n] of r.items) s.bag.items[id] = (s.bag.items[id] || 0) + n;
  if (r.chest) s.bag.chests.push({ id: 'ch' + (++s.bag.seq), box: r.chest.box, r: r.chest.r, cyc: s.acc.cycle, win: 'step', src: `${OB_TEXT.level} · уровень ${L}` });
  for (const [id, n] of r.shards) s.rs.shards[id] = (s.rs.shards[id] || 0) + n;
}
/* операция: уровни, что можно взять сейчас, и их награды. Номер — S.ob.srv.seq; повтор номера — прежний ответ, ничего не выдаёт */
const OB_SRV = {
  claim(op, s = S) {
    const r = OB_R.claim(s.ob.srv, op, obStage(s));
    if (r.res && !r.again) for (const x of r.res.levels) { obGive(s, x.L, x.reward); s.ob.queue.push(x.L); s.ob.got.push(x.L); }
    obAcc(s);
    return r;
  },
};
/* полоса аккаунта: уровень, опыт внутри уровня и до следующего — S.acc, её читают шапка, «Странник» и лист */
function obAcc(s = S) {
  if (!s.ob) return;
  const b = OB_R.bar(s.ob.srv);
  s.acc.level = b.lvl; s.acc.xp = b.xp; s.acc.next = Math.max(1, b.next);
}
/* сверка: вехи из состояния — в опыт; можно взять уровень — операция сервера. true — что-то изменилось */
function obSync(s = S) {
  if (!s || !s.ob || !s.ob.on || !OB_R) return false;
  const xp0 = s.ob.srv.xp, lv0 = s.ob.srv.lvl;
  obFacts(s);
  if (OB_R.canNext(s.ob.srv, obStage(s))) OB_SRV.claim('ob' + s.ob.srv.seq, s);
  obAcc(s);
  if (s === S) obGates();
  return s.ob.srv.xp !== xp0 || s.ob.srv.lvl !== lv0;
}

/* ================== путь вниз: страж пал — биом пройден, открыт следующий (§8.6) ================== */
const OB_NEXT = { b1: ['b2', 'Подземный лес'], b2: ['b3', 'Библиотека Улариона'] };
const obEndRun0 = endRun;
endRun = function (R, vis) {
  if (obOn() && R && !R.demo && !R.scene && R.end && R.end.kind === 'guardWin' && !S.ob.guard[R.biome]) {
    S.ob.guard[R.biome] = 1;
    const b = S.biomes.find(x => x.id === R.biome), nx = OB_NEXT[R.biome];
    if (b) b.state = 'done';
    if (nx) { const n = S.biomes.find(x => x.id === nx[0]); if (n) { n.state = 'front'; n.name = nx[1]; } S.selBiome = nx[0]; }
    obFacts(S);   // вехи боя — в цикле, где взяты: страж и его свита — до перехода
    if (R.biome === 'b2') { OB_R.fact(S.ob.srv, 'cycle:' + (S.acc.cycle + 1), 'cycle', S.acc.cycle); S.acc.cycle++; }   // переход — веха цикла, где взят
    obSync();
  }
  return obEndRun0(R, vis);
};
/* этаж взят — лучший этаж биома; вехи и уровень — сразу, окно ждёт конца боя */
const obFloorDone0 = floorDone;
floorDone = function (R, vis) {
  const r = obFloorDone0(R, vis);
  if (obOn() && R && !R.demo && !R.scene && !R.guard && R.b && R.b.win) S.ob.best[R.biome] = Math.max(S.ob.best[R.biome] || 0, R.floor);
  if (obOn()) obSync();
  return r;
};
/* герой обучения — в отряд боя записью фикстуры и в первое открытое место отряда I */
const obRsAdd0 = rsAdd;
rsAdd = function (h, how) {
  if (!obOn() || !h || !OB_FIX[h.id] || how !== 'gold') return obRsAdd0(h, how);
  const x = obFixOf(h.id); if (!x) return obRsAdd0(h, how);
  S.heroes.push(x);
  const s = S.squads[0], i = s ? s.m.findIndex((m, k) => !m && !obSlotLock(k)) : -1;
  if (i >= 0 && typeof SQ_SRV !== 'undefined') SQ_SRV.put(sqOp(), s.id, i, x.id);
  if (!S.selHero) S.selHero = x.id;
  obSync();
};
/* место отряда закрыто: 0 — открыто, иначе — уровень, с которого откроется */
function obSlotLock(i) {
  if (!obOn() || !OB_R) return 0;
  const n = OB_R.slots(obLvl()); if (i < n) return 0;
  const L = OB_D.gates.slots.findIndex(k => k > i); return L < 0 ? 0 : L + 1;
}

/* ================== окно уровня ================== */
/* можно показать: есть очередь, нет листа и окна поверх, не идёт показ боя, после «Попробовать» сменился экран */
function obCanShow() {
  if (!obOn() || !S.ob.queue.length || S.overlay) return false;
  if (S.ob.hold && S.ob.hold === S.route) return false;
  const R = typeof focusRun === 'function' ? focusRun() : null;
  return !(S.route === 'battle' && R && !R.over);
}
const obLv = L => OB_D.levels[L - 1] || null;
/* награда строкой вещей: валюта — картинка и число, руны и ресурсы — иконка предмета, сундук — его картинка, осколки — стекло с лицом */
function obRewardItems(L) {
  const r = OB_R.reward(L), out = [];
  const cur = (k, n) => out.push({ pic: `<img src="${CUR[k].img}" alt="">`, n: '+' + fmt(n), t: CUR[k].n });
  if (r.gold) cur('gold', r.gold);
  if (r.spirit) cur('spirit', r.spirit);
  if (r.keys) cur('keys', r.keys);
  const it = (id, n) => { const x = BAG.item(id); if (x) out.push({ pic: itWell(id, { stat: true, size: 44 }), n: '×' + fmt(n), t: itName(x) }); };
  if (r.runes) { const rn = limitRune(1, 1); if (rn) it(rn.id, r.runes); }
  if (r.train) { const v = cycItems('valor', 1)[0]; out.push({ pic: v ? itWell(v.id, { stat: true, size: 44 }) : ic('star'), n: '×' + r.train, t: 'Руна обучения' }); }
  for (const [id, n] of r.items) it(id, n);
  if (r.chest) out.push({ pic: typeof zpChestPic === 'function' ? zpChestPic(r.chest.box, r.chest.r) : `<img src="${CHEST}" alt="">`, n: '', t: typeof zpBoxName === 'function' ? zpBoxName({ box: r.chest.box, r: r.chest.r, win: 'step' }) : 'Сундук', chest: r.chest.r });
  for (const [id, n] of r.shards) { const h = RSI[id]; if (h) out.push({ pic: typeof shardGhost === 'function' ? shardGhost(h, n, RS.rules.stub.shards, 48) : ic('users'), n: '×' + n, t: hrStage(h) >= 2 ? `Осколки · ${h.n}` : 'Осколки неизвестной души', wide: true }); }
  return out;
}
function obPopHtml() {
  if (!obCanShow()) return '';
  const L = S.ob.queue[0], lv = obLv(L); if (!lv) return '';
  const items = obRewardItems(L), V = OB_VIEW, more = Math.max(0, items.length - V.maxShow);
  const say = lv.say || ['mage', ''], npc = typeof NPCS !== 'undefined' ? NPCS[say[0]] : null, main = OB_D.open[lv.opens[0]];
  const C = 2 * Math.PI * V.ring, dash = Math.round(C);
  const ring = `<svg class="ob-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="ob-r0" cx="60" cy="60" r="${V.ring}"/><circle class="ob-r1" cx="60" cy="60" r="${V.ring}" style="--ob-c:${dash}"/></svg>`;
  const rw = items.slice(0, V.maxShow).map((x, i) => `<li class="ob-rw${x.chest ? ' ch' : ''}${x.wide ? ' wd' : ''}" style="--i:${i}"><span class="ob-pic">${x.pic}</span><b class="num">${x.n}</b><small>${trEsc(x.t)}</small></li>`).join('')
    + (more ? `<li class="ob-rw more" style="--i:${V.maxShow}"><b>${OB_TEXT.more(more)}</b></li>` : '');
  const opens = lv.opens.map((k, i) => `<li${i ? '' : ' class="main"'}>${trEsc(OB_D.open[k].n)}</li>`).join('');
  const crest = typeof shCrest === 'function' ? shCrest(say[0], ' ob-crest') : '';
  const left = S.ob.queue.length > 1 ? `<span class="ob-q" aria-label="Ещё уровней: ${S.ob.queue.length - 1}">+${S.ob.queue.length - 1}</span>` : '';
  return `<div class="ob-pop" role="dialog" aria-modal="true" aria-labelledby="obT" style="--ob-step:${V.step}ms;--ob-first:${V.first}ms">
    <div class="ob-scrim" aria-hidden="true"></div>
    <div class="ob-card">
      <i class="ob-glow" aria-hidden="true"></i>
      <div class="ob-hd">${ring}<b class="ob-n num">${L}</b>${left}</div>
      <span class="ob-xp num">${OB_TEXT.toNext(fmt(OB_R.need(L)), L + 1)}</span>
      <span class="eyebrow ob-ey">${OB_TEXT.level}</span>
      <h2 id="obT" class="ob-t">Уровень ${L} · ${trEsc(lv.n)}</h2>
      <div class="ob-got"><span class="eyebrow">${OB_TEXT.got}</span><ul class="ob-rws">${rw}</ul></div>
      <div class="ob-open">${crest}<div class="ob-say"><span class="eyebrow">${OB_TEXT.open} · ${trEsc(npc ? npc.n : '')}</span><p>${trEsc(say[1])}</p><ul class="ob-ops">${opens}</ul></div></div>
      <div class="ob-act"><button class="link" data-a="oblater" data-v="${L}">${OB_TEXT.later}</button><button class="btn go" data-a="obtry" data-v="${L}" aria-label="${OB_TEXT.tryIt}: ${trEsc(main ? main.n : '')}">${OB_TEXT.tryIt}</button></div>
    </div></div>`;
}
const obOverlay0 = overlay;
overlay = function () { return obOverlay0() + obPopHtml(); };
/* «Попробовать» — к механике первого открытия уровня; «Позже» — закрыть. Окно закрывает только то, что показано */
function obDone(L) { if (!S.ob || S.ob.queue[0] !== +L) return false; S.ob.queue.shift(); S.ob.seen[L] = 1; return true; }
function obGo(key) {
  const o = OB_D.open[key], g = o && o.go; if (!g) return;
  S.overlay = null;
  if (g.heroes) S.seg.heroes = g.heroes;
  if (g.hire) S.seg.hire = g.hire;
  if (g.craft) S.seg.craft = g.craft;
  if (g.zptab && typeof zpV === 'function') zpV().tab = g.zptab;   // вкладка «Запасов»: сундук уровня — на виду
  if (g.profile) S.seg.profile = g.profile;
  if (g.route === 'heroes' && g.heroes === 'hire' && g.pick === 'next') { const nx = OB_D.heroes.find(x => !rsHas(RSI[x.id])); if (nx) { S.rs.gcyc = RSI[nx.id].c; S.rs.gsel = nx.id; } }
  if (g.route === 'heroes' && g.heroes === 'coll') {
    const pick = g.sel === 'trainee' ? obHero(OB_D.train) : g.sel === 'capped' ? S.heroes.find(h => h.lvl >= obCap(h)) || S.heroes[0] : S.heroes.slice().sort((a, b) => b.lvl - a.lvl)[0];
    if (pick) { S.hview = 'mine'; S.hgrid = 'own'; S.selHero = pick.id; S.seg.hero = g.hero || 'power'; }
  }
  if (g.route === 'descent') { const b = g.biome === 'front' ? (S.biomes.find(x => x.state === 'front') || {}).id : g.biome; if (b && EB.BIOMES[b]) S.selBiome = b; }
  S.route = g.route;
}
Object.assign(ACT, {
  obtry(v) { const lv = obLv(+v); if (!obDone(v)) return render(); obGo(lv.opens[0]); S.ob.hold = S.route; render(); },
  oblater(v) { obDone(v); render(); },
  obacc(v) { obSwitch(v === 'fresh'); },
  obgo(v) { obGo(v); render(); },
});
/* после «Попробовать» следующее окно ждёт смены экрана; Esc закрывает окно уровня, как лист */
addEventListener('en-render', () => {
  if (!obOn()) { if (JSON.stringify(NAV_OPEN) !== JSON.stringify(OB_NAV0)) obGates(); return; }
  if (S.ob.hold && S.ob.hold !== S.route) S.ob.hold = '';
  if (obSync()) render();
});
try { document.addEventListener('keydown', e => { if (e.key === 'Escape' && obOn() && !S.overlay && S.ob.queue.length && obCanShow()) { e.preventDefault(); ACT.oblater(String(S.ob.queue[0])); } }); } catch (_) { }

/* ================== лист «Уровень Странника» ================== */
function obStageText(L) { const lv = obLv(L); return lv ? lv.why : ''; }
/* этап следующего уровня: сколько сделано — для листа и записки */
function obProgress(L) {
  const lv = obLv(L); if (!lv || !lv.stage || !S.ob) return '';
  const st = lv.stage.all || lv.stage.any || [lv.stage], F = obStage(S), out = [];
  for (const x of st) if (x.k === 'floor') out.push(`этаж ${Math.min(x.n, (F.floor[x.b] || 0))} из ${x.n}`);
  return out.join(' · ');
}
function obRewardText(L) {
  const r = OB_R.reward(L), out = [`${fmt(r.gold)} золота`];
  if (r.spirit) out.push(`${fmt(r.spirit)} духа`); if (r.keys) out.push(`${r.keys} ${plural(r.keys, 'рунный ключ', 'рунных ключа', 'рунных ключей')}`);
  if (r.runes) out.push(`${r.runes} рун предела`); if (r.train) out.push('руна обучения');
  for (const [id, n] of r.items) { const x = BAG.item(id); out.push(`${x ? itName(x) : id} ×${n}`); }
  if (r.chest) out.push('сундук странника');
  for (const [id, n] of r.shards) out.push(`осколки героя ×${n}`);
  return out.join(', ');
}
function obLevelSheet() {
  const lvl = S.acc.level, xp = S.acc.xp, next = S.acc.next, c = S.acc.cycle, on = obOn();
  const nL = lvl + 1, nlv = obLv(nL), prog = on ? obProgress(nL) : '';
  const head = `<div class="row ob-sh-h"><div class="stat"><b class="ob-sh-n">${lvl}</b><small>уровень</small></div><div class="col grow" style="gap:4px">${bar(xp / Math.max(1, next) * 100, 'sand')}<span class="faint num" style="font-size:12.5px">${fmt(xp)} / ${fmt(next)} опыта</span></div></div>`;
  const nx = nlv ? `<div class="pnl pad ob-sh-nx"><span class="eyebrow">${OB_TEXT.next} · ${nL} · ${trEsc(nlv.n)}</span>
      <p><b>${OB_TEXT.stage}:</b> ${trEsc(nlv.why)}${prog ? ` · <span class="num">${prog}</span>` : ''}</p>
      <p class="faint">${OB_TEXT.willOpen}: ${nlv.opens.map(k => trEsc(OB_D.open[k].n)).join(', ')}.</p></div>`
    : `<div class="pnl pad ob-sh-nx"><span class="eyebrow">${OB_TEXT.next} · ${nL}</span><p>${OB_TEXT.gift}: ${fmt(OB_R.gift(nL))} золота.</p></div>`;
  const rows = OB_D.levels.map(l => {
    const st = l.L <= lvl ? 'got' : l.L === nL ? 'next' : 'wait';
    return `<div class="ob-lr ${st}"><b class="num">${l.L}</b><div class="col" style="gap:2px;min-width:0"><span class="ob-lr-n">${trEsc(l.n)}<small> · ${trEsc(l.why)}</small></span>
      <small class="ob-lr-o">${l.opens.map(k => trEsc(OB_D.open[k].n)).join(' · ')}</small><small class="ob-lr-r">${obRewardText(l.L)}</small></div>
      <span class="ob-lr-s">${st === 'got' ? ic('check') + OB_TEXT.done : st === 'next' ? `${fmt(OB_R.thr(l.L))} опыта` : `${fmt(OB_R.thr(l.L))}`}</span></div>`;
  }).join('');
  const src = Object.entries(OB_D.xp).map(([k, v]) => `<div class="srow"><span class="n">${OB_XPN[k] || k}</span><span class="v">${fmt(v * c)}</span><span></span></div>`).join('');
  const body = `${head}${nx}<span class="eyebrow">Уровни 1–10 · цикл I</span><div class="col ob-lt" data-keep="oblt">${rows}</div>
    <p class="reason">${OB_TEXT.formula}</p>${TM('<p class="reason">§16: переход L → L+1 — ⌈100 × L^1,5⌉ опыта, «Дар Страннику» — 6 500 × (1 + L × 0,1) золота.</p>')}
    <span class="eyebrow">${OB_TEXT.xpSrc} · цикл ${ROMAN[c]} (×${c})</span><div class="col" style="gap:2px">${src}</div>
    <p class="reason">${OB_TEXT.xpNote}</p>${TM(`<p class="reason">EN_START: пороги ${OB_D.levels.map(l => l.xp).join(' / ')}; уровень — EnStart.claim с номером. Сценарий — docs/content/старт-с-чистого-листа.md.</p>`)}`;
  return sheet(OB_TEXT.level, body, '', true);
}
/* лист — в материале покоев Странника, как прежний (screens/chambers.js, cbMark): окно раздела «Странник» */
if (OB_R) OV.level = () => (typeof cbMark === 'function' ? cbMark(obLevelSheet()) : obLevelSheet());

/* ================== ворота вкладок ================== */
const obLockHtml = (name, n) => `<section class="scr"><div class="pnl pad ob-lock">${ic('lock')}<b class="serif">${trEsc(name)}</b><p>${OB_TEXT.locked(n)}</p></div></section>`;
/* «Ремесло»: закрытые вкладки — замок у подписи и окно-замок */
const OB_CRAFT_N = { work: 'Мастерская', stock: 'Запасы', shop: 'Лавка', market: 'Рынок', reforge: 'Перековка' };
if (typeof SCREENS !== 'undefined' && SCREENS.craft) {
  const scr0 = SCREENS.craft;
  SCREENS.craft = () => {
    const m = scr0(); if (!obOn() || !m || !m.seg) return m;
    const lv = obLvl(), at = k => OB_R.opensAt('seg', 'craft:' + k);
    m.seg = Object.assign({}, m.seg, { items: m.seg.items.map(([k, l, b]) => at(k) > lv ? [k, `${ic('lock')}${l}`, b] : [k, l, b]) });
    const cur = S.seg.craft; if (at(cur) > lv) m.html = obLockHtml(OB_CRAFT_N[cur] || cur, at(cur));
    return m;
  };
}
/* Призыв «За души» — с открытием Возрождения душ */
if (typeof hireView === 'function') {
  const hire0 = hireView;
  hireView = function () {
    const h = hire0(); if (!obOn()) return h;
    const n = OB_R.opensAt('hire', 'souls'); if (obLvl() >= n) return h;
    const x = h.replace('>За души</button>', `>${ic('lock')}За души</button>`);
    if (S.seg.hire !== 'souls') return x;
    const i = x.indexOf('</div></div>');
    return i < 0 ? obLockHtml('Возрождение душ', n) : x.slice(0, i + 12) + `<div class="pnl pad ob-lock">${ic('lock')}<b class="serif">Возрождение душ</b><p>${OB_TEXT.locked(n)}</p></div></section>`;
  };
}

/* ================== Убежище: следующий шаг и дела ================== */
/* следующий шаг: место в отряде и золото — нанять; иначе — этап следующего уровня */
function obNextStep() {
  const L = obLvl(), nx = OB_D.heroes.find(x => !rsHas(RSI[x.id])), k = S.heroes.length;
  if (nx && k < OB_R.slots(L)) return { h: `Нанять: ${RSI[nx.id].n}`, p: 'Место в отряде открыто — героя ждёт Призыв.', go: 'hire' };
  const nlv = obLv(L + 1); if (!nlv) return null;
  const st = nlv.stage && (nlv.stage.all || nlv.stage.any || [nlv.stage]);
  const kind = st ? st[0].k : '', go = kind === 'recipe' ? 'craft' : kind === 'cap' ? 'dev' : 'descent';
  const prog = obProgress(L + 1);
  return { h: `Уровень ${L + 1} · ${nlv.n}`, p: nlv.why + (prog ? ` — ${prog}` : '') + '.', go };
}
if (typeof shNext === 'function') {
  const shNext0 = shNext;
  shNext = function () {
    if (!obOn() || S.acc.cycle > 1) return shNext0();
    const x = obNextStep(); if (!x) return shNext0();
    const orn = ['tl', 'tr', 'bl', 'br'].map(c => `<i class="sh-orn ${c}" aria-hidden="true"></i>`).join('');
    return `<div class="sh-next">${orn}${typeof shCrest === 'function' ? shCrest('mage', ' sh-next-cr') : ''}<div class="sh-next-b">
      <span class="eyebrow">${OB_TEXT.stepNext} · ${NPCS.mage ? NPCS.mage.n : ''}</span>
      <h2>${trEsc(x.h)}</h2><p>${trEsc(x.p)}</p>
      <div class="sh-next-a"><button class="btn sm" data-a="obgo" data-v="${x.go}">${OB_TEXT.toDo}</button><button class="link" data-a="sheet" data-v="level">${OB_TEXT.level} ${ic('chev')}</button></div>
    </div></div>`;
  };
}
if (typeof shActs === 'function') {
  const shActs0 = shActs;
  shActs = function () { return obOn() && obLvl() < OB_R.opensAt('nav', 'week') ? '' : shActs0(); };
}

/* ================== презентация: сценарий, карта экранов, UI-кит ================== */
/* сценарий — разовый показ нового аккаунта: режим аккаунта не меняет, «Сбросить» вернёт прежний; насовсем — переключатель «Аккаунт» */
function obShow() {
  if (!OB_R) return;
  try { if (typeof loop !== 'undefined' && loop) { clearInterval(loop); loop = null; } } catch (_) { }
  const s = obFresh(obInit0()); obSync(s); S = s; obGates();
}
if (typeof FLOWS !== 'undefined' && OB_R) FLOWS.push(['Старт с чистого листа', 'Новый аккаунт: уровень 1, окно уровня, закрытые разделы шахты; путь — до цикла II. Насовсем — «Аккаунт: Чистый лист»', () => { obShow(); }]);
if (typeof MAP !== 'undefined') { const w = MAP.find(m => m.n === 'Странник'); if (w && w.ready && !w.ready.includes('account-level')) w.ready.push('account-level'); }
function obMapHtml() {
  if (!OB_D) return '';
  const rows = OB_D.levels.map(l => `<tr><td class="num">${l.L}</td><td><b>${trEsc(l.n)}</b><br><small>${trEsc(l.why)}</small></td><td>${l.opens.map(k => trEsc(OB_D.open[k].n)).join('<br>')}</td><td>${obRewardText(l.L)}</td><td class="num">${fmt(l.xp)}</td></tr>`).join('');
  const P = OB_D.path || {}, m = P.min || {};
  return `<h2>Старт с чистого листа</h2>
    <p class="p-lead">Новый игрок за два биома цикла I знакомится со всеми механиками старта. Уровень Странника берётся, когда выполнен этап и набран опыт; каждый уровень — окно поверх экрана: «Уровень N», полученное, открывшееся голосом проводника и «Попробовать». Включить — «Аккаунт: Чистый лист» в панели прототипа.</p>
    <div class="p-kpis"><div class="p-kpi"><span class="n">${Math.round((m.b1 || 0) / 60)}<i>мин</i></span><small>боя в Мастерской форм: три забега и страж</small></div><div class="p-kpi"><span class="n">${Math.round((m.b2 || 0) / 60)}<i>мин</i></span><small>забегов в Подземном лесу: ещё трое героев, доблесть и предел</small></div><div class="p-kpi"><span class="n">10</span><small>уровней сценария; дальше — формула §16</small></div></div>
    <div class="ob-map-w"><table class="ob-map"><thead><tr><th>Ур.</th><th>Этап</th><th>Открывается</th><th>Награда</th><th>Порог</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="p-note">Данные — design/ui/start.js (сборщик tools/content-gen/start/build.js), обоснование — docs/content/старт-с-чистого-листа.md.</p>`;
}
if (typeof renderMap === 'function') {
  const map0 = renderMap;
  renderMap = function () { map0(); try { const box = document.getElementById('obMap'); if (box) box.innerHTML = obMapHtml(); } catch (_) { } };
}
/* UI-кит — образцы на героях демо (S.heroes[0], [1], [3]). У нового аккаунта героев ещё нет: кит рисуется по демо-состоянию, живое
   возвращается. Без этого запуск в «Чистом листе» обрывался на ките, и панель прототипа оставалась без обработчиков */
if (typeof renderKit === 'function') {
  const kit0 = renderKit;
  renderKit = function () {
    if (!OB_MODE || (S && S.heroes && S.heroes.length > 3)) return kit0();
    const keep = S; S = obInit0();
    try { return kit0(); } finally { S = keep; }
  };
}
/* UI-кит: окно уровня — образец на уровне 3 */
function obKitHtml() {
  if (!OB_D) return '';
  const lv = obLv(3), items = obRewardItems(3);
  return `<section class="k-box" style="grid-column:1/-1" id="kitLevel"><h3>Окно уровня</h3>
    <p class="k-note">Поверх любого экрана, кроме идущего боя; по одному, очередью. «Уровень N» и кольцо опыта, полученное — вещи выезжают по очереди и вспыхивают, открывшееся — голосом проводника, одна кнопка «Попробовать» ведёт к механике. Уровень и награду выдаёт сервер одной операцией с номером.</p>
    <div class="ob-kit"><div class="ob-card still"><div class="ob-hd"><svg class="ob-ring" viewBox="0 0 120 120"><circle class="ob-r0" cx="60" cy="60" r="${OB_VIEW.ring}"/><circle class="ob-r1" cx="60" cy="60" r="${OB_VIEW.ring}"/></svg><b class="ob-n num">3</b></div>
      <span class="eyebrow ob-ey">${OB_TEXT.level}</span><h2 class="ob-t">Уровень 3 · ${trEsc(lv.n)}</h2>
      <div class="ob-got"><span class="eyebrow">${OB_TEXT.got}</span><ul class="ob-rws">${items.map((x, i) => `<li class="ob-rw" style="--i:${i}"><span class="ob-pic">${x.pic}</span><b class="num">${x.n}</b><small>${trEsc(x.t)}</small></li>`).join('')}</ul></div>
      <div class="ob-open"><div class="ob-say"><span class="eyebrow">${OB_TEXT.open}</span><p>${trEsc(lv.say[1])}</p></div></div>
      <div class="ob-act"><button class="link" tabindex="-1">${OB_TEXT.later}</button><button class="btn go" tabindex="-1">${OB_TEXT.tryIt}</button></div></div></div>
  </section>`;
}
if (typeof KIT_EXTRA !== 'undefined') KIT_EXTRA.push({ html: obKitHtml });

/* ================== запуск ================== */
(function obBoot() {
  try {
    const box = document.getElementById('devAcc');
    if (box && box.addEventListener) box.addEventListener('click', e => { const b = e.target.closest('[data-acc]'); if (b) obSwitch(b.dataset.acc === 'fresh'); });
  } catch (_) { }
  if (OB_MODE && OB_R) { S = initialState(); }
  obGates(); obPaintAcc();
})();
