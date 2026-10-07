/* Автопроверка экрана «Неделя» прототипа «Свет снизу» (design/ui/screens/week.js) — без браузера.
   1. week.js и week.css на месте и компилируются; index.html подключает week.css и week.js после model.js и до bag.js;
      прежнего экрана недели — weekView, WEEKLY и его стилей — в index.html нет; концы строк index.html, week.js и week.css — CRLF.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Реестр WEEK_MODES: шесть режимов недели — id из EN_LOOTBOXES.modes (седьмым может встать режим ритуалов, когда его экран
      сообщит ступени загрузки); now() и past() на девяти неделях и шести циклах отдают
      только целые: место от 1 или пусто, очки от 0, планки по возрастанию, ближайшая — первая невзятая, лидеры по убыванию,
      я — ниже тройки или в ней на своём месте; до цикла режима — «рейтинг с цикла II». Прошлая неделя сходится с «Дарами»:
      сундуки режима — ровно строки «Даров» прошлой недели. Настоящий режим заменяет демо, демо не заменяет настоящий,
      сбой режима не ломает экран.
   3а. Лестница планок (ADR-0047) — законы Л1–Л4 общие с проверками экранов режимов (ladder_laws.js) и Л5; Л1–Л4 проверены мутацией
      (флаг --mut печатает, какой закон поймал каждую поломку):
      Л1 — личные планки режима в реестре — та же лестница, что даёт EnLoot.ladder для цикла игрока, и та же, что эталон правила
           по данным EN_LOOTBOXES: сквозной номер, полоса, ступень в полосе, потолок, сундуки ступени — своей полосы;
      Л2 — пороги: в своих единицах — at строки; иначе — первая планка цикла игрока × множитель ступени: первая планка следующей
           полосы — ×next от верхней своей, дальше тем же шагом; пороги растут;
      Л3 — замка по циклу нет: планка следующей полосы взята, как только набран её порог, — без перехода в новый цикл; ближайшая
           невзятая за верхней планкой своей полосы — первая планка следующей, и строка режима ведёт полосу к ней с её сундуком;
      Л4 — в листе режима видны все пять полос: прошлые — одной строкой «пройдено», своя — строками с порогом и сундуком цвета
           редкости, будущие — с порогом первой планки и сундуками полосы (свёрнуты или раскрыты, если игрок по ним идёт),
           потолок — отдельной строкой; в лестнице нет ни замка, ни «откроется с цикла»;
      Л5 — пороги демо-строк и помощника EN_WEEK.steps — из данных режимов: копии чисел в экране нет.
   4. Экран: три времени на девяти неделях и шести циклах. Эта — раса и цивилизация Эхо, срок до отсечки, «Дары» с числом сундуков,
      как в bag.js, шесть строк режимов и ритуалы; прошлая — прошлая раса, сундуки и Энериум итога; следующая — следующая раса,
      цивилизация, нашествие, герои Эхо недели и их неприязнь.
   5. Правила воздуха (ADR-0026): на строке режима — не больше двух чисел, двух чипов и двух кнопок. Переход в режим — явный (слово
      автора 29.09.2026): строка со «›» открывает сведения — лист режима, в режим ведёт кнопка «Войти» с дверью в строке этой недели и
      в листе; «›» на «Войти» нет, у прошлой недели «Войти» нет; ритуалы — строка «Войти» без листа.
   6. Листы: режим на эту и прошлую неделю, итог, сроки, следующая неделя, «Рейтинг» с других экранов и его вкладки.
   7. Везде: без исключений, undefined, NaN и [object; в режиме «Игрок» — ни служебных слов (SERVICE из check_player_view.js),
      ни тем «для команды» из «Отрядов Эхо», ни спойлеров.
   8. UI-кит — раздел «Неделя · три времени»; карта экранов — ready у «Недели» и «Эха»; сценарии презентации недели.
   Запуск: node tools/content-gen/screens/check_week.js [--mut] */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const err = [];
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };

