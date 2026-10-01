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
TYPICAL_VALOR = 3                     # самый частый максимум у сборных героев состава — рулетка, Эхо, крафт: 32 героя из 108
ROMAN = ['I', 'II', 'III', 'IV', 'V']

# --- герои: состав игры docs/content/герои/состав-героев.csv (при запуске сверяется) — личный максимум по источнику (ADR-0019;
# ADR-0030, п. 5а): золото — 1, рулетка по циклу II — 2, III–IV — 3, V–VI — 4, Эхо и донат — номер цикла − 1, крафт — 1–5 ---
HEROES_VALOR = {1: {1: 18, 2: 2, 5: 2}, 2: {1: 56, 2: 11, 5: 2}, 3: {1: 41, 2: 14, 3: 9, 4: 1},
                4: {1: 40, 3: 24, 5: 2}, 5: {1: 48, 3: 3, 4: 21, 5: 3}, 6: {1: 41, 3: 1, 4: 6, 5: 15}}   # цикл -> {максимум: героев}
# --- герои за золото: docs/content/герои/состав-героев.csv (при запуске сверяется) ---
GOLD_HEROES = {1: 18, 2: 42, 3: 40, 4: 40, 5: 47, 6: 40}   # цикл -> героев за золото
CYCLE_NAMES = ['I', 'II', 'III', 'IV', 'V', 'VI']

# --- колода Мастерской форм, design/ui/battle.js FLOORS: 104 рядовых, 12 элит (ADR-0011: на 15-м и 20-м по две, на 25-м и 30-м по три), босс ---
DECK = {'rf': 104, 'elite': 12, 'boss': 1, 'floors': 35}

