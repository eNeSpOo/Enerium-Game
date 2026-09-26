"""Вырезание ровного фона и проверка настоящей альфы.

Модели картинок не умеют прозрачность: вместо альфы они рисуют «шахматку»
(так вышло с art/ui/status-bleeding-v3.png). Поэтому картинку генерируем
на ровном хромакее, фон вырезаем здесь и проверяем результат числами.

  python tools/art-gen/cutout.py in.raw.png out.png --key magenta
  python tools/art-gen/cutout.py --check out.png [--raw in.raw.png]
"""
import argparse
import json
import sys

import numpy as np
from PIL import Image

# hot — каналы, которые у ключа полные, cold — пустые
KEYS = {
    "magenta": {"rgb": (255, 0, 255), "hot": [0, 2], "cold": [1], "hex": "#FF00FF"},
    "green": {"rgb": (0, 255, 0), "hot": [1], "cold": [0, 2], "hex": "#00FF00"},
    "blue": {"rgb": (0, 0, 255), "hot": [2], "cold": [0, 1], "hex": "#0000FF"},
}
# Доля ключевого цвета в пикселе: до LO — объект, от HI — фон, между — край.
LO, HI = 0.10, 0.70
# Пороги проверки
CORNER_ALPHA_MAX = 0          # углы картинки — полностью прозрачные
KEY_LEFT_MAX = 0.01           # остаток ключа в непрозрачной части
RAW_BORDER_KEY_MIN = 0.90     # рамка исходника — ровный ключ, а не нарисованная шахматка


def key_amount(rgb, key):
    """Сколько ключевого цвета в пикселе: 1 — чистый ключ, 0 и меньше — нет."""
    k = KEYS[key]
    hot = rgb[..., k["hot"]].min(-1)
    cold = rgb[..., k["cold"]].max(-1)
    return (hot - cold) / 255.0


def remove_key(img, key="magenta"):
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    m = key_amount(rgb, key)
    alpha = 1.0 - np.clip((m - LO) / (HI - LO), 0.0, 1.0)
    alpha[alpha < 0.03] = 0.0
    alpha[alpha > 0.97] = 1.0
    # Край — смесь объекта и ключа: C = a*F + (1-a)*K, отсюда F = (C - (1-a)*K) / a
    k = np.array(KEYS[key]["rgb"], np.float32)
    a3 = np.maximum(alpha, 1e-3)[..., None]
    fg = (rgb - (1.0 - alpha)[..., None] * k) / a3
    # Остаток ключа на краях снимаем: горячие каналы не выше холодных
    edge = (alpha > 0) & (alpha < 1)
    hot, cold = KEYS[key]["hot"], KEYS[key]["cold"]
    spill = np.clip(fg[..., hot].min(-1) - fg[..., cold].max(-1), 0, None)
    for c in hot:
        fg[..., c] = np.where(edge, fg[..., c] - spill, fg[..., c])
    fg = np.clip(fg, 0, 255)
    fg[alpha == 0] = 0
    out = np.dstack([fg, alpha * 255.0]).round().astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def check(path, raw_path=None, key="magenta"):
    """Настоящая ли прозрачность. Возвращает словарь с числами и итогом ok."""
    im = Image.open(path)
    r = {"mode": im.mode}
    if im.mode != "RGBA":
        r.update(ok=False, why="нет альфа-канала")
        return r
    arr = np.asarray(im)
    a = arr[..., 3]
    h, w = a.shape
    c = max(4, min(h, w) // 64)
    corners = [a[:c, :c], a[:c, -c:], a[-c:, :c], a[-c:, -c:]]
    r["corners_max_alpha"] = int(max(int(x.max()) for x in corners))
    r["transparent_share"] = round(float((a == 0).mean()), 3)
    r["opaque_share"] = round(float((a == 255).mean()), 3)
    solid = a > 128
    m = key_amount(arr[..., :3].astype(np.float32), key)
    r["key_left_share"] = round(float(((m > 0.35) & solid).sum() / max(1, int(solid.sum()))), 4)
    why = []
    if r["corners_max_alpha"] > CORNER_ALPHA_MAX:
        why.append("углы не прозрачные")
    if not 0.05 <= r["transparent_share"] <= 0.95:
        why.append("доля прозрачного вне 5–95 %")
    if r["key_left_share"] > KEY_LEFT_MAX:
        why.append("на объекте остался цвет ключа")
    if raw_path:
        raw = np.asarray(Image.open(raw_path).convert("RGB")).astype(np.float32)
        rh, rw = raw.shape[:2]
        b = max(4, min(rh, rw) // 32)
        ring = np.concatenate([raw[:b].reshape(-1, 3), raw[-b:].reshape(-1, 3),
                               raw[:, :b].reshape(-1, 3), raw[:, -b:].reshape(-1, 3)])
        r["raw_border_key_share"] = round(float((key_amount(ring, key) >= HI).mean()), 3)
        if r["raw_border_key_share"] < RAW_BORDER_KEY_MIN:
            why.append("фон исходника не ровный ключ — возможно, нарисована шахматка")
    r["ok"] = not why
    if why:
        r["why"] = "; ".join(why)
    return r


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("src")
    p.add_argument("dst", nargs="?")
    p.add_argument("--key", default="magenta", choices=sorted(KEYS))
    p.add_argument("--check", action="store_true", help="только проверить src")
    p.add_argument("--raw", help="исходник на ключе для проверки ровности фона")
    a = p.parse_args()
    if a.check:
        res = check(a.src, a.raw, a.key)
    else:
        if not a.dst:
            sys.exit("нужен путь результата")
        remove_key(Image.open(a.src), a.key).save(a.dst, optimize=True)
        res = check(a.dst, a.src, a.key)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["ok"] else 1)


if __name__ == "__main__":
    main()
