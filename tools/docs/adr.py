"""Шапки ADR: разбор и правила записи. Общий код указателя (adr_index.py) и проверки документов (check_docs.py).

Шапка ADR — всё от заголовка до первого раздела «## »:

  # ADR-NNNN — Название

  - **Статус:** <сила>; <сборка>. Кто решил и когда.
    - п. N, «что именно», заменён ADR-MMMM: чем заменён;
    - что-то ещё уточнил ADR-KKKK: как читать теперь.
  - **Дата:** ГГГГ-ММ-ДД
  - **Заменяет:** ADR-AAAA, п. N — что именно; §N GDD — что именно.
  - **Уточняет:** ADR-BBBB, ADR-CCCC; §N GDD.

  > **Действующее правило:** раздел GDD или ADR — только у решения, заменённого целиком.

Сила — что с решением сейчас:
  действует целиком    ни один пункт позже не отменён и не заменён;
  действует частично   часть пунктов отменена или заменена — каждый такой пункт стоит строкой под статусом;
  заменён ADR-MMMM     решение заменено целиком, под шапкой — строка «Действующее правило»;
  предложение          автор ещё не сказал своего слова.
Сборка — где решение в данных и экранах:
  собрано, ждёт сборки, сборка идёт, правило работы (решение о том, как работаем, а не об игре).

Строки под статусом — то, что изменили поздние решения. Строка со словом «заменён», «отменён» или «снят» называет только
те ADR, что заменили пункт; строка со словом «уточнил» — те, что уточнили. По этим строкам и по полям «Заменяет» и «Уточняет»
проверка сверяет обе стороны: что написано у прежнего решения и что — у нового.

Новое решение B меняет пункт прежнего A — правки одного изменения:
  1. шапка B: «Заменяет: ADR-A, п. N — что именно» (или «Уточняет: ADR-A»);
  2. шапка A: сила «действует частично» и строка под статусом «п. N, «что именно», заменён ADR-B: чем»
     (или «… уточнил ADR-B: как читать теперь»);
  3. раздел GDD переписан под новое правило, в таблице решений docs/gdd/README.md — строка B;
  4. python tools/docs/adr_index.py, затем python tools/docs/check_docs.py."""
import io
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'docs' / 'decisions'

FIELDS = ('Статус', 'Дата', 'Заменяет', 'Уточняет')
FORCES = ('действует целиком', 'действует частично', 'заменён', 'предложение')
BUILDS = ('собрано', 'ждёт сборки', 'сборка идёт', 'правило работы')
POINTER = '> **Действующее правило:**'

TITLE = re.compile(r'^# ADR-(\d{4})\s*[—-]\s*(.+)$')
FIELD = re.compile(r'^- \*\*(' + '|'.join(FIELDS) + r'):\*\*\s*(.*)$')
NUM = re.compile(r'ADR-(\d{4})')
DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
HEAD = re.compile(r'^(действует целиком|действует частично|заменён ADR-(\d{4})|предложение)\s*;\s*(' + '|'.join(BUILDS) + r')(?=[\s.,:;—]|$)')
# слова замены и уточнения в строках под статусом
REPL_WORD = re.compile(r'(?:замен|отмен)(?:ён|ен|ена|ено|ены)\b|\bснят(?:а|о|ы)?\b', re.I)
REF_WORD = re.compile(r'\bуточн(?:ил|ила|или|ён|ена|ено|ены)\b', re.I)


def read(p):
    return io.open(p, encoding='utf-8').read().replace('\r\n', '\n')


def parse_text(name, text):
    """Шапка одного ADR. Ошибки записи не бросает — складывает в 'bad': их называет проверка документов."""
    lines = text.split('\n')
    a = {'file': name, 'n': (re.match(r'ADR-(\d{4})', name) or [None, ''])[1], 'title': '', 'bad': [], 'pointer': ''}
    for f in FIELDS:
        a[f] = None
    m = TITLE.match(lines[0]) if lines else None
    if not m:
        a['bad'].append('первая строка — не «# ADR-NNNN — название»')
    else:
        a['title'] = m.group(2).strip()
        if m.group(1) != a['n']:
            a['bad'].append(f'номер в заголовке — {m.group(1)}, в имени файла — {a["n"]}')
    cur = None
    for ln in lines[1:]:
        if ln.startswith('## '):
            break
        f = FIELD.match(ln)
        if f:
            cur = f.group(1)
            if a[cur] is not None:
                a['bad'].append(f'поле «{cur}» записано дважды')
            a[cur] = [f.group(2).strip()]
        elif ln.startswith(POINTER):
            cur = None
            a['pointer'] = ln[len(POINTER):].strip()
        elif cur and ln.startswith('  ') and ln.strip():
            a[cur].append(re.sub(r'^-\s+', '', ln.strip()))
        elif ln.strip():
            cur = None
    st = a['Статус'] or ['']
    a['status'] = st[0]                      # первая строка: сила, сборка, кто решил
    a['changes'] = st[1:]                    # строки под статусом: что изменили поздние решения
    h = HEAD.match(a['status'])
    a['by'] = (h.group(2) or '') if h else ''                 # кем заменён целиком
    a['force'] = ('заменён' if a['by'] else h.group(1)) if h else ''
    a['build'] = h.group(3) if h else ''
    a['date'] = (a['Дата'] or [''])[0]
    repl_txt = ' '.join(a['Заменяет'] or [])
    ref_txt = ' '.join(a['Уточняет'] or [])
    a['repl'] = sorted(set(NUM.findall(repl_txt)) - {a['n']})
    a['ref'] = sorted(set(NUM.findall(ref_txt)) - {a['n']} - set(a['repl']))
    a['repl_lines'] = [s for s in a['changes'] if REPL_WORD.search(s)]
    a['ref_lines'] = [s for s in a['changes'] if REF_WORD.search(s) and not REPL_WORD.search(s)]
    return a


def load(texts=None):
    """Все ADR по порядку номеров. texts — {имя файла: текст}: так проверка документов подсовывает поломки."""
    if texts is None:
        texts = {p.name: read(p) for p in sorted(DIR.glob('ADR-*.md'))}
    adrs = [parse_text(n, t) for n, t in sorted(texts.items())]
    by = {a['n']: a for a in adrs}
    for a in adrs:
        a['repl_by'] = sorted(b['n'] for b in adrs if a['n'] in b['repl'])
        a['ref_by'] = sorted(b['n'] for b in adrs if a['n'] in b['ref'])
    return adrs, by
