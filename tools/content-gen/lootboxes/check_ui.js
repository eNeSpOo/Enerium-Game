/* Автопроверка раздела «Лутбоксы» в UI-ките прототипа — без браузера.
   1. design/ui/index.html: концы строк — только CRLF; подключён lootboxes.js; прежних «Ларец …» нет; встроенные скрипты компилируются.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Раздел (lbHtml) рисуется на всех сундуках, редкостях, окнах, циклах и неделях, с флажками «герои пробуждены» и «для команды»:
      без исключений, без undefined и NaN, с пометкой «проба — не выдача», по строке на каждый предмет пробного открытия,
      с переводом в прах, когда герои пробуждены; без флажка «для команды» — ни одного спойлерного имени.
   3а. Призванные враги (EN_LOOTBOXES.summon): у каждого врага recipes.js — сундук своего вида, он открывается на своих циклах,
      редкость — сила врага + 1; карточка раздела называет источник; имени врага «для команды» без флажка нет.
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
  const out = { n: 0, errors: [], dust: 0, hidden: 0 };
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
      const rows = (h.match(/<li data-r=/g) || []).length;
      if (rows !== def.n) out.errors.push(key + ': строк пробного открытия ' + rows + ', предметов ' + def.n);
      const shards = E.roll(def, E.seedOf(LB.seed)).items.some(it => it.kind === 'shard');
      if (awake && shards) { if (h.includes('→ прах')) out.dust++; else out.errors.push(key + ': осколки не переведены в прах'); }
      if (!team) { const leak = spoil.filter(n => h.includes(n)); if (leak.length) out.errors.push(key + ': спойлер без флажка — ' + leak.join(', ')); }
      else if (spoil.some(n => h.includes(n))) out.hidden++;
    }
  return out;
})()`, ctx);
err.push(...res.errors.slice(0, 20));
if (res.errors.length > 20) err.push(`… и ещё ${res.errors.length - 20}`);

/* 3а. призванные враги (EN_LOOTBOXES.summon): у каждого врага recipes.js — сундук; он открывается на своих циклах; редкость — сила + 1;
   карточка раздела «Кто выдаёт» называет крафтовых боссов у сундука крафтового босса и Лика недели — у сундука осколков */
const sres = vm.runInContext(`(() => {
  const out = { n: 0, errors: [] }, S0 = LBX.summon, E = window.EnLoot;
  if (!S0 || !S0.bosses || !S0.kinds) { out.errors.push('нет EN_LOOTBOXES.summon — пересобрать лутбоксы'); return out; }
  for (const b of RX.drops.craftBosses) {
    const x = S0.bosses[b.id]; if (!x) { out.errors.push(b.id + ': нет сундука призванного врага'); continue; }
    if (!S0.kinds[x.k] || S0.kinds[x.k].box !== x.box) out.errors.push(b.id + ': вид ' + x.k + ' и сундук ' + x.box + ' расходятся');
    if (!x.byCyc && x.r !== Math.min(7, b.cyc + (b.powerCycleStep || 0) + 1)) out.errors.push(b.id + ': редкость ' + x.r + ' не по силе врага');
    const specs = x.byCyc ? Object.entries(x.byCyc).map(([c, r]) => ({ box: x.box, r, win: x.win, cyc: +c, week: LBX.weeks[0] })) : [{ box: x.box, r: x.r, win: x.win, cyc: x.pc }];
    if (!specs.length) out.errors.push(b.id + ': сундука нет ни в одном цикле');
    for (const sp of specs) {
      try { const d = E.resolve(LBX, sp); if (!d.n) out.errors.push(b.id + ': пустой сундук'); out.n++; } catch (e) { out.errors.push(b.id + ': ' + e.message); continue; }
      Object.assign(LB, { box: sp.box, r: sp.r, win: sp.win, cyc: sp.cyc, week: sp.week || 'Эльфы', awake: false, seed: 'проба-1' }); KH.team = false;
      const h = lbHtml(), who = x.byCyc ? LBX.modes.mask.n : LBX.modes.craft.n;
      if (!h.includes(who)) out.errors.push(b.id + ': карточка сундука не называет источник «' + who + '» в цикле ' + sp.cyc);
      if (b.team && h.includes(b.name)) out.errors.push(b.id + ': имя врага «для команды» в карточке без флажка');
    }
  }
  return out;
})()`, ctx);
err.push(...sres.errors.slice(0, 20));

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

console.log(`Призванных врагов: ${vm.runInContext('RX.drops.craftBosses.length', ctx)}, сундуков по циклам развёрнуто ${sres.n}.`);
console.log(`Раздел нарисован ${res.n} раз: сундуков ${vm.runInContext('Object.keys(LBX.boxes).length', ctx)}, редкостей 7, окон 3, циклов 6, недель Эхо 9; перевод в прах — ${res.dust}, со спойлерами под флажком «для команды» — ${res.hidden}.`);
done();

function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log('Проверка пройдена: синтаксис, выполнение скриптов, отрисовка раздела и листа Даров — без исключений.');
  process.exit(0);
}
