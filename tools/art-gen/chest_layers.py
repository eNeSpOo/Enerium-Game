"""Слои сундуков для окна открытия сундука (design/ui/screens/chest-open.js).

Сундук нарисован одним куском, закрытым, с прямым швом между крышкой и корпусом (jobs/chests.json). Здесь он режется
по шву на корпус и крышку: слои совпадают пиксель в пиксель, и крышка откидывается по-настоящему. Заодно снимается
белая «наклейка» по контуру — её модель рисует вокруг предмета на пурпурном ключе. Замку — то же.

Текстуры света (ключ black-glow) получают поля вокруг центра: лучи и кольцо вращаются вокруг центра картинки,
а выгрузка (export_ui.py) обрезает PNG по альфе > 8. Поэтому в углах текстуры — чёрный пиксель с альфой 9: он не виден,
а рамка выгрузки остаётся квадратом с центром на месте.

Исходники не меняются: слои ложатся рядом, в art/generated/<категория>/, с суффиксом .body, .lid, .clean, .fx.
Шов — строка в px исходника, раздел layers в jobs/chests.json: выше — крышка, ниже — корпус.

  python tools/art-gen/chest_layers.py                   # все слои
  python tools/art-gen/chest_layers.py --preview DIR     # и превью: слои с зазором по шву, на тёмном и светлом
Вывод — геометрия для CO_ART в screens/chest-open.js: рамка сундука, шов, корпус и крышка — px исходника.
"""
import argparse
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
JOBS = pathlib.Path(__file__).with_name("jobs") / "chests.json"
GEN = ROOT / "art" / "generated"

A_CUT = 8            # выгрузка обрезает PNG по альфе > 8: слои режем так же, чтобы её обрезка ничего не меняла
OVERLAP = 2          # строк шва у обоих слоёв: закрытый сундук без щели на стыке
RIM_DEPTH = 12       # белая наклейка — не глубже стольких px от прозрачного
RIM_WHITE = 165      # и светлее этого по самому тёмному каналу
RIM_GREY = 48        # и почти без цвета: разница каналов не больше
ANCHOR = 9           # альфа угловых пикселей текстуры света: чуть выше порога выгрузки


def rgba(path):
    return np.asarray(Image.open(path).convert("RGBA")).copy()


def clean_rim(a):
    """Снять белую наклейку: светлые бесцветные пиксели у края, связанные с прозрачным, — прозрачные; край — мягкий."""
    alpha = a[..., 3]
    inside = alpha > A_CUT
    dist = ndimage.distance_transform_edt(inside)
    rgb = a[..., :3].astype(np.int16)
    white = (rgb.min(-1) >= RIM_WHITE) & ((rgb.max(-1) - rgb.min(-1)) <= RIM_GREY)
    cand = inside & white & (dist <= RIM_DEPTH)
    lab, n = ndimage.label(cand)
    if n:
        touch = np.unique(lab[(dist <= 1.5) & cand])
        rim = np.isin(lab, touch[touch > 0])
    else:
        rim = np.zeros_like(cand)
    # полупрозрачная кромка снаружи наклейки тоже уходит
    rim |= inside & (dist <= 1.5) & ndimage.binary_dilation(rim, iterations=2)
    out = a.copy()
    out[rim, 3] = 0
    keep = out[..., 3] > A_CUT
    d2 = ndimage.distance_transform_edt(keep)
    soft = np.clip(d2 / 1.5, 0, 1)
    out[..., 3] = (out[..., 3] * soft).round().astype(np.uint8)
    out[out[..., 3] == 0, :3] = 0
    return out, int(rim.sum())


def bbox(a):
    """Рамка по альфе > A_CUT: x0, y0, x1, y1 (x1, y1 — не включая)."""
    ys, xs = np.nonzero(a[..., 3] > A_CUT)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def save(a, path):
    Image.fromarray(a, "RGBA").save(path, optimize=True)


def split(src, seam):
    """Корпус и крышка: строки выше шва (+OVERLAP) — крышка, от шва (−OVERLAP) — корпус; каждый слой — по своей рамке."""
    a, rim = clean_rim(rgba(src))
    x0, y0, x1, y1 = bbox(a)
    lid, body = a.copy(), a.copy()
    lid[seam + OVERLAP:, :, 3] = 0
    body[:seam - OVERLAP, :, 3] = 0
    out = {"frame": [x0, y0, x1 - x0, y1 - y0], "seam": seam, "rim": rim}
    for name, layer in (("lid", lid), ("body", body)):
        x0, y0, x1, y1 = bbox(layer)
        part = layer[y0:y1, x0:x1]
        part[part[..., 3] <= A_CUT] = 0
        path = src.with_name(src.stem + "." + name + ".png")
        save(part, path)
        out[name] = [x0, y0, x1 - x0, y1 - y0]
        out[name + "File"] = path.relative_to(GEN).as_posix()
    return out, a


