/* Автопроверка иконок, нарисованных сеткой (design/ui/screens/art-icons.js, tools/art-gen/ui-icons.json) — без браузера.
   Слово автора 30.09.2026: «делай всю библиотеку всех скилов, а после тогда в таком же стиле сделай сетку для духовных талисманов,
   снаряжений».
   1. Файлы: у каждой способности библиотеки (abilities.js), линейки талисмана (talismans.js) и шаблона снаряжения (equipment.js) есть
      иконка в design/ui/assets/art — по тому же пути, что строит помощник; плюс «способность скрыта» и «талисман скрыт». Каждая —
      WebP 256 × 256. Опись выгрузки ui-icons.json и папки spells, tal, gear совпадают: ни пропусков, ни лишних файлов.
   2. Опись ui-icons.json берёт итоговую клетку: исходник есть в art/generated, клетка листа переделки («fix» в id задания) заменяет
      клетку большого листа.
   3. Помощники art-icons.js: abArt по id способности, eqIcon по слоту и редкости (и шаблону «слот.редкость», и предмету), talIcon — по
      ключу линейки и по имени линейки в alt (так зовут окна «Ремесла»: запасы, перековка); без линейки — прежний значок семейства;
      у записи без id (прежний набор врагов) иконки нет — вызывающий рисует вектор.
   4. Места показа: книга героя (heroKitHtml) и библиотека UI-кита зовут abArt, плитка талисмана — талисман линейки, плитка
      снаряжения — редкость предмета, неизвестная душа — «способность скрыта».
   5. Ресурсы (слово автора: «Иконки по ресурсам начинай генерировать только тогда, когда придёт с отчётом Этрион»): у каждого предмета
      recipes.js, кроме готовой картинки (img) и героев (fam hero), есть res/<id>.webp 256 × 256, плюс «ресурс скрыт»; опись и папка res
      совпадают; resArt не даёт иконку предмету с img и герою; trIcon (index.html) берёт иконку раньше вектора, it.img — главнее;
      закрытый предмет в запасах, лавке, на рынке, в листе «Сведения», сундуке и Эхо — «ресурс скрыт», а не замок.
   Запуск: node tools/content-gen/screens/check_icons.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..'), UI = path.join(ROOT, 'design', 'ui'), ART = path.join(UI, 'assets', 'art');
const read = f => fs.readFileSync(path.join(UI, f), 'utf8');
const err = [], cnt = { spells: 0, tal: 0, gear: 0, res: 0 };
const say = m => { if (err.length < 60) err.push(m); else if (err.length === 60) err.push('… и ещё ошибки'); };
function done() {
  if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }
  console.log(`Иконки сеткой: способностей ${cnt.spells}, линеек талисманов ${cnt.tal}, шаблонов снаряжения ${cnt.gear}, предметов ресурсов ${cnt.res}.`);
  console.log('Проверка пройдена: у каждой способности, линейки, шаблона и предмета есть иконка 256 px, опись и выгрузка совпадают, помощники находят иконку по id, имени и редкости, закрытый предмет — «ресурс скрыт».');
  process.exit(0);
}

/* данные прототипа — как в браузере */
const data = f => { const ctx = { console }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read(f), ctx, { filename: f }); return ctx; };
const A = data('abilities.js').EN_ABILITIES, T = data('talismans.js').EN_TALISMANS, E = data('equipment.js').EN_EQUIPMENT, R = data('recipes.js').EN_RECIPES;

/* помощники art-icons.js в песочнице: заглушки того, что даёт index.html */
const ctx = { console, KIT_EXTRA: [], EN_TALISMANS: T, document: { baseURI: 'file:///' } };
ctx.window = ctx;
ctx.AV = p => 'assets/art/' + p;
ctx.ic = n => `<svg class="i" data-i="${n}"></svg>`;
ctx.abIcon = () => 'spark';
vm.createContext(ctx);
vm.runInContext(read('screens/art-icons.js'), ctx, { filename: 'screens/art-icons.js' });
const run = code => vm.runInContext(code, ctx);
const srcOf = html => { const m = /src="assets\/art\/([^"]+)"/.exec(html || ''); return m ? m[1] : ''; };

