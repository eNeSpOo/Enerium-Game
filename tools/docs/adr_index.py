"""Указатель решений docs/decisions/README.md и колонка «Решения» в указателе GDD — собираются из шапок ADR.

Зачем: решений много, поздние меняют ранние. Агент, входя в задачу, должен за одну страницу увидеть, какие ADR действуют
целиком, а в каких часть пунктов уже отменена, — и не читать все подряд.

  python tools/docs/adr_index.py          пересобрать оба указателя
  python tools/docs/adr_index.py --check  указатели свежие? (в полном прогоне tools/run-checks.js)

Что собирается:
  docs/decisions/README.md — целиком: таблица решений (сила, сборка, кто кого заменил и уточнил), раздел «Что уже
    не действует» — строки замены из статусов ADR — и раздел «Что в решениях ждёт слова автора» — строки статусов
    со словами «вопрос автору»;
  docs/gdd/README.md — только колонка «Решения» таблицы разделов между метками «@разделы»: какие ADR называют раздел
    в таблице решений того же файла (её колонка «Разделы» — ручная) и какие ADR названы в тексте самого раздела.
    Раздел GDD сослался на новый ADR — указатель устарел: пересобрать.

Как записана шапка ADR — tools/docs/adr.py. Правило проекта (CLAUDE.md): меняешь правило — впиши в шапку нового ADR, что он
заменяет или уточняет, и поправь статус прежнего. Обе стороны сверяет tools/docs/check_docs.py."""
import io
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import adr  # noqa: E402

ROOT = adr.ROOT
OUT = adr.DIR / 'README.md'
GDD = ROOT / 'docs' / 'gdd' / 'README.md'
MARK_A, MARK_Z = '<!-- @разделы', '<!-- /разделы -->'
FORCE_NAME = {'действует целиком': 'целиком', 'действует частично': 'частично', 'предложение': 'предложение'}
ASK = 'вопрос автору'     # строка под статусом с этими словами идёт в раздел «Что в решениях ждёт слова автора»


def cell(s):
    return s.replace('|', '/').strip()


def nums(xs):
    return ', '.join(xs) or '—'


def build_index(adrs):
    cnt = {f: sum(1 for a in adrs if a['force'] == f) for f in adr.FORCES}
    wait = [a['n'] for a in adrs if a['build'] == 'ждёт сборки']
    going = [a['n'] for a in adrs if a['build'] == 'сборка идёт']
    out = [
        '# Указатель решений',
        '',
        'Собирается скриптом `python tools/docs/adr_index.py` из шапок ADR — руками не править. Свежесть указателя и честность шапок проверяет полный прогон `node tools/run-checks.js`: `tools/docs/adr_index.py --check` и `tools/docs/check_docs.py`.',
        '',
        '**Как читать:**',
        '- Правило по теме ищи в разделе GDD: действующее правило живёт там. Что читать по системе игры — `docs/MAP.md`; какой раздел о чём и какие решения его правили — `docs/gdd/README.md`.',
        '- В ADR идёшь за словами автора и за причиной. Сначала смотри колонку «Действует»: «частично» значит, что часть пунктов отменена или заменена, — они перечислены ниже, в разделе «Что уже не действует». В спорном месте действует поздний текст; слово автора главнее решений исполнителя и координатора.',
        '- Колонка «Сборка»: «ждёт сборки» — решение принято, но данные, экраны и числа игры ещё прежние; «правило работы» — решение о том, как работаем, а не об игре.',
        '- Нашёл два действующих текста об одном — не выбирай сам: назови противоречие в отчёте. Известные расхождения — внизу, в разделе «Что в решениях ждёт слова автора».',
        '- Новый ADR — шапка по образцу в `tools/docs/adr.py`. В том же изменении: строка в статусе прежнего решения, раздел GDD под новое правило, строка в `docs/gdd/README.md`, затем `python tools/docs/adr_index.py`.',
        '',
        f'**Сводка.** Решений — {len(adrs)}: действуют целиком — {cnt["действует целиком"]}, частично — {cnt["действует частично"]}, заменены целиком — {cnt["заменён"]}, предложений — {cnt["предложение"]}. '
        f'Ждут сборки: {nums(wait)}. Сборка идёт: {nums(going)}.',
        '',
        '| № | Решение | Дата | Действует | Сборка | Заменяет | Уточняет | Изменён позже | Уточнён позже |',
        '|---|---|---|---|---|---|---|---|---|',
    ]
    for a in adrs:
        force = FORCE_NAME.get(a['force']) or (f'заменён {a["by"]}' if a['force'] == 'заменён' else '—')
        out.append(f'| [{a["n"]}]({a["file"]}) | {cell(a["title"])} | {a["date"] or "—"} | {force} | {a["build"] or "—"} | '
                   f'{nums(a["repl"])} | {nums(a["ref"])} | {nums(a["repl_by"])} | {nums(a["ref_by"])} |')
    out += ['', '## Что уже не действует', '',
            'Пункты, которые отменили или заменили поздние решения, — строки из статусов ADR. Остальное в этих решениях действует; чем уточнено — в шапке самого ADR.']
    for a in adrs:
        if a['force'] == 'заменён':
            out += ['', f'**ADR-{a["n"]} — {a["title"]}.** Заменён целиком ADR-{a["by"]}. Действующее правило: {a["pointer"] or "—"}']
        elif a['repl_lines']:
            out += ['', f'**ADR-{a["n"]} — {a["title"]}**'] + [f'- {s.rstrip(";.")}' for s in a['repl_lines']]
    ask = [(a['n'], s) for a in adrs for s in a['changes'] if ASK in s]
    if ask:
        out += ['', '## Что в решениях ждёт слова автора', '',
                'Открытые вопросы и известные расхождения между решениями — строки из статусов ADR со словами «вопрос автору». Сам не выбирай: вопросы стоят в `docs/STATE.md`, «От автора ждём».', '']
        out += [f'- **ADR-{n}:** {s.rstrip(";.")}' for n, s in ask]
    return '\n'.join(out) + '\n'


