/* Склейка документов крафта. Запускать после node build.js и python tempo.py.
   - docs/content/ресурсы-рецепты-дроп.md — правила, расчёты, решения: doc-1…doc-5.md;
   - docs/content/ресурсы-каталог.md — предметы по циклам с подсказками и артом: doc-items.md;
   - docs/content/рецепты-каталог.md — рецепты по циклам: doc-recipes.md.
   Таблицы — блоки tables.md и tempo.md вместо @@имя@@, числа — блоки inline и tempo-inline вместо {{имя}}. */
const fs = require('fs'), path = require('path');
const NL = String.fromCharCode(10);
const blocks = {};
for (const f of ['tables.md', 'tempo.md']) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) throw new Error(`нет ${f}: сначала node build.js и python tempo.py`);
  const t = fs.readFileSync(p, 'utf8').replace(/\r\n/g, NL);
  const re = /<!-- (.+?) -->\n([\s\S]*?)(?=<!-- |$)/g; let m;
  while ((m = re.exec(t))) blocks[m[1]] = m[2].trim();
}
const inline = {};
for (const b of ['inline', 'tempo-inline'])
  for (const line of (blocks[b] || '').split(NL)) { const i = line.indexOf(': '); if (i > 0) inline[line.slice(0, i)] = line.slice(i + 2); }
const OUT = path.join(__dirname, '..', '..', '..', 'docs', 'content');
const DOCS = [
  ['ресурсы-рецепты-дроп.md', ['doc-1.md', 'doc-2.md', 'doc-3.md', 'doc-4.md', 'doc-5.md']],
  ['ресурсы-каталог.md', ['doc-items.md']],
  ['рецепты-каталог.md', ['doc-recipes.md']],
];
for (const [name, parts] of DOCS) {
  let doc = parts.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/\r\n/g, NL)).join(NL);
  doc = doc.replace(/@@(.+?)@@/g, (_, k) => { if (!(k in blocks)) throw new Error(`${name}: нет блока ${k}`); return NL + blocks[k] + NL; });
  doc = doc.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in inline)) throw new Error(`${name}: нет числа ${k}`); return inline[k]; });
  doc = doc.replace(/\n{3,}/g, NL + NL);
  fs.writeFileSync(path.join(OUT, name), doc, 'utf8');
  console.log(`${name}: ${Buffer.byteLength(doc)} байт, осталось меток ${(doc.match(/@@|\{\{/g) || []).length}`);
}
