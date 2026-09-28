/* Чтение листа xlsx без библиотек: zip (центральный каталог + inflateRaw из zlib) и разбор XML листа регулярными выражениями.
   Хватает для таблиц автора в source-data/: общие строки, числа, встроенные строки. Формулы не считает — берёт сохранённые значения.
   Оригинал не меняется. */
const fs = require('fs'), zlib = require('zlib');

function unzip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('не zip: нет конца центрального каталога');
  const count = buf.readUInt16LE(eocd + 10), files = {};
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('битый центральный каталог zip');
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28), raw = buf.subarray(start, start + size);
    files[name] = method === 0 ? raw : method === 8 ? zlib.inflateRawSync(raw) : null;
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unxml = s => s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] ?? m));
const texts = xml => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)].map(m => unxml(m[1] || '')).join('');
const colNo = ref => [...ref.match(/^[A-Z]+/)[0]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);

/* Лист по имени → массив строк; строка — массив ячеек (строки как есть, пустые — ''). */
function readSheet(file, sheetName) {
  const z = unzip(fs.readFileSync(file)), str = k => (z[k] ? z[k].toString('utf8') : '');
  const shared = [...str('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => texts(m[1]));
  const rels = Object.fromEntries([...str('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map(m => [m[0].match(/Id="([^"]+)"/)[1], m[0].match(/Target="([^"]+)"/)[1]]));
  const sheet = [...str('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)].map(m => m[0]).find(s => unxml(s.match(/name="([^"]+)"/)[1]) === sheetName);
  if (!sheet) throw new Error(`${file}: нет листа «${sheetName}»`);
  let target = rels[sheet.match(/r:id="([^"]+)"/)[1]];
  target = target.startsWith('/') ? target.slice(1) : 'xl/' + target;
  const rows = [];
  for (const rm of str(target).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1], body = cm[2] || '', ref = attrs.match(/r="([A-Z]+)\d+"/)[1], t = (attrs.match(/t="([^"]+)"/) || [])[1];
      const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      row[colNo(ref) - 1] = t === 's' ? shared[+v] : t === 'inlineStr' ? texts(body) : v !== undefined ? unxml(v) : '';
    }
    rows.push(Array.from(row, x => x === undefined ? '' : x));
  }
  return rows;
}

module.exports = { readSheet };
