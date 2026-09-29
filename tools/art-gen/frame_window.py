"""Окно рамы портрета — чистое: тёмный ореол украшения не ложится на портрет.

Рама рисуется на чёрном и вырезается ключом black (jobs/souls-altar.json, souls-frame). Модель кладёт вокруг гребня и нижнего
украшения тёмный ореол свечения; ключ black оставляет его непрозрачным, потому что он светлее порога фона. Внутри окна этот ореол
ложится на портрет тёмным пятном — как раз на голову героя.

Рама симметрична, верх окна — пологая арка, низ — прямой. Настоящий край окна у гребня берётся с арки рядом с ореолом: самый высокий
верх окна в средней половине ширины (там, где ореола ещё нет), низ — самый низкий. В столбцах, где прозрачная середина начинается
ниже этого края, всё тёмное между краем и серединой становится прозрачным; золото и кристаллы светлее DARK и остаются, светлые
пятнышки ореола, окружённые очищенным, — тоже прочь. Линия рамы и ореол над ней, снаружи окна, не трогаются. Край — мягкий в FEATHER px.

  python tools/art-gen/frame_window.py art/generated/souls-frame/souls-frame__nb2.png
Результат ложится рядом: <имя>.clean.png; вывод — рамка по альфе и окно в долях рамки, %: сверху, справа, снизу, слева.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
A_CUT = 8         # порог выгрузки: рамка PNG — по альфе > 8
DARK = 96         # темнее этого по самому яркому каналу — ореол, а не золото и не кристалл
GAP = 3           # край окна: чистка начинается на столько px глубже края арки — линия рамы цела
DEEP = 10         # столбец с ореолом: середина начинается глубже края арки больше чем на столько px
FEATHER = 2       # мягкий край очищенного окна, px
SPECK = 80        # светлое пятнышко ореола не больше стольких px, окружённое очищенным, — тоже прочь


def window(al):
    """Прозрачная середина рамы: самая большая прозрачная область, не связанная с краем кадра."""
    tr = al <= A_CUT
    lab, n = ndimage.label(tr)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]).tolist()))
    sizes = ndimage.sum(tr, lab, index=np.arange(1, n + 1))
    inner = [(sizes[i - 1], i) for i in range(1, n + 1) if i not in edge]
    if not inner:
        sys.exit("окна нет: прозрачной середины, не связанной с краем, не нашлось")
    return lab == max(inner)[1]


def bbox(al):
    ys, xs = np.nonzero(al > A_CUT)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def clean(path):
    a = np.asarray(Image.open(path).convert("RGBA")).copy()
    al, v = a[..., 3].astype(np.int32), a[..., :3].max(-1).astype(np.int32)
    tr, win = al <= A_CUT, window(al)
    bx0, by0, bx1, by1 = bbox(al)
    W = bx1 - bx0
    cols = range(bx0 + W // 4, bx0 + 3 * W // 4)                      # средняя половина ширины
    tops = {x: np.nonzero(win[:, x])[0] for x in cols}
    tops = {x: (c.min(), c.max()) for x, c in tops.items() if len(c)}
    top_ref = min(t for t, _ in tops.values())                        # верх арки рядом с ореолом
    bot_ref = max(b for _, b in tops.values())                        # прямой низ окна
    cut = np.zeros_like(win)
    for x, (t, b) in tops.items():
        if t > top_ref + DEEP:
            seg = slice(top_ref + GAP, t)
            cut[seg, x] = (v[seg, x] < DARK) & ~tr[seg, x]
        if b < bot_ref - DEEP:
            seg = slice(b + 1, bot_ref - GAP + 1)
            cut[seg, x] = (v[seg, x] < DARK) & ~tr[seg, x]
    # светлые пятнышки ореола, окружённые очищенным и прозрачным, — прочь
    zone = np.zeros_like(win)
    zone[top_ref + GAP:bot_ref - GAP + 1, bx0 + W // 4:bx0 + 3 * W // 4] = True
    lab_r, nr = ndimage.label(~tr & ~cut & zone)
    free = cut | tr
    for i in range(1, nr + 1):
        comp = lab_r == i
        if comp.sum() <= SPECK and free[ndimage.binary_dilation(comp) & ~comp].all():
            cut |= comp
    # мягкий край: альфа растёт от очищенного к нетронутому на FEATHER px
    d = ndimage.distance_transform_edt(~cut)
    keep = np.clip(d / (FEATHER + 1), 0, 1)
    a[..., 3] = np.where(cut, 0, np.round(al * np.where(d <= FEATHER, keep, 1))).astype(np.uint8)
    a[a[..., 3] == 0, :3] = 0
    out = path.with_name(path.stem + ".clean.png")
    Image.fromarray(a, "RGBA").save(out, optimize=True)
    al2 = a[..., 3].astype(np.int32)
    fx0, fy0, fx1, fy1 = bbox(al2)
    w2 = window(al2)
    wy, wx = np.nonzero(w2)
    FW, FH = fx1 - fx0, fy1 - fy0
    return {
        "file": out.relative_to(ROOT).as_posix(),
        "cleaned_px": int(cut.sum()),
        "arch": [int(top_ref), int(bot_ref)],
        "frame": [fx0, fy0, FW, FH],
        "ratio_w_h": round(FW / FH, 4),
        "window_pct": [round((wy.min() - fy0) * 100 / FH, 1), round((fx1 - wx.max() - 1) * 100 / FW, 1),
                       round((fy1 - wy.max() - 1) * 100 / FH, 1), round((wx.min() - fx0) * 100 / FW, 1)],
    }


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    p = pathlib.Path(sys.argv[1])
    p = p if p.is_absolute() else ROOT / p
    print(json.dumps(clean(p), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
