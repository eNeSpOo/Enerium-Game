/* Проверка описаний, которые игрок читает о способностях и эффектах (ADR-0052, слово автора 06.10.2026: «там просто где-то указывается
   осыпание, а что это такое видно только в игре… когда игрок не понимает что покупает — это не есть хорошо»).
   Запуск из корня репозитория: node tools/content-gen/abilities/check_texts.js          — проверка;
                                node tools/content-gen/abilities/check_texts.js --mut    — проверка мутацией: каждую поломку ловит закон;
                                node tools/content-gen/abilities/check_texts.js --list   — все названия эффектов по текстам, для глаз.
   Закон О1 — тот же, что у сборщика библиотеки (library.py): в описании нет названия эффекта без объяснения. Название эффекта видно
   по основам слов (stems), объяснение — по образцу (proof); оба — в словаре эффектов library.json, fx: один словарь на сборщик
   и на эту проверку. Сборщик сверяет свои 397 записей при сборке — с чертами врагов (ADR-0051); здесь — всё, что игрок видит о способностях на экранах:
   - библиотека (abilities.js) — книга героя, книга «до покупки», урок, окно карты в бою, бестиарий, лист цели клана;
   - уникальные способности врагов: Эхо (echo-foes.js) и биомов (biome-foes.js) — окно карты в бою, урок о хозяйке леса, бестиарий;
   - талисманы и свойства снаряжения (talismans.js, equipment.js): в бою они — строки «пассивка» и «реакция» окна карты.
   Прежняя библиотека ядра (battle.js, LIB) не сверяется: это справочная модель темпа — карта с набором её описаний не показывает.
   Ещё: описание не длиннее rules.descMax знаков (строка способности видна на странице «Навыки» целиком), без знаков разметки;
   описание в abilities.js — то же, что в library.json; словарь эффектов для экранов (EN_ABILITIES.fx) — тот же, что в library.json.
   HOMONYM — слова, что звучат как эффект боя, но говорят о другом: исключения названы поимённо, с причиной. */
'use strict';
const fs = require('fs'), path = require('path');
const UI = path.join(__dirname, '../../../design/ui/');
globalThis.window = globalThis;
for (const f of ['abilities.js', 'kits.js', 'battle.js', 'echo-foes.js', 'biome-foes.js', 'talismans.js', 'equipment.js']) require(UI + f);
const LIB = JSON.parse(fs.readFileSync(path.join(__dirname, 'library.json'), 'utf8'));
const A = globalThis.EN_ABILITIES;
const MAX = LIB.rules.descMax;
const FX = Object.entries(LIB.fx).map(([key, f]) => ({ key, n: f.n, stems: new RegExp(f.stems), proof: new RegExp(f.proof) }));
const plain = s => String(s == null ? '' : s).toLowerCase().replace(/\u00a0/g, ' ');
const named = d => { const t = plain(d); return FX.filter(f => f.stems.test(t)); };
const unproved = d => { const t = plain(d); return named(d).filter(f => !f.proof.test(t)).map(f => f.n); };
/* одноимённые слова — не эффекты боя: [откуда, чьё, название эффекта, почему это не он] */
const HOMONYM = [
  ['талисманы', '«Кадильница предков»', 'ускорение', 'речь об ускорении ритуалов — их время сокращают рабочие и талисманы; эффекта боя «ускорение» здесь нет'],
];
const homonym = (src, who, n) => HOMONYM.some(h => h[0] === src && h[1] === who && h[2] === n);

/* все тексты: [откуда, чьё, текст] */
function texts() {
  const out = [];
  for (const s of A.sets) for (const x of s.items) out.push(['библиотека', `«${x.n}» (${x.id})`, x.d]);
  for (const x of globalThis.EN_ECHO_FOES.abilities || []) out.push(['Эхо', `«${x.n}» (${x.id})`, x.d]);
  for (const x of globalThis.EN_BIOME_FOES.abilities || []) out.push(['биомы', `«${x.n}» (${x.id})`, x.d]);
  for (const f of Object.values(globalThis.EN_TALISMANS.fams || {})) if (f.fx) out.push(['талисманы', `«${f.n}»`, f.fx]);
  for (const [k, v] of Object.entries(globalThis.EN_EQUIPMENT.kinds || {})) if (v.fx) out.push(['снаряжение', `«${v.n || k}»`, v.fx]);
  return out;
}