def clean(src, suffix):
    """Предмет без наклейки, по своей рамке (замок)."""
    a, rim = clean_rim(rgba(src))
    x0, y0, x1, y1 = bbox(a)
    part = a[y0:y1, x0:x1]
    part[part[..., 3] <= A_CUT] = 0
    path = src.with_name(src.stem + "." + suffix + ".png")
    save(part, path)
    return {"file": path.relative_to(GEN).as_posix(), "px": [x1 - x0, y1 - y0], "rim": rim}


def fx(src, crop="center", fade=None):
    """Текстура света. fade — мягкий край по кругу от центра картинки: альфа гаснет от fade[0] до fade[1] ‰ полуширины.
    crop center — поля по наибольшему отступу света от центра картинки, центр остаётся центром;
    crop bbox — рамка по свету: низ столпа и пыли встаёт на своё место в сцене."""
    a = rgba(src)
    h, w = a.shape[:2]
    cx, cy = w // 2, h // 2
    if fade:
        yy, xx = np.mgrid[0:h, 0:w]
        r = np.hypot(xx - cx, yy - cy) * 1000 / min(cx, cy)
        k = np.clip((fade[1] - r) / (fade[1] - fade[0]), 0, 1)
        k = k * k * (3 - 2 * k)
        a[..., 3] = (a[..., 3] * k).round().astype(np.uint8)
        a[a[..., 3] <= A_CUT] = 0
    x0, y0, x1, y1 = bbox(a)
    if crop == "bbox":
        part = a[y0:y1, x0:x1].copy()
        box = [x0, y0, x1 - x0, y1 - y0]
    else:
        dx = max(cx - x0, x1 - cx)
        dy = max(cy - y0, y1 - cy)
        L, T = max(0, cx - dx), max(0, cy - dy)
        part = a[T:min(h, cy + dy), L:min(w, cx + dx)].copy()
        box = [L, T, part.shape[1], part.shape[0]]
        for yy, xx in ((0, 0), (0, -1), (-1, 0), (-1, -1)):
            if part[yy, xx, 3] <= A_CUT:
                part[yy, xx] = (0, 0, 0, ANCHOR)
    path = src.with_name(src.stem + ".fx.png")
    save(part, path)
    return {"file": path.relative_to(GEN).as_posix(), "px": [part.shape[1], part.shape[0]], "box": box,
            "canvas": [w, h], "offset": [(x0 + x1) // 2 - cx, (y0 + y1) // 2 - cy]}


def preview(kind, out, a, folder):
    """Превью: закрытый сундук и слои с зазором по шву, на тёмном и светлом."""
    gap = 60
    body = Image.open(GEN / out["bodyFile"])
    lid = Image.open(GEN / out["lidFile"])
    fx0, fy0, fw, fh = out["frame"]
    W, H = fw + 40, fh + 40 + gap
    tiles = []
    for bg in ((14, 17, 20, 255), (226, 226, 226, 255)):
        for g in (0, gap):
            c = Image.new("RGBA", (W, H), bg)
            c.alpha_composite(body, (out["body"][0] - fx0 + 20, out["body"][1] - fy0 + 20 + gap))
            c.alpha_composite(lid, (out["lid"][0] - fx0 + 20, out["lid"][1] - fy0 + 20 + gap - g))
            tiles.append(c)
    sheet = Image.new("RGBA", (W * 4, H), (40, 40, 40, 255))
    for i, t in enumerate(tiles):
        sheet.alpha_composite(t, (i * W, 0))
    sheet.convert("RGB").save(folder / f"{kind}.jpg", quality=86)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--preview", help="папка для превью слоёв")
    a = ap.parse_args()
    spec = json.loads(JOBS.read_text(encoding="utf-8"))["layers"]
    folder = pathlib.Path(a.preview) if a.preview else None
    if folder:
        folder.mkdir(parents=True, exist_ok=True)
    geo = {}
    for kind, s in spec["chests"].items():
        src = GEN / s["from"]
        out, img = split(src, s["seam"])
        geo[kind] = {"frame": out["frame"], "seam": out["seam"], "lid": out["lid"], "body": out["body"]}
        print(f"{kind:9} шов {out['seam']}, рамка {out['frame']}, крышка {out['lid']} → {out['lidFile']}, "
              f"корпус {out['body']} → {out['bodyFile']}, наклейка снята: {out['rim']} px")
        if folder:
            preview(kind, out, img, folder)
    for name, s in spec.get("items", {}).items():
        r = clean(GEN / s["from"], s.get("suffix", "clean"))
        geo[name] = {"px": r["px"]}
        print(f"{name:9} {r['px'][0]}×{r['px'][1]} → {r['file']}, наклейка снята: {r['rim']} px")
    for name, s in spec["fx"].items():
        r = fx(GEN / s["from"], s.get("crop", "center"), s.get("fade"))
        geo[name] = {"px": r["px"], "box": r["box"]}
        print(f"{name:9} {r['px'][0]}×{r['px'][1]} → {r['file']}, рамка в исходнике {r['box']} из {r['canvas']}, "
              f"центр света от центра картинки: {r['offset']}")
    print(json.dumps(geo, ensure_ascii=False))


if __name__ == "__main__":
    main()
