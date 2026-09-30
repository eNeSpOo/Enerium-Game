"""Выгрузка одобренного арта в прототип интерфейса.

Что куда идёт — в ui-art.json рядом: путь в прототипе → картинка из art/generated/.
Картинки сжимаются до размера для экрана телефона, исходники не трогаются.
mirror: true — отразить по горизонтали: на карте герой смотрит вправо, на врагов, а враг — влево, на героев.
crop: [x0, y0, x1, y1] — вырезать кадр из исходника до сжатия (пиксели исходника), например портрет по пояс из картинки в полный рост.
Путь в прототипе на .png — значок с прозрачностью: пустые поля обрезаются по альфе, fit: N вписывает эмблему в N % кадра по центру.
Путь на .webp — то же с прозрачностью, но WebP: крупный арт с альфой (обложки и развороты книги героя) легче PNG в разы.

  python tools/art-gen/export_ui.py
  python tools/art-gen/export_ui.py --no-stamp    # только картинки, index.html не трогать: его правят параллельно
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
        png = dst.lower().endswith((".png", ".webp"))   # с прозрачностью
        with Image.open(ROOT / "art/generated" / src["from"]) as im:
            if src.get("crop"):
                im = im.crop(tuple(src["crop"]))
            pic = fit_icon(im.convert("RGBA"), size, src.get("fit")) if png else im.convert("RGB").resize(size, Image.LANCZOS)
        if src.get("mirror"):
            pic = ImageOps.mirror(pic)
        path = out / dst
        path.parent.mkdir(parents=True, exist_ok=True)
        if dst.lower().endswith(".webp"):
            pic.save(path, "WEBP", quality=88, method=6)
        elif png:
            pic.save(path, "PNG", optimize=True)
        else:
            pic.save(path, "JPEG", quality=86, optimize=True, progressive=True)
        kb = path.stat().st_size // 1024
        total += kb
        print(f"{dst:22} ← {src['from']}  {size[0]}×{size[1]}{', отражён' if src.get('mirror') else ''}, {kb} КБ")
    print(f"Итого {len(spec['items'])} картинок, {total} КБ → {spec['out']}")
    if "--no-stamp" in sys.argv[1:]:
        print("Версия выгрузки не записана (--no-stamp): новые пути браузер и так возьмёт свежими")
        return
    stamp_version(out, spec)


def fit_icon(im, size, fit):
    """Значок: обрезать прозрачные поля и вписать эмблему в fit % кадра по центру, пропорции сохраняются."""
    box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if box:
        im = im.crop(box)
    if not fit:
        return im.resize(size, Image.LANCZOS)
    w, h = size
    if w * im.height <= h * im.width:          # упирается в ширину
        nw = w * fit // 100
        nh = max(1, im.height * nw // im.width)
    else:
        nh = h * fit // 100
        nw = max(1, im.width * nh // im.height)
    icon = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.paste(icon, ((w - nw) // 2, (h - nh) // 2), icon)
    return canvas


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
