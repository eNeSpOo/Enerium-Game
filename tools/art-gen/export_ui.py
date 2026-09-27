"""Выгрузка одобренного арта в прототип интерфейса.

Что куда идёт — в ui-art.json рядом: путь в прототипе → картинка из art/generated/.
Картинки сжимаются до размера для экрана телефона, исходники не трогаются.
mirror: true — отразить по горизонтали: на карте герой смотрит вправо, на врагов, а враг — влево, на героев.

  python tools/art-gen/export_ui.py
"""
import hashlib
import json
import pathlib
import re
import sys

from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = pathlib.Path(__file__).with_name("ui-art.json")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    spec = json.loads(SPEC.read_text(encoding="utf-8"))
    out = ROOT / spec["out"]
    total = 0
    for dst, src in spec["items"].items():
        if isinstance(src, str):
            src = {"from": src}
        size = tuple(src.get("size", spec["size"]))
        with Image.open(ROOT / "art/generated" / src["from"]) as im:
            pic = im.convert("RGB").resize(size, Image.LANCZOS)
        if src.get("mirror"):
            pic = ImageOps.mirror(pic)
        path = out / dst
        path.parent.mkdir(parents=True, exist_ok=True)
        pic.save(path, "JPEG", quality=86, optimize=True, progressive=True)
        kb = path.stat().st_size // 1024
        total += kb
        print(f"{dst:22} ← {src['from']}  {size[0]}×{size[1]}{', отражён' if src.get('mirror') else ''}, {kb} КБ")
    print(f"Итого {len(spec['items'])} картинок, {total} КБ → {spec['out']}")
    stamp_version(out, spec)


def stamp_version(out, spec):
    """Версия выгрузки — хеш картинок. Она попадает в адреса картинок прототипа: браузер не покажет старые из кэша."""
    h = hashlib.sha1()
    for dst in sorted(spec["items"]):
        h.update((out / dst).read_bytes())
    ver = h.hexdigest()[:8]
    page = ROOT / "design/ui/index.html"
    raw = page.read_bytes().decode("utf-8")
    new, n = re.subn(r"const ART_V = '[^']*';", f"const ART_V = '{ver}';", raw, count=1)
    if n:
        page.write_bytes(new.encode("utf-8"))
        print(f"Версия выгрузки {ver} — записана в design/ui/index.html")


if __name__ == "__main__":
    main()
