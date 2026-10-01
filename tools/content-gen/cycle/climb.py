# -*- coding: utf-8 -*-
"""Подъём по циклам II–VI — калькулятор сроков циклов (ADR-0041 — новый цикл как ступень аккаунта; ADR-0043 — сроки автора).
Черновик · предложение · ждёт автора.

Слово автора, 01.10.2026: «На 2 цикле игрок находится 2 недели, на 3 - 3 месяца, на 4 - 1 год, на 5 - 2, 6 - 2+». Длину держат стоки,
сила врагов — второй рычаг (ADR-0043, «Мнение координатора»):
- цена уровня героя × цикл героя — правило ядра RULES.levelCycle (design/ui/battle.js);
- рунные пределы и руна доблести — доблесть обнуляет уровень и пределы (§10.2): каждая ступень доблести — ещё один круг уровней и пределов;
- снаряжение и сильные руны с КрафБоссов, новые ключи и развилки рецептов — занятия года, в бой калькулятора не входят (их считают
  сборщики сундуков, снаряжения и модель стока); лишние слоты забегов ведут крафтовые биомы и ферму ключей, а не дух главного отряда.

Что считает. Игрок приходит в цикл c с отрядом, которым кончил цикл c − 1, и упирается в первый биом нового цикла. Дальше он качает
лучшую доступную ступень — пятёрку героев с наибольшей мощью на пределе: P(цикл героя) × (12 + 1200) × множитель доблести личного максимума.
Ступени: герои за золото цикла не выше своего (личный максимум доблести — 1, ADR-0030) — сразу, как хватает золота; герои Эхо цикла
(максимум — номер цикла − 1) — когда собраны осколки пятерых: у обычного и увлечённого — по недельным сундукам Эхо, у плательщика —
донатный сет того же максимума с первого дня цикла. Дух — в уровни главной ступени по цене × цикл героя; руны пределов — с побед у рунных
стражей за ключи (вариант Б); на пятом пределе и 1200-м — доблесть, если есть руна: уровень и пределы — заново. На время круга доблести место
в отряде держит запасной: отряд в бою не слабее, чем до доблести. Бои — ядром (climb-sim.js): биомы циклов III–VI — образец цикла II
по кривой §3.3 × ручка силы KX, пока биомы 5–12 не собраны. KX — и цель силы для их будущей сборки.

Доход по дням — те же правила, что у калькулятора экономики (economy.py, timeline_ex): забеги часов профиля, забегов разом — номер цикла,
ставки × цикл (mult_new), руны пределов — с побед у рунных стражей за ключи контрактов и босса, излишки пройденных пределов — в перековку
вверх. Цикл II этой модели совпадает с калькулятором экономики день в день — это проверяется; новых ступеней в цикле II нет.

Длина цикла — день, когда пал рунный страж второго биома цикла; следующий цикл — со следующего дня. Длины — неподвижная точка: доход
зависит от цикла дня, а цикл дня — от боёв.

    python tools/content-gen/cycle/climb.py           # прогон: таблицы и tools/content-gen/cycle/climb.json
    python tools/content-gen/cycle/climb.py --check   # только законы и свежесть climb.json: код выхода 1, если не держатся

Все числа — демонстрация, в начале файла; в функциях только алгоритм. Расчёт целочисленный: время — в миллисекундах, доли — б. п.
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
SIM = HERE / 'climb-sim.js'
OUT = HERE / 'climb.json'
OUT_DAYS = HERE / 'climb-days.json'      # записи дня по профилям — вход калькуляторов (economy/sets.py и дальше)
BP = E.BP

# ======================= ДАННЫЕ =======================

CYCLES = [2, 3, 4, 5, 6]                 # цикл II — калибровка (прогон темпа), III–VI — новые ступени
P_NEXT = 168                             # P цикла VII для второго биома цикла VI: цикла VII нет — ещё шаг ×1,6, как у echo.py (допущение)
# сроки автора (ADR-0043, слово 01.10.2026) — обычный игрок, 3 ч забегов в день. Цель — дни; коридор — цель ± около недели в цикле III,
# ± месяц в цикле IV, ± два месяца в цикле V; цикл VI — «2+ года»: от двух до трёх лет. Цикл II — коридор ADR-0031, п. 5
TERM = {2: 14, 3: 91, 4: 365, 5: 730, 6: 730}
TERM_TEXT = {2: '2 недели', 3: '3 месяца', 4: 'год', 5: '2 года', 6: '2+ года'}
CORRIDOR = {2: E.PACE_II_DAYS, 3: (84, 98), 4: (335, 395), 5: (670, 790), 6: (730, 1095)}
# ручки силы биомов циклов III–VI, пока их враги не собраны (это и цель силы для будущей сборки биомов 5–12):
# KX — сила всех врагов биома, % кривой §3.3 (уровень: (12 + L) = (32 + этаж) × K × KX / 100); HP_X — здоровье босса и стража, % образца.
# Кривая §3.3 одна у героев и врагов (ADR-0041): пятёрка героев цикла c на чистой кривой берёт стража второго биома своего цикла уже на ~200-м
# уровне — циклы шли бы днями. Сила врагов — второй рычаг сроков: страж второго биома ждёт ступень цикла, прокачанную стоками
# (цена уровня × цикл героя, круги доблести). Подбор 01.10.2026 (бисекция по длине цикла у обычного): B — сила, при которой обычный держит
# срок автора, A — наибольшая не выше B, при которой отряд конца цикла берёт первый биом за забег (закон фарма, biomes/farm.py). Было 140 / 120 /
# 103 / 130 % — коридор «три недели», ADR-0041. Длина ступенчата: круг доблести — месяцы, поэтому цикл V — 771 день, а не 730 (при B 710 — 638).
# Цикл VI: при 815 % отряд конца цикла V берёт первый биом VI в день прихода (закон стены), порог — между 815 и 820 %; взято 840 % с запасом
KX = {3: {'A': 340, 'B': 360}, 4: {'A': 570, 'B': 570}, 5: {'A': 745, 'B': 745}, 6: {'A': 840, 'B': 840}}
HP_X = {3: {'A': 100, 'B': 100}, 4: {'A': 100, 'B': 100}, 5: {'A': 100, 'B': 100}, 6: {'A': 100, 'B': 100}}
# профили: имя, часов забегов в день, профиль ключей контрактов, недельные сундуки Эхо (лутбоксы: free / fan), источник ступени
# с высоким максимумом доблести: обычный и увлечённый собирают героев Эхо, плательщик покупает донатный сет (тот же максимум) за Энериум
PROFILES = [('обычный', 3, 'o', 'free', 'echo'), ('увлечённый', 8, 'e', 'fan', 'echo'), ('плательщик', 3, 'p', 'free', 'donat')]
SQUAD_N = 5                              # героев в ступени: отряд целиком
GOLD_SHARE_BP = 8000                     # доля золота на героев — как у калькулятора сетов (sets.GOLD_BUDGET_BP): остальное — артефакты, лавка
STEP_FROM = 3                            # новые ступени — с цикла III: цикл II — калибровка калькулятора экономики (отряд обучения)
DAYS_MAX = 2600                          # горизонт прогона от начала цикла II: больше семи лет
FIXED_TRIES = 10                         # попыток неподвижной точки длин циклов
GUARD_SCAN = (10, 60000, 100)            # сила, с которой пал страж второго биома: уровни отряда цикла I от, до, шаг — б. п. (1 % уровня)
VALOR_REF = ['v3B', 'v4B', 'v5B']        # стражи, на которых меряется множитель мощи доблести (среднее по ним), на чистой кривой §3.3
VALOR_SCAN = (20, 8000, 100)             # уровни скана доблести: от, до, шаг — б. п.
WALL_DAY = 1                             # «упирается»: на этот день цикла отряд прихода не берёт первый биом — стена или осада
# «не стоит месяцами без дела»: у обычного в циклах III–VI между вехами развития — ступень, рунный предел, доблесть, босс и страж биома —
# не дольше стольких дней; уровни растут каждый день, недельные режимы — каждую неделю (таблица года цикла IV — cycle/build.js)
MILESTONE_GAP = 75                       # справка: самая долгая пауза между вехами — в таблице П4
# главная ступень не стоит: дней подряд без роста — ни уровня, ни предела, ни доблести, ни новой ступени — не больше стольких. Стоит она,
# когда ждёт руны предела на его уровне (новая ступень — первые руны своего цикла), руны доблести на 1200-м или когда прокачана до конца,
# а цикл не кончился
STALL_MAX = 14

# ======================= РАСЧЁТ =======================

R = E.rx()
N = len(E.LIMITS)
PER_WIN = [R['runes_per_win'] * 100 * w // BP for w in R['weights']]
NEED_RUNES = E.SQUAD * E.RUNES_PER_LIMIT * 100


def node(spec, pure=False):
    """Бой ядром (climb-sim.js); pure — образцы на чистой кривой §3.3, без ручек силы KX и HP_X (замер доблести от них не зависит)."""
    spec = dict(spec, pNext=P_NEXT, kX={} if pure else {str(k): v for k, v in KX.items()}, hpX={} if pure else {str(k): v for k, v in HP_X.items()})
    res = subprocess.run(['node', str(SIM), '-'], input=json.dumps(spec, ensure_ascii=False), cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        sys.exit(res.stderr)
    return json.loads(res.stdout)


def _js(code):
    res = subprocess.run(['node', '-e', "globalThis.window=globalThis;" + code], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        sys.exit('climb.py: ' + res.stderr)
    return json.loads(res.stdout or 'null')


CORE = _js("require('./design/ui/battle.js');const R=globalThis.EnBattle.RULES;"
           "process.stdout.write(JSON.stringify({curve:R.cycleX10||null,lvl:R.levelCycle||null}))")
CURVE, LVL_CYC = CORE['curve'], CORE['lvl']
if not CURVE:
    sys.exit('climb.py: в ядре нет кривой силы героя RULES.cycleX10 (ADR-0041)')
if not LVL_CYC:
    sys.exit('climb.py: в ядре нет цены уровня по циклу героя RULES.levelCycle (ADR-0043)')
# личный максимум доблести по источнику и циклу героя, комплект осколков героя, отряды Эхо по неделям рас — состав героев (roster.js);
# осколки Эхо за неделю — недельные сундуки (lootboxes.js, week.echo: × 100)
ROS = _js("require('./design/ui/roster.js');require('./design/ui/lootboxes.js');const R=globalThis.EN_ROSTER,L=globalThis.EN_LOOTBOXES;"
          "process.stdout.write(JSON.stringify({maxV:R.rules.maxV,shards:R.rules.stub.shards,souls:R.rules.stub.activateSouls,"
          "races:R.weeks.length,echo:L.week.echo}))")
RACES = ROS['races']


def vmax_of(src, k):
    """Личный максимум доблести героя источника src и цикла k (roster.js, rules.maxV; ADR-0019, ADR-0030, п. 5а)."""
    return ROS['maxV'][src][k - 1]


VX = None   # множитель мощи доблести v = 0…5 в единицах уровня × 100 — замер ядром (valor_x)


def valor_x():
    """Во сколько доблесть v прибавляет мощи — отношение (12 + L₀) / (12 + Lᵥ) начала полосы побед над стражем, × 100, среднее по
    VALOR_REF; не убывает с v. Отряд новой ступени — без руны обучения."""
    f, t, s = VALOR_SCAN
    acc = [0] * 6
    for b in VALOR_REF:
        rows = node({'mode': 'valor', 'biome': b, 'k': 2, 'from': f, 'to': t, 'stepBp': s, 'max': 5}, pure=True)['rows']
        base = E.LEVEL_DIV + rows[0]['stable']
        for r in rows:
            acc[r['v']] += base * 100 // (E.LEVEL_DIV + r['stable'])
    out = [a // len(VALOR_REF) for a in acc]
    for v in range(1, len(out)):
        out[v] = max(out[v], out[v - 1])
    return out


def vxf(v, j=0):
    """Множитель мощи доблести × 100 у пятёрки, где j героев уже на доблести v + 1, остальные — на v: доля пути между замерами VX."""
    return VX[v] + (VX[min(v + 1, len(VX) - 1)] - VX[v]) * j // SQUAD_N


def w_of(k, lvl, v=0, j=0):
    """Мощь отряда героев цикла k на уровне lvl с доблестью v (j героев — на v + 1) в десятых единицах кривой:
    P(k) × (12 + уровень) × множитель доблести."""
    return CURVE[k - 1] * (E.LEVEL_DIV + lvl) * vxf(v, j) // 100


def bat(S):
    """Отряд ступени в бою: (уровень, доблесть, героев на доблести выше). Пока идёт первый круг — уровень пятёрки; дальше пятёрка на
    1200-м: герою, что после доблести заново проходит круг, место держит запасной той же силы, что он до доблести."""
    return (S['lvl'], S['v'], S['j'])


def w_sq(S):
    lvl, v, j = bat(S)
    return w_of(S['k'], lvl, v, j)


def pot(S):
    """Мощь ступени на пределе: 1200-й уровень и личный максимум доблести — по ней игрок выбирает, кого качать."""
    return w_of(S['k'], E.LIMITS[-1], S['vmax'])


def fix_x():
    """Множитель доблести отряда прогонов цикла I × 100: у бойца урона — руна обучения (j = 1). На этом отряде мерена таблица забегов
    калькулятора экономики (SIM): уровень в ней — уровень этого отряда."""
    return vxf(0, 1)


def eff(wx10, c):
    """Уровень отряда прогонов цикла I той же силы против врагов образца — для таблицы забегов калькулятора экономики (SIM): сила, делённая на
    кривую цикла, на ручку силы его первого биома (KX) и на доблесть самого отряда прогонов: забеги идут там, где отряд упёрся."""
    kx = KX.get(c, {}).get('A', 100)
    return max(1, wx10 * 100 * 100 // (CURVE[c - 1] * kx * fix_x()) - E.LEVEL_DIV)


_FARM = {}


def farm(wx10, c):
    """Час забегов отряда силы wx10 в цикле c: золото, дух и боссы × ключей с босса × 100. С цикла III отряд идёт туда, где за час больше
    духа: в образец своего цикла или старшего из прошлых, по ставке его цикла (ADR-0014; старый биом — по циклу биома, ADR-0044): отряд прихода
    у стены нового цикла фармит прошлый. Цикл II — только свой образец, как калькулятор экономики (сверка день в день)."""
    key = (wx10, c)
    if key not in _FARM:
        best = None
        for cc in ([c] if c < STEP_FROM else range(2, c + 1)):
            row = E.sim_row(eff(wx10, cc))
            g, sp, _ = E.per_hour(row, E.RATES_NEW, E.mult_new(cc))
            bk = row[4] * E.HOUR_MS * 100 // row[5] * cc        # ключей с босса за срабатывание — цикл биома (§11)
            if best is None or sp > best[1]:
                best = (g, sp, bk, cc)
        _FARM[key] = best
    return _FARM[key]


def cap_of(nxt):
    return E.LIMITS[min(nxt, N - 1)]


def breaks(st, S, day):
    """Рунный предел пробивается на его уровне (§10.1; экран развития — на потолке, atCap): руны своего предела — в запасе ступени.
    Первый круг — пятёрка разом (10 рун × 5 героев); круг доблести — один герой (10 рун). Пробит хоть один — True."""
    hit = False
    if S['hl'] is None:
        while S['nxt'] < N and S['lvl'] >= cap_of(S['nxt']) and S['stock'][S['nxt']] >= NEED_RUNES:
            S['stock'][S['nxt']] -= NEED_RUNES
            S['nxt'] += 1
            hit = True
            st['ev'].append((day, 'limit', st['focus'], S['nxt']))
        return hit
    need = NEED_RUNES // SQUAD_N
    while S['hn'] < N and S['hl'] >= cap_of(S['hn']) and S['stock'][S['hn']] >= need:
        S['stock'][S['hn']] -= need
        S['hn'] += 1
        hit = True
    return hit


def squad_price(k):
    return sum(E.hero_price(k, j) for j in range(1, SQUAD_N + 1))


def lvl_cost(S, n, heroes=SQUAD_N):
    """Дух на уровень n героям ступени: ⌈n^1,2⌉ × цикл героя (RULES.levelCycle) × сколько героев качается (пятёрка или один)."""
    return heroes * E.level_cost(n) * LVL_CYC[S['k'] - 1]


def circle_done(S):
    """Первый круг ступени пройден: пятёрка на 1200-м и на пятом пределе — с него доступна доблесть (§10.2)."""
    return S['lvl'] >= E.LIMITS[-1] and S['nxt'] >= N


def new_squad(k, src, day, lvl=0, nxt=0):
    """Ступень: пятёрка героев цикла k источника src. v — доблесть всех пятерых, j — сколько из них уже на v + 1; hl и hn — уровень и пределы
    героя, что после доблести заново проходит круг (None — такого нет). У героев цикла I боец урона уже взял первую доблесть руной
    обучения (ADR-0031, п. 2): j = 1."""
    return {'k': k, 'src': src, 'vmax': vmax_of(src, k), 'v': 0, 'j': 1 if k == 1 else 0, 'lvl': lvl, 'nxt': nxt, 'hl': None, 'hn': 0,
            'stock': [0] * N, 'day': day}


def fresh():
    return {'sq': {'1g': new_squad(1, 'gold', 0, E.START_LEVEL, E.START_LIMITS)}, 'b': E.START_LEVEL, 'bank': 0, 'gold': 0,
            'hero_gold': 0, 'boss_prev': 0, 'shards': 0, 'focus': '1g', 'ev': [], 'fc': [2, 2]}


def main_k(st):
    return max(st['sq'], key=lambda key: (w_sq(st['sq'][key]), -st['sq'][key]['k'], key))


def w_main(st):
    return w_sq(st['sq'][main_k(st)])


def echo_days(ends, lbp, src):
    """День (от начала цикла II), когда у профиля готова ступень с высоким максимумом доблести каждого цикла k ≥ II. Донат — первый день
    цикла k. Эхо — неделя за неделей: осколки недели (lootboxes.js, week.echo своего цикла) делятся поровну между открытыми героями Эхо
    расы недели (циклы II…текущий), герой готов на комплекте (roster.js, stub.shards); ступень — пятеро готовых героев цикла k."""
    if src == 'donat':
        return {k: (ends.get(k - 1) or 0) + 1 for k in range(2, 7)}
    got, ready, done = {}, {}, {}
    for w in range(DAYS_MAX // 7):
        d = 7 * w + 7
        c = cycle_of(d, ends)
        if c < 2:
            continue
        sh = ROS['echo'][str(c)][lbp]['shards']           # × 100
        per = sh // (c - 1)
        r = w % RACES
        for k in range(2, c + 1):
            key = (k, r)
            if key in done:
                continue
            got[key] = got.get(key, 0) + per
            if got[key] >= ROS['shards'] * 100:
                done[key] = d
                ready.setdefault(k, []).append(d)
    return {k: sorted(v)[SQUAD_N - 1] for k, v in ready.items() if len(v) >= SQUAD_N}


def cycle_of(day, ends):
    for c in CYCLES:
        e = ends.get(c)
        if e is None or day <= e:
            return c
    return CYCLES[-1]


def spirit_to(S, need_w):
    """Сколько духа ступени S до силы need_w: остаток первого круга пятёрки, если сила достижима в нём; иначе — первый круг и круги героев
    после доблести, по одному, до наименьшего числа героев на доблести, с которым пятёрка на 1200-м сильнее need_w. None — ступени
    не хватит и на личном максимуме. Оценка для выбора ступени: руны и ожидание их в ней не считаются."""
    top, k = E.LIMITS[-1], S['k']
    one = E.cum(top) * LVL_CYC[k - 1]                       # круг одного героя
    if not circle_done(S):
        L = -(-need_w * 100 // (CURVE[k - 1] * vxf(S['v'], S['j']))) - E.LEVEL_DIV
        if L <= top:
            return max(0, E.cum(max(L, 0)) - E.cum(S['lvl'])) * SQUAD_N * LVL_CYC[k - 1]
        sp = (E.cum(top) - E.cum(S['lvl'])) * SQUAD_N * LVL_CYC[k - 1]
    else:
        sp = (one - E.cum(S['hl']) * LVL_CYC[k - 1]) if S['hl'] is not None else 0
    v, j = S['v'], S['j'] + (1 if S['hl'] is not None else 0)
    while True:
        if j >= SQUAD_N:
            v, j = v + 1, 0
        if w_of(k, top, v, j) >= need_w:
            return sp
        if v >= S['vmax']:
            return None
        sp += one
        j += 1


def policy(st, c, day, ready, src, need_w):
    """Ступень дня (с цикла III). Кандидаты — герои за золото цикла не выше своего, как хватает золота, и ступень с высоким максимумом
    доблести, когда готова. Игрок берёт ту, на которой раньше выйдет на силу стража второго биома цикла: меньше духа до неё (spirit_to);
    если не выходит ни одна — ту, что сильнее на пределе. Нынешняя ступень остаётся, пока новая не короче пути. Новая ступень — главная:
    ей идут дух и руны."""
    if c < STEP_FROM:
        return
    F = st['sq'][st['focus']]

    def rank(S):
        sp = spirit_to(S, need_w) if need_w else None
        return (0, sp) if sp is not None else (1, -pot(S))
    best, cand = rank(F), None
    for k in range(2, c + 1):
        for s, ok in (('gold', st['hero_gold'] >= squad_price(k)), (src, ready.get(k, DAYS_MAX + 1) <= day)):
            key = f'{k}{s[0]}'
            if key in st['sq'] or not ok:
                continue
            S = new_squad(k, s, day)
            if rank(S) < best:
                best, cand = rank(S), (key, S)
    if cand:
        key, S = cand
        if S['src'] == 'gold':
            st['hero_gold'] -= squad_price(S['k'])
        st['sq'][key] = S
        st['focus'] = key
        st['ev'].append((day, 'step', key))


def step(st, c, hours, prof, day):
    """Один день цикла c: победы у рунных стражей за ключи, руны — главной ступени, осколки доблести, забеги часов профиля, дух — в уровни
    главной ступени, потом сильнейшей живой; доблесть — когда главная ступень прошла круг и есть руны."""
    keys = E.contract_keys_x100(c, prof) + st['boss_prev'] * R['boss_key_bp'] // BP
    wins = E.rb_wins_x100(keys, c)
    lim_w = wins * E.RB_SPLIT_BP // BP
    F = st['sq'][st['focus']]
    for k in range(N):
        F['stock'][k] += PER_WIN[k] * lim_w // 100
    # излишки пройденных пределов — в перековку вверх; с цикла III, пока у ступени впереди круги доблести, по комплекту каждого пройденного
    # предела игрок держит на следующий круг: доблесть сбросит пределы, и руны понадобятся снова
    keep = (NEED_RUNES if F['hl'] is None and not circle_done(F) else NEED_RUNES // SQUAD_N) if c >= STEP_FROM and F['v'] < F['vmax'] else 0
    for _ in range(2):
        breaks(st, F, day)
        for k in range(min(F['nxt'] if F['hl'] is None else F['hn'], N - 1)):
            q = max(0, F['stock'][k] - keep) // (R['reforge'] * 100)
            F['stock'][k] -= q * R['reforge'] * 100
            F['stock'][k + 1] += q * 100
    st['shards'] += (wins - lim_w) * R['shards_x100'] // 100
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
            wx = w_main(st) if s == 0 else w_of(1, st['b'], 0, 1)   # вторые отряды — герои цикла I отряда прогонов
            g, sp, bk, cc = farm(wx, c)
            st['fc'][min(s, 1)] = cc
            st['bank'] += sp
            st['gold'] += g
            st['hero_gold'] += g * GOLD_SHARE_BP // BP
            boss += bk
        order = [st['focus']] + [k for k in [M] if k != st['focus']]
        for key in order:
            S = st['sq'][key]
            while S['hl'] is None and S['lvl'] < E.LIMITS[-1] and st['bank'] >= lvl_cost(S, S['lvl'] + 1):
                if S['lvl'] >= cap_of(S['nxt']) and not (key == st['focus'] and breaks(st, S, day)):
                    break
                st['bank'] -= lvl_cost(S, S['lvl'] + 1)
                S['lvl'] += 1
            if key == st['focus']:
                hero_up(st, S, day)
        n_b, old = n_sl - 1, st['sq']['1g']['lvl']
        while n_b and st['b'] < min(E.EXTRA_CAP.get(c, E.EXTRA_CAP[max(E.EXTRA_CAP)]), old) and st['bank'] >= n_b * E.SQUAD * E.level_cost(st['b'] + 1):
            st['bank'] -= n_b * E.SQUAD * E.level_cost(st['b'] + 1)
            st['b'] += 1
    st['boss_prev'] = boss
    hero_up(st, F, day)


def hero_up(st, F, day):
    """Доблесть — по одному герою (§10.2, §10.4): пятёрка прошла первый круг, личный максимум не взят, есть руна доблести (сто осколков) —
    герой берёт доблесть, его уровень и пределы — заново, дух и руны идут ему; на 1200-м и пятом пределе он снова в отряде, уже на доблести
    выше. На время его круга место в отряде держит запасной той же силы, что он до доблести."""
    while True:
        if F['hl'] is not None:
            while F['hl'] < E.LIMITS[-1] and st['bank'] >= lvl_cost(F, F['hl'] + 1, 1):
                if F['hl'] >= cap_of(F['hn']) and not breaks(st, F, day):
                    break
                st['bank'] -= lvl_cost(F, F['hl'] + 1, 1)
                F['hl'] += 1
            breaks(st, F, day)
            if F['hl'] < E.LIMITS[-1] or F['hn'] < N:
                return
            F['hl'], F['hn'], F['j'] = None, 0, F['j'] + 1
            if F['j'] >= SQUAD_N:
                F['v'], F['j'] = F['v'] + 1, 0
            st['ev'].append((day, 'valor', st['focus'], F['v'], F['j']))
        need = R['valor_rune'] * 100
        if not circle_done(F) or F['v'] >= F['vmax'] or st['shards'] < need:
            return
        st['shards'] -= need
        F['hl'], F['hn'] = 0, 0


def guard_need():
    """Сила, с которой рунный страж второго биома цикла падает без провалов: начало последней полосы побед отряда цикла I по уровням —
    в силу. Ниже бывают удачные уровни, но на них темп не держится (как «страж без провалов» прогона темпа)."""
    out = {}
    for c in CYCLES:
        f, t, s = GUARD_SCAN
        r = node({'mode': 'guard', 'biome': f'v{c}B', 'k': 1, 'from': f, 'to': t, 'stepBp': s})
        out[c] = {'lvl': r['stable'], 'first': r['first'], 'w': w_of(1, r['stable'], 0, 1) if r['stable'] is not None else None, 'lost': r['lost']}
    return out


def plan_of(hours, prof, lbp, src, ends, need):
    """Дни от начала цикла II: отряд главного забега (цикл героев, уровень, доблесть) по дням, ступени, вехи и записи дня для калькуляторов."""
    st, plan, lv2, rec = fresh(), [], [], []
    ready = echo_days(ends, lbp, src)
    for day in range(1, DAYS_MAX + 1):
        c = cycle_of(day, ends)
        F0 = st['sq'][st['focus']]
        was = (st['focus'], F0['lvl'], F0['nxt'], F0['v'], F0['j'], F0['hl'], F0['hn'])
        policy(st, c, day, ready, src, need.get(c, {}).get('w'))
        step(st, c, hours, prof, day)
        M = st['sq'][main_k(st)]
        ml, mv, mj = bat(M)
        plan.append([M['k'], ml, mv, mj])
        F = st['sq'][st['focus']]
        # главная ступень выросла: уровень, предел, доблесть героя, его уровень и пределы или новая ступень
        grow = int((st['focus'], F['lvl'], F['nxt'], F['v'], F['j'], F['hl'], F['hn']) != was)
        rec.append([c, M['k'], ml, mv, st['b'], w_sq(M), F['k'], F['lvl'], F['v'], F['nxt'], grow,
                    st['fc'][0], st['fc'][1], mj, F['j'], -1 if F['hl'] is None else F['hl']])
        if c == 2:
            lv2.append(st['sq']['1g']['lvl'])
    return plan, lv2, rec, st['ev'], ready


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


def profile(name, hours, prof, lbp, src, ends0, need):
    """Неподвижная точка длин циклов: доход по дням зависит от цикла дня, цикл дня — от боёв."""
    ends, tried = dict(ends0), []
    for _ in range(FIXED_TRIES):
        plan, lv2, rec, ev, ready = plan_of(hours, prof, lbp, src, ends, need)
        b = battle(plan, hours)
        got = ends_of(b)
        tried.append([ends.get(c) for c in CYCLES])
        if got == ends or [got.get(c) for c in CYCLES] in tried:
            ends = got
            break
        ends = got
    plan, lv2, rec, ev, ready = plan_of(hours, prof, lbp, src, ends, need)
    b = battle(plan, hours)
    return {'name': name, 'hours': hours, 'prof': prof, 'ends': ends_of(b), 'biomes': b, 'plan': plan, 'lv2': lv2, 'rec': rec, 'ev': ev,
            'ready': ready, 'tried': tried}


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


def milestones(p, c):
    """Вехи развития обычного в цикле c, дни цикла: ступень, рунный предел, доблесть, босс и страж биома. Самая долгая пауза между ними."""
    start = (p['ends'].get(c - 1) or 0) + 1
    end = p['ends'].get(c)
    if end is None:
        return None, []
    days = sorted({d for d, *_ in p['ev'] if start <= d <= end})
    for ab in 'AB':
        x = p['biomes'].get(f'v{c}{ab}', {})
        for k in ('boss', 'guard'):
            if x.get(k) and start <= x[k]['day'] <= end:
                days.append(x[k]['day'])
    days = sorted(set(days + [start, end]))
    gap = max(b - a for a, b in zip(days, days[1:])) if len(days) > 1 else end - start
    return gap, days


def stall(p, c):
    """Цикл c: дней, когда главная ступень не выросла, самая длинная их полоса и длина цикла."""
    start, end = (p['ends'].get(c - 1) or 0) + 1, p['ends'].get(c)
    if end is None:
        return None, None, None
    total = run_ = cur = 0
    for d in range(start, end + 1):
        if p['rec'][d - 1][10]:
            cur = 0
        else:
            total += 1
            cur += 1
            run_ = max(run_, cur)
    return total, run_, end - start + 1


def valor_txt(v, j):
    """«доблесть 2», «доблесть 2, у трёх — 3»."""
    return f'доблесть {v}' + (f', у {j} — {v + 1}' if j else '')


def dn(n):
    """«1 день», «2 дня», «5 дней»."""
    a, b = n % 10, n % 100
    return f'{n} ' + ('день' if a == 1 and b != 11 else 'дня' if 2 <= a <= 4 and not 12 <= b <= 14 else 'дней')


def roman(c):
    return E.CYCLE_NAMES[c - 1]


def end_squad(p, c):
    """Отряд главного забега, которым профиль берёт стража второго биома цикла c: цикл героев, уровень, доблесть, героев на доблести выше."""
    e = p['ends'].get(c)
    if e is None:
        return None
    r = p['rec'][e - 1]
    return r[1], r[2], r[3], r[13]


def clears(prof):
    """Закон «конец цикла берёт свой первый биом за забег» (как в цикле II: отряд конца цикла берёт Библиотеку Улариона за забег, второй биом —
    осадой): у обычного отряд, которым он берёт стража второго биома, проходит первый биом цикла с боссом за один забег. Тогда свой биом
    фармится чисто — без этого удары насмерть по старому биому выгоднее своего (закон фарма В1, biomes/farm.py)."""
    reg = prof[0]
    lst = [dict(biome=f'v{c}A', k=s[0], L=s[1], v=s[2], j=s[3]) for c in CYCLES[1:] for s in [end_squad(reg, c)] if s]
    rows = node({'mode': 'clear', 'list': lst})['rows'] if lst else []
    return {int(r['biome'][1]): r for r in rows}


def verdict(prof, econ_ok, same, clr):
    reg, fan, pay = prof
    L, Lf, Lp = lengths(reg), lengths(fan), lengths(pay)
    W = walls(reg)
    rows = [('Образец цикла II — Библиотека Улариона и Стоун-Хейм этаж в этаж', 'уровни врагов, босс и страж совпадают', 'совпадает' if same else 'нет', same),
            ('Цикл II калькулятора — день в день', f'уровни отряда — как у калькулятора экономики, длина — как у прогона темпа ({dn(E.CYCLE_DAYS)})',
             'совпадает' if econ_ok else 'нет', econ_ok)]
    for c in CYCLES[1:]:
        lo, hi = CORRIDOR[c]
        ok = L[c] is not None and lo <= L[c] <= hi
        rows.append((f'Цикл {roman(c)}, обычный: срок автора — {TERM_TEXT[c]}', f'{lo}–{hi} дней', dn(L[c]) if L[c] else 'не прошёл', ok))
        w = W[c]
        rows.append((f'Цикл {roman(c)}: отряд прихода упирается', 'в первый день не берёт первый биом',
                     (('стена на ' + str(w['wall']) + '-м этаже') if w['wall'] else 'осада босса') + (f", босс — на {w['boss']}-й день цикла" if w['boss'] else ''), w['stuck']))
        x = clr.get(c)
        rows.append((f'Цикл {roman(c)}: отряд конца цикла берёт первый биом за забег', 'босс первого биома — с первого забега, без осады',
                     (f"герои цикла {roman(x['k'])}, {x['L']}-й, {valor_txt(x['v'], x['j'])}: " + ('за забег' if x['runs'] == 1 else f"осада, забегов — {x['runs'] or 'не падает'}"))
                     if x else 'не прошёл', bool(x) and x['runs'] == 1))
        sd, run_, ln = stall(reg, c)
        rows.append((f'Цикл {roman(c)}, обычный: главная ступень растёт', f'без роста — не дольше {dn(STALL_MAX)} подряд',
                     f'дольше всего — {dn(run_)}, всего {dn(sd)} из {ln}' if ln else 'не прошёл', bool(ln) and run_ <= STALL_MAX))
        okf = Lf[c] is not None and L[c] is not None and Lf[c] <= L[c]
        rows.append((f'Цикл {roman(c)}, увлечённый', 'быстрее обычного', dn(Lf[c]) if Lf[c] else 'не прошёл', okf))
        okp = Lp[c] is not None and L[c] is not None and Lp[c] <= L[c] and L[c] * 10 <= Lp[c] * E.PAYER_MAX_X10
        rows.append((f'Цикл {roman(c)}, плательщик', f'не медленнее обычного и быстрее не больше чем в ×{E.PAYER_MAX_X10 // 10},{E.PAYER_MAX_X10 % 10}',
                     dn(Lp[c]) if Lp[c] else 'не прошёл', okp))
    tr, tp = reg['ends'].get(CYCLES[-1]), pay['ends'].get(CYCLES[-1])
    okt = tr is not None and tp is not None and tr * 10 <= tp * E.PAYER_MAX_X10
    rows.append(('Вся длина II–VI, плательщик', f'быстрее обычного не больше чем в ×{E.PAYER_MAX_X10 // 10},{E.PAYER_MAX_X10 % 10}',
                 f'{dn(tp)} против {dn(tr)}' if tr and tp else 'не прошёл', okt))
    return rows


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
    out += ['| ' + ' | '.join(str(x) for x in r) + ' |' for r in rows]
    return '\n'.join(out)


SRC_RU = {'g': 'за золото', 'e': 'Эхо', 'd': 'донат'}


def step_name(key):
    k, s = int(key[0]), key[1]
    return f'герои цикла {roman(k)} · {SRC_RU[s]}'


def years(n):
    """Дни — в месяцах или годах, словами: «3 мес.», «1 год 2 мес.»."""
    m = (n * 100 + 1522) // 3044   # месяц — 30,44 дня
    y, mm = m // 12, m % 12
    if not y:
        return f'{mm} мес.'
    yy = f'{y} ' + ('год' if y % 10 == 1 and y % 100 != 11 else 'года' if 2 <= y % 10 <= 4 and not 12 <= y % 100 <= 14 else 'лет')
    return yy + (f' {mm} мес.' if mm else '')


def md(res):
    reg, fan, pay = res['profiles']
    out = []
    out.append('П0. Вердикт.\n\n' + table(['Что', 'Цель', 'Прогон', 'Итог'], [[a, b, c, 'держится' if d else '**нет**'] for a, b, c, d in res['verdict']]))
    rows = []
    for p in res['profiles']:
        L = lengths(p)
        rows.append([p['name'], *[f'{L[c]} · {years(L[c])}' if L[c] else '—' for c in CYCLES],
                     f"{p['ends'][CYCLES[-1]]} · {years(p['ends'][CYCLES[-1]])}" if p['ends'][CYCLES[-1]] else '—'])
    rows.append(['срок автора', *[TERM_TEXT[c] for c in CYCLES], '—'])
    out.append('П1. Длина циклов: дней · месяцев или лет.\n\n' + table(['Профиль', *[roman(c) for c in CYCLES], 'Всего с начала II'], rows))
    rows = []
    for c in CYCLES[1:]:
        w = walls(reg)[c]
        start = (reg['ends'].get(c - 1) or 0) + 1
        came = reg['rec'][start - 2] if start >= 2 else None
        came_s = f'герои цикла {roman(came[1])}, {came[2]}-й, {valor_txt(came[3], came[13])}' if came else '—'
        wall = (f"{w['wall']}-й этаж" if w['wall'] else 'осада босса') + (f", босс — {w['boss']}-й день" if w['boss'] else '')
        steps = [f'{d - start + 1}-й день — {step_name(key)}' for d, kind, key, *_ in reg['ev'] if kind == 'step' and start <= d <= (reg['ends'].get(c) or 0)]
        end = reg['rec'][(reg['ends'].get(c) or 1) - 1]
        fin = f'герои цикла {roman(end[1])}, {end[2]}-й, {valor_txt(end[3], end[13])}'
        rows.append([roman(c), came_s, wall, '; '.join(steps) or 'та же ступень', fin, f"{res['need'][c]['w'] // 10}"])
    out.append('П2. Обычный: с чем приходит, где упирается, какие ступени берёт и с чем берёт стража второго биома.\n\n'
               + table(['Цикл', 'Отряд прихода', 'Стена в первом биоме', 'Новые ступени: день цикла', 'Отряд у стража второго биома',
                        'Сила стража, единиц героя цикла I'], rows))
    rows = []
    for c in CYCLES:
        a, b = reg['biomes'].get(f'v{c}A', {}), reg['biomes'].get(f'v{c}B', {})

        def cell(x):
            if not x:
                return '—'
            s = []
            if x.get('boss'):
                s.append(f"босс — {x['boss']['day']}-й день, герои {roman(x['boss']['k'])} на {x['boss']['lvl']}-м, {valor_txt(x['boss']['v'], x['boss'].get('j', 0))}")
            if x.get('guard'):
                s.append(f"страж — {x['guard']['day']}-й, на {x['guard']['lvl']}-м")
            return '; '.join(s) or '—'
        rows.append([roman(c), cell(a), cell(b)])
    out.append('П3. Обычный по биомам: дни от начала цикла II.\n\n' + table(['Цикл', 'Первый биом', 'Второй биом'], rows))
    rows = []
    for c in CYCLES[1:]:
        gap, days = milestones(reg, c)
        start = (reg['ends'].get(c - 1) or 0) + 1
        ev = [x for x in reg['ev'] if start <= x[0] <= (reg['ends'].get(c) or 0)]
        n_lim = sum(1 for x in ev if x[1] == 'limit')
        n_val = sum(1 for x in ev if x[1] == 'valor')
        n_st = sum(1 for x in ev if x[1] == 'step')
        rows.append([roman(c), n_st, n_lim, n_val, len(days) - 2 if days else 0, dn(gap) if gap is not None else '—'])
    out.append('П4. Обычный: вехи развития по циклам — новые ступени, рунные пределы, доблесть, самая долгая пауза.\n\n'
               + table(['Цикл', 'Ступеней', 'Рунных пределов', 'Доблестей', 'Всего вех с боссами и стражами', 'Самая долгая пауза'], rows))
    out.append('П5. Стоки и ручки.\n\n' + table(['Что', 'Число', 'Откуда'], [
        ['Цена уровня героя × цикл героя', ' / '.join(str(x) for x in LVL_CYC), '`RULES.levelCycle`, ядро'],
        ['Круг пятёрки героев цикла c, дух', ' / '.join(f'{E.SQUAD * E.cum(E.LIMITS[-1]) * LVL_CYC[c - 1] // 10 ** 6} млн' for c in range(1, 7)),
         'Σ ⌈n^1,2⌉ до 1200-го × 5 × цикл'],
        ['Множитель мощи доблести 0–5, в единицах уровня', ' / '.join(f'×{x // 100},{x % 100:02d}' for x in VX), 'замер ядром, `climb-sim.js`, режим valor'],
        ['Личный максимум доблести: за золото / Эхо и донат', f"{vmax_of('gold', 4)} / номер цикла − 1", '`roster.js`, `rules.maxV`'],
        ['Сила врагов циклов III–VI, % кривой', ' / '.join(f"{KX[c]['A']} %" for c in CYCLES[1:]), '`KX` — цель силы биомов 5–12'],
    ]))
    return '\n\n'.join(out)


def run():
    global VX
    _FARM.clear()
    VX = valor_x()
    same = node({'mode': 'biomes'})['same']
    need = guard_need()
    ends0 = {c: sum(TERM[x] for x in CYCLES if x <= c) for c in CYCLES}
    ends0[2] = E.CYCLE_DAYS
    profs = [profile(n, h, p, l, s, ends0, need) for n, h, p, l, s in PROFILES]
    econ = E.pace_of(PROFILES[0][1])['lv']
    lv2 = profs[0]['lv2']
    econ_ok = profs[0]['ends'][2] == E.CYCLE_DAYS and all(econ[d + 1][0] == lv2[d] for d in range(min(len(lv2), len(econ) - 1)))
    res = {'need': need, 'profiles': profs, 'same': same, 'econOk': econ_ok}
    res['clear'] = clears(profs)
    res['verdict'] = verdict(profs, econ_ok, same, res['clear'])
    return res


FIELDS = ['цикл', 'цикл героев главного забега', 'его уровень', 'доблесть', 'уровень вторых отрядов', 'мощь главного отряда × 10',
          'цикл героев главной ступени развития', 'её уровень', 'её доблесть', 'пределов', 'выросла ли за день',
          'цикл образца, где фармит главный отряд', 'цикл образца, где фармят вторые отряды',
          'героев главного забега на доблести выше', 'героев главной ступени на доблести выше', 'уровень героя главной ступени после доблести (−1 — нет)']


def days_of(p):
    """Записи дня профиля с первого дня цикла II до конца цикла VI — поля FIELDS."""
    return p['rec'][:p['ends'][CYCLES[-1]]] if p['ends'].get(CYCLES[-1]) else p['rec']


def dump_days(res):
    """climb-days.json — записи дня по профилям для калькуляторов (economy/sets.py и дальше): строка на профиль."""
    head = {'builder': 'tools/content-gen/cycle/climb.py', 'fields': FIELDS,
            'ends': {p['prof']: {str(c): v for c, v in p['ends'].items()} for p in res['profiles']}}
    lines = ['{"meta":' + json.dumps(head, ensure_ascii=False, separators=(',', ':'), sort_keys=True) + ',', '"days":{']
    n = len(res['profiles'])
    lines += [json.dumps(p['prof']) + ':' + json.dumps(days_of(p), separators=(',', ':')) + (',' if i < n - 1 else '') for i, p in enumerate(res['profiles'])]
    lines += ['}}', '']
    return '\n'.join(lines)


def dump(res):
    keep = {
        'meta': {'builder': 'tools/content-gen/cycle/climb.py', 'sim': 'tools/content-gen/cycle/climb-sim.js',
                 'days': 'tools/content-gen/cycle/climb-days.json — записи дня по профилям',
                 'sources': ['GDD §3.3', 'GDD §10', 'GDD §11', 'ADR-0031', 'ADR-0041', 'ADR-0043', 'tools/content-gen/economy/economy.py',
                             'design/ui/battle.js', 'design/ui/roster.js', 'design/ui/lootboxes.js']},
        'curve': CURVE, 'levelCycle': LVL_CYC, 'valorX': VX, 'fixX': fix_x(), 'pNext': P_NEXT, 'kX': KX, 'hpX': HP_X, 'corridor': CORRIDOR, 'term': TERM,
        'termText': TERM_TEXT, 'cycleIIDays': E.CYCLE_DAYS,
        'need': {str(c): v for c, v in res['need'].items()},
        'profiles': [{'name': p['name'], 'hours': p['hours'], 'prof': p['prof'], 'ends': {str(c): v for c, v in p['ends'].items()},
                      'len': {str(c): v for c, v in lengths(p).items()},
                      'walls': {str(c): v for c, v in walls(p).items()},
                      'ready': {str(k): v for k, v in sorted(p['ready'].items())},
                      'events': [list(x) for x in p['ev'] if x[0] <= (p['ends'].get(CYCLES[-1]) or DAYS_MAX)],
                      'biomes': {k: {x: v[x] for x in ('boss', 'guard', 'from') if x in v} for k, v in p['biomes'].items()}}
                     for p in res['profiles']],
        'verdict': [{'what': a, 'goal': b, 'got': c, 'ok': d} for a, b, c, d in res['verdict']],
        'md': md(res),
    }
    return json.dumps(keep, ensure_ascii=False, indent=1, sort_keys=True) + '\n'


def main():
    check = '--check' in sys.argv
    res = run()
    text, days = dump(res), dump_days(res)
    print(md(res))
    bad = [v for v in res['verdict'] if not v[3]]
    if check:
        old = OUT.read_text(encoding='utf-8') if OUT.exists() else ''
        oldd = OUT_DAYS.read_text(encoding='utf-8') if OUT_DAYS.exists() else ''
        stale = old != text or oldd != days
        if bad:   # законы — раньше свежести: правка, что ломает закон, видна и тогда, когда файлы ещё не пересобраны
            print('\nЗаконы не держатся:', '; '.join(v[0] for v in bad))
        if stale:
            print('\nclimb.json или climb-days.json устарел — пересобрать: python tools/content-gen/cycle/climb.py')
        if bad or stale:
            sys.exit(1)
        print('\nПроверка пройдена: сроки циклов в коридорах автора, climb.json свежий.')
        return
    OUT.write_text(text, encoding='utf-8', newline='\n')
    OUT_DAYS.write_text(days, encoding='utf-8', newline='\n')
    print(f'\nЗаписано: {OUT.relative_to(ROOT)}, {OUT_DAYS.name}' + (' · законы не держатся: ' + '; '.join(v[0] for v in bad) if bad else ''))


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    main()
