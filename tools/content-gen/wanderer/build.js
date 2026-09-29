/* Данные экрана «Странник» прототипа: Память Странника, артефакты, достижения → design/ui/wanderer.js (window.EN_WANDERER)
   и таблицы черновика docs/content/достижения.md.
   Читает таблицы автора (ADR-0003 — исходные постулаты, оригиналы не меняются):
   - source-data/Enerium_Странник_пассивки_Финал.xlsx — лист «Пассивки Странника» (146 записей, §2.8), листы «Настройки» и «Сводка» — для сверки весов;
   - source-data/Enerium_Артефакты_Финал.xlsx — лист «Артефакты» (18 записей, §14.1), лист «Правила» — правило цены уровня.
   Достижения — каталог achievements.js рядом: таблицы автора с достижениями нет (§29). Когда их получают — прогон achievements-pace.js
   по калькуляторам экономики: tools/content-gen/contracts/capacity.json, pace-inputs.json рядом (python pace_inputs.py — мост к sets.py
   и economy.py), design/ui/contracts.js (ёмкость занятий, исполнение контрактов), design/ui/arena.js (прогон Арены и Лиги),
   design/ui/rituals.js (прогон ритуалов), design/ui/event.js (очки События за неделю, пороги планок), tools/content-gen/biomes/pace.json.
   Порядок пересборки: режимы (контракты, Арена, ритуалы, Событие) → pace_inputs.py → этот сборщик.
   Только читает: design/ui/lootboxes.js — строки режима «Достижения» (сундук за достижение), недельные сундуки и допущения;
   design/ui/recipes.js — имена цикла «для команды», доля рецептов героев, шанс уникального ресурса; design/ui/echo-rules.js — шанс
   Многоликого; design/ui/roster.js — герои за золото по циклам; design/ui/contracts.js — какие достижения дают бесплатные замены;
   docs/lore/дайджест.md — раздел «Нельзя показывать раннему игроку»; source-data/provenance.json — хеши таблиц.
   Что правим под систему — блоки PAS_FIX и ART ниже: у каждой правки «было», «стало» и почему. Сборщик сверяет «было» с таблицей:
   если автор поменял таблицу, правка не применится молча — сборка упадёт и покажет строку.
   Проверки — любая ошибка, и файлы не пишутся. Числа — только целые. Пересборка даёт те же байты.
   Таблицы черновика — между метками «<!-- @таблица имя … -->» и «<!-- /таблица имя -->»; текст вокруг — ручной.
   Запуск: node tools/content-gen/wanderer/build.js           — собрать и записать;
           node tools/content-gen/wanderer/build.js --check   — только проверить, что wanderer.js и таблицы черновика свежие.
   Из других скриптов: require('./build.js').build() — { js, doc, tables, err, warn, log } без записи. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const { readSheet } = require('../lootboxes/xlsx.js');
const ACH = require('./achievements.js');
const AP = require('./achievements-pace.js');

/* ================================ ДАННЫЕ ================================ */

