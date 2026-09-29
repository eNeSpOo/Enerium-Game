# -*- coding: utf-8 -*-
"""Сет-бонусы орденов и донатных сетов — калькулятор (черновик).

Печатает таблицы для docs/content/сет-бонусы.md:
- ступени сетов по сумме личных максимумов пятерых (ADR-0022) и когда они реальны;
- сколько раз в день срабатывает бонус у обычного и увлечённого игрока и какую долю дохода своего ресурса он даёт;
- цены входа к рунным боссам: ключи — горлышко при общем капе побед (ADR-0022);
- правило ×1,7 для донатных сетов с учётом входа;
- цену героев за золото против дохода обычного игрока (Т13 черновика экономики).
Доход, прогон боя и руны берёт из калькулятора экономики `economy.py` через importlib и его не меняет.
Ключи контрактов — из прогона сборщика контрактов `design/ui/contracts.js`: после его пересборки — перезапустить.
Составы орденов — из `docs/content/герои/состав-героев.csv` и `герои.csv`: после пересборки состава — перезапустить.

    python tools/content-gen/economy/sets.py         # все таблицы, markdown
    python tools/content-gen/economy/sets.py --sim   # перемерить чистые закрытия (нужен Node); вывод — в CLEAN_FROM

Все числа — демонстрация и лежат в начале файла, в функциях только алгоритм.
Расчёт целочисленный: доли — в базисных пунктах (10 000 = 100 %), счётчики дня — в сотых.
"""
import csv
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

_spec = importlib.util.spec_from_file_location('economy', Path(__file__).resolve().parent / 'economy.py')
E = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(E)
BP, HOUR_MS = E.BP, E.HOUR_MS
HEROES_DIR = E.ROOT / 'docs' / 'content' / 'герои'

# ======================= ДАННЫЕ =======================

ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']
TIER_HEROES = (1, 3)                       # §30: ступень I — один участник с доблестью ≥ 1, II — трое; III — все на личных максимумах
TIER_BY_SUM = ((15, 3), (10, 2), (5, 1))   # ADR-0022: сумма личных максимумов пятерых от — ступеней у сета

# --- циклы: дни считает economy.timeline с начала цикла II ---
CYCLE_LEN = {2: E.CYCLE_DAYS, 3: 21}   # цикл II — прогон темпа (economy.CYCLE_DAYS, pace.json); цикл III — допущение: длиннее II (ADR-0018)
# забегов одновременно — номер цикла (ADR-0014; ADR-0031, п. 3): economy.slots, recipes.js. «Право владыки» не считаем

# --- цикл I — обучение на часы (ADR-0018): ступень I возможна только во втором биоме, руной уровня аккаунта 8 (§16).
# Биом 2 — прогон темпа (pace.json, rows.b2.tot: этажи, убитые, дух, золото до победы над стражем); нет прогона — допущения ниже ---
TUTOR_B2_HOURS = 3        # ADR-0018: биом 2 — ещё около трёх часов
TUTOR_B2_LEVEL = 43       # допущение: пачка у стены образца — ряд прогона «43»
TUTOR_BOSSES = 2          # боссы биомов 1 и 2, по разу; оба закрытия — чистые (допущение)

# --- чистое закрытие: замер прототипа (--sim) на образце цикла II, отряд прототипа ---
CLEAN_FROM = 145          # с этого уровня прогона закрывающий забег идёт без павших: реальный отряд (ADR-0031, п. 1 — доблесть 0,
                          # у бойца урона 1), наборы, сжатые к личному максимуму; босс образца падает осадой со 130-го, чисто — со 145-го
                          # (с доблестью 2 / 1 / 2 / 1 / 3 было со 125-го)

# --- рунные боссы: ADR-0022 — общий кап побед в день (recipes.js, dailyGuardianCap) и доля побед у стража пределов 7 : 3 —
# одно место, калькулятор экономики (economy.rx, economy.RB_SPLIT_BP) ---
RB_CAP = E.rx()['cap']
RB_SPLIT_BP = E.RB_SPLIT_BP

# --- рунные ключи ---
# ключи контрактов — прогон сборщика контрактов, а не прежняя заглушка «1 ключ × цикл за 10 очков»: ключи режима «Контракты»
# в неделю — награды заданий, сундук недельного контракта и сундуки планок рейтинга, без ключей с боссов (их считает этот калькулятор).
# Данные — design/ui/contracts.js, econ[цикл][профиль].ctKeys; обоснование — docs/content/контракты.md, «Прогон»
CONTRACTS_JS = E.ROOT / 'design' / 'ui' / 'contracts.js'
CONTRACT_PROFILE = {'обычный': 'o', 'увлечённый': 'e'}   # профиль калькулятора → профиль прогона контрактов
# вариант: имя, шанс ключа с элиты и с босса (за срабатывание — цикл биома, §11), вход у стража пределов и доблести,
# рост цены с циклом РБ: 'c' — × цикл, 'tri' — × цикл × (цикл + 1) / 2
# принятый вариант Б — числа рецептов (recipes.js: шанс ключа с босса, вход у стражей), прежний и А — справка
KEY_VARIANTS = [
    ('прежний §11', 500, 1000, 1, 2, 'c'),
    ('А: только цена, справка', 500, 1000, 3, 5, 'tri'),
    ('Б: принят, ключ без элит', 0, E.rx()['boss_key_bp'], E.rx()['entry'][0], E.rx()['entry'][1], 'c'),
]
KEY_PICK = 2              # вариант Б — принят (ADR-0023, п. 16), в §11
# Т12 черновика экономики: день с начала цикла II, отрядов у свободного и у плательщика. Слотов — номер цикла: лишний отряд у плательщика —
# только пока свободный не купил героев на все слоты (1-й день цикла II и 1-й день цикла III)
T12_CASES = [(1, 1, 2), (7, 2, 2), (CYCLE_LEN[2], 2, 2), (CYCLE_LEN[2] + 1, 2, 3)]
PAYER_WHATIF = {'v5_for_A': 155, 'v2_for_B': 10}   # проверки «что если»: N сета V в варианте А, N сета II в варианте Б

