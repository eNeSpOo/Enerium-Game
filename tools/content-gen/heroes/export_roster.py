# -*- coding: utf-8 -*-
"""Выгружает состав героев игры в design/ui/roster.js для прототипа «Свет снизу».

Исходники скрипт только читает:
- docs/content/герои/состав-героев.csv — одна строка на героя (ADR-0019, ADR-0021 — ADR-0024). Столбцы — по имени,
  лишние не мешают. Столбец «неприязнь» у героев Эхо подхватывается, когда появится; до того неприязнь — к расе недели;
- docs/content/герои/главы/цикл-N.md — тексты глав: «## <id> · <имя>», затем «### <номер> · <заголовок>» и текст.
  Нет файла — в выгрузке только заголовки глав из CSV;
- docs/content/герои/герои.csv — ордены черновиков: герой черновика сохраняет орден черновика, донатный — только свой сет;
- docs/content/сет-бонусы.md — механики орденов и N по ступеням (таблицы «Механики и капы», С2 и С6);
- docs/content/герои/состав-героев.md — бонусы донатных сетов из таблицы автора и древние цивилизации недель Эхо (ADR-0024).

roster.js руками не править: после правки состава, глав или сет-бонусов — перезапустить.

    python tools/content-gen/heroes/export_roster.py

Все числа — демонстрация и лежат в блоке ДАННЫЕ, в функциях только алгоритм.
Только целые: доли — в базисных пунктах, 10 000 = 100 %.
"""
import csv
import html
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
HEROES = REPO / 'docs' / 'content' / 'герои'
ROSTER_CSV = HEROES / 'состав-героев.csv'
ROSTER_MD = HEROES / 'состав-героев.md'
DRAFT_CSV = HEROES / 'герои.csv'
CHAPTERS = HEROES / 'главы'
SET_BONUS = REPO / 'docs' / 'content' / 'сет-бонусы.md'
OUT = REPO / 'design' / 'ui' / 'roster.js'

# ======================= ДАННЫЕ =======================

BP = 10000
ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']
RARITY = ['обычная', 'редкая', 'уникальная', 'эпическая', 'древняя', 'первородная', 'вневременная']   # §3.1
CLASSES = ['танк', 'лекарь', 'контроль', 'маг ДД', 'физ ДД силы', 'физ ДД ловкости', 'фармер']        # ADR-0022: контроль — один класс
SCHOOLS = ['Огонь', 'Земля', 'Воздух', 'Вода', 'Время', 'Свет', 'Тьма', 'без стихии']
SOURCES = ['gold', 'donat', 'roulette', 'echo', 'craft']       # порядок в фильтрах и таблицах
SET_SIZE = 5                                                   # ADR-0021, §30: в ордене и донатном сете — пятеро героев
REQUIRED = ['id', 'имя', 'раса', 'класс', 'школа', 'редкость', 'цикл', 'источник', 'максимум доблести',
            'из черновика', 'кто он', 'главы']

# недели Эхо — круг из девяти рас (§1): раса, как её пишет «источник» после «Эхо: неделя», основа слова для «неприязни»
WEEKS = [('Люди', 'людей', 'люд'), ('Дворфы', 'дворфов', 'дворф'), ('Эльфы', 'эльфов', 'эльф'), ('Звери', 'зверей', 'звер'),
         ('Саганы', 'саганов', 'саган'), ('Аппараты', 'аппаратов', 'аппарат'), ('Искажённые', 'искажённых', 'искаж'),
         ('Нежить', 'нежити', 'нежит'), ('Забытые', 'Забытых', 'забыт')]

# ордены черновиков → имя в игре (лор-аудит, состав героев)
ORDER_NAMES = {'Орден Багровой Арены': 'Орден Песка Сеймура', 'Орден Равного Суда': 'Орден Выслушавших'}
# братства черновиков, если станут орденами, — предложение, ждёт автора (состав героев, «Что стало с героями черновиков»).
# Братства, ставшие донатными сетами, сюда не входят: донатный герой орден черновика не наследует
BROTHERHOODS = {'Хранители Песочных Часов': 'Орден Ничьих Часов', 'Ключники Безвременья': 'Орден Сердца Машины',
                'Прозревшие': 'Орден Света Снизу', 'Собиратели Осколков': 'Искатели'}

