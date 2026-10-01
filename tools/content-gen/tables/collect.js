/* Таблицы Excel из данных игры — сборка содержимого. Вызывает tools/content-gen/tables/build.py: этот скрипт читает данные
   игры и печатает в stdout JSON со всеми книгами, листами, столбцами и строками; build.py пишет .xlsx и следит за свежестью.
   Данные игры — правда: таблицы показывают игру как она есть. Править — в исходниках (сборщики tools/content-gen/*), не в таблицах.
   Только читает: design/ui/*.js (данные прототипа), tools/content-gen/abilities/library.json и kits.json,
   tools/content-gen/clan/foes.js, docs/content/враги-биомов.md (враги биомов 5–12 — черновик), tools/content-gen/tables/renames-*.json,
   лестница спойлеров tools/content-gen/lore/ladder.js и тексты игрока tools/content-gen/tables/texts.js.
   Запуск отдельно: node tools/content-gen/tables/collect.js > книги.json */
'use strict';
const fs = require('fs'), path = require('path');
const TX = require('./texts.js');
const LAD = require('../lore/ladder.js');
const { readSheet } = require('../lootboxes/xlsx.js');
const ROOT = path.join(__dirname, '..', '..', '..');
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const load = TX.load;

/* ---------------- общие мелочи ---------------- */
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const RAR = ['обычная', 'редкая', 'уникальная', 'эпическая', 'древняя', 'первородная', 'вневременная'];
const rar = r => (r >= 1 && r <= 7 ? RAR[r - 1] : '');
const yes = b => (b ? 'да' : '');
const cyc = c => (c ? ROMAN[c] || String(c) : '');
const S = v => (v == null ? '' : Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : v);
const col = (h, w, o) => Object.assign({ h, w }, o || {});
const T_ = { team: true };          // столбец только для команды
const W_ = { wrap: true };          // длинный текст — с переносом
const TW = { team: true, wrap: true };
const sheet = (name, cols, rows, note) => ({ name, cols, rows: rows.map(r => r.map(S)), note: note || '' });
const readJSON = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);

/* ---------------- данные ---------------- */
const R = load('recipes').EN_RECIPES;
const RO = load('roster').EN_ROSTER;
const T = load('talismans').EN_TALISMANS;
const W = load('wanderer').EN_WANDERER;
const EQ = load('equipment').EN_EQUIPMENT;
const LB = load('lootboxes').EN_LOOTBOXES;
const ST = load('store').EN_STORE;
const CT = load('contracts').EN_CONTRACTS;
const RI = load('rituals').EN_RITUALS;
const EV = load('event').EN_EVENT;
const PS = load('pass').EN_PASS;
const CH = load('chronicle').EN_CHRONICLE;
const EF = load('echo-foes').EN_ECHO_FOES;
const BF = load('biome-foes').EN_BIOME_FOES;
const CL = load('clan').EN_CLAN;
const HE = load('heroes').EN_HEROES;
const LIBF = path.join(ROOT, 'tools', 'content-gen', 'abilities', 'library.json');
const KITF = path.join(ROOT, 'tools', 'content-gen', 'abilities', 'kits.json');
const L = JSON.parse(fs.readFileSync(LIBF, 'utf8'));
const K = JSON.parse(fs.readFileSync(KITF, 'utf8'));
const CFF = path.join(ROOT, 'tools', 'content-gen', 'clan', 'foes.js');
const CF = require(CFF);
const FOES_DOC = path.join(ROOT, 'docs', 'content', 'враги-биомов.md');
const TAL_ORIG = path.join(ROOT, 'source-data', 'оригиналы-2026-09-26', 'Enerium_Талисманы_Финал.xlsx');
const PEND = readJSON(path.join(__dirname, 'renames-pending.json')) || { renames: [] };
const DONE = readJSON(path.join(__dirname, 'renames-2026-10-01.json')) || { applied: [] };

const UI = n => `design/ui/${n}.js`;
const itemById = Object.fromEntries(R.items.map(i => [i.id, i]));
const itemN = id => (itemById[id] ? itemById[id].n : id);
const heroById = Object.fromEntries(RO.heroes.map(h => [h.id, h]));
const heroN = id => (heroById[id] ? heroById[id].n : id);
const specN = s => String(s || '').split('+').map(x => (R.specs[x] ? R.specs[x].n : x)).join(' + ');
const bioById = Object.fromEntries(R.cycles.flatMap(c => c.biomes.map(b => [b.id, Object.assign({ cyc: c.n, team: c.team, god: c.god, el: c.el, karst: c.karst }, b)])));
const placeById = Object.fromEntries(R.places.map(p => [p.id, p]));
const pend = (dom, id) => (PEND.renames || []).find(x => x.domain === dom && String(x.id) === String(id));
/* столбцы «ждёт» — только пока в renames-pending.json есть отложенные имена; 01.10.2026 все отложенные применены */
const HAS_PEND = (PEND.renames || []).length > 0;
const pendCols = HAS_PEND ? [col('Новое имя — ждёт', 28, T_), col('Почему переименовать', 50, TW)] : [];
const pendRow = (dom, id) => { if (!HAS_PEND) return []; const p = pend(dom, id); return p ? [p.now, p.why] : ['', '']; };
const NAMES_NOTE = HAS_PEND ? 'Часть имён ждёт переименования — столбец «Новое имя — ждёт» (tools/content-gen/tables/renames-pending.json).'
  : 'Имена — по лору и лестнице спойлеров (ADR-0038). Было → стало — лист «Переименования» Реестра имён и docs/content/переименования-2026-10-01.md.';
const PEND_TEAM = HAS_PEND ? ['«Новое имя — ждёт» и «Почему переименовать» — предложение, ещё не в данных'] : [];

/* ---------------- способности ---------------- */
const KIND = { dmg: 'урон', heal: 'лечение', shield: 'щит', dot: 'урон со временем', hot: 'лечение со временем', ctrl: 'контроль', debuff: 'дебафф', buff: 'бафф', passive: 'пассивка', reaction: 'реакция', farm: 'добыча', farmPassive: 'пассивка добычи' };
const TIER = { all: 'все', grp: 'группа', one: 'одна' };
const SCHOOLS = Object.keys(L.sets);
const abList = [];
for (const sch of SCHOOLS) {
  const set = L.sets[sch];
  for (const [k, slot] of [['active', 'активная'], ['ult', 'ульта'], ['passive', 'пассивка'], ['reaction', 'реакция']]) for (const a of set[k]) abList.push(Object.assign({ slot, school: sch }, a));
}
for (const [k, slot] of [['active', 'фарм · активная'], ['ult', 'фарм · ульта'], ['passive', 'фарм · пассивка']]) for (const a of L.farm[k] || []) abList.push(Object.assign({ slot, school: 'Фарм' }, a));
const abById = Object.fromEntries(abList.map(a => [a.id, a]));
const abUsers = {}, abFirst = {};
const use = (id, who, c) => { if (!id) return; (abUsers[id] = abUsers[id] || new Set()).add(who); if (abFirst[id] == null || c < abFirst[id]) abFirst[id] = c; };
for (const [hid, h] of Object.entries(K.roster)) for (const s of h.kit || []) use(s.id, 'герой ' + hid, h.cycle);
for (const [fid, f] of Object.entries(K.foes)) for (const s of f.kit || []) use(s.id, 'Мастерская ' + fid, 1);
for (const [fid, f] of Object.entries(EF.foes)) for (const s of f.kit || []) use(s.id, 'Эхо ' + fid, 2);
for (const [fid, f] of Object.entries(BF.foes)) for (const s of (f.kit && f.kit.kit) || []) use(s.id, 'биом ' + fid, (bioById[f.biome] || {}).cyc || 1);
const trig = t => (t ? (L.rules.triggers[t] || t) : '');

