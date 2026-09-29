"""Два состояния рунного камня предела для интерфейса (design/ui/screens/hero-dev.js, знак рунных пределов).

Нарисован один камень — горящий (jobs/rune-limits.json). Погасший выводится из него здесь, а не рисуется заново: силуэт
совпадает пиксель в пиксель, и пульс «погасший ↔ горящий» в интерфейсе не гуляет. Погасший — пустой карст по art/style/style.md:
матовый серо-синий кристалл без свечения, руна — бледная бороздка; золотая кромка та же, бирюзовый отсвет на ней гаснет.

Оба слоя обрезаются по одной рамке — альфа > 8, как у выгрузки (export_ui.py), — поэтому её обрезка ничего не меняет.
Исходник не трогается: слои ложатся рядом, в art/generated/limits/, с суффиксами .on и .off.

  python tools/art-gen/rune_stones.py                  # слои из art/generated/limits/rl-stone__nb2.png
  python tools/art-gen/rune_stones.py --src FILE       # из другого варианта того же задания
  python tools/art-gen/rune_stones.py --preview DIR    # и превью: оба слоя на тёмном в размерах интерфейса
"""
import argparse
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
GEN = ROOT / "art" / "generated" / "limits"
SRC = GEN / "rl-stone__nb2.png"

A_CUT = 8                    # выгрузка обрезает PNG по альфе > 8 — рамка слоёв та же
TEAL = (150.0, 205.0)        # оттенок света карста, градусы: кристалл, руна и отсвет на кромке
TEAL_SAT = 0.18              # насыщенность, выше которой пиксель — свет карста
WHITE_V = 0.80               # сердце руны: почти белое, почти без цвета — тоже свет
WHITE_SAT = 0.22
DEAD = (0.10, 0.34, 1.2)     # яркость погасшего: base + k × L^g — тело тёмное, руна — бледная бороздка
TINT = (0.93, 1.0, 1.07)     # холодный оттенок пустого карста: R, G, B
PREVIEW = (128, 40, 18, 8)   # ширины превью, px: лист и анимация, путь, шапка, плитка


def hsv(rgb):
    """Оттенок в градусах, насыщенность и яркость 0…1 для массива RGB 0…255."""
    x = rgb / 255.0
    mx, mn = x.max(-1), x.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-6
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    rm = nz & (mx == r)
    gm = nz & (mx == g) & ~rm
    bm = nz & ~rm & ~gm
    h[rm] = (60 * ((g - b)[rm] / d[rm])) % 360
    h[gm] = 60 * ((b - r)[gm] / d[gm]) + 120
    h[bm] = 60 * ((r - g)[bm] / d[bm]) + 240
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def layers(src):
    """Горящий и погасший слои в одной рамке."""
    a = np.asarray(Image.open(src).convert("RGBA")).astype(np.float32)
    ys, xs = np.where(a[..., 3] > A_CUT)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    rgb = a[..., :3]
    h, s, v = hsv(rgb)
    light = ((h >= TEAL[0]) & (h <= TEAL[1]) & (s >= TEAL_SAT)) | ((v >= WHITE_V) & (s <= WHITE_SAT))
    lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255.0
    base, k, g = DEAD
    dead = (base + k * lum ** g) * 255.0
    off = rgb.copy()
    for c, t in enumerate(TINT):
        off[..., c] = np.where(light, np.clip(dead * t, 0, 255), rgb[..., c])
    on_img = Image.fromarray(a.round().astype(np.uint8), "RGBA")
    off_img = Image.fromarray(np.dstack([off, a[..., 3]]).round().astype(np.uint8), "RGBA")
    return on_img, off_img, float(light.mean())


def preview(on, off, out):
    """Оба слоя на тёмном интерфейса в размерах, где их увидит игрок."""
    ratio = on.height / on.width
    pad = 12
    cells = [(w, max(1, round(w * ratio))) for w in PREVIEW]
    width = pad + sum(2 * (w + pad) for w, _ in cells)
    height = pad * 2 + max(hh for _, hh in cells)
    sheet = Image.new("RGBA", (width, height), (12, 15, 18, 255))
    x = pad
    for w, hh in cells:
        for im in (on, off):
            sm = im.resize((w, hh), Image.LANCZOS)
            sheet.alpha_composite(sm, (x, pad))
            x += w + pad
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(out)
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", default=str(SRC), help="горящий камень после вырезки фона")
    ap.add_argument("--preview", help="папка для превью")
    a = ap.parse_args()
    src = pathlib.Path(a.src)
    on, off, share = layers(src)
    stem = src.with_suffix("")
    on_path, off_path = stem.with_name(stem.name + ".on.png"), stem.with_name(stem.name + ".off.png")
    on.save(on_path, optimize=True)
    off.save(off_path, optimize=True)
    rel = lambda p: p.resolve().relative_to(ROOT).as_posix()
    print(f"{rel(on_path)} и {rel(off_path)}: {on.width}×{on.height}, свет карста — {share:.0%} кадра")
    if a.preview:
        print("превью:", preview(on, off, pathlib.Path(a.preview) / (stem.name + ".preview.png")))


if __name__ == "__main__":
    main()
