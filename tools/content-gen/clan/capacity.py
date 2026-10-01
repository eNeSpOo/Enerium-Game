# -*- coding: utf-8 -*-
"""Клан: вход калькулятора клана (tools/content-gen/clan/build.js) из калькуляторов экономики — черновик.

Что берёт через importlib, калькуляторы не меняет:
- echo.py — сила главного отряда по дням циклов II–VI в единицах уровня героя цикла I (12 + уровень; cycle_days), у обычного (3 ч)
  и увлечённого (8 ч) игрока: цикл II — калькулятор экономики, III–VI — калькулятор подъёма (cycle/climb-days.json), у каждого профиля
  свой календарь: сроки автора (ADR-0043);
- sets.py — длина циклов II–VI у обычного (CYCLE_LEN).
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
    """Дней в цикле у обычного: sets.py (CYCLE_LEN) — цикл II калькулятора экономики, III–VI — калькулятора подъёма."""
    return S.CYCLE_LEN[c]


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
            'note': 'power — сила главного отряда на каждый день цикла в единицах уровня героя цикла I (12 + уровень): цикл II — калькулятор '
                    'экономики, III–VI — калькулятор подъёма, свой календарь профиля; norm — средняя сила отряда обычного игрока за цикл: '
                    'копия цели кланового босса в цикле атакующего (ADR-0042); cycleDays — длина цикла у обычного, cycleDaysBy — у профиля',
        },
        'hours': {k: dict(E.PROFILES)[v] for k, v in PROFILES.items()},
        'lvlDiv': EC.LVL_DIV,
        'cycleDays': {str(c): cycle_len(c) for c in CYCLES},
        'cycleDaysBy': {k: {str(c): len(EC.cycle_days(prof, c)) for c in CYCLES} for k, prof in PROFILES.items()},
        'power': {k: {str(c): power(prof, c) for c in CYCLES} for k, prof in PROFILES.items()},
        'norm': {str(c): norm(c) for c in CYCLES},
    }
    for c in CYCLES:
        if len(data['power']['o'][str(c)]) != data['cycleDays'][str(c)]:
            raise SystemExit(f'Дней цикла {c} у обычного: {len(data["power"]["o"][str(c)])}, а длина цикла — {data["cycleDays"][str(c)]}')
        for k in PROFILES:
            if not data['power'][k][str(c)]:
                raise SystemExit(f'У профиля {k} нет дней цикла {c}')
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