function check(list) {
  const bad = [];
  for (const [src, who, d] of list) {
    const un = unproved(d).filter(n => !homonym(src, who, n));
    if (un.length) bad.push(`О1 · ${src} · ${who}: название эффекта без объяснения (${un.join(', ')}) — «${d}»`);
    if (String(d).length > MAX) bad.push(`О3 · ${src} · ${who}: описание длиннее ${MAX} знаков (${String(d).length}) — «${d}»`);
    if (/[<>"]|\ue000|\ue001|\ue002|\ue003/.test(d)) bad.push(`О3 · ${src} · ${who}: в описании знак разметки или служебный знак — «${d}»`);
  }
  return bad;
}

/* библиотека на экране — та же, что собрал сборщик: описание и словарь эффектов */
function same() {
  const bad = [], byId = {};
  for (const s of Object.values(LIB.sets)) for (const p of ['active', 'ult', 'passive', 'reaction']) for (const x of s[p]) byId[x.id] = x;
  for (const p of ['passive', 'active', 'ult']) for (const x of LIB.farm[p]) byId[x.id] = x;
  for (const p of ['active', 'ult']) for (const x of LIB.combos[p]) byId[x.id] = x;
  for (const p of ['passive', 'reaction']) for (const x of (LIB.foeTraits || {})[p] || []) byId[x.id] = x;   // черты врагов (ADR-0051)
  let n = 0;
  for (const s of A.sets) for (const x of s.items) { n++; if (!byId[x.id] || byId[x.id].d !== x.d) bad.push(`abilities.js: описание «${x.n}» (${x.id}) не то, что в library.json`); }
  if (n !== Object.keys(byId).length) bad.push(`abilities.js: записей ${n}, в library.json — ${Object.keys(byId).length}`);
  const F = A.fx || {};
  for (const [k, f] of Object.entries(LIB.fx)) {
    const g = F[k];
    if (!g || g.n !== f.n || g.gloss !== f.gloss || g.def !== f.def || (g.t || '') !== (f.t || '')) bad.push(`abilities.js: словарь эффектов — «${f.n}» (${k}) не тот, что в library.json`);
  }
  /* определение эффекта набора (sets[].eff) — то же, что в словаре: окно карты в бою берёт имя и смысл оттуда */
  for (const s of A.sets) if (s.eff) for (const [kind, [name, def]] of Object.entries(s.eff)) {
    const f = Object.values(LIB.fx).find(x => x.n === name);
    if (!f || f.def !== def || f.school !== s.n || f.kind !== kind) bad.push(`abilities.js: эффект набора «${name}» (${s.n}) расходится со словарём эффектов`);
  }
  return bad;
}

const list = texts();
if (process.argv.includes('--list')) {
  for (const [src, who, d] of list) { const nm = named(d); if (nm.length) console.log(`${src} · ${who} · ${nm.map(f => f.n).join(', ')}${unproved(d).length ? ' · БЕЗ ОБЪЯСНЕНИЯ: ' + unproved(d).join(', ') : ''}\n    ${d}`); }
  process.exit(0);
}
if (process.argv.includes('--mut')) {
  /* проверка мутацией: поломка в памяти — закон должен её назвать */
  const pick = src => list.findIndex(x => x[0] === src);
  const withText = (src, d) => { const L2 = list.map(x => x.slice()); L2[pick(src)][2] = d; return L2; };
  const cases = [
    ['библиотека: описание называет эффект без объяснения', 'О1', withText('библиотека', 'Осыпание на цель, 4 раунда.')],
    ['Эхо: уникальная способность называет эффект без объяснения', 'О1', withText('Эхо', 'Ночь кладёт на героя старение на 3 раунда.')],
    ['биомы: уникальная способность называет эффект без объяснения', 'О1', withText('биомы', 'Сдирает баффы и кладёт слепоту на 2 раунда.')],
    ['талисман называет эффект без объяснения', 'О1', withText('талисманы', 'Обычная атака: {v} % шанс наложить на цель засветку на 2 раунда')],
    ['объяснение — о другом эффекте: названа метка, объяснено осыпание', 'О1', withText('биомы', 'Метка на героя: −30 % физической защиты, 2 раунда.')],
    ['описание длиннее предела', 'О3', withText('Эхо', 'Очень длинное описание. '.repeat(12))],
    ['в описании знак разметки', 'О3', withText('библиотека', 'Бьёт всех врагов — по <b>60</b> % атаки.')],
  ];
  let missed = 0;
  for (const [label, law, L2] of cases) {
    const hit = check(L2).filter(s => s.startsWith(law + ' ·'));
    if (!hit.length) missed++;
    console.log(`${hit.length ? 'пойман' : 'НЕ ПОЙМАН'} · ${law} · ${label}${hit.length ? ' → ' + hit[0].slice(0, 140) : ''}`);
  }
  /* и без поломки закон молчит */
  const clean = check(list).length;
  if (clean) { missed++; console.log(`НЕ ЧИСТО: без поломок закон называет ${clean} нарушений`); }
  console.log(`Проверка мутацией текстов способностей: поломок ${cases.length}, не поймано ${missed}.`);
  process.exit(missed ? 1 : 0);
}

const bad = check(list).concat(same());
const by = {};
for (const [src, , d] of list) { by[src] = by[src] || [0, 0]; by[src][0]++; if (named(d).length) by[src][1]++; }
if (bad.length) { console.log(bad.join('\n')); console.log(`\nНарушений: ${bad.length}. Тексты библиотеки правит tools/content-gen/abilities/library.py, уникальные способности — echo/weeks/*.js и biomes/data/*.js.`); process.exit(1); }
console.log(`Проверка пройдена: в описаниях нет названия эффекта без объяснения (закон О1, ADR-0052), длина — не больше ${MAX} знаков. `
  + Object.entries(by).map(([k, [n, e]]) => `${k} — ${n}, с эффектами ${e}`).join('; ') + `; эффектов в словаре ${FX.length}.`);
