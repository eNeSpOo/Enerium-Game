"""Арт раздела «Странник» — покои в Башне вневремени: рама зеркала Памяти для border-image, чистка крошек вокруг вещей, вырезка
полос. Задание — jobs/wanderer-chambers.json, вёрстка — design/ui/screens/chambers.js (CB_ART). Числа — целые.

  mirror <png>                 рама зеркала → .slice.png: девять частей для border-image — четыре угла C × C как есть, стороны —
                               образцы E px сразу за углом (низ — отражённый верх: у подножия модель рисует кристаллы), сведённые
                               в бесшовную петлю (перекрытие BLEND px), середина прозрачная;
                               стекло рамы вырезано по толщине рамы с каждой стороны (T — [сверху, справа, снизу, слева]).
                               И → .glass.jpg: само стекло без рамы (фон зеркала, cover). Печатает slice = C, frame = T, px
  clean  <png…> [--min ‰]      оставить только крупные пятна альфы (вещь со своим свечением): мелкие крошки песка вокруг — прочь;
                               пятно меньше min ‰ крупнейшего — крошка → .clean.png
  strip  <img> y0 y1            полоса во всю ширину из исходника без вырезки (карниз): строки y0…y1, концы сведены в бесшовную
                               петлю (перекрытие STRIP_BLEND px) → .strip.jpg — фон повторяется по горизонтали без шва
  crop   <png> x0 y0 x1 y1 [--solid]
                               вырезать прямоугольник (px исходника) → .crop.png; --solid — альфа внутри 255 (табличка, полоса)

  python tools/art-gen/chambers_layers.py mirror art/generated/cb-frame/cb-mirror__nb2.png
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
A_CUT = 8          # альфа, с которой пиксель — рисунок (как у export_ui.py)
SOLID = 200        # альфа тела рамы
CORNER = 312       # угол рамы: застёжка и листья на обоих плечах, px исходника
EDGE = 150         # образец стороны, px исходника: столько чистого места есть у нижней стороны между кристаллами и углом
BLEND = 24         # перекрытие петли стороны, px
GLASS_IN = 12      # стекло режется с отступом от рамы, px
STRIP_BLEND = 64   # перекрытие петли полосы, px


def load(p):
    p = pathlib.Path(p)
    return p if p.is_absolute() else ROOT / p


def rel(p):
    return p.relative_to(ROOT).as_posix()


def stem(src):
    return src.name.split(".")[0]


def rgba(p):
    return np.asarray(Image.open(p).convert("RGBA")).astype(np.float32)


def frame_box(a):
    """Внешний край рамы вместе с застёжками углов: сторона рамы — строки и столбцы, где рисунок — сплошная полоса; застёжки выступают
    за неё — край ищется по плотной альфе у самих углов (кристаллы и крошки у середины сторон не в счёт)."""
    al = a[..., 3] > SOLID
    H, W = al.shape
    rows = np.nonzero(al.sum(1) > W * 0.6)[0]
    cols = np.nonzero(al.sum(0) > H * 0.6)[0]
    x0, y0, x1, y1 = int(cols.min()), int(rows.min()), int(cols.max()) + 1, int(rows.max()) + 1
    k = CORNER // 2   # полоса у углов, где стоят застёжки
    near = np.zeros_like(al)
    for ys in (slice(y0, y0 + k), slice(y1 - k, y1)):
        for xs in (slice(x0, x0 + k), slice(x1 - k, x1)):
            near[ys, xs] = True
    grow = ndimage.binary_dilation(near, iterations=24) & al
    ys, xs = np.nonzero(grow)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


SKIP, RUN = 120, 8   # толщина рамы: пропустить SKIP px от края (молдинг, золотая нить), дальше первые RUN px стекла подряд — стекло


def glassy(px):
    """Стекло зеркала — холодный тёмный серо-синий: синего заметно больше зелёного (у бирюзового бархата рамы они почти равны),
    зелёный не намного больше красного, и темнее серебра рамы."""
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    return (b - g >= 5) & (g - r <= 12) & (px.max(-1) <= 60)


def thickness(a):
    """Толщина рамы до стекла на каждой стороне — вместе с бирюзовым бархатом у стекла: медиана по полосе линий у середины стороны —
    от края внутрь, после SKIP px первые RUN px стекла подряд. Низ — правее середины: там нет кристаллов у подножия рамы."""
    H, W = a.shape[:2]
    rgb = a[..., :3]

    def first(lines):
        at = []
        for line in lines:
            ok = glassy(line)
            k = SKIP
            while k < len(line) - RUN and not ok[k:k + RUN].all():
                k += 1
            at.append(k)
        return int(np.median(at))
    band = range(-40, 41, 8)
    top = first([rgb[:, W // 2 + d] for d in band])
    bot = first([rgb[::-1, W // 2 + W // 3 + d] for d in band])
    lef = first([rgb[H // 2 + d, :] for d in band])
    rig = first([rgb[H // 2 + d, ::-1] for d in band])
    return [top, rig, bot, lef]


def loop(s, axis, blend=BLEND):
    """Образец → бесшовная петля по оси axis: последние blend px плавно переходят в первые, длина — на blend меньше образца."""
    n = s.shape[axis] - blend
    head = np.take(s, range(0, blend), axis=axis)
    tail = np.take(s, range(n, n + blend), axis=axis)
    w = (np.arange(blend, dtype=np.float32) + .5) / blend
    w = w[None, :, None] if axis == 1 else w[:, None, None]
    body = np.take(s, range(0, n), axis=axis).copy()
    mix = tail * (1 - w) + head * w
    if axis == 1:
        body[:, :blend] = mix
    else:
        body[:blend] = mix
    return body


def mirror(p):
    src = load(p)
    a = rgba(src)
    L, T0, R, B = frame_box(a)
    f = a[T0:B, L:R].copy()
    H, W = f.shape[:2]
    m = thickness(f)
    # рама симметрична: у низа и правого бока стекло подсвечено кристаллами снизу и по цвету с бархатом путается — мерка верха и
    # левого бока, самых чистых сторон, идёт на все четыре
    t = [m[0], m[3], m[0], m[3]]
    C, E = CORNER, EDGE
    # стекло — прочь из рамы: середина прозрачна, край — мягкий в 2 px
    yy, xx = np.mgrid[0:H, 0:W]
    inside = (yy >= t[0]) & (yy < H - t[2]) & (xx >= t[3]) & (xx < W - t[1])
    ring = f.copy()
    ring[..., 3] = np.where(inside, 0, ring[..., 3])
    ring[..., 3] = ndimage.uniform_filter(ring[..., 3], 3)
    ring[..., :3] = np.where(ring[..., 3:] > 0, ring[..., :3], 0)
    # образцы сторон — сразу за углом: свет там тот же, что у края угла, и стык угла с первой плиткой не виден. Низ — верх, отражённый
    # по вертикали: у подножия зеркала модель рисует кристаллы, а строение стороны то же — бусины снаружи, золотая нить и бархат внутри;
    # блик сверху становится светом снизу
    top = ring[0:C, C:C + E + BLEND]
    bot = top[::-1].copy()
    lef = ring[C:C + E + BLEND, 0:C]
    rig = ring[C:C + E + BLEND, W - C:W]
    top, bot, lef, rig = loop(top, 1), loop(bot, 1), loop(lef, 0), loop(rig, 0)
    S = 2 * C + E
    out = np.zeros((S, S, 4), np.float32)
    out[0:C, 0:C] = ring[0:C, 0:C]
    out[0:C, C + E:] = ring[0:C, W - C:W]
    out[C + E:, 0:C] = ring[H - C:H, 0:C]
    out[C + E:, C + E:] = ring[H - C:H, W - C:W]
    out[0:C, C:C + E] = top
    out[C + E:, C:C + E] = bot
    out[C:C + E, 0:C] = lef
    out[C:C + E, C + E:] = rig
    sl = src.with_name(stem(src) + ".slice.png")
    Image.fromarray(out.round().clip(0, 255).astype(np.uint8), "RGBA").save(sl, optimize=True)
    # стекло: без рамы, с отступом; прозрачного в нём нет
    g = f[t[0] + GLASS_IN:H - t[2] - GLASS_IN, t[3] + GLASS_IN:W - t[1] - GLASS_IN, :3]
    gl = src.with_name(stem(src) + ".glass.jpg")
    Image.fromarray(g.round().clip(0, 255).astype(np.uint8), "RGB").save(gl, quality=90)
    return {"slice": rel(sl), "glass": rel(gl), "px": [S, S], "corner": C, "edge": E, "frame": t, "measured": m, "box": [L, T0, R, B],
            "glass_px": [int(g.shape[1]), int(g.shape[0])]}


def clean(p, min_pm=40):
    src = load(p)
    a = rgba(src)
    m = a[..., 3] > A_CUT
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=2))
    if not n:
        return {"file": None}
    sizes = ndimage.sum(m, lab, index=np.arange(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = sizes >= sizes.max() * min_pm / 1000
    a[..., 3] = np.where(keep[lab], a[..., 3], 0)
    out = src.with_name(stem(src) + ".clean.png")
    Image.fromarray(a.round().astype(np.uint8), "RGBA").save(out, optimize=True)
    return {"file": rel(out), "kept": int(keep.sum()), "dropped": int(n - keep.sum())}


def strip(p, y0, y1):
    src = load(p)
    a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)[y0:y1]
    st = loop(a, 1, STRIP_BLEND)
    out = src.with_name(stem(src) + ".strip.jpg")
    Image.fromarray(st.round().clip(0, 255).astype(np.uint8), "RGB").save(out, quality=90)
    return {"file": rel(out), "px": [int(st.shape[1]), int(st.shape[0])]}


def crop(p, box, solid=False):
    src = load(p)
    a = rgba(src)[box[1]:box[3], box[0]:box[2]].copy()
    if solid:
        a[..., 3] = np.where(a[..., 3] > A_CUT, 255, 0)
    out = src.with_name(stem(src) + ".crop.png")
    Image.fromarray(a.round().astype(np.uint8), "RGBA").save(out, optimize=True)
    return {"file": rel(out), "px": [int(a.shape[1]), int(a.shape[0])]}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    kind, args = sys.argv[1], sys.argv[2:]
    if kind == "mirror":
        res = mirror(args[0])
    elif kind == "clean":
        mn = 40
        if "--min" in args:
            i = args.index("--min")
            mn = int(args[i + 1])
            args = args[:i] + args[i + 2:]
        res = [clean(x, mn) for x in args]
    elif kind == "strip":
        res = strip(args[0], int(args[1]), int(args[2]))
    elif kind == "crop":
        solid = "--solid" in args
        args = [x for x in args if x != "--solid"]
        res = crop(args[0], [int(v) for v in args[1:5]], solid)
    else:
        sys.exit(__doc__)
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
