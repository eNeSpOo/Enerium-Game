#!/usr/bin/env python3
"""Таблицы Excel из данных игры: source-data/*.xlsx.

Данные игры — правда: таблицы показывают игру как она есть. Пять книг носят имена таблиц автора 26.09.2026 и стоят на их месте;
оригиналы лежат без изменений в source-data/оригиналы-2026-09-26/, их хеши — в source-data/provenance.json. Остальные книги —
снаряжение, ресурсы, рецепты, герои, враги, лутбоксы, Лавка, достижения, контракты, ритуалы, Летопись, неделя и реестр имён.

Содержимое книг собирает tools/content-gen/tables/collect.js (Node читает данные прототипа design/ui/*.js и сборщиков); этот
скрипт пишет .xlsx чистым Python — zipfile и XML листов со строками inline, без сторонних библиотек — и следит за свежестью.
В каждой книге первый лист «Как читать»: что за таблица, откуда данные, дата, как пересобрать, какие поля только для команды,
лестница спойлеров по циклам. Шапка листов данных закреплена, у шапки — фильтр, ширина столбцов — по смыслу; столбцы только
для команды — с оранжевой шапкой. Запись детерминирована: те же данные — те же байты.

Свежесть: отпечаток данных книги (sha256 её содержимого) и хеш файла пишутся в provenance.json записью {"table": имя файла, …};
записи оригиналов автора — {"file": имя, "path": путь в архиве, …}: читатели, что ищут таблицу автора по "file", находят оригинал.

Запуск:
  python tools/content-gen/tables/build.py           — собрать и записать то, что устарело;
  python tools/content-gen/tables/build.py --check   — ничего не писать: таблицы свежие относительно данных, файлы не правлены руками,
                                                       оригиналы целы; иначе код 1.
Последний шаг порядка сборки tools/content-gen/README.md — после всех данных.
"""
import datetime
import hashlib
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'source-data'
PROV = OUT / 'provenance.json'
ARCHIVE = 'оригиналы-2026-09-26'
COLLECT = ROOT / 'tools' / 'content-gen' / 'tables' / 'collect.js'
BUILDER = 'tools/content-gen/tables/build.py'
FORMAT = 2                      # вид книги: меняется вёрстка — поднять номер, отпечаток сменится, книги пересоберутся
ZIP_TIME = (1980, 1, 1, 0, 0, 0)

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
BAD = re.compile('[\x00-\x08\x0b\x0c\x0e-\x1f]')
# стили ячеек: 0 обычная, 1 шапка, 2 шапка «для команды», 3 перенос, 4 заголовок, 5 подпись
STYLES = HEAD + f'''<styleSheet xmlns="{NS}">
<fonts count="4"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FF7A2E00"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8CBAD"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF808080"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>'''


def colname(i):
    """0 → A, 25 → Z, 26 → AA"""
    s = ''
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def cell(ref, v, style=0):
    st = f' s="{style}"' if style else ''
    if isinstance(v, bool):
        v = 'да' if v else ''
    if isinstance(v, int):
        return f'<c r="{ref}"{st}><v>{v}</v></c>'
    if isinstance(v, float):
        raise ValueError(f'дробное число в таблице: {ref} = {v} — только целые')
    t = BAD.sub('', str(v))
    if t == '':
        return f'<c r="{ref}"{st}/>' if style else ''
    if len(t) > 32000:
        t = t[:32000] + '…'
    return f'<c r="{ref}"{st} t="inlineStr"><is><t xml:space="preserve">{escape(t)}</t></is></c>'


def sheet_xml(cols, rows, freeze=True, styles_row0=None, label_col=False):
    """cols: [{h, w, team, wrap}]; rows: списки значений. Первая строка — шапка из cols (если cols не пустые)."""
    n = max([len(cols)] + [len(r) for r in rows]) or 1
    nrows = len(rows) + (1 if cols else 0)
    last = f'{colname(n - 1)}{max(nrows, 1)}'
    out = [HEAD, f'<worksheet xmlns="{NS}" xmlns:r="{NS_R}">', f'<dimension ref="A1:{last}"/>']
    if freeze and cols:
        out.append('<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
                   '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>')
    else:
        out.append('<sheetViews><sheetView workbookViewId="0"/></sheetViews>')
    out.append('<sheetFormatPr defaultRowHeight="15"/>')
    out.append('<cols>' + ''.join(f'<col min="{i + 1}" max="{i + 1}" width="{int(c.get("w", 12))}" customWidth="1"/>' for i, c in enumerate(cols)) + '</cols>')
    out.append('<sheetData>')
    r = 1
    if cols:
        out.append(f'<row r="1">' + ''.join(cell(f'{colname(i)}1', c['h'], 2 if c.get('team') else 1) for i, c in enumerate(cols)) + '</row>')
        r = 2
    wrap = [bool(c.get('wrap')) for c in cols]
    for row in rows:
        cells = []
        for i, v in enumerate(row):
            style = 3 if (i < len(wrap) and wrap[i]) else 0
            if label_col and i == 0:
                style = 5
            if styles_row0 is not None and r == 1:
                style = styles_row0
            cells.append(cell(f'{colname(i)}{r}', v, style))
        out.append(f'<row r="{r}">' + ''.join(cells) + '</row>')
        r += 1
    out.append('</sheetData>')
    if freeze and cols and rows:
        out.append(f'<autoFilter ref="A1:{colname(len(cols) - 1)}{nrows}"/>')
    out.append('</worksheet>')
    return ''.join(out)


