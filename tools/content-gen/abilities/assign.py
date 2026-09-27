"""Распределение способностей по героям и врагам Мастерской (ADR-0016).

Библиотека — library.py (ADR-0015), герои — docs/content/герои/герои.csv (build_heroes.py).
Правила автора 27.09.2026:
- у героя без доблести одна активная способность; каждая доблесть открывает новую; последняя доблесть — ульта,
  и у героя с одной доблестью тоже;
- школа — стихия героя; фарм-герои и герои без стихии берут набор «Без школы», фарм-герои — ещё и набор фарма;
- чем реже герой, тем чаще срабатывают его способности;
- провокации нет: танк держит врагов множителем угрозы (§5.3);
- враги берут записи библиотеки по классу и стихии, как герои.
Порядок видов по доблести, виды классов и ступени — предложение: правьте здесь.

  python tools/content-gen/abilities/assign.py

Выход:
  tools/content-gen/abilities/kits.json      — наборы героев и врагов для ядра и UI-кита;
  docs/content/распределение-способностей.md — черновик для автора.
"""
import csv
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
import library as L  # noqa: E402  библиотека собирается тем же кодом, что и черновик библиотеки

HEROES_CSV = ROOT / "docs/content/герои/герои.csv"
OUT_JSON = HERE / "kits.json"
OUT_MD = ROOT / "docs/content/распределение-способностей.md"

RAR = ["обычная", "редкая", "уникальная", "эпическая", "древняя", "первородная", "вневременная"]
RARITY_CH = [10000, 10500, 11000, 11500, 12000, 12500, 13000]   # шанс способностей × редкость героя, база 10 000

# что открывает доблесть 0, 1, 2, 3, 4; последняя доблесть героя — всегда ульта
UNLOCK = ["act", "act", "pas", "act", "react"]
UNLOCK_FARM = ["act", "pas", "act", "pas", "react"]   # фарм-герою пассивка добычи — раньше второй активной
SLOT_NAME = {"act": "активная", "pas": "пассивка", "react": "реакция", "ult": "ульта"}
ROMAN = ["", "I", "II", "III", "IV", "V", "VI"]

# виды классов: первая активная — главная работа класса, остальные — по кругу, чтобы наборы героев не совпадали.
# У вида — ступени в порядке предпочтения: all — на всех, grp — на 2–3, one — на одного.
CLASS = {
    "танк": {"first": ("dmg", ["grp", "one"]),
             "pool": [("debuff", ["grp", "one"]), ("ctrl", ["one", "grp"]), ("shield", ["grp", "one", "all"])],
             "ult": ["shield", "ctrl", "debuff"], "role": "tank"},
    "лекарь": {"first": ("heal", ["one", "all", "grp"]),
               "pool": [("hot", ["grp", "one", "all"]), ("shield", ["all", "grp", "one"]), ("buff", ["grp", "all", "one"])],
               "ult": ["heal", "hot", "shield"], "role": "heal"},
    "дебаффер": {"first": ("ctrl", ["one", "grp", "all"]),
                 "pool": [("debuff", ["grp", "one", "all"]), ("dot", ["grp", "one", "all"]), ("ctrl", ["all", "grp"])],
                 "ult": ["ctrl", "debuff", "dot"], "role": "ctrl"},
    "маг ДД": {"first": ("dmg", ["all", "grp", "one"]),
               "pool": [("dot", ["all", "grp", "one"]), ("debuff", ["all", "grp", "one"]), ("dmg", ["grp", "one", "all"])],
               "ult": ["dmg", "dot", "debuff"], "role": "dps"},
    "физ ДД силы": {"first": ("dmg", ["one", "grp"]),
                    "pool": [("debuff", ["one", "grp"]), ("dmg", ["grp", "all", "one"]), ("ctrl", ["one", "grp"])],
                    "ult": ["dmg", "debuff", "ctrl"], "role": "dps"},
    "физ ДД ловкости": {"first": ("dmg", ["one", "grp"]),
                        "pool": [("dot", ["one", "grp"]), ("dmg", ["grp", "one", "all"]), ("debuff", ["one", "grp"])],
                        "ult": ["dmg", "dot", "debuff"], "role": "dps"},
}
# фарм-герой: активные и ульта — из набора фарма, вторая активная — приём «Без школы», пассивки — добыча
FARM_SCHOOL_POOL = [("hot", ["grp", "all"]), ("debuff", ["grp", "one"]), ("dmg", ["grp", "one"])]

