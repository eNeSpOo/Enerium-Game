"""Рамка карты боя: чистое прямоугольное окно, обрезка по альфе, окно и нарезка border-image в данных, превью на портрете.

Рамки карт боя (jobs/battle-frames.json) рисуются на чёрном и вырезаются ключом black: окно — большая закрытая тёмная область,
cutout.py делает его прозрачным. Дальше здесь:
1. Фон. Шум чёрного фона ключ оставляет едва видимой вуалью (альфа до BG_MIN) — она прочь; сор вне рамки (шум сжатия в углах кадра)
   — области меньше JUNK px дальше NEAR px от рамки — тоже.
2. Окно — самая большая прозрачная область, не связанная с краем кадра. Оно прямоугольное, поэтому край окна — прямая:
   верх — перцентиль EDGE_PCT верхних точек окна по столбцам средней части, низ, лево и право — так же. Там, где окно начинается
   глубже прямой, лежит тёмный ореол украшения: всё темнее DARK внутри прямоугольника окна (глубже края на GAP px) — прочь,
   светлые части украшения остаются; одиночные пятнышки до SPECK px — тоже прочь. Край — мягкий в FEATHER px. --no-halo — ореол
   не чистить: в окно заходит тёмное украшение, а не свечение (цепи «забытого»).
3. Обрезка по альфе > A_CUT — та же рамка, что у export_ui.py: доли ниже совпадают с выгруженной картинкой.
4. win — окно в тысячных долях рисунка [сверху, справа, снизу, слева]: прямоугольник окна, расширенный на OVER px под кромку
   рамки, — портрет встаёт под неё без щели. cut — нарезка border-image в тех же единицах: углы забирают украшение целиком
   (строки, где контур бока отходит от прямой планки больше чем на TOL px, и ещё MARGIN px), края между углами — прямые планки:
   их браузер тянет по высоте карты, углы и верх остаются без искажений. Числа win и cut — в BF.types (design/ui/screens/battle-cards.js).
5. --preview — рамка поверх портрета в размерах карт боя (обычная и главная, 932 × 430 и 844 × 390), нарезкой как в браузере,
   с именем на низу портрета и полосой здоровья на нижней планке: <имя>.preview.png рядом. Превью в репозиторий не кладём.

  python tools/art-gen/battle_frame.py art/generated/battle-frames/bf-b__nb2.png [ещё файлы…] [--no-halo] [--preview --portrait design/ui/assets/art/foes/b1.jpg]
Результат ложится рядом: <имя>.bf.png — рамка к выгрузке. Вывод — JSON по каждой рамке: размер, win, cut, сколько очищено.
"""
import argparse
import json
import pathlib
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
A_CUT = 8          # порог выгрузки: рамка PNG — по альфе > 8 (export_ui.py)
BG_MIN = 28        # вуаль фона: непрозрачнее этого — рамка, прозрачнее — шум ключа
EDGE_PCT = 15      # край окна — такой перцентиль крайних точек окна: ореол и зазубрины не сдвигают прямую
MID = 0.15         # средняя часть стороны окна — без крайних долей: там углы и их украшение
DARK = 96          # темнее этого по самому яркому каналу — ореол, а не кромка, кость или огонь
GAP = 3            # чистка начинается на столько px глубже края окна — светлая кромка рамки цела
SPECK = 80         # пятнышко внутри окна не больше стольких px — прочь
JUNK = 400         # сор вне рамки: область меньше стольких px …
NEAR = 24          # … дальше стольких px от рамки — прочь
FEATHER = 2        # мягкий край очищенного, px
OVER = 5           # окно в данных шире прозрачного на столько px с каждой стороны: портрет уходит под кромку
TOL = 6            # контур бока отходит от прямой планки больше чем на столько px — это украшение угла
MARGIN = 8         # запас нарезки за украшением угла, px

# карты боя для превью: [ширина портрета, высота кадра --fh, подпись] — CSS index.html: .bc 74 px, .bc.lead 84 px,
# --fh 62 px и 48 px на низком экране, у главной — rowh − 30: 70 и 56
CARDS = [(74, 62, "74 · 932x430"), (74, 48, "74 · 844x390"), (84, 70, "84 lead · 932x430"), (84, 56, "84 lead · 844x390")]
# раскладка карты с рамкой — screens/battle-cards.css: имя ложится на низ портрета, полоса здоровья — на нижнюю планку рамки, под ней
# шансы. Карта без рамки: кадр + 35 px (зазор, имя, зазор, полоса, зазор, шансы); с рамкой: над окном T, кадр, max(BAR, B), зазор, шансы —
# кадр с рамкой выше прежнего на FREE и ниже на T и max(BAR, B): высота карты та же
FREE = 21
BAR = 4            # полоса здоровья под окном, px (5 px, из них 1 — на портрете)
SCALE = 4          # превью крупнее в столько раз