/* 1. файлы и подключение */
for (const f of ['screens/week.js', 'screens/week.css']) if (!fs.existsSync(path.join(UI, f))) say('нет ' + f);
if (err.length) done();
try { new vm.Script(read('screens/week.js'), { filename: 'screens/week.js' }); } catch (e) { say('screens/week.js: синтаксис — ' + e.message); }
for (const [name, s] of [['index.html', html], ['screens/week.js', read('screens/week.js')], ['screens/week.css', read('screens/week.css')]]) {
  const crlf = (s.match(/\r\n/g) || []).length, lf = (s.match(/\n/g) || []).length, cr = (s.match(/\r/g) || []).length;
  if (crlf !== lf || cr !== crlf) say(`${name}: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}, CR ${cr}`);
}
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
const order = scripts.map(s => s.src || 'inline'), iMain = order.lastIndexOf('inline'), iModel = order.indexOf('screens/model.js'), iWeek = order.indexOf('screens/week.js'), iBag = order.indexOf('screens/bag.js');
if (iWeek < 0) say('index.html: не подключён screens/week.js');
else if (!(iMain < iModel && iModel < iWeek && (iBag < 0 || iWeek < iBag))) say('index.html: нужен порядок «основной скрипт → model.js → week.js → bag.js»: bag.js оборачивает экран недели');
if (!html.includes('href="screens/week.css"')) say('index.html: не подключён screens/week.css');
const inline = scripts.filter(s => !s.src).map(s => s.code).join('\n');
if (/\bweekView\b|\bWEEKLY\b/.test(inline)) say('index.html: остался прежний экран недели — weekView или WEEKLY');
if (/\.wk-head\b|\.phases\b|(^|\n)\s*\.mode\s*[{.:]/.test(html.slice(0, html.indexOf('</style>')))) say('index.html: остались стили прежнего экрана недели');
for (const s of scripts) if (!s.src) { try { new vm.Script(s.code, { filename: 'index.html' }); } catch (e) { say('синтаксис встроенного скрипта: ' + e.message); } }
if (err.length) done();

/* 2. песочница */
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
/* текст игрока: служебные слова, темы «для команды», спойлеры — проверяются здесь, в Node */
const seen = new Set();
let TEAM = [];
win.__scan = (key, h) => {
  if (typeof h !== 'string') { say(`${key}: разметка не строка`); return; }
  const bad = h.match(/.{0,50}(?:undefined|NaN|\[object ).{0,30}/); if (bad) say(`${key}: undefined, NaN или [object — «${bad[0]}»`);
  const i = h.indexOf('<main'), part = i < 0 ? h : h.slice(i), v = strip(part);
  const txt = playerText(part).split('\n').concat([...v.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => m[1]));
  for (const t of txt) {
    for (const [what, re] of SERVICE) { const k = what + '|' + t; if (re.test(t) && !seen.has(k)) { seen.add(k); say(`${key}: игроку видно служебное (${what}) — «${t.slice(0, 110)}»`); } }
    const leak = TEAM.filter(x => t.includes(x)); if (leak.length && !seen.has('team|' + t)) { seen.add('team|' + t); say(`${key}: игроку видно «для команды» — ${leak.join(', ')}`); }
    if (/(^|[^а-яё])мать([^а-яё]|$)|Иридиум/i.test(t) && !seen.has('sp|' + t)) { seen.add('sp|' + t); say(`${key}: спойлер в тексте игрока — «${t.slice(0, 80)}»`); }
  }
};
win.__player = h => playerText(h);
win.__LAD = require('./ladder_laws.js');   // законы лестницы планок (ADR-0047) — общие с проверками экранов режимов
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
TEAM = vm.runInContext('RS.weeks.map(w => w.team && w.team.theme).filter(Boolean)', ctx);

/* 3–8. сценарии — выполняются внутри песочницы */
function suite() {
  const out = { errors: [], views: 0, sheets: 0, states: 0, rows: 0, ladders: 0, roads: 0, mut: '', mutLog: [] };
  const fail = m => { if (out.errors.length < 80) out.errors.push(m); };
  /* шесть режимов недели — обязательны; EXTRA — режимы с лестницей, чей экран может встать в реестр своей строкой (ритуалы) */
  const W = window.EN_WEEK, IDS = ['echo', 'event', 'contract', 'clan', 'arena', 'league'], EXTRA = ['ritual'], NAMES = { echo: 'Эхо', event: 'Событие', contract: 'Контракты', clan: 'Клановый босс', arena: 'Арена', league: 'Лига' };
  if (!W || !Array.isArray(window.WEEK_MODES)) { fail('нет EN_WEEK или WEEK_MODES'); return out; }
  if (!window.EnLoot || typeof EnLoot.ladder !== 'function') { fail('нет EnLoot.ladder — лестницу планок не сверить'); return out; }
  for (const f of ['steps', 'ladderHtml', 'clanSteps', 'clanHtml']) if (typeof W[f] !== 'function') { fail(`EN_WEEK: нет общего помощника лестницы ${f}`); return out; }

  /* ---------- лестница планок (ADR-0047): эталон правила и законы Л1–Л4 — общие с проверками экранов режимов (ladder_laws.js) ---------- */
  const LAD0 = EnLoot.ladder, LL = __LAD, topR = LL.topR;   // LAD0 — алгоритм прототипа до мутаций
  const refLadder = (id, c) => LL.ref(LBX, id, c);
  const ladderLaw = (key, st, c) => LL.stateLaw(LBX, key, st, c, LAD0);     // Л1–Л3 по состоянию режима
  const roadLaw = (key, h, st, c) => LL.roadLaw(LBX, key, h, st, c);        // Л4 по разметке листа режима
  const draw = key => { render(); out.views++; const h = document.getElementById('game').innerHTML; __scan(key, h); return h; };
  const isInt = v => Number.isInteger(v);
  const reset = (race, c) => { S = initialState(); if (race) rsSetWeek(race); if (c) S.acc.cycle = c; S.overlay = null; S.route = 'week'; };
  const darPrev = id => darRows(S).filter(p => p.id === id && p.wk.id === 'prev');
  const count = ps => ps.reduce((a, p) => a + p.groups.reduce((b, g) => b + g.count, 0), 0);
  const chests = n => `${fmt(n)} ${plural(n, 'сундук', 'сундука', 'сундуков')}`;
  /* части разметки: строки режимов — по одной на режим */
  const rowsOf = h => h.split('<div class="wk-row').slice(1).map(x => { const end = x.search(/<div class="wk-row|<\/div>\s*(?:<button class="wk-rit[ "]|<p |<\/section>)/); return '<div class="wk-row' + (end < 0 ? x : x.slice(0, end)); });

  /* 3. реестр: шесть режимов недели, порядок — по order; строку режима может дать его экран (не демо) — тогда демо-проверки
     этого файла к ней не применяются, но договор реестра — целые, порядок планок и лидеров — тот же */
  const M = W.modes(), ORDER = M.map(m => m.id), SNAP = M.map(m => m.id + (m.demo ? ':demo' : '')).join();
  if (IDS.some(id => !ORDER.includes(id)) || ORDER.some(id => !IDS.includes(id) && !EXTRA.includes(id))) fail(`реестр: режимы ${ORDER.join(', ')}, ждали ${IDS.join(', ')}${EXTRA.length ? ' и, может быть, ' + EXTRA.join(', ') : ''}`);
  for (const m of M) {
    if (!LBX.modes[m.id] || !LBX.modes[m.id].weekly) fail(`реестр: ${m.id} — не недельный режим EN_LOOTBOXES`);
    if (NAMES[m.id] ? m.n !== NAMES[m.id] : m.n !== LBX.modes[m.id].n) fail(`реестр: ${m.id} зовётся «${m.n}»`);
    if (!m.go || !SCREENS[m.go.split(':')[0]]) fail(`реестр: ${m.id} ведёт на неизвестный экран «${m.go}»`);
  }
  /* состояние режима: только целые, порядок, согласованность; у демо — ещё сходство с «Дарами» и экранами режимов */
  function checkState(key, st, c) {
    out.states++;
    const M0 = LBX.modes[st.m.id], demo = !!st.m.demo;
    if (demo && c < M0.from) { if (!st.lock) fail(`${key}: рейтинг до цикла ${ROMAN[M0.from]} не закрыт`); return; }
    if (st.lock) { if (demo && !(st.m.id === 'league' && st.t === 'now')) fail(`${key}: закрыт без причины — «${st.lock}»`); return; }
    if (st.place != null && !(isInt(st.place) && st.place >= 1)) fail(`${key}: место ${st.place}`);
    if (!isInt(st.points) || st.points < 0) fail(`${key}: очки ${st.points}`);
    if (!isInt(st.have)) fail(`${key}: прогресс к планке ${st.have}`);
    st.planks.forEach((p, i) => {
      if (!isInt(p.need) || p.need <= 0) fail(`${key}: порог планки ${i + 1} — ${p.need}`);
      if (i && p.need <= st.planks[i - 1].need) fail(`${key}: планки не по возрастанию`);
      if (p.reached !== (st.have >= p.need)) fail(`${key}: планка ${i + 1} взята неверно`);
      p.pay.forEach(g => { if (!isInt(g.r) || !isInt(g.count) || g.count < 1) fail(`${key}: сундук планки ${i + 1}`); });
    });
    const nx = st.planks.find(p => !p.reached) || null;
    if (st.planks.length && (nx ? !st.next || st.next.need !== nx.need : st.next)) fail(`${key}: ближайшая планка — не первая невзятая`);
    const B = st.board;
    B.rows.forEach((r, i) => { if (!isInt(r.v) || r.place !== i + 1 || (i && r.v > B.rows[i - 1].v)) fail(`${key}: лидеры не по убыванию или места не по порядку`); });
    if (B.me && (B.me.place <= B.rows.length || B.me.v > (B.rows.length ? B.rows[B.rows.length - 1].v : Infinity))) fail(`${key}: «я» ниже тройки, но очков больше`);
    if (st.place != null && !B.rows.some(r => r.me) && !B.me) fail(`${key}: у места нет строки «я» в лидерах`);
    st.rewards.forEach(r => r.groups.forEach(g => { if (!isInt(g.r) || !isInt(g.count) || g.count < 1) fail(`${key}: сундук награды «${r.label}»`); }));
    st.cur.forEach(([k, n]) => { if (!CUR[k] || !isInt(n) || n <= 0) fail(`${key}: валюта ${k} ${n}`); });
    if (!demo) return;
    if (st.t === 'past') {
      const want = count(darPrev(st.m.id)), got = st.rewards.reduce((a, r) => a + r.groups.reduce((b, g) => b + g.count, 0), 0);
      if (want !== got) fail(`${key}: сундуков ${got}, а в «Дарах» прошлой недели — ${want}`);
      const pl = darPrev(st.m.id).find(p => p.kind === 'place');
      if (pl && st.place !== pl.place) fail(`${key}: место ${st.place}, а в «Дарах» — ${pl.place}`);
      if (st.m.id === 'arena') { const en = W.data.past.arena.days.reduce((a, p) => a + W.enOf(p), 0), got2 = (st.cur.find(x => x[0] === 'enerium') || [0, 0])[1]; if (en !== got2) fail(`${key}: Энериум Арены ${got2}, ждали ${en}`); }
    }
    if (st.m.id === 'echo' && st.t === 'now' && st.points !== S.echo.score) fail(`${key}: очки Эхо ${st.points}, а на экране Эхо — ${S.echo.score}`);
    if (st.m.id === 'event' && st.t === 'now' && st.points !== S.event.pts) fail(`${key}: очки События ${st.points}, а на экране События — ${S.event.pts}`);
  }
  /* строка режима: два числа, два чипа, две кнопки (правила воздуха) */
  function checkRow(key, row) {
    out.rows++;
    const txt = __player(row), nums = txt.match(/\d[\d\s ]*/g) || [];
    if (nums.length > 2) fail(`${key}: на строке ${nums.length} чисел — «${txt.replace(/\s+/g, ' ').slice(0, 90)}»`);
    const chips = (row.match(/class="(?:chip|well|el |rar)/g) || []).length;
    if (chips > 2) fail(`${key}: на строке ${chips} чипов`);
    const btns = (row.match(/<button/g) || []).length;
    if (btns > 2) fail(`${key}: на строке ${btns} кнопок`);
  }

  for (const w of RS.weeks) for (let c = 1; c <= 6; c++) {
    const key = `${w.race} · цикл ${ROMAN[c]}`;
    try {
      reset(w.race, c);
      const WK3 = W.weeks();
      if (WK3.cur !== w) fail(`${key}: текущая неделя — не ${w.race}`);
      for (const id of ORDER) for (const t of ['now', 'past']) checkState(`${key} · ${id} · ${t}`, W.state(id, t), c);
      /* лестница планок: личные планки режима — ступени его лестницы на все циклы (Л1–Л3) */
      for (const id of ORDER) { const st = W.state(id, 'now'); if (LBX.modes[id].ladder && !st.lock && st.planks.length) out.ladders++; ladderLaw(`${key} · ${id}`, st, c).forEach(fail); }

      /* эта неделя */
      S.seg.week = 'now';
      let h = draw(key + ' · эта неделя');
      if (!h.includes(`Неделя ${w.gen}`) || !h.includes(w.civ)) fail(`${key}: на «Этой неделе» нет расы или цивилизации`);
      if (!h.includes('data-cd="week"') || !h.includes('До отсечки')) fail(`${key}: нет срока до отсечки`);
      const ok = darRows(S).filter(p => p.st === 'ok');
      if (!h.includes(`<small>${chests(darCount(ok))}</small>`)) fail(`${key}: у «Даров» не ${chests(darCount(ok))}`);
      /* ритуалы: их экран сообщил ступени загрузки в реестр — у них своя строка режима с «Войти», второй строки под режимами нет;
         пока не сообщил — строка под режимами, она сама ведёт в ритуалы */
      if (ORDER.includes('ritual')) { if (/class="wk-rit[ "]/.test(h)) fail(`${key}: у ритуалов своя строка режима — строки под режимами быть не должно`); }
      else if (!/class="wk-rit[ "]/.test(h) || !h.includes('data-v="rituals"')) fail(`${key}: нет строки ритуалов`);
      else if (!/<button class="wk-rit[^"]*" data-a="go" data-v="rituals"[\s\S]*?class="wk-enter">[\s\S]*?Войти<\/span><\/button>/.test(h)) fail(`${key}: у ритуалов нет «Войти»`);
      let rows = rowsOf(h);
      if (rows.length !== ORDER.length) fail(`${key}: строк режимов ${rows.length}`);
      rows.forEach((r, i) => {
        const id = ORDER[i];
        if (!r.includes(`data-mode="${id}"`) || !r.includes(`data-v="wkmode:${id}:now"`)) fail(`${key}: строка ${i + 1} — не ${id}`);
        if (!r.includes(`data-a="go" data-v="${M[i].go}"`)) fail(`${key}: у строки ${id} нет перехода в режим`);
        const main = (r.match(/<button class="wk-main"[\s\S]*?<\/button>/) || [''])[0], go = (r.match(/<button class="wk-go"[\s\S]*?<\/button>/) || [''])[0];
        if (!main.includes(`data-v="wkmode:${id}:now"`) || !main.includes('#i-chev')) fail(`${key}: у строки ${id} «›» не ведёт к сведениям`);
        if (!go.includes('data-a="go"') || !go.includes('#i-door') || !/>Войти</.test(go) || go.includes('#i-chev')) fail(`${key}: у строки ${id} нет явной кнопки «Войти»`);
        checkRow(`${key} · ${id} · эта`, r);
      });
      const e = W.state('echo', 'now'), re = rows[ORDER.indexOf('echo')] || '';
      if (!e.lock && e.next && !re.includes('class="bar')) fail(`${key}: у Эхо нет полосы до планки`);

      /* прошлая неделя: итог — сундуки всех строк «Даров» прошлой недели и Энериум */
      S.seg.week = 'past';
      h = draw(key + ' · прошлая');
      if (!h.includes(`Неделя ${WK3.prev.gen}`) || !h.includes(WK3.prev.civ)) fail(`${key}: на «Прошлой» нет прошлой расы или цивилизации`);
      /* итог — сумма строк режимов: у демо это ровно «Дары» прошлой недели; Энериум — валюта строк */
      const PS = ORDER.map(id => W.state(id, 'past')), T = W.pastSum();
      const all = PS.reduce((a, st) => a + (st.m.demo ? count(darPrev(st.m.id)) : st.rewards.reduce((b, r) => b + r.groups.reduce((x, g) => x + g.count, 0), 0)), 0);
      const en = PS.reduce((a, st) => a + (st.cur.find(x => x[0] === 'enerium') || [0, 0])[1], 0);
      if (T.chests !== all) fail(`${key}: итог — ${T.chests} сундуков, по строкам и «Дарам» прошлой недели — ${all}`);
      if ((T.cur.enerium || 0) !== en) fail(`${key}: Энериум итога ${T.cur.enerium || 0}, по строкам — ${en}`);
      if (!h.includes(`<b class="num">${fmt(T.chests)}</b>`) || !h.includes(`<b class="num">${fmt(en)}</b><small>Энериума</small>`)) fail(`${key}: в итоге не видно сундуков или Энериума`);
      rows = rowsOf(h);
      if (rows.length !== ORDER.length) fail(`${key}: строк прошлой недели ${rows.length}`);
      rows.forEach((r, i) => { if (!r.includes(`data-v="wkmode:${ORDER[i]}:past"`)) fail(`${key}: прошлая, строка ${i + 1} — не ${ORDER[i]}`); if (r.includes('data-a="go"') || r.includes('>Войти<')) fail(`${key}: у прошлой недели — переход в режим`); if (!r.includes('#i-chev')) fail(`${key}: прошлая, строка ${ORDER[i]} без «›» к сведениям`); checkRow(`${key} · ${ORDER[i]} · прошлая`, r); });

      /* следующая неделя */
      S.seg.week = 'next';
      h = draw(key + ' · следующая');
      const N = WK3.next;
      if (!h.includes(`Неделя ${N.gen}`) || !h.includes(N.civ) || !h.includes(N.raid)) fail(`${key}: на «Следующей» нет расы, цивилизации или нашествия`);
      for (const id of N.squad) if (RSI[id] && !h.includes(trEsc(RSI[id].n))) fail(`${key}: на «Следующей» нет героя Эхо ${RSI[id].n}`);
      const av = N.squad.map(id => RSI[id]).find(x => x && x.avers && x.avers.race);
      /* неприязнь — по циклу героя (ADR-0054): строка отряда — от первого героя до пятого (rsAversSquad, index.html) */
      if (av && !h.includes(rsAversSquad(N.squad.map(id => RSI[id])))) fail(`${key}: на «Следующей» нет неприязни героев недели`);
      if (!h.includes('Начнётся через')) fail(`${key}: не сказано, когда начнётся следующая неделя`);

      /* листы */
      const sheets = [['wkpast'], ['wkclock'], ['wknext'], ['echweek']].concat(ORDER.flatMap(id => [['wkmode', id + ':now'], ['wkmode', id + ':past']]), M.flatMap(m => [['rank', m.n], ['rank', m.n, 'past']]));
      for (const [t, arg, rt] of sheets) {
        S.route = 'week'; S.seg.week = 'now'; S.overlay = { t, arg }; if (rt) S.overlay.rt = rt;
        h = draw(`${key} · лист ${t} ${arg || ''} ${rt || ''}`); out.sheets++;
        if (!h.includes('class="ov"')) fail(`${key}: лист ${t} ${arg || ''} не открылся`);
      }
      for (const m of M) { S.overlay = { t: 'wkmode', arg: m.id + ':now' }; const s = draw(`${key} · ${m.id} · лист · вход`), f = s.slice(s.indexOf('class="sheet-f"'));
        if (!f.includes(`data-a="go" data-v="${m.go}"`) || !f.includes(`Войти в «${m.n}»`)) fail(`${key}: в листе ${m.id} нет «Войти в «${m.n}»»`);
        /* лестница в листе режима: все пять полос, пороги, сундуки, без замка (Л4); клановые планки — строками, если режим их ведёт */
        const st = W.state(m.id, 'now'), bad = roadLaw(`${key} · ${m.id} · лист`, s, st, c);
        if (LBX.modes[m.id].ladder && !st.lock && st.planks.length) out.roads++;
        bad.forEach(fail);
        if (!st.lock && st.clanPlanks.length && (s.split('<div class="wk-ld clan"')[1] || '').split('<div class="wk-ld-st').length - 1 !== st.clanPlanks.length) fail(`${key}: в листе ${m.id} не все клановые планки`); }
      S.overlay = { t: 'wkpast' }; h = draw(key + ' · итог');
      if (c >= 2 && !h.includes('data-v="gifts:me"')) fail(`${key}: из итога нет перехода в «Дары»`);
    } catch (x) { fail(key + ': исключение — ' + (x && x.stack ? x.stack.split('\n').slice(0, 3).join(' | ') : x)); }
  }

  /* Л5. Пороги — из данных режимов, копии чисел в экране нет (ADR-0031): первая планка цикла — контракты EN_CONTRACTS.planks, Арена и Лига
     EN_ARENA.arena.plank и .league.plank, Эхо — echo-rules.js (plank1), Событие — EN_EVENT.planks; дальше × множитель ступени лестницы.
     Помощник EN_WEEK.steps даёт эти пороги сам; демо-строки Недели — те же */
  reset();
  if ('plank' in W.data) fail('Неделя: в WK остались свои пороги планок (WK.plank)');
  const P1 = { contract: c => (window.EN_CONTRACTS.planks[c] || [])[0], arena: () => window.EN_ARENA.arena.plank, league: () => window.EN_ARENA.league.plank,
    echo: c => window.EN_ECHO_RULES.plank1[c], event: c => (window.EN_EVENT.planks[c] || [])[0] };
  const needsOf = (id, c) => { const ref = refLadder(id, c), p1 = P1[id](c); return ref.map(r => p1 * r.x / ref[0].x); };
  for (const id of Object.keys(P1)) for (let c = LBX.modes[id].from; c <= 6; c++) {
    const want = needsOf(id, c), got = W.steps(id, { cycle: c }).map(s => s.need);
    if (!want.length || want.join() !== got.join()) fail(`Л5 · ${id}, цикл ${ROMAN[c]}: пороги помощника ${got.slice(0, 7).join('/')}…, по данным режима ${want.slice(0, 7).join('/')}…`);
  }
  for (const id of ['contract', 'arena', 'league']) {
    const dm = window.WEEK_MODES.find(m => m.id === id && m.demo); if (!dm) { fail(`Неделя: нет демо-строки ${id}`); continue; }
    const want = needsOf(id, S.acc.cycle), got = dm.now.call(dm), needs = got && got.planks ? got.planks.map(p => p.need) : [];
    if (id !== 'league' || !got.lock) { if (needs.join() !== want.join()) fail(`Л5 · демо ${id} — пороги ${needs.slice(0, 7).join('/')}…, в данных ${want.slice(0, 7).join('/')}…`); }
  }
  /* помощник лестницы — договор для экранов режимов: plank1 — первая планка цикла игрока, needs — готовые пороги своей полосы (дальше —
     множителем от первой), have — сколько набрано, cycle — цикл игрока; порог в своих единицах — at строки, продолжения нет */
  {
    const a = W.steps('event', { cycle: 3, plank1: 100, have: 250 }), ra = refLadder('event', 3);
    if (a.length !== ra.length || a.some((s, j) => s.need !== 100 * ra[j].x) || a.filter(s => s.reached).length !== ra.filter(r => 100 * r.x <= 250).length) fail('EN_WEEK.steps: plank1 и have — пороги не «первая планка × множитель» или «взята» не по набранному');
    const own = [10, 25, 50, 100, 200], b = W.steps('contract', { cycle: 2, needs: own }), rb = refLadder('contract', 2);
    if (b.slice(0, own.length).map(s => s.need).join() !== own.join() || (b[own.length] && b[own.length].need !== own[0] * rb[own.length].x / rb[0].x)) fail('EN_WEEK.steps: needs — своя полоса не из списка режима или продолжение не множителем от первой');
    if (['k', 'band', 'i', 'need', 'pay', 'reached', 'cap'].some(f => !(f in (a[0] || {})))) fail('EN_WEEK.steps: у ступени нет полей k, band, i, need, pay, reached, cap');
    if (W.steps('нет-такого', {}).length || W.steps('clan', { cycle: 2 }).length) fail('EN_WEEK.steps: без режима или без первой планки — не пусто: пусто лучше неверного порога');
    /* ритуалы: порог — загрузка мест, в своих единицах: ступени только своей полосы, будущие полосы видны с теми же порогами */
    const MR = LBX.modes.ritual;
    if (MR && MR.ladder) {
      const lyR = MR.layers.find(l => l.id === MR.ladder.layer), at = lyR.rows.map(r => r.at), c0 = MR.from, r = W.steps('ritual', { cycle: c0, have: at[1] });
      if (r.map(s => s.need).join() !== at.join() || r.filter(s => s.reached).length !== 2 || r.some(s => s.band !== c0)) fail(`EN_WEEK.steps: ритуалы — пороги ${r.map(s => s.need).join('/')}, в данных загрузка ${at.join('/')}`);
      const hr = W.ladderHtml('ritual', { cycle: c0, have: at[1] }), st = { m: { id: 'ritual' }, lock: '', planks: r, have: at[1], next: r.find(s => !s.reached) || null };
      __scan('лестница ритуалов', hr);
      roadLaw('лестница ритуалов', hr, st, c0).forEach(fail);
      if (!hr.includes(`${fmt(at[0])} %`) || /без перехода/.test(hr)) fail('лестница ритуалов: порог не в процентах или обещано продолжение по очкам');
    }
    /* клановые ступени кланового босса — по кругам: порог — своя единица строки */
    const lc = LBX.modes.clan && LBX.modes.clan.layers.find(l => l.kind === 'plank' && l.clan);
    if (lc && lc.rows[0].at != null) {
      const k = W.clanSteps('clan', { cycle: 2, have: lc.rows[0].at });
      if (k.map(s => s.need).join() !== lc.rows.map(r => r.at).join() || k.filter(s => s.reached).length !== 1) fail('EN_WEEK.clanSteps: клановые ступени босса — не по кругам из данных');
      const hk = W.clanHtml('clan', { cycle: 2, have: lc.rows[0].at });
      __scan('клановые ступени босса', hk);
      if ((hk.match(/class="wk-ld-st/g) || []).length !== lc.rows.length || !hk.includes(plural(lc.rows[0].at, ...lc.unit))) fail('EN_WEEK.clanHtml: клановые ступени босса — не все строки или порог без кругов');
    }
  }

  /* Л3, Л4. За верхней планкой своей полосы — планки следующей, без перехода в новый цикл: набрали порог первой планки следующей
     полосы — она взята, ближайшая — вторая; строка режима ведёт полосу к ней с её сундуком; в листе следующая полоса раскрыта.
     Порог берётся из эталона: первая планка режима × множитель. beyond(c) — список нарушений: его же зовёт проверка мутацией */
  const SET = { echo: v => { S.echo.score = v; }, event: v => { S.event.pts = v; }, contract: v => { S.contracts.pts = v; }, arena: v => { S.arena.wins = v; }, league: v => { S.arena.lg.wins = v; } };
  function beyond(c) {
    const e = []; let seen = 0;
    for (const id of Object.keys(SET)) {
      reset(null, c);
      const m = M.find(x => x.id === id), st0 = m ? W.state(id, 'now') : null; if (!st0 || st0.lock || !P1[id]) continue;
      const ref = refLadder(id, c), own = ref[0].band, n = ref.filter(r => r.band === own && !r.cap).length, key = `за верхней планкой · ${id} · цикл ${ROMAN[c]}`;
      if (ref.length <= n + 1 || ref[n].cap) continue;   // полоса последняя: дальше — потолок или ничего
      const need = P1[id](c) * ref[n].x / ref[0].x;
      SET[id](need);
      const st = W.state(id, 'now'); seen++;
      ladderLaw(key, st, c).forEach(x => e.push(x));
      const p = st.planks[n];
      if (!p || !p.reached || p.band !== own + 1 || p.need !== need) { e.push(`${key}: Л3 — набрано ${need}, а первая планка следующей полосы не взята: ${p ? `порог ${p.need}, полоса ${p.band}, взята — ${p.reached}` : 'её нет в лестнице режима'}`); continue; }
      if (!st.next || st.next.k !== n + 2 || st.next.band !== own + 1) e.push(`${key}: Л3 — ближайшая планка — ${st.next ? st.next.k : 'нет'}, ждали вторую следующей полосы`);
      S.route = 'week'; S.seg.week = 'now'; S.overlay = null;
      const row = rowsOf(draw(key + ' · строка')).find(x => x.includes(`data-mode="${id}"`)) || '';
      if (!row.includes('class="bar') || !new RegExp(`class="well itf wk-chest" data-r="${topR(ref[n + 1].pay)}"`).test(row) || !row.includes(`цикл ${ROMAN[own + 1]}`)) e.push(`${key}: Л3 — строка режима не ведёт к планке следующей полосы с её сундуком`);
      S.overlay = { t: 'wkmode', arg: id + ':now' };
      const h = draw(key + ' · лист');
      roadLaw(key, h, st, c).forEach(x => e.push(x));
      if (!h.includes(`<div class="wk-ld-band" data-band="${own + 1}">`)) e.push(`${key}: Л4 — полоса, по которой игрок идёт, не раскрыта`);
    }
    if (!seen) e.push(`за верхней планкой · цикл ${ROMAN[c]}: ни один режим не проверен`);
    return e;
  }
  for (let c = 2; c <= 5; c++) beyond(c).forEach(fail);

  /* проверка мутацией: ломаем лестницу — законы обязаны упасть. Мутации — на алгоритме прототипа EnLoot.ladder: его зовут помощник
     Недели и все экраны режимов; эталон проверки — отдельный */
  {
    const MUT = LL.mutations(LAD0);   // замок по циклу вернули; планка следующей полосы платит сундук своей; порог продолжения — не ×next
    let caught = 0;
    for (const [what, f] of MUT) {
      EnLoot.ladder = f;
      let got = [];
      try { got = beyond(2); if (!got.length) for (const id of ORDER) { reset(null, 2); got = got.concat(ladderLaw('мутация · ' + id, W.state(id, 'now'), 2)); } } catch (x) { got = ['исключение ' + x.message]; }
      EnLoot.ladder = LAD0;
      if (got.length) caught++; else fail(`мутация «${what}»: законы лестницы её не поймали`);
      out.mutLog.push(`мутация «${what}»: ${got.length ? got.slice(0, 2).join(' | ').slice(0, 320) : 'НЕ ПОЙМАНА'}`);
    }
    out.mut = `${caught} из ${MUT.length}`;
    beyond(2).forEach(x => fail('после мутаций: ' + x));
  }

  /* сегменты — действием шапки; вкладки «Рейтинга» — действием листа */
  reset();
  draw('старт');
  if (!document.getElementById('game').innerHTML.includes('data-a="seg" data-v="week:past"')) fail('нет сегментов времени в шапке');
  ACT.seg('week:past'); if (S.seg.week !== 'past') fail('сегмент «Прошлая» не переключился');
  ACT.seg('week:next'); if (S.seg.week !== 'next') fail('сегмент «Следующая» не переключился');
  S.seg.week = 'чужое'; draw('неизвестный сегмент');
  S.seg.week = 'now'; S.overlay = { t: 'rank', arg: 'Эхо' }; ACT.wkrt('past');
  if (S.overlay.rt !== 'past') fail('«Рейтинг»: вкладка «Прошлая» не переключилась');
  let h = draw('рейтинг · прошлая'); if (!h.includes('aria-selected="true" data-a="wkrt" data-v="past"')) fail('«Рейтинг»: не видно выбранной вкладки');
  S.overlay = { t: 'rank', arg: 'Не режим' }; draw('рейтинг · чужое имя');
  /* срок: отсечка прошла — подсчёт */
  reset(); S.week.left = 0; h = draw('после отсечки');
  if (!h.includes('Подсчёт') || h.includes('data-cd="week"')) fail('после отсечки не видно подсчёта');
  S.overlay = { t: 'wkclock' }; draw('сроки после отсечки');

  /* реестр: настоящий режим заменяет демо, демо не заменяет настоящий, сбой не ломает экран */
  reset(); S.seg.week = 'now';
  const REG = window.WEEK_MODES, n0 = REG.length;
  REG.push({ id: 'arena', n: 'Арена', icon: 3, go: 'arena', order: 50, now: () => ({ place: 7, points: 1999, top: [['Проба', 2500]] }), past: () => ({ place: 9, points: 1888, rewards: [] }) });
  h = draw('реестр · настоящая Арена');
  let r = rowsOf(h).find(x => x.includes('data-mode="arena"')) || '';
  if (!r.includes('#7') || !r.includes(fmt(1999))) fail('реестр: настоящий режим не заменил демо');
  REG.push({ id: 'arena', n: 'Арена', demo: true, order: 50, now: () => ({ place: 3, points: 5 }) });
  r = rowsOf(draw('реестр · демо после настоящего')).find(x => x.includes('data-mode="arena"')) || '';
  if (!r.includes('#7')) fail('реестр: демо заменило настоящий режим');
  REG.push({ id: 'event', n: 'Событие', order: 20, now: () => { throw new Error('проба сбоя'); }, past: () => null });
  const ce = console.error; console.error = () => {};
  try { h = draw('реестр · сбой режима'); S.seg.week = 'past'; draw('реестр · сбой режима · прошлая'); S.seg.week = 'now'; } catch (x) { fail('реестр: сбой режима сломал экран — ' + x.message); }
  r = rowsOf(h).find(x => x.includes('data-mode="event"')) || '';
  if (!r.includes('нет данных')) fail('реестр: у сбойного режима нет пометки «нет данных»');
  REG.push({ id: 'guild', n: 'Проба', icon: 'power', order: 99, now: () => ({ place: 2, points: 10 }), past: () => ({}) });
  if (W.modes().map(m => m.id).join() !== ORDER.concat('guild').join()) fail('реестр: новый режим не встал в конец по order');
  draw('реестр · седьмой режим');
  REG.splice(n0);
  console.error = ce;
  /* ритуалы и клановый босс сообщат ступени своими экранами (screens/rituals.js, clan.js) — Неделя к этому готова. Ритуалы: своя строка
     режима вместо строки под режимами, порог — загрузка мест в процентах, продолжения нет. Клановый босс: личные ступени по очкам —
     лестница на все циклы, клановые — по кругам. Первая личная ступень босса здесь — число пробы, не данные */
  if (LBX.modes.ritual && LBX.modes.ritual.ladder && !ORDER.includes('ritual')) {
    const MR = LBX.modes.ritual, at = MR.layers.find(l => l.id === MR.ladder.layer).rows.map(r => r.at);
    reset(null, MR.from); S.seg.week = 'now';
    REG.push({ id: 'ritual', n: MR.n, icon: 33, go: 'rituals', order: 70, unit: '%', now: () => ({ points: at[1], have: at[1], planks: W.steps('ritual', { have: at[1] }) }), past: () => ({ points: at[1] }) });
    h = draw('реестр · ритуалы строкой режима');
    if (rowsOf(h).length !== ORDER.length + 1 || /class="wk-rit[ "]/.test(h)) fail('реестр: ритуалы со ступенями — не своя строка режима или осталась строка под режимами');
    const st = W.state('ritual', 'now');
    ladderLaw('реестр · ритуалы', st, S.acc.cycle).forEach(fail);
    S.overlay = { t: 'wkmode', arg: 'ritual:now' }; const s = draw('реестр · лист ритуалов');
    roadLaw('реестр · ритуалы · лист', s, st, S.acc.cycle).forEach(fail);
    if (st.planks.length !== at.length || st.planks.filter(p => p.reached).length !== 2 || !s.includes(`${fmt(at[0])} %</b>`)) fail('реестр: у ритуалов ступени — не загрузка мест в процентах из данных');
    REG.splice(n0);
  }
  if (LBX.modes.clan && LBX.modes.clan.ladder) {
    const lc = LBX.modes.clan.layers.find(l => l.kind === 'plank' && l.clan), p1 = 60, mine = p1 * 3, circ = lc && lc.rows[0].at != null ? lc.rows[0].at : 0;
    reset(null, 2); S.seg.week = 'now';
    REG.push({ id: 'clan', n: NAMES.clan, icon: 26, go: 'clan:boss', order: 40, now: () => ({ place: 5, points: 9000, mine, have: mine, planks: W.steps('clan', { have: mine, plank1: p1 }), clanPlanks: W.clanSteps('clan', { have: circ }), clanHave: circ }), past: () => ({ points: 0 }) });
    const st = W.state('clan', 'now');
    ladderLaw('реестр · клановый босс', st, S.acc.cycle).forEach(fail);
    S.overlay = { t: 'wkmode', arg: 'clan:now' }; const s = draw('реестр · лист кланового босса со ступенями');
    roadLaw('реестр · клановый босс · лист', s, st, S.acc.cycle).forEach(fail);
    if (!st.planks.length || st.planks.filter(p => p.reached).length !== 2 || st.have !== mine) fail('реестр: личные ступени кланового босса — не по личным очкам недели');
    if (circ && (st.clanPlanks.length !== lc.rows.length || st.clanPlanks.filter(p => p.reached).length !== 1 || !(s.split('<div class="wk-ld clan"')[1] || '').includes(plural(circ, ...lc.unit)))) fail('реестр: клановые ступени босса — не по кругам из данных');
    REG.splice(n0);
  }
  S.overlay = null;
  if (W.modes().map(m => m.id + (m.demo ? ':demo' : '')).join() !== SNAP) fail('реестр: после пробы режимы не вернулись');

  /* 8. UI-кит, карта экранов, сценарии */
  renderKit();
  const kit = document.getElementById('kitGrid').innerHTML, ks = kit.indexOf('Неделя · три времени'), kit1 = ks < 0 ? '' : kit.slice(ks, kit.indexOf('</section>', ks));
  if (ks < 0) fail('UI-кит: нет раздела «Неделя · три времени»');
  else {
    if (/undefined|NaN|\[object /.test(kit1)) fail('UI-кит: в разделе «Неделя» undefined, NaN или [object');
    if ((kit1.match(/class="wk-row/g) || []).length < 4 || !kit1.includes('WEEK_MODES')) fail('UI-кит: в разделе «Неделя» нет строк режимов или договора реестра');
    /* лестница планок в ките — три вида одной дороги: начало пути, прошлые полосы пройдены, игрок идёт по следующей полосе */
    if ((kit1.match(/<div class="wk-ld" data-mode=/g) || []).length < 3 || !kit1.includes('class="wk-ld-past"') || !kit1.includes('class="wk-ld-fut"') || !/<div class="wk-ld-band" data-band="\d+">/.test(kit1)) fail('UI-кит: в разделе «Неделя» нет лестницы планок в трёх видах — начало, прошлые полосы пройдены, идёт по следующей');
  }
  const mw = MAP.find(m => m.n === 'Неделя'), me = MAP.find(m => m.n === 'Эхо');
  if (!mw || !(mw.ready || []).includes('week')) fail('карта экранов: у «Недели» нет ready: week');
  if (!me || !(me.ready || []).includes('echo')) fail('карта экранов: у «Эха» нет ready: echo');
  for (const n of ['Неделя · три времени', 'Неделя · итог прошлой', 'Неделя · следующая', 'Неделя · лестница планок']) {
    const f = FLOWS.find(x => x[0] === n);
    if (!f) { fail('нет сценария «' + n + '»'); continue; }
    reset(); f[2](); draw('сценарий «' + n + '»');
  }
  return out;
}
const t0 = Date.now();
let res;
try { res = vm.runInContext('(' + suite.toString() + ')()', ctx); } catch (e) { say('сценарии: ' + (e.stack || e.message)); done(); }
err.push(...res.errors);
if (process.argv.includes('--mut')) for (const m of res.mutLog) console.log(m);   // какой закон поймал каждую мутацию
console.log(`Неделя проверена за ${Math.round((Date.now() - t0) / 1000)} с: отрисовок ${res.views}, листов ${res.sheets}, состояний режимов ${res.states}, строк режимов ${res.rows}. Лестница планок: состояний сверено ${res.ladders}, листов с дорогой ${res.roads}, мутаций поймано ${res.mut}.`);
done();

function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log('Проверка пройдена: три времени, шесть режимов через реестр, итог сходится с «Дарами», лестница планок — сразу на все циклы и без замка, листы и правила воздуха — без исключений, undefined, NaN и служебного.');
  process.exit(0);
}
