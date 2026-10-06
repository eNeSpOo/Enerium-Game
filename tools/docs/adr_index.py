"""Указатель решений docs/decisions/README.md — собирается из шапок ADR.

Зачем: решений много, поздние меняют ранние. Агент, входя в задачу, должен за одну страницу увидеть, какие ADR ещё
действуют целиком, а какие изменены более поздними, — и не читать все подряд.

  python tools/docs/adr_index.py          пересобрать указатель
  python tools/docs/adr_index.py --check  указатель свежий? (в полном прогоне tools/run-checks.js)

Из шапки ADR берётся: заголовок, статус, дата, поля «Заменяет» и «Уточняет». Обратные ссылки — кто позже заменил или
уточнил это решение — считаются по этим полям у остальных ADR. Правило проекта (CLAUDE.md): меняешь правило — впиши в шапку
нового ADR, что он заменяет или уточняет, и поправь статус прежнего."""
import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'docs' / 'decisions'
OUT = DIR / 'README.md'
HEAD_LINES = 14      # шапка ADR: заголовок и поля до первого раздела
STATUS_MAX = 150     # статус в таблице — коротко; целиком — в самом ADR

FIELD = re.compile(r'^- \*\*(Статус|Дата|Заменяет|Уточняет):\*\*\s*(.*)$')
NUM = re.compile(r'ADR-(\d{4})')


def read(p):
    return io.open(p, encoding='utf-8').read()


def parse(p):
    lines = read(p).splitlines()
    m = re.match(r'^# ADR-(\d{4})\s*[—-]\s*(.*)$', lines[0]) if lines else None
    if not m:
        sys.exit(f'{p.name}: первая строка — не «# ADR-NNNN — название»')
    a = {'n': m.group(1), 'title': m.group(2).strip(), 'file': p.name, 'Статус': '', 'Дата': '', 'Заменяет': '', 'Уточняет': ''}
    for ln in lines[1:HEAD_LINES]:
        if ln.startswith('## '):
            break
        f = FIELD.match(ln)
        if f:
            a[f.group(1)] = f.group(2).strip()
    a['repl'] = sorted(set(NUM.findall(a['Заменяет'])) - {a['n']})
    a['ref'] = sorted(set(NUM.findall(a['Уточняет'])) - {a['n']} - set(a['repl']))
    return a


def cut(s, n):
    s = s.replace('|', '/').strip()
    return s if len(s) <= n else s[:n - 1].rstrip() + '…'


def links(nums, by):
    return ', '.join(f'[{x}]({by[x]["file"]})' if x in by else x for x in nums) or '—'


def build():
    adrs = [parse(p) for p in sorted(DIR.glob('ADR-*.md'))]
    by = {a['n']: a for a in adrs}
    for a in adrs:
        a['repl_by'] = sorted(b['n'] for b in adrs if a['n'] in b['repl'])
        a['ref_by'] = sorted(b['n'] for b in adrs if a['n'] in b['ref'])
    out = [
        '# Указатель решений',
        '',
        'Собирается скриптом `python tools/docs/adr_index.py` из шапок ADR — руками не править. Свежесть проверяет полный прогон `node tools/run-checks.js`.',
        '',
        '**Как читать:**',
        '- Нужны правила по теме — сначала раздел GDD: действующее правило вносится в текст раздела. Какие ADR правили раздел — `docs/gdd/README.md`.',
        '- В ADR идёшь за словами автора и за обоснованием. Прежде чем верить ADR, смотри колонки «Заменён» и «Уточнён позже»: если там есть номера, в спорном месте действует поздний текст.',
        '- Нашёл два действующих текста об одном — не выбирай сам: назови противоречие в отчёте.',
        '',
        '| № | Решение | Дата | Статус | Заменяет | Уточняет | Заменён | Уточнён позже |',
        '|---|---|---|---|---|---|---|---|',
    ]
    for a in adrs:
        out.append(f'| [{a["n"]}]({a["file"]}) | {cut(a["title"], 400)} | {a["Дата"] or "—"} | {cut(a["Статус"], STATUS_MAX) or "—"} | '
                   f'{links(a["repl"], by)} | {links(a["ref"], by)} | {links(a["repl_by"], by)} | {links(a["ref_by"], by)} |')
    return '\n'.join(out) + '\n'


def main():
    text = build()
    if '--check' in sys.argv:
        old = read(OUT).replace('\r\n', '\n') if OUT.exists() else ''
        if old != text:
            sys.exit('Указатель решений устарел: python tools/docs/adr_index.py')
        print(f'Проверка пройдена: указатель решений свежий, ADR — {text.count(chr(10)) - 11}.')
        return
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
    print(f'{OUT.relative_to(ROOT)}: ADR — {text.count(chr(10)) - 11}')


if __name__ == '__main__':
    main()
