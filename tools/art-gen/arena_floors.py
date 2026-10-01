"""Арены этажей биомов 1–4 (ADR-0048): опись выгрузки и список готовых арен прототипа.

Задание — jobs/arena-floors.json: по три новых участка на биом к нынешней арене. После генерации и взгляда на картинки:

  python tools/art-gen/arena_floors.py spec                 # в ui-art.json — arena-bN-K.jpg 1688 × 716 из последней картинки задания
  python tools/art-gen/arena_floors.py spec --pick arena-b2-3=arenas/arena-b2-3__nb2-v2.jpg   # другой вариант, если последний хуже
  python tools/art-gen/export_ui.py --spec ui-art.json --no-stamp
  python tools/art-gen/arena_floors.py ready                # BS_ART.arenaReady в design/ui/screens/battle-scene.js — выгруженные

Без картинки задания строка в опись не пишется: выгрузка не падает на пустом месте. Концы строк описи и экрана (CRLF) сохраняются.
Проверка — node tools/content-gen/screens/check_battle_scene.js: готовые арены — на диске и в описи, выгруженные — в arenaReady.
"""
import argparse
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
TOOL = pathlib.Path(__file__).resolve().parent
JOBS = TOOL / "jobs" / "arena-floors.json"
SPEC = TOOL / "ui-art.json"
SCENE = ROOT / "design" / "ui" / "screens" / "battle-scene.js"
MANIFEST = ROOT / "art" / "generated" / "manifest.json"
SIZE = [1688, 716]                                      # как у нынешних арен: 21:9 в ширину экрана телефона с запасом
BASE = {"b1": "arena-workshop.jpg"}                     # нынешняя арена биома; у остальных — arena-bN.jpg


def read(p):
    raw = p.read_bytes().decode("utf-8")
    return raw.replace("\r\n", "\n"), "\r\n" in raw


def write(p, text, crlf):
    p.write_bytes((text.replace("\n", "\r\n") if crlf else text).encode("utf-8"))


def job_ids():
    return [j["id"] for j in json.loads(read(JOBS)[0])["jobs"]]


def latest(job):
    """Последняя картинка задания по манифесту генерации — путь от art/generated/."""
    items = [i for i in json.loads(read(MANIFEST)[0])["items"] if i.get("job") == job and i.get("file")]
    for it in reversed(items):
        f = ROOT / it["file"]
        if f.exists():
            return f.relative_to(ROOT / "art" / "generated").as_posix()
    return None


def spec(picks):
    text, crlf = read(SPEC)
    data = json.loads(text)
    added = []
    for job in job_ids():
        src = picks.get(job) or latest(job)
        if not src:
            print(f"{job}: картинки нет — в опись не пишется")
            continue
        if not (ROOT / "art" / "generated" / src).exists():
            sys.exit(f"{job}: нет файла art/generated/{src}")
        data["items"][job + ".jpg"] = {"from": src, "size": SIZE}
        added.append(f"{job}.jpg ← {src}")
    write(SPEC, json.dumps(data, ensure_ascii=False, indent=2) + "\n", crlf)
    print("\n".join(added) or "нечего добавить")
    print(f"ui-art.json: арен этажей в описи {len(added)}. Дальше — export_ui.py --spec ui-art.json --no-stamp и arena_floors.py ready")


def ready():
    items = json.loads(read(SPEC)[0])["items"]
    art = ROOT / "design" / "ui" / "assets" / "art"
    plan = []
    for b in ("b1", "b2", "b3", "b4"):
        plan.append(BASE.get(b, f"arena-{b}.jpg"))
        plan += [f"{j}.jpg" for j in job_ids() if j.startswith(f"arena-{b}-")]
    got = [p for p in plan if p in items and (art / p).exists()]
    text, crlf = read(SCENE)
    line = "  arenaReady: [" + ", ".join(f"'{p}'" for p in got) + "],"
    new, n = re.subn(r"^  arenaReady: \[[^\]]*\],$", line, text, count=1, flags=re.M)
    if not n:
        sys.exit("battle-scene.js: строки arenaReady не нашлось")
    write(SCENE, new, crlf)
    print(f"BS_ART.arenaReady: готово {len(got)} из {len(plan)}")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["spec", "ready"])
    ap.add_argument("--pick", action="append", default=[], help="задание=путь от art/generated/: свой вариант вместо последнего")
    a = ap.parse_args()
    if a.cmd == "spec":
        spec(dict(x.split("=", 1) for x in a.pick))
    else:
        ready()


if __name__ == "__main__":
    main()