def window(al):
    """Окно: самая большая прозрачная область, не связанная с краем кадра."""
    tr = al <= A_CUT
    lab, n = ndimage.label(tr)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])).tolist())
    sizes = ndimage.sum(tr, lab, index=np.arange(1, n + 1))
    inner = [(sizes[i - 1], i) for i in range(1, n + 1) if i not in edge]
    if not inner:
        sys.exit("окна нет: прозрачной середины, не связанной с краем, не нашлось")
    return lab == max(inner)[1]


def rect_of(win):
    """Прямоугольник окна по прямым краям: перцентили крайних точек в средней части каждой стороны."""
    ys, xs = np.nonzero(win)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    cw, ch = x1 - x0 + 1, y1 - y0 + 1
    cols = [x for x in range(x0 + int(cw * MID), x1 - int(cw * MID) + 1) if win[:, x].any()]
    rows = [y for y in range(y0 + int(ch * MID), y1 - int(ch * MID) + 1) if win[y].any()]
    tops = [np.nonzero(win[:, x])[0].min() for x in cols]
    bots = [np.nonzero(win[:, x])[0].max() for x in cols]
    lefts = [np.nonzero(win[y])[0].min() for y in rows]
    rights = [np.nonzero(win[y])[0].max() for y in rows]
    return (int(np.percentile(tops, EDGE_PCT)), int(np.percentile(rights, 100 - EDGE_PCT)),
            int(np.percentile(bots, 100 - EDGE_PCT)), int(np.percentile(lefts, EDGE_PCT)))


def dejunk(al):
    """Сор вне рамки — прочь: области непрозрачного меньше JUNK px дальше NEAR px от самой рамки (шум сжатия в углах кадра,
    отлетевшая искра). Рамка — самая большая связная область; отдельные части украшения крупнее JUNK или рядом с ней остаются."""
    op = al > A_CUT
    lab, n = ndimage.label(op, structure=np.ones((3, 3)))
    if n < 2:
        return al, 0
    sizes = ndimage.sum(op, lab, index=np.arange(1, n + 1))
    main = lab == int(np.argmax(sizes)) + 1
    near = ndimage.binary_dilation(main, iterations=NEAR)
    drop = np.zeros_like(op)
    for i in range(1, n + 1):
        comp = lab == i
        if sizes[i - 1] < JUNK and not (comp & near).any():
            drop |= comp
    al = al.copy()
    al[drop] = 0
    return al, int(drop.sum())


def clean(a, halo=True):
    """Вуаль фона, сор и ореол в окне — прочь. Возвращает очищенный RGBA, прямоугольник окна (верх, право, низ, лево) и сколько
    пикселей очищено. halo=False — ореол не чистить: в окно заходит тёмный предмет украшения (цепь), а не свечение."""
    a = a.copy()
    al = a[..., 3].astype(np.int32)
    al[al < BG_MIN] = 0
    al, junk = dejunk(al)
    v = a[..., :3].max(-1).astype(np.int32)
    win = window(al)
    t, r, b, l = rect_of(win)
    zone = np.zeros(al.shape, bool)
    if halo:
        zone[t + GAP:b - GAP + 1, l + GAP:r - GAP + 1] = True
    cut = zone & (al > 0) & (v < DARK)
    # пятнышки, окружённые прозрачным и очищенным, — прочь
    lab, n = ndimage.label(zone & (al > 0) & ~cut)
    free = cut | (al == 0)
    for i in range(1, n + 1):
        comp = lab == i
        if comp.sum() <= SPECK and free[ndimage.binary_dilation(comp) & ~comp].all():
            cut |= comp
    d = ndimage.distance_transform_edt(~cut)
    keep = np.clip(d / (FEATHER + 1), 0, 1)
    al = np.where(cut, 0, np.round(al * np.where(d <= FEATHER, keep, 1))).astype(np.int32)
    a[..., 3] = al.astype(np.uint8)
    a[a[..., 3] == 0, :3] = 0
    return a, (t, r, b, l), int(cut.sum()) + junk


