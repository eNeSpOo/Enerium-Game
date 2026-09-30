"""Арт «Библиотеки Этриона» — шкаф героев: бесшовные полосы, нарезка корешков и геометрия для вёрстки (design/ui/screens/library.js, LB_ART).

Слово автора 30.09.2026: «пусть задний фон показывает, что они условно находятся на полках огромного древнего шкафа, каждая на своём ряде».
Задание — jobs/library-shelves.json. Модель рисует полосу и стену «почти бесшовно», а шов всё равно виден: здесь он снимается
наложением — берётся период, на котором края полосы совпадают лучше всего, и край плавно переходит в продолжение. Геометрия —
тысячные доли рисунка, только целые:

  tile   <jpg>              задняя стенка: общий свет выравнивается (стена ровная, свет даёт интерфейс), шов снимается по обеим
                            осям → <имя>.tile.jpg
  strip  <png…>             полка и карниз: полоса по альфе, шов по горизонтали → <имя>.strip.png; surf — верх доски: строка, где
                            светлый верх переходит в тёмную кромку (на ней стоят книги); band — тихая полоса, где меньше всего резьбы
                            (на карнизе там строка счётчиков) — [сверху, снизу]
  post   <png> <y0> <y1> [<yf>]   стойка: столбцы по альфе, строки y0…y1, шов по вертикали → <имя>.post.png; yf — откуда ножка со
                            светом кристалла (низ рисунка) → <имя>.foot.png: альфа ножки — заново по ключу black-glow из исходника
                            (свет тает в прозрачность, а не тёмным диском); post — где на ножке тело стойки, ‰ ширины ножки
  spines <png>              корешки: пять по пустым столбцам слева направо → <имя>-1…5.png; ratio — ширина к высоте, ‰

  python tools/art-gen/shelf_layers.py strip art/generated/lb-strip/lb-plank__nb2.png
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

import cutout

ROOT = pathlib.Path(__file__).resolve().parents[2]
A_CUT = 8            # рамка по альфе — как у export_ui.py
BLEND = 0.08         # полоса наложения на шве — доля длины рисунка
SEARCH = (0.62, 0.96)   # период ищется в этих долях длины: не короче — иначе рисунок повторяется слишком часто
FLAT = 0.09          # свет стены выравнивается размытием с таким радиусом (доля стороны)


def load(p):
    p = pathlib.Path(p)
    return p if p.is_absolute() else ROOT / p


def rel(p):
    return p.relative_to(ROOT).as_posix()


def permille(v, d):
    return int(round(v * 1000 / d))


def rgba(p):
    return rgba_of(Image.open(p))


def rgba_of(im):
    return np.asarray(im.convert("RGBA")).astype(np.float32)


def period(a, axis):
    """Период вдоль оси: сдвиг, на котором полоса наложения в начале совпадает с продолжением лучше всего."""
    n = a.shape[axis]
    b = max(8, int(n * BLEND))
    lo, hi = int(n * SEARCH[0]), min(int(n * SEARCH[1]), n - b - 1)
    head = np.take(a, np.arange(0, b), axis=axis)
    best, best_p = None, hi
    for p in range(lo, hi + 1):
        tail = np.take(a, np.arange(p, p + b), axis=axis)
        err = float(np.abs(head - tail).mean())
        if best is None or err < best:
            best, best_p = err, p
    return best_p, b, best


def seam(a, axis):
    """Бесшовный отрезок длиной в период: в начале край плавно переходит в продолжение рисунка за периодом."""
    p, b, err = period(a, axis)
    out = np.take(a, np.arange(0, p), axis=axis).copy()
    w = (np.arange(b, dtype=np.float32) + 0.5) / b
    shape = [1] * a.ndim
    shape[axis] = b
    w = w.reshape(shape)
    head = np.take(a, np.arange(0, b), axis=axis)
    tail = np.take(a, np.arange(p, p + b), axis=axis)
    idx = [slice(None)] * a.ndim
    idx[axis] = slice(0, b)
    out[tuple(idx)] = head * w + tail * (1 - w)
    return out, {"period": p, "blend": b, "err": round(err, 2)}


def save_png(a, src, suffix):
    out = src.with_name(src.name.split(".")[0] + suffix)
    Image.fromarray(np.clip(a, 0, 255).round().astype(np.uint8), "RGBA").save(out, optimize=True)
    return out


def tile(p):
    src = load(p)
    a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    h, w = a.shape[:2]
    lum = a.mean(-1)
    soft = ndimage.gaussian_filter(lum, sigma=max(h, w) * FLAT)
    k = (lum.mean() / np.maximum(soft, 1.0))[..., None]
    a = np.clip(a * k, 0, 255)
    a, gx = seam(a, 1)
    a, gy = seam(a, 0)
    out = src.with_name(src.name.split(".")[0] + ".tile.jpg")
    Image.fromarray(a.round().astype(np.uint8), "RGB").save(out, quality=92)
    return {"file": rel(out), "px": [int(a.shape[1]), int(a.shape[0])], "x": gx, "y": gy,
            "mean": int(round(float(a.mean())))}


def rows_of(al):
    ys = np.nonzero((al > A_CUT).any(1))[0]
    return int(ys.min()), int(ys.max()) + 1


def strip(p):
    src = load(p)
    a = rgba(src)
    y0, y1 = rows_of(a[..., 3])
    a = a[y0:y1]
    a, g = seam(a, 1)
    out = save_png(a, src, ".strip.png")
    H, W = a.shape[:2]
    lum = a[..., :3].mean(-1) * (a[..., 3] / 255.0)
    prof = lum.mean(1)
    # верх доски: самый резкий спад яркости сверху вниз в верхней половине полосы
    d = prof[1:H // 2] - prof[:H // 2 - 1]
    surf = int(np.argmin(d)) + 1
    # тихая полоса: окно в треть высоты с наименьшей резьбой (перепады яркости по строкам и столбцам)
    energy = np.abs(np.diff(lum, axis=0)).mean(1)
    energy = np.concatenate([energy, energy[-1:]]) + np.abs(np.diff(lum, axis=1)).mean(1)
    win = max(3, H // 3)
    cs = np.convolve(energy, np.ones(win), "valid")
    b0 = int(np.argmin(cs))
    return {"file": rel(out), "px": [W, H], "ratio": permille(W, H), "seam": g, "surf": permille(surf, H),
            "band": [permille(b0, H), permille(H - b0 - win, H)]}


def post(p, y0, y1, yf=None):
    src = load(p)
    a = rgba(src)
    solid = (a[..., 3] > 128).mean(0)
    xs = np.nonzero(solid > 0.5)[0]
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    body = a[y0:y1, x0:x1]
    body, g = seam(body, 0)
    out = save_png(body, src, ".post.png")
    res = {"file": rel(out), "px": [int(body.shape[1]), int(body.shape[0])], "ratio": permille(body.shape[1], body.shape[0]), "seam": g}
    if yf is not None:
        # ножка — со светом кристалла: альфа заново по ключу black-glow из исходника, иначе свет вокруг — тёмный диск
        raw = next(iter(sorted(src.parent.glob(src.name.split(".")[0] + ".raw.*"))), None)
        foot = a.copy()
        if raw:
            glow = rgba_of(cutout.remove_key(Image.open(raw), "black-glow"))
            out_cols = np.ones(a.shape[1], bool)
            out_cols[x0:x1] = False   # тело стойки — как было, непрозрачное; вокруг — свет по ключу black-glow
            foot[:, out_cols] = glow[:, out_cols]
        foot = foot[yf:]
        cols = np.nonzero((foot[..., 3] > A_CUT).any(0))[0]
        f0, f1 = int(cols.min()), int(cols.max()) + 1
        foot = foot[:, f0:f1]
        fo = save_png(foot, src, ".foot.png")
        # ножка стоит на стойке: где у ножки тело стойки — ‰ её ширины
        res["foot"] = {"file": rel(fo), "px": [int(foot.shape[1]), int(foot.shape[0])], "ratio": permille(foot.shape[1], foot.shape[0]),
                       "post": [permille(x0 - f0, f1 - f0), permille(f1 - x1, f1 - f0)]}
    return res


def spines(p):
    src = load(p)
    a = rgba(src)
    al = a[..., 3]
    cols = (al > 64).sum(0) > al.shape[0] * 0.05
    lab, n = ndimage.label(cols)
    parts = []
    for i in range(1, n + 1):
        xs = np.nonzero(lab == i)[0]
        if len(xs) >= a.shape[1] * 0.03:
            parts.append((int(xs.min()), int(xs.max()) + 1))
    if len(parts) != 5:
        sys.exit(f"корешков {len(parts)}, ждали пять: {parts}")
    res = []
    for k, (x0, x1) in enumerate(parts, 1):
        # поле корешка — до середины промежутка с соседями, чтобы свет и шипы не резались
        L = (parts[k - 2][1] + x0) // 2 if k > 1 else 0
        R = (x1 + parts[k][0]) // 2 if k < 5 else a.shape[1]
        sub = a[:, L:R]
        ys, xs = np.nonzero(sub[..., 3] > A_CUT)
        sub = sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        out = src.with_name(src.name.split(".")[0] + f"-{k}.png")
        Image.fromarray(np.clip(sub, 0, 255).round().astype(np.uint8), "RGBA").save(out, optimize=True)
        # тело корешка без выступов (шипы, свет обреза): открытие квадратом в восьмую часть ширины
        solid = ndimage.binary_fill_holes(sub[..., 3] > 128)
        kk = max(3, sub.shape[1] // 8)
        op = ndimage.maximum_filter(ndimage.minimum_filter(solid.astype(np.uint8), size=(kk, kk)), size=(kk, kk)).astype(bool)
        oy, ox = np.nonzero(op)
        H, W = sub.shape[:2]
        core = [permille(oy.min(), H), permille(W - ox.max() - 1, W), permille(H - oy.max() - 1, H), permille(ox.min(), W)]
        res.append({"file": rel(out), "px": [W, H], "ratio": permille(W, H), "core": core})
    return res


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    kind, args = sys.argv[1], sys.argv[2:]
    if kind == "tile":
        res = [tile(p) for p in args]
    elif kind == "strip":
        res = [strip(p) for p in args]
    elif kind == "post":
        res = post(args[0], int(args[1]), int(args[2]), int(args[3]) if len(args) > 3 else None)
    elif kind == "spines":
        res = spines(args[0])
    else:
        sys.exit(__doc__)
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