function bookAbilities() {
  const rows = abList.map(a => {
    const src = a.src || {};
    return [a.id, a.school, a.slot, KIND[a.kind] || a.kind || '', TIER[a.tier] || '', a.n, a.d, a.ch == null ? '' : a.ch, a.coef == null ? '' : a.coef, a.twist || '',
      trig(a.trig), abUsers[a.id] ? abUsers[a.id].size : 0, cyc(abFirst[a.id] || 1), src.no || '', src.name && src.name !== a.n ? src.name : (src.name ? '= то же' : ''), src.type || '', src.text || ''];
  });
  const eff = [];
  for (const sch of SCHOOLS) for (const [k, e] of Object.entries(L.sets[sch].eff || {})) eff.push([sch, KIND[k] || k, e.n, e.d]);
  const tpl = [];
  for (const [k, v] of Object.entries(L.rules.tiersTpl)) for (const [t, x] of Object.entries(v)) tpl.push([KIND[k] || k, TIER[t], x.coef == null ? '' : x.coef, x.left == null ? '' : x.left, x.max == null ? '' : x.max, L.rules.groupTargets[k] || '']);
  const kits = Object.entries(K.roster).map(([id, h]) => {
    const steps = []; for (let v = 0; v <= 5; v++) { const s = (h.kit || []).find(x => x.v === v); steps.push(s ? (abById[s.id] ? abById[s.id].n : s.n || s.id) + (s.slot === 'ult' ? ' · ульта' : '') : ''); }
    return [id, h.name, cyc(h.cycle), h.source || h.src, h.cls, h.school, h.rarity, h.maxV, ...steps, h.how || '', h.draft || ''];
  }).sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'ru', { numeric: true }));
  /* таблица автора → библиотека: каждая из 72 строк и что из неё выросло */
  const SRCJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'content-gen', 'abilities', 'source.json'), 'utf8'));
  const bySrc = {}; for (const a of abList) if (a.src && a.src.no) bySrc[a.src.no] = a;
  const author = SRCJ.abilities.map(r => { const no = +r['№'], a = bySrc[no] || {}; return [no, r['Элемент'], r['Тип'], r['Название'], r['Эффект'], a.id || '', a.n || '', a.n && a.n !== r['Название'] ? 'да' : '']; });
  const foeKit = (kit, nameOf) => (kit || []).map(s => { const a = abById[s.id]; const base = a ? a.n : (s.n || s.id); return (s.as && s.as !== base ? `${s.as} (${base})` : base) + (s.slot === 'ult' ? ' · ульта' : ''); }).join('; ');
  const foes = [];
  for (const [id, f] of Object.entries(K.foes)) foes.push(['Мастерская форм', id, f.name, f.rank, f.cls, f.el, foeKit(f.kit)]);
  for (const [id, f] of Object.entries(BF.foes)) foes.push([(bioById[f.biome] || {}).n || f.biome, id, f.name, f.rank, f.cls, f.el, foeKit(f.kit && f.kit.kit)]);
  for (const [id, f] of Object.entries(EF.foes)) foes.push(['Эхо · ' + f.race, id, f.name, f.rank, f.cls, f.el, foeKit(f.kit)]);
  return {
    file: 'Enerium_Способности_элементов.xlsx', title: 'Способности: библиотека, эффекты школ, наборы героев и врагов',
    what: ['Вся библиотека способностей игры — 339 записей: семь школ и «Без школы» по восемь видов в трёх ступенях целей, ульты, пассивки и реакции, и общий набор фарма (ADR-0015).',
      'Вместо таблицы автора «Способности элементов» (72 способности восьми школ, 26.09.2026): её строки вошли в библиотеку, механика — новая; часть имён 01.10.2026 сменилась по лору — лист «Таблица автора». Оригинал — source-data/оригиналы-2026-09-26/.',
      'Наборы — какие способности герой получает на каждой доблести (ADR-0016, ADR-0031): у всех 360 героев состава и у врагов Мастерской, биомов 2–4 и Эхо.'],
    sources: [rel(LIBF), rel(KITF), 'tools/content-gen/abilities/source.json', UI('biome-foes'), UI('echo-foes'), UI('recipes')],
    team: ['«Способности» — столбцы «№ у автора», «Имя у автора», «Тип у автора», «Текст у автора»: откуда взята способность в таблице автора 26.09.2026',
      '«Наборы героев» — «Откуда набор» и «Черновик»: служебные пометки сборщика наборов', 'лист «Таблица автора» — сверка с оригиналом'],
    sheets: [
      sheet('Способности', [col('id', 22), col('Школа', 12), col('Вид', 16), col('Род', 16), col('Цели', 8), col('Название', 26), col('Что делает', 70, W_), col('Шанс в ходе, б. п.', 10), col('Коэффициент, %', 10),
        col('Особенность', 36, W_), col('Срабатывает, когда', 30, W_), col('Носителей', 9), col('С цикла', 8), col('№ у автора', 8, T_), col('Имя у автора', 22, T_), col('Тип у автора', 16, T_), col('Текст у автора', 50, TW)], rows,
      'Шанс в ходе — доля хода, б. п. из 10 000; у героя её поправляет редкость. Носителей — герои состава и враги, у кого способность в наборе.'),
      sheet('Эффекты школ', [col('Школа', 12), col('Род', 18), col('Эффект', 22), col('Что делает', 80, W_)], eff),
      sheet('Ступени целей', [col('Род', 18), col('Цели', 8), col('Коэффициент, %', 12), col('Раундов', 8), col('Стаков', 8), col('Целей у группы', 12)], tpl,
        `Ульта — та же способность сильнее: ×${L.rules.ultPow}, шанс ${L.rules.ultCh} б. п.; обычная способность — ${L.rules.ch} б. п., контроль — ${L.rules.ctrlCh} б. п.`),
      sheet('Наборы героев', [col('id', 8), col('Герой', 24), col('Цикл', 6), col('Источник', 18), col('Класс', 18), col('Школа', 12), col('Редкость', 12), col('Макс. доблести', 8),
        col('Доблесть 0', 22), col('Доблесть 1', 22), col('Доблесть 2', 22), col('Доблесть 3', 22), col('Доблесть 4', 22), col('Доблесть 5', 22), col('Откуда набор', 10, T_), col('Черновик', 10, T_)], kits,
        'Без доблести — одна активная, каждая доблесть — новая способность, последняя доблесть — ульта (ADR-0016).'),
      sheet('Наборы врагов', [col('Где', 24), col('id', 14), col('Враг', 26), col('Ранг', 8), col('Класс', 18), col('Стихия', 10), col('Способности — «своё имя (из библиотеки)»', 90, W_)], foes),
      sheet('Таблица автора', [col('№', 5), col('Элемент', 14), col('Тип у автора', 16), col('Имя у автора', 24), col('Текст у автора', 60, W_), col('id в библиотеке', 22), col('Имя в игре', 24), col('Имя сменилось', 9)], author,
        'Оригинал 26.09.2026 — source-data/оригиналы-2026-09-26/Enerium_Способности_элементов.xlsx. Механика у всех 72 новая (ADR-0015); почему сменились имена — docs/content/переименования-2026-10-01.md.'),
    ],
  };
}

/* ---------------- талисманы ---------------- */
function bookTalismans() {
  const cats = T.rules.cats || {}, types = T.rules.types || {}, classes = T.rules.classes || {};
  const clsN = c => (Array.isArray(c) ? c.map(x => classes[x] || x).join(', ') : c ? classes[c] || c : '');
  /* имя у автора — по номеру строки из оригинала (архив), только чтение */
  const orig = {};
  try {
    const rows = readSheet(TAL_ORIG, 'Талисманы'), H = rows[0], cNo = H.indexOf('№'), cN = H.indexOf('Название');
    for (const r of rows.slice(1)) if (r[cNo]) orig[+r[cNo]] = r[cN];
  } catch (e) { /* архива нет — столбец пустой */ }
  const items = Object.entries(T.items).map(([no, [fam, r]]) => {
    const f = T.fams[fam] || {};
    return [+no, fam, f.n, cats[f.cat] || f.cat, types[f.type] || f.type, rar(r), (f.v || [])[r - 1] == null ? '' : f.v[r - 1], (f.w || [])[r - 1] == null ? '' : f.w[r - 1], clsN(f.cls), String(f.fx || '').replace('{v}', (f.v || [])[r - 1]), f.d, yes(f.team), orig[+no] && orig[+no] !== f.n ? orig[+no] : ''];
  }).sort((a, b) => a[0] - b[0]);
  const fams = Object.entries(T.fams).map(([id, f]) => {
    const rs = (f.v || []).map((v, i) => (v == null ? null : i + 1)).filter(Boolean);
    return [id, f.n, cats[f.cat] || f.cat, types[f.type] || f.type, rs.map(rar).join(', '), ...[0, 1, 2, 3, 4, 5, 6].map(i => ((f.v || [])[i] == null ? '' : f.v[i])), f.fx, f.d, clsN(f.cls), f.grp || '', f.bm ? f.bm.join(' ') : '', yes(f.team), f.old || '', f.note || '', ...pendRow('talisman', id)];
  });
  const rules = Object.entries(T.rules).filter(([k, v]) => typeof v !== 'object' || Array.isArray(v)).map(([k, v]) => [k, S(v)]);
  for (const [k, v] of Object.entries(cats)) rules.push(['вид · ' + k, v]);
  for (const [k, v] of Object.entries(types)) rules.push(['тип · ' + k, v]);
  return {
    file: 'Enerium_Талисманы_Финал.xlsx', title: 'Духовные талисманы: 359 талисманов в 118 линейках',
    what: ['Духовные талисманы игры (§26): номер, редкость и вес — как у автора, названия, описания и эффекты — после переработки под систему.',
      'Вместо таблицы автора «Талисманы» (359 строк, 26.09.2026). Оригинал — source-data/оригиналы-2026-09-26/.',
      'Талисманы открыты с цикла II; линейки с пометкой «для команды» есть в сундуках только с цикла VI.'],
    sources: [UI('talismans'), 'tools/content-gen/talismans/build.js', rel(TAL_ORIG) + ' — имена у автора, только чтение'],
    team: ['«Линейки» — «Было у автора» и «Почему»: что правлено против таблицы автора', '«Талисманы» — «Имя у автора, если другое»: имя строки в таблице автора 26.09.2026', '«Для команды» — линейка со спойлером: в сундуках только с цикла VI'],
    sheets: [
      sheet('Талисманы', [col('№', 6), col('Линейка', 16), col('Название', 28), col('Вид', 12), col('Тип', 18), col('Редкость', 12), col('Значение', 9), col('Вес', 7), col('Классы до древней', 20), col('Эффект', 60, W_), col('Описание', 50, W_), col('Для команды', 9), col('Имя у автора, если другое', 28, T_)], items),
      sheet('Линейки', [col('id', 16), col('Название', 28), col('Вид', 12), col('Тип', 18), col('Редкости', 30, W_), col('Обычная', 8), col('Редкая', 8), col('Уникальная', 8), col('Эпическая', 8), col('Древняя', 8), col('Первородная', 8), col('Вневременная', 8),
        col('Эффект', 56, W_), col('Описание', 46, W_), col('Классы до древней', 18), col('Группа', 10), col('Доля в БМ', 12), col('Для команды', 9), col('Было у автора', 46, TW), col('Почему', 46, TW), ...pendCols], fams),
      sheet('Правила', [col('Правило', 26), col('Значение', 80, W_)], rules),
    ],
  };
}

/* ---------------- Память Странника ---------------- */
function bookPassives() {
  const pow = (W.mem && W.mem.pow) || [];
  const rows = W.passives.map(p => [p.no, p.id, p.cat, rar(p.r), p.n, p.d, p.pow, pow[p.pow - 1] || '', p.w, p.fam, yes(p.onlyFree), ...pendRow('passive', p.id)]);
  const rr = RAR.map((r, i) => { const l = W.passives.filter(p => p.r === i + 1); return [r, W.mem.rarBp[i], W.mem.weight.base[i], l.length, l.reduce((a, p) => a + p.w, 0)]; });
  const mem = [['Места Памяти, циклы', W.mem.places.map(cyc).join(', ')], ['Вариантов в тройке', W.mem.offer], ['Бесплатных перебросов на место', W.mem.free], ['Платный переброс, Энериум', W.mem.reroll], ['Полный сброс, Энериум', W.mem.reset], ['Пассивка «ещё один забег»', 'p' + W.mem.slot]];
  for (let i = 0; i < pow.length; i++) mem.push([`Сила влияния ${i + 1} — ${pow[i]}`, `множитель веса ${W.mem.weight.powPct[i]} %`]);
  const fixes = W.fixes.filter(f => /^Память/.test(f.what)).map(f => [f.what, f.was, f.now, f.why]);
  const fams = {}; for (const p of W.passives) { const f = fams[p.fam] = fams[p.fam] || { n: 0, r: new Set() }; f.n++; f.r.add(p.r); }
  return {
    file: 'Enerium_Странник_пассивки_Финал.xlsx', title: 'Память Странника: 146 пассивок',
    what: ['Пассивки Памяти Странника (§2): категория, семь редкостей, эффект, сила влияния, вес — как в данных игры, с правками под систему.',
      'Вместо таблицы автора «Пассивки Странника» (146 записей, 26.09.2026). Оригинал — source-data/оригиналы-2026-09-26/.',
      NAMES_NOTE],
    sources: [UI('wanderer'), 'tools/content-gen/wanderer/build.js'],
    team: [...PEND_TEAM, '«Правки под систему» — что правлено в таблице автора и почему'],
    sheets: [
      sheet('Пассивки Памяти', [col('№', 6), col('id', 7), col('Категория', 18), col('Редкость', 12), col('Название', 26), col('Эффект', 60, W_), col('Сила влияния', 8), col('Сила словами', 14), col('Вес', 7), col('Семейство', 26), col('Только бесплатно', 10), ...pendCols], rows),
      sheet('Редкости и веса', [col('Редкость', 14), col('Доля розыгрыша, б. п.', 12), col('Базовый вес', 10), col('Пассивок', 9), col('Сумма весов', 10)], rr),
      sheet('Семейства', [col('Семейство', 30), col('Пассивок', 9), col('Редкости', 40)], Object.entries(fams).map(([k, v]) => [k, v.n, [...v.r].sort().map(rar).join(', ')])),
      sheet('Места и цены', [col('Что', 40), col('Значение', 40)], mem),
      sheet('Правки под систему', [col('Что', 34), col('Было', 50, W_), col('Стало', 50, W_), col('Почему', 70, W_)], fixes),
    ],
  };
}

