"""Опись выгрузки иконок сеткой в прототип — tools/art-gen/ui-icons.json.

Иконки рисуются листами (grid_slice.py режет их на клетки). Слабую клетку перерисовывают малым листом — задание с «fix» в id:
его клетка заменяет клетку большого листа. Клетка, поправленная обработкой, лежит рядом как <имя>.fix.webp и заменяет исходную.
Скрипт собирает из описей нарезки (cells.json) итоговую клетку на каждую иконку и пишет опись выгрузки для export_ui.py:
- способности — spells/<имя>.webp, имя — набор латиницей и id способности: «Огонь.dmg.all» → fire-dmg-all, «Сочетания.act.1» → combo-act-1,
  черта врага «враг.pas.1» → foe-pas-1
  (ART_ICONS.spell, art-icons.js);
- талисманы — tal/<ключ линейки>.webp (EN_TALISMANS.fams);
- снаряжение — gear/<слот>-<редкость>.webp (EN_EQUIPMENT.templates «слот.редкость»);
- ресурсы — res/<id>.webp (EN_RECIPES.items), «ресурс скрыт» — res/hidden.webp; предметы с готовой картинкой (img) и герои не рисуются.
И проверяет, что иконка есть у каждой способности библиотеки, линейки талисмана, шаблона снаряжения и предмета ресурсов.

  python tools/art-gen/ui_icons.py            # пересобрать ui-icons.json
  python tools/art-gen/export_ui.py --spec ui-icons.json --no-stamp --quiet
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
GEN = ROOT / "art" / "generated"
OUT = pathlib.Path(__file__).resolve().parent / "ui-icons.json"
SIZE = [256, 256]
SLUG = {"Огонь": "fire", "Земля": "earth", "Воздух": "air", "Тьма": "dark", "Вода": "water", "Свет": "light", "Время": "time",
        "Без школы": "none", "фарм": "farm", "Сочетания": "combo", "враг": "foe"}   # набор → латиница имени файла; то же в ART_ICONS.slug (design/ui/screens/art-icons.js); «враг» — черты врагов (ADR-0051)
KINDS = {
    "spell-icons": lambda cid, stem: None if stem.endswith("-alt") else f"spells/{stem}.webp",   # -alt — запасной вариант клетки, в выгрузку не идёт
    "talisman-icons": lambda cid, stem: None if stem.endswith("-alt") else f"tal/{cid}.webp",
    "equip-icons": lambda cid, stem: "gear/" + cid.replace(".", "-") + ".webp",
    "res-icons": lambda cid, stem: None if cid.startswith("spare") else f"res/{cid}.webp",   # spare — пустая клетка малого листа
}


def spell_stem(ability_id):
    """Имя файла иконки способности по её id: «Огонь.dmg.all» → fire-dmg-all, «фарм.act.1» → farm-act-1."""
    school, rest = ability_id.split(".", 1)
    return SLUG[school] + "-" + rest.replace(".", "-")


def cells(category):
    """Итоговая клетка на каждый путь выгрузки: большие листы, затем листы переделки по имени; .fix.webp — поверх клетки."""
    folder = GEN / category
    jobs = sorted((p for p in folder.glob("*/cells.json")), key=lambda p: ("fix" in p.parent.name, p.parent.name))
    got = {}
    for path in jobs:
        spec = json.loads(path.read_text(encoding="utf-8"))
        for c in spec["cells"]:
            f = ROOT / c["file"]
            dst = KINDS[category](c["id"], f.stem)
            if not dst:
                continue
            fix = f.with_name(f.stem + ".fix.webp")
            got[dst] = (fix if fix.exists() else f).relative_to(GEN).as_posix()
    return got


def res_ids():
    """Предметы ресурсов с иконкой сеткой: все EN_RECIPES.items, кроме готовой картинки (img) и героев (fam hero)."""
    code = ("global.window = globalThis; require(process.argv[1]); "
            "process.stdout.write(JSON.stringify(window.EN_RECIPES.items.filter(i => !i.img && i.fam !== 'hero').map(i => i.id)));")
    run = subprocess.run(["node", "-e", code, str(ROOT / "design/ui/recipes.js")], capture_output=True, text=True, encoding="utf-8")
    if run.returncode:
        sys.exit(f"recipes.js: {run.stderr.strip()[:300]}")
    return json.loads(run.stdout)


def js_keys(name, expr):
    """Ключи из файла данных прототипа: файл выполняется в Node, как в браузере, expr — выражение от window."""
    code = ("global.window = globalThis; require(process.argv[1]); "
            f"process.stdout.write(JSON.stringify(Object.keys({expr})));")
    run = subprocess.run(["node", "-e", code, str(ROOT / "design/ui" / name)], capture_output=True, text=True, encoding="utf-8")
    if run.returncode:
        sys.exit(f"{name}: {run.stderr.strip()[:300]}")
    return json.loads(run.stdout)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    items = {}
    for category in KINDS:
        items.update(cells(category))
    lib = json.loads((ROOT / "tools/content-gen/abilities/library.json").read_text(encoding="utf-8"))
    ids = [a["id"] for s in lib["sets"].values() for part in s.values() if isinstance(part, list) for a in part]
    ids += [a["id"] for part in lib["farm"].values() for a in part]
    ids += [a["id"] for part in lib.get("combos", {}).values() for a in part]   # сочетания — способности из двух (ADR-0050): «Сочетания.act.1» → combo-act-1
    ids += [a["id"] for part in lib.get("foeTraits", {}).values() for a in part]   # черты врагов (ADR-0051): «враг.pas.1» → foe-pas-1
    need = {f"spells/{spell_stem(i)}.webp": i for i in ids}
    need["spells/ability-hidden.webp"] = "способность скрыта"
    need.update({f"tal/{k}.webp": k for k in js_keys("talismans.js", "window.EN_TALISMANS.fams")})
    need["tal/hidden.webp"] = "талисман скрыт"
    need.update({"gear/" + k.replace(".", "-") + ".webp": k for k in js_keys("equipment.js", "window.EN_EQUIPMENT.templates")})
    res = res_ids()
    need.update({f"res/{i}.webp": i for i in res})
    need["res/hidden.webp"] = "ресурс скрыт"
    missing = [f"{v} ({k})" for k, v in need.items() if k not in items]
    extra = [k for k in items if k not in need]
    spec = {
        "note": "Иконки, нарисованные сеткой (слово автора 30.09.2026): способности библиотеки, линейки духовных талисманов, снаряжение по слоту и редкости, ресурсы. "
                "Собирает tools/art-gen/ui_icons.py из нарезки grid_slice.py — руками не править: клетка листа переделки заменяет клетку большого листа. "
                "Выгрузка: python tools/art-gen/export_ui.py --spec ui-icons.json --no-stamp. Пути читает design/ui/screens/art-icons.js (ART_ICONS.grid)",
        "out": "design/ui/assets/art",
        "size": SIZE,
        "items": dict(sorted(items.items())),
    }
    OUT.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    kinds = {}
    for k in items:
        kinds[k.split("/")[0]] = kinds.get(k.split("/")[0], 0) + 1
    print(f"ui-icons.json: {len(items)} иконок — " + ", ".join(f"{k} {v}" for k, v in kinds.items()))
    if missing or extra:
        if missing:
            print(f"! без иконки {len(missing)}: " + "; ".join(missing[:20]))
        if extra:
            print(f"! лишние записи {len(extra)}: " + "; ".join(extra[:20]))
        sys.exit(1)
    print(f"У каждой из {len(ids)} способностей, {len(need) - len(ids) - len(res) - 3} линеек и шаблонов, {len(res)} предметов ресурсов есть иконка")


if __name__ == "__main__":
    main()