const RAR = ['Обычная', 'Редкая', 'Уникальная', 'Эпическая', 'Древняя', 'Первородная', 'Вневременная'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/* Память Странника (§2.4–§2.7, §0, §36.4–§36.7) */
const MEM = {
  places: [2, 3, 4, 5, 6],                          // §2.4: места открываются при входе в циклы II–VI; цикл I — обучение, своего выбора нет
  rarBp: [4500, 2000, 1500, 1000, 600, 300, 100],   // §2.6: доля редкости при розыгрыше варианта, б. п.; предложение — ручка баланса.
                                                    // Веса редкостей «по номеру перехода цикла» таблица обещает, но не задаёт — одна таблица на все места
  reroll: 50, reset: 100,                           // §0, §2.5, §2.7: платный переброс и полный сброс, Энериум, не × цикл
  free: 1,                                          // §2.5: бесплатных перебросов на место — демонстрационный лимит прототипа
  offer: 3,                                         // §2.5: вариантов в тройке
  slot: 201,                                        // ADR-0014: ещё один одновременный забег даёт «Право владыки» (№ 201, +1 активный биом)
  /* Решение 28.09.2026: эти пассивки выпадают только в бесплатных тройках — в первой тройке места и в бесплатном перебросе.
     В тройке после платного переброса и после полного сброса их вес 0: за Энериум их не вызвать (плательщик быстрее не больше ×1,7, §1).
     Бесплатный переброс сброс не возвращает, поэтому бесплатных троек у места за всю игру не больше двух. В данные — полем onlyFree */
  onlyFree: [201],
};

/* веса: «Настройки» — базовый вес редкости × множитель силы влияния, округление до целого; множитель — в процентах, чтобы считать целыми */
const WEIGHT = { base: [100, 75, 58, 45, 33, 25, 18], powPct: [125, 110, 100, 85, 70] };

/* Слова прототипа вместо слов таблицы — только вид, смысл не меняется:
   «магазин» в прототипе — «Лавка» (Ремесло → Лавка); «Гача» — «Возрождение душ» (§15); «Мета: слот» — талисманы (§26);
   «Доп. Дроп Золото» — «Золото: двойная добыча»; десятичная точка — запятая. */
const TERMS = {
  cat: { 'Магазин': 'Лавка', 'Гача': 'Возрождение душ', 'Мета': 'Талисманы' },
  fam: { 'Доп. Дроп Золото': 'Золото: двойная добыча' },
  famPrefix: [['Магазин:', 'Лавка:'], ['Гача:', 'Возрождение душ:'], ['Мета:', 'Талисманы:']],
  text: [[/магазина/g, 'лавки'], [/(\d)\.(\d)/g, '$1,$2']],
};

/* Правки пассивок под систему: № → { was — как в таблице (сверяется), now — как в данных, why } */
const KEY_WHY = 'Рунный ключ с элит не падает: только с босса биома и из контрактов (ADR-0023, вариант Б; §11)';
const PAS_FIX = {
  9: { was: { cat: 'Кланы', d: 'Личные очки Кланового босса +1%' }, now: { cat: 'Очки', d: 'Личные очки Кланового босса +10%' },
    why: 'Эффект повторял «Верный удар» (обычная, +1 %) того же семейства «Очки: КБ», а стоит древней «меняет билд». Лестница семейства — 1 → 3 → 5 → 10 %, как у «Ритуалы: скорость» и «Дух: цена уровней»; категория — как у семейства' },
  31: { was: { d: 'Шанс рунного ключа с элит выше на 3% (относительно)' }, now: { d: 'Шанс рунного ключа с босса биома выше на 3% (относительно)' }, why: KEY_WHY },
  78: { was: { d: 'Шанс рунного ключа с элит выше на 5% (относительно)' }, now: { d: 'Шанс рунного ключа с босса биома выше на 5% (относительно)' }, why: KEY_WHY },
  129: { was: { d: 'Шанс рунного ключа с элит выше на 7% (относительно)' }, now: { d: 'Шанс рунного ключа с босса биома выше на 7% (относительно)' }, why: KEY_WHY },
  181: { was: { d: 'Шанс рунного ключа с элит выше на 10% (относительно)' }, now: { d: 'Шанс рунного ключа с босса биома выше на 10% (относительно)' }, why: KEY_WHY },
};

/* Артефакты (§14.1). Правила автора: артефакт покупают за золото один раз, уровни качают за души — цена уровня = база × номер уровня
   (лист «Правила», п. 2); за цикл — один уровень: в цикле, где артефакт открылся, доступен I, в следующем — II (п. 1, §14.1 «потолок — текущий цикл»).
   Столбец «Все уровни, души» таблицы у девяти артефактов считан по прежнему числу уровней — сумма пересчитывается по правилу.
   Здесь — вид данных и правки: mode — режим; d — эффект за уровень; what — что растёт; step — прибавка за уровень (целое);
   unit — единица; base — исходное значение без артефакта (есть — показываем «было → стало»); lv — уровней, если правим.
   src — как в таблице (сверяется): эффект, уровней, с цикла. */
const ART = {
  1: { mode: 'Биомы', d: '+1 активный биом', what: 'Одновременных забегов', step: 1, unit: '', base: 1, src: { d: '+1 активный биом', lv: 5, from: 2 },
    note: 'Седьмой — пассивка Памяти «Право владыки»: до семи забегов разом (ADR-0014)' },
  2: { mode: 'Биомы', d: '+1 к верхней границе базовых ресурсов на этаже без элит', what: 'Верхняя граница базовых на этаже без элит', step: 1, unit: '', base: null,
    src: { d: '+1 к верхней границе ресурсов с обычных врагов', lv: 6, from: 1 },
    fix: 'Базовые ресурсы падают за этаж, а не с врага: за срабатывание — от одного до номера биома (ADR-0010, ADR-0023). «С обычных врагов» → «на этаже без элит»' },
  3: { mode: 'Биомы', d: '+1 к верхней границе базовых ресурсов на этаже с элитой', what: 'Верхняя граница базовых на этаже с элитой', step: 1, unit: '', base: null,
    src: { d: '+1 к верхней границе ресурсов с элит', lv: 6, from: 1 },
    fix: 'С элиты падают душа и ключ ремесла, базовые — за этаж (ADR-0010, ADR-0023). «С элит» → «на этаже с элитой»' },
  4: { mode: 'Биомы', d: '+5 % золота за убийство', what: 'Золото за убийство', step: 5, unit: ' %', base: null, src: { d: '+5% золота за убийство', lv: 6, from: 1 } },
  5: { mode: 'Биомы', d: '+10 % духа за убийство', what: 'Дух за убийство', step: 10, unit: ' %', base: null, src: { d: '+10% духа за убийство', lv: 6, from: 1 } },
  6: { mode: 'Биомы', d: '+1 душа с босса биома', what: 'Души с босса биома', step: 1, unit: '', base: null, src: { d: '+1 душа с босса биома', lv: 5, from: 2 } },
  7: { mode: 'Ключи', d: '+1 п.п. к шансу рунного ключа с босса биома', what: 'Шанс рунного ключа с босса', step: 1, unit: ' п.п.', base: null,
    src: { d: '+1 п.п. к шансу ключа с элит (1% → 7%)', lv: 6, from: 1 }, note: 'Шанс с босса биома — 10 %; обе отмычки вместе поднимают его до 25 % (§11)',
    fix: 'Рунный ключ с элит не падает (ADR-0023, вариант Б) — отмычка поднимает шанс с босса биома' },
  8: { mode: 'Ключи', d: '+3 п.п. к шансу рунного ключа с босса биома', what: 'Шанс рунного ключа с босса', step: 3, unit: ' п.п.', base: null, lv: 3,
    src: { d: '+6 п.п. к шансу ключа с босса биома (1% → 25%)', lv: 4, from: 2 }, note: 'Шанс с босса биома — 10 %; обе отмычки вместе поднимают его до 25 % (§11)',
    fix: 'База шанса с босса — 10 %, а не 1 % (recipes.js, §11: «10 % → 25 % с артефактами»). Вместе со «Связкой отмычек» (+6 п.п.) нужно ещё +9 п.п.: +3 п.п. за уровень, три уровня вместо четырёх' },
  9: { mode: 'Ресурсы', d: '+3 п.п. к шансу уникального ресурса босса', what: 'Шанс уникального ресурса босса', step: 3, unit: ' п.п.', base: null,
    src: { d: '+3 п.п. к шансу уникального ресурса босса (10% → 19%)', lv: 3, from: 3 }, note: 'С 5 % до 14 %',
    fix: 'Шанс уникального ресурса босса в данных — 5 % (recipes.js, §9.1), а не 10 %: «10 % → 19 %» → «5 % → 14 %»' },
  10: { mode: 'Эхо', d: '+1 вариант при призыве в Эхо', what: 'Вариантов при призыве в Эхо', step: 1, unit: '', base: 1, src: { d: '+1 вариант при призыве в Эхо (1 → 3)', lv: 2, from: 3 } },
  12: { mode: 'Контракты', d: '+2 задания в пуле контрактов', what: 'Заданий в пуле контрактов', step: 2, unit: '', base: 3, src: { d: '+2 задание в пуле контрактов (1 → 9)', lv: 4, from: 2 },
    fix: 'Пул заданий по умолчанию — 3 (§18.2), а не 1: «1 → 9» → «3 → 11»' },
  13: { mode: 'Контракты', d: '+1 бесплатный реролл заданий', what: 'Бесплатных рероллов заданий', step: 1, unit: '', base: 3, src: { d: '+1 бесплатный реролл заданий (1 →3)', lv: 2, from: 2 },
    fix: 'Бесплатных рероллов по умолчанию — 3 (§18.2), а не 1: «1 → 3» → «3 → 5»' },
  14: { mode: 'Ритуалы', d: '+2 слота ритуалов', what: 'Слотов ритуалов', step: 2, unit: '', base: 1, lv: 3, src: { d: '+2 слот ритуалов (1 →11)', lv: 5, from: 2 },
    fix: 'Потолок слотов ритуалов — 7 (лист «Правила», п. 4), в §19.2 — «1 → ~8 артефактами»; строка давала 11. Три уровня вместо пяти: 1 → 7' },
  15: { mode: 'Ритуалы', d: '+1 бесплатный ролл пула ритуалов', what: 'Бесплатных роллов ритуалов', step: 1, unit: '', base: 3, src: { d: '+1 бесплатный ролл пула ритуалов (3 → 6)', lv: 3, from: 2 } },
  16: { mode: 'Ритуалы', d: '+1 вариант при ролле ритуала', what: 'Вариантов при ролле ритуала', step: 1, unit: '', base: null, src: { d: '+1 вариант при ролле ритуала', lv: 2, from: 3 } },
  18: { mode: 'Лавка', d: '+2 товара в пуле лавки', what: 'Товаров в пуле лавки', step: 2, unit: '', base: 10, src: { d: '+2 товар в пуле магазина (10 → 20)', lv: 5, from: 1 } },
  19: { mode: 'Лавка', d: '+1 бесплатное обновление лавки в день', what: 'Бесплатных обновлений лавки', step: 1, unit: '', base: 1, src: { d: '+1 бесплатное обновление магазина в день (1 → 5)', lv: 4, from: 1 } },
  20: { mode: 'Рынок', d: '+1 лот на рынке', what: 'Лотов на рынке', step: 1, unit: '', base: 5, src: { d: '+1 лота на рынке (5 → 11)', lv: 6, from: 1 } },
};
const ART_RULES = {
  openLevel: 4,                   // §16: артефакты открываются на 4-м уровне аккаунта («Закрыть первый биом»)
  cycles: 6,                      // уровней не больше, чем циклов с цикла открытия: lv ≤ 7 − from
  activeMax: 7,                   // ADR-0014: одновременных забегов до семи — номер цикла и ещё один от Памяти; потолок «4» листа «Правила» устарел
};

/* Пороги проверок достижений */
const CHECK = {
  count: { pers: [45, 55], rev: [18, 26], myst: [18, 26] },   // §29: ~50, ~22, ~22
  firstsPerCycle: [0, 3, 5, 5, 5, 5, 5],                      // первенств по циклам I–VI: виды FIRSTS с их цикла
  hintShared: 1,                  // подсказка таинственного делит с условием не больше одного значимого слова (основа — первые 5 букв)
  curveDaysShow: 35,              // таблица кривой: по дням до конца цикла III, дальше — по неделям
};

/* ================================ СБОРКА ================================ */

const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  pas: path.join(ROOT, 'source-data', 'Enerium_Странник_пассивки_Финал.xlsx'),
  art: path.join(ROOT, 'source-data', 'Enerium_Артефакты_Финал.xlsx'),
  prov: path.join(ROOT, 'source-data', 'provenance.json'),
  loot: path.join(ROOT, 'design', 'ui', 'lootboxes.js'),
  recipes: path.join(ROOT, 'design', 'ui', 'recipes.js'),
  echoRules: path.join(ROOT, 'design', 'ui', 'echo-rules.js'),
  roster: path.join(ROOT, 'design', 'ui', 'roster.js'),
  contracts: path.join(ROOT, 'design', 'ui', 'contracts.js'),
  arena: path.join(ROOT, 'design', 'ui', 'arena.js'),
  rituals: path.join(ROOT, 'design', 'ui', 'rituals.js'),
  event: path.join(ROOT, 'design', 'ui', 'event.js'),
  cap: path.join(ROOT, 'tools', 'content-gen', 'contracts', 'capacity.json'),
  paceBiomes: path.join(ROOT, 'tools', 'content-gen', 'biomes', 'pace.json'),
  inputs: path.join(__dirname, 'pace-inputs.json'),
  digest: path.join(ROOT, 'docs', 'lore', 'дайджест.md'),
  out: path.join(ROOT, 'design', 'ui', 'wanderer.js'),
  doc: path.join(ROOT, 'docs', 'content', 'достижения.md'),
};
const isInt = x => Number.isInteger(x);
const loadWin = f => { const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }); return ctx.window; };
const SPOILERS = ['иридиум', 'иридис', 'марионетк', 'эуклид', 'оболочк', 'шестой элемент', 'колыбел', 'перворожд', 'демон'];
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2]; };
const form = (t, v) => (Array.isArray(t) ? plural(v, t) : t).replace('{v}', fmt(v));
/* дробь × 100 — строкой с запятой, одна цифра после неё */
const x100 = v => { const t = Math.round(v / 10); return `${fmt(Math.floor(t / 10))}${t % 10 ? ',' + (t % 10) : ''}`; };