# какие пассивки и реакции подходят роли; не нашлось подходящей — любая из набора
PAS_ROLE = {
    "dps": {"nthBasicDot", "dmgWhileDot", "dmgVsDebuff", "dmgVsLow", "dmgVsDot", "critDmg", "armorPen", "speedWhileDot", "lifesteal", "dotLeft"},
    "tank": {"physReduce", "shieldUp", "evade", "dotReduce", "defWhileHot", "supportWhileDot", "lifesteal"},
    "heal": {"supportWhileDot", "healVsLow", "hotLeft", "cleanseBleedOnHeal", "healEveryN", "defWhileHot", "blindShorter", "ultUp", "shieldUp", "evade", "lifesteal"},
    "ctrl": {"debuffLeft", "dotLeft", "dotDrain", "ultUp", "dmgVsDebuff", "blindShorter", "speedWhileDot"},
}
REACT_ROLE = {
    "tank": {"hit", "critTaken", "half", "firstHit", "dodge", "lethal"},
    "heal": {"allyLow", "allyCrit", "allyDown", "healed"},
    "dps": {"crit", "kill", "low", "dodge"},
    "ctrl": {"foeUlt", "debuffed", "ccd", "kill"},
}

# враги Мастерской: записи библиотеки по классу и стихии; «как» — прежнее имя врага, если смысл совпал.
# (запись, имя врага или None, правило цели врага или None)
FOES = {
    "o1": ("Безликий образец", "Физ. ДД силы", "Земля", [("Земля.dmg.grp", None, None)]),
    "o2": ("Долгорукий образец", "Дебаффер", "Земля", [("Земля.ctrl.one", "Длинная рука", "healer")]),
    "o3": ("Пустотелый образец", "Маг. ДД", "Воздух", [("Воздух.dmg.all", None, None)]),
    "o4": ("Безголовый образец", "Танк", "Земля", [("Земля.debuff.grp", None, None)]),
    "o5": ("Сырой образец", "Лекарь", "Земля", [("Земля.heal.one", "Замазка", None)]),
    "o6": ("Однорукий образец", "Физ. ДД ловкости", "Земля", [("Земля.dmg.one", "Удар в спину", "healer")]),
    "e1": ("Подмастерье", "Физ. ДД силы", "Земля", [("Земля.dmg.one", "Замес", None), ("Земля.debuff.one", "Тяжёлая рука", None)]),
    "e2": ("Резчик", "Физ. ДД ловкости", "Земля", [("Земля.dot.one", None, None), ("Земля.dmg.one", "Снять лишнее", "lowest")]),
    "e3": ("Упор", "Танк", "Земля", [("Земля.dmg.grp", "Напор", None), ("Земля.shield.all", "Плита", None)]),
    "e4": ("Мех", "Маг. ДД", "Воздух", [("Воздух.dmg.all", "Меха", None), ("Воздух.ctrl.grp", "Сквозняк", None)]),
    "e5": ("Штопарь", "Лекарь", "Земля", [("Земля.heal.one", "Заплата", None), ("Земля.heal.all", "Шов", None)]),
    "e6": ("Съёмщик", "Дебаффер", "Земля", [("Земля.debuff.grp", "Съём", None), ("Земля.ctrl.grp", None, None)]),
    "b1": ("Первый набросок", "Босс", "Земля", [("Земля.dmg.one", "Правка", None), ("Земля.dmg.all", "Глиняный вал", None),
                                                ("Земля.ult.dmg", "Последний штрих", None)]),
    "g1": ("Мастер", "Страж", "Земля", [("Земля.dmg.one", "Резец Мастера", None), ("Земля.ctrl.one", "Остановись", None)]),
}
FOE_NOTES = {
    "o3": "прежний «Порыв» — массовый удар ветром; в библиотеке «Порыв» — контроль Воздуха, поэтому «Росчерк»",
    "o4": "прежний «Напор» был провокацией, провокации больше нет (ADR-0016)",
    "e2": "порезы Воздуха заменены ядом Земли",
    "e3": "«Напор» больше не провокация — удар по трём",
    "e6": "метка Огня заменена осыпанием Земли; «Снять форму» — снятия в библиотеке нет, взят контроль Земли",
    "b1": "пассивка «Незавершённость» — ярость босса, вне библиотеки",
}


