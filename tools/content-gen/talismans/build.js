/* Духовные талисманы: GDD §26, §3.1, §5, §6, §21–§23, §25; ADR-0003, ADR-0010, ADR-0015, ADR-0017, ADR-0022, ADR-0023, ADR-0027.
   Черновик · предложение · ждёт автора. Все числа — демонстрация. Шансы и доли — в базисных пунктах: 10 000 = 100 %.

   Таблица автора source-data/Enerium_Талисманы_Финал.xlsx — исходный постулат (ADR-0003): оригинал не меняется, переработка —
   здесь, в разделе «ДАННЫЕ». Линейка — единица дизайна: один эффект на семи или меньше редкостях, номера строк автора сохраняются,
   чтобы сундуки (design/ui/lootboxes.js) и талисманы говорили об одном и том же предмете.

   Пишет:
   - design/ui/talismans.js — данные для прототипа (window.EN_TALISMANS), руками не править;
   - docs/content/талисманы.md — только таблицы: каждая между метками «<!-- @таблица имя -->» и «<!-- /таблица имя -->»;
     текст вокруг — ручной.
   Только читает: таблицу автора, design/ui/recipes.js (36 базовых для «Знаков сборщика»), design/ui/lootboxes.js (сундуки — для
   экономики и сверки пула), docs/lore/дайджест.md (спойлеры), tools/content-gen/abilities/library.json (порог «ниже 25 %»).
   Любая ошибка — файлы не пишутся. Пересборка даёт те же байты.
   Запуск: node tools/content-gen/talismans/build.js           — собрать и записать;
           node tools/content-gen/talismans/build.js --check   — только проверить, что файлы свежие.
   Из других скриптов: require('./build.js').build() — { data, tables, warn } без записи. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const { readSheet } = require('../lootboxes/xlsx');
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = {
  tal: path.join(ROOT, 'source-data', 'Enerium_Талисманы_Финал.xlsx'),
  prov: path.join(ROOT, 'source-data', 'provenance.json'),
  recipes: path.join(ROOT, 'design', 'ui', 'recipes.js'),
  loot: path.join(ROOT, 'design', 'ui', 'lootboxes.js'),
  lib: path.join(ROOT, 'tools', 'content-gen', 'abilities', 'library.json'),
  digest: path.join(ROOT, 'docs', 'lore', 'дайджест.md'),
  out: path.join(ROOT, 'design', 'ui', 'talismans.js'),
  doc: path.join(ROOT, 'docs', 'content', 'талисманы.md'),
};

/* ================================ ДАННЫЕ ================================ */

const RARITY = ['обычная', 'редкая', 'уникальная', 'эпическая', 'древняя', 'первородная', 'вневременная'];

/* Правила. Числа — демонстрация, их правит автор. */
const RULES = {
  bp: 10000,
  slots: 4,                     // §26: четыре места на героя
  freeFrom: 5,                  // §26: с древней редкости привязки к классу нет
  openCycle: 2,                 // талисманы приходят с кланами — цикл II, уровень 10 (§31, лутбоксы: клановый босс с цикла II)
  teamFrom: 6,                  // спойлерные линейки — только с цикла VI, как ресурсы цикла VI
  procLeft: 2,                  // прок держится 2 раунда: он бесплатный — сверх хода, а способность школы тратит ход и держится 4
  reforge: { need: 10, gold: [2500, 5000, 10000, 20000, 40000, 80000] },   // §22: 10 одной редкости → 1 редкостью выше; золото — за вход редкости 1…6
  /* БМ (§6, слой 2): БМ героя × √(УВС × ЭЗ) талисманов. Каждый боевой талисман прибавляет к УВС (off) или ЭЗ (def)
     долю своего значения — side и share в линейке; fix — постоянная прибавка в б. п. Охота, добыча и печати в БМ не входят:
     это контекстные множители (раса, режим) и защита от эффекта, которого может не быть (§6: «контекстные в БМ не входят») */
  bmNone: ['hunt', 'farm', 'seal'],
  cats: { fight: 'Боевые', hunt: 'Охотничьи', farm: 'Добыча', seal: 'Печати' },
  types: { line: 'сквозная линейка', proc: 'прок при атаке', unique: 'уникальный', seal: 'печать', collector: 'знак сборщика' },
  classes: { tank: 'танк', healer: 'лекарь', control: 'контроль', mage: 'маг ДД', str: 'физ ДД силы', agi: 'физ ДД ловкости', farmer: 'фармер' },
  /* класс героя в любом написании → ключ: «Танк», «Хилер», «Физ. ДД ловкости», «маг ДД», «контроль (на дебаффы)» */
  clsKey: { 'танк': 'tank', 'лекарь': 'healer', 'хилер': 'healer', 'контроль': 'control', 'дебаффер': 'control', 'маг дд': 'mage',
    'физ дд': 'str', 'физ дд силы': 'str', 'физ дд ловкости': 'agi', 'фармер': 'farmer', 'фармящий': 'farmer' },
  groups: { save: 'Спасение от смерти — одно на героя: второе место под спасение пустовало бы' },
  /* примитивы, которых в ядре прототипа ещё нет: их делает ядро на C#. Здесь — что каждый делает */
  needs: {
    dmgUp: 'прибавка урона с условием: способности, первые раунды, с раунда N, цель под баффом, ранг цели, раса цели — списком',
    takenDown: 'меньше получаемого урона с условием: массовые способности врага, раса атакующего',
    context: 'прибавка урона в режиме, биоме, неделе расы или по бестиарию: условие решает сервер при сборке боя и отдаёт ядру как dmgUp',
    procOnBasic: 'после попадания обычной атакой — бросок шанса и дебафф на цель: один стак, повтор обновляет длительность, контроля нет',
    immune: 'эффект из списка на героя не ложится: без броска, до иммунитета по рангу',
    healSplash: 'после лечения одной цели — бросок: второй самый раненый союзник получает долю лечения',
    debuffLeftCh: 'наложенный героем дебафф — бросок: на N раундов дольше',
    ctrlLeft: 'наложенный героем контроль держится на N раундов дольше; бросок иммунитета по рангу — как обычно',
    threatPct: 'множитель угрозы, которую создаёт герой, поверх классового',
    shieldDmg: 'часть удара, которую принял щит цели, сильнее',
    noHealer: 'прибавка урона, если в отряде нет лекаря: сервер проверяет отряд при сборке боя',
    loot: 'добыча вне боя: вес ресурса при выборе из 36 базовых, базовый ресурс с элиты',
    ritual: 'ритуалы: время ритуала с участием героя',
  },
};

/* Эффекты новой модели боя (§5.4): имя, что делает, ключ ядра, сила в б. п., имя в винительном падеже.
   Проки и печати таблицы автора писали прежними словами — здесь они переведены на 24 эффекта восьми наборов (ADR-0015). */
