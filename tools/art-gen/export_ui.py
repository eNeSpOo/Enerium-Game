"""Выгрузка одобренного арта в прототип интерфейса.

Что куда идёт — в описях рядом: путь в прототипе → картинка из art/generated/.
- ui-art.json — арт экранов: портреты, арены, значки, окна;
- ui-icons.json — иконки, нарисованные сеткой: способности, линейки талисманов, снаряжение по редкости (256 px, WebP).
Картинки сжимаются до размера для экрана телефона, исходники не трогаются.
mirror: true — отразить по горизонтали: на карте герой смотрит вправо, на врагов, а враг — влево, на героев.
crop: [x0, y0, x1, y1] — вырезать кадр из исходника до сжатия (пиксели исходника), например портрет по пояс из картинки в полный рост.
Путь в прототипе на .png — значок с прозрачностью: пустые поля обрезаются по альфе, fit: N вписывает эмблему в N % кадра по центру.
Путь на .webp — то же с прозрачностью, но WebP: крупный арт с альфой (обложки и развороты книги героя) легче PNG в разы.
Непрозрачная картинка на .webp (иконка сеткой — живопись в край) просто сжимается до размера описи.

  python tools/art-gen/export_ui.py                           # все описи
  python tools/art-gen/export_ui.py --spec ui-icons.json      # только одна опись; --spec можно повторить
  python tools/art-gen/export_ui.py --no-stamp                # только картинки, index.html не трогать: его правят параллельно
  python tools/art-gen/export_ui.py --quiet                   # без строки на каждую картинку, только итоги
"""
import argparse
import hashlib
import json
import pathlib
import re
import sys

from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[2]
TOOL = pathlib.Path(__file__).resolve().parent
SPECS = ["ui-art.json", "ui-icons.json"]   # описи выгрузки по порядку; файла нет — опись пропускается


def load_specs(names, strict=False):
    """Описи из tools/art-gen/: [(имя, опись)]. strict — названной описи нет: ошибка; иначе пропуск."""
    out = []
    for name in names:
        path = TOOL / name
        if path.exists():
            out.append((name, json.loads(path.read_text(encoding="utf-8"))))
        elif strict:
            sys.exit(f"Нет описи {name} в tools/art-gen/")
    return out


def export(name, spec, quiet):
    """Выгрузить одну опись; вернуть число картинок и КБ."""
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
            if pic.mode == "RGBA" and pic.getchannel("A").getextrema()[0] == 255:
                pic = pic.convert("RGB")                 # живопись в край: альфа не нужна
            pic.save(path, "WEBP", quality=88, method=6)
        elif png:
            pic.save(path, "PNG", optimize=True)
        else:
            pic.save(path, "JPEG", quality=86, optimize=True, progressive=True)
        kb = path.stat().st_size // 1024
        total += kb
        if not quiet:
            print(f"{dst:22} ← {src['from']}  {size[0]}×{size[1]}{', отражён' if src.get('mirror') else ''}, {kb} КБ")
    print(f"{name}: {len(spec['items'])} картинок, {total} КБ → {spec['out']}")
    return len(spec["items"]), total


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--spec", action="append", help="опись из tools/art-gen/; по умолчанию все: " + ", ".join(SPECS))
    ap.add_argument("--no-stamp", action="store_true", help="не записывать версию выгрузки в design/ui/index.html")
    ap.add_argument("--quiet", action="store_true", help="без строки на каждую картинку")
    a = ap.parse_args()

    specs = load_specs(a.spec or SPECS, strict=bool(a.spec))
    count = size = 0
    for name, spec in specs:
        n, kb = export(name, spec, a.quiet)
        count, size = count + n, size + kb
    print(f"Итого {count} картинок, {size} КБ")
    if a.no_stamp:
        print("Версия выгрузки не записана (--no-stamp): новые пути браузер и так возьмёт свежими")
        return
    stamp_version(load_specs(SPECS))


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


def stamp_version(specs):
    """Версия выгрузки — хеш картинок всех описей. Она попадает в адреса картинок прототипа: браузер не покажет старые из кэша."""
    h = hashlib.sha1()
    for name, spec in specs:
        out = ROOT / spec["out"]
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
