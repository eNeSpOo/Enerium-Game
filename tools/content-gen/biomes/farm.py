# -*- coding: utf-8 -*-
"""Фарм старых биомов — калькулятор ADR-0044. Черновик · предложение · ждёт взгляда автора.

Слова автора, 01.10.2026: игрок «быстро на 2 цикле получит героев прокачает и будет ваншотать врагов первого цикла и второго цикла, из-за
чего будет очень легко фармить валюту и быстро, энергии у нас нет… анимации перехода это и есть наша стена». Принято: биомы 1–2 после
обучения — полные, взятый этаж не короче своего ритуала (RULES.floor.minMs), валюта — по циклу биома, старый биом — ферма ключей для
крафта, рунный ключ — с каждого босса с шансом и отмычками, уникальный в старом биоме — реже.

Что считает — добычу в минуту для двух случаев:
- «удар насмерть» в старом биоме — сверхсильный отряд (OP_SQUAD): он бьёт быстрее любого игрока, этаж для него — max(бой, ритуал);
- честный отряд в своём биоме — отряд обычного игрока: в цикле II — по дням калькулятора экономики и прогона темпа, в конце цикла — тот,
  что берёт стража последнего биома; циклы III–VI — оценка по образцам подъёма (cycle/climb.json, need: сила стража второго биома цикла).
Валюта — золото, дух, души; ключи ремёсел — с элит; уникальный и рунный ключ — с босса, в ожидании (шанс × срабатывания).

Законы (ADR-0044, «Следствия»):
- Р. Ритуал: время взятого этажа ядра — max(бой, минимум своего вида), проигранного — бой; сверхсильный отряд проходит каждый этаж.
- В1. Цикл II: удары насмерть по любому старому биому не дают валюты в минуту больше, чем свой биом у отряда конца цикла — по золоту,
  духу и душам.
- В2. Цикл II, тот же отряд в тот же день (обычный и увлечённый): свой биом не хуже старого по валюте в минуту.
- К1. Ключи ремёсел цикла I, которых не дало обучение (модель стока recipes.js, tutPath.restKeys), — не дольше дня одного слота фарма.
- К2. Ключи старых циклов в день (модель стока, oldKeys: развилки следующих циклов) — не дольше часа одного слота фарма.
- К3. Рунные ключи: у обычного в цикле II входов к стражам — не меньше цели §11 (~70 % капа); старые боссы за цикл дают ключей больше,
  чем свои, — старый биом и есть ферма; шанс с отмычками — не выше потолка §11.
- У1. Уникальный в старом биоме: шанс — доля обычного, меньше 100 %; ударами насмерть в минуту его меньше, чем у отряда конца цикла
  в своём биоме.
- В1 циклов III–VI: то же в каждом цикле — свой биом у отряда, которым обычный берёт стража второго биома цикла (калькулятор подъёма,
  cycle/climb-days.json: цикл героев, уровень и доблесть главного забега в последний день цикла), против ударов насмерть по каждому
  старому биому (биомы 1–4 и образцы прошлых циклов). Биомы 5–12 не собраны — образцы подъёма (cycle/climb-sim.js, ручка силы KX).

Подбор ритуала: по видам этажа — доли RITUAL_PCT от ритуала рядовых (ритуал растёт с добычей этажа); ритуал рядовых — наименьший шаг
STEP_MS, не короче зрелища — раунд, удар, выход врагов, «Этаж взят», полёт добычи (фазы показа RULES.floor.ritual), — при котором
держатся законы цикла II и В1 циклов III–VI. Ритуал обучения (короткие варианты биомов 1–2 в цикле I, RULES.floor.tutMs) подбор
не трогает: на нём выверен сценарий обучения (ADR-0040). Сколько ритуал удлиняет честную игру цикла II (забеги своего биома по дням) — печатается.

    python tools/content-gen/biomes/farm.py          # таблицы, farm.json, docs/content/биомы-и-фарм.md; затем node tools/content-gen/biomes/build.js
    python tools/content-gen/biomes/farm.py --check  # законы и свежесть: код выхода 1, если не держатся

Все числа — демонстрация, в начале файла; в функциях только алгоритм. Расчёт целочисленный: время — мс, шансы — б. п., доли — × 100.
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
SIM = HERE / 'farm-sim.js'
OUT = HERE / 'farm.json'
PACE = HERE / 'pace.json'
CLIMB = ROOT / 'tools' / 'content-gen' / 'cycle' / 'climb.json'
CLIMB_DAYS = ROOT / 'tools' / 'content-gen' / 'cycle' / 'climb-days.json'
DOC = ROOT / 'docs' / 'content' / 'биомы-и-фарм.md'
BP = 10000

# ======================= ДАННЫЕ =======================

# Ритуал по виду этажа — доля от ритуала рядовых, %: ритуал растёт с добычей этажа. Рядовые — враги выходят, падают, добыча летит;
# элита — ещё выход элиты с именем, тяжёлое падение, душа и ключ ремесла: вдвое дольше; босс и страж — выход, падение и большая добыча:
# втрое. Так стена встаёт там, где богаче добыча и где честный бой и так долог, а рядовые этажи честной игры ждут меньше: при ровных
# долях 100 / 150 / 200 % честная игра цикла II удлинялась на 5,4 %, при этих — на 3,9 % (farm.py, подбор — наименьший ритуал рядовых)
RITUAL_PCT = {'o': 100, 'e': 200, 'b': 300, 'guard': 300}
STEP_MS = 500                            # шаг подбора ритуала рядовых и округления по видам, мс
SEARCH_MS = 30000                        # потолок поиска ритуала рядовых
# Ритуал ядра против подбора: не короче подбора — иначе законы фарма не держатся, и не длиннее его больше чем на запас — стена не
# тяжелее нужного. Равенства не требуем (общий пересчёт 07.10.2026): подбор шагает по STEP_MS вслед за ручками силы биомов
# (cycle/climb.py, KX), а ритуал ядра двигает темп и сроки циклов — равенство держалось только узким окном ручки первого биома цикла III
RITUAL_SLACK_MS = 1500
# зрелище ритуала рядовых, если в ядре нет фаз показа (RULES.floor.ritual — задача «Бой AAA»): выход врагов, «Этаж взят», полёт добычи, мс
SHOW_FALLBACK = {'enterMs': 1200, 'takenMs': 300, 'lootMs': 900}
KINDS = ['o', 'e', 'b', 'guard']
# сверхсильный отряд «удара насмерть»: герои цикла VI на 1200-м — быстрее этаж не пройти: бой упирается в число ходов, а не в силу
OP_SQUAD = (6, 1200)
CUR = ['gold', 'spirit', 'souls']        # валюта закона В1 и В2
CUR_RU = {'gold': 'золото', 'spirit': 'дух', 'souls': 'души'}
OLD_II = ['b1', 'b2']                    # старые биомы цикла II — полные варианты биомов цикла I
OWN_II = ['b3', 'b4']
VIRT = {c: [f'v{c}A', f'v{c}B'] for c in (3, 4, 5, 6)}   # образцы подъёма циклов III–VI (cycle/climb-sim.js)
PLATEAU_II = 150                         # уровень, на котором обычный стоит большую часть цикла II (прогон темпа: 3–12-й дни) — отряд фарма ключей
REST_MAX_MIN = 180                       # К1: остаток ключей цикла I — не дольше дня одного слота обычного (3 ч забегов)
OLD_KEYS_MAX_MIN = 60                    # К2: ключи старых циклов на день — не дольше часа одного слота
RUNE_CAP_BP = 7000                       # К3: цель §11 — доход ключей ~70 % капа побед у рунных стражей
FARM_SLOT_HOURS = 3                      # К3: ферма старых боссов — один слот на часы обычного

# ======================= РАСЧЁТ =======================


def node(spec):
    c = json.loads(CLIMB.read_text(encoding='utf-8'))
    spec = dict(spec, kX=c['kX'], hpX=c['hpX'], pNext=c['pNext'])
    res = subprocess.run(['node', str(SIM), json.dumps(spec, ensure_ascii=False)], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        sys.exit(res.stderr)
    return json.loads(res.stdout)


def recipes_sink():
    js = ("globalThis.window=globalThis;require('./design/ui/recipes.js');const R=globalThis.EN_RECIPES;"
          "process.stdout.write(JSON.stringify({sink:R.stats.sink,enemies:R.drops.enemies.map(e=>({biome:e.biome,cyc:e.cyc,boss:e.boss}))}))")
    res = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if res.returncode:
        sys.exit('farm.py: не прочитать design/ui/recipes.js — ' + res.stderr)
    return json.loads(res.stdout)


def _pre(r, gap, total):
    """Разбор забега для быстрого времени: бои взятых этажей по виду — по возрастанию, с суммами с конца; проигранные и переходы — константа."""
    if '_pre' not in r:
        import bisect  # noqa: F401 — нужен в run_time
        by, const = {}, 0
        for i, (g, f, won) in enumerate(r['floors']):
            if won:
                by.setdefault(g, []).append(f)
            else:
                const += f
            if i + 1 < total:
                const += gap
        pre = {}
        for g, fs in by.items():
            fs.sort()
            suf = [0] * (len(fs) + 1)
            for i in range(len(fs) - 1, -1, -1):
                suf[i] = suf[i + 1] + fs[i]
            pre[g] = (fs, suf)
        r['_pre'] = (const, pre)
    return r['_pre']


def run_time(r, mins, gap, total):
    """Время забега r при ритуале mins: этажи [вид, бой, взят]; взятый этаж — max(бой, ритуал вида), проигранный — бой; переход — после
    каждого сыгранного этажа, кроме последнего этажа биома (как sim.js). Сумма max — по отсортированным боям: Σ бои ≥ m + m × число < m."""
    import bisect
    const, pre = _pre(r, gap, total)
    t = const
    for g, (fs, suf) in pre.items():
        m = mins[g]
        i = bisect.bisect_left(fs, m)
        t += m * i + suf[i]
    return t


def per_min(amount_x, ms):
    """В минуту × 100 — целым."""
    return amount_x * 100 * E.MINUTE_MS // ms if ms else 0


def rates(loot, ms):
    """Добыча забега в минуту × 100: валюта, ключи ремёсел, базовые; уникальный и рунный ключ — × 10 000 (ожидание × 100)."""
    return {
        'gold': per_min(loot['gold'], ms), 'spirit': per_min(loot['spirit'], ms), 'souls': per_min(loot['souls'], ms),
        'keys': per_min(loot['keys'], ms), 'base': per_min(loot.get('baseX100', 0), ms) // 100,
        'uniqueX': per_min(loot.get('uniqueBp', 0), ms), 'runeX': per_min(loot.get('runeBp', 0), ms),
    }


def deck_loot(d, rune_bp=None):
    """Добыча забега, где пали все (ожидание): уникальный и рунный ключ — шанс × срабатывание, б. п."""
    rb = d['runeKeyBp'] if rune_bp is None else rune_bp
    return {'gold': d['gold'], 'spirit': d['spirit'], 'souls': d['souls'], 'keys': d['keys'], 'baseX100': d['baseX100'],
            'uniqueBp': d['uniqueBp'], 'runeBp': rb * d['runeKeys']}


def run_loot(r, d):
    """Добыча честного забега: валюта и ключи — ядро; уникальный и рунный ключ — ожидание, если пал босс; базовые — ожидание за взятые этажи.
    Босс в осаде (дошёл и не взял, siegeRuns — забегов до его падения): фарм своего биома — забег за забегом, добыча босса приходит раз
    в siegeRuns забегов — её доля на забег. Осада не движется — добычи босса нет."""
    won = sum(1 for _, _, w in r['floors'] if w)
    base = d['baseX100'] * won // len(d['floors'])
    if r['bossDead']:
        n, extra = 1, {k: 0 for k in CUR}
    else:
        n = r.get('siegeRuns')
        extra = {k: d['boss'][k] // n for k in CUR} if n else {k: 0 for k in CUR}
    share = 1 if r['bossDead'] or n else 0
    return {'gold': r['gold'] + extra['gold'], 'spirit': r['spirit'] + extra['spirit'], 'souls': r['souls'] + extra['souls'], 'keys': r['keys'],
            'baseX100': base, 'uniqueBp': d['uniqueBp'] * share // (n or 1), 'runeBp': d['runeKeyBp'] * d['runeKeys'] * share // (n or 1)}


def pace_days():
    """Фронт биомов цикла II по дням у профилей прогона темпа: {профиль: {день: биом}}."""
    J = json.loads(PACE.read_text(encoding='utf-8'))
    out = {}
    for prof, B in J['rows']['days'].items():
        last = max((x.get('guard', {}).get('day', 0) for x in B.values()), default=0)
        front = {}
        for d in range(1, last + 1):
            for b in OWN_II:
                x = B.get(b)
                if x and x['from'] <= d and (not x.get('guard') or x['guard']['day'] >= d):
                    front[d] = b
                    break
        out[prof] = {'front': front, 'end': {b: B[b]['guard']['lvl'] for b in OWN_II if B.get(b, {}).get('guard')},
                     'kills': sum(1 for b in OWN_II if B.get(b, {}).get('boss'))}
    return out, J.get('sig')


def compute():
    climb = json.loads(CLIMB.read_text(encoding='utf-8'))
    pdays, pace_sig = pace_days()
    RS = recipes_sink()
    reg = E.PROFILES[0][0]
    # --- колоды: полные биомы 1–2, биомы 3–4, образцы III–VI; цикл игрока — II (уникальный биома цикла I — старый) ---
    D2 = {d['id']: d for d in node({'mode': 'deck', 'biomes': OLD_II + OWN_II, 'cyc': 2})['biomes']}
    # --- ритуал: сверхсильный отряд, этаж за этажом ---
    rit = node({'mode': 'ritual', 'biomes': OLD_II + OWN_II, 'k': OP_SQUAD[0], 'L': OP_SQUAD[1], 'cyc': 2})
    core_min, gap, drop = rit['minMs'], rit['gapMs'], rit['drop']
    # --- забеги: «удар насмерть» по старым, честный отряд по дням и в конце цикла II ---
    end_lvl = max(pdays[reg]['end'].values())
    days = {}
    for name, hours in E.PROFILES:
        lv = E.pace_of(hours)['lv']
        fr = pdays.get(name, {}).get('front', {})
        days[name] = [(d, lv[d - 1][0], fr[d]) for d in sorted(fr)]
    want = {(b, 1, end_lvl) for b in OWN_II} | {(b, OP_SQUAD[0], OP_SQUAD[1]) for b in OLD_II + OWN_II}
    for rows in days.values():
        for d, L, b in rows:
            want |= {(b, 1, L)} | {(o, 1, L) for o in OLD_II}
    want |= {(o, 1, PLATEAU_II) for o in OLD_II}
    runs = {(r['biome'], r['k'], r['L']): r for r in node({'mode': 'runs', 'list': [{'biome': b, 'k': k, 'L': L} for b, k, L in sorted(want)], 'cyc': 2})['runs']}
    # --- циклы III–VI: образцы подъёма — колоды, честный отряд конца цикла и удары насмерть по старым ---
    est = {}
    for c, own in VIRT.items():
        olds = OLD_II + OWN_II + [v for cc in range(3, c) for v in VIRT[cc]]
        Dc = {d['id']: d for d in node({'mode': 'deck', 'biomes': olds + own, 'cyc': c})['biomes']}
        k, L, v, j = end_squad(c)
        rr = node({'mode': 'runs', 'list': [{'biome': b, 'k': k, 'L': L, 'v': v, 'j': j} for b in own] + [{'biome': b, 'k': OP_SQUAD[0], 'L': OP_SQUAD[1]} for b in olds], 'cyc': c})['runs']
        est[c] = {'D': Dc, 'need': (k, L, v, j), 'own': {r['biome']: r for r in rr if r['biome'] in own}, 'op': {r['biome']: r for r in rr if r['biome'] in olds}, 'olds': olds}
    return {'D2': D2, 'rit': rit, 'core': core_min, 'gap': gap, 'drop': drop, 'show': rit.get('show'), 'runs': runs, 'days': days, 'end_lvl': end_lvl,
            'est': est, 'RS': RS, 'pdays': pdays, 'climb': climb, 'pace_sig': pace_sig, 'sig': rit.get('sig')}


def end_squad(c):
    """Отряд обычного, которым он берёт стража второго биома цикла c (калькулятор подъёма: climb-days.json, последний день цикла) —
    цикл героев, уровень, доблесть главного забега."""
    J = json.loads(CLIMB_DAYS.read_text(encoding='utf-8'))
    d = J['meta']['ends']['o'][str(c)]
    row = J['days']['o'][d - 1]
    return row[1], row[2], row[3], row[13]


def oneshot(D, r, mins, gap, rune_bp=None):
    """Удар насмерть: добыча колоды целиком, время — этажи сверхсильного отряда при ритуале mins."""
    t = run_time(r, mins, gap, len(D['floors']))
    return rates(deck_loot(D, rune_bp), t), t


def honest(D, r, mins, gap):
    t = run_time(r, mins, gap, len(D['floors']))
    return rates(run_loot(r, D), t), t


def best(rs):
    return {k: max(x[k] for x in rs) for k in rs[0]}


def laws_ii(X, mins):
    """Законы цикла II при ритуале mins: В1, В2, У1. Возвращает (держится ли, подробности)."""
    D2, runs, gap = X['D2'], X['runs'], X['gap']
    own = best([honest(D2[b], runs[(b, 1, X['end_lvl'])], mins, gap)[0] for b in OWN_II])
    old = {b: oneshot(D2[b], runs[(b,) + OP_SQUAD], mins, gap)[0] for b in OLD_II}
    v1 = {b: [k for k in CUR if old[b][k] > own[k]] for b in OLD_II}
    v2 = []
    for name, rows in X['days'].items():
        for d, L, fb in rows:
            o = honest(D2[fb], runs[(fb, 1, L)], mins, gap)[0]
            for b in OLD_II:
                h = honest(D2[b], runs[(b, 1, L)], mins, gap)[0]
                bad = [k for k in CUR if h[k] > o[k]]
                if bad:
                    v2.append((name, d, L, fb, b, bad))
    u1 = {b: old[b]['uniqueX'] < own['uniqueX'] for b in OLD_II}
    ok = all(not v for v in v1.values()) and not v2 and all(u1.values())
    return ok, {'own': own, 'old': old, 'v1': v1, 'v2': v2, 'u1': u1}


def show_min(X):
    """Зрелищный минимум ритуала рядовых: раунд, удар, выход врагов, «Этаж взят», полёт добычи — вверх до шага STEP_MS."""
    S = X['show'] or {}
    R = S.get('ritual') or SHOW_FALLBACK
    ms = S.get('roundGapMs', 0) + S.get('attackMs', 0) + R.get('enterMs', 0) + R.get('takenMs', 0) + R.get('lootMs', 0)
    return -(-ms // STEP_MS) * STEP_MS


def honest_runs(X):
    """Честная игра цикла II: забеги своего биома по дням у обычного и увлечённого — [(забег, этажей биома)]."""
    out = []
    for rows in X['days'].values():
        for d, L, fb in rows:
            out.append((X['runs'][(fb, 1, L)], len(X['D2'][fb]['floors'])))
    return out


def slowdown_bp(X, mins):
    """На сколько ритуал удлиняет честную игру цикла II: среднее по дням удлинение забега своего биома, б. п."""
    zero = {k: 0 for k in KINDS}
    hs = honest_runs(X)
    acc = 0
    for r, n in hs:
        t0 = run_time(r, zero, X['gap'], n)
        acc += (run_time(r, mins, X['gap'], n) - t0) * BP // t0
    return acc // len(hs) if hs else 0


def ritual_of(x):
    """Ритуал по видам этажа при ритуале рядовых x мс: доля RITUAL_PCT, вниз до шага STEP_MS."""
    return {g: x * p // 100 // STEP_MS * STEP_MS for g, p in RITUAL_PCT.items()}


def laws_late(X, mins):
    """Закон В1 в циклах III–VI: удары насмерть по любому старому биому не дают золота, духа и душ в минуту больше, чем свой биом у отряда,
    которым обычный берёт стража второго биома цикла. Возвращает (держится ли, худшие случаи по циклам)."""
    bad = {}
    for c, e in X['est'].items():
        own = best([honest(e['D'][b], e['own'][b], mins, X['gap'])[0] for b in VIRT[c]])
        for b in e['olds']:
            r = oneshot(e['D'][b], e['op'][b], mins, X['gap'])[0]
            ks = [k for k in CUR if r[k] > own[k]]
            if ks:
                bad.setdefault(c, []).append((b, ks))
    return not bad, bad


def pick(X):
    """Наименьший ритуал рядовых — шагом STEP_MS, не короче зрелища, — при котором держатся законы цикла II и закон В1 в циклах III–VI;
    по видам — доли RITUAL_PCT."""
    for x in range(show_min(X), SEARCH_MS + 1, STEP_MS):
        m = ritual_of(x)
        if laws_ii(X, m)[0] and laws_late(X, m)[0]:
            return m
    return None


def estimate(X, mins):
    """Циклы III–VI — оценка: свой биом у отряда конца цикла против ударов насмерть по старым."""
    out = {}
    for c, e in X['est'].items():
        own = best([honest(e['D'][b], e['own'][b], mins, X['gap'])[0] for b in VIRT[c]])
        worst = None
        for b in e['olds']:
            r, _ = oneshot(e['D'][b], e['op'][b], mins, X['gap'])
            for k in CUR:
                share = r[k] * 100 // own[k] if own[k] else 0
                if worst is None or share > worst[2]:
                    worst = (b, k, share)
        # во сколько раз длиннее нынешний ритуал должен быть здесь, чтобы закон держался, % — для следующей задачи (шаг 10 %)
        need_x = None
        for pct in range(100, 1001, 10):
            m = {k: mins[k] * pct // 100 for k in KINDS}
            own_x = best([honest(e['D'][b], e['own'][b], m, X['gap'])[0] for b in VIRT[c]])
            if all(oneshot(e['D'][b], e['op'][b], m, X['gap'])[0][k] <= own_x[k] for b in e['olds'] for k in CUR):
                need_x = pct
                break
        u_old = max(oneshot(e['D'][b], e['op'][b], mins, X['gap'])[0]['uniqueX'] for b in e['olds'])
        out[c] = {'need': e['need'], 'own': own, 'worst': worst, 'needX': need_x, 'uOld': u_old, 'uOwn': own['uniqueX']}
    return out


def keys_laws(X, mins):
    """К1–К3: ключи ремёсел старых циклов и рунные ключи."""
    D2, runs, gap, RS = X['D2'], X['runs'], X['gap'], X['RS']
    sink = {s['cyc']: s for s in RS['sink']}
    # фарм ключей цикла I отрядом плато цикла II — честно, с ритуалом: ключей ремёсел и боссов в минуту
    farm = {}
    for b in OLD_II:
        r = runs[(b, 1, PLATEAU_II)]
        rr, t = honest(D2[b], r, mins, gap)
        farm[b] = {'rates': rr, 'ms': t, 'boss': r['bossDead'], 'elites': r['kills']['e']}
    fast = max(OLD_II, key=lambda b: farm[b]['rates']['keys'])
    rest = sink[1]['tutPath']['restKeysX100'] if sink[1].get('tutPath') else 0
    k1_min = -(-rest // farm[fast]['rates']['keys']) if farm[fast]['rates']['keys'] else None   # ключей × 100 / ключей в минуту × 100
    # К2 — ключи старых циклов на день: удар насмерть по самому медленному старому биому цикла
    k2 = {}
    for c in range(2, 7):
        need = sink.get(c, {}).get('oldKeysX100', 0)
        olds = OLD_II if c == 2 else X['est'][c]['olds']
        Dd = D2 if c == 2 else X['est'][c]['D']
        opr = (lambda b: X['runs'][(b,) + OP_SQUAD]) if c == 2 else (lambda b: X['est'][c]['op'][b])
        slow = min(oneshot(Dd[b], opr(b), mins, gap)[0]['keys'] for b in olds)
        k2[c] = {'needX100': need, 'min': -(-need // slow) if slow else None}
    # К3 — рунные ключи цикла II у обычного: контракты и свои боссы (калькулятор экономики), ферма старых боссов одним слотом
    t = E.pace_of(E.PROFILES[0][1])
    R = E.rx()
    keys_day = t['keys'][1:E.CYCLE_DAYS + 1]
    need_day = R['cap'] * E.avg_price_x100(2)                         # ключей × 100 на весь кап побед
    share_bp = min(k * BP // need_day for k in keys_day) if keys_day else 0
    fb = max(OLD_II, key=lambda b: (farm[b]['boss'], -farm[b]['ms']))
    kills_day_x100 = FARM_SLOT_HOURS * E.HOUR_MS * 100 // farm[fb]['ms'] if farm[fb]['boss'] else 0
    rk = X['drop']['runeKeyBp'] * X['D2'][fb]['runeKeys']
    farm_keys_x100 = kills_day_x100 * rk // BP
    farm_max_x100 = kills_day_x100 * X['drop']['runeKeyMaxBp'] * X['D2'][fb]['runeKeys'] // BP
    own_kills = X['pdays'][E.PROFILES[0][0]]['kills']
    own_cycle_x100 = own_kills * X['drop']['runeKeyBp'] * 2 * 100 // BP     # свой биом цикла II: ключей за срабатывание — 2
    farm_cycle_x100 = farm_keys_x100 * E.CYCLE_DAYS
    return {'farm': farm, 'fast': fast, 'restX100': rest, 'k1min': k1_min, 'k2': k2, 'shareBp': share_bp, 'needDay': need_day,
            'farmBoss': fb, 'killsDayX100': kills_day_x100, 'farmKeysX100': farm_keys_x100, 'farmMaxX100': farm_max_x100,
            'ownCycleX100': own_cycle_x100, 'farmCycleX100': farm_cycle_x100, 'ownKills': own_kills}


def ritual_law(X):
    """Р: время взятого этажа ядра — max(бой, минимум вида), проигранного — бой; сверхсильный отряд берёт каждый этаж и стража."""
    bad = []
    for b in X['rit']['biomes']:
        for f in b['floors']:
            want = max(f['fight'], f['min']) if f['win'] else f['fight']
            if f['t'] != want or not f['win']:
                bad.append(f"{b['id']} · {f['f']}-й ({f['g']}): бой {f['fight']}, этаж {f['t']}, минимум {f['min']}, взят {f['win']}")
    return bad

# ======================= ВЫВОД =======================


def fmt(n):
    return E.fmt(n)


def plural(n, one, few, many):
    """«1 победа», «2 победы», «5 побед»."""
    a, b = n % 10, n % 100
    return one if a == 1 and b != 11 else few if 2 <= a <= 4 and not 12 <= b <= 14 else many


def x100(v):
    """Сотые — «12,34»; целое — без запятой."""
    s = '-' if v < 0 else ''
    v = abs(v)
    return f'{s}{v // 100}' + (f',{v % 100:02d}'.rstrip('0') if v % 100 else '')


def sec(ms):
    return x100(ms // 10) + ' с'


def mins_of(ms):
    return x100(ms * 100 // E.MINUTE_MS) + ' мин'


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
    out += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out)


NAMES = {'b1': 'Мастерская форм', 'b2': 'Подземный лес', 'b3': 'Библиотека Улариона', 'b4': 'Искусственный Стоун-Хейм'}


def bname(b):
    if b in NAMES:
        return NAMES[b]
    return f'образец {E.CYCLE_NAMES[int(b[1]) - 1]}{b[2]}'


def build(X):
    mins = pick(X)
    x = mins
    ok2, L2 = laws_ii(X, X['core'])
    est = estimate(X, X['core'])
    K = keys_laws(X, X['core'])
    rbad = ritual_law(X)
    D2, gap = X['D2'], X['gap']
    # максимум доли уникального, при котором У1 держится: доля × шанс / время удара насмерть < свой
    u_own = L2['own']['uniqueX']
    u_max = None
    for b in OLD_II:
        _, t = oneshot(D2[b], X['runs'][(b,) + OP_SQUAD], X['core'], gap)
        base = per_min(X['drop']['uniqueBp'], t)
        m = (u_own * 100 - 1) // base if base else 100
        u_max = m if u_max is None else min(u_max, m)
    v = []
    v.append({'what': 'Р. Ритуал этажа', 'goal': 'взятый этаж — max(бой, минимум вида), сверхсильный отряд берёт всё',
              'got': 'держится' if not rbad else '; '.join(rbad[:3]), 'ok': not rbad})
    v.append({'what': 'Ритуал в ядре — не короче подбора калькулятора', 'goal': f'RULES.floor.minMs — от подбора до подбора + {sec(RITUAL_SLACK_MS)} у рядовых, по видам — те же доли',
              'got': f"ядро {X['core']}, подбор {mins}",
              'ok': mins is not None and mins['o'] <= X['core']['o'] <= mins['o'] + RITUAL_SLACK_MS and all(X['core'][k] == ritual_of(X['core']['o'])[k] for k in KINDS)})
    bad1 = {b: k for b, k in L2['v1'].items() if k}
    v.append({'what': 'В1. Цикл II: удары насмерть по старым биомам не выгоднее своего', 'goal': 'золото, дух, души в минуту — не больше, чем у отряда конца цикла в своём',
              'got': 'держится' if not bad1 else '; '.join(f'{bname(b)}: ' + ', '.join(CUR_RU[k] for k in ks) for b, ks in bad1.items()), 'ok': not bad1})
    okl, badl = laws_late(X, X['core'])
    v.append({'what': 'В1. Циклы III–VI: удары насмерть по старым биомам не выгоднее своего',
              'goal': 'в каждом цикле золото, дух, души в минуту — не больше, чем у отряда, которым обычный берёт стража второго биома, в своём',
              'got': ', '.join(f"{E.CYCLE_NAMES[c - 1]} — худший {bname(e['worst'][0])}: {CUR_RU[e['worst'][1]]} {e['worst'][2]} % своего" for c, e in est.items())
              + ('' if okl else '; не держится: ' + '; '.join(f"{E.CYCLE_NAMES[c - 1]}: " + ', '.join(f'{bname(b)} ({", ".join(CUR_RU[k] for k in ks)})' for b, ks in xs[:2]) for c, xs in badl.items())),
              'ok': okl})
    v.append({'what': 'В2. Цикл II: тот же отряд в тот же день', 'goal': 'свой биом не хуже старого — обычный и увлечённый',
              'got': 'держится' if not L2['v2'] else '; '.join(f'{n}, {d}-й день, {L}-й: {bname(b)} лучше по ' + ', '.join(CUR_RU[k] for k in ks) for n, d, L, fb, b, ks in L2['v2'][:3]), 'ok': not L2['v2']})
    k1ok = K['k1min'] is not None and K['k1min'] <= REST_MAX_MIN
    v.append({'what': 'К1. Ключи ремёсел цикла I после обучения', 'goal': f'не дольше {REST_MAX_MIN} мин одного слота',
              'got': f"{x100(K['restX100'])} ключей — {K['k1min']} мин фарма ({bname(K['fast'])}, отряд {PLATEAU_II}-го)" if K['k1min'] is not None else 'нет фарма', 'ok': k1ok})
    k2bad = [c for c, y in K['k2'].items() if y['min'] is None or y['min'] > OLD_KEYS_MAX_MIN]
    v.append({'what': 'К2. Ключи старых циклов на день — развилки следующих', 'goal': f'не дольше {OLD_KEYS_MAX_MIN} мин одного слота',
              'got': ', '.join(f"{E.CYCLE_NAMES[c - 1]} — {y['min']} мин" for c, y in K['k2'].items()), 'ok': not k2bad})
    k3ok = K['shareBp'] >= RUNE_CAP_BP and K['farmCycleX100'] > K['ownCycleX100'] and X['drop']['runeKeyBp'] < X['drop']['runeKeyMaxBp'] <= RUNE_MAX_BP
    v.append({'what': 'К3. Рунные ключи цикла II', 'goal': f'входов — не меньше {RUNE_CAP_BP // 100} % капа; старые боссы дают больше своих; шанс — до {RUNE_MAX_BP // 100} %',
              'got': f"контракты и свои боссы — {K['shareBp'] // 100} % капа; фарм боссов — {bname(K['farmBoss'])}: +{x100(K['farmKeysX100'])} в день, за цикл {x100(K['farmCycleX100'])} против {x100(K['ownCycleX100'])} со своих",
              'ok': k3ok})
    u1ok = X['drop']['uniqueOldPct'] < 100 and all(L2['u1'].values()) and u_max is not None and X['drop']['uniqueOldPct'] <= u_max
    v.append({'what': 'У1. Уникальный в старом биоме реже', 'goal': 'доля обычного шанса < 100 %; в минуту — меньше, чем в своём у отряда конца цикла',
              'got': f"{X['drop']['uniqueOldPct']} % обычного; закон допускает до {u_max} %", 'ok': u1ok})
    md = markdown(X, x, mins, L2, est, K, u_max)
    return {'pick': x, 'mins': mins, 'slow': slowdown_bp(X, X['core']), 'verdict': v, 'md': md,
            'est': {str(c): {k: e[k] for k in ('need', 'needX', 'worst')} for c, e in est.items()}}


RUNE_MAX_BP = 2500                       # потолок шанса рунного ключа с отмычками — §11 («10 % → 25 % с артефактами»)


def markdown(X, x, mins, L2, est, K, u_max):
    D2, gap, runs = X['D2'], X['gap'], X['runs']
    parts = {}
    zero = {k: 0 for k in KINDS}
    parts['ritual'] = table(['Вид этажа', 'Ритуал, ядро', 'Подбор калькулятора'],
                            [[{'o': 'рядовые', 'e': 'элита', 'b': 'босс', 'guard': 'рунный страж'}[g], sec(X['core'][g]), sec(x[g]) if x else 'не найден'] for g in KINDS]) + \
        f"\n\nПереход между этажами — {sec(gap)} (`RULES.floor.gapMs`). Рядовые — не короче зрелища: раунд, удар, выход врагов, «Этаж взят», полёт добычи — {sec(show_min(X))}. " + \
        f"Подбор — наименьший ритуал рядовых шагом {sec(STEP_MS)}, при котором держатся законы цикла II и закон В1 циклов III–VI; по виду — доли от ритуала рядовых: элита {RITUAL_PCT['e']} %, босс и страж {RITUAL_PCT['b']} % — " + \
        f"ритуал растёт с добычей этажа. Честная игра цикла II — забеги своего биома у обычного и увлечённого по дням — с ним длиннее в среднем на {x100(slowdown_bp(X, X['core']))} %."
    rows = []
    own = L2['own']
    for b in OLD_II:
        r, t = oneshot(D2[b], runs[(b,) + OP_SQUAD], X['core'], gap)
        r0, t0 = oneshot(D2[b], runs[(b,) + OP_SQUAD], zero, gap)
        rows.append([f'{bname(b)} · удар насмерть', mins_of(t0) + ' → ' + mins_of(t)] + [x100(r0[k]) + ' → ' + x100(r[k]) for k in CUR] +
                    [x100(r['keys']), x100(r['uniqueX'] // 10) + ' ‰', x100(r['runeX'] // 10) + ' ‰'])
    for b in OWN_II:
        r, t = honest(D2[b], runs[(b, 1, X['end_lvl'])], X['core'], gap)
        r0, t0 = honest(D2[b], runs[(b, 1, X['end_lvl'])], zero, gap)
        rows.append([f"{bname(b)} · свой, отряд {X['end_lvl']}-го", mins_of(t0) + ' → ' + mins_of(t)] + [x100(r0[k]) + ' → ' + x100(r[k]) for k in CUR] +
                    [x100(r['keys']), x100(r['uniqueX'] // 10) + ' ‰', x100(r['runeX'] // 10) + ' ‰'])
    parts['minute'] = table(['Биом и случай', 'Забег: без ритуала → с ритуалом', 'Золото в мин', 'Дух в мин', 'Души в мин', 'Ключей ремёсел в мин', 'Уникальный в мин', 'Рунный ключ в мин'], rows) + \
        f"\n\nУдар насмерть — отряд героев цикла {E.CYCLE_NAMES[OP_SQUAD[0] - 1]} на {OP_SQUAD[1]}-м: быстрее этаж не пройти — бой упирается в число ходов. Свой — отряд обычного, что берёт стража последнего биома цикла II (прогон темпа). Уникальный и рунный ключ — ожидание: шанс × срабатывания, в тысячных долях в минуту."
    drows = []
    for name, rows_ in X['days'].items():
        for d, L, fb in rows_:
            o = honest(D2[fb], runs[(fb, 1, L)], X['core'], gap)[0]
            h = {b: honest(D2[b], runs[(b, 1, L)], X['core'], gap)[0] for b in OLD_II}
            drows.append([name, d, L, bname(fb), x100(o['spirit']), x100(h['b1']['spirit']), x100(h['b2']['spirit']), x100(o['souls']), x100(h['b1']['souls']), x100(h['b2']['souls'])])
    parts['days'] = table(['Профиль', 'День', 'Уровень', 'Свой биом', 'Дух: свой', 'Дух: Мастерская', 'Дух: лес', 'Души: свой', 'Души: Мастерская', 'Души: лес'], drows)
    erows = []
    for c, e in est.items():
        w = e['worst']
        k, L, vv, jj = e['need']
        erows.append([E.CYCLE_NAMES[c - 1], f"герои цикла {E.CYCLE_NAMES[k - 1]}, {L}-й, доблесть {vv}" + (f', у {jj} — {vv + 1}' if jj else ''), x100(e['own']['gold']), x100(e['own']['spirit']), x100(e['own']['souls']),
                      f"{bname(w[0])}: {CUR_RU[w[1]]} — {w[2]} %", ('×' + x100(e['needX'])) if e['needX'] is not None else 'не найден', 'реже' if e['uOld'] < e['uOwn'] else '**чаще**'])
    parts['est'] = table(['Цикл', 'Отряд, которым обычный берёт стража второго биома', 'Свой: золото в мин', 'Свой: дух в мин', 'Свой: души в мин',
                          'Худший старый: удар насмерть, % своего', 'Ритуал длиннее, чтобы закон держался', 'Уникальный в старом'], erows) + \
        '\n\nОтряд — калькулятор подъёма (`cycle/climb-days.json`, последний день цикла); биомы 5–12 не собраны — образцы подъёма с ручкой силы `KX` ' + \
        '(`cycle/climb.py`). Больше 100 % — удары насмерть по старому биому выгоднее своего; закон В1 циклов III–VI — в проверке `farm.py --check`, ритуал этажа подобран под него.'
    krows = [[bname(b), mins_of(K['farm'][b]['ms']), K['farm'][b]['elites'], x100(K['farm'][b]['rates']['keys']), 'да' if K['farm'][b]['boss'] else 'нет'] for b in OLD_II]
    parts['keys'] = table(['Старый биом, отряд обычного на плато цикла II', 'Забег', 'Элит за забег', 'Ключей ремёсел в мин', 'Босс пал'], krows) + \
        f"\n\n- Ключей ремёсел цикла I, которых не дало обучение (модель стока): {x100(K['restX100'])} — это {K['k1min']} мин такого фарма.\n" + \
        '- Ключи старых циклов на день (развилки следующих циклов, модель стока) — минут удара насмерть по самому медленному старому биому: ' + \
        ', '.join(f"{E.CYCLE_NAMES[c - 1]} — {x100(y['needX100'])} ключа, {y['min']} мин" for c, y in K['k2'].items()) + '.\n' + \
        f"- Рунные ключи у обычного в цикле II: контракты и свои боссы — {K['shareBp'] // 100} % капа побед у стражей (цель §11 — около {RUNE_CAP_BP // 100} %). " + \
        f"Фарм боссов — {bname(K['farmBoss'])}, один слот: {x100(K['killsDayX100'])} боссов в день, +{x100(K['farmKeysX100'])} ключа при {X['drop']['runeKeyBp'] // 100} %, " + \
        f"+{x100(K['farmMaxX100'])} при {X['drop']['runeKeyMaxBp'] // 100} % с отмычками; за цикл — {x100(K['farmCycleX100'])} ключа против {x100(K['ownCycleX100'])} со своих боссов ({K['ownKills']} {plural(K['ownKills'], 'победа', 'победы', 'побед')} над ними за цикл)."
    parts['unique'] = f"Шанс уникального с босса — {X['drop']['uniqueBp'] // 100} %; в старом биоме — {X['drop']['uniqueOldPct']} % от него. Закон «реже, чем в своём, даже ударами насмерть» допускает до {u_max} %."
    return parts


def doc_write(parts, check):
    text = DOC.read_text(encoding='utf-8')
    for k, body in parts.items():
        a, b = f'<!-- @таблица farm-{k} — вывод tools/content-gen/biomes/farm.py, руками не править -->', f'<!-- /таблица farm-{k} -->'
        i, j = text.find(a), text.find(b)
        if i < 0 or j < 0:
            return False if check else sys.exit(f'farm.py: в {DOC.name} нет меток таблицы farm-{k}')
        text = text[:i + len(a)] + '\n' + body + '\n' + text[j:]
    if check:
        return text == DOC.read_text(encoding='utf-8')
    DOC.write_text(text, encoding='utf-8', newline='\n')
    return True


def main(check):
    X = compute()
    res = build(X)
    payload = {'sig': X['sig'], 'paceSig': X['pace_sig'], 'minMs': X['core'], 'pick': res['pick'], 'pickMs': res['mins'], 'gapMs': X['gap'],
               'slowBp': res['slow'], 'drop': X['drop'], 'verdict': res['verdict'], 'est': res['est'], 'md': res['md']}
    text = json.dumps(payload, ensure_ascii=False, indent=1, sort_keys=True) + '\n'
    for x in res['verdict']:
        print(('✓ ' if x['ok'] else '✗ ') + f"{x['what']}: {x['got']} (цель — {x['goal']})")
    if check:
        old = OUT.read_text(encoding='utf-8') if OUT.exists() else ''
        fresh = old == text
        print(('✓ ' if fresh else '✗ ') + 'farm.json свежий' + ('' if fresh else ' — перезапустить farm.py, затем biomes/build.js'))
        dfresh = doc_write(res['md'], True)
        print(('✓ ' if dfresh else '✗ ') + 'таблицы docs/content/биомы-и-фарм.md свежие')
        return 0 if all(x['ok'] for x in res['verdict']) and fresh and dfresh else 1
    OUT.write_text(text, encoding='utf-8', newline='\n')
    doc_write(res['md'], False)
    print('\n\n'.join(f'{k}:\n{v}' for k, v in res['md'].items()))
    print(f"\nfarm.json — подбор ритуала рядовых {res['pick']} мс. Теперь: node tools/content-gen/biomes/build.js")
    return 0


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main('--check' in sys.argv))
