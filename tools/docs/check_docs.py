"""Проверка документов: шапки ADR, указатель GDD, ссылки и карта проекта.

Зачем: правила менялись много раз, и старые тексты начинали спорить с новыми (слово автора 06.10.2026, ADR-0053). Проверка
не даёт этому расползтись снова: новое решение нельзя записать, не поправив прежнее, а карта и указатели не могут звать
в файлы, которых нет.

  python tools/docs/check_docs.py          законы (то же с --check; в полном прогоне tools/run-checks.js)
  python tools/docs/check_docs.py --mut    проверка мутацией: каждую поломку должен поймать свой закон

Законы:
  Д1  у каждого ADR есть «Статус» и «Дата»; статус начинается с силы и сборки (tools/docs/adr.py), дата — ГГГГ-ММ-ДД,
      номер в заголовке совпадает с именем файла;
  Д2  если ADR B в поле «Заменяет» называет A, то в статусе A есть строка «… заменён (отменён, снят) ADR-B»;
  Д3  обратная сторона: строка замены в статусе A называет только те ADR, что называют A в «Заменяет»; поздний ADR
      из строки «… уточнил ADR-B» называет A в «Уточняет» или «Заменяет»;
  Д4  сила честная: «действует частично» — есть строка замены, «действует целиком» и «предложение» — нет ни одной,
      «заменён ADR-B» — под шапкой есть строка «Действующее правило», и только у него;
  Д5  каждый ADR есть в таблице решений docs/gdd/README.md — строкой со ссылкой на свой файл;
  Д6  относительные ссылки в CLAUDE.md, docs/STATE.md, docs/MAP.md, docs/gdd/ и docs/decisions/ ведут в существующие файлы;
  Д7  файлы и папки, названные в docs/MAP.md, существуют; то же — пути от корня репозитория в CLAUDE.md, docs/STATE.md
      и двух указателях (docs/gdd/README.md, docs/decisions/README.md). В карте путь пишется только от корня;
  Д8  ADR в колонке решений карты существуют; решение, которое ждёт сборки или собирается, помечено в карте
      «(ждёт сборки)» или «(сборка идёт)», собранное — без пометки.

Тела ADR — история: пути в них не сверяются, только ссылки."""
import copy
import re
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import adr  # noqa: E402

ROOT = adr.ROOT
TOP = ('docs', 'design', 'tools', 'art', 'source-data')            # с этих папок начинается путь от корня
ROOT_FILES = ('CLAUDE.md', 'AGENTS.md', 'README.md')
MAP = 'docs/MAP.md'
GDD_INDEX = 'docs/gdd/README.md'
ADR_INDEX = 'docs/decisions/README.md'
PATH_DOCS = ('CLAUDE.md', 'docs/STATE.md', MAP, GDD_INDEX, ADR_INDEX)   # здесь сверяются и названные пути, не только ссылки
PLACEHOLDER = ('ГГГГ', 'NN', '…', '<', '>', '{', '}')                  # путь-образец, а не путь
LINK = re.compile(r'\[[^\]\n]*\]\(([^)\s]+)\)')
CODE = re.compile(r'`([^`\n]+)`')
ROOTED = re.compile(r'^(?:' + '|'.join(TOP) + r')(?:/.*)?$')
PATHLIKE = re.compile(r'/|\.(?:md|js|py|json|html|css|xlsx|csv|txt|png|jpg|webp|docx|pdf)$')
LAWS = {
    'Д1': 'шапка ADR: статус, дата, номер',
    'Д2': '«Заменяет» отражено в статусе прежнего решения',
    'Д3': 'статус прежнего решения отражён в полях нового',
    'Д4': 'сила статуса честная',
    'Д5': 'каждый ADR есть в указателе GDD',
    'Д6': 'относительные ссылки ведут в существующие файлы',
    'Д7': 'названные файлы и папки существуют',
    'Д8': 'карта называет существующие решения и честно помечает несобранные',
}