/* ---------------- артефакты ---------------- */
function bookArtifacts() {
  const rows = W.art.list.map(a => [a.no, a.id, a.mode, a.n, a.d, a.what, a.step, a.unit || '', a.base == null ? '' : a.base, a.lv, cyc(a.from), a.gold, a.soul, a.total, a.max, a.note || '', a.fix || '', ...pendRow('artifact', a.id)]);
  const lv = [];
  for (const a of W.art.list) { let sum = 0; for (let i = 1; i <= a.lv; i++) { sum += a.soul * i; lv.push([a.id, a.n, i, cyc(Math.min(6, a.from + i - 1)), a.soul * i, sum, a.base != null ? a.base + a.step * i : '+' + a.step * i + (a.unit || '')]); } }
  const rules = Object.entries(W.art.rules).map(([k, v]) => [k, S(v)]);
  const fixes = W.fixes.filter(f => /^Артефакт/.test(f.what)).map(f => [f.what, f.was, f.now, f.why]);
  return {
    file: 'Enerium_Артефакты_Финал.xlsx', title: 'Артефакты Странника: 18 артефактов',
    what: ['Артефакты (§14.1): покупка за золото один раз, уровни — за души, цена уровня = база × номер уровня, за цикл — один уровень.',
      'Вместо таблицы автора «Артефакты» (18 записей, 26.09.2026). Оригинал — source-data/оригиналы-2026-09-26/.',
      NAMES_NOTE],
    sources: [UI('wanderer'), 'tools/content-gen/wanderer/build.js'],
    team: ['«Правка» — что изменено против таблицы автора и почему', ...PEND_TEAM],
    sheets: [
      sheet('Артефакты', [col('№', 5), col('id', 6), col('Режим', 12), col('Название', 26), col('Эффект за уровень', 40, W_), col('Что растёт', 30), col('Шаг', 6), col('Ед.', 6), col('Без артефакта', 9), col('Уровней', 8), col('С цикла', 7), col('Покупка, золото', 10), col('Души 1-го уровня', 10), col('Души на все уровни', 11),
        col('Итог на максимуме', 14), col('Заметка', 40, W_), col('Правка', 50, TW), ...pendCols], rows),
      sheet('Уровни', [col('id', 6), col('Артефакт', 26), col('Уровень', 8), col('Цикл', 6), col('Души за уровень', 10), col('Души всего', 10), col('Значение', 14)], lv),
      sheet('Правила', [col('Правило', 24), col('Значение', 40)], rules),
      sheet('Правки под систему', [col('Что', 34), col('Было', 50, W_), col('Стало', 50, W_), col('Почему', 70, W_)], fixes),
    ],
  };
}

/* ---------------- сеты ---------------- */
function bookSets() {
  const kindN = { order: 'орден', donat: 'донатный сет', brother: 'братство' };
  const rows = RO.sets.map(s => [s.key, kindN[s.kind] || s.kind, cyc(s.cycle), s.name, s.draft || '', yes(s.proposed), s.bonus || '', (s.n || []).join(' / '), s.sum, s.tiers, s.members.map(heroN).join(', '), ...pendRow('set', s.key)]);
  const mem = [];
  for (const s of RO.sets) for (const id of s.members) { const h = heroById[id] || {}; mem.push([s.key, s.name, id, h.n, cyc(h.c), h.cls, h.sch, h.race, rar(h.r), h.maxV]); }
  const tiers = (RO.rules.tierBySum || []).map(([sum, t]) => [`Ступень ${ROMAN[t]}`, `сумма доблестей сета от ${sum}`]);
  tiers.push(['Доблесть героя для ступени', `не ниже ${RO.rules.tierValor}`]);
  const drafts = HE.sets.map(s => [s.no, s.name, s.type, cyc(s.cycle), s.domain, s.budget, s.who, s.bonus, s.motif || '']);
  return {
    file: 'Enerium_Сет_бонусы_героев_ФИНАЛ.xlsx', title: 'Сеты героев: ордены и донатные сеты',
    what: ['Сеты состава игры (§30, ADR-0006, ADR-0021): 20 орденов и 5 донатных сетов, бонусы-счётчики и N по трём ступеням, кто входит.',
      'Вместо таблицы автора «Сет-бонусы героев» (22 сета, 26.09.2026). Оригинал — source-data/оригиналы-2026-09-26/.',
      NAMES_NOTE],
    sources: [UI('roster'), UI('heroes'), 'docs/content/сет-бонусы.md'],
    team: ['«Сеты» — «Имя в черновике» и «Предложено»: откуда имя', '«Черновики сетов» — 22 сета черновиков 110 героев: основа глав и орденов, игроку не показывается'],
    sheets: [
      sheet('Сеты', [col('Ключ', 6), col('Вид', 14), col('Цикл', 6), col('Название', 28), col('Имя в черновике', 26, T_), col('Предложено', 9, T_), col('Бонус', 70, W_), col('N по ступеням', 14), col('Сумма доблести', 9), col('Ступеней', 8), col('Герои', 70, W_), ...pendCols], rows),
      sheet('Состав сетов', [col('Ключ', 6), col('Сет', 28), col('Герой', 8), col('Имя', 24), col('Цикл', 6), col('Класс', 20), col('Школа', 12), col('Раса', 12), col('Редкость', 12), col('Макс. доблести', 8)], mem),
      sheet('Ступени', [col('Ступень', 26), col('Условие', 40)], tiers),
      sheet('Черновики сетов', [col('№', 5), col('Название', 28), col('Тип', 10), col('Цикл', 6), col('Домен', 14), col('Бюджет доблести', 18), col('Кто они', 80, TW), col('Бонус', 50, TW), col('Мотив', 40, TW)], drafts),
    ],
  };
}

/* ---------------- снаряжение ---------------- */
function bookEquipment() {
  const kinds = EQ.kinds, kN = k => (kinds[k] ? kinds[k].n : k);
  const slots = Object.entries(EQ.slots).map(([id, s]) => [id, s.n, (EQ.rules.groups || {})[s.grp] || s.grp, kN(s.main), Array.isArray(s.sec) ? s.sec.map(x => kN(x[0])).join(', ') : 'любые']);
  const kindRows = Object.entries(kinds).map(([id, k]) => [id, k.n, k.grow === 'flat' ? 'число' : 'процент', k.w == null ? '' : k.w, k.unit || '', k.base == null ? '' : k.base, k.d || '']);
  const order = Object.keys(EQ.slots);
  const tpl = Object.entries(EQ.templates).sort((a, b) => order.indexOf(a[1].slot) - order.indexOf(b[1].slot) || a[1].r - b[1].r).map(([id, t]) => [id, (EQ.slots[t.slot] || {}).n, rar(t.r), kN(t.main[0]), t.main[1], t.main[2], t.chars.n, t.chars.pool.map(x => kN(x[0])).join(', '), t.secs.n, t.secs.pool.map(x => kN(x[0])).join(', ')]);
  const ladder = RAR.map((r, i) => [r, (EQ.rules.ladder || [])[i], (EQ.rules.cycMul || [])[i] == null ? '' : EQ.rules.cycMul[i]]);
  const cask = Object.entries(EQ.rules.caskets || {}).map(([id, r]) => [id, itemN(id), rar(r), (itemById[id] || {}).cyc ? cyc(itemById[id].cyc) : '']);
  const rules = Object.entries(EQ.rules).filter(([k, v]) => typeof v !== 'object' || Array.isArray(v)).map(([k, v]) => [k, S(v)]);
  return {
    file: 'Enerium_Снаряжение.xlsx', title: 'Снаряжение: девять мест, строки, 63 шаблона',
    what: ['Снаряжение игры (§21, §22): девять мест, виды строк, 63 шаблона — место × семь редкостей; предмет генерируется по шаблону на сиде сервера.',
      'Главная строка места гарантирована; число характеристик и вторичных строк растёт с редкостью; диапазоны — шаблон × множитель цикла.'],
    sources: [UI('equipment'), 'tools/content-gen/equipment/build.js', UI('recipes')],
    team: [],
    sheets: [
      sheet('Места', [col('id', 8), col('Место', 14), col('Группа', 12), col('Главная строка', 18), col('Вторичные строки', 60, W_)], slots),
      sheet('Строки', [col('id', 12), col('Строка', 24), col('Рост', 10), col('Вес', 7), col('Ед.', 5), col('База', 7), col('Что значит', 70, W_)], kindRows),
      sheet('Шаблоны', [col('Шаблон', 10), col('Место', 12), col('Редкость', 12), col('Главная строка', 18), col('База главной', 10), col('Ширина, %', 8), col('Характеристик', 9), col('Пул характеристик', 40, W_), col('Вторичных', 9), col('Пул вторичных', 50, W_)], tpl,
        'Имени у шаблона нет: игрок видит место и редкость («Шлем · эпическая»). Дать ли шаблонам имена — вопрос автору (docs/content/переименования-2026-10-01.md).'),
      sheet('Редкости', [col('Редкость', 14), col('Лестница, %', 10), col('Множитель', 10)], ladder),
      sheet('Ларцы', [col('Предмет', 14), col('Название', 32), col('Редкость', 12), col('Цикл', 6)], cask),
      sheet('Правила', [col('Правило', 18), col('Значение', 80, W_)], rules),
    ],
  };
}

