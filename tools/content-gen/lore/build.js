/* Сборщик Летописи в «Страннике»: главы лора для игрока.
   Читает:
   - tools/content-gen/lore/chapters.js — разделы, главы, условия открытия, тексты, выбор картинок (правится только там);
   - tools/content-gen/lore/doc.md — текст черновика для автора, таблицы вставляются вместо @@имя@@, числа — вместо {{имя}};
   - tools/content-gen/screens/check_player_view.js — служебные слова, которых игрок видеть не должен;
   - tools/content-gen/lore/spoilers.js — спойлеры по разделу дайджеста «Нельзя показывать раннему игроку», биомы 11–12 из §38
     и тайны городов из свода; каждое слово списка сверяется со своим источником;
   - tools/art-gen/jobs/chronicle.json — задания арта глав; art/generated/manifest.json — траты; tools/art-gen/ui-art.json и
     design/ui/assets/art/lore/ — что уже выгружено в прототип.
   Пишет:
   - design/ui/chronicle.js — window.EN_CHRONICLE для screens/chronicle.js, руками не править;
   - docs/content/летопись.md — черновик для автора.
   Проверки — любая ошибка, и файлы не пишутся:
   - разделы и главы целые: id, раздел, свет, заглушка, условие открытия (уровень, цикл I–V, биом из WHY.b), картинка из ART;
   - текст игрока: главная мысль — не длиннее LIMITS.lead, «ещё» — не больше трёх абзацев по LIMITS.para; без «!» — голос без
     восклицаний; без служебных слов; без спойлеров дайджеста, биомов 11–12 и тайн городов; в разделе «Спуск» — без искажённых
     и нежити; Этрион — только вестник и летописец; ложный след «мир создали Энтериалы» держится в главе «Пятеро»;
   - арт: у каждой картинки — задание в chronicle.json и выбранный файл в art/generated/; в промтах нет Эуклида и спойлеров.
   Запуск: node tools/content-gen/lore/build.js          — собрать
           node tools/content-gen/lore/build.js --check  — сверить собранное с исходником, ничего не писать */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  src: path.join(__dirname, 'chapters.js'), doc: path.join(__dirname, 'doc.md'),
  service: path.join(ROOT, 'tools', 'content-gen', 'screens', 'check_player_view.js'),
  jobs: path.join(ROOT, 'tools', 'art-gen', 'jobs', 'chronicle.json'), manifest: path.join(ROOT, 'art', 'generated', 'manifest.json'),
  uiArt: path.join(ROOT, 'tools', 'art-gen', 'ui-art.json'), assets: path.join(ROOT, 'design', 'ui', 'assets', 'art'),
  generated: path.join(ROOT, 'art', 'generated'),
  outData: path.join(ROOT, 'design', 'ui', 'chronicle.js'), outDoc: path.join(ROOT, 'docs', 'content', 'летопись.md'),
};
const read = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const err = [];
const fail = m => err.push(m);

/* ================================ ДАННЫЕ ПРОВЕРОК ================================ */
const LIMITS = { lead: 150, para: 340, paras: 3 };            // символов: главная мысль — две строки страницы; абзац «ещё»; абзацев
const TONES = ['air', 'earth', 'fire', 'water', 'time', 'gold'];
const STUBS = ['god', 'city', 'five', 'hourglass', 'karst', 'lights', 'cradle', 'stair', 'peoples', 'ruins', 'chasm', 'portal', 'gate', 'tower', 'rings'];
const CYCLE_MAX = 5;                                           // цикл VI — спойлер: ни одна глава не ждёт его
/* ================================ СБОРКА ================================ */
const SRC = require(FILES.src);
const { PARTS, CHAPTERS, WHY, ART } = SRC;
const SERVICE = require(FILES.service).SERVICE;
const SP = require('./spoilers.js');
for (const m of SP.verify()) fail(m);