class World:
    """Документы в памяти и вид на диск. Мутации правят копию: диск не трогается."""

    def __init__(self):
        self.docs = {}
        names = ['CLAUDE.md', 'docs/STATE.md', MAP]
        names += sorted(p.relative_to(ROOT).as_posix() for d in ('docs/gdd', 'docs/decisions') for p in (ROOT / d).glob('*.md'))
        for n in names:
            if (ROOT / n).is_file():
                self.docs[n] = adr.read(ROOT / n)
        self.gone = set()          # пути, которых «нет» в этой мутации

    def exists(self, rel):
        rel = rel.rstrip('/')
        if rel in self.gone or any(rel.startswith(g + '/') for g in self.gone):
            return False
        return rel in self.docs or (ROOT / rel).exists()

    def glob(self, pattern):
        return [p for p in ROOT.glob(pattern) if self.exists(p.relative_to(ROOT).as_posix())]

    def adrs(self):
        return adr.load({n.split('/')[-1]: t for n, t in self.docs.items() if re.match(r'docs/decisions/ADR-\d{4}', n)})


def strip_code(text):
    """Без блоков кода и строчного кода: в них скобки — не ссылки."""
    return CODE.sub(' ', re.sub(r'```.*?```', ' ', text, flags=re.S))


def later(b, a):
    return int(b) > int(a)


