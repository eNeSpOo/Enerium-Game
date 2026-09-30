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
  python tools/art-gen/chest_layers.py sheets [--only chs-shards] [--preview DIR]   # листы режимов (jobs/chest-sheets.json)
  python tools/art-gen/chest_layers.py spec [--dry-run]  # их опись в ui-art.json и геометрия CO_ART.sets
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


"""Листы сундуков режимов (jobs/chest-sheets.json): семь редкостей и замок режима на ровном пурпуре, сетка 4 × 2 без швов.
Тонкие линии сетки, если модель их всё же провела (сплошной не-ключ во всю высоту или ширину листа), красятся ключом.
Пурпур вырезается с защитой середины: фон — только сильный ключ, связанный с краем листа (и крупные закрытые окна — дужка замка);
альфа по доле ключа — лишь в полосе SOFT px у фона (кромка, ореол кристалла, язык пламени), глубже рисунок непрозрачен.
В клетках protect (эпическая редкость — фиолетовый камень) сине-фиолетовое в полосе тоже непрозрачно: там полупрозрачна
только смесь, где красного не меньше RB_SOFT синего. Цвет полупрозрачного края — цвет ближайшего непрозрачного пикселя рисунка:
пурпурной каймы нет, ореол кристалла — цвета самого кристалла. Затем снимается белая наклейка, пятна режутся по строкам
(craft_layers.cut), сундук — по своему шву."""
SHEETS = pathlib.Path(__file__).with_name("jobs") / "chest-sheets.json"
KEY_CORE = 0.5       # доля ключа, с которой пиксель — точно фон: заливка от краёв листа идёт только по таким
KEY_LO, KEY_HI = 0.10, 0.70   # доля ключа: до LO — рисунок, от HI — фон, между — край (как cutout.py)
SOFT = 128           # полоса у фона, px: только в ней альфа — по доле ключа (ореол у кристаллов не шире)
RB_SOFT = 0.8        # в клетках protect полупрозрачна только смесь с R >= 0.8 · B; сине-фиолетовое — рисунок
GRID = (4, 2)        # сетка листа: столбцы, строки
CLEAN = 0.02         # доля ключа, до которой пиксель — чистый рисунок: пурпура в нём нет
FAR_KEY = 1500       # цвет рисунка ближе к ключу (квадрат расстояния) — не кандидат для проекции
GLOW_SAT, GLOW_V = 0.45, 140   # источник ореола — насыщенный и яркий пиксель рисунка: кристалл, пламя, золото
GLOW_R = 220         # ореол не дальше стольких px от своего источника
RES_MAX = 38         # остаток проекции, до которого точка — смесь «цвет рисунка — ключ»
RES_GLOW = 60        # то же для ореола: свечение светлее самого кристалла
HALO_NEAR, RES_HALO = 90, 22   # серый ореол без пурпура по доле ключа: не дальше от источника и остаток не больше
HOLE = 0.0004        # закрытое окно сильного ключа больше этой доли листа — тоже фон (дужка замка)
HOLE_PX = 300        # вне клеток protect окно сильного ключа — фон уже от стольких px (просвет в верёвочной ручке)
LINE_SHARE = 0.95    # столбец или строка листа — линия сетки, если не-ключа в ней больше этой доли
LINE_MAX = 32        # и если такая полоса не шире, px
LINE_PAD = 3         # полоса линии красится ключом с таким запасом по краям, px
SEAM_BAND = (200, 800)   # шов ищется в средних 60 % ширины сундука, ‰
SEAM_ROWS = (220, 760)   # и между такими долями высоты, ‰
SEAM_NEAR = (10, 26)     # тёмная полоса шва (у листов 4K — 10–25 px): сравнение со строками на столько px выше и ниже
EXPORT_W = 960       # ширина сундука в выгрузке, px: окно открытия показывает его около 235 px сцены — запас на телефон с плотностью 3 и приближение
ICON_W = 256         # плитка сундука в запасах и наградах — тот же рисунок, уменьшенный
LOCK_W = 240         # замок режима в выгрузке, px (в сцене — около 45 px)
SCENE_W = 236        # ширина сундука листа в сцене окна открытия, px — как у прежних сундуков (рамка × CO_VIEW.geo.scale)
UI_ART = pathlib.Path(__file__).with_name("ui-art.json")
NL, CRLF = chr(10), chr(13) + chr(10)