def load():
    lib, every = L.build()
    by_id = {x["id"]: x for x in every}
    rows = list(csv.DictReader(HEROES_CSV.open(encoding="utf-8-sig")))
    return lib, by_id, rows


def rotate(xs, k):
    k %= len(xs)
    return xs[k:] + xs[:k]


def pick_active(lib, school, kind, prefs, k, used):
    """Способность вида из набора школы; ступень — по кругу от номера героя в группе, без повторов в наборе."""
    for tier in rotate(prefs, k):
        aid = f"{school}.{kind}.{tier}"
        if aid not in used:
            return aid
    return None


def pick_role(items, role_keys, key, k, used):
    fit = [x for x in items if x.get(key) in role_keys and x["id"] not in used] or [x for x in items if x["id"] not in used]
    return rotate(fit, k)[0]["id"] if fit else None


def hero_kit(lib, h, k):
    """Набор героя: [(доблесть, место, id способности)] по правилам автора."""
    classes = [c.strip() for c in h["класс"].split("/")]
    farm = classes[0] == "фармящий"
    school = h["стихия"] if h["стихия"] and not farm else "Без школы"
    maxv = int(h["максимум доблести"])
    order = (UNLOCK_FARM if farm else UNLOCK)[:maxv] + ["ult"]
    S, F = lib["sets"][school], lib["farm"]
    used, kit = set(), []
    main = CLASS.get(classes[0])
    role = main["role"] if main else "heal"
    # очередь активных: главная работа класса, затем второй класс сборного героя, затем круг видов главного класса
    if farm:
        acts = [("farm", rotate(F["active"], k)), ("school",) + FARM_SCHOOL_POOL[k % len(FARM_SCHOOL_POOL)], ("farm", rotate(F["active"], k + 1))]
    else:
        acts = [main["first"]]
        if len(classes) > 1:
            acts.append(CLASS[classes[1]]["first"])
        acts += rotate(main["pool"], k)
    ai = 0
    for v, slot in enumerate(order):
        aid = None
        if slot == "act":
            while aid is None and ai < len(acts):
                a = acts[ai]
                ai += 1
                if a[0] == "farm":
                    aid = next((x["id"] for x in a[1] if x["id"] not in used), None)
                elif a[0] == "school":
                    aid = pick_active(lib, school, a[1], a[2], k, used)
                else:
                    aid = pick_active(lib, school, a[0], a[1], k // 2, used)
        elif slot == "pas":
            aid = pick_role(F["passive"], {None}, "pas", k + len(kit), used) if farm else pick_role(S["passive"], PAS_ROLE[role], "pas", k, used)
        elif slot == "react":
            aid = pick_role(S["reaction"], REACT_ROLE.get(role, set()), "trig", k, used)
        else:
            if farm:
                aid = rotate(F["ult"], k)[0]["id"]
            else:
                kind = rotate(main["ult"], k)[0]
                aid = f"{school}.ult.{kind}"
        assert aid, (h["id"], v, slot)
        used.add(aid)
        kit.append((v, slot, aid))
    return school, kit


def build():
    lib, by_id, rows = load()
    groups = {}
    for h in sorted(rows, key=lambda r: r["id"]):
        key = (h["класс"].split("/")[0].strip(), h["стихия"])
        groups.setdefault(key, []).append(h["id"])
    heroes, seen = {}, {}
    for h in rows:
        key = (h["класс"].split("/")[0].strip(), h["стихия"])
        k = groups[key].index(h["id"])
        school, kit = hero_kit(lib, h, k)
        sig = tuple(x[2] for x in kit)
        tries = 0
        while sig in seen:            # одинаковых наборов не бывает: сдвигаем круг, пока набор не станет своим
            tries += 1
            assert tries < 60, (h["id"], seen[sig])
            k += len(groups[key])
            school, kit = hero_kit(lib, h, k)
            sig = tuple(x[2] for x in kit)
        seen[sig] = h["id"]
        r = RAR.index(h["редкость"])
        heroes[h["id"]] = {
            "name": h["имя"], "cls": h["класс"], "el": h["стихия"], "school": school, "rarity": h["редкость"], "maxV": int(h["максимум доблести"]),
            "chPct": RARITY_CH[r], "cycle": int(h["цикл"]), "order": h["орден"],
            "kit": [{"v": v, "slot": slot, "id": aid, "n": by_id[aid]["n"], "set": by_id[aid]["set"],
                     "ch": by_id[aid].get("ch"), "chR": by_id[aid]["ch"] * RARITY_CH[r] // 10000 if by_id[aid].get("ch") else None}
                    for v, slot, aid in kit]}
    foes = {}
    for fid, (name, cls, el, kit) in FOES.items():
        foes[fid] = {"name": name, "cls": cls, "el": el, "note": FOE_NOTES.get(fid, ""),
                     "kit": [{"id": aid, "n": by_id[aid]["n"], "as": skin, "tgt": tgt, "set": by_id[aid]["set"], "ch": by_id[aid].get("ch")}
                             for aid, skin, tgt in kit]}
    data = {"rules": {"unlock": UNLOCK, "unlockFarm": UNLOCK_FARM, "rarityCh": dict(zip(RAR, RARITY_CH)),
                      "tankThreat": "провокации нет: танк держит врагов множителем угрозы (§5.3, ADR-0016)"},
            "heroes": dict(sorted(heroes.items())), "foes": foes}
    return data, by_id


# ---------------- черновик для автора ----------------
KIND_SHORT = {"dmg": "урон", "heal": "лечение", "shield": "щит", "dot": "урон по времени", "hot": "лечение по времени",
              "ctrl": "контроль", "debuff": "дебафф", "buff": "бафф", "farm": "фарм"}
TIER_SHORT = {"all": "на всех", "grp": "на 2–3", "one": "на одного", "self": "на этаж"}


def label(x, by_id):
    a = by_id[x["id"]]
    if x["slot"] == "ult":
        return f"ульта «{a['n']}»"
    if a["kind"] == "passive" or a["kind"] == "farmPassive":
        return f"{a['n']} — пассивка"
    if a["kind"] == "reaction":
        return f"{a['n']} — реакция"
    kind = "фарм" if a["kind"] == "farm" else KIND_SHORT[a["kind"]]
    return f"{a['n']} — {kind}, {TIER_SHORT.get(a.get('tier'), '')}".rstrip(", ")


def write_md(data, by_id):
    H = data["heroes"]
    L_ = []
    A = L_.append
    A("# Распределение способностей")
    A("")
    A("**Черновик · предложение · ждёт автора.** 27.09.2026. Собрано `tools/content-gen/abilities/assign.py` из библиотеки (`docs/content/библиотека-способностей.md`) "
      "и таблицы героев `docs/content/герои/герои.csv`. Правьте в скрипте, иначе следующая сборка затрёт правку. Данные — `tools/content-gen/abilities/kits.json`. "
      "Решения — ADR-0016.")
    A("")
    A("## Правила")
    A("")
    A("Решения автора 27.09.2026:")
    A("- у героя без доблести одна активная способность, каждая доблесть открывает новую, последняя доблесть — ульту. Так и у героя с одной доблестью;")
    A("- доблесть даёт ещё и +30 % к базовым характеристикам (§3);")
    A("- школа — стихия героя. Фарм-герои и герои без стихии берут набор «Без школы», фарм-герои — ещё и набор фарма;")
    A("- чем реже герой, тем чаще срабатывают его способности;")
    A("- провокации нет: танк держит врагов множителем угрозы (§5.3);")
    A("- враги Мастерской берут записи библиотеки по классу и стихии, как герои.")
    A("")
    A("**Что открывает доблесть** — порядок видов предложен, решает автор:")
    A("")
    A("| Максимум доблести | Доблесть 0 | 1 | 2 | 3 | 4 | 5 |")
    A("|---|---|---|---|---|---|---|")
    for mv in range(1, 6):
        order = UNLOCK[:mv] + ["ult"]
        A(f"| {mv} | " + " | ".join(SLOT_NAME[s] for s in order) + " |" + " |" * (5 - mv))
    A("")
    A("Фарм-герою пассивка добычи открывается раньше второй активной: активная, пассивка, активная, пассивка, реакция.")
    A("")
    A("**Шанс по редкости** — множитель к шансу каждой способности героя. Сумма шансов карты — по-прежнему не больше 60 % (§5.1). Числа — демонстрация.")
    A("")
    A("| Редкость | " + " | ".join(RAR) + " |")
    A("|---|" + "---|" * len(RAR))
    A("| Шанс × | " + " | ".join(f"{c / 10000:.2f}".replace(".", ",") for c in RARITY_CH) + " |")
    A("")
    A("**Виды по классам** — главная работа класса открывается первой, остальные виды идут по кругу, чтобы наборы героев одного класса и стихии не совпадали:")
    A("")
    A("| Класс | Доблесть 0 | Дальше по кругу | Ульта |")
    A("|---|---|---|---|")
    for cls, c in CLASS.items():
        A(f"| {cls} | {KIND_SHORT[c['first'][0]]} | {', '.join(KIND_SHORT[p[0]] for p in c['pool'])} | {', '.join(KIND_SHORT[u] for u in c['ult'])} |")
    A("| фармящий | фарм | приём «Без школы», фарм | фарм |")
    A("")
    A("Сборный герой с двумя классами открывает вторую активную из работы второго класса. Пассивка и реакция подбираются под роль класса. Двух одинаковых наборов нет.")
    A("")
    cycles = sorted({h["cycle"] for h in H.values()})
    for cyc in cycles:
        hs = [(hid, h) for hid, h in H.items() if h["cycle"] == cyc]
        A(f"## Цикл {ROMAN[cyc]} · {L.plural(len(hs), 'герой', 'героя', 'героев')}")
        A("")
        A("| Герой | Класс · стихия | Редкость | Способности по доблести |")
        A("|---|---|---|---|")
        for hid, h in hs:
            kit = "; ".join(f"{x['v']} — {label(x, by_id)}" for x in h["kit"])
            el = h["el"] or "без стихии"
            school = f" · {h['school']}" if h["school"] != h["el"] else ""
            A(f"| {h['name']} · `{hid}` | {h['cls']} · {el}{school} | {h['rarity']}, шанс × {h['chPct'] / 10000:.2f}".replace(".", ",") + f" | {kit} |")
        A("")
    A("## Враги Мастерской")
    A("")
    A("Враги берут те же записи библиотеки. Имя врага — прежнее, если смысл совпал. Шанс врага — без множителя редкости.")
    A("")
    A("| Враг | Класс · стихия | Способности | Заметка |")
    A("|---|---|---|---|")
    for fid, f in data["foes"].items():
        ab = "; ".join((f"{x['as']} = " if x["as"] and x["as"] != x["n"] else "") + label({"id": x["id"], "slot": "ult" if ".ult." in x["id"] else "act"}, by_id)
                       + (f", цель — {'лекарь' if x['tgt'] == 'healer' else 'самый раненый'}" if x["tgt"] else "") for x in f["kit"])
        A(f"| {f['name']} | {f['cls']} · {f['el']} | {ab} | {f['note']} |")
    A("")
    A("## Открыто — решает автор")
    A("")
    A("1. **Порядок видов по доблести:** вторая активная, пассивка, третья активная, реакция. Годится?")
    A("2. **Виды по классам** — таблица выше.")
    A("3. **Множители шанса по редкости** — от × 1,00 до × 1,30.")
    A("4. **Угроза танка:** провокации нет, множитель угрозы танка — × 3. Настроим прогонами, когда библиотека встанет в ядро.")
    A("5. **«Незавершённость» босса** — ярость по мере ран, вне библиотеки. Оставить боссам свои пассивки?")
    OUT_MD.write_text("\n".join(L_) + "\n", encoding="utf-8")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    data, by_id = build()
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    write_md(data, by_id)
    n = len(data["heroes"])
    per = {}
    for h in data["heroes"].values():
        per[len(h["kit"])] = per.get(len(h["kit"]), 0) + 1
    print(f"Героев {n}, наборы уникальны; способностей в наборе: " + ", ".join(f"{k} — {v}" for k, v in sorted(per.items()))
          + f"; врагов {len(data['foes'])} → {OUT_JSON.relative_to(ROOT)}, {OUT_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
