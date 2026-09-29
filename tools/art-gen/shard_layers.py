"""Слои стекла осколка героя для интерфейса (design/ui/screens/art-icons.js, shardGhost).

Образец автора 29.09.2026: кусок стекла на чёрном, кромка — бирюзовое стекло с трещинами и сколами, внутри ясно виден
призрачный портрет героя, поверх — трещины и блики. Стекло нарисовано одной картинкой на чёрном (jobs/souls-altar.json,
hero-shard-glass): кромка, трещины и блик, середина — чёрная пустота. Здесь оно режется на три слоя, которые совпадают
пиксель в пиксель:
  .mask.png   — где лежит лицо: силуэт осколка, край мягко уходит под кромку; цвет белый, альфа — маска;
  .rim.png    — кромка стекла со сколами и тонким свечением вокруг: свет на чёрном переведён в альфу;
  .cracks.png — трещины и блик на стекле поверх лица: интерфейс гасит их с долей собранного — трещины «заживают».

Свет на чёрном переводится в альфу так: a = max(R, G, B), цвет = C / a. Обычное наложение такого слоя даёт то же, что «экран»
картинки на чёрном: C + (1 − a) · фон. Чёрная середина — прозрачная, лицо под ней видно целиком.

Выгрузка (export_ui.py) обрезает PNG по альфе > 8 и вписывает в fit % кадра. Чтобы три слоя легли одинаково, у всех одна рамка:
в её углах — чёрный пиксель с альфой ANCHOR (его не видно), а сама рамка — общая по всем слоям.

  python tools/art-gen/shard_layers.py art/generated/hero-shard-glass/hero-shard-glass__nb2-v2.raw.jpg
  python tools/art-gen/shard_layers.py <raw> --preview DIR --face design/ui/assets/art/heroes/c2-41.jpg
Вывод — рамка и толщина кромки в px исходника; слои ложатся рядом с исходником: <имя без .raw>.mask.png, .rim.png, .cracks.png.
"""
import argparse
import json
import pathlib
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]

LIGHT = 70           # ярче этого по самому яркому каналу — стекло кромки (сплошное тело силуэта)
DARK = 34            # темнее этого внутри силуэта — пустота окна
CLOSE = 16           # радиус замыкания силуэта, px исходника: скол кромки не должен выпускать окно наружу
RIM_PAD = 3          # кромка захватывает в окно на столько px — мягкий стык с трещинами
ANCHOR = 9           # альфа угловых пикселей общей рамки: чуть выше порога выгрузки 8
A_CUT = 8            # порог выгрузки: рамка PNG — по альфе > 8
MASK_MIN = 14        # маска лица на всём силуэте не ниже этого: рамка маски — рамка силуэта


def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def light_alpha(rgb):
    """Свет на чёрном → альфа и чистый цвет: a = max канала, цвет = C / a."""
    a = rgb.max(-1) / 255.0
    col = np.where(a[..., None] > 0, rgb / np.maximum(a, 1e-4)[..., None], 0)
    return a, np.clip(col, 0, 255)


def silhouette(v):
    """Силуэт осколка: светлое тело кромки, замкнутое через сколы, с залитой серединой; одна самая большая область."""
    body = v > LIGHT
    closed = ndimage.binary_closing(body, structure=disk(CLOSE), iterations=1)
    filled = ndimage.binary_fill_holes(closed)
    lab, n = ndimage.label(filled)
    if not n:
        sys.exit("силуэт не найден: слишком тёмная картинка")
    sizes = ndimage.sum(filled, lab, index=np.arange(1, n + 1))
    return lab == (1 + int(np.argmax(sizes)))