/* WebP: размер из заголовка VP8 / VP8L / VP8X */
function webpSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  return null;
}
const need = new Set();
function want(p, what) {
  need.add(p);
  const f = path.join(ART, p);
  if (!fs.existsSync(f)) return say(`${what}: нет файла assets/art/${p}`);
  const s = webpSize(f);
  if (!s) say(`${p}: не WebP`);
  else if (s[0] !== 256 || s[1] !== 256) say(`${p}: ${s[0]}×${s[1]}, нужно 256×256`);
}

/* ================== 1–3. файлы и помощники ================== */
const G = run('ART_ICONS.grid');
if (!G || !G.spells || !G.tal || !G.gear || !G.res) say('ART_ICONS.grid: выгружены не все наборы — spells, tal, gear, res');
// способности
const abilities = A.sets.flatMap(s => s.items);
if (abilities.length !== A.total) say(`abilities.js: способностей ${abilities.length}, а total ${A.total}`);
for (const a of abilities) {
  const html = run(`abArt(${JSON.stringify({ id: a.id })}, 32)`), p = srcOf(html);
  if (!p) { say(`${a.id} «${a.n}»: abArt не дал иконку`); continue; }
  want(p, `${a.id} «${a.n}»`); cnt.spells++;
}
want(run('ART_ICONS.spellHidden'), 'способность скрыта');
if (run(`abArt({ n: 'Вызов' }, 32)`)) say('abArt: запись без id (прежний набор) получила иконку — вызывающий должен рисовать вектор');
if (!/data-i="spark"/.test(run(`abIco({ n: 'Вызов' }, 32)`))) say('abIco: без иконки нет прежнего вектора');
// талисманы
for (const key of Object.keys(T.fams)) {
  const f = T.fams[key], byKey = srcOf(run(`talIcon(${JSON.stringify(f.cat)}, 40, '', ${JSON.stringify(key)})`));
  const byName = srcOf(run(`talIcon(${JSON.stringify(f.cat)}, 40, ${JSON.stringify(f.n)})`));
  if (byKey !== `tal/${key}.webp`) { say(`${key} «${f.n}»: talIcon по ключу дал «${byKey}»`); continue; }
  if (byName !== byKey) say(`${key} «${f.n}»: talIcon по имени (окна «Ремесла») дал «${byName}»`);
  want(byKey, `талисман ${key} «${f.n}»`); cnt.tal++;
}
want(run('ART_ICONS.talHidden'), 'талисман скрыт');
for (const c of Object.keys(T.rules.cats)) if (srcOf(run(`talIcon(${JSON.stringify(c)}, 40, '')`)) !== `talismans/${c}.png`) say(`talIcon('${c}') без линейки: нет прежнего значка семейства`);
// снаряжение
for (const id of Object.keys(E.templates)) {
  const t = E.templates[id], p = `gear/${t.slot}-${t.r}.webp`;
  const a = srcOf(run(`eqIcon(${JSON.stringify(t.slot)}, 40, '', ${t.r})`)), b = srcOf(run(`eqIcon(${JSON.stringify(id)}, 40)`)), c = srcOf(run(`eqIcon(${JSON.stringify({ slot: t.slot, r: t.r })}, 40)`));
  if (a !== p || b !== p || c !== p) { say(`${id}: eqIcon дал «${a}», «${b}», «${c}» вместо ${p}`); continue; }
  want(p, `снаряжение ${id}`); cnt.gear++;
}
for (const s of E.rules.slots) if (srcOf(run(`eqIcon(${JSON.stringify(s)}, 40)`)) !== `gear/${s}-1.webp`) say(`eqIcon('${s}') без редкости: нужна иконка обычной вещи`);
// ресурсы
for (const it of R.items) {
  const p = srcOf(run(`resArt(${JSON.stringify(it)}, 48)`)), drawn = !it.img && it.fam !== 'hero';
  if (!drawn) { if (p) say(`${it.id} «${it.n}»: у предмета ${it.img ? 'своя картинка' : 'портрет героя'}, а resArt дал иконку`); continue; }
  if (p !== `res/${it.id}.webp`) { say(`${it.id} «${it.n}»: resArt дал «${p}»`); continue; }
  want(p, `ресурс ${it.id} «${it.n}»`); cnt.res++;
}
want(run('ART_ICONS.resHidden'), 'ресурс скрыт');
if (srcOf(run(`resHideIco(48)`)) !== run('ART_ICONS.resHidden')) say('resHideIco: не «ресурс скрыт»');
// опись выгрузки и папки совпадают
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art-gen', 'ui-icons.json'), 'utf8'));
const items = Object.keys(spec.items);
for (const p of items) {
  if (!need.has(p)) say(`ui-icons.json: ${p} — лишняя запись, её не берёт ни один помощник`);
  const src = spec.items[p], from = typeof src === 'string' ? src : src.from;
  if (!fs.existsSync(path.join(ROOT, 'art', 'generated', from))) say(`ui-icons.json: ${p} ← ${from} — исходника нет`);
}
for (const p of need) if (!spec.items[p]) say(`ui-icons.json: нет записи ${p}`);
for (const dir of ['spells', 'tal', 'gear', 'res']) {
  const full = path.join(ART, dir);
  for (const f of fs.existsSync(full) ? fs.readdirSync(full) : []) if (!need.has(`${dir}/${f}`)) say(`assets/art/${dir}/${f} — файл не из описи`);
}
// переделка заменяет большой лист
const fix = Object.entries(spec.items).filter(([, s]) => /fix/.test(typeof s === 'string' ? s : s.from));
if (!fix.length) say('ui-icons.json: нет ни одной клетки листа переделки — слабые клетки не заменены');
for (const [p, s] of Object.entries(spec.items)) {
  const from = typeof s === 'string' ? s : s.from, m = /^(spell-icons|res-icons)\/([a-zA-Z0-9-]+)\//.exec(from);
  if (!m || /fix/.test(m[2])) continue;
  const stem = path.basename(from).replace(/(\.fix)?\.webp$/, ''), dir = path.join(ROOT, 'art', 'generated', m[1]);
  const fixed = fs.readdirSync(dir).filter(d => /fix/.test(d) && fs.existsSync(path.join(dir, d, stem + '.webp')));
  if (fixed.length) say(`${p}: взята клетка большого листа, хотя есть переделка в ${fixed.join(', ')}`);
}

