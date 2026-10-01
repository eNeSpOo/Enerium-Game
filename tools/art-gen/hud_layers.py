"""Украшения HUD боя (jobs/battle-hud.json): подготовка к выгрузке (задача «Бой AAA»).

- panel — рама окон боя для border-image: середина верхней планки тянется, поэтому застёжку посередине стираем — на её место
  встаёт кусок той же планки слева (CLASP — доля ширины, где она стоит; SRC — откуда берём ровную планку). Нарезка — угол с завитками,
  CORNER px исходника; печатает её в тысячных.
- остальное (медальон раунда, плашка, гербы) выгрузка берёт как есть: export_ui.py режет поля по альфе.

  python tools/art-gen/hud_layers.py
Выход — art/generated/battle-hud/bh-panel__nb2.clean.png.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC_DIR = ROOT / "art" / "generated" / "battle-hud"
CLASP = (0.44, 0.56)   # где по ширине стоит застёжка верхней планки, доли ширины рамки
SRC = 0.20             # откуда берём ровный кусок планки, доля ширины рамки
CORNER = 150           # угол с завитками, px исходника: нарезка border-image
A_CUT = 8


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    im = np.asarray(Image.open(SRC_DIR / "bh-panel__nb2.png").convert("RGBA")).copy()
    ys, xs = np.nonzero(im[..., 3] > A_CUT)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    a = im[y0:y1, x0:x1].copy()
    h, w = a.shape[:2]
    c0, c1 = int(w * CLASP[0]), int(w * CLASP[1])
    s0 = int(w * SRC)
    band = CORNER   # застёжка — в верхней полосе высотой с угол
    a[:band, c0:c1] = a[:band, s0:s0 + (c1 - c0)]
    out = SRC_DIR / "bh-panel__nb2.clean.png"
    Image.fromarray(a, "RGBA").save(out, optimize=True)
    pm = lambda v, d: int(round(v * 1000 / d))
    print(json.dumps({"panel": {"file": out.relative_to(ROOT / "art" / "generated").as_posix(), "px": [w, h],
                                "cut": [pm(CORNER, h), pm(CORNER, w), pm(CORNER, h), pm(CORNER, w)]}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