RULES = {
    'bp': BP,
    # ADR-0023, «Второй круг», п. 1: k-й купленный герой цикла c стоит first × c × (1 + step × (k − 1)); preview — сколько цен показать вперёд
    'gold': {'first': 10000, 'stepBp': 3000, 'preview': 3},
    'aversionBp': 2000,                          # ADR-0024, п. 4: +20 % урона по расе своей недели — демонстрация
    'tierBySum': [[15, 3], [10, 2], [5, 1]],     # ADR-0022, п. 6: сумма личных максимумов пятерых от — ступеней
    'tierNeed': [1, 3],                          # §30: ступень I — один участник с доблестью от tierValor, II — трое
    'tierValor': 1,                              # §30; ступень III — все пятеро на личных максимумах
    'dust': [[1, 5], [2, 10], [4, 20], [8, 40], [16, 80], [32, 160], [64, 320]],   # §15.3: прах за осколок и цена осколка в цикле I, × номер цикла
    'spin': 100,                                 # §15.1: прокрутка возрождения душ — 100 Энериума
    # Заглушки прототипа: чисел нет в источниках (§15.1 «таблица не утверждена», ADR-0021 — только «цена растёт»). Ждут автора
    'stub': {
        'shards': 50,                            # осколков на героя — как у Лаэйры в прежнем прототипе
        'spinShards': 10,                        # осколков за прокрутку
        'activateSouls': 800,                    # активация героя душами — как в прежнем прототипе
        'donatPrice': [200, 300, 400, 500, 600],  # Энериум за 1-го … 5-го героя донатного сета
    },
}

# ======================= РАЗБОР =======================

warns, errs = [], []


def esc(text):
    """HTML-экранирование — с кавычками: строки попадают и в атрибуты — и простая разметка глав: **жирный**, *курсив*."""
    t = html.escape(text.strip(), quote=True)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    return re.sub(r'(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])', r'<i>\1</i>', t)


def plain(text):
    """Заголовок для сравнения: без кавычек и регистра."""
    return re.sub(r'[«»"„“]', '', text).strip().casefold()


def cells(line):
    line = line.strip()
    return [c.strip() for c in line.strip('|').split('|')] if line.startswith('|') else []


def md_table(text, head):
    """Строки markdown-таблицы, чей заголовок начинается ячейками head. Нет таблицы — пустой список."""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if cells(line)[:len(head)] == head:
            rows = []
            for row in lines[i + 2:]:
                if not row.strip().startswith('|'):
                    break
                rows.append(cells(row))
            return rows
    return []


def ints(text):
    """«500 / 300» → [500, 300]."""
    return [int(re.sub(r'\D', '', x)) for x in text.split('/') if re.sub(r'\D', '', x)]


def source(raw, hid):
    """Столбец «источник» → поля героя."""
    m = re.match(r'^золото, №(\d+)( — обучение)?$', raw)
    if m:
        return {'src': 'gold', 'no': int(m.group(1)), 'tut': bool(m.group(2))}
    if raw == 'рулетка':
        return {'src': 'roulette'}
    if raw == 'крафт':
        return {'src': 'craft'}
    m = re.match(r'^Эхо: неделя (.+)$', raw)
    if m:
        week = next((w for w in WEEKS if w[1].casefold() == m.group(1).strip().casefold()), None)
        if not week:
            errs.append(f'{hid}: неделя Эхо «{m.group(1)}» не из круга девяти рас')
            return {'src': 'echo', 'week': m.group(1)}
        return {'src': 'echo', 'week': week[0]}
    m = re.match(r'^донат: сет ([IVX]+), (\d)-й$', raw)
    if m and m.group(1) in ROMAN:
        return {'src': 'donat', 'dcyc': ROMAN.index(m.group(1)) + 1, 'place': int(m.group(2))}
    errs.append(f'{hid}: источник «{raw}» не разобран')
    return {'src': ''}


