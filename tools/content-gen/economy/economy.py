# -*- coding: utf-8 -*-
"""Экономика золота и духа от прокачки героев — калькулятор (черновик).

Печатает таблицы Т1–Т15 для docs/content/экономика-золото-дух.md. Цикл I — обучение на часы (ADR-0018): Т15 считает
обучающий биом забег за забегом. Дни (Т4, Т8, Т11–Т13) — цикл II на образце длинного биома `BIOMES.c2`.
Т7 берёт доход контрактов из прогона их сборщика — design/ui/contracts.js: после пересборки контрактов перезапустить.

    python tools/content-gen/economy/economy.py        # все таблицы, markdown
    python tools/content-gen/economy/economy.py --sim  # перемерить прогон боя (нужен Node); вывод вставить в SIM

Все числа — демонстрация и лежат в начале файла, в функциях только алгоритм.
Расчёт целочисленный: доли — в базисных пунктах (10 000 = 100 %), время — в миллисекундах.
"""
import csv
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BP = 10000
MINUTE_MS, HOUR_MS = 60_000, 3_600_000

# ======================= ДАННЫЕ =======================

# --- уровни и пределы: GDD §9.3, §10.1 ---
LIMITS = [50, 150, 350, 700, 1200]
LEVEL_EXP = (12, 10)                  # цена уровня n = ceil(n ^ 12/10) духа — §9.3, «ручка темпа»
SENS_EXPS = [(11, 10), (12, 10), (13, 10)]
RUNES_PER_LIMIT = 10                  # §10.1
LEVEL_DIV = 12                        # множитель уровня 1 + уровень / 12, §3.3
SQUAD = 5
VALOR_MAX = [1, 2, 3, 4, 5]           # личный максимум доблести, §10.2 и §36.5
TYPICAL_VALOR = 3                     # самый частый максимум в герои.csv: 62 героя из 110
ROMAN = ['I', 'II', 'III', 'IV', 'V']

# --- герои: docs/content/герои/герои.csv (при запуске сверяется) ---
HEROES_VALOR = {1: {1: 1, 2: 7, 3: 11, 4: 3, 5: 3}, 2: {1: 2, 2: 4, 3: 14, 4: 2, 5: 3},
                3: {1: 1, 2: 2, 3: 9, 4: 2, 5: 1}, 4: {1: 2, 2: 1, 3: 9, 4: 1, 5: 2},
                5: {1: 3, 2: 3, 3: 14, 4: 1, 5: 4}, 6: {3: 5}}          # цикл -> {максимум: героев}
# --- герои за золото: docs/content/герои/состав-героев.csv (при запуске сверяется) ---
GOLD_HEROES = {1: 18, 2: 42, 3: 40, 4: 40, 5: 47, 6: 40}   # цикл -> героев за золото
CYCLE_NAMES = ['I', 'II', 'III', 'IV', 'V', 'VI']

# --- колода Мастерской форм, design/ui/battle.js FLOORS: 104 рядовых, 12 элит (ADR-0011: на 15-м и 20-м по две, на 25-м и 30-м по три), босс ---
DECK = {'rf': 104, 'elite': 12, 'boss': 1, 'floors': 35}

# --- прогон «10 раундов» (simRun) отрядом прототипа, все пятеро на уровне L; обновляется через --sim ---
# способности — наборы героев из design/ui/kits.js (ADR-0016) при доблести прототипа 2 / 1 / 2 / 1 / 3.
# На 155-м уровне осада не движется: отряд гибнет на 35-м этаже, не задев босса, а сид этажа тот же (ADR-0014)
# (уровень, забегов до падения босса, рядовых, элит, боссов, мс за эти забеги, стена)
SIM = [
    (1, 1, 4, 0, 0, 123400, 4), (5, 1, 5, 0, 0, 136300, 5), (10, 1, 10, 1, 0, 213600, 8),
    (15, 1, 13, 1, 0, 231900, 10), (20, 1, 16, 2, 0, 255200, 11), (30, 1, 23, 2, 0, 293200, 14),
    (35, 1, 27, 2, 0, 306200, 15), (43, 1, 40, 4, 0, 396900, 20), (50, 1, 40, 5, 0, 400700, 20),
    (60, 1, 40, 5, 0, 369800, 20), (65, 1, 50, 6, 0, 439800, 23), (75, 1, 57, 7, 0, 493300, 25),
    (90, 1, 65, 9, 0, 512700, 27), (100, 1, 74, 9, 0, 533000, 29), (110, 1, 78, 9, 0, 531500, 30),
    (120, 1, 80, 10, 0, 506800, 30), (150, 4, 407, 48, 1, 2387000, 35), (160, 2, 206, 24, 1, 1116800, 35),
    (200, 2, 208, 24, 1, 986200, 35), (210, 1, 104, 12, 1, 490400, 35), (250, 1, 104, 12, 1, 441300, 35),
    (300, 1, 104, 12, 1, 398700, 35), (350, 1, 104, 12, 1, 368800, 35), (500, 1, 104, 12, 1, 339600, 35),
    (700, 1, 104, 12, 1, 324800, 35), (1200, 1, 104, 12, 1, 295000, 35),
]
SIM_DEMO = (0, 1, 40, 5, 0, 382700, 20)     # отряд как в index.html, уровни 42 / 50 / 118 / 46 / 35
SIM_DEMO_TEMPO = (0, 1, 57, 6, 0, 260734, 25)  # тот же отряд в модели ADR-0007
SIM_GUARD = 41   # с какого уровня пара героев без доблести берёт рунного стража биома 1; обновляется через --sim
SIM_TUTOR = [   # обучающий биом цикла I, пара героев без доблести, один забег на уровне; обновляется через --sim
    (1, 0, 5, 0, 0, 69900, 5), (2, 0, 5, 0, 0, 74000, 5), (3, 0, 6, 1, 0, 84100, 6),
    (4, 0, 7, 1, 0, 86700, 7), (5, 0, 9, 1, 0, 95200, 8), (6, 0, 10, 1, 0, 100400, 8),
    (7, 0, 9, 1, 0, 99200, 8), (8, 0, 11, 1, 0, 108600, 9), (9, 0, 14, 1, 0, 117800, 10),
    (10, 0, 14, 1, 0, 118800, 10), (11, 0, 14, 1, 0, 121200, 10), (12, 0, 13, 1, 0, 129300, 10),
    (13, 0, 13, 2, 0, 123200, 10), (14, 0, 13, 2, 0, 123200, 10), (15, 0, 15, 2, 0, 140100, 11),
    (16, 0, 15, 2, 0, 133300, 11), (17, 0, 15, 2, 0, 129700, 11), (18, 0, 21, 2, 0, 165600, 14),
    (19, 0, 22, 2, 0, 164300, 15), (20, 0, 23, 2, 0, 163600, 15), (21, 0, 23, 2, 0, 151200, 15),
    (22, 0, 23, 2, 0, 160500, 15), (23, 0, 23, 2, 0, 160500, 15), (24, 0, 23, 2, 0, 159400, 15),
    (25, 0, 23, 2, 0, 159300, 15), (26, 0, 23, 2, 0, 159300, 15), (27, 0, 23, 2, 0, 152900, 15),
    (28, 0, 23, 2, 0, 148200, 15), (29, 0, 23, 2, 0, 147200, 15), (30, 0, 23, 2, 0, 146800, 15),
    (31, 0, 23, 2, 0, 145700, 15), (32, 0, 23, 2, 0, 145700, 15), (33, 0, 23, 2, 0, 146600, 15),
    (34, 0, 23, 2, 0, 146600, 15), (35, 0, 23, 2, 0, 148000, 15), (36, 0, 23, 2, 0, 148000, 15),
    (37, 0, 23, 2, 0, 148000, 15), (38, 0, 23, 2, 0, 145600, 15), (39, 1, 23, 2, 1, 145600, 15),
    (40, 1, 23, 2, 1, 141800, 15), (41, 1, 23, 2, 1, 141800, 15), (42, 1, 23, 2, 1, 141800, 15),
    (43, 1, 23, 2, 1, 141800, 15), (44, 1, 23, 2, 1, 132300, 15), (45, 1, 23, 2, 1, 131200, 15),
    (46, 1, 23, 2, 1, 131200, 15), (47, 1, 23, 2, 1, 131200, 15), (48, 1, 23, 2, 1, 128700, 15),
    (49, 1, 23, 2, 1, 128700, 15), (50, 1, 23, 2, 1, 126300, 15),
]
SIM_SHOW = [1, 10, 15, 35, 43, 65, 100, 110, 150, 160, 210, 350, 1200]
FULL_CLEAR_LEVEL = 210                         # первый уровень, на котором отряд берёт биом за один забег

