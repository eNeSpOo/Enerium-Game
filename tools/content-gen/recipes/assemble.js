/* Склейка docs/content/ресурсы-рецепты-дроп.md: текст doc-a…doc-d.md, таблицы из tables.md вместо @@имя@@,
   числа из блока inline вместо {{имя}}. Запускать после node build.js. */
const fs = require('fs'), path = require('path');
const NL = String.fromCharCode(10);
const t = fs.readFileSync(path.join(__dirname, 'tables.md'), 'utf8');
const blocks = {}; const re = /<!-- (.+?) -->\n([\s\S]*?)(?=<!-- |$)/g; let m;
while ((m = re.exec(t))) blocks[m[1]] = m[2].trim();
const inline = {};
for (const line of (blocks.inline || '').split(NL)) { const i = line.indexOf(': '); if (i > 0) inline[line.slice(0, i)] = line.slice(i + 2); }
let doc = ['doc-a.md', 'doc-b.md', 'doc-c.md', 'doc-d.md'].map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('');
doc = doc.replace(/@@(.+?)@@/g, (_, k) => { if (!(k in blocks)) throw new Error('нет блока ' + k); return NL + blocks[k] + NL; });
doc = doc.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in inline)) throw new Error('нет числа ' + k); return inline[k]; });
doc = doc.replace(/\n{3,}/g, NL + NL);
fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'docs', 'content', 'ресурсы-рецепты-дроп.md'), doc, 'utf8');
console.log('blocks', Object.keys(blocks).length, 'inline', Object.keys(inline).length, 'chars', doc.length, 'left', (doc.match(/@@|\{\{/g) || []).length);