/* ---------------- ресурсы ---------------- */
function bookResources() {
  const tierN = t => (R.tiers[t] ? R.tiers[t].n : t), famN = f => R.fams[f] || f;
  const rows = R.items.map(it => [it.id, it.n, cyc(it.cyc), tierN(it.tier), famN(it.fam), specN(it.spec), rar(it.r), it.b ? (bioById[it.b] ? bioById[it.b].n : (placeById[it.b] || {}).n || it.b) : (it.place || ''), it.foe || it.boss || '', it.race || '', it.sheet || '', (it.src || []).join('; '), it.lore || '', it.hint || '', yes(it.pool), yes(it.team)]);
  const specs = R.specOrder.map(k => [k, R.specs[k].n, R.items.filter(i => String(i.spec || '').split('+').includes(k)).length]);
  const tiers = Object.entries(R.tiers).map(([k, t]) => [k, t.n, rar(t.r), R.items.filter(i => i.tier === k).length]);
  const fams = Object.entries(R.fams).map(([k, n]) => [k, n, R.items.filter(i => i.fam === k).length]);
  const sheets = R.sheets.map(s => [s.id, s.cyc ? cyc(s.cyc) : 'общий пул', s.size, s.hue || '', (s.palette || []).join('; '), s.items.length, s.items.map(itemN).join(', ')]);
  return {
    file: 'Enerium_Ресурсы.xlsx', title: 'Ресурсы Этериоса: 948 предметов крафта и добычи',
    what: ['Все предметы ремесла и добычи (§9, §12, ADR-0023, ADR-0033): 36 базовых общего пула, ключи ремёсел, уникальные ресурсы боссов, ресурсы и находки крафтовых мест, трофеи, заготовки, изделия, карсты, топливо, призывы, руны, герои из скрытых рецептов, валюты.',
      'Лор — строка о предмете для игрока, подсказка — пометка-загадка Этриона. Предметы с пометкой «для команды» — цикл VI: игроку не показываются.'],
    sources: [UI('recipes'), 'tools/content-gen/recipes/*.js'],
    team: ['«Для команды» — предмет цикла VI со спойлером, игроку не показывается'],
    sheets: [
      sheet('Предметы', [col('id', 16), col('Название', 28), col('Цикл', 6), col('Ярус', 22), col('Семейство', 24), col('Ремесло', 22), col('Редкость', 12), col('Биом или место', 24), col('Враг', 24), col('Раса', 10), col('Лист иконки', 9),
        col('Откуда', 60, W_), col('Лор', 60, W_), col('Подсказка Этриона', 60, W_), col('Общий пул', 8), col('Для команды', 9)], rows),
      sheet('Ремёсла', [col('id', 8), col('Ремесло', 20), col('Предметов', 10)], specs),
      sheet('Ярусы', [col('id', 10), col('Ярус', 30), col('Редкость', 12), col('Предметов', 10)], tiers),
      sheet('Семейства', [col('id', 10), col('Семейство', 34), col('Предметов', 10)], fams),
      sheet('Листы иконок', [col('Лист', 8), col('Цикл', 10), col('Клеток', 7), col('Тон', 24), col('Палитра', 40, W_), col('Предметов', 9), col('Предметы', 100, W_)], sheets),
    ],
  };
}

/* ---------------- рецепты ---------------- */
function bookRecipes() {
  const kindN = { product: 'награда мастерской', rune: 'руна предела', made: 'изделие', call: 'призыв', act: 'активация места', part: 'заготовка', hero: 'герой', valor: 'руна доблести', story: 'сюжет' };
  const io = l => (l || []).map(([id, n]) => `${itemN(id)} ×${n}`).join('; ');
  const rows = R.recipes.map(r => [r.id, r.n, cyc(r.cyc), kindN[r.kind] || r.kind, R.fams[r.fam] || r.fam, io([r.out]), io(r.in), r.why || '', yes(r.hidden), yes(r.known0), yes(r.sinkMain), r.weight == null ? '' : r.weight, yes(r.team)]);
  const kinds = { ruin: 'руина', city: 'город' };
  const places = R.places.map(p => [p.id, kinds[p.kind] || p.kind, p.n, p.city || '', cyc(p.cyc), p.where || '', p.lore || '', p.foes || '', itemN(p.act), (p.res || []).map(itemN).join(', '), (p.finds || []).map(itemN).join(', '),
    p.boss ? p.boss.n : '', p.boss ? p.boss.title || '' : '', p.boss ? p.boss.race || '' : '', p.boss ? specN(p.boss.spec) : '', p.boss && p.boss.awake ? p.boss.awake.label : '', yes(p.team)]);
  const mems = R.memories.map(m => [m.id, (bioById[m.biome] || {}).n || m.biome, cyc(m.cyc), m.boss, m.label, m.race, specN(m.spec), itemN(m.unique), itemN(m.recraft), itemN(m.call), itemN(m.trophy), m.lore, yes(m.team)]);
  const en = R.drops.ener, du = R.drops.dust;
  const ener = [['Ступень 1', itemN(en.t1)], ['Ступень 2', itemN(en.t2)], ['Ступень 3', itemN(en.t3)], ['Шаг лестницы', `${en.step} : 1`], ['Руническая пыль', itemN(du.id)]];
  for (const [k, v] of Object.entries(du)) if (k !== 'id') ener.push(['пыль · ' + k, S(v)]);
  const drops = R.drops.enemies.map(e => [e.biome, e.name, cyc(e.cyc), e.floors, e.elites, S(e.ordinary), S(e.elite), S(e.boss), yes(e.team)]);
  const market = Object.entries(R.drops.market).map(([k, v]) => [k, S(v)]);
  return {
    file: 'Enerium_Рецепты.xlsx', title: 'Рецепты мастерской: 527 рецептов, крафтовые места, эхо боссов',
    what: ['Рецепты мастерской Этриона (§12, ADR-0033): выход, входы, цикл, вид; крафтовые места — руины и города цикла; эхо боссов биомов; лестница Энериума и руническая пыль; добыча биомов и рынок.',
      'Не больше двух ресурсов одного ремесла в рецепте, шесть ячеек, до 100 в ячейке (§9.2) — законы проверяет сборщик tools/content-gen/recipes/emit.js.'],
    sources: [UI('recipes'), 'tools/content-gen/recipes/*.js'],
    team: ['«Рецепты» — «Почему так»: замысел рецепта для команды, игроку не показывается', '«Для команды» — рецепт или место цикла VI'],
    sheets: [
      sheet('Рецепты', [col('id', 18), col('Название', 28), col('Цикл', 6), col('Вид', 18), col('Семейство', 22), col('Выход', 30), col('Входы', 70, W_), col('Почему так', 70, TW), col('Скрытый', 8), col('Известен сразу', 8), col('Главный сток', 8), col('Вес', 6), col('Для команды', 9)], rows),
      sheet('Крафтовые места', [col('id', 7), col('Вид', 8), col('Место', 26), col('Город', 14), col('Цикл', 6), col('Где', 40, W_), col('Лор', 60, W_), col('Враги', 34, W_), col('Активация', 26), col('Ресурсы места', 60, W_), col('Находки', 34, W_),
        col('Призванный враг', 22), col('Титул', 22), col('Раса', 10), col('Ремесло', 14), col('Пробуждённый', 26), col('Для команды', 9)], places),
      sheet('Эхо боссов биомов', [col('id', 6), col('Биом', 22), col('Цикл', 6), col('Босс', 22), col('Эхо', 28), col('Раса', 10), col('Ремесло', 14), col('Уникальный', 24), col('Перекрафт', 26), col('Призыв', 26), col('Трофей', 26), col('Лор', 60, W_), col('Для команды', 9)], mems),
      sheet('Энериум и пыль', [col('Что', 26), col('Значение', 60, W_)], ener),
      sheet('Добыча биомов', [col('Биом', 6), col('Название', 24), col('Цикл', 6), col('Этажей', 7), col('Элит', 6), col('Рядовой', 30, W_), col('Элита', 40, W_), col('Босс', 50, W_), col('Для команды', 9)], drops),
      sheet('Рынок', [col('Ярус', 12), col('Цены по циклам, золото', 60)], market),
    ],
  };
}

/* ---------------- герои ---------------- */
function bookHeroes() {
  const srcN = { gold: 'золото', donat: 'Энериум (донат)', roulette: 'Возрождение душ', echo: 'Эхо', craft: 'крафт' };
  const setOf = {}; for (const s of RO.sets) for (const m of s.members) (setOf[m] = setOf[m] || []).push(s.name);
  const rows = RO.heroes.map(h => [h.id, h.n, cyc(h.c), srcN[h.src] || h.src, rar(h.r), h.cls, h.sch, h.race, h.sex === 'f' ? 'ж' : h.sex === 'm' ? 'м' : '', h.maxV, (setOf[h.id] || []).join(', '), h.week || '', h.avers ? h.avers.race : '', h.no || '', yes(h.tut), h.who, (h.chT || []).join(' · '), ...pendRow('hero', h.id)]);
  const src = Object.entries(RO.srcInfo).map(([k, v]) => [k, srcN[k] || k, v.count, cyc(v.from), v.maxV.join('–'), RAR.map((r, i) => (v.rar[i] ? `${r} ${v.rar[i]}` : '')).filter(Boolean).join(', ')]);
  const weeks = RO.weeks.map(w => [w.race, w.civ, w.raid, w.squad.map(heroN).join(', '), (w.team && w.team.theme) || '']);
  return {
    file: 'Enerium_Герои.xlsx', title: 'Герои: состав игры, 360 героев',
    what: ['Состав героев игры (ADR-0019, ADR-0022, ADR-0023): источник, редкость, класс, школа, раса, личный максимум доблести, сет, неделя Эхо, кто он и главы.',
      'Герой приходит с 0 уровнем, доблестью и пределом; источник задаёт личный максимум доблести. Главы целиком — docs/content/герои/главы/.',
      NAMES_NOTE],
    sources: [UI('roster'), 'docs/content/герои/состав-героев.csv'],
    team: ['«Недели Эхо» — «Тема для арта»: замысел облика цивилизации'],
    sheets: [
      sheet('Герои', [col('id', 7), col('Имя', 24), col('Цикл', 6), col('Источник', 16), col('Редкость', 12), col('Класс', 22), col('Школа', 11), col('Раса', 11), col('Пол', 5), col('Макс. доблести', 8), col('Сет', 26), col('Неделя Эхо', 11), col('Неприязнь', 11), col('№ за золото', 8), col('Обучение', 8),
        col('Кто он', 70, W_), col('Главы', 60, W_), ...pendCols], rows),
      sheet('Источники', [col('id', 9), col('Источник', 18), col('Героев', 8), col('С цикла', 8), col('Макс. доблести', 12), col('По редкостям', 60, W_)], src),
      sheet('Недели Эхо', [col('Раса', 12), col('Цивилизация', 20), col('Нашествие', 34), col('Отряд недели', 70, W_), col('Тема для арта', 50, TW)], weeks),
      sheet('Классы и школы', [col('Классы', 24), col('Школы', 16)], Array.from({ length: Math.max(RO.classes.length, RO.schools.length) }, (_, i) => [RO.classes[i] || '', RO.schools[i] || ''])),
    ],
  };
}