def sections_of(s):
    """«4, 5.1, 24–27, 00» → номера разделов верхнего уровня."""
    res = set()
    for tok in re.split(r'[,;]', s):
        tok = tok.strip()
        m = re.match(r'^(\d+)(?:\.\d+)?(?:\s*[–-]\s*(\d+)(?:\.\d+)?)?$', tok)
        if not m:
            continue
        a, b = int(m.group(1)), int(m.group(2) or m.group(1))
        res.update(range(a, b + 1))
    return res


def cited():
    """Какие ADR названы в тексте разделов GDD: {номер раздела: {номера ADR}}."""
    res = {}
    for p in sorted(GDD.parent.glob('[0-9][0-9]-*.md')):
        res[int(p.name[:2])] = set(adr.NUM.findall(adr.read(p)))
    return res


def build_gdd(text, cites):
    """Колонка «Решения» таблицы разделов: ADR, что называют раздел в таблице решений, и ADR, названные в самом разделе."""
    lines = text.replace('\r\n', '\n').split('\n')
    by_sec = {s: set(v) for s, v in cites.items()}
    for ln in lines:
        m = re.match(r'^\|\s*\[(\d{4})\]\(\.\./decisions/ADR-\d{4}[^)]*\)\s*\|([^|]*)\|', ln)
        if m:
            for s in sections_of(m.group(2)):
                by_sec.setdefault(s, set()).add(m.group(1))
    out, inside = [], False
    for ln in lines:
        if ln.startswith(MARK_A):
            inside = True
        elif ln.startswith(MARK_Z):
            inside = False
        elif inside:
            m = re.match(r'^\|\s*(\d+)\s*\|(.*)\|[^|]*\|\s*$', ln)
            if m:
                ln = f'| {m.group(1)} |{m.group(2)}| {nums(sorted(by_sec.get(int(m.group(1)), [])))} |'
        out.append(ln)
    return '\n'.join(out)


def main():
    adrs, _ = adr.load()
    bad = [f'{a["file"]}: {b}' for a in adrs for b in a['bad']]
    if bad:
        sys.exit('Шапки ADR не разобрать:\n  ' + '\n  '.join(bad))
    index = build_index(adrs)
    gdd_old = adr.read(GDD)
    gdd = build_gdd(gdd_old, cited())
    if '--check' in sys.argv:
        stale = [n for n, old, new in (('docs/decisions/README.md', adr.read(OUT) if OUT.exists() else '', index),
                                       ('docs/gdd/README.md, колонка «Решения»', gdd_old, gdd)) if old != new]
        if stale:
            sys.exit('Указатель устарел: ' + '; '.join(stale) + '. Пересобрать: python tools/docs/adr_index.py')
        print(f'Проверка пройдена: указатели решений и разделов свежие, ADR — {len(adrs)}.')
        return
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(index)
    if gdd != gdd_old:
        io.open(GDD, 'w', encoding='utf-8', newline='\n').write(gdd)
    print(f'{OUT.relative_to(ROOT).as_posix()}: ADR — {len(adrs)}; docs/gdd/README.md: колонка «Решения» — {"обновлена" if gdd != gdd_old else "без изменений"}')


if __name__ == '__main__':
    main()
