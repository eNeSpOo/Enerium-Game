/* Автопроверка облика Странника и общения (design/ui/screens/wanderer.js — облик, design/ui/screens/social.js — профиль игрока, друзья,
   почта, чат) — без браузера.
   1. Файлы: index.html — чистый CRLF, social.css и social.js подключены, social.js — после wanderer.js, heroes.js, arena.js, clan.js и week.js;
      прежних почты, чата, заглушки профиля и «Обзора» в index.html нет; wanderer.js — чистый CRLF, заглушек-тостов облика и друзей нет;
      карта экранов отмечает готовыми public-profile, friends, cosmetics, mail и chat.
   2. Состав героев: у каждого героя пол m или f; roster.js совпадает с выводом сборщика export_roster.py (если есть Python).
   3. Данные облика и общения: рамки — задания арта есть, id не повторяются, условия открытия указывают на настоящие достижения; геометрия окна —
      целые промилле; выгруженные рамки лежат на диске; частиц не больше LK_VIEW.fxMax; все числа целые. Стили частиц: ключевые кадры
      lk-* меняют только transform и opacity, при «меньше движения» частицы стоят.
   4. «Сервер» облика: рамка и частицы — только открытые, портрет — только свой герой своего пола, пол — один раз, имя — правила, занятые
      имена, первая смена бесплатно, дальше — цена и не чаще срока; повтор номера ничего не меняет и не списывает второй раз.
   5. «Сервер» общения: заявка, отмена, ответ, удаление, блокировка и разблокировка; жалоба — только запись журнала модерации, без
      наказаний; письмо — только другу и только текст; сообщение чата; ограничение чата модератором — запись журнала и письмо игроку,
      обжалование — запись журнала. Повтор номера ничего не повторяет.
   6. Вид: все листы и вкладки в режимах «Игрок» и «Команда» — без исключений, undefined и NaN; игроку служебного не видно. Воздух: у
      сообщения чата — одна кнопка-облик, в профиле — пятёрка и не больше трёх чипов; живые частицы в чате — не больше SOC_VIEW.chatLive
      сообщений; выключенные частицы — ни одной точки.
   7. Профиль по нажатию на портрет на других экранах: витрина соперника Арены и Лиги, участник клана и список участников, рейтинги
      (имена кланов — без ссылок); колокол и «Чат» в Убежище считают письма и непрочитанное; облик в колонке Странника и у портрета над
      шахтой.
   8. Раздел UI-кита «Облик Странника» и «Общение», сценарии презентации.
   Запуск: node tools/content-gen/screens/check_social.js [--dump] */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const { SERVICE, strip, playerText } = require('./check_player_view.js');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const html = read('index.html');
