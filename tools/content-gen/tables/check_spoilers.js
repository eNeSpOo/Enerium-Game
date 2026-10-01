/* Проверка спойлеров по правилу автора — лестница по циклам (tools/content-gen/lore/ladder.js):
   I–II — ни спойлеров, ни намёков; III — слабые намёки; IV — заметнее; V — очевиднее, без прямого раскрытия §38; VI — для команды.
   Проходит все тексты игрока в данных игры (tools/content-gen/tables/texts.js): названия, описания, лор, подсказки Этриона, главы
   героев, тексты режимов. Цикл текста — цикл, с которого его видит игрок; текст «для команды» лестница не держит.
   Ошибка — ступень шаблона раньше своего цикла: D (раскрытие) — до VI, H3 — до V, H2 — до IV, H1 — до III.
   Ещё: враги спуска до 11-го биома — без искажённых, нежити и Перворождённых; слова лестницы — в своих источниках (verify).
   Нарушения печатаются по хозяину данных: где править.
   Запуск: node tools/content-gen/tables/check_spoilers.js          — проверка, код 1 при нарушениях;
           node tools/content-gen/tables/check_spoilers.js --all    — ещё и все намёки по циклам, что разрешены. */
'use strict';
const LAD = require('../lore/ladder.js');
const TX = require('./texts.js');
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

function run() {
  const err = [], ok = [];
  for (const e of LAD.verify()) err.push({ owner: 'lore', where: 'лестница', text: e });
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
