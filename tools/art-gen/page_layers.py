"""Арт страниц книги героя — чернильные виньетки и закладки: геометрия для вёрстки (design/ui/screens/book-pages.js, PG_ART).
Задания — jobs/hero-book-ink.json (виньетки пером на белом) и jobs/hero-book-pages.json (рамки, закладки, кнопки). Числа — целые.

  ink    <jpg> <столбцы> <строки> <имя…>   лист виньеток пером на белом: белое уходит в прозрачность с восстановлением цвета чернил
                                           (как «цвет в альфу»: на белом картинка та же, на пергаменте остаются одни чернила), шум бумаги —
                                           в ноль; нарезка по пятнам (близкие точки — одна виньетка); каждая — <имя листа>-<имя>.png
  tongue <png…>                            закладка: из вырезанной закладки-«папки» — верхний язычок до плеч (там, где ширина скачком
                                           растёт), по ширине язычка; → .tongue.png. Срезы border-image — от краёв язычка, ‰
  gild   <png…>                            золото из чернил: виньетка пером → та же виньетка старым золотом для чернёного пергамента
                                           (слово автора 30.09.2026 о тёмной подложке страниц: чернила по чёрному не видны). Форма —
                                           альфа пера, цвет — золото сверху светлее, к низу бронзовее; гуще штрих — светлее; → .gilt.png

  python tools/art-gen/page_layers.py ink art/generated/pg-ink/pg-ink__nb2.jpg 3 2 head div corner cartouche tail wreath
  python tools/art-gen/page_layers.py gild art/generated/pg-ink/pg-ink__nb2-head.png art/generated/pg-ink/pg-ink__nb2-div.png
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import craft_layers as CL   # noqa: E402  нарезка по пятнам, пути и доли — как у листов «Ремесла»
from craft_layers import load, rel, stem, permille   # noqa: E402

NOISE = 0.07     # доля чернил, ниже которой пиксель — бумага, а не чернила
GILT = ((250, 226, 166), (218, 174, 94), (156, 112, 48))   # золото виньетки сверху вниз: светлое, старое, бронзовое
GILT_BODY = 0.72  # доля яркости у самого тонкого штриха: гуще штрих — ближе к полному золоту
GILT_ALPHA = 1.15  # тонкие штрихи чуть плотнее: золото по чёрному тоньше чернил по пергаменту
SHOULDER = 1.12  # во сколько раз ширина строки больше язычка — там начинаются плечи закладки
MERGE_INK = 0.03  # точки пера ближе этой доли стороны листа — одна виньетка


def blobs(a, cols, rows):
    """Виньетки по пятнам, как у craft_layers.py sheet, но пятна ближе MERGE_INK стороны листа — одна виньетка: у пера бывают отдельные
    точки (концовка — волна и три точки под ней). Сетку клеток не берём: завиток картуша заходит в соседнюю клетку"""
    keep = CL.MERGE
    CL.MERGE = MERGE_INK
    try:
        return CL.cut(a, cols, rows)
    finally:
        CL.MERGE = keep


def ink(p, cols, rows, names):
    src = load(p)
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255.0
    a = (1.0 - rgb).max(-1)                       # сколько чернил: самый тёмный канал относительно белого
    a = np.where(a < NOISE, 0.0, (a - NOISE) / (1.0 - NOISE))
    safe = np.maximum(a, 1e-4)[..., None]
    col = np.clip((rgb - (1.0 - safe)) / safe, 0.0, 1.0)   # цвет чернил: на белом с этой альфой — тот же пиксель
    rgba = np.dstack([col * 255.0, a * 255.0]).round().astype(np.uint8)
    parts = blobs(rgba, cols, rows)
    if len(names) != len(parts):
        sys.exit(f"имён {len(names)}, виньеток {len(parts)}")
    res = []
    for name, sub in zip(names, parts):
        out = src.with_name(stem(src) + f"-{name}.png")
        Image.fromarray(sub, "RGBA").save(out, optimize=True)
        res.append({"name": name, "file": rel(out), "px": [int(sub.shape[1]), int(sub.shape[0])], "ratio": permille(sub.shape[1], sub.shape[0])})
    return res


def tongue(p):
    src = load(p)
    im = Image.open(src).convert("RGBA")
    al = np.asarray(im)[..., 3] > 128
    widths = al.sum(1)
    top = int(np.nonzero(widths)[0].min())
    base = int(np.median(widths[top + 20:top + 120]))          # ширина язычка — ниже скругления углов
    grow = np.nonzero(widths[top + 20:] > base * SHOULDER)[0]
    bottom = top + 20 + int(grow.min()) - 6 if len(grow) else al.shape[0]
    mid = (top + bottom) // 2
    xs = np.nonzero(al[mid])[0]
    box = (int(xs.min()) - 2, max(0, top - 2), int(xs.max()) + 3, bottom)
    t = im.crop(box)
    out = src.with_name(src.stem + ".tongue.png")
    t.save(out, optimize=True)
    return {"file": rel(out), "px": [t.width, t.height], "ratio": permille(t.width, t.height)}


def gild(p):
    """Виньетка старым золотом: альфа — от пера, цвет — вертикальный переход GILT, яркость — от плотности штриха"""
    src = load(p)
    im = np.asarray(Image.open(src).convert("RGBA")).astype(np.float32)
    a = im[..., 3] / 255.0
    h = im.shape[0]
    t = np.linspace(0.0, 1.0, h)[:, None, None]
    top, mid, bot = [np.array(c, np.float32)[None, None, :] for c in GILT]
    ramp = np.where(t < 0.5, top + (mid - top) * (t / 0.5), mid + (bot - mid) * ((t - 0.5) / 0.5))
    col = ramp * (GILT_BODY + (1.0 - GILT_BODY) * a[..., None])
    alpha = np.clip(a * GILT_ALPHA, 0.0, 1.0) * 255.0
    rgba = np.dstack([np.clip(col, 0, 255), alpha]).round().astype(np.uint8)
    out = src.with_name(src.stem + ".gilt.png")
    Image.fromarray(rgba, "RGBA").save(out, optimize=True)
    return {"file": rel(out), "px": [int(rgba.shape[1]), int(rgba.shape[0])]}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    kind, args = sys.argv[1], sys.argv[2:]
    if kind == "ink":
        res = ink(args[0], int(args[1]), int(args[2]), args[3:])
    elif kind == "tongue":
        res = [tongue(a) for a in args]
    elif kind == "gild":
        res = [gild(a) for a in args]
    else:
        sys.exit(__doc__)
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
