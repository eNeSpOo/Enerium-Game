# Собирает герои.csv из файлов цикл-N.md и печатает распределения.
import csv, re, sys, io
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3] / "docs" / "content" / "герои"

RACE = {
    "эльфийка": "Эльфы", "эльф": "Эльфы",
    "дворф": "Дворфы", "дворфийка": "Дворфы",
    "северянин": "Люди", "северянка": "Люди",
    "человек запада": "Люди", "человек": "Люди", "человек, Эндалор": "Люди",
    "Забытые": "Забытые", "зверь": "Звери",
}
GEN = {"лекаря": "лекарь", "танка": "танк", "дебаффера": "дебаффер",
       "мага": "маг ДД", "ловкости": "физ ДД ловкости", "силы": "физ ДД силы"}
RAR = ["обычная", "редкая", "уникальная", "эпическая", "древняя", "первородная", "вневременная"]

card_re = re.compile(r"^`(h\d\d_\d)`\s·\s(.+)$")
rows = []
for n in range(1, 7):
    text = (ROOT / f"цикл-{n}.md").read_text(encoding="utf-8").splitlines()
    set_name = set_type = None
    set_no = None
    name = None
    cur = None
    for line in text:
        m = re.match(r"^## (\d+)\. (.+?)(?: — братство)?$", line)
        if m:
            set_no = int(m.group(1))
            set_name = m.group(2).strip()
            set_type = "братство" if line.endswith("— братство") else "орден"
            continue
        if line.startswith("## "):
            set_name = None
        m = re.match(r"^### (.+)$", line)
        if m:
            name = m.group(1).strip()
            continue
        m = card_re.match(line)
        if m and set_name:
            hid = m.group(1)
            parts = [p.strip() for p in m.group(2).split("·")]
            # раса может содержать запятую ("человек, Эндалор") — она не разделитель
            race_raw, cls_raw, elem, rar, cyc, acq, val = parts
            cm = re.match(r"^(.+?) \(приёмы (\w+)\)$", cls_raw)
            if cm:
                cls = f"{cm.group(1)} / {GEN[cm.group(2)]}"
            else:
                cls = "фармящий" if cls_raw == "фармящий класс" else cls_raw
            cur = {
                "id": hid, "имя": name, "орден": set_name, "тип сета": set_type,
                "цикл": int(cyc.replace("цикл ", "")), "класс": cls, "стихия": elem,
                "раса": RACE[race_raw], "редкость": rar, "получение": acq,
                "максимум доблести": int(val.replace("доблесть до ", "")),
                "строка витрины": None, "_set_no": set_no, "_race_raw": race_raw,
            }
            rows.append(cur)
            continue
        m = re.match(r"^- \*\*Витрина:\*\* «(.+)»\.?$", line)
        if m and cur and cur["строка витрины"] is None:
            cur["строка витрины"] = m.group(1)

# проверки
errs = []
ids = [r["id"] for r in rows]
if len(ids) != len(set(ids)): errs.append("повтор id")
names = Counter(r["имя"] for r in rows)
for k, v in names.items():
    if v > 1: errs.append(f"повтор имени {k}")
for r in rows:
    if not r["строка витрины"]: errs.append(f"нет витрины {r['id']}")
    if r["редкость"] not in RAR: errs.append(f"редкость {r['id']} {r['редкость']}")
    if r["получение"] == "золото" and RAR.index(r["редкость"]) > 3: errs.append(f"золото выше эпической {r['id']}")
    if r["получение"] == "сборный" and RAR.index(r["редкость"]) < 1: errs.append(f"сборный обычный {r['id']}")
    if r["получение"] == "сборный" and "/" not in r["класс"]: errs.append(f"сборный без второго класса {r['id']}")
by_set = defaultdict(list)
for r in rows: by_set[(r["_set_no"], r["орден"])].append(r)
for k, v in by_set.items():
    s = sum(x["максимум доблести"] for x in v)
    if len(v) != 5 or s != 15: errs.append(f"сет {k}: {len(v)} героев, бюджет {s}")

# главы: число пунктов-глав должно совпадать с максимумом
for n in range(1, 7):
    lines = (ROOT / f"цикл-{n}.md").read_text(encoding="utf-8").splitlines()
    cur_id, chapters = None, 0
    def close():
        if cur_id:
            want = next(r for r in rows if r["id"] == cur_id)["максимум доблести"]
            if chapters != want: errs.append(f"{cur_id}: глав {chapters}, максимум {want}")
    for line in lines:
        m = card_re.match(line)
        if m:
            close(); cur_id, chapters = m.group(1), 0; continue
        if line.startswith("## ") or line.startswith("### "):
            if line.startswith("## "):
                close(); cur_id = None
            continue
        if cur_id and re.match(r"^\d\. \*\*", line): chapters += 1
    close()

out = ROOT / "герои.csv"
cols = ["id", "имя", "орден", "тип сета", "цикл", "класс", "стихия", "раса",
        "редкость", "получение", "максимум доблести", "строка витрины"]
with open(out, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f, lineterminator="\n")
    w.writerow(cols)
    for r in sorted(rows, key=lambda r: r["id"]):
        w.writerow([r[c] for c in cols])

sys.stdout.reconfigure(encoding="utf-8")
print("героев:", len(rows), "сетов:", len(by_set))
print("ошибки:", errs or "нет")
def show(title, key, order=None):
    c = Counter(key(r) for r in rows)
    items = [(k, c[k]) for k in order] if order else c.most_common()
    print(title, "; ".join(f"{k} {v}" for k, v in items if v))
show("класс основной:", lambda r: r["класс"].split(" / ")[0])
show("стихия:", lambda r: r["стихия"])
show("раса:", lambda r: r["раса"])
show("народ:", lambda r: r["_race_raw"])
show("редкость:", lambda r: r["редкость"], RAR)
show("получение:", lambda r: r["получение"])
show("максимум:", lambda r: r["максимум доблести"], [1, 2, 3, 4, 5])
show("по циклам:", lambda r: r["цикл"], [1, 2, 3, 4, 5, 6])
for cyc in range(1, 7):
    sub = [r for r in rows if r["цикл"] == cyc]
    print(f" цикл {cyc}: стихии", dict(Counter(r["стихия"] for r in sub)), "расы", dict(Counter(r["раса"] for r in sub)))
print("сборные по сетам:", {k[1]: sum(1 for x in v if x["получение"] == "сборный") for k, v in by_set.items()})
print("вторые классы сборных:", dict(Counter(r["класс"].split(" / ")[1] for r in rows if " / " in r["класс"])))
print("редкость × получение:", dict(Counter((r["получение"], r["редкость"]) for r in rows)))
