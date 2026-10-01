# -*- coding: utf-8 -*-
"""Подъём по циклам II–VI — калькулятор «новой ступени аккаунта» (ADR-0041). Черновик · предложение · ждёт автора.

Слово автора, 01.10.2026: «…из-за того что герои нового цикла они должны быть больше по базовым статам игроку с теми героями что у него
есть на новом цикле становиться трудно… В общем новый цикл это новая ступень аккаунта игрока, больше планки для игроков».

Что считает. Игрок приходит в цикл c с отрядом, которым кончил цикл c − 1, и упирается в первый биом нового цикла: враги цикла c сильнее
по кривой §3.3. Дальше у него два пути — поднять тот же отряд за следующий рунный предел или собрать новую ступень: пятёрку героев за
золото цикла c − 1 (они сильнее на кривую §3.3 уже на том же уровне — ядро, RULES.cycleX10). Калькулятор на входе в каждый цикл
считает оба пути вперёд по дням и берёт тот, что раньше выводит отряд на рунного стража второго биома цикла. Бои — ядром
(climb-sim.js): биомы циклов III–VI — образец цикла II по кривой §3.3, пока биомы 5–12 не собраны.

Доход по дням — те же правила, что у калькулятора экономики (economy.py, timeline_ex): забеги часов профиля, забегов разом — номер цикла,
ставки × цикл (mult_new), дух — в уровни по ⌈n^1,2⌉ (ядро, levelCost), руны пределов — с побед у рунных стражей за ключи контрактов и
босса (вариант Б), по весам стража, излишки пройденных пределов — в перековку вверх. Цикл II этой модели совпадает с калькулятором
экономики день в день — это проверяется. Допущения сверх него — в разделе ДАННЫЕ, у каждого «почему».

Длина цикла — день, когда пал рунный страж второго биома цикла; следующий цикл — со следующего дня. Длины циклов III–VI — неподвижная
точка: доход зависит от цикла дня, а цикл дня — от боёв.

    python tools/content-gen/cycle/climb.py           # прогон: таблицы и tools/content-gen/cycle/climb.json
    python tools/content-gen/cycle/climb.py --check   # только вердикт и свежесть climb.json: код выхода 1, если коридоры не держатся

Все числа — демонстрация, в начале файла; в функциях только алгоритм. Расчёт целочисленный: время — в миллисекундах, доли — б. п.
"""
import copy
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
SIM = HERE / 'climb-sim.js'
OUT = HERE / 'climb.json'
BP = E.BP

# ======================= ДАННЫЕ =======================

CYCLES = [2, 3, 4, 5, 6]                 # цикл II — калибровка (прогон темпа), III–VI — новые ступени
P_NEXT = 168                             # P цикла VII для второго биома цикла VI: цикла VII нет — ещё шаг ×1,6, как у echo.py (допущение)
# ручки силы биомов циклов III–VI, пока их враги не собраны (это и цель силы для будущей сборки биомов 5–12: с ней цикл держит коридор):
# KX — сила всех врагов биома, % кривой §3.3 (уровень: (12 + L) = (32 + этаж) × K × KX / 100); HP_X — здоровье босса и стража, % образца
# Подбор 01.10.2026 (было 100 у всех): на чистой кривой обычный проходит циклы III–VI за 9 / 13 / 21 / 7 дней — уровни отряда растут
# пределами быстрее кривой §3.3 (350 → 700 → 1200 — почти ×2 за предел, кривая — ×1,6 за цикл). Сила, при которой цикл держит три недели:
# III — 140 % (тот же отряд берёт его на пределе IV), IV — 120 % (тот же отряд, предел IV–V), V — 103 % (старый отряд упирается в 1 200-й:
# новая ступень, герои цикла IV), VI — 130 % (герои цикла IV на пределе III). Подбор шагом 10 %, у V — 3 %: на 106 % цикл V — 25 дней
KX = {3: {'A': 140, 'B': 140}, 4: {'A': 120, 'B': 120}, 5: {'A': 103, 'B': 103}, 6: {'A': 130, 'B': 130}}
HP_X = {3: {'A': 100, 'B': 100}, 4: {'A': 100, 'B': 100}, 5: {'A': 100, 'B': 100}, 6: {'A': 100, 'B': 100}}
# коридор длины цикла у обычного игрока (3 ч забегов в день): циклы III–VI — три недели ± три дня. Автор длины не задавал; калькуляторы
# контрактов, ритуалов, Эхо, клана и достижений уже считают цикл III — 21 день, IV–VI — как III (sets.CYCLE_LEN, capacity.json):
# коридор держит их допущение. Цикл II — коридор ADR-0031, п. 5 (economy.PACE_II_DAYS)
CORRIDOR = {2: E.PACE_II_DAYS, 3: (18, 24), 4: (18, 24), 5: (18, 24), 6: (18, 24)}
PROFILES = [('обычный', 3, 'o'), ('увлечённый', 8, 'e'), ('плательщик', 3, 'p')]   # имя, часов забегов в день, профиль ключей контрактов
SQUAD_N = 5                              # героев в новой ступени: отряд целиком
GOLD_SHARE_BP = 8000                     # доля золота на героев — как у калькулятора сетов (sets.GOLD_BUDGET_BP): остальное — артефакты, лавка
LOOK_DAYS = 60                           # горизонт сравнения путей на входе в цикл
DAYS_MAX = 220                           # горизонт прогона от начала цикла II
FIXED_TRIES = 10                         # попыток неподвижной точки длин циклов III–VI
GUARD_SCAN = (10, 3000, 10)              # поиск силы, с которой пал страж второго биома: уровни отряда цикла I от, до, шаг
WALL_DAY = 1                             # «упирается»: на этот день цикла отряд прихода не берёт первый биом — стена или осада

