"""Галерея сгенерированного арта: art/generated/gallery.html из manifest.json.

Данные вшиваются в страницу, поэтому она открывается двойным щелчком, без сервера.
По заданию — ряд картинок разных моделей: подпись, цена, размер, промт. Прозрачные
картинки показаны на тёмном и светлом фоне: так видно, что альфа настоящая.

  python tools/art-gen/gallery.py
"""
import html
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
TOOL = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "art" / "generated"

CSS = """
:root{--page:#050607;--stone:#121518;--stone-2:#171b1f;--iron:#262b31;--iron-2:#394047;--parch:#ece4d3;--parch-2:#aaa293;--parch-3:#736d63;--gold:#ddbc7a;--gold-3:#6a5534;--spirit:#48e5d4;--rust:#dc6a52;--f-d:"Cormorant Garamond",Georgia,serif;--f-u:"PT Sans Narrow","Arial Narrow",sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--parch);font:15px/1.45 var(--f-u)}
main{max-width:1500px;margin:0 auto;padding:24px 16px 64px}
h1{font:600 34px/1.1 var(--f-d);color:var(--gold);margin:0 0 6px}
h2{font:600 24px/1.15 var(--f-d);color:var(--gold);margin:0}
.lead{color:var(--parch-2);max-width:900px;margin:0 0 18px}
table{border-collapse:collapse;margin:8px 0 22px;font-size:14px}
th,td{border-bottom:1px solid var(--iron);padding:6px 12px 6px 0;text-align:left;vertical-align:top}
th{color:var(--parch-3);font-weight:400}
td b{color:var(--gold)}
.job{border-top:1px solid var(--iron-2);padding:22px 0 8px}
.meta{color:var(--parch-3);font-size:13px;margin:4px 0 12px}
.row{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.card{background:var(--stone);border:1px solid var(--iron);border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
.card.test{opacity:.55}
.pic{display:block;background:#0b0d10}
.pic img{display:block;width:100%;height:auto}
.alpha{display:grid;grid-template-columns:1fr 1fr}
.alpha a{display:block;padding:14px}
.alpha a:first-child{background:#121518}
.alpha a:last-child{background:#ece4d3}
.alpha img{display:block;width:100%;height:auto}
.cap{padding:10px 12px 12px;display:flex;flex-direction:column;gap:3px}
.cap b{font:600 19px/1.1 var(--f-d);color:var(--parch)}
.cap .ok{color:var(--spirit)}
.cap .bad{color:var(--rust)}
.cap small{color:var(--parch-3)}
details{margin:10px 0 0;color:var(--parch-2);font-size:13px}
summary{cursor:pointer;color:var(--parch-3)}
pre{white-space:pre-wrap;background:var(--stone-2);border:1px solid var(--iron);border-radius:8px;padding:10px;margin:8px 0 0;font:12.5px/1.45 ui-monospace,Consolas,monospace;color:var(--parch-2)}
@media (max-width:420px){.row{grid-template-columns:1fr}}
"""


def esc(s):
    return html.escape(str(s), quote=True)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    manifest = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))
    models = json.loads((TOOL / "models.json").read_text(encoding="utf-8"))
    items = manifest["items"]

    # заменённые пробы — в конец своего раздела; разделы — в порядке генерации, без пробных запросов
    replaced = lambda it: it.get("status", "").startswith("заменён")
    jobs, order = {}, []
    for it in sorted(items, key=replaced):
        if it["job"] not in jobs:
            jobs[it["job"]] = []
            order.append(it["job"])
        jobs[it["job"]].append(it)
    first = {}
    for n, it in enumerate(items):
        if "пробный" not in it.get("status", ""):
            first.setdefault(it["job"], n)
    order.sort(key=lambda j: first.get(j, len(items)))

    spent = sum(it.get("cost_usd", 0) for it in items)
    price_rows = "".join(
        f"<tr><td><b>{esc(m['name'])}</b><br><small>{esc(m['id'])}</small></td>"
        f"<td>{' · '.join(f'{k}: ${v}' for k, v in m['per_image'].items())}</td>"
        f"<td>{' · '.join(f'{k}: ${round(v / 2, 4)}' for k, v in m['per_image'].items())}</td></tr>"
        for m in models["models"].values())

    blocks = []
    for job in order:
        its = jobs[job]
        last = next(i for i in reversed(its) if not replaced(i))
        cards = []
        for it in its:
            src = pathlib.Path(it["file"]).relative_to("art/generated").as_posix()
            if it.get("cutout"):
                c = it["cutout"]
                pic = (f'<div class="alpha"><a href="{esc(src)}" target="_blank"><img src="{esc(src)}" alt="" loading="lazy"></a>'
                       f'<a href="{esc(src)}" target="_blank"><img src="{esc(src)}" alt="" loading="lazy"></a></div>')
                verdict = (f'<span class="ok">альфа настоящая: углы прозрачные, фон исходника ровный на {round(c.get("raw_border_key_share", 0) * 100)} %</span>'
                           if c["ok"] else f'<span class="bad">альфа не прошла: {esc(c.get("why", ""))}</span>')
            else:
                pic = f'<a class="pic" href="{esc(src)}" target="_blank"><img src="{esc(src)}" alt="" loading="lazy"></a>'
                verdict = ""
            test = " test" if replaced(it) else ""
            cards.append(
                f'<div class="card{test}">{pic}<div class="cap"><b>{esc(it["model_name"])}</b>'
                f'<span>{it["px"][0]}×{it["px"][1]} · {esc(it["params"]["aspectRatio"])} · {esc(it["params"]["imageSize"])} · '
                f'${it["cost_usd"]} · {it.get("seconds", "?")} с</span>{verdict}'
                f'<small>{esc(it.get("status", ""))} · {esc(it["date"][:16].replace("T", " "))}</small></div></div>')
        refs = ", ".join(pathlib.Path(r).name for r in last.get("refs", []))
        blocks.append(
            f'<section class="job"><h2>{esc(last["title"])}</h2>'
            f'<div class="meta">{esc(last["category"])} · по данным: {esc(last.get("source", ""))}<br>референсы стиля: {esc(refs)}</div>'
            f'<div class="row">{"".join(cards)}</div>'
            f'<details><summary>Промт, как он ушёл в модель</summary><pre>{esc(last["prompt"])}</pre></details></section>')

    page = f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Галерея генерации</title><style>{CSS}</style></head>
<body><main>
<h1>Энериум · сгенерированный арт</h1>
<p class="lead">Всё здесь — черновики до одобрения автора. Картинки собраны из <code>art/generated/manifest.json</code> скриптом <code>tools/art-gen/gallery.py</code>. Прозрачные картинки стоят на тёмном и светлом фоне: нарисованная шахматка была бы видна на обоих. Потрачено по счётчикам токенов: <b>${spent:.2f}</b> за {len(items)} картинок.</p>
<table><tr><th>Модель</th><th>Цена за картинку, обычный режим</th><th>Пакетный режим (Batch API)</th></tr>{price_rows}</table>
<p class="lead">Цены проверены {esc(models["checked"])}. {esc(models["note"])}</p>
{"".join(blocks)}
</main></body></html>
"""
    (OUT / "gallery.html").write_text(page, encoding="utf-8")
    print(f"art/generated/gallery.html: {len(order)} заданий, {len(items)} картинок, ${spent:.2f}")


if __name__ == "__main__":
    main()