function build() {
  const err = [], warn = [], log = [];
  const num = (s, what) => { const v = Number(String(s).trim()); if (!isInt(v)) err.push(`${what}: не целое число — «${s}»`); return v; };
  const rarOf = (name, what) => { const r = RAR.indexOf(String(name).trim()) + 1; if (!r) err.push(`${what}: неизвестная редкость «${name}»`); return r; };
  const terms = s => TERMS.text.reduce((t, [re, to]) => t.replace(re, to), String(s));
  const famName = f => TERMS.fam[f] || TERMS.famPrefix.reduce((t, [a, b]) => t.startsWith(a) ? b + t.slice(a.length) : t, f);

  /* ---------- хеши таблиц: совпадают ли с provenance.json ---------- */
  const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  const PROV = JSON.parse(fs.readFileSync(FILES.prov, 'utf8'));
  const hashes = {};
  for (const f of [FILES.pas, FILES.art]) {
    const name = path.basename(f), h = sha(f), p = PROV.find(x => x.file === name);
    hashes[name] = h;
    if (!p) warn.push(`${name}: нет в provenance.json`);
    else if (p.sha256 !== h) warn.push(`${name}: хеш не совпадает с provenance.json — таблицу обновили, сверить правки`);
  }

  /* ---------- спойлеры: раздел дайджеста и имена цикла «для команды» ---------- */
  const DIGEST = (() => {
    const t = fs.readFileSync(FILES.digest, 'utf8').replace(/\r\n/g, '\n'), i = t.indexOf('## Нельзя показывать раннему игроку');
    if (i < 0) { err.push('дайджест: нет раздела «Нельзя показывать раннему игроку»'); return ''; }
    const j = t.indexOf('\n## ', i + 3);
    return t.slice(i, j < 0 ? t.length : j).toLowerCase();
  })();
  const REC = loadWin(FILES.recipes).EN_RECIPES, LBX = loadWin(FILES.loot).EN_LOOTBOXES;
  const TEAM_WORDS = [...new Set(REC.cycles.filter(c => c.team).flatMap(c => c.biomes.flatMap(b => [b.n, b.boss, b.guard])).join(' ').split(/[^А-Яа-яЁё-]+/).filter(w => /^[А-ЯЁ]/.test(w) && w.length >= 5))];
  for (const w of ['иридиум', 'эуклид', 'оболочк', 'марионетк', 'перворожд']) if (!DIGEST.includes(w)) err.push(`дайджест: в разделе «Нельзя показывать» нет слова «${w}» — сверить список спойлеров`);
  const spoilOf = t => { const low = String(t).toLowerCase(); return SPOILERS.filter(s => low.includes(s)).concat(TEAM_WORDS.filter(w => String(t).includes(w))); };

  /* ================== Память: 146 пассивок ================== */
  const PS = readSheet(FILES.pas, 'Пассивки Странника'), PH = PS[0];
  const pcol = n => { const i = PH.indexOf(n); if (i < 0) err.push(`пассивки: нет столбца «${n}»`); return i; };
  const [cNo, cCat, cR, cN, cD, cPow, cW, cFam, cStack] = ['№', 'Категория', 'Редкость', 'Название', 'Эффект', 'Сила влияния', 'Вес (авто)', 'Семейство', 'Стек'].map(pcol);
  const fixes = [], passives = [], seenNo = new Set(), seenName = new Set();
  const usedFix = new Set();
  for (const row of PS.slice(1)) {
    if (!String(row[cNo] || '').trim()) continue;
    const no = num(row[cNo], 'пассивка №'), what = `пассивка № ${no} «${row[cN]}»`;
    if (seenNo.has(no)) err.push(`${what}: номер повторяется`); seenNo.add(no);
    if (seenName.has(row[cN])) err.push(`${what}: имя повторяется`); seenName.add(row[cN]);
    const src = { cat: String(row[cCat]).trim(), d: String(row[cD]).trim() };
    const p = { id: 'p' + no, no, cat: src.cat, r: rarOf(row[cR], what), n: String(row[cN]).trim(), d: src.d, pow: num(String(row[cPow]).split('—')[0], what + ', сила влияния'), w: num(row[cW], what + ', вес'), fam: String(row[cFam]).trim() };
    if (!/не стакается/.test(row[cStack])) err.push(`${what}: неизвестное правило стека «${row[cStack]}»`);
    const F = PAS_FIX[no];
    if (F) {
      usedFix.add(no);
      for (const [k, v] of Object.entries(F.was)) if (src[k] !== v) err.push(`${what}: правка ждёт «${k}» = «${v}», в таблице — «${src[k]}». Таблицу обновили — сверить правку`);
      Object.assign(p, F.now);
      fixes.push({ what: `Память · № ${no} «${p.n}»`, was: Object.entries(F.was).map(([k, v]) => v).join(' · '), now: Object.entries(F.now).map(([k, v]) => v).join(' · '), why: F.why });
    }
    /* вес по «Настройкам»: база редкости × множитель силы, округление до целого — половина вверх */
    const want = Math.floor((WEIGHT.base[p.r - 1] * WEIGHT.powPct[p.pow - 1] + 50) / 100);
    if (p.w !== want) err.push(`${what}: вес ${p.w}, по «Настройкам» — ${want}`);
    p.d = terms(p.d); p.cat = TERMS.cat[p.cat] || p.cat; p.fam = famName(p.fam);
    if (MEM.onlyFree.includes(no)) p.onlyFree = true;   // только в бесплатных тройках: за Энериум вес 0
    if (spoilOf(p.n + ' ' + p.d).length) err.push(`${what}: спойлер — ${spoilOf(p.n + ' ' + p.d).join(', ')}`);
    passives.push(p);
  }
  for (const no of Object.keys(PAS_FIX)) if (!usedFix.has(+no)) err.push(`правка пассивки № ${no}: такой строки в таблице нет`);
  passives.sort((a, b) => a.no - b.no);
  if (passives.length !== 146) err.push(`пассивок ${passives.length}, а §2.8 обещает 146`);
  /* «Настройки»: базовые веса и множители — те же, что в WEIGHT */
  {
    const N = readSheet(FILES.pas, 'Настройки');
    RAR.forEach((r, i) => { const row = N.find(x => String(x[0]).trim() === r); if (!row || num(row[1], '«Настройки» ' + r) !== WEIGHT.base[i]) err.push(`«Настройки»: базовый вес «${r}» не ${WEIGHT.base[i]}`); });
    WEIGHT.powPct.forEach((m, i) => { const row = N.find(x => String(x[3] || '').trim().startsWith(i + 1 + ' ')); if (!row || Math.round(Number(row[4]) * 100) !== m) err.push(`«Настройки»: множитель силы ${i + 1} не ${m} %`); });
  }
  /* «Сводка»: штук и сумма весов по редкостям совпадают с данными */
  const byR = RAR.map((_, i) => passives.filter(p => p.r === i + 1));
  {
    const SV = readSheet(FILES.pas, 'Сводка');
    RAR.forEach((r, i) => {
      const row = SV.find(x => String(x[0]).trim() === r);
      if (!row) { err.push(`«Сводка»: нет строки «${r}»`); return; }
      if (num(row[1], '«Сводка» ' + r) !== byR[i].length) err.push(`«Сводка» ${r}: штук ${row[1]}, в данных ${byR[i].length}`);
      if (num(row[2], '«Сводка» ' + r) !== byR[i].reduce((a, p) => a + p.w, 0)) err.push(`«Сводка» ${r}: сумма весов ${row[2]}, в данных ${byR[i].reduce((a, p) => a + p.w, 0)}`);
    });
  }
  if (MEM.rarBp.reduce((a, b) => a + b, 0) !== 10000) err.push('доли редкостей Памяти не дают 10 000 б. п.');
  byR.forEach((l, i) => { if (!l.length) err.push(`Память: пустая редкость «${RAR[i]}»`); });
  const slot = passives.find(p => p.no === MEM.slot);
  if (!slot || !/активн\S* биом/.test(slot.d)) err.push(`Память: пассивка № ${MEM.slot} должна давать +1 активный биом (ADR-0014)`);
  if (passives.filter(p => /активн\S* биом/.test(p.d)).length !== 1) err.push('Память: «+1 активный биом» должна давать ровно одна пассивка');
  for (const no of MEM.onlyFree) if (!passives.some(p => p.no === no)) err.push(`Память: «только бесплатно» — пассивки № ${no} нет`);
  if (!MEM.onlyFree.includes(MEM.slot)) err.push('Память: «+1 забег» должна выпадать только в бесплатных тройках (решение 28.09, §1 ×1,7)');
  RAR.forEach((_, i) => { if (!byR[i].some(p => !p.onlyFree)) err.push(`Память: в редкости «${RAR[i]}» нет ни одной пассивки для троек за Энериум`); });

  /* ================== Артефакты: 18 записей ================== */
  const AS = readSheet(FILES.art, 'Артефакты'), AH = AS[0];
  const acol = n => { const i = AH.indexOf(n); if (i < 0) err.push(`артефакты: нет столбца «${n}»`); return i; };
  const [aNo, aMode, aN, aD, aLv, aMax, aFrom, aGold, aSoul, aAll] = ['№', 'Режим', 'Артефакт', 'Эффект за уровень', 'Уровней', 'Итог на максимуме', 'Открыт с цикла', 'Покупка, золото', 'Цена 1-го уровня, души', 'Все уровни, души'].map(acol);
  const artifacts = [], seenArt = new Set(), staleAll = [];
  {
    const R = readSheet(FILES.art, 'Правила').map(r => String(r[0] || '')).join('\n');
    if (!/цена уровня = база × номер уровня/.test(R)) err.push('артефакты, «Правила»: нет правила «цена уровня = база × номер уровня» — сверить формулу');
    if (!/ровно на ОДИН уровень/.test(R)) err.push('артефакты, «Правила»: нет правила «за один цикл — один уровень» — сверить потолок');
  }
  for (const row of AS.slice(1)) {
    if (!String(row[aNo] || '').trim()) continue;
    const no = num(row[aNo], 'артефакт №'), what = `артефакт № ${no} «${row[aN]}»`, X = ART[no];
    seenArt.add(no);
    if (!X) { err.push(`${what}: нет в блоке ART — описать вид и правки`); continue; }
    const src = { d: String(row[aD]).trim(), lv: num(row[aLv], what + ', уровней'), from: num(row[aFrom], what + ', цикл') };
    for (const k of ['d', 'lv', 'from']) if (X.src[k] !== src[k]) err.push(`${what}: в блоке ART «${k}» = «${X.src[k]}», в таблице — «${src[k]}». Таблицу обновили — сверить`);
    const lv = X.lv || src.lv, gold = num(row[aGold], what + ', золото'), soul = num(row[aSoul], what + ', души');
    if (lv < 1 || lv > ART_RULES.cycles + 1 - src.from) err.push(`${what}: уровней ${lv}, а с цикла ${src.from} их не больше ${ART_RULES.cycles + 1 - src.from} — по уровню за цикл`);
    if (!isInt(X.step) || X.step < 1) err.push(`${what}: прибавка за уровень — не целое`);
    if (X.base != null && !isInt(X.base)) err.push(`${what}: исходное значение — не целое`);
    const total = soul * lv * (lv + 1) / 2, tableAll = num(row[aAll], what + ', все уровни');
    if (tableAll !== total && !X.lv) staleAll.push(`${row[aN]}: ${tableAll} → ${total}`);
    const max = X.base != null ? `${X.base} → ${X.base + X.step * lv}${X.unit}` : `+${X.step * lv}${X.unit}`;
    const a = { id: 'a' + no, no, mode: X.mode, n: String(row[aN]).trim(), d: X.d, what: X.what, step: X.step, unit: X.unit, base: X.base, lv, from: src.from, gold, soul, total, max };
    if (X.note) a.note = X.note;
    if (X.fix) { a.fix = X.fix; fixes.push({ what: `Артефакт · № ${no} «${a.n}»`, was: `${src.d}; уровней ${src.lv}`, now: `${a.d}; уровней ${lv}; итог ${max}`, why: X.fix }); }
    if (spoilOf(a.n + ' ' + a.d).length) err.push(`${what}: спойлер — ${spoilOf(a.n + ' ' + a.d).join(', ')}`);
    artifacts.push(a);
  }
  for (const no of Object.keys(ART)) if (!seenArt.has(+no)) err.push(`артефакт № ${no} из блока ART: такой строки в таблице нет`);
  if (artifacts.length !== 18) err.push(`артефактов ${artifacts.length}, в таблице автора 18`);
  if (staleAll.length) fixes.push({ what: 'Артефакты · «Все уровни, души»', was: 'столбец таблицы', now: 'база × (1 + 2 + … + уровней)', why: `По правилу автора «цена уровня = база × номер уровня» столбец считан по прежнему числу уровней — ещё у ${staleAll.length} артефактов, кроме правленых выше: ` + staleAll.join('; ') });
  {
    const walk = artifacts.find(a => a.no === 1);
    if (!walk || walk.base + walk.step * walk.lv + 1 !== ART_RULES.activeMax) err.push('артефакт «Печать открытых троп»: с пассивкой Памяти забегов должно быть семь (ADR-0014)');
    fixes.push({ what: 'Артефакты · лист «Правила», п. 4', was: 'активных биомов максимум 4', now: 'до семи одновременных забегов: номер цикла и ещё один от Памяти', why: 'ADR-0014, строка «Печати открытых троп» (+5, «всего 7 с учётом пассивки Странника»)' });
  }

  /* ================== Достижения ================== */
  const A = buildAch({ err, warn, REC, LBX, artifacts, spoilOf });

  if (err.length) return { err, warn, log, tables: A.tables, ach: A };

  /* ================================ ВЫВОД ================================ */
  const { onlyFree: _onlyFree, ...memOut } = MEM;   // «только бесплатно» уходит в данные полем пассивки onlyFree — один источник
  const DATA = {
    src: { passives: path.basename(FILES.pas), artifacts: path.basename(FILES.art), sha: hashes },
    rar: RAR,
    mem: Object.assign({}, memOut, { weight: WEIGHT, pow: ['мелкая', 'заметная', 'сильная', 'очень сильная', 'меняет билд'] }),
    passives,
    art: { rules: ART_RULES, list: artifacts },
    fixes,
  };
  const J = x => JSON.stringify(x);
  const lines = [
    '/* Энериум · данные экрана «Странник»: Память Странника, артефакты, достижения (§2, §14.1, §29 GDD).',
    '   Собирает tools/content-gen/wanderer/build.js из таблиц автора source-data/, каталога достижений и прогона их темпа — руками не править.',
    '   Формат:',
    '   - rar — семь редкостей; mem — места Памяти (циклы), доли редкостей rarBp в б. п., цены перебросов и сброса, бесплатные перебросы (демонстрация),',
    '     slot — № пассивки, что даёт ещё один забег (ADR-0014); weight — базовые веса и множители силы из листа «Настройки»;',
    '   - passives — 146 пассивок: id, no — № таблицы, cat, r — редкость 1–7, n, d — эффект, pow — сила влияния 1–5, w — вес внутри редкости, fam — семейство;',
    '     onlyFree — выпадает только в бесплатных тройках (первая тройка места, бесплатный переброс): после платного переброса и сброса её вес 0;',
    '   - art.list — 18 артефактов: step за уровень, unit, base — без артефакта, lv — уровней, from — цикл открытия, gold — покупка, soul — база цены уровня в душах,',
    '     total — души на все уровни; art.rules — уровень аккаунта для открытия, потолок забегов;',
    '   - ach — виды пассивок (kinds, cap — потолок суммы вида), категории (cats, label — строка режима «Достижения» в lootboxes.js), темы (groups),',
    '     счётчики (metrics: n — что считает, u — единица, t — ступень, а не количество), темп (pace: start — первый день цикла I–VI, день 0 — обучение; horizon; rarDays — ступени редкости; hours — часов в день у обычного o и увлечённого e),',
    '     демо-аккаунт (demo: день и счётчики обычного на этот день), достижения (list: g — тема, s — серия, k из ks — ступень, goal, m — счётчик,',
    '     pk и v — пассивка, r — редкость по трудности, at — день получения у обычного o и увлечённого e, null — за горизонтом прогона;',
    '     у таинственных hint — подсказка, from — с какого цикла возможно, est — день — оценка находки), первенства сервера (firsts, по циклу c, title — титул);',
    '   - fixes — что правлено в таблицах автора под систему и почему (ADR-0003). */',
    'window.EN_WANDERER = {',
    `  src: ${J(DATA.src)},`,
    `  rar: ${J(DATA.rar)},`,
    `  mem: ${J(DATA.mem)},`,
    '  passives: [',
    ...passives.map(p => `    ${J(p)},`),
    '  ],',
    `  art: { rules: ${J(ART_RULES)}, list: [`,
    ...artifacts.map(a => `    ${J(a)},`),
    '  ] },',
    `  ach: { kinds: ${J(A.kinds)},`,
    `    cats: ${J(A.cats)},`,
    `    groups: ${J(A.groups)},`,
    `    metrics: ${J(A.metrics)},`,
    `    pace: ${J(A.pace)},`,
    `    demo: ${J(A.demo)},`,
    '    list: [',
    ...A.list.map(a => `      ${J(a)},`),
    '    ],',
    '    firsts: [',
    ...A.firsts.map(f => `      ${J(f)},`),
    '    ] },',
    '  fixes: [',
    ...fixes.map(f => `    ${J(f)},`),
    '  ],',
    '};',
    '',
  ];
  const js = lines.join('\n');

  /* черновик: таблицы между метками */
  let doc = null;
  if (fs.existsSync(FILES.doc)) {
    doc = withTables(fs.readFileSync(FILES.doc, 'utf8'), A.tables);
    if (doc == null) err.push(`${path.relative(ROOT, FILES.doc)}: нет меток таблиц — ${Object.keys(A.tables).join(', ')}`);
  } else warn.push(`${path.relative(ROOT, FILES.doc)}: черновика нет — таблицы не вставлены`);

  /* сводка */
  const sum = (l, f) => l.reduce((a, x) => a + f(x), 0);
  log.push(`Память: пассивок ${passives.length} — ${byR.map((l, i) => `${RAR[i].toLowerCase()} ${l.length} (вес ${sum(l, p => p.w)})`).join(', ')}.`);
  log.push(`  Шанс «${slot.n}» (+1 забег) в одном варианте бесплатной тройки — ${(MEM.rarBp[slot.r - 1] * slot.w / sum(byR[slot.r - 1], p => p.w) / 100).toFixed(3)} %; в тройке за Энериум — 0. Только в бесплатных: ${passives.filter(p => p.onlyFree).map(p => p.n).join(', ')}.`);
  log.push(`Артефакты: ${artifacts.length}, покупка — ${sum(artifacts, a => a.gold).toLocaleString('ru-RU')} золота, все уровни — ${sum(artifacts, a => a.total).toLocaleString('ru-RU')} душ.`);
  log.push(...A.log);
  log.push(`Правок под систему: ${fixes.length}.`);
  return { js, doc, tables: A.tables, err, warn, log, ach: A };
}

