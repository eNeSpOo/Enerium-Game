# -*- coding: utf-8 -*-
"""Контракты: дневная ёмкость занятий игрока по циклам — вход калькулятора контрактов (черновик).

Сколько обычный (3 ч в день) и увлечённый (8 ч) игрок делает за средний день цикла: этажи, рядовые, элиты, закрытия
биомов, золото, дух, души, базовые ресурсы; атаки, победы и очки Эхо. Из этих чисел калькулятор контрактов
(tools/content-gen/contracts/build.js) собирает объём заданий по редкости, время на них и награды.

Берёт всё из калькуляторов экономики через importlib и их не меняет:
- economy.py и sets.py — средний день каждого цикла II–VI, все отряды: цикл II — калькулятор экономики, циклы III–VI — записи дня
  калькулятора подъёма (cycle/climb-days.json; сроки автора, ADR-0043), у каждого профиля — свой календарь;
- echo.py — неделя Эхо по циклам II–VI (таблица Э8): атаки, победы, очки, души, КрафБоссы.
Прежнее «циклы IV–VI по образцу цикла III» снято: у годовых циклов средний день — свой.

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
PROFILES = {'o': 'обычный', 'e': 'увлечённый'}

# ======================= РАСЧЁТ =======================


def slots(c):
    """Забегов одновременно: номер цикла (ADR-0014; ADR-0031, п. 3) — economy.slots, recipes.js. «Право владыки» не считаем."""
    return E.slots(c)


def biome_days(hours):
    """Средний день каждого цикла II–VI по калькулятору сет-бонусов (sets.cycle_days): счётчики в сотых, базовые ресурсы — тоже в сотых."""
    days = S.cycle_days(hours)
    out = {}
    for c in CYCLES:
        a = S.average(days, c)
        a['base'] = S.base_of(a)
        out[c] = a
    return out


def biome_counters(avg, c):
    """Цикл c — средний день своего цикла, все отряды."""
    return dict(avg[c])


def echo_counters(prof, c):
    """Эхо цикла c: среднее по неделям цикла — атак и побед в день, очков и душ в неделю (× 100); побед над Многоликим в день — × 10^6:
    он вершина недели (ADR-0039), и не всякий отряд его берёт — сундуки призванных и достижения считают по ним, а не по шансу призыва."""
    res = EC.week_results(prof, c)
    n = len(res)
    tot = {k: sum(t[k] for _, _, t in res) for k in ('att', 'rounds', 'kills', 'pts', 'souls', 'many', 'craft', 'craftKills')}
    # итоги echo.py — × 1000; в день — делим ещё на 7 дней недели; в сотых — × 100
    return {
        'echoAtk': tot['att'] * 100 // (1000 * n * EC.WEEK),
        'echoRoundsDay': tot['rounds'] * 100 // (1000 * n * EC.WEEK),   # раундов атак Эхо в день (лестница и КрафБоссы) — Событие, × 100
        'echoKill': tot['kills'] * 100 // (1000 * n * EC.WEEK),
        'echoPtsWeek': tot['pts'] * 100 // (1000 * n),
        'echoSoulsDay': tot['souls'] * 100 // (1000 * n * EC.WEEK),
        'echoManyX1e6': tot['many'] // (n * EC.WEEK),   # итог echo.py по Многоликому — штук × 10^6 за неделю
        'echoCraftWeek': tot['craft'] * 100 // (1000 * n),   # очки КрафБоссов за неделю (ADR-0043), × 100
        'echoCraftKillX1e6': tot['craftKills'] * 1000 // (n * EC.WEEK),   # побед над КрафБоссами в день × 10^6
        'echoTop': [top for top, _, _ in res],
        'echoWeekPts': [t['pts'] // 1000 for _, _, t in res],          # очки Эхо по неделям цикла (с КрафБоссами) — год цикла IV в окне цикла
        'echoWeekCraftX1000': [t['craftKills'] for _, _, t in res],    # побед над КрафБоссами по неделям × 1000
    }


def build():
    data = {
        'meta': {
            'builder': 'tools/content-gen/contracts/capacity.py',
            'sources': ['tools/content-gen/economy/economy.py', 'tools/content-gen/economy/sets.py', 'tools/content-gen/economy/echo.py'],
            'x': 100,
            'note': 'средний день цикла, все отряды; счётчики — в сотых; echoPtsWeek — очки Эхо за неделю (с КрафБоссами); echoCraftWeek — из них КрафБоссы; '
                    'echoManyX1e6 — побед над Многоликим в день × 10^6; cycleDays — длина цикла у обычного (сроки автора, ADR-0043), cycleDaysBy — у каждого профиля',
        },
        'hours': {k: dict(E.PROFILES)[v] for k, v in PROFILES.items()},
        'slots': {str(c): slots(c) for c in CYCLES},
        'cycleDays': {str(c): S.CYCLE_LEN[c] for c in CYCLES},
        'cycleDaysBy': {k: {str(c): sum(1 for _, cc, _ in S.cycle_days(dict(E.PROFILES)[p]) if cc == c) for c in CYCLES} for k, p in PROFILES.items()},
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
