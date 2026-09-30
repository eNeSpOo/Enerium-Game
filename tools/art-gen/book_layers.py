"""Арт карточки-книги героя: чистка, обрезка по рамке и геометрия для вёрстки (design/ui/screens/book.js, HB_ART).

Выбор автора 30.09.2026 — карточка героя = книга (ADR-0032, раздел «Выбор автора — карточка-книга»); задание — jobs/hero-books.json.
Всё, что зависит от героя (кристалл, уровень, стихия, класс, мощь, имя, замки пределов, ленты доблести), кладёт интерфейс поверх
арта. Чтобы вёрстка ложилась на рисунок, здесь снимается геометрия каждой картинки — в тысячных долях её рамки, только целые:

  cover-unglow <png…>    то же и без цветного ореола вокруг книги: модель иногда берёт свечение редкости с образца
  cover  <png…>          обложка ступени: окно под портрет — самая большая прозрачная область, не связанная с краем; core — тело
                         книги без выступов (шипы, кость, свет обреза): по нему стоят кружки, кристалл, замки и ленты;
                         win — окно [сверху, справа, снизу, слева]; ratio — ширина к высоте рамки
  spread <png…>          разворот ступени: страницы — светлые области пергамента; разошлись корешком — левая и правая отдельно,
                         иначе делятся самым тёмным столбцом посередине; left и right — [сверху, справа, снизу, слева],
                         gutter — x корешка, core — тело книги
  lock   <closed> <open> замок: оба рисунка кладутся на общий холст так, что тела замков совпадают (дужка открытого — выше);
                         key — скважина закрытого (середина тёмного пятна тела), glow — свет скважины открытого
  shape  <png…>          лента и звезда: тёмный ореол ключа black — прочь (альфа по яркости), контур для clip-path: у ленты —
                         прямоугольник с вырезом «ласточкин хвост» (вершина выреза — notch), у звезды — 16 точек по лучам
  sheet  <jpg> [x0 y0 x1 y1]  изнанка обложки и лист: только проверка и кадр вырезки в ‰ (crop для ui-art.json)

Результат ложится рядом с исходником: <имя>.book.png; вывод — JSON с геометрией. Порог альфы рамки — 8, как у export_ui.py.

  python tools/art-gen/book_layers.py cover art/generated/book-cover/book-cover-1__nb2.png
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
A_CUT = 8          # рамка PNG — по альфе > 8 (как у export_ui.py)
NOISE = 24         # альфа не выше этого у отдельных пятнышек в углах — шум ключа, прочь
CORE = 0.06        # тело книги: открытие квадратом в такую долю ширины — выступы уже него уходят
PARCH = (112, 92, 60)   # пергамент: каналы R, G, B не темнее этих
TEAL = 18           # бирюзовый свет замка: синий и зелёный выше красного больше чем на столько — не тело
GLOW = (12, 0, 8, 9, 72)   # цветной ореол: синий выше зелёного больше чем на [0], красный — на [1]; у кромки [2] px — без оттенка; нить тоньше [3] px и темнее [4] — прочь
DARK = (48, 96)    # тёмный ореол ленты и звезды: ярче DARK[1] — предмет целиком, темнее DARK[0] — прозрачно, между — плавно


def load(p):
    p = pathlib.Path(p)
    return (p if p.is_absolute() else ROOT / p)


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def permille(v, d):
    return int(round(v * 1000 / d))


def denoise(a):
    """Отдельные полупрозрачные пятнышки ключа (в углах и у края) — прочь: альфа ≤ NOISE вне тела."""
    al = a[..., 3]
    body = ndimage.binary_dilation(al > 96, iterations=3)
    a[..., 3] = np.where((al <= NOISE) & ~body, 0, al)
    a[a[..., 3] == 0, :3] = 0
    return a


def opening(mask, k):
    """Открытие квадратом k × k — разделимыми фильтрами минимума и максимума: быстро и на картинках 2K."""
    m = mask.astype(np.uint8)
    m = ndimage.minimum_filter(m, size=(k, k))
    return ndimage.maximum_filter(m, size=(k, k)).astype(bool)


def core_box(al, frame):
    """Тело книги без выступов: открытие маски квадратом CORE × ширина рамки."""
    x0, y0, x1, y1 = frame
    k = max(3, int((x1 - x0) * CORE))
    solid = ndimage.binary_fill_holes(al > 128)
    op = opening(solid, k)
    return bbox(op) if op.any() else frame


def inner_window(al):
    """Окно: самая большая прозрачная область, не связанная с краем кадра."""
    tr = al <= A_CUT
    lab, n = ndimage.label(tr)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]).tolist()))
    sizes = ndimage.sum(tr, lab, index=np.arange(1, n + 1))
    inner = [(sizes[i - 1], i) for i in range(1, n + 1) if i not in edge]
    if not inner:
        sys.exit("окна нет: прозрачной середины, не связанной с краем, не нашлось")
    return lab == max(inner)[1]


def rel(box, frame):
    """Прямоугольник [x0, y0, x1, y1] в ‰ рамки: [сверху, справа, снизу, слева]."""
    fx0, fy0, fx1, fy1 = frame
    FW, FH = fx1 - fx0, fy1 - fy0
    x0, y0, x1, y1 = box
    return [permille(y0 - fy0, FH), permille(fx1 - x1, FW), permille(fy1 - y1, FH), permille(x0 - fx0, FW)]


def save(a, frame, src, suffix=".book.png"):
    x0, y0, x1, y1 = frame
    out = src.with_name(src.name.split(".")[0] + suffix)
    Image.fromarray(a[y0:y1, x0:x1], "RGBA").save(out, optimize=True)
    return out


def unglow(a):
    """Цветной ореол вокруг книги (модель взяла его с образца) — прочь. Ореол бывает и непрозрачным: модель рисует его полосой вдоль
    края. Поэтому снимается по цвету: лиловые пиксели, связанные с пустотой вокруг книги, — прозрачные; у новой кромки оттенок
    снимается (серый той же яркости). Свет редкости даёт интерфейс."""
    al = a[..., 3]
    r, g, b = (a[..., i].astype(np.int32) for i in range(3))
    tint = ((b - g > GLOW[0]) & (r - g > GLOW[1])) | (al <= A_CUT)
    lab, n = ndimage.label(tint)
    out = ndimage.binary_dilation(al <= A_CUT, iterations=2)
    hit = np.unique(lab[out & (lab > 0)])
    gone = np.isin(lab, hit) & (lab > 0)
    a[..., 3] = np.where(gone, 0, al)
    # тёмная тонкая нить на месте внешнего края ореола — тоже прочь: тоньше открытия GLOW[3] px и темнее GLOW[4]
    opq = a[..., 3] > A_CUT
    k = GLOW[3]
    thin = opq & ~opening(opq, k) & (a[..., :3].max(-1) < GLOW[4])
    a[..., 3] = np.where(thin, 0, a[..., 3])
    near = ndimage.binary_dilation(gone, iterations=GLOW[2]) & ~gone & (b - g > 4)
    grey = a[..., :3].astype(np.int32).mean(-1).astype(np.uint8)
    for i in range(3):
        a[..., i] = np.where(near, grey, a[..., i])
    a[a[..., 3] == 0, :3] = 0
    return a


def cover(p, clean=False):
    src = load(p)
    a = denoise(np.asarray(Image.open(src).convert("RGBA")).copy())
    if clean:
        a = denoise(unglow(a))
    al = a[..., 3]
    frame = bbox(al > A_CUT)
    win = inner_window(al)
    wb = bbox(win)
    core = core_box(al, frame)
    out = save(a, frame, src)
    FW, FH = frame[2] - frame[0], frame[3] - frame[1]
    return {"file": out.relative_to(ROOT).as_posix(), "px": [FW, FH], "ratio": permille(FW, FH),
            "win": rel(wb, frame), "core": rel(core, frame)}


def spread(p):
    src = load(p)
    a = denoise(np.asarray(Image.open(src).convert("RGBA")).copy())
    al = a[..., 3]
    frame = bbox(al > A_CUT)
    r, g, b = (a[..., i].astype(np.int32) for i in range(3))
    parch = (al > 200) & (r >= PARCH[0]) & (g >= PARCH[1]) & (b >= PARCH[2]) & (r >= b)
    parch = ndimage.binary_opening(parch, iterations=2)
    parch = ndimage.binary_fill_holes(parch)
    lab, n = ndimage.label(parch)
    if not n:
        sys.exit("страниц нет: светлого пергамента не нашлось")
    sizes = ndimage.sum(parch, lab, index=np.arange(1, n + 1))
    order = np.argsort(sizes)[::-1]
    big = [bbox(lab == int(i) + 1) for i in order[:2] if sizes[i] >= sizes[order[0]] * 0.4]
    fx0, fy0, fx1, fy1 = frame
    mid = (fx0 + fx1) / 2
    if len(big) == 2 and (big[0][2] <= mid + 8 or big[0][0] >= mid - 8) and (big[1][2] <= mid + 8 or big[1][0] >= mid - 8):
        L, R = sorted(big, key=lambda x: x[0])     # страницы разошлись корешком: левая и правая — отдельно
        gx = (L[2] + R[0]) // 2
    else:
        x0, y0, x1, y1 = bbox(parch)
        lum = a[y0:y1, :, :3].astype(np.int32).mean(-1).mean(0)
        mid0, mid1 = x0 + (x1 - x0) * 2 // 5, x0 + (x1 - x0) * 3 // 5
        gx = int(mid0 + np.argmin(lum[mid0:mid1]))
        L, R = (x0, y0, gx, y1), (gx, y0, x1, y1)
    core = core_box(al, frame)
    out = save(a, frame, src)
    FW, FH = fx1 - fx0, fy1 - fy0
    return {"file": out.relative_to(ROOT).as_posix(), "px": [FW, FH], "ratio": permille(FW, FH),
            "left": rel(L, frame), "right": rel(R, frame), "gutter": permille(gx - fx0, FW), "core": rel(core, frame)}


def body_box(a):
    """Тело замка: непрозрачное и не бирюзовый свет; открытие квадратом в пятую часть ширины — дужка (тоньше) уходит."""
    al = a[..., 3]
    r, g, b = (a[..., i].astype(np.int32) for i in range(3))
    teal = (b - r > TEAL) & (g - r > TEAL)
    x0, y0, x1, y1 = bbox(al > A_CUT)
    k = max(3, (x1 - x0) // 5)
    solid = ndimage.binary_fill_holes((al > 128) & ~teal)
    op = opening(solid, k)
    lab, n = ndimage.label(op)
    sizes = ndimage.sum(op, lab, index=np.arange(1, n + 1))
    return bbox(lab == int(np.argmax(sizes)) + 1)


def lock(pc, po):
    sc, so = load(pc), load(po)
    A = [denoise(np.asarray(Image.open(s).convert("RGBA")).copy()) for s in (sc, so)]
    frames = [bbox(x[..., 3] > A_CUT) for x in A]
    bodies = [body_box(x) for x in A]
    # общий холст: тела совпадают по низу и по середине; открытый масштабируется к ширине тела закрытого
    k = (bodies[0][2] - bodies[0][0]) / (bodies[1][2] - bodies[1][0])
    if abs(k - 1) > 0.01:
        im = Image.fromarray(A[1], "RGBA")
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        A[1] = np.asarray(im).copy()
        frames[1] = bbox(A[1][..., 3] > A_CUT)
        bodies[1] = body_box(A[1])
    anchor = [((b[0] + b[2]) / 2, b[3]) for b in bodies]            # середина низа тела
    ext = []
    for f, (ax, ay) in zip(frames, anchor):
        ext.append((f[0] - ax, f[1] - ay, f[2] - ax, f[3] - ay))
    L, T = min(e[0] for e in ext), min(e[1] for e in ext)
    R, B = max(e[2] for e in ext), max(e[3] for e in ext)
    W, H = int(np.ceil(R - L)), int(np.ceil(B - T))
    outs = []
    for x, (ax, ay), s, tag in zip(A, anchor, (sc, so), (".book.png", ".book.png")):
        can = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        can.alpha_composite(Image.fromarray(x, "RGBA"), (int(round(-L - ax)), int(round(-T - ay))))
        out = s.with_name(s.name.split(".")[0] + tag)
        can.save(out, optimize=True)
        outs.append((out, np.asarray(can)))
    # скважина закрытого: самое тёмное пятно в теле (середина нижних двух третей), свет открытого — самое бирюзовое
    c = outs[0][1].astype(np.int32)
    bx0, by0, bx1, by1 = body_box(outs[0][1])
    sub = c[by0:by1, bx0:bx1]
    v = sub[..., :3].max(-1)
    dark = (sub[..., 3] > 200) & (v < np.percentile(v[sub[..., 3] > 200], 6))
    ys, xs = np.nonzero(dark)
    key = [permille(bx0 + xs.mean(), W), permille(by0 + ys.mean(), H)]
    o = outs[1][1].astype(np.int32)
    teal = (o[..., 3] > 60) & (o[..., 2] - o[..., 0] > 60) & (o[..., 1] - o[..., 0] > 60)
    ys, xs = np.nonzero(teal)
    glow = [permille(xs.mean(), W), permille(ys.mean(), H)] if len(xs) else key
    body = rel((bx0, by0, bx1, by1), (0, 0, W, H))
    return {"files": [x[0].relative_to(ROOT).as_posix() for x in outs], "px": [W, H], "ratio": permille(W, H),
            "body": body, "key": key, "glow": glow}


def shape(p):
    src = load(p)
    a = np.asarray(Image.open(src).convert("RGBA")).copy()
    v = a[..., :3].max(-1).astype(np.float32)
    keep = np.clip((v - DARK[0]) / (DARK[1] - DARK[0]), 0, 1)
    a[..., 3] = np.round(a[..., 3] * keep).astype(np.uint8)
    a = denoise(a)
    al = a[..., 3]
    frame = bbox(al > A_CUT)
    out = save(a, frame, src)
    x0, y0, x1, y1 = frame
    W, H = x1 - x0, y1 - y0
    m = al[y0:y1, x0:x1] > 128
    res = {"file": out.relative_to(ROOT).as_posix(), "px": [W, H], "ratio": permille(W, H)}
    if H > W * 1.8:
        # лента: вершина выреза — самый нижний непрозрачный пиксель в середине ширины
        col = m[:, W // 2 - 1:W // 2 + 2].any(1)
        ys = np.nonzero(col)[0]
        res["notch"] = permille(int(ys.max()) + 1, H)
        res["clip"] = [[0, 0], [1000, 0], [1000, 1000], [500, res["notch"]], [0, 1000]]
    else:
        cy, cx = ndimage.center_of_mass(m)
        pts = []
        for i in range(16):
            t = np.pi * 2 * i / 16 - np.pi / 2
            last = (cx, cy)
            for rr in np.arange(0, max(W, H), 0.5):
                x, y = int(round(cx + rr * np.cos(t))), int(round(cy + rr * np.sin(t)))
                if not (0 <= x < W and 0 <= y < H) or not m[y, x]:
                    break
                last = (x + 0.5, y + 0.5)
            pts.append([permille(last[0], W), permille(last[1], H)])
        res["center"] = [permille(cx, W), permille(cy, H)]
        res["clip"] = pts
    return res


def sheet(p, crop=None):
    src = load(p)
    with Image.open(src) as im:
        W, H = im.size
    res = {"file": src.relative_to(ROOT).as_posix(), "px": [W, H]}
    if crop:
        x0, y0, x1, y1 = crop
        res["crop_px"] = [x0 * W // 1000, y0 * H // 1000, x1 * W // 1000, y1 * H // 1000]
    return res


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    kind, args = sys.argv[1], sys.argv[2:]
    if kind == "cover":
        res = [cover(p) for p in args]
    elif kind == "cover-unglow":
        res = [cover(p, True) for p in args]
    elif kind == "spread":
        res = [spread(p) for p in args]
    elif kind == "lock":
        res = lock(args[0], args[1])
    elif kind == "shape":
        res = [shape(p) for p in args]
    elif kind == "sheet":
        res = sheet(args[0], [int(x) for x in args[1:5]] if len(args) >= 5 else None)
    else:
        sys.exit(__doc__)
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
