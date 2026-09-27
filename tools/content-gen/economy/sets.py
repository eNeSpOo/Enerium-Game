# -*- coding: utf-8 -*-
"""Сет-бонусы орденов и донатных сетов — калькулятор (черновик).

Печатает таблицы для docs/content/сет-бонусы.md: сколько раз в день срабатывает бонус у обычного
и увлечённого игрока, какую долю дохода своего ресурса он даёт, когда ступени реальны и держится ли правило ×1,7.
Доход, прогон боя и руны берёт из калькулятора экономики `economy.py` через importlib и его не меняет.

    python tools/content-gen/economy/sets.py         # все таблицы, markdown
    python tools/content-gen/economy/sets.py --sim   # перемерить чистые закрытия (нужен Node); вывод — в CLEAN_FROM

Все числа — демонстрация и лежат в начале файла, в функциях только алгоритм.
Расчёт целочисленный: доли — в базисных пунктах (10 000 = 100 %), счётчики дня — в сотых.
"""
import csv
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

_spec = importlib.util.spec_from_file_location('economy', Path(__file__).resolve().parent / 'economy.py')
E = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(E)
BP, HOUR_MS = E.BP, E.HOUR_MS

# ======================= ДАННЫЕ =======================

TIERS = ('I', 'II', 'III')
ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']
TIER_HEROES = (1, 3, 5)          # §30, ADR-0006: I — один с доблестью ≥ 1, II — трое, III — все пятеро на личных максимумах

# --- циклы: дни считает economy.timeline с начала цикла II ---
CYCLE_LEN = {2: E.CYCLE_DAYS, 3: 21}   # цикл II — 14 дней (автор); цикл III — допущение: длиннее II (ADR-0018)
SLOTS_EXTRA = 1                         # ADR-0014: забег на номер цикла и ещё один от Странника

# --- цикл I — обучение на часы (ADR-0018): ступень I возможна только во втором биоме, руной уровня аккаунта 8 (§16) ---
TUTOR_B2_HOURS = 3        # ADR-0018: биом 2 — ещё около трёх часов
TUTOR_B2_LEVEL = 43       # допущение: пачка у стены образца — ряд прогона «43»: 40 рядовых, 4 элиты за 6,6 мин
TUTOR_BOSSES = 2          # боссы биомов 1 и 2, по разу; оба закрытия — чистые (допущение)

# --- чистое закрытие: замер прототипа (--sim) на образце цикла II, отряд прототипа ---
CLEAN_FROM = 180          # с этого уровня прогона закрывающий забег идёт без павших; на 160-м павших двое

# --- ресурсы с врагов ---
KEY_DROP = [('§11: элита 5 %, босс 10 %', 500, 1000),          # шанс рунного ключа; за срабатывание — цикл биома
            ('таблица артефактов: 1 % и 1 %', 100, 100)]
KEY_TARGET_BP = 7000                    # §11: целевой доход ключей ~70 % капа — сценарий «ключи — горлышко»
KEYS_PER_UNIT = 1                       # черновик «Дроп»: за каждые 10 очков контракта — 1 ключ × цикл
GUARD_ENTRY = (1, 2)                    # §11: вход — номер биома в цикле × цикл ключей

# --- другие режимы: в GDD есть только попытки или ничего — остальное допущения ---
ARENA_WINS = 20 * 5000 // BP            # §20.2: 20 атак в день; побед при Эло — допущение 50 %
LEAGUE_WINS_X10 = 6 * 5000 * 10 // BP   # §20.4: 6 матчей в день; побед — 50 %, в десятых
CLAN_ATTACKS = 5                        # §25.1: 5 атак в день, древо добавляет до 4
RITUALS = {'обычный': 2, 'увлечённый': 3}          # допущение: ритуалов на слот в день; слотов — цикл + 1
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

# --- личный максимум доблести донатных героев (в источниках нет): II–V — бюджет 15 (ADR-0008), VI — пять по 5 (ADR-0021) ---
DONAT_MAX = {2: 15, 3: 15, 4: 15, 5: 15, 6: 25}

