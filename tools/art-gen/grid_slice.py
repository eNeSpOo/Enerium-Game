"""Нарезка листа иконок, нарисованного сеткой.

Задание со списками grid и cells (tools/art-gen/jobs/spell-icons-*.json) рисует на одном листе
сетку квадратных клеток на пурпурных швах. Скрипт находит швы по доле пурпура в строках
и столбцах, режет клетки, срезает кайму шва и проверяет, не осталось ли ключа в клетке.
Клетки — WebP в art/generated/<категория>/<id задания>/, опись нарезки — cells.json там же.

  python tools/art-gen/grid_slice.py jobs/spell-icons-fire.json spell-fire-active art/generated/spell-icons/spell-fire-active__nb2.jpg
"""
import argparse
import json
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
TOOL = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "art" / "generated"

GUTTER_SHARE = 0.3  # строка или столбец — шов, если пурпура в нём больше этой доли
SLIVER = 0.5        # промежуток между швами уже половины клетки — не клетка, а обрывок шва
INSET = 0.015       # срез каймы шва с каждой стороны клетки, доля её стороны
KEY_LEFT = 0.002    # допустимая доля пурпура в готовой клетке
QUALITY = 92        # качество WebP


def key_mask(a, loose=False):
    """Пурпурный ключ #FF00FF с запасом на сжатие JPEG; loose — и розовая кайма у шва."""
    r, g, b = (a[..., i].astype(np.int16) for i in range(3))
    lo, hi = (140, 120) if loose else (170, 110)
    return (r > lo) & (b > lo) & (g < hi) & (np.abs(r - b) < 90)


def runs(flags):
    """Отрезки подряд идущих True: [начало, конец)."""
    out, start = [], None
    for i, f in enumerate(flags):
        if f and start is None:
            start = i
        elif not f and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(flags)))
    return out


def spans(share, n):
    """Клетки вдоль оси — промежутки между швами. None, если их не n."""
    size, pos, gaps = len(share), 0, []
    for s, e in runs(share > GUTTER_SHARE):
        if s > pos:
            gaps.append((pos, s))
        pos = e
    if pos < size:
        gaps.append((pos, size))
    gaps = [g for g in gaps if g[1] - g[0] >= SLIVER * size / n]
    return gaps if len(gaps) == n else None


def even(size, n):
    return [(size * i // n, size * (i + 1) // n) for i in range(n)]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("jobs", help="файл заданий, путь от tools/art-gen/ или от корня")
    ap.add_argument("job", help="id задания со списками grid и cells")
    ap.add_argument("sheet", help="лист, который нарисовал gen.py")
    ap.add_argument("--out", help="папка клеток; по умолчанию art/generated/<категория>/<id задания>/")
    a = ap.parse_args()

    jobs_path = (TOOL / a.jobs) if (TOOL / a.jobs).exists() else (ROOT / a.jobs)
    spec = json.loads(jobs_path.read_text(encoding="utf-8"))
    job = next(j for j in spec["jobs"] if j["id"] == a.job)
    cols, rows = job["grid"]
    cells = job["cells"]
    if len(cells) != cols * rows:
        sys.exit(f"в cells {len(cells)} клеток, а сетка {cols}×{rows}")

    sheet = pathlib.Path(a.sheet) if pathlib.Path(a.sheet).is_absolute() else ROOT / a.sheet
    im = Image.open(sheet).convert("RGB")
    px = np.asarray(im)
    mask = key_mask(px)
    xs, ys = spans(mask.mean(axis=0), cols), spans(mask.mean(axis=1), rows)
    found = xs is not None and ys is not None
    if not found:
        print(f"! швы не нашлись ({'столбцы' if xs is None else 'строки'}): режу на равные доли — проверьте клетки глазами")
        xs, ys = xs or even(im.width, cols), ys or even(im.height, rows)

    out = pathlib.Path(a.out) if a.out else OUT / job["category"] / job["id"]
    out.mkdir(parents=True, exist_ok=True)
    report, bad = [], 0
    for k, (ability, stem) in enumerate(cells):
        (x0, x1), (y0, y1) = xs[k % cols], ys[k // cols]
        cut = max(2, round(INSET * min(x1 - x0, y1 - y0)))
        x0, y0, x1, y1 = x0 + cut, y0 + cut, x1 - cut, y1 - cut
        side = min(x1 - x0, y1 - y0)
        x0, y0 = x0 + (x1 - x0 - side) // 2, y0 + (y1 - y0 - side) // 2
        box = [x0, y0, x0 + side, y0 + side]
        left = float(key_mask(px[box[1]:box[3], box[0]:box[2]], loose=True).mean())
        path = out / f"{stem}.webp"
        im.crop(box).save(path, "WEBP", quality=QUALITY, method=6)
        report.append({"id": ability, "file": path.relative_to(ROOT).as_posix(), "box": box, "px": side,
                       "key_left": round(left, 5)})
        if left > KEY_LEFT:
            bad += 1
            print(f"! {stem}: пурпура в клетке {left:.2%} — шов зашёл в рисунок")
    (out / "cells.json").write_text(json.dumps({
        "sheet": sheet.relative_to(ROOT).as_posix(),
        "jobs": jobs_path.relative_to(ROOT).as_posix(),
        "job": job["id"],
        "grid": [cols, rows],
        "seams": "найдены" if found else "не найдены, равные доли",
        "cells": report,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sides = sorted({c["px"] for c in report})
    print(f"{job['id']}: {len(report)} клеток по {sides[0]}–{sides[-1]} px → {out.relative_to(ROOT).as_posix()}"
          + (f", с пурпуром: {bad}" if bad else ""))


if __name__ == "__main__":
    main()
