/* Данные экрана «Странник» прототипа: Память Странника, артефакты, достижения → design/ui/wanderer.js (window.EN_WANDERER)
   и таблицы черновика docs/content/достижения.md.
   Читает таблицы автора (ADR-0003 — исходные постулаты, оригиналы не меняются; с 01.10.2026 они в source-data/оригиналы-2026-09-26/,
   а под прежними именами в source-data/ лежат таблицы, собранные из данных игры, — ADR-0038):
   - source-data/оригиналы-2026-09-26/Enerium_Странник_пассивки_Финал.xlsx — лист «Пассивки Странника» (146 записей, §2.8), листы «Настройки» и «Сводка» — для сверки весов;
   - source-data/оригиналы-2026-09-26/Enerium_Артефакты_Финал.xlsx — лист «Артефакты» (18 записей, §14.1), лист «Правила» — правило цены уровня.
   Достижения — каталог achievements.js рядом: таблицы автора с достижениями нет (§29). Вехи начала пути и блоки «Серии цикла N» у циклов
   III–VI (ADR-0047, п. 6). Когда их получают — прогон achievements-pace.js до конца цикла VI по калькуляторам экономики:
   tools/content-gen/contracts/capacity.json, pace-inputs.json рядом (python pace_inputs.py — мост к sets.py и economy.py),
   design/ui/contracts.js (ёмкость занятий, исполнение контрактов), design/ui/arena.js (прогон Арены и Лиги), design/ui/rituals.js
   (прогон ритуалов), design/ui/event.js (очки События за неделю, пороги планок), tools/content-gen/biomes/pace.json; счётчики блоков —
   ещё design/ui/clan.js (эталонные недели клана) и tools/content-gen/cycle/climb-days.json (записи дня калькулятора подъёма).
   Ступени гибких серий блока подбирает прогон по закону кривой (slotBlock); законы каталога — achievements-pace.js, laws.
   Порядок пересборки: режимы (контракты, Арена, ритуалы, Событие, клан), лутбоксы, подъём → pace_inputs.py → этот сборщик.
   Только читает: design/ui/lootboxes.js — строки режима «Достижения» (сундук за достижение), недельные сундуки, ступень профиля
   в режимах и допущения; design/ui/recipes.js — имена цикла «для команды», доля рецептов героев, шанс уникального ресурса, модель стока
   крафта, рецепты по циклам; design/ui/echo-rules.js — шанс Многоликого; design/ui/roster.js — герои за золото и герои Эхо по циклам,
   комплект осколков героя Эхо; design/ui/contracts.js — какие достижения дают бесплатные замены; tools/content-gen/lore/ladder.js — слова
   лестницы спойлеров; docs/lore/дайджест.md — раздел «Нельзя показывать раннему игроку»; source-data/provenance.json — хеши таблиц.
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
const LAD = require('../lore/ladder.js');   // слова лестницы спойлеров — только читаем: в блоках достижений циклов III–V их нет совсем

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
     Бесплатный переброс сброс не возвращает, поэтому бесплатных троек у места за всю игру не больше двух. В данные — полем onlyFree.
     ADR-0031, п. 11: туда же «Вечный задаток» (№ 203), «Поток черепков» (№ 206) и «Рунный ливень» (№ 210) — они бьют прямо в темп:
     вход к рунному стражу дешевле, осколки доблести и руны сверх таблицы; за Энериум они ускоряли бы пределы и доблесть больше ×1,7 */
  onlyFree: [201, 203, 206, 210],
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
const SEAL_WHY = '«Печать» — слово тайны дайджеста («Нельзя показывать раннему игроку»): в циклах I–II не звучит, а Память открыта с цикла II';
const MENTOR_WHY = '«Наставники» — слово тайны дайджеста (наставники Странника — марионетки Этриона), в цикле II не звучит. Ряд «Скорое учение — … — Школа Странника»';
const FERRY_WHY = 'Паром и паромщик — миф нашего мира (тот же разбор, что у талисмана «Монета парома» → «Последний песок»). Души возвращаются, когда атака добивает';
const PAS_FIX = {
  9: { was: { cat: 'Кланы', d: 'Личные очки Кланового босса +1%' }, now: { cat: 'Очки', d: 'Личные очки Кланового босса +10%' },
    why: 'Эффект повторял «Верный удар» (обычная, +1 %) того же семейства «Очки: КБ», а стоит древней «меняет билд». Лестница семейства — 1 → 3 → 5 → 10 %, как у «Ритуалы: скорость» и «Дух: цена уровней»; категория — как у семейства' },
  31: { was: { d: 'Шанс рунного ключа с элит выше на 3% (относительно)' }, now: { d: 'Шанс рунного ключа с босса биома выше на 3% (относительно)' }, why: KEY_WHY },
  78: { was: { d: 'Шанс рунного ключа с элит выше на 5% (относительно)' }, now: { d: 'Шанс рунного ключа с босса биома выше на 5% (относительно)' }, why: KEY_WHY },
  129: { was: { d: 'Шанс рунного ключа с элит выше на 7% (относительно)' }, now: { d: 'Шанс рунного ключа с босса биома выше на 7% (относительно)' }, why: KEY_WHY },
  181: { was: { d: 'Шанс рунного ключа с элит выше на 10% (относительно)' }, now: { d: 'Шанс рунного ключа с босса биома выше на 10% (относительно)' }, why: KEY_WHY },
  /* имена по лестнице спойлеров (ADR-0038; список — docs/content/переименования-2026-10-01.md) */
  60: { was: { n: 'Дешёвая печать' }, now: { n: 'Скромный залог' }, why: SEAL_WHY + '. Пассивка удешевляет ставку заверения — залог' },
  61: { was: { n: 'Мелкая печать' }, now: { n: 'Мелкая расписка' }, why: SEAL_WHY + '. Золото с контракта — по расписке; лестница «мелкая — крепкая — золотая» сохраняется' },
  108: { was: { n: 'Крепкая печать' }, now: { n: 'Крепкая расписка' }, why: SEAL_WHY + '. Лестница «мелкая — крепкая — золотая» расписка' },
  143: { was: { n: 'Золотая печать' }, now: { n: 'Золотая расписка' }, why: SEAL_WHY + '. Лестница «мелкая — крепкая — золотая» расписка' },
  109: { was: { n: 'Купеческая печать' }, now: { n: 'Купеческий залог' }, why: SEAL_WHY + '. Ставка заверения — залог' },
  157: { was: { n: 'Печать доверия' }, now: { n: 'Залог доверия' }, why: SEAL_WHY + '. Ставка заверения — залог' },
  139: { was: { n: 'Печать торгового дома' }, now: { n: 'Грамота торгового дома' }, why: SEAL_WHY + '. Комиссия рынка ниже — по грамоте дома' },
  188: { was: { n: 'Вторая печать' }, now: { n: 'Второй подряд' }, why: SEAL_WHY + '. +1 задание в пуле контрактов — второй подряд (слово Стоун-Хейма)' },
  75: { was: { n: 'Наставник душ' }, now: { n: 'Добрая наука' }, why: MENTOR_WHY },
  155: { was: { n: 'Дар наставника' }, now: { n: 'Мудрость старших' }, why: MENTOR_WHY },
  153: { was: { n: 'Паром без очереди' }, now: { n: 'Расчёт на месте' }, why: FERRY_WHY },
  194: { was: { n: 'Договор с паромщиком' }, now: { n: 'Полный расчёт' }, why: FERRY_WHY },
};

