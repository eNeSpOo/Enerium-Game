"""Эффекты боя: клетки листов на чёрном → спрайты с альфой и ленты flipbook для прототипа (задача «Бой AAA», jobs/battle-vfx.json).

Листы рисуются на чёрном с пурпурными швами; grid_slice.py режет их на клетки (WebP в art/generated/<категория>/<лист>/, опись cells.json).
Здесь — дальше:
1. Альфа из яркости. Свет эффекта на чёрном — это сложение со фоном, поэтому альфа = (самый яркий канал − FLOOR) / (255 − FLOOR), а цвет делится
   на альфу: спрайт поверх арены даёт тот же свет, что на чёрном, без чёрной каймы. Шум чёрного до FLOOR — прозрачный, остаток пурпура
   у шва — прочь.
2. Спрайт — обрезка по альфе с запасом PAD, квадрат по центру, SIZE px. В углах — точка альфы CORNER: выгрузка (export_ui.py) режет поля
   по альфе > 8, а квадрат должен остаться квадратом, иначе спрайт растянется.
3. Лента flipbook — кадры одной строки листа подряд, каждый — клетка целиком (без обрезки: центр эффекта у всех кадров один), FRAME px;
   в углах ленты — та же точка альфы. Прототип крутит ленту сдвигом transform по шагам (design/ui/fx.js).
4. Направление снаряда — от центра альфы к самой яркой части (головной свет): угол в градусах, 0 — вправо, по часовой. Его кладёт в
   данные VFX_ART.turn (design/ui/fx.js), чтобы снаряд летел головой к цели.

  python tools/art-gen/vfx_layers.py                 # все листы jobs/battle-vfx.json; печатает JSON: спрайты, ленты, углы снарядов
Выход — art/generated/battle-vfx/<лист>/sprites/<имя>.png и art/generated/battle-vfx-flip/<лист>/strips/<лента>.png.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
GEN = ROOT / "art" / "generated"
JOBS = ROOT / "tools" / "art-gen" / "jobs" / "battle-vfx.json"
FLOOR = 10        # шум чёрного: ярче — свет
GAMMA = 1.0       # альфа из яркости без кривой: сложение со фоном
PAD = 0.06        # запас вокруг спрайта, доля стороны
SIZE = 256        # сторона спрайта, px
BIG = {"vx-halo": 320, "vx-rays": 320, "vx-crit": 288, "vx-ring": 288, "vx-hex": 288}   # крупные — с запасом на телефон с плотностью 3
FRAME = 192       # кадр ленты flipbook, px
CORNER = 9        # альфа точки в углах: выгрузка не срежет поля
EDGE = 0.03       # у шва — полоса, где пурпур прочь, доля стороны клетки
ROUND = (400, 500)  # круглый край спрайта: альфа тает от 400 до 500 тысячных стороны от центра — дымка клетки не даёт квадрата


def alpha_from_black(img):
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # остаток пурпурного шва по краю клетки
    key = (r > 120) & (b > 120) & (g < 0.6 * np.minimum(r, b))
    band = np.zeros((h, w), bool)
    e = max(2, int(EDGE * min(h, w)))
    band[:e, :] = band[-e:, :] = True
    band[:, :e] = band[:, -e:] = True
    rgb[key & band] = 0
    v = rgb.max(-1)
    a = np.clip((v - FLOOR) / (255.0 - FLOOR), 0, 1) ** GAMMA
    a[a < 0.02] = 0
    col = np.clip(rgb / np.maximum(a, 1e-3)[..., None], 0, 255)
    col[a == 0] = 0
    return np.dstack([col, a * 255]).round().astype(np.uint8)


def corners(arr):
    arr[0, 0, 3] = max(arr[0, 0, 3], CORNER)
    arr[0, -1, 3] = max(arr[0, -1, 3], CORNER)
    arr[-1, 0, 3] = max(arr[-1, 0, 3], CORNER)
    arr[-1, -1, 3] = max(arr[-1, -1, 3], CORNER)
    return arr


def sprite(arr, side):
    al = arr[..., 3]
    ys, xs = np.nonzero(al > 8)
    if not len(xs):
        return corners(np.zeros((side, side, 4), np.uint8)), 0, 0
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    s = int(max(x1 - x0, y1 - y0) * (1 + 2 * PAD))
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    canvas = np.zeros((s, s, 4), np.uint8)
    sx0, sy0 = cx - s // 2, cy - s // 2
    h, w = al.shape
    ax0, ay0, ax1, ay1 = max(0, sx0), max(0, sy0), min(w, sx0 + s), min(h, sy0 + s)
    canvas[ay0 - sy0:ay1 - sy0, ax0 - sx0:ax1 - sx0] = arr[ay0:ay1, ax0:ax1]
    im = Image.fromarray(canvas, "RGBA").resize((side, side), Image.LANCZOS)
    out = np.asarray(im).copy()
    ys, xs = np.mgrid[0:side, 0:side]
    r = np.hypot(xs - (side - 1) / 2, ys - (side - 1) / 2) * 1000 / side
    fade = np.clip((ROUND[1] - r) / (ROUND[1] - ROUND[0]), 0, 1)
    out[..., 3] = (out[..., 3] * fade).round().astype(np.uint8)
    return corners(out), x1 - x0, y1 - y0


def heading(arr):
    """Угол снаряда: от центра альфы к самой яркой части, градусы, 0 — вправо, по часовой."""
    al = arr[..., 3].astype(np.float32) / 255
    v = arr[..., :3].max(-1).astype(np.float32) * al
    ys, xs = np.mgrid[0:al.shape[0], 0:al.shape[1]]
    if al.sum() < 1:
        return 0
    cx, cy = (xs * al).sum() / al.sum(), (ys * al).sum() / al.sum()
    hot = v >= np.percentile(v[al > 0.05], 96) if (al > 0.05).any() else v > 0
    hx, hy = xs[hot].mean(), ys[hot].mean()
    return int(round(np.degrees(np.arctan2(hy - cy, hx - cx))))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    spec = json.loads(JOBS.read_text(encoding="utf-8"))
    out = {"sprites": {}, "strips": {}, "turn": {}}
    for job in spec["jobs"]:
        folder = GEN / job["category"] / job["id"]
        cells = json.loads((folder / "cells.json").read_text(encoding="utf-8"))
        files = {c["id"] if isinstance(c, dict) and "id" in c else None: c for c in (cells.get("cells") if isinstance(cells, dict) else cells)}
        names = [f for _, f in job["cells"]]
        cols, rows = job["grid"]
        if job["category"].endswith("-flip"):
            dst = folder / "strips"
            dst.mkdir(exist_ok=True)
            for r in range(rows):
                frames = []
                for c in range(cols):
                    n = names[r * cols + c]
                    arr = alpha_from_black(Image.open(folder / f"{n}.webp"))
                    frames.append(Image.fromarray(arr, "RGBA").resize((FRAME, FRAME), Image.LANCZOS))
                strip = Image.new("RGBA", (FRAME * cols, FRAME), (0, 0, 0, 0))
                for i, f in enumerate(frames):
                    strip.paste(f, (i * FRAME, 0))
                arr = corners(np.asarray(strip).copy())
                key = names[r * cols].rsplit("-", 1)[0]
                Image.fromarray(arr, "RGBA").save(dst / f"{key}.png", optimize=True)
                out["strips"][key] = {"file": (dst / f"{key}.png").relative_to(GEN).as_posix(), "frames": cols, "px": [FRAME * cols, FRAME]}
            continue
        dst = folder / "sprites"
        dst.mkdir(exist_ok=True)
        for n in names:
            arr = alpha_from_black(Image.open(folder / f"{n}.webp"))
            side = BIG.get(n, SIZE)
            sp, bw, bh = sprite(arr, side)
            Image.fromarray(sp, "RGBA").save(dst / f"{n}.png", optimize=True)
            out["sprites"][n] = {"file": (dst / f"{n}.png").relative_to(GEN).as_posix(), "px": side, "box": [int(bw), int(bh)]}
            if n.startswith("vx-proj-"):
                out["turn"][n[len("vx-proj-"):]] = heading(sp)
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
