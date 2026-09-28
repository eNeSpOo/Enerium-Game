# -*- coding: utf-8 -*-
"""Темп биомов 2–4 — прогон ядра боя (черновик). Решение автора о темпе — ADR-0018: биом 1 — за час, биом 2 — ещё примерно
за три, цикл II — испытание на дни. Враги и колоды — design/ui/biome-foes.js (сборщик tools/content-gen/biomes/build.js).

Печатает таблицы для docs/content/биомы-2-4.md и пишет tools/content-gen/biomes/pace.json — их берёт следующая сборка build.js:
- Б1. Биом 2 с обучения: забег за забегом — пара первого биома, ещё трое героев приходят по ходу, дух — в уровни;
- Б2. Биом 2: кому он по силам — стена, босс и рунный страж по составу отряда и уровню;
- Б3. Биомы 3–4 по уровням отряда: стена, осада, рунный страж;
- Б4. Цикл II по дням: уровень отряда на день — калькулятор экономики (economy.py, timeline), бой — ядро.
Уровни, пределы и дух берёт из economy.py через importlib и его не меняет. Бой — node tools/content-gen/biomes/sim.js.

    python tools/content-gen/biomes/pace.py          # таблицы, pace.json; затем node tools/content-gen/biomes/build.js
    python tools/content-gen/biomes/pace.py --check  # только вердикт: код выхода 1, если темп не сходится с целью

Все числа — демонстрация и лежат в начале файла, в функциях только алгоритм. Расчёт целочисленный: время — в миллисекундах.
"""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
_spec = importlib.util.spec_from_file_location('economy', ROOT / 'tools' / 'content-gen' / 'economy' / 'economy.py')
E = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(E)
SIM = HERE / 'sim.js'
OUT = HERE / 'pace.json'
MINUTE_MS, HOUR_MS = E.MINUTE_MS, E.HOUR_MS

# ======================= ДАННЫЕ =======================

# --- биом 2: цикл I после обучения (ADR-0018) ---
PAIR = E.TUTOR_IDS                      # биом 1 закрывают двое: танк и физ ДД прототипа
PAIR_LVL = E.SIM_GUARD                  # пара входит во второй биом с уровня, с которого берёт стража биома 1 (Т15 экономики)
GOAL_B2_H = E.PACE_I[1][1]              # цель автора: биом 2 — ещё около трёх часов
# ещё трое до первой полной пачки: маг — с начала биома, лекарь — когда отряд дошёл до 10-го этажа, дебаффер — до 20-го.
# Первая доблесть — руна уровня аккаунта «Открыть второй биом» (ADR-0018, §16): её получает боец урона пары.
ARRIVE = [{'id': 'h1', 'floor': 0, 'lvl': PAIR_LVL}, {'id': 'h2', 'floor': 0, 'lvl': PAIR_LVL, 'valor': 1},
          {'id': 'h3', 'floor': 0}, {'id': 'h4', 'floor': 10}, {'id': 'h5', 'floor': 20}]
PACK = ['h1', 'h2', 'h3', 'h4', 'h5']
CAP_I = E.LIMITS[0]                     # в цикле I выше первого предела не подняться: отряд входит в цикл II на 50-м
GAP_MS = 0                              # время между забегами не считаем: как в Т15, только забеги
B2_SQUADS = [('пара: танк и физ ДД', PAIR), ('трое: + маг', PAIR + ['h3']), ('четверо без дебаффера', ['h1', 'h2', 'h3', 'h4']),
             ('четверо без лекаря', ['h1', 'h2', 'h3', 'h5']), ('первая полная пачка', PACK)]
B2_LEVELS = [35, 40, 43, 46, 48, 50]

