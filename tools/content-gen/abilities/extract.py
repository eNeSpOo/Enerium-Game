"""Таблица автора «Способности элементов» → source.json: исходник библиотеки способностей.

Оригинал не меняется (source-data/, ADR-0003). xlsx читается как zip с XML — без сторонних библиотек.

  python tools/content-gen/abilities/extract.py
"""
import json
import pathlib
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[3]
SRC = ROOT / "source-data/Enerium_Способности_элементов.xlsx"
OUT = pathlib.Path(__file__).with_name("source.json")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def sheet_rows(z, strings, n):
    x = ET.fromstring(z.read(f"xl/worksheets/sheet{n}.xml"))
    for r in x.find("m:sheetData", NS).findall("m:row", NS):
        row = []
        for c in r.findall("m:c", NS):
            v = c.find("m:v", NS)
            row.append("" if v is None else strings[int(v.text)] if c.get("t") == "s" else v.text)
        yield row


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    z = zipfile.ZipFile(SRC)
    strings = ["".join(t.text or "" for t in si.iter("{%s}t" % NS["m"]))
               for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)]
    rows = list(sheet_rows(z, strings, 1))
    head = rows[0]
    abilities = [dict(zip(head, r)) for r in rows[1:] if any(r)]
    rules = [" ".join(c for c in r if c).strip() for r in sheet_rows(z, strings, 2)]
    OUT.write_text(json.dumps({"source": "source-data/Enerium_Способности_элементов.xlsx",
                               "rules": [x for x in rules if x], "abilities": abilities},
                              ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(abilities)} способностей, {len([x for x in rules if x])} строк правил → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