/* Артефакты (§14.1). Правила автора: артефакт покупают за золото один раз, уровни качают за души — цена уровня = база × номер уровня
   (лист «Правила», п. 2); за цикл — один уровень: в цикле, где артефакт открылся, доступен I, в следующем — II (п. 1, §14.1 «потолок — текущий цикл»).
   Столбец «Все уровни, души» таблицы у девяти артефактов считан по прежнему числу уровней — сумма пересчитывается по правилу.
   Здесь — вид данных и правки: mode — режим; d — эффект за уровень; what — что растёт; step — прибавка за уровень (целое);
   unit — единица; base — исходное значение без артефакта (есть — показываем «было → стало»); lv — уровней, если правим.
   own — что даёт сама покупка, до уровней (у остальных артефактов покупка ничего не даёт: эффект — с уровня I); open — с какого уровня
   Странника артефакт продаётся, если раньше общего (ART_RULES.openLevel); buyFrom — с какого цикла его можно купить, если раньше цикла
   уровней (src.from): уровни по-прежнему идут с цикла таблицы, по одному за цикл.
   loot — примитив добычи биома (ADR-0044): ядро считает его в добыче этажа (battle.js, RULES.drop.art, lootArt) — прибавка step за уровень.
   src — как в таблице (сверяется): эффект, уровней, с цикла. name — правка имени: was — как в таблице (сверяется), now, why.
   № 1 — артефакт активных биомов (слова автора 06.10.2026, ADR-0054, п. 3 и п. 15): «Артефакт отвечающий за активные биомы обязан быть
   в обучении чтобы игрок его сам купил…»; «Я хочу чтобы игрок буквально покупал артефакт и ему открывался - 1 биом который он может
   фармить»; «Я имею ввиду 1 и единственный биом на обучение не 2». Без него активного биома нет (base 0); покупка — в обучении, с 1-го
   уровня Странника, — открывает один (own 1); уровни I–V таблицы автора — с цикла II, по одному за цикл: +1 активный биом каждый.
   Цены — таблицы автора: покупка 30 000 золота (в обучении её оплачивает награда уровня 1, start/data.js), уровень — 600 душ × номер */
const ART = {
  1: { mode: 'Биомы', d: '+1 активный биом', what: 'Активных биомов', step: 1, unit: '', base: 0, own: 1, open: 1, buyFrom: 1, src: { d: '+1 активный биом', lv: 5, from: 2 },
    note: 'Без «Знака» активного биома нет: покупка открывает первый, каждый уровень — ещё один. Седьмой — пассивка Памяти «Право владыки» (ADR-0014)',
    fix: 'Слот забега даёт только этот артефакт (ADR-0054): покупка — в обучении, она открывает один активный биом, единственный в обучении; уровни I–V — с цикла II, по одному за цикл. Прежде первый слот был у всех с начала («1 → 6»), остальные приходили с номером цикла (ADR-0031, п. 3)',
    name: { was: 'Печать открытых троп', now: 'Знак открытых троп', why: '«Печать» — слово тайны дайджеста: в циклах I–II не звучит, а артефакт открыт с цикла II (ADR-0038)' } },
  2: { mode: 'Биомы', d: '+1 к верхней границе базовых ресурсов на этаже без элит', what: 'Верхняя граница базовых на этаже без элит', step: 1, unit: '', base: null, loot: 'baseMaxO',
    src: { d: '+1 к верхней границе ресурсов с обычных врагов', lv: 6, from: 1 },
    fix: 'Базовые ресурсы падают за этаж, а не с врага: за срабатывание — от одного до номера биома (ADR-0010, ADR-0023). «С обычных врагов» → «на этаже без элит»' },
  3: { mode: 'Биомы', d: '+1 к верхней границе базовых ресурсов на этаже с элитой', what: 'Верхняя граница базовых на этаже с элитой', step: 1, unit: '', base: null, loot: 'baseMaxE',
    src: { d: '+1 к верхней границе ресурсов с элит', lv: 6, from: 1 },
    fix: 'С элиты падают душа и ключ ремесла, базовые — за этаж (ADR-0010, ADR-0023). «С элит» → «на этаже с элитой»' },
  4: { mode: 'Биомы', d: '+5 % золота за убийство', what: 'Золото за убийство', step: 5, unit: ' %', base: null, loot: 'goldPct', src: { d: '+5% золота за убийство', lv: 6, from: 1 } },
  5: { mode: 'Биомы', d: '+10 % духа за убийство', what: 'Дух за убийство', step: 10, unit: ' %', base: null, loot: 'spiritPct', src: { d: '+10% духа за убийство', lv: 6, from: 1 } },
  6: { mode: 'Биомы', d: '+1 душа с босса биома', what: 'Души с босса биома', step: 1, unit: '', base: null, loot: 'bossSouls', src: { d: '+1 душа с босса биома', lv: 5, from: 2 } },
  7: { mode: 'Ключи', d: '+1 п.п. к шансу рунного ключа с босса биома', what: 'Шанс рунного ключа с босса', step: 1, unit: ' п.п.', base: null, loot: 'runeKeyPp',
    src: { d: '+1 п.п. к шансу ключа с элит (1% → 7%)', lv: 6, from: 1 }, note: 'Шанс с босса биома — 10 %; обе отмычки вместе поднимают его до 25 % (§11)',
    fix: 'Рунный ключ с элит не падает (ADR-0023, вариант Б) — отмычка поднимает шанс с босса биома' },
  8: { mode: 'Ключи', d: '+3 п.п. к шансу рунного ключа с босса биома', what: 'Шанс рунного ключа с босса', step: 3, unit: ' п.п.', base: null, lv: 3, loot: 'runeKeyPp',
    src: { d: '+6 п.п. к шансу ключа с босса биома (1% → 25%)', lv: 4, from: 2 }, note: 'Шанс с босса биома — 10 %; обе отмычки вместе поднимают его до 25 % (§11)',
    fix: 'База шанса с босса — 10 %, а не 1 % (recipes.js, §11: «10 % → 25 % с артефактами»). Вместе со «Связкой отмычек» (+6 п.п.) нужно ещё +9 п.п.: +3 п.п. за уровень, три уровня вместо четырёх' },
  9: { mode: 'Ресурсы', d: '+3 п.п. к шансу уникального ресурса босса', what: 'Шанс уникального ресурса босса', step: 3, unit: ' п.п.', base: null, loot: 'uniquePp',
    src: { d: '+3 п.п. к шансу уникального ресурса босса (10% → 19%)', lv: 3, from: 3 }, note: 'С 5 % до 14 %',
    fix: 'Шанс уникального ресурса босса в данных — 5 % (recipes.js, §9.1), а не 10 %: «10 % → 19 %» → «5 % → 14 %»' },
  10: { mode: 'Эхо', d: '+1 вариант при призыве в Эхо', what: 'Вариантов при призыве в Эхо', step: 1, unit: '', base: 1, src: { d: '+1 вариант при призыве в Эхо (1 → 3)', lv: 2, from: 3 } },
  12: { mode: 'Контракты', d: '+2 задания в пуле контрактов', what: 'Заданий в пуле контрактов', step: 2, unit: '', base: 3, src: { d: '+2 задание в пуле контрактов (1 → 9)', lv: 4, from: 2 },
    fix: 'Пул заданий по умолчанию — 3 (§18.2), а не 1: «1 → 9» → «3 → 11»',
    name: { was: 'Доска объявлений', now: 'Доска у ворот', why: '«Объявления» — слово нашего времени. У ворот Стоун-Хейма — доска заказов (свод); «Доска заказов» — уже прозвище героини Сельви (ADR-0038)' } },
  13: { mode: 'Контракты', d: '+1 бесплатный реролл заданий', what: 'Бесплатных рероллов заданий', step: 1, unit: '', base: 3, src: { d: '+1 бесплатный реролл заданий (1 →3)', lv: 2, from: 2 },
    fix: 'Бесплатных рероллов по умолчанию — 3 (§18.2), а не 1: «1 → 3» → «3 → 5»' },
  14: { mode: 'Ритуалы', d: '+2 слота ритуалов', what: 'Слотов ритуалов', step: 2, unit: '', base: 1, lv: 3, src: { d: '+2 слот ритуалов (1 →11)', lv: 5, from: 2 },
    fix: 'Потолок слотов ритуалов — 7 (лист «Правила», п. 4), в §19.2 — «1 → ~8 артефактами»; строка давала 11. Три уровня вместо пяти: 1 → 7' },
  15: { mode: 'Ритуалы', d: '+1 бесплатный ролл пула ритуалов', what: 'Бесплатных роллов ритуалов', step: 1, unit: '', base: 3, src: { d: '+1 бесплатный ролл пула ритуалов (3 → 6)', lv: 3, from: 2 } },
  16: { mode: 'Ритуалы', d: '+1 вариант при ролле ритуала', what: 'Вариантов при ролле ритуала', step: 1, unit: '', base: null, src: { d: '+1 вариант при ролле ритуала', lv: 2, from: 3 } },
  18: { mode: 'Лавка', d: '+2 товара в пуле лавки', what: 'Товаров в пуле лавки', step: 2, unit: '', base: 10, src: { d: '+2 товар в пуле магазина (10 → 20)', lv: 5, from: 1 },
    name: { was: 'Свиток ассортимента', now: 'Опись прилавка', why: '«Ассортимент» — слово нашего времени (ADR-0038)' } },
  19: { mode: 'Лавка', d: '+1 бесплатное обновление лавки в день', what: 'Бесплатных обновлений лавки', step: 1, unit: '', base: 1, src: { d: '+1 бесплатное обновление магазина в день (1 → 5)', lv: 4, from: 1 } },
  20: { mode: 'Рынок', d: '+1 лот на рынке', what: 'Лотов на рынке', step: 1, unit: '', base: 5, src: { d: '+1 лота на рынке (5 → 11)', lv: 6, from: 1 } },
};
const ART_RULES = {
  /* с какого уровня Странника открыты артефакты — сценарий «Старт с чистого листа» (tools/content-gen/start/data.js, GATES.art): на 8-м,
     к двадцатому этажу Подземного леса, души на первый артефакт уже набраны с элит. Было — 4-й (§16, «Закрыть первый биом»): у игрока
     там около 20 душ, а первый артефакт стоит 80 */
  openLevel: require(path.join(__dirname, '..', 'start', 'data.js')).GATES.art,
  cycles: 6,                      // уровней не больше, чем циклов с цикла открытия: lv ≤ 7 − from
  activeMax: 7,                   // ADR-0014: одновременных забегов до семи — шесть от артефакта активных биомов и ещё один от Памяти; потолок «4» листа «Правила» устарел
  trail: 'a1',                    // артефакт активных биомов (ADR-0054): слот одновременного забега даёт только он — экраны и калькуляторы берут его отсюда
};

