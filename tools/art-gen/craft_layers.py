"""Арт окон «Ремесла» — нарезка листов, рамки иконки предмета, уголки в четырёх отражениях, круглые вещи сверху и страница
гримуара: геометрия для вёрстки (design/ui/screens/crafthall.js, CR_ART). Задание — jobs/craft-hall.json. Числа — целые.

  sheet  <png> <столбцы> <строки> <имя…>   лист на чёрном ключе (картинка уже вырезана gen.py): предметы — связные пятна альфы,
                                            близкие пятна одного предмета сливаются; порядок — по строкам сверху, в строке слева
                                            направо. Каждый предмет — <имя листа>-<имя>.png, обрезан по альфе с полем PAD
  frames <png> <столбцы> <строки> <имя…> [--tone имя:яркость:насыщенность,…]
                                            лист рамок: нарезка как у sheet, затем каждая рамка приводится к одной геометрии —
                                            тело рамки (квадрат без рогов и зубцов) занимает BODY из CANON px холста по центру;
                                            выступы уходят в поле. win — окно рамки, ‰ тела [сверху, справа, снизу, слева];
                                            tone — поправка тона в % (рамку призыва из кости — темнее и спокойнее)
  corners <png>                             уголок, смотрящий в левый верх: обрезка по альфе и отражения → .tl .tr .bl .br.png
  disc   <png…>                             круглая вещь сверху: обрезка по альфе в квадрат по центру пятна → .disc.png; hole —
                                            радиус прозрачной середины (гнездо, пьедестал), ‰ радиуса; ring — где кончается рисунок
  wide   <png…>                             вещь с полем (помост, подушка, табличка): обрезка по альфе → .trim.png; ratio — ширина к
                                            высоте, ‰
  book   <png> <срез слева> <срез справа>   разворот гримуара → страница для border-image: столбцы между срезами (корешок и лента)
                                            убираются, края страниц — внешние стороны разворота, шов сглаживается → .page.png

  python tools/art-gen/craft_layers.py frames art/generated/cr-sheet/cr-frames__nb2.png 4 2 res key boss made call rune karst city --tone call:78:62
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image, ImageEnhance, ImageOps
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
A_CUT = 8        # альфа, с которой пиксель считается рисунком — как у export_ui.py
PAD = 6          # поле вокруг предмета при нарезке, px
MERGE = 0.009    # пятна ближе этой доли стороны листа — один предмет (зубцы рамки, лучи блика); больше — сливаются соседи
CANON, BODY = 256, 200   # рамка: холст и тело рамки на нём, px; выступы (рога, зубцы) — в поле (CANON - BODY) / 2
SOLID = 96       # альфа, с которой пиксель — тело рамки, а не свечение


def load(p):
    p = pathlib.Path(p)
    return p if p.is_absolute() else ROOT / p


def rel(p):
    return p.relative_to(ROOT).as_posix()


def permille(v, d):
    return int(round(v * 1000 / d))


def rgba(p):
    return np.asarray(Image.open(p).convert("RGBA"))


def stem(src):
    return src.name.split(".")[0]


def save(a, src, suffix):
    out = src.with_name(stem(src) + suffix)
    Image.fromarray(a.astype(np.uint8), "RGBA").save(out, optimize=True)
    return out


def trim(a, pad=0):
    ys, xs = np.nonzero(a[..., 3] > A_CUT)
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(a.shape[0], ys.max() + 1 + pad), max(0, xs.min() - pad), min(a.shape[1], xs.max() + 1 + pad)
    return a[y0:y1, x0:x1], (x0, y0, x1, y1)


def cut(a, cols, rows):
    """Предметы листа по порядку: строки сверху вниз, в строке слева направо. Каждый — только своё пятно."""
    H, W = a.shape[:2]
    mask = a[..., 3] > A_CUT
    grow = max(2, int(min(H, W) * MERGE))
    lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=grow))
    objs = [(int((lab[sl] == i).sum()), i, sl) for i, sl in enumerate(ndimage.find_objects(lab), 1) if sl is not None]
    objs.sort(key=lambda o: -o[0])
    want = cols * rows
    if len(objs) < want:
        sys.exit(f"предметов {len(objs)}, ждали {want}")
    objs = objs[:want]
    cy = lambda o: (o[2][0].start + o[2][0].stop) / 2
    cx = lambda o: (o[2][1].start + o[2][1].stop) / 2
    objs.sort(key=cy)
    ordered = []
    for r in range(rows):
        ordered += sorted(objs[r * cols:(r + 1) * cols], key=cx)
    out = []
    for _, i, sl in ordered:
        y0, y1 = max(0, sl[0].start - PAD), min(H, sl[0].stop + PAD)
        x0, x1 = max(0, sl[1].start - PAD), min(W, sl[1].stop + PAD)
        sub = a[y0:y1, x0:x1].copy()
        sub[..., 3] = np.where(lab[y0:y1, x0:x1] == i, sub[..., 3], 0)   # соседское пятно в рамке — прочь
        out.append(trim(sub, PAD)[0])
    return out


def sheet(p, cols, rows, names):
    src = load(p)
    parts = cut(rgba(src), cols, rows)
    if len(names) != len(parts):
        sys.exit(f"имён {len(names)}, предметов {len(parts)}")
    res = []
    for name, sub in zip(names, parts):
        out = src.with_name(stem(src) + f"-{name}.png")
        Image.fromarray(sub, "RGBA").save(out, optimize=True)
        res.append({"name": name, "file": rel(out), "px": [int(sub.shape[1]), int(sub.shape[0])], "ratio": permille(sub.shape[1], sub.shape[0])})
    return res


def body_box(a):
    """Окно и тело рамки: окно — прозрачный квадрат вокруг середины, тело — от окна наружу по середине каждой стороны, пока рисунок
    плотный. Возвращает (окно, тело) — [x0, y0, x1, y1]."""
    al = a[..., 3]
    H, W = al.shape
    cy, cx = H // 2, W // 2
    solid = al > SOLID

    def run(line, want):
        k = 0
        while k < len(line) and bool(line[k]) == want:
            k += 1
        return k
    band = max(3, min(H, W) // 12)
    # окно: от середины до плотного рисунка — по полосе в двенадцатую часть стороны
    up = run(solid[cy::-1, cx - band:cx + band].any(1), False)
    dn = run(solid[cy:, cx - band:cx + band].any(1), False)
    lf = run(solid[cy - band:cy + band, cx::-1].any(0), False)
    rt = run(solid[cy - band:cy + band, cx:].any(0), False)
    win = [cx - lf, cy - up, cx + rt, cy + dn]

    def thick(line):
        """Толщина рамки по середине стороны: прозрачный зазор до рисунка (край окна искали полосой) — пропустить, затем плотное."""
        k = run(line, False)
        return k + run(line[k:], True)
    # тело: от края окна наружу, пока рисунок плотный (по середине стороны, без рогов и зубцов по углам)
    t_up = thick(solid[win[1] - 1::-1, cx])
    t_dn = thick(solid[win[3]:, cx])
    t_lf = thick(solid[cy, win[0] - 1::-1])
    t_rt = thick(solid[cy, win[2]:])
    body = [win[0] - t_lf, win[1] - t_up, win[2] + t_rt, win[3] + t_dn]
    return win, body


def tone(im, bright, sat):
    rgb, al = im.convert("RGB"), im.getchannel("A")
    rgb = ImageEnhance.Brightness(ImageEnhance.Color(rgb).enhance(sat / 100)).enhance(bright / 100)
    rgb.putalpha(al)
    return rgb


def frames(p, cols, rows, names, tones):
    src = load(p)
    parts = cut(rgba(src), cols, rows)
    if len(names) != len(parts):
        sys.exit(f"имён {len(names)}, рамок {len(parts)}")
    res = []
    for name, sub in zip(names, parts):
        win, body = body_box(sub)
        bw, bh = body[2] - body[0], body[3] - body[1]
        k = BODY / max(bw, bh)
        im = Image.fromarray(sub, "RGBA")
        if name in tones:
            im = tone(im, *tones[name])
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        # тело — в середину холста: левый верх тела на поле (CANON - BODY) / 2
        off = (CANON - BODY) // 2
        ox, oy = off - round(body[0] * k) + (BODY - round(bw * k)) // 2, off - round(body[1] * k) + (BODY - round(bh * k)) // 2
        canvas = Image.new("RGBA", (CANON, CANON), (0, 0, 0, 0))
        canvas.paste(im, (ox, oy), im)
        # углы холста — едва видимая точка (альфа A_CUT + 1): выгрузка export_ui.py обрезает прозрачные поля, а поле здесь — геометрия
        for xy in ((0, 0), (CANON - 1, 0), (0, CANON - 1), (CANON - 1, CANON - 1)):
            canvas.putpixel(xy, (0, 0, 0, A_CUT + 1))
        out = src.with_name(stem(src) + f"-{name}.png")
        canvas.save(out, optimize=True)
        w = [round((win[1] - body[1]) * k), round((body[2] - win[2]) * k), round((body[3] - win[3]) * k), round((win[0] - body[0]) * k)]
        res.append({"name": name, "file": rel(out), "px": [CANON, CANON], "body": BODY, "win": [permille(x, BODY) for x in w]})
    return res


def corners(p):
    src = load(p)
    a, _ = trim(rgba(src))
    im = Image.fromarray(a, "RGBA")
    out = {}
    for k, v in (("tl", im), ("tr", ImageOps.mirror(im)), ("bl", ImageOps.flip(im)), ("br", ImageOps.flip(ImageOps.mirror(im)))):
        f = src.with_name(stem(src) + f".{k}.png")
        v.save(f, optimize=True)
        out[k] = rel(f)
    return {"files": out, "px": [im.width, im.height], "ratio": permille(im.width, im.height)}


def disc(p):
    src = load(p)
    a, _ = trim(rgba(src))
    H, W = a.shape[:2]
    s = max(H, W)
    sq = np.zeros((s, s, 4), np.uint8)
    sq[(s - H) // 2:(s - H) // 2 + H, (s - W) // 2:(s - W) // 2 + W] = a
    out = save(sq, src, ".disc.png")
    al = sq[..., 3].astype(np.float32)
    c = s / 2
    yy, xx = np.mgrid[0:s, 0:s]
    rr = np.sqrt((yy + .5 - c) ** 2 + (xx + .5 - c) ** 2).astype(int)
    bins = np.arange(0, int(c) + 1)
    prof = np.asarray(ndimage.mean(al, labels=np.minimum(rr, int(c)), index=bins))
    solid = np.nonzero(prof > 128)[0]
    hole = int(solid.min()) if len(solid) else 0
    ring = int(solid.max()) + 1 if len(solid) else int(c)
    return {"file": rel(out), "px": [s, s], "hole": permille(hole, c), "ring": permille(ring, c)}


def wide(p):
    src = load(p)
    a, _ = trim(rgba(src))
    out = save(a, src, ".trim.png")
    return {"file": rel(out), "px": [int(a.shape[1]), int(a.shape[0])], "ratio": permille(a.shape[1], a.shape[0])}


def book(p, xl, xr):
    """Страница из разворота: левая часть до xl и правая от xr, шов — плавный переход в полосе BLEND px."""
    src = load(p)
    a = rgba(src).astype(np.float32)
    H, W = a.shape[:2]
    blend = 24
    left, right = a[:, :xl + blend], a[:, xr - blend:]
    w = (np.arange(2 * blend, dtype=np.float32) + .5) / (2 * blend)
    seam = left[:, -2 * blend:] * (1 - w)[None, :, None] + right[:, :2 * blend] * w[None, :, None]
    page = np.concatenate([left[:, :-2 * blend], seam, right[:, 2 * blend:]], axis=1)
    # хвост ленты висит ниже книги посередине: у страницы низ — там, где кончается книга по краям
    al = page[..., 3] > A_CUT
    edge = np.concatenate([al[:, :page.shape[1] // 4], al[:, -page.shape[1] // 4:]], axis=1)
    ys = np.nonzero(edge.any(1))[0]
    page[ys.max() + 1:, :, 3] = 0
    page, _ = trim(page.round().astype(np.uint8))
    out = save(page, src, ".page.png")
    # срезы для border-image: от края страницы до золотой линовки с запасом на завитки в углах — ‰ ширины и высоты страницы
    return {"page": rel(out), "px": [int(page.shape[1]), int(page.shape[0])]}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    kind, args = sys.argv[1], sys.argv[2:]
    tones = {}
    if "--tone" in args:
        i = args.index("--tone")
        for x in args[i + 1].split(","):
            n, b, s = x.split(":")
            tones[n] = (int(b), int(s))
        args = args[:i] + args[i + 2:]
    if kind == "sheet":
        res = sheet(args[0], int(args[1]), int(args[2]), args[3:])
    elif kind == "frames":
        res = frames(args[0], int(args[1]), int(args[2]), args[3:], tones)
    elif kind == "corners":
        res = corners(args[0])
    elif kind == "disc":
        res = [disc(x) for x in args]
    elif kind == "wide":
        res = [wide(x) for x in args]
    elif kind == "book":
        res = book(args[0], int(args[1]), int(args[2]))
    else:
        sys.exit(__doc__)
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
