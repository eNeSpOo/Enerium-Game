# -*- coding: utf-8 -*-
"""Клан: вход калькулятора клана (tools/content-gen/clan/build.js) из калькуляторов экономики — черновик.

Что берёт через importlib, калькуляторы не меняет:
- echo.py — сила главного отряда по дням циклов II–VI: 12 + уровень на начало дня (cycle_days), у обычного (3 ч) и увлечённого (8 ч)
  игрока. Циклы IV–VI — по образцу цикла III, как в самом echo.py: отряд в той же силе к врагам своего цикла (× кривая §3.3);
- sets.py — длина циклов II и III (CYCLE_LEN). Циклы IV–VI — длиной цикла III: так их считает echo.py (TEMPLATE).
Сила отряда нужна кланову боссу: круг 1 ставится по отряду обычного игрока на первый день цикла II, неделя эталонных кланов —
по силе их отрядов в неделях цикла. Очки контрактов в резервуар калькулятор клана берёт из design/ui/contracts.js (EN_CONTRACTS.econ).
Норма цикла (ADR-0042, «Клан и разные циклы»): norm — средняя сила главного отряда обычного игрока за цикл, по всем дням цикла.
Клановый босс ставит цель в цикле атакующего: копия круга k для цикла c сильнее копии цикла II во столько раз, во сколько норма цикла c
больше нормы цикла II. Так игрок цикла V бьёт свою копию так же, как игрок цикла II — свою, и урон засчитывается долей здоровья цели.

    python tools/content-gen/clan/capacity.py           # записать capacity.json рядом
    python tools/content-gen/clan/capacity.py --check   # только сверить, что capacity.json свежий

Числа — демонстрация. Все целые.
"""
import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location('echo', HERE.parent / 'economy' / 'echo.py')
EC = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(EC)
S, E = EC.S, EC.E
OUT = HERE / 'capacity.json'

# ======================= ДАННЫЕ =======================

CYCLES = [2, 3, 4, 5, 6]          # кланы открывает 10-й уровень Странника — начало цикла II (§16, §24)
PROFILES = {'o': 'обычный', 'e': 'увлечённый'}

# ======================= РАСЧЁТ =======================


def cycle_len(c):
    """Дней в цикле: II и III — sets.py; IV–VI — как III, по образцу echo.py."""
    return S.CYCLE_LEN[min(c, EC.TEMPLATE)]


def power(prof, c):
    """Сила главного отряда по дням цикла c: 12 + уровень на начало дня (echo.cycle_days)."""
    return [int(p) for _, p in EC.cycle_days(prof, c)]


def norm(c):
    """Норма цикла c для кланового босса: средняя сила отряда обычного игрока за все дни цикла, вниз до целого (ADR-0042)."""
    days = power('обычный', c)
    return sum(days) // len(days)


def build():
    data = {
        'meta': {
            'builder': 'tools/content-gen/clan/capacity.py',
            'sources': ['tools/content-gen/economy/echo.py', 'tools/content-gen/economy/sets.py', 'tools/content-gen/economy/economy.py'],
            'note': 'power — 12 + уровень главного отряда на начало каждого дня цикла; циклы IV–VI — по образцу III, как в echo.py; '
                    'norm — средняя сила отряда обычного игрока за цикл: копия цели кланового босса в цикле атакующего (ADR-0042)',
        },
        'hours': {k: dict(E.PROFILES)[v] for k, v in PROFILES.items()},
        'lvlDiv': EC.LVL_DIV,
        'cycleDays': {str(c): cycle_len(c) for c in CYCLES},
        'power': {k: {str(c): power(prof, c) for c in CYCLES} for k, prof in PROFILES.items()},
        'norm': {str(c): norm(c) for c in CYCLES},
    }
    for k in PROFILES:
        for c in CYCLES:
            if len(data['power'][k][str(c)]) != data['cycleDays'][str(c)]:
                raise SystemExit(f'Дней цикла {c} у профиля {k}: {len(data["power"][k][str(c)])}, а длина цикла — {data["cycleDays"][str(c)]}')
    return data


def render(data):
    return json.dumps(data, ensure_ascii=False, indent=1) + '\n'


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    text = render(build())
    if '--check' in sys.argv:
        ok = OUT.exists() and OUT.read_text(encoding='utf-8') == text
        print('Свежий: capacity.json совпадает с калькуляторами экономики.' if ok else 'Устарел: capacity.json — пересобрать: python tools/content-gen/clan/capacity.py')
        sys.exit(0 if ok else 1)
    OUT.write_text(text, encoding='utf-8', newline='\n')
    d = json.loads(text)
    print(f"Записано: {OUT.relative_to(E.ROOT)} — циклы {', '.join(d['cycleDays'])}, профили {', '.join(PROFILES.values())}.")
