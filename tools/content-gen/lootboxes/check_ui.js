/* Автопроверка раздела «Лутбоксы» в UI-ките прототипа — без браузера.
   1. design/ui/index.html: концы строк — только CRLF; подключён lootboxes.js; прежних «Ларец …» нет; встроенные скрипты компилируются.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Раздел (lbHtml) рисуется на всех сундуках, редкостях, окнах, циклах и неделях, с флажками «герои пробуждены» и «для команды»:
      без исключений, без undefined и NaN, с пометкой «проба — не выдача», по строке на каждую запись пробного открытия —
      гарантированные (sure) первыми и с пометкой «наверняка», карточка называет их блоком «Наверняка»;
      с переводом в прах и в прах Эха, когда герои пробуждены; без флажка «для команды» — ни одного спойлерного имени.
   3а. Призванные враги (EN_LOOTBOXES.summon): у каждого КрафБосса recipes.js — сундук своей темы (ремесло цепочки) и типа, он
      открывается на цикле своей силы, редкость — сила врага + 1; карточка раздела называет источник и запись темы наверняка;
      Лик недели — сундук осколков своей недели. Имени врага «для команды» без флажка нет.
   3б. «За победу» до призыва (EN_ECHO.reward — «Сведения» предмета призыва, подтверждение, бестиарий): сундук темы назван,
      сказано, что в нём наверняка (первая гарантированная запись словом) и сколько предметов, шансы — по кнопке; имени врага
      нет ни у одного КрафБосса.
   4. renderKit() и lbPaint() — в заглушку контейнеров; лист «Дары путешествия» прототипа называет сундуки сундуками.
   Запуск: node tools/content-gen/lootboxes/check_ui.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const html = fs.readFileSync(path.join(UI, 'index.html'), 'utf8');
const err = [];

/* 1. файл */
const crlf = (html.match(/\r\n/g) || []).length, lf = (html.match(/\n/g) || []).length, cr = (html.match(/\r/g) || []).length;
if (crlf !== lf || cr !== crlf) err.push(`index.html: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}, CR ${cr}`);
if (/[Лл]арец/.test(html)) err.push('index.html: остался «Ларец» — сундуки в игре называются сундуками (§23.1)');
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
if (!scripts.some(s => s.src === 'lootboxes.js')) err.push('index.html: не подключён lootboxes.js');
for (const s of scripts) if (!s.src) { try { new vm.Script(s.code, { filename: 'index.html' }); } catch (e) { err.push('синтаксис встроенного скрипта: ' + e.message); } }
if (err.length) done();

