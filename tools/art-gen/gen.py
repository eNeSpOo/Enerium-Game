"""Генерация арта «Энериума» через Gemini API.

Ключ — GEMINI_API_KEY из окружения или из .env в корне репозитория. Ключ не печатается.
Задания — JSON в tools/art-gen/jobs/: стиль, категории, предметы. Промт собирается из них.
Картинки — в art/generated/<категория>/, каждая запись — в art/generated/manifest.json.

  python tools/art-gen/gen.py jobs/refs-6.json                  # все задания; модели из файла, иначе nb2
  python tools/art-gen/gen.py jobs/refs-6.json --only hero-ilmerra --models pro
  python tools/art-gen/gen.py jobs/refs-6.json --dry-run        # промты и цена без запросов
"""
import argparse
import base64
import datetime
import hashlib
import io
import json
import os
import pathlib
import sys
import time

import requests
from PIL import Image

import cutout

ROOT = pathlib.Path(__file__).resolve().parents[2]
TOOL = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "art" / "generated"
MANIFEST = OUT / "manifest.json"
API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
EXT = {v: k for k, v in MIME.items() if k != ".jpeg"}
RETRIES = 3


def load_key():
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("GEMINI_API_KEY="):
                key = line.split("=", 1)[1].strip().strip("\"'")
    if not key:
        sys.exit("Нет GEMINI_API_KEY: положите его в .env в корне репозитория")
    return key


def load_json(path, default=None):
    if default is not None and not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def build(spec, job):
    """Промт, референсы и параметры одного задания."""
    cat = spec["categories"][job["category"]]
    parts = [spec["style"], cat["frame"], job["subject"]]
    key = job.get("cutout", cat.get("cutout"))
    if key:
        parts.append(spec["cutout_rule"].format(name=key, hex=cutout.KEYS[key]["hex"]))
    parts.append(spec["negative"])
    return {
        "prompt": "\n\n".join(p.strip() for p in parts if p),
        "refs": job.get("refs", cat.get("refs", [])),
        "aspect": job.get("aspect", cat["aspect"]),
        "size": job.get("size", cat["size"]),
        "cutout": key,
    }


def fit_size(size, model):
    """Размер, который модель умеет: запрошенный или ближайший меньший."""
    sizes = model["sizes"]
    if size in sizes:
        return size
    order = ["512", "1K", "2K", "4K"]
    smaller = [s for s in sizes if order.index(s) <= order.index(size)]
    return smaller[-1] if smaller else sizes[0]


def ref_bytes(p):
    """Референс для модели. Прозрачный PNG кладём на тёмную подложку: иначе модель видит фигуру на пустоте."""
    if p.suffix.lower() != ".png":
        return p.read_bytes(), MIME[p.suffix.lower()]
    with Image.open(p) as im:
        if im.mode not in ("RGBA", "LA", "P"):
            return p.read_bytes(), "image/png"
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (40, 42, 46, 255))
        bg.alpha_composite(im)
        buf = io.BytesIO()
        bg.convert("RGB").save(buf, "PNG")
        return buf.getvalue(), "image/png"


def call(key, model_id, prompt, refs, aspect, size):
    parts = [{"text": prompt}]
    for ref in refs:
        data, mime = ref_bytes(ROOT / ref)
        parts.append({"inline_data": {"mime_type": mime, "data": base64.b64encode(data).decode("ascii")}})
    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {"aspectRatio": aspect, "imageSize": size},
        },
    }
    for attempt in range(RETRIES + 1):
        r = requests.post(API.format(model=model_id), json=body, timeout=600,
                          headers={"x-goog-api-key": key, "Content-Type": "application/json"})
        if r.status_code == 200:
            return r.json()
        if r.status_code in (429, 500, 503) and attempt < RETRIES:
            wait = 15 * (attempt + 1)
            print(f"    HTTP {r.status_code}, повтор через {wait} с")
            time.sleep(wait)
            continue
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:1200]}")


def pick_image(resp):
    cands = resp.get("candidates") or []
    if not cands:
        raise RuntimeError("пустой ответ: " + json.dumps(resp.get("promptFeedback", {}), ensure_ascii=False))
    parts = (cands[0].get("content") or {}).get("parts") or []
    imgs = [p for p in parts if ("inlineData" in p or "inline_data" in p) and not p.get("thought")]
    text = " ".join(p["text"] for p in parts if "text" in p and not p.get("thought")).strip()
    if not imgs:
        raise RuntimeError(f"нет картинки, finishReason={cands[0].get('finishReason')}: {text[:400]}")
    d = imgs[-1].get("inlineData") or imgs[-1].get("inline_data")
    return base64.b64decode(d["data"]), d.get("mimeType") or d.get("mime_type"), text


def cost(usage, model):
    """Цена по счётчикам токенов из ответа, в долларах."""
    pm = model["per_million"]
    image_out = sum(d.get("tokenCount", 0) for d in usage.get("candidatesTokensDetails") or []
                    if d.get("modality") == "IMAGE")
    # всё остальное на выходе, включая размышления, идёт по цене текста
    text_out = usage.get("candidatesTokenCount", 0) - image_out + usage.get("thoughtsTokenCount", 0)
    usd = (usage.get("promptTokenCount", 0) * pm["input"] + image_out * pm["image_out"]
           + text_out * pm["text_out"]) / 1e6
    return round(usd, 4)