def safe_sheet_name(s, used):
    s = re.sub(r'[\[\]:*?/\\]', ' ', s).strip()[:31] or 'Лист'
    base, k = s, 2
    while s in used:
        s = (base[:28] + f' {k}')[:31]
        k += 1
    used.add(s)
    return s


def write_xlsx(path, title, date, sheets):
    """sheets: [(name, xml, (filter ref) | None)]"""
    used, names = set(), []
    for name, _, _ in sheets:
        names.append(safe_sheet_name(name, used))
    ct = [HEAD, '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
          '<Default Extension="xml" ContentType="application/xml"/>',
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>']
    ct += [f'<Override PartName="/xl/worksheets/sheet{i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(len(sheets))]
    ct += ['<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
           '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
           '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>', '</Types>']
    rels = HEAD + ('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                   '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
                   '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
                   '</Relationships>')
    defined = []
    for i, (_, _, flt) in enumerate(sheets):
        if flt:
            q = names[i].replace("'", "''")
            defined.append(f'<definedName name="_xlnm._FilterDatabase" localSheetId="{i}" hidden="1">\'{escape(q)}\'!{flt}</definedName>')
    wb = HEAD + (f'<workbook xmlns="{NS}" xmlns:r="{NS_R}"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="15000" activeTab="0"/></bookViews><sheets>'
                 + ''.join(f'<sheet name="{escape(n, {chr(34): "&quot;"})}" sheetId="{i + 1}" r:id="rId{i + 1}"/>' for i, n in enumerate(names))
                 + '</sheets>' + (f'<definedNames>{"".join(defined)}</definedNames>' if defined else '') + '</workbook>')
    wbrels = HEAD + ('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                     + ''.join(f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i + 1}.xml"/>' for i in range(len(sheets)))
                     + f'<Relationship Id="rId{len(sheets) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                     + '</Relationships>')
    stamp = f'{date}T00:00:00Z'
    core = HEAD + ('<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" '
                   'xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
                   f'<dc:title>{escape(title)}</dc:title><dc:creator>{BUILDER}</dc:creator>'
                   f'<dcterms:created xsi:type="dcterms:W3CDTF">{stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{stamp}</dcterms:modified></cp:coreProperties>')
    app = HEAD + ('<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
                  'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Энериум — таблицы из данных игры</Application></Properties>')
    parts = [('[Content_Types].xml', ''.join(ct)), ('_rels/.rels', rels), ('docProps/core.xml', core), ('docProps/app.xml', app),
             ('xl/workbook.xml', wb), ('xl/_rels/workbook.xml.rels', wbrels), ('xl/styles.xml', STYLES)]
    parts += [(f'xl/worksheets/sheet{i + 1}.xml', xml) for i, (_, xml, _) in enumerate(sheets)]
    tmp = path.with_name(path.name + '.tmp')
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in parts:
            info = zipfile.ZipInfo(name, date_time=ZIP_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, data.encode('utf-8'))
    tmp.replace(path)


def rows_word(n):
    """1 строка, 2 строки, 5 строк, 11 строк, 21 строка"""
    if 11 <= n % 100 <= 14:
        return f'{n} строк'
    return f'{n} ' + {1: 'строка', 2: 'строки', 3: 'строки', 4: 'строки'}.get(n % 10, 'строк')


def how_to_read(book, date, digest, ladder):
    """Лист «Как читать»: строки [подпись, текст]"""
    rows = [['Что это', line] for line in book['what']]
    rows.append(['Откуда данные', '\n'.join(book['sources'])])
    rows.append(['Собрано', f'{date} — из данных игры сборщиком {BUILDER} (содержимое — tools/content-gen/tables/collect.js)'])
    rows.append(['Отпечаток данных', f'{digest[:16]} — sha256 содержимого книги; по нему --check видит, что данные изменились'])
    rows.append(['Как пересобрать', f'python {BUILDER} — последним шагом порядка сборки (tools/content-gen/README.md), после всех данных.\n'
                 f'python {BUILDER} --check — только проверить, что таблицы свежие: ничего не пишет.'])
    rows.append(['Как править', 'Таблица — вывод данных игры: правка здесь пропадёт при следующей сборке. Править — в исходниках, сборщиках tools/content-gen/*, '
                 'затем пересборка по порядку и все проверки. Оригиналы таблиц автора 26.09.2026 — source-data/оригиналы-2026-09-26/, без изменений.'])
    for s in book['sheets']:
        rows.append([f'Лист «{s["name"]}»', f'{rows_word(len(s["rows"]))}.' + (f' {s["note"]}' if s.get('note') else '')])
    team = book.get('team') or []
    rows.append(['Только для команды', ('\n'.join(team) + '\n' if team else 'Отдельных служебных столбцов нет.\n')
                 + 'Столбцы только для команды — с оранжевой шапкой. Строки с пометкой «для команды» (цикл VI, спойлеры §38) игроку не показываются.'])
    rows.append(['Спойлеры по циклам', 'Правило автора 01.10.2026: «чем глубже, тем очевиднее».\n'
                 + '\n'.join(f'{c} — {d}' for c, d in ladder['cycles'])
                 + '\nСтупени слов: ' + '; '.join(f'{k} — {v}' for k, v in ladder['levels'].items())
                 + '.\nПроверка — node tools/content-gen/tables/check_spoilers.js; все совпадения по циклам — «Реестр имён», лист «Намёки по циклам».'])
    rows.append(['Числа', 'Только целые: доли — в базисных пунктах (б. п., из 10 000) или в процентах, как в данных; время — в миллисекундах или минутах. '
                 'Числа со статусом «демонстрация» — заглушки, не баланс.'])
    return rows


def book_digest(book, ladder):
    payload = {'format': FORMAT, 'book': book, 'ladder': ladder}
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()


def sha_file(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def load_prov():
    if not PROV.exists():
        return []
    return json.loads(PROV.read_text(encoding='utf-8'))


def save_prov(prov):
    PROV.write_text(json.dumps(prov, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def collect():
    r = subprocess.run(['node', str(COLLECT)], cwd=str(ROOT), capture_output=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr.decode('utf-8', 'replace'))
        raise SystemExit('collect.js упал — таблицы не собраны')
    return json.loads(r.stdout.decode('utf-8'))


def originals_problems(prov):
    out = []
    for e in prov:
        if 'file' in e and e.get('path'):
            p = OUT / e['path']
            if not p.exists():
                out.append(f'оригинал {e["path"]}: файла нет')
            elif sha_file(p) != e['sha256']:
                out.append(f'оригинал {e["path"]}: хеш не совпадает с provenance.json — оригиналы не меняются')
    return out


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    check = '--check' in sys.argv
    data = collect()
    ladder = data['ladder']
    prov = load_prov()
    tables = {e['table']: e for e in prov if 'table' in e}
    today = datetime.date.today().isoformat()
    problems, written, fresh = originals_problems(prov), [], []
    names = set()
    for book in data['books']:
        fname = book['file']
        names.add(fname)
        digest = book_digest(book, ladder)
        entry = tables.get(fname)
        path = OUT / fname
        same = entry is not None and entry.get('data_sha256') == digest
        if check:
            if entry is None:
                problems.append(f'{fname}: нет в provenance.json — собрать: python {BUILDER}')
            elif not same:
                problems.append(f'{fname}: устарела — данные игры изменились; пересобрать: python {BUILDER}')
            elif not path.exists():
                problems.append(f'{fname}: файла нет')
            elif sha_file(path) != entry.get('sha256'):
                problems.append(f'{fname}: файл не совпадает с provenance.json — правлен руками или не дописан; пересобрать: python {BUILDER}')
            else:
                fresh.append(fname)
            continue
        if same and path.exists() and sha_file(path) == entry.get('sha256'):
            fresh.append(fname)
            continue
        date = entry['built'] if same else today
        sheets = [('Как читать', sheet_xml([{'h': book['title'], 'w': 24}, {'h': '', 'w': 110}], how_to_read(book, date, digest, ladder), freeze=False, label_col=True), None)]
        for s in book['sheets']:
            xml = sheet_xml(s['cols'], s['rows'])
            flt = f'$A$1:${colname(len(s["cols"]) - 1)}${len(s["rows"]) + 1}' if s['rows'] else None
            sheets.append((s['name'], xml, flt))
        write_xlsx(path, book['title'], date, sheets)
        tables[fname] = {'table': fname, 'built': date, 'builder': BUILDER, 'data_sha256': digest, 'sha256': sha_file(path),
                         'sheets': {s['name']: len(s['rows']) for s in book['sheets']}}
        written.append(fname)
    extra = [k for k in tables if k not in names]
    if check:
        for k in extra:
            problems.append(f'{k}: запись в provenance.json есть, а книги среди собираемых нет')
        if problems:
            print('ОШИБКИ:\n' + '\n'.join('  ' + p for p in problems))
            raise SystemExit(1)
        print(f'Таблицы свежие: {len(fresh)} книг, оригиналы автора целы.')
        return
    for k in extra:
        del tables[k]
    originals = [e for e in prov if 'table' not in e]
    save_prov(originals + [tables[k] for k in sorted(tables)])
    bad = [h for b in data['books'] if b['file'] == 'Enerium_Реестр_имён.xlsx' for s in b['sheets'] if s['name'] == 'Намёки по циклам' for h in s['rows'] if h[2] == 'НАРУШЕНИЕ']
    print(f'Записано книг: {len(written)}, свежих без записи: {len(fresh)}.' + (f' Внимание: нарушений лестницы спойлеров — {len(bad)}, см. check_spoilers.js.' if bad else ''))
    for p in problems:
        print('ОШИБКА: ' + p)
    if problems:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