# --- дроп: (золото, дух, души) ---
RATES_NOW = {'rf': (20, 10, 0), 'elite': (100, 50, 1), 'boss': (500, 250, 5), 'guard': (0, 0, 0)}    # §9.1
RATES_NEW = {'rf': (5, 10, 0), 'elite': (25, 50, 1), 'boss': (125, 250, 5), 'guard': (250, 500, 0)}  # предложение
GOLD_RATIO = [(5000, 'половина духа — предложение'), (10000, 'как дух'), (20000, 'вдвое больше духа, как в §9.1')]
RANKS = [('rf', 'Рядовой'), ('elite', 'Элита'), ('boss', 'Босс биома'), ('guard', 'Рунный страж, за победу')]

# --- рост по циклам ---
CYCLES, BIOMES_PER_CYCLE = 6, 2            # §1
OLD_CYCLE_MULT = [1, 3, 9, 27, 81, 243]   # старый ориентир §9.1: ×3 за цикл
BIOME2_ADD_BP = 5000                       # предложение: биом 1 цикла c — ×c, биом 2 — ×(c + 0,5)
POWER_X10 = [10, 16, 26, 41, 66, 105]      # кривая силы §3.3 × 10: во сколько враги цикла сильнее

# --- рунные стражи: §11 и черновик «Дроп» ---
GUARD_WINS = 7                              # побед в день у стража пределов: ~70 % капа 10 (§11)
GUARD_OPEN_DAY = 1                          # страж пределов в цикле II — с первого дня: его показало обучение
RUNES_PER_WIN = 2
RUNE_WEIGHT_BP = [4000, 2700, 1800, 1000, 500]
RUNE_REFORGE = 3                            # 3 младших -> 1 старшая
VALOR_FRAGS_X100 = 204                      # 2,04 осколка за победу в среднем (§11; 2,25 % не описаны)
VALOR_FRAGS = 100
VALOR_OPEN_DAY, VALOR_WINS = 1, 3           # страж доблести в цикле II — с первого дня; 7 + 3 = кап 10

# --- другие каналы (черновик «Дроп»); контракты — не заглушка, а прогон их сборщика ---
WEEK_DAYS = 7
# контракты открывает 10-й уровень аккаунта — начало цикла II (§16, §18). Доход — итог прогона tools/content-gen/contracts/build.js:
# design/ui/contracts.js, econ[цикл][профиль] — золото наград и сундуков, ставки заверения, дух. Файл читается при первом обращении:
# калькуляторы, что импортируют этот модуль (sets.py, echo.py, contracts/capacity.py), его не трогают — круга сборки нет
CONTRACTS_JS = ROOT / 'design' / 'ui' / 'contracts.js'
CONTRACT_CYCLE = 2
CONTRACT_PROFILES = (('обычный', 'o'), ('увлечённый', 'e'))
RITUAL_PER_HOUR, RITUAL_HOURS = (150, 75, 1), 12    # ритуал героев: золото, дух, души за час; верх сетки §19.4
CRAFT_BIOME = (3000, 1500, 2)               # закрытие крафтового биома
ACCOUNT_GOLD = 6000                         # предложение: база золота за уровень аккаунта
ACCOUNT_STEP_BP = 1000                      # §16: награда = база × (1 + уровень × 0,1)
ACCOUNT_LEVELS = 9                          # уровни 1–9 — в цикле I
FIRST_HERO_GOLD = 10000                     # квест первого героя, ADR-0007
TUTORIAL_SPIRIT = 2600                      # предложение: цепочка обучения §31 — первый герой до 50-го
ARTIFACTS_GOLD_C1 = 49000                   # таблица автора: покупка восьми артефактов, открытых с цикла I