def check(w):
    """Все законы на мире w. Возвращает {закон: [нарушения]}."""
    err = {k: [] for k in LAWS}
    adrs, by = w.adrs()

    for a in adrs:                                                           # Д1
        f = a['file']
        err['Д1'] += [f'{f}: {b}' for b in a['bad']]
        if a['Статус'] is None:
            err['Д1'].append(f'{f}: нет поля «Статус»')
        elif not a['force'] or not a['build']:
            err['Д1'].append(f'{f}: статус не начинается с силы и сборки — «{" | ".join(adr.FORCES)}; {" | ".join(adr.BUILDS)}»')
        if a['Дата'] is None:
            err['Д1'].append(f'{f}: нет поля «Дата»')
        elif not adr.DATE.match(a['date']):
            err['Д1'].append(f'{f}: дата «{a["date"]}» — не ГГГГ-ММ-ДД')

    for b in adrs:                                                           # Д2
        for n in b['repl']:
            a = by.get(n)
            if a is None:
                err['Д2'].append(f'{b["file"]}: «Заменяет» называет ADR-{n}, которого нет')
            elif not (a['force'] == 'заменён' and a['by'] == b['n']) and not any(f'ADR-{b["n"]}' in s for s in a['repl_lines']):
                err['Д2'].append(f'{a["file"]}: в статусе нет строки «… заменён (отменён) ADR-{b["n"]}», а ADR-{b["n"]} называет его в «Заменяет»')

    for a in adrs:                                                           # Д3
        if a['force'] == 'заменён' and a['n'] not in (by.get(a['by']) or {'repl': []})['repl']:
            err['Д3'].append(f'{a["file"]}: статус «заменён ADR-{a["by"]}», но ADR-{a["by"]} не называет его в «Заменяет»')
        for s in a['repl_lines']:
            named = [n for n in adr.NUM.findall(s) if n != a['n']]
            if not named:
                continue
            for n in named:
                if n not in by:
                    err['Д3'].append(f'{a["file"]}: строка замены называет ADR-{n}, которого нет')
                elif a['n'] not in by[n]['repl']:
                    err['Д3'].append(f'{a["file"]}: строка замены называет ADR-{n}, но у ADR-{n} в «Заменяет» нет ADR-{a["n"]}: «{s[:70]}…»')
        for s in a['ref_lines']:
            for n in adr.NUM.findall(s):
                if n in by and later(n, a['n']) and a['n'] not in by[n]['ref'] + by[n]['repl']:
                    err['Д3'].append(f'{a["file"]}: строка «уточнил ADR-{n}», но у ADR-{n} в «Уточняет» нет ADR-{a["n"]}: «{s[:70]}…»')

    for a in adrs:                                                           # Д4
        f, real = a['file'], [s for s in a['repl_lines'] if any(n != a['n'] for n in adr.NUM.findall(s))]
        if a['force'] == 'действует частично' and not real:
            err['Д4'].append(f'{f}: «действует частично», но под статусом нет строки замены с номером ADR')
        if a['force'] in ('действует целиком', 'предложение') and real:
            err['Д4'].append(f'{f}: «{a["force"]}», но под статусом есть строка замены: «{real[0][:70]}…»')
        if a['force'] == 'заменён' and not a['pointer']:
            err['Д4'].append(f'{f}: заменён целиком, но под шапкой нет строки «{adr.POINTER} …»')
        if a['force'] != 'заменён' and a['pointer']:
            err['Д4'].append(f'{f}: строка «Действующее правило» стоит только у решения, заменённого целиком')

    gdd = w.docs.get(GDD_INDEX, '')                                          # Д5
    rows = set(re.findall(r'^\|\s*\[\d{4}\]\(\.\./decisions/([^)]+)\)\s*\|', gdd, flags=re.M))
    for a in adrs:
        if a['file'] not in rows:
            err['Д5'].append(f'{GDD_INDEX}: нет строки решения со ссылкой на {a["file"]}')

    for name, text in w.docs.items():                                        # Д6
        base = name.rsplit('/', 1)[0] if '/' in name else ''
        for m in LINK.finditer(strip_code(text)):
            t = m.group(1)
            if re.match(r'^(?:[a-z][a-z0-9+.-]*:|#)', t, flags=re.I):
                continue
            t = urllib.parse.unquote(t.split('#')[0].split('?')[0])
            parts = [] if t.startswith('/') else (base.split('/') if base else [])
            for seg in t.strip('/').split('/'):
                if seg == '..':
                    parts = parts[:-1]
                elif seg and seg != '.':
                    parts.append(seg)
            rel = '/'.join(parts)
            if not rel or not w.exists(rel):
                err['Д6'].append(f'{name}: ссылка «{m.group(1)}» ведёт в никуда')

    for name in PATH_DOCS:                                                   # Д7
        text = w.docs.get(name)
        if text is None:
            if name == MAP:
                err['Д7'].append(f'{MAP}: карты проекта нет')
            continue
        seen = set()
        for m in CODE.finditer(re.sub(r'```.*?```', ' ', text, flags=re.S)):
            for piece in m.group(1).split():
                piece = piece.strip('.,;:()«»"\'')
                if piece in seen or any(x in piece for x in PLACEHOLDER):
                    continue
                seen.add(piece)
                rooted = bool(ROOTED.match(piece)) or piece in ROOT_FILES
                if not rooted:
                    if name == MAP and PATHLIKE.search(piece) and not re.match(r'^[A-Za-zА-Яа-яЁё_.]+\([^)]*\)$', piece):
                        err['Д7'].append(f'{MAP}: «{piece}» — путь в карте пишется от корня репозитория')
                    continue
                ok = bool(w.glob(piece)) if any(c in piece for c in '*?[') else w.exists(piece)
                if not ok:
                    err['Д7'].append(f'{name}: «{piece}» — такого файла или папки нет')

    for system, cell in map_rows(w.docs.get(MAP, '')):                       # Д8
        for m in re.finditer(r'\b(\d{4})\b(?:\s*\(([^)]*)\))?', cell):
            n, note = m.group(1), (m.group(2) or '').strip()
            if n not in by:
                err['Д8'].append(f'{MAP}, {system}: назван ADR-{n}, которого нет')
                continue
            want = by[n]['build'] if by[n]['build'] in ('ждёт сборки', 'сборка идёт') else ''
            if note != want:
                err['Д8'].append(f'{MAP}, {system}: у {n} пометка «{note or "нет"}», а в шапке ADR-{n} — «{by[n]["build"]}»: должно быть «{n}{" (" + want + ")" if want else ""}»')
    return err


# ───────────────────────────── проверка мутацией ─────────────────────────────

def sub1(text, old, new):
    assert old in text, f'мутации не к чему приложиться: {old[:40]}'
    return text.replace(old, new, 1)