/* ================== 4. места показа ================== */
const html = read('index.html'), src = f => read('screens/' + f);
const fnOf = (code, name) => { const m = new RegExp(`function ${name}\\(`).exec(code); return m ? code.slice(m.index, code.indexOf('\n}', m.index)) : ''; };
if (!/abArt\(a, \d+/.test(fnOf(html, 'heroKitHtml'))) say('index.html: книга героя (heroKitHtml, вкладка «Навыки») не зовёт abArt');
if (!/abArt\(a, 24\)/.test(fnOf(html, 'klTile')) || !/abArt\(a, 46\)/.test(fnOf(html, 'klDetail'))) say('index.html: библиотека UI-кита (klTile, klDetail) не зовёт abArt');
if (!/abArt\(a, 26\)/.test(fnOf(html, 'khKit'))) say('index.html: набор героя черновика (khKit) не зовёт abArt');
if (!/talIcon\(f\.cat, [^)]*tlFid\(no\)\)/.test(src('talismans.js'))) say('screens/talismans.js: плитка талисмана не передаёт линейку в talIcon');
if (!/eqPic\(it\.slot, o\.lg \? 48 : 32, it\.r\)/.test(src('equipment.js'))) say('screens/equipment.js: плитка предмета не передаёт редкость');
if (!/abHiddenArt\(/.test(fnOf(src('heroes.js'), 'hcSoulBody'))) say('screens/heroes.js: неизвестная душа не показывает «способность скрыта»');
if (!/abArt\(x\.ab/.test(src('hero-dev.js'))) say('screens/hero-dev.js: строки развития не зовут abArt');
{
  const tr = fnOf(html, 'trIcon'), iImg = tr.indexOf('it.img'), iArt = tr.indexOf('resArt(');
  if (iArt < 0) say('index.html: trIcon не берёт иконку ресурса (resArt)');
  else if (iImg < 0 || iImg > iArt) say('index.html: trIcon — готовая картинка it.img должна быть главнее иконки сеткой');
  const lock = [['index.html', html], ...['bag.js', 'shop.js', 'market.js', 'chest-open.js', 'echo.js'].map(f => ['screens/' + f, src(f)])]
    .filter(([, code]) => /ic\('lock'\) : trIcon\(/.test(code.replace(/typeof resHideIco === 'function' \? resHideIco\([^)]*\) : ic\('lock'\)/g, '')));
  for (const [f] of lock) say(`${f}: закрытый предмет рисуется замком — нужен «ресурс скрыт» (resHideIco)`);
}
done();