# --- профили: часов забегов в день; забегов одновременно — у всех одинаково, по прогрессу ---
PROFILES = [('обычный', 3), ('увлечённый', 8)]
SLOTS = {1: 2, 2: 3, 3: 4}                  # забегов одновременно: номер цикла и ещё один от Странника (ADR-0014)
EXTRA_CAP = {1: 50, 2: 150, 3: 150}         # вторые отряды: руны уходят главному, выше предела им не подняться
# --- дневная модель — цикл II (ADR-0018): цикл I — обучение на часы, считается отдельно (Т15) ---
FIRST_CYCLE = 2                             # с какого цикла идёт счёт по дням
CYCLE_DAYS = 14                             # дней в цикле II: около двух недель по биомам, из них неделя — знакомство с полной неделей расы (автор, 28.09.2026)
START_LEVEL, START_LIMITS = 50, 1           # отряд входит в цикл II на 50-м, предел I пробит наградами уровня аккаунта
DAYS_MAX = 400                              # горизонт расчёта темпа

# --- цели темпа обычного игрока в цикле II и дальше (предложение: прежние вехи сдвинуты на цикл) и правило ×1,7 (§1.2, §36.1) ---
TARGETS = {150: '1-я неделя цикла II', 350: 'конец цикла II, 14-й день', 700: 'цикл III', 1200: 'не позже цикла IV'}
TARGET_SQUAD2, TARGET_GOLD_ALL = '1-я неделя цикла II', 'конец цикла II'
PAYER_MAX_X10 = 17
# случай: (подпись, день цикла II, отрядов у свободного, отрядов у плательщика)
PAYER_CASES = [('Цикл II, 1-й день: второй отряд ещё не куплен', 1, 1, 2), ('Цикл II, 7-й день: 2 отряда из 3', 7, 2, 3),
               ('Цикл II, 14-й день: 2 отряда из 3', 14, 2, 3), ('Цикл III, 25-й день: 3 отряда из 4', 25, 3, 4),
               ('Если бы слоты давали герои: 2 против 4, 14-й день', 14, 2, 4)]

# --- цена героя за золото: ADR-0023, «Второй круг», п. 1 — k-й герой цикла c стоит 10 000 × c × (1 + 30 % × (k − 1)) ---
HERO_FIRST = 10000                          # первый герой за золото цикла I (ADR-0014)
HERO_STEP_BP = 3000                         # каждый следующий герой цикла, по счёту покупки, дороже первого ещё на 30 %

# --- темп цикла I — решение автора 27.09.2026 (ADR-0018): цикл I — обучение, цикл II — испытание на дни ---
PACE_I = [('Биом 1 цикла I', 1), ('Биом 2 цикла I', 3)]   # часов игры на биом: первый — за час, второй — ещё около трёх
TUTOR_IDS = ['h1', 'h2']   # биом 1 закрывают двое героев — к концу часа их у игрока двое: танк и физ ДД из отряда прототипа (ADR-0018)

# --- базовые ресурсы по ADR-0010: малый шанс за взятый этаж ---
BASE_NOW_X100 = (200, 150)  # §9.1: рядовой 1–3, элита 1–2 — среднее на врага, в сотых
BASE_CHANCE_BP = 1000       # предложение: 10 % за этаж
BASE_AMOUNT_X100 = 200      # 1–3 штуки, в среднем 2

# ======================= РАСЧЁТ =======================


def iroot_ceil(x, q):
    """Наименьшее c >= 0, при котором c ** q >= x. Только целые."""
    if x <= 0:
        return 0
    hi = 1
    while hi ** q < x:
        hi *= 2
    lo = hi // 2
    while lo < hi:
        mid = (lo + hi) // 2
        if mid ** q >= x:
            hi = mid
        else:
            lo = mid + 1
    return lo


_CUM = {}


def cum(n, exp=LEVEL_EXP):
    """Дух от уровня 0 до n: сумма ceil(k ^ p/q) по целевым уровням k = 1..n."""
    if exp not in _CUM:
        p, q = exp
        acc, t = 0, [0]
        for k in range(1, LIMITS[-1] + 1):
            acc += iroot_ceil(k ** p, q)
            t.append(acc)
        _CUM[exp] = t
    return _CUM[exp][n]


def level_cost(n, exp=LEVEL_EXP):
    return cum(n, exp) - cum(n - 1, exp)


def proto_cum(n):
    """Прототип (index.html, lvlCost): переход l -> l+1 стоит ceil(l ^ 1,2), по текущему уровню."""
    return cum(n) - level_cost(n)


def sim_row(lvl):
    row = SIM[0]
    for r in SIM:
        if r[0] <= lvl:
            row = r
    return row


def yield_of(row, rates, mult_bp=BP):
    """Золото, дух, души за все забеги строки. Множитель биома — только на золото и дух."""
    rf, el, boss = row[2], row[3], row[4]
    g, s, d = (rf * rates['rf'][i] + el * rates['elite'][i] + boss * rates['boss'][i] for i in range(3))
    return g * mult_bp // BP, s * mult_bp // BP, d


