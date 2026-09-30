"""Книга рецептов Мастерской — нарезка арта и геометрия для RB_ART (design/ui/screens/recipe-book.js).

Задание — tools/art-gen/jobs/recipe-book.json. Бумага нарисована на чёрном ключе, книга — на пурпурном; фон уже вырезал gen.py.
Здесь:
- полосы найденного рецепта (короткая, средняя, длинная) — каждая своя картинка: обрезать по бумаге, пропорции — как нарисованы,
  ничего не растягивается. Шум сжатия в фоне (альфа ниже NOISE) гасится, чтобы рамка обрезки легла по самой бумаге;
- обрывки частично найденного рецепта — лист 3 × 3: девять связных кусков по порядку строк, каждый — своя картинка;
- книга — разворот: обрезать по обложке и найти на страницах двойную золотую линейку. Внутренняя линейка каждой страницы — поле,
  где интерфейс раскладывает листы: [слева, сверху, справа, снизу], тысячные доли картинки.
Печатает числа для RB_ART; картинки кладёт рядом с исходниками (*.cut.png), выгрузка — ui-art.json.

  python tools/art-gen/rbook_layers.py
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
GEN = ROOT / "art" / "generated"
NOISE = 24          # альфа ниже — шум сжатия в фоне: гасится
EDGE = 8            # обрезка — по альфе больше этого: так же режет поля export_ui.py, рамка картинки и выгрузки одна
STRIPS = {"s": "rb-strip/rb-strip-s__nb2.png", "m": "rb-strip/rb-strip-m__nb2.png", "l": "rb-strip/rb-strip-l2__nb2.png"}
FRAGS = "rb-sheet/rb-frags__nb2.png"
BOOK = "rb-wide/rb-book__nb2.png"


def clean(im):
    """Картинка без шума в фоне: альфа ниже NOISE — ноль; оставить только связные куски крупнее 0,5 % кадра."""
    a = np.asarray(im.getchannel("A")).copy()
    a[a < NOISE] = 0
    lab, n = ndimage.label(a > 0)
    if n:
        sizes = ndimage.sum(np.ones_like(a), lab, index=np.arange(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes > 0.005 * a.size
        a[~keep[lab]] = 0
    out = im.copy()
    out.putalpha(Image.fromarray(a))
    return out, lab if n else None


def crop(im):
    a = np.asarray(im.getchannel("A"))
    ys, xs = np.where(a > EDGE)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def ratio(im):
    """Ширина к высоте, ‰ — по непрозрачной бумаге (альфа от 128), без поля обрезки."""
    a = np.asarray(im.getchannel("A"))
    ys, xs = np.where(a >= 128)
    return round((xs.max() + 1 - xs.min()) * 1000 / (ys.max() + 1 - ys.min()))


def strips():
    out = {}
    for k, src in STRIPS.items():
        im, _ = clean(Image.open(GEN / src).convert("RGBA"))
        im = crop(im)
        dst = GEN / "rb-strip" / f"rb-strip-{k}.cut.png"
        im.save(dst, optimize=True)
        out[k] = {"ratio": ratio(im), "px": list(im.size), "file": dst.relative_to(GEN).as_posix()}
    return out


def frags():
    im, _ = clean(Image.open(GEN / FRAGS).convert("RGBA"))
    a = np.asarray(im.getchannel("A"))
    lab, n = ndimage.label(a > 0)
    sizes = ndimage.sum(np.ones_like(a), lab, index=np.arange(1, n + 1))
    big = [i + 1 for i in np.argsort(sizes)[::-1][:9]]
    if len(big) < 9:
        sys.exit(f"обрывков {len(big)}, а нужно девять")
    boxes = []
    for i in big:
        ys, xs = np.where(lab == i)
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, i))
    row = (im.height // 3)
    boxes.sort(key=lambda b: ((b[1] + b[3]) // 2 // row, b[0]))   # по строкам листа, в строке — слева направо
    out = []
    for k, (x0, y0, x1, y1, i) in enumerate(boxes, 1):
        piece = im.crop((x0, y0, x1, y1))
        m = (lab[y0:y1, x0:x1] == i)
        pa = np.asarray(piece.getchannel("A")).copy()
        pa[~m] = 0                                                        # только свой кусок, без края соседа
        piece.putalpha(Image.fromarray(pa))
        piece = crop(piece)
        dst = GEN / "rb-sheet" / f"rb-frag-{k}.cut.png"
        piece.save(dst, optimize=True)
        out.append({"k": k, "ratio": ratio(piece), "px": list(piece.size), "file": dst.relative_to(GEN).as_posix()})
    return out


LINE = 40          # тонкая линейка: ярче соседей через 3 px на столько (сумма каналов)
MARGIN = 6         # поле от линейки внутрь страницы, ‰ ширины картинки
FRINGE = (24, 20, 17)   # цвет полупрозрачной кромки обложки: ключ оставляет на ней зелёный отлив — кромка тёмной кожи


def peaks(lum, axis):
    """Где тонкая светлая линия: по оси x (axis=1) — вертикальные линии, по y (axis=0) — горизонтальные."""
    a = lum
    if axis == 1:
        c, l, r = a[:, 3:-3], a[:, :-6], a[:, 6:]
        m = np.zeros_like(a, bool)
        m[:, 3:-3] = (c > l + LINE) & (c > r + LINE)
    else:
        c, u, d = a[3:-3, :], a[:-6, :], a[6:, :]
        m = np.zeros_like(a, bool)
        m[3:-3, :] = (c > u + LINE) & (c > d + LINE)
    return m


def clusters(idx, gap=6):
    """Соседние индексы — одна линия: список [от, до]."""
    out = []
    for i in idx:
        if out and i - out[-1][1] <= gap:
            out[-1][1] = i
        else:
            out.append([i, i])
    return out


def book():
    im, _ = clean(Image.open(GEN / BOOK).convert("RGBA"))
    im = crop(im)
    px = np.asarray(im).copy()
    edge = (px[..., 3] > 0) & (px[..., 3] < 255)
    px[edge, :3] = FRINGE
    im = Image.fromarray(px, "RGBA")
    dst = GEN / "rb-wide" / "rb-book.cut.png"
    im.save(dst, optimize=True)
    lum = np.asarray(im.convert("RGB")).astype(int).sum(-1)
    H, W = lum.shape
    vert, horz = peaks(lum, 1), peaks(lum, 0)
    pages = {}
    for side, (xa, xb) in {"l": (0, W // 2), "r": (W // 2, W)}.items():
        band = vert[int(H * 0.30):int(H * 0.70), xa:xb].sum(axis=0)
        cols = clusters(list(np.where(band >= band.max() * 0.4)[0] + xa))   # вертикальные линейки страницы
        mid = (xa + xb) // 2
        outer = [c for c in cols if c[1] < mid]
        inner = [c for c in cols if c[0] > mid]
        if side == "r":
            outer, inner = inner, outer                                     # у правой страницы внешний край — справа
        x0 = (max(c[1] for c in outer) + 1) if side == "l" else (max(c[1] for c in inner) + 1)
        x1 = min(c[0] for c in inner) if side == "l" else min(c[0] for c in outer)
        # верхняя и нижняя линейки — по 24 столбцам страницы: где тонкая светлая линия в верхней пятой и нижних трёх десятых
        tops, bots = [], []
        for x in np.linspace(x0 + (x1 - x0) * 0.04, x1 - (x1 - x0) * 0.04, 24).astype(int):
            ys = np.where(horz[:, x])[0]
            t = [y for y in ys if y < H * 0.2]
            b = [y for y in ys if y > H * 0.7]
            if t:
                tops.append(max(t))
            if b:
                bots.append(min(b))
        # линейки выгнуты к корешку. Верх поля — ниже самой низкой верхней: там шапка страниц; низ — по середине выгиба нижней: низ
        # списка гаснет (маска), и линейку у корешка на несколько пикселей перекрывает только погасший край
        y0 = max(tops) + 1 if tops else 0
        y1 = int(np.median(bots)) if bots else H
        m = MARGIN * W // 1000
        pages[side] = [round((x0 + m) * 1000 / W), round((y0 + m) * 1000 / H), round((x1 - m) * 1000 / W), round((y1 - m) * 1000 / H)]
    return {"ratio": round(W * 1000 / H), "px": [W, H], "page": pages, "file": dst.relative_to(GEN).as_posix()}


EXPORT = {"book": 2000, "s": 640, "m": 900, "l": 1080, "frag": 168}   # ширина выгрузки, px: вдвое крупнее самого большого показа
NEAR = 8            # ширину выгрузки можно сдвинуть на столько px: берётся та, у которой высота в целых px даёт пропорцию точнее всего


def size_for(rel, w):
    """Размер выгрузки без искажения: export_ui.py обрезает поля по альфе > 8 и сжимает до size — высота из той же рамки.
    Высота — целые px, поэтому ширина подбирается рядом с заданной так, чтобы пропорция выгрузки совпала с рисунком точнее всего"""
    a = np.asarray(Image.open(GEN / rel).getchannel("A"))
    ys, xs = np.where(a > EDGE)
    bw, bh = xs.max() + 1 - xs.min(), ys.max() + 1 - ys.min()
    best = min(range(w - NEAR, w + NEAR + 1), key=lambda x: (abs(x / max(1, round(x * bh / bw)) - bw / bh), abs(x - w)))
    return [best, round(best * bh / bw)], round(bw * 1000 / bh)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    geo = {"strip": strips(), "frag": frags(), "book": book()}
    items = {}
    s, r = size_for(geo["book"]["file"], EXPORT["book"])
    items["rbook/book.webp"] = {"from": geo["book"]["file"], "size": s}
    geo["book"]["export"] = r
    for k, x in geo["strip"].items():
        s, r = size_for(x["file"], EXPORT[k])
        items[f"rbook/strip-{k}.webp"] = {"from": x["file"], "size": s}
        x["export"] = r
    for x in geo["frag"]:
        s, r = size_for(x["file"], EXPORT["frag"])
        items[f"rbook/frag-{x['k']}.webp"] = {"from": x["file"], "size": s}
        x["export"] = r
    print(json.dumps({"geo": geo, "ui-art": items}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
