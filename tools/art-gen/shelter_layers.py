"""Арт Убежища и оболочки интерфейса — доводка вырезанных картинок для вёрстки (design/ui/screens/shelter.js — SH_ART,
design/ui/screens/shell.js — SHL_ART). Задание — jobs/shelter.json. Числа — целые, px исходника.

  sign  <png> <кольца x0:x1,…> <верх рамки> <чистый x>   вывеска дела: ушки для цепей над рамкой стираются (всё выше верха
                                   рамки), полоса рамки под ушком заменяется чистой полосой с того же уровня (от «чистого x»),
                                   верх над рамкой срезается → .plate.png: концы — border-image, середина тянется без ушек
  tone  <png> <яркость %> <насыщенность %>   поправка тона (старое золото модель рисует ярче палитры) → .tone.png
  rot   <png>                      полоса, повёрнутая на четверть против часовой: верхняя кромка — слева, нижняя (со светом
                                   карста) — справа, к экрану → .v.png (правая кромка шахты)
  unhalo <png> <порог яркости>     тёмный ореол вокруг светящейся вещи прочь: полупрозрачный пиксель темнее порога — прозрачный,
                                   край светлой ауры остаётся → .clean.png
  despill <png> <альфа>            контур без пурпура и без ореола: модель на пурпурном ключе рисует по контуру сиреневую кромку
                                   света и зелёную дымку за ним — дымка (альфа ниже порога) прочь, сиреневое на контуре — в серое
                                   той же яркости → .edge.png
  measure <png>                    где кончается тело рамки: по альфе и яркости — первые и последние столбцы и строки тела

  python tools/art-gen/shelter_layers.py sign art/generated/sh-plate/sh-sign__nb2.trim.png 262:362,1150:1250 60 640
  python tools/art-gen/shelter_layers.py despill art/generated/sh-plate/sh-sign__nb2.trim.plate.png 160
  python tools/art-gen/shelter_layers.py tone art/generated/sh-plate/sh-sign__nb2.trim.plate.edge.png 86 80
  python tools/art-gen/shelter_layers.py tone art/generated/sh-plate/sh-cta__nb2.trim.png 84 78
  python tools/art-gen/shelter_layers.py rot art/generated/sh-strip/sh-edge__nb2.strip.png
  python tools/art-gen/shelter_layers.py unhalo art/generated/sh-parts/sh-parts__nb2-crystal.png 70
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image, ImageEnhance
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
A_CUT = 8          # альфа, с которой пиксель — рисунок (как у export_ui.py)
PATCH = 16         # полоса рамки под ушком, которую заменяет чистая: столько строк ниже верха рамки
EDGE = 4           # кромка контура, px: сиреневое в ней убирается целиком, глубже — перекрашивается в серое


def load(p):
    p = pathlib.Path(p)
    return p if p.is_absolute() else ROOT / p


def rel(p):
    return p.relative_to(ROOT).as_posix()


def out(src, suffix):
    return src.with_name(src.name[: -len(src.suffix)] + suffix)


def sign(p, rings, top, clean_x):
    src = load(p)
    a = np.asarray(Image.open(src).convert("RGBA")).copy()
    for span in rings.split(","):
        x0, x1 = (int(v) for v in span.split(":"))
        a[:top, x0:x1, 3] = 0                                         # ушко над рамкой — прочь
        w = x1 - x0
        a[top:top + PATCH, x0:x1] = a[top:top + PATCH, clean_x:clean_x + w]   # рамка под ушком — чистая полоса того же уровня
    a = a[top - 2:]                                                   # верх над рамкой — прочь (две строки на мягкий край)
    dst = out(src, ".plate.png")
    Image.fromarray(a).save(dst, optimize=True)
    return {"file": rel(dst), "px": [a.shape[1], a.shape[0]]}


def tone(p, bright, sat):
    src = load(p)
    im = Image.open(src).convert("RGBA")
    al = im.getchannel("A")
    rgb = ImageEnhance.Color(ImageEnhance.Brightness(im.convert("RGB")).enhance(int(bright) / 100)).enhance(int(sat) / 100)
    rgb.putalpha(al)
    dst = out(src, ".tone.png")
    rgb.save(dst, optimize=True)
    return {"file": rel(dst), "px": list(rgb.size)}


def rot(p):
    src = load(p)
    im = Image.open(src).convert("RGBA").transpose(Image.Transpose.ROTATE_90)   # против часовой: верх — влево, низ — вправо
    dst = out(src, ".v.png")
    im.save(dst, optimize=True)
    return {"file": rel(dst), "px": list(im.size)}


def unhalo(p, lum):
    src = load(p)
    a = np.asarray(Image.open(src).convert("RGBA")).copy()
    y = a[..., :3].astype(np.int32) @ np.array([299, 587, 114]) // 1000
    dark = (a[..., 3] < 250) & (y < int(lum))
    a[dark, 3] = 0
    dst = out(src, ".clean.png")
    Image.fromarray(a).save(dst, optimize=True)
    return {"file": rel(dst), "px": [a.shape[1], a.shape[0]], "cleared": int(dark.sum())}


def despill(p, cut):
    src = load(p)
    a = np.asarray(Image.open(src).convert("RGBA")).copy()
    a[a[..., 3] < int(cut), 3] = 0                                     # дымка за контуром — прочь
    rgb = a[..., :3].astype(np.int32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lilac = (a[..., 3] > 0) & (b > g + 12) & ((r > g + 4) | (b > r + 12))   # сиреневая кромка: синее зелёного, красное — тоже
    edge = (a[..., 3] > 0) & ~ndimage.binary_erosion(a[..., 3] > 0, iterations=EDGE)
    a[lilac & edge, 3] = 0                                             # у самого края кромка — прочь, контур чище
    lilac &= a[..., 3] > 0
    y = (rgb @ np.array([299, 587, 114]) // 1000)
    for c, k in ((0, 92), (1, 100), (2, 100)):                          # серое той же яркости, чуть холодное
        ch = a[..., c]
        ch[lilac] = np.clip(y[lilac] * k // 100, 0, 255)
    dst = out(src, ".edge.png")
    Image.fromarray(a).save(dst, optimize=True)
    return {"file": rel(dst), "px": [a.shape[1], a.shape[0]], "lilac": int(lilac.sum())}


def measure(p):
    src = load(p)
    a = np.asarray(Image.open(src).convert("RGBA"))
    solid = a[..., 3] > 200
    cols, rows = np.where(solid.any(axis=0))[0], np.where(solid.any(axis=1))[0]
    return {"file": rel(src), "px": [a.shape[1], a.shape[0]], "cols": [int(cols[0]), int(cols[-1])], "rows": [int(rows[0]), int(rows[-1])]}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    kind, args = sys.argv[1], sys.argv[2:]
    if kind == "sign":
        res = sign(args[0], args[1], int(args[2]), int(args[3]))
    elif kind == "tone":
        res = tone(args[0], args[1], args[2])
    elif kind == "rot":
        res = rot(args[0])
    elif kind == "unhalo":
        res = unhalo(args[0], args[1])
    elif kind == "despill":
        res = despill(args[0], args[1])
    elif kind == "measure":
        res = measure(args[0])
    else:
        sys.exit(__doc__)
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
