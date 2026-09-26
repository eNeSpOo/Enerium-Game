# Выгружает героев и сеты из цикл-N.md в design/ui/heroes.js для UI-кита прототипа.
# Исходник — markdown циклов, как и для герои.csv (build_heroes.py). Файл heroes.js руками не править.
import html, json, re, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SRC = REPO / "docs" / "content" / "герои"
OUT = REPO / "design" / "ui" / "heroes.js"

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
field_re = re.compile(r"^- \*\*(.+?):\*\* (.+)$")
chapter_re = re.compile(r"^\d\. \*\*(.+?)\*\* ?(.*)$")
setpar_re = re.compile(r"^\*\*(.+?)[.:]\*\* ?(.*)$")
tier_re = re.compile(r"^\| (I{1,3}) \| (.+?) \| (.+?) \|$")
summary_re = re.compile(r"^\| (\d+) \| (.+?) \| (орден|братство) \| (.+?) \| (.+?) \| (.+?) \|$")


def md(text):
    """Экранирует HTML и переводит **жирный** и `код` — больше разметки в черновиках нет."""
    t = html.escape(text.strip(), quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    return t


def cls_of(raw):
    m = re.match(r"^(.+?) \(приёмы (\w+)\)$", raw)
    if m:
        return f"{m.group(1)} / {GEN[m.group(2)]}"
    return "фармящий" if raw == "фармящий класс" else raw


sets, heroes = [], []
for n in range(1, 7):
    lines = (SRC / f"цикл-{n}.md").read_text(encoding="utf-8").splitlines()
    summary = {}
    for line in lines:
        m = summary_re.match(line)
        if m:
            summary[int(m.group(1))] = {"domain": m.group(4), "budget": m.group(5), "roster": m.group(6)}
    cur_set = cur = None
    in_bonus = False
    for line in lines:
        m = re.match(r"^## (\d+)\. (.+?)(?: — братство)?$", line)
        if m:
            no = int(m.group(1))
            cur_set = {"no": no, "name": m.group(2).strip(), "type": "братство" if line.endswith("— братство") else "орден",
                       "cycle": n, **summary.get(no, {}), "who": "", "why": "", "show": "", "bonus": "", "tiers": [],
                       "motif": "", "team": []}
            sets.append(cur_set)
            cur = None
            in_bonus = False
            continue
        if line.startswith("## "):
            cur_set = cur = None
            continue
        if not cur_set:
            continue
        m = re.match(r"^### (.+)$", line)
        if m:
            cur = {"name": m.group(1).strip(), "set": cur_set["no"], "frags": [], "ch": [], "team": []}
            in_bonus = False
            continue
        m = card_re.match(line)
        if m and cur is not None:
            race_raw, cls_raw, elem, rar, cyc, acq, val = [p.strip() for p in m.group(2).split("·")]
            cur.update({"id": m.group(1), "cycle": int(cyc.replace("цикл ", "")), "folk": race_raw, "race": RACE[race_raw],
                        "cls": cls_of(cls_raw), "el": elem, "r": RAR.index(rar) + 1, "acq": acq,
                        "maxV": int(val.replace("доблесть до ", ""))})
            heroes.append(cur)
            continue
        if cur is None:
            # поля сета — до первого героя
            m = tier_re.match(line)
            if m and in_bonus:
                cur_set["tiers"].append([m.group(1), md(m.group(2)), md(m.group(3))])
                continue
            m = setpar_re.match(line)
            if m:
                label, text = m.group(1), m.group(2)
                in_bonus = label == "Бонус"
                if label.startswith("Кто они"):
                    cur_set["who"] = md(text)
                elif label == "Почему вместе":
                    cur_set["why"] = md(text)
                elif label == "Строка сета в витрине":
                    cur_set["show"] = md(text.strip().rstrip(".").strip("«»"))
                elif label == "Бонус":
                    cur_set["bonus"] = md(text)
                elif label == "Мотив для дедукции":
                    cur_set["motif"] = md(text)
                elif label in ("Для команды", "Сквозная нить", "Название", "Сначала прочти"):
                    cur_set["team"].append(f"<b>{label}.</b> " + md(text))
            continue
        m = field_re.match(line)
        if m:
            label, text = m.group(1), m.group(2)
            if label == "Витрина":
                cur["show"] = md(text.strip().rstrip(".").strip("«»"))
            elif label == "Роль в бою":
                cur["role"] = md(text)
            elif label == "Обрывки":
                cur["frags"] = [md(x.strip().rstrip(".").strip("«»")) for x in text.split(" · ")]
            elif label == "Источник осколков":
                cur["shards"] = md(text)
            elif label in ("Нити ордена", "Для команды"):
                cur["team"].append(f"<b>{label}.</b> " + md(text))
            continue
        m = chapter_re.match(line)
        if m:
            cur["ch"].append([md(m.group(1).rstrip(".")), md(m.group(2))])

errs = [f"{h['id']}: глав {len(h['ch'])}, максимум {h['maxV']}" for h in heroes if len(h["ch"]) != h["maxV"]]
errs += [f"{h['id']}: нет витрины" for h in heroes if not h.get("show")]
errs += [f"{h['id']}: обрывков {len(h['frags'])}" for h in heroes if len(h["frags"]) != 3]
errs += [f"сет {s['no']}: героев {sum(1 for h in heroes if h['set'] == s['no'])}" for s in sets if sum(1 for h in heroes if h["set"] == s["no"]) != 5]
sys.stdout.reconfigure(encoding="utf-8")
if errs:
    print("ошибки:", *errs, sep="\n  ")
    sys.exit(1)

data = {"sets": sets, "heroes": sorted(heroes, key=lambda h: h["id"])}
OUT.write_text("/* Собрано tools/content-gen/heroes/export_ui.py из docs/content/герои/цикл-1..6.md. Руками не править.\n"
               "   Черновик · ждёт автора. Поля team — только для команды: игрок их не видит. */\n"
               "window.EN_HEROES = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print(f"{OUT.relative_to(REPO).as_posix()}: героев {len(heroes)}, сетов {len(sets)}, {OUT.stat().st_size // 1024} КБ")