const DUMP = process.argv.includes('--dump');
const err = [], note = [];
const cnt = { views: 0, player: 0, ops: 0, sheets: 0, msgs: 0 };
const say = m => { if (err.length < 80) err.push(m); else if (err.length === 80) err.push('… и ещё ошибки'); };
function done() {
  for (const n of note) console.log('предупреждение: ' + n);
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Облик и общение: отрисовок ${cnt.views}, из них глазами игрока ${cnt.player}; листов ${cnt.sheets}; операций ${cnt.ops}; сообщений чата ${cnt.msgs}.`);
  console.log('Проверка пройдена: облик — открытое и своего пола, операции не повторяются, жалоба — только журнал, ограничение чата видно честно, частицы лёгкие, профиль открывается по портрету везде, игроку служебного не видно.');
  process.exit(0);
}

/* ================== 1. файлы ================== */
const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
{
  const crlf = (html.match(/\r\n/g) || []).length, lf = (html.match(/\n/g) || []).length, cr = (html.match(/\r/g) || []).length;
  if (crlf !== lf || cr !== crlf) say(`index.html: концы строк не чистый CRLF — CRLF ${crlf}, LF ${lf}, CR ${cr}`);
  const i = src => scripts.findIndex(s => s.src === src);
  if (i('screens/social.js') < 0) say('index.html: не подключён screens/social.js');
  else for (const f of ['screens/wanderer.js', 'screens/heroes.js', 'screens/arena.js', 'screens/clan.js', 'screens/week.js'])
    if (i(f) >= 0 && i('screens/social.js') < i(f)) say(`index.html: screens/social.js раньше ${f} — обёртки листов не встанут`);
  if (!/<link rel="stylesheet" href="screens\/social\.css">/.test(html)) say('index.html: не подключён screens/social.css');
  for (const old of ['function mailRewHtml', 'const mailRit', 'const mailHas', '  inbox() {', '  chat() {', '  claimall()', '.msg{', 'function profileView', '<button class="link">Профиль</button>',
    'Чат<span class="bdg">3</span>', 'data-v="Облик: портрет и рамка"', 'data-v="Друзья: 12"', "'Рамка «Пепел»'"])
    if (html.includes(old)) say(`index.html: остался прежний код — «${old}»`);
  const wj = read('screens/wanderer.js');
  const wcr = (wj.match(/\r\n/g) || []).length, wlf = (wj.match(/\n/g) || []).length;
  if (wcr !== wlf) say(`screens/wanderer.js: концы строк смешаны — CRLF ${wcr}, LF ${wlf}`);
  for (const old of ['data-v="Облик: портрет и рамка"', 'data-v="Друзья: 12"']) if (wj.includes(old)) say(`screens/wanderer.js: осталась заглушка «${old}»`);
  const card = html.match(/\{ n: 'Странник'[\s\S]*?\},\r?\n/);
  if (!card) say('карта экранов: нет карточки «Странник»');
  else { const r = (card[0].match(/ready:\s*\[([^\]]*)\]/) || [])[1] || ''; for (const id of ['profile', 'public-profile', 'friends', 'cosmetics']) if (!r.includes(`'${id}'`)) say(`карта экранов: «${id}» не отмечено готовым`); }
  /* шаблоны карты: [имя, подпись, окна, готовые] — четвёртое поле, как ready у карточки; строки ищутся только в TEMPLATES */
  const tplBlock = (html.match(/const TEMPLATES = \[([\s\S]*?)\r?\n\];/) || ['', ''])[1];
  const tplReady = n => { const line = (tplBlock.match(new RegExp(`\\['${n}',[^\\n]*`)) || [''])[0], all = [...line.matchAll(/\[([^[\]]*)\]/g)].map(m => m[1]); return all.length >= 2 ? all[all.length - 1] : ''; };
  if (!tplReady('Входящие').includes("'mail'")) say('карта экранов: шаблон «Входящие» — почта (mail) не отмечена готовой');
  if (!tplReady('Чат').includes("'chat'")) say('карта экранов: шаблон «Чат» не отмечен готовым');
  for (const f of ['screens/social.js', 'screens/wanderer.js']) try { new vm.Script(read(f), { filename: f }); } catch (e) { say(`${f}: синтаксис — ${e.message}`); }
}
if (err.length) done();

/* ================== 2. состав героев: пол ================== */
{
  const w = {}; new Function('window', read('roster.js'))(w);
  const R = w.EN_ROSTER, bad = R.heroes.filter(h => h.sex !== 'm' && h.sex !== 'f');
  if (bad.length) say(`roster.js: у ${bad.length} героев нет пола — ${bad.slice(0, 5).map(h => h.id).join(', ')}; пересобрать export_roster.py`);
  const py = cp.spawnSync('python', ['-c', [
    'import sys, json, importlib.util',
    `spec = importlib.util.spec_from_file_location('er', r'${path.join(ROOT, 'tools', 'content-gen', 'heroes', 'export_roster.py')}')`,
    'er = importlib.util.module_from_spec(spec); spec.loader.exec_module(er)',
    'd = er.build()',
    'sys.stdout.buffer.write(json.dumps(d, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))'].join('\n')], { encoding: 'utf8', env: Object.assign({}, process.env, { PYTHONIOENCODING: 'utf-8' }), maxBuffer: 64 << 20 });
  if (py.error) note.push('Python не найден — свежесть roster.js не проверена');
  else if (py.status !== 0) say('export_roster.py: сборка упала — ' + String(py.stderr || '').trim().split('\n').pop());
  else if (!read('roster.js').includes('window.EN_ROSTER = ' + py.stdout + ';')) say('roster.js устарел: пересобрать — python tools/content-gen/heroes/export_roster.py');
}

/* ================== песочница ==================
   Скрипты прототипа — по порядку, как в браузере, с заглушкой DOM; boot() не запускается; localStorage недоступен.
   Файл, на который index.html уже ссылается, но которого ещё нет (экран другой задачи в работе), пропускается с предупреждением */
function load() {
  const stubEl = id => {
    const e = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: { setProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, appendChild: x => x, append() {}, prepend() {}, remove() {},
      animate: () => ({}), insertAdjacentHTML() {}, setAttribute() {}, getAttribute: () => null, querySelectorAll: () => [], closest: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), scrollIntoView() {}, focus() {}, clientWidth: 1200, clientHeight: 800 };
    e.querySelector = () => stubEl();
    return e;
  };
  const rootCls = new Set(), root = stubEl('html');
  root.classList = { add: c => rootCls.add(c), remove: c => rootCls.delete(c), toggle: (c, on) => { const v = on === undefined ? !rootCls.has(c) : !!on; if (v) rootCls.add(c); else rootCls.delete(c); return v; }, contains: c => rootCls.has(c) };
  const els = {}, docEv = {};
  const document = { readyState: 'loading', addEventListener: (t, f) => { (docEv[t] = docEv[t] || []).push(f); }, getElementById: id => (els[id] = els[id] || stubEl(id)),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl(), createElementNS: () => stubEl(), body: stubEl('body'),
    documentElement: root, activeElement: null, fonts: null };
  const noStore = () => { throw new Error('localStorage недоступен'); };
  const win = { document, console, navigator: { userAgent: 'node' }, location: { hash: '', href: '' }, history: { replaceState() {} },
    localStorage: { getItem: noStore, setItem: noStore, removeItem: noStore }, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function CustomEvent() {}, performance: { now: () => 0 } };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  for (const s of scripts) {
    if (s.src && !fs.existsSync(path.join(UI, s.src))) { note.push(`index.html ссылается на ${s.src}, файла ещё нет — пропущен`); continue; }
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, FLOWS, KH, MAP, KIT_EXTRA, SCREENS, render, initialState, setTeam, inboxN, avaHtml, navTodo,
    LK_DATA, LK_VIEW, LK_SRV, LKF, LKX, lkAva, lkFaces, lkFaceSrc, lkOwn, lkMet, lkNickWhy,
    SOC_DATA, SOC_VIEW, SOC_SRV, ppOf, ppLook, socNames, socChatN, socIncoming, chUnread, mailHas, RSI, W: window.EN_WANDERER, A: window.EN_ARENA,
  })`, ctx);
  return { T, ctx, els, docEv, game: () => (els.game ? els.game.innerHTML : '') };
}
const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const tips = h => [...h.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
const toasts = h => [...h.matchAll(/\sdata-a="toast"\s+data-v="([^"]*)"/g)].map(m => decode(m[1]).trim()).filter(Boolean);
const dumped = new Set();
function scan(P, h, where) {
  cnt.views++;
  if (typeof h !== 'string' || !h) { say(`${where}: пустая разметка`); return ''; }
  const bad = h.match(/.{0,60}(?:undefined|NaN|\[object ).{0,40}/);
  if (bad) say(`${where}: в разметке undefined, NaN или [object — «${bad[0].replace(/\s+/g, ' ')}»`);
  if (!P.T.KH.team) {
    cnt.player++;
    const v = strip(h), txt = playerText(h).split('\n').concat(tips(v), toasts(v));
    if (P.T.S.toast) txt.push(P.T.S.toast.t);
    for (const t of txt) for (const [what, re] of SERVICE) { const m = t.match(re); if (m) say(`${where}: игроку видно служебное (${what}) — «${t.slice(Math.max(0, m.index - 40), m.index + 60)}»`); }
    if (DUMP && !dumped.has(where)) { dumped.add(where); console.log(`\n== ${where}\n` + playerText(h)); }
  }
  return h;
}
const view = (P, where) => { run(where, () => P.T.render()); return scan(P, P.game(), where); };
const ovOf = h => { const i = h.indexOf('<div class="ov"'); return i < 0 ? '' : h.slice(i); };
const sheetF = h => (h.match(/<div class="sheet-f">([\s\S]*?)<\/div><\/aside>/) || h.match(/<div class="dlg-f">([\s\S]*?)<\/div><\/div><\/div>/) || ['', ''])[1];
const walkInt = (x, where, seen = new Set()) => {
  if (typeof x === 'number') { if (!Number.isInteger(x)) say(`не целое: ${where} = ${x}`); return; }
  if (!x || typeof x !== 'object' || seen.has(x)) return; seen.add(x);
  for (const [k, v] of Object.entries(x)) if (typeof v !== 'function') walkInt(v, where + '.' + k, seen);
};

const P = load(), T = P.T;
const reset = () => { T.S = T.initialState(); T.S.overlay = null; T.S.toast = null; T.S.route = 'shelter'; };
const lkOp = () => 'lk' + T.S.look.seq, scOp = () => 'sc' + T.S.soc.seq;
const snap = () => JSON.stringify({ look: T.S.look, soc: T.S.soc, wallet: T.S.wallet, inbox: T.S.inbox });
if (!T.LK_DATA || !T.SOC_DATA || !T.LK_SRV || !T.SOC_SRV) { say('нет LK_DATA, SOC_DATA, LK_SRV или SOC_SRV в песочнице'); done(); }

/* ================== 3. данные облика и общения ================== */
{
  const D = T.LK_DATA, V = T.LK_VIEW, W = T.W;
  walkInt(D, 'LK_DATA'); walkInt(V, 'LK_VIEW'); walkInt(T.SOC_DATA, 'SOC_DATA'); walkInt(T.SOC_VIEW, 'SOC_VIEW');
  const ach = new Set(W ? W.ach.list.map(a => a.id) : []), kinds = new Set(['base', 'level', 'ach', 'first', 'arena', 'clan', 'pass']);
  const checkHow = (x, where) => {
    if (!x.how || !kinds.has(x.how.k)) say(`${where}: неизвестное условие открытия ${JSON.stringify(x.how)}`);
    else if (x.how.k === 'ach' && !ach.has(x.how.id)) say(`${where}: достижения ${x.how.id} нет в каталоге`);
    if (!(x.r >= 1 && x.r <= 7)) say(`${where}: редкость ${x.r} вне 1–7`);
  };
  const ids = new Set();
  for (const f of D.frames) {
    if (ids.has(f.id)) say(`рамка ${f.id} повторяется`); ids.add(f.id);
    checkHow(f, 'рамка ' + f.id);
    if (!/^#[0-9a-f]{6}$/i.test(f.c)) say(`рамка ${f.id}: цвет кольца ${f.c}`);
    const g = f.art || {};
    if (!(g.win >= 400 && g.win <= 850) || !(g.cx >= 400 && g.cx <= 600) || !(g.cy >= 400 && g.cy <= 600)) say(`рамка ${f.id}: окно картинки ${JSON.stringify(g)} вне разумного`);
  }
  if (D.frames.length < 6) say(`рамок ${D.frames.length} — набор от простой до редких не собран`);
  if (!D.frames.some(f => f.how.k === 'base')) say('нет рамки, которая есть у каждого Странника');
  for (const k of ['ach', 'arena', 'clan', 'pass']) if (!D.frames.some(f => f.how.k === k)) say(`нет рамки за «${k}»`);
  for (const p of D.ready) {
    if (!D.frames.some(f => D.art.replace('{id}', f.id) === p)) say(`выгруженная рамка ${p} — не из набора`);
    if (!fs.existsSync(path.join(UI, 'assets', 'art', p))) say(`выгруженной рамки ${p} нет на диске`);
  }
  const job = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'jobs', 'frames.json'), 'utf8'));
  for (const f of D.frames) if (!job.jobs.some(j => j.id === 'frame-' + f.id)) say(`рамка ${f.id}: нет задания арта frame-${f.id} в jobs/frames.json`);
  if (!T.LKF.get(D.base.frame) || T.LKF.get(D.base.frame).how.k !== 'base') say('рамка нового Странника — не общая');
  const fxIds = new Set();
  for (const x of D.fx) {
    if (fxIds.has(x.id)) say(`частицы ${x.id} повторяются`); fxIds.add(x.id);
    checkHow(x, 'частицы ' + x.id);
    if (x.q > V.fxMax) say(`частицы ${x.id}: точек ${x.q} — больше ${V.fxMax}`);
    if (x.q && !['rise', 'float', 'orbit', 'fall'].includes(x.kind)) say(`частицы ${x.id}: движение «${x.kind}»`);
  }
  if (!fxIds.has('none')) say('частицы нельзя выключить: нет «Без частиц»');
  if (!(D.nick.min >= 2 && D.nick.max > D.nick.min && D.nick.price > 0 && D.nick.days > 0)) say('правила имени неполные');
  /* стили частиц: ключевые кадры — только transform и opacity; «меньше движения» — стоят */
  const css = read('screens/social.css');
  const kfs = [...css.matchAll(/@keyframes\s+(lk-[\w-]+)\s*\{([\s\S]*?\})\s*\}/g)];
  if (kfs.length < 4) say(`social.css: ключевых кадров частиц ${kfs.length} — не все четыре движения`);
  for (const [, n, body] of kfs) for (const [, prop] of body.matchAll(/([a-z-]+)\s*:/g)) if (!['transform', 'opacity'].includes(prop)) say(`social.css: @keyframes ${n} меняет «${prop}» — только transform и opacity`);
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.lk-fx i\{[^}]*animation:\s*none/.test(css)) say('social.css: при «меньше движения» частицы не стоят');
  for (const k of ['rise', 'float', 'fall']) if (!new RegExp(`\\.lk-fx\\[data-k="${k}"\\] i\\{[^}]*animation-name:\\s*lk-${k}`).test(css)) say(`social.css: движение ${k} без своих ключевых кадров`);
}