# --- биомы 3–4: цикл II (ADR-0018), отряд прототипа с его доблестью, как в прогоне экономики ---
LEVELS_II = [125, 150, 200, 250, 300, 338, 350, 400, 450, 525, 600, 700]
CYCLE_II = ['b3', 'b4']
DAYS_SHOW = 30                          # горизонт таблицы по дням
GOAL_II = (E.CYCLE_DAYS - 4, E.CYCLE_DAYS + 4)   # цикл II — «около двух недель» (CYCLE_DAYS экономики): от 10 до 18 дней
NAMES = {'b2': 'Подземный лес', 'b3': 'Библиотека Улариона', 'b4': 'Искусственный Стоун-Хейм'}

# ======================= РАСЧЁТ =======================


def sim(spec):
    res = subprocess.run(['node', str(SIM), json.dumps(spec, ensure_ascii=False)], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        sys.exit(res.stderr)
    return json.loads(res.stdout)


def data_sig():
    """Подпись данных боя из biome-foes.js — её же ставит build.js: прогон на других данных pace.json не примет."""
    js = "globalThis.window=globalThis;require('./design/ui/biome-foes.js');process.stdout.write(String(globalThis.EN_BIOME_FOES.rules.sig||''))"
    return subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout.strip()


def tutor():
    return sim({'mode': 'tutor', 'pace': {'biome': 'b2', 'cap': CAP_I, 'levelExp': list(E.LEVEL_EXP), 'startSpirit': 0,
                                           'gapMs': GAP_MS, 'maxRuns': 400, 'arrive': ARRIVE}})


def squads_b2():
    rows = []
    for name, ids in B2_SQUADS:
        r = sim({'mode': 'levels', 'biome': 'b2', 'levels': B2_LEVELS, 'squad': ids, 'valor': 0, 'max': 1})['rows']
        rows.append((name, r))
    return rows


def levels_ii():
    return {b: sim({'mode': 'levels', 'biome': b, 'levels': LEVELS_II, 'max': 60})['rows'] for b in CYCLE_II}


def days_ii():
    out = {}
    for name, hours in E.PROFILES:
        _, _, lv = E.timeline(E.RATES_NEW, E.mult_new, hours)
        levels = [a for a, _ in lv[:DAYS_SHOW + 1]]
        out[name] = {'hours': hours, 'levels': levels, 'biomes': sim({'mode': 'days', 'biomes': CYCLE_II, 'levels': levels, 'hours': hours})['biomes']}
    return out

# ======================= ВЫВОД =======================


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
    out += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out)


def mins(ms):
    q = ms * 10 // MINUTE_MS
    return f'{q // 10}' if q % 10 == 0 else f'{q // 10},{q % 10}'


def cell(r):
    s = ('босс' if r['runs'] == 1 else f"осада, {r['runs']} заб." if r['runs'] else 'осада не идёт' if r['siege'] else 'босс стоит') if r['reach'] else f"стена {r['wall']}"
    return s + (' · страж' if r['guard'] else '')


def b1_table(t):
    rows = []
    for x in t['log']:
        rows.append([x['run'], f"{mins(x['ms'])} мин", x['heroes'], '/'.join(str(v) for v in x['lvl']), f"{x['wall']}-й" + (' · босс' if x['win'] else ''),
                     E.fmt(x['spirit']), ('пал' if x.get('guard') else 'не пустил') if 'guard' in x else '—'])
    return table(['Забег', 'Время забегов', 'Героев', 'Уровни', 'Дошёл до', 'Дух', 'Рунный страж'], rows)