# --- прогон модели раундов (simRun) отрядом прототипа, все пятеро на уровне L; обновляется через --sim ---
# раунды — по типу этажа (RULES.rounds.by, решение автора 29.09.2026): рядовые 5, элита 10, босс 20; босс образца — 3 000 %
# способности — наборы героев состава из design/ui/kits.js (ADR-0016; ADR-0031, п. 7: набор сжат к личному максимуму доблести);
# отряд — реальный (ADR-0031, п. 1): пятеро золотых героев цикла I с максимумом доблести 1, доблесть 0 / 1 / 0 / 0 / 0 — единица у бойца
# урона пары от руны обучения; фикстура — tools/content-gen/biomes/sim.js, SQUAD. Доли хода — по редкости героя в составе
# (ADR-0030, п. 5а): обычная, обычная, редкая, редкая, редкая. Доблесть — правило ядра (RULES.valorPct, EB.heroSrcValor)
# (уровень, забегов до падения босса, рядовых, элит, боссов, мс за эти забеги, стена)
SIM = [
    (1, 1, 1, 0, 0, 53200, 2), (5, 1, 4, 0, 0, 78900, 4), (10, 1, 6, 1, 0, 123900, 6),
    (15, 1, 10, 1, 0, 163700, 8), (20, 1, 12, 1, 0, 174900, 9), (30, 1, 16, 2, 0, 201900, 11),
    (35, 1, 19, 2, 0, 226000, 12), (43, 1, 22, 2, 0, 214800, 13), (50, 1, 35, 4, 0, 335400, 18),
    (60, 1, 38, 4, 0, 335000, 19), (65, 1, 47, 6, 0, 416500, 22), (75, 1, 44, 6, 0, 357900, 21),
    (90, 1, 66, 9, 0, 495900, 27), (100, 1, 71, 9, 0, 504500, 28), (110, 1, 72, 9, 0, 489200, 28),
    (120, 1, 72, 9, 0, 469700, 28), (125, 1, 92, 12, 0, 635200, 33), (130, 3, 306, 36, 1, 2161500, 35),
    (140, 2, 206, 24, 1, 1410000, 35), (150, 1, 104, 12, 1, 707600, 35), (160, 1, 104, 12, 1, 665000, 35),
    (200, 1, 104, 12, 1, 569800, 35), (210, 1, 104, 12, 1, 537700, 35), (250, 1, 104, 12, 1, 486200, 35),
    (300, 1, 104, 12, 1, 423300, 35), (350, 1, 104, 12, 1, 359400, 35), (500, 1, 104, 12, 1, 318400, 35),
    (700, 1, 104, 12, 1, 310500, 35), (1200, 1, 104, 12, 1, 288300, 35),
]
SIM_DEMO = (0, 1, 35, 4, 0, 307900, 18)    # отряд как в index.html, уровни 42 / 50 / 118 / 46 / 35
SIM_DEMO_TEMPO = (0, 1, 67, 9, 0, 297448, 27)    # тот же отряд в модели ADR-0007
SIM_GUARD = 41   # с какого уровня пара героев без доблести берёт рунного стража биома 1; обновляется через --sim
SIM_TUTOR = [   # обучающий биом цикла I, пара героев без доблести, один забег на уровне; обновляется через --sim
    (1, 0, 4, 0, 0, 49500, 4), (2, 0, 4, 0, 0, 47600, 4), (3, 0, 4, 0, 0, 44600, 4),
    (4, 0, 8, 1, 0, 95200, 7), (5, 0, 10, 1, 0, 110200, 8), (6, 0, 10, 1, 0, 107400, 8),
    (7, 0, 12, 1, 0, 122600, 9), (8, 0, 13, 1, 0, 135900, 10), (9, 0, 13, 1, 0, 135400, 10),
    (10, 0, 15, 2, 0, 145500, 11), (11, 0, 15, 2, 0, 146800, 11), (12, 0, 15, 2, 0, 143800, 11),
    (13, 0, 15, 2, 0, 140200, 11), (14, 0, 17, 2, 0, 154800, 12), (15, 0, 19, 2, 0, 167300, 13),
    (16, 0, 21, 2, 0, 177100, 14), (17, 0, 21, 2, 0, 171900, 14), (18, 0, 21, 2, 0, 168600, 14),
    (19, 0, 23, 2, 0, 181200, 15), (20, 0, 23, 2, 0, 166800, 15), (21, 0, 23, 2, 0, 187000, 15),
    (22, 0, 23, 2, 0, 184600, 15), (23, 0, 23, 2, 0, 194400, 15), (24, 0, 23, 2, 0, 185000, 15),
    (25, 0, 23, 2, 0, 178400, 15), (26, 0, 23, 2, 0, 192500, 15), (27, 0, 23, 2, 0, 191800, 15),
    (28, 0, 23, 2, 0, 187900, 15), (29, 0, 23, 2, 0, 187100, 15), (30, 0, 23, 2, 0, 188000, 15),
    (31, 0, 23, 2, 0, 188900, 15), (32, 0, 23, 2, 0, 183500, 15), (33, 1, 23, 2, 1, 183000, 15),
    (34, 1, 23, 2, 1, 183100, 15), (35, 1, 23, 2, 1, 181100, 15), (36, 1, 23, 2, 1, 181100, 15),
    (37, 1, 23, 2, 1, 174900, 15), (38, 1, 23, 2, 1, 173400, 15), (39, 1, 23, 2, 1, 172200, 15),
    (40, 1, 23, 2, 1, 172200, 15), (41, 1, 23, 2, 1, 170700, 15), (42, 1, 23, 2, 1, 167000, 15),
    (43, 1, 23, 2, 1, 167000, 15), (44, 1, 23, 2, 1, 159700, 15), (45, 1, 23, 2, 1, 158600, 15),
    (46, 1, 23, 2, 1, 155500, 15), (47, 1, 23, 2, 1, 155500, 15), (48, 1, 23, 2, 1, 150600, 15),
    (49, 1, 23, 2, 1, 150600, 15), (50, 1, 23, 2, 1, 150600, 15),
]
SIM_SHOW = [1, 10, 15, 35, 43, 65, 100, 110, 120, 125, 150, 160, 210, 350, 1200]
FULL_CLEAR_LEVEL = next(r[0] for r in SIM if r[1] == 1 and r[4])   # первый уровень, на котором отряд берёт биом за один забег (SIM)

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

# --- рунные стражи: §11, ADR-0022, ADR-0023 (вариант Б), ADR-0031, п. 4. Числа стражей — данные рецептов design/ui/recipes.js
# (drops.guardians, dailyGuardianCap, enemies[].boss.runeKeyBp, рецепты рун), читаются при первом обращении (rx()); здесь — допущения модели.
# Победы у рунных стражей — из ключей, а не из капа: ключи дня — контракты (прогон их сборщика) и ключ с босса биома за вчерашние забеги;
# побед — сколько хватит ключей при доле 7 : 3, не выше общего капа. Вход — × цикл стража; отряд цикла I в биомах цикла II платит
# вход стражей цикла II: цены уровней у отряда — как у героев цикла I, вход к стражам — как у цикла II (ADR-0031, п. 4)
GUARD_OPEN_DAY = 1                          # стражи в цикле II — с первого дня: их показало обучение
RB_SPLIT_BP = 7000                          # допущение: доля побед у стража пределов — 7 из 10, остальное — страж доблести
                                            # (и до пятого предела: осколки копятся впрок, доблесть откроет пятый предел)

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
# --- цикл I — сценарий «Старт с чистого листа» (01.10.2026): уровни Странника 1–10, их награды и темп биомов 1–2 на настоящих боях считает
# сборщик tools/content-gen/start/build.js и пишет в tools/content-gen/start/start.json. Отсюда — золото и дух обучения, темп Т15 и коридоры.
# Нет файла — прежние допущения ниже (ACCOUNT_*, FIRST_HERO_GOLD, TUTORIAL_SPIRIT_FALLBACK, коридоры)
START_JSON = ROOT / 'tools' / 'content-gen' / 'start' / 'start.json'


