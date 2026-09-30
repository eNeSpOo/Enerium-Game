"""Задания иконок ресурсов сеткой — из данных Этриона: design/ui/recipes.js (собирает tools/content-gen/recipes/).

Слово автора: «Иконки по ресурсам начинай генерировать только тогда, когда придёт с отчётом Этрион». У каждого предмета — поле art
(одна английская фраза облика) и sheet (лист Этриона). Не рисуются предметы с готовой картинкой (img) и герои (fam hero): у них портреты.
Листы Этриона переупакованы внутри цикла, палитры не смешиваются: предметы цикла идут в порядке его листов — группы рядом — и
раскладываются по листам 5×4 (5:4, 2K — клетка около 430 px, дешевле на иконку, чем 6×4 4K); остаток — малым листом 2×2, 3×3, 4×3 или
4×4. Одна клетка цикла I — «ресурс скрыт»: закрытый предмет вместо замка.
Стиль и запреты — из одобренного образца способностей (jobs/spell-icons-fire.json), рамка категории — своя. Фраза облика идёт в промт
почти как есть: письмо, руны и цифры переписаны в «неразборчивые штрихи» (правило art/style/style.md: текста на картинке нет),
звезда доблести — сплошная, спойлеры цикла VI — нейтральными словами.

  python tools/art-gen/res_jobs.py            # пересобрать jobs/res-icons-<цикл>.json
  python tools/art-gen/gen.py jobs/res-icons-1.json --dry-run
"""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
TOOL = pathlib.Path(__file__).resolve().parent
JOBS = TOOL / "jobs"
FIRE = json.loads((JOBS / "spell-icons-fire.json").read_text(encoding="utf-8"))