const EFF = {
  rend: ['засветка', '−30 % магической защиты', 'rend', 3000, 'засветку'],
  pierce: ['осыпание', '−30 % физической защиты', 'pierce', 3000, 'осыпание'],
  miss: ['слепота', '+50 % промахов', 'miss', 5000, 'слепоту'],
  mark: ['метка', '+20 % получаемого урона', 'mark', 2000, 'метку'],
  chanceDown: ['истечение', 'шансы способностей и ульты ×2/3', 'chanceDown', 3333, 'истечение'],
  slow: ['стужа', '−30 % скорости: цель ходит позже', 'slow', 3000, 'стужу'],
  bleed: ['кровотечение', 'урон в начале каждого её хода', 'bleed', 0, 'кровотечение'],
  weak: ['ослабление', '−25 % урона', 'weak', 2500, 'ослабление'],
  silence: ['запрет способностей', 'только обычная атака', 'silence', 0, 'запрет способностей'],
  stun: ['оглушение', 'пропуск хода', 'stun', 0, 'оглушение'],
  knock: ['сброс', 'пропуск хода и обнуление угрозы', 'knock', 0, 'сброс'],
  freeze: ['заморозка', 'пропуск хода, пока лёд цел', 'freeze', 0, 'заморозку'],
};

/* Расы охотничьих линеек. core — раса врага в ядре; team — спойлер: Перворождённых игрок не встречает раньше 11-го биома
   и в неделях Эхо их нет (дайджест, «Нельзя показывать раннему игроку»). «Демоны» — прежнее имя Перворождённых (§3.1). */
const RACES = [
  ['Аппаратов', 'apparat', 'Аппараты', 'аппараты', 'по аппаратам'],
  ['Демонов', 'firstborn', 'Перворождённые', 'Перворождённые', 'по Перворождённым', 6],
  ['Забытых', 'forgotten', 'Забытые', 'забытые', 'по забытым'],
  ['Зверей', 'beast', 'Звери', 'звери', 'по зверям'],
  ['Искажённых', 'twisted', 'Искажённые', 'искажённые', 'по искажённым'],
  ['Нежити', 'undead', 'Нежить', 'нежить', 'по нежити'],
  ['Саганов', 'sagan', 'Саганы', 'саганы', 'по саганам'],
  ['Этеров', 'eter', ['Люди', 'Эльфы', 'Дворфы'], 'этеры', 'по этерам — людям, эльфам и дворфам'],
];
const RACE_OF = { 'Демонов': 'Перворождённых', 'Аппаратов': 'Аппаратов', 'Забытых': 'Забытых', 'Зверей': 'Зверей', 'Искажённых': 'Искажённых', 'Нежити': 'Нежити', 'Саганов': 'Саганов', 'Этеров': 'Этеров' };
const FROM_OF = { 'Аппаратов': 'аппаратов', 'Демонов': 'Перворождённых', 'Забытых': 'забытых', 'Зверей': 'зверей', 'Искажённых': 'искажённых', 'Нежити': 'нежити', 'Саганов': 'саганов', 'Этеров': 'этеров — людей, эльфов и дворфов' };

/* Линейки. Ключ — «Семейство» таблицы автора, у единичных строк (уникальные, печати, знаки сборщика) — «Название».
   id — ключ данных; n — имя игроку (null — как у автора); cat — боевые / охотничьи / добыча / печати; type — вид;
   cls — классы, которым линейка доступна до древней редкости (null — всем); grp — группа «одно на героя»;
   ico — значок: имя ICON, cur:валюта, res:ресурс, svg:вектор; fx — эффект игроку, {v} — значение редкости;
   v — откуда значение: 'text' — первое число в тексте эффекта автора, 'text2' — второе, 'value' — колонка «Значение», массив — свой;
   lib — как эффект ложится в ядро прототипа: запись библиотеки (t, k, trig, data), vKey — поле под значение, vMul — множитель;
         src: 'avers' — расовая прибавка героя, src: 'actPct' — доля способностей в наборе героя;
   need — примитив, которого в ядре прототипа нет (RULES.needs); bm — [сторона, доля значения в б. п.] или [сторона, 'fix', б. п.];
   d — описание-лор игроку (null — как у автора); team — спойлер: с какого цикла линейка в пуле и видна игроку;
   note — что поправлено против таблицы автора и почему (только команде). */
const L = (key, id, o) => Object.assign({ key, id, n: null, cls: null, grp: null, v: 'text', lib: null, need: null, bm: null, d: null, team: 0, note: '' }, o);
const PROC_NOTE = 'Прок жил в прежнем бою со счётчиком атак. Эффект — из 24 эффектов восьми наборов (ADR-0015), держится 2 раунда. Шанс — из текста автора.';
const proc = (key, id, eff, ico, side, note) => L(key, id, { cat: 'fight', type: 'proc', ico, eff, need: 'procOnBasic', bm: [side, 3000],
  fx: `Обычная атака: {v} % шанс наложить на цель ${EFF[eff][4]} — ${EFF[eff][1]} — на ${RULES.procLeft} раунда`, note: note ? PROC_NOTE + ' ' + note : PROC_NOTE });
const seal = (name, id, eff, note) => L(name, id, { cat: 'seal', type: 'seal', ico: 'def-mag', eff, v: null, need: 'immune',
  fx: `Защита от эффекта «${EFF[eff][0]}»: он не ложится на героя`, note });