def bbox(al):
    ys, xs = np.nonzero(al > A_CUT)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def side_cut(al, rect):
    """Нарезка: где кончается украшение углов. Контур бока — крайняя непрозрачная точка строки снаружи окна и край окна;
    у прямой планки он постоянный (медиана средних строк). Углы — строки, где контур отходит дальше TOL."""
    t, r, b, l = rect
    h, w = al.shape
    op = al > A_CUT
    def outer(y, left):
        row = np.nonzero(op[y, :l] if left else op[y, r + 1:])[0]
        if not len(row):
            return None
        return int(row.min()) if left else int(r + 1 + row.max())
    def inner(y, left):   # край окна в строке: у прямой планки — l или r
        row = np.nonzero(~op[y, l:r + 1])[0]
        if not len(row):
            return None
        return int(l + row.min()) if left else int(l + row.max())
    mid = range(t + (b - t) // 3, b - (b - t) // 3 + 1)
    prof = {}
    for left in (True, False):
        o = [outer(y, left) for y in mid]
        i = [inner(y, left) for y in mid]
        prof[left] = (np.median([x for x in o if x is not None]), np.median([x for x in i if x is not None]))
    def odd(y):
        for left in (True, False):
            o, i = outer(y, left), inner(y, left)
            mo, mi = prof[left]
            if o is None or i is None or abs(o - mo) > TOL or abs(i - mi) > TOL:
                return True
        return False
    top = t
    for y in range(t, (t + b) // 2):
        if odd(y):
            top = y
    bot = b
    for y in range(b, (t + b) // 2, -1):
        if odd(y):
            bot = y
    return top + MARGIN, bot - MARGIN


def measure(path, halo=True):
    src = np.asarray(Image.open(path).convert("RGBA"))
    a, rect, cleaned = clean(src, halo)
    x0, y0, x1, y1 = bbox(a[..., 3])
    a = a[y0:y1, x0:x1]
    t, r, b, l = rect[0] - y0, rect[1] - x0, rect[2] - y0, rect[3] - x0
    H, W = a.shape[:2]
    top, bot = side_cut(a[..., 3], (t, r, b, l))
    pm = lambda v, d: int(round(v * 1000 / d))
    win = [pm(max(0, t - OVER), H), pm(max(0, W - 1 - r - OVER), W), pm(max(0, H - 1 - b - OVER), H), pm(max(0, l - OVER), W)]
    cut = [max(win[0], pm(top, H)), win[1] + pm(OVER * 2, W), max(win[2], pm(H - 1 - bot, H)), win[3] + pm(OVER * 2, W)]
    out = path.with_name(path.stem + ".bf.png")
    Image.fromarray(a, "RGBA").save(out, optimize=True)
    return {"file": out.relative_to(ROOT).as_posix(), "px": [W, H], "win": win, "cut": cut, "cleaned_px": cleaned,
            "window_ratio": round((W * (1000 - win[1] - win[3])) / max(1, H * (1000 - win[0] - win[2])), 3)}


def nine(img, slices, box, widths):
    """border-image: stretch, без fill — как браузер. slices и widths — [верх, право, низ, лево]; box — (ширина, высота)."""
    W, H = img.size
    st, sr, sb, sl = slices
    bt, br, bb, bl = widths
    w, h = box
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    parts = [((0, 0, sl, st), (0, 0, bl, bt)), ((W - sr, 0, W, st), (w - br, 0, w, bt)),
             ((0, H - sb, sl, H), (0, h - bb, bl, h)), ((W - sr, H - sb, W, H), (w - br, h - bb, w, h)),
             ((sl, 0, W - sr, st), (bl, 0, w - br, bt)), ((sl, H - sb, W - sr, H), (bl, h - bb, w - br, h)),
             ((0, st, sl, H - sb), (0, bt, bl, h - bb)), ((W - sr, st, W, H - sb), (w - br, bt, w, h - bb))]
    for s, d in parts:
        dw, dh = d[2] - d[0], d[3] - d[1]
        if dw > 0 and dh > 0 and s[2] > s[0] and s[3] > s[1]:
            out.alpha_composite(img.crop(s).resize((dw, dh), Image.LANCZOS), (d[0], d[1]))
    return out


def card(frame, m, portrait, fw, fh, k=SCALE):
    """Карта боя в масштабе k: портрет под рамкой, окно = кадр портрета; имя — на низу портрета, полоса здоровья — на нижней
    планке (как в screens/battle-cards.css)."""
    W, H = m["px"]
    wt, wr, wb, wl = m["win"]
    ct, cr, cb, cl = m["cut"]
    Wf = fw * 1000 / (1000 - wl - wr)                 # ширина рамки, px карты
    ar = H / W
    T, B = Wf * ar * wt / 1000, Wf * ar * wb / 1000
    face_h = fh + FREE - T - max(BAR, B)
    ow, oh = round(Wf * k), round((T + face_h + B) * k)
    pw, ph = round(fw * k), round(face_h * k)
    ox, oy = round(Wf * wl / 1000 * k), round(T * k)
    canvas = Image.new("RGBA", (ow, max(oh, oy + ph + 5 * k)), (0, 0, 0, 0))
    pic = portrait.copy()
    sc = max(pw / pic.width, ph / pic.height)
    pic = pic.resize((max(pw, round(pic.width * sc)), max(ph, round(pic.height * sc))), Image.LANCZOS)
    top = round((pic.height - ph) * 0.08)
    canvas.alpha_composite(pic.crop((round((pic.width - pw) / 2), top, round((pic.width - pw) / 2) + pw, top + ph)).convert("RGBA"), (ox, oy))
    sl = [round(ct * H / 1000), round(cr * W / 1000), round(cb * H / 1000), round(cl * W / 1000)]
    bw = [round(Wf * ar * ct / 1000 * k), round(Wf * cr / 1000 * k), round(Wf * ar * cb / 1000 * k), round(Wf * cl / 1000 * k)]
    canvas.alpha_composite(nine(frame, sl, (ow, oh), bw))
    # имя на низу портрета: тёмная подложка и светлая строка; полоса здоровья — на нижней планке
    d = ImageDraw.Draw(canvas)
    band = Image.new("RGBA", (pw, 12 * k), (5, 6, 8, 0))
    for y in range(12 * k):
        ImageDraw.Draw(band).line([(0, y), (pw, y)], fill=(5, 6, 8, int(215 * y / (12 * k))))
    canvas.alpha_composite(band, (ox, oy + ph - 13 * k))
    d.rectangle([ox + 3 * k, oy + ph - 9 * k, ox + 3 * k + 34 * k, oy + ph - 3 * k], fill=(236, 228, 211, 220))
    by = oy + ph - 1 * k
    d.rectangle([ox, by, ox + pw, by + 5 * k], fill=(11, 13, 15, 255), outline=(32, 37, 42, 255))
    d.rectangle([ox + k, by + k, ox + pw * 7 // 10, by + 4 * k], fill=(200, 60, 48, 255))
    return canvas, {"T": round(T, 1), "B": round(B, 1), "face": [fw, round(face_h, 1)], "frame_w": round(Wf, 1)}


def preview(m, portrait_path):
    frame = Image.open(ROOT / m["file"]).convert("RGBA")
    portrait = Image.open(portrait_path).convert("RGB")
    cards = [card(frame, m, portrait, fw, fh) for fw, fh, _ in CARDS]
    pad = 24 * SCALE // 4
    W = sum(c.width for c, _ in cards) + pad * (len(cards) + 1)
    Hh = max(c.height for c, _ in cards) + pad * 2 + 18
    bg = Image.new("RGBA", (W, Hh), (18, 21, 24, 255))
    d = ImageDraw.Draw(bg)
    x = pad
    geo = []
    for (c, g), (_, _, label) in zip(cards, CARDS):
        bg.alpha_composite(c, (x, pad))
        d.text((x, pad + c.height + 4), f"{label}: T {g['T']} B {g['B']} кадр {g['face'][0]}×{g['face'][1]}", fill=(200, 200, 200, 255))
        geo.append(g)
        x += c.width + pad
    out = ROOT / m["file"].replace(".bf.png", ".preview.png")
    bg.convert("RGB").save(out)
    return out.relative_to(ROOT).as_posix(), geo


def geometry(m):
    """Карта боя с рамкой в каждом размере CARDS: T — рамка над окном, B — под окном, кадр портрета, ширина рамки, px."""
    W, H = m["px"]
    wt, wr, wb, wl = m["win"]
    out = []
    for fw, fh, label in CARDS:
        Wf = fw * 1000 / (1000 - wl - wr)
        T, B = Wf * H / W * wt / 1000, Wf * H / W * wb / 1000
        out.append({"card": label, "T": round(T, 1), "B": round(B, 1), "face": [fw, round(fh + FREE - T - max(BAR, B), 1)], "frame_w": round(Wf, 1)})
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+")
    ap.add_argument("--no-halo", action="store_true", help="ореол в окне не чистить: в окно заходит тёмное украшение, а не свечение")
    ap.add_argument("--preview", action="store_true", help="превью на портрете рядом: <имя>.preview.png")
    ap.add_argument("--portrait", default="design/ui/assets/art/foes/b1.jpg", help="портрет для превью")
    a = ap.parse_args()
    res = []
    for f in a.files:
        p = pathlib.Path(f)
        p = p if p.is_absolute() else ROOT / p
        m = measure(p, not a.no_halo)
        m["halo_cleaned"] = not a.no_halo
        m["cards"] = geometry(m)
        if a.preview:
            m["preview"] = preview(m, ROOT / a.portrait)[0]
        res.append(m)
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
