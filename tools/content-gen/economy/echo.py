# -*- coding: utf-8 -*-
"""Экономика боя в Эхо — калькулятор (черновик). Решение автора — ADR-0025, правила — §17 GDD.

Печатает таблицы Э1–Э15 для docs/content/эхо-экономика.md и собирает данные прототипа design/ui/echo-rules.js:
- сила ступеней: уровень врагов, здоровье главного врага и защитников — в единицах ядра design/ui/battle.js;
- раунды по типу врага (§17.3) — по прогону ядра;
- души за атаку по типу и циклу против дохода душ обычного и увлечённого игрока;
- атаки на убийство ступени, вершина лестницы за неделю, рейтинговые очки, разброс ×8 и удержание (§17.5–17.6);
- Многоликий: лёгкий бой пятнадцатой ступени и его биом — очки за этажи без душ против атак за души и против крафта.
Доход душ, уровни отряда и прогон боя берёт из калькуляторов economy.py и sets.py через importlib и их не меняет.

    python tools/content-gen/economy/echo.py         # все таблицы, markdown
    python tools/content-gen/economy/echo.py --js    # собрать design/ui/echo-rules.js
    python tools/content-gen/economy/echo.py --doc   # заменить таблицы Э1–Э15 в docs/content/эхо-экономика.md выводом скрипта
    python tools/content-gen/economy/echo.py --sim   # перемерить бой ядром (нужен Node); вывод — в SIM_ROUNDS, SIM_DMG, SIM_KILL, SIM_MANY

Все числа — демонстрация и лежат в начале файла, в функциях только алгоритм.
Расчёт целочисленный: доли — в базисных пунктах (10 000 = 100 %), отношение уровней и атаки — в сотых.
"""
import importlib.util
import json
import math
import re
import subprocess
import sys
from pathlib import Path

_spec = importlib.util.spec_from_file_location('sets', Path(__file__).resolve().parent / 'sets.py')
S = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(S)
E = S.E                                     # калькулятор экономики — тот же экземпляр, что у сет-бонусов
BP, LVL_DIV = E.BP, E.LEVEL_DIV
OUT_JS = E.ROOT / 'design' / 'ui' / 'echo-rules.js'
DOC = E.ROOT / 'docs' / 'content' / 'эхо-экономика.md'

# ======================= ДАННЫЕ =======================

ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']
CYCLES = [2, 3, 4, 5, 6]                    # рейтинг Эхо — с цикла II, цикл I — обучение (§17; §16: Эхо открывает 10-й уровень)
FIRST = CYCLES[0]                           # первый цикл рейтинга: от него счёт очков ×3 и цены раунда

# --- лестница §17.4 и ADR-0025: 6 рядовых, 4 элиты, 3 босса, Убер-босс; пятнадцатая — Многоликий ---
LADDER = 'oooooo' + 'eeee' + 'bbb' + 'u' + 'm'
UBER, MANY = 14, 15                         # номера ступеней
TYPES = 'oebum'
TYPE_NAME = {'o': 'Рядовой', 'e': 'Элита', 'b': 'Босс', 'u': 'Убер-босс', 'm': 'Многоликий'}
RANK = {'o': 'o', 'e': 'e', 'b': 'b', 'u': 'uber', 'm': 'e'}   # ранг главного врага в ядре — иммунитет к контролю (RULES.resist);
                                                                # Многоликий — лёгкий бой: набор элиты, как в echo-foes.js
FOES_N = {'o': 5, 'e': 5, 'b': 5, 'u': 5, 'm': 1}   # врагов в бою: главный и четыре защитника; Многоликий — один (ADR-0025)

# --- сила ступеней: ADR-0025, п. 4 — первая как биом 2 своего цикла, 14-я как биом 1 следующего ---
POWER_X10 = E.POWER_X10 + [168]   # кривая §3.3 × 10; цикла VII нет — верх лестницы VI: ещё шаг ×1,6 (допущение)
REF_LVL = 55                      # «сила биома» — уровень врагов его последнего этажа: образец цикла II, RULES.foeLvl.base 20 + 35 этажей
LADDER_CURVE = 2                  # выпуклость: ступень s проходит 1 − (1 − x)^2 пути, x = (s − 1) / 13 — к середине лестницы враги уже страшные
MANY_LVL_BP = 0                   # Многоликий — на уровне Убер-босса: бой лёгкий, потому что противник один

# --- раунды §17.3 ---
ROUNDS_DEMO = {'o': 5, 'e': 8, 'b': 12, 'u': 25}
ROUNDS = {'o': 10, 'e': 15, 'b': 20, 'u': 25, 'm': 10}   # предложение: рядовой — как этаж биома, дальше +5 за ранг; Многоликий — лёгкий
ROUNDS_TRY = {'o': [5, 8, 10, 12], 'e': [8, 10, 12, 15], 'b': [12, 15, 18, 20], 'u': [20, 25]}

# --- здоровье: «свой» отряд ступени и атаки на убийство ---
ON_LEVEL = 240        # отношение уровней отряда и врагов (12 + уровень), × 100, у отряда, которому ступень «по силам»:
                      # на образце цикла II босс падает осадой с 150-го уровня против 55-го этажа — (12 + 150) / (12 + 55) = 2,42
DANGER = [100, 120, 160, 200, 240]   # отношения для таблицы опасности — из сетки прогона SIM_RATIOS
ROUNDS_DANGER = 150                  # отношение, при котором в таблице раундов смотрим, сколько героев живо
ATTACK_RATIOS = [200, 150, 120]      # отношения для таблицы атак на убийство, кроме ON_LEVEL
DESIGN = {'o': 1, 'e': 2, 'b': 3, 'u': 6, 'm': 1}   # предложение: атак на убийство у «своего» отряда
HP_MARGIN_BP = 8500   # здоровье — 85 % среднего урона «своего» отряда за DESIGN атак: чтобы хватало DESIGN атак почти всегда
HP_ROUND = 50         # здоровье главного врага округляется до 50 % базы карты
DEF_HP_PCT = 100      # защитники — полное здоровье своих карт, как в длинных биомах; главный враг — bossHpPct

# --- цена атаки: душа покупает раунды боя ---
ROUND_SOULS = 3       # предложение: душ за раунд атаки в цикле II; атака — ROUNDS × цена раунда цикла
SUMMON_SOULS = 1      # призыв — ровно 1 душа на всех циклах (§17.1, §36.4); Многоликого зовёт тот же призыв
ROUND_SOULS_TRY = [2, 3, 4, 5]
# цена раунда растёт как доход душ: души с элит — × номер биома (ADR-0011), забегов одновременно — номер цикла и ещё один (ADR-0014)
BIOMES_PER_CYCLE = E.BIOMES_PER_CYCLE
SLOTS_EXTRA = S.SLOTS_EXTRA

# --- рейтинговые очки: §17.5 — около +20 % очков на душу за ступень, §17.6 — ×3 за цикл, разброс не больше ×8 ---
POINTS_STEP1 = 100            # ступень 1 цикла II — как в прежней сетке §17.5
POINTS_GROWTH_BP = 11600      # предложение: +16 % очков на душу за ступень — разброс 1-й и 15-й ступени ровно ×8
GROWTH_TRY_BP = [12000, 11800, 11700, 11600, 11500]
POINTS_CYCLE_MUL = 3          # §17.6: очки ×3 за цикл
SPREAD_MAX = 8                # §17.6

# --- биом Многоликого (ADR-0025): этажи — ступени 1–14, попытка одна, души не тратятся, очки — за каждый взятый этаж ---
MANY_FLOOR_PTS_BP = 10000     # предложение: этаж даёт очки убийства своей ступени
MANY_FLOOR_HP_BP = 3000       # предложение: главный враг этажа — 30 % одной атаки «своего» отряда (bossHpPct / DESIGN):
                              # попытка одна, здоровье отряда переходит с этажа на этаж — при 100 % отряд Убера падает к 5-му этажу
LIK_SHARDS = 20               # крафт: Многоликий → Маска недели → Лик недели, 20 осколков героев недели (recipes.js, лутбоксы.md)
ECHO_SHARDS_X10 = {2: (606, 990), 3: (849, 1485), 4: (1485, 2509), 5: (2328, 3830), 6: (3341, 5565)}   # осколков Эхо в неделю × 10,
                                                                        # обычный / увлечённый — docs/content/лутбоксы.md
BALANCE_BP = (7500, 13333)    # «ни то ни другое не сильнее очевидно»: биом к крафту — от ×0,75 до ×1,33
LIK_SHARE_BP = 1350           # предложение для крафта: рецепт с Многоликим платит 13,5 % осколков Эхо недели увлечённого —
                              # столько 20 осколков Лика в цикле III; в поздних циклах — больше осколков или сильнее босс

# --- бюджет душ ---
ECHO_SHARE_BP = S.ECHO_SPEND_BP   # доля душ дня, что уходит в Эхо — допущение сет-бонусов: 50 %
WEEK = 7
TEMPLATE = 3                      # циклы IV–VI — по образцу цикла III: калькулятор экономики ведёт дни циклов II и III