const FAMS = [
  /* ---------- боевые: сквозные линейки ---------- */
  L('Боевые: Багряная чаша', 'cup', { cat: 'fight', type: 'line', ico: 'hp', fx: 'Вампиризм: герой лечится на {v} % нанесённого урона',
    lib: { t: 'pas', k: 'passive', data: { pas: 'lifesteal' }, vKey: 'pct' }, bm: ['def', 5000],
    note: 'Значение — из текста: 5 % (в «Значении» — 4).' }),
  L('Боевые: Двойной родник', 'spring', { cat: 'fight', type: 'line', cls: ['healer'], ico: 'hp',
    fx: '{v} % шанс, что лечение героя заденет ещё одного раненого союзника на треть силы', need: 'healSplash', bm: ['off', 3300] }),
  L('Боевые: Иней разума', 'frost', { cat: 'fight', type: 'line', ico: 'def-mag', v: 'text2', fx: '{v} % шанс сразу сбросить дебафф, наложенный на героя',
    lib: { t: 'react', k: 'reaction', trig: 'debuffed', data: { cleanse: 1 }, vKey: 'ch', vMul: 100 }, bm: ['def', 1500],
    note: 'Было «каждые 10 своих атак»: в бою на 10 раундов герой ходит не больше 10 раз. Теперь ответ на сам дебафф — как «Чистый поток» Воды.' }),
  L('Боевые: Клятва несгибаемых', 'oath', { cat: 'fight', type: 'line', ico: 'def-mag', fx: '{v} % шанс стряхнуть контроль в начале своего хода',
    lib: { t: 'react', k: 'reaction', trig: 'ccd', data: { cleanseCtl: true }, vKey: 'ch', vMul: 100 }, bm: ['def', 2000],
    note: 'Было «проигнорировать входящий контроль»: в ядре так работает «Откат» Времени — контроль снимается в начале хода. Числа — из текста: 10/15/20 (в «Значении» — 12/17/25).' }),
  L('Боевые: Око Рэдмунда', 'eye', { cat: 'fight', type: 'line', cls: ['mage'], ico: 'matk', fx: 'Урон способностей героя +{v} %', need: 'dmgUp', bm: ['off', 4000],
    note: 'Привязка к маг ДД до древней — по роли: «руки чародея». У автора линейка свободна.' }),
  L('Боевые: Пальцы бездны', 'abyss', { cat: 'fight', type: 'line', ico: 'int', fx: '{v} % шанс, что дебафф героя продержится на раунд дольше', need: 'debuffLeftCh', bm: ['off', 1000],
    note: 'Длительность — в раундах, а не в атаках. Числа — из текста: 10/15/20 (в «Значении» — 12/17/25).' }),
  L('Боевые: Пепел мысли', 'ash', { cat: 'fight', type: 'line', ico: 'critdmg', fx: 'Критический урон героя +{v} %',
    lib: { t: 'pas', k: 'passive', data: { pas: 'critDmg' }, vKey: 'pct' }, bm: ['off', 1500],
    note: 'Было «критический урон способностей»: в ядре крит один для обычной атаки и способностей — как «Выучка».' }),
  L('Боевые: Пляска клинка', 'dance', { cat: 'fight', type: 'line', cls: ['str', 'agi'], ico: 'crit', fx: 'После крита следующий удар героя +{v} % урона',
    lib: { t: 'react', k: 'reaction', trig: 'crit', data: {}, vKey: 'nextPct' }, bm: ['off', 1500],
    note: '«Физ ДД» таблицы — оба физических ДД: силы и ловкости. В ядре — как «Кураж».' }),
  L('Боевые: Покров Пятерых', 'veil', { cat: 'fight', type: 'line', ico: 'def-mag', fx: 'Урон по герою от массовых способностей −{v} %', need: 'takenDown', bm: ['def', 3000] }),
  L('Боевые: Последняя жатва', 'reap', { cat: 'fight', type: 'line', cls: ['mage', 'str', 'agi'], ico: 'patk', fx: 'Урон героя по целям ниже 30 % здоровья +{v} %',
    lib: { t: 'pas', k: 'passive', data: { pas: 'dmgVsLow', belowPct: 30 }, vKey: 'pct' }, bm: ['off', 2500],
    note: 'Привязка к ДД до древней — по роли: добивание. У автора линейка свободна. В ядре — как «Хищник» с порогом 30 %.' }),
  L('Боевые: Поступь веков', 'ages', { cat: 'fight', type: 'line', ico: 'spd', fx: 'Урон героя с 6-го раунда боя +{v} %', need: 'dmgUp', bm: ['off', 5000],
    note: 'Было «после своей 20-й атаки в бою»: в бою 10 раундов 20-й атаки нет. Теперь — вторая половина боя. Числа — из текста: 10/15/20.' }),
  L('Боевые: Сердце Кароксорра', 'heart', { cat: 'fight', type: 'line', cls: ['tank'], ico: 'def-phys', fx: 'При ударе по герою {v} % шанс получить щит на 3 % здоровья',
    lib: { t: 'react', k: 'reaction', trig: 'hit', data: { shieldPct: 3 }, vKey: 'ch', vMul: 100 }, bm: ['def', 3000],
    note: 'Числа — из текста: 1/2/3/5/6/8/10 (в «Значении» — Половинная 1/1/2/4/6/8/12). В ядре — как «Каменная отдача».' }),
  L('Боевые: Слёзы Виала', 'tears', { cat: 'fight', type: 'line', cls: ['healer'], ico: 'hp', fx: 'Лечение героя +{v} %',
    lib: { t: 'pas', k: 'passive', data: { pas: 'healVsLow', belowPct: 100 }, vKey: 'pct' }, bm: ['off', 10000],
    note: 'В ядре — «Течение» с порогом 100 %: прибавка к лечению раненого, здорового лечить нечего.' }),
  L('Боевые: Шёпот сквозь сталь', 'whisper', { cat: 'fight', type: 'line', ico: 'int', v: [null, null, null, null, null, null, 1],
    fx: 'Контроль героя держится на {v} раунд дольше; иммунитет врага к контролю остаётся', need: 'ctrlLeft', bm: ['off', 'fix', 500],
    note: 'Было «игнорирует 10 % сопротивления контролю»: сопротивления в новой модели нет, есть иммунитет по рангу, и его талисман не режет (ADR-0022, выбор автора по ADR-0021).' }),
  L('Боевые: Первая кровь', 'firstblood', { cat: 'fight', type: 'line', cls: ['mage', 'str', 'agi'], ico: 'patk', fx: 'Урон героя в первые 3 раунда боя +{v} %', need: 'dmgUp', bm: ['off', 3000],
    note: 'Было «в первые 5 атак боя»: теперь — первые 3 раунда. Привязка к ДД до древней — по роли.' }),
  /* ---------- боевые: проки при обычной атаке (правило 2 автора: один стак, повтор обновляет длительность, контроля нет) ---------- */
  proc('Боевые: Игла расплетения', 'needle', 'rend', 'def-mag', 'off', 'Разрыв покрова → засветка Света.'),
  proc('Боевые: Клык камнееда', 'fang', 'pierce', 'def-phys', 'off', 'Пробитие брони → осыпание Земли.'),
  proc('Боевые: Пепел мотылька', 'moth', 'miss', 'eva', 'def'),
  proc('Боевые: Печать ловчего', 'hunter', 'mark', 'patk', 'off'),
  proc('Боевые: Свинцовый час', 'lead', 'chanceDown', 'int', 'def', 'Изнурение «цена ульты +50 %» → истечение Времени: цен в новой модели нет, есть шансы.'),
  proc('Боевые: Смола глубин', 'resin', 'slow', 'spd', 'def', 'Оцепенение «−30 % скорости атаки» → стужа Воды: своей скорости атаки нет, есть очередь хода.'),
  proc('Боевые: Шип багрового тёрна', 'thorn', 'bleed', 'hp', 'off'),
  proc('Боевые: Ярмо праха', 'yoke', 'weak', 'str', 'def'),
  /* ---------- боевые: уникальные ---------- */
  L('Волчья гордость', 'wolf', { cat: 'fight', type: 'unique', ico: 'patk', fx: 'Урон героя +{v} %, если в отряде нет лекаря', need: 'noHealer',
    note: 'Условие по составу отряда — в БМ не входит, как контекстное.' }),
  L('Щит павшего знаменосца', 'banner', { cat: 'fight', type: 'unique', ico: 'def-phys', fx: 'Первый удар по герою в бою — на {v} % слабее',
    lib: { t: 'react', k: 'reaction', trig: 'firstHit', data: {}, vKey: 'pct' }, bm: ['def', 1000], note: 'В ядре — как «Готовность».' }),
  L('Жало возмездия', 'sting', { cat: 'fight', type: 'unique', ico: 'patk', fx: 'При ударе по герою {v} % шанс ответить обычной атакой',
    lib: { t: 'react', k: 'reaction', trig: 'hit', data: { then: 'counter' }, vKey: 'ch', vMul: 100 }, bm: ['off', 3000],
    note: 'В ядре — как «Контрудар»; контрудар не вызывает контрудара.' }),
  L('Весы Армонта', 'scales', { cat: 'fight', type: 'unique', ico: 'patk', fx: 'Урон героя по врагам под баффом +{v} %', need: 'dmgUp', bm: ['off', 3000],
    note: 'У автора — охотничий. Здесь боевой: условие — состояние цели в бою, а не раса или режим, поэтому входит в БМ.' }),
  L('Плащ безымянного', 'cloak', { cat: 'fight', type: 'unique', ico: 'end', fx: 'Угроза героя −{v} %', need: 'threatPct',
    note: 'Меняет роль, а не силу — в БМ не входит.' }),
  L('Ярость загнанного зверя', 'rage', { cat: 'fight', type: 'unique', ico: 'patk', v: 'text2', fx: 'Ниже {low} % здоровья урон героя +{v} %',
    lib: { t: 'react', k: 'reaction', trig: 'low', data: {}, vKey: 'pct' }, bm: ['off', 1000], note: 'В ядре — как «Злость раненого»: порог — trigPct.low библиотеки.' }),
  L('Беглое слово', 'firstword', { cat: 'fight', type: 'unique', ico: 'spd', v: [null, null, null, null, null, 15, null],
    fx: 'Способности героя срабатывают чаще: их доля в ходе +{v} %', lib: { src: 'actPct', vKey: 'pct' }, bm: ['off', 3000],
    note: 'Было «первая способность ротации на атаку дешевле»: ротации и цен в атаках нет (ADR-0010). Теперь способности срабатывают чаще: доля способностей в наборе героя × 1,15.' }),
  L('Второе слово', 'secondword', { cat: 'fight', type: 'unique', ico: 'spd', v: [null, null, null, null, null, 20, null],
    fx: 'Ульта героя срабатывает чаще: её доля в ходе +{v} %', lib: { t: 'pas', k: 'passive', data: { pas: 'ultUp' }, vKey: 'pct' }, bm: ['off', 1000],
    note: 'Было «вторая способность ротации на атаку дешевле». Теперь — как «Неспешность» Времени, вдвое сильнее; действует, когда ульта открыта доблестью.' }),
  L('Уголёк этерния', 'ember', { cat: 'fight', type: 'unique', grp: 'save', ico: 'hp', v: null, fx: 'Раз за биом смертельный удар оставляет героя с 1 здоровья',
    lib: { t: 'react', k: 'reaction', trig: 'lethal', data: { survive: 1, once: 'biome' } }, bm: ['def', 'fix', 1000],
    note: 'Было «раз в бой»: спасение от смерти — раз за биом (ответ автора, ADR-0015).' }),
  L('Молот Стоун-Хейма', 'hammer', { cat: 'fight', type: 'unique', ico: 'str', v: [null, null, null, null, null, 50, null], fx: 'Урон героя по щитам +{v} %', need: 'shieldDmg',
    bm: ['off', 1000], note: '«×1,5» записано прибавкой +50 %. У автора — охотничий; здесь боевой, как «Весы Армонта».' }),
  L('Оковы Иридиум', 'chains', { n: 'Оковы непокорного', cat: 'fight', type: 'unique', ico: 'def-mag', fx: 'Контроль на героя не действует, но его урон −{v} %',
    d: 'Носящего оковы не согнёт ничья воля. И почти ничего не может сам.', need: 'immune', bm: [['off', 'fix', -5000], ['def', 'fix', 2000]],
    note: 'Имя и описание — спойлер: мать мира Иридиум. Новое имя и описание — решение по лутбоксам.' }),
  L('Печать архонта', 'archon', { cat: 'fight', type: 'unique', grp: 'save', ico: 'hp', fx: 'Раз за биом вместо гибели герой остаётся с {v} % здоровья',
    lib: { t: 'react', k: 'reaction', trig: 'lethal', data: { once: 'biome' }, vKey: 'survivePct' }, bm: ['def', 'fix', 2000],
    note: 'Было «раз в бой воскресает»: спасение — раз за биом. Спасения из двух талисманов не складываются — группа «одно на героя».' }),
  /* ---------- охотничьи ---------- */
  ...RACES.map(([gen, id, core, short, fxBy, team]) => L(`Охотничьи: Бич ${gen}`, 'bane_' + id, {
    n: team ? `Бич ${RACE_OF[gen]}` : null, cat: 'hunt', type: 'line', ico: 'patk', team: team || 0,
    fx: `Урон героя ${fxBy} +{v} %`, d: `Он знает, как умирают ${short}.`,
    lib: Array.isArray(core) ? null : { src: 'avers', race: core, vKey: 'bp', vMul: 100 }, need: Array.isArray(core) ? 'dmgUp' : null,
    note: [team ? 'Демоны — прежнее имя Перворождённых; их игрок не встречает раньше 11-го биома, в неделях Эхо их нет — линейка в пуле с цикла VI.' : '',
      Array.isArray(core) ? 'Этеры — три расы: поле неприязни ядра знает одну. Нужен список рас.' : 'В ядре — поле расовой неприязни героя: одна раса на героя, берётся сильнейшая.',
      'Описание исправлено: «умирают аппаратов» → «умирают аппараты».'].filter(Boolean).join(' ') })),
  ...RACES.map(([gen, id, core, short, fxBy, team]) => L(`Охотничьи: Оберег от ${gen}`, 'ward_' + id, {
    n: team ? `Оберег от ${RACE_OF[gen]}` : null, cat: 'hunt', type: 'line', ico: 'def-phys', team: team || 0,
    fx: `Урон по герою от ${FROM_OF[gen]} −{v} %`, need: 'takenDown',
    note: team ? 'Демоны — прежнее имя Перворождённых: линейка в пуле с цикла VI.' : '' })),
  L('Охотничьи: Гроза вожаков', 'chief', { cat: 'hunt', type: 'line', ico: 'patk', fx: 'Урон героя по элитам +{v} % — и по элитам кланового босса', need: 'dmgUp',
    note: 'Числа — из текста: 1/3/5/8/10/15/20 (в «Значении» — Основная).' }),
  L('Охотничьи: Погибель владык', 'lords', { cat: 'hunt', type: 'line', ico: 'patk', fx: 'Урон героя по боссам всех рангов +{v} %', need: 'dmgUp' }),
  L('Охотничьи: Серп жнеца', 'scythe', { cat: 'hunt', type: 'line', ico: 'patk', fx: 'Урон героя по рядовым врагам +{v} %', need: 'dmgUp' }),
  L('Альманах ловчего', 'almanac', { cat: 'hunt', type: 'unique', ico: 'patk', fx: 'Урон героя по расе текущей недели +{v} %', need: 'context', note: 'Число — из текста: 10 (в «Значении» — 12).' }),
  L('Знамя штурма', 'assault', { cat: 'hunt', type: 'unique', ico: 'patk', fx: 'Урон героя по клановому боссу и его элитам +{v} %', need: 'context' }),
  L('Флейта крысолова', 'flute', { cat: 'hunt', type: 'unique', ico: 'patk', fx: 'Урон героя по врагам Заброшенной дороги +{v} %', need: 'context',
    note: 'Заброшенная дорога — крафтовый биом цикла I (ресурсы-рецепты-дроп.md).' }),
  L('Дневник Коллекционера', 'diary', { cat: 'hunt', type: 'unique', ico: 'int', v: 'text2',
    fx: 'Урон героя по расе +1 % за каждую изученную карточку этой расы в бестиарии — до +{v} %', need: 'context',
    d: 'Коллекционер записывал всё. Записи убивают.', note: 'Описание — спойлер: «марионетка Этриона». Новое описание — решение по лутбоксам.' }),
  L('Трофей королей', 'trophy', { cat: 'hunt', type: 'unique', ico: 'patk', fx: 'Урон героя по Убер-боссам и клановым боссам +{v} %', need: 'dmgUp',
    note: 'Число — из текста: 20 (в «Значении» — 18).' }),
  L('Тропа Елиаса', 'path', { cat: 'hunt', type: 'unique', ico: 'patk', fx: 'Урон героя в биомах его цикла +{v} %', need: 'context',
    note: '«Биомы своего цикла» поняты как биомы цикла героя.' }),
  L('Ловец эха', 'echo', { cat: 'hunt', type: 'unique', ico: 'patk', fx: 'Урон героя в Эхо +{v} %', need: 'context' }),
  /* ---------- добыча ---------- */
  L('Фарм: Золотая жила', 'vein', { n: 'Золотая пыль', cat: 'farm', type: 'line', ico: 'cur:gold', fx: 'Золото отряда +{v} %',
    lib: { t: 'pas', k: 'farm', data: {}, vKey: 'gold', vMul: 100 },
    note: 'Имя «Золотая жила» уже носит ульта фарм-набора (золото этажа ×3): новое имя — из описания. Числа — из текста: 5/8/10/15/20.' }),
  L('Фарм: Сосуд шёпотов', 'vessel', { cat: 'farm', type: 'line', ico: 'cur:spirit', fx: 'Дух отряда +{v} %', lib: { t: 'pas', k: 'farm', data: {}, vKey: 'spirit', vMul: 100 } }),
  L('Фарм: Тропа душ', 'soulpath', { cat: 'farm', type: 'line', ico: 'cur:souls', fx: 'Души с каждой элиты +{v} — там, где души положены',
    lib: { t: 'pas', k: 'farm', data: {}, vKey: 'souls.e' }, note: 'Было «+N душ отряду героя» без основания: понято как с каждой элиты — как «Ловец душ».' }),
  L('Фарм: Чутьё сороки', 'magpie', { cat: 'farm', type: 'line', ico: 'svg:gem', fx: 'Шанс уникального ресурса босса +{v} %',
    lib: { t: 'pas', k: 'farm', data: {}, vKey: 'uniqueAdd', vMul: 100 }, note: 'Число — из текста: 5 (в «Значении» — 6).' }),
  L('Фарм: Кадильница предков', 'censer', { cat: 'farm', type: 'line', ico: 'svg:hour', fx: 'Ритуалы с героем короче на {v} %; все ускорения — не больше 50 %', need: 'ritual',
    note: 'Числа — из текста: 1/2/3/4/5.' }),
  L('Мешок трофейщика', 'bag', { cat: 'farm', type: 'unique', ico: 'svg:gem', fx: 'Базовые ресурсы с каждой элиты +{v}', need: 'loot' }),
  L('Монета парома', 'coin', { cat: 'farm', type: 'unique', ico: 'cur:souls', fx: 'Души с каждой элиты +{v}', lib: { t: 'pas', k: 'farm', data: {}, vKey: 'souls.e' } }),
  L('Сеть душелова', 'net', { cat: 'farm', type: 'unique', ico: 'cur:souls', fx: 'Души с каждого босса биома +{v}', lib: { t: 'pas', k: 'farm', data: {}, vKey: 'souls.b' },
    note: 'Число — из текста: 5 (в «Значении» — 2).' }),
  L('Жнец этерния', 'reaper', { cat: 'farm', type: 'unique', ico: 'cur:souls', fx: 'Души с каждого босса +{v} и с каждой элиты +1',
    lib: { t: 'pas', k: 'farm', data: { souls: { e: 1 } }, vKey: 'souls.b' }, note: 'В ядре — как «Ловец душ».' }),
  /* ---------- печати: разные печати складываются (правило 1 автора) ---------- */
  seal('Печать быстрой крови', 'seal_slow', 'slow', 'Оцепенение → стужа.'),
  seal('Печать лёгкого бремени', 'seal_drain', 'chanceDown', 'Изнурение → истечение.'),
  seal('Печать нерушимой длани', 'seal_weak', 'weak'),
  seal('Печать сомкнутых ран', 'seal_bleed', 'bleed'),
  seal('Печать стёртого следа', 'seal_mark', 'mark'),
  seal('Печать сшитого покрова', 'seal_rend', 'rend', 'Разрыв покрова → засветка.'),
  seal('Печать цельной брони', 'seal_pierce', 'pierce', 'Пробитие брони → осыпание.'),
  seal('Печать ясного ока', 'seal_miss', 'miss'),
  seal('Печать несказанного слова', 'seal_silence', 'silence', 'Безмолвие → запрет способностей.'),
  seal('Печать неспящего', 'seal_stun', 'stun', 'Стан → оглушение.'),
  seal('Печать твёрдого счёта', 'seal_knock', 'knock', 'Смятения в новой модели нет. «Счёт ударов» — угроза: печать защищает от сброса, который её обнуляет.'),
  seal('Печать тёплого сердца', 'seal_freeze', 'freeze'),
];
/* Знаки сборщика: 36 обычных, по одному на базовый ресурс общего пула (ADR-0023, п. 1) — линейка на каждый ресурс */
const COLLECTOR = { prefix: 'Знак сборщика: ', ico: 'res', need: 'loot', fx: 'Когда падает базовый ресурс, «{res}» выпадает на {v} % чаще',
  note: 'Вес этого ресурса при выборе из 36 базовых +25 %: с одним знаком шанс именно его — 3,4 % вместо 2,8 %.' };

