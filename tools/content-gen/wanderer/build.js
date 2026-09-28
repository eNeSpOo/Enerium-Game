/* Данные экрана «Странник» прототипа: Память Странника, артефакты, достижения → design/ui/wanderer.js (window.EN_WANDERER).
   Читает таблицы автора (ADR-0003 — исходные постулаты, оригиналы не меняются):
   - source-data/Enerium_Странник_пассивки_Финал.xlsx — лист «Пассивки Странника» (146 записей, §2.8), листы «Настройки» и «Сводка» — для сверки весов;
   - source-data/Enerium_Артефакты_Финал.xlsx — лист «Артефакты» (18 записей, §14.1), лист «Правила» — правило цены уровня.
   Достижения — черновик achievements.js рядом: таблицы автора с достижениями нет (§29).
   Только читает: design/ui/lootboxes.js — строки режима «Достижения» (сундук за достижение), design/ui/recipes.js — имена цикла «для команды»,
   docs/lore/дайджест.md — раздел «Нельзя показывать раннему игроку», source-data/provenance.json — хеши таблиц.
   Что правим под систему — блоки PAS_FIX и ART ниже: у каждой правки «было», «стало» и почему. Сборщик сверяет «было» с таблицей:
   если автор поменял таблицу, правка не применится молча — сборка упадёт и покажет строку.
   Проверки — любая ошибка, и файл не пишется. Числа — только целые.
   Запуск: node tools/content-gen/wanderer/build.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const { readSheet } = require('../lootboxes/xlsx.js');
const ACH = require('./achievements.js');

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
  kindMax: 20,                    // сумма одного вида пассивок по всем достижениям — не больше, иначе достижения станут фармом
};

/* ================================ СБОРКА ================================ */

const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  pas: path.join(ROOT, 'source-data', 'Enerium_Странник_пассивки_Финал.xlsx'),
  art: path.join(ROOT, 'source-data', 'Enerium_Артефакты_Финал.xlsx'),
  prov: path.join(ROOT, 'source-data', 'provenance.json'),
  loot: path.join(ROOT, 'design', 'ui', 'lootboxes.js'),
  recipes: path.join(ROOT, 'design', 'ui', 'recipes.js'),
  digest: path.join(ROOT, 'docs', 'lore', 'дайджест.md'),
  out: path.join(ROOT, 'design', 'ui', 'wanderer.js'),
};
const err = [], warn = [];
const isInt = x => Number.isInteger(x);
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
const SPOILERS = ['иридиум', 'иридис', 'марионетк', 'эуклид', 'оболочк', 'шестой элемент', 'колыбел', 'перворожд', 'демон'];
const DIGEST = (() => {
  const t = fs.readFileSync(FILES.digest, 'utf8').replace(/\r\n/g, '\n'), i = t.indexOf('## Нельзя показывать раннему игроку');
  if (i < 0) { err.push('дайджест: нет раздела «Нельзя показывать раннему игроку»'); return ''; }
  const j = t.indexOf('\n## ', i + 3);
  return t.slice(i, j < 0 ? t.length : j).toLowerCase();
})();
const loadWin = f => { const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }); return ctx.window; };
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
const kinds = ACH.KINDS, cats = ACH.CATS, ach = [], seenAch = new Set();
const feats = LBX && LBX.modes && LBX.modes.feats;
if (!feats) err.push('lootboxes.js: нет режима «Достижения» (modes.feats) — сундуков за достижения нет');
const featRows = feats ? feats.layers.flatMap(l => l.rows) : [];
for (const c of cats) {
  const row = featRows.find(r => r.label === c.label);
  if (!row) { err.push(`достижения «${c.n}»: в lootboxes.js нет строки «${c.label}»`); continue; }
  for (let cy = 1; cy <= 6; cy++) if (!row.cyc[cy] || !row.cyc[cy].length) err.push(`достижения «${c.n}»: нет сундука для цикла ${cy}`);
}
const addAch = (cat, [id, n, d, goal, m, pk, v], hint) => {
  const what = `достижение ${id} «${n}»`;
  if (seenAch.has(id)) err.push(`${what}: id повторяется`); seenAch.add(id);
  if (!isInt(goal) || goal < 1) err.push(`${what}: цель не целое ≥ 1`);
  if (!kinds[pk]) err.push(`${what}: неизвестный вид пассивки «${pk}»`);
  if (!isInt(v) || v < 1) err.push(`${what}: величина пассивки не целое ≥ 1`);
  if (!m) err.push(`${what}: нет счётчика`);
  if (hint && hint.toLowerCase().includes(n.toLowerCase())) err.push(`${what}: подсказка таинственного выдаёт его имя`);
  const t = [n, d, hint || ''].join(' ');
  if (spoilOf(t).length) err.push(`${what}: спойлер — ${spoilOf(t).join(', ')}`);
  const a = { id, cat, n, d, goal, m, pk, v };
  if (hint) a.hint = hint;
  ach.push(a);
};
for (const r of ACH.PERS) addAch('pers', r);
for (const r of ACH.REV) addAch('rev', r);
for (const [id, hint, ...rest] of ACH.MYST) addAch('myst', [id, ...rest], hint);
for (const [c, [lo, hi]] of Object.entries(CHECK.count)) { const k = ach.filter(a => a.cat === c).length; if (k < lo || k > hi) err.push(`достижений «${c}» — ${k}, по §29 около ${(lo + hi) / 2}`); }
const kindSum = {};
for (const a of ach) kindSum[a.pk] = (kindSum[a.pk] || 0) + a.v;
for (const [k, s] of Object.entries(kindSum)) if (s > CHECK.kindMax) err.push(`пассивки достижений «${kinds[k].n}»: сумма ${s} больше ${CHECK.kindMax}`);
const firsts = [];
for (let c = 1; c <= 6; c++) for (const [k, [n, d, m, from]] of Object.entries(ACH.FIRSTS)) {
  if (c < from) continue;
  const f = { id: `first-${k}-${c}`, cat: 'first', kind: k, c, n: `${n} · цикл ${ROMAN[c]}`, d: d.replace('{c}', ROMAN[c]), m };
  if (spoilOf(f.n + ' ' + f.d).length) err.push(`первенство ${f.id}: спойлер`);
  firsts.push(f);
}