# --- лестница §17.4 в прототипе (design/ui/screens/echo.js, ECH): числа — демонстрация ---
PICK_W = [30, 28, 26, 24, 22, 20, 12, 11, 10, 9, 5, 4, 3, 2, 2]   # вес ступени в призыве: слабые чаще; 15-й — предложение, как у Убера
MANY_ONCE = True                      # предложение: Многоликий — раз в неделю, после победы уходит из пула; иначе с артефактом выбора
                                      # увлечённый берёт его до 6 раз в неделю и биомы дают +40 % очков недели
OFFERS = [1, 3]                       # вариантов призыва: исходно один, с артефактом — три (§17.1)
LIFE_H = {'o': 72, 'e': 48, 'b': 36, 'u': 24, 'm': 24}   # срок цели, часы
DAY_H = 24
WORTH_BP = 10000                      # игрок бьёт цель, только если очков на душу у неё не меньше, чем у первой ступени для его отряда:
                                      # иначе неделя уходит на одну элиту в 70 атак ради ступени, которую не убить

# --- планки: docs/content/лутбоксы.md — каждая следующая вдвое больше очков; обычный кончает неделю на 3-й из 5, увлечённый — на 5-й ---
PLANKS, PLANK_MUL = 5, 2
PLANK_REG, PLANK_ENG = 3, 5
PLANK_DIGITS = 2                      # порог планки — вниз до двух значащих цифр
# отряды калькулятора для таблицы атак: цикл, уровень главного отряда
SQUADS = [(2, 150), (2, 350), (3, 350), (3, 700), (3, 1200)]

# --- прогон (--sim): отряд прототипа из economy.SIM_JS против врагов недели из echo-foes.js — составы, наборы, Убер-боссы.
# Характеристик в echo-foes.js нет: как в демо экрана Эхо, у карты — статы образца Мастерской того же класса, рядовым — рядовых,
# остальным — элит. Нет файла — заглушки LINEUPS и PROXY из карт Мастерской.
FOES_JS = 'design/ui/echo-foes.js'
TEMPLATES = {'o': {'Физ. ДД силы': 'o1', 'Дебаффер': 'o2', 'Маг. ДД': 'o3', 'Танк': 'o4', 'Лекарь': 'o5', 'Физ. ДД ловкости': 'o6'},
             'x': {'Физ. ДД силы': 'e1', 'Физ. ДД ловкости': 'e2', 'Танк': 'e3', 'Маг. ДД': 'e4', 'Лекарь': 'e5', 'Дебаффер': 'e6'}}
SIM_SEEDS_REAL = 2            # сидов на состав недели: составов много — 9 недель
REAL_TYPES = 'oebum'          # кого мерить на врагах недели; остальных — на заглушках
MAIN_PROXY = {}               # тип -> заглушка главного врага при настоящих защитниках, если его набор ядру ещё не по силам
SIM_SKIP = []                 # главные враги вне замера: наборы, которых не убить при здоровье между атаками, — их правят, а не балансируют.
                              # «Пятое Солнце» Саганов исправлено: на гибель спутника — +25 % урона до конца боя вместо лечения
SIM_RATIOS = [80, 90, 100, 110, 120, 140, 160, 180, 200, 220, 240, 270, 300, 350, 400]
SIM_SEEDS = 6                 # сидов на состав заглушек; сид атаки — от типа, состава, сида и номера атаки
KILL_CAP = 100                # больше атак — «не убить»
SIM_DEEP = 1000000            # здоровье «бездонного» главного врага при замере урона за атаку, % базы: за атаку он не падает
SIM_LVL_STEP = (2, 7)         # уровень врагов прогона — ступень 7 цикла II; бой почти не зависит от уровня при том же отношении
SIM_MANY_RATIOS = [140, 160, 180, 200, 220, 240, 270, 300, 350, 400]   # биом Многоликого: отношение отряда к уровню Убер-босса
SIM_MANY_RUNS = 12            # попыток биома на отношение
# заглушки — ранги защитников как в echo-foes.js: у рядового — рядовые, у элиты — элита и три рядовых или две элиты и два рядовых,
# у босса — две-три элиты, у Убера — босс и три элиты; Многоликий — один
LINEUPS = {
    'o': [['o1', 'o4', 'o5', 'o3', 'o6'], ['o4', 'o1', 'o5', 'o3', 'o6'], ['o5', 'o4', 'o1', 'o3', 'o2'], ['o6', 'o2', 'o3', 'o1', 'o4']],
    'e': [['e1', 'e3', 'o5', 'o3', 'o6'], ['e3', 'e5', 'o1', 'o3', 'o6'], ['e5', 'e1', 'e4', 'o4', 'o2'], ['e4', 'e6', 'e3', 'o1', 'o5']],
    'b': [['b1', 'e3', 'e5', 'o1', 'o3'], ['b1', 'e2', 'e4', 'o4', 'o5'], ['b1', 'e6', 'e1', 'e3', 'o6']],
    'u': [['u1', 'b1', 'e3', 'e5', 'e1'], ['u1', 'b1', 'e2', 'e5', 'e6'], ['u1', 'b1', 'e3', 'e1', 'e4']],
    'm': [['m1']],
}
# заглушки: Убер-босс — статы рунного стража, ранг убер, доли хода первородной редкости (§5.7), пять способностей из библиотеки;
# Многоликий — статы Подмастерья, набор элиты: две способности без ульты
PROXY = {
    'u1': {'foe': {'rank': 'uber', 'name': 'Убер-образец', 'cls': 'Босс', 'el': 'Земля', 'st': [150, 60, 60, 320, 70], 'hpPct': 1800},
           'kit': {'rank': 'uber', 'ultPct': 850, 'actPct': 4650, 'kit': [
               {'v': 0, 'slot': 'act', 'id': 'Земля.dmg.one', 'as': 'Правка'},
               {'v': 0, 'slot': 'act', 'id': 'Земля.dmg.all', 'as': 'Глиняный вал'},
               {'v': 0, 'slot': 'act', 'id': 'Земля.ctrl.one', 'as': 'Остановись'},
               {'v': 0, 'slot': 'act', 'id': 'Земля.buff.all'},
               {'v': 0, 'slot': 'ult', 'id': 'Земля.ult.dmg', 'as': 'Последний штрих'}]}},
    'm1': {'foe': {'rank': 'e', 'name': 'Многоликий-образец', 'cls': 'Физ. ДД силы', 'el': 'Земля', 'st': [135, 25, 30, 180, 60], 'hpPct': 350},
           'kit': {'rank': 'e', 'ultPct': 0, 'actPct': 3600, 'kit': [
               {'v': 0, 'slot': 'act', 'id': 'Земля.dmg.one', 'as': 'Правка'},
               {'v': 0, 'slot': 'act', 'id': 'Земля.dmg.all', 'as': 'Глиняный вал'}]}},
}