/* ---------- разделы и главы ---------- */
const PART = new Map();
for (const p of PARTS) {
  if (!p.id || !p.n || !p.d) fail(`раздел ${p.id || '?'}: пустое поле`);
  if (PART.has(p.id)) fail(`раздел ${p.id}: id повторяется`);
  PART.set(p.id, p);
}
const CH = new Map();
for (const c of CHAPTERS) {
  const w = `глава ${c.id || '?'}`;
  if (!c.id || !/^[a-z]+$/.test(c.id)) fail(`${w}: id — строчная латиница`);
  if (CH.has(c.id)) fail(`${w}: id повторяется`);
  CH.set(c.id, c);
  const p = PART.get(c.part);
  if (!p) fail(`${w}: раздела «${c.part}» нет`);
  else if (p.id === 'best') fail(`${w}: бестиарий рисует index.html, своих глав у него нет`);
  if (!c.n || !c.tag || !c.lead) fail(`${w}: пустое название, строка над ним или главная мысль`);
  if (!TONES.includes(c.tone)) fail(`${w}: свет «${c.tone}»`);
  if (!STUBS.includes(c.stub)) fail(`${w}: заглушка «${c.stub}»`);
  if (!Number.isInteger(c.fy) || c.fy < 0 || c.fy > 100) fail(`${w}: фокус кадра ${c.fy} — не целое 0–100`);
  const o = c.open || {};
  for (const k of Object.keys(o)) if (!['lv', 'c', 'b'].includes(k)) fail(`${w}: условие «${k}»`);
  if ('lv' in o && (!Number.isInteger(o.lv) || o.lv < 1)) fail(`${w}: уровень ${o.lv}`);
  if ('c' in o && (!Number.isInteger(o.c) || o.c < 1 || o.c > CYCLE_MAX)) fail(`${w}: цикл ${o.c} — только I–${['', 'I', 'II', 'III', 'IV', 'V'][CYCLE_MAX]}: цикл VI — спойлер`);
  if ('b' in o && !(o.b in WHY.b)) fail(`${w}: биом «${o.b}» — нет строки условия в WHY.b`);
  if (c.art && !(c.art in ART.files)) fail(`${w}: картинки «${c.art}» нет в таблице выгрузки ART`);
  if (!Array.isArray(c.more) || c.more.length > LIMITS.paras) fail(`${w}: «ещё» — больше ${LIMITS.paras} абзацев`);
  if (c.lead.length > LIMITS.lead) fail(`${w}: главная мысль ${c.lead.length} символов — больше ${LIMITS.lead}, это не две строки`);
  for (const [i, t] of (c.more || []).entries()) if (!t || t.length > LIMITS.para) fail(`${w}: абзац ${i + 1} «ещё» — ${t ? t.length : 0} символов, предел ${LIMITS.para}`);
  if (!c.src || !c.note) fail(`${w}: нет источника или решения для команды`);
}
for (const c of CHAPTERS) for (const id of c.mosaic || []) { const x = CH.get(id); if (!x || !x.art) fail(`глава ${c.id}: полоса «${id}» без картинки`); }
for (const p of PARTS) if (p.id !== 'best' && !CHAPTERS.some(c => c.part === p.id)) fail(`раздел ${p.id}: ни одной главы`);

/* ---------- текст игрока ---------- */
const playerTexts = c => [['название', c.n], ['строка', c.tag], ['мысль', c.lead]].concat((c.more || []).map((t, i) => [`абзац ${i + 1}`, t]));
function scanText(where, t, part) {
  if (/!/.test(t)) fail(`${where}: «!» — голос сказителя без восклицаний`);
  for (const [what, re] of SERVICE) if (re.test(t)) fail(`${where}: служебное слово — ${what}: «${t.slice(0, 80)}…»`);
  for (const x of SP.scan(t, part)) fail(`${where}: спойлер «${x.hit}» — ${x.why}`);
}
for (const p of PARTS) { scanText(`раздел ${p.id} · название`, p.n); scanText(`раздел ${p.id} · описание`, p.d); }
for (const c of CHAPTERS) for (const [k, t] of playerTexts(c)) scanText(`глава ${c.id} · ${k}`, t, c.part);
for (const k of Object.keys(WHY.b)) scanText(`условие биома ${k}`, WHY.b[k]);
{
  const five = CH.get('five');
  if (!five || !/сотворили пятеро энтериалов/i.test(five.lead)) fail('ложный след «мир создали Энтериалы»: глава «Пятеро» его не держит');
}

