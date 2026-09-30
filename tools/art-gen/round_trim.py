"""Круглый медальон — ровный круг по внешней кромке металла.

Медальоны рисуются на чёрном и вырезаются ключом black (jobs/talk.json: гербы ролей проводников, медальон номера ответа).
Модель кладёт вокруг обода свечение разной силы и с разных сторон: у одного герба аура кругом, у медальона — отсвет только
снизу. Ключ black оставляет такое свечение непрозрачным, потому что оно светлее порога фона. Тогда рамка картинки по альфе
шире обода и сдвинута: после выгрузки гербы выходят разного размера, а цифра по центру картинки встаёт ниже центра медальона.

Как находится круг:
1. Опора — обод из серого кованого железа: непрозрачные пиксели с малой разницей каналов и средней яркостью, самая большая
   связная область. Её рамка — первый центр и радиус.
2. От центра — RAYS лучей. На каждом луче от железа обода (REACH) наружу идём, пока пиксель — металл: непрозрачный и не свечение.
   Свечение — бирюзовое (синий или зелёный заметно выше красного) или алое и оранжевое (красный намного выше синего, зелёный
   ниже его половины и ещё немного). Золото кромки — тёплое, но не такое красное, оно металл. Последняя точка металла — кромка.
3. Круг по точкам кромки — наименьшими квадратами; точки дальше MISS от медианы радиуса — выбросы (заклёпки, завитки,
   жёлтые искры), круг считается заново.
Всё дальше радиуса и EDGE px — прозрачно, край мягкий в FEATHER px. Свет своего тона интерфейс кладёт сам — одинаково у всех.

  python tools/art-gen/round_trim.py art/generated/talk-ui/talk-medallion__nb2.png [ещё файлы…]
Результат ложится рядом: <имя>.round.png; вывод — центр и радиус круга, px исходника, и сколько пикселей стало прозрачным.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
GREY = 30          # серое железо: разница каналов не больше
LUM = (40, 215)    # и яркость по среднему каналу — в этих пределах
CLOSE = 5          # кольцо обода с заклёпками связывается закрытием на столько px
RAYS = 360         # лучей для кромки
REACH = (0.95, 1.3) # луч идёт от стольких радиусов опоры до стольких: начало — в железе обода
TEAL = (25, 40)    # бирюзовое свечение: синий выше красного больше чем на столько или зелёный — больше чем на столько
EMBER = 110        # алое и оранжевое: красный выше синего больше чем на столько и зелёный ниже 0.62 красного
MISS = 0.03        # выброс: точка кромки дальше медианы радиуса больше чем на эту долю
EDGE = 2           # запас за кромкой, px исходника
FEATHER = 3        # мягкий край, px исходника


def anchor(a):
    """Первый центр и радиус — по рамке самой большой связной области серого железа."""
    rgb = a[..., :3].astype(np.int32)
    lum = rgb.mean(-1)
    grey = (a[..., 3] == 255) & (rgb.max(-1) - rgb.min(-1) <= GREY) & (lum >= LUM[0]) & (lum <= LUM[1])
    grey = ndimage.binary_closing(grey, iterations=CLOSE)
    lab, n = ndimage.label(grey)
    if not n:
        sys.exit("обода нет: серого железа не нашлось")
    sizes = ndimage.sum(grey, lab, index=np.arange(1, n + 1))
    ys, xs = np.nonzero(lab == int(np.argmax(sizes)) + 1)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    return (x0 + x1) / 2, (y0 + y1) / 2, max(x1 - x0, y1 - y0) / 2


def metal(a):
    """Металл: непрозрачный пиксель, который не свечение."""
    r, g, b = (a[..., i].astype(np.int32) for i in range(3))
    teal = (b - r > TEAL[0]) | (g - r > TEAL[1])
    ember = (r - b > EMBER) & (g * 100 < r * 62)
    return (a[..., 3] == 255) & ~teal & ~ember


def fit(xs, ys):
    """Круг наименьшими квадратами (Kåsa): x² + y² + Dx + Ey + F = 0."""
    A = np.c_[xs, ys, np.ones_like(xs)]
    D, E, F = np.linalg.lstsq(A, -(xs ** 2 + ys ** 2), rcond=None)[0]
    cx, cy = -D / 2, -E / 2
    return cx, cy, np.sqrt(cx * cx + cy * cy - F)


def ring(a):
    cx, cy, r0 = anchor(a)
    m = metal(a)
    h, w = m.shape
    px, py = [], []
    for t in np.linspace(0, 2 * np.pi, RAYS, endpoint=False):
        last = None
        for rr in np.arange(r0 * REACH[0], r0 * REACH[1]):
            x, y = int(round(cx + rr * np.cos(t))), int(round(cy + rr * np.sin(t)))
            if not (0 <= x < w and 0 <= y < h) or not m[y, x]:
                break
            last = (x + 0.5, y + 0.5)
        if last:
            px.append(last[0])
            py.append(last[1])
    xs, ys = np.array(px), np.array(py)
    fx, fy, fr = fit(xs, ys)
    d = np.hypot(xs - fx, ys - fy)
    ok = np.abs(d - np.median(d)) <= MISS * np.median(d)
    fx, fy, fr = fit(xs[ok], ys[ok])
    return fx, fy, fr, int(ok.sum()), len(xs)


def trim(path):
    a = np.asarray(Image.open(path).convert("RGBA")).copy()
    cx, cy, r, used, rays = ring(a)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot(xx + 0.5 - cx, yy + 0.5 - cy) - (r + EDGE)
    keep = np.clip(1 - d / FEATHER, 0, 1)
    al = a[..., 3].astype(np.float32)
    was = int((al > 0).sum())
    a[..., 3] = np.round(al * keep).astype(np.uint8)
    a[a[..., 3] == 0, :3] = 0
    out = path.with_name(path.stem + ".round.png")
    Image.fromarray(a, "RGBA").save(out, optimize=True)
    return {
        "file": out.relative_to(ROOT).as_posix(),
        "center": [round(float(cx), 1), round(float(cy), 1)],
        "radius": round(float(r), 1),
        "rays": f"{used} из {rays}",
        "cleared_px": was - int((a[..., 3] > 0).sum()),
    }


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    res = []
    for p in sys.argv[1:]:
        p = pathlib.Path(p)
        res.append(trim(p if p.is_absolute() else ROOT / p))
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