def free_stem(folder, stem):
    """Имя без перезаписи: job__model, затем job__model-v2 и дальше."""
    n = 1
    while True:
        s = stem if n == 1 else f"{stem}-v{n}"
        if not any(folder.glob(s + ".*")):
            return s
        n += 1


def rel(p):
    return p.relative_to(ROOT).as_posix()


LOCK = OUT / ".manifest.lock"


def add_to_manifest(item):
    """Запись в манифест под замком: несколько запусков могут рисовать одновременно.
    Манифест перечитывается перед записью, иначе параллельный запуск затрёт чужие записи."""
    t0 = time.time()
    while True:
        try:
            fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            break
        except FileExistsError:
            if time.time() - t0 > 120:  # замок старше двух минут — брошен упавшим запуском
                try:
                    os.remove(LOCK)
                except OSError:
                    pass
                t0 = time.time()
            time.sleep(0.2)
    try:
        manifest = load_json(MANIFEST, {"items": []})
        manifest["items"].append(item)
        tmp = MANIFEST.with_name(f"manifest.{os.getpid()}.tmp")
        tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(tmp, MANIFEST)
    finally:
        os.close(fd)
        try:
            os.remove(LOCK)
        except OSError:
            pass


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("jobs", help="файл заданий, путь от tools/art-gen/ или от корня")
    ap.add_argument("--only", help="id заданий через запятую")
    ap.add_argument("--models", help="модели через запятую: nb2 (по умолчанию), pro, lite")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--budget", type=float, help="потолок трат запуска в долларах: дальше задания не идут")
    a = ap.parse_args()

    jobs_path = (TOOL / a.jobs) if (TOOL / a.jobs).exists() else (ROOT / a.jobs)
    spec = load_json(jobs_path)
    catalog = load_json(TOOL / "models.json")
    models = catalog["models"]
    use = (a.models or ",".join(spec.get("models") or catalog["default"])).split(",")
    only = set(a.only.split(",")) if a.only else None
    todo = [j for j in spec["jobs"] if not only or j["id"] in only]
    key = None if a.dry_run else load_key()

    total = 0.0
    for job in todo:
        b = build(spec, job)
        for alias in use:
            m = models[alias]
            size = fit_size(b["size"], m)
            if a.budget is not None and not a.dry_run and total + m["per_image"][size] > a.budget:
                print(f"Потолок ${a.budget} — {job['id']} и дальше не рисуются")
                print(f"Итого: ${total:.3f} (по счётчикам токенов)")
                return
            print(f"{job['id']} · {m['name']} · {b['aspect']} · {size}")
            if a.dry_run:
                total += m["per_image"][size]
                continue
            t0 = time.time()
            try:
                resp = call(key, m["id"], b["prompt"], b["refs"], b["aspect"], size)
                data, mime, text = pick_image(resp)
            except RuntimeError as e:
                print(f"    ошибка: {e}")
                continue
            folder = OUT / job["category"]
            folder.mkdir(parents=True, exist_ok=True)
            stem = free_stem(folder, f"{job['id']}__{alias}")
            usage = resp.get("usageMetadata", {})
            item = {
                "file": None,
                "category": job["category"],
                "job": job["id"],
                "title": job["title"],
                "source": job.get("source", ""),
                "model": m["id"],
                "model_name": m["name"],
                "date": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
                "params": {"aspectRatio": b["aspect"], "imageSize": size, "responseModalities": ["TEXT", "IMAGE"]},
                "refs": b["refs"],
                "prompt": b["prompt"],
                "model_text": text,
                "usage": usage,
                "cost_usd": cost(usage, m),
                "seconds": round(time.time() - t0, 1),
                "status": "референс, не утверждён",
            }
            if b["cutout"]:
                raw = folder / f"{stem}.raw{EXT[mime]}"
                raw.write_bytes(data)
                final = folder / f"{stem}.png"
                cutout.remove_key(Image.open(raw), b["cutout"]).save(final, optimize=True)
                item["raw"] = rel(raw)
                item["cutout"] = {"key": b["cutout"], **cutout.check(final, raw, b["cutout"])}
            else:
                final = folder / f"{stem}{EXT[mime]}"
                final.write_bytes(data)
            item["file"] = rel(final)
            with Image.open(final) as im:
                item["px"] = list(im.size)
            item["sha256"] = hashlib.sha256(final.read_bytes()).hexdigest()
            add_to_manifest(item)
            total += item["cost_usd"]
            note = f", альфа: {'да' if item['cutout']['ok'] else 'НЕТ — ' + item['cutout'].get('why', '')}" if b["cutout"] else ""
            print(f"    → {item['file']} {item['px'][0]}×{item['px'][1]}, ${item['cost_usd']}, {item['seconds']} с{note}")
    print(f"Итого: ${total:.3f}" + (" (по прайсу, без запросов)" if a.dry_run else " (по счётчикам токенов)"))


if __name__ == "__main__":
    main()