# --- замеры прогона: обновляются через --sim ---
SIM_SRC = 'design/ui/echo-foes.js, недель 9: oebum; режим Эхо ядра — echoBattle'                  # на ком мерили: echo-foes.js или заглушки
# SIM_ROUNDS: тип -> [(раундов, средний урон по главному за атаку в % базы при ON_LEVEL, героев живо × 10 при отношении 1,5)]
SIM_ROUNDS = {
    'o': [(5, 738, 49), (8, 1537, 49), (10, 2123, 49), (12, 2715, 49)],
    'e': [(8, 804, 49), (10, 1209, 48), (12, 1626, 46), (15, 2263, 45)],
    'b': [(12, 1457, 46), (15, 2098, 44), (18, 2783, 41), (20, 3241, 37)],
    'u': [(20, 2741, 14), (25, 3526, 4)],
}
# SIM_DMG: тип -> [(отношение × 100, средний урон по главному за атаку в % базы, 20-й перцентиль, доля вайпов в б. п., героев живо × 10)]
SIM_DMG = {
    'o': [(80, 263, 103, 277, 33), (90, 375, 225, 0, 39), (100, 509, 366, 0, 43), (110, 620, 508, 0, 45), (120, 734, 579, 0, 47), (140, 967, 787, 0, 49), (160, 1184, 992, 0, 49), (180, 1428, 1217, 0, 49), (200, 1670, 1459, 0, 50), (220, 1892, 1649, 0, 50), (240, 2123, 1828, 0, 50), (270, 2465, 2053, 0, 50), (300, 2814, 2360, 0, 50), (350, 3330, 2852, 0, 50), (400, 3862, 3239, 0, 50)],
    'e': [(80, 153, 0, 6666, 8), (90, 248, 17, 4166, 16), (100, 373, 92, 2361, 23), (110, 504, 186, 1111, 30), (120, 644, 348, 555, 35), (140, 922, 685, 138, 42), (160, 1187, 955, 0, 46), (180, 1502, 1252, 0, 47), (200, 1715, 1452, 0, 49), (220, 1974, 1763, 0, 49), (240, 2263, 1980, 0, 50), (270, 2615, 2304, 0, 49), (300, 3023, 2628, 0, 50), (350, 3708, 3235, 0, 50), (400, 4411, 3921, 0, 50)],
    'b': [(80, 119, 0, 9259, 0), (90, 194, 0, 8148, 4), (100, 385, 52, 5370, 11), (110, 577, 215, 3888, 17), (120, 768, 442, 2777, 23), (140, 1260, 991, 740, 34), (160, 1714, 1465, 185, 42), (180, 2075, 1746, 0, 45), (200, 2510, 2228, 0, 48), (220, 2863, 2524, 0, 49), (240, 3241, 2814, 0, 49), (270, 3846, 3379, 0, 50), (300, 4446, 3948, 0, 50), (350, 5386, 4795, 0, 50), (400, 6329, 5514, 0, 50)],
    'u': [(80, 41, 0, 10000, 0), (90, 63, 0, 10000, 0), (100, 110, 0, 10000, 0), (110, 223, 0, 10000, 0), (120, 307, 35, 10000, 0), (140, 693, 421, 7777, 2), (160, 1217, 784, 7222, 8), (180, 1841, 1371, 3888, 20), (200, 2319, 1926, 2777, 25), (220, 2907, 2434, 2222, 28), (240, 3526, 2804, 1111, 38), (270, 4237, 3373, 555, 39), (300, 4928, 4286, 555, 42), (350, 6062, 5278, 555, 45), (400, 7093, 6064, 0, 45)],
    'm': [(80, 665, 553, 0, 48), (90, 762, 629, 0, 49), (100, 860, 709, 0, 49), (110, 955, 808, 0, 50), (120, 1047, 884, 0, 50), (140, 1222, 1038, 0, 50), (160, 1412, 1196, 0, 50), (180, 1597, 1351, 0, 50), (200, 1787, 1509, 0, 50), (220, 1971, 1663, 0, 50), (240, 2162, 1817, 0, 50), (270, 2448, 2053, 0, 50), (300, 2731, 2288, 0, 50), (350, 3197, 2678, 0, 50), (400, 3661, 3068, 0, 50)],
}
# SIM_KILL: тип -> (bossHpPct прогона, [(отношение × 100, атак на убийство × 100 или None — больше KILL_CAP)])
SIM_KILL = {
    'o': (1800, [(80, 957), (90, 591), (100, 428), (110, 359), (120, 308), (140, 238), (160, 201), (180, 191), (200, 169), (220, 143), (240, 114), (270, 105), (300, 100), (350, 100), (400, 100)]),
    'e': (3850, [(80, None), (90, None), (100, 7381), (110, 1234), (120, 812), (140, 512), (160, 384), (180, 319), (200, 281), (220, 243), (240, 216), (270, 201), (300, 198), (350, 163), (400, 115)]),
    'b': (8250, [(80, None), (90, None), (100, None), (110, 2125), (120, 1292), (140, 735), (160, 557), (180, 459), (200, 388), (220, 348), (240, 309), (270, 275), (300, 237), (350, 201), (400, 198)]),
    'u': (18000, [(80, None), (90, None), (100, None), (110, None), (120, None), (140, 3294), (160, 1700), (180, 1144), (200, 883), (220, 694), (240, 583), (270, 488), (300, 427), (350, 344), (400, 311)]),
    'm': (1850, [(80, 311), (90, 311), (100, 283), (110, 233), (120, 216), (140, 211), (160, 200), (180, 194), (200, 155), (220, 138), (240, 122), (270, 100), (300, 100), (350, 100), (400, 100)]),
}
# SIM_MANY: [(отношение к Уберу × 100, этажей взято × 100, доля очков полного биома в б. п., доля полных закрытий в б. п.)]
SIM_MANY = [(140, 483, 275, 0), (160, 658, 583, 0), (180, 800, 1031, 0), (200, 900, 1502, 0), (220, 1025, 2224, 0), (240, 1183, 4365, 833), (270, 1341, 7743, 5000), (300, 1391, 9644, 9166), (350, 1400, 10000, 10000), (400, 1400, 10000, 10000)]

# ======================= РАСЧЁТ =======================


def power(c):
    """Множитель силы врагов цикла c по §3.3, × 1000; c = 7 — продолжение кривой для верха лестницы цикла VI."""
    return POWER_X10[c - 1] * 100


def type_of(s):
    return LADDER[s - 1]


def first_step(t):
    return LADDER.index(t) + 1


def t_bp(s):
    """Доля пути от первой ступени к Убер-боссу, б. п.: выпуклая кривая — середина лестницы уже близко к верху."""
    top = UBER - 1
    return BP - BP * (top - (s - 1)) ** LADDER_CURVE // top ** LADDER_CURVE


def biome_L(c, b):
    """Сила биома b своего цикла в единицах ядра (12 + уровень последнего этажа). Биом 2 — середина между циклами по
    кривой §3.3, в геометрии: корень из произведения множителей."""
    p = power(c) if b == 1 else math.isqrt(power(c) * power(c + 1))
    return (LVL_DIV + REF_LVL) * p // 1000


def foe_L(c, s):
    """Уровень врагов ступени в единицах ядра: 12 + уровень. От биома 2 своего цикла до биома 1 следующего."""
    lo, hi = biome_L(c, 2), biome_L(c + 1, 1)
    if s >= MANY:
        return hi * (BP + MANY_LVL_BP) // BP
    return lo + (hi - lo) * t_bp(s) // BP


def foe_lvl(c, s):
    return foe_L(c, s) - LVL_DIV


def ratio(L_h, c, s):
    return L_h * 100 // foe_L(c, s)


def interp(rows, x):
    """Линейная интерполяция по таблице [(x, y)], целочисленно; за краями — крайние значения."""
    if x <= rows[0][0]:
        return rows[0][1]
    for (x0, y0), (x1, y1) in zip(rows, rows[1:]):
        if x <= x1:
            return y0 + (y1 - y0) * (x - x0) // (x1 - x0)
    return rows[-1][1]


def dmg_at(t, r):
    return interp([(x, a) for x, a, *_ in SIM_DMG[t]], r)