def per_hour(row, rates, mult_bp=BP):
    return tuple(v * HOUR_MS // row[5] for v in yield_of(row, rates, mult_bp))


def full_run_spirit(rates=RATES_NOW):
    return yield_of(sim_row(FULL_CLEAR_LEVEL), rates)[1]


def with_gold(rates, ratio_bp):
    return {k: (v[1] * ratio_bp // BP, v[1], v[2]) for k, v in rates.items()}


def mult_now(cycle):
    return OLD_CYCLE_MULT[cycle - 1] * BP


def mult_new(cycle, biome=1):
    return cycle * BP + (biome - 1) * BIOME2_ADD_BP


def eff_level(lvl, cycle):
    """Уровень отряда цикла I, пересчитанный на врагов цикла cycle по кривой силы §3.3."""
    return max(1, (LEVEL_DIV + lvl) * POWER_X10[0] // POWER_X10[cycle - 1] - LEVEL_DIV)


def rune_days(wins, heroes=SQUAD, open_day=GUARD_OPEN_DAY, done=START_LIMITS):
    """День, к которому у отряда руны на каждый предел. Руны считаются в сотых. done — пределы, пробитые в цикле I: день 0."""
    n = len(LIMITS)
    per_win = [RUNES_PER_WIN * 100 * w // BP for w in RUNE_WEIGHT_BP]
    need = heroes * RUNES_PER_LIMIT * 100
    stock, nxt, out = [0] * n, done, [0] * done
    for d in range(open_day, open_day + DAYS_MAX):
        for k in range(n):
            stock[k] += per_win[k] * wins
        for _ in range(2):                   # второй проход — после перековки
            while nxt < n and stock[nxt] >= need:
                stock[nxt] -= need
                out.append(d)
                nxt += 1
            for k in range(min(nxt, n - 1)):  # руны уже пройденных пределов — в перековку вверх
                c = stock[k] // (RUNE_REFORGE * 100)
                stock[k] -= c * RUNE_REFORGE * 100
                stock[k + 1] += c * 100
        if nxt == n:
            break
    return out + [DAYS_MAX] * (n - len(out))


def valor_day():
    wins = -(-VALOR_FRAGS * 100 // (VALOR_WINS * VALOR_FRAGS_X100))
    return VALOR_OPEN_DAY + wins - 1, VALOR_FRAGS * 100 // VALOR_FRAGS_X100


def account_gold():
    steps = sum(BP + L * ACCOUNT_STEP_BP for L in range(1, ACCOUNT_LEVELS + 1))
    return ACCOUNT_GOLD * steps // BP + FIRST_HERO_GOLD


def timeline(rates, mult, hours, caps=True, exp=LEVEL_EXP, days=DAYS_MAX, cycle2=True, start_spirit=0):
    """Главный отряд A и вторые отряды B растут уровнями по мере дохода, весь дух сначала — A.
    Первый забег одновременно ведёт A, остальные — B. caps: A не выше предела, пока нет рун;
    B — не выше EXTRA_CAP. cycle2: после CYCLE_DAYS — следующий цикл, враги сильнее по §3.3.
    Счёт идёт с начала цикла II (ADR-0018): отряд входит на START_LEVEL, пределы START_LIMITS пробиты в обучении.
    Возвращает {уровень A: день}, золото нарастающим итогом по дням, уровни (A, B) по дням."""
    rd = rune_days(GUARD_WINS) if caps else [0] * len(LIMITS)
    a = b = START_LEVEL
    bank, gold, reached, gold_by_day, lv_by_day = start_spirit, 0, {}, [0], [(a, b)]
    for day in range(1, days + 1):
        c = FIRST_CYCLE + 1 if (cycle2 and day > CYCLE_DAYS) else FIRST_CYCLE
        cap_a = LIMITS[sum(1 for k in range(len(LIMITS) - 1) if rd[k] <= day)] if caps else LIMITS[-1]
        slots = SLOTS[c]
        if day >= GUARD_OPEN_DAY:
            bank += GUARD_WINS * rates['guard'][1] * mult(c) // BP
            gold += GUARD_WINS * rates['guard'][0] * mult(c) // BP
        for _ in range(hours):
            for k in range(slots):
                g, s, _ = per_hour(sim_row(eff_level(a if k == 0 else b, c)), rates, mult(c))
                bank += s
                gold += g
            while a < cap_a and bank >= SQUAD * level_cost(a + 1, exp):
                bank -= SQUAD * level_cost(a + 1, exp)
                a += 1
                if a in LIMITS and a not in reached:
                    reached[a] = day
            n_b = slots - 1
            while n_b and b < min(EXTRA_CAP[c], a) and bank >= n_b * SQUAD * level_cost(b + 1, exp):
                bank -= n_b * SQUAD * level_cost(b + 1, exp)
                b += 1
        gold_by_day.append(gold)
        lv_by_day.append((a, b))
        if a >= LIMITS[-1]:
            break
    return reached, gold_by_day, lv_by_day


def grind(to_lvl, rates, heroes=SQUAD):
    """Часы одного забега и забеги от 0 до to_lvl в биоме 1 цикла I, весь дух — отряду."""
    need = {}
    for n in range(1, to_lvl + 1):
        row = sim_row(max(n - 1, 1))
        need[row] = need.get(row, 0) + heroes * level_cost(n)
    ms = runs = 0
    for row, sp in need.items():
        s = yield_of(row, rates)[1]
        ms += -(-sp * row[5] // s)
        runs += sp * row[1] * 100 // s
    return ms, runs // 100


def day_reaches(series, amount):
    for d, v in enumerate(series):
        if v >= amount:
            return d
    return None


# ======================= ВЫВОД =======================


def fmt(n):
    return '—' if n is None else f'{n:,}'.replace(',', ' ')


def dec1(num, den):
    """num / den с одним знаком после запятой, целочисленно."""
    q = num * 10 // den
    return f'{q // 10}' if q % 10 == 0 else f'{q // 10},{q % 10}'


def ratio(num, den):
    q = num * 100 // den
    return f'×{q // 100},{q % 100:02d}'


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
    out += ['| ' + ' | '.join(str(x) for x in r) + ' |' for r in rows]
    return '\n'.join(out)


def t1_levels():
    rows, prev = [], 0
    for L in LIMITS:
        rows.append([L, fmt(level_cost(L)), fmt(cum(L) - cum(prev)), fmt(cum(L)), fmt(proto_cum(L))])
        prev = L
    return table(['Уровень', 'Цена этого уровня', 'Полоса от прошлого предела', 'С нуля', 'С нуля в прототипе'], rows)


def t2_valor():
    circle, fr = cum(LIMITS[-1]), full_run_spirit()
    rows = [[v, v + 1, fmt((v + 1) * circle), fmt((v + 1) * circle // fr), (v + 1) * len(LIMITS) * RUNES_PER_LIMIT, v]
            for v in VALOR_MAX]
    return table(['Максимум доблести', 'Кругов', 'Дух', 'Полных забегов', 'Рун пределов', 'Рун доблести'], rows)


def t3_collection():
    circle, fr = cum(LIMITS[-1]), full_run_spirit()

    def row(name, heroes, circles, spirit):
        return [name, heroes, circles, fmt(spirit), fmt(spirit // fr)]
    c1 = sum((v + 1) * n for v, n in HEROES_VALOR[1].items())
    ca = sum((v + 1) * n for m in HEROES_VALOR.values() for v, n in m.items())
    ha = sum(n for m in HEROES_VALOR.values() for n in m.values())
    mid, top, v = LIMITS[2], LIMITS[-1], TYPICAL_VALOR
    rows = [row(f'Отряд пяти до {mid}-го', SQUAD, '—', SQUAD * cum(mid)),
            row(f'Отряд пяти до {top}-го', SQUAD, SQUAD, SQUAD * circle),
            row(f'Отряд пяти, максимум {v}, до конца', SQUAD, SQUAD * (v + 1), SQUAD * (v + 1) * circle),
            row('Коллекция цикла I до конца', sum(HEROES_VALOR[1].values()), c1, c1 * circle),
            row('Все герои до конца', ha, ca, ca * circle)]
    return table(['Что', 'Героев', 'Кругов', 'Дух, цены цикла I', 'Полных забегов своего цикла'], rows)


def t4_sens():
    rows = []
    lo, mid, hi, top = LIMITS[0], LIMITS[2], LIMITS[3], LIMITS[-1]
    for e in SENS_EXPS:
        r, _, _ = timeline(RATES_NEW, mult_new, PROFILES[0][1], exp=e)
        rows.append([dec1(e[0], e[1]), fmt(cum(lo, e)), fmt(cum(mid, e)), fmt(cum(top, e)),
                     fmt(SQUAD * cum(mid, e)), r.get(mid), r.get(hi)])
    return table(['Показатель', f'До {lo}', f'До {mid}', f'Круг до {top}', f'Отряд до {mid}',
                  f'Отряд на {mid}-м, день', f'Отряд на {hi}-м, день'], rows)


def t5_sim():
    def row(label, r):
        _, runs, rf, el, boss, ms, w = r
        full = w == DECK['floors']
        kind = 'полный' if full and runs == 1 else f'осада, {runs} заб.' if full else f'{w}-й'
        return [label, kind, dec1(rf, runs), dec1(el, runs), f'1 за {runs}' if boss else '—',
                dec1(ms, runs * MINUTE_MS)]
    rows = [row(L, sim_row(L)) for L in SIM_SHOW]
    rows.append(row('демо 35–118', SIM_DEMO))
    rows.append(row('демо, модель ADR-0007', SIM_DEMO_TEMPO))
    return table(['Уровень отряда', 'Стена', 'Рядовых за забег', 'Элит', 'Босс', 'Забег, мин'], rows)


def t6_income(rates, hours, max_slots=4):
    rows = []
    for L in SIM_SHOW:
        r = sim_row(L)
        g, s, d = yield_of(r, rates)
        gh, sh, _ = per_hour(r, rates)
        rows.append([L, f'{fmt(g // r[1])} / {fmt(s // r[1])} / {dec1(d, r[1])}', fmt(gh), fmt(sh)]
                    + [fmt(sh * hours * k) for k in range(1, max_slots + 1)])
    return table(['Уровень отряда', 'За забег: золото / дух / души', 'Золото в час', 'Дух в час',
                  f'Дух за день, {hours} ч: 1 забег'] + [f'{k} забега' for k in range(2, max_slots + 1)], rows)


_CT = {}


def contracts_econ():
    """Итог прогона сборщика контрактов по циклам (contracts.js, econ). Читается при первом обращении."""
    if not _CT:
        text = CONTRACTS_JS.read_text(encoding='utf-8')
        head = 'window.EN_CONTRACTS = '
        line = next((x for x in text.splitlines() if x.startswith(head)), None)
        if line is None:
            sys.exit(f'{CONTRACTS_JS}: нет данных EN_CONTRACTS — собрать tools/content-gen/contracts/build.js')
        _CT.update(json.loads(line[len(head):].rstrip().rstrip(';')))
    return _CT['econ']


def pct_bp(bp):
    return f'{bp // 100} %' if bp % 100 == 0 else f'{bp // 100},{bp % 100 // 10} %'


def t7_other():
    rh, E = RITUAL_HOURS, contracts_econ()[str(CONTRACT_CYCLE)]
    rows = []
    for name, pk in CONTRACT_PROFILES:
        x = E[pk]
        rows.append([f'Контракты, цикл {ROMAN[CONTRACT_CYCLE - 1]}, {name}: неделя', fmt(x['gold'] - x['stake']), fmt(x['spirit']), '—',
                     f"дневной исполнен в {pct_bp(x['dayDoneBp'])} дней, недельный — в {pct_bp(x['weekDoneBp'])}; "
                     f"в день — {fmt(x['spirit'] // WEEK_DAYS)} духа" + ('; золото — за вычетом ставки заверения' if x['stake'] else '')])
    rows += [[f'Ритуал героев, {rh} ч', fmt(rh * RITUAL_PER_HOUR[0]), fmt(rh * RITUAL_PER_HOUR[1]), rh * RITUAL_PER_HOUR[2],
             'занимает героев'],
            ['Крафтовый биом, закрытие', fmt(CRAFT_BIOME[0]), fmt(CRAFT_BIOME[1]), CRAFT_BIOME[2], 'нужен рецепт и уникальный'],
            ['Рунный страж', 0, 0, 0, 'только руны и осколки'],
            ['Уровень аккаунта', '—', '—', '—', '§16: «даёт валюту», чисел нет']]
    return table(['Источник', 'Золото', 'Дух', 'Души', 'Замечание'], rows)


def t8_gap():
    rd = rune_days(GUARD_WINS)
    reg, _, _ = timeline(RATES_NOW, mult_now, PROFILES[0][1], cycle2=False)
    hc, _, _ = timeline(RATES_NOW, mult_now, PROFILES[1][1], cycle2=False)
    rows = []
    for i, L in enumerate(LIMITS):
        if L <= START_LEVEL:
            continue
        ms, runs = grind(L, RATES_NOW)
        rows.append([f'Отряд пяти на {L}-м', fmt(SQUAD * cum(L)), fmt(-(-ms // HOUR_MS)), fmt(runs),
                     reg.get(L, f'> {DAYS_MAX}'), hc.get(L, f'> {DAYS_MAX}'), rd[i - 1] if i else '—'])
    return table(['Веха', 'Дух', 'Часов забега', 'Забегов', 'День: обычный', 'День: увлечённый', 'Руны готовы, день'], rows)


def t9_rates():
    rows, circle, fr = [], cum(LIMITS[-1]), full_run_spirit(RATES_NEW)
    for c in range(1, CYCLES + 1):
        cells = [c]
        for b in range(1, BIOMES_PER_CYCLE + 1):
            m = mult_new(c, b)
            cells.append(' / '.join(fmt(RATES_NEW[k][1] * m // BP) for k, _ in RANKS))
        old = circle * BP // (fr * mult_now(c))
        new = c * circle * BP // (fr * mult_new(c))
        cells += [f'×{c}', fmt(c * circle), f'{fmt(old)} / {fmt(new)}']
        rows.append(cells)
    return table(['Цикл', 'Биом 1: рядовой / элита / босс / страж', 'Биом 2', 'Цена уровня героя цикла',
                  'Круг героя цикла, дух', 'Круг в полных забегах своего цикла: ×3 без цены цикла / предложение'], rows)


def hero_price(cycle, k):
    """Цена k-го героя за золото, купленного в цикле cycle (ADR-0023)."""
    return HERO_FIRST * cycle * (BP + (k - 1) * HERO_STEP_BP) // BP


def hero_total(cycle, n=None):
    """Первые n героев за золото цикла, по умолчанию все."""
    return sum(hero_price(cycle, k) for k in range(1, (GOLD_HEROES[cycle] if n is None else n) + 1))


def heroes_buy(budget, cycles, bought, limit=None):
    """Покупает на budget самых дешёвых следующих героев этих циклов, не больше limit штук; bought — уже куплено.
    Возвращает купленное по циклам и потраченное."""
    bought, spent = dict(bought), 0
    while limit is None or sum(bought.values()) < limit:
        cand = [(hero_price(c, bought.get(c, 0) + 1), c) for c in cycles if bought.get(c, 0) < GOLD_HEROES[c]]
        if not cand or spent + min(cand)[0] > budget:
            break
        price, c = min(cand)
        spent += price
        bought[c] = bought.get(c, 0) + 1
    return bought, spent


def t10_prices():
    marks = [1, 5, 10, 20]
    rows = [[CYCLE_NAMES[c - 1], n] + [fmt(hero_price(c, k)) if k <= n else '—' for k in marks] + [fmt(hero_price(c, n)),
            fmt(hero_total(c))] for c, n in sorted(GOLD_HEROES.items())]
    return table(['Цикл', 'Героев за золото'] + [f'{k}-й' for k in marks] + ['Последний', 'Все'], rows)


def t11_plan():
    rd = rune_days(GUARD_WINS)
    reg, gold, lv = timeline(RATES_NEW, mult_new, PROFILES[0][1])
    hc, _, _ = timeline(RATES_NEW, mult_new, PROFILES[1][1])
    acc = account_gold()
    first5 = hero_total(1, SQUAD)            # первый отряд — пачка обучения, первые пятеро цикла I
    _, next5 = heroes_buy(10 ** 12, (1, 2), {1: SQUAD}, 2 * SQUAD)   # второй — пятеро самых дешёвых следующих, циклы I и II
    vd, vw = valor_day()
    rows = []
    for i, L in enumerate(LIMITS):
        if L <= START_LEVEL:
            continue
        lock = 'дух' if (i == 0 or reg.get(L, 0) > rd[i - 1]) else 'руны ' + ROMAN[i - 1]
        rows.append([f'Отряд пяти на {L}-м', TARGETS[L], reg.get(L), hc.get(L), lock])
    rows.append(['Второй отряд: ещё 5 героев', TARGET_SQUAD2, day_reaches(gold, first5 + next5 - acc), '—', 'золото'])
    rows.append([f'{GOLD_HEROES[1]} героев за золото цикла I', TARGET_GOLD_ALL,
                 day_reaches(gold, hero_total(1) - acc), '—', 'золото'])
    rows.append(['Доблесть со стража доблести', f'цикл II, до {CYCLE_DAYS}-го дня', vd, vd, f'руна доблести: {vw} побед'])
    return table(['Веха', 'Цель', 'День: обычный', 'День: увлечённый', 'Замок у обычного'], rows)


def t12_payer():
    """Дух в день при равном времени: свободный и плательщик с одним прогрессом аккаунта.
    Плательщик раньше набирает героев на все слоты; сила героев от редкости не растёт (§3.2)."""
    _, _, lv = timeline(RATES_NEW, mult_new, PROFILES[0][1])
    h = PROFILES[0][1]

    def day_income(day, squads):
        a, b = lv[day]
        c = FIRST_CYCLE + 1 if day > CYCLE_DAYS else FIRST_CYCLE
        s = sum(per_hour(sim_row(eff_level(a if k == 0 else b, c)), RATES_NEW, mult_new(c))[1] for k in range(squads))
        return s * h + GUARD_WINS * RATES_NEW['guard'][1] * mult_new(c) // BP
    rows = []
    for name, day, f, p in PAYER_CASES:
        free, pay = day_income(day, f), day_income(day, p)
        ok = 'да' if pay * 10 <= free * PAYER_MAX_X10 else 'нет'
        rows.append([name, f'{f} / {p}', fmt(free), fmt(pay), ratio(pay, free), ok])
    return table(['Случай', 'Отрядов: свободный / плательщик', 'Дух в день: свободный', 'Плательщик',
                  'Отношение', 'Не больше ×1,7'], rows)


def t13_gold():
    """Золото до конца цикла II: обучение цикла I и CYCLE_DAYS дней цикла II. Стоки — артефакты цикла I и герои за золото
    циклов I и II по цене ADR-0023: пачка обучения в цикле I, дальше каждый раз — самый дешёвый следующий герой.
    Цен артефактов цикла II в расчёте нет."""
    acc = account_gold()
    all12 = hero_total(1) + hero_total(2)
    rows = []
    for rb, name in GOLD_RATIO:
        rates = with_gold(RATES_NEW, rb)
        _, g, _ = timeline(rates, mult_new, PROFILES[0][1])
        inc = g[CYCLE_DAYS] + acc
        pack = hero_total(1, SQUAD)
        bought, spent = heroes_buy(inc - ARTIFACTS_GOLD_C1 - pack, (1, 2), {1: SQUAD})
        rest = inc - ARTIFACTS_GOLD_C1 - pack - spent
        rows.append([name, fmt(g[CYCLE_DAYS]), fmt(acc), fmt(ARTIFACTS_GOLD_C1), f'{bought[1]} / {bought.get(2, 0)}',
                     fmt(pack + spent), fmt(rest), dec1((pack + spent) * 100, all12) + ' %'])
    return table(['Золото за врага', 'Биомы и страж, цикл II', 'Обучение, уровни аккаунта', 'Артефакты цикла I',
                  f'Героев за золото: цикла I из {GOLD_HEROES[1]} / цикла II из {GOLD_HEROES[2]}', 'Потрачено на героев',
                  'Остаток', f'Доля цены всех {GOLD_HEROES[1] + GOLD_HEROES[2]} героев циклов I–II, {fmt(all12)}'], rows)


def tutor_pace(rates=RATES_NEW, start_spirit=TUTORIAL_SPIRIT):
    """Обучающий биом с нуля (ADR-0018): дух обучения сразу в уровни, затем забег за забегом на текущем уровне отряда,
    дух за убитых — в уровни, не выше первого предела; до забега, где пал босс. Возвращает мс, забеги, уровень."""
    bank, a, ms, runs, n = start_spirit, 0, 0, 0, len(TUTOR_IDS)
    by_lvl = {r[0]: r for r in SIM_TUTOR}
    while by_lvl and runs < DAYS_MAX:
        while a < LIMITS[0] and bank >= n * level_cost(a + 1):
            bank -= n * level_cost(a + 1)
            a += 1
        row = by_lvl[max(a, 1)]
        runs += 1
        ms += row[5]
        bank += (row[2] * rates['rf'][1] + row[3] * rates['elite'][1] + row[4] * rates['boss'][1]) * mult_new(1) // BP
        if row[1]:
            return ms, runs, a
    return None


def t15_tutor():
    """Цель автора — биом 1 цикла I за час — против прогона обучающего биома."""
    got = tutor_pace()
    first = next((r for r in SIM_TUTOR if r[1]), None)
    goal = PACE_I[0][1]
    if not got:
        return table(['Веха', 'Цель автора', 'Итог'], [[PACE_I[0][0], f'{goal} ч', 'не пройден']])
    ms, runs, lvl = got
    duo = f'{len(TUTOR_IDS)} героя'
    rows = [[PACE_I[0][0], f'{goal} ч', duo, f'{dec1(ms, MINUTE_MS)} мин, {runs} заб.', lvl, f'{first[0]}-й' if first else '—',
             'в срок' if ms <= goal * HOUR_MS else 'дольше цели'],
            ['Рунный страж биома 1', 'после биома', duo, '—', '—', f'{SIM_GUARD}-й' if SIM_GUARD else 'не берётся',
             'по силам' if SIM_GUARD and SIM_GUARD <= LIMITS[0] else 'не по силам'],
            [PACE_I[1][0], f'ещё {PACE_I[1][1]} ч', '5 героев: ещё трое до полной пачки', 'биома нет в прототипе', '—', '—', '—']]
    return table(['Веха', 'Цель автора', 'Отряд', 'С нуля до победы', 'Уровень отряда', 'Берётся за забег с уровня', 'Итог'], rows)


def t14_drop():
    fr = sim_row(FULL_CLEAR_LEVEL)
    base_now = (fr[2] * BASE_NOW_X100[0] + fr[3] * BASE_NOW_X100[1]) // 100
    base_new = DECK['floors'] * BASE_CHANCE_BP * BASE_AMOUNT_X100 // (BP * 100)
    souls = yield_of(fr, RATES_NEW)[2]
    src = f"{DECK['elite']} элит по {RATES_NEW['elite'][2]} + босс {RATES_NEW['boss'][2]}"
    rows = [['Души', souls, src, fmt(per_hour(fr, RATES_NEW)[2])],
            ['Базовые ресурсы, §9.1', base_now, 'рядовой 1–3, элита 1–2', fmt(base_now * HOUR_MS // fr[5])],
            ['Базовые ресурсы, ADR-0010', base_new, f'{BASE_CHANCE_BP // 100} % за этаж, 1–3 штуки',
             fmt(base_new * HOUR_MS // fr[5])]]
    return table([f'Полный забег, уровень {FULL_CLEAR_LEVEL}', 'Штук', 'Откуда', 'В час'], rows)


def main():
    check_csv()
    exp = dec1(LEVEL_EXP[0], LEVEL_EXP[1])
    h = PROFILES[0][1]
    parts = [(f'Т1. Цена уровня духом, показатель {exp}', t1_levels()),
             ('Т2. Круг и доблесть: один герой цикла I', t2_valor()),
             ('Т3. Отряд и коллекция', t3_collection()),
             ('Т4. Чувствительность к показателю: обычный игрок, ставки предложения', t4_sens()),
             ('Т5. Прогон «10 раундов», образец биома цикла II', t5_sim()),
             ('Т6. Доход по §9.1 сейчас; 2–4 забега — на уровне того же отряда', t6_income(RATES_NOW, h)),
             ('Т7. Другие каналы: контракты — прогон их сборщика, остальное — черновик «Дроп»', t7_other()),
             ('Т8. Разрыв: вехи на числах §9.1, цикл II', t8_gap()),
             ('Т9. Предложение: дух за врага по циклам', t9_rates()),
             ('Т10. Цена героя за золото: k-й герой цикла — 10 000 × цикл × (1 + 30 % × (k − 1)), ADR-0023', t10_prices()),
             ('Т11. Предложение: темп по вехам, цикл II', t11_plan()),
             (f'Т12. Правило ×1,7: дух в день при равном времени, {h} ч', t12_payer()),
             ('Т13. Золото обычного игрока до конца цикла II', t13_gold()),
             ('Т14. Души и базовые ресурсы за забег', t14_drop()),
             ('Т15. Темп цикла I: обучающий биом с нуля', t15_tutor())]
    for title, body in parts:
        print(f'\n### {title}\n\n{body}')
    print(f'\nРуны на пределы I–V: отряд пяти — дни {rune_days(GUARD_WINS)}, один герой — '
          f'{rune_days(GUARD_WINS, 1)}, отряд при 10 победах — {rune_days(10)}.')


def check_csv():
    """HEROES_VALOR берётся из черновика герои.csv, GOLD_HEROES — из состава героев состав-героев.csv."""
    path = ROOT / 'docs' / 'content' / 'герои' / 'герои.csv'
    if path.exists():
        val = {}
        for r in csv.DictReader(path.open(encoding='utf-8-sig')):
            val.setdefault(int(r['цикл']), Counter())[int(r['максимум доблести'])] += 1
        if {c: dict(m) for c, m in val.items()} != HEROES_VALOR:
            print('!! HEROES_VALOR разошлись с герои.csv — обновите данные', file=sys.stderr)
    path = ROOT / 'docs' / 'content' / 'герои' / 'состав-героев.csv'
    if path.exists():
        gold = Counter(CYCLE_NAMES.index(r['цикл']) + 1 for r in csv.DictReader(path.open(encoding='utf-8-sig'))
                       if r['источник'].startswith('золото'))
        if dict(gold) != GOLD_HEROES:
            print('!! GOLD_HEROES разошлись с состав-героев.csv — обновите данные', file=sys.stderr)


# ======================= ПРОГОН БОЯ (--sim) =======================

SIM_JS = r"""
globalThis.window = globalThis;
require('./design/ui/abilities.js'); require('./design/ui/kits.js'); require('./design/ui/battle.js');
const EB = globalThis.EnBattle;
const A = a => a.map(n => ({ n })), P = a => a.map(n => ({ n, t: 'боевая' }));
// фикстура S.heroes из design/ui/index.html: характеристики, доблесть, черновик героя — от него набор способностей (kits.js, ADR-0016).
// ab, pas и ult — прежняя библиотека: на ней идёт только модель темпа ADR-0007
const SQUAD = [
  { id: 'h1', name: 'Гарт Нишевой', cls: 'Танк', el: 'Земля', draft: 'h01_2', lvl: 42, valor: 2, st: [128, 54, 72, 246, 62], ab: A(['Вызов', 'Удар щитом', 'Осыпание']), pas: P(['Несгибаемость']), ult: null },
  { id: 'h2', name: 'Хравн Сборщик', cls: 'Физ. ДД ловкости', fx: 'melee', el: 'Огонь', draft: 'h01_3', lvl: 50, valor: 1, st: [128, 54, 245, 72, 62], ab: A(['Горение', 'Быстрый выпад', 'Погребальный костёр']), pas: P(['Точность']), ult: null },
  { id: 'h3', name: 'Лаэйра', cls: 'Маг. ДД', el: 'Время', draft: 'h01_5', lvl: 118, valor: 2, st: [72, 246, 54, 62, 128], ab: A(['Разряд', 'Остановка']), pas: P(['Средоточие']), ult: { n: 'Испепеление', at: 5 } },
  { id: 'h4', name: 'Ильмерра', cls: 'Хилер', el: 'Воздух', draft: 'h01_1', lvl: 46, valor: 1, st: [62, 246, 54, 128, 72], ab: A(['Живая вода', 'Лёгкая поступь', 'Оберег']), pas: P(['Отклик']), ult: null },
  { id: 'h5', name: 'Мирт Переписчик', cls: 'Контроль', el: 'Вода', draft: 'h01_4', lvl: 35, valor: 3, st: [62, 246, 54, 128, 72], ab: A(['Оковы', 'Стужа', 'Ослабление']), pas: P(['Тень']), ult: { n: 'Ледяные оковы', at: 2 } },
];
// один забег; добыча как в ядре (floorLoot): по рангу убитой карты — рядовой, элита, босс
function run(heroes, siege, mode) {
  const B = EB.BIOMES.c2, k = { rf: 0, el: 0, boss: 0 }; let cur = heroes.map(h => EB.heroSrc(h)), ms = 0, wall = 0, hp = siege;
  for (let f = 1; f <= B.floors.length; f++) {
    const b = EB.run(EB.floorBattle(cur, 'c2', f, hp, mode)), g = B.floors[f - 1].g;
    ms += b.t + (f < B.floors.length ? EB.RULES.floor.gapMs : 0);
    b.u[1].forEach(u => { if (!u.alive) { if (u.rank === 'e') k.el++; else if (u.rank === 'b') k.boss++; else k.rf++; } });
    if (g === 'b') hp = b.u[1][0].alive ? b.u[1][0].hp : 0;
    cur = EB.carry(cur, b); wall = f;
    if (!b.win) break;
  }
  return { k, ms, wall, hp };
}
// осада: забеги подряд, пока босс не пал. Сценарий детерминирован, поэтому стена до босса — один забег
function campaign(heroes, mode) {
  let siege = null; const t = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 60; i++) {
    const r = run(heroes, siege, mode);
    t[1]++; t[2] += r.k.rf; t[3] += r.k.el; t[4] += r.k.boss; t[5] += r.ms; t[6] = r.wall;
    if (r.wall < EB.BIOMES.c2.floors.length || r.k.boss > 0) break;
    siege = r.hp;
  }
  return t;
}
const out = [];
for (const L of LEVELS) { const t = campaign(SQUAD.map(h => Object.assign({}, h, { lvl: L })), 'rounds'); t[0] = L; out.push(t); }
out.push(campaign(SQUAD, 'rounds'), campaign(SQUAD, 'tempo'));
// обучающий биом цикла I (ADR-0018): один забег на уровне L, отряд без доблести; (уровень, победа, рядовых, элит, боссов, мс, стена)
const tutor = [], TUTOR = SQUAD.filter(h => TUTOR_IDS.includes(h.id));
for (let L = 1; L <= TUTOR_MAX; L++) {
  const B = EB.BIOMES.b1, k = { rf: 0, el: 0, boss: 0 }; let cur = TUTOR.map(h => EB.heroSrc(Object.assign({}, h, { lvl: L, valor: 0 }))), ms = 0, wall = 0, win = 0;
  for (let f = 1; f <= B.floors.length; f++) {
    const b = EB.run(EB.floorBattle(cur, 'b1', f, null, 'rounds'));
    ms += b.t + (f < B.floors.length ? EB.RULES.floor.gapMs : 0);
    b.u[1].forEach(u => { if (!u.alive) { if (u.rank === 'e') k.el++; else if (u.rank === 'b') k.boss++; else k.rf++; } });
    cur = EB.carry(cur, b); wall = f;
    if (!b.win) break;
    if (f === B.floors.length) win = 1;
  }
  tutor.push([L, win, k.rf, k.el, k.boss, ms, wall]);
}
let guard = null;   // с какого уровня пара героев без доблести берёт рунного стража биома 1
for (let L = 1; L <= TUTOR_MAX && guard == null; L++) if (EB.run(EB.guardBattle(TUTOR.map(h => EB.heroSrc(Object.assign({}, h, { lvl: L, valor: 0 }))), 'b1', 'rounds')).win) guard = L;
console.log(JSON.stringify({ out, tutor, guard }));
"""


def measure():
    js = SIM_JS.replace('LEVELS', json.dumps([r[0] for r in SIM])).replace('TUTOR_MAX', str(LIMITS[0])).replace('TUTOR_IDS', json.dumps(TUTOR_IDS))
    res = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        sys.exit(res.stderr)
    data = json.loads(res.stdout)
    rows = data['out']
    print('SIM = [')
    for r in rows[:-2]:
        print(f'    {tuple(r)},')
    print(']')
    print(f'SIM_DEMO = {tuple(rows[-2])}')
    print(f'SIM_DEMO_TEMPO = {tuple(rows[-1])}')
    print('SIM_TUTOR = [')
    for r in data['tutor']:
        print(f'    {tuple(r)},')
    print(']')
    print(f"SIM_GUARD = {data['guard']}")


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if '--sim' in sys.argv:
        measure()
    else:
        main()