# --- другие режимы: в GDD есть только попытки или ничего — остальное допущения ---
ARENA_WINS = 20 * 5000 // BP            # §20.2: 20 атак в день; побед при Эло — допущение 50 %
LEAGUE_WINS_X10 = 6 * 5000 * 10 // BP   # §20.4: 6 матчей в день; побед — 50 %, в десятых
CLAN_ATTACKS = 5                        # §25.1: 5 атак в день, древо добавляет до 4
RITUALS = {'обычный': 2, 'увлечённый': 3}          # допущение: ритуалов на слот в день; слотов — номер цикла
ECHO_SPEND_BP = 5000                    # допущение: доля душ дня, что уходит в Эхо
ECHO_LOST_BP = 1000                     # допущение: доля трат Эхо, что сгорает с ушедшими по времени целями
ECHO_SUMMONS = {'обычный': 8, 'увлечённый': 20}   # допущение: призывов в день
ECHO_BOSSES = {'обычный': 1, 'увлечённый': 3}     # допущение: убитых боссов Эхо в день
ECHO_EXPIRED = {'обычный': 1, 'увлечённый': 1}    # допущение: целей Эхо, ушедших по времени, в день
RB_FAILS_X10 = 10                       # допущение: провалов у РБ в день в среднем по циклу, в десятых
SPINS_X100 = {'бесплатный': 15, 'плательщик': 45}   # §9.3: игровой Энериум — треть платящего; прокрутка 100 (§15.1)
STREAK = {'обычный': 5, 'увлечённый': 7}            # допущение: дней подряд с полным дневным контрактом за неделю
CHEST_ITEMS, CHEST_KEYS_PER_ITEM = 4, 2  # черновик «Дроп»: ларец контрактов редкости 3 — 4 предмета по 2 × цикл ключей

# --- награды, которых нет в таблице автора: предложение ---
CHEST_BASE = 3            # «Стёртые Ступени»: сундук — 3 базовых ресурса биома, где взят N-й этаж
CARGO_BASE = 36           # «Спящие Караваны»: груз — добыча ритуала рабочих редкости 4 (черновик «Дроп»): 36 базовых

# --- герои за золото: ADR-0022 — 70 % героев, цена растёт от героя к герою; ADR-0023, «Второй круг», п. 1 — +30 % линейно ---
GOLD_FIRST = 10000        # ADR-0014: первый герой за золото цикла c стоит 10 000 × c
# варианты цены k-го героя, купленного в цикле: имя, рост, шаг — 'lin': × (1 + шаг × (k − 1)), 'pow': × (1 + шаг)^(k − 1).
# Первый — принятый, остальные — справка
GOLD_VARIANTS = [
    ('+30 % линейно — принято', 'lin', 3000),
    ('+3 % линейно — справка, прежнее предложение', 'lin', 300),
    ('×1,3 сложным процентом — справка, отклонено', 'pow', 3000),
]
GOLD_BUDGET_BP = 8000     # допущение: на героев идёт 80 % золота, остальное — артефакты, лавка, рынок, заверение
GOLD_TUTOR = 5            # пачка обучения — пятеро за золото в цикле I (ADR-0018)

# --- сеты: № таблицы автора, цикл, имя, счётчик, N автора, N предложения по ступеням I / II / III, что даёт ---
ORDERS = [
    (2, 1, 'Орден Пыльной Тропы', 'clean', (15, 10, 5), (15, 10, 5), 'награда босса ×2 за чистое закрытие'),
    (3, 1, 'Орден Расколотого Гроша', 'kills', (100, 50, 30), (50, 30, 20), 'золото врага ×2'),
    (4, 1, 'Орден Стёртых Ступеней', 'floors', (500, 300, 200), (500, 300, 200), f'сундук: {CHEST_BASE} базовых'),
    (5, 1, 'Орден Ключарей Ремесла', 'el', (150, 100, 60), (50, 30, 20), 'второй ключ ремесла с элиты'),
    (7, 2, 'Орден Долгого Дыхания', 'rituals', (50, 30, 15), (50, 30, 15), 'награда ритуала ещё раз'),
    (8, 2, 'Орден Молчаливых Ключей', 'rb_fail', (10, 8, 4), (10, 6, 4), 'сожжённые ключи назад'),
    (9, 2, 'Орден Погребальных Свеч', 'echo_souls', (200, 150, 50), (50, 30, 20), '1 душа за N потраченных'),
    (10, 2, 'Орден Пустых Сетей', 'echo_expired', (5, 3, 1), (5, 3, 1), 'половина душ ушедшей цели назад'),
    (12, 3, 'Орден Багровой Арены', 'arena', (140, 100, 60), (140, 100, 60), 'лутбокс снаряжения'),
    (13, 3, 'Орден Спящих Караванов', 'boss', (100, 75, 50), (60, 40, 25), f'груз каравана: {CARGO_BASE} базовых'),
    (15, 4, 'Орден Слепых Ставок', 'spins', (20, 15, 10), (20, 15, 10), 'награда прокрутки ×2'),
    (16, 4, 'Орден Равного Суда', 'league', (70, 50, 30), (45, 30, 18), 'лутбокс снаряжения'),
    (18, 5, 'Орден Немых Свидетелей', 'streak', (7, 5, 3), (5, 3, 2), 'ларец контрактов'),
    (19, 5, 'Орден Тысячи Птиц', 'summons', (100, 50, 25), (10, 6, 3), 'призыв без души; предложение — +2 варианта'),
    (20, 5, 'Орден Костяного Счёта', 'clan', (30, 20, 10), (30, 20, 10), 'личные очки ×2'),
    (21, 5, 'Орден Последних Вздохов', 'echo_boss', (15, 10, 5), (15, 10, 5), 'личные очки ×2'),
]
# у «Погребальных Свеч» автор: 1 за 200, 1 за 150, 2 за 100 — в N на одну душу это 200 / 150 / 50
# имена по лор-аудиту (состав героев): в данных — имена черновика, по ним идёт связь с `герои.csv`
ORDER_NAMES = {'Орден Багровой Арены': 'Песка Сеймура', 'Орден Равного Суда': 'Выслушавших'}
# братства черновика, которые могут стать орденами (состав героев): их суммы — для справки, бонусов у них нет
EX_BROTHERHOODS = ['Хранители Песочных Часов', 'Ключники Безвременья', 'Прозревшие', 'Собиратели Осколков']
# донатные сеты: цикл, пятеро, счётчик, N автора, N предложения; личный максимум героя — номер цикла − 1 (ADR-0022)
DONAT_NAMES = {2: 'Менялы', 3: 'Под песком', 4: 'Снявшие Обод', 5: 'Оставшиеся', 6: 'Отмеченные'}   # ADR-0023, п. 9
DONAT = [
    (2, 'пять фармеров', 'boss', (100, 50, 25), (15, 10, 5), 'рунный ключ, штук — цикл биома'),
    (3, 'фармер, два героя контроля, танк, лекарь', 'rf', (300, 150, 100), (300, 150, 100), 'души элиты биома или её дух'),
    (4, 'те же классы', 'rb1', (150, 125, 100), (20, 10, 5), 'руна предела по весам стража'),
    (5, 'те же классы', 'rb2', (150, 125, 100), (250, 175, 125), 'руна доблести'),
    (6, 'пять бойцов урона', 'rb', (60, 40, 25), (60, 40, 25), 'руна любого предела на выбор'),
]