/* ---------------- враги ---------------- */
function parseFoesDoc() {
  const t = fs.readFileSync(FOES_DOC, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const out = []; let bio = null, sec = null, team = false;
  for (const line of t) {
    if (/^## Для команды/.test(line)) team = true;
    let m = line.match(/^#{2,3} (\d+)\. (.+?) — /);
    if (m) { bio = { no: +m[1], n: m[2] }; sec = null; continue; }
    if (/^## (?!\d)/.test(line) && !/^## Для команды/.test(line)) { bio = null; continue; }
    if (!bio || bio.no < 5) continue;
    if (/^(?:### |\*\*)Рядовые/.test(line)) { sec = 'рядовой'; continue; }
    if (/^(?:### |\*\*)Элиты/.test(line)) { sec = 'элита'; continue; }
    m = line.match(/^(?:### |\*\*)Босс биома — ([^*]+?)(?:\*\*|$)/);
    if (m) { out.push([bio.no, bio.n, 'босс биома', m[1].trim(), '', '', '', yes(team)]); sec = null; continue; }
    m = line.match(/^(?:### |\*\*)Рунный босс — ([^*]+?)(?:\*\*|$)/);
    if (m) { out.push([bio.no, bio.n, 'рунный страж', m[1].trim(), '', '', '', yes(team)]); sec = null; continue; }
    if (sec && /^\|/.test(line) && !/^\|\s*(?:№|Элита|---)/.test(line)) {
      const c = line.split('|').slice(1, -1).map(x => x.trim());
      if (sec === 'рядовой') out.push([bio.no, bio.n, sec, c[1], c[2], c[3], c[4], yes(team)]);
      else out.push([bio.no, bio.n, sec, c[0], c[1], c[2], c[4], yes(team)]);
    }
  }
  return out;
}
function bookFoes() {
  const biomes = R.cycles.flatMap(c => c.biomes.map(b => { const d = R.drops.enemies.find(e => e.biome === b.id) || {}; return [b.id, b.n, cyc(c.n), c.god, c.el, c.karst, b.kind, b.boss, b.guard, b.guardKind === 'valor' ? 'страж доблести' : 'страж пределов', d.floors || '', d.elites || '', yes(c.team)]; }));
  const abN = s => { const a = abById[s.id]; const base = a ? a.n : s.n || s.id; return (s.as && s.as !== base ? `${s.as} (${base})` : base) + (s.slot === 'ult' ? ' · ульта' : ''); };
  const work = Object.entries(K.foes).map(([id, f]) => [id, f.name, f.rank, f.cls, f.el, (f.kit || []).map(abN).join('; ')]);
  const rankN = { o: 'рядовой', e: 'элита', b: 'босс', rune: 'рунный страж', uber: 'Убер-босс' };
  const bio = Object.entries(BF.foes).map(([id, f]) => { const c = BF.cards[id] || {}; return [id, (bioById[f.biome] || {}).n || f.biome, cyc((bioById[f.biome] || {}).cyc), rankN[f.rank] || f.rank, f.name, f.cls, f.race, f.el, ((f.kit && f.kit.kit) || []).map(abN).join('; '), c.look || '', c.desc || '']; });
  const doc = parseFoesDoc();
  const civ = Object.fromEntries(RO.weeks.map(w => [w.race, w.civ]));
  const echo = Object.entries(EF.foes).map(([id, f]) => [id, f.race, civ[f.race] || '', f.step, rankN[f.rank] || f.rank, f.name, f.cls, f.el, f.look || '', (f.kit || []).map(abN).join('; ')]);
  const echoAb = EF.abilities.map(a => [a.id, a.owner, (EF.foes[a.owner] || {}).name || '', a.n, a.set, a.t === 'ult' ? 'ульта' : a.t === 'pas' ? 'пассивка' : 'активная', a.d, (a.need || []).join(', ')]);
  const bAb = BF.abilities.map(a => [a.id, a.owner, (BF.foes[a.owner] || {}).name || '', a.n, a.set, a.t, a.d]);
  /* призванные враги (§12.3): тип по силе — поле g записи drops.craftBosses (ADR-0039: «крафтового босса» как типа нет) */
  const gN = { e: 'элита', b: 'босс', u: 'Убер', f: 'Забытый' }, cbById = Object.fromEntries(R.drops.craftBosses.map(b => [b.id, b]));
  const gOf = id => (cbById[id] ? gN[cbById[id].g] || cbById[id].g : '');
  const craft = [];
  for (const p of R.places) {
    if (p.boss) craft.push([p.boss.id, p.kind === 'city' ? 'босс города' : 'босс руины', gOf(p.boss.id), cyc(p.cyc), p.n, p.boss.n, p.boss.title || '', p.boss.race || '', specN(p.boss.spec), p.boss.lore || '', yes(p.team || p.boss.team)]);
    const aw = p.boss && p.boss.awake;
    if (aw) craft.push([aw.id, 'пробуждённый', gOf(aw.id), cyc(aw.cyc || Math.max(2, p.cyc)), p.n, aw.label, '', p.boss.race || '', specN(p.boss.spec), aw.lore || '', yes(p.team || p.boss.team)]);
  }
  for (const m of R.memories) craft.push([m.id, 'эхо босса биома', gOf(m.id), cyc(m.cyc), (bioById[m.biome] || {}).n || m.biome, m.label, '', m.race, specN(m.spec), m.lore, yes(m.team)]);
  const roleN = Object.fromEntries(Object.entries(CF.roles).map(([k, v]) => [k, v.n]));
  const clan = [];
  for (const h of CF.hosts) for (const [role, f] of Object.entries(h.figs)) clan.push([h.id, h.n, h.el, h.place, roleN[role] || role, f.n, f.look, f.tip]);
  return {
    file: 'Enerium_Враги.xlsx', title: 'Враги: биомы, Мастерская форм, Эхо, призванные враги, клан',
    what: ['Все враги игры: двенадцать биомов спуска, Мастерская форм, биомы 2–4 (данные), биомы 5–12 (черновик врагов), Эхо девяти недель с Убер-боссами и Многоликим, призванные враги — боссы руин и городов, пробуждённые, эхо боссов биомов — с типом по силе, сонмы кланового босса.',
      'Имена и способности врагов игрок узнаёт после первой победы (§7). Биомы 11–12 и их обитатели — только для команды (§38).'],
    sources: [UI('recipes'), UI('biome-foes'), UI('echo-foes'), rel(KITF), rel(CFF), rel(FOES_DOC), UI('roster')],
    team: ['«Биомы» и «Биомы 5–12» — строки с пометкой «для команды»: биомы 11–12 (§38)', '«Способности Эхо» — «Нужно ядру»: недостающие примитивы ядра боя'],
    sheets: [
      sheet('Биомы', [col('id', 5), col('Биом', 26), col('Цикл', 6), col('Бог', 10), col('Стихия', 12), col('Карст', 11), col('Вид', 12), col('Босс биома', 24), col('Рунный страж', 26), col('Страж', 16), col('Этажей', 7), col('Элит', 6), col('Для команды', 9)], biomes),
      sheet('Мастерская форм', [col('id', 5), col('Враг', 22), col('Ранг', 6), col('Класс', 18), col('Стихия', 10), col('Способности', 60, W_)], work),
      sheet('Биомы 2–4', [col('id', 7), col('Биом', 24), col('Цикл', 6), col('Ранг', 12), col('Враг', 24), col('Класс', 18), col('Раса', 10), col('Стихия', 10), col('Способности', 50, W_), col('Облик', 50, W_), col('Запись сказителя', 70, W_)], bio),
      sheet('Биомы 5–12 черновик', [col('№', 4), col('Биом', 26), col('Ранг', 12), col('Враг', 26), col('Класс · раса · стихия', 30), col('Способности', 60, W_), col('Облик', 60, W_), col('Для команды', 9)], doc),
      sheet('Эхо', [col('id', 13), col('Раса недели', 12), col('Цивилизация', 16), col('Ступень', 7), col('Ранг', 10), col('Враг', 26), col('Класс', 18), col('Стихия', 10), col('Облик', 60, W_), col('Способности', 60, W_)], echo),
      sheet('Способности Эхо', [col('id', 22), col('Владелец', 13), col('Враг', 24), col('Название', 26), col('Школа', 10), col('Вид', 10), col('Что делает', 70, W_), col('Нужно ядру', 20, T_)], echoAb),
      sheet('Способности биомов', [col('id', 22), col('Владелец', 8), col('Враг', 22), col('Название', 24), col('Школа', 10), col('Вид', 8), col('Что делает', 70, W_)], bAb),
      sheet('Призванные враги', [col('id', 12), col('Вид призыва', 20), col('Тип по силе', 10), col('Цикл', 6), col('Место', 26), col('Враг', 28), col('Титул', 24), col('Раса', 10), col('Ремесло', 14), col('Лор', 70, W_), col('Для команды', 9)], craft),
      sheet('Клан', [col('Сонм', 8), col('Название', 16), col('Стихия', 10), col('Где', 26), col('Роль', 18), col('Фигура', 20), col('Облик', 70, W_), col('Совет старика', 50, W_)], clan),
    ],
  };
}

/* ---------------- лутбоксы ---------------- */
function bookLoot() {
  const lineN = k => (LB.lines[k] ? LB.lines[k].n : k);
  const boxes = Object.entries(LB.boxes).map(([id, b]) => [id, b.n, b.lines.map(l => `${lineN(l[0])} ${l[1]} %`).join('; '), b.items.join(' / '), Object.entries(b.cur || {}).map(([c, v]) => `${LB.currencies[c] || c}: ${v.join(' / ')}`).join('; '), b.main]);
  const lines = Object.entries(LB.lines).map(([id, l]) => [id, l.n, l.kind, S(l.pack || l.qty || l.by || ''), yes(l.perCycle), l.from ? cyc(l.from) : '']);
  const rr = RAR.map((r, i) => [r, LB.boxRarity[i], (LB.windows.step[i] || []).map(([x, bp]) => `${rar(x)} ${bp}`).join('; '), (LB.windows.wild[i] || []).join(' б. п. · '), (LB.rvalue || [])[i] == null ? '' : LB.rvalue[i]]);
  const modes = Object.entries(LB.modes).map(([id, m]) => [id, m.n, (LB.boxes[m.box] || {}).n || m.box || '', m.basis || '', m.from ? cyc(m.from) : '', yes(m.weekly), yes(m.proposal)]);
  const cb = Object.fromEntries((R.drops.craftBosses || []).map(b => [b.id, b]));
  const kindsN = Object.fromEntries(Object.entries(LB.summon.kinds || {}).map(([k, v]) => [k, v.n]));
  const summon = Object.entries(LB.summon.bosses || {}).map(([id, b]) => [id, (cb[id] || {}).name || (R.memories.find(m => m.id === id) || {}).label || id, kindsN[b.k] || b.k, cyc(b.cyc), (LB.boxes[b.box] || {}).n || b.box, rar(b.r), (LB.winNames || {})[b.win] || b.win, b.n]);
  const pools = Object.entries(LB.pools).map(([k, v]) => [k, Array.isArray(v) ? v.length : Object.keys(v).length, Array.isArray(v) ? v.slice(0, 60).map(x => (typeof x === 'string' ? itemN(x) : S(x))).join(', ') : Object.entries(v).map(([c, l]) => `${c}: ${Array.isArray(l) ? l.length : S(l)}`).join('; ')]);
  return {
    file: 'Enerium_Лутбоксы.xlsx', title: 'Лутбоксы: сундуки всех режимов',
    what: ['Сундуки игры (§23, ADR-0023, ADR-0037): семь сундуков, линии пула, редкости и окна, источники-режимы, сундуки за призванных врагов.',
      'Открытие — три броска генератора на предмет на сиде сервера (lootboxes/open.js); окна дают 10 000 б. п.'],
    sources: [UI('lootboxes'), 'tools/content-gen/lootboxes/build.js', UI('recipes')],
    team: [],
    sheets: [
      sheet('Сундуки', [col('id', 10), col('Сундук', 26), col('Линии', 50, W_), col('Предметов по редкости', 20), col('Валюта по редкости', 50, W_), col('Главное', 10)], boxes),
      sheet('Линии', [col('id', 10), col('Линия', 24), col('Вид', 10), col('Сколько по редкости', 60, W_), col('По циклу', 8), col('С цикла', 8)], lines),
      sheet('Редкости и окна', [col('Редкость', 14), col('Сундук', 14), col('Окно «лестница», б. п.', 50, W_), col('Окно «шальное»', 20), col('Ценность', 9)], rr, 'Окно «лестница» — редкость сундука и две ниже; «шальное» — любая редкость с малым шансом.'),
      sheet('Источники', [col('id', 10), col('Источник', 24), col('Сундук', 24), col('Основа', 40, W_), col('С цикла', 8), col('Неделя', 7), col('Предложение', 10)], modes),
      sheet('Призванные враги', [col('id', 10), col('Враг', 34), col('Вид', 18), col('Цикл', 6), col('Сундук', 24), col('Редкость', 12), col('Окно', 10), col('Сундуков', 8)], summon),
      sheet('Пулы', [col('Пул', 10), col('Записей', 8), col('Состав', 100, W_)], pools),
    ],
  };
}

/* ---------------- Лавка ---------------- */
function bookStore() {
  const price = t => { const x = ST.tiers[t]; return x ? `${x.rub} ₽ · $${(x.usd / 100).toFixed(2)}` : t; };
  const getN = { keys: 'рунные ключи', souls: 'души', enerium: 'Энериум', gold: 'золото', spirit: 'дух' };
  const gets = g => (g || []).map(([k, n]) => `${getN[k] || k} ${n}`).join(', ');
  const tiers = Object.entries(ST.tiers).map(([k, v]) => [k, v.rub, (v.usd / 100).toFixed(2)]);
  const chain = ST.chain.steps.map((s, i) => [i + 1, s.id, s.n, price(s.tier), gets(s.get), `×${ST.chain.x}`]);
  const packs = ST.packs.map(p => [p.id, p.n, price(p.tier), p.en, p.bonusBp, `×${p.firstX}`]);
  const subs = ST.subs.map(s => [s.id, s.n, price(s.tier), s.daily, s.days, s.maxDays]);
  const offers = Object.entries(ST.offers.kinds).map(([k, o]) => [k, o.n, o.when, S(o.life), o.limit, o.what]);
  const list = (ST.offers.list || []).map(o => [o.id, (ST.offers.kinds[o.of] || {}).n || o.of, o.cycle ? cyc(o.cycle) : '', price(o.tier), gets(o.get)]);
  const misc = [['Платный ряд пропуска', ST.pass.n + ' · ' + price(ST.pass.tier)], ['Реклама: Энериума за ролик', ST.ads.perView], ['Реклама: роликов в день', ST.ads.dayCap], ['Реклама: секунд', ST.ads.sec]];
  return {
    file: 'Enerium_Лавка.xlsx', title: 'Лавка Энериума и монетизация',
    what: ['Витрина доната (§32, ADR-0036): ступени цен для России и Запада, пять стартовых наборов цепочкой (все ×2), пять наборов Энериума (первая покупка ×2), три выдачи раз в сутки, платный ряд пропуска, лимитированные предложения, реклама за Энериум по желанию.'],
    sources: [UI('store'), 'tools/content-gen/store/build.js'],
    team: [],
    sheets: [
      sheet('Цены', [col('Ступень', 8), col('Рубли', 8), col('Доллары', 9)], tiers),
      sheet('Стартовые наборы', [col('Шаг', 5), col('id', 8), col('Набор', 24), col('Цена', 18), col('Что внутри', 50, W_), col('Множитель', 9)], chain),
      sheet('Наборы Энериума', [col('id', 6), col('Набор', 28), col('Цена', 18), col('Энериум', 9), col('Бонус, б. п.', 10), col('Первая покупка', 10)], packs),
      sheet('Выдачи', [col('id', 6), col('Выдача', 22), col('Цена', 18), col('Энериум в день', 10), col('Дней', 6), col('Не больше дней вперёд', 10)], subs),
      sheet('Предложения', [col('id', 8), col('Предложение', 22), col('Когда', 8), col('Живёт, с', 10), col('Лимит', 6), col('Что это', 60, W_)], offers),
      sheet('Предложения по циклам', [col('id', 8), col('Вид', 22), col('Цикл', 6), col('Цена', 18), col('Что внутри', 50, W_)], list),
      sheet('Пропуск и реклама', [col('Что', 30), col('Значение', 40)], misc),
    ],
  };
}

/* ---------------- достижения ---------------- */
function bookAchievements() {
  const A = W.ach, catN = Object.fromEntries(A.cats.map(c => [c.id, c.n])), gN = k => (A.groups[k] ? A.groups[k].n : k), kN = k => (A.kinds[k] ? A.kinds[k].n : k), mN = k => (A.metrics[k] ? A.metrics[k].n : k);
  const rows = A.list.map(a => [a.id, catN[a.cat] || a.cat, gN(a.g), a.s || '', `${a.k}/${a.ks}`, a.n, a.d, a.goal == null ? '' : a.goal, mN(a.m), kN(a.pk), a.v == null ? '' : a.v, rar(a.r), a.at ? S(a.at.o) : '', a.at ? S(a.at.e) : '', a.hint || '', a.from ? cyc(a.from) : '', ...pendRow('achievement', a.id)]);
  const firsts = A.firsts.map(f => [f.id, f.kind, cyc(f.c), f.n, f.d, f.title]);
  const cats = A.cats.map(c => [c.id, c.n, c.label, c.d]);
  const groups = Object.entries(A.groups).map(([k, g]) => [k, g.n]);
  const kinds = Object.entries(A.kinds).map(([k, v]) => [k, v.n, v.t, v.cap]);
  return {
    file: 'Enerium_Достижения.xlsx', title: 'Достижения и первенства сервера',
    what: ['Достижения (§29): персональные, возрождённые, таинственные — с наградой-пассивкой и днём получения у обычного и увлечённого игрока по прогону; первенства сервера по циклам с титулами.',
      NAMES_NOTE],
    sources: [UI('wanderer'), 'tools/content-gen/wanderer/achievements.js'],
    team: ['«День у обычного» и «День у увлечённого» — прогон темпа для команды', ...PEND_TEAM],
    sheets: [
      sheet('Достижения', [col('id', 8), col('Категория', 14), col('Тема', 18), col('Серия', 12), col('Ступень', 7), col('Название', 26), col('Условие', 50, W_), col('Цель', 8), col('Счётчик', 24), col('Награда', 24), col('Сила', 6), col('Редкость', 12),
        col('День у обычного', 9, T_), col('День у увлечённого', 9, T_), col('Подсказка', 40, W_), col('С цикла', 7), ...pendCols], rows),
      sheet('Первенства', [col('id', 18), col('Вид', 8), col('Цикл', 6), col('Название', 34), col('Условие', 50, W_), col('Титул', 28)], firsts),
      sheet('Категории', [col('id', 6), col('Категория', 14), col('Строка сундука', 20), col('Что это', 60, W_)], cats),
      sheet('Темы', [col('id', 8), col('Тема', 26)], groups),
      sheet('Виды наград', [col('id', 8), col('Награда', 24), col('Текст', 50, W_), col('Потолок суммы', 9)], kinds),
    ],
  };
}

/* ---------------- контракты ---------------- */
function bookContracts() {
  const rows = CT.order.map(k => { const v = CT.kinds[k]; return [k, v.n, CT.groups[v.grp] || v.grp, v.w, v.t, cyc(v.from), v.pace || '', v.go || '', v.p, v.what || '', v.need || '']; });
  const groups = Object.entries(CT.groups).map(([k, v]) => [k, v, CT.order.filter(o => CT.kinds[o].grp === k).length]);
  const rr = CT.rar.names.map((n, i) => [n, CT.rar.wBp[i], CT.rar.u10[i]]);
  return {
    file: 'Enerium_Контракты.xlsx', title: 'Контракты: 24 вида заданий',
    what: ['Контракты (§18): пул заданий на сиде, 24 вида в 13 группах, редкость задания, награды от целей; сундук ключей за планки.'],
    sources: [UI('contracts'), 'tools/content-gen/contracts/build.js'],
    team: [],
    sheets: [
      sheet('Виды заданий', [col('id', 10), col('Задание', 30), col('Группа', 26), col('Вес', 6), col('Тип', 6), col('С цикла', 7), col('Темп', 8), col('Куда ведёт', 14), col('Очки', 6), col('Что считается', 50, W_), col('Условие', 30, W_)], rows),
      sheet('Группы', [col('id', 8), col('Группа', 30), col('Видов', 7)], groups),
      sheet('Редкости', [col('Редкость', 14), col('Вес, б. п.', 10), col('Объём ×10', 10)], rr),
    ],
  };
}

/* ---------------- ритуалы ---------------- */
function bookRituals() {
  const tabs = Object.entries(RI.tabs).map(([k, t]) => [k, t.n, t.unitMs / 60000, (t.ms || []).map(x => x / 60000).join(' / '), t.crew ? `${t.crew.lo.join('/')} — ${t.crew.hi.join('/')}` : '', RI.text[k] || '']);
  const names = [];
  for (const [k, t] of Object.entries(RI.tabs)) { (t.names || []).forEach((band, i) => band.forEach(n => names.push([t.n, `ступень ${i + 1}`, n]))); (t.uniqueNames || []).forEach(n => names.push([t.n, 'за уникальным', n])); }
  const mem = RI.memory.map(p => [p.id, p.n, p.d, rar(p.r)]);
  const rules = Object.entries(RI.rules).map(([k, v]) => [k, S(v)]);
  const text = Object.entries(RI.text).map(([k, v]) => [k, v]);
  return {
    file: 'Enerium_Ритуалы.xlsx', title: 'Ритуалы и рабочие',
    what: ['Ритуалы (§19): вкладки рабочих и героев, длительности, бригады, имена ритуалов по ступеням, пассивки Памяти, что их ускоряют; исход решён при старте на сиде карточки.'],
    sources: [UI('rituals'), 'tools/content-gen/rituals/build.js'],
    team: [],
    sheets: [
      sheet('Вкладки', [col('id', 6), col('Вкладка', 12), col('Шаг, мин', 9), col('Длительности, мин', 40), col('Бригада по ступеням', 30), col('Текст игрока', 60, W_)], tabs),
      sheet('Имена ритуалов', [col('Вкладка', 12), col('Ступень', 14), col('Ритуал', 30)], names),
      sheet('Пассивки Памяти', [col('id', 6), col('Пассивка', 24), col('Эффект', 60, W_), col('Редкость', 12)], mem),
      sheet('Правила', [col('Правило', 16), col('Значение', 90, W_)], rules),
      sheet('Тексты', [col('id', 8), col('Текст игрока', 100, W_)], text),
    ],
  };
}

/* ---------------- Летопись ---------------- */
function bookChronicle() {
  const partN = Object.fromEntries(CH.parts.map(p => [p.id, p.n]));
  const open = o => { if (!o || !Object.keys(o).length) return 'сразу'; if (o.c) return `цикл ${ROMAN[o.c]}`; if (o.lv) return `уровень Странника ${o.lv}`; if (o.b) return `биом ${(bioById[o.b] || {}).n || o.b}`; return S(o); };
  const ch = CH.chapters.map(c => [c.id, partN[c.part] || c.part, c.n, c.tag || '', open(c.open), c.lead || '', (c.more || []).join('\n\n')]);
  const parts = CH.parts.map(p => [p.id, p.n, p.d, yes(p.ref)]);
  return {
    file: 'Enerium_Летопись.xlsx', title: 'Летопись: разделы и главы лора',
    what: ['Книга лора для игрока (§28.3): разделы, главы, когда открываются, главная мысль и «ещё». Тексты — без спойлеров: правило Летописи строже лестницы — слово «печать» в ней не звучит вовсе.'],
    sources: [UI('chronicle'), 'tools/content-gen/lore/chapters.js'],
    team: [],
    sheets: [
      sheet('Главы', [col('id', 10), col('Раздел', 12), col('Глава', 18), col('Метка', 10), col('Открывается', 22), col('Главная мысль', 60, W_), col('Ещё', 100, W_)], ch),
      sheet('Разделы', [col('id', 8), col('Раздел', 14), col('Что в нём', 60, W_), col('Справочный', 9)], parts),
    ],
  };
}

/* ---------------- неделя: Эхо, Событие, пропуск ---------------- */
function bookWeek() {
  const ev = EV.weeks;
  const weeks = EF.weeks.map(w => [w.race, w.civ, w.raid, (EF.foes[w.uber] || {}).name || w.uber, (EF.foes[w.many] || {}).name || w.many, w.squad.map(heroN).join(', '), (ev[w.race] || {}).n || '', (ev[w.race] || {}).an || '', (ev[w.race] || {}).line || '', w.answer || '']);
  const pass = [['Сезон пропуска', PS.season.n], ['Дней в сезоне', PS.season.days]];
  for (const [k, m] of Object.entries(PS.cal.miles || {})) pass.push([`Дар дня · отметка ${k}`, m.n]);
  const src = (EV.sources || []).map(s => [s.id, s.n, s.p, s.what]);
  return {
    file: 'Enerium_Неделя.xlsx', title: 'Неделя: Эхо, Событие, пропуск',
    what: ['Девять недель Эхо — древние цивилизации, их нашествия, Убер-боссы и отряды недели (ADR-0024, ADR-0025); Событие недели с акцентом (§27); сезон пропуска и отметки листа «Дар дня».'],
    sources: [UI('echo-foes'), UI('event'), UI('pass'), UI('roster')],
    team: ['«Недели» — «Чем отряд отвечает Уберу»: замысел подбора для команды'],
    sheets: [
      sheet('Недели', [col('Раса', 12), col('Цивилизация', 16), col('Нашествие', 30), col('Убер-босс', 24), col('Многоликий', 12), col('Отряд недели', 60, W_), col('Событие', 24), col('Акцент', 16), col('Строка События', 60, W_), col('Чем отряд отвечает Уберу', 80, TW)], weeks),
      sheet('Источники очков', [col('id', 10), col('Источник', 18), col('Очки', 6), col('Что считается', 50, W_)], src),
      sheet('Пропуск и Дар дня', [col('Что', 28), col('Название', 30)], pass),
    ],
  };
}

/* ---------------- реестр имён ---------------- */
const RENAME_KEY = 'renames';
function bookRegistry(books) {
  const names = [];
  const add = (cat, id, n, c, team, where) => { if (n) names.push({ cat, id: String(id), n: String(n), c: c || 0, team: !!team, where }); };
  const famN = f => R.fams[f] || f;
  for (const it of R.items) add('предмет · ' + famN(it.fam), it.id, it.n, it.cyc, it.team, 'Ресурсы · Предметы');
  for (const r of R.recipes) add('рецепт', r.id, r.n, r.cyc, r.team, 'Рецепты · Рецепты');
  for (const c of R.cycles) for (const b of c.biomes) { add('биом', b.id, b.n, c.n, c.team, 'Враги · Биомы'); add('босс биома', b.id, b.boss, c.n, c.team, 'Враги · Биомы'); add('рунный страж', b.id, b.guard, c.n, c.team, 'Враги · Биомы'); }
  for (const p of R.places) { add('крафтовое место', p.id, p.n, p.cyc, p.team, 'Рецепты · Крафтовые места'); if (p.boss) add('призванный враг', p.boss.id, p.boss.n, p.cyc, p.team, 'Враги · Призванные враги'); if (p.boss && p.boss.awake) add('пробуждённый', p.boss.awake.id, p.boss.awake.label, p.boss.awake.cyc || Math.max(2, p.cyc), p.team, 'Враги · Призванные враги'); }
  for (const m of R.memories) add('эхо босса биома', m.id, m.label, m.cyc, m.team, 'Рецепты · Эхо боссов биомов');
  for (const h of RO.heroes) add('герой', h.id, h.n, h.c, false, 'Герои · Герои');
  for (const s of RO.sets) add('сет', s.key, s.name, s.cycle, false, 'Сеты · Сеты');
  for (const w of RO.weeks) { add('цивилизация Эхо', w.race, w.civ, 2, false, 'Неделя · Недели'); add('нашествие Эхо', w.race, w.raid, 2, false, 'Неделя · Недели'); }
  for (const a of abList) add('способность · ' + a.school, a.id, a.n, abFirst[a.id] || 1, false, 'Способности · Способности');
  for (const sch of SCHOOLS) for (const [k, e] of Object.entries(L.sets[sch].eff || {})) add('эффект школы', sch + '.' + k, e.n, 1, false, 'Способности · Эффекты школ');
  for (const [k, f] of Object.entries(T.fams)) add('талисман', k, f.n, f.team ? 6 : 2, f.team, 'Талисманы · Линейки');
  for (const p of W.passives) add('пассивка Памяти', p.id, p.n, 2, false, 'Пассивки · Пассивки Памяти');
  for (const a of W.art.list) add('артефакт', a.id, a.n, a.from, false, 'Артефакты · Артефакты');
  for (const a of W.ach.list) add('достижение', a.id, a.n, a.from || 1, false, 'Достижения · Достижения');
  for (const f of W.ach.firsts) { add('первенство', f.id, f.n, f.c, false, 'Достижения · Первенства'); add('титул', f.id, f.title, f.c, false, 'Достижения · Первенства'); }
  for (const [k, f] of Object.entries(EF.foes)) add('враг Эхо', k, f.name, 2, false, 'Враги · Эхо');
  for (const a of EF.abilities) add('способность врага Эхо', a.id, a.n, 2, false, 'Враги · Способности Эхо');
  for (const [k, f] of Object.entries(BF.foes)) add('враг биома', k, f.name, (bioById[f.biome] || {}).cyc, false, 'Враги · Биомы 2–4');
  for (const a of BF.abilities) add('способность врага биома', a.id, a.n, 1, false, 'Враги · Способности биомов');
  for (const [k, f] of Object.entries(K.foes)) add('враг Мастерской', k, f.name, 1, false, 'Враги · Мастерская форм');
  for (const h of CF.hosts) { add('сонм', h.id, h.n, 2, false, 'Враги · Клан'); for (const [r, f] of Object.entries(h.figs)) add('фигура сонма', h.id + '.' + r, f.n, 2, false, 'Враги · Клан'); }
  for (const [k, s] of Object.entries(EQ.slots)) add('место снаряжения', k, s.n, 2, false, 'Снаряжение · Места');
  for (const [k, t] of Object.entries(EQ.templates)) add('шаблон снаряжения', k, t.n, 2, false, 'Снаряжение · Шаблоны');
  for (const [k, b] of Object.entries(LB.boxes)) add('сундук', k, b.n, 1, false, 'Лутбоксы · Сундуки');
  for (const s of ST.chain.steps) add('товар Лавки', s.id, s.n, 1, false, 'Лавка · Стартовые наборы');
  for (const s of ST.packs) add('товар Лавки', s.id, s.n, 1, false, 'Лавка · Наборы Энериума');
  for (const s of ST.subs) add('товар Лавки', s.id, s.n, 1, false, 'Лавка · Выдачи');
  for (const [k, o] of Object.entries(ST.offers.kinds)) add('предложение Лавки', k, o.n, 1, false, 'Лавка · Предложения');
  for (const [k, v] of Object.entries(CT.kinds)) add('задание контракта', k, v.n, v.from || 2, false, 'Контракты · Виды заданий');
  for (const [k, t] of Object.entries(RI.tabs)) { (t.names || []).flat().forEach((n, i) => add('ритуал', k + '.' + i, n, 2, false, 'Ритуалы · Имена ритуалов')); (t.uniqueNames || []).forEach((n, i) => add('ритуал за уникальным', k + '.u' + i, n, 2, false, 'Ритуалы · Имена ритуалов')); }
  for (const [k, w] of Object.entries(EV.weeks)) add('Событие', k, w.n, EV.from || 2, false, 'Неделя · Недели');
  add('сезон пропуска', PS.season.id, PS.season.n, 2, false, 'Неделя · Пропуск и Дар дня');
  for (const [k, m] of Object.entries(PS.cal.miles || {})) add('отметка Дара дня', k, m.n, 1, false, 'Неделя · Пропуск и Дар дня');
  for (const c of CH.chapters) add('глава Летописи', c.id, c.n, (c.open && c.open.c) || 1, false, 'Летопись · Главы');
  /* повторы: одно имя — разные сущности. Законные пары не считаются: рецепт и его выход, герой и предмет-герой,
     способность «одна цель» и эффект своей школы, город и глава о нём, босс биома и его карточка */
  const norm = s => s.toLowerCase().replace(/ё/g, 'е').replace(/[«»"]/g, '').trim();
  const recOut = Object.fromEntries(R.recipes.map(r => [r.id, r.out[0]]));
  const entity = x => {
    const itemEnt = id => (/^h_c\d_\d+$/.test(id) ? 'герой#' + id.slice(2).replace('_', '-') : 'предмет#' + id);
    if (x.cat === 'рецепт') return itemEnt(recOut[x.id]);
    if (x.cat.startsWith('предмет')) return itemEnt(x.id);
    if (x.cat === 'герой') return 'герой#' + x.id;
    if (x.cat === 'эффект школы') return 'эффект#' + x.n.toLowerCase();
    if (x.cat.startsWith('способность · ') && /\.one$/.test(x.id)) { const a = abById[x.id]; const e = a && (L.sets[a.school] || {}).eff; if (e && e[a.kind] && norm(e[a.kind].n) === norm(x.n)) return 'эффект#' + x.n.toLowerCase(); }
    return x.cat + '#' + x.id;
  };
  const by = {};
  for (const x of names) (by[norm(x.n)] = by[norm(x.n)] || []).push(x);
  const legit = (k, list) => {
    const cats = new Set(list.map(x => x.cat));
    if (k === 'многоликий') return 'Многоликий — один враг на все недели и его предмет-призыв';
    if (cats.has('глава Летописи') && list.length === 2 && (cats.has('крафтовое место') || cats.has('город'))) return 'город и глава Летописи о нём';
    if (cats.has('босс биома') && (cats.has('враг биома') || cats.has('враг Мастерской')) && list.length === 2) return 'босс биома и его карточка врага';
    if (cats.has('рунный страж') && (cats.has('враг биома') || cats.has('враг Мастерской')) && list.length === 2) return 'рунный страж и его карточка врага';
    if (cats.has('способность врага биома') && list.some(x => /Уникальный ресурс/.test(x.cat))) return 'уникальный ресурс босса и его пассивка — одно имя: эту вещь босс и роняет';
    if (cats.has('нашествие Эхо') && (cats.has('способность врага Эхо') || cats.has('враг Эхо'))) return 'нашествие — ульта или имя Убер-босса недели: так задумано';
    if (cats.has('враг Эхо') && cats.has('способность врага Эхо') && list.length === 2) return 'Убер-босс и его ульта — одно имя: так задумано';
    if (cats.has('призванный враг') && cats.has('герой') && list.length === 2) return 'один человек: душа-герой и память о нём — призванный враг; развести ли имена — вопрос автору';
    if ([...cats].every(c => c === 'ритуал' || c === 'ритуал за уникальным')) return '';
    return '';
  };
  const dups = [];
  for (const [k, list] of Object.entries(by)) {
    const ents = new Set(list.map(entity));
    if (ents.size < 2) continue;
    dups.push([list[0].n, ents.size, list.map(x => `${x.cat} ${x.id}${x.c ? ' · ' + cyc(x.c) : ''}`).join('; '), legit(k, list)]);
  }
  dups.sort((a, b) => (a[3] ? 1 : 0) - (b[3] ? 1 : 0) || String(a[0]).localeCompare(String(b[0]), 'ru'));
  const dupOf = Object.fromEntries(dups.filter(d => !d[3]).map(d => [norm(d[0]), d[1]]));
  const rows = names.map(x => [x.n, x.cat, x.id, cyc(x.c), yes(x.team), x.where, dupOf[norm(x.n)] ? `да, сущностей: ${dupOf[norm(x.n)]}` : ''])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'ru') || String(a[1]).localeCompare(String(b[1]), 'ru'));
  /* лестница спойлеров */
  const hint = [];
  for (const t of TX.collect()) for (const h of LAD.scan(t.text)) {
    const bad = !LAD.allowed(h.lvl, t.cyc, t.team);
    hint.push([cyc(t.cyc), h.lvl, bad ? 'НАРУШЕНИЕ' : (t.team ? 'для команды' : 'можно'), t.owner, t.where, h.hit, h.why, t.text.slice(Math.max(0, h.at - 60), h.at + h.hit.length + 60).replace(/\s+/g, ' ')]);
  }
  hint.sort((a, b) => (a[2] === 'НАРУШЕНИЕ' ? 0 : 1) - (b[2] === 'НАРУШЕНИЕ' ? 0 : 1) || ROMAN.indexOf(a[0]) - ROMAN.indexOf(b[0]) || String(a[3]).localeCompare(String(b[3])) || String(a[4]).localeCompare(String(b[4]), 'ru', { numeric: true }));
  const ladder = LAD.CYCLES.map(([c, d]) => [c, d]);
  const lex = LAD.LEX.map(l => [l.lvl, LAD.LEVELS[l.lvl], l.seen, l.why, l.src === 'digest' ? 'дайджест, «Нельзя показывать раннему игроку»' : l.src === 'gdd38' ? 'GDD §38' : 'свод лора']);
  /* переименования */
  const ren = [];
  for (const x of DONE.applied || []) ren.push(['применено', x.domain, x.id, x.was, x.now, x.why]);
  for (const x of PEND.renames || []) ren.push(['ждёт', x.domain, x.id, x.was, x.now, x.why]);
  const sum = books.map(b => [b.file, b.title, b.sheets.map(s => `${s.name} (${s.rows.length})`).join('; ')]);
  return {
    file: 'Enerium_Реестр_имён.xlsx', title: 'Реестр имён: все имена игры, повторы, спойлеры по циклам, переименования',
    what: ['Одна правда об именах: каждое имя из данных игры — что это, id, цикл, где в таблицах. Повторы одного имени у разных сущностей — отдельным листом; законные пары (рецепт и его выход, герой и его рецепт, способность и эффект её школы, город и глава Летописи) — с пометкой.',
      'Лестница спойлеров по слову автора и все совпадения её слов в текстах игрока по циклам; нарушения — сверху. Проверка — tools/content-gen/tables/check_spoilers.js.',
      'Переименования 01.10.2026 — все применены в данных (tools/content-gen/tables/renames-2026-10-01.json; отложенные, если появятся, — renames-pending.json). Список с причинами — docs/content/переименования-2026-10-01.md.'],
    sources: ['все книги этой папки', 'tools/content-gen/lore/ladder.js', 'tools/content-gen/tables/texts.js', 'tools/content-gen/tables/renames-2026-10-01.json', 'tools/content-gen/tables/renames-pending.json'],
    team: ['весь «Реестр имён» — для команды: в нём имена цикла VI и спойлеры'],
    sheets: [
      sheet('Имена', [col('Имя', 30), col('Что это', 26), col('id', 18), col('Цикл', 6), col('Для команды', 9), col('Где в таблицах', 28), col('Повтор', 16)], rows),
      sheet('Повторы', [col('Имя', 30), col('Сущностей', 9), col('Кто носит', 90, W_), col('Так задумано', 50, W_)], dups),
      sheet('Лестница спойлеров', [col('Цикл', 8), col('Правило', 100, W_)], ladder),
      sheet('Слова лестницы', [col('Ступень', 7), col('Что значит', 40), col('Слово источника', 22), col('Тайна', 40, W_), col('Источник', 36)], lex),
      sheet('Намёки по циклам', [col('Цикл', 6), col('Ступень', 7), col('Итог', 12), col('Чьи данные', 10), col('Где', 40), col('Слово', 16), col('Тайна', 34), col('Отрывок', 90, W_)], hint),
      sheet('Переименования', [col('Статус', 18), col('Что', 14), col('id', 18), col('Было', 30), col('Стало', 30), col('Почему', 80, W_)], ren),
      sheet('Книги', [col('Файл', 40), col('Что', 50, W_), col('Листы и строки', 100, W_)], sum),
    ],
  };
}

/* ---------------- сборка ---------------- */
function main() {
  const books = [bookPassives(), bookArtifacts(), bookTalismans(), bookSets(), bookAbilities(),
    bookEquipment(), bookResources(), bookRecipes(), bookHeroes(), bookFoes(), bookLoot(), bookStore(),
    bookAchievements(), bookContracts(), bookRituals(), bookChronicle(), bookWeek()];
  books.push(bookRegistry(books));
  const out = {
    ladder: { cycles: LAD.CYCLES, levels: LAD.LEVELS },
    books,
  };
  process.stdout.write(JSON.stringify(out));
}
if (require.main === module) main();
module.exports = { main };
