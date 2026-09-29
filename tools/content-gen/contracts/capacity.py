# -*- coding: utf-8 -*-
"""Контракты: дневная ёмкость занятий игрока по циклам — вход калькулятора контрактов (черновик).

Сколько обычный (3 ч в день) и увлечённый (8 ч) игрок делает за средний день цикла: этажи, рядовые, элиты, закрытия
биомов, золото, дух, души, базовые ресурсы; атаки, победы и очки Эхо. Из этих чисел калькулятор контрактов
(tools/content-gen/contracts/build.js) собирает объём заданий по редкости, время на них и награды.

Берёт всё из калькуляторов экономики через importlib и их не меняет:
- economy.py и sets.py — средний день циклов II и III, все отряды (таблица С1 черновика сет-бонусов);
- echo.py — неделя Эхо по циклам II–VI (таблица Э8): атаки, победы, очки, души.
Циклы IV–VI у биомов — по образцу цикла III, как в echo.py: отряд той же силы к врагам своего цикла,
забегов одновременно — номер цикла (ADR-0014; ADR-0031, п. 3), золото и дух × номер цикла (ADR-0014), души — × номер биома.

    python tools/content-gen/contracts/capacity.py           # записать capacity.json рядом
    python tools/content-gen/contracts/capacity.py --check   # только сверить, что capacity.json свежий

Числа — демонстрация. Все целые: счётчики дня — в сотых (× 100), как в sets.py.
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

CYCLES = [2, 3, 4, 5, 6]          # контракты открывает 10-й уровень — начало цикла II (§16, §18)
TEMPLATE = 3                      # циклы IV–VI — по образцу цикла III, как в echo.py (калькулятор экономики ведёт дни циклов II и III)
PROFILES = {'o': 'обычный', 'e': 'увлечённый'}
# счётчики биомов, которые растут только числом забегов одновременно
COUNTS = ('rf', 'el', 'boss', 'kills', 'floors', 'runs', 'base')
# счётчики, которые растут ещё и ставкой цикла (ADR-0014: всё × номер цикла)
CURRENCY = ('gold', 'spirit')

# ======================= РАСЧЁТ =======================


def slots(c):
    """Забегов одновременно: номер цикла (ADR-0014; ADR-0031, п. 3) — economy.slots, recipes.js. «Право владыки» не считаем."""
    return E.slots(c)


def biome_days(hours):
    """Средний день циклов II и III по калькулятору сет-бонусов: счётчики в сотых, базовые ресурсы — тоже в сотых."""
    days = S.cycle_days(hours)
    out = {}
    for c in (2, 3):
        a = S.average(days, c)
        a['base'] = S.base_of(a)
        out[c] = a
    return out


def biome_counters(avg, c):
    """Цикл c: циклы II и III — как есть; IV–VI — по образцу III."""
    if c <= TEMPLATE:
        return dict(avg[c])
    a3, k_num, k_den = avg[TEMPLATE], slots(c), slots(TEMPLATE)
    out = {}
    for k in COUNTS:
        out[k] = a3[k] * k_num // k_den
    for k in CURRENCY:
        out[k] = a3[k] * k_num * c // (k_den * TEMPLATE)
    out['clean'] = a3['clean'] * k_num // k_den
    out['souls'] = a3['souls'] * EC.soul_scale(c) // EC.soul_scale(TEMPLATE)
    return out


def echo_counters(prof, c):
    """Эхо цикла c: среднее по неделям цикла — атак и побед в день, очков и душ в неделю (× 100)."""
    res = EC.week_results(prof, c)
    n = len(res)
    tot = {k: sum(t[k] for _, _, t in res) for k in ('att', 'kills', 'pts', 'souls')}
    # итоги echo.py — × 1000; в день — делим ещё на 7 дней недели; в сотых — × 100
    return {
        'echoAtk': tot['att'] * 100 // (1000 * n * EC.WEEK),
        'echoKill': tot['kills'] * 100 // (1000 * n * EC.WEEK),
        'echoPtsWeek': tot['pts'] * 100 // (1000 * n),
        'echoSoulsDay': tot['souls'] * 100 // (1000 * n * EC.WEEK),
        'echoTop': [top for top, _, _ in res],
    }


def build():
    data = {
        'meta': {
            'builder': 'tools/content-gen/contracts/capacity.py',
            'sources': ['tools/content-gen/economy/economy.py', 'tools/content-gen/economy/sets.py', 'tools/content-gen/economy/echo.py'],
            'x': 100,
            'note': 'средний день цикла, все отряды; счётчики — в сотых; echoPtsWeek — очки Эхо за неделю; циклы IV–VI у биомов — по образцу III',
        },
        'hours': {k: dict(E.PROFILES)[v] for k, v in PROFILES.items()},
        'slots': {str(c): slots(c) for c in CYCLES},
        'cycleDays': {'2': S.CYCLE_LEN[2], '3': S.CYCLE_LEN[3]},
        'cycles': {},
    }
    avg = {k: biome_days(data['hours'][k]) for k in PROFILES}
    for c in CYCLES:
        row = {}
        for k, prof in PROFILES.items():
            b = biome_counters(avg[k], c)
            b.update(echo_counters(prof, c))
            row[k] = {x: int(v) if not isinstance(v, list) else v for x, v in sorted(b.items())}
        data['cycles'][str(c)] = row
    return data


def render(data):
    return json.dumps(data, ensure_ascii=False, indent=1) + '\n'


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    text = render(build())
    if '--check' in sys.argv:
        ok = OUT.exists() and OUT.read_text(encoding='utf-8') == text
        print('Свежий: capacity.json совпадает с калькуляторами экономики.' if ok else 'Устарел: capacity.json — пересобрать: python tools/content-gen/contracts/capacity.py')
        sys.exit(0 if ok else 1)
    OUT.write_text(text, encoding='utf-8', newline='\n')
    d = json.loads(text)
    print(f"Записано: {OUT.relative_to(E.ROOT)} — циклы {', '.join(d['cycles'])}, профили {', '.join(PROFILES.values())}.")
