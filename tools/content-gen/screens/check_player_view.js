/* Автопроверка прототипа «Свет снизу» глазами игрока — без браузера.
   Режим «Игрок / Команда» (index.html): один флаг KH.team, переключатель в панели прототипа, setTeam. Служебное — формулы,
   ссылки на ADR и §, заглушки, демо-переключатели, пояснения прототипа — размечено классом team-only; в режиме «Игрок» CSS его прячет.
   1. Скрипты прототипа выполняются в песочнице Node по порядку, как в браузере, с заглушкой DOM; boot() не запускается.
      localStorage в песочнице бросает исключение: страница обязана работать без него и открываться в режиме «Игрок».
   2. Режим один на всех: setTeam ставит KH.team и класс team у <html>, глаз в карточке героя (ACT.rsteam) — тот же режим.
   3. Режим «Игрок»: рисуются все маршруты, сегменты и переключатели из самой разметки, листы, которые открываются с экранов,
      все сценарии презентации, карточки героев отряда и состава, Призыв по циклам, Эхо по неделям и циклам — призыв, победа,
      крафтовый босс, руина и биом Многоликого, — бой, итог и разговоры.
   4. Из разметки выкидываются элементы team-only вместе с содержимым. В оставшемся тексте, в подсказках title и placeholder
      и в текстах всплывающих сообщений ищутся служебные слова и шаблоны из SERVICE. Нашлось — проверка падает и печатает, что и где.
   5. Режим «Команда»: те же экраны рисуются без исключений, служебное на месте.
   Флаг --dump печатает весь текст, который видит игрок, по экранам — для ручного прохода.
   Другие проверки берут отсюда strip — вид игрока без team-only: require('./check_player_view.js').strip.
   Запуск: node tools/content-gen/screens/check_player_view.js [--dump] */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

/* ================== ДАННЫЕ ПРОВЕРКИ ==================
   Служебные слова и шаблоны: игрок их видеть не должен. [что, шаблон]. Кириллица — без \b: он знает только латиницу. */