def _start_json():
    try:
        return json.loads(START_JSON.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


START = _start_json()
ACCOUNT_GOLD = 6500                         # §16: «Дар Страннику» — база × (1 + уровень × 0,1) золота; та же база — FORMULA.giftGold сценария
ACCOUNT_STEP_BP = 1000                      # §16: награда = база × (1 + уровень × 0,1)
ACCOUNT_LEVELS = 9                          # запасное: уровни 1–9 — в цикле I (сценарий берёт 1–10: десятый — страж Подземного леса)
FIRST_HERO_GOLD = 10000                     # квест первого героя, ADR-0007: в сценарии — награда уровня 1 сверх дара
TUTORIAL_SPIRIT_FALLBACK = 1600             # запасное: дух цепочки обучения сразу паре
# дух обучения — награды уровней сценария (100 + 700 + 500 на уровнях 1–3); прежде — 1 600 сразу паре
TUTORIAL_SPIRIT = START.get('trainSpirit', TUTORIAL_SPIRIT_FALLBACK)
ARTIFACTS_GOLD_C1 = 49000                   # таблица автора: покупка восьми артефактов, открытых с цикла I

# --- профили: часов забегов в день; забегов одновременно — у всех одинаково, по прогрессу ---
PROFILES = [('обычный', 3), ('увлечённый', 8)]
PROFILE_KEY = {'обычный': 'o', 'увлечённый': 'e', 'плательщик': 'p'}   # профиль калькулятора → профиль прогона контрактов (econ)
# забегов одновременно — столько, каков номер цикла (ADR-0014; ADR-0031, п. 3): recipes.js, drops.activeSlots.byCycle — rx().
# «Право владыки» — редкая вневременная пассивка Памяти (+1 забег, только бесплатные тройки): калькуляторы её не считают
EXTRA_CAP = {1: 50, 2: 150, 3: 150}         # вторые отряды: руны уходят главному, выше предела им не подняться
# --- дневная модель — цикл II (ADR-0018): цикл I — обучение на часы, считается отдельно (Т15) ---
FIRST_CYCLE = 2                             # с какого цикла идёт счёт по дням
# дней в цикле II — одно число на все калькуляторы: прогон темпа (tools/content-gen/biomes/pace.py → pace.json, cycleDays), день, когда
# обычный игрок берёт рунного стража последнего биома цикла II. Остальные калькуляторы читают economy.CYCLE_DAYS; нет прогона — запасное
PACE_JSON = ROOT / 'tools' / 'content-gen' / 'biomes' / 'pace.json'
CYCLE_DAYS_FALLBACK = 14                    # «около двух недель» (автор, 28.09.2026) — пока нет прогона темпа
START_LEVEL, START_LIMITS = 50, 1           # отряд входит в цикл II на 50-м, предел I пробит наградами уровня аккаунта
DAYS_MAX = 400                              # горизонт расчёта темпа

# --- цели темпа обычного игрока в цикле II и дальше (предложение: прежние вехи сдвинуты на цикл) и правило ×1,7 (§1.2, §36.1) ---
TARGETS = {150: '1-я неделя цикла II', 350: 'конец цикла II', 700: 'цикл III', 1200: 'не позже цикла IV'}
TARGET_SQUAD2, TARGET_GOLD_ALL = '1-я неделя цикла II', 'конец цикла II'
PAYER_MAX_X10 = 17
# случай: (подпись, день с начала цикла II — 0 значит последний день цикла II, CYCLE_DAYS; с '+' — день цикла III,
# отрядов у свободного, отрядов у плательщика). Слотов — номер цикла: у плательщика лишний отряд только до покупки второго
PAYER_CASES = [('Цикл II, 1-й день: второй отряд ещё не куплен', 1, 1, 2), ('Цикл II, 7-й день: 2 отряда из 2', 7, 2, 2),
               ('Цикл II, последний день: 2 отряда из 2', 0, 2, 2), ('Цикл III, 1-й день: третий отряд ещё не куплен', '+1', 2, 3),
               ('Если бы слоты давали герои: 2 против 4, последний день цикла II', 0, 2, 4)]

# --- цена героя за золото: ADR-0023, «Второй круг», п. 1 — k-й герой цикла c стоит 10 000 × c × (1 + 30 % × (k − 1)) ---
HERO_FIRST = 10000                          # первый герой за золото цикла I (ADR-0014)
HERO_STEP_BP = 3000                         # каждый следующий герой цикла, по счёту покупки, дороже первого ещё на 30 %

# --- темп цикла I — решение автора 27.09.2026 (ADR-0018): цикл I — обучение, цикл II — испытание на дни ---
PACE_I = [('Биом 1 цикла I', 1), ('Биом 2 цикла I', 3)]   # часов игры на биом: первый — за час, второй — ещё около трёх
# коридоры темпа (ADR-0031, п. 5) — минуты забегов: биом 1 — 7–10 минут боя (ADR-0018, дополнение: остальное время первого часа —
# сценарий обучения), биом 2 — от полутора до трёх часов («ещё примерно за три», ADR-0018); цикл II у обычного — 14–16 дней.
# Проверка — tools/content-gen/biomes/pace.py --check
PACE_B1_MIN, PACE_B2_MIN, PACE_II_DAYS = (7, 10), (90, 180), (14, 16)
# коридоры цикла I — одни со сценарием (tools/content-gen/start/data.js, PACE): он и меряет биомы 1–2 настоящими боями
PACE_B1_MIN = tuple(START.get('pace', {}).get('b1', PACE_B1_MIN))
PACE_B2_MIN = tuple(START.get('pace', {}).get('b2', PACE_B2_MIN))
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


_RX = {}


def rx():
    """Числа рецептов и добычи из design/ui/recipes.js (EN_RECIPES): стражи пределов и доблести, общий кап побед, шанс рунного ключа
    с босса, забегов одновременно по циклам, рецепты руны доблести и перековки рун. Читается один раз через Node; калькуляторы
    своих копий не держат (ручка — tools/content-gen/recipes/common.js, затем пересобрать рецепты)."""
    if not _RX:
        js = ("globalThis.window=globalThis;require('./design/ui/recipes.js');const R=globalThis.EN_RECIPES,D=R.drops;"
              "const rec=id=>R.recipes.find(r=>r.id===id);"
              "process.stdout.write(JSON.stringify({guardians:D.guardians,cap:D.dailyGuardianCap,enemies:D.enemies,"
              "slots:D.activeSlots.byCycle,valorRune:rec('r_vr1').in[0][1],reforge:rec('r_rn1_2').in[0][1]}))")
        res = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
        if res.returncode:
            sys.exit('economy.py: не прочитать design/ui/recipes.js — ' + res.stderr)
        d = json.loads(res.stdout)
        lim = next(g for g in d['guardians'] if g['kind'] == 'limits')
        val = next(g for g in d['guardians'] if g['kind'] == 'valor')
        boss = next(e for e in d['enemies'] if e['cyc'] == FIRST_CYCLE)['boss']
        _RX.update({
            'cap': d['cap'],                                              # общий кап побед у РБ в день (ADR-0022)
            'entry': (lim['entryKeys'] // lim['cyc'], val['entryKeys'] // val['cyc']),   # ключей × цикл: страж пределов, страж доблести
            'runes_per_win': lim['runesPerKill'], 'weights': lim['weightsBp'],
            'shards_x100': sum(n * bp for n, bp in val['shardsBp']) // 100,   # осколков доблести за победу, в среднем × 100
            'shards_bp': val['shardsBp'],
            'boss_key_bp': boss['runeKeyBp'],                             # шанс рунного ключа с босса биома; ключей — цикл биома
            'slots': {c + 1: n for c, n in enumerate(d['slots'])},        # забегов одновременно по циклам
            'valor_rune': d['valorRune'], 'reforge': d['reforge'],
        })
    return _RX


def slots(c):
    """Забегов одновременно в цикле c — номер цикла (ADR-0014; ADR-0031, п. 3), recipes.js drops.activeSlots."""
    return rx()['slots'][c]


def cycle_days_of_pace():
    """Дней в цикле II по прогону темпа (pace.json, cycleDays): обычный игрок берёт стража последнего биома цикла II."""
    try:
        v = json.loads(PACE_JSON.read_text(encoding='utf-8')).get('cycleDays')
        return int(v) if v else CYCLE_DAYS_FALLBACK
    except (OSError, ValueError):
        return CYCLE_DAYS_FALLBACK


CYCLE_DAYS = cycle_days_of_pace()


def account_gold():
    """Золото наградами уровней Странника цикла I: сценарий (start.json, уровни 1–10) или прежнее допущение — дар 1–9 и первый герой."""
    if START.get('account'):
        return START['account']['gold']
    steps = sum(BP + L * ACCOUNT_STEP_BP for L in range(1, ACCOUNT_LEVELS + 1))
    return ACCOUNT_GOLD * steps // BP + FIRST_HERO_GOLD


def avg_price_x100(c):
    """Средняя цена входа к РБ цикла c в ключах × 100 при доле побед 7 : 3 (вариант Б: 1 и 3 ключа × цикл)."""
    p1, p2 = rx()['entry']
    return (RB_SPLIT_BP * p1 * c + (BP - RB_SPLIT_BP) * p2 * c) * 100 // BP


def contract_keys_x100(c, prof):
    """Ключей режима «Контракты» за день × 100 — прогон сборщика контрактов (contracts.js, econ[цикл][профиль].ctKeys) на 7 дней.
    Контракты открывает 10-й уровень аккаунта — с цикла II (§16, §18)."""
    e = contracts_econ().get(str(c), {}).get(prof)
    return e['ctKeys'] * 100 // WEEK_DAYS if e else 0


def rb_wins_x100(keys_x100, c):
    """Побед у рунных стражей за день × 100: сколько хватит ключей при доле 7 : 3, не выше общего капа (ADR-0022, ADR-0023)."""
    return min(rx()['cap'] * 100, keys_x100 * 100 // avg_price_x100(c))


_TL = {}


def timeline_ex(rates, mult, hours, caps=True, exp=LEVEL_EXP, days=DAYS_MAX, cycle2=True, start_spirit=0, prof=None, keys_add_x100=0,
                full_cap=False, squads=None):
    """Дни с начала цикла II (ADR-0018): отряд входит на START_LEVEL, пределы START_LIMITS пробиты в обучении.
    Главный отряд A и вторые отряды B растут уровнями по мере дохода, весь дух сначала — A; первый забег одновременно ведёт A,
    остальные — B. Забегов одновременно — номер цикла (slots), squads — сколько отрядов у игрока по дням (функция дня; по умолчанию
    все слоты). caps: A не выше предела, пока нет рун; B — не выше EXTRA_CAP. cycle2: после CYCLE_DAYS — следующий цикл, враги
    сильнее по §3.3. Рунные стражи — из ключей (вариант Б, ADR-0031, п. 4): утром — ключи контрактов профиля prof и ключ с босса
    за вчерашние забеги (+ keys_add_x100 в день), побед — сколько хватит ключей, не выше капа; full_cap — полный кап, как без ключей.
    Руны пределов — по весам стража, излишки уже пройденных пределов — в перековку вверх; осколки доблести копятся с первого дня.
    Пятый предел — руны V и 1200-й уровень: с этого дня доступна доблесть (§10.2; руна обучения — исключение, ADR-0031, п. 2).
    Возвращает словарь: reached — {уровень A: день}, gold — золото нарастающим итогом, lv — уровни (A, B) по дням, runes — день рун
    на пределы I–V, wins — побед у РБ по дням × 100, keys — ключей по дням × 100, limit5 — день пятого предела, shards — осколков
    доблести нарастающим итогом × 100 по дням."""
    prof = prof or PROFILE_KEY[dict((h, p) for p, h in PROFILES)[hours]]
    R, n = rx(), len(LIMITS)
    per_win = [R['runes_per_win'] * 100 * w // BP for w in R['weights']]
    need = SQUAD * RUNES_PER_LIMIT * 100
    stock, nxt, runes = [0] * n, START_LIMITS, [0] * START_LIMITS
    a = b = START_LEVEL
    bank, gold, reached, shards, boss_prev = start_spirit, 0, {}, 0, 0
    out = {'gold': [0], 'lv': [(a, b)], 'wins': [0], 'keys': [0], 'shards': [0]}
    limit5 = None
    for day in range(1, days + 1):
        c = FIRST_CYCLE + 1 if (cycle2 and day > CYCLE_DAYS) else FIRST_CYCLE
        keys = wins = 0
        if caps and day >= GUARD_OPEN_DAY:
            keys = contract_keys_x100(c, prof) + boss_prev * R['boss_key_bp'] * c // BP + keys_add_x100
            wins = R['cap'] * 100 if full_cap else rb_wins_x100(keys, c)
            lim_w = wins * RB_SPLIT_BP // BP
            for k in range(n):
                stock[k] += per_win[k] * lim_w // 100
            for _ in range(2):                   # второй проход — после перековки
                while nxt < n and stock[nxt] >= need:
                    stock[nxt] -= need
                    runes.append(day)
                    nxt += 1
                for k in range(min(nxt, n - 1)):  # руны уже пройденных пределов — в перековку вверх
                    q = stock[k] // (R['reforge'] * 100)
                    stock[k] -= q * R['reforge'] * 100
                    stock[k + 1] += q * 100
            shards += (wins - lim_w) * R['shards_x100'] // 100
            bank += wins * rates['guard'][1] * mult(c) // (BP * 100)
            gold += wins * rates['guard'][0] * mult(c) // (BP * 100)
        cap_a = LIMITS[min(nxt, n - 1)] if caps else LIMITS[-1]
        n_sl = slots(c) if squads is None else min(slots(c), squads(day, c))
        boss = 0
        for _ in range(hours):
            for k in range(n_sl):
                row = sim_row(eff_level(a if k == 0 else b, c))
                g, s, _ = per_hour(row, rates, mult(c))
                bank += s
                gold += g
                boss += row[4] * HOUR_MS * 100 // row[5]
            while a < cap_a and bank >= SQUAD * level_cost(a + 1, exp):
                bank -= SQUAD * level_cost(a + 1, exp)
                a += 1
                if a in LIMITS and a not in reached:
                    reached[a] = day
            n_b = n_sl - 1
            while n_b and b < min(EXTRA_CAP[c], a) and bank >= n_b * SQUAD * level_cost(b + 1, exp):
                bank -= n_b * SQUAD * level_cost(b + 1, exp)
                b += 1
        boss_prev = boss
        if limit5 is None and a >= LIMITS[-1] and (nxt == n or not caps):
            limit5 = day
        out['gold'].append(gold)
        out['lv'].append((a, b))
        out['wins'].append(wins)
        out['keys'].append(keys)
        out['shards'].append(shards)
        if limit5 is not None:
            break
    out.update(reached=reached, runes=runes + [DAYS_MAX] * (n - len(runes)), limit5=limit5 or DAYS_MAX)
    return out


def timeline(rates, mult, hours, caps=True, exp=LEVEL_EXP, days=DAYS_MAX, cycle2=True, start_spirit=0, prof=None):
    """Как прежде: {уровень A: день}, золото нарастающим итогом по дням, уровни (A, B) по дням — из timeline_ex."""
    key = (tuple(sorted(rates.items())), mult, hours, caps, exp, days, cycle2, start_spirit, prof, CYCLE_DAYS)
    if key not in _TL:
        _TL[key] = timeline_ex(rates, mult, hours, caps, exp, days, cycle2, start_spirit, prof)
    t = _TL[key]
    return t['reached'], t['gold'], t['lv']


def pace_of(hours, **kw):
    """Темп профиля на ставках предложения — timeline_ex с кэшем: руны, победы, ключи, пятый предел."""
    key = ('pace', hours, CYCLE_DAYS, tuple(sorted(kw.items())))
    if key not in _TL:
        _TL[key] = timeline_ex(RATES_NEW, mult_new, hours, **kw)
    return _TL[key]


def valor_pace(hours, **kw):
    """Доблесть у профиля: день пятого предела (с него доступна доблесть), побед у стража доблести в день × 100 и дней на руну
    доблести (осколки — recipes.js, страж доблести) в среднем за прогон от начала цикла II до пятого предела."""
    t = pace_of(hours, **kw)
    R, days = rx(), len(t['wins']) - 1
    val_x100 = sum(w - w * RB_SPLIT_BP // BP for w in t['wins']) // max(1, days)
    per_rune = -(-R['valor_rune'] * 100 * 100 // (val_x100 * R['shards_x100'])) if val_x100 else None
    at5 = t['shards'][min(t['limit5'], days)] // (R['valor_rune'] * 100)
    return {'limit5': t['limit5'], 'val_x100': val_x100, 'days_per_rune': per_rune, 'runes_at_limit5': at5}


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
            ['Уровни аккаунта 1–10, цикл I', fmt(account_gold()), fmt(TUTORIAL_SPIRIT), '—',
             '§16: раз за игру, в Т13 и Т15; с 11-го — дар по формуле, в модели не считается']]
    return table(['Источник', 'Золото', 'Дух', 'Души', 'Замечание'], rows)


def t8_gap():
    rd = timeline_ex(RATES_NOW, mult_now, PROFILES[0][1], cycle2=False)['runes']
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
    rd = pace_of(PROFILES[0][1])['runes']
    reg, gold, lv = timeline(RATES_NEW, mult_new, PROFILES[0][1])
    hc, _, _ = timeline(RATES_NEW, mult_new, PROFILES[1][1])
    acc = account_gold()
    first5 = hero_total(1, SQUAD)            # первый отряд — пачка обучения, первые пятеро цикла I
    _, next5 = heroes_buy(10 ** 12, (1, 2), {1: SQUAD}, 2 * SQUAD)   # второй — пятеро самых дешёвых следующих, циклы I и II
    vo, ve = valor_pace(PROFILES[0][1]), valor_pace(PROFILES[1][1])
    rows = []
    for i, L in enumerate(LIMITS):
        if L <= START_LEVEL:
            continue
        lock = 'дух' if (i == 0 or reg.get(L, 0) > rd[i - 1]) else 'руны ' + ROMAN[i - 1]
        goal = TARGETS[L] + (f', {CYCLE_DAYS}-й день' if L == LIMITS[2] else '')
        rows.append([f'Отряд пяти на {L}-м', goal, reg.get(L, f'> {DAYS_MAX}'), hc.get(L, f'> {DAYS_MAX}'), lock])
    rows.append(['Второй отряд: ещё 5 героев', TARGET_SQUAD2, day_reaches(gold, first5 + next5 - acc), '—', 'золото'])
    rows.append([f'{GOLD_HEROES[1]} героев за золото цикла I', TARGET_GOLD_ALL,
                 day_reaches(gold, hero_total(1) - acc), '—', 'золото'])
    lock5 = 'руны V' if rd[-1] >= reg.get(LIMITS[-1], DAYS_MAX) else 'дух'
    rows.append(['Пятый предел: с него доступна доблесть (§10.2)', 'долгая цель, после цикла II', vo['limit5'], ve['limit5'], lock5])
    rows.append(['Руна доблести со стража доблести', 'около 10 дней (§10.2: пять рун ≈ 50 дней)',
                 f"раз в {vo['days_per_rune']} дн.", f"раз в {ve['days_per_rune']} дн.",
                 f"побед у стража доблести в день — {dec1(vo['val_x100'], 100)}; осколки копятся с 1-го дня, к пятому пределу — "
                 f"{vo['runes_at_limit5']} рун"])
    return table(['Веха', 'Цель', 'День: обычный', 'День: увлечённый', 'Замок у обычного'], rows)


def payer_cases():
    """Дух в день при равном времени: свободный и плательщик с одним прогрессом аккаунта. Плательщик раньше набирает героев на все
    слоты; сила героев от редкости не растёт (§3.2). Возвращает (подпись, день, отрядов у свободного и у плательщика, дух обоих,
    случай настоящий — плательщику хватает слотов цикла)."""
    _, _, lv = timeline(RATES_NEW, mult_new, PROFILES[0][1])
    h = PROFILES[0][1]
    wins = pace_of(h)['wins']

    def day_income(day, squads):
        a, b = lv[min(day, len(lv) - 1)]
        c = FIRST_CYCLE + 1 if day > CYCLE_DAYS else FIRST_CYCLE
        s = sum(per_hour(sim_row(eff_level(a if k == 0 else b, c)), RATES_NEW, mult_new(c))[1] for k in range(squads))
        return s * h + wins[min(day, len(wins) - 1)] * RATES_NEW['guard'][1] * mult_new(c) // (BP * 100)
    out = []
    for name, day, f, p in PAYER_CASES:
        day = CYCLE_DAYS + int(day[1:]) if isinstance(day, str) else day or CYCLE_DAYS
        c = FIRST_CYCLE + 1 if day > CYCLE_DAYS else FIRST_CYCLE
        out.append((name, day, f, p, day_income(day, f), day_income(day, p), p <= slots(c)))
    return out


def payer_worst_x100(c=None):
    """Худший настоящий случай Т12 (в цикле c; без него — во всех): во сколько раз больше духа в день у плательщика при равном времени,
    × 100. Его берут калькуляторы режимов как верхнюю границу дохода плательщика (Эхо — души, лутбоксы — очки)."""
    cyc = lambda day: FIRST_CYCLE + 1 if day > CYCLE_DAYS else FIRST_CYCLE
    return max(pay * 100 // free for _, day, _, _, free, pay, real in payer_cases() if real and (c is None or cyc(day) == c))


def t12_payer():
    rows = []
    for name, _, f, p, free, pay, _ in payer_cases():
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
    """Обучающий биом с нуля (ADR-0018). Есть сценарий «Старт с чистого листа» (start.json) — его прогон настоящими боями: время забегов
    и стража Мастерской, забегов, уровень пары у стража. Нет — прежняя модель: дух обучения сразу в уровни, затем забег за забегом на текущем
    уровне отряда, дух за убитых — в уровни, не выше первого предела; до забега, где пал босс. Возвращает мс, забеги, уровень."""
    b1 = START.get('b1')
    if b1 and b1.get('ms'):
        return b1['ms'], b1['runs'], max(b1.get('guardLvl') or [0])
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


def pace_b2():
    """Биом 2 цикла I по прогону темпа (tools/content-gen/biomes/pace.py → pace.json, rows.b2): босс и рунный страж, итог забегов."""
    try:
        return json.loads(PACE_JSON.read_text(encoding='utf-8')).get('rows', {}).get('b2') or {}
    except (OSError, ValueError):
        return {}


def in_corridor(ms, corridor):
    lo, hi = corridor
    return lo * MINUTE_MS <= ms <= hi * MINUTE_MS


def t15_tutor():
    """Цель автора — биом 1 за час, из них 7–10 минут боя (ADR-0018, дополнение; ADR-0031, п. 5), биом 2 — ещё около трёх часов,
    от полутора до трёх часов забегов, — против прогонов: обучающий биом здесь, биом 2 — прогон темпа (pace.json)."""
    got = tutor_pace()
    b1s = START.get('b1') or {}
    first = (max(b1s['bossLvl']),) if b1s.get('bossLvl') else next((r for r in SIM_TUTOR if r[1]), None)
    guard_lvl = max(b1s['guardLvl']) if b1s.get('guardLvl') else SIM_GUARD
    lo1, hi1 = PACE_B1_MIN
    if not got:
        return table(['Веха', 'Цель автора', 'Итог'], [[PACE_I[0][0], f'{lo1}–{hi1} мин боя', 'не пройден']])
    ms, runs, lvl = got
    duo = f'{len(TUTOR_IDS)} героя'
    b2 = pace_b2().get('guard')
    lo2, hi2 = PACE_B2_MIN
    rows = [[PACE_I[0][0], f'{lo1}–{hi1} мин боя; остальное до часа — обучение', duo, f'{dec1(ms, MINUTE_MS)} мин, {runs} заб.', lvl,
             f'{first[0]}-й' if first else '—', 'в срок' if in_corridor(ms, PACE_B1_MIN) else 'мимо цели'],
            ['Рунный страж биома 1', 'после биома', duo, '—', '—', f'{guard_lvl}-й' if guard_lvl else 'не берётся',
             'по силам' if guard_lvl and guard_lvl <= LIMITS[0] else 'не по силам'],
            [PACE_I[1][0], f'ещё {dec1(lo2, 60)}–{dec1(hi2, 60)} ч забегов', '5 героев: ещё трое до полной пачки',
             f"{dec1(b2['ms'], MINUTE_MS)} мин, {b2['runs']} заб." if b2 else 'нет прогона темпа',
             '/'.join(map(str, b2['lvl'])) if b2 else '—', 'босс и страж — за забег, без осады',
             ('в срок' if in_corridor(b2['ms'], PACE_B2_MIN) else 'мимо цели') if b2 else '—']]
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
             ('Т5. Прогон модели раундов, образец биома цикла II', t5_sim()),
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
    po, pe, pc = pace_of(PROFILES[0][1]), pace_of(PROFILES[1][1]), pace_of(PROFILES[0][1], full_cap=True)
    print(f'\nРуны на пределы I–V, отряд пяти, дни с начала цикла II: обычный — {po["runes"]}, увлечённый — {pe["runes"]}, '
          f'при полном капе {rx()["cap"]} побед — {pc["runes"]}. Цикл II — {CYCLE_DAYS} дней (прогон темпа, pace.json).')


def check_csv():
    """HEROES_VALOR и GOLD_HEROES — из состава героев состав-героев.csv: личные максимумы по циклам и герои за золото."""
    path = ROOT / 'docs' / 'content' / 'герои' / 'состав-героев.csv'
    if path.exists():
        rows = list(csv.DictReader(path.open(encoding='utf-8-sig')))
        val = {}
        for r in rows:
            val.setdefault(CYCLE_NAMES.index(r['цикл']) + 1, Counter())[int(r['максимум доблести'])] += 1
        if {c: dict(m) for c, m in val.items()} != HEROES_VALOR:
            print('!! HEROES_VALOR разошлись с состав-героев.csv — обновите данные', file=sys.stderr)
        gold = Counter(CYCLE_NAMES.index(r['цикл']) + 1 for r in rows if r['источник'].startswith('золото'))
        if dict(gold) != GOLD_HEROES:
            print('!! GOLD_HEROES разошлись с состав-героев.csv — обновите данные', file=sys.stderr)


# ======================= ПРОГОН БОЯ (--sim) =======================

SIM_JS = r"""
globalThis.window = globalThis;
// отряд прогонов — одна фикстура (tools/content-gen/biomes/sim.js, SQUAD): S.heroes из design/ui/index.html, реальный отряд ADR-0031, п. 1 —
// золотые герои цикла I с максимумом доблести 1, доблесть 0, у бойца урона пары — 1 от руны обучения. Набор — по черновику героя (kits.js);
// ab, pas и ult — прежняя библиотека: на ней идёт только модель темпа ADR-0007. sim.js сам грузит ядро, библиотеку, наборы и биомы
const { SQUAD } = require('./tools/content-gen/biomes/sim.js');
require('./design/ui/abilities.js'); require('./design/ui/kits.js'); require('./design/ui/battle.js');
const EB = globalThis.EnBattle;
// один забег; добыча как в ядре (floorLoot): по рангу убитой карты — рядовой, элита, босс
function run(heroes, siege, mode) {
  const B = EB.BIOMES.c2, k = { rf: 0, el: 0, boss: 0 }; let cur = heroes.map(h => EB.heroSrcValor(h)), ms = 0, wall = 0, hp = siege;
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
  const B = EB.BIOMES.b1, k = { rf: 0, el: 0, boss: 0 }; let cur = TUTOR.map(h => EB.heroSrcValor(Object.assign({}, h, { lvl: L, valor: 0 }))), ms = 0, wall = 0, win = 0;
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
for (let L = 1; L <= TUTOR_MAX && guard == null; L++) if (EB.run(EB.guardBattle(TUTOR.map(h => EB.heroSrcValor(Object.assign({}, h, { lvl: L, valor: 0 }))), 'b1', 'rounds')).win) guard = L;
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