/* ================================ ВЫВОД ================================ */
if (warn.length) console.log('Предупреждения:\n  ' + warn.join('\n  '));
if (err.length) { console.log('ОШИБКИ — файл не записан:\n  ' + err.join('\n  ')); process.exit(1); }

const { onlyFree: _onlyFree, ...memOut } = MEM;   // «только бесплатно» уходит в данные полем пассивки onlyFree — один источник
const DATA = {
  src: { passives: path.basename(FILES.pas), artifacts: path.basename(FILES.art), sha: hashes },
  rar: RAR,
  mem: Object.assign({}, memOut, { weight: WEIGHT, pow: ['мелкая', 'заметная', 'сильная', 'очень сильная', 'меняет билд'] }),
  passives,
  art: { rules: ART_RULES, list: artifacts },
  ach: { kinds, cats, list: ach, firsts },
  fixes,
};
const J = x => JSON.stringify(x);
const lines = [
  '/* Энериум · данные экрана «Странник»: Память Странника, артефакты, достижения (§2, §14.1, §29 GDD).',
  '   Собирает tools/content-gen/wanderer/build.js из таблиц автора source-data/ и черновика достижений — руками не править.',
  '   Формат:',
  '   - rar — семь редкостей; mem — места Памяти (циклы), доли редкостей rarBp в б. п., цены перебросов и сброса, бесплатные перебросы (демонстрация),',
  '     slot — № пассивки, что даёт ещё один забег (ADR-0014); weight — базовые веса и множители силы из листа «Настройки»;',
  '   - passives — 146 пассивок: id, no — № таблицы, cat, r — редкость 1–7, n, d — эффект, pow — сила влияния 1–5, w — вес внутри редкости, fam — семейство;',
  '     onlyFree — выпадает только в бесплатных тройках (первая тройка места, бесплатный переброс): после платного переброса и сброса её вес 0;',
  '   - art.list — 18 артефактов: step за уровень, unit, base — без артефакта, lv — уровней, from — цикл открытия, gold — покупка, soul — база цены уровня в душах,',
  '     total — души на все уровни; art.rules — уровень аккаунта для открытия, потолок забегов;',
  '   - ach — виды пассивок (kinds), категории (cats, label — строка режима «Достижения» в lootboxes.js), достижения (list: goal, m — счётчик, pk и v — пассивка),',
  '     первенства сервера (firsts, по циклу c);',
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
  `  ach: { kinds: ${J(kinds)},`,
  `    cats: ${J(cats)},`,
  '    list: [',
  ...ach.map(a => `      ${J(a)},`),
  '    ],',
  '    firsts: [',
  ...firsts.map(f => `      ${J(f)},`),
  '    ] },',
  '  fixes: [',
  ...fixes.map(f => `    ${J(f)},`),
  '  ],',
  '};',
  '',
];
fs.writeFileSync(FILES.out, lines.join('\n'));

/* сводка */
const sum = (l, f) => l.reduce((a, x) => a + f(x), 0);
console.log(`Память: пассивок ${passives.length} — ${byR.map((l, i) => `${RAR[i].toLowerCase()} ${l.length} (вес ${sum(l, p => p.w)})`).join(', ')}.`);
console.log(`  Шанс «${slot.n}» (+1 забег) в одном варианте бесплатной тройки — ${(MEM.rarBp[slot.r - 1] * slot.w / sum(byR[slot.r - 1], p => p.w) / 100).toFixed(3)} %; в тройке за Энериум — 0. Только в бесплатных: ${passives.filter(p => p.onlyFree).map(p => p.n).join(', ')}.`);
console.log(`Артефакты: ${artifacts.length}, покупка — ${sum(artifacts, a => a.gold).toLocaleString('ru-RU')} золота, все уровни — ${sum(artifacts, a => a.total).toLocaleString('ru-RU')} душ.`);
console.log(`Достижения: ${cats.slice(0, 3).map(c => `${c.n.toLowerCase()} ${ach.filter(a => a.cat === c.id).length}`).join(', ')}; первенств ${firsts.length}.`);
console.log('  Пассивки достижений, сумма по видам: ' + Object.entries(kindSum).map(([k, s]) => `${kinds[k].n} ${s}`).join(', ') + '.');
console.log(`Правок под систему: ${fixes.length}. Записано: ${path.relative(ROOT, FILES.out)}.`);