/* ================== 4. «сервер» облика ================== */
reset();
{
  const L = () => T.S.look, SRV = T.LK_SRV;
  if (!L().sex) say('демо: пол Странника не выбран — «Обзор» откроется выбором');
  const locked = T.LK_DATA.frames.find(f => !T.lkOwn('f', f)), open = T.LK_DATA.frames.find(f => T.lkOwn('f', f) && f.id !== L().frame);
  if (!locked || !open) say('демо: нужны и открытые, и закрытые рамки');
  else {
    const s0 = snap(), r = run('рамка закрыта', () => SRV.frame(lkOp(), locked.id)); cnt.ops++;
    if (!r || r.refuse !== 'lock' || snap() !== s0) say(`облик: закрытую рамку ${locked.id} надеть удалось`);
    const op = lkOp(); run('рамка', () => T.ACT.lkset(`frame:${open.id}:${op}`)); cnt.ops++;
    if (L().frame !== open.id) say(`облик: открытая рамка ${open.id} не надета`);
    const s1 = snap(); run('рамка · повтор', () => T.ACT.lkset(`frame:${open.id}:${op}`));
    if (snap() !== s1) say('облик: повтор номера рамки что-то изменил');
  }
  const lockedFx = T.LK_DATA.fx.find(x => !T.lkOwn('x', x));
  if (lockedFx) { const s0 = snap(), r = run('частицы закрыты', () => SRV.fx(lkOp(), lockedFx.id)); cnt.ops++; if (!r || r.refuse !== 'lock' || snap() !== s0) say('облик: закрытые частицы выбрать удалось'); }
  run('без частиц', () => T.ACT.lkset(`fx:none:${lkOp()}`)); cnt.ops++;
  if (L().fx !== 'none') say('облик: частицы не выключаются');
  /* портрет — свой герой своего пола */
  const faces = T.lkFaces(), sx = L().sex;
  if (!faces.length) say('облик: у демо-аккаунта нет портретов своего пола');
  if (faces.some(id => T.RSI[id].sex !== sx)) say('облик: в выборе портретов герой другого пола');
  const other = Object.values(T.RSI).find(h => h.sex && h.sex !== sx && T.S.heroes.some(x => x.draft && h.team && h.team.draft === x.draft));
  if (other) { const s0 = snap(), r = run('портрет другого пола', () => SRV.face(lkOp(), other.id)); cnt.ops++; if (!r || !r.refuse || snap() !== s0) say(`облик: портрет другого пола (${other.id}) поставить удалось`); }
  const stranger = Object.values(T.RSI).find(h => h.sex === sx && !faces.includes(h.id));
  if (stranger) { const r = run('чужой герой', () => SRV.face(lkOp(), stranger.id)); cnt.ops++; if (!r || !r.refuse) say(`облик: портрет героя не из коллекции (${stranger.id}) поставить удалось`); }
  if (faces[0]) { run('портрет', () => T.ACT.lkset(`face:${faces[0]}:${lkOp()}`)); cnt.ops++; if (L().face !== faces[0]) say('облик: свой портрет не выбран'); }
  if (!T.lkFaceSrc().includes(faces[0] ? '' : 'wanderer')) say('облик: лицо не из выбранного портрета');
  run('капюшон', () => T.ACT.lkset(`face::${lkOp()}`)); cnt.ops++;
  if (L().face !== '' || !T.lkFaceSrc().includes('wanderer.png')) say('облик: капюшон Странника не вернулся');
  /* пол — один раз */
  { const s0 = snap(), r = run('пол второй раз', () => SRV.sex(lkOp(), sx === 'm' ? 'f' : 'm')); cnt.ops++; if (!r || r.refuse !== 'once' || snap() !== s0) say('облик: пол сменился второй раз'); }
  reset();
  if (faces[0]) { T.S.look.face = faces[0]; }
  T.S.look.sex = '';
  run('первый вход без пола', () => T.ACT.go('profile'));
  if (!T.S.overlay || T.S.overlay.t !== 'lksex') say('облик: при первом входе в «Странника» без пола нет выбора пола');
  scan(P, P.game(), 'выбор пола');
  const nx = sx === 'm' ? 'f' : 'm', op = lkOp();
  run('пол', () => T.ACT.lksex(`${nx}:${op}`)); cnt.ops++;
  if (T.S.look.sex !== nx) say('облик: пол не выбран');
  if (T.S.look.face && T.RSI[T.S.look.face].sex !== nx) say('облик: после выбора пола остался портрет другого пола');
  if (T.lkFaces().some(id => T.RSI[id].sex !== nx)) say('облик: портреты не по новому полу');
  /* имя */
  reset();
  const N = T.LK_DATA.nick, en0 = T.S.wallet.enerium, taken = [...T.socNames()][0];
  const why = [['ab', 'коротко'], ['ааааааааааааааааа', 'длинно'], ['Бад!!', 'знаки'], ['  ', 'пусто'], [T.S.look.nick, 'то же'], [taken, 'занято'], [String(taken).toUpperCase(), 'занято, другой регистр']];
  for (const [n, t] of why) { const s0 = snap(), r = run('имя · ' + t, () => SRV.nick(lkOp(), n)); cnt.ops++; if (!r || !r.refuse || snap() !== s0) say(`облик: имя «${n}» (${t}) принято`); }
  const op1 = lkOp(); run('имя · первое', () => { T.S.look.nd = 'Новый путь'; T.ACT.lknick(op1); }); cnt.ops++;
  if (T.S.look.nick !== 'Новый путь' || T.S.wallet.enerium !== en0) say('облик: первая смена имени не прошла или не бесплатна');
  const me = T.S.clan && T.S.clan.members ? T.S.clan.members.find(m => m.me) : null;
  if (me && me.n !== 'Новый путь') say('облик: в клане осталось прежнее имя');
  const s1 = snap(); run('имя · повтор', () => SRV.nick(op1, 'Другое имя')); if (snap() !== s1) say('облик: повтор номера сменил имя');
  { const r = run('имя · срок', () => SRV.nick(lkOp(), 'Ещё один путь')); cnt.ops++; if (!r || !r.refuse || T.S.look.nick !== 'Новый путь') say('облик: вторая смена имени прошла раньше срока'); }
  T.S.look.nickAt -= N.days * T.LK_DATA.day + 1000;
  T.S.wallet.enerium = N.price - 1;
  { const r = run('имя · не хватает', () => SRV.nick(lkOp(), 'Ещё один путь')); cnt.ops++; if (!r || !r.refuse || T.S.wallet.enerium !== N.price - 1) say('облик: смена имени без Энериума прошла'); }
  T.S.wallet.enerium = N.price * 3;
  const op2 = lkOp(); run('имя · платно', () => { T.S.look.nd = 'Ещё один путь'; T.ACT.lknick(op2); }); cnt.ops++;
  if (T.S.look.nick !== 'Ещё один путь' || T.S.wallet.enerium !== N.price * 2) say(`облик: платная смена имени — ${T.S.look.nick}, Энериум ${T.S.wallet.enerium}, а нужно ${N.price * 2}`);
  run('имя · повтор платной', () => T.ACT.lknick(op2));
  if (T.S.wallet.enerium !== N.price * 2) say('облик: повтор номера списал Энериум второй раз');
  /* открытое — навсегда: прошлая неделя Арены прошла, рамка осталась */
  reset();
  const ar = T.LK_DATA.frames.find(f => f.how.k === 'arena');
  if (ar && T.S.arena && T.S.arena.past) {
    const had = T.lkOwn('f', ar); T.S.arena.past.place = 100000;
    if (had && !T.lkOwn('f', ar)) say('облик: рамка Арены пропала, когда прошла неделя');
  }
}