/* 2. песочница */
const stubEl = id => ({ id, innerHTML: '', textContent: '', value: '', style: { setProperty() {} }, dataset: {}, children: [],
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x,
  insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [], closest: () => null,
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 });
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
  try { vm.runInContext(s.src ? fs.readFileSync(path.join(UI, s.src), 'utf8') : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { err.push(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();

/* 3. все сундуки, редкости, окна, циклы и недели */
const res = vm.runInContext(`(() => {
  const out = { n: 0, errors: [], dust: 0, hidden: 0, sure: 0 };
  /* спойлеры: талисманы и ресурсы «для команды», имена призванных врагов цикла VI — их строки в «Кто выдаёт» подписаны «для команды» */
  const E = window.EnLoot, spoil = Object.values(LBX.talInfo).filter(t => t[2]).map(t => t[0]).concat(Object.values(LBX.items).filter(i => i.team).map(i => i.n), RX.drops.craftBosses.filter(b => b.team).map(b => b.name));
  for (const box of Object.keys(LBX.boxes)) for (let r = 1; r <= 7; r++) for (const win of Object.keys(LBX.winNames)) for (let cyc = 1; cyc <= 6; cyc++)
    for (const week of box === 'shards' ? LBX.weeks : ['Эльфы']) for (const awake of [false, true]) for (const team of [false, true]) {
      const key = [box, r, win, cyc, week, awake ? 'пробуждены' : '', team ? 'команда' : ''].join(' · ');
      Object.assign(LB, { box, r, win, cyc, week, awake, who: (r + cyc) % 2 ? 'fan' : 'free', seed: 'проба-' + (r * 11 + cyc * 3 + (awake ? 1 : 0)) });
      KH.team = team;
      let h;
      try { h = lbHtml(); } catch (e) { out.errors.push(key + ': ' + e.message); continue; }
      out.n++;
      if (/undefined|NaN|\\[object /.test(h)) out.errors.push(key + ': в разметке undefined, NaN или объект');
      if (!h.includes('проба — не выдача')) out.errors.push(key + ': нет пометки «проба — не выдача»');
      if (!h.includes('Карточка сундука')) out.errors.push(key + ': нет карточки');
      const def = E.resolve(LBX, { box, r, win, cyc, week: box === 'shards' ? week : null });
      /* строки пробного открытия — все записи: гарантированные первыми, с пометкой; карточка называет их блоком «Наверняка» */
      const sure = (def.sure || []).length, rows = (h.match(/<li data-r=/g) || []).length;
      if (rows !== def.n + sure) out.errors.push(key + ': строк пробного открытия ' + rows + ', записей ' + (def.n + sure));
      if ((h.match(/<span class="chip gold">наверняка<\\/span>/g) || []).length !== sure) out.errors.push(key + ': пометок «наверняка» в пробном открытии не ' + sure);
      if (h.includes('<table class="rk-tab lb-tab zp-sure">') !== sure > 0) out.errors.push(key + ': блок «Наверняка» карточки ' + (sure ? 'пропал' : 'лишний'));
      if (sure) out.sure++;
      const res = E.roll(def, E.seedOf(LB.seed)), shards = (res.sure || []).concat(res.items).some(it => it.kind === 'shard' || it.kind === 'target');
      if (awake && shards) { if (h.includes('→ прах')) out.dust++; else out.errors.push(key + ': осколки не переведены ни в прах, ни в прах Эха'); }
      if (!team) { const leak = spoil.filter(n => h.includes(n)); if (leak.length) out.errors.push(key + ': спойлер без флажка — ' + leak.join(', ')); }
      else if (spoil.some(n => h.includes(n))) out.hidden++;
    }
  return out;
})()`, ctx);
err.push(...res.errors.slice(0, 20));
if (res.errors.length > 20) err.push(`… и ещё ${res.errors.length - 20}`);

/* 3а. призванные враги (EN_LOOTBOXES.summon): у каждого врага recipes.js — сундук; КрафБосс — сундук своей темы (ремесло цепочки) и
   типа; он открывается на цикле своей силы; редкость — сила + 1; карточка раздела «Кто выдаёт» называет источник — свой у каждого
   сундука темы, Лика недели — у сундука осколков; блок «Наверняка» называет линии записи темы */
const sres = vm.runInContext(`(() => {
  const out = { n: 0, errors: [], themes: {} }, S0 = LBX.summon, E = window.EnLoot;
  if (!S0 || !S0.bosses || !S0.kinds || !S0.themes || !S0.types) { out.errors.push('нет EN_LOOTBOXES.summon с темами и типами — пересобрать лутбоксы'); return out; }
  for (const b of RX.drops.craftBosses) {
    const x = S0.bosses[b.id]; if (!x) { out.errors.push(b.id + ': нет сундука призванного врага'); continue; }
    const B = LBX.boxes[x.box], K = S0.types[x.g], Th = x.th ? S0.themes[x.th] : null;
    if (!B || !K || !S0.kinds[x.k]) { out.errors.push(b.id + ': нет сундука ' + x.box + ', типа ' + x.g + ' или вида ' + x.k); continue; }
    const force = b.cyc + (b.powerCycleStep || 0);
    if (x.byCyc) { if (x.box !== K.box || S0.kinds[x.k].box !== x.box) out.errors.push(b.id + ': Лик недели платит не сундуком своего типа'); }
    else {
      /* сундук темы: тема — ремесло цепочки врага, тип — тип врага; id — сундук темы и суффикс типа */
      if (!Th || x.th !== b.spec || B.theme !== b.spec || B.type !== b.g || x.box !== Th.box + K.sfx) out.errors.push(b.id + ': сундук ' + x.box + ' — не темы «' + b.spec + '» и типа ' + b.g);
      if (x.r !== Math.min(7, force + 1) || x.pc !== Math.min(6, force)) out.errors.push(b.id + ': редкость ' + x.r + ' и цикл пула ' + x.pc + ' не по силе врага');
      if (x.win !== K.win || x.n !== K.count) out.errors.push(b.id + ': окно или число сундуков не по типу врага');
      if (B.week && !LBX.weeks.includes(x.week)) out.errors.push(b.id + ': сундук с неделей, а расы врага среди недель Эхо нет');
      if (Th) out.themes[Th.n] = (out.themes[Th.n] || 0) + 1;
    }
    const specs = x.byCyc ? Object.entries(x.byCyc).map(([c, r]) => ({ box: x.box, r, win: x.win, cyc: +c, week: LBX.weeks[0] })) : [{ box: x.box, r: x.r, win: x.win, cyc: x.pc, week: x.week || null }];
    if (!specs.length) out.errors.push(b.id + ': сундука нет ни в одном цикле');
    for (const sp of specs) {
      let d;
      try { d = E.resolve(LBX, sp); if (!(d.n + d.sure.length)) out.errors.push(b.id + ': пустой сундук'); out.n++; } catch (e) { out.errors.push(b.id + ': ' + e.message); continue; }
      if (!x.byCyc && d.n + d.sure.length !== K.total) out.errors.push(b.id + ': записей в сундуке ' + (d.n + d.sure.length) + ', по типу — ' + K.total);
      Object.assign(LB, { box: sp.box, r: sp.r, win: sp.win, cyc: sp.cyc, week: sp.week || 'Эльфы', awake: false, seed: 'проба-1' }); KH.team = false;
      const h = lbHtml(), who = LBX.modes[x.byCyc ? 'mask' : x.box];
      if (!who || !h.includes(who.n)) out.errors.push(b.id + ': карточка сундука не называет источник «' + (who ? who.n : x.box) + '» в цикле ' + sp.cyc);
      if (b.team && h.includes(b.name)) out.errors.push(b.id + ': имя врага «для команды» в карточке без флажка');
      if (!h.includes('Наверняка')) out.errors.push(b.id + ': карточка сундука не называет, что в нём наверняка');
      if (Th && !d.sure.some(g => g.byR && g.set.every(ln => Th.sure.includes(ln)))) out.errors.push(b.id + ': в сундуке нет записи темы «' + Th.n + '» наверняка');
      if (Th) for (const ln of Th.sure) if (d.sure.some(g => g.byR && Object.values(g.byR).some(ls => ls.some(l => l.line === ln))) && !h.includes(LBX.lines[ln].n)) out.errors.push(b.id + ': карточка не называет линию темы «' + LBX.lines[ln].n + '»');
    }
  }
  if (Object.keys(out.themes).length !== Object.keys(S0.themes).length) out.errors.push('тем у врагов ' + Object.keys(out.themes).length + ', в данных — ' + Object.keys(S0.themes).length + ': у темы нет ни одного врага');
  return out;
})()`, ctx);
err.push(...sres.errors.slice(0, 20));

/* 3б. «За победу» до призыва — «Сведения» предмета призыва, подтверждение призыва, бестиарий (screens/echo.js, EN_ECHO.reward): сундук
   темы назван по имени, сказано, что в нём наверняка, шансы — по кнопке; имени врага нет (§12.5): ни у одного КрафБосса */
const rres = vm.runInContext(`(() => {
  const out = { n: 0, errors: [] }, S0 = LBX.summon;
  if (!window.EN_ECHO || typeof EN_ECHO.reward !== 'function' || typeof EN_ECHO.chest !== 'function') { out.errors.push('нет EN_ECHO.reward и EN_ECHO.chest — экран Эхо не подключён'); return out; }
  if (!S0 || !S0.bosses || !S0.themes) { out.errors.push('нет EN_LOOTBOXES.summon с темами'); return out; }
  for (const team of [false, true]) for (const b of RX.drops.craftBosses) {
    KH.team = team;
    const x = S0.bosses[b.id]; if (!x || x.byCyc) continue;
    const key = b.id + (team ? ' · команда' : ''), B = LBX.boxes[x.box], Th = S0.themes[x.th], K = S0.types[x.g];
    let h, ch;
    try { ch = EN_ECHO.chest(b, LBX.weeks[0], S.acc.cycle); h = EN_ECHO.reward(b, LBX.weeks[0], S.acc.cycle); } catch (e) { out.errors.push(key + ': ' + e.message); continue; }
    out.n++;
    if (!ch || ch.box !== x.box || ch.r !== x.r || ch.win !== x.win || ch.cyc !== x.pc || (B.week ? ch.week !== x.week : !!ch.week)) { out.errors.push(key + ': сундук «За победу» — не сундук врага по данным'); continue; }
    if (/undefined|NaN|\\[object /.test(h)) out.errors.push(key + ': в разметке undefined, NaN или объект');
    if (!h.includes(B.n)) out.errors.push(key + ': «За победу» не называет сундук темы «' + B.n + '»');
    /* что наверняка — первая гарантированная запись словом: из одной линии — её имя, из нескольких — тема словом */
    const d = window.EnLoot.resolve(LBX, { box: x.box, r: x.r, win: x.win, cyc: x.pc, week: x.week || null }), g0 = d.sure[0];
    const lines0 = g0 && g0.byR ? [...new Set(Object.values(g0.byR).flat().map(l => l.line))] : [], n0 = lines0.length === 1 ? LBX.lines[lines0[0]].n : '';
    const word = n0 ? n0.charAt(0).toLowerCase() + n0.slice(1) : Th.what;
    if (!g0 || !lines0.every(ln => Th.sure.includes(ln))) out.errors.push(key + ': первая гарантированная запись сундука — не запись темы');
    if (!h.includes('наверняка — ' + word)) out.errors.push(key + ': «За победу» не говорит, что в сундуке наверняка — ' + word);
    if (!h.includes('data-a="echbox" data-v="boss:' + b.id + ':')) out.errors.push(key + ': нет кнопки шансов сундука');
    if (h.includes(b.name)) out.errors.push(key + ': «За победу» называет врага по имени до призыва');
    if (!new RegExp('(^|[^0-9])' + K.total + ' предмет').test(h)) out.errors.push(key + ': «За победу» не называет число предметов сундука — ' + K.total);
  }
  KH.team = false;
  return out;
})()`, ctx);
err.push(...rres.errors.slice(0, 20));

/* 4. раздел целиком и лист Даров прототипа */
try {
  vm.runInContext('renderKit(); lbPaint();', ctx);
  const grid = els.kitGrid ? els.kitGrid.innerHTML : '', loot = els.kitLoot ? els.kitLoot.innerHTML : '';
  if (!grid.includes('id="kitLoot"')) err.push('renderKit: нет раздела «Лутбоксы»');
  if (!loot.includes('Карточка сундука')) err.push('lbPaint: раздел пустой');
} catch (e) { err.push('renderKit и lbPaint: ' + e.message); }
try {
  const g = vm.runInContext('OV.gifts()', ctx);
  if (!/Сундук осколков/.test(g) || /Ларец/.test(g)) err.push('лист «Дары путешествия»: сундуки названы не сундуками');
} catch (e) { err.push('лист «Дары путешествия»: ' + e.message); }

console.log(`Призванных врагов: ${vm.runInContext('RX.drops.craftBosses.length', ctx)}, сундуков по циклам развёрнуто ${sres.n}; тем — ${Object.entries(sres.themes || {}).map(([n, k]) => n + ' ' + k).join(', ')}; «За победу» до призыва показано ${rres.n} раз — без имени врага.`);
console.log(`Раздел нарисован ${res.n} раз: сундуков ${vm.runInContext('Object.keys(LBX.boxes).length', ctx)}, редкостей 7, окон 3, циклов 6, недель Эхо 9; перевод в прах — ${res.dust}, с гарантированными записями — ${res.sure}, со спойлерами под флажком «для команды» — ${res.hidden}.`);
done();

function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log('Проверка пройдена: синтаксис, выполнение скриптов, отрисовка раздела и листа Даров — без исключений.');
  process.exit(0);
}