/* ================================ ДОСТИЖЕНИЯ ================================
   Каталог achievements.js → список с днями получения, редкостью, проверками и таблицами черновика */
function buildAch({ err, warn, REC, LBX, artifacts, spoilOf }) {
  const kinds = ACH.KINDS, cats = ACH.CATS, groups = ACH.GROUPS, metrics = ACH.METRICS, P = ACH.PACE, log = [];
  const empty = { kinds, cats, groups, metrics: {}, pace: {}, demo: {}, list: [], firsts: [], tables: {}, log };
  const feats = LBX && LBX.modes && LBX.modes.feats;
  if (!feats) { err.push('lootboxes.js: нет режима «Достижения» (modes.feats) — сундуков за достижения нет'); return empty; }
  const featRows = feats.layers.flatMap(l => l.rows);
  for (const c of cats) {
    const row = featRows.find(r => r.label === c.label);
    if (!row) { err.push(`достижения «${c.n}»: в lootboxes.js нет строки «${c.label}»`); continue; }
    for (let cy = 1; cy <= 6; cy++) if (!row.cyc[cy] || !row.cyc[cy].length) err.push(`достижения «${c.n}»: нет сундука для цикла ${cy}`);
  }
  for (const [k, K] of Object.entries(kinds)) if (!isInt(K.cap) || K.cap < 1) err.push(`вид пассивки ${k}: потолок не целое ≥ 1`);
  for (const [g, G] of Object.entries(groups)) if (!G.n || !(G.ic || G.icon)) err.push(`тема ${g}: нет имени или значка`);

  /* ---------- прогон темпа ---------- */
  const CAP = JSON.parse(fs.readFileSync(FILES.cap, 'utf8')), PJ = JSON.parse(fs.readFileSync(FILES.paceBiomes, 'utf8'));
  if (!fs.existsSync(FILES.inputs)) { err.push('нет pace-inputs.json — python tools/content-gen/wanderer/pace_inputs.py'); return empty; }
  const IN = JSON.parse(fs.readFileSync(FILES.inputs, 'utf8')), CT = loadWin(FILES.contracts).EN_CONTRACTS, CSIM = require('../contracts/build.js').SIM;
  if (!CT || !CT.caps || !CT.econ) { err.push('contracts.js: нет ёмкости занятий caps и прогона econ — собрать контракты'); return empty; }
  const AR = loadWin(FILES.arena).EN_ARENA;
  if (!AR || !AR.model || !AR.model.prof || !AR.model.league || !AR.league) { err.push('arena.js: нет прогона Арены и Лиги — собрать Арену'); return empty; }
  const RT = loadWin(FILES.rituals).EN_RITUALS, EV = loadWin(FILES.event).EN_EVENT;
  if (!RT || !RT.sim || !RT.rules || !RT.rules.open) { err.push('rituals.js: нет прогона ритуалов sim и цикла открытия — собрать ритуалы'); return empty; }
  if (!EV || !EV.econ || !EV.planks || !isInt(EV.from)) { err.push('event.js: нет очков недели econ и порогов планок — собрать Событие'); return empty; }
  const ER = loadWin(FILES.echoRules).EN_ECHO_RULES, RO = loadWin(FILES.roster).EN_ROSTER;
  const goldHeroes = AP.goldHeroesOf(RO);   // тот же вход счётчика heroes, что у калькуляторов контрактов и События (leagueOpen)
  const ub =[...new Set(REC.drops.enemies.map(e => e.boss && e.boss.uniqueBp))];
  if (ub.length !== 1 || !isInt(ub[0])) err.push('recipes.js: шанс уникального ресурса босса разный по биомам — прогон берёт один');
  if (!isInt(ER.manySummonBp)) err.push('echo-rules.js: нет шанса Многоликого manySummonBp');
  const heroRecipes = REC.recipes.filter(r => r.kind === 'hero').length;
  const PR = AP.run(ACH, { cap: CAP, lb: LBX, paceBiomes: PJ, inputs: IN, ct: CT, ctSim: CSIM, arena: AR, rituals: RT, event: EV, uniqueBp: ub[0], manyBp: ER.manySummonBp, heroRecipes, allRecipes: REC.recipes.length, goldHeroes,
    art: artifacts.map(a => ({ id: a.id, from: a.from, lv: a.lv })) });
  for (const e of PR.err || []) err.push('прогон темпа: ' + e);
  if (!PR.val) return empty;
  const at3 = (m, goal) => ({ o: AP.dayOf(PR, 'o', m, goal), e: AP.dayOf(PR, 'e', m, goal), p: AP.dayOf(PR, 'p', m, goal) });

  /* ---------- каталог ---------- */
  const list = [], payerDay = {}, seen = new Set(), seenS = new Set(), used = new Set();
  const addSeries = (cat, S) => {
    const where = `серия ${S.s}`;
    if (seenS.has(S.s)) err.push(`${where}: ключ повторяется`); seenS.add(S.s);
    if (!groups[S.g]) err.push(`${where}: неизвестная тема «${S.g}»`);
    if (!metrics[S.m]) { err.push(`${where}: неизвестный счётчик «${S.m}»`); return; }
    used.add(S.m);
    let last = 0;
    S.steps.forEach(([id, n, goal, pk, v, d], k) => {
      const what = `достижение ${id} «${n}»`;
      if (seen.has(id)) err.push(`${what}: id повторяется`); seen.add(id);
      if (!isInt(goal) || goal < 1) err.push(`${what}: цель не целое ≥ 1`);
      if (goal <= last) err.push(`${what}: цель ступени не больше прошлой`); last = goal;
      if (!kinds[pk]) err.push(`${what}: неизвестный вид пассивки «${pk}»`);
      if (!isInt(v) || v < 1) err.push(`${what}: величина пассивки не целое ≥ 1`);
      if (!d) err.push(`${what}: нет условия`);
      if (spoilOf([n, d].join(' ')).length) err.push(`${what}: спойлер — ${spoilOf([n, d].join(' ')).join(', ')}`);
      const t = at3(S.m, goal);
      payerDay[id] = t.p;
      list.push({ id, cat, g: S.g, s: S.s, k: k + 1, ks: S.steps.length, n, d, goal, m: S.m, pk, v, r: AP.rarityOf(P, t.o), at: { o: t.o, e: t.e } });
    });
  };
  for (const S of ACH.PERS) addSeries('pers', S);
  for (const S of ACH.REV) addSeries('rev', S);
  /* таинственные: находка — цель 1, день — оценка; подсказка без имени, чисел и почти без слов условия */
  const stems = t => new Set(String(t).toLowerCase().split(/[^а-яё]+/).filter(w => w.length >= 5).map(w => w.slice(0, 5)));
  for (const [id, hint, n, d, g, m, pk, v, r, from, o, e] of ACH.MYST) {
    const what = `таинственное ${id} «${n}»`;
    if (seen.has(id)) err.push(`${what}: id повторяется`); seen.add(id);
    if (!groups[g]) err.push(`${what}: неизвестная тема «${g}»`);
    if (!kinds[pk]) err.push(`${what}: неизвестный вид пассивки «${pk}»`);
    if (!isInt(v) || v < 1) err.push(`${what}: величина пассивки не целое ≥ 1`);
    if (!isInt(r) || r < 1 || r > 7) err.push(`${what}: редкость не 1–7`);
    if (!isInt(from) || from < 1 || from > 6) err.push(`${what}: цикл не 1–6`);
    for (const x of [o, e]) if (x != null && (!isInt(x) || x < 0 || x > P.horizon)) err.push(`${what}: оценка дня вне прогона`);
    for (const x of [o, e]) if (x != null && x < PR.start[from]) err.push(`${what}: оценка дня ${x} раньше, чем открывается цикл ${ROMAN[from]}`);
    if (!hint) err.push(`${what}: нет подсказки`);
    else {
      if (hint.toLowerCase().includes(n.toLowerCase())) err.push(`${what}: подсказка выдаёт имя`);
      if (/\d/.test(hint)) err.push(`${what}: в подсказке число — она выдаёт условие`);
      const shared = [...stems(hint)].filter(s => stems(d).has(s));
      if (shared.length > CHECK.hintShared) err.push(`${what}: подсказка повторяет условие — ${shared.join(', ')}`);
    }
    if (spoilOf([n, d, hint].join(' ')).length) err.push(`${what}: спойлер — ${spoilOf([n, d, hint].join(' ')).join(', ')}`);
    list.push({ id, cat: 'myst', g, s: id, k: 1, ks: 1, n, d, goal: 1, m, pk, v, r, at: { o, e }, hint, from, est: 1 });
  }
  for (const m of Object.keys(metrics)) if (!used.has(m)) warn.push(`счётчик ${m}: ни одно достижение его не берёт`);
  for (const [c, [lo, hi]] of Object.entries(CHECK.count)) { const k = list.filter(a => a.cat === c).length; if (k < lo || k > hi) err.push(`достижений «${c}» — ${k}, по §29 около ${(lo + hi) / 2}`); }
  const kindSum = {};
  for (const a of list) kindSum[a.pk] = (kindSum[a.pk] || 0) + a.v;
  for (const [k, s] of Object.entries(kindSum)) if (s > kinds[k].cap) err.push(`пассивки достижений «${kinds[k].n}»: сумма ${s} больше потолка ${kinds[k].cap}`);

  /* ---------- бесплатные замены контрактов: их читает design/ui/contracts.js — должны совпадать, иначе контракты устарели ---------- */
  {
    const have = CT.rules && CT.rules.rer && CT.rules.rer.ach;
    const want = list.filter(a => a.pk === 'reroll').map(a => ({ id: a.id, n: a.n, v: a.v }));
    if (!have) err.push('contracts.js: нет rules.rer.ach — списка достижений с бесплатными заменами');
    else if (JSON.stringify(have) !== JSON.stringify(want)) err.push(`contracts.js читает достижения с бесплатными заменами: там ${JSON.stringify(have)}, в каталоге ${JSON.stringify(want)} — пересобрать контракты (node tools/content-gen/contracts/build.js)`);
  }

  /* ---------- правило ×1,7: плательщик при времени обычного получает достижение не раньше 1 / 1,7 его времени ---------- */
  const x17 = [];
  for (const a of list) {
    if (a.est || a.at.o == null) continue;
    const p = payerDay[a.id], M = metrics[a.m];
    if (p == null) { err.push(`${a.id}: у плательщика не получено, у обычного — день ${a.at.o}`); continue; }
    if ((a.at.o + 1) * 100 > P.x17 * (p + 1)) err.push(`${a.id} «${a.n}»: плательщик быстрее обычного больше ×1,7 — день ${p} против ${a.at.o}`);
    if (M.en || p !== a.at.o) x17.push({ a, p });
  }
  for (const [m, M] of Object.entries(metrics)) if (M.en != null && ![0, 1].includes(M.en)) err.push(`счётчик ${m}: en — 0 или 1; счётчик, который Энериум покупает, в каталог не берём`);

  /* ---------- кривая: каждый день цикла I и цикла II у обоих; дальше пауза у обычного — не длиннее gapMax ---------- */
  const H = P.horizon, model = list.filter(a => !a.est);
  const byDay = pr => { const out = Array.from({ length: H + 1 }, () => []); for (const a of model) if (a.at[pr] != null) out[a.at[pr]].push(a); return out; };
  const DAY = { o: byDay('o'), e: byDay('e') };
  for (const pr of ['o', 'e']) {
    const miss = []; for (let d = P.curve.daily[0]; d <= P.curve.daily[1]; d++) if (!DAY[pr][d].length) miss.push(d);
    if (miss.length) err.push(`кривая, ${pr === 'o' ? 'обычный' : 'увлечённый'}: дни без достижений в цикле I–II — ${miss.join(', ')}`);
  }
  const gaps = [];
  for (const [a, b, max] of P.curve.gaps) {
    const ds = []; for (let d = a - 1; d <= b; d++) if (DAY.o[d].length) ds.push(d);   // пауза считается и от последнего дня прошлого отрезка
    if (!ds.length) { err.push(`кривая, обычный: с ${a}-го по ${b}-й день нет ни одного достижения`); continue; }
    let worst = [ds[0], ds[0]]; for (let i = 1; i < ds.length; i++) if (ds[i] - ds[i - 1] > worst[1] - worst[0]) worst = [ds[i - 1], ds[i]];
    if (b - ds[ds.length - 1] > worst[1] - worst[0]) worst = [ds[ds.length - 1], b];
    gaps.push({ a, b, max, worst });
    if (worst[1] - worst[0] > max) err.push(`кривая, обычный: пауза ${worst[1] - worst[0]} дней — с ${worst[0]}-го по ${worst[1]}-й, на отрезке ${a}–${b} больше ${max}`);
  }

  /* ---------- первенства ---------- */
  const firsts = [];
  for (let c = 1; c <= 6; c++) for (const [k, [n, d, m, from, title]] of Object.entries(ACH.FIRSTS)) {
    if (c < from) continue;
    const f = { id: `first-${k}-${c}`, cat: 'first', kind: k, c, n: `${n} · цикл ${ROMAN[c]}`, d: d.replace('{c}', ROMAN[c]), m, title: `${title} · цикл ${ROMAN[c]}` };
    if (spoilOf(f.n + ' ' + f.d + ' ' + f.title).length) err.push(`первенство ${f.id}: спойлер`);
    firsts.push(f);
  }
  for (let c = 1; c <= 6; c++) if (firsts.filter(f => f.c === c).length !== CHECK.firstsPerCycle[c]) err.push(`первенств цикла ${ROMAN[c]}: ${firsts.filter(f => f.c === c).length}, ждём ${CHECK.firstsPerCycle[c]}`);

  /* ---------- данные экрана ---------- */
  const start = [0, ...[1, 2, 3, 4, 5, 6].map(c => PR.start[c])];
  const demoDay = P.demoDay, demo = { day: demoDay, n: {} };
  for (const m of Object.keys(metrics)) demo.n[m] = Math.floor(PR.val.o[m][demoDay] / 100);
  const metricsOut = Object.fromEntries(Object.entries(metrics).map(([m, M]) => [m, M.t ? { n: M.n, u: M.u, t: 1 } : { n: M.n, u: M.u }]));
  const kindsOut = Object.fromEntries(Object.entries(kinds).map(([k, K]) => [k, { n: K.n, t: K.t, cap: K.cap }]));

  /* ---------- таблицы черновика ---------- */
  const cyc = PR.cyc, tables = {};
  const dayTxt = d => (d == null ? 'за горизонтом' : d === 0 ? 'I · обучение' : `${ROMAN[cyc(d)]} · ${d - PR.start[cyc(d)] + 1}`);
  const pas = a => form(kinds[a.pk].t, a.v);
  const head = h => ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|'];
  const row = r => '| ' + r.join(' | ') + ' |';
  const esc = s => String(s).replace(/\|/g, '/');
  for (const cat of ['pers', 'rev']) {
    const T = head(['Тема', 'Достижение', 'Условие', 'Ступень', 'Пассивка', 'Редкость', 'Обычный', 'Увлечённый', 'Счётчик']);
    for (const a of list.filter(x => x.cat === cat)) T.push(row([groups[a.g].n, `**${a.n}**`, esc(a.d), a.ks > 1 ? `${a.k} из ${a.ks}` : '—', pas(a), RAR[a.r - 1].toLowerCase(), dayTxt(a.at.o), dayTxt(a.at.e), `\`${a.m}\` ≥ ${fmt(a.goal)}`]));
    tables[cat] = T.join('\n');
  }
  {
    const T = head(['Подсказка до получения', 'Достижение', 'Условие', 'Пассивка', 'Редкость', 'Возможно с', 'Обычно находят: обычный', 'увлечённый']);
    for (const a of list.filter(x => x.cat === 'myst')) T.push(row([`«${a.hint}»`, `**${a.n}**`, esc(a.d), pas(a), RAR[a.r - 1].toLowerCase(), `цикла ${ROMAN[a.from]}`, dayTxt(a.at.o), dayTxt(a.at.e)]));
    tables.myst = T.join('\n');
  }
  {
    const rows = featRows.find(r => r.label === cats.find(c => c.id === 'first').label);
    const T = head(['Цикл', 'Первенство', 'Условие', 'Титул', 'Сундук']);
    for (const f of firsts) { const g = rows.cyc[f.c][0]; T.push(row([ROMAN[f.c], f.n.replace(/ · цикл .+$/, ''), f.d, f.title.replace(/ · цикл .+$/, ''), `${RAR[g.r - 1].toLowerCase()}${g.win === 'pure' ? ' · чистое' : ''}`])); }
    tables.firsts = T.join('\n');
  }
  /* кривая по дням и неделям */
  {
    const names = l => l.map(a => a.n).join(', ') || '—';
    const T = head(['День', 'Цикл · день', 'Обычный', 'Что', 'Увлечённый', 'Что']);
    for (let d = 0; d <= CHECK.curveDaysShow; d++) T.push(row([d, dayTxt(d), DAY.o[d].length, names(DAY.o[d]), DAY.e[d].length, names(DAY.e[d])]));
    for (let a = CHECK.curveDaysShow + 1; a <= H; a += 7) {
      const b = Math.min(H, a + 6), go = [], ge = [];
      for (let d = a; d <= b; d++) { go.push(...DAY.o[d]); ge.push(...DAY.e[d]); }
      T.push(row([`${a}–${b}`, `${dayTxt(a)} — ${dayTxt(b)}`, go.length, names(go), ge.length, names(ge)]));
    }
    const beyond = pr => model.filter(a => a.at[pr] == null);
    T.push(row(['дальше', 'за горизонтом', beyond('o').length, names(beyond('o')), beyond('e').length, names(beyond('e'))]));
    tables.curve = T.join('\n');
  }
  /* по циклам: сколько получено и редкость */
  {
    const inC = (pr, c, l) => l.filter(a => a.at[pr] != null && cyc(a.at[pr]) === c).length;
    const myst = list.filter(a => a.est), T = head(['Цикл', 'Дней в прогоне', 'Обычный: за цикл', 'всего', 'Увлечённый: за цикл', 'всего', 'Таинственные (оценка): обычный / увлечённый']);
    let so = 0, se = 0;
    for (let c = 1; c <= 6; c++) {
      const days = c === 6 ? H - PR.start[6] + 1 : c === 1 ? 1 : PR.len[c];
      const o = inC('o', c, model), e = inC('e', c, model); so += o; se += e;
      T.push(row([ROMAN[c], c === 1 ? '~4 ч' : days, o, so, e, se, `${inC('o', c, myst)} / ${inC('e', c, myst)}`]));
    }
    T.push(row(['за горизонтом', '—', model.length - so, model.length, model.length - se, model.length, `${myst.filter(a => a.at.o == null).length} / ${myst.filter(a => a.at.e == null).length}`]));
    tables.cycles = T.join('\n');
    const R = head(['Редкость', 'Персональные', 'Возрождённые', 'Таинственные', 'Как её получают']);
    /* ступени редкости — PACE.rarDays: день обычного не позже ступени */
    const how = r => (r === 1 ? 'в обучении — цикл I' : r === 7 ? 'позже горизонта прогона или только у увлечённого' : `не позже ${P.rarDays[r - 1]}-го дня: ${dayTxt(P.rarDays[r - 1])}`);
    for (let r = 1; r <= 7; r++) R.push(row([RAR[r - 1], ...['pers', 'rev', 'myst'].map(c => list.filter(a => a.cat === c && a.r === r).length), how(r)]));
    tables.rarity = R.join('\n');
  }
  /* пассивки: потолок, каталог, к концу циклов */
  {
    const ends = [2, 3, 4, 5, 6].map(c => (c < 6 ? PR.start[c + 1] - 1 : H));
    const T = head(['Вид', 'Потолок', 'Каталог', 'Обычный к концу II / III / IV / V / VI (до горизонта)', 'Увлечённый', 'Для сравнения']);
    const cmp = { gold: 'артефакт «Кошель ловца» — +30 % на последнем уровне', spirit: 'артефакт «Чаша духа» — +60 %', key: 'артефакты-отмычки: 10 % → 25 % с босса', uniq: 'артефакт: 5 % → 14 %',
      shop: 'артефакт: 1 → 5 в день', lots: 'артефакт: 5 → 11', reroll: 'основа 3 + артефакт 2', lvl: 'Память: «Дух: цена уровней» до 10 %', ritual: 'Память: «Ритуалы: скорость» до 10 %' };
    for (const [k, K] of Object.entries(kinds)) {
      const by = pr => ends.map(d => list.filter(a => a.pk === k && a.at[pr] != null && a.at[pr] <= d).reduce((s, a) => s + a.v, 0)).join(' / ');
      T.push(row([K.n, K.cap, kindSum[k] || 0, by('o'), by('e'), cmp[k] || '—']));
    }
    tables.passives = T.join('\n');
  }
  /* сундуки: ожидаемое содержимое за достижения цикла против дохода цикла */
  {
    const ev = LBX.ev.wander, T = head(['Цикл', 'Профиль', 'Достижений', 'Сундуки по редкости', 'Золото', 'Дух', 'Прах', 'Ресурсы по цене рынка', 'Доля золота цикла', 'Доля духа цикла']);
    const tot = { o: {}, e: {} };
    for (let c = 1; c <= 6; c++) for (const pr of ['o', 'e']) {
      const got = list.filter(a => a.at[pr] != null && cyc(a.at[pr]) === c), s = { gold: 0, spirit: 0, dust: 0, resGold: 0 }, box = {};
      for (const a of got) {
        const fr = featRows.find(r => r.label === cats.find(x => x.id === a.cat).label);
        for (const g of fr.cyc[c]) { const E = ev[c][g.win][g.r - 1]; for (const k of Object.keys(s)) s[k] += (E[k] || 0) * g.count; box[g.r] = (box[g.r] || 0) + g.count; }
      }
      const days = c === 1 ? 0 : c === 6 ? H - PR.start[6] + 1 : PR.len[c];
      const incI = { gold: IN.cycleI.gold + IN.cycleI.accountGold, spirit: IN.cycleI.spirit + IN.cycleI.tutorialSpirit };   // биом 2 и награды обучения
      const inc = k => (c === 1 ? incI[k] * 100 : CAP.cycles[c][pr][k] * days);
      for (const k of Object.keys(s)) tot[pr][k] = (tot[pr][k] || 0) + s[k];
      const share = k => `${x100(s[k] * 10000 / inc(k))} %`;
      T.push(row([ROMAN[c], pr === 'o' ? 'обычный' : 'увлечённый', got.length, Object.entries(box).map(([r, n]) => `${RAR[r - 1].toLowerCase()} ${n}`).join(', ') || '—',
        fmt(Math.round(s.gold / 100)), fmt(Math.round(s.spirit / 100)), fmt(Math.round(s.dust / 100)), fmt(Math.round(s.resGold / 100)), share('gold'), share('spirit')]));
    }
    tables.chests = T.join('\n');
  }
  /* правило ×1,7 */
  {
    const T = head(['Достижение', 'Счётчик', 'Обычный', 'Плательщик при времени обычного', 'Во сколько раз раньше', 'Чем ускоряет Энериум']);
    const why = { heroes: 'донатный сет: пять героев цикла', arena: 'обновления списка соперников — прогон Арены', shop: 'обновления лавки',
      league: `донатные герои: порог Лиги в ${AR.league.heroes} героев — раньше`, plank: 'очки недели плательщика — прогон События' };
    const times = (o, p) => { const t = Math.round((o + 1) * 100 / (p + 1)); return `×${Math.floor(t / 100)},${String(t % 100).padStart(2, '0')}`; };
    for (const { a, p } of x17) T.push(row([a.n, `\`${a.m}\``, dayTxt(a.at.o), dayTxt(p), times(a.at.o, p), why[a.m] || '—']));
    tables.x17 = T.join('\n');
  }
  /* модель счётчиков: значение к концу цикла, обычный / увлечённый */
  {
    const T = head(['Счётчик', 'Что считает', 'К концу цикла I', 'II', 'III', 'IV', 'V', 'VI — до горизонта', 'Энериум ускоряет']);
    const end = c => (c === 1 ? 0 : c === 6 ? H : PR.start[c + 1] - 1);
    for (const m of Object.keys(metrics)) {
      if (!used.has(m)) continue;
      const cell = c => [PR.val.o[m][end(c)], PR.val.e[m][end(c)]].map(v => fmt(Math.floor(v / 100))).join(' / ');
      T.push(row([`\`${m}\``, metrics[m].n, ...[1, 2, 3, 4, 5, 6].map(cell), metrics[m].en ? 'отчасти' : 'нет']));
    }
    tables.model = T.join('\n');
  }

  /* ---------- сводка ---------- */
  const cnt = c => list.filter(a => a.cat === c).length;
  const sumV = list.reduce((s, a) => s + a.v, 0);
  log.push(`Достижения: персональных ${cnt('pers')}, возрождённых ${cnt('rev')}, таинственных ${cnt('myst')}; первенств ${firsts.length}.`);
  log.push('  Пассивки, сумма по видам: ' + Object.entries(kindSum).map(([k, s]) => `${kinds[k].n} ${s}/${kinds[k].cap}`).join(', ') + '.');
  const inCycle = (pr, c) => model.filter(a => a.at[pr] != null && cyc(a.at[pr]) === c).length;
  log.push(`  Кривая: обычный — ${[1, 2, 3, 4, 5, 6].map(c => `${ROMAN[c]}: ${inCycle('o', c)}`).join(', ')}, за горизонтом ${model.filter(a => a.at.o == null).length}; увлечённый — ${[1, 2, 3, 4, 5, 6].map(c => `${ROMAN[c]}: ${inCycle('e', c)}`).join(', ')}, за горизонтом ${model.filter(a => a.at.e == null).length}.`);
  log.push(`  Величин пассивок всего ${sumV}; ×1,7 — худший случай ${x17.length ? x17.map(({ a, p }) => (a.at.o + 1) / (p + 1)).reduce((m, x) => Math.max(m, x), 1).toFixed(2) : '1,00'}.`);

  return { kinds: kindsOut, cats, groups, metrics: metricsOut, pace: { start, horizon: H, rarDays: P.rarDays, hours: CAP.hours }, demo, list, firsts, tables, log, PR, DAY, x17 };
}

