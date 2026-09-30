"""Доска проверки иконок, нарезанных сеткой: клетки листа в игровых размерах, в рамках как в интерфейсе.

Лист смотрят глазами целиком и на доске: на 32–128 px видно то, чего не видно на листе, — шум без предмета, повтор соседа,
непонятный силуэт. Рамки — как на доске пробы Огня: активка — железо, ульта — золото, пассивка — круг, реакция — ржавая кромка;
снаряжение — цвет редкости (--r1…--r7, ADR-0027), талисман — железо. Вид клетки берётся из id в cells.json.

  python tools/art-gen/icon_board.py art/generated/spell-icons/spell-earth-active/cells.json --out доска.png
  python tools/art-gen/icon_board.py <cells.json> <cells.json> --sizes 128,64,48,32 --out доска.png
"""
import argparse
import json
import pathlib
import sys

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[2]
BG = (10, 12, 14)
IRON, GOLD, RUST = (74, 82, 90), (221, 188, 122), (150, 84, 52)
RARITY = [(230, 232, 234), (240, 204, 79), (31, 184, 208), (169, 134, 238), (232, 90, 78), (235, 157, 64), (95, 214, 122)]  # --r1…--r7
GAP = 6


def kind(cell_id):
    """Вид клетки по id: ульта, пассивка, реакция, снаряжение с редкостью или обычная плитка."""
    s = str(cell_id)
    if ".ult." in s:
        return "ult", GOLD
    if ".pas." in s:
        return "pas", IRON
    if ".react." in s:
        return "react", RUST
    tail = s.rsplit(".", 1)[-1]
    if "." in s and tail.isdigit() and 1 <= int(tail) <= 7 and s.split(".")[0] in (
            "head", "chest", "hands", "legs", "feet", "main", "off", "ring", "amulet"):
        return "eq", RARITY[int(tail) - 1]
    return "act", IRON


def tile(path, px, how, color):
    """Клетка в рамке: круг у пассивки, у остальных — скруглённый квадрат с кромкой цвета вида."""
    with Image.open(path) as im:
        pic = im.convert("RGB").resize((px, px), Image.LANCZOS)
    out = Image.new("RGBA", (px, px), BG + (255,))
    mask = Image.new("L", (px, px), 0)
    d = ImageDraw.Draw(mask)
    edge = max(1, px // 24)
    if how == "pas":
        d.ellipse((0, 0, px - 1, px - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, px - 1, px - 1), radius=max(2, px // 8), fill=255)
    out.paste(pic, (0, 0), mask)
    ring = ImageDraw.Draw(out)
    if how == "pas":
        ring.ellipse((0, 0, px - 1, px - 1), outline=color, width=edge)
    else:
        ring.rounded_rectangle((0, 0, px - 1, px - 1), radius=max(2, px // 8), outline=color, width=edge)
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cells", nargs="+", help="cells.json нарезки (grid_slice.py)")
    ap.add_argument("--sizes", default="128,64,48,32", help="стороны клетки на доске, px")
    ap.add_argument("--cols", type=int, help="столбцов на доске; по умолчанию — как в сетке листа")
    ap.add_argument("--out", required=True, help="куда сохранить доску, PNG")
    a = ap.parse_args()

    items, cols = [], a.cols
    for c in a.cells:
        p = pathlib.Path(c) if pathlib.Path(c).is_absolute() else ROOT / c
        spec = json.loads(p.read_text(encoding="utf-8"))
        cols = cols or spec["grid"][0]
        items += [(x["id"], ROOT / x["file"]) for x in spec["cells"]]
    sizes = [int(s) for s in a.sizes.split(",")]
    rows = -(-len(items) // cols)
    blocks = []
    for px in sizes:
        w, h = cols * (px + GAP) + GAP, rows * (px + GAP) + GAP
        b = Image.new("RGBA", (w, h), BG + (255,))
        for i, (cid, f) in enumerate(items):
            how, color = kind(cid)
            b.alpha_composite(tile(f, px, how, color), (GAP + (i % cols) * (px + GAP), GAP + (i // cols) * (px + GAP)))
        blocks.append(b)
    W = sum(b.width for b in blocks) + GAP * (len(blocks) - 1)
    H = max(b.height for b in blocks)
    board = Image.new("RGB", (W, H), BG)
    x = 0
    for b in blocks:
        board.paste(b.convert("RGB"), (x, 0))
        x += b.width + GAP
    out = pathlib.Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    board.save(out)
    print(f"доска: {len(items)} клеток, размеры {', '.join(map(str, sizes))} px → {out}")


if __name__ == "__main__":
    main()