/* ---------- арт ---------- */
const JOBS = JSON.parse(read(FILES.jobs));
const jobIds = new Set(JOBS.jobs.map(j => j.id));
const promptOf = j => [JOBS.style, JOBS.negative, JOBS.categories[j.category] && JOBS.categories[j.category].frame, j.subject].join('\n');
for (const j of JOBS.jobs) { const m = promptOf(j).match(SP.PROMPT_BAN); if (m) fail(`арт ${j.id}: в промте «${m[0]}» — спойлер`); }
for (const [name, from] of Object.entries(ART.files)) {
  if (!jobIds.has('lore-' + name)) fail(`арт ${name}: нет задания lore-${name} в tools/art-gen/jobs/chronicle.json`);
  if (!fs.existsSync(path.join(FILES.generated, from))) fail(`арт ${name}: нет файла art/generated/${from}`);
  if (!from.startsWith(`${JOBS.jobs.find(j => j.id === 'lore-' + name) ? JOBS.jobs.find(j => j.id === 'lore-' + name).category : '?'}/lore-${name}__`)) fail(`арт ${name}: файл ${from} — не из своего задания`);
  if (!CHAPTERS.some(c => c.art === name)) fail(`арт ${name}: ни одна глава его не показывает`);
}
for (const j of JOBS.jobs) if (!(j.id.replace(/^lore-/, '') in ART.files)) fail(`задание ${j.id}: картинка не выбрана в ART`);
const artPath = name => `lore/${name}.jpg`;
/* выгружено: строка в таблице выгрузки ui-art.json и файл в design/ui/assets/art — как у биомов (tools/content-gen/biomes/build.js) */
function artReady() {
  const table = fs.existsSync(FILES.uiArt) ? JSON.parse(read(FILES.uiArt)).items || {} : {};
  return Object.keys(ART.files).map(artPath).filter(p => p in table && fs.existsSync(path.join(FILES.assets, p)));
}
/* траты: записи манифеста по заданиям chronicle.json */
function spend() {
  const M = fs.existsSync(FILES.manifest) ? JSON.parse(read(FILES.manifest)).items || [] : [];
  const mine = M.filter(x => jobIds.has(x.job));
  const byJob = {};
  for (const x of mine) (byJob[x.job] = byJob[x.job] || []).push(x);
  return { n: mine.length, usd: mine.reduce((a, x) => a + (x.cost_usd || 0), 0), byJob };
}

/* ---------- условия открытия — строка игроку ---------- */
function whyOf(c) {
  const o = c.open || {}, parts = [];
  if (o.c) parts.push(WHY.c(o.c));
  if (o.lv) parts.push(WHY.lv(o.lv));
  if (o.b) parts.push(WHY.b[o.b]);
  return parts.length ? parts.join(' и ').replace(/ и Откроется/g, ' и') : '';
}

if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }

/* ================================ ВЫВОД ================================ */
const sig = crypto.createHash('sha1').update(read(FILES.src)).digest('hex').slice(0, 12);
const ready = artReady();
const DATA = {
  sig,
  parts: PARTS.map(p => Object.assign({ id: p.id, n: p.n, d: p.d }, p.ref ? { ref: true } : {})),
  chapters: CHAPTERS.map(c => {
    const o = { id: c.id, part: c.part, n: c.n, tag: c.tag, tone: c.tone, named: !!c.named, open: c.open || {}, why: whyOf(c), stub: c.stub, fy: c.fy, lead: c.lead, more: c.more || [] };
    if (c.art) o.art = artPath(c.art);
    if (c.mosaic) o.mosaic = c.mosaic;
    o.src = c.src; o.note = c.note;
    return o;
  }),
  art: { dir: 'lore/', ready, size: ART.size, table: Object.fromEntries(Object.entries(ART.files).map(([k, v]) => [artPath(k), v])) },
};
const dataJs = `/* Собрано tools/content-gen/lore/build.js из tools/content-gen/lore/chapters.js — Летопись в «Страннике»: разделы книги,
   главы лора, условия открытия, картинки. Руками не править. Черновик для автора — docs/content/летопись.md.
   §28.3 GDD, ADR-0022, ADR-0024, ADR-0026. Условия открытия — демонстрация, решает «сервер» CHR_SRV (screens/chronicle.js).

   window.EN_CHRONICLE = {
     sig,                                   // подпись исходника: сборка свежая, если совпадает с chapters.js
     parts: [{ id, n, d, ref? }],           // разделы книги; ref — справка (бестиарий рисует index.html)
     chapters: [{ id, part, n, tag, tone, named, open: { lv?, c?, b? }, why, stub, fy, lead, more, art?, mosaic?, src, note }],
     art: { dir, ready, size, table },      // ready — выгруженные пути от assets/art; table — путь в прототипе → файл art/generated
   } */
window.EN_CHRONICLE = ${JSON.stringify(DATA)};
`;