# ======================= РАСЧЁТ =======================


def squad_day(level, cycle, hours, in_cycle=1):
    """Один отряд за день забегов на образце: счётчики в сотых. Души — × номер биома (ADR-0011)."""
    eff = E.eff_level(level, cycle)
    row = E.sim_row(eff)
    runs, rf, el, boss, ms, wall = row[1:]
    g, s, _ = E.yield_of(row, E.RATES_NEW, E.mult_new(cycle, in_cycle))
    biome = 2 * cycle - 2 + in_cycle
    v = dict(rf=rf, el=el, boss=boss, kills=rf + el + boss, clean=boss if row[0] >= CLEAN_FROM else 0,
             floors=runs * (wall - 1) + boss, runs=runs, gold=g, spirit=s,
             souls=(el * E.RATES_NEW['elite'][2] + boss * E.RATES_NEW['boss'][2]) * biome)
    return {k: x * hours * HOUR_MS * 100 // ms for k, x in v.items()}


def add(acc, v):
    for k, x in v.items():
        acc[k] = acc.get(k, 0) + x
    return acc


def levels(hours):
    return E.timeline(E.RATES_NEW, E.mult_new, hours)[2]


def day_of(lv, d, hours, squads=None):
    """День d с начала цикла II: цикл и счётчики всех отрядов; squads — сколько отрядов, по умолчанию все слоты."""
    a, b = lv[min(d - 1, len(lv) - 1)]
    c = E.FIRST_CYCLE if d <= CYCLE_LEN[2] else E.FIRST_CYCLE + 1
    acc = {}
    for k in range(squads or E.slots(c)):
        add(acc, squad_day(a if k == 0 else b, c, hours))
    return c, acc


def cycle_days(hours):
    lv = levels(hours)
    return [(d,) + day_of(lv, d, hours) for d in range(1, CYCLE_LEN[2] + CYCLE_LEN[3] + 1)]


def average(days, c):
    sel = [x for _, cc, x in days if cc == c]
    return {k: sum(x[k] for x in sel) // len(sel) for k in sel[0]}


def tutor_b2():
    """Цикл I, биом 2 — счётчики за весь биом, в сотых. Есть прогон темпа (pace.json, rows.b2.tot) — его забеги до победы над
    стражем: этажи, рядовые, элиты, босс, дух и золото; души — по ставкам биома 2 (ADR-0011), плюс босс биома 1 один раз.
    Нет прогона — допущение: пачка у стены образца TUTOR_B2_HOURS часов в слотах цикла I, боссы биомов 1 и 2 по разу."""
    tot = E.pace_b2().get('tot')
    if tot:
        acc = {'rf': tot['o'] * 100, 'el': tot['e'] * 100, 'boss': (tot['b'] + 1) * 100, 'floors': (tot['floors'] + 1) * 100,
               'gold': tot['gold'] * 100, 'spirit': tot['spirit'] * 100, 'runs': tot['runs'] * 100}
        acc['kills'] = acc['rf'] + acc['el'] + acc['boss']
        acc['clean'] = acc['boss']
        acc['souls'] = (tot['e'] * E.RATES_NEW['elite'][2] * 2 + tot['b'] * E.RATES_NEW['boss'][2] * 2 + E.RATES_NEW['boss'][2]) * 100
        return acc
    acc = {}
    for _ in range(E.slots(1)):
        add(acc, squad_day(TUTOR_B2_LEVEL, 1, TUTOR_B2_HOURS, 2))
    for k in ('boss', 'clean', 'kills', 'floors'):
        acc[k] += TUTOR_BOSSES * 100
    acc['souls'] += sum(range(1, TUTOR_BOSSES + 1)) * E.RATES_NEW['boss'][2] * 100
    return acc


def base_of(day):
    return day['floors'] * E.BASE_CHANCE_BP * E.BASE_AMOUNT_X100 // (BP * 100)


# --- ступени ---

def tiers_of(total):
    return next((t for lo, t in TIER_BY_SUM if total >= lo), 0)


def roster():
    """Сеты по составу героев: герой черновика сохраняет орден черновика, донатный — только свой сет.
    Столбец «также в сете» добавляет героя ещё в один сет (ADR-0023, п. 11): это данные, а не код."""
    old = {r['id']: r for r in csv.DictReader((HEROES_DIR / 'герои.csv').open(encoding='utf-8-sig'))}
    out = {}
    for r in csv.DictReader((HEROES_DIR / 'состав-героев.csv').open(encoding='utf-8-sig')):
        d, src = r['из черновика'], r['источник']
        hero = (r['имя'], src.replace(',', ' ').replace(':', ' ').split()[0], int(r['максимум доблести']), r['цикл'])
        if d in old and not src.startswith('донат'):
            out.setdefault(old[d]['орден'], []).append(hero)
        if r.get('также в сете'):
            out.setdefault(r['также в сете'], []).append(hero)
    return out


def gold_heroes():
    """Героев за золото по циклам в составе героев."""
    out = {}
    for r in csv.DictReader((HEROES_DIR / 'состав-героев.csv').open(encoding='utf-8-sig')):
        if r['источник'].startswith('золото'):
            c = ROMAN.index(r['цикл']) + 1
            out[c] = out.get(c, 0) + 1
    return out


def short(name):
    return ORDER_NAMES.get(name, name.replace('Орден ', ''))


def donat_sum(c):
    return 5 * (c - 1)


# --- рунные ключи и победы у РБ ---

def price(v, c, rank):
    """Вход к РБ цикла c в ключах: rank 0 — страж пределов, 1 — страж доблести."""
    _, _, _, p1, p2, mode = KEY_VARIANTS[v]
    return (p1, p2)[rank] * (c * (c + 1) // 2 if mode == 'tri' else c)


_CT = {}


def contract_keys_week(c, prof='обычный'):
    """Ключей режима «Контракты» за неделю у профиля калькулятора в цикле c — прогон сборщика контрактов (contracts.js).
    Файл читается при первом обращении: калькулятор контрактов (contracts/capacity.py) импортирует этот модуль без него."""
    if not _CT:
        m = re.search(r'^window\.EN_CONTRACTS = (\{.*\});$', CONTRACTS_JS.read_text(encoding='utf-8'), re.M)
        if not m:
            sys.exit(f'{CONTRACTS_JS}: нет данных EN_CONTRACTS — собрать tools/content-gen/contracts/build.js')
        _CT.update(json.loads(m.group(1)))
    return _CT['econ'][str(c)][CONTRACT_PROFILE[prof]]['ctKeys']


def contracts_x100(c, prof='обычный'):
    """Ключей из контрактов за день, в сотых: неделя прогона контрактов на семь дней."""
    return contract_keys_week(c, prof) * 100 // E.WEEK_DAYS


def keys_x100(v, d, c, n2=0, prof='обычный'):
    """Ключей за день, в сотых: контракты по прогону (награды, сундуки недели и рейтинга), дроп элит и боссов, сет II."""
    _, e_bp, b_bp = KEY_VARIANTS[v][:3]
    return contracts_x100(c, prof) + (d['el'] * e_bp + d['boss'] * b_bp) * c // BP + (d['boss'] * c // n2 if n2 else 0)


def avg_price_x100(v, c):
    return (RB_SPLIT_BP * price(v, c, 0) + (BP - RB_SPLIT_BP) * price(v, c, 1)) * 100 // BP


def kills_x100(v, keys, c):
    """Побед у РБ за день, в сотых: сколько ключей хватит при доле 7 : 3, не выше общего капа."""
    return min(RB_CAP * 100, keys * 100 // avg_price_x100(v, c))


def kills_avg(v, days, c, n2=0, prof='обычный'):
    sel = [kills_x100(v, keys_x100(v, x, cc, n2, prof), cc) for _, cc, x in days if cc == c]
    return sum(sel) // len(sel)


def rune_days_sets(limit_x100, all_x100, n4=0, n6=0):
    """Как economy.rune_days, но победы в сотых и сеты IV и VI: +1 руна по весам стража за каждое n4-е убийство стража
    пределов, +1 руна на выбор за каждое n6-е убийство любого РБ — в высший предел, где рун ещё не хватает."""
    n = len(E.LIMITS)
    R = E.rx()
    per_win = [R['runes_per_win'] * 100 * w // BP for w in R['weights']]
    need = E.SQUAD * E.RUNES_PER_LIMIT * 100
    stock, nxt, out = [0] * n, E.START_LIMITS, [0] * E.START_LIMITS
    for d in range(E.GUARD_OPEN_DAY, E.GUARD_OPEN_DAY + E.DAYS_MAX):
        for k in range(n):
            stock[k] += per_win[k] * limit_x100 // 100 + (limit_x100 * R['weights'][k] // (BP * n4) if n4 else 0)
        if n6:
            pick = next((k for k in range(n - 1, nxt - 1, -1) if stock[k] < need), nxt)
            stock[min(pick, n - 1)] += all_x100 // n6
        for _ in range(2):
            while nxt < n and stock[nxt] >= need:
                stock[nxt] -= need
                out.append(d)
                nxt += 1
            for k in range(min(nxt, n - 1)):
                q = stock[k] // (R['reforge'] * 100)
                stock[k] -= q * R['reforge'] * 100
                stock[k + 1] += q * 100
        if nxt == n:
            break
    return out + [E.DAYS_MAX] * (n - len(out))


def valor_x10000(valor_x100, n5=0):
    """Рун доблести в день, в десятитысячных: осколки §11 и руна за каждое n5-е убийство стража доблести."""
    R = E.rx()
    return valor_x100 * R['shards_x100'] // R['valor_rune'] + (valor_x100 * 100 // n5 if n5 else 0)


def days_for(runes, rate_x10000):
    return -(-runes * 10000 // rate_x10000)


def split(kills):
    """Победы в сотых → у стража пределов и у стража доблести."""
    return kills * RB_SPLIT_BP // BP, kills - kills * RB_SPLIT_BP // BP


# --- золото ---

def gold_price(c, k, variant):
    """Цена k-го героя за золото, купленного в цикле c: первый — GOLD_FIRST × c, дальше шаг варианта."""
    _, mode, step = variant
    base = GOLD_FIRST * c
    if mode == 'lin':
        return base * (BP + (k - 1) * step) // BP
    return base * (BP + step) ** (k - 1) // BP ** (k - 1)


def gold_income(days):
    """Доход золотом по дням: [0] — цикл I, уровни аккаунта и биом 2; дальше — дни с начала цикла II, биомы и стражи."""
    out = {}
    for p, _ in E.PROFILES:
        inc = [E.account_gold() + tutor_b2()['gold'] // 100]
        for _, c, x in days[p]:
            k = kills_x100(KEY_PICK, keys_x100(KEY_PICK, x, c, prof=p), c)
            inc.append(x['gold'] // 100 + k * E.RATES_NEW['guard'][0] * E.mult_new(c) // (BP * 100))
        out[p] = inc
    return out


def gold_buy(variant, income, heroes):
    """Покупки по дням: на героев идёт GOLD_BUDGET_BP золота, каждый раз — самый дешёвый следующий герой открытых циклов.
    Возвращает по дням: куплено героев по циклам, потрачено, получено."""
    bought, wallet, spent, got, log = {1: 0, 2: 0, 3: 0}, 0, 0, 0, []
    for d, g in enumerate(income):
        got += g
        wallet += g * GOLD_BUDGET_BP // BP
        open_c = (1,) if d == 0 else (1, 2) if d <= CYCLE_LEN[2] else (1, 2, 3)
        while True:
            cand = [(gold_price(c, bought[c] + 1, variant), c) for c in open_c if bought[c] < heroes[c]]
            if not cand or min(cand)[0] > wallet:
                break
            price, c = min(cand)
            wallet -= price
            spent += price
            bought[c] += 1
        log.append((dict(bought), spent, got))
    return log


# ======================= ВЫВОД =======================

fmt, dec1, table = E.fmt, E.dec1, E.table


def ratio(num, den):
    """Отношение с двумя знаками, с округлением: ×1,71, а не ×1,70 у 70 / 41."""
    q = (num * 200 + den) // (2 * den)
    return f'×{q // 100},{q % 100:02d}'


def pct(bp):
    """Базисные пункты в проценты с одним знаком, с округлением."""
    q = (bp + 5) // 10
    return (f'{q // 10}' if q % 10 == 0 else f'{q // 10},{q % 10}') + ' %'


def num1000(v):
    """Число в тысячных: от 10 — целое, от 1 — с одним знаком, меньше — с двумя; с округлением."""
    if v >= 10000:
        return fmt((v + 500) // 1000)
    if v >= 1000:
        q = (v + 50) // 100
        return f'{q // 10}' if q % 10 == 0 else f'{q // 10},{q % 10}'
    q = (v + 5) // 10
    return f'0,{q:02d}'.rstrip('0').rstrip(',')


def per_day(x100, n):
    return num1000(x100 * 10 // n)


def rate3(x100, ns):
    """Срабатывания по ступеням: «в день», если на высшей хотя бы раз в день, иначе «раз в … дн.»."""
    if x100 >= 100 * ns[-1]:
        return ' / '.join(per_day(x100, n) for n in ns) + ' в день'
    if not x100:
        return 'нет'
    return 'раз в ' + ' / '.join(num1000(n * 100 * 1000 // x100) for n in ns) + ' дн.'


def tri(f, ns):
    return ' / '.join(f(n) for n in ns)


def counters_table(tut, c2, c3):
    keys = [('rf', 'Рядовых'), ('el', 'Элит'), ('boss', 'Боссов — закрытий'), ('clean', 'Чистых закрытий'),
            ('floors', 'Этажей'), ('gold', 'Золота'), ('spirit', 'Духа'), ('souls', 'Душ, × номер биома')]
    head = ['За день', 'Цикл I, биом 2: 3 ч за весь цикл'] + [f'Цикл {r}: {p}' for r in ('II', 'III') for p, _ in E.PROFILES]
    rows = []
    for k, name in keys:
        rows.append([name, fmt(tut[k] // 100)] + [fmt(d[k] // 100) for cyc in (c2, c3) for d in cyc])
    rows.append(['Базовых ресурсов, 10 % за этаж', fmt(base_of(tut) // 100)] + [fmt(base_of(d) // 100) for cyc in (c2, c3) for d in cyc])
    return table(head, rows)


def events(cnt, prof, d, cyc):
    """Событий счётчика за день, в сотых. d — средний день цикла; режимы вне биомов — по допущениям."""
    if cnt in d:
        return d[cnt]
    return {'rituals': RITUALS[prof] * E.slots(cyc) * 100,
            'rb_fail': RB_FAILS_X10 * 10,
            'echo_souls': d['souls'] * ECHO_SPEND_BP // BP,
            'echo_expired': ECHO_EXPIRED[prof] * 100,
            'arena': ARENA_WINS * 100,
            'league': LEAGUE_WINS_X10 * 10,
            'spins': SPINS_X100['бесплатный' if prof == 'обычный' else 'плательщик'],
            'summons': ECHO_SUMMONS[prof] * 100,
            'clan': CLAN_ATTACKS * 100,
            'echo_boss': ECHO_BOSSES[prof] * 100}[cnt]


def order_share(cnt, n, d, cyc):
    """Доля дохода своего ресурса на ступени с числом n, в базисных пунктах, и что это за доход."""
    boss_souls = E.RATES_NEW['boss'][2] * (2 * max(cyc, E.FIRST_CYCLE) - 1)
    if cnt == 'clean':
        return d['clean'] * boss_souls * BP // (n * d['souls']), 'души'
    if cnt == 'floors':
        return d['floors'] * CHEST_BASE * BP // (n * base_of(d)), 'базовые с этажей'
    if cnt == 'boss':
        return d['boss'] * CARGO_BASE * BP // (n * base_of(d)), 'базовые с этажей'
    if cnt == 'echo_souls':
        return ECHO_SPEND_BP // n, 'доход душ; в Эхо — половина'
    if cnt == 'echo_expired':
        return ECHO_LOST_BP // 2 // n, 'траты душ в Эхо'
    if cnt in ('arena', 'league'):
        return None, 'снаряжение: чисел нет (§21, §23)'
    if cnt == 'streak':      # сундук: предметов × ключей за предмет × цикл ордена; неделя — ключи контрактов обычного по прогону
        c = max(cyc, E.FIRST_CYCLE)
        return STREAK['обычный'] // n * CHEST_ITEMS * CHEST_KEYS_PER_ITEM * c * BP // contract_keys_week(c), 'ключи контрактов за неделю, обычный'
    names = {'kills': 'золото с врагов', 'el': 'ключи ремёсел с элит', 'rituals': 'награды ритуалов',
             'rb_fail': 'ключи, сожжённые на провалах', 'spins': 'награды Возрождения душ',
             'summons': 'траты на призыв: 1 душа', 'clan': 'личные очки клана', 'echo_boss': 'личные очки с боссов Эхо'}
    return BP // n, names[cnt]


def order_rows(c2, c3, pick):
    """Строка ордена: сумма максимумов и ступени (ADR-0022), срабатываний в день на ступенях, доля дохода.
    Предложение — только ступени, что есть у ордена; таблица автора — все три. Ордены циклов I и II — по дням цикла II."""
    ros = roster()
    rows = []
    for no, cyc, name, cnt, author, prop, what in ORDERS:
        total = sum(m for _, _, m, _ in ros[name])
        cut = tiers_of(total)
        ns = author if pick == 'author' else prop[:cut]
        days = c3 if cyc == 3 else c2
        fr = []
        for (prof, _), d in zip(E.PROFILES, days):
            if cnt == 'streak':      # серия живёт неделю расы: срабатываний за неделю — дней подряд // N
                fr.append(tri(lambda n: str(STREAK[prof] // n), ns) + ' в неделю')
            else:
                fr.append(rate3(events(cnt, prof, d, cyc), ns))
        shares = [order_share(cnt, n, days[0], cyc) for n in ns]
        share = 'нет данных' if shares[0][0] is None else ' / '.join(pct(s) for s, _ in shares)
        res = shares[0][1]
        if cnt == 'summons':    # призыв стоит 1 душу (§17.1): экономия — десятые доли души в день
            res += f'; экономия {tri(lambda n: per_day(ECHO_SUMMONS["обычный"] * 100, n), ns)} души в день'
        if cnt == 'clean':
            res += '; уникальный с босса +' + tri(lambda n: pct(days[0]['clean'] * BP // (n * days[0]['boss'])), ns)
        rows.append([no, short(name), what, f'{total} → {cut}', tri(str, ns)] + fr + [share, res])
    return rows


def orders_table(c2, c3, pick):
    head = ['№', 'Сет', 'Бонус', 'Сумма → ступеней', 'N по ступеням', 'В день, обычный', 'В день, увлечённый',
            'Доля дохода', 'Чего доля']
    return table(head, order_rows(c2, c3, pick))


def tutor_table(tut):
    rows = []
    for no, cyc, name, cnt, author, prop, what in ORDERS:
        if cyc == 1:
            rows.append([short(name), fmt(tut[cnt] // 100), per_day(tut[cnt], prop[0])])
    return table(['Сет', 'Событий за 3 ч биома 2', 'Срабатываний на ступени I'], rows)


def layouts_table():
    """Составы орденов по составу героев: максимумы, сумма и ступени по ADR-0022; кто не за золото — источник, цикл.
    Ниже — братства черновика, если станут орденами."""
    ros = roster()
    rows = []

    def row(label, hs):
        hs = sorted(hs, key=lambda h: -h[2])
        total = sum(h[2] for h in hs)
        return [label, len(hs), ' + '.join(str(h[2]) for h in hs) + f' = {total}', tiers_of(total),
                '; '.join(f'{h[0]} — {h[1]}, {h[3]}' for h in hs if h[1] != 'золото') or '—']
    for no, cyc, name, *_ in ORDERS:
        rows.append(row(short(name), ros[name]))
    for name in EX_BROTHERHOODS:
        rows.append(row(name + ' — братство черновика, если станет орденом', ros[name]))
    return table(['Сет', 'Героев', 'Максимумы', 'Ступеней', 'Не за золото: источник, цикл'], rows)


def valor_from(full_cap=False):
    """День с начала цикла II, с которого у обычного игрока доступна доблесть: пятый предел главного отряда (§10.2) —
    нижняя граница для любого героя, которому нужна обычная руна доблести. Руна обучения — исключение (ADR-0031, п. 2)."""
    return E.pace_of(E.PROFILES[0][1], full_cap=full_cap)['limit5']


def tiers_table(kills):
    """Дни до ступени с начала цикла II, если все руны стража доблести идут в этот сет — нижняя граница: осколки копятся с первого
    дня, но обычную руну доблести можно применить только на пятом пределе героя (§10.2) — не раньше пятого предела главного отряда.
    Руна обучения — одна доблесть героя цикла I на любом пределе (ADR-0031, п. 2): ступень I ордена цикла I.
    kills — победы в день в сотых: полный кап и обычный игрок при ключах-горлышке."""
    full = valor_x10000(split(RB_CAP * 100)[1])
    low = valor_x10000(split(kills)[1])
    open_full, open_low = valor_from(True), valor_from()

    def days(runes, have, rate, opened):
        return ' / '.join('обучение' if r <= have else str(max(opened, days_for(r - have, rate))) for r in runes)
    rows = []
    for no, cyc, name, *_ in ORDERS:
        total = sum(h[2] for h in roster()[name])
        need = (*TIER_HEROES, total)[:tiers_of(total)]
        have = 1 if cyc == 1 else 0
        rows.append([short(name), cyc, total, tiers_of(total), ' / '.join(map(str, need)),
                     days(need, have, full, open_full), days(need, have, low, open_low)])
    for c, *_ in DONAT:
        total = donat_sum(c)
        need = (*TIER_HEROES, total)[:tiers_of(total)]
        rows.append([f'донатный {ROMAN[c - 1]} «{DONAT_NAMES[c]}»', c, total, tiers_of(total), ' / '.join(map(str, need)),
                     days(need, 0, full, open_full), days(need, 0, low, open_low)])
    return table(['Сет', 'Цикл', 'Сумма максимумов', 'Ступеней', 'Рун доблести на ступени',
                  f'День цикла II: полный кап, {num1000(split(RB_CAP * 100)[1] * 10)} победы у стража доблести, пятый предел — {open_full}-й',
                  f'День цикла II: ключи-горлышко, {num1000(split(kills)[1] * 10)} победы, пятый предел — {open_low}-й'], rows)


def donat_rows(c2, c3, days, pick):
    rows = []
    v = KEY_PICK
    k3 = [kills_avg(v, days[p], 3, prof=p) for p, _ in E.PROFILES]      # победы в день у РБ, средний день цикла III
    for c, who, cnt, author, prop, what in DONAT:
        cut = tiers_of(donat_sum(c))
        ns = (author if pick == 'author' else prop)[:cut]
        if cnt == 'boss':      # в цикле II и в цикле III; ключей за срабатывание — цикл биома. Ступени нужна доблесть донатного героя —
            # обычная руна доблести, то есть пятый предел (§10.2): до него бонуса нет (С5, нижняя граница — пятый предел главного отряда)
            opened, ends = valor_from(), {2: CYCLE_LEN[2], 3: CYCLE_LEN[2] + CYCLE_LEN[3]}
            for cc, dd in ((2, c2), (3, c3)):
                if opened > ends[cc]:
                    rows.append([f'{ROMAN[c - 1]} «{DONAT_NAMES[c]}», в цикле {ROMAN[cc - 1]}', who, what, f'{donat_sum(c)} → {cut}',
                                 tri(str, ns)] + [f'нет: доблесть — с пятого предела, {opened}-й день'] * 2 + ['—'])
                    continue
                fr = [rate3(d['boss'], ns) for d in dd]
                d = dd[0]
                share = tri(lambda n: pct(d['boss'] * cc * BP // (n * keys_x100(v, d, cc))), ns) + ' ключей'
                rows.append([f'{ROMAN[c - 1]} «{DONAT_NAMES[c]}», в цикле {ROMAN[cc - 1]}', who, what, f'{donat_sum(c)} → {cut}',
                             tri(str, ns)]
                            + fr + [share])
            continue
        if cnt == 'rf':
            fr = [rate3(d['rf'], ns) for d in c3]
            d = c3[0]
            elite_spirit = E.RATES_NEW['elite'][1] * E.mult_new(c) // BP
            share = tri(lambda n: pct(d['rf'] * E.RATES_NEW['elite'][2] * (2 * c - 1) * BP // (n * d['souls'])), ns) + \
                ' душ; или ' + tri(lambda n: pct(d['rf'] * elite_spirit * BP // (n * d['spirit'])), ns) + ' духа'
        else:                  # счётчики у РБ: победы при ключах-горлышке, средний день цикла III
            part = {'rb1': 0, 'rb2': 1, 'rb': 2}[cnt]
            fr = [rate3((split(k) + (k,))[part], ns) for k in k3]
            if cnt == 'rb1':
                share = tri(lambda n: pct(BP // (E.rx()['runes_per_win'] * n)), ns) + ' рун пределов'
            elif cnt == 'rb2':
                share = tri(lambda n: pct(100 * BP * 100 // (E.rx()['shards_x100'] * n)), ns) + ' рун доблести'
            else:
                limit, _ = split(k3[0])
                share = tri(lambda n: pct(k3[0] * BP // (n * limit * E.rx()['runes_per_win'] * E.rx()['weights'][-1] // BP)), ns) + \
                    ' рун V предела, если брать V'
        rows.append([f'{ROMAN[c - 1]} «{DONAT_NAMES[c]}»', who, what, f'{donat_sum(c)} → {cut}', tri(str, ns)] + fr + [share])
    return rows


def donat_table(c2, c3, days, pick):
    return table(['Сет', 'Пятеро', 'Бонус', 'Сумма → ступеней', 'N по ступеням', 'В день, обычный', 'В день, увлечённый',
                  'Доля дохода'], donat_rows(c2, c3, days, pick))


def prices_table():
    head = ['Вариант', 'Ключ с элиты / босса'] + [f'Цикл {ROMAN[c - 1]}' for c in range(1, 7)]
    rows = [[name, f'{pct(e)} / {pct(b)}'] + [f'{price(v, c, 0)} / {price(v, c, 1)}' for c in range(1, 7)]
            for v, (name, e, b, *_) in enumerate(KEY_VARIANTS)]
    return table(head, rows)


def keys_table(days):
    rows = []
    for v, (name, *_) in enumerate(KEY_VARIANTS):
        for c in (2, 3):
            cells = [name, ROMAN[c - 1]]
            for p, _ in E.PROFILES:
                sel = [(x, keys_x100(v, x, cc, prof=p)) for _, cc, x in days[p] if cc == c]
                need = (RB_SPLIT_BP * price(v, c, 0) + (BP - RB_SPLIT_BP) * price(v, c, 1)) * RB_CAP * 100 // BP
                cov = [k * BP // need for _, k in sel]
                cells += [dec1(sum(k for _, k in sel) // len(sel), 100), f'{pct(min(cov))} — {pct(max(cov))}',
                          num1000(kills_avg(v, days[p], c, prof=p) * 10)]
            rows.append(cells)
    head = ['Вариант', 'Цикл']
    for p, _ in E.PROFILES:
        head += [f'Ключей в день: {p}', 'Покрытие капа по дням', 'Побед у РБ в день']
    return table(head, rows)


def payer_table(days):
    """Правило ×1,7 по ресурсам: плательщик с донатными сетами на высшей ступени против свободного, время равное.
    Плательщик раньше набирает отряд на все слоты (Т12): у него на отряд больше; ключи — по варианту цен.
    Ключи контрактов у обоих — обычного по прогону контрактов: время равное, разница — только сеты и лишний отряд.
    Ступеням донатных сетов нужна доблесть донатного героя — обычная руна доблести, пятый предел (§10.2): до него бонуса сета нет.
    Ниже каждого варианта — проверки «что если» из PAYER_WHATIF."""
    h = E.PROFILES[0][1]
    lv = levels(h)
    opened = valor_from()
    n2 = DONAT[0][4][0]
    n4, n5, n6 = DONAT[2][4][2], DONAT[3][4][2], DONAT[4][4][2]
    ok = lambda a, b: 'да' if a * 10 <= b * E.PAYER_MAX_X10 else 'нет'
    rows = []

    def worst(v, n):
        """Худший день Т12: во сколько раз больше побед у РБ у плательщика с сетом II, в тысячных."""
        out = 1000
        for d, f, p in T12_CASES:
            c, af = day_of(lv, d, h, f)
            _, ap = day_of(lv, d, h, p)
            kf, kp = kills_x100(v, keys_x100(v, af, c), c), kills_x100(v, keys_x100(v, ap, c, n if d >= opened else 0), c)
            out = max(out, kp * 1000 // kf)
            if n == n2:
                tag = 'сет II' if d >= opened else f'сет II ещё без доблести (пятый предел — {opened}-й день)'
                rows.append([f'{KEY_VARIANTS[v][0]}: победы у РБ, {d}-й день, отрядов {f} / {p}, {tag}', 'побед в день',
                             num1000(kf * 10), num1000(kp * 10), ratio(kp, kf), ok(kp, kf)])
        return out

    def valor_row(v, w, n, label):
        both = w * (valor_x10000(1000, n) * 1000 // valor_x10000(1000)) // 1000
        rows.append([f'{KEY_VARIANTS[v][0]}: руны доблести — {label}', 'во сколько раз', '1', ratio(both, 1000)[1:],
                     ratio(both, 1000), ok(both, 1000)])

    def limit_row(v, w, a, b, label):
        free_k = kills_avg(v, days['обычный'], 2)
        pay_k = min(RB_CAP * 100, free_k * w // 1000)
        fv, pv = rune_days_sets(split(free_k)[0], free_k), rune_days_sets(split(pay_k)[0], pay_k, a, b)
        rows.append([f'{KEY_VARIANTS[v][0]}: руны пределов — {label}', 'дней до рун на пятый предел отряду',
                     fv[-1], pv[-1], ratio(fv[-1], pv[-1]), ok(fv[-1], pv[-1])])
    for v in (1, 2):
        w = worst(v, n2)
        valor_row(v, w, n5, 'худший день и сет V на ступени III')
        valor_row(v, w, DONAT[3][3][2], 'худший день и сет V на ступени III, числа автора')
        limit_row(v, w, n4, n6, 'худший день, сеты IV и VI на ступени III')
        if v == 1:
            valor_row(v, w, PAYER_WHATIF['v5_for_A'], f'если в А у сета V на ступени III N = {PAYER_WHATIF["v5_for_A"]}')
            limit_row(v, w, n4 * 2, n6 * 2, 'если в А у сетов IV и VI N вдвое больше')
        else:
            n2b = PAYER_WHATIF['v2_for_B']
            w2 = worst(v, n2b)
            rows.append([f'{KEY_VARIANTS[v][0]}: победы у РБ — худший день, если у сета II N = {n2b}', 'во сколько раз', '1',
                         ratio(w2, 1000)[1:], ratio(w2, 1000), ok(w2, 1000)])
            valor_row(v, w2, n5, f'сет II с N = {n2b} и сет V на ступени III')
    # души: лишний отряд плательщика и сет III на высшей ступени
    n3 = DONAT[1][4][tiers_of(donat_sum(3)) - 1]
    for day, f, p in ((CYCLE_LEN[2] + 1, 2, 3), (CYCLE_LEN[2] + 11, 3, 3)):
        c, fr = day_of(lv, day, h, f)
        _, pa = day_of(lv, day, h, p)
        bonus = pa['rf'] * (2 * c - 1) // n3 if day >= opened else 0
        tag = 'сет III' if day >= opened else 'сет III ещё без доблести'
        rows.append([f'Души, цикл III, {day}-й день: отрядов {f} / {p}, {tag}', 'душ в день', fmt(fr['souls'] // 100),
                     fmt((pa['souls'] + bonus) // 100), ratio(pa['souls'] + bonus, fr['souls']), ok(pa['souls'] + bonus, fr['souls'])])
    return table(['Ресурс', 'Мера', 'Свободный', 'Плательщик', 'Отношение', 'Не больше ×1,7'], rows)


def runes_pace_table(days):
    """Как ключи-горлышко меняют темп рун обычного игрока: дни до рун на пределы отряду пяти."""
    h = E.PROFILES[0][1]
    rows = [['полный кап: 7 + 3 победы', str(rune_days_sets(700, 1000))]]
    for v in (1, 2):
        k = kills_avg(v, days['обычный'], 2)
        rows.append([f'{KEY_VARIANTS[v][0]}: {num1000(k * 10)} победы в день', str(rune_days_sets(split(k)[0], k))])
    return table(['Обычный игрок, цикл II', 'Дни до рун на пределы I–V'], rows)


def gold_table(days):
    """Сколько героев за золото выкуплено к концу циклов II и III и какую долю дохода это забрало (ADR-0023, п. 18).
    Правило автора держится, если к концу цикла не выкуплены все герои за золото этого цикла."""
    heroes, inc = gold_heroes(), gold_income(days)
    end2, end3 = CYCLE_LEN[2], CYCLE_LEN[2] + CYCLE_LEN[3]
    rows = []
    for variant in GOLD_VARIANTS:
        for p, _ in E.PROFILES:
            log = gold_buy(variant, inc[p], heroes)
            (b2, s2, g2), (b3, s3, g3) = log[end2], log[end3]
            full = [f'{ROMAN[c - 1]} — {"да" if b[c] == heroes[c] else "нет"}' for c, b in ((2, b2), (3, b3))]
            rows.append([variant[0] if p == E.PROFILES[0][0] else '', p,
                         f'{b2[1]} / {b2[2]}', pct(s2 * BP // g2), f'{b3[1]} / {b3[2]} / {b3[3]}', pct(s3 * BP // g3),
                         '; '.join(full)])
    return table(['Вариант', 'Игрок', 'Конец цикла II: героев I / II', 'Доля дохода', 'Конец цикла III: героев I / II / III',
                  'Доля дохода', 'Все герои цикла выкуплены к его концу'], rows)


def gold_prices_table():
    """Цены героев за золото по вариантам: первый, 10-й, 20-й, последний и все герои цикла."""
    heroes = gold_heroes()
    rows = []
    for variant in GOLD_VARIANTS:
        for c in (1, 2, 3):
            n = heroes[c]
            rows.append([variant[0] if c == 1 else '', ROMAN[c - 1], n] +
                        [fmt(gold_price(c, k, variant)) if k <= n else '—' for k in (1, 10, 20, n)] +
                        [fmt(sum(gold_price(c, k, variant) for k in range(1, n + 1)))])
    return table(['Вариант', 'Цикл', 'Героев', 'Первый', '10-й', '20-й', 'Последний', 'Все'], rows)


def main():
    days = {p: cycle_days(h) for p, h in E.PROFILES}
    c2 = [average(days[p], 2) for p, _ in E.PROFILES]
    c3 = [average(days[p], 3) for p, _ in E.PROFILES]
    tut = tutor_b2()
    k_reg = kills_avg(KEY_PICK, days['обычный'], 2)
    parts = [('С1. Счётчики дня: средний день цикла, все отряды', counters_table(tut, c2, c3)),
             ('С2. Ордены: предложение, ступени по сумме максимумов', orders_table(c2, c3, 'prop')),
             ('С3. Ордены: числа таблицы автора, все три ступени', orders_table(c2, c3, 'author')),
             ('С4. Ордены цикла I в самом цикле I: ступень I — у одного ордена, руной уровня аккаунта 8', tutor_table(tut)),
             ('С5. Когда ступени реальны: руны доблести', tiers_table(k_reg)),
             ('С5а. Составы орденов по нынешнему составу героев', layouts_table()),
             ('С6. Донатные сеты: предложение', donat_table(c2, c3, days, 'prop')),
             ('С7. Донатные сеты: числа таблицы автора', donat_table(c2, c3, days, 'author')),
             ('С8. Вход к рунным боссам: ключей у стража пределов / доблести', prices_table()),
             ('С8а. Ключи против капа: средний день, покрытие по дням, победы у РБ', keys_table(days)),
             ('С8б. Темп рун обычного игрока при ключах-горлышке', runes_pace_table(days)),
             ('С9. Правило ×1,7: донатные сеты на высшей ступени с учётом входа', payer_table(days)),
             ('С10. Герои за золото: сколько выкуплено к концу циклов II и III', gold_table(days)),
             ('С10а. Герои за золото: цены по вариантам', gold_prices_table())]
    for title, body in parts:
        print(f'\n### {title}\n\n{body}')


# ======================= ПРОГОН (--sim) =======================

CLEAN_JS = r"""
// закрывающий забег отряда прототипа на образце цикла II: сколько героев пало (ADR-0014: сид тот же, итог детерминирован)
function run(heroes, siege) {
  const B = EB.BIOMES.c2; let cur = heroes.map(h => EB.heroSrcValor(h)), wall = 0, hp = siege, boss = 0;
  for (let f = 1; f <= B.floors.length; f++) {
    const b = EB.run(EB.floorBattle(cur, 'c2', f, hp, 'rounds')), g = B.floors[f - 1].g;
    b.u[1].forEach(u => { if (!u.alive && u.rank === 'b') boss++; });
    if (g === 'b') hp = b.u[1][0].alive ? b.u[1][0].hp : 0;
    cur = EB.carry(cur, b); wall = f;
    if (!b.win) break;
  }
  return { wall, boss, hp, dead: cur.filter(h => h.dead).length };
}
const out = [];
for (const L of LEVELS) {
  let siege = null, last;
  for (let i = 0; i < 60; i++) { last = run(SQUAD.map(h => Object.assign({}, h, { lvl: L })), siege); if (last.wall < EB.BIOMES.c2.floors.length || last.boss > 0) break; siege = last.hp; }
  out.push([L, last.boss, last.dead]);
}
console.log(JSON.stringify(out));
"""


def measure():
    head = E.SIM_JS.split('// один забег')[0]
    js = head + CLEAN_JS.replace('LEVELS', json.dumps(list(range(100, 255, 5))))
    res = subprocess.run(['node', '-e', js], cwd=E.ROOT, capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        sys.exit(res.stderr)
    rows = json.loads(res.stdout)
    clean = [L for L, boss, dead in rows if boss and not dead]
    first = next((L for L in clean if all(L2 in clean for L2, _, _ in rows if L2 >= L)), None)
    print('уровень, босс пал, павших:', rows)
    print(f'CLEAN_FROM = {first}')


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if '--sim' in sys.argv:
        measure()
    else:
        main()