/* Пороги проверок достижений */
const CHECK = {
  count: { pers: [45, 55], rev: [18, 26], myst: [18, 26] },   // §29: ~50, ~22, ~22 — каталог начала пути; блоки циклов считаются отдельно (ACH.BLOCKS)
  firstsPerCycle: [0, 3, 5, 5, 5, 5, 5],                      // первенств по циклам I–VI: виды FIRSTS с их цикла
  hintShared: 1,                  // подсказка таинственного делит с условием не больше одного значимого слова (основа — первые 5 букв)
  curveDaysShow: 35,              // таблица кривой: по дням — до этого дня, дальше до конца цикла III — по неделям,
  curveMonth: 30,                 // а с цикла IV — строками по стольку дней
};

/* ================================ СБОРКА ================================ */

const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  pas: path.join(ROOT, 'source-data', 'оригиналы-2026-09-26', 'Enerium_Странник_пассивки_Финал.xlsx'),
  art: path.join(ROOT, 'source-data', 'оригиналы-2026-09-26', 'Enerium_Артефакты_Финал.xlsx'),
  prov: path.join(ROOT, 'source-data', 'provenance.json'),
  loot: path.join(ROOT, 'design', 'ui', 'lootboxes.js'),
  recipes: path.join(ROOT, 'design', 'ui', 'recipes.js'),
  echoRules: path.join(ROOT, 'design', 'ui', 'echo-rules.js'),
  roster: path.join(ROOT, 'design', 'ui', 'roster.js'),
  contracts: path.join(ROOT, 'design', 'ui', 'contracts.js'),
  arena: path.join(ROOT, 'design', 'ui', 'arena.js'),
  rituals: path.join(ROOT, 'design', 'ui', 'rituals.js'),
  event: path.join(ROOT, 'design', 'ui', 'event.js'),
  clan: path.join(ROOT, 'design', 'ui', 'clan.js'),
  climbDays: path.join(ROOT, 'tools', 'content-gen', 'cycle', 'climb-days.json'),
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
    const src = { cat: String(row[cCat]).trim(), d: String(row[cD]).trim(), n: String(row[cN]).trim() };
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
    for (const k of ['own', 'open', 'buyFrom']) if (X[k] != null && (!isInt(X[k]) || X[k] < 1)) err.push(`${what}: «${k}» — не целое от единицы`);
    if (X.own != null && X.base == null) err.push(`${what}: покупка даёт значение (own), а исходного (base) нет`);
    if (X.buyFrom != null && X.buyFrom > src.from) err.push(`${what}: покупка с цикла ${X.buyFrom} — позже уровней (цикл ${src.from})`);
    const max = X.base != null ? `${X.base} → ${X.base + (X.own || 0) + X.step * lv}${X.unit}` : `+${X.step * lv}${X.unit}`;
    const a = { id: 'a' + no, no, mode: X.mode, n: String(row[aN]).trim(), d: X.d, what: X.what, step: X.step, unit: X.unit, base: X.base, lv, from: src.from, gold, soul, total, max };
    for (const k of ['own', 'open', 'buyFrom']) if (X[k] != null) a[k] = X[k];   // покупка сама даёт значение; продаётся раньше общего уровня и цикла уровней
    if (X.name) {
      if (a.n !== X.name.was) err.push(`${what}: правка имени ждёт «${X.name.was}» — таблицу обновили, сверить правку`);
      a.n = X.name.now;
      fixes.push({ what: `Артефакт · № ${no} «${a.n}»`, was: X.name.was, now: X.name.now, why: X.name.why });
    }
    if (X.loot) a.loot = X.loot;   // примитив добычи биома: его считает ядро (RULES.drop.art)
    if (X.note) a.note = X.note;
    if (X.fix) { a.fix = X.fix; fixes.push({ what: `Артефакт · № ${no} «${a.n}»`, was: `${src.d}; уровней ${src.lv}`, now: `${a.d}; уровней ${lv}; итог ${max}`, why: X.fix }); }
    if (spoilOf(a.n + ' ' + a.d).length) err.push(`${what}: спойлер — ${spoilOf(a.n + ' ' + a.d).join(', ')}`);
    artifacts.push(a);
  }
  for (const no of Object.keys(ART)) if (!seenArt.has(+no)) err.push(`артефакт № ${no} из блока ART: такой строки в таблице нет`);
  if (artifacts.length !== 18) err.push(`артефактов ${artifacts.length}, в таблице автора 18`);
  if (staleAll.length) fixes.push({ what: 'Артефакты · «Все уровни, души»', was: 'столбец таблицы', now: 'база × (1 + 2 + … + уровней)', why: `По правилу автора «цена уровня = база × номер уровня» столбец считан по прежнему числу уровней — ещё у ${staleAll.length} артефактов, кроме правленых выше: ` + staleAll.join('; ') });
  {
    /* артефакт активных биомов (ADR-0054): без него слота нет, покупка — в обучении и открывает один, уровни — по одному за цикл с цикла II;
       в цикле c слотов не больше c — потолок прежнего правила «номер цикла», но теперь слот покупают */
    const walk = artifacts.find(a => a.id === ART_RULES.trail);
    if (!walk) err.push(`артефакта активных биомов ${ART_RULES.trail} нет в таблице (ADR-0054)`);
    else {
      if (walk.base !== 0 || walk.own !== 1) err.push('«Знак открытых троп»: без артефакта активного биома нет, покупка открывает один — единственный в обучении (ADR-0054, п. 15)');
      if (walk.open !== 1 || walk.buyFrom !== 1) err.push('«Знак открытых троп»: покупка — в обучении: с 1-го уровня Странника, в цикле I (ADR-0054, п. 3)');
      if (walk.from !== 2) err.push('«Знак открытых троп»: уровни — с цикла II, после обучения (ADR-0054, п. 15)');
      if (walk.base + walk.own + walk.step * walk.lv + 1 !== ART_RULES.activeMax) err.push('артефакт «Знак открытых троп»: с пассивкой Памяти забегов должно быть семь (ADR-0014)');
    }
    fixes.push({ what: 'Артефакты · лист «Правила», п. 4', was: 'активных биомов максимум 4', now: 'до семи одновременных забегов: шесть — «Знак открытых троп», ещё один — Память', why: 'ADR-0014, строка «Печати открытых троп» (+5, «всего 7 с учётом пассивки Странника»); слот даёт только артефакт — ADR-0054' });
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
    '     total — души на все уровни; loot — примитив добычи биома, его считает ядро (battle.js, RULES.drop.art, ADR-0044); art.rules — уровень аккаунта для открытия, потолок забегов;',
    '   - ach — виды пассивок (kinds: cap — потолок суммы вида у вех начала пути, blk — в блоке одного цикла, cls — класс вида, all — сумма по всему каталогу),',
    '     категории (cats, label — строка режима «Достижения» в lootboxes.js), темы (groups),',
    '     счётчики (metrics: n — что считает, u — единица, t — ступень, а не количество, c — счётчик блока этого цикла),',
    '     темп (pace: start — первый день цикла I–VI у обычного, startE — у увлечённого, день 0 — обучение; horizon и horizonE — последний день прогона: конец цикла VI;',
    '     rarDays — ступени редкости вех; hours — часов в день у обычного o и увлечённого e; curve — закон кривой: daily, gaps, pause — порог паузы по циклам),',
    '     блоки циклов (blocks: cycles, team — цикл только для команды, need — сколько достижений обычный берёт за цикл, myst — таинственных в блоке, capCls — потолок вида блока по классу),',
    '     демо-аккаунт (demo: день и счётчики обычного на этот день; demoBy — то же для демо-цикла команды), достижения (list: g — тема, s — серия, k из ks — ступень, goal, m — счётчик,',
    '     pk и v — пассивка, r — редкость по трудности, at — день получения у обычного o и увлечённого e по своему календарю, null — за горизонтом прогона;',
    '     c — блок цикла (нет — веха начала пути), team — блок только для команды: игроку не рисуется;',
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
    `    blocks: ${J(A.blocks)},`,
    `    demo: ${J(A.demo)},`,
    '    demoBy: {',
    ...Object.entries(A.demoBy).map(([c, x]) => `      ${J(c)}: ${J(x)},`),
    '    },',
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
   Каталог achievements.js → список с днями получения, редкостью, проверками и таблицами черновика.
   Вехи начала пути — PERS, REV, MYST. Блоки «Серии цикла N» (ADR-0047, п. 6) — BLOCKS: явные ступени — день по модели счётчика,
   гибкие — подбор по закону кривой (achievements-pace.js, slotBlock), пассивки гибких — по остатку потолков блока.
   Законы каталога — achievements-pace.js, laws: их же сверяет check_wanderer.js и его мутации */
function buildAch({ err, warn, REC, LBX, artifacts, spoilOf }) {
  const kinds = ACH.KINDS, cats = ACH.CATS, groups = ACH.GROUPS, P = ACH.PACE, BL = ACH.BLOCKS, log = [];
  const metrics = Object.assign({}, ACH.METRICS, AP.blockMetrics(ACH));   // счётчики вех и по счётчику блока на цикл
  const empty = { kinds, cats, groups, metrics: {}, pace: {}, blocks: {}, demo: {}, demoBy: {}, list: [], firsts: [], tables: {}, log };
  const feats = LBX && LBX.modes && LBX.modes.feats;
  if (!feats) { err.push('lootboxes.js: нет режима «Достижения» (modes.feats) — сундуков за достижения нет'); return empty; }
  const featRows = feats.layers.flatMap(l => l.rows);
  for (const c of cats) {
    const row = featRows.find(r => r.label === c.label);
    if (!row) { err.push(`достижения «${c.n}»: в lootboxes.js нет строки «${c.label}»`); continue; }
    for (let cy = 1; cy <= 6; cy++) if (!row.cyc[cy] || !row.cyc[cy].length) err.push(`достижения «${c.n}»: нет сундука для цикла ${cy}`);
  }
  for (const [k, K] of Object.entries(kinds)) if (!isInt(K.cap) || K.cap < 0 || !isInt(K.blk) || K.blk < 0 || K.cap + K.blk < 1) err.push(`вид пассивки ${k}: потолки cap и blk — целые ≥ 0, хоть один больше нуля`);
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
  /* доля рецептов героев — среди рецептов-целей, которые игрок ищет перебором: герои, активации, призывы, награды. Заготовки и изделия —
     ступени к ним (подсказки ресурсов ведут по цепочке), руны известны по правилу, цикл «для команды» игрок не видит (recipes.js, 30.09.2026) */
  const GOAL = new Set(['hero', 'act', 'call', 'product']), goalRecipes = REC.recipes.filter(r => !r.team && GOAL.has(r.kind));
  const heroRecipes = goalRecipes.filter(r => r.kind === 'hero').length;
  /* входы счётчиков блоков циклов — из данных игры, копий чисел нет: модель стока крафта и рецепты по циклам (recipes.js), герои Эхо по циклам
     (roster.js), записи дня калькулятора подъёма (cycle/climb-days.json), эталонные недели клана (clan.js), режимы с личными планками
     и ступень профиля в них (lootboxes.js) */
  const CLAN = loadWin(FILES.clan).EN_CLAN;
  if (!CLAN || !CLAN.calc || !Array.isArray(CLAN.calc.weeks)) { err.push('clan.js: нет эталонных недель calc.weeks — собрать клан'); return empty; }
  if (!fs.existsSync(FILES.climbDays)) { err.push('нет tools/content-gen/cycle/climb-days.json — python tools/content-gen/cycle/climb.py'); return empty; }
  const CLIMB = JSON.parse(fs.readFileSync(FILES.climbDays, 'utf8'));
  if (!CLIMB.days || !CLIMB.meta || !CLIMB.meta.ends || !Array.isArray(CLIMB.meta.fields)) { err.push('climb-days.json: нет записей дня, концов циклов или списка полей'); return empty; }
  const fIdx = n => { const i = CLIMB.meta.fields.indexOf(n); if (i < 0) err.push(`climb-days.json: нет поля «${n}»`); return i; };
  const block = {
    sink: Object.fromEntries(((REC.stats && REC.stats.sink) || []).map(x => [x.cyc, x])),
    totals: { recipes: {}, echoHeroes: {} },
    climb: { days: CLIMB.days, ends: CLIMB.meta.ends, idx: { stageC: fIdx('цикл героев главной ступени развития'), stageV: fIdx('её доблесть'), lim: fIdx('пределов'), up: fIdx('героев главной ступени на доблести выше') } },
    /* строка эталонной недели clan.js: [профиль, цикл, неделя цикла, сила, уровень древа, участников, атак в день, бюджет, кругов, …] — clan/build.js, calc.weeks */
    clanWeeks: CLAN.calc.weeks.map(r => ({ prof: r[0], c: r[1], w: r[2], circles: r[8] })),
    modes: Object.entries(LBX.modes).map(([id, M]) => { const L = (M.layers || []).find(l => l.id === 'me' && l.kind === 'plank' && !l.clan);
      return M.weekly && L && M.typical ? { id, n: M.n, from: M.from, top: L.rows.length, typical: { free: (M.typical.free || {}).me, fan: (M.typical.fan || {}).me } } : null; }).filter(Boolean),
  };
  for (const c of BL.cycles) { block.totals.recipes[c] = REC.recipes.filter(r => r.cyc === c).length; block.totals.echoHeroes[c] = RO.heroes.filter(h => h.src === 'echo' && h.c === c).length; }
  if (block.clanWeeks.some(r => !AP.PROF.includes(r.prof) || !isInt(r.c) || !isInt(r.w) || !isInt(r.circles))) err.push('clan.js: строки calc.weeks не в виде [профиль, цикл, неделя, …, кругов на девятом месте] — сверить с clan/build.js');
  if (!block.modes.length) err.push('lootboxes.js: нет недельных режимов с личными планками (слой me) и ступенью профиля (typical)');
  const echoKit = AP.echoKitOf(RO);   // комплект осколков героя Эхо по циклу героя: rules.echoSet, пока его нет — rules.stub.shards
  const PR = AP.run(Object.assign({}, ACH, { METRICS: metrics }), { cap: CAP, lb: LBX, paceBiomes: PJ, inputs: IN, ct: CT, ctSim: CSIM, arena: AR, rituals: RT, event: EV, uniqueBp: ub[0], manyBp: ER.manySummonBp,
    heroRecipes, allRecipes: goalRecipes.length, goldHeroes, echoKit, block, art: artifacts.map(a => ({ id: a.id, from: a.from, lv: a.lv })) });
  for (const e of PR.err || []) err.push('прогон темпа: ' + e);
  for (const e of PR.note || []) warn.push('прогон темпа: ' + e);
  if (!PR.val || (PR.err || []).length) return empty;   // счётчик не собрался — каталог по нему не строим
  const KO = PR.cal.o, KE = PR.cal.e, H = KO.H;
  const at3 = (m, goal) => ({ o: AP.dayOf(PR, 'o', m, goal), e: AP.dayOf(PR, 'e', m, goal), p: AP.dayOf(PR, 'p', m, goal) });

  /* ---------- каталог: вехи начала пути ---------- */
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
  /* таинственные: находка — цель 1, день — оценка; подсказка без имени, чисел и почти без слов условия. team — блок «для команды»:
     спойлеры цикла ему разрешены, игроку он не рисуется */
  const stems = t => new Set(String(t).toLowerCase().split(/[^а-яё]+/).filter(w => w.length >= 5).map(w => w.slice(0, 5)));
  const mystCheck = (what, { id, hint, n, d, g, pk, v, r, team }) => {
    if (seen.has(id)) err.push(`${what}: id повторяется`); seen.add(id);
    if (!groups[g]) err.push(`${what}: неизвестная тема «${g}»`);
    if (!kinds[pk]) err.push(`${what}: неизвестный вид пассивки «${pk}»`);
    if (!isInt(v) || v < 1) err.push(`${what}: величина пассивки не целое ≥ 1`);
    if (!isInt(r) || r < 1 || r > 7) err.push(`${what}: редкость не 1–7`);
    if (!hint) err.push(`${what}: нет подсказки`);
    else {
      if (hint.toLowerCase().includes(n.toLowerCase())) err.push(`${what}: подсказка выдаёт имя`);
      if (/\d/.test(hint)) err.push(`${what}: в подсказке число — она выдаёт условие`);
      const shared = [...stems(hint)].filter(s => stems(d).has(s));
      if (shared.length > CHECK.hintShared) err.push(`${what}: подсказка повторяет условие — ${shared.join(', ')}`);
    }
    if (!team && spoilOf([n, d, hint].join(' ')).length) err.push(`${what}: спойлер — ${spoilOf([n, d, hint].join(' ')).join(', ')}`);
  };
  for (const [id, hint, n, d, g, m, pk, v, r, from, o, e] of ACH.MYST) {
    const what = `таинственное ${id} «${n}»`;
    mystCheck(what, { id, hint, n, d, g, pk, v, r });
    if (!isInt(from) || from < 1 || from > 6) err.push(`${what}: цикл не 1–6`);
    for (const [pr, x] of [['o', o], ['e', e]]) {
      if (x != null && (!isInt(x) || x < 0 || x > PR.cal[pr].H)) err.push(`${what}: оценка дня вне прогона`);
      if (x != null && x < PR.cal[pr].start[from]) err.push(`${what}: оценка дня ${x} раньше, чем открывается цикл ${ROMAN[from]}`);
    }
    list.push({ id, cat: 'myst', g, s: id, k: 1, ks: 1, n, d, goal: 1, m, pk, v, r, at: { o, e }, hint, from, est: 1 });
  }
  for (const [c, [lo, hi]] of Object.entries(CHECK.count)) { const k = list.filter(a => a.cat === c).length; if (k < lo || k > hi) err.push(`достижений начала пути «${c}» — ${k}, по §29 около ${(lo + hi) / 2}`); }

  /* ---------- каталог: блоки «Серии цикла N» ---------- */
  const cond = (t, n, c) => (Array.isArray(t) ? plural(n, t) : t).replace('{n}', fmt(n)).replace('{c}', ROMAN[c]);
  const flexOf = {};   // цикл → гибкие ступени по дням: для таблиц и сводки
  for (const c of BL.cycles) {
    const team = BL.team.includes(c), tag = team ? { team: 1 } : {}, where = `блок цикла ${ROMAN[c]}`;
    const SER = ACH.BLOCK_SERIES.filter(S => (S.from || BL.cycles[0]) <= c), mOf = S => (S.m || S.k) + c;
    const rem = Object.fromEntries(Object.entries(kinds).map(([k, K]) => [k, K.blk]));   // остаток потолка вида в блоке
    const mk = (S, k, ks, goal, pk, v) => {
      const m = mOf(S), id = `b${c}-${S.k}-${k + 1}`, what = `достижение ${id}`;
      if (seen.has(id)) err.push(`${what}: id повторяется`); seen.add(id);
      if (!groups[S.g]) err.push(`${what}: неизвестная тема «${S.g}»`);
      if (!metrics[m] || metrics[m].c !== c) { err.push(`${what}: нет счётчика «${m}» цикла ${ROMAN[c]}`); return null; }
      if (!kinds[pk] || !isInt(v) || v < 1) { err.push(`${what}: вид пассивки «${pk}» или величина ${v}`); return null; }
      used.add(m);
      /* имя — «серия · цикл» и номер ступени, если их несколько; sn — имя серии без номера: его показывает карточка, ступени на ней — отметками */
      const t = at3(m, goal), sn = `${S.names ? S.names[k] : S.n} · ${ROMAN[c]}`, many = !S.names && ks > 1, n = many ? `${sn} · ${k + 1}` : sn, d = cond(S.ds ? S.ds[k] : S.d, goal, c);
      if (!isInt(goal) || goal < 1 || !d) err.push(`${what} «${n}»: цель не целое ≥ 1 или нет условия`);
      if (!team && spoilOf([n, d].join(' ')).length) err.push(`${what} «${n}»: спойлер — ${spoilOf([n, d].join(' ')).join(', ')}`);
      payerDay[id] = t.p;
      return Object.assign({ id, cat: S.cat, g: S.g, s: `b${c}-${S.k}`, k: k + 1, ks, n }, many ? { sn } : {}, { d, goal, m, pk, v, r: AP.blockRarity(PR, BL, c, t.o), at: { o: t.o, e: t.e }, c }, tag);
    };
    /* явные серии: цель — правило игры (goals) или доля набора из данных (parts от totals[of]); день — по модели счётчика */
    const explicit = [];
    for (const S of SER.filter(S => S.goals || S.parts)) {
      const tot = S.of ? block.totals[S.of][c] : null;
      if (S.of && (!isInt(tot) || tot < 1)) { err.push(`${where}, серия ${S.k}: в данных нет числа «${S.of}» цикла`); continue; }
      const goals = S.goals || Array.from({ length: S.parts }, (_, k) => Math.ceil(tot * (k + 1) / S.parts));
      if (goals.length !== S.pas.length || (S.ds && S.ds.length !== goals.length) || (S.names && S.names.length !== goals.length)) { err.push(`${where}, серия ${S.k}: ступеней ${goals.length}, а пассивок, условий или имён — другое число`); continue; }
      goals.forEach((goal, k) => { const [pk, v] = S.pas[k], a = mk(S, k, goals.length, goal, pk, v); if (a) { rem[pk] -= v; explicit.push({ S, a }); } });
    }
    /* таинственные блока: оценка — день цикла у профиля */
    const rows = ACH.BLOCK_MYST[c] || [], mystList = [];
    rows.forEach(([hint, n, d, g, m, pk, v, r, o, e], i) => {
      const id = `b${c}-m${i + 1}`, what = `таинственное ${id} «${n}»`;
      mystCheck(what, { id, hint, n, d, g, pk, v, r, team });
      const day = (pr, x) => (x == null ? null : PR.cal[pr].start[c] + (x === 'end' ? PR.cal[pr].len[c] : x) - 1);
      for (const [pr, x] of [['o', o], ['e', e]]) if (x != null && x !== 'end' && (!isInt(x) || x < 1 || x > PR.cal[pr].len[c])) err.push(`${what}: оценка — ${x}-й день цикла, а цикл ${ROMAN[c]} у профиля — ${PR.cal[pr].len[c]} дней`);
      if (kinds[pk]) rem[pk] -= v;
      mystList.push(Object.assign({ id, cat: 'myst', g, s: id, k: 1, ks: 1, n, d, goal: 1, m, pk, v, r, at: { o: day('o', o), e: day('e', e) }, hint, from: c, est: 1, c }, tag));
    });
    /* гибкие серии: ступени и цели — подбор по закону кривой. Обязательные дни — когда обычный и так получает достижение: вехи начала пути
       (кроме блоков из BL.alone) и явные ступени блока */
    const flexS = SER.filter(S => !S.goals && !S.parts);
    for (const S of flexS) if (!isInt(S.w) || S.w < 1 || !Array.isArray(S.pk) || !S.pk.length) err.push(`${where}, серия ${S.k}: нет веса или видов пассивок`);
    const fixed = (BL.alone.includes(c) ? [] : list.filter(a => !a.est && a.at.o != null).map(a => a.at.o)).concat(explicit.map(x => x.a.at.o).filter(d => d != null));
    const SL = AP.slotBlock(PR, { c, gap: BL.gap[c], loose: BL.loose && BL.loose[c], fixed, series: flexS.map(S => ({ key: S.k, m: mOf(S), w: S.w, max: S.max })), units: BL.niceUnits, cls: BL.niceCls });
    for (const e of SL.err) err.push('подбор ступеней: ' + e);
    flexOf[c] = SL.steps;
    /* пассивка гибкой ступени — по дням: +1 первого вида серии, чей потолок блока ещё не выбран; свои выбраны — из запаса BL.spare */
    const got = {};
    for (const st of SL.steps) {
      const S = flexS.find(x => x.k === st.key), pk = S.pk.concat(BL.spare).find(k => rem[k] > 0);
      if (!pk) { err.push(`${where}: потолки видов выбраны — ступени серии «${S.n}» нечего дать; убавить ступеней (BLOCKS.gap) или поднять потолок вида`); continue; }
      rem[pk]--; (got[S.k] = got[S.k] || []).push({ goal: st.goal, pk });
    }
    for (const S of SER) {   // порядок блока — порядок серий в данных
      if (S.goals || S.parts) { for (const x of explicit) if (x.S === S) list.push(x.a); continue; }
      const st = got[S.k] || [];
      if (seenS.has(`b${c}-${S.k}`)) err.push(`${where}: серия ${S.k} повторяется`); seenS.add(`b${c}-${S.k}`);
      st.forEach((x, k) => { const a = mk(S, k, st.length, x.goal, x.pk, 1); if (a) list.push(a); });
    }
    list.push(...mystList);
  }
  for (const m of Object.keys(metrics)) if (!used.has(m) && metrics[m].c == null) warn.push(`счётчик ${m}: ни одно достижение его не берёт`);
  const kindSum = {};   // сумма вида: вехи начала пути и по блокам
  for (const a of list) { const s = kindSum[a.pk] = kindSum[a.pk] || { old: 0, all: 0, blk: {} }; s.all += a.v; if (a.c == null) s.old += a.v; else s.blk[a.c] = (s.blk[a.c] || 0) + a.v; }

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
  const startOf = K => [0, ...[1, 2, 3, 4, 5, 6].map(c => K.start[c])];
  const snap = day => Object.fromEntries(Object.keys(metrics).map(m => [m, Math.floor(((PR.val.o[m] || [])[day] || 0) / 100)]));   // счётчик не собрался — ошибка прогона уже записана
  const demoDay = P.demoDay, demo = { day: demoDay, n: snap(demoDay) };
  /* демо-цикл команды на экране «Странник»: счётчики обычного на доле demoBp своего цикла; цикл I — обучение, цикл II — день демо-аккаунта */
  const demoBy = {};
  for (let c = 1; c <= 6; c++) { const day = c === 1 ? 0 : c === 2 ? demoDay : KO.start[c] + Math.floor(KO.len[c] * P.demoBp / 10000); demoBy[c] = { day, n: snap(day) }; }
  const metricsOut = Object.fromEntries(Object.entries(metrics).map(([m, M]) => [m, Object.assign({ n: M.n, u: M.u }, M.t ? { t: 1 } : {}, M.c ? { c: M.c } : {})]));
  const kindsOut = Object.fromEntries(Object.entries(kinds).map(([k, K]) => [k, { n: K.n, t: K.t, cap: K.cap, cls: K.cls, blk: K.blk, all: (kindSum[k] || { all: 0 }).all }]));
  const paceOut = { start: startOf(KO), startE: startOf(KE), horizon: H, horizonE: KE.H, rarDays: P.rarDays, hours: CAP.hours, curve: P.curve };
  const blocksOut = { cycles: BL.cycles, team: BL.team, need: BL.need, myst: BL.myst, capCls: BL.capCls, gap: BL.gap, rarBp: BL.rarBp };

  /* ---------- законы каталога: блоки, минимум по циклам, кривая, потолки, пассивки, цикл для команды, спойлеры ---------- */
  const LAW = AP.laws({ list, kinds: kindsOut, metrics: metricsOut, blocks: blocksOut, pace: paceOut }, t => LAD.scan(t).map(h => h.hit));
  for (const e of LAW.err) err.push(`закон ${e.k}: ${e.m}`);

  /* ---------- таблицы черновика ---------- */
  const tables = {};
  const dayTxt = (d, pr = 'o') => { const K = PR.cal[pr]; return d == null ? 'за горизонтом' : d === 0 ? 'I · обучение' : `${ROMAN[K.cyc(d)]} · ${d - K.start[K.cyc(d)] + 1}`; };
  const pas = a => form(kinds[a.pk].t, a.v);
  const head = h => ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|'];
  const row = r => '| ' + r.join(' | ') + ' |';
  const esc = s => String(s).replace(/\|/g, '/');
  const rarN = r => RAR[r - 1].toLowerCase();
  const old = list.filter(a => a.c == null), blk = list.filter(a => a.c != null);
  const model = list.filter(a => !a.est), myst = list.filter(a => a.est);
  const inC = (pr, c, l) => l.filter(a => a.at[pr] != null && PR.cal[pr].cyc(a.at[pr]) === c);
  for (const cat of ['pers', 'rev']) {
    const T = head(['Тема', 'Достижение', 'Условие', 'Ступень', 'Пассивка', 'Редкость', 'Обычный', 'Увлечённый', 'Счётчик']);
    for (const a of old.filter(x => x.cat === cat)) T.push(row([groups[a.g].n, `**${a.n}**`, esc(a.d), a.ks > 1 ? `${a.k} из ${a.ks}` : '—', pas(a), rarN(a.r), dayTxt(a.at.o), dayTxt(a.at.e, 'e'), `\`${a.m}\` ≥ ${fmt(a.goal)}`]));
    tables[cat] = T.join('\n');
  }
  {
    const T = head(['Подсказка до получения', 'Достижение', 'Условие', 'Пассивка', 'Редкость', 'Возможно с', 'Обычно находят: обычный', 'увлечённый']);
    for (const a of old.filter(x => x.cat === 'myst')) T.push(row([`«${a.hint}»`, `**${a.n}**`, esc(a.d), pas(a), rarN(a.r), `цикла ${ROMAN[a.from]}`, dayTxt(a.at.o), dayTxt(a.at.e, 'e')]));
    tables.myst = T.join('\n');
  }
  {
    const rows = featRows.find(r => r.label === cats.find(c => c.id === 'first').label);
    const T = head(['Цикл', 'Первенство', 'Условие', 'Титул', 'Сундук']);
    for (const f of firsts) { const g = rows.cyc[f.c][0]; T.push(row([ROMAN[f.c], f.n.replace(/ · цикл .+$/, ''), f.d, f.title.replace(/ · цикл .+$/, ''), `${rarN(g.r)}${g.win === 'pure' ? ' · чистое' : ''}`])); }
    tables.firsts = T.join('\n');
  }
  /* блоки циклов: серии, таинственные, сводка, потолки, счётчики */
  const cycN = c => `${ROMAN[c]}${BL.team.includes(c) ? ' · для команды' : ''}`;
  {
    const T = head(['Цикл', 'Категория', 'Тема', 'Достижение', 'Условие', 'Ступень', 'Пассивка', 'Редкость', 'Обычный', 'Увлечённый', 'Счётчик']);
    for (const a of blk.filter(x => !x.est)) T.push(row([cycN(a.c), cats.find(x => x.id === a.cat).n, groups[a.g].n, `**${a.n}**`, esc(a.d), a.ks > 1 ? `${a.k} из ${a.ks}` : '—', pas(a), rarN(a.r), dayTxt(a.at.o), dayTxt(a.at.e, 'e'), `\`${a.m}\` ≥ ${fmt(a.goal)}`]));
    tables.blocks = T.join('\n');
    const M = head(['Цикл', 'Подсказка до получения', 'Достижение', 'Условие', 'Пассивка', 'Редкость', 'Обычно находят: обычный', 'увлечённый']);
    for (const a of blk.filter(x => x.est)) M.push(row([cycN(a.c), `«${a.hint}»`, `**${a.n}**`, esc(a.d), pas(a), rarN(a.r), dayTxt(a.at.o), dayTxt(a.at.e, 'e')]));
    tables.bmyst = M.join('\n');
    const S = head(['Цикл', 'Дней: обычный / увлечённый', 'В блоке: персональных / возрождённых / таинственных', 'Из них гибких ступеней', 'Обычный берёт: серии / тайны', 'Увлечённый берёт: серии / тайны',
      'У обычного за цикл, без тайн: всего (нужно)', 'Самая длинная пауза у обычного (порог)']);
    for (const c of BL.cycles) {
      const own = blk.filter(a => a.c === c), n = cat => own.filter(a => a.cat === cat).length, took = pr => `${own.filter(a => !a.est && a.at[pr] != null).length} / ${own.filter(a => a.est && a.at[pr] != null).length}`;
      const w = LAW.worst[c];
      S.push(row([cycN(c), `${KO.len[c]} / ${KE.len[c]}`, `${n('pers')} / ${n('rev')} / ${n('myst')}`, flexOf[c].length, took('o'), took('e'),
        `${inC('o', c, model).length}${BL.need[c] ? ` (${BL.need[c]})` : ''}`, w ? `${w[1] - w[0]} дн.: ${dayTxt(w[0])} — ${w[1] > H ? 'конец прогона' : dayTxt(w[1])} (${P.curve.pause[c]})` : '—']));
    }
    tables.bsum = S.join('\n');
    const clsN = { money: 'золото и дух за убийство', chance: 'шанс, относительно', narrow: 'узкий источник или сток', count: 'штучные и Энериум' };
    const C = head(['Вид', 'Класс', 'Потолок на блок', ...BL.cycles.map(c => `Блок ${ROMAN[c]}`), 'Все блоки']);
    for (const [k, K] of Object.entries(kinds)) { const s = kindSum[k] || { blk: {}, all: 0, old: 0 };
      C.push(row([K.n, clsN[K.cls] || K.cls, K.blk || '—', ...BL.cycles.map(c => s.blk[c] || 0), s.all - s.old])); }
    tables.bcaps = C.join('\n');
    const src = { cb: '`capacity.json`, echoCraftKillX1e6', aw: '`capacity.json`, echoManyX1e6 — допущение «победа над Многоликим — один Пробуждённый»', run: '`recipes.js`, stats.sink; увлечённому — по часам игры, допущение',
      rec: '`contracts.js`, caps; потолок — рецептов цикла в `recipes.js`', circ: '`clan.js`, calc.weeks', step: '`lootboxes.js`, typical', top: '`lootboxes.js`, typical и число ступеней полосы',
      eq: '`lootboxes.js`, week: Арена и Лига', tal: '`lootboxes.js`, week: клановый босс', eh: '`lootboxes.js`, week: Эхо; комплект — `roster.js`, rules.echoSet', lim: '`cycle/climb-days.json`', val: '`cycle/climb-days.json`' };
    const BM = head(['Счётчик', 'Что считает', ...BL.cycles.map(c => `К концу цикла ${ROMAN[c]}: обычный / увлечённый`), 'Откуда темп']);
    for (const [k, M0] of Object.entries(ACH.BLOCK_METRICS)) BM.push(row([`\`${k}N\``, M0.n.replace('{c}', 'N'),
      ...BL.cycles.map(c => ['o', 'e'].map(pr => fmt(Math.floor(PR.val[pr][k + c][PR.cal[pr].end(c)] / 100))).join(' / ')), src[k] || '—']));
    tables.bmodel = BM.join('\n');
  }
  /* кривая: по дням, затем по неделям до конца цикла III, дальше — строками по curveMonth дней; номер дня — общий, цикл — у обычного */
  const byDay = pr => { const out = Array.from({ length: PR.cal[pr].H + 1 }, () => []); for (const a of model) if (a.at[pr] != null) out[a.at[pr]].push(a); return out; };
  const DAY = { o: byDay('o'), e: byDay('e') };
  {
    const names = l => l.map(a => a.n).join(', ') || '—';
    const T = head(['День', 'Цикл · день у обычного', 'Обычный', 'Что', 'Увлечённый', 'Что']);
    const span = (a, b) => { const go = [], ge = []; for (let d = a; d <= b; d++) { go.push(...DAY.o[d]); if (DAY.e[d]) ge.push(...DAY.e[d]); }
      T.push(row([a === b ? a : `${a}–${b}`, a === b ? dayTxt(a) : `${dayTxt(a)} — ${dayTxt(b)}`, go.length, names(go), ge.length, names(ge)])); };
    for (let d = 0; d <= CHECK.curveDaysShow; d++) span(d, d);
    const e3 = KO.end(3);
    for (let a = CHECK.curveDaysShow + 1; a <= e3; a += 7) span(a, Math.min(e3, a + 6));
    for (let a = e3 + 1; a <= H; a += CHECK.curveMonth) span(a, Math.min(H, a + CHECK.curveMonth - 1));
    const beyond = pr => model.filter(a => a.at[pr] == null);
    T.push(row(['дальше', 'за горизонтом', beyond('o').length, names(beyond('o')), beyond('e').length, names(beyond('e'))]));
    tables.curve = T.join('\n');
  }
  /* по циклам: сколько получено и редкость */
  {
    const T = head(['Цикл', 'Дней: обычный / увлечённый', 'Обычный: за цикл', 'из них из блоков', 'всего', 'Увлечённый: за цикл', 'из них из блоков', 'всего', 'Таинственные (оценка): обычный / увлечённый']);
    let so = 0, se = 0;
    for (let c = 1; c <= 6; c++) {
      const o = inC('o', c, model), e = inC('e', c, model); so += o.length; se += e.length;
      T.push(row([ROMAN[c], c === 1 ? '~4 ч' : `${KO.len[c]} / ${KE.len[c]}`, o.length, o.filter(a => a.c != null).length, so, e.length, e.filter(a => a.c != null).length, se, `${inC('o', c, myst).length} / ${inC('e', c, myst).length}`]));
    }
    T.push(row(['за горизонтом', '—', model.length - so, model.filter(a => a.at.o == null && a.c != null).length, model.length, model.length - se, model.filter(a => a.at.e == null && a.c != null).length, model.length, `${myst.filter(a => a.at.o == null).length} / ${myst.filter(a => a.at.e == null).length}`]));
    tables.cycles = T.join('\n');
    const R = head(['Редкость', 'Персональные', 'Возрождённые', 'Таинственные', 'Из них в блоках циклов', 'Как её получают вехи начала пути']);
    /* ступени редкости — PACE.rarDays: день обычного не позже ступени */
    const how = r => (r === 1 ? 'в обучении — цикл I' : r === 7 ? `позже ${P.rarDays[5]}-го дня, только у увлечённого или вне прогона` : `не позже ${P.rarDays[r - 1]}-го дня: ${dayTxt(P.rarDays[r - 1])}`);
    for (let r = 1; r <= 7; r++) R.push(row([RAR[r - 1], ...['pers', 'rev', 'myst'].map(c => list.filter(a => a.cat === c && a.r === r).length), blk.filter(a => a.r === r).length, how(r)]));
    tables.rarity = R.join('\n');
  }
  /* пассивки: потолки, каталог, к концу циклов */
  {
    const T = head(['Вид', 'Вехи начала пути: потолок', 'в каталоге', 'Блок цикла: потолок', 'Весь каталог', 'Обычный к концу II / III / IV / V / VI', 'Увлечённый', 'Для сравнения']);
    const cmp = { gold: 'артефакт «Кошель ловца» — +30 % на последнем уровне', spirit: 'артефакт «Чаша духа» — +60 %', key: 'артефакты-отмычки: 10 % → 25 % с босса', uniq: 'артефакт: 5 % → 14 %',
      shop: 'артефакт: 1 → 5 в день', lots: 'артефакт: 5 → 11', reroll: 'основа 3 + артефакт 2', lvl: 'Память: «Дух: цена уровней» до 10 %', ritual: 'Память: «Ритуалы: скорость» до 10 %',
      place: 'ресурс места — 60 % за этаж (`recipes.js`, resPerFloorBp)', find2: 'вторая находка — 20 % (`recipes.js`, secondFindBp)', summon: 'дух и золото за победу — `recipes.js`, craftBosses' };
    for (const [k, K] of Object.entries(kinds)) {
      const by = pr => [2, 3, 4, 5, 6].map(c => list.filter(a => a.pk === k && a.at[pr] != null && a.at[pr] <= PR.cal[pr].end(c)).reduce((s, a) => s + a.v, 0)).join(' / ');
      const s = kindSum[k] || { old: 0, all: 0 };
      T.push(row([K.n, K.cap || '—', s.old, K.blk || '—', s.all, by('o'), by('e'), cmp[k] || '—']));
    }
    tables.passives = T.join('\n');
  }
  /* сундуки: ожидаемое содержимое за достижения цикла против дохода цикла; цикл и его длина — по календарю профиля */
  {
    const ev = LBX.ev.wander, T = head(['Цикл', 'Профиль', 'Достижений', 'Сундуки по редкости', 'Золото', 'Дух', 'Прах', 'Ресурсы по цене рынка', 'Доля золота цикла', 'Доля духа цикла']);
    for (let c = 1; c <= 6; c++) for (const pr of ['o', 'e']) {
      const got = inC(pr, c, list), s = { gold: 0, spirit: 0, dust: 0, resGold: 0 }, box = {};
      for (const a of got) {
        const fr = featRows.find(r => r.label === cats.find(x => x.id === a.cat).label);
        for (const g of fr.cyc[c]) { const E = ev[c][g.win][g.r - 1]; for (const k of Object.keys(s)) s[k] += (E[k] || 0) * g.count; box[g.r] = (box[g.r] || 0) + g.count; }
      }
      const days = c === 1 ? 0 : PR.cal[pr].len[c];
      const incI = { gold: IN.cycleI.gold + IN.cycleI.accountGold, spirit: IN.cycleI.spirit + IN.cycleI.tutorialSpirit };   // биом 2 и награды обучения
      const inc = k => (c === 1 ? incI[k] * 100 : CAP.cycles[c][pr][k] * days);
      const share = k => `${x100(s[k] * 10000 / inc(k))} %`;
      T.push(row([ROMAN[c], pr === 'o' ? 'обычный' : 'увлечённый', got.length, Object.entries(box).map(([r, n]) => `${rarN(r)} ${n}`).join(', ') || '—',
        fmt(Math.round(s.gold / 100)), fmt(Math.round(s.spirit / 100)), fmt(Math.round(s.dust / 100)), fmt(Math.round(s.resGold / 100)), share('gold'), share('spirit')]));
    }
    tables.chests = T.join('\n');
  }
  /* правило ×1,7 */
  {
    const T = head(['Достижение', 'Счётчик', 'Обычный', 'Плательщик при времени обычного', 'Во сколько раз раньше', 'Чем ускоряет Энериум']);
    const why = { heroes: 'донатный сет: пять героев цикла', arena: 'обновления списка соперников — прогон Арены', shop: 'обновления лавки',
      league: `донатные герои: порог Лиги в ${AR.league.heroes} героев — раньше`, plank: 'очки недели плательщика — прогон События',
      lim: 'донатный сет раньше поднимает ступень развития — калькулятор подъёма', val: 'донатный сет раньше поднимает ступень развития — калькулятор подъёма' };
    const times = (o, p) => { const t = Math.round((o + 1) * 100 / (p + 1)); return `×${Math.floor(t / 100)},${String(t % 100).padStart(2, '0')}`; };
    for (const { a, p } of x17) T.push(row([a.n, `\`${a.m}\``, dayTxt(a.at.o), dayTxt(p), times(a.at.o, p), why[metrics[a.m].key || a.m] || '—']));
    tables.x17 = T.join('\n');
  }
  /* модель счётчиков вех: значение к концу цикла, обычный / увлечённый — у каждого свой календарь */
  {
    const T = head(['Счётчик', 'Что считает', 'К концу цикла I', 'II', 'III', 'IV', 'V', 'VI', 'Энериум ускоряет']);
    for (const m of Object.keys(metrics)) {
      if (!used.has(m) || metrics[m].c != null) continue;
      const cell = c => ['o', 'e'].map(pr => fmt(Math.floor(PR.val[pr][m][PR.cal[pr].end(c)] / 100))).join(' / ');
      T.push(row([`\`${m}\``, metrics[m].n, ...[1, 2, 3, 4, 5, 6].map(cell), metrics[m].en ? 'отчасти' : 'нет']));
    }
    tables.model = T.join('\n');
  }

  /* ---------- сводка ---------- */
  const cnt = (l, c) => l.filter(a => a.cat === c).length;
  log.push(`Достижения, вехи начала пути: персональных ${cnt(old, 'pers')}, возрождённых ${cnt(old, 'rev')}, таинственных ${cnt(old, 'myst')}; первенств ${firsts.length}.`);
  log.push('  Блоки циклов: ' + BL.cycles.map(c => { const own = blk.filter(a => a.c === c); return `${ROMAN[c]} — ${cnt(own, 'pers')} / ${cnt(own, 'rev')} / ${cnt(own, 'myst')}, гибких ступеней ${flexOf[c].length}`; }).join('; ') + ` — всего в каталоге ${list.length}.`);
  log.push('  Пассивки вех, сумма по видам: ' + Object.entries(kindSum).filter(([, s]) => s.old).map(([k, s]) => `${kinds[k].n} ${s.old}/${kinds[k].cap}`).join(', ') + '.');
  log.push(`  Кривая: обычный — ${[1, 2, 3, 4, 5, 6].map(c => `${ROMAN[c]}: ${inC('o', c, model).length}`).join(', ')}, за горизонтом ${model.filter(a => a.at.o == null).length}; увлечённый — ${[1, 2, 3, 4, 5, 6].map(c => `${ROMAN[c]}: ${inC('e', c, model).length}`).join(', ')}, за горизонтом ${model.filter(a => a.at.e == null).length}.`);
  log.push('  Паузы у обычного: ' + Object.entries(LAW.worst).map(([c, w]) => `${ROMAN[c]} — ${w[1] - w[0]} дн. при пороге ${P.curve.pause[c]}`).join(', ') + '.');
  log.push(`  Величин пассивок всего ${list.reduce((s, a) => s + a.v, 0)}; ×1,7 — худший случай ${x17.length ? x17.map(({ a, p }) => (a.at.o + 1) / (p + 1)).reduce((m, x) => Math.max(m, x), 1).toFixed(2) : '1,00'}.`);

  return { kinds: kindsOut, cats, groups, metrics: metricsOut, pace: paceOut, blocks: blocksOut, demo, demoBy, list, firsts, tables, log, PR, DAY, x17, law: LAW };
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