/* таблицы черновика между метками; нет меток — null */
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/wanderer/build.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) return null;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { build, withTables, markA, markB, FILES, CHECK };

if (require.main === module) {
  const R = build();
  if (R.warn.length) console.log('Предупреждения:\n  ' + R.warn.join('\n  '));
  if (process.argv.includes('--print')) {   // таблицы — и при ошибках: для настройки каталога
    if (R.err.length) console.log('ОШИБКИ:\n  ' + R.err.join('\n  '));
    for (const [k, t] of Object.entries(R.tables || {})) console.log(`\n### ${k}\n\n${t}`);
    process.exit(R.err.length ? 1 : 0);
  }
  if (R.err.length) { console.log('ОШИБКИ — файлы не записаны:\n  ' + R.err.join('\n  ')); process.exit(1); }
  if (process.argv.includes('--check')) {
    const okJs = fs.existsSync(FILES.out) && fs.readFileSync(FILES.out, 'utf8') === R.js;
    const okDoc = R.doc == null || fs.readFileSync(FILES.doc, 'utf8') === R.doc;
    console.log(okJs && okDoc ? 'Свежие: wanderer.js и таблицы черновика совпадают со сборкой.' : `Устарели: ${[!okJs && 'design/ui/wanderer.js', !okDoc && 'docs/content/достижения.md'].filter(Boolean).join(', ')} — пересобрать.`);
    process.exit(okJs && okDoc ? 0 : 1);
  }
  fs.writeFileSync(FILES.out, R.js);
  if (R.doc != null) fs.writeFileSync(FILES.doc, R.doc);
  for (const l of R.log) console.log(l);
  console.log(`Записано: ${path.relative(ROOT, FILES.out)}${R.doc != null ? ', таблицы ' + path.relative(ROOT, FILES.doc) : ''}.`);
}