def adr_path(w, pred):
    """Имя документа первого ADR, для которого pred(шапка) истинно."""
    adrs, _ = w.adrs()
    a = next(a for a in adrs if pred(a))
    return 'docs/decisions/' + a['file'], a


def m_no_status(w):
    p, _ = adr_path(w, lambda a: True)
    w.docs[p] = re.sub(r'^- \*\*Статус:\*\*.*\n(?:  .*\n)*', '', w.docs[p], count=1, flags=re.M)


def m_no_date(w):
    p, _ = adr_path(w, lambda a: True)
    w.docs[p] = re.sub(r'^- \*\*Дата:\*\*.*\n', '', w.docs[p], count=1, flags=re.M)


def m_bad_date(w):
    p, a = adr_path(w, lambda a: True)
    w.docs[p] = sub1(w.docs[p], f'- **Дата:** {a["date"]}', '- **Дата:** 26.09.2026')


def m_old_status(w):
    p, a = adr_path(w, lambda a: a['force'] == 'действует целиком')
    w.docs[p] = sub1(w.docs[p], '- **Статус:** действует целиком; ' + a['build'], '- **Статус:** принято')


def m_no_build(w):
    p, a = adr_path(w, lambda a: a['force'] == 'действует целиком')
    w.docs[p] = sub1(w.docs[p], '- **Статус:** действует целиком; ' + a['build'], '- **Статус:** действует целиком')


def m_title_num(w):
    p, a = adr_path(w, lambda a: True)
    w.docs[p] = sub1(w.docs[p], f'# ADR-{a["n"]}', '# ADR-9999')


def m_new_replaces_silently(w):
    """Новое решение называет прежнее в «Заменяет», а статус прежнего молчит."""
    adrs, _ = w.adrs()
    b = adrs[-1]
    a = next(a for a in adrs if a['n'] not in b['repl'] and a['n'] != b['n'] and not any(f'ADR-{b["n"]}' in s for s in a['repl_lines']))
    p = 'docs/decisions/' + b['file']
    w.docs[p] = sub1(w.docs[p], f'- **Дата:** {b["date"]}', f'- **Дата:** {b["date"]}\n- **Заменяет:** ADR-{a["n"]}, п. 1 — проба.')


def m_replaces_missing(w):
    adrs, _ = w.adrs()
    b = adrs[-1]
    p = 'docs/decisions/' + b['file']
    w.docs[p] = sub1(w.docs[p], f'- **Дата:** {b["date"]}', f'- **Дата:** {b["date"]}\n- **Заменяет:** ADR-9998 — проба.')


def m_status_line_dropped(w):
    """У прежнего решения стёрта строка замены, а новое по-прежнему называет его в «Заменяет»."""
    p, a = adr_path(w, lambda a: a['force'] == 'действует частично' and len(a['repl_lines']) == 1)
    w.docs[p] = sub1(w.docs[p], '  - ' + a['repl_lines'][0] + '\n', '')
    w.docs[p] = sub1(w.docs[p], '- **Статус:** действует частично', '- **Статус:** действует целиком')


def m_status_names_stranger(w):
    """Строка замены называет решение, которое о замене ничего не говорит."""
    adrs, by = w.adrs()
    a = next(a for a in adrs if a['repl_lines'])
    b = next(b for b in reversed(adrs) if a['n'] not in b['repl'] and b['n'] != a['n'])
    p = 'docs/decisions/' + a['file']
    w.docs[p] = sub1(w.docs[p], '  - ' + a['repl_lines'][0], f'  - п. 99 заменён ADR-{b["n"]}: проба;\n  - ' + a['repl_lines'][0])


def m_replaces_field_dropped(w):
    """У нового решения стёрто поле «Заменяет», а статус прежнего по-прежнему говорит «заменён»."""
    adrs, _ = w.adrs()
    b = next(b for b in reversed(adrs) if b['repl'] and b['Заменяет'] and len(b['Заменяет']) == 1)
    p = 'docs/decisions/' + b['file']
    w.docs[p] = re.sub(r'^- \*\*Заменяет:\*\*.*\n', '', w.docs[p], count=1, flags=re.M)