/* Экономика: откуда игрок берёт талисманы. Сундуки и их выплаты — design/ui/lootboxes.js, здесь — только допущения. */
const ECON = {
  cycles: [2, 3, 4, 5, 6],
  weeks: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3 },   // цикл II — 14 дней (автор, ADR-0021); III — 21 день, допущение sets.py; IV–VI — по образцу III, как echo.py
  who: ['free', 'fan'], whoName: { free: 'обычный', fan: 'увлечённый' },
  squad: 20,                                 // мест у отряда: 5 героев × 4
  craftFrom: 4,                              // талисманы в сундуке крафтового босса — с цикла IV (лутбоксы.md)
};

/* ================================ СБОРКА ================================ */

function build() {
  const err = [], warn = [];
  const isInt = x => Number.isInteger(x);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(FILES.tal)).digest('hex');
  const prov = JSON.parse(fs.readFileSync(FILES.prov, 'utf8')).find(x => x.file === path.basename(FILES.tal));
  if (!prov) err.push('provenance.json: нет записи о таблице талисманов');
  else if (prov.sha256 !== sha) err.push('таблица автора изменилась: хеш не тот, что в provenance.json — сверить правки, потом обновить хеш');

  /* --- таблица автора --- */
  const rows = readSheet(FILES.tal, 'Талисманы'), H = rows[0];
  const col = n => { const i = H.indexOf(n); if (i < 0) err.push(`таблица автора: нет столбца «${n}»`); return i; };
  const C = Object.fromEntries(['№', 'Категория', 'Тип', 'Редкость', 'Название', 'Привязка', 'Линейка значений', 'Значение', 'Эффект', 'Сила влияния', 'Вес (авто)', 'Семейство', 'Описание'].map(n => [n, col(n)]));
  const author = [];
  for (const row of rows.slice(1)) {
    if (!row[C['№']]) continue;
    const r = RARITY.indexOf(String(row[C['Редкость']]).toLowerCase()) + 1, no = +row[C['№']], w = +row[C['Вес (авто)']];
    if (r < 1) { err.push(`№${no}: редкость «${row[C['Редкость']]}»`); continue; }
    if (!isInt(no) || !isInt(w) || w < 1) { err.push(`№${no}: номер или вес не целые`); continue; }
    const fam = row[C['Семейство']], single = fam === '—' || fam === 'Иммунитеты: печати' || fam === 'Фарм: сборщики';
    author.push({ no, r, w, key: single ? row[C['Название']] : fam, name: row[C['Название']], cat: row[C['Категория']], type: row[C['Тип']],
      bind: row[C['Привязка']], line: row[C['Линейка значений']], value: row[C['Значение']], fx: row[C['Эффект']], desc: row[C['Описание']] });
  }
  const seenNo = new Set(); for (const a of author) { if (seenNo.has(a.no)) err.push(`№${a.no} дважды`); seenNo.add(a.no); }

  /* --- 36 базовых для знаков сборщика --- */
  const rctx = { window: {} }; rctx.window = rctx; vm.createContext(rctx); vm.runInContext(fs.readFileSync(FILES.recipes, 'utf8'), rctx);
  const POOL = rctx.EN_RECIPES.items.filter(i => i.pool);
  const poolByName = Object.fromEntries(POOL.map(i => [i.n.toLowerCase(), i]));

  /* --- порог «ниже 25 %» из библиотеки: у «Ярости загнанного зверя» он общий с «Злостью раненого» --- */
  const LIB = JSON.parse(fs.readFileSync(FILES.lib, 'utf8'));
  const low = LIB.rules && LIB.rules.trigPct ? LIB.rules.trigPct.low : null;
  if (low == null) err.push('library.json: нет rules.trigPct.low');

  /* --- линейки --- */
  const specs = FAMS.slice();
  for (const a of author) if (a.key.startsWith(COLLECTOR.prefix) && !specs.some(s => s.key === a.key)) {
    const res = a.key.slice(COLLECTOR.prefix.length), it = poolByName[res.toLowerCase()];
    if (!it) { err.push(`${a.key}: такого базового ресурса нет в общем пуле recipes.js`); continue; }
    specs.push(L(a.key, 'mark_' + it.id, { cat: 'farm', type: 'collector', ico: 'res:' + it.id, fx: COLLECTOR.fx.replace('{res}', it.n.toLowerCase()), need: COLLECTOR.need, note: COLLECTOR.note, res: it.id }));
  }
  const byKey = Object.fromEntries(specs.map(s => [s.key, s]));
  const ids = new Set(); for (const s of specs) { if (ids.has(s.id)) err.push(`линейка ${s.id} дважды`); ids.add(s.id); }
  const numsOf = t => [...String(t).matchAll(/\d+(?:[.,]\d+)?/g)].map(m => +m[0].replace(',', '.'));
  const fams = {}, items = {}, diffs = [];
  for (const s of specs) {
    const own = author.filter(a => a.key === s.key);
    if (!own.length) { err.push(`линейка ${s.id} «${s.key}»: в таблице автора нет строк`); continue; }
    const f = { n: s.n || own[0].name.replace(/^Знак сборщика: /, 'Знак сборщика: '), cat: s.cat, type: s.type, cls: s.cls, grp: s.grp, ico: s.ico,
      fx: s.fx.replace('{low}', low), d: s.d || own[0].desc, v: Array(7).fill(null), w: Array(7).fill(null), no: Array(7).fill(null),
      lib: s.lib, need: s.need, bm: s.bm, team: s.team, eff: s.eff ? EFF[s.eff][2] : null, pow: s.eff ? EFF[s.eff][3] : null,
      left: s.type === 'proc' ? RULES.procLeft : null, res: s.res || null, old: own[0].fx, note: s.note || '' };
    if (s.n && own[0].name !== s.n && !s.key.startsWith('Охотничьи:') && !s.key.startsWith('Фарм:')) f.was = own[0].name;
    if (s.n && (s.key.startsWith('Охотничьи:') || s.key.startsWith('Фарм:'))) f.was = own[0].name;
    for (const a of own) {
      const i = a.r - 1;
      if (f.no[i] != null) { err.push(`${s.id}: две строки редкости ${a.r}`); continue; }
      let v = null;
      if (Array.isArray(s.v)) v = s.v[i];
      else if (s.v === 'text') v = numsOf(a.fx)[0];
      else if (s.v === 'text2') v = numsOf(a.fx)[1];
      else if (s.v === 'value') v = +a.value;
      if (s.v != null && !(isInt(v) && v > 0)) err.push(`${s.id} №${a.no}: значение «${v}» не целое положительное`);
      const val = +a.value;
      if (v != null && isInt(val) && val !== v && s.v !== 'value' && !Array.isArray(s.v)) diffs.push([s.id, a.r, v, val]);
      f.v[i] = s.v == null ? null : v; f.w[i] = a.w; f.no[i] = a.no;
      items[a.no] = [s.id, a.r];
    }
    const vs = f.v.filter(x => x != null);
    for (let k = 1; k < vs.length; k++) if (vs[k] < vs[k - 1]) err.push(`${s.id}: значения убывают с редкостью — ${vs.join('/')}`);
    if (s.cls) for (const c of s.cls) if (!RULES.classes[c]) err.push(`${s.id}: класс ${c} не из RULES.classes`);
    if (s.lib && s.need) err.push(`${s.id}: и запись ядра, и недостающий примитив`);
    if (!s.lib && !s.need) err.push(`${s.id}: ни записи ядра, ни примитива`);
    if (s.need && !RULES.needs[s.need]) err.push(`${s.id}: примитив ${s.need} не описан в RULES.needs`);
    if (s.bm && RULES.bmNone.includes(s.cat)) err.push(`${s.id}: ${RULES.cats[s.cat]} в БМ не входят`);
    if (/\{v\}/.test(f.fx) !== (s.v != null)) err.push(`${s.id}: в тексте эффекта {v} ${s.v != null ? 'нет' : 'лишний'}`);
    fams[s.id] = f;
  }
  for (const a of author) if (!byKey[a.key]) err.push(`№${a.no} «${a.name}»: нет линейки в разделе ДАННЫЕ (ключ «${a.key}»)`);
  /* привязка таблицы автора — строки «(до Древней)» — должна остаться в нашей */
  for (const a of author) if (a.bind && a.bind !== '—') {
    const f = fams[items[a.no] && items[a.no][0]], want = { 'Хилер': ['healer'], 'Танк': ['tank'], 'Физ ДД': ['str', 'agi'] }[a.bind.replace(/\s*\(.*\)$/, '')];
    if (!f || !want || !f.cls || want.some(c => !f.cls.includes(c))) err.push(`№${a.no}: привязка автора «${a.bind}» потеряна`);
  }

  /* --- спойлеры: имена и описания игроку — по разделу дайджеста «Нельзя показывать раннему игроку» --- */
  const dig = fs.readFileSync(FILES.digest, 'utf8').replace(/\r\n/g, '\n'), di = dig.indexOf('## Нельзя показывать раннему игроку');
  if (di < 0) err.push('дайджест: нет раздела «Нельзя показывать раннему игроку»');
  const STEMS = [['иридиум', 'мать мира Иридиум'], ['марионетк', 'марионетки Этриона'], ['эуклид', 'Эуклид'], ['оболочк', 'Оболочка'], ['колыбел', 'сломанные колыбели'],
    ['перворожд', 'Перворождённые раньше 11-го биома'], ['демон', 'Демоны — прежнее имя Перворождённых']];
  for (const [id, f] of Object.entries(fams)) {
    const txt = `${f.n} ${f.d} ${f.fx}`.toLowerCase(), hit = STEMS.filter(([st]) => txt.includes(st));
    if (hit.length && !f.team) err.push(`${id} «${f.n}»: спойлер (${hit.map(h => h[1]).join('; ')}) без пометки team`);
  }

  /* --- сверка с сундуками: номер, редкость и вес каждого талисмана пула design/ui/lootboxes.js --- */
  const lctx = { console }; lctx.window = lctx; vm.createContext(lctx); vm.runInContext(fs.readFileSync(FILES.loot, 'utf8'), lctx);
  const LB = lctx.EN_LOOTBOXES, EnLoot = lctx.EnLoot, teamGap = [];
  for (const [r, list] of Object.entries(LB.pools.tal)) for (const [no, w, team] of list) {
    const it = items[no];
    if (!it) { err.push(`lootboxes.js: талисмана №${no} нет в талисманах`); continue; }
    const f = fams[it[0]];
    if (it[1] !== +r || f.w[it[1] - 1] !== w) err.push(`lootboxes.js: №${no} — редкость ${r} и вес ${w}, у талисманов — ${it[1]} и ${f.w[it[1] - 1]}`);
    if (!!team !== !!f.team) teamGap.push([no, f.n, !!team, !!f.team]);
  }
  if (Object.keys(items).length !== Object.values(LB.pools.tal).reduce((a, l) => a + l.length, 0)) err.push('lootboxes.js: в пуле сундуков другое число талисманов');
  if (teamGap.length) warn.push(`пометка «для команды» в сундуках и у талисманов разошлась у ${teamGap.length} талисманов: ${[...new Set(teamGap.map(x => x[1]))].join(', ')} — пересобрать лутбоксы: tools/content-gen/lootboxes/build.js`);

  /* --- экономика: талисманов в неделю у обычного и увлечённого игрока, точно по окнам сундуков --- */
  const X = 10000;   // ожидаемое — в десятитысячных долях талисмана, целые
  const expect = (spec, count) => {   // ожидаемые талисманы по редкостям от count сундуков
    const def = EnLoot.resolve(LB, spec), out = Array(7).fill(0), bpSum = def.window.reduce((a, x) => a + x[1], 0);
    for (const [x, bp] of def.window) {
      const lines = def.byR[x] || [], W = lines.reduce((a, l) => a + l.w, 0), tal = lines.find(l => l.line === 'tal');
      if (!tal || !W) continue;
      const num = count * def.n * bp * tal.w * X, den = bpSum * W;
      if (num % den) err.push(`экономика: доля ${spec.box} ${spec.r} не делится нацело`);
      out[x - 1] += num / den;
    }
    return out;
  };
  const clan = LB.modes.clan, craft = LB.modes.craft, econ = { rows: [], weeks: ECON.weeks, squad: ECON.squad };
  const addTo = (a, b) => a.map((x, i) => x + b[i]);
  const cum = { free: Array(7).fill(0), fan: Array(7).fill(0) };
  for (const c of ECON.cycles) {
    const row = { c, weeks: ECON.weeks[c] };
    for (const who of ECON.who) {
      let wk = Array(7).fill(0);
      const top = clan.typical[who].clanTop, layer = clan.layers.find(l => l.id === 'clanTop'), cr = layer.rows.find(x => x.top === top);
      for (const ch of (cr && cr.cyc[c]) || []) wk = addTo(wk, expect({ box: clan.box, r: ch.r, win: ch.win, cyc: c }, ch.count));
      if (c >= ECON.craftFrom) {
        const boss = craft.layers[0].rows.find(x => x.cyc[c] && !/пробужд/.test(x.label));
        const kills = LB.assume.craftKills[who];
        if (boss) for (const ch of boss.cyc[c]) wk = addTo(wk, expect({ box: craft.box, r: ch.r, win: ch.win, cyc: c }, ch.count * kills));
      }
      const per = wk.map(x => x * ECON.weeks[c]);
      cum[who] = addTo(cum[who], per);
      row[who] = { week: wk, cycle: per, cum: cum[who].slice() };
    }
    econ.rows.push(row);
  }

  /* --- данные прототипа --- */
  const counts = {};
  for (const [no, [id, r]] of Object.entries(items)) { const f = fams[id], k = r; counts[k] = counts[k] || { n: 0, w: 0, fight: 0, hunt: 0, farm: 0, seal: 0, core: 0 }; counts[k].n++; counts[k].w += f.w[r - 1]; counts[k][f.cat]++; if (f.lib) counts[k].core++; }
  const data = {
    meta: { source: 'source-data/Enerium_Талисманы_Финал.xlsx', sha256: sha, builder: 'tools/content-gen/talismans/build.js', items: Object.keys(items).length, fams: Object.keys(fams).length },
    rules: Object.assign({}, RULES, { rarity: RARITY, eff: Object.fromEntries(Object.entries(EFF).map(([k, e]) => [k, { n: e[0], d: e[1] }])), low }),
    fams, items, counts,
    econ: { weeks: econ.weeks, squad: econ.squad, x: X, rows: econ.rows.map(r => ({ c: r.c, weeks: r.weeks, free: r.free, fan: r.fan })) },
  };

  /* --- таблицы документа: каждая — между метками «<!-- @таблица имя -->» и «<!-- /таблица имя -->» --- */
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const dec = (x, d = 1) => { const p = 10 ** d, v = Math.round(x * p / X) / p; return String(v).replace('.', ','); };
  const TBL = {};
  let T = [];
  T.push('| Редкость | Талисманов | Боевые | Охотничьи | Добыча | Печати | Сумма весов | Работают в бою прототипа |', '|---|---|---|---|---|---|---|---|');
  let tot = { n: 0, w: 0, fight: 0, hunt: 0, farm: 0, seal: 0, core: 0 };
  for (let r = 1; r <= 7; r++) { const k = counts[r]; T.push(`| ${RARITY[r - 1]} | ${k.n} | ${k.fight} | ${k.hunt} | ${k.farm} | ${k.seal} | ${fmt(k.w)} | ${k.core} |`); for (const x of Object.keys(tot)) tot[x] += k[x]; }
  T.push(`| **всего** | **${tot.n}** | ${tot.fight} | ${tot.hunt} | ${tot.farm} | ${tot.seal} | ${fmt(tot.w)} | ${tot.core} |`);
  TBL.pool = T.join('\n');
  const vals = f => f.v.map((x, i) => f.no[i] == null ? '—' : x == null ? '✓' : x).join(' / ');
  const clsTxt = f => f.cls ? f.cls.map(c => RULES.classes[c]).join(', ') : 'все';
  const coreTxt = f => f.lib ? (f.lib.src === 'avers' ? 'да: расовая прибавка' : f.lib.src === 'actPct' ? 'да: доля способностей' : 'да') : 'нет: `' + f.need + '`';
  const bmTxt = f => !f.bm ? '—' : (Array.isArray(f.bm[0]) ? f.bm : [f.bm]).map(b => `${b[0] === 'off' ? 'УВС' : 'ЭЗ'} ${b[1] === 'fix' ? (b[2] > 0 ? '+' : '−') + dec(Math.abs(b[2]) * X / 100, 0) + ' %' : '× ' + dec(b[1] * X / 10000, 2)}`).join(', ');
  const famRow = (id, f) => `| ${f.team ? f.n + ' · с цикла VI' : f.n} | ${RULES.types[f.type]} | ${vals(f)} | ${clsTxt(f)} | ${f.fx.replace(/\{v\}/g, 'N')} | ${coreTxt(f)} | ${bmTxt(f)} |`;
  for (const cat of ['fight', 'hunt', 'farm', 'seal']) {
    T = ['| Линейка | Вид | Значения | До древней — классу | Эффект | В бою прототипа | БМ |', '|---|---|---|---|---|---|---|'];
    const list = Object.entries(fams).filter(([, f]) => f.cat === cat);
    const marks = list.filter(([, f]) => f.type === 'collector');
    for (const [id, f] of list.filter(([, f]) => f.type !== 'collector')) T.push(famRow(id, f));
    if (marks.length) T.push(`| Знак сборщика × ${marks.length} — по одному на базовый ресурс | ${RULES.types.collector} | ${vals(marks[0][1])} | все | ${COLLECTOR.fx.replace('{res}', 'ресурс').replace('{v}', 'N')} | нет: \`loot\` | — |`);
    TBL[cat] = T.join('\n');
  }
  T = ['| Линейка | В тексте — взято | В «Значении» |', '|---|---|---|'];
  for (const id of [...new Set(diffs.map(d => d[0]))]) { const f = fams[id], col = f.no.map(no => no == null ? '—' : (author.find(a => a.no === no) || {}).value); T.push(`| ${f.n} | ${vals(f)} | ${col.join(' / ')} |`); }
  TBL.values = T.join('\n');
  const sum = a => a.reduce((x, y) => x + y, 0);
  T = ['| Цикл | Недель | В неделю: обычный / увлечённый | За цикл | К концу цикла | Отрядов по 20 мест к концу цикла |', '|---|---|---|---|---|---|'];
  for (const r of econ.rows) T.push(`| ${ROMAN(r.c)} | ${r.weeks} | ${dec(sum(r.free.week))} / ${dec(sum(r.fan.week))} | ${dec(sum(r.free.cycle))} / ${dec(sum(r.fan.cycle))} | ${dec(sum(r.free.cum))} / ${dec(sum(r.fan.cum))} | ${dec(sum(r.free.cum) / ECON.squad)} / ${dec(sum(r.fan.cum) / ECON.squad)} |`);
  TBL.econ = T.join('\n');
  T = [`| Цикл | ${RARITY.join(' | ')} |`, `|---|${RARITY.map(() => '---').join('|')}|`];
  for (const r of econ.rows) T.push(`| ${ROMAN(r.c)} | ${r.free.cum.map((x, i) => `${dec(x)} / ${dec(r.fan.cum[i])}`).join(' | ')} |`);
  TBL.rarity = T.join('\n');
  return { data, tables: TBL, warn, err, diffs };
}
function ROMAN(c) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][c]; }