def round_to(v, step):
    return max(step, (v + step // 2) // step * step)


def hp_pct(t):
    """Здоровье главного врага, % базы карты (как BIOMES.bossHpPct): DESIGN атак «своего» отряда с запасом."""
    return round_to(DESIGN[t] * dmg_at(t, ON_LEVEL) * HP_MARGIN_BP // BP, HP_ROUND)


def many_hp_pct(t):
    """Главный враг этажа в биоме Многоликого: попытка одна — доля MANY_FLOOR_HP_BP одной атаки «своего» отряда."""
    return round_to(hp_pct(t) * MANY_FLOOR_HP_BP // (BP * DESIGN[t]), HP_ROUND)


def attacks_x100(t, r):
    """Атак на убийство главного врага у отряда с отношением r — замер прогона, × 100; None — не убить.
    Если здоровье поменялось после замера, атаки растут с ним пропорционально — до нового --sim."""
    hp_sim, rows = SIM_KILL[t]
    if r < rows[0][0]:
        return None
    a = rows[-1][1]
    for (x0, y0), (x1, y1) in zip(rows, rows[1:]):
        if x0 <= r < x1:
            if y0 is None:                    # между «не убить» и замером — обрыв: считаем, что не убить
                return None
            a = y0 if y1 is None else y0 + (y1 - y0) * (r - x0) // (x1 - x0)
            break
    return max(100, a * hp_pct(t) // hp_sim)


def soul_scale(c):
    """Во сколько растёт доход душ с циклом: номер первого биома цикла × забегов одновременно."""
    return (BIOMES_PER_CYCLE * (c - 1) + 1) * (c + SLOTS_EXTRA)


def round_price(c, base=ROUND_SOULS):
    """Цена раунда атаки в цикле c: растёт как доход душ — × номер первого биома цикла (ADR-0011) × число забегов
    (ADR-0014), от цикла II; округление до целого."""
    num, den = base * soul_scale(c), soul_scale(FIRST)
    return max(1, (2 * num + den) // (2 * den))


def price(t, c, base=ROUND_SOULS):
    return ROUNDS[t] * round_price(c, base)


def growth(s, g=POINTS_GROWTH_BP):
    """Множитель ступени s к первой, б. п.: g в степени s − 1, целочисленно по шагам."""
    v = BP
    for _ in range(s - 1):
        v = v * g // BP
    return v


def points(c, s, g=POINTS_GROWTH_BP):
    """Очки за убийство: очки на душу «своего» отряда растут на g за ступень, × 3 за цикл. Души — DESIGN атак × раунды."""
    t = type_of(s)
    unit = DESIGN['o'] * ROUNDS['o']
    return POINTS_STEP1 * POINTS_CYCLE_MUL ** (c - FIRST) * growth(s, g) * DESIGN[t] * ROUNDS[t] // (BP * unit)


def design_souls(c, s):
    t = type_of(s)
    return DESIGN[t] * price(t, c)


def many_floor_points(c, s):
    return points(c, s) * MANY_FLOOR_PTS_BP // BP


def many_full(c):
    """Очки за весь биом Многоликого, все 14 этажей."""
    return sum(many_floor_points(c, s) for s in range(1, UBER + 1))


def many_share(r):
    """Доля очков полного биома, которую отряд с отношением r к уровню Убера берёт за одну попытку, б. п. — замер прогона."""
    return interp([(x, sh) for x, _, sh, _ in SIM_MANY], r)


def many_points(c, L_h):
    return many_full(c) * many_share(ratio(L_h, c, UBER)) // BP


# --- бюджет и отряд по дням ---

_DAYS = {}


def profile_days(prof):
    """Дни с начала цикла II: (день, цикл, души в день, уровень главного отряда на начало дня) — калькуляторы экономики и сетов."""
    if prof not in _DAYS:
        hours = dict(E.PROFILES)[prof]
        lv = S.levels(hours)
        _DAYS[prof] = [(d, c, x['souls'] // 100, lv[min(d - 1, len(lv) - 1)][0]) for d, c, x in S.cycle_days(hours)]
    return _DAYS[prof]


def cycle_days(prof, c):
    """Дни цикла c: души и отряд (12 + уровень). Циклы IV–VI — по образцу цикла III: души × номер биома × забегов,
    отряд — в той же силе к врагам своего цикла (× кривая §3.3)."""
    src = [x for x in profile_days(prof) if x[1] == min(c, TEMPLATE)]
    if c <= TEMPLATE:
        return [(souls, LVL_DIV + a) for _, _, souls, a in src]
    k_num, k_den = soul_scale(c), soul_scale(TEMPLATE)
    return [(souls * k_num // k_den, (LVL_DIV + a) * power(c) // power(TEMPLATE)) for _, _, souls, a in src]


def weeks(prof, c):
    days = cycle_days(prof, c)
    return [days[i:i + WEEK] for i in range(0, len(days), WEEK)]


def echo_souls(souls):
    return souls * ECHO_SHARE_BP // BP


# --- лестница за неделю: ожидания, целочисленно ---

def step_info(c, s, L_h, budget, base):
    """Ступень для отряда дня: атак, душ на убийство, очков — × 1000; None — не убить или не успеть за срок цели на бюджет дня.
    У Многоликого ещё очки его биома за одну попытку отряда этого дня."""
    t = type_of(s)
    a = attacks_x100(t, ratio(L_h, c, s))
    if a is None:
        return None
    cost = a * price(t, c, base) * 10
    if cost * DAY_H > budget * 1000 * LIFE_H[t]:
        return None
    return {'att': a * 10, 'cost': cost, 'pts': points(c, s) * 1000, 'biome': many_points(c, L_h) * 1000 if s == MANY else 0}


def offer_probs(pool, n):
    """Предложения призыва: n разных ступеней из pool по весам, без повторов. Список (набор, вероятность × 10^9)."""
    out = []

    def rec(chosen, left, p):
        if len(chosen) == n or not left:
            out.append((chosen, p))
            return
        w = sum(PICK_W[j - 1] for j in left)
        for j in left:
            rec(chosen + [j], [x for x in left if x != j], p * PICK_W[j - 1] // w)
    rec([], list(pool), 10 ** 9)
    return out


def per_summon(state, info, n, once=MANY_ONCE):
    """Ожидания одного призыва: открыты ступени 1..min(state, 15); state 16 — Многоликий уже пал, при once он уходит из пула.
    Лестница растёт после победы над сильнейшим открытым (§17.4). Игрок берёт вершину, если она в предложении и по силам,
    иначе — старшую по силам.
    Возвращает вероятность подняться (× 10^9) и ожидания на призыв (× 1000): души, очки, атаки, убийства, Уберы, Многоликие,
    очки биомов Многоликого."""
    top = min(state, MANY)
    pool = range(1, UBER + 1) if (state > MANY and once) else range(1, top + 1)
    up, acc = 0, dict.fromkeys(('cost', 'pts', 'att', 'kills', 'uber', 'many', 'biome'), 0)   # суммы p × величина
    for offer, p in offer_probs(pool, n):
        ok = [j for j in offer if info[j]]
        acc['cost'] += p * SUMMON_SOULS * 1000
        if not ok:
            continue
        pick = top if (state <= MANY and top in ok) else max(ok)
        if pick == state:
            up += p
        x = info[pick]
        for k in ('cost', 'pts', 'att', 'biome'):
            acc[k] += p * x[k]
        acc['kills'] += p * 1000
        if pick == UBER:
            acc['uber'] += p * 1000
        if pick == MANY:
            acc['many'] += p * 1000
    return up, {k: v // 10 ** 9 for k, v in acc.items()}


def ladder_week(week_days, c, n=1, base=ROUND_SOULS, once=MANY_ONCE):
    """Неделя Эхо: лестница с нуля (§17.4), души дня — ECHO_SHARE_BP дохода. Ожидания — средние по сидам призыва.
    Возвращает вершину недели (последняя ступень, после которой лестница выросла; 15 — пал Многоликий), и итоги × 1000."""
    state, done = 1, 0
    tot = dict.fromkeys(('souls', 'pts', 'att', 'kills', 'uber', 'many', 'biome'), 0)
    cache = {}
    for souls, L_h in week_days:
        budget = echo_souls(souls)
        info = [None] + [step_info(c, s, L_h, budget, base) for s in range(1, MANY + 1)]
        b1 = info[1]
        for s in range(2, MANY + 1):   # невыгодные цели игрок не бьёт: они дешевле очками на душу, чем первая ступень
            x = info[s]
            if b1 and x and (x['pts'] + x['biome']) * b1['cost'] * BP < b1['pts'] * x['cost'] * WORTH_BP:
                info[s] = None
        B = budget * 1000
        while B > 0:
            key = (state, L_h, budget)
            if key not in cache:
                cache[key] = per_summon(state, info, n, once)
            up, x = cache[key]
            if state <= MANY and up:
                need = 10 ** 12 // up - done          # призывов × 1000 до подъёма
                cost = need * x['cost'] // 1000
                if cost <= B:
                    B -= cost
                    for k in ('pts', 'att', 'kills', 'uber', 'many', 'biome'):
                        tot[k] += need * x[k] // 1000
                    tot['souls'] += cost
                    state, done = state + 1, 0
                    continue
            k = B * 1000 // x['cost']
            if state <= MANY and up:
                done += k
            for key2 in ('pts', 'att', 'kills', 'uber', 'many', 'biome'):
                tot[key2] += k * x[key2] // 1000
            tot['souls'] += B
            B = 0
    return min(state - 1, MANY), done, tot


_WEEKS = {}


def week_results(prof, c, n=1, base=ROUND_SOULS, once=MANY_ONCE):
    key = (prof, c, n, base, once)
    if key not in _WEEKS:
        _WEEKS[key] = [ladder_week(w, c, n, base, once) for w in weeks(prof, c)]
    return _WEEKS[key]


def avg_week_points(prof, c):
    res = week_results(prof, c)
    return sum(t['pts'] for _, _, t in res) // (1000 * len(res))


def nice(v):
    """Порог планки: вниз до двух значащих цифр."""
    if v < 100:
        return max(1, v)
    k = 10 ** (len(str(v)) - PLANK_DIGITS)
    return v // k * k


def plank1(c):
    """Первая планка цикла. Средняя неделя обычного — на планке PLANK_REG (лутбоксы.md). С цикла III ещё удержание §17.6:
    увлечённый — прообраз среднего места прошлого цикла — в первую неделю нового берёт последнюю планку. Порог — меньший из двух."""
    reg = avg_week_points('обычный', c) // PLANK_MUL ** (PLANK_REG - 1)
    if c - 1 not in CYCLES:
        return nice(reg)
    arrive = week_results('увлечённый', c)[0][2]['pts'] // 1000 // PLANK_MUL ** (PLANKS - 1)
    return nice(min(reg, arrive))


def plank_of(pts, p1):
    k = 0
    while k < PLANKS and pts >= p1 * PLANK_MUL ** k:
        k += 1
    return k


def many_value(prof, c):
    """Биом Многоликого против крафта в последнюю неделю цикла, когда отряд сильнее всего: очки биома за одну попытку,
    их цена в душах по очкам на душу этой недели, и 20 осколков Лика недели в душах по осколкам Эхо за неделю (лутбоксы.md).
    Возвращает словарь; души — целые."""
    w = weeks(prof, c)[-1]
    _, _, t = week_results(prof, c)[-1]
    souls = sum(echo_souls(s) for s, _ in w)
    L_h = w[len(w) // 2][1]
    r = ratio(L_h, c, UBER)
    pts = many_full(c) * many_share(r) // BP
    week_pts = t['pts'] // 1000
    biome_souls = pts * souls // week_pts
    shards = ECHO_SHARDS_X10[c][[p for p, _ in E.PROFILES].index(prof)]
    craft_souls = LIK_SHARDS * souls * 10 // shards
    return {'r': r, 'share': many_share(r), 'pts': pts, 'week_pts': week_pts, 'souls': souls, 'biome_souls': biome_souls,
            'craft_souls': craft_souls, 'k': biome_souls * BP // craft_souls, 'many': t['many']}


# ======================= ВЫВОД =======================

fmt, dec1, table, pct = E.fmt, E.dec1, E.table, S.pct


def x100(v):
    return '—' if v is None else dec1(v, 100)


def mult(num, den):
    q = (num * 100 + den // 2) // den
    return f'×{q // 100},{q % 100:02d}'


def e1_power():
    ref = LVL_DIV + REF_LVL
    rows = [['', 'для сравнения', 'биом 1 своего цикла'] + [f'{biome_L(c, 1) - LVL_DIV} · {mult(biome_L(c, 1), ref)}' for c in CYCLES],
            ['', 'для сравнения', 'биом 2 своего цикла'] + [f'{biome_L(c, 2) - LVL_DIV} · {mult(biome_L(c, 2), ref)}' for c in CYCLES]]
    for s in range(1, MANY + 1):
        t = type_of(s)
        pos = pct(t_bp(s)) if s <= UBER else 'как Убер-босс' if not MANY_LVL_BP else f'+{pct(MANY_LVL_BP)} к Уберу'
        rows.append([s, TYPE_NAME[t], pos] + [f'{foe_lvl(c, s)} · {mult(foe_L(c, s), ref)}' for c in CYCLES])
    return table(['Ступень', 'Тип', 'Путь по лестнице'] + [f'Цикл {ROMAN[c - 1]}: foeLvl · сила' for c in CYCLES], rows)


def e2_rounds():
    rows = []
    for t in 'oebu':
        for R, avg, alive in SIM_ROUNDS[t]:
            mark = 'предложение' if R == ROUNDS[t] else 'демо' if R == ROUNDS_DEMO[t] else ''
            rows.append([TYPE_NAME[t], R, mark, fmt(avg), fmt(avg // R), dec1(alive, 10)])
    return table(['Главный враг', 'Раундов', '', f'Урон по главному за атаку, % базы, отношение {dec1(ON_LEVEL, 100)}',
                  'За раунд', f'Героев живо после атаки, отношение {dec1(ROUNDS_DANGER, 100)}'], rows)


def e3_danger():
    rows = []
    for t in TYPES:
        cells = [TYPE_NAME[t], FOES_N[t], ROUNDS[t]]
        for r in DANGER:
            row = next(x for x in SIM_DMG[t] if x[0] == r)
            cells.append(f'{dec1(row[4], 10)} · {pct(row[3])}')
        rows.append(cells)
    return table(['Главный враг', 'Врагов', 'Раундов'] + [f'Отношение {dec1(r, 100)}: живо · вайп' for r in DANGER], rows)


def e4_hp():
    rows = []
    for t in TYPES:
        at = lambda r: x100(attacks_x100(t, r))
        rows.append([TYPE_NAME[t], FOES_N[t], ROUNDS[t], RANK[t], DESIGN[t], fmt(dmg_at(t, ON_LEVEL)), fmt(hp_pct(t)),
                     DEF_HP_PCT if FOES_N[t] > 1 else '—', fmt(many_hp_pct(t)) if t != 'm' else '—',
                     at(ON_LEVEL)] + [at(r) for r in ATTACK_RATIOS])
    return table(['Главный враг', 'Врагов', 'Раундов', 'Ранг в ядре', 'Атак у «своего» отряда', f'Урон за атаку при {dec1(ON_LEVEL, 100)}, % базы',
                  'bossHpPct', 'foeHpPct защитников', 'Этаж биома Многоликого: bossHpPct', f'Атак: отношение {dec1(ON_LEVEL, 100)}']
                 + [dec1(r, 100) for r in ATTACK_RATIOS], rows)


def e5_budget():
    rows = []
    for c in CYCLES:
        for i, _ in enumerate(weeks('обычный', c)):
            if c > TEMPLATE and i:
                continue
            cells = [f'{ROMAN[c - 1]}, {i + 1}-я' if c <= TEMPLATE else f'{ROMAN[c - 1]}, средняя неделя']
            for prof, _ in E.PROFILES:
                ws = [weeks(prof, c)[i]] if c <= TEMPLATE else weeks(prof, c)
                lvls = [L - LVL_DIV for _, L in weeks(prof, c)[i]] if c <= TEMPLATE else None
                day = sum(s for w in ws for s, _ in w) // sum(len(w) for w in ws)
                cells += [f'{lvls[0]}–{lvls[-1]}' if lvls else 'сила — как в III', fmt(day), fmt(day * WEEK * ECHO_SHARE_BP // BP)]
            rows.append(cells)
    head = ['Цикл, неделя']
    for prof, h in E.PROFILES:
        head += [f'{prof.capitalize()}, {h} ч: уровень отряда', 'Душ в день', f'В Эхо за неделю, {pct(ECHO_SHARE_BP)}']
    return table(head, rows)


def e6_prices():
    rows = [[TYPE_NAME[t], ROUNDS[t]] + [fmt(price(t, c)) for c in CYCLES] + [fmt(design_souls(FIRST, first_step(t)))] for t in TYPES]
    rows.append(['Цена раунда', '—'] + [fmt(round_price(c)) for c in CYCLES] + ['—'])
    rows.append(['Призыв', '—'] + [SUMMON_SOULS] * len(CYCLES) + ['—'])
    rows.append(['Биом Многоликого', '—'] + [0] * len(CYCLES) + ['—'])
    return table(['Атака', 'Раундов'] + [f'Цикл {ROMAN[c - 1]}' for c in CYCLES] + [f'Душ на убийство у «своего» отряда, цикл {ROMAN[FIRST - 1]}'], rows)


def e7_attacks():
    rows = []
    for s in range(1, MANY + 1):
        t = type_of(s)
        cells = [s, TYPE_NAME[t]]
        for c, lvl in SQUADS:
            r = ratio(LVL_DIV + lvl, c, s)
            a = attacks_x100(t, r)
            cells.append(f'{dec1(r, 100)} → {x100(a)}' if a else f'{dec1(r, 100)} → больше {KILL_CAP}')
        rows.append(cells)
    return table(['Ступень', 'Тип'] + [f'Цикл {ROMAN[c - 1]}, отряд {lvl}-го: отношение → атак' for c, lvl in SQUADS], rows)


def top_label(top, t):
    return f'{top}, Уберов {dec1(t["uber"], 1000)}' if top >= UBER else str(top)


def e8_ladder(n):
    rows = []
    for c in CYCLES:
        if c > TEMPLATE:
            continue
        for i, (top_r, _, _) in enumerate(week_results('обычный', c, n)):
            cells = [f'{ROMAN[c - 1]}, {i + 1}-я']
            for prof, _ in E.PROFILES:
                top, _, t = week_results(prof, c, n)[i]
                cells += [top_label(top, t), fmt(t['kills'] // 1000), fmt(t['att'] // 1000), fmt(t['pts'] // 1000),
                          dec1(t['many'], 1000), fmt(t['biome'] // 1000)]
            rows.append(cells)
    head = ['Цикл, неделя']
    for prof, _ in E.PROFILES:
        head += [f'{prof.capitalize()}: вершина', 'Убийств', 'Атак', 'Очков', 'Многоликих', 'Очков биомов, если активировать']
    return table(head, rows)


def e8b_late():
    """Циклы IV–VI — по образцу III: вершины по неделям и средняя неделя в очках, оба варианта призыва."""
    rows = []
    for c in CYCLES:
        if c <= TEMPLATE:
            continue
        cells = [ROMAN[c - 1]]
        for prof, _ in E.PROFILES:
            for n in OFFERS:
                res = week_results(prof, c, n)
                cells.append(' / '.join(str(top) for top, _, _ in res) + f'; {fmt(sum(t["pts"] for _, _, t in res) // (1000 * len(res)))}')
        rows.append(cells)
    head = ['Цикл']
    for prof, _ in E.PROFILES:
        head += [f'{prof.capitalize()}: вершины недель; очков в среднюю неделю, вариантов {n}' for n in OFFERS]
    return table(head, rows)


def e9_points():
    rows = []
    for s in range(1, MANY + 1):
        t = type_of(s)
        ds = design_souls(FIRST, s)
        eff = points(FIRST, s) * 100 // ds
        prev = points(FIRST, s - 1) * 100 // design_souls(FIRST, s - 1) if s > 1 else None
        floor = fmt(many_floor_points(FIRST, s)) if s <= UBER else '—'
        rows.append([s, TYPE_NAME[t]] + [fmt(points(c, s)) for c in CYCLES] + [fmt(ds), dec1(eff, 100),
                     '—' if prev is None else '+' + pct((eff - prev) * BP // prev), floor])
    f = ROMAN[FIRST - 1]
    rows.append(['Биом', f'все {UBER} этажей'] + [fmt(many_full(c)) for c in CYCLES] + ['0', '—', '—', fmt(many_full(FIRST))])
    return table(['Ступень', 'Тип'] + [f'Очки, цикл {ROMAN[c - 1]}' for c in CYCLES] +
                 [f'Душ «своего» отряда, {f}', f'Очков на душу, {f}', 'Рост', f'Этаж биома Многоликого, {f}'], rows)


def e10_spread():
    rows = []
    for g in GROWTH_TRY_BP:
        e1 = points(FIRST, 1, g) * 10 ** 6 // design_souls(FIRST, 1)
        e14 = points(FIRST, UBER, g) * 10 ** 6 // design_souls(FIRST, UBER)
        e15 = points(FIRST, MANY, g) * 10 ** 6 // design_souls(FIRST, MANY)
        ok = lambda a: 'да' if a <= SPREAD_MAX * e1 else 'нет'
        rows.append([f'+{pct(g - BP)}' + (' — предложение' if g == POINTS_GROWTH_BP else ''), mult(e14, e1), ok(e14), mult(e15, e1), ok(e15)])
    return table(['Рост очков на душу за ступень', 'Разброс: Убер к 1-й', f'Не больше ×{SPREAD_MAX}', 'Многоликий к 1-й',
                  f'Не больше ×{SPREAD_MAX}'], rows)


def e11_planks():
    rows = []
    for c in CYCLES:
        p1 = plank1(c)
        reg, eng = avg_week_points('обычный', c), avg_week_points('увлечённый', c)
        arrive, grow = '—', '—'
        if c - 1 in CYCLES:
            w1 = week_results('увлечённый', c)[0][2]['pts'] // 1000
            arrive = f'{fmt(w1)} → {plank_of(w1, p1)}-я'
            grow = mult(p1, plank1(c - 1))
        rows.append([ROMAN[c - 1], fmt(p1), fmt(p1 * PLANK_MUL ** (PLANKS - 1)), f'{fmt(reg)} → {plank_of(reg, p1)}-я',
                     f'{fmt(eng)} → {plank_of(eng, p1)}-я', mult(eng, reg), arrive, grow])
    return table(['Цикл', 'Планка 1', f'Планка {PLANKS}', 'Обычный: средняя неделя → планка', 'Увлечённый: средняя неделя → планка',
                  'Увлечённый к обычному', 'Удержание: увлечённый в 1-ю неделю цикла → планка', 'Планки к прошлому циклу'], rows)


def e12_life():
    rows = []
    for t in TYPES:
        s = first_step(t)
        cells = [TYPE_NAME[t], LIFE_H[t]]
        for prof, _ in E.PROFILES:
            for i in (0, 1):
                w = weeks(prof, FIRST)[i]
                souls, L_h = w[len(w) // 2]
                a = attacks_x100(t, ratio(L_h, FIRST, s))
                have = echo_souls(souls) * LIFE_H[t] // DAY_H
                need = None if a is None else a * price(t, FIRST) // 100
                cells.append('не убить' if need is None else f'{fmt(need)} / {fmt(have)} — {pct(need * BP // have)}')
        rows.append(cells)
    head = ['Главный враг', 'Срок, ч']
    for prof, _ in E.PROFILES:
        head += [f'{prof.capitalize()}: {ROMAN[FIRST - 1]}, 1-я неделя — душ на убийство / душ за срок', f'{ROMAN[FIRST - 1]}, 2-я неделя']
    return table(head, rows)


def e13_sens():
    rows = []
    for base in ROUND_SOULS_TRY:
        cells = [f'{base}' + (' — предложение' if base == ROUND_SOULS else ''), fmt(price('o', FIRST, base)), fmt(price('u', FIRST, base))]
        for prof, _ in E.PROFILES:
            for n in OFFERS:
                cells.append(' / '.join(str(top) for top, _, _ in week_results(prof, FIRST, n, base)))
        rows.append(cells)
    f = ROMAN[FIRST - 1]
    head = [f'Душ за раунд, цикл {f}', 'Атака рядового', 'Атака Убера']
    for prof, _ in E.PROFILES:
        head += [f'{prof.capitalize()}: вершина недель {f}, вариантов {n}' for n in OFFERS]
    return table(head, rows)


def e14_many_run():
    rows = [[dec1(r, 100), dec1(fl, 100), pct(sh), pct(full)] for r, fl, sh, full in SIM_MANY]
    return table(['Отношение отряда к уровню Убер-босса', 'Этажей взято из 14', 'Доля очков полного биома', 'Биом закрыт целиком'], rows)


def verdict(k):
    lo, hi = BALANCE_BP
    return 'крафт сильнее' if k < lo else 'биом сильнее' if k > hi else 'не очевидно'


def e15_many_value():
    """Хозяин Многоликого — увлечённый: он доходит до пятнадцатой ступени. Обычный — если Многоликий выпал из сундука."""
    rows = []
    for c in CYCLES:
        v, reg = many_value('увлечённый', c), many_value('обычный', c)
        n3 = week_results('увлечённый', c, OFFERS[-1])[-1][2]['many']
        free = week_results('увлечённый', c, OFFERS[-1], once=False)[-1][2]
        shards = ECHO_SHARDS_X10[c][1] * LIK_SHARE_BP // (10 * BP)
        k2 = v['k'] * LIK_SHARDS // shards
        rows.append([ROMAN[c - 1], f"{dec1(v['many'], 1000)} / {dec1(n3, 1000)}; без предела — {dec1(free['many'], 1000)}, "
                     f"биомы +{pct(free['biome'] * BP // free['pts'])} очков", dec1(v['r'], 100), f"{fmt(v['pts'])} · {pct(v['share'])}",
                     f"{fmt(v['biome_souls'])} · {pct(v['biome_souls'] * BP // v['souls'])}", fmt(v['craft_souls']),
                     f"{mult(v['k'], BP)} — {verdict(v['k'])}", f"{shards} → {mult(k2, BP)} — {verdict(k2)}",
                     f"{pct(reg['share'])} · {pct(reg['biome_souls'] * BP // reg['souls'])}"])
    return table(['Цикл', 'Многоликих у увлечённого в последнюю неделю: вариантов 1 / 3, раз в неделю', 'Отношение отряда к Уберу',
                  'Биом: очков · доля полного', 'Биом в душах · доля душ Эхо недели', f'Крафт: {LIK_SHARDS} осколков Лика в душах',
                  'Биом к крафту сейчас', f'Предложение: осколков крафта ({pct(LIK_SHARE_BP)} недели) → биом к крафту',
                  'Обычный, Многоликий из сундука: доля биома · в душах недели'], rows)


def tables():
    if not (SIM_ROUNDS and SIM_DMG and SIM_KILL and SIM_MANY):
        sys.exit('Нет замеров прогона: запустите echo.py --sim и перенесите вывод в SIM_ROUNDS, SIM_DMG, SIM_KILL, SIM_MANY')
    stale = [TYPE_NAME[t] for t in SIM_KILL if SIM_KILL[t][0] != hp_pct(t)]
    if stale:
        print('!! здоровье поменялось после замера у ' + ', '.join(stale) + ' — атаки пересчитаны пропорционально; перемерить --sim', file=sys.stderr)
    return [('Э1. Сила ступеней: уровень врагов foeLvl и сила к «биому» цикла I', e1_power()),
             ('Э2. Раунды: урон по главному врагу за атаку у «своего» отряда', e2_rounds()),
             ('Э3. Опасность: героев живо после одной атаки и доля вайпов', e3_danger()),
             ('Э4. Здоровье главного врага и защитников, атаки на убийство', e4_hp()),
             ('Э5. Бюджет душ Эхо по неделям', e5_budget()),
             ('Э6. Цена атаки, души', e6_prices()),
             ('Э7. Атак на убийство ступени у отрядов калькулятора', e7_attacks()),
             (f'Э8. Неделя Эхо: вершина лестницы, убийства, атаки, очки — вариантов призыва {OFFERS[0]}', e8_ladder(OFFERS[0])),
             (f'Э8а. То же с артефактом выбора — вариантов {OFFERS[-1]}', e8_ladder(OFFERS[-1])),
             ('Э8б. Циклы IV–VI по образцу цикла III', e8b_late()),
             ('Э9. Рейтинговые очки за убийство и за этаж биома Многоликого', e9_points()),
             (f'Э10. Разброс очков на душу внутри цикла: не больше ×{SPREAD_MAX} (§17.6)', e10_spread()),
             ('Э11. Планки и удержание §17.6', e11_planks()),
             ('Э12. Риск недобивания: души на убийство против душ Эхо за срок цели', e12_life()),
             ('Э13. Чувствительность к цене раунда: вершина лестницы по неделям цикла II', e13_sens()),
             ('Э14. Биом Многоликого: одна попытка, 14 этажей', e14_many_run()),
             ('Э15. Биом Многоликого против атак за души и против крафта: последняя неделя цикла', e15_many_value())]


def main():
    for title, body in tables():
        print(f'\n### {title}\n\n{body}')


def write_doc():
    """Черновик: каждую таблицу «### Эn. …» с её строками заменить свежим выводом. Текст вокруг не трогать.
    Пересборка без правок данных даёт те же байты."""
    doc = DOC.read_text(encoding='utf-8')
    for title, body in tables():
        key = title.split('.', 1)[0]
        pat = re.compile(r'^### ' + re.escape(key) + r'\. .*\n\n(?:\|.*\n)+', re.M)
        if len(pat.findall(doc)) != 1:
            sys.exit(f'В черновике нет таблицы {key} или она не одна: {DOC.relative_to(E.ROOT).as_posix()}')
        doc = pat.sub(lambda m: f'### {title}\n\n{body}\n', doc)
    DOC.write_text(doc, encoding='utf-8')
    print(f'Записано: {DOC.relative_to(E.ROOT).as_posix()}')


# ======================= ДАННЫЕ ПРОТОТИПА (--js) =======================

JS_HEAD = """/* Энериум · правила боя в Эхо (ADR-0025, §17 GDD). Собрано tools/content-gen/economy/echo.py --js — руками не править:
   правка — в данных echo.py, затем пересобрать. Черновик — docs/content/эхо-экономика.md. Все числа — демонстрация, не баланс.

   window.EN_ECHO_RULES:
   - bp — 10 000 = 100 %.
   - ladder — типы ступеней 1–15: o рядовой, e элита, b босс недели, u Убер-босс, m Многоликий.
   - types — тип главного врага:
       foes — врагов в бою: главный и четыре защитника; у Многоликого — он один (ADR-0025);
       rounds — раундов в атаке (§17.3): maxRounds боя;
       rank — ранг карты главного врага в ядре: от него иммунитет к контролю (RULES.resist); Многоликий — лёгкий бой, набор элиты;
       design — атак на убийство у «своего» отряда: отношение уровней onLevel;
       lifeH — срок цели, часы (как в прототипе экрана, демо).
   - summonSouls — цена призыва, 1 душа на всех циклах (§17.1, §36.4); Многоликий — пятнадцатая ступень, его зовёт тот же призыв.
   - pickW — вес ступени в призыве (веса прототипа экрана; 15-й — предложение). Лестница растёт после победы над верхней (§17.4).
   - onLevel — отношение (12 + уровень отряда) / (12 + foeLvl) × 100, при котором ступень «по силам»: на нём мерили здоровье.
   - statsFrom — откуда карта врага Эхо берёт характеристики st и hpPct: в echo-foes.js их нет. По классу — образец Мастерской
       (EB.FOES): o — у рядовых, x — у элит, боссов, Убер-боссов и Многоликого. Так шёл замер; иначе здоровье перемерить echo.py --sim.
   - cycles — по номеру цикла, '2'…'6': 15 ступеней, у каждой:
       step — номер ступени, g — тип;
       foeLvl — уровень всех карт боя, главного врага и защитников: как BIOMES.foeLvl.base, без роста по этажу;
       bossHpPct — здоровье главного врага, % базы его карты: заменяет hpPct карты, как BIOMES.bossHpPct.
         Ядро в модели раундов само умножает здоровье врагов на RULES.rounds.foeHpPct (60 %): замеры шли этим путём.
         Если режим отдаёт ядру maxHp, то maxHp = floor(100 × (100 + выносливость) × (12 + foeLvl) × bossHpPct × 60 / (100 × 12 × 100 × 100));
       foeHpPct — здоровье защитников, % hpPct своей карты, как BIOMES.foeHpPct; у Многоликого защитников нет — null;
       souls — цена одной атаки в душах;
       points — рейтинговые очки за убийство главного врага (§17.5–17.6);
       у ступеней 1–14 ещё этаж биома Многоликого: manyHpPct — здоровье главного врага этажа (попытка одна), manyPoints — очки за взятый этаж.
   - many — биом Многоликого (ADR-0025): ресурс с пятнадцатой ступени активирует его на своей неделе или уходит в крафт.
       floors — этажи: ступени 1–14 недели по порядку, их составы, уровни и раунды; attempts — попыток; souls — душ на атаки;
       этаж взят, когда пал главный враг; здоровье и павшие переходят дальше, как в биоме (ADR-0007).
   Замер — отрядом прототипа (economy.SIM_JS) на врагах недели: SIM_SRC_TEXT. */
"""


def rules_obj():
    out = {'bp': BP, 'onLevel': ON_LEVEL, 'ladder': list(LADDER), 'summonSouls': SUMMON_SOULS, 'pickW': PICK_W, 'statsFrom': TEMPLATES,
           'types': {t: {'name': TYPE_NAME[t], 'foes': FOES_N[t], 'rounds': ROUNDS[t], 'rank': RANK[t], 'design': DESIGN[t],
                         'lifeH': LIFE_H[t]} for t in TYPES},
           'many': {'floors': UBER, 'attempts': 1, 'souls': 0},
           'cycles': {}}
    for c in CYCLES:
        steps = []
        for s in range(1, MANY + 1):
            t = type_of(s)
            x = {'step': s, 'g': t, 'foeLvl': foe_lvl(c, s), 'bossHpPct': hp_pct(t), 'foeHpPct': DEF_HP_PCT if FOES_N[t] > 1 else None,
                 'souls': price(t, c), 'points': points(c, s)}
            if s <= UBER:
                x.update(manyHpPct=many_hp_pct(t), manyPoints=many_floor_points(c, s))
            steps.append(x)
        out['cycles'][str(c)] = steps
    return out


def write_js():
    o = rules_obj()
    J = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':'))
    lines = [JS_HEAD.replace('SIM_SRC_TEXT', SIM_SRC or 'нет замера') + 'window.EN_ECHO_RULES = {',
             f'  bp: {o["bp"]}, onLevel: {o["onLevel"]}, summonSouls: {o["summonSouls"]},',
             f'  ladder: {J(o["ladder"])},', f'  pickW: {J(o["pickW"])},', f'  many: {J(o["many"])},',
             f'  statsFrom: {J(o["statsFrom"])},', '  types: {']
    lines += [f'    {t}: {J(v)},' for t, v in o['types'].items()]
    lines += ['  },', '  cycles: {']
    for c, steps in o['cycles'].items():
        lines.append(f"    '{c}': [")
        lines += [f'      {J(x)},' for x in steps]
        lines.append('    ],')
    lines += ['  },', '};', '']
    OUT_JS.write_text('\n'.join(lines), encoding='utf-8')
    print(f'Записано: {OUT_JS.relative_to(E.ROOT).as_posix()}')


# ======================= ПРОГОН (--sim) =======================

SIM_BODY = r"""
// Эхо: один этаж, главный враг и четыре защитника; Многоликий — один (ADR-0025).
const CFG = CFG_JSON;
for (const id in CFG.proxy) { EB.FOES[id] = CFG.proxy[id].foe; globalThis.EN_KITS.foes[id] = CFG.proxy[id].kit; }
// враги недели из echo-foes.js: составы, наборы, способности Убер-боссов; статы — образец Мастерской того же класса. Нет файла — заглушки
let LU = CFG.lineups, WEEKS = null, SRC = 'заглушки из карт Мастерской';
if (CFG.real) {
  try { require(process.cwd() + '/' + CFG.real); } catch (e) {}
  const F = globalThis.EN_ECHO_FOES;
  if (F && F.weeks && F.foes) {
    if (F.abilities && F.abilities.length) {   // способности Убер-боссов — в библиотеку ядра (addLib), без него — до первого боя
      if (EB.addLib) EB.addLib(F.abilities);
      else globalThis.EN_ABILITIES.sets.push({ items: F.abilities.map(a => ({ id: a.id, n: a.n, d: a.d, set: a.set, t: a.t, k: a.k, tier: a.tier, trig: a.trig, data: a.data })) });
    }
    for (const fid in F.foes) {
      const f = F.foes[fid], tpl = EB.FOES[CFG.templates[f.rank === 'o' ? 'o' : 'x'][f.cls]];
      if (!tpl) continue;
      EB.FOES[fid] = { rank: f.rank, name: f.name, cls: f.cls, el: f.el, race: f.race, st: tpl.st, hpPct: tpl.hpPct, fx: tpl.fx };
      globalThis.EN_KITS.foes[fid] = { rank: f.rank, ultPct: f.ultPct, actPct: f.actPct, kit: f.kit, basicAll: f.basic ? f.basic.coef : 0 };
    }
    const real = {}, px = Object.keys(CFG.mainProxy).join('');
    SRC = CFG.real + ', недель ' + F.weeks.length + ': ' + CFG.realTypes + (px ? ', у ' + px + ' главный — заглушка' : '') + (CFG.skip.length ? '; вне замера — ' + CFG.skip.join(', ') : '')
      + (EB.echoBattle ? '; режим Эхо ядра — echoBattle' : '; бой этажа ядра — create');
    for (const w of F.weeks) for (const fid of w.steps) { const f = F.foes[fid]; if (EB.FOES[fid] && !CFG.skip.includes(fid)) (real[f.g] = real[f.g] || []).push([fid].concat(f.def || [])); }
    LU = Object.assign({}, CFG.lineups); for (const t of CFG.realTypes) if (real[t]) LU[t] = real[t];
    for (const t in CFG.mainProxy) if (real[t]) LU[t] = real[t].map(lu => [CFG.mainProxy[t]].concat(lu.slice(1)));   // заглушка главного, защитники недели
    // этажи биома Многоликого — ступени 1–14 недели с их защитниками: из w.biome, а нет его — из составов ступеней
    WEEKS = F.weeks.filter(w => !w.steps.some(fid => CFG.skip.includes(fid)))
      .map(w => (w.biome || w.steps.slice(0, 14).map(fid => ({ foes: [fid].concat(F.foes[fid].def || []) }))).map(x => x.foes));
  }
}
const isReal = t => !!WEEKS && CFG.realTypes.includes(t);
const NS = t => isReal(t) ? CFG.seedsReal : CFG.seeds;
function build(lu, lvl, hpPct, hp) {
  EB.BIOMES.echo = { n: 3, cycle: 2, name: 'Эхо', seed: 1, floors: [{ g: 'b', m: lu }], foeLvl: { base: lvl, perFloor: 0 },
    foeHpPct: CFG.defHp, bossHpPct: hpPct, siege: true };
  return EB.floorFoes('echo', 1, hp);
}
// режим Эхо ядра (echoBattle): бой кончается, когда пал главный враг; защитников — по типу, у Многоликого их нет.
// used — сработавшее у главного «раз за жизнь»: режим помнит его между атаками. Нет режима — бой этажа (create)
function battle(heroes, t, lu, lvl, hpPct, R, hp, key, used) {
  const foes = build(lu, lvl, hpPct, hp), seed = EB.seedOf(key);
  if (used) foes[0].used = used;
  const need = EB.echoBattle && EB.RULES.echo && EB.RULES.echo.guards ? EB.RULES.echo.guards[t] : null;
  return need != null && foes.length === need + 1 ? EB.echoBattle(heroes, { seed, g: t, main: foes[0], guards: foes.slice(1), maxRounds: R })
                                                 : EB.create({ heroes, foes, seed, mode: 'rounds', maxRounds: R });
}
const squad = lvl => SQUAD.map(h => EB.heroSrc(Object.assign({}, h, { lvl })));
const heroLvl = (lvl, r) => Math.floor((12 + lvl) * r / 100) - 12;
function damage(t, R, r) {   // главный враг «бездонный»: урон за атаку в % базы карты
  const ds = []; let wipe = 0, alive = 0;
  LU[t].forEach((lu, li) => { for (let s = 0; s < NS(t); s++) {
    const b = EB.run(battle(squad(heroLvl(CFG.lvl, r)), t, lu, CFG.lvl, CFG.deep, R, null, `эхо|${t}|${li}|${s}|1`)), m = b.u[1][0];
    ds.push(Math.floor((m.maxHp - m.hp) * CFG.deep / m.maxHp)); if (b.why === 'wipe') wipe++; alive += b.u[0].filter(u => u.alive).length;
  } });
  ds.sort((x, y) => x - y);
  return [Math.floor(ds.reduce((x, y) => x + y, 0) / ds.length), ds[Math.floor(ds.length / 5)], Math.floor(wipe * 10000 / ds.length), Math.floor(alive * 10 / ds.length)];
}
const stuck = new Set();   // главные враги, которых не убить и при самом сильном отряде прогона: ошибка набора, а не баланс
function kill(t, r, hpPct) {   // здоровье главного сохраняется между атаками (§17.3): атак до его гибели, сид — на атаку
  let n = 0, cnt = 0;
  LU[t].forEach((lu, li) => { for (let s = 0; s < NS(t); s++) {
    let hp = null, used = null, k = 0, dead = false;
    while (k < CFG.cap && !dead) {
      k++; const b = EB.run(battle(squad(heroLvl(CFG.lvl, r)), t, lu, CFG.lvl, hpPct, CFG.rounds[t], hp, `эхо|${t}|${li}|${s}|${k}`, used)), m = b.u[1][0];
      dead = !m.alive; hp = m.hp; used = m.usedBiome.slice();
    }
    n += dead ? k : CFG.cap * 10; cnt++;
    if (!dead && r === CFG.ratios[CFG.ratios.length - 1]) stuck.add(lu[0]);
  } });
  const a = Math.floor(n * 100 / cnt);
  return a >= CFG.cap * 100 ? null : a;
}
function manyRun(r) {   // биом Многоликого: ступени 1–14 подряд, попытка одна, этаж взят — пал главный; здоровье и павшие — дальше
  const top = CFG.many[CFG.many.length - 1], total = CFG.many.reduce((a, f) => a + f.pts, 0);
  let floors = 0, pts = 0, full = 0;
  for (let s = 0; s < CFG.manyRuns; s++) {
    let cur = squad(heroLvl(top.lvl, r)), k = 0;
    const w = WEEKS ? WEEKS[s % WEEKS.length] : null;   // этажи биома недели — ступени 1–14 с её защитниками
    for (const f of CFG.many) {
      const lu = !w ? f.lu : isReal(f.t) ? w[k] : CFG.mainProxy[f.t] ? [CFG.mainProxy[f.t]].concat(w[k].slice(1)) : f.lu;
      const b = battle(cur, f.t, lu, f.lvl, f.hp, f.rounds, null, `многоликий|${s}|${k + 1}`);
      while (!b.over && b.u[1][0].alive) EB.step(b);
      if (b.u[1][0].alive) break;
      k++; pts += f.pts; cur = EB.carry(cur, b);
      if (cur.every(h => h.dead)) break;
    }
    floors += k; if (k === CFG.many.length) full++;
  }
  return [Math.floor(floors * 100 / CFG.manyRuns), Math.floor(pts * 10000 / (total * CFG.manyRuns)), Math.floor(full * 10000 / CFG.manyRuns)];
}
const out = { src: SRC };
if (CFG.stage === 1) {
  out.rounds = {}; out.dmg = {};
  for (const t in CFG.try) out.rounds[t] = CFG.try[t].map(R => [R, damage(t, R, CFG.onLevel)[0], damage(t, R, CFG.roundsDanger)[3]]);
  for (const t of CFG.types) out.dmg[t] = CFG.ratios.map(r => [r].concat(damage(t, CFG.rounds[t], r)));
} else {
  out.kill = {};
  for (const t in CFG.hp) out.kill[t] = CFG.ratios.map(r => [r, kill(t, r, CFG.hp[t])]);
  out.many = CFG.manyRatios.map(r => [r].concat(manyRun(r)));
  out.stuck = [...stuck];
}
console.log(JSON.stringify(out));
"""


def node(cfg):
    head = E.SIM_JS.split('// один забег')[0]
    js = head + SIM_BODY.replace('CFG_JSON', json.dumps(cfg, ensure_ascii=False))
    res = subprocess.run(['node', '-e', js], cwd=E.ROOT, capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        sys.exit(res.stderr)
    return json.loads(res.stdout)


def many_floors_cfg():
    """Этажи биома Многоликого для прогона: ступени 1–14 цикла II, составы по кругу внутри типа."""
    out, seen = [], {}
    for s in range(1, UBER + 1):
        t = type_of(s)
        i = seen.get(t, 0)
        seen[t] = i + 1
        c = SIM_LVL_STEP[0]
        out.append({'t': t, 'lu': LINEUPS[t][i % len(LINEUPS[t])], 'lvl': foe_lvl(c, s), 'hp': many_hp_pct(t), 'rounds': ROUNDS[t],
                    'pts': many_floor_points(c, s)})
    return out


def measure():
    global SIM_DMG
    base = {'proxy': PROXY, 'lineups': LINEUPS, 'lvl': foe_lvl(*SIM_LVL_STEP), 'defHp': DEF_HP_PCT, 'deep': SIM_DEEP,
            'seeds': SIM_SEEDS, 'seedsReal': SIM_SEEDS_REAL, 'cap': KILL_CAP, 'rounds': ROUNDS, 'ratios': SIM_RATIOS,
            'onLevel': ON_LEVEL, 'roundsDanger': ROUNDS_DANGER, 'types': list(TYPES), 'templates': TEMPLATES, 'realTypes': REAL_TYPES,
            'mainProxy': MAIN_PROXY, 'skip': SIM_SKIP,
            'real': FOES_JS if (E.ROOT / FOES_JS).exists() else ''}
    d1 = node(dict(base, stage=1, **{'try': ROUNDS_TRY}))
    SIM_DMG = {t: [tuple(x) for x in v] for t, v in d1['dmg'].items()}
    hp = {t: hp_pct(t) for t in TYPES}
    d2 = node(dict(base, stage=2, hp=hp, many=many_floors_cfg(), manyRatios=SIM_MANY_RATIOS, manyRuns=SIM_MANY_RUNS))
    print('SIM_ROUNDS = {')
    for t, v in d1['rounds'].items():
        print(f"    '{t}': {[tuple(x) for x in v]},")
    print('}')
    print('SIM_DMG = {')
    for t, v in SIM_DMG.items():
        print(f"    '{t}': {v},")
    print('}')
    print('SIM_KILL = {')
    for t, v in d2['kill'].items():
        print(f"    '{t}': ({hp[t]}, {[tuple(x) for x in v]}),")
    print('}')
    print(f"SIM_MANY = {[tuple(x) for x in d2['many']]}")
    print(f"SIM_SRC = '{d1['src']}'")
    if d2['stuck']:
        print(f"# не умирают и при отношении {SIM_RATIOS[-1] / 100}: {d2['stuck']} — ошибка набора; вынести в SIM_SKIP и сообщить", file=sys.stderr)


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if '--sim' in sys.argv:
        measure()
    elif '--js' in sys.argv:
        write_js()
    elif '--doc' in sys.argv:
        write_doc()
    else:
        main()