def m_field_twice(w):
    p, a = adr_path(w, lambda a: True)
    w.docs[p] = sub1(w.docs[p], f'- **Дата:** {a["date"]}', f'- **Дата:** {a["date"]}\n- **Дата:** {a["date"]}')


def m_refined_by_stranger(w):
    adrs, by = w.adrs()
    a = adrs[0]
    b = next(b for b in reversed(adrs) if a['n'] not in b['ref'] + b['repl'] and b['n'] != a['n'])
    p = 'docs/decisions/' + a['file']
    w.docs[p] = re.sub(r'^(- \*\*Статус:\*\*.*\n)', lambda m: m.group(1) + f'  - порядок уточнил ADR-{b["n"]}: проба;\n', w.docs[p], count=1, flags=re.M)


def m_whole_but_replaced(w):
    p, _ = adr_path(w, lambda a: a['force'] == 'действует частично')
    w.docs[p] = sub1(w.docs[p], '- **Статус:** действует частично', '- **Статус:** действует целиком')


def m_partial_but_whole(w):
    p, _ = adr_path(w, lambda a: a['force'] == 'действует целиком' and not a['repl_lines'])
    w.docs[p] = sub1(w.docs[p], '- **Статус:** действует целиком', '- **Статус:** действует частично')


def m_replaced_no_pointer(w):
    """Решение заменено целиком, а где действующее правило — не сказано."""
    adrs, _ = w.adrs()
    b = next(b for b in adrs if b['repl'])
    a = next(a for a in adrs if a['n'] == b['repl'][0])
    p = 'docs/decisions/' + a['file']
    w.docs[p] = re.sub(r'^- \*\*Статус:\*\* (?:действует целиком|действует частично|предложение)', f'- **Статус:** заменён ADR-{b["n"]}', w.docs[p], count=1, flags=re.M)


def m_pointer_on_alive(w):
    p, _ = adr_path(w, lambda a: a['force'] != 'заменён')
    w.docs[p] = sub1(w.docs[p], '\n## ', f'\n{adr.POINTER} §5 GDD.\n\n## ')