def unline(rgb, m):
    """Линии сетки между клетками → ключ. Возвращает число закрашенных полос."""
    k = np.array((255, 0, 255), np.float32)
    solid = m < KEY_CORE
    n = 0
    for axis in (0, 1):   # 0 — столбцы (доля по высоте), 1 — строки
        share = solid.mean(axis=axis)
        flags = share > LINE_SHARE
        i, size = 0, len(flags)
        while i < size:
            if not flags[i]:
                i += 1
                continue
            j = i
            while j < size and flags[j]:
                j += 1
            if j - i <= LINE_MAX:
                a, b = max(0, i - LINE_PAD), min(size, j + LINE_PAD)
                if axis == 0:
                    rgb[:, a:b] = k
                    m[:, a:b] = 1.0
                else:
                    rgb[a:b, :] = k
                    m[a:b, :] = 1.0
                n += 1
            i = j
    return n


def cut_key(src, protect=(4,)):
    """Пурпур → альфа с защитой середины. protect — номера клеток (с 1, по строкам), где сине-фиолетовое — рисунок.
    Возвращает RGBA-массив листа."""
    import cutout
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    m = cutout.key_amount(rgb, "magenta")
    lines = unline(rgb, m)
    if lines:
        print(f"  линий сетки закрашено ключом: {lines}")
    H, W = m.shape
    cols, rows = GRID
    violet = np.zeros(m.shape, bool)
    guard = np.zeros(m.shape, bool)   # клетки protect: окна ключа в них — фон, только если крупные (фиолетовый камень цел)
    for c in protect:
        x, y = (c - 1) % cols, (c - 1) // cols
        box = (slice(H * y // rows, H * (y + 1) // rows), slice(W * x // cols, W * (x + 1) // cols))
        violet[box] = rgb[box][..., 0] < RB_SOFT * rgb[box][..., 2]
        guard[box] = True
    lab, n = ndimage.label(m >= KEY_CORE)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    keep = np.zeros(n + 1, bool)
    keep[edge] = True
    if n:
        idx = np.arange(1, n + 1)
        sizes = ndimage.sum(np.ones_like(m), lab, index=idx)
        guarded = ndimage.maximum(guard.astype(np.uint8), lab, index=idx) > 0
        keep[1:] |= np.where(guarded, sizes > HOLE * m.size, sizes > HOLE_PX)
    keep[0] = False
    bg = keep[lab]
    # Край и ореол у фона — смесь рисунка и ключа: C = a·F + (1 − a)·K. F — цвет рисунка рядом, кандидатов два: ближайший
    # яркий насыщенный пиксель (кристалл, пламя, золото — источник ореола) и ближайший чистый пиксель рисунка. a — проекция
    # C − K на F − K; берётся кандидат, у которого остаток меньше, и только если остаток не больше RES_MAX — точка лежит на
    # отрезке «цвет рисунка — ключ». Так серо-сиреневый ореол зелёного кристалла становится зелёным свечением (доля ключа
    # min(R, B) − G его не видит: зелень гасит её), а камень крышки рядом с кристаллом не просвечивает — он не на отрезке.
    # Не легло ни на один отрезок — альфа по доле ключа, цвет — с вычтенным ключом, как в cutout.py.
    K = np.array(cutout.KEYS["magenta"]["rgb"], np.float32)
    dist = ndimage.distance_transform_edt(~bg)
    band = dist <= SOFT
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1.0)
    clean = (~bg & (m <= CLEAN)) | (violet & ~bg)
    glow = (~bg & (m <= CLEAN) & (sat > GLOW_SAT) & (mx > GLOW_V)) | (violet & ~bg & (sat > 0.3) & (mx > 120))
    by_m = 1.0 - np.clip((m - KEY_LO) / (KEY_HI - KEY_LO), 0.0, 1.0)
    # в работе — всё у фона, кроме самих источников ореола и фиолетового клеток protect: серый ореол зелёного кристалла
    # по доле ключа чистый, но лежит на отрезке «кристалл — ключ»; чистый пиксель рисунка проверяется только на ореол
    todo = band & ~glow & ~(violet & ~bg)
    ys, xs = np.nonzero(todo)
    C = rgb[ys, xs] - K
    keyed = m[ys, xs] > CLEAN
    best_a = np.full(len(ys), -1.0, np.float32)
    best_r = np.full(len(ys), np.inf, np.float32)
    best_f = np.zeros((len(ys), 3), np.float32)
    # чистый по доле ключа пиксель — ореолом считается, только если он светлый и почти без цвета (серо-сиреневая смесь
    # зелени с пурпуром), источник рядом (HALO_NEAR) и отрезок сходится строго (RES_HALO): так сталь и камень у золотой
    # оковки не просвечивают
    pale = ~keyed & (sat[ys, xs] < 0.2) & (mx[ys, xs] > 110)
    for srcmask, reach, lim, who in ((glow, GLOW_R, RES_GLOW, keyed), (glow, HALO_NEAR, RES_HALO, pale), (clean, SOFT + 2, RES_MAX, keyed)):
        if not srcmask.any():
            continue
        dd, (iy, ix) = ndimage.distance_transform_edt(~srcmask, return_indices=True)
        Fk = rgb[iy[ys, xs], ix[ys, xs]]
        d = Fk - K
        den = np.maximum((d * d).sum(-1), 1.0)
        a = np.clip((C * d).sum(-1) / den, 0.0, 1.0)
        res = np.sqrt(((C - a[:, None] * d) ** 2).sum(-1))
        fit = (dd[ys, xs] <= reach) & ((d * d).sum(-1) > FAR_KEY) & (res <= lim) & who
        res = np.where(fit, res, np.inf)
        take = res < best_r
        best_r[take], best_a[take], best_f[take] = res[take], a[take], Fk[take]
    ok = np.isfinite(best_r)
    alpha0 = np.where(keyed, by_m[ys, xs], 1.0)   # не лёг ни на один отрезок: пурпур — по доле ключа, чистое — непрозрачно
    alpha = np.where(bg, 0.0, 1.0).astype(np.float32)
    fg = rgb.copy()
    am = by_m[ys, xs]
    a_fin = np.where(ok, best_a, alpha0)
    a_fin = np.where(bg[ys, xs], np.minimum(a_fin, am), a_fin)   # сильный ключ — не плотнее, чем по доле ключа: шум JPEG в фоне прозрачный
    unmix = np.clip((rgb[ys, xs] - (1.0 - am)[:, None] * K) / np.maximum(am, 1e-3)[:, None], 0, 255)
    spill = np.clip(unmix[:, [0, 2]].min(-1) - unmix[:, 1], 0, None)
    unmix[:, 0] -= spill
    unmix[:, 2] -= spill
    alpha[ys, xs] = a_fin
    fg[ys, xs] = np.where(ok[:, None], best_f, np.where(keyed[:, None], np.clip(unmix, 0, 255), rgb[ys, xs]))
    alpha[alpha < 0.05] = 0.0
    alpha[alpha > 0.97] = 1.0
    fg[alpha == 0] = 0
    return np.dstack([fg, alpha * 255.0]).round().astype(np.uint8)


def find_seam(a):
    """Шов сундука: строка самой глубокой и самой сплошной тёмной полосы в средних 60 % ширины, между SEAM_ROWS высоты.
    Оценка строки — насколько она темнее строк выше и ниже (SEAM_NEAR) и в какой доле столбцов полосы это так."""
    h, w = a.shape[:2]
    x0, x1 = w * SEAM_BAND[0] // 1000, w * SEAM_BAND[1] // 1000
    rgb = a[:, x0:x1, :3].astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    lum = ndimage.uniform_filter1d(lum, 5, axis=0)
    n0, n1 = SEAM_NEAR
    best, row = -1.0, None
    for y in range(max(n1, h * SEAM_ROWS[0] // 1000), min(h - n1, h * SEAM_ROWS[1] // 1000)):
        up, dn = lum[y - n1:y - n0 + 1].mean(0), lum[y + n0:y + n1 + 1].mean(0)
        dip = np.minimum(up, dn) - lum[y]
        score = float(np.clip(dip, 0, None).mean()) * float((dip > 6).mean())
        if score > best:
            best, row = score, y
    return row, round(best, 2)


def split_arr(a, seam):
    """Крышка и корпус из вырезанного сундука: выше шва (+OVERLAP) — крышка, от шва (−OVERLAP) — корпус; рамки — px сундука."""
    x0, y0, x1, y1 = bbox(a)
    lid, body = a.copy(), a.copy()
    lid[seam + OVERLAP:, :, 3] = 0
    body[:seam - OVERLAP, :, 3] = 0
    out = {"frame": [x0, y0, x1 - x0, y1 - y0], "seam": seam}
    parts = {}
    for name, layer in (("lid", lid), ("body", body)):
        lx0, ly0, lx1, ly1 = bbox(layer)
        part = layer[ly0:ly1, lx0:lx1].copy()
        part[part[..., 3] <= A_CUT] = 0
        out[name] = [lx0, ly0, lx1 - lx0, ly1 - ly0]
        parts[name] = part
    return out, parts


def sheet_preview(sid, cells, lock, folder):
    """Превью листа: каждый сундук закрытым и с крышкой, поднятой на зазор; на тёмном и на светлом; замок — последним."""
    gap, pad, k = 90, 30, 2
    tiles = []
    for c in cells:
        fx0, fy0, fw, fh = c["frame"]
        W, H = fw + 2 * pad, fh + 2 * pad + gap
        for bg in ((14, 17, 20, 255), (214, 214, 214, 255)):
            for g in (0, gap):
                t = Image.new("RGBA", (W, H), bg)
                t.alpha_composite(c["img"]["body"], (c["body"][0] - fx0 + pad, c["body"][1] - fy0 + pad + gap))
                t.alpha_composite(c["img"]["lid"], (c["lid"][0] - fx0 + pad, c["lid"][1] - fy0 + pad + gap - g))
                tiles.append(t.resize((W // k, H // k), Image.LANCZOS))
    lw, lh = lock.size
    for bg in ((14, 17, 20, 255), (214, 214, 214, 255)):
        t = Image.new("RGBA", (lw + 2 * pad, lh + 2 * pad), bg)
        t.alpha_composite(lock, (pad, pad))
        tiles.append(t.resize((t.width // k, t.height // k), Image.LANCZOS))
    cols = 4
    cw = max(t.width for t in tiles)
    rh = max(t.height for t in tiles)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGBA", (cw * cols, rh * rows), (40, 40, 40, 255))
    for i, t in enumerate(tiles):
        sheet.alpha_composite(t, ((i % cols) * cw, (i // cols) * rh))
    path = folder / f"{sid}.jpg"
    sheet.convert("RGB").save(path, quality=84)
    return path


def sheets(only=None, folder=None):
    """Листы режимов: вырезка, нарезка на восемь пятен, шов и слои каждого сундука, замок. Геометрия — layers.json у клеток
    и строкой JSON для CO_ART.sets (screens/chest-open.js)."""
    import craft_layers
    spec = json.loads(SHEETS.read_text(encoding="utf-8"))["layers"]["sheets"]
    geo = {}
    for sid, s in spec.items():
        if only and sid not in only:
            continue
        src = GEN / s["from"]
        if not src.exists():
            print(f"{sid}: нет исходника {s['from']}")
            continue
        a = cut_key(src, s.get("protect", [4]))
        parts = craft_layers.cut(a, 4, 2)
        out_dir = GEN / pathlib.Path(s["from"]).parent / sid
        out_dir.mkdir(parents=True, exist_ok=True)
        cells, rows = [], []
        for i, raw in enumerate(parts[:7]):
            r = i + 1
            c, rim = clean_rim(raw)
            x0, y0, x1, y1 = bbox(c)
            c = c[y0:y1, x0:x1].copy()
            c[c[..., 3] <= A_CUT] = 0
            auto, score = find_seam(c)
            seam = int(s.get("seams", {}).get(str(r), auto))
            g, layer = split_arr(c, seam)
            files = {}
            for name, arr in (("", c), (".lid", layer["lid"]), (".body", layer["body"])):
                p = out_dir / f"r{r}{name}.png"
                save(arr, p)
                files[name.strip(".") or "whole"] = p.relative_to(GEN).as_posix()
            cells.append({"r": r, **g, "files": files, "img": {k: Image.fromarray(v, "RGBA") for k, v in layer.items()}})
            rows.append({"r": r, **g, "auto": auto, "score": score, "rim": rim, "files": files})
            print(f"{sid} r{r}: {c.shape[1]}×{c.shape[0]}, шов {seam}{'' if seam == auto else f' (сам нашёл {auto})'} · оценка {score}, "
                  f"крышка {g['lid']}, корпус {g['body']}, наклейка снята: {rim} px")
        lk, rim = clean_rim(parts[7])
        x0, y0, x1, y1 = bbox(lk)
        lk = lk[y0:y1, x0:x1].copy()
        lk[lk[..., 3] <= A_CUT] = 0
        lp = out_dir / "lock.png"
        save(lk, lp)
        print(f"{sid} замок: {lk.shape[1]}×{lk.shape[0]} → {lp.relative_to(GEN).as_posix()}, наклейка снята: {rim} px")
        info = {"sheet": s["from"], "box": s["box"], "chests": rows, "lock": {"file": lp.relative_to(GEN).as_posix(), "px": [lk.shape[1], lk.shape[0]]}}
        (out_dir / "layers.json").write_text(json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        geo[s["box"]] = {"lock": [lk.shape[1], lk.shape[0]], "by": [[r["frame"], r["seam"], r["lid"], r["body"]] for r in rows]}
        if folder:
            print("превью:", sheet_preview(sid, cells, Image.fromarray(lk, "RGBA"), folder))
    print(json.dumps(geo, ensure_ascii=False, separators=(",", ":")))
    return geo


def spec_out(write=True):
    """Опись выгрузки листов в ui-art.json и геометрия CO_ART.sets для screens/chest-open.js.
    На сундук — корпус и крышка WebP с альфой (сундук EXPORT_W px в ширину) и плитка ICON_W px — закрытый сундук целиком;
    на режим — замок LOCK_W px. ui-art.json правят и другие: он перечитывается прямо перед записью, формат — отступ 2, CRLF."""
    spec = json.loads(SHEETS.read_text(encoding="utf-8"))["layers"]["sheets"]
    items, sets = {}, {}
    for sid, s in spec.items():
        f = GEN / pathlib.Path(s["from"]).parent / sid / "layers.json"
        if not f.exists():
            continue
        L = json.loads(f.read_text(encoding="utf-8"))
        box, base = L["box"], f"chests/{L['box']}/"
        ws = sorted(c["frame"][2] for c in L["chests"])
        scale = round(SCENE_W * 1000 / ws[len(ws) // 2])
        by = []
        for c in L["chests"]:
            fw, fh = c["frame"][2], c["frame"][3]
            k = EXPORT_W / fw
            for part in ("body", "lid"):
                w, h = c[part][2], c[part][3]
                items[f"{base}r{c['r']}-{part}.webp"] = {"from": c["files"][part], "size": [max(1, round(w * k)), max(1, round(h * k))]}
            items[f"{base}r{c['r']}.webp"] = {"from": c["files"]["whole"], "size": [ICON_W, max(1, round(fh * ICON_W / fw))]}
            by.append({"frame": c["frame"], "seam": c["seam"], "lid": c["lid"], "body": c["body"]})
        lw, lh = L["lock"]["px"]
        items[f"{base}lock.webp"] = {"from": L["lock"]["file"], "size": [LOCK_W, max(1, round(lh * LOCK_W / lw))]}
        sets[box] = {"scale": scale, "lock": [lw, lh], "by": by}
    if write and items:
        raw = UI_ART.read_bytes().decode("utf-8")
        ui = json.loads(raw)
        ui["items"].update(items)
        UI_ART.write_bytes((json.dumps(ui, ensure_ascii=False, indent=2) + NL).replace(NL, CRLF).encode("utf-8"))
        print(f"ui-art.json: {len(items)} путей сундуков листами")
    print("ready:", json.dumps(sorted(items), ensure_ascii=False))
    for box, v in sets.items():
        rows = ("," + NL + "      ").join("{ frame: %s, seam: %d, lid: %s, body: %s }" % (json.dumps(g["frame"]), g["seam"], json.dumps(g["lid"]), json.dumps(g["body"])) for g in v["by"])
        print(f"    {box}: {{ scale: {v['scale']}, lock: [{v['lock'][0]}, {v['lock'][1]}], by: [" + NL + "      " + rows + "] },")
    return items, sets


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) > 1 and sys.argv[1] == "spec":
        spec_out("--dry-run" not in sys.argv)
        return
    if len(sys.argv) > 1 and sys.argv[1] == "sheets":
        ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
        ap.add_argument("cmd")
        ap.add_argument("--only", help="id листов через запятую")
        ap.add_argument("--preview", help="папка для превью листов")
        a = ap.parse_args()
        folder = pathlib.Path(a.preview) if a.preview else None
        if folder:
            folder.mkdir(parents=True, exist_ok=True)
        sheets(set(a.only.split(",")) if a.only else None, folder)
        return
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