/* ---------- черновик ---------- */
const T = (head, rows) => ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|'].concat(rows.map(r => '| ' + r.map(x => String(x).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |')).join('\n');
const S$ = spend();
const openTxt = c => whyOf(c).replace(/^Откроется /, '').replace(/ и Откроется /g, ' и ') || 'с начала игры';
const plural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; };
const parts = {};
parts.open = T(['Раздел', 'Глава', 'Когда открывается', 'Картинка'], CHAPTERS.map(c => [PART.get(c.part).n, c.n, openTxt(c), c.art ? artPath(c.art) : c.mosaic ? 'пять полос из картинок богов' : `заглушка «${c.stub}»`]));
parts.chapters = PARTS.filter(p => p.id !== 'best').map(p => [`### ${p.n}`, '', `*${p.d}.*`, ''].concat(CHAPTERS.filter(c => c.part === p.id).map(c => [
  `#### ${c.n}`, '', `*${c.tag} · ${whyOf(c) ? 'откроется ' + openTxt(c) : openTxt(c)}${c.art ? ` · картинка ${artPath(c.art)}` : c.mosaic ? ' · картинка — пять полос из картинок богов' : ''}*`, '',
  `**${c.lead}**`, '', ...c.more.flatMap(t => [t, '']),
  `> Источник: ${c.src}`, '>', `> Решение: ${c.note}`, ''].join('\n'))).join('\n')).join('\n');
parts.art = T(['Картинка в прототипе', 'Файл art/generated', 'Размер выгрузки', 'Попыток', 'Цена, $'], Object.entries(ART.files).map(([k, v]) => {
  const runs = S$.byJob['lore-' + k] || [];
  return [`design/ui/assets/art/${artPath(k)}`, v, ART.size.join('×'), runs.length, runs.reduce((a, x) => a + (x.cost_usd || 0), 0).toFixed(3)];
}));
parts.uiart = '```json\n' + Object.entries(ART.files).map(([k, v]) => `    ${JSON.stringify(artPath(k))}: { "from": ${JSON.stringify(v)}, "size": [${ART.size.join(', ')}] }`).join(',\n') + '\n```';
const nums = {
  chapters: `${CHAPTERS.length} ${plural(CHAPTERS.length, 'глава', 'главы', 'глав')}`, parts: `${PARTS.length} ${plural(PARTS.length, 'раздел', 'раздела', 'разделов')}`, arts: Object.keys(ART.files).length, ready: ready.length,
  spent: S$.usd.toFixed(2).replace('.', ','), gens: S$.n, start: (n => `${n} ${plural(n, 'глава', 'главы', 'глав')}`)(CHAPTERS.filter(c => !whyOf(c)).length),
};
const doc = read(FILES.doc).replace(/@@(\w+)@@/g, (m, k) => { if (!(k in parts)) { fail(`doc.md: нет раздела @@${k}@@`); return m; } return parts[k]; })
  .replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in nums)) { fail(`doc.md: нет числа {{${k}}}`); return m; } return String(nums[k]); });
if (err.length) { console.log('ОШИБКИ:\n' + err.join('\n')); process.exit(1); }

if (process.argv.includes('--check')) {
  const stale = [[FILES.outData, dataJs], [FILES.outDoc, doc]].filter(([f, t]) => !fs.existsSync(f) || read(f) !== t).map(([f]) => path.relative(ROOT, f));
  if (stale.length) { console.log('Сборка устарела — перезапустите node tools/content-gen/lore/build.js: ' + stale.join(', ')); process.exit(1); }
  console.log(`Летопись: сборка свежая — глав ${CHAPTERS.length}, разделов ${PARTS.length}, картинок ${Object.keys(ART.files).length}, выгружено ${ready.length}; подпись ${sig}.`);
  process.exit(0);
}
fs.writeFileSync(FILES.outData, dataJs, 'utf8');
fs.writeFileSync(FILES.outDoc, doc, 'utf8');
console.log(`chronicle.js: глав ${CHAPTERS.length}, разделов ${PARTS.length}, картинок ${Object.keys(ART.files).length}, выгружено ${ready.length}; подпись ${sig}.`);
console.log(`летопись.md: арт — ${S$.n} генераций, $${S$.usd.toFixed(3)}.`);
