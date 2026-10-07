# -*- coding: utf-8 -*-
"""Темп биомов 2–4 — прогон ядра боя (черновик). Решение автора о темпе — ADR-0018: биом 1 — за час, биом 2 — ещё примерно
за три, цикл II — испытание на дни; коридоры — ADR-0031, п. 5 (данные — economy.py: PACE_B1_MIN, PACE_B2_MIN, PACE_II_DAYS).
Враги и колоды — design/ui/biome-foes.js (сборщик tools/content-gen/biomes/build.js).

Печатает таблицы для docs/content/биомы-2-4.md и пишет tools/content-gen/biomes/pace.json — их берёт следующая сборка build.js:
- Б0. Вердикт: коридоры темпа, ×1,7 плательщика, рунный страж без провалов по уровню;
- Б1. Биом 2 с обучения: забег за забегом — сценарий «Старт с чистого листа» (tools/content-gen/start/build.js → start.json): герои приходят
  по уровням Странника, дух — в уровни, руна обучения и рунный предел — наградами уровней; прогон — настоящими боями ядра;
- Б2. Биом 2: кому он по силам — стена, босс и рунный страж по составу отряда и уровню;
- Б3. Биомы 3–4 по уровням отряда: стена, осада, рунный страж;
- Б4. Цикл II по дням: уровень отряда на день — калькулятор экономики (economy.py, timeline: забегов разом — по артефакту активных
  биомов, ADR-0054; стражи — из ключей варианта Б), бой — ядро.
Уровни, пределы и дух берёт из economy.py через importlib и его не меняет. Бой — node tools/content-gen/biomes/sim.js.
Длина цикла II — день, когда обычный игрок берёт рунного стража последнего биома цикла II; она уходит в pace.json (cycleDays), и все
калькуляторы берут её оттуда через economy.CYCLE_DAYS. Прогон ищет неподвижную точку: день стража при той длине, что он сам дал.

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
# Биом 2 с обучения считает сценарий «Старт с чистого листа» (01.10.2026): канонический игрок от нуля — найм по уровням Странника, дух
# в уровни, руна обучения (уровень 7) и предел (уровень 9) — настоящими боями ядра. Его итог — tools/content-gen/start/start.json:
# сборщик сценария идёт в порядке сборки раньше этого прогона. Прежняя модель ARRIVE (пара на уровне стража, маг — сразу, лекарь — с 10-го
# этажа, дебаффер — с 20-го, доблесть без сброса уровня) снята: приход героев теперь задают уровни Странника, а доблесть сбрасывает уровень
START_JSON = ROOT / 'tools' / 'content-gen' / 'start' / 'start.json'
PACK = ['h1', 'h2', 'h3', 'h4', 'h5']
B2_SQUADS = [('пара: танк и физ ДД', PAIR), ('трое: + маг', PAIR + ['h3']), ('четверо без дебаффера', ['h1', 'h2', 'h3', 'h4']),
             ('четверо без лекаря', ['h1', 'h2', 'h3', 'h5']), ('первая полная пачка', PACK)]
B2_LEVELS = [35, 40, 43, 46, 48, 50]

# --- биомы 3–4: цикл II (ADR-0018), отряд прототипа с его доблестью, как в прогоне экономики ---
LEVELS_II = [150, 175, 200, 225, 250, 275, 300, 325, 350, 400, 450, 525, 600, 700]
CYCLE_II = ['b3', 'b4']
DAYS_SHOW = 45                          # горизонт таблицы по дням
FIXED_TRIES = 6                         # попыток найти неподвижную точку длины цикла II
GUARD_SCAN = (100, 10)                  # страж без провалов: от уровня первой победы в прогоне по дням — ещё столько уровней, шаг
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
    """Биом 2 с обучения — из прогона сценария (start.json, b2): босс, рунный страж, итог биома и забеги. Нет прогона — сборка падает:
    сначала node tools/content-gen/start/build.js."""
    try:
        J = json.loads(START_JSON.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        sys.exit('нет tools/content-gen/start/start.json — сначала node tools/content-gen/start/build.js')
    b2 = J['b2']
    return {'boss': b2['boss'], 'guard': b2['guard'], 'runs': b2['tot']['runs'], 'ms': b2['tot']['ms'], 'tot': b2['tot'], 'log': b2['log']}


def squads_b2():
    rows = []
    for name, ids in B2_SQUADS:
        r = sim({'mode': 'levels', 'biome': 'b2', 'levels': B2_LEVELS, 'squad': ids, 'valor': 0, 'max': 1})['rows']
        rows.append((name, r))
    return rows


def levels_ii():
    return {b: sim({'mode': 'levels', 'biome': b, 'levels': LEVELS_II, 'max': 60})['rows'] for b in CYCLE_II}


def run_days(hours, prof=None):
    t = E.pace_of(hours, **({'prof': prof} if prof else {}))
    levels = [a for a, _ in t['lv'][:DAYS_SHOW + 1]]
    levels += [levels[-1]] * (DAYS_SHOW + 1 - len(levels))
    return {'hours': hours, 'levels': levels, 'runes': t['runes'], 'limit5': t['limit5'],
            'biomes': sim({'mode': 'days', 'biomes': CYCLE_II, 'levels': levels, 'hours': hours})['biomes']}


def last_guard(d):
    x = d['biomes'].get(CYCLE_II[-1], {}).get('guard')
    return x['day'] if x else None


def days_ii():
    """Цикл II по дням у обычного, увлечённого и плательщика (время обычного, ключи контрактов плательщика — econ, профиль p).
    Длина цикла II — неподвижная точка: день стража последнего биома у обычного при той длине, что он сам дал."""
    tried = []
    for _ in range(FIXED_TRIES):
        out = {name: run_days(hours) for name, hours in E.PROFILES}
        g = last_guard(out[E.PROFILES[0][0]])
        tried.append((E.CYCLE_DAYS, g))
        if g is None or g == E.CYCLE_DAYS or (E.CYCLE_DAYS, g) in tried[:-1]:
            break
        E.CYCLE_DAYS = g
    payer_prof = 'p' if 'p' in E.contracts_econ().get(str(E.FIRST_CYCLE), {}) else None
    out['плательщик'] = run_days(E.PROFILES[0][1], payer_prof or 'o')
    out['плательщик']['keysFrom'] = 'econ.p' if payer_prof else 'econ.o — у прогона контрактов нет профиля p'
    return out, tried


def guard_scan(days):
    """Рунный страж без провалов по уровню (ADR-0014: сид постоянный, бой при том же отряде и уровне — тот же): от уровня, на котором
    страж пал в прогоне по дням, ещё GUARD_SCAN уровней с шагом — везде победа. Иначе темп держится на удачном уровне."""
    out = {}
    for b in CYCLE_II:
        g = days[E.PROFILES[0][0]]['biomes'].get(b, {}).get('guard')
        if not g:
            continue
        span, step = GUARD_SCAN
        lv = list(range(g['lvl'], min(E.LIMITS[-1], g['lvl'] + span) + 1, step))
        rows = sim({'mode': 'levels', 'biome': b, 'levels': lv, 'max': 1})['rows']
        out[b] = {'from': g['lvl'], 'lost': [r['lvl'] for r in rows if not r['guard']]}
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


def verdict(t, sq, days, scan):
    v = []
    lo1, hi1 = E.PACE_B1_MIN
    b1 = E.tutor_pace()
    v.append({'what': 'Биом 1: обучающий, пара героев', 'goal': f'{lo1}–{hi1} мин боя (ADR-0018, дополнение)',
              'got': f'{mins(b1[0])} мин забегов, {b1[1]} заб.' if b1 else 'не пройден', 'ok': bool(b1) and E.in_corridor(b1[0], E.PACE_B1_MIN)})
    g = t['guard']
    lo2, hi2 = E.PACE_B2_MIN
    v.append({'what': 'Биом 2: босс и рунный страж', 'goal': f'{lo2}–{hi2} мин боя (ADR-0049: 5–10 погружений с уроками)',
              'got': (f"{mins(g['ms'])} мин забегов, {g['runs']} заб., уровни {'/'.join(map(str, g['lvl']))}" if g else 'не пройден'),
              'ok': bool(g) and E.in_corridor(g['ms'], E.PACE_B2_MIN)})
    lone = [name for name, rows in sq if name != 'первая полная пачка' and any(r['runs'] for r in rows)]
    v.append({'what': 'Биом 2 проходит только полная пачка', 'goal': 'пара и четверо — нет (ADR-0018)', 'got': 'только пачка' if not lone else 'проходят: ' + ', '.join(lone), 'ok': not lone})
    lo, hi = E.PACE_II_DAYS
    day = {name: last_guard(d) for name, d in days.items()}
    for name, d in days.items():
        B = d['biomes']
        got = '; '.join(f"{NAMES[k]}: босс — {x['boss']['day']}-й день, страж — {x['guard']['day'] if x.get('guard') else '—'}-й" for k, x in B.items() if x.get('boss')) or 'босс не пал'
        reg = day[E.PROFILES[0][0]]
        if name == E.PROFILES[0][0]:
            goal, ok = f'{lo}–{hi} дней (ADR-0031, п. 5)', bool(day[name]) and lo <= day[name] <= hi
        elif name == 'плательщик':
            goal = f'не быстрее обычного больше чем в ×{E.dec1(E.PAYER_MAX_X10, 10)} ({d["keysFrom"]})'
            ok = bool(day[name]) and bool(reg) and reg * 10 <= day[name] * E.PAYER_MAX_X10
        else:
            goal, ok = 'быстрее обычного', bool(day[name]) and bool(reg) and day[name] < reg
        v.append({'what': f'Цикл II, {who(name)} ({d["hours"]} ч в день)', 'goal': goal, 'got': got, 'ok': ok})
    for b, x in scan.items():
        v.append({'what': f'{NAMES[b]}: рунный страж без провалов по уровню', 'goal': f'с {x["from"]}-го ещё {GUARD_SCAN[0]} уровней — только победы',
                  'got': 'провалов нет' if not x['lost'] else 'проигрывает на ' + ', '.join(map(str, x['lost'])), 'ok': not x['lost']})
    return v


def who(name):
    """Подпись профиля: «обычный игрок», но «плательщик»."""
    return name if name == 'плательщик' else f'{name} игрок'


def main(check):
    t, sq, lv = tutor(), squads_b2(), levels_ii()
    days, tried = days_ii()
    scan = guard_scan(days)
    v = verdict(t, sq, days, scan)
    b2 = {'boss': t['boss'], 'guard': t['guard'], 'tot': dict(t['tot'], runs=t['runs'], ms=t['ms'])}   # счётчики цикла I для sets.py — из сценария
    rows = {'b2': b2, 'days': {k: d['biomes'] for k, d in days.items()}}
    if check:
        for x in v:
            print(('✓ ' if x['ok'] else '✗ ') + f"{x['what']}: {x['got']} (цель — {x['goal']})")
        old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
        saved = old.get('cycleDays')
        fresh = saved == E.CYCLE_DAYS
        print(('✓ ' if fresh else '✗ ') + f'pace.json: длина цикла II {saved} — прогон даёт {E.CYCLE_DAYS}' + ('' if fresh else ' — перезапустить pace.py'))
        # дни всех профилей и биом 2: ключи контрактов двигают руны плательщика и увлечённого, не трогая длины цикла
        same = old.get('rows') == json.loads(json.dumps(rows, ensure_ascii=False))
        print(('✓ ' if same else '✗ ') + 'pace.json: дни профилей и биом 2 совпадают с прогоном' + ('' if same else ' — перезапустить pace.py и biomes/build.js'))
        return 0 if all(x['ok'] for x in v) and fresh and same else 1
    md = []
    md.append('Б0. Вердикт.\n\n' + table(['Что', 'Цель', 'Прогон', 'Итог'], [[x['what'], x['goal'], x['got'], 'в срок' if x['ok'] else 'мимо цели'] for x in v]))
    md.append('Б1. Биом 2 с обучения — сценарий «Старт с чистого листа» (start.json): пара Мастерской, маг — с открытием леса, лекарь — '
              'с 7-го уровня Странника, контроль — с 8-го; руна обучения — бойцу урона на 7-м, его уровень — с нуля; рунный предел — '
              'наградой 9-го уровня; дух убитых — в уровни, первым качается самый низкий. Забеги — погружения (ADR-0049): перед каждым — урок, '
              'после — дар погружения, добыча однообразных забегов полного пути; дух в таблице — этажей, без дара.\n\n' + b1_table(t))
    md.append('Б2. Биом 2 по составу: одинаковый уровень всех героев, без доблести.\n\n' +
              table(['Отряд'] + [f'{L}-й' for L in B2_LEVELS], [[name] + [cell(r) for r in rows] for name, rows in sq]))
    md.append('Б3. Биомы 3–4 по уровню отряда прототипа (доблесть 0 / 1 / 0 / 0 / 0 — у бойца урона руна обучения), осада — до 60 забегов.\n\n' +
              table(['Уровень'] + [NAMES[b] for b in CYCLE_II],
                    [[L] + [f"{cell(lv[b][i])} · {mins(lv[b][i]['ms'])} мин" for b in CYCLE_II] for i, L in enumerate(LEVELS_II)]))
    for name, d in days.items():
        trows = []   # строки таблицы Б4; rows — данные pace.json, их не затирать
        for k, x in d['biomes'].items():
            walls = ', '.join(f"с {d0}-го дня — {f}-й этаж" for d0, f in x.get('walls', [])) or 'нет'
            trows.append([NAMES[k], f"{x['from']}-й", walls, f"{x['boss']['day']}-й, уровень {x['boss']['lvl']}, забегов {x['boss']['runs']}" if x.get('boss') else '—',
                         f"{x['guard']['day']}-й, уровень {x['guard']['lvl']}" if x.get('guard') else '—'])
        last = last_guard(d) or DAYS_SHOW
        lvl = ', '.join(f'{i}: {a}' for i, a in enumerate(d['levels'][:last + 2]) if i)
        runes = ', '.join(f'{E.ROMAN[i]} — {r}-й' for i, r in enumerate(d['runes']) if i)
        md.append(f"Б4. Цикл II по дням — {who(name)}, {d['hours']} ч забегов в день. Уровень главного отряда по дням (economy.py): {lvl}. "
                  f"Руны пределов (стражи — из ключей, вариант Б): {runes}; пятый предел — {d['limit5']}-й день.\n\n" +
                  table(['Биом', 'С дня', 'Стена до босса', 'Босс пал', 'Рунный страж пал'], trows))
    text = '\n\n'.join(md)
    sig = data_sig()
    payload = {'sig': sig, 'cycleDays': E.CYCLE_DAYS, 'fixed': tried, 'verdict': v, 'rows': rows, 'md': text}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(text)
    print(f'\npace.json — подпись данных {sig}, цикл II — {E.CYCLE_DAYS} дней. Теперь: node tools/content-gen/biomes/build.js')
    return 0


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main('--check' in sys.argv))