def m_gdd_row_gone(w):
    adrs, _ = w.adrs()
    a = adrs[len(adrs) // 2]
    w.docs[GDD_INDEX] = re.sub(r'^\|\s*\[' + a['n'] + r'\]\(.*\n', '', w.docs[GDD_INDEX], count=1, flags=re.M)
    assert a['file'] not in w.docs[GDD_INDEX].split('<!-- @разделы')[0]


def m_new_adr_no_row(w):
    w.docs['docs/decisions/ADR-9997-проба.md'] = '# ADR-9997 — Проба\n\n- **Статус:** действует целиком; собрано. Проба.\n- **Дата:** 2026-10-06\n\n## Решение\n\nПроба.\n'


def sections(w):
    """Документы разделов GDD по порядку."""
    return [n for n in sorted(w.docs) if re.match(r'docs/gdd/\d\d-', n)]


def m_gdd_link_broken(w):
    name = sections(w)[len(sections(w)) // 2].split('/')[-1]
    w.docs[GDD_INDEX] = sub1(w.docs[GDD_INDEX], f']({name})', f'](нет-{name})')


def m_adr_index_link_broken(w):
    old = w.docs[ADR_INDEX]
    w.docs[ADR_INDEX] = re.sub(r'\]\((ADR-\d{4})[^)]*\)', r'](\1-нет-такого.md)', old, count=1)
    assert w.docs[ADR_INDEX] != old, 'в указателе решений нет ссылок'


def m_map_link_broken(w):
    w.docs[MAP] += '\n[раздел](gdd/99-нет.md)\n'


def m_section_file_gone(w):
    """Раздел GDD удалён, а указатель на него ссылается."""
    name = sections(w)[-3]
    w.gone.add(name)
    w.docs.pop(name)


def m_adr_file_gone(w):
    """Файл решения удалён, а указатели на него ссылаются."""
    adrs, _ = w.adrs()
    a = next(a for a in adrs if not a['repl_by'] and not a['ref_by'] and not a['repl'] and not a['ref'])   # ни с кем не связан: сработает только закон ссылок
    name = 'docs/decisions/' + a['file']
    w.docs.pop(name)
    w.gone.add(name)


def m_section_link_broken(w):
    w.docs[sections(w)[5]] += '\nСм. [решение](../decisions/ADR-0000-нет.md).\n'


def m_map_names_missing(w):
    w.docs[MAP] += '\nДанные — `design/ui/нет-такого.js`.\n'


def m_map_file_gone(w):
    """Папка сборщика, названная в карте, удалена с диска."""
    m = re.search(r'`(tools/content-gen/[a-z]+)/`', w.docs[MAP])
    assert m, 'в карте нет папок сборщиков'
    w.gone.add(m.group(1))


def m_map_relative_path(w):
    w.docs[MAP] += '\nЭкран — `screens/echo.js`.\n'


def m_map_glob_empty(w):
    w.docs[MAP] += '\nПроверки — `tools/content-gen/screens/check_нет*.js`.\n'


def m_map_gone(w):
    w.docs.pop(MAP)
    w.gone.add(MAP)


def m_claude_names_missing(w):
    m = re.search(r'`(docs/[A-Za-z]+)\.md`', w.docs['CLAUDE.md'])
    assert m, 'CLAUDE.md не называет ни одного документа из docs/'
    w.docs['CLAUDE.md'] = sub1(w.docs['CLAUDE.md'], f'`{m.group(1)}.md`', f'`{m.group(1)}-нет.md`')


def map_rows(text):
    """Строки таблиц карты: (система, колонка ADR)."""
    for ln in text.split('\n'):
        if ln.startswith('| **'):
            cells = [c.strip() for c in ln.strip().strip('|').split('|')]
            yield cells[0].replace('*', '').split(' — ')[0], cells[-1]


def m_map_adr_missing(w):
    old = w.docs[MAP]
    w.docs[MAP] = re.sub(r'^(\| \*\*.*?) \|$', r'\1, 9996 |', old, count=1, flags=re.M)
    assert w.docs[MAP] != old


def m_map_build_note_missing(w):
    """Решение из карты перестало быть собранным, а карта об этом молчит."""
    adrs, by = w.adrs()
    n = next(n for _, cell in map_rows(w.docs[MAP]) for n in re.findall(r'\b\d{4}\b', cell) if by[n]['build'] == 'собрано')
    p = 'docs/decisions/' + by[n]['file']
    w.docs[p] = re.sub(r'^(- \*\*Статус:\*\* [^;\n]+; )собрано', r'\1ждёт сборки', w.docs[p], count=1, flags=re.M)


def m_map_build_note_false(w):
    """Карта говорит «ждёт сборки» о собранном решении."""
    adrs, by = w.adrs()
    n = next(n for _, cell in map_rows(w.docs[MAP]) for n in re.findall(r'\b\d{4}\b', cell) if by[n]['build'] == 'собрано')
    old = w.docs[MAP]
    w.docs[MAP] = re.sub(r'^(\| \*\*.*\|[^|]*\b' + n + r')\b(?! \()', r'\1 (ждёт сборки)', old, count=1, flags=re.M)
    assert w.docs[MAP] != old


def m_state_names_missing(w):
    w.docs['docs/STATE.md'] += '\nСм. `docs/content/нет-такого.md`.\n'


MUTATIONS = [
    ('у ADR стёрт статус', 'Д1', m_no_status),
    ('у ADR стёрта дата', 'Д1', m_no_date),
    ('дата не ГГГГ-ММ-ДД', 'Д1', m_bad_date),
    ('статус по-старому: «принято»', 'Д1', m_old_status),
    ('в статусе нет сборки', 'Д1', m_no_build),
    ('номер в заголовке не тот, что в имени файла', 'Д1', m_title_num),
    ('поле шапки записано дважды', 'Д1', m_field_twice),
    ('новый ADR заменяет прежний, а статус прежнего молчит', 'Д2', m_new_replaces_silently),
    ('«Заменяет» называет ADR, которого нет', 'Д2', m_replaces_missing),
    ('у прежнего стёрта строка замены и возвращено «действует целиком»', 'Д2', m_status_line_dropped),
    ('строка замены называет решение, которое о замене молчит', 'Д3', m_status_names_stranger),
    ('у нового решения стёрто «Заменяет», а статус прежнего говорит «заменён»', 'Д3', m_replaces_field_dropped),
    ('строка «уточнил» называет решение, которое об этом молчит', 'Д3', m_refined_by_stranger),
    ('«действует целиком» при строках замены', 'Д4', m_whole_but_replaced),
    ('«действует частично» без строки замены', 'Д4', m_partial_but_whole),
    ('«заменён» без строки «Действующее правило»', 'Д4', m_replaced_no_pointer),
    ('«Действующее правило» у действующего решения', 'Д4', m_pointer_on_alive),
    ('из указателя GDD стёрта строка решения', 'Д5', m_gdd_row_gone),
    ('новый ADR без строки в указателе GDD', 'Д5', m_new_adr_no_row),
    ('битая ссылка на раздел в указателе GDD', 'Д6', m_gdd_link_broken),
    ('битая ссылка в указателе решений', 'Д6', m_adr_index_link_broken),
    ('битая ссылка в карте', 'Д6', m_map_link_broken),
    ('раздел GDD удалён, ссылка осталась', 'Д6', m_section_file_gone),
    ('файл решения удалён, ссылки остались', 'Д6', m_adr_file_gone),
    ('битая ссылка в разделе GDD', 'Д6', m_section_link_broken),
    ('карта называет файл, которого нет', 'Д7', m_map_names_missing),
    ('папка, названная в карте, удалена', 'Д7', m_map_file_gone),
    ('в карте путь не от корня', 'Д7', m_map_relative_path),
    ('в карте шаблон, под который ничего не подходит', 'Д7', m_map_glob_empty),
    ('карты нет', 'Д7', m_map_gone),
    ('CLAUDE.md называет файл, которого нет', 'Д7', m_claude_names_missing),
    ('STATE.md называет файл, которого нет', 'Д7', m_state_names_missing),
    ('карта называет ADR, которого нет', 'Д8', m_map_adr_missing),
    ('решение из карты ждёт сборки, а карта молчит', 'Д8', m_map_build_note_missing),
    ('карта пишет «ждёт сборки» о собранном решении', 'Д8', m_map_build_note_false),
]


def total(err):
    return sum(len(v) for v in err.values())


def main():
    w = World()
    err = check(w)
    if total(err):
        for k, v in err.items():
            if v:
                print(f'{k} — {LAWS[k]}: нарушений {len(v)}')
                print('\n'.join('  ' + s for s in v[:40]) + (f'\n  … и ещё {len(v) - 40}' if len(v) > 40 else ''))
        sys.exit(f'Документы: нарушений {total(err)}.')
    if '--mut' not in sys.argv:
        n = sum(1 for d in w.docs if d.startswith('docs/decisions/ADR-'))
        print(f'Проверка пройдена: законов {len(LAWS)}, документов {len(w.docs)}, ADR — {n}.')
        return
    missed = []
    for name, law, fn in MUTATIONS:
        m = copy.deepcopy(w)
        try:
            fn(m)
        except (AssertionError, StopIteration) as e:
            missed.append(f'{name}: мутацию не к чему приложить ({e or "нет подходящего ADR"})')
            continue
        got = check(m)
        if not got[law]:
            hit = [k for k, v in got.items() if v]
            missed.append(f'{name}: закон {law} не сработал' + (f', сработали {", ".join(hit)}' if hit else ', не сработал ни один'))
    if missed:
        print('\n'.join('  ' + s for s in missed))
        sys.exit(f'Мутации: не пойманы {len(missed)} из {len(MUTATIONS)}.')
    print(f'Проверка мутацией пройдена: поломок {len(MUTATIONS)}, каждую поймал свой закон; законов {len(LAWS)}.')


if __name__ == '__main__':
    main()