/* ================================ ВЫВОД ================================ */

function render(data) {
  const head = `/* Духовные талисманы — данные прототипа. Собирает tools/content-gen/talismans/build.js из таблицы автора
   source-data/Enerium_Талисманы_Финал.xlsx и раздела «ДАННЫЕ» сборщика. Руками не править: пересборка затрёт правку.
   Числа — демонстрация, только целые; доли — в базисных пунктах. В игре талисманы, их эффекты и перековку решает сервер. */\n`;
  return head + 'window.EN_TALISMANS = ' + JSON.stringify(data) + ';\n';
}
/* таблицы в документе: «<!-- @таблица имя -->» … «<!-- /таблица имя -->»; нет хоть одной пары меток — null */
const markA = k => `<!-- @таблица ${k} — вывод tools/content-gen/talismans/build.js, руками не править -->`, markB = k => `<!-- /таблица ${k} -->`;
function withTables(doc, tables) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n';
  for (const [k, t] of Object.entries(tables)) {
    const a = doc.indexOf(markA(k)), b = doc.indexOf(markB(k));
    if (a < 0 || b < a) return null;
    doc = doc.slice(0, a + markA(k).length) + nl + nl + t.replace(/\n/g, nl) + nl + nl + doc.slice(b);
  }
  return doc;
}