def aversion(raw, week):
    """Расовая неприязнь героя Эхо (ADR-0024): столбец «неприязнь», иначе — раса его недели. Процент в столбце — только если указан."""
    raw = (raw or '').strip()
    if not raw:
        return {'race': week} if week else None
    low = raw.casefold()
    hit = next((w[0] for w in WEEKS if w[2] in low or w[0].casefold() in low), None)
    out = {'race': hit} if hit else {'text': esc(raw)}
    m = re.search(r'(\d+)\s*%', raw)
    if m:
        out['bp'] = int(m.group(1)) * BP // 100
    return out


def base_classes(raw):
    """«лекарь / контроль (на дебаффы)» → ['лекарь', 'контроль']."""
    out = []
    for part in raw.split(' / '):
        base = re.sub(r'\s*\(.+\)$', '', part.strip())
        if base not in CLASSES:
            warns.append(f'класс «{part}» не из семи классов')
        out.append(base)
    return out


def read_chapters(roster):
    """Тексты глав из главы/цикл-N.md. Возвращает {id: {номер: [заголовок, [абзацы]]}}, заметки команды и найденные файлы."""
    out, notes, files = {}, {}, []
    for n in range(1, len(ROMAN) + 1):
        path = CHAPTERS / f'цикл-{n}.md'
        if not path.exists():
            continue
        files.append(path.name)
        hero, ch, brk = None, None, True
        for raw in path.read_text(encoding='utf-8-sig').splitlines():
            line = raw.rstrip()
            m = re.match(r'^##\s+(c\d-\d\d)\s*·\s*(.+?)\s*$', line)
            if m:
                hero, ch = m.group(1), None
                if hero not in roster:
                    warns.append(f'{path.name}: героя {hero} нет в составе')
                    hero = None
                elif plain(roster[hero]['имя']) not in plain(m.group(2)):
                    warns.append(f'{path.name}: {hero} — «{m.group(2)}», в составе «{roster[hero]["имя"]}»')
                continue
            if re.match(r'^#{1,2}\s', line):
                hero = ch = None
                continue
            m = re.match(r'^###\s+(?:Глава\s+)?(\d+|[IVX]+)\s*[·.:—-]\s*(.+?)\s*$', line)
            if m and hero:
                no = int(m.group(1)) if m.group(1).isdigit() else ROMAN.index(m.group(1)) + 1 if m.group(1) in ROMAN else 0
                ch = [re.sub(r'^[«"]|[»"]$', '', m.group(2).strip()), []]
                if not 1 <= no <= int(roster[hero]['максимум доблести']):
                    warns.append(f'{path.name}: {hero}, глава {m.group(1)} вне максимума доблести')
                    ch = None
                    continue
                if no in out.get(hero, {}):
                    warns.append(f'{path.name}: {hero}, глава {no} повторяется')
                out.setdefault(hero, {})[no] = ch
                brk = True
                continue
            if line.startswith('#'):
                ch = None
                continue
            if not ch:
                continue
            text = re.sub(r'^>\s?', '', line.strip()).strip()
            if re.match(r'^[*_]*Для команды', text):
                notes.setdefault(hero, []).append(esc(re.sub(r'^[*_]*Для команды[.:]?[*_]*[.:]?\s*', '', text)))
                continue
            if not text:
                brk = True
            elif brk or not ch[1]:
                ch[1].append(text)
                brk = False
            else:
                ch[1][-1] += ' ' + text
    for hero, chs in out.items():
        titles = roster[hero]['главы'].split(' | ')
        for no, (title, paras) in chs.items():
            if plain(title) != plain(titles[no - 1]):
                warns.append(f'{hero}, глава {no}: «{title}», в составе «{titles[no - 1]}»')
            chs[no] = [esc(title), [esc(p) for p in paras]]
    return out, notes, files