def split(raw_path):
    rgb = np.asarray(Image.open(raw_path).convert("RGB")).astype(np.float32)
    v = rgb.max(-1)
    sil = silhouette(v)
    din = ndimage.distance_transform_edt(sil)                 # расстояние внутрь от края силуэта
    window = sil & (v < DARK) & (din > 4)                      # чёрная пустота окна
    lab, n = ndimage.label(window)
    sizes = ndimage.sum(window, lab, index=np.arange(1, n + 1)) if n else np.array([0])
    window = lab == (1 + int(np.argmax(sizes))) if n else window
    # толщина кромки — где начинается окно: нижний дециль расстояния внутрь у пикселей края окна
    edge = window & ~ndimage.binary_erosion(window, structure=disk(1))
    rim_w = float(np.percentile(din[edge], 10)) if edge.any() else 20.0
    # слой кромки: всё снаружи окна и полоса RIM_PAD внутрь; дальше — трещины. Переход мягкий, в 4 px
    dwin = ndimage.distance_transform_edt(~window)             # расстояние до окна снаружи окна; внутри окна — 0
    dinw = ndimage.distance_transform_edt(window)              # расстояние вглубь окна
    w_rim = np.clip(1.0 - (dinw - RIM_PAD) / 4.0, 0.0, 1.0)
    w_rim[~window] = 1.0
    a, col = light_alpha(rgb)
    rim_a = a * w_rim
    cr_a = a * (1.0 - w_rim) * sil
    # маска лица: 0 у внешнего края силуэта, 1 — чуть глубже середины кромки; не ниже MASK_MIN на всём силуэте
    t = np.clip((din - rim_w * 0.35) / max(1.0, rim_w * 0.65), 0.0, 1.0)
    m = t * t * (3 - 2 * t)
    mask_a = np.where(sil, np.maximum(m, MASK_MIN / 255.0), 0.0)
    # общая рамка: по свету кромки (с тонким свечением) и по силуэту
    frame = (rim_a * 255 > A_CUT) | sil
    ys, xs = np.nonzero(frame)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    out = {}
    stem = raw_path.name.replace(".raw", "").rsplit(".", 1)[0]
    for name, alpha, color in (("mask", mask_a, np.full_like(rgb, 255.0)), ("rim", rim_a, col), ("cracks", cr_a, col)):
        al = np.round(alpha * 255.0)
        al[al <= A_CUT] = 0          # всё, что выгрузка не считает, — прозрачное: рамку задают только якоря
        for (x, y) in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
            if al[y, x] <= A_CUT:
                al[y, x] = ANCHOR
        c = np.where(al[..., None] > 0, color, 0)
        img = np.dstack([np.round(c), al]).astype(np.uint8)
        path = raw_path.with_name(f"{stem}.{name}.png")
        Image.fromarray(img, "RGBA").save(path, optimize=True)
        out[name] = path.relative_to(ROOT).as_posix()
    info = {
        "frame": [x0, y0, x1 - x0 + 1, y1 - y0 + 1],
        "ratio_w_h": round((x1 - x0 + 1) / (y1 - y0 + 1), 3),
        "rim_px": round(rim_w, 1),
        "window_px": int(window.sum()),
        "files": out,
    }
    # окно в долях общей рамки: интерфейс ставит лицо в эту область
    wy, wx = np.nonzero(window)
    W, H = x1 - x0 + 1, y1 - y0 + 1
    info["window_box_pct"] = [round((wx.min() - x0) * 100 / W, 1), round((wy.min() - y0) * 100 / H, 1),
                              round((wx.max() - x0) * 100 / W, 1), round((wy.max() - y0) * 100 / H, 1)]
    return info, (x0, y0, x1, y1)


def preview(raw_path, info, box, face, out_dir, px=(256, 96, 44)):
    """Превью: лицо холодным монохромом под стеклом, как в интерфейсе; при доле 0 и 100 %."""
    out_dir = pathlib.Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    x0, y0, x1, y1 = box
    L = {k: Image.open(ROOT / p).convert("RGBA").crop((x0, y0, x1 + 1, y1 + 1)) for k, p in info["files"].items()}
    W, H = L["mask"].size
    f = Image.open(face).convert("L")
    # лицо: по грудь, как в стиле .hsg-face — картинка на 150 % высоты окна, верх — 6 %
    fh = int(H * 1.5)
    fw = int(f.width * fh / f.height)
    f = f.resize((fw, fh), Image.LANCZOS)
    left = (fw - W) // 2
    top = int((fh - H) * 0.06)
    f = f.crop((left, top, left + W, top + H))
    g = np.asarray(f).astype(np.float32) / 255.0
    g = np.clip((g - 0.5) * 1.25 + 0.5 + 0.04, 0, 1)
    tint_dark, tint_light = np.array([8, 20, 22]), np.array([205, 240, 236])
    face_rgb = tint_dark + (tint_light - tint_dark) * g[..., None]
    for share in (0, 100):
        base = np.zeros((H, W, 3), np.float32) + np.array([6, 14, 16])
        m = np.asarray(L["mask"])[..., 3:4] / 255.0
        comp = base * (1 - m) + face_rgb * m
        for k, op in (("cracks", 1.0 - share * 0.75 / 100), ("rim", 1.0)):
            lay = np.asarray(L[k]).astype(np.float32)
            a = lay[..., 3:4] / 255.0 * op
            comp = comp * (1 - a) + lay[..., :3] * a
        img = Image.fromarray(np.clip(comp, 0, 255).astype(np.uint8), "RGB")
        for s in px:
            k = s / max(W, H)
            img.resize((max(1, int(W * k)), max(1, int(H * k))), Image.LANCZOS).save(out_dir / f"preview-{share}-{s}.png")
    return out_dir


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("raw", help="исходник стекла на чёрном: art/generated/hero-shard-glass/….raw.jpg")
    ap.add_argument("--preview", help="папка превью")
    ap.add_argument("--face", help="портрет для превью")
    a = ap.parse_args()
    raw = pathlib.Path(a.raw)
    raw = raw if raw.is_absolute() else ROOT / raw
    info, box = split(raw)
    if a.preview and a.face:
        preview(raw, info, box, ROOT / a.face if not pathlib.Path(a.face).is_absolute() else pathlib.Path(a.face), a.preview)
    print(json.dumps(info, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