/* ================== 5. «сервер» общения ================== */
reset();
{
  const SRV = T.SOC_SRV, rel = n => T.S.soc.rel[n] || '', log = () => T.S.soc.modlog.length;
  const names = [...T.socNames()], R = T.SOC_DATA.rules;
  const stranger = names.find(n => !rel(n)), incoming = Object.keys(T.S.soc.rel).find(n => rel(n) === 'in'), outgoing = Object.keys(T.S.soc.rel).find(n => rel(n) === 'out');
  const friend = Object.keys(T.S.soc.rel).find(n => rel(n) === 'friend'), blocked = Object.keys(T.S.soc.rel).find(n => rel(n) === 'block');
  if (!stranger || !incoming || !outgoing || !friend || !blocked) say('демо: нужны незнакомец, входящая и исходящая заявки, друг и чёрный список');
  else {
    /* заявка */
    const op = scOp(); run('заявка', () => T.ACT.ppdo(`add|${op}|${stranger}`)); cnt.ops++;
    if (rel(stranger) !== 'out') say('дружба: заявка не отправлена');
    const s0 = snap(); run('заявка · повтор', () => T.ACT.ppdo(`add|${op}|${stranger}`)); if (snap() !== s0) say('дружба: повтор номера заявки что-то изменил');
    for (const [n, t] of [[T.S.look.nick, 'себе'], [blocked, 'из чёрного списка']]) { const s = snap(), r = run('заявка ' + t, () => SRV.add(scOp(), n)); cnt.ops++; if (!r || !r.refuse || snap() !== s) say(`дружба: заявка ${t} прошла`); }
    run('отмена', () => T.ACT.ppdo(`cancel|${scOp()}|${stranger}`)); cnt.ops++;
    if (rel(stranger)) say('дружба: заявка не отменилась');
    /* ответ на заявку: заявка уходит и из Входящих */
    if (!T.S.inbox.some(m => m.k === 'fr' && m.from === incoming)) say('дружба: входящей заявки нет во Входящих');
    const bell0 = T.inboxN();
    run('принять', () => T.ACT.ppdo(`accept|${scOp()}|${incoming}`)); cnt.ops++;
    if (rel(incoming) !== 'friend') say('дружба: заявка не принята');
    if (T.S.inbox.some(m => m.k === 'fr' && m.from === incoming) || T.inboxN() !== bell0 - 1) say('дружба: принятая заявка осталась во Входящих');
    /* встречная заявка — дружба сразу */
    reset();
    run('встречная', () => SRV.add(scOp(), incoming)); cnt.ops++;
    if (rel(incoming) !== 'friend') say('дружба: встречная заявка не стала дружбой');
    reset();
    run('отклонить', () => T.ACT.ppdo(`decline|${scOp()}|${incoming}`)); cnt.ops++;
    if (rel(incoming) || T.S.inbox.some(m => m.k === 'fr' && m.from === incoming)) say('дружба: отклонённая заявка осталась');
    run('удалить', () => T.ACT.ppdo(`remove|${scOp()}|${friend}`)); cnt.ops++;
    if (rel(friend)) say('дружба: друг не удалён');
    /* блокировка: дружба прекращается, сообщения скрыты, разблокировка дружбу не возвращает */
    reset();
    const room = Object.keys(T.S.soc.chat.rooms).find(r => T.S.soc.chat.rooms[r].some(m => m.who === friend));
    const hadPm = T.S.inbox.some(m => m.k === 'pm' && m.from === friend), bellB = T.inboxN();
    run('блок', () => T.ACT.ppdo(`block|${scOp()}|${friend}`)); cnt.ops++;
    if (rel(friend) !== 'block') say('блокировка: друг не в чёрном списке');
    if (T.S.inbox.some(m => m.k === 'pm' && m.from === friend)) say('блокировка: непрочитанные письма заблокированного остались во Входящих — колокол считает скрытое');
    if (hadPm && T.inboxN() >= bellB) say('блокировка: колокол не уменьшился');
    if (room) {
      T.S.seg.chch = room === 'clan' ? 'clan' : 'all'; T.S.seg.chlang = room === 'all:en' ? 'en' : 'ru'; T.S.overlay = { t: 'chat' };
      const h = ovOf(view(P, 'чат · после блокировки'));
      if (h.includes(`data-v="pp:${friend}|chat"`)) say('блокировка: сообщения заблокированного видны в чате');
      if (!/ch-hid/.test(h)) say('блокировка: чат не говорит, что скрыто из чёрного списка');
    }
    T.S.seg.mailt = 'pm'; T.S.overlay = { t: 'inbox' };
    const hm = ovOf(view(P, 'почта · после блокировки'));
    if (T.S.soc.read.concat(T.S.inbox).some(m => m.k === 'pm' && m.from === friend) && hm.includes(`>${friend}</b>`)) say('блокировка: письма заблокированного видны');
    run('разблок', () => T.ACT.ppdo(`unblock|${scOp()}|${friend}`)); cnt.ops++;
    if (rel(friend)) say(`блокировка: после разблокировки отношение «${rel(friend)}» — дружба не должна возвращаться сама`);
    /* жалоба: только запись журнала, никаких наказаний */
    reset();
    const target = stranger, before = JSON.stringify({ rel: T.S.soc.rel, mute: T.S.soc.mute, look: T.S.look }), l0 = log();
    { const r = run('жалоба без причины', () => SRV.report(scOp(), target, '')); cnt.ops++; if (!r || r.refuse !== 'reason' || log() !== l0) say('жалоба: без причины записалась'); }
    T.S.overlay = { t: 'ppreport', arg: target + '|chat' }; T.S.soc.rep = 'abuse';
    const op2 = scOp(); run('жалоба', () => T.ACT.ppdo(`report|${op2}|${target}`)); cnt.ops++;
    const e = T.S.soc.modlog[T.S.soc.modlog.length - 1];
    if (log() !== l0 + 1 || !e || e.kind !== 'report' || e.on !== target || e.why !== 'abuse' || !Number.isInteger(e.no)) say('жалоба: нет записи в журнале модерации');
    if (JSON.stringify({ rel: T.S.soc.rel, mute: T.S.soc.mute, look: T.S.look }) !== before) say('жалоба: кроме записи журнала что-то изменилось');
    if (!T.S.overlay || T.S.overlay.t !== 'pp') say('жалоба: после отправки не вернулся профиль');
    run('жалоба · повтор', () => T.ACT.ppdo(`report|${op2}|${target}`)); if (log() !== l0 + 1) say('жалоба: повтор номера записал вторую');
    { T.S.soc.rep = 'spam'; const r = run('жалоба вторая', () => SRV.report(scOp(), target, 'spam')); cnt.ops++; if (!r || r.refuse !== 'reported' || log() !== l0 + 1) say('жалоба: вторая на того же игрока записалась'); }
    /* письмо: только другу, только текст */
    reset();
    const fr = Object.keys(T.S.soc.rel).find(n => rel(n) === 'friend');
    for (const [to, text, t] of [[stranger, 'Привет', 'не другу'], [fr, '   ', 'пустое'], [fr, 'я'.repeat(R.letter + 1), 'длинное']]) { const s = snap(), r = run('письмо ' + t, () => SRV.letter(scOp(), to, text)); cnt.ops++; if (!r || !r.refuse || snap() !== s) say(`почта: письмо ${t} ушло`); }
    T.S.soc.mail = { to: fr, for: fr, text: 'Спасибо за помощь!' };
    const op3 = scOp(); run('письмо', () => T.ACT.mlsend(op3)); cnt.ops++;
    if (T.S.soc.sent.length !== 1 || T.S.soc.sent[0].to !== fr) say('почта: письмо другу не ушло');
    run('письмо · повтор', () => T.ACT.mlsend(op3)); if (T.S.soc.sent.length !== 1) say('почта: повтор номера отправил второе письмо');
    T.S.soc.sentDay = R.lettersDay;
    { const r = run('письмо сверх суток', () => SRV.letter(scOp(), fr, 'Ещё')); cnt.ops++; if (!r || r.refuse !== 'day') say('почта: письмо сверх суточного предела ушло'); }
    /* прочитать письмо — оно уходит в архив, колокол считает на одно меньше */
    reset();
    const pm = T.S.inbox.find(m => m.k === 'pm');
    if (!pm) say('почта: в демо нет непрочитанного письма');
    else {
      const b0 = T.inboxN(); run('прочитать', () => T.ACT.mlopen(pm.id));
      if (T.inboxN() !== b0 - 1 || !T.S.soc.read.includes(pm) || !T.S.overlay || T.S.overlay.t !== 'letter') say('почта: прочитанное письмо не ушло в архив');
      scan(P, P.game(), 'письмо');
    }
    /* чат: сообщение, ворота каналов, ограничение модератором, обжалование */
    reset();
    T.S.seg.chch = 'all'; T.S.seg.chlang = 'ru';
    const rm = 'all:ru', n0 = T.S.soc.chat.rooms[rm].length;
    T.S.soc.chat.draft = 'Всем удачи внизу';
    const op4 = scOp(); run('чат', () => T.ACT.chsend(op4)); cnt.ops++; cnt.msgs++;
    const last = T.S.soc.chat.rooms[rm][T.S.soc.chat.rooms[rm].length - 1];
    if (T.S.soc.chat.rooms[rm].length !== n0 + 1 || last.who !== '@' || last.t !== 'Всем удачи внизу' || T.S.soc.chat.draft) say('чат: сообщение не ушло');
    run('чат · повтор', () => T.ACT.chsend(op4)); if (T.S.soc.chat.rooms[rm].length !== n0 + 1) say('чат: повтор номера отправил второе сообщение');
    { const r = run('чат пусто', () => SRV.chat(scOp(), rm, '  ')); cnt.ops++; if (!r || !r.refuse) say('чат: пустое сообщение ушло'); }
    { const r = run('чат длинно', () => SRV.chat(scOp(), rm, 'я'.repeat(R.chat + 1))); cnt.ops++; if (!r || !r.refuse) say('чат: слишком длинное сообщение ушло'); }
    const lvl = T.S.acc.level; T.S.acc.level = R.chatFrom - 1;
    { const r = run('чат до уровня', () => SRV.chat(scOp(), rm, 'Привет')); cnt.ops++; if (!r || r.refuse !== 'level') say('чат: общий открыт до своего уровня'); }
    T.S.overlay = { t: 'chat' }; { const h = ovOf(view(P, 'чат · до уровня')); if (/id="chIn"/.test(h)) say('чат: до уровня есть поле ввода'); }
    T.S.acc.level = lvl;
    const inClan = T.S.clan.in; T.S.clan.in = false;
    { const r = run('клан без клана', () => SRV.chat(scOp(), 'clan', 'Привет')); cnt.ops++; if (!r || r.refuse !== 'clan') say('чат: клановый без клана'); }
    T.S.seg.chch = 'clan'; T.S.overlay = { t: 'chat' }; { const h = ovOf(view(P, 'чат · без клана')); if (/id="chIn"/.test(h) || !h.includes('data-v="clan"')) say('чат: без клана нет пути к клану или есть поле'); }
    T.S.clan.in = inClan; T.S.seg.chch = 'all';
    /* ограничение модератором: запись журнала, письмо игроку, в чате — честно: до какого часа, за что, номер записи */
    const m0 = log(), i0 = T.S.inbox.length;
    run('модератор', () => T.ACT.socdemo('mute')); cnt.ops++;
    const M = T.S.soc.mute, em = T.S.soc.modlog[T.S.soc.modlog.length - 1];
    if (!M || !(M.until > Date.now()) || log() !== m0 + 1 || em.kind !== 'mute' || em.no !== M.no || !em.by) say('модерация: ограничение без записи журнала или без срока');
    if (T.S.inbox.length !== i0 + 1 || !T.S.inbox[0].s.includes('№ ' + M.no)) say('модерация: игроку не пришло письмо с номером записи');
    { const s = snap(), r = run('чат под ограничением', () => SRV.chat(scOp(), rm, 'Привет')); cnt.ops++; if (!r || r.refuse !== 'muted' || snap() !== s) say('чат: под ограничением сообщение ушло'); }
    T.S.overlay = { t: 'chat' };
    const hm2 = ovOf(view(P, 'чат · ограничение'));
    if (!/Вы не можете писать в чат до/.test(hm2) || !hm2.includes('№ ' + M.no) || !hm2.includes(M.reason)) say('чат: ограничение не видно честно — срок, причина, номер записи');
    if (/id="chIn"/.test(hm2)) say('чат: под ограничением есть поле ввода');
    if (!/data-a="chappeal"/.test(hm2)) say('чат: ограничение нельзя оспорить');
    const op5 = scOp(); run('обжаловать', () => T.ACT.chappeal(op5)); cnt.ops++;
    const ea = T.S.soc.modlog[T.S.soc.modlog.length - 1];
    if (!M.appeal || ea.kind !== 'appeal' || ea.ref !== M.no) say('модерация: обжалование без записи журнала');
    { const r = run('обжаловать ещё', () => SRV.appeal(scOp())); cnt.ops++; if (!r || r.refuse !== 'appeal') say('модерация: второе обжалование записалось'); }
    run('снять', () => T.ACT.socdemo('mute')); cnt.ops++;
    if (T.S.soc.mute || T.S.soc.modlog[T.S.soc.modlog.length - 1].kind !== 'unmute') say('модерация: снятие ограничения без записи журнала');
    const nos = T.S.soc.modlog.map(x => x.no);
    if (nos.some((x, i) => i && x <= nos[i - 1])) say('модерация: номера записей журнала не растут');
    if (T.S.soc.modlog.some(x => !['report', 'mute', 'unmute', 'appeal'].includes(x.kind))) say('модерация: в журнале неизвестные записи');
    if ('ban' in T.S.soc || 'karma' in T.S.soc) say('общение: у игрока появились бан или «карма»');
  }
}