def bonus_tables():
    """Механики и N по ступеням: ордены — «Механики и капы» и С2, донатные сеты — С6 и таблица автора в составе героев."""
    orders, donat = {}, {}
    text = SET_BONUS.read_text(encoding='utf-8') if SET_BONUS.exists() else ''
    for r in md_table(text, ['№', 'Сет, цикл', 'Механика', 'Капы']):
        name = re.sub(r',\s*[IVX]+$', '', r[1])
        orders.setdefault(name, {})['bonus'] = esc(r[2])
        orders[name]['caps'] = esc(r[3])
    for r in md_table(text, ['№', 'Сет', 'Бонус', 'Сумма → ступеней', 'N по ступеням']):
        orders.setdefault(r[1], {}).setdefault('bonus', esc(r[2]))
        orders[r[1]]['n'] = ints(r[4])
    for r in md_table(text, ['Сет', 'Пятеро', 'Бонус', 'Сумма → ступеней', 'N по ступеням']):
        m = re.match(r'^([IVX]+)\s', r[0])
        if m and m.group(1) in ROMAN and ROMAN.index(m.group(1)) + 1 not in donat:
            donat[ROMAN.index(m.group(1)) + 1] = {'short': esc(r[2]), 'n': ints(r[4])}
    md = ROSTER_MD.read_text(encoding='utf-8') if ROSTER_MD.exists() else ''
    for r in md_table(md, ['Сет', 'Имя', 'Максимум', 'Сумма', 'Ступеней', 'Бонус — из таблицы автора']):
        if r[0] in ROMAN:
            donat.setdefault(ROMAN.index(r[0]) + 1, {}).update(name=r[1], bonus=esc(r[5]))
    if not orders:
        warns.append('сет-бонусы.md: таблицы орденов не найдены — бонусы орденов пустые')
    if not donat:
        warns.append('таблицы донатных сетов не найдены — бонусы донатных сетов пустые')
    return orders, donat


def civilizations():
    """Древние цивилизации недель Эхо (ADR-0024): раса недели → имя, нашествие и тематика. Тематика — только команде."""
    md = ROSTER_MD.read_text(encoding='utf-8') if ROSTER_MD.exists() else ''
    out = {r[0]: {'civ': esc(r[1]), 'theme': esc(r[2]), 'raid': esc(r[3])}
           for r in md_table(md, ['Неделя', 'Цивилизация', 'Тематика', 'Нашествие']) if len(r) >= 4}
    if not out:
        warns.append('состав-героев.md: таблица древних цивилизаций не найдена — у недель Эхо только раса')
    return out


def tiers_of(total):
    return next((t for lo, t in RULES['tierBySum'] if total >= lo), 0)


def short(name):
    return name.replace('Орден ', '', 1)


# ======================= СБОРКА =======================