const SERVICE = [
  ['ссылка на ADR', /ADR/],
  ['ссылка на раздел GDD', /§|GDD/],
  ['«демо»', /демо(?!н)/i],
  ['«заглушка»', /заглушк/i],
  ['«черновик»', /черновик/i],
  ['«прототип»', /прототип/i],
  ['«для команды»', /для команды|только команде/i],
  ['«ждёт автора», «баланс»', /(?<![а-яё])автор(?:а|у|ом|ы)?(?![а-яё])|баланс/i],
  ['толкование, допущение', /толковани|допущени/i],
  ['имя файла', /[\w-]+\.(?:js|md|json|csv|css|html|py|xlsx)(?![\w])/i],
  ['формула', /×\s*\(\s*1\s*[+−-]|\(\s*1\s*[+−-]\s*\d/],
  ['«сид»', /(?<![а-яё])сид(?:а|е|ом|ы|у)?(?![а-яё])/i],
  ['«ядро» боя', /бой ядром|(?<![а-яё])в ядре(?![а-яё])|ядр(?:о|а|ом|е) боя/i],
  ['базисные пункты', /б\.\s?п\./],
  ['поле данных', /\b(?:RULES|BIOMES|DEMO_BAG|INV\.|EN_[A-Z_]+|KH\.team|S\.[a-z]+)/],
];
/* элементы без закрывающего тега */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
/* переключатели и листы, которые обход нажимает сам: меняют только вид, а не запасы и кошелёк */
const SAFE = new Set(['seg', 'hview', 'zptab', 'wsview', 'rscyc', 'lore', 'lorefoe', 'biome', 'hero', 'sq', 'esel', 'echsel', 'gsel', 'dsel', 'ssel',
  'zpsel', 'dartab', 'wsbtab', 'wsbkind', 'wscat', 'wsinfo', 'legend', 'sheet', 'dlg', 'foe', 'item', 'rhero', 'npc', 'talkmore', 'echfoe', 'echweek',
  'echbest', 'darbox', 'rsval', 'hfilter', 'hsort', 'qty', 'echcb']);

/* ================== разметка → то, что видит игрок ================== */
const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
const TEAM_CLS = /\sclass\s*=\s*"(?:[^"]*\s)?team-only(?:\s[^"]*)?"/;
/* вид игрока: выкидывает элементы team-only вместе с содержимым */
function strip(h) {
  let out = '', last = 0, hide = 0, m; const stack = [], re = new RegExp(TAG.source, 'g');
  while ((m = re.exec(h))) {
    if (!hide) out += h.slice(last, m.index);
    last = re.lastIndex;
    if (m[0].startsWith('<!--')) continue;
    const name = m[2].toLowerCase();
    if (m[1]) {
      let j = stack.length - 1; while (j >= 0 && stack[j].n !== name) j--;
      if (j < 0) { if (!hide) out += m[0]; continue; }
      const was = hide;
      hide -= stack.splice(j).filter(x => x.t).length;
      if (!was) out += m[0];
      continue;
    }
    const self = !!m[4] || VOID.has(name), team = TEAM_CLS.test(m[3] || '');
    if (team) { if (!self) { stack.push({ n: name, t: true }); hide++; } continue; }
    if (!self) stack.push({ n: name, t: false });
    if (!hide) out += m[0];
  }
  if (!hide) out += h.slice(last);
  return out;
}
const teamCount = h => (h.match(new RegExp(TEAM_CLS.source, 'g')) || []).length;
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (x, k) => ENT[k] || (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : x));
const BLOCK = /<\/?(?:p|div|li|ul|ol|section|article|header|footer|aside|main|nav|h[1-6]|dt|dd|dl|tr|td|th|table|br|button|label|figure|figcaption|small|option|select|summary|details)\b[^>]*>/gi;
const lines = h => decode(h.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(BLOCK, '\n').replace(/<[^>]+>/g, ' ')).split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
const tips = h => [...h.matchAll(/\s(?:title|placeholder)="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
/* всплывающие сообщения кнопок: текст уже в разметке — data-a="toast" data-v="…" */
const toasts = h => [...h.matchAll(/\sdata-a="toast"\s+data-v="([^"]*)"/g)].map(m => decode(m[1]).replace(/\s+/g, ' ').trim()).filter(Boolean);
/* текст игрока одной строкой: для проверок «видно ли игроку» */
const playerText = h => lines(strip(h)).join('\n');

module.exports = { SERVICE, strip, playerText, teamCount };
if (require.main === module) main();

function main() {
  const UI = path.join(__dirname, '..', '..', '..', 'design', 'ui');
  const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
  const DUMP = process.argv.includes('--dump');
  const html = read('index.html');
  const err = [], hits = new Map();
  let views = 0, teamEls = 0, teamPass = false;
  const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
  const done = () => {
    if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
    console.log('Проверка пройдена: в режиме «Игрок» на экранах, сегментах и листах нет служебных слов и шаблонов.');
    process.exit(0);
  };

  /* ---------- песочница: localStorage недоступен, классы <html> настоящие ---------- */
  const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => ({ src: m[1], code: m[2] }));
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
  const els = {};
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => (els[id] = els[id] || stubEl(id)),
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
    try { vm.runInContext(s.src ? read(s.src) : s.code, ctx, { filename: s.src || 'index.html' }); }
    catch (e) { say(`выполнение ${s.src || 'встроенного скрипта'}: ${e.message}`); }
  }
  if (err.length) done();
  const T = vm.runInContext(`({
    get S() { return S; }, set S(v) { S = v; },
    ACT, OV, SCREENS, FLOWS, KH, RS, RSI, RX, BAG, EB, NPCS, ACTIVATE, render, initialState, startRun, advance,
    rsSetWeek: typeof rsSetWeek === 'function' ? rsSetWeek : null, E: window.EN_ECHO || null,
    setTeam: typeof setTeam === 'function' ? setTeam : null,
  })`, ctx);

  const run = (where, f) => { try { return f(); } catch (e) { say(`${where}: исключение — ${e.message} | ${(e.stack || '').split('\n').slice(1, 3).join(' | ').trim()}`); return undefined; } };

  /* ---------- режим: по умолчанию «Игрок», один флаг на всех ---------- */
  if (T.KH.team !== false) say('режим по умолчанию — не «Игрок»: без localStorage KH.team должен быть false');
  if (!T.setTeam) { say('index.html: нет setTeam — общего переключателя режима «Игрок / Команда»'); done(); }
  run('режим «Команда»', () => T.setTeam(true));
  if (T.KH.team !== true || !rootCls.has('team')) say('setTeam(true): нет флага KH.team или класса team у <html>');
  run('глаз в карточке героя', () => T.ACT.rsteam());
  if (T.KH.team !== false || rootCls.has('team')) say('глаз в карточке героя (rsteam) не переключил общий режим');
  run('глаз в карточке героя', () => T.ACT.rsteam());
  if (T.KH.team !== true) say('глаз в карточке героя (rsteam) не вернул режим «Команда»');
  run('режим «Игрок»', () => T.setTeam(false));
  if (T.KH.team !== false || rootCls.has('team')) say('setTeam(false): режим «Игрок» не вернулся');

  /* ---------- скан отрисовки ---------- */
  const seen = new Set(), dump = [];
  function scan(where, h) {
    views++;
    if (typeof h !== 'string') { say(`${where}: разметка не строка`); return; }
    if (/undefined|NaN|\[object /.test(h)) say(`${where}: в разметке undefined, NaN или [object`);
    if (teamPass) { teamEls += teamCount(h); return; }
    const v = strip(h), txt = lines(v).concat(tips(v).map(t => '⌖ ' + t), toasts(v).map(t => '⌁ ' + t));
    for (const t of txt) {
      for (const [what, re] of SERVICE) {
        const m = t.match(re); if (!m) continue;
        const a = Math.max(0, m.index - 50), snip = (a ? '…' : '') + t.slice(a, m.index + m[0].length + 60) + (m.index + m[0].length + 60 < t.length ? '…' : '');
        const k = what + '|' + snip, x = hits.get(k);
        if (x) x.n++; else hits.set(k, { what, snip, where, n: 1 });
      }
      if (DUMP && !seen.has(t)) { seen.add(t); dump.push([where, t]); }
    }
  }
  const game = () => (els.game ? els.game.innerHTML : '');
  /* полоса боя рисуется в свои элементы: лента, карточка бойца, очередь, часы */
  const battleParts = () => ['btFeed', 'btInsp', 'btQueue', 'btLegend', 'btClock', 'btRun', 'btCut'].map(id => els[id] ? els[id].innerHTML || '' : '').join('\n');
  const draw = where => { run(where, () => T.render()); scan(where, game()); };
  const reset = () => { T.S = T.initialState(); T.S.overlay = null; };

  /* обход экрана: переключатели и листы берутся из самой разметки; найденное в листе нажимается при открытом листе */
  const BTN = /<(?:button|a|div|span|label|select|input)\b([^>]*\bdata-a="([^"]+)"[^>]*)>/g;
  const attr = (s, k) => { const m = s.match(new RegExp(`\\sdata-${k}="([^"]*)"`)); return m ? decode(m[1]) : undefined; };
  function visit(route, prep, cap = 400) {
    const seenBtn = new Set(), queue = [null];
    while (queue.length && seenBtn.size < cap) {
      const q = queue.shift();
      run(route + ' · подготовка', () => { if (prep) prep(); T.S.route = route; T.S.overlay = q && q.ov ? JSON.parse(q.ov) : null; });
      if (q) run(`${route} · ${q.a} ${q.v}`, () => T.ACT[q.a](q.v, { dataset: q.ds, value: q.v, checked: true, closest: () => null }));
      if (T.S.route === 'battle' && !T.S.runs.length) T.S.route = route;
      const where = `${route}${q ? ` · ${q.a} ${q.v}${q.ov ? ' в листе ' + JSON.parse(q.ov).t : ''}` : ''}`;
      run(where, () => T.render());
      const h = game(); scan(where, h);
      const ov = T.S.overlay ? JSON.stringify(T.S.overlay) : '';
      for (const m of h.matchAll(BTN)) {
        const a = m[2]; if (!SAFE.has(a) || typeof T.ACT[a] !== 'function' || /\sdisabled(?:[\s=>]|$)/.test(m[1])) continue;
        if (!teamPass && TEAM_CLS.test(m[1])) continue;   // кнопка «только для команды» игроку не видна
        const v = attr(m[1], 'v') || '', ds = { v, go: attr(m[1], 'go'), seg: attr(m[1], 'seg') };
        const k = `${a}|${v}|${ds.go || ''}|${ds.seg || ''}|${ov}`;
        if (!seenBtn.has(k)) { seenBtn.add(k); queue.push({ a, v, ds, ov }); }
      }
    }
  }

  /* Эхо глубже: выбор цели после призыва, победа с добычей, крафтовый босс, руина и биом Многоликого — от активации до итога */
  function echoDeep(key) {
    const E = T.E, clear = () => { T.S.overlay = null; T.S.echo.slots = T.S.echo.slots.map(() => null); T.S.ech.pending = {}; T.S.echo.sel = 0; T.S.route = 'echo'; T.S.runs = []; };
    const win2 = (where, i) => {   // цели в слоте i оставляем 1 здоровья — следующая атака побеждает
      const x = T.S.echo.slots[i]; if (!x) return;
      x.hp = 1; T.S.echo.sel = i; T.S.route = 'echo';
      run(where, () => T.ACT.echatk(x.uid + ':' + (x.atk + 1)));
      const R = T.S.runs.find(r => r.kind === 'echo' && !r.over); if (!R) return;
      draw(where + ' · бой'); run(where + ' · пропустить', () => T.ACT.echskip(R.id)); draw(where + ' · итог');
    };
    clear(); run(key + ' · призыв', () => T.ACT.echsum('2')); draw(key + ' · выбор цели');
    const p = T.S.ech.pending[2]; if (p) { run(key + ' · выбор', () => T.ACT.echpick('2:' + p.offers[0])); draw(key + ' · цель выбрана'); win2(key + ' · победа', 2); }
    clear(); T.S.echo.slots[0] = E.target('step', E.steps.length + 1); draw(key + ' · Многоликий в слоте'); win2(key + ' · Многоликий', 0);
    for (const fb of T.RX.drops.craftBosses.slice(0, 3)) {
      clear(); T.BAG.add(fb.call, 1); run(key + ' · призыв босса', () => T.ACTIVATE.call(fb.call)); draw(`${key} · ${fb.id} · подтверждение`);
      if (!T.S.overlay || !T.S.overlay.op) continue;
      run(key + ' · призвать', () => T.ACT.echactdo(T.S.overlay.op)); draw(`${key} · ${fb.id} · призван`);
      T.S.overlay = null; const i = T.S.echo.slots.findIndex(Boolean); if (i >= 0) { draw(`${key} · ${fb.id} · в слоте`); win2(`${key} · ${fb.id}`, i); }
    }
    const cb = T.RX.drops.craftBiomes[0];
    if (cb) {
      clear(); T.S.ech.biomes = []; T.BAG.add(cb.act, 1); run(key + ' · руина', () => T.ACTIVATE.act(cb.act)); draw(key + ' · руина · подтверждение');
      if (T.S.overlay && T.S.overlay.op) {
        run(key + ' · руина', () => T.ACT.echactdo(T.S.overlay.op)); draw(key + ' · руина открыта');
        const x = T.S.ech.biomes[0];
        if (x) { run(key + ' · руина', () => T.ACT.echgo('descent:' + x.uid)); draw(key + ' · руина в «Спуске»'); run(key + ' · руина', () => T.ACT.echcbx(x.uid)); draw(key + ' · покинуть руину'); }
      }
    }
    clear(); T.S.ech.biomes = []; T.BAG.add('many', 1); run(key + ' · Многоликий', () => T.ACTIVATE.echo('many'));
    if (T.S.overlay && T.S.overlay.op) {
      run(key + ' · Многоликий', () => T.ACT.echactdo(T.S.overlay.op)); draw(key + ' · биом Многоликого открыт');
      const mb = T.S.ech.biomes.find(b => b.many);
      if (mb) {
        run(key + ' · Многоликий', () => T.ACT.echgo('descent:' + mb.uid)); draw(key + ' · биом Многоликого в «Спуске»');
        run(key + ' · Многоликий', () => T.ACT.echmany(mb.uid));
        const R = T.S.runs.find(r => r.kind === 'many');
        if (R) {
          draw(key + ' · биом Многоликого · бой'); T.S.route = 'descent';
          for (let n = 0; !R.over && n < 40000; n++) run(key + ' · ход', () => T.advance(R, 500));
          run(key + ' · итог', () => T.ACT.focus(R.id)); draw(key + ' · биом Многоликого · итог');
        }
      }
    }
    clear(); T.S.ech.biomes = [];
  }

  /* ---------- обход ---------- */
  function tour(team) {
    const tag = team ? ' [команда]' : '';
    reset(); run('режим', () => T.setTeam(team));
    /* все маршруты: бой — с идущим забегом */
    for (const route of Object.keys(T.SCREENS)) {
      reset();
      if (route === 'battle') run('бой: старт', () => { T.startRun('s1', 'b1'); T.S.focus = T.S.runs[0] && T.S.runs[0].id; });
      visit(route, null, team ? 120 : 400);
    }
    /* герои отряда: каждая вкладка карточки */
    reset();
    for (const h of T.S.heroes) for (const tab of ['power', 'skills', 'path']) {
      T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'mine'; T.S.selHero = h.id; T.S.seg.hero = tab; T.S.overlay = null;
      draw(`герой ${h.name} · ${tab}${tag}`);
    }
    /* состав героев: карточка каждого героя, его последняя доблесть и лист поверх */
    reset();
    for (const h of T.RS.heroes) {
      T.S.route = 'heroes'; T.S.seg.heroes = 'coll'; T.S.hview = 'all'; T.S.rs.sel = h.id; T.S.rs.val = null; T.S.overlay = null;
      draw(`состав · ${h.n}${tag}`);
      T.S.rs.val = { id: h.id, v: h.maxV }; draw(`состав · ${h.n} · последняя доблесть${tag}`);
      T.S.overlay = { t: 'rhero', arg: h.id }; draw(`лист героя · ${h.n}${tag}`);
    }
    /* Призыв: три вкладки на каждом цикле */
    for (let c = 1; c <= 6; c++) for (const tab of ['gold', 'donat', 'souls']) {
      reset(); T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; T.S.seg.hire = tab; T.S.rs.cyc = c;
      visit('heroes', () => { T.S.seg.heroes = 'hire'; T.S.seg.hire = tab; T.S.rs.cyc = c; }, team ? 20 : 60);
    }
    /* Эхо: каждая неделя и цикл — экран, листы недели и бестиария; на цикле III — бой, итог и всё глубже */
    if (T.E && T.rsSetWeek) for (const w of T.RS.weeks) for (let c = 1; c <= 6; c++) {
      const key = `Эхо · ${w.race} · цикл ${c}${tag}`;
      run(key, () => { reset(); T.rsSetWeek(w.race); T.S.acc.cycle = c; T.S.route = 'echo'; T.S.wallet.souls = 1e9; T.E.sync(); });
      draw(key);
      for (const t of ['echweek', 'echbest']) { T.S.overlay = { t }; draw(`${key} · лист ${t}`); }
      T.S.overlay = { t: 'echfoe', arg: 'many' }; draw(`${key} · Многоликий`);
      if (c !== 3) continue;
      T.S.overlay = null;
      run(key + ' · атака', () => T.ACT.echatk());
      const R = T.S.runs.find(r => r.kind === 'echo' && !r.over);
      if (R) { draw(`${key} · бой`); scan(`${key} · бой · полоса`, battleParts()); run(key + ' · пропустить', () => T.ACT.echskip(R.id)); draw(`${key} · итог атаки`); }
      echoDeep(key);
    }
    /* забег по Мастерской форм: бой, полоса, знаки, итог; рунный страж; демо-прыжок к боссу */
    for (const [name, f] of [['забег', () => T.startRun('s1', 'b1')], ['страж', () => T.startRun('s1', 'b1', null, true)], ['к боссу', () => T.startRun('s1', 'b1', T.EB.BIOMES.b1.floors.length)]]) {
      reset(); T.S.route = 'descent';
      run(name, f);
      const R = T.S.runs[T.S.runs.length - 1]; if (!R) { say(`${name}: не начался`); continue; }
      T.S.focus = R.id;
      for (let n = 0; n < 6 && !R.over; n++) { T.S.route = 'descent'; run(name + ' · ход', () => T.advance(R, 4000)); T.S.route = 'battle'; T.S.insp = R.b ? '1:0' : null; draw(`${name} · бой${tag}`); scan(`${name} · бой · полоса${tag}`, battleParts()); }
      T.S.legend = true; draw(`${name} · знаки${tag}`); T.S.legend = false;
      T.S.route = 'descent';
      for (let n = 0; !R.over && n < 20000; n++) run(name + ' · ход', () => T.advance(R, 60000));
      T.S.overlay = { t: 'result', arg: R.id }; draw(`${name} · итог${tag}`);
    }
    /* листы с аргументами */
    reset();
    const sheets = [['prep', ''], ['prep', 'echo'], ['inbox'], ['level'], ['coll'], ['mem'], ['memreset'], ['gift'], ['settings'], ['chat'], ['gifts', 'me'], ['darbox', '']]
      .concat(['gold', 'spirit', 'souls', 'enerium', 'keys', 'dust'].map(k => ['cur', k]), ['Эхо', 'Событие', 'Арена', 'Контракты', 'Клановый босс'].map(k => ['rank', k]),
        T.S.arena.opp.map((_, i) => ['opp', String(i)]), T.S.rituals.work.map((_, i) => ['ritual', 'work:' + i]), T.S.rituals.hero.map((_, i) => ['ritual', 'hero:' + i]),
        T.S.foes.map(f => ['foe', f.id]));
    for (const [t, arg] of sheets) { reset(); if (!T.OV[t]) continue; T.S.route = 'shelter'; T.S.overlay = { t, arg }; draw(`лист ${t} ${arg || ''}${tag}`); }
    reset(); T.S.known = []; for (const f of T.S.foes) { T.S.overlay = { t: 'foe', arg: f.id }; draw(`лист врага до победы · ${f.id}${tag}`); }
    /* сведения о предмете: по одному на ярус */
    reset();
    const byTier = {}; for (const it of T.RX.items) if (!it.team && !byTier[it.tier]) byTier[it.tier] = it.id;
    for (const id of Object.values(byTier)) { T.S.overlay = { t: 'item', arg: id }; draw(`сведения · ${id}${tag}`); }
    /* подтверждения: Призыв за золото, за Энериум, пробуждение из осколков */
    const hireOf = src => T.RS.heroes.find(h => h.src === src && h.c === 2);
    for (const [a, h, prep] of [['gbuy', hireOf('gold')], ['dbuy', hireOf('donat')], ['activate', hireOf('roulette'), h => { T.S.rs.shards[h.id] = T.RS.rules.stub.shards; }]]) {
      if (!h) continue;
      reset(); T.S.acc.cycle = 2; T.S.route = 'heroes'; T.S.seg.heroes = 'hire'; if (prep) prep(h);
      run(a, () => T.ACT[a](h.id)); draw(`подтверждение ${a}${tag}`);
    }
    /* подтверждения и активации */
    for (const [a, v] of [['limit', ''], ['valor', ''], ['buy', '0'], ['mkbuy', 'l1']]) {
      reset(); T.S.route = a.startsWith('mk') || a === 'buy' ? 'craft' : 'heroes';
      if (T.ACT[a]) { run(a, () => T.ACT[a](v)); draw(`подтверждение ${a}${tag}`); }
    }
    for (const tier of Object.keys(T.ACTIVATE)) {
      const it = T.RX.items.find(i => i.tier === tier && !i.team); if (!it) continue;
      reset(); T.BAG.add(it.id, 1); run('активация ' + tier, () => T.ACTIVATE[tier](it.id)); draw(`активация ${tier}${tag}`);
    }
    /* разговоры проводников */
    for (const k of Object.keys(T.NPCS)) for (let i = 0; i < T.NPCS[k].say.length; i++) { reset(); T.S.overlay = { t: 'npc', arg: k, i }; draw(`разговор ${k} ${i}${tag}`); }
    /* сценарии презентации */
    for (const [t, , f] of T.FLOWS) { reset(); run('сценарий ' + t, () => f()); draw(`сценарий «${t}»${tag}`); T.S.runs = []; }
  }

  tour(false);
  const playerViews = views, playerHits = [...hits.values()];
  views = 0; teamPass = true;
  tour(true);
  const teamViews = views;
  if (!teamEls) say('режим «Команда»: ни одного элемента team-only — служебное не размечено');
  run('режим «Игрок»', () => T.setTeam(false));

  if (DUMP) {
    let cur = '';
    for (const [w, t] of dump) { if (w !== cur) { console.log('\n== ' + w); cur = w; } console.log('  ' + t); }
  }
  if (playerHits.length) {
    const by = {};
    for (const x of playerHits) (by[x.what] = by[x.what] || []).push(x);
    const out = [];
    for (const [what, list] of Object.entries(by)) {
      out.push(`${what} — ${list.length}:`);
      for (const x of list.slice(0, 40)) out.push(`  ${x.where}${x.n > 1 ? ` (и ещё ${x.n - 1})` : ''}: «${x.snip}»`);
      if (list.length > 40) out.push(`  … и ещё ${list.length - 40}`);
    }
    err.push(`служебное в режиме «Игрок» — ${playerHits.length}:\n` + out.join('\n'));
  }
  console.log(`Глазами игрока: отрисовок ${playerViews}, в режиме «Команда» — ${teamViews}, элементов team-only в режиме «Команда» — ${teamEls}.`);
  done();
}