/* ================== 6. вид: листы и вкладки ================== */
for (const team of [false, true]) {
  reset(); run('режим', () => T.setTeam(team));
  const tag = team ? ' [команда]' : '';
  const R = () => T.S.soc.rel, pick = k => Object.keys(R()).find(n => R()[n] === k);
  const arena = T.A && T.A.pool ? T.A.pool.arena[0].n : '', league = T.A && T.A.pool && T.A.pool.league[0] ? T.A.pool.league[0].n : '';
  const cm = T.S.clan && T.S.clan.members ? T.S.clan.members.find(m => !m.me && !T.SOC_DATA.people[m.n]) : null;
  const who = [pick('friend'), pick('in'), pick('out'), pick('block'), arena, league, cm && cm.n, 'Горький мёд', 'Никто Неизвестный', T.S.look.nick].filter(Boolean);
  for (const n of who) {
    T.S.overlay = { t: 'pp', arg: n + '|chat' };
    const h = ovOf(view(P, `профиль · ${n}${tag}`)); cnt.sheets++;
    if (!h) { say(`профиль ${n}: лист не открылся`); continue; }
    if (!/class="lk-ava/.test(h)) say(`профиль ${n}: нет облика`);
    if (n !== T.S.look.nick && R()[n] !== 'block') {
      if ((h.match(/<button class="hb[ "]/g) || []).length !== 5) say(`профиль ${n}: в пятёрке не пять книг героев`);
      if (!/Достижения · \d+ из \d+/.test(h)) say(`профиль ${n}: нет главного из достижений`);
      const f = sheetF(h);
      if (!f.includes('data-v="ppreport:') || !f.includes('data-v="ppblock:')) say(`профиль ${n}: нет «Пожаловаться» и «Заблокировать»`);
      if ((f.match(/<button/g) || []).length > 5) say(`профиль ${n}: в подвале больше пяти кнопок`);
      const head = (h.match(/<div class="row pp-chips">([\s\S]*?)<\/div>/) || ['', ''])[1];
      if ((head.match(/class="chip/g) || []).length > 3) say(`профиль ${n}: больше трёх чипов`);
    }
    if (R()[n] === 'friend' && !sheetF(h).includes('data-v="write:')) say(`профиль ${n}: другу нельзя написать`);
    if (!R()[n] && n !== T.S.look.nick && !sheetF(h).includes(`data-v="add|`)) say(`профиль ${n}: нет «В друзья»`);
    if (R()[n] === 'block' && !sheetF(h).includes('data-v="unblock|')) say(`профиль ${n}: из чёрного списка нельзя убрать`);
    const hero = (h.match(/data-v="(pphero:[^"]+)"/) || [])[1];
    if (hero) { T.S.overlay = { t: 'pphero', arg: decode(hero).slice(7) }; view(P, `герой пятёрки · ${n}${tag}`); cnt.sheets++; }
  }
  const x = pick('out') || who[0];
  for (const [t, a] of [['ppreport', x + '|chat'], ['ppblock', x + '|chat'], ['ppunf', pick('friend') + '|friends'], ['lksex', '']]) { T.S.overlay = { t, arg: a }; view(P, `лист ${t}${tag}`); cnt.sheets++; }
  T.S.soc.rep = 'spam'; T.S.overlay = { t: 'ppreport', arg: x + '|chat' }; view(P, `жалоба · причина${tag}`);
  for (const k of ['list', 'req', 'block']) { T.S.seg.frt = k; T.S.overlay = { t: 'friends' }; view(P, `друзья · ${k}${tag}`); cnt.sheets++; }
  T.S.seg.frt = 'list'; T.S.soc.q = 'ти'; T.S.overlay = { t: 'friends' }; { const h = ovOf(view(P, `друзья · поиск${tag}`)); if (!/class="fr-row"/.test(h)) say('друзья: поиск «ти» никого не нашёл'); } T.S.soc.q = '';
  for (const k of ['rew', 'pm', 'sys']) { T.S.seg.mailt = k; T.S.overlay = { t: 'inbox' }; view(P, `входящие · ${k}${tag}`); cnt.sheets++; }
  T.S.seg.mailt = 'rew'; T.S.overlay = { t: 'inbox' }; { const h = ovOf(view(P, `входящие${tag}`)); if (!h.includes('data-a="claimall"')) say('входящие: нет «Забрать всё» на вкладке наград'); }
  T.S.overlay = { t: 'letter', arg: (T.S.soc.read[0] || {}).id || '' }; view(P, `письмо${tag}`); cnt.sheets++;
  T.S.overlay = { t: 'write', arg: pick('friend') }; { const h = ovOf(view(P, `новое письмо${tag}`)); if (!h.includes('id="mlText"') || !h.includes('aria-pressed="true"')) say('письмо: нет текста или адресат не выбран'); } cnt.sheets++;
  for (const k of ['frame', 'face', 'fx', 'nick']) { T.S.seg.lkt = k; T.S.overlay = { t: 'look' }; view(P, `облик · ${k}${tag}`); cnt.sheets++; }
  T.S.look.nd = 'а'; T.S.seg.lkt = 'nick'; T.S.overlay = { t: 'look' }; { const h = ovOf(view(P, `облик · имя с ошибкой${tag}`)); if (!/data-a="lknick"[^>]*disabled/.test(h)) say('облик: с неверным именем кнопка «Сменить» не выключена'); } T.S.look.nd = '';
  T.S.seg.lkt = 'frame'; T.S.look.pick = { frame: T.LK_DATA.frames.find(f => !T.lkOwn('f', f)).id }; T.S.overlay = { t: 'look' };
  { const h = ovOf(view(P, `облик · закрытая рамка${tag}`)); if (/data-a="lkset"/.test(h) || !/Откроет /.test(h)) say('облик: у закрытой рамки нет условия или есть «Надеть»'); }
  T.S.look.pick = {};
  /* чат: одна кнопка у сообщения, живые частицы — только у последних, выключенные — ни одной точки */
  for (const [ch, lang] of [['all', 'ru'], ['all', 'en'], ['clan', 'ru']]) {
    T.S.seg.chch = ch; T.S.seg.chlang = lang; T.S.overlay = { t: 'chat' };
    const h = ovOf(view(P, `чат · ${ch} ${lang}${tag}`)); cnt.sheets++;
    const msgs = h.split('<div class="ch-msg').slice(1).map(s => s.slice(0, s.indexOf('</p></div></div>')));
    cnt.msgs += msgs.length;
    if (!msgs.length) say(`чат ${ch} ${lang}: нет сообщений`);
    for (const m of msgs) {
      if ((m.match(/<button/g) || []).length !== 1) say(`чат ${ch} ${lang}: у сообщения не одна кнопка`);
      if (!/class="lk-ava/.test(m) || !/class="ch-nk"/.test(m)) say(`чат ${ch} ${lang}: у сообщения нет облика или имени`);
      if ((m.match(/<i style="--a/g) || []).length > T.LK_VIEW.fxMax) say(`чат ${ch} ${lang}: частиц у облика больше ${T.LK_VIEW.fxMax}`);
    }
    if ((h.match(/class="lk-fx/g) || []).length > T.SOC_VIEW.chatLive) say(`чат ${ch} ${lang}: живых частиц больше чем у ${T.SOC_VIEW.chatLive} сообщений`);
    if (ch === 'all' && !h.includes(`data-v="chlang:${lang === 'ru' ? 'en' : 'ru'}"`)) say('чат: нет переключателя языка RU / EN');
    if (ch === 'clan' && /data-v="chlang:/.test(h)) say('чат: у кланового канала переключатель языка');
  }
  T.S.look.view = false; T.S.seg.chch = 'all'; T.S.seg.chlang = 'ru'; T.S.overlay = { t: 'chat' };
  { const h = ovOf(view(P, `чат · частицы выключены${tag}`)); if (/class="lk-fx/.test(h)) say('облик: выключенные частицы видны в чате'); }
  T.S.look.view = true;
  /* экраны: «Обзор» и вкладки Странника, Убежище, клан */
  T.S.overlay = null;
  for (const t of ['over', 'mem', 'arts', 'ach']) {
    T.S.route = 'profile'; T.S.seg.profile = t;
    const h = view(P, `Странник · ${t}${tag}`);
    if (!/<div class="pnl idc"><button class="lk-idb"/.test(h)) say(`Странник · ${t}: в колонке нет облика`);
    if (!h.includes('data-v="look"') || !h.includes('data-v="friends"')) say(`Странник · ${t}: нет входа в «Облик» или «Друзья»`);
  }
  T.S.route = 'shelter'; view(P, `Убежище${tag}`);
  T.S.route = 'store'; T.S.seg.store = 'look'; { const h = view(P, `Лавка Энериума · облик${tag}`); if (!h.includes('data-v="look"')) say('Лавка Энериума: вкладка «Облик» не ведёт в облик'); }
  T.S.route = 'clan'; T.S.seg.clan = 'mem'; view(P, `клан · участники${tag}`);
  for (const f of T.FLOWS.filter(x => /Облик|Странник · начало|Профиль игрока|Друзья и заявки|Почта · письмо|Чат ·/.test(x[0]))) { reset(); run('сценарий ' + f[0], () => f[2]()); view(P, `сценарий «${f[0]}»${tag}`); cnt.sheets++; }
}
run('режим', () => T.setTeam(false));

/* ================== 7. профиль по портрету на других экранах ================== */
reset();
{
  const oid = T.S.arena && T.S.arena.opp ? T.S.arena.opp[0] : null;
  if (!oid) say('Арена: нет соперников в списке');
  else { T.S.overlay = { t: 'opp', arg: oid }; const h = ovOf(view(P, 'Арена · соперник')); if (!/class="pp-strip"/.test(h) || !new RegExp(`data-v="pp:[^"|]+\\|opp:${oid}"`).test(h)) say('Арена: в витрине соперника нет профиля игрока'); }
  const lid = T.S.arena && T.S.arena.lg && T.S.arena.lg.opp ? T.S.arena.lg.opp[0] : null;
  if (lid) { T.S.overlay = { t: 'lgopp', arg: lid }; const h = ovOf(view(P, 'Лига · соперник')); if (!/class="pp-strip"/.test(h)) say('Лига: в матче нет профиля соперника'); }
  const C = T.S.clan, m = C && C.members ? C.members.find(x => !x.me) : null, me = C && C.members ? C.members.find(x => x.me) : null;
  if (m) { T.S.overlay = { t: 'clmem', arg: m.id }; const h = ovOf(view(P, 'клан · участник')); if (!h.includes(`data-v="pp:${m.n}|clmem:${m.id}"`)) say('клан: у участника нет профиля по портрету'); }
  if (me) { T.S.overlay = { t: 'clmem', arg: me.id }; const h = ovOf(view(P, 'клан · вы')); if (!/data-a="go" data-v="profile"/.test(h)) say('клан: свой портрет не ведёт в «Странника»'); }
  if (C && C.apps && C.apps.length) { T.S.overlay = { t: 'clapps' }; const h = ovOf(view(P, 'клан · заявки')); if (!h.includes(`data-v="pp:${C.apps[0].n}|clapps"`)) say('клан: у заявки в клан нет профиля по портрету'); }
  if (T.S.arena && T.S.arena.log && T.S.arena.log.length) {
    T.S.overlay = { t: 'ardef', arg: '' }; { const h = ovOf(view(P, 'Арена · журнал обороны')); if (!/class="pp-nm" data-a="sheet" data-v="pp:[^"]+\|ardef"/.test(h)) say('Арена: в журнале обороны имя нападавшего не ведёт в профиль'); }
    T.S.overlay = null; T.S.route = 'arena'; T.S.seg.arena = 'def'; { const h = view(P, 'Арена · оборона'); if (!/class="pp-nm" data-a="sheet" data-v="pp:/.test(h)) say('Арена: на вкладке обороны имя нападавшего не ведёт в профиль'); }
  }
  T.S.overlay = null; T.S.route = 'clan'; T.S.seg.clan = 'mem';
  { const h = view(P, 'клан · список участников'); const n = (h.match(/class="cl-av pp-ca"/g) || []).length; if (C && C.in && n !== C.members.length) say(`клан: обликов в списке ${n}, участников ${C.members.length}`); }
  T.S.route = 'shelter';
  for (const k of ['Эхо', 'Арена', 'Событие']) {
    T.S.overlay = { t: 'rank', arg: k }; const h = ovOf(view(P, 'рейтинг · ' + k));
    if (!/class="pp-nm" data-a="sheet" data-v="pp:/.test(h)) say(`рейтинг ${k}: имена игроков не ведут в профиль`);
  }
  T.S.overlay = { t: 'rank', arg: 'Клановый босс' };
  { const h = ovOf(view(P, 'рейтинг · Клановый босс')); for (const c of Object.keys(T.SOC_DATA.clans)) if (h.includes(`data-v="pp:${c}|`)) say(`рейтинг кланов: имя клана «${c}» ведёт в профиль игрока`); }
  T.S.overlay = { t: 'rank', arg: 'Не режим' }; view(P, 'рейтинг · запасной');
  /* колокол и «Чат» в Убежище, портрет над шахтой */
  T.S.overlay = null; T.S.route = 'shelter';
  const h = view(P, 'Убежище · бейджи');
  const chat = (h.match(/data-v="chat">[\s\S]*?<\/button>/) || [''])[0], n = T.socChatN();
  if (!n) say('Убежище: в демо нет непрочитанного в чате');
  if (!chat.includes(`<span class="bdg" aria-hidden="true">${n > 9 ? '9+' : n}</span>`)) say(`Убежище: у «Чата» бейдж не ${n}`);
  T.S.overlay = { t: 'chat' }; view(P, 'чат · прочитан'); T.S.overlay = null;
  if (T.chUnread('all:ru')) say('чат: открытая комната осталась непрочитанной');
  const ava = T.avaHtml('shelter', T.navTodo());
  if (!ava.includes(`src="${T.lkFaceSrc()}"`)) say('портрет над шахтой: не лицо облика');
  const bell = T.inboxN();
  if (bell !== T.S.inbox.length + (T.S.gift && T.S.gift.got < T.S.gift.day ? 1 : 0)) say('колокол: считает не письма и дар дня');
}

/* ================== 8. UI-кит ================== */
{
  const find = t => T.KIT_EXTRA.find(x => { try { return x.html().includes(t); } catch (_) { return false; } });
  const kl = find('Облик Странника'), ks = find('>Общение<');
  if (!kl) say('UI-кит: нет раздела «Облик Странника»');
  else { const h = run('UI-кит · облик', () => kl.html()) || ''; if (/undefined|NaN|\[object /.test(h)) say('UI-кит · облик: undefined или NaN'); if ((h.match(/class="lk-ava/g) || []).length < T.LK_DATA.frames.length + T.LK_DATA.fx.length) say('UI-кит · облик: не все рамки и частицы'); }
  if (!ks) say('UI-кит: нет раздела «Общение»');
  else { const h = run('UI-кит · общение', () => ks.html()) || ''; if (/undefined|NaN|\[object /.test(h)) say('UI-кит · общение: undefined или NaN'); if (!/Критика игры — не нарушение/.test(h)) say('UI-кит · общение: нет правил честной модерации'); }
}
done();