def verdict(t, sq, days):
    v = []
    g, b = t['guard'], t['boss']
    ok2 = bool(g) and g['ms'] <= GOAL_B2_H * HOUR_MS
    v.append({'what': 'Биом 2: босс и рунный страж', 'goal': f'ещё около {GOAL_B2_H} ч', 'got': (f"{mins(g['ms'])} мин забегов, {g['runs']} заб., уровни {'/'.join(map(str, g['lvl']))}" if g else 'не пройден'), 'ok': ok2})
    pack = dict(sq)
    lone = [name for name, rows in sq if name != 'первая полная пачка' and any(r['runs'] for r in rows)]
    v.append({'what': 'Биом 2 проходит только полная пачка', 'goal': 'пара и четверо — нет (ADR-0018)', 'got': 'только пачка' if not lone else 'проходят: ' + ', '.join(lone), 'ok': not lone})
    for name, d in days.items():
        B = d['biomes']
        last = B.get(CYCLE_II[-1], {}).get('guard')
        got = '; '.join(f"{NAMES[k]}: босс — {x['boss']['day']}-й день, страж — {x['guard']['day'] if x.get('guard') else '—'}-й" for k, x in B.items() if x.get('boss')) or 'босс не пал'
        ok = bool(last) and GOAL_II[0] <= last['day'] <= GOAL_II[1]
        v.append({'what': f'Цикл II, {name} игрок ({d["hours"]} ч в день)', 'goal': f'около двух недель: {GOAL_II[0]}–{GOAL_II[1]} дней', 'got': got, 'ok': ok})
    return v


def main(check):
    t, sq, lv, days = tutor(), squads_b2(), levels_ii(), days_ii()
    v = verdict(t, sq, days)
    if check:
        for x in v:
            print(('✓ ' if x['ok'] else '✗ ') + f"{x['what']}: {x['got']} (цель — {x['goal']})")
        return 0 if all(x['ok'] for x in v) else 1
    md = []
    md.append('Б0. Вердикт.\n\n' + table(['Что', 'Цель', 'Прогон', 'Итог'], [[x['what'], x['goal'], x['got'], 'в срок' if x['ok'] else 'мимо цели'] for x in v]))
    md.append(f'Б1. Биом 2 с обучения: пара входит на {PAIR_LVL}-м, маг — сразу, лекарь — с 10-го этажа, дебаффер — с 20-го; '
              f'первая доблесть — бойцу урона; дух убитых — в уровни, первым качается самый низкий, не выше {CAP_I}-го.\n\n' + b1_table(t))
    md.append('Б2. Биом 2 по составу: одинаковый уровень всех героев, без доблести.\n\n' +
              table(['Отряд'] + [f'{L}-й' for L in B2_LEVELS], [[name] + [cell(r) for r in rows] for name, rows in sq]))
    md.append('Б3. Биомы 3–4 по уровню отряда прототипа (доблесть 2 / 1 / 2 / 1 / 3), осада — до 60 забегов.\n\n' +
              table(['Уровень'] + [NAMES[b] for b in CYCLE_II],
                    [[L] + [f"{cell(lv[b][i])} · {mins(lv[b][i]['ms'])} мин" for b in CYCLE_II] for i, L in enumerate(LEVELS_II)]))
    for name, d in days.items():
        rows = []
        for k, x in d['biomes'].items():
            walls = ', '.join(f"с {d}-го дня — {f}-й этаж" for d, f in x.get('walls', [])) or 'нет'
            rows.append([NAMES[k], f"{x['from']}-й", walls, f"{x['boss']['day']}-й, уровень {x['boss']['lvl']}, забегов {x['boss']['runs']}" if x.get('boss') else '—',
                         f"{x['guard']['day']}-й, уровень {x['guard']['lvl']}" if x.get('guard') else '—'])
        lvl = ', '.join(f'{i}: {a}' for i, a in enumerate(d['levels'][:17]) if i)
        md.append(f"Б4. Цикл II по дням — {name} игрок, {d['hours']} ч забегов в день. Уровень главного отряда по дням (economy.py): {lvl}.\n\n" +
                  table(['Биом', 'С дня', 'Стена до босса', 'Босс пал', 'Рунный страж пал'], rows))
    text = '\n\n'.join(md)
    sig = data_sig()
    payload = {'sig': sig, 'verdict': v, 'rows': {'b2': {'boss': t['boss'], 'guard': t['guard']}, 'days': {k: d['biomes'] for k, d in days.items()}}, 'md': text}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(text)
    print(f'\npace.json — подпись данных {sig}. Теперь: node tools/content-gen/biomes/build.js')
    return 0


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main('--check' in sys.argv))