# --- сеты: № таблицы автора, цикл, имя, счётчик, N автора, N предложения, что даёт ---
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
DONAT = [
    (2, 'пять фармеров', 'boss', (100, 50, 25), (20, 10, 5), 'рунный ключ, штук — цикл биома'),
    (3, 'фармер, контроль, дебаффер, танк, лекарь', 'rf', (300, 150, 100), (300, 150, 100), 'души элиты биома или её дух'),
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


def cycle_days(hours):
    """Счётчики каждого дня с начала цикла II: отряд A и вторые отряды B по economy.timeline."""
    _, _, lv = E.timeline(E.RATES_NEW, E.mult_new, hours)
    out = []
    for d in range(1, CYCLE_LEN[2] + CYCLE_LEN[3] + 1):
        a, b = lv[min(d - 1, len(lv) - 1)]
        c = E.FIRST_CYCLE if d <= CYCLE_LEN[2] else E.FIRST_CYCLE + 1
        acc = {}
        for k in range(c + SLOTS_EXTRA):
            add(acc, squad_day(a if k == 0 else b, c, hours))
        out.append((d, c, acc))
    return out


def average(days, c):
    sel = [x for _, cc, x in days if cc == c]
    return {k: sum(x[k] for x in sel) // len(sel) for k in sel[0]}


def tutor_b2():
    """Цикл I, биом 2: пачка у стены два отряда по TUTOR_B2_HOURS часов, плюс боссы биомов 1 и 2 по разу."""
    acc = {}
    for _ in range(E.SLOTS[1]):
        add(acc, squad_day(TUTOR_B2_LEVEL, 1, TUTOR_B2_HOURS, 2))
    for k in ('boss', 'clean', 'kills', 'floors'):
        acc[k] += TUTOR_BOSSES * 100
    acc['souls'] += sum(range(1, TUTOR_BOSSES + 1)) * E.RATES_NEW['boss'][2] * 100
    return acc


def events(cnt, prof, d, cyc):
    """Событий счётчика за день, в сотых. d — средний день цикла; режимы вне биомов — по допущениям."""
    if cnt in d:
        return d[cnt]
    return {'rituals': RITUALS[prof] * (cyc + SLOTS_EXTRA) * 100,
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
    if cnt == 'streak':
        week = (E.CONTRACT_DAY_PTS * E.WEEK_DAYS + E.CONTRACT_WEEK_PTS) // E.CONTRACT_UNIT * KEYS_PER_UNIT
        return STREAK['обычный'] // n * CHEST_ITEMS * CHEST_KEYS_PER_ITEM * BP // week, 'ключи контрактов за неделю, обычный'
    names = {'kills': 'золото с врагов', 'el': 'ключи ремёсел с элит', 'rituals': 'награды ритуалов',
             'rb_fail': 'ключи, сожжённые на провалах', 'spins': 'награды Возрождения душ',
             'summons': 'траты на призыв: 1 душа', 'clan': 'личные очки клана', 'echo_boss': 'личные очки с боссов Эхо'}
    return BP // n, names[cnt]


def base_of(day):
    return day['floors'] * E.BASE_CHANCE_BP * E.BASE_AMOUNT_X100 // (BP * 100)


def keys_of(day, c, elite_bp, boss_bp):
    """Рунные ключи за день, в сотых: контракты дня и недели без заверения плюс дроп элит и боссов."""
    contracts = (E.CONTRACT_DAY_PTS * E.WEEK_DAYS + E.CONTRACT_WEEK_PTS) * KEYS_PER_UNIT * c * 100 // (E.CONTRACT_UNIT * E.WEEK_DAYS)
    return contracts, (day['el'] * elite_bp + day['boss'] * boss_bp) * c // BP


def keys_need(c):
    return (E.GUARD_WINS * GUARD_ENTRY[0] + E.VALOR_WINS * GUARD_ENTRY[1]) * c * 100


def rune_days_sets(n4=0, n6=0):
    """Как economy.rune_days, плюс сеты IV и VI: +1 руна по весам стража за каждое n4-е убийство стража пределов,
    +1 руна на выбор за каждое n6-е убийство любого РБ — в высший предел, где рун ещё не хватает."""
    n, wins, rb_all = len(E.LIMITS), E.GUARD_WINS, E.GUARD_WINS + E.VALOR_WINS
    per_win = [E.RUNES_PER_WIN * 100 * w // BP for w in E.RUNE_WEIGHT_BP]
    need = E.SQUAD * E.RUNES_PER_LIMIT * 100
    stock, nxt, out = [0] * n, E.START_LIMITS, [0] * E.START_LIMITS
    for d in range(E.GUARD_OPEN_DAY, E.GUARD_OPEN_DAY + E.DAYS_MAX):
        for k in range(n):
            stock[k] += per_win[k] * wins + (wins * 100 * E.RUNE_WEIGHT_BP[k] // (BP * n4) if n4 else 0)
        if n6:
            pick = next((k for k in range(n - 1, nxt - 1, -1) if stock[k] < need), nxt)
            stock[min(pick, n - 1)] += rb_all * 100 // n6
        for _ in range(2):
            while nxt < n and stock[nxt] >= need:
                stock[nxt] -= need
                out.append(d)
                nxt += 1
            for k in range(min(nxt, n - 1)):
                q = stock[k] // (E.RUNE_REFORGE * 100)
                stock[k] -= q * E.RUNE_REFORGE * 100
                stock[k + 1] += q * 100
        if nxt == n:
            break
    return out + [E.DAYS_MAX] * (n - len(out))


def valor_x10000(n5=0, wins=E.VALOR_WINS):
    """Рун доблести в день, в десятитысячных: осколки §11 и руна за каждое n5-е убийство стража доблести."""
    return wins * E.VALOR_FRAGS_X100 * 100 // E.VALOR_FRAGS + (wins * 10000 // n5 if n5 else 0)


def days_for_runes(runes, wins):
    return -(-runes * E.VALOR_FRAGS * 100 // (wins * E.VALOR_FRAGS_X100))


def valor_budgets():
    """Сумма личных максимумов по ордену: по черновику и если герои за золото — максимум 1 (ADR-0019)."""
    path = E.ROOT / 'docs' / 'content' / 'герои' / 'герои.csv'
    out = {}
    for r in csv.DictReader(path.open(encoding='utf-8-sig')):
        v = int(r['максимум доблести'])
        s = out.setdefault(r['орден'], [0, 0])
        s[0] += v
        s[1] += 1 if r['получение'] == 'золото' else v
    return out


# ======================= ВЫВОД =======================

fmt, dec1, table = E.fmt, E.dec1, E.table


def dec2(num, den):
    q = num * 100 // den
    s = f'{q // 100},{q % 100:02d}'.rstrip('0')
    return s.rstrip(',')


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
    """Срабатывания на ступенях I / II / III: «в день», если на III хотя бы раз в день, иначе «раз в … дн.»."""
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


def order_rows(c2, c3, ns_pick):
    """Строка ордена: срабатываний в день на ступенях I / II / III у обычного и увлечённого, доля дохода.
    Ордены цикла I считаются по дням цикла II: цикл I — четыре часа обучения (С4)."""
    rows = []
    for no, cyc, name, cnt, author, prop, what in ORDERS:
        ns = author if ns_pick == 'author' else prop
        days = c3 if cyc == 3 else c2
        fr = []
        for (prof, _), d in zip(E.PROFILES, days):
            if cnt == 'streak':      # серия живёт неделю расы: срабатываний за неделю — дней подряд // N
                fr.append(tri(lambda n: str(STREAK[prof] // n), ns) + ' в неделю')
            else:
                ev = events(cnt, prof, d, cyc)
                fr.append(rate3(ev, ns))
        shares = [order_share(cnt, n, days[0], cyc) for n in ns]
        share = 'нет данных' if shares[0][0] is None else ' / '.join(pct(s) for s, _ in shares)
        res = shares[0][1]
        if cnt == 'summons':    # призыв стоит 1 душу (§17.1): экономия — десятые доли души в день
            res += f'; экономия {tri(lambda n: dec2(ECHO_SUMMONS["обычный"] * 100, 100 * n), ns)} души в день'
        if cnt == 'clean':
            res += '; уникальный с босса +' + tri(lambda n: pct(days[0]['clean'] * BP // (n * days[0]['boss'])), ns)
        rows.append([no, name.replace('Орден ', ''), what, tri(str, ns)] + fr + [share, res])
    return rows


def orders_table(c2, c3, pick):
    head = ['№', 'Сет', 'Бонус', 'N: I / II / III', 'В день, обычный', 'В день, увлечённый', 'Доля дохода: I / II / III', 'Чего доля']
    return table(head, order_rows(c2, c3, pick))


def tutor_table(tut):
    rows = []
    for no, cyc, name, cnt, author, prop, what in ORDERS:
        if cyc != 1:
            continue
        rows.append([name.replace('Орден ', ''), fmt(tut[cnt] // 100), tri(lambda n: per_day(tut[cnt], n), prop)])
    return table(['Сет', 'Событий за 3 ч биома 2', 'Срабатываний на ступени I / II / III'], rows)


def tiers_table():
    """Дни от открытия стража доблести цикла до ступени, если все его руны идут в этот сет — нижняя граница.
    Ордены цикла I получают первую руну в обучении (§16, уровень 8) — ступень I там, дальше руны на две и S − 1."""
    vb = valor_budgets()
    one, all_in = E.VALOR_WINS, E.GUARD_WINS + E.VALOR_WINS

    def days(runes, have, wins):
        return ' / '.join('обучение' if r <= have else str(days_for_runes(r - have, wins)) for r in runes)
    rows = []
    for no, cyc, name, cnt, author, prop, what in ORDERS:
        s, s19 = vb[name]
        have = 1 if cyc == 1 else 0
        rows.append([name.replace('Орден ', ''), cyc, s, s19, days((*TIER_HEROES[:2], s), have, one),
                     days((*TIER_HEROES[:2], s), have, all_in),
                     days((s19,), have, one)])
    for c, who, cnt, author, prop, what in DONAT:
        s = DONAT_MAX[c]
        rows.append([f'донатный сет {ROMAN[c - 1]}', c, s, '—', days((*TIER_HEROES[:2], s), 0, one),
                     days((*TIER_HEROES[:2], s), 0, all_in), '—'])
    return table(['Сет', 'Цикл', 'Рун на III', 'Если золото — 1', f'Дней до I / II / III: {one} победы в день',
                  f'Все {all_in} побед — в стража доблести', f'III, если золото — 1: {one} победы'], rows)


def layouts_table():
    """Раскладки личных максимумов по черновику героев и по ADR-0019: герой за золото — максимум 1."""
    path = E.ROOT / 'docs' / 'content' / 'герои' / 'герои.csv'
    lay = {}
    for r in csv.DictReader(path.open(encoding='utf-8-sig')):
        v = int(r['максимум доблести'])
        lay.setdefault(r['орден'], []).append((v, 1 if r['получение'] == 'золото' else v))
    rows = []
    for no, cyc, name, cnt, author, prop, what in ORDERS:
        a = sorted((x for x, _ in lay[name]), reverse=True)
        b = sorted((y for _, y in lay[name]), reverse=True)
        rows.append([name.replace('Орден ', ''), ' + '.join(map(str, a)) + f' = {sum(a)}', ' + '.join(map(str, b)) + f' = {sum(b)}'])
    return table(['Сет', 'Максимумы по черновику', 'Если золото — 1 (ADR-0019)'], rows)


def donat_rows(c2, c3, pick):
    rows = []
    rb = {'rb1': E.GUARD_WINS, 'rb2': E.VALOR_WINS, 'rb': E.GUARD_WINS + E.VALOR_WINS}
    for c, who, cnt, author, prop, what in DONAT:
        ns = author if pick == 'author' else prop
        days = {2: c2, 3: c3}.get(c)
        if cnt == 'boss':      # в цикле II и в цикле III, где ступень I реальна (С5); ключей за срабатывание — цикл биома
            for cc, dd in ((2, c2), (3, c3)):
                fr = [rate3(d['boss'], ns) for d in dd]
                d = dd[0]
                con, bio = keys_of(d, cc, KEY_DROP[0][1], KEY_DROP[0][2])
                con1, bio1 = keys_of(d, cc, KEY_DROP[1][1], KEY_DROP[1][2])
                share = tri(lambda n: pct(d['boss'] * cc * BP // (n * (con + bio))), ns) + ' ключей; при 1 %: ' + \
                    tri(lambda n: pct(d['boss'] * cc * BP // (n * (con1 + bio1))), ns)
                rows.append([f'{ROMAN[c - 1]}, в цикле {ROMAN[cc - 1]}', who, what, tri(str, ns)] + fr + [share])
            continue
        elif cnt == 'rf':
            fr = [rate3(d['rf'], ns) for d in days]
            d = days[0]
            elite_spirit = E.RATES_NEW['elite'][1] * E.mult_new(c) // BP
            share = tri(lambda n: pct(d['rf'] * E.RATES_NEW['elite'][2] * (2 * c - 1) * BP // (n * d['souls'])), ns) + \
                ' душ; или ' + tri(lambda n: pct(d['rf'] * elite_spirit * BP // (n * d['spirit'])), ns) + ' духа'
        elif cnt == 'rb1':
            fr = [rate3(rb[cnt] * 100, ns)] * 2
            share = tri(lambda n: pct(BP // (E.RUNES_PER_WIN * n)), ns) + ' рун пределов'
        elif cnt == 'rb2':
            fr = [rate3(rb[cnt] * 100, ns)] * 2
            share = tri(lambda n: pct((valor_x10000(n) - valor_x10000()) * BP // valor_x10000()), ns) + ' рун доблести'
        else:
            fr = [rate3(rb[cnt] * 100, ns)] * 2
            v_nat = E.GUARD_WINS * E.RUNES_PER_WIN * E.RUNE_WEIGHT_BP[-1]
            share = tri(lambda n: pct(rb[cnt] * BP * BP // (n * v_nat)), ns) + ' рун V предела, если брать V'
        rows.append([ROMAN[c - 1], who, what, tri(str, ns)] + fr + [share])
    return rows


def donat_table(c2, c3, pick):
    return table(['Сет', 'Пятеро', 'Бонус', 'N: I / II / III', 'В день, обычный', 'В день, увлечённый', 'Доля дохода: I / II / III'],
                 donat_rows(c2, c3, pick))


def keys_table(c2, c3):
    rows = []
    for c, days, label in ((2, c2, 'цикл II'), (3, c3, 'цикл III')):
        for (prof, _), d in zip(E.PROFILES, days):
            for name, e_bp, b_bp in KEY_DROP:
                con, bio = keys_of(d, c, e_bp, b_bp)
                need = keys_need(c)
                bonus = d['boss'] * c // DONAT[0][4][2]
                rows.append([f'{label}, {prof}', name, dec1(con, 100), dec1(bio, 100), dec1(need, 100),
                             pct((con + bio) * BP // need), pct((con + bio + bonus) * BP // need)])
    return table(['Кто', 'Дроп ключей', 'Контракты в день', 'Элиты и боссы', f'Нужно на кап: {E.GUARD_WINS} + {E.VALOR_WINS} победы',
                  'Покрытие капа', 'С сетом II на ступени III'], rows)


def payer_table(days_by_prof):
    """Правило ×1,7 по ресурсам: плательщик с донатными сетами на ступени III против свободного, при равном времени."""
    rows = []
    free_v = E.rune_days(E.GUARD_WINS)
    n4, n6 = DONAT[2][4][2], DONAT[4][4][2]
    for label, a, b in (('IV', n4, 0), ('VI', 0, n6), ('IV и VI', n4, n6)):
        pay_v = rune_days_sets(a, b)
        rows.append([f'Руны пределов, сет {label}', 'дней до рун предела V отряду пяти',
                     free_v[-1], pay_v[-1], E.ratio(free_v[-1], pay_v[-1]),
                     'да' if free_v[-1] * 10 <= pay_v[-1] * E.PAYER_MAX_X10 else 'нет'])
    for lvl, n5 in zip(TIERS, DONAT[3][4]):
        rows.append([f'Руны доблести, сет V, ступень {lvl}', 'рун в день, ×10 000', valor_x10000(), valor_x10000(n5),
                     E.ratio(valor_x10000(n5), valor_x10000()),
                     'да' if valor_x10000(n5) * 10 <= valor_x10000() * E.PAYER_MAX_X10 else 'нет'])
    # души: плательщик раньше набирает отряды на все слоты (Т12) и держит сет III
    lv = {p: E.timeline(E.RATES_NEW, E.mult_new, h)[2] for p, h in E.PROFILES}
    h = E.PROFILES[0][1]
    for day, f, p in ((15, 3, 4), (25, 3, 4), (25, 2, 4)):
        a, b = lv['обычный'][min(day, len(lv['обычный']) - 1)]
        c = 3

        def souls(sq):
            acc = {}
            for k in range(sq):
                add(acc, squad_day(a if k == 0 else b, c, h))
            return acc
        fr, pa = souls(f), souls(p)
        n3 = DONAT[1][4][2]
        bonus = pa['rf'] * (2 * c - 1) // n3
        rows.append([f'Души, цикл III, {day}-й день: отрядов {f} / {p}, сет III', 'душ в день', fmt(fr['souls'] // 100),
                     fmt((pa['souls'] + bonus) // 100), E.ratio(pa['souls'] + bonus, fr['souls']),
                     'да' if (pa['souls'] + bonus) * 10 <= fr['souls'] * E.PAYER_MAX_X10 else 'нет'])
    # сценарий «ключи — горлышко» (§11: доход ~70 % капа): сет II поднимает победы у РБ, а с ними все руны
    c, d = 3, days_by_prof['обычный']
    d3 = average(d, 3)
    free_kills = (E.GUARD_WINS + E.VALOR_WINS) * KEY_TARGET_BP * 100 // BP
    entry = keys_need(c) // (E.GUARD_WINS + E.VALOR_WINS)
    pay_kills = min((E.GUARD_WINS + E.VALOR_WINS) * 100, free_kills + d3['boss'] * c * 100 // (DONAT[0][4][2] * entry))
    rows.append(['Победы у РБ, если ключи — горлышко: сет II, цикл III', 'побед в день', dec1(free_kills, 100),
                 dec1(pay_kills, 100), E.ratio(pay_kills, free_kills),
                 'да' if pay_kills * 10 <= free_kills * E.PAYER_MAX_X10 else 'нет'])
    both = pay_kills * valor_x10000(DONAT[3][4][2]) // valor_x10000()
    rows.append(['Руны доблести, то же и сет V на ступени III', 'во сколько раз', '1', dec2(both, free_kills),
                 E.ratio(both, free_kills), 'да' if both * 10 <= free_kills * E.PAYER_MAX_X10 else 'нет'])
    return table(['Ресурс', 'Мера', 'Свободный', 'Плательщик', 'Отношение', 'Не больше ×1,7'], rows)


def main():
    days = {p: cycle_days(h) for p, h in E.PROFILES}
    c2 = [average(days[p], 2) for p, _ in E.PROFILES]
    c3 = [average(days[p], 3) for p, _ in E.PROFILES]
    tut = tutor_b2()
    parts = [('С1. Счётчики дня: средний день цикла, все отряды', counters_table(tut, c2, c3)),
             ('С2. Ордены: предложение', orders_table(c2, c3, 'prop')),
             ('С3. Ордены: числа таблицы автора на той же экономике', orders_table(c2, c3, 'author')),
             ('С4. Ордены цикла I в самом цикле I: ступень I — у одного ордена, руной уровня аккаунта 8', tutor_table(tut)),
             ('С5. Когда ступени реальны: руны доблести', tiers_table()),
             ('С5а. Раскладки личных максимумов в орденах', layouts_table()),
             ('С6. Донатные сеты: предложение', donat_table(c2, c3, 'prop')),
             ('С7. Донатные сеты: числа таблицы автора', donat_table(c2, c3, 'author')),
             ('С8. Рунные ключи: доход против капа стражей', keys_table(c2, c3)),
             ('С9. Правило ×1,7: донатные сеты на ступени III', payer_table(days))]
    for title, body in parts:
        print(f'\n### {title}\n\n{body}')
    print(f'\nРуны пределов, дни до I–V: свободный {E.rune_days(E.GUARD_WINS)}; '
          f'сет IV {rune_days_sets(DONAT[2][4][2])}; сет VI {rune_days_sets(0, DONAT[4][4][2])}; '
          f'IV и VI {rune_days_sets(DONAT[2][4][2], DONAT[4][4][2])}.')


# ======================= ПРОГОН (--sim) =======================

CLEAN_JS = r"""
// закрывающий забег отряда прототипа на образце цикла II: сколько героев пало (ADR-0014: сид тот же, итог детерминирован)
function run(heroes, siege) {
  const B = EB.BIOMES.c2; let cur = heroes.map(h => EB.heroSrc(h)), wall = 0, hp = siege, boss = 0;
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
    js = head + CLEAN_JS.replace('LEVELS', json.dumps(list(range(150, 255, 5))))
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
