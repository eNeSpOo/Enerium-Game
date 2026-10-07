/* Проверка спойлеров по правилу автора — лестница по циклам (tools/content-gen/lore/ladder.js):
   I–II — ни спойлеров, ни намёков; III — слабые намёки; IV — заметнее; V — очевиднее, без прямого раскрытия §38; VI — раскрытие:
   игрок получает его в игре, в цикле VI, раньше — нет (слово автора 06.10.2026, ADR-0054).
   Проходит все тексты игрока в данных игры (tools/content-gen/tables/texts.js): названия, описания, лор, подсказки Этриона, главы
   героев, тексты режимов. Цикл текста — цикл, с которого его видит игрок; текст «для команды» лестница не держит.
   Ошибка — ступень шаблона раньше своего цикла: D (раскрытие) — до VI, H3 — до V, H2 — до IV, H1 — до III.
   Закон самой лестницы (LAD.lawCheck) сверяется каждый прогон: раскрытие открыто игроку в цикле VI и закрыто в циклах I–V;
   проба на словах лестницы — то же слово-раскрытие в тексте игрока цикла V — нарушение, цикла VI — нет; --mut — поломки лестницы.
   Ещё: враги спуска до 11-го биома — без искажённых, нежити и Перворождённых; слова лестницы — в своих источниках (verify).
   Нарушения печатаются по хозяину данных: где править.
   Запуск: node tools/content-gen/tables/check_spoilers.js          — проверка, код 1 при нарушениях;
           node tools/content-gen/tables/check_spoilers.js --all    — ещё и все намёки по циклам, что разрешены. */
'use strict';
const LAD = require('../lore/ladder.js');
const TX = require('./texts.js');
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/* проба лестницы на её же словах: слово каждой ступени — нарушение в цикле перед её циклом и не нарушение в её цикле; текст
   «для команды» лестница не держит. Раскрытие (D) в тексте игрока цикла VI — не нарушение (ADR-0054) */
function probe(L) {
  const A = L || LAD, out = [];
  for (const x of A.LEX) {
    const c = A.LAW[x.lvl], say = x.seen;
    if (!A.scan(say).some(h => h.lvl === x.lvl)) continue;   // слово источника шаблон берёт не всегда: «мать» — только как фигура
    if (A.violations(say, c, false).some(h => h.lvl === x.lvl)) out.push(`лестница: «${say}» (${x.lvl}) — нарушение в цикле ${c}, а с него слово открыто игроку`);
    if (c > 1 && !A.violations(say, c - 1, false).some(h => h.lvl === x.lvl)) out.push(`лестница: «${say}» (${x.lvl}) — не нарушение в цикле ${c - 1}, а открыто только с цикла ${c}`);
    if (A.violations(say, 1, true).length) out.push(`лестница: «${say}» — нарушение в тексте «для команды»`);
  }
  return out;
}
/* мутации: лестница с одной поломкой — закон или проба обязаны её назвать */
function mutate() {
  const MUT = [
    ['раскрытие открыто игроку с цикла V', F => { F.D = 5; }],
    ['раскрытие закрыто и в цикле VI — «только для команды»', F => { F.D = 7; }],
    ['явный намёк открыт с цикла IV', F => { F.H3 = 4; }],
    ['слабый намёк открыт с цикла II', F => { F.H1 = 2; }],
    ['заметный намёк открыт только с цикла V', F => { F.H2 = 5; }],
  ];
  let caught = 0; const miss = [];
  for (const [what, f] of MUT) {
    const F = Object.assign({}, LAD.FROM); f(F);
    const A = Object.assign({}, LAD, { FROM: F, violations: (text, cyc, team) => LAD.scan(text).filter(h => !(team || cyc >= F[h.lvl])) });
    if (LAD.lawCheck(F).length && probe(A).length) caught++; else miss.push(what);
  }
  console.log(`Проверка мутацией лестницы спойлеров: поломок ${MUT.length}, поймано ${caught}.` + (miss.length ? '\n' + miss.map(s => '  ✗ не поймана: ' + s).join('\n') : ''));
  process.exit(miss.length ? 1 : 0);
}
function run() {
  const err = [], ok = [];
  for (const e of LAD.verify()) err.push({ owner: 'lore', where: 'лестница', text: e });
  for (const e of LAD.lawCheck().concat(probe())) err.push({ owner: 'lore', where: 'лестница', text: e });
  for (const t of TX.collect()) {
    for (const h of LAD.scan(t.text)) {
      const rec = { owner: t.owner, cyc: t.cyc, where: t.where, lvl: h.lvl, hit: h.hit, why: h.why, ctx: t.text.slice(Math.max(0, h.at - 50), h.at + h.hit.length + 50).replace(/\s+/g, ' ') };
      (LAD.allowed(h.lvl, t.cyc, t.team) ? ok : err).push(rec);
    }
  }
  for (const r of TX.descentRaces()) if (LAD.DESCENT_RACES.test(r.text) && r.cyc <= 5) err.push({ owner: r.owner, cyc: r.cyc, where: r.where, lvl: 'D', hit: r.text, why: 'искажённые, нежить и Перворождённые во врагах спуска — только с 11-го биома', ctx: r.text });
  return { err, ok };
}

if (require.main === module) {
  if (process.argv.includes('--mut')) mutate();
  const { err, ok } = run();
  const fmt = r => r.cyc ? `  цикл ${ROMAN[r.cyc]} · ${r.lvl} · ${r.where}: «${r.hit}» — ${r.why}\n      …${r.ctx}…` : `  ${r.where}: ${r.text}`;
  if (process.argv.includes('--all')) {
    console.log(`Намёки, что лестница разрешает (${ok.length}):`);
    for (const r of ok.sort((a, b) => a.cyc - b.cyc || a.owner.localeCompare(b.owner))) console.log(fmt(r));
  }
  if (!err.length) { console.log(`Спойлеры по циклам: нарушений нет. Намёков на своих ступенях: ${ok.length}.`); process.exit(0); }
  const by = {};
  for (const r of err) (by[r.owner] = by[r.owner] || []).push(r);
  console.log(`ОШИБКИ: нарушений лестницы спойлеров — ${err.length}.`);
  for (const [owner, list] of Object.entries(by)) {
    const o = TX.OWNERS[owner];
    console.log(`\n${owner}${o ? ` — ${o.src}` : ''} (${list.length}):`);
    for (const r of list) console.log(fmt(r));
  }
  process.exit(1);
}

module.exports = { run };
