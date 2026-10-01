"""Квадратная рамка карты боя: тело рамки для border-image и венец ранга отдельной картинкой (задача «Бой AAA», jobs/battle-frames-square.json).

Карта-квадрат стоит в колонке из трёх с зазором в несколько пикселей (ADR-0038, п. 8): рога и венцы рисованных рамок выше и шире места над
картой, а гребни сидят прямо на верхней планке. Поэтому рамка делится на две части:
1. Тело — боковые планки и нижняя плита рисунка, верхняя планка — из той же боковой: её полоса повёрнута и растянута на ширину тела, так
   нарезка border-image тянет только ровные планки. Нарезка — толщины в тысячных тела: [верх, право, низ, лево]. Прототип кладёт тело
   на портрет: планки — 3 px, плита — полоса здоровья с числом (design/ui/screens/battle-scene.css).
2. Венец — всё, что выше окна, на всю ширину рисунка: верхняя планка с гребнем, рога, шипы. Прототип вписывает его целиком в полосу над
   картой (BS_FRAME.crest, высота × --sk), по центру: пропорции рисунка не меняются.
Окно ищет battle_frame.py (clean): самая большая прозрачная область, не связанная с краем; ореол в окне — прочь.

  python tools/art-gen/frame_square.py art/generated/battle-frames-square/bfs-*__nb2.png
Выход — рядом: <имя>.body.png и <имя>.crest.png; печатает JSON на рамку: размеры, нарезка тела, пропорция венца.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import battle_frame as BFM   # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
GEN = ROOT / "art" / "generated"
OPAQUE = 110      # непрозрачнее этого — тело рамки
A_CUT = 8         # порог выгрузки (export_ui.py)


def run_len(op, y, x, dx, limit):
    """Сколько непрозрачных пикселей подряд от (x, y) по строке в сторону dx."""
    n = 0
    w = op.shape[1]
    while 0 <= x < w and op[y, x] and n < limit:
        x += dx
        n += 1
    return n


def split(path):
    src = np.asarray(Image.open(path).convert("RGBA"))
    a, (t, r, b, l), _ = BFM.clean(src, True)
    op = a[..., 3] > OPAQUE
    h, w = op.shape
    rows = list(range(t + (b - t) // 3, b - (b - t) // 3))
    lw = int(np.median([run_len(op, y, l - 1, -1, w) for y in rows]))
    rw = int(np.median([run_len(op, y, r + 1, 1, w) for y in rows]))
    tb = max(2, (lw + rw) // 2)
    mid = [int(l + (r - l) * k / 20) for k in range(4, 17)]
    yb = int(np.median([np.nonzero(op[b + 1:, x])[0].max() + b + 1 if op[b + 1:, x].any() else b for x in mid]))
    x0, x1, y0, y1 = l - lw, r + rw + 1, t - tb, yb + 1
    body = a[max(0, y0):y1, x0:x1].copy()
    if y0 < 0:
        body = np.vstack([np.zeros((-y0, body.shape[1], 4), np.uint8), body])
    BH, BW = body.shape[:2]
    # верхняя планка — полоса левой боковой планки, повёрнутая и растянутая на ширину тела: нарезка тянет ровный материал
    strip = a[rows[0]:rows[-1] + 1, l - lw:l]
    bar = Image.fromarray(np.ascontiguousarray(np.rot90(strip, -1)), "RGBA").resize((BW, tb), Image.LANCZOS)
    body[:tb] = np.asarray(bar)
    bpath = path.with_name(path.name.replace(".png", ".body.png"))
    Image.fromarray(body, "RGBA").save(bpath, optimize=True)
    pm = lambda v, d: int(round(v * 1000 / d))
    out = {"body": {"file": bpath.relative_to(GEN).as_posix(), "px": [BW, BH], "cut": [pm(tb, BH), pm(rw, BW), pm(yb - b, BH), pm(lw, BW)],
                    "window": [r - l + 1, b - t + 1]}}
    crest = a[:t].copy()
    ys, xs = np.nonzero(crest[..., 3] > A_CUT)
    if len(xs):
        cx0, cx1, cy0 = xs.min(), xs.max() + 1, ys.min()
        cr = crest[cy0:t, cx0:cx1]
        cpath = path.with_name(path.name.replace(".png", ".crest.png"))
        Image.fromarray(cr, "RGBA").save(cpath, optimize=True)
        CH, CW = cr.shape[:2]
        out["crest"] = {"file": cpath.relative_to(GEN).as_posix(), "px": [CW, CH], "ar": pm(CW, CH),
                        "shift": pm((cx0 + cx1) / 2 - (l + r + 1) / 2, CW), "rel": pm(CW, r - l + 1 + lw + rw), "bar": pm(tb, CH)}
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    res = {}
    for p in sys.argv[1:]:
        path = pathlib.Path(p).resolve()
        res[path.name.split("__")[0].replace("bfs-", "")] = split(path)
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