def build():
    rows = list(csv.DictReader(ROSTER_CSV.open(encoding='utf-8-sig')))
    missing = [c for c in REQUIRED if c not in (rows[0].keys() if rows else [])]
    if missing:
        errs.append('в составе нет столбцов: ' + ', '.join(missing))
        return None
    roster = {r['id']: r for r in rows}
    if len(roster) != len(rows):
        errs.append('id героев повторяются')
    draft = {r['id']: r for r in csv.DictReader(DRAFT_CSV.open(encoding='utf-8-sig'))} if DRAFT_CSV.exists() else {}
    draft_no = {r['орден']: r['id'][1:3] for r in draft.values()}          # имя сета черновика → его номер: h02_1 → 02
    chapters, ch_notes, ch_files = read_chapters(roster)
    b_orders, b_donat = bonus_tables()

    heroes, sets = [], {}

    def draft_set(name):
        """Сет черновика → ключ и запись ордена; братство — предложение."""
        key = 'o' + draft_no[name]
        if key not in sets:
            shown = ORDER_NAMES.get(name, BROTHERHOODS.get(name, name))
            b = b_orders.get(short(shown), {})
            sets[key] = {'key': key, 'kind': 'order', 'name': shown, 'proposed': name in BROTHERHOODS,
                         'draft': name, 'members': [], 'bonus': b.get('bonus', ''), 'caps': b.get('caps', ''), 'n': b.get('n', [])}
            if not sets[key]['proposed'] and not b:
                warns.append(f'бонус ордена «{shown}» не найден в сет-бонусах')
        return key

    for r in rows:
        hid = r['id']
        src = source(r['источник'].strip(), hid)
        if r['редкость'] not in RARITY:
            errs.append(f'{hid}: редкость «{r["редкость"]}»')
            continue
        if r['цикл'] not in ROMAN:
            errs.append(f'{hid}: цикл «{r["цикл"]}»')
            continue
        if not r['максимум доблести'].isdigit():
            errs.append(f'{hid}: максимум доблести «{r["максимум доблести"]}»')
            continue
        if r['школа'] not in SCHOOLS:
            warns.append(f'{hid}: школа «{r["школа"]}»')
        titles = [t.strip() for t in r['главы'].split(' | ')]
        max_v = int(r['максимум доблести'])
        if len(titles) != max_v:
            warns.append(f'{hid}: глав {len(titles)}, максимум доблести {max_v}')
        h = {'id': hid, 'n': esc(r['имя']), 'race': esc(r['раса']), 'cls': esc(r['класс']), 'cl': base_classes(r['класс']),
             'sch': r['школа'], 'r': RARITY.index(r['редкость']) + 1, 'c': ROMAN.index(r['цикл']) + 1, 'maxV': max_v,
             'who': esc(r['кто он']), 'chT': [esc(t) for t in titles], **{k: v for k, v in src.items() if k != 'week'}}
        if src.get('week'):
            h['week'] = src['week']
        av = aversion(r.get('неприязнь'), src.get('week'))
        if av:
            h['avers'] = av
            if av.get('race') and av['race'] not in [w[0] for w in WEEKS]:
                warns.append(f'{hid}: неприязнь к «{av["race"]}»')
        ch = chapters.get(hid)
        if ch:
            h['ch'] = [ch.get(i + 1) for i in range(max_v)]
        team = {}
        d = r['из черновика'].strip()
        if d:
            team['draft'] = d
            if d not in draft:
                warns.append(f'{hid}: черновика {d} нет в герои.csv')
            elif src['src'] != 'donat':      # донатный герой орден черновика не наследует (сет-бонусы, «Составы сетов»)
                name = draft[d]['орден']
                if draft[d]['тип сета'] == 'братство' and name not in BROTHERHOODS:
                    warns.append(f'{hid}: братство черновика «{name}» без имени ордена — не выгружено')
                else:
                    team['sets'] = [draft_set(name)]
        also = (r.get('также в сете') or '').strip()
        if also:
            if also in draft_no:
                key = draft_set(also)
                team.setdefault('sets', []).append(key)
                team['also'] = key
            else:
                warns.append(f'{hid}: сет «{also}» из «также в сете» не найден')
        if ch_notes.get(hid):
            team['notes'] = ch_notes[hid]
        if team:
            h['team'] = team
        heroes.append(h)

    # донатные сеты: место — порядок цены, от дешёвого к дорогому (ADR-0021)
    for h in heroes:
        if h['src'] == 'donat':
            key = f'd{h["dcyc"]}'
            b = b_donat.get(h['dcyc'], {})
            sets.setdefault(key, {'key': key, 'kind': 'donat', 'name': b.get('name', f'сет {ROMAN[h["dcyc"] - 1]}'), 'cycle': h['dcyc'],
                                  'members': [], 'bonus': b.get('bonus', b.get('short', '')), 'n': b.get('n', [])})
            sets[key]['members'].append((h['place'], h['id']))
            h['dset'] = key
    for s in sets.values():
        if s['kind'] == 'donat':
            places = sorted(p for p, _ in s['members'])
            if places != list(range(1, len(places) + 1)):
                errs.append(f'донатный сет «{s["name"]}»: места {places}')
            s['members'] = [i for _, i in sorted(s['members'])]
    for h in heroes:
        for key in h.get('team', {}).get('sets', []):
            sets[key]['members'].append(h['id'])
    by_id = {h['id']: h for h in heroes}
    for s in sets.values():
        s['sum'] = sum(by_id[i]['maxV'] for i in s['members'])
        s['tiers'] = tiers_of(s['sum'])
        s.setdefault('cycle', min(by_id[i]['c'] for i in s['members']))
        if len(s['members']) != SET_SIZE:
            warns.append(f'сет «{s["name"]}»: героев {len(s["members"])}')
        if s['n'] and len(s['n']) < s['tiers']:
            warns.append(f'сет «{s["name"]}»: N на {len(s["n"])} ступени, ступеней {s["tiers"]}')

    weeks, civs = [], civilizations()
    for race, gen, _ in WEEKS:
        squad = sorted((h for h in heroes if h.get('week') == race), key=lambda h: (h['c'], h['id']))
        if len({h['c'] for h in squad}) != len(squad):
            warns.append(f'отряд Эхо недели {gen}: два героя одного цикла')
        c = civs.get(race, {})
        if civs and not c:
            warns.append(f'неделя {gen}: цивилизации нет в таблице')
        weeks.append({'race': race, 'gen': gen, 'squad': [h['id'] for h in squad], **({'civ': c['civ'], 'raid': c['raid'], 'team': {'theme': c['theme']}} if c else {})})

    info = {}
    for key in SOURCES:
        hs = [h for h in heroes if h['src'] == key]
        if hs:
            info[key] = {'count': len(hs), 'from': min(h['c'] for h in hs),
                         'maxV': [min(h['maxV'] for h in hs), max(h['maxV'] for h in hs)],
                         'byCycle': all(h['maxV'] == h['c'] - 1 for h in hs)}
    for key in ('gold',):
        for c in range(1, len(ROMAN) + 1):
            nos = sorted(h['no'] for h in heroes if h['src'] == key and h['c'] == c)
            if nos != list(range(1, len(nos) + 1)):
                warns.append(f'каталог золота цикла {ROMAN[c - 1]}: номера {nos[:3]}…')

    order = ['o' + draft_no[k] for k in draft_no if 'o' + draft_no[k] in sets] + sorted(k for k in sets if k[0] == 'd')
    return {
        'rules': RULES, 'classes': CLASSES, 'schools': SCHOOLS, 'sources': SOURCES, 'srcInfo': info,
        'weeks': weeks, 'sets': [sets[k] for k in order], 'heroes': heroes,
        'meta': {'chapters': ch_files, 'withText': sum(1 for h in heroes if h.get('ch'))},
    }


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    data = build()
    for w in warns:
        print('предупреждение:', w)
    if errs or not data:
        print('ошибки:', *errs, sep='\n  ')
        sys.exit(1)
    OUT.write_text('/* Собрано tools/content-gen/heroes/export_roster.py из docs/content/герои/состав-героев.csv, главы/цикл-N.md,\n'
                   '   герои.csv, состав-героев.md и docs/content/сет-бонусы.md. Руками не править: пересобрать скриптом.\n'
                   '   Черновик · ждёт автора. Поля team — только для команды: орден игрок видит на последней доблести героя.\n'
                   '   rules.stub — заглушки прототипа: этих чисел в источниках нет. */\n'
                   'window.EN_ROSTER = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    by = {k: sum(1 for h in data['heroes'] if h['src'] == k) for k in SOURCES}
    print(f'{OUT.relative_to(REPO).as_posix()}: героев {len(data["heroes"])} — ' + ', '.join(f'{k} {v}' for k, v in by.items())
          + f'; сетов {len(data["sets"])}; с текстами глав {data["meta"]["withText"]}'
          + (f' ({", ".join(data["meta"]["chapters"])})' if data['meta']['chapters'] else ', файлов глав нет')
          + f'; {OUT.stat().st_size // 1024} КБ')


if __name__ == '__main__':
    main()