ROMAN = {0: "P", 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI"}
FULL = (5, 4, "5:4", "2K")                        # основной лист
SMALL = [(4, 2, 2, "1:1", "1K"), (9, 3, 3, "1:1", "1K"), (12, 4, 3, "4:3", "2K"), (16, 4, 4, "1:1", "2K"), (20, 5, 4, "5:4", "2K")]
HIDDEN = ["hidden", "res-hidden", "a hidden, not yet known item, in neutral cold grey instead of the palette of this sheet: a small bundle "
          "wrapped in dark grey cloth and tied with cord, its shape hidden, pale grey mist curling around it"]

GRID_RULES = ("The icons stand in a precise grid of equal square cells; the number of columns and rows and the item in every cell are listed below, "
              "row by row from the top, each row from left to right. Between the cells run narrow straight gutters of flat, uniform pure magenta (#FF00FF), "
              "and the same magenta gutter runs around the outside of the whole grid. All gutters have the same width, all cells have the same size, "
              "and nothing crosses a gutter.")
FRAME = ("Format: a sheet of square item icons for a mobile RPG, painted together as one consistent set. " + GRID_RULES + " Every cell is its own "
         "complete square painting filled from edge to edge — the game lays its own frame over the edges of the cell, so everything important stays "
         "in the middle. Every cell shows exactly one item — a raw material, a trophy, a crafted piece or a relic — lying or standing still on dark "
         "near-black stone with faint cracks and a darker vignette toward the edges of the cell: one clear central object, large, filling about three "
         "quarters of the cell, in a clear three-quarter view from slightly above, with a bold recognisable silhouette that reads at 32 px. When a cell names "
         "several things, the first one is the main object — large and centred — and the others are small details beside it. Light rises from below "
         "in the colour of this sheet's palette, a soft glow from cracks in the stone — never a spotlight; crisp rim light on the edges of the object; "
         "a few dust motes in the light. Painted exactly like the ability icons of this game: loose, confident painterly brush strokes, soft painted "
         "edges and deep shadows — no black outlines, no flat sticker look, no scenery, no hands or people unless the cell names them. Writing is "
         "never drawn: wherever a cell mentions script, notes, pages, maps, tallies, tags or marks, they are faint unreadable smudges and straight "
         "ruled lines; clock faces and dials are plain, with simple notches and no numerals. All icons share the same brushwork, lighting, level of "
         "detail and palette, so they read as one set, and each differs clearly from its neighbours.")
PALETTE = {
    0: ("These are the common materials found everywhere below the city: each item keeps its own natural colours — clay, wood, iron, bone, cloth, "
        "glass, ash — and glows only where its cell says it glows. The light from below is a soft warm neutral gold."),
    1: ("The palette of this sheet: pale white-green crystal light (#DFF4E5), light pale wood, warm grey clay and pale moss. The light from below "
        "is a soft pale white-green glow — never saturated teal."),
    2: "The palette of this sheet: warm amber-orange light (#EB9D40), bronze and grey-brown library stone. The light from below is a warm amber glow.",
    3: ("The palette of this sheet: scarlet light (#F0564A), red-hot iron, soot and pale arena sand. The light from below is the scarlet glow of "
        "embers."),
    4: "The palette of this sheet: blue light (#5A94F7), white stone and sea water. The light from below is a cool blue glow.",
    5: "The palette of this sheet: green light (#4FDC8B), old clock brass and dry grey silt. The light from below is a green glow.",
    6: "The palette of this sheet: violet light (#A986EE), black iron and cold frozen fire. The light from below is a cold violet glow.",
}
# письмо, руны и цифры — «неразборчивые штрихи»: правило «текста на картинке нет»; звезда доблести — сплошная; спойлеры цикла VI — нейтрально
FIX = [
    (r"\brune stone\b", "stone"), (r"\bround rune disc\b", "round stone disc"), (r"\brune cylinders?\b", "carved stone cylinders"),
    (r"\bnotched rune stone\b", "notched standing stone"),
    (r"a five-pointed star carved deep and glowing", "one solid, filled five-pointed star carved deep and glowing — a solid star, never an outline"),
    (r"covered in tiny fragments of runes", "covered in tiny fragments of carved grooves"),
    (r"with tiny glowing rune flecks", "with tiny glowing flecks"),
    (r"covered in dense spiralling runes", "wrapped in dense spiralling grooves"),
    (r"rune-etched plate", "groove-etched plate"), (r"a rubbing of runes on cloth", "a cloth rubbing of carved grooves"),
    (r"a deeply etched glowing rune", "a deeply etched glowing spiral groove"), (r"two glowing etched runes", "two glowing etched spiral grooves"),
    (r"with an amber rune at its centre", "with an amber stone at its centre"), (r"a cloth rubbing of dense runes", "a cloth rubbing of dense grooves"),
    (r"a glowing protective rune", "a glowing wax seal"), (r"with violet-glowing runes", "with violet-glowing seams"),
    (r"rows of strange glyphs and their meanings scratched beside them", "rows of faint scratches"),
    (r"(faded alien|copied|strange) glyphs", "faint scratches"), (r"an unknown maker glyph", "a small maker's mark"),
    (r"a carved sigil", "a carved round mark"), (r"pilgrim sigil", "pilgrim token"), (r"A glowing sigil mark", "A glowing round seal mark"),
    (r"dense faded script", "faded ruled lines"), (r"dense script", "dense ruled lines"), (r"fragments of carved script", "fragments of carved lines"),
    (r"A single intact line of carved script", "A single intact carved groove"), (r"a line of script", "a thin dark line"),
    (r"neat rows of script", "neat ruled lines"), (r"inked lines of text", "inked ruled lines"),
    (r"a long unreadable number", "a long row of dots"), (r"an embossed number", "an embossed ring"), (r"with a shelf number", "with a notch"),
    (r"with a carved name still legible", "with a carved line"), (r"a carved name tag", "a carved tag"), (r"a small carved stone tag with a name", "a small carved stone tag"),
    (r"with a name\b", ""), (r" inscribed with a vow,", ","), (r"across an engraved word", "across its fluted surface"),
    (r"densely written with columns of outcomes", "with columns of faint ruled lines"), (r"lesson text", "faint ruled lines"),
    (r"handwriting that changes on later pages", "faint ruled lines on every page"), (r"written in faded ink", "with faded ruled lines"),
    (r"with an hourglass emblem", "with a small hourglass shape woven in"), (r"with a symbol", "with a plain woven stripe"),
    (r"with an indistinct emblem", "with an indistinct faded patch"), (r"a faded water-shrine symbol", "a faded wave-shaped patch"),
    (r"mixed emblems of many peoples", "painted stripes of many colours"), (r"a woven peace emblem", "a woven border"),
    (r"engraved hour symbol", "engraved notch"), (r"with a date line", "with a thin line"),
    (r"god-shaped casting mould", "casting mould shaped like a tall standing figure"), (r"god-sized mould", "enormous mould"),
    (r"forming faint letters that glow red", "streaked with faint glowing red lines"),
]


def data():
    code = ("global.window = globalThis; require(process.argv[1]); const R = window.EN_RECIPES; "
            "process.stdout.write(JSON.stringify({ items: R.items.map(i => ({ id: i.id, n: i.n, cyc: i.cyc, fam: i.fam, tier: i.tier, img: i.img || '', "
            "sheet: i.sheet, art: i.art })), sheets: R.sheets }));")
    run = subprocess.run(["node", "-e", code, str(ROOT / "design/ui/recipes.js")], capture_output=True, text=True, encoding="utf-8")
    if run.returncode:
        sys.exit("recipes.js: " + run.stderr.strip()[:300])
    return json.loads(run.stdout)


def drawn(it):
    """Рисуется ли иконка: не готовая картинка и не герой."""
    return not it["img"] and it["fam"] != "hero"


def clean(art):
    """Фраза облика для промта: замены FIX без учёта регистра, первая буква — заглавная."""
    s = art
    for a, b in FIX:
        s = re.sub(a, b, s, flags=re.I)
    s = re.sub(r"\s+,", ",", re.sub(r"\s{2,}", " ", s)).strip()
    return s[:1].upper() + s[1:]


def rows_text(cells, cols):
    out = []
    for r in range(0, len(cells), cols):
        out.append(f"Row {r // cols + 1}: " + "; ".join(c[2].rstrip(".") for c in cells[r:r + cols]) + ".")
    return "\n\n".join(out)


def pack(cells):
    """Листы 5×4, остаток — малым листом по числу клеток."""
    out, i = [], 0
    while len(cells) - i >= 20:
        out.append((FULL, cells[i:i + 20])); i += 20
    rest = cells[i:]
    if rest:
        g = next(x for x in SMALL if len(rest) <= x[0])
        out.append((g[1:], rest))
    return out


NOTES = {
    0: ["res-P-1 нарисован дважды (30.09.2026): проба вышла с предметом на две трети клетки и конусом света; второй — по рамке с тремя четвертями, свет — из трещин камня"],
    1: ["Листы res-I-2…res-I-6 вышли с насыщенным мятным конусом света — как зелень цикла V, а палитра цикла I — «белый с прозеленью». "
        "Мята приглушена без новой генерации: python tools/art-gen/hue_fix.py \"art/generated/res-icons/res-I-*/cells.json\" (полоса 125–190°, "
        "насыщенность × 0,25, яркость × 0,92; клетки, где полосы больше 4 %) — 64 клетки получили <имя>.fix.webp"],
}


def build():
    D = data()
    I = {it["id"]: it for it in D["items"]}
    specs = {}
    for cyc in sorted({s["cyc"] for s in D["sheets"]}):
        cells = [[i, i, clean(I[i]["art"])] for s in D["sheets"] if s["cyc"] == cyc for i in s["items"] if drawn(I[i])]
        if cyc == 1:
            cells.append(HIDDEN)
        rom = ROMAN[cyc]
        jobs = []
        for k, ((cols, rows, aspect, size), part) in enumerate(pack(cells), 1):
            n = len(part)
            spare = cols * rows - n
            body = part + [[f"spare-{j}", f"spare-{j}", "an empty dark stone surface with a few dust motes"] for j in range(spare)]
            groups = sorted({I[c[0]]["sheet"] for c in part if c[0] in I})
            jobs.append({
                "id": f"res-{rom}-{k}", "category": "res-icons", "title": f"Ресурсы, цикл {rom if cyc else 'общий'} — лист {k}: {n} иконок сеткой {cols}×{rows}",
                "source": "design/ui/recipes.js (EN_RECIPES.items: поле art), листы Этриона " + ", ".join(groups),
                "aspect": aspect, "size": size, "grid": [cols, rows],
                "cells": [[c[0], c[1]] for c in body],
                "subject": PALETTE[cyc] + f"\n\nThe grid: exactly {cols} columns and {rows} rows, {cols * rows} icons.\n\n" + rows_text(body, cols),
            })
        specs[rom] = {
            "name": f"Иконки ресурсов сеткой — цикл {rom if cyc else 'общий пул'}. Слово автора: «Иконки по ресурсам начинай генерировать только тогда, когда придёт с отчётом Этрион». Собирает tools/art-gen/res_jobs.py из design/ui/recipes.js — руками не править",
            "plan": {
                "Язык иконки": "один предмет в покое на тёмном камне, три четверти сверху, узнаваемая форма читается на 32 px; вид предмета различает рамка интерфейса (CR_KIND и CR_FAM, screens/crafthall.js), редкость — свет в окне рамки",
                "Палитра": "цвет карста цикла, свет снизу — его же: " + PALETTE[cyc],
                "Листы": "листы Этриона (поле sheet) переупакованы внутри цикла по 20 клеток, остаток — малым листом; предметы с img и герои не рисуются",
            },
            "notes": ["cells — [id предмета EN_RECIPES.items, имя файла]; spare — пустая клетка малого листа, не выгружается; hidden — «ресурс скрыт»",
                      "Проба 30.09.2026 — res-P-1 и res-I-1 — нарисована с предметом на две трети клетки: в рамке вида окно — 72 % колодца, предмет выходил мелким на 32 px. С остальных листов предмет — на три четверти клетки",
                      "Фраза облика — поле art Этриона; письмо, руны и цифры переписаны в неразборчивые штрихи (FIX в res_jobs.py)",
                      "Слабые клетки — надписи, пентаграмма, «летающая тарелка», светлый фон — перерисованы листами res-fix-* (jobs/res-icons-fix.json): их клетка заменяет клетку этого листа"]
                     + NOTES.get(cyc, []),
            "models": FIRE["models"], "style": FIRE["style"], "negative": FIRE["negative"],
            "categories": {"res-icons": {"aspect": "5:4", "size": "2K", "refs": FIRE["categories"]["spell-icons"]["refs"], "frame": FRAME}},
            "jobs": jobs,
        }
    return D, specs


"""Переделка слабых клеток — лист res-fix-* в jobs/res-icons-fix.json: клетка листа переделки заменяет клетку большого листа (ui_icons.py).
Палитра — своя у каждой клетки, в скобках: лист смешивает циклы. Фраза облика переписана так, чтобы у модели не было слова-подписи:
бумагу не называем «заказом», «договором», «подорожной» — только тем, что видно (лист, печать, лента)."""
FIX_PAL = {
    0: "common material — its own natural colours, soft warm neutral light from below",
    1: "pale white-green light, almost white, pale wood, warm grey clay",
    2: "warm amber-orange light, bronze, grey-brown library stone",
    3: "scarlet light, red-hot iron, soot",
    4: "cool blue light, white stone, sea water",
    5: "green light, old clock brass, dry grey silt",
    6: "cold violet light, black iron",
}
FIX_WHY = ("проверка листов на доске 30.09.2026: надписи — модель подписала бумагу и жетоны английским словом из фразы облика (EDICT, ORDER, "
           "Contract, Promissory note, TRAVEL PASS, Lesson plans, Sermon leaflet, BRIGADE BADGE…); пентаграмма вместо сплошной звезды у руны доблести "
           "цикла III; «летающая тарелка» вместо парящего города; светлый фон песка и воды вместо тёмного камня; мелкий знак, похожий на букву")
FIX_CELLS = [
    ("mc_b4", "a heavy cast bronze plate with a smooth blank face and a raised rim, beside a small carved model of a mountain city, a small amber crown resting on top of the plate"),
    ("a_orderslip", "a folded sheet of old paper tied with a narrow guild ribbon and closed with a round bronze seal — the paper is blank"),
    ("a_rubbing", "a square of rough cloth with dense dark rubbed-in wavy lines from carved stone, tied with a knotted counting cord"),
    ("a_restored", "a grey stone slab riddled with small tunnels, the tunnels filled with smooth golden wax, a few fresh carved grooves across it"),
    ("a_c2goods", "a bundle of decorative bronze gears and rivets tied together with twine to a folded blank sheet of paper"),
    ("tr_fb8", "a round copper badge with a raised pickaxe in the middle and a plain smooth raised ring around the edge"),
    ("lu_cb8", "a brass whistle hanging on a cord from a small wooden board covered with chalk tally strokes, a worn leather glove beside it"),
    ("mt_b3", "a thin curling sheet of bronze foil with rows of tiny punched dots"),
    ("find_cb1b", "a small rectangular copper plaque tarnished green, with four rivet holes and a row of punched dots along its edge"),
    ("p_writ", "a rolled sheet of parchment tied with blue cord, a small glowing blue crystal pressed into its blue wax seal — the parchment is blank"),
    ("a_contract", "a thick roll of parchment bound with a blue sash, two blue wax seals and a small copper plate hanging from the sash"),
    ("a_insured", "a folded sheet of parchment with a blue wax seal and a tiny drawn sailing ship in its corner — no writing"),
    ("cr_tenet", "a flat grey stone with one long straight carved groove across it, worn smooth by water"),
    ("find_cb18b", "a thick water-stained book bound in leather, closed, a strap around it"),
    ("cr_ci4_bill", "a blank folded sheet of paper with an empty round space for a blue wax seal"),
    ("u9", "an old hand-drawn map on parchment: a winding path of dots that ends abruptly at a drawn arched gate"),
    ("rc_b9", "an old map on parchment with one fresh dark line of ink reaching a drawn arched gate, the map wrapped in a scrap of cloak cloth"),
    ("mc_b9", "a single bare boot print pressed into grey stone before a small carved stone arch of a gate, a tiny stone model of a round city on a floating rock beside it"),
    ("lu_cb14", "a folded parchment closed with a green wax seal, tied with two small brass mule bells and a tuft of grey mule hair"),
    ("cr_tollbill", "a folded parchment closed with a round green wax seal and a stamped ring mark — no writing"),
    ("call_fb14", "a folded parchment with a green wax seal, a cracked green crystal and two small brass mule bells resting on top"),
    ("call_fb14_aw", "a cracked wooden crate with a folded parchment and a tuft of grey mule hair on its lid, a pale haze of dust around it"),
    ("act_ci5", "a palm-sized carved stone model of a round city of white towers on a floating rock above a small puff of cloud, a black obelisk in its centre, small blue crystals set in the rock underneath — carved stone, not a machine, no lights"),
    ("a_c19notes", "a small slate board with chalk wavy lines and a shattered hourglass leaning against it"),
    ("call_fb19", "two leather gloves grown together at the fingers, lying on a blank sheet on a wooden desk, a small violet flower beside them"),
    ("tr_fb19a", "a closed notebook bound with cord, its pages edged with faint violet light"),
    ("find_cb7b", "a crumpled sheet of paper with one ink circle broken in one place, nothing else on it"),
    ("cr_slate", "a dark slate board with a few chalk strokes and a stub of chalk on its frame"),
    ("vr3", "a round disc of crimson stone with one solid, filled five-pointed star raised in relief in its centre — one flat solid star, no lines inside it, no outline, no circle around it"),
    ("lu_ci3", "two blunt training axes crossed on dark stone, tied together with a red ribbon, a little pale sand scattered under them"),
    ("ec_b6", "a heavy iron floor grate lying on dark stone with a small smoking clay pot beside it, a little sand in its gaps"),
    ("act_ci3", "a palm-sized carved stone model of a dark fortress with concentric walls around a small round arena, standing on dark stone"),
    ("mc_b7", "a small wooden platform on posts with a clapperless bronze bell hanging from a chain at its edge, water pouring down behind it into the dark"),
    ("call_fb5_aw", "a bronze bell half sunk in dark water, small flat stone tablets floating around it, pale rings of ripples"),
    ("a_trademark", "a bronze stamp with a wooden handle and a round amber inlay on its smooth base"),
    ("ec_b4", "worn leather animal collars and two hammer heads bundled together around a plain round brass token"),
    ("p_casting", "a clean cast bronze block with smooth faces and one small round punch mark"),
    ("cr_window", "a small square pane of old glass in a thin dark lead frame, one clear polished spot shining in it"),
    ("mt_b9", "a boot print fossilized in grey stone, a thin green glow in its hollow"),
    ("call_fb5", "a cracked bronze bell mended with bronze staples, standing in shallow dark water beside a stone bowl and a folded blank sealed sheet"),
]


def fix_spec(D):
    """Задание переделки: листы 5×4 по 20 клеток, палитра — у каждой клетки своя."""
    I = {it["id"]: it for it in D["items"]}
    head = ("This sheet gathers replacement icons from several sets. Every cell names its own palette in brackets, and each cell keeps strictly "
            "to its own palette — colours never spill from one cell to another; the light from below in each cell takes that cell's colour. "
            "Nothing is ever written on any object: every sheet of paper, parchment, slate, plaque, badge or tablet is blank or shows only faint "
            "wavy lines and smudges — never a word, never a letter, never a number, never a title.")
    cells = [[i, i, f"({FIX_PAL[I[i]['cyc']]}) {text}"] for i, text in FIX_CELLS]
    jobs = []
    for k, ((cols, rows, aspect, size), part) in enumerate(pack(cells), 1):
        spare = cols * rows - len(part)
        body = part + [[f"spare-{j}", f"spare-{j}", "an empty dark stone surface with a few dust motes"] for j in range(spare)]
        jobs.append({
            "id": f"res-fix-{k}", "category": "res-icons", "title": f"Переделка слабых клеток — лист {k}: {len(part)} иконок сеткой {cols}×{rows}",
            "source": FIX_WHY, "aspect": aspect, "size": size, "grid": [cols, rows],
            "cells": [[c[0], c[1]] for c in body],
            "subject": head + f"\n\nThe grid: exactly {cols} columns and {rows} rows, {cols * rows} icons.\n\n" + rows_text(body, cols),
        })
    return {
        "name": "Иконки ресурсов сеткой — переделка слабых клеток. Собирает tools/art-gen/res_jobs.py (FIX_CELLS) — руками не править",
        "plan": {"Правило": "клетка листа res-fix заменяет клетку большого листа (tools/art-gen/ui_icons.py); палитра — своя у каждой клетки"},
        "notes": [FIX_WHY],
        "models": FIRE["models"], "style": FIRE["style"], "negative": FIRE["negative"],
        "categories": {"res-icons": {"aspect": "5:4", "size": "2K", "refs": FIRE["categories"]["spell-icons"]["refs"], "frame": FRAME}},
        "jobs": jobs,
    }


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    D, specs = build()
    fx = fix_spec(D)
    (JOBS / "res-icons-fix.json").write_text(json.dumps(fx, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"res-icons-fix.json: {len(fx['jobs'])} листов, {len(FIX_CELLS)} клеток")
    total = 0
    for rom, spec in specs.items():
        p = JOBS / f"res-icons-{rom.lower()}.json"
        p.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        n = sum(1 for j in spec["jobs"] for c in j["cells"] if not c[0].startswith("spare"))
        total += n
        print(f"{p.name}: {len(spec['jobs'])} листов, {n} клеток — " + ", ".join(f"{j['id']} {j['grid'][0]}×{j['grid'][1]}" for j in spec["jobs"]))
    need = sum(1 for it in D["items"] if drawn(it)) + 1
    print(f"Всего клеток {total}, нужно {need}")
    if total != need:
        sys.exit("число клеток не сходится")


if __name__ == "__main__":
    main()