module.exports = { build, render, withTables, markA, markB, FILES };

if (require.main === module) {
  const R = build();
  for (const w of R.warn) console.log('предупреждение: ' + w);
  if (R.err.length) { console.log('ОШИБКИ:\n' + R.err.join('\n')); process.exit(1); }
  const js = render(R.data);
  const docOld = fs.existsSync(FILES.doc) ? fs.readFileSync(FILES.doc, 'utf8') : null;
  const docNew = docOld ? withTables(docOld, R.tables) : null;
  if (process.argv.includes('--check')) {
    const okJs = fs.existsSync(FILES.out) && fs.readFileSync(FILES.out, 'utf8') === js, okDoc = !docOld || docNew === docOld;
    console.log(okJs && okDoc ? 'Свежие: talismans.js и таблицы документа совпадают со сборкой.' : `Устарели: ${[!okJs && 'design/ui/talismans.js', !okDoc && 'docs/content/талисманы.md'].filter(Boolean).join(', ')} — пересобрать.`);
    process.exit(okJs && okDoc ? 0 : 1);
  }
  fs.writeFileSync(FILES.out, js);
  if (docNew) fs.writeFileSync(FILES.doc, docNew);
  else console.log(`предупреждение: в ${path.relative(ROOT, FILES.doc)} нет меток таблиц — таблицы не вставлены`);
  const c = R.data.counts, n = Object.values(c).reduce((a, x) => a + x.n, 0);
  console.log(`Собрано: ${n} талисманов, ${Object.keys(R.data.fams).length} линеек, в бою прототипа работают ${Object.values(c).reduce((a, x) => a + x.core, 0)}; расхождений числа в тексте и «Значении» — ${R.diffs.length}.`);
}