# ======================= РАСЧЁТ =======================

R = E.rx()
N = len(E.LIMITS)
PER_WIN = [R['runes_per_win'] * 100 * w // BP for w in R['weights']]
NEED = E.SQUAD * E.RUNES_PER_LIMIT * 100


def node(spec):
    spec = dict(spec, pNext=P_NEXT, kX={str(k): v for k, v in KX.items()}, hpX={str(k): v for k, v in HP_X.items()})
    res = subprocess.run(['node', str(SIM), json.dumps(spec, ensure_ascii=False)], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        sys.exit(res.stderr)
    return json.loads(res.stdout)


CURVE = json.loads(subprocess.run(['node', '-e', "globalThis.window=globalThis;require('./design/ui/battle.js');"
                                   "process.stdout.write(JSON.stringify(globalThis.EnBattle.RULES.cycleX10||null))"],
                                  cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout or 'null')
if not CURVE:
    sys.exit('climb.py: в ядре нет кривой силы героя RULES.cycleX10 (ADR-0041)')


def w_of(k, lvl):
    """Сила отряда героев цикла k на уровне lvl в десятых единицах кривой: P(k) × (12 + уровень)."""
    return CURVE[k - 1] * (E.LEVEL_DIV + lvl)


def eff(wx10, c):
    """Уровень отряда цикла I против врагов образца — для таблицы забегов калькулятора экономики (SIM): сила, делённая на кривую цикла
    и на ручку силы его первого биома (KX): забеги идут там, где отряд упёрся."""
    kx = KX.get(c, {}).get('A', 100)
    return max(1, wx10 * 100 // (CURVE[c - 1] * kx) - E.LEVEL_DIV)


def cap_of(nxt):
    return E.LIMITS[min(nxt, N - 1)]


def squad_price(k):
    return sum(E.hero_price(k, j) for j in range(1, SQUAD_N + 1))


def fresh():
    return {'sq': {1: {'lvl': E.START_LEVEL, 'nxt': E.START_LIMITS, 'stock': [0] * N, 'day': 0}}, 'b': E.START_LEVEL,
            'bank': 0, 'gold': 0, 'hero_gold': 0, 'boss_prev': 0, 'focus': 1, 'want': None}


def main_k(st):
    return max(st['sq'], key=lambda k: (w_of(k, st['sq'][k]['lvl']), -k))


def buy(st, day):
    """Новая ступень: пятёрка героев за золото цикла want — как только хватает доли золота на героев."""
    k = st['want']
    if k is None or k in st['sq']:
        return
    price = squad_price(k)
    if st['hero_gold'] >= price:
        st['hero_gold'] -= price
        st['sq'][k] = {'lvl': 0, 'nxt': 0, 'stock': [0] * N, 'day': day}
        st['focus'] = k


def step(st, c, hours, prof):
    """Один день цикла c: победы у рунных стражей за ключи, руны — отряду в работе, забеги часов профиля, дух — в уровни."""
    keys = E.contract_keys_x100(c, prof) + st['boss_prev'] * R['boss_key_bp'] * c // BP
    wins = E.rb_wins_x100(keys, c)
    lim_w = wins * E.RB_SPLIT_BP // BP
    F = st['sq'][st['focus']] if st['focus'] in st['sq'] else st['sq'][main_k(st)]
    for k in range(N):
        F['stock'][k] += PER_WIN[k] * lim_w // 100
    for _ in range(2):
        while F['nxt'] < N and F['stock'][F['nxt']] >= NEED:
            F['stock'][F['nxt']] -= NEED
            F['nxt'] += 1
        for k in range(min(F['nxt'], N - 1)):
            q = F['stock'][k] // (R['reforge'] * 100)
            F['stock'][k] -= q * R['reforge'] * 100
            F['stock'][k + 1] += q * 100
    m = E.mult_new(c)
    g0 = wins * E.RATES_NEW['guard'][0] * m // (BP * 100)
    st['bank'] += wins * E.RATES_NEW['guard'][1] * m // (BP * 100)
    st['gold'] += g0
    st['hero_gold'] += g0 * GOLD_SHARE_BP // BP
    n_sl = E.slots(c)
    boss = 0
    for _ in range(hours):
        M = main_k(st)
        for s in range(n_sl):
            wx = w_of(M, st['sq'][M]['lvl']) if s == 0 else w_of(1, st['b'])
            row = E.sim_row(eff(wx, c))
            g, sp, _ = E.per_hour(row, E.RATES_NEW, m)
            st['bank'] += sp
            st['gold'] += g
            st['hero_gold'] += g * GOLD_SHARE_BP // BP
            boss += row[4] * E.HOUR_MS * 100 // row[5]
        order = [st['focus']] if st['focus'] in st['sq'] else []
        order += [k for k in [main_k(st)] if k not in order]
        for k in order:
            S = st['sq'][k]
            while S['lvl'] < cap_of(S['nxt']) and st['bank'] >= E.SQUAD * E.level_cost(S['lvl'] + 1):
                st['bank'] -= E.SQUAD * E.level_cost(S['lvl'] + 1)
                S['lvl'] += 1
        n_b, old = n_sl - 1, st['sq'][1]['lvl']
        while n_b and st['b'] < min(E.EXTRA_CAP.get(c, E.EXTRA_CAP[max(E.EXTRA_CAP)]), old) and st['bank'] >= n_b * E.SQUAD * E.level_cost(st['b'] + 1):
            st['bank'] -= n_b * E.SQUAD * E.level_cost(st['b'] + 1)
            st['b'] += 1
    st['boss_prev'] = boss


def reach_day(st, c, hours, prof, wreq, focus, want, day0):
    """Сколько дней от day0 до силы wreq, если с этого дня качать отряд focus (want — новая ступень, её ещё купить)."""
    s = copy.deepcopy(st)
    s['focus'], s['want'] = focus, want
    for d in range(1, LOOK_DAYS + 1):
        buy(s, day0 + d)
        step(s, c, hours, prof)
        if w_of(main_k(s), s['sq'][main_k(s)]['lvl']) >= wreq:
            return d
    return None


def choose(st, c, hours, prof, wreq, day0):
    """Вход в цикл c: тот же отряд выше или новая ступень — пятёрка цикла c − 1. Берётся путь, что раньше выводит на силу стража."""
    cur = main_k(st)
    ways = [('тот же отряд', cur, None)]
    k = c - 1
    if k > cur:
        ways.append(('новая ступень', k, k))
    best = None
    for name, focus, want in ways:
        d = reach_day(st, c, hours, prof, wreq, focus, want, day0)
        if d is not None and (best is None or d < best[0]):
            best = (d, name, focus, want)
    return best or (None, 'тот же отряд', cur, None)


def guard_need():
    """Сила, с которой рунный страж второго биома цикла падает без провалов: начало последней полосы побед отряда цикла I по уровням —
    в силу. Ниже бывают удачные уровни, но на них темп не держится (как «страж без провалов» прогона темпа)."""
    out = {}
    for c in CYCLES:
        f, t, s = GUARD_SCAN
        r = node({'mode': 'guard', 'biome': f'v{c}B', 'k': 1, 'from': f, 'to': t, 'step': s})
        out[c] = {'lvl': r['stable'], 'first': r['first'], 'w': w_of(1, r['stable']) if r['stable'] is not None else None, 'lost': r['lost']}
    return out


def plan_of(hours, prof, ends, need):
    """Дни от начала цикла II: отряд главного забега (цикл героев, уровень) по дням и выбор пути на входе в каждый цикл."""
    st, plan, picks, lv2 = fresh(), [], {}, []
    c_prev = None
    for day in range(1, DAYS_MAX + 1):
        c = cycle_of(day, ends)
        if c != c_prev and c >= 3 and need.get(c, {}).get('w'):
            d, name, focus, want = choose(st, c, hours, prof, need[c]['w'], day - 1)
            st['focus'], st['want'] = focus, want
            M = main_k(st)
            picks[c] = {'way': name, 'k': want or focus, 'days': d, 'from': [M, st['sq'][M]['lvl'], st['sq'][M]['nxt']]}
        c_prev = c
        buy(st, day)
        step(st, c, hours, prof)
        M = main_k(st)
        plan.append([M, st['sq'][M]['lvl']])
        if c == 2:
            lv2.append(st['sq'][1]['lvl'])
        if c in picks and 'bought' not in picks[c] and picks[c]['k'] in st['sq'] and picks[c]['k'] != 1:
            picks[c]['bought'] = st['sq'][picks[c]['k']]['day']
    return plan, picks, lv2


def cycle_of(day, ends):
    for c in CYCLES:
        e = ends.get(c)
        if e is None or day <= e:
            return c
    return CYCLES[-1]


def biomes_seq():
    return [f'v{c}{ab}' for c in CYCLES for ab in 'AB']


def battle(plan, hours):
    return node({'mode': 'days', 'biomes': biomes_seq(), 'plan': plan, 'hours': hours})['biomes']


def ends_of(b):
    out = {}
    for c in CYCLES:
        g = b.get(f'v{c}B', {}).get('guard')
        out[c] = g['day'] if g else None
    return out


def profile(name, hours, prof, need, ends0):
    """Неподвижная точка длин циклов: доход по дням зависит от цикла дня, цикл дня — от боёв."""
    ends, tried = dict(ends0), []
    for _ in range(FIXED_TRIES):
        plan, picks, lv2 = plan_of(hours, prof, ends, need)
        b = battle(plan, hours)
        got = ends_of(b)
        tried.append([ends.get(c) for c in CYCLES])
        if got == ends or any(got[c] is None for c in CYCLES):
            ends = got
            break
        if [got.get(c) for c in CYCLES] in tried:
            ends = got
            break
        ends = got
    plan, picks, lv2 = plan_of(hours, prof, ends, need)
    b = battle(plan, hours)
    return {'name': name, 'hours': hours, 'prof': prof, 'ends': ends_of(b), 'biomes': b, 'picks': picks, 'plan': plan, 'lv2': lv2, 'tried': tried}


def lengths(p):
    out, prev = {}, 0
    for c in CYCLES:
        e = p['ends'].get(c)
        out[c] = (e - prev) if e is not None and prev is not None else None
        prev = e
    return out


def walls(p):
    """Стена на входе: отряд прихода в первом биоме нового цикла — где встал в первый день."""
    out = {}
    for c in CYCLES[1:]:
        x = p['biomes'].get(f'v{c}A', {})
        start = (p['ends'].get(c - 1) or 0) + 1
        first = next((w for w in x.get('walls', []) if w[0] == start), None)
        boss = x.get('boss')
        out[c] = {'day': start, 'wall': first[1] if first else None, 'k': first[2] if first else None, 'lvl': first[3] if first else None,
                  'boss': boss['day'] - start + 1 if boss else None, 'stuck': not (boss and boss['day'] <= start - 1 + WALL_DAY)}
    return out


def dn(n):
    """«1 день», «2 дня», «5 дней»."""
    a, b = n % 10, n % 100
    return f'{n} ' + ('день' if a == 1 and b != 11 else 'дня' if 2 <= a <= 4 and not 12 <= b <= 14 else 'дней')


def verdict(prof, econ_ok, same):
    reg, fan, pay = prof
    L, Lf, Lp = lengths(reg), lengths(fan), lengths(pay)
    W = walls(reg)
    rows = [('Образец цикла II — Библиотека Улариона и Стоун-Хейм этаж в этаж', 'уровни врагов, босс и страж совпадают', 'совпадает' if same else 'нет', same),
            ('Цикл II калькулятора — день в день', f'уровни отряда — как у калькулятора экономики, длина — как у прогона темпа ({dn(E.CYCLE_DAYS)})',
             'совпадает' if econ_ok else 'нет', econ_ok)]
    for c in CYCLES[1:]:
        lo, hi = CORRIDOR[c]
        ok = L[c] is not None and lo <= L[c] <= hi
        rows.append((f'Цикл {E.CYCLE_NAMES[c - 1]}, обычный: длина', f'{lo}–{hi} дней', dn(L[c]) if L[c] else 'не прошёл', ok))
        w = W[c]
        rows.append((f'Цикл {E.CYCLE_NAMES[c - 1]}: отряд прихода упирается', 'в первый день не берёт первый биом', ('стена на ' + str(w['wall']) + '-м этаже' if w['wall'] else 'осада босса') + f", босс — на {w['boss']}-й день цикла" if w['boss'] else 'стена', w['stuck']))
        okf = Lf[c] is not None and L[c] is not None and Lf[c] <= L[c]
        rows.append((f'Цикл {E.CYCLE_NAMES[c - 1]}, увлечённый', 'не дольше обычного', dn(Lf[c]) if Lf[c] else 'не прошёл', okf))
        okp = Lp[c] is not None and L[c] is not None and L[c] * 10 <= Lp[c] * E.PAYER_MAX_X10
        rows.append((f'Цикл {E.CYCLE_NAMES[c - 1]}, плательщик', f'не быстрее обычного больше чем в ×{E.PAYER_MAX_X10 // 10},{E.PAYER_MAX_X10 % 10}',
                     dn(Lp[c]) if Lp[c] else 'не прошёл', okp))
    return rows


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
    out += ['| ' + ' | '.join(str(x) for x in r) + ' |' for r in rows]
    return '\n'.join(out)


def roman(c):
    return E.CYCLE_NAMES[c - 1]


def md(res):
    reg, fan, pay = res['profiles']
    out = []
    out.append('П0. Вердикт.\n\n' + table(['Что', 'Цель', 'Прогон', 'Итог'], [[a, b, c, 'держится' if d else '**нет**'] for a, b, c, d in res['verdict']]))
    rows = []
    for p in res['profiles']:
        L = lengths(p)
        rows.append([p['name'], *[f'{L[c]}' if L[c] else '—' for c in CYCLES], f"{p['ends'][CYCLES[-1]]}" if p['ends'][CYCLES[-1]] else '—'])
    out.append('П1. Длина циклов, дней.\n\n' + table(['Профиль', *[roman(c) for c in CYCLES], 'Всего с начала II'], rows))
    rows = []
    for c in CYCLES[1:]:
        w, pk = walls(reg)[c], reg['picks'].get(c, {})
        fk, fl, fn = pk.get('from', [None, None, None])
        came = f'герои цикла {roman(fk)}, {fl}-й уровень, предел {roman(fn) if fn else "—"}' if fk else '—'
        wall = (f"{w['wall']}-й этаж" if w['wall'] else 'осада босса') + (f", босс — {w['boss']}-й день" if w['boss'] else '')
        way = pk.get('way', '—') + (f" — герои цикла {roman(pk['k'])}" if pk.get('way') == 'новая ступень' else '')
        need = res['need'][c]
        rows.append([roman(c), came, wall, way, f"{need['w'] // 10}" if need.get('w') else '—'])
    out.append('П2. Обычный: с чем приходит, где упирается, каким путём проходит.\n\n'
               + table(['Цикл', 'Отряд прихода', 'Стена в первом биоме', 'Путь', 'Сила стража второго биома'], rows))
    rows = []
    for c in CYCLES:
        a, b = reg['biomes'].get(f'v{c}A', {}), reg['biomes'].get(f'v{c}B', {})
        def cell(x):
            if not x:
                return '—'
            s = []
            if x.get('boss'):
                s.append(f"босс — {x['boss']['day']}-й день, герои {roman(x['boss']['k'])} на {x['boss']['lvl']}-м")
            if x.get('guard'):
                s.append(f"страж — {x['guard']['day']}-й, на {x['guard']['lvl']}-м")
            return '; '.join(s) or '—'
        rows.append([roman(c), cell(a), cell(b)])
    out.append('П3. Обычный по биомам: дни от начала цикла II.\n\n' + table(['Цикл', 'Первый биом', 'Второй биом'], rows))
    return '\n\n'.join(out)


def run():
    same = node({'mode': 'biomes'})['same']
    need = guard_need()
    ends0 = {2: E.CYCLE_DAYS, 3: E.CYCLE_DAYS + 21, 4: E.CYCLE_DAYS + 42, 5: E.CYCLE_DAYS + 63, 6: E.CYCLE_DAYS + 84}
    profs = [profile(n, h, p, need, ends0) for n, h, p in PROFILES]
    econ = E.pace_of(PROFILES[0][1])['lv']
    lv2 = profs[0]['lv2']
    econ_ok = profs[0]['ends'][2] == E.CYCLE_DAYS and all(econ[d + 1][0] == lv2[d] for d in range(min(len(lv2), len(econ) - 1)))
    res = {'need': need, 'profiles': profs, 'same': same, 'econOk': econ_ok}
    res['verdict'] = verdict(profs, econ_ok, same)
    return res


def dump(res):
    keep = {
        'meta': {'builder': 'tools/content-gen/cycle/climb.py', 'sim': 'tools/content-gen/cycle/climb-sim.js',
                 'sources': ['GDD §3.3', 'GDD §10', 'GDD §11', 'ADR-0031', 'ADR-0041', 'tools/content-gen/economy/economy.py', 'design/ui/battle.js']},
        'curve': CURVE, 'pNext': P_NEXT, 'kX': KX, 'hpX': HP_X, 'corridor': CORRIDOR, 'cycleIIDays': E.CYCLE_DAYS,
        'need': {str(c): v for c, v in res['need'].items()},
        'profiles': [{'name': p['name'], 'hours': p['hours'], 'ends': {str(c): v for c, v in p['ends'].items()},
                      'len': {str(c): v for c, v in lengths(p).items()},
                      'picks': {str(c): v for c, v in p['picks'].items()},
                      'walls': {str(c): v for c, v in walls(p).items()}} for p in res['profiles']],
        'verdict': [{'what': a, 'goal': b, 'got': c, 'ok': d} for a, b, c, d in res['verdict']],
        'md': md(res),
    }
    return json.dumps(keep, ensure_ascii=False, indent=1, sort_keys=True) + '\n'


def main():
    check = '--check' in sys.argv
    res = run()
    text = dump(res)
    print(md(res))
    bad = [v for v in res['verdict'] if not v[3]]
    if check:
        old = OUT.read_text(encoding='utf-8') if OUT.exists() else ''
        if old != text:
            print('\nclimb.json устарел — пересобрать: python tools/content-gen/cycle/climb.py')
            sys.exit(1)
        if bad:
            print('\nКоридоры не держатся:', '; '.join(v[0] for v in bad))
            sys.exit(1)
        print('\nПроверка пройдена: подъём по циклам в коридорах, climb.json свежий.')
        return
    OUT.write_text(text, encoding='utf-8', newline='\n')
    print(f'\nЗаписано: {OUT.relative_to(ROOT)}' + (' · коридоры не держатся: ' + '; '.join(v[0] for v in bad) if bad else ''))


if __name__ == '__main__':
    main()
