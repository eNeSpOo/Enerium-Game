/* Автопроверка экрана «Неделя» прототипа «Свет снизу» (design/ui/screens/week.js) — без браузера.
   1. week.js и week.css на месте и компилируются; index.html подключает week.css и week.js после model.js и до bag.js;
      прежнего экрана недели — weekView, WEEKLY и его стилей — в index.html нет; концы строк index.html, week.js и week.css — CRLF.
   2. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
   3. Реестр WEEK_MODES: шесть режимов недели — id из EN_LOOTBOXES.modes; now() и past() на девяти неделях и шести циклах отдают
      только целые: место от 1 или пусто, очки от 0, планки по возрастанию, ближайшая — первая невзятая, лидеры по убыванию,
      я — ниже тройки или в ней на своём месте; до цикла режима — «рейтинг с цикла II». Прошлая неделя сходится с «Дарами»:
      сундуки режима — ровно строки «Даров» прошлой недели. Настоящий режим заменяет демо, демо не заменяет настоящий,
      сбой режима не ломает экран.
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
   Запуск: node tools/content-gen/screens/check_week.js */
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
const ctx = vm.createContext(win);
for (const s of scripts) {
  try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
  catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
}
if (err.length) done();
TEAM = vm.runInContext('RS.weeks.map(w => w.team && w.team.theme).filter(Boolean)', ctx);

/* 3–8. сценарии — выполняются внутри песочницы */
function suite() {
  const out = { errors: [], views: 0, sheets: 0, states: 0, rows: 0 };
  const fail = m => { if (out.errors.length < 80) out.errors.push(m); };
  const W = window.EN_WEEK, IDS = ['echo', 'event', 'contract', 'clan', 'arena', 'league'], NAMES = { echo: 'Эхо', event: 'Событие', contract: 'Контракты', clan: 'Клановый босс', arena: 'Арена', league: 'Лига' };
  if (!W || !Array.isArray(window.WEEK_MODES)) { fail('нет EN_WEEK или WEEK_MODES'); return out; }
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
  if (IDS.some(id => !ORDER.includes(id)) || ORDER.length !== IDS.length) fail(`реестр: режимы ${ORDER.join(', ')}, ждали ${IDS.join(', ')}`);
  for (const m of M) {
    if (!LBX.modes[m.id] || !LBX.modes[m.id].weekly) fail(`реестр: ${m.id} — не недельный режим EN_LOOTBOXES`);
    if (m.n !== NAMES[m.id]) fail(`реестр: ${m.id} зовётся «${m.n}»`);
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

      /* эта неделя */
      S.seg.week = 'now';
      let h = draw(key + ' · эта неделя');
      if (!h.includes(`Неделя ${w.gen}`) || !h.includes(w.civ)) fail(`${key}: на «Этой неделе» нет расы или цивилизации`);
      if (!h.includes('data-cd="week"') || !h.includes('До отсечки')) fail(`${key}: нет срока до отсечки`);
      const ok = darRows(S).filter(p => p.st === 'ok');
      if (!h.includes(`<small>${chests(darCount(ok))}</small>`)) fail(`${key}: у «Даров» не ${chests(darCount(ok))}`);
      if (!/class="wk-rit[ "]/.test(h) || !h.includes('data-v="rituals"')) fail(`${key}: нет строки ритуалов`);
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
      if (av && !h.includes(rsAversShort(av))) fail(`${key}: на «Следующей» нет неприязни героев недели`);
      if (!h.includes('Начнётся через')) fail(`${key}: не сказано, когда начнётся следующая неделя`);

      /* листы */
      const sheets = [['wkpast'], ['wkclock'], ['wknext'], ['echweek']].concat(ORDER.flatMap(id => [['wkmode', id + ':now'], ['wkmode', id + ':past']]), Object.values(NAMES).flatMap(n => [['rank', n], ['rank', n, 'past']]));
      for (const [t, arg, rt] of sheets) {
        S.route = 'week'; S.seg.week = 'now'; S.overlay = { t, arg }; if (rt) S.overlay.rt = rt;
        h = draw(`${key} · лист ${t} ${arg || ''} ${rt || ''}`); out.sheets++;
        if (!h.includes('class="ov"')) fail(`${key}: лист ${t} ${arg || ''} не открылся`);
      }
      for (const m of M) { S.overlay = { t: 'wkmode', arg: m.id + ':now' }; const s = draw(`${key} · ${m.id} · лист · вход`), f = s.slice(s.indexOf('class="sheet-f"'));
        if (!f.includes(`data-a="go" data-v="${m.go}"`) || !f.includes(`Войти в «${m.n}»`)) fail(`${key}: в листе ${m.id} нет «Войти в «${m.n}»»`); }
      S.overlay = { t: 'wkmode', arg: 'echo:now' }; h = draw(key + ' · Эхо · эта');
      if (!e.lock && (h.match(/class="wk-pk[ "]/g) || []).length !== e.planks.length) fail(`${key}: в листе Эхо не все планки`);
      S.overlay = { t: 'wkpast' }; h = draw(key + ' · итог');
      if (c >= 2 && !h.includes('data-v="gifts:me"')) fail(`${key}: из итога нет перехода в «Дары»`);
    } catch (x) { fail(key + ': исключение — ' + (x && x.stack ? x.stack.split('\n').slice(0, 3).join(' | ') : x)); }
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
  if (W.modes().map(m => m.id + (m.demo ? ':demo' : '')).join() !== SNAP) fail('реестр: после пробы режимы не вернулись');

  /* 8. UI-кит, карта экранов, сценарии */
  renderKit();
  const kit = document.getElementById('kitGrid').innerHTML, ks = kit.indexOf('Неделя · три времени'), kit1 = ks < 0 ? '' : kit.slice(ks, kit.indexOf('</section>', ks));
  if (ks < 0) fail('UI-кит: нет раздела «Неделя · три времени»');
  else {
    if (/undefined|NaN|\[object /.test(kit1)) fail('UI-кит: в разделе «Неделя» undefined, NaN или [object');
    if ((kit1.match(/class="wk-row/g) || []).length < 4 || !kit1.includes('WEEK_MODES')) fail('UI-кит: в разделе «Неделя» нет строк режимов или договора реестра');
  }
  const mw = MAP.find(m => m.n === 'Неделя'), me = MAP.find(m => m.n === 'Эхо');
  if (!mw || !(mw.ready || []).includes('week')) fail('карта экранов: у «Недели» нет ready: week');
  if (!me || !(me.ready || []).includes('echo')) fail('карта экранов: у «Эха» нет ready: echo');
  for (const n of ['Неделя · три времени', 'Неделя · итог прошлой', 'Неделя · следующая']) {
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
console.log(`Неделя проверена за ${Math.round((Date.now() - t0) / 1000)} с: отрисовок ${res.views}, листов ${res.sheets}, состояний режимов ${res.states}, строк режимов ${res.rows}.`);
done();

function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log('Проверка пройдена: три времени, шесть режимов через реестр, итог сходится с «Дарами», листы и правила воздуха — без исключений, undefined, NaN и служебного.');
  process.exit(0);
}
