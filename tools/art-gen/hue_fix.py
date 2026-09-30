"""Приглушить чужой оттенок в клетках листа — без новой генерации.

Модель рисует свет снизу насыщенным конусом цвета палитры. Когда палитра светлая — «белый с прозеленью» цикла I, белый ветер Воздуха, —
конус уходит в насыщенную мяту и бирюзу, и набор перестаёт отличаться от зелёного цикла V и Времени. Скрипт снимает насыщенность
только в полосе оттенков (по умолчанию 125–190°: мята и бирюза; мох и трава 80–120° не трогаются), с мягкими краями полосы, и кладёт
рядом с клеткой <имя>.fix.webp — выгрузка (ui_icons.py) берёт его вместо клетки. Исходные клетки и листы не меняются.
Клетка правится, если доля насыщенных пикселей полосы в ней больше --min (%): клетки без конуса остаются как есть.

  python tools/art-gen/hue_fix.py art/generated/res-icons/res-I-2/cells.json --dry-run
  python tools/art-gen/hue_fix.py art/generated/res-icons/res-I-*/cells.json --hue 125-190 --sat 25 --min 4
"""
import argparse
import glob
import json
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
EDGE = 20   # ширина мягкого края полосы оттенков, градусы


def share(im, lo, hi):
    """Доля насыщенных пикселей полосы оттенков в клетке, %."""
    a = np.asarray(im.convert("RGB").resize((96, 96)).convert("HSV")).astype(np.float32)
    h, s, v = a[..., 0] * 360 / 255, a[..., 1] / 255, a[..., 2] / 255
    return float(((h >= lo) & (h <= hi) & (s > .3) & (v > .3)).mean() * 100)


def fix(im, lo, hi, sat, val):
    """Насыщенность полосы × sat %, яркость × val %; края полосы — плавно."""
    a = np.asarray(im.convert("RGB").convert("HSV")).astype(np.float32)
    h = a[..., 0] * 360 / 255
    w = np.clip(np.minimum(h - (lo - EDGE), (hi + EDGE) - h) / EDGE, 0, 1)   # 1 внутри полосы, 0 за краем
    a[..., 1] *= 1 - w * (1 - sat / 100)
    a[..., 2] *= 1 - w * (1 - val / 100)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "HSV").convert("RGB")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cells", nargs="+", help="cells.json нарезки grid_slice.py, можно маской")
    ap.add_argument("--hue", default="125-190", help="полоса оттенков, градусы")
    ap.add_argument("--sat", type=int, default=25, help="насыщенность полосы после правки, %% от прежней")
    ap.add_argument("--val", type=int, default=92, help="яркость полосы после правки, %% от прежней")
    ap.add_argument("--min", type=float, default=4, help="править клетку, если полосы в ней больше стольких %%")
    ap.add_argument("--only", help="имена клеток через запятую — только их")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    lo, hi = (int(x) for x in a.hue.split("-"))
    only = set(a.only.split(",")) if a.only else None
    files = [pathlib.Path(p) for pat in a.cells for p in (glob.glob(pat) or [pat])]
    done = kept = 0
    for cf in files:
        cf = cf if cf.is_absolute() else ROOT / cf
        for c in json.loads(cf.read_text(encoding="utf-8"))["cells"]:
            f = ROOT / c["file"]
            if only and f.stem not in only:
                continue
            if not f.exists():
                continue
            with Image.open(f) as im:
                s = share(im, lo, hi)
                if s <= a.min and not only:
                    kept += 1
                    continue
                out = fix(im, lo, hi, a.sat, a.val)
            if not a.dry_run:
                out.save(f.with_name(f.stem + ".fix.webp"), "WEBP", quality=92, method=6)
            done += 1
            print(f"{f.relative_to(ROOT).as_posix()}: полосы {s:.0f} %{' — правка' if not a.dry_run else ''}")
    print(f"Поправлено {done}, без правки {kept}{' (без записи: --dry-run)' if a.dry_run else ''}")


if __name__ == "__main__":
    main()
